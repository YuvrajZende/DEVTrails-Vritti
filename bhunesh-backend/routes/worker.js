import axios from 'axios';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'vritti-secret-key-change-in-production';

const DEFAULT_QUOTE = {
    risk_score: 0.4,
    premium_tier: 49,
    coverage_cap: 800
};

const DEFAULT_PROFILE = {
    daily_active_hours: 8,
    weekly_delivery_days: 6,
    avg_weekly_earnings: 3200,
    earnings_std_dev: 500,
    claim_count_90d: 0,
    is_part_time: 0
};

function resolveServiceUrl(rawUrl, endpointPath) {
    if (!rawUrl || rawUrl === 'mock') return null;
    const trimmed = rawUrl.trim().replace(/\/+$/, '');
    if (!trimmed) return null;
    return trimmed.endsWith(endpointPath) ? trimmed : `${trimmed}${endpointPath}`;
}

function normalizePhone(phone) {
    return String(phone || '').replace(/\D/g, '');
}

function extractAuthUserId(request) {
    try {
        const token = (request.headers.authorization || '').replace('Bearer ', '');
        if (!token) return null;
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded.userId || null;
    } catch {
        return null;
    }
}

async function getNextWorkerId(client) {
    const result = await client.query(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 3) AS INT)), 0) AS max_id
         FROM workers
         WHERE id ~ '^w_[0-9]+$'`
    );
    const next = Number(result.rows[0]?.max_id || 0) + 1;
    return `w_${String(next).padStart(4, '0')}`;
}

async function fetchRiskQuote(fastify, zone, profileOverrides) {
    const riskUrl = resolveServiceUrl(process.env.RISK_SCORE_URL, '/risk-score');
    const month = new Date().getUTCMonth() + 1;
    const isMonsoon = month >= 6 && month <= 9;

    const dailyActiveHours = Number(profileOverrides.daily_active_hours ?? DEFAULT_PROFILE.daily_active_hours);
    const profile = {
        tenure_weeks: Number(profileOverrides.tenure_weeks ?? 0),
        daily_active_hours: Number.isFinite(dailyActiveHours) ? dailyActiveHours : DEFAULT_PROFILE.daily_active_hours,
        weekly_delivery_days: Number(profileOverrides.weekly_delivery_days ?? DEFAULT_PROFILE.weekly_delivery_days),
        avg_weekly_earnings: Number(profileOverrides.avg_weekly_earnings ?? DEFAULT_PROFILE.avg_weekly_earnings),
        earnings_std_dev: Number(profileOverrides.earnings_std_dev ?? DEFAULT_PROFILE.earnings_std_dev),
        claim_count_90d: Number(profileOverrides.claim_count_90d ?? DEFAULT_PROFILE.claim_count_90d),
        zone_disruption_days: Number(zone.avg_disruption_days || 0),
        zone_aqi_baseline: Number(zone.aqi_baseline || 0),
        is_monsoon_season: isMonsoon ? 1 : 0,
        is_flood_prone_zone: zone.flood_history ? 1 : 0,
        is_part_time: Number(profileOverrides.is_part_time ?? (dailyActiveHours < 4 ? 1 : 0))
    };

    if (!riskUrl) {
        return DEFAULT_QUOTE;
    }

    try {
        const response = await axios.post(riskUrl, profile, { timeout: 7000 });
        const data = response.data || {};
        if (
            typeof data.risk_score !== 'number' ||
            typeof data.premium_tier !== 'number' ||
            typeof data.coverage_cap !== 'number'
        ) {
            throw new Error('Invalid response contract from risk score service');
        }
        return {
            risk_score: data.risk_score,
            premium_tier: data.premium_tier,
            coverage_cap: data.coverage_cap
        };
    } catch (err) {
        fastify.log.warn(`Risk score API failed, using fallback quote: ${err.message}`);
        return DEFAULT_QUOTE;
    }
}

export default async function workerRoutes(fastify) {
    // POST /worker/onboard
    fastify.post('/worker/onboard', async (request, reply) => {
        const body = request.body || {};
        const phone = normalizePhone(body.phone);
        const partnerId = String(body.partner_id || '').trim();
        const platform = String(body.platform || '').trim();
        const zoneId = String(body.zone_id || '').trim();
        const authUserId = extractAuthUserId(request);

        if (!/^\d{10}$/.test(phone)) {
            return reply.status(400).send({ error: 'Phone must be exactly 10 digits' });
        }
        if (partnerId.length < 6) {
            return reply.status(400).send({ error: 'Partner ID must be at least 6 characters' });
        }
        if (!platform) {
            return reply.status(400).send({ error: 'Platform is required (Amazon / Flipkart / Meesho / Other)' });
        }
        if (!zoneId) {
            return reply.status(400).send({ error: 'Zone ID is required' });
        }

        const client = await fastify.pg.connect();
        try {
            const zoneResult = await client.query('SELECT * FROM zones WHERE id = $1', [zoneId]);
            if (zoneResult.rows.length === 0) {
                return reply.status(400).send({ error: `Zone ${zoneId} not found` });
            }
            const zone = zoneResult.rows[0];

            const phoneCheck = await client.query(
                'SELECT id, latest_risk_score, latest_premium_tier, latest_coverage_cap FROM workers WHERE phone = $1',
                [phone]
            );
            if (phoneCheck.rows.length > 0) {
                const existing = phoneCheck.rows[0];
                // If auth_user_id not linked yet, link it now
                if (authUserId) {
                    await client.query('UPDATE workers SET auth_user_id = $1 WHERE id = $2 AND auth_user_id IS NULL', [authUserId, existing.id]);
                }
                return reply.status(409).send({
                    error: 'Phone number already registered',
                    worker_id: existing.id,
                    risk_score: existing.latest_risk_score ?? DEFAULT_QUOTE.risk_score,
                    premium_tier: existing.latest_premium_tier ?? DEFAULT_QUOTE.premium_tier,
                    coverage_cap: existing.latest_coverage_cap ?? DEFAULT_QUOTE.coverage_cap
                });
            }

            const partnerCheck = await client.query(
                'SELECT id, latest_risk_score, latest_premium_tier, latest_coverage_cap FROM workers WHERE partner_id = $1',
                [partnerId]
            );
            if (partnerCheck.rows.length > 0) {
                const existing = partnerCheck.rows[0];
                return reply.status(409).send({
                    error: 'Partner ID already registered',
                    worker_id: existing.id,
                    risk_score: existing.latest_risk_score ?? DEFAULT_QUOTE.risk_score,
                    premium_tier: existing.latest_premium_tier ?? DEFAULT_QUOTE.premium_tier,
                    coverage_cap: existing.latest_coverage_cap ?? DEFAULT_QUOTE.coverage_cap
                });
            }

            const riskData = await fetchRiskQuote(fastify, zone, body);
            const workerId = await getNextWorkerId(client);

            await client.query(
                `INSERT INTO workers (
                    id, phone, name, platform, partner_id, zone_id, language,
                    device_fingerprint, upi_id, tenure_weeks, avg_weekly_earnings,
                    latest_risk_score, latest_premium_tier, latest_coverage_cap, last_quote_at,
                    auth_user_id
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7,
                    $8, $9, $10, $11,
                    $12, $13, $14, NOW(),
                    $15
                )`,
                [
                    workerId,
                    phone,
                    body.name || null,
                    platform,
                    partnerId,
                    zoneId,
                    body.language || 'hi',
                    body.device_fingerprint || null,
                    body.upi_id || null,
                    Number(body.tenure_weeks ?? 0),
                    Number(body.avg_weekly_earnings ?? 0),
                    riskData.risk_score,
                    riskData.premium_tier,
                    riskData.coverage_cap,
                    authUserId
                ]
            );

            return reply.status(201).send({
                worker_id: workerId,
                risk_score: riskData.risk_score,
                premium_tier: riskData.premium_tier,
                coverage_cap: riskData.coverage_cap
            });
        } catch (err) {
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Onboarding failed', details: err.message });
        } finally {
            client.release();
        }
    });
}
