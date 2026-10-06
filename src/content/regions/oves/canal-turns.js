/**
 * **Sharing the water**: the Ovesos way of farming for the Farmlands of the Lizeem (docs/lizeem-farmlands-design.md
 * §4.3, §5.4 and §7.3, the design of 5 October 2026; built 6 October 2026 under the contract for Builds 4 and 5).
 *
 * The canal at Velsorten takes its water off the Lizeem at the divider, a stone with sluices at its head, and runs
 * south-west across the plain toward the Sorten. The water comes down it by turns, the oldest right first: five
 * rights, four minutes of play a turn, round and round from the first second of play. Rollo is entered in Nisaba's
 * register as the newest right (seniority 1), so his is the fifth turn of five; each step of seniority moves his turn
 * one place up the round, until at 5 his right is the oldest on the canal and his turn comes first.
 *
 * A turn gives him a measure of water to divide among his beds at the divider: 4 units at seniority 1, one more for
 * each step, 8 at 5. Each crop has a thirst, the units one planting wants: hard wheat 3, barley and madder 2, silver
 * millet 1. The fit is judged at harvest from the units the planting received: exactly its thirst is 2, one short 1,
 * and anything else 0, so a wrong measure gives a Plain crop and never kills one (design §4.4). Units above the thirst
 * leave salt in the bed, and the next crop sown there comes to nothing (fit 0) unless it is barley, which stands salt,
 * or the bed has rested bare a game day first. That crop takes the salt, and the bed is clean again after it.
 *
 * The water is not free (design §7.3): one unit of grain is owed in water dues for every ten units drawn, reckoned at
 * the Harvest Close, when the arc calls `settle`. Water drawn for silver millet is not counted: the lore makes a
 * household's millet patch exempt from seizure, so the Council takes nothing on it. Ezina's mill grinds two sheaves of
 * hard wheat into a measure of flour and keeps every sixteenth measure as her toll, until the arc waives it for Rollo.
 *
 * Pure: no DOM, no three. Time is play-seconds from the game's clock, as the farm's is.
 */
import { REST_SECONDS, farmRow, registerCrops, registerRows } from '../../../gameplay/skills/farming/farming.js';
import { OVESOS_FARM_ROWS } from './ovesos-farm.js';
import { OVESOS_CROPS, OVESOS_FOODS, OVESOS_ITEMS, OVESOS_RECIPES } from './ovesos-produce.js';

export { OVESOS_CROPS, OVESOS_FOODS, OVESOS_ITEMS, OVESOS_RECIPES };

const freeze = Object.freeze;

// The country's beds and crops join the farm when this module is first imported, at start-up and before the farm is
// drawn, so the game, the save's validator and a test all have them (registering twice is a no-op).
registerRows(OVESOS_FARM_ROWS);
registerCrops(OVESOS_CROPS);

export const OVESOS_COUNTRY = 'ovesos';
export const CANAL_VERSION = 1;
/**
 * The beds along the canal, head to tail, the oldest rights by the river: the contract's fixed ids (6 October 2026).
 * src/content/regions/oves/ovesos-farm.js gives them their places on the ground.
 */
export const CANAL_REACHES = freeze(['head', 'mid', 'tail']);
export const OVESOS_BED_IDS = freeze(CANAL_REACHES.flatMap(reach => [1, 2, 3, 4].map(n => `ovesos-${reach}-${n}`)));

/** A turn of water is four minutes of play; five rights share the canal, so a round is twenty minutes. */
export const TURN_SECONDS = 240;
export const RIGHTS = 5;
export const ROUND_SECONDS = TURN_SECONDS * RIGHTS;
export const SENIORITY_MIN = 1;
export const SENIORITY_MAX = 5;
const clampSeniority = value => Math.max(SENIORITY_MIN, Math.min(SENIORITY_MAX, Math.round(Number(value) || SENIORITY_MIN)));
/** The measure a turn gives: 4 units at seniority 1, then 5, 6, 7 and 8 at 5. */
export const measureFor = seniority => 3 + clampSeniority(seniority);

/** The units of water one planting wants. Barley stays the commons' crop and is watered on the canal like the rest. */
export const OVESOS_THIRST = freeze({ 'hard-wheat': 3, barley: 2, 'silver-millet': 1, madder: 2 });
/** Barley stands salt, so salted ground does not spoil it. */
export const SALT_TOLERANT = freeze(['barley']);
/** A bed left bare this long with salt in it has rested the salt out: a game day, the farm's own rest. */
export const SALT_REST_SECONDS = REST_SECONDS;
/** One unit of grain owed for every ten units of water drawn; millet draws none. Grain is taken plain first, the cheaper first. */
export const DUES_UNITS = 10;
export const DUES_EXEMPT = freeze(['silver-millet']);
export const DUES_GRAIN = freeze(['barley', 'hard-wheat', 'barley-fine', 'hard-wheat-fine']);
/** The most one planting may be given, so a save cannot claim a flood. */
const MOST_UNITS = 99;
/** The most a turn may be cut short or given back (`shortNext`, `restoreShort`): a whole measure at the most senior. */
const MOST_ADJUST = 8;

/**
 * The fit a planting has earned from the water it was given: exactly its thirst is 2, one unit short is 1, and
 * anything else, too little or too much, is 0. A crop that is not the canal's (carrots, beets) is 0: it comes up as it
 * would on the commons.
 */
export function fitForUnits(cropId, units) {
  const thirst = OVESOS_THIRST[cropId];
  if (thirst === undefined) return 0;
  const given = Math.max(0, Math.floor(Number(units) || 0));
  return given === thirst ? 2 : given === thirst - 1 ? 1 : 0;
}

/**
 * The other four rights on the canal, oldest first. Ziusudra's house claims a grant older than any flood and takes
 * its water first until Rollo's right outranks it; the newest of them is the tail plot Ashnan works for her landlord.
 */
export const OTHER_RIGHTS = freeze([
  freeze({ id: 'ziusudra', name: 'Ziusudra’s house' }),
  freeze({ id: 'head-farms', name: 'the head farms' }),
  freeze({ id: 'middle-farms', name: 'the middle farms' }),
  freeze({ id: 'ashnan', name: 'Ashnan’s plot' }),
]);
export const ROLLO_RIGHT = freeze({ id: 'rollo', name: 'Rollo' });

/** The round's order at a seniority: Rollo's right in its place among the other four, each with its seniority and its turn. */
export function rightsOrder(seniority = SENIORITY_MIN) {
  const order = [...OTHER_RIGHTS];
  order.splice(SENIORITY_MAX - clampSeniority(seniority), 0, ROLLO_RIGHT);
  return freeze(order.map((right, index) => freeze({ ...right, seniority: SENIORITY_MAX - index, turn: index + 1 })));
}

/**
 * The turn at a moment of play, for a right of the given seniority: whose turn it is, which of the round's five it is,
 * whether it is Rollo's, when it ends, and how long until Rollo's turn (0 while it runs).
 */
export function turnAt(playSeconds, seniority = SENIORITY_MIN) {
  const at = Math.max(0, Number(playSeconds) || 0), index = Math.floor(at / TURN_SECONDS), place = index % RIGHTS;
  const ahead = (SENIORITY_MAX - clampSeniority(seniority) - place + RIGHTS) % RIGHTS, startsAt = index * TURN_SECONDS;
  return { index, round: Math.floor(index / RIGHTS), place: place + 1, holder: rightsOrder(seniority)[place], rollo: ahead === 0,
    startsAt, endsAt: startsAt + TURN_SECONDS, endsIn: startsAt + TURN_SECONDS - at, nextAt: (index + ahead) * TURN_SECONDS, nextIn: (index + ahead) * TURN_SECONDS - at };
}

const isPlainObject = value => !!value && typeof value === 'object' && !Array.isArray(value);
const seconds = value => Number.isFinite(value) && value >= 0 && value <= 1e8;
const count = value => Number.isInteger(value) && value >= 0 && value <= 1e7;
const round = value => Math.round(value * 100) / 100;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const reachOf = bedId => farmRow(bedId)?.reach ?? /^ovesos-(head|mid|tail)-/.exec(String(bedId))?.[1] ?? null;
const REACH_WORDS = freeze({
  head: 'A plot at the head of the canal, by the river, where the oldest rights draw first.',
  mid: 'A plot halfway down the canal, among the middle rights.',
  tail: 'A plot at the dry tail of the canal, where the water comes last and the sand begins.',
});
const CROP_NAMES = freeze({ 'hard-wheat': 'Hard wheat', barley: 'Barley', 'silver-millet': 'Silver millet', madder: 'Madder' });

/**
 * A save the canal did not write is refused. Seniority is a whole step from 1 to 5; the turn whose measure is being
 * spent has begun, and no more of it is spent than a turn gives; a planting is a canal crop on a canal bed with a whole
 * number of units; salt that has not begun resting lies in a bed that is still growing the planting that laid it; a
 * turn cut short or given back is a whole number of units, never more than a measure.
 */
export function validateCanalTurns(data, { allowMissing = true, playSeconds = Infinity } = {}) {
  if (data === undefined) return allowMissing;
  if (!isPlainObject(data) || data.version !== CANAL_VERSION) return false;
  if (!Number.isInteger(data.seniority) || data.seniority < SENIORITY_MIN || data.seniority > SENIORITY_MAX) return false;
  if (data.turn !== null && !(isPlainObject(data.turn) && count(data.turn.index) && data.turn.index * TURN_SECONDS <= playSeconds
    && Number.isInteger(data.turn.used) && data.turn.used >= 1 && data.turn.used <= measureFor(SENIORITY_MAX) + MOST_ADJUST)) return false;
  if (data.adjust !== undefined && data.adjust !== null && !(isPlainObject(data.adjust) && count(data.adjust.turn)
    && Number.isInteger(data.adjust.units) && data.adjust.units !== 0 && Math.abs(data.adjust.units) <= MOST_ADJUST)) return false;
  if (!isPlainObject(data.plantings) || !Object.entries(data.plantings).every(([id, planting]) => OVESOS_BED_IDS.includes(id) && isPlainObject(planting)
    && Object.hasOwn(OVESOS_THIRST, planting.crop) && Number.isInteger(planting.units) && planting.units >= 0 && planting.units <= MOST_UNITS
    && (planting.spoiled === undefined || planting.spoiled === true))) return false;
  if (!isPlainObject(data.salt) || !Object.entries(data.salt).every(([id, since]) => OVESOS_BED_IDS.includes(id)
    && (since === null ? Object.hasOwn(data.plantings, id) : seconds(since) && since <= playSeconds))) return false;
  return count(data.drawn) && count(data.exempt) && count(data.paid);
}

/**
 * The canal, its turns, the salt in its beds and the dues on its water, and the Ovesos beds' way of farming. Without a
 * farm (a save being checked) the turns still keep their time and nothing is watered. `onEvent` hears `canal-turn` (from
 * `update`, once as each of Rollo's turns begins), `canal-allotted`, `canal-seniority`, `canal-short`, `canal-restored`
 * and `canal-dues-settled`.
 *
 * The fit is judged at harvest (`judge: 'harvest'`): the farm asks the canal each time it reads a planting, and the
 * canal answers from the units that planting has been given so far.
 */
export function createCanalTurns({ farming = null, clock = null, onEvent = () => {} } = {}) {
  /** `adjust`: one of Rollo's turns cut short (`units` above 0, withheld) or given back (below 0, added), by its index. */
  const state = { seniority: SENIORITY_MIN, turn: null, adjust: null, plantings: new Map(), salt: new Map(), drawn: 0, exempt: 0, paid: 0 };
  /** The turn last announced (`update`). Not saved: after a load the turn running is announced again. */
  let announced = null;
  const now = t => Math.max(0, Number(t === undefined && typeof clock === 'function' ? clock() : t) || 0);
  const turnNow = at => turnAt(at, state.seniority);
  const usedIn = turn => (turn.rollo && state.turn?.index === turn.index ? state.turn.used : 0);
  const measureIn = turn => Math.max(0, measureFor(state.seniority) - (state.adjust?.turn === turn.index ? state.adjust.units : 0));
  const leftIn = turn => (turn.rollo ? Math.max(0, measureIn(turn) - usedIn(turn)) : 0);
  /** Rollo's next turn that has not begun, and his turn now or else that one, as turn indices. */
  const nextIndex = at => { const turn = turnNow(at); return turn.rollo ? turn.index + RIGHTS : Math.round(turn.nextAt / TURN_SECONDS); };
  const comingIndex = at => { const turn = turnNow(at); return turn.rollo ? turn.index : Math.round(turn.nextAt / TURN_SECONDS); };
  /** Salt that has not rested out: laid in a growing planting (`null`), or bare for less than a game day. */
  const saltOn = (bedId, at) => state.salt.has(bedId) && (state.salt.get(bedId) === null || at - state.salt.get(bedId) < SALT_REST_SECONDS);
  const spoils = (bedId, cropId, at) => saltOn(bedId, at) && !SALT_TOLERANT.includes(cropId);
  const judge = planting => (planting.spoiled ? 0 : fitForUnits(planting.crop, planting.units));
  const owed = () => Math.floor(state.drawn / DUES_UNITS);

  /**
   * The fit. A planting of the crop asked about is judged from the units it has had, so the farm reads it at harvest;
   * a sowing still to come (the farm asks as it sows, and Sound the Soil asks what would do best) is promised what its
   * exact thirst would earn on that ground: 2, or 0 on salt that has not rested out, unless it is barley.
   */
  function fit(bedId, cropId, bed) {
    const planting = state.plantings.get(bedId);
    if (planting && planting.crop === cropId) return judge(planting);
    if (!Object.hasOwn(OVESOS_THIRST, cropId)) return 0;
    return spoils(bedId, cropId, now(bed?.playSeconds)) ? 0 : 2;
  }

  /** A sowing takes the salt in its bed, spoiled by it unless it is barley or the bed has rested a game day; it starts dry. */
  function onPlant(bedId, cropId) {
    const spoiled = spoils(bedId, cropId, now());
    state.salt.delete(bedId);
    if (Object.hasOwn(OVESOS_THIRST, cropId)) state.plantings.set(bedId, { crop: cropId, units: 0, ...(spoiled ? { spoiled: true } : {}) });
    else state.plantings.delete(bedId);
  }

  /** The harvest is in: its water is spent, salt it left starts resting from now, and the register says what is owed. */
  function onHarvest(bedId, result) {
    state.plantings.delete(bedId);
    if (state.salt.has(bedId) && state.salt.get(bedId) === null) state.salt.set(bedId, now());
    const due = owed();
    return due > 0 && !DUES_EXEMPT.includes(result?.crop) ? { note: `Nisaba’s register has you owing ${plural(due, 'measure')} of grain in water dues, to be paid at the Harvest Close.` } : null;
  }

  /** What Sound the Soil reads on an Ovesos bed: its place on the canal, the water its planting has had, the salt, and the turn. */
  function describe(bedId, bed) {
    const at = now(bed?.playSeconds), turn = turnNow(at), planting = state.plantings.get(bedId);
    const growing = bed?.stage && bed.stage !== 'bare' && bed.crop, name = growing ? bed.cropName ?? CROP_NAMES[bed.crop] ?? bed.crop : null;
    const thirst = growing ? OVESOS_THIRST[bed.crop] : undefined, units = planting && planting.crop === bed?.crop ? planting.units : 0;
    const water = !growing ? 'Hard wheat wants three units of the canal’s water a planting, barley and madder two, and silver millet one'
      : thirst === undefined ? `The bed is in ${String(name).toLowerCase()}, and the canal’s turns are for the grain and the madder: it takes its water from the can`
      : planting?.spoiled ? `${name} went into salted ground, and nothing the canal gives it now will bring it on`
      : `${name} is in it, and has had ${plural(units, 'unit')} of the ${thirst} it wants${units < thirst ? `: ${thirst - units} more on your turn would bring it on`
        : units === thirst ? ': exactly enough, so give it no more' : ': more than it wants, and the rest is coming up as salt'}`;
    const since = state.salt.get(bedId);
    const salt = !saltOn(bedId, at) ? ''
      : since === null ? ' There is salt coming up white at the edges of the furrows: the next crop in this bed comes to nothing unless it is barley, or the bed rests bare a game day first.'
      : ` There is salt white at the edges of the furrows: the next crop in this bed comes to nothing unless it is barley, or it rests bare about ${Math.ceil((since + SALT_REST_SECONDS - at) / 60)} more minutes.`;
    const turnLine = turn.rollo ? `It is your turn at the divider, and ${plural(leftIn(turn), 'unit')} of your measure ${leftIn(turn) === 1 ? 'is' : 'are'} left.`
      : `Your turn at the divider comes in about ${Math.ceil(turn.nextIn)} seconds.`;
    return `${REACH_WORDS[reachOf(bedId)] ?? 'A plot on the canal.'} ${water}.${salt} ${turnLine}`;
  }

  farming?.registerCountry?.(OVESOS_COUNTRY, { fit, describe, onPlant, onHarvest, judge: 'harvest' });

  /**
   * Water a growing bed from Rollo's measure, at the divider, during his turn. Every unit counts toward the dues, unless
   * the bed is in silver millet; units past the crop's thirst leave salt in the bed at once.
   */
  function allot(bedId, units, t) {
    const at = now(t), turn = turnNow(at), wanted = units;
    if (!OVESOS_BED_IDS.includes(bedId)) return { ok: false, reason: 'That bed is not on the canal.' };
    if (!Number.isInteger(wanted) || wanted < 1) return { ok: false, reason: 'The divider lets the water go in whole units, one at the least.' };
    if (!turn.rollo) return { ok: false, reason: `It is not your turn at the divider. The water is going to ${turn.holder.name} now, and yours comes in about ${Math.ceil(turn.nextIn)} seconds.`, nextIn: round(turn.nextIn) };
    const left = leftIn(turn);
    if (wanted > left) return { ok: false, reason: left ? `Only ${plural(left, 'unit')} of your measure ${left === 1 ? 'is' : 'are'} left this turn.` : 'Your measure is spent for this turn.', left };
    const row = farming?.rowState?.(bedId, at);
    if (!row) return { ok: false, reason: 'There is no farm here to water.' };
    if (row.stage === 'bare') return { ok: false, reason: 'Nothing is growing in that bed. Sow it first: water on bare ground only runs into the sand.' };
    if (row.stage === 'ripe') return { ok: false, reason: 'That bed is ripe. Take the crop in; water is wasted on it now.' };
    if (!Object.hasOwn(OVESOS_THIRST, row.crop)) return { ok: false, reason: `${row.cropName ?? row.crop} is not a canal crop. The turns are for hard wheat, barley, silver millet and madder; water it from the can.` };
    let planting = state.plantings.get(bedId);
    // A planting the canal never heard sown (a bed sown before the canal was made) starts dry.
    if (!planting || planting.crop !== row.crop) { planting = { crop: row.crop, units: 0 }; state.plantings.set(bedId, planting); }
    const total = Math.min(MOST_UNITS, planting.units + wanted), thirst = OVESOS_THIRST[row.crop];
    planting.units = total;
    if (state.turn?.index !== turn.index) state.turn = { index: turn.index, used: 0 };
    state.turn.used += wanted;
    const exempt = DUES_EXEMPT.includes(row.crop);
    if (exempt) state.exempt += wanted; else state.drawn += wanted;
    const salted = total > thirst;
    if (salted && !state.salt.has(bedId)) state.salt.set(bedId, null);
    const result = { row: bedId, crop: row.crop, units: wanted, total, thirst, fit: judge(planting), salted, exempt, left: left - wanted, owed: owed() };
    onEvent({ type: 'canal-allotted', ...result });
    return { ok: true, ...result };
  }

  /** Announces Rollo's turn once as it begins: the event, or null. Call it as the game runs. */
  function update(t) {
    const at = now(t), turn = turnNow(at);
    if (!turn.rollo || announced === turn.index) return null;
    announced = turn.index;
    const event = { type: 'canal-turn', turn: turn.index, measure: measureIn(turn), left: leftIn(turn), endsIn: round(turn.endsIn) };
    onEvent(event);
    return event;
  }

  /** A new place in the round moves a cut or a gift still to come onto Rollo's next turn in that place. */
  function changeSeniority(to) {
    const from = state.seniority, at = now();
    state.seniority = to;
    if (from !== to && state.adjust && state.adjust.turn * TURN_SECONDS > at) state.adjust = { ...state.adjust, turn: nextIndex(at) };
    if (from !== to) onEvent({ type: 'canal-seniority', seniority: to, from, measure: measureFor(to) });
    return { ok: true, seniority: to, from, measure: measureFor(to) };
  }

  /**
   * Water taken out of turn (the arc's hearing, design §5.4 step 4: Ziusudra's house lifts the head sluice in the
   * night): Rollo's next turn that has not begun comes down short by that share of its measure, half by default.
   */
  function shortNext(share = 0.5, t) {
    const part = Number(share), at = now(t), units = Math.min(MOST_ADJUST, Math.floor(measureFor(state.seniority) * part));
    if (!(part > 0 && part <= 1) || units < 1) return { ok: false, reason: 'A turn comes down short by a part of its measure: a whole unit at the least, and never more than all of it.' };
    state.adjust = { turn: nextIndex(at), units };
    onEvent({ type: 'canal-short', turn: state.adjust.turn, units });
    return { ok: true, turn: state.adjust.turn, units, startsIn: round(state.adjust.turn * TURN_SECONDS - at) };
  }
  /**
   * The Council finds for Rollo: the water taken is given back. A cut still to come, or on the turn running, is lifted;
   * one already lost comes down on top of his turn now, or else his next.
   */
  function restoreShort(t) {
    const at = now(t), cut = state.adjust;
    if (!cut || cut.units <= 0) return { ok: false, reason: 'No turn of yours has come down short.' };
    const lost = (cut.turn + 1) * TURN_SECONDS <= at;
    state.adjust = lost ? { turn: comingIndex(at), units: -cut.units } : null;
    const result = { units: cut.units, turn: lost ? state.adjust.turn : cut.turn, lost };
    onEvent({ type: 'canal-restored', ...result });
    return { ok: true, ...result };
  }
  /** One step up the register (a bought right, or the canal-warden's word). */
  function raise() {
    if (state.seniority >= SENIORITY_MAX) return { ok: false, reason: 'Your right is the oldest on the canal already. It can go no higher.', seniority: state.seniority };
    return changeSeniority(state.seniority + 1);
  }
  /** The arc's own step (its reward is seniority 4), or a right restored: a whole step from 1 to 5. */
  function setSeniority(n) {
    if (!Number.isInteger(n) || n < SENIORITY_MIN || n > SENIORITY_MAX) return { ok: false, reason: `A right’s seniority runs from ${SENIORITY_MIN} to ${SENIORITY_MAX}.`, seniority: state.seniority };
    return changeSeniority(n);
  }

  /** The dues on the register: whole measures of grain owed, the units drawn toward them, and the millet's water, which counts for nothing. */
  function dues() {
    return { owed: owed(), drawn: state.drawn, toNext: DUES_UNITS - (state.drawn % DUES_UNITS), exempt: state.exempt, paid: state.paid };
  }

  /**
   * The Harvest Close (the arc calls it): the dues are paid from the satchel in grain, plain before fine and barley
   * before hard wheat. What the satchel cannot meet stays on the register for the next Close; nothing else is taken.
   */
  function settle(bag) {
    const due = owed();
    if (!due) return { ok: true, owed: 0, paid: 0, short: 0, items: {} };
    if (typeof bag?.count !== 'function' || typeof bag.remove !== 'function') return { ok: false, reason: 'There is no satchel to pay the dues from.', owed: due, paid: 0, short: due, items: {} };
    let short = due;
    const items = {};
    for (const id of DUES_GRAIN) {
      const take = Math.min(short, Math.max(0, Math.floor(Number(bag.count(id)) || 0)));
      if (take > 0 && bag.remove(id, take)) { items[id] = take; short -= take; }
      if (!short) break;
    }
    const paid = due - short;
    record(due, paid, items);
    return { ok: short === 0, owed: due, paid, short, items,
      ...(short ? { reason: `You are ${plural(short, 'measure')} of grain short. Nisaba carries it on the register to the next Harvest Close.` } : {}) };
  }
  function record(due, paid, items) {
    state.drawn -= paid * DUES_UNITS; state.paid += paid;
    onEvent({ type: 'canal-dues-settled', owed: due, paid, short: due - paid, items });
  }
  /**
   * Dues met some other way and written off the register (the arc's Close takes the grain itself, and counts days of
   * work on the canal head against them): `measures` whole measures, never more than are owed.
   */
  function payDues(measures) {
    const due = owed(), paying = Number(measures);
    if (!Number.isInteger(paying) || paying < 1) return { ok: false, reason: 'Dues are paid in whole measures of grain.', owed: due };
    const paid = Math.min(due, paying);
    if (paid) record(due, paid, {});
    return { ok: true, owed: due, paid, short: due - paid };
  }

  /**
   * The canal at a moment of play, for the divider, the HUD and the journal: the turn and whose it is, Rollo's measure
   * this turn (`measure`, after any cut or gift) and what is left of it, the seconds to the end of the turn and to his
   * next, the round's order, the salt in every bed (`salt`), and every bed's planting, water and salt (`beds`).
   */
  function view(t) {
    const at = now(t), turn = turnNow(at);
    return { seniority: state.seniority, measure: turn.rollo ? measureIn(turn) : measureFor(state.seniority), turn: turn.index, round: turn.round, place: turn.place,
      holder: { ...turn.holder }, mine: turn.rollo, used: usedIn(turn), left: leftIn(turn), endsIn: round(turn.endsIn), nextIn: round(turn.nextIn), nextAt: turn.nextAt,
      rolloPlace: SENIORITY_MAX - state.seniority + 1, order: rightsOrder(state.seniority).map(right => ({ ...right })),
      adjust: state.adjust ? { ...state.adjust } : null,
      salt: Object.fromEntries(OVESOS_BED_IDS.map(id => [id, saltOn(id, at)])),
      beds: Object.fromEntries(OVESOS_BED_IDS.map(id => {
        const planting = state.plantings.get(id);
        return [id, { reach: reachOf(id), crop: planting?.crop ?? null, units: planting?.units ?? 0, thirst: planting ? OVESOS_THIRST[planting.crop] : null,
          fit: planting ? judge(planting) : null, salt: saltOn(id, at), ...(planting?.spoiled ? { spoiled: true } : {}) }];
      })),
      dues: dues() };
  }

  function snapshot() {
    return { version: CANAL_VERSION, seniority: state.seniority, turn: state.turn ? { index: state.turn.index, used: state.turn.used } : null,
      adjust: state.adjust ? { turn: state.adjust.turn, units: state.adjust.units } : null,
      plantings: Object.fromEntries([...state.plantings].map(([id, planting]) => [id, { crop: planting.crop, units: planting.units, ...(planting.spoiled ? { spoiled: true } : {}) }])),
      salt: Object.fromEntries([...state.salt].map(([id, since]) => [id, since === null ? null : round(since)])),
      drawn: state.drawn, exempt: state.exempt, paid: state.paid };
  }

  /** A save from before the canal (no section) is the newest right on a dry canal with nothing owed. A refused one leaves the same. */
  function restore(data) {
    state.seniority = SENIORITY_MIN; state.turn = null; state.adjust = null; state.plantings.clear(); state.salt.clear(); state.drawn = 0; state.exempt = 0; state.paid = 0;
    announced = null;
    if (data === undefined) return true;
    if (!validateCanalTurns(data, { allowMissing: false })) return false;
    state.seniority = data.seniority; state.turn = data.turn ? { index: data.turn.index, used: data.turn.used } : null;
    state.adjust = data.adjust ? { turn: data.adjust.turn, units: data.adjust.units } : null;
    for (const [id, planting] of Object.entries(data.plantings)) state.plantings.set(id, { crop: planting.crop, units: planting.units, ...(planting.spoiled ? { spoiled: true } : {}) });
    for (const [id, since] of Object.entries(data.salt)) state.salt.set(id, since);
    state.drawn = data.drawn; state.exempt = data.exempt; state.paid = data.paid;
    return true;
  }

  return { allot, update, raise, setSeniority, shortNext, restoreShort, dues, settle, payDues, view, state: view, snapshot, restore, fit, describe,
    seniority: () => state.seniority, measure: () => measureFor(state.seniority), salted: (bedId, t) => saltOn(bedId, now(t)),
    turn: t => { const turn = turnNow(now(t)); return { ...turn, holder: { ...turn.holder }, measure: turn.rollo ? measureIn(turn) : measureFor(state.seniority), used: usedIn(turn), left: leftIn(turn) }; } };
}

// ---------------------------------------------------------------------------
// Ezina's mill on the canal
// ---------------------------------------------------------------------------

export const MILL_VERSION = 1;
/** Two sheaves make a measure of flour, and every sixteenth measure is the miller's (design §6.6: "grinds for a sixteenth"). */
export const MILL_GRAIN = 2;
export const MILL_TOLL = 16;
/** What the mill grinds, and what it gives: Fine hard wheat grinds into the fine flour the fine flatbread wants. */
export const MILL_FLOUR = freeze({ 'hard-wheat': 'hard-wheat-flour', 'hard-wheat-fine': 'hard-wheat-flour-fine' });

export function validateMill(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  return isPlainObject(data) && data.version === MILL_VERSION && count(data.milled) && count(data.tolls)
    && data.tolls <= Math.floor(data.milled / MILL_TOLL) && typeof data.waived === 'boolean';
}

/**
 * The mill keeps a count of the flour it has ground for Rollo, and the toll is every sixteenth measure of it, however
 * the grinding is split: two sheaves at a time pay the same as thirty-two at once. Once the arc waives the toll
 * (`tollWaived(true)`, or `waiveToll()`), Ezina keeps nothing. `onEvent` hears `mill-ground` and `mill-toll-waived`.
 * `inventory`, if given, is the satchel the contract's `grind(item, count)` grinds from.
 */
export function createMill({ clock = null, inventory = null, onEvent = () => {} } = {}) {
  const state = { milled: 0, tolls: 0, waived: false };
  const now = () => Math.max(0, Number(typeof clock === 'function' ? clock() : 0) || 0);

  /**
   * Grind `count` sheaves of hard wheat (all the satchel holds, if not given) into flour; an odd sheaf stays in the
   * satchel. Called as `grind(inventory, count, { item })`, or as the contract has it, `grind(item, count)`, from the
   * mill's own satchel; `item` is `hard-wheat` or `hard-wheat-fine`.
   */
  function grind(first, wanted, options = {}) {
    const named = typeof first === 'string', bag = named ? options.inventory ?? inventory : first ?? inventory, item = named ? first : options.item ?? 'hard-wheat';
    const flourId = MILL_FLOUR[item];
    if (!flourId) return { ok: false, reason: 'Ezina grinds hard wheat at this mill, and nothing else.' };
    if (typeof bag?.count !== 'function' || typeof bag.remove !== 'function' || typeof bag.add !== 'function') return { ok: false, reason: 'There is no satchel to grind from.' };
    const have = Math.max(0, Math.floor(Number(bag.count(item)) || 0)), asked = wanted === undefined ? have : Number(wanted);
    if (!Number.isInteger(asked) || asked < MILL_GRAIN) return { ok: false, reason: 'Two sheaves of hard wheat make a measure of flour. Bring two at the least.' };
    if (asked > have) return { ok: false, reason: `You have ${have} ${have === 1 ? 'sheaf' : 'sheaves'} of that wheat, not ${asked}.` };
    const grain = asked - (asked % MILL_GRAIN), made = grain / MILL_GRAIN;
    const toll = state.waived ? 0 : Math.floor((state.milled + made) / MILL_TOLL) - Math.floor(state.milled / MILL_TOLL), flour = made - toll;
    // The flour goes in before the wheat comes out, so a full satchel loses nothing.
    if (flour > 0 && !bag.add(flourId, flour)) return { ok: false, reason: 'There is no room for the flour in your satchel. Ezina hands the wheat back.' };
    if (!bag.remove(item, grain)) { if (flour > 0) bag.remove(flourId, flour); return { ok: false, reason: 'The wheat could not be taken from the satchel. Nothing was ground.' }; }
    state.milled += made; state.tolls += toll;
    const result = { item: flourId, grain, made, toll, flour, quantity: flour, waived: state.waived, at: now() };
    onEvent({ type: 'mill-ground', ...result });
    return { ok: true, ...result };
  }

  /** The arc's reward: from now on the mill keeps nothing of Rollo's. Returns whether this call waived it. */
  function waiveToll() {
    if (state.waived) return { ok: true, first: false };
    state.waived = true;
    onEvent({ type: 'mill-toll-waived' });
    return { ok: true, first: true };
  }

  /** Whether the toll is waived; `tollWaived(true)` waives it, as `waiveToll` does. */
  function tollWaived(value) {
    if (value === true) waiveToll();
    return state.waived;
  }

  function view() {
    return { milled: state.milled, tolls: state.tolls, waived: state.waived, toNextToll: state.waived ? null : MILL_TOLL - (state.milled % MILL_TOLL) };
  }

  function snapshot() { return { version: MILL_VERSION, milled: state.milled, tolls: state.tolls, waived: state.waived }; }
  function restore(data) {
    state.milled = 0; state.tolls = 0; state.waived = false;
    if (data === undefined) return true;
    if (!validateMill(data, { allowMissing: false })) return false;
    state.milled = data.milled; state.tolls = data.tolls; state.waived = data.waived;
    return true;
  }

  return { grind, waiveToll, tollWaived, view, state: view, snapshot, restore };
}
