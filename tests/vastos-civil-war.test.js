import test from 'node:test';
import assert from 'node:assert/strict';
import { createInventoryState } from '../src/inventory.js';
import { createVastosCivilWar, validateVastosCivilWarSnapshot, VASTOS_NPCS, VASTOS_ENDINGS,
  VASTOS_PATHS, VASTOS_STRAYS, VASTOS_QUEST_ID } from '../src/vastos-civil-war.js';
import { vastosConversation, vastosSiteConversation } from '../src/vastos-dialogue.js';

const recovery = ['find-stray-west', 'find-stray-east', 'find-stray-ridge', 'reopen-watering'];
const claims = ['hear-republican', 'hear-monarchist'];
const evidence = ['hear-herder', 'read-covenant'];
const terms = {
  republican: ['post-route-notice'],
  monarchist: ['file-levy-manifest'],
  mediation: ['secure-republican-concession', 'secure-monarchist-concession'],
};
const npc = role => VASTOS_NPCS.find(person => person.id === `vastos-${role}`);

function perform(quest, actions) {
  for (const action of actions) {
    assert.equal(quest.act(action).ok, true, action);
    assert.equal(validateVastosCivilWarSnapshot(quest.snapshot()), true, `save after ${action}`);
  }
}

function readyToChoose(quest, { pact = false } = {}) {
  perform(quest, ['accept-herd', ...recovery, ...claims, ...(pact ? evidence : [])]);
}

function conversation(quest) {
  const shown = [], acted = [];
  let closed = 0;
  const context = {
    quest,
    act(id) { acted.push(id); return quest.act(id); },
    openDialogue(person, lines, action, leaveLabel, options) { shown.push({ person, lines, ...options }); },
    closeDialogue() { closed++; },
  };
  return {
    context, shown, acted,
    talk(role) { assert.equal(vastosConversation(npc(role), context), true); return shown.at(-1); },
    choices: () => shown.at(-1).choices.map(choice => choice.id),
    select(id) {
      const choice = shown.at(-1).choices.find(choice => choice.id === id);
      assert.ok(choice, `missing choice ${id}`);
      choice.action();
    },
    closed: () => closed,
  };
}

test('Vastos accepts the errand before allowing any work or political decision', () => {
  const events = [];
  const quest = createVastosCivilWar({ inventory: createInventoryState(), onEvent: event => events.push(event) });
  const before = quest.snapshot();
  assert.equal(quest.view().stage, 'unmet');
  assert.deepEqual(quest.view().knownIds, []);
  assert.deepEqual(quest.availableActions(), []);
  for (const action of [...recovery, ...claims, ...evidence, ...VASTOS_PATHS.map(path => `choose-${path}`),
    ...Object.values(terms).flat(), 'settle-camp', 'find-stray-north', 'constructor', '', null, undefined, {}]) {
    assert.equal(quest.act(action).ok, false, String(action));
    assert.deepEqual(quest.snapshot(), before);
  }
  assert.deepEqual(events, []);
  perform(quest, ['accept-herd']);
  assert.equal(quest.act('accept-herd').ok, false);
  assert.equal(events.length, 1);
  assert.equal(events[0].questId, VASTOS_QUEST_ID);
});

test('unknown actions and inherited object names cannot corrupt an accepted quest or open a site', () => {
  const events = [], quest = createVastosCivilWar({ onEvent: event => events.push(event) });
  perform(quest, ['accept-herd']);
  const before = quest.snapshot();
  for (const id of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'missing', 'choose-neutral', 'find-stray-north']) {
    assert.equal(quest.allowed(id), false, id);
    assert.equal(quest.act(id).ok, false, id);
    assert.equal(quest.siteView(id), null, id);
    assert.deepEqual(quest.snapshot(), before);
  }
  assert.equal(events.length, 1, 'invalid actions emitted progress');
});

test('all three distinct strays and open water are required, and each recovery site is used once', () => {
  assert.deepEqual([...VASTOS_STRAYS].sort(), ['east', 'ridge', 'west']);
  for (const missing of recovery) {
    const quest = createVastosCivilWar();
    perform(quest, ['accept-herd', ...claims, ...recovery.filter(action => action !== missing)]);
    for (const path of VASTOS_PATHS) assert.equal(quest.act(`choose-${path}`).ok, false, `${path} without ${missing}`);
    assert.equal(quest.view().stage, 'recover');
    assert.equal(quest.availableActions().includes(missing), true);
    perform(quest, [missing]);
    assert.equal(quest.act(missing).ok, false);
    assert.equal(quest.availableActions().includes(missing), false);
    assert.equal(quest.state().strays.length, 3);
    assert.equal(quest.view().stage, 'decision');
    assert.deepEqual(quest.view().destinationIds, ['vastos-herder']);
  }
});

test('both rival claims must be heard before either ordinary settlement can be chosen', () => {
  for (const missing of claims) {
    const quest = createVastosCivilWar();
    perform(quest, ['accept-herd', ...recovery, ...claims.filter(action => action !== missing)]);
    assert.equal(quest.view().stage, 'claims');
    assert.deepEqual(quest.view().destinationIds, [`vastos-${missing.slice(5)}`]);
    assert.equal(quest.act('choose-republican').ok, false);
    assert.equal(quest.act('choose-monarchist').ok, false);
    perform(quest, [missing]);
    assert.equal(quest.allowed('choose-republican'), true);
    assert.equal(quest.allowed('choose-monarchist'), true);
  }
});

test('mediation requires the herder, both rivals, and the discovered covenant', () => {
  for (const missing of [...claims, ...evidence]) {
    const quest = createVastosCivilWar();
    perform(quest, ['accept-herd', ...recovery, ...claims, ...evidence].filter(action => action !== missing));
    assert.equal(quest.view().mediationDiscovered, false, missing);
    assert.equal(quest.allowed('choose-mediation'), false, missing);
    assert.equal(quest.act('choose-mediation').ok, false, missing);
    perform(quest, [missing]);
    assert.equal(quest.view().mediationDiscovered, true);
    assert.equal(quest.allowed('choose-mediation'), true);
  }
});

for (const path of VASTOS_PATHS) {
  test(`${path} needs its own terms and pays exactly two portions of salt beef once`, () => {
    const inventory = createInventoryState(), events = [];
    assert.equal(inventory.add('salt-beef', 3), true);
    const quest = createVastosCivilWar({ inventory, onEvent: event => events.push(event) });
    readyToChoose(quest, { pact: true });
    perform(quest, [`choose-${path}`]);
    assert.equal(quest.view().stage, 'terms');
    for (const other of VASTOS_PATHS.filter(id => id !== path)) {
      assert.equal(quest.act(`choose-${other}`).ok, false, 'the decision cannot be switched');
      for (const action of terms[other]) assert.equal(quest.act(action).ok, false, `${action} on ${path}`);
    }
    assert.equal(quest.act(`choose-${path}`).ok, false);
    for (const action of terms[path]) {
      assert.equal(quest.act('settle-camp').ok, false, `settled before ${action}`);
      assert.equal(inventory.count('salt-beef'), 3);
      perform(quest, [action]);
      assert.equal(quest.act(action).ok, false);
    }
    assert.equal(quest.view().stage, 'settle');
    assert.deepEqual(quest.view().destinationIds, ['vastos-herder']);
    assert.equal(inventory.count('salt-beef'), 3, 'terms alone do not pay');
    perform(quest, ['settle-camp']);
    assert.equal(inventory.count('salt-beef'), 5);
    assert.equal(quest.state().outcome, path);
    assert.equal(quest.state().rewardGranted, true);
    assert.equal(quest.view().stage, 'complete');
    assert.equal(quest.view().complete, true);
    assert.deepEqual(quest.view().destinationIds, []);
    assert.deepEqual(quest.availableActions(), []);
    const done = quest.snapshot(), eventCount = events.length;
    for (const action of ['settle-camp', 'accept-herd', ...VASTOS_PATHS.map(id => `choose-${id}`), ...Object.values(terms).flat()]) {
      assert.equal(quest.act(action).ok, false);
      assert.deepEqual(quest.snapshot(), done);
    }
    assert.equal(inventory.count('salt-beef'), 5);
    assert.equal(events.length, eventCount);
    assert.equal(events.filter(event => event.action === 'settle-camp').length, 1);
  });
}

test('each ending states the concrete cost of its settlement and mediation only resolves the local dispute', () => {
  assert.match(VASTOS_ENDINGS.republican.detail, /contract is withdrawn/);
  assert.match(VASTOS_ENDINGS.republican.detail, /find another market/);
  assert.match(VASTOS_ENDINGS.monarchist.detail, /surrender some surplus cattle/);
  assert.match(VASTOS_ENDINGS.monarchist.detail, /tally/);
  assert.match(VASTOS_ENDINGS.mediation.detail, /gives up compulsory seizure/);
  assert.match(VASTOS_ENDINGS.mediation.detail, /accepts escorted royal buyers/);
  assert.match(VASTOS_ENDINGS.mediation.detail, /owe water upkeep and a public tally/);
  assert.match(VASTOS_ENDINGS.mediation.detail, /settles neither the succession nor the war/);
});

test('a refused inventory grant leaves settlement and events untouched and allows a later retry', () => {
  const inventory = createInventoryState(), events = [];
  assert.equal(inventory.add('salt-beef', Number.MAX_SAFE_INTEGER - 1), true);
  const quest = createVastosCivilWar({ inventory, onEvent: event => events.push(event) });
  readyToChoose(quest);
  perform(quest, ['choose-republican', 'post-route-notice']);
  const before = quest.snapshot(), eventCount = events.length;
  assert.equal(quest.act('settle-camp').ok, false, 'adding two would overflow the inventory stack');
  assert.deepEqual(quest.snapshot(), before);
  assert.equal(events.length, eventCount);
  assert.equal(inventory.count('salt-beef'), Number.MAX_SAFE_INTEGER - 1);
  assert.equal(inventory.remove('salt-beef', Number.MAX_SAFE_INTEGER - 1), true);
  perform(quest, ['settle-camp']);
  assert.equal(inventory.count('salt-beef'), 2);
});

test('restoring every completed branch preserves it without granting food or emitting progress', () => {
  for (const path of VASTOS_PATHS) {
    const original = createVastosCivilWar({ inventory: createInventoryState() });
    readyToChoose(original, { pact: true });
    perform(original, [`choose-${path}`, ...terms[path], 'settle-camp']);
    const saved = JSON.parse(JSON.stringify(original.snapshot()));
    const inventory = createInventoryState(), events = [];
    inventory.add('salt-beef', 7);
    const loaded = createVastosCivilWar({ inventory, onEvent: event => events.push(event) });
    assert.equal(loaded.restore(saved), true);
    assert.deepEqual(loaded.snapshot(), saved);
    assert.equal(loaded.act('settle-camp').ok, false);
    assert.equal(inventory.count('salt-beef'), 7);
    assert.deepEqual(events, []);
    saved.strays.length = 0;
    assert.equal(loaded.state().strays.length, 3, 'restore must own its saved array');
  }
});

test('invalid schemas and impossible progress are rejected atomically', () => {
  const quest = createVastosCivilWar({ inventory: createInventoryState() });
  readyToChoose(quest, { pact: true });
  perform(quest, ['choose-mediation', ...terms.mediation, 'settle-camp']);
  const valid = quest.snapshot();
  const missing = { ...valid }; delete missing.heardHerder;
  const invalid = [null, [], {}, true, 'save', 1, missing,
    { ...valid, version: 2 }, { ...valid, unexpected: true }, { ...valid, wateringOpened: 1 },
    { ...valid, accepted: false }, { ...valid, wateringOpened: false },
    { ...valid, strays: ['west', 'east'] }, { ...valid, strays: ['west', 'west', 'ridge'] },
    { ...valid, strays: ['west', 'east', 'north'] }, { ...valid, strays: 'west' },
    { ...valid, chosenPath: 'neutral' }, { ...valid, outcome: 'neutral' },
    { ...valid, chosenPath: null }, { ...valid, chosenPath: 'monarchist' },
    { ...valid, heardRepublican: false }, { ...valid, heardMonarchist: false },
    { ...valid, heardHerder: false }, { ...valid, covenantRead: false },
    { ...valid, republicanConcession: false }, { ...valid, monarchistConcession: false },
    { ...valid, routeNoticePosted: true }, { ...valid, levyManifestFiled: true },
    { ...valid, outcome: 'republican' }, { ...valid, outcome: null }, { ...valid, rewardGranted: false },
  ];
  const empty = createVastosCivilWar().snapshot();
  for (const field of ['wateringOpened', 'heardHerder', 'heardRepublican', 'heardMonarchist', 'covenantRead', 'rewardGranted'])
    invalid.push({ ...empty, [field]: true });
  invalid.push({ ...empty, strays: ['west'] }, { ...empty, accepted: true, routeNoticePosted: true },
    { ...empty, accepted: true, levyManifestFiled: true }, { ...empty, accepted: true, republicanConcession: true });
  for (const bad of invalid) {
    assert.equal(validateVastosCivilWarSnapshot(bad), false, JSON.stringify(bad));
    assert.equal(quest.restore(bad), false, JSON.stringify(bad));
    assert.deepEqual(quest.snapshot(), valid, 'a refused save changed the running quest');
  }
});

test('old saves have an unmet Vastos quest and returned snapshots cannot mutate live state', () => {
  const quest = createVastosCivilWar();
  readyToChoose(quest);
  const snapshot = quest.snapshot(), state = quest.state();
  snapshot.strays.length = 0;
  state.strays.push('north');
  state.chosenPath = 'mediation';
  assert.equal(quest.state().strays.length, 3);
  assert.equal(quest.state().chosenPath, null);
  assert.equal(validateVastosCivilWarSnapshot(undefined), true);
  assert.equal(validateVastosCivilWarSnapshot(undefined, { allowMissing: false }), false);
  assert.equal(quest.restore(undefined), true);
  assert.deepEqual(quest.snapshot(), createVastosCivilWar().snapshot());
});

test('dialogue offers acceptance only through Mera and does not reveal mediation before discovery', () => {
  const quest = createVastosCivilWar(), dialogue = conversation(quest);
  for (const role of ['republican', 'monarchist']) {
    dialogue.talk(role);
    assert.deepEqual(dialogue.choices(), ['leave-vastos']);
  }
  assert.deepEqual(dialogue.acted, [], 'talk before accepting does not record progress');
  dialogue.talk('herder');
  assert.deepEqual(dialogue.choices(), ['accept-herd', 'leave-vastos']);
  dialogue.select('accept-herd');
  assert.equal(quest.state().accepted, true);
  assert.equal(quest.state().heardHerder, true);
  perform(quest, recovery);
  for (const role of ['republican', 'monarchist']) {
    dialogue.talk(role);
    assert.deepEqual(dialogue.choices(), ['leave-vastos']);
  }
  dialogue.talk('herder');
  assert.deepEqual(dialogue.choices(), ['choose-republican', 'choose-monarchist', 'leave-vastos']);
  assert.doesNotMatch(dialogue.shown.at(-1).lines.join(' '), /covenant|mediat|third way/i);
  assert.equal(quest.view().knownIds.includes('vastos-covenant'), false);
  assert.equal(vastosSiteConversation('vastos-covenant', dialogue.context), true);
  assert.equal(quest.state().covenantRead, false, 'merely opening the stone does not copy it');
  dialogue.select('read-covenant');
  assert.equal(quest.view().knownIds.includes('vastos-covenant'), true);
  dialogue.talk('herder');
  assert.deepEqual(dialogue.choices(), ['choose-republican', 'choose-monarchist', 'choose-mediation', 'leave-vastos']);
});

test('the appropriate NPC alone offers each mediation concession, and Mera alone completes the meal', () => {
  const inventory = createInventoryState(), quest = createVastosCivilWar({ inventory });
  readyToChoose(quest, { pact: true });
  const dialogue = conversation(quest);
  dialogue.talk('herder');
  dialogue.select('choose-mediation');
  assert.deepEqual(dialogue.choices(), ['leave-vastos']);
  dialogue.talk('republican');
  assert.deepEqual(dialogue.choices(), ['secure-republican-concession', 'leave-vastos']);
  dialogue.select('secure-republican-concession');
  assert.deepEqual(dialogue.choices(), ['leave-vastos']);
  dialogue.talk('herder');
  assert.deepEqual(dialogue.choices(), ['leave-vastos']);
  dialogue.talk('monarchist');
  assert.deepEqual(dialogue.choices(), ['secure-monarchist-concession', 'leave-vastos']);
  dialogue.select('secure-monarchist-concession');
  assert.deepEqual(dialogue.choices(), ['leave-vastos']);
  dialogue.talk('herder');
  assert.deepEqual(dialogue.choices(), ['settle-camp', 'leave-vastos']);
  dialogue.select('settle-camp');
  assert.equal(inventory.count('salt-beef'), 2);
  for (const role of ['herder', 'republican', 'monarchist']) {
    dialogue.talk(role);
    assert.deepEqual(dialogue.choices(), ['leave-vastos']);
  }
  const before = quest.snapshot(), opened = dialogue.shown.length;
  assert.equal(vastosConversation({ id: 'some-other-herder' }, dialogue.context), false);
  assert.equal(dialogue.shown.length, opened);
  assert.deepEqual(quest.snapshot(), before);
});

test('world site dialogue enforces acceptance, path ownership, and one use per site', () => {
  const quest = createVastosCivilWar(), dialogue = conversation(quest);
  assert.equal(vastosSiteConversation('vastos-stray-west', dialogue.context), false);
  assert.equal(vastosSiteConversation('vastos-covenant', dialogue.context), false);
  assert.equal(vastosSiteConversation('missing-site', dialogue.context), false);
  perform(quest, ['accept-herd']);
  assert.equal(vastosSiteConversation('vastos-stray-west', dialogue.context), true);
  assert.equal(quest.state().strays.length, 0);
  dialogue.select('find-stray-west');
  assert.deepEqual(quest.state().strays, ['west']);
  assert.equal(vastosSiteConversation('vastos-stray-west', dialogue.context), false);
  perform(quest, [...recovery.filter(action => action !== 'find-stray-west'), ...claims]);
  assert.equal(vastosSiteConversation('vastos-route-notice', dialogue.context), false);
  assert.equal(vastosSiteConversation('vastos-levy-manifest', dialogue.context), false);
  perform(quest, ['choose-republican']);
  assert.equal(vastosSiteConversation('vastos-levy-manifest', dialogue.context), false);
  assert.equal(vastosSiteConversation('vastos-route-notice', dialogue.context), true);
  dialogue.select('post-route-notice');
  assert.equal(vastosSiteConversation('vastos-route-notice', dialogue.context), false);
  assert.equal(quest.view().stage, 'settle');
});
