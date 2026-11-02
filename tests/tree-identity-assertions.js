import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {sourceModule} from './module-loader.js';
const {getTreeRegistry}=await sourceModule('../src/world/scenery/tree-registry.js');

// A metadata-only registration is insufficient: the observation must identify
// the same trunk and crown instances that are actually standing at this spot.
export function assertRegisteredTrees(root,colliders){
  const trunks=colliders.filter(c=>c.kind==='tree'),registry=getTreeRegistry(colliders),matrix=new THREE.Matrix4();
  assert(trunks.length>0,'Fixture contains physical town trees');
  for(const c of trunks){
    const tree=registry.get(c.id);assert(tree,`Unidentified tree at ${c.x},${c.z}`);
    assert.equal(tree.species,c.species);assert.equal(tree.x,c.x);assert.equal(tree.z,c.z);assert(tree.locationName&&tree.region);
    assert(registry.nearest(tree,1,t=>t.id===tree.id));
    let pieces=0;
    root.traverse(o=>{if(o.isInstancedMesh&&o.userData.liveTree&&o.userData.species===tree.species)for(let i=0;i<o.count;i++){
      o.getMatrixAt(i,matrix);if(Math.hypot(matrix.elements[12]-tree.x,matrix.elements[14]-tree.z)<.002&&matrix.elements[5]>0)pieces++;
    }});
    assert.equal(pieces,2,`${tree.id} has its own drawn trunk and crown`);
  }
  return trunks;
}
