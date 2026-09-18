import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { PLAYABLE_REGIONS, REGION_BIOMES } from '../src/region-layout.js';
import {
  REGION_CELLS, REGION_IDS, WORLD_BOUNDS, SEA_LEVEL, TERRAIN_PADS, IZOLVETH_TERRACE,
  regionAt, insideRegion, landDistance, isLandHex,
} from '../src/region-world.js';
import { bedrockHeight } from '../src/world-terrain.js';
import {
  IZOLVETH, P, C, IZOL_QUAY, IZOL_MOLES, IZOL_BOOM, IZOL_SHIPS, IZOLVETH_BUILDINGS, MEETING_HOUSE, IZOL_STONE,
  IZOL_CAMP, IZOL_STANDS, IZOL_NPC_POSITIONS, IZOL_LANDMARKS, IZOL_PATHS, IZOL_ROAD, IZOL_SIGNS, IZOL_CLEARINGS,
  ARDVETH, KELVATH, SEA_GATE, SIGHTSTONE, LONG_PASTURE, THREE_PRESENCES, RECRUITING_STANDS, IZOL_GENERALS,
  izolDeckHeight, moleDistance, terraceHeight, campPicketColliders, campTentColliders, generalsStance,
} from '../src/izol-world.js';
import { SUBREGIONS, subregionsAt } from '../src/map-fog.js';
import { BUILD_STATUS, regionBuildStatus } from '../src/build-status.js';
import { REGION_DESIGN, SETTLEMENTS } from '../src/campaign-world.js';

const { SIGN_LABELS } = await sourceModule('../src/signs.js');
const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());
const region = world.regions.find(entry => entry.name === 'West Izol');

/** A flood over whole metres inside a box: can a walker of `radius` get from `from` to `to`? */
function reachable(from, to, radius = .45, margin = 30) {
  const ox = Math.floor(Math.min(from.x, to.x) - margin), oz = Math.floor(Math.min(from.z, to.z) - margin);
  const w = Math.ceil(Math.max(from.x, to.x) + margin) - ox, h = Math.ceil(Math.max(from.z, to.z) + margin) - oz;
  const seen = new Int8Array(w * h), queue = [];
  const start = Math.round(from.z - oz) * w + Math.round(from.x - ox);
  seen[start] = 1; queue.push(start);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const index = queue[cursor], ix = index % w, iz = Math.floor(index / w);
    if (Math.hypot(ox + ix - to.x, oz + iz - to.z) < 1.8) return true;
    for (const [nx, nz] of [[ix - 1, iz], [ix + 1, iz], [ix, iz - 1], [ix, iz + 1]]) {
      if (nx < 0 || nz < 0 || nx >= w || nz >= h) continue;
      const next = nz * w + nx; if (seen[next]) continue;
      seen[next] = canStand(ox + nx, oz + nz, world, radius) ? 1 : -1;
      if (seen[next] === 1) queue.push(next);
    }
  }
  return false;
}

test('West Izol is a playable region true to the atlas: twenty-one hexes of rock across the Izoli Channel', () => {
  assert.ok(PLAYABLE_REGIONS.includes('West Izol'));
  assert.equal(REGION_IDS['West Izol'], 8);
  const cells = REGION_CELLS['West Izol'], counts = {};
  for (const cell of cells) counts[cell.terrain] = (counts[cell.terrain] ?? 0) + 1;
  assert.equal(cells.length, 21, 'the atlas gives West Izol twenty-one hexes');
  assert.deepEqual(counts, { grassland: 11, hills: 5, plains: 5 });
  // Far to the south of the mainland, and the only playable ground on the island.
  assert.ok(region.bounds.minZ > 1600 && region.bounds.maxZ < 2170);
  assert.ok(regionAt(IZOLVETH.centre.x, IZOLVETH.centre.z).name === 'West Izol');
  // The world grew south to reach it, and east by the width of one hex.
  assert.ok(WORLD_BOUNDS.maxZ > 2200 && WORLD_BOUNDS.maxZ < 2240, `world maxZ ${WORLD_BOUNDS.maxZ}`);
  assert.ok(WORLD_BOUNDS.maxX > 600 && WORLD_BOUNDS.maxX < 620);
  assert.equal(REGION_BIOMES['West Izol'].id, 'izoli-rock');
  assert.equal(REGION_BIOMES['West Izol'].ownScatter, true, 'West Izol scatters its own ground');
  // An island: every hex of it is ringed by sea or by East Izol, never by another playable region.
  for (const cell of cells) assert.ok(isLandHex(cell.x, cell.z));
  assert.equal(insideRegion('West Izol', IZOLVETH.centre.x - 320, IZOLVETH.centre.z), false, 'the channel is not West Izol');
});

test('Izolveth stands on made ground that climbs from the quay to the meeting house', () => {
  assert.ok(TERRAIN_PADS.includes(IZOLVETH_TERRACE));
  assert.equal(IZOLVETH_TERRACE.shore, true, 'a shore pad may not reclaim the cove in front of it');
  // The terrace is a plane, and the ground on it is that plane to the centimetre.
  for (const b of [-40, -20, 0, 20, 40]) {
    const p = P(0, b);
    assert.ok(Math.abs(bedrockHeight(p.x, p.z) - terraceHeight(b)) < .05, `terrace at b=${b}`);
  }
  // It climbs: the strand is at the water, the meeting house ten metres above it.
  const strand = terraceHeight(-40), top = terraceHeight(40);
  assert.ok(strand > 2 && strand < 4, `the strand stands at ${strand} m`);
  assert.ok(top - strand > 8 && top - strand < 12, 'the town climbs about ten metres');
  // And the cove in front of it is still water.
  assert.ok(bedrockHeight(56, 1714) < SEA_LEVEL, 'the harbour is water, not reclaimed land');
});

test('the harbour works: a quay walked end to end, two moles, a mouth, and ships clear of both', () => {
  const Q = IZOL_QUAY;
  // The deck is standable ground from one end to the other.
  for (let x = Q.minX + 1; x <= Q.maxX - 1; x += 1) {
    assert.equal(izolDeckHeight(x, 1721), Q.deckY);
    assert.ok(canStand(x, 1721, world), `the quay is walkable at x=${x}`);
  }
  assert.equal(izolDeckHeight(Q.minX - 3, 1721), null, 'the deck ends where it ends');
  assert.ok(canStand(Q.landing.x, Q.landing.z, world), 'a ship can put the traveler ashore on the landing');
  assert.equal(regionAt(Q.landing.x, Q.landing.z).name, 'West Izol');
  assert.deepEqual({ x: region.spawn.x, z: region.spawn.z }, { x: Q.landing.x, z: Q.landing.z },
    'the region spawn is the quay a ship lands on');
  // Both moles are decks too, and each runs from land into deep water.
  for (const mole of IZOL_MOLES) {
    const root = mole.points[0], head = mole.points.at(-1);
    assert.ok(landDistance(root.x, root.z) > 0, `${mole.id} is rooted on the rock`);
    assert.ok(landDistance(head.x, head.z) < -25, `${mole.id} ends in deep water`);
    assert.equal(izolDeckHeight(head.x, head.z), mole.deckY);
    assert.ok(canStand(head.x, head.z, world) === false || izolDeckHeight(head.x, head.z) !== null);
    for (let i = 1; i < mole.points.length; i++) {
      const a = mole.points[i - 1], b = mole.points[i], steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z));
      for (let s = 0; s <= steps; s++) {
        const x = a.x + (b.x - a.x) * s / steps, z = a.z + (b.z - a.z) * s / steps;
        assert.ok(izolDeckHeight(x, z) !== null, `${mole.id} has a deck at ${x},${z}`);
      }
    }
  }
  // The mouth: open water between the two heads, twenty-six metres of it.
  const gap = Math.hypot(IZOL_BOOM.b.x - IZOL_BOOM.a.x, IZOL_BOOM.b.z - IZOL_BOOM.a.z);
  assert.ok(gap > 24 && gap < 28, `the harbour mouth is ${gap.toFixed(1)} m`);
  for (let t = .15; t < .9; t += .1) {
    const x = IZOL_BOOM.a.x + (IZOL_BOOM.b.x - IZOL_BOOM.a.x) * t, z = IZOL_BOOM.a.z + (IZOL_BOOM.b.z - IZOL_BOOM.a.z) * t;
    assert.equal(izolDeckHeight(x, z), null, 'the mouth is water, not deck');
    assert.ok(bedrockHeight(x, z) < SEA_LEVEL - 2, 'a hull can pass the mouth');
  }
  // Every ship floats, clear of the quay's face and of either mole.
  assert.equal(IZOL_SHIPS.length, 5);
  for (const ship of IZOL_SHIPS) {
    assert.ok(bedrockHeight(ship.x, ship.z) < SEA_LEVEL - 1.5, `${ship.id} floats`);
    assert.equal(izolDeckHeight(ship.x, ship.z), null, `${ship.id} is not on the quay`);
    for (const mole of IZOL_MOLES)
      assert.ok(moleDistance(mole, ship.x, ship.z) > mole.half + ship.beam / 2, `${ship.id} is clear of ${mole.id}`);
    assert.ok(Math.hypot(ship.x - IZOLVETH.centre.x, ship.z - IZOLVETH.centre.z) < 120);
  }
  // Four flags on five hulls: Izol's own, a Suvali charter, a taken Selemi hull and a taken Ambroni one.
  assert.deepEqual([...new Set(IZOL_SHIPS.map(ship => ship.banner))].sort(),
    ['ambroni-rebels', 'izoli', 'selemis', 'suval']);
});

test('the town is built clear of itself, and every stand in it is standable and reachable from the quay', () => {
  // No building overlaps another.
  for (let i = 0; i < IZOLVETH_BUILDINGS.length; i++) for (let j = i + 1; j < IZOLVETH_BUILDINGS.length; j++) {
    const a = IZOLVETH_BUILDINGS[i], b = IZOLVETH_BUILDINGS[j];
    const gapA = Math.abs(a.a - b.a) - (a.w + b.w) / 2, gapB = Math.abs(a.b - b.b) - (a.d + b.d) / 2;
    assert.ok(gapA > .5 || gapB > .5, `${a.id} and ${b.id} overlap`);
  }
  // The meeting house is longer than any warehouse and lower than any of them: plainly not a palace.
  const tallest = Math.max(...IZOLVETH_BUILDINGS.map(entry => entry.h));
  assert.ok(MEETING_HOUSE.w > Math.max(...IZOLVETH_BUILDINGS.map(entry => entry.w)), 'the hall is the longest building');
  assert.ok(MEETING_HOUSE.h < tallest, 'and lower than the tallest');
  // Everybody stands on ground they can stand on, four metres from everyone else.
  const stands = Object.entries(IZOL_STANDS);
  for (const [id, spot] of stands) {
    assert.ok(canStand(spot.x, spot.z, world), `${id} stands on ground at ${spot.x.toFixed(1)}, ${spot.z.toFixed(1)}`);
    assert.ok(Number.isFinite(spot.yaw), `${id} faces somewhere`);
  }
  for (let i = 0; i < stands.length; i++) for (let j = i + 1; j < stands.length; j++) {
    const a = stands[i][1], b = stands[j][1];
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > 3.5, `${stands[i][0]} and ${stands[j][0]} stand on each other`);
  }
  // And a traveler put ashore on the quay can walk to all of them in the town.
  const townStands = stands.filter(([, spot]) => Math.hypot(spot.x - IZOLVETH.centre.x, spot.z - IZOLVETH.centre.z) < 70);
  assert.ok(townStands.length >= 16, 'most of the people are in the town');
  for (const [id, spot] of townStands)
    assert.ok(reachable(IZOL_QUAY.landing, spot), `${id} is reachable from the landing`);
  assert.deepEqual(Object.keys(IZOL_NPC_POSITIONS).sort(), Object.keys(IZOL_STANDS).sort());
  for (const id of Object.keys(IZOL_STANDS)) assert.ok(world.npcPositions[id], `${id} has a place in the world`);
});

test('the camp above the town is closed but for its gate, level to drill on, and reached from the road', () => {
  const picket = campPicketColliders(), tents = campTentColliders();
  assert.equal(picket.length, 5, 'four sides and a gate');
  assert.equal(tents.length, IZOL_CAMP.contingents.reduce((sum, group) => sum + group.tents.length, 0));
  assert.equal(tents.length, 33);
  // Seven contingents, the Izoli the largest of them on their own island.
  assert.deepEqual(IZOL_CAMP.contingents.map(group => group.id),
    ['izoli', 'suval', 'ambroni-rebels', 'selemis', 'marosh', 'island-cities', 'pyros']);
  assert.equal(Math.max(...IZOL_CAMP.contingents.map(group => group.tents.length)), IZOL_CAMP.contingents[0].tents.length);
  // The drill ground is level enough to drill on.
  const drill = IZOL_CAMP.drill;
  let low = Infinity, high = -Infinity;
  for (let a = drill.a - drill.halfA; a <= drill.a + drill.halfA; a += 4) for (let b = drill.b - drill.halfB; b <= drill.b + drill.halfB; b += 4) {
    const p = C(a, b), y = world.heightAt(p.x, p.z);
    low = Math.min(low, y); high = Math.max(high, y);
  }
  assert.ok(high - low < 1.2, `the drill ground rises ${(high - low).toFixed(2)} m across`);
  // The gate is the way in, and the camp's captains can be reached from the town.
  const gateway = C(IZOL_CAMP.minA - 3, 0);
  assert.ok(canStand(gateway.x, gateway.z, world), 'the camp gate is open ground');
  assert.ok(reachable(gateway, IZOL_STANDS['izol-captain-izoli'], .45, 40), 'the Izoli captain is reachable through the gate');
  // And the picket holds everywhere else: a line of it is not standable.
  const wall = C(0, IZOL_CAMP.minB);
  assert.equal(canStand(wall.x, wall.z, world), false, 'the picket line is a line');
});

test('the country round the town: four places, three peaks, and roads that can be walked', () => {
  for (const place of [ARDVETH.centre, KELVATH.centre, SEA_GATE, SIGHTSTONE, LONG_PASTURE]) {
    assert.ok(landDistance(place.x, place.z) > 0, 'every place is on land');
    assert.ok(insideRegion('West Izol', place.x, place.z), 'and inside West Izol');
    assert.ok(canStand(place.x, place.z, world) || world.heightAt(place.x, place.z) > SEA_LEVEL);
  }
  // Ardveth and Kelvath Cove stand on shelves of their own, as the lore says every settled place on this island must.
  assert.ok(TERRAIN_PADS.some(pad => pad.id === 'ardveth') && TERRAIN_PADS.some(pad => pad.id === 'kelvath'));
  // The Sea Gate is at the head of the harbour headland, north of the town and out in the water's arms.
  assert.ok(SEA_GATE.z < IZOL_QUAY.minZ - 30, 'the Sea Gate is out on the headland');
  // Three Presences, all of them on the high ground the atlas authored east of the region.
  assert.equal(THREE_PRESENCES.length, 3);
  for (const peak of THREE_PRESENCES) {
    assert.ok(landDistance(peak.x, peak.z) > 50, 'a peak stands inland, not in the sea');
    assert.ok(peak.x < WORLD_BOUNDS.maxX + 80, 'and inside the ground the world draws');
    assert.ok(Math.hypot(peak.x - SIGHTSTONE.x, peak.z - SIGHTSTONE.z) < 300, 'and near enough the Sightstone to be seen from it');
    assert.ok(Math.hypot(peak.x - IZOLVETH.centre.x, peak.z - IZOLVETH.centre.z) > 380, 'and far enough from the town not to loom over it');
  }
  // Every road and path can be walked, metre by metre.
  for (const path of IZOL_PATHS) for (let i = 1; i < path.points.length; i++) {
    const a = path.points[i - 1], b = path.points[i], steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 2);
    for (let s = 0; s <= steps; s++) {
      const x = a.x + (b.x - a.x) * s / steps, z = a.z + (b.z - a.z) * s / steps;
      assert.ok(canStand(x, z, world, .4), `${path.id} is walkable at ${x.toFixed(0)}, ${z.toFixed(0)}`);
    }
  }
  // The Hearth Road leaves the town and reaches the Sightstone's shoulder.
  assert.ok(Math.hypot(IZOL_ROAD[0].x - IZOLVETH.centre.x, IZOL_ROAD[0].z - IZOLVETH.centre.z) < 70);
  const nearest = Math.min(...IZOL_ROAD.map(p => Math.hypot(p.x - SIGHTSTONE.x, p.z - SIGHTSTONE.z)));
  assert.ok(nearest < 20, `the road passes the Sightstone (${nearest.toFixed(1)} m)`);
  // Every fingerpost carries a label the sign atlas has lettered.
  for (const sign of IZOL_SIGNS) {
    assert.ok(SIGN_LABELS.includes(sign.label), sign.label);
    assert.ok(SIGN_LABELS.includes(sign.returnLabel), sign.returnLabel);
  }
});

test('West Izol is charted: named areas that overlap nothing, land inside the chart’s water, and an honest build status', () => {
  const areas = SUBREGIONS.filter(area => area.region === 'West Izol');
  assert.ok(areas.length >= 7, 'the island has its own named ground');
  // The chart's rule (tests/map-fog.test.js): no named area may swallow another's centre.
  for (const area of areas) for (const other of SUBREGIONS) {
    if (other === area) continue;
    assert.ok(Math.hypot(area.x - other.x, area.z - other.z) > Math.max(area.radius, other.radius),
      `${area.id} and ${other.id} swallow each other`);
  }
  assert.ok(subregionsAt(IZOLVETH.centre.x, IZOLVETH.centre.z).some(area => area.id === 'izolveth'));
  assert.ok(subregionsAt(IZOL_CAMP.centre.x, IZOL_CAMP.centre.z).some(area => area.id === 'izolveth-camp'));
  // The island is land painted back over the chart's sea, as the Pebbles are.
  assert.ok(world.mapLands.some(land => land.region === 'West Izol'), 'the chart knows the island is land');
  assert.ok(world.mapWaters.some(water => water.id === 'west-izol-water'), 'and that the channel round it is water');
  // Every landmark is in the world, discoverable, and inside its region.
  for (const place of IZOL_LANDMARKS) {
    assert.ok(world.landmarks.some(entry => entry.id === place.id), `${place.id} is in the world`);
    assert.ok(place.description.length > 60, `${place.id} has discovery text`);
    assert.ok(insideRegion('West Izol', place.x, place.z) || landDistance(place.x, place.z) > -60, `${place.id} is on the island`);
  }
  assert.equal(regionBuildStatus('West Izol').state, 'early');
  assert.match(BUILD_STATUS['West Izol'].work, /Chapter 3/, 'the build status says what is missing');
  // The campaign already described this region: a level-zero Izoli province that shelters the army.
  const design = REGION_DESIGN.find(entry => entry.id === 'West Izol');
  assert.equal(design.level, 0);
  assert.equal(design.control, 'izoli');
  assert.deepEqual(design.threats, []);
  assert.equal(SETTLEMENTS.izolveth.region, 'West Izol');
});

test('level zero: nothing on this island can kill you, and the only fortification is a chain', () => {
  const armed = world.colliders.filter(collider => collider.kind === 'ship').length;
  assert.ok(armed >= 5, 'the hulls are the biggest things in the harbour');
  // No wall round the town: the only enclosure West Izol adds is the camp's picket and the Selemi outpost's yard.
  const walls = world.colliders.filter(collider => typeof collider.kind === 'string' && collider.kind.startsWith('izol-'));
  assert.ok(walls.every(collider => ['izol-wall', 'izol-revetment', 'izol-building', 'izol-stone',
    'izol-camp-picket', 'izol-camp-tent'].includes(collider.kind)), 'nothing here is a curtain wall');
  assert.ok((world.enclosures ?? []).every(enclosure => !enclosure.id.startsWith('izol')), 'Izolveth is not a walled place');
  // The three generals are named in one table and nowhere else.
  assert.deepEqual(IZOL_GENERALS.map(general => general.id), ['kellveth', 'doreth', 'marech']);
  assert.deepEqual(RECRUITING_STANDS.map(stand => stand.general), ['kellveth', 'doreth', 'marech']);
  // Their three boards stand within thirty paces of each other on the same strand.
  for (const a of RECRUITING_STANDS) for (const b of RECRUITING_STANDS)
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < 34, 'the three recruiting boards share one strand');
  // Chapter 2 decides where Kellveth is, and nothing else does.
  assert.equal(generalsStance({ 'West Suval': 'coalition' }).kellvethHome, false);
  assert.equal(generalsStance({ 'West Suval': 'empire' }).kellvethHome, true);
  assert.equal(generalsStance({}).solisHeld, true, 'Solis is held until the Empire takes it back');
});

test('the island’s own scatter stands on the island, off its roads and out of its places', () => {
  const metrics = world.izolMetrics;
  assert.ok(metrics.turf > 1500 && metrics.rock > 400, 'turf and rock are what grows here');
  assert.ok(metrics.pines < metrics.rock / 3, 'and very little that grows above a man');
  assert.ok(metrics.batches < 40, `scatter is batched (${metrics.batches} batches)`);
  assert.equal(metrics.ships, 5);
  assert.equal(metrics.tents, 33);
  assert.ok(metrics.mergedGroups <= 8, `the town merges into ${metrics.mergedGroups} meshes`);
  // Nothing of the region's own scatter stands inside the town, the harbour or a landmark's ground.
  for (const spot of IZOL_CLEARINGS) assert.ok(spot.r > 10, 'every cleared place owns real ground');
  for (const collider of world.colliders) {
    if (!['region-tree', 'thorn', 'gorse'].includes(collider.kind)) continue;
    if (!insideRegion('West Izol', collider.x, collider.z)) continue;
    for (const spot of IZOL_CLEARINGS)
      assert.ok(Math.hypot(collider.x - spot.x, collider.z - spot.z) > spot.r - 6,
        `something grows in a clearing at ${collider.x.toFixed(0)}, ${collider.z.toFixed(0)}`);
  }
});
