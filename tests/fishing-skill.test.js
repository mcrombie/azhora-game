import test from 'node:test';
import assert from 'node:assert/strict';
import { createSkills } from '../src/skills.js';
import { FISH_SPECIES, FISH_IDS, SPOT_WATERS, waterOf, fishOf, fishFor, createFishing, validateFishingSnapshot } from '../src/fishing-skill.js';

const fixture = () => { const skills = createSkills(); return { skills, fishing: createFishing({ skills }) }; };
const everything = (spot, steps = 500) => new Set(Array.from({ length: steps }, (_, i) => fishFor(waterOf(spot), i / steps).id));

test('every fish is a fish of this country, and knows which water it lives in', () => {
  assert.equal(FISH_IDS.length, 10);
  for (const id of FISH_IDS) {
    const species = FISH_SPECIES[id];
    assert.ok(species.xp >= 10 && species.xp <= 40, id);
    assert.ok(species.note.length > 40 && species.lore.length > 30, id);
    const waters = Object.entries(species.waters);
    assert.ok(waters.length >= 1 && waters.every(([water, weight]) => ['pond', 'river', 'cold-river'].includes(water) && weight > 0), id);
  }
  // Rarer fish are worth more: the sunfish a child catches is the cheapest lesson.
  assert.equal(Math.min(...FISH_IDS.map(id => FISH_SPECIES[id].xp)), FISH_SPECIES.sunfish.xp);
  assert.ok(FISH_SPECIES.rockfish.xp > FISH_SPECIES.bass.xp && FISH_SPECIES.trout.xp > FISH_SPECIES.perch.xp);
});

test('each water holds what it should: trout only in cold water, rockfish and shad only in rivers', () => {
  assert.deepEqual(Object.keys(SPOT_WATERS).sort(), ['reedwater', 'tessen-bank', 'willowmere']);
  assert.equal(waterOf('willowmere'), 'pond');
  assert.equal(waterOf('reedwater'), 'river');
  assert.equal(waterOf('tessen-bank'), 'cold-river');
  assert.equal(waterOf('a-puddle'), 'river', 'an unknown water fishes like a river');
  const pond = everything('willowmere'), river = everything('reedwater'), cold = everything('tessen-bank');
  assert.ok(!pond.has('trout') && !river.has('trout') && cold.has('trout'), 'trout are cold water only');
  assert.ok(!pond.has('shad') && !pond.has('rockfish'), 'the sea-run fish do not come up a farm pond');
  for (const water of [pond, river, cold]) assert.ok(water.has('sunfish') && water.has('bass'));
  // The common fish come up most often.
  assert.equal(fishOf('pond')[0].id, 'sunfish');
  assert.equal(fishOf('cold-river')[0].id, 'trout');
  assert.equal(fishFor('pond', 0).id, 'sunfish');
  assert.equal(fishFor('nowhere', .5), null);
});

test('a first fish of its kind teaches something; the second is supper', () => {
  const { skills, fishing } = fixture();
  assert.equal(fishing.taught, false);
  const first = fishing.land('willowmere', 0);
  assert.deepEqual([first.ok, first.first, first.species.id, first.xp], [true, true, 'sunfish', 10]);
  assert.equal(fishing.taught, true, 'landing one is lesson enough if nobody taught you');
  assert.equal(skills.known('fishing'), true);
  const again = fishing.land('willowmere', 0);
  assert.deepEqual([again.first, again.xp, again.count], [false, 0, 2]);
  assert.equal(fishing.hasCaught('sunfish'), true);
  assert.equal(fishing.hasCaught('trout'), false);
  // Landing every fish in the game is worth six levels: 200 experience.
  for (const id of FISH_IDS) { let roll = 0; while (!fishing.hasCaught(id) && roll < 1) { fishing.land(id === 'trout' ? 'tessen-bank' : 'reedwater', roll); roll += .01; } }
  assert.equal(fishing.caughtCount(), FISH_IDS.length);
  assert.equal(skills.level('fishing'), 6);
});

test('the rod and the notes are saved with the road, and nonsense is refused', () => {
  const { fishing } = fixture();
  fishing.learn(); fishing.land('willowmere', 0);
  const copy = createFishing();
  assert.equal(copy.restore(fishing.snapshot()), true);
  assert.deepEqual(copy.snapshot(), { version: 1, taught: true, caught: { sunfish: 1 } });
  assert.equal(validateFishingSnapshot(undefined), true, 'older saves have no fishing notes');
  for (const bad of [null, { version: 2, taught: true, caught: {} }, { version: 1, taught: 'yes', caught: {} },
    { version: 1, taught: true, caught: { kraken: 1 } }, { version: 1, taught: true, caught: { bass: 0 } }])
    assert.equal(validateFishingSnapshot(bad), false, JSON.stringify(bad));
  assert.equal(copy.restore({ version: 1, taught: true, caught: { kraken: 1 } }), false);
  assert.equal(copy.caughtCount(), 0, 'a refused restore leaves nothing landed');
});
