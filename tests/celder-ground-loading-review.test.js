import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as THREE from '../vendor/three.module.js';
import { scopedWorld } from './scoped-world.js';
import { REGION_IDS, regionAt } from '../src/world/terrain/region-world.js';

const scene = new THREE.Scene();
const world = await scopedWorld(scene, [REGION_IDS['South Celder']]);
scene.updateMatrixWorld(true);
const initialJobs = world.loading.state().jobs;
const isFine = mesh => mesh.parent === world.westLotharnGround.group && mesh.isMesh;
const fine = []; scene.traverse(mesh => { if (isFine(mesh)) fine.push(mesh); });
const coarse = scene.getObjectByName('The ground of Azhora').children.filter(mesh => mesh.isMesh);
for (const mesh of [...fine, ...coarse]) mesh.geometry.computeBoundingBox();
const ray = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0));
function drawn(meshes, x, z) {
  ray.ray.origin.set(x, 2000, z);
  return ray.intersectObjects(meshes.filter(mesh => {
    const b = mesh.geometry.boundingBox;
    return x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z;
  }), false)[0]?.point.y ?? -Infinity;
}
// Independently surveyed production retained-mask centres, including its
// strongest sunk coarse cell now owned by South Celder. Neither is a cave cut.
const sites = [[-2051.501928, -847.127944], [-2087.501928, -886.127944], [-2450, -750.5]];
const heights = sites.map(([x, z]) => world.renderedGroundHeight(x, z));
const south = world.southCelder.root;
assert.ok(south, 'the actual South Celder scenery is loaded');
function instancesDigest() {
  const hash = createHash('sha256'); let count = 0;
  south.traverse(mesh => {
    if (!mesh.isInstancedMesh) return;
    count += mesh.count; hash.update(mesh.name);
    for (const values of [mesh.instanceMatrix.array, mesh.instanceColor?.array])
      if (values) hash.update(Buffer.from(values.buffer, values.byteOffset, values.byteLength));
  });
  return { count, hash: hash.digest('hex') };
}
const before = instancesDigest();
const treeIds = world.treeRegistry.trees.filter(tree => tree.id.startsWith('south-celder')).map(tree => tree.id);

test('South Celder first arrival owns retained ground before its neighboring scenery loads', t => {
  assert.equal(initialJobs.find(job => job.id === 'westLotharnGround').status, 'ready');
  assert.equal(initialJobs.find(job => job.id === 'westLotharn').status, 'pending');
  assert.equal(world.loading.isReady(REGION_IDS['West Lotharn Mountains']), false);
  assert.ok(fine.length > 20);
  const rows = sites.map(([x, z]) => ({ x, z, owner: regionAt(x, z)?.name,
    coarse: drawn(coarse, x, z), fine: drawn(fine, x, z), sampled: world.renderedGroundHeight(x, z) }));
  t.diagnostic(JSON.stringify(rows));
  for (const row of rows) {
    assert.equal(row.owner, 'South Celder');
    const top = Math.max(row.coarse, row.fine);
    assert.ok(Number.isFinite(top));
    assert.ok(Math.abs(row.sampled - top) < .002, JSON.stringify(row));
    assert.ok(Math.abs(world.westLotharnGround.renderedGroundHeight(row.x, row.z) - top) < .002);
  }
  assert.ok(rows[0].fine > rows[0].coarse + 10, 'the independently measured sunk cell needs the retained surface');
});

test('Celder plants follow the visible top in both coarse and retained terrain', t => {
  let checked = 0, retained = 0, coarseTop = 0, maxGap = 0;
  south.traverse(mesh => {
    if (!mesh.isInstancedMesh || !/grass|turf|sedge/.test(mesh.name)) return;
    const m = mesh.instanceMatrix.array;
    for (let i = 0; i < mesh.count; i++) {
      const x = m[i * 16 + 12], y = m[i * 16 + 13], z = m[i * 16 + 14];
      // Concentrate actual triangle probes on the newly owned overlap, plus a
      // regular sample of the wider plain where the coarse surface is highest.
      if (!(x > -2520 && x < -2040 && z > -895 && z < -510) && i % 37) continue;
      const a = drawn(coarse, x, z), b = drawn(fine, x, z), top = Math.max(a, b);
      if (b > a) retained++; else coarseTop++;
      checked++; maxGap = Math.max(maxGap, Math.abs(y + .03 - top));
    }
  });
  t.diagnostic(JSON.stringify({ checked, retained, coarseTop, maxGap }));
  assert.ok(retained > 0 && coarseTop > 0, 'both displayed surface owners must be exercised');
  // Instance x/z are Float32; interpolation from that rounded position can
  // differ slightly from the authored double-precision planting coordinate.
  assert.ok(maxGap < .015, `largest actual planted-root gap ${maxGap}`);
});

test('later West Lotharn arrival reuses the shared surface and keeps existing Celder instances', async t => {
  const priorFrame = globalThis.requestAnimationFrame, priorCancel = globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame = fn => setTimeout(() => fn(performance.now()), 0);
  globalThis.cancelAnimationFrame = clearTimeout;
  try { await world.loading.ensureRegion(REGION_IDS['West Lotharn Mountains']); }
  finally {
    world.loading.stop();
    if (priorFrame === undefined) delete globalThis.requestAnimationFrame; else globalThis.requestAnimationFrame = priorFrame;
    if (priorCancel === undefined) delete globalThis.cancelAnimationFrame; else globalThis.cancelAnimationFrame = priorCancel;
  }
  const after = []; scene.traverse(mesh => { if (isFine(mesh)) after.push(mesh); });
  assert.equal(after.length, fine.length);
  for (let i = 0; i < fine.length; i++) assert.equal(after[i], fine[i]);
  assert.deepEqual(sites.map(([x, z]) => world.renderedGroundHeight(x, z)), heights);
  assert.deepEqual(instancesDigest(), before);
  assert.deepEqual(world.treeRegistry.trees.filter(tree => tree.id.startsWith('south-celder')).map(tree => tree.id), treeIds);
  assert.ok(treeIds.length > 20);
  t.diagnostic(JSON.stringify({ fineMeshes: fine.length, trees: treeIds.length, ...before }));
});
