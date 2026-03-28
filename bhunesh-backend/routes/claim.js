import axios from 'axios';

let claimCounter = 0;

function generateClaimId() {
    claimCounter++;
    return `clm_${Date.now()}_${String(claimCounter).padStart(3, '0')}`;
}

export default async function claimRoutes(fastify, opts) {

    // POST /claim/initiate
    fastify.post('/claim/initiate', async (request, reply) => {
        const { zone_id, trigger_id, severity, disruption_start, disruption_end, affected_workers } = request.body;

        if (!zone_id || !trigger_id || !severity) {
            return reply.status(400).send({ error: 'zone_id, trigger_id, and severity are required' });
        }

        const client = await fastify.pg.connect();
        try {
            // Begin transaction — bulk claim creation must be atomic
            await client.query('BEGIN');

            // Find all workers in this zone with ACTIVE policies
            const workersResult = await client.query(
                `SELECT w.id AS worker_id, w.zone_id, w.upi_id, p.id AS policy_id, p.coverage_cap
                 FROM workers w
                 JOIN policies p ON p.worker_id = w.id
                 WHERE w.zone_id = $1
                   AND w.is_active = true
                   AND p.status = 'ACTIVE'`,
                [zone_id]
            );

            if (workersResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return reply.send({
                    claims_created: 0,
                    auto_approved: 0,
                    held: 0,
                    message: 'No active policies found in this zone'
                });
            }

            let claimsCreated = 0;
            let autoApproved = 0;
            let held = 0;
            const claimIds = [];
            const claimDetails = []; // Full claim objects for LangGraph orchestrator

            for (const worker of workersResult.rows) {
                const claimId = generateClaimId();

                // Insert claim as PENDING
                await client.query(
                    `INSERT INTO claims (id, policy_id, worker_id, trigger_id, status, flags)
                     VALUES ($1, $2, $3, $4, 'PENDING', '[]')`,
                    [claimId, worker.policy_id, worker.worker_id, trigger_id]
                );

                // --- Call Fraud Validate API ---
                let fraudData;
                const fraudUrl = process.env.FRAUD_VALIDATE_URL;

                if (fraudUrl && fraudUrl !== 'mock') {
                    try {
                        const fraudPayload = {
                            claim_id: claimId,
                            worker_id: worker.worker_id,
                            zone_id: zone_id,
                            trigger_id: trigger_id,
                            severity: severity,
                            coverage_cap: worker.coverage_cap
                        };
                        const response = await axios.post(fraudUrl, fraudPayload, { timeout: 5000 });
                        fraudData = response.data;
                    } catch (err) {
                        fastify.log.warn(`Fraud API failed for claim ${claimId}, using mock: ${err.message}`);
                        fraudData = {
                            fraud_score: 0.15,
                            recommendation: 'AUTO_APPROVE',
                            payout_amount: worker.coverage_cap,
                            flags: [],
                            layers_triggered: ['LAYER_1_PASS']
                        };
                    }
                } else {
                    // Mock response
                    fraudData = {
                        fraud_score: 0.15,
                        recommendation: 'AUTO_APPROVE',
                        payout_amount: worker.coverage_cap,
                        flags: [],
                        layers_triggered: ['LAYER_1_PASS']
                    };
                }

                // Update claim with fraud results
                const claimStatus = fraudData.recommendation === 'AUTO_APPROVE' ? 'APPROVED'
                    : fraudData.recommendation === 'HOLD' ? 'HOLD'
                    : 'PARTIAL';

                await client.query(
                    `UPDATE claims
                     SET fraud_score = $1, recommendation = $2, payout_amount = $3, status = $4, flags = $5
                     WHERE id = $6`,
                    [fraudData.fraud_score, fraudData.recommendation, fraudData.payout_amount, claimStatus, JSON.stringify(fraudData.flags), claimId]
                );

                claimsCreated++;
                if (claimStatus === 'APPROVED') autoApproved++;
                if (claimStatus === 'HOLD') held++;
                claimIds.push(claimId);
                claimDetails.push({
                    id: claimId,
                    worker_id: worker.worker_id,
                    payout_amount: fraudData.payout_amount,
                    fraud_score: fraudData.fraud_score,
                    status: claimStatus
                });
            }

            await client.query('COMMIT');

            return reply.send({
                claims_created: claimsCreated,
                auto_approved: autoApproved,
                held: held,
                claim_ids: claimIds,
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
