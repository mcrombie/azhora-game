/**
 * Cooking: what the traveler can make at a lit fire. The first recipe is
 * Lakota's hot chocolate. He is a soft touch: tell him the day has been a bad
 * one and he will make you a cup himself, on the brazier by his bench, and once
 * he has, you can ask him for the recipe. Cooking follows a Fire Making lesson;
 * repeated meals count toward the same skill whoever first taught the traveler.
 * Pure: no DOM, no three.
 */
// The Nethereum and Nesdor kitchens (the Farmlands of the Lizeem, Builds 2 and 3; 6 October 2026), each with its fine forms.
import { NETHEREUM_RECIPES } from './nethereum-produce.js';
import { NESDOR_RECIPES } from './flats-ground.js';
// Ezina's flatbread and Ashnan's porridge, and Taleth's fork stew (the Farmlands of the Lizeem, Builds 4 and 5; 6 October 2026).
import { OVESOS_RECIPES } from './ovesos-produce.js';
import { DIVIDING_RECIPES } from './dividing.js';
export const COOKING_VERSION = 1;
export const COOKING_SKILL = 'cooking';
/** He will make you another cup, but not before you have had time to finish the last. Seconds of play. */
export const LAKOTA_CUP_WAIT = 180;
/** A cup of Lakota's hot chocolate, drunk on his bench: health restored. */
export const LAKOTA_CUP_HEALING = 60;

const recipe = (id, entry) => Object.freeze({ id, ...entry });
export const RECIPES = Object.freeze({
  'farm-pot': recipe('farm-pot', { name: 'Farm pot', xp: 25, needs: Object.freeze({ carrot: 1, barley: 1 }), makes: 'farm-pot',
    note: 'Stanley\u2019s field supper: one carrot and one barley simmered at a lit fire. A filling meal that restores up to 45 health.' }),
  'roasted-beet': recipe('roasted-beet', { name: 'Roasted beet', xp: 15, needs: Object.freeze({ beet: 1 }), makes: 'roasted-beet',
    note: 'One beet tucked into the embers at a lit fire until its skin loosens. Restores up to 35 health.' }),
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
  // The Caricas kitchen (docs/lizeem-farmlands-design.md \u00a77.6), taught by the people of the
  // farmlands quest with `learn` as every recipe is. Each dish has a fine form: its own row and
  // its own satchel item, cooked from the fine kind of each crop in it and healing 10 more. It is
  // known as soon as the plain dish is, so the fire offers it with nothing more to learn.
  'rye-cheese-loaf': recipe('rye-cheese-loaf', { name: 'Rye loaf with onion and river cheese', xp: 25, needs: Object.freeze({ 'bridge-rye': 2, 'ewe-cheese': 1 }), makes: 'rye-cheese-loaf', fine: 'rye-cheese-loaf-fine',
    note: 'Two sheaves of bridge rye baked dark with an onion through the dough, and a wedge of ewe\u2019s cheese melted over the top at a lit fire. Restores up to 25 health.' }),
  'rye-cheese-loaf-fine': recipe('rye-cheese-loaf-fine', { name: 'Fine rye loaf with onion and river cheese', xp: 35, needs: Object.freeze({ 'bridge-rye-fine': 2, 'ewe-cheese': 1 }), makes: 'rye-cheese-loaf-fine', fineOf: 'rye-cheese-loaf',
    note: 'The same loaf from two Fine bridge rye and a wedge of ewe\u2019s cheese. Restores up to 35 health.' }),
  'bean-pottage': recipe('bean-pottage', { name: 'Bean pottage', xp: 30, needs: Object.freeze({ 'field-beans': 2, barley: 1 }), makes: 'bean-pottage', fine: 'bean-pottage-fine',
    note: 'Two field beans and a barley, soaked and simmered at a lit fire until the beans give. Restores up to 40 health.' }),
  'bean-pottage-fine': recipe('bean-pottage-fine', { name: 'Fine bean pottage', xp: 40, needs: Object.freeze({ 'field-beans-fine': 2, 'barley-fine': 1 }), makes: 'bean-pottage-fine', fineOf: 'bean-pottage',
    note: 'Bean pottage from two Fine field beans and a Fine barley. Restores up to 50 health.' }),
  'soft-fruit-tart': recipe('soft-fruit-tart', { name: 'Soft-fruit tart', xp: 40, needs: Object.freeze({ 'soft-fruit': 2, 'bridge-rye': 1 }), makes: 'soft-fruit-tart', fine: 'soft-fruit-tart-fine',
    note: 'Two soft fruit in a crust of bridge-rye meal, baked at a lit fire until the juice runs. Restores up to 45 health.' }),
  // 50, not 55: tests/foods.test.js holds every food at 50 or less (src/consumables.js).
  'soft-fruit-tart-fine': recipe('soft-fruit-tart-fine', { name: 'Fine soft-fruit tart', xp: 50, needs: Object.freeze({ 'soft-fruit-fine': 2, 'bridge-rye-fine': 1 }), makes: 'soft-fruit-tart-fine', fineOf: 'soft-fruit-tart',
    note: 'The tart from two Fine soft fruit and a Fine bridge rye. Restores up to 50 health.' }),
  // Mererid's oatcakes and Gwyddno's smoked fish; Aegir's white bread and Idunn's nut cake (6 October 2026).
  ...NETHEREUM_RECIPES, ...NESDOR_RECIPES,
  // Flatbread and millet porridge; fork stew with floodwheat or hard wheat (6 October 2026).
  ...OVESOS_RECIPES, ...DIVIDING_RECIPES,
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

export function createCooking({ skills, onEvent = () => {}, canUseFire = () => true } = {}) {
  const state = { met: false, known: new Set(), made: {}, cups: 0, lastCup: -Infinity };
  /** A fine dish is known with its plain one; learning the fine form learns the plain. */
  const knows = id => state.known.has(id) || (!!RECIPES[id]?.fineOf && state.known.has(RECIPES[id].fineOf));

  /** A recipe learned; the first one teaches the skill. */
  function learn(requested, { preparedFire = false } = {}) {
    if (!Object.hasOwn(RECIPES, requested ?? '')) return { ok: false, reason: 'Nobody makes that.' };
    if (!preparedFire && !canUseFire()) return { ok: false, reason: 'Learn Fire Making from Lee Anne, or take a lesson at a teacher’s already-lit fire.' };
    const id = RECIPES[requested].fineOf ?? requested;
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
  function make(id, inventory, { preparedFire = false } = {}) {
    if (!preparedFire && !canUseFire()) return { ok: false, reason: 'Learn Fire Making from Lee Anne before cooking.' };
    const entry = Object.hasOwn(RECIPES, id ?? '') ? RECIPES[id] : null;
    if (!entry) return { ok: false, reason: 'Nobody makes that.' };
    if (!knows(id)) return { ok: false, reason: `You do not know how to make ${entry.name.toLowerCase()} yet.` };
    const lacking = missing(id, inventory);
    if (lacking.length) return { ok: false, reason: `You need ${lacking.join(' and ')}.`, lacking };
    const used = [];
    for (const [item, count] of Object.entries(entry.needs)) {
      if (!inventory.remove(item, count)) {
        for (const [back, quantity] of used) inventory.add(back, quantity);
        return { ok: false, reason: 'The ingredients could not be used. Nothing was cooked.' };
      }
      used.push([item, count]);
    }
    if (!inventory.add(entry.makes, 1)) {
      for (const [back, quantity] of used) inventory.add(back, quantity);
      return { ok: false, reason: 'There is no room for the meal. Your ingredients have been kept.' };
    }
    return noteMade(id);
  }

  /** Something made some other way (a fish cooked at the fire), counted toward the skill once it is learned. */
  function noteMade(id) {
    const entry = RECIPES[id];
    if (!entry) return { ok: false };
    const first = !state.made[id];
    state.made[id] = (state.made[id] ?? 0) + 1;
    const gained = state.met ? skills?.gain?.(COOKING_SKILL, entry.xp) ?? { ok: false } : null;
    onEvent({ type: 'cooked', id, first });
    return { ok: true, first, entry, xp: gained?.ok ? entry.xp : 0, levelled: !!gained?.levelled, level: skills?.level?.(COOKING_SKILL) ?? 1 };
  }

  function view() {
    const knownHere = id => knows(id) || (id === 'cooked-fish' && state.met);
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
    get met() { return state.met; }, get cups() { return state.cups; }, knows };
}
