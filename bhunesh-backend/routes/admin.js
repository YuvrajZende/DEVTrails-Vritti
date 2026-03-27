import axios from 'axios';

let eventCounter = 0;

function generateEventId() {
    eventCounter++;
    return `evt_${Date.now()}_${String(eventCounter).padStart(3, '0')}`;
}

export default async function adminRoutes(fastify, opts) {

    // POST /admin/override
    fastify.post('/admin/override', async (request, reply) => {
        const { zone_id, trigger_id, severity } = request.body;

        if (!zone_id || !trigger_id) {
            return reply.status(400).send({ error: 'zone_id and trigger_id are required' });
        }

        const client = await fastify.pg.connect();
        try {
            // Verify zone exists
            const zoneResult = await client.query('SELECT id FROM zones WHERE id = $1', [zone_id]);
            if (zoneResult.rows.length === 0) {
                return reply.status(404).send({ error: `Zone ${zone_id} not found` });
            }

            const eventId = generateEventId();
            const now = new Date();

            // Create disruption_event record
            await client.query(
                `INSERT INTO disruption_events (id, zone_id, trigger_id, severity, started_at)
                 VALUES ($1, $2, $3, $4, $5)`,
                [eventId, zone_id, trigger_id, severity || 'HIGH', now]
            );

            // Forward to n8n Orchestrator
            const n8nUrl = process.env.N8N_ORCHESTRATOR_URL;
            let forwardStatus = 'skipped';

            if (n8nUrl && n8nUrl !== 'mock') {
                try {
                    await axios.post(n8nUrl, {
                        type: 'DISRUPTION_EVENT',
                        zone_id,
                        trigger_id,
                        severity: severity || 'HIGH',
                        disruption_start: now.toISOString(),
                        event_id: eventId
                    }, { timeout: 5000 });
                    forwardStatus = 'forwarded';
                } catch (err) {
                    fastify.log.warn(`n8n forward failed: ${err.message}`);
                    forwardStatus = 'forward_failed';
                }
            } else {
                fastify.log.info(`[MOCK] Would forward disruption event ${eventId} to n8n`);
                forwardStatus = 'mock_logged';
            }

            return reply.send({
                event_id: eventId,
                status: forwardStatus
            });

        } catch (err) {
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Admin override failed', details: err.message });
        } finally {
            client.release();
        }
    });
}
