import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import {assertRegisteredTrees} from './tree-identity-assertions.js';
import * as THREE from '../vendor/three.module.js';
import { groundWithRiver as ground } from '../src/world/terrain/world-terrain.js';
import { TRANSFORM, REGION_IDS, regionAt } from '../src/world/terrain/region-world.js';
import { ALEZHOR_TOWN as town, ALEZHOR_TOWN_CIRCUIT as circuit, ALEZHOR_TOWN_BUILDINGS as buildings,
  ALEZHOR_TOWN_BOATS as boats, ALEZHOR_TOWN_DECKS as decks, ALEZHOR_TOWN_LANES as lanes,
  alezhorTownDeckHeight } from '../src/content/regions/alezhor/alezhor-town-layout.js';
import { alezhorWaterAt, ALEZHOR_TRAILS } from '../src/content/regions/alezhor/alezhor-world.js';
import { canStand, moveCharacter } from '../src/gameplay/movement/locomotion.js';
import { createWalkSurfaces } from '../src/world/collision/walk-surfaces.js';
const { createAlezhorTownScenerySteps } = await sourceModule('../src/content/regions/alezhor/alezhor-town-scenery.js');
const { atlasPlaceMarks, atlasMarkKnown, atlasCityBoundaries } = await sourceModule('../src/ui/map/world-map-detail.js');
const root=new THREE.Group(),colliders=[];
const steps=createAlezhorTownScenerySteps({parent:root,heightAt:ground,colliders});
let next;do{next=steps.next();}while(!next.done);
const built=next.value;
const heightAt=(x,z)=>alezhorTownDeckHeight(x,z)??ground(x,z);
const world={bounds:{minX:-4200,maxX:-3800,minZ:800,maxZ:1100},heightAt,colliders};

test('Alezhor is a discoverable town at the marked estuary, with one dry enclosing wall',()=>{
  assert.equal(regionAt(town.x,town.z).id,REGION_IDS.Alezhor);
  for(const p of circuit.wallLine(1)){
    assert.ok(ground(p.x,p.z)>.45,'curtain remains on land');
    assert.equal(alezhorWaterAt(p.x,p.z),null,'no wall across the river');
  }
  for(const h of buildings)assert.equal(circuit.inside(h.x,h.z),h.kind!=='warehouse',h.id);
  const mark=atlasPlaceMarks([{...town,...TRANSFORM.worldToAtlas(town.x,town.z)}]).find(m=>m.id===town.id);
  assert.equal(mark.kind,'city');assert.equal(atlasMarkKnown(mark,new Set()),false);
  assert.equal(atlasMarkKnown(mark,new Set(),true),true);
  assert.equal(atlasCityBoundaries().filter(f=>f.id===town.id).length,1);
});

test('every gate and the west-to-ford street can be walked with actual building and wall collisions',()=>{
  for(const gate of circuit.gates){
    const {from,to}=circuit.passage(gate.id,4),walker={...from};
    assert.ok(canStand(from.x,from.z,world),gate.id+' approach');
    moveCharacter(walker,to.x-from.x,to.z-from.z,world);
    assert.ok(Math.hypot(walker.x-to.x,walker.z-to.z)<.05,gate.id+' is open');
  }
  for(let i=1;i<lanes[0].length;i++){
    const a=lanes[0][i-1],b=lanes[0][i],walker={...a};
    moveCharacter(walker,b.x-a.x,b.z-a.z,world);
    assert.ok(Math.hypot(walker.x-b.x,walker.z-b.z)<.05,'street segment '+i);
  }
  assert.equal(canStand(-4081,882,world),false,'houses are solid');
  const rim=ALEZHOR_TRAILS.find(t=>t.id==='alezhor-falls-rim');
  for(let i=1;i<rim.points.length;i++){
    const a=rim.points[i-1],b=rim.points[i],walker={...a};
    moveCharacter(walker,b.x-a.x,b.z-a.z,world);
    assert.ok(Math.hypot(walker.x-b.x,walker.z-b.z)<.05,'falls-rim trail segment '+i);
  }
});

test('working quays stay above the shore and all four hulls float clear of it',()=>{
  for(const d of decks)for(const u of [-.48,0,.48])for(let i=0;i<=16;i++){
    const x=d.x+d.w*u,z=d.z-d.d/2+d.d*i/16,y=d.y0+(d.y1-d.y0)*i/16;
    assert.ok(ground(x,z)<y+.08,d.id+' not buried');
  }
  for(const b of boats)for(const u of [-.4,0,.4])for(const v of [-.48,0,.48]){
    const x=b.x+Math.cos(b.yaw)*b.beam*u+Math.sin(b.yaw)*b.length*v;
    const z=b.z-Math.sin(b.yaw)*b.beam*u+Math.cos(b.yaw)*b.length*v;
    assert.ok(ground(x,z)<-.45,b.kind+' has water beneath the hull');
  }
});

test('the guildhall stairs meet the porch and the quay connects to land without a jump',()=>{
  const supports=createWalkSurfaces(built.walkSurfaces,ground);
  const ramp=built.walkSurfaces.find(s=>s.id==='alezhor-hall-stairs');
  assert.ok(Math.abs(ramp.a.y-ground(ramp.a.x,ramp.a.z))<.15);
  assert.ok(Math.abs(ramp.b.y-ramp.a.y)/Math.hypot(ramp.b.x-ramp.a.x,ramp.b.z-ramp.a.z)<.7);
  const porch=supports.supportAt(ramp.b.x,ramp.b.z,{surfaceId:'alezhor-hall-porch'});
  assert.equal(porch.height,ramp.b.y);
  for(let z=918;z<=937;z+=.2)assert.ok(canStand(-4040,z,world),'walk from sea gate to quay');
});

test('town geometry is finite and batched for regional streaming',()=>{
  assert.equal(assertRegisteredTrees(root,colliders).length,3);
  let meshes=0,vertices=0;
  root.traverse(o=>{if(o.isMesh){meshes++;vertices+=o.geometry.attributes.position.count;assert.ok(o.geometry.attributes.position.array.every(Number.isFinite),o.name);}});
  assert.ok(meshes<90,meshes+' meshes');assert.ok(vertices<350000,vertices+' vertices');
  assert.equal(built.metrics.buildings,29);assert.equal(built.metrics.boats,4);
});
