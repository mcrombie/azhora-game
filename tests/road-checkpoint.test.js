import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoadCheckpoint, ROAD_CHECKPOINT_KEY } from '../src/road-checkpoint.js';
import { createInventoryState } from '../src/inventory.js';
import { createWeapons } from '../src/weapons.js';
import { createJourney } from '../src/journey.js';
import { createForestHideoutQuest } from '../src/forest-hideout.js';
import { createLusciaChapter } from '../src/luscia-chapter.js';
import { createAftermathChapter } from '../src/aftermath-chapter.js';
import * as campaignModule from '../src/campaign.js';

function memoryStorage() {
  const values = new Map();
  return { values, getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}

function fixture() {
  const inventory = createInventoryState();
  for (const id of ['simple-sword', 'harbor-letter', 'road-token', 'tinderbox']) inventory.grant(id);
  inventory.add('forest-stick', 5); inventory.add('pawpaw', 2);
  const weapons = createWeapons({ inventory });
  weapons.contact(); weapons.equip('forest-stick'); weapons.contact(); weapons.contact();
  const journey = createJourney({ inventory, weapons });
  journey.start(); journey.act('meet-courier'); journey.act('collect-cart-parcel-2');
  const data = {
    version: 1, questStage: 10, journey: journey.snapshot(),
    inventory: inventory.items().map(id => ({ id, quantity: inventory.count(id) })),
    weapons: weapons.snapshot(), journeyGathered: ['meadow-fruit'], meadowCleared: false,
    position: { x: 3, z: -190 }, heardDoom: true, lysaComplete: true, health: 74,
  };
  const storage = memoryStorage();
  return { inventory, weapons, journey, data, storage, checkpoint: createRoadCheckpoint({ storage }) };
}

test('road checkpoint round-trips partial quest progress, satchel, weapon wear, gathering and narrative flags', () => {
  const { checkpoint, data, storage } = fixture();
  assert.deepEqual(checkpoint.read(), { ok: true, data: null, reason: '' });
  assert.equal(checkpoint.save(data).ok, true);
  assert.deepEqual(checkpoint.read().data, data);
  const loaded = checkpoint.read().data;
  loaded.inventory[0].quantity = 900;
  loaded.journey.parcels.push('cart-parcel-3');
  loaded.weapons.stick.durability = 6;
  assert.deepEqual(checkpoint.read().data, data, 'each read owns its objects');
  assert.equal(checkpoint.clear().ok, true);
  assert.equal(storage.values.has(ROAD_CHECKPOINT_KEY), false);
  assert.equal(checkpoint.read().data, null);
});

test('optional hideout checkpoints preserve unfinished supplies and reject impossible progress without overwriting the adventure', () => {
  const { checkpoint, data, inventory, storage } = fixture();
  const hideout = createForestHideoutQuest({ inventory });
  hideout.inspect(); hideout.begin({ questStage: 10 }); hideout.markCleared('forest-hideout'); hideout.recover();
  const withHideout = { ...data, forestHideout: hideout.snapshot() };
  assert.equal(checkpoint.save(withHideout).ok, true);
  assert.deepEqual(checkpoint.read().data.forestHideout, hideout.snapshot());
  const stored = storage.getItem(ROAD_CHECKPOINT_KEY);
  for (const forestHideout of [null, {}, { ...hideout.snapshot(), accepted: false }, { ...hideout.snapshot(), revision: 999 }]) {
    assert.equal(checkpoint.save({ ...data, forestHideout }).ok, false);
    assert.equal(storage.getItem(ROAD_CHECKPOINT_KEY), stored);
  }
  const restored = createForestHideoutQuest({ inventory });
  const fruitBefore = inventory.count('pawpaw');
  assert.equal(restored.restore(checkpoint.read().data.forestHideout), true);
  assert.equal(restored.state.active, false);
  assert.equal(restored.view().suppliesCarried, true);
  assert.equal(inventory.count('pawpaw'), fruitBefore);
});

test('invalid data never overwrites an existing checkpoint', () => {
  const { checkpoint, data, storage } = fixture();
  checkpoint.save(data);
  const stored = storage.getItem(ROAD_CHECKPOINT_KEY);
  const malformed = [
    null, {}, { ...data, version: 2 }, { ...data, questStage: 9 },
    { ...data, inventory: [...data.inventory, data.inventory[0]] },
    { ...data, inventory: [{ id: 'invented-treasure', quantity: 1 }] },
    { ...data, inventory: data.inventory.filter(item => item.id !== 'harbor-letter') },
    { ...data, inventory: data.inventory.map(item => ({ ...item, quantity: -1 })) },
    { ...data, inventory: data.inventory.map(item => ({ ...item, quantity: .5 })) },
    { ...data, inventory: data.inventory.map(item => ({ ...item, quantity: 2 })) },
    { ...data, journey: { ...data.journey, bridgeComplete: true } },
    { ...data, journeyGathered: ['unknown-site'] },
    { ...data, journeyGathered: ['cart-parcel-1'] },
    { ...data, journeyGathered: ['meadow-fruit', 'meadow-fruit'] },
    { ...data, position: { x: 900, z: -200 } },
    { ...data, position: { x: -300, z: 900 } },
    { ...data, position: { x: NaN, z: 200 } },
    { ...data, health: Infinity }, { ...data, health: 101 },
    { ...data, heardDoom: 1 }, { ...data, lysaComplete: 'yes' },
    { ...data, mapTutorial: 9 }, { ...data, mapTutorial: 1.5 }, { ...data, mapTutorial: '2' },
    { ...data, playSeconds: -1 }, { ...data, playSeconds: 'soon' }, { ...data, playSeconds: Infinity },
    { ...data, mercenaryWeapons: [] }, { ...data, mercenaryWeapons: { nobody: { id: 'iron-mace', durability: 3 } } },
    { ...data, mercenaryWeapons: { 'merc-oru': { id: 'hunting-bow', durability: 3 } } }, { ...data, mercenaryWeapons: { 'merc-oru': { id: 'iron-mace', durability: 99 } } },
    { ...data, weapons: { ...data.weapons, equippedId: 'acorn' } },
  ];
  for (const invalid of malformed) {
    assert.equal(checkpoint.save(invalid).ok, false);
    assert.equal(storage.getItem(ROAD_CHECKPOINT_KEY), stored);
  }
});

test('corrupt JSON, unknown schema and oversized storage values are preserved and reported without throwing', () => {
  const { checkpoint, storage } = fixture();
  for (const raw of ['{broken json', '{"version":88}', 'x'.repeat(65537)]) {
    storage.setItem(ROAD_CHECKPOINT_KEY, raw);
    const result = checkpoint.read();
    assert.equal(result.ok, false);
    assert.equal(result.data, null);
    assert.ok(result.reason);
    assert.equal(storage.getItem(ROAD_CHECKPOINT_KEY), raw, 'a bad read never deletes or overwrites the saved bytes');
  }
});

test('missing or denied storage is nonfatal for save, read and clear', () => {
  const { data } = fixture();
  const denied = () => { throw new Error('storage denied'); };
  for (const storage of [undefined, {}, { getItem: denied, setItem: denied, removeItem: denied }]) {
    const checkpoint = createRoadCheckpoint({ storage });
    assert.equal(checkpoint.read().ok, false);
    assert.equal(checkpoint.save(data).ok, false);
    assert.equal(checkpoint.clear().ok, false);
  }
});

test('optional health and friendship fields are omitted cleanly, and custom keys do not overwrite other runs', () => {
  const { data, storage } = fixture();
  delete data.health; delete data.lysaComplete;
  storage.setItem(ROAD_CHECKPOINT_KEY, 'other checkpoint');
  const checkpoint = createRoadCheckpoint({ storage, key: 'test-road' });
  assert.equal(checkpoint.save(data).ok, true);
  assert.deepEqual(checkpoint.read().data, data);
  assert.equal(storage.getItem(ROAD_CHECKPOINT_KEY), 'other checkpoint');
});

test('weapons restore worn equipment after inventory restoration, without events or healing a broken sword', () => {
  const { inventory, weapons } = fixture();
  const worn = weapons.snapshot();
  const events = [];
  const restored = createWeapons({ inventory, onEvent: event => events.push(event) });
  assert.equal(restored.restore(worn), true);
  assert.deepEqual(restored.snapshot(), worn);
  assert.equal(restored.profile().durability, 4);
  assert.deepEqual(events, []);
  for (let i = 0; i < 24; i++) weapons.contact('simple-sword');
  const broken = weapons.snapshot();
  assert.equal(restored.restore(broken), true);
  assert.equal(restored.status('simple-sword').durability, 0);
  assert.equal(restored.status('simple-sword').usable, false);
  assert.equal(inventory.has('simple-sword'), true);
  assert.equal(restored.repair(), true);
  assert.equal(restored.status('simple-sword').durability, 24);
});

test('invalid weapon saves cannot alter live condition or create missing equipment', () => {
  const { inventory, weapons } = fixture();
  const before = weapons.snapshot();
  for (const data of [null, {}, { ...before, version: 2 },
    { ...before, equippedId: 'acorn' },
    { ...before, sword: { ...before.sword, durability: 100 } },
    { ...before, stick: { ...before.stick, durability: 0, usable: false } },
    { ...before, sword: { ...before.sword, owned: false } },
    { ...before, stick: { ...before.stick, equipped: false } },
  ]) {
    assert.equal(weapons.restore(data), false);
    assert.deepEqual(weapons.snapshot(), before);
  }
  inventory.remove('forest-stick', 5);
  assert.equal(weapons.restore(before), false, 'restore inventory before weapons; missing items cannot be manufactured');
});

test('a spent and selected last stick restores empty, and a later pickup starts fresh', () => {
  const { inventory, weapons, checkpoint, data } = fixture();
  weapons.spendSticks(5);
  const empty = weapons.snapshot();
  const restored = createWeapons({ inventory });
  assert.equal(restored.restore(empty), true);
  assert.equal(restored.profile().usable, false);
  assert.equal(restored.equippedId, 'forest-stick');
  data.inventory = inventory.items().map(id => ({ id, quantity: inventory.count(id) }));
  data.weapons = empty;
  assert.equal(checkpoint.save(data).ok, true);
  inventory.add('forest-stick', 1);
  assert.equal(restored.profile().durability, 6);
});

test('campaign progress rides along in the checkpoint, may not outrun the road, and older saves still load', () => {
  const { checkpoint, data, storage, inventory, weapons } = fixture();
  const { createCampaign } = campaignModule;
  const campaign = createCampaign();
  assert.equal(checkpoint.save(data).ok, true, 'a save without a campaign is still valid');
  assert.equal(Object.hasOwn(checkpoint.read().data, 'campaign'), false);
  assert.equal(checkpoint.save({ ...data, campaign: campaign.snapshot() }).ok, true);
  assert.deepEqual(checkpoint.read().data.campaign, campaign.snapshot());
  const stored = storage.getItem(ROAD_CHECKPOINT_KEY);
  campaign.completeChapter('drent-road');
  assert.equal(checkpoint.save({ ...data, campaign: campaign.snapshot() }).ok, false, 'Luscia cannot begin before Iven files the report');
  for (const bad of [null, {}, 'campaign', { ...createCampaign().snapshot(), side: 'empire' }]) assert.equal(checkpoint.save({ ...data, campaign: bad }).ok, false);
  assert.equal(storage.getItem(ROAD_CHECKPOINT_KEY), stored, 'rejected saves leave the stored checkpoint alone');
  const road = createJourney({ inventory, weapons });
  road.start(); road.act('meet-courier'); for (const id of [1, 2, 3]) road.act(`collect-cart-parcel-${id}`); road.act('return-courier');
  road.act('meet-crossing-keeper'); road.act('repair-bridge'); road.act('return-crossing-keeper');
  road.act('meet-ridge-keeper'); for (const id of ['west', 'east', 'north']) road.act(`restore-beacon-${id}`); road.act('deliver-report');
  assert.equal(road.view().complete, true);
  const finished = { ...data, journey: road.snapshot(), inventory: inventory.items().map(id => ({ id, quantity: inventory.count(id) })), weapons: weapons.snapshot(), campaign: campaign.snapshot() };
  assert.equal(checkpoint.save(finished).ok, true);
  assert.equal(checkpoint.read().data.campaign.chapterId, 'luscia-aftermath');
});
test('the Luscia chapter is optional in a save and can never stand ahead of the road or the campaign that carry it', () => {
  const { checkpoint, data, inventory, weapons, storage } = fixture();
  const luscia = createLusciaChapter({ inventory });
  luscia.start(); luscia.act('accept-lauvel-search');
  assert.equal(checkpoint.save({ ...data, luscia: luscia.snapshot() }).ok, false, 'the Lauvel cannot open before the road is finished');
  const road = createJourney({ inventory, weapons });
  road.start(); road.act('meet-courier'); for (const id of [1, 2, 3]) road.act(`collect-cart-parcel-${id}`); road.act('return-courier');
  road.act('meet-crossing-keeper'); road.act('repair-bridge'); road.act('return-crossing-keeper');
  road.act('meet-ridge-keeper'); for (const id of ['west', 'east', 'north']) road.act(`restore-beacon-${id}`); road.act('deliver-report');
  const { createCampaign } = campaignModule;
  const campaign = createCampaign();
  campaign.completeChapter('drent-road');
  const carried = () => inventory.items().map(id => ({ id, quantity: inventory.count(id) }));
  const finished = { ...data, journey: road.snapshot(), inventory: carried(), weapons: weapons.snapshot(), campaign: campaign.snapshot() };
  assert.equal(checkpoint.save(finished).ok, true, 'a save from before this chapter existed still loads');
  assert.equal(Object.hasOwn(checkpoint.read().data, 'luscia'), false);
  assert.equal(checkpoint.save({ ...finished, luscia: luscia.snapshot() }).ok, true);
  assert.deepEqual(checkpoint.read().data.luscia, luscia.snapshot());
  const stored = storage.getItem(ROAD_CHECKPOINT_KEY);
  luscia.act('take-courier-satchel'); luscia.act('return-courier-satchel');
  assert.equal(checkpoint.save({ ...finished, inventory: carried(), luscia: luscia.snapshot() }).ok, false,
    'a finished chapter without the campaign that recorded its horse is rejected');
  assert.equal(storage.getItem(ROAD_CHECKPOINT_KEY), stored, 'rejected saves leave the stored checkpoint alone');
  campaign.completeChapter('luscia-aftermath');
  const paid = { ...finished, inventory: carried(), campaign: campaign.snapshot(), luscia: luscia.snapshot() };
  assert.equal(checkpoint.save(paid).ok, true);
  assert.equal(checkpoint.read().data.campaign.chapterId, 'moros-camp');
  assert.equal(checkpoint.read().data.inventory.some(item => item.id === 'horse-token'), true);
  for (const bad of [null, {}, 'luscia', { ...luscia.snapshot(), revision: 0 }, { ...luscia.snapshot(), briefed: false }])
    assert.equal(checkpoint.save({ ...paid, luscia: bad }).ok, false);
});

test('the chapter after the border battle is saved with the road, and a contradictory one is refused', () => {
  const { data, checkpoint } = fixture();
  assert.equal(checkpoint.save(data).ok, true, 'a save from before the chapter existed still loads');
  assert.equal(Object.hasOwn(checkpoint.read().data, 'aftermath'), false);
  const aftermath = createAftermathChapter();
  aftermath.start('moros-fallback'); aftermath.act('begin-assault'); aftermath.winEncounter('aftermath-moros-fallback');
  assert.equal(checkpoint.save({ ...data, aftermath: aftermath.snapshot() }).ok, true);
  assert.deepEqual(checkpoint.read().data.aftermath, aftermath.snapshot());
  for (const bad of [null, 'solis-sweep', { ...aftermath.snapshot(), variant: 'border-battle' }, { ...aftermath.snapshot(), revision: 0 }, { ...aftermath.snapshot(), cleared: false, complete: true }])
    assert.equal(checkpoint.save({ ...data, aftermath: bad }).ok, false);
});
