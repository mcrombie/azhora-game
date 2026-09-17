/**
 * The mushrooms of Drent's woods: what Odger Pell teaches the traveler to find
 * (`src/mycology.js`). Each kind grows where it should — chanterelles from the
 * ground under oaks, brackets and oysters out of dead wood, puffballs in open
 * grass, morels in the leaf litter of the low ground, trumpets in moss — and
 * each is drawn once and instanced where it stands. Gathering hides one; the
 * road's checkpoint remembers which.
 */
import * as THREE from 'three';
import { canStand } from './game-state.js';
import { MUSHROOM_SPECIES, MUSHROOM_IDS } from './mycology.js';

const TAU = Math.PI * 2;

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

/** One clump of each kind, drawn at the size it grows. */
export function mushroomShapes() {
  const dome = new THREE.SphereGeometry(1, 8, 6, 0, TAU, 0, Math.PI / 2);
  const ball = new THREE.IcosahedronGeometry(1, 1);
  const cone = new THREE.ConeGeometry(1, 1, 7);
  const stalk = new THREE.CylinderGeometry(1, 1.15, 1, 6);
  const plate = new THREE.CylinderGeometry(1, 1, 1, 9);
  const shapes = {};
  const cap = (colour, x, y, z, r, h, stem = colour) => [
    [stalk, stem, [x, y * .5, z], [r * .22, y, r * .22]],
    [dome, colour, [x, y, z], [r, h, r]],
  ];
  // From the ground under oaks: blunt folds, egg-yellow, growing singly or in twos.
  shapes.chanterelle = mergedGeometry([
    ...cap(0xe9b640, 0, .085, 0, .075, .05, 0xf0cd74),
    ...cap(0xe3ae3a, .09, .062, .05, .055, .04, 0xefcb72),
  ]);
  // The lookalike: orange through and through, crowded on wood.
  shapes['jack-o-lantern'] = mergedGeometry([
    ...cap(0xdf7a1e, 0, .075, 0, .06, .038, 0xe08d34),
    ...cap(0xd9741c, .07, .09, .03, .055, .036, 0xe08d34),
    ...cap(0xe3862a, -.05, .066, .06, .05, .032, 0xe08d34),
    [stalk, 0x6a4a2c, [.02, .02, .02], [.1, .04, .1]],
  ]);
  // Wholly white, with a skirt on the stem and a cup at the foot.
  shapes['destroying-angel'] = mergedGeometry([
    [stalk, 0xf4f1e8, [0, .075, 0], [.02, .15, .02]],
    [plate, 0xefeadd, [0, .105, 0], [.05, .008, .05]],
    [dome, 0xf7f5ee, [0, .15, 0], [.062, .05, .062]],
    [plate, 0xeae4d5, [0, .016, 0], [.05, .03, .05]],
  ]);
  // Shelves and brackets on wood.
  const shelf = (colour, edge, y, out, wide) => [
    [plate, colour, [out * .5, y, 0], [wide, .016, wide * .8], [0, 0, .12]],
    [plate, edge, [out * .78, y - .004, 0], [wide * .52, .012, wide * .5], [0, 0, .12]],
  ];
  shapes.oyster = mergedGeometry([
    ...shelf(0xe3dcc6, 0xd2c8ac, .1, .1, .085), ...shelf(0xded6be, 0xd2c8ac, .16, .08, .07), ...shelf(0xe6dfca, 0xd2c8ac, .05, .07, .06),
  ]);
  shapes['chicken-of-the-woods'] = mergedGeometry([
    ...shelf(0xe2812a, 0xf2c94a, .12, .12, .1), ...shelf(0xd97622, 0xf0c244, .06, .1, .085), ...shelf(0xe58b32, 0xf2c94a, .18, .08, .07),
  ]);
  shapes['turkey-tail'] = mergedGeometry([
    ...shelf(0x7d6a4f, 0xd8cfb6, .06, .07, .055), ...shelf(0x6b5a44, 0xcfc4a8, .1, .06, .05), ...shelf(0x8a7658, 0xd8cfb6, .14, .05, .045),
  ]);
  // A ruffled clump at an oak's foot.
  shapes['hen-of-the-woods'] = mergedGeometry(Array.from({ length: 9 }, (_, i) => {
    const a = i * 2.39996, r = .03 + (i % 3) * .035;
    return [plate, i % 2 ? 0x8d8168 : 0x7d7259, [Math.sin(a) * r, .04 + (i % 4) * .015, Math.cos(a) * r], [.055, .012, .045], [i * .3, a, .2]];
  }));
  // A white cascade of spines out of a wound in a trunk.
  shapes['lions-mane'] = mergedGeometry([
    [ball, 0xf2ece0, [0, .12, 0], [.075, .07, .06]],
    ...Array.from({ length: 10 }, (_, i) => {
      const a = i * 2.39996;
      return [cone, 0xe9e2d2, [Math.sin(a) * .045, .085 - (i % 3) * .018, Math.cos(a) * .035], [.012, .05, .012], [Math.PI, 0, 0]];
    }),
  ]);
  // Honeycombed, hollow, in spring leaf litter.
  shapes.morel = mergedGeometry([
    [stalk, 0xe4d9bb, [0, .04, 0], [.022, .08, .022]],
    [cone, 0x8f7a4e, [0, .135, 0], [.042, .12, .042]],
    ...Array.from({ length: 7 }, (_, i) => {
      const a = i * 2.39996;
      return [plate, 0x6d5c39, [Math.sin(a) * .03, .1 + (i % 3) * .03, Math.cos(a) * .03], [.012, .012, .012]];
    }),
  ]);
  // Little grey-black horns in the moss.
  shapes['black-trumpet'] = mergedGeometry(Array.from({ length: 5 }, (_, i) => {
    const a = i * 2.39996, r = .02 + (i % 3) * .018;
    return [cone, i % 2 ? 0x3c3a38 : 0x4a4642, [Math.sin(a) * r, .05, Math.cos(a) * r], [.028, .09, .028], [Math.PI + .1, a, 0]];
  }));
  // A white loaf in the grass.
  shapes.puffball = mergedGeometry([[ball, 0xf0ece0, [0, .07, 0], [.085, .075, .085]], [ball, 0xe7e2d2, [.1, .045, .06], [.05, .045, .05]]]);
  dome.dispose(); ball.dispose(); cone.dispose(); stalk.dispose(); plate.dispose();
  return shapes;
}

/** Where each kind is looked for, and how many of it grow in Drent. */
export const MUSHROOM_PATCHES = Object.freeze({
  chanterelle: 4, 'jack-o-lantern': 3, 'destroying-angel': 2, oyster: 3, 'chicken-of-the-woods': 3,
  'turkey-tail': 3, 'hen-of-the-woods': 2, 'lions-mane': 2, morel: 3, 'black-trumpet': 3, puffball: 3,
});

/**
 * Put Drent's mushrooms in its woods. `avoid` is everywhere people stand, so the
 * traveler never finds one under somebody's feet.
 */
export function createMushrooms(scene, world, { avoid = [], random = null } = {}) {
  let seed = 0x51ad3f07, disposed = false;
  const rand = random ?? (() => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; });
  const root = new THREE.Group(); root.name = 'Drent mushrooms'; scene.add(root);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .93, flatShading: true, side: THREE.DoubleSide });
  const shapes = mushroomShapes();
  const wood = new THREE.MeshStandardMaterial({ color: 0x6a563d, roughness: .96, flatShading: true });
  const logGeometry = new THREE.CylinderGeometry(.16, .18, 1.5, 6);

  // The woods of Drent, in world metres: the box Tidehaven's own trees occupy.
  const inWoods = (x, z) => x >= -174 && x <= -43 && z >= -43 && z <= 101;
  const trees = (world.broadleafTrees ?? []).filter(tree => inWoods(tree.x, tree.z));
  const roads = world.paths ?? [];
  const nearRoad = (x, z) => roads.some(path => path.some(point => Math.hypot(point.x - x, point.z - z) < 3.2));
  const crowded = (x, z, list, gap) => list.some(item => Math.hypot(item.x - x, item.z - z) < gap);

  const sites = [], logs = [];
  function placeNear(anchor, radius, needsLog, list) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const a = rand() * TAU, r = 1.4 + rand() * radius;
      const x = anchor.x + Math.sin(a) * r, z = anchor.z + Math.cos(a) * r;
      if (!inWoods(x, z) || !canStand(x, z, world, .5) || nearRoad(x, z)) continue;
      if (crowded(x, z, sites, 3.4) || crowded(x, z, avoid, 3.2)) continue;
      if (needsLog && crowded(x, z, logs, 6)) continue;
      return { x, z, y: world.heightAt(x, z) };
    }
    return null;
  }

  for (const id of MUSHROOM_IDS) {
    const species = MUSHROOM_SPECIES[id], wanted = MUSHROOM_PATCHES[id] ?? 2;
    const onWood = species.habitat === 'log' || species.habitat === 'stump';
    for (let n = 0; n < wanted; n++) {
      const tree = trees.length ? trees[Math.floor(rand() * trees.length)] : null;
      if (!tree) break;
      // Grass and floodplain kinds want space, not a trunk; the rest want their tree.
      const radius = species.habitat === 'grass' ? 9 : species.habitat === 'floodplain' ? 7 : 3.2;
      const spot = placeNear(tree, radius, onWood, sites);
      if (!spot) continue;
      const site = { id: `${id}-${n + 1}`, species: id, name: species.name, x: spot.x, z: spot.z, y: spot.y, gathered: false,
        yaw: rand() * TAU, scale: .9 + rand() * .35 };
      sites.push(site);
      if (onWood) logs.push({ x: spot.x, z: spot.z, yaw: site.yaw });
    }
  }

  // A fallen log under the kinds that only grow out of dead wood.
  const logMesh = new THREE.InstancedMesh(logGeometry, wood, Math.max(1, logs.length));
  logMesh.name = 'Fallen wood'; logMesh.castShadow = true; logMesh.receiveShadow = true; root.add(logMesh);
  const dummy = new THREE.Object3D();
  logs.forEach((log, i) => {
    dummy.position.set(log.x, world.heightAt(log.x, log.z) + .16, log.z);
    dummy.rotation.set(0, log.yaw, Math.PI / 2); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
    logMesh.setMatrixAt(i, dummy.matrix);
  });
  logMesh.count = logs.length; logMesh.instanceMatrix.needsUpdate = true; logMesh.computeBoundingSphere();

  const clumps = new Map();
  for (const id of MUSHROOM_IDS) {
    const mine = sites.filter(site => site.species === id);
    if (!mine.length) continue;
    const mesh = new THREE.InstancedMesh(shapes[id], material, mine.length);
    mesh.name = `${MUSHROOM_SPECIES[id].name} clumps`; mesh.castShadow = false; mesh.receiveShadow = true;
    root.add(mesh); clumps.set(id, { mesh, sites: mine });
  }
  function place(site, index, mesh) {
    dummy.position.set(site.x, site.y + (site.species === 'oyster' || site.species === 'lions-mane' ? .22 : .01), site.z);
    dummy.rotation.set(0, site.yaw, 0);
    dummy.scale.setScalar(site.gathered ? .0001 : site.scale);
    dummy.updateMatrix(); mesh.setMatrixAt(index, dummy.matrix);
  }
  function draw() {
    for (const { mesh, sites: mine } of clumps.values()) {
      mine.forEach((site, i) => place(site, i, mesh));
      mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere();
    }
  }
  draw();

  return {
    /** The nearest mushroom still standing, for the F prompt. */
    nearest(position, maxDistance = 2.2) {
      let best = null, gap = maxDistance;
      for (const site of sites) {
        if (site.gathered) continue;
        const d = Math.hypot(site.x - position.x, site.z - position.z);
        if (d <= gap) { gap = d; best = site; }
      }
      return best ? { id: best.id, species: best.species, name: best.name, x: best.x, z: best.z } : null;
    },
    /** Take one: the edible kinds leave the wood, the rest are noted and left standing. */
    gather(id, { take = true } = {}) {
      const site = sites.find(entry => entry.id === id);
      if (!site || site.gathered) return false;
      if (take) { site.gathered = true; draw(); }
      return true;
    },
    restoreGathered(ids) {
      const taken = new Set(ids ?? []);
      for (const site of sites) site.gathered = taken.has(site.id);
      draw();
    },
    setVisible(visible) { root.visible = !!visible; },
    state() { return { sites: sites.map(({ id, species, x, z, gathered }) => ({ id, species, x, z, gathered })), logs: logs.length, kinds: clumps.size }; },
    dispose() {
      if (disposed) return; disposed = true; root.removeFromParent();
      root.traverse(object => { if (object.isInstancedMesh) object.dispose(); });
      for (const shape of Object.values(shapes)) shape.dispose();
      logGeometry.dispose(); material.dispose(); wood.dispose();
    },
  };
}
