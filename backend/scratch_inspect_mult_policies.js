const fs = require('fs');
const policies = JSON.parse(fs.readFileSync('./scratch_db_out/policies.json', 'utf8'));

const targetTables = [
  'branch', 'color', 'delivery_fee_rules', 'delivery_tracking_event',
  'employee_commission', 'images', 'product', 'product_variant',
  'role', 'salary_record', 'size'
];

for (const table of targetTables) {
  console.log(`=== TABLE: ${table} ===`);
  const pols = policies.filter(p => p.tablename === table);
  for (const p of pols) {
    console.log(`  Policy: ${p.policyname} | CMD: ${p.cmd} | Roles: ${p.roles}`);
    console.log(`    QUAL: ${p.qual}`);
    console.log(`    WITH CHECK: ${p.with_check}`);
  }
}
