const { Client } = require('pg');
require('dotenv').config({ path: './.env' });

async function checkAll() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const res = await client.query(`
    SELECT tablename, policyname, cmd, roles 
    FROM pg_policies 
    WHERE schemaname = 'public' AND cmd = 'ALL'
    ORDER BY tablename;
  `);

  console.log(`Remaining CMD ALL policies in public schema (${res.rows.length}):`);
  for (const r of res.rows) {
    console.log(`  Table: ${r.tablename} | Policy: ${r.policyname} | Roles: ${r.roles}`);
  }

  await client.end();
}

checkAll().catch(err => console.error(err));
