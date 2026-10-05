import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { sourceModule } from './module-loader.js';
import { scopedWorld } from './scoped-world.js';

/**
 * Alezhor's ground: the atlas's twenty-five hexes, the plain and its forest foot, the coast, the gold river and the
 * west stream carried on from the forest to the sea, the Alezhor Water's bank, the kept river-mouth flats, the seams
 * with the four built neighbours and the unbuilt one, the colour, and the places. Pure functions first; one world
 * scoped to Alezhor and its built neighbours at the end.
 *
 * "The world's ground" here is what the game stands a traveler on: `groundWithRiver` with the Ibenwood's own river
 * cut over it (`createIbenwoodRiverSystem`'s `ground`, which src/world.js lays after every country's layer).
 */
const THREE = await sourceModule('../vendor/three.module.js');
const { REGION_IDS, REGION_TERRAIN, hexOwnerAt, regionAt, landDistance, terrainMix, SEA_LEVEL } = await sourceModule('../src/region-world.js');
const { groundWithRiver: ground, groundBeforeAlezhor: before, groundTint, SHORE_TINT_FAMILIES, GROUND_TINT_FAMILIES, shoreTintOf } = await sourceModule('../src/world-terrain.js');
const { canStand, moveCharacter, WATERLINE } = await sourceModule('../src/game-state.js');
const { westWaterSurface, WEST_PROFILES } = await sourceModule('../src/west-ground.js');
const { ALEZHOR_WATER } = await sourceModule('../src/west-regions.js');
const { createIbenwoodRiverSystem } = await sourceModule('../src/ibenwood-rivers.js');
const { regionBuildStatus } = await sourceModule('../src/build-status.js');
const A = await sourceModule('../src/alezhor-world.js');
const { ALEZHOR, ALEZHOR_CELLS, ALEZHOR_CLIMATE, ALEZHOR_EDGES, ALEZHOR_LINES, ALEZHOR_BOX, ALEZHOR_KEPT, ALEZHOR_RESERVED, ALEZHOR_COVES,
  ALEZHOR_FOLDS, ALEZHOR_ARRIVAL, ALEZHOR_LANDMARKS, ALEZHOR_TRAILS, ALEZHOR_VIEWS, ALEZHOR_GROUND, ALEZHOR_WATER_BANK, GOLD_REACH_SPEC,
  alezhorGround, alezhorTint, alezhorShoreTint, alezhorOwns, alezhorWrites, alezhorCover, alezhorWaterAt, alezhorRiverAt,
  alezhorWaterColliders, alezhorWaterRibbons, alezhorMapWaters, alezhorWaterNear, goldReach, westStream, ibenwoodEnds, cliffShare,
  keptAt, foldAt, treeLineDistance } = A;

const WWMAP = new URL('../../world-builder/map/resources/examples/azhora.wwmap', import.meta.url);
const forest = createIbenwoodRiverSystem({ groundHeight: ground });
/** The world's ground: Alezhor's layer and every other, with the forest's own river cut over it. */
const H = (x, z) => forest.ground(x, z, ground(x, z));
const face = (x, z, e = .4) => Math.hypot((H(x + e, z) - H(x - e, z)) / (2 * e), (H(x, z + e) - H(x, z - e)) / (2 * e));
const along = (e, s) => [e.a.x + (e.b.x - e.a.x) * s / e.length, e.a.z + (e.b.z - e.a.z) * s / e.length];
const lattice = function* (step, box = ALEZHOR_BOX) { for (let x = box.minX; x <= box.maxX; x += step) for (let z = box.minZ; z <= box.maxZ; z += step) yield [x, z]; };
const walkLine = function* (points, step = .5) {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], l = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(l / step));
    for (let s = i === 1 ? 0 : 1; s <= n; s++) yield [a.x + (b.x - a.x) * s / n, a.z + (b.z - a.z) * s / n];
  }
};
const lineDistance = (x, z, lines = ALEZHOR_LINES) => Math.min(...lines.map(e => {
  const dx = e.b.x - e.a.x, dz = e.b.z - e.a.z, t = Math.max(0, Math.min(1, ((x - e.a.x) * dx + (z - e.a.z) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - e.a.x - dx * t, z - e.a.z - dz * t);
}));
/** The water the world knows at a point: the sea's line, or any of Alezhor's water colliders over it. */
const COLLIDERS = alezhorWaterColliders();
const worldWater = (x, z) => COLLIDERS.reduce((w, c) => (Math.hypot(x - c.x, z - c.z) < c.r ? Math.max(w, c.surface) : w), WATERLINE);
const tally = list => list.reduce((t, e) => ({ ...t, [e.far]: (t[e.far] ?? 0) + 1 }), {});
const GOLD = goldReach(), WEST = westStream(), ENDS = ibenwoodEnds();
const owner = (x, z) => hexOwnerAt(x, z);

test('Alezhor is the atlas’s: twenty-five hexes, all Csb, on outland’s profile, with the borders and water the atlas draws', () => {
  assert.equal(REGION_IDS[ALEZHOR], 64);
  assert.equal(ALEZHOR_CELLS.length, 25);
  const counts = {};
  for (const c of ALEZHOR_CELLS) counts[c.terrain] = (counts[c.terrain] ?? 0) + 1;
  assert.deepEqual(counts, { plains: 12, grassland: 13 });
  assert.ok(Object.values(ALEZHOR_CLIMATE).every(c => c === 'Csb') && Object.keys(ALEZHOR_CLIMATE).length === 25);
  if (existsSync(WWMAP)) {
    const map = JSON.parse(readFileSync(WWMAP, 'utf8').replace(/^﻿/, ''));
    for (const [key, code] of Object.entries(ALEZHOR_CLIMATE)) assert.equal(map.hexes[key]?.climate, code, key);
    // The gold river's Alezhor edge, and the west stream's three along South Ibenal's line, are the atlas's own.
    assert.equal(map.rivers['-30,116|-31,116'], 'medium');
    for (const k of ['-36,115|-36,116', '-36,116|-37,116', '-37,116|-37,117']) assert.equal(map.rivers[k], 'small', k);
  }
  // Registered and built on outland's own profile, so no neighbour's hex blend - and none of their ground - moved.
  for (const k of ['base', 'amp', 'wave']) assert.equal(REGION_TERRAIN[ALEZHOR][k], REGION_TERRAIN.outland[k], k);
  assert.deepEqual(tally(ALEZHOR_EDGES), { 'West Ibenwood': 10, 'South Ibenwood': 13, Navarth: 5, 'Ganesh Desert': 3, sea: 22, 'South Ibenal': 3 });
  assert.equal(ALEZHOR_LINES.length, 34);
  for (const e of ALEZHOR_EDGES) {
    const [x, z] = [(e.a.x + e.b.x) / 2, (e.a.z + e.b.z) / 2];
    assert.equal(owner(x - e.nx, z - e.nz), ALEZHOR);
  }
  assert.equal(regionBuildStatus(ALEZHOR).state, 'environment');
});

test('the ground is written on Alezhor’s own land only, and at sea only where its two mouths cut the shore down', () => {
  let lowered = 0;
  for (const [x, z] of lattice(7, { minX: ALEZHOR_BOX.minX - 60, maxX: ALEZHOR_BOX.maxX + 60, minZ: ALEZHOR_BOX.minZ - 60, maxZ: ALEZHOR_BOX.maxZ + 60 })) {
    const writes = alezhorWrites(x, z), d = landDistance(x, z);
    if (!writes) {
      assert.equal(alezhorGround(x, z, 17.25, before), 17.25, `${x},${z}`);
      assert.equal(ground(x, z), before(x, z), `the ground moved at ${x},${z}`);
      assert.equal(alezhorTint(x, z, '#8d9c64'), null);
      // South Ibenal is nobody's: its land is never written, though the traveler is told he is in Alezhor near the line.
      if (owner(x, z) === 'Open country' && d > 0) assert.notEqual(alezhorWrites(x, z), true);
      continue;
    }
    if (d > 0) continue;
    // At sea: the shared shore, but for the mouths, which only ever cut it down.
    const g = ground(x, z), b = before(x, z);
    assert.ok(g <= b, `the sea floor was raised at ${x},${z}`);
    if (g < b) { lowered++; assert.ok(Math.min(alezhorRiverAt(x, z, 30)?.distance ?? Infinity, 99) < 22, `the shore was cut away from a mouth at ${x},${z}`); }
  }
  assert.ok(lowered > 3 && lowered < 40, `${lowered} sea points cut by the mouths`);
});

test('every border joins: half-metre samples along all thirty-four land edges, and the far side never moves', () => {
  const worst = {};
  let samples = 0;
  for (const e of ALEZHOR_LINES) for (let s = .1; s <= e.length - .1; s += .5) {
    const [x, z] = along(e, s);
    if (landDistance(x, z) < 1.5) continue;
    const step = Math.abs(ground(x + e.nx * .05, z + e.nz * .05) - ground(x - e.nx * .05, z - e.nz * .05));
    const key = `${e.far}${Math.min(s, e.length - s) < 2 ? ' corner' : ''}`;
    if (step > (worst[key]?.step ?? -1)) worst[key] = { step, at: `${x.toFixed(1)},${z.toFixed(1)}` };
    const fx = x + e.nx * .3, fz = z + e.nz * .3;
    if (owner(fx, fz) !== ALEZHOR) assert.equal(ground(fx, fz), before(fx, fz), `${e.far} moved at ${fx.toFixed(1)},${fz.toFixed(1)}`);
    samples++;
  }
  assert.ok(samples > 3700, `${samples} samples`);
  for (const [key, { step, at }] of Object.entries(worst)) {
    // One named exception: the corner where the forest's gold river ends on the line (-3950, 866). Alezhor leaves that
    // ground exactly as it was handed (the forest's river reads its last level off it), and the step there is the
    // hex blend's own, a metre on the base too; the world's ground is the forest river's bowl on both sides of it.
    const limit = key === 'South Ibenwood corner' ? 1.05 : .5;
    assert.ok(step < limit, `${key}: worst step ${step.toFixed(3)} m at ${at}`);
  }
  assert.ok(worst['West Ibenwood'].step < .05 && worst['South Ibenwood'].step < .1 && worst['South Ibenal'].step < .05, JSON.stringify(worst));
});

test('the forest’s two courses end where they did: Alezhor leaves the ground their last samples stand on as it was', () => {
  const without = createIbenwoodRiverSystem({ groundHeight: before });
  for (const id of ['ibenwood-central-south-river', 'ibenwood-west-stream']) {
    const a = forest.profiles.find(p => p.course.id === id).samples, b = without.profiles.find(p => p.course.id === id).samples;
    assert.equal(a.length, b.length);
    for (let i = 0; i < a.length; i++) assert.equal(a[i].surface, b[i].surface, `${id} sample ${i}`);
  }
  assert.equal(ENDS.gold.surface, forest.profiles.find(p => p.course.id === 'ibenwood-central-south-river').samples.at(-1).surface);
});

test('the gold river: carried on from the forest’s end, down three falls and a ford, into an estuary that reaches the sea', () => {
  const s = GOLD.samples, first = s[0];
  // Its first edge is the forest river's last one: same place, level, width and normal.
  assert.equal(first.x, ENDS.gold.x); assert.equal(first.z, ENDS.gold.z);
  assert.equal(first.surface, ENDS.gold.surface); assert.equal(first.half, ENDS.gold.half);
  assert.equal(first.nx, ENDS.gold.nx); assert.equal(first.nz, ENDS.gold.nz);
  // The atlas's line: from the forest's corner south along the edge between (-30,116) and (-31,116) to the sea.
  for (const p of s) if (!p.estuary) assert.ok(Math.abs(p.x - -3950) < 10 && owner(p.x, p.z) === ALEZHOR || p.along < 3, `the reach leaves its edge at ${p.x.toFixed(1)},${p.z.toFixed(1)}`);
  // Downhill all the way, thirteen metres in fifty, in three falls of over three metres each.
  let falls = 0, run = 0;
  for (let i = 1; i < s.length; i++) {
    assert.ok(s[i].surface <= s[i - 1].surface + 1e-9, `the gold river climbs at ${s[i].along.toFixed(1)} m`);
    const drop = s[i - 1].surface - s[i].surface;
    if (drop > .25) run += drop; else { if (run > 3) falls++; run = 0; }
  }
  assert.equal(falls, 3, `${falls} falls`);
  const estuaryHead = s.find(p => p.estuary);
  assert.ok(estuaryHead.along > 45 && estuaryHead.along < 56, `the estuary begins ${estuaryHead.along.toFixed(1)} m down`);
  // The water is never buried, and never hangs over a hole: under it the world's ground is below its level, and a
  // metre and a bit beyond its edge on either side the ground stands at its level or above.
  for (const p of s) {
    if (p.estuary || p.along < 1) continue;
    for (const k of [0, .85, -.85]) {
      const x = p.x + p.nx * p.half * k, z = p.z + p.nz * p.half * k;
      assert.ok(H(x, z) < p.surface - .03, `buried water at ${p.along.toFixed(1)} m (${k})`);
    }
    // Over its first ten metres the reach lies in the forest river's own end, whose bowl (cut over every country's
    // ground after them all) is the forest's, with the forest's banks: the water's edge over its bed, the bank rising
    // from a hand's breadth beyond it - the shape of every Ibenwood river's edge.
    if (p.along < 10) continue;
    for (const k of [1, -1]) {
      const x = p.x + p.nx * (p.half + 1.3) * k, z = p.z + p.nz * (p.half + 1.3) * k;
      assert.ok(H(x, z) > p.surface - .02, `the bank is under the water at ${p.along.toFixed(1)} m (${k}): ${H(x, z).toFixed(2)} against ${p.surface.toFixed(2)}`);
    }
  }
  // The estuary reaches the sea: its bed is under the sea's own surface from its head out past the shore.
  for (const p of s) if (p.estuary) assert.ok(H(p.x, p.z) < SEA_LEVEL - .3, `the estuary is closed at ${p.along.toFixed(1)} m`);
  assert.ok(landDistance(s.at(-1).x, s.at(-1).z) < -10, 'the reach runs out into the bay');
  // The gorge stands over the falls: its rims several metres over the water either side.
  const pool = s.find(p => p.along > 25.5);
  for (const k of [1, -1]) assert.ok(H(pool.x + pool.nx * (pool.half + 4) * k, pool.z + pool.nz * (pool.half + 4) * k) > pool.surface + 2.5, 'the gorge has no wall');
  // The ford is waded: no water collider over it, and its bed a traveler's footing over the waterline.
  for (const p of s) {
    if (p.along < GOLD_REACH_SPEC.ford.from + 1 || p.along > GOLD_REACH_SPEC.ford.to - 1) continue;
    assert.equal(worldWater(p.x, p.z), WATERLINE, `water collider over the ford at ${p.along.toFixed(1)} m`);
    assert.ok(H(p.x, p.z) > WATERLINE + .4 && p.surface - H(p.x, p.z) < .5, `the ford is not a ford at ${p.along.toFixed(1)} m`);
  }
  // The pools are swum: the world's water is over them.
  const pools = s.filter(p => !p.estuary && p.surface - p.bed > 1.2 && p.along > 3);
  assert.ok(pools.length > 10 && pools.every(p => worldWater(p.x, p.z) > H(p.x, p.z)), 'the pools are not water to a traveler');
});

test('the west stream: carried on from West Ibenwood’s end along South Ibenal’s line, wholly on Alezhor’s ground, to the sea', () => {
  const s = WEST.samples, first = s[0];
  assert.equal(first.x, ENDS.west.x); assert.equal(first.z, ENDS.west.z);
  assert.equal(first.surface, ENDS.west.surface); assert.equal(first.half, ENDS.west.half);
  const southIbenal = ALEZHOR_LINES.filter(e => e.far === 'South Ibenal');
  for (let i = 1; i < s.length; i++) assert.ok(s[i].surface <= s[i - 1].surface + 1e-9, `the west stream climbs at ${s[i].along.toFixed(1)} m`);
  const mouth = s.find(p => p.estuary);
  assert.ok(mouth && landDistance(mouth.x, mouth.z) < 3 && s.at(-1).surface <= SEA_LEVEL + 1e-9, 'the stream does not reach the sea');
  assert.ok(mouth.along > 150 && mouth.along < 200, `${mouth.along.toFixed(0)} m to the sea`);
  for (const p of s) {
    if (p.estuary) continue;
    if (p.along > 12) {
      assert.equal(owner(p.x, p.z), ALEZHOR, `the stream leaves Alezhor at ${p.along.toFixed(1)} m`);
      assert.ok(lineDistance(p.x, p.z, southIbenal) > 6, `the stream is on the line at ${p.along.toFixed(1)} m`);
    }
    if (p.along < 1) continue;
    for (const k of [0, .8, -.8]) assert.ok(H(p.x + p.nx * p.half * k, p.z + p.nz * p.half * k) < p.surface - .03, `buried water at ${p.along.toFixed(1)} m`);
    if (p.along < 9) continue;
    for (const k of [1, -1]) assert.ok(H(p.x + p.nx * (p.half + 1.5) * k, p.z + p.nz * (p.half + 1.5) * k) > p.surface, `the stream's bank is under its water at ${p.along.toFixed(1)} m`);
  }
  // Swum like the forest's own stream: the world knows its water.
  assert.ok(s.filter(p => !p.estuary && p.along > 5).every(p => worldWater(p.x, p.z) >= p.surface - .3), 'the stream is not water to a traveler');
});

test('the Alezhor Water: never moved, and given a real bank at its own level along all eight of its edges', () => {
  const profile = WEST_PROFILES.get(ALEZHOR_WATER.id), B = ALEZHOR_WATER_BANK;
  assert.equal(profile.length, ALEZHOR_WATER.samples.length);
  let buried = 0, holes = 0, checked = 0, steep = 0;
  for (const p of profile) for (let off = -p.half - 8; off <= p.half + 8; off += .5) {
    const x = p.x + p.nx * off, z = p.z + p.nz * off;
    if (owner(x, z) !== ALEZHOR) continue;
    const at = alezhorWaterNear(x, z, 20);
    if (!at) continue;
    const g = ground(x, z);
    if (at.distance < at.half - .3) { checked++; if (g > at.surface - .03) buried++; continue; }
    if (at.distance < at.half + 1.2 || at.distance > at.half + 7 || lineDistance(x, z) < B.floorTo + .5) continue;
    checked++;
    if (g < at.surface - .02) holes++;
    if (face(x, z) > .85) steep++;
  }
  assert.ok(checked > 500, `${checked} samples`);
  assert.equal(buried, 0, 'Alezhor stands in the Alezhor Water');
  assert.equal(holes, 0, 'the water hangs over Alezhor’s bank');
  assert.equal(steep, 0, 'a cliff bank beside the water');
  // Its water is the southwest's, drawn by the southwest's own ground, which Alezhor's layer does not reach.
  for (const p of profile) assert.equal(westWaterSurface(p.x, p.z), p.surface);
});

test('the river-mouth flats are kept level, open and dry, at the gold river’s estuary and the west stream’s mouth', () => {
  assert.equal(ALEZHOR_KEPT.length, 2);
  for (const k of ALEZHOR_KEPT) {
    let lo = Infinity, hi = -Infinity, n = 0;
    for (let x = k.x - k.halfX + 6; x <= k.x + k.halfX - 6; x += 3) for (let z = k.z - k.halfZ + 6; z <= k.z + k.halfZ - 6; z += 3) {
      if (!keptAt(x, z) || landDistance(x, z) < 16) continue;
      const plane = k.level + k.rise * ((x - k.x) * k.inland.x + (z - k.z) * k.inland.z), off = H(x, z) - plane;
      lo = Math.min(lo, off); hi = Math.max(hi, off); n++;
      assert.ok(H(x, z) > WATERLINE + 1.5, `${k.id} is wet at ${x},${z}`);
      assert.equal(alezhorWaterAt(x, z), null);
    }
    assert.ok(n > 20 && hi - lo < .15, `${k.id} varies ${(hi - lo).toFixed(3)} m over ${n} samples`);
    assert.ok(ALEZHOR_RESERVED.some(r => r.id === k.id && Math.abs(r.x - k.x) < 1e-9), `${k.id} is not reserved`);
  }
  const [gold, west] = ALEZHOR_KEPT;
  const estuary = GOLD.samples.find(p => p.estuary);
  assert.ok(Math.hypot(gold.x + gold.halfX - estuary.x, gold.z - estuary.z) < 30, 'the gold flat is not at the estuary');
  const mouth = WEST.samples.find(p => p.estuary);
  assert.ok(Math.hypot(west.x - west.halfX - mouth.x, west.z - west.halfZ - mouth.z) < 30, 'the west flat is not at the stream’s mouth');
});

test('the coast: cliffs in the narrow south with two coves, strands round the bay and the west lobe, and the waterline where it was', () => {
  let cliff = 0, south = 0, strand = 0, west = 0;
  for (const [x, z] of lattice(3)) {
    const d = landDistance(x, z);
    if (d < 1.5 || d > 2.5 || owner(x, z) !== ALEZHOR || lineDistance(x, z) < 30) continue;
    if (x > -3930) { south++; if (cliffShare(x, z) > .9) cliff++; } else if (x < -3946) { west++; if (cliffShare(x, z) < .1) strand++; }
  }
  assert.ok(cliff / south > .7, `${(cliff / south * 100).toFixed(0)}% of the south's shore is cliff`);
  assert.equal(strand, west, 'the bay and the west lobe are strand all round');
  // The cliffs stand: four metres in from the water the clifftop is well above it.
  let tall = 0, tops = 0;
  for (const [x, z] of lattice(1.5)) {
    const d = landDistance(x, z);
    if (d < 4 || d > 5 || owner(x, z) !== ALEZHOR || cliffShare(x, z) < .99 || lineDistance(x, z) < 40 || (alezhorRiverAt(x, z, 30)?.distance ?? 99) < 26) continue;
    tops++; if (H(x, z) > 6) tall++;
  }
  assert.ok(tops > 60 && tall / tops > .85, `${tall} of ${tops} clifftop samples stand over six metres`);
  for (const c of ALEZHOR_COVES) {
    const x = c.x + c.inland.x * 7, z = c.z + c.inland.z * 7;
    assert.ok(H(x, z) > WATERLINE && H(x, z) < 3.2, `${c.id}'s strand stands at ${H(x, z).toFixed(2)}`);
    assert.equal(cliffShare(c.x, c.z), 0, `${c.id} has a strand`);
  }
  // Inland of the shore every metre of Alezhor's own ground stands clear of the sea, but for its rivers' water.
  for (const [x, z] of lattice(5)) {
    if (landDistance(x, z) <= 8 || owner(x, z) !== ALEZHOR || (alezhorRiverAt(x, z, 30)?.distance ?? 99) < 26) continue;
    assert.ok(H(x, z) > WATERLINE + .5, `low ground at ${x},${z}: ${H(x, z).toFixed(2)}`);
  }
});

test('no steps: Alezhor’s ground is continuous everywhere but where a neighbour’s own ground steps at the line', () => {
  // Three named places, none of them Alezhor's own: the Alezhor Water's chute off Navarth's rim, whose own channel
  // steps at every sample hand-over (the southwest's course has no `blend`), met at the line; the Ganesh's own shore
  // at its corner on the gulf, whose hex blend steps at the coast's hex edge before Alezhor touches it; and the forest
  // gold river's last four metres, whose bowl the world cuts over every country's ground (the world's ground there is
  // the forest's bed on both sides of the hex blend's own edge).
  const named = [{ x: -3600, z: 1174, r: 10 }, { x: -3612, z: 1188, r: 9 }, { x: -3632, z: 1200, r: 9 }, { x: -3760, z: 1206, r: 12 },
    { x: ENDS.gold.x, z: ENDS.gold.z, r: 4 }];
  const corners = ALEZHOR_EDGES.flatMap(e => [e.a, e.b]), box = ALEZHOR_BOX, steps = [];
  const look = (x0, z0, dx, dz, n) => {
    let prev = ground(x0, z0);
    for (let i = 1; i <= n; i++) {
      const x = x0 + dx * i, z = z0 + dz * i, h = ground(x, z);
      if (Math.abs(h - prev) > .08) {
        let ax = x - dx, az = z - dz, bx = x, bz = z, ha = prev, hb = h;
        for (let k = 0; k < 7; k++) { const mx = (ax + bx) / 2, mz = (az + bz) / 2, hm = ground(mx, mz); if (Math.abs(hm - ha) > Math.abs(hb - hm)) { bx = mx; bz = mz; hb = hm; } else { ax = mx; az = mz; ha = hm; } }
        const own = alezhorWrites(ax, az), corner = corners.some(c => Math.hypot(ax - c.x, az - c.z) < 2), excused = named.some(p => Math.hypot(ax - p.x, az - p.z) < p.r);
        if (Math.abs(hb - ha) > .03 && own && !corner && !excused) steps.push(`${ax.toFixed(2)},${az.toFixed(2)}: ${Math.abs(hb - ha).toFixed(3)} m`);
      }
      prev = h;
    }
  };
  for (let z = box.minZ + 20; z <= box.maxZ - 20; z += 10) look(box.minX + 20, z, .1, 0, Math.round((box.maxX - box.minX - 40) / .1));
  for (let x = box.minX + 20; x <= box.maxX - 20; x += 10) look(x, box.minZ + 20, 0, .1, Math.round((box.maxZ - box.minZ - 40) / .1));
  assert.deepEqual(steps, []);
});

test('the plain rises to the forest at the tree line, swells gently, and keeps its woods in its folds', () => {
  // Over the head of the bay the plain is low and gentle; the forest's foot rises to meet the trees.
  let n = 0, sum = 0, steepest = 0;
  for (let x = -4280; x <= -4060; x += 6) for (let z = 880; z <= 905; z += 5) {
    if (keptAt(x, z) || landDistance(x, z) < 20) continue;
    n++; sum += H(x, z); steepest = Math.max(steepest, face(x, z, 1));
  }
  assert.ok(sum / n > 2.5 && sum / n < 7, `the bay's plain stands at ${(sum / n).toFixed(1)} m`);
  assert.ok(steepest < .2, `the plain is ${steepest.toFixed(2)} at its steepest`);
  // (Not in the tilted south's north-east, where Navarth's rim, not the forest, is the high ground behind the strip.)
  for (const e of ALEZHOR_LINES.filter(l => (l.far === 'West Ibenwood' || l.far === 'South Ibenwood') && l.a.x < -3800)) {
    const [x, z] = along(e, e.length / 2), deep = [x - e.nx * 70, z - e.nz * 70];
    if (owner(...deep) !== ALEZHOR || landDistance(...deep) < 30 || alezhorRiverAt(...deep, 30)) continue;
    assert.ok(ground(x - e.nx * .3, z - e.nz * .3) > ground(...deep) + 1, `no rise to the forest behind ${x.toFixed(0)},${z.toFixed(0)}`);
  }
  const line = ALEZHOR_LINES.find(l => l.far === 'West Ibenwood'), [lx, lz] = along(line, line.length / 2);
  assert.ok(treeLineDistance(lx - line.nx, lz - line.nz) < 1.5 && alezhorCover(lx - line.nx, lz - line.nz).edge > .9, 'the tree line is where the forest begins');
  // Each fold is a hollow its own sides stand over.
  for (const f of ALEZHOR_FOLDS) {
    const mid = f.points[Math.floor(f.points.length / 2)], at = foldAt(mid.x, mid.z);
    assert.ok(at.cut > f.depth * .5, `${f.id} is not cut at its middle`);
  }
});

test('the colour: grass by place and lie, the forest’s foot, banks, gravel, dunes and rock, faded into the swatch at every line; stone on the cliffs', () => {
  assert.ok(GROUND_TINT_FAMILIES.includes('alezhor') && SHORE_TINT_FAMILIES.includes('alezhor'));
  const colours = new Set();
  for (const [x, z] of lattice(13)) {
    const c = alezhorTint(x, z, '#8d9c64');
    if (!alezhorWrites(x, z)) { assert.equal(c, null); continue; }
    assert.ok(Number.isInteger(c) && c >= 0 && c <= 0xffffff);
    colours.add(c >> 3);
  }
  assert.ok(colours.size > 40, `${colours.size} colours`);
  // At a line the colour is the swatch it was given.
  const e = ALEZHOR_LINES.find(l => l.far === 'West Ibenwood'), [x, z] = along(e, e.length / 2);
  assert.equal(alezhorTint(x - e.nx * .01, z - e.nz * .01, '#a4a363') >> 2, 0xa4a363 >> 2);
  // The cover the scenery reads: rock at the gorge, gravel at the ford, banks by the water, the dunes and the folds.
  const pool = GOLD.samples.find(p => p.along > 25.5), ford = GOLD.samples.find(p => p.along > 42);
  assert.ok(alezhorCover(pool.x + pool.nx * (pool.half + 3), pool.z + pool.nz * (pool.half + 3)).gorge > .5, 'the gorge is not rock');
  assert.ok(alezhorCover(ford.x + ford.nx * (ford.half + .5), ford.z + ford.nz * (ford.half + .5)).gravel > .5, 'the ford is not gravel');
  assert.ok(alezhorCover(-4420, 1003).dune > .5, 'no dunes');
  // The shore: stone on the south's cliffs.
  let stone = 0;
  for (const [px, pz] of lattice(2, { minX: -3930, maxX: -3730, minZ: 940, maxZ: 1215 })) {
    const d = landDistance(px, pz);
    if (d < 0 || d > 3) continue;
    if (alezhorShoreTint(px, pz, d)?.rock > .9) stone++;
  }
  assert.ok(stone > 100, `${stone} samples of stone on the cliffs`);
  assert.equal(shoreTintOf('alezhor', -4150, 935, landDistance(-4150, 935)), null, 'the bay is sand');
  // The tint reaches the screen: the dunes are drawn in their own colour, not the blend's swatches.
  const painted = new THREE.Color(), swatch = new THREE.Color();
  groundTint(painted, -4420, 1003, THREE);
  let r = 0, g = 0, b = 0, total = 0;
  for (const [name, weight] of Object.entries(terrainMix(-4420, 1003).grounds)) { if (!weight) continue; swatch.set(name); r += swatch.r * weight; g += swatch.g * weight; b += swatch.b * weight; total += weight; }
  assert.ok(Math.hypot(painted.r - r / total, painted.g - g / total, painted.b - b / total) > .02, 'the dunes are drawn as the bare swatch');
  assert.ok(Object.values(ALEZHOR_GROUND).every(c => Number.isInteger(c)));
});

test('the water for the scenery and the chart: ribbons where the water is, colliders no higher than it, outlines for the map', () => {
  const ribbons = alezhorWaterRibbons();
  assert.deepEqual(ribbons.map(r => r.id), ['alezhor-gold-reach', 'alezhor-west-stream']);
  for (const r of ribbons) {
    assert.equal(r.positions.length % 6, 0);
    assert.ok(r.indices.length >= (r.positions.length / 6 - 1) * 6 - 6 && Math.max(...r.indices) < r.positions.length / 3);
  }
  // The gold ribbon's first edge is the forest ribbon's last.
  const [gold] = ribbons, end = ENDS.gold;
  assert.ok(Math.abs(gold.positions[0] - (end.x + end.nx * end.half)) < 1e-9 && Math.abs(gold.positions[1] - end.surface) < 1e-9);
  for (const c of COLLIDERS) {
    assert.equal(c.kind, 'river-water');
    const at = alezhorRiverAt(c.x, c.z, 4);
    assert.ok(at && c.surface <= at.surface + 1e-9, `a collider over its water at ${c.x.toFixed(1)},${c.z.toFixed(1)}`);
  }
  assert.equal(alezhorMapWaters().length, 2);
  assert.ok(alezhorMapWaters().every(w => w.kind === 'polygon' && w.points.length > 20));
});

test('landmarks, trails, views and arrival: natural places on dry ground, walker’s views at a walker’s eye, and nothing anybody owns', () => {
  for (const p of [ALEZHOR_ARRIVAL, ...ALEZHOR_LANDMARKS]) {
    assert.ok(alezhorOwns(p.x, p.z), p.id ?? 'arrival');
    assert.ok(landDistance(p.x, p.z) > 0 && H(p.x, p.z) > WATERLINE + .5, `${p.id ?? 'arrival'} is wet`);
    assert.equal(alezhorWaterAt(p.x, p.z), null, p.id ?? 'arrival');
    assert.ok(face(p.x, p.z) < .6, `${p.id ?? 'arrival'} stands on a slope`);
  }
  for (const p of ALEZHOR_LANDMARKS) {
    assert.equal(p.region, REGION_IDS[ALEZHOR]);
    assert.match(p.id, /^alezhor-/);
    assert.ok(p.description.length > 60, `${p.id} has discovery text`);
    assert.doesNotMatch(`${p.name} ${p.description}`, /\bcity|cities|town|village|harbou?r|quay|port\b|mine|mining|working|farm|road|temple|shrine|house/i, p.id);
  }
  for (const a of ALEZHOR_LANDMARKS) for (const b of ALEZHOR_LANDMARKS) if (a !== b)
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > Math.max(28, a.radius ?? 40, b.radius ?? 40), `${a.id} and ${b.id}`);
  for (const trail of ALEZHOR_TRAILS) {
    assert.match(trail.id, /^alezhor-/);
    let prev = null;
    for (const [x, z] of walkLine(trail.points, .5)) {
      assert.ok(alezhorOwns(x, z), `${trail.id} leaves Alezhor at ${x},${z}`);
      // Dry by the world's own rule: the ground over every water the world knows there. The gold river's ford is waded.
      assert.ok(H(x, z) >= worldWater(x, z), `${trail.id} is wet at ${x.toFixed(1)},${z.toFixed(1)}`);
      // Alezhor is not climbing country, so any slope can be walked; the ways keep under the climbing country's grab slope.
      if (prev) assert.ok(Math.abs(H(x, z) - prev[2]) / .5 < .9, `${trail.id} climbs ${((H(x, z) - prev[2]) / .5).toFixed(2)} at ${x.toFixed(1)},${z.toFixed(1)}`);
      prev = [x, z, H(x, z)];
    }
  }
  const ids = Object.keys(ALEZHOR_VIEWS);
  assert.ok(ids.includes('alezhor') && ids.includes('alezhor-wildlife'));
  let walks = 0;
  for (const [id, v] of Object.entries(ALEZHOR_VIEWS)) {
    assert.match(id, /^alezhor/);
    for (const p of [v.eye, v.target]) assert.ok([p.x, p.y, p.z].every(Number.isFinite));
    const over = v.eye.y - H(v.eye.x, v.eye.z);
    if (v.walk) { walks++; assert.ok(Math.abs(over - 1.8) < .02, `${id}'s eye is ${over.toFixed(2)} m over the ground`); }
    else assert.ok(over > 1.5, `${id} is above the ground`);
  }
  assert.ok(walks >= 4, `${walks} walker's views`);
});

// ---------------------------------------------------------------------------
// The built country
// ---------------------------------------------------------------------------
let scoped = null;
const built = () => scoped ??= (async () => {
  const scene = new THREE.Scene();
  return { scene, world: await scopedWorld(scene, [REGION_IDS[ALEZHOR], REGION_IDS['South Ibenwood'], REGION_IDS['West Ibenwood'], REGION_IDS.Navarth, REGION_IDS['Ganesh Desert']]) };
})();

test('built: the world stands a traveler on this ground, knows its water, and its ways can be walked', async () => {
  const { world } = await built();
  for (const p of [ALEZHOR_ARRIVAL, ...ALEZHOR_LANDMARKS]) {
    assert.ok(Math.abs(world.heightAt(p.x, p.z) - H(p.x, p.z)) < 1e-6, `${p.id ?? 'arrival'}: the world's ground is not this ground`);
    assert.ok(canStand(p.x, p.z, world, .4), `${p.id ?? 'arrival'} has no clear footing`);
    assert.equal(world.regionAt(p.x, p.z).name, ALEZHOR);
  }
  // The gold river's pools are swum, and its ford is waded.
  const pool = GOLD.samples.find(p => p.along > 25.5), ford = GOLD.samples.find(p => p.along > 42);
  assert.ok(world.waterAt(pool.x, pool.z) > world.heightAt(pool.x, pool.z), 'the pools are not water to the world');
  assert.ok(canStand(ford.x, ford.z, world, .4), 'the ford cannot be waded');
  // Every trail, both ways, by the traveler's own movement.
  for (const trail of ALEZHOR_TRAILS) for (const points of [trail.points, [...trail.points].reverse()]) {
    const at = { ...points[0], y: world.heightAt(points[0].x, points[0].z) };
    for (const target of points.slice(1)) {
      const steps = Math.ceil(Math.hypot(target.x - at.x, target.z - at.z) / .3), dx = (target.x - at.x) / steps, dz = (target.z - at.z) / steps;
      for (let s = 0; s < steps; s++) { moveCharacter(at, dx, dz, world, .34); at.y = world.heightAt(at.x, at.z); }
      assert.ok(Math.hypot(at.x - target.x, at.z - target.z) < .15, `${trail.id} is blocked short of ${target.x}, ${target.z} at ${at.x.toFixed(1)}, ${at.z.toFixed(1)}`);
    }
  }
});
