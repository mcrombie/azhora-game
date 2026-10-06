/**
 * What the farm goods of the Lizeem fetch, in copper: the first pass of the Farmlands of the Lizeem
 * (docs/lizeem-farmlands-design.md, sections 7.5 and 7.6).
 *
 * On 16 September 2026 the user asked that the economy not be developed further (docs/economy.md).
 * On 5 October 2026 he approved the Farmlands design and said "go ahead and implement", which lifts
 * that ruling for this work: prices, buyers, seals and orders.
 *
 * Every number here is first pass and lives in these tables so it can be tuned in play. A good that
 * is not in them has no price at all, so nothing in the satchel becomes sellable by accident.
 * Pure data and arithmetic: no imports, so the satchel's own item list can import what it needs.
 */
const freeze = Object.freeze;

/** Plain, Good, Fine and Prize (design 4.4). Away from home, Fine and Prize count only when sealed. */
export const GRADES = freeze({ plain: 1, good: 1.5, fine: 2, prize: 3 });

/** The banks of the Lizeem join only at Minora, over the White Bridge; the city is on neither. */
export const BANKS = freeze({ Caricas: 'east', Nesdor: 'east', Nethereum: 'west', Ovesos: 'west' });
/** Minora stands in Isareos, and either name means the city's market. */
export const CITY_PLACES = freeze(['Minora', 'Isareos']);

/**
 * Where a good is sold, against where it grows (design 7.5): at home, or at a neighbour on the same
 * bank, it fetches the home price; the city pays half again; the far bank pays double. Anywhere off
 * the Lizeem altogether pays the home price, since nobody there is buying for the river.
 */
export const PLACE_RATES = freeze({ home: 1, neighbour: 1, city: 1.5, farBank: 2, elsewhere: 1 });

/** The rest of the trade's arithmetic, in one place. */
export const TRADE_RATES = freeze({
  secondLot: .6,     // the second lot of a buyer's day goes at six-tenths, and the third not at all
  commissary: .6,    // Cedric's commissary pays six-tenths of the home price, for anything, without limit
  order: 1.5,        // an order pays half again the market price
  orderXp: 2,        // and two Farming experience for every copper it pays
  standingStep: .25, // each order filled raises that buyer's appetite by a quarter (design 7.7)
  standingMax: 4,    // up to four steps: twice the appetite he started with
  sealTithe: 20,     // a measurer keeps one in twenty of a lot he seals
  sealCopper: 1,     // or takes one copper, when the lot is too small to spare a twentieth
  bounty: 20,        // the Guild's bounty for the first Prize of each food
  seedPacket: 2,     // seed for a country's signature crop, a packet
});

const ALL_FOUR = ['Caricas', 'Nethereum', 'Nesdor', 'Ovesos'];
const good = (base, kind, home) => freeze({ base, kind, home: freeze([...home]) });

/**
 * Plain produce, in its own country (design 7.5). `home` is where it grows; carrots and beets are the
 * old commons crops and grow anywhere. Ids for Builds 2 to 4 are priced now so the table is whole;
 * nothing can sell them until their crops exist. The Nethereum ids are the contract's of 6 October
 * 2026 (`flood-oats`, `meadow-hay`), and bridge rye grows on the Nesdor rises as well as in Caricas.
 */
export const FARM_GOODS = freeze({
  carrot: good(1, 'root', ALL_FOUR),
  beet: good(1, 'root', ALL_FOUR),
  barley: good(1, 'grain', ['Caricas', 'Nesdor', 'Ovesos']),
  rye: good(1, 'grain', ['Nesdor']),
  'bridge-rye': good(1, 'grain', ['Caricas', 'Nesdor']),
  'flood-oats': good(1, 'grain', ['Nethereum']),
  millet: good(1, 'grain', ['Ovesos']),
  'field-beans': good(1, 'pulse', ['Caricas']),
  'soft-fruit': good(2, 'fruit', ['Caricas']),
  hazelnuts: good(2, 'nut', ['Nesdor']),
  floodwheat: good(2, 'grain', ['Nesdor']),
  'hard-wheat': good(2, 'grain', ['Ovesos']),
  'meadow-hay': good(2, 'fodder', ['Nethereum']),
  'weir-fish': good(2, 'fish', ['Nethereum']),
  flour: good(3, 'flour', ['Nesdor', 'Ovesos']),
  'dye-crop': good(4, 'dye', ['Ovesos']),
});

/**
 * Dishes (design 7.6), each at home in the country that cooks it; the fork stew is the city's own.
 * The rye loaf with onion and river cheese is `rye-cheese-loaf`: plain `rye-loaf` is Wendel's mill
 * bread, sold in Drent, and has no price here so it cannot be carried to Minora at a profit. In the
 * same way the Nethrani oatcakes are `oatcakes` (6 October 2026), and Wendel's `oatcake` at two
 * copper has no price here, which closes the resale noted at Build 1's handoff.
 */
export const DISH_PRICES = freeze({
  'rye-cheese-loaf': good(3, 'dish', ['Caricas']),
  'bean-pottage': good(4, 'dish', ['Caricas']),
  'soft-fruit-tart': good(7, 'dish', ['Caricas']),
  oatcakes: good(3, 'dish', ['Nethereum']),
  'smoked-fish': good(4, 'dish', ['Nethereum']),
  'white-bread': good(5, 'dish', ['Nesdor']),
  'nut-cake': good(8, 'dish', ['Nesdor']),
  flatbread: good(4, 'dish', ['Ovesos']),
  'millet-porridge': good(2, 'dish', ['Ovesos']),
  'fork-stew': good(12, 'dish', ['Minora']),
});

/**
 * What the countries' people sell and buy besides crops and dishes (the contract for Builds 2 and 3,
 * 6 October 2026): the weir-master's salt, the cattle-woman's butter and manure, the innkeeper's ale,
 * the drover's hides, and Airmid's harvest basket. Priced, so a buyer who wants them can pay for them.
 */
export const WARES = freeze({
  salt: good(2, 'salt', ['Nethereum']),
  butter: good(3, 'dairy', ['Nethereum']),
  manure: good(1, 'manure', ['Nethereum']),
  ale: good(3, 'drink', ['Nesdor']),
  hides: good(2, 'hide', ['Nesdor', 'Nethereum']),
  'harvest-basket': good(20, 'tool', ['Nethereum']),
});

export const PRICE_TABLE = freeze({ ...FARM_GOODS, ...DISH_PRICES, ...WARES });

/**
 * The satchel keeps two kinds of each crop, ordinary and fine (design 4.4): `bridge-rye` and
 * `bridge-rye-fine`. The fine kind is priced as the Fine grade of the ordinary one.
 */
export const FINE_SUFFIX = '-fine';
export function gradeVariant(itemId) {
  if (typeof itemId !== 'string') return { base: null, fine: false };
  if (Object.hasOwn(PRICE_TABLE, itemId)) return { base: itemId, fine: false };
  if (itemId.endsWith(FINE_SUFFIX)) {
    const base = itemId.slice(0, -FINE_SUFFIX.length);
    if (Object.hasOwn(PRICE_TABLE, base)) return { base, fine: true };
  }
  return { base: null, fine: false };
}
/** The table's row for an item, ordinary or fine, or null when it has no price. */
export const goodOf = itemId => { const { base } = gradeVariant(itemId); return base ? PRICE_TABLE[base] : null; };
export const isPriced = itemId => goodOf(itemId) !== null;

const inCity = place => CITY_PLACES.includes(place);
/** Whether a place is home to a good: the city counts as home only for what it cooks itself. */
export function atHome(itemId, place, home = goodOf(itemId)?.home) {
  if (home === true) return true;
  const homes = [].concat(home ?? []);
  return homes.includes(place) || (inCity(place) && homes.some(inCity));
}

/** The place multiplier alone: home, neighbour, the city, or the far bank. */
export function placeRate(itemId, place, home = goodOf(itemId)?.home) {
  if (place === undefined || place === null || atHome(itemId, place, home)) return PLACE_RATES.home;
  const homes = [].concat(home ?? []);
  if (inCity(place)) return PLACE_RATES.city;
  const bank = BANKS[place];
  if (!bank) return PLACE_RATES.elsewhere;
  // A good the city cooks is a neighbour's to both banks; otherwise the bank decides.
  if (homes.some(h => inCity(h) || BANKS[h] === bank)) return PLACE_RATES.neighbour;
  return PLACE_RATES.farBank;
}

/**
 * One unit's price, in copper and possibly a fraction: base, then grade, then place (design 7.5).
 * Appetite is the buyer's business (src/merchants.js). `grade` defaults to Fine for a fine kind and
 * Plain otherwise; `place` is the country it is sold in; `home` overrides where it grows (a country,
 * a list, or `true` for "sold at home"). Unknown items and unknown grades have no price: undefined.
 */
export function priceOf(itemId, { grade, place, home } = {}) {
  const { base, fine } = gradeVariant(itemId);
  if (!base) return undefined;
  const g = grade ?? (fine ? 'fine' : 'plain');
  if (!Object.hasOwn(GRADES, g)) return undefined;
  const homes = home === undefined ? PRICE_TABLE[base].home : home;
  return PRICE_TABLE[base].base * GRADES[g] * placeRate(itemId, place, homes);
}

/** A lot's price: whole copper, rounded down once for the whole lot, so twelve at one and a half is 18. */
export function lotPrice(itemId, count, options = {}) {
  const unit = priceOf(itemId, options);
  if (unit === undefined || !Number.isSafeInteger(count) || count < 0) return undefined;
  return wholeCopper(unit * count);
}
/** Rounds a sum down to whole copper without losing 18 to 17.999999. */
export const wholeCopper = sum => Math.floor(sum + 1e-9);
