/** A journal is a record of the player's experiences, not a catalogue of future content. */
import { BRIDGE_QUEST, CLOSED, LIVE, RETIRED, questLive } from './quest-slate.js';

const gates = new Set([...LIVE, ...CLOSED]);
const types = new Set(['main', 'secondary', 'tertiary', 'skill']);
const grades = { main: 'main', secondary: 'plot', tertiary: 'deed', skill: 'skill' };
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
  if (!entry || entry.enabled === false || RETIRED.includes(entry.slateId ?? entry.id)) return false;
  const gate = entry.slateId ?? (gates.has(entry.id) ? entry.id : null);
  return !gate || live(gate);
}

function typeFor(entry, fallback = 'tertiary') {
  return types.has(entry.type) ? entry.type : entry.grade === 'main' ? 'main' : entry.grade === 'plot' ? 'secondary' : entry.grade === 'skill' ? 'skill' : fallback;
}

function entryView(source, status, fallbackType) {
  const type = typeFor(source, fallbackType);
  const entry = { id: source.id, title: source.title, type, grade: grades[type], status,
    detail: typeof source.detail === 'string' ? source.detail : '' };
  for (const key of ['kicker', 'region', 'map', 'trackable', 'actions', 'steps', 'notes', 'rewards', 'measure']) {
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
  bridge = null, spider = null, murder = null, cat = null, batman = null, burying = null, vastos = null, drent = null, farmlands = null, notes = [], live = questLive } = {}) {
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
    { state: cat, id: 'liz-cat', title: 'Bring Olive home', type: 'tertiary',
      paid: 'You brought Olive safely home to Liz and accepted her coin.',
      taught: 'You brought Olive safely home to Liz. In return, she taught you how to summon the bees.' },
  ];
  for (const ending of endings) {
    // Death/loss is not a completed success and can happen without the player witnessing it.
    // Such events belong in explicit discovered notes, never a magically updated quest archive.
    if (!ending.state || !['paid', 'taught'].includes(ending.state.stage) || !allowed({ ...ending.state, id: ending.id }, live)) continue;
    add(entryView({ id: ending.id, title: ending.title, type: ending.type, detail: ending[ending.state.stage] }, 'complete'));
  }

  if (batman && allowed({ ...batman, id: 'batman-suval' }, live) && (batman.stage === 'complete' || batman.bounty === 'paid')) {
    add(entryView({ id: 'batman-suval', title: 'A Kindness with Wings', type: 'secondary', region: 'Suval',
      detail: batman.bounty === 'paid'
        ? 'You killed the winged vigilante and brought his head to Officer Verradross for the bounty.'
        : 'The vigilante carried you over Suval and showed you the devastation of the Blood Prince. You learned the beginnings of Flying, charted the three regions, and landed safely beside the eastern border.' }, 'complete'));
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

  // The Farmlands of the Lizeem (src/lizeem-farmlands.js): Taleth's charge stays open in the tracker
  // until all four countries are walked, so each country restored is written up as its own entry.
  // `farmlands` is the quest's snapshot.
  if (farmlands?.caricas?.stage === 'done' && allowed({ id: 'lizeem-farmlands', slateId: 'lizeem-farmlands' }, live)) {
    const hid = farmlands.caricas.claim === 'hidden';
    add(entryView({ id: 'lizeem-farmlands-caricas', title: 'Caricas: the rested ground', type: 'skill', region: 'Caricas',
      kicker: 'The Farmlands of the Lizeem',
      detail: `You worked the North Farm on Egeria’s lease, rested its ground with beans, and ${hid ? 'hid the garrison’s tenth for the families in the upland' : 'handed the garrison its tenth'}. Consus sealed your soft-fruit tart and you carried it to Taleth, who taught you Call the Dew.`,
      rewards: ['Call the Dew', 'Farming experience', 'A second farmstead offered', 'Messor back on the North Farm'] }, 'complete'));
  }

  for (const note of list(notes)) {
    if (note?.discovered !== true || !allowed(note, live)) continue;
    add({ ...entryView(note, 'note', 'tertiary'), type: 'note' });
  }
  return entries;
}
