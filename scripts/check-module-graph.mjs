import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath,pathToFileURL} from 'node:url';

// Parse and link every runtime module without executing DOM or world construction.
// Run with Node's --experimental-vm-modules flag; this is development tooling only.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const modules=new Map();
function moduleFor(filename){
  filename=path.resolve(filename);
  if(!modules.has(filename))modules.set(filename,new vm.SourceTextModule(fs.readFileSync(filename,'utf8'),{
    identifier:pathToFileURL(filename).href,
  }));
  return modules.get(filename);
}
function resolve(specifier,from){
  return moduleFor(specifier==='three'?path.join(root,'vendor/three.module.js'):fileURLToPath(new URL(specifier,from.identifier)));
}
for(const file of fs.readdirSync(path.join(root,'src'),{recursive:true}).filter(name=>name.endsWith('.js'))){
  const module=moduleFor(path.join(root,'src',file));
  if(module.status==='unlinked')await module.link(resolve);
}
console.log(`Module graph OK: ${modules.size} modules linked without executing the game.`);
