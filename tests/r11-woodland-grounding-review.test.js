import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { hexOwnerAt } from '../src/region-world.js';

const baseline = process.env.AZHORA_CAPTURE_R11 === '1';
const regions = new Set(['Drent', 'Luscia', 'Moros Plain', 'West Suval']);
const { createWorld } = await sourceModule('../src/world.js');
const scene = new THREE.Scene();
const oldFrame = globalThis.requestAnimationFrame, oldCancel = globalThis.cancelAnimationFrame;
globalThis.requestAnimationFrame = callback => setTimeout(() => callback(performance.now()), 0);
globalThis.cancelAnimationFrame = clearTimeout;
let world, firstFine, firstTrees, firstSupport;
const fineMeshes = () => { const result = []; scene.traverse(mesh => { if (mesh.name === 'Suval switchback ground') result.push(mesh); }); return result; };
const supportPoints = [{ x: -499.083819, z: 597.812487 }, { x: -490.788522, z: 590.511195 }];
function supportSnapshot() {
  scene.updateMatrixWorld(true);
  const meshes = []; scene.traverse(mesh => { if (mesh.name.startsWith('Terrain ') || mesh.name === 'Suval switchback ground' || mesh.name === 'Suval exposed limestone faces') meshes.push(mesh); });
  return supportPoints.map(p => {
    const hit = new THREE.Raycaster(new THREE.Vector3(p.x, 500, p.z), new THREE.Vector3(0, -1, 0)).intersectObjects(meshes, false)[0];
    assert.ok(hit, JSON.stringify(p));
    return { ...p, drawn: hit.point.y, physical: world.groundHeight(p.x, p.z) };
  });
}
try {
  world = createWorld(scene, { loadingMode: 'fast', initialRegion: 2 });
  await world.loading.ensureRegion(2); world.loading.stop();
  firstFine = fineMeshes();
  firstSupport = supportSnapshot();
  firstTrees = world.treeRegistry.trees.filter(tree => tree.region === 'Luscia').map(tree => [tree.id, tree.y]);
  await Promise.all([1, 3, 5].map(id => world.loading.ensureRegion(id)));
} finally {
  world?.loading.stop();
  if (oldFrame === undefined) delete globalThis.requestAnimationFrame; else globalThis.requestAnimationFrame = oldFrame;
  if (oldCancel === undefined) delete globalThis.cancelAnimationFrame; else globalThis.cancelAnimationFrame = oldCancel;
}
scene.updateMatrixWorld(true);
const selected = tree => (regions.has(tree.region) && /^(country-|drent-peninsula-)/.test(tree.id))
  || /^(west-suval-olive-|west-suval-hawthorn-|solis-orange-)/.test(tree.id);
const trees = world.treeRegistry.trees.filter(selected), treeCells = new Map();
for (const tree of trees) {
  const key = `${Math.floor(tree.x / 2)},${Math.floor(tree.z / 2)}`;
  if (!treeCells.has(key)) treeCells.set(key, []); treeCells.get(key).push(tree);
}
const treeAt = (x, z) => {
  const ix = Math.floor(x / 2), iz = Math.floor(z / 2);
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++)
    for (const tree of treeCells.get(`${ix + dx},${iz + dz}`) ?? []) if (Math.hypot(tree.x - x, tree.z - z) < .003) return tree;
  return null;
};
const tiles = scene.getObjectByName('The ground of Azhora').children.filter(mesh => mesh.name.startsWith('Terrain ')).map(mesh => {
  const p = mesh.geometry.attributes.position;
  let columns = 1; while (columns < p.count && p.getX(columns) !== p.getX(0)) columns++;
  assert.deepEqual([...mesh.geometry.index.array.slice(0, 6)], [0, columns, 1, 1, columns, columns + 1]);
  return { p, columns, xs: Array.from({ length: columns }, (_, i) => p.getX(i)),
    zs: Array.from({ length: p.count / columns }, (_, i) => p.getZ(i * columns)) };
});
const below = (axis, value) => { let a = 0, b = axis.length - 1; while (b - a > 1) { const c = (a + b) >> 1; if (axis[c] <= value) a = c; else b = c; } return a; };
function coarseHeight(x, z) {
  const tile = tiles.find(t => x >= t.xs[0] && x <= t.xs.at(-1) && z >= t.zs[0] && z <= t.zs.at(-1));
  assert.ok(tile, `loaded terrain at ${x},${z}`);
  const { p, columns, xs, zs } = tile, i = below(xs, x), j = below(zs, z);
  const u = (x - xs[i]) / (xs[i + 1] - xs[i]), v = (z - zs[j]) / (zs[j + 1] - zs[j]);
  const a = p.getY(j * columns + i), b = p.getY((j + 1) * columns + i), c = p.getY(j * columns + i + 1), d = p.getY((j + 1) * columns + i + 1);
  return u + v <= 1 ? a + (c - a) * u + (b - a) * v : d + (b - d) * (1 - u) + (c - d) * (1 - v);
}
// Read the actual compact Float32 triangles, including the outcrop skin. This is
// deliberately independent of the production sampler used to seat the trees.
const fineBuckets = new Map(), fineHash = createHash('sha256'), fineOwners = new Set();
let fineTriangles = 0, fineRootSamples = 0, outcropRootSamples = 0;
scene.traverse(mesh => {
  if (!['Suval switchback ground', 'Suval exposed limestone faces'].includes(mesh.name)) return;
  fineHash.update(mesh.name);
  for (const key of ['position', 'color']) fineHash.update(Buffer.from(mesh.geometry.attributes[key].array.buffer));
  fineHash.update(Buffer.from(mesh.geometry.index.array.buffer));
  const p = mesh.geometry.attributes.position, index = mesh.geometry.index.array;
  const vertices = Array.from({ length: p.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld));
  if (mesh.name === 'Suval switchback ground') for (let i = 0; i < p.count; i++) fineOwners.add(hexOwnerAt(p.getX(i), p.getZ(i)));
  for (let k = 0; k < index.length; k += 3) {
    const [a, b, c] = [vertices[index[k]], vertices[index[k + 1]], vertices[index[k + 2]]];
    const row = { a, b, c, name: mesh.name }; fineTriangles++;
    for (let x = Math.floor(Math.min(a.x, b.x, c.x) / 4); x <= Math.floor(Math.max(a.x, b.x, c.x) / 4); x++)
      for (let z = Math.floor(Math.min(a.z, b.z, c.z) / 4); z <= Math.floor(Math.max(a.z, b.z, c.z) / 4); z++) {
        const key = `${x},${z}`; if (!fineBuckets.has(key)) fineBuckets.set(key, []); fineBuckets.get(key).push(row);
      }
  }
});
const fineIdentity = fineHash.digest('hex');
function drawnHeight(x, z) {
  let y = coarseHeight(x, z), surface = null;
  for (const { a, b, c, name } of fineBuckets.get(`${Math.floor(x / 4)},${Math.floor(z / 4)}`) ?? []) {
    const den = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
    const u = ((b.z - c.z) * (x - c.x) + (c.x - b.x) * (z - c.z)) / den;
    const v = ((c.z - a.z) * (x - c.x) + (a.x - c.x) * (z - c.z)) / den;
    if (u < -1e-7 || v < -1e-7 || u + v > 1 + 1e-7) continue;
    const height = a.y * u + b.y * v + c.y * (1 - u - v);
    if (height > y) { y = height; surface = name; }
  }
  if (surface === 'Suval switchback ground') fineRootSamples++;
  if (surface === 'Suval exposed limestone faces') outcropRootSamples++;
  return y;
}
const matrix = new THREE.Matrix4(), point = new THREE.Vector3(), roots = [], parents = new Set();
let maxSamplerGap = 0, footSamples = 0;
scene.traverse(mesh => {
  if (!mesh.isMesh || !mesh.userData.liveTree || mesh.geometry.type !== 'CylinderGeometry') return;
  const p = mesh.geometry.attributes.position;
  for (let index = 0; index < (mesh.isInstancedMesh ? mesh.count : 1); index++) {
    if (mesh.isInstancedMesh) { mesh.getMatrixAt(index, matrix); matrix.premultiply(mesh.matrixWorld); }
    else matrix.copy(mesh.matrixWorld);
    if (Math.abs(matrix.determinant()) < 1e-9) continue;
    const tree = treeAt(matrix.elements[12], matrix.elements[14]); if (!tree) continue;
    let gap = -Infinity;
    for (let v = 0; v < p.count; v++) {
      if (Math.abs(p.getY(v) + .5) > 1e-6) continue;
      point.fromBufferAttribute(p, v).applyMatrix4(matrix);
      const ground = drawnHeight(point.x, point.z); gap = Math.max(gap, point.y - ground); footSamples++;
      maxSamplerGap = Math.max(maxSamplerGap, Math.abs(world.renderedGroundHeight(point.x, point.z) - ground));
    }
    roots.push({ tree, mesh, index, gap, baseY: matrix.elements[13] - matrix.elements[5] * .5 }); parents.add(mesh.parent);
  }
});
const facts = trees.map(({ id, x, z, height, species, log }) => [id, x, z, height, species, log]);
const identity = createHash('sha256').update(JSON.stringify(facts)).digest('hex');
const layout = createHash('sha256'); let batches = 0, meshes = 0;
for (const parent of parents) {
  layout.update(parent.name);
  parent.traverse(mesh => {
    if (!mesh.isMesh) return; meshes++;
    layout.update(JSON.stringify([mesh.name, mesh.geometry.type, mesh.count]));
    if (mesh.isInstancedMesh) {
      batches++;
      const p = mesh.instanceMatrix.array.slice(); if (mesh.userData.liveTree) for (let i = 13; i < p.length; i += 16) p[i] = 0;
      layout.update(Buffer.from(p.buffer)); if (mesh.instanceColor) layout.update(Buffer.from(mesh.instanceColor.array.buffer));
    } else {
      const p = mesh.matrix.elements.slice(); if (mesh.userData.liveTree) p[13] = 0; layout.update(JSON.stringify(p));
      for (const name of ['position', 'color']) if (mesh.geometry.attributes[name]) layout.update(Buffer.from(mesh.geometry.attributes[name].array.buffer));
      if (mesh.geometry.index) layout.update(Buffer.from(mesh.geometry.index.array.buffer));
    }
  });
}
const layoutIdentity = layout.digest('hex');
const byRegion = [...regions].map(region => {
  const rows = roots.filter(row => (row.tree.region ?? hexOwnerAt(row.tree.x, row.tree.z)) === region);
  return { region, roots: rows.length, floating: rows.filter(row => row.gap > .02).length, buried: rows.filter(row => row.gap < -.05).length,
    min: Math.min(...rows.map(row => row.gap)), max: Math.max(...rows.map(row => row.gap)),
    examples: [...rows].sort((a, b) => b.gap - a.gap).slice(0, 3).map(({ tree, gap }) => ({ id: tree.id, x: tree.x, z: tree.z, gap })) };
});
const court = roots.filter(row => row.tree.id.startsWith('solis-orange-')).map(({ tree, baseY, gap }) => ({ id: tree.id, x: tree.x, z: tree.z, y: tree.y, baseY, gap }));
const physicalIdentity = createHash('sha256').update(JSON.stringify(trees.map(tree => [tree.id, world.groundHeight(tree.x, tree.z)]))).digest('hex');
const evidence = { trees: trees.length, roots: roots.length, identity, layoutIdentity, batches, meshes, byRegion, court,
  firstFine: firstFine.length, fineMeshes: fineMeshes().length, fineIdentity, fineTriangles, fineOwners: [...fineOwners], fineRootSamples, outcropRootSamples,
  firstSupport, finalSupport: supportSnapshot(), physicalIdentity, maxSamplerGap, footSamples };
mkdirSync(new URL('./artifacts/', import.meta.url), {recursive:true});
if (baseline) writeFileSync(new URL('./artifacts/r11-woodland-before-grounding.json', import.meta.url), JSON.stringify(evidence, null, 2));
else writeFileSync(new URL('./artifacts/r11-woodland-after-grounding.json', import.meta.url), JSON.stringify(evidence, null, 2));

test('R11 trees retain their typed identities and original non-vertical scenery', t => {
  t.diagnostic(JSON.stringify({ trees: trees.length, roots: roots.length, identity, layoutIdentity, batches, meshes }));
  assert.equal(roots.length, trees.length);
  if (baseline) return;
  assert.equal(trees.length, 3597);
  assert.equal(identity, 'f317803c1968a59457075c46f6d7b6ed9549a2192966468fa91ee086c7626229');
  assert.equal(layoutIdentity, '6c67bd0032020dcc9575a96db6d516e4afc998200677056d0a48487c34538d94');
  assert.equal(physicalIdentity, 'f6fba229d712ecccaf8b7fdac1dbfe2f1ad4e30197546f21787f8dde5c037d8e');
});

test('Luscia loads its existing fine ground before foliage and later Suval loading reuses that ground', t => {
  t.diagnostic(JSON.stringify({ firstFine: firstFine.length, finalFine: fineMeshes().length, fineIdentity, fineTriangles,
    fineOwners: [...fineOwners], fineRootSamples, outcropRootSamples, firstSupport, finalSupport: evidence.finalSupport }));
  assert.deepEqual(firstTrees, world.treeRegistry.trees.filter(tree => tree.region === 'Luscia').map(tree => [tree.id, tree.y]));
  if (baseline) return;
  assert.equal(firstFine.length, 3);
  assert.deepEqual(fineMeshes(), firstFine);
  assert.deepEqual(evidence.finalSupport, firstSupport);
  assert.equal(fineIdentity, '578128884d491f8b2ed7733a229c12f6ba72005ef8e5b6bdf26ab24994d94063');
});

test('the reviewed regional and West Suval country trees meet actual Float32 ground across their feet', t => {
  t.diagnostic(JSON.stringify(byRegion));
  t.diagnostic(JSON.stringify({ maxSamplerGap, footSamples }));
  if (baseline) return;
  assert.ok(fineRootSamples > 0 && outcropRootSamples > 0);
  assert.ok(maxSamplerGap < .00001, `rendered sampler differs by ${maxSamplerGap}m`);
  const faults = roots.filter(row => !row.tree.id.startsWith('solis-orange-') && (row.gap > -.025 || row.gap < -.035));
  assert.deepEqual(faults.slice(0, 10).map(({ tree, gap }) => ({ id: tree.id, x: tree.x, z: tree.z, gap })), [], `${faults.length} roots fail`);
});

test('the four Solis orange trees keep their authored raised court footing', t => {
  t.diagnostic(JSON.stringify(court)); assert.equal(court.length, 4);
  for (const tree of court) { assert.equal(tree.y, world.groundHeight(tree.x, tree.z)); assert.ok(Math.abs(tree.baseY - tree.y) < .00001); }
});

test('restoring standing trees retains their corrected mesh height and their own blockers', () => {
  const representatives = new Map();
  for (const row of roots) if (!representatives.has(row.tree.species)) representatives.set(row.tree.species, row);
  for (const { tree, mesh, index } of representatives.values()) {
    const before = new THREE.Matrix4();
    if (mesh.isInstancedMesh) mesh.getMatrixAt(index, before); else before.copy(mesh.matrix);
    const blocker = world.colliders.find(collider => collider.id === tree.id); assert.ok(blocker, tree.id);
    assert.equal(world.treeRegistry.set(tree.id, false), true); assert.equal(world.colliders.includes(blocker), false);
    assert.equal(world.treeRegistry.regrow(tree.id), true); assert.equal(world.colliders.includes(blocker), true);
    if (mesh.isInstancedMesh) mesh.getMatrixAt(index, matrix); else matrix.copy(mesh.matrix);
    assert.deepEqual(matrix.elements, before.elements, tree.id);
  }
});
