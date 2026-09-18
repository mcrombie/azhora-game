/**
 * Toft's errand: the silliest thing anyone in Drent will ask the traveler to do.
 *
 * Toft Ellery wants jimson weed — specifically the spiked pods — for his knee,
 * which is a lie he has told so many times he has started believing it. There
 * are three plants in reach: the one behind Nell Harrow's shed, which is the
 * easy one if the traveler thinks to ask her about it; a wild one on Drent's
 * waste ground; and a wild one away in Pueth, for anyone who gets there first
 * and comes back.
 *
 * The reward is not a reward. He has his night, and afterwards he is a man who
 * has learned something about himself in front of the whole village.
 * Pure: no DOM, no three.
 */
import { JIMSON_ITEM } from './herbology.js';
import { LEAF_ITEM } from './pipeweed.js';

export const JIMSON_VERSION = 1;
export const JIMSON_PODS_WANTED = 3;
/** How long, in seconds of play, before the village finds out how his night went. */
export const JIMSON_NIGHT_DELAY = 210;

export const TOFT = Object.freeze({
  id: 'jimson-toft', name: 'Toft Ellery', role: 'Of Tidehaven, with a knee',
  modelRole: 'traveler', color: 0x7a6a55,
});

/** His barrel in the village, in world metres. */
export const TOFT_STAND = Object.freeze({ x: -8, z: 24, yaw: Math.PI * 1.1 });

export const JIMSON_STAGES = Object.freeze(['unasked', 'active', 'delivered', 'night', 'settled']);

export function validateJimsonSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== JIMSON_VERSION) return false;
  if (!JIMSON_STAGES.includes(data.stage)) return false;
  if (typeof data.heardFromNell !== 'boolean') return false;
  return Number.isFinite(data.since) && data.since >= 0;
}

export function createJimson({ onEvent = () => {} } = {}) {
  const state = { stage: 'unasked', heardFromNell: false, since: 0 };

  function accept() {
    if (state.stage !== 'unasked') return false;
    state.stage = 'active';
    onEvent({ type: 'jimson-accepted' });
    return true;
  }

  /** Nell has explained what the thing behind her shed is, which is permission to pick it. */
  function askedNell() { state.heardFromNell = true; }

  const canPick = stand => stand !== 'jimson-nell' || state.heardFromNell;

  function turnIn(inventory) {
    if (state.stage !== 'active' || !inventory || typeof inventory.count !== 'function'
      || typeof inventory.remove !== 'function' || typeof inventory.add !== 'function'
      || inventory.count(JIMSON_ITEM) < JIMSON_PODS_WANTED) return false;
    if (!inventory.remove(JIMSON_ITEM, JIMSON_PODS_WANTED)) return false;
    // He pays in the only currency he has, and does not look at you while he does it.
    inventory.add(LEAF_ITEM, 3);
    state.stage = 'delivered'; state.since = 0;
    onEvent({ type: 'jimson-delivered' });
    return true;
  }

  /** Play time passing. After a while the village knows how his night went. */
  function tick(seconds) {
    if (state.stage !== 'delivered' || !Number.isFinite(seconds) || seconds <= 0) return false;
    state.since += seconds;
    if (state.since < JIMSON_NIGHT_DELAY) return false;
    state.stage = 'night';
    onEvent({ type: 'jimson-night' });
    return true;
  }

  /** The traveler has heard the whole of it from the man himself. */
  function settle() {
    if (state.stage !== 'night') return false;
    state.stage = 'settled';
    onEvent({ type: 'jimson-settled' });
    return true;
  }

  function snapshot() { return { version: JIMSON_VERSION, stage: state.stage, heardFromNell: state.heardFromNell, since: state.since }; }
  function restore(data) {
    state.stage = 'unasked'; state.heardFromNell = false; state.since = 0;
    if (!validateJimsonSnapshot(data, { allowMissing: false })) return false;
    state.stage = data.stage; state.heardFromNell = data.heardFromNell; state.since = data.since;
    return true;
  }

  return { accept, askedNell, canPick, turnIn, tick, settle, snapshot, restore,
    get stage() { return state.stage; }, get heardFromNell() { return state.heardFromNell; },
    get active() { return state.stage === 'active'; },
    // Anyone can ask Nell what the rank thing behind her shed is. Noticing it
    // early is the whole of the easy route, so it is not gated on the errand.
    get canAsk() { return !state.heardFromNell; } };
}

/** Toft's conversation. `act` runs 'accept-jimson' and 'give-jimson' in the host. */
export function toftConversation(npc, context) {
  const { jimson, inventory, openDialogue, closeDialogue, act } = context;
  if (npc.id !== TOFT.id) return false;
  const again = () => toftConversation(npc, context);
  const leave = { id: 'leave-toft', label: 'Good luck with the knee.', action: closeDialogue };

  if (jimson.stage === 'unasked') {
    openDialogue(npc, [
      'You are new, which means you have not heard this from me yet, which makes you the most valuable man in this village.',
      'Toft Ellery. It is my knee. Went in the boat years ago and it has never been right, and there is a thing that grows on the waste ground that a man I met at the Caloss told me about, and Nell Harrow will not fetch it for me because Nell Harrow thinks she knows what I want it for.',
      'Jimson weed. The pods, the spiked ones, three of them and I will not ask you twice. For the knee.',
    ], null, 'Back to the village', { choices: [
      { id: 'accept-jimson', label: 'Three spiked pods. For your knee.', action: () => { closeDialogue(); act('accept-jimson'); } },
      { id: 'jimson-doubt', label: 'What is it actually for, Toft?', action: () => openDialogue(npc,
        ['The knee.', 'The knee, I said. You have a face on you like Nell’s. Go on, go and be useful somewhere else.'],
        null, 'Back to the village', { onComplete: again }) },
      leave,
    ] });
    return true;
  }
  if (jimson.stage === 'active') {
    const have = inventory?.count?.(JIMSON_ITEM) ?? 0;
    const choices = [
      ...(have >= JIMSON_PODS_WANTED ? [{ id: 'give-jimson', label: `Give him the pods (${have})`, action: () => { closeDialogue(); act('give-jimson'); } }] : []),
      { id: 'jimson-where', label: 'Where would I find it?', action: () => openDialogue(npc, [
        'Waste ground. Trodden dirt nobody keeps — a ditch, the back of a yard, where a cart turns round. Jagged leaves, white trumpets that open at dusk and smell like something died politely.',
        'There is one out west past the Caloss gate that I know of, and they say there is one over in Pueth, which is no use to me at all. And there is one closer than either, which I am not going to say out loud, because she will hear me.',
      ], null, 'Back to our conversation', { onComplete: again }) },
      leave,
    ];
    openDialogue(npc, [have >= JIMSON_PODS_WANTED ? 'Is that — yes. Yes, that is them. Give them here.'
      : `Three pods, spiked, hard and green. You have ${have}. The knee is not getting younger.`],
      null, 'Back to the village', { choices });
    return true;
  }
  if (jimson.stage === 'delivered') {
    openDialogue(npc, [
      'Right. Right. Thank you. That is — thank you.',
      'I will just take these inside and see to the knee. Do not wait about. There is nothing to see. Go and do whatever it is you do.',
    ], null, 'Back to the village');
    return true;
  }
  if (jimson.stage === 'night') {
    openDialogue(npc, [
      'Do not. Whatever you are about to say, do not.',
      'I do not remember most of it. I remember being certain, absolutely certain, that the mooring post was my brother, and telling it a number of things I have been meaning to say for eleven years. Half the village watched me do it. Nell watched me do it. Nell has not said one word to me, which is worse.',
      'It was not for the knee. You knew it was not for the knee. Take this and never mention it again — and if anyone in Pueth ever asks you to fetch them the same thing, you ask them what it is for, and you make them say it out loud.',
    ], null, 'Back to the village', { choices: [
      { id: 'settle-jimson', label: 'Your secret is safe, Toft.', action: () => { closeDialogue(); act('settle-jimson'); } },
      { id: 'jimson-mock', label: 'What did the mooring post say back?', action: () => openDialogue(npc,
        ['It said nothing. It is a post. That is the part I have had the most difficulty with.'],
        null, 'Back to the village', { onComplete: again }) },
    ] });
    return true;
  }
  openDialogue(npc, [
    'Morning. Knee is much the same. We do not discuss it.',
    'I will say this once: I am glad you were the one who was there. There are men in this village who would still be telling it.',
  ], null, 'Back to the village');
  return true;
}
