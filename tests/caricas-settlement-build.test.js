import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from '../vendor/three.module.js';
import {sourceModule} from './module-loader.js';
import {telemoniaGeometryHash} from './telemonia-geometry-hash.js';

const {createCaricasSettlement,createCaricasSettlementSteps}=await sourceModule('../src/content/regions/minora-frontier/caricas-settlement-scenery.js');
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

function fixture(){
  const parent=new THREE.Group(),colliders=[];
  let queries=0;
  return {parent,colliders,heightAt:()=>{queries++;return 13.25;},get queries(){return queries;}};
}
function assertOriginal(fixture,result){
  // Captured from the synchronous builder before adding any construction steps.
  assert.equal(telemoniaGeometryHash(fixture.parent),'da1c63683bf7bd2bf61c3009a68203effcd0c3247505d99dcc4e56dbb016644f');
  assert.equal(hash(fixture.colliders),'4bd3f0a3ab6b45427e40d69ccd93c023c31823fc55f72738d7a5386c9d9afac0');
  const meshes=[];fixture.parent.traverse(mesh=>{if(mesh.isMesh)meshes.push({name:mesh.name,
    vertices:mesh.geometry.attributes.position.count,castShadow:mesh.castShadow,receiveShadow:mesh.receiveShadow});});
  assert.equal(hash({metrics:result.metrics,mapFeatures:result.mapFeatures,meshes}),'d7c5c116ab6c64598868241f65357840d4dc4b78d3fa9fe221eb719bb7fa5841');
  assert.equal(fixture.queries,10295);
  assert.equal(result.root,fixture.parent.children[0]);
  assert.equal(fixture.parent.children.length,1);
  assert.equal(result.root.name,'Caricas occupied market town');
}

test('the synchronous Caricas builder keeps its original geometry, eight building colliders and map records',()=>{
  const world=fixture(),result=createCaricasSettlement(world);
  assertOriginal(world,result);
});

test('Caricas construction yields bounded road and court sampling without changing any retained output',t=>{
  const world=fixture(),steps=createCaricasSettlementSteps(world),slices=[];
  let next,maximumQueries=0,yields=0;
  do{
    const before=world.queries,begin=performance.now();next=steps.next();
    slices.push(performance.now()-begin);maximumQueries=Math.max(maximumQueries,world.queries-before);
    if(!next.done)yields++;
  }while(!next.done);
  assertOriginal(world,next.value);
  assert.ok(yields>=140,'individual roads and buildings must return control to the loader');
  assert.ok(maximumQueries<=128,`terrain sampling must be bounded between yields: ${maximumQueries}`);
  t.diagnostic(JSON.stringify({yields,maximumQueries,longestSliceMs:Math.max(...slices),
    totalMs:slices.reduce((sum,ms)=>sum+ms,0)}));
});
