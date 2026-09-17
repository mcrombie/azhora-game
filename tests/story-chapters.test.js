import test from 'node:test';
import assert from 'node:assert/strict';
import { STORY_CHAPTERS, chapterCount, chapterProgress, chapterTitle, chapterGoal, chapterLabel, storyChapter } from '../src/story-chapters.js';

const reported = { luscia: { briefed: true } };
const fought = { ...reported, border: { complete: true } };
const settled = { ...fought, aftermath: { complete: true } };

test('the main quest reads as three chapters, each closing on a moment the player remembers', () => {
  assert.equal(chapterCount, 3);
  assert.deepEqual(STORY_CHAPTERS.map(entry => entry.number), [1, 2, 3]);
  for (const entry of STORY_CHAPTERS) {
    assert.equal(storyChapter(entry.id), entry);
    assert.ok(entry.steps.length >= 3, `${entry.id} lists its steps`);
    assert.ok(chapterTitle(entry, {}).length > 5 && chapterGoal(entry, {}).length > 60, entry.id);
  }
  assert.equal(chapterTitle(STORY_CHAPTERS[0], {}), 'The Road to Luscia');
  assert.equal(chapterLabel(STORY_CHAPTERS[1], {}), 'Chapter 2 · Joining the War');
});

test('chapter one ends on reporting for duty at Lumber Town', () => {
  const fresh = chapterProgress({});
  assert.equal(fresh.number, 1);
  assert.equal(fresh.current.id, 'road-to-luscia');
  assert.deepEqual(fresh.list.map(entry => entry.state), ['current', 'later', 'later']);
  // Walking the road is not enough; the chapter turns on the report itself.
  assert.equal(chapterProgress({ questStage: 10, journey: { complete: true } }).number, 1);
  assert.equal(chapterProgress(reported).number, 2, 'reporting to Iven closes it');
  assert.deepEqual(chapterProgress(reported).list.map(entry => entry.state), ['done', 'current', 'later']);
});

test('chapter two runs from the report to your own side’s ground, and says whose', () => {
  assert.equal(chapterProgress(fought).number, 2, 'the battle alone does not close it');
  assert.equal(chapterProgress(settled).number, 3, 'the day after does');
  const empire = chapterProgress({ ...fought, side: 'empire' });
  assert.match(chapterGoal(empire.current, { side: 'empire' }), /outpost on the Moros/);
  assert.match(chapterGoal(empire.current, { side: 'coalition' }), /Solis/);
  assert.match(chapterGoal(empire.current, {}), /outpost on the Moros, or the walls of Solis/, 'before you choose, it names both');
});

test('chapter three is the side you chose: Ambron for the Empire, the Republic for Izol', () => {
  const empire = { ...settled, side: 'empire' }, republic = { ...settled, side: 'coalition' };
  assert.equal(chapterTitle(chapterProgress(empire).current, empire), 'The Kingdom of Ambron');
  assert.equal(chapterTitle(chapterProgress(republic).current, republic), 'The Republic of Izol');
  assert.match(chapterGoal(chapterProgress(empire).current, empire), /Ambron on the Lake Ela narrows/);
  // Izol keeps no capital (geography/regions/izol.md), so the Republic is a council, not a city.
  const republicGoal = chapterGoal(chapterProgress(republic).current, republic);
  assert.match(republicGoal, /Izolveth in West Izol/);
  assert.match(republicGoal, /keeps no capital/);
  // The ground beyond the day after is not built, so the story stops there for now.
  assert.equal(chapterProgress(settled).complete, false);
  assert.equal(chapterProgress(settled).current.number, 3);
});
