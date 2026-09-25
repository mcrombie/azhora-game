import test from 'node:test';
import assert from 'node:assert/strict';
import { createFishingLessons, FISHING_TEACHERS, FISHING_DEMO_SECONDS, fishingLessonChoices, fishingLessonRoute, validateFishingLessonsSnapshot } from '../src/fishing-lessons.js';
import { createFishing, waterOf } from '../src/fishing-skill.js';
import { createSkills } from '../src/skills.js';
import { createInventoryState } from '../src/inventory.js';
import { createCampcraft } from '../src/campcraft.js';
import { BODY, bodyWorld, stepToward } from '../src/bodies.js';
import { canStand } from '../src/game-state.js';
import { INSTRUCTOR_STAND } from '../src/instructor.js';
import { JEAN_STAND } from '../src/birding.js';
import { FARMER } from '../src/farming.js';
import { sourceModule } from './module-loader.js';
const start = { x: 0, z: 0 }, bank = { x: 6, z: 0 }, route = [bank];
function fixture() {
  const skills = createSkills(), inventory = createInventoryState(), fishing = createFishing({ skills }), events = [];
  const lessons = createFishingLessons({ fishing, inventory, onEvent: event => events.push(event) });
  const campcraft = createCampcraft({ inventory, weapons: {} });
  return { skills, inventory, fishing, events, lessons, campcraft };
}
function demonstrate(lessons, teacher = 'instructor') {
  assert.equal(lessons.begin(teacher, start).ok, true);
  lessons.guide(bank, bank, route); lessons.update(FISHING_DEMO_SECONDS);
  assert.equal(lessons.view().stage, 'practice');
}

test('each teacher demonstrates, grants one shared rod, and requires a real catch in their water', () => {
  const f = fixture(); let priorXP = 0;
  for (const [id, teacher] of Object.entries(FISHING_TEACHERS)) {
    demonstrate(f.lessons, id);
    assert.equal(f.skills.taught('fishing'), true); assert.equal(f.inventory.count('fishing-rod'), 1);
    assert.equal(f.skills.xp('fishing'), priorXP, 'a lesson never resets XP or awards practice XP');
    assert.equal(f.lessons.noteCatch(teacher.spot, { ok: false }).ok, false);
    assert.equal(f.campcraft.cast().ok, true); f.campcraft.update(1);
    assert.equal(f.lessons.noteCatch(teacher.spot, f.campcraft.reel()).ok, false, 'early reel fails the exercise');
    f.campcraft.cast(); f.campcraft.update(3);
    assert.equal(f.campcraft.reel().ok, true);
    const landed = f.fishing.land(teacher.spot, .01);
    assert.equal(f.lessons.noteCatch('tessen-bank', landed).ok, false, 'fishing elsewhere is not this exercise');
    assert.equal(f.lessons.noteCatch(teacher.spot, landed, { nearby: false }).ok, false, 'teacher must be present');
    assert.equal(f.lessons.noteCatch(teacher.spot, landed).ok, true);
    assert.equal(f.lessons.noteCatch(teacher.spot, landed).ok, false, 'completion fires once');
    priorXP = f.skills.xp('fishing'); assert.ok(priorXP > 0); f.lessons.home();
  }
  assert.deepEqual(f.lessons.view().completed.sort(), Object.keys(FISHING_TEACHERS).sort());
  demonstrate(f.lessons, 'instructor');
  assert.equal(f.inventory.count('fishing-rod'), 1, 'a repeat outing cannot duplicate rods');
  assert.equal(f.skills.xp('fishing'), priorXP); assert.equal(waterOf('avrel-pool'), 'pond');
});

test('guides stop when left behind and demonstrations pause for menus, combat or distance', () => {
  const { lessons } = fixture(); lessons.begin('garden-keeper', start);
  assert.equal(lessons.begin('doomsayer', start).ok, false, 'only one guide at a time');
  let guidance = lessons.guide(start, { x: -12, z: 0 }, route);
  assert.deepEqual(guidance.target, start); assert.equal(guidance.waiting, true);
  assert.equal(lessons.guide(start, { x: -8, z: 0 }, route).waiting, true, 'hysteresis prevents stop/start jitter');
  assert.deepEqual(lessons.guide(start, { x: -6, z: 0 }, route).target, bank);
  assert.deepEqual(lessons.guide(start, start, route, { paused: true }).target, start);
  lessons.guide(bank, bank, route); lessons.update(1);
  lessons.update(30, { paused: true }); lessons.update(30, { nearby: false });
  assert.equal(lessons.view().demonstration, 1);
  lessons.guide(bank, { x: 30, z: 0 }, route); lessons.update(30);
  assert.equal(lessons.view().demonstration, 1);
  lessons.guide(bank, bank, route); lessons.update(3); assert.equal(lessons.view().stage, 'practice');
  lessons.guide(bank, bank, route, { alive: false }); assert.equal(lessons.view().stage, 'idle');
});

test('lesson checkpoints preserve route progress and knowledge; legacy saves and invalid records are safe', () => {
  const f = fixture();
  for (const advance of [() => {}, () => f.lessons.begin('avrel-farmer', start), () => f.lessons.guide(bank, bank, route), () => f.lessons.update(1), () => f.lessons.update(3), () => f.lessons.leave(), () => f.lessons.home()]) {
    advance(); const saved = f.lessons.snapshot(), eventCount = f.events.length;
    assert.equal(validateFishingLessonsSnapshot(saved), true, saved.stage);
    const copy = createFishingLessons({ fishing: f.fishing, inventory: f.inventory, onEvent: e => f.events.push(e) });
    assert.equal(copy.restore(saved), true); assert.deepEqual(copy.snapshot(), saved); assert.equal(f.events.length, eventCount);
  }
  const prior = f.lessons.snapshot();
  for (const bad of [null, { ...prior, teacher: 'unknown' }, { ...prior, position: bank }, { ...prior, completed: ['instructor', 'instructor'] }, { ...prior, demonstration: NaN }]) {
    assert.equal(f.lessons.restore(bad), false); assert.deepEqual(f.lessons.snapshot(), prior);
  }
  assert.equal(validateFishingLessonsSnapshot(undefined), true);
  assert.equal(f.lessons.restore(undefined), true); assert.equal(f.fishing.taught, true, 'old lesson state never resets the shared skill');
});

test('dialogue explicitly starts an outing and can cancel it without closing other teaching routes', () => {
  const { lessons, fishing } = fixture(); let shown;
  const npc = { id: 'doomsayer', name: 'Mark' }, context = { lessons, fishing, position: () => start, closeDialogue() {}, openDialogue: (npc, lines, event, action, options) => { shown = { lines, options }; } };
  fishingLessonChoices(npc, context)[0].action(); assert.equal(lessons.view().stage, 'idle');
  shown.options.onComplete(); assert.equal(lessons.view().stage, 'leading');
  const choices = fishingLessonChoices(npc, context);
  assert.ok(choices.some(choice => choice.id === 'fishing-lesson-resume'));
  choices.find(choice => choice.id === 'fishing-lesson-leave').action(); assert.equal(lessons.view().stage, 'returning');
  assert.equal(fishingLessonChoices({ id: 'garden-keeper' }, context)[0].disabled, true);
});

test('all four teachers can physically walk to their demonstration bank through actual scenery', async t => {
  const THREE = await import('../vendor/three.module.js'); const { createWorld } = await sourceModule('../src/world.js');
  const world = createWorld(new THREE.Scene());
  const starts = { instructor: INSTRUCTOR_STAND, doomsayer: world.npcPositions.doomsayer, 'garden-keeper': JEAN_STAND, 'avrel-farmer': FARMER };
  for (const id of Object.keys(FISHING_TEACHERS)) {
    const position = { x: starts[id].x, z: starts[id].z }, spot = world.fishingSpots.find(s => s.id === FISHING_TEACHERS[id].spot);
    assert.ok(spot, id + ' has a real fishing location');
    const path = fishingLessonRoute(id, spot, position), lessons = createFishingLessons(); lessons.begin(id, position);
    const nav = bodyWorld(world).moving(position, BODY.person, id);
    for (const p of [spot.fishingSpot, path.at(-1)]) assert.ok(canStand(p.x, p.z, world, BODY.person), id + ' has clear dry banks');
    let frames = 0;
    for (; frames < 100 * 60 && lessons.view().stage === 'leading'; frames++) {
      const guide = lessons.guide(position, position, path), before = { ...position };
      stepToward(position, guide.target, 2.4 / 60, nav, BODY.person, id.length % 2 ? 1 : -1);
      assert.ok(Math.hypot(position.x - before.x, position.z - before.z) <= 2.4 / 60 + 1e-8, 'no teleport');
      assert.ok(canStand(position.x, position.z, world, BODY.person), id + ' remains outside collision footprints');
      const depth = world.waterAt(position.x, position.z) - world.heightAt(position.x, position.z); assert.ok(depth <= .3, id + ' does not wade through the pond');
    }
    t.diagnostic(id + ': ' + (frames / 60).toFixed(2) + ' seconds to (' + position.x.toFixed(2) + ', ' + position.z.toFixed(2) + ')');
    assert.equal(lessons.view().stage, 'demonstrating', id + ' reaches the stand instead of getting stuck');
  }
});
