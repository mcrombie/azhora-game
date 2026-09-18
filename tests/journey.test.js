import test from 'node:test';
import assert from 'node:assert/strict';
import { createJourney, PARCEL_IDS, BEACON_IDS } from '../src/journey.js';
import { createInventoryState } from '../src/inventory.js';
import { createWeapons } from '../src/weapons.js';

function fixture({ ready = true, initialItems = {} } = {}) {
  const inventory = createInventoryState();
  if (ready) { inventory.grant('harbor-letter'); inventory.grant('road-token'); }
  for (const [id, quantity] of Object.entries(initialItems)) inventory.add(id, quantity);
  const weapons = createWeapons({ wear: true, inventory });
  const events = [];
  const journey = createJourney({ inventory, weapons, onEvent: event => events.push(event) });
  return { inventory, weapons, events, journey };
}

function finishMeadow(journey) {
  assert.equal(journey.start().ok, true);
  assert.equal(journey.act('meet-courier').ok, true);
  for (const id of PARCEL_IDS) assert.equal(journey.act(`collect-${id}`).ok, true);
  assert.equal(journey.act('return-courier').ok, true);
}

function finishCrossing(journey) {
  assert.equal(journey.act('meet-crossing-keeper').ok, true);
  assert.equal(journey.act('repair-bridge').ok, true);
  assert.equal(journey.act('return-crossing-keeper').ok, true);
}

test('a journey begins only with the letter and road token; stale and out-of-order actions do nothing', () => {
  const { journey, inventory, events } = fixture({ ready: false });
  assert.equal(journey.view().stage, 'not-started');
  assert.deepEqual(journey.availableActions(), []);
  const before = journey.snapshot();
  assert.equal(journey.act('deliver-report').ok, false);
  assert.equal(journey.start().ok, false);
  inventory.grant('harbor-letter');
  assert.equal(journey.start().ok, false);
  assert.deepEqual(journey.snapshot(), before);
  inventory.grant('road-token');
  assert.equal(journey.start().ok, true);
  assert.equal(journey.start().ok, false);
  assert.equal(journey.act('repair-bridge').ok, false);
  assert.equal(journey.view().region, 2);
  assert.equal(journey.view().objectiveId, 'meadow-courier');
  assert.equal(events.length, 1);
});

test('meadow parcels can be recovered in any order exactly once, then return grants food once', () => {
  const { journey, inventory, events } = fixture();
  journey.start(); journey.act('meet-courier');
  assert.equal(journey.act('return-courier').ok, false);
  for (const id of [...PARCEL_IDS].reverse()) {
    assert.equal(journey.availableActions().some(action => action.objectiveId === id), true);
    assert.equal(journey.act(`collect-${id}`).ok, true);
    assert.equal(journey.act(`collect-${id}`).ok, false);
    assert.equal(journey.view().destinationIds.includes(id), false);
  }
  assert.equal(journey.act('return-courier').ok, true);
  assert.equal(inventory.count('cooked-fish'), 2);
  assert.equal(journey.act('return-courier').ok, false);
  assert.equal(inventory.count('cooked-fish'), 2);
  assert.equal(journey.view().region, 3);
  assert.deepEqual(journey.state.completedRegions, [2]);
  assert.deepEqual(events.map(event => event.sequence), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(events.at(-1).reward, { id: 'cooked-fish', quantity: 2 });
  assert.equal(events.at(-1).completedRegion, 2);
});

test('repair spends exactly three sticks, preserves the worn spare branch, and keeper gives four once', () => {
  const { journey, inventory, weapons } = fixture({ initialItems: { 'forest-stick': 4 } });
  weapons.equip('forest-stick'); weapons.contact('forest-stick');
  const condition = weapons.status('forest-stick').durability;
  finishMeadow(journey);
  assert.equal(journey.act('repair-bridge').ok, false);
  assert.equal(inventory.count('forest-stick'), 4);
  journey.act('meet-crossing-keeper');
  assert.equal(journey.act('repair-bridge').ok, true);
  assert.equal(inventory.count('forest-stick'), 1);
  assert.equal(weapons.status('forest-stick').durability, condition);
  assert.equal(journey.state.bridgeRepaired, true);
  assert.equal(journey.act('repair-bridge').ok, false);
  assert.equal(inventory.count('forest-stick'), 1);
  assert.equal(journey.act('return-crossing-keeper').ok, true);
  assert.equal(inventory.count('forest-stick'), 5);
  assert.equal(journey.act('return-crossing-keeper').ok, false);
  assert.equal(inventory.count('forest-stick'), 5);
  assert.equal(journey.view().region, 4);
});

test('insufficient sticks and a failed spend leave repair and inventory untouched', () => {
  const { journey, inventory } = fixture({ initialItems: { 'forest-stick': 2 } });
  finishMeadow(journey); journey.act('meet-crossing-keeper');
  const before = journey.snapshot();
  assert.equal(journey.availableActions()[0].enabled, false);
  assert.match(journey.act('repair-bridge').reason, /three sticks/);
  assert.equal(inventory.count('forest-stick'), 2);
  assert.deepEqual(journey.snapshot(), before);
  inventory.add('forest-stick', 1);
  const rejecting = createJourney({ inventory, weapons: { spendSticks: () => false } });
  assert.equal(rejecting.restore(before), true);
  assert.equal(rejecting.act('repair-bridge').ok, false);
  assert.equal(inventory.count('forest-stick'), 3);
  assert.deepEqual(rejecting.snapshot(), before);
});

test('failed rewards keep completed work ready for a safe retry without duplicate items', () => {
  const inventory = createInventoryState();
  inventory.grant('harbor-letter'); inventory.grant('road-token'); inventory.add('forest-stick', 3);
  let allowReward = false;
  const journey = createJourney({
    inventory: { ...inventory, add: (...args) => allowReward && inventory.add(...args) },
    weapons: createWeapons({ wear: true, inventory }),
  });
  journey.start(); journey.act('meet-courier');
  for (const id of PARCEL_IDS) journey.act(`collect-${id}`);
  const parcels = journey.snapshot();
  assert.equal(journey.act('return-courier').ok, false);
  assert.deepEqual(journey.snapshot(), parcels);
  assert.equal(inventory.count('cooked-fish'), 0);
  allowReward = true;
  assert.equal(journey.act('return-courier').ok, true);
  journey.act('meet-crossing-keeper'); journey.act('repair-bridge');
  const repaired = journey.snapshot();
  allowReward = false;
  assert.equal(journey.act('return-crossing-keeper').ok, false);
  assert.deepEqual(journey.snapshot(), repaired);
  assert.equal(inventory.count('forest-stick'), 0);
  allowReward = true;
  assert.equal(journey.act('return-crossing-keeper').ok, true);
  assert.equal(inventory.count('forest-stick'), 4);
});

test('three distinct waymarkers precede the relay report; letter is retained and earlier regions stay complete', () => {
  const { journey, inventory, events } = fixture({ initialItems: { 'forest-stick': 3 } });
  finishMeadow(journey); finishCrossing(journey);
  assert.equal(journey.act('restore-beacon-west').ok, false);
  journey.act('meet-ridge-keeper');
  for (const id of [BEACON_IDS[1], BEACON_IDS[2], BEACON_IDS[0]]) {
    assert.equal(journey.act('deliver-report').ok, false);
    assert.equal(journey.act(`restore-${id}`).ok, true);
    assert.equal(journey.act(`restore-${id}`).ok, false);
  }
  inventory.remove('harbor-letter');
  const before = journey.snapshot();
  assert.equal(journey.availableActions()[0].enabled, false);
  assert.equal(journey.act('deliver-report').ok, false);
  assert.deepEqual(journey.snapshot(), before);
  inventory.grant('harbor-letter');
  assert.equal(journey.act('deliver-report').ok, true);
  assert.equal(inventory.has('harbor-letter'), true);
  assert.equal(inventory.has('road-token'), true);
  assert.equal(journey.act('deliver-report').ok, false);
  assert.equal(journey.view().complete, true);
  assert.match(journey.view().detail, /copied Mara’s warning/);
  assert.equal(journey.view().objectiveId, null);
  assert.deepEqual(journey.availableActions(), []);
  assert.deepEqual(journey.state.completedRegions, [2, 3, 4]);
  assert.deepEqual(events.filter(event => event.completedRegion).map(event => event.completedRegion), [2, 3, 4]);
});

test('every intermediate versioned save restores deterministically without rewards or replayed events', () => {
  const source = fixture({ initialItems: { 'forest-stick': 3 } });
  const actions = ['start-journey', 'meet-courier', ...PARCEL_IDS.map(id => `collect-${id}`), 'return-courier',
    'meet-crossing-keeper', 'repair-bridge', 'return-crossing-keeper', 'meet-ridge-keeper',
    ...BEACON_IDS.map(id => `restore-${id}`), 'deliver-report'];
  for (const id of actions) {
    const result = id === 'start-journey' ? source.journey.start() : source.journey.act(id);
    assert.equal(result.ok, true, id);
    const stored = JSON.parse(JSON.stringify(source.journey.snapshot()));
    const loaded = fixture({ initialItems: { 'forest-stick': source.inventory.count('forest-stick') } });
    assert.equal(loaded.journey.restore(stored), true, id);
    assert.deepEqual(loaded.journey.snapshot(), source.journey.snapshot());
    assert.deepEqual(loaded.journey.view(), source.journey.view());
    assert.deepEqual(loaded.journey.availableActions(), source.journey.availableActions());
    assert.deepEqual(loaded.events, []);
    assert.equal(loaded.inventory.count('cooked-fish'), 0, 'restoring quest state never grants its earlier food reward');
    stored.parcels.length = 0;
    assert.deepEqual(loaded.journey.snapshot(), source.journey.snapshot(), 'restore owns its arrays');
  }
});

test('invalid saves fail atomically, and snapshots or view arrays cannot mutate live progress', () => {
  const { journey } = fixture({ initialItems: { 'forest-stick': 3 } });
  finishMeadow(journey);
  const before = journey.snapshot();
  const invalid = [null, {}, { ...before, version: 2 }, { ...before, revision: -1 },
    { ...before, revision: 6.5 }, { ...before, revision: before.revision + 1 },
    { ...before, started: 'true' }, { ...before, started: false },
    { ...before, parcels: ['cart-parcel-1', 'cart-parcel-1', 'cart-parcel-3'] },
    { ...before, parcels: ['unknown'] }, { ...before, bridgeComplete: true },
    { ...before, beacons: ['beacon-west'] }, { ...before, reportDelivered: true }];
  for (const value of invalid) {
    assert.equal(journey.restore(value), false);
    assert.deepEqual(journey.snapshot(), before);
  }
  const external = journey.state;
  external.parcels.length = 0; external.completedRegions.push(4); external.started = false;
  journey.view().destinationIds.push('fake');
  journey.availableActions()[0].id = 'deliver-report';
  assert.deepEqual(journey.snapshot(), before);
  assert.equal(journey.availableActions()[0].id, 'meet-crossing-keeper');
});
