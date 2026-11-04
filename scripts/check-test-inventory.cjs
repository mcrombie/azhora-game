// Scan only public source/test trees. Every discovered test must be registered or explained.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const registered=require('../tests/test-manifest.json'),excluded=require('../tests/test-exclusions.json');
function scan(dir){return fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(entry=>{
  const file=dir+'/'+entry.name;
  if(entry.isSymbolicLink()||entry.name==='reference-private'||entry.name==='artifacts'||entry.name.startsWith('.'))return [];
  return entry.isDirectory()?scan(file):/\.test\.c?js$/.test(file)?[file]:[];
});}
const found=[...scan('tests'),...scan('src')].sort(),accounted=[...registered,...Object.keys(excluded)];
assert.equal(new Set(accounted).size,accounted.length,'Duplicate or simultaneously excluded/registered test');
for(const [file,reason] of Object.entries(excluded))assert.ok(typeof reason==='string'&&reason.length>30,`Missing exclusion reason: ${file}`);
assert.deepEqual([...accounted].sort(),found,'Test inventory drift: register new tests or document intentional exclusions');
console.log(`${found.length} discovered = ${registered.length} registered + ${Object.keys(excluded).length} explicitly excluded. See tests/test-exclusions.json.`);
