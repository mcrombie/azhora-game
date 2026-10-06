import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import { RAMPS,pointOn,lotharnRouteJoinDelta as delta,nearLotharnRouteJoin } from '../src/content/regions/east-lotharn/east-lotharn-world.js';
import { groundWithRiver } from '../src/world/terrain/world-terrain.js';
import { createCaves } from '../src/content/regions/east-lotharn/east-lotharn-caves.js';
import { varnRouteJoinSceneryDelta } from '../src/content/regions/varn/varn-world.js';
const before=(x,z)=>groundWithRiver(x,z)-delta(x,z)-varnRouteJoinSceneryDelta(x,z);
test('central trail endpoint progress no longer creates the reproduced entry steps',t=>{
 const rows=[];
 for(const id of ['central-peak-ledge-2','central-peak-ledge-4','central-peak-ramp-6']){
  const way=RAMPS.find(r=>r.id===id),p=way.line.points[0],q=pointOn(way.line,.001);
  const old=before(q.x,q.z)-before(p.x,p.z),now=groundWithRiver(q.x,q.z)-groundWithRiver(p.x,p.z);
  rows.push({id,old,now});assert.ok(old>.25);assert.ok(Math.abs(now)<.002,`${id}: ${now}`);
 }
 t.diagnostic(JSON.stringify(rows));
});
test('join correction is bounded to central endpoint collars and preserves every cave definition',t=>{
 let changed=0,min=0,max=0,lipChanged=0,lipMax=0;
 for(let x=-1320;x<=-1090;x++)for(let z=-1130;z<=-880;z++){
  const d=delta(x,z);min=Math.min(min,d);max=Math.max(max,d);if(Math.abs(d)>1e-6)changed++;
  if(!nearLotharnRouteJoin(x,z))assert.equal(d,0);
  if(nearLotharnRouteJoin(x,z,5)&&z>=-965){const lip=varnRouteJoinSceneryDelta(x,z);if(Math.abs(lip)>1e-6){lipChanged++;lipMax=Math.max(lipMax,Math.abs(lip));}}
 }
 assert.ok(min> -1&&max<1&&changed<1000);
 for(const r of RAMPS.filter(r=>r.peak!=='central-peak'))for(const p of r.line.points)assert.equal(delta(p.x,p.z),0);
 const old=createCaves(before),now=createCaves(groundWithRiver);assert.equal(now.length,old.length);
 for(let i=0;i<old.length;i++){
  assert.deepEqual([now[i].id,now[i].portals,now[i].openings,now[i].lower,now[i].upper],[old[i].id,old[i].portals,old[i].openings,old[i].lower,old[i].upper]);
  for(let s=0;s<=old[i].length;s+=.25)assert.equal(now[i].floor(s),old[i].floor(s));
 }
 const summary={changed,min,max,lipChanged,lipMax,caves:now.length};
 mkdirSync(new URL('./artifacts/',import.meta.url),{recursive:true});writeFileSync(new URL('./artifacts/r1-route-joins-field.json',import.meta.url),JSON.stringify(summary,null,2));t.diagnostic(JSON.stringify(summary));
});
