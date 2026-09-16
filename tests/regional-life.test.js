import test from 'node:test';
import assert from 'node:assert/strict';
import { createInventoryState } from '../src/inventory.js';
import { createWeapons } from '../src/weapons.js';
import { createJourney } from '../src/journey.js';
import { REGIONAL_LIFE_NPCS, REGIONAL_LIFE_SITES, createRegionalLife, validateRegionalLifeSnapshot,
  regionalLifeConversation, regionalLifeSiteConversation, regionalLifeRelayChoices } from '../src/regional-life.js';

function fixture({ inventory = createInventoryState() } = {}) {
  const events = [], story = createRegionalLife({ inventory, onEvent: event => events.push(event) });
  return { inventory, story, events };
}
function act(story, ...ids) { for (const id of ids) assert.equal(story.act(id).ok, true, id); }
function dialogueFixture(existing = fixture()) {
  const calls = []; let closed = 0, returned = 0;
  const context = { regionalLife: existing.story, act: id => existing.story.act(id),
    openDialogue: (npc, lines, event, label, options = {}) => calls.push({ npc, lines, event, label, options }),
    closeDialogue: () => { closed++; }, returnToNeighbor: () => { returned++; } };
  return { ...existing, context, calls, latest: () => calls.at(-1),
    choose(id) { const selected = calls.at(-1).options.choices?.find(choice => choice.id === id);
      assert.ok(selected, `missing ${id}`); assert.notEqual(selected.enabled, false, id); selected.action(); },
    get closed() { return closed; }, get returned() { return returned; } };
}
const npc = id => REGIONAL_LIFE_NPCS.find(person => person.id === id);
const relay = { id: 'relay-clerk', name: 'Iven', role: 'Imperial relay clerk' };

test('three optional local stories expose no tasks or later perspective before discovery and accept no invalid actions', () => {
  const { story, inventory, events } = fixture();
  assert.equal(story.view().optional, true); assert.deepEqual(story.view().tasks, []); assert.deepEqual(story.view().entries, []);
  assert.deepEqual(story.view().knownIds, []); assert.equal(story.view().completedCount, 0);
  const before = story.snapshot();
  for (const id of ['invent-a-reward', null, undefined, '', 'lower-mill-share', 'return-mill-share',
    'free-net-float-west', 'free-net-float-east', 'return-net-help', 'record-testimony-anonymous', 'record-testimony-signed', 'deliver-testimony']) {
    assert.equal(story.act(id).ok, false); assert.deepEqual(story.snapshot(), before);
  }
  assert.deepEqual(inventory.items(), []); assert.deepEqual(events, []);
  assert.equal(story.siteView('unknown-place'), null); assert.deepEqual(story.availableActions('unknown-npc'), []);
});

test('the seven authored sites can be inspected in any order without starting errands or granting resources', () => {
  const { story, inventory, events } = fixture();
  assert.equal(REGIONAL_LIFE_SITES.length, 7);
  for (const site of [...REGIONAL_LIFE_SITES].reverse()) {
    assert.equal(story.act(`inspect-${site.id}`).changed, true);
    assert.equal(story.act(`inspect-${site.id}`).changed, false);
    assert.equal(story.siteView(site.id).inspected, true);
  }
  assert.equal(story.view().entries.length, 3); assert.deepEqual(story.view().tasks, []);
  assert.equal(story.view().inspectedCount, 7); assert.equal(story.snapshot().revision, 7);
  assert.deepEqual(events.map(event => event.sequence), [1, 2, 3, 4, 5, 6, 7]);
  assert.ok(events.every(event => event.reward === null && event.optional));
  assert.deepEqual(inventory.items(), []); assert.equal(validateRegionalLifeSnapshot(story.snapshot()), true);
});

test('Enna needs acceptance, one lowering act, and a return, while the village keeps all grain', () => {
  const { story, inventory, events } = fixture();
  act(story, 'accept-mill-share');
  assert.equal(story.act('accept-mill-share').ok, false);
  assert.deepEqual(story.view().tasks[0].destinationIds, ['mill-hoist']);
  assert.equal(story.act('return-mill-share').ok, false);
  act(story, 'lower-mill-share'); assert.equal(story.act('lower-mill-share').ok, false);
  assert.equal(story.state.millLowered, true); assert.equal(story.state.millCompleted, false);
  assert.deepEqual(story.view().tasks[0].destinationIds, ['commons-miller']);
  act(story, 'return-mill-share'); assert.equal(story.act('return-mill-share').ok, false);
  assert.equal(story.state.stages.mill, 'complete'); assert.equal(story.view().tasks[0].complete, true);
  assert.deepEqual(story.view().tasks[0].destinationIds, []);
  assert.match(story.siteView('mill-hoist').lines.join(' '), /already done your part/);
  assert.deepEqual(inventory.items(), []); assert.ok(events.every(event => event.reward === null));
  assert.equal(story.snapshot().revision, 3); assert.equal(validateRegionalLifeSnapshot(story.snapshot()), true);
});

test('both net knots accept either order and give two raw fish only after Merren receives the finished work', () => {
  for (const order of [['west', 'east'], ['east', 'west']]) {
    const { story, inventory, events } = fixture(); act(story, 'accept-net-help');
    act(story, `free-net-float-${order[0]}`);
    assert.equal(story.act(`free-net-float-${order[0]}`).ok, false);
    assert.equal(story.act('return-net-help').ok, false);
    assert.deepEqual(story.view().tasks[0].destinationIds, [`net-float-${order[1]}`]);
    assert.equal(inventory.count('raw-fish'), 0);
    act(story, `free-net-float-${order[1]}`);
    assert.equal(story.state.stages.nets, 'return-to-merren');
    act(story, 'return-net-help'); assert.equal(story.act('return-net-help').ok, false);
    assert.equal(inventory.count('raw-fish'), 2); assert.equal(inventory.count('cooked-fish'), 0);
    assert.deepEqual(events.at(-1).reward, { id: 'raw-fish', quantity: 2 });
    assert.equal(events.length, 4); assert.equal(story.state.stages.nets, 'complete');
    assert.equal(validateRegionalLifeSnapshot(story.snapshot()), true);
  }
});

test('failed fish insertion retains completed knots and permits exactly one later reward', () => {
  const actual = createInventoryState(); let allow = false;
  const { story, events } = fixture({ inventory: { add: (...args) => allow && actual.add(...args) } });
  act(story, 'accept-net-help', 'free-net-float-east', 'free-net-float-west');
  const before = story.snapshot();
  assert.equal(story.act('return-net-help').ok, false); assert.deepEqual(story.snapshot(), before);
  assert.equal(events.length, 3); assert.equal(actual.count('raw-fish'), 0);
  allow = true; act(story, 'return-net-help');
  assert.equal(story.act('return-net-help').ok, false); assert.equal(actual.count('raw-fish'), 2);
  assert.equal(events.length, 4);
});

test('a real overflowing stack cannot consume Merren’s reward or lose the finished work', () => {
  const { story, inventory } = fixture();
  inventory.add('raw-fish', Number.MAX_SAFE_INTEGER - 1);
  act(story, 'accept-net-help', 'free-net-float-west', 'free-net-float-east');
  const before = story.snapshot(); assert.equal(story.act('return-net-help').ok, false);
  assert.deepEqual(story.snapshot(), before); assert.equal(inventory.count('raw-fish'), Number.MAX_SAFE_INTEGER - 1);
  inventory.remove('raw-fish', 2); act(story, 'return-net-help');
  assert.equal(inventory.count('raw-fish'), Number.MAX_SAFE_INTEGER - 1); assert.equal(story.state.netsCompleted, true);
});

test('each testimony form is deliberate, immutable after writing, and delivered once without a main-quest prerequisite', () => {
  for (const mode of ['anonymous', 'signed']) {
    const { story, inventory, events } = fixture();
    act(story, 'accept-witness-account');
    assert.match(story.siteView('shelter-ledger').lines.join(' '), /Oda offered her own name/);
    assert.equal(story.act('deliver-testimony').ok, false);
    act(story, `record-testimony-${mode}`);
    assert.equal(story.state.testimonyMode, mode); assert.equal(story.state.testimonyRecorded, true);
    assert.equal(story.act('record-testimony-anonymous').ok, false);
    assert.equal(story.act('record-testimony-signed').ok, false);
    assert.deepEqual(story.view().tasks[0].destinationIds, ['relay-clerk']);
    assert.ok(story.view().knownIds.includes('relay-clerk'));
    assert.match(story.view().tasks[0].detail, /journal keeps the copy/);
    act(story, 'deliver-testimony'); assert.equal(story.act('deliver-testimony').ok, false);
    assert.equal(story.state.stages.testimony, 'complete'); assert.deepEqual(inventory.items(), []);
    assert.equal(events.length, 3); assert.ok(events.every(event => event.reward === null));
    assert.equal(validateRegionalLifeSnapshot(story.snapshot()), true);
  }
});

test('interleaved local stories preserve the main story, equipment, and letter exactly', () => {
  const { story, inventory } = fixture();
  for (const id of ['simple-sword', 'harbor-letter', 'road-token']) inventory.grant(id);
  const weapons = createWeapons({ inventory }), journey = createJourney({ inventory, weapons });
  journey.start(); journey.act('meet-courier'); weapons.contact('simple-sword');
  const mainBefore = journey.snapshot(), weaponBefore = weapons.snapshot();
  act(story, 'accept-witness-account', 'accept-net-help', 'accept-mill-share', 'free-net-float-east',
    'record-testimony-anonymous', 'lower-mill-share', 'deliver-testimony', 'free-net-float-west', 'return-mill-share', 'return-net-help');
  assert.equal(story.view().completedCount, 3); assert.equal(story.view().tasks.length, 3);
  assert.ok(story.view().tasks.every(task => task.optional && task.complete && !task.destinationIds.length));
  assert.deepEqual(journey.snapshot(), mainBefore); assert.deepEqual(weapons.snapshot(), weaponBefore);
  assert.equal(inventory.has('harbor-letter'), true); assert.equal(inventory.has('road-token'), true);
  assert.deepEqual(inventory.items().sort(), ['simple-sword', 'harbor-letter', 'road-token', 'raw-fish'].sort());
  assert.equal(story.snapshot().revision, 10); assert.equal(validateRegionalLifeSnapshot(story.snapshot()), true);
});

test('partial and completed snapshots restore silently, retain testimony choice, and never replay rewards', () => {
  const { story, inventory, events } = fixture();
  act(story, 'inspect-mill-commons', 'accept-net-help', 'free-net-float-east', 'accept-witness-account', 'record-testimony-signed');
  const partial = story.snapshot(), restoredEvents = [];
  const restored = createRegionalLife({ inventory, onEvent: e => restoredEvents.push(e) });
  assert.equal(restored.restore(partial), true); assert.deepEqual(restored.snapshot(), partial); assert.deepEqual(restoredEvents, []);
  assert.deepEqual(restored.view().tasks.find(task => task.region === 3).destinationIds, ['net-float-west']);
  assert.equal(restored.state.testimonyMode, 'signed'); assert.equal(inventory.count('raw-fish'), 0);
  act(restored, 'free-net-float-west', 'return-net-help', 'deliver-testimony');
  const completed = restored.snapshot(), beforeEvents = restoredEvents.length;
  assert.equal(restored.restore(completed), true); assert.equal(restoredEvents.length, beforeEvents);
  assert.equal(restored.act('return-net-help').ok, false); assert.equal(restored.act('deliver-testimony').ok, false);
  assert.equal(inventory.count('raw-fish'), 2); assert.equal(events.length, partial.revision);
});

test('snapshot validation rejects tampering, impossible order, duplicate notes, and invented privacy modes atomically', () => {
  const { story } = fixture();
  act(story, 'accept-mill-share', 'lower-mill-share', 'return-mill-share', 'accept-net-help', 'free-net-float-west',
    'free-net-float-east', 'return-net-help', 'accept-witness-account', 'record-testimony-anonymous', 'deliver-testimony');
  const before = story.snapshot();
  const bad = [null, [], {}, { ...before, version: 2 }, { ...before, revision: before.revision + 1 },
    { ...before, revision: NaN }, { ...before, revision: -1 }, { ...before, millAccepted: false }, { ...before, millLowered: false },
    { ...before, netsAccepted: false }, { ...before, netEastFreed: false }, { ...before, testimonyAccepted: false },
    { ...before, testimonyMode: null }, { ...before, testimonyMode: 'household-list' },
    { ...before, testimonyMode: { signed: true } }, { ...before, millCompleted: 1 },
    { ...before, inspected: ['mill-commons', 'mill-commons'] }, { ...before, inspected: ['not-a-place'] },
    { ...before, unknownRewardFlag: true }, { ...before, testimonyRecorded: true }];
  for (const invalid of bad) {
    assert.equal(validateRegionalLifeSnapshot(invalid), false);
    assert.equal(story.restore(invalid), false); assert.deepEqual(story.snapshot(), before);
  }
  // Keep revision consistent to ensure dependency checks, not just the count, reject the forgery.
  for (const patch of [{ millAccepted: false }, { millLowered: false }, { netsAccepted: false },
    { netEastFreed: false }, { testimonyAccepted: false }, { testimonyMode: null }])
    assert.equal(validateRegionalLifeSnapshot({ ...before, ...patch, revision: before.revision - 1 }), false);
  assert.equal(validateRegionalLifeSnapshot(undefined), true);
  assert.equal(validateRegionalLifeSnapshot(undefined, { allowMissing: false }), false);
  assert.equal(story.restore(), true); assert.deepEqual(story.snapshot(), createRegionalLife().snapshot());
});

test('snapshots, state, views, actions, and inspection lines cannot mutate controller history', () => {
  const { story } = fixture(); act(story, 'inspect-mill-commons', 'accept-mill-share');
  const before = story.snapshot();
  const snapshot = story.snapshot(); snapshot.inspected.push('shelter-ledger'); snapshot.millCompleted = true;
  const state = story.state; state.inspected.length = 0; state.stages.mill = 'complete';
  const view = story.view(); view.knownIds.push('not-a-place'); view.tasks[0].destinationIds[0] = 'relay-clerk'; view.entries[0].detail = 'Changed';
  const place = story.siteView('mill-hoist'); place.lines[0] = 'Changed'; place.actions[0].label = 'Changed';
  assert.deepEqual(story.snapshot(), before); assert.deepEqual(story.view().tasks[0].destinationIds, ['mill-hoist']);
  assert.notEqual(story.siteView('mill-hoist').lines[0], 'Changed');
  assert.equal(Object.isFrozen(REGIONAL_LIFE_NPCS[0]), true); assert.equal(Object.isFrozen(REGIONAL_LIFE_SITES[0].lines), true);
});

test('NPC and place dialogue require explicit help, leave choices are harmless, and Enna remembers the result', () => {
  const d = dialogueFixture();
  assert.equal(regionalLifeConversation({ id: 'stranger' }, d.context), false);
  assert.equal(regionalLifeSiteConversation('not-a-place', d.context), false);
  assert.equal(regionalLifeConversation(npc('commons-miller'), d.context), true);
  assert.match(d.latest().lines.join(' '), /no payment to offer/);
  d.choose('leave-regional-neighbor'); assert.equal(d.story.state.millAccepted, false);
  regionalLifeConversation(npc('commons-miller'), d.context); d.choose('enna-tally');
  assert.equal(d.story.siteView('mill-commons').inspected, true); assert.equal(d.story.state.millAccepted, false);
  assert.doesNotMatch(d.latest().lines.join(' '), /Assembly|lawful government|legitimate|Confederation/);
  d.latest().options.onComplete(); d.choose('accept-mill-share');
  regionalLifeSiteConversation('mill-hoist', d.context); d.choose('lower-mill-share');
  regionalLifeConversation(npc('commons-miller'), d.context); d.choose('return-mill-share');
  regionalLifeConversation(npc('commons-miller'), d.context);
  assert.match(d.latest().lines.join(' '), /remember/);
  assert.equal(d.latest().options.choices.some(choice => choice.id === 'return-mill-share'), false);
});

test('the writing-board choices explain Oda’s consent while preserving other household names in both forms', () => {
  for (const mode of ['anonymous', 'signed']) {
    const d = dialogueFixture();
    regionalLifeSiteConversation('shelter-ledger', d.context);
    assert.ok(d.latest().options.choices.filter(choice => choice.id.startsWith('record-testimony-')).every(choice => !choice.enabled && /Ask Oda/.test(choice.reason)));
    regionalLifeConversation(npc('shelter-keeper'), d.context);
    assert.match(d.latest().lines.join(' '), /Use my name if it needs a witness/);
    assert.match(d.latest().lines.join(' '), /Leave the families out/);
    d.choose('accept-witness-account'); regionalLifeSiteConversation('shelter-ledger', d.context);
    assert.match(d.latest().lines.join(' '), /families stay out of either version/);
    assert.deepEqual(d.latest().options.choices.filter(choice => choice.id.startsWith('record-testimony-')).map(choice => choice.label),
      ['Leave the account unsigned', "Sign with Oda's name"]);
    d.choose(`record-testimony-${mode}`);
    assert.equal(d.story.state.testimonyMode, mode);
    regionalLifeSiteConversation('shelter-ledger', d.context);
    assert.equal(d.latest().options.choices.some(choice => choice.id.startsWith('record-testimony-')), false);
    assert.match(d.latest().lines.join(' '), /families are not named/);
  }
});

test('Iven’s optional receipt preserves the exact testimony choice without consuming the main report or demanding its completion', () => {
  for (const mode of ['anonymous', 'signed']) {
    const d = dialogueFixture();
    assert.deepEqual(regionalLifeRelayChoices(relay, d.context), []);
    assert.deepEqual(regionalLifeRelayChoices(npc('commons-miller'), d.context), []);
    act(d.story, 'accept-witness-account', `record-testimony-${mode}`);
    const pending = regionalLifeRelayChoices(relay, d.context); assert.equal(pending[0].id, 'relay-witness-account');
    pending[0].action();
    assert.match(d.latest().lines.join(' '), /separate page, beside the field returns/);
    assert.doesNotMatch(d.latest().lines.join(' '), /complete your army assignment|change your allegiance|quest/);
    d.choose('keep-witness-account'); assert.equal(d.returned, 1); assert.equal(d.story.state.testimonyDelivered, false);
    pending[0].action(); d.choose('deliver-testimony'); assert.equal(d.story.state.testimonyDelivered, true);
    const receipt = regionalLifeRelayChoices(relay, d.context); assert.equal(receipt[0].id, 'relay-witness-receipt');
    receipt[0].action();
    assert.match(d.latest().lines.join(' '), mode === 'signed' ? /Oda's name is on it, just as she asked/ : /Unsigned, as requested/);
    assert.match(d.latest().lines.join(' '), /own page among the field reports/);
    d.latest().options.onComplete(); assert.equal(d.returned, 2);
    assert.deepEqual(d.inventory.items(), []);
  }
});

test('regional perspective follows the intended local arc and all authored activity coordinates stay fixed', () => {
  const d = dialogueFixture();
  regionalLifeConversation(npc('reed-worker'), d.context); d.choose('merren-crossings');
  assert.match(d.latest().lines.join(' '), /Most households here help the people your army calls rebels/);
  assert.doesNotMatch(d.latest().lines.join(' '), /lawful government|legitimate/);
  regionalLifeConversation(npc('shelter-keeper'), d.context); d.choose('oda-shelter');
  assert.match(d.latest().lines.join(' '), /republic the Lauvel valleys declared/);
  assert.match(d.latest().lines.join(' '), /Northern goblin attacks/);
  assert.match(d.latest().lines.join(' '), /imperial levies/);
  assert.equal(d.story.state.testimonyAccepted, false);
  assert.deepEqual(REGIONAL_LIFE_NPCS.map(({ id, modelRole, x, z }) => ({ id, modelRole, x, z })), [
    { id: 'commons-miller', modelRole: 'commons-miller', x: -236, z: 62 },
    { id: 'reed-worker', modelRole: 'reed-worker', x: -380, z: 120 },
    { id: 'shelter-keeper', modelRole: 'shelter-keeper', x: -152, z: 322 },
  ]);
  assert.deepEqual(REGIONAL_LIFE_SITES.filter(site => ['mill-hoist', 'net-float-west', 'net-float-east', 'shelter-ledger'].includes(site.id))
    .map(({ id, x, z }) => ({ id, x, z })), [
    { id: 'mill-hoist', x: -243, z: 67 }, { id: 'net-float-west', x: -389, z: 126 },
    { id: 'net-float-east', x: -392, z: 128 }, { id: 'shelter-ledger', x: -158, z: 326 },
  ]);
  assert.deepEqual(REGIONAL_LIFE_SITES.filter(site => ['mill-commons', 'landing-workshop'].includes(site.id))
    .map(({ id, x, z }) => ({ id, x, z })), [
    { id: 'mill-commons', x: -238, z: 63 }, { id: 'landing-workshop', x: -385, z: 124 },
  ]);
});
