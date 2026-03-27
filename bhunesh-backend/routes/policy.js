// Policy ID counter
let policyCounter = 0;

function generatePolicyId() {
    policyCounter++;
    return `pol_${Date.now()}_${String(policyCounter).padStart(3, '0')}`;
}

// Get next Monday from today (UTC)
function getNextMonday() {
    const now = new Date();
    const day = now.getUTCDay(); // 0=Sun, 1=Mon, ...
    const daysUntilMonday = day === 0 ? 1 : (8 - day);
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() + daysUntilMonday);
    monday.setUTCHours(0, 0, 0, 0);
    return monday;
}

// Get Sunday after a given Monday
function getSundayAfter(monday) {
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    sunday.setUTCHours(23, 59, 59, 999);
    return sunday;
}

export default async function policyRoutes(fastify, opts) {

    // POST /policy/activate
    fastify.post('/policy/activate', async (request, reply) => {
        const { worker_id, payment_reference } = request.body;

        if (!worker_id) {
            return reply.status(400).send({ error: 'worker_id is required' });
        }

        const client = await fastify.pg.connect();
        try {
            // Check worker exists
            const workerResult = await client.query('SELECT * FROM workers WHERE id = $1', [worker_id]);
            if (workerResult.rows.length === 0) {
                return reply.status(404).send({ error: `Worker ${worker_id} not found` });
            }

            const weekStart = getNextMonday();
            const weekEnd = getSundayAfter(weekStart);
            const policyId = generatePolicyId();

            // Default premium/coverage — in real flow these come from the onboarding risk score
            const premiumPaid = 49;
            const coverageCap = 800;
            const riskScore = 0.40;

            await client.query(
                `INSERT INTO policies (id, worker_id, week_start, week_end, premium_paid, coverage_cap, risk_score, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')`,
                [policyId, worker_id, weekStart.toISOString().split('T')[0], weekEnd.toISOString().split('T')[0], premiumPaid, coverageCap, riskScore]
            );

            return reply.status(201).send({
                policy_id: policyId,
                week_start: weekStart.toISOString().split('T')[0],
                week_end: weekEnd.toISOString().split('T')[0],
                coverage_cap: coverageCap
            });

        } catch (err) {
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Policy activation failed', details: err.message });
        } finally {
            client.release();
        }
    });

    // GET /policy/status/:worker_id
    fastify.get('/policy/status/:worker_id', async (request, reply) => {
        const { worker_id } = request.params;

        const client = await fastify.pg.connect();
        try {
            // Get the most recent policy for this worker
            const policyResult = await client.query(
                `SELECT * FROM policies WHERE worker_id = $1 ORDER BY created_at DESC LIMIT 1`,
                [worker_id]
            );

            if (policyResult.rows.length === 0) {
                return reply.send({
                    status: 'NO_POLICY',
                    message: 'No policy found for this worker',
                    coverage_cap: 0,
                    renewal_date: null,
                    last_payout: null
                });
            }

            const policy = policyResult.rows[0];
            const today = new Date();
            const weekEnd = new Date(policy.week_end);
            const weekStart = new Date(policy.week_start);

            // Determine status
            let status;
            if (today > weekEnd) {
                status = 'EXPIRED';
            } else if (today.toISOString().split('T')[0] === weekEnd.toISOString().split('T')[0]) {
                status = 'RENEW_TODAY';
            } else if (today >= weekStart && today <= weekEnd) {
                status = 'ACTIVE';
            } else {
                status = 'ACTIVE'; // Policy for upcoming week
            }

            // Get last payout
            const payoutResult = await client.query(
                `SELECT amount, paid_at FROM payouts WHERE worker_id = $1 ORDER BY created_at DESC LIMIT 1`,
                [worker_id]
            );

            const lastPayout = payoutResult.rows.length > 0
                ? { amount: payoutResult.rows[0].amount, paid_at: payoutResult.rows[0].paid_at }
                : null;

            return reply.send({
                status,
                coverage_cap: policy.coverage_cap,
                renewal_date: policy.week_end,
                last_payout: lastPayout
            });

        } catch (err) {
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Failed to get policy status', details: err.message });
        } finally {
            client.release();
        }
    });
}
