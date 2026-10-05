import test from 'node:test';
import assert from 'node:assert/strict';
import { regionOutline } from '../src/region-layout.js';
import { PLAYABLE_SURVEY } from '../src/region-survey.js';
import { hexOwnerAt, REGION_CELLS, regionAt } from '../src/region-world.js';
import { groundWithRiver } from '../src/world-terrain.js';
import { westWaterSurface } from '../src/west-ground.js';
import { WEST_EDGE_REGIONS, DINELV_ASCENT, DINELV_MESAS } from '../src/southwest-world.js';
import { canWalkSlope, isClimbTerrain, sampleClimbSurface } from '../src/climbing.js';

// Derive the audit from the atlas, independently of the production seam list.
const edges = [], seen = new Set();
for (const name of WEST_EDGE_REGIONS) for (const loop of regionOutline(PLAYABLE_SURVEY, name)) for (let i = 0; i < loop.length; i++) {
  const a = loop[i], b = loop[(i + 1) % loop.length], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
  const x = (a.x + b.x) / 2, z = (a.z + b.z) / 2;
  let nx = dz / length, nz = -dx / length;
  if (hexOwnerAt(x + nx, z + nz) === name) { nx = -nx; nz = -nz; }
  const other = hexOwnerAt(x + nx, z + nz);
  if (!REGION_CELLS[other] || other === name) continue;
  const key = [`${a.x.toFixed(5)},${a.z.toFixed(5)}`, `${b.x.toFixed(5)},${b.z.toFixed(5)}`].sort().join('|');
  if (seen.has(key)) continue;
  seen.add(key); edges.push({ a, dx, dz, length, nx, nz, pair: [name, other].sort().join('/') });
}

test('Cape Heth, Dinelv and Hama meet every built land neighbour without a finite height step', t => {
  let samples = 0, maximum = 0;
  const failures = [], pairs = new Set();
  for (const e of edges) for (let along = 1; along < e.length - .5; along += 2) {
    const x = e.a.x + e.dx * along / e.length, z = e.a.z + e.dz * along / e.length;
    const one = { x: x + e.nx * .0005, z: z + e.nz * .0005 }, two = { x: x - e.nx * .0005, z: z - e.nz * .0005 };
    assert.equal(westWaterSurface(one.x, one.z), null, 'these audited joins are dry');
    assert.equal(westWaterSurface(two.x, two.z), null, 'these audited joins are dry');
    const delta = Math.abs(groundWithRiver(one.x, one.z) - groundWithRiver(two.x, two.z));
    maximum = Math.max(maximum, delta); samples++; pairs.add(e.pair);
    if (delta >= .015) failures.push({ pair: e.pair, x, z, delta });
  }
  assert.deepEqual(failures.slice(0, 12), [], `${failures.length} dry samples retain a step`);
  assert.equal(pairs.size, 9, 'six restored and three previously continuous joins');
  assert.equal(samples, 1856);
  t.diagnostic(`${edges.length} atlas edges, ${samples} dry samples; maximum 1mm difference ${maximum.toFixed(6)}m.`);
});

test('all six former western boundary outliers converge as the cross-edge distance shrinks', () => {
  for (const [x, z, nx, nz] of [
    [-3754.33205495805, 1965.6234017852462, .5, Math.sqrt(3) / 2],
    [-3200.001927939127, 1996.9909152447276, 1, 0],
    [-3750.867953342912, 2310.033563299022, .5, Math.sqrt(3) / 2],
    [-3350.6384799234143, 2656.311238272279, -.5, -Math.sqrt(3) / 2],
    [-3050.6384799234143, 2771.0462651912408, .5, -Math.sqrt(3) / 2],
    [-2950.001927939128, 2828.413778650722, 1, 0],
  ]) {
    const difference = half => Math.abs(groundWithRiver(x + nx * half, z + nz * half) - groundWithRiver(x - nx * half, z - nz * half));
    const wide = difference(.05), narrow = difference(.0005);
    assert.ok(narrow < .015 && narrow < wide * .02, `${x},${z}: ${narrow} versus ${wide}`);
  }
});

test('Dinelv uses normal climbing rules on its mesa faces while its authored ascent remains walkable both ways', () => {
  const world = { heightAt: groundWithRiver, regionAt, colliders: [] };
  for (const [index, offset] of [58, 66.5, 56].entries()) {
    const mesa = DINELV_MESAS[index], x = mesa.x + offset, z = mesa.z;
    assert.ok(isClimbTerrain(world, x, z), `${mesa.id} belongs to the normal climbing region`);
    assert.ok(sampleClimbSurface(world, x, z).slope > 5);
    assert.equal(canWalkSlope(x, z, x - .14, z, world), false, `${mesa.id} cannot be scaled with ordinary walking`);
  }
  for (let i = 1; i < DINELV_ASCENT.line.length; i++) {
    const a = DINELV_ASCENT.line[i - 1], b = DINELV_ASCENT.line[i], count = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / .14);
    let before = a;
    for (let step = 1; step <= count; step++) {
      const after = { x: a.x + (b.x - a.x) * step / count, z: a.z + (b.z - a.z) * step / count };
      assert.ok(canWalkSlope(before.x, before.z, after.x, after.z, world), `uphill segment ${i}, step ${step}`);
      assert.ok(canWalkSlope(after.x, after.z, before.x, before.z, world), `downhill segment ${i}, step ${step}`);
      before = after;
    }
  }
});
