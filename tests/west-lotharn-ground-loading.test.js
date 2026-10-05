import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { scopedWorld } from './scoped-world.js';

const scene=new THREE.Scene(),world=await scopedWorld(scene,[28]);
scene.updateMatrixWorld(true);
const initialJobs=world.loading.state().jobs;
const isSharedFine=mesh=>mesh.name==='West Lotharn summits ground'
  ||(mesh.parent===world.westLotharnGround.group&&mesh.name.startsWith('Ground at the mouth of '))||mesh.userData.westLotharnRiverGround;
const fine=[];scene.traverse(mesh=>{if(isSharedFine(mesh))fine.push(mesh);});
const terrain=scene.getObjectByName('The ground of Azhora');
const surfaces=[...terrain.children.filter(mesh=>mesh.isMesh),...fine];
for(const mesh of surfaces)if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
const ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0));
function drawn(x,z){ray.ray.origin.set(x,2000,z);return ray.intersectObjects(surfaces.filter(mesh=>{const b=mesh.geometry.boundingBox;return x>=b.min.x&&x<=b.max.x&&z>=b.min.z&&z<=b.max.z;}),false)[0]?.point.y??null;}
const sites=[[-2032.36328125,-973.0420532226562],[-2036.640,-980.477]];
const beforeHeights=sites.map(([x,z])=>world.renderedGroundHeight(x,z));
const mithalaTrees=world.treeRegistry.trees.filter(t=>t.id.startsWith('mithala-'));
const mithala=scene.getObjectByName('Mithala scenery');
const instances=[];mithala.traverse(mesh=>{if(mesh.isInstancedMesh)instances.push({mesh,matrix:mesh.instanceMatrix.array.slice(),colors:mesh.instanceColor?.array.slice()});});

test('South Mithala loads shared retained summit support before West Lotharn scenery',()=>{
  assert.equal(initialJobs.find(job=>job.id==='westLotharnGround').status,'ready');
  assert.equal(initialJobs.find(job=>job.id==='westLotharn').status,'pending');
  assert.equal(world.loading.isReady(27),false);
  assert.ok(fine.length>20);assert.ok(mithalaTrees.length>100);
  for(const [x,z]of sites){const actual=drawn(x,z);assert.ok(Number.isFinite(actual));assert.ok(Math.abs(world.renderedGroundHeight(x,z)-actual)<.002);assert.ok(Math.abs(world.westLotharnGround.fineGroundHeight(x,z)-actual)<.002);}
});

test('loading West Lotharn later reuses terrain and preserves every existing Mithala instance',async t=>{
  const priorFrame=globalThis.requestAnimationFrame,priorCancel=globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame=fn=>setTimeout(()=>fn(performance.now()),0);globalThis.cancelAnimationFrame=clearTimeout;
  try{await world.loading.ensureRegion(27);}finally{world.loading.stop();if(priorFrame===undefined)delete globalThis.requestAnimationFrame;else globalThis.requestAnimationFrame=priorFrame;if(priorCancel===undefined)delete globalThis.cancelAnimationFrame;else globalThis.cancelAnimationFrame=priorCancel;}
  const after=[],otherMouths=[];scene.traverse(mesh=>{if(isSharedFine(mesh))after.push(mesh);else if(mesh.name.startsWith('Ground at the mouth of '))otherMouths.push(mesh.name);});
  t.diagnostic(JSON.stringify({before:fine.length,after:after.length,otherMouths,instances:instances.length,trees:mithalaTrees.length}));
  assert.equal(after.length,fine.length);for(let i=0;i<fine.length;i++)assert.equal(after[i],fine[i]);
  assert.deepEqual(sites.map(([x,z])=>world.renderedGroundHeight(x,z)),beforeHeights);
  for(const{mesh,matrix,colors}of instances){assert.deepEqual(mesh.instanceMatrix.array,matrix);assert.deepEqual(mesh.instanceColor?.array,colors);}
  assert.equal(world.loading.isReady(27),true);
});
