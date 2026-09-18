/**
 * The stones of Drent: what Silas Garrow teaches the traveler to read
 * (`src/geology.js`). Each is found where the country put it — sharks' teeth in
 * the shingle under the Weatherhead, scallops and marl in the bank above them,
 * white quartz and petrified wood at the edge of Willowmere, ironstone and clay
 * and, once in a long while, a worked point in the Avrel furrows, dressed
 * sandstone in the ruins of Rena, and granite in the riverbed at the Caloss
 * crossing, where the hard country begins. Drawn once per kind and instanced.
 */
import * as THREE from 'three';
import { canStand } from './game-state.js';
import { ROCK_SPECIES, ROCK_IDS } from './geology.js';

const TAU = Math.PI * 2, PHI = 2.39996;

function mergedGeometry(pieces) {
  const vertices = [], normals = [], colors = [], m = new THREE.Matrix4(), nm = new THREE.Matrix3();
  const p = new THREE.Vector3(), n = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (const [source, color, position, scale, rotation = [0, 0, 0]] of pieces) {
    q.setFromEuler(e.set(...rotation)); m.compose(new THREE.Vector3(...position), q, new THREE.Vector3(...scale));
    nm.getNormalMatrix(m); const tint = new THREE.Color(color), geometry = source.index ? source.toNonIndexed() : source;
    for (let i = 0; i < geometry.attributes.position.count; i++) {
      p.fromBufferAttribute(geometry.attributes.position, i).applyMatrix4(m); vertices.push(p.x, p.y, p.z);
      n.fromBufferAttribute(geometry.attributes.normal, i).applyMatrix3(nm).normalize(); normals.push(n.x, n.y, n.z);
      colors.push(tint.r, tint.g, tint.b);
    }
    if (geometry !== source) geometry.dispose();
  }
  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  result.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  result.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  result.computeBoundingSphere(); return result;
}

/** One find of each kind, drawn at the size it lies on the ground. */
export function stoneShapes() {
  const pebble = new THREE.IcosahedronGeometry(1, 0), round = new THREE.IcosahedronGeometry(1, 1);
  const cone = new THREE.ConeGeometry(1, 1, 3), slab = new THREE.BoxGeometry(1, 1, 1), disc = new THREE.CylinderGeometry(1, 1, 1, 12, 1);
  const shapes = {};
  const scatter = (geometry, colours, count, spread, size) => Array.from({ length: count }, (_, i) => {
    const a = i * PHI, r = spread * Math.sqrt((i + .5) / count), s = size * (.7 + (i % 3) * .2);
    return [geometry, colours[i % colours.length], [Math.sin(a) * r, s * .5, Math.cos(a) * r], [s, s * .7, s * .85], [i * .7, a, i * .3]];
  });
  shapes.quartz = mergedGeometry(scatter(round, [0xeeeae2, 0xe3ddd0, 0xf4f1ea], 5, .22, .07));
  shapes.clay = mergedGeometry([
    [disc, 0xa4533a, [0, .012, 0], [.38, .024, .3]], [disc, 0x8d8a82, [.12, .02, .05], [.18, .02, .14]],
    ...Array.from({ length: 5 }, (_, i) => [slab, 0x9b4c34, [Math.sin(i * PHI) * .2, .03, Math.cos(i * PHI) * .16], [.1, .02, .08], [0, i, 0]]),
  ]);
  shapes.ironstone = mergedGeometry(scatter(pebble, [0x7a4a26, 0x8c5a2e, 0x6a3f22], 4, .18, .08));
  shapes.greensand = mergedGeometry([
    [disc, 0x3f4a34, [0, .015, 0], [.34, .03, .28]], ...scatter(pebble, [0x4a5a3c, 0x35412c], 6, .24, .035),
  ]);
  shapes.marl = mergedGeometry([
    [disc, 0xd9d2bd, [0, .02, 0], [.36, .04, .3]],
    ...Array.from({ length: 9 }, (_, i) => [disc, i % 2 ? 0xf0ebdc : 0xc9bfa4, [Math.sin(i * PHI) * .22, .045, Math.cos(i * PHI) * .18], [.035, .006, .03], [.4, i, .2]]),
  ]);
  // A great ribbed scallop, lying cupped side up.
  shapes.scallop = mergedGeometry([
    [disc, 0xc8b894, [0, .018, 0], [.11, .02, .1]],
    ...Array.from({ length: 9 }, (_, i) => { const a = (i - 4) * .26; return [slab, 0xb09f7a, [Math.sin(a) * .06, .03, Math.cos(a) * .06 - .02], [.009, .008, .09], [0, a, 0]]; }),
    [slab, 0xbfae86, [0, .02, -.1], [.07, .012, .03]],
  ]);
  shapes['shark-tooth'] = mergedGeometry([
    [cone, 0x1b1a1e, [0, .01, 0], [.03, .07, .012], [Math.PI / 2, 0, 0]],
    [slab, 0x3b3530, [0, .006, -.034], [.05, .012, .016]],
    ...scatter(round, [0x9a9282, 0x7f786c, 0xb1a998], 4, .2, .045),
  ]);
  shapes['petrified-wood'] = mergedGeometry([
    [new THREE.CylinderGeometry(1, 1.05, 1, 8), 0x8a7a64, [0, .07, 0], [.07, .34, .07], [Math.PI / 2, .4, 0]],
    ...Array.from({ length: 5 }, (_, i) => [disc, i % 2 ? 0x6d5f4c : 0xa39478, [0, .07, -.16 + i * .08], [.071, .012, .071], [Math.PI / 2, .4, 0]]),
  ]);
  shapes.sandstone = mergedGeometry([
    [slab, 0xc7b184, [0, .15, 0], [.62, .3, .38], [0, .2, 0]], [slab, 0xb89f73, [.38, .09, .12], [.34, .18, .3], [0, -.3, .04]],
    [slab, 0xd3bf93, [-.1, .31, 0], [.4, .03, .3], [0, .2, 0]],
  ]);
  shapes.granite = mergedGeometry([
    [round, 0x8f8d88, [0, .16, 0], [.38, .22, .3]], [round, 0x9b9994, [.3, .1, .12], [.2, .14, .18]],
    ...Array.from({ length: 14 }, (_, i) => [pebble, i % 3 ? 0x2a2a2c : 0xe8e3d8, [Math.sin(i * PHI) * .26, .22 + (i % 3) * .04, Math.cos(i * PHI) * .2], [.018, .01, .018]]),
  ]);
  shapes.arrowhead = mergedGeometry([
    [cone, 0x5f6b78, [0, .008, 0], [.02, .06, .006], [Math.PI / 2, 0, 0]],
    [disc, 0x6a5a45, [0, .004, 0], [.14, .008, .12]],
  ]);
  pebble.dispose(); round.dispose(); cone.dispose(); slab.dispose(); disc.dispose();
  return shapes;
}

/**
 * Where the stones lie, in world metres: a centre, how far they scatter, and
 * which kinds are there. Every one of them is somewhere the country explains.
 */
export const STONE_GROUNDS = Object.freeze([
  Object.freeze({ id: 'weatherhead-bank', x: -3, z: 90, spread: 7, kinds: Object.freeze({ marl: 2, scallop: 2, greensand: 1 }) }),
  Object.freeze({ id: 'weatherhead-shingle', x: 1, z: 84, spread: 6, kinds: Object.freeze({ 'shark-tooth': 3, quartz: 1 }) }),
  Object.freeze({ id: 'willowmere-edge', x: -103, z: 2, spread: 7, kinds: Object.freeze({ quartz: 2, 'petrified-wood': 1 }) }),
  Object.freeze({ id: 'avrel-furrows', x: -432, z: 44, spread: 12, kinds: Object.freeze({ ironstone: 3, clay: 2, arrowhead: 1 }) }),
  Object.freeze({ id: 'rena-stone', x: -395, z: -70, spread: 14, kinds: Object.freeze({ sandstone: 3 }) }),
  Object.freeze({ id: 'caloss-riverbed', x: -596, z: 132, spread: 6, kinds: Object.freeze({ granite: 2, quartz: 1 }) }),
]);

export function createDrentStones(scene, world, { avoid = [], random = null } = {}) {
  let seed = 0x7c3e91a5, disposed = false;
  const rand = random ?? (() => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; });
  const root = new THREE.Group(); root.name = 'Drent stones'; scene.add(root);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .92, flatShading: true });
  const shapes = stoneShapes();
  const sites = [];
  const crowded = (x, z, list, gap) => list.some(item => Math.hypot(item.x - x, item.z - z) < gap);

  for (const ground of STONE_GROUNDS) {
    for (const [species, count] of Object.entries(ground.kinds)) {
      for (let n = 0; n < count; n++) {
        let placed = null;
        for (let attempt = 0; attempt < 50 && !placed; attempt++) {
          const a = rand() * TAU, r = Math.sqrt(rand()) * ground.spread;
          const x = ground.x + Math.sin(a) * r, z = ground.z + Math.cos(a) * r;
          if (!canStand(x, z, world, .45) || crowded(x, z, sites, 2.2) || crowded(x, z, avoid, 2.6)) continue;
          placed = { x, z };
        }
        if (!placed) continue;
        sites.push({ id: `${species}-${ground.id}-${n + 1}`, species, name: ROCK_SPECIES[species].name, ground: ground.id,
          x: placed.x, z: placed.z, y: world.heightAt(placed.x, placed.z), yaw: rand() * TAU, scale: .9 + rand() * .25, gathered: false });
      }
    }
  }

  const clumps = new Map();
  for (const id of ROCK_IDS) {
    const mine = sites.filter(site => site.species === id);
    if (!mine.length) continue;
    const mesh = new THREE.InstancedMesh(shapes[id], material, mine.length);
    mesh.name = `${ROCK_SPECIES[id].name} finds`; mesh.receiveShadow = true;
    root.add(mesh); clumps.set(id, { mesh, sites: mine });
  }
  const dummy = new THREE.Object3D();
  function draw() {
    for (const { mesh, sites: mine } of clumps.values()) {
      mine.forEach((site, i) => {
        dummy.position.set(site.x, site.y + .005, site.z); dummy.rotation.set(0, site.yaw, 0);
        dummy.scale.setScalar(site.gathered ? .0001 : site.scale); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere();
    }
  }
  draw();

  return {
    nearest(position, maxDistance = 2.2) {
      let best = null, gap = maxDistance;
      for (const site of sites) {
        if (site.gathered) continue;
        const d = Math.hypot(site.x - position.x, site.z - position.z);
        if (d <= gap) { gap = d; best = site; }
      }
      return best ? { id: best.id, species: best.species, name: best.name, x: best.x, z: best.z } : null;
    },
    gather(id, { take = true } = {}) {
      const site = sites.find(entry => entry.id === id);
      if (!site || site.gathered) return false;
      if (take) { site.gathered = true; draw(); }
      return true;
    },
    restoreGathered(ids) { const taken = new Set(ids ?? []); for (const site of sites) site.gathered = taken.has(site.id); draw(); },
    state() { return { sites: sites.map(({ id, species, ground, x, z, gathered }) => ({ id, species, ground, x, z, gathered })), kinds: clumps.size }; },
    dispose() {
      if (disposed) return; disposed = true; root.removeFromParent();
      root.traverse(object => { if (object.isInstancedMesh) object.dispose(); });
      for (const shape of Object.values(shapes)) shape.dispose();
      material.dispose();
    },
  };
}
