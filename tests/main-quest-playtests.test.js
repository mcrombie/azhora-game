import test from 'node:test';
import assert from 'node:assert/strict';
import { MAIN_QUEST_PLAYTESTS, mainQuestPlaytest, mainQuestPlaytestFinished } from '../src/dev/checks/main-quest-playtests.js';

test('gold playtests stop at their own completion, after the final conversation', () => {
  for (const entry of MAIN_QUEST_PLAYTESTS) {
    const before = { mode: 'playing', chartLesson: 'unissued', journey: { started: false }, campaign: { completed: [] }, aftermath: { complete: false } };
    assert.equal(mainQuestPlaytestFinished(entry, before), false, entry.id);
    const after = { ...before, chartLesson: 'complete', journey: { started: true }, campaign: { completed: [entry.stop] }, aftermath: { complete: true } };
    assert.equal(mainQuestPlaytestFinished(entry, { ...after, mode: 'dialogue' }), false, `${entry.id} keeps final dialogue`);
    assert.equal(mainQuestPlaytestFinished(entry, after), true, entry.id);
  }
  assert.equal(mainQuestPlaytest('unbuilt-chapter'), null);
  assert.equal(mainQuestPlaytestFinished(null, {}), false);
});

test('the two Solis playtests explicitly choose different campaign branches', () => {
  assert.equal(mainQuestPlaytest('solis-empire').side, 'empire');
  assert.equal(mainQuestPlaytest('solis-republic').side, 'coalition');
});
