/**
 * **The Farmlands of the Lizeem: Nethereum, the deep water** (docs/lizeem-farmlands-design.md 5.2, 6.4, 7.3 and
 * 7.4; the design of 5 October 2026, built 6 October 2026 under the contract for Builds 2 and 3).
 *
 * The wet hollow across the Pilgrims' Bridge, between the Isa and the Neth. Rollo comes to Haethom, the ridge
 * hamlet above the reliable line, and finds the meadow hatch broken and the man who kept it ashamed of it. The
 * arc, in order:
 *
 *   `arrive`  cross the Isa and meet Mererid, the levee-warden, on the levee; the hatch is broken
 *   `hatch`   mend it with Seithenyn: two planks and a piece of ironwork (src/meadow-water.js `mendHatch`)
 *   `drown`   hear Mererid on the water (blackwater, siltshine, frogcall), open the hatch, draw it off at the shine
 *   `sow`     flood oats brought in off the silt, and the first cut of hay
 *   `wolves`  Boann sends for Rollo: wolves at the cattle on the new grass (`NETHEREUM_WOLVES`, a fight the host starts)
 *   `fine`    Fine flood oats, and the second cut of hay
 *   `recall`  oatcakes and smoked fish in the satchel, and the Flood Recall heard from Fintan on the levee's head;
 *             one of the names is Taleth's mother's, Ceridwen, and Rollo may carry it
 *   `carry`   the dish, and the name if he carries it, taken back over the Pilgrims' Bridge to Taleth
 *   `done`    Nethereum restored: *Quicken*, the deep plots below the line at Farming 16, and Seithenyn minds the
 *             meadow for a dish
 *
 * **The levee tenth** (design 7.3): one in ten of every harvest off a Nethereum bed goes to the common store on
 * the levee, taken with the farm's share-takers (src/farming.js `onHarvest`). A turn of levee work with Mererid
 * waives it for a game day after.
 *
 * The meadow, the weir and the satchel are the game's (src/meadow-water.js, src/inventory.js); the arc keeps the
 * story and reads the meadow as it stands (`drawn`, `last`, `mended`), so a draw-off counts however the host
 * wired the hatch. The hub (src/lizeem-farmlands.js `registerArc`) lists the arc on the tracker and its leaf of
 * the Measure, nests its save, and, through `attach`, says whether Taleth's charge has been taken.
 *
 * Pure: no DOM, no three, no world.
 */
import { farmRow } from './farming.js';
import { GAME_DAY_SECONDS, gameDay } from './merchants.js';
import { goodOf } from './prices.js';
import { TALETH_ID } from './lizeem-farmlands.js';
import { NETHEREUM_COUNTRY, NETHEREUM_MEADOW_ROWS, NETHEREUM_DEEP_ROWS, NETHEREUM_SITES, NETHEREUM_SEED_BENCH } from './nethereum-farm.js';

const freeze = Object.freeze;

export const NETHEREUM_ARC_VERSION = 1;
export const NETHEREUM_ARC_ID = NETHEREUM_COUNTRY;
export const NETHEREUM_STAGES = freeze(['arrive', 'hatch', 'drown', 'sow', 'wolves', 'fine', 'recall', 'carry', 'done']);
const rank = stage => NETHEREUM_STAGES.indexOf(stage);

/**
 * Experience lumps, as Build 1's (design 4.6: about 150, 200, 300, 400 and 1,000), each paid as its stage is left
 * and so once: the hatch mended, the meadow drawn at the shine, the wolves driven off, the Fine harvest in, and
 * the dish in Taleth's hands.
 */
export const NETHEREUM_XP = freeze({ hatch: 150, drown: 200, wolves: 300, fine: 400, done: 1000 });
const PAID_LEAVING = freeze({ hatch: NETHEREUM_XP.hatch, drown: NETHEREUM_XP.drown, wolves: NETHEREUM_XP.wolves, fine: NETHEREUM_XP.fine, carry: NETHEREUM_XP.done });

/** The levee tenth (design 7.3), and the deep plots' level (design 4.6). */
export const LEVEE_SHARE = 1 / 10;
export const DEEP_LEVEL = 16;
/** The field working Taleth teaches for Nethereum (design 3), and the name Fintan speaks (the contract, 6 October 2026). */
export const QUICKEN = 'quicken';
export const CERIDWEN = 'Ceridwen';
/** The recipes taught in this arc, by the kitchen's ids (src/nethereum-produce.js): Mererid's oatcakes and Gwyddno's smoked fish. */
export const NETHEREUM_RECIPE_IDS = freeze({ oatcakes: 'oatcakes', smokedFish: 'smoked-fish' });
const RECIPE_IDS = freeze(Object.values(NETHEREUM_RECIPE_IDS));

/** The beds (src/nethereum-farm.js). Bed ids are permanent once shipped. */
export const MEADOW_BEDS = freeze(NETHEREUM_MEADOW_ROWS.map(row => row.id));
export const DEEP_BEDS = freeze(NETHEREUM_DEEP_ROWS.map(row => row.id));
export const NETHEREUM_BEDS = freeze([...MEADOW_BEDS, ...DEEP_BEDS]);
const isNethereumBed = bedId => NETHEREUM_BEDS.includes(bedId) || farmRow(bedId)?.country === NETHEREUM_COUNTRY;

/** The dish of Nethereum is oatcakes with smoked fish: the fine kind of each first, then the ordinary. */
export const DISH_ITEMS = freeze({ oatcakes: freeze(['oatcakes-fine', 'oatcakes']), fish: freeze(['smoked-fish-fine', 'smoked-fish']) });
/** What of the dish the satchel holds: `{ oatcakes, fish, both }`, each the item id carried or null. */
export function carriedDishes(inventory) {
  const has = id => (inventory?.count?.(id) ?? 0) > 0;
  const oatcakes = DISH_ITEMS.oatcakes.find(has) ?? null, fish = DISH_ITEMS.fish.find(has) ?? null;
  return { oatcakes, fish, both: !!oatcakes && !!fish };
}

/**
 * **The wolves on the new grass** (design 5.2, step 4), in the shape src/combat.js `startEncounter` takes, as the
 * Lauvel's two wolves are (src/luscia-chapter.js). A module cannot start a fight, so the host does: Boann's
 * conversation asks for it (`context.startEncounter(NETHEREUM_WOLVES)`) and the host tells the arc when the
 * pack is driven off (`wolvesDriven(NETHEREUM_WOLVES.id)`). Three wolves come in off the hollow from the west,
 * low along the wet threads, onto the rim pasture below Boann's byre; the arena runs along +x, so a traveler
 * who backs east toward the levee leaves the fight, and he restarts below the byre. All of it is open ground on
 * the north rim, clear of the byre, the beds, the levee and the paths (tests/lizeem-nethereum.test.js).
 */
export const NETHEREUM_WOLVES = freeze({
  id: 'haethom-wolves', center: freeze({ x: -2430, z: 340 }), checkpoint: freeze({ x: -2414, z: 336 }),
  retreatAxis: 'x', retreatLine: -2406,
  enemies: freeze([
    freeze({ id: 'haethom-wolf-lead', x: -2444, z: 338, hp: 52, kind: 'wolf', entry: .2 }),
    freeze({ id: 'haethom-wolf-second', x: -2447, z: 346, hp: 52, kind: 'wolf', entry: 1.3 }),
    freeze({ id: 'haethom-wolf-third', x: -2441, z: 330.5, hp: 52, kind: 'wolf', entry: 2.4 }),
  ]),
});

const SILTS = freeze(['fine', 'thin', 'sour']);
const GRADES = freeze(['plain', 'good', 'fine', 'prize']);
const FINE_GRADES = freeze(['fine', 'prize']);
const gradeOf = value => (typeof value === 'string' && GRADES.includes(value.toLowerCase()) ? value.toLowerCase() : null);
const titled = word => `${word[0].toUpperCase()}${word.slice(1)}`;
const CROP_NAMES = freeze({ 'flood-oats': 'flood oats', 'meadow-hay': 'meadow hay' });

const fresh = () => ({
  version: NETHEREUM_ARC_VERSION, stage: 'arrive',
  water: false, shone: false, oats: false, cut: false, fineOats: false, secondCut: false,
  hay: {}, recall: null, taught: [], minder: false,
  levee: { carry: 0, taken: 0, worked: null },
});
const copy = value => JSON.parse(JSON.stringify(value));
const isObject = value => !!value && typeof value === 'object' && !Array.isArray(value);
const onlyKeys = (value, keys) => Object.keys(value).every(key => keys.includes(key)) && keys.every(key => Object.hasOwn(value, key));
const count = value => Number.isSafeInteger(value) && value >= 0 && value <= 1e7;
const playTime = value => Number.isFinite(value) && value >= 0 && value <= 1e8;
const STATE_KEYS = freeze(Object.keys(fresh()));
const BOOLEANS = freeze(['water', 'shone', 'oats', 'cut', 'fineOats', 'secondCut', 'minder']);

/**
 * Whether a saved arc is one this module wrote. `undefined` is a save from before Nethereum, and loads as an arc
 * not yet begun. Every flag is held to the stage it belongs to, so a save cannot claim a reward it did not earn.
 */
export function validateNethereumArc(value) {
  if (value === undefined) return true;
  if (!isObject(value) || value.version !== NETHEREUM_ARC_VERSION || !NETHEREUM_STAGES.includes(value.stage)) return false;
  if (!onlyKeys(value, STATE_KEYS) || !BOOLEANS.every(key => typeof value[key] === 'boolean')) return false;
  if (!isObject(value.hay) || !Object.entries(value.hay).every(([bed, drawn]) => MEADOW_BEDS.includes(bed) && count(drawn))) return false;
  if (![null, 'carried', 'left'].includes(value.recall)) return false;
  if (!Array.isArray(value.taught) || new Set(value.taught).size !== value.taught.length || !value.taught.every(id => RECIPE_IDS.includes(id))) return false;
  const L = value.levee;
  if (!isObject(L) || !onlyKeys(L, ['carry', 'taken', 'worked']) || !(Number.isFinite(L.carry) && L.carry >= 0 && L.carry < 1) || !count(L.taken)
    || !(L.worked === null || playTime(L.worked))) return false;
  const at = rank(value.stage);
  // Mererid is met before anything she teaches or asks; the shine is seen only once the hatch holds water.
  if ((value.water || L.worked !== null) && at < rank('hatch')) return false;
  if (value.shone && at < rank('drown')) return false;
  if (at > rank('drown') && !(value.water && value.shone)) return false;
  // The harvests count from the sowing on, and each stage is left only with its own in.
  if ([value.oats, value.cut, value.fineOats, value.secondCut].some(Boolean) && at < rank('sow')) return false;
  if (at > rank('sow') && !(value.oats && value.cut)) return false;
  if (at > rank('fine') && !(value.fineOats && value.secondCut)) return false;
  if (value.fineOats && !value.oats) return false;
  if (value.secondCut && !value.cut) return false;
  // The Recall is answered once, and its answer is what the carry stage begins with.
  if ((at > rank('recall')) !== (value.recall !== null)) return false;
  // Seithenyn minds the meadow only for a man who has brought it back.
  if (value.minder && value.stage !== 'done') return false;
  return true;
}

/**
 * The arc. `farming` is the farm (its `onHarvest` takes the levee tenth and hears the harvests), `meadow` the
 * flood meadow (src/meadow-water.js), `weir` Gwyddno's weir; `skills`, `magic`, `inventory`, `cooking` and
 * `merchants` the game's own, and any of them may be missing in a test. `clock` is the play clock in seconds,
 * which the levee work's game day is reckoned on.
 */
export function createNethereumArc({ farming = null, meadow = null, weir = null, skills = null, magic = null, inventory = null, cooking = null,
  merchants = null, clock = null, onEvent = () => {} } = {}) {
  let state = fresh(), hub = null, lastTick = null;
  const now = at => Math.max(0, Number(Number.isFinite(at) ? at : typeof clock === 'function' ? clock() : 0) || 0);
  /** Taleth's charge: the hub says, once the arc is registered; an arc on its own (a test) is always under way. */
  const accepted = () => (hub ? !!hub.accepted?.() : true);
  const level = () => skills?.level?.('farming') ?? 1;
  const meadowView = at => { try { return meadow?.view?.(at) ?? null; } catch { return null; } };
  const drawnCount = () => meadowView()?.drawn ?? 0;

  const pay = amount => {
    if (!(amount > 0)) return null;
    if (skills?.known && !skills.known('farming')) skills.learn?.('farming', { announce: false });
    return skills?.gain?.('farming', amount) ?? null;
  };
  /** One stage on, with its lump paid as the old stage is left. Never backwards, never twice. */
  function advance(to) {
    const from = state.stage;
    if (rank(to) !== rank(from) + 1) return false;
    state.stage = to;
    const xp = PAID_LEAVING[from] ?? 0, gained = pay(xp);
    onEvent({ type: 'lizeem-step', arc: NETHEREUM_ARC_ID, from, to, xp, levelled: !!gained?.levelled });
    if (to === 'wolves') onEvent({ type: 'nethereum-wolves', encounter: NETHEREUM_WOLVES.id,
      note: 'Boann has sent a boy down from the byre: wolves are at the cattle on the new grass.' });
    return true;
  }
  /**
   * The meadow as it stands, read into the story, and any step done early collected as its stage arrives: a hatch
   * mended however it was mended, the shine drawn at during the drowning, and the harvests.
   */
  function settle() {
    if (!accepted()) return;
    const view = meadowView();
    if (state.stage === 'hatch' && view?.mended) advance('drown');
    if (state.stage === 'drown' && view?.last?.silt === 'fine') state.shone = true;
    if (state.stage === 'drown' && state.water && state.shone) advance('sow');
    if (state.stage === 'sow' && state.oats && state.cut) advance('wolves');
    if (state.stage === 'fine' && state.fineOats && state.secondCut) advance('recall');
  }

  /** Mererid on the levee: the meadow and the broken hatch. */
  function meet() {
    if (!accepted() || state.stage !== 'arrive') return false;
    advance('hatch');
    settle();
    return true;
  }
  /** Mererid on the water: blackwater, siltshine, frogcall. Heard any time after she is met. */
  function learnWater() {
    if (!accepted() || rank(state.stage) < rank('hatch')) return false;
    const first = !state.water;
    state.water = true;
    settle();
    return first;
  }

  /** Seithenyn and Rollo mend the hatch: the meadow takes the planks and the ironwork from the satchel. */
  function mendHatch() {
    if (!accepted()) return { ok: false, reason: 'Nobody in Haethom has asked you to mend anything.' };
    if (state.stage !== 'hatch') return { ok: false, reason: rank(state.stage) < rank('hatch') ? 'Speak with Mererid on the levee first.' : 'The hatch is sound already.' };
    const result = meadow?.mendHatch ? meadow.mendHatch(inventory ? { inventory } : {}) : { ok: true };
    if (!result?.ok && !meadowView()?.mended) return { ok: false, reason: result?.reason ?? 'The hatch wants two planks and a piece of ironwork.', lacking: result?.lacking ?? [] };
    advance('drown');
    settle();
    return { ok: true, used: result?.used ?? null };
  }
  /** The hatch's lever, for the host: open it when the meadow is dry, draw it off when it is under water. */
  function useHatch(at) {
    const view = meadowView(at);
    if (!view) return { ok: false, reason: 'There is no hatch here.' };
    if (!view.mended) return { ok: false, reason: rank(state.stage) >= rank('hatch')
      ? 'The hatch is broken. Seithenyn kept it once; ask him to help you mend it.' : 'The hatch is broken: a cracked paddle and no straps. Somebody in Haethom will know whose it was.' };
    return view.open ? drawOff(at) : openHatch(at);
  }
  function openHatch(at) {
    const result = meadow?.openHatch?.(at) ?? { ok: false, reason: 'There is no hatch here.' };
    settle();
    return result;
  }
  function drawOff(at) {
    const result = meadow?.drawOff?.(at) ?? { ok: false, reason: 'There is no water here to draw off.' };
    settle();
    return result;
  }
  /** The meadow's own events, if the host passes them on (`meadow-drawn` and the rest): the story is read again. */
  function hear(event) {
    if (typeof event?.type === 'string' && event.type.startsWith('meadow-')) settle();
  }

  /**
   * A bed is reaped (the farming module's `onHarvest`). On a Nethereum bed the levee tenth is taken, and the arc
   * notes the oats and the hay: a second cut is hay off a meadow bed already cut since the last draw-off, which
   * is the aftermath src/meadow-water.js grows for a farmer of level 10.
   */
  function harvest(bedId, result = {}) {
    if (!isNethereumBed(bedId)) return null;
    const crop = result.crop ?? result.item, grade = gradeOf(result.grade) ?? 'plain', meadowBed = MEADOW_BEDS.includes(bedId);
    const counting = accepted() && rank(state.stage) >= rank('sow');
    if (crop === 'flood-oats' && meadowBed && counting) { state.oats = true; if (FINE_GRADES.includes(grade)) state.fineOats = true; }
    if (crop === 'meadow-hay' && meadowBed) {
      const drawn = drawnCount(), second = state.hay[bedId] === drawn;
      state.hay[bedId] = drawn;
      if (counting) { state.cut = true; if (second) state.secondCut = true; }
    }
    const share = takeTenth(result, crop, grade);
    settle();
    return share;
  }
  /** One in ten to the common store on the levee, reckoned on the whole harvest with the fractions carried. */
  function takeTenth(result, crop, grade) {
    const whole = value => (Number.isSafeInteger(value) && value > 0 ? value : 0);
    const quantity = whole(result.grown ?? result.quantity ?? result.count), left = whole(result.count ?? quantity);
    if (!quantity || !left) return null;
    const what = `${quantity} ${CROP_NAMES[crop] ?? 'of the harvest'}${grade !== 'plain' ? `, ${titled(grade)}` : ''}.`;
    if (leveeWaived()) return { taken: 0, note: `${what} The levee tenth is waived today: you kept the levee. Yours: ${left}.` };
    const L = state.levee;
    L.carry += quantity * LEVEE_SHARE;
    const tenth = Math.floor(L.carry + 1e-9);
    L.carry = Math.min(.999999, Math.max(0, L.carry - tenth));
    const taken = Math.min(left, tenth);
    if (!taken) return null;
    L.taken += taken;
    const note = `${what} The levee tenth: ${taken}. Yours: ${left - taken}.`;
    onEvent({ type: 'lizeem-share', arc: NETHEREUM_ARC_ID, taken, levee: taken, note });
    return { taken, note };
  }
  /** Whether the tenth is waived now: for a game day after a turn of levee work. */
  function leveeWaived(at) {
    const t = now(at), worked = state.levee.worked;
    return worked !== null && t >= worked && t < worked + GAME_DAY_SECONDS;
  }
  /** A turn of levee work with Mererid, once a game day. Her price, and the tenth's waiver for a game day after. */
  function leveeWork(at) {
    const t = now(at);
    if (!accepted() || rank(state.stage) < rank('hatch')) return { ok: false, reason: 'Mererid has not asked you onto her levee.' };
    if (state.levee.worked !== null && gameDay(state.levee.worked) === gameDay(t)) return { ok: false, reason: 'You have had your turn today. Come back tomorrow, and bring the same shoulders.' };
    state.levee.worked = t;
    onEvent({ type: 'nethereum-levee-work', until: t + GAME_DAY_SECONDS });
    return { ok: true, until: t + GAME_DAY_SECONDS };
  }

  /** Boann's "Go after the wolves": the host starts `NETHEREUM_WOLVES`. */
  function meetWolves() {
    if (!accepted() || state.stage !== 'wolves') return { ok: false, reason: 'The cattle are quiet. Boann has not sent for anybody.' };
    return { ok: true, startEncounter: NETHEREUM_WOLVES.id, encounter: NETHEREUM_WOLVES };
  }
  /** The host, when the fight with `NETHEREUM_WOLVES` is won: the pack is driven off the new grass. */
  function wolvesDriven(encounterId = NETHEREUM_WOLVES.id) {
    if (encounterId !== NETHEREUM_WOLVES.id || state.stage !== 'wolves' || !accepted()) return { ok: false };
    advance('fine');
    onEvent({ type: 'nethereum-wolves-driven', encounter: NETHEREUM_WOLVES.id });
    settle();
    return { ok: true };
  }

  /** A recipe taught by somebody in this arc, recorded for the tracker's pointers. */
  function noteTaught(recipeId) {
    if (!RECIPE_IDS.includes(recipeId) || state.taught.includes(recipeId)) return false;
    state.taught.push(recipeId);
    return true;
  }

  /**
   * The Flood Recall, heard on the levee's head with the dish in the satchel. `carry` asks Fintan for leave to take
   * one name to Minora; `leave` leaves the names on the levee. Either way the dish goes to Taleth next.
   */
  function recall(choice) {
    if (!accepted() || state.stage !== 'recall') return { ok: false, reason: 'Fintan says the names when the water rises, and not before.' };
    if (!['carry', 'leave'].includes(choice)) return { ok: false, reason: 'Carry the name, or leave it.' };
    if (inventory && !carriedDishes(inventory).both) return { ok: false, reason: 'Nobody stands at the Recall with empty hands. Oatcakes, and smoked fish.' };
    state.recall = choice === 'carry' ? 'carried' : 'left';
    advance('carry');
    onEvent({ type: 'nethereum-recall', carried: state.recall === 'carried', ...(state.recall === 'carried' ? { name: CERIDWEN } : {}) });
    return { ok: true, name: state.recall === 'carried' ? CERIDWEN : null };
  }

  /**
   * The dish in Taleth's hands: the end of Nethereum. *Quicken* is taught here, in the stage change, and nowhere
   * else; the deep plots open with it at Farming 16, and Seithenyn will mind the meadow for a dish. A Fine dish
   * is laid up in the Measure as well, through the hub.
   */
  function deliver({ grade = null } = {}) {
    if (!accepted() || state.stage !== 'carry') return false;
    advance('done');
    const learned = magic?.learn?.(QUICKEN) ?? null;
    let measured = null;
    if (FINE_GRADES.includes(gradeOf(grade))) try { measured = hub?.enter?.('oatcakes', gradeOf(grade), { country: NETHEREUM_ARC_ID }) ?? null; } catch { measured = null; }
    const name = state.recall === 'carried';
    onEvent({ type: 'nethereum-restored', spell: QUICKEN, learned, name, deep: deepOpen() });
    return { ok: true, spell: QUICKEN, learned, measured, name };
  }

  /** The deep plots below the line: Liban's ground, Rollo's once Nethereum is restored and his Farming is 16. */
  const deepOpen = () => state.stage === 'done' && level() >= DEEP_LEVEL;
  /** Whether a bed may be sown now (the host asks before sowing a deep plot). */
  function canSow(bedId) {
    if (!DEEP_BEDS.includes(bedId) || deepOpen()) return { ok: true };
    return { ok: false, reason: state.stage !== 'done'
      ? 'The deep plots are Liban’s ground. She lets them only to somebody who has brought the meadow back.'
      : `The deep plots want Farming level ${DEEP_LEVEL}. Liban says so, and so does the water.` };
  }

  /** Seithenyn minds the meadow for a dish (design 6.4): he draws it off at the shine once, while Rollo is away. */
  function mind(dishId) {
    if (state.stage !== 'done') return { ok: false, reason: 'Seithenyn has not been asked to keep anything for nineteen years. Not yet.' };
    if (state.minder) return { ok: false, reason: 'He is minding it already.' };
    if (goodOf(dishId)?.kind !== 'dish') return { ok: false, reason: 'A dish. Not the makings of one.' };
    if (inventory?.remove && !inventory.remove(dishId, 1)) return { ok: false, reason: 'You have none to give him.' };
    state.minder = true;
    onEvent({ type: 'nethereum-minding', dish: dishId });
    return { ok: true, dish: dishId };
  }

  /**
   * Once a whole second of play (the host calls this from its loop): the meadow is read into the story, and while
   * Seithenyn is minding it he draws the water off at the shine, which ends the arrangement until the next dish.
   */
  function tick(playSeconds) {
    const at = Number(playSeconds);
    if (!Number.isFinite(at) || Math.floor(at) === lastTick) return null;
    lastTick = Math.floor(at);
    settle();
    if (!state.minder || meadowView(at)?.phase !== 'siltshine') return null;
    const result = meadow?.drawOff?.(at);
    if (!result?.ok) return null;
    state.minder = false;
    onEvent({ type: 'nethereum-minded', silt: result.silt, note: 'Seithenyn drew the meadow off at the shine, as he said he would.' });
    settle();
    return { minded: true, silt: result.silt };
  }

  /** Gwyddno tells the story of the child from the weir once he has taught Rollo the smoke and the wolves are gone. */
  function trusts(personId) {
    if (personId === 'gwyddno') return state.taught.includes(NETHEREUM_RECIPE_IDS.smokedFish) && rank(state.stage) > rank('wolves');
    return false;
  }

  // ---- What the hub shows -------------------------------------------------------------------------------
  const STEPS = [
    ['arrive', 'Cross the Isa to Haethom and find Mererid on the levee.'],
    ['hatch', 'Mend the meadow hatch with Seithenyn.'],
    ['drown', 'Learn the water, drown the meadow and draw it off at the shine.'],
    ['sow', 'Bring in flood oats off the silt, and the first cut of hay.'],
    ['wolves', 'Drive the wolves off Boann’s cattle.'],
    ['fine', 'Bring in Fine flood oats, and the second cut of hay.'],
    ['recall', 'Make oatcakes and smoked fish, and stand at the Flood Recall.'],
    ['carry', 'Carry the dish to Taleth.'],
  ];
  const place = (site, name) => (site ? { x: site.x, z: site.z, id: site.id ?? null, name } : null);
  const tick1 = value => (value ? 1 : 0);
  /** The water as Mererid would describe it now, for the drowning's card. */
  function waterNow() {
    const view = meadowView();
    if (!view?.mended) return '';
    if (view.phase === 'blackwater') return ` The water is black on the meadow; the silt shines in about ${Math.ceil(view.left)} seconds.`;
    if (view.phase === 'siltshine') return ` The silt is shining now: draw it off within ${Math.ceil(view.left)} seconds.`;
    if (view.phase === 'frogcall') return ' The frogs are calling: the ground is souring. Draw it off and drown it again.';
    if (view.last?.silt === 'thin') return ' You drew it off black, and the silt went with it. Open the hatch again.';
    if (view.last?.silt === 'sour') return ' You let the frogs have it. Open the hatch again.';
    return ' The hatch is shut and the meadow is dry.';
  }

  /** The arc's card on the tracker (the hub adds its id, title and place in the slate). */
  function trackableView() {
    const at = state.stage, dishes = carriedDishes(inventory), taught = id => state.taught.includes(id);
    const tenth = leveeWaived() ? ' The levee tenth is waived today.' : ' One in ten of every Nethereum harvest goes to the levee store, unless you have kept the levee today.';
    const cooks = [...(taught(NETHEREUM_RECIPE_IDS.oatcakes) ? [] : ['mererid']), ...(taught(NETHEREUM_RECIPE_IDS.smokedFish) ? [] : ['gwyddno'])];
    const by = {
      arrive: ['Cross the Pilgrims’ Bridge over the Isa to Haethom, the ridge hamlet, and find Mererid, the levee-warden, on the levee above the meadow.', ['mererid'], place(NETHEREUM_SITES.levee, 'The Haethom levee')],
      hatch: ['The meadow hatch is broken. Bring two planks and a piece of ironwork (salvaged metal will do) and mend it with Seithenyn, who kept it once.', ['seithenyn'], place(NETHEREUM_SITES.hatch, 'The meadow hatch')],
      drown: [`${state.water ? '' : 'Ask Mererid about the water. '}Open the hatch and drown the meadow, then draw the water off when the silt shines. Too soon is thin; too late is sour.${waterNow()}`,
        state.water ? [] : ['mererid'], place(NETHEREUM_SITES.hatch, 'The meadow hatch')],
      sow: [`Sow flood oats on the silt and bring them in, and cut the hay the meadow grows (oats ${tick1(state.oats)} / 1, hay ${tick1(state.cut)} / 1). Seed is on the bench at the meadow’s head.${tenth}`,
        [], place(NETHEREUM_SEED_BENCH, 'Haethom meadow seed bench')],
      wolves: ['Boann has sent for you: wolves are at the cattle on the new grass. Find her at the byre on the north rim, and drive them off.', ['boann'], place(NETHEREUM_SITES.byre, 'Boann’s byre')],
      fine: [`Bring in Fine flood oats, and take a second cut of hay off a bed already cut since the last draw-off (Fine oats ${tick1(state.fineOats)} / 1, second cut ${tick1(state.secondCut)} / 1). The second cut wants Farming level 10.${tenth}`,
        [], place(NETHEREUM_SEED_BENCH, 'Haethom meadow seed bench')],
      recall: [dishes.both ? 'Stand at the Flood Recall with Fintan on the levee’s head.'
        : `Make oatcakes from flood oats${taught(NETHEREUM_RECIPE_IDS.oatcakes) ? '' : ' (Mererid will show you how)'} and smoke a weir fish${taught(NETHEREUM_RECIPE_IDS.smokedFish) ? '' : ' (Gwyddno will show you how, at the weir)'}, then stand at the Flood Recall with Fintan on the levee’s head.`,
        dishes.both ? ['fintan'] : [...cooks, 'fintan'], !dishes.fish ? place(NETHEREUM_SITES.weir, 'Gwyddno’s weir') : place(NETHEREUM_SITES.recall, 'The Flood Recall')],
      carry: [`Carry the oatcakes and smoked fish${state.recall === 'carried' ? ', and the name Fintan let you take,' : ''} back over the Pilgrims’ Bridge to Taleth at the Guild tower in Minora.`, [TALETH_ID], null],
      done: ['Nethereum is restored.', [], null],
    };
    const [detail, destinationIds, target] = by[at];
    return { kicker: 'Nethereum · the deep water', stage: at, active: accepted() && at !== 'done', complete: at === 'done',
      detail, destinationIds: [...destinationIds], target,
      steps: STEPS.map(([stage, text]) => ({ text, done: rank(at) > rank(stage) })) };
  }
  /** Who wears the farmlands' mark for this arc now. */
  const markerIds = () => (accepted() && state.stage !== 'done' ? trackableView().destinationIds : []);
  /** The journal's entry once Nethereum is restored, in its shape (src/journal-entries.js). */
  function journal() {
    if (state.stage !== 'done') return [];
    return [{ title: 'Nethereum: the deep water', region: 'Nethereum', kicker: 'The Farmlands of the Lizeem',
      detail: `You mended the Haethom meadow hatch with Seithenyn, drowned the meadow and drew it off at the shine, and drove the wolves off Boann’s cattle. You stood at the Flood Recall${state.recall === 'carried' ? ` and carried one of its names, ${CERIDWEN}, to Taleth with the oatcakes and smoked fish` : ' and carried the oatcakes and smoked fish to Taleth'}, who taught you Quicken.`,
      rewards: ['Quicken', 'Farming experience', `The deep plots below the line, at Farming ${DEEP_LEVEL}`, 'Seithenyn minds the meadow for a dish'] }];
  }
  /** Nethereum's leaf of the Measure, in the arc's own words; the hub keeps the grades. */
  function measureLines() {
    return [
      { id: 'flood-oats', name: 'Flood oats off the silt', items: ['flood-oats'] },
      { id: 'meadow-hay', name: 'Meadow hay', items: ['meadow-hay'] },
      { id: 'weir-fish', name: 'Weir fish', items: ['weir-fish'] },
      { id: 'dish', name: 'Oatcakes with smoked fish', items: ['oatcakes', 'smoked-fish'] },
    ];
  }

  /** The arc's state, for the people and the tests: a copy, with what the meadow says now. */
  function view() {
    const meadowNow = meadowView();
    return { ...copy(state), accepted: accepted(), deepOpen: deepOpen(), waived: leveeWaived(),
      lastDraw: state.stage === 'drown' ? meadowNow?.last?.silt ?? null : null, phase: meadowNow?.phase ?? null };
  }
  const snapshot = () => copy(state);
  function restore(data) {
    if (data === undefined) { state = fresh(); return true; }
    if (!validateNethereumArc(data)) return false;
    state = copy(data);
    return true;
  }

  // The tenth-taker, registered once (src/farming.js `onHarvest`): handlers receive (bedId, result).
  farming?.onHarvest?.((bedId, result) => harvest(bedId, result));

  return {
    id: NETHEREUM_ARC_ID,
    stage: () => state.stage, accepted, view, trackableView, markerIds, journal, measureLines, snapshot, restore, validate: validateNethereumArc,
    attach: next => { hub = next ?? null; },
    meet, learnWater, mendHatch, useHatch, openHatch, drawOff, hear, harvest, leveeWork, leveeWaived, meetWolves, wolvesDriven, noteTaught,
    recall, deliver, deepOpen, canSow, mind, tick, trusts,
    /** The weir's catch, through the arc so the host has one place to ask (src/meadow-water.js `createWeir`). */
    takeWeir: at => weir?.take?.(at, inventory ? { inventory } : {}) ?? { ok: false, reason: 'There is no weir here.' },
  };
}

/**
 * Taleth's half of the Nethereum arc, for his conversation (src/taleth.js `extraChoices`), beside Build 1's
 * `talethFarmlandsChoices`: the oatcakes and smoked fish are handed over here, and the name with them if Rollo
 * carries it. `context` carries `nethereum`, `inventory`, `openDialogue`, `closeDialogue` and, optionally,
 * `merchants` (a sealed Fine dish is laid up in the Measure; with no market to ask, the fine kinds count as Fine),
 * `onComplete` and `notify`.
 */
export function talethNethereumChoices(npc, context) {
  const { nethereum = null, inventory = null, merchants = null, openDialogue, closeDialogue, onComplete = null, notify = null } = context;
  if (npc?.id !== TALETH_ID || nethereum?.stage?.() !== 'carry') return [];
  const dishes = carriedDishes(inventory);
  if (!dishes.both) return [];
  const named = nethereum.view().recall === 'carried';
  return [{ id: 'nethereum-deliver-dish', label: named ? 'Give Taleth the oatcakes and smoked fish from Nethereum, and the name' : 'Give Taleth the oatcakes and smoked fish from Nethereum',
    action: () => {
      // The Measure takes Fine or better, sealed away from home (design 4.4): the dish is as good as its poorer half.
      // Read before anything leaves the satchel, since a seal counts only what is still carried.
      const graded = id => (!id.endsWith('-fine') ? null : !merchants?.sealed ? 'fine' : merchants.sealed(id)?.count > 0 ? (merchants.sealed(id).prize > 0 ? 'prize' : 'fine') : null);
      const [a, b] = [graded(dishes.oatcakes), graded(dishes.fish)];
      const grade = a && b ? (a === 'prize' && b === 'prize' ? 'prize' : 'fine') : null;
      // The dish leaves the satchel before the arc moves on, so the save its step writes does not keep it (6 October 2026).
      inventory?.remove?.(dishes.oatcakes, 1); inventory?.remove?.(dishes.fish, 1);
      const result = nethereum.deliver({ grade });
      if (!result) { inventory?.add?.(dishes.oatcakes, 1); inventory?.add?.(dishes.fish, 1); return closeDialogue(); }
      openDialogue(npc, [
        'Oats off the silt, and fish out of the Neth, smoked the way they smoke it at the weir. I have not tasted that smoke since I was too small to remember tasting it. I remember it anyway.',
        ...(named ? [
          'You have something else. I can see it on you. Say it, then.',
          `${CERIDWEN}. All my life I have answered every question a moment before it was asked, and nobody ever had this one ready for me. Thank Fintan for me. No, do not. He would not know what to do with it. Thank the weir.`,
        ] : ['You stood at the Recall. You have the face of a man who has heard a great many names said once. Keep them. That is what they are for.']),
        'Here is what I promised. Quicken: once a day, one bed, ripe at once. The ground will hurry for you. Do not make a habit of hurrying it.',
        'Liban will let you the deep plots when your hands are ready for them, and Seithenyn will mind the meadow for a dish. He has earned the right to be trusted with it again. So, I think, have you.',
      ], null, 'Back to Taleth', { noWayfinding: true, ...(onComplete ? { onComplete } : {}) });
      notify?.('Quicken: once a game day, ripen the nearest sown bed at once.', 'TALETH TAUGHT YOU A FIELD WORKING');
    } }];
}
