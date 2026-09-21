import test from 'node:test';
import assert from 'node:assert/strict';
import { createInventoryState } from '../src/inventory.js';
import { MOROS_GATE_ID, MOROS_LEGATE_ID, MOROS_PAY, MOROS_SITES, MOROS_SITE_ACTIONS, createMorosChapter, morosConversation, validateMorosSnapshot,
  MUSTER_PLACES, MUSTER_GREETINGS, MUSTER_AFTER, MUSTER_FULL, musterVoices, musterArrivalLine } from '../src/moros-chapter.js';
import { LONG_ROAD_SPINE } from '../src/long-road.js';
import { MERCENARY_ROSTER, CROMB } from '../src/mercenaries.js';
import { createCampaign } from '../src/campaign.js';

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
  // First in, the camp says so before the Marshal does: eleven pegs and nobody on them.
  assert.match(screens.at(-1).lines[0], /eleven pegs/);
  assert.match(screens.at(-1).lines.join(' '), /one stands in this camp/);
});

test('the camp has two faces, and it is the same camp', () => {
  // First in: eleven pegs and nobody on them, and a Marshal with work for early men.
  const early = musterVoices({ musterCount: 1 });
  assert.equal(early.early, true);
  assert.equal(early.full, false);
  assert.match(early.turn.join(' '), /eleven pegs/);
  assert.match(early.marshal, /work for early men/);
  assert.match(early.marshal, /one stands? in this camp/);
  assert.deepEqual(early.company, [], 'nobody is there to say anything to you');
  assert.equal(musterVoices({ musterCount: 2 }).early, true, 'two is still early');
  assert.equal(musterVoices({ musterCount: 3 }).early, false, 'three is a camp filling up');
  // In between: the count, and nothing else.
  const middle = musterVoices({ musterCount: 6 });
  assert.match(middle.marshal, /six stand in this camp/);
  assert.deepEqual(middle.turn, []);
  assert.deepEqual(middle.company, []);
});

test('last in, the ten turn and each of them says where he last saw you', () => {
  const roster = [...MERCENARY_ROSTER.map(man => man.id)];
  const seenAt = { 'merc-word': 'bran-rod', 'merc-lakota': 'odger-fernway', 'merc-matt': 'nell-hedge' };
  const full = musterVoices({ musterCount: MUSTER_FULL, seenAt, roster });
  assert.equal(full.full, true);
  assert.match(full.turn.join(' '), /they turn/);
  assert.match(full.marshal, /That is eleven/);
  assert.equal(full.company.length, roster.length, 'one line from each of the ten');
  const said = Object.fromEntries(full.company.map(entry => [entry.id, entry.line]));
  assert.match(said['merc-word'], /up to your knees in a pond/, 'where he saw you, in his own words');
  assert.match(said['merc-lakota'], /holding a mushroom up to the light/);
  assert.match(said['merc-matt'], /in a hedge\. In it\. Not beside it/);
  // A man who never went past you cannot place you, and says so rather than inventing it.
  assert.match(said['merc-eliana'], /somewhere back down that road/);
  // And a man who passed you between stops saw a road, not a lesson, and claims only the road.
  const roadside = musterVoices({ musterCount: MUSTER_FULL, roster, seenAt: { 'merc-jerry': 'ground:fernway' } });
  const jerry = roadside.company.find(entry => entry.id === 'merc-jerry').line;
  assert.match(jerry, /on the road through Fernway Rest, going the other way/);
  assert.doesNotMatch(jerry, /mushroom/, 'he did not see you at the bench, because you were not at it');
  for (const entry of full.company) assert.ok(!entry.line.includes('%s'), entry.id + ' still has its slot in it');
});

test('every stop of the spine has a clause, and every man of the eleven has a line both ways', () => {
  // Ten templates and a phrase a stop, which is what keeps this from being a hundred lines.
  for (const stop of LONG_ROAD_SPINE) assert.ok(MUSTER_PLACES[stop.id], `no clause for ${stop.id}`);
  const everybody = [...MERCENARY_ROSTER.map(man => man.id), CROMB.id];
  for (const id of everybody) {
    assert.ok(MUSTER_GREETINGS[id], `${id} has nothing to say when you come in last`);
    assert.ok(MUSTER_AFTER[id], `${id} has nothing to say when he comes in after you`);
    assert.notEqual(MUSTER_GREETINGS[id], MUSTER_AFTER[id], id + ' says the same thing either way');
  }
  // Mus is the one who can be the eleventh in himself, after Al the Tun, on a late draw.
  assert.match(MUSTER_GREETINGS['merc-mus'], /I was not on it/, 'because he never walked the road');
  assert.match(MUSTER_AFTER['merc-mus'], /I have been here a while/, 'which is a thing he says about the country');
  assert.match(musterArrivalLine('merc-word'), /I swam/);
  assert.ok(musterArrivalLine('nobody').length > 10, 'and anybody else gets something true');
});

test('coming in first is worth something the long road cannot have, once', () => {
  const campaign = createCampaign();
  const before = campaign.snapshot().trust.empire;
  const first = campaign.earlyMuster();
  assert.equal(first.ok !== false, true);
  const after = campaign.snapshot().trust.empire;
  assert.ok(after > before, 'Venmor remembers who came first');
  assert.equal(campaign.earlyMuster().first, false, 'and remembers it once');
  assert.equal(campaign.snapshot().trust.empire, after, 'the second time is worth nothing');
  assert.equal(campaign.snapshot().early, true);
  // A save from before anybody could be early loads, and simply was not.
  const old = campaign.snapshot(); delete old.early;
  const back = createCampaign();
  assert.equal(back.restore(old), true);
  assert.equal(back.snapshot().early, false);
});

test('the Marshal says the face the count calls for, and the company speak only when it is full', () => {
  const { moros } = fixture();
  moros.start(); moros.act('admit-to-camp');
  let shown = null;
  const context = { moros, openDialogue: (npc, lines) => { shown = lines; }, closeDialogue() {}, act() {} };
  const roster = MERCENARY_ROSTER.map(man => man.id);
  morosConversation({ id: MOROS_LEGATE_ID }, { ...context, musterCount: 1 });
  assert.match(shown.join(' '), /eleven pegs/);
  assert.doesNotMatch(shown.join(' '), /up to your knees/);
  morosConversation({ id: MOROS_LEGATE_ID }, { ...context, musterCount: MUSTER_FULL, roster, seenAt: { 'merc-word': 'bran-rod' } });
  const full = shown.join(' ');
  assert.match(full, /That is eleven/);
  assert.match(full, /up to your knees in a pond/);
  assert.match(full, /muster rolls out of the Lauvel/, 'and it is still the same scene');
});
