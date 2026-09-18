import test from 'node:test';
import assert from 'node:assert/strict';
import { createSkills } from '../src/skills.js';
import { COOKING_SKILL, LAKOTA_CUP_WAIT, LAKOTA_MAKES_A_CUP, LAKOTA_TEACHES_THE_CUP, RECIPES, createCooking, validateCookingSnapshot } from '../src/cooking.js';
import { BIRD_WATCHER, birdWatcherConversation } from '../src/birding.js';
import { FOODS } from '../src/consumables.js';
import { INVENTORY_ITEMS } from '../src/inventory.js';
import { PEDDLER_STOCK } from '../src/economy.js';

const satchel = (start = {}) => {
  const bag = { ...start };
  return { bag, count: id => bag[id] ?? 0, has: id => (bag[id] ?? 0) > 0, add(id, n = 1) { bag[id] = (bag[id] ?? 0) + n; return true; },
    remove(id, n = 1) { if ((bag[id] ?? 0) < n) return false; bag[id] -= n; return true; } };
};

test('tell Lakota the day has been bad and he makes you a cup; not twice in a row', () => {
  const cooking = createCooking();
  const first = cooking.cup(100);
  assert.ok(first.ok && first.first && first.healing > 0);
  const again = cooking.cup(100 + 30);
  assert.equal(again.ok, false, 'you have only just finished one');
  assert.ok(again.wait > 0);
  assert.ok(cooking.cup(100 + LAKOTA_CUP_WAIT).ok, 'but later, yes');
  assert.equal(cooking.cups, 2);
  assert.match(LAKOTA_MAKES_A_CUP.join(' '), /chocolate/);
});

test('once he has made you one you can ask for the recipe, and making it is cooking', () => {
  let opened = null, acted = [];
  const cooking = createCooking();
  const talk = () => birdWatcherConversation({ id: BIRD_WATCHER.id }, { birding: { met: true, hasSeen: () => false, feeder: 'hung' }, cooking,
    openDialogue: (npc, lines, event, action, options) => { opened = options; }, closeDialogue() {}, act: action => acted.push(action) });
  talk();
  const ids = () => opened.choices.map(choice => choice.id);
  assert.ok(ids().includes('feeling-bad'), 'you can tell him it has been a bad day');
  assert.ok(!ids().includes('ask-recipe'), 'no recipe before he has made you one');
  opened.choices.find(choice => choice.id === 'feeling-bad').action();
  assert.deepEqual(acted, ['hot-chocolate']);
  cooking.cup(10);
  talk();
  assert.ok(ids().includes('ask-recipe'));
  opened.choices.find(choice => choice.id === 'ask-recipe').action();
  assert.deepEqual(acted, ['hot-chocolate', 'learn-hot-chocolate']);
  cooking.learn('hot-chocolate');
  talk();
  assert.ok(!ids().includes('ask-recipe'), 'asked once');
  assert.match(LAKOTA_TEACHES_THE_CUP.join(' '), /milk/);
});

test('cooking: learned with the recipe, made at a fire from chocolate and milk, and the fish at the fire counts too', () => {
  const skills = createSkills(), cooking = createCooking({ skills });
  const bag = satchel({ chocolate: 1, milk: 1 });
  assert.equal(cooking.make('hot-chocolate', bag).ok, false, 'not before you know how');
  assert.equal(cooking.noteMade('cooked-fish').xp, 0, 'a fish cooked before the skill teaches nothing');
  cooking.learn('hot-chocolate');
  assert.equal(skills.level(COOKING_SKILL), 1);
  const made = cooking.make('hot-chocolate', bag);
  assert.ok(made.ok && made.first && made.xp === RECIPES['hot-chocolate'].xp);
  assert.deepEqual(bag.bag, { chocolate: 0, milk: 0, 'hot-chocolate': 1 });
  const none = cooking.make('hot-chocolate', bag);
  assert.equal(none.ok, false); assert.deepEqual(none.lacking, ['chocolate', 'milk']);
  const secondFish = cooking.noteMade('cooked-fish');
  assert.equal(secondFish.first, false, 'the fish before the lesson was the first');
  assert.equal(validateCookingSnapshot(cooking.snapshot()), true);
  const again = createCooking();
  assert.equal(again.restore(cooking.snapshot()), true);
  assert.equal(again.knows('hot-chocolate'), true);
  assert.equal(validateCookingSnapshot({ ...cooking.snapshot(), met: false }), false, 'no recipe without the skill');
  assert.equal(validateCookingSnapshot({ ...cooking.snapshot(), known: ['soup'] }), false);
});

test('hot chocolate is a drink in the satchel, and Wendel sells what it is made of', () => {
  assert.equal(INVENTORY_ITEMS['hot-chocolate'].type, 'Food');
  assert.equal(INVENTORY_ITEMS['hot-chocolate'].useVerb, 'Drink');
  assert.ok(FOODS['hot-chocolate'].healing >= 40);
  for (const id of ['chocolate', 'milk']) {
    assert.equal(INVENTORY_ITEMS[id].type, 'Ingredient');
    assert.ok(PEDDLER_STOCK.some(entry => entry.id === id), `Wendel sells ${id}`);
  }
});
