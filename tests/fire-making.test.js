import test from 'node:test';
import assert from 'node:assert/strict';
import { createFireMaking, LEE_ANNE, FIRE_LESSON_FIRE, FIRE_MAKING_XP, fireMakingStands, validateFireMakingSnapshot, fireMakingConversation } from '../src/fire-making.js';
import { createSkills } from '../src/skills.js';
import { createInventoryState } from '../src/inventory.js';
import { createWeapons } from '../src/weapons.js';
import { createCampcraft } from '../src/campcraft.js';
import { createCooking } from '../src/cooking.js';
import { createRoadsideLessons, jojoCookingChoice } from '../src/roadside-lessons.js';
import { farmingConversation } from '../src/farming-conversation.js';
import { createFarming, FARMER } from '../src/farming.js';
import { SMITH_NPC, smithConversation } from '../src/smith.js';
import { sourceModule } from './module-loader.js';
import { BODY, bodyWorld, stepToward } from '../src/bodies.js';
import { canStand } from '../src/game-state.js';

function fixture() {
  const inventory = createInventoryState(), events = [], skills = createSkills({ onEvent: event => events.push(event) });
  const lesson = createFireMaking({ inventory, skills }), weapons = createWeapons({ inventory });
  const cooking = createCooking({ skills, canUseFire: () => lesson.ready });
  const camp = createCampcraft({ inventory, weapons, canLightFire: id => lesson.mayLight(id), canCook: () => lesson.ready && cooking.met,
    onEvent: event => { if (event.type === 'fire-lit') lesson.lit(event.id); } });
  return { inventory, skills, events, lesson, weapons, cooking, camp };
}
test('lighting the first real fire completes Fire Making before Cooking can begin', () => {
  const f = fixture();
  assert.equal(f.camp.fireStatus(FIRE_LESSON_FIRE).lit, false);
  assert.equal(f.cooking.learn('cooked-fish').ok, false);
  assert.equal(f.lesson.begin().ok, true);
  assert.equal(f.lesson.ready, false); assert.equal(f.skills.taught('firemaking'), false);
  assert.equal(f.inventory.count('forest-stick'), 2); assert.equal(f.inventory.count('tinderbox'), 1);
  assert.equal(f.camp.light('pond-fire').ok, false, 'the demonstration belongs to the empty village ring');
  assert.equal(f.camp.light(FIRE_LESSON_FIRE).ok, true);
  assert.equal(f.lesson.ready, true); assert.equal(f.skills.taught('firemaking'), true);
  assert.equal(f.skills.taught('cooking'), false, 'Lee Anne only teaches Fire Making');
  assert.equal(f.skills.xp('firemaking'), FIRE_MAKING_XP);
  assert.equal(f.inventory.count('forest-stick'), 0); assert.equal(f.inventory.count('tinderbox'), 1);
  assert.equal(f.cooking.learn('cooked-fish').ok, true);
  f.inventory.add('raw-fish', 1);
  assert.equal(f.camp.cook(FIRE_LESSON_FIRE).ok, true);
  assert.equal(f.inventory.count('cooked-fish'), 1);
  assert.equal(f.events.filter(event => event.type === 'skill-learned' && event.id === 'firemaking').length, 1);
});
test('fuel pauses with the world and only successful new fires award repeatable XP', () => {
  const f = fixture(); f.lesson.begin(); f.camp.light(FIRE_LESSON_FIRE);
  f.inventory.add('forest-stick', 2);
  assert.equal(f.camp.light(FIRE_LESSON_FIRE).ok, false);
  assert.equal(f.skills.xp('firemaking'), FIRE_MAKING_XP);
  f.camp.update(200, false); assert.equal(f.camp.fireStatus(FIRE_LESSON_FIRE).fuel, 120);
  f.camp.update(120, true); assert.equal(f.camp.fireStatus(FIRE_LESSON_FIRE).lit, false);
  assert.equal(f.camp.light(FIRE_LESSON_FIRE).ok, true);
  assert.equal(f.skills.xp('firemaking'), FIRE_MAKING_XP * 2);
  assert.equal(f.lesson.begin().first, false); assert.equal(f.inventory.count('forest-stick'), 0, 'returning to the teacher cannot duplicate fuel');
});
test('lesson, guide referral and spent supplies survive reload; legacy Cooking migrates quietly', () => {
  const f = fixture(); f.lesson.refer(); f.lesson.arrived(); f.lesson.begin(); f.inventory.remove('forest-stick', 2);
  const save = f.lesson.snapshot(); assert.equal(validateFireMakingSnapshot(save), true);
  const next = createFireMaking({ inventory: f.inventory, skills: f.skills }); assert.equal(next.restore(save), true);
  assert.deepEqual(next.snapshot(), save); next.begin(); assert.equal(f.inventory.count('forest-stick'), 0);
  assert.equal(next.referral, 'arrived');
  const eventCount = f.events.length;
  next.restore(undefined, { legacyCooking: true });
  assert.equal(next.ready, true); assert.equal(f.skills.taught('firemaking'), true); assert.equal(f.events.length, eventCount);
  for (const bad of [null, { ...save, stage: 'invalid' }, { ...save, firesLit: -1 }, { ...save, suppliesGiven: false }]) assert.equal(validateFireMakingSnapshot(bad), false);
});
test('Jojo defers cooking and starts the referral only when the player accepts', () => {
  const f = fixture(); let shown, referrals = 0;
  const lessons = createRoadsideLessons({ ...f });
  const openDialogue = (npc, lines, action, label, options) => { shown = { npc, lines, label, options }; };
  const choice = jojoCookingChoice({ id: 'harbormaster' }, { lessons, cooking: f.cooking, fireMaking: f.lesson, openDialogue, onChange() {}, leadToLeeAnne() { referrals++; f.lesson.refer(); } });
  choice.action(); assert.equal(referrals, 0); assert.equal(f.cooking.met, false);
  shown.options.onComplete(); assert.equal(referrals, 1); assert.equal(f.lesson.referral, 'leading'); assert.equal(f.cooking.met, false);
  fireMakingConversation(LEE_ANNE, { lesson: f.lesson, openDialogue });
  assert.equal(shown.options.choices.some(one => /cooking/i.test(one.id)), false);
});
test('Stanley respects Fire Making, and blocked lessons do not give cooking supplies', () => {
  const f = fixture(); let shown;
  const lessons = createRoadsideLessons({ ...f });
  assert.equal(lessons.cook().ok, false); assert.equal(f.inventory.has('raw-fish'), false);
  const farming = createFarming({ inventory: f.inventory, skills: f.skills });
  const context = { ...f, farming, fireMaking: f.lesson, openDialogue(npc, lines, action, label, options) { shown = { lines, options }; }, closeDialogue() {} };
  farmingConversation(FARMER, context); shown.options.choices.find(one => one.id === 'stanley-cooking').action();
  assert.match(shown.lines.join(' '), /Lee Anne/); assert.equal(f.cooking.met, false);
  f.lesson.begin(); f.camp.light(FIRE_LESSON_FIRE);
  farmingConversation(FARMER, context); shown.options.choices.find(one => one.id === 'stanley-cooking').action(); shown.options.onComplete();
  assert.equal(f.cooking.knows('farm-pot'), true); assert.equal(f.cooking.knows('roasted-beet'), true);
});
test('Martin teaches Smithing and awards repair XP only for actual wear', () => {
  const f = fixture(); let shown;
  f.inventory.grant('simple-sword'); f.weapons.setCondition('simple-sword', 5);
  const context = { ...f, openDialogue(npc, lines, action, label, options) { shown = { lines, options }; } };
  smithConversation(SMITH_NPC, context); shown.options.choices.find(one => one.id === 'martin-smithing').action(); shown.options.onComplete();
  assert.equal(SMITH_NPC.name, 'Martin'); assert.equal(f.skills.taught('smithing'), true); assert.equal(f.skills.xp('smithing'), 18);
  smithConversation(SMITH_NPC, context); shown.options.choices.find(one => one.id === 'martin-smithing').action(); shown.options.onComplete();
  assert.equal(f.skills.xp('smithing'), 18, 'an undamaged blade cannot be farmed for XP');
});
test('Martin has spectacles and cropped black hair; Lee Anne has cropped blonde hair', async () => {
  const { createCharacter } = await sourceModule('../src/characters.js');
  const martin = createCharacter({ role: SMITH_NPC.modelRole, look: SMITH_NPC.look });
  assert.ok(martin.group.getObjectByName('Spectacles'));
  assert.equal(SMITH_NPC.look.hairStyle, 'cropped'); assert.equal(SMITH_NPC.look.hair, 0x171615);
  const lee = createCharacter({ role: LEE_ANNE.modelRole, look: LEE_ANNE.look });
  assert.ok(lee.group.getObjectByName('Head')); assert.equal(LEE_ANNE.look.hairStyle, 'cropped'); assert.equal(LEE_ANNE.look.hair, 0xd4b45e);
});
test('Jojo can physically guide from the landing to Lee Anne beside the actual village fire ring', async t => {
  const THREE = await import('../vendor/three.module.js');
  const { createWorld } = await sourceModule('../src/world.js');
  const world = createWorld(new THREE.Scene()), fire = world.firePits.find(one => one.id === FIRE_LESSON_FIRE);
  const { teacher: stand, guide: goal } = fireMakingStands(fire), mark = world.npcPositions.doomsayer;
  assert.ok(Math.hypot(stand.x - mark.x, stand.z - mark.z) > 6, 'Lee Anne has her own approach, away from Mark');
  assert.ok(Math.hypot(stand.x - fire.x, stand.z - fire.z) > 3.5, 'the fire interaction is clear of Lee Anne');
  assert.ok(Math.hypot(goal.x - fire.x, goal.z - fire.z) > 3.5, 'Jojo does not occupy the fire interaction');
  assert.ok(canStand(stand.x, stand.z, world, BODY.person), 'Lee Anne has clear ground');
  assert.ok(canStand(goal.x, goal.z, world, BODY.person), 'Jojo has clear ground beside her');
  const position = { ...world.pierHead }, nav = bodyWorld(world).moving(position, BODY.person, 'harbormaster');
  let frames = 0;
  for (; frames < 60 * 60 && Math.hypot(position.x - goal.x, position.z - goal.z) >= .5; frames++) stepToward(position, goal, 2.4 / 60, nav, BODY.person, 1);
  t.diagnostic(`Guide route: ${(frames / 60).toFixed(1)} game seconds; fire (${fire.x}, ${fire.z})`);
  assert.ok(Math.hypot(position.x - goal.x, position.z - goal.z) < .5, `Jojo stalled at ${position.x}, ${position.z}`);
});
