import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
import {FARMSTEADS} from '../src/world/scenery/regional-farmland.js';
import {AMBRON_FIELDS} from '../src/content/regions/ambron/ambron-farmland.js';
import {ambronCultivatedField} from '../src/content/regions/ambron/elagos-world.js';

test('Ambron and regional orchards register real apple geometry with stable locations and removable handles',async()=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {getTreeRegistry}=await sourceModule('../src/world/scenery/tree-registry.js');
  const {createAmbronFarmlandSteps}=await sourceModule('../src/content/regions/ambron/ambron-farmland-scenery.js');
  const {createRegionalFarmlandScenerySteps}=await sourceModule('../src/world/scenery/regional-farmland-scenery.js');
  const before=JSON.stringify({farms:FARMSTEADS,fields:AMBRON_FIELDS}),heightAt=(x,z)=>3+x*.001+z*.0005;
  for(const kind of ['ambron','regional']){
    const parent=new THREE.Group(),colliders=[],steps=kind==='ambron'?createAmbronFarmlandSteps({parent,heightAt,colliders}):createRegionalFarmlandScenerySteps({root:parent,groundHeight:heightAt,colliders});
    let next;do{next=steps.next();}while(!next.done);
    const registry=getTreeRegistry(colliders),trees=registry.trees;
    if(kind==='ambron')assert(trees.length>80);
    else assert.deepEqual(trees.map(t=>t.id).sort(),FARMSTEADS.flatMap(f=>f.orchardTrees.map(t=>t.id)).sort());
    for(const t of trees){
      assert.equal(t.species,'apple');assert.equal(t.harvestable,false);assert.equal(t.habitat,'orchard');assert(t.locationName&&t.region);assert.equal(t.y,heightAt(t.x,t.z));
      assert.equal(colliders.filter(c=>c.id===t.id).length,1);
      if(kind==='ambron'){
        assert.equal(ambronCultivatedField(t.x,t.z)?.id,t.fieldId);
        for(let k=0;k<12;k++){const a=k*Math.PI/6;assert.equal(ambronCultivatedField(t.x+Math.sin(a)*t.crownRadius,t.z+Math.cos(a)*t.crownRadius)?.id,t.fieldId);}
      }
    }
    const first=trees[0],slots=[],matrix=new THREE.Matrix4();
    parent.traverse(o=>{if(o.isInstancedMesh&&o.userData.liveTree)for(let i=0;i<o.count;i++){
      o.getMatrixAt(i,matrix);if(Math.hypot(matrix.elements[12]-first.x,matrix.elements[14]-first.z)<.001)slots.push({mesh:o,index:i});
    }});
    assert.equal(slots.length,2,'The tree owns its actual trunk and crown instances');
    assert(registry.remove(first.id));assert(!colliders.some(c=>c.id===first.id));assert(!registry.get(first.id));
    for(const {mesh,index} of slots){mesh.getMatrixAt(index,matrix);assert.equal(matrix.elements[0],0);assert.equal(matrix.elements[5],0);assert.equal(matrix.elements[10],0);}
    assert(registry.trees.length>20,'Removing one orchard tree leaves its neighbours');
    parent.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
  }
  assert.equal(JSON.stringify({farms:FARMSTEADS,fields:AMBRON_FIELDS}),before,'Authored planting and economic layouts are untouched');
});
