import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { terrainRoadHeight } from '../src/world/terrain/terrain-road.js';
import { MOUNTAIN_PATCH, onRamp } from '../src/content/regions/west-lotharn/west-lotharn-world.js';

const { createWorld } = await sourceModule('../src/world.js');
const scene = new THREE.Scene(), world = createWorld(scene);
scene.updateMatrixWorld(true);
const forest = scene.getObjectByName('West Lotharn scenery');
const fineGround = scene.getObjectByName('West Lotharn fine ground');
const trees = world.treeRegistry.trees.filter(tree => tree.id.startsWith('west-lotharn-'));

// Read the actual drawn ground, including which summit triangles exist. This
// catches roots on the analytic heightfield but hovering above a rendered cliff.
const ground = scene.getObjectByName('The ground of the four regions').children[0].geometry.attributes.position.array;
const xs = [], zs = [];
for (let i = 0; ground[i + 2] === ground[2]; i += 3) xs.push(ground[i]);
for (let i = 0; i < ground.length; i += xs.length * 3) zs.push(ground[i + 2]);
const { minX, minZ, step } = MOUNTAIN_PATCH, cells = new Map();
for (const mesh of fineGround.children.filter(child => child.name === 'West Lotharn summits ground')) {
  const p = mesh.geometry.attributes.position, indices = mesh.geometry.index.array;
  for (let i = 0; i < indices.length; i += 6) {
    const a = indices[i], b = indices[i + 1], c = indices[i + 2], d = indices[i + 5];
    const ix = Math.round((p.getX(a) - minX) / step), iz = Math.round((p.getZ(a) - minZ) / step);
    cells.set(`${ix},${iz}`, [p.getY(a), p.getY(b), p.getY(c), p.getY(d)]);
  }
}
// Cave mouths replace whole coarse cells with a finer, cut-out surface. Include
// those actual triangles instead of mistaking the hidden base mesh for ground.
const mouthGround = fineGround.children.filter(child => child.name.startsWith('Ground at the mouth of '));
for (const mesh of mouthGround) mesh.geometry.computeBoundingBox();
const groundRay = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0));
const surface = (x, z) => {
  const gx = (x - minX) / step, gz = (z - minZ) / step, ix = Math.floor(gx), iz = Math.floor(gz);
  const cell = cells.get(`${ix},${iz}`);
  let y = terrainRoadHeight(x, z, xs, zs, ground, 0);
  if (cell) {
    const [a, b, c, d] = cell, u = gx - ix, v = gz - iz;
    y = u + v <= 1 ? a + (c - a) * u + (b - a) * v : d + (b - d) * (1 - u) + (c - d) * (1 - v);
  }
  for (const mesh of mouthGround) {
    const { min, max } = mesh.geometry.boundingBox;
    if (x < min.x || x > max.x || z < min.z || z > max.z) continue;
    groundRay.ray.origin.set(x, max.y + 1, z);
    const hit = groundRay.intersectObject(mesh, false)[0];
    if (hit) y = Math.max(y, hit.point.y);
  }
  return y;
};

test('every West Lotharn trunk has a persistent species and can be felled without removing its neighbours', t => {
  t.diagnostic(`${trees.length} registered trees across seven native woodland species`);
  assert.ok(trees.length > 2000, `${trees.length} trees preserve a substantial old forest`);
  const blockers = world.colliders.filter(c => c.kind === 'west-lotharn-tree');
  assert.equal(blockers.length, trees.length);
  assert.deepEqual(new Set(trees.map(tree => tree.species)), new Set(['white-oak', 'sweet-chestnut', 'red-maple', 'beech', 'hickory', 'black-walnut', 'tulip-poplar']));
  for (const blocker of blockers) {
    const tree = world.treeRegistry.get(blocker.id);
    assert.equal(tree.species, blocker.species); assert.ok(tree.log); assert.equal(tree.harvestable, true);
    assert.equal(onRamp(tree.x, tree.z, 1.5), false, `${tree.id} leaves hiking routes clear`);
  }
  const tree = trees[0], neighbour = trees[1], blocker = blockers.find(c => c.id === tree.id);
  assert.equal(world.treeRegistry.set(tree.id, false), true);
  assert.equal(world.colliders.includes(blocker), false);
  assert.ok(world.colliders.some(c => c.id === neighbour.id));
  world.treeRegistry.set(tree.id, true);
  assert.ok(world.colliders.includes(blocker));
});

test('West Lotharn tree roots meet the rendered ground on their whole footprint', () => {
  const matrix = new THREE.Matrix4(), root = new THREE.Vector3();
  let count = 0, upland = 0;
  for (const trunks of forest.children.filter(child => child.isInstancedMesh && child.geometry.parameters?.radiusTop === .2)) {
    const vertices = trunks.geometry.attributes.position;
    for (let i = 0; i < trunks.count; i++) {
      trunks.getMatrixAt(i, matrix);
      // A tree lifted off ground a fort was built on afterwards (src/world/scenery/scenery-clearing.js) is an instance scaled to
      // nothing, and is struck off the register too: it is not there, so it has no roots to check.
      if (matrix.elements[0] === 0 && matrix.elements[5] === 0 && matrix.elements[10] === 0) continue;
      matrix.premultiply(trunks.matrixWorld);
      const gaps = [];
      for (let j = 0; j < vertices.count; j++) {
        if (Math.abs(vertices.getY(j) + .5) > 1e-6) continue;
        root.fromBufferAttribute(vertices, j).applyMatrix4(matrix);
        gaps.push(root.y - surface(root.x, root.z));
      }
      const highest = Math.max(...gaps);
      assert.ok(highest < -.02 && highest > -.04, `trunk ${i} at ${root.x},${root.z} floats ${highest}m above its drawn ground`);
      count++; if (root.y > 150) upland++;
    }
  }
  assert.equal(count, trees.length); assert.ok(upland > 100, `${upland} trees checked on mountain ledges`);
  assert.ok(Math.min(...trees.map(tree => tree.height)) < 6, 'young trees break up the mature canopy');
  assert.ok(Math.max(...trees.map(tree => tree.height)) > 18, 'some old-growth trees still tower over saplings');
});
