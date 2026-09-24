/** A journal index: reading a quest is separate from choosing a tracked objective. */
const STATUSES = ['active', 'complete', 'note'];
const TYPES = { main: { label: 'Main quest', grade: 'main', order: 0 }, secondary: { label: 'Secondary quest', grade: 'plot', order: 1 }, tertiary: { label: 'Tertiary quest', grade: 'deed', order: 2 } };
const STATUS_LABELS = { active: 'Active', complete: 'Completed', note: 'Notes' };
const text = value => typeof value === 'string' ? value.trim() : '';
const notesText = value => Array.isArray(value) ? value.map(text).filter(Boolean).join('\n\n') : text(value);
let browserSerial = 0;

/** Unknown/unaccepted quest states are deliberately absent from the journal. */
export function normalizeJourneyEntries(source = []) {
  const seen = new Set();
  return (Array.isArray(source) ? source : []).flatMap(entry => {
    if (!entry || !text(entry.id) || !text(entry.title) || !STATUSES.includes(entry.status) || seen.has(entry.id)) return [];
    seen.add(entry.id);
    const type = Object.hasOwn(TYPES, entry.type) ? entry.type : 'tertiary';
    return [Object.freeze({
      id: entry.id, title: text(entry.title), type, grade: TYPES[type].grade, status: entry.status,
      detail: text(entry.detail), objective: text(entry.objective), region: text(entry.region), kicker: text(entry.kicker),
      notes: notesText(entry.notes), map: entry.map === true, trackable: entry.trackable !== false, lead: entry.lead === true,
      rewards: Object.freeze((Array.isArray(entry.rewards) ? entry.rewards : []).map(text).filter(Boolean)),
      steps: Object.freeze((Array.isArray(entry.steps) ? entry.steps : []).filter(step => text(step?.text)).map(step => Object.freeze({ text: text(step.text), done: !!step.done }))),
      actions: Object.freeze((Array.isArray(entry.actions) ? entry.actions : []).filter(action => text(action?.id) && text(action?.label)).map(action => Object.freeze({ id: text(action.id), label: text(action.label) }))),
    })];
  }).sort((a, b) => TYPES[a.type].order - TYPES[b.type].order);
}

/** Pure selection/filter state for the journal. It never changes trackedId. */
export function createJourneyIndex() {
  let entries = [], trackedId = 'main', selectedId = null, status = 'active', query = '';
  const filtered = () => entries.filter(entry => entry.status === status && `${entry.title} ${entry.region} ${entry.detail} ${entry.objective} ${entry.notes}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
    .sort((a, b) => status === 'active' ? Number(b.id === trackedId) - Number(a.id === trackedId) : 0);
  function reconcile() {
    const visible = filtered();
    if (!visible.some(entry => entry.id === selectedId)) selectedId = visible.find(entry => entry.id === trackedId)?.id ?? visible[0]?.id ?? null;
  }
  function view() {
    reconcile();
    return { entries: [...entries], visible: filtered(), selected: entries.find(entry => entry.id === selectedId) ?? null, selectedId, trackedId, status, query,
      counts: Object.fromEntries(STATUSES.map(value => [value, entries.filter(entry => entry.status === value).length])) };
  }
  function update(source = {}) { entries = normalizeJourneyEntries(source.entries); trackedId = text(source.trackedId) || 'main'; return view(); }
  function select(id) { if (filtered().some(entry => entry.id === id)) selectedId = id; return view(); }
  function filter(value) { if (STATUSES.includes(value)) { status = value; query = ''; } return view(); }
  function search(value) { query = text(value); return view(); }
  function open(options = {}) {
    if (options.id) {
      const entry = entries.find(item => item.id === options.id);
      if (entry) { selectedId = entry.id; status = entry.status; query = ''; }
    } else if (STATUSES.includes(options.status)) { status = options.status; query = ''; }
    return view();
  }
  function reset() { status = 'active'; query = ''; selectedId = null; return view(); }
  return { update, select, filter, search, open, reset, view };
}

export function createJourneyBrowser({ mount, onTrack = () => {}, onMap = null, onAction = null } = {}) {
  if (!mount) throw new TypeError('The journey browser needs a mount element.');
  const document = mount.ownerDocument, index = createJourneyIndex(), serial = ++browserSerial;
  let renderedKey = '';
  const el = (tag, className = '', value = '') => {
    const node = document.createElement(tag); node.className = className; node.textContent = value; return node;
  };
  const button = (className, value) => { const node = el('button', className, value); node.type = 'button'; return node; };
  mount.classList.add('journey-browser');
  const toolbar = el('div', 'journey-toolbar'), filters = el('div', 'journey-filters');
  filters.setAttribute('role', 'group'); filters.setAttribute('aria-label', 'Journal entries');
  const filterButtons = {};
  for (const status of STATUSES) {
    const control = button('journey-filter', STATUS_LABELS[status]); control.dataset.status = status;
    control.onclick = () => { index.filter(status); searchInput.value = ''; render(); };
    filters.append(control); filterButtons[status] = control;
  }
  const searchLabel = el('label', 'journey-search'), searchInput = el('input');
  searchLabel.append(el('span', 'journey-sr-only', 'Search the journal'));
  searchInput.type = 'search'; searchInput.placeholder = 'Search quests'; searchInput.autocomplete = 'off';
  searchInput.setAttribute('aria-label', 'Search the journal');
  searchInput.oninput = () => { index.search(searchInput.value); render(); };
  searchLabel.append(searchInput); toolbar.append(filters, searchLabel);
  const columns = el('div', 'journey-columns'), sidebar = el('div', 'journey-sidebar'), list = el('div', 'journey-entry-list');
  list.setAttribute('aria-label', 'Quest list'); list.setAttribute('role', 'group');
  const summary = el('p', 'journey-result-count'); summary.setAttribute('role', 'status');
  const detail = el('article', 'journey-reading'); detail.id = `journey-reading-${serial}`;
  const focusHelp = el('p', 'journey-focus-help', 'Focus a quest to follow it on the left and on the map. Your other quests stay available.');
  sidebar.append(list, summary); columns.append(sidebar, detail); mount.replaceChildren(toolbar, focusHelp, columns);

  function renderDetail(entry, state) {
    detail.replaceChildren(); detail.scrollTop = 0;
    delete detail.dataset.entryId; delete detail.dataset.grade; detail.removeAttribute('aria-labelledby');
    if (!entry) {
      const empty = el('div', 'journey-empty');
      empty.append(el('h3', '', state.query ? 'No matches' : state.status === 'complete' ? 'A story still unfolding' : state.status === 'note' ? 'Your notebook is empty' : 'No active quests'));
      empty.append(el('p', '', state.query ? 'Try a different name or place.' : state.status === 'complete' ? 'Finished quests will be kept here.' : state.status === 'note' ? 'People you meet and places you explore will leave their stories here.' : 'New quests appear here when you begin them.'));
      detail.append(empty); return;
    }
    detail.dataset.entryId = entry.id; detail.dataset.grade = entry.grade;
    const meta = el('div', 'journey-reading-meta');
    meta.append(el('span', 'journey-kind', entry.status === 'note' ? 'Field notes' : TYPES[entry.type].label));
    if (entry.region) meta.append(el('span', '', entry.region));
    if (entry.status === 'complete') meta.append(el('span', 'journey-completed-badge', 'Completed'));
    else if (entry.status === 'active' && entry.id === state.trackedId) meta.append(el('span', 'journey-tracked-badge', 'Focused'));
    if (entry.lead) meta.append(el('span', 'journey-lead-badge', 'Optional lead'));
    const title = el('h3', 'journey-reading-title', entry.title); title.id = `${detail.id}-title`; detail.setAttribute('aria-labelledby', title.id);
    detail.append(meta, title);
    const objective = entry.objective || (entry.status === 'active' ? entry.detail : '');
    if (objective) {
      const block = el('section', 'journey-next-step');
      block.append(el('h4', '', entry.lead ? 'Optional next step' : entry.status === 'active' ? 'Current objective' : 'Outcome'), el('p', '', objective));
      detail.append(block);
    }
    const actions = el('div', 'journey-reading-actions');
    if (entry.status === 'active' && entry.trackable) {
      const track = button('journey-track', entry.id === state.trackedId ? 'Focused' : 'Focus this quest');
      track.disabled = entry.id === state.trackedId; track.dataset.trackId = entry.id;
      track.onclick = () => onTrack(entry.id); actions.append(track);
    }
    if (onMap && entry.map) { const map = button('journey-map', 'Show on map'); map.onclick = () => onMap(entry.id); actions.append(map); }
    for (const action of entry.actions) if (onAction) { const item = button('journey-action', action.label); item.onclick = () => onAction(action.id, entry.id); actions.append(item); }
    if (actions.childElementCount) detail.append(actions);
    if (entry.lead) detail.append(el('p', 'journey-lead-help', 'Following this lead does not accept the quest. Talk to the quest giver to decide.'));
    if (entry.rewards.length) {
      const rewards = el('section', 'journey-rewards'); rewards.append(el('h4', '', 'Earned'));
      for (const reward of entry.rewards) rewards.append(el('p', '', reward));
      detail.append(rewards);
    }
    const remaining = entry.steps.filter(step => !step.done), finished = entry.steps.filter(step => step.done);
    if (remaining.length) {
      const steps = el('section', 'journey-objectives'); steps.append(el('h4', '', 'Your next steps'));
      const stepsList = el('ul');
      for (const step of remaining) stepsList.append(el('li', '', step.text));
      steps.append(stepsList); detail.append(steps);
    }
    const body = entry.detail && entry.detail !== objective ? entry.detail : '';
    if (entry.status === 'note' || entry.status === 'complete') {
      if (body) detail.append(el('p', 'journey-account', body));
      if (entry.notes) detail.append(el('p', 'journey-account', entry.notes));
    } else if (body || entry.notes) {
      const notes = el('details', 'journey-history'); notes.append(el('summary', '', 'Journal notes'));
      if (body) notes.append(el('p', '', body)); if (entry.notes) notes.append(el('p', '', entry.notes));
      detail.append(notes);
    }
    if (finished.length) {
      const history = el('details', 'journey-history'); history.append(el('summary', '', `Completed steps (${finished.length})`));
      const historyList = el('ul');
      for (const step of finished) historyList.append(el('li', '', `✓ ${step.text}`));
      history.append(historyList); detail.append(history);
    }
  }
  function render() {
    const state = index.view();
    const key = JSON.stringify([state.entries, state.selectedId, state.trackedId, state.status, state.query]);
    if (key === renderedKey) return;
    renderedKey = key;
    for (const status of STATUSES) {
      filterButtons[status].textContent = `${STATUS_LABELS[status]} ${state.counts[status]}`;
      filterButtons[status].setAttribute('aria-pressed', String(state.status === status));
    }
    searchInput.placeholder = state.status === 'note' ? 'Search notes' : 'Search quests';
    const oldFocus = document.activeElement?.dataset?.entryId;
    list.replaceChildren();
    for (const entry of state.visible) {
      const row = button('journey-entry'); row.dataset.entryId = entry.id; row.dataset.grade = entry.grade;
      row.dataset.focused = String(entry.status === 'active' && entry.id === state.trackedId);
      row.setAttribute('aria-pressed', String(entry.id === state.selectedId)); row.setAttribute('aria-controls', detail.id);
      row.tabIndex = entry.id === state.selectedId ? 0 : -1;
      const icon = el('span', 'journey-entry-icon', entry.status === 'note' ? '·' : '◆'); icon.setAttribute('aria-hidden', 'true');
      const words = el('span', 'journey-entry-words'); words.append(el('strong', '', entry.title));
      const secondary = [entry.status === 'note' ? 'Field notes' : TYPES[entry.type].label, entry.lead ? 'Optional lead' : '', entry.region].filter(Boolean).join(' · ');
      words.append(el('span', 'journey-entry-meta', secondary)); row.append(icon, words);
      if (entry.status === 'active' && entry.id === state.trackedId) { const tracked = el('span', 'journey-entry-tracking', 'Focused'); row.append(tracked); }
      row.onclick = () => { index.select(entry.id); render(); };
      list.append(row);
    }
    summary.textContent = state.query ? `${state.visible.length} ${state.status === 'note' ? 'notes' : 'quests'} found` : state.status === 'active' ? 'Your quests and leads. Choose which to follow.' : state.status === 'complete' ? 'A record of the quests you have finished.' : 'People, places, and discoveries.';
    renderDetail(state.selected, state);
    if (oldFocus) [...list.children].find(row => row.dataset.entryId === state.selectedId)?.focus({ preventScroll: true });
  }
  list.onkeydown = event => {
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    const state = index.view(); if (!state.visible.length) return;
    event.preventDefault();
    let i = state.visible.findIndex(entry => entry.id === state.selectedId);
    i = event.key === 'Home' ? 0 : event.key === 'End' ? state.visible.length - 1 : Math.max(0, Math.min(state.visible.length - 1, i + (event.key === 'ArrowDown' ? 1 : -1)));
    index.select(state.visible[i].id); render();
    const row = [...list.children].find(item => item.dataset.entryId === state.visible[i].id);
    row?.focus({ preventScroll: true }); row?.scrollIntoView({ block: 'nearest' });
  };
  function update(source) { index.update(source); render(); return index.view(); }
  function select(id) { index.open({ id }); searchInput.value = ''; render(); return index.view(); }
  function open(options) { index.open(options); searchInput.value = index.view().query; render(); return index.view(); }
  function reset() { index.reset(); searchInput.value = ''; render(); return index.view(); }
  render();
  return { update, select, open, reset, view: index.view };
}
