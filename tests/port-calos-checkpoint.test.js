import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoadCheckpoint } from '../src/road-checkpoint.js';
import { createFerry, FERRY_LANDINGS, FERRY_SCENE } from '../src/ferry.js';
import { createInventoryState } from '../src/inventory.js';
import { createWeapons } from '../src/weapons.js';
import { createJourney } from '../src/journey.js';
import { createCampaign } from '../src/campaign.js';
import { createLusciaChapter } from '../src/luscia-chapter.js';
import { createCartography } from '../src/cartography.js';
import { METRES_PER_HEX } from '../src/world-scale.js';

function fixture() {
  const values = new Map();
  const checkpoint = createRoadCheckpoint({ storage: {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  } });
  const inventory = createInventoryState();
  inventory.grant('simple-sword');
  const data = {
    version: 1, worldScale: METRES_PER_HEX, questStage: 0,
    inventory: inventory.items().map(id => ({ id, quantity: inventory.count(id) })),
    weapons: createWeapons({ inventory }).snapshot(), journey: createJourney().snapshot(),
    campaign: createCampaign().snapshot(), luscia: createLusciaChapter().snapshot(),
    cartography: createCartography().snapshot(), chartLesson: 'unissued',
    position: { x: FERRY_LANDINGS.drent.ashore.x, z: FERRY_LANDINGS.drent.ashore.z },
    journeyGathered: [], meadowCleared: false, heardDoom: false,
    woodland: { version: 1, acornStatus: 'available', practiceHits: 0, practiceGuards: 0,
      practiceDodges: 0, acorns: [], sticks: [], fruits: [], discoveries: [],
      camp: { version: 1, taught: false, catches: 0, fires: {} } },
  };
  const ferry = createFerry({ place: (x, z) => { data.position = { x, z }; } });
  ferry.board();
  ferry.frame(FERRY_SCENE.done);
  data.ferry = ferry.snapshot();
  return { checkpoint, data };
}

test('a completed ferry crossing saves an untrained traveler without granting main-story progress', () => {
  const { checkpoint, data } = fixture();
  const written = checkpoint.save(data);
  assert.equal(written.ok, true, written.reason);
  const loaded = checkpoint.read();
  assert.equal(loaded.ok, true, loaded.reason);
  assert.equal(loaded.data.questStage, 0);
  assert.deepEqual(loaded.data.position, data.position);
  assert.deepEqual(loaded.data.ferry, data.ferry);
  assert.deepEqual(loaded.data.woodland, data.woodland);
  assert.deepEqual(loaded.data.journey, data.journey);
  assert.deepEqual(loaded.data.campaign, data.campaign);
  assert.deepEqual(loaded.data.luscia, data.luscia);
  assert.deepEqual(loaded.data.cartography, data.cartography);
  assert.equal(loaded.data.chartLesson, 'unissued');
  assert.deepEqual(loaded.data.inventory, data.inventory, 'no letter, road token or other tutorial reward appears');
});

test('stage-zero saving requires a valid crossing that actually reached a shore', () => {
  const { checkpoint, data } = fixture();
  assert.equal(checkpoint.save(data).ok, true);
  for (const ferry of [undefined, null, {}, { ...data.ferry, crossings: 0 },
    { ...data.ferry, crossings: -1 }, { ...data.ferry, crossings: '1' },
    { ...data.ferry, version: 999 }, { ...data.ferry, met: false },
    { ...data.ferry, met: undefined }]) {
    assert.equal(checkpoint.save({ ...data, ferry }).ok, false, JSON.stringify(ferry));
    assert.equal(checkpoint.read().data.ferry.crossings, data.ferry.crossings,
      'a rejected checkpoint cannot overwrite the good arrival');
  }
  const ferry = createFerry();
  ferry.board(); ferry.frame(FERRY_SCENE.board);
  assert.equal(ferry.state.crossing, true);
  assert.equal(checkpoint.save({ ...data, ferry: ferry.snapshot() }).ok, false,
    'departing the initial pier is not yet a completed crossing');
});

test('early sea travel retains tutorial and later-chapter validation', () => {
  const { checkpoint, data } = fixture();
  const startedJourney = { ...createJourney().snapshot(), started: true };
  assert.equal(checkpoint.save({ ...data, journey: startedJourney }).ok, false,
    'the ferry cannot start the overland quest before the tutorial is complete');
  const luscia = createLusciaChapter(); luscia.start();
  assert.equal(checkpoint.save({ ...data, luscia: luscia.snapshot() }).ok, false,
    'arriving in Luscia does not count as reporting to Iven');
  assert.equal(checkpoint.save({ ...data, woodland: undefined }).ok, false,
    'unfinished tutorial details are still required');
});
