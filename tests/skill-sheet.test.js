import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SKILL_IDS, SKILLS, createSkills, skillTip } from '../src/skills.js';
import { SKILL_ICONS, skillIconSVG } from '../src/skill-icons.js';
import { hiddenSkillsIn } from '../src/game-mode.js';

const source = name => readFileSync(fileURLToPath(new URL(`../src/${name}`, import.meta.url)), 'utf8');
const HEAD = '<svg viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">';

test('twenty-four skills, twenty-four marks, drawn the way the satchel draws its items', () => {
  // The registry keeps every skill in the build, so a save that holds any of their experience
  // still validates. What the sheet draws is a mode's business (tests/game-mode.test.js).
  // Fourteen about the world, seven about fighting, and three about sorcery (src/sorcery.js) -
  // of which only Fire can be taught by anybody, and only by Ben.
  assert.equal(SKILL_IDS.length, 24, 'fourteen of the world, seven of fighting, three of sorcery');
  const shown = SKILL_IDS.filter(id => !hiddenSkillsIn('normal').includes(id));
  assert.equal(shown.length, 23, 'and normal mode draws twenty-three: all but the linguist’s');
  assert.equal(shown.filter(id => SKILLS[id].group === undefined).length, 13, 'thirteen ungrouped tiles');
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

test('the sheet is a grid of tiles, with each skill’s guide and log behind its own tile', () => {
  const main = source('main.js'), css = source('birding.css');
  assert.match(main, /function renderSkillGrid\(/, 'the grid');
  assert.match(main, /function renderSkillGuide\(/, 'the page behind a tile');
  assert.match(css, /#skills-sheet \.skill-grid\{[^}]*grid-template-columns:repeat\(3,1fr\)/, 'three columns');
  assert.match(css, /#skills-sheet \.skill-tile-total\{grid-column:span 1/, 'a total that is one cell unless the row it lands on wants more');
  // The total tile is appended after every ungrouped skill, which is what puts it on the row
  // below. The seven fighting skills are not in that grid: they have a heading of their own.
  assert.match(main, /for\(const skill of view\)if\(!SKILLS\[skill\.id\]\?\.group\)\{grid\.append\(skillTile\(skill\)\);ungrouped\+\+;\}[\s\S]{0,900}grid\.append\(total\)/,
    'the total level comes last');
  // Thirteen ungrouped tiles leave two cells of the last row, fourteen leave one, and the total
  // fills whatever is left, so the grid never ends in a hole.
  assert.match(main, /total\.style\.gridColumn=`span \$\{\(\(3-ungrouped%3\)%3\)\|\|1\}`/, 'the total fills out its row');
  assert.match(main, /sheet\.append\(skillEl\('h3','skill-heading',heading\)\)/, 'and a heading over each group');
  assert.match(css, /#skills-sheet \.skill-heading\{/, 'which is styled as a divider rather than a title');
  // A tile says its level out of the table's top, and carries a hairline bar.
  assert.match(main, /skill-tile-level',`\$\{skill\.learned\?skill\.level:0\} \/ \$\{skill\.top\}`/, 'level over the top of the table');
  assert.match(main, /skillProgressBar\(skill\.learned\?skill\.progress:0\)/, 'a bar on every tile');
  // The collection logs moved out of the stack of cards and into the skill's own page.
  assert.match(main, /function appendSkillLog\(card,skill\)\{[\s\S]*?Birds of Drent/, 'the logs live in one place now');
  assert.match(main, /function renderSkillGuide\([\s\S]{0,1400}appendSkillLog\(card,skill\)/, 'and are drawn on the page behind the tile');
  assert.doesNotMatch(main, /'skill-total'/, 'the old Total level line above a stack of cards is gone');
  assert.doesNotMatch(css, /\.skill-total\{/, 'and so is its rule');
  // A level-up banner flashes, and is a door into that skill's guide.
  assert.match(main, /banner\.classList\.add\('visible','flash'\)/, 'the flash');
  assert.match(css, /#level-up\.flash\{animation:level-flash/, 'and something for it to run');
  assert.match(main, /\$\('level-up'\)\.onclick=\(\)=>openSkillGuide\(levelUpSkill\)/, 'clicking it opens the guide');
  assert.match(main, /e\.code==='Enter'&&mode==='playing'&&levelUpSkill&&\$\('level-up'\)\.classList\.contains\('visible'\)/, 'and so does Enter while it is up');
});
