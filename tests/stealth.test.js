import test from 'node:test';
import assert from 'node:assert/strict';
import { createStealth, STEALTH } from '../src/stealth.js';
import { createSkills, validateSkillsSnapshot } from '../src/skills.js';
import { sourceModule } from './module-loader.js';

const guard = { x: 0, z: 0, yaw: 0 };
const advance = (stealth, count, extra = {}) => {
  let view;
  for (let i = 0; i < count; i++) view = stealth.update({ dt: .1, position: { x: 0, z: 8 }, guards: [guard], ...extra });
  return view;
};

test('a guard sees ahead, not through the back of his head, and turns with his yaw', () => {
  const stealth = createStealth();
  assert.equal(advance(stealth, 1).visible, true);
  assert.equal(advance(stealth, 1, { position: { x: 0, z: -8 } }).visible, false);
  assert.equal(advance(stealth, 1, { position: { x: 0, z: -8 }, guards: [{ ...guard, yaw: Math.PI }] }).visible, true);
  assert.equal(advance(stealth, 1, { position: { x: 8, z: 0 }, guards: [{ ...guard, yaw: Math.PI / 2 }] }).visible, true);
  assert.equal(advance(stealth, 1, { position: { x: 0, z: -1 } }).visible, true, 'touching a guard is noticeable in any direction');
});

test('walking in view builds an alarm once; leaving sight makes another attempt possible', () => {
  const stealth = createStealth();
  let alarms = 0;
  for (let i = 0; i < 40; i++) alarms += Number(advance(stealth, 1).caught);
  assert.equal(alarms, 1);
  assert.equal(stealth.view().detected, true);
  assert.equal(advance(stealth, 40, { position: { x: 20, z: 20 } }).detected, false);
  for (let i = 0; i < 20; i++) alarms += Number(advance(stealth, 1).caught);
  assert.equal(alarms, 2);
});

test('sneaking buys time but is neither invisibility nor protection at touching distance', () => {
  const walking = createStealth(), sneaking = createStealth();
  assert.equal(advance(walking, 15).detected, true);
  const quiet = advance(sneaking, 15, { sneaking: true, taught: true });
  assert.ok(quiet.suspicion > .3 && quiet.suspicion < .8);
  assert.equal(quiet.detected, false);
  assert.equal(advance(sneaking, 20, { sneaking: true, taught: true }).detected, true);
  sneaking.reset();
  assert.equal(advance(sneaking, 10, { position: { x: 0, z: -1 }, sneaking: true, taught: true }).detected, true);
});

test('walls, inactive guards, and distance remove both detection and dangerous practice', () => {
  for (const options of [
    { lineOfSight: () => false }, { guards: [{ ...guard, active: false }] },
    { guards: [{ ...guard, alive: false }] }, { guards: [{ x: 200, z: 200 }] },
  ]) {
    const stealth = createStealth();
    stealth.reset({ x: 0, z: 6 });
    for (let i = 1; i <= 20; i++) {
      const view = advance(stealth, 1, { sneaking: true, taught: true, position: { x: i * .1, z: 6 }, ...options });
      assert.equal(view.visible, false); assert.equal(view.danger, false); assert.equal(view.xp, 0);
    }
  }
});

test('only actual, taught sneaking near danger pays practice, at a distance-based rate', () => {
  const stealth = createStealth();
  stealth.reset({ x: -3, z: -6 });
  let paid = 0;
  for (let i = 1; i <= 30; i++) {
    const view = advance(stealth, 1, { sneaking: true, taught: true, position: { x: -3 + i * .2, z: -6 } });
    assert.equal(view.visible, false); assert.equal(view.danger, true);
    paid += view.xp;
  }
  assert.equal(paid, Math.floor(6 * STEALTH.xpPerMetre));
  assert.equal(advance(stealth, 20, { sneaking: true, taught: true, position: { x: 3, z: -6 } }).xp, 0, 'standing still never pays');
  assert.equal(advance(stealth, 1, { sneaking: true, taught: false, position: { x: 3.1, z: -6 } }).xp, 0);
  assert.equal(advance(stealth, 1, { sneaking: false, taught: true, position: { x: 3.2, z: -6 } }).xp, 0);
});

test('pauses, spawning, teleports, and long delayed frames never turn into practice', () => {
  const stealth = createStealth();
  const quiet = { sneaking: true, taught: true, position: { x: 0, z: -6 } };
  assert.equal(advance(stealth, 1, quiet).xp, 0, 'first position seeds the walk');
  assert.equal(advance(stealth, 1, { ...quiet, position: { x: 8, z: -6 } }).xp, 0, 'teleport has no XP');
  assert.equal(advance(stealth, 1, { ...quiet, paused: true, position: { x: 8.1, z: -6 } }).xp, 0);
  assert.equal(advance(stealth, 1, { ...quiet, dt: 5, position: { x: 8.2, z: -6 } }).xp, 0);
  assert.equal(advance(stealth, 1, { ...quiet, dt: 0, position: { x: 8.3, z: -6 } }).xp, 0);
  const before = advance(stealth, 3).suspicion;
  const paused = advance(stealth, 100, { paused: true });
  assert.equal(paused.suspicion, before); assert.equal(paused.caught, false);
});

test('detected movement cannot farm experience; all returned state is safe to copy', () => {
  const stealth = createStealth();
  advance(stealth, 40, { sneaking: true, taught: true });
  const detected = advance(stealth, 1, { sneaking: true, taught: true, position: { x: .2, z: 8 } });
  assert.equal(detected.detected, true); assert.equal(detected.xp, 0);
  detected.suspicion = -100;
  assert.equal(stealth.view().suspicion, 1);
  stealth.reset({ x: 0, z: -4 });
  assert.equal(stealth.view().suspicion, 0);
  const invalid = stealth.update({ dt: Infinity, position: { x: NaN, z: 0 }, guards: [{ x: 0 }] });
  assert.equal(invalid.xp, 0); assert.equal(invalid.danger, false);
});

test('stealth experience and Killian teaching survive saves without requiring old saves to contain either', () => {
  const skills = createSkills();
  assert.equal(skills.taught('stealth'), false);
  skills.learn('stealth'); skills.gain('stealth', 83);
  assert.equal(skills.level('stealth'), 2);
  const saved = skills.snapshot(), copy = createSkills();
  assert.equal(validateSkillsSnapshot(saved), true); assert.equal(copy.restore(saved), true);
  assert.equal(copy.taught('stealth'), true); assert.equal(copy.xp('stealth'), 83);
  assert.equal(copy.restore({ version: 1, skills: { blades: { xp: 100 } }, taught: ['blades'] }), true);
  assert.equal(copy.taught('stealth'), false); assert.equal(copy.xp('stealth'), 0);
});

const { createCharacter } = await sourceModule('../src/characters.js');
test('sneaking bends the knees and lowers the hips without scaling the character or leaving the pose stuck', () => {
  const actor = createCharacter(), rootScale = actor.group.scale.toArray();
  const joint = name => actor.group.getObjectByName(name);
  for (let i = 0; i < 120; i++) actor.animate(i / 60, 0, true, {});
  const standing = joint('Weight and hips').position.y, knee = joint('Left Knee').rotation.x;
  for (let i = 120; i < 240; i++) actor.animate(i / 60, 0, true, { sneaking: true });
  assert.ok(joint('Weight and hips').position.y < standing - .08, 'hips settle into the crouch');
  assert.ok(joint('Left Knee').rotation.x > knee + .8, 'knees bend instead of shrinking the model');
  assert.ok(joint('Chest').rotation.x > .15, 'shoulders lean forward');
  assert.deepEqual(actor.group.scale.toArray(), rootScale);
  for (let i = 240; i < 360; i++) actor.animate(i / 60, 0, true, {});
  assert.ok(Math.abs(joint('Weight and hips').position.y - standing) < .03);
  assert.ok(Math.abs(joint('Left Knee').rotation.x - knee) < .01);
});
