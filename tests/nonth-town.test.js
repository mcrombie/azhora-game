import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {sourceModule} from './module-loader.js';
import {NONTH_TOWN,NONTH_DECKS,NONTH_FINE,NONTH_CENTRE} from '../src/content/regions/nonth/nonth-town-layout.js';
import {NONTH_BUILDINGS,NONTH_BOATS,nonthBuildingCorners} from '../src/content/regions/nonth/nonth-town-buildings.js';
import {outerCellAt,outerGround,outerWaterAt,OUTER_LANDMARKS} from '../src/content/regions/outer-regions/outer-regions-world.js';
import {regionBase,groundWithRiver} from '../src/world/terrain/world-terrain.js';
import {TRANSFORM} from '../src/world/terrain/region-world.js';
const {createNonthTownScenery}=await sourceModule('../src/content/regions/nonth/nonth-town-scenery.js');
const {atlasPlaceMarks,atlasMarkKnown}=await sourceModule('../src/ui/map/world-map-detail.js');
const heightAt=(x,z)=>outerGround(x,z,regionBase(x,z));

test('Nonth is a discoverable west-bank town inside North Nonoth, with dry lots and river craft',()=>{
  assert.equal(outerCellAt(NONTH_TOWN.x,NONTH_TOWN.z).region,'North Nonoth');assert.ok(OUTER_LANDMARKS.some(m=>m.id===NONTH_TOWN.id));
  const [m]=atlasPlaceMarks([{...NONTH_TOWN,...TRANSFORM.worldToAtlas(NONTH_TOWN.x,NONTH_TOWN.z)}]);
  assert.equal(m.kind,'city');assert.equal(atlasMarkKnown(m,new Set()),false);assert.equal(atlasMarkKnown(m,new Set(),true),true);
  assert.ok(NONTH_BUILDINGS.length>=18);
  for(const s of NONTH_BUILDINGS)for(const p of nonthBuildingCorners(s,s.kind==='keep'?2:1)){
    assert.ok(p.x<NONTH_CENTRE.x+40,'all buildings west of the channel');
    assert.equal(outerCellAt(p.x,p.z)?.region,'North Nonoth',s.id);assert.equal(outerWaterAt(p.x,p.z),null,s.id);
    assert.ok(Math.abs(heightAt(p.x,p.z)-groundWithRiver(p.x,p.z))<.001,s.id);
  }
  for(const boat of NONTH_BOATS)for(const p of nonthBuildingCorners(boat))assert.notEqual(outerWaterAt(p.x,p.z),null,boat.id+' hull inside the channel');
});

test('Nonth quay is unburied, its ramp meets the bank and town grading has no perimeter step',()=>{
  for(const d of NONTH_DECKS){
    for(let i=0;i<=40;i++){const t=i/40,x=d.a.x+(d.b.x-d.a.x)*t,z=d.a.z+(d.b.z-d.a.z)*t,y=d.y0+(d.y1-d.y0)*t;assert.ok(heightAt(x,z)<y+.08,d.id+' unburied at '+t);}
    if(d.id==='quay-ramp')assert.ok(Math.abs(heightAt(d.a.x,d.a.z)-d.y0)<.1,'ramp bank');
  }
  const b=NONTH_FINE;
  for(let i=1;i<Math.max(b.w,b.d);i+=3){
    if(i<b.w)for(const z of [b.z,b.z+b.d])assert.ok(Math.abs(heightAt(b.x+i,z-.05)-heightAt(b.x+i,z+.05))<.3,'north/south seam');
    if(i<b.d)for(const x of [b.x,b.x+b.w])assert.ok(Math.abs(heightAt(x-.05,b.z+i)-heightAt(x+.05,b.z+i))<.3,'east/west seam');
  }
});

test('Nonth batches its French-style town, market and small river craft into finite geometry',()=>{
  const scene=new THREE.Group(),colliders=[],result=createNonthTownScenery({parent:scene,heightAt,colliders});
  assert.equal(result.metrics.buildings,NONTH_BUILDINGS.length);assert.equal(result.metrics.boats,2);assert.equal(result.metrics.marketHalls,1);assert.equal(result.metrics.quays,1);
  assert.ok(NONTH_BUILDINGS.some(b=>b.kind==='keep'));assert.ok(NONTH_BUILDINGS.some(b=>b.kind==='timber'));
  let meshes=0,vertices=0;scene.traverse(o=>{if(o.isMesh){meshes++;vertices+=o.geometry.attributes.position.count;assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));}});
  assert.ok(meshes<24,meshes+' meshes');assert.ok(vertices<500000,vertices+' vertices');
});
