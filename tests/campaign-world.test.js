import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  REGION_DESIGN, NAME_ALIASES, UNRESOLVED_ALIASES, LEVELS, FACTIONS, THREATS, SETTLEMENTS, LEVEL_ONE_PROVINCES,
  canonicalRegionName, describeRegion, computeAdjacency, regionsByLevel, provisionalLevel, climateSummary, terrainCounts, levelInfo,
} from '../src/campaign-world.js';

const survey = JSON.parse(readFileSync(new URL('../assets/azhora-dev-regions.json', import.meta.url), 'utf8'));
const atlasNames = new Set(survey.regions.map(region => region.name));

test('every designed region, alias target and settlement region is an authored atlas region', () => {
  for (const entry of REGION_DESIGN) assert.ok(atlasNames.has(entry.id), `${entry.id} is not on the authored map`);
  for (const [alias, target] of Object.entries(NAME_ALIASES)) assert.ok(atlasNames.has(target), `${alias} → ${target} is not on the authored map`);
  for (const place of Object.values(SETTLEMENTS)) assert.ok(atlasNames.has(place.region), `${place.name} sits in unknown region ${place.region}`);
  assert.equal(new Set(REGION_DESIGN.map(entry => entry.id)).size, REGION_DESIGN.length);
  for (const entry of REGION_DESIGN) {
    assert.ok(levelInfo(entry.level), `${entry.id} has an unknown level`);
    assert.ok(Object.hasOwn(FACTIONS, entry.control), `${entry.id} has an unknown controller`);
    for (const threat of entry.threats) assert.ok(Object.hasOwn(THREATS, threat), `${entry.id} lists unknown threat ${threat}`);
  }
});

test('the levels follow the brief: tutorial provinces, the five level-one arcs, and the hard frontier', () => {
  assert.deepEqual(regionsByLevel(0).sort(), ['Drent', 'Elagos', 'West Izol']);
  assert.deepEqual(regionsByLevel(1).sort(), ['East Izol', ...LEVEL_ONE_PROVINCES].sort());
  for (const id of ['Moros Plain', 'West Suval', 'East Suval', 'Amod', 'Feradom', 'Nesdor', 'Caricas']) assert.equal(describeRegion(id).level, 2, id);
  for (const id of ['South Suval', 'East Lotharn Mountains', 'Ovesos', 'South Mithala', 'East Pyros', 'West Pyros', 'Isareos', 'Yunethre', 'Nethereum', 'Nether Desert']) assert.equal(describeRegion(id).level, 3, id);
  for (const id of ['West Lotharn Mountains', 'Oves Desert', 'North Ibenwood', 'East Ibenwood', 'South Ibenwood', 'West Ibenwood', 'North Mithala', 'East Mithala', 'North Celder', 'Navarth', 'Ganesh Desert', 'Babon']) assert.equal(describeRegion(id).level, 4, id);
  for (const id of ['Central Ibenwood', 'South Oremindi Mountains', 'Dinelv Highlands', 'Cape Heth']) assert.equal(describeRegion(id).level, 5, id);
  assert.equal(describeRegion('Henborth').provisional, true);
  assert.equal(describeRegion('Drent').provisional, false);
  assert.equal(LEVELS.length, 6);
});

test('voice-to-text spellings resolve to authored names; unknown words do not', () => {
  const heard = { Poeth: 'Pueth', Lucia: 'Luscia', Lycia: 'Luscia', Ellagos: 'Elagos', Eligos: 'Elagos', Pedlos: 'Peblos', 'Pyros Plain': 'Moros Plain',
    Catarcaz: 'Caricas', 'Ferodon': 'Feradom', 'Amad': 'Amod', 'Nestor': 'Nesdor', 'KF': 'Cape Heth', 'Ganal Highlands': 'Dinelv Highlands',
    'North Kelder': 'North Celder', 'Alidor': 'Alezhor', 'Lvarth': 'Navarth', 'Central Ebonywood': 'Central Ibenwood', 'Cape of Thamalgar': 'Cape Thalmagar',
    'the Moros Plain': 'Moros Plain', 'drent': 'Drent', 'WEST SUVAL': 'West Suval' };
  for (const [spoken, expected] of Object.entries(heard)) assert.equal(canonicalRegionName(spoken), expected, spoken);
  assert.equal(canonicalRegionName('Westnias'), null);
  assert.equal(canonicalRegionName(''), null);
  assert.equal(canonicalRegionName(42), null);
  assert.equal(canonicalRegionName('Cold Stones', survey.regions), 'Cold Stones');
  assert.ok(UNRESOLVED_ALIASES.some(entry => entry.heard === 'Westnias'));
});

test('adjacency from the hex survey matches the brief’s geography around Drent', () => {
  const adjacency = computeAdjacency(survey.regions);
  const names = id => adjacency.get(id).map(entry => entry.id);
  assert.deepEqual(names('Drent'), ['Pueth', 'Luscia', 'Elagos']);
  assert.deepEqual(names('Peblos'), [], 'Peblos is an island reached by boat or swimming');
  assert.ok(names('Luscia').includes('Moros Plain') && names('Luscia').includes('East Suval') && names('Luscia').includes('West Suval'));
  assert.ok(names('Moros Plain').includes('West Suval') && names('Moros Plain').includes('Elagos') && names('Moros Plain').includes('Nesdor'));
  assert.ok(names('Caricas').includes('Meneth') && names('Caricas').includes('Nesdor'));
  assert.ok(names('Amod').includes('East Lotharn Mountains') && names('East Lotharn Mountains').includes('South Mithala'));
  assert.ok(names('Ovesos').includes('Oves Desert') && names('Nesdor').includes('Ovesos'));
  assert.ok(names('Cape Heth').includes('Dinelv Highlands'));
  for (const [id, neighbors] of adjacency) for (const neighbor of neighbors)
    assert.ok(adjacency.get(neighbor.id).some(entry => entry.id === id && entry.border === neighbor.border), `${id}/${neighbor.id} adjacency is symmetric`);
});

test('describeRegion merges design with the survey and falls back to provisional terrain levels', () => {
  const adjacency = computeAdjacency(survey.regions);
  const drent = describeRegion('Drent', survey.regions, adjacency);
  assert.equal(drent.level, 0); assert.equal(drent.levelName, 'Tutorial'); assert.equal(drent.faction.id, 'empire');
  assert.equal(drent.hexes, 39); assert.equal(drent.neighbors[0].id, 'Pueth');
  assert.deepEqual(drent.threats.map(threat => threat.id), ['bramble-goblin']);
  assert.deepEqual(drent.settlements.map(place => place.name), ['Tidehaven', 'The Torn mouth']);
  assert.match(drent.terrain, /grassland 87%/);
  const coldStones = describeRegion('Cold Stones', survey.regions, adjacency);
  assert.equal(coldStones.provisional, true); assert.equal(coldStones.level, 4); assert.equal(coldStones.control, 'wild');
  assert.equal(coldStones.hexes, 61);
  assert.equal(describeRegion('Nowhere', survey.regions), null);
  assert.equal(describeRegion('Amod').hexes, 0, 'design alone still describes a region');
  assert.equal(provisionalLevel({ deep_jungle: 10 }), 4);
  assert.equal(provisionalLevel({ plains: 10 }), 3);
  assert.equal(climateSummary({}), 'Unsurveyed.');
  assert.deepEqual(terrainCounts(null), {});
});

test('design objects are frozen and cannot be edited by callers', () => {
  assert.throws(() => { REGION_DESIGN[0].level = 9; }, TypeError);
  assert.throws(() => { FACTIONS.empire.name = 'x'; }, TypeError);
  assert.throws(() => { NAME_ALIASES.poeth = 'x'; }, TypeError);
});

test('the Coalition roster names real regions and Pyros is one empire across East and West Pyros', async () => {
  const { COALITION_MEMBERS } = await import('../src/campaign-world.js');
  for (const member of COALITION_MEMBERS) for (const id of member.regions) assert.ok(atlasNames.has(id), `${member.name} names unknown region ${id}`);
  assert.deepEqual(COALITION_MEMBERS.map(member => member.id), ['izoli', 'suval', 'ambroni-rebels', 'pyros', 'selemis', 'marosh', 'island-cities']);
  assert.equal(FACTIONS.pyrosi.name, 'Pyros');
  assert.equal(describeRegion('East Pyros').control, describeRegion('West Pyros').control);
  assert.equal(atlasNames.has('South Pyros'), false);
  assert.match(FACTIONS.coalition.note, /Selemis/);
});
