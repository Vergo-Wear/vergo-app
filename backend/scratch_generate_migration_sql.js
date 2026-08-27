const fs = require('fs');
const policies = JSON.parse(fs.readFileSync('./scratch_db_out/policies.json', 'utf8'));

// Group by table
const byTable = {};
for (const p of policies) {
  if (!byTable[p.tablename]) byTable[p.tablename] = [];
  byTable[p.tablename].push(p);
}

console.log("Generating migration policy statements...");

const sqlStatements = [];

sqlStatements.push(`-- Step 1: Create private schema and private helper functions
CREATE SCHEMA IF NOT EXISTS private;

GRANT USAGE ON SCHEMA private TO authenticated;

-- Create private helper functions with SECURITY DEFINER and empty search_path
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

-- Step 2: Set function permissions
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM anon;

GRANT EXECUTE ON FUNCTION private.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_customer() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_employee() TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_customer_id() TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_employee_id() TO authenticated;
`);

fs.writeFileSync('./scratch_migration_header.sql', sqlStatements.join('\n'));
console.log("Header written.");
