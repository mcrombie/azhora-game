import * as THREE from 'three';

// An asymmetric frustum keeps sightlines continuous across a rectangular
// opening. Local +Z faces the viewer; looking at a picture's centre does not.
export function windowPerspective(camera,eye,{width,height,origin,basis,far=6000}){
  if(eye.z<=.06)return false;
  const near=Math.max(.05,eye.z),scale=near/eye.z;
  camera.position.copy(eye).applyMatrix4(basis).add(origin);
  camera.quaternion.setFromRotationMatrix(basis);
  camera.near=near;camera.far=far;
  camera.projectionMatrix.makePerspective((-width/2-eye.x)*scale,(width/2-eye.x)*scale,(height/2-eye.y)*scale,(-height/2-eye.y)*scale,near,far);
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();camera.updateMatrixWorld(true);
  return true;
}
export function destinationBasis(eye,target){
  return new THREE.Matrix4().lookAt(new THREE.Vector3(...eye),new THREE.Vector3(...target),new THREE.Vector3(0,1,0));
}
