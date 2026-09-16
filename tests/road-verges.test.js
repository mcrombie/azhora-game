import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule as load} from './module-loader.js';
import * as THREE from '../vendor/three.module.js';
import {canStand} from '../src/game-state.js';

const {createRoadVerges}=await load('../src/road-verges.js');

test('botanical patches are deterministic, small, collision-free and clear of road interactions',()=>{
  const world={heightAt:()=>2,bounds:{minX:-94,maxX:94,minZ:-680,maxZ:48},
    colliders:[{x:13,z:-220,r:3},{x:-12,z:-568,hx:4,hz:5}],
    routeJourney:[{x:0,z:-162},{x:0,z:-680}],journeySites:{parcel:{x:8,z:-230}},
    npcPositions:{keeper:{x:-9,z:-352}},repairBenches:[{x:6,z:-528}],firePits:[{x:-8,z:-195}],
    fishingSpots:[{fishingSpot:{x:14,z:-393}}]};
  const before=JSON.stringify(world.colliders),scene=new THREE.Scene(),a=createRoadVerges(scene,world).state();
  const b=createRoadVerges(new THREE.Scene(),world).state();assert.deepEqual(a,b);
  assert.equal(scene.children.length,3);assert.ok(a.triangles<=20000);
  assert.deepEqual(a.batches.map(b=>b.count),[156,144,150]);
  const points=[...Object.values(world.journeySites),...Object.values(world.npcPositions),...world.repairBenches,...world.firePits,world.fishingSpots[0].fishingSpot];
  for(const plant of a.plants){
    assert.ok(plant.z< -170);assert.ok(Math.abs(plant.x)>=4);assert.ok(canStand(plant.x,plant.z,world,.7));
    assert.ok(points.every(p=>Math.hypot(plant.x-p.x,plant.z-p.z)>=4.8));
  }
  assert.equal(JSON.stringify(world.colliders),before,'scenery must never add gameplay collision');
  const matrix=new THREE.Matrix4();
  for(const mesh of scene.children){assert.ok(mesh.isInstancedMesh);for(let i=0;i<mesh.count;i++){
    mesh.getMatrixAt(i,matrix);assert.ok(matrix.elements.every(Number.isFinite));assert.ok(matrix.determinant()>0);
  }}
});

test('all actual-world verge patches avoid water, solid terrain and interaction standing areas',async()=>{
  const {createWorld}=await load('../src/world.js');const scene=new THREE.Scene(),world=createWorld(scene);
  const count=world.colliders.length,verges=createRoadVerges(scene,world).state();
  assert.ok(verges.batches.every(batch=>batch.count>100));assert.ok(verges.triangles<=20000);
  const points=[...Object.values(world.journeySites),...Object.values(world.npcPositions),...world.repairBenches,...world.firePits,...world.fishingSpots.map(s=>s.fishingSpot)];
  for(const plant of verges.plants){assert.ok(canStand(plant.x,plant.z,world,.7));assert.ok(points.every(p=>Math.hypot(p.x-plant.x,p.z-plant.z)>=4.8));}
  assert.equal(world.colliders.length,count);
});
