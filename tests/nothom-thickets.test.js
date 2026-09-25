import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import * as THREE from '../vendor/three.module.js';
import { hexAt } from '../src/region-world.js';
import { NOTHOM_THICKET_HEXES, nothomThicketSites } from '../src/nothom-thickets.js';

test('natural brambles cover the exact west and northwest Nothom hexes with varied patches', () => {
  assert.deepEqual(NOTHOM_THICKET_HEXES.map(({q,r})=>[q,r]),[[4,110],[5,109]]);
  const sites=nothomThicketSites();
  assert.deepEqual(nothomThicketSites(),sites,'placement remains stable between visits');
  for(const cell of NOTHOM_THICKET_HEXES){
    const patches=sites.filter(p=>p.q===cell.q&&p.r===cell.r);
    assert.ok(patches.length>=12,`${cell.name} should read as thorn country, not one isolated quest bush`);
    assert.ok(patches.some(p=>p.radius>5)&&patches.some(p=>p.radius<3),'large tangles and low scrub coexist');
    assert.ok(Math.max(...patches.map(p=>p.height))-Math.min(...patches.map(p=>p.height))>1);
  }
});

test('batched thicket geometry respects exact hex edges and leaves a clear road verge', async()=>{
  const {createNothomThicketScenery}=await sourceModule('../src/spider-den-scenery.js');
  const roadDistance=(x,z)=>Math.abs(x+775)-3;
  const root=new THREE.Group(),thickets=createNothomThicketScenery({root,groundHeight:(x,z)=>Math.sin(x*.03)*.8,roadDistance});
  assert.equal(thickets.children.length,2,'one merged mesh per authored hex');
  assert.equal(thickets.userData.passable,true,'these brambles introduce no collision or damage');
  assert.ok(thickets.userData.vertices<150000,'two hexes share a bounded scenery budget');
  for(const mesh of thickets.children){
    const pos=mesh.geometry.attributes.position,cell=mesh.userData.cell;
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i),z=pos.getZ(i),hex=hexAt(x,z);
      assert.equal(hex.q,cell.q);assert.equal(hex.r,cell.r);
      assert.ok(roadDistance(x,z)>2.5,'no thorn or leaf grows into the road verge');
    }
  }
});
