const fs = require('fs');
const policies = JSON.parse(fs.readFileSync('./scratch_db_out/policies.json', 'utf8'));

function formatRoles(roles) {
  if (Array.isArray(roles)) {
    return roles.join(', ');
  }
  if (typeof roles === 'string') {
    return roles.replace('{', '').replace('}', '');
  }
  return 'public';
}

function replaceExpr(expr) {
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

  // Replace standalone auth.uid() with (select auth.uid())
  s = s.replace(/\(?select auth\.uid\(\)\)?/g, '(select auth.uid())');
  s = s.replace(/auth\.uid\(\)/g, '(select auth.uid())');
  s = s.replace(/\(\(select auth\.uid\(\)\)\)/g, '(select auth.uid())');

  return s;
}

const target11 = new Set([
  'branch', 'color', 'delivery_fee_rules', 'delivery_tracking_event',
  'employee_commission', 'images', 'product', 'product_variant',
  'role', 'salary_record', 'size'
]);

const outSql = [];

// Group policies by table
const byTable = {};
for (const p of policies) {
  if (!byTable[p.tablename]) byTable[p.tablename] = [];
  byTable[p.tablename].push(p);
}

for (const [table, pols] of Object.entries(byTable)) {
  outSql.push(`\n-- Table: public.${table}`);
  for (const p of pols) {
    if (table === 'contact_message' && p.policyname === 'contact_message_insert_policy') {
      outSql.push(`DROP POLICY IF EXISTS "${p.policyname}" ON public."${table}";`);
      outSql.push(`-- Removed contact_message_insert_policy to prevent unauthenticated direct REST inserts.`);
      continue;
    }

    const rolesStr = formatRoles(p.roles);
    const qualUpdated = replaceExpr(p.qual);
    const checkUpdated = replaceExpr(p.with_check);

    if (target11.has(table) && p.cmd === 'ALL') {
      outSql.push(`DROP POLICY IF EXISTS "${p.policyname}" ON public."${table}";`);
      
      const baseName = p.policyname.replace(/_write_policy$|_all_policy$/, '');

      // INSERT
      outSql.push(`CREATE POLICY "${baseName}_insert_policy" ON public."${table}" FOR INSERT TO ${rolesStr} WITH CHECK (${checkUpdated || qualUpdated});`);
      // UPDATE
      outSql.push(`CREATE POLICY "${baseName}_update_policy" ON public."${table}" FOR UPDATE TO ${rolesStr} USING (${qualUpdated}) WITH CHECK (${checkUpdated || qualUpdated});`);
      // DELETE
      outSql.push(`CREATE POLICY "${baseName}_delete_policy" ON public."${table}" FOR DELETE TO ${rolesStr} USING (${qualUpdated});`);
    } else {
      outSql.push(`DROP POLICY IF EXISTS "${p.policyname}" ON public."${table}";`);
      
      let createStmt = `CREATE POLICY "${p.policyname}" ON public."${table}" FOR ${p.cmd} TO ${rolesStr}`;
      if (qualUpdated && p.cmd !== 'INSERT') {
        createStmt += ` USING (${qualUpdated})`;
      }
      if (checkUpdated && (p.cmd === 'INSERT' || p.cmd === 'UPDATE' || p.cmd === 'ALL')) {
        createStmt += ` WITH CHECK (${checkUpdated})`;
      }
      createStmt += `;`;
      outSql.push(createStmt);
    }
  }
}

fs.writeFileSync('./scratch_policies_updated.sql', outSql.join('\n'));
console.log("Updated policies SQL written to scratch_policies_updated.sql");
