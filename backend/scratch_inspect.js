const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: './.env' });

async function inspect() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const outDir = './scratch_db_out';
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. PG POLICIES
  const policiesRes = await client.query(`
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    ORDER BY tablename, policyname;
  `);
  fs.writeFileSync(path.join(outDir, 'policies.json'), JSON.stringify(policiesRes.rows, null, 2));

  // 2. AFFECTED FUNCTIONS
  const funcsRes = await client.query(`
    SELECT 
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_functiondef(p.oid) as function_definition,
      p.prosecdef as is_security_definer,
      array_to_string(p.proacl, ', ') as acl
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname IN ('get_customer_id', 'get_employee_id', 'get_user_role', 'is_admin', 'is_customer', 'is_employee');
  `);
  fs.writeFileSync(path.join(outDir, 'functions.json'), JSON.stringify(funcsRes.rows, null, 2));

  // 3. TABLE GRANTS
  const grantsRes = await client.query(`
    SELECT grantee, table_schema, table_name, privilege_type
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
    ORDER BY table_name, grantee, privilege_type;
  `);
  fs.writeFileSync(path.join(outDir, 'grants.json'), JSON.stringify(grantsRes.rows, null, 2));

  // 4. INDEXES
  const indexesRes = await client.query(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname;
  `);
  fs.writeFileSync(path.join(outDir, 'indexes.json'), JSON.stringify(indexesRes.rows, null, 2));

  console.log("Inspection files written to ./scratch_db_out/");

  await client.end();
}

inspect().catch(err => console.error(err));
