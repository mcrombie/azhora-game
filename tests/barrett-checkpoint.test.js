import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoadCheckpoint } from '../src/app/saves/road-checkpoint.js';
import { createInventoryState } from '../src/gameplay/inventory/inventory.js';
import { createWeapons } from '../src/gameplay/combat/weapons.js';
import { createJourney } from '../src/content/chapters/journey/journey.js';
import { createCartography } from '../src/ui/map/cartography.js';
import { createBarrettGeography } from '../src/content/quests/skill-lessons/barrett-geography.js';
import { QUEST_DONE } from '../src/gameplay/movement/game-state.js';
import { METRES_PER_HEX } from '../src/world/terrain/world-scale.js';

function fixture() {
  const inventory = createInventoryState();
  for (const id of ['simple-sword', 'harbor-letter', 'road-token', 'tinderbox']) inventory.grant(id);
  const weapons = createWeapons({ wear: true, inventory }), journey = createJourney({ inventory, weapons });
  journey.start();
  const cartography = createCartography(); cartography.learn();
  const geography = createBarrettGeography({ cartography, regions: [{ name: 'Cape of Thalmagar' }, { name: 'Feradom' }], random: () => 0 });
  geography.ask(60);
  const data = { version: 1, ambronLayoutVersion: 2, worldScale: METRES_PER_HEX, questStage: QUEST_DONE,
    journey: journey.snapshot(), inventory: inventory.items().map(id => ({ id, quantity: inventory.count(id) })),
    weapons: weapons.snapshot(), journeyGathered: [], meadowCleared: false, position: { x: 3, z: -190 },
    heardDoom: true, lysaComplete: false, health: 100, playSeconds: 90,
    cartography: cartography.snapshot(), barrettGeography: geography.snapshot() };
  const values = new Map(), storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  return { data, checkpoint: createRoadCheckpoint({ storage }) };
}

test('road saves retain Barrett geography and cooldown alongside heard-only chart knowledge', () => {
  const { data, checkpoint } = fixture(), saved = checkpoint.save(data);
  assert.equal(saved.ok, true, saved.reason);
  const loaded = checkpoint.read().data;
  assert.deepEqual(loaded.barrettGeography, data.barrettGeography);
  assert.deepEqual(loaded.cartography, data.cartography);
  assert.equal(loaded.cartography.regions['Cape of Thalmagar'].state, 'heard');
  assert.equal(loaded.cartography.regions['Cape of Thalmagar'].hexes, 0);
  const chart = createCartography(); chart.restore(loaded.cartography);
  const geography = createBarrettGeography({ cartography: chart, regions: [{ name: 'Feradom' }] });
  geography.restore(loaded.barrettGeography);
  assert.equal(geography.remaining(loaded.playSeconds), 90);
  assert.equal(geography.ask(179.99).kind, 'quiet');
  assert.equal(geography.ask(180).region, 'Feradom');
  loaded.barrettGeography.told.push('Mutated copy');
  assert.deepEqual(checkpoint.read().data.barrettGeography, data.barrettGeography);
});

test('malformed or future Barrett state cannot overwrite a valid road checkpoint', () => {
  const { data, checkpoint } = fixture(); assert.equal(checkpoint.save(data).ok, true);
  for (const invalid of [null, { ...data.barrettGeography, lastAt: 91 },
    { ...data.barrettGeography, told: [] }, { ...data.barrettGeography, told: ['Feradom', 'Feradom'] },
    { ...data.barrettGeography, lastRegion: 'Unrecorded' }, { ...data.barrettGeography, lastAt: -1 }]) {
    assert.equal(checkpoint.save({ ...data, barrettGeography: invalid }).ok, false, JSON.stringify(invalid));
    assert.deepEqual(checkpoint.read().data.barrettGeography, data.barrettGeography);
  }
});

test('older road saves without Barrett state still load', () => {
  const { data, checkpoint } = fixture(); delete data.barrettGeography;
  assert.equal(checkpoint.save(data).ok, true);
  assert.equal(checkpoint.read().data.barrettGeography, undefined);
});
