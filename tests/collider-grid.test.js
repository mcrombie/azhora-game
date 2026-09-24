import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { createColliderGrid, COLLIDER_CELL } from '../src/collider-grid.js';

/** The current collision rules without the spatial index: every collider, every time. */
const standsBrute = (x, z, world, radius = .34) => {
  const b = world.bounds;
  if (x < b.minX + radius || x > b.maxX - radius || z < b.minZ + radius || z > b.maxZ - radius) return false;
  const surface = world.colliders.reduce((height, c) => c.surface !== undefined && c.r !== undefined
    && Math.hypot(x - c.x, z - c.z) < c.r ? Math.max(height, c.surface) : height, .45);
  if (world.heightAt(x, z) < surface) return false;
  return !world.colliders.filter(c => !['river-water', 'pond-water'].includes(c.kind)).some(c => c.r !== undefined
    ? Math.hypot(x - c.x, z - c.z) < c.r + radius
    : Math.abs(x - c.x) < c.hx + radius && Math.abs(z - c.z) < c.hz + radius);
};

let built = null;
const fixture = async () => built ??= (async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  return createWorld(new THREE.Scene());
})();

test('the grid answers every step exactly as the whole list did', async () => {
  const world = await fixture();
  assert.equal(typeof world.nearColliders, 'function');
  let seed = 20260917;
  const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const points = [];
  // Beside every hundredth collider, where the answer actually turns over.
  world.colliders.forEach((c, i) => {
    if (i % 100) return;
    const reach = (c.r ?? Math.max(c.hx, c.hz)) + .3;
    for (const [dx, dz] of [[0, 0], [reach, 0], [-reach, 0], [0, reach], [0, -reach], [reach * .7, reach * .7]])
      points.push({ x: c.x + dx, z: c.z + dz });
  });
  // Along every road, and at random across the whole world.
  for (const path of world.paths) for (let i = 1; i < path.length; i += 2) {
    const a = path[i - 1], b = path[i];
    for (let s = 0; s < 4; s++) points.push({ x: a.x + (b.x - a.x) * s / 4, z: a.z + (b.z - a.z) * s / 4 });
  }
  const bounds = world.bounds;
  for (let i = 0; i < 1500; i++) points.push({ x: bounds.minX + random() * (bounds.maxX - bounds.minX), z: bounds.minZ + random() * (bounds.maxZ - bounds.minZ) });
  let disagreements = 0, blocked = 0;
  for (const point of points) for (const radius of [.34, .62]) {
    const fast = canStand(point.x, point.z, world, radius), slow = standsBrute(point.x, point.z, world, radius);
    if (fast !== slow) disagreements++;
    if (!fast) blocked++;
  }
  assert.equal(disagreements, 0, `${points.length} points, both radii, no disagreement`);
  assert.ok(blocked > 200 && blocked < points.length * 2 - 200, `the sample covers both answers (${blocked} blocked of ${points.length * 2})`);
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
    const overlapping = world.colliders.filter(other => other.r !== undefined
      ? Math.hypot(x - other.x, z - other.z) < other.r + reach
      : Math.abs(x - other.x) < other.hx + reach && Math.abs(z - other.z) < other.hz + reach);
    for (const other of overlapping) assert.ok(near.has(other), 'a shape that overlaps is always gathered');
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
  const open = { x: spot.x, z: spot.z + 6 };
  while (!canStand(open.x, open.z, world)) open.z += 2;
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
