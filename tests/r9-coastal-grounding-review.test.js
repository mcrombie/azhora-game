import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import * as THREE from '../vendor/three.module.js';
import { scopedWorld } from './scoped-world.js';
import { sourceModule } from './module-loader.js';
import { GALA_WILDLIFE_ZONES } from '../src/content/regions/gala/gala-wildlife.js';
import { ASCARTH_WILDLIFE_ZONES } from '../src/content/regions/ascarth/ascarth-wildlife.js';
import { OVES_WILDLIFE_ZONES } from '../src/content/regions/oves/oves-wildlife.js';
import { SELEMIS_WILDLIFE_ZONES } from '../src/content/regions/selemis/selemis-wildlife.js';
import { hexOwnerAt } from '../src/world/terrain/region-world.js';
import { aevisReserved } from '../src/content/regions/aevis/aevis-city.js';
import { createWoodcutting } from '../src/gameplay/skills/woodcutting/woodcutting.js';
import { createSkills, MAX_XP } from '../src/gameplay/skills/skills.js';
import { canStand } from '../src/gameplay/movement/game-state.js';
import { telemoniaGeometryHash } from './telemonia-geometry-hash.js';

const baseline = process.env.AZHORA_CAPTURE_R9 === '1';
const originalWrack = JSON.parse(readFileSync(new URL('./fixtures/selemis-wrack-before.json', import.meta.url))).wrack;
const scene = new THREE.Scene(), world = await scopedWorld(scene, [22]);
const galaFirstJobs = world.loading.state().jobs;
const galaFirstTrees = world.treeRegistry.trees.filter(tree => tree.id.startsWith('gala-tree-')).map(tree => [tree.id, tree.y]);
async function ensureRegions(ids) {
  const priorFrame = globalThis.requestAnimationFrame, priorCancel = globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame = callback => setTimeout(() => callback(performance.now()), 0);
  globalThis.cancelAnimationFrame = clearTimeout;
  try { await Promise.all(ids.map(id => world.loading.ensureRegion(id))); }
  finally {
    world.loading.stop();
    if (priorFrame === undefined) delete globalThis.requestAnimationFrame; else globalThis.requestAnimationFrame = priorFrame;
    if (priorCancel === undefined) delete globalThis.cancelAnimationFrame; else globalThis.cancelAnimationFrame = priorCancel;
  }
}
await ensureRegions([23, 24, 25, 26, 54]);
scene.updateMatrixWorld(true);
const names = ['Gala scenery', 'Ascarth scenery', 'Oves scenery', 'Selemis scenery'];
// Gala's generic biome placeholder has the same name as its authored scenery.
const groups = names.map(name => name === 'Gala scenery'
  ? scene.getObjectByName('Gala tamarisk trunks').parent : scene.getObjectByName(name));
const prefixes = ['gala-tree-', 'ascarth-', 'oves-tree-', 'selemis-'];
const trees = world.treeRegistry.trees.filter(tree => prefixes.some(prefix => tree.id.startsWith(prefix)));
const zones = [...GALA_WILDLIFE_ZONES, ...ASCARTH_WILDLIFE_ZONES, ...OVES_WILDLIFE_ZONES, ...SELEMIS_WILDLIFE_ZONES];
const batches = groups.flatMap(group => group.children.filter(mesh => mesh.isInstancedMesh));
const matrix = new THREE.Matrix4(), point = new THREE.Vector3();

// Independently read real Float32 terrain triangles, including Gala's retained
// fine gully cells. The production placement callback is never used here.
const tiles = scene.getObjectByName('The ground of Azhora').children.filter(mesh => mesh.name.startsWith('Terrain ')).map(mesh => {
  const p = mesh.geometry.attributes.position;
  let columns = 1; while (columns < p.count && p.getX(columns) !== p.getX(0)) columns++;
  const xs = Array.from({ length: columns }, (_, i) => p.getX(i));
  const zs = Array.from({ length: p.count / columns }, (_, j) => p.getZ(j * columns));
  assert.deepEqual([...mesh.geometry.index.array.slice(0, 6)], [0, columns, 1, 1, columns, columns + 1]);
  return { p, columns, xs, zs };
});
const below = (axis, value) => {
  let lo = 0, hi = axis.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (axis[mid] <= value) lo = mid; else hi = mid; }
  return lo;
};
const interpolate = (a, b, c, d, u, v) => u + v <= 1
  ? a + (c - a) * u + (b - a) * v : d + (b - d) * (1 - u) + (c - d) * (1 - v);
const patches = [];
scene.traverse(mesh => {
  if (!['Treloss ground', 'Telemonia ground'].includes(mesh.name)) return;
  const p = mesh.geometry.attributes.position, ix = mesh.geometry.index.array, cells = new Map();
  const ox = p.getX(ix[0]), oz = p.getZ(ix[0]), step = p.getX(ix[2]) - ox;
  for (let i = 0; i < ix.length; i += 6) {
    const a = ix[i], b = ix[i + 1], c = ix[i + 2], d = ix[i + 5];
    cells.set(`${Math.round((p.getX(a) - ox) / step)},${Math.round((p.getZ(a) - oz) / step)}`, [a, b, c, d]);
  }
  patches.push({ p, cells, ox, oz, step });
});
function fineHeight(x, z) {
  for (const { p, cells, ox, oz, step } of patches) {
    const i = Math.floor((x - ox) / step), j = Math.floor((z - oz) / step), cell = cells.get(`${i},${j}`);
    if (!cell) continue;
    const [a, b, c, d] = cell;
    return interpolate(p.getY(a), p.getY(b), p.getY(c), p.getY(d),
      (x - p.getX(a)) / (p.getX(c) - p.getX(a)), (z - p.getZ(a)) / (p.getZ(b) - p.getZ(a)));
  }
  return null;
}
function drawnHeight(x, z) {
  const tile = tiles.find(t => x >= t.xs[0] && x <= t.xs.at(-1) && z >= t.zs[0] && z <= t.zs.at(-1));
  assert.ok(tile, `loaded terrain at ${x},${z}`);
  const { p, columns, xs, zs } = tile, i = below(xs, x), j = below(zs, z);
  const u = (x - xs[i]) / (xs[i + 1] - xs[i]), v = (z - zs[j]) / (zs[j + 1] - zs[j]);
  const coarse = interpolate(p.getY(j * columns + i), p.getY((j + 1) * columns + i),
    p.getY(j * columns + i + 1), p.getY((j + 1) * columns + i + 1), u, v);
  return Math.max(coarse, fineHeight(x, z) ?? -Infinity);
}

const roots = [];
for (const [groupIndex, group] of groups.entries()) {
  for (const mesh of group.children.filter(mesh => mesh.isInstancedMesh && mesh.userData.liveTree && mesh.geometry.type === 'CylinderGeometry')) {
    const p = mesh.geometry.attributes.position;
    for (let index = 0; index < mesh.count; index++) {
      mesh.getMatrixAt(index, matrix); if (!matrix.determinant()) continue;
      const e = matrix.elements, x = e[12] - (groupIndex === 3 ? e[4] * .5 : 0), z = e[14] - (groupIndex === 3 ? e[6] * .5 : 0);
      const tree = trees.find(tree => tree.id.startsWith(prefixes[groupIndex]) && Math.hypot(tree.x - x, tree.z - z) < .002);
      assert.ok(tree, `registered ${group.name} trunk at ${x},${z}`);
      let gap = -Infinity, fine = false;
      for (let v = 0; v < p.count; v++) {
        if (Math.abs(p.getY(v) + .5) > 1e-6) continue;
        point.fromBufferAttribute(p, v).applyMatrix4(matrix);
        fine ||= fineHeight(point.x, point.z) !== null;
        gap = Math.max(gap, point.y - drawnHeight(point.x, point.z));
      }
      roots.push({ group: group.name, tree, mesh, index, gap, fine, footY: e[13] - e[5] * .5 });
    }
  }
}
const layoutHash = createHash('sha256');
for (const [groupIndex, group] of groups.entries()) {
  layoutHash.update(names[groupIndex]);
  for (const mesh of group.children) {
    // Only Strand wrack was intentionally redesigned. Keep the original full
    // layout hash by substituting its captured record; the dedicated local
    // wrack regression validates its replacement and every other island byte.
    if (groupIndex === 3 && mesh.name === 'Strand wrack') {
      layoutHash.update(JSON.stringify([originalWrack.name, originalWrack.geometryType, originalWrack.count]));
      layoutHash.update(Buffer.from(new Float32Array(originalWrack.matrices).buffer));
      layoutHash.update(Buffer.from(new Float32Array(originalWrack.colors).buffer));
      continue;
    }
    layoutHash.update(JSON.stringify([mesh.name, mesh.geometry?.type, mesh.count]));
    if (mesh.isInstancedMesh) {
      const matrices = mesh.instanceMatrix.array.slice();
      if (mesh.userData.liveTree) for (let k = 13; k < matrices.length; k += 16) matrices[k] = 0;
      layoutHash.update(Buffer.from(matrices.buffer));
      if (mesh.instanceColor) layoutHash.update(Buffer.from(mesh.instanceColor.array.buffer));
    } else if (mesh.geometry) {
      for (const attribute of ['position', 'color']) if (mesh.geometry.attributes[attribute]) layoutHash.update(Buffer.from(mesh.geometry.attributes[attribute].array.buffer));
      if (mesh.geometry.index) layoutHash.update(Buffer.from(mesh.geometry.index.array.buffer));
    }
  }
}
const layoutIdentity = layoutHash.digest('hex');
const facts = trees.map(({ id, x, z, height, species, log }) => [id, x, z, height, species, log])
  .sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
const treeIdentity = createHash('sha256').update(JSON.stringify(facts)).digest('hex');
if (baseline) mkdirSync(new URL('./artifacts/', import.meta.url), {recursive:true});
if (baseline) writeFileSync(new URL('./artifacts/r9-coastal-before-grounding.json.gz', import.meta.url), gzipSync(JSON.stringify({
  layoutIdentity, treeIdentity, trees, meshes: batches.map(mesh => ({ name: mesh.name, count: mesh.count, matrices: [...mesh.instanceMatrix.array] })),
})));

test('Fast Gala loads the actual shared Telemonia terrain without loading its walls or town', t => {
  const jobs = galaFirstJobs, shared = jobs.find(job => job.id === 'telemoniaGround');
  assert.equal(shared.status, 'ready');
  assert.deepEqual(shared.regions, [22, 25, 26, 55, 57, 59]);
  for (const id of ['telemoniaScenery', 'telemoniaTown']) assert.equal(jobs.find(job => job.id === id).status, 'pending', id);
  assert.equal(world.loading.isReady(55), false);
  assert.deepEqual(trees.filter(tree => tree.id.startsWith('gala-tree-')).map(tree => [tree.id, tree.y]), galaFirstTrees);
  const groundHash = telemoniaGeometryHash(scene, mesh => mesh.name === 'Telemonia ground');
  t.diagnostic(`Shared fine-ground mesh bytes: ${groundHash}`);
  if (!baseline) assert.equal(groundHash, 'fb20c3ec49b85d0ab33479dc86fbdf8ae2774568445c2cbf139f84eacffed2a4');
  for (const [x, z] of [[-1841.317, 1417.046], [-1808.567, 1290.270], [-1997.919, 1011.161]]) {
    assert.ok(fineHeight(x, z) !== null, `shared collar at ${x},${z}`);
    assert.ok(Math.abs(world.renderedGroundHeight(x, z) - drawnHeight(x, z)) < .002);
  }
});

test('R9 coastal trees retain seeded identities, existing specific species, and reserved city clearances', t => {
  t.diagnostic(JSON.stringify({ trees: trees.length, trunks: roots.length, layoutIdentity, treeIdentity,
    counts: Object.fromEntries(names.map(name => [name, roots.filter(root => root.group === name).length])) }));
  assert.equal(roots.length, trees.length);
  assert.equal(new Set(roots.map(root => root.tree.id)).size, trees.length);
  if (!baseline) {
    assert.equal(layoutIdentity, '79e8e9d69831f317f63c320610198cf1dda6345490fbce0bbbae39d0ba234cc6');
    assert.equal(treeIdentity, 'f98a72f5f36892f8eebc0b1797ceb4bd88058e114128ef1ed7a53cd5746a2fbb');
  }
  for (const { tree } of roots) {
    assert.ok(tree.harvestable && tree.log && tree.species);
    if (tree.id.startsWith('ascarth-')) assert.equal(aevisReserved(tree.x, tree.z, 2), false, tree.id);
  }
});

test('all coastal trunk footprints meet the actual visible terrain, including the Treloss fine ground', t => {
  for (const group of names) {
    const local = roots.filter(root => root.group === group);
    t.diagnostic(JSON.stringify({ group, trees: local.length, exposed: local.filter(root => root.gap > .02).length,
      buried: local.filter(root => root.gap < -.04).length, fine: local.filter(root => root.fine).length,
      worst: [...local].sort((a, b) => b.gap - a.gap).slice(0, 3).map(({ tree, gap }) => ({ id: tree.id, gap })) }));
  }
  if (!baseline) for (const root of roots) {
    assert.ok(root.gap >= -.035 && root.gap <= -.025, `${root.tree.id}: ${root.gap}`);
    assert.ok(Math.abs(root.tree.y - root.footY) < .002, `${root.tree.id}: stump follows its actual foot`);
  }
});

test('coastal harvest saves control the same registered tree and restore its exact mesh and collider', () => {
  const skills = createSkills(); skills.learn('woodcutting'); skills.gain('woodcutting', MAX_XP);
  const wood = createWoodcutting({ skills, trees, random: () => 0 }), axe = id => id === 'bronze-axe';
  for (const species of new Set(trees.map(tree => tree.species))) {
    const root = roots.find(root => root.tree.species === species), { tree, mesh, index } = root;
    const original = new THREE.Matrix4(); mesh.getMatrixAt(index, original);
    const beforeParts = mesh.parent.children.filter(part => part.isInstancedMesh && part.userData.liveTree)
      .map(part => ({ part, values: part.instanceMatrix.array.slice() }));
    const collider = world.colliders.find(collider => collider.id === tree.id); assert.ok(collider);
    const result = wood.swing(tree.id, axe); assert.equal(result.ok, true); assert.equal(result.log, tree.log);
    const copy = createWoodcutting({ skills, trees, random: () => 0 });
    assert.equal(copy.restore(wood.snapshot()), true); assert.deepEqual(copy.snapshot(), wood.snapshot());
    assert.equal(world.treeRegistry.set(tree.id, false), true); assert.equal(world.colliders.includes(collider), false);
    mesh.getMatrixAt(index, matrix); assert.equal(matrix.determinant(), 0);
    let hiddenParts = 0;
    for (const { part, values } of beforeParts) for (let i = 0; i < part.count; i++) {
      part.getMatrixAt(i, matrix);
      if (!matrix.determinant() && values[i * 16] !== 0) hiddenParts++;
    }
    assert.ok(hiddenParts === 3 || hiddenParts === 4, `${tree.id}: exactly its trunk and crown lobes hide`);
    assert.equal(world.treeRegistry.set(tree.id, true), true); assert.ok(world.colliders.includes(collider));
    mesh.getMatrixAt(index, matrix); assert.deepEqual(matrix.elements, original.elements);
    for (const { part, values } of beforeParts) assert.deepEqual(part.instanceMatrix.array, values);
  }
});

test('coastal wildlife keeps physical homes and water or air heights while visible ground feet follow terrain triangles', async t => {
  const { createWestLife } = await sourceModule('../src/content/regions/western-regions/west-regions-life.js');
  const life = createWestLife(scene, world, { zones }), actors = life.state().creatures, initial = life.snapshot(), gaps = [];
  assert.equal(actors.length, zones.reduce((sum, zone) => sum + zone.sites.length, 0));
  for (const zone of zones) {
    const residents = actors.filter(actor => actor.id.startsWith(`${zone.id}-`));
    assert.equal(residents.length, zone.sites.length);
    life.setObserver({ x: (zone.minX + zone.maxX) / 2, z: (zone.minZ + zone.maxZ) / 2 });
    const body = scene.getObjectByName(zone.id)?.getObjectByName(`${zone.species} bodies`); assert.ok(body, zone.id);
    for (let i = 0; i < residents.length; i++) {
      const actor = residents[i]; body.getMatrixAt(i, matrix);
      const ground = !zone.air && !zone.sea && !zone.float;
      const expected = ground ? drawnHeight(actor.x, actor.z) + actor.lift : actor.y;
      const gap = matrix.elements[13] - expected;
      gaps.push({ zone: zone.id, ground, gap });
      if (ground) {
        assert.equal(hexOwnerAt(actor.x, actor.z), zone.region, zone.id);
        assert.ok(canStand(actor.x, actor.z, world, zone.radius), `${actor.id}: physical home`);
        if (zone.region === 'Southern Ascarth') assert.equal(aevisReserved(actor.x, actor.z, 3), false, zone.id);
      }
      if (!baseline) assert.ok(Math.abs(gap) < .002, `${zone.id} ${i}: ${gap}`);
    }
  }
  t.diagnostic(JSON.stringify({ actors: actors.length, ground: gaps.filter(gap => gap.ground).length,
    misplaced: gaps.filter(gap => Math.abs(gap.gap) > .02).length, worst: [...gaps].sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap)).slice(0, 12) }));
  assert.deepEqual(life.snapshot().creatures, initial.creatures, 'rendering does not move the simulation');
  assert.equal(life.snapshot().updates, initial.updates); life.dispose();
});

test('Oves resolves only its two documented vulture stand-ins without changing their ranges or populations', () => {
  const expected = [
    ['oves-plain-vulture', 'Ovesos', [[-1790, 772]], 38],
    ['oves-wedge-vulture', 'Oves Desert', [[-2222, 884]], 36],
  ];
  for (const [id, region, sites, air] of expected) {
    const zone = OVES_WILDLIFE_ZONES.find(zone => zone.id === id);
    assert.equal(zone.species, 'bone-bird'); assert.equal(zone.region, region);
    assert.deepEqual(zone.sites, sites); assert.equal(zone.air, air);
  }
  assert.equal(zones.length, 35);
  assert.equal(zones.reduce((count, zone) => count + zone.sites.length, 0), 98);
});

test('later Telemonia loading reuses the same fine meshes and leaves every coastal tree height unchanged', async () => {
  const beforeTrees = roots.map(({ mesh, index, tree }) => {
    mesh.getMatrixAt(index, matrix); return { id: tree.id, y: tree.y, matrix: [...matrix.elements] };
  });
  const beforeMeshes = []; scene.traverse(mesh => { if (mesh.name === 'Telemonia ground') beforeMeshes.push(mesh); });
  await ensureRegions([55]);
  const afterMeshes = []; scene.traverse(mesh => { if (mesh.name === 'Telemonia ground') afterMeshes.push(mesh); });
  assert.deepEqual(afterMeshes, beforeMeshes, 'the fine terrain is reused, never redrawn');
  for (const [i, { mesh, index, tree }] of roots.entries()) {
    mesh.getMatrixAt(index, matrix);
    assert.deepEqual({ id: tree.id, y: tree.y, matrix: [...matrix.elements] }, beforeTrees[i]);
  }
  assert.equal(world.loading.isReady(55), true);
});
