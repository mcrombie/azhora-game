import test from 'node:test';
import assert from 'node:assert/strict';
import { buildJournalEntries } from '../src/journal-entries.js';
import { createQuestTracker, activeOptionalQuests } from '../src/quest-tracker.js';
import { createDrentCivilWar } from '../src/drent-civil-war.js';

const main = { title: 'Report to Nothom', detail: 'Take the letter to Iven.', kicker: 'Chapter 1' };
const tracker = source => createQuestTracker().update({ main, ...source });

test('Sela’s unaccepted call stays out of the quest log, accepted work is active, and the burial is archived', () => {
  for (const stage of ['unknown', 'hailed', 'asked']) {
    const state = { stage, done: [], carried: 0 };
    const entries = buildJournalEntries({ tracker: tracker({ optional: activeOptionalQuests({ burying: state }) }), burying: state });
    assert.deepEqual(entries.map(entry => entry.id), ['main']);
  }
  for (const stage of ['helping', 'found', 'told']) {
    const state = { stage, done: [], carried: stage === 'helping' ? 0 : 4 };
    const entries = buildJournalEntries({ tracker: tracker({ optional: activeOptionalQuests({ burying: state }) }), burying: state });
    assert.equal(entries.find(entry => entry.id === 'lauvel-burying').status, 'active');
  }
  const done = buildJournalEntries({ burying: { stage: 'done' } });
  assert.equal(done[0].status, 'complete'); assert.match(done[0].detail, /Bevan/);
  assert.deepEqual(buildJournalEntries({ burying: { stage: 'done', enabled: false } }), []);
});

test('a new journey lists its current main objective, with no future quests or chapters', () => {
  const entries = buildJournalEntries({ tracker: tracker({ bridge: { stage: 'offered' }, vastos: { stage: 'unmet' } }),
    spider: { stage: 'asked' }, murder: { stage: 'unmet' }, cat: { stage: 'asked' } });
  assert.deepEqual(entries, [{ id: 'main', type: 'main', grade: 'main', status: 'active',
    title: main.title, detail: main.detail, kicker: main.kicker }]);
  assert.equal(entries[0].objective, undefined, 'the instruction appears once');
});

test('accepted quests are active and completed quests belong to the archive', () => {
  const entries = buildJournalEntries({ tracker: tracker({ bridge: { stage: 'accepted', sticks: 1 },
    optional: activeOptionalQuests({ cat: { stage: 'following' } }) }),
    mainSteps: [{ label: 'Trained with Glun', complete: true }],
    completedChapters: [{ id: 'prologue', title: 'A shore called Eastreena', detail: 'You reached the shore.' }],
    spider: { stage: 'taught' }, murder: { stage: 'paid' } });
  assert.deepEqual(entries.filter(entry => entry.status === 'active').map(entry => entry.id), ['main', 'bridge', 'liz-cat']);
  assert.deepEqual(entries.filter(entry => entry.status === 'complete').map(entry => entry.id), ['prologue', 'ben-spider', 'cobble-murder']);
  assert.match(entries.find(entry => entry.id === 'ben-spider').detail, /first lesson in fire/);
  assert.match(entries.find(entry => entry.id === 'cobble-murder').detail, /guild’s purse/);
  assert.equal(entries[0].steps[0].complete, true);
});

test('bridge and Vastos archives retain actual outcomes without revealing unaccepted stories', () => {
  const hidden = buildJournalEntries({ tracker: tracker(), bridge: { stage: 'repaired' }, vastos: { stage: 'unmet' } });
  assert.equal(hidden.length, 1);
  const entries = buildJournalEntries({ bridge: { stage: 'done' }, live: () => true,
    vastos: { stage: 'complete', title: 'The Common Water', detail: 'The herders keep their route.', entries: ['Mera thanked you.'] } });
  assert.deepEqual(entries.map(entry => [entry.id, entry.status, entry.grade]), [['bridge', 'complete', 'deed'], ['civil-war-vastos', 'complete', 'plot']]);
  assert.equal(entries[1].detail, 'The herders keep their route.');
  assert.deepEqual(entries[1].notes, ['Mera thanked you.']);
});

test('a known Drent lead is readable and focusable without listing undiscovered side quests', () => {
  const drent = createDrentCivilWar();
  assert.deepEqual(buildJournalEntries({ tracker: tracker(), drent: drent.view() }).map(entry => entry.id), ['main']);
  drent.act('defeat-ambush');
  const lead = { ...drent.view(), active: true, stage: 'lead', notes: drent.view().entries };
  const entries = buildJournalEntries({ tracker: tracker({ optional: [lead] }), drent: drent.view() });
  const entry = entries.find(item => item.id === 'civil-war-drent');
  assert.equal(entry.lead, true); assert.equal(entry.status, 'active'); assert.equal(entry.grade, 'plot');
  assert.equal(entry.region, 'Drent'); assert.equal(entry.objective, 'Report the rebels to Glun');
  assert.match(entry.detail, /continue to Nothom/);
  assert.doesNotMatch(JSON.stringify(entry), /Killian|barracks|supplies/, 'a lead exposes no later branch');
  assert.equal(drent.state().accepted, false);
});

test('each completed Drent branch records only its actual outcome with visible faction favor', () => {
  for (const branch of ['monarchist', 'republican']) {
    const drent = createDrentCivilWar();
    const actions = ['defeat-ambush', 'accept-investigation', 'search-camp', ...(branch === 'monarchist'
      ? ['report-glun', 'confront-killian', 'kill-killian', 'report-victory']
      : ['read-evidence', 'report-killian', 'steal-supplies', 'return-supplies'])];
    for (const action of actions) assert.equal(drent.act(action).ok, true, action);
    const before = drent.snapshot();
    const entries = buildJournalEntries({ tracker: tracker(), drent: drent.view() });
    const entry = entries.find(item => item.id === 'civil-war-drent');
    assert.equal(entry.status, 'complete'); assert.equal(entry.type, 'secondary');
    assert.equal(entry.region, 'Drent'); assert.ok(entry.objective); assert.ok(entry.detail);
    assert.deepEqual(entry.rewards, [branch === 'monarchist' ? 'Empire favor +10' : 'Republic favor +10']);
    assert.match(entry.detail, branch === 'monarchist' ? /Killian is dead/ : /He remains in Tidehaven/);
    assert.deepEqual(drent.snapshot(), before);
    entry.notes.push('Changed'); assert.deepEqual(drent.snapshot(), before);
  }
});

test('all six magic endings record the reward actually chosen; abandonment and loss are not success', () => {
  for (const stage of ['paid', 'taught']) {
    const entries = buildJournalEntries({ spider: { stage }, murder: { stage }, cat: { stage } });
    assert.equal(entries.length, 3); assert.ok(entries.every(entry => entry.status === 'complete'));
    assert.match(entries[0].detail, stage === 'paid' ? /bounty/ : /fire/);
    assert.match(entries[1].detail, stage === 'paid' ? /purse/ : /reading/);
    assert.match(entries[2].detail, stage === 'paid' ? /coin/ : /bees/);
  }
  assert.deepEqual(buildJournalEntries({ spider: { stage: 'abandoned' }, cat: { stage: 'lost' } }), []);
});

test('disabled and slate-closed quests cannot reappear through stale saves or tracker choices', () => {
  const entries = buildJournalEntries({ tracker: { choices: [
    { id: 'main', ...main }, { id: 'acorns', title: 'Old errand' },
    { id: 'off', title: 'Disabled story', enabled: false },
    { id: 'future', title: 'Future story', stage: 'unmet' },
  ] }, completedChapters: [{ id: 'teachers', title: 'Old lessons' }], bridge: { stage: 'complete' },
    vastos: { stage: 'complete' }, spider: { stage: 'paid', enabled: false },
    murder: { stage: 'taught', slateId: 'teachers' }, live: id => id === 'main' });
  assert.deepEqual(entries.map(entry => entry.id), ['main']);
});

test('only explicitly discovered notes are shown, preserving their navigation actions', () => {
  const action = () => 'map';
  const entries = buildJournalEntries({ notes: [
    { id: 'unseen', title: 'A distant place' }, { id: 'almost', title: 'Rumor', discovered: 1 },
    { id: 'known', title: 'Tidehaven', detail: 'The village where you landed.', discovered: true,
      map: { x: 10, z: 12 }, actions: [{ label: 'Open map', run: action }] },
    { id: 'closed-note', title: 'An old quest', discovered: true, slateId: 'forest' },
  ] });
  assert.equal(entries.length, 1); assert.equal(entries[0].status, 'note'); assert.equal(entries[0].type, 'note');
  assert.deepEqual(entries[0].map, { x: 10, z: 12 }); assert.equal(entries[0].actions[0].run, action);
});

test('a fully completed main quest is archived once and input views remain unchanged', () => {
  const input = { tracker: { choices: [{ id: 'main', ...main, complete: true }] },
    mainSteps: [{ label: 'Delivered the letter', complete: true }],
    completedChapters: [{ id: 'main', title: 'Duplicate', detail: 'Duplicate text.' }],
    notes: [{ id: 'known', title: 'Village', discovered: true, map: { x: 10, z: 12 }, notes: ['A quiet quay.'] }] };
  const before = structuredClone(input), entries = buildJournalEntries(input);
  assert.deepEqual(input, before);
  assert.equal(entries.filter(entry => entry.id === 'main').length, 1);
  assert.equal(entries[0].status, 'complete');
  entries[0].steps[0].label = 'Changed'; entries[1].map.x = 99; entries[1].notes.push('Changed');
  assert.deepEqual(input, before, 'the UI cannot mutate game state through journal data');
});
