import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
const {SPECIES_TREE_PROFILES,createSpeciesTreeLibrary,createSpeciesTrees,speciesTreeDimensions}=await sourceModule('../src/world/scenery/species-trees.js');
const {TREE_SPECIES,TREE_LOCAL_NAMES}=await sourceModule('../src/world/life/tree-species.js');
const {getTreeRegistry}=await sourceModule('../src/world/scenery/tree-registry.js');

test('every real species has distinct physical geometry and legacy local names resolve to those models',()=>{
  const library=createSpeciesTreeLibrary(),signatures=new Map();
  for(const species of TREE_SPECIES) {
    assert.ok(SPECIES_TREE_PROFILES[species.id],species.id);
    const shapes=library.shapes(species.id),positions=[];
    for(const geometry of Object.values(shapes)) {
      const p=geometry.attributes.position;
      for(let i=0;i<p.count;i++) {
        assert.ok(Math.hypot(p.getX(i),p.getZ(i))<=1.000001,`${species.id} fits its radial footprint`);
        assert.ok(p.getY(i)>=0&&p.getY(i)<=1.000001,`${species.id} fits its advertised height`);
      }
      positions.push(...p.array);
      assert.equal(geometry.attributes.color.count,p.count);
    }
    // Compare positions only: changing a colour must not pass as a new model.
    const signature=positions.map(n=>n.toFixed(5)).join(',');
    assert.ok(!signatures.has(signature),`${species.id} shares shape with ${signatures.get(signature)}`);signatures.set(signature,species.id);
  }
  for(const [alias,target] of Object.entries(TREE_LOCAL_NAMES)) {
    assert.equal(library.shapes(alias),library.shapes(target.id));
    assert.deepEqual(speciesTreeDimensions(alias,15),speciesTreeDimensions(target.id,15));
  }
  library.dispose();
});

test('instanced trees fit explicit placement envelopes, ground on slopes, and preserve stable metadata',()=>{
  const parent=new THREE.Group(),colliders=[],heightAt=(x,z)=>2+x*.3+z*.1;
  const input=[{id:'bank-oak',species:'white-oak',x:2,z:3,height:12,crownRadius:3.1,trunkRadius:.48,rotation:1.2,region:'Test',habitat:'riverbank',harvestable:false},
    {id:'bank-alder',species:'black-alder',x:12,z:3,height:8,crownRadius:2.4,trunkRadius:.3}];
  const built=createSpeciesTrees({parent,colliders,trees:input,heightAt});
  assert.equal(parent.children.length,1);assert.equal(built.batches,4);assert.equal(built.trees[0].id,'bank-oak');
  assert.equal(built.trees[0].habitat,'riverbank');assert.equal(built.trees[0].harvestable,false);
  for(const tree of built.trees) {
    assert.ok(tree.base.y<heightAt(tree.x,tree.z)-.03,'The downhill trunk edge is buried, including supplied centre samples');
    const collider=colliders.find(c=>c.id===tree.id);assert.equal(collider.minY,tree.base.y);assert.equal(collider.maxY,tree.base.y+tree.height);
    const matrix=new THREE.Matrix4(),v=new THREE.Vector3();
    for(const mesh of built.root.children.filter(m=>m.userData.species===tree.species)) {
      mesh.getMatrixAt(0,matrix);const p=mesh.geometry.attributes.position;
      for(let i=0;i<p.count;i++) {
        v.fromBufferAttribute(p,i).applyMatrix4(matrix);
        assert.ok(Math.hypot(v.x-tree.x,v.z-tree.z)<=tree.crownRadius+.00001);
        assert.ok(v.y>=tree.base.y-.00001&&v.y<=tree.base.y+tree.height+.00001);
        if(mesh.userData.treePart==='trunk'&&p.getY(i)<.000001)
          assert.ok(v.y-heightAt(v.x,v.z)<=-.02999,'Every visible root vertex sits below its actual sloping terrain');
      }
    }
  }
  built.dispose();built.dispose();assert.equal(parent.children.length,0);assert.equal(colliders.length,0);assert.equal(getTreeRegistry(colliders).trees.length,0);
});

test('a woodland uses bounded shared batches and cutting a tree changes only its own two slots',()=>{
  const parent=new THREE.Group(),colliders=[],trees=Array.from({length:100},(_,i)=>({id:`oak-${i}`,species:'white-oak',x:i%10*8,z:Math.floor(i/10)*8,height:12}));
  const built=createSpeciesTrees({parent,colliders,trees,heightAt:()=>0}),registry=getTreeRegistry(colliders);
  assert.equal(built.batches,2);assert.ok(built.vertices<=66000,'The common woodland model stays under 660 vertices per tree');
  const before=new THREE.Matrix4(),after=new THREE.Matrix4();built.root.children[0].getMatrixAt(1,before);
  assert.equal(registry.set('oak-0',false),true);
  for(const mesh of built.root.children){mesh.getMatrixAt(0,after);assert.equal(after.elements[0],0);assert.equal(after.elements[5],0);}
  built.root.children[0].getMatrixAt(1,after);assert.deepEqual(after.elements,before.elements);
  registry.set('oak-0',true);assert.equal(colliders.length,100);
  built.dispose();
});
