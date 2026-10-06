import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as THREE from '../vendor/three.module.js';
import { refineSouthOremindiGround, refineSouthOremindiGroundSteps } from '../src/content/regions/south-oremindi/south-oremindi-ground.js';
import { refineBaldroGround, refineBaldroGroundSteps } from '../src/content/regions/baldro/baldro-ground.js';
import { BALDRO_KINGDOMS } from '../src/content/regions/baldro/baldro-world.js';
import { ibenwoodForestTrees, ibenwoodForestTreesSteps } from '../src/content/regions/ibenwood/ibenwood-environment.js';

const plane = (x, z) => 32 + x * .003 + z * .002;
const mountain = (x, z) => plane(x, z) + 12 + Math.sin(x * .05) * 8;
function terrain(centre) {
  const root = new THREE.Group(), positions = [], indices = [], count = 21;
  for (let j = 0; j < count; j++) for (let i = 0; i < count; i++) {
    const x = centre.x - 70 + i * 7, z = centre.z - 70 + j * 7;
    positions.push(x, plane(x, z), z);
  }
  for (let j = 0; j < count - 1; j++) for (let i = 0; i < count - 1; i++) {
    const k = j * count + i; indices.push(k, k + count, k + 1, k + 1, k + count, k + count + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  root.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()));
  return { THREE, terrainRoot: root, heightAt: mountain, coarseHeightAt: plane };
}
function meshDigest(root) {
  const hash = createHash('sha256');
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    for (const attribute of [...Object.values(mesh.geometry.attributes), mesh.geometry.index]) {
      const a = attribute.array; hash.update(Buffer.from(a.buffer, a.byteOffset, a.byteLength));
    }
  });
  return hash.digest('hex');
}

for (const [name, centre, sync, stepped] of [
  ['South Oremindi', { x: -3490, z: -320 }, refineSouthOremindiGround, refineSouthOremindiGroundSteps],
  ['Baldro', BALDRO_KINGDOMS[0].gate, refineBaldroGround, refineBaldroGroundSteps],
]) test(`${name} terrain can pause throughout refinement and resumes to identical ground and foot support`, async () => {
  const expectedKit = terrain(centre), expected = sync(expectedKit), actualKit = terrain(centre);
  const iterator = stepped(actualKit);
  assert.equal(actualKit.terrainRoot.children.length, 1, 'creating an iterator must not build its terrain');
  let step, pauses = 0;
  do {
    step = iterator.next();
    if (!step.done) { pauses++; if (pauses % 20 === 0) await new Promise(resolve => setImmediate(resolve)); }
  } while (!step.done);
  assert.ok(pauses > 20, `construction offers ${pauses} scheduling points`);
  assert.ok(expected.metrics.removedTriangles > 0);
  assert.deepEqual(step.value.metrics, expected.metrics);
  assert.equal(meshDigest(actualKit.terrainRoot), meshDigest(expectedKit.terrainRoot));
  for (const dx of [-40, -20, 0, 20, 40]) for (const dz of [-40, -20, 0, 20, 40])
    assert.equal(step.value.heightAt(centre.x + dx, centre.z + dz), expected.heightAt(centre.x + dx, centre.z + dz));
});

test('pausing Ibenwood generation retains every seeded tree identity and species', async () => {
  const expected = ibenwoodForestTrees(), iterator = ibenwoodForestTreesSteps();
  let step, pauses = 0;
  do {
    step = iterator.next();
    if (!step.done) { pauses++; if (pauses % 50 === 0) await new Promise(resolve => setImmediate(resolve)); }
  } while (!step.done);
  assert.ok(pauses > 100);
  assert.ok(expected.length > 20000);
  assert.deepEqual(step.value, expected);
});
