import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';

const { createCharacter } = await sourceModule('../src/characters.js');
const posed = id => {
  const actor = createCharacter();
  for (let frame = 0; frame < 60; frame++) actor.animate(frame / 60, 0, true,
    { action: 'idle', armed: false, guarding: false, emote: id ? { id, progress: .5 } : null });
  return actor;
};

test('Happy and Sad produce distinct readable poses on the actual articulated player', () => {
  const idle = posed(null), happy = posed('happy'), sad = posed('sad');
  const joint = (actor, name) => actor.group.getObjectByName(name);
  assert.ok(joint(happy, 'Right Shoulder').rotation.x < -.8, 'Happy lifts the waving arm');
  assert.ok(joint(happy, 'Right Shoulder').rotation.z > .4, 'Happy opens the waving arm away from the torso');
  assert.ok(joint(sad, 'Head').rotation.x > .3, 'Sad bows the head');
  assert.ok(joint(sad, 'Chest').rotation.x > .15, 'Sad bends the chest forward');
  assert.ok(Math.abs(joint(happy, 'Right Shoulder').rotation.x - joint(idle, 'Right Shoulder').rotation.x) > .7,
    'An expression is visibly different from idle');
  assert.ok(Math.abs(joint(sad, 'Head').rotation.x - joint(happy, 'Head').rotation.x) > .4,
    'Sad and Happy cannot render as the same pose');
});
