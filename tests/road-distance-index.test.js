import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoadDistanceIndex } from '../src/world/terrain/road-distance-index.js';

const linear = (segments, x, z) => {
  let min = Infinity;
  for (const s of segments) {
    const dx = s.bx - s.ax, dz = s.bz - s.az;
    const t = Math.max(0, Math.min(1, ((x - s.ax) * dx + (z - s.az) * dz) / (dx * dx + dz * dz)));
    min = Math.min(min, Math.hypot(x - s.ax - t * dx, z - s.az - t * dz) - s.width / 2);
  }
  return min;
};
const random = () => {
  let seed = 991271;
  return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
};

test('indexed road distances exactly match the old loop throughout and far beyond mixed-width winding roads', () => {
  const rand = random(), segments = Array.from({ length: 701 }, (_, i) => {
    const ax = rand() * 10000 - 5000, az = rand() * 10000 - 5000;
    return { ax, az, bx: ax + Math.cos(i) * (1 + rand() * 600), bz: az + Math.sin(i) * (1 + rand() * 600), width: .8 + rand() * 40 };
  });
  const original = segments.slice(), index = createRoadDistanceIndex(segments);
  for (let i = 0; i < 3000; i++) {
    const scale = i % 3 ? 10000 : 1e9, x = (rand() - .5) * scale, z = (rand() - .5) * scale;
    assert.equal(index.distance(x, z), linear(segments, x, z), `${x}, ${z}`);
  }
  for (const s of segments) for (const t of [0, .5, 1]) {
    const x = s.ax + (s.bx - s.ax) * t, z = s.az + (s.bz - s.az) * t;
    assert.equal(index.distance(x, z), linear(segments, x, z));
  }
  assert.deepEqual(segments, original, 'index construction never reorders authored segments');
  assert.equal(index.stats().builds, 1);
});

test('width-aware bounds never prune a farther but wider road or negative distances inside overlapping roads', () => {
  const segments = Array.from({ length: 100 }, (_, i) => ({ ax: i * 10, az: -5, bx: i * 10 + 1, bz: 5, width: 1 }));
  segments.push({ ax: 2000, az: -100, bx: 2000, bz: 100, width: 6000 });
  const index = createRoadDistanceIndex(segments);
  assert.equal(index.distance(0, 0), -1000);
  for (let x = -8000; x <= 8000; x += 7.3) assert.equal(index.distance(x, .1), linear(segments, x, .1));
});

test('appended and removed roads rebuild automatically while in-place edits use explicit rebuilding', () => {
  const segments = [], index = createRoadDistanceIndex(segments);
  assert.equal(index.distance(0, 0), Infinity);
  segments.push({ ax: 100, az: -5, bx: 100, bz: 5, width: 4 });
  assert.equal(index.distance(0, 0), 98);
  segments.push({ ax: 0, az: -5, bx: 0, bz: 5, width: 2 });
  assert.equal(index.distance(0, 0), -1);
  segments.pop(); assert.equal(index.distance(0, 0), 98);
  segments[0].width = 10; assert.equal(index.rebuild(), index);
  assert.equal(index.distance(0, 0), 95);
  assert.equal(index.stats().builds, 5);
});

test('degenerate paths and unusual numerical inputs retain the original loop semantics', () => {
  const ordinary = { ax: 1, az: 2, bx: 3, bz: 4, width: 2 };
  for (const bad of [
    { ax: 7, az: 8, bx: 7, bz: 8, width: 2 },
    { ...ordinary, width: NaN }, { ...ordinary, width: Infinity }, { ...ordinary, ax: Infinity },
    { ax: -1e200, az: -1e200, bx: 1e200, bz: 1e200, width: 2 },
    { ax: 0, az: 0, bx: 1e-300, bz: 1e-300, width: 2 },
  ]) {
    const segments = [ordinary, bad], index = createRoadDistanceIndex(segments);
    for (const [x, z] of [[0, 0], [10, -1], [Infinity, 0], [0, NaN]])
      assert.ok(Object.is(index.distance(x, z), linear(segments, x, z)));
  }
  const index = createRoadDistanceIndex([ordinary]);
  for (const [x, z] of [[Infinity, 1], [NaN, 0], [1, -Infinity], [1e308, -1e308]])
    assert.ok(Object.is(index.distance(x, z), linear([ordinary], x, z)));
});

test('branch boundaries preserve exact distances at large translated coordinates', () => {
  for (const shift of [0, 1e8, 1e12, -1e12]) {
    const segments = Array.from({ length: 70 }, (_, i) => ({ ax: shift + i * 4.1, az: shift + i % 5,
      bx: shift + (i + 1) * 4.1, bz: shift + (i + 1) % 5, width: 4.2 }));
    const index = createRoadDistanceIndex(segments);
    for (let i = 0; i < 250; i++) {
      const x = shift + i * 1.1, z = shift + (i % 8) - 3;
      assert.equal(index.distance(x, z), linear(segments, x, z));
    }
  }
});
