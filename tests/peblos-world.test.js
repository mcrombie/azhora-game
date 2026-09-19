import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand, moveCharacter } from '../src/game-state.js';
import { PLAYABLE_REGIONS, REGION_BIOMES } from '../src/region-layout.js';
import {
  REGION_CELLS, REGION_OUTLINES, REGION_IDS, WORLD_BOUNDS, SEA_LEVEL, TERRAIN_PADS, COBBLE_TERRACE,
  regionAt, insideRegion, landDistance, hexAt,
} from '../src/region-world.js';
import { bedrockHeight } from '../src/world-terrain.js';
import {
  PEBLOS_ISLANDS, MAIN_ISLAND, OUTER_ISLANDS, COBBLE, COBBLE_QUAY, COBBLE_BUILDINGS, COBBLE_STANDS, COBBLE_WORKING,
  PEBLOS_LANDMARKS, PEBLOS_CLEARINGS, PEBLOS_NPC_POSITIONS, SEA_SHRINE, HEADLAND_LIGHT, SEAL_COVE, DROWNED_FIELD,
  COBBLE_GULL_ROCKS, FERRY_MOORINGS, islandAt, inCobble, quayHeight,
} from '../src/peblos-world.js';
import { PEBLOS_NPCS, PEBLOS_NPC_IDS, PEBLOS_AMBIENT, peblosConversation } from '../src/peblos-people.js';
import { FERRY_LANDINGS } from '../src/ferry.js';
import { SUBREGIONS, subregionsAt } from '../src/map-fog.js';
import { BUILD_STATUS, regionBuildStatus } from '../src/build-status.js';
import { buildLocalMapModel } from '../src/local-map-data.js';
import { REGION_DESIGN } from '../src/campaign-world.js';

const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());
const peblosRegion = world.regions.find(region => region.name === 'Peblos');

/** A flood over whole metres inside a box: can a walker of `radius` get from `from` to `to`? */
function reachable(from, to, radius = .45, margin = 26) {
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

test('Peblos is a playable region true to the atlas: nine hexes in six islands off Drent’s south-east coast', () => {
  assert.ok(PLAYABLE_REGIONS.includes('Peblos'));
  assert.equal(REGION_IDS.Peblos, 7);
  const cells = REGION_CELLS.Peblos, counts = {};
  for (const cell of cells) counts[cell.terrain] = (counts[cell.terrain] ?? 0) + 1;
  assert.equal(cells.length, 9, 'the atlas gives Peblos nine hexes');
  assert.deepEqual(counts, { hills: 5, plains: 4 });
  // The number, the sizes and the spread of the islands come from the map, not from this file.
  assert.equal(PEBLOS_ISLANDS.length, 6, 'nine hexes that touch nowhere but in two places: six islands');
  assert.deepEqual(PEBLOS_ISLANDS.map(island => island.hexes), [3, 2, 1, 1, 1, 1]);
  assert.equal(MAIN_ISLAND.hexes, 3);
  assert.equal(MAIN_ISLAND.id, 'cobble-island');
  assert.equal(OUTER_ISLANDS.length, 5);
  for (const island of PEBLOS_ISLANDS) assert.ok(island.name && !island.name.includes('unnamed'), `${island.anchor} is named`);
  for (const island of OUTER_ISLANDS) assert.ok(PEBLOS_LANDMARKS.some(place => place.id === island.landmark), `${island.name} has its landmark`);
  // Every hex answers to Peblos, and the region has its own unique id and outline.
  for (const cell of cells) {
    assert.equal(regionAt(cell.x, cell.z).name, 'Peblos', `hex ${cell.q},${cell.r} belongs to Peblos`);
    assert.ok(insideRegion('Peblos', cell.x, cell.z));
  }
  assert.ok(peblosRegion && !world.regions.some(other => other !== peblosRegion && other.id === peblosRegion.id));
  assert.equal(REGION_OUTLINES.Peblos.length, 6, 'one outline loop per island');
  // South and east of Drent, and inside the world.
  const centre = list => list.reduce((sum, cell) => ({ x: sum.x + cell.x / list.length, z: sum.z + cell.z / list.length }), { x: 0, z: 0 });
  const peblos = centre(cells), drent = centre(REGION_CELLS.Drent);
  assert.ok(peblos.x > drent.x + 200 && peblos.z > drent.z + 200, 'Peblos lies south-east of Drent');
  for (const loop of REGION_OUTLINES.Peblos) for (const point of loop)
    assert.ok(point.x > WORLD_BOUNDS.minX && point.x < WORLD_BOUNDS.maxX && point.z > WORLD_BOUNDS.minZ && point.z < WORLD_BOUNDS.maxZ,
      'the world bounds hold every island');
  // The world reaches east past the islands now: West Izol stands further east again.
  assert.ok(WORLD_BOUNDS.maxX > 540, 'the world grew east to hold the islands');
  assert.ok(Math.max(...REGION_OUTLINES.Peblos.flat().map(point => point.x)) > WORLD_BOUNDS.maxX - 120,
    'and the outermost Pebble is still near its eastern edge');
  // Low, rocky, wind-cut: no forest, far fewer trees than Drent, and rock instead.
  assert.equal(REGION_BIOMES.Peblos.ownScatter, true);
  assert.ok(REGION_BIOMES.Peblos.treesPerHex < REGION_BIOMES.Drent.treesPerHex / 15);
  assert.ok(REGION_BIOMES.Peblos.rocksPerHex > REGION_BIOMES.Drent.rocksPerHex * 4);
  assert.ok(world.peblosMetrics.pines > 0 && world.peblosMetrics.pines < 30, 'a few wind-bent pines, not a wood');
  assert.ok(world.peblosMetrics.rocks > world.peblosMetrics.pines * 10, 'grey rock, not timber, is the islands’ own scatter');
});

test('The Stills lie between Drent and the islands: every island is ringed by open sea, and nothing between them is standable', () => {
  // Each island is an island: from its centre, in every direction, the coast is
  // followed by open water for a good way, so no bar joins one to another or to Drent.
  for (const island of PEBLOS_ISLANDS) {
    for (let bearing = 0; bearing < 36; bearing++) {
      const angle = bearing * Math.PI / 18, sin = Math.sin(angle), cos = Math.cos(angle);
      let coast = null;
      for (let r = 2; r <= 200 && coast === null; r += 2)
        if (landDistance(island.centre.x + sin * r, island.centre.z + cos * r) < 0) coast = r;
      assert.ok(coast !== null, `${island.name} has no coast on bearing ${bearing}`);
      // Past the beach — every shore in the game runs down through a few metres of wet sand.
      for (let r = coast + 8; r <= coast + 30; r += 2) {
        const x = island.centre.x + sin * r, z = island.centre.z + cos * r;
        assert.ok(landDistance(x, z) < 0, `${island.name} is joined to something at ${x.toFixed(0)}, ${z.toFixed(0)}`);
        assert.equal(canStand(x, z, world), false, `standable water off ${island.name} at ${x.toFixed(0)}, ${z.toFixed(0)}`);
        assert.ok(world.heightAt(x, z) < SEA_LEVEL, `the sea stands above the water off ${island.name}`);
      }
    }
  }
  // The boat's own line. It passes Gull Scarp, which is what the pilots are for;
  // everywhere else between the two quays is open water a traveler cannot walk.
  const pier = FERRY_LANDINGS.drent.stand, quay = FERRY_LANDINGS.peblos.stand;
  let wet = 0, aground = 0;
  const clipped = new Set();
  for (let t = 0; t <= 1; t += .002) {
    const x = pier.x + (quay.x - pier.x) * t, z = pier.z + (quay.z - pier.z) * t;
    if (Math.hypot(x - pier.x, z - pier.z) < 40 || Math.hypot(x - quay.x, z - quay.z) < 40) continue;
    // A shore shelves for a few metres; that beach counts as its island, not as the channel.
    const island = islandAt(x, z);
    if (island && landDistance(x, z) > -8) { aground++; clipped.add(island.name); continue; }
    wet++;
    assert.equal(canStand(x, z, world), false, `standable water on the crossing at ${x.toFixed(0)}, ${z.toFixed(0)}`);
    assert.ok(world.heightAt(x, z) < SEA_LEVEL, `the channel is above water at ${x.toFixed(0)}, ${z.toFixed(0)}`);
  }
  assert.ok(wet > 250, 'the crossing is mostly open sea');
  assert.ok(aground > 0 && wet > aground, 'the straight line from pier to quay is not all water');
  assert.deepEqual([...clipped], ['Gull Scarp'], 'and what it clips is Gull Scarp, which is what the pilots are for');
  // From the shore of either, the water reads as water: the ground falls away below the sea on both coasts.
  for (const [x, z] of [[40, 29], [200, 200], [292, 428], [378, 290], [520, 460], [160, 380]])
    assert.ok(bedrockHeight(x, z) < SEA_LEVEL, `the sea floor is above water at ${x}, ${z}`);
});

test('Cobble stands on its terrace: ten roofs, a quay out over the water, and stands a traveler can reach', () => {
  assert.equal(COBBLE_BUILDINGS.length, 10, 'a harbour village of eight to twelve buildings');
  assert.equal(world.peblosMetrics.buildings, 10);
  for (const building of COBBLE_BUILDINGS) {
    assert.ok(insideRegion('Peblos', building.x, building.z), `${building.id} stands on the island`);
    assert.ok(landDistance(building.x, building.z) > 2, `${building.id} stands above the tide`);
    for (const other of COBBLE_BUILDINGS) if (other !== building)
      assert.ok(Math.hypot(other.x - building.x, other.z - building.z) > (Math.max(building.width, building.depth) + Math.max(other.width, other.depth)) / 2,
        `${building.id} and ${other.id} overlap`);
  }
  // The terrace is a levelling of the rock, not new land taken from the bay.
  assert.equal(TERRAIN_PADS.some(pad => pad.id === 'cobble' && pad.shore), true);
  assert.ok(Math.abs(world.heightAt(COBBLE.centre.x, COBBLE.centre.z) - COBBLE_TERRACE.level) < .01, 'the village ground is the terrace');
  for (let x = COBBLE_QUAY.head.x - 22; x < COBBLE_QUAY.head.x - 2; x += 2)
    assert.ok(bedrockHeight(x, COBBLE_QUAY.head.z) < SEA_LEVEL, `the bay in front of the quay is still water at ${x}`);
  // Every stand: standable, four metres from every other person, and reachable from where the boat lands.
  const stands = Object.entries(COBBLE_STANDS).concat([['boatman', FERRY_LANDINGS.peblos.stand]]);
  const ashore = FERRY_LANDINGS.peblos.ashore;
  for (const [id, stand] of stands) {
    assert.ok(canStand(stand.x, stand.z, world), `${id} cannot stand at ${stand.x}, ${stand.z}`);
    assert.ok(reachable(ashore, stand), `${id} is not reachable from the landing`);
    for (const [other, point] of stands) if (other !== id)
      assert.ok(Math.hypot(point.x - stand.x, point.z - stand.z) >= 4, `${id} and ${other} stand within four metres`);
  }
  // Working ground says what Cobble does: racks, pots, hulls and barrels, all of it on the island.
  for (const [kind, value] of Object.entries(COBBLE_WORKING)) for (const spot of Array.isArray(value) ? value : [value])
    assert.ok(islandAt(spot.x, spot.z) === MAIN_ISLAND && landDistance(spot.x, spot.z) > -1, `${kind} at ${spot.x}, ${spot.z} is off the island`);
  assert.ok(COBBLE_WORKING.racks.length >= 3 && COBBLE_WORKING.pots.length >= 3 && COBBLE_WORKING.hulls.length >= 3);
  // The gull rocks break the surface off the quay: stone, not a bar a traveler can walk out on.
  for (const rock of COBBLE_GULL_ROCKS) {
    assert.ok(landDistance(rock.x, rock.z) < 2, 'a gull rock is inland');
    assert.equal(canStand(rock.x, rock.z, world), false, 'a gull rock is standable');
  }
});

test('The quay is walkable out over the water, and stops at its head', () => {
  const root = COBBLE_QUAY.root, head = COBBLE_QUAY.head;
  assert.equal(quayHeight(root.x, root.z), COBBLE_QUAY.deckY);
  assert.equal(quayHeight(head.x - 3, head.z), null, 'the deck ends at the head');
  const walker = { x: root.x, z: root.z };
  moveCharacter(walker, head.x + 1.5 - root.x, 0, world);
  assert.ok(Math.abs(walker.x - (head.x + 1.5)) < .6, `walking the quay stopped at ${walker.x.toFixed(1)}`);
  moveCharacter(walker, -6, 0, world);
  assert.ok(walker.x > head.x - 1.2, 'nobody walks off the head into the bay');
  for (const [x, z] of [[head.x - 2, head.z], [head.x - 3, head.z], [head.x + 6, COBBLE_QUAY.minZ - 4]])
    assert.equal(canStand(x, z, world), false, `the water beside the quay is standable at ${x}, ${z}`);
  const mooring = FERRY_LANDINGS.peblos.mooring;
  assert.ok(world.heightAt(mooring.x, mooring.z) < SEA_LEVEL - .8, 'the ferryman’s boat lies afloat, not aground');
  // The traveler is set down on the deck, and the landing is inside the world the checkpoint will accept.
  const ashore = FERRY_LANDINGS.peblos.ashore;
  assert.equal(quayHeight(ashore.x, ashore.z), COBBLE_QUAY.deckY);
  assert.ok(canStand(ashore.x, ashore.z, world));
  assert.ok(canStand(FERRY_LANDINGS.drent.ashore.x, FERRY_LANDINGS.drent.ashore.z, world), 'and on Tidehaven’s pier coming back');
});

test('Every place in Peblos stands on its own island, above the tide, and is charted', () => {
  assert.ok(PEBLOS_LANDMARKS.length >= 10);
  for (const place of PEBLOS_LANDMARKS) {
    assert.ok(place.description && place.description.length > 40, `${place.id} has discovery text`);
    assert.ok(islandAt(place.x, place.z), `${place.id} is not on an island`);
    assert.ok(landDistance(place.x, place.z) > -1, `${place.id} is under water`);
    assert.ok(world.landmarks.some(entry => entry.id === place.id), `${place.id} is not in the world's places`);
  }
  for (const island of OUTER_ISLANDS) {
    const place = PEBLOS_LANDMARKS.find(entry => entry.id === island.landmark);
    assert.equal(islandAt(place.x, place.z), island, `${place.id} belongs on ${island.name}`);
  }
  for (const id of ['headland-light', 'seal-cove', 'drowned-field', 'sea-shrine', 'cobble', 'cobble-quay'])
    assert.equal(islandAt(PEBLOS_LANDMARKS.find(place => place.id === id).x, PEBLOS_LANDMARKS.find(place => place.id === id).z), MAIN_ISLAND,
      `${id} belongs on the main island`);
  assert.ok(HEADLAND_LIGHT.z < COBBLE.centre.z - 40 && SEAL_COVE.z > COBBLE.centre.z + 40, 'the light is north of the village and the cove south');
  assert.ok(bedrockHeight(HEADLAND_LIGHT.x, HEADLAND_LIGHT.z) > bedrockHeight(COBBLE.centre.x, COBBLE.centre.z) + 6, 'the light keeps the high rock');
  assert.ok(landDistance(DROWNED_FIELD.x, DROWNED_FIELD.z) < 20 && landDistance(SEA_SHRINE.x, SEA_SHRINE.z) > 8);
  // The chart: one named area for the village, one for each end of the main island, and one for each outer island.
  const areas = SUBREGIONS.filter(area => area.region === 'Peblos');
  assert.equal(areas.length, 8);
  for (const area of areas) {
    assert.equal(regionAt(area.x, area.z).name, 'Peblos', `${area.id} is charted in the wrong region`);
    for (const other of SUBREGIONS) if (other !== area)
      assert.ok(Math.hypot(other.x - area.x, other.z - area.z) > area.radius + other.radius, `${area.id} overlaps ${other.id}`);
  }
  assert.ok(subregionsAt(COBBLE.centre.x, COBBLE.centre.z).some(area => area.id === 'cobble'));
  for (const island of OUTER_ISLANDS)
    assert.ok(areas.some(area => islandAt(area.x, area.z) === island), `${island.name} is not charted`);
  // The islands are drawn back over the chart's water, or the Pebbles read as more of the Stills.
  // West Izol is drawn back the same way, so count only the Pebbles' own outlines.
  const pebbleLands = world.mapLands.filter(land => land.region === 'Peblos');
  assert.equal(pebbleLands.length, PEBLOS_ISLANDS.length);
  for (const land of pebbleLands) {
    assert.equal(land.region, 'Peblos');
    assert.ok(land.points.length > 5 && land.points.every(point => Number.isFinite(point.x) && Number.isFinite(point.z)));
  }
  const chart = buildLocalMapModel({ world, position: COBBLE.centre, regionId: REGION_IDS.Peblos, discoveries: new Set(['cobble']) });
  assert.equal(chart.region.id, REGION_IDS.Peblos);
  assert.ok(chart.lands.length >= 1, 'the local chart draws the island under the village');
  assert.ok(chart.landmarks.some(marker => marker.id === 'cobble' && marker.known));
  assert.ok(chart.buildings.length >= 8, 'the chart shows Cobble’s roofs');
});

test('The islands carry their own scatter, and none of it stands in the village or below the tide', () => {
  const own = world.colliders.filter(collider => ['region-tree', 'shore-rock', 'gorse'].includes(collider.kind)
    && islandAt(collider.x, collider.z));
  assert.ok(own.length > 30, 'the islands are scattered, not bare');
  for (const collider of own) {
    assert.ok(landDistance(collider.x, collider.z) > 0, `scatter below the tideline at ${collider.x.toFixed(0)}, ${collider.z.toFixed(0)}`);
    assert.equal(inCobble(collider.x, collider.z), false, 'scatter inside the village');
    assert.equal(quayHeight(collider.x, collider.z), null, 'scatter on the quay');
  }
  for (const clearing of PEBLOS_CLEARINGS) assert.ok(clearing.r > 0 && islandAt(clearing.x, clearing.z));
  // Batched island by island: a camera at Cobble submits nothing of the Saltings.
  assert.ok(world.peblosMetrics.batches >= PEBLOS_ISLANDS.length, 'each island batches its own scatter');
  assert.ok(world.peblosMetrics.batches < 60, 'and not one batch per bush');
});

test('Peblos is level one: fishing people, a bored garrison, and nothing that can kill the first hour', () => {
  assert.equal(REGION_DESIGN.find(entry => entry.id === 'Peblos').level, 1);
  assert.equal(PEBLOS_NPCS.length, 11);
  assert.equal(PEBLOS_NPCS.filter(npc => npc.modelRole?.startsWith('legion')).length, 4, 'a lieutenant and three soldiers');
  assert.equal(PEBLOS_NPCS.every(npc => !npc.armed), true, 'nobody on the quay has a blade out');
  for (const npc of PEBLOS_NPCS) {
    assert.ok(PEBLOS_AMBIENT[npc.id]?.length >= 2, `${npc.id} has something to say`);
    assert.ok(PEBLOS_NPC_POSITIONS[npc.id], `${npc.id} has a stand`);
    // Only Imperial soldiers wear Imperial armour.
    if (npc.modelRole?.startsWith('legion')) assert.match(npc.role, /Ambroni (soldier|officer)|army/);
    else assert.doesNotMatch(npc.role, /Ambroni (soldier|officer)|army/);
  }
  // The Empire's share is the seam that is written on, and it is written on by both sides.
  const said = Object.values(PEBLOS_AMBIENT).flat().join(' ');
  assert.match(said, /one barrel in five|fifth barrel|barrel in five/i);
  assert.match(PEBLOS_AMBIENT['peblos-decurion'].join(' '), /count|share|barrel/i);
  assert.match(PEBLOS_AMBIENT['cobble-netmistress'].join(' '), /Empire/);
  // Nothing in the Pebbles fights: no enemy stands, no encounter arena, no armed collider.
  assert.equal(world.colliders.some(collider => collider.kind === 'enemy' && islandAt(collider.x, collider.z)), false);
  let opened = null;
  const context = { openDialogue: (npc, lines, event, action, options) => { opened = { npc, lines, options }; }, closeDialogue: () => {} };
  assert.equal(peblosConversation(PEBLOS_NPCS[0], context), true);
  assert.ok(opened.lines.length >= 2 && opened.options.choices.length === 1);
  assert.equal(peblosConversation({ id: 'not-from-here' }, context), false);
});

test('The region card, the developer’s chart and the spawn tell the truth about how far Peblos got', () => {
  assert.equal(peblosRegion.subtitle, 'The islands off the Drent coast');
  assert.ok(peblosRegion.description.includes('Cobble'));
  assert.ok(canStand(peblosRegion.spawn.x, peblosRegion.spawn.z, world), 'the region spawn is standable');
  assert.equal(regionAt(peblosRegion.spawn.x, peblosRegion.spawn.z).name, 'Peblos');
  assert.equal(peblosRegion.npcIds.length, 12, 'eleven islanders and soldiers, and the boatman');
  for (const id of peblosRegion.landmarks) assert.ok(PEBLOS_LANDMARKS.some(place => place.id === id), `${id} is not a place in Peblos`);
  assert.equal(BUILD_STATUS.Peblos.state, 'early');
  const status = regionBuildStatus('Peblos');
  assert.equal(status.playable, true);
  assert.match(status.work, /outer islands/i);
  assert.equal(islandAt(COBBLE.centre.x, COBBLE.centre.z), MAIN_ISLAND, 'the village stands on the main island');
});
