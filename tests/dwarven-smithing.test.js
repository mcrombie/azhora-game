import test from 'node:test';
import assert from 'node:assert/strict';
import { SKILLS, SKILL_IDS, MAX_XP, createSkills, skillTechniques, validateSkillsSnapshot } from '../src/gameplay/skills/skills.js';
import { filterSkills, skillCategory, createSkillsBrowser } from '../src/ui/skills/skills-browser.js';
import { skillIntroduction } from '../src/ui/skills/skill-announcement.js';

const read = skills => skills.view().find(skill => skill.id === 'dwarvenSmithing');

test('Dwarven Smithing is a guarded Smithing branch while ordinary skills remain available', () => {
  const skills = createSkills({ begins: SKILL_IDS }), before = skills.snapshot();
  assert.equal(SKILLS.dwarvenSmithing.parent, 'smithing');
  assert.equal(skillCategory({ id: 'dwarvenSmithing' }), 'Crafting');
  assert.equal(skills.known('smithing'), true); assert.equal(skills.level('smithing'), 1);
  assert.equal(skills.known('dwarvenSmithing'), false); assert.equal(skills.level('dwarvenSmithing'), 0);
  assert.equal(read(skills).learned, false); assert.equal(read(skills).parent, 'smithing');
  assert.equal(skills.gain('dwarvenSmithing', 30).ok, false);
  assert.deepEqual(skills.snapshot(), before, 'attempted unearned practice changes nothing');
  assert.ok(skills.gain('smithing', 18).ok); assert.ok(skills.gain('botany', 10).ok);
  assert.ok(read(skills).techniques.every(technique => !technique.learned));
});

test('the first guarded lesson records separate progress without manufacturing experience on repeat teaching', () => {
  const events = [], skills = createSkills({ onEvent: event => events.push(event) });
  assert.equal(skills.learn('dwarvenSmithing').first, true);
  assert.equal(read(skills).learned, true); assert.equal(skills.xp('dwarvenSmithing'), 0);
  assert.equal(skills.view().find(skill => skill.id === 'smithing').learned, true, 'the parent is present in the journal');
  skills.gain('smithing', 45); skills.gain('dwarvenSmithing', 30);
  assert.deepEqual([skills.xp('smithing'), skills.xp('dwarvenSmithing')], [45, 30]);
  const saved = skills.snapshot();
  assert.equal(skills.learn('dwarvenSmithing').first, false); assert.deepEqual(skills.snapshot(), saved);
  assert.equal(events.filter(e => e.type === 'skill-learned' && e.id === 'dwarvenSmithing').length, 1);
  assert.deepEqual(read(skills).techniques.map(t => [t.id, t.learned]), [['repair-riveting', true], ['further-techniques', false]]);
});

test('raising the specialization to its cap never grants the later quest techniques', () => {
  const skills = createSkills(); skills.learn('dwarvenSmithing'); skills.gain('dwarvenSmithing', MAX_XP);
  assert.equal(skills.level('dwarvenSmithing'), 99);
  assert.equal(read(skills).techniques.find(t => t.future).learned, false);
  assert.match(read(skills).techniques.find(t => t.future).detail, /future quests.*separate teaching/i);
  assert.deepEqual(skillTechniques('smithing'), []);
  assert.match(SKILLS.dwarvenSmithing.blurb, /heat.*fitted and peened.*quench/i);
  assert.match(skillIntroduction('dwarvenSmithing').controls, /Smithing → Dwarven Smithing/);
});

test('old checkpoints leave the specialization locked and learned checkpoints round-trip without an extra award', () => {
  const skills = createSkills({ begins: SKILL_IDS });
  const old = { version: 1, skills: { smithing: { xp: 174 } }, taught: ['smithing'] };
  assert.equal(validateSkillsSnapshot(old), true); assert.equal(skills.restore(old), true);
  assert.equal(skills.xp('smithing'), 174); assert.equal(skills.known('dwarvenSmithing'), false);
  assert.equal(skills.snapshot().skills.dwarvenSmithing, undefined);
  skills.learn('dwarvenSmithing'); skills.gain('dwarvenSmithing', 30);
  const saved = skills.snapshot(), copy = createSkills({ begins: SKILL_IDS });
  assert.equal(validateSkillsSnapshot(saved), true); assert.equal(copy.restore(saved), true);
  assert.deepEqual(copy.snapshot(), saved); assert.equal(copy.learn('dwarvenSmithing').first, false);
  assert.equal(copy.xp('dwarvenSmithing'), 30);
  assert.equal(validateSkillsSnapshot({ version: 1, skills: { dwarvenSmithing: { xp: 30 } }, taught: [] }), false);
  assert.equal(validateSkillsSnapshot({ version: 1, skills: {}, taught: ['dwarvenSmithing'] }), false);
});

test('the skill browser nests a matching specialization under Smithing, including filtered and searched views', () => {
  const skills = createSkills({ begins: SKILL_IDS });
  const all = filterSkills(skills.view(), { scope: 'all', category: 'Crafting' }).map(s => s.id);
  assert.equal(all[all.indexOf('smithing') + 1], 'dwarvenSmithing');
  assert.deepEqual(filterSkills(skills.view(), { scope: 'all', query: 'dwarven' }).map(s => s.id), ['smithing', 'dwarvenSmithing']);
  assert.deepEqual(filterSkills(skills.view(), { scope: 'all', query: 'smithing' }).map(s => s.id), ['smithing', 'dwarvenSmithing']);
  assert.deepEqual(filterSkills(skills.view(), { category: 'Crafting' }), []);
  skills.learn('dwarvenSmithing');
  assert.deepEqual(filterSkills(skills.view(), { category: 'Crafting' }).map(s => s.id), ['smithing', 'dwarvenSmithing']);
  assert.deepEqual(filterSkills(skills.view(), { scope: 'all', category: 'Combat', query: 'dwarven' }), []);
});

// A small DOM surface exercises the actual browser controls without importing
// the game's renderer or duplicating the browser's hierarchy and lesson logic.
class Node {
  constructor(tag) { this.tagName = tag; this.children = []; this.dataset = {}; this.attributes = {}; this.className = ''; this.scrollTop = 0; this.value = ''; this.text = ''; }
  set textContent(value) { this.text = value; this.children = []; }
  get textContent() { return this.text + this.children.map(child => child.textContent).join(''); }
  get childElementCount() { return this.children.length; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.text = ''; this.children = children; }
  setAttribute(name, value) { this.attributes[name] = value; }
  getAttribute(name) { return this.attributes[name]; }
  addEventListener() {}
  focus() {}
  querySelectorAll(selector) {
    const matches = node => selector === 'details[open]' ? node.tagName === 'details' && node.open
      : selector.startsWith('.') ? node.className.split(' ').includes(selector.slice(1)) : node.tagName === selector;
    const result = [];
    for (const child of this.children) { if (matches(child)) result.push(child); result.push(...child.querySelectorAll(selector)); }
    return result;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
}

test('the journal browser links parent and child and updates the first technique without opening future techniques', () => {
  const original = globalThis.document; globalThis.document = { createElement: tag => new Node(tag) };
  try {
    const mount = new Node('div'), skills = createSkills({ begins: SKILL_IDS });
    const browser = createSkillsBrowser({ mount }); browser.update({ skills: skills.view(), selectedId: 'dwarvenSmithing' });
    const row = mount.querySelectorAll('.skill-browser-row').find(node => node.dataset.skill === 'dwarvenSmithing');
    assert.equal(row.dataset.parentSkill, 'smithing'); assert.match(row.getAttribute('aria-label'), /specialization of Smithing/);
    assert.equal(mount.querySelector('.skill-browser-eyebrow').textContent, 'Smithing specialization');
    assert.match(mount.querySelector('.skill-browser-status').textContent, /Locked/);
    assert.ok(mount.querySelectorAll('.skill-browser-technique').every(node => node.dataset.learned === 'false'));
    mount.querySelector('.skill-browser-parent-link').onclick();
    assert.equal(browser.state().selectedId, 'smithing');
    mount.querySelector('.skill-browser-specialization-link').onclick();
    assert.equal(browser.state().selectedId, 'dwarvenSmithing');
    skills.learn('dwarvenSmithing'); skills.gain('dwarvenSmithing', 30); browser.update({ skills: skills.view() });
    assert.deepEqual(mount.querySelectorAll('.skill-browser-technique').map(node => [node.dataset.technique, node.dataset.learned]),
      [['repair-riveting', 'true'], ['further-techniques', 'false']]);
    assert.match(mount.querySelector('.skill-browser-xp').textContent, /30 total experience/);
  } finally { if (original === undefined) delete globalThis.document; else globalThis.document = original; }
});
