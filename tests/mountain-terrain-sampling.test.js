import test from 'node:test';
import assert from 'node:assert/strict';
import { regionOutline, METRES_PER_HEX } from '../src/world/terrain/region-layout.js';
import { REGION_OUTLINES, TRANSFORM, hexAtlasCorners } from '../src/world/terrain/region-world.js';
import { PLAYABLE_SURVEY } from '../src/dev/tools/region-survey.js';
import { BALDRO_CELLS, baldroOwns, baldroInset, BALDRO_PATHS, baldroSurfaceHeight } from '../src/content/regions/baldro/baldro-world.js';
import { SOUTH_OREMINDI_CELLS, southOremindiOwns, southOremindiInset, SOUTH_OREMINDI, PATHS, southOremindiGround } from '../src/content/regions/south-oremindi/south-oremindi-world.js';
import { cacheTerrainPointSamples } from '../src/world/terrain/terrain-point-cache.js';

const baldroOutline = regionOutline({ origin: PLAYABLE_SURVEY.origin, regions: [{name: 'Baldro', cells: BALDRO_CELLS}] }, 'Baldro', TRANSFORM);
const fixtures = [
  ['Baldro', BALDRO_CELLS, baldroOutline, baldroOwns, baldroInset, BALDRO_PATHS, baldroSurfaceHeight],
  ['South Oremindi', SOUTH_OREMINDI_CELLS, REGION_OUTLINES[SOUTH_OREMINDI], southOremindiOwns, southOremindiInset, PATHS, southOremindiGround],
];
const distanceToEdge = (x, z, a, b) => {
  const dx = b.x - a.x, dz = b.z - a.z, length = dx * dx + dz * dz;
  const t = length ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / length)) : 0;
  return Math.hypot(x - a.x - t * dx, z - a.z - t * dz);
};
for (const [name, cells, outline, owns, inset, paths, height] of fixtures) {
  test(`${name} boundary pruning uses the actual world-space hex radius`, () => {
    const radius = METRES_PER_HEX / Math.sqrt(3);
    for (const cell of cells) for (const corner of hexAtlasCorners(cell.q, cell.r)) {
      const world = TRANSFORM.atlasToWorld(corner.x, corner.y);
      assert.ok(Math.abs(Math.hypot(world.x - cell.x, world.z - cell.z) - radius) < 1e-9,
        'the radius comes from the current atlas transform, without authored-coordinate rescaling');
    }
  });
  test(`${name} boundary candidates retain exact distances inside every hex and along its borders`, () => {
    const edges = outline.flatMap(loop => loop.map((a, i) => [a, loop[(i + 1) % loop.length]]));
    const points = cells.flatMap(c => Array.from({length: 81}, (_, i) => [c.x + (i % 9 - 4) * 14.5, c.z + (Math.floor(i / 9) - 4) * 14.5]));
    for (const [a, b] of edges) for (const t of [0, .25, .5, .75, 1]) {
      const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      points.push([x, z], [x + 1e-7, z - 1e-7], [x - 1e-7, z + 1e-7]);
    }
    for (const [x, z] of points) {
      let expected = owns(x, z) ? Infinity : 0;
      if (expected) for (const [a, b] of edges) expected = Math.min(expected, distanceToEdge(x, z, a, b));
      assert.equal(inset(x, z), expected, `${name} inset at ${x},${z}`);
      assert.equal(inset(x, z), expected, 'an immediately repeated query stays exact');
    }
  });
  test(`${name} path heights stay stable across slope probes and cache eviction`, () => {
    const points = paths.flatMap(path => path.points.filter((p, i) => i % 3 === 0));
    const expected = points.map(p => height(p.x, p.z));
    for (let i = points.length - 1; i >= 0; i--) {
      const p = points[i];
      for (let offset = 1; offset <= 10; offset++) height(p.x + offset * .75, p.z - offset * .75);
      assert.equal(height(p.x, p.z), expected[i]);
    }
  });
}

test('bounded path sampling keeps each path and coordinate independent through eviction', () => {
  const first = Object.freeze({y: 17}), second = Object.freeze({y: -3});
  const direct = (path, x, z) => ({distance: Math.hypot(x, z), y: path.y + x * .3 - z * .7});
  const cached = cacheTerrainPointSamples(direct);
  for (const path of [first, second, first]) for (let run = 0; run < 3; run++) for (let i = 19; i >= 0; i--) {
    const x = i % 13, z = i % 7;
    assert.deepEqual(cached(path, x, z), direct(path, x, z));
  }
});
