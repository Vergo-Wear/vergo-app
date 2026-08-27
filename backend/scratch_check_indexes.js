const fs = require('fs');
const indexes = JSON.parse(fs.readFileSync('./scratch_db_out/indexes.json', 'utf8'));

const fkChecks = [
  { table: 'customer', column: 'profile_id' },
  { table: 'employee', column: 'profile_id' },
  { table: 'notification', column: 'recipient_profile_id' },
  { table: 'employee_commission', column: 'employee_id' },
  { table: 'salary_record', column: 'employee_id' },
  { table: 'orders', column: 'customer_id' },
  { table: 'cart', column: 'customer_id' },
  { table: 'user_addresses', column: 'customer_id' },
];

for (const check of fkChecks) {
  const tblIndexes = indexes.filter(i => i.tablename === check.table);
  const matching = tblIndexes.filter(i => i.indexdef.toLowerCase().includes(check.column.toLowerCase()));
  console.log(`Table: ${check.table}, Column: ${check.column}`);
  if (matching.length > 0) {
    for (const m of matching) {
      console.log(`  - ${m.indexname}: ${m.indexdef}`);
    }
  } else {
    console.log(`  * MISSING INDEX!`);
  }
}
