import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import { NYLON, NYLON_BUILDINGS, NYLON_PATHS, NYLON_GATES, NYLON_HARBOR, NYLON_HARBOR_DECKS, NYLON_HARBOR_BOATS, nylonHarborDeckHeight, nylonRiverClearance } from '../src/content/regions/nylon/nylon-city.js';
import { LIZEEM_REACH, courseHalfAt, coursePosition } from '../src/content/regions/western-regions/west-regions.js';
import { groundWithRiver } from '../src/world/terrain/world-terrain.js';

const THREE=await sourceModule('../vendor/three.module.js');
const {createNylonScenery}=await sourceModule('../src/content/regions/nylon/nylon-scenery.js');
const parent=new THREE.Group(),colliders=[];
const heightAt=(x,z)=>nylonHarborDeckHeight(x,z)??groundWithRiver(x,z);
const city=createNylonScenery({parent,colliders,heightAt,groundHeight:groundWithRiver});
const blocked=(x,z,feet=heightAt(x,z),radius=.55)=>colliders.find(c=>c.minY<=feet+1.8&&c.maxY>=feet&&(c.r!==undefined
  ?Math.hypot(x-c.x,z-c.z)<c.r+radius:Math.abs(x-c.x)<c.hx+radius&&Math.abs(z-c.z)<c.hz+radius));

test('Nylon uses merged, bounded scenery batches for its densely detailed vertical skyline',()=>{
  assert.equal(city.metrics.buildings,NYLON_BUILDINGS.length);
  assert.equal(city.metrics.gates,NYLON_GATES.length);
  assert.ok(city.metrics.vertices<500000,`${city.metrics.vertices} vertices`);
  assert.ok(city.metrics.batches<65,`${city.metrics.batches} batches`);
  for(const mesh of city.root.children){
    assert.ok(mesh.isMesh,mesh.name);
    assert.ok(Number.isFinite(mesh.geometry.boundingSphere.radius)&&mesh.geometry.boundingSphere.radius>0,mesh.name);
  }
});

test('The working estuary has supported piers, floating boats and a navigable sea entrance',()=>{
  assert.equal(city.metrics.piers,3);assert.equal(city.metrics.boats,NYLON_HARBOR_BOATS.length);
  for(const d of NYLON_HARBOR_DECKS){
    const mesh=city.root.children.find(m=>m.name===`Nylon — ${d.name}`);assert.ok(mesh,d.id);
    const normal=mesh.geometry.attributes.normal;assert.ok(normal.getY(0)>.99,`${d.id} deck top faces downward`);
  }
  for(let z=1268;z<1335;z++)assert.equal(blocked(NYLON_HARBOR.entrance.x,z,NYLON_HARBOR.waterHeight,3.5),undefined,`Ship entrance blocked at ${z}`);
  for(const p of LIZEEM_REACH.samples)for(const fraction of [-.9,0,.9]){
    const half=courseHalfAt(LIZEEM_REACH,coursePosition(LIZEEM_REACH,p.x,p.z));
    const x=p.x+p.nx*half*fraction,z=p.z+p.nz*half*fraction;
    assert.equal(blocked(x,z,NYLON_HARBOR.waterHeight,1),undefined,`Original river channel blocked at ${x},${z}`);
  }
});

test('Nylon has real open gates and walkable approaches to the library, council tower and quay',()=>{
  for(const p of [NYLON.arrival,...NYLON_GATES])assert.equal(blocked(p.x,p.z),undefined,p.id??'arrival');
  for(const path of NYLON_PATHS)for(let i=1;i<path.points.length;i++){
    const a=path.points[i-1],b=path.points[i],len=Math.hypot(b.x-a.x,b.z-a.z);
    for(let k=0;k<=len;k+=.5){
      const x=a.x+(b.x-a.x)*k/len,z=a.z+(b.z-a.z)*k/len,c=blocked(x,z);
      assert.equal(c,undefined,`${path.id} at ${x},${z} blocked by ${c?.id??c?.kind}`);
    }
  }
});

test('The monumental library and council palace rise above the city curtain and have map footprints',()=>{
  for(const id of ['nylon-library','nylon-palace']){
    const home=NYLON_BUILDINGS.find(b=>b.id===id),mesh=city.root.children.find(m=>m.name===`Nylon — ${home.name}`);
    mesh.geometry.computeBoundingBox();
    assert.ok(mesh.geometry.boundingBox.max.y>NYLON.elevation+NYLON.wallHeight+8,`${id} hidden below walls`);
    const c=colliders.find(c=>c.id===id);
    assert.equal(c.kind,'house');assert.ok(c.width>=home.width&&c.depth>=home.depth);
    assert.ok(blocked(home.x,home.z),`${id} has no ground collision`);
  }
});

test('The northeast culverts preserve the small drainage channel beneath the walls and watch',()=>{
  assert.ok(city.metrics.culvertBays>=2);
  assert.ok(city.root.children.some(m=>m.name.includes('drainage culverts')));
  for(const p of [{x:-1269.86,z:1066},{x:-1262,z:1078}])assert.equal(blocked(p.x,p.z),undefined,`drainage blocked at ${p.x},${p.z}`);
  const feet=colliders.filter(c=>c.id?.startsWith('nylon-culvert-foot-'));
  assert.equal(feet.length,8);
  for(const foot of feet){
    assert.ok(foot.minY<=groundWithRiver(foot.x,foot.z)-.19,`${foot.id} floats above the bank`);
    assert.ok(nylonRiverClearance(foot.x,foot.z)>foot.r+.2,`${foot.id} intrudes into the stream`);
  }
});
