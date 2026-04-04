import axios from 'axios';

const DEFAULT_FRAUD = {
    fraud_score: 0.15,
    recommendation: 'AUTO_APPROVE',
    payout_amount: 0,
    flags: [],
    layers_triggered: ['LAYER_1_PASS']
};

function generateClaimId() {
    return `clm_${Date.now()}_${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
}

function generateEventId() {
    return `evt_${Date.now()}_${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
}

function resolveServiceUrl(rawUrl, endpointPath) {
    if (!rawUrl || rawUrl === 'mock') return null;
    const trimmed = rawUrl.trim().replace(/\/+$/, '');
    if (!trimmed) return null;
    return trimmed.endsWith(endpointPath) ? trimmed : `${trimmed}${endpointPath}`;
}

function mapClaimStatus(recommendation) {
    const normalized = String(recommendation || '').toUpperCase();
    if (normalized === 'AUTO_APPROVE') return 'APPROVED';
    if (normalized === 'HOLD') return 'HOLD';
    if (normalized === 'PARTIAL_PAYOUT' || normalized === 'PARTIAL') return 'PARTIAL';
    return 'PENDING';
}

async function fetchFraudResult(fastify, payload, coverageCap) {
    const fraudUrl = resolveServiceUrl(process.env.FRAUD_VALIDATE_URL, '/fraud-validate');
    if (!fraudUrl) {
        return { ...DEFAULT_FRAUD, payout_amount: coverageCap };
    }

    try {
        const response = await axios.post(fraudUrl, payload, { timeout: 7000 });
        const data = response.data || {};
        return {
            fraud_score: Number(data.fraud_score ?? DEFAULT_FRAUD.fraud_score),
            recommendation: data.recommendation || DEFAULT_FRAUD.recommendation,
            payout_amount: Number(data.payout_amount ?? coverageCap),
            flags: Array.isArray(data.flags) ? data.flags : [],
            layers_triggered: Array.isArray(data.layers_triggered) ? data.layers_triggered : []
        };
    } catch (err) {
        fastify.log.warn(`Fraud API failed, using fallback: ${err.message}`);
        return { ...DEFAULT_FRAUD, payout_amount: coverageCap };
    }
}

export default async function claimRoutes(fastify) {
    // POST /claim/initiate
    fastify.post('/claim/initiate', async (request, reply) => {
        const body = request.body || {};
        const zoneId = String(body.zone_id || '').trim();
        const triggerId = String(body.trigger_id || '').trim();
        const severity = String(body.severity || 'HIGH').toUpperCase();
        const disruptionStart = body.disruption_start ? new Date(body.disruption_start) : new Date();
        const affectedWorkers = Array.isArray(body.affected_workers) ? body.affected_workers : [];

        if (!zoneId || !triggerId) {
            return reply.status(400).send({ error: 'zone_id and trigger_id are required' });
        }
        if (Number.isNaN(disruptionStart.getTime())) {
            return reply.status(400).send({ error: 'disruption_start must be a valid ISO timestamp' });
        }

        const eventDate = disruptionStart.toISOString().slice(0, 10);
        const client = await fastify.pg.connect();

        try {
            await client.query('BEGIN');

            const zoneResult = await client.query('SELECT id FROM zones WHERE id = $1', [zoneId]);
            if (zoneResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return reply.status(404).send({ error: `Zone ${zoneId} not found` });
            }

            await client.query(
                `INSERT INTO disruption_events (id, zone_id, trigger_id, severity, disruption_start, started_at)
                 VALUES ($1, $2, $3, $4, $5, $5)`,
                [generateEventId(), zoneId, triggerId, severity, disruptionStart.toISOString()]
            );

            const queryParams = [zoneId, eventDate];
            let workersSql = `
                SELECT
                    w.id AS worker_id,
                    w.zone_id,
                    w.upi_id,
                    p.id AS policy_id,
                    p.coverage_cap
                FROM workers w
                JOIN policies p ON p.worker_id = w.id
                WHERE w.zone_id = $1
                  AND w.is_active = true
                  AND p.status = 'ACTIVE'
                  AND p.week_start <= $2::date
                  AND p.week_end >= $2::date
            `;

            if (affectedWorkers.length > 0) {
                queryParams.push(affectedWorkers);
                workersSql += ` AND w.id = ANY($3::text[])`;
            }

            const workersResult = await client.query(workersSql, queryParams);

            if (workersResult.rows.length === 0) {
                await client.query('COMMIT');
                return reply.send({
                    claims_created: 0,
                    skipped_existing: 0,
                    auto_approved: 0,
                    held: 0,
                    message: 'No active policies found for this event window',
                    claims: []
                });
            }

            let claimsCreated = 0;
            let skippedExisting = 0;
            let autoApproved = 0;
            let held = 0;
            const claimDetails = [];

            for (const worker of workersResult.rows) {
                const duplicateCheck = await client.query(
                    `SELECT id
                     FROM claims
                     WHERE policy_id = $1
                       AND trigger_id = $2
                       AND DATE(initiated_at) = $3::date
                     LIMIT 1`,
                    [worker.policy_id, triggerId, eventDate]
                );

                if (duplicateCheck.rows.length > 0) {
                    skippedExisting++;
                    continue;
                }

                const claimId = generateClaimId();
                await client.query(
                    `INSERT INTO claims (id, policy_id, worker_id, trigger_id, status, flags)
                     VALUES ($1, $2, $3, $4, 'PENDING', '[]')`,
                    [claimId, worker.policy_id, worker.worker_id, triggerId]
                );

                const fraudPayload = {
                    claim_id: claimId,
                    worker_id: worker.worker_id,
                    zone_id: zoneId,
                    trigger_id: triggerId,
                    severity,
                    disruption_start: disruptionStart.toISOString(),
                    coverage_cap: worker.coverage_cap
                };

                const fraudData = await fetchFraudResult(fastify, fraudPayload, worker.coverage_cap);
                const claimStatus = mapClaimStatus(fraudData.recommendation);

                await client.query(
                    `UPDATE claims
                     SET fraud_score = $1, recommendation = $2, payout_amount = $3, status = $4, flags = $5
                     WHERE id = $6`,
                    [
                        fraudData.fraud_score,
                        fraudData.recommendation,
                        fraudData.payout_amount,
                        claimStatus,
                        JSON.stringify(fraudData.flags || []),
                        claimId
                    ]
                );

                claimsCreated++;
                if (claimStatus === 'APPROVED') autoApproved++;
                if (claimStatus === 'HOLD') held++;

                claimDetails.push({
                    id: claimId,
                    worker_id: worker.worker_id,
                    payout_amount: fraudData.payout_amount,
                    fraud_score: fraudData.fraud_score,
                    recommendation: fraudData.recommendation,
                    status: claimStatus,
                    upi_id: worker.upi_id
                });
            }

            await client.query('COMMIT');

            return reply.send({
                claims_created: claimsCreated,
                skipped_existing: skippedExisting,
                auto_approved: autoApproved,
                held,
                claims: claimDetails
            });
        } catch (err) {
            await client.query('ROLLBACK');
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Claim initiation failed', details: err.message });
        } finally {
            client.release();
        }
    });
}
