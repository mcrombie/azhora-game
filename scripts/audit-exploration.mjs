import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),graph=new Map();
const normalize=p=>path.relative(root,p).replaceAll('\\','/');
function links(file){
  if(graph.has(file))return graph.get(file);
  const source=fs.readFileSync(path.join(root,file),'utf8');
  const parsed=new vm.SourceTextModule(source);
  const resolve=specifier=>specifier==='three'?'vendor/three.module.js':specifier.startsWith('.')?normalize(path.resolve(root,path.dirname(file),specifier)):null;
  const dependencies=[...new Set([...parsed.dependencySpecifiers,...[...source.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)].map(m=>m[1])].map(resolve).filter(Boolean))];
  graph.set(file,dependencies);return dependencies;
}
function closure(entry){
  const seen=new Map([[entry,[entry]]]),queue=[entry];
  for(const file of queue)for(const next of links(file))if(!seen.has(next)){seen.set(next,[...seen.get(file),next]);queue.push(next);}
  return seen;
}
const entries=['src/main.js','src/world.js','src/app/exploration/entry.js'];
const closures=Object.fromEntries(entries.map(entry=>[entry,closure(entry)]));
const exploration=closures[entries[2]];
const legacy=file=>/^src\/(content\/(quests|chapters)|gameplay\/(skills|quests))\//.test(file);
const categories=files=>{
  const counts={};for(const file of files){const category=file.split('/').slice(0,file.startsWith('src/')?3:1).join('/');counts[category]=(counts[category]??0)+1;}return counts;
};
const forbidden=['src/main.js','src/app/saves/road-checkpoint.js','src/gameplay/combat/combat.js','src/gameplay/autoplay/autopilot.js'];
const violations=forbidden.filter(file=>exploration.has(file));
const owned=[...graph].filter(([file])=>file.startsWith('src/app/exploration/'));
const directViolations=owned.flatMap(([file,deps])=>deps.filter(legacy).map(dependency=>({file,dependency})));
const report={generated:new Date().toISOString(),method:'Parsed static imports plus literal dynamic imports; no modules executed. Closures include developer checks reachable through literal dynamic imports.',
  entries:Object.fromEntries(entries.map(entry=>[entry,{modules:closures[entry].size,categories:categories(closures[entry].keys())}])),
  legacyDependencies:[...exploration.keys()].filter(legacy).sort().map(file=>({file,path:exploration.get(file)})),
  forbiddenRuntimeImports:violations,directFeatureImports:directViolations};
fs.mkdirSync(path.join(root,'tests','artifacts'),{recursive:true});
fs.writeFileSync(path.join(root,'tests','artifacts','exploration-dependencies.json'),JSON.stringify(report,null,2));
for(const [entry,value]of Object.entries(report.entries))console.log(`${entry}: ${value.modules} reachable modules`);
console.log(`Transitive legacy content/skill/quest modules: ${report.legacyDependencies.length}`);
if(violations.length||directViolations.length){console.error(JSON.stringify({violations,directViolations}));process.exitCode=1;}
else console.log('Exploration boundary OK: no old game entry, road checkpoint, combat controller, autoplay, or direct quest/skill imports.');
