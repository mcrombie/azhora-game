import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { sourceModule } from './module-loader.js';
import * as THREE from '../vendor/three.module.js';
import { groundWithRiver } from '../src/world/terrain/world-terrain.js';
import { DRENT_PENINSULA_HEXES } from '../src/world/terrain/game-atlas-adjustments.js';
import { hexAt } from '../src/world/terrain/region-world.js';
const { createRegionScenery } = await sourceModule('../src/world/terrain/world-regions.js');
const { getTreeRegistry } = await sourceModule('../src/world/scenery/tree-registry.js');
import { finishBuild } from '../src/world/loading/build-steps.js';

// Exercise actual shared woodland geometry, timber registration and collision.
// Unrelated authored landmarks use tiny stand-ins to keep this regression focused.
function kit(){
 const root=new THREE.Group(),colliders=[],dummy=new THREE.Object3D(),color=new THREE.Color(),round=new THREE.IcosahedronGeometry(1,0),cylinder=new THREE.CylinderGeometry(1,1,1,7),cube=new THREE.BoxGeometry(1,1,1);
 const material=tint=>new THREE.MeshStandardMaterial({color:tint,flatShading:true});
 const mesh=(g,m,x=0,y=0,z=0,sx=1,sy=1,sz=1,parent=root)=>{const node=new THREE.Mesh(g,m);node.position.set(x,y,z);node.scale.set(sx,sy,sz);parent.add(node);return node;};
 const box=(m,x,y,z,sx,sy,sz,parent)=>mesh(cube,m,x,y,z,sx,sy,sz,parent);
 const post=(m,x,y,z,r,h,parent)=>mesh(cylinder,m,x,y,z,r,h,r,parent);
 const pebble=(m,x,y,z,sx,sy,sz,parent)=>mesh(round,m,x,y,z,sx,sy,sz,parent);
 const prop=(...args)=>{const node=new THREE.Group();(args.findLast(a=>a?.isObject3D)||root).add(node);node.userData.args=args.filter(a=>!a?.isObject3D);return node;};
 return {root,parent:root,colliders,dummy,color,round,cylinder,material,mesh,box,post,pebble,groundHeight:groundWithRiver,heightAt:groundWithRiver,roofGeometry:()=>cube,wood:material('#674f33'),woodLight:material('#998765'),darkWood:material('#332711'),cream:material('#ffffee'),rockMat:material('#666655'),riverMaterial:material('#115577'),movingGroups:new Set(),rope:prop,cottage:prop,fence:prop,barrel:prop,crate:prop,wornPatch:prop,trailSign:prop,sign:prop,drapeGround:()=>{},signs:new Proxy({},{get:()=>prop}),leanTo:prop,riverDistance:()=>100,roadDistance:()=>100,insideVillage:()=>false,regionClear:()=>false};
}
function snapshot(k,result){let hash=crypto.createHash('sha256');const mainHash=hash, nodes=[];let meshes=0;const add=v=>hash.update(JSON.stringify(v));
 k.root.updateMatrixWorld(true);add([...k.colliders].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));add(result.metrics||result.stats||{});
 k.root.traverse(n=>{hash=crypto.createHash('sha256');add([n.type,n.name,n.visible,n.matrixWorld.elements]);if(n.geometry){meshes++;for(const name of Object.keys(n.geometry.attributes).sort()){add(name);hash.update(Buffer.from(n.geometry.attributes[name].array.buffer));}if(n.geometry.index)hash.update(Buffer.from(n.geometry.index.array.buffer));}
 if(n.instanceMatrix)hash.update(Buffer.from(n.instanceMatrix.array.buffer));if(n.instanceColor)hash.update(Buffer.from(n.instanceColor.array.buffer));
 const mats=Array.isArray(n.material)?n.material:[n.material];for(const m of mats)if(m)add([m.type,m.color?.toArray(),m.opacity,m.side]);nodes.push(hash.digest('hex'));});hash=mainHash;hash.update(nodes.sort().join(''));
 return{hash:hash.digest('hex'),colliders:k.colliders.length,meshes};
}

test('Fast woodland defers remote geometry and preserves Full output under reverse region priority', () => {
  const full=kit(), fast=kit();
  const baseline=createRegionScenery(full);
  const result=createRegionScenery({...fast,fastInitialRegion:1});
  assert.ok(result.timberTrees.length>0);
  assert.ok(result.timberTrees.every(tree=>tree.region==='Drent'));
  for(const hex of DRENT_PENINSULA_HEXES){
    const prefix=`drent-peninsula-${hex.q}-${hex.r}-`;
    const grove=result.timberTrees.filter(tree=>tree.id.startsWith(prefix));
    assert.ok(grove.length>=12,`the ${hex.q},${hex.r} headland contains an actual forest`);
    for(const tree of grove){
      assert.deepEqual(hexAt(tree.x,tree.z),hex);
      assert.ok(['white-oak','loblolly-pine'].includes(tree.species));
      assert.equal(getTreeRegistry(fast.colliders).get(tree.id)?.harvestable,true);
    }
  }
  const peninsulaKeys=new Set(DRENT_PENINSULA_HEXES.map(({q,r})=>`${q},${r}`));
  for(const tree of baseline.timberTrees.filter(tree=>tree.id.startsWith('country-'))){
    const hex=hexAt(tree.x,tree.z);
    assert.equal(peninsulaKeys.has(`${hex.q},${hex.r}`),false,'legacy samples cannot spill into newly added land');
  }
  for(const species of ['pine','oak']){
    const prefix=`country-${species}-`, ids=baseline.timberTrees.filter(tree=>tree.id.startsWith(prefix))
      .map(tree=>Number(tree.id.slice(prefix.length))).sort((a,b)=>a-b);
    assert.deepEqual(ids,ids.map((_,index)=>index),'independent headland IDs must not consume legacy tree counters');
  }
  assert.equal(result.deferredScenery.length,5);
  assert.ok(result.deferredScenery.every(job=>!job.regions.includes(1)));
  const initialTrees=result.timberTrees.length;
  for(const job of [...result.deferredScenery].reverse()) finishBuild(job.steps);
  assert.ok(result.timberTrees.length>initialTrees);
  assert.deepEqual(snapshot(fast,result),snapshot(full,baseline));
  const trees=entries=>entries.map(({id,species,x,z})=>({id,species,x,z})).sort((a,b)=>a.id.localeCompare(b.id));
  assert.deepEqual(trees(result.timberTrees),trees(baseline.timberTrees));
  const completed=snapshot(fast,result);
  for(const job of result.deferredScenery) finishBuild(job.createSteps());
  assert.deepEqual(snapshot(fast,result),completed,'completed jobs cannot duplicate geometry or colliders');
});

test('a deferred woodland can be constructed under a hidden staging parent', () => {
  const world=kit(),result=createRegionScenery({...world,fastInitialRegion:1});
  const stage=new THREE.Group();stage.visible=false;world.root.add(stage);
  const remote=result.deferredScenery.find(job=>job.regions.includes(2));
  finishBuild(remote.createSteps(stage));
  assert.ok(stage.children.length>0);
  assert.ok(result.timberTrees.some(tree=>tree.region==='Luscia'));
  assert.equal(stage.visible,false);
});
