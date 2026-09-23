import test from 'node:test';
import assert from 'node:assert/strict';
import { SKILLS, SKILL_IDS, RUNESCAPE_TABLE, MAX_XP, createSkills, skillLevel, validateSkillsSnapshot } from '../src/skills.js';

test('levels are read from the thresholds, with progress toward the next', () => {
  // Fourteen that are about the world, then the seven that are about fighting, then the three
  // schools of sorcery - each group under its own heading in the grid (docs/combat-brief.md,
  // src/sorcery.js).
  assert.deepEqual(SKILL_IDS, ['birding', 'fishing', 'botany', 'geology', 'mycology', 'archaeology', 'wine', 'cooking', 'woodcutting', 'construction', 'cartography', 'swimming', 'farming', 'linguist',
    'blades', 'heavy-arms', 'polearms', 'staves', 'bows', 'shield', 'toughness',
    'fire', 'mind', 'beast', 'frost', 'wards']);
  assert.deepEqual(SKILL_IDS.filter(id => SKILLS[id].group === 'Arms'),
    ['blades', 'heavy-arms', 'polearms', 'staves', 'bows', 'shield', 'toughness'], 'the seven are the grouped ones');
  assert.deepEqual(SKILL_IDS.filter(id => SKILLS[id].group === 'Sorcery'), ['fire', 'mind', 'beast', 'frost', 'wards'],
    'and the three schools are the other group');
  assert.ok(SKILL_IDS.slice(0, 14).every(id => SKILLS[id].group === undefined), 'and nothing else is grouped');
  for (const id of SKILL_IDS) assert.ok(SKILLS[id].teacher && SKILLS[id].blurb, `${id} says who teaches it`);
  const table = SKILLS.birding.thresholds;
  assert.ok(table.every((xp, i) => i === 0 ? xp === 0 : xp > table[i - 1]), 'thresholds rise');
  assert.equal(skillLevel('birding', 0).level, 1);
  assert.equal(skillLevel('birding', 82).level, 1);
  assert.equal(skillLevel('birding', 83).level, 2);
  assert.equal(skillLevel('birding', 90).level, 2, 'Drent’s five birds together reach level 2');
  assert.equal(skillLevel('birding', 225).progress, .5, 'halfway from level 3 at 174 to level 4 at 276');
  const top = skillLevel('birding', MAX_XP);
  assert.deepEqual([top.level, top.max, top.next, top.progress], [table.length, true, null, 1]);
  assert.equal(skillLevel('juggling', 5), null);
});

/**
 * The user's ruling of 21 September 2026: every skill the mode shows begins at level 1, and
 * nobody has to be introduced to it before it pays. The teachers keep the teaching and lose
 * the gate.
 */
test('a skill begins at level 1 and pays without being taught, and a teacher is still an occasion', () => {
  const events = [], skills = createSkills({ onEvent: e => events.push(e), begins: ['birding', 'fishing'] });
  assert.equal(skills.known('birding'), true, 'known from the first step');
  assert.equal(skills.level('birding'), 1, 'and at level 1, not nought');
  assert.equal(skills.gain('birding', 10).ok, true, 'and it pays with nobody watching');
  assert.equal(skills.learn('juggling').ok, false, 'a skill the game does not have is still refused');
  // A teacher's lesson is new the first time he gives it and never again, however much the
  // traveler had already taught himself.
  assert.equal(skills.taught('birding'), false, 'nobody has taught it');
  assert.equal(skills.learn('birding').first, true, 'and Perrin is still the one who does');
  assert.equal(skills.taught('birding'), true);
  assert.equal(skills.learn('birding').first, false, 'once each');
  // A skill outside `begins` is still practisable: nothing in the game is locked.
  assert.equal(skills.gain('botany', 10).ok, true, 'a skill nobody seeded pays all the same');
  assert.equal(skills.level('botany'), 1);
  assert.deepEqual([skills.gain('birding', 30).levelled, skills.level('birding')], [false, 1]);
  const up = skills.gain('birding', 43);
  assert.deepEqual([up.levelled, up.level, up.xp], [true, 2, 83]);
  assert.deepEqual(events.map(e => e.type), ['skill-gain', 'skill-learned', 'skill-gain', 'skill-gain', 'skill-gain']);
  const view = skills.view().find(skill => skill.id === 'birding');
  assert.deepEqual([view.learned, view.level, view.xp, view.next], [true, 2, 83, 174]);
});

test('an old save, and one written by a traveler who met nobody, opens with the whole sheet', () => {
  const begins = ['birding', 'fishing', 'botany'];
  const old = { version: 1, skills: { birding: { xp: 200 } } };
  const skills = createSkills({ begins });
  assert.equal(skills.restore(old), true);
  assert.equal(skills.level('birding'), 3, 'what was earned is kept');
  for (const id of begins) assert.ok(skills.level(id) >= 1, `${id} is at least level 1 after a restore`);
  assert.equal(skills.totalLevel() >= begins.length, true, 'and the total counts them all');
});

test('skills survive a save, and nonsense is refused', () => {
  const skills = createSkills();
  skills.learn('birding'); skills.gain('birding', 200);
  const copy = createSkills({ begins: ['birding'] });
  assert.equal(copy.restore(skills.snapshot()), true);
  assert.deepEqual(copy.snapshot(), { version: 1, skills: { birding: { xp: 200 } }, taught: ['birding'] });
  // A save from before teaching and knowing parted says who taught by the skills it holds.
  const older = createSkills({ begins: ['birding', 'fishing'] });
  assert.equal(older.restore({ version: 1, skills: { birding: { xp: 5 } } }), true);
  assert.deepEqual([older.taught('birding'), older.taught('fishing')], [true, false], 'the old meaning is kept');
  assert.equal(copy.level('birding'), 3);
  assert.equal(validateSkillsSnapshot(undefined), true, 'older saves have no skills');
  for (const bad of [null, [], { version: 2, skills: {} }, { version: 1, skills: { juggling: { xp: 1 } } }, { version: 1, skills: { birding: { xp: -1 } } }, { version: 1, skills: { birding: { xp: 1.5 } } }])
    assert.equal(validateSkillsSnapshot(bad), false, JSON.stringify(bad));
  assert.equal(copy.restore({ version: 1, skills: { birding: { xp: 'lots' } } }), false);
  assert.equal(copy.level('birding'), 1, 'a refused restore leaves the floor this game begins with, and nothing earned');
});

test('every skill climbs the same table, and it is RuneScape’s', () => {
  assert.equal(RUNESCAPE_TABLE.length, 99, 'ninety-nine levels');
  assert.deepEqual([RUNESCAPE_TABLE[0], RUNESCAPE_TABLE[1], RUNESCAPE_TABLE[98]], [0, 83, 13_034_431]);
  // The table's own famous fact: level 92 is half the way to 99.
  assert.ok(Math.abs(RUNESCAPE_TABLE[91] / RUNESCAPE_TABLE[98] - .5) < 1e-4, 'level 92 is half of 99');
  for (const id of SKILL_IDS) {
    assert.equal(SKILLS[id].thresholds, RUNESCAPE_TABLE, `${id} climbs the one table, not a copy of it`);
    assert.equal(skillLevel(id, 0).top, 99, `${id} tops out at 99`);
    assert.equal(skillLevel(id, MAX_XP).level, 99, `${id} reaches 99 with the experience cap`);
  }
  // Including the skills nobody has learned: the sheet reads a top off them too.
  for (const skill of createSkills().view()) assert.deepEqual([skill.learned, skill.level, skill.top], [false, 0, 99], skill.id);
});
