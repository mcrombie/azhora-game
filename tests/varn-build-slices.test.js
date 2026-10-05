import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';

const { createVarnScenerySteps } = await sourceModule('../src/varn-scenery.js');

test('Varn bounds its ground construction slices without changing fortress geometry or admission colliders', t => {
  const root = new THREE.Group(), colliders = []; let reads = 0;
  const iter = createVarnScenerySteps({ root, scene: root, groundHeight: () => { reads++; return 0; }, colliders,
    material: (color, extra = {}) => new THREE.MeshStandardMaterial({ color, ...extra }) });
  let step, maximum = 0, total = 0, yields = 0, longest = 0;
  do {
    reads = 0; const started = performance.now(); step = iter.next();
    longest = Math.max(longest, performance.now() - started); maximum = Math.max(maximum, reads); total += reads; yields++;
  } while (!step.done);
  const hash = createHash('sha256');
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    hash.update(mesh.name);
    for (const [name, attribute] of Object.entries(mesh.geometry.attributes)) {
      hash.update(name); hash.update(Buffer.from(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength));
    }
    if (mesh.geometry.index) hash.update(Buffer.from(mesh.geometry.index.array.buffer));
    hash.update(JSON.stringify(mesh.matrix.elements));
  });
  hash.update(JSON.stringify(colliders)); hash.update(JSON.stringify(step.value.metrics));
  assert.equal(hash.digest('hex'), '4627cbbcfe707e8e3f881987db2c139d0543f367e065737d38986706a1eb9e20');
  assert.equal(total, 15859, 'same physical-ground sampling work');
  assert.ok(maximum <= 128, 'no construction step retains the former 1,304-query block: ' + maximum);
  assert.ok(yields > 600, 'height, triangle-paint and cliff construction release the loader');
  t.diagnostic(JSON.stringify({ maximum, total, yields, longestSliceMs: longest }));
});
