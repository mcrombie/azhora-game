import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
const THREE=await sourceModule('../vendor/three.module.js');
const {windowPerspective,destinationBasis}=await sourceModule('../src/world/scenery/window-perspective.js');
const {SNERO_WINDOWS,SNERO_WINDOW_SIZE}=await import('../src/content/regions/minora-frontier/snero-window-views.js');

test('window corners stay registered to the opening from lateral, close and high viewpoints',()=>{
  const {width,height}=SNERO_WINDOW_SIZE;
  for(const view of SNERO_WINDOWS){
    const camera=new THREE.PerspectiveCamera(),basis=destinationBasis(view.eye,view.target),origin=new THREE.Vector3(...view.eye);
    for(const eye of [new THREE.Vector3(0,0,6),new THREE.Vector3(-2,-1,2),new THREE.Vector3(1.4,2.7,.3)]){
      assert.equal(windowPerspective(camera,eye,{width,height,basis,origin}),true);
      for(const x of [-1,1])for(const y of [-1,1]){
        const corner=new THREE.Vector3(x*width/2,y*height/2,0).applyMatrix4(basis).add(origin).project(camera);
        assert.ok(Math.abs(corner.x-x)<1e-8&&Math.abs(corner.y-y)<1e-8,view.id+' keeps its opening registered');
      }
    }
  }
});
test('moving past the sill reveals different landscape with depth-dependent parallax',()=>{
  const camera=new THREE.PerspectiveCamera(),basis=new THREE.Matrix4(),origin=new THREE.Vector3(),size=SNERO_WINDOW_SIZE;
  const near=new THREE.Vector3(0,0,-3),far=new THREE.Vector3(0,0,-300);
  windowPerspective(camera,new THREE.Vector3(0,0,3),{...size,basis,origin});
  const a=[near.clone().project(camera).x,far.clone().project(camera).x];
  windowPerspective(camera,new THREE.Vector3(1,0,3),{...size,basis,origin});
  const b=[near.clone().project(camera).x,far.clone().project(camera).x];
  assert.ok(Math.abs(b[0]-a[0])>.01&&Math.abs(b[1]-a[1])>.01);
  assert.ok(Math.abs((b[0]-a[0])-(b[1]-a[1]))>.1,'near and far scenery do not slide as a single image');
  assert.equal(windowPerspective(camera,new THREE.Vector3(0,0,-1),{...size,basis,origin}),false,'no rendering through a window from behind its wall');
});
