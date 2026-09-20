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
  'Batman. And before you picture a man in a cape: no. A beast. Head and a half taller than you, and never straight — hunched over onto his hands, because the arms are the wings and the wings are too long to stand up with.',
  'Furred all over, close and dark, like a mole is furred. A bat’s head and nothing else: a short muzzle, the nose folded back on itself like a leaf, teeth the mouth does not close over. Ears as long as your forearm that move one at a time. And the eyes take the light the way a dog’s do at a fire, and that is the part that makes people run, every time.',
  'When the wings are folded they hang off his shoulders in rags down to the ground. Everybody who has seen him says cloak. He does not own a cloak. That is what a wing looks like folded.',
  'And he is not a monster. He goes after the ones who hurt people — the men who rob the carts on the south road, the ones who burn a farm to settle a debt — and he has never once touched anybody who was not one of them. Ask anybody who has actually seen him and lived. Nobody asks them. They ask me, and laugh, and I let them.',
  'I have watched the sky over these vines every night for a year. I watch the birds in the day while I wait; they are good practice. You learn to see the thing that does not want to be seen.',
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
  // Once the traveler has actually met him, she gets to hear it (src/batman.js).
  const hunt = context.hunt ?? null;
  const seen = hunt && hunt.stage !== 'unknown' ? [{ id: 'told-katy', label: 'I have seen him.',
    action: () => openDialogue(npc, hunt.stage === 'done' ? [
      'Say that again. Slowly.',
      'She sits down on the bank with the spyglass still in her hand and does not say anything for a while, and when she does her voice has gone somewhere else. “A year. I have been out here a year, and people have been very kind about it to my face.”',
      '“Was he— ” She stops. “Was he all right? Is he all right? Nobody ever asks that. They ask how big he was.”',
      '“Do not tell me where. I mean it. If I knew where he sat I would go and sit near it, and he would move, and that would be my fault. It is enough that he is there and that somebody has done something with it.”',
      'She looks back up at the sky anyway, the way she will now for the rest of her life. “Right. Well. I am going to be insufferable about this for about ten years.”',
    ] : [
      'She lowers the spyglass very slowly, as if a sudden movement might make you take it back.',
      '“Where.” Not a question. “No. No, do not tell me where. I will only go and sit there and scare him off and then it will be my fault.”',
      '“Is he— ” She tries again. “Everybody says the eyes. Was it the eyes?”',
      '“Then help him. Whatever he wants, help him, and do not you dare be frightened of him where he can see it. I have waited a year to be able to say that to somebody and mean it.”',
    ], null, 'Back to Katy', { onComplete: again }) }] : [];
  openDialogue(npc, [KATY_WAITING[visits % KATY_WAITING.length]], null, 'Back to the terrace',
    { choices: [...seen, { id: 'more-katy', label: 'Tell me about him again.', action: () => openDialogue(npc, [...BATMAN_TOLD], null, 'Back to Katy', { onComplete: again }) }, leave] });
  return true;
}
