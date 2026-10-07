import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {sourceModule} from './module-loader.js';
import {telemoniaGeometryHash} from './telemonia-geometry-hash.js';
const {createTelemoniaGroundSteps,createTelemoniaGroundPlanSteps}=await sourceModule('../src/content/regions/telemonia/telemonia-ground.js');
const finish=iterator=>{let s;do{s=iterator.next();}while(!s.done);return s.value;};
const kit=()=>({root:new THREE.Group(),material:(color,options)=>new THREE.MeshStandardMaterial({color,...options}),groundHeight:(x,z)=>20+Math.sin(x/21)*4+Math.cos(z/29)*6});

test('complete fine ground retains original positions, colours, indices and normals byte for byte',()=>{
  const k=kit(),ground=finish(createTelemoniaGroundSteps(k));
  assert.equal(telemoniaGeometryHash(k.root),'9838c6fadc946a1b3f20bb519a6021f15001bc203db8f527b660f771c17a2314');
  assert.deepEqual(ground.metrics,{batches:41,groundVertices:109356});
});

test('nearby tiles build independently and later reverse-order loading preserves geometry and sampled heights',()=>{
  const k=kit();let samples=0;const sample=k.groundHeight;k.groundHeight=(x,z)=>{samples++;return sample(x,z);};
  const plan=finish(createTelemoniaGroundPlanSteps(k));assert.equal(samples,0,'Planning must not build distant terrain heights');
  const nearby=plan.tiles.filter(t=>t.regions.includes(25)||t.regions.includes(26));
  assert(nearby.length>0&&nearby.length<plan.tiles.length/2);
  const probes=[];
  for(const t of nearby){
    finish(t.buildSteps(k.root));
    const p=k.root.children.at(-1).geometry.attributes.position;
    for(let i=0;i<p.count;i+=63){const x=p.getX(i),z=p.getZ(i),y=plan.surface.fineGroundHeight(x,z);if(y!==null)probes.push({x,z,y});}
  }
  const partialSamples=samples;
  for(const t of plan.tiles.filter(t=>!nearby.includes(t)).reverse())finish(t.buildSteps(k.root));
  assert(partialSamples<samples/2,'Ovesos avoids constructing the Telemonia interior');
  for(const p of probes)assert.equal(plan.surface.fineGroundHeight(p.x,p.z),p.y,'Later regions cannot change previously sampled ground');
  const meshes=new Map(k.root.children.map(m=>[m.userData.telemoniaTile,m]));
  for(const t of plan.tiles)k.root.add(meshes.get(t.id)); // Canonical order for the legacy byte hash.
  assert.equal(telemoniaGeometryHash(k.root),'9838c6fadc946a1b3f20bb519a6021f15001bc203db8f527b660f771c17a2314');
});
