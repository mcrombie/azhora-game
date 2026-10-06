import * as THREE from 'three';

/** A high-contrast cue for the bird already selected by bird-finder. It never
 * searches the world or changes observation range, discovery, or identification.
 */
const HEIGHT = .42;
const PERIOD = 2.8;
const finite = n => Number.isFinite(n);

function chevron() {
  const shape = new THREE.Shape();
  shape.moveTo(-.26, .17); shape.lineTo(-.12, .17); shape.lineTo(0, -.005);
  shape.lineTo(.12, .17); shape.lineTo(.26, .17); shape.lineTo(0, -.25); shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

export function createBirdPointer({ reducedMotion } = {}) {
  const group = new THREE.Group(); group.name = 'bird-pointer'; group.visible = false;
  const motionPreference = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  const shape = chevron();
  // An opaque dark edge survives pale ground; the cream rim survives dark
  // canopy. The blue centre ties it to Birding without relying on colour alone.
  for (const [name, color, scale, depth] of [
    ['outline', 0x152b2c, 1.18, 0], ['rim', 0xfff3c8, 1, .003], ['birding-blue', 0x69cde7, .7, .006],
  ]) {
    const mesh = new THREE.Mesh(shape, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide,
      depthTest: true, depthWrite: false, fog: false, toneMapped: false }));
    mesh.name = `bird-pointer-${name}`; mesh.scale.setScalar(scale); mesh.position.z = depth;
    mesh.renderOrder = 12 + depth * 1000; mesh.castShadow = false; mesh.receiveShadow = false;
    group.add(mesh);
  }

  group.update = (found, { camera, time = 0, viewportHeight = 1080 } = {}) => {
    group.visible = !!found && [found.x, found.y, found.z, found.distance, found.range].every(finite)
      && found.distance >= 0 && found.distance <= found.range && found.range > 0 && !!camera;
    if (!group.visible) return false;
    const quiet = reducedMotion ?? motionPreference?.matches ?? false;
    const phase = quiet ? 0 : Math.sin((finite(time) ? time : 0) * Math.PI * 2 / PERIOD);
    group.position.set(found.x, found.y + .64 + phase * .025, found.z);
    group.quaternion.copy(camera.quaternion);
    const distance = camera.position.distanceTo(group.position);
    const height = finite(viewportHeight) && viewportHeight > 0 ? viewportHeight : 1080;
    const fov = finite(camera.fov) ? camera.fov : 54;
    const screenScale = 22 * 2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2) * distance / (height * HEIGHT);
    // Keep a readable size at observation distance, without a huge arrow when
    // the camera is close. A slow five-percent breath never flashes or fades.
    group.scale.setScalar(Math.max(1, Math.min(2.4, screenScale)) * (1 + phase * .045));
    return true;
  };
  group.dispose = () => { shape.dispose(); for (const mesh of group.children) mesh.material.dispose(); group.removeFromParent(); };
  return group;
}
