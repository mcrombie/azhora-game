import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Validate literal module edges and browser entry resources without constructing the world.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const errors=[];let modules=0,edges=0;
function* files(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(['artifacts','.electron-profiles','node_modules'].includes(entry.name))continue;
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())yield* files(full);else yield full;
  }
}
function check(file,ref){
  if(!ref.startsWith('.'))return;
  edges++;
  if(!fs.existsSync(path.resolve(path.dirname(file),ref.split(/[?#]/)[0])))errors.push(`${path.relative(root,file)} -> ${ref}`);
}
for(const dir of ['src','tests','scripts','prototypes'])for(const file of files(path.join(root,dir))){
  if(!/\.(?:m?js|cjs)$/.test(file))continue;
  modules++;const source=fs.readFileSync(file,'utf8');
  const refs=/(?:\bfrom\s*|(?:^|\n)\s*import\s+|\brequire\s*\(\s*)['"](\.[^'"\n]+)['"]/g;
  for(const match of source.matchAll(refs))check(file,match[1]);
  // Runtime modules use document-context imports; tests/scripts also contain quoted
  // JavaScript sent to Electron, which must not be resolved as a Node import.
  if(dir==='src'||dir==='prototypes')for(const match of source.matchAll(/\bimport\s*\(\s*['"](\.[^'"\n]+)['"]/g))check(file,match[1]);
  for(const match of source.matchAll(/new URL\(\s*['"](\.[^'"\n]+)['"]\s*,\s*import\.meta\.url/g))if(!match[1].includes('/artifacts/'))check(file,match[1]);
}
for(const file of [path.join(root,'index.html'),...files(path.join(root,'prototypes'))].filter(p=>p.endsWith('.html'))){
  for(const match of fs.readFileSync(file,'utf8').matchAll(/(?:src|href)=["'](\.[^"']+)["']/g))check(file,match[1]);
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
else console.log(`Source paths OK: ${modules} modules and ${edges} local references.`);
