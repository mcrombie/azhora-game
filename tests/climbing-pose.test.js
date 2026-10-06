import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { SKILLS, createSkills } from '../src/gameplay/skills/skills.js';
import { SKILL_ICONS } from '../src/ui/skills/skill-icons.js';

const { createCharacter } = await sourceModule('../src/content/characters/characters.js');
const joint = (actor, name) => actor.group.getObjectByName(name);
const point = (actor, name) => joint(actor, name).getWorldPosition(new THREE.Vector3());
const grip = (progress = Math.PI / 2, extra = {}) => ({ phase: 'climbing', progress, moving: true, slope: Math.PI / 3, ...extra });
function settle(actor, climbing, start = 0, other = {}) {
  for (let i = 0; i <= 120; i++) actor.animate(start + i / 60, 2, false, { ...other, climbing });
  actor.group.updateMatrixWorld(true);
}
const joints = ['Weight and hips', 'Chest', 'Head', 'Left Shoulder', 'Right Shoulder', 'Left Elbow', 'Right Elbow',
  'Left Wrist', 'Right Wrist', 'Left Hip', 'Right Hip', 'Left Knee', 'Right Knee', 'Left Ankle', 'Right Ankle'];

test('a climber reaches uphill with alternating hands and bent feet instead of running in midair', () => {
  const actor = createCharacter();
  settle(actor, grip());
  const left = point(actor, 'Left Wrist'), right = point(actor, 'Right Wrist'), head = point(actor, 'Head');
  assert.ok(left.y > head.y + .1, 'One hand reaches above the head for the next hold');
  assert.ok(left.z > head.z + .15 && right.z > head.z + .15, 'Both hands reach toward the rock');
  assert.ok(left.y > right.y + .15, 'One hand supports while the other reaches');
  assert.ok(joint(actor, 'Left Knee').rotation.x > .8 && joint(actor, 'Right Knee').rotation.x > .8, 'Both legs brace against the slope');
  assert.ok(point(actor, 'Left Ankle').y < point(actor, 'Right Ankle').y, 'The opposite foot moves up with the reaching hand');
  settle(actor, grip(Math.PI * 1.5), 3);
  assert.ok(point(actor, 'Right Wrist').y > point(actor, 'Left Wrist').y + .15, 'The next stroke exchanges hand grips');
  assert.ok(point(actor, 'Right Ankle').y < point(actor, 'Left Ankle').y, 'The feet exchange holds as well');
});

test('hanging freezes the grip through time and overrides stale walking, jumping, casting and guard poses', () => {
  const actor = createCharacter(), control = createCharacter();
  actor.setWeapon('wand'); control.setWeapon('wand');
  settle(actor, grip(.4, { moving: false }));
  const held = joints.map(name => joint(actor, name).quaternion.clone());
  const wrists = ['Left Wrist', 'Right Wrist'].map(name => point(actor, name));
  settle(actor, grip(.4, { moving: false }), 8, { action: 'attack', armed: true, spellCast: { progress: .5 }, guarding: true, sneaking: true });
  settle(control, grip(.4, { moving: false }), 8);
  for (let i = 0; i < joints.length; i++) {
    assert.ok(joint(actor, joints[i]).quaternion.angleTo(held[i]) < 1e-6, `${joints[i]} holds its grip instead of idling`);
    assert.ok(joint(actor, joints[i]).quaternion.angleTo(joint(control, joints[i]).quaternion) < 1e-6, `${joints[i]} ignores unrelated animation overlays`);
  }
  for (let i = 0; i < wrists.length; i++) assert.ok(point(actor, i ? 'Right Wrist' : 'Left Wrist').distanceTo(wrists[i]) < 1e-6);
});

test('both palms and bent elbows stay outside a steep rock face throughout the climbing stroke', () => {
  const actor = createCharacter(); let time = 0;
  for (const rise of [1.5, 2, 2.5, 5]) for (let progress = 0; progress < Math.PI * 2; progress += Math.PI / 6) {
    const climbing = grip(progress, { slope: Math.atan(rise) });
    for (let i = 0; i < 80; i++) actor.animate(time += 1 / 60, 0, false, { climbing });
    actor.group.updateMatrixWorld(true);
    for (const side of ['Left', 'Right']) {
      const palm = joint(actor, `${side} Wrist`).localToWorld(new THREE.Vector3(0, -.065, .01));
      const clearance = (palm.y - rise * palm.z) / Math.hypot(1, rise);
      assert.ok(clearance > .025 && clearance < .16, `${side} palm touches the visible side of the slope at rise ${rise}, phase ${progress.toFixed(2)}`);
      const elbow = point(actor, `${side} Elbow`);
      assert.ok((elbow.y - rise * elbow.z) / Math.hypot(1, rise) > .06, 'The bent elbow stays clear of the rock too');
    }
  }
});

test('the climber fits the slope and visibly loses the grip when falling, then resumes an ordinary grounded pose', () => {
  const actor = createCharacter(), idle = createCharacter();
  settle(actor, grip(0, { slope: Math.PI / 4 }));
  const shallow = joint(actor, 'Weight and hips').rotation.x;
  settle(actor, grip(0, { slope: 1.4 }), 3);
  assert.ok(shallow > joint(actor, 'Weight and hips').rotation.x + .5, 'An upright cliff straightens the body while a shallower slope leans it forward');
  const heldHands = [point(actor, 'Left Wrist'), point(actor, 'Right Wrist')];
  settle(actor, grip(0, { phase: 'falling' }), 6);
  assert.ok(Math.abs(joint(actor, 'Left Shoulder').rotation.z) > .4, 'The arms spread after letting go');
  assert.ok(point(actor, 'Left Wrist').y < heldHands[0].y - .1 && point(actor, 'Right Wrist').y < heldHands[1].y - .1, 'The hands drop away from their grips');
  for (let i = 0; i <= 240; i++) {
    actor.animate(9 + i / 60, 0, true, {});
    idle.animate(9 + i / 60, 0, true, {});
  }
  for (const name of joints) assert.ok(joint(actor, name).quaternion.angleTo(joint(idle, name).quaternion) < 1e-6, `${name} returns to its regular pose`);
});

test('climbing is a working skill with a distinct mark and backwards compatible learning and experience', () => {
  assert.equal(SKILLS.climbing.kind, 'working');
  assert.ok(SKILL_ICONS.climbing);
  assert.match(SKILLS.climbing.teacher, /first grip/);
  const old = createSkills(); old.learn('swimming'); old.gain('swimming', 83);
  const learned = createSkills(); assert.equal(learned.restore(old.snapshot()), true);
  assert.equal(learned.taught('climbing'), false);
  assert.equal(learned.learn('climbing').first, true);
  assert.equal(learned.learn('climbing').first, false);
  assert.equal(learned.gain('climbing', 83).ok, true);
  assert.equal(learned.level('climbing'), 2);
  const restored = createSkills(); assert.equal(restored.restore(learned.snapshot()), true);
  assert.equal(restored.level('climbing'), 2); assert.equal(restored.taught('climbing'), true);
  assert.equal(restored.level('swimming'), 2, 'The older skill is left unchanged');
});
