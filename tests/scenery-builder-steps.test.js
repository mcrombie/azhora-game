import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
const { createSceneryBuilder } = await sourceModule('../src/world/scenery/scenery-builder.js');

function consume(iterator) {
  let next;
  do { next = iterator.next(); } while (!next.done);
  return next.value;
}

test('cooperative paving preserves terrain samples and publishes its merged mesh only when complete', () => {
  const full = createSceneryBuilder('Paved hill'), fast = createSceneryBuilder('Paved hill');
  const ground = (x, z) => Math.sin(x * .1) * 2 + z * .02;
  const args = ['#ad9876', ground, 5, 8, 40, 50, .3, .04, 32];
  full.patch(...args);
  const patch = fast.patchSteps(...args);
  assert.equal(patch.next().done, false);
  consume(patch);
  assert.equal(fast.vertexCount, full.vertexCount);
  const parent = new THREE.Group(), fullParent = new THREE.Group();
  const expected = full.finish(fullParent);
  const steps = fast.finishSteps(parent);
  assert.equal(steps.next().done, false);
  assert.equal(parent.children.length, 0);
  const actual = consume(steps);
  assert.deepEqual(parent.children, [actual]);
  for (const key of ['position', 'normal', 'color']) {
    assert.deepEqual(actual.geometry.attributes[key].array, expected.geometry.attributes[key].array);
  }
  // Compare with Three's own bound computation, independently of both wrappers.
  const sphere = actual.geometry.boundingSphere.clone();
  actual.geometry.computeBoundingSphere();
  assert.deepEqual(actual.geometry.boundingSphere, sphere);
});
