const { Client } = require('pg');
require('dotenv').config({ path: './.env' });

async function inspectAuth() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  console.log("=== 1. TABLES IN AUTH SCHEMA ===");
  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'auth' 
    ORDER BY table_name;
  `);
  console.log(tables.rows.map(r => r.table_name));

  // Check if auth.config or similar exists
  for (const t of tables.rows) {
    if (t.table_name.includes('config') || t.table_name.includes('param') || t.table_name.includes('setting')) {
      console.log(`\n=== CONTENT OF auth.${t.table_name} ===`);
      try {
        const res = await client.query(`SELECT * FROM auth."${t.table_name}" LIMIT 10;`);
        console.log(JSON.stringify(res.rows, null, 2));
      } catch (e) {
        console.log("Error querying", t.table_name, e.message);
      }
    }
  }

  console.log("\n=== 2. CHECKING FOR ANY HIBP / LEAKED PASSWORD SETTINGS IN PG ===");
  const settings = await client.query(`
    SELECT name, setting, category, short_desc 
    FROM pg_settings 
    WHERE name LIKE '%auth%' OR name LIKE '%password%' OR name LIKE '%hibp%' OR name LIKE '%pwned%';
  `);
  console.log(JSON.stringify(settings.rows, null, 2));

  await client.end();
}

inspectAuth().catch(err => console.error(err));
