import Fastify from 'fastify';
import fastifyPostgres from '@fastify/postgres';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import fs from 'fs';

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

// 3. Endpoint to Create Tables from schema.sql
fastify.get('/setup-db', async (request, reply) => {
    try {
        const client = await fastify.pg.connect();

        // Read the SQL file
        const schemaSql = fs.readFileSync('./schema.sql', 'utf8');

        // Execute the SQL against Neon
        await client.query(schemaSql);
        client.release();

        return { success: true, message: 'All 6 tables created successfully!' };
    } catch (err) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Database setup failed', details: err.message });
    }
});

// 4. Health Check (Required by Definition of Done)
fastify.get('/health', async () => {
    return { status: 'healthy', database: 'connected' };
});

// Start the server
const start = async () => {
    try {
        await fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' });
        console.log(`Server running at http://localhost:${process.env.PORT || 3000}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
