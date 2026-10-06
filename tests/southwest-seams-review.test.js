import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { regionOutline } from '../src/world/terrain/region-layout.js';
import { PLAYABLE_SURVEY } from '../src/dev/tools/region-survey.js';
import { hexOwnerAt, REGION_CELLS } from '../src/world/terrain/region-world.js';
import { groundWithRiver } from '../src/world/terrain/world-terrain.js';
import { WEST_PROFILES, WEST_POOL_LEVELS, westWaterSurface } from '../src/content/regions/western-regions/west-ground.js';
import { SOUTHWEST_NORTH_REGIONS, southwestSeamWeight } from '../src/content/regions/southwest/southwest-world.js';
import { shouldStartTerrainFall } from '../src/gameplay/movement/terrain-fall.js';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function borders(names) {
  const seen = new Set(), edges = [];
  for (const name of names) for (const loop of regionOutline(PLAYABLE_SURVEY, name)) for (let i = 0; i < loop.length; i++) {
    const a = loop[i], b = loop[(i + 1) % loop.length], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    const x = (a.x + b.x) / 2, z = (a.z + b.z) / 2;
    let nx = dz / length, nz = -dx / length;
    if (hexOwnerAt(x + nx, z + nz) === name) { nx = -nx; nz = -nz; }
    const other = hexOwnerAt(x + nx, z + nz);
    if (!REGION_CELLS[other] || other === name) continue;
    const key = [`${a.x.toFixed(5)},${a.z.toFixed(5)}`, `${b.x.toFixed(5)},${b.z.toFixed(5)}`].sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key); edges.push({ a, b, dx, dz, length, nx, nz, name, other });
  }
  return edges;
}
const northEdges = borders(SOUTHWEST_NORTH_REGIONS);
function cross(edge, along, half) {
  const x = edge.a.x + edge.dx * along / edge.length, z = edge.a.z + edge.dz * along / edge.length;
  return { x, z, delta: Math.abs(groundWithRiver(x + edge.nx * half, z + edge.nz * half)
    - groundWithRiver(x - edge.nx * half, z - edge.nz * half)) };
}

test('the newly repaired northern land joins have no dry ownership-edge steps', t => {
  let samples = 0, wet = 0, largest = 0, worst = null;
  const failures = [];
  // Nether already meets its neighbours with its own measured 10cm seam
  // contract; preserve that below rather than replace its authored correction.
  for (const edge of northEdges.filter(e => e.other !== 'Nether Desert')) for (let along = 1; along < edge.length - .5; along += 2) {
    const sample = cross(edge, along, .0005);
    // The unchanged, discretely sampled river bed is submerged; its profile
    // and water levels have their own exact preservation contract below.
    if ([-1, 1].every(side => westWaterSurface(sample.x + edge.nx * side * .0005, sample.z + edge.nz * side * .0005) !== null)) { wet++; continue; }
    if (sample.delta > largest) { largest = sample.delta; worst = { ...sample, pair: [edge.name, edge.other] }; }
    if (sample.delta >= .015) failures.push({ ...sample, pair: [edge.name, edge.other] });
    samples++;
  }
  assert.deepEqual(failures, [], 'dry joins must not retain a finite step as probe spacing approaches zero');
  assert.ok(samples > 2000);
  t.diagnostic(`${samples} dry border samples; ${wet} preserved wet samples; largest 1mm difference ${largest.toFixed(6)}m at ${JSON.stringify(worst)}`);
});

test('the former forest, river-bank and Ganesh perimeter outliers converge continuously', () => {
  const cases = [
    ['Navarth', -3255.834632346121, 862.7903768654761],
    ['Navarth', -3397.403851727774, 951.2604307034012],
    ['Navarth', -3585.50896949429, 1192.0680518387328],
    ['West Pyros', -3000.0019279391277, 955.7604307034012],
    ['Ganesh Desert', -3402.600004150481, 1704.8157806499148],
    ['Ganesh Desert', -3750.0019279391277, 1786.9183210283586],
    ['Ganesh Plain', -3094.1692235321334, 1879.8883748662838],
  ];
  for (const [name, x, z] of cases) {
    const edges = northEdges.filter(e => e.name === name || e.other === name);
    let nearest = null, distance = Infinity, at = 0;
    for (const edge of edges) {
      const along = Math.max(0, Math.min(edge.length, ((x - edge.a.x) * edge.dx + (z - edge.a.z) * edge.dz) / edge.length));
      const d = Math.hypot(x - edge.a.x - edge.dx * along / edge.length, z - edge.a.z - edge.dz * along / edge.length);
      if (d < distance) { distance = d; nearest = edge; at = along; }
    }
    assert.ok(distance < 1e-6, 'retain the exact former ownership boundary');
    const wide = cross(nearest, at, .05).delta, narrow = cross(nearest, at, .0005).delta;
    assert.ok(narrow < .002 && narrow < wide * .02, `${name}: ${narrow} versus ${wide}`);
  }
});

test('the already repaired Oves and Nether joins retain their narrow continuity', t => {
  const names = ['East Pyros', 'Nether Desert', 'Oves Desert'];
  let samples = 0, largest = 0;
  for (const edge of borders(names).filter(e => names.includes(e.other) || e.name === 'Nether Desert' && e.other === 'West Pyros'))
    for (let along = 2; along < edge.length - 1; along += 3) {
      const sample = cross(edge, along, .05);
      largest = Math.max(largest, sample.delta);
      assert.ok(sample.delta < .04, `${edge.name}/${edge.other} at ${sample.x},${sample.z}: ${sample.delta}`);
      samples++;
    }
  assert.ok(samples > 300);
  // Its original +/-5cm measured correction leaves a 3.97cm limit at this
  // endpoint (clean baseline a2e49c3). This pass retains that existing small
  // residual; it does not silently claim a new millimetre contract for Nether.
  const x = -3099.135902535343, z = 837.7903768654761, e = .0005;
  const residual = Math.abs(groundWithRiver(x + .5 * e, z - Math.sqrt(3) / 2 * e)
    - groundWithRiver(x - .5 * e, z + Math.sqrt(3) / 2 * e));
  assert.ok(residual < .045, `preserved Nether endpoint residual: ${residual}`);
  t.diagnostic(`${samples} repaired border samples; maximum 10cm difference ${largest.toFixed(6)}m`);
});

test('the seam correction preserves every river profile, pool level and distant authored ground height', () => {
  assert.equal(hash([...WEST_PROFILES]), '85f2bd3a7d948e2aa9a6c18d6e337cfa0d8c0339a4038e7cd15c650eff4b0f5d');
  assert.equal(hash([...WEST_POOL_LEVELS]), '39a84620cdb95c58b09b6423b184389c41ffdf2950cd231d76ffc4c6ac9c9093');
  for (const [x, z, y] of [
    [-3350, 1100, 51.59970602876152], [-3500, 1450, 14.87875760138859],
    [-3000, 1580, 19.233669839490158], [-3500, 1900, 167.96206590160205],
    [-2700, 2360, 50.13601031075318], [-3750, 2100, 150.02414349680896],
  ]) {
    assert.equal(southwestSeamWeight(x, z), 0, `${x},${z} is outside the correction band`);
    assert.equal(groundWithRiver(x, z), y, `retained interior at ${x},${z}`);
  }
});

test('the gentle Ganesh border crossings no longer drop a traveler off a hex-edge ledge', () => {
  for (const [x, z, nx, nz] of [[-3750.0019279391277, 1786.9183210283586, 1, 0], [-3094.1692235321334, 1879.8883748662838, .5, Math.sqrt(3) / 2]]) {
    for (const direction of [-1, 1]) {
      let before = { x: x - nx * 2 * direction, z: z - nz * 2 * direction };
      before.y = groundWithRiver(before.x, before.z);
      for (let step = 1; step <= 40; step++) {
        const along = (-2 + step * .1) * direction, after = { x: x + nx * along, z: z + nz * along };
        const floor = groundWithRiver(after.x, after.z);
        const s = .4, gx = (groundWithRiver(after.x + s, after.z) - groundWithRiver(after.x - s, after.z)) / (2 * s);
        const gz = (groundWithRiver(after.x, after.z + s) - groundWithRiver(after.x, after.z - s)) / (2 * s);
        assert.equal(shouldStartTerrainFall({ before, after, floor, groundSlope: Math.hypot(gx, gz) }), false, `${x},${z} direction${direction} step${step}`);
        before = { ...after, y: floor };
      }
    }
  }
});
