import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { hexOwnerAt } from '../src/world/terrain/region-world.js';
import { moveCharacter, canStand } from '../src/gameplay/movement/game-state.js';
import { createClimbing, sampleClimbSurface, canWalkSlope } from '../src/gameplay/movement/climbing.js';
import {
  LOTHARN, LOTHARN_BOX, PEAKS, PEAK_TOPS, RAMPS, BANDS, KEMRATH, PASS_ROAD_LINE, nearestOn, onRamp, peakUplift,
} from '../src/content/regions/east-lotharn/east-lotharn-world.js';
import { CAVE, CAVE_LINES, createCaveWalk, caveOutside, nearestPlain } from '../src/content/regions/east-lotharn/east-lotharn-caves.js';
import { createLotharnCaveWalk } from '../src/content/regions/east-lotharn/east-lotharn-cave-walk.js';
import { lipRib } from '../src/content/regions/varn/varn-world.js';

/**
 * The East Lotharn's peaks and caves (the user, 27 September 2026: "make the very tall so that
 * reaching the peak is difficult and there are lots of passages and caves"; asked, about four
 * hundred metres, a climbing rule with cliffs, and the caves empty to explore).
 */
const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());
const g = world.groundHeight, caves = world.lotharnCaves;
// Preserve the imported landscape's authored hiking-route budget independently of the
// modern free-climbing controller. These thresholds test landform access, not player limits.
const HIKING_ROUTE = Object.freeze({ easy: .7, limit: 1.19 });
const own = (x, z) => hexOwnerAt(x, z) === LOTHARN;

// Where a traveler can get to from the pass road, stepping a metre and a half at a time: up no
// steeper than the authored hiking-route budget allows, down anything. `closed` shuts ground he may not use.
const STEP = 1.5, box = LOTHARN_BOX, W = Math.ceil((box.maxX - box.minX) / STEP), H = Math.ceil((box.maxZ - box.minZ) / STEP);
const heights = new Float32Array(W * H), inside = new Uint8Array(W * H);
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  const x = box.minX + i * STEP, z = box.minZ + j * STEP;
  heights[j * W + i] = g(x, z); inside[j * W + i] = own(x, z) ? 1 : 0;
}
const cell = (x, z) => Math.round((z - box.minZ) / STEP) * W + Math.round((x - box.minX) / STEP);
function reachable(closed = () => false) {
  const reach = new Uint8Array(W * H), queue = [];
  for (const p of PASS_ROAD_LINE) { const k = cell(p.x, p.z); if (inside[k] && !reach[k]) { reach[k] = 1; queue.push(k); } }
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

test('four summits, the eastern about four hundred and twenty metres, each a bald ringed by cliffs', () => {
  const tops = Object.fromEntries(PEAKS.map(peak => [peak.id, summitReached(new Uint8Array(W * H), peak).top]));
  assert.ok(tops['eastern-peak'] > 400 && tops['eastern-peak'] < 440, `the eastern peak stands ${tops['eastern-peak'].toFixed(0)} m`);
  assert.ok(Object.values(tops).every(top => top > 220), JSON.stringify(tops));
  assert.ok(tops['eastern-peak'] === Math.max(...Object.values(tops)), 'the eastern is the highest ground in the range');
  let highest = -Infinity;
  for (let k = 0; k < W * H; k++) if (inside[k]) highest = Math.max(highest, heights[k]);
  assert.ok(Math.abs(highest - tops['eastern-peak']) < 3, 'and the highest anywhere');
  // A bald is nearly flat, and cut off level at the top of a cliff.
  for (const peak of PEAKS) {
    assert.ok(Math.abs(PEAK_TOPS[peak.id] % BANDS.period - 1.5) < 1e-9);
    // The bald: the ground at its level round the summit, a few hundred square metres of it, and
    // all of it within a few metres of level.
    let area = 0, steepest = 0;
    for (let dz = -35; dz <= 35; dz += 1.5) for (let dx = -35; dx <= 35; dx += 1.5) {
      const x = peak.x + dx, z = peak.z + dz, onTop = u => u >= PEAK_TOPS[peak.id] - .5;
      if (!onTop(peakUplift(x, z)) || onRamp(x, z, 3.5) || onRamp(x + 1.5, z, 3.5) || onRamp(x, z + 1.5, 3.5)) continue;
      // The eastern peak stands within Varn's reach (src/content/regions/varn/varn-world.js, 2 October 2026): the rim of stone Varn raises on
      // every ledge's brink there stands round its bald's edge too, and is a rim, not the bald.
      if (lipRib(x, z) > 0 || lipRib(x + 1.5, z) > 0 || lipRib(x, z + 1.5) > 0) continue;
      area += 2.25;
      if (onTop(peakUplift(x + 1.5, z))) steepest = Math.max(steepest, Math.abs(g(x + 1.5, z) - g(x, z)) / 1.5);
      if (onTop(peakUplift(x, z + 1.5))) steepest = Math.max(steepest, Math.abs(g(x, z + 1.5) - g(x, z)) / 1.5);
    }
    assert.ok(area > 250, `${peak.id}'s bald is ${area.toFixed(0)} m²`);
    assert.ok(steepest < HIKING_ROUTE.easy, `${peak.id}'s bald is walked, not climbed (${steepest.toFixed(2)} at its steepest)`);
  }
});

test('authored hiking routes reach every summit by ramps and ledges; the same grade budget fails without them', () => {
  const open = reachable(), shut = reachable((x, z) => onRamp(x, z, 2.2));
  for (const peak of PEAKS) {
    assert.equal(summitReached(open, peak).got, true, `${peak.id} can be climbed`);
    assert.equal(summitReached(shut, peak).got, false, `${peak.id} cannot be climbed without its ways`);
  }
  // Without them nobody gets far up any massif.
  let high = 0;
  for (let k = 0; k < W * H; k++) if (shut[k]) high = Math.max(high, heights[k]);
  assert.ok(high < 170, `the highest reached without the ways is ${high.toFixed(0)} m`);
  // Every ramp climbs a band, at a climb and not a walk.
  for (const ramp of RAMPS.filter(one => one.kind === 'ramp')) {
    assert.ok(ramp.to - ramp.from > 20, ramp.id);
    const grade = (ramp.to - ramp.from) / (ramp.line.length - 8);
    assert.ok(grade > HIKING_ROUTE.easy - .1 && grade < HIKING_ROUTE.limit - .3, `${ramp.id} climbs at ${grade.toFixed(2)}`);
  }
});

test('the caves: rock over every passage, floors that can be walked, and every mouth reached from the road', () => {
  assert.equal(caves.length, CAVE_LINES.length, 'every cave is laid');
  assert.ok(caves.length >= 8, `${caves.length} caves`);
  assert.deepEqual([...new Set(caves.map(cave => cave.kind))].sort(), ['chamber', 'chimney', 'through']);
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
      assert.ok(near, `${cave.id}'s mouth at ${at.toFixed(1)} m can be walked to from the road`);
    }
  }
  // The chimneys each climb a band, and the passage to Upper Olveth joins the two valleys.
  for (const cave of caves.filter(one => one.kind === 'chimney')) assert.ok(cave.upper - cave.lower > 25, `${cave.id} climbs ${(cave.upper - cave.lower).toFixed(0)} m`);
  const olveth = caves.find(cave => cave.id === 'olveth-passage');
  assert.ok(nearestOn(KEMRATH.line, olveth.path.points[0].x, olveth.path.points[0].z).distance < 60, 'it starts from Kemrath');
});

/**
 * Walk a traveler along a cave from outside its first mouth, as main.js moves him, steering a few
 * metres on along the passage the way a player does round a bend, until he is out of the far mouth
 * (or at the end of a chamber). The height under him is the cave's floor inside and the ground out.
 */
function walkThrough(cave, from, to) {
  const walk = createLotharnCaveWalk({ caves, ground: g }), at = { ...cave.at(from) };
  let y = g(at.x, at.z), jump = 0, entered = false;
  for (let i = 0; i < 6000; i++) {
    if (entered && !walk.cave) break;
    const s = walk.cave ? walk.along : nearestPlain(cave.path, at.x, at.z).along;
    if (walk.cave && s >= to - .3) break;
    // At the end of the line he keeps going the way it goes, out of the mouth.
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
      assert.ok(walked.jump < .25, `${cave.id}: never a step (${walked.jump.toFixed(2)} m)`);
      assert.ok(Math.abs(walked.y - walked.walk.floorAt(walked.at.x, walked.at.z)) < 1e-9);
      continue;
    }
    const walked = walkThrough(cave, Math.max(0, open - 1.5), Infinity);
    assert.ok(walked.entered, `into ${cave.id}`);
    assert.equal(walked.walk.cave, null, `and out of ${cave.id} at the far end`);
    const near = nearestPlain(cave.path, walked.at.x, walked.at.z);
    assert.ok(near.along > close - .5, `${cave.id}: out at the far mouth (${near.along.toFixed(1)} of ${cave.length.toFixed(1)} m)`);
    assert.ok(walked.jump < .25, `${cave.id}: never a step (${walked.jump.toFixed(2)} m)`);
  }
});

test('a cave is not a hole: the ground over it is walked on as ground, and a save inside one resumes outside', () => {
  const cave = caves.find(one => one.kind === 'chimney'), s = (cave.portals[0] + cave.portals[1]) / 2, p = cave.at(s);
  const walk = createCaveWalk(caves);
  // Stepping across the top of it from the side is not stepping into it.
  assert.equal(walk.entering(p.x + p.nx * 1, p.z + p.nz * 1, -p.nx * .12, -p.nz * .12), null);
  assert.equal(walk.cave, null);
  const out = caveOutside(caves, p.x, p.z);
  assert.ok(out, 'a point under the rock is put outside');
  const mouth = cave.at(cave.openings[0]);
  assert.ok(Math.hypot(out.x - mouth.x, out.z - mouth.z) < 3, 'at the first mouth');
  assert.equal(caveOutside(caves, KEMRATH.line.points[5].x, KEMRATH.line.points[5].z), null, 'and anywhere else is left alone');
  // A walk that is put somewhere else entirely comes out of the cave.
  walk.restore({ id: cave.id, along: s });
  assert.equal(walk.cave, cave);
  walk.leave(); assert.equal(walk.cave, null);
  assert.equal(CAVE.half * 2 > 3, true, 'a passage is wide enough to pass in');
});


test('modern free climbing grips real East Lotharn faces and consumes stamina while gaining height', () => {
  for (const peak of PEAKS) {
    let start = null, face = null;
    for (const ramp of RAMPS.filter(one => one.peak === peak.id && one.kind === 'ramp')) {
      for (const p of ramp.line.points) {
        const surface = sampleClimbSurface(world, p.x, p.z);
        if (!surface.climbable || !canStand(p.x, p.z, world)) continue;
        if (canWalkSlope(p.x, p.z, p.x + Math.sin(surface.yaw) * .1,
          p.z + Math.cos(surface.yaw) * .1, world)) continue;
        const at = { x: p.x, z: p.z, y: g(p.x, p.z) };
        const candidate = createClimbing({ world });
        if (!candidate.grab(at, surface.yaw, { stamina: 100 })) continue;
        start = at; face = { candidate, yaw: surface.yaw }; break;
      }
      if (start) break;
    }
    assert.ok(start, `${peak.id} has a reachable climb face along its authored route`);
    assert.equal(canWalkSlope(start.x, start.z, start.x + Math.sin(face.yaw) * .1,
      start.z + Math.cos(face.yaw) * .1, world), false, 'steep ground requires climbing');
    let stamina = 100, highest = start.y;
    for (let i = 0; i < 20 && face.candidate.active; i++) {
      const frame = face.candidate.tick(.05, { playing: true, up: 1, stamina });
      stamina -= frame.staminaSpent; highest = Math.max(highest, frame.position.y);
      assert.ok(Math.abs(frame.position.y - g(frame.position.x, frame.position.z)) < .001);
    }
    assert.ok(highest > start.y + .05, `${peak.id} gains physical height`);
    assert.ok(stamina < 100, 'the existing stamina mechanics apply');
  }
});
