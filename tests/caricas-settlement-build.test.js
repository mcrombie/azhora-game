import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from '../vendor/three.module.js';
import {sourceModule} from './module-loader.js';
import {telemoniaGeometryHash} from './telemonia-geometry-hash.js';

const {createCaricasSettlement,createCaricasSettlementSteps}=await sourceModule('../src/content/regions/minora-frontier/caricas-settlement-scenery.js');
const {CARICAS_FURNISHINGS}=await sourceModule('../src/content/regions/minora-frontier/caricas-town-detail.js');
const {getTreeRegistry}=await sourceModule('../src/world/scenery/tree-registry.js');
const {findObservableTree}=await sourceModule('../src/app/exploration/tree-observation.js');
const {CARICAS_BUILDINGS,CARICAS_ROADS,CARICAS_TOWN,CARICAS_GUARD_POSTS,distanceToFrontierPath}=await sourceModule('../src/content/regions/minora-frontier/caricas-settlement.js');
const {LIZEEM_RESIDENTS}=await sourceModule('../src/content/regions/minora-frontier/lizeem-residents.js');
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

function fixture(){
  const parent=new THREE.Group(),colliders=[];
  let queries=0;
  return {parent,colliders,heightAt:()=>{queries++;return 13.25;},get queries(){return queries;}};
}
function assertTown(fixture,result){
  // Keep the original playable building footprint, height and map contract.
  assert.equal(hash(fixture.colliders.filter(c=>c.kind==='building')),'4bd3f0a3ab6b45427e40d69ccd93c023c31823fc55f72738d7a5386c9d9afac0');
  const meshes=[];fixture.parent.traverse(mesh=>{if(mesh.isMesh)meshes.push({name:mesh.name,
    vertices:mesh.geometry.attributes.position.count,castShadow:mesh.castShadow,receiveShadow:mesh.receiveShadow});});
  assert.equal(meshes.length,7,'Two static town batches, two species instance batches and three independently fading standards');
  const trees=getTreeRegistry(fixture.colliders).trees;
  assert.equal(trees.length,4,'Each court lime has an observable tree identity');
  assert.ok(trees.every(tree=>tree.species==='small-leaved-lime'&&tree.harvestable===false));
  assert.ok(meshes.reduce((sum,m)=>sum+m.vertices/3,0)<30000,'Town geometry stays below 30k triangles');
  assert.deepEqual(result.metrics,{buildings:8,roads:3,marketStalls:2,standards:3});
  assert.deepEqual(result.mapFeatures,CARICAS_BUILDINGS.map(b=>({...b,kind:'building'})));
  assert.equal(result.root,fixture.parent.children[0]);
  assert.equal(fixture.parent.children.length,1);
  assert.equal(result.root.name,'Caricas occupied market town');
}

test('Caricas keeps eight building footprints, four identifiable limes and bounded town batches',()=>{
  const world=fixture(),result=createCaricasSettlement(world);
  assertTown(world,result);
  assert.equal(world.colliders.filter(c=>c.kind==='prop').length,CARICAS_FURNISHINGS.length);
});

test('court planters do not block observation at eye level',()=>{
  const f=fixture();const scene=new THREE.Scene();scene.add(f.parent);createCaricasSettlement(f);
  const world={heightAt:()=>13.25,readyAt:()=>true,canExploreAt:()=>true,nearColliders:()=>f.colliders};
  const registry=getTreeRegistry(f.colliders);
  for(const tree of registry.trees){
    const target=findObservableTree(registry,world,{x:tree.x+2.5,y:13.25,z:tree.z});
    assert.equal(target?.id,tree.id,`${tree.id} can be observed over its low stone planter`);
  }
});

test('Caricas construction yields bounded road and court sampling without changing any retained output',t=>{
  const world=fixture(),steps=createCaricasSettlementSteps(world),slices=[];
  let next,maximumQueries=0,yields=0;
  do{
    const before=world.queries,begin=performance.now();next=steps.next();
    slices.push(performance.now()-begin);maximumQueries=Math.max(maximumQueries,world.queries-before);
    if(!next.done)yields++;
  }while(!next.done);
  assertTown(world,next.value);
  const synchronous=fixture();createCaricasSettlement(synchronous);
  assert.equal(telemoniaGeometryHash(world.parent),telemoniaGeometryHash(synchronous.parent));
  assert.deepEqual(world.colliders,synchronous.colliders);
  assert.ok(yields>=140,'individual roads and buildings must return control to the loader');
  assert.ok(maximumQueries<=128,`terrain sampling must be bounded between yields: ${maximumQueries}`);
  t.diagnostic(JSON.stringify({yields,maximumQueries,longestSliceMs:Math.max(...slices),
    totalMs:slices.reduce((sum,ms)=>sum+ms,0)}));
});

test('court furnishings leave roads, combat staging, guard posts and civilian shelter routes open',()=>{
  for(const p of CARICAS_FURNISHINGS){
    assert.ok(Math.hypot(p.x-CARICAS_TOWN.arrival.x,p.z-CARICAS_TOWN.arrival.z)>24+p.r,p.id+' outside combat staging');
    for(const road of CARICAS_ROADS)assert.ok(distanceToFrontierPath(road.points,p.x,p.z)>road.width/2+p.r+.75,p.id+' road clearance');
    for(const g of CARICAS_GUARD_POSTS)assert.ok(Math.hypot(p.x-g.x,p.z-g.z)>p.r+1.1,p.id+' guard clearance');
    for(const r of LIZEEM_RESIDENTS.filter(r=>r.region==='caricas')){
      assert.ok(Math.hypot(p.x-r.x,p.z-r.z)>p.r+1.4,p.id+' resident '+r.id);
      if(r.shelter)assert.ok(distanceToFrontierPath([{x:r.x,z:r.z},...r.shelter.map(([x,z])=>({x,z}))],p.x,p.z)>p.r+1.4,p.id+' shelter route '+r.id);
    }
    for(const b of CARICAS_BUILDINGS)assert.ok(Math.hypot(Math.max(0,Math.abs(p.x-b.x)-b.w/2),Math.max(0,Math.abs(p.z-b.z)-b.d/2))>p.r+.6,p.id+' building clearance');
  }
});

test('changing ownership recolors only the three standards, never facades, shutters or market canvas',()=>{
  const world=fixture(),result=createCaricasSettlement(world);
  const meshes=result.root.children.filter(m=>m.isMesh),originals=meshes.map(m=>m.geometry.attributes.color.array.slice());
  const positions=meshes.map(m=>m.geometry.attributes.position.array.slice());result.standards.setColor('#45adbe');
  let vertices=0;meshes.forEach((mesh,n)=>{const original=originals[n],changed=mesh.geometry.attributes.color.array;
    if(!mesh.userData.cameraStandard)assert.deepEqual(changed,original,'Town architecture retains its colors');
    for(let i=0;i<original.length;i+=3)if(original[i]!==changed[i]||original[i+1]!==changed[i+1]||original[i+2]!==changed[i+2])vertices++;
    assert.deepEqual(mesh.geometry.attributes.position.array,positions[n]);
  });
  assert.equal(vertices,36,'Only twelve vertices per double-sided banner change');
  result.standards.setColor();meshes.forEach((mesh,n)=>assert.deepEqual(mesh.geometry.attributes.color.array,originals[n]));
});

test('the lookout keeps thin Caricas facade layers exact instead of collapsing them into the walls',async()=>{
  const {snapshotLookoutScene}=await sourceModule('../src/dev/tools/lookout-scene-export.js');
  const {simplifyLookout}=await import('../scripts/optimize-lookout.mjs');
  const world=fixture();createCaricasSettlement(world);world.parent.updateMatrixWorld(true);
  const source=snapshotLookoutScene(world.parent),part=source.meshes.find(m=>m.name.endsWith('/ Caricas buildings and grain court'));
  assert.ok(part);const result=await simplifyLookout(source);
  assert.equal(result.geometries[part.geometry],source.geometries[part.geometry],'No simplification of layered architecture');
});
