import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SKILL_IDS, SKILLS, createSkills, skillTip } from '../src/skills.js';
import { SKILL_ICONS, skillIconSVG } from '../src/skill-icons.js';
import { hiddenSkillsIn } from '../src/game-mode.js';

const source = name => readFileSync(fileURLToPath(new URL(`../src/${name}`, import.meta.url)), 'utf8');
const HEAD = '<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">';

test('thirty-two skills, thirty-two marks, drawn the way the satchel draws its items', () => {
  // The registry keeps every skill in the build, so a save that holds any of their experience
  // still validates. What the sheet draws is a mode's business (tests/game-mode.test.js).
  // Twenty about the world, seven about fighting, and five about sorcery (src/sorcery.js) -
  // of which three can be taught, one teacher each: Ben fire, Troy mind, Liz beast.
  assert.equal(SKILL_IDS.length, 32, 'twenty of the world, seven of fighting, five of sorcery');
  const shown = SKILL_IDS.filter(id => !hiddenSkillsIn('normal').includes(id));
  assert.equal(shown.length, 31, 'and normal mode keeps thirty-one: all but the linguist’s');
  assert.equal(shown.filter(id => SKILLS[id].group === undefined).length, 19, 'nineteen ungrouped skills');
  assert.deepEqual(Object.keys(SKILL_ICONS), [...SKILL_IDS], 'one mark each, in the skills’ own order');
  const seen = new Set();
  for (const id of SKILL_IDS) {
    const inner = SKILL_ICONS[id];
    assert.ok(/<(path|circle|ellipse|rect)\b/.test(inner), `${id} draws something`);
    assert.doesNotMatch(inner, /fill="(?!none)/, `${id} is line art, not a filled shape`);
    assert.doesNotMatch(inner, /stroke="/, `${id} takes its colour from the tile it sits in`);
    assert.ok(skillIconSVG(id).startsWith(HEAD), `${id} is drawn in the satchel's box`);
    assert.ok(!seen.has(inner), `${id} has a mark of its own`);
    seen.add(inner);
  }
  assert.equal(skillIconSVG('juggling'), `${HEAD}</svg>`, 'a skill that does not exist draws nothing');
});
test('the hover line is RuneScape’s: what you have, what the next level wants, and the difference', () => {
  const skills = createSkills(), view = id => skills.view().find(entry => entry.id === id);
  assert.equal(skillTip(view('birding')), `Not yet learned · ${SKILLS.birding.teacher}`);
  skills.learn('birding'); skills.gain('birding', 140);
  assert.equal(skillTip(view('birding')), 'Birding XP: 140 · Next level at: 174 · Remaining XP: 34');
  skills.gain('birding', 200_000_000);
  assert.equal(skillTip(view('birding')), 'Birding XP: 200000000 · Next level at: — · Remaining XP: 0');
});
