import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.DATABASE_URL || '';

async function testPostgres() {
  console.log('------------------------------------------------------');
  console.log('🐘 TESTING DIRECT POSTGRESQL CONNECTION TO SUPABASE:');
  console.log('   Host: db.zayeotwnijgvafqikgfl.supabase.co:5432');
  console.log('   User: postgres');
  console.log('------------------------------------------------------\n');

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }, // Supabase PostgreSQL requires SSL
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log('⏳ Connecting to PostgreSQL database...');
    await client.connect();
    console.log('✅ Connected successfully to PostgreSQL on Supabase!');

    const res = await client.query('SELECT version(), current_database(), current_user;');
    console.log('\n📊 Database Info:');
    console.log('   Database:', res.rows[0].current_database);
    console.log('   User:', res.rows[0].current_user);
    console.log('   PostgreSQL Version:', res.rows[0].version.split(',')[0]);

    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log(`\n📋 Public Schema Tables (${tablesRes.rows.length}):`);
    if (tablesRes.rows.length === 0) {
      console.log('   (No public tables yet — ready for migration schema creation)');
    } else {
      tablesRes.rows.forEach(r => console.log('   -', r.table_name));
    }

    await client.end();
    console.log('\n======================================================');
    console.log('🎉 DIRECT POSTGRESQL CONNECTION VERIFIED 100% OPERATIONAL!');
    console.log('======================================================');
  } catch (err) {
    console.error('❌ Direct PostgreSQL connection notice:', err.message);
    try {
      await client.end();
    } catch {}
  }
}

testPostgres();
