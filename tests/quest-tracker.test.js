import test from 'node:test';
import assert from 'node:assert/strict';
import { activeOptionalQuests, createQuestTracker, normalizeTrackableQuests } from '../src/quest-tracker.js';

const main = { title: 'Report to Nothom', detail: 'Carry your letter to Iven.', destinationIds: ['relay-clerk'] };
const vastos = { title: 'The Common Water', detail: 'Bring the strays home.', stage: 'recover', destinationIds: ['west-stray', 'east-stray'] };
const sources = { main, bridge: { stage: 'accepted', sticks: 2 }, vastos };

test('main is selected by default and quests carry the three existing grades', () => {
  const tracker = createQuestTracker(), view = tracker.update(sources);
  assert.equal(view.selectedId, 'main'); assert.equal(view.selected.title, main.title);
  assert.deepEqual(view.choices.map(quest => [quest.id, quest.type, quest.grade]), [
    ['main', 'main', 'main'], ['civil-war-vastos', 'secondary', 'plot'], ['bridge', 'tertiary', 'deed'],
  ]);
  assert.match(view.choices.find(quest => quest.id === 'bridge').detail, /2 \/ 3/);
});

test('offered, completed and parked side quests do not become active tracker choices', () => {
  const list = normalizeTrackableQuests({ main, bridge: { stage: 'offered' }, vastos: { ...vastos, stage: 'unmet' }, optional: [
    { id: 'acorns', title: 'Old saved acorns', active: true },
    { id: 'old-forest', slateId: 'forest', active: true },
    { id: 'just-an-offer', active: false },
    { id: 'finished', active: true, complete: true },
    { id: 'failed', active: true, stage: 'failed' },
  ] });
  assert.deepEqual(list.map(quest => quest.id), ['main']);
  assert.deepEqual(normalizeTrackableQuests({ ...sources, live: id => id === 'main' }).map(quest => quest.id), ['main']);
});

test('an active secondary or tertiary can be selected and stays selected as its objective changes', () => {
  const tracker = createQuestTracker(); tracker.update(sources);
  assert.equal(tracker.select('bridge').ok, true);
  const report = tracker.update({ ...sources, bridge: { stage: 'repaired' } });
  assert.equal(report.selectedId, 'bridge');
  assert.deepEqual(report.selected.destinationIds, ['crossing-keeper']);
  assert.match(report.selected.detail, /Return to Chip/);
  assert.equal(tracker.select('civil-war-vastos').selected.type, 'secondary');
});

test('completing, disabling or removing the selected side quest returns to main', () => {
  const tracker = createQuestTracker(); tracker.update(sources); tracker.select('bridge');
  assert.equal(tracker.update({ ...sources, bridge: { stage: 'done' } }).selectedId, 'main');
  tracker.update(sources); tracker.select('civil-war-vastos');
  assert.equal(tracker.update({ ...sources, vastos: { ...vastos, complete: true } }).selectedId, 'main');
  tracker.update(sources); tracker.select('bridge');
  assert.equal(tracker.select('constructor').ok, false); assert.equal(tracker.selectedId, 'main');
});

test('selection controls the objective pointer without mutating the ordinary main goal', () => {
  const tracker = createQuestTracker(), ordinary = { id: 'relay-clerk', name: 'Iven', x: 12, z: 20 };
  tracker.update(sources); assert.deepEqual(tracker.target(ordinary), ordinary);
  tracker.select('civil-war-vastos');
  const positions = { 'west-stray': { x: -20, z: 0 }, 'east-stray': { x: 5, z: 0 } };
  assert.equal(tracker.target(ordinary, id => positions[id], { x: 0, z: 0 }).id, 'east-stray');
  assert.equal(tracker.target(ordinary, () => ({ x: undefined, z: 2 })), null, 'an unresolved side target never produces undefined map coordinates');
  tracker.select('main'); const copied = tracker.target(ordinary); copied.x = 999;
  assert.equal(ordinary.x, 12);
});

test('existing active optional quests can join the list without starting other content', () => {
  const tracker = createQuestTracker(); tracker.update({ main, optional: [
    { id: 'accepted-story', active: true, grade: 'plot', title: 'An accepted story', target: { x: 4, z: 8 } },
    { id: 'small-favor', active: true, type: 'tertiary', title: 'A small favor' },
    { id: 'accepted-story', active: true, title: 'A duplicate' },
    { id: 'main', active: true, title: 'An impostor' },
  ] });
  assert.deepEqual(tracker.view().choices.map(quest => quest.id), ['main', 'accepted-story', 'small-favor']);
  tracker.select('accepted-story'); assert.deepEqual(tracker.target(null), { x: 4, z: 8 });
  const view = tracker.view(); view.selected.title = 'Mutated'; view.choices[1].target.x = 999;
  assert.equal(tracker.view().selected.title, 'An accepted story'); assert.equal(tracker.target(null).x, 4);
});

test('magic quest adapters list accepted errands, update destinations and omit unaccepted or resolved stories', () => {
  assert.deepEqual(activeOptionalQuests({ spider: { stage: 'asked' }, murder: { stage: 'unmet' }, cat: { stage: 'asked' } }), []);
  const tasks = activeOptionalQuests({ spider: { stage: 'walking' }, murder: { stage: 'asking', heard: ['light-boats'] }, cat: { stage: 'following' } });
  assert.deepEqual(tasks.map(quest => quest.id), ['ben-spider', 'cobble-murder', 'liz-cat']);
  assert.deepEqual(tasks[0].target, { x: -796, z: 276, id: 'thorn-den', name: 'The spider den' });
  assert.deepEqual(tasks[1].destinationIds, ['cobble-ari', 'cobble-imani']);
  assert.deepEqual(tasks[2].destinationIds, ['liz-beekeeper']);
  const ready = activeOptionalQuests({ spider: { stage: 'killed' }, murder: { stage: 'asking', heard: ['light-boats', 'weights-not-counts', 'lamp-under-the-beam'] }, cat: { stage: 'home' } });
  assert.deepEqual(ready[0].destinationIds, ['ben-sorcerer']);
  assert.deepEqual(ready[1].destinationIds, ['bee-keeper'], 'guide the report without exposing the culprit');
  assert.deepEqual(activeOptionalQuests({ spider: { stage: 'abandoned' }, murder: { stage: 'paid' }, cat: { stage: 'lost' } }), []);
  assert.equal(normalizeTrackableQuests({ main, optional: tasks }).length, 4, 'active authored magic quests are not the parked teacher errands');
});
