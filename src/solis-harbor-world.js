import * as THREE from 'three';
import { SEA_LEVEL, solisPoint } from './region-world.js';
import { SOLIS_HARBOR } from './solis-harbor.js';

/** Built inside the city's existing colour batching pass, including the moored boats. */
export function createSolisHarborScenery({ root, material, mesh, box, post, rope, groundHeight, cylinder, colliders, wood, woodLight, darkWood }) {
  const group = new THREE.Group(); group.name = 'Solis harbour'; root.add(group);
  const stone = material('#cbbd9c'), edge = material('#b3a381'), iron = material('#5c6060');
  const line = material('#aa9871'), sail = material('#dfd4b7');
  const hullColours = [material('#506a75'), material('#675447'), material('#7e5e41')];
  const add = (a, b, y, width, height, depth, mat = stone) => {
    const p = solisPoint(a, b); return box(mat, p.x, y, p.z, width, height, depth, group);
  };
  const solid = (a, b, hx, hz, kind) => colliders.push({ ...solisPoint(a, b), hx, hz, kind });
  const bollard = (a, b) => {
    const p = solisPoint(a, b);
    post(darkWood, p.x, 2.32, p.z, .18, .64, group);
    box(woodLight, p.x, 2.57, p.z, .55, .11, .26, group);
    colliders.push({ ...p, r: .23, kind: 'harbour-mooring-post' });
  };

  // The stone approach is a solid ramp, with the exact same endpoints as heightAt.
  const r = SOLIS_HARBOR.ramp, p = solisPoint(r.minA, r.minB), q = solisPoint(r.maxA, r.maxB), bottom = -.65;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    p.x, r.low, p.z, q.x, r.high, p.z, q.x, r.high, q.z, p.x, r.low, q.z,
    p.x, bottom, p.z, q.x, bottom, p.z, q.x, bottom, q.z, p.x, bottom, q.z,
  ], 3));
  geometry.setIndex([0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 3, 7, 6, 3, 6, 2, 0, 4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5]);
  geometry.computeVertexNormals(); mesh(geometry, stone, 0, 0, 0, 1, 1, 1, group);

  for (const d of SOLIS_HARBOR.decks) {
    const a = (d.minA + d.maxA) / 2, b = (d.minB + d.maxB) / 2, width = d.maxA - d.minA, depth = d.maxB - d.minB;
    if (d.kind === 'stone') {
      add(a, b, -2, width, 8, depth, edge); // top at 2.0, founded below the sea floor
      for (let x = d.minA; x < d.maxA; x += 2) for (let z = d.minB; z < d.maxB; z += 2) {
        const w = Math.min(2, d.maxA - x), h = Math.min(2, d.maxB - z);
        add(x + w / 2, z + h / 2, 1.965, w - .025, .07, h - .025, stone);
      }
    } else {
      for (const side of [d.minB + .32, d.maxB - .32]) add(a, side, 1.69, width, .3, .28, darkWood);
      const planks = Math.ceil(width / .62), span = width / planks;
      for (let i = 0; i < planks; i++) add(d.minA + (i + .5) * span, b, 1.92, span, .16, depth, i % 3 ? wood : woodLight);
      for (let x = d.minA + .65; x < d.maxA; x += 5) for (const z of [d.minB + .22, d.maxB - .22]) {
        const at = solisPoint(x, z), base = Math.min(-.6, groundHeight(at.x, at.z));
        post(darkWood, at.x, (base + 2) / 2, at.z, .16, 2 - base, group);
      }
    }
  }

  // A low seaward wall along the breakwater, leaving its three-metre walk open.
  add(-104, 27.72, 2.34, 38, .68, .46, stone);
  solid(-104, 27.72, 19, .23, 'harbour-breakwater-wall');
  for (const [a, b] of [[-116, -11.6], [-108, -11.6], [-99, -11.6], [-90, -11.6],
    [-116, -8.4], [-108, -8.4], [-101, 12.4], [-109, 15.6], [-101, 15.6], [-92, 15.6],
    [-120, 24.4], [-111, 24.4], [-96, 24.4], [-87.6, -16], [-87.6, 20]]) bollard(a, b);
  const boom = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12, at = solisPoint(-117 - 6 * t - 5 * Math.sin(t * Math.PI), -10 + 34 * t);
    boom.push(new THREE.Vector3(at.x, 2.12 - 1.85 * Math.sin(t * Math.PI), at.z));
  }
  rope(boom, .065, iron, group);

  // Cargo stays beside the walking lanes: oil jars, wine casks and bound crates.
  for (const [a, b, stacked] of [[-82.1, -15.5, true], [-82.1, -2, false], [-82.1, 3, true], [-86.6, 19, false]]) {
    add(a, b, 2.58, 1.25, 1.16, 1.3, wood);
    for (const offset of [-.39, .39]) add(a + offset, b, 2.59, .085, 1.2, 1.34, darkWood);
    if (stacked) add(a + .08, b + .05, 3.55, 1.04, .78, 1.08, woodLight);
    solid(a, b, .65, .68, 'harbour-cargo');
  }
  for (const [a, b] of [[-82.2, 19], [-82.2, 21], [-86.7, -1]]) {
    const at = solisPoint(a, b);
    mesh(new THREE.CylinderGeometry(.38, .34, 1.12, 10), woodLight, at.x, 2.56, at.z, 1, 1, 1, group);
    for (const y of [2.16, 2.96]) mesh(new THREE.CylinderGeometry(.388, .388, .055, 10), iron, at.x, y, at.z, 1, 1, 1, group);
    colliders.push({ ...at, r: .39, kind: 'harbour-cask' });
  }

  // Timber cargo derrick at the landward end of the mole, with its hook over water.
  const crane = solisPoint(-86.5, 22.1);
  post(darkWood, crane.x, 3.8, crane.z, .22, 3.6, group);
  add(-90, 22.1, 5.42, 7.2, .26, .28, wood);
  rope([new THREE.Vector3(crane.x, 5.4, crane.z), new THREE.Vector3(crane.x - 6.8, 5.4, crane.z),
    new THREE.Vector3(crane.x - 6.8, 2.5, crane.z)], .035, line, group);
  mesh(new THREE.TorusGeometry(.14, .035, 5, 10, Math.PI * 1.6), iron, crane.x - 6.8, 2.4, crane.z, 1, 1, 1, group);
  colliders.push({ ...crane, r: .27, kind: 'harbour-crane' });

  for (const [index, boat] of SOLIS_HARBOR.boats.entries()) {
    const hull = new THREE.Group(); hull.name = `Solis ${boat.id}`;
    hull.position.set(boat.x, SEA_LEVEL + .12, boat.z); hull.rotation.y = boat.yaw; group.add(hull);
    const outline = [[0, -.5], [-.43, -.3], [-.5, .24], [-.3, .48], [.3, .48], [.5, .24], [.43, -.3]];
    const vertices = [], indices = [];
    for (const [scale, y] of [[.28, -.42], [1, .55]]) for (const [x, z] of outline) vertices.push(x * boat.width * scale, y, z * boat.length * (scale === 1 ? 1 : .85));
    const n = outline.length;
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; indices.push(i, j, n + j, i, n + j, n + i); }
    const hullGeometry = new THREE.BufferGeometry(); hullGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    hullGeometry.setIndex(indices); hullGeometry.computeVertexNormals();
    const hullMat = hullColours[index]; hullMat.side = THREE.DoubleSide;
    mesh(hullGeometry, hullMat, 0, 0, 0, 1, 1, 1, hull);
    box(darkWood, 0, .1, .15, boat.width * .7, .13, boat.length * .64, hull);
    for (const z of [-.2, .2]) box(woodLight, 0, .4, boat.length * z, boat.width * .86, .13, .4, hull);
    for (let i = 0; i < n; i++) {
      const a = outline[i], b = outline[(i + 1) % n], dx = (b[0] - a[0]) * boat.width, dz = (b[1] - a[1]) * boat.length;
      const rail = box(woodLight, (a[0] + b[0]) * boat.width / 2, .55, (a[1] + b[1]) * boat.length / 2, .1, .12, Math.hypot(dx, dz), hull);
      rail.rotation.y = Math.atan2(dx, dz);
    }
    if (boat.mast) {
      post(wood, 0, 2.65, -.35, .075, 5.1, hull);
      box(woodLight, 0, 4.75, -.35, 3.8, .1, .1, hull);
      box(sail, 0, 4.52, -.35, 3.6, .35, .2, hull);
      rope([new THREE.Vector3(0, 4.8, -.35), new THREE.Vector3(0, .6, -boat.length * .43)], .025, line, hull);
    }
    const mooring = solisPoint(index === 0 ? -108 : index === 1 ? -101 : -116, index === 0 ? -8.4 : index === 1 ? 12.4 : -8.4);
    rope([new THREE.Vector3(boat.x, SEA_LEVEL + .65, boat.z), new THREE.Vector3(mooring.x, 2.2, mooring.z)], .028, line, group);
    const alongX = Math.abs(Math.sin(boat.yaw)) > .7;
    colliders.push({ x: boat.x, z: boat.z, hx: (alongX ? boat.length : boat.width) / 2,
      hz: (alongX ? boat.width : boat.length) / 2, kind: 'harbour-boat' });
  }
  return { decks: SOLIS_HARBOR.decks.length, boats: SOLIS_HARBOR.boats.length, group };
}
