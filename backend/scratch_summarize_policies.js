const fs = require('fs');
const policies = JSON.parse(fs.readFileSync('./scratch_db_out/policies.json', 'utf8'));

console.log(`Total policies found: ${policies.length}\n`);

const byTable = {};
for (const p of policies) {
  if (!byTable[p.tablename]) byTable[p.tablename] = [];
  byTable[p.tablename].push(p);
}

for (const [table, pols] of Object.entries(byTable)) {
  console.log(`=== TABLE: ${table} (${pols.length} policies) ===`);
  for (const p of pols) {
    console.log(`  Policy: ${p.policyname}`);
    console.log(`    CMD: ${p.cmd}, Permissive: ${p.permissive}, Roles: ${p.roles}`);
    if (p.qual) console.log(`    QUAL: ${p.qual}`);
    if (p.with_check) console.log(`    WITH CHECK: ${p.with_check}`);
  }
  console.log('');
}
