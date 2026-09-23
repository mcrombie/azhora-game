/**
 * **The skeps, and the comb they pay.** Liz keeps them now, in a clearing in the woods of Pueth
 * (`src/cat-quest.js`, which owns her and her quest); Troy kept them at the Bee Fold in Drent's
 * wood until 22 September 2026, when the user sent him to Cobble to look into a murder
 * (`src/murder-quest.js`) and gave the bees to her.
 *
 * So this file is the trade and not the person: how many combs have been cut, what the next one
 * costs, and what whoever keeps the skeps says about bees. The save key is still `troy`, because
 * ids and keys are sticky in this game even when the people move.
 *
 * Pure: no DOM, no three.
 */
export const HONEYCOMB = 'honeycomb';
/** What she asks once the first piece has been a gift. Coppers go toward more skeps. */
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
  /** The first comb is a gift; after that she asks `COMB_PRICE`. */
  const price = () => (state.combs === 0 ? 0 : COMB_PRICE);
  function meet() { const first = !state.met; state.met = true; return { first }; }
  /**
   * Hand over a comb. `purse` spends coppers and returns whether it could;
   * `give` puts the comb in the satchel and returns whether it fitted.
   */
  function takeComb({ purse = () => true, give = () => true } = {}) {
    const cost = price();
    if (cost > 0 && !purse(cost)) return { ok: false, reason: `She asks ${cost} copper for a comb, toward the next skep.` };
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

/** What Liz says about the bees, one at a time, whenever there is time for it. */
export const BEE_LINES = Object.freeze([
  'Three skeps. The far one swarmed in the spring and I got them back out of a birch with a sheet and a great deal of talking, and they have decided to forgive me.',
  'People ask where the veil is. I have one. It is at the house. They know me, and I would rather see what I am doing.',
  'They go out to the heather on the hills and come back smelling of it, and the honey tastes of it, and that is the whole of my year.',
  'A bee will look at you for a long moment before it decides you are furniture. Stand still and be furniture. Everything I know is a version of that.',
  'I am the only comb between here and Tidehaven now. A man in Drent used to keep three skeps and he has gone to sea, or to an island, or somewhere with a quay on it.',
]);
