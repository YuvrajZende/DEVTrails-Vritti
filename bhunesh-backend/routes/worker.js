import axios from 'axios';

// Worker ID counter — in production, use a proper sequence
let workerCounter = 10; // start after seed workers

function generateWorkerId() {
    workerCounter++;
    return `w_${String(workerCounter).padStart(4, '0')}`;
}

export default async function workerRoutes(fastify, opts) {

    // POST /worker/onboard
    fastify.post('/worker/onboard', async (request, reply) => {
        const { phone, name, platform, partner_id, zone_id, device_fingerprint, upi_id, language } = request.body;

        // --- Validation ---
        if (!phone || !/^\d{10}$/.test(phone)) {
            return reply.status(400).send({ error: 'Phone must be exactly 10 digits' });
        }
        if (!partner_id || partner_id.length < 6) {
            return reply.status(400).send({ error: 'Partner ID must be at least 6 characters' });
        }
        if (!platform) {
            return reply.status(400).send({ error: 'Platform is required (Amazon / Flipkart / Meesho / Other)' });
        }
        if (!zone_id) {
            return reply.status(400).send({ error: 'Zone ID is required' });
        }

        const client = await fastify.pg.connect();
        try {
            // Check zone exists
            const zoneResult = await client.query('SELECT * FROM zones WHERE id = $1', [zone_id]);
            if (zoneResult.rows.length === 0) {
                return reply.status(400).send({ error: `Zone ${zone_id} not found` });
            }
            const zone = zoneResult.rows[0];

            // Check duplicate phone
            const phoneCheck = await client.query('SELECT id FROM workers WHERE phone = $1', [phone]);
            if (phoneCheck.rows.length > 0) {
                return reply.status(409).send({ error: 'Phone number already registered', worker_id: phoneCheck.rows[0].id });
            }

            // Check duplicate partner_id
            const partnerCheck = await client.query('SELECT id FROM workers WHERE partner_id = $1', [partner_id]);
            if (partnerCheck.rows.length > 0) {
                return reply.status(409).send({ error: 'Partner ID already registered' });
            }

            const workerId = generateWorkerId();

            // Insert worker
            await client.query(
                `INSERT INTO workers (id, phone, name, platform, partner_id, zone_id, language, device_fingerprint, upi_id, tenure_weeks, avg_weekly_earnings)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [workerId, phone, name || null, platform, partner_id, zone_id, language || 'hi', device_fingerprint || null, upi_id || null, 0, 0]
            );

            // --- Call Risk Score API ---
            let riskData;
            const riskUrl = process.env.RISK_SCORE_URL;

            if (riskUrl && riskUrl !== 'mock') {
                try {
                    // Determine if it's monsoon season (June-September)
                    const month = new Date().getMonth() + 1;
                    const isMonsoon = month >= 6 && month <= 9;

                    const riskPayload = {
                        tenure_weeks: 0,
                        daily_active_hours: 8,
                        weekly_delivery_days: 6,
                        avg_weekly_earnings: 0,
                        earnings_std_dev: 0,
                        claim_count_90d: 0,
                        zone_disruption_days: zone.avg_disruption_days,
                        zone_aqi_baseline: zone.aqi_baseline,
                        is_monsoon_season: isMonsoon ? 1 : 0,
                        is_flood_prone_zone: zone.flood_history ? 1 : 0,
                        is_part_time: 0
                    };

                    const response = await axios.post(riskUrl, riskPayload, { timeout: 5000 });
                    riskData = response.data;
                } catch (err) {
                    fastify.log.warn(`Risk score API failed, using mock: ${err.message}`);
                    riskData = { risk_score: 0.40, premium_tier: 49, coverage_cap: 800 };
                }
            } else {
                // Mock response
                riskData = { risk_score: 0.40, premium_tier: 49, coverage_cap: 800 };
            }

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
