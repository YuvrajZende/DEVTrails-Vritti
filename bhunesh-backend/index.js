import Fastify from 'fastify';
import fastifyPostgres from '@fastify/postgres';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Route modules
import workerRoutes from './routes/worker.js';
import policyRoutes from './routes/policy.js';
import claimRoutes from './routes/claim.js';
import payoutRoutes from './routes/payout.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function buildServer() {
    const fastify = Fastify({ logger: true });

    // 1. Enable CORS for the mobile app
    fastify.register(cors, { origin: '*' });

    // 2. Connect to PostgreSQL/Neon
    fastify.register(fastifyPostgres, {
        connectionString: process.env.DATABASE_URL
    });

    // 3. Register all route modules
    fastify.register(authRoutes);
    fastify.register(workerRoutes);
    fastify.register(policyRoutes);
    fastify.register(claimRoutes);
    fastify.register(payoutRoutes);
    fastify.register(adminRoutes);

    // 4. Health Check
    fastify.get('/health', async () => {
        return { status: 'healthy', timestamp: new Date().toISOString() };
    });

    // 5. Setup DB — Create all tables from schema.sql
    fastify.get('/setup-db', async (request, reply) => {
        let client;
        try {
            client = await fastify.pg.connect();
            
            // Create main schema
            const schemaPath = path.join(__dirname, 'schema.sql');
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');
            await client.query(schemaSql);
            
            // Create auth schema
            const authSchemaPath = path.join(__dirname, 'auth_schema.sql');
            const authSchemaSql = fs.readFileSync(authSchemaPath, 'utf8');
            await client.query(authSchemaSql);
            
            return { success: true, message: 'Database schema created successfully (including auth tables).' };
        } catch (err) {
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Database setup failed', details: err.message });
        } finally {
            if (client) client.release();
        }
    });

    // 6. Seed DB — Insert seed data from seed.sql
    fastify.get('/seed-db', async (request, reply) => {
        let client;
        try {
            client = await fastify.pg.connect();
            const seedPath = path.join(__dirname, 'seed.sql');
            const seedSql = fs.readFileSync(seedPath, 'utf8');
            await client.query(seedSql);
            return { success: true, message: 'Seed data inserted: 5 zones + 10 workers' };
        } catch (err) {
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Seeding failed', details: err.message });
        } finally {
            if (client) client.release();
        }
    });

    // 7. Seed Test User — Create a complete test user for E2E testing
    fastify.get('/seed-test-user', async (request, reply) => {
        const crypto = await import('crypto');
        const TEST_PASSWORD = 'test123456';
        
        const REAL_PHONE = '9876543210';
        const FAKE_PHONE = '9876543211';
        
        const salt1 = crypto.randomBytes(32).toString('hex');
        const salt2 = crypto.randomBytes(32).toString('hex');
        const hash1 = crypto.pbkdf2Sync(TEST_PASSWORD, salt1, 10000, 64, 'sha512').toString('hex');
        const hash2 = crypto.pbkdf2Sync(TEST_PASSWORD, salt2, 10000, 64, 'sha512').toString('hex');

        let client;
        try {
            client = await fastify.pg.connect();
            await client.query('BEGIN');

            // Ensure zone VAD-04 exists (self-sufficient)
            await client.query(
                `INSERT INTO zones (id, name, city, state, flood_history, avg_disruption_days, aqi_baseline, is_high_risk)
                 VALUES ('VAD-04', 'Vadodara Zone 4', 'Vadodara', 'Gujarat', true, 18, 120, true)
                 ON CONFLICT (id) DO NOTHING`
            );

            // Cleanup existing test data (in dependency order)
            await client.query("DELETE FROM payouts WHERE id = 'pay_fake_001'");
            await client.query("DELETE FROM claims WHERE id = 'clm_fake_001'");
            await client.query("DELETE FROM policies WHERE worker_id IN (SELECT id FROM workers WHERE phone IN ($1, $2))", [REAL_PHONE, FAKE_PHONE]);
            await client.query("DELETE FROM disruption_events WHERE id = 'evt_fake_001'");
            await client.query("DELETE FROM workers WHERE phone IN ($1, $2)", [REAL_PHONE, FAKE_PHONE]);
            await client.query("DELETE FROM auth_sessions WHERE user_id IN (SELECT id FROM auth_users WHERE phone IN ($1, $2))", [REAL_PHONE, FAKE_PHONE]);
            await client.query("DELETE FROM otp_verifications WHERE phone IN ($1, $2)", [REAL_PHONE, FAKE_PHONE]);
            await client.query("DELETE FROM auth_users WHERE phone IN ($1, $2)", [REAL_PHONE, FAKE_PHONE]);

            // ==========================================
            // USER 1: REAL API USER (Clean State)
            // ==========================================
            const authResult1 = await client.query(
                `INSERT INTO auth_users (phone, password_hash, salt, is_verified, is_active)
                 VALUES ($1, $2, $3, true, true) RETURNING id`,
                [REAL_PHONE, hash1, salt1]
            );
            
            await client.query(
                `INSERT INTO workers (
                    id, phone, name, platform, partner_id, zone_id,
                    language, device_fingerprint, upi_id,
                    tenure_weeks, avg_weekly_earnings,
                    latest_risk_score, latest_premium_tier, latest_coverage_cap,
                    last_quote_at, auth_user_id
                ) VALUES (
                    'w_real_001', $1, 'Real API User', 'Amazon', 'AMZ-REAL-001', 'VAD-04',
                    'en', 'fp_real_device_001', 'realuser@upi',
                    24, 4500, 0.25, 15, 600, NOW(), $2
                )`,
                [REAL_PHONE, authResult1.rows[0].id]
            );

            await client.query(
                `INSERT INTO policies (
                    id, worker_id, week_start, week_end,
                    premium_paid, coverage_cap, risk_score, status
                ) VALUES (
                    'pol_real_001', 'w_real_001',
                    CURRENT_DATE, CURRENT_DATE + INTERVAL '6 days',
                    15.0, 600.0, 0.25, 'ACTIVE'
                )`
            );

            // ==========================================
            // USER 2: FAKE WEATHER USER (Seeded Events)
            // ==========================================
            const authResult2 = await client.query(
                `INSERT INTO auth_users (phone, password_hash, salt, is_verified, is_active)
                 VALUES ($1, $2, $3, true, true) RETURNING id`,
                [FAKE_PHONE, hash2, salt2]
            );

            await client.query(
                `INSERT INTO workers (
                    id, phone, name, platform, partner_id, zone_id,
                    language, device_fingerprint, upi_id,
                    tenure_weeks, avg_weekly_earnings,
                    latest_risk_score, latest_premium_tier, latest_coverage_cap,
                    last_quote_at, auth_user_id
                ) VALUES (
                    'w_fake_001', $1, 'Fake Weather User', 'Swiggy', 'SWG-FAKE-001', 'VAD-04',
                    'hi', 'fp_fake_device_001', 'fakeuser@upi',
                    10, 3000, 0.40, 30, 500, NOW(), $2
                )`,
                [FAKE_PHONE, authResult2.rows[0].id]
            );

            await client.query(
                `INSERT INTO policies (
                    id, worker_id, week_start, week_end,
                    premium_paid, coverage_cap, risk_score, status
                ) VALUES (
                    'pol_fake_001', 'w_fake_001',
                    CURRENT_DATE, CURRENT_DATE + INTERVAL '6 days',
                    30.0, 500.0, 0.40, 'ACTIVE'
                )`
            );

            await client.query(
                `INSERT INTO disruption_events (
                    id, zone_id, trigger_id, severity,
                    disruption_start, started_at
                ) VALUES (
                    'evt_fake_001', 'VAD-04', 'T1_HEAT', 'HIGH',
                    NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'
                )`
            );

            await client.query(
                `INSERT INTO claims (
                    id, policy_id, worker_id, trigger_id,
                    initiated_at, fraud_score, recommendation,
                    payout_amount, status, flags
                ) VALUES (
                    'clm_fake_001', 'pol_fake_001', 'w_fake_001', 'T1_HEAT',
                    NOW() - INTERVAL '1 hour', 0.08, 'AUTO_APPROVE',
                    500.0, 'PAID', '[]'
                )`
            );

            await client.query(
                `INSERT INTO payouts (
                    id, claim_id, worker_id, amount,
                    upi_id, razorpay_payout_id, status, paid_at
                ) VALUES (
                    'pay_fake_001', 'clm_fake_001', 'w_fake_001', 500.0,
                    'fakeuser@upi', 'rzp_fake_mock_001', 'PAID',
                    NOW() - INTERVAL '30 minutes'
                )`
            );

            await client.query('COMMIT');

            return {
                success: true,
                message: 'Test users (Real API & Fake Weather) created successfully',
                credentials: {
                    user1_real_api: {
                        phone: REAL_PHONE,
                        password: TEST_PASSWORD,
                        worker_id: 'w_real_001',
                        zone: 'VAD-04'
                    },
                    user2_fake_weather: {
                        phone: FAKE_PHONE,
                        password: TEST_PASSWORD,
                        worker_id: 'w_fake_001',
                        zone: 'VAD-04'
                    }
                },
                tables_seeded: [
                    'auth_users',
                    'workers',
                    'policies',
                    'disruption_events',
                    'claims',
                    'payouts'
                ]
            };
        } catch (err) {
            if (client) await client.query('ROLLBACK');
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Test user seeding failed', details: err.message });
        } finally {
            if (client) client.release();
        }
    });

    return fastify;
}

// Start the server
const start = async () => {
    const fastify = buildServer();
    try {
        await fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' });
        fastify.log.info(`Vritti backend running at http://localhost:${process.env.PORT || 3000}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

if (process.env.VRITTI_DISABLE_AUTOSTART !== '1') {
    start();
}
