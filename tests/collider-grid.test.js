import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/gameplay/movement/game-state.js';
import { createColliderGrid, watchColliderEdits, COLLIDER_CELL } from '../src/world/collision/collider-grid.js';

let built = null;
const fixture = async () => built ??= (async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  return createWorld(new THREE.Scene());
})();

test('the grid answers sampled steps exactly as the whole list does', async t => {
  const world = await fixture();
  // Exercise the same collision rules, including elevated walkways and regional
  // water, while disabling only the optimized solid-shape candidate query.
  const unindexed = Object.create(world); unindexed.nearColliders = undefined;
  assert.equal(typeof world.nearColliders, 'function');
  let seed = 20260917;
  const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const points = [];
  // Seeded reservoir samples retain every collider kind and both shape types
  // without multiplying test cost by the number of trees in new regions.
  const kinds = new Map();
  for (const c of world.colliders) {
    const key = `${c.kind ?? 'untyped'}:${c.r !== undefined ? 'circle' : 'box'}:${Number.isFinite(c.minY) || Number.isFinite(c.maxY) ? 'elevated' : 'ground'}`;
    if (!kinds.has(key)) kinds.set(key, { seen: 0, samples: [] });
    const group = kinds.get(key); group.seen++;
    if (group.samples.length < 3) group.samples.push(c);
    else { const slot = Math.floor(random() * group.seen); if (slot < 3) group.samples[slot] = c; }
  }
  for (const { samples } of kinds.values()) for (const c of samples) {
    const reach = (c.r ?? Math.max(c.hx, c.hz)) + .3;
    for (const [dx, dz] of [[0, 0], [reach, 0], [-reach, 0], [0, reach], [0, -reach], [reach * .7, reach * .7]])
      points.push({ x: c.x + dx, z: c.z + dz });
  }
  // Spread a bounded sample over the complete road catalog, and explicitly
  // include every region rather than relying on uniform random hits.
  const roads = world.paths.filter(path => path.length > 1), roadCount = Math.min(80, roads.length);
  for (let road = 0; road < roadCount; road++) {
    const path = roads[Math.floor(road * roads.length / roadCount)];
    for (const fraction of [.1, .35, .65, .9]) {
      const at = fraction * (path.length - 1), i = Math.min(path.length - 2, Math.floor(at)), blend = at - i;
      points.push({ x: path[i].x + (path[i + 1].x - path[i].x) * blend, z: path[i].z + (path[i + 1].z - path[i].z) * blend });
    }
  }
  for (const region of world.regions) if (region.spawn) for (const [dx, dz] of [[0, 0], [9, -9], [-9, 9]])
    points.push({ x: region.spawn.x + dx, z: region.spawn.z + dz });
  const bounds = world.bounds;
  for (let i = 0; i < 160; i++) points.push({ x: bounds.minX + random() * (bounds.maxX - bounds.minX), z: bounds.minZ + random() * (bounds.maxZ - bounds.minZ) });
  let disagreements = 0, blocked = 0;
  for (const point of points) for (const radius of [.34, .62]) {
    const fast = canStand(point.x, point.z, world, radius), slow = canStand(point.x, point.z, unindexed, radius);
    if (fast !== slow) disagreements++;
    if (!fast) blocked++;
  }
  t.diagnostic(`${points.length} points across ${kinds.size} collider kinds, ${roadCount} roads and ${world.regions.length} regions; ${blocked} blocked of ${points.length * 2} queries`);
  assert.equal(disagreements, 0, `${points.length} points, both radii, no disagreement`);
  assert.ok(blocked > 50 && blocked < points.length * 2 - 50, `the sample covers both answers (${blocked} blocked of ${points.length * 2})`);
});

test('a query gathers every shape that could reach the point, and few that cannot', async () => {
  const world = await fixture();
  let seed = 7717;
  const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  let gathered = 0, samples = 0;
  for (let i = 0; i < 400; i++) {
    const c = world.colliders[Math.floor(random() * world.colliders.length)];
    const x = c.x + (random() - .5) * 40, z = c.z + (random() - .5) * 40, reach = .7;
    const near = new Set(world.nearColliders(x, z, reach, []));
    for (const other of world.colliders) {
      const dx = x - other.x, dz = z - other.z;
      const overlaps = other.r !== undefined ? dx * dx + dz * dz < (other.r + reach) ** 2
        : Math.abs(dx) < other.hx + reach && Math.abs(dz) < other.hz + reach;
      if (overlaps) assert.ok(near.has(other), 'a shape that overlaps is always gathered');
    }
    gathered += near.size; samples++;
  }
  assert.ok(gathered / samples < 120, `a step asks few shapes, not thousands (${Math.round(gathered / samples)} on average of ${world.colliders.length})`);
  const state = world.colliderIndexState();
  assert.equal(state.cell, COLLIDER_CELL);
  assert.ok(state.cells > 500 && state.filed >= state.count);
});

test('the index keeps up when the world adds or takes away a collider', async () => {
  const world = await fixture();
  const spot = world.spawn;
  let open = null;
  for (let step = 0; step < 100; step++) {
    const candidate = { x: spot.x, z: spot.z + 6 + step * 2 };
    if (candidate.z > world.bounds.maxZ - .34) break;
    if (canStand(candidate.x, candidate.z, world)) { open = candidate; break; }
  }
  assert.ok(open, 'the bounded search finds an open position near the spawn');
  const blocker = { x: open.x, z: open.z, r: 1.4, kind: 'test-blocker' };
  world.colliders.push(blocker);
  assert.equal(canStand(open.x, open.z, world), false, 'a collider pushed after the world was built still blocks');
  world.colliders.splice(world.colliders.indexOf(blocker), 1);
  assert.equal(canStand(open.x, open.z, world), true, 'and stops blocking when it is taken away');
});

test('the grid is built from the colliders it is given, whatever their shape', () => {
  const colliders = [{ x: 0, z: 0, r: 1 }, { x: 40, z: 0, hx: 3, hz: 2 }, { x: 0, z: 40, r: 30 }, { x: NaN, z: 0, r: 1 }];
  const grid = createColliderGrid(colliders, 8);
  assert.equal(grid.count, 4);
  assert.equal(grid.widest, 30);
  assert.deepEqual([...new Set(grid.near(0, 0, .5))], [colliders[0]]);
  assert.deepEqual([...new Set(grid.near(40, 0, .5))], [colliders[1]]);
  assert.ok(grid.near(0, 20, .5).includes(colliders[2]), 'a wide shape is filed across every cell it covers');
  assert.deepEqual(grid.near(1000, 1000, .5), [], 'empty ground gathers nothing');
  assert.equal(grid.near(NaN, 0, .5).length, 0, 'a nonsense point gathers nothing');
  const mine = grid.near(0, 0, .5, []);
  grid.near(40, 0, .5);
  assert.deepEqual([...new Set(mine)], [colliders[0]], 'a caller’s own array is not reused underneath it');
});

test('appended collider suffixes preserve fresh-grid queries and metrics across cell boundaries', () => {
  const colliders = [{ x: 0, z: 0, r: 1 }], grid = createColliderGrid(colliders, 8);
  const metrics = g => ({ count: g.count, cells: g.cells, filed: g.filed, widest: g.widest });
  const additions = [
    [{ x: -8, z: 8, r: 0 }, { x: 16, z: -16, hx: 8, hz: 3 }, { x: NaN, z: 0, r: 1 }],
    [null, { x: 9, z: -9, r: 33 }, { x: Infinity, z: 0, r: 1 }, { x: 0, z: 0, hx: 2 }],
    [{ x: -16, z: -8, hx: 0, hz: 0 }, { x: 24, z: 8, r: 2 }, { x: 0, z: 0, r: Infinity }],
  ];
  for (const chunk of additions) {
    const from = colliders.length; colliders.push(...chunk);
    assert.equal(grid.append(colliders, from), grid, 'appending preserves the existing grid object');
    const fresh = createColliderGrid(colliders, 8);
    assert.deepEqual(metrics(grid), metrics(fresh));
    for (const x of [-48, -16, -8, 0, 8, 16, 24, 48]) for (const z of [-24, -8, 0, 8, 32])
      for (const reach of [0, .34, 8, 17]) assert.deepEqual(grid.near(x, z, reach, []), fresh.near(x, z, reach, []));
  }
  const before = metrics(grid); grid.append(colliders, colliders.length);
  assert.deepEqual(metrics(grid), before, 'an empty suffix is a no-op');
  for (const from of [-1, .5, colliders.length + 1]) assert.throws(() => grid.append(colliders, from), RangeError);
  assert.deepEqual(metrics(grid), before, 'invalid append offsets do not partially alter the index');
});

test('streamed collider list edits invalidate before later appends can mask the changed prefix', () => {
  const removed = { x: 0, z: 0, r: 1 }, kept = { x: 8, z: 8, r: 2 };
  const colliders = [removed, kept]; let invalidations = 0;
  watchColliderEdits(colliders, () => { invalidations++; });
  const old = createColliderGrid(colliders);
  colliders.push({ x: 16, z: 16, r: 3 }); old.append(colliders, old.count);
  assert.equal(invalidations, 0, 'ordinary background pushes keep the existing index usable');
  assert.deepEqual(colliders.splice(0, 1), [removed]);
  colliders.push({ x: 24, z: 24, r: 4 }, { x: 32, z: 32, r: 5 });
  assert.ok(colliders.length > old.count, 'the edited list grew past the previously indexed length');
  assert.equal(invalidations, 1);
  assert.ok(!createColliderGrid(colliders).near(0, 0, 0, []).includes(removed));
  for (const method of ['pop', 'shift', 'unshift', 'sort', 'reverse', 'fill', 'copyWithin']) {
    const before = invalidations;
    if (method === 'unshift') colliders.unshift(kept);
    else if (method === 'fill') colliders.fill(kept);
    else if (method === 'copyWithin') colliders.copyWithin(0, 1);
    else colliders[method]();
    assert.equal(invalidations, before + 1, `${method} invalidates its old index`);
  }
  assert.equal(Object.keys(colliders).some(key => key === 'splice'), false, 'watchers do not become array entries');
});
