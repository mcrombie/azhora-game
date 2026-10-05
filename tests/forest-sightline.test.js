import test from 'node:test';
import assert from 'node:assert/strict';
import { forestLineClear, forestSegmentHit } from '../src/forest-sightline.js';
import { createColliderGrid } from '../src/collider-grid.js';

const point = (x, y = 2, z = 0) => ({ x, y, z });
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-5, `${actual} != ${expected}`);
function fixture(colliders = [], extras = {}) {
  const grid = createColliderGrid(colliders);
  return { heightAt: () => 0, nearColliders: grid.near, ...extras };
}

test('a swept shot hits the first thin trunk, regardless of frame length and collider order', () => {
  const far = { x: 7, z: 0, r: .4, kind: 'tree' }, thin = { x: 3.137, z: 0, r: .005, kind: 'tree' };
  const hit = forestSegmentHit(fixture([far, thin]), point(-100), point(100));
  assert.equal(hit.collider, thin); assert.equal(hit.kind, 'tree'); close(hit.x, thin.x - .085);
  close(hit.t, (thin.x - .085 + 100) / 200);
  assert.equal(forestLineClear(fixture([thin]), point(-100, 2, .1), point(100, 2, .1)), true);
});

test('trunks use known registered height and a credible finite fallback while water never blocks', () => {
  const tree = { id: 'young-tree', x: 4, z: 0, r: .5, kind: 'tree' };
  const world = fixture([tree, { x: 1, z: 0, r: 50, kind: 'river-water', surface: 12 }], {
    treeRegistry: { get: id => id === tree.id ? { y: 10, height: 3 } : null }, heightAt: () => 10,
  });
  assert.equal(forestLineClear(world, point(0, 14), point(8, 14)), true);
  assert.equal(forestSegmentHit(world, point(0, 12), point(8, 12)).collider, tree);
  assert.equal(forestLineClear(fixture([tree]), point(0, 25), point(8, 25)), true);
  assert.equal(forestLineClear(fixture([tree]), point(0, 20), point(8, 20)), false);
});

test('oriented walls use their rectangular footprint instead of a broad enclosing circle', () => {
  const wall = { x: 5, z: 0, width: 8, depth: .2, hx: 3, hz: 3, angle: Math.PI / 4, minY: 0, maxY: 4, kind: 'wall' };
  const world = fixture([wall]);
  assert.equal(forestLineClear(world, point(1, 2, 3.8), point(9, 2, 3.8)), true);
  const hit = forestSegmentHit(world, point(0), point(10), { radius: 0 });
  assert.equal(hit.collider, wall); close(hit.x, 5 - .1 * Math.SQRT2);
  assert.equal(forestLineClear(world, point(0, 5), point(10, 5)), true);
  const quarterTurn = { x: 5, z: 0, hx: 4, hz: .1, yaw: Math.PI / 2, minY: 0, maxY: 4, kind: 'wall' };
  close(forestSegmentHit({ heightAt: () => 0, colliders: [quarterTurn] }, point(0), point(10), { radius: 0 }).x, 4.9);
});

test('projectile radius rounds wall corners rather than inventing square extensions', () => {
  const wall = { x: 5, z: 0, hx: 1, hz: 1, minY: 0, maxY: 3, kind: 'wall' }, world = fixture([wall]);
  assert.equal(forestLineClear(world, point(6.08, 2, 1.08), point(6.08, 2, 1.08), { radius: .1 }), true);
  assert.equal(forestLineClear(world, point(6.05, 2, 1.05), point(6.05, 2, 1.05), { radius: .1 }), false);
});

test('explicit elevated walls and rails leave clear air below and above them', () => {
  const rail = { x: 5, z: 0, hx: .05, hz: 3, minY: 8, maxY: 9.2, kind: 'canopy-rail' }, world = fixture([rail]);
  assert.equal(forestLineClear(world, point(0), point(10)), true);
  assert.equal(forestSegmentHit(world, point(0, 8.5), point(10, 8.5)).collider, rail);
  assert.equal(forestLineClear(world, point(0, 10), point(10, 10)), true);
  const descending = forestSegmentHit(world, point(0, 12), point(10, 5));
  assert.equal(descending.collider, rail);
});

test('canopy floor slabs stop through-floor shots while supported space underneath remains open', () => {
  const deck = { id: 'canopy', kind: 'deck', a: point(2, 8), b: point(8, 8), width: 4 };
  const ramp = { id: 'stairs', kind: 'ramp', a: point(12, 0), b: point(22, 8), width: 3 };
  const world = fixture([], { walkSurfaces: [deck, ramp], supportAt: () => { throw Error('Never flatten elevated floors into terrain'); } });
  assert.equal(forestLineClear(world, point(0, 2), point(10, 2)), true);
  assert.equal(forestLineClear(world, point(0, 9), point(10, 9)), true);
  const below = forestSegmentHit(world, point(5, 2), point(5, 12));
  assert.equal(below.kind, 'walk-surface'); assert.equal(below.collider, deck); close(below.y, 8 - .26 - .08);
  const above = forestSegmentHit(world, point(5, 12), point(5, 2)); close(above.y, 8.08);
  const stairs = forestSegmentHit(world, point(17, 1), point(17, 7));
  assert.equal(stairs.collider, ramp); close(stairs.y, 4 - .26 - .08);
});

test('rising terrain stops a ray before distant cover and vertical falls hit the ground precisely', () => {
  const world = fixture([{ x: 9, z: 0, r: .5, kind: 'tree' }], { groundHeight: x => Math.max(0, 3 - Math.abs(x - 5) * 2) });
  const hit = forestSegmentHit(world, point(0), point(10), { radius: 0 });
  assert.equal(hit.kind, 'terrain'); assert.equal(hit.collider, null); close(hit.x, 4.5);
  const downward = forestSegmentHit(fixture(), point(2, 5), point(2, -5)); close(downward.y, .08);
  assert.equal(forestLineClear(fixture([], { heightAt: () => 0, groundHeight: () => -2 }), point(0, -1), point(10, -1)), true);
});

test('start and end contacts count, zero-length queries are deterministic, and first cover wins', () => {
  const wall = { x: 5, z: 0, hx: .25, hz: 2, minY: 1, maxY: 3, kind: 'wall' }, world = fixture([wall]);
  close(forestSegmentHit(world, point(5), point(10), { radius: 0 }).t, 0);
  close(forestSegmentHit(world, point(0), point(4.75), { radius: 0 }).t, 1);
  assert.equal(forestSegmentHit(world, point(0), point(0)), null);
  close(forestSegmentHit(world, point(5), point(5)).t, 0);
  close(forestSegmentHit(fixture(), point(0, 0), point(0, 10), { radius: 0 }).t, 0);
  assert.throws(() => forestLineClear(world, { x: 1, z: 2 }, point(1)), TypeError);
  assert.throws(() => forestLineClear(world, point(0), point(1), { radius: -1 }), TypeError);
});

test('long rays reuse local broadphase output without reading or copying the forest collider list', () => {
  let calls = 0, scratch, maxReach = 0;
  const world = { heightAt: () => 0, get colliders() { throw Error('Full forest list was accessed'); },
    nearColliders(x, z, reach, out) { calls++; maxReach = Math.max(maxReach, reach); if (scratch) assert.equal(out, scratch); scratch = out; out.length = 0; return out; } };
  assert.equal(forestLineClear(world, point(0), point(400)), true);
  assert.equal(calls, 50); assert.ok(maxReach <= 4.08 + 1e-9);
});


test('registered regional tree species have finite canopy height under their legacy collider kinds', () => {
  for (const kind of ['region-tree', 'village-tree', 'feradom-tree']) {
    const tree = { id: kind, x: 4, z: 0, r: .5, kind };
    const world = fixture([tree], { treeRegistry: { get: id => id === kind ? { base: { y: 2 }, height: 7 } : null } });
    assert.equal(forestSegmentHit(world, point(0, 8), point(8, 8)).collider, tree);
    assert.equal(forestSegmentHit(world, point(0, 14), point(8, 14)), null, 'fire above the crown is unobstructed');
  }
});
