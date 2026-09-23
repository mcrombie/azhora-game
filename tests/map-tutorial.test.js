import test from 'node:test';
import assert from 'node:assert/strict';
import { MAP_TUTORIAL_DONE, MAP_TUTORIAL_STEPS, createMapTutorial, validateMapTutorial } from '../src/map-tutorial.js';

test('the map tutorial starts on the first region beyond Drent and only while playing', () => {
  const tutorial = createMapTutorial();
  assert.equal(tutorial.shouldStart({ regionId: 1 }), false, 'Drent is where the traveler starts, not a new region');
  assert.equal(tutorial.shouldStart({ regionId: 2, mode: 'dialogue' }), false);
  assert.equal(tutorial.shouldStart({ regionId: 2 }), true);
  assert.equal(tutorial.shouldStart({ regionId: 4 }), true, 'any region beyond Drent can be the first one entered');
  assert.equal(tutorial.start(), true);
  assert.equal(tutorial.start(), false, 'it starts once');
  assert.equal(tutorial.shouldStart({ regionId: 3 }), false, 'a started tutorial does not restart on the next region');
  assert.deepEqual(tutorial.view(), { step: 1, active: true, done: false, card: { ...MAP_TUTORIAL_STEPS[1] } });
});

test('the new-region lesson uses the same world map and completes without a local-map step', () => {
  const tutorial = createMapTutorial(1);
  assert.equal(tutorial.noteJournalTab('trails'), false, 'the trails do not count before the chart has been seen');
  assert.equal(tutorial.noteJournalTab('journey'), false);
  assert.equal(tutorial.noteJournalTab('world'), true);
  assert.equal(tutorial.noteJournalTab('world'), false, 'the world map is read once');
  assert.equal(tutorial.noteJournalTab('trails'), false, 'there is no second map to open');
  assert.equal(tutorial.step, MAP_TUTORIAL_DONE);
  assert.deepEqual({ active: tutorial.view().active, done: tutorial.view().done, card: tutorial.view().card.id }, { active: false, done: true, card: 'done' });
  assert.equal(tutorial.noteJournalTab('world'), false, 'nothing advances past done');
  assert.equal(tutorial.shouldStart({ regionId: 2 }), false);
});

test('snapshots round-trip and invalid saved steps are refused without changing the tutorial', () => {
  const tutorial = createMapTutorial();
  for (const bad of [-1, 4, 1.5, '2', null, undefined, NaN]) {
    assert.equal(validateMapTutorial(bad), false);
    assert.equal(tutorial.restore(bad), false);
    assert.equal(tutorial.step, 0);
  }
  for (const good of [0, 1, 2, 3]) {
    assert.equal(tutorial.restore(good), true);
    assert.equal(tutorial.snapshot(), Math.min(good, MAP_TUTORIAL_DONE), 'old local-map and completed saves migrate to one-map completion');
  }
  assert.equal(createMapTutorial('nonsense').step, 0, 'an unusable initial value starts fresh');
  assert.equal(MAP_TUTORIAL_STEPS.length, MAP_TUTORIAL_DONE + 1);
  for (const card of MAP_TUTORIAL_STEPS.slice(1)) assert.ok(card.title && card.text && card.kicker, `${card.id} has a full card`);
  assert.deepEqual(MAP_TUTORIAL_STEPS.slice(1).map(card => card.act), ['open-chart', null], 'the autopilot needs only the world map');
});
