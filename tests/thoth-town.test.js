import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {sourceModule} from './module-loader.js';
import {THOTH_TOWN,THOTH_DECKS,THOTH_FINE,THOTH_CENTRE} from '../src/content/regions/thoth/thoth-town-layout.js';
import {THOTH_BUILDINGS,THOTH_BOATS,thothBuildingCorners} from '../src/content/regions/thoth/thoth-town-buildings.js';
import {outerCellAt,outerGround,outerWaterAt,OUTER_LANDMARKS} from '../src/content/regions/outer-regions/outer-regions-world.js';
import {regionBase,groundWithRiver} from '../src/world/terrain/world-terrain.js';
import {TRANSFORM} from '../src/world/terrain/region-world.js';
const {createThothTownScenery}=await sourceModule('../src/content/regions/thoth/thoth-town-scenery.js');
const {atlasPlaceMarks,atlasMarkKnown}=await sourceModule('../src/ui/map/world-map-detail.js');
const heightAt=(x,z)=>outerGround(x,z,regionBase(x,z));
test('Thoth occupies the marked two-bank bend with a discoverable city marker and dry lots',()=>{
  assert.equal(outerCellAt(THOTH_TOWN.x,THOTH_TOWN.z).region,'North Thoth');assert.ok(OUTER_LANDMARKS.some(m=>m.id===THOTH_TOWN.id));
  const [m]=atlasPlaceMarks([{...THOTH_TOWN,...TRANSFORM.worldToAtlas(THOTH_TOWN.x,THOTH_TOWN.z)}]);
  assert.equal(m.kind,'city');assert.equal(atlasMarkKnown(m,new Set()),false);assert.equal(atlasMarkKnown(m,new Set(),true),true);
  for(const side of [-1,1])assert.ok(THOTH_BUILDINGS.filter(b=>(b.z-THOTH_CENTRE.z)*side>0).length>=10);
  for(const s of THOTH_BUILDINGS)for(const p of thothBuildingCorners(s)){
    assert.equal(outerWaterAt(p.x,p.z),null,s.id);assert.ok(Math.abs(heightAt(p.x,p.z)-groundWithRiver(p.x,p.z))<.001,s.id);
  }
  for(const boat of THOTH_BOATS)for(const p of thothBuildingCorners(boat))assert.notEqual(outerWaterAt(p.x,p.z),null,boat.id+' hull inside the channel');
});
test('Thoth bridge and landing meet their banks with exposed walk surfaces',()=>{
  for(const d of THOTH_DECKS){
    for(let i=0;i<=40;i++){const t=i/40,x=d.a.x+(d.b.x-d.a.x)*t,z=d.a.z+(d.b.z-d.a.z)*t,y=d.y0+(d.y1-d.y0)*t;assert.ok(heightAt(x,z)<y+.08,d.id+' unburied at '+t);}
    if(d.id==='bridge')for(const p of [d.a,d.b])assert.ok(Math.abs(heightAt(p.x,p.z)-d.y0)<.1,'bridge bank');
    if(d.id==='landing-ramp')assert.ok(Math.abs(heightAt(d.b.x,d.b.z)-d.y1)<.1,'landing bank');
  }
  const b=THOTH_FINE;
  for(let i=1;i<Math.max(b.w,b.d);i+=3){
    if(i<b.w)for(const z of [b.z,b.z+b.d])assert.ok(Math.abs(heightAt(b.x+i,z-.05)-heightAt(b.x+i,z+.05))<.3,'north/south seam');
    if(i<b.d)for(const x of [b.x,b.x+b.w])assert.ok(Math.abs(heightAt(x-.05,b.z+i)-heightAt(x+.05,b.z+i))<.3,'east/west seam');
  }
});
test('Thoth builds finite, batched scenery with its stone hall and inland river craft',()=>{
  const scene=new THREE.Group(),colliders=[],result=createThothTownScenery({parent:scene,heightAt,colliders});
  assert.ok(result.metrics.buildings>=30);assert.equal(result.metrics.boats,2);
  assert.ok(THOTH_BUILDINGS.some(b=>b.kind==='assembly-hall'));assert.ok(THOTH_BUILDINGS.some(b=>b.kind==='guildhouse'));
  let meshes=0,vertices=0;scene.traverse(o=>{if(o.isMesh){meshes++;vertices+=o.geometry.attributes.position.count;assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));}});
  assert.ok(meshes<24,meshes+' meshes');assert.ok(vertices<500000,vertices+' vertices');
});
