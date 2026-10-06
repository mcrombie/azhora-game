import * as THREE from 'three';
import { SOUTHWEST_WILDLIFE_ZONES } from '../../content/regions/southwest/southwest-wildlife.js';

export const GANESH_SHADE_SCRUB = 'Ganesh ghubr shade scrub';

/** Six mature dry perennials in the three existing sediment pockets. This
 * separate stream must never consume the regional scatter's saved sequence. */
export function createGaneshShadeScrub(geometry, material, groundAt) {
  const homes = SOUTHWEST_WILDLIFE_ZONES.find(zone => zone.id === 'ganesh-ghubr').sites;
  // A narrow perennial base leaves usable shade beneath the spreading upper
  // foliage; merely enlarging a ground-hugging sphere encloses the bird.
  geometry = geometry.clone();
  const shape = geometry.attributes.position;
  for (let i = 0; i < shape.count; i++) if (shape.getY(i) < -.01) {
    shape.setXYZ(i, shape.getX(i) * .22, shape.getY(i) * 1.25, shape.getZ(i) * .22);
  }
  geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  const mesh = new THREE.InstancedMesh(geometry, material, homes.length * 6);
  let seed = 0x67687562;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const dummy = new THREE.Object3D(), point = new THREE.Vector3(), color = new THREE.Color();
  const positions = geometry.attributes.position;
  const shrubs = []; let at = 0;
  for (const [homeIndex, [hx, hz]] of homes.entries()) {
    for (let plant = 0; plant < 2; plant++) {
      const angle = plant ? 2.05 + homeIndex * .12 : .03 - homeIndex * .09;
      const radius = plant ? 2.8 : 2.35;
      const x = hx + Math.cos(angle) * radius, z = hz + Math.sin(angle) * radius;
      const scale = (plant ? .91 : 1) + random() * .06, rotation = random() * Math.PI * 2;
      shrubs.push({ homeIndex, x, z, first: at, count: 3 });
      for (let lobe = 0; lobe < 3; lobe++) {
        const a = rotation + lobe * 2.1, spread = lobe === 2 ? 0 : .28 * scale;
        dummy.position.set(x + Math.sin(a) * spread, groundAt(x, z), z + Math.cos(a) * spread);
        dummy.rotation.set((random() - .5) * .1, a, (random() - .5) * .1);
        dummy.scale.set(.64 * scale, (lobe === 2 ? .51 : .47) * scale, .55 * scale);
        dummy.updateMatrix();
        // Each lower hull meets the actual Float32 ground, including its lean.
        // These low, nonblocking shrubs retain the existing desert bush style.
        let gap = Infinity;
        for (let i = 0; i < positions.count; i++) {
          if (positions.getY(i) >= 0) continue;
          point.fromBufferAttribute(positions, i).applyMatrix4(dummy.matrix);
          gap = Math.min(gap, point.y - groundAt(point.x, point.z));
        }
        dummy.position.y -= gap + .02; dummy.updateMatrix();
        mesh.setMatrixAt(at, dummy.matrix);
        color.set(plant ? '#75776a' : '#666e54').offsetHSL(0, (random() - .5) * .025, (random() - .5) * .035);
        mesh.setColorAt(at++, color);
      }
    }
  }
  mesh.name = GANESH_SHADE_SCRUB;
  mesh.userData.shrubs = shrubs;
  mesh.castShadow = mesh.receiveShadow = true; mesh.computeBoundingSphere();
  return mesh;
}
