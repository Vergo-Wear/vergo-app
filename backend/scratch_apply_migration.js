const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: './.env' });

async function applyMigration() {
  const sqlPath = path.join(__dirname, 'prisma/migrations/20260825160000_fix_supabase_rls_security_advisor/migration.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  console.log("Applying SQL migration...");
  await client.query(sql);
  console.log("Migration applied successfully!");

  await client.end();
}

applyMigration().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
