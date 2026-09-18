/**
 * Wine, the traveler's skill of looking, smelling and tasting properly. Lakota
 * learned it at Vaervelm Caelazh, Paradise Springs (src/winery.js), and teaches
 * the first of it in Tidehaven, then sends the traveler to the winery itself, in
 * the north-east of West Suval, with a warning about the war around Solis.
 * Livia Seravo pours there; every wine tasted properly for the first time
 * teaches something.
 *
 * The wines are the eight grapes of its blocks, real varieties the Virginia
 * vineyards grow: Viognier, Chardonnay and Vidal Blanc; Cabernet Franc, Merlot,
 * Petit Verdot, Tannat, and Norton, the native vine.
 * Pure: no DOM, no three.
 */
import { VINTNER, CELLAR_HAND, WINERY, VARIETIES } from './winery.js';

export const WINE_VERSION = 1;
export const WINE_SKILL = 'wine';
export const VISIT_XP = 25;

const wine = (id, entry) => Object.freeze({ id, name: VARIETIES[id].name, colour: VARIETIES[id].colour, ...entry });
export const WINES = Object.freeze({
  viognier: wine('viognier', { xp: 15,
    note: 'Pale gold. Apricot and honeysuckle on the nose, round and soft in the mouth, and a little bitter at the end like the skin of the fruit.',
    lore: 'The white this country is proudest of. It is fussy in the vineyard and generous in the glass, which Livia says describes most of her family.' }),
  chardonnay: wine('chardonnay', { xp: 10,
    note: 'Straw coloured. Baked apple, butter and a smell of the barrel it rested in, cream and a little smoke.',
    lore: 'It will taste of wherever you grow it and whatever you keep it in. Here, of the hall’s oak.' }),
  'vidal-blanc': wine('vidal-blanc', { xp: 15,
    note: 'Pale and bright. Grapefruit, pineapple and green apple, off-dry, with an edge of acid that keeps it lively.',
    lore: 'The hardy one: it laughs at a winter that kills the others. The rows at the end are left hanging into the cold, and what they make then is sweet enough to finish a meal.' }),
  'cabernet-franc': wine('cabernet-franc', { xp: 15,
    note: 'Bright ruby. Red cherry, a green note like a snapped pepper, and something like pencil shavings. Light enough to drink cool.',
    lore: 'The red that suits this ground best: it ripens before the autumn storms, when its cousins are still hard and green.' }),
  merlot: wine('merlot', { xp: 10,
    note: 'Deep garnet. Plum and black cherry, soft and round, the tannin like velvet rather than sandpaper.',
    lore: 'The easy red, the one Livia pours for soldiers. It forgives a cold year better than it forgives a wet one.' }),
  'petit-verdot': wine('petit-verdot', { xp: 15,
    note: 'Nearly black. Violets, blueberry and ink, and a grip that dries your whole mouth. It wants food, or ten years.',
    lore: 'Elsewhere it goes into a blend a spoonful at a time. Here it ripens fully, and Livia bottles it on its own out of pride.' }),
  tannat: wine('tannat', { xp: 20,
    note: 'Black at the rim. Blackberry, smoke and leather, and more grip than anything else in the cellar.',
    lore: 'Named, they say, for the very thing it has most of. Five years in the barrel before Livia will pour it for anyone, and she still warns them.' }),
  norton: wine('norton', { xp: 20,
    note: 'Deep purple. Wild and grapey, dark plum and a smell of the woods after rain. Nothing else tastes like it.',
    lore: 'The native vine. It grew wild on this coast before anyone planted a row, and it laughs at the rot that kills the imported ones. Lakota’s favourite, and he will tell you so.' }),
});
export const WINE_IDS = Object.freeze(Object.keys(WINES));

export const WINE_LESSON = Object.freeze([
  'Look at it first: tip the glass against something white. Colour tells you the grape, the age, and whether it has been in a barrel.',
  'Then swirl it and smell it, and do not be shy about it. Most of what you taste you are really smelling.',
  'Then a small mouthful, held and moved about. Is it sharp? Does it dry your gums? Does it stay after you swallow? Now you have tasted it, instead of drinking it.',
]);

export function validateWineSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== WINE_VERSION) return false;
  if (typeof data.met !== 'boolean' || !['none', 'recommended', 'visited'].includes(data.quest)) return false;
  if (!data.tasted || typeof data.tasted !== 'object' || Array.isArray(data.tasted)) return false;
  return Object.entries(data.tasted).every(([id, count]) => Object.hasOwn(WINES, id) && Number.isInteger(count) && count >= 1 && count <= 1e6);
}

export function createWine({ skills, onEvent = () => {} } = {}) {
  const state = { met: false, quest: 'none', tasted: {} };

  /** Learned from Lakota (who also sends the traveler to the winery) or from Livia at the winery. */
  function learn({ recommend = false } = {}) {
    const first = !state.met;
    state.met = true;
    if (recommend && state.quest === 'none') state.quest = 'recommended';
    const learned = skills?.learn?.(WINE_SKILL) ?? { ok: false };
    if (first) onEvent({ type: 'wine-learned' });
    return { ok: true, first, ...learned };
  }

  /** Reaching the winery and meeting Livia. */
  function visit() {
    if (state.quest === 'visited') return { ok: true, first: false };
    const recommended = state.quest === 'recommended';
    state.quest = 'visited';
    const gained = recommended && state.met ? skills?.gain?.(WINE_SKILL, VISIT_XP) ?? { ok: false } : null;
    onEvent({ type: 'winery-visited' });
    return { ok: true, first: true, xp: gained ? VISIT_XP : 0, levelled: !!gained?.levelled };
  }

  /** A wine tasted properly. */
  function taste(id) {
    if (!state.met) return { ok: false, reason: 'You drank it. It was nice. Ask how to taste it properly, and you will get more out of the next glass.' };
    const entry = WINES[id];
    if (!entry) return { ok: false, reason: 'They do not pour that here.' };
    const first = !state.tasted[id];
    state.tasted[id] = (state.tasted[id] ?? 0) + 1;
    const gained = first ? skills?.gain?.(WINE_SKILL, entry.xp) ?? { ok: false } : null;
    onEvent({ type: 'wine-tasted', id, first });
    return { ok: true, first, entry, count: state.tasted[id], xp: first ? entry.xp : 0,
      level: skills?.level?.(WINE_SKILL) ?? 1, levelled: !!gained?.levelled };
  }

  const tastedCount = () => Object.keys(state.tasted).length;
  function task() {
    if (state.quest !== 'recommended') return null;
    return { title: `${WINERY.name}, Paradise Springs`, stage: 'visit', target: VINTNER.id,
      detail: `Lakota’s old winery in the north-east of West Suval: ${WINERY.name}, Paradise Springs in plain words. Take the lane east off the Solis road past the Suval Downs. There is a war around Solis. Keep your head down.` };
  }
  function view() {
    return { met: state.met, quest: state.quest, tastedCount: tastedCount(), total: WINE_IDS.length, task: task(),
      entries: WINE_IDS.map(id => ({ id, tasted: !!state.tasted[id], colour: WINES[id].colour,
        name: state.tasted[id] ? WINES[id].name : `A ${WINES[id].colour} of Vaervelm Caelazh`,
        detail: state.tasted[id] ? WINES[id].note : state.met ? `Livia pours it at ${WINERY.name}.` : 'Lakota, the birder in Tidehaven, knows wine.' })) };
  }

  function snapshot() { return { version: WINE_VERSION, met: state.met, quest: state.quest, tasted: { ...state.tasted } }; }
  function restore(data) {
    state.met = false; state.quest = 'none'; state.tasted = {};
    if (!validateWineSnapshot(data, { allowMissing: false })) return false;
    state.met = data.met; state.quest = data.quest; state.tasted = { ...data.tasted };
    return true;
  }

  return { learn, visit, taste, task, view, snapshot, restore, tastedCount,
    get met() { return state.met; }, get quest() { return state.quest; }, hasTasted: id => !!state.tasted[id] };
}

/** Livia Seravo at the cabin porch. `act` runs 'learn-wine-here' and 'taste-<id>' in the host. */
export function vintnerConversation(npc, context) {
  const { wine, openDialogue, closeDialogue, act } = context;
  if (npc.id !== VINTNER.id) return false;
  const again = () => vintnerConversation(npc, context);
  const firstVisit = wine.quest !== 'visited';
  if (firstVisit) act('visit-winery');
  const opening = firstVisit
    ? [wine.quest === 'recommended' || wine.met
      ? 'Lakota sent you? Of course he did. He still owes me for a case of the Norton, and for the heron he let into the cellar.'
      : 'A traveler, all the way out here, and not a soldier. Sit down before somebody requisitions you.',
    `This is ${WINERY.name}. In your tongue, ${WINERY.meaning}: the good green place, where the water endures. The cabin is the first house anybody built on this land; we pour in it now. The hall is where the wine is made.`,
    'And the spring, up on the rise behind the cabin. It has never once failed, not in the worst summer. The Svaleen say one of Thareth\u2019s tears fell on that stone, and the first vine on this hill grew where it ran. Drink from it; everybody does.']
    : ['Back again. The terrace is yours. Nobody else has come up the lane since the armies came.'];
  const choices = [
    ...(!wine.met ? [{ id: 'learn-wine-here', label: 'Show me how to taste it properly.', action: () => { closeDialogue(); act('learn-wine-here'); } }] : []),
    ...(wine.met ? WINE_IDS.map(id => ({ id: `taste-${id}`, label: `A taste of the ${WINES[id].name}${wine.hasTasted(id) ? ' again' : ''}.`,
      action: () => { closeDialogue(); act(`taste-${id}`); } })) : []),
    { id: 'winery-war', label: 'How has the war been for you?', action: () => openDialogue(npc, [
      'Both sides have been up the lane. The Coalition took twelve barrels “for the troops” and gave me a paper for them. The Legion took the mule and gave me nothing, which at least was honest.',
      'We make wine the same whoever holds Solis. People want a drink under every flag. That is not loyalty; it is weather.',
    ], null, 'Back to our conversation', { onComplete: again }) },
    { id: 'winery-vines', label: 'What do you grow?', action: () => openDialogue(npc, [
      'Eight grapes, two rows each, down the slope: the whites nearest the hall, Viognier, Chardonnay and Vidal Blanc; then the reds, Cabernet Franc, Merlot, Petit Verdot and Tannat; and at the bottom, where the ground stays wettest, Norton.',
      'There is a painted plate at the head of each block. Read them, then taste the wine from the same rows. That is how you learn a vineyard.',
    ], null, 'Back to our conversation', { onComplete: again }) },
    { id: 'winery-lakota', label: 'What was Lakota like here?', action: () => openDialogue(npc, [
      'The best nose I ever had in the cellar, and the worst cellar hand. He would stop a pressing to watch a hawk.',
      'He dug up the whole bottom of the vineyard looking for bones of some great old lizard he swore had walked here. He found a jaw. It is on the cabin mantel. Do not get him started.',
    ], null, 'Back to our conversation', { onComplete: again }) },
    { id: 'leave-vintner', label: 'Thank you.', action: closeDialogue },
  ];
  openDialogue(npc, opening, null, 'Back to the terrace', { choices });
  return true;
}

/** Nico Arrend among the barrels. */
export function cellarHandConversation(npc, { openDialogue }) {
  if (npc.id !== CELLAR_HAND.id) return false;
  openDialogue(npc, [
    'Mind the barrels. They are full, and they are the only thing in this valley both armies agree is worth stealing.',
    'Livia pours at the cabin. Ask her for the Norton. Nobody asks for the Norton, and she likes the ones who do.',
  ], null, 'Back to the terrace');
  return true;
}
