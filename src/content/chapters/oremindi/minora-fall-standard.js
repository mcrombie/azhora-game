import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';

/** An invented heraldic sign: a broken silver crown over a descending red
 * blade, on smoke-black forked cloth. It identifies Wilhelm, not his hidden lord. */
export function createBloodPrinceStandard(){
 const root=new THREE.Group();root.name='Blood Prince / broken-crown standard';
 const b=createSceneryBuilder(root.name),black='#282e32',red='#813340',silver='#b9b5a4';
 b.box('#55473b',0,-1,-.12,.12,7.8,.13);b.box('#8d8e80',0,2.5,0,2.65,.12,.15);
 const cloth=new THREE.Group();cloth.name='Forked cloth';root.add(cloth);
 const c=createSceneryBuilder('Blood Prince / forked silk');
 c.sheet(black,[-1.15,2.42,0],[1.15,2.42,0],[.96,-1.55,.05],[0,-1.03,.08]);
 c.triangle(black,[-1.15,2.42,0],[0,-1.03,.08],[-.96,-1.55,.05]);
 c.triangle(black,[-1.15,2.42,0],[-.96,-1.55,.05],[0,-1.03,.08]);
 for(const face of [-1,1]){
  const z=face*.08;
  for(const x of [-1.05,1.05])c.beam(red,[x,2.25,z],[x*.85,-1.25,z+.02],.065,.025);
  c.box(silver,0,.68,z,1.22,.11,.035);
  for(const x of [-.55,0,.55])c.beam(silver,[x,.73,z],[x*.9,1.2+(x===0?.22:0),z],.11,.035);
  c.box(black,.24,.69,z+face*.03,.13,.16,.045,0,0,.3);
  c.sheet(red,[-.16,.4,z],[.16,.4,z],[.055,-.45,z],[0,-.72,z]);
  c.triangle(red,[-.16,.4,z],[0,-.72,z],[-.055,-.45,z]);
 }
 b.cone(silver,0,2.95,-.12,.16,.44,0,4);
 const meshes=[b.finish(root),c.finish(cloth)],material=meshes[0].material.clone();
 material.roughness=.82;for(const m of meshes)m.material=material;
 let disposed=false;return {root,cloth,animate(time,seed=0){cloth.rotation.y=Math.sin(time*1.4+seed)*.045;cloth.rotation.z=Math.sin(time*.9+seed)*.018;},
  dispose(){if(disposed)return;disposed=true;root.removeFromParent();for(const m of meshes)m.geometry.dispose();material.dispose();}};
}
