function generatePolicyId() {
    return `pol_${Date.now()}_${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
}

function toDateOnly(date) {
    return new Date(date).toISOString().slice(0, 10);
}

// Monday 00:00 UTC of the next week.
function getNextMondayUtc(from = new Date()) {
    const date = new Date(from);
    const day = date.getUTCDay(); // 0=Sun, 1=Mon
    const daysUntilMonday = day === 0 ? 1 : 8 - day;
    date.setUTCDate(date.getUTCDate() + daysUntilMonday);
    date.setUTCHours(0, 0, 0, 0);
    return date;
}

function getSundayUtc(mondayUtc) {
    const sunday = new Date(mondayUtc);
    sunday.setUTCDate(mondayUtc.getUTCDate() + 6);
    sunday.setUTCHours(0, 0, 0, 0);
    return sunday;
}

function parseNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export default async function policyRoutes(fastify) {
    // POST /policy/activate
    fastify.post('/policy/activate', async (request, reply) => {
        const { worker_id: workerId, payment_reference: paymentReference } = request.body || {};

        if (!workerId) {
            return reply.status(400).send({ error: 'worker_id is required' });
        }
        if (!paymentReference) {
            return reply.status(400).send({ error: 'payment_reference is required' });
        }

        const client = await fastify.pg.connect();
        try {
            const workerResult = await client.query(
                `SELECT id, latest_risk_score, latest_premium_tier, latest_coverage_cap
                 FROM workers
                 WHERE id = $1`,
                [workerId]
            );
            if (workerResult.rows.length === 0) {
                return reply.status(404).send({ error: `Worker ${workerId} not found` });
            }
            const worker = workerResult.rows[0];

            const weekStart = getNextMondayUtc();
            const weekEnd = getSundayUtc(weekStart);
            const weekStartDate = toDateOnly(weekStart);
            const weekEndDate = toDateOnly(weekEnd);

            const existingPolicyResult = await client.query(
                `SELECT id, week_start, week_end, coverage_cap
                 FROM policies
                 WHERE worker_id = $1 AND week_start = $2::date
                 LIMIT 1`,
                [workerId, weekStartDate]
            );

            if (existingPolicyResult.rows.length > 0) {
                const existing = existingPolicyResult.rows[0];
                return reply.send({
                    policy_id: existing.id,
                    week_start: toDateOnly(existing.week_start),
                    week_end: toDateOnly(existing.week_end),
                    coverage_cap: existing.coverage_cap,
                    message: 'Policy already active for this week'
                });
            }

            const premiumPaid = parseNumber(request.body?.premium, worker.latest_premium_tier ?? 49);
            const coverageCap = parseNumber(request.body?.coverage_cap, worker.latest_coverage_cap ?? 800);
            const riskScore = parseNumber(request.body?.risk_score, worker.latest_risk_score ?? 0.4);
            const policyId = generatePolicyId();

            await client.query(
                `INSERT INTO policies (
                    id, worker_id, week_start, week_end, premium_paid, coverage_cap, risk_score, status
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, 'ACTIVE'
                )`,
                [policyId, workerId, weekStartDate, weekEndDate, premiumPaid, coverageCap, riskScore]
            );

            return reply.status(201).send({
                policy_id: policyId,
                week_start: weekStartDate,
                week_end: weekEndDate,
                coverage_cap: coverageCap
            });
        } catch (err) {
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Policy activation failed', details: err.message });
        } finally {
            client.release();
        }
    });

    // GET /policy/expiring — used by n8n Policy Renewal workflow
    fastify.get('/policy/expiring', async (request, reply) => {
        const client = await fastify.pg.connect();
        try {
            const result = await client.query(
                `SELECT p.id, p.worker_id, p.week_start, p.week_end,
                        p.premium_paid, p.coverage_cap, p.risk_score, p.status
                 FROM policies p
                 WHERE p.week_end < CURRENT_DATE
                   AND p.status = 'ACTIVE'
                 ORDER BY p.week_end DESC`
            );
            return reply.send({ policies: result.rows });
        } catch (err) {
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Failed to fetch expiring policies', details: err.message });
        } finally {
            client.release();
        }
    });

    // GET /policy/status/:worker_id
    fastify.get('/policy/status/:worker_id', async (request, reply) => {
        const { worker_id: workerId } = request.params;

        const client = await fastify.pg.connect();
        try {
            const policyResult = await client.query(
                `SELECT *
                 FROM policies
                 WHERE worker_id = $1
                 ORDER BY week_end DESC, created_at DESC
                 LIMIT 1`,
                [workerId]
            );

            if (policyResult.rows.length === 0) {
                return reply.send({
                    status: 'NO_POLICY',
                    message: 'No policy found for this worker',
                    premium_amount: 0,
                    coverage_cap: 0,
                    renewal_date: null,
                    last_payout: null
                });
            }

            const policy = policyResult.rows[0];
            const today = new Date().toISOString().slice(0, 10);
            const weekStart = toDateOnly(policy.week_start);
            const weekEnd = toDateOnly(policy.week_end);

            let status = 'ACTIVE';
            if (policy.status === 'CANCELLED') {
                status = 'EXPIRED';
            } else if (today > weekEnd) {
                status = 'EXPIRED';
            } else if (today === weekEnd) {
                status = 'RENEW_TODAY';
            } else if (today < weekStart) {
                status = 'ACTIVE';
            } else {
                status = 'ACTIVE';
            }

            const payoutResult = await client.query(
                `SELECT amount, paid_at
                 FROM payouts
                 WHERE worker_id = $1
                 ORDER BY COALESCE(paid_at, created_at) DESC
                 LIMIT 1`,
                [workerId]
            );

            const lastPayout = payoutResult.rows.length > 0
                ? {
                    amount: payoutResult.rows[0].amount,
                    paid_at: payoutResult.rows[0].paid_at
                }
                : null;

            return reply.send({
                status,
                premium_amount: policy.premium_paid,
                coverage_cap: policy.coverage_cap,
                renewal_date: weekEnd,
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
