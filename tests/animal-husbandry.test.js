import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnimalHusbandry, validateHusbandrySnapshot } from '../src/animal-husbandry.js';
import { createSkills } from '../src/skills.js';
import { createBirding, gardenKeeperConversation, GARDEN_KEEPER } from '../src/birding.js';

const sheep = { id: 'sheep-1', species: 'sheep', x: 2, z: 0 };
const player = { x: 0, z: 0 };
test('care is usable before teaching and repeat practice requires time with a living nearby animal', () => {
  const skills = createSkills(), husbandry = createAnimalHusbandry({ skills });
  assert.equal(husbandry.taught, false);
  assert.equal(husbandry.nearby(player, [sheep]).id, sheep.id);
  assert.equal(husbandry.care(sheep, player, 0).xp, 10);
  for (let now = 0; now < 30; now++) assert.equal(husbandry.care(sheep, player, now).ok, false);
  assert.equal(husbandry.care(sheep, player, 30).xp, 10);
  assert.equal(skills.xp('husbandry'), 20);
  for (const invalid of [{ ...sheep, dead: true }, { ...sheep, hp: 0 }, { ...sheep, x: 20 }, { ...sheep, species: 'wolf' }])
    assert.equal(husbandry.care(invalid, player, 100).ok, false);
  assert.equal(skills.xp('husbandry'), 20);
});

test('Jean introduces Birding and Husbandry separately and discusses Liz without teaching sorcery', () => {
  const skills = createSkills(), birding = createBirding({ skills }), husbandry = createAnimalHusbandry({ skills });
  let choices = [];
  const context = { birding, husbandry, openDialogue: (npc, text, unused, label, options) => { choices = options?.choices ?? []; },
    closeDialogue() {}, act: id => id === 'learn-husbandry' ? husbandry.learn() : birding.meet() };
  gardenKeeperConversation(GARDEN_KEEPER, context);
  assert.ok(choices.find(c => c.id === 'learn-birding'));
  assert.ok(choices.find(c => c.id === 'jean-animal-sorcery'));
  choices.find(c => c.id === 'learn-husbandry').action();
  assert.equal(husbandry.taught, true);
  assert.equal(skills.taught('birding'), false);
  assert.equal(skills.taught('animal-sorcery'), false);
  gardenKeeperConversation(GARDEN_KEEPER, context);
  choices.find(c => c.id === 'learn-birding').action();
  assert.equal(skills.taught('birding'), true);
  assert.equal(skills.xp('husbandry'), 0, 'lessons do not manufacture practice experience');
});

test('care cooldown survives a save, older saves work, and experience lengthens the calming effect', () => {
  const skills = createSkills(), husbandry = createAnimalHusbandry({ skills });
  husbandry.learn();
  const first = husbandry.care(sheep, player, 10);
  const saved = husbandry.snapshot(), restored = createAnimalHusbandry({ skills });
  assert.equal(restored.restore(saved), true);
  assert.equal(restored.care(sheep, player, 20).ok, false);
  skills.gain('husbandry', 100);
  assert.ok(restored.care(sheep, player, 40).calmSeconds > first.calmSeconds);
  assert.equal(validateHusbandrySnapshot(undefined), true);
  for (const invalid of [null, { ...saved, cared: { bad: NaN } }, { ...saved, taught: 'yes' }, { ...saved, version: 2 }])
    assert.equal(validateHusbandrySnapshot(invalid), false);
});
