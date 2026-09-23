import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoadCheckpoint, ROAD_CHECKPOINT_KEY } from '../src/road-checkpoint.js';
import { createInventoryState } from '../src/inventory.js';
import { createWeapons } from '../src/weapons.js';
import { createJourney } from '../src/journey.js';
import { QUEST_DONE } from '../src/game-state.js';
import { METRES_PER_HEX } from '../src/world-scale.js';
import { createVastosCivilWar, VASTOS_PATHS } from '../src/vastos-civil-war.js';

function fixture() {
  const inventory = createInventoryState();
  for (const id of ['simple-sword', 'harbor-letter', 'road-token']) inventory.grant(id);
  const weapons = createWeapons({ wear: true, inventory });
  const journey = createJourney({ inventory, weapons });
  journey.start();
  const data = {
    version: 1, worldScale: METRES_PER_HEX, questStage: QUEST_DONE, journey: journey.snapshot(),
    inventory: inventory.items().map(id => ({ id, quantity: inventory.count(id) })),
    weapons: weapons.snapshot(), journeyGathered: [], meadowCleared: false,
    position: { x: 3, z: -190 }, heardDoom: true, health: 74,
  };
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  return { inventory, data, storage, checkpoint: createRoadCheckpoint({ storage }) };
}

const terms = {
  republican: ['post-route-notice'], monarchist: ['file-levy-manifest'],
  mediation: ['secure-republican-concession', 'secure-monarchist-concession'],
};

function perform(quest, actions) {
  for (const action of actions) assert.equal(quest.act(action).ok, true, action);
}

test('checkpoints preserve every Vastos stage for each branch alongside the satchel', () => {
  for (const path of VASTOS_PATHS) {
    const { inventory, data, checkpoint } = fixture();
    const quest = createVastosCivilWar({ inventory });
    const batches = [[], ['accept-herd', 'find-stray-west'],
      ['find-stray-east', 'find-stray-ridge', 'reopen-watering'],
      ['hear-republican', 'hear-monarchist', 'hear-herder', 'read-covenant'],
      [`choose-${path}`], ...terms[path].map(action => [action]), ['settle-camp']];
    for (const actions of batches) {
      perform(quest, actions);
      const saved = { ...data, vastos: quest.snapshot(),
        inventory: inventory.items().map(id => ({ id, quantity: inventory.count(id) })) };
      const result = checkpoint.save(saved);
      assert.equal(result.ok, true, `${path}: ${actions.join(', ')}: ${result.reason}`);
      assert.deepEqual(checkpoint.read().data.vastos, saved.vastos);
      assert.deepEqual(checkpoint.read().data.inventory, saved.inventory);
      const loaded = checkpoint.read().data;
      loaded.vastos.strays.push('north');
      loaded.vastos.chosenPath = 'invented';
      assert.deepEqual(checkpoint.read().data.vastos, saved.vastos, 'read must return an owned snapshot');
    }
    const loaded = checkpoint.read().data, restoredInventory = createInventoryState(), events = [];
    for (const { id, quantity } of loaded.inventory) assert.equal(restoredInventory.add(id, quantity), true);
    const restored = createVastosCivilWar({ inventory: restoredInventory, onEvent: event => events.push(event) });
    assert.equal(restored.restore(loaded.vastos), true);
    assert.equal(restored.state().outcome, path);
    assert.equal(restoredInventory.count('salt-beef'), 2);
    assert.equal(restored.act('settle-camp').ok, false);
    assert.equal(restoredInventory.count('salt-beef'), 2, 'reloading duplicated the meal');
    assert.deepEqual(events, []);
  }
});

test('invalid Vastos checkpoint sections cannot replace the last good adventure', () => {
  const { inventory, data, storage, checkpoint } = fixture();
  const quest = createVastosCivilWar({ inventory });
  perform(quest, ['accept-herd', 'find-stray-west']);
  const saved = { ...data, vastos: quest.snapshot() };
  assert.equal(checkpoint.save(saved).ok, true);
  const before = storage.getItem(ROAD_CHECKPOINT_KEY);
  for (const bad of [null, [], {}, { ...saved.vastos, version: 2 }, { ...saved.vastos, accepted: false },
    { ...saved.vastos, strays: ['west', 'west'] }, { ...saved.vastos, chosenPath: 'republican' },
    { ...saved.vastos, rewardGranted: true }, { ...saved.vastos, routeNoticePosted: true }]) {
    const rejected = checkpoint.save({ ...data, vastos: bad });
    assert.equal(rejected.ok, false, JSON.stringify(bad));
    assert.match(rejected.reason, /Vastos|Common Water/i);
    assert.equal(storage.getItem(ROAD_CHECKPOINT_KEY), before, 'invalid section overwrote good storage');
  }
  assert.deepEqual(checkpoint.read().data.vastos, saved.vastos);
  storage.setItem(ROAD_CHECKPOINT_KEY, JSON.stringify({ ...data, vastos: { ...saved.vastos, rewardGranted: true } }));
  assert.equal(checkpoint.read().ok, false, 'read also validates externally damaged storage');
});

test('older checkpoints without Vastos remain valid and restore an unmet quest without rewards', () => {
  const { data, checkpoint } = fixture();
  assert.equal(checkpoint.save(data).ok, true);
  const loaded = checkpoint.read().data;
  assert.equal(Object.hasOwn(loaded, 'vastos'), false);
  const inventory = createInventoryState(), quest = createVastosCivilWar({ inventory });
  assert.equal(quest.restore(loaded.vastos), true);
  assert.equal(quest.view().stage, 'unmet');
  assert.equal(inventory.count('salt-beef'), 0);
});
