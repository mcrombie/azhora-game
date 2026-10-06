import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoadCheckpoint } from '../src/app/saves/road-checkpoint.js';
import { createInventoryState } from '../src/gameplay/inventory/inventory.js';
import { createWeapons } from '../src/gameplay/combat/weapons.js';
import { createJourney } from '../src/content/chapters/journey/journey.js';
import { QUEST_DONE } from '../src/gameplay/movement/game-state.js';
import { METRES_PER_HEX } from '../src/world/terrain/world-scale.js';
import { createBatmanQuest, BATMAN_QUEST } from '../src/content/quests/batman/batman-quest.js';
import { createBatmanFlight, buildSuvalFlightRoute, SUVAL_FLIGHT_REGIONS } from '../src/content/quests/batman/batman-flight.js';
import { REGION_CELLS } from '../src/world/terrain/region-world.js';
import { BAT_CAVE, BAT_LANDING } from '../src/content/regions/suval-highlands/suval-highlands.js';
const routes = buildSuvalFlightRoute({ cells: SUVAL_FLIGHT_REGIONS.flatMap(region => REGION_CELLS[region].map(cell => ({ ...cell, region }))), cave: BAT_CAVE.perch, landing: BAT_LANDING, heightAt: () => 2 });
function fixture() {
  const inventory = createInventoryState(); for (const id of ['simple-sword', 'harbor-letter', 'road-token']) inventory.grant(id);
  const weapons = createWeapons({ inventory }), journey = createJourney({ inventory, weapons }); journey.start();
  const memory = new Map(), storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) };
  const data = { version: 1, worldScale: METRES_PER_HEX, questStage: QUEST_DONE, journey: journey.snapshot(),
    inventory: inventory.items().map(id => ({ id, quantity: inventory.count(id) })), weapons: weapons.snapshot(),
    journeyGathered: [], meadowCleared: false, position: { ...BAT_CAVE.approach }, heardDoom: false, lysaComplete: false, health: 100 };
  return { checkpoint: createRoadCheckpoint({ storage }), data, inventory };
}
test('Older road saves still load and the new flight fields round-trip without aliasing', () => {
  const { checkpoint, data } = fixture(); assert.equal(checkpoint.save(data).ok, true);
  const quest = createBatmanQuest(), flight = createBatmanFlight(routes); quest.speak(); quest.beginFlight(); flight.start();
  while (flight.state().progress < .25) flight.tick(.25);
  Object.assign(data, { batmanQuest: quest.snapshot(), batmanFlight: flight.snapshot(), batmanCorpse: null, batmanGround: { ...BAT_CAVE.perch, yaw: 0 } });
  const saved = checkpoint.save(data); assert.equal(saved.ok, true, saved.reason);
  const read = checkpoint.read(); assert.equal(read.ok, true); assert.deepEqual(read.data.batmanFlight, data.batmanFlight);
  assert.equal(data.batmanFlight.visited.length, 0);
  data.batmanFlight.visited.push('West Suval:999,999'); assert.equal(checkpoint.read().data.batmanFlight.visited.length, 0);
  while (flight.mounted) flight.tick(.25); quest.finishFlight();
  Object.assign(data, { batmanQuest: quest.snapshot(), batmanFlight: flight.snapshot() });
  assert.equal(checkpoint.save(data).ok, true); assert.equal(checkpoint.read().data.batmanFlight.visited.length, 63);
  data.batmanFlight.visited.length = 0; assert.equal(checkpoint.read().data.batmanFlight.visited.length, 63);
});
test('Checkpoint validation rejects mismatched flying, endings, fake hexes, and bounty proof atomically', () => {
  const { checkpoint, data } = fixture(); const quest = createBatmanQuest(), flight = createBatmanFlight(routes);
  Object.assign(data, { batmanQuest: quest.snapshot(), batmanFlight: flight.snapshot(), batmanCorpse: null });
  assert.equal(checkpoint.save(data).ok, true); const safe = checkpoint.read().data;
  const invalid = [
    { batmanQuest: { ...quest.snapshot(), stage: 'flying', bounty: 'declined' } },
    { batmanFlight: { ...flight.snapshot(), stage: 'flying' } },
    { batmanQuest: { ...quest.snapshot(), stage: 'complete' } },
    { batmanCorpse: { ...BAT_CAVE.perch } },
    { batmanGround: { x: NaN, z: 2, yaw: 0 } },
    { inventory: [...data.inventory, { id: BATMAN_QUEST.headItem, quantity: 1 }] },
  ];
  for (const patch of invalid) { assert.equal(checkpoint.save({ ...data, ...patch }).ok, false); assert.deepEqual(checkpoint.read().data, safe); }
});
test('The physical head persists until claimed and cannot be duplicated after payment', () => {
  const { checkpoint, data } = fixture(), quest = createBatmanQuest(); quest.acceptBounty(); quest.attack(); quest.killed(); quest.takeHead({ grant: () => true });
  data.batmanQuest = quest.snapshot(); data.batmanCorpse = { ...BAT_CAVE.perch }; data.inventory.push({ id: BATMAN_QUEST.headItem, quantity: 1 });
  assert.equal(checkpoint.save(data).ok, true);
  quest.claimBounty({ take: () => true }); data.batmanQuest = quest.snapshot();
  assert.equal(checkpoint.save(data).ok, false, 'paid proof cannot remain in the satchel');
  data.inventory = data.inventory.filter(item => item.id !== BATMAN_QUEST.headItem); assert.equal(checkpoint.save(data).ok, true);
});
