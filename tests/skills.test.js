import test from 'node:test';
import assert from 'node:assert/strict';
import { SKILLS, SKILL_IDS, createSkills, skillLevel, validateSkillsSnapshot } from '../src/skills.js';

test('levels are read from the thresholds, with progress toward the next', () => {
  assert.deepEqual(SKILL_IDS, ['birding', 'fishing', 'botany', 'geology', 'mycology']);
  for (const id of SKILL_IDS) assert.ok(SKILLS[id].teacher && SKILLS[id].blurb, `${id} says who teaches it`);
  const table = SKILLS.birding.thresholds;
  assert.ok(table.every((xp, i) => i === 0 ? xp === 0 : xp > table[i - 1]), 'thresholds rise');
  assert.equal(skillLevel('birding', 0).level, 1);
  assert.equal(skillLevel('birding', 19).level, 1);
  assert.equal(skillLevel('birding', 20).level, 2);
  assert.equal(skillLevel('birding', 90).level, 4, 'Drent’s five birds together reach level 4');
  assert.equal(skillLevel('birding', 35).progress, .5);
  const top = skillLevel('birding', 10000);
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
  assert.deepEqual([skills.gain('birding', 15).levelled, skills.level('birding')], [false, 1]);
  const up = skills.gain('birding', 15);
  assert.deepEqual([up.levelled, up.level, up.xp], [true, 2, 30]);
  assert.deepEqual(events.map(e => e.type), ['skill-learned', 'skill-gain', 'skill-gain']);
  const view = skills.view().find(skill => skill.id === 'birding');
  assert.deepEqual([view.learned, view.level, view.xp, view.next], [true, 2, 30, 50]);
});

test('skills survive a save, and nonsense is refused', () => {
  const skills = createSkills();
  skills.learn('birding'); skills.gain('birding', 55);
  const copy = createSkills();
  assert.equal(copy.restore(skills.snapshot()), true);
  assert.deepEqual(copy.snapshot(), { version: 1, skills: { birding: { xp: 55 } } });
  assert.equal(copy.level('birding'), 3);
  assert.equal(validateSkillsSnapshot(undefined), true, 'older saves have no skills');
  for (const bad of [null, [], { version: 2, skills: {} }, { version: 1, skills: { juggling: { xp: 1 } } }, { version: 1, skills: { birding: { xp: -1 } } }, { version: 1, skills: { birding: { xp: 1.5 } } }])
    assert.equal(validateSkillsSnapshot(bad), false, JSON.stringify(bad));
  assert.equal(copy.restore({ version: 1, skills: { birding: { xp: 'lots' } } }), false);
  assert.equal(copy.known('birding'), false, 'a refused restore leaves nothing learned');
});
