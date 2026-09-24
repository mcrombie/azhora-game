import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoadSurfaceMask } from '../src/path-junctions.js';

const p = (x, z) => ({ x, z, y: x * .1 + z * .2 + 3 });
const area = polygon => Math.abs(polygon.reduce((sum, a, i) => {
  const b = polygon[(i + 1) % polygon.length]; return sum + a.x * b.z - a.z * b.x;
}, 0) / 2);
const quad = (a, b, c, d) => [[a, b, c], [a, c, d]];

test('a crossing footpath terminates at both road verges and retains both outside sections', () => {
  const road = quad(p(-2, -5), p(2, -5), p(2, 5), p(-2, 5));
  const trail = quad(p(-3, -.5), p(3, -.5), p(3, .5), p(-3, .5));
  const clipped = trail.flatMap(triangle => createRoadSurfaceMask(road).clip(triangle));
  assert.ok(Math.abs(clipped.reduce((sum, polygon) => sum + area(polygon), 0) - 2) < 1e-7);
  assert.ok(clipped.flat().every(vertex => vertex.x <= -2 + 1e-7 || vertex.x >= 2 - 1e-7));
  assert.ok(clipped.flat().some(vertex => Math.abs(vertex.x + 2) < 1e-7));
  assert.ok(clipped.flat().some(vertex => Math.abs(vertex.x - 2) < 1e-7));
  for (const vertex of clipped.flat()) assert.ok(Math.abs(vertex.y - (vertex.x * .1 + vertex.z * .2 + 3)) < 1e-7, 'new edge vertices retain ground slope');
});

test('an oblique junction clips against the actual angled road face, independent of winding', () => {
  const road = [p(-2, -2), p(2, 2), p(3, -1)], trail = [p(-3, -3), p(4, -3), p(0, 4)];
  const first = createRoadSurfaceMask([road]).clip(trail), reversed = createRoadSurfaceMask([[...road].reverse()]).clip(trail);
  assert.ok(Math.abs(first.reduce((sum, shape) => sum + area(shape), 0) - reversed.reduce((sum, shape) => sum + area(shape), 0)) < 1e-7);
  assert.ok(first.length > 1);
  assert.ok(first.reduce((sum, shape) => sum + area(shape), 0) < area(trail));
});

test('a whole trail face inside the road disappears while disconnected faces remain unchanged', () => {
  const road = quad(p(-2, -5), p(2, -5), p(2, 5), p(-2, 5)), mask = createRoadSurfaceMask(road);
  assert.deepEqual(mask.clip([p(-1, -1), p(1, -1), p(0, 1)]), []);
  const away = [p(9, 9), p(10, 9), p(10, 10)];
  assert.equal(mask.clip(away)[0], away);
});
