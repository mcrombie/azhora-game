import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
import {assertRegisteredTrees} from './tree-identity-assertions.js';
import * as THREE from '../vendor/three.module.js';
const layout=await sourceModule('../src/content/regions/endevor/endevor-layout.js');
const country=await sourceModule('../src/content/regions/endevor/endevor-country.js');
const river=await sourceModule('../src/content/regions/endevor/endevor-river.js');
const acor=await sourceModule('../src/content/regions/acor/acor-world.js');
const {groundWithRiver,regionBase}=await sourceModule('../src/world/terrain/world-terrain.js');
const {landDistance,TRANSFORM}=await sourceModule('../src/world/terrain/region-world.js');
const {createEndevorScenery}=await sourceModule('../src/content/regions/endevor/endevor-scenery.js');
const {atlasPlaceMarks,atlasMarkKnown}=await sourceModule('../src/ui/map/world-map-detail.js');
const heightAt=(x,z)=>acor.acorGround(x,z,regionBase(x,z));

test('Endevor occupies the marked mouth and has an ordinary discoverable atlas marker',()=>{
  const p=layout.ENDEVOR_TOWN;assert.equal(acor.acorCellAt(p.x,p.z).region,'North Endevor');
  assert.ok(Math.hypot(p.x-river.ENDEVOR_MOUTH.x,p.z-river.ENDEVOR_MOUTH.z)<80);
  assert.ok(acor.ACOR_LANDMARKS.some(m=>m.id===p.id));
  const [mark]=atlasPlaceMarks([{...p,...TRANSFORM.worldToAtlas(p.x,p.z)}]);
  assert.equal(mark.kind,'city');assert.equal(atlasMarkKnown(mark,new Set()),false);assert.equal(atlasMarkKnown(mark,new Set(),true),true);
  for(const b of country.ENDEVOR_BUILDINGS){assert.equal(acor.acorWaterAt(b.x,b.z),null,b.id);assert.ok(Math.abs(heightAt(b.x,b.z)-groundWithRiver(b.x,b.z))<.001,'review matches production');}
});
test('mapped river branches meet, flow downhill to sea and have a submerged outlet',()=>{
  const ends=new Map();
  for(const c of river.ENDEVOR_RIVERS){
    let y=-Infinity;
    for(const p of c.points){assert.ok(p.surface>=y);y=p.surface;assert.ok(groundWithRiver(p.x,p.z)<p.surface-.6,'submerged '+JSON.stringify(p));}
    for(const p of [c.points[0],c.points.at(-1)]){const k=`${p.x.toFixed(2)},${p.z.toFixed(2)}`;if(ends.has(k))assert.ok(Math.abs(ends.get(k)-p.surface)<.001);ends.set(k,p.surface);}
  }
  for(let z=-3320;z<=-3270;z+=1){assert.ok(groundWithRiver(-2150,z)<acor.acorWaterAt(-2150,z)-.4,'no blocking sandbar at '+z);}
});
test('surrounding holdings are dry and restricted to the port hinterland, never East Endevor',()=>{
  assert.ok(country.ENDEVOR_FIELDS.length>=20);
  for(const f of country.ENDEVOR_FIELDS){
    assert.ok(['West Endevor','North Endevor'].includes(f.region));
    for(let i=0;i<=5;i++)for(let j=0;j<=5;j++){
      const x=f.x-f.w/2+f.w*i/5,z=f.z-f.d/2+f.d*j/5;
      assert.equal(acor.acorWaterAt(x,z),null,f.id);assert.ok(landDistance(x,z)>10);assert.ok(!layout.endevorSettlementReserved(x,z));
    }
  }
  assert.ok(!country.ENDEVOR_BUILDINGS.some(p=>acor.acorCellAt(p.x,p.z)?.region==='East Endevor'));
});
test('bridge ends meet the banks and quays slope continuously down to the landing stages',()=>{
  const b=layout.ENDEVOR_BRIDGE;
  for(const side of [-1,1])assert.ok(Math.abs(heightAt(b.x+side*(b.length/2+.15),b.z)-b.y)<.3);
  for(let x=b.x-b.length/2;x<=b.x+b.length/2;x+=.5){assert.equal(layout.endevorDeckHeight(x,b.z),b.y);assert.ok(b.y>(acor.acorWaterAt(x,b.z)??0)+1);}
  for(const q of layout.ENDEVOR_QUAYS)for(let z=q.z-q.d/2;z<q.z+q.d/2-.5;z+=.5){
    assert.ok(Math.abs(layout.endevorQuayHeight(q,z+.5)-layout.endevorQuayHeight(q,z))<.08);
  }
});
test('actual town geometry stays batched, finite and bounded',()=>{
  const parent=new THREE.Group(),colliders=[],result=createEndevorScenery({parent,heightAt,colliders});
  assert.equal(assertRegisteredTrees(parent,colliders).length,result.metrics.trees);
  assert.ok(result.metrics.buildings>=25);assert.equal(result.metrics.boats,4);assert.equal(result.metrics.bridges,1);
  let meshes=0,vertices=0;parent.traverse(m=>{if(m.isMesh){meshes++;vertices+=m.geometry.attributes.position.count;assert.ok(m.geometry.attributes.position.array.every(Number.isFinite));}});
  assert.ok(meshes<20);assert.ok(vertices<450000);assert.ok(colliders.length>=country.ENDEVOR_BUILDINGS.length);
});
