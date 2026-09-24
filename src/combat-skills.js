/**
 * The seven fighting skills, and the arithmetic of what a level is worth
 * (docs/combat-brief.md, phase 1).
 *
 * They are skills like any other: the same 99-level table as birding and wine, the same tiles in
 * the same grid, under their own heading. None is required. A traveler who only ever carries a
 * sword has one tile that moves, and that is fine.
 *
 * The skills are **by weapon** because the company is the faculty: friendship with a mercenary is
 * how you learn the weapon they carry, and a mercenary who dies takes the lessons with them. That
 * is phase 7's business; what phase 1 owes it is that every family already knows who teaches it.
 *
 * **The law this module exists to keep: level 1 is today's game, to the digit.** Every curve
 * below returns exactly what `src/combat.js` and `src/weapons.js` do now when the level is 1, so
 * every fight already built is untouched. The user may tweak any of it, so every number lives in
 * one frozen table at the top and nothing anywhere else invents one.
 *
 * Pure: no DOM, no three, no world.
 */
import { RUNESCAPE_TABLE, skillLevel, ARMS_HEADING } from './skills.js';

const freeze = Object.freeze;

export const COMBAT_SKILLS_VERSION = 1;

/**
 * Every number the fighting skills have. `low` is level 1 and is today's game; `high` is level 99.
 * Everything between is a straight line in the level, which is what "margins, not moves" means:
 * a level never makes a mistimed blow land, never shortens an enemy's tell, and never makes the
 * traveler unhittable.
 */
export const ARMS = freeze({
  /** Damage with a weapon, as a multiplier on what the weapon already does. */
  damage: freeze({ low: 1, high: 3 }),
  /** Stamina one swing costs. */
  swing: freeze({ low: 6, high: 4 }),
  /** The traveler's health, and the bar his wind comes out of. */
  health: freeze({ low: 100, high: 400 }),
  wind: freeze({ low: 100, high: 180 }),
  /** The part of a dodge that cannot be hurt, in seconds. Forgiving at the top, never automatic. */
  dodge: freeze({ low: .37, high: .48 }),
  /** The share of a frontal blow a shield takes, and what catching one costs in wind. */
  guard: freeze({ low: .6, high: .9 }),
  guardCost: freeze({ low: 18, high: 8 }),
  /** How long a bow takes to draw. */
  draw: freeze({ low: 1.1, high: .6 }),
  /** What the skills are paid. Damage dealt pays the weapon's own family. */
  xp: freeze({
    /** Experience per point of damage dealt with the weapon. */
    perDamage: .6,
    /** A killing blow pays a little extra, as a share of what the blow itself paid. */
    killing: .5,
    /** Toughness, for a dodge that actually avoided a strike, and per point of damage survived. */
    dodged: 8,
    perHurt: 1.2,
    /** Shield, per point of a blow caught on it. */
    perCaught: 1.4,
  }),
  /**
   * Practice has a ceiling: nobody reaches 60 by hitting straw. `sparring` is the floor of the
   * sparring ceiling - what a bout pays up to when nobody has said otherwise. A teacher hands in
   * a higher one as he gives you his lessons, bounded by his own level (src/teachers.js).
   */
  ceiling: freeze({ post: 5, sparring: 20 }),
});

/**
 * How hard the country itself is (docs/difficulty-ladder.md gives every region a level from 0 to
 * 11, and `src/region-levels.js` is that table). An enemy met in a country of level L has more
 * health and hits harder, and **the same tell, strike and recovery as its kind has anywhere**.
 *
 * Timing never scales. That is the whole of the design: a level-8 ogre is not faster and does not
 * telegraph less, so a traveler who reads the tell can still dodge it - he simply cannot afford
 * to miss. At level 0 both multipliers are exactly 1, so every fight already built is untouched.
 */
export const COUNTRY = freeze({ health: .45, damage: .30, top: 11 });

/**
 * **A country's level is a property of its dangers, not of its ground** (the user, 2026-09-21).
 * It scales what its enemies are and what they do, to anybody standing in front of them; it does
 * not scale your side. A companion's health and damage come from *their own* levels, through
 * these same curves - Toughness for health, their weapon's family for damage - so a mercenary at
 * 45 stands in level-2 country with about 235 health and nearly double damage, because of who he
 * is and not because of where he is standing.
 *
 * These two are the same curves as the traveler's, expressed as multipliers on what an ally
 * already had, so **level 1 is exactly today's ally**: `maxHealth(1)` is 100 and
 * `damageMultiplier(1)` is 1.
 */
export const allyHealthScale = level => maxHealth(level) / ARMS.health.low;
export const allyDamageScale = level => damageMultiplier(level);
const clampCountry = level => Math.max(0, Math.min(COUNTRY.top, Math.floor(Number(level) || 0)));
/** What an enemy's health and damage are multiplied by, in a country of this level. */
export const countryHealth = level => 1 + COUNTRY.health * clampCountry(level);
export const countryDamage = level => 1 + COUNTRY.damage * clampCountry(level);

/** The top of the table, so a level is never asked for beyond it. */
export const TOP_LEVEL = 99;
const clampLevel = level => Math.max(1, Math.min(TOP_LEVEL, Math.floor(Number(level) || 1)));
/** A straight line from level 1 to level 99 through one of the pairs above. */
const along = (pair, level) => pair.low + (pair.high - pair.low) * ((clampLevel(level) - 1) / (TOP_LEVEL - 1));

/** How much harder you hit, as a multiplier on the weapon's own damage. */
export const damageMultiplier = level => along(ARMS.damage, level);
/** What one swing costs in wind. */
export const swingCost = level => along(ARMS.swing, level);
/** Toughness: the health you have, the wind you have, and how much of a dodge cannot be hurt. */
export const maxHealth = level => Math.round(along(ARMS.health, level));
export const maxWind = level => Math.round(along(ARMS.wind, level));
export const dodgeWindow = level => along(ARMS.dodge, level);
/** Shield: the share of a frontal blow it takes, and what catching one costs. */
export const guardShare = level => along(ARMS.guard, level);
export const guardCost = level => along(ARMS.guardCost, level);
/** Bows: how long the draw takes. */
export const drawTime = level => along(ARMS.draw, level);

/**
 * The seven families, in the order they go in the grid, with the weapons each covers and who in
 * the company teaches it. `weapons` are inventory ids from src/weapons.js; the families also name
 * the weapons phases 5 and 6 will add, so that a weapon arriving later has a home already.
 */
/**
 * The seven families, in the order they go in the grid, and the weapons each one covers. The
 * name, the blurb and the teacher are in `SKILLS` (src/skills.js) with every other skill's, so
 * they are written once; what belongs here is the only thing combat knows that the journal does
 * not - which weapon is whose. The empty lists are the weapons phases 5 and 6 will add, named
 * here already so that a weapon arriving later has a home rather than a decision.
 */
export const ARMS_SKILLS = freeze({
  blades: freeze({ id: 'blades', weapons: freeze(['simple-sword', 'long-dagger']) }),
  'heavy-arms': freeze({ id: 'heavy-arms', weapons: freeze(['greatsword', 'iron-mace', 'bearded-axe']) }),
  polearms: freeze({ id: 'polearms', weapons: freeze(['ash-spear', 'war-pike']) }),
  // A focus can still strike as wood; spell damage pays its school instead of Staves.
  staves: freeze({ id: 'staves', weapons: freeze(['forest-stick', 'quarterstaff', 'wand', 'oak-staff']) }),
  bows: freeze({ id: 'bows', weapons: freeze(['hunting-bow']) }),
  shield: freeze({ id: 'shield', weapons: freeze([]) }),
  toughness: freeze({ id: 'toughness', weapons: freeze([]) }),
});

/** The seven ids, in grid order. */
export const ARMS_IDS = freeze(Object.keys(ARMS_SKILLS));
/** The heading the seven sit under in the journal's grid, spelled once in src/skills.js. */
export { ARMS_HEADING };

/**
 * Which family a weapon belongs to, built from the families themselves so there is one list and
 * not two. A weapon nobody has claimed answers null, and works at level 1 forever, which is the
 * right answer for a torch or a bunch of flowers.
 */
export const WEAPON_FAMILY = freeze(Object.fromEntries(
  ARMS_IDS.flatMap(id => ARMS_SKILLS[id].weapons.map(weapon => [weapon, id]))));
export const familyOf = weapon => WEAPON_FAMILY[weapon] ?? null;

/** The margins a traveler fights with, given what he knows. Level 1 in everything is today. */
export function marginsFor(levels = {}) {
  const level = id => clampLevel(levels[id] ?? 1);
  const tough = level('toughness');
  return freeze({
    maxHp: maxHealth(tough),
    maxStamina: maxWind(tough),
    dodgeWindow: dodgeWindow(tough),
    guardShare: guardShare(level('shield')),
    guardCost: guardCost(level('shield')),
    drawTime: drawTime(level('bows')),
    /** Per weapon, because each family climbs on its own. */
    damageFor: weapon => damageMultiplier(level(familyOf(weapon))),
    swingCostFor: weapon => swingCost(level(familyOf(weapon))),
  });
}

export function validateCombatSkillsSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== COMBAT_SKILLS_VERSION) return false;
  if (!data.practice || typeof data.practice !== 'object' || Array.isArray(data.practice)) return false;
  for (const [id, banked] of Object.entries(data.practice)) {
    if (!ARMS_IDS.includes(id)) return false;
    if (!Number.isFinite(banked) || banked < 0 || banked > 200_000_000) return false;
  }
  return true;
}

/**
 * What the fighting skills are paid, and the one rule that needs remembering between payments:
 * practice has a ceiling. Straw pays Blades to level 5 and no further, and sparring with a friend
 * pays to a level set by how good a friend the teacher is (phase 7). A fight has no ceiling.
 *
 * **A bout's ceiling is handed in**, because only the host knows who the traveler is sparring
 * with: `src/teachers.js` works it out from the lessons that man has given and from his own level
 * in `MERCENARY_ARMS`, and nobody can teach past what he knows. Without one, sparring pays to
 * `ARMS.ceiling.sparring`, which is what it has always done.
 *
 * Everything else - the levels themselves - lives in `createSkills`, because these are skills like
 * any other. Nothing is banked in a skill that has not been shown to you, which `createSkills`
 * already enforces through `known()`.
 */
export function createCombatSkills({ skills = null, onEvent = () => {} } = {}) {
  const state = { practice: {} };

  const level = id => skills?.level?.(id) || 1;
  // Whether the man who teaches this weapon has taught it. Knowing it is no longer a question:
  // every skill begins at level 1 and pays from the first swing (the user, 21 September 2026).
  const known = id => !!(skills?.taught?.(id) ?? skills?.known?.(id));
  const ceilingFor = (source, ceiling) => (source === 'post' ? ARMS.ceiling.post
    : source === 'sparring' ? (Number.isFinite(ceiling) && ceiling > 0 ? Math.floor(ceiling) : ARMS.ceiling.sparring)
    : null);
  /** The two sources that are practice and not a fight; a lesson is neither, and has no ceiling. */
  const isPractice = source => source === 'post' || source === 'sparring';

  /** A teacher shows you the weapon. It worked before he did, and it banked before he did too. */
  function learn(id) {
    if (!ARMS_IDS.includes(id) || known(id)) return { ok: ARMS_IDS.includes(id), first: false };
    skills?.learn?.(id);
    onEvent({ type: 'arms-learned', id });
    return { ok: true, first: true };
  }

  /** Pay a family, honouring the ceiling that practice has and a fight does not. */
  function pay(id, amount, source = 'fight', ceiling = null) {
    // **The Arms stay taught.** Every other skill begins at level 1 and pays from the first step,
    // but a weapon that banked before its teacher had spoken would level the traveler through
    // the whole opening and move numbers that were measured against him at level 1 - the border
    // battle's tables among them. Fighting works from the first swing, as it always did; what
    // the teacher opens is the banking. Left alone deliberately, not overlooked.
    if (!ARMS_IDS.includes(id) || !known(id) || !(amount > 0)) return { ok: true, xp: 0, levelled: false, level: level(id) };
    const stops = ceilingFor(source, ceiling);
    if (stops !== null && level(id) >= stops) return { ok: true, xp: 0, levelled: false, level: level(id), capped: true, ceiling: stops };
    const result = skills?.gain?.(id, Math.round(amount));
    if (isPractice(source)) state.practice[id] = (state.practice[id] ?? 0) + Math.round(amount);
    return { ok: true, xp: Math.round(amount), levelled: !!result?.levelled, level: result?.level ?? level(id) };
  }

  /**
   * Damage dealt with a weapon pays that weapon's family, scaled by the country's level, so hard
   * country teaches faster than goblins do. `countryLevel` is phase 2's; at 0 it is today.
   */
  function dealt({ weapon, damage = 0, killed = false, countryLevel = 0, source = 'fight', ceiling = null } = {}) {
    const id = familyOf(weapon);
    if (!id || !(damage > 0)) return { ok: true, xp: 0, levelled: false, id };
    const scaled = damage * ARMS.xp.perDamage * (1 + .25 * Math.max(0, countryLevel));
    return { id, ...pay(id, scaled * (killed ? 1 + ARMS.xp.killing : 1), source, ceiling) };
  }

  /**
   * Toughness: a dodge that actually avoided a strike, and damage taken and survived. Shield:
   * blows caught on it. All three take `source` for the same reason `dealt` does - a straw post
   * cannot hit back, and a friend sparring is not a goblin. Without it the default was 'fight'
   * and the ceiling never applied: dodging at the post alone took Toughness past 30.
   */
  const dodged = ({ countryLevel = 0, source = 'fight', ceiling = null } = {}) =>
    pay('toughness', ARMS.xp.dodged * (1 + .25 * Math.max(0, countryLevel)), source, ceiling);
  const hurt = ({ damage = 0, countryLevel = 0, source = 'fight', ceiling = null } = {}) =>
    (damage > 0 ? pay('toughness', damage * ARMS.xp.perHurt * (1 + .25 * Math.max(0, countryLevel)), source, ceiling) : { ok: true, xp: 0, levelled: false });
  const caught = ({ damage = 0, countryLevel = 0, source = 'fight', ceiling = null } = {}) =>
    (damage > 0 ? pay('shield', damage * ARMS.xp.perCaught * (1 + .25 * Math.max(0, countryLevel)), source, ceiling) : { ok: true, xp: 0, levelled: false });

  /** The margins he is fighting with right now. */
  const margins = () => marginsFor(Object.fromEntries(ARMS_IDS.map(id => [id, level(id)])));

  const view = () => ARMS_IDS.map(id => ({ id, learned: known(id), level: level(id), practice: state.practice[id] ?? 0 }));

  function snapshot() { return { version: COMBAT_SKILLS_VERSION, practice: { ...state.practice } }; }

  function restore(data) {
    state.practice = {};
    if (!validateCombatSkillsSnapshot(data, { allowMissing: false })) return false;
    state.practice = { ...data.practice };
    return true;
  }

  return { learn, pay, dealt, dodged, hurt, caught, margins, view, snapshot, restore,
    get practice() { return { ...state.practice }; } };
}

/** The level a given amount of experience is, for the starting kits in src/player-characters.js. */
export const armsLevel = (id, xp) => (ARMS_IDS.includes(id) ? skillLevel(id, xp).level : 1);
/** The thresholds every fighting skill climbs, which are the world's. */
export const ARMS_TABLE = RUNESCAPE_TABLE;
