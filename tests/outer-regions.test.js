import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { OUTER_PROFILES } from '../src/outer-regions-data.js';
import { OUTER_NAMES, OUTER_CELLS, OUTER_RIVERS, OUTER_LAKES, outerGround, outerProfile, outerFeatures, outerWaterAt } from '../src/outer-regions-world.js';
import { OUTER_WILDLIFE_ZONES } from '../src/outer-regions-wildlife.js';
import { REGION_IDS, regions, landDistance, insideRegion } from '../src/region-world.js';
import { PLAYABLE_REGIONS } from '../src/region-layout.js';
import { GAME_REGION_RENAMES, applyGameAtlasAdjustments } from '../src/game-atlas-adjustments.js';
import { regionBuildStatus } from '../src/build-status.js';
import { WOOD_SPECIES } from '../src/wood-species.js';
import { TREE_KINDS } from '../src/woodcutting.js';
import { SUBREGIONS } from '../src/map-fog.js';
import { isClimbTerrain } from '../src/climbing.js';

test('all requested regions retain atlas footprints, append stable IDs and have usable arrivals',()=>{
  assert.equal(OUTER_NAMES.length,34);assert.equal(OUTER_CELLS.length,1052);assert.equal(REGION_IDS['East Endevor'],79);
  for(const [i,n] of OUTER_NAMES.entries()){
    const p=outerProfile(n),r=regions.find(r=>r.name===n);assert.equal(r.id,80+i);assert.deepEqual(r.spawn,{x:p.anchor.x,z:p.anchor.z});
    assert.equal(regionBuildStatus(n).state,'environment');assert.ok(isClimbTerrain({regionAt:()=>r},0,0));
    for(const v of p.points){assert.ok(p.owns(v.x,v.z),n);assert.equal(outerWaterAt(v.x,v.z),null,n);assert.ok(outerFeatures(v.x,v.z).grade<.7,n);}
    for(const s of p.trees){assert.ok(WOOD_SPECIES[s],s);assert.ok(TREE_KINDS[WOOD_SPECIES[s].woodKind],s+' harvest');}
  }
});
test('terrain is finite, varied, coastal and bounded to the new regions',()=>{
  assert.equal(outerGround(0,0,19.25),19.25);
  for(const p of OUTER_PROFILES){const cs=OUTER_CELLS.filter(c=>c.region===p.name),hs=cs.map(c=>outerGround(c.x,c.z));assert.ok(hs.every(Number.isFinite),p.name);assert.ok(Math.max(...hs)-Math.min(...hs)>2,p.name);}
  for(const c of OUTER_CELLS.filter((c,i)=>i%9===0))for(const [dx,dz] of [[0,0],[21,18],[-24,12]]){const x=c.x+dx,z=c.z+dz,f=outerFeatures(x,z);if(f)assert.ok(Number.isFinite(f.height)&&Number.isFinite(f.grade),c.region);}
  for(const l of OUTER_LAKES)assert.ok(outerGround(l.centre.x,l.centre.z)<l.surface-2,l.id);
  assert.ok(OUTER_RIVERS.length>15);
});
test('every new country has persistent ground wildlife and only recognised typed forest',()=>{
  for(const name of OUTER_NAMES){const zones=OUTER_WILDLIFE_ZONES.filter(z=>z.region===name);assert.ok(zones.some(z=>z.air),name+' birds');assert.ok(zones.filter(z=>!z.air).length>=5,name+' ground animals');
    for(const z of zones.filter(z=>!z.air&&!z.sea))for(const [x,y] of z.sites){const f=outerFeatures(x,y);assert.equal(f.region,name);assert.equal(f.water,null);assert.ok(f.grade<.5,z.id);}
  }
  const g=outerProfile('Gorgiwood');assert.ok(g.cover>.9);assert.ok(g.cells.every(c=>c.terrain==='deep_forest'));assert.equal(g.kind,'dark');
});
test('game naming corrections are read-only, idempotent, and unbuilt jungles stay gray on the map',()=>{
  const original=JSON.parse(readFileSync(new URL('../../world-builder/map/resources/examples/azhora.wwmap',import.meta.url),'utf8').replace(/^\uFEFF/,''));
  const before=JSON.stringify(original),map=applyGameAtlasAdjustments(original);assert.equal(JSON.stringify(original),before);assert.deepEqual(applyGameAtlasAdjustments(map),map);
  const svg=readFileSync(new URL('../assets/azhora-world-map.svg',import.meta.url),'utf8'),atlas=JSON.parse(readFileSync(new URL('../assets/azhora-dev-regions.json',import.meta.url),'utf8'));
  for(const [old,n] of Object.entries(GAME_REGION_RENAMES)){assert.ok(atlas.regions.some(r=>r.name===n));assert.ok(!atlas.regions.some(r=>r.name===old));assert.ok(svg.includes(n));}
  for(const r of atlas.regions.filter(r=>!PLAYABLE_REGIONS.includes(r.name)))assert.ok(svg.includes(`data-unbuilt-region="${r.id}"`),r.id);
  for(const n of ['Anubrul','Haatrul','Maanub','Maawad']){assert.ok(!PLAYABLE_REGIONS.includes(n));assert.equal(regionBuildStatus(n).state,'unbuilt');}
});

test('new map locations are distinct, legible and located in their own regions',()=>{
  const locations=SUBREGIONS.filter(a=>OUTER_NAMES.includes(a.region));assert.equal(locations.length,102);
  for(const a of locations){assert.ok(insideRegion(a.region,a.x,a.z),a.id);assert.ok(a.note.length>30,a.id);
    for(const b of locations.filter(b=>b!==a))assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>Math.max(a.radius,b.radius)*.6,a.id+' / '+b.id);
  }
  const seals=OUTER_WILDLIFE_ZONES.filter(z=>z.species==='grey-seal');assert.ok(seals.length>=3);
  for(const z of OUTER_WILDLIFE_ZONES.filter(z=>z.sea))for(const [x,y] of z.sites)assert.ok(landDistance(x,y)<-20,z.id);
});
