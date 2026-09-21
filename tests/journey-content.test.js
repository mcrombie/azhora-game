import test from 'node:test';
import assert from 'node:assert/strict';
import { JOURNEY_NPCS, SITE_ACTIONS, journeyConversation, registerLine } from '../src/journey-content.js';
import { createJourney, PARCEL_IDS, BEACON_IDS } from '../src/journey.js';
import { createInventoryState } from '../src/inventory.js';
import { createWeapons } from '../src/weapons.js';

function fixture({ started = true, sticks = 0, rod = false } = {}) {
  const inventory = createInventoryState();
  for (const id of ['simple-sword', 'harbor-letter', 'road-token']) inventory.grant(id);
  if (sticks) inventory.add('forest-stick', sticks);
  if (rod) inventory.grant('fishing-rod');
  const weapons = createWeapons({ inventory });
  const journey = createJourney({ inventory, weapons });
  if (started) journey.start();
  const calls = { actions: [], teaching: 0, wood: 0, close: 0 };
  let shown = null;
  const context = {
    journey, inventory,
    openDialogue(npc, lines, event, label, options) { shown = { npc, lines, event, label, options }; },
    closeDialogue() { shown = null; calls.close++; },
    act(id) { calls.actions.push(id); return journey.act(id); },
    teachFishing() { calls.teaching++; return { ok: inventory.grant('fishing-rod') }; },
    provideBridgeWood() {
      calls.wood++;
      const needed = Math.max(0, 3 - inventory.count('forest-stick'));
      return { ok: needed === 0 || inventory.add('forest-stick', needed) };
    },
  };
  const api = {
    context, calls, inventory, weapons, journey,
    get shown() { return shown; },
    talk(id) { const npc = JOURNEY_NPCS.find(n => n.id === id); assert.ok(npc); journeyConversation(npc, context); return api; },
    choice(id) { return shown?.options?.choices?.find(item => item.id === id); },
    choose(id) { const choice = api.choice(id); assert.ok(choice, `missing choice ${id}`); choice.action(); return api; },
    finish() { assert.equal(typeof shown?.options?.onComplete, 'function'); shown.options.onComplete(); return api; },
  };
  return api;
}

function finishMeadow(f) {
  f.talk('meadow-courier').choose('meet-courier');
  for (const id of PARCEL_IDS) assert.equal(f.journey.act(SITE_ACTIONS[id]).ok, true);
  f.talk('meadow-courier').choose('return-courier');
}

function finishCrossing(f) {
  f.talk('crossing-keeper').choose('meet-crossing-keeper');
  if (f.inventory.count('forest-stick') < 3) f.talk('crossing-keeper').choose('hollis-repair-wood').finish();
  assert.equal(f.journey.act('repair-bridge').ok, true);
  f.talk('crossing-keeper').choose('return-crossing-keeper');
}

function finishRise(f) {
  f.talk('ridge-keeper').choose('meet-ridge-keeper');
  for (const id of BEACON_IDS) assert.equal(f.journey.act(SITE_ACTIONS[id]).ok, true);
  f.talk('relay-clerk').choose('deliver-report');
}

test('NPC quest choices appear in campaign order and route the existing action IDs only on selection', () => {
  const f = fixture();
  const before = f.journey.snapshot();
  for (const npc of JOURNEY_NPCS) {
    f.talk(npc.id);
    assert.ok(f.choice('leave-road-neighbor'));
    assert.deepEqual(f.journey.snapshot(), before, 'opening a conversation cannot accept a quest');
  }
  f.talk('crossing-keeper'); assert.equal(f.choice('meet-crossing-keeper'), undefined);
  f.talk('ridge-keeper'); assert.equal(f.choice('meet-ridge-keeper'), undefined);
  f.talk('relay-clerk'); assert.equal(f.choice('deliver-report'), undefined);
  finishMeadow(f);
  f.talk('meadow-courier'); assert.equal(f.choice('return-courier'), undefined);
  assert.equal(f.inventory.count('cooked-fish'), 2);
  finishCrossing(f);
  f.talk('crossing-keeper'); assert.equal(f.choice('return-crossing-keeper'), undefined);
  finishRise(f);
  f.talk('relay-clerk'); assert.equal(f.choice('deliver-report'), undefined);
  assert.deepEqual(f.calls.actions, ['meet-courier', 'return-courier', 'meet-crossing-keeper',
    'return-crossing-keeper', 'meet-ridge-keeper', 'deliver-report']);
  assert.deepEqual(f.journey.state.completedRegions, [2, 3, 4]);
  assert.equal(f.inventory.has('harbor-letter'), true);
});

test('Corvan reads the field register back, with the count the host hands him', () => {
  // He is the one who says the rule for the army: the company is eleven and the Marshal does not
  // move until it is in, so neither road out of Tidehaven is the late one. The numbers are the
  // company's own clock and never this module's (docs/drent-long-road.md §2).
  const f = fixture();
  f.context.register = { signed: 3, atSea: 2 };
  f.talk('meadow-courier');
  const induction = f.shown.lines.join(' ');
  assert.match(induction, /Eleven were hired under that letter/);
  assert.match(induction, /Three of them have signed it ahead of you/);
  assert.match(induction, /Two are still at sea/);
  assert.match(induction, /the Marshal does not move until the company is in/);
  finishMeadow(f);
  f.context.register = { signed: 10, atSea: 0 };
  f.talk('meadow-courier');
  const after = f.shown.lines.join(' ');
  assert.match(after, /Ten of them have signed it ahead of you/, 'he reads it back on the way out too');
  assert.match(after, /all ashore now/);
  // Said nothing at all, he still says something true: you are the first name in the book.
  assert.match(registerLine(), /You are the first name in it/);
  assert.match(registerLine({ signed: 1, atSea: 1 }), /One of them has signed it ahead of you\. One is still at sea\./);
});

test('every flavor tangent returns to its neighbor without progression before or after road completion', () => {
  const f = fixture({ sticks: 3 });
  const branches = { 'meadow-courier': 'nessa-caravans', 'crossing-keeper': 'hollis-river',
    'ridge-keeper': 'sava-presences', 'relay-clerk': 'iven-messages' };
  const check = () => {
    const before = f.journey.snapshot(), counts = f.inventory.items().map(id => [id, f.inventory.count(id)]);
    for (const [npcId, branchId] of Object.entries(branches)) {
      f.talk(npcId).choose(branchId);
      assert.equal(f.shown.lines.length, 2);
      assert.equal(f.shown.event, null);
      f.finish();
      assert.equal(f.shown.npc.id, npcId);
      assert.ok(f.choice(branchId));
      assert.ok(f.choice('leave-road-neighbor'));
      assert.deepEqual(f.journey.snapshot(), before);
      assert.deepEqual(f.inventory.items().map(id => [id, f.inventory.count(id)]), counts);
    }
  };
  check(); finishMeadow(f); finishCrossing(f); finishRise(f); check();
});

test('Hollis lends one rod after the fishing pages; repeat lessons only remind and never advance a quest', () => {
  const f = fixture(), before = f.journey.snapshot();
  f.talk('crossing-keeper').choose('hollis-fishing');
  assert.equal(f.shown.label, 'Borrow a spare rod');
  assert.equal(f.inventory.has('fishing-rod'), false, 'reading the first page does not silently take the rod');
  assert.match(f.shown.lines.join(' '), /east of the bridge/);
  assert.match(f.shown.lines.join(' '), /two sticks/);
  f.finish();
  assert.equal(f.inventory.count('fishing-rod'), 1);
  assert.equal(f.calls.teaching, 1);
  f.choose('hollis-fishing');
  assert.equal(f.shown.label, 'Back to our conversation');
  f.finish();
  assert.equal(f.calls.teaching, 1);
  assert.deepEqual(f.journey.snapshot(), before);
});

test('missing or refused fishing callbacks leave a readable route back and do not claim a new rod', () => {
  const f = fixture();
  delete f.context.teachFishing;
  f.talk('crossing-keeper').choose('hollis-fishing');
  assert.equal(f.shown.label, 'Back to our conversation');
  assert.match(f.shown.lines.join(' '), /Bran/);
  f.finish(); assert.equal(f.inventory.has('fishing-rod'), false);
  f.context.teachFishing = () => ({ ok: false, reason: 'Please make room.' });
  f.talk('crossing-keeper').choose('hollis-fishing').finish();
  assert.deepEqual(f.shown.lines, ['Please make room.']);
  f.finish(); assert.ok(f.choice('hollis-fishing'));
});

test('repair timber is available only after acceptance when fewer than three sticks remain', () => {
  const f = fixture({ sticks: 1 });
  f.talk('crossing-keeper'); assert.equal(f.choice('hollis-repair-wood'), undefined);
  finishMeadow(f);
  f.talk('crossing-keeper'); assert.equal(f.choice('hollis-repair-wood'), undefined);
  f.choose('meet-crossing-keeper');
  const before = f.journey.snapshot();
  f.talk('crossing-keeper').choose('hollis-repair-wood');
  assert.match(f.shown.lines.join(' '), /marked repair timber/);
  assert.equal(f.inventory.count('forest-stick'), 1);
  assert.equal(f.calls.wood, 0);
  f.finish();
  assert.equal(f.inventory.count('forest-stick'), 3);
  assert.equal(f.calls.wood, 1);
  assert.equal(f.choice('hollis-repair-wood'), undefined, 'the loan does not offer excess wood');
  assert.deepEqual(f.journey.snapshot(), before, 'supplies alone do not repair or report the bridge');
  f.weapons.spendSticks(3);
  f.talk('crossing-keeper').choose('hollis-repair-wood').finish();
  assert.equal(f.inventory.count('forest-stick'), 3, 'spent repair supplies can be replaced so the quest cannot be stranded');
  assert.equal(f.calls.wood, 2);
  assert.equal(f.journey.act('repair-bridge').ok, true);
  assert.equal(f.inventory.count('forest-stick'), 0);
  f.talk('crossing-keeper'); assert.equal(f.choice('hollis-repair-wood'), undefined, 'a repaired bridge cannot issue loans');
  assert.ok(f.choice('return-crossing-keeper'));
});

test('repair loan rechecks current need, and a failed supply grant can be retried without quest changes', () => {
  const f = fixture(); finishMeadow(f); f.talk('crossing-keeper').choose('meet-crossing-keeper');
  const before = f.journey.snapshot();
  f.talk('crossing-keeper').choose('hollis-repair-wood');
  f.inventory.add('forest-stick', 3);
  f.finish();
  assert.equal(f.calls.wood, 0, 'a stale loan cannot add more wood after the player has enough');
  f.weapons.spendSticks(3);
  f.context.provideBridgeWood = () => ({ ok: false, reason: 'The timber could not be added.' });
  f.talk('crossing-keeper').choose('hollis-repair-wood').finish();
  assert.deepEqual(f.shown.lines, ['The timber could not be added.']);
  assert.equal(f.inventory.count('forest-stick'), 0);
  assert.deepEqual(f.journey.snapshot(), before);
  f.finish(); assert.ok(f.choice('hollis-repair-wood'));
});

test('imperial induction precedes the gradual reveal that Luscia’s people wanted the republic the army just defeated', () => {
  const f = fixture({ sticks: 3 });
  f.talk('meadow-courier');
  const induction = f.shown.lines.join(' ');
  assert.match(induction, /Ambroni Empire/);
  assert.match(induction, /mercenary we hired/);
  assert.match(induction, /campaign against the rebels/);
  assert.doesNotMatch(induction, /legitimate government|Most of the population/);
  finishMeadow(f);
  f.talk('crossing-keeper').choose('meet-crossing-keeper');
  f.journey.act('repair-bridge'); f.talk('crossing-keeper');
  assert.match(f.shown.lines.join(' '), /most households/);
  f.choose('return-crossing-keeper').talk('ridge-keeper');
  const truth = f.shown.lines.join(' ');
  assert.match(truth, /republic in place of the emperor/);
  assert.match(truth, /broke it/);
  assert.match(truth, /Most of the population supports/);
  assert.match(truth, /goblin raids pressing down from the north/);
  finishRise(f); f.talk('relay-clerk');
  assert.match(f.shown.lines.join(' '), /Ambroni service continues/);
  assert.equal(f.inventory.has('harbor-letter'), true);
});
