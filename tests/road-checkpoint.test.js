import { BRANDY_HOME } from '../src/brandy-home-world.js';
import { BRANDY_STAND } from '../src/brandy.js';
import { createBrandyHome, createJonHomeVisit } from '../src/brandy-home.js';
import { SALT_PORTS } from '../src/salt-sultan.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoadCheckpoint, ROAD_CHECKPOINT_KEY } from '../src/road-checkpoint.js';
import { createInventoryState } from '../src/inventory.js';
import { createWeapons } from '../src/weapons.js';
import { createGear } from '../src/gear.js';
import { createJourney } from '../src/journey.js';
import { QUEST_DONE } from '../src/game-state.js';
import { createForestHideoutQuest, FOREST_HIDEOUT_QUEST } from '../src/forest-hideout.js';
import { createLusciaChapter } from '../src/luscia-chapter.js';
import { createAftermathChapter } from '../src/aftermath-chapter.js';
import { createMorosChapter } from '../src/moros-chapter.js';
import { createBorderChapter, BORDER_ENCOUNTER_ID } from '../src/border-chapter.js';
import { LUSCIA_WOLVES } from '../src/luscia-chapter.js';
import { createRiding } from '../src/riding.js';
import * as campaignModule from '../src/campaign.js';
import { METRES_PER_HEX, AUTHORED_METRES_PER_HEX, toWorld } from '../src/world-scale.js';
import { WORLD_BOUNDS as PLAYABLE_BOUNDS } from '../src/regions.js';
import {createLivingStory} from '../src/living-story.js';
import {createLusciaCivilWar} from '../src/luscia-civil-war.js';
import { createCagneyQuest, CAGNEY_HOME } from '../src/cagney-quest.js';
import { createCorpses } from '../src/corpses.js';
import { createSpiderQuest } from '../src/spider-quest.js';
import { createMurderQuest, WITNESS_IDS, MURDERER } from '../src/murder-quest.js';
import { QUEST_HOMES } from '../src/quest-homes.js';
import { FERRY_LANDINGS } from '../src/ferry.js';
import { createKayla, KAYLA_START } from '../src/kayla.js';
import { createKaylaRace, KAYLA_RACE_ROUTE } from '../src/kayla-race.js';
import { createCubHoneyQuest, CUB_STAND, CUB_HONEY_ITEM, CUB_HONEY_SOURCE } from '../src/cub-honey-quest.js';
import { BEAR_HOME_ROUTE } from '../src/bear-family.js';
import { LIZ_STAND } from '../src/cat-quest.js';
import {createSevronState} from '../src/sevron-state.js';
import { createLizeemFarmlands } from '../src/lizeem-farmlands.js';
import { createMerchants } from '../src/merchants.js';
import { createMeadowWater, createWeir } from '../src/meadow-water.js';
import { createNethereumArc } from '../src/lizeem-nethereum.js';
import { createNesdorArc } from '../src/lizeem-nesdor.js';
import { createCanalTurns, createMill } from '../src/canal-turns.js';
import { createOvesosArc } from '../src/lizeem-ovesos.js';
import { createDividing } from '../src/dividing.js';

function memoryStorage() {
  const values = new Map();
  return { values, getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}

function fixture() {
  const inventory = createInventoryState();
  for (const id of ['simple-sword', 'harbor-letter', 'road-token', 'tinderbox']) inventory.grant(id);
  inventory.add('forest-stick', 5); inventory.add('pawpaw', 2);
  const weapons = createWeapons({ wear: true, inventory });
  weapons.contact(); weapons.equip('forest-stick'); weapons.contact(); weapons.contact();
  const journey = createJourney({ inventory, weapons });
  // The road begun and Chip's bridge accepted and not yet mended: the one piece of unfinished
  // business a Chapter 1 save can carry now that the middle of the road is off the slate.
  journey.start(); journey.act('meet-crossing-keeper');
  const data = {
    version: 1, ambronLayoutVersion: 2, worldScale: METRES_PER_HEX, questStage: QUEST_DONE, journey: journey.snapshot(),
    inventory: inventory.items().map(id => ({ id, quantity: inventory.count(id) })),
    weapons: weapons.snapshot(), journeyGathered: ['meadow-fruit'], meadowCleared: false,
    position: { x: 3, z: -190 }, heardDoom: true, lysaComplete: true, health: 74,
  };
  const storage = memoryStorage();
  return { inventory, weapons, journey, data, storage, checkpoint: createRoadCheckpoint({ storage }) };
}

const cubHostSnapshot = quest => ({ version: 1, quest, alerted: false, alertTime: 0, patrol: 0, wait: -1, liz: { ...LIZ_STAND } });
test('Sevron discovery and recovered treasure persist without leaking references or accepting corrupt progress',()=>{
 const {data,checkpoint}=fixture(),city=createSevronState();city.discoverCity();city.openSecret();city.takeTreasure();city.defeat('west-oremindi-pass-goblins');
 const saved={...data,sevron:city.snapshot()};assert.equal(checkpoint.save(saved).ok,true);
 saved.sevron.defeatedThreats.length=0;const loaded=checkpoint.read().data.sevron;assert.deepEqual(loaded,city.snapshot());
 const restored=createSevronState();assert.equal(restored.restore(loaded),true);assert.equal(restored.takeTreasure(),null);
 for(const sevron of [null,{}, {...loaded,treasureTaken:'yes'}, {...loaded,secretOpen:false}, {...loaded,defeatedThreats:['unknown']}, {...loaded,defeatedThreats:['west-oremindi-pass-goblins','west-oremindi-pass-goblins']}])assert.equal(checkpoint.save({...data,sevron}).ok,false);
 assert.equal(checkpoint.save(data).ok,true,'older saves without Sevron remain valid');
});
function bearQuestState() {
  const race = createKaylaRace(); race.accept();
  const won = race.snapshot(); won.stage = 'won'; won.kayla.next = KAYLA_RACE_ROUTE.length;
  race.restore(won); race.takeReward();
  const cub = createCubHoneyQuest(); cub.accept();
  cub.collect({ source: CUB_HONEY_SOURCE, unseen: true, grant: () => true }); cub.deliver({ take: () => true });
  return { kaylaRace: race.snapshot(), cubHoney: cubHostSnapshot(cub.snapshot()),
    bearFamily: { version: 1, phase: 'roaming', next: BEAR_HOME_ROUTE.length, cub: { x: CUB_STAND.x, z: CUB_STAND.z } } };
}

test('bear quest checkpoints keep both rewards and family positions without rewarding either quest twice', () => {
  const { data, checkpoint } = fixture(), quests = bearQuestState();
  const saved = { ...data, ...quests }; const result = checkpoint.save(saved);
  assert.equal(result.ok, true, result.reason);
  const loaded = checkpoint.read().data;
  for (const field of ['kaylaRace', 'cubHoney', 'bearFamily']) assert.deepEqual(loaded[field], quests[field]);
  loaded.bearFamily.cub.x += 10; loaded.kaylaRace.ed.z += 10;
  assert.deepEqual(checkpoint.read().data.bearFamily, quests.bearFamily);
  assert.deepEqual(checkpoint.read().data.kaylaRace, quests.kaylaRace);
  const race = createKaylaRace(), cub = createCubHoneyQuest(); race.restore(quests.kaylaRace); cub.restore(quests.cubHoney.quest);
  assert.equal(race.takeReward(), 0); let rewards = 0;
  assert.equal(cub.deliver({ take: () => true, reward: () => rewards++ }), false); assert.equal(rewards, 0);
});

test('bear family checkpoints require both quests before roaming and keep the last save when any bear section is invalid', () => {
  const { data, checkpoint } = fixture(), quests = bearQuestState(), saved = { ...data, ...quests };
  assert.equal(checkpoint.save(saved).ok, true);
  const unfinishedRace = createKaylaRace().snapshot(), unfinishedCub = cubHostSnapshot(createCubHoneyQuest().snapshot());
  for (const changes of [
    { kaylaRace: null }, { cubHoney: null }, { bearFamily: null },
    { kaylaRace: { ...quests.kaylaRace, attempts: -1 } },
    { cubHoney: { ...quests.cubHoney, quest: { ...quests.cubHoney.quest, reward: false } } },
    { cubHoney: { ...quests.cubHoney, alertTime: -1 } },
    { bearFamily: { ...quests.bearFamily, next: BEAR_HOME_ROUTE.length + 1 } },
    { kaylaRace: unfinishedRace }, { kaylaRace: undefined }, { cubHoney: unfinishedCub }, { cubHoney: undefined },
    { kaylaRace: unfinishedRace, bearFamily: { ...quests.bearFamily, phase: 'returning' } }
  ]) {
    assert.equal(checkpoint.save({ ...saved, ...changes }).ok, false, JSON.stringify(changes));
    assert.deepEqual(checkpoint.read().data.bearFamily, quests.bearFamily);
  }
  assert.equal(checkpoint.save({ ...saved, cubHoney: unfinishedCub, bearFamily: { ...quests.bearFamily, phase: 'waiting-cub' } }).ok, true,
    'Kayla may return first and wait for the cub’s separate quest');
  assert.equal(checkpoint.save({ ...saved, kaylaRace: unfinishedRace, bearFamily: { ...quests.bearFamily, phase: 'waiting-race', next: 0 } }).ok, true,
    'the cub’s quest can be completed before the race');
  const old = { ...data, kayla: createKayla().snapshot() }; assert.equal(checkpoint.save(old).ok, true);
  const legacy = checkpoint.read().data;
  assert.deepEqual(legacy.kayla.position, { x: KAYLA_START.x, z: KAYLA_START.z });
  for (const field of ['kaylaRace', 'cubHoney', 'bearFamily']) assert.equal(Object.hasOwn(legacy, field), false, 'legacy saves do not invent new progress');
});

test('a saved stolen comb must be the one carried for the cub’s unfinished delivery', () => {
  const { data, checkpoint } = fixture(), cub = createCubHoneyQuest(); cub.accept();
  cub.collect({ source: CUB_HONEY_SOURCE, unseen: true, grant: () => true });
  const carrying = { ...data, cubHoney: cubHostSnapshot(cub.snapshot()), inventory: [...data.inventory, { id: CUB_HONEY_ITEM, quantity: 1 }] };
  assert.equal(checkpoint.save(carrying).ok, true); assert.deepEqual(checkpoint.read().data.cubHoney, carrying.cubHoney);
  assert.equal(checkpoint.save({ ...carrying, inventory: data.inventory }).ok, false);
  assert.equal(checkpoint.save({ ...carrying, cubHoney: cubHostSnapshot(createCubHoneyQuest().snapshot()) }).ok, false);
  assert.equal(checkpoint.save({ ...carrying, inventory: [...data.inventory, { id: CUB_HONEY_ITEM, quantity: 2 }] }).ok, false);
  assert.equal(checkpoint.save({ ...data, cubHoney: cubHostSnapshot(cub.snapshot()) }).ok, false, 'ordinary honey never stands in for Liz’s comb');
});

test('Cagney checkpoints keep escort injuries and casualties without replaying the reward', () => {
  const { checkpoint, data } = fixture(), escort = createCagneyQuest();
  escort.accept(); escort.begin(); escort.settle({ hp: 58, enemies: [0, 12, 48] });
  const saved = { ...data, cagney: escort.snapshot() };
  assert.equal(checkpoint.save(saved).ok, true);
  assert.deepEqual(checkpoint.read().data.cagney, saved.cagney);
  const damaged = { ...saved, cagney: { ...saved.cagney, wave: 3 } };
  assert.equal(checkpoint.save(damaged).ok, false);
  assert.deepEqual(checkpoint.read().data.cagney, saved.cagney, 'invalid data leaves the valid checkpoint untouched');
  for (let gang = 0; gang < 3; gang++) { escort.begin(); escort.settle({ hp: 58, enemies: [0, 0, 0] }); }
  assert.ok(escort.arrive(CAGNEY_HOME));
  assert.equal(escort.take(), 45);
  assert.equal(checkpoint.save({ ...data, cagney: escort.snapshot() }).ok, true);
  const restored = createCagneyQuest(); restored.restore(checkpoint.read().data.cagney);
  assert.equal(restored.take(), 0, 'a restored completed escort never pays twice');
  assert.equal(checkpoint.save(data).ok, true, 'older saves without this quest remain valid');
  assert.equal(Object.hasOwn(checkpoint.read().data, 'cagney'), false);
});

test('checkpoints retain returning residents, a ferry in progress and a resident indoors without paying rewards again', () => {
  const { checkpoint, data } = fixture(), ben = createSpiderQuest(), troy = createMurderQuest(), cagney = createCagneyQuest();
  ben.ask(); ben.accept(); ben.begin(); ben.settle({ spiderDead: true }); ben.take('bounty');
  troy.begin(); for (const id of WITNESS_IDS) troy.hear(id); troy.accuse(MURDERER); troy.take('purse');
  cagney.accept(); for (let gang = 0; gang < 3; gang++) { cagney.begin(); cagney.settle({ hp: 70, enemies: [0, 0, 0] }); }
  cagney.arrive(CAGNEY_HOME); assert.equal(cagney.take(), 45);
  const homes = { version: 1, people: {
    'ben-sorcerer': { phase: 'walking', leg: 'home', position: { x: -807, z: 240 }, yaw: -.7, clock: 0 },
    'bee-keeper': { phase: 'sailing', leg: 'quay', position: { x: FERRY_LANDINGS.peblos.ashore.x, z: FERRY_LANDINGS.peblos.ashore.z }, yaw: 0, clock: 23.5 },
    cagney: { phase: 'inside', leg: 'home', position: { ...QUEST_HOMES.cagney.door }, yaw: QUEST_HOMES.cagney.yaw, clock: 0 },
  } };
  const saved = { ...data, spider: ben.snapshot(), murder: troy.snapshot(), cagney: cagney.snapshot(), homes };
  const result = checkpoint.save(saved); assert.equal(result.ok, true, result.reason);
  const loaded = checkpoint.read().data;
  assert.deepEqual(loaded.homes, homes);
  assert.deepEqual(loaded.inventory, saved.inventory, 'residence state neither grants nor removes reward items');
  loaded.homes.people['bee-keeper'].clock = 59;
  loaded.homes.people['ben-sorcerer'].position.x = 123;
  assert.deepEqual(checkpoint.read().data.homes, homes, 'resident state and nested positions are independently copied');
  ben.restore(loaded.spider); troy.restore(loaded.murder); cagney.restore(loaded.cagney);
  assert.equal(ben.take('bounty'), null); assert.equal(troy.take('purse'), null); assert.equal(cagney.take(), 0);
  for (const homes of [null, { version: 1, people: { unknown: saved.homes.people.cagney } },
    { version: 1, people: { cagney: { ...saved.homes.people.cagney, position: { x: 0, z: 0 } } } },
    { version: 1, people: { 'bee-keeper': { ...saved.homes.people['bee-keeper'], clock: -1 } } }]) {
    assert.equal(checkpoint.save({ ...saved, homes }).ok, false, 'invalid residence data is rejected');
    assert.deepEqual(checkpoint.read().data.homes, saved.homes, 'invalid data preserves the last valid checkpoint');
  }
  const { homes: ignored, ...legacy } = saved;
  assert.equal(checkpoint.save(legacy).ok, true, 'completed quest saves predating homes remain loadable');
  assert.equal(Object.hasOwn(checkpoint.read().data, 'homes'), false);
});

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

test('a courier can bring an untrained pier traveler through the muster and save actual unfinished lessons', () => {
  const {checkpoint, data} = fixture(), inventory = createInventoryState();
  inventory.grant('simple-sword');
  const campaign = campaignModule.createCampaign(), journey = createJourney(), luscia = createLusciaChapter();
  const moros = createMorosChapter({inventory, onFoot: () => true}), border = createBorderChapter();
  const woodland = {version: 1, acornStatus: 'available', practiceHits: 0, practiceDodges: 0, practiceGuards: 0,
    acorns: [], sticks: [], fruits: [], discoveries: [], camp: {version: 1, taught: false, catches: 0, fires: {}}};
  const save = () => ({...data, questStage: 0, woodland, journeyGathered: [], journey: journey.snapshot(),
    weapons: createWeapons({inventory}).snapshot(), inventory: inventory.items().map(id => ({id, quantity: inventory.count(id)})),
    campaign: campaign.snapshot(), luscia: luscia.snapshot(), moros: moros.snapshot(), border: border.snapshot()});
  assert.equal(checkpoint.save(save()).ok, false, 'normal pier progress still has no onward checkpoint');
  campaign.acceptImperialRecall(); moros.start();
  let result = checkpoint.save(save()); assert.equal(result.ok, true, result.reason);
  moros.act('admit-to-camp'); moros.act('join-muster'); moros.act('claim-legion-horse');
  assert.equal(moros.state.complete, true); campaign.completeChapter('moros-camp');
  border.start(); border.act('take-legate-terms');
  result = checkpoint.save(save()); assert.equal(result.ok, true, result.reason);
  let loaded = checkpoint.read().data;
  assert.equal(loaded.questStage, 0); assert.deepEqual(loaded.woodland, woodland);
  assert.equal(loaded.journey.started, false); assert.equal(loaded.luscia.started, false);
  assert.deepEqual(loaded.campaign.completed, ['moros-camp']); assert.equal(loaded.campaign.horse, false);
  assert.equal(inventory.count('copper-piece'), 25, 'only the actual muster wage is earned');
  assert.equal(inventory.has('horse-token'), false); assert.equal(inventory.has('road-token'), false);
  border.act('enter-solis'); border.act('side-empire'); campaign.chooseSide('empire');
  result = checkpoint.save(save()); assert.equal(result.ok, true, result.reason);
  loaded = checkpoint.read().data;
  assert.equal(loaded.campaign.chapterId, 'border-battle'); assert.equal(loaded.campaign.imperialRecall, true);
  const corrupt = {...save(), campaign: {...campaign.snapshot(), imperialRecall: false}};
  assert.equal(checkpoint.save(corrupt).ok, false, 'recall history is checked, not a blanket bypass');
});

test('recall does not forgive a future battle or prevent later living-operative recruitment', () => {
  const {checkpoint, data} = fixture(), campaign = campaignModule.createCampaign();
  campaign.acceptImperialRecall();
  const moros = createMorosChapter(); moros.start(); moros.act('admit-to-camp');
  const border = createBorderChapter(); border.start();
  const save = {...data, campaign: campaign.snapshot(), moros: moros.snapshot(), border: border.snapshot()};
  assert.equal(checkpoint.save(save).ok, false, 'the border still requires a genuinely completed muster');
  campaign.joinRepublic();
  const republican = createBorderChapter(); republican.joinRepublic();
  const result = checkpoint.save({...save, campaign: campaign.snapshot(), border: republican.snapshot()});
  assert.equal(result.ok, true, result.reason);
  assert.equal(checkpoint.read().data.campaign.entryOrigin, 'luscia');
  assert.equal(checkpoint.read().data.campaign.imperialRecall, true);
});

test('living world time and Republican introduction persist; the unique satchel must match its carrier',()=>{
  const {checkpoint,data,inventory}=fixture(),living=createLivingStory(),civil=createLusciaCivilWar();
  living.tick(173);living.reportNothom('player');living.acceptSatchel('player');living.takeSatchel('player');
  civil.meetSoldier();civil.agreeSoldier();inventory.add('courier-satchel');
  const saved={...data,livingStory:living.snapshot(),lusciaCivilWar:civil.snapshot(),inventory:inventory.items().map(id=>({id,quantity:inventory.count(id)}))};
  assert.equal(checkpoint.save(saved).ok,true);assert.deepEqual(checkpoint.read().data.livingStory,saved.livingStory);assert.deepEqual(checkpoint.read().data.lusciaCivilWar,saved.lusciaCivilWar);
  const copied=checkpoint.read().data;copied.livingStory.satchel.carrier='merc-word';
  assert.equal(checkpoint.save(copied).ok,false,'two carriers cannot own the unique satchel');
  assert.equal(checkpoint.save({...saved,inventory:data.inventory}).ok,false,'a claimed player carrier requires the actual inventory item');
  assert.equal(checkpoint.save({...saved,lusciaCivilWar:{...saved.lusciaCivilWar,operative:'gone'}}).ok,false);
  assert.equal(checkpoint.read().data.livingStory.seconds,173,'invalid edits never replace a good saved clock');
});

test('early Republican checkpoint reaches Voss without inventing Imperial muster history',()=>{
  const {checkpoint,data,inventory,weapons}=fixture(),road=createJourney({inventory,weapons});road.start();road.act('deliver-report');
  assert.equal(road.view().complete,true);
  const campaign=campaignModule.createCampaign(),border=createBorderChapter(),civil=createLusciaCivilWar();campaign.completeChapter('drent-road');
  civil.readOperative();civil.joinRepublic();campaign.joinRepublic();border.joinRepublic();
  const saved={...data,journey:road.snapshot(),campaign:campaign.snapshot(),border:border.snapshot(),lusciaCivilWar:civil.snapshot()};
  const checked=checkpoint.save(saved);assert.equal(checked.ok,true,checked.reason);
  const restored=checkpoint.read().data;assert.deepEqual(restored.campaign.completed,['drent-road']);assert.equal(restored.border.ordered,false);assert.equal(restored.border.side,'coalition');
});

test('the road checkpoint retains spare armor without re-equipping it on reload', () => {
  const {checkpoint,data}=fixture(),gear=createGear();
  gear.wear('hand',{weight:'light',tier:0});gear.wear('body',{weight:'heavy',tier:3});gear.takeOff('body');
  assert.equal(checkpoint.save({...data,gear:gear.snapshot()}).ok,true);
  const copy=createGear();assert.equal(copy.restore(checkpoint.read().data.gear),true);
  assert.equal(copy.wearing('body'),null);assert.equal(copy.windScale,1);
  assert.equal(copy.view().owned.length,2);
  assert.equal(copy.equip('body:heavy:3').ok,true);assert.equal(copy.windScale,2);
  assert.equal(checkpoint.save({...data,gear:{version:1,worn:{hand:{weight:'light',tier:0}}}}).ok,true,'old checkpoints remain loadable');
});

test('the burying at the Lauvel is kept, and a stage nobody can reach is refused', () => {
  const { checkpoint, data } = fixture();
  const saved = { version: 1, stage: 'found', done: ['hurdle'], carried: 4 };
  assert.equal(checkpoint.save({ ...data, burying: saved }).ok, true);
  assert.deepEqual(checkpoint.read().data.burying, saved);
  assert.equal(checkpoint.save({ ...data }).ok, true, 'a save from before the quest existed still keeps');
  assert.equal(checkpoint.read().data.burying, undefined);
  checkpoint.save({ ...data, burying: saved });
  for (const bad of [{ version: 1, stage: 'buried', done: [], carried: 0 },
    { version: 1, stage: 'found', done: ['shovel'], carried: 4 },
    { version: 1, stage: 'found', done: [], carried: -2 }]) {
    const result = checkpoint.save({ ...data, burying: bad });
    assert.equal(result.ok, false, JSON.stringify(bad));
    assert.match(result.reason, /Lauvel/);
  }
  assert.deepEqual(checkpoint.read().data.burying, saved, 'the good save is not overwritten');
});

test('the search for Batman is kept, and a nonsense stage is refused', () => {
  const { checkpoint, data } = fixture();
  assert.equal(checkpoint.save({ ...data, katy: { version: 1, stage: 'looking' } }).ok, true);
  assert.deepEqual(checkpoint.read().data.katy, { version: 1, stage: 'looking' });
  assert.equal(checkpoint.save({ ...data, katy: { version: 1, stage: 'found-him' } }).ok, false);
  assert.deepEqual(checkpoint.read().data.katy, { version: 1, stage: 'looking' }, 'the good save is not overwritten');
});

test('optional hideout checkpoints preserve unfinished supplies and reject impossible progress without overwriting the adventure', () => {
  const { checkpoint, data, inventory, storage } = fixture();
  const hideout = createForestHideoutQuest({ inventory });
  hideout.inspect(); hideout.begin({ questStage: QUEST_DONE }); hideout.markCleared('forest-hideout'); hideout.recover();
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

test('the dead of a raid are kept with the road, and a list naming someone who cannot die is refused', () => {
  const { checkpoint, data } = fixture();
  assert.equal(checkpoint.save({ ...data, fallen: { version: 1, ids: ['greenway-forager'] } }).ok, true);
  assert.deepEqual(checkpoint.read().data.fallen, { version: 1, ids: ['greenway-forager'] });
  assert.equal(checkpoint.save({ ...data, fallen: { version: 1, ids: ['forest-woodcutter'] } }).ok, false, 'Tamsin is only ever wounded');
  assert.deepEqual(checkpoint.read().data.fallen, { version: 1, ids: ['greenway-forager'] }, 'the refused save changed nothing');
});

test('invalid data never overwrites an existing checkpoint', () => {
  const { checkpoint, data, storage } = fixture();
  checkpoint.save(data);
  const stored = storage.getItem(ROAD_CHECKPOINT_KEY);
  const malformed = [
    null, {}, { ...data, version: 2 }, { ...data, questStage: 9 },   // 9 was a step; the spine is four long now
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
    { ...data, position: { x: PLAYABLE_BOUNDS.maxX + 10, z: -200 } },
    { ...data, position: { x: -300, z: PLAYABLE_BOUNDS.maxZ + 10 } },
    { ...data, position: { x: NaN, z: 200 } },
    { ...data, health: Infinity }, { ...data, health: 101 },
    { ...data, heardDoom: 1 }, { ...data, lysaComplete: 'yes' },
    { ...data, mapTutorial: 9 }, { ...data, mapTutorial: 1.5 }, { ...data, mapTutorial: '2' },
    { ...data, playSeconds: -1 }, { ...data, playSeconds: 'soon' }, { ...data, playSeconds: Infinity },
    { ...data, mercenaryWeapons: [] }, { ...data, mercenaryWeapons: { nobody: { id: 'iron-mace', durability: 3 } } },
    { ...data, mercenaryWeapons: { 'merc-altun': { id: 'hunting-bow', durability: 3 } } }, { ...data, mercenaryWeapons: { 'merc-altun': { id: 'iron-mace', durability: 99 } } },
    { ...data, weapons: { ...data.weapons, equippedId: 'acorn' } },
  ];
  for (const invalid of malformed) {
    assert.equal(checkpoint.save(invalid).ok, false);
    assert.equal(storage.getItem(ROAD_CHECKPOINT_KEY), stored);
  }
});

test('a checkpoint taken in the 56 m world resumes where its ground moved to', () => {
  // The Avrel clearing is a rigid cluster: the traveler comes back standing in
  // the same corner of the same farmyard, not in the forest it used to be in.
  const clearing = fixture();
  const oldSave = { ...clearing.data, position: { x: -236, z: 30 } };
  delete oldSave.worldScale;
  assert.equal(clearing.checkpoint.save(oldSave).ok, true);
  const restored = clearing.checkpoint.read().data;
  assert.equal(restored.worldScale, METRES_PER_HEX);
  assert.deepEqual(restored.position, { ...toWorld(-236, 30) });
  assert.notEqual(restored.position.x, -236, 'the clearing itself moved with its region');

  // Tidehaven is anchored, so a save taken in the village is untouched.
  const village = fixture();
  const inVillage = { ...village.data, position: { x: 0, z: 16 } };
  delete inVillage.worldScale;
  assert.deepEqual(village.checkpoint.save(inVillage).data.position, { x: 0, z: 16 });

  // A save from the far west of the old Moros still lands inside the new bounds.
  const moros = fixture();
  const onThePlain = { ...moros.data, position: { x: -770, z: 350 } };
  delete onThePlain.worldScale;
  assert.equal(moros.checkpoint.save(onThePlain).ok, true);
  assert.deepEqual(moros.checkpoint.read().data.position, { ...toWorld(-770, 350) });

  // A save already at this scale is left exactly where it stands, and a scale
  // this build has never used is refused rather than guessed at.
  const current = fixture();
  assert.equal(current.checkpoint.save({ ...current.data, worldScale: AUTHORED_METRES_PER_HEX, position: { x: -236, z: 30 } }).ok, true);
  assert.deepEqual(current.checkpoint.read().data.position, { ...toWorld(-236, 30) });
  assert.equal(current.checkpoint.save({ ...current.data, worldScale: 72 }).ok, false);
  assert.equal(current.checkpoint.save({ ...current.data, worldScale: 'big' }).ok, false);
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
  const restored = createWeapons({ wear: true, inventory, onEvent: event => events.push(event) });
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
  const restored = createWeapons({ wear: true, inventory });
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
  aftermath.start('solis-sweep'); aftermath.act('begin-assault'); aftermath.winEncounter('aftermath-solis-sweep');
  assert.equal(checkpoint.save({ ...data, aftermath: aftermath.snapshot() }).ok, true);
  assert.deepEqual(checkpoint.read().data.aftermath, aftermath.snapshot());
  for (const bad of [null, 'solis-sweep', { ...aftermath.snapshot(), variant: 'border-battle' }, { ...aftermath.snapshot(), revision: 0 }, { ...aftermath.snapshot(), cleared: false, complete: true }])
    assert.equal(checkpoint.save({ ...data, aftermath: bad }).ok, false);
});

test('the traveler’s horse is saved with the road, and a horse that makes no sense is refused', () => {
  const { data, checkpoint } = fixture();
  const riding = createRiding();
  assert.equal(checkpoint.save({ ...data, riding: riding.snapshot() }).ok, true, 'no horse yet');
  riding.grant({ x: data.position.x + 2, z: data.position.z + 1 }, .4); riding.teach();
  assert.equal(checkpoint.save({ ...data, riding: riding.snapshot() }).ok, true);
  assert.deepEqual(checkpoint.read().data.riding, riding.snapshot());
  for (const bad of [null, 'bay', { ...riding.snapshot(), horse: null }, { ...riding.snapshot(), mounted: true }, { ...riding.snapshot(), horse: { x: 1, z: NaN, yaw: 0 } }])
    assert.equal(checkpoint.save({ ...data, riding: bad }).ok, false);
});

/**
 * The chapters past the Lauvel are written in the same breath as the campaign chapter they
 * belong to, so a save that holds one without the other is not a save any play produced. Until
 * this test there was no such check beyond Luscia's: a checkpoint could say the Empire took
 * Solis while the border chapter said the traveler had signed for the Republic, and it loaded.
 */
function onTheRoad() {
  const { checkpoint, data, inventory } = fixture();
  const journey = createJourney({ inventory, weapons: { spendSticks: () => true } });
  journey.start();
  for (let step = 0; step < 40 && journey.view().stage !== 'complete'; step++) {
    const next = journey.availableActions().find(option => option.enabled);
    if (!next) break;
    journey.act(next.id);
  }
  const luscia = createLusciaChapter({ inventory });
  luscia.start(); luscia.act('accept-lauvel-search'); luscia.act('take-courier-satchel');
  luscia.clearWolves(LUSCIA_WOLVES.id); luscia.act('return-courier-satchel');
  const moros = createMorosChapter({ inventory, hasHorse: () => true });
  moros.start(); moros.act('admit-to-camp'); moros.act('join-muster'); moros.act('claim-legion-horse');
  const border = side => {
    const chapter = createBorderChapter();
    chapter.start(); chapter.act('take-legate-terms'); chapter.act('enter-solis'); chapter.act(`side-${side}`);
    chapter.act('march-out'); chapter.act('reach-line'); chapter.resolveBattle(BORDER_ENCOUNTER_ID);
    return chapter;
  };
  const after = variant => {
    const chapter = createAftermathChapter();
    chapter.start(variant); chapter.act('begin-assault'); chapter.winEncounter(`aftermath-${variant}`);
    chapter.act('close-aftermath');
    return chapter;
  };
  const story = (...chapters) => {
    const campaign = campaignModule.createCampaign();
    for (const id of chapters) {
      if (id === 'empire' || id === 'coalition') campaign.chooseSide(id);
      else if (id === 'border-battle') campaign.completeChapter(id, 'victory');
      else campaign.completeChapter(id);
    }
    return campaign.snapshot();
  };
  const base = { ...data, journey: journey.snapshot(), inventory: inventory.items().map(id => ({ id, quantity: inventory.count(id) })) };
  return { checkpoint, base, luscia, moros, border, after, story };
}

test('a save may not hold a chapter the campaign it carries never reached', () => {
  const { checkpoint, base, luscia, moros, border, after, story } = onTheRoad();
  const road = story('drent-road');
  const mustered = story('drent-road', 'luscia-aftermath', 'moros-camp');
  const fought = story('drent-road', 'luscia-aftermath', 'moros-camp', 'empire', 'border-battle');
  const taken = story('drent-road', 'luscia-aftermath', 'moros-camp', 'empire', 'border-battle', 'solis-sweep');
  const honest = { ...base, campaign: taken, luscia: luscia.snapshot(), moros: moros.snapshot(),
    border: border('empire').snapshot(), aftermath: after('solis-sweep').snapshot() };
  assert.equal(checkpoint.save(honest).ok, true, 'the honest Empire road to the end of built ground still saves');
  const refused = [
    ['the Moros camp with the Lauvel never walked', { ...base, campaign: road, moros: moros.snapshot() }, /Lauvel/],
    ['the border chapter before the muster', { ...base, campaign: road, border: border('empire').snapshot() }, /muster/],
    ['one side in the chapter and the other in the campaign',
      { ...honest, border: border('coalition').snapshot() }, /one side/],
    ['the other side’s morning after', { ...honest, aftermath: after('moros-outpost').snapshot() }, /other side/],
    ['a morning after the campaign never reached',
      { ...base, campaign: mustered, luscia: luscia.snapshot(), moros: moros.snapshot(), aftermath: after('solis-sweep').snapshot() }, /not the one the campaign reached/],
  ];
  for (const [what, save, reason] of refused) {
    const result = checkpoint.save(save);
    assert.equal(result.ok, false, `accepted ${what}`);
    assert.match(result.reason, reason, what);
  }
  // And the good save is still the one on disk.
  assert.deepEqual(checkpoint.read().data.aftermath, after('solis-sweep').snapshot());
  // The Republic's road to the same place saves as readily as the Empire's.
  const republic = story('drent-road', 'luscia-aftermath', 'moros-camp', 'coalition', 'border-battle', 'moros-outpost');
  assert.equal(checkpoint.save({ ...base, campaign: republic, luscia: luscia.snapshot(), moros: moros.snapshot(),
    border: border('coalition').snapshot(), aftermath: after('moros-outpost').snapshot() }).ok, true);
  assert.equal(checkpoint.save({ ...base, campaign: fought, luscia: luscia.snapshot(), moros: moros.snapshot(),
    border: border('empire').snapshot() }).ok, true, 'the border battle fought and the morning not yet begun');
});


test('Chapter 1 preserves whether the landing mate was invited, independently of his route', () => {
  const {checkpoint,data}=fixture();
  for(const invited of [false,true]){
    assert.equal(checkpoint.save({...data,companionOffTheClock:invited}).ok,true);
    assert.equal(checkpoint.read().data.companionOffTheClock,invited);
  }
  assert.equal(checkpoint.save({...data,companionOffTheClock:'yes'}).ok,false);
});

test('chart completion and the selected quest survive a checkpoint, including an unknown quest id', () => {
  const { checkpoint, data } = fixture();
  for (const trackedQuestId of ['main', 'bridge', 'civil-war-vastos', 'future-quest', 'q'.repeat(80)]) {
    const saved = { ...data, chartLesson: 'complete', trackedQuestId };
    assert.equal(checkpoint.save(saved).ok, true);
    assert.deepEqual(checkpoint.read().data, saved, 'the HUD decides whether an unknown quest is still available');
  }
  assert.equal(checkpoint.save(data).ok, true, 'legacy saves need neither field');
  assert.equal(Object.hasOwn(checkpoint.read().data, 'chartLesson'), false);
  assert.equal(Object.hasOwn(checkpoint.read().data, 'trackedQuestId'), false);
});

test('invalid chart stages and quest ids cannot replace a checkpoint or skip the report to Glun', () => {
  const { checkpoint, data } = fixture();
  const saved = { ...data, chartLesson: 'complete', trackedQuestId: 'main' };
  assert.equal(checkpoint.save(saved).ok, true);
  for (const chartLesson of [null, 2, {}, 'opened', 'open-map', 'return-to-glun']) {
    assert.equal(checkpoint.save({ ...saved, chartLesson }).ok, false);
    assert.deepEqual(checkpoint.read().data, saved);
  }
  for (const trackedQuestId of [null, 2, {}, '', 'q'.repeat(81), 'two quests', '<script>', '../main']) {
    assert.equal(checkpoint.save({ ...saved, trackedQuestId }).ok, false);
    assert.deepEqual(checkpoint.read().data, saved);
  }
});


test('a goblin attack before tutorial completion remains a valid checkpoint', () => {
  const { checkpoint, data, inventory } = fixture(), hideout = createForestHideoutQuest({ inventory });
  hideout.alert(FOREST_HIDEOUT_QUEST.encounter.enemies[0]);
  const woodland = { version: 1, acornStatus: 'available', practiceHits: 0, practiceDodges: 0, practiceGuards: 0,
    acorns: [], sticks: [], fruits: [], discoveries: [], camp: { version: 1, taught: false, catches: 0, fires: {} } };
  const result = checkpoint.save({ ...data, questStage: 1, woodland, journey: createJourney().snapshot(),
    journeyGathered: [], forestHideout: hideout.snapshot() });
  assert.equal(result.ok, true, result.reason);
  const saved = checkpoint.read().data;
  assert.equal(saved.questStage, 1);
  assert.equal(saved.forestHideout.accepted, true);
  const restored = createForestHideoutQuest(); restored.restore(saved.forestHideout);
  assert.equal(restored.state.active, false, 'loading resumes the road instead of a hidden battle');
});


test('guided fishing and fire-making progress survives a checkpoint and malformed outings cannot replace it', () => {
  const { data, checkpoint } = fixture();
  data.fishingLessons = { version: 1, teacher: 'garden-keeper', stage: 'leading', demonstration: 0,
    position: { x: -62, z: 27 }, waypoint: 2, waiting: true, completed: ['instructor'] };
  data.fireMaking = { version: 1, stage: 'practice', suppliesGiven: true, jojoReferral: 'arrived', firesLit: 0 };
  assert.equal(checkpoint.save(data).ok, true);
  const saved = checkpoint.read();
  assert.deepEqual(saved.data.fishingLessons, data.fishingLessons);
  assert.deepEqual(saved.data.fireMaking, data.fireMaking);
  const bad = structuredClone(data); bad.fishingLessons.teacher = 'missing-guide';
  assert.equal(checkpoint.save(bad).ok, false);
  assert.deepEqual(checkpoint.read().data.fishingLessons, data.fishingLessons);
  const badFire = structuredClone(data); badFire.fireMaking.firesLit = -1;
  assert.equal(checkpoint.save(badFire).ok, false);
});


test('legacy Port Calos bodies for removed civilians disappear without affecting Maddie, other bodies or carried loot', () => {
  const { data, checkpoint, storage } = fixture(), bodies = createCorpses();
  const removed = ['innkeeper', 'fishmonger', 'netmaker', 'shipwright', 'carter', 'resident', 'dockhand'].map(id => `port-calos-${id}`);
  for (const [i, id] of removed.entries()) bodies.add({ id: `npc:${id}`, sourceId: id, npcId: i < 4 ? id : null,
    name: id, x: -416 + i, z: 282, model: { role: 'villager' }, dead: true });
  for (const id of ['port-calos-harbourmaster', 'boatman', 'cobble-harbourmaster', 'unrelated-traveler']) {
    bodies.add({ id: `npc:${id}`, sourceId: id, npcId: id, name: id, x: -418, z: 280,
      model: { role: 'villager', look: { hat: false } }, dead: true,
      loot: [{ id: 'copper-piece', quantity: 7 }, { id: 'pawpaw', quantity: 2 }] });
  }
  const legacy = { ...data, corpses: bodies.snapshot() }, original = structuredClone(legacy);
  storage.setItem(ROAD_CHECKPOINT_KEY, JSON.stringify(legacy));
  const loaded = checkpoint.read();
  assert.equal(loaded.ok, true, loaded.reason);
  const expected = original.corpses.bodies.filter(body => !removed.includes(body.sourceId));
  assert.deepEqual(loaded.data.corpses.bodies, expected, 'Only the seven retired residents are removed, with other appearances and loot intact');
  assert.equal(loaded.data.corpses.clock, original.corpses.clock);
  assert.deepEqual(loaded.data.inventory, original.inventory, 'Previously gathered loot remains in the satchel');
  assert.deepEqual(legacy, original, 'Migration does not mutate its input');
  assert.equal(checkpoint.save(loaded.data).ok, true);
  assert.deepEqual(checkpoint.read().data.corpses.bodies, expected, 'Saving the migrated checkpoint does not resurrect old models');
});


test('household checkpoints preserve indoor Brandy and Jon and reject a corrupted doorway without replacing the save', () => {
  const {data,checkpoint}=fixture();
  const brandy=createBrandyHome({home:BRANDY_HOME,yard:BRANDY_STAND});brandy.restore(undefined,{playSeconds:960});
  const jon=createJonHomeVisit({home:{...BRANDY_HOME,porch:BRANDY_HOME.visitor},pier:SALT_PORTS[0].stand});
  const home={version:1,brandy:brandy.snapshot(),jon:jon.snapshot()};
  assert.equal(checkpoint.save({...data,brandyHome:home}).ok,true);
  assert.deepEqual(checkpoint.read().data.brandyHome,home);
  const invalid=structuredClone(home);invalid.brandy.position.x+=40;
  assert.equal(checkpoint.save({...data,brandyHome:invalid}).ok,false);
  assert.deepEqual(checkpoint.read().data.brandyHome,home);
});


test('older checkpoints at the removed capital resume at the relocated gate without losing their inventory', () => {
  const {data,checkpoint}=fixture();
  const result=checkpoint.save({...data,ambronLayoutVersion:undefined,position:{x:-1240,z:290}});assert.equal(result.ok,true,result.reason);
  const moved=checkpoint.read().data;assert.equal(moved.ambronLayoutVersion,2);
  assert.ok(moved.position.z<180&&moved.position.x>-1100);
  assert.deepEqual(moved.inventory,data.inventory);
  assert.equal(checkpoint.save({...data,ambronLayoutVersion:2,position:{x:-1240,z:290}}).ok,true);
  assert.deepEqual(checkpoint.read().data.position,{x:-1240,z:290},'a deliberate new visit to the old site stays there');
});


test('checkpoint validation preserves sparse world-tree harvests without needing the rendered forest catalog', () => {
  const { checkpoint, data } = fixture();
  const woodcutting = { version: 1, met: false, visits: 0, kingsAxe: false, logs: 2, sold: 0, trees: [
    { id: 'country-pine-123.000--456.000', logsLeft: 0, stump: 20 },
    { id: 'country-oak-321.000--654.000', logsLeft: 2, stump: 0 },
  ] };
  assert.equal(checkpoint.save({ ...data, woodcutting }).ok, true);
  assert.deepEqual(checkpoint.read().data.woodcutting, woodcutting);
  const broken = { ...woodcutting, trees: [{ ...woodcutting.trees[0], stump: Infinity }] };
  assert.equal(checkpoint.save({ ...data, woodcutting: broken }).ok, false);
  assert.deepEqual(checkpoint.read().data.woodcutting, woodcutting, 'a bad stump timer does not replace the saved adventure');
});

test('canopy floor identity survives a checkpoint while legacy positions remain unchanged', () => {
  const { data, checkpoint } = fixture();
  const position = { ...data.position, surfaceId: 'ibenwood:canopy-home-1' };
  assert.equal(checkpoint.save({ ...data, position }).ok, true);
  assert.deepEqual(checkpoint.read().data.position, position);
  assert.equal(checkpoint.save(data).ok, true);
  assert.deepEqual(checkpoint.read().data.position, data.position);
  for (const surfaceId of [null, 42, '', 'a'.repeat(129), '../floor'])
    assert.equal(checkpoint.save({ ...data, position: { ...data.position, surfaceId } }).ok, false);
});

test('the Farmlands of the Lizeem and its market ride along in the checkpoint, and a save from before them loads fresh', () => {
  // Build 1 of the farmlands (the user, 5 October 2026). A key src/road-checkpoint.js does not copy is dropped on save.
  const { data, checkpoint } = fixture();
  const quest = createLizeemFarmlands(); quest.offer(); quest.accept(); quest.lease();
  const market = { version: 1, appetites: { consus: { day: 3, taken: 5 } }, standing: { nepri: 1 }, sealed: {}, prizes: [], bounties: [], orders: {} };
  assert.equal(checkpoint.save({ ...data, lizeemFarmlands: quest.snapshot(), merchants: market }).ok, true);
  const kept = checkpoint.read().data;
  assert.deepEqual(kept.lizeemFarmlands, quest.snapshot());
  assert.deepEqual(kept.merchants, market, 'the market is kept as written: its days are game days');
  for (const bad of [{ lizeemFarmlands: { ...quest.snapshot(), stage: 'finished' } }, { merchants: { ...market, version: 2 } },
    { merchants: { ...market, appetites: { nobody: { day: 1, taken: 1 } } } }])
    assert.equal(checkpoint.save({ ...data, ...bad }).ok, false, Object.keys(bad)[0]);
  assert.deepEqual(checkpoint.read().data.lizeemFarmlands, quest.snapshot(), 'a refused save leaves the last one alone');
  assert.equal(checkpoint.save(data).ok, true, 'a save from before the farmlands is still a save');
  const old = checkpoint.read().data, farmlands = createLizeemFarmlands(), merchants = createMerchants();
  assert.equal(Object.hasOwn(old, 'lizeemFarmlands') || Object.hasOwn(old, 'merchants'), false);
  assert.equal(farmlands.restore(old.lizeemFarmlands), true); assert.equal(farmlands.stage, 'unmet');
  assert.equal(merchants.restore(old.merchants), true); assert.deepEqual(merchants.snapshot().appetites, {});
});

test('the Haethom meadow, the weir and the Nethereum and Nesdor arcs ride along, and a save from before them loads fresh', () => {
  // Builds 2 and 3 of the farmlands (6 October 2026): the meadow and the weir are sections of their own; the arcs ride
  // nested in the farmlands' section; the Nethereum and Nesdor beds, Baugi's long strip among them, are the farm's.
  const { data, checkpoint } = fixture();
  const quest = createLizeemFarmlands(), nethereum = createNethereumArc(), nesdor = createNesdorArc();
  quest.registerArc('nethereum', nethereum); quest.registerArc('nesdor', nesdor);
  quest.offer(); quest.accept(); nethereum.meet(); nesdor.meet();
  const bag = { count: id => ({ 'pine-plank': 2, 'salvaged-metal': 1 })[id] ?? 0, remove: () => true, add: () => true };
  const meadow = createMeadowWater(); assert.equal(meadow.mendHatch({ inventory: bag }).ok, true); assert.equal(meadow.openHatch(100).ok, true);
  const weir = createWeir(); assert.equal(weir.take(120).ok, true);
  const farming = { version: 2, met: true, reaped: 0, trees: {}, beds: {},
    rows: { 'nethereum-meadow-1': { crop: 'flood-oats', sownAt: 10 }, 'nesdor-long-1': { crop: 'barley', sownAt: 10 }, 'nesdor-bench-1': { crop: 'floodwheat', sownAt: 20 } } };
  const saved = { ...data, playSeconds: 500, lizeemFarmlands: quest.snapshot(), meadow: meadow.snapshot(), weir: weir.snapshot(), farming };
  assert.equal(checkpoint.save(saved).ok, true);
  const kept = checkpoint.read().data;
  assert.deepEqual(kept.lizeemFarmlands.arcs, { nethereum: nethereum.snapshot(), nesdor: nesdor.snapshot() });
  assert.deepEqual([kept.meadow, kept.weir], [meadow.snapshot(), weir.snapshot()]);
  assert.deepEqual(Object.keys(kept.farming.rows).sort(), ['nesdor-bench-1', 'nesdor-long-1', 'nethereum-meadow-1']);
  for (const bad of [{ meadow: { ...meadow.snapshot(), version: 2 } }, { meadow: { ...meadow.snapshot(), openedAt: 900 } }, { weir: { ...weir.snapshot(), day: -1 } },
    { lizeemFarmlands: { ...quest.snapshot(), arcs: { ...quest.snapshot().arcs, nethereum: { ...nethereum.snapshot(), stage: 'drowned' } } } },
    { lizeemFarmlands: { ...quest.snapshot(), arcs: { ...quest.snapshot().arcs, nesdor: { ...nesdor.snapshot(), stage: 'done' } } } },
    { farming: { ...farming, rows: { 'nesdor-long-9': { crop: 'barley', sownAt: 10 } } } }])
    assert.equal(checkpoint.save({ ...saved, ...bad }).ok, false, JSON.stringify(Object.keys(bad)));
  assert.deepEqual(checkpoint.read().data.meadow, meadow.snapshot(), 'a refused save leaves the last one alone');
  assert.equal(checkpoint.save(data).ok, true, 'a save from before Builds 2 and 3 is still a save');
  const old = checkpoint.read().data, water = createMeadowWater(), trap = createWeir();
  assert.equal(['meadow', 'weir'].some(key => Object.hasOwn(old, key)), false);
  assert.equal(water.restore(old.meadow), true); assert.equal(water.view(0).hatch, 'broken');
  assert.equal(trap.restore(old.weir), true); assert.equal(trap.view(0).ready, true);
});

test('the Velsorten canal, Ezina’s mill, the Ovesos arc and the Dividing ride along, and a save from before them loads fresh', () => {
  // Builds 4 and 5 of the farmlands (6 October 2026): the canal and the mill are sections of their own; the Ovesos arc and
  // the Dividing ride nested in the farmlands' section; the twelve Ovesos plots are the farm's.
  const { data, checkpoint } = fixture();
  const quest = createLizeemFarmlands(), ovesos = createOvesosArc(), dividing = createDividing({ farmlands: quest });
  quest.registerArc('ovesos', ovesos); quest.registerArc('dividing', dividing);
  quest.offer(); quest.accept(); assert.equal(ovesos.enter(), true);
  const canal = createCanalTurns(); assert.equal(canal.setSeniority(3).ok, true); assert.equal(canal.shortNext(.5, 100).ok, true);
  const held = new Map([['hard-wheat', 6]]);
  const bag = { count: id => held.get(id) ?? 0, remove: (id, n) => { held.set(id, (held.get(id) ?? 0) - n); return true; }, add: (id, n) => { held.set(id, (held.get(id) ?? 0) + n); return true; } };
  const mill = createMill(); assert.equal(mill.grind(bag, 6, { item: 'hard-wheat' }).ok, true);
  const farming = { version: 2, met: true, reaped: 0, trees: {}, beds: {},
    rows: { 'ovesos-tail-1': { crop: 'barley', sownAt: 10 }, 'ovesos-tail-2': { crop: 'silver-millet', sownAt: 10 }, 'ovesos-head-1': { crop: 'hard-wheat', sownAt: 20 } } };
  const saved = { ...data, playSeconds: 500, lizeemFarmlands: quest.snapshot(), canal: canal.snapshot(), mill: mill.snapshot(), farming };
  assert.equal(checkpoint.save(saved).ok, true);
  const kept = checkpoint.read().data;
  assert.deepEqual(kept.lizeemFarmlands.arcs, { ovesos: ovesos.snapshot(), dividing: dividing.snapshot() });
  assert.deepEqual([kept.canal, kept.mill], [canal.snapshot(), mill.snapshot()]);
  assert.deepEqual(Object.keys(kept.farming.rows).sort(), ['ovesos-head-1', 'ovesos-tail-1', 'ovesos-tail-2']);
  for (const bad of [{ canal: { ...canal.snapshot(), version: 2 } }, { canal: { ...canal.snapshot(), seniority: 9 } },
    { canal: { ...canal.snapshot(), plantings: { 'ovesos-tail-9': { crop: 'barley', units: 1 } } } },
    { mill: { ...mill.snapshot(), tolls: 5 } }, { mill: { ...mill.snapshot(), waived: 'yes' } },
    { lizeemFarmlands: { ...quest.snapshot(), arcs: { ...quest.snapshot().arcs, ovesos: { ...ovesos.snapshot(), stage: 'done' } } } },
    { lizeemFarmlands: { ...quest.snapshot(), arcs: { ...quest.snapshot().arcs, dividing: { version: 1, stage: 'feasting' } } } },
    { farming: { ...farming, rows: { 'ovesos-tail-9': { crop: 'barley', sownAt: 10 } } } }])
    assert.equal(checkpoint.save({ ...saved, ...bad }).ok, false, JSON.stringify(bad));
  assert.deepEqual(checkpoint.read().data.canal, canal.snapshot(), 'a refused save leaves the last one alone');
  assert.equal(checkpoint.save(data).ok, true, 'a save from before Builds 4 and 5 is still a save');
  const old = checkpoint.read().data, water = createCanalTurns(), stones = createMill();
  assert.equal(['canal', 'mill'].some(key => Object.hasOwn(old, key)), false);
  assert.equal(water.restore(old.canal), true); assert.equal(water.seniority(), 1);
  assert.equal(stones.restore(old.mill), true); assert.deepEqual(stones.view(), { milled: 0, tolls: 0, waived: false, toNextToll: 16 });
  const fresh = createLizeemFarmlands(), arc = createOvesosArc(), feast = createDividing();
  fresh.registerArc('ovesos', arc); fresh.registerArc('dividing', feast);
  assert.equal(fresh.restore(old.lizeemFarmlands), true);
  assert.deepEqual([arc.stage(), feast.stage()], ['arrive', 'waiting']);
});
