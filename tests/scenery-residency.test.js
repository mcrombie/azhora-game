import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { createSceneryResidency } from '../src/scenery-residency.js';
const finish = iterator => { while (!iterator.next().done) {} };
const boundsFor = () => ({minX:0,maxX:10,minZ:0,maxZ:10});

test('parking releases graphics resources and returning preserves object identity and changed instances', () => {
  const scene=new THREE.Scene(),root=new THREE.Group();scene.add(root);
  const geometry=new THREE.BoxGeometry(),mesh=new THREE.InstancedMesh(geometry,new THREE.MeshBasicMaterial(),1);root.add(mesh);
  mesh.setMatrixAt(0,new THREE.Matrix4().makeScale(0,0,0));
  const manager=createSceneryResidency({boundsFor,near:100,far:150});
  let geometries=0,instances=0;geometry.addEventListener('dispose',()=>geometries++);mesh.addEventListener('dispose',()=>instances++);
  finish(manager.register(root,[1]));manager.update({x:300,z:0});
  assert.equal(root.parent,null);assert.equal(geometries,1);assert.equal(instances,1);
  manager.update({x:300,z:0});assert.equal(geometries,1,'no repeated disposal');
  manager.update({x:120,z:0});assert.equal(root.parent,null,'hysteresis prevents boundary thrashing');
  manager.update({x:10,z:0});assert.equal(root.parent,scene);assert.equal(root.children[0],mesh);
  const matrix=new THREE.Matrix4();mesh.getMatrixAt(0,matrix);assert.equal(matrix.elements[0],0,'felled instance is still hidden');
});

test('shared geometry stays resident until all managed users are distant; pinned geometry is retained', () => {
  const scene=new THREE.Scene(),geometry=new THREE.BoxGeometry(),material=new THREE.MeshBasicMaterial();
  const manager=createSceneryResidency({boundsFor:id=>({minX:id*1000,maxX:id*1000+10,minZ:0,maxZ:10}),near:100,far:150});
  const a=new THREE.Group(),b=new THREE.Group();scene.add(a,b);a.add(new THREE.Mesh(geometry,material));b.add(new THREE.Mesh(geometry,material));
  let disposed=0;geometry.addEventListener('dispose',()=>disposed++);
  finish(manager.register(a,[0]));finish(manager.register(b,[1]));manager.update({x:0,z:0});assert.equal(disposed,0);
  manager.update({x:2000,z:0});assert.equal(disposed,1);
  manager.update({x:0,z:0});manager.pin(a);manager.update({x:2000,z:0});assert.equal(disposed,1);
});

test('completed far-away jobs are parked immediately without changing child visibility', () => {
  const scene=new THREE.Scene(),root=new THREE.Group(),child=new THREE.Group();scene.add(root);root.add(child);child.visible=false;
  const manager=createSceneryResidency({boundsFor,near:100,far:150});manager.update({x:300,z:0});finish(manager.register(root,[1]));
  assert.equal(root.parent,null);manager.update({x:0,z:0});assert.equal(child.visible,false);assert.equal(manager.state().restores,1);
});
