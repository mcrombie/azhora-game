import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { REGION_LEVELS, LEVEL_WORDS, LEVEL_COUNTS, regionLevel, levelWords } from '../src/region-levels.js';

const atlas = JSON.parse(readFileSync(fileURLToPath(new URL('../assets/azhora-dev-regions.json', import.meta.url)), 'utf8'))
  .regions.map(region => region.name);

test('every country on the atlas has a level, and nothing has a level that is not a country', () => {
  assert.equal(atlas.length, 131);
  assert.deepEqual(Object.keys(REGION_LEVELS).sort(), [...atlas].sort(), 'the table and the atlas name the same places');
  for (const [name, level] of Object.entries(REGION_LEVELS)) {
    assert.ok(Number.isInteger(level) && level >= 0 && level <= 10, `${name} is level ${level}`);
  }
  // Eleven is the hidden island, which is not on the atlas and so cannot be in the table.
  assert.ok(!Object.values(REGION_LEVELS).includes(11));
  assert.equal(regionLevel('Drent'), 0);
  assert.equal(regionLevel('Lizeem'), null, 'the Lizeem is a river through Caricas, never a region');
  assert.equal(regionLevel('Midy Mountains'), null, 'the Midy were the Oremindi said twice');
  assert.equal(regionLevel(undefined), null);
});

test('the ladder the user approved, region by region', () => {
  const expected = {
    Drent: 0, Elagos: 0, 'West Izol': 0,
    Luscia: 1, Peblos: 1, Pueth: 1, Vastos: 1, Meneth: 1, 'East Izol': 1,
    'East Suval': 2, 'West Suval': 2, 'Moros Plain': 2, Amod: 2, Nesdor: 2, Caricas: 2, Feradom: 2,
    Alezhor: 3, Gala: 3, 'South Ibenal': 3, 'North Meroshe Desert': 3,
    Navarth: 4, 'North Ibenal': 4, 'West Meroshe Desert': 4, 'South Meroshe Desert': 4, 'Central Meroshe Desert': 4,
    Henborth: 5, 'Dinelv Highlands': 5, 'Cape Heth': 5,
    'Cape Thalmagar': 8,
    'North Gorgi Mountains': 10, 'North Scythe': 10,
  };
  for (const [name, level] of Object.entries(expected)) assert.equal(regionLevel(name), level, name);
  // The road the game is actually on stays inside the first three rungs.
  for (const name of ['Drent', 'Luscia', 'Moros Plain', 'East Suval']) assert.ok(regionLevel(name) <= 2, name);
});

test('a region card has words for every level a region can be, and none for the island', () => {
  assert.equal(LEVEL_WORDS.length, 11);
  for (let level = 0; level <= 10; level++) {
    assert.equal(levelWords(level), LEVEL_WORDS[level]);
    assert.ok(levelWords(level).length > 8, `level ${level} has something to say`);
  }
  assert.equal(new Set(LEVEL_WORDS).size, LEVEL_WORDS.length, 'no two rungs say the same thing');
  assert.equal(levelWords(11), null, 'the hidden island is unknown until it is found');
  for (const bad of [-1, 1.5, '3', null, undefined, NaN]) assert.equal(levelWords(bad), null, String(bad));
});

test('the world gets harder than it is easy, and the two worst places are alone up there', () => {
  assert.equal(Object.values(LEVEL_COUNTS).reduce((sum, count) => sum + count, 0), atlas.length);
  const easy = [0, 1, 2].reduce((sum, level) => sum + LEVEL_COUNTS[level], 0);
  const hard = [7, 8, 9, 10].reduce((sum, level) => sum + LEVEL_COUNTS[level], 0);
  assert.ok(hard > easy, `${hard} regions at 7 or worse against ${easy} at 2 or better`);
  assert.equal(LEVEL_COUNTS[10], 2, 'the orcs’ homeland and the mountain island');
  assert.equal(LEVEL_COUNTS[0], 3, 'three quiet countries: Drent, Elagos, West Izol');
});
