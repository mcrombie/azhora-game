import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';

const THREE = await sourceModule('../vendor/three.module.js');
const {createYunethreLakeWater} = await sourceModule('../src/content/regions/minora-frontier/yunethre-lake.js');
const {createSouthOremindiLakeWater} = await sourceModule('../src/content/regions/south-oremindi/south-oremindi-scenery.js');
const {YUNETHRE_LAKE} = await sourceModule('../src/content/regions/minora-frontier/yunethre-world.js');
const {SOUTH_OREMINDI_LAKES} = await sourceModule('../src/content/regions/south-oremindi/south-oremindi-world.js');

function waterAtTarn(root) {
  root.updateMatrixWorld(true);
  const meshes=[];root.traverseVisible(o=>{if(o.isMesh)meshes.push(o);});
  const lake=YUNETHRE_LAKE;
  const ray=new THREE.Raycaster(new THREE.Vector3(lake.centre.x,lake.surface+10,lake.centre.z),new THREE.Vector3(0,-1,0));
  // A triangulation edge can return two faces belonging to one mesh.
  return [...new Set(ray.intersectObjects(meshes,false).map(hit=>hit.object))];
}

test('Forest Tarn remains one visible water sheet before, during and after mountain residency', () => {
  const world=new THREE.Group(),mountains=new THREE.Group();world.add(mountains);
  const tarn=createYunethreLakeWater(world);
  assert.deepEqual(waterAtTarn(world),[tarn.mesh],'water exists before South Oremindi loads');
  const alpine=createSouthOremindiLakeWater(mountains,{excludeLakeIds:[YUNETHRE_LAKE.id]});
  try {
    assert.equal(alpine.waterMeshes.length,SOUTH_OREMINDI_LAKES.length-1);
    assert.ok(alpine.waterMeshes.every(mesh=>mesh.userData.lakeId!==YUNETHRE_LAKE.id));
    assert.deepEqual(waterAtTarn(world),[tarn.mesh],'loading mountains does not add coplanar water');
    mountains.visible=false;
    assert.deepEqual(waterAtTarn(world),[tarn.mesh],'unloading mountain visuals preserves Laketown water');
    tarn.update(14);alpine.update(14);
    assert.equal(tarn.mesh.material.uniforms.time.value,14);
    alpine.dispose();alpine.dispose();
    assert.deepEqual(waterAtTarn(world),[tarn.mesh],'the regional owner cannot dispose the world-owned tarn');
  } finally {
    alpine.dispose();tarn.mesh.geometry.dispose();tarn.mesh.material.dispose();
  }
});

test('standalone South Oremindi still owns both lakes and disposes its water once', () => {
  const parent=new THREE.Group(),alpine=createSouthOremindiLakeWater(parent);
  assert.deepEqual(alpine.waterMeshes.map(mesh=>mesh.userData.lakeId),SOUTH_OREMINDI_LAKES.map(lake=>lake.id));
  assert.equal(waterAtTarn(parent).length,1);
  let geometryDisposals=0,materialDisposals=0;
  for(const mesh of alpine.waterMeshes)mesh.geometry.addEventListener('dispose',()=>geometryDisposals++);
  alpine.waterMeshes[0].material.addEventListener('dispose',()=>materialDisposals++);
  alpine.dispose();alpine.dispose();
  assert.equal(geometryDisposals,SOUTH_OREMINDI_LAKES.length);
  assert.equal(materialDisposals,1);
  assert.equal(parent.children.length,0);
});
