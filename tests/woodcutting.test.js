import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { SKILLS, RUNESCAPE_TABLE, MAX_XP, createSkills, skillLevel, skillGuide, levelUpLine, validateSkillsSnapshot } from '../src/skills.js';
import { INVENTORY_ITEMS, ICON_KINDS, createInventoryState } from '../src/inventory.js';
import { createCampcraft } from '../src/campcraft.js';
import { createWeapons } from '../src/weapons.js';
import { WOODCUTTING_SKILL, TREE_KINDS, TREE_KIND_IDS, LOG_ITEMS, AXES, KINGS_AXE_LEVEL, KOOPWOOD, WOODLOT_TREES, WOODLOT_SIGN, BOWDEN, BOWDEN_STAND,
  inKoopwood, woodlotColliders, chopChance, bestAxe, createWoodcutting, bowdenConversation, validateWoodcuttingSnapshot } from '../src/woodcutting.js';

const { createWorld } = await sourceModule('../src/world.js');
const { SIGN_LABELS } = await sourceModule('../src/signs.js');
const world = createWorld(new THREE.Scene());
const sequence = values => { let i = 0; return () => values[i++ % values.length]; };
const talker = () => {
  const log = { opened: null, acted: [] };
  return { log, context: { openDialogue: (npc, lines, event, close, options) => { log.opened = { lines, options }; }, closeDialogue() {}, act: action => log.acted.push(action) } };
};
const ids = log => (log.opened.options?.choices ?? []).map(c => c.id);
const said = log => log.opened.lines.join(' ');

test('working skills climb RuneScape’s own table to 99, with a guide to what each level opens', () => {
  assert.equal(RUNESCAPE_TABLE.length, 99);
  assert.deepEqual([RUNESCAPE_TABLE[1], RUNESCAPE_TABLE[14], RUNESCAPE_TABLE[29], RUNESCAPE_TABLE[98]], [83, 2411, 13363, 13034431], 'levels 2, 15, 30 and 99');
  assert.ok(Math.abs(RUNESCAPE_TABLE[91] * 2 - RUNESCAPE_TABLE[98]) < RUNESCAPE_TABLE[98] * .001, 'level 92 is half of 99');
  assert.equal(SKILLS.woodcutting.thresholds, RUNESCAPE_TABLE);
  assert.deepEqual([skillLevel('woodcutting', 82).level, skillLevel('woodcutting', 83).level, skillLevel('woodcutting', MAX_XP).level, skillLevel('woodcutting', 0).top], [1, 2, 99, 99]);
  assert.equal(skillLevel('birding', 0).top, 99, 'and so do the knowing skills — one table under all of them'); // tests/skills.test.js holds that.
  // The guide agrees with the trees and the axes.
  const guide = SKILLS.woodcutting.unlocks.map(u => `${u.level} ${u.text}`).join(' | ');
  for (const k of Object.values(TREE_KINDS)) assert.match(guide, new RegExp(`${k.level} ${k.name} · ${k.xp} experience`), k.id);
  for (const [id, word] of [['bronze-axe', 'Bronze'], ['iron-axe', 'iron'], ['steel-axe', 'Steel'], ['kings-axe', 'King’s axe']]) {
    const axe = AXES.find(a => a.id === id);
    assert.ok(SKILLS.woodcutting.unlocks.some(u => u.level === axe.level && u.text.includes(word)), id);
  }
  assert.deepEqual(skillGuide('woodcutting', 15).filter(u => u.open).map(u => u.level), [1, 1, 6, 15]);
  assert.equal(levelUpLine('woodcutting', 15), 'Congratulations, you’ve just advanced a Woodcutting level. You are now level 15.');
  const events = [], skills = createSkills({ onEvent: e => events.push(e) });
  skills.learn('woodcutting'); skills.learn('birding'); skills.gain('birding', 83);
  const up = skills.gain('woodcutting', 2411);
  assert.deepEqual([up.level, up.levelled], [15, true]);
  assert.deepEqual(events.at(-1), { type: 'skill-gain', id: 'woodcutting', gained: 2411, level: 15, levelled: true, before: 1 });
  assert.equal(skills.totalLevel(), 17, 'fifteen and two');
  assert.equal(validateSkillsSnapshot({ version: 1, skills: { woodcutting: { xp: 13034431 } } }), true, 'past the old cap of a million');
  assert.equal(validateSkillsSnapshot({ version: 1, skills: { woodcutting: { xp: MAX_XP + 1 } } }), false);
});

test('the Koopwood: a clearing outside Tidehaven, every tree in reach from all sides, none of the wild wood inside it', () => {
  assert.equal(world.regionAt(KOOPWOOD.x, KOOPWOOD.z)?.name, 'Drent');
  assert.ok(Math.hypot(KOOPWOOD.x - 5, KOOPWOOD.z - 30) < 80, 'just outside the village');
  assert.ok(canStand(BOWDEN_STAND.x, BOWDEN_STAND.z, world, .3), 'Bowden has room');
  for (const [id, home] of Object.entries(world.npcPositions)) assert.ok(Math.hypot(home.x - BOWDEN_STAND.x, home.z - BOWDEN_STAND.z) > 12, `clear of ${id}`);
  for (const t of WOODLOT_TREES) {
    assert.ok(inKoopwood(t.x, t.z), t.id);
    let spots = 0;
    for (let a = 0; a < 12; a++) { const r = TREE_KINDS[t.kind].trunk + .9; if (canStand(t.x + Math.sin(a * .52) * r, t.z + Math.cos(a * .52) * r, world, .3)) spots++; }
    assert.ok(spots >= 9, `${t.id} can be cut from most sides (${spots} of 12)`);
  }
  for (const k of TREE_KIND_IDS) assert.ok(WOODLOT_TREES.some(t => t.kind === k), `a ${k} to cut`);
  assert.equal(world.colliders.filter(c => !c.kind && inKoopwood(c.x, c.z)).length, 0, 'the village wood keeps out of the lot');
  for (const kind of ['woodlot-tree', 'woodlot-keep', 'charcoal-kiln', 'chopping-block', 'log-pile', 'woodlot-spring']) assert.ok(world.colliders.some(c => c.kind === kind), kind);
  assert.equal(world.colliders.filter(c => c.kind === 'woodlot-tree').length, WOODLOT_TREES.length);
  assert.equal(woodlotColliders().length, WOODLOT_TREES.length + 9);
  assert.ok(world.roadSigns.some(sign => sign.label === WOODLOT_SIGN) && SIGN_LABELS.includes(WOODLOT_SIGN));
  assert.ok(world.woodlot && ['fell', 'regrow', 'set', 'chip', 'update', 'standing'].every(key => typeof world.woodlot[key] === 'function'));
  world.woodlot.fell(WOODLOT_TREES[0].id, BOWDEN_STAND); world.woodlot.update(3, 0);
  assert.equal(world.woodlot.standing(WOODLOT_TREES[0].id), false, 'down');
  world.woodlot.regrow(WOODLOT_TREES[0].id); world.woodlot.update(3, 1);
  assert.equal(world.woodlot.standing(WOODLOT_TREES[0].id), true, 'and up again');
});

test('RuneScape’s rules: a level for every tree, an axe you can swing, a log a success, stumps that grow back', () => {
  const skills = createSkills(), satchel = new Set();
  const has = id => satchel.has(id), wood = createWoodcutting({ skills, random: sequence([0]) });
  const pine = WOODLOT_TREES.find(t => t.kind === 'pine'), oak = WOODLOT_TREES.find(t => t.kind === 'oak');
  // No permission is needed to swing an axe any more (the user, 21 September 2026); the axe is.
  assert.equal(wood.canChop(pine.id, has).reason, 'You need an axe to chop down this tree.', 'an axe, not a lesson');
  skills.learn(WOODCUTTING_SKILL);
  assert.equal(wood.canChop(pine.id, has).reason, 'You need an axe to chop down this tree.');
  satchel.add('steel-axe');
  assert.equal(wood.canChop(pine.id, has).reason, 'You do not have an axe which you have the Woodcutting level to use.');
  satchel.add('bronze-axe');
  assert.equal(wood.canChop(oak.id, has).reason, 'You need a Woodcutting level of 15 to chop down this oak.');
  const can = wood.canChop(pine.id, has);
  assert.deepEqual([can.ok, can.axe.id], [true, 'bronze-axe']);
  const swing = wood.swing(pine.id, has);
  assert.deepEqual([swing.log, swing.xp, swing.felled], ['pine-logs', 25, true], 'a pine gives one log and falls');
  assert.equal(skills.view().find(s => s.id === WOODCUTTING_SKILL).xp, 25);
  assert.equal(wood.standing(pine.id), false);
  assert.match(wood.canChop(pine.id, has).reason, /Only a stump/);
  assert.deepEqual(wood.update(TREE_KINDS.pine.regrow - 1), []);
  assert.deepEqual(wood.update(1), [pine.id], 'and grows back');
  // Better axes and higher levels cut faster; nothing is ever certain.
  assert.ok(chopChance('pine', 1, 'iron-axe') > chopChance('pine', 1, 'bronze-axe'));
  assert.ok(chopChance('oak', 40, 'bronze-axe') > chopChance('oak', 15, 'bronze-axe'));
  assert.ok(chopChance('walnut', 99, 'kings-axe') <= .95 && chopChance('oak', 14, 'kings-axe') === 0 && chopChance('pine', 5, 'steel-axe') === 0);
  assert.equal(bestAxe(30, id => ['iron-axe', 'kings-axe', 'steel-axe'].includes(id)).id, 'kings-axe');
  assert.equal(bestAxe(29, id => ['iron-axe', 'kings-axe', 'steel-axe'].includes(id)).id, 'steel-axe');
  // A miss is a miss.
  const unlucky = createWoodcutting({ skills, random: sequence([.2, .99]) });
  assert.equal(unlucky.swing(pine.id, has).log, null);
  // Old trees give several logs before they fall.
  const oaks = createWoodcutting({ skills, random: sequence([.99, 0]) });
  skills.gain(WOODCUTTING_SKILL, RUNESCAPE_TABLE[14]);
  let logs = 0; while (oaks.standing(oak.id) && logs < 20) if (oaks.swing(oak.id, has).log) logs++;
  assert.equal(logs, TREE_KINDS.oak.logs[1], 'the most an oak has, with a high roll');
  for (const item of [...LOG_ITEMS, ...AXES.map(a => a.id)]) assert.ok(INVENTORY_ITEMS[item] && ICON_KINDS.includes(INVENTORY_ITEMS[item].icon), item);
});

test('a log lights a fire at a fire ring in place of two sticks', () => {
  const inventory = createInventoryState();
  inventory.add('tinderbox', 1); inventory.add('pine-logs', 1);
  const weapons = createWeapons({ inventory }), campcraft = createCampcraft({ inventory, weapons });
  assert.equal(campcraft.fireStatus('village-fire').canLight, true);
  assert.equal(campcraft.light('village-fire').ok, true);
  assert.equal(inventory.count('pine-logs'), 0);
});

test('Bowden Koop: BWAH HA HA, the skill and the hatchet, axes by level, logs for the kiln, and his father’s axe at thirty', () => {
  const skills = createSkills(), wood = createWoodcutting({ skills, random: () => 0 }), satchel = new Map(), { log, context } = talker();
  const talk = (extra = {}) => bowdenConversation({ id: BOWDEN.id }, { ...context, wood, skills, purse: 20, count: id => satchel.get(id) ?? 0, has: id => (satchel.get(id) ?? 0) > 0, ...extra });
  talk();
  assert.deepEqual(log.acted, ['bowden-meet']);
  assert.match(said(log), /BWAH HA HA/); assert.match(said(log), /King of this wood/);
  assert.ok(ids(log).includes('bowden-teach') && !ids(log).includes('bowden-axes'));
  log.opened.options.choices.find(c => c.id === 'bowden-teach').action();
  assert.match(said(log), /Oak wants fifteen/);
  wood.meet(); skills.learn(WOODCUTTING_SKILL); satchel.set('bronze-axe', 1);
  talk();
  assert.ok(!ids(log).includes('bowden-teach') && ids(log).includes('bowden-axes') && !ids(log).includes('bowden-sell'));
  log.opened.options.choices.find(c => c.id === 'bowden-axes').action();
  const steel = log.opened.options.choices.find(c => c.id === 'bowden-buy-steel-axe'), iron = log.opened.options.choices.find(c => c.id === 'bowden-buy-iron-axe');
  assert.equal(steel.disabled, true); assert.match(steel.reason, /level of 6/);
  assert.equal(iron.disabled, false);
  satchel.set('pine-logs', 3); satchel.set('oak-logs', 2);
  talk();
  const sell = log.opened.options.choices.find(c => c.id === 'bowden-sell');
  assert.match(sell.label, /5 for 7 copper/);
  assert.ok(!ids(log).includes('bowden-kings-axe'));
  skills.gain(WOODCUTTING_SKILL, RUNESCAPE_TABLE[KINGS_AXE_LEVEL - 1]);
  talk(); assert.ok(ids(log).includes('bowden-kings-axe'));
  assert.equal(wood.giveKingsAxe().ok, true); assert.equal(wood.giveKingsAxe().ok, false, 'once');
  talk(); assert.ok(!ids(log).includes('bowden-kings-axe'));
  for (const [id, pattern] of [['bowden-king', /Lysa/], ['bowden-rival', /red cap/], ['bowden-kiln', /Every king has a castle/]]) {
    talk(); log.opened.options.choices.find(c => c.id === id).action(); assert.match(said(log), pattern, id);
  }
  assert.equal(bowdenConversation({ id: 'somebody' }, { ...context, wood, skills }), false);
});

test('saves: woodcutting is kept, and nonsense is refused', () => {
  const skills = createSkills(), wood = createWoodcutting({ skills });
  wood.meet(); wood.visit(); wood.sold(4);
  const saved = wood.snapshot(), copy = createWoodcutting({ skills });
  assert.equal(validateWoodcuttingSnapshot(saved), true);
  assert.ok(copy.restore(saved) && copy.met && copy.visits === 1);
  for (const bad of [{ ...saved, version: 2 }, { ...saved, met: false }, { ...saved, visits: -1 }, { ...saved, kingsAxe: 'yes' }]) assert.equal(validateWoodcuttingSnapshot(bad), false, JSON.stringify(bad));
});

test('Bowden looks the part: a head bigger than anybody, and his shell on his back', async () => {
  const { createBowden, BOWDEN_SIZE } = await sourceModule('../src/woodcutter-model.js');
  const { createCharacter } = await sourceModule('../src/characters.js');
  const size = group => new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());
  const bowden = createBowden(), plain = createCharacter({ role: 'mercenary', tunic: 0x777777 });
  assert.ok(BOWDEN_SIZE > 1.1 && size(bowden.group).y > size(plain.group).y * 1.1, 'huge');
  assert.ok(bowden.group.getObjectByName('Bowden’s shell'), 'his shell');
});
