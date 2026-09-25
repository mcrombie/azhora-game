import test from 'node:test';
import assert from 'node:assert/strict';
import { drapeRoadOnTerrain, terrainRoadHeight } from '../src/terrain-road.js';

// A ridge in the middle of a flat-edged ribbon: sampling only the road edges
// would hide the whole ridge under the road and let green triangles poke out.
const xs = [0, 1, 2], zs = [0, 1, 2];
const ground = new Float32Array(zs.flatMap(z => xs.flatMap(x => [x, x === 1 ? 2 : 0, z])));
const ribbon = [0, .045, .2, 0, .045, 1.8, 2, .045, .2, 2, .045, 1.8];
const indices = [0, 1, 2, 2, 1, 3];

test('a road crossing a terrain ridge stays above each real ground face without covering its slope', () => {
  const road = drapeRoadOnTerrain(ribbon, indices, xs, zs, ground);
  let area = 0;
  for (let i = 0; i < road.indices.length; i += 3) {
    const v = road.indices.slice(i, i + 3).map(index => road.positions.slice(index * 3, index * 3 + 3));
    const x = v.reduce((sum, p) => sum + p[0], 0) / 3, z = v.reduce((sum, p) => sum + p[2], 0) / 3;
    const y = v.reduce((sum, p) => sum + p[1], 0) / 3;
    const ridge = x <= 1 ? x * 2 : (2 - x) * 2;
    assert.ok(Math.abs(y - ridge - .045) < 1e-8, 'every face, including its interior, clears the terrain');
    const signed = (v[1][0] - v[0][0]) * (v[2][2] - v[0][2]) - (v[1][2] - v[0][2]) * (v[2][0] - v[0][0]);
    assert.ok(signed < 0, 'faces point up'); area += -signed / 2;
    assert.ok(Math.abs(terrainRoadHeight(x, z, xs, zs, ground) - y) < 1e-8, 'feet use the rendered road height');
  }
  assert.ok(Math.abs(area - 3.2) < 1e-8, 'clipping leaves no holes or duplicated surface area');
  assert.ok(road.positions.some((n, i) => i % 3 === 1 && n > 2), 'the ridge remains visible as a slope');
});

test('local draping leaves distant road triangles unchanged and tapers at the boundary', () => {
  const unchanged = drapeRoadOnTerrain(ribbon, indices, xs, zs, ground, .045, () => 0);
  assert.ok(unchanged.positions.every((v, i) => i % 3 !== 1 || v === .045));
  const partial = drapeRoadOnTerrain(ribbon, indices, xs, zs, ground, .045, () => .5);
  assert.ok(partial.positions.every((v, i) => i % 3 !== 1 || v >= .045 - 1e-8 && v <= 1.045 + 1e-8));
});
