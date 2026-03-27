export default async function payoutRoutes(fastify, opts) {

    // GET /payout/history/:worker_id
    fastify.get('/payout/history/:worker_id', async (request, reply) => {
        const { worker_id } = request.params;

        const client = await fastify.pg.connect();
        try {
            // Check worker exists
            const workerResult = await client.query('SELECT id FROM workers WHERE id = $1', [worker_id]);
            if (workerResult.rows.length === 0) {
                return reply.status(404).send({ error: `Worker ${worker_id} not found` });
            }

            // Fetch all payouts with trigger info from claims
            const payoutsResult = await client.query(
                `SELECT p.amount, c.trigger_id, p.paid_at, p.status
                 FROM payouts p
                 JOIN claims c ON c.id = p.claim_id
                 WHERE p.worker_id = $1
                 ORDER BY p.created_at DESC`,
                [worker_id]
            );

            return reply.send({
                worker_id,
                payouts: payoutsResult.rows.map(row => ({
                    amount: row.amount,
                    trigger_id: row.trigger_id,
                    paid_at: row.paid_at,
                    status: row.status
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
