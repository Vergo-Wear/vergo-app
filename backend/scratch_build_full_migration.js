const fs = require('fs');
const path = require('path');
const policies = JSON.parse(fs.readFileSync('./scratch_db_out/policies.json', 'utf8'));

function formatRoles(roles) {
  if (Array.isArray(roles)) return roles.join(', ');
  if (typeof roles === 'string') return roles.replace('{', '').replace('}', '');
  return 'public';
}

function updateExpression(table, expr) {
  if (!expr) return null;
  let s = expr;

  s = s.replace(/\bpublic\.is_admin\(\)/g, '(select private.is_admin())');
  s = s.replace(/\bis_admin\(\)/g, '(select private.is_admin())');

  s = s.replace(/\bpublic\.is_employee\(\)/g, '(select private.is_employee())');
  s = s.replace(/\bis_employee\(\)/g, '(select private.is_employee())');

  s = s.replace(/\bpublic\.is_customer\(\)/g, '(select private.is_customer())');
  s = s.replace(/\bis_customer\(\)/g, '(select private.is_customer())');

  s = s.replace(/\bpublic\.get_customer_id\(\)/g, '(select private.get_customer_id())');
  s = s.replace(/\bget_customer_id\(\)/g, '(select private.get_customer_id())');

  s = s.replace(/\bpublic\.get_employee_id\(\)/g, '(select private.get_employee_id())');
  s = s.replace(/\bget_employee_id\(\)/g, '(select private.get_employee_id())');

  s = s.replace(/\bpublic\.get_user_role\(\)/g, '(select private.get_user_role())');
  s = s.replace(/\bget_user_role\(\)/g, '(select private.get_user_role())');

  // Fix decompiled subquery aliases from pg_policies
  if (table === 'cart_item') {
    s = s.replace(/c\.cart_id = c\.cart_id/g, 'c.cart_id = cart_item.cart_id');
  }
  if (table === 'review_image') {
    s = s.replace(/r\.review_id = r\.review_id/g, 'r.review_id = review_image.review_id');
  }
  if (table.startsWith('pending_checkout_') || table === 'stock_reservation') {
    s = s.replace(/pc\.checkout_id = pc\.checkout_id/g, `pc.checkout_id = ${table}.checkout_id`);
  }
  if (table.startsWith('order_')) {
    s = s.replace(/o\.order_id = o\.order_id/g, `o.order_id = ${table}.order_id`);
  }

  // Replace auth.uid() with (select auth.uid()) while preserving column references
  s = s.replace(/\(?select auth\.uid\(\)\)?/g, '(select auth.uid())');
  s = s.replace(/auth\.uid\(\)/g, '(select auth.uid())');
  s = s.replace(/\(\(select auth\.uid\(\)\)\)/g, '(select auth.uid())');

  return s;
}

const target11 = new Set([
  'branch', 'category', 'color', 'delivery_fee_rules', 'delivery_tracking_event',
  'employee_commission', 'images', 'product', 'product_variant',
  'role', 'salary_record', 'size'
]);

const migrationSql = [];

// STEP 1: Create private schema and private helper functions
migrationSql.push(`-- ============================================================================
-- STEP 1: CREATE PRIVATE SCHEMA & SECURITY DEFINER HELPER FUNCTIONS
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS private;

GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.get_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT r.role_name INTO v_role_name
  FROM public.profiles p
  JOIN public.role r ON p.role_id = r.role_id
  WHERE p.id = auth.uid();
  
  RETURN v_role_name;
END;
$$;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(private.get_user_role() = 'Admin', false);
$$;

CREATE OR REPLACE FUNCTION private.is_customer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(private.get_user_role() = 'Customer', false);
$$;

CREATE OR REPLACE FUNCTION private.is_employee()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(private.get_user_role() = 'Employee', false);
$$;

CREATE OR REPLACE FUNCTION private.get_customer_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT customer_id FROM public.customer WHERE profile_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.get_employee_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT employee_id FROM public.employee WHERE profile_id = auth.uid();
$$;

-- STEP 2: RESTRICT FUNCTION EXECUTION PERMISSIONS
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM anon;

GRANT EXECUTE ON FUNCTION private.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_customer() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_employee() TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_customer_id() TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_employee_id() TO authenticated;

-- ============================================================================
-- STEP 3: UPDATE RLS POLICIES TO USE PRIVATE HELPERS & (SELECT AUTH.UID())
-- ============================================================================
`);

const byTable = {};
for (const p of policies) {
  if (!byTable[p.tablename]) byTable[p.tablename] = [];
  byTable[p.tablename].push(p);
}

const tableNames = Object.keys(byTable).sort();
console.log(`Processing ${tableNames.length} tables...`);

for (const table of tableNames) {
  const pols = byTable[table];
  migrationSql.push(`\n-- Table: public.${table}`);
  for (const p of pols) {
    if (table === 'contact_message' && p.policyname === 'contact_message_insert_policy') {
      migrationSql.push(`DROP POLICY IF EXISTS "${p.policyname}" ON public."${table}";`);
      migrationSql.push(`-- Removed contact_message_insert_policy for anon (submissions pass through NestJS backend).`);
      continue;
    }

    const rolesStr = formatRoles(p.roles);
    const qualUpdated = updateExpression(table, p.qual);
    const checkUpdated = updateExpression(table, p.with_check);

    if (target11.has(table) && p.cmd === 'ALL') {
      migrationSql.push(`DROP POLICY IF EXISTS "${p.policyname}" ON public."${table}";`);
      const baseName = p.policyname.replace(/_write_policy$|_all_policy$/, '');

      migrationSql.push(`CREATE POLICY "${baseName}_insert_policy" ON public."${table}" FOR INSERT TO ${rolesStr} WITH CHECK (${checkUpdated || qualUpdated});`);
      migrationSql.push(`CREATE POLICY "${baseName}_update_policy" ON public."${table}" FOR UPDATE TO ${rolesStr} USING (${qualUpdated}) WITH CHECK (${checkUpdated || qualUpdated});`);
      migrationSql.push(`CREATE POLICY "${baseName}_delete_policy" ON public."${table}" FOR DELETE TO ${rolesStr} USING (${qualUpdated});`);
    } else {
      migrationSql.push(`DROP POLICY IF EXISTS "${p.policyname}" ON public."${table}";`);
      let createStmt = `CREATE POLICY "${p.policyname}" ON public."${table}" FOR ${p.cmd} TO ${rolesStr}`;
      if (qualUpdated && p.cmd !== 'INSERT') {
        createStmt += ` USING (${qualUpdated})`;
      }
      if (checkUpdated && (p.cmd === 'INSERT' || p.cmd === 'UPDATE' || p.cmd === 'ALL')) {
        createStmt += ` WITH CHECK (${checkUpdated})`;
      }
      createStmt += `;`;
      migrationSql.push(createStmt);
    }
  }
}

// STEP 4: INDEXES
migrationSql.push(`\n-- ============================================================================
-- STEP 4: ADD MISSING RLS LOOKUP INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS employee_commission_employee_id_idx ON public.employee_commission(employee_id);
CREATE INDEX IF NOT EXISTS user_addresses_customer_id_idx ON public.user_addresses(customer_id);
`);

// STEP 5: DROP LEGACY PUBLIC HELPER FUNCTIONS (SAFELY, WITHOUT CASCADE)
migrationSql.push(`\n-- ============================================================================
-- STEP 5: DROP OLD PUBLIC SCHEMAS HELPER FUNCTIONS (AFTER POLICY UPDATES)
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_customer_id();
DROP FUNCTION IF EXISTS public.get_employee_id();
DROP FUNCTION IF EXISTS public.get_user_role();
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_customer();
DROP FUNCTION IF EXISTS public.is_employee();
`);

const finalSql = migrationSql.join('\n');
const targetFile = path.join(__dirname, 'prisma/migrations/20260825160000_fix_supabase_rls_security_advisor/migration.sql');

fs.writeFileSync(targetFile, finalSql);
console.log(`Successfully wrote ${finalSql.length} bytes to ${targetFile}`);
