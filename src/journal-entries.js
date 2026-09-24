/** A journal is a record of the player's experiences, not a catalogue of future content. */
import { BRIDGE_QUEST, CLOSED, LIVE, questLive } from './quest-slate.js';

const gates = new Set([...LIVE, ...CLOSED]);
const types = new Set(['main', 'secondary', 'tertiary']);
const grades = { main: 'main', secondary: 'plot', tertiary: 'deed' };
const unstarted = new Set(['unmet', 'asked', 'offered', 'not-started']);
const unresolvedEndings = new Set(['abandoned', 'failed', 'lost', 'closed']);
const completed = entry => entry?.complete === true || ['complete', 'done', 'paid', 'taught'].includes(entry?.stage);
const list = value => Array.isArray(value) ? value : [];

// Keep passed-in navigation actions intact while isolating all data owned by the view.
function copy(value) {
  if (Array.isArray(value)) return value.map(copy);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copy(item)]));
  return value;
}

function allowed(entry, live) {
  if (!entry || entry.enabled === false) return false;
  const gate = entry.slateId ?? (gates.has(entry.id) ? entry.id : null);
  return !gate || live(gate);
}

function typeFor(entry, fallback = 'tertiary') {
  return types.has(entry.type) ? entry.type : entry.grade === 'main' ? 'main' : entry.grade === 'plot' ? 'secondary' : fallback;
}

function entryView(source, status, fallbackType) {
  const type = typeFor(source, fallbackType);
  const entry = { id: source.id, title: source.title, type, grade: grades[type], status,
    detail: typeof source.detail === 'string' ? source.detail : '' };
  for (const key of ['kicker', 'region', 'map', 'trackable', 'actions', 'steps', 'notes', 'rewards']) {
    if (source[key] !== undefined) entry[key] = copy(source[key]);
  }
  // Most quest views have a single instruction in detail. Do not print it a second time.
  if (typeof source.objective === 'string' && source.objective !== entry.detail) entry.objective = source.objective;
  if (source.stage === 'lead') entry.lead = true;
  return entry;
}

/**
 * Active quests come exclusively from the accepted tracker choices. Chapters and notes must
 * be supplied from already-discovered state by the host. Nothing here starts a quest, predicts
 * its next stage, or enumerates content from another region. `live` mirrors the quest slate.
 */
export function buildJournalEntries({ tracker = {}, mainSteps = [], completedChapters = [],
  bridge = null, spider = null, murder = null, cat = null, burying = null, vastos = null, drent = null, notes = [], live = questLive } = {}) {
  const entries = [], ids = new Set();
  function add(entry) {
    if (typeof entry?.id !== 'string' || !entry.id || typeof entry.title !== 'string' || !entry.title || ids.has(entry.id)) return;
    ids.add(entry.id); entries.push(entry);
  }

  for (const choice of list(tracker.choices)) {
    if (!allowed(choice, live) || unresolvedEndings.has(choice.stage)) continue;
    if (choice.id !== 'main' && unstarted.has(choice.stage)) continue;
    const status = completed(choice) ? 'complete' : 'active';
    const entry = entryView(choice, status, choice.id === 'main' ? 'main' : 'tertiary');
    if (choice.id === 'main' && list(mainSteps).length) entry.steps = copy(mainSteps);
    add(entry);
  }

  for (const chapter of list(completedChapters)) {
    if (allowed(chapter, live)) add(entryView({ ...chapter, type: 'main' }, 'complete', 'main'));
  }

  const bridgeState = typeof bridge === 'string' ? { stage: bridge } : bridge;
  if (bridgeState && allowed({ ...bridgeState, id: 'bridge' }, live) && completed(bridgeState)) {
    add(entryView({ id: 'bridge', title: BRIDGE_QUEST.title, type: 'tertiary', kicker: 'The Caloss crossing',
      detail: 'You repaired the crossing over the Caloss and reported back to Chip. The bridge is open again.' }, 'complete'));
  }

  if (burying?.stage === 'done' && allowed({ ...burying, id: 'lauvel-burying' }, live)) {
    add(entryView({ id: 'lauvel-burying', title: 'The burying at the Lauvel', type: 'tertiary', kicker: 'The Lauvel burial ground',
      detail: 'You helped the valley bury its dead, found Sela’s son Bevan, and carried him to his grave. His name is on the board.' }, 'complete'));
  }

  const endings = [
    { state: spider, id: 'ben-spider', title: 'The spider in the thorns', type: 'secondary',
      paid: 'You and Ben defeated the spider. You chose a share of the bounty.',
      taught: 'You and Ben defeated the spider. In return, Ben taught you your first lesson in fire.' },
    { state: murder, id: 'cobble-murder', title: 'The tally-keeper of Cobble', type: 'secondary',
      paid: 'You solved Bregga’s murder and accepted the guild’s purse from Troy.',
      taught: 'You solved Bregga’s murder. In return, Troy taught you the reading.' },
    { state: cat, id: 'liz-cat', title: 'Bring Mop home', type: 'tertiary',
      paid: 'You brought Mop safely home to Liz and accepted her coin.',
      taught: 'You brought Mop safely home to Liz. In return, she taught you how to summon the bees.' },
  ];
  for (const ending of endings) {
    // Death/loss is not a completed success and can happen without the player witnessing it.
    // Such events belong in explicit discovered notes, never a magically updated quest archive.
    if (!ending.state || !['paid', 'taught'].includes(ending.state.stage) || !allowed({ ...ending.state, id: ending.id }, live)) continue;
    add(entryView({ id: ending.id, title: ending.title, type: ending.type, detail: ending[ending.state.stage] }, 'complete'));
  }

  if (vastos && allowed({ ...vastos, id: 'civil-war-vastos' }, live) && completed(vastos)) {
    add(entryView({ ...vastos, id: 'civil-war-vastos', title: vastos.title || 'The Common Water', type: 'secondary',
      notes: vastos.notes ?? vastos.entries }, 'complete'));
  }

  if (drent && allowed({ ...drent, id: 'civil-war-drent' }, live) && completed(drent)) {
    const rewards = [['empire', 'Empire'], ['republic', 'Republic']]
      .filter(([id]) => Number.isFinite(drent.favor?.[id]) && drent.favor[id] > 0)
      .map(([id, faction]) => `${faction} favor +${drent.favor[id]}`);
    add(entryView({ ...drent, id: 'civil-war-drent', title: drent.title || 'Civil War in Drent', type: 'secondary',
      region: 'Drent', notes: drent.notes ?? drent.entries, rewards }, 'complete'));
  }

  for (const note of list(notes)) {
    if (note?.discovered !== true || !allowed(note, live)) continue;
    add({ ...entryView(note, 'note', 'tertiary'), type: 'note' });
  }
  return entries;
}
