import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
import * as THREE from '../vendor/three.module.js';
import {assertRegisteredTrees} from './tree-identity-assertions.js';
import {COASTAL_VILLAGES} from '../src/content/regions/ascarth/coastal-villages.js';
const {createCoastalVillageSteps}=await sourceModule('../src/content/regions/ascarth/coastal-villages-scenery.js');

test('coastal village oaks retain their authored planter positions and collision while gaining real species handles',()=>{
  const parent=new THREE.Group(),colliders=[],steps=createCoastalVillageSteps({parent,heightAt:()=>12,colliders});let next;
  do{next=steps.next();}while(!next.done);
  const trees=assertRegisteredTrees(parent,colliders);assert.equal(trees.length,COASTAL_VILLAGES.length*2);
  for(const village of COASTAL_VILLAGES)for(const [dx,dz] of [[-28,-5],[27,5]]){
    const c=trees.find(t=>t.id===`coast-${village.id}-tree-${dx}`);assert(c);assert.equal(c.species,'holm-oak');
    assert.equal(c.x,village.x+dx);assert.equal(c.z,village.z+dz);assert.equal(c.r,1.7);assert.equal(c.minY,12);assert.equal(c.maxY,19);
  }
  assert.equal(next.value.update,undefined);assert(next.value.metrics.batches<15);
  parent.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
});
