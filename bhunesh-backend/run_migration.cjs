const pg = require('pg');
const client = new pg.Client(
    process.env.DATABASE_URL || 
    'postgresql://neondb_owner:npg_7mQUOejGdH4I@ep-snowy-grass-a1wk1jtu-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
);

async function migrate() {
    await client.connect();
    console.log('Connected to Neon DB');
    
    await client.query(
        "ALTER TABLE disruption_events ADD COLUMN IF NOT EXISTS sensor_source VARCHAR(20) NOT NULL DEFAULT 'MANUAL'"
    );
    console.log('✅ Added sensor_source column to disruption_events');
    
    await client.query(
        "ALTER TABLE claims ADD COLUMN IF NOT EXISTS breakdown JSONB DEFAULT '{}'"
    );
    console.log('✅ Added breakdown column to claims');
    
    await client.end();
    console.log('Migration complete');
}

migrate().catch(e => { console.error('❌ Migration failed:', e.message); process.exit(1); });
