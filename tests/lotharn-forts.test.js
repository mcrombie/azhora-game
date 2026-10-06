import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { scopedWorld } from './scoped-world.js';
import { sampleLattice, leastFall, caveLinks, reachedByCountry, shutGate, LETHAL_FALL } from './lattice-flood.js';
import { canStand, moveCharacter } from '../src/gameplay/movement/game-state.js';
import { canWalkSlope } from '../src/gameplay/movement/climbing.js';
import { closedRegionEntered } from '../src/world/travel/closed-border.js';
import { TERRAIN_FALL } from '../src/gameplay/movement/terrain-fall.js';
import { hexOwnerAt } from '../src/world/terrain/region-world.js';
import { groundWithRiver } from '../src/world/terrain/world-terrain.js';
import { longestTowerGap } from '../src/world/scenery/fortification.js';
import { PASS_ROAD_LINE, RAMPS as EAST_RAMPS } from '../src/content/regions/east-lotharn/east-lotharn-world.js';
import { RAMPS as WEST_RAMPS } from '../src/content/regions/west-lotharn/west-lotharn-world.js';
import { belowFirstLedge, onPeakWay, firstCliff, RAMPS_KEEP_THEIR_HOLD } from '../src/content/regions/west-lotharn/lotharn-first-course.js';
import { BUILD_STATUS } from '../src/dev/tools/build-status.js';
import { NO_CLIMB_ZONES, unclimbableAt } from '../src/gameplay/movement/no-climb-zones.js';
import { LOTHARN_PASSES_SHUT, VARN, VARN_PASS_GATE, VARN_STANDARD, VARN_ROCK, VARN_CIRCUIT, lipRib, inVarnRock, onSlab, varnWicket } from '../src/content/regions/varn/varn-world.js';
import {
  LOTHARN_FORTS, PASS_FORT_STANDARD, LOTHARN_FORT_LANDMARKS, NO_CLIMB_REACH, fortById, fortGateShut, fortUnclimbable, fortKeepsClear,
} from '../src/content/regions/west-lotharn/lotharn-forts.js';

/**
 * The Empire's forts on the Lotharn passes (the user, 2 October 2026): "Let's also add Ambron fortresses of
 * smaller scale wherever else there are strategic chokeholds that control entry south from the East
 * Lotharn Mountains and the West Lotharn Mountains."
 *
 * **Where the chokes are is measured here, and that they are shut.** The built ground of both ranges and
 * the foot of the countries south of them is flooded with the game's own rules (tests/lattice-flood.js),
 * the caves counted as the ways they are. With the gates as built a walker out of the mountains reaches no
 * lowland by any fall he lives through, and nobody from the lowlands gets up into the mountains at all;
 * with the gates open every one of them is a way; and nobody is shut in anywhere, gates open or shut.
 *
 * **And Varn's own reach is held here too** (the user, 2 October 2026: "There should be a very difficult
 * climber's route", read by the coordinator as: a hard climb is the only way round Varn, and no fall gets
 * anyone past it). This is the only lattice that has the whole of both massifs either side of the city and
 * the ways up them, so it is the one that can say it: from the valleys, inside that reach, nothing of the
 * Empire's ground is come to by any fall at all, nor by a climber who never tires - but by the slabs.
 *
 * Every flood is given Varn's rims as risers, and the wicket in Varn's Amod Gate as a step the lattice
 * cannot see (tests/lattice-flood.js; below).
 */
const RANGES = ['East Lotharn Mountains', 'West Lotharn Mountains'], LOWLANDS = ['Amod', 'Vastos', 'Meneth', 'Isareos'];

test('three forts, one at each way south that Varn does not hold: the Vastos mouth, the Meneth gap and the western reach', () => {
  assert.deepEqual(LOTHARN_FORTS.map(fort => fort.id), ['fort-vastos', 'fort-meneth', 'fort-reach']);
  assert.deepEqual(LOTHARN_FORTS.map(fort => fort.opens), ['Vastos', 'Meneth', 'Isareos']);
  for (const fort of LOTHARN_FORTS) {
    assert.equal(fortById(fort.id), fort);
    // Named in plain words for what it shuts, as the range's own places are.
    assert.match(fort.name, /^The [A-Z][a-z]+ Gate$/);
    assert.ok(fort.description.length > 120 && fort.shuts.length > 10, fort.id);
    assert.ok(RANGES.includes(fort.stands), `${fort.id} stands in ${fort.stands}`);
  }
});

test('each is one straight curtain with a tower every thirty metres, one gate toward the mountains, and a keep and a barrack behind it', () => {
  const S = PASS_FORT_STANDARD;
  // A size under Varn's: lower, thinner, no ditch.
  assert.ok(S.wallHeight < VARN_STANDARD.wallHeight && S.towerPlatform < VARN_STANDARD.towerPlatform && S.wallThickness < VARN_STANDARD.wallThickness && S.ditchWidth === 0);
  for (const fort of LOTHARN_FORTS) {
    const C = fort.circuit, edge = C.edges[0];
    assert.equal(C.open, true); assert.equal(C.edges.length, 1); assert.equal(C.gates.length, 1); assert.equal(C.ditch.length, 0);
    assert.ok(Math.abs(fort.length - edge.length) < 1e-9 && fort.length > 80 && fort.length < 200, `${fort.id} is ${fort.length.toFixed(0)} m long`);
    // Towers: one by each end, the gate's pair, and no stretch of wall over thirty-two metres without one.
    const ats = C.towers.map(tower => tower.at).sort((a, b) => a - b);
    assert.ok(ats[0] < 8 && ats.at(-1) > fort.length - 8, `${fort.id}'s end towers`);
    for (let i = 1; i < ats.length; i++) assert.ok(ats[i] - ats[i - 1] < 32, `${fort.id}: ${(ats[i] - ats[i - 1]).toFixed(1)} m of wall without a tower`);
    assert.ok(longestTowerGap(C) > 0);
    // The gate looks at the mountains: `outside` is on the far side of the wall from `inward`.
    const out = { x: fort.outside.x - fort.gateAt.x, z: fort.outside.z - fort.gateAt.z };
    assert.ok(out.x * fort.inward.x + out.z * fort.inward.z < -10, `${fort.id}'s gate faces the mountains`);
    assert.equal(fort.gateId, `${fort.id}-gate`);
    // The keep and the barrack stand behind the wall, clear of it, of its towers and of each other, off the way through.
    const behind = (x, z) => (x - fort.a.x) * fort.inward.x + (z - fort.a.z) * fort.inward.z;
    const boxes = [{ id: 'keep', x: fort.keep.x, z: fort.keep.z, hx: fort.keep.size / 2, hz: fort.keep.size / 2 }, { id: 'barrack', x: fort.barrack.x, z: fort.barrack.z, hx: fort.barrack.width / 2, hz: fort.barrack.depth / 2 }];
    for (const b of boxes) {
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const x = b.x + sx * b.hx, z = b.z + sz * b.hz;
        assert.ok(behind(x, z) > S.wallThickness / 2 + 1, `${fort.id}'s ${b.id} is ${behind(x, z).toFixed(1)} m behind the wall line`);
        for (const tower of C.towers) assert.ok(Math.hypot(x - tower.x, z - tower.z) > S.towerSize * .54 + 1, `${fort.id}'s ${b.id} stands against a tower`);
      }
      for (const p of fort.way) assert.ok(Math.abs(p.x - b.x) > b.hx + 1.5 || Math.abs(p.z - b.z) > b.hz + 1.5, `${fort.id}'s ${b.id} stands in the way through`);
      assert.ok(fortKeepsClear(b.x, b.z), `${fort.id}'s ${b.id} stands on ground kept clear`);
    }
    assert.ok(Math.abs(boxes[0].x - boxes[1].x) > boxes[0].hx + boxes[1].hx + 1 || Math.abs(boxes[0].z - boxes[1].z) > boxes[0].hz + boxes[1].hz + 1, `${fort.id}'s keep and barrack overlap`);
    assert.ok(fort.keep.height > S.towerPlatform + 4, 'the keep stands over the towers');
  }
});

test('both ends of every wall are in the rock: the ground a few metres past each end stands a cliff’s height over the floor the wall crosses', () => {
  for (const fort of LOTHARN_FORTS) {
    const dir = fort.circuit.edges[0].dir;
    let floor = Infinity;
    for (let at = 12; at <= fort.length - 12; at += 4) floor = Math.min(floor, groundWithRiver(fort.a.x + dir.x * at, fort.a.z + dir.z * at));
    for (const [end, sign] of [[fort.a, -1], [fort.b, 1]]) {
      const rock = Math.max(...[3, 6, 9].map(reach => groundWithRiver(end.x + dir.x * sign * reach, end.z + dir.z * sign * reach)));
      assert.ok(rock - floor > 14, `${fort.id}: ${(rock - floor).toFixed(1)} m of rock past the end at ${end.x}, ${end.z}`);
      // And the rock is a range's own: where a cliff is a cliff to a walker.
      assert.ok(RANGES.includes(hexOwnerAt(end.x, end.z)), `${fort.id}'s end at ${end.x}, ${end.z} stands in ${hexOwnerAt(end.x, end.z)}`);
    }
  }
});

test('one flag shuts them all, and the rock either end of each gives no hold', () => {
  assert.equal(fortGateShut(), LOTHARN_PASSES_SHUT);
  const row = NO_CLIMB_ZONES.find(zone => zone.id === 'lotharn-forts');
  assert.ok(row && row.at === fortUnclimbable);
  const steep = (x, z) => Math.hypot(groundWithRiver(x + .4, z) - groundWithRiver(x - .4, z), groundWithRiver(x, z + .4) - groundWithRiver(x, z - .4)) / .8 > .9;
  for (const fort of LOTHARN_FORTS) {
    const dir = fort.circuit.edges[0].dir, at = (along, across = 0) => [fort.a.x + dir.x * along + fort.inward.x * across, fort.a.z + dir.z * along + fort.inward.z * across];
    // Round each end, as far as the rule reaches: every point of the first cliff gives no hold, and there is cliff there to give none.
    for (const [end, from, to] of [['a', -NO_CLIMB_REACH + 2, 10], ['b', fort.length - 10, fort.length + NO_CLIMB_REACH - 2]]) {
      let rock = 0;
      for (let along = from; along <= to; along += 4) for (let across = -NO_CLIMB_REACH + 2; across <= NO_CLIMB_REACH - 2; across += 4) {
        const [x, z] = at(along, across);
        assert.equal(fortUnclimbable(x, z), firstCliff(x, z), `${fort.id}, end ${end}: ${x.toFixed(0)}, ${z.toFixed(0)}`);
        if (firstCliff(x, z) && steep(x, z)) rock++;
      }
      assert.ok(rock > 12, `${fort.id}, end ${end}: ${rock} points of first cliff inside the rule's reach`);
    }
    // Not the floor the wall crosses, and not the mountain a good way off.
    assert.equal(fortUnclimbable(...at(fort.gate)), false);
    assert.equal(fortUnclimbable(...at(-NO_CLIMB_REACH - 5)), false); assert.equal(fortUnclimbable(...at(fort.gate, NO_CLIMB_REACH + 5)), false);
  }
  // The first cliff is below the first ledge and off the peaks' own ways, and those ways keep their hold everywhere.
  for (const ramp of [...EAST_RAMPS, ...WEST_RAMPS]) for (const p of ramp.line.points) {
    assert.equal(onPeakWay(p.x, p.z), true);
    if (RAMPS_KEEP_THEIR_HOLD) assert.equal(unclimbableAt(p.x, p.z), false, `${ramp.id} at ${p.x.toFixed(0)}, ${p.z.toFixed(0)} gives no hold`);
  }
  // And none of them goes over a wall's end: no way of either range touches the first cliff within thirty metres of where a
  // wall dies into it. (The Reach Gate was first built ninety-three metres down the valley, at the reach's narrowest place,
  // where the south rampart's first ramp climbs that very cliff from the mountains' side of the wall to the ledge above the
  // Empire's, three metres over the wall's end. It was moved.)
  for (const fort of LOTHARN_FORTS) for (const end of [fort.a, fort.b]) for (const ramp of [...EAST_RAMPS, ...WEST_RAMPS]) for (const p of ramp.line.points)
    assert.ok(!(Math.hypot(p.x - end.x, p.z - end.z) < 30 && belowFirstLedge(p.x, p.z)), `${ramp.id} climbs the first cliff ${Math.hypot(p.x - end.x, p.z - end.z).toFixed(0)} m from ${fort.id}'s end at ${end.x}, ${end.z}`);
  const rampart = WEST_RAMPS.find(one => one.id === 'south-rampart-ramp-1'), reach = fortById('fort-reach');
  assert.ok(rampart.line.points.every(p => (p.x - reach.a.x) * reach.inward.x + (p.z - reach.a.z) * reach.inward.z > 30), 'the south rampart’s first ramp is wholly on the Empire’s side of the Reach Gate');
});

test('the chart and the build record know them', () => {
  assert.deepEqual(LOTHARN_FORT_LANDMARKS.map(place => place.id), LOTHARN_FORTS.map(fort => fort.id));
  for (const place of LOTHARN_FORT_LANDMARKS) assert.ok(place.name.length > 5 && place.description.length > 120 && place.radius > 0);
  assert.match(BUILD_STATUS['West Lotharn Mountains'].detail, /the Vastos Gate.*the Meneth Gate.*the Reach Gate/);
  assert.match(BUILD_STATUS['East Lotharn Mountains'].detail, /Vastos Gate/);
});

// ---------------------------------------------------------------------------
// The built world
// ---------------------------------------------------------------------------
// Both ranges plus every lowland included in the reachability flood below.
const scene = new THREE.Scene(), world = await scopedWorld(scene, [20, 27, 10, 11, 12, 16]);

// Both ranges and the foot of the four countries south of them, a metre and a half apart. Going round the whole
// range by the plains is another journey: the ground a flood may use is the ranges, and the lowland within a
// hundred and twenty metres of them.
const BOX = { minX: -2600, maxX: -840, minZ: -1250, maxZ: -230 }, STEP = 1.5, MARGIN = 120;
const L = (() => {
  const W = Math.round((BOX.maxX - BOX.minX) / STEP) + 1, H = Math.round((BOX.maxZ - BOX.minZ) / STEP) + 1, R = Math.round(MARGIN / STEP);
  const kind = new Uint8Array(W * H);   // 1 a range, 2 a lowland
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const name = world.regionAt(BOX.minX + i * STEP, BOX.minZ + j * STEP)?.name;
    kind[j * W + i] = RANGES.includes(name) ? 1 : LOWLANDS.includes(name) ? 2 : 0;
  }
  // Within the margin of a range, by a square: along each row, then down each column.
  const row = new Uint8Array(W * H), near = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) { let last = -Infinity; for (let i = 0; i < W; i++) { if (kind[j * W + i] === 1) last = i; if (i - last <= R) row[j * W + i] = 1; } last = Infinity; for (let i = W - 1; i >= 0; i--) { if (kind[j * W + i] === 1) last = i; if (last - i <= R) row[j * W + i] = 1; } }
  for (let i = 0; i < W; i++) { let last = -Infinity; for (let j = 0; j < H; j++) { if (row[j * W + i]) last = j; if (j - last <= R) near[j * W + i] = 1; } last = Infinity; for (let j = H - 1; j >= 0; j--) { if (row[j * W + i]) last = j; if (last - j <= R) near[j * W + i] = 1; } }
  const mask = (x, z) => { const k = Math.round((z - BOX.minZ) / STEP) * W + Math.round((x - BOX.minX) / STEP); return kind[k] === 1 || (kind[k] === 2 && near[k] === 1); };
  return sampleLattice(world, BOX, STEP, mask);
})();
const links = caveLinks(L, [...world.lotharnCaves, ...world.westLotharnCaves]);
/**
 * **The wicket.** Varn's Amod Gate is shut like the others, with a door a man wide in one leaf that opens from
 * inside and from nowhere else (src/content/regions/varn/varn-world.js, `VARN_WICKET`). A lattice a metre and a half apart has no
 * point in a gap of 1.2 m - a body has half a metre of it to stand in - so this file's flood could not find it,
 * and said a fall where there is a door. It is walked here with the traveler's own step (`moveCharacter`,
 * `canWalkSlope` and the closed-place rule, as tests/varn-world.test.js walks it), both ways; and what the step
 * says is given to the lattice as a step it cannot see, like a passage through the rock - one way, out.
 */
const wicket = (() => {
  if (!LOTHARN_PASSES_SHUT) return null;
  const w = varnWicket(), g = w.gate, inside = { x: w.x, z: g.centre.z + g.inward.z * 6 }, outside = { x: w.x, z: g.centre.z - g.inward.z * 6 };
  const step = (x, z, nx, nz) => canWalkSlope(x, z, nx, nz, world) && !closedRegionEntered({ x, z }, { x: nx, z: nz });
  const walks = (from, to) => {
    const at = { x: from.x, z: from.z, y: world.heightAt(from.x, from.z) };
    for (let i = 0; i < 400 && Math.hypot(to.x - at.x, to.z - at.z) > .3; i++) { const d = Math.hypot(to.x - at.x, to.z - at.z); moveCharacter(at, (to.x - at.x) / d * .12, (to.z - at.z) / d * .12, world, .34, { canTraverse: step }); at.y = world.heightAt(at.x, at.z); }
    return Math.hypot(to.x - at.x, to.z - at.z) <= .3;
  };
  return { inside, outside, out: walks(inside, outside), in: walks(outside, inside), from: L.near(inside.x, inside.z, 4), to: L.near(outside.x, outside.z, 4) };
})();
if (wicket?.out && wicket.from >= 0 && wicket.to >= 0) links.set(wicket.from, [...(links.get(wicket.from) ?? []), wicket.to]);
const seed = ([name, x, z]) => ({ name, k: L.near(x, z, 9) });
const VALLEYS = [['the Col', -1080, -895], ['Kemrath', -1330, -835], ['Stonegate', -1080, -1080], ['Upper Olveth', -1330, -1060], ['the long valley', -1817, -651], ['the long valley’s eastern reach', -1690, -665],
  ['the western reach', -2150, -500], ['the north valley', -1876, -890]].map(seed);
/** The nearest ground of a country to a point, among the ground measured: where a gate's own lowland begins behind it. */
const nearestOf = (country, x, z) => {
  let best = -1, least = Infinity;
  for (let k = 0; k < L.used.length; k++) if (L.stand[k] && L.region[k] === country) { const p = L.at(k), d = Math.hypot(p.x - x, p.z - z); if (d < least) { least = d; best = k; } }
  return best;
};
const LOWLAND = [{ name: 'Amod, below Varn', k: L.near(VARN.x, -650, 9) },
  ...LOTHARN_FORTS.map(fort => ({ name: `${fort.opens}, behind ${fort.name}`, k: nearestOf(fort.opens, fort.empireSide.x, fort.empireSide.z) }))];
const GATES = [VARN_PASS_GATE, ...LOTHARN_FORTS.map(fort => fort.gateId)];
// The peaks' own ways are walked at their grade whatever the lattice makes of the face under them (tests/lattice-flood.js).
const flood = (seeds, options = {}) => leastFall(L, world, seeds.map(one => one.k), { links, ways: onPeakWay, risers: lipRib, riserReach: inVarnRock, ...options });
const fall = value => (value === Infinity ? 'no way at all' : value === 0 ? 'walked to' : `a fall of ${value.toFixed(1)} m`);

test('the measuring ground: every valley and every lowland has ground to stand on, and the caves are in it', t => {
  for (const one of [...VALLEYS, ...LOWLAND]) assert.ok(one.k >= 0, `nowhere to stand at ${one.name}`);
  for (const one of VALLEYS) assert.ok(RANGES.includes(L.region[one.k]), `${one.name} is in ${L.region[one.k]}`);
  assert.deepEqual(LOWLAND.map(one => L.region[one.k]), LOWLANDS);
  const through = [...world.lotharnCaves, ...world.westLotharnCaves].filter(cave => cave.kind !== 'chamber');
  assert.ok(through.length >= 10 && links.size > 60, `${through.length} passages, ${links.size} points at their mouths`);
  // The wicket: a traveler walks out through it and not in, and the lattice has a point either side of it to carry the step.
  if (LOTHARN_PASSES_SHUT) {
    assert.equal(wicket.out, true, 'a traveler inside Varn does not get out by the wicket'); assert.equal(wicket.in, false, 'a traveler outside Varn gets in by the wicket');
    assert.ok(wicket.from >= 0 && wicket.to >= 0 && VARN_CIRCUIT.inside(L.at(wicket.from).x, L.at(wicket.from).z) && !VARN_CIRCUIT.inside(L.at(wicket.to).x, L.at(wicket.to).z), 'no lattice point either side of the wicket');
    assert.ok(links.get(wicket.from).includes(wicket.to) && !(links.get(wicket.to) ?? []).includes(wicket.from), 'the wicket is a step out and never in');
  }
  let used = 0; for (let k = 0; k < L.used.length; k++) used += L.used[k];
  t.diagnostic(`${used} points of ground, ${STEP} m apart; ${through.length} passages through the rock joined at ${links.size} points`);
});

test('the built forts: three walls, their towers, gates, keeps and barracks are in the world, and nobody is in them', t => {
  const m = world.lotharnFortsMetrics;
  assert.equal(m.forts, 3); assert.equal(m.batches, 3); assert.equal(m.arches, 1);
  assert.deepEqual(m.shut, LOTHARN_PASSES_SHUT ? LOTHARN_FORTS.map(fort => fort.gateId) : []);
  assert.equal(m.towers, LOTHARN_FORTS.reduce((sum, fort) => sum + fort.circuit.towers.length, 0));
  t.diagnostic(`${m.vertices} vertices in ${m.batches} batches, ${m.towers} towers; lifted ${JSON.stringify(m.lifted)}`);
  for (const kind of ['pass-fort-wall', 'pass-fort-tower', 'pass-fort-keep']) assert.ok(world.colliders.some(c => c.kind === kind), `no ${kind} in the world`);
  for (const fort of LOTHARN_FORTS) {
    assert.ok(scene.getObjectByName(fort.name), `${fort.name} is not drawn`);
    assert.ok(world.landmarks.some(place => place.id === fort.id), `${fort.id} is not on the chart`);
    assert.ok(world.colliders.some(c => c.kind === 'house' && c.id === fort.barrack.id), `${fort.id}'s barrack`);
    assert.equal(canStand(fort.keep.x, fort.keep.z, world, .34), false, `somebody stands inside ${fort.id}'s keep`);
    // Both sides of the gate are stood on, and the passage itself only when it is open.
    assert.ok(canStand(fort.way[0].x, fort.way[0].z, world, .34), `before ${fort.id}'s gate`); assert.ok(canStand(fort.way[2].x, fort.way[2].z, world, .34), `behind ${fort.id}'s gate`);
    assert.equal(canStand(fort.way[1].x, fort.way[1].z, world, .34), !fortGateShut(fort.id), `${fort.id}'s passage`);
    for (const [id, at] of Object.entries(world.npcPositions)) assert.ok(Math.hypot(at.x - fort.gateAt.x, at.z - fort.gateAt.z) > 60, `${id} stands at ${fort.name}`);
    // Nothing of the countries' own scatter is left on the wall's strip or the yard.
    for (const c of world.colliders) if (['lotharn-tree', 'west-lotharn-tree', 'region-tree', 'lotharn-outcrop', 'vastos-thorn', 'vastos-erratic'].includes(c.kind))
      assert.ok(!fortKeepsClear(c.x, c.z), `a ${c.kind} stands on a fort's ground at ${c.x.toFixed(1)}, ${c.z.toFixed(1)}`);
  }
});

test('with the gates as built a walker out of the mountains reaches no lowland by any fall he lives through, and nobody comes up from below', { skip: !LOTHARN_PASSES_SHUT }, t => {
  const down = flood(VALLEYS), up = flood(LOWLAND);
  // The mountains are one country inside the walls: from Kemrath every other valley is walked to (the long valley by the passage under the east arm).
  const kemrath = leastFall(L, world, [VALLEYS[1].k], { links, ways: onPeakWay, risers: lipRib, riserReach: inVarnRock });
  for (const valley of VALLEYS) assert.equal(kemrath[valley.k], 0, `${valley.name} is ${fall(kemrath[valley.k])} from Kemrath`);
  for (const low of LOWLAND) {
    t.diagnostic(`${low.name}: ${fall(down[low.k])} from the valleys`);
    assert.ok(down[low.k] > LETHAL_FALL + 5, `${low.name} is reached from the mountains by ${fall(down[low.k])}`);
  }
  // What a walker from the valleys stands on alive: the two ranges, and of Amod only the forecourt before Varn's Pass Gate.
  const alive = reachedByCountry(L, down, LETHAL_FALL);
  t.diagnostic(`ground reached alive from the valleys, m2: ${JSON.stringify(alive)}`);
  assert.deepEqual(Object.keys(alive).filter(name => !RANGES.includes(name)), ['Amod']);
  assert.ok(alive.Amod < 1200, `${alive.Amod} m2 of Amod`);
  for (let k = 0; k < down.length; k++) if (down[k] < LETHAL_FALL && L.region[k] === 'Amod') { const p = L.at(k); assert.ok(p.z < -783 && Math.abs(p.x - VARN.x) < 60, `Amod reached at ${p.x}, ${p.z}`); }
  // And from below, nothing of any valley, alive or not.
  for (const valley of VALLEYS) { assert.equal(up[valley.k], Infinity, `${valley.name} is reached from the lowlands by ${fall(up[valley.k])}`); }
  const below = reachedByCountry(L, up, Infinity);
  t.diagnostic(`ground reached from the lowlands by any fall, m2: ${JSON.stringify(below)}`);
});

test('Varn’s reach: from the valleys, nothing of the Empire’s ground by any fall at all, nor by a climber who never tires - but by the slabs', { skip: !LOTHARN_PASSES_SHUT }, t => {
  // The reach is where Varn's no-hold rock and its rims are (src/content/regions/varn/varn-world.js, `VARN_ROCK`): from fifty metres beyond the
  // Vastos Gate's eastern end to the eastern massif's far end - both massifs either side of the city, whole. A flood kept
  // to it knows nothing of the mountains west of it, which are as they always were and are the forts' business (above).
  const inReach = (x, z) => x >= VARN_ROCK.minX, forecourt = (x, z) => z < -783 && Math.abs(x - VARN.x) < 60;
  assert.ok(VARN_ROCK.minX < LOTHARN_FORTS[0].b.x - 40 && VARN_ROCK.minX > LOTHARN_FORTS[0].gateAt.x, 'the reach begins beyond the Vastos Gate’s eastern end, and short of its gate');
  const here = VALLEYS.filter(one => inReach(L.at(one.k).x, L.at(one.k).z));
  assert.deepEqual(here.map(one => one.name), ['the Col', 'Kemrath', 'Stonegate', 'Upper Olveth']);
  /** The Empire's ground a flood came to, by any fall: how much, and the first of it. Varn's forecourt, before the shut Pass Gate, is Amod's hex and the pass's ground. */
  const empire = cost => {
    let area = 0, first = null;
    for (let k = 0; k < cost.length; k++) if (cost[k] < Infinity && LOWLANDS.includes(L.region[k])) { const p = L.at(k); if (forecourt(p.x, p.z)) continue; area += STEP * STEP; first ??= `${p.x}, ${p.z}, ${fall(cost[k])}`; }
    return { area, first };
  };
  const mountains = cost => { let area = 0; for (let k = 0; k < cost.length; k++) if (cost[k] === 0 && RANGES.includes(L.region[k])) area += STEP * STEP; return area; };
  // A walker, whatever he is willing to fall and whatever his health.
  const walker = flood(here, { within: inReach });
  assert.ok(mountains(walker) > 60000, `the flood ran: ${mountains(walker)} m2 of the mountains walked`);
  assert.equal(walker[LOWLAND[0].k], Infinity, `Amod below Varn is reached from the valleys by ${fall(walker[LOWLAND[0].k])}`);
  assert.deepEqual(empire(walker), { area: 0, first: null }, 'a walker out of the valleys is on the Empire’s ground inside Varn’s reach');
  // A climber who never tires, the slabs' rock made no-hold like the rest of it: the same. So no climb but the slabs goes
  // round the city - not the eastern peak's first ramp from the forecourt, which was the easy way before, nor anything else.
  const climber = flood(here, { within: inReach, climber: true, forbidden: (x, z) => world.unclimbableAt(x, z) || !!onSlab(x, z, .5) });
  assert.ok(mountains(climber) >= mountains(walker), 'a climber goes where a walker goes');
  assert.equal(climber[LOWLAND[0].k], Infinity, `but for the slabs a climber is in Amod below Varn by ${fall(climber[LOWLAND[0].k])}`);
  assert.deepEqual(empire(climber), { area: 0, first: null }, 'but for the slabs a climber out of the valleys is on the Empire’s ground inside Varn’s reach');
  // And with the slabs as they are he is there, with no fall that costs him anything: the slabs are the way.
  const bySlabs = flood(here, { within: inReach, climber: true, forbidden: world.unclimbableAt });
  assert.ok(bySlabs[LOWLAND[0].k] < TERRAIN_FALL.safeDrop, `by the slabs a climber is in Amod below Varn by ${fall(bySlabs[LOWLAND[0].k])}`);
  // The three doors over the Empire's ground. The eastern peak's high chimney and its eastern chamber open on shelves no wider
  // than the rim, and the rim stops two metres short of a cave's mouth (src/content/regions/varn/varn-world.js, `DOOR`), so the brink before each
  // was open, and a body that stepped off there came to the Empire's ground by falls (docs/varn-report.md). Since the user's
  // decision of 3 October each carries a rail beyond the door (`CAVE_RAILS`), and the high chimney has a way again: a climber
  // comes to both its doors along the fourth ledge (`CAVE_WAY`). That ledge is narrower than this lattice resolves - held a
  // metre apart in tests/varn-world.test.js ("the caves' way"), which floods the eastern massif to its far end - so here
  // the doors are flooded from: from every door of the two, over both massifs, neither a walker nor a climber who never
  // tires (the slabs barred) comes to any of the Empire's ground, by any fall. The chamber still has no way: nobody comes
  // to its door from the valleys, by any fall.
  const doorCells = [];
  for (const id of ['eastern-high-chimney', 'eastern-chamber']) {
    const cave = world.lotharnCaves.find(one => one.id === id);
    assert.ok(cave, `${id} is not a cave of the East Lotharn`);
    for (const at of cave.kind === 'chamber' ? [cave.openings[0]] : cave.openings) {
      const door = cave.at(at);
      let points = 0, least = Infinity;
      for (let dz = -3; dz <= 3; dz += STEP) for (let dx = -3; dx <= 3; dx += STEP) {
        const k = L.cell(door.x + dx, door.z + dz); if (!L.used[k]) continue;
        points++; least = Math.min(least, climber[k]);
        if (L.stand[k]) doorCells.push(k);
        if (id === 'eastern-chamber') for (const [who, cost] of [['a walker', walker], ['a climber', climber], ['a climber, by the slabs,', bySlabs]]) assert.equal(cost[k], Infinity, `${who} is at ${id}'s door (${L.at(k).x}, ${L.at(k).z}) by ${fall(cost[k])}`);
      }
      assert.ok(points >= 9, `${id}'s door at ${door.x.toFixed(0)}, ${door.z.toFixed(0)} is off the measured ground`);
      t.diagnostic(`${id}'s door at ${door.x.toFixed(0)}, ${door.z.toFixed(0)}: a climber from the valleys on this lattice, ${fall(least)}`);
    }
  }
  assert.ok(doorCells.length >= 6, `${doorCells.length} points to stand on at the doors`);
  const outWalker = leastFall(L, world, doorCells, { links, ways: onPeakWay, risers: lipRib, riserReach: inVarnRock, within: inReach });
  const outClimber = leastFall(L, world, doorCells, { links, ways: onPeakWay, risers: lipRib, riserReach: inVarnRock, within: inReach, climber: true, forbidden: (x, z) => world.unclimbableAt(x, z) || !!onSlab(x, z, .5) });
  assert.deepEqual(empire(outWalker), { area: 0, first: null }, 'a walker out of a cave door is on the Empire’s ground');
  assert.deepEqual(empire(outClimber), { area: 0, first: null }, 'but for the slabs a climber out of a cave door is on the Empire’s ground');
  t.diagnostic(`inside Varn's reach: a walker has ${mountains(walker)} m2 of the mountains and none of the Empire's ground by any fall; a tireless climber ${mountains(climber)} m2 and none; with the slabs open the same climber’s worst fall on the way to Amod below Varn is ${bySlabs[LOWLAND[0].k].toFixed(1)} m`);
});

test('the passages through the rock are inside the walls: both mouths of each are the mountains’ own ground', { skip: !LOTHARN_PASSES_SHUT }, () => {
  const down = flood(VALLEYS), up = flood(LOWLAND);
  for (const cave of [...world.lotharnCaves, ...world.westLotharnCaves].filter(one => one.kind === 'through')) {
    const [open, close] = cave.openings;
    for (const at of [open - 1, close + 1]) {
      const p = cave.at(Math.max(0, Math.min(cave.length, at))), k = L.near(p.x, p.z, 4);
      assert.ok(k >= 0, `${cave.id}'s mouth cannot be stood at`);
      assert.equal(down[k], 0, `${cave.id}'s mouth at ${p.x.toFixed(0)}, ${p.z.toFixed(0)} is not walked to from the valleys`);
      assert.equal(up[k], Infinity, `${cave.id}'s mouth at ${p.x.toFixed(0)}, ${p.z.toFixed(0)} is reached from the lowlands`);
    }
  }
});

test('open the gates and every one of them is a way: all at once, and each alone to its own country', () => {
  const down = flood(VALLEYS, { open: shutGate }), up = flood(LOWLAND, { open: shutGate });
  for (const low of LOWLAND) assert.equal(down[low.k], 0, `${low.name} is not walked to with the gates open (${fall(down[low.k])})`);
  for (const valley of VALLEYS) assert.equal(up[valley.k], 0, `${valley.name} is not walked to from below with the gates open (${fall(up[valley.k])})`);
  GATES.forEach((id, index) => {
    const alone = flood(VALLEYS, { open: c => shutGate(c) && c.gate === id });
    assert.equal(alone[LOWLAND[index].k], 0, `${id} open alone does not let a walker down to ${LOWLAND[index].name}`);
  });
});

test('nobody is sealed in, gates shut: from every valley a walker walks out of the mountains by the pass road’s northern end', () => {
  const north = L.near(PASS_ROAD_LINE.at(-1).x, PASS_ROAD_LINE.at(-1).z, 12);
  assert.ok(north >= 0, 'the pass road’s northern end can be stood at');
  for (const valley of VALLEYS) {
    const from = leastFall(L, world, [valley.k], { links, ways: onPeakWay, risers: lipRib, riserReach: inVarnRock });
    assert.equal(from[north], 0, `from ${valley.name} the pass road’s northern end is ${fall(from[north])}`);
  }
  // And the yard behind each gate opens onto its own country: nobody is shut in on the Empire's side either.
  for (const [index, fort] of LOTHARN_FORTS.entries()) {
    const yard = L.near(fort.way[2].x, fort.way[2].z, 4);
    assert.ok(yard >= 0 && leastFall(L, world, [yard], { links, ways: onPeakWay, risers: lipRib, riserReach: inVarnRock })[LOWLAND[index + 1].k] === 0, `${fort.id}'s yard is cut off from ${fort.opens}`);
  }
});

test('each wall, close to: no walker past it or round its ends at a metre, and no climber either - the rock its ends die into gives no hold', { skip: !LOTHARN_PASSES_SHUT }, t => {
  const lifted = [];
  for (const fort of LOTHARN_FORTS) {
    const pad = 46, box = { minX: Math.floor(Math.min(fort.a.x, fort.b.x) - pad), maxX: Math.ceil(Math.max(fort.a.x, fort.b.x) + pad), minZ: Math.floor(Math.min(fort.a.z, fort.b.z) - pad), maxZ: Math.ceil(Math.max(fort.a.z, fort.b.z) + pad) };
    const local = sampleLattice(world, box, 1);
    // Which side of the wall a point is on, and how far along it: the two sides are told apart only between the wall's ends.
    const dir = fort.circuit.edges[0].dir, side = k => { const p = local.at(k), dx = p.x - fort.a.x, dz = p.z - fort.a.z; return { along: dx * dir.x + dz * dir.z, behind: dx * fort.inward.x + dz * fort.inward.z }; };
    const front = local.near(fort.mountainSide.x, fort.mountainSide.z, 6), back = local.near(fort.empireSide.x, fort.empireSide.z, 6);
    assert.ok(front >= 0 && back >= 0, `${fort.id}: nowhere to stand either side of the gate`);
    const crossed = cost => { let n = 0; for (let k = 0; k < cost.length; k++) if (cost[k] < Infinity) { const s = side(k); if (s.behind > 3 && s.along > 0 && s.along < fort.length) n++; } return n; };
    const crossedAlive = cost => { let n = 0; for (let k = 0; k < cost.length; k++) if (cost[k] < LETHAL_FALL) { const s = side(k); if (s.behind > 3 && s.along > 0 && s.along < fort.length) n++; } return n; };
    const walker = leastFall(local, world, [front], { midpoints: true, ways: onPeakWay, risers: lipRib, riserReach: inVarnRock });
    assert.equal(crossed(walker), 0, `${fort.id}: a walker is behind the wall`);
    assert.equal(walker[back], Infinity);
    // A climber: no way behind the wall that a hundred health lives through. (By any fall at all is measured, not held:
    // where a peak's own ramp passes a wall's end, he is on the ledge above it and can step off.)
    const climber = leastFall(local, world, [front], { midpoints: true, climber: true, forbidden: world.unclimbableAt, ways: onPeakWay, risers: lipRib, riserReach: inVarnRock });
    assert.equal(crossedAlive(climber), 0, `${fort.id}: a climber is behind the wall, alive`);
    assert.ok(climber[back] > LETHAL_FALL + 5, `${fort.id}: a climber is behind the gate by ${fall(climber[back])}`);
    // Were the rock at its ends climbable: the same flood with the rule lifted. At the Vastos Gate and the Meneth Gate he
    // is then behind the wall without a fall, so there the rule is what holds him; at the Reach Gate the cliffs are too
    // steep for a hand in any case, and the rule only makes sure of it.
    const free = leastFall(local, world, [front], { midpoints: true, climber: true, ways: onPeakWay, risers: lipRib, riserReach: inVarnRock });
    assert.ok(free[back] <= climber[back], `${fort.id}: lifting the rule made it harder`);
    lifted.push(free[back]);
    t.diagnostic(`${fort.name}: a climber, with the no-hold rule: behind the gate by ${fall(climber[back])}; with the rule lifted, ${fall(free[back])}`);
    // And with the gate open the walker is through.
    const open = leastFall(local, world, [front], { midpoints: true, open: shutGate });
    assert.equal(open[back], 0, `${fort.id}: the gate open is not a way through`);
  }
  assert.ok(lifted.filter(value => value === 0).length >= 2, 'the rule is what holds a climber at two of the three');
});
