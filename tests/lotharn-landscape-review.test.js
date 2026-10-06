import test from 'node:test';
import assert from 'node:assert/strict';
import { lotharnLandscapeDelta, RAMPS, PEAKS, peakUplift } from '../src/content/regions/east-lotharn/east-lotharn-world.js';
import { CAVE_LINES } from '../src/content/regions/east-lotharn/east-lotharn-caves.js';
import { groundWithRiver } from '../src/world/terrain/world-terrain.js';
import { varnBeforeLips, lipRib, varnCaveAccessDelta, varnLandscapeSceneryDelta } from '../src/content/regions/varn/varn-world.js';

test('weathered northern faces have unequal relief without lowering cave roofs', () => {
  let changed = 0, largest = 0;
  const relief = new Set();
  for (let z = -1180; z < -975; z += 3) for (let x = -1660; x < -1140; x += 3) {
    const added = lotharnLandscapeDelta(x, z);
    assert.ok(Number.isFinite(added) && added >= 0 && added < 25);
    if (added > .1) { changed++; largest = Math.max(largest, added); relief.add(Math.round(added)); }
  }
  assert.ok(changed > 100, `${changed} samples receive visible weathered spurs`);
  assert.ok(largest > 8, 'large mountain faces receive substantial rather than subpixel relief');
  assert.ok(relief.size > 8, 'the broken faces do not share one repeated spur height');
});

test('the Varn approach stays fixed outside the bounded upper western shoulder', () => {
  for (let z = -975; z <= -590; z += 8) for (let x = -1570; x <= -690; x += 8)
    if (!(x > -1440 && x < -1355 && z < -918))
      assert.equal(lotharnLandscapeDelta(x, z), 0, `${x},${z}`);
});

test('the visible western shoulder crosses upper courses but retains its first two courses and window edges', t => {
  let changed = 0, largest = 0, lowCourse = 0;
  for (let z = -975; z <= -918; z += 2) for (let x = -1440; x <= -1355; x += 2) {
    const lift = peakUplift(x, z), added = lotharnLandscapeDelta(x, z);
    assert.ok(added >= 0 && added < 25);
    if (lift <= 80) { assert.equal(added, 0, `protected first two courses ${x},${z}`); lowCourse++; }
    if (added > 2) changed++;
    largest = Math.max(largest, added);
  }
  assert.ok(lowCourse > 100, 'the lower face is sampled as well as its raised shoulder');
  assert.ok(changed > 70, `${changed} visible samples exceed two metres of shaping`);
  assert.ok(largest > 15, `${largest}m maximum changes a major face at the review target`);
  for (let z = -975; z <= -918; z += 1) for (const x of [-1440, -1355])
    assert.equal(lotharnLandscapeDelta(x, z), 0, `window side ${x},${z}`);
  for (let x = -1440; x <= -1355; x += 1)
    assert.equal(lotharnLandscapeDelta(x, -918), 0, `window foot ${x}`);
  t.diagnostic(`${changed} samples on a 2m grid exceed 2m of shaping; maximum ${largest.toFixed(6)}m; ${lowCourse} lower-course samples remain fixed`);
});

test('weathering preserves summit floors, authored routes and all cave mouths', () => {
  for (const peak of PEAKS) assert.equal(lotharnLandscapeDelta(peak.x, peak.z), 0, peak.id);
  for (const ramp of RAMPS) for (const p of ramp.line.points)
    assert.equal(lotharnLandscapeDelta(p.x, p.z), 0, `${ramp.id}: ${p.x},${p.z}`);
  // A route is a tread with shoulders, not just its authored centreline.
  // Interpolate the western peak's complete paths and retain the full 7m guard.
  for (const ramp of RAMPS.filter(r => r.peak === 'western-peak')) for (let i = 1; i < ramp.line.points.length; i++) {
    const a = ramp.line.points[i - 1], b = ramp.line.points[i];
    const length = Math.hypot(b.x - a.x, b.z - a.z), count = Math.ceil(length);
    for (let step = 0; step <= count; step++) for (const offset of [-6.9, 0, 6.9]) {
      const x = a.x + (b.x - a.x) * step / count + (b.z - a.z) / length * offset;
      const z = a.z + (b.z - a.z) * step / count - (b.x - a.x) / length * offset;
      assert.equal(lotharnLandscapeDelta(x, z), 0, `${ramp.id} full tread at ${x},${z}`);
    }
  }
  for (const cave of CAVE_LINES) {
    const mouths = cave.kind === 'chamber' ? [cave.points[0]] : [cave.points[0], cave.points.at(-1)];
    for (const p of mouths) assert.equal(lotharnLandscapeDelta(p.x, p.z), 0, `${cave.id}: ${peakUplift(p.x,p.z)}`);
    // createCaves searches for its openings against terrain along the whole
    // corridor. Protecting only the nominal mouth moved the central portal.
    for (const p of cave.points) for (const dx of [-4, 0, 4]) for (const dz of [-4, 0, 4])
      assert.equal(lotharnLandscapeDelta(p.x + dx, p.z + dz), 0, `${cave.id} corridor`);
  }
});

test('legacy scenery reads the original rim as well as the original shoulder height', () => {
  const original = (x, z) => varnBeforeLips(x, z) - lotharnLandscapeDelta(x, z);
  let changedRims = 0;
  for (const x of [-1443, -1430, -1420, -1400, -1388, -1357, -1352])
    for (const z of [-983, -971, -952, -947, -935, -919, -915]) {
      const rim = varnLandscapeSceneryDelta(x, z);
      const expected = original(x, z) + lipRib(x, z, original, original(x, z), true);
      const restored = groundWithRiver(x, z) - lotharnLandscapeDelta(x, z) - varnCaveAccessDelta(x, z) - rim;
      assert.ok(Math.abs(restored - expected) < 1e-8, `old scenery ground at ${x},${z}: ${restored - expected}`);
      if (Math.abs(rim) > .01) changedRims++;
    }
  assert.ok(changedRims > 0, 'this regression includes real derived-rim changes');
  for (const [x, z] of [[-1300, -1010], [-1500, -930], [-1150, -780]])
    assert.equal(varnLandscapeSceneryDelta(x, z), 0, 'the scenery inverse has a bounded reach');
});
