/**
 * The Weatherhead, and the pipe.
 *
 * Drent grows tobacco — half its good ground is under it (`src/herbology.js`) —
 * and what the barns cure is cut for the pipe. Cabe Tolliver sits on the
 * Weatherhead, the low head south of Tidehaven's landing, calls the weather for
 * the boats, and will teach anyone who walks out to him how to fill a bowl,
 * light it, and leave it alone afterwards.
 *
 * Smoking settles the traveler: a full wind back and a little healing. It is not
 * a cure for anything and Cabe is the first to say so. Pure: no DOM, no three.
 */
export const PIPE_VERSION = 1;
export const PIPE_ITEM = 'pipe';
export const LEAF_ITEM = 'pipe-weed';

export const PIPE_SMOKER = Object.freeze({
  id: 'pipe-smoker', name: 'Cabe Tolliver', role: 'Weather-caller of the Weatherhead',
  modelRole: 'reed-worker', color: 0x5f8078,
});

/** The head south of the landing, in world metres, and where Cabe sits on it. */
export const WEATHERHEAD = Object.freeze({
  id: 'weatherhead', name: 'The Weatherhead',
  x: 2, z: 102, radius: 14,
  stand: Object.freeze({ x: 4, z: 104 }),
  note: 'The low head south of Tidehaven’s landing: the highest ground on this shore, five metres over the water, where the wind comes off the sea first and somebody has always sat to watch it.',
});

/** What a bowl of it does: a full wind back, and a little of the road taken off. */
export const PIPE_HEAL = 6;

export function validatePipeSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== PIPE_VERSION) return false;
  if (typeof data.taught !== 'boolean') return false;
  return Number.isInteger(data.bowls) && data.bowls >= 0 && data.bowls <= 1e6;
}

export function createPipe({ onEvent = () => {} } = {}) {
  const state = { taught: false, bowls: 0 };

  /**
   * Cabe's lesson. He hands over a spare clay pipe and a twist of his own, which
   * is the whole of the teaching; the rest of it is sitting still for ten minutes.
   */
  function learn(inventory = null) {
    const first = !state.taught;
    state.taught = true;
    const gotPipe = first ? !!inventory?.grant?.(PIPE_ITEM) : false;
    if (first) { inventory?.add?.(LEAF_ITEM, 2); onEvent({ type: 'pipe-learned' }); }
    return { ok: true, first, gotPipe };
  }

  function smoke(inventory = null) {
    if (!state.taught) return { ok: false, reason: 'You have a pipe and no idea what to do with it. Somebody sits up on the Weatherhead who does.' };
    if (!inventory?.has?.(PIPE_ITEM)) return { ok: false, reason: 'No pipe. Cabe had a spare; he may have another.' };
    if (!inventory?.count?.(LEAF_ITEM)) return { ok: false, reason: 'Nothing to put in it. The barns on the Avrel ground cure what the fields grow.' };
    if (!inventory.remove(LEAF_ITEM, 1)) return { ok: false, reason: 'Nothing to put in it.' };
    state.bowls += 1;
    onEvent({ type: 'pipe-smoked', bowls: state.bowls });
    return { ok: true, heal: PIPE_HEAL, bowls: state.bowls,
      line: state.bowls === 1 ? 'The first of it catches wrong and you cough like a man who has been shot. The second draw is better. By the third you understand why everybody on this coast does this.'
        : 'A bowl, and ten minutes of doing nothing else. The wind comes back into you.' };
  }

  function snapshot() { return { version: PIPE_VERSION, taught: state.taught, bowls: state.bowls }; }
  function restore(data) {
    state.taught = false; state.bowls = 0;
    if (!validatePipeSnapshot(data, { allowMissing: false })) return false;
    state.taught = data.taught; state.bowls = data.bowls;
    return true;
  }

  return { learn, smoke, snapshot, restore,
    get taught() { return state.taught; }, get bowls() { return state.bowls; } };
}

/** Cabe's conversation. `act` runs 'learn-pipe' in the host. */
export function pipeSmokerConversation(npc, context) {
  const { pipe, herbology = null, openDialogue, closeDialogue, act } = context;
  if (npc.id !== PIPE_SMOKER.id) return false;
  const again = () => pipeSmokerConversation(npc, context);
  const leave = { id: 'leave-pipe-smoker', label: 'Fair winds.', action: closeDialogue };
  if (!pipe.taught) {
    openDialogue(npc, [
      'Sit down before the wind puts you down. It comes over this head first and it is not gentle about it.',
      'Cabe Tolliver. I call the weather for the boats, which means I sit here all day looking at water and everybody pretends that is a trade.',
      'You have walked out to the end of a headland to stand next to a man with a pipe, so I will save us both the dance: do you want to learn it or not? It is grown down there, cured in the barns on the Avrel ground, and rubbed out for the bowl. It will not fix your leg and it will not make you clever. It makes ten minutes into something.',
    ], null, 'Back down the path', { choices: [
      { id: 'learn-pipe', label: 'Teach me.', action: () => { closeDialogue(); act('learn-pipe'); } },
      { id: 'pipe-decline', label: 'I will keep my lungs, thank you.', action: () => openDialogue(npc,
        ['Sensible. My mother said the same thing for sixty years and then buried everybody who agreed with her. Sit anyway; the view is free.'],
        null, 'Back down the path', { onComplete: again }) },
      leave,
    ] });
    return true;
  }
  const choices = [
    { id: 'pipe-weather', label: 'What is the weather doing?', action: () => openDialogue(npc, [
      'Coming round. You can see it in the colour of the water out past the point — that flat pewter look, that is wind by evening and rain behind it.',
      'The boats know before I tell them. What they want from me is somebody to blame afterwards, and I am happy to be it.',
    ], null, 'Back to our conversation', { onComplete: again }) },
    { id: 'pipe-supply', label: 'Where does the leaf come from?', action: () => openDialogue(npc, [
      'The Avrel ground, mostly. Broad sticky leaves up a stalk taller than you, and the grower goes down the rows topping the flowers off so the leaf gets everything.',
      'Cut in the late summer, hung in the barn until it is brown and smells like a church, then rubbed. There are people in this country who will tell you it is the only honest crop and people who will tell you it has eaten every good field in Drent. They are both right, which is the trouble with it.',
    ], null, 'Back to our conversation', { onComplete: again }) },
    ...(herbology?.met ? [{ id: 'pipe-jimson', label: 'Somebody told me you can smoke other things.', action: () => openDialogue(npc, [
      'I know exactly what you have been told and exactly who told you. No.',
      'That white-trumpet weed off the waste ground is not tobacco and it is not a joke. A garrison up the river ate it for greens once and spent eleven days chasing people who were not there. One of them walked into the water. Nell will tell you the same and she says it kinder than I do.',
    ], null, 'Back to our conversation', { onComplete: again }) }] : []),
    leave,
  ];
  openDialogue(npc, [pipe.bowls ? 'Back out to the head. Sit, then — nobody walks out here for the conversation.'
    : 'You have the pipe. Fill it somewhere out of this wind or you will spend the afternoon lighting it.'],
    null, 'Back down the path', { choices });
  return true;
}
