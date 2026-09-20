/**
 * Money. For now the game runs on Ambroni copper pieces alone; the rest of the
 * design (silver and gold at ten to one, and the Coalition's paper scrip that
 * only the rebels honour) is recorded here and in docs/economy.md so that the
 * peddler can explain it truthfully before it is built.
 */
export const COPPER_ITEM = 'copper-piece';

export const CURRENCIES = Object.freeze({
  copper: Object.freeze({ id: COPPER_ITEM, name: 'copper piece', plural: 'copper pieces', inCopper: 1, issuer: 'empire', built: true }),
  silver: Object.freeze({ id: 'silver-piece', name: 'silver piece', plural: 'silver pieces', inCopper: 10, issuer: 'empire', built: false }),
  gold: Object.freeze({ id: 'gold-piece', name: 'gold piece', plural: 'gold pieces', inCopper: 100, issuer: 'empire', built: false }),
  scrip: Object.freeze({ id: 'coalition-scrip', name: 'Coalition scrip', plural: 'Coalition scrip', inCopper: null, issuer: 'coalition', built: false }),
});

/** The traveler's advance from the recruiter, in copper, at the landing. */
export const STARTING_PURSE = 24;

/** Spell out a sum of copper the way a market would: gold, silver and copper, omitting empty ranks. */
export function describeSum(copper) {
  if (!Number.isInteger(copper) || copper < 0) return 'nothing';
  if (copper === 0) return 'no copper';
  const gold = Math.floor(copper / 100), silver = Math.floor((copper % 100) / 10), rest = copper % 10;
  const parts = [];
  if (gold) parts.push(`${gold} gold`);
  if (silver) parts.push(`${silver} silver`);
  if (rest || !parts.length) parts.push(`${rest} copper`);
  return parts.join(', ');
}

export const PEDDLER = Object.freeze({
  id: 'peddler', name: 'Wendel', role: 'Peddler', modelRole: 'field-courier', color: 0x8a6a3c, stand: Object.freeze({ x: -30, z: 34 }), yaw: 2.4,
  lines: Object.freeze([
    'Copper, silver, gold: that is the Empire’s money, and the only money that buys anything in Drent. Ten coppers to a silver, ten silvers to a gold. I deal in copper; nobody on this coast has seen a gold piece since the tax men left.',
    'The rebels print paper. Coalition scrip, they call it, with a seal and a promise. Here it buys nothing. Across the Caloss it buys bread, and if their republic wins it will buy a great deal more. Keep any you come by, and do not show it at an army post.',
    'Now. Food for the road, a tinderbox, a stick or two. And a phrasebook, if you are one of the ones who came off a boat looking like you had been asked a question. What will it be?',
  ]),
});

/** What Wendel sells, in copper. Cheap staples and the tools a traveler forgets. */
export const PEDDLER_STOCK = Object.freeze([
  Object.freeze({ id: 'boiled-egg', price: 1 }),
  Object.freeze({ id: 'hardtack', price: 1 }),
  Object.freeze({ id: 'oatcake', price: 2 }),
  Object.freeze({ id: 'rye-loaf', price: 3 }),
  Object.freeze({ id: 'cooked-fish', price: 3 }),
  Object.freeze({ id: 'ewe-cheese', price: 4 }),
  Object.freeze({ id: 'dried-venison', price: 6 }),
  Object.freeze({ id: 'milk', price: 2 }),
  Object.freeze({ id: 'chocolate', price: 5 }),
  Object.freeze({ id: 'forest-stick', price: 1 }),
  Object.freeze({ id: 'tinderbox', price: 8 }),
  // A phrasebook of the country it is bought in (src/linguist.js). Wendel keeps them
  // because travelers keep asking, and because he cannot understand half of them either.
  Object.freeze({ id: 'phrasebook', price: 14 }),
]);

/**
 * Whether a purchase can go through. `purse` is the copper carried, `owned` whether the
 * buyer already has the item, `stackable` whether more than one can be carried.
 */
export function purchase({ price, purse, owned = false, stackable = true }) {
  if (!Number.isInteger(price) || price < 0 || !Number.isInteger(purse) || purse < 0) return { ok: false, reason: 'That is not a price.' };
  if (owned && !stackable) return { ok: false, reason: 'You already carry one of those.' };
  if (purse < price) return { ok: false, reason: `That is ${price} copper, and you have ${describeSum(purse)}.` };
  return { ok: true, reason: '', remaining: purse - price };
}

/** The peddler's offers for a buyer, given how to read the buyer's satchel. */
export function peddlerOffers({ purse, count, items }) {
  return PEDDLER_STOCK.map(entry => {
    const item = items[entry.id];
    const result = purchase({ price: entry.price, purse, owned: count(entry.id) > 0, stackable: Boolean(item?.stackable) });
    return { id: entry.id, name: item?.name ?? entry.id, price: entry.price, enabled: result.ok, reason: result.reason, label: `${item?.name ?? entry.id} · ${entry.price} copper` };
  });
}
