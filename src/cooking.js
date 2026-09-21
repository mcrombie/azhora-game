/**
 * Cooking: what the traveler can make at a lit fire. The first recipe is
 * Lakota's hot chocolate. He is a soft touch: tell him the day has been a bad
 * one and he will make you a cup himself, on the brazier by his bench, and once
 * he has, you can ask him for the recipe. Cooking a fish at a fire, which the
 * traveler can always do, counts toward the skill once it is learned.
 * Pure: no DOM, no three.
 */
export const COOKING_VERSION = 1;
export const COOKING_SKILL = 'cooking';
/** He will make you another cup, but not before you have had time to finish the last. Seconds of play. */
export const LAKOTA_CUP_WAIT = 180;
/** A cup of Lakota's hot chocolate, drunk on his bench: health restored. */
export const LAKOTA_CUP_HEALING = 60;

const recipe = (id, entry) => Object.freeze({ id, ...entry });
export const RECIPES = Object.freeze({
  'hot-chocolate': recipe('hot-chocolate', { name: 'Hot chocolate', xp: 20, needs: Object.freeze({ chocolate: 1, milk: 1 }), makes: 'hot-chocolate',
    note: 'A cake of chocolate grated into a pan of milk over a lit fire, stirred till it coats the spoon, with a pinch of chilli and a spoonful of honey if you have one.' }),
  'cooked-fish': recipe('cooked-fish', { name: 'Cooked fish', xp: 10, needs: Object.freeze({ 'raw-fish': 1 }), makes: 'cooked-fish',
    note: 'One raw fish over a lit fire, turned once. Everybody can do it; now you know why it works.' }),
  // Lysa's two, taught once the acorns are in. Both of them start with the same leached meal,
  // which is the point of the acorn errand and was never used for anything until now.
  'acorn-flatbread': recipe('acorn-flatbread', { name: 'Acorn flatbread', xp: 25, needs: Object.freeze({ acorn: 3 }), makes: 'acorn-flatbread',
    note: 'Acorns leached in three waters until the bitterness is gone, ground to a coarse meal, worked with water into a stiff dough and cooked flat on a stone at the edge of the fire.' }),
  'honey-cake': recipe('honey-cake', { name: 'Honey cake', xp: 35, needs: Object.freeze({ acorn: 2, honeycomb: 1 }), makes: 'honey-cake',
    note: 'The same meal, a comb of Troy\u2019s honey worked through it while the wax is still soft, and a little longer on the stone. It is a cake the way a hedge is a wall, and it will get you up a hill.' }),
});
export const RECIPE_IDS = Object.freeze(Object.keys(RECIPES));

export const LAKOTA_MAKES_A_CUP = Object.freeze([
  'Oh. Oh, sit down. No, there, on the bench. Give me a moment.',
  'He sets a little pan on the brazier by his bench, grates chocolate into it from the cake in his coat, adds milk, a pinch of chilli and a spoonful of honey, and stirs it with the end of his pencil because he cannot find the spoon.',
  'Drink that. The hawk will not judge you, and neither will I. Whatever it is, it looks smaller from the bottom of a cup.',
]);
export const LAKOTA_TEACHES_THE_CUP = Object.freeze([
  'Of course. Everybody should have it; it is the only thing I know that works on everything.',
  'A cake of chocolate and a jug of milk. Wendel sells both on the green, if the southern ships have been in. Warm the milk over a lit fire. Never let it boil, it goes sulky. Grate the chocolate in and stir till it coats the spoon.',
  'A pinch of chilli, a spoonful of honey if you have one, and drink it somewhere you can see the sky. Here: my last cake, and the jug. Make your own next time.',
]);

export function validateCookingSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== COOKING_VERSION) return false;
  if (typeof data.met !== 'boolean' || !Number.isInteger(data.cups) || data.cups < 0 || data.cups > 1e6) return false;
  if (!Array.isArray(data.known) || !data.known.every(id => Object.hasOwn(RECIPES, id)) || new Set(data.known).size !== data.known.length) return false;
  if (!data.met && data.known.length) return false;
  if (!data.made || typeof data.made !== 'object' || Array.isArray(data.made)) return false;
  return Object.entries(data.made).every(([id, count]) => Object.hasOwn(RECIPES, id) && Number.isInteger(count) && count >= 1 && count <= 1e6);
}

export function createCooking({ skills, onEvent = () => {} } = {}) {
  const state = { met: false, known: new Set(), made: {}, cups: 0, lastCup: -Infinity };

  /** A recipe learned; the first one teaches the skill. */
  function learn(id) {
    if (!RECIPES[id]) return { ok: false, reason: 'Nobody makes that.' };
    const first = !state.met, known = state.known.has(id);
    state.met = true; state.known.add(id);
    const learned = skills?.learn?.(COOKING_SKILL) ?? { ok: false };
    if (first) onEvent({ type: 'cooking-learned' });
    return { ok: true, first, known, ...learned };
  }

  /** Lakota makes you a cup, if you have not just had one. `now` is seconds of play. */
  function cup(now) {
    if (now - state.lastCup < LAKOTA_CUP_WAIT) return { ok: false, wait: Math.ceil(LAKOTA_CUP_WAIT - (now - state.lastCup)) };
    state.cups++; state.lastCup = now;
    return { ok: true, first: state.cups === 1, healing: LAKOTA_CUP_HEALING };
  }

  /** What is missing to make it, from what the traveler carries. */
  function missing(id, inventory) {
    const entry = RECIPES[id];
    return Object.entries(entry?.needs ?? {}).filter(([item, count]) => (inventory?.count?.(item) ?? 0) < count).map(([item]) => item);
  }

  /** Make it at a lit fire (the host checks the fire). */
  function make(id, inventory) {
    const entry = RECIPES[id];
    if (!entry) return { ok: false, reason: 'Nobody makes that.' };
    if (!state.known.has(id)) return { ok: false, reason: `You do not know how to make ${entry.name.toLowerCase()} yet.` };
    const lacking = missing(id, inventory);
    if (lacking.length) return { ok: false, reason: `You need ${lacking.join(' and ')}.`, lacking };
    for (const [item, count] of Object.entries(entry.needs)) inventory.remove(item, count);
    inventory.add(entry.makes, 1);
    return noteMade(id);
  }

  /** Something made some other way (a fish cooked at the fire), counted toward the skill once it is learned. */
  function noteMade(id) {
    const entry = RECIPES[id];
    if (!entry) return { ok: false };
    const first = !state.made[id];
    state.made[id] = (state.made[id] ?? 0) + 1;
    const gained = state.met && first ? skills?.gain?.(COOKING_SKILL, entry.xp) ?? { ok: false } : null;
    onEvent({ type: 'cooked', id, first });
    return { ok: true, first, entry, xp: gained?.ok ? entry.xp : 0, levelled: !!gained?.levelled, level: skills?.level?.(COOKING_SKILL) ?? 1 };
  }

  function view() {
    const knownHere = id => state.known.has(id) || (id === 'cooked-fish' && state.met);
    const entries = RECIPE_IDS.map(id => ({ id, known: knownHere(id), made: state.made[id] ?? 0,
      name: RECIPES[id].name, detail: knownHere(id) ? RECIPES[id].note : 'A recipe you have not learned.' }));
    return { met: state.met, cups: state.cups, knownCount: entries.filter(entry => entry.known).length, total: RECIPE_IDS.length, entries };
  }

  function snapshot() { return { version: COOKING_VERSION, met: state.met, known: [...state.known], made: { ...state.made }, cups: state.cups }; }
  function restore(data) {
    state.met = false; state.known = new Set(); state.made = {}; state.cups = 0; state.lastCup = -Infinity;
    if (!validateCookingSnapshot(data, { allowMissing: false })) return false;
    state.met = data.met; state.known = new Set(data.known); state.made = { ...data.made }; state.cups = data.cups;
    return true;
  }

  return { learn, cup, make, missing, noteMade, view, snapshot, restore,
    get met() { return state.met; }, get cups() { return state.cups; }, knows: id => state.known.has(id) };
}
