import * as THREE from 'three';
import { FERRY_MOORINGS } from '../../content/regions/peblos/peblos-world.js';

/** The shared ferry starts at Tidehaven even while Peblos is still loading.
 * Reusing it never changes its parent or resets an underway crossing. */
export function createFerryBoat(kit) {
  if (kit.ferry) return kit.ferry;
  const { root, material, mesh, box, post, rope, wood, woodLight, movingGroups } = kit;
  const boat = new THREE.Group(); boat.name = 'Jess’s boat'; root.add(boat);
  movingGroups?.add(boat);
  const outline = [[0, -3.2], [1.1, -2.1], [1.3, .9], [.82, 2.55], [0, 3.1], [-.82, 2.55], [-1.3, .9], [-1.1, -2.1]];
  const bp = [], bi = [];
  for (const [bx, bz] of outline) bp.push(bx, .67, bz, bx * .53, -.35, bz * .78);
  for (let i = 0; i < outline.length; i++) { const a = i * 2, b = ((i + 1) % outline.length) * 2; bi.push(a, b, a + 1, b, b + 1, a + 1); }
  const hull = new THREE.BufferGeometry();
  hull.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3)); hull.setIndex(bi); hull.computeVertexNormals();
  mesh(hull, material('#4a6f76', { side: THREE.DoubleSide }), 0, 0, 0, 1, 1, 1, boat);
  box(woodLight, 0, -.08, 0, 1.5, .16, 4.4, boat);
  for (const bz of [-1.6, -.1, 1.45]) box(woodLight, 0, .53, bz, 2.07, .16, .32, boat);
  post(wood, 0, 2.7, -.45, .085, 5.8, boat);
  const sail = new THREE.BufferGeometry();
  sail.setAttribute('position', new THREE.Float32BufferAttribute([.1, 5.5, -.45, .1, 1.3, -.45, 2.8, 1.55, -.3], 3)); sail.computeVertexNormals();
  mesh(sail, material('#efe2b7', { side: THREE.DoubleSide }), 0, 0, 0, 1, 1, 1, boat);
  const oar = box(woodLight, .65, .85, .4, .09, .09, 4.3, boat); oar.rotation.y = .45;
  const blade = box(woodLight, 1.51, .85, 2.17, .33, .08, .65, boat); blade.rotation.y = .45;
  const rail = outline.map(([bx, bz]) => new THREE.Vector3(bx, .72, bz)); rail.push(rail[0]);
  rope(rail, .09, woodLight, boat);
  // Moored at Tidehaven from the first frame: the world is never built with a boat at its origin.
  boat.position.set(FERRY_MOORINGS.drent.x, .38, FERRY_MOORINGS.drent.z);
  boat.rotation.y = FERRY_MOORINGS.drent.yaw;

  return { group: boat, place(x, z, yaw) { boat.position.set(x, .38, z); boat.rotation.y = yaw; } };
}
