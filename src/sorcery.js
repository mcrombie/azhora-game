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
 * Pure spell numbers. `src/magic.js` spends the pool and drives casts, `src/combat.js`
 * resolves encounter health, and `src/skills.js` carries school experience.
 */
import { RUNESCAPE_TABLE, SKILLS } from './skills.js';

export const SORCERY_VERSION = 1;

/** The heading the schools sit under in the journal's grid. */
export const SORCERY_HEADING = 'Sorcery';

/**
 * The schools. Ben teaches Fireball, Liz Summon Bees, and Troy Mind Read.
 * Frost and Wards remain named places for later spells.
 */
export const SCHOOLS = Object.freeze({
  fire: Object.freeze({ id: 'fire', name: SKILLS.fire.name, spells: Object.freeze(['fireball']) }),
  mind: Object.freeze({ id: 'mind', name: SKILLS.mind.name, spells: Object.freeze(['mindread']) }),
  beast: Object.freeze({ id: 'beast', name: SKILLS.beast.name, spells: Object.freeze(['summon-bees']) }),
  frost: Object.freeze({ id: 'frost', name: SKILLS.frost.name, reserved: true, spells: Object.freeze([]) }),
  wards: Object.freeze({ id: 'wards', name: SKILLS.wards.name, reserved: true, spells: Object.freeze([]) }),
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
    /** Experience per point of damage a spell deals. Fire is paid this way, and so are the bees. */
    perDamage: .8,
    /** A killing blow pays a little extra, as a share of what the blow itself paid. */
    killing: .5,
    /**
     * **And a spell that hurts nobody still has to be paid.** Mindread deals no damage at all,
     * so damage cannot be what teaches it; what teaches it is doing it and learning something,
     * which is the same shape as every other skill in the game - the rod pays for a fish and not
     * for a cast. A read that turns nothing up pays nothing.
     */
    perReading: 34,
  }),
});

/**
 * The introductory spells. `cost` is focus, `cast` is how long the throw takes,
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
  /**
   * **Mindread** (Troy's, in Cobble): a second thing to say in any conversation, which often
   * turns something up and sometimes does not. It deals nothing and it is not thrown, so it has
   * no cast time and no reach beyond the person you are already talking to - what it costs is
   * focus, and what a conversation gives up is decided by whoever wrote that conversation.
   */
  mindread: Object.freeze({
    id: 'mindread', school: 'mind', name: 'Mind Read',
    cost: Object.freeze({ low: 25, high: 10 }),
    cast: Object.freeze({ low: 0, high: 0 }),
    damage: Object.freeze({ low: 0, high: 0 }),
    range: 4, speed: 0, radius: 0, spoken: true,
  }),
  /**
   * **Summon bees** (Liz's, in Pueth): a swarm comes, and it goes for whoever is going for you.
   * With nothing to sting they wander off, which is the whole of their discipline. The damage is
   * the swarm's, dealt over the time it stays, and it is what pays the school.
   */
  'summon-bees': Object.freeze({
    id: 'summon-bees', school: 'beast', name: 'Summon Bees',
    cost: Object.freeze({ low: 30, high: 18 }),
    cast: Object.freeze({ low: .9, high: .55 }),
    damage: Object.freeze({ low: 4, high: 11 }),
    range: 9, speed: 5.5, radius: 2.2, swarm: true,
    /** How long they stay, and how often each sting lands. */
    stay: Object.freeze({ low: 7, high: 16 }), sting: .8,
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
    spoken: !!spell.spoken, swarm: !!spell.swarm,
    ...(spell.swarm ? { stay: between(spell.stay, level), sting: spell.sting } : {}),
  });
}

/** The pool and how fast it comes back, at a level. */
export function focusAt(level = 1) {
  return Object.freeze({ focus: Math.round(between(SORCERY.focus, level)), regain: +between(SORCERY.regain, level).toFixed(2) });
}

/** What a reading pays Mind, when it actually turned something up. */
export const readingXp = ({ learned = false } = {}) => (learned ? SORCERY.xp.perReading : 0);

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
