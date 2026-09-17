/**
 * The envoy and the border battle: the fork of the main quest. The Legate sends
 * the traveler with his terms to the Coalition's envoy, who waits under a flag
 * of truce at the contested stockade on the Moros Plain (Solis itself lies in
 * West Suval, which is not built yet, so the parley comes to the border). There
 * the traveler chooses whose sellsword to be, joins that side's line, and fights
 * a corner of the battle; the day as a whole is decided by the campaign's odds.
 * Pure: no DOM, no three.
 */
export const BORDER_VERSION = 1;
export const BORDER_ENVOY_CHAPTER = 'suval-envoy';
export const BORDER_BATTLE_CHAPTER = 'border-battle';
export const BORDER_ENCOUNTER_ID = 'border-battle-line';
export const BORDER_LEGATE_ID = 'post-camp-legate';
export const BORDER_SIDES = Object.freeze(['empire', 'coalition']);
export const BORDER_OUTCOMES = Object.freeze(['victory', 'defeat']);

/** People who appear at the stockade only while this chapter needs them. */
export const BORDER_NPCS = Object.freeze([
  Object.freeze({ id: 'coalition-envoy', name: 'Envoy Telis Orren', role: 'Envoy of the Republic and the Coalition', modelRole: 'rise-custodian', color: 0x3f5f86, x: -382, z: 308, yaw: -Math.PI / 2, shows: 'envoy' }),
  Object.freeze({ id: 'envoy-guard-north', name: 'Coalition spearman', role: 'Suvali company, under the truce flag', modelRole: 'suvali-guard', color: 0x55636f, x: -380, z: 303.5, yaw: -Math.PI / 2, shows: 'envoy' }),
  Object.freeze({ id: 'envoy-guard-south', name: 'Coalition spearman', role: 'Izoli marine, under the truce flag', modelRole: 'suvali-guard', color: 0x4a5f7a, x: -380, z: 312.5, yaw: -Math.PI / 2, shows: 'envoy' }),
  Object.freeze({ id: 'battle-tribune', name: 'Tribune Gallus Orso', role: 'Tribune of the Legion’s left', modelRole: 'legion-officer', color: 0x832d2b, x: -396, z: 325, yaw: 0, shows: 'empire' }),
  Object.freeze({ id: 'coalition-captain', name: 'Captain Arlen Voss', role: 'Captain of the Lauvel companies', modelRole: 'suvali-guard', color: 0x3f5f86, x: -396, z: 325, yaw: 0, shows: 'coalition' }),
]);

/** The corner of the field the traveler fights for: open ground west of the stockade. */
export const BORDER_ARENA = Object.freeze({ center: Object.freeze({ x: -392, z: 308 }), checkpoint: Object.freeze({ x: -392, z: 321 }), retreatAxis: 'z', retreatLine: 329 });

const ENEMY_SPOTS = [[-398, 296, .2], [-386, 295, .9], [-392, 292, 1.8], [-401, 291, 5.5], [-383, 290, 7], [-392, 288, 9]];
const ALLY_SPOTS = [[-398, 318], [-386, 318], [-401, 322], [-383, 322], [-392, 324]];

/** The encounter for a side: six of the other side's soldiers in two waves, and the allies who stand with the traveler. */
export function borderEncounter(side, allies = []) {
  const foe = side === 'empire' ? 'coalition' : 'legion';
  return { id: BORDER_ENCOUNTER_ID, center: { ...BORDER_ARENA.center }, checkpoint: { ...BORDER_ARENA.checkpoint },
    retreatAxis: BORDER_ARENA.retreatAxis, retreatLine: BORDER_ARENA.retreatLine,
    enemies: ENEMY_SPOTS.map(([x, z, entry], index) => ({ id: `border-foe-${index + 1}`, x, z, entry, hp: 70, kind: 'soldier', look: foe })),
    allies: allies.slice(0, ALLY_SPOTS.length).map((ally, index) => ({ ...ally, x: ALLY_SPOTS[index][0], z: ALLY_SPOTS[index][1] })) };
}

const fail = reason => ({ ok: false, reason });
const action = (id, label, objectiveId, reason = '') => ({ id, label, objectiveId, enabled: !reason, reason });
const initial = () => ({ version: BORDER_VERSION, revision: 0, started: false, ordered: false, side: null, outcome: null });

export function validateBorderSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== BORDER_VERSION
    || Object.keys(data).some(key => !['version', 'revision', 'started', 'ordered', 'side', 'outcome'].includes(key))
    || !Number.isSafeInteger(data.revision) || data.revision < 0 || typeof data.started !== 'boolean' || typeof data.ordered !== 'boolean'
    || (data.side !== null && !BORDER_SIDES.includes(data.side)) || (data.outcome !== null && !BORDER_OUTCOMES.includes(data.outcome))) return false;
  if ((data.ordered && !data.started) || (data.side && !data.ordered) || (data.outcome && !data.side)) return false;
  return data.revision === Number(data.started) + Number(data.ordered) + Number(data.side !== null) + Number(data.outcome !== null);
}

export function createBorderChapter({ onEvent = () => {} } = {}) {
  let state = initial(), active = false;
  const snapshot = () => ({ ...state });
  const commander = () => (state.side === 'coalition' ? 'coalition-captain' : 'battle-tribune');

  function stage() {
    if (!state.started) return 'not-started';
    if (!state.ordered) return 'take-orders';
    if (!state.side) return 'meet-envoy';
    if (!state.outcome) return active ? 'fighting' : 'join-line';
    return 'complete';
  }

  function view() {
    const current = stage(), empire = state.side !== 'coalition';
    const won = state.outcome === 'victory';
    const views = {
      'not-started': [0, 'The Legate’s terms', 'Finish your business at the Legion camp first.', 'MOROS PLAIN · THE BORDER', []],
      'take-orders': [1, 'The Legate’s terms', 'The muster will not grow in time. Legate Marcus Verro has terms for the Coalition; take them from him at the command tent.', 'THE BORDER · 1 / 3 · A MESSAGE FOR THE COALITION', [BORDER_LEGATE_ID]],
      'meet-envoy': [2, 'Under a flag of truce', 'The Coalition’s envoy waits at the border stockade, east of the Moros gate along the branch road. Carry the Legate’s terms to her, and hear what she offers in return.', 'THE BORDER · 2 / 3 · A MESSAGE FOR THE COALITION', ['coalition-envoy']],
      'join-line': [3, empire ? 'The Legion’s left' : 'The Republic’s right', empire
        ? 'You kept the Empire’s contract. Tribune Gallus Orso commands the hired company on the Legion’s left, south-west of the stockade. Tell him when you are ready.'
        : 'You stand with the Republic. Captain Arlen Voss holds the Coalition’s right with the Lauvel companies, south-west of the stockade. Tell him when you are ready.', 'THE BORDER · 3 / 3 · THE BORDER BATTLE', [commander()]],
      fighting: [3, 'Hold your corner of the field', 'Six of theirs come on in two waves. Your allies fight beside you. Fall back south if you must; the line will wait.', 'THE BORDER BATTLE', []],
      complete: [4, won ? 'The field is yours' : 'The field is lost', (empire
        ? (won ? 'The Coalition broke and fell back on Solis. The Legion rides after them into West Suval.' : 'The Legion lost the field and pulled back across the plain; the Coalition holds the stockade.')
        : (won ? 'The Legion broke. The Coalition holds the stockade and the road onto the Moros.' : 'The Coalition was thrown back toward Solis, and you with it.')), 'THE BORDER BATTLE · FOUGHT', []],
    };
    const [step, title, detail, kicker, destinations] = views[current];
    return { stage: current, step, steps: 3, title, detail, kicker, side: state.side, outcome: state.outcome,
      active: state.started && !state.outcome, complete: !!state.outcome, fighting: active,
      objectiveId: destinations[0] ?? null, destinationIds: [...destinations] };
  }

  /** Which of the chapter's people stand at the stockade right now. */
  function cast() {
    const current = stage();
    return BORDER_NPCS.filter(npc => (npc.shows === 'envoy' && ['take-orders', 'meet-envoy'].includes(current))
      || (npc.shows === state.side && ['join-line', 'fighting'].includes(current))).map(npc => npc.id);
  }

  function availableActions() {
    switch (stage()) {
      case 'take-orders': return [action('take-legate-terms', 'Take the Legate’s terms to the stockade', BORDER_LEGATE_ID)];
      case 'meet-envoy': return [action('side-empire', 'I took the Empire’s coin. Give me your answer for the Legate.', 'coalition-envoy'),
        action('side-coalition', 'I will stand with the Republic.', 'coalition-envoy')];
      case 'join-line': return [action('sound-advance', 'I am ready. Sound the advance.', commander())];
      default: return [];
    }
  }

  function emit(actionId, detail = {}) {
    state.revision++;
    const event = { type: 'border-progress', sequence: state.revision, actionId, stage: stage(), ...detail };
    onEvent(event);
    return { ok: true, reason: '', ...event };
  }

  function start() {
    if (state.started) return fail('The border is already your business.');
    state.started = true;
    return emit('start-chapter');
  }

  function act(actionId) {
    const choice = availableActions().find(candidate => candidate.id === actionId);
    if (!choice) return fail(state.outcome ? 'The border battle is fought.' : !state.started ? 'Join the Legate’s muster first.' : `Your current task: ${view().detail}`);
    if (actionId === 'take-legate-terms') { state.ordered = true; return emit(actionId, { objectiveId: choice.objectiveId }); }
    if (actionId === 'side-empire' || actionId === 'side-coalition') {
      state.side = actionId === 'side-empire' ? 'empire' : 'coalition';
      return emit(actionId, { objectiveId: choice.objectiveId, side: state.side });
    }
    // Sounding the advance starts a fight; it is not progress until the fight is decided.
    active = true;
    return { ok: true, reason: '', actionId, startEncounter: BORDER_ENCOUNTER_ID, side: state.side };
  }

  /** Retreat or defeat in the skirmish: the line waits, and the advance can be sounded again. */
  function endEncounter(encounterId) {
    if (encounterId !== BORDER_ENCOUNTER_ID || !active) return fail('There is no fight on the border to end.');
    active = false;
    return { ok: true, reason: '' };
  }

  /** The traveler held their corner; the day itself goes by the campaign's odds. `roll` is 0..100. */
  function resolveBattle(encounterId, chance, roll) {
    if (encounterId !== BORDER_ENCOUNTER_ID || !active || !state.side || state.outcome) return fail('There is no border battle to decide.');
    if (!Number.isFinite(chance) || !Number.isFinite(roll)) return fail('The odds of the day are unknown.');
    active = false;
    state.outcome = roll < chance ? 'victory' : 'defeat';
    return emit('resolve-border-battle', { side: state.side, outcome: state.outcome, chance });
  }

  function restore(data) {
    if (!validateBorderSnapshot(data, { allowMissing: false })) return false;
    state = { version: BORDER_VERSION, revision: data.revision, started: data.started, ordered: data.ordered, side: data.side, outcome: data.outcome };
    active = false;
    return true;
  }

  return { start, act, endEncounter, resolveBattle, view, cast, availableActions, snapshot, restore,
    get state() { return { ...snapshot(), stage: stage(), fighting: active, complete: !!state.outcome }; } };
}

/** The Legate, the envoy and the side's commander speak for the chapter while it is theirs. */
export function borderConversation(npc, context) {
  const { border, openDialogue, closeDialogue, act, musterCount = 1 } = context;
  const current = border.view().stage;
  const option = id => { const found = border.availableActions().find(item => item.id === id); return found ? [{ ...found, action: () => { closeDialogue(); act(id); } }] : []; };
  const leave = { id: 'leave-border', label: 'Not yet.', action: closeDialogue };
  if (npc.id === BORDER_LEGATE_ID && current === 'take-orders') {
    openDialogue(npc, [
      `The muster stands at ${Math.max(1, Math.min(12, Math.round(musterCount)))} of twelve, and it will have to do. My scouts say the Coalition marches from Solis within the day.`,
      'Their envoy waits at the border stockade under a flag of truce, east of the Moros gate along the branch road. Carry my terms: they quit the stockade and the Suval bank, and the Emperor forgets the names on the Lauvel rolls.',
      'Bring me her answer, or bring me nothing and I will know it. Either way the hired company stands on my left tomorrow.',
    ], null, 'Back to the camp', { choices: [...option('take-legate-terms'), leave] });
    return true;
  }
  if (npc.id === 'coalition-envoy' && current === 'meet-envoy') {
    openDialogue(npc, [
      'Telis Orren, for the Republic and for the Coalition at Solis. You carry Verro’s terms. I could recite them: leave, and be forgiven. We have heard them since Ambron burned the first petition.',
      'Look at who stands with us: Izoli captains, the Suvali companies, Luscia’s own sons, a handful from Pyros, Selemis and Marosh, the island cities. Then look at who stands with Verro: men paid by the day. Like you.',
      'The battle comes tomorrow whether you carry an answer or not. The Republic pays in scrip today and in land when it wins. So I ask what the Legate never will: whose sellsword are you?',
    ], null, 'Back to the road', { choices: [...option('side-empire'), ...option('side-coalition'), leave] });
    return true;
  }
  if ((npc.id === 'battle-tribune' || npc.id === 'coalition-captain') && current === 'join-line') {
    openDialogue(npc, npc.id === 'battle-tribune' ? [
      'Gallus Orso, tribune of the left. You are the hired sword who went to the stockade and came back ours. Good. Your company holds this corner; whoever of the twelve has arrived stands with you.',
      'They will come in two waves across the open ground. Hold, kill what reaches you, and fall back south to me if you must. Say when.',
    ] : [
      'Arlen Voss. I farmed the Lauvel valley until the Legion made a battlefield of it. Orren says you are ours now. Then you stand here, on the right, with what is left of the valley companies.',
      'Their legionaries will come in two waves across the open ground. Hold, and fall back south to me if you must. Say when.',
    ], null, 'Back to the line', { choices: [...option('sound-advance'), leave] });
    return true;
  }
  return false;
}
