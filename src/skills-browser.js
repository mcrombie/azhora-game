import { SKILLS } from './skills.js';
import { SCHOOLS, SPELLS } from './sorcery.js';

export const SKILL_CATEGORIES = Object.freeze(['Combat', 'Exploration', 'Crafting', 'Sorcery']);
const crafting = new Set(['cooking', 'woodcutting', 'construction', 'farming']);

export function skillCategory(skill) {
  const group = SKILLS[skill.id]?.group;
  if (group === 'Arms') return 'Combat';
  if (group === 'Sorcery') return 'Sorcery';
  return crafting.has(skill.id) ? 'Crafting' : 'Exploration';
}

/** Spell lessons are distinct from skill levels, teaching flags and experience. */
export function schoolSpells(skill, learnedSpells = []) {
  return (SCHOOLS[skill.id]?.spells ?? []).map(id => ({ id, name: SPELLS[id].name, learned: learnedSpells.includes(id) }));
}

// Most ordinary skills start available at level one. That is not the same as
// having tried them: do not turn the first journal into a catalogue of promises.
export function practicedSkill(skill) {
  return Boolean(skill.taught || skill.xp > 0);
}

export function filterSkills(skills, { scope = 'practiced', category = 'all', query = '' } = {}) {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return skills.filter(skill => !SKILLS[skill.id]?.reserved && (scope === 'all' || practicedSkill(skill))
    && (category === 'all' || skillCategory(skill) === category)
    && words.every(word => `${skill.name} ${skillCategory(skill)}`.toLocaleLowerCase().includes(word)))
    .slice().sort((a, b) => SKILL_CATEGORIES.indexOf(skillCategory(a)) - SKILL_CATEGORIES.indexOf(skillCategory(b))
      || a.name.localeCompare(b.name));
}

const element = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const number = value => Math.max(0, Number(value) || 0).toLocaleString();

/** A stable list-and-detail browser. It only reads skill state; no learning or XP is awarded here. */
export function createSkillsBrowser({ mount, icon, renderLog = () => {}, onSelect = () => {}, getLearnedSpells = () => [] }) {
  const browser = element('div', 'skills-browser');
  const sidebar = element('aside', 'skill-browser-sidebar');
  sidebar.setAttribute('aria-label', 'Find a skill');
  const filters = element('div', 'skill-browser-filters');
  const searchLabel = element('label', 'skill-browser-search-label', 'Find a skill');
  const search = element('input', 'skill-browser-search');
  search.type = 'search'; search.placeholder = 'Search skills'; search.autocomplete = 'off';
  searchLabel.append(search);
  const scopes = element('div', 'skill-browser-scopes');
  scopes.setAttribute('aria-label', 'Skills shown');
  const scopeButtons = new Map();
  for (const [id, label] of [['practiced', 'Practiced'], ['all', 'All skills']]) {
    const button = element('button', 'skill-browser-scope', label);
    button.type = 'button'; button.dataset.scope = id;
    button.onclick = () => { scope = id; refresh(); };
    scopes.append(button); scopeButtons.set(id, button);
  }
  const categoryLabel = element('label', 'skill-browser-category-label', 'Category');
  const categorySelect = element('select', 'skill-browser-category');
  for (const [value, label] of [['all', 'All categories'], ...SKILL_CATEGORIES.map(value => [value, value])]) {
    const option = element('option', '', label); option.value = value; categorySelect.append(option);
  }
  categoryLabel.append(categorySelect);
  filters.append(searchLabel, scopes, categoryLabel);
  const count = element('p', 'skill-browser-count'); count.setAttribute('aria-live', 'polite');
  const list = element('div', 'skill-browser-list'); list.setAttribute('aria-label', 'Skills');
  const detail = element('section', 'skill-browser-detail'); detail.tabIndex = 0;
  detail.setAttribute('aria-label', 'Selected skill guide');
  sidebar.append(filters, count, list); browser.append(sidebar, detail); mount.replaceChildren(browser);

  let entries = [], selectedId = null, scope = 'practiced', category = 'all', query = '';
  let visible = [], renderedId = null;
  search.oninput = () => { query = search.value; refresh(); };
  categorySelect.onchange = () => { category = categorySelect.value; refresh(); };

  function mark(skill) {
    const holder = element('span', 'skill-browser-icon'); holder.setAttribute('aria-hidden', 'true');
    const graphic = icon?.(skill); if (graphic) holder.append(graphic);
    return holder;
  }

  function select(id, { focus = false } = {}) {
    const skill = entries.find(entry => entry.id === id);
    if (!skill) return false;
    if (!visible.some(entry => entry.id === id)) {
      scope = practicedSkill(skill) ? 'practiced' : 'all'; category = 'all'; query = '';
      search.value = ''; categorySelect.value = 'all';
    }
    selectedId = id; refresh(); onSelect(id);
    if (focus) list.querySelector(`[data-skill="${id}"]`)?.focus();
    return true;
  }

  list.addEventListener('keydown', event => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || !visible.length) return;
    const at = Math.max(0, visible.findIndex(skill => skill.id === selectedId));
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? visible.length - 1
      : Math.max(0, Math.min(visible.length - 1, at + (event.key === 'ArrowDown' ? 1 : -1)));
    event.preventDefault(); event.stopPropagation(); select(visible[next].id, { focus: true });
  });

  function renderList() {
    const scrollTop = list.scrollTop;
    list.replaceChildren();
    if (!visible.length) {
      list.append(element('p', 'skill-browser-list-empty', entries.length ? 'No matching skills.' : 'No skills to show.'));
      return;
    }
    for (const group of SKILL_CATEGORIES) {
      const rows = visible.filter(skill => skillCategory(skill) === group);
      if (!rows.length) continue;
      const section = element('section', 'skill-browser-group');
      section.append(element('h3', 'skill-browser-group-title', group));
      for (const skill of rows) {
        const button = element('button', 'skill-browser-row'); button.type = 'button'; button.dataset.skill = skill.id;
        button.setAttribute('aria-pressed', String(skill.id === selectedId));
        button.tabIndex = skill.id === selectedId ? 0 : -1;
        button.append(mark(skill), element('span', 'skill-browser-name', skill.name));
        button.onclick = () => select(skill.id, { focus: true });
        section.append(button);
      }
      list.append(section);
    }
    list.scrollTop = scrollTop;
  }

  function disclosure(title, className) {
    const block = element('details', className);
    block.append(element('summary', '', title)); return block;
  }

  function renderDetail(skill) {
    const oldScroll = skill?.id === renderedId ? detail.scrollTop : 0;
    const openSections = skill?.id === renderedId ? [...detail.querySelectorAll('details[open]')].map(node => node.className) : [];
    detail.replaceChildren(); renderedId = skill?.id ?? null;
    if (!skill) {
      const empty = element('div', 'skill-browser-empty');
      const untouched = scope === 'practiced' && !entries.some(practicedSkill) && !query && category === 'all';
      empty.append(element('h3', '', untouched ? 'Learn by doing' : 'No skills match these filters'),
        element('p', '', untouched ? 'Skills you have used or studied appear here. Your progress grows as you practice them.' : 'Try another name or category, or browse all skills.'));
      const showAll = element('button', 'skill-browser-show-all', 'Browse all skills'); showAll.type = 'button';
      showAll.onclick = () => { scope = 'all'; category = 'all'; query = ''; search.value = ''; categorySelect.value = 'all'; refresh(); };
      empty.append(showAll); detail.append(empty); return;
    }
    const heading = element('header', 'skill-browser-heading'), names = element('div');
    names.append(element('p', 'skill-browser-eyebrow', skillCategory(skill)), element('h3', '', skill.name));
    heading.append(mark(skill), names); detail.append(heading);
    detail.append(element('p', 'skill-browser-blurb', skill.blurb));
    if (practicedSkill(skill)) {
      const progress = element('section', 'skill-browser-progress'); progress.setAttribute('aria-label', 'Skill progress');
      const line = element('div', 'skill-browser-progress-line');
      line.append(element('strong', '', `Level ${skill.level}`), element('span', '', skill.max ? 'Maximum level' : `${number(skill.next - skill.xp)} XP to level ${skill.level + 1}`));
      const bar = element('progress', 'skill-browser-progress-bar'); bar.max = 1; bar.value = skill.progress;
      bar.setAttribute('aria-label', `Progress to level ${skill.level + 1}`);
      progress.append(line, bar, element('p', 'skill-browser-xp', `${number(skill.xp)} total experience`));
      detail.append(progress);
    } else {
      detail.append(element('p', 'skill-browser-status', skillCategory(skill) === 'Sorcery'
        ? `Level ${Math.max(1, skill.level)} · no sorcery experience yet`
        : skill.learned ? 'Ready to try · no experience yet' : 'Not learned yet'));
    }
    const spells = schoolSpells(skill, getLearnedSpells());
    if (spells.length) {
      const block = element('section', 'skill-browser-spells');
      block.append(element('h4', '', 'Spells'));
      for (const spell of spells) {
        const row = element('div', 'skill-browser-spell');
        row.dataset.spell = spell.id; row.dataset.learned = String(spell.learned);
        row.append(element('strong', '', spell.name), element('span', 'skill-browser-spell-status', spell.learned ? 'Learned' : 'Not learned'));
        block.append(row);
      }
      if (spells.some(spell => !spell.learned)) block.append(element('p', '', `Learn from ${skill.teacher}.`));
      else block.append(element('p', '', 'Equip a wand or staff to cast. Spells use focus.'));
      block.append(element('p', 'skill-browser-spell-note', 'Sorcery experience improves learned spells. Gaining a level does not unlock a spell.'));
      detail.append(block);
    }
    if (!spells.length && !skill.xp && skill.teacher) {
      const learn = element('section', 'skill-browser-learning');
      const instruction = skill.teacher === 'nobody yet' ? 'No teacher has been found for this skill yet.'
        : skill.id === 'toughness' ? 'This skill improves by taking hits and surviving a fight.' : `Learn more from ${skill.teacher}.`;
      learn.append(element('h4', '', 'Getting started'), element('p', '', instruction));
      detail.append(learn);
    }
    const guide = skill.guide ?? [], next = guide.find(entry => !entry.open);
    if (next) {
      const milestone = element('section', 'skill-browser-next');
      milestone.append(element('h4', '', `Next milestone · level ${next.level}`), element('p', '', next.text)); detail.append(milestone);
    }
    if (guide.length) {
      const block = disclosure('Level milestones', 'skill-browser-milestones'), milestones = element('ol', 'skill-browser-milestone-list');
      for (const entry of guide) {
        const row = element('li', entry.open ? 'available' : 'future');
        row.append(element('span', 'skill-browser-milestone-level', `Lv ${entry.level}`), element('span', '', entry.text)); milestones.append(row);
      }
      block.append(milestones); detail.append(block);
    }
    const collections = disclosure('Field notes & collections', 'skill-browser-collections'), log = element('div', 'skill-browser-log');
    renderLog(log, skill);
    if (log.childElementCount) { collections.append(log); detail.append(collections); }
    for (const section of detail.querySelectorAll('details')) section.open = openSections.includes(section.className);
    detail.scrollTop = oldScroll;
  }

  function refresh() {
    visible = filterSkills(entries, { scope, category, query });
    if (!visible.some(skill => skill.id === selectedId)) selectedId = visible[0]?.id ?? null;
    for (const [id, button] of scopeButtons) button.setAttribute('aria-pressed', String(scope === id));
    count.textContent = `${visible.length} ${visible.length === 1 ? 'skill' : 'skills'}${scope === 'practiced' ? ' practiced' : ''}`;
    renderList(); renderDetail(visible.find(skill => skill.id === selectedId));
  }

  function update({ skills, selectedId: requestedId } = {}) {
    if (Array.isArray(skills)) entries = skills;
    if (requestedId && entries.some(skill => skill.id === requestedId)) return select(requestedId);
    refresh(); return true;
  }
  return { update, select, state: () => ({ selectedId, scope, category, query, visibleIds: visible.map(skill => skill.id) }) };
}
