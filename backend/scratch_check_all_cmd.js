const fs = require('fs');
const policies = JSON.parse(fs.readFileSync('./scratch_db_out/policies.json', 'utf8'));

const allCmdPols = policies.filter(p => p.cmd === 'ALL');
console.log(`Policies with CMD ALL (${allCmdPols.length}):`);
for (const p of allCmdPols) {
  console.log(`Table: ${p.tablename} | Policy: ${p.policyname} | Roles: ${p.roles}`);
}
