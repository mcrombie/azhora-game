import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { BODY } from '../src/bodies.js';
import { ANCHORS } from '../src/regions.js';
import {
  MERCENARY_ROSTER, MUS_ARRIVAL, drawMusArrival, createMercenaryCompany, mercenaryById, roadLengths,
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
const companyFor = seed => createMercenaryCompany({ road, stops, muster: camp, landing: world.spawn, seed });

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
  assert.ok(journey.metres > 1600 && journey.metres < 1800, `${journey.metres.toFixed(0)} m of wild country`);
  assert.ok(journey.metres > roadToCamp, `the wilderness (${journey.metres.toFixed(0)} m) is longer than the road (${roadToCamp.toFixed(0)} m)`);
  assert.ok(WILD.pace < mercenaryById('merc-mus').pace * .7, `${WILD.pace} m/s through the rough against ${mercenaryById('merc-mus').pace} on a road`);
  assert.ok(Math.abs(journey.seconds - journey.metres / WILD.pace) < 1e-9);
  // The route is a route: it starts on his beach and every leg goes somewhere.
  assert.deepEqual(journey.path[0], MUS_BEACH);
  assert.deepEqual(journey.path[journey.path.length - 1], camp);
  assert.equal(routeMetres(MUS_ROUTE) > 0, true);
  for (let i = 1; i < MUS_ROUTE.length; i++)
    assert.ok(Math.hypot(MUS_ROUTE[i].x - MUS_ROUTE[i - 1].x, MUS_ROUTE[i].z - MUS_ROUTE[i - 1].z) > 20, `leg ${i} is a real leg`);
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
  assert.ok(closest > 2 * WILD.clearance,
    `the line comes within ${closest.toFixed(0)} m of the road at (${closestAt.x.toFixed(0)}, ${closestAt.z.toFixed(0)})`);
  assert.ok(joinedAt !== null && joinedAt < 60, `he first comes inside ${WILD.clearance} m of the road ${joinedAt?.toFixed(0)} m from the camp`);
  // And he comes onto the plain across country, not in along the road behind the others.
  const last = MUS_ROUTE[MUS_ROUTE.length - 1];
  assert.ok(toRoad(last.x, last.z) > WILD.clearance, 'his last waypoint of his own is still off the road');
  assert.ok(last.z < camp.z, 'he comes down onto the plain from the north-west, not in at the gate');
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
    if (at < worst) { worst = at; worstSeed = seed; }
    latest = Math.max(latest, at);
  }
  for (const end of ends) worst = Math.min(worst, end.muster);
  assert.ok(worst > DIRECT_TRAVELER + MARGIN,
    `seed ${worstSeed} musters at ${(worst / 60).toFixed(1)} min, and a direct traveler is in at ${DIRECT_TRAVELER / 60}`);
  assert.ok(earliest > 0);
  // The range, pinned: he is never in before the half-hour and can be the last man in.
  assert.ok(worst / 60 > 30 && worst / 60 < 36, `earliest muster ${(worst / 60).toFixed(1)} min`);
  assert.ok(latest / 60 > 90 && latest / 60 < 102, `latest muster ${(latest / 60).toFixed(1)} min`);
  // Nothing of his draw was clipped to buy this: the whole range is still there, half a minute
  // before the traveler included.
  assert.equal(MUS_ARRIVAL.from, -30);
  assert.ok(MUS_ARRIVAL.to > 3800);
});

test('the ten who use the road keep the clock they always had', () => {
  // The pin from docs/drent-long-road.md: the tenth man in musters at 5,234.5 s. Mus is not one
  // of the ten any more, so he is pinned separately, as a range, by the test above.
  const company = companyFor(0);
  const roadMen = MERCENARY_ROSTER.filter(m => m.route !== 'wild').map(m => m.id);
  const musterTimes = roadMen.map(id => {
    let low = 0, high = 20000;
    for (let i = 0; i < 44; i++) {
      const mid = (low + high) / 2;
      if (company.placements(mid).find(p => p.id === id).phase === 'mustered') high = mid; else low = mid;
    }
    return high;
  }).sort((a, b) => a - b);
  assert.equal(roadMen.length, 9, 'nine of the ten use the road; Mus does not');
  assert.ok(Math.abs(musterTimes[musterTimes.length - 1] - 5234.5) < 2,
    `the last road man musters at ${musterTimes[musterTimes.length - 1].toFixed(1)} s, and the pin is 5,234.5`);
  // Where Mus falls among them is the seed's business, which is why he is pinned as a range
  // rather than as a place. On some draws he is last in; on others the princes are.
  const places = new Set();
  for (let seed = 0; seed < 60; seed++) {
    const his = mustersAt(seed);
    places.add(musterTimes.filter(t => t < his).length + 1);
  }
  assert.ok(places.size > 3, `he only ever comes ${[...places].join(', ')} of ten`);
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
