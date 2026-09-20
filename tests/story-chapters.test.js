import test from 'node:test';
import assert from 'node:assert/strict';
import { STORY_CHAPTERS, chapterCount, chapterProgress, chapterTitle, chapterGoal, chapterLabel, storyChapter } from '../src/story-chapters.js';

// `started` is the report to Iven itself; `briefed` is the Lauvel errand accepted after it.
const reported = { luscia: { started: true } };
const fought = { ...reported, border: { complete: true } };
const settled = { ...fought, aftermath: { complete: true } };
const home = { ...settled, home: true };

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
  // And it closes on the report, not one step into the next chapter: a traveler who has
  // reported and not yet taken the Lauvel errand is on Chapter 2, not still on Chapter 1.
  assert.equal(chapterProgress({ luscia: { started: true, briefed: false } }).number, 2,
    'the chapter turns on the report, not on accepting the next errand');
  assert.deepEqual(chapterProgress(reported).list.map(entry => entry.state), ['done', 'current', 'later']);
});

test('chapter two runs from the report to the place your side takes, and says which', () => {
  assert.equal(chapterProgress(fought).number, 2, 'the battle alone does not close it');
  assert.equal(chapterProgress(settled).number, 2, 'nor does the day after, until you stand on your side’s ground');
  assert.equal(chapterProgress({ ...settled, home: true }).number, 3, 'standing in it closes the chapter');
  const empire = chapterProgress({ ...fought, side: 'empire' });
  assert.match(chapterGoal(empire.current, { side: 'empire' }), /inside Solis, taken for the Empire/);
  assert.match(chapterGoal(empire.current, { side: 'coalition' }), /outpost on the Moros, taken for the Republic/);
  assert.match(chapterGoal(empire.current, {}), /Solis for the Empire, the army’s outpost on the Moros for the Republic/, 'before you choose, it names both');
});

test('chapter three is the side you chose: Ambron for the Empire, the Republic for Izol', () => {
  const empire = { ...home, side: 'empire' }, republic = { ...home, side: 'coalition' };
  assert.equal(chapterTitle(chapterProgress(empire).current, empire), 'The Kingdom of Ambron');
  assert.equal(chapterTitle(chapterProgress(republic).current, republic), 'The Republic of Izol');
  assert.match(chapterGoal(chapterProgress(empire).current, empire), /Ambron on the Lake Ela narrows/);
  // Izol keeps no capital (geography/regions/izol.md), so the Republic is a council, not a city.
  const republicGoal = chapterGoal(chapterProgress(republic).current, republic);
  assert.match(republicGoal, /Izolveth in West Izol/);
  assert.match(republicGoal, /keeps no capital/);
  // The ground beyond the day after is not built, so the story stops there for now.
  assert.equal(chapterProgress(home).complete, false);
  assert.equal(chapterProgress(home).current.number, 3);
});
