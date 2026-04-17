import axios from 'axios';
import jwt from 'jsonwebtoken';

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

// Admin auth check — enforced in production, bypassed in dev
function requireAdminAuth(request, reply) {
    if (process.env.NODE_ENV !== 'production') return; // open in dev
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        reply.status(401).send({ error: 'Admin authentication required' });
        return false;
    }
    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET not configured');
        jwt.verify(token, secret);
        return true;
    } catch {
        reply.status(401).send({ error: 'Invalid or expired admin token' });
        return false;
    }
}

export default async function adminRoutes(fastify) {
    // POST /admin/override
    // PRODUCTION: requires JWT auth
    fastify.post('/admin/override', async (request, reply) => {
        if (requireAdminAuth(request, reply) === false) return;
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

    // GET /admin/platform-health
    // Platform outage sensor (T5) health endpoint.
    // In production this would query real dispatch/order data.
    // For MVP: always returns healthy UNLESS ?simulate_outage=true is passed.
    // This prevents automated monitoring from creating false claims.
    fastify.get('/admin/platform-health', async (request, reply) => {
        const zoneId = request.query.zone_id || 'VAD-04';
        const simulateOutage = request.query.simulate_outage === 'true';
        
        if (simulateOutage) {
            return reply.send({
                zone_id: zoneId,
                active_orders: 0,
                hours_inactive: 2.5,
                timestamp: new Date().toISOString()
            });
        }
        
        // Default: platform is healthy
        return reply.send({
            zone_id: zoneId,
            active_orders: Math.floor(Math.random() * 500) + 100, // 100-600 orders
            hours_inactive: 0,
            timestamp: new Date().toISOString()
        });
    });

    // GET /admin/sensor-log
    // Audit log of recent disruption events (sensor triggers)
    fastify.get('/admin/sensor-log', async (request, reply) => {
        const client = await fastify.pg.connect();
        try {
            const limit = parseInt(request.query.limit) || 20;
            
            const result = await client.query(
                `SELECT de.id, de.zone_id, de.trigger_id, de.severity, de.sensor_source, 
                        de.disruption_start, de.created_at, z.name as zone_name
                 FROM disruption_events de
                 JOIN zones z ON z.id = de.zone_id
                 ORDER BY de.created_at DESC
                 LIMIT $1`,
                [limit]
            );
            
            return reply.send({
                count: result.rows.length,
                logs: result.rows
            });
        } catch (err) {
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Failed to fetch sensor logs', details: err.message });
        } finally {
            client.release();
        }
    });
}
