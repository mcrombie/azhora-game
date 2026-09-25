import test from 'node:test';
import assert from 'node:assert/strict';
import { IMANI, IMANI_STAND, VINE_WORK, VINE_YEAR, GRAFTING, CARRIAGE_TALK, DRAGON_TOLD, IMANI_LINES,
  ROW_XP, ROW_BONUS, DRAGON_SCALE, createVineyard, imaniConversation, validateVineyardSnapshot } from '../src/vineyard.js';
import { VARIETY_IDS, VARIETIES, WINERY } from '../src/winery.js';
import { WINE_SKILL } from '../src/wine.js';
import { createSkills } from '../src/skills.js';
import { INVENTORY_ITEMS } from '../src/inventory.js';

/** A dialogue box that records what was said and lets a test pick a reply. */
function talk(npc, context) {
  const screens = [], acted = [];
  imaniConversation(npc, {
    openDialogue: (who, lines, event, action, options = {}) => screens.push({ lines, ...options }),
    closeDialogue: () => {}, act: id => acted.push(id), ...context,
  });
  return { screens, acted,
    pick: id => screens.at(-1).choices.find(choice => choice.id === id)?.action(),
    has: id => screens.at(-1).choices.some(choice => choice.id === id) };
}
const npc = { id: IMANI.id };

test('she stands out in the rows, in an aisle and not inside a block', () => {
  const a = IMANI_STAND.x - WINERY.centre.x;
  // The blocks are two rows each at 22 + block * 5.6, the second row 2.6 further on.
  const rows = VARIETY_IDS.flatMap((variety, block) => [0, 1].map(k => 22 + block * 5.6 + k * 2.6));
  assert.ok(a > 22 && a < 22 + 7 * 5.6 + 2.6, 'she is among the eight blocks');
  for (const row of rows) assert.ok(Math.abs(a - row) > 1, `she is not standing in the row at ${row}`);
});

test('every block has its own working, and none of it repeats the plate at its head', () => {
  assert.deepEqual(Object.keys(VINE_WORK).sort(), [...VARIETY_IDS].sort());
  for (const id of VARIETY_IDS) {
    const work = VINE_WORK[id].work;
    assert.ok(work.length >= 3, `${id} is worth three things to say`);
    for (const line of work) assert.ok(line.length > 60, `${id} says something of substance`);
    assert.notEqual(work.join(' '), VARIETIES[id].vine, `${id} is not the plate text again`);
  }
  // The year outdoors, the grafting, and what she says while she works.
  assert.equal(VINE_YEAR.length, 8);
  assert.match(VINE_YEAR[0], /[Pp]runing/);
  assert.match(VINE_YEAR.at(-1), /again/);
  assert.ok(GRAFTING.length >= 3 && IMANI_LINES.length >= 5);
});

test('walking a block teaches the wine skill once, and the whole hill teaches more', () => {
  const skills = createSkills(), vineyard = createVineyard({ skills });
  skills.learn(WINE_SKILL);
  const wineXp = () => skills.view().find(skill => skill.id === WINE_SKILL).xp;
  const before = wineXp();
  const first = vineyard.walk('merlot');
  assert.equal(first.ok, true);
  assert.equal(first.first, true);
  assert.equal(first.xp, ROW_XP);
  assert.equal(first.name, 'Merlot');
  assert.equal(wineXp(), before + ROW_XP);
  // Walking it again is welcome and worth nothing.
  const again = vineyard.walk('merlot');
  assert.equal(again.first, false);
  assert.equal(again.xp, 0);
  assert.equal(wineXp(), before + ROW_XP);
  assert.equal(vineyard.walk('pinot-nothing').ok, false);
  // The eighth block pays the bonus, and only the eighth.
  for (const id of VARIETY_IDS.filter(id => id !== 'merlot')) {
    const result = vineyard.walk(id);
    const last = id === VARIETY_IDS.filter(other => other !== 'merlot').at(-1);
    assert.equal(result.complete, last, `${id} completes the hill only if it is the last one`);
    assert.equal(result.xp, last ? ROW_XP + ROW_BONUS : ROW_XP);
  }
  assert.equal(vineyard.complete, true);
  assert.equal(vineyard.walkedCount, VARIETY_IDS.length);
});

test('the dragon is only offered after the carriages have slipped and the whole hill is walked', () => {
  const vineyard = createVineyard({ skills: createSkills() });
  const opening = talk(npc, { vineyard });
  assert.equal(vineyard.met, true);
  assert.equal(opening.has('walk-a-block'), true);
  assert.equal(opening.has('imani-carriages'), true);
  assert.equal(opening.has('imani-dragon'), false, 'she has only just met them');

  // The whole hill, but she has not yet let the box slip: still nothing.
  for (const id of VARIETY_IDS) vineyard.walk(id);
  assert.equal(vineyard.dragonReady, false);
  assert.equal(talk(npc, { vineyard }).has('imani-dragon'), false);

  // The carriage talk ends on the box, and then she can be asked.
  assert.match(CARRIAGE_TALK.join(' '), /Petunia/);
  assert.match(CARRIAGE_TALK.join(' '), /Bertha/);
  assert.match(CARRIAGE_TALK.at(-1), /tools/, 'she covers it with tools');
  const heard = talk(npc, { vineyard });
  heard.pick('imani-carriages');
  assert.deepEqual(heard.screens.at(-1).lines, [...CARRIAGE_TALK]);
  assert.equal(vineyard.carriages, true);
  assert.equal(vineyard.dragonReady, true);

  const asked = talk(npc, { vineyard });
  assert.equal(asked.has('imani-dragon'), true);
  asked.pick('imani-dragon');
  assert.equal(asked.screens.at(-1).lines[0], DRAGON_TOLD[0]);
  asked.screens.at(-1).onComplete();
  assert.deepEqual(asked.acted, ['tell-dragon']);
});

test('telling it hands over a scale, once, and the satchel knows what it is', () => {
  const vineyard = createVineyard({ skills: createSkills() });
  const granted = [];
  vineyard.meet();
  for (const id of VARIETY_IDS) vineyard.walk(id);
  vineyard.hearCarriages();
  assert.equal(vineyard.tellDragon({ grant: id => granted.push(id) }).ok, true);
  assert.deepEqual(granted, [DRAGON_SCALE]);
  assert.equal(vineyard.dragon, 'told');
  assert.equal(vineyard.dragonReady, false);
  // She will not be talked into telling it twice, and there is no second scale.
  assert.equal(vineyard.tellDragon({ grant: id => granted.push(id) }).ok, false);
  assert.deepEqual(granted, [DRAGON_SCALE]);
  assert.ok(INVENTORY_ITEMS[DRAGON_SCALE], 'the scale is a real item');
  assert.match(INVENTORY_ITEMS[DRAGON_SCALE].brief, /warm/);
  // Afterwards she is asked how it is, not what it is.
  const after = talk(npc, { vineyard });
  assert.equal(after.has('imani-dragon'), false);
  assert.equal(after.has('imani-dragon-again'), true);
});

test('the walk, the carriages and the dragon all survive a save', () => {
  const vineyard = createVineyard({ skills: createSkills() });
  vineyard.meet(); vineyard.walk('norton'); vineyard.walk('tannat'); vineyard.hearCarriages();
  const restored = createVineyard({ skills: createSkills() });
  assert.equal(restored.restore(vineyard.snapshot()), true);
  assert.equal(restored.walkedCount, 2);
  assert.equal(restored.hasWalked('norton'), true);
  assert.equal(restored.carriages, true);
  assert.equal(restored.dragon, 'unknown');
  assert.equal(validateVineyardSnapshot(undefined), true);
  assert.equal(validateVineyardSnapshot({ version: 1, met: true, walked: ['norton'], carriages: false, dragon: 'told' }), true);
  assert.equal(validateVineyardSnapshot({ version: 1, met: true, walked: ['norton', 'norton'], carriages: false, dragon: 'told' }), false);
  assert.equal(validateVineyardSnapshot({ version: 1, met: true, walked: ['pinot-nothing'], carriages: false, dragon: 'told' }), false);
  assert.equal(validateVineyardSnapshot({ version: 1, met: true, walked: [], carriages: false, dragon: 'kept' }), false);
  assert.equal(validateVineyardSnapshot({ version: 2, met: true, walked: [], carriages: false, dragon: 'told' }), false);
});


test('Rob\'s advanced Farming prerequisite is visible but cannot grant a placeholder lesson', async () => {
  const { WINERY_LESSON_REQUIREMENT, wineryLessonsStatus, wineryLessonLines, robWineryConversation } = await import('../src/winery-lessons.js');
  assert.equal(WINERY_LESSON_REQUIREMENT.level, 5);
  assert.equal(WINERY_LESSON_REQUIREMENT.provisional, true);
  assert.deepEqual(WINERY_LESSON_REQUIREMENT.subjects, ['viticulture']);
  for (const farmingLevel of [0, 1, 4, 5, 10]) {
    const status = wineryLessonsStatus({ farmingLevel });
    assert.equal(status.requirementMet, farmingLevel >= 5);
    assert.equal(status.available, false, 'Meeting the prerequisite does not invent an unfinished lesson');
    assert.equal(status.markerKind, farmingLevel >= 5 ? 'skill' : 'skill-locked');
    const lines = wineryLessonLines({ farmingLevel }).join(' ');
    assert.match(lines, /Farming level 5 required/);
    assert.ok(lines.includes(`Your Farming level: ${farmingLevel}`));
    assert.match(lines, /not available yet/);
    assert.match(lines, /Wine is a separate skill/);
    const screens = [], grants = [];
    robWineryConversation({ id: 'vintner' }, { farmingLevel,
      openDialogue: (...args) => screens.push(args),
      skills: { learn: (...args) => grants.push(args), add: (...args) => grants.push(args) },
      act: (...args) => grants.push(args),
    });
    assert.equal(screens.length, 1);
    screens[0][4].onComplete();
    assert.deepEqual(grants, [], 'Neither dialogue nor completion grants XP, a skill or an assignment');
  }
  for (const farmingLevel of [NaN, Infinity, -3, '5']) assert.equal(wineryLessonsStatus({ farmingLevel }).requirementMet, false);
});
