import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { sourceModule } from './module-loader.js';
import * as THREE from '../vendor/three.module.js';
import { groundWithRiver } from '../src/world-terrain.js';
import { TELEMONIA_BOX } from '../src/telemonia-world.js';
import { telemoniaGeometryHash } from './telemonia-geometry-hash.js';

const { createTelemoniaScenerySteps } = await sourceModule('../src/telemonia-scenery.js');
const { getTreeRegistry } = await sourceModule('../src/tree-registry.js');
const scene = new THREE.Group(), colliders = [];
const started = performance.now();
const iterator = createTelemoniaScenerySteps({ root: scene, groundHeight: groundWithRiver, colliders,
  material: (color, options = {}) => new THREE.MeshStandardMaterial({ color, ...options }),
  dummy: new THREE.Object3D(), color: new THREE.Color(), round: new THREE.IcosahedronGeometry(1, 0) });
let next, steps = 0, longestSliceMs = 0;
const slowSlices = [];
do {
  const before = scene.children[0]?.children.at(-1)?.name ?? 'initial';
  const stepStart = performance.now();
  next = iterator.next(); steps++;
  const elapsed = performance.now() - stepStart;
  longestSliceMs = Math.max(longestSliceMs, elapsed);
  if (elapsed > 20) slowSlices.push({ step: steps, ms: +elapsed.toFixed(1), before,
    after: scene.children[0]?.children.at(-1)?.name ?? 'initial' });
  if (steps === 1) {
    assert.equal(next.done, false, 'The background builder returns control before construction finishes');
    assert.equal(scene.children[0].children.length, 0, 'The first pause happens before expensive geometry');
  }
} while (!next.done);
const scenery = next.value;
const constructionMs = performance.now() - started;
scene.updateMatrixWorld(true);
const registry = getTreeRegistry(colliders), cells = new Map(), STEP = 1.5;
const { minX, minZ } = TELEMONIA_BOX;
for (const mesh of scenery.group.children.filter(child => child.name === 'Telemonia ground')) {
  const pos = mesh.geometry.attributes.position, indices = mesh.geometry.index.array;
  for (let i = 0; i < indices.length; i += 6) {
    const a = indices[i], b = indices[i + 1], c = indices[i + 2], d = indices[i + 5];
    const vertex = j => [pos.getX(j), pos.getY(j), pos.getZ(j)];
    cells.set(`${Math.round((pos.getX(a) - minX) / STEP)},${Math.round((pos.getZ(a) - minZ) / STEP)}`,
      [vertex(a), vertex(b), vertex(c), vertex(d)]);
  }
}
function surface(x, z) {
  const cell = cells.get(`${Math.floor((x - minX) / STEP)},${Math.floor((z - minZ) / STEP)}`);
  assert.ok(cell, `Tree root has visible ground at ${x},${z}`);
  const [a, b, c, d] = cell, u = (x - a[0]) / STEP, v = (z - a[2]) / STEP;
  return u + v <= 1 ? a[1] + (c[1] - a[1]) * u + (b[1] - a[1]) * v
    : d[1] + (b[1] - d[1]) * (1 - u) + (c[1] - d[1]) * (1 - v);
}

test('Telemonia tree feet touch the terrain triangles the player actually sees', t => {
  const matrix = new THREE.Matrix4(), p = new THREE.Vector3(), gaps = [];
  for (const mesh of scenery.group.children.filter(child => child.isInstancedMesh && child.geometry.parameters?.radiusBottom === .24)) {
    const pos = mesh.geometry.attributes.position;
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix); matrix.premultiply(mesh.matrixWorld);
      let gap = -Infinity;
      for (let j = 0; j < pos.count; j++) {
        if (Math.abs(pos.getY(j) + .5) > 1e-6) continue;
        p.fromBufferAttribute(pos, j).applyMatrix4(matrix);
        gap = Math.max(gap, p.y - surface(p.x, p.z));
      }
      gaps.push({ gap, x: matrix.elements[12], z: matrix.elements[14] });
    }
  }
  assert.equal(gaps.length, registry.trees.length);
  assert.ok(gaps.length > 0);
  const floating = gaps.filter(item => item.gap > .02);
  t.diagnostic(JSON.stringify({ constructionMs: Math.round(constructionMs), trees: gaps.length,
    floating: floating.length, worst: [...gaps].sort((a, b) => b.gap - a.gap).slice(0, 3), metrics: scenery.metrics }));
  assert.equal(floating.length, 0, 'No unsupported trunk feet');
  assert.ok(gaps.every(item => item.gap > -.04), 'Trunks remain visible above the soil');
});

test('cooperative scenery construction keeps the established country layout', t => {
  t.diagnostic(JSON.stringify({ steps, constructionMs: Math.round(constructionMs), longestSliceMs, slowSlices }));
  assert.ok(steps > 100, 'The large ground, wall and vegetation loops relinquish control throughout the build');
  assert.deepEqual(scenery.metrics, { batches:59, groundVertices:109356, terraceWalls:181,
    terraceWallMetres:5461, checkWalls:24, wallMetres:5849.522245630142, wallStones:43362,
    wayWallMetres:203.66098736480404, rockLedgeStones:51, tufts:8006, shrubs:3611,
    wormwood:1777, thorn:961, trees:94, oaks:63, junipers:13, pines:18, belkethTrees:62,
    rocks:1400, talus:254, washStones:501, gravel:0, wall:26, underTown:2940 });
});

test('Telemonia trees retain registered species and stable identities', t => {
  const facts = registry.trees.map(({ id, x, z, height, species }) => [id, x, z, height, species]);
  const hash = createHash('sha256').update(JSON.stringify(facts)).digest('hex');
  t.diagnostic(`${facts.length} trees / ${hash}`);
  assert.equal(facts.length, 94);
  assert.equal(hash, '2b64c19d33672f9a76c60ed86595618ad9119f26b63a049795f0b8686cace68b');
  assert.equal(new Set(facts.map(f => f[0])).size, facts.length);
  assert.deepEqual(new Set(registry.trees.map(tree => tree.species)), new Set(['holm-oak', 'common-juniper', 'stone-pine']));
});

test('extracting shared Telemonia ground preserves every geometry byte and existing collider', () => {
  // Captured from the complete standalone builder before R9's extraction.
  assert.equal(telemoniaGeometryHash(scene), '6596c5e409f4131224a7a4452371810c2681ca1fbd2c4dedfee1fc3adc9f393b');
  assert.equal(telemoniaGeometryHash(scene, mesh => mesh.name === 'Telemonia ground'), 'fb20c3ec49b85d0ab33479dc86fbdf8ae2774568445c2cbf139f84eacffed2a4');
  assert.equal(colliders.length, 120);
});
