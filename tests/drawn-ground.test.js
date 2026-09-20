import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';

/**
 * The ground you stand on and the ground you see are two different surfaces:
 * `world.heightAt` is analytic, and the terrain the renderer draws is a grid whose
 * vertices are 2.5 m apart in one fine band and 7.1 m apart everywhere else
 * (`axisSamples` in src/world.js). Where the analytic surface has a step the grid
 * cannot follow, the drawn triangle floats above the surface a traveler walks on and
 * the traveler is buried in a visible bank. `docs/known-issues.md` measures the worst
 * of it at Ambron.
 *
 * The one thing that must never regress is the ground the traveler is actually sent
 * to: nobody the game puts on the map, and no place it names, may be under the ground
 * it draws. Being *above* the drawn terrain is ordinary — a bridge deck, a quay, a
 * pier and a city stair all sit over it on purpose — so only burial is measured here.
 */
const { createWorld } = await sourceModule('../src/world.js');
const scene = new THREE.Scene();
const world = createWorld(scene, { spatialBatches: false });
const terrain = scene.getObjectByName('The ground of the four regions').children.find(mesh => mesh.name === 'Whole-world terrain');
const position = terrain.geometry.attributes.position;
const columns = (() => { const first = position.getX(0); let n = 1; while (n < position.count && position.getX(n) !== first) n++; return n; })();
const rows = position.count / columns;
const xs = Array.from({ length: columns }, (_, i) => position.getX(i));
const zs = Array.from({ length: rows }, (_, j) => position.getZ(j * columns));
const cell = (values, value) => { let low = 0, high = values.length - 1; while (high - low > 1) { const mid = (low + high) >> 1; if (values[mid] <= value) low = mid; else high = mid; } return low; };

/** The height of the triangle the renderer draws under (x, z), or null off the grid. */
function drawnHeight(x, z) {
  if (x < xs[0] || x > xs.at(-1) || z < zs[0] || z > zs.at(-1)) return null;
  const i = cell(xs, x), j = cell(zs, z);
  const u = (x - xs[i]) / (xs[i + 1] - xs[i]), v = (z - zs[j]) / (zs[j + 1] - zs[j]);
  const height = (di, dj) => position.getY((j + dj) * columns + i + di);
  // Each cell is indexed a, a+columns, a+1 then a+1, a+columns, a+columns+1: the split runs u+v = 1.
  return u + v <= 1
    ? height(0, 0) + (height(1, 0) - height(0, 0)) * u + (height(0, 1) - height(0, 0)) * v
    : height(1, 1) + (height(0, 1) - height(1, 1)) * (1 - u) + (height(1, 0) - height(1, 1)) * (1 - v);
}
/** How deep a traveler standing at (x, z) is inside the drawn ground, in metres. */
const buriedBy = (x, z) => { const drawn = drawnHeight(x, z); return drawn === null ? 0 : drawn - world.heightAt(x, z); };
const worst = points => points.reduce((deepest, point) => {
  const depth = buriedBy(point.x, point.z);
  return depth > deepest.depth ? { ...point, depth, drawn: drawnHeight(point.x, point.z), walk: world.heightAt(point.x, point.z) } : deepest;
}, { depth: -Infinity });
const say = found => `${found.id ?? ''} at ${found.x.toFixed(1)}, ${found.z.toFixed(1)} (${world.regionAt(found.x, found.z)?.name}) stands ${found.depth.toFixed(2)} m inside the drawn ground: walkable ${found.walk.toFixed(2)}, drawn ${found.drawn.toFixed(2)}`;

test('the terrain grid is fine where the game was authored fine and coarse elsewhere, and covers the whole world', () => {
  const spacing = values => values.slice(1).map((value, i) => value - values[i]);
  for (const values of [xs, zs]) {
    assert.ok(Math.min(...spacing(values)) >= 2.2, 'no vertex is closer than the fine band');
    assert.ok(Math.max(...spacing(values)) <= 7.2, 'and none is further apart than the coarse band');
  }
  assert.ok(xs[0] <= world.bounds.minX && xs.at(-1) >= world.bounds.maxX, 'the grid covers the world east to west');
  assert.ok(zs[0] <= world.bounds.minZ && zs.at(-1) >= world.bounds.maxZ, 'and north to south');
});

test('nobody the world places is standing inside the ground the world draws', () => {
  const found = worst(Object.entries(world.npcPositions).map(([id, place]) => ({ id, x: place.x, z: place.z })));
  assert.ok(found.depth <= 1, say(found));
});

test('no place the world names is buried in the ground the world draws', () => {
  const found = worst(world.landmarks.filter(site => Number.isFinite(site.x) && Number.isFinite(site.z)).map(site => ({ id: site.id, x: site.x, z: site.z })));
  assert.ok(found.depth <= 1, say(found));
});

test('the main road is never more than waist-deep in the bank beside it', () => {
  // Measured 2026-09: one 4 m stretch at the road's west end on the Moros Plain, 1.85 m deep.
  // Everything else on 1.7 km of road is within a metre. Tighten this when the grid is fixed.
  const road = world.paths[0], points = [];
  for (let i = 1; i < road.length; i++) {
    const a = road[i - 1], b = road[i], steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) * 2));
    for (let step = 0; step <= steps; step++) { const t = step / steps; points.push({ id: 'main road', x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }); }
  }
  const found = worst(points);
  assert.ok(found.depth <= 2, say(found));
  assert.ok(points.filter(point => buriedBy(point.x, point.z) > 1).length <= 12, 'no new stretch of the road has sunk into its bank');
});
