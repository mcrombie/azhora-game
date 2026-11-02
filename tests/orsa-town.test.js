import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
import * as THREE from '../vendor/three.module.js';
import {ORSA_TOWN,ORSA_DECKS,ORSA_MOUTH,ORSA_FINE} from '../src/content/regions/orsa/orsa-town-layout.js';
import {ORSA_BUILDINGS,ORSA_BOATS,orsaBuildingCorners} from '../src/content/regions/orsa/orsa-town-buildings.js';
import {outerGround,outerCellAt,outerWaterAt,OUTER_LANDMARKS} from '../src/content/regions/outer-regions/outer-regions-world.js';
import {regionBase,groundWithRiver} from '../src/world/terrain/world-terrain.js';
import {landDistance,TRANSFORM} from '../src/world/terrain/region-world.js';
const {createOrsaTownScenery}=await sourceModule('../src/content/regions/orsa/orsa-town-scenery.js');
const {atlasPlaceMarks,atlasMarkKnown}=await sourceModule('../src/ui/map/world-map-detail.js');
const heightAt=(x,z)=>outerGround(x,z,regionBase(x,z));

test('Orsa occupies both dry banks at the marked mouth, with a discoverable town marker',()=>{
  assert.equal(outerCellAt(ORSA_TOWN.x,ORSA_TOWN.z).region,'North Orsa');
  assert.ok(OUTER_LANDMARKS.some(m=>m.id==='orsa-town'));
  const [mark]=atlasPlaceMarks([{...ORSA_TOWN,...TRANSFORM.worldToAtlas(ORSA_TOWN.x,ORSA_TOWN.z)}]);
  assert.equal(mark.kind,'city');assert.equal(atlasMarkKnown(mark,new Set()),false);assert.equal(atlasMarkKnown(mark,new Set(),true),true);
  for(const sign of [-1,1])assert.ok(ORSA_BUILDINGS.filter(b=>(b.z-ORSA_MOUTH.z)*sign>0).length>=6);
  for(const b of ORSA_BUILDINGS)for(const p of orsaBuildingCorners(b)){
    assert.ok(landDistance(p.x,p.z)>5,b.id);assert.equal(outerWaterAt(p.x,p.z),null,b.id);
    assert.ok(Math.abs(heightAt(p.x,p.z)-groundWithRiver(p.x,p.z))<.001,b.id);
  }
  for(const b of ORSA_BOATS)for(const p of orsaBuildingCorners({...b,w:b.length*.32,d:b.length*1.1}))assert.ok(landDistance(p.x,p.z)<-2,b.id+' afloat');
});
test('bridge and boardwalks are above the ground and meet their landward banks',()=>{
  for(const d of ORSA_DECKS){
    for(let i=0;i<=40;i++){
      const t=i/40,x=d.a.x+(d.b.x-d.a.x)*t,z=d.a.z+(d.b.z-d.a.z)*t,y=d.y0+(d.y1-d.y0)*t;
      assert.ok(heightAt(x,z)<=y+.08,d.id+' exposed deck '+t);
    }
    if(d.id==='bridge')for(const [p,y] of [[d.a,d.y0],[d.b,d.y1]])assert.ok(Math.abs(heightAt(p.x,p.z)-y)<.08,'bridge landing');
    if(d.id.endsWith('ramp'))assert.ok(Math.abs(heightAt(d.b.x,d.b.z)-d.y1)<.08,'ramp landing');
  }
});
test('town grading rejoins the surrounding terrain without a vertical seam',()=>{
  const b=ORSA_FINE;
  for(let u=1;u<Math.max(b.w,b.d);u+=3){
    if(u<b.w)for(const z of [b.z,b.z+b.d])assert.ok(Math.abs(heightAt(b.x+u,z-.05)-heightAt(b.x+u,z+.05))<.3,'north/south edge');
    if(u<b.d)for(const x of [b.x,b.x+b.w])assert.ok(Math.abs(heightAt(x-.05,b.z+u)-heightAt(x+.05,b.z+u))<.3,'east/west edge');
  }
});
test('Orsa has a stave hall, varied timber buildings and four boats in bounded scenery batches',()=>{
  const parent=new THREE.Group(),colliders=[],result=createOrsaTownScenery({parent,heightAt,colliders});
  assert.ok(result.metrics.buildings>=20);assert.equal(result.metrics.boats,4);
  assert.ok(ORSA_BUILDINGS.some(b=>b.kind==='stave'));assert.ok(ORSA_BUILDINGS.some(b=>b.kind==='store'));assert.ok(ORSA_BUILDINGS.some(b=>b.kind==='log'));
  let meshes=0,vertices=0;
  parent.traverse(m=>{if(m.isMesh){meshes++;vertices+=m.geometry.attributes.position.count;assert.ok(m.geometry.attributes.position.array.every(Number.isFinite));}});
  assert.ok(meshes<20,meshes+' meshes');assert.ok(vertices<450000,vertices+' vertices');
});
