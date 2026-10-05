import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { groundWithRiver } from '../src/world-terrain.js';
import { TROGO_REVIEW_SEAMS, trogoReviewSeamWeight, SOUTHWEST_SEAM, TROGO_PATHS, TROGO_NORTH_LINK_WALK, trogoWay, TROGO_WAY } from '../src/southwest-world.js';
import { hexOwnerAt } from '../src/region-world.js';
import { SOUTHWEST_RIVERS } from '../src/west-regions.js';
import { WEST_PROFILES } from '../src/west-ground.js';

test('both reproduced internal Trogo steps are continuous along their full atlas edges', t => {
  assert.equal(TROGO_REVIEW_SEAMS.length, 2);
  for (const edge of TROGO_REVIEW_SEAMS) {
    let worst = 0;
    const n = Math.sqrt(edge.length2), nx = edge.dz / n, nz = -edge.dx / n;
    for (let i = 0; i <= 100; i++) {
      const x = edge.a.x + edge.dx * i / 100, z = edge.a.z + edge.dz * i / 100;
      assert.equal(trogoReviewSeamWeight(x, z), 1);
      const delta = Math.abs(groundWithRiver(x + nx * .001, z + nz * .001) - groundWithRiver(x - nx * .001, z - nz * .001));
      worst = Math.max(worst, delta);
    }
    t.diagnostic(`${edge.id}: greatest height difference across 2 mm is ${worst} m`);
    assert.ok(worst < .003, 'no artificial metre-scale step remains');
    const x = (edge.a.x + edge.b.x) / 2, z = (edge.a.z + edge.b.z) / 2;
    assert.equal(trogoReviewSeamWeight(x + nx * (SOUTHWEST_SEAM.reach + .01), z + nz * (SOUTHWEST_SEAM.reach + .01)), 0);
    assert.equal(trogoReviewSeamWeight(x - nx * (SOUTHWEST_SEAM.reach + .01), z - nz * (SOUTHWEST_SEAM.reach + .01)), 0);
  }
});

test('Trogo keeps all frozen outside-band terrain and Southwest river profiles unchanged', () => {
  const outside = [];
  for (let z = 2640; z <= 3160; z += 20) for (let x = -2630; x <= -2110; x += 20)
    if (!trogoReviewSeamWeight(x, z)) outside.push([x, z, groundWithRiver(x, z)]);
  assert.equal(outside.length, 687);
  assert.equal(createHash('sha256').update(JSON.stringify(outside)).digest('hex'), '01ae48c517baeccdea192ce9ebeaeec9c49eeb81de6aa16ae6240f9f62825d6a');
  const profiles = SOUTHWEST_RIVERS.map(river => [river.id, WEST_PROFILES.get(river.id)]);
  assert.equal(createHash('sha256').update(JSON.stringify(profiles)).digest('hex'), '0d5e9bfec4c70ea4131c65203b40543f301e1b1675ced8f0b053f0510df4e5d2');
});

test('the recommended north-link turn preserves its old vegetation footprint and uses the verified open inner bank', () => {
  const path = TROGO_PATHS.find(row => row.id === 'north-link');
  assert.deepEqual(path.line.map(p => [p.x, p.z]), [[-2302, 2712], [-2290, 2778], [-2286, 2840], [-2294, 2884]]);
  assert.equal(path.walkLine, TROGO_NORTH_LINK_WALK);
  assert.deepEqual(path.walkLine.map(p => [p.x, p.z]), [[-2352, 2706], [-2332, 2714], [-2312, 2718], [-2300, 2723],
    [-2290, 2778], [-2286, 2840], [-2294, 2884]], 'exact route that passed the actual controller without falls');
  for (let i = 1; i < path.walkLine.length; i++) {
    const a = path.walkLine[i - 1], b = path.walkLine[i], n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / .25);
    for (let j = 0; j <= n; j++) {
      const x = a.x + (b.x - a.x) * j / n, z = a.z + (b.z - a.z) * j / n, s = .45;
      assert.equal(hexOwnerAt(x, z), 'Trogo');
      assert.ok(trogoWay(x, z) >= TROGO_WAY.open, 'no new forest clearing is needed');
      const slope = Math.hypot((groundWithRiver(x + s, z) - groundWithRiver(x - s, z)) / (2 * s),
        (groundWithRiver(x, z + s) - groundWithRiver(x, z - s)) / (2 * s));
      assert.ok(slope < .8, 'the recommendation avoids the original coastal cliff');
    }
  }
});
