const fs = require('fs');
const policies = JSON.parse(fs.readFileSync('./scratch_db_out/policies.json', 'utf8'));

const byTable = {};
for (const p of policies) {
  if (!byTable[p.tablename]) byTable[p.tablename] = [];
  byTable[p.tablename].push(p);
}

const tableNames = Object.keys(byTable).sort();
console.log(`Tables with policies (${tableNames.length}):`, tableNames.join(', '));
