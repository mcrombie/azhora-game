/**
 * Katy, at Vaervelm Caelazh. The traveler finds her by the spring pool below the
 * cabin with a brass spyglass up to her eye, watching the birds. She is good at
 * it. It is not what she is there for. What she is there for is Batman.
 *
 * Batman, in Azhora, is half a bat and half a man: a bat's head and a bat's wings
 * on a man's body. He looks like a monster, and people scream and run from him.
 * He is not one. He is a vigilante who comes down at night on thieves, bullies and
 * cutthroats, and leaves the good alone. The few who have seen him and lived say
 * so, and nobody believes them. Katy believes them.
 *
 * Here the quest to find him begins: she asks the traveler to watch for him and
 * gives them her drawing of him. Where it goes from there is the user's to write.
 * Pure: no DOM, no three.
 */
import { wineryPoint } from './winery.js';

const freeze = Object.freeze;

// Never the traveler's own model. Katy is slight, with long straight blonde hair, a dusk-violet
// dress, a short black cape cut like a bat's wing, a bat on a cord at her throat and a spyglass.
export const KATY = freeze({
  id: 'katy', name: 'Katy', role: 'Watching the birds at Vaervelm Caelazh',
  modelRole: 'bat-seeker', color: 0x4a3f63, skin: 0xe8c6a6,
});
/** By the spring pool below the cabin, looking out over it toward the reeds and the vines. */
export const KATY_STAND = freeze({ ...wineryPoint(-11, 23.5), yaw: -2.11 });
/** Her drawing of Batman, which she gives the traveler so they know him when they see him. */
export const KATY_SKETCH = 'katy-batman-sketch';

export const KATY_VERSION = 1;
/** 'unmet'; 'met' (she has asked, the traveler has not said yes yet); 'looking' (the traveler is looking for Batman). */
export const KATY_STAGES = freeze(['unmet', 'met', 'looking']);

export function validateKatySnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  return !!data && typeof data === 'object' && !Array.isArray(data) && data.version === KATY_VERSION && KATY_STAGES.includes(data.stage);
}

export function createKaty({ onEvent = () => {} } = {}) {
  const state = { stage: 'unmet' };
  /** She has spoken to the traveler and asked her question. */
  function meet() {
    if (state.stage !== 'unmet') return false;
    state.stage = 'met';
    return true;
  }
  /** The traveler says yes: the search for Batman begins, and they carry her drawing. */
  function accept(inventory) {
    if (state.stage === 'looking') return false;
    state.stage = 'looking';
    inventory?.grant?.(KATY_SKETCH);
    onEvent({ type: 'batman-search-begun' });
    return true;
  }
  const snapshot = () => ({ version: KATY_VERSION, stage: state.stage });
  function restore(data) {
    state.stage = 'unmet';
    if (!validateKatySnapshot(data, { allowMissing: false })) return false;
    state.stage = data.stage;
    return true;
  }
  return { meet, accept, snapshot, restore, get stage() { return state.stage; }, get looking() { return state.stage === 'looking'; } };
}

/** Who Batman is, the way Katy tells it. */
export const BATMAN_TOLD = freeze([
  'Batman. Half a bat and half a man: a bat’s head with ears like a hare’s, and wings you could wrap a cart in, on a man’s body. He comes at night.',
  'Everybody who sees him screams and runs, and I understand that. I do. He looks like the thing your grandmother told you about to keep you in bed.',
  'But he is not a monster. He comes for the ones who hurt people: the men who rob the carts on the south road, the ones who burn a farm to settle a debt. He has never touched anybody good. Not once. Ask anyone who has actually seen him. Nobody asks them.',
  'I have watched the sky over these vines every night for a year. I watch the birds in the day while I wait. They are good practice. You learn to see the thing that does not want to be seen.',
]);

/** What she says while the traveler is looking, one at a time, round and round. */
export const KATY_WAITING = freeze([
  'Anything? No. That is all right. He does not want to be found; that is half of what makes him him. Keep the drawing on you.',
  'A tax farmer’s men put a widow out of her house on the downs. In the morning they were hanging by their belts from her own apple tree, alive, and she was back in her house. Nobody saw anything. Everybody heard wings.',
  'A carter came through from the south road and swore a bat the size of a horse dropped on the men who were robbing him. The men will not say what happened. The carter bought everyone a drink.',
  'The birds go quiet sometimes, all at once, at dusk. Every one of them. Something big is going over. Watch the sky when that happens.',
]);

/**
 * Katy's conversation. `act('accept-batman')` starts the search in the host (it hands over the
 * drawing); `katy.meet()` is called here the first time she asks.
 */
export function katyConversation(npc, context) {
  const { katy, openDialogue, closeDialogue, act, visits = 0 } = context;
  if (npc?.id !== KATY.id) return false;
  const again = () => katyConversation(npc, { ...context, visits: visits + 1 });
  const leave = { id: 'leave-katy', label: 'I will let you get back to the birds.', action: closeDialogue };
  const yes = { id: 'accept-batman', label: 'I will look for him.', action: () => {
    openDialogue(npc, ['You will? Here. I drew him from what the people who have seen him told me. So you know him when you see him, and do not run.',
      'And come and tell me. The moment you do. I will be here, or I will be out looking.'], null, 'Take the drawing',
    { onComplete: () => act('accept-batman') });
  } };
  const who = { id: 'who-is-batman', label: 'Who is Batman?', action: () => openDialogue(npc, [...BATMAN_TOLD, 'Will you help me find him? Keep your eyes open on the roads, and at night especially.'],
    null, 'Back to Katy', { choices: [yes, { ...leave, label: 'Not now.' }] }) };

  if (katy.stage === 'unmet') {
    katy.meet();
    openDialogue(npc, [
      'Shh. Do not move. There is a kingfisher on the reed by the far bank, and it has not seen you yet.',
      '…There. Gone. It was worth it. It always is.',
      'Katy. I watch the birds here. Livia lets me, because I tell her which ones are eating her Merlot.',
      'That is not really why I am here, though. Can I ask you something? You have been out on the roads. Have you seen Batman?',
    ], null, 'Back to the terrace', { choices: [who, { id: 'not-seen-batman', label: 'I have not.', action: who.action }, leave] });
    return true;
  }
  if (katy.stage === 'met') {
    openDialogue(npc, ['You came back. Have you thought about it? About Batman?'], null, 'Back to the terrace', { choices: [who, yes, leave] });
    return true;
  }
  openDialogue(npc, [KATY_WAITING[visits % KATY_WAITING.length]], null, 'Back to the terrace',
    { choices: [{ id: 'more-katy', label: 'Tell me about him again.', action: () => openDialogue(npc, [...BATMAN_TOLD], null, 'Back to Katy', { onComplete: again }) }, leave] });
  return true;
}
