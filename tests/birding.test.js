import test from 'node:test';
import assert from 'node:assert/strict';
import { createInventoryState, INVENTORY_ITEMS } from '../src/inventory.js';
import { createSkills } from '../src/skills.js';
import {
  BIRD_SPECIES, DRENT_BIRDS, BIRD_GROUPS, BIRD_WATCHER, GARDEN_KEEPER, GARDEN_BIRDS, FEEDER_ITEM, FILLED_FEEDER_ITEM, BIRDING_LESSON,
  createBirding, observeRange, validateBirdingSnapshot, gardenKeeperConversation, lysaFeederChoice,
} from '../src/birding.js';

function fixture() {
  const skills = createSkills(), birding = createBirding({ skills }), inventory = createInventoryState();
  return { skills, birding, inventory };
}

test('Drent has the country’s common birds, each worth experience the first time', () => {
  // The four Lakota starts anyone on come first, and the hummingbird is last
  // because it has to be earned.
  assert.equal(DRENT_BIRDS.length, 25);
  assert.deepEqual(DRENT_BIRDS.slice(0, 5), ['cardinal', 'wren', 'titmouse', 'crow', 'hummingbird']);
  for (const id of DRENT_BIRDS) assert.ok(BIRD_GROUPS.includes(BIRD_SPECIES[id].group), `${id} says where it is looked for`);
  assert.equal(DRENT_BIRDS.filter(id => BIRD_SPECIES[id].group === 'garden').join(), 'hummingbird');
  for (const id of DRENT_BIRDS) {
    const bird = BIRD_SPECIES[id];
    assert.ok(bird.xp > 0 && bird.spook > 0 && bird.note && bird.hint && bird.lore, id);
  }
  assert.ok(BIRD_SPECIES.crow.spook > BIRD_SPECIES.cardinal.spook && BIRD_SPECIES.hummingbird.spook < BIRD_SPECIES.wren.spook, 'crows are warier than songbirds; hummingbirds hardly care');
  const { skills, birding } = fixture();
  assert.equal(birding.meet().first, true);
  assert.equal(skills.level('birding'), 1);
  const first = birding.observe('cardinal');
  assert.deepEqual([first.first, first.xp, first.count, first.levelled], [true, 15, 1, false]);
  const again = birding.observe('cardinal');
  assert.deepEqual([again.first, again.xp, again.count], [false, 0, 2]);
  assert.equal(birding.observe('a-pterodactyl').ok, false);
  const levels = ['wren', 'titmouse', 'crow', 'hummingbird'].map(id => birding.observe(id));
  assert.equal(levels.filter(result => result.levelled).length, 1, 'level 2, at 83, on the way');
  assert.deepEqual([skills.level('birding'), skills.view()[0].xp, birding.seenCount()], [2, 90, 5]);
  // Every bird in the country is worth five levels of ninety-nine. The rest of the table waits on the rest of the world.
  for (const id of DRENT_BIRDS) birding.observe(id);
  assert.deepEqual([skills.view()[0].xp, skills.level('birding')], [478, 5], 'the whole list of Drent is 478 experience');
});

test('the observation range grows with practice and has a limit', () => {
  assert.equal(observeRange(1), 18);
  assert.equal(observeRange(4), 24);
  // Seven is the widest it gets, and on RuneScape's table that is 650 experience: more birds than Drent holds.
  assert.equal(observeRange(7), 30);
  assert.equal(observeRange(99), 30);
  // The wariest bird in the country still lets you look at it from inside your range.
  assert.ok(observeRange(1) > Math.max(...DRENT_BIRDS.map(id => BIRD_SPECIES[id].spook)) + 3, 'a bird can be seen well outside its distance');
});

test('the feeder errand: Lakota lends it, Lysa fills it, the traveler hangs it, and the hummingbird ends it', () => {
  const { birding, inventory } = fixture();
  for (const id of [FEEDER_ITEM, FILLED_FEEDER_ITEM]) assert.ok(INVENTORY_ITEMS[id], `${id} is a satchel item`);
  assert.equal(birding.lendFeeder(inventory).ok, false, 'not before meeting Lakota');
  birding.meet();
  assert.equal(birding.task(), null);
  assert.equal(birding.fillFeeder(inventory).ok, false);
  assert.equal(birding.lendFeeder(inventory).ok, true);
  assert.equal(birding.lendFeeder(inventory).ok, false, 'lent once');
  assert.deepEqual([inventory.has(FEEDER_ITEM), birding.task().target], [true, 'acorn-cook']);
  assert.equal(birding.hangFeeder(inventory).ok, false, 'an empty feeder is not hung');
  assert.equal(birding.fillFeeder(inventory).ok, true);
  assert.deepEqual([inventory.has(FEEDER_ITEM), inventory.has(FILLED_FEEDER_ITEM), birding.task().stage], [false, true, 'filled']);
  assert.equal(birding.hangFeeder(inventory).ok, true);
  assert.deepEqual([inventory.has(FILLED_FEEDER_ITEM), birding.feeder, birding.task().stage], [false, 'hung', 'hung']);
  birding.observe('hummingbird');
  assert.equal(birding.task(), null, 'seeing the hummingbird finishes the errand');
});

test('filling the feeder is atomic: a full satchel keeps the empty one', () => {
  const { birding } = fixture();
  let held = new Set();
  const inventory = { has: id => held.has(id), add: id => id === FEEDER_ITEM ? (held.add(id), true) : false, remove: id => held.delete(id) };
  birding.meet(); birding.lendFeeder(inventory);
  const result = birding.fillFeeder(inventory);
  assert.equal(result.ok, false);
  assert.deepEqual([held.has(FEEDER_ITEM), birding.feeder], [true, 'lent']);
});

test('birding survives a save, and nonsense is refused', () => {
  const { birding, inventory } = fixture();
  birding.meet(); birding.observe('crow'); birding.observe('crow'); birding.lendFeeder(inventory);
  const copy = createBirding();
  assert.equal(copy.restore(birding.snapshot()), true);
  assert.deepEqual(copy.snapshot(), { version: 1, met: true, seen: { crow: 2 }, feeder: 'lent' });
  assert.equal(validateBirdingSnapshot(undefined), true, 'older saves have no birds');
  for (const bad of [null, { version: 1, met: 'yes', seen: {}, feeder: 'none' }, { version: 1, met: true, seen: { 'a-pterodactyl': 1 }, feeder: 'none' },
    { version: 1, met: true, seen: { crow: 0 }, feeder: 'none' }, { version: 1, met: true, seen: {}, feeder: 'broken' }, { version: 2, met: true, seen: {}, feeder: 'none' }])
    assert.equal(validateBirdingSnapshot(bad), false, JSON.stringify(bad));
});

test('Perrin teaches birding first, then offers the feeder; Lysa fills it only while it is carried empty', () => {
  const { birding, inventory } = fixture(), opened = [], acted = [];
  const context = { birding, openDialogue: (npc, lines, _, __, options) => opened.push({ lines, choices: options?.choices ?? [] }), closeDialogue: () => {}, act: id => acted.push(id) };
  assert.equal(gardenKeeperConversation({ id: 'someone-else' }, context), false);
  assert.equal(gardenKeeperConversation(BIRD_WATCHER, context), false, 'Lakota is not the man in the garden any more');
  gardenKeeperConversation(GARDEN_KEEPER, context);
  assert.deepEqual(opened.at(-1).choices.map(c => c.id), ['learn-birding', 'leave-garden-keeper']);
  // The lesson is available from the first minute of the game, which is the whole point of Perrin.
  opened.at(-1).choices[0].action();
  assert.deepEqual(acted, ['learn-birding']);
  birding.meet();
  gardenKeeperConversation(GARDEN_KEEPER, context);
  const ids = opened.at(-1).choices.map(c => c.id);
  assert.ok(ids.includes('ask-hummingbirds') && ids.includes('birding-hints') && !ids.includes('birding-lore'), ids.join());
  opened.at(-1).choices.find(c => c.id === 'ask-hummingbirds').action();
  opened.at(-1).choices.find(c => c.id === 'take-feeder').action();
  assert.deepEqual(acted, ['learn-birding', 'take-feeder']);
  assert.ok(BIRDING_LESSON.some(line => line.includes('press B')));

  const lysa = { id: 'acorn-cook' };
  const lysaContext = { birding, inventory, openDialogue: context.openDialogue, back: () => {}, act: id => (acted.push(id), birding.fillFeeder(inventory)) };
  assert.equal(lysaFeederChoice(lysa, lysaContext), null);
  birding.lendFeeder(inventory);
  const choice = lysaFeederChoice(lysa, lysaContext);
  assert.equal(choice.id, 'fill-feeder');
  choice.action();
  assert.deepEqual([acted.at(-1), birding.feeder, lysaFeederChoice(lysa, lysaContext)], ['fill-feeder', 'filled', null]);
  // He talks about his own garden's birds, not the whole country's: a crow is neither.
  birding.observe('crow');
  gardenKeeperConversation(GARDEN_KEEPER, context);
  assert.ok(!opened.at(-1).choices.some(c => c.id === 'birding-lore'), 'a crow is not a garden bird');
  birding.observe('catbird');
  gardenKeeperConversation(GARDEN_KEEPER, context);
  assert.ok(opened.at(-1).choices.some(c => c.id === 'birding-lore'));
  assert.match(opened.at(-1).lines[0], /hook/);
});

test('the garden\u2019s own birds are the ones that actually come to it', () => {
  // Measured against BIRD_HABITATS in src/drent-birds.js: nothing else in the village comes within
  // fourteen metres of the garden, and the hummingbird is counted apart because it wants the feeder.
  assert.deepEqual([...GARDEN_BIRDS], ['chickadee', 'catbird', 'wren']);
  for (const id of GARDEN_BIRDS) assert.ok(DRENT_BIRDS.includes(id), id);
  assert.ok(!GARDEN_BIRDS.includes('hummingbird'), 'the fourth is the one you have to earn');
  const { birding } = fixture();
  birding.meet();
  const opened = [];
  const context = { birding, openDialogue: (npc, lines, _, __, options) => opened.push({ lines, choices: options?.choices ?? [] }), closeDialogue() {}, act() {} };
  gardenKeeperConversation(GARDEN_KEEPER, context);
  assert.match(opened.at(-1).lines[0], /Anything yet/);
  for (const id of GARDEN_BIRDS) birding.observe(id);
  gardenKeeperConversation(GARDEN_KEEPER, context);
  assert.match(opened.at(-1).lines[0], /All three of the garden ones/);
});
