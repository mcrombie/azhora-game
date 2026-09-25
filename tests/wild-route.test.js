import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { BODY } from '../src/bodies.js';
import { ANCHORS } from '../src/regions.js';
import {
  ARRIVALS, MERCENARY_ROSTER, MUS_ARRIVAL, drawMusArrival, createMercenaryCompany, mercenaryById, roadLengths,
} from '../src/mercenaries.js';
import { WILD, MUS_ROUTE, MUS_BEACH, routeMetres, wildJourney } from '../src/wild-route.js';

/**
 * The user's ruling, 2026-09-20: Mus keeps his whole draw - he may well be ashore before the
 * traveler - but his wild route is long, and he cannot beat the road. These are the laws that
 * say so, measured against the built world rather than against the design's drawing.
 */
const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());
const road = world.paths[0], camp = ANCHORS.legionCamp, P = BODY.person;

/** The design's own figure for a traveler who walks straight to the muster: about minute 27. */
const DIRECT_TRAVELER = 27 * 60;
/** How much later than him Mus must be, at his very earliest draw. */
const MARGIN = 3 * 60;

const stops = [{ id: 'induction', point: world.npcPositions['meadow-courier'], dwell: 90 },
  { id: 'crossing', point: world.npcPositions['crossing-keeper'], dwell: 60 },
  { id: 'relay', point: world.npcPositions['relay-clerk'], dwell: 120 }].filter(stop => stop.point);
const companyFor = (seed, wild = true) => createMercenaryCompany({ road, stops, muster: camp, landing: world.spawn, seed, wild });

/** Shortest distance from a point to the main road. */
function toRoad(x, z) {
  let best = Infinity;
  for (let i = 0; i < road.length - 1; i++) {
    const a = road[i], b = road[i + 1];
    const dx = b.x - a.x, dz = b.z - a.z, len2 = dx * dx + dz * dz;
    let t = len2 ? ((x - a.x) * dx + (z - a.z) * dz) / len2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    best = Math.min(best, Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t)));
  }
  return best;
}

/** When a given seed's Mus reaches the muster, to the second. */
function mustersAt(seed) {
  const company = companyFor(seed);
  let low = -60, high = 30000;
  for (let i = 0; i < 44; i++) {
    const mid = (low + high) / 2;
    if (company.placements(mid).find(p => p.id === 'merc-mus').phase === 'mustered') high = mid; else low = mid;
  }
  return high;
}

test('his route is longer than the road, and he walks it slower', () => {
  const journey = wildJourney(camp);
  const roadToCamp = roadLengths(road).find((_, i) => i === road.length - 1) !== undefined
    ? (() => { const lengths = roadLengths(road); let at = 0;
        for (let i = 0; i < road.length - 1; i++) { if (Math.hypot(road[i].x - camp.x, road[i].z - camp.z) < 1) break; at = lengths[i + 1]; }
        return at; })()
    : 0;
  assert.ok(journey.metres > 1650 && journey.metres < 1800, `${journey.metres.toFixed(0)} m of wild country with the muster leg`);
  assert.ok(routeMetres(MUS_ROUTE) > 1550 && routeMetres(MUS_ROUTE) < 1650,
    `${routeMetres(MUS_ROUTE).toFixed(0)} m of it is the line this module authors`);
  assert.ok(journey.metres > roadToCamp, `the wilderness (${journey.metres.toFixed(0)} m) is longer than the road (${roadToCamp.toFixed(0)} m)`);
  assert.ok(WILD.pace < mercenaryById('merc-mus').pace * .7, `${WILD.pace} m/s through the rough against ${mercenaryById('merc-mus').pace} on a road`);
  assert.ok(Math.abs(journey.seconds - journey.metres / WILD.pace) < 1e-9);
  // The route is a route: it starts on his beach and every leg goes somewhere.
  assert.deepEqual(journey.path[0], MUS_BEACH);
  assert.deepEqual(journey.path[journey.path.length - 1], camp);
  assert.equal(routeMetres(MUS_ROUTE) > 0, true);
  // A leg can be short where the country is tight - the line goes round things rather than
  // through them - but none of them is a duplicate point.
  for (let i = 1; i < MUS_ROUTE.length; i++)
    assert.ok(Math.hypot(MUS_ROUTE[i].x - MUS_ROUTE[i - 1].x, MUS_ROUTE[i].z - MUS_ROUTE[i - 1].z) > 5, `leg ${i} is a real leg`);
});

test('nobody on the road ever sees him pass', () => {
  // The long road's companion remarks on any mercenary who comes within 40 m. Mus must never be
  // the one she remarks on, so the line keeps clear of the road by more than twice that, all the
  // way until it comes down onto the plain - which is the join, and is meant to be near.
  const path = wildJourney(camp).path;
  let closest = Infinity, closestAt = null, joinedAt = null;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], leg = Math.hypot(b.x - a.x, b.z - a.z), steps = Math.max(2, Math.ceil(leg / 2));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      const d = toRoad(x, z), fromCamp = Math.hypot(x - camp.x, z - camp.z);
      if (d < WILD.clearance && joinedAt === null) joinedAt = fromCamp;
      if (fromCamp > 130 && d < closest) { closest = d; closestAt = { x, z }; }
    }
  }
  assert.ok(closest > WILD.clearance + 15,
    `the line comes within ${closest.toFixed(0)} m of the road at (${closestAt.x.toFixed(0)}, ${closestAt.z.toFixed(0)})`);
  assert.ok(joinedAt !== null && joinedAt < 60, `he first comes inside ${WILD.clearance} m of the road ${joinedAt?.toFixed(0)} m from the camp`);
  // The authored line - the part this module owns, before the company appends the muster leg -
  // is measured on its own, because it is the part that must never be walked past anybody.
  let authored = Infinity;
  for (let i = 1; i < MUS_ROUTE.length; i++) {
    const a = MUS_ROUTE[i - 1], b = MUS_ROUTE[i], steps = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z)));
    for (let s = 0; s <= steps; s++) { const t = s / steps; authored = Math.min(authored, toRoad(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)); }
  }
  assert.ok(authored > 60, `the authored line's closest approach is ${authored.toFixed(1)} m`);
  // And he comes onto the plain across country, not in along the road behind the others.
  const last = MUS_ROUTE[MUS_ROUTE.length - 1];
  assert.ok(toRoad(last.x, last.z) > WILD.clearance, 'his last waypoint of his own is still off the road');
  assert.ok(last.z < camp.z, 'he comes down onto the plain from the north-west, not in at the gate');
});

test('every quarter-metre of the authored line is ground a body can stand on, and none of it is wet', () => {
  // The repair this is here for: the first draft ran A* over standable *cells* and then let the
  // simplifier cut corners between them. Neither step checked the line itself, so 29 m of the
  // authored route - legs 1, 2, 4, 5 and 8, the first only a few metres off his own beach - lay
  // through props the A* had carefully gone round. Both checks are inside the loops now: every
  // grid edge, and every shortcut. A quarter-metre interval also catches a tree clipped between
  // the old metre-wide samples as regional scenery changes.
  let blocked = 0, wet = 0, metres = 0;
  const bad = [];
  for (let i = 1; i < MUS_ROUTE.length; i++) {
    const a = MUS_ROUTE[i - 1], b = MUS_ROUTE[i], leg = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.max(2, Math.ceil(leg * 4));
    metres += leg;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      if (!canStand(x, z, world, P)) { blocked++; if (bad.length < 6) bad.push(`leg ${i} at ${x.toFixed(1)}, ${z.toFixed(1)}`); }
      if (world.heightAt(x, z) < .45) wet++;
    }
  }
  assert.ok(metres > 1500, `only ${metres.toFixed(0)} m of line to walk`);
  assert.deepEqual(bad, [], `${blocked} samples of the authored line are not standable`);
  assert.equal(wet, 0, 'and none of it is water: he walks, he does not swim');
});

test('the muster leg is the camp’s own ground, and is allowed to be', () => {
  // The last leg is appended by the company from wherever the muster is, so it is not this
  // module's to author. It ends among the camp's tents, which is what a camp is; the host steers
  // him round them with `stepAround`, exactly as it does every man in the road formation.
  const path = wildJourney(camp).path;
  const a = path[path.length - 2], b = path[path.length - 1];
  let blocked = 0;
  const steps = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z)));
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    if (!canStand(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, world, P)) blocked++;
  }
  assert.ok(blocked < 30, `${blocked} metres of the muster leg are inside the camp's own scenery`);
  assert.ok(Math.hypot(a.x - camp.x, a.z - camp.z) < 130, 'and it is a short leg, not a second route');
});

test('every step of it is ground a body can walk', () => {
  const path = wildJourney(camp).path;
  let samples = 0, blocked = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], leg = Math.hypot(b.x - a.x, b.z - a.z), steps = Math.max(2, Math.ceil(leg / 2));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      samples++;
      if (!canStand(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, world, P)) blocked++;
    }
  }
  assert.ok(samples > 700, `only ${samples} samples along the route`);
  for (const spot of MUS_ROUTE) assert.ok(canStand(spot.x, spot.z, world, P), `the waypoint (${spot.x}, ${spot.z}) is standable`);
  assert.ok(canStand(MUS_BEACH.x, MUS_BEACH.z, world, P), 'and so is the strand he lands on');
  // A straight line between waypoints clips the odd tree, as the company's road formation does.
  // He walks round them: the host steers him with `stepAround`, which will not enter one.
  assert.ok(blocked / samples < .04, `${blocked} of ${samples} samples (${(blocked / samples * 100).toFixed(1)}%) are inside scenery`);
});

test('the law: whatever he draws, a traveler who goes straight there is in first', () => {
  const earliest = mustersAt(0);
  const travel = mercenaryById('merc-mus').departs + wildJourney(camp).seconds;
  // Sweep both ends of the draw by hand, then a few hundred seeds.
  const ends = [];
  for (let seed = 0; seed < 4000 && ends.length < 2; seed++) {
    const drawn = drawMusArrival(seed);
    if (drawn < MUS_ARRIVAL.from + 40) ends.push({ seed, drawn, muster: mustersAt(seed) });
  }
  assert.ok(ends.length, 'the sweep found a seed near the earliest draw there is');
  let worst = Infinity, worstSeed = null, latest = -Infinity;
  for (let seed = 0; seed < 400; seed++) {
    const at = mustersAt(seed);
    assert.ok(Math.abs(at - (drawMusArrival(seed) + travel)) < 1e-6,
      `seed ${seed} keeps its whole arrival draw, beach wait and wilderness journey`);
    if (at < worst) { worst = at; worstSeed = seed; }
    latest = Math.max(latest, at);
  }
  for (const end of ends) worst = Math.min(worst, end.muster);
  assert.ok(worst > DIRECT_TRAVELER + MARGIN,
    `seed ${worstSeed} musters at ${(worst / 60).toFixed(1)} min, and a direct traveler is in at ${DIRECT_TRAVELER / 60}`);
  assert.ok(earliest > 0);
  // The wilderness cost stays slow enough, while both ends follow the company's present
  // arrival window. The living-story timetable shortened that window from the old hour.
  assert.ok(worst / 60 > 30 && worst / 60 < 36, `earliest muster ${(worst / 60).toFixed(1)} min`);
  assert.ok(worst >= MUS_ARRIVAL.from + travel - 1e-6);
  assert.ok(latest <= MUS_ARRIVAL.to + travel + 1e-6);
  assert.ok(latest - worst > (MUS_ARRIVAL.to - MUS_ARRIVAL.from) * .95,
    'the seed sweep exercises nearly the full arrival window');
  // Nothing of his draw was clipped to buy this: the whole range is still there, half a minute
  // before the traveler included.
  assert.equal(MUS_ARRIVAL.from, -30);
  assert.equal(MUS_ARRIVAL.to, ARRIVALS.princes + 30);
});

test('giving Mus a wild route preserves every road mercenary timetable', () => {
  const company = companyFor(0);
  const roadOnly = companyFor(0, false);
  const roadMen = MERCENARY_ROSTER.filter(m => m.route !== 'wild').map(m => m.id);
  // Compare the same company with only Mus's special route disabled. Pinning an old absolute
  // muster time hid later intentional arrival/stop changes and did not test this guarantee.
  for (let time = -60; time <= 4000; time += 10) {
    const actual = company.placements(time), baseline = roadOnly.placements(time);
    for (const id of roadMen) {
      const a = actual.find(p => p.id === id), b = baseline.find(p => p.id === id);
      assert.deepEqual([a.phase, a.distance, a.stopId], [b.phase, b.distance, b.stopId],
        `${id}'s road schedule is unchanged at ${time}s`);
    }
  }
  const musterTimes = roadMen.map(id => {
    let low = 0, high = 20000;
    for (let i = 0; i < 44; i++) {
      const mid = (low + high) / 2;
      if (company.placements(mid).find(p => p.id === id).phase === 'mustered') high = mid; else low = mid;
    }
    return high;
  }).sort((a, b) => a - b);
  assert.equal(roadMen.length, 9, 'nine of the ten use the road; Mus does not');
  // Where Mus falls among them is the seed's business, which is why he is pinned as a range
  // rather than as a place. On some draws he is last in; on others the princes are.
  const places = new Set();
  for (let seed = 0; seed < 60; seed++) {
    const his = mustersAt(seed);
    places.add(musterTimes.filter(t => t < his).length + 1);
  }
  assert.ok(places.size > 1, `he only ever comes ${[...places].join(', ')} of ten`);
  assert.ok(places.has(10), 'on some seeds he is the last man in, which is why the old pin had to move');
});

test('he waits on his own strand, never pauses on the road, and musters with the rest', () => {
  const company = companyFor(0);
  const seen = new Set();
  let onRoad = 0;
  for (let t = -60; t <= 25000; t += 5) {
    const mus = company.placements(t).find(p => p.id === 'merc-mus');
    seen.add(mus.phase);
    if (mus.phase === 'landing') {
      assert.deepEqual([mus.x, mus.z], [MUS_BEACH.x, MUS_BEACH.z], 'he waits where the sea put him');
      assert.ok(Math.hypot(mus.x - world.spawn.x, mus.z - world.spawn.z) > 60, 'round the headland, not at the harbour');
    }
    if (mus.phase === 'walking' && toRoad(mus.x, mus.z) < WILD.clearance) onRoad++;
    if (mus.phase === 'mustered') assert.ok(Math.hypot(mus.x - camp.x, mus.z - camp.z) < 20, 'and he forms up with the company');
  }
  assert.deepEqual([...seen].sort(), ['coming', 'landing', 'mustered', 'walking'], 'he is never `stopped`, having no stops');
  assert.ok(onRoad < 40, `he is within ${WILD.clearance} m of the road for ${onRoad} of the samples, all of them the join`);
});
