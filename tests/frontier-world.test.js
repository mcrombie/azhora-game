import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {colliderOverlapsHeight} from '../src/world/collision/walk-surfaces.js';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/gameplay/movement/game-state.js';
import { MAIN_ROAD } from '../src/world/terrain/region-world.js';
import { MENORA, MENORA_GATES, MENORA_PATHS, MENORA_BRIDGES, MENORA_NPC_ANCHORS, MENORA_BUILDINGS } from '../src/content/regions/minora-frontier/menora-city.js';
import { CARICAS_TOWN, CARICAS_ROADS, CARICAS_GUARD_POSTS } from '../src/content/regions/minora-frontier/caricas-settlement.js';
import { FARMSTEADS, REGIONAL_FARM_ROWS } from '../src/world/scenery/regional-farmland.js';
import { YUNETHRE_PATHS, YUNETHRE_ARRIVAL, YUNETHRE_CAMP, YUNETHRE_RAID_ROUTE, YUNETHRE_WILDLIFE_ZONES } from '../src/content/regions/minora-frontier/yunethre-world.js';
let built;
async function world(){if(!built){const {createWorld}=await sourceModule('../src/world.js');built=createWorld(new THREE.Scene());recordDiagnostics(built);}return built;}
function blocked(w,x,z,r=.4){return !canStand(x,z,w,r,w.heightAt(x,z));}
function sample(path,step=2){const points=path.points??path,result=[];for(let j=1;j<points.length;j++){const a=points[j-1],b=points[j],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/step);for(let i=0;i<=n;i++)result.push({x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n});}return result;}

function collisionDetails(w,p,r=.4){const y=w.heightAt(p.x,p.z);return {x:p.x,z:p.z,height:y,water:w.waterAt(p.x,p.z),colliders:w.nearColliders(p.x,p.z,r).filter(c=>!['river-water','pond-water'].includes(c.kind)&&colliderOverlapsHeight(c,y)&&(c.r!==undefined?Math.hypot(p.x-c.x,p.z-c.z)<c.r+r:Math.abs(p.x-c.x)<c.hx+r&&Math.abs(p.z-c.z)<c.hz+r))};}
function farmStances(farm){return [...farm.rows,{...farm.seedStation,z:farm.seedStation.z+1.5}];}
function recordDiagnostics(w){const output={paths:{},farms:[],promenade:[],mainRoad:w.paths[0]},paths=[...MENORA_PATHS,...CARICAS_ROADS,...YUNETHRE_PATHS,{id:'yunethre-raiding-route',points:YUNETHRE_RAID_ROUTE}];
 for(const path of paths){const r=path.id==='yunethre-raiding-route'?.85:.4;output.paths[path.id]=sample(path).filter(p=>blocked(w,p.x,p.z,r)).map(p=>collisionDetails(w,p,r));}
 for(const farm of FARMSTEADS.filter(f=>f.region==='Caricas'))for(const p of farmStances(farm))if(blocked(w,p.x,p.z))output.farms.push({id:p.id,...collisionDetails(w,p)});
 let y=w.yunethre.walkSurfaces[0].a.y;
 for(const surface of w.yunethre.walkSurfaces)for(const p of sample([surface.a,surface.b],.25)){const hit=w.supportAt(p.x,p.z,{maxY:y,stepUp:.35});if(!hit.id?.startsWith('yunethre-tarn-walk-'))output.promenade.push({surface:surface.id,...p,y,hit});y=hit.height;}
 writeFileSync(new URL('./artifacts/frontier-world-diagnostics.json',import.meta.url),JSON.stringify(output,null,2));
}

test('Integrated frontier settlements retain clear entrances, prince meeting places and garrison posts after all world scatter',async()=>{
 const w=await world();
 for(const p of [MENORA.arrival,...MENORA_GATES,MENORA_NPC_ANCHORS.cedric,MENORA_NPC_ANCHORS.wilhelm,...MENORA_NPC_ANCHORS.army,CARICAS_TOWN.arrival,...CARICAS_GUARD_POSTS,YUNETHRE_ARRIVAL,YUNETHRE_CAMP])
  assert.ok(!blocked(w,p.x,p.z),`${p.id??'meeting point'} blocked at ${p.x},${p.z}`);
 assert.ok(w.yunethreMetrics.trees>60);assert.equal(w.yunethreMetrics.buildings,6);
});

test('Actual Minora gates and all five visible bridges carry walkers without closing the river',async()=>{
 const w=await world();
 for(const path of MENORA_PATHS)for(const p of sample(path))assert.ok(!blocked(w,p.x,p.z),`${path.id} blocked ${p.x},${p.z}`);
 for(const b of MENORA_BRIDGES){const x=b.axis==='x'?(b.start+b.end)/2:b.x,z=b.axis==='z'?(b.start+b.end)/2:b.z;
  assert.ok(Math.abs(w.heightAt(x,z)-b.deck)<.02,`${b.id}: deck support differs`);assert.ok(!blocked(w,x,z));
  assert.ok(w.groundHeight(x,z)<b.deck-1,`${b.id}: underlying channel was filled`);
 }
 assert.ok(w.waterAt(MENORA.fork.x,MENORA.fork.z)>w.groundHeight(MENORA.fork.x,MENORA.fork.z));
 assert.ok(MENORA_BUILDINGS.some(b=>b.kind==='sorcerers-tower'&&b.height>100));
});

test('Caricas streets, real cultivated beds and seed benches stay accessible',async()=>{
 const w=await world(),farms=FARMSTEADS.filter(f=>f.region==='Caricas');assert.equal(farms.length,5);
 for(const path of CARICAS_ROADS)for(const p of sample(path))assert.ok(!blocked(w,p.x,p.z),`${path.id} blocked ${p.x},${p.z}`);
 for(const farm of farms){assert.ok(w.farmsteads.includes(farm));assert.ok(REGIONAL_FARM_ROWS.some(r=>r.farmId===farm.id));
  for(const p of farmStances(farm))assert.ok(!blocked(w,p.x,p.z),`${p.id} is blocked`);
 }
});

test('The neutral town, lake promenade and centaur passage join the world without altering the main road',async()=>{
 const w=await world();for(const i of [0,-1]){const actual=w.paths[0].at(i),expected=MAIN_ROAD.at(i);assert.ok(Math.hypot(actual.x-expected.x,actual.z-expected.z)<.001,'original Drent road remains first');}
 for(const path of YUNETHRE_PATHS)for(const p of sample(path))assert.ok(!blocked(w,p.x,p.z),`${path.id} blocked ${p.x},${p.z}`);
 for(const p of sample(YUNETHRE_RAID_ROUTE,3))assert.ok(!blocked(w,p.x,p.z,.85),`raiders blocked ${p.x},${p.z}`);
 const surfaces=w.walkSurfaces.filter(s=>s.id.startsWith('yunethre-tarn-walk-'));assert.equal(surfaces.length,3);
 let y=surfaces[0].a.y;
 for(const surface of surfaces){for(const p of sample([surface.a,surface.b],.25)){
  const hit=w.supportAt(p.x,p.z,{maxY:y,stepUp:.35});assert.ok(hit.id?.startsWith('yunethre-tarn-walk-'),`lost the promenade at ${p.x},${p.z}`);y=hit.height;
 }}
 assert.ok(y>35,'promenade reaches the original mountain lake');
 assert.ok(w.landmarks.some(p=>p.id==='yunethre-free-town'));assert.equal(YUNETHRE_WILDLIFE_ZONES.reduce((n,z)=>n+z.sites.length,0),50);
});
