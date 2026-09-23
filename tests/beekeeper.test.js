import test from 'node:test';
import assert from 'node:assert/strict';
import { HONEYCOMB, COMB_PRICE, BEE_LINES, createBeekeeper, validateBeekeeperSnapshot } from '../src/beekeeper.js';
import { LIZ, createCatQuest, lizConversation } from '../src/cat-quest.js';
import { INVENTORY_ITEMS, createInventoryState } from '../src/inventory.js';

/**
 * **The comb, which is Liz's trade now** (the user, 22 September 2026: Troy goes to Cobble and
 * the skeps go to Liz). The machinery did not move - how many have been cut, what the next one
 * costs, what happens when the satchel is full - so this is still its test; who is holding the
 * knife is `src/cat-quest.js`.
 */

/** A dialogue box that records what she says and lets a test pick a reply. */
function talkTo(comb, { coppers = 0, visits = 0, cat = createCatQuest(), onComb = () => {} } = {}) {
  const screens = [];
  lizConversation({ id: LIZ.id }, {
    cat, comb, coppers, visits,
    openDialogue: (npc, lines, event, action, options = {}) => screens.push({ lines, ...options }),
    closeDialogue: () => {},
    act: id => { if (id === 'take-honeycomb') onComb(); },
  });
  return { screens, pick: id => screens.at(-1).choices.find(choice => choice.id === id)?.action(),
    has: id => screens.at(-1).choices.some(choice => choice.id === id) };
}

test('the first comb is a gift, and after that it goes toward the next skep', () => {
  const comb = createBeekeeper(), inventory = createInventoryState();
  const first = talkTo(comb, { onComb: () => comb.takeComb({ give: () => inventory.add(HONEYCOMB, 1) }) });
  assert.equal(comb.price(), 0, 'the first is a gift');
  assert.equal(first.screens[0].choices.find(choice => choice.id === 'take-honeycomb').label, 'Take the comb');
  first.pick('take-honeycomb');
  assert.equal(inventory.count(HONEYCOMB), 1);
  assert.equal(comb.combs, 1);
  assert.equal(comb.price(), COMB_PRICE, 'after that she asks for the next skep');
});

test('a comb costs coppers, and she does not offer one the traveler cannot pay for', () => {
  const comb = createBeekeeper(), inventory = createInventoryState();
  comb.meet(); comb.takeComb({ give: () => inventory.add(HONEYCOMB, 1) });
  assert.equal(talkTo(comb, { coppers: 9 }).has('take-honeycomb'), true);
  const broke = talkTo(comb, { coppers: 1 });
  assert.equal(broke.has('take-honeycomb'), false, 'nothing to click that would fail');
  assert.equal(broke.has('ask-bees'), true, 'she will still talk about the bees');
  // The purse is only spent when a comb is actually handed over.
  let spent = 0;
  const refused = comb.takeComb({ purse: n => { spent += n; return true; }, give: () => false });
  assert.equal(refused.ok, false); assert.equal(refused.refund, COMB_PRICE); assert.equal(spent, COMB_PRICE);
  assert.equal(comb.combs, 1, 'and no comb was counted');
  const poor = comb.takeComb({ purse: () => false });
  assert.equal(poor.ok, false); assert.match(poor.reason, /2 copper/);
});

test('she has something new to say about the bees each time, and the satchel knows honeycomb', () => {
  const comb = createBeekeeper();
  comb.meet();
  const cat = createCatQuest(); cat.ask(); cat.accept();   // past the asking, so the choices are the plain ones
  const heard = BEE_LINES.map((_, visits) => {
    const talk = talkTo(comb, { visits, cat });
    talk.pick('ask-bees');
    return talk.screens.at(-1).lines[0];
  });
  assert.deepEqual(heard, [...BEE_LINES]);
  assert.equal(INVENTORY_ITEMS[HONEYCOMB].type, 'Food');
  assert.equal(BEE_LINES.some(line => /Troy/.test(line)), false, 'she does not name the man who used to keep them');
});

test('the combs that have been cut are saved, and nonsense is refused', () => {
  const comb = createBeekeeper();
  comb.meet(); comb.takeComb(); comb.takeComb({ purse: () => true });
  const restored = createBeekeeper();
  assert.equal(restored.restore(comb.snapshot()), true);
  assert.equal(restored.combs, 2); assert.equal(restored.met, true);
  for (const bad of [null, [], { version: 2, met: true, combs: 0 }, { version: 1, met: 'yes', combs: 0 }, { version: 1, met: true, combs: -1 }])
    assert.equal(validateBeekeeperSnapshot(bad), false);
  assert.equal(validateBeekeeperSnapshot(undefined), true, 'a save from before the skeps is fine');
});
