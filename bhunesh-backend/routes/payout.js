function generatePayoutId() {
    return `pay_${Date.now()}_${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
}

function toNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

export default async function payoutRoutes(fastify) {
    // POST /payout/process
    // Called by orchestrator/n8n after approval to persist payout + mark claim paid.
    fastify.post('/payout/process', async (request, reply) => {
        const body = request.body || {};
        const claimId = String(body.claim_id || '').trim();
        const requestedWorkerId = body.worker_id ? String(body.worker_id).trim() : null;
        const requestedAmount = toNumber(body.amount ?? body.payout_amount);
        const requestedUpiId = body.upi_id ? String(body.upi_id).trim() : null;
        const payoutStatus = String(body.status || 'PAID').toUpperCase();
        const razorpayPayoutId = body.razorpay_payout_id ? String(body.razorpay_payout_id).trim() : null;

        if (!claimId) {
            return reply.status(400).send({ error: 'claim_id is required' });
        }

        const client = await fastify.pg.connect();
        try {
            await client.query('BEGIN');

            const existingPayoutResult = await client.query(
                `SELECT id, claim_id, worker_id, amount, upi_id, status, razorpay_payout_id, paid_at, created_at
                 FROM payouts
                 WHERE claim_id = $1
                 LIMIT 1`,
                [claimId]
            );

            if (existingPayoutResult.rows.length > 0) {
                await client.query('COMMIT');
                return reply.send({
                    ...existingPayoutResult.rows[0],
                    message: 'Payout already recorded for this claim'
                });
            }

            const claimResult = await client.query(
                `SELECT c.id, c.worker_id, c.payout_amount, w.upi_id
                 FROM claims c
                 JOIN workers w ON w.id = c.worker_id
                 WHERE c.id = $1
                 LIMIT 1`,
                [claimId]
            );

            if (claimResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return reply.status(404).send({ error: `Claim ${claimId} not found` });
            }

            const claim = claimResult.rows[0];
            const resolvedWorkerId = requestedWorkerId || claim.worker_id;
            if (resolvedWorkerId !== claim.worker_id) {
                await client.query('ROLLBACK');
                return reply.status(400).send({ error: 'worker_id does not match claim record' });
            }

            const resolvedAmount = requestedAmount ?? toNumber(claim.payout_amount);
            if (!resolvedAmount || resolvedAmount <= 0) {
                await client.query('ROLLBACK');
                return reply.status(400).send({ error: 'payout amount must be greater than 0' });
            }

            const resolvedUpiId = requestedUpiId || claim.upi_id;
            if (!resolvedUpiId) {
                await client.query('ROLLBACK');
                return reply.status(400).send({ error: 'No UPI ID found for this worker' });
            }

            const payoutId = generatePayoutId();
            const paidAt = payoutStatus === 'PAID' ? new Date().toISOString() : null;

            await client.query(
                `INSERT INTO payouts (
                    id, claim_id, worker_id, amount, upi_id, razorpay_payout_id, status, paid_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8
                )`,
                [payoutId, claimId, resolvedWorkerId, resolvedAmount, resolvedUpiId, razorpayPayoutId, payoutStatus, paidAt]
            );

            const claimStatus = payoutStatus === 'PAID' ? 'PAID' : payoutStatus === 'FAILED' ? 'APPROVED' : 'PAYOUT_PENDING';
            await client.query(`UPDATE claims SET status = $1 WHERE id = $2`, [claimStatus, claimId]);

            await client.query('COMMIT');

            return reply.status(201).send({
                payout_id: payoutId,
                claim_id: claimId,
                worker_id: resolvedWorkerId,
                amount: resolvedAmount,
                upi_id: resolvedUpiId,
                razorpay_payout_id: razorpayPayoutId,
                status: payoutStatus,
                paid_at: paidAt
            });
        } catch (err) {
            await client.query('ROLLBACK');
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Failed to process payout', details: err.message });
        } finally {
            client.release();
        }
    });

    // GET /payout/history/:worker_id
    fastify.get('/payout/history/:worker_id', async (request, reply) => {
        const { worker_id: workerId } = request.params;

        const client = await fastify.pg.connect();
        try {
            const workerResult = await client.query('SELECT id FROM workers WHERE id = $1', [workerId]);
            if (workerResult.rows.length === 0) {
                return reply.status(404).send({ error: `Worker ${workerId} not found` });
            }

            const payoutsResult = await client.query(
                `SELECT p.id AS payout_id, p.amount, c.trigger_id, p.paid_at, p.status, c.breakdown
                 FROM payouts p
                 JOIN claims c ON c.id = p.claim_id
                 WHERE p.worker_id = $1
                 ORDER BY COALESCE(p.paid_at, p.created_at) DESC`,
                [workerId]
            );

            return reply.send({
                worker_id: workerId,
                payouts: payoutsResult.rows.map((row) => ({
                    payout_id: row.payout_id,
                    amount: row.amount,
                    trigger_id: row.trigger_id,
                    paid_at: row.paid_at,
                    status: row.status,
                    breakdown: row.breakdown
                }))
            });
        } catch (err) {
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Failed to fetch payout history', details: err.message });
        } finally {
            client.release();
        }
    });
}
