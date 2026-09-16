import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampcraft } from '../src/campcraft.js';
import { createInventoryState } from '../src/inventory.js';
import { createWeapons } from '../src/weapons.js';

function fixture(items = {}, options = {}) {
  const inventory = createInventoryState();
  for (const [id, count] of Object.entries(items)) assert.equal(inventory.add(id, count), true, id);
  const weapons = createWeapons({ inventory });
  const events = [];
  const campcraft = createCampcraft({ inventory, weapons, onEvent: event => events.push(event), ...options });
  return { inventory, weapons, events, campcraft };
}

test('Bran grants one rod; a cast waits three seconds and a timely reel gives exactly one fish', () => {
  const { inventory, campcraft, events } = fixture();
  assert.equal(campcraft.cast().ok, false);
  assert.equal(campcraft.teachFishing().ok, true);
  assert.equal(campcraft.teachFishing().alreadyTaught, true);
  assert.equal(inventory.count('fishing-rod'), 1);
  assert.equal(campcraft.state.taught, true);
  assert.equal(events.filter(event => event.type === 'fishing-taught').length, 1);
  assert.equal(campcraft.cast().ok, true);
  campcraft.update(2.9);
  assert.equal(campcraft.state.phase, 'waiting');
  assert.equal(campcraft.cast().ok, false, 'casting twice cannot restart the timer');
  campcraft.update(.1);
  assert.equal(campcraft.state.phase, 'bite');
  assert.equal(campcraft.state.waitRemaining, 0);
  campcraft.update(2);
  assert.equal(campcraft.reel().ok, true);
  assert.equal(inventory.count('raw-fish'), 1);
  assert.equal(campcraft.state.phase, 'idle');
  assert.equal(campcraft.state.catches, 1);
  assert.equal(campcraft.reel().ok, false, 'repeated reeling cannot duplicate a catch');
  assert.equal(events.filter(event => event.type === 'catch').length, 1);
});

test('early reeling, missed bite windows, cancellation, and slow frames never award fish', () => {
  const { inventory, campcraft, events } = fixture({ 'fishing-rod': 1 });
  campcraft.cast(); campcraft.update(1);
  assert.equal(campcraft.reel().ok, false);
  assert.equal(campcraft.state.phase, 'idle');
  campcraft.cast(); campcraft.update(5.2);
  assert.equal(campcraft.state.phase, 'idle');
  assert.equal(events.filter(event => event.type === 'miss').length, 2);
  campcraft.cast(); campcraft.update(3);
  assert.equal(campcraft.cancelFishing().ok, true);
  assert.equal(campcraft.state.phase, 'idle');
  assert.equal(campcraft.state.biteRemaining, 0);
  campcraft.update(30);
  assert.equal(campcraft.reel().ok, false);
  assert.equal(inventory.count('raw-fish'), 0);
  assert.equal(campcraft.state.catches, 0);
});

test('pausing and invalid time preserve both fishing timers and fire fuel', () => {
  const { campcraft } = fixture({ 'fishing-rod': 1, tinderbox: 1, 'forest-stick': 2 });
  campcraft.cast(); campcraft.light('village-fire'); campcraft.update(1);
  const before = campcraft.state;
  campcraft.update(100, false);
  for (const dt of [0, -1, NaN, Infinity, '3']) campcraft.update(dt);
  assert.deepEqual(campcraft.state, before);
  campcraft.update(2);
  assert.equal(campcraft.state.phase, 'bite');
  assert.equal(campcraft.fireStatus('village-fire').fuel, 117);
  campcraft.update(2.2);
  assert.equal(campcraft.state.phase, 'idle');
});

test('lighting requires a reusable tinderbox and exactly two sticks, without wasting fuel on a lit fire', () => {
  const { inventory, campcraft } = fixture({ 'forest-stick': 3 });
  assert.equal(campcraft.light('village-fire').ok, false);
  assert.equal(inventory.count('forest-stick'), 3);
  inventory.grant('tinderbox');
  assert.equal(campcraft.light('village-fire').ok, true);
  assert.equal(inventory.count('forest-stick'), 1);
  assert.equal(inventory.count('tinderbox'), 1);
  assert.equal(campcraft.fireStatus('village-fire').fuel, 120);
  assert.equal(campcraft.light('village-fire').ok, false);
  assert.equal(inventory.count('forest-stick'), 1);
  assert.equal(campcraft.light('pond-fire').ok, false);
  assert.equal(campcraft.light('missing-fire').ok, false);
  assert.equal(campcraft.fireStatus('missing-fire').canCook, false);
});

test('a burning fire cooks one fish at a time, pauses with the world, then expires and can be relit', () => {
  const { inventory, campcraft } = fixture({ tinderbox: 1, 'forest-stick': 4, 'raw-fish': 2 });
  assert.equal(campcraft.cook('pond-fire').ok, false);
  assert.equal(inventory.count('raw-fish'), 2);
  campcraft.light('pond-fire');
  assert.equal(campcraft.cook('pond-fire').ok, true);
  assert.equal(inventory.count('raw-fish'), 1);
  assert.equal(inventory.count('cooked-fish'), 1);
  assert.equal(campcraft.fireStatus('pond-fire').fuel, 120, 'cooking adds no hidden fuel cost');
  campcraft.update(119);
  assert.equal(campcraft.fireStatus('pond-fire').lit, true);
  campcraft.update(1);
  assert.equal(campcraft.fireStatus('pond-fire').lit, false);
  assert.equal(campcraft.cook('pond-fire').ok, false);
  assert.equal(inventory.count('raw-fish'), 1);
  assert.equal(campcraft.light('pond-fire').ok, true);
  assert.equal(campcraft.cook('pond-fire').ok, true);
  assert.equal(inventory.count('raw-fish'), 0);
  assert.equal(inventory.count('cooked-fish'), 2);
  assert.equal(campcraft.cook('pond-fire').ok, false);
  assert.equal(inventory.count('tinderbox'), 1);
});

test('failed recipe mutations preserve ingredients, fuel, and catch counts', () => {
  const { inventory, weapons } = fixture({ tinderbox: 1, 'forest-stick': 2, 'raw-fish': 1, 'fishing-rod': 1 });
  const blockedFire = createCampcraft({ inventory, weapons: { spendSticks: () => false } });
  assert.equal(blockedFire.light('village-fire').ok, false);
  assert.equal(blockedFire.fireStatus('village-fire').fuel, 0);
  assert.equal(inventory.count('forest-stick'), 2);
  const rejectCooked = { ...inventory, add: (id, count) => id === 'cooked-fish' ? false : inventory.add(id, count) };
  const campcraft = createCampcraft({ inventory: rejectCooked, weapons });
  campcraft.light('village-fire');
  assert.equal(campcraft.cook('village-fire').ok, false);
  assert.equal(inventory.count('raw-fish'), 1);
  assert.equal(inventory.count('cooked-fish'), 0);
  assert.equal(campcraft.fireStatus('village-fire').fuel, 120);
  rejectCooked.remove = () => false;
  assert.equal(campcraft.cook('village-fire').ok, false);
  assert.equal(inventory.count('raw-fish'), 1);
  rejectCooked.add = () => false;
  campcraft.cast(); campcraft.update(3);
  assert.equal(campcraft.reel().ok, false);
  assert.equal(campcraft.state.catches, 0);
  assert.equal(inventory.count('raw-fish'), 1);
});

test('configured fires are independent and exposed state cannot mutate the simulation', () => {
  const { campcraft } = fixture({ tinderbox: 1, 'forest-stick': 4 }, { fireIds: ['north', 'south'] });
  campcraft.light('north'); campcraft.update(20); campcraft.light('south');
  assert.equal(campcraft.fireStatus('north').fuel, 100);
  assert.equal(campcraft.fireStatus('south').fuel, 120);
  const snapshot = campcraft.state;
  snapshot.phase = 'bite'; snapshot.fires.north.fuel = 500; snapshot.catches = 100;
  assert.equal(campcraft.state.phase, 'idle');
  assert.equal(campcraft.state.fires.north.fuel, 100);
  assert.equal(campcraft.state.catches, 0);
  assert.equal(campcraft.light('village-fire').ok, false);
});
