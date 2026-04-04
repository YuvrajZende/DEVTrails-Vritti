import axios from 'axios';

function generateEventId() {
    return `evt_${Date.now()}_${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
}

function resolveOrchestratorUrl(rawUrl) {
    if (!rawUrl || rawUrl === 'mock') return null;
    const trimmed = rawUrl.trim().replace(/\/+$/, '');
    if (!trimmed) return null;
    if (trimmed.includes('/webhook/')) return trimmed;
    return `${trimmed}/webhook/orchestrate`;
}

export default async function adminRoutes(fastify) {
    // POST /admin/override
    fastify.post('/admin/override', async (request, reply) => {
        const body = request.body || {};
        const zoneId = String(body.zone_id || '').trim();
        const triggerId = String(body.trigger_id || '').trim();
        const severity = String(body.severity || 'HIGH').toUpperCase();
        const disruptionStart = new Date();

        if (!zoneId || !triggerId) {
            return reply.status(400).send({ error: 'zone_id and trigger_id are required' });
        }

        const client = await fastify.pg.connect();
        try {
            const zoneResult = await client.query('SELECT id FROM zones WHERE id = $1', [zoneId]);
            if (zoneResult.rows.length === 0) {
                return reply.status(404).send({ error: `Zone ${zoneId} not found` });
            }

            const eventId = generateEventId();
            await client.query(
                `INSERT INTO disruption_events (id, zone_id, trigger_id, severity, disruption_start, started_at)
                 VALUES ($1, $2, $3, $4, $5, $5)`,
                [eventId, zoneId, triggerId, severity, disruptionStart.toISOString()]
            );

            const orchestratorUrl = resolveOrchestratorUrl(process.env.LANGGRAPH_ORCHESTRATOR_URL);
            let forwardStatus = 'skipped';
            let orchestratorResponse = null;

            if (orchestratorUrl) {
                try {
                    const response = await axios.post(
                        orchestratorUrl,
                        {
                            type: 'DISRUPTION_EVENT',
                            event_id: eventId,
                            zone: zoneId,
                            zone_id: zoneId,
                            trigger_id: triggerId,
                            severity,
                            disruption_start: disruptionStart.toISOString(),
                            disruption_end: null,
                            affected_workers: []
                        },
                        { timeout: 7000 }
                    );
                    forwardStatus = 'forwarded';
                    orchestratorResponse = response.data ?? null;
                } catch (err) {
                    fastify.log.warn(`Orchestrator forward failed: ${err.message}`);
                    forwardStatus = 'forward_failed';
                }
            } else {
                forwardStatus = 'mock_logged';
            }

            return reply.send({
                event_id: eventId,
                status: forwardStatus,
                orchestrator_response: orchestratorResponse
            });
        } catch (err) {
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Admin override failed', details: err.message });
        } finally {
            client.release();
        }
    });
}
