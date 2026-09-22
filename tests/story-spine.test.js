import { QUEST_DONE } from '../src/game-state.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { STORY_STARTS } from '../src/story-starts.js';
import { STORY_CHAPTERS, chapterProgress, chapterTitle, chapterGoal, chapterLabel, chapterCount, sideSeat, atSideSeat, SIDE_SEATS, CONQUESTS } from '../src/story-chapters.js';
import { createLusciaChapter } from '../src/luscia-chapter.js';
import { createMorosChapter } from '../src/moros-chapter.js';
import { createAftermathChapter } from '../src/aftermath-chapter.js';
import { createCampaign, CHAPTERS } from '../src/campaign.js';

/**
 * `chapterProgress` walks the chapters in order and stops at the first whose `done` is false, so
 * a state where a later chapter is finished and an earlier one is not reports the earlier one.
 * `beginStoryStart` in main.js knows this — it restores Luscia and the Moros by hand precisely so
 * "the chapter count stays on Chapter 1 however well Chapter 2 is played" does not happen — but
 * only for the chapters today's one start happens to list. This holds the rule for whatever is
 * added next.
 */
const main = readFileSync(fileURLToPath(new URL('../src/main.js', import.meta.url)), 'utf8');
const inventory = { count: () => 40, has: () => true, add() {}, remove: () => true, grant: () => true, refresh() {} };

/** The part of `storyState()` in main.js that the chapter predicates read. */
function storyStateAfter(entry) {
  const luscia = createLusciaChapter({ inventory }), moros = createMorosChapter({ inventory });
  const campaign = createCampaign();
  for (const id of entry.completed) campaign.completeChapter(id);
  // The same two restores beginStoryStart performs, driven by the same condition.
  if (entry.completed.includes('luscia-aftermath'))
    luscia.restore({ version: luscia.snapshot().version, revision: 5, started: true, briefed: true, satchelTaken: true, wolvesCleared: true, returned: true });
  if (entry.completed.includes('moros-camp'))
    moros.restore({ version: moros.snapshot().version, revision: 4, started: true, admitted: true, mustered: true, horseClaimed: true });
  return { questStage: QUEST_DONE, luscia: { ...luscia.snapshot() }, moros: moros.view(), aftermath: createAftermathChapter().view(),
    side: campaign.view().side, home: false, campaign: campaign.view() };
}

test('no way of starting the story leaves the journal on a chapter the traveler is past', () => {
  for (const entry of STORY_STARTS) {
    const progress = chapterProgress(storyStateAfter(entry));
    assert.ok(progress.number > 1,
      `"${entry.title}" puts the traveler at ${entry.chapter} but the journal says Chapter ${progress.number}, ${chapterTitle(progress.current, {})}`);
    assert.ok(progress.current, 'a start that is already past the last chapter');
    // Everything it says is behind the traveler is marked done, and nothing ahead is.
    const states = progress.list.map(item => item.state);
    assert.equal(states.filter(s => s === 'current').length, 1, `${entry.id} has ${states.filter(s => s === 'current').length} current chapters`);
    assert.deepEqual(states.slice(0, progress.number - 1), Array(progress.number - 1).fill('done'));
  }
});

test('beginStoryStart repairs the story state for every chapter a start can claim to have finished', () => {
  // Each campaign chapter that gates a story chapter needs a hand-restore in main.js, or a start
  // listing it as completed would satisfy the campaign and not the journal.
  const listed = new Set(STORY_STARTS.flatMap(entry => entry.completed));
  for (const id of listed) {
    assert.ok(Object.hasOwn(CHAPTERS, id), `${id} is a real campaign chapter`);
    if (id === 'drent-road') continue;                // the tutorial, satisfied by questStage
    assert.match(main, new RegExp(`entry\\.completed\\.includes\\('${id}'\\)`),
      `a start lists ${id} as finished and beginStoryStart never repairs the state that goes with it`);
  }
});

test('a chapter is only done when the thing it is about has happened', () => {
  const base = { questStage: QUEST_DONE, luscia: {}, aftermath: {}, home: false };
  assert.equal(chapterProgress(base).number, 1, 'nothing done yet is Chapter 1');
  assert.equal(chapterProgress({ ...base, luscia: { started: true } }).number, 2, 'reporting to Iven closes Chapter 1');
  // The second chapter needs both halves: the day after, and standing on your side's ground.
  assert.equal(chapterProgress({ ...base, luscia: { started: true }, aftermath: { complete: true } }).number, 2, 'the day after alone does not close it');
  assert.equal(chapterProgress({ ...base, luscia: { started: true }, home: true }).number, 2, 'nor does standing there without the day after');
  assert.equal(chapterProgress({ ...base, luscia: { started: true }, aftermath: { complete: true }, home: true }).number, 3, 'both together do');
  // And the out-of-order state the walk protects against: chapter two finished, chapter one not.
  const outOfOrder = chapterProgress({ ...base, aftermath: { complete: true }, home: true });
  assert.equal(outOfOrder.number, 1, 'an unreported traveler is still on Chapter 1, whatever else they have done');
  assert.equal(outOfOrder.list[1].state, 'later', 'and Chapter 2 is not quietly marked done underneath it');
});

test('each side has ground of its own, and takes the other’s only by taking it', () => {
  for (const side of ['empire', 'coalition']) {
    const own = sideSeat(side), taken = sideSeat(side, CONQUESTS[side].variant);
    assert.ok(own && taken && own.id !== taken.id, `${side} keeps the same seat after a conquest`);
    assert.equal(taken.taken, true);
    assert.ok(atSideSeat(side, { x: own.x, z: own.z }), `${side} is at home on its own seat`);
    assert.equal(atSideSeat(side, { x: own.x + own.reach + 1, z: own.z }), false, 'and not just outside it');
    assert.ok(atSideSeat(side, { x: taken.x, z: taken.z }, CONQUESTS[side].variant), `${side} is at home on the ground it took`);
    assert.equal(atSideSeat(side, { x: taken.x, z: taken.z }), false, 'but not before it took it');
    for (const nonsense of [null, undefined, { x: NaN, z: 0 }]) assert.equal(atSideSeat(side, nonsense), false);
  }
  assert.equal(sideSeat('nobody'), null);
  assert.equal(chapterLabel(null, {}), 'The war moves on');
  for (const entry of STORY_CHAPTERS) assert.ok(chapterTitle(entry, {}).length > 4 && chapterGoal(entry, {}).length > 40, entry.id);
  assert.equal(chapterCount, STORY_CHAPTERS.length);
});
