import test from 'node:test';
import { keepsNpc } from '../src/content/characters/cast.js';
import assert from 'node:assert/strict';
import { ARI, ARI_STAND, SUNFLOWER_ROWS, ARI_GARDEN_SUPPLIES } from '../src/content/quests/ari/ari-garden.js';
import { createSunflowerLesson, validateSunflowerLesson, sunflowerConversation, SUNFLOWER_LESSON_XP } from '../src/content/quests/skill-lessons/sunflower-lesson.js';
import { createFarming, CROPS, WATERING_XP, FARMER } from '../src/gameplay/skills/farming/farming.js';
import { createInventoryState } from '../src/gameplay/inventory/inventory.js';
import { createSkills } from '../src/gameplay/skills/skills.js';
import { createWeapons } from '../src/gameplay/combat/weapons.js';
import { createJourney } from '../src/content/chapters/journey/journey.js';
import { createRoadCheckpoint } from '../src/app/saves/road-checkpoint.js';
import { QUEST_DONE, canStand } from '../src/gameplay/movement/game-state.js';
import { regionAt } from '../src/world/terrain/region-world.js';
import { PORT_CALOS_NPC_IDS, portCalosConversation } from '../src/content/regions/port-calos/port-calos-people.js';
import { markerFor } from '../src/gameplay/quests/quest-markers.js';
import { createQuestTracker } from '../src/gameplay/quests/quest-tracker.js';
import { sourceModule } from './module-loader.js';

const first = SUNFLOWER_ROWS[0].id, second = SUNFLOWER_ROWS[1].id;
function fixture() {
  const inventory = createInventoryState(), skills = createSkills();
  let lesson;
  const farming = createFarming({ inventory, skills, onEvent: event => lesson?.farmEvent(event) });
  const changes = [], tracked = [];
  lesson = createSunflowerLesson({ inventory, skills, farming, onChange: state => changes.push(state), onTrack: id => tracked.push(id) });
  return { inventory, skills, farming, lesson, changes, tracked };
}

test('Ari teaches real planting, tending and harvesting, pays once and leaves Stanley available', () => {
  const { inventory, skills, farming, lesson, tracked } = fixture();
  assert.equal(lesson.view().stage, 'offered');
  assert.equal(lesson.accept().ok, true);
  assert.equal(farming.met, false, 'Ari does not consume Stanley\'s introduction');
  assert.equal(inventory.count('sunflower-seed'), 2);
  assert.equal(lesson.accept().ok, false);
  assert.equal(inventory.count('sunflower-seed'), 2);
  assert.equal(tracked.length, 1);
  assert.equal(lesson.report().ok, false);
  assert.equal(farming.sow(first, 'sunflower', 10).ok, true);
  assert.equal(lesson.view(10).stage, 'water');
  assert.equal(farming.water(first, 12).ok, true);
  assert.equal(farming.water(first, 13).ok, false);
  assert.equal(lesson.view(12).stage, 'growing');
  assert.equal(farming.reap(first, 99).ok, false);
  assert.equal(lesson.view(100).stage, 'harvest');
  assert.equal(farming.reap(first, 100).ok, true);
  assert.equal(lesson.view(100).stage, 'report');
  assert.equal(inventory.count('sunflower'), 3);
  assert.equal(inventory.count('sunflower-seed'), 2, 'harvest saves seed for another planting');
  assert.equal(lesson.report().ok, true);
  assert.equal(skills.xp('farming'), WATERING_XP + CROPS.sunflower.xp + SUNFLOWER_LESSON_XP);
  const xp = skills.xp('farming');
  assert.equal(lesson.report().ok, false);
  const saved = lesson.snapshot(); lesson.restore(saved);
  assert.equal(lesson.report().ok, false);
  assert.equal(skills.xp('farming'), xp);
  assert.equal(lesson.view(100).complete, true);
  assert.equal(farming.sow(first, 'sunflower', 101).ok, true, 'finished beds remain normal reusable farming ground');
});

test('buying flowers, earlier planting and unrelated crops or beds cannot substitute for the lesson', () => {
  const { inventory, farming, lesson } = fixture();
  farming.stockSeeds(); farming.sow(first, 'sunflower', 0); farming.water(first, 1);
  lesson.accept(); inventory.add('sunflower', 50); farming.reap(first, 100);
  assert.equal(lesson.view(100).stage, 'plant');
  farming.sow('commons-row-1', 'sunflower', 100); farming.water('commons-row-1', 101); farming.reap('commons-row-1', 200);
  assert.equal(lesson.view(200).stage, 'plant');
  farming.sow(first, 'carrot', 200); farming.water(first, 201); farming.reap(first, 270);
  assert.equal(lesson.view(270).stage, 'plant');
  assert.equal(lesson.report().ok, false);
});

test('a missed watering can be retried, and planting the other bed does not lose tending progress', () => {
  const { farming, lesson } = fixture();
  lesson.accept(); farming.sow(first, 'sunflower', 0);
  assert.match(lesson.view(121).detail, /ripened without watering/);
  farming.reap(first, 121);
  assert.equal(lesson.view(121).stage, 'plant');
  farming.sow(first, 'sunflower', 122); farming.water(first, 123);
  farming.sow(second, 'sunflower', 125);
  assert.equal(lesson.snapshot().row, first);
  assert.equal(lesson.snapshot().watered, true);
  farming.reap(first, 212);
  assert.equal(lesson.view(212).stage, 'report');
});

test('lesson and crop checkpoints preserve growth, reject inconsistent rewards, and migrate old saves', () => {
  const { inventory, skills, farming, lesson } = fixture();
  lesson.accept(); farming.sow(first, 'sunflower', 10); farming.water(first, 12);
  for (const id of ['simple-sword', 'harbor-letter', 'road-token']) inventory.grant(id);
  const weapons = createWeapons({ inventory }), journey = createJourney({ inventory }); journey.start();
  const values = new Map(), storage = { getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const checkpoint = createRoadCheckpoint({ storage });
  const data = { version: 1, ambronLayoutVersion: 2, worldScale: 100, questStage: QUEST_DONE,
    inventory: inventory.items().map(id => ({ id, quantity: inventory.count(id) })), weapons: weapons.snapshot(),
    journey: journey.snapshot(), journeyGathered: [], meadowCleared: false, heardDoom: false,
    health: 100, position: { x: ARI_STAND.x, z: ARI_STAND.z }, playSeconds: 12,
    farming: farming.snapshot(), sunflowerLesson: lesson.snapshot(), skills: skills.snapshot() };
  const result = checkpoint.save(data); assert.equal(result.ok, true, result.reason);
  const loaded = checkpoint.read().data;
  assert.deepEqual(loaded.sunflowerLesson, data.sunflowerLesson);
  const resumed = fixture(); resumed.farming.restore(loaded.farming); resumed.lesson.restore(loaded.sunflowerLesson);
  assert.equal(resumed.lesson.view(12).stage, 'growing');
  assert.equal(resumed.farming.rowState(first, 12).ripeAt, 100);
  loaded.sunflowerLesson.complete = true;
  assert.equal(checkpoint.save(loaded).ok, false, 'cannot save completion without the harvest');
  assert.equal(checkpoint.read().data.sunflowerLesson.complete, false, 'rejected writes preserve prior checkpoint');
  assert.equal(validateSunflowerLesson(undefined), true);
  const before = resumed.lesson.snapshot();
  assert.equal(resumed.lesson.restore({ ...before, row: 'invented-bed' }), false);
  assert.deepEqual(resumed.lesson.snapshot(), before, 'bad restore is atomic');
  assert.equal(resumed.lesson.restore(undefined), true);
  assert.equal(resumed.lesson.view().stage, 'offered');
  const legacy = { ...data }; delete legacy.sunflowerLesson;
  assert.equal(checkpoint.save(legacy).ok, true, 'old adventures remain loadable');
});

test('ordinary Ari conversation supplies the lesson and the green marker persists until report', () => {
  const { lesson } = fixture(); let dialogue;
  const context = { lesson, playSeconds: 0, openDialogue: (npc, lines, event, label, options) => {
    dialogue = { npc, lines, label, ...options };
  }, closeDialogue() {} };
  assert.equal(portCalosConversation(ARI, {}), false);
  assert.equal(sunflowerConversation(ARI, context), true);
  dialogue.choices.find(choice => choice.id === 'ari-sunflower-accept').action();
  assert.match(dialogue.lines.join(' '), /Stanley/);
  dialogue.onComplete();
  assert.equal(lesson.view().stage, 'plant');
  assert.equal(markerFor(ARI.id, { questStage: QUEST_DONE, skillTeachers: lesson.view().teacherIds }).kind, 'skill');
  const tracker = createQuestTracker();
  const updated = tracker.update({ main: { title: 'Road' }, optional: [lesson.view()] });
  assert.ok(updated.choices.some(quest => quest.id === lesson.view().id && quest.grade === 'skill'));
});

test('Ari and both beds occupy reachable village ground without Port Calos duplicates', async () => {
  assert.equal(PORT_CALOS_NPC_IDS.includes(ARI.id), false);
  assert.equal(keepsNpc(ARI), true, 'Ari remains in the live cast after leaving Port Calos');
  assert.equal(ARI.look.hairStyle, 'long-curly'); assert.equal(ARI.look.hat, false);
  assert.equal(regionAt(ARI_STAND.x, ARI_STAND.z).name, 'Drent');
  assert.ok(Math.hypot(ARI_STAND.x - FARMER.x, ARI_STAND.z - FARMER.z) < 200);
  const THREE = await import('../vendor/three.module.js');
  const { buildRenaWorks } = await sourceModule('../src/content/quests/rena/rena-works.js');
  const colliders = [], parent = new THREE.Group();
  buildRenaWorks({ parent, heightAt: () => 2, colliders, signs: { border() {}, place() {}, direction() {} } });
  const world = { colliders, heightAt: () => 2, bounds: { minX: -2000, maxX: 2000, minZ: -2000, maxZ: 2000 } };
  for (const point of [ARI_STAND, ...SUNFLOWER_ROWS, ARI_GARDEN_SUPPLIES])
    assert.equal(canStand(point.x, point.z, world, .45), true, `${point.id ?? 'Ari/supplies'} clears the authored buildings and props`);
});

test('sunflowers have tall stems, golden petals and dark seedheads, then disappear at harvest', async () => {
  const { farming, lesson } = fixture(); lesson.accept(); farming.sow(first, 'sunflower', 0); farming.water(first, 1);
  const THREE = await import('../vendor/three.module.js');
  const { createFarmingView } = await sourceModule('../src/gameplay/skills/farming/farming-view.js');
  const view = createFarmingView({ scene: new THREE.Scene(), world: { heightAt: () => 2 }, farming });
  const name = SUNFLOWER_ROWS[0].name;
  const petals = view.group.getObjectByName(`${name} golden sunflower petals`);
  const heads = view.group.getObjectByName(`${name} dark sunflower seedheads`);
  view.update(1, ARI_STAND); assert.equal(petals.visible, false);
  view.update(90, ARI_STAND);
  assert.equal(petals.visible, true); assert.equal(heads.visible, true);
  assert.equal(petals.count, 80); assert.equal(heads.count, 8);
  const matrix = new THREE.Matrix4(), at = new THREE.Vector3();
  heads.getMatrixAt(0, matrix); at.setFromMatrixPosition(matrix);
  assert.ok(at.y > 3.4, 'mature flowers rise well above low vegetable crops');
  farming.reap(first, 90); view.update(90, ARI_STAND);
  assert.equal(petals.visible, false); assert.equal(heads.visible, false);
  view.dispose();
});
