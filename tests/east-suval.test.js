import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand, moveCharacter } from '../src/game-state.js';
import { PLAYABLE_REGIONS, REGION_BIOMES } from '../src/region-layout.js';
import {
  REGION_CELLS, REGION_OUTLINES, REGION_IDS, REGION_TERRAIN, WORLD_BOUNDS, SEA_LEVEL, TERRAIN_PADS, ELOD_TERRACE,
  regionAt, insideRegion, landDistance,
} from '../src/region-world.js';
import { bedrockHeight } from '../src/world-terrain.js';
import { CLOSED_REGIONS, closedRegionEntered } from '../src/closed-border.js';
import {
  ELOD, PRECINCT, SEA_ROAD_GATE, INNER_GATE, THRESHOLD, SEA_GATE, ELOD_QUAY, BREAKWATER, ELOD_LANDING,
  ELOD_SEA_ROUTE, ELOD_ADMISSION, ELOD_BUILDINGS, ELOD_STANDS, ELOD_CISTERNS, ELOD_STREETS,
  EAST_SUVAL_STANDS, EAST_SUVAL_PLACES, EAST_SUVAL_CELLS, NORTH_LIGHT, SORROW_BEACH, SEVENWALLS,
  quayHeight, eastSuvalClear,
} from '../src/east-suval.js';
import { ELOD_NPCS, EAST_SUVAL_NPCS, EAST_SUVAL_PEOPLE, EAST_SUVAL_AMBIENT, elodConversation } from '../src/elod-people.js';
import { SUBREGIONS, subregionsAt } from '../src/map-fog.js';
import { BUILD_STATUS, regionBuildStatus } from '../src/build-status.js';
import { buildLocalMapModel } from '../src/local-map-data.js';

const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());
const region = world.regions.find(entry => entry.name === 'East Suval');
const ashore = ELOD_LANDING.ashore;

/** A flood over whole metres inside a box: can a walker of `radius` get from `from` to `to`? */
function reachable(from, to, radius = .45, margin = 30) {
  const ox = Math.floor(Math.min(from.x, to.x) - margin), oz = Math.floor(Math.min(from.z, to.z) - margin);
  const w = Math.ceil(Math.max(from.x, to.x) + margin) - ox, h = Math.ceil(Math.max(from.z, to.z) + margin) - oz;
  const seen = new Int8Array(w * h), queue = [];
  const start = Math.round(from.z - oz) * w + Math.round(from.x - ox);
  seen[start] = 1; queue.push(start);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const index = queue[cursor], ix = index % w, iz = Math.floor(index / w);
    if (Math.hypot(ox + ix - to.x, oz + iz - to.z) < 1.6) return true;
    for (const [nx, nz] of [[ix - 1, iz], [ix + 1, iz], [ix, iz - 1], [ix, iz + 1]]) {
      if (nx < 0 || nz < 0 || nx >= w || nz >= h) continue;
      const next = nz * w + nx; if (seen[next]) continue;
      seen[next] = canStand(ox + nx, oz + nz, world, radius) ? 1 : -1;
      if (seen[next] === 1) queue.push(next);
    }
  }
  return false;
}

test('East Suval is the atlas’s own twenty-three hexes: a blade of limestone with hills in the south and its coast on the east', () => {
  assert.ok(PLAYABLE_REGIONS.includes('East Suval'));
  assert.equal(REGION_IDS['East Suval'], 4);
  const cells = REGION_CELLS['East Suval'], counts = {};
  for (const cell of cells) counts[cell.terrain] = (counts[cell.terrain] ?? 0) + 1;
  assert.equal(cells.length, 23, 'the atlas gives East Suval twenty-three hexes');
  assert.deepEqual(counts, { grassland: 9, plains: 6, hills: 8 });
  assert.equal(EAST_SUVAL_CELLS.length, cells.length, 'the region module reads the atlas rather than listing hexes of its own');
  assert.equal(REGION_OUTLINES['East Suval'].length, 1, 'one landmass, not islands');
  for (const cell of cells) assert.equal(regionAt(cell.x, cell.z).name, 'East Suval', `hex ${cell.q},${cell.r} belongs to East Suval`);
  // Its hills are the southern ridges, and they stand higher and barer than the coast.
  assert.ok(REGION_TERRAIN['East Suval'].byTerrain.hills.base > REGION_TERRAIN['East Suval'].base);
  const hills = cells.filter(cell => cell.terrain === 'hills'), flat = cells.filter(cell => cell.terrain !== 'hills');
  const mean = list => list.reduce((sum, cell) => sum + cell.z, 0) / list.length;
  assert.ok(mean(hills) > mean(flat) + 100, 'the hills are the southern end of the region');
  // Stone country: rock instead of timber, its own scatter, and no forest anywhere.
  assert.equal(REGION_BIOMES['East Suval'].ownScatter, true);
  assert.ok(REGION_BIOMES['East Suval'].rocksPerHex > REGION_BIOMES.Drent.rocksPerHex * 4);
  assert.ok(REGION_BIOMES['East Suval'].treesPerHex < REGION_BIOMES.Drent.treesPerHex / 10);
  assert.ok(world.eastSuvalMetrics.rocks > world.eastSuvalMetrics.trees * 5, 'limestone, not timber, is this region’s scatter');
  assert.ok(world.eastSuvalMetrics.scrub > 1000, 'aromatic cushion scrub everywhere');
  assert.ok(world.eastSuvalMetrics.fieldWalls > 5, 'dry-stone field walls wherever anybody has tried to farm');
  // East Suval did not grow the world. West Izol did, south and east, so all
  // that is left to hold here is that Elod's corner is still inside it.
  assert.ok(WORLD_BOUNDS.maxX > 540, 'the world reaches at least as far east as Peblos put it');
  assert.ok(WORLD_BOUNDS.maxZ > 1260);
});

test('the east coast is the sea the atlas drew: water east of Elod, and no bar a traveler can walk out on', () => {
  for (const [x, z] of [[14, 620], [22, 636], [30, 650], [8, 600], [64, 706], [110, 800]]) {
    assert.ok(landDistance(x, z) < 0, `the atlas says sea at ${x}, ${z}`);
    assert.ok(bedrockHeight(x, z) < SEA_LEVEL, `the sea floor is above water at ${x}, ${z}`);
    assert.equal(canStand(x, z, world), false, `standable water at ${x}, ${z}`);
  }
  // And land where it says land: the city's shelf, the northern point, the dry valley.
  for (const spot of [ELOD.centre, NORTH_LIGHT, SEVENWALLS, SORROW_BEACH])
    assert.ok(landDistance(spot.x, spot.z) > 5 && insideRegion('East Suval', spot.x, spot.z), `${spot.x}, ${spot.z} is East Suval’s own ground`);
  // The breakwater lies out in the water, where it belongs, and carries no deck.
  for (const spot of BREAKWATER.spine.slice(1)) {
    assert.ok(landDistance(spot.x, spot.z) < 0, 'the mole stands in the water');
    assert.equal(quayHeight(spot.x, spot.z), null, 'the mole is rock, not a walkway');
  }
});

test('Elod stands on its rock: eighteen buildings, a levelled precinct, and a quay a traveler can walk', () => {
  assert.equal(ELOD_BUILDINGS.length, 18);
  assert.equal(ELOD_BUILDINGS.filter(b => b.zone === 'harbour').length, 7);
  assert.equal(ELOD_BUILDINGS.filter(b => b.zone === 'city').length, 8);
  assert.equal(ELOD_BUILDINGS.filter(b => b.zone === 'inner').length, 3);
  for (const b of ELOD_BUILDINGS) {
    assert.ok(insideRegion('East Suval', b.x, b.z), `${b.id} stands in East Suval`);
    assert.ok(landDistance(b.x, b.z) > 3, `${b.id} stands above the tide`);
    for (const other of ELOD_BUILDINGS) if (other !== b)
      assert.ok(Math.hypot(other.x - b.x, other.z - b.z) > (Math.max(b.width, b.depth) + Math.max(other.width, other.depth)) / 2,
        `${b.id} and ${other.id} overlap`);
  }
  // The precinct is made ground, and it is level.
  assert.ok(TERRAIN_PADS.some(pad => pad.id === 'elod-precinct'));
  assert.equal(ELOD_TERRACE.level, PRECINCT.level);
  for (const [x, z] of [[PRECINCT.minX, PRECINCT.minZ], [PRECINCT.maxX, PRECINCT.maxZ], [THRESHOLD.x, THRESHOLD.z]])
    assert.ok(Math.abs(bedrockHeight(x, z) - PRECINCT.level) < .01, `the platform is level at ${x}, ${z}`);
  // The quay: a deck at the waterline, inside the outline from end to end.
  const q = ELOD_QUAY;
  for (const x of [q.minX + .5, (q.minX + q.maxX) / 2, q.maxX - .5]) for (const z of [q.minZ + 1, (q.minZ + q.maxZ) / 2, q.maxZ - 1]) {
    assert.equal(quayHeight(x, z), q.deckY);
    assert.ok(canStand(x, z, world), `the quay is standable at ${x}, ${z}`);
    assert.ok(insideRegion('East Suval', x, z), 'every metre of the deck is inside the region, or the closed border would trap a traveler on it');
  }
  assert.equal(quayHeight(q.maxX + 3, 630), null, 'the deck stops at its face');
  const walker = { x: q.minX + 1, z: 630 };
  moveCharacter(walker, 16, 0, world);
  assert.ok(walker.x < q.maxX, `walking east off the quay stopped at ${walker.x.toFixed(1)}`);
  assert.ok(world.heightAt(ashore.x, ashore.z) === q.deckY && canStand(ashore.x, ashore.z, world), 'the sea landing is on the deck');
  assert.ok(insideRegion('East Suval', ashore.x, ashore.z), 'and inside the region');
  // The city's streets and cisterns are its own: no river on this rock.
  assert.ok(ELOD_CISTERNS.length >= 3 && ELOD_STREETS.length >= 3);
  for (const spot of ELOD_CISTERNS) assert.ok(insideRegion('East Suval', spot.x, spot.z) && eastSuvalClear(spot.x, spot.z));
});

test('every one of Elod’s people stands on standable ground a traveler off the boat can reach', () => {
  const stands = Object.entries(ELOD_STANDS);
  assert.equal(stands.length, ELOD_NPCS.length, 'one stand per person in the city');
  for (const [id, stand] of stands) {
    assert.ok(canStand(stand.x, stand.z, world), `${id} cannot stand at ${stand.x}, ${stand.z}`);
    assert.ok(insideRegion('East Suval', stand.x, stand.z), `${id} stands outside the region`);
    assert.ok(reachable(ashore, stand), `${id} is not reachable from the quay`);
    for (const [other, point] of stands) if (other !== id)
      assert.ok(Math.hypot(point.x - stand.x, point.z - stand.z) >= 4, `${id} and ${other} stand within four metres`);
  }
  for (const [id, stand] of Object.entries(EAST_SUVAL_STANDS)) {
    assert.ok(canStand(stand.x, stand.z, world), `${id} cannot stand at ${stand.x}, ${stand.z}`);
    assert.ok(insideRegion('East Suval', stand.x, stand.z), `${id} stands outside East Suval`);
  }
  // Everyone is in the world's own book of positions, where the host looks them up.
  for (const npc of EAST_SUVAL_PEOPLE) assert.ok(world.npcPositions[npc.id], `${npc.id} has no position`);
});

test('the Inner Gate refuses: the precinct and the Threshold cannot be walked into', () => {
  assert.equal(canStand(INNER_GATE.x, INNER_GATE.z, world), false, 'the gate itself is shut');
  for (const [x, z] of [[THRESHOLD.x, THRESHOLD.z], [-37, 632], [PRECINCT.minX + 3, 620], [PRECINCT.maxX - 3, 646]])
    assert.equal(reachable(ashore, { x, z }), false, `the traveler got inside the precinct at ${x}, ${z}`);
  // The warden stands outside his own gate, and so does everyone a traveler may speak to.
  assert.ok(ELOD_STANDS['elod-warden'].z < PRECINCT.minZ, 'the warden stands outside the wall');
  for (const id of ['elod-priest', 'elod-theologian', 'elod-reader', 'elod-warden-guard']) {
    const stand = ELOD_STANDS[id];
    const inside = stand.x > PRECINCT.minX && stand.x < PRECINCT.maxX && stand.z > PRECINCT.minZ && stand.z < PRECINCT.maxZ;
    assert.equal(inside, false, `${id} is shut in behind the gate where nobody can speak to them`);
  }
  // The Sea Gate is the other kind of gate: it lets a traveler through.
  assert.ok(reachable(ashore, { x: SEA_GATE.x - 6, z: SEA_GATE.z - 4 }), 'the Sea Gate is passable');
  // And the Sea-Road Gate, Elod's landward door, is shut like the frontier behind it.
  assert.equal(canStand(SEA_ROAD_GATE.x, SEA_ROAD_GATE.z, world), false, 'the road gate is shut');
});

test('the closed border is still closed, and the sea route is a stub that says so', () => {
  assert.deepEqual(CLOSED_REGIONS, ['East Suval']);
  assert.equal(closedRegionEntered({ x: -520, z: 520 }, { x: -380, z: 500 }), 'East Suval');
  assert.equal(ELOD_SEA_ROUTE.built, false);
  assert.equal(ELOD_SEA_ROUTE.landing, ELOD_LANDING);
  assert.ok(ELOD_SEA_ROUTE.note.includes('Not built'));
  assert.equal(ELOD_ADMISSION.granted, false);
  assert.equal(ELOD_ADMISSION.terms.length, 3);
  assert.ok(ELOD_ADMISSION.note.includes('Not wired'));
  assert.equal(world.elodLanding.ashore.x, ELOD_LANDING.ashore.x);
  assert.equal(regionBuildStatus('East Suval').state, 'edge', 'a region nobody may enter is still an edge');
});

test('every place in East Suval is charted, stands on its own ground, and has something to find', () => {
  assert.ok(EAST_SUVAL_PLACES.length >= 8);
  for (const place of EAST_SUVAL_PLACES) {
    assert.ok(place.description.length > 60, `${place.id} has discovery text`);
    assert.equal(regionAt(place.x, place.z).name, 'East Suval', `${place.id} is in the wrong region`);
    assert.ok(landDistance(place.x, place.z) > -1, `${place.id} is under water`);
    assert.ok(world.landmarks.some(entry => entry.id === place.id), `${place.id} is not in the world’s places`);
  }
  for (const id of region.landmarks) assert.ok(world.landmarks.some(entry => entry.id === id), `${id} is named by the region and does not exist`);
  // The chart: the border post, the waystation, the city and its harbour, and four places beyond.
  const areas = SUBREGIONS.filter(area => area.region === 'East Suval');
  assert.equal(areas.length, 8);
  for (const area of areas) {
    assert.equal(regionAt(area.x, area.z).name, 'East Suval', `${area.id} is charted in the wrong region`);
    for (const other of SUBREGIONS) if (other !== area)
      assert.ok(Math.hypot(other.x - area.x, other.z - area.z) > Math.max(area.radius, other.radius) * .6,
        `${area.id} and ${other.id} sit on top of one another`);
  }
  assert.ok(subregionsAt(ELOD.centre.x, ELOD.centre.z).some(area => area.id === 'elod'));
  assert.ok(subregionsAt(ELOD_QUAY.minX + 2, 630).some(area => area.id === 'elod-harbour'));
  assert.ok(subregionsAt(NORTH_LIGHT.x, NORTH_LIGHT.z).some(area => area.id === 'north-light'));
  assert.ok(subregionsAt(SORROW_BEACH.x, SORROW_BEACH.z).some(area => area.id === 'sorrow-beach'));
  // And the developer's chart is honest about what is behind the gate.
  assert.match(BUILD_STATUS['East Suval'].detail, /Threshold/);
  assert.match(BUILD_STATUS['East Suval'].work, /closed|sea passage/i);
  // The local chart draws the city's roofs.
  const chart = buildLocalMapModel({ world, position: ELOD.centre, regionId: REGION_IDS['East Suval'], discoveries: new Set(['elod']) });
  assert.equal(chart.region.id, REGION_IDS['East Suval']);
  assert.ok(chart.buildings.length >= 10, 'the chart shows Elod’s roofs');
});

test('twenty-six people, and the argument the whole city is having is had from three sides', () => {
  assert.equal(EAST_SUVAL_PEOPLE.length, 26);
  assert.equal(ELOD_NPCS.length, 21);
  assert.equal(EAST_SUVAL_NPCS.length, 5);
  assert.equal(new Set(EAST_SUVAL_PEOPLE.map(npc => npc.id)).size, 26, 'each person once');
  for (const npc of EAST_SUVAL_PEOPLE) {
    assert.ok(EAST_SUVAL_AMBIENT[npc.id]?.length >= 2, `${npc.id} has something to say`);
    assert.ok(npc.name.length > 2 && npc.role.length > 4, npc.id);
    assert.ok(npc.viewRange > 0 && npc.viewRange < 120, 'ambient people are drawn only when near');
    // Only Elod's own officials wear the black lamellar; nobody here is a legionary.
    if (npc.modelRole === 'elodi-guard') assert.match(npc.role, /Warden|watch|gate|Gate|frontier|Sea Gate|Threshold/);
    assert.ok(!npc.modelRole?.startsWith('legion'), `${npc.id} is wearing the Legion’s armour`);
    assert.ok(!npc.armed, 'nobody in Elod has a blade out');
  }
  const said = Object.values(EAST_SUVAL_AMBIENT).flat().join(' ');
  // Piety, cowardice, and the man who will not be stopped by a shut gate.
  assert.match(said, /Wilhelm|Blood Prince/, 'somebody names the man who burned Solis');
  assert.match(said, /piety/i);
  assert.match(said, /coward/i);
  assert.match(EAST_SUVAL_AMBIENT['elod-exile'].join(' '), /Solis/);
  // The three senses of Balog are explained by the one person whose job it is.
  const theology = EAST_SUVAL_AMBIENT['elod-theologian'].join(' ');
  for (const sense of ['eternal authority', 'office', 'bearer']) assert.match(theology, new RegExp(sense, 'i'));
  // The lore's own rules are on the ground, not in a lecture.
  assert.match(EAST_SUVAL_AMBIENT['elod-gatekeeper'].join(' '), /bell|pour|image/i);
  assert.match(EAST_SUVAL_AMBIENT['elod-factor'].join(' '), /bell|procession|carry/i);
  assert.match(EAST_SUVAL_AMBIENT['elod-dyer'].join(' '), /breech|water|bowl/i, 'the woman who went to Mithalenna does not name her');
  assert.match(EAST_SUVAL_AMBIENT['elod-delegate'].join(' '), /lighthouse/i);
  assert.match(EAST_SUVAL_AMBIENT['elod-reader'].join(' '), /waits|birds|Old Kingdom/i);
  // An Elodi says Ambron, not Empire: they do not repeat other people's claims.
  for (const [id, lines] of Object.entries(EAST_SUVAL_AMBIENT)) {
    if (['elod-exile', 'elod-refugee'].includes(id)) continue;     // the people of Solis may say what they like
    assert.doesNotMatch(lines.join(' '), /\bEmpire\b/, `${id} calls Ambron an empire`);
  }
});

test('the warden turns a traveler back politely, and says what it would cost', () => {
  const opened = [];
  const context = { openDialogue: (npc, lines, event, action, options) => opened.push({ npc, lines, options }), closeDialogue: () => {} };
  assert.equal(elodConversation(ELOD_NPCS.find(npc => npc.id === 'elod-warden'), context), true);
  assert.match(opened[0].lines[0], /Stop there/);
  const ask = opened[0].options.choices.find(choice => choice.id === 'elod-ask-admission');
  assert.ok(ask, 'the traveler may ask what it would take');
  ask.action();
  assert.ok(opened[1].lines.join(' ').includes('householder'), 'and the cost is somebody standing up for you');
  // Anyone else gets a plain conversation, and people from elsewhere get nothing.
  assert.equal(elodConversation(ELOD_NPCS.find(npc => npc.id === 'elod-harbourmaster'), context), true);
  assert.equal(elodConversation({ id: 'not-from-here' }, context), false);
});

test('the region card and the scatter tell the truth about the ground behind the gate', () => {
  assert.equal(region.subtitle, 'Stone hills and Elod');
  assert.match(region.description, /limestone/);
  assert.ok(canStand(region.spawn.x, region.spawn.z, world), 'the region spawn is standable');
  assert.equal(regionAt(region.spawn.x, region.spawn.z).name, 'East Suval');
  for (const id of region.npcIds) assert.ok(world.npcPositions[id], `${id} is named by the region and stands nowhere`);
  // Scatter is batched a couple of hexes at a time, so a camera in the city
  // submits nothing of the southern hills, and it keeps out of the built places.
  assert.ok(world.eastSuvalMetrics.batches >= 12 && world.eastSuvalMetrics.batches < 120, `${world.eastSuvalMetrics.batches} batches`);
  assert.equal(world.eastSuvalMetrics.buildings, 26, 'the city’s eighteen, and eight more at the outlying places');
  const own = world.colliders.filter(c => ['ridge-rock', 'region-tree'].includes(c.kind) && regionAt(c.x, c.z)?.name === 'East Suval');
  assert.ok(own.length > 20, 'the region is scattered, not bare');
  for (const collider of own) {
    assert.ok(landDistance(collider.x, collider.z) > 0, `scatter below the tideline at ${collider.x.toFixed(0)}, ${collider.z.toFixed(0)}`);
    assert.equal(eastSuvalClear(collider.x, collider.z), false, 'scatter inside a built place');
  }
});
