import test from 'node:test';
import assert from 'node:assert/strict';
import { IBENWOOD_BOUNDARY as boundary, boundaryDepth, ibenwoodTerritoryAt } from '../src/content/regions/ibenwood/ibenwood-boundary.js';
import { IBENWOOD_NAMES, IBENWOOD_PILOT, IBENWOOD_GROVES, IBENWOOD_ARRIVALS, ibenwoodProtected } from '../src/content/regions/ibenwood/ibenwood-environment.js';
import { REGION_CELLS, hexOwnerAt } from '../src/world/terrain/region-world.js';
import { IBENWOOD_DEFENSE } from '../src/content/regions/ibenwood/ibenwood-defense.js';

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const depth = p => boundaryDepth(p.x, p.z);
function inPolygon(p, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if ((a.z > p.z) !== (b.z > p.z) && p.x < (b.x - a.x) * (p.z - a.z) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

test('the defended territory matches the irregular protected inner belt without annexing the pilot circle', () => {
  const { minX, maxX, minZ, maxZ } = boundary.bounds;
  let inside = 0, outside = 0;
  for (let x = minX; x <= maxX; x += 23) for (let z = minZ; z <= maxZ; z += 23) {
    if (distance({ x, z }, IBENWOOD_PILOT) < 88) continue;
    assert.equal(ibenwoodTerritoryAt(x, z), ibenwoodProtected(x, z));
    if (ibenwoodTerritoryAt(x, z)) { inside++; assert.ok(IBENWOOD_NAMES.includes(hexOwnerAt(x, z))); }
    else outside++;
  }
  assert.ok(inside > 500 && outside > 500);
  assert.equal(boundary.pilot.treeProtected, true);
  assert.equal(boundary.pilot.territorial, false);
  assert.ok(boundary.pilot.depth < -50 && boundary.pilot.depth > -58);
  assert.equal(ibenwoodProtected(IBENWOOD_PILOT.x, IBENWOOD_PILOT.z), true, 'local tree protection is unchanged');
  for (const c of REGION_CELLS['Central Ibenwood']) assert.ok(depth(c) > 0);
  for (const g of IBENWOOD_GROVES) assert.ok(depth(g) > 0);
  for (const region of IBENWOOD_NAMES.filter(n => n !== 'Central Ibenwood')) assert.ok(depth(IBENWOOD_ARRIVALS[region]) < 0);
});

test('one closed atlas-derived contour encloses the forest heart and stays within the ten-metre sampling resolution', () => {
  assert.equal(boundary.contours.length, 1, 'the pilot must not create a second guarded island');
  const loop = boundary.contours[0];
  assert.ok(loop.length > 100);
  let length = 0;
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i], b = loop[(i + 1) % loop.length], span = distance(a, b);
    assert.ok(span <= Math.SQRT2 * 10 + .001);
    assert.ok(span > 0); length += span;
    assert.ok(Math.abs(depth(a)) < .001);
  }
  assert.ok(Math.abs(length - boundary.perimeter) < .001);
  for (const c of REGION_CELLS['Central Ibenwood']) assert.ok(inPolygon(c, loop));
  assert.equal(inPolygon(IBENWOOD_PILOT, loop), false);
  assert.equal(boundaryDepth(NaN, 0), -Infinity);
  assert.equal(boundaryDepth(0, Infinity), -Infinity);
  assert.ok(boundaryDepth(0, 0) < -2000);
});

test('warning signs precede the boundary on paths and lateral approaches while patrols cover the whole perimeter', () => {
  assert.ok(boundary.rangerPosts.length >= 60 && boundary.rangerPosts.length <= 90);
  assert.ok(boundary.markers.length >= Math.ceil(boundary.perimeter / 25));
  for (const marker of boundary.markers) {
    assert.ok(depth(marker) <= -9.99 && depth(marker) >= -10.01, marker.id);
    assert.ok(Math.abs(Math.hypot(marker.nx, marker.nz) - 1) < 1e-9);
    const p = marker.boundary;
    assert.ok(ibenwoodTerritoryAt(p.x + marker.nx * 3, p.z + marker.nz * 3), `${marker.id} points inward`);
  }
  for (const p of boundary.contours[0]) {
    const markerDistance = Math.min(...boundary.markers.map(m => distance(m, p)));
    const patrolDistance = Math.min(...boundary.rangerPosts.map(post => distance(post, p)));
    assert.ok(markerDistance < 23, `unsigned lateral gap of ${markerDistance.toFixed(2)}m`);
    assert.ok(patrolDistance < 30, `uncovered patrol gap of ${patrolDistance.toFixed(2)}m`);
  }
  assert.ok(boundary.crossings.length > 0);
  for (const crossing of boundary.crossings) {
    assert.ok(depth(crossing.warning) < -9.99);
    assert.ok(Math.min(...boundary.markers.map(m => distance(m, crossing.warning))) < 8.01, crossing.id);
  }
});

test('ranger anchors and patrol segments stay inside the belt and face outward', () => {
  assert.equal(boundary.sightRange, IBENWOOD_DEFENSE.visionRange);
  for (const post of boundary.rangerPosts) {
    assert.ok(depth(post) >= 11.99 && depth(post) <= 12.01, post.id);
    assert.equal(post.sight, 44);
    assert.ok(Math.abs(Math.sin(post.yaw) + post.nx) < 1e-9);
    assert.ok(Math.abs(Math.cos(post.yaw) + post.nz) < 1e-9);
    assert.equal(post.patrol.length, 3);
    assert.ok(distance(post.patrol[0], post.patrol[2]) > .5);
    for (let i = 0; i < post.patrol.length; i++) {
      const a = post.patrol[i], b = post.patrol[(i + 1) % post.patrol.length];
      for (let j = 0; j <= 16; j++) {
        const t = j / 16, p = { x: a.x * t + b.x * (1 - t), z: a.z * t + b.z * (1 - t) };
        assert.ok(depth(p) > 2, `${post.id} patrol must not cross out of its own territory`);
      }
    }
  }
});

test('representative approaches walk from unguarded outer forest through warnings into each defended side', () => {
  assert.deepEqual(boundary.approaches.map(a => a.region).sort(), IBENWOOD_NAMES.filter(n => n !== 'Central Ibenwood').sort());
  for (const approach of boundary.approaches) {
    assert.equal(hexOwnerAt(approach.boundary.x, approach.boundary.z), approach.region);
    assert.ok(depth(approach.outside) < -21.99);
    assert.ok(depth(approach.warning) < -9.99);
    assert.ok(depth(approach.inside) > 11.99);
    assert.ok(depth(approach.deep) > 34.99);
    assert.ok(boundary.rangerPosts.some(post => post.id === approach.postId));
  }
});

test('boundary geometry and stable IDs are deterministic and immutable', async () => {
  const second = await import('../src/content/regions/ibenwood/ibenwood-boundary.js?determinism-check');
  assert.deepEqual(second.IBENWOOD_BOUNDARY, boundary);
  const entries = [...boundary.markers, ...boundary.rangerPosts, ...boundary.crossings, ...boundary.approaches];
  assert.equal(new Set(entries.map(e => e.id)).size, entries.length);
  assert.throws(() => { boundary.rangerPosts[0].patrol[0].x = 0; }, TypeError);
  assert.throws(() => { boundary.markers.push({}); }, TypeError);
});
