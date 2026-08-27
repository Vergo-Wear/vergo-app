const { Client } = require('pg');
const axios = require('axios');
require('dotenv').config({ path: './.env' });

async function finalAudit() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  console.log("=== 1. VERIFYING PUBLIC SCHEMA FUNCTIONS (SHOULD BE EMPTY) ===");
  const publicFuncs = await client.query(`
    SELECT proname FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND proname IN ('get_customer_id', 'get_employee_id', 'get_user_role', 'is_admin', 'is_customer', 'is_employee');
  `);
  console.log("Public functions remaining (expected 0):", publicFuncs.rows.length);

  console.log("\n=== 2. VERIFYING PRIVATE SCHEMA FUNCTIONS ===");
  const privateFuncs = await client.query(`
    SELECT p.proname, p.prosecdef, pg_get_functiondef(p.oid) as def, array_to_string(p.proacl, ', ') as acl
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'private'
      AND proname IN ('get_customer_id', 'get_employee_id', 'get_user_role', 'is_admin', 'is_customer', 'is_employee');
  `);
  console.log("Private functions created:", privateFuncs.rows.length);
  for (const f of privateFuncs.rows) {
    console.log(`  - ${f.proname}: secdef=${f.prosecdef}, acl=${f.acl}`);
  }

  console.log("\n=== 3. VERIFYING 11 TARGET TABLES POLICY OVERLAPS (FOR ALL SHOULD BE 0) ===");
  const target11 = ['branch', 'color', 'delivery_fee_rules', 'delivery_tracking_event', 'employee_commission', 'images', 'product', 'product_variant', 'role', 'salary_record', 'size'];
  const allPols = await client.query(`
    SELECT tablename, policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = ANY($1) AND cmd = 'ALL';
  `, [target11]);
  console.log("CMD ALL policies on target 11 tables (expected 0):", allPols.rows.length);

  console.log("\n=== 4. VERIFYING FK INDEXES ===");
  const indexRes = await client.query(`
    SELECT indexname FROM pg_indexes
    WHERE schemaname = 'public' AND indexname IN ('employee_commission_employee_id_idx', 'user_addresses_customer_id_idx');
  `);
  console.log("New FK Indexes present:", indexRes.rows.map(r => r.indexname));

  await client.end();

  console.log("\n=== 5. TESTING SUPABASE API REST RPC & TABLE ENDPOINTS ===");
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (supabaseUrl && anonKey) {
    // 5a. Test RPC calls via REST (should return 404 Function Not Found)
    try {
      await axios.get(`${supabaseUrl}/rest/v1/rpc/is_admin`, { headers: { apikey: anonKey } });
      console.log("  [FAIL] RPC is_admin was accessible!");
    } catch (e) {
      console.log("  [PASS] RPC is_admin status:", e.response ? e.response.status : e.message);
    }

    try {
      await axios.get(`${supabaseUrl}/rest/v1/rpc/get_customer_id`, { headers: { apikey: anonKey } });
      console.log("  [FAIL] RPC get_customer_id was accessible!");
    } catch (e) {
      console.log("  [PASS] RPC get_customer_id status:", e.response ? e.response.status : e.message);
    }

    // 5b. Test direct anon INSERT to contact_message (should return 401/403)
    try {
      await axios.post(`${supabaseUrl}/rest/v1/contact_message`, {
        full_name: "Test Hacker",
        email: "hacker@test.com",
        subject: "Spam",
        message: "Spam message"
      }, { headers: { apikey: anonKey, Prefer: "return=representation" } });
      console.log("  [FAIL] Direct anon INSERT to contact_message succeeded!");
    } catch (e) {
      console.log("  [PASS] Direct anon INSERT to contact_message denied with status:", e.response ? e.response.status : e.message);
    }

    // 5c. Test public read on catalogue (product)
    try {
      const prodRes = await axios.get(`${supabaseUrl}/rest/v1/product?limit=1`, { headers: { apikey: anonKey } });
      console.log("  [PASS] Storefront public product read status:", prodRes.status, `(rows returned: ${prodRes.data.length})`);
    } catch (e) {
      console.log("  [FAIL] Public product read failed:", e.message);
    }
  }

  console.log("\n=== 6. TESTING NESTJS BACKEND CONTACT ENDPOINT ===");
  try {
    const contactRes = await axios.post("http://localhost:3001/contact", {
      fullName: "Jane Customer",
      email: "jane.customer@example.com",
      subject: "Inquiry regarding order",
      message: "Hello, I would like to check on my order status."
    });
    console.log("  [PASS] Backend /contact endpoint status:", contactRes.status, "Message ID:", contactRes.data.messageId);
  } catch (e) {
    console.log("  [WARN] Backend /contact call error (ensure backend dev server is running):", e.response ? e.response.status : e.message);
  }
}

finalAudit().catch(err => console.error(err));
