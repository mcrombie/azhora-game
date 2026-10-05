import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { sourceModule } from './module-loader.js';
import { scopedWorld } from './scoped-world.js';

/**
 * South Ibenal's ground, and the corridor plain both Ibenals stand on (src/south-ibenal-world.js): the atlas's thirty
 * hexes, the one plain and its rise to the forest, the five streams and their fords, West Ibenwood's stream and
 * Alezhor's west stream left exactly where they were, the seam with Alezhor (Alezhor meets this country), the coast, the
 * kept flats, the colour, and the places. North Ibenal's own tests are tests/north-ibenal-world.test.js. Pure functions
 * first; one world scoped to both Ibenals and their built neighbours at the end.
 *
 * "The world's ground" here is what the game stands a traveler on: `groundWithRiver` with the Ibenwood's own rivers cut
 * over it (`createIbenwoodRiverSystem`'s `ground`, which src/world.js lays after every country's layer).
 */
const THREE = await sourceModule('../vendor/three.module.js');
const { REGION_IDS, REGION_TERRAIN, hexOwnerAt, hexCentre, landDistance, terrainMix, SEA_LEVEL } = await sourceModule('../src/region-world.js');
const { groundWithRiver: ground, groundBeforeSouthIbenal: beforeSouth, groundBeforeNorthIbenal: beforeNorth, groundBeforeAlezhor,
  groundTint, GROUND_TINT_FAMILIES, SHORE_TINT_FAMILIES } = await sourceModule('../src/world-terrain.js');
const { canStand, moveCharacter, WATERLINE } = await sourceModule('../src/game-state.js');
const { createIbenwoodRiverSystem } = await sourceModule('../src/ibenwood-rivers.js');
const { regionBuildStatus } = await sourceModule('../src/build-status.js');
const A = await sourceModule('../src/alezhor-world.js');
const S = await sourceModule('../src/south-ibenal-world.js');
const N = await sourceModule('../src/north-ibenal-world.js');
const { SOUTH_IBENAL, SOUTH_IBENAL_CELLS, SOUTH_IBENAL_CLIMATE, IBENAL_EDGES, IBENAL_LINES, IBENAL_BOX, IBENAL_KEPT, IBENAL_RESERVED,
  IBENAL_STREAM_SPECS, IBENAL_TRAILS, IBENAL_GROUND, IBENAL_FORD, IBENWOOD_STREAM_KEEP, SOUTH_IBENAL_ARRIVAL, SOUTH_IBENAL_LANDMARKS,
  SOUTH_IBENAL_TRAILS, SOUTH_IBENAL_VIEWS, southIbenalGround, southIbenalTint, southIbenalShoreTint, southIbenalOwns, ibenalWriter,
  ibenalCover, ibenalStreams, ibenalRiverAt, ibenalWaterAt, ibenalWaterRibbons, ibenalWaterColliders, ibenalMapWaters, ibenalRiverIndex,
  cliffShare, keptAt, treeLineDistance, duneLift } = S;

const WWMAP = new URL('../../world-builder/map/resources/examples/azhora.wwmap', import.meta.url);
const forest = createIbenwoodRiverSystem({ groundHeight: ground });
/** The world's ground: every country's layer, with the forest's own rivers cut over it. */
const H = (x, z) => forest.ground(x, z, ground(x, z));
const face = (x, z, e = .4) => Math.hypot((H(x + e, z) - H(x - e, z)) / (2 * e), (H(x, z + e) - H(x, z - e)) / (2 * e));
const along = (e, s) => [e.a.x + (e.b.x - e.a.x) * s / e.length, e.a.z + (e.b.z - e.a.z) * s / e.length];
const lattice = function* (step, box = IBENAL_BOX) { for (let x = box.minX; x <= box.maxX; x += step) for (let z = box.minZ; z <= box.maxZ; z += step) yield [x, z]; };
const walkLine = function* (points, step = .5) {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], l = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(l / step));
    for (let s = i === 1 ? 0 : 1; s <= n; s++) yield [a.x + (b.x - a.x) * s / n, a.z + (b.z - a.z) * s / n];
  }
};
const segment = (x, z, a, b) => {
  const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
  return { distance: Math.hypot(x - a.x - dx * t, z - a.z - dz * t), t };
};
const lineDistance = (x, z, lines = IBENAL_LINES) => Math.min(...lines.map(e => segment(x, z, e.a, e.b).distance));
/** The water the world knows at a point: the sea's line, or any of the Ibenals' water colliders over it. */
const COLLIDERS = ibenalWaterColliders();
const worldWater = (x, z) => COLLIDERS.reduce((w, c) => (Math.hypot(x - c.x, z - c.z) < c.r ? Math.max(w, c.surface) : w), WATERLINE);
const tally = list => list.reduce((t, e) => ({ ...t, [e.far]: (t[e.far] ?? 0) + 1 }), {});
const owner = (x, z) => hexOwnerAt(x, z);
const STREAMS = ibenalStreams();
const forestCourse = IBENWOOD_STREAM_KEEP.points;
const forestStreamDistance = (x, z) => { let d = Infinity; for (let i = 1; i < forestCourse.length; i++) d = Math.min(d, segment(x, z, forestCourse[i - 1], forestCourse[i]).distance); return d; };
const ALEZHOR_LINES = IBENAL_LINES.filter(l => l.far === 'Alezhor');
const nearAlezhorLine = (x, z, r) => ALEZHOR_LINES.some(l => segment(x, z, l.a, l.b).distance < r);

test('South Ibenal is the atlas’s: thirty hexes of plains, all Csb, on outland’s profile, with the borders and water the atlas draws', () => {
  assert.equal(REGION_IDS[SOUTH_IBENAL], 114);
  assert.equal(SOUTH_IBENAL_CELLS.length, 30);
  assert.ok(SOUTH_IBENAL_CELLS.every(c => c.terrain === 'plains'));
  assert.ok(Object.values(SOUTH_IBENAL_CLIMATE).every(c => c === 'Csb') && Object.keys(SOUTH_IBENAL_CLIMATE).length === 30);
  if (existsSync(WWMAP)) {
    const map = JSON.parse(readFileSync(WWMAP, 'utf8').replace(/^﻿/, ''));
    for (const [key, code] of Object.entries(SOUTH_IBENAL_CLIMATE)) assert.equal(map.hexes[key]?.climate, code, key);
    // The three streams inside the country, the two edges on the line with North Ibenal, and West Ibenwood's three.
    for (const k of ['-34,111|-35,111', '-34,110|-35,111', '-34,111|-35,112', '-32,109|-33,109', '-32,108|-33,109', '-30,107|-31,107',
      '-30,106|-31,107', '-30,107|-31,108', '-29,105|-29,106', '-29,105|-30,106', '-35,114|-36,114', '-35,114|-36,115', '-35,115|-36,115'])
      assert.equal(map.rivers[k], 'small', k);
  }
  // Registered and built on outland's own profile, so no neighbour's hex blend - and none of their ground - moved.
  for (const k of ['base', 'amp', 'wave']) assert.equal(REGION_TERRAIN[SOUTH_IBENAL][k], REGION_TERRAIN.outland[k], k);
  assert.deepEqual(tally(IBENAL_EDGES.filter(e => e.country === SOUTH_IBENAL)), { 'North Ibenal': 8, 'West Ibenwood': 18, Alezhor: 3, sea: 25 });
  assert.equal(regionBuildStatus(SOUTH_IBENAL).state, 'environment');
  for (const e of IBENAL_EDGES) {
    const [x, z] = [(e.a.x + e.b.x) / 2, (e.a.z + e.b.z) / 2];
    assert.equal(owner(x - e.nx, z - e.nz), e.country);
  }
});

test('the ground is written on the Ibenals’ own land only, and at sea only where the streams’ mouths cut the shore down', () => {
  let lowered = 0;
  const box = { minX: IBENAL_BOX.minX - 40, maxX: IBENAL_BOX.maxX + 40, minZ: IBENAL_BOX.minZ - 40, maxZ: IBENAL_BOX.maxZ + 40 };
  for (const [x, z] of lattice(9, box)) {
    const writer = ibenalWriter(x, z), d = landDistance(x, z);
    if (!writer) {
      assert.equal(southIbenalGround(x, z, 17.25, beforeSouth), 17.25, `${x},${z}`);
      assert.equal(N.northIbenalGround(x, z, 17.25, beforeNorth), 17.25, `${x},${z}`);
      assert.equal(southIbenalTint(x, z, '#8f9c63'), null);
      // Nobody else's ground moved - but Alezhor's along its line with South Ibenal, whose seam meets this country there.
      if (!(owner(x, z) === 'Alezhor' && nearAlezhorLine(x, z, 46))) {
        const g = ground(x, z);
        assert.equal(g, beforeSouth(x, z), `the ground moved at ${x},${z}`);
        assert.equal(g, beforeNorth(x, z), `the ground moved at ${x},${z}`);
      }
      continue;
    }
    if (d > 0) continue;
    // At sea: the shared shore, but for the mouths, which only ever cut it down.
    const g = ground(x, z), b = writer === SOUTH_IBENAL ? beforeSouth(x, z) : beforeNorth(x, z);
    assert.ok(g <= b, `the sea floor was raised at ${x},${z}`);
    if (g < b) { lowered++; assert.ok((ibenalRiverAt(x, z, 30)?.distance ?? 99) < 10, `the shore was cut away from a mouth at ${x},${z}`); }
  }
  assert.ok(lowered >= 1 && lowered < 60, `${lowered} sea points cut by the mouths`);
  // And every stream's mouth is cut through the beach under the waterline, from the mouth out to the end of its reach.
  for (const s of STREAMS) for (const p of s.samples) if (p.estuary) assert.ok(H(p.x, p.z) < SEA_LEVEL - .2, `${s.id}'s mouth is closed at ${p.along.toFixed(1)} m`);
});

test('every border joins: half-metre samples along every outer land edge, and the far side never moves', () => {
  const worst = {};
  let samples = 0, held = 0;
  for (const e of IBENAL_LINES) for (let s = .1; s <= e.length - .1; s += .5) {
    const [x, z] = along(e, s);
    if (landDistance(x, z) < 1.5) continue;
    const ox = x + e.nx * .05, oz = z + e.nz * .05, ix = x - e.nx * .05, iz = z - e.nz * .05;
    const step = Math.abs(ground(ox, oz) - ground(ix, iz));
    samples++;
    // Under West Ibenwood's stream the ground is exactly as handed on both sides, so the step there is the base's own;
    // and within its channel's own reach the world's ground is the forest's channel, cut over both sides alike.
    if (forestStreamDistance(ix, iz) < IBENWOOD_STREAM_KEEP.inner) {
      held++;
      const before = e.country === SOUTH_IBENAL ? beforeSouth : beforeNorth;
      assert.equal(ground(ix, iz), before(ix, iz)); assert.equal(ground(ox, oz), before(ox, oz));
      continue;
    }
    if (forestStreamDistance(ix, iz) < 2.4) {
      assert.ok(Math.abs(H(ox, oz) - H(ix, iz)) < .05, `the forest's channel steps at ${x.toFixed(1)},${z.toFixed(1)}`);
      continue;
    }
    const key = `${e.country}|${e.far}${Math.min(s, e.length - s) < 2 ? ' corner' : ''}`;
    if (step > (worst[key]?.step ?? -1)) worst[key] = { step, at: `${x.toFixed(1)},${z.toFixed(1)}` };
    // The far side never moves - but Alezhor's, which meets this country at its own line.
    const fx = x + e.nx * .3, fz = z + e.nz * .3;
    if (e.far !== 'Alezhor' && !ibenalWriter(fx, fz)) {
      assert.equal(ground(fx, fz), beforeSouth(fx, fz), `${e.far} moved at ${fx.toFixed(1)},${fz.toFixed(1)}`);
      assert.equal(ground(fx, fz), beforeNorth(fx, fz), `${e.far} moved at ${fx.toFixed(1)},${fz.toFixed(1)}`);
    }
  }
  assert.ok(samples > 4800 && held > 20, `${samples} samples, ${held} under the forest's stream`);
  for (const [key, { step, at }] of Object.entries(worst)) assert.ok(step < .05, `${key}: worst step ${step.toFixed(3)} m at ${at}`);
  assert.deepEqual(Object.keys(worst).map(k => k.replace(' corner', '')).filter((k, i, all) => all.indexOf(k) === i).sort(),
    ['North Ibenal|North Ibenwood', 'North Ibenal|South Oremindi Mountains', 'North Ibenal|West Ibenwood', 'South Ibenal|Alezhor', 'South Ibenal|West Ibenwood']);
  // And no line at all between the two Ibenals: one plain on both sides of their eight shared edges.
  let shared = 0;
  for (const e of IBENAL_EDGES.filter(l => l.country === SOUTH_IBENAL && l.far === 'North Ibenal')) for (let s = .1; s <= e.length - .1; s += .5) {
    const [x, z] = along(e, s), river = ibenalRiverAt(x, z, 12);
    // (Not in the border stream's own channel and banks, which cross the line as it wanders: they are slopes, not steps.)
    if (landDistance(x, z) < 1.5 || (river && river.distance < river.half + 4)) continue;
    shared++;
    assert.ok(Math.abs(ground(x + e.nx * .05, z + e.nz * .05) - ground(x - e.nx * .05, z - e.nz * .05)) < .03, `a step on the shared line at ${x.toFixed(1)},${z.toFixed(1)}`);
  }
  assert.ok(shared > 300, `${shared} samples on the shared line`);
});

test('West Ibenwood’s stream and Alezhor’s west stream are exactly where they were, and Alezhor meets this country at its line', () => {
  // The forest's two courses, laid over every country's ground, read the same levels as over the ground handed to South Ibenal.
  const without = createIbenwoodRiverSystem({ groundHeight: beforeSouth });
  for (const id of ['ibenwood-central-south-river', 'ibenwood-west-stream']) {
    const a = forest.profiles.find(p => p.course.id === id).samples, b = without.profiles.find(p => p.course.id === id).samples;
    assert.equal(a.length, b.length);
    for (let i = 0; i < a.length; i++) assert.equal(a[i].surface, b[i].surface, `${id} sample ${i}`);
  }
  // Alezhor's west stream: its stations fall exactly as Alezhor lays them (`westStream`) whether its ceilings read this
  // country's ground at the line or the ground this country was handed - so not one of them moved.
  const end = A.ibenwoodEnds().west, spec = A.WEST_STREAM_SPEC, west = A.westStream();
  const lines = A.ALEZHOR_LINES.filter(e => e.far === SOUTH_IBENAL);
  let withCountry = end.surface, handed = end.surface, compared = 0;
  for (let i = 1; i < west.samples.length && !west.samples[i].estuary; i++) {
    const p = west.samples[i], q = west.samples[i - 1];
    let best = null;
    for (const e of lines) { const t = segment(p.x, p.z, e.a, e.b); if (!best || t.distance < best.distance) best = { ...t, e }; }
    const lx = best.e.a.x + (best.e.b.x - best.e.a.x) * best.t + best.e.nx * .05, lz = best.e.a.z + (best.e.b.z - best.e.a.z) * best.t + best.e.nz * .05;
    const d = landDistance(p.x, p.z);
    const level = Math.min(A.alezhorDesign(p.x, p.z, d, groundBeforeAlezhor), groundBeforeAlezhor(p.x, p.z));
    const fall = spec.fall * (p.along - q.along);
    withCountry = Math.max(SEA_LEVEL + .05, Math.min(Math.min(ground(lx, lz), level) - spec.clear, withCountry - fall));
    handed = Math.max(SEA_LEVEL + .05, Math.min(Math.min(beforeSouth(lx, lz), level) - spec.clear, handed - fall));
    assert.equal(withCountry, handed, `Alezhor's west stream would move at ${p.along.toFixed(0)} m`);
    compared++;
  }
  assert.ok(compared > 150, `${compared} stations`);
  // South Ibenal holds its three Alezhor edges exactly as handed, so Alezhor's seam, which reads them five centimetres
  // in from its line, meets what it always met: every point within fifteen centimetres of the line on this side is the
  // ground this country was handed.
  let held = 0;
  for (const e of ALEZHOR_LINES) for (let s = 0; s <= e.length; s += .5) for (const off of [.02, .05, .1, .14]) {
    const [x, z] = along(e, s), px = x - e.nx * off, pz = z - e.nz * off;
    if (ibenalWriter(px, pz) !== SOUTH_IBENAL) continue;
    assert.equal(ground(px, pz), beforeSouth(px, pz), `the line moved at ${px.toFixed(1)},${pz.toFixed(1)}`);
    held++;
  }
  assert.ok(held > 1200, `${held} points of the line held`);
  // Both directions at half a metre: Alezhor's ground meets this country's at every point of their three edges.
  for (const e of ALEZHOR_LINES) for (let s = .1; s <= e.length - .1; s += .5) {
    const [x, z] = along(e, s);
    if (landDistance(x, z) < 1.5) continue;
    assert.ok(Math.abs(ground(x + e.nx * .05, z + e.nz * .05) - ground(x - e.nx * .05, z - e.nz * .05)) < .05, `Alezhor and South Ibenal part at ${x.toFixed(1)},${z.toFixed(1)}`);
  }
  // And this side comes down from the line into its own plain without a wall: nowhere steeper than one in two (the handed
  // ground itself falls that steeply along the line toward the coast).
  for (const e of ALEZHOR_LINES) for (let s = 2; s <= e.length - 2; s += 3) for (let off = 2; off <= 30; off += 2) {
    const [x, z] = along(e, s), px = x - e.nx * off, pz = z - e.nz * off;
    if (ibenalWriter(px, pz) !== SOUTH_IBENAL || landDistance(px, pz) < 6) continue;
    assert.ok(face(px, pz, 1) < .5, `a wall below Alezhor's line at ${px.toFixed(1)},${pz.toFixed(1)}: ${face(px, pz, 1).toFixed(2)}`);
  }
});

test('the five streams: out of the forest at the tree line, down the atlas’s edges to a bay, never buried, with real banks and one ford each', () => {
  assert.deepEqual(STREAMS.map(s => s.id), IBENAL_STREAM_SPECS.map(s => s.id));
  assert.equal(STREAMS.length, 5);
  const highLines = IBENAL_LINES.filter(l => l.kind === 'forest' || l.kind === 'mountain');
  // The atlas's river edges these streams carry, each one's midpoint within a few metres of its stream's line.
  const atlas = { 'south-ibenal-south-stream': [[-34, 111, -35, 111], [-34, 110, -35, 111], [-34, 111, -35, 112]],
    'south-ibenal-middle-stream': [[-32, 109, -33, 109], [-32, 108, -33, 109]],
    'south-ibenal-north-stream': [[-30, 107, -31, 107], [-30, 106, -31, 107], [-30, 107, -31, 108]],
    'ibenal-border-stream': [[-29, 105, -29, 106], [-29, 105, -30, 106]],
    'north-ibenal-last-stream': [[-24, 101, -25, 102], [-24, 102, -25, 102], [-24, 102, -25, 103], [-24, 103, -25, 103], [-24, 103, -25, 104], [-24, 104, -25, 104]] };
  for (const s of STREAMS) {
    const first = s.samples[0];
    assert.ok(lineDistance(first.x, first.z, highLines) < 14, `${s.id} does not come out of the trees`);
    for (const [q1, r1, q2, r2] of atlas[s.id]) {
      const a = hexCentre(q1, r1), b = hexCentre(q2, r2), mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
      const near = Math.min(...s.samples.map(p => Math.hypot(p.x - mx, p.z - mz)));
      assert.ok(near < 7, `${s.id} strays ${near.toFixed(1)} m from the atlas's edge (${q1},${r1})|(${q2},${r2})`);
    }
    for (let i = 1; i < s.samples.length; i++) assert.ok(s.samples[i].surface <= s.samples[i - 1].surface + 1e-9, `${s.id} climbs at ${s.samples[i].along.toFixed(1)} m`);
    const mouth = s.samples.find(p => p.estuary);
    assert.ok(mouth && landDistance(mouth.x, mouth.z) < 3 && landDistance(s.samples.at(-1).x, s.samples.at(-1).z) < -10, `${s.id} does not reach the sea`);
    assert.equal(s.fords.length, 1, `${s.id} has ${s.fords.length} fords`);
    for (const p of s.samples) {
      if (p.estuary || p.along < 1) continue;
      for (const k of [0, .85, -.85]) assert.ok(H(p.x + p.nx * p.half * k, p.z + p.nz * p.half * k) < p.surface - .03, `${s.id}: buried water at ${p.along.toFixed(1)} m`);
      if (p.along < 4) continue;
      for (const k of [1, -1]) {
        const x = p.x + p.nx * (p.half + 1.4) * k, z = p.z + p.nz * (p.half + 1.4) * k;
        if (landDistance(x, z) < 2) continue;
        assert.ok(H(x, z) > p.surface - .02, `${s.id}: the bank is under the water at ${p.along.toFixed(1)} m (${k})`);
      }
    }
    // Swum where it runs, waded at its ford: water colliders over the rest, none over the riffle, whose bed is shallow and dry ground.
    const ford = s.fords[0];
    for (const p of s.samples) {
      if (p.estuary || p.along < 5) continue;
      if (Math.abs(p.along - ford) < IBENAL_FORD.half - 1) {
        assert.equal(worldWater(p.x, p.z), WATERLINE, `${s.id}: a water collider over the ford at ${p.along.toFixed(1)} m`);
        assert.ok(H(p.x, p.z) > WATERLINE + .4 && p.surface - H(p.x, p.z) < .4, `${s.id}: the ford is not a ford at ${p.along.toFixed(1)} m`);
      } else if (Math.abs(p.along - ford) > IBENAL_FORD.half + IBENAL_FORD.ease + 2) assert.ok(worldWater(p.x, p.z) >= p.surface - .3, `${s.id} is not water to a traveler at ${p.along.toFixed(1)} m`);
    }
  }
});

test('the river-mouth flats are kept level, open and dry: one beside every mouth, and one at the Narrows’ end', () => {
  assert.equal(IBENAL_KEPT.length, 6);
  for (const k of IBENAL_KEPT) {
    let lo = Infinity, hi = -Infinity, n = 0;
    for (let x = k.x - k.halfX + 5; x <= k.x + k.halfX - 5; x += 3) for (let z = k.z - k.halfZ + 5; z <= k.z + k.halfZ - 5; z += 3) {
      if (!keptAt(x, z) || landDistance(x, z) < 16) continue;
      const plane = k.level + k.rise * ((x - k.x) * k.inland.x + (z - k.z) * k.inland.z), off = H(x, z) - plane;
      lo = Math.min(lo, off); hi = Math.max(hi, off); n++;
      assert.ok(H(x, z) > WATERLINE + 1.5, `${k.id} is wet at ${x},${z}`);
      assert.equal(ibenalWaterAt(x, z), null);
    }
    assert.ok(n > 15 && hi - lo < .15, `${k.id} varies ${(hi - lo).toFixed(3)} m over ${n} samples`);
    assert.ok(IBENAL_RESERVED.some(r => r.id === k.id && Math.abs(r.x - k.x) < 1e-9), `${k.id} is not reserved`);
    assert.equal(ibenalWriter(k.x, k.z), k.country, `${k.id} is not on ${k.country}'s ground`);
  }
  // Every mouth has its flat within fifty metres.
  for (const s of STREAMS) {
    const mouth = s.samples.find(p => p.estuary);
    assert.ok(IBENAL_KEPT.some(k => Math.hypot(k.x - mouth.x, k.z - mouth.z) < 55), `${s.id} has no flat beside its mouth`);
  }
  assert.ok(S.SOUTH_IBENAL_RESERVED.length === 3 && N.NORTH_IBENAL_RESERVED.length === 3);
});

test('the coast: strand in the bays, low rock at the points, dunes in the warm south-west, rockier in the north; the waterline where it was', () => {
  let rockSouth = 0, shoreSouth = 0, rockNorth = 0, shoreNorth = 0;
  for (const [x, z] of lattice(2)) {
    const d = landDistance(x, z);
    if (d < 1.5 || d > 2.5) continue;
    const w = ibenalWriter(x, z);
    if (!w || lineDistance(x, z) < 25) continue;
    const rock = cliffShare(x, z) > .9;
    if (w === SOUTH_IBENAL) { shoreSouth++; if (rock) rockSouth++; } else { shoreNorth++; if (rock) rockNorth++; }
  }
  // Less cliff-faced than Legemum's, but not docile; and the north more exposed and rockier than the south.
  assert.ok(rockSouth / shoreSouth > .04 && rockSouth / shoreSouth < .25, `${(rockSouth / shoreSouth * 100).toFixed(0)}% of South Ibenal's shore is rock`);
  assert.ok(rockNorth / shoreNorth > rockSouth / shoreSouth + .08, `${(rockNorth / shoreNorth * 100).toFixed(0)}% of North Ibenal's shore is rock`);
  // Every stream reaches the sea at a bay, and a bay is strand.
  for (const c of S.IBENAL_COAST_CORNERS.filter(c => c.kind === 'bay')) assert.ok(cliffShare(c.x, c.z) < .05, `rock in the bay at ${c.x.toFixed(0)},${c.z.toFixed(0)}`);
  for (const m of S.IBENAL_MOUTHS) assert.ok(S.IBENAL_COAST_CORNERS.some(c => c.kind === 'bay' && Math.hypot(c.x - m.x, c.z - m.z) < 1), `the mouth at ${m.x},${m.z} is not at a bay`);
  // The dunes stand in the south-west and nowhere near Alezhor's line.
  assert.ok(duneLift(-4733, 770) > 1, 'no dunes');
  for (const [x, z] of lattice(5)) if (duneLift(x, z) > 0) assert.ok(z > 530 && !nearAlezhorLine(x, z, 30), `a dune at ${x},${z}`);
  // Inland of the shore every metre of the Ibenals' ground stands clear of the sea, but for their streams' water.
  for (const [x, z] of lattice(6)) {
    if (landDistance(x, z) <= 10 || !ibenalWriter(x, z) || (ibenalRiverAt(x, z, 30)?.distance ?? 99) < 25) continue;
    assert.ok(H(x, z) > WATERLINE + .5, `low ground at ${x},${z}: ${H(x, z).toFixed(2)}`);
  }
});

test('no steps: the plain is continuous everywhere but the base’s own steps under West Ibenwood’s stream', () => {
  const corners = IBENAL_EDGES.flatMap(e => [e.a, e.b]), box = IBENAL_BOX, steps = [];
  const look = (x0, z0, dx, dz, n) => {
    let prev = ground(x0, z0);
    for (let i = 1; i <= n; i++) {
      const x = x0 + dx * i, z = z0 + dz * i, h = ground(x, z);
      if (Math.abs(h - prev) > .08) {
        let ax = x - dx, az = z - dz, bx = x, bz = z, ha = prev, hb = h;
        for (let k = 0; k < 7; k++) { const mx = (ax + bx) / 2, mz = (az + bz) / 2, hm = ground(mx, mz); if (Math.abs(hm - ha) > Math.abs(hb - hm)) { bx = mx; bz = mz; hb = hm; } else { ax = mx; az = mz; ha = hm; } }
        const own = ibenalWriter(ax, az), corner = corners.some(c => Math.hypot(ax - c.x, az - c.z) < 2);
        // Named: where the scan crosses the tree line on West Ibenwood's stream, whose ground is held as handed on this
        // side (the base's own step), and which the forest's own channel cuts away in the world's ground.
        const excused = forestStreamDistance(ax, az) < 2.4 && Math.abs(H(ax + dx * 2, az + dz * 2) - H(ax - dx * 2, az - dz * 2)) < 1.2;
        if (Math.abs(hb - ha) > .03 && own && !corner && !excused) steps.push(`${ax.toFixed(2)},${az.toFixed(2)}: ${Math.abs(hb - ha).toFixed(3)} m`);
      }
      prev = h;
    }
  };
  for (let z = box.minZ + 20; z <= box.maxZ - 20; z += 20) look(box.minX + 20, z, .1, 0, Math.round((box.maxX - box.minX - 40) / .1));
  for (let x = box.minX + 20; x <= box.maxX - 20; x += 40) look(x, box.minZ + 20, 0, .1, Math.round((box.maxZ - box.minZ - 40) / .1));
  assert.deepEqual(steps, []);
});

test('the plain rises to the high ground at its lines, swells gently, and its streams run in vales', () => {
  // Every forest edge: the ground at the line stands over the plain eighty metres in, where the plain is open. (The
  // Oremindi's own ground at its line is met as it stands, and along two of its edges it lies lower than the plain, so
  // the plain comes down to the mountains' foot there in a shallow swale before they rise.)
  let rises = 0;
  const highLines = IBENAL_LINES.filter(l => l.kind === 'forest' || l.kind === 'mountain');
  for (const e of IBENAL_LINES.filter(l => l.kind === 'forest')) {
    const [x, z] = along(e, e.length / 2), deep = [x - e.nx * 80, z - e.nz * 80];
    // (Not where the foothill stands between the plain and the Oremindi's line: it is higher than the line by design.)
    if (!ibenalWriter(...deep) || landDistance(...deep) < 40 || ibenalRiverAt(...deep, 40) || forestStreamDistance(x, z) < 30 || lineDistance(...deep, highLines) < 60
      || Math.hypot(deep[0] - S.IBENAL_FOOTHILL.x, deep[1] - S.IBENAL_FOOTHILL.z) < 110) continue;
    assert.ok(ground(x - e.nx * .3, z - e.nz * .3) > ground(...deep) + 1, `no rise to the ${e.far} behind ${x.toFixed(0)},${z.toFixed(0)}`);
    rises++;
  }
  assert.ok(rises >= 10, `${rises} edges checked`);
  // The mountains rise over the plain beyond every one of their edges.
  for (const e of IBENAL_LINES.filter(l => l.kind === 'mountain')) {
    const [x, z] = along(e, e.edge ? e.length / 2 : 0);
    if (landDistance(x, z) < 10) continue;
    assert.ok(ground(x + e.nx * 60, z + e.nz * 60) > ground(x - e.nx * 60, z - e.nz * 60) + 10, `the Oremindi do not rise beyond ${x.toFixed(0)},${z.toFixed(0)}`);
  }
  const line = IBENAL_LINES.find(l => l.far === 'West Ibenwood' && l.country === SOUTH_IBENAL), [lx, lz] = along(line, line.length / 2);
  assert.ok(treeLineDistance(lx - line.nx, lz - line.nz) < 1.5 && ibenalCover(lx - line.nx, lz - line.nz).edge > .9, 'the tree line is where the forest begins');
  // The open plain is gentle: nowhere steeper than one in four away from the streams, the shore and the lines.
  let steepest = 0;
  for (const [x, z] of lattice(11)) {
    if (!ibenalWriter(x, z) || landDistance(x, z) < 40 || lineDistance(x, z) < 50 || (ibenalRiverAt(x, z, 40)?.distance ?? 99) < 35) continue;
    if (Math.hypot(x - S.IBENAL_FOOTHILL.x, z - S.IBENAL_FOOTHILL.z) < 110) continue;
    steepest = Math.max(steepest, face(x, z, 1));
  }
  assert.ok(steepest < .25, `the open plain is ${steepest.toFixed(2)} at its steepest`);
  // The vales: every stream runs below the plain beside it, its vale's side rising over it.
  for (const s of STREAMS) {
    const mid = s.samples[Math.floor(s.samples.length * .55)];
    const side = Math.max(H(mid.x + mid.nx * 26, mid.z + mid.nz * 26), H(mid.x - mid.nx * 26, mid.z - mid.nz * 26));
    assert.ok(side > mid.surface + .9, `${s.id} runs in no vale`);
  }
});

test('the colour: grass by place and lie, the foot, the vales, banks, gravel, dunes and rock, faded into the swatch at every outer line; stone on the points', () => {
  assert.ok(GROUND_TINT_FAMILIES.includes('south-ibenal') && SHORE_TINT_FAMILIES.includes('south-ibenal'));
  const colours = new Set();
  for (const [x, z] of lattice(13)) {
    const c = southIbenalTint(x, z, '#8f9c63');
    if (ibenalWriter(x, z) !== SOUTH_IBENAL) { assert.equal(c, null); continue; }
    assert.ok(Number.isInteger(c) && c >= 0 && c <= 0xffffff);
    colours.add(c >> 3);
  }
  assert.ok(colours.size > 60, `${colours.size} colours`);
  // At an outer line the colour is the swatch it was given.
  const e = IBENAL_LINES.find(l => l.far === 'West Ibenwood' && l.country === SOUTH_IBENAL), [x, z] = along(e, e.length / 2);
  assert.equal(southIbenalTint(x - e.nx * .01, z - e.nz * .01, '#a4a363') >> 2, 0xa4a363 >> 2);
  // The cover the scenery reads.
  const vale = STREAMS[1].samples[90];
  assert.ok(ibenalCover(vale.x + vale.nx * (vale.half + 4), vale.z + vale.nz * (vale.half + 4)).vale > .9, 'the vale is not a vale');
  assert.ok(ibenalCover(vale.x + vale.nx * (vale.half + .6), vale.z + vale.nz * (vale.half + .6)).bank > .5, 'the bank is not a bank');
  const ford = STREAMS[0].samples.find(p => p.along >= STREAMS[0].fords[0]);
  assert.ok(ibenalCover(ford.x + ford.nx * (ford.half + .5), ford.z + ford.nz * (ford.half + .5)).gravel > .5, 'the ford is not gravel');
  assert.ok(ibenalCover(-4733, 770).dune > .5, 'no dunes');
  assert.ok(ibenalCover(-4612, 377).kept > .99, 'the flat is not kept');
  assert.ok(ibenalCover(-4410, 440).foot > .5, 'no foot at the tree line');
  // Stone on the points' faces, none in the bays; and the tint reaches the screen.
  let stone = 0;
  for (const [px, pz] of lattice(2)) { const d = landDistance(px, pz); if (d < 0 || d > 3) continue; if (southIbenalShoreTint(px, pz, d)?.rock > .9) stone++; }
  assert.ok(stone > 40, `${stone} samples of stone on South Ibenal's shore`);
  const painted = new THREE.Color(), swatch = new THREE.Color();
  groundTint(painted, -4733, 770, THREE);
  let r = 0, g = 0, b = 0, total = 0;
  for (const [name, weight] of Object.entries(terrainMix(-4733, 770).grounds)) { if (!weight) continue; swatch.set(name); r += swatch.r * weight; g += swatch.g * weight; b += swatch.b * weight; total += weight; }
  assert.ok(Math.hypot(painted.r - r / total, painted.g - g / total, painted.b - b / total) > .02, 'the dunes are drawn as the bare swatch');
  assert.ok(Object.values(IBENAL_GROUND).every(c => Number.isInteger(c)));
});

test('the water for the scenery and the chart: ribbons where the water is, colliders no higher than it, outlines for the map', () => {
  const ribbons = ibenalWaterRibbons();
  assert.deepEqual(ribbons.map(r => r.id), STREAMS.map(s => s.id));
  for (const r of ribbons) {
    assert.equal(r.positions.length % 6, 0);
    assert.ok(r.indices.length >= (r.positions.length / 6 - 1) * 6 - 6 && Math.max(...r.indices) < r.positions.length / 3);
    assert.ok([SOUTH_IBENAL, 'North Ibenal'].includes(r.country));
  }
  // Each country's scenery draws its own: four ribbons in South Ibenal's list (the border stream with them), one in North's.
  assert.equal(S.southIbenalWaterRibbons().length + N.northIbenalWaterRibbons().length, 5);
  for (const c of COLLIDERS) {
    assert.equal(c.kind, 'river-water');
    const at = ibenalRiverAt(c.x, c.z, 4);
    assert.ok(at && c.surface <= at.surface + 1e-9, `a collider over its water at ${c.x.toFixed(1)},${c.z.toFixed(1)}`);
  }
  assert.equal(S.southIbenalWaterColliders().length + N.northIbenalWaterColliders().length, COLLIDERS.length);
  assert.equal(ibenalMapWaters().length, 5);
  assert.ok(ibenalMapWaters().every(w => w.kind === 'polygon' && w.points.length > 20));
  const index = ibenalRiverIndex(), p = STREAMS[2].samples[100];
  assert.equal(index.courses.length, 5);
  assert.equal(index.nearest(p.x + 3, p.z, 48).course, STREAMS[2].id);
});

test('landmarks, trails, views and arrival: natural places on dry ground, walker’s views at a walker’s eye, and nothing anybody owns', () => {
  for (const p of [SOUTH_IBENAL_ARRIVAL, ...SOUTH_IBENAL_LANDMARKS]) {
    assert.ok(southIbenalOwns(p.x, p.z), p.id ?? 'arrival');
    assert.ok(landDistance(p.x, p.z) > 0 && H(p.x, p.z) > WATERLINE + .5, `${p.id ?? 'arrival'} is wet`);
    assert.equal(ibenalWaterAt(p.x, p.z), null, p.id ?? 'arrival');
    assert.ok(face(p.x, p.z) < .6, `${p.id ?? 'arrival'} stands on a slope`);
  }
  for (const p of SOUTH_IBENAL_LANDMARKS) {
    assert.equal(p.region, REGION_IDS[SOUTH_IBENAL]);
    assert.match(p.id, /^south-ibenal-/);
    assert.ok(p.description.length > 60, `${p.id} has discovery text`);
    assert.doesNotMatch(`${p.name} ${p.description}`, /\bcity|cities|town|village|harbou?r|anchorage|quay|port\b|mine|mining|working|farm|road|temple|shrine|house/i, p.id);
  }
  for (const a of SOUTH_IBENAL_LANDMARKS) for (const b of SOUTH_IBENAL_LANDMARKS) if (a !== b)
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > Math.max(28, a.radius ?? 40, b.radius ?? 40), `${a.id} and ${b.id}`);
  for (const trail of IBENAL_TRAILS) {
    let prev = null;
    for (const [x, z] of walkLine(trail.points, .5)) {
      assert.ok(ibenalWriter(x, z), `${trail.id} leaves the Ibenals at ${x},${z}`);
      // Dry by the world's own rule: the ground over every water the world knows there. The fords are waded.
      assert.ok(H(x, z) >= worldWater(x, z), `${trail.id} is wet at ${x.toFixed(1)},${z.toFixed(1)}`);
      if (prev) assert.ok(Math.abs(H(x, z) - prev[2]) / .5 < .9, `${trail.id} climbs ${((H(x, z) - prev[2]) / .5).toFixed(2)} at ${x.toFixed(1)},${z.toFixed(1)}`);
      prev = [x, z, H(x, z)];
    }
  }
  for (const trail of SOUTH_IBENAL_TRAILS) assert.match(trail.id, /^south-ibenal-/);
  // The corridor's two halves meet at the border stream's ford, end to start.
  const south = SOUTH_IBENAL_TRAILS[0].points.at(-1), north = N.NORTH_IBENAL_TRAILS[0].points[0];
  assert.ok(Math.hypot(south.x - north.x, south.z - north.z) < 1e-9, 'the corridor is broken at the line');
  const ids = Object.keys(SOUTH_IBENAL_VIEWS);
  assert.ok(ids.includes('south-ibenal') && ids.includes('south-ibenal-wildlife'));
  let walks = 0;
  for (const [id, v] of Object.entries(SOUTH_IBENAL_VIEWS)) {
    assert.match(id, /^south-ibenal/);
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
  return { scene, world: await scopedWorld(scene, [REGION_IDS[SOUTH_IBENAL], REGION_IDS['North Ibenal'], REGION_IDS['West Ibenwood'],
    REGION_IDS['North Ibenwood'], REGION_IDS['South Oremindi Mountains'], REGION_IDS.Alezhor]) };
})();

test('built: the world stands a traveler on this ground, knows its streams, wades its fords, and its ways can be walked', async () => {
  const { world } = await built();
  for (const p of [SOUTH_IBENAL_ARRIVAL, ...SOUTH_IBENAL_LANDMARKS, N.NORTH_IBENAL_ARRIVAL, ...N.NORTH_IBENAL_LANDMARKS]) {
    assert.ok(Math.abs(world.heightAt(p.x, p.z) - H(p.x, p.z)) < 1e-6, `${p.id ?? 'arrival'}: the world's ground is not this ground`);
    assert.ok(canStand(p.x, p.z, world, .4), `${p.id ?? 'arrival'} has no clear footing`);
  }
  assert.equal(world.regionAt(SOUTH_IBENAL_ARRIVAL.x, SOUTH_IBENAL_ARRIVAL.z).name, SOUTH_IBENAL);
  // Every stream is water to the world where it runs, and wadeable at its ford.
  for (const s of STREAMS) {
    const pool = s.samples.find(p => !p.estuary && Math.abs(p.along - s.fords[0]) > 30 && p.along > 40);
    assert.ok(world.waterAt(pool.x, pool.z) > world.heightAt(pool.x, pool.z), `${s.id} is not water to the world`);
    const ford = s.samples.find(p => p.along >= s.fords[0]);
    assert.ok(canStand(ford.x, ford.z, world, .4), `${s.id}'s ford cannot be waded`);
  }
  // Every way, both ways, by the traveler's own movement.
  for (const trail of IBENAL_TRAILS) for (const points of [trail.points, [...trail.points].reverse()]) {
    const at = { ...points[0], y: world.heightAt(points[0].x, points[0].z) };
    for (const target of points.slice(1)) {
      const steps = Math.ceil(Math.hypot(target.x - at.x, target.z - at.z) / .3), dx = (target.x - at.x) / steps, dz = (target.z - at.z) / steps;
      for (let s = 0; s < steps; s++) { moveCharacter(at, dx, dz, world, .34); at.y = world.heightAt(at.x, at.z); }
      assert.ok(Math.hypot(at.x - target.x, at.z - target.z) < .15, `${trail.id} is blocked short of ${target.x}, ${target.z} at ${at.x.toFixed(1)}, ${at.z.toFixed(1)}`);
    }
  }
});
