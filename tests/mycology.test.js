import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { createSkills } from '../src/skills.js';
import { MUSHROOM_SPECIES, MUSHROOM_IDS, EDIBLE_IDS, MYCOLOGIST, MYCOLOGY_LESSON, mushroom,
  createMycology, validateMycologySnapshot, mycologistConversation } from '../src/mycology.js';

const fixture = () => { const skills = createSkills(); return { skills, mycology: createMycology({ skills }) }; };
const satchel = () => { const bag = []; return { bag, add: (id, n) => { bag.push([id, n]); return true; } }; };

let built = null;
async function woods() {
  built ??= (async () => {
    const { createWorld } = await sourceModule('../src/world.js');
    const { createMushrooms, MUSHROOM_PATCHES } = await sourceModule('../src/mushrooms.js');
    const world = createWorld(new THREE.Scene());
    return { world, MUSHROOM_PATCHES, mushrooms: createMushrooms(new THREE.Scene(), world, { avoid: Object.values(world.npcPositions) }) };
  })();
  return built;
}

test('every mushroom is one of this country’s, and says what it grows out of', () => {
  assert.equal(MUSHROOM_IDS.length, 11);
  for (const id of MUSHROOM_IDS) {
    const species = MUSHROOM_SPECIES[id];
    assert.ok(species.xp >= 10 && species.xp <= 40, id);
    assert.ok(species.note.length > 60 && species.lore.length > 40, id);
    assert.ok(['grass', 'log', 'stump', 'oak', 'floodplain', 'mossy'].includes(species.habitat), id);
    assert.equal(typeof species.edible, 'boolean', id);
  }
  assert.equal(mushroom('a-toadstool'), null);
  // The two that are worth knowing for the wrong reason are marked, and only those two.
  assert.deepEqual(MUSHROOM_IDS.filter(id => MUSHROOM_SPECIES[id].warning), ['jack-o-lantern', 'destroying-angel']);
  for (const id of ['jack-o-lantern', 'destroying-angel']) assert.equal(MUSHROOM_SPECIES[id].edible, false, `${id} is never supper`);
  assert.ok(!EDIBLE_IDS.includes('destroying-angel') && EDIBLE_IDS.includes('chanterelle'));
  // The pair people confuse must be told apart by the lesson: wood or ground.
  assert.equal(MUSHROOM_SPECIES['jack-o-lantern'].habitat, 'stump');
  assert.equal(MUSHROOM_SPECIES.chanterelle.habitat, 'oak');
  assert.ok(MUSHROOM_SPECIES.chanterelle.lore.toLowerCase().includes('wood'));
});

test('nothing is named until Pell has named it, and the first of each kind pays', () => {
  const { skills, mycology } = fixture();
  const early = mycology.find('chanterelle');
  assert.equal(early.ok, false);
  assert.ok(early.reason.includes('Odger Pell'));
  assert.equal(skills.known('mycology'), false);

  mycology.meet();
  assert.equal(skills.known('mycology'), true);
  assert.equal(mycology.meet().first, false, 'meeting him twice teaches nothing twice');

  const bag = satchel();
  const first = mycology.find('chanterelle', bag);
  assert.equal(first.first, true);
  assert.equal(first.xp, MUSHROOM_SPECIES.chanterelle.xp);
  assert.equal(first.taken, true);
  assert.deepEqual(bag.bag, [['mushrooms', 1]]);

  const again = mycology.find('chanterelle', bag);
  assert.equal(again.first, false);
  assert.equal(again.xp, 0, 'a second chanterelle teaches nothing');
  assert.equal(again.count, 2);
  assert.equal(again.taken, true, 'but it still goes in the satchel');
  assert.equal(mycology.find('a-toadstool').ok, false);
});

test('what will kill you is noted and left standing', () => {
  const { mycology } = fixture();
  mycology.meet();
  const bag = satchel();
  const angel = mycology.find('destroying-angel', bag);
  assert.equal(angel.ok, true);
  assert.equal(angel.taken, false, 'it stays where it is');
  assert.equal(angel.xp, MUSHROOM_SPECIES['destroying-angel'].xp, 'knowing it is worth as much as eating one');
  assert.deepEqual(bag.bag, [], 'nothing white with a skirt goes in the satchel');
  assert.equal(mycology.hasFound('destroying-angel'), true);
});

test('the skill levels on new kinds, and the sheet only names what has been found', () => {
  const { skills, mycology } = fixture();
  mycology.meet();
  const blank = mycology.view();
  assert.equal(blank.foundCount, 0);
  assert.equal(blank.total, MUSHROOM_IDS.length);
  assert.ok(blank.entries.every(entry => entry.name === 'A mushroom you have not named'));
  assert.ok(blank.entries.every(entry => entry.detail.startsWith('Grows on')), 'once taught, he tells you where to look');

  for (const id of MUSHROOM_IDS) mycology.find(id);
  const full = mycology.view();
  assert.equal(full.foundCount, MUSHROOM_IDS.length);
  assert.deepEqual(full.entries.map(entry => entry.name), MUSHROOM_IDS.map(id => MUSHROOM_SPECIES[id].name));
  const total = MUSHROOM_IDS.reduce((sum, id) => sum + MUSHROOM_SPECIES[id].xp, 0);
  assert.ok(skills.level('mycology') >= 4, `every mushroom in Drent is worth ${total} and should be worth several levels`);
});

test('mushroom notes survive the road, and a bad note is refused', () => {
  const { mycology } = fixture();
  mycology.meet();
  mycology.find('morel'); mycology.find('morel'); mycology.find('turkey-tail');
  const saved = mycology.snapshot();
  assert.equal(validateMycologySnapshot(saved), true);
  assert.equal(validateMycologySnapshot(undefined), true, 'an old save simply has not met him');
  assert.equal(validateMycologySnapshot(undefined, { allowMissing: false }), false);
  for (const bad of [null, [], { version: 99, met: true, found: {} }, { version: 1, met: 'yes', found: {} },
    { version: 1, met: true, found: { 'not-a-mushroom': 1 } }, { version: 1, met: true, found: { morel: 0 } },
    { version: 1, met: true, found: { morel: 1.5 } }]) assert.equal(validateMycologySnapshot(bad), false, JSON.stringify(bad));

  const other = createMycology({ skills: createSkills() });
  assert.equal(other.restore(saved), true);
  assert.equal(other.met, true);
  assert.deepEqual(other.found, { morel: 2, 'turkey-tail': 1 });
  assert.equal(other.restore({ version: 1, met: true, found: { morel: -1 } }), false);
  assert.equal(other.met, false, 'a refused note leaves nothing behind');
});

test('Odger Pell offers the lesson once and the wood after that', () => {
  const { mycology } = fixture();
  const npc = { id: MYCOLOGIST.id };
  let opened = null, acted = null, closed = 0;
  const context = { mycology, act: id => { acted = id; }, closeDialogue: () => { closed++; },
    openDialogue: (who, lines, _portrait, _dismiss, options = {}) => { opened = { who, lines, ...options }; } };

  assert.equal(mycologistConversation({ id: 'somebody-else' }, context), false);
  assert.equal(mycologistConversation(npc, context), true);
  assert.ok(opened.lines.join(' ').includes('Odger Pell'));
  const learn = opened.choices.find(choice => choice.id === 'learn-mycology');
  assert.ok(learn, 'a stranger is offered the lesson');
  learn.action();
  assert.equal(closed, 1);
  assert.equal(acted, 'learn-mycology');

  mycology.meet();
  mycologistConversation(npc, context);
  const ids = opened.choices.map(choice => choice.id);
  assert.ok(!ids.includes('learn-mycology'), 'he does not teach the same lesson twice');
  assert.deepEqual(ids, ['mycology-hints', 'mycology-danger', 'mycology-lesson', 'leave-mycologist'],
    'with nothing found there is nothing to talk over');
  opened.choices.find(choice => choice.id === 'mycology-danger').action();
  assert.ok(opened.lines.join(' ').includes('jack-o’-lantern'));
  opened.onComplete();

  mycology.find('morel');
  mycologistConversation(npc, context);
  const lore = opened.choices.find(choice => choice.id === 'mycology-lore');
  assert.ok(lore, 'once you have found one he will talk about it');
  lore.action();
  assert.deepEqual(opened.lines, [`Morel: ${MUSHROOM_SPECIES.morel.lore}`]);
  assert.ok(MYCOLOGY_LESSON.length === 3 && MYCOLOGY_LESSON.every(line => line.length > 80));
});

test('the mushrooms stand in Drent’s woods, off the road and out from under people', async () => {
  const { world, mushrooms, MUSHROOM_PATCHES } = await woods();
  const state = mushrooms.state();
  assert.ok(state.sites.length >= 25, `Drent grew only ${state.sites.length} mushrooms`);
  assert.ok(state.kinds >= 9, 'nearly every kind should have found somewhere to grow');
  const kinds = new Set(state.sites.map(site => site.species));
  for (const id of ['chanterelle', 'jack-o-lantern', 'destroying-angel', 'morel']) assert.ok(kinds.has(id), `${id} grows nowhere`);
  for (const site of state.sites) {
    assert.ok(Object.hasOwn(MUSHROOM_PATCHES, site.species), site.species);
    assert.ok(canStand(site.x, site.z, world, .5), `${site.id} is inside something at ${site.x.toFixed(1)},${site.z.toFixed(1)}`);
    for (const stand of Object.values(world.npcPositions)) {
      assert.ok(Math.hypot(stand.x - site.x, stand.z - site.z) > 3, `${site.id} grows under somebody's feet`);
    }
  }
  // Wood-growing kinds got a fallen log to grow out of.
  assert.ok(state.logs >= 5, `only ${state.logs} logs for the kinds that need dead wood`);
});

test('a gathered mushroom is gone, and stays gone across a save', async () => {
  const { mushrooms } = await woods();
  const first = mushrooms.state().sites[0];
  const here = { x: first.x, z: first.z };
  assert.equal(mushrooms.nearest(here, 2.2).id, first.id);
  assert.equal(mushrooms.nearest({ x: first.x + 40, z: first.z + 40 }, 2.2), null);

  assert.equal(mushrooms.gather(first.id), true);
  assert.equal(mushrooms.gather(first.id), false, 'you cannot pick it twice');
  assert.equal(mushrooms.gather('no-such-site'), false);
  assert.equal(mushrooms.nearest(here, 2.2), null, 'the gap in the leaf litter stays a gap');

  // The two that are left standing are noted, not taken.
  const angel = mushrooms.state().sites.find(site => site.species === 'destroying-angel');
  assert.equal(mushrooms.gather(angel.id, { take: false }), true);
  assert.equal(mushrooms.nearest({ x: angel.x, z: angel.z }, 2.2).id, angel.id, 'it is still there to look at again');

  mushrooms.restoreGathered([]);
  assert.equal(mushrooms.nearest(here, 2.2).id, first.id);
  mushrooms.restoreGathered([first.id]);
  assert.equal(mushrooms.state().sites.filter(site => site.gathered).map(site => site.id).join(), first.id);
});
