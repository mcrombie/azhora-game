/**
 * The trees of Drent that botany teaches the traveler to name (`src/botany.js`,
 * the `tree` kinds). The wood behind Tidehaven is drawn as one broadleaf wood, so
 * the trees worth knowing are drawn apart from it, each in its own shape, where
 * that tree actually grows: sycamore and bald cypress at the water, loblolly and
 * red cedar in the old fields, oaks and hickory and the tall tulip poplar in the
 * Greenway, holly and dogwood under them, walnut and persimmon at the field edge.
 * A tree is named, not taken; F at the trunk looks at it.
 */
import * as THREE from 'three';
import { canStand } from './game-state.js';
import { PLANT_SPECIES } from './botany.js';

const TAU = Math.PI * 2, PHI = 2.39996;

/** Pieces [geometry, colour, position, scale, rotation?] merged into one vertex-coloured geometry (the woodlot's willows use it too). */
export function mergedGeometry(pieces) {
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

/**
 * One tree of each kind, at full size. What makes them readable apart at a
 * distance is the silhouette and the bark, so that is what each one is built on:
 * the poplar's column, the oak's spread, the pine's high tuft, the cedar's spire,
 * the cypress's flared foot, the sycamore's white limbs.
 */
export function treeShapes() {
  const trunk = new THREE.CylinderGeometry(.7, 1, 1, 8), crown = new THREE.IcosahedronGeometry(1, 1);
  const cone = new THREE.ConeGeometry(1, 1, 8), ball = new THREE.IcosahedronGeometry(1, 0), slab = new THREE.BoxGeometry(1, 1, 1);
  const shapes = {};
  const stem = (colour, height, base, lean = 0) => [trunk, colour, [0, height / 2, 0], [base, height, base], [lean, 0, 0]];
  const puffs = (colours, count, y, spread, size, flat = .78) => Array.from({ length: count }, (_, i) => {
    const a = i * PHI, r = i ? spread * (.55 + (i % 3) * .22) : 0;
    return [crown, colours[i % colours.length], [Math.sin(a) * r, y + (i % 3) * size * .25, Math.cos(a) * r], [size, size * flat, size]];
  });
  const limbs = (colour, count, y, reach, thick) => Array.from({ length: count }, (_, i) => {
    const a = i * PHI + .4;
    return [trunk, colour, [Math.sin(a) * reach * .45, y, Math.cos(a) * reach * .45], [thick, reach, thick], [Math.cos(a) * 1.05, 0, -Math.sin(a) * 1.05]];
  });

  // White oak: pale scaly bark, low heavy limbs, a crown wider than it is tall.
  shapes['white-oak'] = mergedGeometry([stem(0x8f887b, 7, .75), ...limbs(0x857e71, 5, 5.2, 6, .32),
    ...puffs([0x5c7f3e, 0x547737, 0x668845], 8, 8.2, 4.8, 3.4, .62)]);
  // Red oak: darker striped bark, taller and less spread, the crown a little redder.
  shapes['red-oak'] = mergedGeometry([stem(0x4d4640, 9, .62), ...limbs(0x4a433d, 4, 7, 4.5, .26),
    ...puffs([0x5a7a38, 0x6e7a36, 0x4f6f33], 7, 10, 3.6, 3.1, .7)]);
  // Tulip poplar: the tallest thing in the wood, a dead straight grey column, crown held high.
  shapes['tulip-poplar'] = mergedGeometry([stem(0x7d7c72, 16, .6), ...puffs([0x6c9a45, 0x76a34d, 0x5f8c3d], 6, 17, 2.4, 2.6, 1.1),
    ...Array.from({ length: 5 }, (_, i) => [ball, 0xe0a044, [Math.sin(i * PHI) * 2.4, 17.5 + (i % 2), Math.cos(i * PHI) * 2.4], [.28, .22, .28]])]);
  // Shagbark hickory: long loose plates of bark curling off a straight trunk.
  shapes.hickory = mergedGeometry([stem(0x5e574d, 10, .5),
    ...Array.from({ length: 10 }, (_, i) => [slab, 0x6e665a, [Math.sin(i * PHI) * .5, 1.5 + (i % 5) * 1.6, Math.cos(i * PHI) * .5], [.18, 1.4, .05], [0, i * PHI, (i % 2 ? .2 : -.2)]]),
    ...puffs([0x587b36, 0x62843e], 6, 11, 3, 2.8, .8)]);
  // Beech: smooth elephant-grey bark and a low dense crown, dead leaves hanging on.
  shapes.beech = mergedGeometry([stem(0xa4a49c, 6, .55), ...limbs(0x9b9b93, 4, 4.5, 4, .22),
    ...puffs([0x7a9a4a, 0x8a9a52, 0xb89a5a], 7, 7, 3.6, 3, .72)]);
  // Red maple: slim grey trunk, a rounded crown flushed with red.
  shapes['red-maple'] = mergedGeometry([stem(0x80807a, 7, .38), ...puffs([0xa8402c, 0x8f3a2a, 0x6f8a3c], 6, 8, 2.6, 2.5, .85)]);
  // Sweetgum: a narrow crown of star leaves, and the spiked seed balls hanging in it.
  shapes.sweetgum = mergedGeometry([stem(0x5a5048, 10, .45), ...puffs([0x5d8a3a, 0x7a8a34], 6, 10, 2.2, 2.3, 1.05),
    ...Array.from({ length: 8 }, (_, i) => [ball, 0x5a4a30, [Math.sin(i * PHI) * 2.1, 9 + (i % 4) * .8, Math.cos(i * PHI) * 2.1], [.14, .14, .14]])]);
  // Sycamore: white patchwork limbs by the water, a spread of big pale leaves.
  shapes.sycamore = mergedGeometry([stem(0xd9d4c4, 8, .7), ...limbs(0xeae6d8, 5, 6.5, 6, .3),
    ...Array.from({ length: 6 }, (_, i) => [slab, 0x9a9278, [Math.sin(i * PHI) * .7, 1 + i * 1.1, Math.cos(i * PHI) * .7], [.5, .6, .05], [0, i * PHI, 0]]),
    ...puffs([0x7fa050, 0x8aa85a], 7, 10, 4.2, 3, .7)]);
  // Bald cypress: a flared, fluted foot standing in the water, knees round it, a feathery spire.
  shapes['bald-cypress'] = mergedGeometry([stem(0x7a5a44, 11, .5), [trunk, 0x6d503c, [0, 1, 0], [1.3, 2, 1.3]],
    ...Array.from({ length: 6 }, (_, i) => [cone, 0x6d503c, [Math.sin(i * 1.05) * 2.2, .35, Math.cos(i * 1.05) * 2.2], [.18, .7, .18]]),
    [cone, 0x6e8a4a, [0, 11, 0], [3, 8, 3]], [cone, 0x7a9656, [0, 14, 0], [2, 5, 2]]]);
  // Loblolly pine: a long bare trunk and a high flat tuft of needles.
  shapes['loblolly-pine'] = mergedGeometry([stem(0x6a4f3a, 14, .45),
    ...Array.from({ length: 5 }, (_, i) => [crown, i % 2 ? 0x35573a : 0x3e6140, [Math.sin(i * PHI) * 1.8, 14.5 + (i % 2) * .8, Math.cos(i * PHI) * 1.8], [2.2, 1.1, 2.2]])]);
  // Red cedar: a dark narrow spire in the old field.
  shapes['red-cedar'] = mergedGeometry([stem(0x7a4b36, 2, .3), [cone, 0x2f4a33, [0, 4.5, 0], [1.6, 7, 1.6]], [cone, 0x355337, [0, 6.8, 0], [1.1, 4, 1.1]]]);
  // Holly: a dark glossy cone in the understorey, red berries.
  shapes.holly = mergedGeometry([stem(0x8a8a82, 1.5, .18), [cone, 0x1f4a2e, [0, 3.2, 0], [1.6, 4.6, 1.6]],
    ...Array.from({ length: 14 }, (_, i) => [ball, 0xc2282a, [Math.sin(i * PHI) * (1.2 - i * .05), 1.8 + i * .2, Math.cos(i * PHI) * (1.2 - i * .05)], [.08, .08, .08]])]);
  // Dogwood: a small spreading understorey tree, flat layers of white flower.
  shapes.dogwood = mergedGeometry([stem(0x4f463e, 2.2, .16), ...limbs(0x4a423a, 4, 2, 2.4, .08),
    ...Array.from({ length: 12 }, (_, i) => [crown, i % 3 ? 0xf2efe6 : 0x7a9a4e, [Math.sin(i * PHI) * (.6 + (i % 4) * .5), 2.8 + (i % 3) * .5, Math.cos(i * PHI) * (.6 + (i % 4) * .5)], [.7, .22, .7]])]);
  // Persimmon: blocky dark bark like an alligator's back, orange fruit.
  shapes.persimmon = mergedGeometry([stem(0x2e2a26, 6, .35),
    ...Array.from({ length: 8 }, (_, i) => [slab, 0x25221f, [Math.sin(i * PHI) * .36, .8 + i * .6, Math.cos(i * PHI) * .36], [.2, .25, .08], [0, i * PHI, 0]]),
    ...puffs([0x5f7f3a, 0x6a8a40], 5, 7, 2.2, 2.2, .85),
    ...Array.from({ length: 10 }, (_, i) => [ball, 0xe07a2a, [Math.sin(i * PHI) * 2, 6.2 + (i % 3) * .6, Math.cos(i * PHI) * 2], [.16, .15, .16]])]);
  // Black walnut: dark ridged trunk, open airy crown, green husked nuts.
  shapes['black-walnut'] = mergedGeometry([stem(0x2f2a26, 9, .55), ...limbs(0x2c2723, 4, 7, 4.5, .24),
    ...puffs([0x6f9446, 0x7a9c4c], 6, 10, 3.4, 2.6, .6),
    ...Array.from({ length: 8 }, (_, i) => [ball, 0x9ab04a, [Math.sin(i * PHI) * 3, 9 + (i % 3) * .5, Math.cos(i * PHI) * 3], [.22, .22, .22]])]);
  trunk.dispose(); crown.dispose(); cone.dispose(); ball.dispose(); slab.dispose();
  return shapes;
}

/**
 * The specimen trees, in world metres. Each stands where its kind grows; the
 * test checks that every one of them has room for its trunk and a person.
 */
export const SPECIMEN_TREES = Object.freeze([
  ['white-oak', -84, 44], ['white-oak', -150, 18], ['red-oak', -116, 50], ['tulip-poplar', -72, 14], ['tulip-poplar', -140, 58],
  ['hickory', -100, 60], ['beech', -126, 14], ['red-maple', -88, -4], ['sweetgum', -160, 44],
  ['sycamore', -108, -8], ['sycamore', -528, 160], ['bald-cypress', -545, 187, true], ['loblolly-pine', -398, 20], ['loblolly-pine', -452, 64],
  ['red-cedar', -412, 72], ['red-cedar', -190, 52], ['holly', -94, 38], ['dogwood', -60, 52], ['dogwood', -130, 45],
  ['persimmon', -454, 14], ['black-walnut', -58, 2],
].map(([species, x, z, water = false], i) => Object.freeze({ id: `${species}-${i + 1}`, species, x, z, water })));

/** How near the trunk the traveler must stand to look at it properly. */
export const TREE_REACH = 3.4;

export function createDrentTrees(scene, world, { avoid = [] } = {}) {
  let disposed = false;
  const root = new THREE.Group(); root.name = 'Drent specimen trees'; scene.add(root);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .92, flatShading: true });
  const shapes = treeShapes();
  // A tree standing on somebody is left out, and so is one on ground nobody can
  // reach, unless it is the kind that stands in the river on purpose.
  const trees = SPECIMEN_TREES.filter(tree => (tree.water || canStand(tree.x, tree.z, world, .6))
    && avoid.every(p => Math.hypot(p.x - tree.x, p.z - tree.z) > 4))
    .map((tree, i) => ({ ...tree, name: PLANT_SPECIES[tree.species]?.name ?? tree.species, y: world.heightAt(tree.x, tree.z),
      yaw: i * PHI, scale: .9 + (i % 4) * .06 }));
  const groups = new Map();
  const dummy = new THREE.Object3D();
  for (const species of new Set(trees.map(tree => tree.species))) {
    const mine = trees.filter(tree => tree.species === species);
    const mesh = new THREE.InstancedMesh(shapes[species], material, mine.length);
    mesh.name = `${PLANT_SPECIES[species]?.name ?? species} trees`; mesh.castShadow = true; mesh.receiveShadow = true;
    mine.forEach((tree, i) => {
      dummy.position.set(tree.x, tree.y - .1, tree.z); dummy.rotation.set(0, tree.yaw, 0); dummy.scale.setScalar(tree.scale);
      dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere();
    root.add(mesh); groups.set(species, { mesh, trees: mine });
  }
  // Each trunk is a collider, so nobody walks through a tree they are meant to look at.
  const BROAD = new Set(['white-oak', 'sycamore', 'bald-cypress']);
  const colliders = trees.map(tree => ({ x: tree.x, z: tree.z, r: BROAD.has(tree.species) ? .85 : .5, kind: 'specimen-tree' }));

  return {
    colliders,
    /** The tree whose trunk the traveler is standing at, for the F prompt. */
    nearest(position, reach = TREE_REACH) {
      let best = null, gap = reach;
      for (const tree of trees) {
        const d = Math.hypot(tree.x - position.x, tree.z - position.z);
        if (d <= gap) { gap = d; best = tree; }
      }
      return best ? { id: best.id, species: best.species, name: best.name, x: best.x, z: best.z } : null;
    },
    /** Draw only what is near: a specimen tree past this is part of the wood again. */
    update(position, range = 150) {
      for (const { mesh, trees: mine } of groups.values()) mesh.visible = mine.some(tree => Math.hypot(tree.x - position.x, tree.z - position.z) < range);
    },
    state() { return { trees: trees.map(({ id, species, x, z }) => ({ id, species, x, z })), kinds: groups.size }; },
    dispose() {
      if (disposed) return; disposed = true; root.removeFromParent();
      root.traverse(object => { if (object.isInstancedMesh) object.dispose(); });
      for (const shape of Object.values(shapes)) shape.dispose();
      material.dispose();
    },
  };
}
