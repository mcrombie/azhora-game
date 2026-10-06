/**
 * **Ovesos: the shared water**, the fourth country of the Farmlands of the Lizeem (docs/lizeem-farmlands-design.md
 * 5.4, 6.6, 7.3 and 7.4; the user's design of 5 October 2026, his ruling the same day that Ovesos is a river kingdom
 * fertile along the water and drying toward the desert, and on 6 October 2026, "keep building everything"). Built
 * 6 October 2026 under the contract for Builds 4 and 5. Registered with the hub as arc `ovesos`.
 *
 * Velsorten is the village on the terrace above the Lizeem, and its canal runs from the divider at the head, by the
 * river, south-west to a dry tail. Water comes down it by turns, the oldest right first, and the first question in
 * Ovesos is always who was here first and what the document says. The arc, in order:
 *
 *   `arrive`   ford the Neth and reach Velsorten; Nisaba enters Rollo in the register as the most junior right on the
 *              canal, with a dry plot at the tail (`canal.setSeniority(1)`)
 *   `register` hear Enbilulu, the canal-warden, on how the water is shared
 *   `turns`    take the first turn at the tail: barley and silver millet sown there, the turn's measure divided among
 *              them, and salt learned (heard from Enbilulu, or seen in a bed given more than its thirst)
 *   `canal`    clear the canal head with Enbilulu (three stretches, one between turns), and a full barley harvest
 *              (Good or better: a Plain crop is a thin one); the Council moves Rollo up a turn (`canal.raise()`)
 *   `wheat`    sow hard wheat
 *   `hearing`  Ziusudra's house takes water out of turn, and Rollo's next turn comes down short by half. Before the
 *              Water Council he argues from Nisaba's register (wins outright: up a turn), from Ashnan's witness (wins,
 *              and the half turn is given back; her standing costs her a season's dues, which Rollo may pay), or
 *              settles quietly (40 copper, and nothing but peace)
 *   `fine`     Fine hard wheat
 *   `mill`     hard wheat ground at Ezina's mill, for her sixteenth
 *   `carry`    flatbread, sealed by Nepri or Consus, carried to Taleth (`talethOvesosChoices`)
 *   `done`     a senior right (`canal.setSeniority(4)`: his turn second in the round, after only Ziusudra's house),
 *              the mill's toll waived for him (`mill.waiveToll()`), and his name read by Nisaba at the next Harvest Close
 *
 * **The Harvest Close** (design 7.3): `close()` settles the water dues the canal has reckoned (`canal.dues()`) from
 * the satchel, barley before hard wheat and plain before fine; millet pays nothing, as the lore exempts household
 * millet from seizure. A day's work on the cleared head is written in the warden's book against the dues, a measure
 * a day. **The plots**: the tail is Rollo's once he is entered; the middle reach opens at seniority 3 and the head,
 * by the river, only at 5, which is a right bought from Nisaba (`canSow`), and she sells one only at Farming 28.
 *
 * The canal's turns, measure, thirst, salt and dues are src/canal-turns.js's (`createCanalTurns`), and so is Ezina's
 * mill (`createMill`). The canal keeps no short turn, so Ziusudra's draw is the arc's: `allot` holds that one turn to
 * half its measure, and the host's divider should allot through the arc. This module keeps the story and reads the
 * canal as it stands. Experience lumps are Build 1's, each paid as its stage is left, so a reload never pays twice.
 * Pure: no DOM, no three, no world.
 */
import { farmRow } from './farming.js';
import { gameDay } from './merchants.js';
import { pay, purse } from './economy.js';
import { TALETH_ID } from './lizeem-farmlands.js';
import { OVESOS_FARM_ROWS, OVESOS_SEED_BENCHES, OVESOS_SITES } from './ovesos-farm.js';

const freeze = Object.freeze;

export const OVESOS_ARC_ID = 'ovesos';
export const OVESOS_ARC_VERSION = 1;
export const OVESOS_STAGES = freeze(['arrive', 'register', 'turns', 'canal', 'wheat', 'hearing', 'fine', 'mill', 'carry', 'done']);
const rank = stage => OVESOS_STAGES.indexOf(stage);

/** The people of design 6.6 who hold a step (src/lizeem-ovesos-people.js stands them up). King Melos is never placed. */
export const OVESOS_ROLES = freeze({ enbilulu: 'enbilulu', nisaba: 'nisaba', ziusudra: 'ziusudra', ashnan: 'ashnan', ezina: 'ezina' });
/** Who seals a lot on the way back (src/merchants.js, `seals`): there is no sworn measurer in Ovesos. */
const MEASURERS = freeze(['lizeem-nepri', 'lizeem-consus']);

/**
 * Experience lumps as Build 1 pays them (design 4.6: about 150, 200, 300, 400 and 1,000), each as its stage is left:
 * the first turn taken, the head cleared and the barley in, the hearing answered, the Fine wheat, and the bread in
 * Taleth's hands.
 */
export const OVESOS_XP = freeze({ turns: 150, canal: 200, hearing: 300, fine: 400, done: 1000 });
const PAID_LEAVING = freeze({ turns: OVESOS_XP.turns, canal: OVESOS_XP.canal, hearing: OVESOS_XP.hearing, fine: OVESOS_XP.fine, carry: OVESOS_XP.done });

/** The canal's beds by reach (src/ovesos-farm.js; the contract for Builds 4 and 5: ids fixed), the oldest rights by the river. */
export const REACHES = freeze(['head', 'mid', 'tail']);
export const OVESOS_BEDS_BY_REACH = freeze(Object.fromEntries(REACHES.map(reach => [reach, freeze(OVESOS_FARM_ROWS.filter(row => row.reach === reach).map(row => row.id))])));
export const OVESOS_BEDS = freeze(REACHES.flatMap(reach => OVESOS_BEDS_BY_REACH[reach]));
export const TAIL_BEDS = OVESOS_BEDS_BY_REACH.tail;
const reachOf = bedId => REACHES.find(reach => OVESOS_BEDS_BY_REACH[reach].includes(bedId)) ?? (farmRow(bedId)?.country === OVESOS_ARC_ID ? farmRow(bedId)?.reach ?? null : null);
/** Where the tracker points: the register house, the divider, Ezina's mill, and the tail's seed bench by Rollo's plot. */
const SITES = freeze({ register: OVESOS_SITES.register, divider: OVESOS_SITES.divider, mill: OVESOS_SITES.mill,
  tail: OVESOS_SEED_BENCHES.find(bench => bench.farmId === 'velsorten-tail') ?? OVESOS_SITES.canalTail });
const isOvesosBed = bedId => reachOf(bedId) !== null;
/**
 * The seniority a reach opens at (6 October 2026, this module's rule): the tail to anybody entered, the middle to the
 * third right on the canal by seniority, the head by the river only to the fifth, the oldest. The arc's reward is
 * seniority 4, so the head is a right bought from Nisaba.
 */
export const REACH_SENIORITY = freeze({ tail: 1, mid: 3, head: 5 });
/** Rollo's seniority on the canal, the most junior first (the contract: 1 to 5), and the reward's. */
export const SENIORITY = freeze({ least: 1, most: 5, reward: 4 });

/** The crops of the turns, and the hard wheat after; and the level hard wheat wants (the contract). */
export const OVESOS_CROPS = freeze({ barley: 'barley', millet: 'silver-millet', wheat: 'hard-wheat', madder: 'madder' });
const SOWN_CROPS = freeze([OVESOS_CROPS.barley, OVESOS_CROPS.millet, OVESOS_CROPS.wheat]);
export const HARD_WHEAT_LEVEL = 10;
/** The recipes of this arc, by the kitchen's ids: Ezina's flatbread and Ashnan's millet porridge. */
export const OVESOS_DISHES = freeze({ flatbread: 'flatbread', porridge: 'millet-porridge' });
const RECIPE_IDS = freeze(Object.values(OVESOS_DISHES));
/** The flour the mill makes of hard wheat (the contract: two wheat to one flour, a sixteenth kept). */
export const FLOUR = 'hard-wheat-flour';

/** The canal head is cleared in three stretches, one between turns (a turn comes every 240 play-seconds). */
export const HEAD_STRETCHES = 3;
export const TURN_SECONDS = 240;
/** Five rights share the canal (src/canal-turns.js `RIGHTS`), so Rollo's turn comes round every fifth. */
const RIGHTS = 5;
/** The most days of work on the head the warden's book carries against the dues. */
export const MOST_CREDIT = 30;

/** The hearing (design 5.4 step 4): the three answers, and what the quiet one costs. */
export const HEARING_ANSWERS = freeze(['register', 'witness', 'settle']);
export const SETTLE_COPPER = 40;
/** A season's dues for a tenant at the tail, which the Council calls in from Ashnan if she witnesses. */
export const ASHNAN_DUES = 30;
/** Nisaba sells a right outright (the contract): a turn nearer the divider, to the fifth. */
export const WATER_RIGHT_PRICE = 1500;
/** The Farming level at which Nisaba will sell one (design 4.6: "28: a senior water right can be bought outright"; the integration, 6 October 2026). */
export const WATER_RIGHT_LEVEL = 28;

const GRADES = freeze(['plain', 'good', 'fine', 'prize']);
const FULL_GRADES = freeze(['good', 'fine', 'prize']);
const FINE_GRADES = freeze(['fine', 'prize']);
const gradeOf = value => (typeof value === 'string' && GRADES.includes(value.toLowerCase()) ? value.toLowerCase() : null);
const baseOf = id => (typeof id === 'string' ? id.replace(/-(fine|prize)$/, '') : '');

// ---------------------------------------------------------------------------
// The save
// ---------------------------------------------------------------------------
const fresh = () => ({
  version: OVESOS_ARC_VERSION, stage: 'arrive',
  lesson: false, salt: false, allotted: false, sown: [],
  head: 0, worked: null, credit: 0, fullBarley: false,
  consulted: [], hearing: null, short: null, ashnan: null,
  fineWheat: false, milled: false, taught: [],
  named: null, closes: 0, duesPaid: 0, rights: 0,
});
const copy = value => JSON.parse(JSON.stringify(value));
const isObject = value => !!value && typeof value === 'object' && !Array.isArray(value);
const onlyKeys = (value, keys) => Object.keys(value).every(key => keys.includes(key)) && keys.every(key => Object.hasOwn(value, key));
const idList = (value, allowed) => Array.isArray(value) && value.length <= allowed.length && new Set(value).size === value.length && value.every(id => allowed.includes(id));
const count = value => Number.isSafeInteger(value) && value >= 0 && value <= 1e7;
const playTime = value => Number.isFinite(value) && value >= 0 && value <= 1e8;
const STATE_KEYS = freeze(Object.keys(fresh()));
const BOOLEANS = freeze(['lesson', 'salt', 'allotted', 'fullBarley', 'fineWheat', 'milled']);

/**
 * Whether a saved Ovesos arc is one this module wrote. `undefined` is a save from before Ovesos, and starts the arc
 * afresh. Every step's record agrees with the stage it is at, so a save cannot claim a reward it did not earn.
 */
export function validateOvesosArc(value) {
  if (value === undefined) return true;
  if (!isObject(value) || value.version !== OVESOS_ARC_VERSION || !OVESOS_STAGES.includes(value.stage)) return false;
  if (!onlyKeys(value, STATE_KEYS) || !BOOLEANS.every(key => typeof value[key] === 'boolean')) return false;
  if (!idList(value.sown, SOWN_CROPS) || !idList(value.consulted, ['register', 'witness']) || !idList(value.taught, RECIPE_IDS)) return false;
  if (!(Number.isSafeInteger(value.head) && value.head >= 0 && value.head <= HEAD_STRETCHES)) return false;
  if (!(value.worked === null || playTime(value.worked)) || !(Number.isSafeInteger(value.credit) && value.credit >= 0 && value.credit <= MOST_CREDIT)) return false;
  if (value.hearing !== null && (!isObject(value.hearing) || !onlyKeys(value.hearing, ['answer']) || !HEARING_ANSWERS.includes(value.hearing.answer))) return false;
  if (![null, 'owed', 'paid'].includes(value.ashnan) || ![null, 'due', 'read'].includes(value.named)) return false;
  if (!count(value.closes) || !count(value.duesPaid) || !(Number.isSafeInteger(value.rights) && value.rights >= 0 && value.rights <= SENIORITY.most - SENIORITY.least)) return false;
  const at = rank(value.stage);
  // Nothing is learned, sown or bought before Nisaba has written him in.
  if (at < rank('register') && (value.lesson || value.salt || value.allotted || value.sown.length || value.taught.length || value.rights || value.closes || value.duesPaid)) return false;
  if (at > rank('register') && !value.lesson) return false;
  // The first turn: barley and millet at the tail, a turn's water divided, and salt known.
  if (at > rank('turns') && !(value.allotted && value.salt && value.sown.includes(OVESOS_CROPS.barley) && value.sown.includes(OVESOS_CROPS.millet))) return false;
  // The canal head and the full barley count from the turns on; the head is worked only from the canal stage.
  if (value.fullBarley && at < rank('turns')) return false;
  if ((value.head > 0 || value.worked !== null) && at < rank('canal')) return false;
  if (value.credit > 0 && value.head < HEAD_STRETCHES) return false;
  if (at > rank('canal') && !(value.head === HEAD_STRETCHES && value.fullBarley)) return false;
  if (value.sown.includes(OVESOS_CROPS.wheat) && at < rank('turns')) return false;
  if (at > rank('wheat') && !value.sown.includes(OVESOS_CROPS.wheat)) return false;
  // The hearing: what was looked into is looked into at the hearing, and its answer is what the fine stage begins with.
  if (value.consulted.length && at < rank('hearing')) return false;
  if ((value.hearing !== null) !== (at > rank('hearing'))) return false;
  const answer = value.hearing?.answer ?? null;
  if (answer === 'register' && !value.consulted.includes('register')) return false;
  if (answer === 'witness' && !value.consulted.includes('witness')) return false;
  if ((value.ashnan !== null) !== (answer === 'witness')) return false;
  // The half turn Ziusudra's house drew: a turn of the round, from the hearing on, and given back by a win.
  if (value.short !== null && (!count(value.short) || at < rank('hearing') || ['register', 'witness'].includes(answer))) return false;
  if (value.fineWheat && at < rank('wheat')) return false;
  if (at > rank('fine') && !value.fineWheat) return false;
  if (value.milled !== (at > rank('mill'))) return false;
  // His name is read at a Close only once Ovesos is restored.
  if ((value.named !== null) !== (value.stage === 'done')) return false;
  return true;
}

// ---------------------------------------------------------------------------
// The arc
// ---------------------------------------------------------------------------
/**
 * The arc. Every subsystem is the game's own and any may be missing in a test: `farming` (its `onHarvest` and
 * `rowState`), `canal` (src/canal-turns.js `createCanalTurns`), `mill` (Ezina's, src/canal-turns.js `createMill`),
 * `skills`, `magic`, `inventory`, `merchants` (`sealed`), and `clock`, the play clock in seconds.
 */
export function createOvesosArc({ farming = null, canal = null, mill = null, skills = null, magic = null, inventory = null,
  merchants = null, clock = null, onEvent = () => {} } = {}) {
  let state = fresh(), hub = null, lastTick = null;
  const now = at => Math.max(0, Number(Number.isFinite(at) ? at : typeof clock === 'function' ? clock() : 0) || 0);
  /** Taleth's charge: the hub says, once the arc is registered; an arc on its own (a test) is always under way. */
  const accepted = () => (hub ? !!hub.accepted?.() : true);
  const level = () => Number(skills?.level?.('farming')) || 1;
  /** The canal and the mill, asked only through this, so one that lacks a call is passed over. */
  const ask = (system, name, ...args) => { try { return typeof system?.[name] === 'function' ? system[name](...args) : undefined; } catch { return undefined; } };
  const seniority = () => { const n = Number(ask(canal, 'seniority')); return Number.isSafeInteger(n) ? n : state.stage === 'arrive' ? 0 : SENIORITY.least; };
  const canalView = at => { const view = ask(canal, 'view', now(at)); return isObject(view) ? view : null; };
  /** The canal's turn at a moment (src/canal-turns.js `turn`): its index in the round, whether it is Rollo's, and what he has used of it. */
  const turnOf = at => { const turn = ask(canal, 'turn', now(at)); return isObject(turn) ? turn : null; };

  const earnXp = amount => {
    if (!(amount > 0)) return null;
    if (skills?.known && !skills.known('farming')) skills.learn?.('farming', { announce: false });
    return skills?.gain?.('farming', amount) ?? null;
  };
  /** One stage on, with its lump paid as the old stage is left. Never backwards, never twice. */
  function advance(to) {
    const from = state.stage;
    if (rank(to) !== rank(from) + 1) return false;
    state.stage = to;
    const xp = PAID_LEAVING[from] ?? 0, gained = earnXp(xp);
    onEvent({ type: 'lizeem-step', arc: OVESOS_ARC_ID, from, to, xp, levelled: !!gained?.levelled });
    if (to === 'wheat') raise('canal');
    if (to === 'hearing') trouble();
    return true;
  }
  /** Up a turn on the canal, to the fifth at most. */
  function raise(why) {
    if (seniority() >= SENIORITY.most) return false;
    const before = seniority();
    ask(canal, 'raise');
    onEvent({ type: 'ovesos-raised', why, seniority: seniority(), from: before });
    return true;
  }
  /**
   * Ziusudra's house draws the water out of turn, and Rollo's next turn comes down short by half. The canal keeps no
   * such thing, so the arc does: the turn of the round that is short, which `allot` holds to half its measure.
   */
  function trouble(at) {
    const turn = turnOf(at);
    if (turn) state.short = turn.rollo ? turn.index + RIGHTS : Math.round(turn.nextAt / TURN_SECONDS);
    onEvent({ type: 'ovesos-out-of-turn', turn: state.short, note: 'Ziusudra’s house lifted the head sluice in the night, out of turn. Your next turn will come down half a measure short.' });
  }
  /** What of a turn Rollo may draw: the whole measure, or, on the turn Ziusudra's house drew from, the half it left. */
  function allowance(turn) {
    const measure = Number(ask(canal, 'measure')) || 0;
    return state.short !== null && turn?.index === state.short ? measure - Math.floor(measure / 2) : measure;
  }

  /**
   * What the plots and the canal say now, read into the story: what is sown at the tail (and hard wheat anywhere on
   * the canal), salt seen in a bed, and any step done early collected as its stage arrives.
   */
  function observe(at) {
    if (!accepted() || rank(state.stage) < rank('register')) return;
    if (farming?.rowState) for (const bedId of OVESOS_BEDS) {
      const row = farming.rowState(bedId, at);
      if (!row || row.stage === 'bare' || !SOWN_CROPS.includes(row.crop) || state.sown.includes(row.crop)) continue;
      // The first turn is the tail's; hard wheat counts on any plot of his, once the turns are taken.
      if (row.crop === OVESOS_CROPS.wheat ? rank(state.stage) >= rank('turns') : TAIL_BEDS.includes(bedId)) state.sown.push(row.crop);
    }
    if (!state.salt && rank(state.stage) >= rank('turns') && saltyBeds(at).length) {
      state.salt = true;
      onEvent({ type: 'ovesos-salt-seen', note: 'A white crust has come up on a bed you gave more than its thirst. That is salt.' });
    }
    settle();
  }
  function settle() {
    if (!accepted()) return;
    const has = crop => state.sown.includes(crop);
    if (state.stage === 'turns' && state.allotted && state.salt && has(OVESOS_CROPS.barley) && has(OVESOS_CROPS.millet)) advance('canal');
    if (state.stage === 'canal' && state.head >= HEAD_STRETCHES && state.fullBarley) advance('wheat');
    if (state.stage === 'wheat' && has(OVESOS_CROPS.wheat)) advance('hearing');
    if (state.stage === 'fine' && state.fineWheat) advance('mill');
  }
  /** The beds the canal says have salt in them now (src/canal-turns.js `salted`). */
  const saltyBeds = at => (typeof canal?.salted === 'function' ? OVESOS_BEDS.filter(bedId => !!ask(canal, 'salted', bedId, now(at))) : []);

  /** Nisaba writes him in: the most junior right on the canal, and the dry plot at the tail. */
  function enter() {
    if (!accepted() || state.stage !== 'arrive') return false;
    ask(canal, 'setSeniority', SENIORITY.least);
    onEvent({ type: 'ovesos-entered', seniority: SENIORITY.least, beds: [...TAIL_BEDS] });
    advance('register');
    observe();
    return true;
  }
  /** Enbilulu on sharing the water: turns, the measure, the thirst of each crop. */
  function learnTurns() {
    if (!accepted() || rank(state.stage) < rank('register')) return false;
    const first = !state.lesson;
    state.lesson = true;
    if (state.stage === 'register') advance('turns');
    observe();
    return first;
  }
  /** Salt, heard from Enbilulu or Ashnan: what water beyond the thirst leaves behind. */
  function learnSalt() {
    if (!accepted() || rank(state.stage) < rank('register')) return false;
    const first = !state.salt;
    state.salt = true;
    observe();
    return first;
  }

  /**
   * A share of a turn given to a bed (src/canal-turns.js `allot`), through the arc so the story hears it. A turn
   * taken at the tail is the first step of the turns.
   */
  function allot(bedId, units, at) {
    if (!canal?.allot) return { ok: false, reason: 'There is no canal here.' };
    const turn = turnOf(at), allowed = allowance(turn), wanted = Number(units);
    if (turn?.rollo && state.short === turn.index && Number.isInteger(wanted) && (turn.used ?? 0) + wanted > allowed)
      return { ok: false, short: true, left: Math.max(0, allowed - (turn.used ?? 0)),
        reason: `Ziusudra’s house drew half this turn in the night. ${allowed} ${allowed === 1 ? 'unit' : 'units'} came down to the tail${turn.used ? ', and you have had what there was' : ''}.` };
    const result = ask(canal, 'allot', bedId, units, now(at));
    if (result?.ok) noteAllotted(bedId);
    observe(at);
    return result ?? { ok: false, reason: 'The canal did not answer.' };
  }
  function noteAllotted(bedId) {
    if (!accepted() || rank(state.stage) < rank('register') || !isOvesosBed(bedId)) return false;
    if (!state.allotted && TAIL_BEDS.includes(bedId)) { state.allotted = true; onEvent({ type: 'ovesos-first-turn', bed: bedId }); }
    return true;
  }
  /** The canal's and the farm's events, if the host passes them on: an allotment, or a sowing on the canal. */
  function hear(event) {
    const type = typeof event?.type === 'string' ? event.type : '';
    const bedId = event?.bed ?? event?.bedId ?? event?.row ?? null;
    if (/allot/.test(type) && event.ok !== false) noteAllotted(bedId);
    if (type === 'row-sown' || /salt|allot|turn/.test(type)) observe();
  }

  /**
   * A bed is reaped (the farm's `onHarvest`). On the canal, barley of Good or better is a full harvest and hard wheat
   * of Fine or better is the Fine wheat. Ovesos takes no share at harvest: the dues are reckoned at the Close.
   */
  function harvest(bedId, result = {}) {
    if (!accepted() || !isOvesosBed(bedId)) return null;
    const crop = result.crop ?? baseOf(result.item), grade = gradeOf(result.grade) ?? 'plain';
    if (crop === OVESOS_CROPS.barley && FULL_GRADES.includes(grade) && rank(state.stage) >= rank('turns')) state.fullBarley = true;
    if (crop === OVESOS_CROPS.wheat && FINE_GRADES.includes(grade) && rank(state.stage) >= rank('wheat') && !state.fineWheat) {
      state.fineWheat = true;
      onEvent({ type: 'ovesos-fine-wheat', grade });
    }
    settle();
    return null;
  }

  /**
   * A turn of work on the canal head with Enbilulu. Before the head is clear, a stretch of it, once between turns
   * (the channel is dry at the head only then); afterwards, once a game day, a day written in the warden's book
   * against the dues.
   */
  function workHead(at) {
    const t = now(at);
    if (!accepted() || rank(state.stage) < rank('canal')) return { ok: false, reason: 'Enbilulu has not asked you to dig anything. Yet.' };
    if (state.head < HEAD_STRETCHES) {
      if (state.worked !== null && Math.floor(state.worked / TURN_SECONDS) === Math.floor(t / TURN_SECONDS))
        return { ok: false, reason: 'The water is running at the head. Nobody digs in running water twice. Come back between turns.' };
      state.head++; state.worked = t;
      const cleared = state.head === HEAD_STRETCHES;
      onEvent({ type: 'ovesos-head-work', stretch: state.head, cleared });
      settle();
      return { ok: true, stretch: state.head, cleared };
    }
    if (state.worked !== null && gameDay(state.worked) === gameDay(t)) return { ok: false, reason: 'You have had your turn on the head today. Come back tomorrow.' };
    state.worked = t; state.credit = Math.min(MOST_CREDIT, state.credit + 1);
    onEvent({ type: 'ovesos-head-work', credit: state.credit });
    return { ok: true, credit: state.credit };
  }

  // ---- The hearing --------------------------------------------------------------------------------
  /** Looking into the draw before the Council: Nisaba's register, or what Ashnan saw. */
  function consult(source) {
    if (!accepted() || state.stage !== 'hearing' || !['register', 'witness'].includes(source)) return false;
    if (state.consulted.includes(source)) return false;
    state.consulted.push(source);
    return true;
  }
  /** Which answers the Council will hear now: the register and the witness once looked into, and the quiet one always. */
  function hearingOptions() {
    const open = state.stage === 'hearing' && accepted();
    return {
      register: open && state.consulted.includes('register'),
      witness: open && state.consulted.includes('witness'),
      settle: open && (!inventory?.count || purse(inventory) >= SETTLE_COPPER),
    };
  }
  /**
   * The draw answered before the Water Council. `register` wins outright, and the Council writes Rollo up a turn;
   * `witness` wins, the half turn is given back, and Ashnan owes a season's dues; `settle` costs 40 copper and wins
   * nothing but peace.
   */
  function answerHearing(answer) {
    if (!accepted() || state.stage !== 'hearing') return { ok: false, reason: 'There is nothing before the Council of yours.' };
    if (!HEARING_ANSWERS.includes(answer)) return { ok: false, reason: 'The Council hears the register, a witness, or nothing.' };
    if (answer === 'register' && !state.consulted.includes('register')) return { ok: false, reason: 'Ask Nisaba what the register says first. In Ovesos nobody argues from a document he has not read.' };
    if (answer === 'witness' && !state.consulted.includes('witness')) return { ok: false, reason: 'Nobody has said they saw anything. Ask at the tail.' };
    if (answer === 'settle') {
      if (inventory?.count && purse(inventory) < SETTLE_COPPER) return { ok: false, reason: `Forty copper, and you have ${purse(inventory)}.` };
      if (inventory?.remove && !pay(inventory, SETTLE_COPPER)) return { ok: false, reason: 'Your purse is lighter than it looks.' };
    }
    state.hearing = { answer };
    if (answer === 'witness') state.ashnan = 'owed';
    // A win gives the half turn back, if it has not come down yet; settled quietly, the water stays drawn.
    if (answer !== 'settle') state.short = null;
    const raised = answer === 'register' ? raise('hearing') : false;
    onEvent({ type: 'ovesos-hearing', answer, raised, seniority: seniority() });
    advance('fine');
    settle();
    return { ok: true, answer, raised, seniority: seniority() };
  }
  /** Ashnan's season's dues, called in because she witnessed: Rollo may pay them for her. */
  function payAshnan() {
    if (state.ashnan !== 'owed') return { ok: false, reason: state.ashnan === 'paid' ? 'They are paid. She knows who paid them.' : 'Ashnan owes the Council nothing on your account.' };
    if (inventory?.count && purse(inventory) < ASHNAN_DUES) return { ok: false, reason: `A season’s dues is ${ASHNAN_DUES} copper, and you have ${purse(inventory)}.` };
    if (inventory?.remove && !pay(inventory, ASHNAN_DUES)) return { ok: false, reason: 'Your purse is lighter than it looks.' };
    state.ashnan = 'paid';
    onEvent({ type: 'ovesos-ashnan-paid', copper: ASHNAN_DUES });
    return { ok: true, copper: ASHNAN_DUES };
  }

  // ---- The mill, the bread and Taleth -------------------------------------------------------------
  /** Hard wheat ground at Ezina's mill (src/canal-turns.js `createMill`, `grind`): at the mill stage, the step is done. */
  function grind(itemId, units) {
    const result = mill?.grind ? ask(mill, 'grind', inventory, units, { item: itemId }) : { ok: false, reason: 'There is no mill here.' };
    if (result?.ok && baseOf(itemId) === OVESOS_CROPS.wheat && state.stage === 'mill' && accepted()) {
      state.milled = true;
      advance('carry');
      onEvent({ type: 'ovesos-milled', item: itemId });
    }
    return result ?? { ok: false, reason: 'The mill did not answer.' };
  }

  /** A recipe taught by somebody in this arc, once the kitchen has taken it. */
  function noteTaught(recipeId) {
    if (!RECIPE_IDS.includes(recipeId) || state.taught.includes(recipeId) || rank(state.stage) < rank('register')) return false;
    state.taught.push(recipeId);
    return true;
  }

  /** The flatbread he carries, sealed first and fine before plain; with no satchel to ask, the plain bread. */
  function carried() {
    if (!inventory?.count) return OVESOS_DISHES.flatbread;
    const held = [`${OVESOS_DISHES.flatbread}-fine`, OVESOS_DISHES.flatbread].filter(id => inventory.count(id) > 0);
    return held.find(id => isSealed(id)) ?? held[0] ?? null;
  }
  const isSealed = id => !!id && (typeof merchants?.sealed !== 'function' || merchants.sealed(id)?.count > 0);
  const breadGrade = id => (!id || !id.endsWith('-fine') ? null : merchants?.sealed?.(id)?.prize > 0 ? 'prize' : 'fine');
  /** What can be laid before Taleth: `{ bread, sealed, ready }`. */
  function deliverable() {
    const bread = carried(), sealed = isSealed(bread);
    return { bread, sealed, ready: state.stage === 'carry' && accepted() && !!bread && sealed };
  }

  /**
   * The sealed flatbread in Taleth's hands: the end of Ovesos. The senior right and the waived toll are given here,
   * in the stage change, and nowhere else; his name is read at the next Harvest Close. A Fine loaf is laid up in the
   * Measure as well, through the hub.
   */
  function deliver() {
    const ready = deliverable();
    if (!ready.ready) return { ok: false, reason: state.stage !== 'carry' ? 'Ovesos has nothing for Taleth yet.'
      : !ready.bread ? 'Flatbread, from the Sorten’s wheat.' : 'Have it sealed by a sworn measurer first.' };
    const grade = breadGrade(ready.bread);
    inventory?.remove?.(ready.bread, 1);
    advance('done');
    state.named = 'due';
    const before = seniority();
    if (before < SENIORITY.reward) ask(canal, 'setSeniority', SENIORITY.reward);
    ask(mill, 'waiveToll');
    let measured = null;
    try { measured = grade ? hub?.enter?.(OVESOS_DISHES.flatbread, grade, { country: OVESOS_ARC_ID }) ?? null : null; } catch { measured = null; }
    onEvent({ type: 'lizeem-ovesos-restored', seniority: seniority(), toll: 'waived' });
    return { ok: true, seniority: seniority(), toll: 'waived', measured };
  }

  // ---- The Close and the register ------------------------------------------------------------------
  /** What the canal says is owed in water dues, as whole measures of grain (src/canal-turns.js `dues`). */
  const owed = () => { const n = Number(ask(canal, 'dues')?.owed); return Number.isSafeInteger(n) && n > 0 ? n : 0; };
  /**
   * **The Harvest Close** (design 7.3): the water each right drew is reckoned against the grain it owes, and the canal
   * takes it from the satchel (src/canal-turns.js `settle`), barley before hard wheat and plain before fine. Days of
   * work on the head, written in the warden's book, count as barley paid; what is not met is carried to the next
   * Close. The first Close after Ovesos is restored reads his name (`named`).
   */
  function close() {
    if (!accepted() || rank(state.stage) < rank('register')) return { ok: false, reason: 'You are not in the register. The Close reckons rights, and you hold none.' };
    const due = owed();
    let credited = 0;
    const book = { count: id => (id === 'barley' ? state.credit - credited : 0) + (Number(inventory?.count?.(id)) || 0),
      remove: (id, n) => {
        const fromBook = id === 'barley' ? Math.min(state.credit - credited, n) : 0;
        if (n > fromBook && !inventory?.remove?.(id, n - fromBook)) return false;
        credited += fromBook;
        return true;
      } };
    const settled = due ? ask(canal, 'settle', book) ?? { owed: due, paid: 0, short: due, items: {} } : { owed: 0, paid: 0, short: 0, items: {} };
    const taken = { ...(settled.items ?? {}) };
    if (credited) { taken.barley = (taken.barley ?? 0) - credited; if (taken.barley <= 0) delete taken.barley; }
    const paid = Math.max(0, (Number(settled.paid) || 0) - credited);
    state.credit -= credited; state.duesPaid += paid; state.closes++;
    const reading = state.named === 'due';
    if (reading) state.named = 'read';
    const result = { ok: true, due, credited, paid, taken, short: Number(settled.short) || 0, reading, seniority: seniority() };
    onEvent({ type: 'ovesos-close', ...result });
    return result;
  }

  /** Whether a plot may be sown now (the host asks before sowing an Ovesos bed): his reach of the canal, and no other. */
  function canSow(bedId) {
    const reach = reachOf(bedId);
    if (!reach) return { ok: true };
    if (rank(state.stage) < rank('register') || !accepted()) return { ok: false, reason: 'These plots are the Council’s to allot. Nisaba keeps the register at the house in Velsorten.' };
    if (seniority() >= REACH_SENIORITY[reach]) return { ok: true };
    return { ok: false, reason: reach === 'head' ? 'The plots by the river belong to the oldest rights on the canal. You would have to buy one.'
      : 'The middle of the canal belongs to older rights than yours. Yours is the tail.' };
  }

  /** A right bought outright from Nisaba (design 7.8): a turn nearer the divider, for 1,500 copper, to the fifth. */
  function buyRight() {
    if (!accepted() || rank(state.stage) < rank('register')) return { ok: false, reason: 'A right is written in the register, or it is not a right. You are not in it yet.' };
    if (seniority() >= SENIORITY.most) return { ok: false, reason: 'There is no right on this canal older than yours that is for sale at any price. I have asked.' };
    if (level() < WATER_RIGHT_LEVEL) return { ok: false, level: WATER_RIGHT_LEVEL, reason: `The Council sells a right on this canal only to a farmer it knows can work it. The register wants Farming of ${WATER_RIGHT_LEVEL} against the name, and yours stands at ${level()}.` };
    if (inventory?.count && purse(inventory) < WATER_RIGHT_PRICE) return { ok: false, reason: `Fifteen hundred copper. You have ${purse(inventory)}.` };
    if (inventory?.remove && !pay(inventory, WATER_RIGHT_PRICE)) return { ok: false, reason: 'Your purse is lighter than it looks.' };
    raise('bought');
    state.rights++;
    onEvent({ type: 'ovesos-right-bought', seniority: seniority(), copper: WATER_RIGHT_PRICE });
    return { ok: true, seniority: seniority(), copper: WATER_RIGHT_PRICE };
  }

  /** How the hearing sits with somebody: 1 warmer, -1 cooler, 0 unchanged. */
  function regard(personId) {
    const answer = state.hearing?.answer ?? null;
    if (!answer) return 0;
    if (personId === OVESOS_ROLES.ziusudra) return answer === 'register' ? 1 : answer === 'witness' ? -1 : 0;
    if (personId === OVESOS_ROLES.nisaba) return answer === 'register' ? 1 : 0;
    if (personId === OVESOS_ROLES.ashnan) return answer === 'witness' ? (state.ashnan === 'paid' ? 1 : 0) : 0;
    return 0;
  }

  /** Once a whole second of play (the host calls this from its loop): the plots and the canal are read into the story. */
  function tick(playSeconds) {
    const at = Number(playSeconds);
    if (!Number.isFinite(at) || Math.floor(at) === lastTick) return;
    lastTick = Math.floor(at);
    observe(at);
  }

  // ---- What the hub shows --------------------------------------------------------------------------
  const STEPS = [
    ['arrive', 'Ford the Neth to Velsorten and be entered in the register.'],
    ['register', 'Learn from Enbilulu how the water is shared.'],
    ['turns', 'Take your first turn at the tail: barley and silver millet, and salt.'],
    ['canal', 'Clear the canal head with Enbilulu, and bring in a full barley harvest.'],
    ['wheat', 'Sow hard wheat.'],
    ['hearing', 'Answer Ziusudra’s draw before the Water Council.'],
    ['fine', 'Bring in Fine hard wheat.'],
    ['mill', 'Have the hard wheat ground at Ezina’s mill.'],
    ['carry', 'Bake flatbread, have it sealed, and carry it to Taleth.'],
  ];
  const tick1 = value => (value ? 1 : 0);
  const sites = SITES;
  const place = (site, name) => (site && Number.isFinite(site.x) && Number.isFinite(site.z) ? { x: site.x, z: site.z, id: site.id ?? null, name } : null);
  /** The arc's card on the tracker (the hub adds its id, title and place in the slate). */
  function trackableView() {
    const at = state.stage, R = OVESOS_ROLES, has = crop => state.sown.includes(crop), ready = deliverable();
    const turnNow = turnText();
    const by = {
      arrive: ['Ford the Neth below Haethom and follow the way east over the upland grass, past the canal’s head, and down to Velsorten on the terrace. Find Nisaba, the Water Council’s clerk, at the register house on the square, and ask to be entered for water.', [R.nisaba], place(sites.register, 'The register house')],
      register: ['You are entered as the most junior right on the canal, with a dry plot at the tail. Ask Enbilulu, the canal-warden, at the divider how the water is shared.', [R.enbilulu], place(sites.divider, 'The divider')],
      turns: [`Sow barley and silver millet on your plot at the tail, and when your turn comes down the canal, divide its measure among them (barley ${tick1(has(OVESOS_CROPS.barley))} / 1, millet ${tick1(has(OVESOS_CROPS.millet))} / 1, a turn taken ${tick1(state.allotted)} / 1).${state.salt ? '' : ' Ask Enbilulu about salt, or find out for yourself.'}${turnNow}`,
        state.salt ? [] : [R.enbilulu], place(sites.tail, 'Your plot at the tail')],
      canal: [`Help Enbilulu clear the canal head, a stretch between turns (${state.head} / ${HEAD_STRETCHES}), and bring in a full barley harvest, Good or better (${tick1(state.fullBarley)} / 1).${turnNow}`,
        state.head < HEAD_STRETCHES ? [R.enbilulu] : [], place(state.head < HEAD_STRETCHES ? sites.divider : sites.tail, state.head < HEAD_STRETCHES ? 'The divider' : 'Your plot at the tail')],
      wheat: [level() < HARD_WHEAT_LEVEL ? `The Council has moved you up a turn. Hard wheat is next, and it wants Farming level ${HARD_WHEAT_LEVEL}: work the barley and millet until you have it.`
        : 'The Council has moved you up a turn. Sow hard wheat on your plot. It drinks three units of a turn.', [], place(sites.tail, 'Your plot at the tail')],
      hearing: [`Ziusudra’s house lifted the head sluice out of turn, and your next turn comes down half short. Bring it before the Water Council at the register house: argue from Nisaba’s register, call Ashnan as witness, or settle it quietly for ${SETTLE_COPPER} copper.`,
        [R.nisaba, ...(state.consulted.includes('witness') ? [] : [R.ashnan])], place(sites.register, 'The register house')],
      fine: [`Bring in hard wheat of Fine grade: give it its thirst exactly, no more.${turnNow}`, [], place(sites.tail, 'Your plot at the tail')],
      mill: ['Take hard wheat to Ezina’s mill on the canal and have it ground. Fine wheat makes Fine flour, and she keeps one in sixteen.', [R.ezina], place(sites.mill, 'Ezina’s mill')],
      carry: !state.taught.includes(OVESOS_DISHES.flatbread) && !ready.bread
        ? ['Ask Ezina how the Sorten’s flatbread is made, bake it from the flour at a lit fire, have it sealed by a sworn measurer, and carry it to Taleth.', [R.ezina], place(sites.mill, 'Ezina’s mill')]
        : !ready.bread ? ['Bake flatbread from two of hard-wheat flour at a lit fire, then have it sealed and carry it to Taleth.', [], null]
        : !ready.sealed ? ['Have the flatbread sealed by a sworn measurer: Nepri at the Measure House in Minora, or Consus at the Caricas grain court.', [...MEASURERS], null]
        : ['Carry the sealed flatbread to Taleth at the Guild tower in Minora.', [TALETH_ID], null],
      done: [state.named === 'due' ? 'Ovesos is restored. Nisaba will read your name at the next Harvest Close, at the register house.' : 'Ovesos is restored.', [], null],
    };
    const [detail, destinationIds, target] = by[at];
    return { stage: at, kicker: 'Ovesos · the shared water', region: 'Ovesos', active: accepted() && at !== 'done', complete: at === 'done',
      detail, destinationIds: [...destinationIds], target,
      steps: STEPS.map(([stage, text]) => ({ text, done: rank(at) > rank(stage) })) };
  }
  /** The canal's turn as a sentence for the card, when the canal says whose it is. */
  function turnText() {
    const view = canalView(), turn = turnOf();
    if (!view || !turn) return '';
    if (view.mine) { const left = Math.max(0, Math.min(view.left, allowance(turn) - (turn.used ?? 0))); return ` Your turn is running at the divider: ${left} ${left === 1 ? 'unit' : 'units'} left to divide.`; }
    return Number.isFinite(view.nextIn) && view.nextIn > 0 ? ` Your turn comes down in about ${Math.ceil(view.nextIn)} seconds.` : '';
  }
  /** Who wears the farmlands' mark for Ovesos now. */
  const markerIds = () => (accepted() && state.stage !== 'done' ? trackableView().destinationIds : []);

  /** The journal's entry once Ovesos is restored (the hub dresses it in its own shape). */
  function journal() {
    if (state.stage !== 'done') return null;
    const answer = state.hearing?.answer;
    const hearing = answer === 'register' ? ' You answered Ziusudra’s draw from Nisaba’s register, and the Council moved you up a turn for it.'
      : answer === 'witness' ? ` You answered Ziusudra’s draw on Ashnan’s witness, and the Council called in her dues${state.ashnan === 'paid' ? ', which you paid' : ''}.`
      : ' You settled Ziusudra’s draw quietly, for forty copper.';
    return { title: 'Ovesos: the shared water', detail: `Nisaba entered you at the tail of the Velsorten canal. You took your turns, cleared the canal head with Enbilulu and brought the barley in full.${hearing} The Fine hard wheat went through Ezina’s mill, and the flatbread went to Taleth under seal.${state.named === 'read' ? ' Nisaba read your name at the Harvest Close.' : ''}`,
      rewards: [`A senior water right: the ${['fifth', 'fourth', 'third', 'second', 'first'][Math.max(1, Math.min(5, seniority())) - 1]} turn of the round`, 'Ezina grinds for you without her sixteenth', state.named === 'read' ? 'Your name read at the Harvest Close' : 'Your name, to be read at the Harvest Close'] };
  }
  /** Ovesos's leaf of the Measure, in the arc's own words; the hub keeps the grades. */
  const measureLines = () => [
    { id: 'hard-wheat', name: 'Hard wheat from the canal', items: ['hard-wheat'] },
    { id: 'barley', name: 'Barley from the tail', items: ['barley'] },
    { id: 'silver-millet', name: 'Silver millet', items: ['silver-millet', 'millet'] },
    { id: 'dish', name: 'Flatbread', items: [OVESOS_DISHES.flatbread] },
  ];

  /** The arc's state, for the people and the tests: a copy, with what the canal says now. */
  function view() {
    return { ...copy(state), accepted: accepted(), seniority: seniority(), owed: owed(), options: hearingOptions(), salted: saltyBeds(), canal: canalView() };
  }
  const snapshot = () => copy(state);
  function restore(data) {
    if (data === undefined) { state = fresh(); lastTick = null; return true; }
    if (!validateOvesosArc(data)) return false;
    state = copy(data);
    return true;
  }

  // What comes in from the canal's beds (src/farming.js `onHarvest`): heard, never shared.
  farming?.onHarvest?.((bedId, result) => harvest(bedId, result));

  return {
    id: OVESOS_ARC_ID, validate: validateOvesosArc,
    stage: () => state.stage, accepted, view, trackableView, markerIds, journal, measureLines, snapshot, restore,
    attach(next) { hub = next ?? null; },
    measured(result) { onEvent({ type: 'ovesos-measured', ...result }); },
    enter, learnTurns, learnSalt, allot, noteAllotted, hear, observe, tick, harvest, workHead,
    consult, hearingOptions, answerHearing, payAshnan, grind, noteTaught, deliverable, deliver, close, canSow, buyRight, regard,
    seniority, owed,
  };
}

/**
 * Taleth's half of the Ovesos arc, for his conversation's `extraChoices` beside the others': the sealed flatbread is
 * handed over here. `context` carries `ovesos` (the arc), `openDialogue`, `closeDialogue` and, optionally,
 * `onComplete` and `notify`.
 */
export function talethOvesosChoices(npc, context) {
  const { ovesos = null, openDialogue, closeDialogue, onComplete = null, notify = null } = context ?? {};
  if (npc?.id !== TALETH_ID || !ovesos || ovesos.stage() !== 'carry') return [];
  const ready = ovesos.deliverable();
  if (!ready.bread) return [];
  const label = 'Give Taleth the flatbread from Ovesos';
  if (!ready.sealed) return [{ id: 'ovesos-deliver-unsealed', label, disabled: true, action: () => {},
    reason: 'A measurer’s seal first: Nepri at the Measure House, or Consus at the Caricas grain court.' }];
  return [{ id: 'ovesos-deliver', label, action: () => {
    const result = ovesos.deliver();
    if (!result?.ok) { notify?.(result?.reason ?? 'Not yet.', 'TALETH'); closeDialogue?.(); return; }
    openDialogue(npc, [
      'Flatbread from the Sorten. Hard wheat, ground at a mill on the canal, with a sixteenth left behind in the mill, I expect. Sealed. Ovesos sends Minora a great many petitions. It has never once sent me bread.',
      'You went to the tail of their canal and came back further up it. That is the only way anybody climbs in Ovesos, and most of them take three generations about it.',
      `I have no working to teach you for this one. Ovesos does not pay in workings; it pays in standing. The Council has written you ${result.seniority >= 5 ? 'first at the stone, ahead of the oldest house on the canal, which it will be a long time forgiving' : 'up the canal to the second turn, with only the oldest house ahead of you'}, and Ezina will grind for you without her sixteenth.`,
      'And at the next Harvest Close Nisaba will read your name aloud. Go and hear it. In Ovesos that is the whole of the applause, and they do not give it twice.',
    ], null, 'Back to Taleth', { noWayfinding: true, ...(onComplete ? { onComplete } : {}) });
    notify?.('A senior water right in Ovesos, and the use of Ezina’s mill without the toll.', 'OVESOS IS RESTORED');
  } }];
}
