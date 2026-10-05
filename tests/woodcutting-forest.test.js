import test from 'node:test';
import assert from 'node:assert/strict';
import { createWoodcutting, TREE_KINDS, WOODLOT_TREES, validateWoodcuttingSnapshot } from '../src/woodcutting.js';
import { WOOD_SPECIES } from '../src/wood-species.js';
import { createSkills, MAX_XP } from '../src/skills.js';
import { createInventoryState, INVENTORY_ITEMS } from '../src/inventory.js';
import { createWeapons } from '../src/weapons.js';
import { createCampcraft } from '../src/campcraft.js';

const master = () => { const skills = createSkills(); skills.learn('woodcutting'); skills.gain('woodcutting', MAX_XP); return skills; };
const axe = id => id === 'bronze-axe';
const tree = (id, species, extra = {}) => ({ id, species, x: 10, z: 20, harvestable: true, ...extra });
// Explicit authored exceptions, not a filter that silently skips missing recipes.
const protectedIbenwood = ['grey-vault', 'pale-witness', 'bloodoak', 'midnight-elm', 'ridgeback', 'deeproot'];

test('every ordinary timber species can be harvested without substituting a different species of log', () => {
  const trees = Object.values(WOOD_SPECIES).filter(wood => !protectedIbenwood.includes(wood.species))
    .map(wood => tree(`wild-${wood.species}`, wood.species));
  const wood = createWoodcutting({ skills: master(), trees, random: () => 0 });
  assert.equal(wood.catalog.length, trees.length + WOODLOT_TREES.length);
  for (const t of trees) {
    const result = wood.swing(t.id, axe), timber = WOOD_SPECIES[t.species];
    assert.equal(result.ok, true, t.id);
    assert.equal(result.kind.species, t.species);
    assert.equal(result.log, timber.log);
    assert.ok(INVENTORY_ITEMS[result.log], `${t.species} has its own inventory stack`);
  }
  assert.notEqual(wood.tree('wild-red-oak').log, wood.tree('wild-white-oak').log);
  assert.notEqual(wood.tree('wild-silver-fir').log, wood.tree('wild-loblolly-pine').log);
});

test('all six protected Ibenwood species retain identity without a recipe, product or ordinary harvest even when a caller requests one', () => {
  const skills=master(),trees=protectedIbenwood.map(species=>tree(`protected-${species}`,species));
  const wood=createWoodcutting({skills,trees,random:()=>0}),before=wood.snapshot(),beforeSkills=skills.snapshot();
  for(const source of trees){
    const timber=WOOD_SPECIES[source.species];assert.ok(timber,source.species);
    assert.equal(timber.log,null);assert.equal(timber.plank,null);
    assert.equal(TREE_KINDS[timber.woodKind],undefined,'protected identity must not acquire a harvesting recipe');
    assert.equal(wood.tree(source.id)?.species,source.species);
    assert.equal(wood.tree(source.id)?.harvestable,false,'requested harvestable:true cannot override the authored protection');
    assert.equal(wood.canChop(source.id,axe).ok,false);
    const swing=wood.swing(source.id,axe);assert.equal(swing.ok,false);assert.equal(swing.log,null);
  }
  assert.deepEqual(wood.snapshot(),before,'refused swings never alter stock, rewards or saved state');
  assert.deepEqual(skills.snapshot(),beforeSkills,'refused swings grant no experience');
});

test('a supplied species controls timber and required level even when a collider or silhouette says otherwise', () => {
  const skills = createSkills(), wood = createWoodcutting({ skills, random: () => 0, trees: [
    tree('oak-near-start', 'white-oak', { kind: 'forest-tree', woodKind: 'pine' }),
    tree('talking-oak', 'white-oak', { harvestable: false, reason: 'This is a living character.' }),
    tree('unknown', 'invented-species'),
  ] });
  assert.equal(wood.tree('oak-near-start').kind, 'oak');
  assert.match(wood.canChop('oak-near-start', axe).reason, /level of 15/);
  assert.equal(wood.canChop('talking-oak', axe).reason, 'This is a living character.');
  assert.equal(wood.tree('talking-oak').species, 'white-oak');
  assert.equal(wood.tree('unknown'), null, 'unknown species never turns into default pine');
});

test('world stump and partially harvested tree survive saving and regrow once without resetting their yield', () => {
  const trees = [tree('forest-pine', 'loblolly-pine'), tree('forest-oak', 'white-oak')];
  const skills = master(), wood = createWoodcutting({ skills, trees, random: () => 0 });
  assert.deepEqual(wood.snapshot().trees, [], 'untouched forest does not inflate saves');
  wood.swing('forest-pine', axe); wood.swing('forest-oak', axe); wood.update(5);
  const saved = wood.snapshot(), copy = createWoodcutting({ skills, trees, random: () => 0 });
  assert.equal(copy.restore(saved), true);
  assert.deepEqual(copy.snapshot(), saved);
  assert.equal(copy.standing('forest-pine'), false);
  assert.equal(copy.swing('forest-oak', axe).felled, true, 'only the remaining oak log is left');
  assert.deepEqual(copy.update(19), []);
  assert.deepEqual(copy.update(1), ['forest-pine']);
  assert.equal(copy.standing('forest-pine'), true);
  assert.equal(copy.snapshot().trees.some(t => t.id === 'forest-pine'), false);
  assert.deepEqual(copy.update(0), []);
  assert.deepEqual(copy.update(Infinity), [], 'non-finite time cannot instantly reset the forest');
  assert.deepEqual(copy.update(NaN), []);
});

test('large untouched forests do not roll stock or serialize per-tree state', () => {
  let rolls = 0;
  const trees = Array.from({ length: 50000 }, (_, i) => tree(`forest-${i}`, 'loblolly-pine', { x: i }));
  const wood = createWoodcutting({ skills: master(), trees, random: () => { rolls++; return 0; } });
  assert.equal(rolls, WOODLOT_TREES.length, 'only the legacy woodlot prepares stock eagerly');
  for (let i = 0; i < 20; i++) wood.update(.016);
  assert.equal(rolls, WOODLOT_TREES.length);
  wood.swing('forest-49999', axe);
  assert.equal(wood.snapshot().trees.length, 1);
  assert.equal(rolls, WOODLOT_TREES.length + 2, 'one lazy stock roll and one swing');
});

test('legacy saves remain loadable and corrupt tree state cannot mutate the running harvest', () => {
  const trees = [tree('forest-pine', 'loblolly-pine')], wood = createWoodcutting({ skills: master(), trees, random: () => 0 });
  wood.swing('forest-pine', axe);
  const saved = wood.snapshot();
  for (const change of [{ stump: NaN }, { stump: Infinity }, { stump: -1 }, { logsLeft: -1 }, { logsLeft: 1.5 }, { logsLeft: 0, stump: 0 }]) {
    const bad = { ...saved, trees: [{ ...saved.trees[0], ...change }] };
    assert.equal(validateWoodcuttingSnapshot(bad), false);
    assert.equal(wood.restore(bad), false);
    assert.deepEqual(wood.snapshot(), saved);
  }
  assert.equal(validateWoodcuttingSnapshot({ ...saved, trees: [saved.trees[0], saved.trees[0]] }), false);
  assert.equal(wood.restore({ ...saved, trees: [{ id: 'forest-pine', logsLeft: 4, stump: 0 }] }), false, 'pine cannot acquire four logs from a save');
  assert.deepEqual(wood.snapshot(), saved);
  const { trees: ignored, ...legacy } = saved;
  assert.equal(wood.restore(legacy), true);
  assert.equal(wood.standing('forest-pine'), true);
  assert.equal(wood.logs, 1, 'legacy total persists without awarding another log');
});

test('new species logs are firewood and saleable while retaining their own inventory IDs', () => {
  const inventory = createInventoryState();
  inventory.add('tinderbox', 1); inventory.add('silver-birch-logs', 2);
  const wood = createWoodcutting({ skills: master() }), offer = wood.offer(id => inventory.count(id));
  assert.deepEqual(offer.lots, [{ item: 'silver-birch-logs', count: 2, price: TREE_KINDS['silver-birch'].price }]);
  const weapons = createWeapons({ inventory }), camp = createCampcraft({ inventory, weapons });
  assert.equal(camp.light('village-fire').ok, true);
  assert.equal(inventory.count('silver-birch-logs'), 1);
});
