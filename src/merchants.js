/**
 * The buyers and sellers of the Lizeem: who buys what, how much of it a day and at what price, the
 * measurer's seal, the order boards, the Guild's bounty, and the one trade dialogue they all open
 * (docs/lizeem-farmlands-design.md, section 7).
 *
 * The user approved the Farmlands design on 5 October 2026 and said "go ahead and implement"; that
 * lifts, for this work, his ruling of 16 September that the economy not be developed (docs/economy.md).
 * Prices are src/prices.js. Appetites and stock are first pass and live in BUYERS so they can be tuned.
 *
 * Buyers are data. The people who stand behind them are placed by src/lizeem-people.js, which calls
 * `openTrade` for its "Trade" choice; this module owns the trade and the dialogue it opens, and is a
 * subsystem in the usual shape (snapshot, restore, and a validator that accepts a missing section).
 * It imports nothing that imports the satchel, so src/inventory.js can register MERCHANT_ITEMS.
 *
 * The groundwork for Builds 2 to 5 (the user, 6 October 2026: "keep building everything"): each
 * country declares its buyers and order boards in its own module and registers them at start-up
 * (`registerBuyers`, `registerBoards`), and Build 1's are registered the same way below. A buyer's
 * wants each carry their own appetite, as the design's table gives them (the cattle-woman takes 24 hay
 * and 12 barley a day); a want may name several goods that share one appetite (Consus's 24).
 */
import { describeSum, earn, pay, peddlerOffers, purse, till } from './economy.js';
import { BANKS, TRADE_RATES, atHome, goodOf, gradeVariant, isPriced, priceOf as tablePrice, wholeCopper } from './prices.js';

const freeze = Object.freeze;
export const MERCHANTS_VERSION = 1;

/**
 * A game day is 24 minutes of play: one second of play is one game minute, and the clock reads six in
 * the morning when play begins (src/brandy-home.js). Appetites refill and orders come down at midnight.
 */
export const GAME_DAY_SECONDS = 1440;
const DAWN = 360;
export const gameDay = seconds => Math.floor((DAWN + (Number.isFinite(seconds) ? Math.max(0, seconds) : 0)) / GAME_DAY_SECONDS);

/** As src/farming.js SEED_PACKET_SIZE: a packet is four seeds. */
const SEED_PACKET = 4;
/**
 * Seed by the packet (design 7.8), under the ids the farming module registers. Until an id is in the
 * satchel's item list it is simply not on the stall, so a misnamed seed hides instead of breaking.
 */
export const SEED_ITEMS = freeze({ 'bridge-rye': 'bridge-rye-seed', 'field-beans': 'field-beans-seed', 'soft-fruit': 'soft-fruit-seed' });

/**
 * Ilmarinen's tools (design 6.3 and 7.8): a hoe, a sickle, a pruning hook and a water yoke, in bog iron,
 * iron and steel. `helps` names the farm act each one is for; what it does there is the farming
 * module's to decide. The satchel entries are MERCHANT_ITEMS, below.
 */
const TOOL_TIERS = freeze([
  freeze({ tier: 1, id: 'bog-iron', name: 'Bog-iron', price: 12, made: 'ash and bog iron', note: 'It will do. He says so himself, which is more than most smiths will.' }),
  freeze({ tier: 2, id: 'iron', name: 'Iron', price: 35, made: 'ash and wrought iron', note: 'Heavier than the bog iron, and slower to lose its edge.' }),
  freeze({ tier: 3, id: 'steel', name: 'Steel', price: 120, made: 'seasoned ash and upland steel', note: 'Priced as if he had dug the ore out with his teeth. The upland is steep; he more or less did.' }),
]);
const TOOL_KINDS = freeze([
  freeze({ id: 'hoe', name: 'hoe', helps: 'sow', icon: 'stick', use: 'for breaking a bed before it is sown' }),
  freeze({ id: 'sickle', name: 'sickle', helps: 'reap', icon: 'axe', use: 'for reaping' }),
  freeze({ id: 'pruning-hook', name: 'pruning hook', helps: 'prune', icon: 'axe', use: 'for fruit canes and orchard trees' }),
  freeze({ id: 'water-yoke', name: 'water yoke', helps: 'water', icon: 'jug', use: 'for carrying two pails to a bed at once' }),
]);
export const FARM_TOOLS = freeze(TOOL_KINDS.flatMap(kind => TOOL_TIERS.map(t =>
  freeze({ id: `${t.id}-${kind.id}`, name: `${t.name} ${kind.name}`, tool: kind.id, helps: kind.helps, tier: t.tier, price: t.price }))));

/** Satchel entries for what these merchants sell and nobody else makes. src/inventory.js spreads them in. */
export const MERCHANT_ITEMS = freeze({
  ...Object.fromEntries(TOOL_KINDS.flatMap(kind => TOOL_TIERS.map(t => [`${t.id}-${kind.id}`, freeze({
    name: `${t.name} ${kind.name}`, type: 'Tool', icon: kind.icon,
    brief: `Ilmarinen’s work: ${t.made}, ${kind.use}.`,
    description: `A ${kind.name} from Ilmarinen’s bench at the Caricas town workshop, ${t.made}, ${kind.use}. ${t.note}`,
  })]))),
  charcoal: freeze({ name: 'Charcoal', type: 'Material', icon: 'logs', stackable: true,
    brief: 'A sack of charcoal from the fox keepers’ wood in Caricas.',
    description: 'Burnt at the edge of the keepers’ wood and carried over the White Bridge by the Carican factor. It burns hot and clean, and Minora’s smiths say they will use nothing else, which is what smiths say.' }),
});

const stock = (id, price, quantity = 1) => freeze({ id, price, quantity });
const packet = crop => ({ id: SEED_ITEMS[crop], price: TRADE_RATES.seedPacket, quantity: SEED_PACKET });

/**
 * The buyers, by id, in the order they were registered, and their ids. Live: a country's buyers join
 * them at start-up. Each is the normalised form of what was registered: `where` is the place the
 * price is reckoned in, `wants` every good or kind he takes, `groups` the wants with their appetites,
 * `appetite` the first want's (as Build 1 had one appetite a buyer), and `services` what else he does.
 */
export const BUYERS = {};
export const BUYER_IDS = [];
const PLACES = freeze(['Minora', 'Isareos', 'Caricas', 'Nethereum', 'Nesdor', 'Ovesos']);
/** 'nethereum' is Nethereum: the price table names places as the atlas does. */
const placeName = place => { const text = String(place ?? '').trim(); return PLACES.find(name => name.toLowerCase() === text.toLowerCase()) ?? text; };
const DEFAULT_LINES = freeze({ open: '“I buy what I need, and I sell what I have.”', full: '“I have enough until tomorrow.”',
  none: '“Nothing I want today.”' });

/**
 * A buyer as a country declares him (the contract for Builds 2 and 3, 6 October 2026):
 * `{ id, name, place, wants: [{ item, appetite }], sells: [{ id, price, quantity? }], seals?, bounty?, board?,
 *   role?, at?, sealedOnly?, rate?, services?, lines? }`. A want's `item` is an item id, a kind from the
 * price table ('grain', 'dish', 'fodder'), 'west-bank' / 'east-bank' for goods that grow only on that
 * bank, 'any', or a list of these sharing one appetite; `appetite` is units a game day at the full price
 * (as many again at six-tenths, then "enough until tomorrow"). `seals` makes him a sworn measurer,
 * `bounty` pays the Guild's bounty, `board` names his order board, `rate` buys everything without limit
 * at that share of the home price (the commissary), and `sealedOnly` takes only sealed goods. `lines`
 * are `{ open, full, none, paid }`, where `paid` is a function of the copper paid or a string with
 * `{total}` in it; any left out are plain.
 */
function buyerOf(spec) {
  const groups = [].concat(spec.wants ?? []).map(want => (typeof want === 'string' ? { item: want } : want ?? {}))
    .map(want => freeze({ items: freeze([].concat(want.item ?? want.items ?? []).map(String)), appetite: want.appetite ?? spec.appetite ?? 0 }))
    .filter(group => group.items.length);
  const services = [...new Set([...(spec.seals ? ['seal'] : []), ...(spec.board ? ['orders'] : []), ...(spec.bounty ? ['bounty'] : []), ...(spec.services ?? [])])];
  const lines = { ...DEFAULT_LINES, ...(spec.lines ?? {}) }, paid = lines.paid;
  lines.paid = typeof paid === 'function' ? paid : typeof paid === 'string' ? total => paid.replaceAll('{total}', total) : total => `${spec.name} pays ${total} copper.`;
  return freeze({ id: spec.id, name: spec.name, role: spec.role ?? '', where: placeName(spec.place ?? spec.where), at: spec.at ?? '',
    wants: freeze([...new Set(groups.flatMap(group => group.items))]), groups: freeze(groups), appetite: groups[0]?.appetite ?? 0,
    sells: freeze((spec.sells ?? []).map(entry => stock(entry.id, entry.price, entry.quantity ?? 1))), services: freeze(services),
    sealedOnly: !!spec.sealedOnly, ...(spec.rate ? { rate: spec.rate } : {}), ...(spec.board ? { board: spec.board } : {}), lines: freeze(lines) });
}

/**
 * Buyers join the market at start-up: a country's module calls this at its top level, so whoever
 * imports it (the game, the save's validator, a test) has them. A buyer needs an id nobody else has,
 * a name and a place; a want's appetite is a whole number of units or Infinity, and stock is sold at a
 * whole price. Answers `{ ok, added, refused: [{ id, reason }] }`; nothing refused is half-registered.
 */
export function registerBuyers(list) {
  const added = [], refused = [];
  for (const spec of [].concat(list ?? [])) {
    const id = spec?.id, no = reason => refused.push({ id: id ?? null, reason });
    if (typeof id !== 'string' || !id || typeof spec.name !== 'string' || !spec.name || !String(spec.place ?? spec.where ?? '').trim()) { no('A buyer needs an id, a name and a place.'); continue; }
    if (Object.hasOwn(BUYERS, id)) { no('Another buyer already has that id.'); continue; }
    const b = buyerOf(spec);
    if (!b.groups.every(group => group.appetite === Infinity || (Number.isSafeInteger(group.appetite) && group.appetite >= 0))) { no('An appetite is a whole number of units a day.'); continue; }
    if (!b.sells.every(entry => typeof entry.id === 'string' && Number.isSafeInteger(entry.price) && entry.price > 0 && Number.isSafeInteger(entry.quantity) && entry.quantity > 0)) { no('Stock is sold at a whole price, by the whole unit.'); continue; }
    BUYERS[id] = b; BUYER_IDS.push(id); added.push(id);
  }
  return { ok: refused.length === 0, added, refused };
}

/**
 * The buyers of Build 1 (design 6.2, 6.3 and 7.4), in the form every country uses. `place` is the
 * country the price is reckoned in.
 */
export const BUILD_ONE_BUYERS = freeze([
  { id: 'nepri', name: 'Nepri', role: 'Grain clerk of the Measure House', place: 'Minora', at: 'the River storehouse',
    wants: [{ item: 'grain', appetite: 30 }], sealedOnly: true, seals: true, board: 'measure-house',
    lines: {
      open: '“Sealed grain I buy, for the granary trust. Unsealed grain I seal: one in twenty, or a copper for a small lot. The board by the door has today’s orders.”',
      full: '“The granary has enough until tomorrow. Whatever the commissary thinks, it is not bottomless.”',
      none: '“Sealed grain only. I can seal it for you, if you have any.”',
      paid: total => `He writes the lot in the column marked “sold”, which is a small pleasure for him these days, and counts out ${total} copper.`,
    } },
  { id: 'portunus', name: 'Portunus', role: 'The Carican factor', place: 'Minora', at: 'the market corner',
    wants: [{ item: 'west-bank', appetite: 20 }], sells: [packet('bridge-rye'), packet('field-beans'), { id: 'charcoal', price: 2 }],
    lines: {
      open: '“West-bank goods. For home. I sell seed and charcoal.”',
      full: '“Enough for today. Tomorrow.”',
      none: '“Nothing from the west bank. Then nothing.”',
      paid: total => `He counts it twice. “${total} copper. Good.”`,
    } },
  { id: 'rudiger', name: 'Rudiger', role: 'Cedric’s commissary', place: 'Minora', at: 'the western barracks',
    wants: [{ item: 'any', appetite: Infinity }], rate: TRADE_RATES.commissary,
    lines: {
      open: '“The garrison buys anything that can be eaten, without limit, at six-tenths of what it fetches where it was grown. Those are my orders.”',
      full: '“The garrison is never full.”',
      none: '“Nothing the garrison eats. Come back when you have.”',
      paid: total => `He writes it in the ledger under his arm and pays ${total} copper without looking at you, or at the goods.`,
    } },
  { id: 'consus', name: 'Consus', role: 'Grain factor and sworn measurer', place: 'Caricas', at: 'the grain court',
    wants: [{ item: ['rye', 'bridge-rye', 'barley', 'field-beans', 'soft-fruit'], appetite: 24 }],
    sells: [packet('bridge-rye'), packet('field-beans')], seals: true, board: 'grain-court',
    lines: {
      open: '“Rye, barley, beans and fruit, for the granary. I seal lots, I sell seed, and the board has today’s orders. The garrison reads my books. So do I.”',
      full: '“The granary has enough until tomorrow.”',
      none: '“Rye, barley, beans or fruit. You have none of them.”',
      paid: total => `He weighs it, writes it in his book while the garrison’s clerk reads over his shoulder, and pays ${total} copper.`,
    } },
  { id: 'pomona', name: 'Pomona', role: 'Orchard-wife of the East Orchard', place: 'Caricas', at: 'the East Orchard',
    wants: [{ item: 'soft-fruit', appetite: 12 }], sells: [packet('soft-fruit')],
    lines: {
      open: '“Soft fruit, I buy. Canes, I sell. Mind the gate.”',
      full: '“I have all the fruit I can boil today.”',
      none: '“No fruit. Then it is canes you want, or nothing.”',
      paid: total => `She takes the fruit in over the gate and pays ${total} copper back across it.`,
    } },
  { id: 'ilmarinen', name: 'Ilmarinen', role: 'Toolsmith of the eastern upland', place: 'Caricas', at: 'the town workshop',
    sells: FARM_TOOLS.map(tool => ({ id: tool.id, price: tool.price })),
    lines: {
      open: '“Hoes, sickles, pruning hooks and water yokes, in bog iron, iron and steel. The steel is dear because the upland is steep.”',
      full: '', none: '“I make tools. I do not buy turnips.”',
      paid: total => `${total} copper.`,
    } },
  { id: 'seshat', name: 'Seshat', role: 'Keeper of the Guild’s ledger', place: 'Minora', at: 'the Guild Library', bounty: true,
    lines: {
      open: '“The Guild pays a bounty for the first Prize of each food, once, when a measurer has sealed it. I write it down. Then I pay.”',
      full: '', none: '“No Prize I have not already paid for. The ledger is patient.”',
      paid: total => `She writes it into the ledger in a hand you could rule lines by, and pays the Guild’s bounty: ${total} copper.`,
    } },
  { id: 'satet', name: 'Satet', role: 'Bowl-Keeper of the Grand Temple', place: 'Minora', at: 'the temple court',
    wants: [{ item: 'dish', appetite: 8 }], services: ['healing'],
    lines: {
      open: '“The pilgrims’ kitchen buys cooked food, and pays best for Fine. The river does not mind what it eats. The pilgrims do.”',
      full: '“The kitchen has enough until tomorrow. Come back after the bell.”',
      none: '“Cooked food. A dish, not the makings of one.”',
      paid: total => `She tastes one, says nothing, and pays ${total} copper from the kitchen’s purse.`,
    } },
]);
registerBuyers(BUILD_ONE_BUYERS);
/** The measurer of a seal whose caller did not say which: the seal is good, the place is the caller's to know. */
const ANY_MEASURER = freeze({ id: null, name: 'The measurer', where: null, services: freeze(['seal']) });

/** The buyer a person trades as: `npc.buyer`, the id itself, or the id's last word ('lizeem-nepri'). */
export function buyerForNpc(npc) {
  const id = String(npc?.buyer ?? npc?.id ?? '');
  return BUYERS[id] ?? BUYERS[id.split('-').at(-1)] ?? null;
}

const posting = (item, min, max, requester) => freeze({ item, min, max, requester });
/**
 * The order boards (design 7.7), by id; live, as the buyers are. Each posts three orders a game day
 * from its list; an order pays half again the market price where the board stands, plus Farming
 * experience, and comes down at midnight if nobody fills it. Postings for goods not yet in the
 * satchel's item list are skipped.
 */
export const ORDERS_PER_DAY = 3;
export const ORDER_BOARDS = {};

/**
 * Order boards join the market at start-up, as buyers do: `{ id, name, buyer, place, postings: [{ item,
 * min, max, requester }] }`, where `buyer` is the registered buyer whose appetite a filled order raises
 * (Forseti's `nesdor-way`). Answers `{ ok, added, refused }`.
 */
export function registerBoards(list) {
  const added = [], refused = [];
  for (const spec of [].concat(list ?? [])) {
    const id = spec?.id, no = reason => refused.push({ id: id ?? null, reason });
    if (typeof id !== 'string' || !id || typeof spec.name !== 'string' || !String(spec.place ?? spec.where ?? '').trim()) { no('A board needs an id, a name and a place.'); continue; }
    if (Object.hasOwn(ORDER_BOARDS, id)) { no('Another board already has that id.'); continue; }
    if (!Object.hasOwn(BUYERS, spec.buyer)) { no('A board belongs to a registered buyer.'); continue; }
    const postings = [].concat(spec.postings ?? []);
    if (!postings.length || !postings.every(p => typeof p?.item === 'string' && Number.isSafeInteger(p.min) && Number.isSafeInteger(p.max) && p.min >= 1 && p.max >= p.min
      && typeof p.requester === 'string' && p.requester)) { no('Each posting needs a good, a count from one up, and who wants it.'); continue; }
    ORDER_BOARDS[id] = freeze({ id, name: spec.name, buyer: spec.buyer, where: placeName(spec.place ?? spec.where),
      postings: freeze(postings.map(p => posting(p.item, p.min, p.max, p.requester))) });
    added.push(id);
  }
  return { ok: refused.length === 0, added, refused };
}

/** Build 1's boards: the Measure House in Minora and the grain court in Caricas. */
export const BUILD_ONE_BOARDS = freeze([
  { id: 'measure-house', name: 'The Measure House board', buyer: 'nepri', place: 'Minora', postings: [
    posting('bridge-rye', 10, 20, 'The granary trust'), posting('bridge-rye-fine', 4, 8, 'The barge for Nylon'),
    posting('barley', 10, 20, 'The granary trust'), posting('field-beans', 6, 12, 'The bridge wardens’ mess'),
    posting('soft-fruit', 4, 8, 'The Guild’s kitchen'), posting('soft-fruit-fine', 2, 6, 'The barge for Nylon'),
    posting('rye-cheese-loaf', 3, 6, 'The bridge wardens’ mess'), posting('bean-pottage', 3, 6, 'The temple kitchen'),
    posting('soft-fruit-tart', 2, 4, 'The temple kitchen'),
  ] },
  { id: 'grain-court', name: 'The grain court board', buyer: 'consus', place: 'Caricas', postings: [
    posting('bridge-rye', 10, 20, 'The Council’s granary'), posting('bridge-rye-fine', 4, 8, 'The Council’s granary'),
    posting('barley', 10, 20, 'The garrison’s quartermaster'), posting('field-beans', 8, 16, 'The fox keepers’ winter store'),
    posting('field-beans-fine', 4, 8, 'The fox keepers’ winter store'), posting('soft-fruit', 4, 10, 'The town bakehouse'),
    posting('carrot', 8, 16, 'The watch-house'), posting('bean-pottage', 3, 6, 'The watch-house'),
    posting('soft-fruit-tart', 2, 4, 'The garrison’s officers’ table'),
  ] },
]);
registerBoards(BUILD_ONE_BOARDS);

/** A small deterministic generator, so a board shows the same three orders all day without saving them. */
function seeded(text) {
  let h = 2166136261;
  for (const c of text) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h = (h + 0x6D2B79F5) | 0; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const isPlain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const count0 = n => Number.isSafeInteger(n) && n >= 0;
const onlyKeys = (value, keys) => Object.keys(value).every(key => keys.includes(key));
const uniqueStrings = list => Array.isArray(list) && list.every(id => typeof id === 'string') && new Set(list).size === list.length;

/**
 * Whether a saved merchants section can be restored. A missing section is a save from before the
 * merchants and starts from nothing owed and nothing sold. Days are game days; nothing here can
 * grant an item or a coin on restore.
 */
export function validateMerchantsSnapshot(data) {
  if (data === undefined) return true;
  if (!isPlain(data) || data.version !== MERCHANTS_VERSION) return false;
  if (!onlyKeys(data, ['version', 'appetites', 'standing', 'sealed', 'prizes', 'bounties', 'orders'])) return false;
  const { appetites = {}, standing = {}, sealed = {}, prizes = [], bounties = [], orders = {} } = data;
  if (![appetites, standing, sealed, orders].every(isPlain)) return false;
  // `each` is what each of a buyer's wants took today, when he has more than one (6 October 2026).
  for (const [id, entry] of Object.entries(appetites))
    if (!Object.hasOwn(BUYERS, id) || !isPlain(entry) || !onlyKeys(entry, ['day', 'taken', 'each']) || !count0(entry.day) || !count0(entry.taken)
      || (entry.each !== undefined && (!Array.isArray(entry.each) || !entry.each.length || entry.each.length > Math.max(1, BUYERS[id].groups.length)
        || !entry.each.every(count0) || entry.each.reduce((sum, n) => sum + n, 0) !== entry.taken))) return false;
  for (const [id, steps] of Object.entries(standing))
    if (!Object.hasOwn(BUYERS, id) || !count0(steps) || steps > TRADE_RATES.standingMax) return false;
  for (const [id, entry] of Object.entries(sealed))
    if (!isPriced(id) || !isPlain(entry) || !onlyKeys(entry, ['count', 'prize']) || !count0(entry.count) || entry.count < 1
      || !count0(entry.prize) || entry.prize > entry.count || (entry.prize && !gradeVariant(id).fine)) return false;
  if (!uniqueStrings(prizes) || !prizes.every(id => gradeVariant(id).base === id)) return false;
  if (!uniqueStrings(bounties) || !bounties.every(id => prizes.includes(id))) return false;
  for (const [id, entry] of Object.entries(orders))
    if (!Object.hasOwn(ORDER_BOARDS, id) || !isPlain(entry) || !onlyKeys(entry, ['day', 'filled']) || !count0(entry.day)
      || !Array.isArray(entry.filled) || new Set(entry.filled).size !== entry.filled.length
      || !entry.filled.every(n => count0(n) && n < ORDERS_PER_DAY)) return false;
  return true;
}

/** The same validator under the name tests/save-round-trip.test.js sweeps for. */
export const validateMerchants = validateMerchantsSnapshot;

/** Names for the dialogue: 'bridge rye', 'Fine bridge rye'. The grade is capitalised, as the design writes it. */
function nameIn(items, id) {
  const { base, fine } = gradeVariant(id);
  const key = base ?? id;
  const plain = String(items?.[key]?.name ?? items?.[id]?.name ?? key.replace(/-/g, ' ')).toLowerCase();
  return fine ? `Fine ${plain}` : plain;
}

/**
 * The trade. `inventory` is the satchel (`count`, `add`, `remove`), `items` the satchel's item list
 * (for names, and to know which goods exist yet), `playSeconds` the play clock, `skills` takes the
 * Farming experience orders pay, `prices` can stand in for src/prices.js's `priceOf` when tuning,
 * and `onEvent` hears every sale, seal, order and bounty: { type: 'sold' | 'sealed' | 'bought' |
 * 'order-filled' | 'bounty', ... }. The Measure listens for 'sealed'.
 */
export function createMerchants({ inventory, items = {}, playSeconds = () => 0, skills = null, prices = null, onEvent = () => {} } = {}) {
  const priceOf = prices?.priceOf ?? tablePrice;
  const today = () => gameDay(playSeconds());
  const nameOf = id => nameIn(items, id);
  const known = id => Object.hasOwn(items, id);
  const fresh = () => ({ appetites: new Map(), standing: new Map(), sealed: new Map(), prizes: new Set(), bounties: new Set(), orders: new Map() });
  let state = fresh();

  // ---- Appetites -------------------------------------------------------------------------------
  /** A want's appetite (want 0 unless named), raised a quarter for each order of his filled. */
  const appetiteOf = (id, want = 0) => {
    const group = BUYERS[id]?.groups[want];
    if (!group) return 0;
    if (!Number.isFinite(group.appetite)) return group.appetite;
    return Math.round(group.appetite * (1 + TRADE_RATES.standingStep * (state.standing.get(id) ?? 0)));
  };
  const takenToday = (id, want = 0) => { const entry = state.appetites.get(id); return entry && entry.day === today() ? entry.taken[want] ?? 0 : 0; };
  /** Units a buyer will still take today of one want, at the full price and at six-tenths. */
  function appetiteLeft(id, want = 0) {
    const b = BUYERS[id];
    if (!b?.groups[want]) return { full: 0, reduced: 0 };
    if (b.rate) return { full: Infinity, reduced: 0 };
    const cap = appetiteOf(id, want), taken = takenToday(id, want);
    return { full: Math.max(0, cap - taken), reduced: Math.max(0, 2 * cap - Math.max(taken, cap)) };
  }

  // ---- Seals -----------------------------------------------------------------------------------
  /** Sealed units of an item, never more than the satchel holds: what was eaten was the unsealed first. */
  function sealedOf(id) {
    const entry = state.sealed.get(id), held = inventory?.count?.(id) ?? 0;
    if (!entry) return { count: 0, prize: 0 };
    const count = Math.min(entry.count, held);
    return { count, prize: Math.min(entry.prize, count) };
  }
  function setSealed(id, count, prize) {
    if (count > 0) state.sealed.set(id, { count, prize: Math.min(prize, count) }); else state.sealed.delete(id);
  }

  // ---- What a buyer will take ------------------------------------------------------------------
  /** Which of a buyer's wants takes an item, or -1: the first that names it, its kind, its bank or 'any'. */
  function wantOf(b, id) {
    const good = goodOf(id);
    if (!good || !b) return -1;
    const { base } = gradeVariant(id);
    const banks = good.home.map(home => BANKS[home]);
    return b.groups.findIndex(group => group.items.some(want => want === 'any' || want === base || want === good.kind
      || (want === 'west-bank' && banks.every(bank => bank === 'west')) || (want === 'east-bank' && banks.every(bank => bank === 'east'))));
  }
  const wants = (b, id) => wantOf(b, id) >= 0;
  /** One unit's price to this buyer at a grade: the commissary pays a share of the home price, everyone else the market's. */
  const unitPrice = (b, id, grade) => (b.rate ? (priceOf(id, { grade }) ?? 0) * b.rate : priceOf(id, { grade, place: b.where }) ?? 0);
  /**
   * The units of one item a buyer would take, best first. A fine kind counts as Fine at home, or
   * anywhere once sealed; unsealed away from home it sells as Plain (design 4.4). At equal value the
   * unsealed go first, so seals are kept for where they count.
   */
  function groupsFor(b, id) {
    const held = inventory?.count?.(id) ?? 0;
    if (!held || !wants(b, id)) return [];
    const { fine } = gradeVariant(id), seal = sealedOf(id), home = atHome(id, b.where), want = wantOf(b, id);
    const groups = [
      { id, kind: 'prize', units: seal.prize, grade: 'prize' },
      { id, kind: 'sealed', units: seal.count - seal.prize, grade: fine ? 'fine' : 'plain' },
      { id, kind: 'unsealed', units: b.sealedOnly ? 0 : held - seal.count, grade: fine && home ? 'fine' : 'plain' },
    ].filter(group => group.units > 0);
    for (const group of groups) { group.unit = unitPrice(b, id, group.grade); group.want = want; }
    return groups;
  }
  const order = { unsealed: 0, sealed: 1, prize: 2 };
  /** Fit groups of units into what is left of today's appetite, best value first. */
  function fit(b, groups, limit = Infinity) {
    let left = limit, sum = 0, units = 0;
    const parts = [], budgets = new Map();
    for (const group of [...groups].sort((x, y) => y.unit - x.unit || order[x.kind] - order[y.kind])) {
      if (!budgets.has(group.want)) budgets.set(group.want, { ...appetiteLeft(b.id, group.want) });
      const budget = budgets.get(group.want), n = Math.min(group.units, left);
      const atFull = Math.min(n, budget.full), atReduced = Math.min(n - atFull, budget.reduced);
      if (atFull + atReduced <= 0) continue;
      budget.full -= atFull; budget.reduced -= atReduced; left -= atFull + atReduced; units += atFull + atReduced;
      sum += group.unit * (atFull + TRADE_RATES.secondLot * atReduced);
      parts.push({ ...group, units: atFull + atReduced });
    }
    return { units, total: wholeCopper(sum), parts };
  }
  /** "Enough until tomorrow" when every want of his the satchel could fill is full today; else "nothing I want". */
  function refusal(b, ids) {
    const held = ids.filter(id => groupsFor(b, id).length);
    if (!held.length) return b.lines.none;
    return held.every(id => { const { full, reduced } = appetiteLeft(b.id, wantOf(b, id)); return full + reduced <= 0; }) ? b.lines.full : b.lines.none;
  }
  /** What selling would fetch, without selling: { ok, reason, units, total, parts }. */
  function quote(buyerId, itemId, count) {
    const b = BUYERS[buyerId];
    if (!b) return { ok: false, reason: 'Nobody here buys anything.', units: 0, total: 0, parts: [] };
    const ids = itemId === undefined ? (inventory?.items?.() ?? []).filter(id => wants(b, id)) : [itemId];
    if (itemId !== undefined && !wants(b, itemId)) return { ok: false, reason: b.lines.none, units: 0, total: 0, parts: [] };
    if (count !== undefined && (!Number.isSafeInteger(count) || count < 1)) return { ok: false, reason: 'That is not a number of anything.', units: 0, total: 0, parts: [] };
    const result = fit(b, ids.flatMap(id => groupsFor(b, id)), count ?? Infinity);
    if (!result.units) return { ok: false, reason: refusal(b, ids), ...result };
    if (!result.total) return { ok: false, reason: '“That is not worth a copper.”', ...result };
    return { ok: true, reason: '', ...result };
  }
  /** Take units out of the satchel, seals and all. Returns an undo, or null when the satchel refused. */
  function takeOut(parts) {
    const byItem = new Map();
    for (const part of parts) {
      const plan = byItem.get(part.id) ?? { unsealed: 0, sealed: 0, prize: 0 };
      plan[part.kind] += part.units; byItem.set(part.id, plan);
    }
    const before = new Map([...byItem.keys()].map(id => [id, state.sealed.get(id) ? { ...state.sealed.get(id) } : null]));
    const removed = [];
    for (const [id, plan] of byItem) {
      const n = plan.unsealed + plan.sealed + plan.prize, seal = sealedOf(id);
      if (!inventory.remove(id, n)) { for (const [rid, rn] of removed) inventory.add(rid, rn); return null; }
      removed.push([id, n]);
      setSealed(id, seal.count - plan.sealed - plan.prize, seal.prize - plan.prize);
    }
    return () => {
      for (const [id, n] of removed) inventory.add(id, n);
      for (const [id, entry] of before) { if (entry) state.sealed.set(id, entry); else state.sealed.delete(id); }
    };
  }
  const itemsOf = parts => [...parts.reduce((map, part) => map.set(part.id, (map.get(part.id) ?? 0) + part.units), new Map())]
    .map(([id, count]) => ({ id, count }));

  /**
   * Sell to a buyer: `itemId` and up to `count` of it (all of it when `count` is left out), or every
   * good he wants when `itemId` is left out. The first lot of his day goes at the full price, the
   * second at six-tenths, then he has enough until tomorrow. Goods and copper move together or not at all.
   */
  function sell(buyerId, itemId, count) {
    const offer = quote(buyerId, itemId, count);
    if (!offer.ok) return { ok: false, reason: offer.reason };
    const b = BUYERS[buyerId], undo = takeOut(offer.parts);
    if (!undo) return { ok: false, reason: 'Your satchel is lighter than it looks.' };
    if (!earn(inventory, offer.total)) { undo(); return { ok: false, reason: 'Your purse will not hold any more.' }; }
    // The commissary has no appetite to fill, so there is nothing of his to count or save.
    if (!b.rate) {
      const taken = b.groups.map((group, want) => takenToday(buyerId, want));
      for (const part of offer.parts) taken[part.want] += part.units;
      state.appetites.set(buyerId, { day: today(), taken });
    }
    const sold = itemsOf(offer.parts);
    const result = { ok: true, reason: '', buyer: buyerId, units: offer.units, total: offer.total, items: sold, line: b.lines.paid(offer.total) };
    onEvent({ type: 'sold', ...result });
    return result;
  }
  const sellAll = buyerId => sell(buyerId);

  /** Buy from a merchant's stock: the shop counter's pattern, refunding only what was taken. */
  function buy(buyerId, itemId) {
    const b = BUYERS[buyerId], entry = b?.sells.find(s => s.id === itemId);
    if (!entry || !known(itemId)) return { ok: false, reason: '“I do not sell that.”' };
    const result = till(inventory, { price: entry.price, itemId, quantity: entry.quantity, stackable: Boolean(items[itemId]?.stackable) });
    if (!result.ok) return result;
    const out = { ok: true, reason: '', buyer: buyerId, item: itemId, quantity: entry.quantity, price: entry.price,
      line: `${entry.quantity > 1 ? `${entry.quantity} ${nameOf(itemId)}` : nameOf(itemId).replace(/^./, c => c.toUpperCase())} for ${entry.price} copper. ${describeSum(purse(inventory))} left.` };
    onEvent({ type: 'bought', ...out });
    return out;
  }

  /**
   * The measurer's seal (design 4.7 and 7.3). A lot of twenty or more pays a twentieth of itself in
   * kind; a smaller lot pays one copper. Sealed Fine produce counts as Fine away from home; unsealed,
   * it sells as Plain. `grade: 'prize'` marks a fine lot as Prize, which is the moment the Measure
   * records it and the Guild's bounty becomes owed. `by` names the measurer ('nepri', 'consus'); left
   * out, the seal is a sworn measurer's whose place the caller knows and this module does not.
   */
  function seal(itemId, count, { by, grade } = {}) {
    const sealer = by === undefined ? ANY_MEASURER : BUYERS[by];
    if (!sealer?.services.includes('seal')) return { ok: false, reason: 'Only a sworn measurer can seal a lot.' };
    if (!isPriced(itemId)) return { ok: false, reason: '“I seal farm goods and dishes. Not that.”' };
    if (count !== undefined && (!Number.isSafeInteger(count) || count < 1)) return { ok: false, reason: 'That is not a number of anything.' };
    const held = inventory?.count?.(itemId) ?? 0, before = sealedOf(itemId), unsealed = held - before.count;
    const n = Math.min(count ?? unsealed, unsealed);
    if (n <= 0) return { ok: false, reason: held ? '“That is all sealed already.”' : `You have no ${nameOf(itemId)}.` };
    const tithe = Math.floor(n / TRADE_RATES.sealTithe), copper = tithe ? 0 : TRADE_RATES.sealCopper;
    if (copper && purse(inventory) < copper) return { ok: false, reason: `“One copper for the seal, and you have ${describeSum(purse(inventory))}.”` };
    if (tithe ? !inventory.remove(itemId, tithe) : !pay(inventory, copper)) return { ok: false, reason: 'Your satchel is lighter than it looks.' };
    const sealed = n - tithe, { base, fine } = gradeVariant(itemId), prize = grade === 'prize' && fine;
    setSealed(itemId, before.count + sealed, before.prize + (prize ? sealed : 0));
    if (prize) state.prizes.add(base);
    const result = { ok: true, reason: '', item: itemId, sealed, fee: { kind: tithe, copper }, by: sealer.id, where: sealer.where,
      grade: prize ? 'prize' : fine ? 'fine' : 'plain',
      line: `${sealer.name} weighs the lot and seals ${sealed} ${nameOf(itemId)}${tithe ? `, keeping ${tithe} for the measure` : ' for a copper'}.` };
    onEvent({ type: 'sealed', ...result });
    return result;
  }

  // ---- Orders ----------------------------------------------------------------------------------
  function posted(boardId, day) {
    const board = ORDER_BOARDS[boardId];
    if (!board) return [];
    const pool = board.postings.filter(p => known(p.item) && isPriced(p.item)), rand = seeded(`${boardId}:${day}`), out = [];
    for (let i = 0; i < ORDERS_PER_DAY && pool.length; i++) {
      const p = pool.splice(Math.floor(rand() * pool.length), 1)[0];
      const n = p.min + Math.floor(rand() * (p.max - p.min + 1));
      const pay = wholeCopper(TRADE_RATES.order * n * (priceOf(p.item, { place: board.where }) ?? 0));
      out.push({ id: `${boardId}:${day}:${i}`, index: i, board: boardId, day, item: p.item, count: n, requester: p.requester, pay,
        xp: Math.round(pay * TRADE_RATES.orderXp), line: `${p.requester} wants ${n} ${nameOf(p.item)} by tomorrow’s bell: ${pay} copper.` });
    }
    return out;
  }
  const filledOn = (boardId, day) => { const entry = state.orders.get(boardId); return new Set(entry && entry.day === day ? entry.filled : []); };
  /** Units that can go to an order, cheapest-kept first: a fine order away from home takes only sealed units. */
  function orderParts(o) {
    const board = ORDER_BOARDS[o.board], held = inventory?.count?.(o.item) ?? 0, seal = sealedOf(o.item);
    const needsSeal = gradeVariant(o.item).fine && !atHome(o.item, board.where);
    const parts = [], available = [
      { kind: 'unsealed', units: needsSeal ? 0 : held - seal.count },
      { kind: 'sealed', units: seal.count - seal.prize },
      { kind: 'prize', units: seal.prize },
    ];
    let left = o.count;
    for (const a of available) { const n = Math.min(a.units, left); if (n > 0) { parts.push({ id: o.item, kind: a.kind, units: n }); left -= n; } }
    return { parts, short: left, needsSeal, have: o.count - left };
  }
  /** Today's orders on a board, each with whether it is filled and whether it could be. */
  function orders(boardId) {
    const day = today(), filled = filledOn(boardId, day);
    return posted(boardId, day).map(o => {
      const plan = orderParts(o), done = filled.has(o.index);
      return freeze({ ...o, filled: done, ready: !done && plan.short === 0,
        reason: done ? 'Filled.' : plan.short ? `It wants ${o.count}; you have ${plan.have}${plan.needsSeal ? ' sealed' : ''}.` : '' });
    });
  }
  function fill(boardId, orderId) {
    const day = today(), o = posted(boardId, day).find(entry => entry.id === orderId);
    if (!o) return { ok: false, reason: 'That order came down at the bell.' };
    if (filledOn(boardId, day).has(o.index)) return { ok: false, reason: 'Somebody has already filled that one. You did.' };
    const plan = orderParts(o);
    if (plan.short) return { ok: false, reason: `It wants ${o.count} ${nameOf(o.item)}, and you have ${plan.have}${plan.needsSeal ? ' sealed' : ''}.` };
    const undo = takeOut(plan.parts);
    if (!undo) return { ok: false, reason: 'Your satchel is lighter than it looks.' };
    if (!earn(inventory, o.pay)) { undo(); return { ok: false, reason: 'Your purse will not hold any more.' }; }
    state.orders.set(boardId, { day, filled: [...filledOn(boardId, day), o.index].sort((a, b) => a - b) });
    const board = ORDER_BOARDS[boardId];
    state.standing.set(board.buyer, Math.min(TRADE_RATES.standingMax, (state.standing.get(board.buyer) ?? 0) + 1));
    skills?.gain?.('farming', o.xp);
    const result = { ok: true, reason: '', order: o, total: o.pay, xp: o.xp,
      line: `${o.requester} will have it by the bell. ${o.pay} copper, and the board is one order lighter.` };
    onEvent({ type: 'order-filled', ...result });
    return result;
  }

  // ---- The Guild's bounty ----------------------------------------------------------------------
  /** Prize foods sealed and not yet paid for, in the order they were sealed. */
  const bountiesOwed = () => [...state.prizes].filter(id => !state.bounties.has(id))
    .map(id => ({ id, name: nameOf(id), pay: TRADE_RATES.bounty }));
  function claimBounty(foodId) {
    const { base } = gradeVariant(foodId);
    if (!base || !state.prizes.has(base)) return { ok: false, reason: '“Bring it to a measurer first. I pay for what is sealed.”' };
    if (state.bounties.has(base)) return { ok: false, reason: BUYERS.seshat.lines.none };
    if (!earn(inventory, TRADE_RATES.bounty)) return { ok: false, reason: 'Your purse will not hold any more.' };
    state.bounties.add(base);
    const result = { ok: true, reason: '', food: base, total: TRADE_RATES.bounty, line: BUYERS.seshat.lines.paid(TRADE_RATES.bounty) };
    onEvent({ type: 'bounty', ...result });
    return result;
  }

  // ---- The dialogue ----------------------------------------------------------------------------
  /**
   * The buy and sell dialogue for whoever `npc` trades as. `ctx` carries the host's `openDialogue`
   * and `closeDialogue`, `onTrade(result)` to refresh the satchel and save after anything changes
   * hands, and `back` to return to the person's own conversation (else the dialogue closes).
   */
  function tradeConversation(npc, ctx = {}, note = null) {
    const b = buyerForNpc(npc);
    if (!b || typeof ctx.openDialogue !== 'function') return false;
    const again = line => tradeConversation(npc, ctx, line);
    const after = result => { if (result.ok) ctx.onTrade?.(result); again(result.ok ? result.line : result.reason); };
    const choices = [];
    const goods = (inventory?.items?.() ?? []).filter(id => wants(b, id));
    for (const id of goods) {
      const q = quote(b.id, id), held = inventory.count(id), name = nameOf(id);
      choices.push({ id: `sell-${b.id}-${id}`, enabled: q.ok, reason: q.reason, action: () => after(sell(b.id, id)),
        label: q.ok ? `Sell ${q.units < held ? `${q.units} of your ${held}` : q.units} ${name} for ${q.total} copper` : `Sell ${name}` });
    }
    if (goods.length > 1) {
      const q = quote(b.id);
      choices.push({ id: `sell-all-${b.id}`, enabled: q.ok, reason: q.reason, action: () => after(sellAll(b.id)),
        label: q.ok ? `Sell all: ${q.units} for ${q.total} copper` : 'Sell all' });
    }
    const wares = b.sells.filter(entry => known(entry.id));
    if (wares.length) for (const offer of peddlerOffers({ purse: purse(inventory), count: id => inventory.count(id), items, stock: wares })) {
      const quantity = wares.find(entry => entry.id === offer.id).quantity;
      choices.push({ id: `buy-${b.id}-${offer.id}`, enabled: offer.enabled, reason: offer.reason, action: () => after(buy(b.id, offer.id)),
        label: `Buy ${quantity > 1 ? `${quantity} ${offer.name.toLowerCase()}` : offer.name.toLowerCase()} · ${offer.price} copper` });
    }
    if (b.services.includes('seal')) for (const id of (inventory?.items?.() ?? []).filter(isPriced)) {
      const n = inventory.count(id) - sealedOf(id).count;
      if (n <= 0) continue;
      const tithe = Math.floor(n / TRADE_RATES.sealTithe), poor = !tithe && purse(inventory) < TRADE_RATES.sealCopper;
      choices.push({ id: `seal-${b.id}-${id}`, enabled: !poor, reason: poor ? '“One copper for the seal.”' : '', action: () => after(seal(id, n, { by: b.id })),
        label: `Have ${n} ${nameOf(id)} sealed (${tithe ? `${tithe} kept for the measure` : `${TRADE_RATES.sealCopper} copper`})` });
    }
    if (b.board) choices.push({ id: `orders-${b.id}`, label: 'What orders are posted?', action: () => ordersConversation(npc, ctx) });
    if (b.services.includes('bounty')) for (const owed of bountiesOwed())
      choices.push({ id: `bounty-${owed.id}`, label: `The first Prize ${owed.name}: ${owed.pay} copper`, action: () => after(claimBounty(owed.id)) });
    choices.push({ id: `leave-trade-${b.id}`, label: ctx.leave ?? 'That is all.', action: () => (ctx.back ? ctx.back() : ctx.closeDialogue?.()) });
    const opening = note ? `${note} You carry ${describeSum(purse(inventory))}.`
      : choices.length > 1 || !b.lines.none ? b.lines.open : `${b.lines.open} ${b.lines.none}`;
    ctx.openDialogue(npc, [opening], null, ctx.leave ?? 'That is all.', { choices, noWayfinding: true });
    return true;
  }
  function ordersConversation(npc, ctx) {
    const b = buyerForNpc(npc), board = ORDER_BOARDS[b?.board];
    if (!board) return false;
    const list = orders(board.id), back = line => tradeConversation(npc, ctx, line);
    const choices = list.map(o => ({ id: `fill-${o.id}`, enabled: o.ready, reason: o.reason,
      label: o.filled ? `${o.line} (filled)` : o.line,
      action: () => { const result = fill(board.id, o.id); if (result.ok) ctx.onTrade?.(result); back(result.ok ? result.line : result.reason); } }));
    choices.push({ id: `orders-back-${b.id}`, label: 'Back to the counter.', action: () => back(null) });
    const opening = list.length ? `${board.name}. Three orders a day, pinned up at midnight and taken down at the next. They pay half again the market, and the work counts.`
      : `${board.name} is bare today.`;
    ctx.openDialogue(npc, [opening], null, 'Back to the counter.', { choices, noWayfinding: true });
    return true;
  }

  // ---- Saving ----------------------------------------------------------------------------------
  function snapshot() {
    const day = today(), sealed = {};
    for (const id of [...state.sealed.keys()].sort()) { const s = sealedOf(id); if (s.count) sealed[id] = { count: s.count, prize: s.prize }; }
    return {
      version: MERCHANTS_VERSION,
      appetites: Object.fromEntries([...state.appetites].map(([id, e]) => [id, e, e.taken.reduce((sum, n) => sum + n, 0)]).filter(([, e, total]) => e.day === day && total > 0)
        .map(([id, e, total]) => [id, { day: e.day, taken: total, ...(e.taken.length > 1 ? { each: [...e.taken] } : {}) }])),
      standing: Object.fromEntries([...state.standing].filter(([, n]) => n > 0)),
      sealed,
      prizes: [...state.prizes],
      bounties: [...state.bounties],
      orders: Object.fromEntries([...state.orders].filter(([, e]) => e.day === day && e.filled.length).map(([id, e]) => [id, { day: e.day, filled: [...e.filled] }])),
    };
  }
  /** Restore a saved section, or start afresh when there is none. Invalid data changes nothing. */
  function restore(data) {
    if (!validateMerchantsSnapshot(data)) return false;
    const next = fresh();
    if (data) {
      // A save from before a buyer's wants were counted apart charges the whole day to his first.
      for (const [id, e] of Object.entries(data.appetites ?? {})) next.appetites.set(id, { day: e.day, taken: e.each ? [...e.each] : [e.taken] });
      for (const [id, n] of Object.entries(data.standing ?? {})) if (n) next.standing.set(id, n);
      for (const [id, e] of Object.entries(data.sealed ?? {})) next.sealed.set(id, { count: e.count, prize: e.prize });
      for (const id of data.prizes ?? []) next.prizes.add(id);
      for (const id of data.bounties ?? []) next.bounties.add(id);
      for (const [id, e] of Object.entries(data.orders ?? {})) next.orders.set(id, { day: e.day, filled: [...e.filled] });
    }
    state = next;
    return true;
  }

  return {
    sell, sellAll, quote, buy, seal, sealed: id => sealedOf(id), orders, fill, bountiesOwed, claimBounty,
    // What a buyer will still take today: of the want that takes `itemId`, or of his first.
    appetite: (id, itemId) => { const want = itemId === undefined ? 0 : wantOf(BUYERS[id], itemId); return { ...appetiteLeft(id, want), of: appetiteOf(id, want) }; },
    wants: (buyerId, itemId) => wants(BUYERS[buyerId], itemId),
    tradeConversation, ordersConversation, snapshot, restore, today,
  };
}

/** The people's "Trade" choice: open the trade for whoever `npc` trades as, through `ctx.merchants`. */
export function openTrade(npc, ctx = {}) {
  return ctx.merchants?.tradeConversation?.(npc, ctx) ?? false;
}
