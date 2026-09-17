/**
 * The Legion on the plain: the third chapter of the main quest. The traveler
 * reports at the camp gate on the Moros Plain, signs the Legate's muster with
 * whichever of the twelve hired swords have arrived, and draws the horse the
 * Legion owes for the rolls carried out of the Lauvel. Pure: no DOM, no three.
 */
export const MOROS_VERSION = 1;
export const MOROS_CHAPTER_ID = 'moros-camp';
export const MOROS_PAY = 25;
export const MOROS_HORSE_TOKEN = 'horse-token';
export const MOROS_GATE_ID = 'post-camp-gate-north';
export const MOROS_LEGATE_ID = 'post-camp-legate';

/** The horse line south of the tent lines: where the token is spent. */
export const MOROS_SITES = Object.freeze({
  'legion-horse-line': Object.freeze({ id: 'legion-horse-line', name: 'The Legion horse line', x: -563, z: 323, prompt: 'Claim your Legion horse' }),
});
export const MOROS_SITE_ACTIONS = Object.freeze({ 'legion-horse-line': 'claim-legion-horse' });

const booleanFields = ['started', 'admitted', 'mustered', 'horseClaimed'];
const initial = () => ({ version: MOROS_VERSION, revision: 0, started: false, admitted: false, mustered: false, horseClaimed: false });
const fail = reason => ({ ok: false, reason });
const action = (id, label, objectiveId, reason = '') => ({ id, label, objectiveId, enabled: !reason, reason });

/** Reject inconsistent saves atomically; a missing section belongs to a save from before this chapter. */
export function validateMorosSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== MOROS_VERSION
    || Object.keys(data).some(key => key !== 'version' && key !== 'revision' && !booleanFields.includes(key))
    || !Number.isSafeInteger(data.revision) || data.revision < 0
    || booleanFields.some(key => typeof data[key] !== 'boolean')) return false;
  for (let i = 1; i < booleanFields.length; i++) if (data[booleanFields[i]] && !data[booleanFields[i - 1]]) return false;
  return data.revision === booleanFields.reduce((count, key) => count + Number(data[key]), 0);
}

export function createMorosChapter({ inventory, hasHorse = () => false, onEvent = () => {} } = {}) {
  let state = initial();
  const snapshot = () => ({ ...state });

  function stage() {
    if (!state.started) return 'not-started';
    if (!state.admitted) return 'report-at-gate';
    if (!state.mustered) return 'report-to-legate';
    if (!state.horseClaimed) return 'claim-horse';
    return 'complete';
  }

  function view() {
    const current = stage();
    const views = {
      'not-started': [0, 'West to the Moros', 'The Legion’s camp lies west of Lumber Town, past the Moros gate, on the open plain.', 'MOROS PLAIN · THE LEGION ON THE PLAIN', []],
      'report-at-gate': [1, 'Name and contract', 'Follow the road west out of Lumber Town through the Moros gate. Report to the sentry at the camp’s gate; the Legion is expecting its hired swords.', 'MOROS PLAIN · 1 / 3 · THE LEGION ON THE PLAIN', [MOROS_GATE_ID]],
      'report-to-legate': [2, 'The Legate’s muster', 'Legate Marcus Verro keeps the muster at the command tent beyond the tent lines. Sign it, and draw your first wage.', 'MOROS PLAIN · 2 / 3 · THE LEGION ON THE PLAIN', [MOROS_LEGATE_ID]],
      // A traveler who rode in pickets the horse they came on; one who walked the whole way with Iven's token still draws a horse here.
      'claim-horse': hasHorse()
        ? [3, 'A place on the line', 'Picket your horse on the Legion’s line south of the tents and draw its fodder. The quartermaster counts horses as carefully as men.', 'MOROS PLAIN · 3 / 3 · THE LEGION ON THE PLAIN', ['legion-horse-line']]
        : [3, 'What the Legion owes', 'Take Iven’s token to the horse line south of the tents and claim the horse the Legion owes you.', 'MOROS PLAIN · 3 / 3 · THE LEGION ON THE PLAIN', ['legion-horse-line']],
      complete: [4, 'One of twelve', 'You are on the Legate’s muster with a horse on the line. When the company is full he will send an envoy to Solis in West Suval under a flag of truce.', 'MOROS PLAIN · CHAPTER COMPLETE', []],
    };
    const [step, title, detail, kicker, destinations] = views[current];
    return { chapterId: MOROS_CHAPTER_ID, regionName: 'Moros Plain', questTitle: 'The Legion on the plain', stage: current, step, steps: 3,
      title, detail, kicker, active: state.started && !state.horseClaimed, complete: state.horseClaimed,
      objectiveId: destinations[0] ?? null, destinationIds: [...destinations] };
  }

  function availableActions() {
    switch (stage()) {
      case 'report-at-gate': return [action('admit-to-camp', 'Show Iven’s receipt and the horse token', MOROS_GATE_ID)];
      case 'report-to-legate': return [action('join-muster', `Sign the muster · take ${MOROS_PAY} copper`, MOROS_LEGATE_ID)];
      case 'claim-horse': return [hasHorse() ? action('claim-legion-horse', 'Picket your horse and draw its fodder', 'legion-horse-line')
        : action('claim-legion-horse', 'Hand over the token and take your horse', 'legion-horse-line',
          inventory?.has?.(MOROS_HORSE_TOKEN) ? '' : 'You need the Legion’s horse token from Iven in Lumber Town.')];
      default: return [];
    }
  }

  function emit(actionId, detail = {}) {
    state.revision++;
    const event = { type: 'moros-progress', sequence: state.revision, actionId, chapterId: MOROS_CHAPTER_ID, stage: view().stage, ...detail };
    onEvent(event);
    return { ok: true, reason: '', ...event };
  }

  /** The host opens the chapter once the Lauvel is settled and the campaign has reached the Moros camp. */
  function start() {
    if (state.started) return fail('The Legion’s camp is already your chapter.');
    state.started = true;
    return emit('start-chapter');
  }

  function act(actionId) {
    const choice = availableActions().find(candidate => candidate.id === actionId);
    if (!choice) return fail(state.horseClaimed ? 'You are on the muster. The road to Solis is the next chapter.'
      : !state.started ? 'Settle the field at the Lauvel before the Moros camp is your business.' : `Your current task: ${view().detail}`);
    if (!choice.enabled) return fail(choice.reason);
    let reward = null;
    if (actionId === 'admit-to-camp') state.admitted = true;
    else if (actionId === 'join-muster') {
      if (!inventory?.add?.('copper-piece', MOROS_PAY)) return fail('The Legate’s clerk could not pay you. Make room in your satchel and speak again.');
      state.mustered = true; reward = { id: 'copper-piece', quantity: MOROS_PAY };
    } else if (actionId === 'claim-legion-horse') {
      if (hasHorse()) state.horseClaimed = true;
      else {
        if (!inventory?.remove?.(MOROS_HORSE_TOKEN, 1)) return fail('You need the Legion’s horse token from Iven in Lumber Town.');
        state.horseClaimed = true; reward = { id: 'legion-horse', quantity: 1 };
      }
    }
    return emit(actionId, { objectiveId: choice.objectiveId, reward });
  }

  function restore(data) {
    if (!validateMorosSnapshot(data, { allowMissing: false })) return false;
    state = { version: MOROS_VERSION, revision: data.revision, ...Object.fromEntries(booleanFields.map(key => [key, data[key]])) };
    return true;
  }

  return { start, act, view, availableActions, snapshot, restore,
    get state() { return { ...snapshot(), stage: stage(), active: state.started && !state.horseClaimed, complete: state.horseClaimed }; } };
}

/**
 * The gate sentry and the Legate speak for the chapter while it is theirs; otherwise the
 * host falls back to their ordinary lines. `musterCount` is how many of the twelve stand in camp.
 */
export function morosConversation(npc, context) {
  const { moros, openDialogue, closeDialogue, act, musterCount = 1 } = context;
  const current = moros.view().stage;
  const choose = id => { const option = moros.availableActions().find(item => item.id === id); return option ? [{ ...option, action: () => { closeDialogue(); act(id); } }] : []; };
  const leave = { id: 'leave-moros', label: 'Understood.', action: closeDialogue };
  if (npc.id === MOROS_GATE_ID && current === 'report-at-gate') {
    openDialogue(npc, [
      'Halt. Name and contract.',
      'A hired sword off the Tidehaven boats, with a relay clerk’s receipt and a horse token. You are expected. The Legate is at the command tent, past the tent lines, under the red standard. He sees hired men at once when they carry rolls from the Lauvel.',
    ], null, 'Back to the road', { choices: [...choose('admit-to-camp'), leave] });
    return true;
  }
  if (npc.id === MOROS_LEGATE_ID && current === 'report-to-legate') {
    const count = Math.max(1, Math.min(12, Math.round(musterCount)));
    const words = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
    openDialogue(npc, [
      `So you are the one who brought the muster rolls out of the Lauvel. Marcus Verro, Legate. The Empire promised me twelve hired swords. By the gate’s count, ${words[count]} ${count === 1 ? 'stands' : 'stand'} in this camp, counting you.`,
      'The Coalition holds Solis in West Suval: Izoli ships, Suvali hill-men, our own rebels, and a handful each from Pyros, Selemis, Marosh and the southern islands. They want the border stockade south-east of here, and they will come for it when they think we are thin.',
      'When the muster is full I will send an envoy to Solis under a flag of truce, to count their spears before they count ours. It may be you. Until then: sign the muster, draw your first wage, and take your horse from the line south of the tents.',
    ], null, 'Back to the camp', { choices: [...choose('join-muster'), leave] });
    return true;
  }
  return false;
}
