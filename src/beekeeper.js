/**
 * Troy, who keeps the bees at the Bee Fold in Drent's wood.
 *
 * The fold was there before him: three old skeps in a sunny break in the trees,
 * a low fence, and flowers let go wild beyond it. Nobody in Tidehaven was quite
 * sure whose they were until Troy took them on, and now he is there most days,
 * grinning at whoever comes up the path. He wears no veil and no hat: the
 * bees know him, and he would rather see what he is doing through his spectacles.
 *
 * He is the game's source of honeycomb, which the satchel has always known about
 * (`honeycomb`, and Lysa's honey cakes) and nobody could get: the first piece is
 * a gift, and after that he will part with one for a couple of coppers, which he
 * puts toward more skeps rather than into his pocket.
 *
 * Pure: no DOM, no three.
 */
const freeze = Object.freeze;

// Never the traveler's own model: Troy is a red-bearded man in spectacles and a canvas smock,
// thin on top and grinning, with no hat and no veil: the bees know him.
export const TROY = freeze({
  id: 'bee-keeper', name: 'Troy', role: 'Keeper of the Bee Fold',
  modelRole: 'bee-keeper', color: 0xe7e0c8, skin: 0xe8b98f,
});
/**
 * On the flower side of the fold, a few strides from the skeps, half turned to them
 * and half to the path. The fold itself is at (-55, -13) in Drent's wood.
 */
export const TROY_STAND = freeze({ x: -54.2, z: -10.8, yaw: 2.5 });
export const HONEYCOMB = 'honeycomb';
/** What he asks once the first piece has been a gift. Coppers go toward more skeps. */
export const COMB_PRICE = 2;

export const BEEKEEPER_VERSION = 1;

export function validateBeekeeperSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== BEEKEEPER_VERSION) return false;
  if (typeof data.met !== 'boolean') return false;
  return Number.isInteger(data.combs) && data.combs >= 0 && data.combs <= 1e6;
}

export function createBeekeeper({ onEvent = () => {} } = {}) {
  const state = { met: false, combs: 0 };
  /** The first comb is a gift; after that he asks `COMB_PRICE`. */
  const price = () => (state.combs === 0 ? 0 : COMB_PRICE);
  function meet() { const first = !state.met; state.met = true; return { first }; }
  /**
   * Hand over a comb. `purse` spends coppers and returns whether it could;
   * `give` puts the comb in the satchel and returns whether it fitted.
   */
  function takeComb({ purse = () => true, give = () => true } = {}) {
    const cost = price();
    if (cost > 0 && !purse(cost)) return { ok: false, reason: `He asks ${cost} copper for a comb, toward the next skep.` };
    if (!give()) return { ok: false, reason: 'There is no room in your satchel for it.', refund: cost };
    state.combs++;
    onEvent({ type: 'honeycomb-given', combs: state.combs, paid: cost });
    return { ok: true, reason: '', paid: cost, first: state.combs === 1 };
  }
  const snapshot = () => ({ version: BEEKEEPER_VERSION, met: state.met, combs: state.combs });
  function restore(data) {
    state.met = false; state.combs = 0;
    if (!validateBeekeeperSnapshot(data, { allowMissing: false })) return false;
    state.met = data.met; state.combs = data.combs;
    return true;
  }
  return { meet, takeComb, price, snapshot, restore,
    get met() { return state.met; }, get combs() { return state.combs; } };
}

/** What he says about the bees, one at a time, whenever there is time for it. */
export const TROY_LINES = freeze([
  'Three skeps. The far one swarmed in the spring and I got them back out of a hawthorn with a sheet and a lot of talking. They have forgiven me.',
  'People ask where the veil is. In a box, at home. They know me, and I would rather see what I am doing. The spectacles are not for the bees; they are for everything closer than a skep.',
  'They go out to the heather on the hill and come back smelling of it, and the honey tastes of it, and that is the whole of my year.',
  'A bee will look at you for a long moment before it decides you are furniture. Stand still and be furniture. It is the best thing anybody ever taught me.',
  'Lysa makes little cakes with this and acorn meal. She will not tell me the rest of it. I have asked four times and been given cake instead of an answer, which is fair.',
]);

/**
 * Troy's conversation. `act('take-honeycomb')` hands one over in the host.
 * `visits` rotates what he tells you about the bees.
 */
export function troyConversation(npc, context) {
  const { troy, openDialogue, closeDialogue, act, coppers = 0, visits = 0 } = context;
  if (npc?.id !== TROY.id) return false;
  const leave = { id: 'leave-troy', label: 'I will leave you to them.', action: closeDialogue };
  const cost = troy.price();
  const comb = { id: 'take-honeycomb', label: cost ? `Buy a comb (${cost} copper)` : 'Take the comb', action: () => { closeDialogue(); act('take-honeycomb'); } };
  const bees = { id: 'ask-bees', label: 'Tell me about the bees.', action: () => openDialogue(npc, [TROY_LINES[visits % TROY_LINES.length]], null, 'Back to Troy',
    { onComplete: () => troyConversation(npc, { ...context, visits: visits + 1 }) }) };
  const canBuy = cost === 0 || coppers >= cost;

  if (!troy.met) {
    troy.meet();
    openDialogue(npc, [
      'Hah! Somebody on the path. Come up, come up — mind the flowers, not the bees. The bees will mind themselves.',
      'Troy. These three skeps are mine, or I am theirs; it has never been settled. Everybody in Tidehaven eats the honey and nobody else will stand this close to it.',
      'Here. Your first piece of comb, and no argument. Chew it and spit the wax; the taste is the hill in it.',
    ], null, 'Back to the path', { choices: [comb, bees, leave] });
    return true;
  }
  const line = cost === 0 ? 'Back again. There is comb cut and waiting, and it is still yours for nothing until you have had one.'
    : canBuy ? `Back again, and welcome. A comb is ${cost} copper, and the coppers go into the next skep, not into me.`
      : `A comb is ${cost} copper, and you are short. Come back when you are not; the bees are not going anywhere.`;
  openDialogue(npc, [line], null, 'Back to the path', { choices: [...(canBuy ? [comb] : []), bees, leave] });
  return true;
}
