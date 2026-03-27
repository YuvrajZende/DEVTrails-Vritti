import Fastify from 'fastify';
import fastifyPostgres from '@fastify/postgres';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import fs from 'fs';

// Route modules
import workerRoutes from './routes/worker.js';
import policyRoutes from './routes/policy.js';
import claimRoutes from './routes/claim.js';
import payoutRoutes from './routes/payout.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const fastify = Fastify({ logger: true });

// 1. Enable CORS for the mobile app
fastify.register(cors, {
    origin: '*'
});

// 2. Connect to Neon Database
fastify.register(fastifyPostgres, {
    connectionString: process.env.DATABASE_URL
});

// 3. Register all route modules
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
    try {
        const client = await fastify.pg.connect();
        const schemaSql = fs.readFileSync('./schema.sql', 'utf8');
        await client.query(schemaSql);
        client.release();
        return { success: true, message: 'All 6 tables created successfully!' };
    } catch (err) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Database setup failed', details: err.message });
    }
});

// 6. Seed DB — Insert seed data from seed.sql
fastify.get('/seed-db', async (request, reply) => {
    try {
        const client = await fastify.pg.connect();
        const seedSql = fs.readFileSync('./seed.sql', 'utf8');
        await client.query(seedSql);
        client.release();
        return { success: true, message: 'Seed data inserted: 5 zones + 10 workers' };
    } catch (err) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Seeding failed', details: err.message });
    }
});

// Start the server
const start = async () => {
    try {
        await fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' });
        console.log(`🚀 Vritti Backend running at http://localhost:${process.env.PORT || 3000}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
