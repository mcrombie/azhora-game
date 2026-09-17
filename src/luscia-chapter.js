/**
 * The Luscia chapter: the field at the Lauvel.
 *
 * The campaign's second chapter (`luscia-aftermath`) made playable. Iven at the
 * relay sends the traveler onto the battlefield to recover a missing Legion
 * courier's satchel; wolves come off the burial line when it is lifted; the
 * satchel carried back finishes the chapter and pays the traveler in the horse
 * the Moros camp will want. No render or DOM dependencies: the host owns the
 * scenery, the combat and the campaign, and reports what happened.
 *
 * Modelled on `journey.js` (rules, validated snapshots) plus
 * `journey-content.js` (the words, as `tangent(...)` / `choice(...)` lines).
 */
export const LUSCIA_VERSION = 1;
export const LUSCIA_CHAPTER_ID = 'luscia-aftermath';
/** The Legion's promissory token for a horse, spent at the Moros camp's hitch. */
export const LUSCIA_REWARD_ITEM = 'horse-token';
/** The rest of the chapter's pay, in coin. */
export const LUSCIA_REWARD_COINS = 4;

/** The people the chapter adds. Their stands live with Luscia's other positions in `region-world.js`. */
export const LUSCIA_NPCS = Object.freeze([
  Object.freeze({ id: 'lauvel-picket', name: 'Talvus', role: 'Legion picket sergeant', modelRole: 'legion-soldier', color: 0x7c3a2f }),
  Object.freeze({ id: 'burial-searcher', name: 'Ilva', role: 'Of the Lauvel valley', modelRole: 'rise-custodian', color: 0x6f7b5e }),
  Object.freeze({ id: 'hamlet-drover', name: 'Garran', role: 'Drover of the burned hamlet', modelRole: 'shelter-keeper', color: 0x7b6f5a }),
]);

/** The one site of this chapter: the courier's satchel at a wrecked cart. Mirrors `journeySites`. */
export const LUSCIA_SITES = Object.freeze({
  'courier-satchel': Object.freeze({ id: 'courier-satchel', x: -375, z: 177, region: 2,
    name: 'The courier’s satchel', prompt: 'Lift the courier’s satchel from the wrecked cart' }),
});

/** Site id to chapter action, exactly as `SITE_ACTIONS` does for the road. */
export const LUSCIA_SITE_ACTIONS = Object.freeze({ 'courier-satchel': 'take-courier-satchel' });

/**
 * Two wolves off the burial line. The arena runs along +X, so a traveler who
 * backs east onto the open grass leaves the fight, while the relay to the west
 * stays inside it.
 */
export const LUSCIA_WOLVES = Object.freeze({
  id: 'lauvel-wolves', center: Object.freeze({ x: -375, z: 177 }), checkpoint: Object.freeze({ x: -386, z: 182.9 }),
  retreatAxis: 'x', retreatLine: -364,
  enemies: Object.freeze([
    Object.freeze({ id: 'lauvel-wolf-lead', x: -381.5, z: 186, hp: 58, kind: 'wolf', entry: .2 }),
    Object.freeze({ id: 'lauvel-wolf-second', x: -384, z: 182, hp: 58, kind: 'wolf', entry: 1.4 }),
  ]),
});

const booleanFields = ['started', 'briefed', 'satchelTaken', 'wolvesCleared', 'returned'];
const emptyState = () => ({ version: LUSCIA_VERSION, revision: 0, started: false, briefed: false,
  satchelTaken: false, wolvesCleared: false, returned: false });
const fail = reason => ({ ok: false, reason });
const action = (id, label, objectiveId, reason = '') => ({ id, label, objectiveId, enabled: !reason, reason });

/**
 * Reject inconsistent saves atomically; restoring never re-grants the horse.
 * A missing section belongs to a save taken before this chapter existed.
 */
export function validateLusciaSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== LUSCIA_VERSION
    || Object.keys(data).some(key => key !== 'version' && key !== 'revision' && !booleanFields.includes(key))
    || !Number.isSafeInteger(data.revision) || data.revision < 0
    || booleanFields.some(key => typeof data[key] !== 'boolean')) return false;
  if ((data.briefed && !data.started) || (data.satchelTaken && !data.briefed)
    || (data.wolvesCleared && !data.satchelTaken) || (data.returned && !data.satchelTaken)) return false;
  // Every step happens exactly once, so the revision count catches partial or
  // internally contradictory saves without inferring missing progress.
  return data.revision === booleanFields.reduce((count, key) => count + Number(data[key]), 0);
}

export function createLusciaChapter({ inventory, onEvent = () => {} } = {}) {
  let state = emptyState();

  const snapshot = () => ({ ...state });

  function stage() {
    if (!state.started) return 'not-started';
    if (!state.briefed) return 'meet-relay-clerk';
    if (!state.satchelTaken) return 'find-satchel';
    if (!state.returned) return 'return-satchel';
    return 'complete';
  }

  function view() {
    const current = stage();
    const views = {
      'not-started': [0, 'Across the Caloss', 'The road out of Drent is finished. Iven keeps the Legion’s relay post on Lumber Town’s square.', 'LUSCIA · THE FIELD AT THE LAUVEL', []],
      'meet-relay-clerk': [1, 'The missing courier', 'Iven has orders from the Moros. Speak with him at the relay post on Lumber Town’s square; a Legion courier who rode from the battlefield ten days ago never reached him.', 'LUSCIA · 1 / 3 · THE FIELD AT THE LAUVEL', ['relay-clerk']],
      'find-satchel': [2, 'The field at the Lauvel', 'Follow the road north-east out of Lumber Town, past the old relay hut, to the field at the Lauvel. Sergeant Talvus holds the picket, Ilva is searching the burial line, and the courier’s satchel lies at a wrecked cart on the far side. Press F at the cart. Wolves have been on the burial line.', 'LUSCIA · 2 / 3 · THE FIELD AT THE LAUVEL', ['courier-satchel']],
      'return-satchel': [3, 'Carry the rolls back', 'Take the courier’s satchel back down the road to Iven in Lumber Town before anything else finds it.', 'LUSCIA · 3 / 3 · THE FIELD AT THE LAUVEL', ['relay-clerk']],
      complete: [4, 'The Legion’s horse', 'Iven has the muster rolls and you have the Legion’s horse token. The road turns west for the Moros gate and the Legion camp on the plain. That chapter is not built yet.', 'LUSCIA · CHAPTER COMPLETE', []],
    };
    const [step, title, detail, kicker, destinations] = views[current];
    return {
      chapterId: LUSCIA_CHAPTER_ID, regionName: 'Luscia', questTitle: 'The field at the Lauvel',
      stage: current, step, steps: 3, title, detail, kicker,
      active: state.started && !state.returned, complete: state.returned,
      satchelCarried: state.satchelTaken && !state.returned, wolvesCleared: state.wolvesCleared,
      objectiveId: destinations[0] ?? null, destinationIds: [...destinations],
    };
  }

  function availableActions() {
    switch (stage()) {
      case 'meet-relay-clerk': return [action('accept-lauvel-search', 'Go out to the field for the courier', 'relay-clerk')];
      case 'find-satchel': return [action('take-courier-satchel', 'Lift the courier’s satchel', 'courier-satchel')];
      case 'return-satchel': return [action('return-courier-satchel', 'Hand Iven the courier’s satchel', 'relay-clerk')];
      default: return [];
    }
  }

  function emit(actionId, detail = {}) {
    state.revision++;
    const current = view();
    const event = { type: 'luscia-progress', sequence: state.revision, actionId,
      chapterId: LUSCIA_CHAPTER_ID, stage: current.stage, ...detail };
    onEvent(event);
    return { ok: true, reason: '', ...event };
  }

  /** The host opens the chapter once the road out of Drent is filed and the campaign has reached it. */
  function start() {
    if (state.started) return fail('The field at the Lauvel is already your chapter.');
    state.started = true;
    return emit('start-chapter');
  }

  function act(actionId) {
    const choice = availableActions().find(candidate => candidate.id === actionId);
    if (!choice) return fail(state.returned ? 'The courier’s rolls are filed. The Moros camp is the next chapter.'
      : !state.started ? 'Finish the road out of Drent before the Lauvel is your business.'
        : `Your current task: ${view().detail}`);
    if (!choice.enabled) return fail(choice.reason);
    let reward = null, startEncounter = null;
    if (actionId === 'accept-lauvel-search') state.briefed = true;
    else if (actionId === 'take-courier-satchel') { state.satchelTaken = true; startEncounter = LUSCIA_WOLVES.id; }
    else if (actionId === 'return-courier-satchel') {
      // The token and the pay are the chapter's reward, granted exactly once.
      if (!inventory?.add?.(LUSCIA_REWARD_ITEM, 1)) return fail('There is no room in your satchel for the Legion’s token. Make space and speak again.');
      inventory?.add?.('silver-coin', LUSCIA_REWARD_COINS);
      state.returned = true; reward = { id: LUSCIA_REWARD_ITEM, quantity: 1, coins: LUSCIA_REWARD_COINS };
    }
    return emit(actionId, { objectiveId: choice.objectiveId, reward, startEncounter });
  }

  /** Called by the host only after the matching combat victory event. */
  function clearWolves(encounterId) {
    if (encounterId !== LUSCIA_WOLVES.id) return fail('That is not the fight on the burial line.');
    if (!state.satchelTaken || state.wolvesCleared) return fail('There is no wolf pack left on the burial line.');
    state.wolvesCleared = true;
    return emit('clear-lauvel-wolves');
  }

  function restore(data) {
    if (!validateLusciaSnapshot(data, { allowMissing: false })) return false;
    // Keep only the known schema; stored JSON never becomes live state by reference.
    state = { version: LUSCIA_VERSION, revision: data.revision,
      ...Object.fromEntries(booleanFields.map(key => [key, data[key]])) };
    return true;
  }

  return {
    start, act, clearWolves, view, availableActions, snapshot, restore,
    get state() { return { ...snapshot(), stage: stage(), active: state.started && !state.returned, complete: state.returned }; },
  };
}

/**
 * The chapter's conversations. Same shape as `journeyConversation`: arrays of
 * lines, `tangent(...)` for colour and `choice(...)` for the one line that
 * advances the chapter. The Legion speaks in orders; Luscians speak plainly.
 */
export function lusciaConversation(npc, context) {
  const { luscia, openDialogue, closeDialogue, act } = context;
  const state = luscia.state;
  const choice = (id, label) => ({ id, label, action: () => { closeDialogue(); act(id); } });
  const back = { id: 'leave-lauvel', label: 'Back to the road.', action: closeDialogue };
  const returnToNeighbor = () => lusciaConversation(npc, context);
  const tangent = (id, label, lines) => ({ id, label,
    action: () => openDialogue(npc, lines, null, 'Back to our conversation', { onComplete: returnToNeighbor }) });
  const flavor = {
    'relay-clerk': [
      tangent('iven-wolves', 'What is out on that field?', [
        'Wolves. I will say it plainly, because the pickets will not put it in a return. They have been on the burial line four nights running, and it is the Luscians coming to dig who see them.',
        'They are not starving and they are not shy. A drover out of the burned hamlet lost two ewes on the Suval road and told me the pack works in twos, with a third sitting back where it can watch the road.',
        'If they come at you, do not back toward the graves. Back east, onto the open grass, and keep your blade up. My orders say wolves are a local matter. My orders are written in Ambron.',
      ]),
      tangent('iven-ten-days', 'Ten days, and nobody has cleared the field?', [
        'Ten days. The Legion broke the rebel army up the road on the ninth, marched west for the Moros on the eleventh, and left a picket and a signpost behind it. Everything since has been the valley’s own work.',
        'The carts are still where their wheels went. The families walk up from this town to dig the line and are home before dark. I copy the returns and send them on. Neither of us is doing much for the dead.',
      ]),
    ],
    'lauvel-picket': [
      tangent('talvus-battle', 'What happened here?', [
        'Ten days ago. The rebel line stood on the rise with billhooks and a banner. We came up the road in three ranks and it was finished before midday. That is the whole of it.',
        'They call themselves a republic. The register calls them rebels, and the register is what I am held to. My orders are the road, the field and this line. Not the digging.',
      ]),
    ],
    'burial-searcher': [
      tangent('ilva-who-they-were', 'Who were they?', [
        'Not soldiers. Dav shod horses at the crossing. The man beside him carried cheese to Elod’s gate every month of his life. The tall one taught my brother his letters, badly.',
        'Somebody in Ambron reads the word rebel and thinks of an army. Come and count the hands with the nails worn down. Thirty-one in this row.',
      ]),
      tangent('ilva-wolves', 'You dig in daylight?', [
        'We dig in daylight because of the wolves. They came the second night and they have not gone. We keep a fire on the line now and we are away before the light goes.',
        'The sergeant will not send men out to it. It is not in his orders, he says. Everything here is in somebody’s orders except the burying.',
      ]),
    ],
    'hamlet-drover': [
      tangent('garran-solis', 'Where has everyone gone?', [
        'South, most of them, and then west. The word along the Suval road is that the republic’s people are gathering at Solis, over in West Suval. Whole households on the road with a handcart and a goat.',
        'I am too old to walk to Solis and my ewes are too few to take. Somebody has to stand in a burned yard and tell the next traveler what happened in it.',
      ]),
    ],
  };
  const tell = (lines, choices) => openDialogue(npc, lines, null, 'Back to the road',
    { choices: [...choices, ...(context.extraChoices?.(npc) || []), ...(flavor[npc.id] || []), back] });

  if (npc.id === 'relay-clerk') {
    if (state.returned) return tell([
      'The rolls are in my hand, and you have your pay: the horse token and four silver. Take the token west to the Moros gate; the camp on the plain keeps the Legion’s horse lines, and they will hand you a mount against my mark.',
      'Sixty-one of ours named, and a list of the men we took. The Moros will read it as a victory return. I will file it as what it is: the valley’s dead, in two columns, in my handwriting.',
    ], []);
    if (state.satchelTaken) return tell([
      'That is the courier’s satchel, and you are still standing. Good. Let me have it before the light goes and before anybody west of here asks what took so long. There is pay in it for you, and it is not all in chits.',
    ], [choice('return-courier-satchel', 'Hand over the satchel · take the horse token')]);
    if (state.briefed) return tell([
      'Take the road north-east out of the square, past the old relay hut where I used to keep this desk. The wrecked carts are on the far side of the field, off the road. The satchel is a flat leather case with a Legion strap; the courier will be near it or he will not be anywhere.',
      'Talvus holds the picket. Tell him the relay sent you. Do not argue with him; he is a sergeant, and arguing is a thing that happens to other people.',
    ], []);
    return tell([
      'You again, and in Legion pay. Then here are the orders that came up from the Moros, ten days late, like everything that comes up from the Moros. The Legion met the rebel army at the Lauvel on the ninth and broke it. The field is a quarter mile up the road out of this square and I have not walked out to it once.',
      'A Legion courier rode off that field the same evening with the muster rolls and never reached this relay. Sergeant Talvus keeps the picket and will not pass a civilian. You are on the Legion’s field detail, which makes you neither one thing nor the other, which makes you useful.',
      'Find the courier’s satchel and bring it here. Those rolls name our dead and the men we took prisoner. Do that and I will pay you the way the Legion pays me: with a horse it owes me, and a token to claim it at the camp on the Moros.',
    ], [choice('accept-lauvel-search', 'I’ll go out to the field.')]);
  }
  if (npc.id === 'lauvel-picket') {
    if (state.returned) return tell([
      'The clerk has his rolls. The field is still a field. Move along the road, and keep off the grass after dark.',
    ], []);
    if (state.satchelTaken) return tell([
      'You have it. Then it is the clerk’s business now, not mine. Off the field.',
      'And the wolves are the valley’s business, before you ask. They are not in my orders either.',
    ], []);
    if (state.briefed) return tell([
      'The relay sent you. Say the courier’s name and the satchel and you may pass the line. Nobody else does.',
      'Straight to the carts on the north side. Touch nothing on the burial line. Be off the field before the light goes, and if you meet the wolves, that is your own affair.',
    ], []);
    return tell([
      'Hold. This is a Legion field, not a market. Civilians turn at this line.',
      'Nothing out there for you. Broken carts, flies, and rebels in the ground. Turn back.',
    ], []);
  }
  if (npc.id === 'burial-searcher') {
    if (state.returned) return tell([
      'You went out to the carts and came back whole. That is more than most of this field managed.',
      'Still thirty-one, and still eleven without a name. I will be here tomorrow and the day after that.',
    ], []);
    return tell([
      'Thirty-one in this row, and eleven of them we could not put a name to. I have been three days at it.',
      'My brother went out with the Lauvel men on the ninth. He is not in the first row and he is not among the ones they took. So I am working along the line, and I am not finished.',
    ], []);
  }
  if (npc.id === 'hamlet-drover') {
    return tell([
      'Four walls and a chimney, and the well is still good. I was two valleys over with the ewes when the column came through, which is the whole of the reason I am talking to you.',
      'I have been a drover sixty years. I have moved stock through a war before. You do not move a house.',
    ], []);
  }
  return tell(['The road runs on west for the Moros.'], []);
}
