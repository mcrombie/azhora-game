import test from 'node:test';
import assert from 'node:assert/strict';
import { SKILLS, SKILL_IDS, createSkills } from '../src/skills.js';
import { SKILL_CATEGORIES, skillCategory, practicedSkill, filterSkills, schoolSpells } from '../src/skills-browser.js';

test('the default skill view excludes available but untouched skills without changing them', () => {
  const skills = createSkills({ begins: SKILL_IDS });
  const before = skills.snapshot();
  assert.equal(filterSkills(skills.view()).length, 0);
  assert.equal(filterSkills(skills.view(), { scope: 'all' }).length, SKILL_IDS.filter(id => !SKILLS[id].reserved).length);
  assert.deepEqual(skills.snapshot(), before);
  skills.learn('birding');
  assert.deepEqual(filterSkills(skills.view()).map(skill => skill.id), ['birding']);
  skills.gain('blades', 12);
  assert.deepEqual(filterSkills(skills.view()).map(skill => skill.id), ['blades', 'birding']);
});

test('every skill has an accurate category, including all sorcery schools and heavy arms', () => {
  for (const id of SKILL_IDS) assert.ok(SKILL_CATEGORIES.includes(skillCategory({ id })), id);
  assert.equal(skillCategory({ id: 'heavy-arms' }), 'Combat');
  assert.equal(skillCategory({ id: 'fire' }), 'Sorcery');
  assert.equal(skillCategory({ id: 'wards' }), 'Sorcery');
  assert.equal(skillCategory({ id: 'woodcutting' }), 'Crafting');
  assert.equal(skillCategory({ id: 'archaeology' }), 'Exploration');
});

test('search intersects category and practiced filters without leaking teacher quest spoilers', () => {
  const skills = createSkills({ begins: SKILL_IDS });
  skills.learn('fire'); skills.learn('fishing');
  assert.deepEqual(filterSkills(skills.view(), { query: ' FI ' }).map(skill => skill.id), ['fishing', 'fire']);
  assert.deepEqual(filterSkills(skills.view(), { query: 'fi', category: 'Sorcery' }).map(skill => skill.id), ['fire']);
  assert.equal(filterSkills(skills.view(), { scope: 'all', query: 'spider' }).length, 0);
  assert.equal(practicedSkill({ learned: true, taught: false, xp: 0 }), false);
});

test('Sorcery lists the three released schools while keeping reserved save data intact', () => {
  const skills = createSkills({ begins: SKILL_IDS });
  skills.gain('frost', 83);
  const saved = skills.snapshot();
  const rows = filterSkills(skills.view(), { scope: 'all', category: 'Sorcery' });
  assert.deepEqual(rows.map(skill => [skill.id, skill.name]), [
    ['beast', 'Animal Sorcery'], ['fire', 'Fire Sorcery'], ['mind', 'Mind Sorcery'],
  ]);
  assert.deepEqual(skills.snapshot(), saved, 'browsing never deletes an old school’s experience');
  assert.equal(saved.skills.frost.xp, 83);
  assert.deepEqual(filterSkills(skills.view(), { scope: 'all', query: 'animal' }).map(skill => skill.id), ['beast']);
});

test('the spell guide uses actual spell knowledge rather than a seeded or taught skill', () => {
  const skills = createSkills({ begins: SKILL_IDS });
  skills.learn('fire'); skills.gain('fire', 174);
  const fire = skills.view().find(skill => skill.id === 'fire');
  assert.equal(fire.level, 3);
  assert.deepEqual(schoolSpells(fire), [{ id: 'fireball', name: 'Fireball', learned: false }]);
  assert.deepEqual(schoolSpells(fire, ['mindread']), [{ id: 'fireball', name: 'Fireball', learned: false }]);
  assert.deepEqual(schoolSpells(fire, ['fireball']), [{ id: 'fireball', name: 'Fireball', learned: true }]);
  assert.deepEqual(schoolSpells({ id: 'beast' }, ['summon-bees']), [{ id: 'summon-bees', name: 'Summon Bees', learned: true }]);
});
