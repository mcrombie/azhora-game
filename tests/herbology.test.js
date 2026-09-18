import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { createSkills } from '../src/skills.js';
import { PLANT_SPECIES, PLANT_IDS, HERBALIST, HERBALIST_STAND, HERBOLOGY_LESSON, HERB_ITEM, TUCKAHOE_ITEM, LEAF_ITEM, JIMSON_ITEM,
  plant, createHerbology, validateHerbologySnapshot, herbalistConversation } from '../src/herbology.js';
import { PIPE_SMOKER, PIPE_ITEM, PIPE_HEAL, WEATHERHEAD, createPipe, validatePipeSnapshot, pipeSmokerConversation } from '../src/pipeweed.js';
import { TOFT, JIMSON_PODS_WANTED, JIMSON_NIGHT_DELAY, createJimson, validateJimsonSnapshot, toftConversation } from '../src/jimson-quest.js';

const fixture = () => { const skills = createSkills(); return { skills, herbology: createHerbology({ skills }) }; };
const satchel = (start = {}) => {
  const bag = { ...start };
  return { bag,
    add: (id, n = 1) => { bag[id] = (bag[id] ?? 0) + n; return true; },
    grant: id => { if (bag[id]) return false; bag[id] = 1; return true; },
    has: id => !!bag[id], count: id => bag[id] ?? 0,
    remove: (id, n = 1) => { if ((bag[id] ?? 0) < n) return false; bag[id] -= n; return true; } };
};

let built = null;
async function country() {
  built ??= (async () => {
    const { createWorld } = await sourceModule('../src/world.js');
    const { createDrentFlora, AUTHORED_STANDS, PLANT_PATCHES } = await sourceModule('../src/drent-flora.js');
    const world = createWorld(new THREE.Scene());
    return { world, AUTHORED_STANDS, PLANT_PATCHES, flora: createDrentFlora(new THREE.Scene(), world, { avoid: Object.values(world.npcPositions) }) };
  })();
  return built;
}

test('every plant is one of this country’s, and says where it stands and what it is for', () => {
  assert.equal(PLANT_IDS.length, 19);
  for (const id of PLANT_IDS) {
    const species = PLANT_SPECIES[id];
    assert.ok(species.xp >= 10 && species.xp <= 40, id);
    assert.ok(species.note.length > 60 && species.lore.length > 40, id);
    assert.ok(['verge', 'wood', 'damp', 'clearing', 'river', 'field', 'waste'].includes(species.habitat), id);
    assert.ok(['wound', 'remedy', 'food', 'craft', 'trade', 'warning'].includes(species.use), id);
  }
  assert.equal(plant('a-weed'), null);
  // The three the user asked for by name are here, and in the right country.
  assert.equal(PLANT_SPECIES.tuckahoe.habitat, 'river');
  assert.equal(PLANT_SPECIES.tobacco.habitat, 'field');
  assert.equal(PLANT_SPECIES['jimson-weed'].habitat, 'waste');
  assert.equal(PLANT_SPECIES['jimson-weed'].item, JIMSON_ITEM);
  assert.equal(PLANT_SPECIES.tobacco.item, LEAF_ITEM);
  assert.equal(PLANT_SPECIES.tuckahoe.item, TUCKAHOE_ITEM);
  // Four warnings, and only the three that stay in the ground refuse the satchel.
  const warned = PLANT_IDS.filter(id => PLANT_SPECIES[id].warning);
  assert.deepEqual(warned, ['bloodroot', 'mayapple', 'pokeweed', 'tuckahoe', 'jimson-weed']);
});

test('nothing is named until Nell has named it, and the first of each kind pays', () => {
  const { skills, herbology } = fixture();
  const early = herbology.find('yarrow');
  assert.equal(early.ok, false);
  assert.ok(early.reason.includes('Nell Harrow'));
  assert.equal(skills.known('herbology'), false);

  herbology.meet();
  assert.equal(skills.known('herbology'), true);
  assert.equal(herbology.meet().first, false);

  const bag = satchel();
  const first = herbology.find('yarrow', bag);
  assert.equal(first.first, true);
  assert.equal(first.xp, PLANT_SPECIES.yarrow.xp);
  assert.equal(first.taken, true);
  assert.equal(bag.count(HERB_ITEM), 1);

  const again = herbology.find('yarrow', bag);
  assert.equal(again.first, false);
  assert.equal(again.xp, 0);
  assert.equal(again.count, 2);
  assert.equal(bag.count(HERB_ITEM), 2, 'a second yarrow is still worth carrying');
});

test('what is poison is named and left standing; what is worth carrying goes to its own item', () => {
  const { herbology } = fixture();
  herbology.meet();
  const bag = satchel();
  for (const id of ['bloodroot', 'mayapple', 'pokeweed']) {
    const found = herbology.find(id, bag);
    assert.equal(found.ok, true, id);
    assert.equal(found.taken, false, `${id} should stay where it is`);
    assert.equal(found.xp, PLANT_SPECIES[id].xp, `knowing ${id} is worth as much as eating one`);
  }
  assert.equal(bag.count(HERB_ITEM), 0, 'none of the three went in the satchel');

  herbology.find('tuckahoe', bag);
  herbology.find('tobacco', bag);
  const pods = herbology.find('jimson-weed', bag);
  assert.equal(bag.count(TUCKAHOE_ITEM), 1);
  assert.equal(bag.count(LEAF_ITEM), 1);
  assert.equal(bag.count(JIMSON_ITEM), JIMSON_PODS_WANTED, 'one jimson plant carries the three pods Toft wants');
  assert.equal(pods.amount, JIMSON_PODS_WANTED);
});

test('the sheet only names what has been found, and every plant in Drent is worth several levels', () => {
  const { skills, herbology } = fixture();
  herbology.meet();
  const blank = herbology.view();
  assert.equal(blank.foundCount, 0);
  assert.equal(blank.total, PLANT_IDS.length);
  assert.ok(blank.entries.every(entry => entry.name === 'A plant you have not named'));
  assert.ok(blank.entries.every(entry => entry.detail.startsWith('Grows on')), 'once taught, she tells you where to look');
  for (const id of PLANT_IDS) herbology.find(id);
  const full = herbology.view();
  assert.equal(full.foundCount, PLANT_IDS.length);
  assert.ok(skills.level('herbology') >= 7, 'the whole country should be worth most of the table');
});

test('plant notes survive the road, and a bad note is refused', () => {
  const { herbology } = fixture();
  herbology.meet();
  herbology.find('elder'); herbology.find('elder'); herbology.find('sumac');
  herbology.askAboutJimson();
  const saved = herbology.snapshot();
  assert.equal(validateHerbologySnapshot(saved), true);
  assert.equal(validateHerbologySnapshot(undefined), true);
  assert.equal(validateHerbologySnapshot(undefined, { allowMissing: false }), false);
  for (const bad of [null, [], { version: 9, met: true, found: {} }, { version: 1, met: 1, found: {} },
    { version: 1, met: true, found: { 'not-a-plant': 1 } }, { version: 1, met: true, found: { elder: 0 } },
    { version: 1, met: true, found: {}, askedAboutJimson: 'yes' }]) assert.equal(validateHerbologySnapshot(bad), false, JSON.stringify(bad));
  const other = createHerbology({ skills: createSkills() });
  assert.equal(other.restore(saved), true);
  assert.deepEqual(other.found, { elder: 2, sumac: 1 });
  assert.equal(other.askedAboutJimson, true);
  assert.equal(other.restore({ version: 1, met: true, found: { elder: -2 } }), false);
  assert.equal(other.met, false);
});

test('Nell teaches once, and will only talk about the thing behind her shed when asked', () => {
  const { herbology } = fixture();
  const jimson = createJimson();
  const npc = { id: HERBALIST.id };
  let opened = null, acted = null, closed = 0;
  const context = { herbology, jimson, act: id => { acted = id; }, closeDialogue: () => { closed++; },
    openDialogue: (who, lines, _p, _d, options = {}) => { opened = { who, lines, ...options }; } };

  assert.equal(herbalistConversation({ id: 'somebody-else' }, context), false);
  assert.equal(herbalistConversation(npc, context), true);
  opened.choices.find(choice => choice.id === 'learn-herbology').action();
  assert.equal(closed, 1);
  assert.equal(acted, 'learn-herbology');

  herbology.meet();
  herbalistConversation(npc, context);
  let ids = opened.choices.map(choice => choice.id);
  assert.ok(!ids.includes('learn-herbology'));
  assert.ok(ids.includes('herbology-jimson'), 'the plant behind the shed can be asked about straight away');
  opened.choices.find(choice => choice.id === 'herbology-jimson').action();
  assert.ok(opened.lines.join(' ').includes('jimson weed'));
  assert.equal(herbology.askedAboutJimson, true);
  assert.equal(jimson.heardFromNell, true, 'asking her is what unlocks her plant');
  opened.onComplete();

  herbalistConversation(npc, context);
  ids = opened.choices.map(choice => choice.id);
  assert.ok(!ids.includes('herbology-jimson'), 'she does not explain it twice');
  assert.ok(ids.includes('herbology-danger') && ids.includes('herbology-lesson'));
  assert.ok(HERBOLOGY_LESSON.length === 3 && HERBOLOGY_LESSON.every(line => line.length > 80));
});

test('Cabe’s pipe needs the lesson, the pipe and the leaf', () => {
  const pipe = createPipe();
  const bag = satchel({ 'pipe-weed': 1 });
  const early = pipe.smoke(bag);
  assert.equal(early.ok, false);
  assert.ok(early.reason.includes('Weatherhead'));

  const learned = pipe.learn(bag);
  assert.equal(learned.first, true);
  assert.equal(learned.gotPipe, true);
  assert.equal(bag.count(PIPE_ITEM), 1);
  assert.equal(bag.count('pipe-weed'), 3, 'he gives you a twist of his own with it');

  const smoked = pipe.smoke(bag);
  assert.equal(smoked.ok, true);
  assert.equal(smoked.heal, PIPE_HEAL);
  assert.equal(bag.count('pipe-weed'), 2);
  assert.ok(smoked.line.includes('cough'), 'the first bowl goes badly');
  assert.ok(pipe.smoke(bag).line !== smoked.line, 'the second does not');

  const noPipe = createPipe(); noPipe.learn(satchel());
  const empty = satchel({ 'pipe-weed': 1 });
  assert.equal(noPipe.smoke(empty).ok, false, 'no pipe, no bowl');
  const none = satchel({ pipe: 1 });
  assert.equal(noPipe.smoke(none).ok, false, 'no leaf, no bowl');

  const saved = pipe.snapshot();
  assert.equal(validatePipeSnapshot(saved), true);
  assert.equal(validatePipeSnapshot({ version: 1, taught: true, bowls: -1 }), false);
  const other = createPipe();
  assert.equal(other.restore(saved), true);
  assert.equal(other.bowls, 2);
});

test('Cabe sits on the Weatherhead, on standable ground above the water', async () => {
  const { world } = await country();
  const stand = WEATHERHEAD.stand;
  assert.equal(world.regionAt(stand.x, stand.z)?.name, 'Drent');
  for (let dx = -2; dx <= 2; dx += 1) for (let dz = -2; dz <= 2; dz += 1) {
    assert.ok(canStand(stand.x + dx, stand.z + dz, world, .5), `the head is blocked at ${stand.x + dx},${stand.z + dz}`);
  }
  // It is a head: the ground under him stands above the sea a short way east.
  assert.ok(world.heightAt(stand.x, stand.z) > 3.5, 'the Weatherhead should be the high ground on this shore');
  assert.ok(world.heightAt(stand.x + 22, stand.z) < 0, 'and the water should be a short walk east of it');
  assert.equal(PIPE_SMOKER.modelRole, 'reed-worker');
});

test('Toft’s errand: three pods, one of three plants, and a night he does not discuss', () => {
  const jimson = createJimson();
  const bag = satchel();
  assert.equal(jimson.stage, 'unasked');
  assert.equal(jimson.turnIn(bag), false, 'nothing to turn in before he has asked');
  assert.equal(jimson.accept(), true);
  assert.equal(jimson.accept(), false);

  // Nell's plant is hers until she has explained it; the wild ones are anybody's.
  assert.equal(jimson.canPick('jimson-nell'), false);
  assert.equal(jimson.canPick('jimson-drent'), true);
  assert.equal(jimson.canPick('jimson-pueth'), true);
  assert.equal(jimson.canPick(null), true, 'an ordinary plant needs nobody’s permission');
  jimson.askedNell();
  assert.equal(jimson.canPick('jimson-nell'), true);

  bag.add(JIMSON_ITEM, JIMSON_PODS_WANTED - 1);
  assert.equal(jimson.turnIn(bag), false, 'two pods is not three');
  bag.add(JIMSON_ITEM, 1);
  assert.equal(jimson.turnIn(bag), true);
  assert.equal(bag.count(JIMSON_ITEM), 0);
  assert.equal(bag.count(LEAF_ITEM), 3, 'he pays in the only currency he has');
  assert.equal(jimson.stage, 'delivered');

  assert.equal(jimson.tick(JIMSON_NIGHT_DELAY - 10), false);
  assert.equal(jimson.tick(20), true, 'the village finds out');
  assert.equal(jimson.stage, 'night');
  assert.equal(jimson.tick(600), false, 'and only finds out once');
  assert.equal(jimson.settle(), true);
  assert.equal(jimson.settle(), false);

  const saved = jimson.snapshot();
  assert.equal(validateJimsonSnapshot(saved), true);
  assert.equal(validateJimsonSnapshot({ version: 1, stage: 'drunk', heardFromNell: false, since: 0 }), false);
  const other = createJimson();
  assert.equal(other.restore(saved), true);
  assert.equal(other.stage, 'settled');
});

test('Toft asks, takes and confesses, and never offers the errand twice', () => {
  const jimson = createJimson();
  const bag = satchel();
  const npc = { id: TOFT.id };
  let opened = null, acted = null;
  const context = { jimson, inventory: bag, act: id => { acted = id; }, closeDialogue: () => {},
    openDialogue: (who, lines, _p, _d, options = {}) => { opened = { who, lines, ...options }; } };

  assert.equal(toftConversation({ id: 'nell' }, context), false);
  toftConversation(npc, context);
  assert.ok(opened.lines.join(' ').includes('Jimson weed'));
  opened.choices.find(choice => choice.id === 'accept-jimson').action();
  assert.equal(acted, 'accept-jimson');

  jimson.accept();
  toftConversation(npc, context);
  assert.ok(!opened.choices.some(choice => choice.id === 'give-jimson'), 'nothing to give yet');
  bag.add(JIMSON_ITEM, JIMSON_PODS_WANTED);
  toftConversation(npc, context);
  assert.ok(opened.choices.some(choice => choice.id === 'give-jimson'));

  jimson.turnIn(bag);
  toftConversation(npc, context);
  assert.equal(opened.choices, undefined, 'he wants you gone');
  jimson.tick(JIMSON_NIGHT_DELAY);
  toftConversation(npc, context);
  assert.ok(opened.lines.join(' ').includes('mooring post'));
  // The user asked for this hook and nothing more: Pueth's own errand is not built.
  assert.ok(opened.lines.join(' ').includes('Pueth'), 'he points at the errand that comes later');
  opened.choices.find(choice => choice.id === 'settle-jimson').action();
  assert.equal(acted, 'settle-jimson');
});

test('Drent’s plants stand where they should, off the road and out from under people', async () => {
  const { world, flora, PLANT_PATCHES } = await country();
  const state = flora.state();
  assert.ok(state.sites.length >= 40, `Drent grew only ${state.sites.length} plants`);
  assert.ok(state.kinds >= 14, 'nearly every kind should have found somewhere to grow');
  const kinds = new Set(state.sites.map(site => site.species));
  for (const id of ['yarrow', 'plantain', 'sassafras', 'pokeweed', 'tuckahoe', 'tobacco', 'jimson-weed']) {
    assert.ok(kinds.has(id), `${id} grows nowhere`);
  }
  for (const site of state.sites) {
    assert.ok(Object.hasOwn(PLANT_SPECIES, site.species), site.species);
    // The river plants stand in mud nobody can walk into; everything else must be reachable.
    if (PLANT_SPECIES[site.species].habitat !== 'river') {
      assert.ok(canStand(site.x, site.z, world, .5), `${site.id} is inside something at ${site.x.toFixed(1)},${site.z.toFixed(1)}`);
    }
    for (const stand of Object.values(world.npcPositions)) {
      assert.ok(Math.hypot(stand.x - site.x, stand.z - site.z) > 2.6, `${site.id} grows under somebody's feet`);
    }
    if (PLANT_PATCHES[site.species]) assert.ok(site.stand === null, `${site.id} should be scattered, not an authored stand`);
  }
});

test('the three jimson weeds are where the user put them, and the tuckahoe is at the river', async () => {
  const { world, flora } = await country();
  const sites = flora.state().sites;
  const jimsons = sites.filter(site => site.species === 'jimson-weed');
  assert.deepEqual(jimsons.map(site => site.stand).sort(), ['jimson-drent', 'jimson-nell', 'jimson-pueth']);
  const nell = jimsons.find(site => site.stand === 'jimson-nell');
  const nellStand = HERBALIST_STAND;
  assert.ok(Math.hypot(nell.x - nellStand.x, nell.z - nellStand.z) < 12, 'hers grows behind her shed, where it can be noticed early');
  const pueth = jimsons.find(site => site.stand === 'jimson-pueth');
  assert.equal(world.regionAt(pueth.x, pueth.z)?.name, 'Pueth');
  const drent = jimsons.find(site => site.stand === 'jimson-drent');
  assert.equal(world.regionAt(drent.x, drent.z)?.name, 'Drent');
  assert.ok(Math.hypot(drent.x - nellStand.x, drent.z - nellStand.z) > 100, 'the wild one is a walk away');

  // The tuckahoe stands in southern Drent, where the road runs down to Luscia.
  const tuckahoe = sites.filter(site => site.species === 'tuckahoe');
  assert.ok(tuckahoe.length >= 4, `only ${tuckahoe.length} tuckahoe`);
  for (const site of tuckahoe) {
    assert.equal(world.regionAt(site.x, site.z)?.name, 'Drent');
    assert.ok(site.z > 140, 'the tuckahoe belongs at the river in southern Drent');
  }
  const tobacco = sites.filter(site => site.species === 'tobacco');
  assert.ok(tobacco.length >= 6, `only ${tobacco.length} tobacco plants — the field should be a field`);
});

test('a gathered plant is gone, and stays gone across a save', async () => {
  const { flora } = await country();
  const first = flora.state().sites.find(site => PLANT_SPECIES[site.species].use !== 'warning');
  const here = { x: first.x, z: first.z };
  assert.equal(flora.nearest(here, 2.2).id, first.id);
  assert.equal(flora.nearest({ x: first.x + 60, z: first.z + 60 }, 2.2), null);
  assert.equal(flora.gather(first.id), true);
  assert.equal(flora.gather(first.id), false);
  assert.equal(flora.gather('no-such-site'), false);
  assert.equal(flora.nearest(here, 2.2), null);

  const poison = flora.state().sites.find(site => site.species === 'pokeweed');
  assert.equal(flora.gather(poison.id, { take: false }), true);
  assert.equal(flora.nearest({ x: poison.x, z: poison.z }, 2.2).id, poison.id, 'it is still there to look at again');

  flora.restoreGathered([]);
  assert.equal(flora.nearest(here, 2.2).id, first.id);
  flora.restoreGathered([first.id]);
  assert.deepEqual(flora.state().sites.filter(site => site.gathered).map(site => site.id), [first.id]);
});
