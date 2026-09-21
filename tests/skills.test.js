import test from 'node:test';
import assert from 'node:assert/strict';
import { SKILLS, SKILL_IDS, RUNESCAPE_TABLE, MAX_XP, createSkills, skillLevel, validateSkillsSnapshot } from '../src/skills.js';

test('levels are read from the thresholds, with progress toward the next', () => {
  assert.deepEqual(SKILL_IDS, ['birding', 'fishing', 'botany', 'geology', 'mycology', 'archaeology', 'wine', 'cooking', 'woodcutting', 'construction', 'cartography', 'swimming', 'farming', 'linguist']);
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

test('a skill is learned once, gains experience only once learned, and reports new levels', () => {
  const events = [], skills = createSkills({ onEvent: e => events.push(e) });
  assert.equal(skills.gain('birding', 10).ok, false);
  assert.equal(skills.known('birding'), false);
  assert.equal(skills.level('birding'), 0);
  assert.equal(skills.learn('birding').first, true);
  assert.equal(skills.learn('birding').first, false);
  assert.equal(skills.learn('juggling').ok, false);
  assert.deepEqual([skills.gain('birding', 40).levelled, skills.level('birding')], [false, 1]);
  const up = skills.gain('birding', 43);
  assert.deepEqual([up.levelled, up.level, up.xp], [true, 2, 83]);
  assert.deepEqual(events.map(e => e.type), ['skill-learned', 'skill-gain', 'skill-gain']);
  const view = skills.view().find(skill => skill.id === 'birding');
  assert.deepEqual([view.learned, view.level, view.xp, view.next], [true, 2, 83, 174]);
});

test('skills survive a save, and nonsense is refused', () => {
  const skills = createSkills();
  skills.learn('birding'); skills.gain('birding', 200);
  const copy = createSkills();
  assert.equal(copy.restore(skills.snapshot()), true);
  assert.deepEqual(copy.snapshot(), { version: 1, skills: { birding: { xp: 200 } } });
  assert.equal(copy.level('birding'), 3);
  assert.equal(validateSkillsSnapshot(undefined), true, 'older saves have no skills');
  for (const bad of [null, [], { version: 2, skills: {} }, { version: 1, skills: { juggling: { xp: 1 } } }, { version: 1, skills: { birding: { xp: -1 } } }, { version: 1, skills: { birding: { xp: 1.5 } } }])
    assert.equal(validateSkillsSnapshot(bad), false, JSON.stringify(bad));
  assert.equal(copy.restore({ version: 1, skills: { birding: { xp: 'lots' } } }), false);
  assert.equal(copy.known('birding'), false, 'a refused restore leaves nothing learned');
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
