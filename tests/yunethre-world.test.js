import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { YUNETHRE_CELLS, YUNETHRE_TOWN, YUNETHRE_CAMP, YUNETHRE_ARRIVAL, YUNETHRE_PATHS, YUNETHRE_BOUNDS,
 YUNETHRE_WILDLIFE_ZONES, YUNETHRE_LAKE, YUNETHRE_RAID_ROUTE, yunethreOwns, yunethreGround, yunethreReserved, yunethreFeatures } from '../src/content/regions/minora-frontier/yunethre-world.js';
import { REGION_IDS, REGION_CELLS, REGION_ORDER, regionAt } from '../src/world/terrain/region-world.js';
import { westWaterSurface } from '../src/content/regions/western-regions/west-ground.js';
import { groundWithRiver } from '../src/world/terrain/world-terrain.js';
import { southOremindiGround, SOUTH_OREMINDI_LAKES } from '../src/content/regions/south-oremindi/south-oremindi-world.js';
import { timberForSpecies } from '../src/gameplay/skills/woodcutting/wood-species.js';
import { createWalkSurfaces } from '../src/world/collision/walk-surfaces.js';
import { canStand } from '../src/gameplay/movement/game-state.js';
const {createYunethreScenery}=await sourceModule('../src/content/regions/minora-frontier/yunethre-scenery.js');
const terrain=groundWithRiver;
const parent=new THREE.Group(),colliders=[];
const scenery=createYunethreScenery({parent,heightAt:terrain,colliders});
const world={bounds:{minX:-10000,maxX:10000,minZ:-10000,maxZ:10000},heightAt:terrain,colliders};

test('Yunethre appends its exact 27 plains cells without replacing an existing region ID',()=>{
 assert.equal(REGION_IDS.Yunethre,38);assert.equal(REGION_ORDER[REGION_IDS.Yunethre-1],'Yunethre');assert.equal(YUNETHRE_CELLS.length,27);
 assert.ok(YUNETHRE_CELLS.every(c=>c.terrain==='plains'));
 assert.ok(yunethreOwns(YUNETHRE_TOWN.x,YUNETHRE_TOWN.z));assert.ok(yunethreOwns(YUNETHRE_CAMP.x,YUNETHRE_CAMP.z));
});

test('Grassland relief stays on owned land and leaves both adjacent mountain ranges and their lakes untouched',()=>{
 for(const region of ['South Oremindi Mountains','West Lotharn Mountains','North Ibenwood','Isareos'])for(const c of REGION_CELLS[region]){
  assert.equal(yunethreGround(c.x,c.z,213.127),213.127,`${region} ${c.q},${c.r}`);
 }
 assert.equal(YUNETHRE_LAKE,SOUTH_OREMINDI_LAKES.find(l=>l.id==='oremindi-forest-tarn'));
 assert.equal(YUNETHRE_LAKE.surface,35);
 for(const p of YUNETHRE_LAKE.shore){const y=southOremindiGround(p.x,p.z);assert.equal(yunethreGround(p.x,p.z,y),y);}
});

test('The town, camp and open passage keep broad walkable common ground',()=>{
 assert.ok(canStand(YUNETHRE_ARRIVAL.x,YUNETHRE_ARRIVAL.z,world));
 for(const path of YUNETHRE_PATHS)for(let k=1;k<path.points.length;k++){
  const a=path.points[k-1],b=path.points[k],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z));
  for(let i=0;i<=n;i++){const x=a.x+(b.x-a.x)*i/n,z=a.z+(b.z-a.z)*i/n;assert.ok(canStand(x,z,world),`${path.id} blocked at ${x},${z}`);}
 }
 assert.equal(scenery.metrics.buildings,6);assert.equal(scenery.metrics.tents,7);assert.equal(scenery.metrics.wagons,3);
 assert.ok(scenery.buildings.some(b=>b.style==='elf'));assert.ok(scenery.buildings.some(b=>b.style==='centaur'));
});

test('The tarn promenade has connected reachable walking support matching its rendered deck',()=>{
 const surfaces=scenery.walkSurfaces,support=createWalkSurfaces(surfaces,terrain);assert.equal(surfaces.length,3);
 assert.ok(Math.abs(surfaces[0].a.y-terrain(surfaces[0].a.x,surfaces[0].a.z))<.2);
 for(let i=0;i<surfaces.length;i++){
  const s=surfaces[i];if(i)assert.deepEqual(s.a,surfaces[i-1].b);
  assert.ok(Math.abs(s.b.y-s.a.y)/Math.hypot(s.b.x-s.a.x,s.b.z-s.a.z)<.6);
  const x=(s.a.x+s.b.x)/2,z=(s.a.z+s.b.z)/2,hit=support.supportAt(x,z,{surfaceId:s.id});
  assert.ok(hit);assert.ok(Math.abs(hit.height-(s.a.y+s.b.y)/2)<.001);
 }
 assert.equal(surfaces.at(-1).b.y,YUNETHRE_LAKE.surface+.8);
});

test('Every non-settlement plains cell has persistent nonbird wildlife clear of paths and buildings',()=>{
 const ids=new Set();assert.equal(YUNETHRE_WILDLIFE_ZONES.length,25);assert.equal(YUNETHRE_WILDLIFE_ZONES.reduce((s,z)=>s+z.sites.length,0),50);
 assert.deepEqual(new Set(YUNETHRE_WILDLIFE_ZONES.map(z=>z.species)),new Set(['boar','red-deer','upland-hare']));
 for(const zone of YUNETHRE_WILDLIFE_ZONES){assert.ok(!ids.has(zone.id));ids.add(zone.id);assert.equal(zone.habitat,'countryside');assert.equal(zone.keepRegion,true);
  for(const [x,z]of zone.sites){assert.ok(yunethreOwns(x,z));assert.ok(!yunethreReserved(x,z));assert.ok(yunethreFeatures(x,z).grade<.65);}}
});

test('All sparse grove trees carry actual harvestable species and scenery remains deterministic',()=>{
 assert.ok(scenery.trees.length>60);assert.ok(scenery.metrics.grass>1000);
 for(const tree of scenery.trees){assert.ok(timberForSpecies(tree.species));assert.equal(tree.harvestable,true);assert.ok(yunethreOwns(tree.x,tree.z));}
 const second=createYunethreScenery({parent:new THREE.Group(),heightAt:terrain,colliders:[]});
 assert.deepEqual(second.metrics,scenery.metrics);assert.deepEqual(second.trees.map(t=>t.id),scenery.trees.map(t=>t.id));
});

const {createWestLife,WEST_LIFE_ZONES}=await sourceModule('../src/content/regions/western-regions/west-regions-life.js');
test('Yunethre animals persist and remain grounded through motion, culling and a return visit',()=>{
 const habitatWorld={...world,paths:[],waterAt:()=>null,regionAt:(x,z)=>({name:yunethreOwns(x,z)?'Yunethre':'Other'})};
 const life=createWestLife(new THREE.Scene(),habitatWorld,{zones:YUNETHRE_WILDLIFE_ZONES});
 try{
  const animals=life.state().creatures;assert.equal(animals.length,50);
  const initial=new Map(animals.map(a=>[a.id,{x:a.x,z:a.z}]));let moving=0;
  for(const zone of YUNETHRE_WILDLIFE_ZONES.filter((z,i,zones)=>zones.findIndex(a=>a.species===z.species)===i)){
   assert.ok(WEST_LIFE_ZONES.includes(zone));const local=animals.filter(a=>a.id.startsWith(zone.id+'-'));
   for(let i=0;i<24;i++){const a=local[0];life.update(.15,{x:a.x-5,z:a.z});}
   for(const a of local){assert.ok(yunethreOwns(a.x,a.z));assert.ok(canStand(a.x,a.z,habitatWorld,zone.radius));
    assert.ok(Math.abs(a.groundY-terrain(a.x,a.z))<.001);assert.ok(Math.abs(a.y-a.groundY-a.lift)<1e-7);
    assert.ok(a.x>=zone.minX&&a.x<=zone.maxX&&a.z>=zone.minZ&&a.z<=zone.maxZ);
    const old=initial.get(a.id);if(Math.hypot(a.x-old.x,a.z-old.z)>1)moving++;
   }
  }
  assert.ok(moving>=3,`${moving} residents moved`);
  life.update(.2,{x:9000,z:9000});assert.ok(life.state().groups.every(g=>!g.visible));
  life.update(.2,YUNETHRE_ARRIVAL);assert.equal(life.state().creatures,animals);
  const paused=life.snapshot();life.update(.2,YUNETHRE_ARRIVAL,false);assert.deepEqual(life.snapshot(),paused);
 }finally{life.dispose();}
});

test('The raiding circuit reaches northwestern Isareos on dry gentle ground without crossing the neutral town or Elfland',()=>{
 const owners=new Set();
 for(let k=1;k<YUNETHRE_RAID_ROUTE.length;k++){
  const a=YUNETHRE_RAID_ROUTE[k-1],b=YUNETHRE_RAID_ROUTE[k],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z));
  for(let i=0;i<=n;i++){const x=a.x+(b.x-a.x)*i/n,z=a.z+(b.z-a.z)*i/n,owner=regionAt(x,z)?.name;owners.add(owner);
   assert.ok(['Yunethre','Isareos'].includes(owner),`${owner} at ${x},${z}`);
   assert.ok(Math.hypot(x-YUNETHRE_TOWN.x,z-YUNETHRE_TOWN.z)>140);
   assert.ok(canStand(x,z,world,.85));const water=westWaterSurface(x,z);assert.ok(water===null||water<terrain(x,z)-.1);
   const grade=Math.hypot(terrain(x+.5,z)-terrain(x-.5,z),terrain(x,z+.5)-terrain(x,z-.5));assert.ok(grade<.65,`grade ${grade} at ${x},${z}`);
  }
 }
 assert.deepEqual(owners,new Set(['Yunethre','Isareos']));
});
