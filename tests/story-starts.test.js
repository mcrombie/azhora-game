import test from 'node:test';
import assert from 'node:assert/strict';
import { STORY_STARTS, newestStart, storyStart } from '../src/story-starts.js';
import { CHAPTERS, createCampaign } from '../src/campaign.js';
import { LEGION_POST_IDS } from '../src/legion-posts.js';

test('the opening screen can start at the newest built chapter, with the right road behind it', () => {
  const newest = newestStart();
  assert.ok(newest, 'there is a newest chapter to start at');
  assert.equal(STORY_STARTS.filter(entry => entry.newest).length, 1, 'exactly one is the newest');
  for (const entry of STORY_STARTS) {
    assert.equal(storyStart(entry.id), entry);
    assert.ok(entry.title.length > 5 && entry.blurb.length > 40 && entry.kicker === entry.kicker.toUpperCase(), entry.id);
    assert.ok(Object.hasOwn(CHAPTERS, entry.chapter), `${entry.id} names a real chapter`);
    assert.ok(LEGION_POST_IDS.has(entry.beside), `${entry.id} starts beside someone the world places`);
    assert.ok(entry.purse > 0 && typeof entry.horse === 'boolean');
    // Finishing the chapters it lists must actually lead to the chapter it starts.
    const campaign = createCampaign();
    for (const id of entry.completed) {
      assert.ok(Object.hasOwn(CHAPTERS, id), `${entry.id} lists the real chapter ${id}`);
      assert.equal(campaign.completeChapter(id).ok, true, `${id} completes in order`);
    }
    assert.equal(campaign.view().chapterId, entry.chapter, `${entry.id} lands on ${entry.chapter}`);
    assert.deepEqual(campaign.snapshot().completed, [...entry.completed]);
  }
});
