/**
 * **Nesdor: right ground**, the third country of the Farmlands of the Lizeem (docs/lizeem-farmlands-design.md
 * 5.3, 6.5, 7.3 and 7.10; the user's design of 5 October 2026, and on 6 October 2026, "keep building
 * everything"). Registered with the hub as arc `nesdor` (`farmlands.registerArc('nesdor', arc)`).
 *
 *   `arrive`    ford the Carica and find Baugi at Ninehands, whose nine hired hands are gone
 *   `strips`    read the strips (Sound the Soil, or what grows wild on them) and sow a whole strip each of
 *               floodwheat, barley and rye on the ground that suits it; the wet strip is the trap
 *   `reap`      reap a whole strip by walking it; Bolverk's match, won or lost, and the stage passes either way
 *   `foragers`  Cedric's men from the north road and the rebellion's from the Flats come for the grain:
 *               give a quarter, bargain to a tenth with Forseti's paper, or drive them off
 *   `fine`      Fine floodwheat
 *   `carry`     white bread and a nut cake, sealed by a sworn measurer and carried to Taleth
 *   `done`      *The Work of Nine*, and Baugi's long strip offered (src/flats-ground.js `unlockLong`)
 *
 * Nesdor owes nothing in kind (design 7.3: no councils, no dues, and no protection either), so this arc
 * takes no share at harvest. What the foragers take they take once, from the strip that was reaped. The
 * rebellion's men pay in paper promises (design 7.10), `rebel-paper`, which Forseti changes for coin at a
 * loss. The experience lumps are Build 1's, each paid as its stage is left, so a reload never pays twice.
 *
 * The farm's own rules (the fit of each crop on each ground, floodwheat, the coppice, the reaping walk and
 * the long strip's lock) are src/flats-ground.js's; this module only listens: `farming.onHarvest` for what
 * comes in, `farmEvent` (the farm's `row-sown`) or `observe` for what goes in, `stripReaped` (the reaping's
 * `strip-reaped`) for the walk and the match, and `combatEvent` for the fight with the foragers.
 *
 * Pure: no DOM, no three, no world. The host walks, draws, fights and pays coin; this keeps the record.
 */
import { NESDOR_STRIPS, NESDOR_FARM_ROW_IDS, NESDOR_SEED_BENCH, nesdorStrip } from './nesdor-farm.js';
import { LONG_STRIP, nesdorFit } from './flats-ground.js';
import { TALETH } from './taleth.js';

const freeze = Object.freeze;

export const NESDOR_ARC_ID = 'nesdor';
export const NESDOR_ARC_VERSION = 1;
export const NESDOR_STAGES = freeze(['arrive', 'strips', 'reap', 'foragers', 'fine', 'carry', 'done']);
const rank = stage => NESDOR_STAGES.indexOf(stage);

/** The people of design 6.5 who hold a step, by the contract's ids (src/lizeem-nesdor-people.js stands them up). */
export const NESDOR_ROLES = freeze({ baugi: 'baugi', bolverk: 'bolverk', idunn: 'idunn', aegir: 'aegir', forseti: 'forseti' });
/** Who seals a lot on the way back (src/merchants.js, `seals`), and who takes the dishes. */
const MEASURERS = freeze(['lizeem-nepri', 'lizeem-consus']);
const TALETH_ID = TALETH.id;

/** Experience lumps as Build 1 pays them (design 4.6), each as its stage is left. */
export const NESDOR_XP = freeze({ strips: 150, reap: 200, foragers: 300, fine: 400, done: 1000 });
const PAID_LEAVING = freeze({ strips: NESDOR_XP.strips, reap: NESDOR_XP.reap, foragers: NESDOR_XP.foragers, fine: NESDOR_XP.fine, carry: NESDOR_XP.done });

/** The field working Taleth teaches for Nesdor (design 3). */
export const WORK_OF_NINE = 'work-of-nine';
/** The recipes of this arc, by the kitchen's ids (src/flats-ground.js `NESDOR_RECIPES`). */
export const NESDOR_DISHES = freeze({ bread: 'white-bread', cake: 'nut-cake' });
const RECIPE_IDS = freeze(Object.values(NESDOR_DISHES));
/** Floodwheat wants Farming 8 (the contract), so a farmer below it sows barley and rye first. */
export const FLOODWHEAT_LEVEL = 8;

// ---------------------------------------------------------------------------
// Right crop, right ground
// ---------------------------------------------------------------------------
/** The three crops of the strips, in Baugi's order, and the Measure's name for each. */
export const STRIP_CROPS = freeze(['floodwheat', 'barley', 'bridge-rye']);
const CROP_NAMES = freeze({ floodwheat: 'floodwheat', barley: 'barley', 'bridge-rye': 'bridge rye' });
const GROUNDS = freeze(['wet', 'bench', 'rise']);
/**
 * The ground each crop does best on, read from the country's own fit (src/flats-ground.js `nesdorFit`):
 * floodwheat the bench, rye the rise, and barley the middle, which is either, since neither does better
 * by it. Nothing is right on the wet.
 */
export const RIGHT_GROUND = freeze(Object.fromEntries(STRIP_CROPS.map(cropId => {
  const best = Math.max(...GROUNDS.map(ground => nesdorFit(cropId, ground)));
  return [cropId, freeze(GROUNDS.filter(ground => best > 0 && nesdorFit(cropId, ground) === best))];
})));
/** The three strips of Ninehands; the long strip is Baugi's to lend at the end, and is reaped but not taught on. */
export const NINEHANDS_STRIPS = freeze(NESDOR_STRIPS.filter(strip => strip.id !== LONG_STRIP));
const NINEHANDS_IDS = freeze(NINEHANDS_STRIPS.map(strip => strip.id));
const STRIP_IDS = freeze(NESDOR_STRIPS.map(strip => strip.id));
const NESDOR_BEDS = new Set(NESDOR_FARM_ROW_IDS);
const stripOf = bedId => NESDOR_STRIPS.find(strip => strip.beds.includes(bedId)) ?? null;

// ---------------------------------------------------------------------------
// The foragers (design 5.3 step 4 and 7.10)
// ---------------------------------------------------------------------------
export const FORAGER_ANSWERS = freeze(['give', 'bargain', 'drive']);
export const FORAGER_PARTIES = freeze(['cedric', 'rebels', 'both']);
/** A quarter given to one party; a tenth on Forseti's paper, split between both. */
export const FORAGER_SHARES = freeze({ give: 1 / 4, bargain: 1 / 10 });
/** A note promises two copper when the river is free; Forseti gives one for it now. */
export const REBEL_PAPER = 'rebel-paper';
export const PAPER = freeze({ face: 2, changed: 1 });
/** What Forseti asks for a forage contract. */
export const FORAGE_CONTRACT_FEE = 3;

/** The paper, for the satchel (spread into `INVENTORY_ITEMS`, src/inventory.js). */
export const NESDOR_ARC_ITEMS = freeze({
  [REBEL_PAPER]: freeze({ name: 'Rebellion paper', type: 'Money', icon: 'letter', stackable: true,
    brief: 'A paper promise from the rebellion on the Flats: two copper a note, when the League is free.',
    description: 'Written in a hurry on the Flats by the rebellion’s quartermaster: so much grain received, to be paid in coin when the League is free of Cedric. It is worth that much if the rebellion wins and the paper it is written on if it loses. Forseti, at the end of the Nesdor Way, will change it for one copper a note.' }),
});

/**
 * Driving them off is a fight (combat.startEncounter): three foragers who have found, for once, that
 * they agree about something. They stand east of the ground between the rise and the bench strips, and a
 * traveler who has had enough retreats north to the yard. Rebels by kind (src/combat.js): men with swords
 * who swing through a cut, without a soldier's shield or mail.
 */
export const FORAGER_FIGHT = 'nesdor-foragers';
export const FORAGER_GROUND = freeze({ x: -1590, z: 616 });
export const FORAGERS = freeze([
  freeze({ id: 'nesdor-forager-north', name: 'Cedric’s forager', party: 'cedric', role: 'town-carter', tunic: 0x8f3b30, dx: 7, dz: -3 }),
  freeze({ id: 'nesdor-forager-flats-1', name: 'Rebel forager', party: 'rebels', role: 'forest-woodcutter', tunic: 0x5d5a3a, dx: 8.5, dz: 1 }),
  freeze({ id: 'nesdor-forager-flats-2', name: 'Rebel forager', party: 'rebels', role: 'forest-woodcutter', tunic: 0x6d5b43, dx: 6, dz: 4.5 }),
]);
export const FORAGER_HP = 120;
export function foragerEncounter(center = FORAGER_GROUND) {
  const c = { x: Number(center?.x), z: Number(center?.z) };
  if (![c.x, c.z].every(Number.isFinite)) return foragerEncounter(FORAGER_GROUND);
  return { id: FORAGER_FIGHT, center: c, checkpoint: { x: c.x - 4, z: c.z - 8 }, retreatZ: c.z - 30, retreatSign: -1,
    enemies: FORAGERS.map(one => ({ id: one.id, kind: 'rebel', name: one.name, hp: FORAGER_HP, x: c.x + one.dx, z: c.z + one.dz,
      model: { role: one.role, tunic: one.tunic } })), allies: [] };
}

// ---------------------------------------------------------------------------
// The save
// ---------------------------------------------------------------------------
const fresh = () => ({
  version: NESDOR_ARC_VERSION, stage: 'arrive',
  read: [], sown: [], wet: false,
  cut: {}, racing: false, reaped: null, matches: { won: 0, lost: 0 },
  contract: false, foragers: null,
  fineWheat: false, taught: [], long: null,
});
const copy = value => JSON.parse(JSON.stringify(value));
const isObject = value => !!value && typeof value === 'object' && !Array.isArray(value);
const idList = (value, allowed) => Array.isArray(value) && value.length <= allowed.length && new Set(value).size === value.length && value.every(id => allowed.includes(id));
const count = value => Number.isSafeInteger(value) && value >= 0 && value <= 1e7;
const itemCounts = value => isObject(value) && Object.keys(value).length <= 16
  && Object.entries(value).every(([id, n]) => /^[a-z0-9][a-z0-9-]{0,63}$/.test(id) && count(n));
const MATCHES = freeze([null, 'won', 'lost']);

/**
 * Whether a saved Nesdor arc is one this module wrote. `undefined` is a save from before Nesdor, and
 * starts the arc afresh. Every step's record agrees with the stage it is at.
 */
export function validateNesdorArc(value) {
  if (value === undefined) return true;
  if (!isObject(value) || value.version !== NESDOR_ARC_VERSION || !NESDOR_STAGES.includes(value.stage)) return false;
  const at = rank(value.stage);
  if (!idList(value.read, ['soil', 'plants']) || !idList(value.sown, STRIP_CROPS) || typeof value.wet !== 'boolean') return false;
  if (!isObject(value.cut) || !Object.entries(value.cut).every(([strip, entry]) => STRIP_IDS.includes(strip) && isObject(entry)
    && idList(entry.beds, nesdorStrip(strip).beds) && itemCounts(entry.items))) return false;
  if (value.stage !== 'reap' && Object.keys(value.cut).length) return false;
  if (typeof value.racing !== 'boolean' || !isObject(value.matches) || !count(value.matches.won) || !count(value.matches.lost)) return false;
  // The reap: a strip, what came off it, and the match if one was run.
  const r = value.reaped;
  if (r !== null && (!isObject(r) || !STRIP_IDS.includes(r.strip) || !itemCounts(r.items) || !MATCHES.includes(r.match)
    || !(r.seconds === null || (Number.isFinite(r.seconds) && r.seconds >= 0 && r.seconds <= 3600)))) return false;
  if ((r !== null) !== (at > rank('reap'))) return false;
  if (r?.match === 'won' && !value.matches.won) return false;
  if (r?.match === 'lost' && !value.matches.lost) return false;
  // The foragers: an answer, whose men, what they took and what they paid in paper.
  const f = value.foragers;
  if (typeof value.contract !== 'boolean') return false;
  if (f !== null && (!isObject(f) || !FORAGER_ANSWERS.includes(f.answer) || !FORAGER_PARTIES.includes(f.party) || !count(f.taken) || !count(f.paper))) return false;
  if ((f !== null) !== (at > rank('foragers'))) return false;
  if (f) {
    if (f.answer === 'give' && !['cedric', 'rebels'].includes(f.party)) return false;
    if (f.answer !== 'give' && f.party !== 'both') return false;
    if (f.answer === 'drive' && (f.taken || f.paper)) return false;
    if (f.answer === 'bargain' && !value.contract) return false;
    if (f.paper > f.taken || (f.answer === 'give' && f.party === 'cedric' && f.paper)) return false;
  }
  if (typeof value.fineWheat !== 'boolean' || !idList(value.taught, RECIPE_IDS)) return false;
  if (![null, 'offered', 'open'].includes(value.long)) return false;
  // Each stage is reached only through the one before it.
  if (at > rank('strips') && value.sown.length !== STRIP_CROPS.length) return false;
  if (at > rank('fine') && !value.fineWheat) return false;
  if (at === rank('arrive') && (value.read.length || value.sown.length || value.wet || value.fineWheat || value.taught.length)) return false;
  // Bolverk races from the reap on, and Forseti's paper is written for the foragers.
  if (at < rank('reap') && (value.racing || value.matches.won || value.matches.lost)) return false;
  if (at < rank('foragers') && value.contract) return false;
  if ((value.long !== null) !== (value.stage === 'done')) return false;
  return true;
}

// ---------------------------------------------------------------------------
// The arc
// ---------------------------------------------------------------------------
/**
 * The arc. Every subsystem is the game's own and any may be missing in a test: `farming` (its
 * `onHarvest`, `rowState`), `flats` (src/flats-ground.js: `unlockLong`, `lockLong`), `reaping` (its
 * `match`), `skills`, `magic`, `inventory`, `cooking`, `merchants` (`sealed`) and `onEvent`.
 */
export function createNesdorArc({ farming = null, flats = null, reaping = null, skills = null, magic = null, inventory = null,
  cooking = null, merchants = null, onEvent = () => {} } = {}) {
  let state = fresh();
  let hub = null;
  /** The fight under way, and the strip the farm has just cut whole: neither is saved. */
  let fighting = false, justCut = null;
  const charged = () => (hub ? !!hub.accepted() : true);
  const level = () => Number(skills?.level?.('farming')) || 1;

  const pay = amount => {
    if (!(amount > 0)) return null;
    if (skills?.known && !skills.known('farming')) skills.learn?.('farming', { announce: false });
    return skills?.gain?.('farming', amount) ?? null;
  };
  /** One stage on, with its lump paid as the old stage is left. Never backwards. */
  function advance(to) {
    const from = state.stage;
    if (rank(to) !== rank(from) + 1) return false;
    state.stage = to;
    if (from === 'reap') state.cut = {};
    const xp = PAID_LEAVING[from] ?? 0, gained = pay(xp);
    onEvent({ type: 'lizeem-step', arc: NESDOR_ARC_ID, from, to, xp, levelled: !!gained?.levelled });
    return true;
  }
  /** A step done early is collected as soon as its stage arrives. */
  function settleAhead() {
    if (state.stage === 'strips' && state.sown.length === STRIP_CROPS.length) advance('reap');
    if (state.stage === 'fine' && state.fineWheat) advance('carry');
  }

  /** Baugi lends the strips: for nothing, since nobody on the Flats owes anybody a share. */
  function meet() {
    if (state.stage !== 'arrive' || !charged()) return false;
    onEvent({ type: 'nesdor-met', strips: [...NINEHANDS_IDS] });
    advance('strips');
    settleAhead();
    return true;
  }

  /** The strips read, by the staff (`soil`, a Sound the Soil on a Nesdor bed) or by Baugi's dock leaves (`plants`). */
  function readStrips(how, bedId = null) {
    if (!['soil', 'plants'].includes(how) || rank(state.stage) < rank('strips') || state.read.includes(how)) return false;
    if (how === 'soil' && bedId !== null && !NESDOR_BEDS.has(bedId)) return false;
    state.read.push(how);
    return true;
  }

  /**
   * What is in the strips now (the farm's `rowState`): a strip sown whole with one crop on the ground
   * that suits it is a strip sown rightly, and each crop needs one. Anything put in the wet strip is the
   * trap, and remembered so that Baugi can say so. Called on each sowing (`farmEvent`) or from a loop.
   */
  function observe(playSeconds) {
    if (!charged() || rank(state.stage) < rank('strips') || !farming?.rowState) return [];
    const added = [];
    for (const strip of NINEHANDS_STRIPS) {
      const rows = strip.beds.map(id => farming.rowState(id, playSeconds));
      const crops = rows.map(row => (row && row.stage !== 'bare' ? row.crop : null));
      if (strip.ground === 'wet' && crops.some(Boolean) && !state.wet) { state.wet = true; onEvent({ type: 'nesdor-wet-sown', strip: strip.id }); }
      const crop = crops[0];
      if (!crop || !crops.every(id => id === crop) || !RIGHT_GROUND[crop]?.includes(strip.ground) || state.sown.includes(crop)) continue;
      if (state.stage !== 'strips') continue;
      state.sown.push(crop); added.push(crop);
      onEvent({ type: 'nesdor-strip-sown', strip: strip.id, crop, sown: [...state.sown] });
    }
    settleAhead();
    return added;
  }
  /** The farm's events (src/farming.js `onEvent`): a sowing on a Nesdor bed is looked at at once. */
  function farmEvent(event) {
    if (event?.type === 'row-sown' && NESDOR_BEDS.has(event.row)) return observe();
    return [];
  }

  /**
   * A bed is reaped (the farm's `onHarvest`). Fine floodwheat is remembered from the strips onward; in the
   * reap stage every bed is gathered by its strip, and a strip cut whole is a strip reaped. Nesdor owes no
   * share, so nothing is ever taken here.
   */
  function harvest(bedId, result = {}) {
    justCut = null;
    if (!charged() || !NESDOR_BEDS.has(bedId)) return null;
    const grade = String(result.grade ?? '').toLowerCase();
    if (result.crop === 'floodwheat' && ['fine', 'prize'].includes(grade) && rank(state.stage) >= rank('strips') && !state.fineWheat) {
      state.fineWheat = true;
      onEvent({ type: 'nesdor-fine-floodwheat', grade });
    }
    if (state.stage === 'reap') {
      const strip = stripOf(bedId), produce = typeof result.produce === 'string' ? result.produce : typeof result.item === 'string' ? result.item : null;
      const n = Number.isSafeInteger(result.count) ? result.count : Number.isSafeInteger(result.grown) ? result.grown : 0;
      if (strip) {
        const entry = (state.cut[strip.id] ??= { beds: [], items: {} });
        if (!entry.beds.includes(bedId)) entry.beds.push(bedId);
        if (produce && n > 0) entry.items[produce] = (entry.items[produce] ?? 0) + n;
        if (strip.beds.every(id => entry.beds.includes(id))) { reapedStrip(strip.id, entry.items, null); justCut = strip.id; }
      }
    }
    settleAhead();
    return null;
  }
  function reapedStrip(stripId, items, seconds) {
    if (state.stage !== 'reap') return false;
    state.reaped = { strip: stripId, items: { ...items }, match: null, seconds: Number.isFinite(seconds) ? seconds : null };
    onEvent({ type: 'nesdor-strip-reaped', strip: stripId, items: { ...items } });
    advance('foragers');
    return true;
  }

  /** Bolverk's match is taken: he reaps alongside the next strip Rollo walks. */
  function takeMatch() {
    if (!charged() || rank(state.stage) < rank('reap')) return false;
    state.racing = true;
    onEvent({ type: 'nesdor-match-taken' });
    return true;
  }

  /**
   * A strip reaped by walking it (src/flats-ground.js `createReaping`, its `strip-reaped` event:
   * `{ strip, seconds, count, reaped }`). In the reap stage it passes the stage, whatever came in. If
   * Bolverk's match was taken, the reaping says who won (`reaping.match()`, or `event.won`).
   */
  function stripReaped(event = {}) {
    const stripId = event.strip ?? event.stripId ?? null;
    if (!charged() || !STRIP_IDS.includes(stripId)) return null;
    const seconds = Number.isFinite(event.seconds) ? event.seconds : null;
    let outcome = null;
    if (state.racing) {
      const won = typeof event.won === 'boolean' ? event.won : typeof reaping?.match === 'function' ? !!reaping.match() : null;
      if (won !== null) {
        outcome = won ? 'won' : 'lost';
        state.racing = false; state.matches[outcome]++;
        onEvent({ type: 'nesdor-match', outcome, seconds, strip: stripId });
      }
    }
    // The walk that passes the reap stage carries its time and its match. The farm may have cut the strip
    // whole a moment before the walk was reported (`justCut`): the stage has passed, and the walk is still its.
    const passing = state.stage === 'reap' ? reapedStrip(stripId, state.cut[stripId]?.items ?? {}, seconds) : justCut === stripId && state.reaped?.strip === stripId;
    if (passing) {
      if (seconds !== null) state.reaped.seconds = seconds;
      if (outcome && state.reaped.match === null) state.reaped.match = outcome;
    }
    justCut = null;
    return { stage: state.stage, match: outcome };
  }

  /** Forseti writes the forage contract (the fee is the host's to take). */
  function writeContract() {
    if (!charged() || state.stage !== 'foragers' || state.contract) return false;
    state.contract = true;
    onEvent({ type: 'nesdor-contract' });
    return true;
  }

  /** The grain the foragers can see: the reaped strip's, and only as much of it as the satchel still holds, plain first. */
  function takeGrain(units) {
    const items = state.reaped?.items ?? {};
    if (!inventory?.count || !inventory?.remove) return units;
    let taken = 0;
    const order = Object.keys(items).sort((a, b) => Number(a.endsWith('-fine')) - Number(b.endsWith('-fine')));
    for (const id of order) {
      if (taken >= units) break;
      const n = Math.min(units - taken, inventory.count(id));
      if (n > 0 && inventory.remove(id, n)) taken += n;
    }
    return taken;
  }
  const reapedTotal = () => Object.values(state.reaped?.items ?? {}).reduce((sum, n) => sum + n, 0);

  /**
   * The foragers answered. `give` a quarter to one `party` ('cedric' or 'rebels'); `bargain` to a tenth on
   * Forseti's paper, split between both; `drive` them off, with `startFight(encounter)` from the host to
   * start the fight (it answers whether it began), or, with none, in words. The rebellion's men pay in
   * paper, a note a measure.
   */
  function answerForagers(answer, { party = null, startFight = null } = {}) {
    if (!charged() || state.stage !== 'foragers') return { ok: false, reason: 'Nobody has come for the grain.' };
    // A fight under way is answered by the fight; a quarter given after a retreat ends it as surely.
    if (fighting && answer === 'drive') return { ok: false, reason: 'They are being driven off already.' };
    if (answer === 'give') {
      if (!['cedric', 'rebels'].includes(party)) return { ok: false, reason: 'To whose men?' };
      const claim = Math.ceil(reapedTotal() * FORAGER_SHARES.give), taken = takeGrain(claim);
      return settle({ answer, party, taken, paper: party === 'rebels' ? taken : 0 });
    }
    if (answer === 'bargain') {
      if (!state.contract) return { ok: false, reason: 'Neither lot will take your word for a tenth. Forseti’s paper they respect.' };
      const claim = Math.ceil(reapedTotal() * FORAGER_SHARES.bargain), taken = takeGrain(claim);
      return settle({ answer, party: 'both', taken, paper: taken - Math.floor(taken / 2) });
    }
    if (answer === 'drive') {
      let begun = false;
      try { begun = typeof startFight === 'function' && !!startFight(foragerEncounter()); } catch { begun = false; }
      if (begun) { fighting = true; onEvent({ type: 'nesdor-foragers-fight', encounter: FORAGER_FIGHT }); return { ok: true, fight: true }; }
      return settle({ answer, party: 'both', taken: 0, paper: 0 });
    }
    return { ok: false, reason: 'That is not an answer they will take.' };
  }
  function settle(answered) {
    if (answered.paper > 0) inventory?.add?.(REBEL_PAPER, answered.paper);
    state.foragers = { ...answered };
    fighting = false;
    onEvent({ type: 'nesdor-foragers', ...answered });
    advance('fine');
    settleAhead();
    return { ok: true, ...answered };
  }

  /**
   * The fight with the foragers, as every combat host hears it (`combatEvent(event, combat.state)`):
   * a victory drives them off; a defeat or a retreat leaves them at the strips and the choice open.
   */
  function combatEvent(event, combatState = null) {
    if (!fighting || !event) return false;
    if (combatState?.encounterId && combatState.encounterId !== FORAGER_FIGHT) return false;
    if (event.type === 'victory') { settle({ answer: 'drive', party: 'both', taken: 0, paper: 0 }); return true; }
    if (event.type === 'defeat' || event.type === 'retreat') {
      fighting = false;
      onEvent({ type: 'nesdor-foragers-stand', outcome: event.type });
      return true;
    }
    return false;
  }

  /** A recipe taught by somebody in this arc, once the kitchen has taken it. */
  function noteTaught(recipeId) {
    if (!RECIPE_IDS.includes(recipeId) || state.taught.includes(recipeId) || rank(state.stage) < rank('strips')) return false;
    state.taught.push(recipeId);
    return true;
  }

  /** The bread or cake he carries, sealed first and fine before plain; with no satchel to ask, the plain dish. */
  function carried(base) {
    if (!inventory?.count) return base;
    const held = [`${base}-fine`, base].filter(id => inventory.count(id) > 0);
    return held.find(id => isSealed(id)) ?? held[0] ?? null;
  }
  const isSealed = id => !!id && (typeof merchants?.sealed !== 'function' || merchants.sealed(id)?.count > 0);
  const gradeOf = id => (!id || !id.endsWith('-fine') ? null : merchants?.sealed?.(id)?.prize > 0 ? 'prize' : 'fine');
  /** What can be laid before Taleth: `{ bread, cake, sealed, ready }`. */
  function deliverable() {
    const bread = carried(NESDOR_DISHES.bread), cake = carried(NESDOR_DISHES.cake);
    const sealed = isSealed(bread) && isSealed(cake);
    return { bread, cake, sealed, ready: state.stage === 'carry' && !!bread && !!cake && sealed };
  }

  /**
   * The sealed bread and cake, carried to Taleth: the end of Nesdor. *The Work of Nine* is taught and
   * Baugi's long strip offered here, in the stage change, and nowhere else; the better dish is laid up in
   * the Measure when it is Fine or Prize.
   */
  function deliver() {
    const ready = deliverable();
    if (!ready.ready) return { ok: false, reason: state.stage !== 'carry' ? 'Nesdor has nothing for Taleth yet.'
      : !ready.bread || !ready.cake ? 'White bread and a nut cake, both of them.' : 'Have them sealed by a sworn measurer first.' };
    const grades = [gradeOf(ready.bread), gradeOf(ready.cake)];
    const best = grades.includes('prize') ? 'prize' : grades.includes('fine') ? 'fine' : null;
    const bestItem = best ? (grades[1] === best ? ready.cake : ready.bread) : null;
    inventory?.remove?.(ready.bread, 1); inventory?.remove?.(ready.cake, 1);
    advance('done');
    const learned = magic?.learn?.(WORK_OF_NINE) ?? null;
    const opened = offerLong();
    let measured = null;
    try { measured = best ? hub?.enter?.(bestItem, best, { country: NESDOR_ARC_ID }) ?? null : null; } catch { measured = null; }
    onEvent({ type: 'lizeem-nesdor-restored', spell: WORK_OF_NINE, learned, long: state.long });
    return { ok: true, spell: WORK_OF_NINE, learned, long: state.long, opened, measured };
  }

  /** Baugi's long strip (src/flats-ground.js `unlockLong`): offered at the end, open at Farming 24. */
  function offerLong() {
    if (state.stage !== 'done' || state.long === 'open') return null;
    let result = null;
    try { result = flats?.unlockLong?.({ level: level() }) ?? null; } catch { result = null; }
    state.long = result?.ok ? 'open' : 'offered';
    if (result?.ok) onEvent({ type: 'nesdor-long-strip', open: true });
    return result;
  }

  /** How a choice in the trouble sits with somebody: 1 warmer, -1 cooler, 0 unchanged. */
  function regard(personId) {
    const f = state.foragers;
    if (!f) return 0;
    if (personId === NESDOR_ROLES.forseti) return f.answer === 'bargain' ? 1 : 0;
    if (personId === NESDOR_ROLES.baugi || personId === NESDOR_ROLES.bolverk) return f.answer === 'drive' ? 1 : f.answer === 'give' && f.party === 'cedric' ? -1 : 0;
    if (personId === 'egil') return f.answer === 'give' ? (f.party === 'rebels' ? 1 : -1) : 0;
    return 0;
  }

  // ---- What the hub shows ------------------------------------------------------------------------
  const STEPS = [
    ['arrive', 'Ford the Carica and find Baugi at Ninehands.'],
    ['strips', 'Sow a whole strip each of floodwheat, barley and rye on the ground that suits it.'],
    ['reap', 'Reap a whole strip by walking it.'],
    ['foragers', 'Answer the foragers.'],
    ['fine', 'Bring in Fine floodwheat.'],
    ['carry', 'Bake white bread and a nut cake, have them sealed, and carry them to Taleth.'],
  ];
  const bench = () => ({ x: NESDOR_SEED_BENCH.x, z: NESDOR_SEED_BENCH.z, id: NESDOR_SEED_BENCH.id, name: 'Ninehands, on the Flats' });
  const listed = names => (names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0] ?? '');

  /** The card the hub puts on the tracker: the hub supplies the id, title, type and slate. */
  function trackableView() {
    const at = state.stage, R = NESDOR_ROLES;
    const missing = STRIP_CROPS.filter(cropId => !state.sown.includes(cropId)).map(cropId => CROP_NAMES[cropId]);
    const below = level() < FLOODWHEAT_LEVEL && !state.sown.includes('floodwheat');
    const ready = deliverable(), untaught = RECIPE_IDS.filter(id => !state.taught.includes(id));
    const by = {
      arrive: ['Walk south from Caricas, ford the Carica where it runs shallow over gravel, and follow the farm road down the valley head to Ninehands on the western Flats. Baugi farms there, and his nine hired hands are gone.', [R.baugi], null],
      strips: [`Read the strips at Ninehands, with Sound the Soil or by what grows wild on them, and sow a whole strip of each crop on the ground that suits it: floodwheat on the drained bench, barley in the middle, bridge rye on the dry rise. Nothing sown on the wet strip thrives. Still to sow: ${listed(missing)}.${below ? ` Floodwheat wants Farming ${FLOODWHEAT_LEVEL}.` : ''}`, [R.baugi], bench()],
      reap: [`Reap a whole strip at Ninehands by walking it with the scythe when it is ripe.${state.racing ? ' Bolverk has taken your match and will reap alongside you.' : ' Bolverk will make a match of it, if you ask him.'}`, [R.bolverk], null],
      foragers: [`Foragers have come to Ninehands for the grain: Cedric’s men from the north road and the rebellion’s from the Flats. Give one lot a quarter, bargain them both down to a tenth with Forseti’s paper, or drive them off. Baugi is in the yard.${state.contract ? ' You have Forseti’s paper.' : ' Forseti writes forage contracts at the end of the Way.'}`,
        state.contract ? [R.baugi] : [R.baugi, R.forseti], null],
      fine: ['Bring in floodwheat of Fine grade from the bench at Ninehands. Water it while it grows.', [R.baugi], bench()],
      carry: untaught.length ? [`Learn the Nesdor bakes: ${untaught.includes(NESDOR_DISHES.bread) ? 'Aegir at the Counted Water bakes the white bread' : ''}${untaught.length > 1 ? ', and ' : ''}${untaught.includes(NESDOR_DISHES.cake) ? 'Idunn at the valley head the nut cake' : ''}. Then bake both, have them sealed by a sworn measurer, and carry them to Taleth.`,
        [...(untaught.includes(NESDOR_DISHES.bread) ? [R.aegir] : []), ...(untaught.includes(NESDOR_DISHES.cake) ? [R.idunn] : [])], null]
        : !ready.bread || !ready.cake ? ['Bake white bread and a nut cake at a lit fire. The cake wants two hazelnuts, a floodwheat and a comb of Beyla’s honey. Then have both sealed and carry them to Taleth.', [], null]
        : !ready.sealed ? ['Have the white bread and the nut cake sealed by a sworn measurer: Nepri at the Measure House in Minora, or Consus at the Caricas grain court on the way.', [...MEASURERS], null]
        : ['Carry the sealed white bread and nut cake to Taleth at the Guild tower in Minora.', [TALETH_ID], null],
      done: [state.long === 'open' ? 'Nesdor is restored, and Baugi’s long strip is yours to work.' : 'Nesdor is restored. Baugi will lend you his long strip at Farming 24.', [], null],
    };
    const [detail, destinationIds, target] = by[at];
    return { stage: at, kicker: 'Nesdor · right ground', region: 'Nesdor', active: charged(), complete: at === 'done',
      detail, destinationIds: [...destinationIds], target,
      steps: STEPS.map(([stage, text]) => ({ text, done: rank(at) > rank(stage) })) };
  }
  /** Who wears the farmlands' mark for Nesdor now. */
  const markerIds = () => (charged() && state.stage !== 'done' ? trackableView().destinationIds : []);

  /** The journal's entry once Nesdor is done (the hub dresses it in its own shape). */
  function journal() {
    if (state.stage !== 'done') return null;
    const f = state.foragers;
    const trouble = !f ? '' : f.answer === 'drive' ? ' The foragers were driven off.'
      : f.answer === 'bargain' ? ` The foragers took a tenth between them on Forseti’s paper (${f.taken}).`
      : ` ${f.party === 'cedric' ? 'Cedric’s foragers' : 'The rebellion’s foragers'} were given a quarter (${f.taken}).`;
    const match = state.reaped?.match === 'won' ? ' Bolverk was beaten at his own match.' : state.reaped?.match === 'lost' ? ' Bolverk won the match.' : '';
    return { title: 'Nesdor: right ground', detail: `Baugi lent the strips at Ninehands, and they were sown by their ground.${match}${trouble} The white bread and the nut cake went to Taleth under seal.`,
      rewards: ['The Work of Nine', state.long === 'open' ? 'Baugi’s long strip' : 'Baugi’s long strip, at Farming 24'] };
  }

  /** The Nesdor leaf's lines, by the hub's ids (src/lizeem-farmlands.js `MEASURE_LEAVES`), with the satchel's item for each. */
  const measureLines = () => [
    { id: 'floodwheat', item: 'floodwheat', name: 'Floodwheat from the bench' },
    { id: 'rye', item: 'bridge-rye', name: 'Bridge rye from the dry rise' },
    { id: 'hazelnuts', item: 'hazelnuts', name: 'Hazelnuts from the valley head' },
    { id: 'dish', item: NESDOR_DISHES.cake, items: [NESDOR_DISHES.bread, NESDOR_DISHES.cake], name: 'White bread and nut cake' },
  ];

  /** The record, and the record put back. The long strip's lock follows it (src/flats-ground.js). */
  const snapshot = () => copy(state);
  function restore(data) {
    if (data === undefined) { state = fresh(); fighting = false; justCut = null; syncLong(); return true; }
    if (!validateNesdorArc(data)) return false;
    state = { ...fresh(), ...copy(data) };
    fighting = false; justCut = null;
    syncLong();
    return true;
  }
  function syncLong() {
    try { if (state.long === 'open') flats?.unlockLong?.(); else flats?.lockLong?.(); } catch { /* the farm's lock is the farm's */ }
  }

  // What comes in from Nesdor's beds (src/farming.js `onHarvest`): heard, never shared.
  farming?.onHarvest?.((bedId, result) => harvest(bedId, result));

  return {
    id: NESDOR_ARC_ID, validate: validateNesdorArc,
    stage: () => state.stage, charged, meet, readStrips, observe, tick: observe, farmEvent, harvest, takeMatch, stripReaped,
    writeContract, answerForagers, combatEvent, noteTaught, deliverable, deliver, offerLong, regard,
    trackableView, markerIds, journal, measureLines, snapshot, restore,
    attach(next) { hub = next ?? null; },
    measured(result) { onEvent({ type: 'nesdor-measured', ...result }); },
    get fighting() { return fighting; },
    get state() { return copy(state); },
  };
}

/**
 * Taleth's half of the Nesdor arc, for his conversation's `extraChoices` beside the hub's
 * (`talethFarmlandsChoices`): the sealed bread and cake are handed over here. `context` carries `nesdor`
 * (the arc), `openDialogue`, `closeDialogue` and, optionally, `onComplete` and `notify`.
 */
export function talethNesdorChoices(npc, context) {
  const { nesdor = null, openDialogue, closeDialogue, onComplete = null, notify = null } = context ?? {};
  if (!nesdor || nesdor.stage() !== 'carry') return [];
  const ready = nesdor.deliverable();
  if (!ready.bread || !ready.cake) return [];
  const label = 'Give Taleth the white bread and the nut cake from Nesdor';
  if (!ready.sealed) return [{ id: 'nesdor-deliver-unsealed', label, disabled: true, action: () => {},
    reason: 'A measurer’s seal first: Nepri at the Measure House, or Consus at the Caricas grain court.' }];
  return [{ id: 'nesdor-deliver', label, action: () => {
    const result = nesdor.deliver();
    if (!result?.ok) { notify?.(result?.reason ?? 'Not yet.', 'TALETH'); closeDialogue?.(); return; }
    openDialogue(npc, [
      'White bread from the Flats, and a nut cake with the valley head in it. Sealed. Nesdor has never sent the Guild anything it did not charge for, and you have brought me two.',
      'Then the strips are worked by somebody who knows which is which. Here is what I promised: the Work of Nine. A whole farm sown or reaped in one act. Bolverk will be unbearable about it, or you will. Choose.',
      result.long === 'open' ? 'Baugi sent word with the carter. The long strip is yours to work, and he expects it worked.'
        : 'Baugi has a long strip he lends to a farmer of some standing. He will tell you when you are one.',
    ], null, 'Back to Taleth', { noWayfinding: true, ...(onComplete ? { onComplete } : {}) });
    notify?.('The Work of Nine: sow or reap a whole farm in one act.', 'TALETH TAUGHT YOU A FIELD WORKING');
  } }];
}
