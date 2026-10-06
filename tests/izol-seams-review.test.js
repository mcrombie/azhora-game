import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { REGION_CELLS, TRANSFORM, hexAtlasCorners, REGION_OUTLINES } from '../src/world/terrain/region-world.js';
import { regionBase, legacyIzolGroundHeight, groundWithRiver } from '../src/world/terrain/world-terrain.js';
import { WEST_PROFILES, WEST_POOL_LEVELS } from '../src/content/regions/western-regions/west-ground.js';
import { izolSeamWeight } from '../src/content/regions/izol/izol-ground.js';
import { closedRegionEntered } from '../src/world/travel/closed-border.js';

const edges = [], seen = new Set();
for (const c of REGION_CELLS['West Izol']) {
  const loop = hexAtlasCorners(c.q, c.r).map(p => TRANSFORM.atlasToWorld(p.x, p.y));
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i], b = loop[(i + 1) % loop.length];
    const key = [`${a.x.toFixed(5)},${a.z.toFixed(5)}`, `${b.x.toFixed(5)},${b.z.toFixed(5)}`].sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key); const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    edges.push({ a, dx, dz, length, nx: dz / length, nz: -dx / length });
  }
}

test('West Izol original corner and internal hex steps converge on both sides of every island hex edge', t => {
  let maximum = 0, samples = 0;
  for (const e of edges) for (let s = .5; s < e.length; s += 2) {
    const x = e.a.x + e.dx * s / e.length, z = e.a.z + e.dz * s / e.length;
    const delta = Math.abs(groundWithRiver(x + e.nx * .0005, z + e.nz * .0005)
      - groundWithRiver(x - e.nx * .0005, z - e.nz * .0005));
    maximum = Math.max(maximum, delta); samples++;
    assert.ok(delta < .015, `a finite hex step remains at ${x},${z}: ${delta}`);
  }
  for (const [x, z] of [[399.9980720608727, 1876.5208614068024], [399.9980720608719, 1818.7858344878398]]) {
    const range = radius => {
      const heights = Array.from({ length: 12 }, (_, i) => groundWithRiver(x + Math.cos(i * Math.PI / 6) * radius, z + Math.sin(i * Math.PI / 6) * radius));
      return Math.max(...heights) - Math.min(...heights);
    };
    assert.ok(range(.001) < .002 && range(.001) < range(.1) * .02, 'the original East Izol handoff corner converges');
  }
  assert.equal(edges.length, 84);
  t.diagnostic(`${samples} samples across ${edges.length} atlas edges; maximum 1mm difference ${maximum.toFixed(6)}m.`);
});

test('the Izol seam correction leaves other built countries, deep island interiors and western water profiles unchanged', () => {
  for (const [name, cells] of Object.entries(REGION_CELLS)) for (const cell of cells) {
    assert.equal(izolSeamWeight(cell.x, cell.z), 0, `${name} hex centre stays outside the correction band`);
    assert.equal(regionBase(cell.x, cell.z), legacyIzolGroundHeight(cell.x, cell.z));
  }
  const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  assert.equal(hash([...WEST_PROFILES]), '85f2bd3a7d948e2aa9a6c18d6e337cfa0d8c0339a4038e7cd15c650eff4b0f5d');
  assert.equal(hash([...WEST_POOL_LEVELS]), '39a84620cdb95c58b09b6423b184389c41ffdf2950cd231d76ffc4c6ac9c9093');
});

test('East Suval keeps its ground and closed frontier outside the island correction', () => {
  let closedCrossings = 0;
  for (const loop of REGION_OUTLINES['East Suval']) for (let i = 0; i < loop.length; i++) {
    const a = loop[i], b = loop[(i + 1) % loop.length], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    const x = (a.x + b.x) / 2, z = (a.z + b.z) / 2, nx = dz / length, nz = -dx / length;
    const one = { x: x + nx, z: z + nz }, two = { x: x - nx, z: z - nz };
    for (const p of [one, two]) {
      assert.equal(izolSeamWeight(p.x, p.z), 0);
      assert.equal(regionBase(p.x, p.z), legacyIzolGroundHeight(p.x, p.z));
    }
    if (closedRegionEntered(one, two) || closedRegionEntered(two, one)) closedCrossings++;
  }
  assert.ok(closedCrossings > 10, 'the existing entry prohibition is still exercised around the authored border');
});
