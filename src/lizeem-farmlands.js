/**
 * **The Farmlands of the Lizeem**: Taleth's charge, the Caricas arc and the Measure of the River
 * (docs/lizeem-farmlands-design.md; the user, 5 October 2026: "go ahead and implement").
 *
 * Taleth, Master Sorcerer of the Guild at Minora, sends Rollo down both banks of the Lizeem to
 * bring four farm countries back to work and to walk the Measure nobody has walked since the
 * League broke with Ambron. Build 1 builds the frame and the first country:
 *
 * - **The hub.** `unmet` -> `offered` -> `accepted`. Taleth's own conversation (src/taleth.js)
 *   calls `offer()` and `accept()`; nothing here draws him.
 * - **Caricas: the rested ground** (design 5.1). Egeria lends the North Farm for the holder's
 *   quarter; rye and beans go in; rye sown where the beans grew comes up Plain, because the beans
 *   leave the ground too rich for it (the Fine rotation is beans, a day's rest, fruit or barley,
 *   then rye; integration, 6 October 2026); the garrison's
 *   quartermaster claims a tenth; Fine rye; the tart, sealed at the grain court and carried to
 *   Taleth. The reward is *Call the Dew*, the offer of a second farmstead and the first hired hand.
 * - **The Measure** (design 4.7): four leaves of four lines, filled by Fine or Prize food laid
 *   before Seshat in Minora. Only the Caricas leaf can be walked in this build.
 * - **Shares in kind** (design 7.3): the holder's quarter on every Caricas bed while the lease
 *   stands, and the garrison's tenth while its claim stands, unless Rollo hides it.
 *
 * Defaults in force, 5 October 2026: the war is touched lightly (the quartermaster's claim is the
 * Caricas trouble, and the choice changes who is friendly and nothing in the main story), the
 * names are the design's mythological ones, and nobody wears a hat.
 *
 * The groundwork for Builds 2 to 5 (the user, 6 October 2026: "keep building everything"):
 *
 * - **The other countries' arcs** come in through `registerArc(countryId, arc)`. The hub lists each on
 *   its leaf of the Measure, gives it a card of its own on the tracker, writes it in the journal when
 *   it is done, and nests its save under `arcs`. Caricas stays built in.
 * - **The Measure** is the Guild's, so the hub keeps every leaf's lines; a Prize harvest is written in
 *   it the moment it is reaped, and a leaf opens for writing when its country's arc is registered.
 * - **Messor's wage**: six copper a game day, paid at the hire and each morning after; a day not paid
 *   and he stops. While he is paid he reaps the North fields when they are ripe (`tick`).
 * - **The free-roam objective** reads differently once the charge is taken (`freeRoamGuidance`).
 *
 * Pure: no DOM, no three, no world. The host walks, draws and pays coin; this keeps the record.
 */
import { REGIONAL_FARM_ROWS, REGIONAL_SEED_STATIONS } from './regional-farmland.js';
import { farmRow } from './farming.js';
import { gameDay } from './merchants.js';

const freeze = Object.freeze;

export const LIZEEM_FARMLANDS_VERSION = 1;
export const LIZEEM_FARMLANDS = freeze({ id: 'lizeem-farmlands', title: 'The Farmlands of the Lizeem', type: 'skill' });
/** Taleth's id as his own module declares it (src/taleth.js); the tart is carried to him. */
export const TALETH_ID = 'taleth';

/**
 * The people of this build who hold a step (src/lizeem-people.js stands them up). Declared here so
 * the quest can name its destinations without importing the figures.
 */
export const LIZEEM_ROLES = freeze({
  seshat: 'lizeem-seshat', egeria: 'lizeem-egeria', vertumnus: 'lizeem-vertumnus', consus: 'lizeem-consus',
  hagen: 'lizeem-hagen', pomona: 'lizeem-pomona', messor: 'lizeem-messor',
});

export const HUB_STAGES = freeze(['unmet', 'offered', 'accepted']);
/**
 * The Caricas arc, in order.
 *
 *   `waiting`  Taleth's charge not yet taken
 *   `bridge`   cross the White Bridge and find Egeria, the Voice of the Council
 *   `sowing`   bridge rye and field beans on the North fields, two beds of each brought in
 *   `swap`     rye where the beans grew
 *   `claim`    the garrison's quartermaster claims a tenth (the trouble)
 *   `fine`     Fine rye
 *   `tart`     the soft-fruit tart, baked and sealed at the grain court
 *   `carry`    the sealed tart, carried to Taleth
 *   `done`     Caricas restored
 */
export const CARICAS_STAGES = freeze(['waiting', 'bridge', 'sowing', 'swap', 'claim', 'fine', 'tart', 'carry', 'done']);
const rank = stage => CARICAS_STAGES.indexOf(stage);

/** The lent farm and its beds (src/regional-farmland.js). Bed ids are permanent once shipped. */
export const NORTH_FARM = 'caricas-north-fields';
export const NORTH_BEDS = freeze(REGIONAL_FARM_ROWS.filter(row => row.farmId === NORTH_FARM).map(row => row.id));
export const CARICAS_BEDS = freeze(REGIONAL_FARM_ROWS.filter(row => row.region === 'Caricas').map(row => row.id));
export const NORTH_SEED_BENCH = REGIONAL_SEED_STATIONS.find(station => station.farmId === NORTH_FARM);
/**
 * Two beds of each, as the design asks (5.1). The North Farm has three beds, so the second bed of
 * one crop comes in on the second round, which is the rotation the step is about.
 */
export const SOWING = freeze({ rye: 2, beans: 2 });

/**
 * Crops by the farming module's ids (src/farming.js, extended for this build). An item id with
 * a `fine-`/`prize-` prefix or `-fine`/`-prize` suffix is the same food at a better grade.
 */
export const LIZEEM_CROPS = freeze({
  'bridge-rye': freeze({ key: 'rye', name: 'bridge rye' }),
  'field-beans': freeze({ key: 'beans', name: 'field beans' }),
  'soft-fruit': freeze({ key: 'fruit', name: 'soft fruit' }),
});
const CROP_KEYS = freeze(['rye', 'beans', 'fruit', 'other']);
export const GRADES = freeze(['plain', 'good', 'fine', 'prize']);
const MEASURE_GRADES = freeze(['fine', 'prize']);

/** The recipes this arc teaches (the cooking module's ids). */
/** `rye-cheese-loaf` is the Caricas loaf (src/cooking.js); `rye-loaf` is Wendel's mill loaf, which is another thing. */
export const LIZEEM_RECIPES = freeze({ ryeLoaf: 'rye-cheese-loaf', pottage: 'bean-pottage', tart: 'soft-fruit-tart' });
export const TART_ITEM = LIZEEM_RECIPES.tart;
/** The tart as the satchel keeps it: the fine kind first (src/prices.js `gradeVariant`), then the ordinary. */
export const TART_ITEMS = freeze([`${TART_ITEM}-fine`, TART_ITEM]);
/** Which tart the traveler is carrying, or null; with no satchel to ask, the ordinary one. */
export const carriedTart = inventory => (inventory?.count ? TART_ITEMS.find(id => inventory.count(id) > 0) ?? null : TART_ITEM);
const RECIPE_IDS = freeze(Object.values(LIZEEM_RECIPES));

/** The field working Taleth teaches for Caricas (design 3). */
export const CALL_THE_DEW = 'call-the-dew';

/**
 * Experience lumps per step and at the arc's end (design 4.6: about 150, 200, 300, 400 and 1,000).
 * Each is paid as its stage is left, so it is paid once and a reload never pays it again.
 */
export const LIZEEM_XP = freeze({ sowing: 150, swap: 200, claim: 300, fine: 400, done: 1000 });
/** Which lump each stage pays as it is left: the arc's end is the tart in Taleth's hands. */
const PAID_LEAVING = freeze({ sowing: LIZEEM_XP.sowing, swap: LIZEEM_XP.swap, claim: LIZEEM_XP.claim, fine: LIZEEM_XP.fine, carry: LIZEEM_XP.done });

/** The holder's quarter and the garrison's tenth (design 7.3). */
export const SHARES = freeze({ holder: 1 / 4, garrison: 1 / 10 });

/** The hired hands of Caricas, one per farm brought back; Messor comes first (design 6.3). */
export const HIRED_HANDS = freeze(['messor']);
/** A hired hand's wage, a game day (design 7.8; Messor: "six copper a day and my dinner"). */
export const HAND_WAGE = 6;

/**
 * **The Measure of the River** (design 4.7). Four leaves, one per country; each has its three
 * crops and its dish. Caricas is walked from the charge; another leaf opens when its country's arc
 * is registered (`registerArc`), and until then it is listed so the page shows how much river is
 * left. `items` are the satchel's ids that fill a line (the contract for Builds 2 and 3, 6 October
 * 2026): either of a country's two dishes fills its dish line, and the Nesdor rye is bridge rye.
 */
const line = (id, name, items = [id]) => freeze({ id, name, items: freeze(items) });
export const MEASURE_LEAVES = freeze([
  freeze({ id: 'caricas', name: 'Caricas', walked: true, lines: freeze([
    line('bridge-rye', 'Bridge rye'), line('field-beans', 'Field beans'), line('soft-fruit', 'Soft fruit'), line('tart', 'Soft-fruit tart', ['soft-fruit-tart'])]) }),
  freeze({ id: 'nethereum', name: 'Nethereum', walked: false, lines: freeze([
    line('flood-oats', 'Flood oats'), line('meadow-hay', 'Meadow hay'), line('weir-fish', 'Weir fish'), line('dish', 'Oatcakes and smoked fish', ['oatcakes', 'smoked-fish'])]) }),
  freeze({ id: 'nesdor', name: 'Nesdor', walked: false, lines: freeze([
    line('floodwheat', 'Floodwheat'), line('rye', 'Rye from the dry rises', ['bridge-rye']), line('hazelnuts', 'Hazelnuts'), line('dish', 'White bread and nut cake', ['white-bread', 'nut-cake'])]) }),
  freeze({ id: 'ovesos', name: 'Ovesos', walked: false, lines: freeze([
    line('hard-wheat', 'Hard wheat'), line('barley', 'Barley'), line('silver-millet', 'Silver millet', ['silver-millet', 'millet']), line('dish', 'Flatbread', ['flatbread'])]) }),
]);
const CARICAS_LINES = freeze(MEASURE_LEAVES[0].lines.map(entry => entry.id));
const LEAF_IDS = freeze(MEASURE_LEAVES.map(leaf => leaf.id));
const leafOf = id => MEASURE_LEAVES.find(leaf => leaf.id === id) ?? null;
/** An item id without its grade or seal: 'fine-bridge-rye' and 'bridge-rye-prize' are bridge rye. */
const baseItem = itemId => itemId.replace(/^(fine|prize|sealed)-/, '').replace(/-(fine|prize|sealed)$/, '');
/** Every line of every leaf an item could fill, Caricas first: `[{ leaf, line }]`. */
export function measureEntriesFor(itemId) {
  if (typeof itemId !== 'string') return [];
  const base = baseItem(itemId);
  return MEASURE_LEAVES.flatMap(leaf => leaf.lines.filter(entry => entry.items.includes(base) || (leaf.id === 'caricas' && measureLineFor(itemId) === entry.id))
    .map(entry => ({ leaf: leaf.id, line: entry.id })));
}

/**
 * **The other countries' arcs** (the contract for Builds 2 and 3, 6 October 2026). The ids an arc may
 * be registered under, and what each registered arc's own validator says of its save: the save's
 * validator (`validateLizeemFarmlands`, used by src/road-checkpoint.js) asks them, so a leaf of the
 * Measure or a nested arc save is accepted only once the game has registered that country.
 */
export const ARC_IDS = freeze(['nethereum', 'nesdor', 'ovesos', 'dividing']);
const ARC_VALIDATORS = new Map();
const REGISTERED = new Set();

/** The food an item id stands for, whatever its grade, or null. */
export function measureLineFor(itemId) {
  if (typeof itemId !== 'string') return null;
  const base = baseItem(itemId);
  if (base === TART_ITEM || base === 'tart') return 'tart';
  return CARICAS_LINES.includes(base) ? base : null;
}
const gradeOf = value => (typeof value === 'string' && GRADES.includes(value.toLowerCase()) ? value.toLowerCase() : null);
const cropOf = result => LIZEEM_CROPS[measureLineFor(result?.crop) ?? measureLineFor(result?.item)] ?? null;
const titled = grade => grade ? grade[0].toUpperCase() + grade.slice(1) : '';

const fresh = () => ({
  version: LIZEEM_FARMLANDS_VERSION, stage: 'unmet',
  caricas: { stage: 'waiting', leased: false, rye: [], beans: [], last: {}, ryeOnBeans: null, fineRye: false,
    swapGrade: null, claim: null, taught: [], secondFarm: false, hands: [], hired: [], paid: {} },
  shares: { holder: 0, garrison: 0, holderTaken: 0, garrisonTaken: 0 },
  measure: { caricas: {} },
});
const copy = value => JSON.parse(JSON.stringify(value));

const isObject = value => !!value && typeof value === 'object' && !Array.isArray(value);
const idList = (value, allowed, max) => Array.isArray(value) && value.length <= max && new Set(value).size === value.length
  && value.every(id => allowed.includes(id));
const carry = value => Number.isFinite(value) && value >= 0 && value < 1;
const count = value => Number.isSafeInteger(value) && value >= 0 && value <= 1e7;

/**
 * Whether a saved section is one this module wrote. `undefined` is an old save from before the
 * farmlands, and loads as a fresh charge.
 */
export function validateLizeemFarmlands(value) {
  if (value === undefined) return true;
  if (!isObject(value) || value.version !== LIZEEM_FARMLANDS_VERSION || !HUB_STAGES.includes(value.stage)) return false;
  // The other countries' arcs (6 October 2026): a missing section is an arc not yet begun.
  if (value.arcs !== undefined) {
    if (!isObject(value.arcs)) return false;
    for (const [id, nested] of Object.entries(value.arcs)) {
      if (!ARC_IDS.includes(id) || !REGISTERED.has(id)) return false;
      const check = ARC_VALIDATORS.get(id);
      try { if (check && check(nested) !== true) return false; } catch { return false; }
    }
  }
  const c = value.caricas, s = value.shares, m = value.measure;
  if (!isObject(c) || !CARICAS_STAGES.includes(c.stage)) return false;
  if (typeof c.leased !== 'boolean' || typeof c.fineRye !== 'boolean' || typeof c.secondFarm !== 'boolean') return false;
  if (!idList(c.rye, NORTH_BEDS, NORTH_BEDS.length) || !idList(c.beans, NORTH_BEDS, NORTH_BEDS.length)) return false;
  if (!isObject(c.last) || !Object.entries(c.last).every(([bed, crop]) => NORTH_BEDS.includes(bed) && CROP_KEYS.includes(crop))) return false;
  if (c.ryeOnBeans !== null && !GRADES.includes(c.ryeOnBeans)) return false;
  if (c.swapGrade !== null && !GRADES.includes(c.swapGrade)) return false;
  if (![null, 'handed', 'hidden'].includes(c.claim)) return false;
  if (!idList(c.taught, RECIPE_IDS, RECIPE_IDS.length)) return false;
  if (!idList(c.hands, HIRED_HANDS, HIRED_HANDS.length) || !idList(c.hired, c.hands, HIRED_HANDS.length)) return false;
  // The last game day each hand's wage was paid; a save from before the wage has none.
  if (c.paid !== undefined && (!isObject(c.paid) || !Object.entries(c.paid).every(([hand, day]) => c.hired.includes(hand) && count(day)))) return false;
  if (!isObject(s) || !carry(s.holder) || !carry(s.garrison) || !count(s.holderTaken) || !count(s.garrisonTaken)) return false;
  // Caricas's leaf always; another leaf only once its country's arc is registered.
  if (!isObject(m) || !isObject(m.caricas) || !Object.keys(m).every(id => id === 'caricas' || (LEAF_IDS.includes(id) && REGISTERED.has(id)))) return false;
  if (!Object.entries(m).every(([leaf, written]) => isObject(written) && Object.entries(written)
    .every(([id, grade]) => leafOf(leaf).lines.some(entry => entry.id === id) && MEASURE_GRADES.includes(grade)))) return false;
  // The arc cannot have begun before the charge was taken, and nothing is measured before then.
  const at = rank(c.stage), taken = value.stage === 'accepted';
  if (taken !== (at > 0)) return false;
  if (!taken && Object.values(m).some(written => Object.keys(written).length)) return false;
  // The lease is what the sowing step begins with, and the holder's quarter follows it.
  if (c.leased !== (at >= rank('sowing'))) return false;
  if (!c.leased && (s.holderTaken || s.holder || Object.keys(c.last).length)) return false;
  // Two beds of each before the swap; the swap before the claim; the claim answered before the rye.
  if (at > rank('sowing') && (c.rye.length < SOWING.rye || c.beans.length < SOWING.beans)) return false;
  if ((at > rank('swap')) !== (c.swapGrade !== null)) return false;
  if ((at > rank('claim')) !== (c.claim !== null)) return false;
  if (c.fineRye && at < rank('claim')) return false;
  if (at < rank('claim') && (s.garrisonTaken || s.garrison)) return false;
  // What Caricas pays happens at its end, and only there.
  const done = c.stage === 'done';
  if (c.secondFarm !== done || (!done && (c.hands.length || c.hired.length))) return false;
  if (done && c.hands.length !== HIRED_HANDS.length) return false;
  return true;
}

/**
 * The quest. `skills`, `magic` and `farming` are the game's own subsystems, and any of them may be
 * missing in a test. With `farming.onHarvest` present the quest registers its share-taker on
 * creation. Sealing is the market's (src/merchants.js), asked for in the people's conversations.
 */
export function createLizeemFarmlands({ skills = null, magic = null, farming = null, onEvent = () => {}, pay: payWage = null, clock = null } = {}) {
  let state = fresh();
  const c = () => state.caricas;
  const accepted = () => state.stage === 'accepted';
  /** Registered arcs by country, and the saves of arcs this game has not registered, kept as they came. */
  const arcs = new Map();
  let carried = {};
  const today = at => gameDay(Number.isFinite(at) ? at : Number(typeof clock === 'function' ? clock() : 0) || 0);

  const pay = amount => {
    if (!(amount > 0)) return null;
    if (skills?.known && !skills.known('farming')) skills.learn?.('farming', { announce: false });
    return skills?.gain?.('farming', amount) ?? null;
  };
  /** One stage on, with its lump paid as the old stage is left. Never backwards. */
  function advance(to) {
    const from = c().stage;
    if (rank(to) !== rank(from) + 1) return false;
    c().stage = to;
    const xp = PAID_LEAVING[from] ?? 0;
    const gained = pay(xp);
    onEvent({ type: 'lizeem-step', arc: 'caricas', from, to, xp, levelled: !!gained?.levelled });
    return true;
  }
  /** A step done early is collected as soon as its stage arrives. */
  function settleAhead() {
    if (c().stage === 'swap' && c().ryeOnBeans) { c().swapGrade = c().ryeOnBeans; advance('claim'); }
    if (c().stage === 'fine' && c().fineRye) advance('tart');
  }

  function offer() {
    if (state.stage !== 'unmet') return false;
    state.stage = 'offered';
    onEvent({ type: 'lizeem-offered' });
    return true;
  }
  function accept() {
    if (!['unmet', 'offered'].includes(state.stage)) return false;
    state.stage = 'accepted'; c().stage = 'bridge';
    onEvent({ type: 'lizeem-accepted' });
    return true;
  }

  /** Egeria lends the North Farm for a season, for the holder's quarter. */
  function lease() {
    if (c().stage !== 'bridge') return false;
    c().leased = true;
    onEvent({ type: 'lizeem-leased', farm: NORTH_FARM });
    return advance('sowing');
  }

  /**
   * A bed is reaped (the farming module's `onHarvest`). Advances the arc and takes the shares in
   * kind; answers `{ taken, note }` when something was owed, or null.
   */
  function harvest(bedId, result = {}) {
    // A Prize harvest is written in the Measure the moment it is reaped (6 October 2026), on its own country's leaf.
    if (accepted() && gradeOf(result.grade ?? result.quality) === 'prize') {
      const country = farmRow(bedId)?.country ?? (CARICAS_BEDS.includes(bedId) ? 'caricas' : null);
      if (country) enter(result.crop ?? result.item, 'prize', { country });
    }
    if (!accepted() || !c().leased || !CARICAS_BEDS.includes(bedId)) return null;
    const crop = cropOf(result), key = crop?.key ?? 'other', grade = gradeOf(result.grade ?? result.quality) ?? 'plain';
    const north = NORTH_BEDS.includes(bedId), before = north ? c().last[bedId] : undefined;
    if (north && key === 'rye' && before === 'beans' && rank(c().stage) >= rank('sowing') && rank(c().stage) <= rank('swap') && !c().ryeOnBeans)
      c().ryeOnBeans = grade;
    if (key === 'rye' && MEASURE_GRADES.includes(grade) && rank(c().stage) >= rank('claim') && rank(c().stage) <= rank('fine')) c().fineRye = true;
    if (north) {
      c().last[bedId] = key;
      if (c().stage === 'sowing' && (key === 'rye' || key === 'beans') && !c()[key].includes(bedId)) c()[key].push(bedId);
      if (c().stage === 'sowing' && c().rye.length >= SOWING.rye && c().beans.length >= SOWING.beans) advance('swap');
    }
    settleAhead();
    return takeShares(result, crop, grade);
  }

  /**
   * The farming module passes `{ crop, produce, count, grade, grown }`: `grown` is the whole harvest,
   * which the shares are reckoned on, and `count` what is left of it after any share before this one.
   */
  function takeShares(result, crop, grade) {
    const whole = value => (Number.isSafeInteger(value) && value > 0 ? value : 0);
    const quantity = whole(result.grown ?? result.quantity ?? result.count), left = whole(result.count ?? quantity);
    if (!quantity || !left) return null;
    const s = state.shares;
    s.holder += quantity * SHARES.holder;
    const holder = Math.floor(s.holder + 1e-9); s.holder = Math.max(0, s.holder - holder);
    let garrison = 0;
    if (['claim', 'fine'].includes(c().stage) && c().claim !== 'hidden') {
      s.garrison += quantity * SHARES.garrison;
      garrison = Math.floor(s.garrison + 1e-9); s.garrison = Math.max(0, s.garrison - garrison);
    }
    const taken = Math.min(left, holder + garrison);
    if (!taken) return null;
    s.holderTaken += Math.min(holder, taken); s.garrisonTaken += taken - Math.min(holder, taken);
    const name = crop?.name ?? 'of the harvest';
    const note = `${quantity} ${name}${grade !== 'plain' ? `, ${titled(grade)}` : ''}. `
      + (holder ? `The holder’s share: ${holder}. ` : '') + (garrison ? `The garrison’s tenth: ${garrison}. ` : '')
      + `Yours: ${left - taken}.`;
    onEvent({ type: 'lizeem-share', taken, holder, garrison, note });
    return { taken, note };
  }

  /** The quartermaster's claim, answered: `hand` it over, or `hide` it for the upland. */
  function settleClaim(choice) {
    if (c().stage !== 'claim' || !['hand', 'hide'].includes(choice)) return false;
    c().claim = choice === 'hand' ? 'handed' : 'hidden';
    onEvent({ type: 'lizeem-claim', claim: c().claim });
    advance('fine');
    settleAhead();
    return true;
  }

  /** A recipe taught by somebody in this arc, recorded for the journal's pointers. */
  function noteTaught(recipeId) {
    if (!RECIPE_IDS.includes(recipeId) || c().taught.includes(recipeId)) return false;
    c().taught.push(recipeId);
    return true;
  }

  /** Consus seals the tart at the grain court. */
  function sealTart() {
    if (c().stage !== 'tart') return false;
    return advance('carry');
  }

  /**
   * The sealed tart, carried to Taleth: the end of Caricas. *Call the Dew*, the offer of a second
   * farmstead and the first hired hand are granted here, in the stage change, and nowhere else.
   * A Fine or Prize tart is also laid up in the Measure.
   */
  function deliver({ grade = null } = {}) {
    if (c().stage !== 'carry') return false;
    advance('done');
    c().secondFarm = true; c().hands = [...HIRED_HANDS];
    const learned = magic?.learn?.(CALL_THE_DEW) ?? null;
    const measured = MEASURE_GRADES.includes(gradeOf(grade)) ? enter(TART_ITEM, grade) : null;
    onEvent({ type: 'lizeem-caricas-restored', spell: CALL_THE_DEW, learned, secondFarm: true, hands: [...c().hands] });
    return { ok: true, spell: CALL_THE_DEW, learned, measured };
  }

  /**
   * A returned hand taken on for a wage (design 7.8): six copper, paid now for today through `pay`
   * when the host gives one, and every game day after through `tick`. Without the copper, no hire.
   */
  function hire(handId) {
    if (!c().hands.includes(handId) || c().hired.includes(handId)) return false;
    if (typeof payWage === 'function' && !payWage(HAND_WAGE)) return false;
    c().hired.push(handId);
    if (typeof clock === 'function') c().paid[handId] = today();
    onEvent({ type: 'lizeem-hired', hand: handId, wage: HAND_WAGE });
    return true;
  }

  /**
   * The hands at work, once a whole second of play (the host calls this from its loop). Each morning
   * a hand's wage is paid, a day at a time; a day that cannot be paid and he stops, and must be hired
   * again. Messor, while paid, reaps whatever on the North fields is ripe: the crop is Rollo's, the
   * shares are taken as ever, and the experience is nobody's, since Rollo did not do the work.
   */
  let lastTick = null;
  function tick(playSeconds) {
    const at = Number(playSeconds);
    if (!Number.isFinite(at) || Math.floor(at) === lastTick) return null;
    lastTick = Math.floor(at);
    if (!accepted() || !c().hired.length) return null;
    const day = today(at), stopped = [], reaped = [];
    for (const hand of [...c().hired]) {
      let paidTo = c().paid[hand] ?? day - 1;
      while (paidTo < day && (typeof payWage !== 'function' || payWage(HAND_WAGE))) paidTo++;
      if (paidTo < day) {
        c().hired = c().hired.filter(id => id !== hand); delete c().paid[hand]; stopped.push(hand);
        onEvent({ type: 'lizeem-hand-unpaid', hand, wage: HAND_WAGE });
      } else if (c().paid[hand] !== paidTo) c().paid[hand] = paidTo;
    }
    if (c().hired.includes('messor') && farming?.rowState && farming?.harvest)
      for (const bed of NORTH_BEDS) if (farming.rowState(bed, at)?.stage === 'ripe') {
        const result = farming.harvest(bed, at, { hand: 'messor' });
        if (result?.ok) reaped.push(bed);
      }
    return { stopped, reaped };
  }

  /**
   * Fine or Prize food laid before Seshat in Minora. Prize replaces Fine; nothing replaces Prize.
   * Answers what changed, including `firstPrize`, which is when Seshat pays her small bounty.
   */
  function enter(itemId, grade, { country = null } = {}) {
    const level = gradeOf(grade);
    if (!accepted()) return { ok: false, reason: 'The Measure is the Guild’s, and you have not taken Taleth’s charge.' };
    // Every line the food could fill on a leaf that is walked: Caricas's first, then the registered countries'.
    const places = measureEntriesFor(itemId).filter(entry => (!country || entry.leaf === country));
    const open = places.filter(entry => walkedLeaf(entry.leaf));
    if (!places.length) return { ok: false, reason: 'That is not one of the river’s foods in the Measure.' };
    if (!open.length) return { ok: false, reason: 'That country’s leaf of the Measure is not yet walked.' };
    if (!MEASURE_GRADES.includes(level)) return { ok: false, reason: 'The Measure takes Fine or better.' };
    const target = open.find(entry => { const was = state.measure[entry.leaf]?.[entry.line] ?? null; return was !== 'prize' && was !== level; });
    if (!target) return { ok: false, reason: 'That line is already written at that grade.' };
    const leaf = (state.measure[target.leaf] ??= {}), was = leaf[target.line] ?? null;
    leaf[target.line] = level;
    const full = leafOf(target.leaf).lines.every(entry => leaf[entry.id]);
    const result = { ok: true, country: target.leaf, line: target.line, grade: level, upgraded: was === 'fine', firstPrize: level === 'prize', full };
    onEvent({ type: 'lizeem-measure', ...result });
    try { arcs.get(target.leaf)?.measured?.(result); } catch { /* an arc's listener never unwrites the Measure */ }
    return result;
  }
  const walkedLeaf = id => id === 'caricas' || arcs.has(id);
  const betterGrade = (a, b) => (a === 'prize' || b === 'prize' ? 'prize' : a ?? b ?? null);

  /**
   * The Measure as a page: each leaf's lines, with a registered arc's own `measureLines()` (its names,
   * and any grade it keeps itself) read over the leaf's, and the better of the two grades shown.
   */
  function measureView() {
    const leaves = MEASURE_LEAVES.map(leaf => {
      const arc = arcs.get(leaf.id), walked = walkedLeaf(leaf.id), written = walked ? state.measure[leaf.id] ?? {} : {};
      let own = null;
      try { own = arc?.measureLines?.() ?? null; } catch { own = null; }
      const named = new Map((Array.isArray(own) ? own : []).filter(entry => typeof entry?.id === 'string').map(entry => [entry.id, entry]));
      const lines = leaf.lines.map(entry => {
        const theirs = named.get(entry.id), grade = betterGrade(written[entry.id] ?? null, walked ? gradeOf(theirs?.grade) : null);
        return { id: entry.id, name: typeof theirs?.name === 'string' ? theirs.name : entry.name, grade: MEASURE_GRADES.includes(grade) ? grade : null,
          filled: MEASURE_GRADES.includes(grade), prize: grade === 'prize' };
      });
      return { id: leaf.id, name: leaf.name, walked: walked && accepted(), lines, full: lines.every(entry => entry.filled),
        ...(walked ? {} : { note: 'Not yet walked.' }) };
    });
    return { id: 'measure', title: 'The Measure of the River', leaves, full: leaves.every(leaf => leaf.full) };
  }
  /** The Measure as journal text, for a page that only prints notes. */
  function measureText() {
    return [`${measureView().title}.`, ...measureView().leaves.map(leaf => !leaf.walked ? `${leaf.name}: not yet walked.`
      : `${leaf.name}: ${leaf.lines.map(entry => `${entry.name.toLowerCase()} ${entry.prize ? '(Prize, in gold)' : entry.filled ? '(Fine)' : '(not yet)'}`).join(', ')}.`)].join('\n');
  }

  const STEPS = [
    ['bridge', 'Cross the White Bridge and ask the Voice of the Council for land.'],
    ['sowing', 'Bring in two beds of bridge rye and two of field beans from the North fields.'],
    ['swap', 'Sow rye where the beans grew.'],
    ['claim', 'Answer the garrison’s claim on the harvest.'],
    ['fine', 'Bring in Fine rye.'],
    ['tart', 'Bake a soft-fruit tart and have it sealed at the grain court.'],
    ['carry', 'Carry the sealed tart to Taleth.'],
  ];
  const bench = () => NORTH_SEED_BENCH ? { x: NORTH_SEED_BENCH.x, z: NORTH_SEED_BENCH.z, id: NORTH_SEED_BENCH.id, name: 'The North fields, Caricas' } : null;

  /** What the tracker and the journal show. Active from the charge onward; Build 1 never ends it. */
  function trackableView() {
    const at = c().stage, R = LIZEEM_ROLES;
    const taughtTart = c().taught.includes(TART_ITEM);
    const leaf = measureView().leaves[0];
    const missing = leaf.lines.filter(entry => !entry.filled).map(entry => entry.name.toLowerCase());
    const by = {
      bridge: ['Cross the White Bridge to Caricas and speak with Egeria, the Voice of the Council, at the grain court.', [R.egeria], null],
      sowing: [`Sow bridge rye and field beans on the North fields and bring them in until two beds of each have been reaped (rye ${c().rye.length} / ${SOWING.rye}, beans ${c().beans.length} / ${SOWING.beans}). One in four of every Caricas harvest goes to the holder. Vertumnus will explain the rotation.`, [R.vertumnus], bench()],
      swap: ['Sow bridge rye in a North fields bed where field beans have just been reaped, and bring it in. It will come up Plain: the beans leave the ground too rich for rye, which is the lesson. Fine rye wants beans, a day’s rest, fruit or barley, then rye.', [R.vertumnus], bench()],
      claim: ['Captain Hagen’s quartermaster claims a tenth of the harvest for Cedric’s granary. Hand it over at the watch-house, or let Vertumnus hide it for the families in the upland.', [R.hagen, R.vertumnus], null],
      fine: [`Bring in bridge rye of Fine grade from Caricas.${c().claim === 'handed' ? ' The garrison takes its tenth until it is in.' : ''}`, [R.vertumnus], bench()],
      tart: [taughtTart ? 'Bake a soft-fruit tart and have Consus seal it at the grain court.'
        : 'Ask Pomona at the east orchard how the tart is made, bake one, and have Consus seal it at the grain court.', taughtTart ? [R.consus] : [R.pomona, R.consus], null],
      carry: ['Carry the sealed tart back across the White Bridge to Taleth at the Guild tower in Minora.', [TALETH_ID], null],
      done: [missing.length
        ? `Caricas is restored. Lay Fine ${missing.join(', ')} before Seshat in the Guild Library to fill its leaf of the Measure.${stillToWalk()}`
        : `The Caricas leaf of the Measure is full.${stillToWalk()}`,
        [...(missing.length ? [R.seshat] : []), ...(c().hired.length < c().hands.length ? [R.messor] : [])], null],
    };
    const [detail, destinationIds, target] = by[at] ?? ['Speak with Taleth outside the Guild tower in Minora.', [TALETH_ID], null];
    // `slateId` keeps the card off the tracker until src/quest-slate.js puts the quest in `LIVE`.
    return { id: LIZEEM_FARMLANDS.id, slateId: LIZEEM_FARMLANDS.id, title: LIZEEM_FARMLANDS.title, type: LIZEEM_FARMLANDS.type, region: 'Caricas',
      kicker: at === 'done' ? 'The Measure of the River' : 'Caricas · the rested ground',
      active: accepted(), complete: false, stage: at === 'done' ? 'measure' : at,
      detail, destinationIds: [...destinationIds], target,
      steps: STEPS.map(([stage, text]) => ({ text, done: rank(at) > rank(stage) })),
      notes: measureText(), measure: measureView(), arcs: arcCards() };
  }
  /** The countries whose arcs are not yet done, as the end of a sentence. */
  function stillToWalk() {
    const left = MEASURE_LEAVES.filter(leaf => leaf.id !== 'caricas' && arcStage(leaf.id) !== 'done').map(leaf => leaf.name);
    if (!left.length) return '';
    return ` ${left.length > 1 ? `${left.slice(0, -1).join(', ')} and ${left.at(-1)} are` : `${left[0]} is`} not yet walked.`;
  }
  const arcStage = id => { try { return arcs.get(id)?.stage?.() ?? null; } catch { return null; } };
  /**
   * A card for each registered arc that is under way, in the tracker's shape: the arc's own
   * `trackableView()` over the hub's defaults. Arcs show only once the charge is taken, and a done
   * arc goes to the journal instead. Each card rides on the hub's place in the slate.
   */
  function arcCards() {
    if (!accepted()) return [];
    const cards = [];
    for (const [id, arc] of arcs) {
      let view = null;
      try { view = arc.trackableView?.() ?? null; } catch { view = null; }
      const stage = arcStage(id);
      if (!view || stage === 'done') continue;
      const name = leafOf(id)?.name ?? `${id[0].toUpperCase()}${id.slice(1)}`;
      cards.push({ id: `${LIZEEM_FARMLANDS.id}-${id}`, title: `${LIZEEM_FARMLANDS.title}: ${name}`, type: LIZEEM_FARMLANDS.type, region: name,
        kicker: name, stage, complete: false, ...view, slateId: LIZEEM_FARMLANDS.id, active: view.active !== false, arc: id });
    }
    return cards;
  }
  /** The hub's card and every arc card under way, for the tracker (src/quest-tracker.js takes each). */
  const trackableViews = () => { const card = trackableView(); return [card, ...card.arcs]; };
  /** Who should wear the farmlands' mark now (src/quest-markers.js `farmlandsDestinations`): the hub's step and every arc's. */
  function markerIds() {
    if (!accepted()) return [];
    const ids = [...trackableView().destinationIds];
    for (const [id, arc] of arcs) {
      if (arcStage(id) === 'done') continue;
      try { ids.push(...[].concat(arc.markerIds?.() ?? []).filter(value => typeof value === 'string' && value)); } catch { /* an arc that cannot say marks nobody */ }
    }
    return [...new Set(ids)];
  }
  /**
   * The journal's entries for the arcs that are done, in its shape (src/journal-entries.js): each
   * arc's own `journal()` over the hub's defaults. Caricas's entry is written by the journal itself.
   */
  function journal() {
    const entries = [];
    for (const [id, arc] of arcs) {
      let own = null;
      try { own = arc.journal?.() ?? null; } catch { own = null; }
      const name = leafOf(id)?.name ?? id;
      for (const entry of [].concat(own ?? []).filter(value => value && typeof value === 'object'))
        entries.push({ id: `${LIZEEM_FARMLANDS.id}-${id}`, title: name, type: 'skill', grade: 'skill', status: 'complete', region: name,
          kicker: LIZEEM_FARMLANDS.title, detail: '', ...entry });
    }
    return entries;
  }

  /**
   * An arc for another country (the contract for Builds 2 and 3, 6 October 2026). `arc` is what the
   * country's module makes, `createXArc({ farming, skills, magic, inventory, cooking, merchants, onEvent })`,
   * and answers `{ stage(), trackableView(), markerIds(), journal(), measureLines(), snapshot(), restore(data),
   * validate(data) }`; `restore(undefined)` starts it afresh, and `validate` must accept undefined. It may
   * also have `attach(hub)`, given `{ accepted, enter, measureView }` when registered, and `measured(result)`,
   * told when one of its lines is written. Registering an arc opens its leaf of the Measure and lets the
   * save carry it; a save read before the arc was registered is handed to it now.
   */
  function registerArc(countryId, arc) {
    const id = typeof countryId === 'string' ? countryId.toLowerCase() : '';
    if (!ARC_IDS.includes(id) || !arc || ['stage', 'snapshot', 'restore'].some(key => typeof arc[key] !== 'function')) return false;
    arcs.set(id, arc); REGISTERED.add(id);
    if (typeof arc.validate === 'function') ARC_VALIDATORS.set(id, arc.validate); else ARC_VALIDATORS.delete(id);
    if (Object.hasOwn(carried, id)) { const nested = carried[id]; delete carried[id]; arc.restore(nested); }
    arc.attach?.(freeze({ accepted, enter, measureView, stage: () => state.stage }));
    return true;
  }

  /** How a choice in the trouble sits with a person: 1 warmer, 0 unchanged. */
  function regard(personId) {
    if (personId === LIZEEM_ROLES.hagen) return c().claim === 'handed' ? 1 : 0;
    if (personId === LIZEEM_ROLES.vertumnus) return c().claim === 'hidden' ? 1 : 0;
    return 0;
  }

  /** The hub's record, with each arc's save nested under `arcs` (left out while there is none). */
  function snapshot() {
    const out = copy(state), nested = copy(carried);
    for (const [id, arc] of arcs) { const saved = arc.snapshot(); if (saved !== undefined) nested[id] = copy(saved); }
    if (Object.keys(nested).length) out.arcs = nested;
    return out;
  }
  function restore(data) {
    if (data === undefined) { state = fresh(); carried = {}; for (const arc of arcs.values()) arc.restore(undefined); return true; }
    if (!validateLizeemFarmlands(data)) return false;
    const { arcs: nested = {}, ...rest } = copy(data);
    state = { ...fresh(), ...rest };
    // A save from before the wage: nobody's has been paid yet, so the next morning is the first.
    c().paid ??= {};
    carried = Object.fromEntries(Object.entries(nested).filter(([id]) => !arcs.has(id)));
    for (const [id, arc] of arcs) arc.restore(nested[id]);
    return true;
  }

  // The share-taker, registered once (src/farming.js `onHarvest`): handlers receive (bedId, result).
  farming?.onHarvest?.((bedId, result) => harvest(bedId, result));

  return {
    offer, accept, accepted, lease, harvest, settleClaim, noteTaught, sealTart, deliver, hire, tick, enter,
    measureView, trackableView, trackableViews, markerIds, journal, registerArc, arc: id => arcs.get(id) ?? null, regard, snapshot, restore,
    get stage() { return state.stage; },
    get caricas() { return copy(c()); },
    get shares() { return { ...state.shares }; },
    /** The hands who have come back to the farms and should be stood up (src/lizeem-people.js). */
    handsReturned: () => [...c().hands],
  };
}

/**
 * The objective a free start shows while the main quest waits (src/minora-opening.js
 * `FREE_ROAM_GUIDANCE`): Taleth's, until his charge is taken, and then the charge itself, so the
 * tracker stops sending Rollo back to a man he has already answered (6 October 2026).
 */
export const CHARGE_GUIDANCE = freeze({ title: 'Walk the Measure of the River',
  detail: 'Taleth has sent you down both banks of the Lizeem to bring the farm countries back to work. The Farmlands of the Lizeem shows the next step. Jojo or Glun in Drent, or Iven in Nothom, can still introduce you to the main quest whenever you choose.',
  destinationIds: freeze([]) });
export const freeRoamGuidance = (farmlands, before) => (farmlands?.accepted?.() ? CHARGE_GUIDANCE : before);

/**
 * Taleth's half of the Caricas arc, for his own conversation (src/taleth.js) to splice into its
 * topic list: the tart is handed over here. `context` carries `farmlands`, `inventory`,
 * `openDialogue`, `closeDialogue` and, optionally, `merchants`, `onComplete` and `notify`.
 */
export function talethFarmlandsChoices(npc, context) {
  const { farmlands, inventory = null, merchants = null, openDialogue, closeDialogue, onComplete = null, notify = null } = context;
  if (!farmlands || farmlands.caricas.stage !== 'carry') return [];
  const tart = carriedTart(inventory);
  if (!tart) return [];
  return [{ id: 'lizeem-deliver-tart', label: 'Give Taleth the sealed tart from Caricas', action: () => {
    inventory?.remove?.(tart, 1);
    // A fine tart is laid up in the Measure as Fine, or as Prize if the measurer sealed it so.
    const grade = tart === TART_ITEM ? null : merchants?.sealed?.(tart)?.prize > 0 ? 'prize' : 'fine';
    const result = farmlands.deliver({ grade });
    if (!result) return closeDialogue();
    openDialogue(npc, [
      'Rye crust, soft fruit, and a measurer’s seal I have not seen on anything from across that bridge in a year. Sit down. No, stand. I want to look at it.',
      'Then the valley is alive on the east bank, and the Guild has a line to write. Here is what I promised: the dew comes when you call it now, to one farm at a time. Do not be greedy with it.',
      'Egeria will lend you a second farm if you can pay the holder for it. And a man came to the north fields this morning asking whether there was reaping. I told him there might be.',
    ], null, 'Back to Taleth', { noWayfinding: true, ...(onComplete ? { onComplete } : {}) });
    notify?.('Call the Dew: water every bed on a farm at once.', 'TALETH TAUGHT YOU A FIELD WORKING');
  } }];
}
