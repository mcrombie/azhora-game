import test from 'node:test';
import assert from 'node:assert/strict';
import { createInventoryState } from '../src/inventory.js';
import { MOROS_GATE_ID, MOROS_LEGATE_ID, MOROS_PAY, MOROS_SITES, MOROS_SITE_ACTIONS, createMorosChapter, morosConversation, validateMorosSnapshot } from '../src/moros-chapter.js';

function fixture({ token = true } = {}) {
  const inventory = createInventoryState(), events = [];
  if (token) inventory.add('horse-token', 1);
  const moros = createMorosChapter({ inventory, onEvent: event => events.push(event) });
  return { inventory, events, moros };
}

test('the chapter runs gate, muster, horse, in that order and pays each reward exactly once', () => {
  const { moros, inventory, events } = fixture();
  assert.equal(moros.view().stage, 'not-started');
  assert.equal(moros.act('admit-to-camp').ok, false, 'nothing happens before the Lauvel is settled');
  assert.equal(moros.start().ok, true); assert.equal(moros.start().ok, false);
  assert.deepEqual(moros.view().destinationIds, [MOROS_GATE_ID]);
  assert.equal(moros.act('join-muster').ok, false, 'the Marshal does not see men the gate has not admitted');
  assert.equal(moros.act('admit-to-camp').ok, true);
  assert.deepEqual(moros.view().destinationIds, [MOROS_LEGATE_ID]);
  assert.equal(moros.act('claim-legion-horse').ok, false);
  assert.equal(moros.act('join-muster').ok, true);
  assert.equal(inventory.count('copper-piece'), MOROS_PAY);
  assert.equal(moros.act('join-muster').ok, false);
  assert.deepEqual(moros.view().destinationIds, ['legion-horse-line']);
  assert.equal(MOROS_SITE_ACTIONS['legion-horse-line'], 'claim-legion-horse');
  assert.ok(Number.isFinite(MOROS_SITES['legion-horse-line'].x));
  assert.equal(moros.act('claim-legion-horse').ok, true);
  assert.equal(inventory.count('horse-token'), 0, 'the token is spent');
  assert.equal(moros.view().complete, true);
  assert.equal(moros.act('claim-legion-horse').ok, false);
  assert.equal(inventory.count('copper-piece'), MOROS_PAY);
  assert.deepEqual(events.map(event => event.actionId), ['start-chapter', 'admit-to-camp', 'join-muster', 'claim-legion-horse']);
  assert.match(moros.view().detail, /Solis/);
});

test('without the Lauvel token the horse line refuses, and the chapter waits', () => {
  const { moros } = fixture({ token: false });
  moros.start(); moros.act('admit-to-camp'); moros.act('join-muster');
  const option = moros.availableActions()[0];
  assert.equal(option.enabled, false); assert.match(option.reason, /horse token/);
  assert.equal(moros.act('claim-legion-horse').ok, false);
  assert.equal(moros.view().stage, 'claim-horse');
});

test('snapshots round-trip; reordered, partial or foreign data is refused without changing the chapter', () => {
  const { moros } = fixture(); moros.start(); moros.act('admit-to-camp');
  const saved = moros.snapshot();
  assert.equal(validateMorosSnapshot(saved), true);
  const other = fixture().moros;
  assert.equal(other.restore(saved), true); assert.equal(other.view().stage, 'report-to-legate');
  for (const bad of [null, [], {}, { ...saved, version: 2 }, { ...saved, revision: 9 }, { ...saved, mustered: true }, { ...saved, admitted: 1 },
    { ...saved, started: false }, { ...saved, extra: true }, { ...saved, horseClaimed: true, revision: 3 }]) {
    assert.equal(validateMorosSnapshot(bad), false);
    assert.equal(other.restore(bad), false);
    assert.equal(other.view().stage, 'report-to-legate');
  }
  assert.equal(validateMorosSnapshot(undefined), true);
  assert.equal(validateMorosSnapshot(undefined, { allowMissing: false }), false);
});

test('the gate and the Marshal speak for the chapter only while it is theirs, and the Marshal counts the company', () => {
  const { moros } = fixture(), screens = [], acts = [];
  const context = { moros, musterCount: 4, openDialogue: (npc, lines, unused, label, options) => screens.push({ npc, lines, options }), closeDialogue: () => {}, act: id => { acts.push(id); return moros.act(id); } };
  const gate = { id: MOROS_GATE_ID, name: 'Footman Coss' }, legate = { id: MOROS_LEGATE_ID, name: 'Marshal Hadric Venmor' };
  assert.equal(morosConversation(gate, context), false, 'before the chapter, the sentry keeps his ordinary lines');
  moros.start();
  assert.equal(morosConversation(legate, context), false, 'the Marshal does not see a man the gate has not passed');
  assert.equal(morosConversation(gate, context), true);
  assert.match(screens.at(-1).lines[0], /Name and contract/);
  screens.at(-1).options.choices.find(choice => choice.id === 'admit-to-camp').action();
  assert.equal(morosConversation(gate, context), false);
  assert.equal(morosConversation(legate, context), true);
  const speech = screens.at(-1).lines.join(' ');
  assert.match(speech, /four stand in this camp, counting you/);
  for (const member of ['Izoli', 'Suvali', 'rebels', 'Pyros', 'Selemis', 'Marosh', 'southern islands']) assert.match(speech, new RegExp(member));
  assert.doesNotMatch(speech, /South Pyros/);
  screens.at(-1).options.choices.find(choice => choice.id === 'join-muster').action();
  assert.deepEqual(acts, ['admit-to-camp', 'join-muster']);
  assert.equal(morosConversation(legate, context), false);
  const alone = fixture().moros; alone.start(); alone.act('admit-to-camp');
  morosConversation(legate, { ...context, moros: alone, musterCount: 1 });
  assert.match(screens.at(-1).lines[0], /one stands in this camp/);
});
