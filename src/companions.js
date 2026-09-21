/**
 * Who walks with you, how well they know you, and who is not coming back
 * (docs/companions.md, and the user's answers in docs/design-answers.md).
 *
 * **This is not a second system beside the long road's companion.** `createMercenaryCompany`
 * already takes `{ id, with: true }`, gives that man the phase `with-traveler` and returns
 * `companionId`; Chris Gotwood walking Drent at your shoulder is the first case of this and the
 * only automatic one. What this adds is the other nine, the rungs, and the dead.
 *
 * Nothing here knows where anybody is standing. It answers "may he be asked, and will he come",
 * "how well does he know you", and "who is gone"; the host knows the ground and the clock, and
 * hands in what it knows. Pure: no DOM, no three, no world.
 */
import { MERCENARY_ROSTER, mercenaryById } from './mercenaries.js';

const freeze = Object.freeze;

export const COMPANIONS_VERSION = 1;

/**
 * **As many as will come** (the user, 2026-09-21). There is no limit: a traveler may reach the
 * muster with most of the company behind him, and that is the generous reading on purpose.
 *
 * The scarcity is not a number, then - it is that each man says yes only for his own reason at
 * his own moment, and some of those moments are narrow. Ed is on his strand for twenty-five
 * minutes; Mus is only ever found off the road. Keep that honest and the company stays something
 * gathered rather than collected.
 */
export const COMPANION_LIMIT = MERCENARY_ROSTER.length;

/**
 * The four rungs this game already uses for standing - `src/rena-letters.js`, `src/acorn-quest.js`
 * - rather than a bar of our own. Four *named* rungs are what combat's phase 7 hangs its lessons
 * on: one at each of the top three.
 */
export const RUNGS = freeze(['unfamiliar', 'acquainted', 'friendly', 'fond']);
export const RUNG_LABELS = freeze({
  unfamiliar: 'A stranger', acquainted: 'Acquaintance', friendly: 'Glad to see you', fond: 'Fond of you',
});
/** What each rung is reached at, and what it is worth to a teacher later. */
export const RUNG_AT = freeze({ unfamiliar: 0, acquainted: 25, friendly: 60, fond: 100 });

/** What moves a rung, and by how much. Nothing else does: not gifts, not repeating a line. */
export const REGARD = freeze({
  /** Asked, and he came. The first thing that ever happens. */
  asked: 12,
  /** Per minute actually walked with you, which is the slow honest one. */
  perMinute: 1.4,
  /** A fight come through together, and a little more if he was hurt in it and lived. */
  fought: 9,
  bled: 5,
  /** A weapon traded: he is carrying something of yours. */
  traded: 14,
  /** The one errand each man has, which is his own business and is done once. */
  errand: 22,
  /**
   * **A shaft of yours in him, and he got up again** (the user, 2026-09-21: arrows hurt whoever
   * they hit). Modest on purpose: it is an accident, he says one thing about it, and it costs
   * about what one fight together is worth. Killing him is not on this table at all - that costs
   * every man who saw it a whole rung, which is `costWitnesses`.
   */
  struck: 8,
  /** The most anybody can think of you. */
  top: 100,
});

/**
 * Where each man may be asked, and what makes him say yes. Every reason is already in his own two
 * lines (`MERCENARY_ROSTER`); nobody is recruited from a menu, and nobody says yes to a stranger
 * for no reason.
 *
 * `needs` is what the host must be able to say is true. `null` is "being here is enough".
 */
export const ASKS = freeze({
  'merc-gotwood': freeze({ where: 'landing', needs: null, automatic: true,
    yes: 'Same boat, same coin. I am not going to walk it twice.' }),
  'merc-word': freeze({ where: 'shore', needs: null,
    yes: 'Walk somewhere with you? A man wants an adventure. I have said so already, at length.' }),
  'merc-jerry': freeze({ where: 'road', needs: null, group: 'riders',
    yes: 'Finally. I have been saying we should split up since the crossing and nobody listens.' }),
  'merc-christin': freeze({ where: 'road', needs: 'charted', group: 'riders',
    yes: 'You know the road and we do not. That was the whole argument, and you have just ended it.',
    no: 'I am not leaving those two on a road none of us has walked. Learn it, and ask me again.' }),
  'merc-ciaran': freeze({ where: 'road', needs: null, group: 'riders',
    yes: 'I said I would go with whoever was going. You are going.' }),
  'merc-lakota': freeze({ where: 'road', needs: 'birded',
    yes: 'You stopped and looked at it. Most people walk on. Yes, I will come.',
    no: 'Come and look at something with me first. I do not walk anywhere with people who do not look.' }),
  'merc-eliana': freeze({ where: 'road', needs: 'edge',
    yes: 'You are carrying something with an edge on it. Then we have a conversation ahead of us. Lead on.',
    no: 'Come back when you have something I might want to swap for. My back is making the decisions now.' }),
  'merc-matt': freeze({ where: 'road', needs: null,
    yes: 'If there is a line to hold, I will hold it. Point me at the line.' }),
  'merc-altun': freeze({ where: 'road', needs: null,
    yes: 'Company. Yes. I would rather it never came to the mace, and it comes to the mace less with two.' }),
  'merc-mus': freeze({ where: 'wild', needs: null,
    yes: 'You left the road. All right.' }),
});

/**
 * What each of them is worth in a fight: the level of the weapon he carries, and his Toughness,
 * which is a little under it. Their health and their damage come from these through the same
 * `ARMS` curves as the traveler's, because **a country's level is a property of its dangers and
 * not of its ground** - a mercenary is as good as he is, wherever he is standing.
 *
 * The numbers are the combat brief's "Who starts with what" (docs/combat-brief.md), which is
 * where the user will want to tweak them; this is one frozen table beside the roster so that
 * tweaking is one edit. They grow with the story, which is phase 7's business.
 */
export const MERCENARY_ARMS = freeze({
  'merc-gotwood': freeze({ weapon: 'blades', level: 30, toughness: 26 }),
  'merc-word': freeze({ weapon: 'blades', level: 35, toughness: 30 }),
  'merc-jerry': freeze({ weapon: 'bows', level: 40, toughness: 34 }),
  'merc-christin': freeze({ weapon: 'blades', level: 25, toughness: 28, shield: 35 }),
  'merc-ciaran': freeze({ weapon: 'polearms', level: 35, toughness: 30 }),
  'merc-lakota': freeze({ weapon: 'staves', level: 30, toughness: 26 }),
  'merc-eliana': freeze({ weapon: 'heavy-arms', level: 40, toughness: 36 }),
  'merc-matt': freeze({ weapon: 'polearms', level: 35, toughness: 32 }),
  'merc-altun': freeze({ weapon: 'heavy-arms', level: 20, toughness: 17 }),
  'merc-mus': freeze({ weapon: 'polearms', level: 45, toughness: 40 }),
});

/**
 * What the host hands `combat` when it puts a companion in a fight as an ally: his kind, and the
 * two levels his numbers come from. `level` is what he hits for; `toughness` is what he can take.
 */
export function armsOf(id) {
  const arms = MERCENARY_ARMS[id];
  if (!arms) return null;
  return { weapon: arms.weapon, level: arms.level, toughness: arms.toughness, shield: arms.shield ?? 1 };
}

/** The ids of everyone who can ever walk with you, which is the whole roster. */
export const COMPANION_IDS = freeze(MERCENARY_ROSTER.map(entry => entry.id).filter(id => ASKS[id]));
/** Men who travel as a group and argue about it: asking one of them settles the argument. */
export const GROUPS = freeze(Object.entries(ASKS).reduce((groups, [id, ask]) => {
  if (ask.group) (groups[ask.group] ??= []).push(id);
  return groups;
}, {}));

/** The rung a number of regard is, and what it is called. */
export function rungFor(regard) {
  const at = Number.isFinite(regard) ? regard : 0;
  let rung = RUNGS[0];
  for (const name of RUNGS) if (at >= RUNG_AT[name]) rung = name;
  return rung;
}
export const rungLabel = regard => RUNG_LABELS[rungFor(regard)];

export function validateCompanionsSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== COMPANIONS_VERSION) return false;
  if (!Array.isArray(data.walking) || data.walking.some(id => !COMPANION_IDS.includes(id))) return false;
  if (new Set(data.walking).size !== data.walking.length) return false;
  if (data.walking.length > COMPANION_LIMIT) return false;
  if (!data.regard || typeof data.regard !== 'object' || Array.isArray(data.regard)) return false;
  for (const [id, at] of Object.entries(data.regard)) {
    if (!COMPANION_IDS.includes(id)) return false;
    if (!Number.isFinite(at) || at < 0 || at > REGARD.top) return false;
  }
  if (!Array.isArray(data.errands) || data.errands.some(id => !COMPANION_IDS.includes(id))) return false;
  // Missing is a save from before a trade was paid once, which is every save written until today.
  if (data.traded !== undefined && (!Array.isArray(data.traded) || data.traded.some(id => !COMPANION_IDS.includes(id)))) return false;
  if (data.fell !== undefined) {
    if (!data.fell || typeof data.fell !== 'object' || Array.isArray(data.fell)) return false;
    for (const [id, at] of Object.entries(data.fell)) {
      if (!COMPANION_IDS.includes(id) || !at || typeof at !== 'object' || Array.isArray(at)) return false;
      if (at.where !== null && typeof at.where !== 'string') return false;
      if (at.what !== null && at.what !== undefined && typeof at.what !== 'string') return false;
      if (at.witnesses !== undefined && (!Array.isArray(at.witnesses) || at.witnesses.some(w => !COMPANION_IDS.includes(w)))) return false;
    }
  }
  if (data.told !== undefined) {
    if (!data.told || typeof data.told !== 'object' || Array.isArray(data.told)) return false;
    for (const [id, kind] of Object.entries(data.told))
      if (!COMPANION_IDS.includes(id) || !['true', 'silent', 'lie'].includes(kind)) return false;
  }
  if (data.knows !== undefined) {
    if (!data.knows || typeof data.knows !== 'object' || Array.isArray(data.knows)) return false;
    for (const [id, about] of Object.entries(data.knows))
      if (!COMPANION_IDS.includes(id) || !COMPANION_IDS.includes(about)) return false;
  }
  // A man cannot both walk with you and be dead. The dead live in `createFallen()`, which the
  // save already carries, so they are handed in rather than kept here.
  return true;
}

/**
 * @param fallen `createFallen()` from src/bystanders.js - the save's own list of the gone. It is
 *   shared with the world's other dead on purpose: permanent death is one idea, not two.
 */
export function createCompanions({ fallen = null, onEvent = () => {} } = {}) {
  const state = { walking: [], regard: {}, errands: [], traded: [], fell: {}, told: {}, knows: {} };

  const dead = id => !!fallen?.has?.(id);
  const regardOf = id => state.regard[id] ?? 0;
  const known = id => COMPANION_IDS.includes(id);

  /** Add to what a man thinks of you, once he is somebody who thinks of you at all. */
  function regardBy(id, amount, why) {
    if (!known(id) || dead(id) || !(amount > 0)) return { ok: false, rung: rungFor(regardOf(id)) };
    const before = rungFor(regardOf(id));
    state.regard[id] = Math.min(REGARD.top, regardOf(id) + amount);
    const rung = rungFor(state.regard[id]);
    if (rung !== before) onEvent({ type: 'rung', id, rung, label: RUNG_LABELS[rung], why });
    return { ok: true, rung, label: RUNG_LABELS[rung], rose: rung !== before, regard: state.regard[id] };
  }

  /**
   * **Down a rung, and never by less than a rung's usual size.** Taking a fixed 35 off was the
   * usual size of a rung and not the promise: a man at 95 to 99 is `friendly`, and 35 off leaves
   * him at 60 to 64, which is `friendly` still - so a witness in that band paid nothing at all.
   * He goes below the foot of the rung he is on, and never by less than that 35.
   *
   * One piece of arithmetic with two callers, because it is one idea: **the men who were walking
   * with you know what you did.** A lie at the muster is the first (`report`); an arrow of yours
   * in a friend's back is the second (`costWitnesses`), and the user's ruling is that it costs
   * the same.
   */
  function dropRung(id) {
    const at = regardOf(id), below = RUNG_AT[rungFor(at)] - 1;
    state.regard[id] = Math.max(0, Math.min(at - (RUNG_AT.friendly - RUNG_AT.acquainted), below));
    return state.regard[id];
  }

  /**
   * May he be asked here, and will he come? `where` is the host's word for the ground the
   * traveler is standing on, and `has` is what the host can say is true of him - `charted`,
   * `birded`, `edge`. Nothing here checks the world; it checks the answer the world gave.
   */
  function askable(id, { where = null, has = {} } = {}) {
    if (!known(id)) return { ok: false, reason: 'nobody' };
    if (dead(id)) return { ok: false, reason: 'dead' };
    if (state.walking.includes(id)) return { ok: false, reason: 'already' };
    const ask = ASKS[id];
    if (where && ask.where !== where) return { ok: false, reason: 'elsewhere' };
    if (ask.needs && !has[ask.needs]) return { ok: false, reason: 'needs', needs: ask.needs, line: ask.no ?? null };
    // No refusal past this point: as many as will come. The only reasons anybody says no are his
    // own - the wrong country, the thing he wants first, or being dead.
    return { ok: true, line: ask.yes };
  }

  /** He comes, and so may everybody else who will. */
  function ask(id, context = {}) {
    const may = askable(id, context);
    if (!may.ok) return may;
    state.walking.push(id);
    regardBy(id, REGARD.asked, 'asked');
    onEvent({ type: 'joined', id, line: ASKS[id].yes, walking: [...state.walking] });
    return { ok: true, line: ASKS[id].yes, walking: [...state.walking] };
  }

  /** Go on ahead. He is still yours; he is simply not at your shoulder. */
  function sendOn(id) {
    if (!state.walking.includes(id)) return { ok: false };
    state.walking = state.walking.filter(walker => walker !== id);
    onEvent({ type: 'sent-on', id, walking: [...state.walking] });
    return { ok: true, walking: [...state.walking] };
  }

  // --- what moves a rung ----------------------------------------------------
  /** Minutes actually walked together, paid as they accumulate. */
  const travelled = (id, seconds) => regardBy(id, (Number(seconds) || 0) / 60 * REGARD.perMinute, 'travelled');
  /** A fight come through together, and a little more if he was hurt in it and lived. */
  const fought = (id, { bled = false } = {}) => regardBy(id, REGARD.fought + (bled ? REGARD.bled : 0), 'fought');
  /** A weapon traded: he is carrying something of yours. */
  /**
   * A weapon traded: he is carrying something of yours. **Once a man**, because it is a state and
   * not an act - and because `tradeOffer` refuses only a swap for the same weapon, so a traveler
   * could hand his sword over, take the mace, and swap straight back for ever. Measured: at 14 a
   * swap it took **seven swaps** to carry a man from asked to fond, against sixty-three minutes of
   * walking for the same climb. That is the whole of the friendship design - a road walked, fights
   * come through, his own errand - bought with fourteen dialogue clicks.
   *
   * It is spelled the way `errand` is, and kept in the same list, so a save written before this
   * carries it without a new field: a man who has traded is a man whose errand-shaped things are
   * done once.
   */
  function traded(id) {
    if (!known(id) || state.traded.includes(id)) return { ok: false, rung: rungFor(regardOf(id)) };
    state.traded.push(id);
    return regardBy(id, REGARD.traded, 'traded');
  }
  /** His own errand, done once. */
  function errand(id) {
    if (!known(id) || state.errands.includes(id)) return { ok: false, rung: rungFor(regardOf(id)) };
    state.errands.push(id);
    return regardBy(id, REGARD.errand, 'errand');
  }

  /**
   * He is gone, in any fight, anywhere. He stops walking with you and never comes back.
   *
   * `where` and `what` are remembered because the Marshal asks what happened, and the answer is
   * built from them rather than invented: "At the Lauvel. Wolves, at night." They are also what
   * the journal's company page says of him, and where his weapon is lying.
   */
  function died(id, { where = null, what = null, x = null, z = null, weapon = null, weaponName = null } = {}) {
    if (!known(id) || dead(id)) return { ok: false };
    fallen?.fall?.(id);
    state.walking = state.walking.filter(walker => walker !== id);
    // Who else was walking with the traveler when it happened. A lie about this man is known to
    // every one of them who is still alive, and to nobody else: if the last witness dies later,
    // the lie stands.
    const witnesses = state.walking.filter(walker => walker !== id);
    state.fell[id] = { where: typeof where === 'string' && where ? where : null,
      what: typeof what === 'string' && what ? what : null, witnesses,
      ...(weapon ? { weapon, weaponName: weaponName ?? 'weapon' } : {}),
      ...(Number.isFinite(x) && Number.isFinite(z) ? { x, z } : {}) };
    onEvent({ type: 'died', id, name: mercenaryById(id)?.name ?? id, ...state.fell[id] });
    return { ok: true, walking: [...state.walking], fell: { ...state.fell[id] } };
  }
  /** Where a man fell and against what, or null for somebody who has not. */
  const fellAt = id => (state.fell[id] ? { ...state.fell[id] } : null);
  /**
   * **You killed him yourself, and they all saw it** (the user, 2026-09-21: a companion killed by
   * the traveler's arrow is dead for good, and costs every living witness a rung, as a lie does).
   *
   * Called after `died`, which is what wrote down who was walking with you at the time. It is the
   * lie's own cost, paid at the moment instead of at the muster, and it is deliberately the same
   * mechanism: there is one idea here and it should never have two sizes.
   */
  function costWitnesses(id) {
    const saw = (state.fell[id]?.witnesses ?? []).filter(witness => !dead(witness));
    for (const witness of saw) dropRung(witness);
    if (saw.length) onEvent({ type: 'saw-your-arrow', id, knows: [...saw] });
    return [...saw];
  }
  /**
   * **A shaft of yours in him, and he got up again.** He thinks a little less of you for it and
   * says one thing about it; the host has his word. Nothing is remembered beyond the number, so a
   * man may be hit twice and it costs twice - which is right, because the second time it is not
   * an accident any more.
   */
  function struckByYou(id) {
    if (!known(id) || dead(id)) return { ok: false, rung: rungFor(regardOf(id)) };
    const before = rungFor(regardOf(id));
    state.regard[id] = Math.max(0, regardOf(id) - REGARD.struck);
    const rung = rungFor(state.regard[id]);
    if (rung !== before) onEvent({ type: 'rung', id, rung, label: RUNG_LABELS[rung], why: 'struck' });
    return { ok: true, rung, label: RUNG_LABELS[rung], fell: rung !== before, regard: state.regard[id] };
  }
  /**
   * What is lying on the ground where he fell, and not yet picked up. A dead man's weapon stays
   * where he went down, marked, as **a named weapon** - "Eliana's greatsword" - which is what the
   * combat brief says a given weapon should be, and these are the only named weapons in the game.
   * If he was carrying the traveler's own traded sword, that is what is lying there.
   */
  function weaponOnTheGround(id) {
    const at = state.fell[id];
    if (!at || at.taken || !at.weapon || !Number.isFinite(at.x)) return null;
    return { id, weapon: at.weapon, x: at.x, z: at.z,
      name: `${mercenaryById(id)?.name ?? id}’s ${at.weaponName ?? 'weapon'}` };
  }
  /** Everything still lying where somebody fell. */
  const weaponsOnTheGround = () => COMPANION_IDS.map(weaponOnTheGround).filter(Boolean);
  /** Picked up. It is not lying there any more, and it does not come back. */
  function takeWeapon(id) {
    const lying = weaponOnTheGround(id);
    if (!lying) return { ok: false };
    state.fell[id] = { ...state.fell[id], taken: true };
    onEvent({ type: 'weapon-taken', id, weapon: lying.weapon, name: lying.name });
    return { ok: true, ...lying };
  }

  // --- what you tell the Marshal ------------------------------------------
  /**
   * The dead the Marshal has not yet been told about, in roster order. He counts, stops, and asks
   * after each missing name in turn.
   */
  const owed = () => COMPANION_IDS.filter(id => dead(id) && !state.told[id]);
  /**
   * The true answer, built from what was written down when he fell rather than invented now:
   * "At the Lauvel. Wolves." A man whose fall nobody recorded gets the plainest thing there is.
   */
  function truthAbout(id) {
    const at = state.fell[id];
    if (!at) return 'Dead.';
    const where = at.where ? `At ${at.where}.` : null;
    const what = at.what ? `${at.what}.` : null;
    return [where, what].filter(Boolean).join(' ') || 'Dead.';
  }
  /** What the traveler may say, in his own words, with the true one built from the record. */
  const answersFor = id => freeze([
    freeze({ id: 'true', label: truthAbout(id), kind: 'true' }),
    freeze({ id: 'silent', label: 'Dead.', kind: 'silent' }),
    freeze({ id: 'lie', label: 'He took his pay and went home.', kind: 'lie' }),
  ]);
  /**
   * Tell him. Truth costs nothing and silence costs nothing. **A lie is known for one by everyone
   * who was walking with you when it happened**, each of whom drops a rung and will say so once,
   * later, by their own fire - not in front of the Marshal. If nobody living saw it, the lie
   * stands, and the register says something false, which the late story will want.
   */
  function report(id, kind) {
    if (!dead(id) || state.told[id] || !['true', 'silent', 'lie'].includes(kind)) return { ok: false };
    state.told[id] = kind;
    if (kind !== 'lie') return { ok: true, kind, knows: [], register: true };
    const saw = (state.fell[id]?.witnesses ?? []).filter(witness => !dead(witness));
    for (const witness of saw) {
      state.knows[witness] = id;
      // **A rung, not a point: it is the standing that changes**, and he will say why.
      dropRung(witness);
    }
    onEvent({ type: 'lied', id, knows: [...saw], register: !saw.length });
    return { ok: true, kind, knows: [...saw], register: !saw.length };
  }
  /** Whether the register the Marshal keeps says something false about this man. */
  const registerIsFalse = id => state.told[id] === 'lie' && !(state.fell[id]?.witnesses ?? []).some(w => !dead(w));
  /** What a man holds against you, and the one line he has for it. Said once, and then let go. */
  function holdsAgainstYou(id) {
    const about = state.knows[id];
    if (!about) return null;
    return { about, name: mercenaryById(about)?.name ?? about,
      line: `You told the Marshal ${mercenaryById(about)?.name ?? about} went home. I was there. I have not said anything, and I am not going to, but I was there.` };
  }
  /** He has said it. He does not say it twice. */
  function letGo(id) {
    if (!state.knows[id]) return { ok: false };
    delete state.knows[id];
    return { ok: true };
  }

  /**
   * The living of the company, in roster order. This is what the muster is given: `musterVoices`
   * greets the men on the roster it is handed, and it must not greet a dead one.
   */
  const living = () => COMPANION_IDS.filter(id => !dead(id));

  const view = () => COMPANION_IDS.map(id => ({
    id, name: mercenaryById(id)?.name ?? id,
    walking: state.walking.includes(id), dead: dead(id), fell: fellAt(id),
    regard: Math.round(regardOf(id)), rung: rungFor(regardOf(id)), label: RUNG_LABELS[rungFor(regardOf(id))],
    errand: state.errands.includes(id), traded: state.traded.includes(id),
  }));

  function snapshot() {
    return { version: COMPANIONS_VERSION, walking: [...state.walking],
      regard: Object.fromEntries(Object.entries(state.regard).map(([id, at]) => [id, Math.round(at * 10) / 10])),
      errands: [...state.errands], traded: [...state.traded], fell: Object.fromEntries(Object.entries(state.fell).map(([id, at]) => [id, { ...at }])),
      told: { ...state.told }, knows: { ...state.knows } };
  }

  function restore(data) {
    Object.assign(state, { walking: [], regard: {}, errands: [], traded: [], fell: {} });
    if (!validateCompanionsSnapshot(data, { allowMissing: false })) return false;
    state.fell = Object.fromEntries(Object.entries(data.fell ?? {}).map(([id, at]) => [id, { ...at }]));
    state.told = { ...(data.told ?? {}) };
    state.knows = { ...(data.knows ?? {}) };
    // A save written before somebody died, loaded after: the dead do not walk.
    state.walking = data.walking.filter(id => !dead(id));
    state.regard = { ...data.regard };
    state.errands = [...data.errands];
    // A save written before a trade was once-only has no list, and nobody in it has traded twice.
    state.traded = [...(data.traded ?? [])];
    return true;
  }

  return { ask, askable, sendOn, travelled, fought, traded, errand, died, fellAt, living, view, snapshot, restore,
    costWitnesses, struckByYou,
    owed, truthAbout, answersFor, report, registerIsFalse, holdsAgainstYou, letGo,
    weaponOnTheGround, weaponsOnTheGround, takeWeapon,
    told: id => state.told[id] ?? null,
    rung: id => rungFor(regardOf(id)), label: id => RUNG_LABELS[rungFor(regardOf(id))],
    regardFor: id => Math.round(regardOf(id)),
    get walking() { return [...state.walking]; },
    walksWith: id => state.walking.includes(id),
    /**
     * What `createMercenaryCompany` wants: everybody at the traveler's shoulder, in the order
     * they were asked. Empty is today's clock exactly, which is the property the company's own
     * snapshot test pins from the other side.
     */
    get companions() { return state.walking.map(id => ({ id, with: true })); } };
}
