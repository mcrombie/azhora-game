/**
 * The flood meadow at Haethom: timing the water, Nethereum's way of farming (docs/lizeem-farmlands-design.md
 * §4.3 and §5.2, the design of 5 October 2026; built 6 October 2026 under the contract for Builds 2 and 3).
 *
 * Rollo mends the hatch in the levee with two planks and a piece of ironwork, opens it, and the north-east
 * thread goes out over the meadow. The water goes in black (Blackwater, three minutes of play), the silt
 * settles and shines (Siltshine, four minutes), and then the frogs start (Frogcall), and the ground sours for
 * as long as the water is left on it. The lore's own names for the phases of spring. Drawn off at the shine,
 * the meadow and the deep plots are left fine silt; drawn off early, thin; left to the frogs, sour.
 *
 * What the silt does is the country's fit (`farming.registerCountry('nethereum')`): flood oats come up best on
 * fine silt and worst on sour or unflooded ground. The meadow grows its own hay after every draw-off; cutting it
 * is the harvest, and a farmer of level 10 has a second cut off a bed left bare for five minutes after the first.
 * The silt feeds one sowing: a crop sown in it takes it, and the next wants the meadow drowned again.
 *
 * The weir on the Neth and Airmid's harvest basket are here too, as the rest of what Nethereum adds to the
 * farm. Pure: no DOM, no three. Time is play-seconds from the game's clock, as the farm's is.
 */
import { registerCrops, registerRows } from './farming.js';
import { GAME_DAY_SECONDS, gameDay } from './merchants.js';
import { NETHEREUM_COUNTRY, NETHEREUM_DEEP_ROWS, NETHEREUM_FARM_ROWS, NETHEREUM_MEADOW_ROWS } from './nethereum-farm.js';
import { NETHEREUM_CROPS, NETHEREUM_FOODS, NETHEREUM_ITEMS, NETHEREUM_RECIPES } from './nethereum-produce.js';

export { NETHEREUM_CROPS, NETHEREUM_FOODS, NETHEREUM_ITEMS, NETHEREUM_RECIPES };

const freeze = Object.freeze;

// The country's beds and crops join the farm when this module is first imported, at start-up and before the
// farm is drawn, so the game, the save's validator and a test all have them (registering twice is a no-op).
registerRows(NETHEREUM_FARM_ROWS);
registerCrops(NETHEREUM_CROPS);

export const MEADOW_VERSION = 1;
export const MEADOW_PHASES = freeze(['dry', 'blackwater', 'siltshine', 'frogcall']);
export const BLACKWATER_SECONDS = 180;
export const SILTSHINE_SECONDS = 240;
const NEXT_PHASE = freeze({ blackwater: 'siltshine', siltshine: 'frogcall' });
/** What drawing the water off at each phase leaves on the beds, and the fit flood oats have on it. */
export const SILT_KINDS = freeze(['fine', 'thin', 'sour']);
export const SILT_LEFT = freeze({ blackwater: 'thin', siltshine: 'fine', frogcall: 'sour' });
export const SILT_FIT = freeze({ fine: 2, thin: 1, sour: 0 });
/** The second cut: the aftermath comes up on a bed left bare this long after the first cut, for a farmer of this level. */
export const SECOND_CUT_SECONDS = 300;
export const SECOND_CUT_LEVEL = 10;
/** Mending the hatch: two planks of any sawn kind, cheapest first, and one piece of ironwork. */
export const HATCH_STATES = freeze(['broken', 'mended']);
export const HATCH_PLANKS = 2;
export const PLANK_ITEMS = freeze(['pine-plank', 'oak-plank', 'walnut-plank']);
export const HATCH_IRONWORK = 1;
export const IRONWORK_ITEMS = freeze(['salvaged-metal']);
export const MEADOW_BED_IDS = freeze(NETHEREUM_MEADOW_ROWS.map(row => row.id));
export const DEEP_BED_IDS = freeze(NETHEREUM_DEEP_ROWS.map(row => row.id));
const SILTED_BED_IDS = freeze([...MEADOW_BED_IDS, ...DEEP_BED_IDS]);
/** The meadow's own sowings are a working of sorts: the farm's per-bed notice stays quiet, and the host shows `meadow-drawn`. */
export const MEADOW_WORKING = 'meadow-water';
export const HARVEST_BASKET = 'harvest-basket';
/** Below the line (design §6.4, Liban): the richest ground in the hollow, which the water takes one planting in five. */
export const DEEP_TAKE_ODDS = 5;

const isPlainObject = value => !!value && typeof value === 'object' && !Array.isArray(value);
const seconds = value => Number.isFinite(value) && value >= 0 && value <= 1e8;
const round = value => Math.round(value * 100) / 100;

/** The water on the meadow at a moment of play, from when the hatch was opened (null: it is shut). */
export function meadowPhase(openedAt, playSeconds) {
  if (openedAt === null || openedAt === undefined) return 'dry';
  const elapsed = Math.max(0, (Number(playSeconds) || 0) - openedAt);
  return elapsed < BLACKWATER_SECONDS ? 'blackwater' : elapsed < BLACKWATER_SECONDS + SILTSHINE_SECONDS ? 'siltshine' : 'frogcall';
}

/**
 * Whether the water takes a planting in the deep plots. Seeded from the bed and the whole second it was sown
 * in, as the fox's regard is (src/farming.js), so it is the same every time and a test can name one each way.
 */
export function waterTakes(bedId, sownAt) {
  let hash = 0x811c9dc5;
  for (const char of `deep:${bedId}@${Math.floor(Math.max(0, Number(sownAt) || 0))}`) hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193) >>> 0;
  return hash % DEEP_TAKE_ODDS === 0;
}

/**
 * A save the meadow did not write is refused. The hatch never breaks again once mended, so water on the
 * meadow, a draw-off or silt on a bed all mean a mended hatch; the silt names only the meadow and deep beds,
 * a first cut waiting on its aftermath is a meadow bed, and a bed is not both waiting and growing its aftermath.
 */
export function validateMeadowWater(data, { allowMissing = true, playSeconds = Infinity } = {}) {
  if (data === undefined) return allowMissing;
  if (!isPlainObject(data) || data.version !== MEADOW_VERSION || !HATCH_STATES.includes(data.hatch)) return false;
  const mended = data.hatch === 'mended';
  if (data.openedAt !== null && !(mended && seconds(data.openedAt) && data.openedAt <= playSeconds)) return false;
  if (!Number.isInteger(data.drawn) || data.drawn < 0 || data.drawn > 1e6 || (data.drawn > 0 && !mended)) return false;
  if (data.last === null ? data.drawn > 0 : !(data.drawn > 0 && isPlainObject(data.last) && seconds(data.last.at) && data.last.at <= playSeconds && SILT_KINDS.includes(data.last.silt))) return false;
  if (!isPlainObject(data.silt) || !Object.entries(data.silt).every(([id, kind]) => SILTED_BED_IDS.includes(id) && SILT_KINDS.includes(kind))) return false;
  if (Object.keys(data.silt).length && !data.drawn) return false;
  if (!isPlainObject(data.cuts) || !Object.entries(data.cuts).every(([id, at]) => MEADOW_BED_IDS.includes(id) && seconds(at) && at <= playSeconds)) return false;
  return Array.isArray(data.aftermath) && new Set(data.aftermath).size === data.aftermath.length
    && data.aftermath.every(id => MEADOW_BED_IDS.includes(id) && !Object.hasOwn(data.cuts, id));
}

/**
 * The meadow, its hatch and the Nethereum beds' way of farming. `skills` (for the Farming level of the second
 * cut) and `inventory` (for mending and the harvest basket) are optional: without skills the farm's own level is
 * read, and without a satchel `mendHatch` takes one and the basket does nothing. Without a farm (a save being
 * checked) the water still keeps its time and its silt, and nothing is sown. `onEvent` hears `meadow-mended`,
 * `meadow-opened`, `meadow-drawn` (with the silt and the beds the hay came up on), `meadow-aftermath`,
 * `deep-plot-drowned` and `basket-extra`.
 */
export function createMeadowWater({ farming = null, clock = null, skills = null, inventory = null, onEvent = () => {} } = {}) {
  const state = { hatch: 'broken', openedAt: null, drawn: 0, last: null, silt: new Map(), cuts: new Map(), aftermath: new Set() };
  /** The bed whose aftermath is being sown this moment, so the fit can tell the second cut from the first. */
  let sowingAftermath = null;
  const now = playSeconds => Math.max(0, Number(playSeconds === undefined && typeof clock === 'function' ? clock() : playSeconds) || 0);
  const level = at => skills?.level?.('farming') ?? farming?.view?.(at)?.level ?? 1;
  const phaseAt = at => meadowPhase(state.openedAt, at);
  const isDeep = id => DEEP_BED_IDS.includes(id);
  const siltOf = id => state.silt.get(id) ?? null;

  /**
   * The fit: nothing sown under water comes to anything. On the silt, flood oats take its fit (2 fine, 1 thin,
   * 0 sour or none), and the deep plots' richer ground makes thin silt as good as fine. Any other crop is helped
   * a step less (fine silt 1). The hay's first cut takes the silt's fit; its second cut is Good at best: a fit
   * of 1 at most, and none for a farmer of level 20, whose level alone counts two points (src/farming.js).
   */
  function fit(bedId, cropId, bed) {
    const at = now(bed?.playSeconds);
    if (phaseAt(at) !== 'dry') return 0;
    const silt = siltOf(bedId), base = silt ? SILT_FIT[silt] : 0;
    if (cropId === 'meadow-hay') return sowingAftermath === bedId ? Math.max(0, Math.min(1, base) - (level(at) >= 20 ? 1 : 0)) : base;
    const ground = isDeep(bedId) && silt === 'thin' ? 2 : base;
    return cropId === 'flood-oats' ? ground : ground >= 2 ? 1 : 0;
  }

  /** A sown crop takes the silt it was sown in (sour ground stays sour), and the aftermath no longer waits on that bed. */
  function onPlant(bedId, cropId) {
    if (cropId === 'meadow-hay') return;
    state.cuts.delete(bedId); state.aftermath.delete(bedId);
    if (siltOf(bedId) !== 'sour') state.silt.delete(bedId);
  }

  /**
   * A first cut of hay starts the aftermath's five minutes (not under water); the second cut is the last off that
   * draw-off. In the deep plots, one planting in five the water comes up and takes everything.
   */
  function onHarvest(bedId, result) {
    const at = now();
    if (result.crop === 'meadow-hay' && MEADOW_BED_IDS.includes(bedId) && !state.aftermath.delete(bedId) && phaseAt(at) === 'dry') state.cuts.set(bedId, at);
    if (!isDeep(bedId)) return null;
    const sownAt = farming?.rowState?.(bedId, at)?.sownAt;
    if (!Number.isFinite(sownAt) || !waterTakes(bedId, sownAt) || !(result.count > 0)) return null;
    onEvent({ type: 'deep-plot-drowned', row: bedId, crop: result.crop, lost: result.count });
    return { taken: result.count, note: 'The water came up over the deep plots and took the crop. Liban says it does, one year in five.' };
  }

  /** What Sound the Soil reads on a Nethereum bed: the water's phase, the silt, and what the bed is doing. */
  function describe(bedId, bed) {
    const at = now(bed?.playSeconds), phase = phaseAt(at), silt = siltOf(bedId), opened = state.openedAt ?? at;
    const until = Math.ceil(Math.max(0, opened + (phase === 'blackwater' ? BLACKWATER_SECONDS : BLACKWATER_SECONDS + SILTSHINE_SECONDS) - at));
    const water = phase === 'blackwater' ? `Blackwater: the water is on the meadow and still dark, and drawn off now it leaves a thin silt; the silt shines in about ${until} seconds`
      : phase === 'siltshine' ? `Siltshine: the silt shines under the water, and drawn off now it leaves fine ground; the frogs start in about ${until} seconds`
      : phase === 'frogcall' ? 'Frogcall: the frogs are calling and the water is souring the ground for as long as it is left on'
      : state.hatch === 'mended' ? 'The water is off the meadow and the hatch is shut' : 'The meadow is dry, and its hatch is broken';
    const ground = phase !== 'dry' ? 'nothing sown under water comes to anything'
      : silt === 'fine' ? 'this bed has fine silt from the last draw-off, and flood oats would do best in it'
      : silt === 'thin' ? (isDeep(bedId) ? 'this bed has a thin silt, and the deep ground makes up the rest, so flood oats would do well in it' : 'this bed has a thin silt, and flood oats will come up in it, but not well')
      : silt === 'sour' ? 'the ground here is sour, and nothing does well in it until the meadow is drowned and drawn off in time'
      : 'there is no fresh silt here: drown the meadow and draw it off at the shine before sowing oats';
    const growing = bed?.crop === 'meadow-hay' ? (state.aftermath.has(bedId) ? 'the aftermath is coming up, the second cut' : 'the meadow’s own hay is coming up through the silt; cut it when it is ripe')
      : bed?.crop && bed.stage !== 'bare' ? `it is in ${String(bed.cropName ?? bed.crop).toLowerCase()} now`
      : state.cuts.has(bedId) ? `the hay is cut, and left bare the aftermath comes up in about ${Math.ceil(Math.max(0, state.cuts.get(bedId) + SECOND_CUT_SECONDS - at))} seconds for a second cut, to a farmer of level ${SECOND_CUT_LEVEL}` : '';
    const deep = isDeep(bedId) ? ' Below the line: the richest ground in the hollow, and one planting in five the water takes.' : '';
    return `${water}. ${ground[0].toUpperCase()}${ground.slice(1)}${growing ? `; ${growing}` : ''}.${deep}`;
  }

  farming?.registerCountry?.(NETHEREUM_COUNTRY, { fit, describe, onPlant, onHarvest });

  /**
   * Airmid's basket: one more of every harvest while it is carried. The farm adds it (`added`, src/farming.js
   * `onHarvest`; settled at integration, 6 October 2026), so the harvest's count says so and a full satchel adds nothing.
   */
  const unhook = inventory && farming?.onHarvest ? farming.onHarvest((bedId, result) => {
    if (!((inventory.count?.(HARVEST_BASKET) ?? 0) > 0) || !(result.count > 0)) return null;
    onEvent({ type: 'basket-extra', row: bedId, item: result.produce });
    return { added: 1, note: 'The harvest basket held one more.' };
  }) : () => false;

  /** A first cut whose five minutes are up comes up again, as the aftermath, sown at the moment it was due. */
  function update(playSeconds) {
    const at = now(playSeconds), sown = [];
    if (!farming?.sow) return sown;
    for (const id of [...state.aftermath]) if (farming.rowState(id, at)?.crop !== 'meadow-hay') state.aftermath.delete(id);
    for (const [id, cutAt] of [...state.cuts]) {
      const due = cutAt + SECOND_CUT_SECONDS;
      if (at < due) continue;
      state.cuts.delete(id);
      if (phaseAt(due) !== 'dry' || level(at) < SECOND_CUT_LEVEL || farming.rowState(id, at)?.stage !== 'bare') continue;
      sowingAftermath = id;
      let result = null;
      try { result = farming.sow(id, 'meadow-hay', due, { free: true, working: MEADOW_WORKING }); } finally { sowingAftermath = null; }
      if (result?.ok) { state.aftermath.add(id); sown.push(id); }
    }
    if (sown.length) onEvent({ type: 'meadow-aftermath', rows: sown });
    return sown;
  }

  /** Two planks and a piece of ironwork, from the satchel given or the meadow's own. Nothing is taken unless all of it is there. */
  function mendHatch({ inventory: bag = inventory } = {}) {
    if (state.hatch === 'mended') return { ok: false, reason: 'The hatch is sound already.' };
    const planks = PLANK_ITEMS.reduce((sum, id) => sum + (bag?.count?.(id) ?? 0), 0);
    const iron = IRONWORK_ITEMS.find(id => (bag?.count?.(id) ?? 0) >= HATCH_IRONWORK) ?? null;
    const lacking = [...(planks < HATCH_PLANKS ? ['planks'] : []), ...(iron ? [] : ['ironwork'])];
    if (lacking.length) return { ok: false, lacking, reason: `The hatch wants ${HATCH_PLANKS} planks and a piece of ironwork, salvaged metal will do; you are short of ${lacking.join(' and ')}.` };
    const used = [];
    let wanted = HATCH_PLANKS;
    for (const id of PLANK_ITEMS) {
      const take = Math.min(wanted, bag.count(id));
      if (take > 0 && bag.remove(id, take)) { used.push([id, take]); wanted -= take; }
    }
    if (wanted > 0 || !bag.remove(iron, HATCH_IRONWORK)) {
      for (const [id, count] of used) bag.add(id, count);
      return { ok: false, reason: 'The planks and the ironwork could not be used. Nothing was taken.' };
    }
    used.push([iron, HATCH_IRONWORK]);
    state.hatch = 'mended';
    onEvent({ type: 'meadow-mended', used: Object.fromEntries(used) });
    return { ok: true, used: Object.fromEntries(used) };
  }

  /** Open the hatch: the meadow and the deep plots go under, and any aftermath waiting on a cut bed is drowned with them. */
  function openHatch(playSeconds) {
    const at = now(playSeconds);
    update(at);
    if (state.hatch !== 'mended') return { ok: false, reason: 'The hatch is broken. It wants two planks and a piece of ironwork before it will hold water or let it go.' };
    if (state.openedAt !== null) return { ok: false, reason: 'The hatch is open already, and the water is on the meadow.', phase: phaseAt(at) };
    state.openedAt = at; state.cuts.clear();
    onEvent({ type: 'meadow-opened', at });
    return { ok: true, phase: 'blackwater', at, siltshineAt: at + BLACKWATER_SECONDS, frogcallAt: at + BLACKWATER_SECONDS + SILTSHINE_SECONDS };
  }

  /** Draw the water off: every meadow and deep bed takes the silt of the moment, and the meadow's bare beds grow hay. */
  function drawOff(playSeconds) {
    const at = now(playSeconds);
    update(at);
    const phase = phaseAt(at);
    if (phase === 'dry') return { ok: false, reason: state.hatch === 'mended' ? 'There is no water on the meadow to draw off. Open the hatch first.' : 'The meadow is dry, and its hatch is broken.' };
    const silt = SILT_LEFT[phase];
    state.openedAt = null; state.drawn++; state.last = { at, silt }; state.cuts.clear();
    for (const id of SILTED_BED_IDS) state.silt.set(id, silt);
    const hay = MEADOW_BED_IDS.filter(id => farming?.rowState?.(id, at)?.stage === 'bare' && farming.sow(id, 'meadow-hay', at, { free: true, working: MEADOW_WORKING }).ok);
    const result = { phase, silt, fit: SILT_FIT[silt], at, hay, beds: [...SILTED_BED_IDS] };
    onEvent({ type: 'meadow-drawn', ...result });
    return { ok: true, ...result };
  }

  /** The meadow at a moment of play, for the arc, the scenery's water and the journal. Pure: `state` settles any aftermath first. */
  function view(playSeconds) {
    const at = now(playSeconds), phase = phaseAt(at), elapsed = state.openedAt === null ? 0 : Math.max(0, at - state.openedAt);
    const left = phase === 'blackwater' ? BLACKWATER_SECONDS - elapsed : phase === 'siltshine' ? BLACKWATER_SECONDS + SILTSHINE_SECONDS - elapsed : 0;
    return { hatch: state.hatch, mended: state.hatch === 'mended', phase, open: phase !== 'dry', openedAt: state.openedAt, elapsed: round(elapsed), left: round(left),
      next: NEXT_PHASE[phase] ?? null, drawsTo: SILT_LEFT[phase] ?? null, drawn: state.drawn, last: state.last ? { ...state.last } : null,
      silt: Object.fromEntries(SILTED_BED_IDS.map(id => [id, siltOf(id) ?? 'dry'])), aftermath: [...state.aftermath],
      cuts: Object.fromEntries([...state.cuts].map(([id, cutAt]) => [id, { cutAt, due: cutAt + SECOND_CUT_SECONDS, left: round(Math.max(0, cutAt + SECOND_CUT_SECONDS - at)) }])) };
  }

  function snapshot() {
    return { version: MEADOW_VERSION, hatch: state.hatch, openedAt: state.openedAt === null ? null : round(state.openedAt), drawn: state.drawn,
      last: state.last ? { at: round(state.last.at), silt: state.last.silt } : null, silt: Object.fromEntries(state.silt),
      cuts: Object.fromEntries([...state.cuts].map(([id, at]) => [id, round(at)])), aftermath: [...state.aftermath] };
  }

  /** A save from before the meadow (no section) is a broken hatch and a dry meadow. A refused one leaves the same. */
  function restore(data) {
    state.hatch = 'broken'; state.openedAt = null; state.drawn = 0; state.last = null; state.silt.clear(); state.cuts.clear(); state.aftermath.clear();
    if (data === undefined) return true;
    if (!validateMeadowWater(data, { allowMissing: false })) return false;
    state.hatch = data.hatch; state.openedAt = data.openedAt; state.drawn = data.drawn; state.last = data.last ? { ...data.last } : null;
    for (const [id, kind] of Object.entries(data.silt)) state.silt.set(id, kind);
    for (const [id, at] of Object.entries(data.cuts)) state.cuts.set(id, at);
    for (const id of data.aftermath) state.aftermath.add(id);
    return true;
  }

  return { openHatch, drawOff, mendHatch, update, view, snapshot, restore, fit, describe,
    state: playSeconds => { update(playSeconds); return view(playSeconds); },
    phase: playSeconds => phaseAt(now(playSeconds)), silt: id => siltOf(id) ?? 'dry',
    dispose: () => unhook(), get hatch() { return state.hatch; }, get mended() { return state.hatch === 'mended'; } };
}

// ---------------------------------------------------------------------------
// Gwyddno's weir on the Neth
// ---------------------------------------------------------------------------

export const WEIR_VERSION = 1;
export const WEIR_CATCH = 3;
export const WEIR_SKILLED_CATCH = 5;
export const WEIR_SKILLED_LEVEL = 5;
/**
 * The trap fills overnight. Taken before noon the catch is fresh and comes in fine; after noon it has sat in
 * the trap half the day. One second of play is a game minute, and play begins at six in the morning
 * (src/merchants.js), so a game day runs from midnight and noon is 720 seconds into it.
 */
export const WEIR_FRESH_SECONDS = 720;
const DAWN = 360;
const intoDay = at => DAWN + at - gameDay(at) * GAME_DAY_SECONDS;
export const weirFresh = playSeconds => intoDay(Math.max(0, Number(playSeconds) || 0)) < WEIR_FRESH_SECONDS;

export function validateWeir(data, { allowMissing = true, playSeconds = Infinity } = {}) {
  if (data === undefined) return allowMissing;
  if (!isPlainObject(data) || data.version !== WEIR_VERSION) return false;
  if (!Number.isInteger(data.takes) || data.takes < 0 || data.takes > 1e6) return false;
  if (data.day === null) return data.takes === 0;
  return Number.isInteger(data.day) && data.day >= 0 && data.takes > 0 && (playSeconds === Infinity || data.day <= gameDay(playSeconds));
}

/**
 * The weir gives its catch once a game day: three weir fish, five to a traveler of Fishing 5. With a satchel,
 * `take` puts the fish in it, and a satchel too full to hold them leaves them in the trap for later the same day.
 */
export function createWeir({ clock = null, skills = null, inventory = null, onEvent = () => {} } = {}) {
  const state = { day: null, takes: 0 };
  const now = playSeconds => Math.max(0, Number(playSeconds === undefined && typeof clock === 'function' ? clock() : playSeconds) || 0);
  const size = () => ((skills?.level?.('fishing') ?? 1) >= WEIR_SKILLED_LEVEL ? WEIR_SKILLED_CATCH : WEIR_CATCH);

  function view(playSeconds) {
    const at = now(playSeconds), day = gameDay(at), fresh = weirFresh(at);
    return { ready: state.day !== day, day, fresh, count: size(), item: fresh ? 'weir-fish-fine' : 'weir-fish', takes: state.takes,
      nextIn: state.day === day ? GAME_DAY_SECONDS - intoDay(at) : 0 };
  }

  function take(playSeconds, { inventory: bag = inventory } = {}) {
    const here = view(playSeconds);
    if (!here.ready) return { ok: false, reason: 'The trap is empty. It fills again overnight.', nextIn: here.nextIn };
    if (bag?.add && !bag.add(here.item, here.count)) return { ok: false, reason: 'There is no room for the catch in your satchel. It is still in the trap.' };
    state.day = here.day; state.takes++;
    onEvent({ type: 'weir-taken', item: here.item, count: here.count, fine: here.fresh });
    return { ok: true, item: here.item, count: here.count, quantity: here.count, fine: here.fresh, day: here.day };
  }

  function snapshot() { return { version: WEIR_VERSION, day: state.day, takes: state.takes }; }
  function restore(data) {
    state.day = null; state.takes = 0;
    if (data === undefined) return true;
    if (!validateWeir(data, { allowMissing: false })) return false;
    state.day = data.day; state.takes = data.takes;
    return true;
  }

  return { take, view, state: view, snapshot, restore };
}
