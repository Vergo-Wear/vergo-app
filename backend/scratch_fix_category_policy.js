const { Client } = require('pg');
require('dotenv').config({ path: './.env' });

async function fixCategory() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  console.log("Fixing public.category RLS policies...");

  const sql = `
    DROP POLICY IF EXISTS "category_write_policy" ON public."category";

    DROP POLICY IF EXISTS "category_insert_policy" ON public."category";
    CREATE POLICY "category_insert_policy" ON public."category" 
      FOR INSERT TO authenticated 
      WITH CHECK (((select private.is_admin()) OR (select private.is_employee())));

    DROP POLICY IF EXISTS "category_update_policy" ON public."category";
    CREATE POLICY "category_update_policy" ON public."category" 
      FOR UPDATE TO authenticated 
      USING (((select private.is_admin()) OR (select private.is_employee()))) 
      WITH CHECK (((select private.is_admin()) OR (select private.is_employee())));

    DROP POLICY IF EXISTS "category_delete_policy" ON public."category";
    CREATE POLICY "category_delete_policy" ON public."category" 
      FOR DELETE TO authenticated 
      USING (((select private.is_admin()) OR (select private.is_employee())));
  `;

  await client.query(sql);
  console.log("public.category RLS policies fixed successfully!");

  // Verify
  const pols = await client.query(`
    SELECT policyname, cmd, roles, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'category'
    ORDER BY policyname;
  `);
  console.log("\nUpdated policies for public.category:");
  console.log(JSON.stringify(pols.rows, null, 2));

  await client.end();
}

fixCategory().catch(err => console.error(err));
