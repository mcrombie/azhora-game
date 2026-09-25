import test from 'node:test';
import assert from 'node:assert/strict';
import { createSkills } from '../src/skills.js';
import { createInventoryState } from '../src/inventory.js';
import { createWoodcutting } from '../src/woodcutting.js';
import { createGlunWoodcutting, GLUN_WOOD_LESSON, glunWoodcuttingChoice, validateGlunWoodcuttingSnapshot } from '../src/glun-woodcutting.js';
import { INSTRUCTOR_STAND } from '../src/instructor.js';
import { bodyWorld, BODY, stepToward } from '../src/bodies.js';
import { canStand } from '../src/game-state.js';
import { sourceModule } from './module-loader.js';

function fixture() {
  const skills = createSkills(), inventory = createInventoryState(), events = [];
  const lesson = createGlunWoodcutting({ skills, inventory, onEvent: event => events.push(event) });
  return { skills, inventory, events, lesson };
}

test('Glun demonstrates before practice, a real log completes it, and the hatchet is awarded once', () => {
  const { lesson, skills, inventory, events } = fixture();
  const wood = createWoodcutting({ skills, random: () => 0 });
  assert.equal(lesson.finish().ok, false);
  lesson.begin(); lesson.arrive(); lesson.update(GLUN_WOOD_LESSON.duration);
  assert.equal(lesson.stage, 'practice'); assert.equal(lesson.borrowing, true);
  assert.equal(skills.taught('woodcutting'), true);
  assert.equal(inventory.has('bronze-axe'), false, 'temporary loan is not a permanent reward');
  assert.equal(lesson.noteSwing({ ok: true, tree: { id: GLUN_WOOD_LESSON.treeId } }).ok, false, 'a missed swing earns no completion');
  assert.equal(lesson.noteSwing({ ok: true, log: 'pine-logs', tree: { id: 'some-other-tree' } }).ok, false);
  const cut = wood.swing(GLUN_WOOD_LESSON.treeId, id => inventory.has(id) || (lesson.borrowing && id === 'bronze-axe'));
  assert.equal(cut.log, 'pine-logs'); assert.equal(lesson.noteSwing(cut).ok, true);
  assert.equal(lesson.stage, 'report'); assert.equal(lesson.borrowing, false);
  assert.equal(inventory.has('bronze-axe'), false, 'Glun still needs to hear the report');
  assert.equal(lesson.finish().ok, true); assert.equal(inventory.has('bronze-axe'), true);
  assert.equal(lesson.finish().ok, false); assert.equal(inventory.count('bronze-axe'), 1);
  assert.equal(events.filter(event => event.type === 'glun-wood-swing').length, 3);
  assert.equal(events.filter(event => event.type === 'glun-wood-complete').length, 1);
});

test('demonstration pauses for menus, distance and a missing tree, and each visible cut happens once', () => {
  const { lesson, events } = fixture(); lesson.begin(); lesson.arrive();
  lesson.update(1); lesson.update(20, { paused: true }); lesson.update(20, { nearby: false }); lesson.update(20, { treeStanding: false });
  assert.equal(lesson.view().demonstration, 1);
  for (let i = 0; i < 181; i++) lesson.update(1 / 60);
  assert.equal(lesson.stage, 'practice');
  assert.deepEqual(events.filter(e => e.type === 'glun-wood-swing').map(e => e.number), [1, 2, 3]);
});

test('in-progress and completed lesson saves resume without replaying rewards or skill lessons', () => {
  const { lesson, inventory, skills, events } = fixture();
  for (const move of [() => {}, () => lesson.begin(), () => lesson.arrive(), () => lesson.update(1.1), () => lesson.update(10),
    () => lesson.noteSwing({ ok: true, log: 'pine-logs', tree: { id: GLUN_WOOD_LESSON.treeId } }), () => lesson.finish()]) {
    move(); const saved = lesson.snapshot(); assert.equal(validateGlunWoodcuttingSnapshot(saved), true, saved.stage);
    const count = events.length, restored = createGlunWoodcutting({ skills, inventory, onEvent: event => events.push(event) });
    assert.equal(restored.restore(saved), true); assert.deepEqual(restored.snapshot(), saved);
    assert.equal(events.length, count, 'restoring is silent');
  }
  assert.equal(validateGlunWoodcuttingSnapshot(undefined), true);
  assert.equal(validateGlunWoodcuttingSnapshot({ version: 1, stage: 'practice', demonstration: 0 }), false);
  assert.equal(validateGlunWoodcuttingSnapshot({ version: 1, stage: 'offered', demonstration: 1 }), false);
  assert.equal(validateGlunWoodcuttingSnapshot({ version: 1, stage: 'demonstrating', demonstration: NaN }), false);
  const before = lesson.snapshot(); assert.equal(lesson.restore(null), false); assert.deepEqual(lesson.snapshot(), before);
});

test('another teacher or an already owned hatchet does not reset progression or block Glun', () => {
  const { lesson, skills, inventory } = fixture(); skills.learn('woodcutting'); skills.gain('woodcutting', 200); inventory.grant('bronze-axe');
  const prior = skills.snapshot(); lesson.begin(); lesson.arrive(); lesson.update(10);
  assert.deepEqual(skills.snapshot(), prior);
  lesson.noteSwing({ ok: true, log: 'pine-logs', tree: { id: GLUN_WOOD_LESSON.treeId } });
  assert.equal(lesson.finish().alreadyOwned, true); assert.equal(inventory.count('bronze-axe'), 1);
});

test('Glun dialogue starts only on accepting the optional lesson and reports only after practice', () => {
  const { lesson } = fixture(); let shown;
  const context = { lesson, closeDialogue() {}, openDialogue: (npc, lines, event, action, options) => { shown = { lines, options }; } };
  assert.equal(glunWoodcuttingChoice({ name: 'Glun' }, context).id, 'glun-wood-begin');
  glunWoodcuttingChoice({ name: 'Glun' }, context).action(); assert.equal(lesson.stage, 'offered');
  shown.options.onComplete(); assert.equal(lesson.stage, 'leading');
  lesson.arrive(); lesson.update(10); assert.equal(glunWoodcuttingChoice({ name: 'Glun' }, context).id, 'glun-wood-practice');
  lesson.noteSwing({ ok: true, log: 'pine-logs', tree: { id: GLUN_WOOD_LESSON.treeId } });
  assert.equal(glunWoodcuttingChoice({ name: 'Glun' }, context).id, 'glun-wood-finish');
});

test('Glun can walk from the village training post to his demonstration pine through the built world', async t => {
  const THREE = await import('../vendor/three.module.js');
  const { createWorld } = await sourceModule('../src/world.js');
  const world = createWorld(new THREE.Scene()), target = GLUN_WOOD_LESSON.stand;
  const position = { x: INSTRUCTOR_STAND.x, z: INSTRUCTOR_STAND.z };
  const nav = bodyWorld(world).moving(position, BODY.person, 'instructor');
  assert.ok(canStand(position.x, position.z, world, BODY.person), 'Glun starts on walkable ground');
  assert.ok(canStand(target.x, target.z, world, BODY.person), `Glun\'s stand is walkable at ${target.x}, ${target.z}`);
  assert.ok(canStand(GLUN_WOOD_LESSON.practiceStand.x, GLUN_WOOD_LESSON.practiceStand.z, world, BODY.traveler), 'the traveler has a clear practice stand');
  let frames = 0, traveled = 0;
  for (; frames < 60 * 60 && Math.hypot(position.x - target.x, position.z - target.z) >= .45; frames++) {
    const previous = { ...position };
    stepToward(position, target, 2.4 / 60, nav, BODY.person, -1);
    const step = Math.hypot(position.x - previous.x, position.z - previous.z);
    assert.ok(step <= 2.4 / 60 + 1e-8, 'no teleport is used to clear an obstacle');
    assert.ok(canStand(position.x, position.z, world, BODY.person), 'the guide stays outside actual scenery colliders');
    traveled += step;
  }
  const remaining = Math.hypot(position.x - target.x, position.z - target.z);
  t.diagnostic(`${(frames / 60).toFixed(2)} game seconds, ${traveled.toFixed(2)} m walked, ${remaining.toFixed(2)} m remaining; stand (${target.x}, ${target.z})`);
  assert.ok(remaining < .45, `Glun stalled at (${position.x.toFixed(2)}, ${position.z.toFixed(2)}) with ${remaining.toFixed(2)} m remaining after 60 game seconds`);
});
