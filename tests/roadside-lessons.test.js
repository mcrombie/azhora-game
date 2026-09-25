import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoadsideLessons, validateRoadsideLessons, SANDWICH_ITEM } from '../src/roadside-lessons.js';
import { createSkills } from '../src/skills.js';
import { createInventoryState } from '../src/inventory.js';
import { createConsumables } from '../src/consumables.js';
import { createCooking, RECIPES } from '../src/cooking.js';
import { createGeology, SPECIMEN_ITEM } from '../src/geology.js';
import { createGlunWoodcutting } from '../src/glun-woodcutting.js';
import { createRoadCheckpoint } from '../src/road-checkpoint.js';
import { createJourney } from '../src/journey.js';
import { createWeapons } from '../src/weapons.js';
import { METRES_PER_HEX } from '../src/world-scale.js';

function fixture() {
  const inventory = createInventoryState(), events = [];
  const skills = createSkills({ onEvent: event => events.push(event) });
  const cooking = createCooking({ skills }), geology = createGeology({ skills });
  const lessons = createRoadsideLessons({ inventory, skills, cooking, geology });
  return { inventory, events, skills, cooking, geology, lessons };
}
function copied(source) {
  const next = fixture();
  for (const id of source.inventory.items()) next.inventory.add(id, source.inventory.count(id));
  assert.equal(next.skills.restore(source.skills.snapshot()), true);
  assert.equal(next.cooking.restore(source.cooking.snapshot()), true);
  assert.equal(next.geology.restore(source.geology.snapshot()), true);
  assert.equal(next.lessons.restore(source.lessons.snapshot()), true);
  return next;
}

test('Jojo gives one sandwich even after it is eaten and the adventure is reloaded', () => {
  const f = fixture(), player = { hp: 40, maxHp: 100, action: 'idle' };
  const combat = { state: { player, phase: 'idle' }, heal(amount) { const before = player.hp; player.hp = Math.min(player.maxHp, player.hp + amount); return player.hp - before; } };
  assert.deepEqual(f.lessons.welcome(), { ok: true, first: true });
  assert.equal(f.inventory.count(SANDWICH_ITEM), 1);
  const ate = createConsumables({ inventory: f.inventory, combat }).consume(SANDWICH_ITEM);
  assert.equal(ate.ok, true); assert.equal(player.hp, 75);
  assert.equal(f.inventory.has(SANDWICH_ITEM), false);
  assert.deepEqual(f.lessons.welcome(), { ok: true, first: false });
  const loaded = copied(f);
  assert.deepEqual(loaded.lessons.welcome(), { ok: true, first: false });
  assert.equal(loaded.inventory.has(SANDWICH_ITEM), false, 'the gift flag survives consumption');
});

test('an unsuccessful welcome gift can be retried without marking it delivered', () => {
  let accepting = false, gifts = 0;
  const lessons = createRoadsideLessons({ inventory: { add() { if (!accepting) return false; gifts++; return true; } } });
  assert.equal(lessons.welcome().ok, false);
  assert.equal(lessons.snapshot().foodGiven, false);
  accepting = true;
  assert.equal(lessons.welcome().first, true);
  assert.equal(lessons.welcome().first, false);
  assert.equal(gifts, 1);
});

test('Jojo cooking supplies are given once, while repeated real cooking continues to pay experience', () => {
  const f = fixture();
  f.cooking.learn('farm-pot');
  f.skills.gain('cooking', 25);
  const before = f.skills.xp('cooking');
  assert.equal(f.lessons.cook().supplies, true);
  assert.equal(f.skills.xp('cooking'), before, 'a second teacher preserves existing progress');
  assert.equal(f.inventory.count('tinderbox'), 1);
  assert.equal(f.inventory.count('forest-stick'), 2);
  assert.equal(f.inventory.count('raw-fish'), 1);
  assert.equal(f.cooking.make('cooked-fish', f.inventory).ok, true);
  assert.equal(f.inventory.remove('forest-stick', 2), true);
  const loaded = copied(f);
  assert.equal(loaded.lessons.cook().supplies, false);
  assert.equal(loaded.inventory.count('forest-stick'), 0, 'spent fuel is not replaced by repeating the lesson');
  assert.equal(loaded.inventory.count('raw-fish'), 0);
  loaded.inventory.add('raw-fish', 1);
  assert.equal(loaded.cooking.make('cooked-fish', loaded.inventory).ok, true);
  assert.equal(loaded.skills.xp('cooking'), before + RECIPES['cooked-fish'].xp * 2);
  assert.equal(loaded.cooking.knows('farm-pot'), true);
});

test('Glun and Mark offer independent geology exercises that require a new portable specimen', () => {
  const f = fixture();
  f.geology.find('quartz', f.inventory);
  f.lessons.startGeology('instructor');
  assert.equal(f.lessons.geologyState('instructor'), 'search', 'an old specimen is not new fieldwork');
  f.geology.find('clay', f.inventory);
  assert.equal(f.lessons.reportGeology('instructor').ok, false, 'observing a clay bed does not bring a stone home');
  f.geology.find('ironstone', f.inventory);
  assert.equal(f.lessons.geologyState('instructor'), 'report');
  const firstXp = f.skills.xp('geology');
  assert.equal(f.lessons.reportGeology('instructor').xp, 24);
  f.lessons.startGeology('doomsayer');
  assert.equal(f.skills.xp('geology'), firstXp + 24);
  assert.equal(f.lessons.geologyState('doomsayer'), 'search');
  assert.equal(f.lessons.geologyState('instructor'), 'complete');
  const loaded = copied(f);
  loaded.geology.find('sandstone', loaded.inventory);
  assert.equal(loaded.lessons.geologyState('doomsayer'), 'search');
  loaded.geology.find('quartz', loaded.inventory);
  assert.equal(loaded.lessons.geologyState('doomsayer'), 'report');
  const xp = loaded.skills.xp('geology');
  assert.equal(loaded.lessons.reportGeology('doomsayer').xp, 24);
  assert.equal(loaded.lessons.reportGeology('instructor').ok, false);
  assert.equal(loaded.lessons.reportGeology('doomsayer').ok, false);
  assert.equal(loaded.skills.xp('geology'), xp + 24);
  assert.equal(f.events.filter(event => event.type === 'skill-learned' && event.id === 'geology').length, 1);
});

test('a teacher cannot inspect a newly found stone after the traveler no longer carries it', () => {
  const f = fixture();
  f.lessons.startGeology('instructor');
  f.geology.find('quartz', f.inventory);
  f.inventory.remove(SPECIMEN_ITEM, 1);
  assert.equal(f.lessons.geologyState('instructor'), 'search');
  assert.equal(f.lessons.reportGeology('instructor').ok, false);
  f.geology.find('ironstone', f.inventory);
  assert.equal(f.lessons.reportGeology('instructor').ok, true);
});

test('first-meeting checkpoints save eaten welcome food and optional lessons before accepting the letter', () => {
  const f = fixture(); f.inventory.grant('simple-sword');
  f.lessons.welcome(); f.inventory.remove(SANDWICH_ITEM, 1);
  f.lessons.cook(); f.lessons.startGeology('instructor');
  const wood = createGlunWoodcutting({ skills: f.skills, inventory: f.inventory }); wood.begin();
  const entries = new Map(), storage = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) };
  const checkpoint = createRoadCheckpoint({ storage });
  const data = { version: 1, worldScale: METRES_PER_HEX, questStage: 1, journey: createJourney().snapshot(),
    inventory: f.inventory.items().map(id => ({ id, quantity: f.inventory.count(id) })), weapons: createWeapons({ inventory: f.inventory }).snapshot(),
    journeyGathered: [], meadowCleared: false, position: { x: 3, z: -190 }, heardDoom: false, health: 75,
    woodland: { version: 1, acornStatus: 'available', practiceHits: 0, practiceDodges: 0, practiceGuards: 0,
      acorns: [], sticks: [], fruits: [], discoveries: [], camp: { version: 1, taught: false, catches: 0, fires: {} } },
    roadLessons: f.lessons.snapshot(), glunWood: wood.snapshot(), cooking: f.cooking.snapshot(), geology: f.geology.snapshot(), skills: f.skills.snapshot() };
  const result = checkpoint.save(data); assert.equal(result.ok, true, result.reason);
  const loaded = checkpoint.read().data;
  assert.equal(loaded.questStage, 1);
  assert.equal(loaded.inventory.some(item => item.id === 'harbor-letter'), false);
  assert.equal(loaded.roadLessons.foodGiven, true);
  assert.equal(loaded.glunWood.stage, 'leading');
  assert.equal(validateRoadsideLessons(loaded.roadLessons), true);
  const restored = fixture(); restored.lessons.restore(loaded.roadLessons);
  assert.equal(restored.lessons.welcome().first, false);
  assert.equal(restored.inventory.has(SANDWICH_ITEM), false);
});

test('roadside lesson validation rejects corrupt state and unknown teachers', () => {
  const valid = fixture().lessons.snapshot();
  assert.equal(validateRoadsideLessons(valid), true);
  for (const bad of [null, [], { ...valid, foodGiven: 1 }, { ...valid, geology: 'wrong' },
    { ...valid, geology: { instructor: { target: 0, done: false } } },
    { ...valid, geology: { instructor: { target: 1, done: 'yes' } } },
    { ...valid, geology: { unknown: { target: 1, done: false } } }]) assert.equal(validateRoadsideLessons(bad), false);
});
