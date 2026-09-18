import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { createSkills } from '../src/skills.js';
import { ROCK_SPECIES, ROCK_IDS, ROCK_SETTINGS, GEOLOGIST, GEOLOGIST_STAND, GEOLOGY_LESSON, SPECIMEN_ITEM,
  rock, createGeology, validateGeologySnapshot, geologistConversation } from '../src/geology.js';

const fixture = () => { const skills = createSkills(); return { skills, geology: createGeology({ skills }) }; };
const satchel = () => { const bag = {}; return { bag, add: (id, n = 1) => { bag[id] = (bag[id] ?? 0) + n; return true; } }; };

let built = null;
async function coast() {
  built ??= (async () => {
    const { createWorld } = await sourceModule('../src/world.js');
    const stones = await sourceModule('../src/drent-stones.js');
    const world = createWorld(new THREE.Scene());
    return { world, ...stones, placed: stones.createDrentStones(new THREE.Scene(), world, { avoid: Object.values(world.npcPositions) }) };
  })();
  return built;
}

test('every stone is one of this coast’s, and says where it lies', () => {
  assert.equal(ROCK_IDS.length, 11);
  for (const id of ROCK_IDS) {
    const species = ROCK_SPECIES[id];
    assert.ok(species.xp >= 10 && species.xp <= 40, id);
    assert.ok(species.note.length > 60 && species.lore.length > 50, id);
    assert.ok(ROCK_SETTINGS.includes(species.setting), id);
    assert.equal(typeof species.keep, 'boolean', id);
  }
  assert.equal(rock('a-meteorite'), null);
  // The plain the country is drawn from, and the hard ground where its rivers fall.
  assert.equal(ROCK_SPECIES.granite.setting, 'fall-line');
  assert.equal(ROCK_SPECIES['shark-tooth'].setting, 'shore');
  assert.ok(ROCK_SPECIES.sandstone.lore.includes('Rena'), 'Rena was built of it');
  // The rarest find is worth the most.
  assert.equal(Math.max(...ROCK_IDS.map(id => ROCK_SPECIES[id].xp)), ROCK_SPECIES.arrowhead.xp);
});

test('nothing is named until Silas has named it, and specimens go in the satchel', () => {
  const { skills, geology } = fixture();
  const early = geology.find('quartz');
  assert.equal(early.ok, false);
  assert.ok(early.reason.includes('Silas Garrow'));
  geology.meet();
  assert.equal(skills.known('geology'), true);

  const bag = satchel();
  const tooth = geology.find('shark-tooth', bag);
  assert.deepEqual([tooth.first, tooth.xp, tooth.taken], [true, ROCK_SPECIES['shark-tooth'].xp, true]);
  assert.equal(bag.bag[SPECIMEN_ITEM], 1);
  const clay = geology.find('clay', bag);
  assert.equal(clay.taken, false, 'a field of clay does not go in a satchel');
  assert.equal(bag.bag[SPECIMEN_ITEM], 1);
  const again = geology.find('shark-tooth', bag);
  assert.deepEqual([again.first, again.xp, again.count], [false, 0, 2]);

  for (const id of ROCK_IDS) geology.find(id);
  assert.equal(geology.view().foundCount, ROCK_IDS.length);
  assert.ok(skills.level('geology') >= 6, `the whole coast is worth level ${skills.level('geology')}`);
});

test('stone notes survive the road, and a bad note is refused', () => {
  const { geology } = fixture();
  geology.meet(); geology.find('marl'); geology.find('marl');
  const saved = geology.snapshot();
  assert.equal(validateGeologySnapshot(saved), true);
  assert.equal(validateGeologySnapshot(undefined), true);
  for (const bad of [null, [], { version: 2, met: true, found: {} }, { version: 1, met: true, found: { diamond: 1 } },
    { version: 1, met: true, found: { marl: 0 } }]) assert.equal(validateGeologySnapshot(bad), false, JSON.stringify(bad));
  const other = createGeology({ skills: createSkills() });
  assert.equal(other.restore(saved), true);
  assert.deepEqual(other.found, { marl: 2 });
});

test('Silas teaches once and then talks about the country', () => {
  const { geology } = fixture();
  let opened = null, acted = null;
  const context = { geology, act: id => { acted = id; }, closeDialogue: () => {},
    openDialogue: (who, lines, _p, _d, options = {}) => { opened = { who, lines, ...options }; } };
  assert.equal(geologistConversation({ id: 'someone' }, context), false);
  geologistConversation({ id: GEOLOGIST.id }, context);
  opened.choices.find(choice => choice.id === 'learn-geology').action();
  assert.equal(acted, 'learn-geology');
  geology.meet();
  geologistConversation({ id: GEOLOGIST.id }, context);
  const ids = opened.choices.map(choice => choice.id);
  assert.ok(!ids.includes('learn-geology') && ids.includes('geology-country'));
  opened.choices.find(choice => choice.id === 'geology-country').action();
  assert.ok(opened.lines.join(' ').includes('Caloss'), 'he explains where the hard country begins');
  assert.ok(GEOLOGY_LESSON.length === 3 && GEOLOGY_LESSON.every(line => line.length > 80));
  assert.notEqual(GEOLOGIST.modelRole, 'traveler');
});

test('the stones lie where the country explains them, and Silas stands clear on the bank', async () => {
  const { world, placed, STONE_GROUNDS } = await coast();
  const state = placed.state();
  assert.equal(state.kinds, ROCK_IDS.length, 'every kind lies somewhere in Drent');
  for (const ground of STONE_GROUNDS) {
    const want = Object.values(ground.kinds).reduce((sum, n) => sum + n, 0);
    const got = state.sites.filter(site => site.ground === ground.id).length;
    assert.equal(got, want, `${ground.id} has ${got} of its ${want} finds`);
    assert.equal(world.regionAt(ground.x, ground.z)?.name, 'Drent', ground.id);
  }
  for (const site of state.sites) {
    assert.ok(canStand(site.x, site.z, world, .45), `${site.id} lies inside something`);
    // The hard rock only comes up where the river falls off it.
    if (ROCK_SPECIES[site.species].setting === 'fall-line') assert.equal(site.ground, 'caloss-riverbed', `${site.id} is in the wrong kind of place`);
  }
  for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
    assert.ok(canStand(GEOLOGIST_STAND.x + dx, GEOLOGIST_STAND.z + dz, world, .5), 'Silas has room to stand');
  }
});

test('a picked-up stone is gone, and stays gone across a save', async () => {
  const { placed } = await coast();
  const first = placed.state().sites.find(site => ROCK_SPECIES[site.species].keep);
  assert.equal(placed.nearest({ x: first.x, z: first.z }).id, first.id);
  assert.equal(placed.gather(first.id), true);
  assert.equal(placed.gather(first.id), false);
  assert.equal(placed.nearest({ x: first.x, z: first.z }, .2), null);
  placed.restoreGathered([]);
  assert.equal(placed.nearest({ x: first.x, z: first.z }, .2).id, first.id);
});
