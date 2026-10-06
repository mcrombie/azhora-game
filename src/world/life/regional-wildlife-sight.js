import * as THREE from 'three';

const sightMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
const visible = mesh => { for (let p = mesh; p; p = p.parent) if (!p.visible) return false; return true; };

/** Native review only: ray-test nearby, actually transformed scenery. Being
 * inside the camera frustum does not make an animal behind a trunk readable. */
export function regionalWildlifeSight(group, from, to, groundAt) {
  const start = new THREE.Vector3(from.x, from.y, from.z), end = new THREE.Vector3(to.x, to.y, to.z);
  const line = end.clone().sub(start), distance = line.length(), direction = line.normalize();
  const ray = new THREE.Raycaster(start, direction, .01, Math.max(.01, distance - .12));
  const matrix = new THREE.Matrix4(), sphere = new THREE.Sphere(), proxies = [];
  group?.traverse(mesh => {
    if (!mesh.isMesh || !visible(mesh) || mesh.material?.transparent) return;
    if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
    for (let i = 0; i < (mesh.isInstancedMesh ? mesh.count : 1); i++) {
      if (mesh.isInstancedMesh) { mesh.getMatrixAt(i, matrix); matrix.premultiply(mesh.matrixWorld); }
      else matrix.copy(mesh.matrixWorld);
      sphere.copy(mesh.geometry.boundingSphere).applyMatrix4(matrix);
      if (!ray.ray.intersectsSphere(sphere) || start.distanceTo(sphere.center) - sphere.radius > distance) continue;
      const proxy = new THREE.Mesh(mesh.geometry, sightMaterial); proxy.name = mesh.name;
      proxy.matrixAutoUpdate = false; proxy.matrixWorld.copy(matrix); proxy.userData.index = i; proxies.push(proxy);
    }
  });
  const hit = ray.intersectObjects(proxies, false)[0];
  if (hit) return { clear: false, obstacle: hit.object.name, index: hit.object.userData.index, distance: hit.distance, candidates: proxies.length };
  if (groundAt) for (let d = .2; d < distance - .2; d += .25) {
    const p = start.clone().addScaledVector(direction, d);
    if (groundAt(p.x, p.z) > p.y) return { clear: false, obstacle: 'rendered ground', distance: d, candidates: proxies.length };
  }
  return { clear: true, obstacle: null, candidates: proxies.length };
}
