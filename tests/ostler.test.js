import test from 'node:test';
import assert from 'node:assert/strict';
import { createInventoryState } from '../src/inventory.js';
import { createRiding, RIDING_LESSON } from '../src/riding.js';
import { createMorosChapter } from '../src/moros-chapter.js';
import { OSTLER_NPC, OSTLER_TOKEN, horseWaiting, redeemHorse, ostlerConversation } from '../src/ostler.js';

const hitch = { x: -420, z: 236, yaw: 1 };
function fixture({ token = true } = {}) {
  const inventory = createInventoryState(), riding = createRiding(), opened = [], acted = [];
  if (token) inventory.grant(OSTLER_TOKEN);
  const context = { inventory, riding, hitch, playerPosition: { x: -421, z: 237 }, closeDialogue: () => {}, act: id => acted.push(id),
    openDialogue: (npc, lines, _, __, options) => opened.push({ lines, choices: options?.choices ?? [] }) };
  return { inventory, riding, opened, acted, context };
}

test('the token becomes the horse exactly once, and only when the horse can be given', () => {
  const { inventory, riding } = fixture();
  assert.equal(horseWaiting({ inventory, riding }), true);
  assert.equal(redeemHorse({ inventory, riding, hitch: { x: NaN, z: 0 } }).ok, false);
  assert.equal(inventory.has(OSTLER_TOKEN), true, 'a failed handover keeps the token');
  assert.equal(redeemHorse({ inventory, riding, hitch }).ok, true);
  assert.deepEqual([riding.owned, riding.taught, inventory.has(OSTLER_TOKEN), riding.horse], [true, true, false, { x: -420, z: 236, yaw: 1 }]);
  assert.equal(horseWaiting({ inventory, riding }), false);
  assert.match(redeemHorse({ inventory, riding, hitch }).reason, /already/);
  const empty = fixture({ token: false });
  assert.match(redeemHorse({ ...empty, hitch }).reason, /token/);
  assert.equal(horseWaiting(empty), false);
});

test('the ostler turns away the tokenless, teaches the whole lesson at the handover, and fetches a stray horse', () => {
  const none = fixture({ token: false });
  assert.equal(ostlerConversation({ id: 'relay-clerk' }, none.context), false);
  assert.equal(ostlerConversation(OSTLER_NPC, none.context), true);
  assert.deepEqual(none.opened[0].choices, []);
  assert.match(none.opened[0].lines.join(' '), /Iven/);

  const { opened, acted, context, inventory, riding } = fixture();
  ostlerConversation(OSTLER_NPC, context);
  for (const line of RIDING_LESSON) assert.ok(opened[0].lines.includes(line));
  assert.deepEqual(opened[0].choices.map(choice => choice.id), ['redeem-horse', 'leave-ostler']);
  opened[0].choices[0].action();
  assert.deepEqual(acted, ['redeem-horse']);
  redeemHorse({ inventory, riding, hitch });

  ostlerConversation(OSTLER_NPC, context);
  assert.deepEqual(opened.at(-1).choices.map(choice => choice.id), ['ostler-lesson', 'leave-ostler'], 'the horse is in the yard: nothing to fetch');
  riding.place({ x: -700, z: 400 });
  ostlerConversation(OSTLER_NPC, context);
  assert.deepEqual(opened.at(-1).choices.map(choice => choice.id), ['ostler-lesson', 'fetch-horse', 'leave-ostler']);
  opened.at(-1).choices[1].action();
  assert.equal(acted.at(-1), 'fetch-horse');
});

test('at the Moros camp a rider pickets the horse they came on; a walker with a token still draws one from the line', () => {
  const walker = createInventoryState(); walker.grant(OSTLER_TOKEN);
  const onFoot = createMorosChapter({ inventory: walker, hasHorse: () => false });
  onFoot.start(); onFoot.act('admit-to-camp'); onFoot.act('join-muster');
  assert.match(onFoot.view().detail, /token/);
  const drawn = onFoot.act('claim-legion-horse');
  assert.deepEqual([drawn.ok, drawn.reward, walker.has(OSTLER_TOKEN)], [true, { id: 'legion-horse', quantity: 1 }, false]);

  const rider = createInventoryState();
  const mounted = createMorosChapter({ inventory: rider, hasHorse: () => true });
  mounted.start(); mounted.act('admit-to-camp'); mounted.act('join-muster');
  assert.match(mounted.view().detail, /[Pp]icket/);
  assert.match(mounted.availableActions()[0].label, /[Pp]icket/);
  const picketed = mounted.act('claim-legion-horse');
  assert.deepEqual([picketed.ok, picketed.reward, mounted.view().complete], [true, null, true]);

  const neither = createMorosChapter({ inventory: createInventoryState(), hasHorse: () => false });
  neither.start(); neither.act('admit-to-camp'); neither.act('join-muster');
  assert.equal(neither.act('claim-legion-horse').ok, false);
});
