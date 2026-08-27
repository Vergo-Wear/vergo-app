const { Client } = require('pg');
require('dotenv').config({ path: './.env' });

async function checkDeps() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const funcNames = ['get_customer_id', 'get_employee_id', 'get_user_role', 'is_admin', 'is_customer', 'is_employee'];

  for (const fn of funcNames) {
    const res = await client.query(`
      SELECT 
        pol.polname as policy_name,
        rel.relname as table_name,
        pg_get_expr(pol.polqual, pol.polrelid) as qual,
        pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check
      FROM pg_policy pol
      JOIN pg_class rel ON pol.polrelid = rel.oid
      JOIN pg_namespace nsp ON rel.relnamespace = nsp.oid
      WHERE nsp.nspname = 'public'
        AND (
          pg_get_expr(pol.polqual, pol.polrelid) LIKE '%${fn}%'
          OR pg_get_expr(pol.polwithcheck, pol.polrelid) LIKE '%${fn}%'
        );
    `);

    console.log(`=== Dependencies for public.${fn}() (${res.rows.length}): ===`);
    for (const r of res.rows) {
      console.log(`  Table: ${r.table_name} | Policy: ${r.policy_name}`);
      if (r.qual) console.log(`    QUAL: ${r.qual}`);
      if (r.with_check) console.log(`    WITH CHECK: ${r.with_check}`);
    }
  }

  await client.end();
}

checkDeps().catch(err => console.error(err));
