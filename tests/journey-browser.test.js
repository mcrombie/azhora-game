import test from 'node:test';
import assert from 'node:assert/strict';
import { createJourneyIndex, normalizeJourneyEntries } from '../src/journey-browser.js';

const entries = Object.freeze([
  Object.freeze({ id: 'main', title: 'Report to Nothom', type: 'main', status: 'active', detail: 'Take the letter to Iven.', region: 'Luscia' }),
  Object.freeze({ id: 'bridge', title: 'Mend the crossing', type: 'tertiary', status: 'active', objective: 'Gather three sticks.', region: 'Caloss' }),
  Object.freeze({ id: 'old', title: 'Officer Glun', type: 'main', status: 'complete', detail: 'You completed training.' }),
  Object.freeze({ id: 'pond', title: 'Willowmere Pond', status: 'note', detail: 'A quiet place beside the trees.' }),
  Object.freeze({ id: 'future', title: 'Spoiler', type: 'main', status: 'unstarted' }),
]);

test('the journal admits begun, completed, and discovered entries but never an unstarted quest', () => {
  const result = normalizeJourneyEntries(entries);
  assert.deepEqual(result.map(entry => entry.id).sort(), ['bridge', 'main', 'old', 'pond']);
  assert.deepEqual(normalizeJourneyEntries([{ id: 'missing', title: 'Not begun' }, { id: 'bad', title: '', status: 'active' }]), []);
});

test('reading and filtering entries never changes the tracked objective', () => {
  const browser = createJourneyIndex();
  assert.equal(browser.update({ entries, trackedId: 'main' }).selectedId, 'main');
  assert.equal(browser.select('bridge').selectedId, 'bridge');
  assert.equal(browser.view().trackedId, 'main');
  assert.equal(browser.filter('complete').selectedId, 'old');
  assert.equal(browser.view().trackedId, 'main');
  assert.equal(browser.filter('active').selectedId, 'main');
});

test('search matches a location, contains no other status, and handles an empty result', () => {
  const browser = createJourneyIndex(); browser.update({ entries });
  assert.deepEqual(browser.search('cALoss').visible.map(entry => entry.id), ['bridge']);
  assert.equal(browser.search('Glun').selected, null);
  assert.deepEqual(browser.filter('complete').visible.map(entry => entry.id), ['old']);
  assert.equal(browser.view().query, '');
});

test('quest completion leaves the active page clean and explicit opening can find the archive', () => {
  const browser = createJourneyIndex(); browser.update({ entries }); browser.select('bridge');
  const updated = entries.map(entry => entry.id === 'bridge' ? { ...entry, status: 'complete' } : entry);
  assert.equal(browser.update({ entries: updated, trackedId: 'main' }).selectedId, 'main');
  assert.equal(browser.open({ id: 'bridge' }).status, 'complete');
  assert.equal(browser.view().trackedId, 'main');
  assert.equal(browser.reset().status, 'active');
});

test('the focused silver quest comes first while the gold quest stays readable and switchable', () => {
  const browser = createJourneyIndex();
  const silver = { id: 'civil-war-drent', title: 'Civil War in Drent', type: 'secondary', status: 'active',
    objective: 'Search the rebel camp', detail: 'Look in the woods near Greenway Watch.', region: 'Drent' };
  const quests = [...entries, silver];
  const state = browser.update({ entries: quests, trackedId: silver.id });
  assert.deepEqual(state.visible.map(entry => entry.id), ['civil-war-drent', 'main', 'bridge']);
  assert.equal(state.selectedId, silver.id);
  assert.equal(browser.select('main').selectedId, 'main');
  assert.equal(browser.view().trackedId, silver.id, 'reading gold does not silently steal focus');
  const switched = browser.update({ entries: quests, trackedId: 'main' });
  assert.equal(switched.visible[0].id, 'main');
  assert.equal(switched.selectedId, 'main');
  assert.deepEqual(browser.search('Drent').visible.map(entry => entry.id), [silver.id]);
  assert.equal(browser.view().trackedId, 'main', 'search does not choose a quest');
});

test('focus ordering does not reorder archived stories and optional leads remain clearly distinguished', () => {
  const browser = createJourneyIndex();
  const silver = { id: 'civil-war-drent', title: 'Civil War in Drent', type: 'secondary', status: 'active',
    lead: true, objective: 'Report the rebels to Glun', notes: ['Army orders remain open.', 'Reporting is optional.'],
    actions: [{ id: 'satchel', label: 'Open satchel' }] };
  browser.update({ entries: [...entries, silver], trackedId: silver.id });
  assert.equal(browser.view().selected.lead, true);
  assert.equal(browser.view().selected.notes, 'Army orders remain open.\n\nReporting is optional.');
  assert.deepEqual(browser.view().selected.actions, silver.actions);
  const complete = { ...silver, status: 'complete', lead: false, rewards: ['Empire favor +10'] };
  browser.update({ entries: [...entries, complete], trackedId: silver.id });
  assert.deepEqual(browser.filter('complete').visible.map(entry => entry.id), ['old', silver.id]);
  assert.deepEqual(browser.select(silver.id).selected.rewards, ['Empire favor +10']);
});
