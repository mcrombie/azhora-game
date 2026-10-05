import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { CENTRAL_NORTH_PILOT as box } from '../src/east-lotharn-north-shoulder.js';
import { lotharnCentralNorthDelta as addition } from '../src/east-lotharn-world.js';
import { RAMPS, peakUplift, onBald, OLVETH, KEMRATH, STONEGATE, PASS_ROAD, WORKINGS_TRACK } from '../src/east-lotharn-world.js';
import { CAVE_LINES, createCaves } from '../src/east-lotharn-caves.js';
import { groundWithRiver } from '../src/world-terrain.js';
test('the central north shoulder preserves complete approaches, cave floor ownership and the Varn apron', t => {
const checks=[], rows=[], reservations={routes:0,caves:0,fortApron:0,lowlands:0,edges:0,lowCourse:0,bald:0};
function unchanged(p,label){assert.equal(addition(p.x,p.z),0,`${label} ${p.x},${p.z}`);reservations[label]++;}
function* linePoints(points,spacing=1){
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),n=Math.max(1,Math.ceil(length/spacing));
    for(let j=0;j<=n;j++)yield{x:a.x+dx*j/n,z:a.z+dz*j/n,nx:-dz/(length||1),nz:dx/(length||1)};
  }
}
for(const route of RAMPS)for(const p of linePoints(route.line.points))for(const off of [-6.999,-3.2,0,3.2,6.999])unchanged({x:p.x+p.nx*off,z:p.z+p.nz*off},'routes');
for(const cave of CAVE_LINES)for(const p of linePoints(cave.points))for(const dx of [-12,-4,0,4,12])for(const dz of [-12,-4,0,4,12])unchanged({x:p.x+dx,z:p.z+dz},'caves');
for(let x=-1566;x<=-694;x+=3)for(let z=-966;z<=-594;z+=3)unchanged({x,z},'fortApron');
for(const points of [OLVETH.line.points,KEMRATH.line.points,STONEGATE.line.points,PASS_ROAD,WORKINGS_TRACK])for(const p of linePoints(points))for(const off of [-2,0,2])unchanged({x:p.x+p.nx*off,z:p.z+p.nz*off},'lowlands');
for(let x=box.minX-1;x<=box.maxX+1;x++)for(const z of [box.minZ-1,box.minZ,box.maxZ,box.maxZ+1])unchanged({x,z},'edges');
for(let z=box.minZ-1;z<=box.maxZ+1;z++)for(const x of [box.minX-1,box.minX,box.maxX,box.maxX+1])unchanged({x,z},'edges');
checks.push('All full route footprints, cave corridors, Varn apron, lowlands and window edges stay numerically exact');
const slope=(sample,x,z)=>Math.hypot(sample(x+.4,z)-sample(x-.4,z),sample(x,z+.4)-sample(x,z-.4))/.8;
const beforeGround=(x,z)=>groundWithRiver(x,z)-addition(x,z), prototype=groundWithRiver;
const cavesBefore=createCaves(beforeGround),cavesAfter=createCaves(prototype);
assert.equal(cavesAfter.length,cavesBefore.length);
for(let i=0;i<cavesBefore.length;i++){
  const a=cavesBefore[i],b=cavesAfter[i];
  assert.deepEqual([a.id,a.portals,a.openings,a.lower,a.upper],[b.id,b.portals,b.openings,b.lower,b.upper]);
  for(let along=0;along<=a.length;along+=.25)assert.equal(a.floor(along),b.floor(along),a.id+' floor');
}
checks.push('All eight actual derived caves retain exact portal searches, opening stations, endpoint levels and sampled floors');
for(let x=box.minX;x<=box.maxX;x+=2)for(let z=box.minZ;z<=box.maxZ;z+=2){
  const d=addition(x,z),u=peakUplift(x,z);
  assert.ok(Number.isFinite(d)&&d>=0&&d<25,`invalid added height at ${x},${z}`);
  if(u<=80)unchanged({x,z},'lowCourse');if(onBald(x,z,12))unchanged({x,z},'bald');
  const before=beforeGround(x,z);
  rows.push({x,z,before,after:before+d,added:d,oldSlope:slope(beforeGround,x,z),newSlope:slope(prototype,x,z)});
}
checks.push('The sampled field only raises upper non-bald ground and leaves the lower two courses exact');
const changed=rows.filter(p=>p.added>.001),significant=rows.filter(p=>p.added>2),statistics=values=>{
  const sorted=values.slice().sort((a,b)=>a-b);return{min:sorted[0],median:sorted[Math.floor(sorted.length/2)],p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1)};
};
const cliffs=significant.filter(p=>p.oldSlope>6);
const summary={checks,reservations,changed:changed.length,above2m:significant.length,maxAddition:Math.max(...changed.map(p=>p.added)),
  modifiedAreaSquareMetres:changed.length*4,
  beforeSlope:statistics(significant.map(p=>p.oldSlope)),afterSlope:statistics(significant.map(p=>p.newSlope)),
  originalCliffSamples:cliffs.length,cliffsBefore:statistics(cliffs.map(p=>p.oldSlope)),cliffsAfter:statistics(cliffs.map(p=>p.newSlope)),
  cliffSamplesLessSteep:cliffs.filter(p=>p.newSlope<p.oldSlope).length,
  newSteepest:changed.reduce((a,b)=>a.newSlope>b.newSlope?a:b),
  sourceSha256:Object.fromEntries(['src/east-lotharn-world.js','src/varn-world.js','src/world-terrain.js','src/east-lotharn-north-shoulder.js'].map(file=>[file,createHash('sha256').update(fs.readFileSync(new URL('../'+file,import.meta.url))).digest('hex')]))};
fs.mkdirSync(new URL('./artifacts/', import.meta.url), {recursive:true});
fs.writeFileSync(new URL('./artifacts/r1-central-north-candidate-checks.json',import.meta.url),JSON.stringify({summary,rows},null,2)+'\n');
assert.ok(summary.cliffSamplesLessSteep >= 36);
assert.ok(summary.maxAddition < 21);
t.diagnostic(JSON.stringify(summary));
});
