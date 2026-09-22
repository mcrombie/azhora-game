/**
 * **Sorcery**: a second table of skills beside Arms, and a third bar beside health and wind.
 *
 * The user, 22 September 2026, with Ben the fire sorcerer: "Sorcery is its own table of skills
 * like arms is... Wands and staves augment sorcery... How sorcery works will need to be fleshed
 * out in more detail." So this is the shape, not the whole of it: one school built, the rest
 * named and waiting, and the four decisions that make it feel like anything taken in the open.
 *
 * **What it costs: focus.** Its own pool, decided against spending wind or health for it (the
 * user's choice of four). A fireball is twenty focus out of sixty at level one, so a caster gets
 * three of them and then has to be somebody with a weapon for a while. It comes back slowly, and
 * only when nothing is swinging at him: fire is not a thing you do while being hit.
 *
 * **What it costs to carry: the weapon hand.** A wand or a staff is not an accessory that makes
 * a spell better - it is the weapon, and you have one or the other. A traveler with a sword has
 * no spell at all, and a traveler with a wand has a wand, which is a poor thing to hit somebody
 * with. That is the strongest version of the trade and it is the user's: "Required, and it is the
 * weapon slot." It is also why Ben carries nothing else.
 *
 * **What it scales.** The same shape as `ARMS`: two ends and a straight line between them, read
 * off the traveler's level in the school. Damage climbs, the cost falls, the pool deepens and the
 * cast comes off quicker - so a sorcerer at fifty is not throwing a different fireball, he is
 * throwing the same one oftener and for longer.
 *
 * **What pays it.** Damage dealt with a spell pays that spell's school, the way a blow pays its
 * weapon's family. Nothing else pays it: there is no straw post for fire, which is why somebody
 * has to show you (Ben) and why the first thing you do with it is a spider.
 *
 * Pure: no DOM, no three, no world. `src/combat.js` spends the pool and `src/skills.js` carries
 * the names.
 */
import { RUNESCAPE_TABLE } from './skills.js';

export const SORCERY_VERSION = 1;

/** The heading the schools sit under in the journal's grid. */
export const SORCERY_HEADING = 'Sorcery';

/**
 * The schools. **Fire is built**; the rest are named so that a spell arriving later has a home
 * rather than a decision, which is the same courtesy `ARMS_SKILLS` does for unbuilt weapons.
 * Nothing is taught by anybody yet but fire, and Ben is the only one who teaches that.
 */
export const SCHOOLS = Object.freeze({
  fire: Object.freeze({ id: 'fire', spells: Object.freeze(['fireball']) }),
  frost: Object.freeze({ id: 'frost', spells: Object.freeze([]) }),
  wards: Object.freeze({ id: 'wards', spells: Object.freeze([]) }),
});
export const SCHOOL_IDS = Object.freeze(Object.keys(SCHOOLS));

/**
 * What a sorcerer's numbers are at level 1 and at 99, and a straight line between. `focus` is the
 * pool; `regain` is focus a second, and it only runs when nothing is attacking him.
 */
export const SORCERY = Object.freeze({
  /** The pool a spell is paid out of. */
  focus: Object.freeze({ low: 60, high: 200 }),
  /** Focus a second, out of a fight. A full bar from empty is 30 s at level 1 and 13 s at 99. */
  regain: Object.freeze({ low: 2, high: 15 }),
  /** What a wand does for the cast, and what a staff does: slower, and worth it. */
  wand: Object.freeze({ damage: 1, cast: 1 }),
  staff: Object.freeze({ damage: 1.45, cast: 1.35 }),
  xp: Object.freeze({
    /** Experience per point of damage a spell deals, which is the only thing that pays a school. */
    perDamage: .8,
    /** A killing blow pays a little extra, as a share of what the blow itself paid. */
    killing: .5,
  }),
});

/**
 * The spells. One, for now, and it is deliberately the plainest thing in the world: a ball of
 * fire thrown at what you are looking at. `cost` is focus, `cast` is how long the throw takes,
 * `damage` is what it does before the school's own multiplier and the weapon's.
 */
export const SPELLS = Object.freeze({
  fireball: Object.freeze({
    id: 'fireball', school: 'fire', name: 'Fireball',
    cost: Object.freeze({ low: 20, high: 12 }),
    cast: Object.freeze({ low: 1.15, high: .7 }),
    damage: Object.freeze({ low: 26, high: 78 }),
    range: 18, speed: 17, radius: .34,
  }),
});
export const SPELL_IDS = Object.freeze(Object.keys(SPELLS));

/** Which school a spell belongs to; a spell nobody has claimed answers null. */
export const schoolOf = spell => SPELLS[spell]?.school ?? null;

/** The weapons that can cast at all, and what each does to the cast. */
export const FOCUS_WEAPONS = Object.freeze({ wand: 'wand', 'oak-staff': 'staff' });
export const castsWith = weapon => FOCUS_WEAPONS[weapon] ?? null;

const clampLevel = level => Math.max(1, Math.min(99, Math.floor(Number(level) || 1)));
/** Straight from `low` at level 1 to `high` at 99, which is how `ARMS` reads too. */
const between = (band, level) => band.low + (band.high - band.low) * ((clampLevel(level) - 1) / 98);

/**
 * The numbers a caster throws with, given what he knows and what is in his hand. `weapon` is the
 * item id; anything that is not a wand or a staff answers `null`, because a man holding a sword
 * is not casting anything.
 */
export function castWith(spellId, { level = 1, weapon = null } = {}) {
  const spell = SPELLS[spellId];
  const kind = castsWith(weapon);
  if (!spell || !kind) return null;
  const tool = SORCERY[kind];
  return Object.freeze({
    id: spell.id, school: spell.school, kind,
    cost: Math.round(between(spell.cost, level)),
    cast: +(between(spell.cast, level) * tool.cast).toFixed(3),
    damage: Math.round(between(spell.damage, level) * tool.damage),
    range: spell.range, speed: spell.speed, radius: spell.radius,
  });
}

/** The pool and how fast it comes back, at a level. */
export function focusAt(level = 1) {
  return Object.freeze({ focus: Math.round(between(SORCERY.focus, level)), regain: +between(SORCERY.regain, level).toFixed(2) });
}

/** What a spell's damage pays its school, the way a blow pays its weapon's family. */
export const spellXp = (damage, { killing = false } = {}) => {
  const paid = Math.max(0, Number(damage) || 0) * SORCERY.xp.perDamage;
  return Math.round(paid * (killing ? 1 + SORCERY.xp.killing : 1));
};

/**
 * The level a school's experience buys. The same table every other skill is read from, walked the
 * same way `skillLevel` walks it (src/skills.js) - written here rather than imported because the
 * schools are registered in that file and this one must not depend on that having happened yet.
 */
export function schoolLevel(xp) {
  const points = Math.max(0, Math.floor(Number(xp) || 0));
  let level = 1;
  while (level < RUNESCAPE_TABLE.length && points >= RUNESCAPE_TABLE[level]) level++;
  return level;
}
