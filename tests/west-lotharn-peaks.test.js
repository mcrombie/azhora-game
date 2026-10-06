import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { hexOwnerAt } from '../src/world/terrain/region-world.js';
import { moveCharacter, canStand } from '../src/gameplay/movement/game-state.js';
import { createClimbing, sampleClimbSurface, canWalkSlope } from '../src/gameplay/movement/climbing.js';
import {
  WEST_LOTHARN, WEST_LOTHARN_BOX, PEAKS, PEAK_TOPS, RAMPS, RAMP, BANDS, BALD,
  LONG_VALLEY, NORTH_VALLEY, NOTCH, COL, onRamp, peakUplift, pointOn, westLotharnShare,
} from '../src/content/regions/west-lotharn/west-lotharn-world.js';
import { WEST_CAVE_LINES, createWestLotharnCaves, CAVE, nearestPlain } from '../src/content/regions/west-lotharn/west-lotharn-caves.js';
import { createCaveWalk, caveOutside } from '../src/content/regions/east-lotharn/east-lotharn-caves.js';
import { createLotharnCaveWalk } from '../src/content/regions/east-lotharn/east-lotharn-cave-walk.js';

/**
 * The West Lotharn's summits and caves. The user's two settled decisions of 29 September 2026: the
 * West is the **taller** half, a crest of about five hundred and fifty metres, because the atlas
 * gives it twenty-five mountain hexes to the East's fifteen; and **everything carries over** -
 * cliffs in courses, authored hiking ramps and ledge paths, and caves.
 *
 * The flood fill checks the authored hiking network from the two valleys, notch and col,
 * with the ramps and ledges open and shut. It does not prohibit the separate free-climbing
 * controller, which is exercised on the faces alongside these routes below.
 */
const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());
const g = world.groundHeight, caves = world.westLotharnCaves;
// The authored hiking-route budget, the East Lotharn's own: what a route may climb at, measured
// independently of the free-climbing controller's own limits. These test landform access.
const HIKING_ROUTE = Object.freeze({ easy: .7, limit: 1.19 });
const own = (x, z) => hexOwnerAt(x, z) === WEST_LOTHARN;
/**
 * How far the floor under a traveler may move in one step of a walk through a cave. The East
 * Lotharn holds its own to a quarter of a metre; this range's courses are forty metres and a half
 * rather than thirty-six, so the blend at a mouth covers a steeper face and the worst of these nine
 * is 0.27 m.
 */
const STEP_IN = .35;

const STEP = 1.5, box = WEST_LOTHARN_BOX, W = Math.ceil((box.maxX - box.minX) / STEP), H = Math.ceil((box.maxZ - box.minZ) / STEP);
const heights = new Float32Array(W * H), inside = new Uint8Array(W * H);
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  const x = box.minX + i * STEP, z = box.minZ + j * STEP;
  heights[j * W + i] = g(x, z); inside[j * W + i] = own(x, z) ? 1 : 0;
}
const cell = (x, z) => Math.round((z - box.minZ) / STEP) * W + Math.round((x - box.minX) / STEP);
/** Where a traveler can walk in from: the long valley, the north valley, the notch and the col. */
const WAYS_IN = (() => {
  const out = [{ x: COL.x, z: COL.z }];
  for (const line of [LONG_VALLEY.line, NORTH_VALLEY.line, NOTCH.line])
    for (let along = 0; along <= line.length; along += 4) out.push(pointOn(line, along));
  return out;
})();
function reachable(closed = () => false) {
  const reach = new Uint8Array(W * H), queue = [];
  for (const p of WAYS_IN) { const k = cell(p.x, p.z); if (inside[k] && !reach[k]) { reach[k] = 1; queue.push(k); } }
  while (queue.length) {
    const k = queue.pop(), i = k % W, j = (k - i) / W;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const ii = i + a, jj = j + b;
      if (ii < 0 || jj < 0 || ii >= W || jj >= H) continue;
      const n = jj * W + ii;
      if (reach[n] || !inside[n] || closed(box.minX + ii * STEP, box.minZ + jj * STEP)) continue;
      if ((heights[n] - heights[k]) / (Math.hypot(a, b) * STEP) > HIKING_ROUTE.limit) continue;
      reach[n] = 1; queue.push(n);
    }
  }
  return reach;
}
const summitReached = (reach, peak) => {
  let best = -Infinity, got = false;
  for (let dz = -20; dz <= 20; dz += STEP) for (let dx = -20; dx <= 20; dx += STEP) {
    const k = cell(peak.x + dx, peak.z + dz);
    if (heights[k] > best) { best = heights[k]; got = !!reach[k]; }
  }
  return { top: best, got };
};

test('seven summits stepping down from a crest of about five hundred and fifty metres, each a bald ringed by cliffs', () => {
  const tops = Object.fromEntries(PEAKS.map(peak => [peak.id, summitReached(new Uint8Array(W * H), peak).top]));
  assert.ok(tops['the-crest'] > 530 && tops['the-crest'] < 570, `the crest stands ${tops['the-crest'].toFixed(0)} m`);
  assert.equal(tops['the-crest'], Math.max(...Object.values(tops)), 'the crest is the highest ground in the range');
  let highest = -Infinity;
  for (let k = 0; k < W * H; k++) if (inside[k]) highest = Math.max(highest, heights[k]);
  // The bald is cut level in the summits' own lift, but the ground it is laid on is not level,
  // so the highest point of the crest's top is a few metres from the summit and a few metres
  // above it: 551.2 m fifty-three metres out against 545.5 in the middle.
  assert.ok(Math.abs(highest - tops['the-crest']) < 8, `the highest anywhere is ${highest.toFixed(1)} against the crest's ${tops['the-crest'].toFixed(1)}`);
  // Subordinate summits, stepping down, every one of them over two hundred metres.
  const order = ['the-crest', 'north-summit', 'west-shoulder', 'east-summit', 'spur-summit', 'cold-head', 'south-rampart'];
  for (let i = 1; i < order.length; i++)
    assert.ok(tops[order[i]] < tops[order[i - 1]] + 2, `${order[i]} at ${tops[order[i]].toFixed(0)} is not below ${order[i - 1]}`);
  assert.ok(Object.values(tops).every(top => top > 200), JSON.stringify(tops));
  assert.ok(tops['north-summit'] > 400 && tops['west-shoulder'] > 380, JSON.stringify(tops));

  // The protected lower courses retain roughly forty metres of cliff, against the East Lotharn's
  // thirty-six, and twelve of them from the crest's foot to its bald.
  assert.ok((1 - BANDS.tread) * BANDS.period > 35 && (1 - BANDS.tread) * BANDS.period < 45, 'the lower cliff courses are about forty metres');
  assert.ok(PEAK_TOPS['the-crest'] / BANDS.period > 9, 'ten courses or more under the crest');
  for (const peak of PEAKS) {
    assert.ok(Math.abs(PEAK_TOPS[peak.id] % BANDS.period - BALD.above) < 1e-9, `${peak.id}'s bald is not cut at a course`);
    // A bald is several hundred square metres of it, and all of it within a few metres of level.
    // **Where the country is still giving way to its neighbour there is no bald; there is a front.**
    // `westLotharnShare` fades a summit's lift to nothing at the border, and on a summit as close to
    // one as the spur - a chain of mountain hexes a single hex wide against Vastos - a hundredth of
    // that fade over three metres is two metres of ground. Those points are the mountain front and
    // are measured as the seam, not as the top.
    let area = 0, steepest = 0;
    for (let dz = -35; dz <= 35; dz += 1.5) for (let dx = -35; dx <= 35; dx += 1.5) {
      const x = peak.x + dx, z = peak.z + dz, onTop = u => u >= PEAK_TOPS[peak.id] - .5;
      if (!onTop(peakUplift(x, z)) || westLotharnShare(x, z) < .9999) continue;
      if (onRamp(x, z, 3.5) || onRamp(x + 1.5, z, 3.5) || onRamp(x, z + 1.5, 3.5)) continue;
      area += 2.25;
      if (onTop(peakUplift(x + 1.5, z))) steepest = Math.max(steepest, Math.abs(g(x + 1.5, z) - g(x, z)) / 1.5);
      if (onTop(peakUplift(x, z + 1.5))) steepest = Math.max(steepest, Math.abs(g(x, z + 1.5) - g(x, z)) / 1.5);
    }
    assert.ok(area > 250, `${peak.id}'s bald is ${area.toFixed(0)} m²`);
    assert.ok(steepest < HIKING_ROUTE.easy, `${peak.id}'s bald is walked, not climbed (${steepest.toFixed(2)} at its steepest)`);
  }
});

test('summit caps blend continuously across massif boundaries instead of dropping at nearest-peak changes', () => {
  // The old nearest-peak cap dropped by 184 m across two millimetres here.
  const seam = { x: -1755.551, z: -818.826 };
  assert.ok(Math.abs(g(seam.x + .001, seam.z) - g(seam.x - .001, seam.z)) < .1,
    'the crest/east-summit saddle is continuous');
  let checked = 0;
  // Exercise all pairwise Voronoi seams in the interior, including the parts crossed by ramps.
  for (let i = 0; i < PEAKS.length; i++) for (let j = i + 1; j < PEAKS.length; j++) {
    const a = PEAKS[i], b = PEAKS[j], length = Math.hypot(b.x - a.x, b.z - a.z);
    const nx = (b.x - a.x) / length, nz = (b.z - a.z) / length;
    for (let along = -180; along <= 180; along += 6) {
      const x = (a.x + b.x) / 2 - nz * along, z = (a.z + b.z) / 2 + nx * along;
      if (westLotharnShare(x, z) < .9999) continue;
      const d = Math.hypot(x - a.x, z - a.z);
      if (PEAKS.some(p => Math.hypot(x - p.x, z - p.z) < d - .01)) continue;
      const jump = Math.abs(g(x + nx * .001, z + nz * .001) - g(x - nx * .001, z - nz * .001));
      assert.ok(jump < .1, `${a.id}/${b.id} steps ${jump.toFixed(3)} m at ${x.toFixed(1)},${z.toFixed(1)}`);
      checked++;
    }
  }
  assert.ok(checked > 30, `${checked} interior seam samples`);
});

test('a ramp and ledge overlap cannot introduce a microscopic curb that neither walking nor climbing crosses', () => {
  // This 5 cm step previously jumped 0.279 m when the nearest path switched.
  const x = -1783.1, z = -721.541;
  let previous = g(x - .5, z);
  for (let dx = -.49; dx <= .5; dx += .01) {
    const now = g(x + dx, z);
    assert.ok(Math.abs(now - previous) < .04, `trail join steps ${(now - previous).toFixed(4)} m`);
    previous = now;
  }
});

test('the hiking ramps and ledges reach every summit, while unassisted walking cannot bypass the lower cliffs', () => {
  const open = reachable(), shut = reachable((x, z) => onRamp(x, z, 2.2));
  for (const peak of PEAKS) {
    assert.equal(summitReached(open, peak).got, true, `${peak.id} can be climbed`);
    assert.equal(summitReached(shut, peak).got, false, `${peak.id} cannot be climbed without its ways`);
  }
  let high = 0, low = 0;
  for (let k = 0; k < W * H; k++) { if (shut[k]) high = Math.max(high, heights[k]); if (open[k]) low = Math.max(low, heights[k]); }
  // The East Lotharn's own figure is 170 m; this range is steeper for its width, so it is lower.
  assert.ok(high < 130, `the highest reached without the ways is ${high.toFixed(0)} m`);
  assert.ok(low > 540, `and ${low.toFixed(0)} m with them`);
  // The ramps provide sustained hiking ascents between the main ledges, with short climbable sections.
  const ramps = RAMPS.filter(one => one.kind === 'ramp');
  assert.ok(ramps.length >= 30, `${ramps.length} ramps`);
  assert.ok(RAMPS.some(one => one.kind === 'ledge'), 'and ledge paths joining them');
  for (const ramp of ramps) {
    assert.ok(ramp.to - ramp.from > 20, ramp.id);
    const grade = (ramp.to - ramp.from) / (ramp.line.length - 8);
    assert.ok(grade > HIKING_ROUTE.easy - .1 && grade < HIKING_ROUTE.limit - .3, `${ramp.id} climbs at ${grade.toFixed(2)}`);
    assert.ok(ramp.line.points.every(p => own(p.x, p.z)), `${ramp.id} leaves the country`);
  }
  // Every summit's way up starts on ground a traveler can walk to.
  for (const peak of PEAKS) {
    const first = RAMPS.find(one => one.peak === peak.id && one.kind === 'ramp');
    assert.ok(first, `${peak.id} has no way up at all`);
    const foot = first.line.points[0];
    assert.ok(open[cell(foot.x, foot.z)] || [-1.5, 0, 1.5].some(dx => [-1.5, 0, 1.5].some(dz => open[cell(foot.x + dx, foot.z + dz)])),
      `${peak.id}'s first ramp cannot be walked to`);
  }
});

test('the upper crest approach has a genuine rest shelf before the last exposed ascent', () => {
  const ramp = RAMPS.find(r => r.id === 'the-crest-ramp-9');
  const ledge = RAMPS.find(r => r.id === 'the-crest-ledge-10');
  const p = pointOn(ramp.line, 28), surface = sampleClimbSurface(world, p.x, p.z);
  assert.ok(surface.resting, `the upper shelf releases a climber (slope ${surface.slope.toFixed(3)})`);
  assert.ok(canStand(p.x, p.z, world), 'there is room to stand and recover stamina');
  assert.equal(ledge.from, ramp.to, 'the lowered upper trail joins the following ledge continuously');
  assert.ok(ledge.to > ledge.from, 'the long ledge gently recovers the height lost to the rest bench');
});

test('the caves: rock over every passage, floors that can be walked, and every mouth reached on foot', () => {
  assert.equal(caves.length, WEST_CAVE_LINES.length, 'every cave is laid');
  assert.ok(caves.length >= 9, `${caves.length} caves`);
  assert.deepEqual([...new Set(caves.map(cave => cave.kind))].sort(), ['chamber', 'chimney', 'through']);
  assert.equal(caves.filter(cave => cave.kind === 'chimney').length, 5);
  assert.equal(caves.filter(cave => cave.kind === 'through').length, 1);
  const reach = reachable();
  for (const cave of caves) {
    const [inAt, outAt] = cave.portals, [open, close] = cave.openings;
    for (let s = inAt + 3; s <= outAt - 3; s += .5) {
      const p = cave.at(s);
      assert.ok(g(p.x, p.z) > cave.floor(s) + cave.height(s) + .5, `${cave.id} has rock over it at ${s.toFixed(1)} m`);
      assert.ok(own(p.x, p.z), `${cave.id} is in the range`);
    }
    for (let s = open; s < close; s += 1) assert.ok(Math.abs(cave.floor(s + 1) - cave.floor(s)) < .8, `${cave.id}'s floor can be walked at ${s} m`);
    const mouths = cave.kind === 'chamber' ? [open] : [open, close];
    for (const at of mouths) {
      const p = cave.at(Math.max(0, Math.min(cave.length, at + (at === open ? -1.5 : 1.5))));
      const near = [-1.5, 0, 1.5].some(dx => [-1.5, 0, 1.5].some(dz => reach[cell(p.x + dx, p.z + dz)]));
      assert.ok(near, `${cave.id}'s mouth at ${at.toFixed(1)} m can be walked to`);
    }
  }
  // Each chimney climbs a course, and the one way through joins the col to the long valley.
  for (const cave of caves.filter(one => one.kind === 'chimney')) assert.ok(cave.upper - cave.lower > 18, `${cave.id} climbs ${(cave.upper - cave.lower).toFixed(0)} m`);
  const passage = caves.find(cave => cave.id === 'col-passage');
  assert.ok(Math.hypot(passage.path.points[0].x - COL.x, passage.path.points[0].z - COL.z) < 40, 'it starts at the col');
  const end = passage.path.points.at(-1);
  assert.ok(Math.hypot(end.x - LONG_VALLEY.line.points[0].x, end.z - LONG_VALLEY.line.points[0].z) < 120, 'and comes out in the long valley');
  // Nothing lives in any of them, as in the East.
  assert.equal(caves.some(cave => cave.occupant || cave.people), false);
});

/**
 * Walk a traveler along a cave from outside its first mouth, as main.js moves him, steering a few
 * metres on along the passage the way a player does round a bend, until he is out of the far mouth
 * (or at the end of a chamber).
 */
function walkThrough(cave, from, to) {
  const walk = createLotharnCaveWalk({ caves, ground: g }), at = { ...cave.at(from) };
  let y = g(at.x, at.z), jump = 0, entered = false;
  for (let i = 0; i < 6000; i++) {
    if (entered && !walk.cave) break;
    const s = walk.cave ? walk.along : nearestPlain(cave.path, at.x, at.z).along;
    if (walk.cave && s >= to - .3) break;
    const last = cave.at(cave.length), before = cave.at(cave.length - 1);
    const aim = s + 3 <= cave.length ? cave.at(s + 3) : { x: last.x + (last.x - before.x) * 4, z: last.z + (last.z - before.z) * 4 };
    const d = Math.hypot(aim.x - at.x, aim.z - at.z) || 1, dx = (aim.x - at.x) / d * .12, dz = (aim.z - at.z) / d * .12;
    if (walk.cave) walk.move(at, dx, dz);
    else if (walk.entering({ ...at, y }, dx, dz)) { entered = true; walk.move(at, dx, dz); }
    else moveCharacter(at, dx, dz, world, .34);
    const now = walk.cave ? walk.floorAt(at.x, at.z) : g(at.x, at.z);
    jump = Math.max(jump, Math.abs(now - y)); y = now;
  }
  return { at, walk, entered, jump, y };
}

test('a traveler walks into a cave at a mouth, along it on its floor, and out of the other', () => {
  for (const cave of caves) {
    const [open, close] = cave.openings;
    if (cave.kind === 'chamber') {
      const walked = walkThrough(cave, Math.max(0, open - 1.5), cave.length - 1);
      assert.ok(walked.entered, `into ${cave.id}`);
      assert.ok(walked.walk.cave && walked.walk.along > cave.length - 2, `to the end of ${cave.id}`);
      assert.ok(walked.jump < STEP_IN, `${cave.id}: never a step (${walked.jump.toFixed(2)} m)`);
      continue;
    }
    const walked = walkThrough(cave, Math.max(0, open - 1.5), Infinity);
    assert.ok(walked.entered, `into ${cave.id}`);
    assert.equal(walked.walk.cave, null, `and out of ${cave.id} at the far end`);
    const near = nearestPlain(cave.path, walked.at.x, walked.at.z);
    assert.ok(near.along > close - .5, `${cave.id}: out at the far mouth (${near.along.toFixed(1)} of ${cave.length.toFixed(1)} m)`);
    assert.ok(walked.jump < STEP_IN, `${cave.id}: never a step (${walked.jump.toFixed(2)} m)`);
  }
});

test('a cave is not a hole: the ground over it is walked on as ground, and a save inside one resumes outside', () => {
  const cave = caves.find(one => one.kind === 'chimney'), s = (cave.portals[0] + cave.portals[1]) / 2, p = cave.at(s);
  const walk = createCaveWalk(caves);
  assert.equal(walk.entering(p.x + p.nx * 1, p.z + p.nz * 1, -p.nx * .12, -p.nz * .12), null);
  assert.equal(walk.cave, null);
  const out = caveOutside(caves, p.x, p.z);
  assert.ok(out, 'a point under the rock is put outside');
  const mouth = cave.at(cave.openings[0]);
  assert.ok(Math.hypot(out.x - mouth.x, out.z - mouth.z) < 3, 'at the first mouth');
  assert.equal(caveOutside(caves, LONG_VALLEY.line.points[20].x, LONG_VALLEY.line.points[20].z), null, 'and anywhere else is left alone');
  walk.restore({ id: cave.id, along: s });
  assert.equal(walk.cave, cave);
  walk.leave(); assert.equal(walk.cave, null);
  assert.equal(CAVE.half * 2 > 3, true, 'a passage is wide enough to pass in');
  // The two halves' caves have no id in common, so one controller can hold both.
  const east = new Set(world.lotharnCaves.map(one => one.id));
  assert.equal(caves.some(one => east.has(one.id)), false);
});

test('free climbing grips the West Lotharn’s faces and spends stamina to gain height', () => {
  for (const peak of PEAKS) {
    // Beside each summit's ways up there is a face the shared controller can take hold of and
    // climb. It is looked for rather than assumed: the controller grabs anything up to `maxSlope`,
    // which on a forty-metre cliff includes ground too steep to make progress on in a second, so
    // every candidate is tried and the first one that actually gains height is the answer.
    let climbed = null;
    for (const ramp of RAMPS.filter(one => one.peak === peak.id && one.kind === 'ramp')) {
      for (const p of ramp.line.points.flatMap(p => [p, ...[[3, 0], [-3, 0], [0, 3], [0, -3]].map(([dx, dz]) => ({ x: p.x + dx, z: p.z + dz }))])) {
        const surface = sampleClimbSurface(world, p.x, p.z);
        if (surface.slope > 6 || !surface.climbable || !canStand(p.x, p.z, world)) continue;
        if (canWalkSlope(p.x, p.z, p.x + Math.sin(surface.yaw) * .1, p.z + Math.cos(surface.yaw) * .1, world)) continue;
        const at = { x: p.x, z: p.z, y: g(p.x, p.z) };
        const candidate = createClimbing({ world });
        if (!candidate.grab(at, surface.yaw, { stamina: 100 })) continue;
        let stamina = 100, highest = at.y, off = 0;
        for (let i = 0; i < 20 && candidate.active; i++) {
          const frame = candidate.tick(.05, { playing: true, up: 1, stamina });
          stamina -= frame.staminaSpent; highest = Math.max(highest, frame.position.y);
          off = Math.max(off, Math.abs(frame.position.y - g(frame.position.x, frame.position.z)));
        }
        if (highest > at.y + .05) { climbed = { gain: highest - at.y, spent: 100 - stamina, off }; break; }
      }
      if (climbed) break;
    }
    assert.ok(climbed, `${peak.id} has no face on its ways up that the controller climbs`);
    assert.ok(climbed.spent > 0, `${peak.id}: the existing stamina mechanics apply`);
    assert.ok(climbed.off < .001, `${peak.id}: the climber's feet leave the heightfield`);
  }
  assert.equal(RAMP.half * 2 >= 4, true, 'a ramp is wide enough to climb');
});
