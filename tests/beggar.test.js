import test from 'node:test';
import assert from 'node:assert/strict';
import { createBeggar, beggarConversation, BEGGAR_NPC, BEGGAR_LINES, BEGGAR_DEFAULTS } from '../src/beggar.js';
import { TOWN_BEGGAR_ROUTE } from '../src/luscia-town.js';
import { createInventoryState } from '../src/inventory.js';

const route = [{ x: 0, z: 0 }, { x: 8, z: 0 }, { x: 0, z: 8 }];
const far = { x: 200, z: 200 };

/** Run frames with the traveler standing still, Smiths walking to wherever he is told. */
function run(beggar, seconds, position, { step = 1 / 30 } = {}) {
  let here = { x: 0, z: 0 }, said = [], result = null;
  for (let t = 0; t < seconds; t += step) {
    result = beggar.update(step, { position, here });
    here = result.target;
    if (result.line) said.push(result.line);
  }
  return { ...result, said, here };
}

test('Smiths walks his round of the square while nobody is near him', () => {
  const beggar = createBeggar({ waypoints: route });
  const first = beggar.update(1 / 30, { position: far, here: { x: 0, z: 0 } });
  assert.equal(first.following, false);
  assert.deepEqual(first.target, { x: 0, z: 0 });
  // Standing on a point for his dwell time sends him on to the next one.
  const after = run(beggar, BEGGAR_DEFAULTS.dwell + 1, far);
  assert.deepEqual(after.target, { x: 8, z: 0 }, 'he moves on to the next point of his round');
  assert.equal(after.following, false);
});

test('Smiths follows a traveler who comes close, keeping about two metres, and asks for money', () => {
  const beggar = createBeggar({ waypoints: route });
  const near = { x: 4, z: 0 };
  const step = beggar.update(1 / 30, { position: near, here: { x: 0, z: 0 } });
  assert.equal(step.following, true);
  assert.equal(Math.round(Math.hypot(step.target.x - near.x, step.target.z - near.z) * 10) / 10, 2,
    'he stops about two metres short of the traveler');
  const minute = run(beggar, 30, near);
  assert.ok(minute.said.length >= 2, `he asks more than once (${minute.said.length})`);
  assert.equal(minute.said[0], BEGGAR_LINES[0]);
  assert.notEqual(minute.said[0], minute.said[1], 'he does not repeat the same line twice running');
});

test('Smiths gives up after about a minute of being ignored and then leaves the traveler alone', () => {
  const beggar = createBeggar({ waypoints: route });
  const near = { x: 4, z: 0 };
  const ignored = run(beggar, BEGGAR_DEFAULTS.followSeconds - 5, near);
  assert.equal(ignored.following, true);
  const after = run(beggar, 10, near);
  assert.equal(after.following, false, 'he gives up');
  assert.equal(after.resting, true);
  const later = run(beggar, 20, near);
  assert.equal(later.following, false, 'and he does not start again straight away');
});

test('a coin, or a word, sends Smiths away for far longer than being ignored does', () => {
  const beggar = createBeggar({ waypoints: route });
  beggar.update(1 / 30, { position: { x: 4, z: 0 }, here: { x: 0, z: 0 } });
  assert.equal(beggar.state.following, true);
  const coin = beggar.satisfy();
  assert.equal(coin.ok, true);
  assert.equal(beggar.state.following, false);
  assert.ok(coin.resting >= BEGGAR_DEFAULTS.wordRest, 'a coin buys the longest peace');
  const spoken = createBeggar({ waypoints: route });
  spoken.update(1 / 30, { position: { x: 4, z: 0 }, here: { x: 0, z: 0 } });
  const word = spoken.dismiss();
  assert.ok(word.resting >= BEGGAR_DEFAULTS.giveUpRest && word.resting <= coin.resting);
  const still = run(beggar, 60, { x: 4, z: 0 });
  assert.equal(still.following, false, 'a paid Smiths keeps his bargain');
});

test('Smiths stops following once the traveler has left the town', () => {
  const beggar = createBeggar({ waypoints: route });
  const near = { x: 4, z: 0 };
  assert.equal(beggar.update(1 / 30, { position: near, here: { x: 0, z: 0 } }).following, true);
  const gone = run(beggar, 1, { x: BEGGAR_DEFAULTS.leaveRange + 20, z: 0 });
  assert.equal(gone.following, false);
  assert.equal(beggar.state.mode, 'wander');
});

test('speaking to Smiths offers a coin only when one is carried, and both replies end the begging', () => {
  const inventory = createInventoryState();
  const beggar = createBeggar({ waypoints: route });
  const acted = [];
  let shown = null;
  const context = { beggar, inventory, act: id => acted.push(id),
    openDialogue: (npc, lines, event, label, options) => { shown = { npc, lines, options }; },
    closeDialogue: () => {} };
  beggarConversation(BEGGAR_NPC, context);
  assert.equal(shown.options.choices.some(choice => choice.id === 'give-smiths-coin'), false);
  assert.ok(shown.options.choices.some(choice => choice.id === 'thank-smiths'));
  assert.ok(shown.options.choices.some(choice => choice.id === 'nothing-for-smiths'));
  assert.match(shown.lines.join(' '), /coin/i);
  inventory.add('silver-coin', 2);
  beggarConversation(BEGGAR_NPC, context);
  shown.options.choices.find(choice => choice.id === 'give-smiths-coin').action();
  assert.deepEqual(acted, ['give-smiths-coin']);
  shown.options.choices.find(choice => choice.id === 'nothing-for-smiths').action();
  assert.deepEqual(acted, ['give-smiths-coin', 'dismiss-smiths']);
});

test('Smiths keeps to Lumber Town: his round is five points around the square', () => {
  assert.equal(TOWN_BEGGAR_ROUTE.length, 5);
  const spread = TOWN_BEGGAR_ROUTE.map(point => Math.hypot(point.x - TOWN_BEGGAR_ROUTE[0].x, point.z - TOWN_BEGGAR_ROUTE[0].z));
  assert.ok(Math.max(...spread) < BEGGAR_DEFAULTS.leaveRange, 'he never wanders out of town');
  assert.equal(BEGGAR_NPC.id, 'town-beggar');
  assert.equal(BEGGAR_NPC.name, 'Smiths');
});
