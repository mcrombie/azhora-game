import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { sourceModule } from './module-loader.js';
import * as THREE from '../vendor/three.module.js';
import { groundWithRiver } from '../src/world-terrain.js';
import { FERADOM_BOX } from '../src/feradom-world.js';
import { FARMSTEADS, regionalFarmlandClear } from '../src/regional-farmland.js';

const { createFeradomScenery } = await sourceModule('../src/feradom-scenery.js');
const { getTreeRegistry } = await sourceModule('../src/tree-registry.js');

// Construct only the production Feradom scenery, with its real terrain and colliders.
// Read its actual indexed triangles independently of the tree's placement callback.
const scene = new THREE.Group(), colliders = [];
const scenery = createFeradomScenery({ root: scene, groundHeight: groundWithRiver, colliders,
  material: (color, options = {}) => new THREE.MeshStandardMaterial({ color, ...options }),
  dummy: new THREE.Object3D(), color: new THREE.Color(), round: new THREE.IcosahedronGeometry(1, 0) });
scene.updateMatrixWorld(true);
const registry = getTreeRegistry(colliders), { minX, minZ } = FERADOM_BOX, cells = new Map(), STEP = 3;
for (const mesh of scenery.group.children.filter(child => child.name === 'Feradom barrier hills ground')) {
  const positions = mesh.geometry.attributes.position, indices = mesh.geometry.index.array;
  for (let i = 0; i < indices.length; i += 6) {
    const a = indices[i], b = indices[i + 1], c = indices[i + 2], d = indices[i + 5];
    const vertex = index => [positions.getX(index), positions.getY(index), positions.getZ(index)];
    const ix = Math.round((positions.getX(a) - minX) / STEP), iz = Math.round((positions.getZ(a) - minZ) / STEP);
    cells.set(`${ix},${iz}`, [vertex(a), vertex(b), vertex(c), vertex(d)]);
  }
}
function surface(x, z) {
  const cell = cells.get(`${Math.floor((x - minX) / STEP)},${Math.floor((z - minZ) / STEP)}`);
  if (!cell) return null;
  const [a, b, c, d] = cell, u = (x - a[0]) / (c[0] - a[0]), v = (z - a[2]) / (b[2] - a[2]);
  return u + v <= 1 ? a[1] + (c[1] - a[1]) * u + (b[1] - a[1]) * v
    : d[1] + (b[1] - d[1]) * (1 - u) + (c[1] - d[1]) * (1 - v);
}

test('Feradom tree roots meet the actual rendered hill triangles across the entire trunk footprint', t => {
  const matrix = new THREE.Matrix4(), p = new THREE.Vector3(), gaps = [];
  let coarseEdge = 0, checked = 0;
  for (const trunks of scenery.group.children.filter(child => child.isInstancedMesh && child.geometry.parameters?.radiusTop === .18)) {
    const vertices = trunks.geometry.attributes.position;
    for (let i = 0; i < trunks.count; i++) {
      trunks.getMatrixAt(i, matrix); matrix.premultiply(trunks.matrixWorld);
      let highest = -Infinity, onFineGround = true; checked++;
      for (let j = 0; j < vertices.count; j++) {
        if (Math.abs(vertices.getY(j) + .5) > 1e-6) continue;
        p.fromBufferAttribute(vertices, j).applyMatrix4(matrix);
        const y = surface(p.x, p.z);
        if (y === null) onFineGround = false;
        else highest = Math.max(highest, p.y - y);
      }
      if (onFineGround) gaps.push({ highest, x: matrix.elements[12], z: matrix.elements[14] });
      else coarseEdge++;
    }
  }
  assert.equal(checked, registry.trees.length);
  assert.ok(gaps.length > registry.trees.length * .95);
  const floating = gaps.filter(item => item.highest > .02), buried = gaps.filter(item => item.highest < -.04);
  t.diagnostic(JSON.stringify({ trees: gaps.length, coarseEdge, floating: floating.length, buried: buried.length,
    worst: [...gaps].sort((a, b) => b.highest - a.highest).slice(0, 3) }));
  assert.equal(floating.length, 0, 'no exposed root above the actual drawn ground');
  assert.equal(buried.length, 0, 'grounding leaves a visible trunk instead of burying it');
});

test('Feradom grounding keeps existing tree identities, species, harvest behavior and farmland clearances', t => {
  const facts = registry.trees.map(({ id, x, z, height, species }) => [id, x, z, height, species]);
  const identity = createHash('sha256').update(JSON.stringify(facts)).digest('hex');
  t.diagnostic(`Tree identity baseline: ${facts.length} / ${identity}`);
  // Captured before this grounding correction: vertical placement must not reroll
  // a saved tree or alter its species, height, or every seeded prop after it.
  assert.equal(facts.length, 3730);
  assert.equal(identity, '03cbb57000457a36be3a7f368e262bd4996a2a3f4d24150bcbf6a4a5e19b552e');
  assert.equal(new Set(facts.map(row => row[0])).size, facts.length);
  assert.deepEqual(new Set(registry.trees.map(tree => tree.species)), new Set(['white-oak', 'silver-fir']));
  assert.equal(FARMSTEADS.filter(farm => farm.region === 'Feradom').length, 7);
  for (const tree of registry.trees) assert.equal(regionalFarmlandClear(tree.x, tree.z, 3), false, tree.id);
  const tree = registry.trees[0], neighbor = registry.trees[1], blocker = colliders.find(c => c.id === tree.id);
  assert.ok(tree.harvestable && neighbor.harvestable && blocker);
  assert.equal(registry.set(tree.id, false), true);
  assert.equal(colliders.includes(blocker), false);
  assert.ok(colliders.some(c => c.id === neighbor.id));
  assert.equal(registry.set(tree.id, true), true);
  assert.ok(colliders.includes(blocker));
});
