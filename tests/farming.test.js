import test from 'node:test';
import assert from 'node:assert/strict';
import { CROPS, CROP_IDS, FARM_ROWS, FARM_ROW_IDS, ORCHARD_TREES, ORCHARD_ITEM, ORCHARD_XP, ORCHARD_REGROW,
  FARMING_SKILL, FARMING_LESSON, farmRow, crop, createFarming, validateFarmingSnapshot } from '../src/farming.js';
import { SKILLS, createSkills, skillLevel } from '../src/skills.js';
import { INVENTORY_ITEMS } from '../src/inventory.js';
import { APPLEGARTH_WORKS } from '../src/rena.js';
import { regionAt } from '../src/region-world.js';
import { canStand } from '../src/game-state.js';
import { sourceModule } from './module-loader.js';

let world = null;
const built = async () => {
  world ??= await (async () => {
    const THREE = await import('../vendor/three.module.js');
    const { createWorld } = await sourceModule('../src/world.js');
    return createWorld(new THREE.Scene());
  })();
  return world;
};

const satchel = () => { const bag = {}; return { bag, add: (id, n = 1) => { bag[id] = (bag[id] ?? 0) + n; return true; } }; };
const fixture = ({ taught = true } = {}) => {
  const skills = createSkills(), inventory = satchel(), events = [];
  const farming = createFarming({ skills, inventory, onEvent: event => events.push(event) });
  if (taught) farming.learn();
  return { skills, inventory, events, farming };
};

test('farming is the fourteenth skill, on the same table as the rest, and Enna teaches it', () => {
  assert.ok(SKILLS[FARMING_SKILL], 'the skill sheet knows it');
  assert.equal(SKILLS[FARMING_SKILL].kind, 'working', 'you do it over and over, like woodcutting');
  assert.equal(SKILLS[FARMING_SKILL].thresholds, SKILLS.woodcutting.thresholds, 'RuneScape’s own table');
  assert.match(SKILLS[FARMING_SKILL].teacher, /Enna/);
  assert.match(SKILLS[FARMING_SKILL].teacher, /Mill Commons/);
  assert.equal(FARMING_LESSON.length, 3, 'she says it in three');
  assert.match(FARMING_LESSON.join(' '), /while you are somewhere else/, 'which is the whole lesson');
  // Every level the guide promises is a level a crop actually wants.
  for (const entry of SKILLS[FARMING_SKILL].unlocks) {
    if (!/four minutes|eight minutes/.test(entry.text)) continue;
    assert.ok(CROP_IDS.some(id => CROPS[id].level === entry.level), `nothing wants level ${entry.level}`);
  }
});

test('a row is sown at a moment of play and is ripe a fixed number of seconds later', () => {
  const { farming, inventory } = fixture();
  const barley = crop('barley');
  assert.equal(barley.seconds, 240, 'four minutes');
  assert.equal(crop('drent-leaf').seconds, 480, 'and the leaf is twice that');
  assert.equal(farming.rowState('commons-row-1', 0).stage, 'bare');
  assert.equal(farming.sow('commons-row-1', 'barley', 100).ok, true);
  assert.deepEqual([farming.rowState('commons-row-1', 100).stage, farming.rowState('commons-row-1', 100).ripeAt], ['sown', 340]);
  assert.equal(farming.rowState('commons-row-1', 339).stage, 'sown');
  assert.equal(farming.rowState('commons-row-1', 339).left, 1);
  assert.equal(farming.rowState('commons-row-1', 340).stage, 'ripe');
  // Waiting is the lesson: an unripe row is not reaped, and it says how long.
  const early = farming.reap('commons-row-1', 200);
  assert.equal(early.ok, false);
  assert.match(early.reason, /whether you are watching it or not/);
  const reaped = farming.reap('commons-row-1', 400);
  assert.deepEqual([reaped.ok, reaped.item, reaped.quantity, reaped.xp], [true, barley.item, barley.yield, barley.xp]);
  assert.equal(inventory.bag[barley.item], barley.yield, 'the crop goes in the satchel');
  // And the row is bare again, which is what a working skill is.
  assert.equal(farming.rowState('commons-row-1', 400).stage, 'bare');
  assert.equal(farming.reap('commons-row-1', 400).ok, false, 'and reaped once');
  assert.equal(farming.sow('commons-row-1', 'barley', 400).ok, true, 'and ready to go straight back in');
});

test('nothing grows for a traveler nobody has taught, and no row holds two crops', () => {
  const { farming } = fixture({ taught: false });
  assert.equal(farming.met, false);
  assert.equal(farming.sow('commons-row-1', 'barley', 0).ok, false, 'not before Enna');
  assert.equal(farming.pick(ORCHARD_TREES[0].id, 0).ok, false);
  assert.deepEqual(farming.sowable('commons-row-1'), []);
  farming.learn();
  assert.equal(farming.learn().first, false, 'and she teaches it once');
  assert.equal(farming.sow('nowhere', 'barley', 0).ok, false);
  assert.equal(farming.sow('commons-row-1', 'turnips', 0).ok, false);
  assert.equal(farming.sow('commons-row-1', 'barley', 0).ok, true);
  assert.equal(farming.sow('commons-row-1', 'barley', 0).ok, false, 'something is already in it');
  // The leaf waits on the level, and says so rather than refusing silently.
  const leaf = farming.sow('commons-row-2', 'drent-leaf', 0);
  assert.equal(leaf.ok, false);
  assert.match(leaf.reason, /level 5/);
  assert.deepEqual(farming.sowable('commons-row-2').map(entry => entry.id), ['barley'], 'until then, barley');
});

test('reaping pays experience, and the level is read off the same table as everything else', () => {
  const { farming, skills } = fixture();
  assert.equal(skills.known(FARMING_SKILL), true, 'she signs you up when she teaches you');
  let clock = 0;
  for (let n = 0; n < 6; n++) { farming.sow('commons-row-1', 'barley', clock); clock += 240; farming.reap('commons-row-1', clock); }
  assert.equal(farming.reaped, 6);
  const earned = 6 * CROPS.barley.xp;
  assert.equal(skillLevel(FARMING_SKILL, earned).level, skills.level(FARMING_SKILL), 'the table says what the skill says');
  assert.ok(skills.level(FARMING_SKILL) >= 2, `six rows is ${skills.level(FARMING_SKILL)}`);
});

test('a kept tree is picked rather than sown, and bears again ten minutes later', () => {
  const { farming, inventory } = fixture();
  const tree = ORCHARD_TREES[0].id;
  assert.equal(ORCHARD_TREES.length, APPLEGARTH_WORKS.orchard.length, 'the village’s own trees, and no others');
  assert.equal(ORCHARD_TREES.length, 28);
  assert.equal(farming.treeState(tree, 0).stage, 'fruiting');
  const picked = farming.pick(tree, 1000);
  assert.deepEqual([picked.ok, picked.item, picked.xp], [true, ORCHARD_ITEM, ORCHARD_XP]);
  assert.equal(inventory.bag[ORCHARD_ITEM], 1);
  assert.ok(INVENTORY_ITEMS[ORCHARD_ITEM], 'the apple is a thing you can carry');
  assert.equal(farming.pick(tree, 1000).ok, false, 'picked out');
  assert.equal(farming.treeState(tree, 1000 + ORCHARD_REGROW - 1).stage, 'picked');
  assert.equal(farming.treeState(tree, 1000 + ORCHARD_REGROW).stage, 'fruiting');
  assert.equal(farming.pick(tree, 1000 + ORCHARD_REGROW).ok, true, 'and it comes back');
  assert.equal(farming.pick('applegarth-tree-999', 0).ok, false);
});

test('the four rows are named ground at the commons, and the orchard is Applegarth’s', () => {
  assert.equal(FARM_ROWS.length, 4);
  assert.equal(new Set(FARM_ROW_IDS).size, 4);
  for (const row of FARM_ROWS) {
    assert.ok(row.name && Number.isFinite(row.x) && Number.isFinite(row.z), row.id);
    // Within reach of Enna, who stands between the rows and the millstones.
    assert.ok(Math.hypot(row.x + 418.4, row.z - 59.8) < 40, `${row.id} is ${Math.hypot(row.x + 418.4, row.z - 59.8).toFixed(0)} m from Enna`);
  }
  for (let i = 1; i < FARM_ROWS.length; i++)
    assert.ok(Math.hypot(FARM_ROWS[i].x - FARM_ROWS[i - 1].x, FARM_ROWS[i].z - FARM_ROWS[i - 1].z) > 3, 'the rows are rows, not a heap');
  assert.equal(farmRow('nowhere'), null);
  assert.equal(crop('turnips'), null);
});

test('the save carries what was sown and when, and refuses a time that has not happened', () => {
  const { farming } = fixture();
  farming.sow('commons-row-1', 'barley', 300);
  farming.pick(ORCHARD_TREES[2].id, 420);
  const saved = farming.snapshot();
  assert.ok(validateFarmingSnapshot(saved), 'a validator that refuses its own output loses the save');
  const back = createFarming({ skills: createSkills() });
  assert.equal(back.restore(saved), true);
  assert.deepEqual(back.snapshot(), saved);
  assert.equal(back.rowState('commons-row-1', 540).stage, 'ripe');
  assert.equal(validateFarmingSnapshot(undefined), true, 'a save from before there was a farm');
  assert.equal(validateFarmingSnapshot(undefined, { allowMissing: false }), false);
  const bad = extra => validateFarmingSnapshot({ ...saved, ...extra });
  // A row sown in the future never ripens, and a tree picked in the future never bears again.
  assert.equal(validateFarmingSnapshot(saved, { playSeconds: 299 }), false, 'sown after the game got there');
  assert.equal(validateFarmingSnapshot(saved, { playSeconds: 419 }), false, 'picked after the game got there');
  assert.equal(validateFarmingSnapshot(saved, { playSeconds: 420 }), true);
  assert.equal(bad({ rows: { 'commons-row-1': { crop: 'turnips', sownAt: 1 } } }), false, 'a crop nobody grows');
  assert.equal(bad({ rows: { nowhere: { crop: 'barley', sownAt: 1 } } }), false, 'a row that is not there');
  assert.equal(bad({ rows: { 'commons-row-1': { crop: 'barley', sownAt: -1 } } }), false);
  assert.equal(bad({ trees: { 'applegarth-tree-900': 1 } }), false);
  assert.equal(bad({ met: 1 }), false);
  assert.equal(bad({ reaped: -1 }), false);
  assert.equal(bad({ version: 2 }), false);
  for (const rubbish of [null, 'a farm', 7, [], true]) assert.equal(validateFarmingSnapshot(rubbish), false);
  // A refused save leaves the farm empty rather than half sown.
  const fresh = createFarming();
  assert.equal(fresh.restore({ ...saved, reaped: -3 }), false);
  assert.equal(fresh.met, false);
  assert.equal(fresh.view(0).sown, 0);
});

test('the farm tells the traveler what it is doing, and it is never a thing to stand and watch', () => {
  const { farming } = fixture({ taught: false });
  assert.match(farming.task(0).detail, /Enna/);
  farming.learn();
  assert.match(farming.task(0).title, /bare rows/);
  farming.sow('commons-row-1', 'barley', 0);
  assert.match(farming.task(10).detail, /go and do something else/i);
  assert.match(farming.task(300).title, /ripe/);
  const view = farming.view(300);
  assert.deepEqual([view.sown, view.ripe], [0, 1]);
  assert.equal(view.fruiting, ORCHARD_TREES.length);
  assert.equal(view.crops.length, CROP_IDS.length);
});

test('every row and every kept tree has ground a person can work it from', async () => {
  // A farm nobody can walk to is a dead skill, and the mill's own fences and sacks are drawn
  // by a different pass than this one. So the rows are measured against the built clearing.
  const here = await built();
  const beside = (x, z) => { for (let d = 0; d < 8; d++) { const a = d * Math.PI / 4;
    if (canStand(x + Math.cos(a) * 1.6, z + Math.sin(a) * 1.6, here, .45)) return true; } return false; };
  for (const row of FARM_ROWS) {
    assert.ok(canStand(row.x, row.z, here, .45), `${row.id} is inside something`);
    assert.ok(beside(row.x, row.z), `${row.id} has nowhere to stand to work it`);
    assert.equal(regionAt(row.x, row.z)?.name, 'Drent', row.id);
  }
  for (const tree of ORCHARD_TREES) assert.ok(beside(tree.x, tree.z), `${tree.id} cannot be reached`);
});
