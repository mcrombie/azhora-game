import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PLAYABLE, WINDOW } from '../scripts/build-region-survey.mjs';
import { RIVER_REGIONS, readMap } from '../scripts/build-region-rivers.mjs';
import { PLAYABLE_REGIONS, REGION_BIOMES } from '../src/world/terrain/region-layout.js';
import { PLAYABLE_SURVEY, LAND_HEXES } from '../src/dev/tools/region-survey.js';
import { REGION_IDS, REGION_CELLS, REGION_TERRAIN, WORLD_BOUNDS, hexCentre, regionAt, terrainMix } from '../src/world/terrain/region-world.js';
import { RIVER_EDGES } from '../src/world/terrain/region-rivers.js';
import { DEV_WORLD_DESTINATIONS } from '../src/dev/tools/developer-atlas.js';
import { describeRegion } from '../src/content/chapters/civil-war/campaign-world.js';
import { buildStatusList, regionBuildStatus } from '../src/dev/tools/build-status.js';

const name = 'South Oremindi Mountains';
const atlas = JSON.parse(readFileSync(new URL('../assets/azhora-dev-regions.json', import.meta.url), 'utf8'));

test('South Oremindi appends region 37 while preserving the Mithala reservations and Ibenwood IDs', () => {
  // Not `.at(-1)`: Yunethre came after it, and thirteen more after that. Its own id's place is what holds.
  assert.equal(PLAYABLE_REGIONS[REGION_IDS[name] - 1], name);
  assert.equal(PLAYABLE[REGION_IDS[name] - 1], name);
  assert.equal(REGION_IDS[name], 37);
  assert.deepEqual(['East', 'North', 'South', 'West', 'Central'].map(side => REGION_IDS[`${side} Ibenwood`]), [32, 33, 34, 35, 36]);
  // The reservation was honoured: the four Mithala countries landed on exactly these four.
  assert.deepEqual(['South', 'West', 'East', 'North'].map(side => REGION_IDS[`${side} Mithala`]), [28, 29, 30, 31]);
  assert.equal(new Set(Object.values(REGION_IDS)).size, Object.keys(REGION_IDS).length);
});

test('South Oremindi retains all 45 authored cells and its two lake components without widening the world', () => {
  const cells = PLAYABLE_SURVEY.regions.find(region => region.name === name).cells;
  const authored = atlas.regions.find(region => region.name === name).cells;
  assert.deepEqual(cells, authored.map(({ q, r, terrain }) => ({ q, r, terrain })));
  const counts = {};
  for (const cell of cells) counts[cell.terrain] = (counts[cell.terrain] ?? 0) + 1;
  assert.deepEqual(counts, { hills: 19, high_mountain: 20, lake: 6 });
  assert.deepEqual(cells.filter(cell => cell.terrain === 'lake').map(({ q, r }) => [q, r]),
    [[-14, 98], [-16, 99], [-15, 99], [-17, 100], [-18, 101], [-15, 102]]);
  const land = new Set(LAND_HEXES.map(([q, r]) => `${q},${r}`));
  for (const cell of REGION_CELLS[name]) {
    assert.equal(regionAt(cell.x, cell.z).name, name);
    assert.ok(land.has(`${cell.q},${cell.r}`), 'owned lakes remain inland water, not sea');
    assert.ok(cell.q >= WINDOW.minQ && cell.q <= WINDOW.maxQ && cell.r >= WINDOW.minR && cell.r <= WINDOW.maxR);
  }
  // Since the Baldro Mountains landed as regions 52 and 53 the eastern and northern edges are theirs:
  // maxX 2209.998, minZ -3899.247, the world 68.20 by 73.369 hexes, the window's maxQ 60 and minR 59.
  // Babon now sets the southern edge at z3437.632, two atlas rows beyond Trogo.
  // Every assertion below that holds one of those numbers holds the Baldros' and nothing of this country's.
  const oldBounds = { minX: -4610.001927939127, maxX: 2209.9980720608737, minZ: -3899.2468035704924, maxZ: 3437.6315612998296 };
  // North and south are North Mithala's and Trogo's since they landed; east and west are as they were.
  // South Oremindi still spends none of the four.
  for (const key of Object.keys(oldBounds)) assert.ok(Math.abs(WORLD_BOUNDS[key] - oldBounds[key]) < 1e-8, key);
});

test('registration preserves existing North Ibenwood ground beside the new mountain region', () => {
  assert.deepEqual(REGION_TERRAIN[name], REGION_TERRAIN.outland);
  assert.ok(REGION_BIOMES[name].ownScatter, 'regional vegetation does not consume the existing shared scatter sequence');
  // Captured before registration: forest centres and the forest side 35 m toward the border.
  const prior = [
    [-20, 103, 0, 24.06756756756757, 3.72972972972973, 154.05405405405406],
    [-20, 103, -35, 20.020945914902292, 4.460732350856361, 152.74869223061364],
    [-17, 103, 0, 25.533783783783772, 3.4648648648648677, 154.52702702702703],
    [-17, 103, -35, 23.510472957451125, 3.8303661754281837, 153.87434611530682],
    [-16, 102, 0, 21.135135135135123, 4.259459459459461, 153.1081081081081],
    [-16, 102, -35, 17.279912561795754, 4.955886763030445, 151.8644879231599],
  ];
  for (const [q, r, dz, base, amp, wave] of prior) {
    const p = hexCentre(q, r), mix = terrainMix(p.x, p.z + dz);
    for (const [key, value] of Object.entries({ base, amp, wave })) assert.ok(Math.abs(mix[key] - value) < 1e-10, `${q},${r} ${dz}: ${key}`);
  }
});

test('the South Oremindi developer arrival stands on its southern hills and reports environment scope honestly', () => {
  const destination = DEV_WORLD_DESTINATIONS.find(item => item.region === 37);
  assert.equal(destination.regionId, name);
  assert.equal(destination.travelTarget, 'south-oremindi');
  assert.deepEqual([destination.atlas.q, destination.atlas.r], [-19, 102]);
  const arrival = hexCentre(-19, 102), region = regionAt(arrival.x, arrival.z);
  assert.deepEqual(region.spawn, arrival);
  assert.equal(region.id, 37);
  assert.deepEqual(region.npcIds, []);
  assert.equal(describeRegion(name).level, 5);
  const status = regionBuildStatus(name);
  assert.equal(status.state, 'environment');
  assert.ok(status.playable);
  assert.match(status.work, /sage.*campaign.*unbuilt/);
  assert.deepEqual(buildStatusList().slice(0, PLAYABLE_REGIONS.length).map(item => item.id), [...PLAYABLE_REGIONS]);
});

test('South Oremindi river export remains empty because the authored region contains no mapped river edges', () => {
  assert.ok(RIVER_REGIONS.includes(name));
  assert.equal(RIVER_EDGES.filter(edge => edge.regions.includes(name)).length, 0);
  const source = readMap();
  if (!source) return;
  for (const key of Object.keys(source.map.rivers)) {
    assert.ok(!key.split('|').some(point => source.map.hexes[point]?.region === name), key);
  }
});
