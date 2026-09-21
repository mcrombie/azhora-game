/**
 * **The bow** (docs/combat-brief.md, phase 6; the user's answers of 2026-09-21).
 *
 * The brief calls it the largest single piece of the fighting work, and the reason is that it is
 * the only weapon that is not a swing. Everything else in this game happens where the traveler is
 * standing; an arrow happens somewhere else, a moment later, and may never arrive.
 *
 * Four things are the whole of it:
 *
 *   **Hold to draw, release to loose.** The draw takes `ARMS.draw` seconds, 1.1 at level 1 down to
 *     .6 at 99 (src/combat-skills.js), and it is *held* the way the guard is held: the host offers
 *     the key every frame and nothing here remembers a press. Let go early and the arrow goes,
 *     weak and short, in proportion to how far it was drawn - below `LEAST` it does not go at all.
 *   **An arrow is a thing that travels.** It leaves at `SPEED` metres a second and carries `RANGE`
 *     of them at a full draw. Jerry's own figure is thirty paces.
 *   **The first solid thing stops it.** "In woodland I am a man holding a stick": `solidAt` asks
 *     the world what is in the way, through the same `nearColliders` call the pike's room uses.
 *   **About two in three can be picked up again.** One shaft in three breaks where it lands, and
 *     which one is arithmetic rather than a dice roll, so a test can say so and a player cannot
 *     feel the difference.
 *
 * Pure: no DOM, no three, no world of its own - it is handed one.
 */
const freeze = Object.freeze;

/** The one bow the game has. Every number the user will want to tweak is here. */
export const BOW = freeze({
  id: 'hunting-bow',
  /** What a full draw does where it lands. A bow has no three-swing rhythm: one arrow, one number. */
  damage: 30,
  /** How far a full draw carries. Jerry's thirty paces, in metres. */
  range: 34,
  /** How fast it goes. Fast enough to be an arrow, slow enough to watch one miss. */
  speed: 46,
  /** What a shot costs in wind. A little more than a swing: it is the whole body. */
  wind: 9,
  /** Below this much of a draw, letting go is not a shot. */
  least: .35,
  /** How near an arrow has to pass a thing to be stopped by it, or to hit it. */
  radius: .4,
  /** How high off the ground it flies, which is where a man's chest is. */
  height: 1.25,
  /** One shaft in three breaks where it lands. The other two are still arrows. */
  breaksEvery: 3,
  /** How near the traveler has to be to pick a spent one up. */
  reach: 1.7,
  /** The inventory item, and how many a smith sells at a time. */
  arrow: 'arrow',
});

/** The named weapon Jerry gives away, in the manner the dead men's weapons are named. */
export const JERRYS_BOW = 'Jerry’s spare bow';

const clamp01 = value => (value < 0 ? 0 : value > 1 ? 1 : value);

/**
 * How much of a draw `seconds` of holding is worth, given the traveler's own draw time. A draw
 * never goes past full: holding it longer is only steadier aim, which is the player's business.
 */
export const drawnBy = (seconds, drawTime) =>
  clamp01((Number(seconds) || 0) / (Number(drawTime) > 0 ? drawTime : 1));

/**
 * What an arrow loosed at `pull` of a full draw is worth, and how far it carries. Both fall away
 * together and neither falls to nothing: a half-drawn arrow is a real arrow that does not reach.
 * `damage` is the weapon's own, which has already been through the traveler's skill in Bows.
 */
export function shotAt(pull, { damage = BOW.damage, range = BOW.range } = {}) {
  const drawn = clamp01(pull);
  if (drawn < BOW.least) return null;
  return freeze({ pull: drawn, damage: Math.max(1, Math.round(damage * drawn)), range: range * drawn });
}

/**
 * Is there something solid at this point? The same question the pike asks about its room, asked
 * of one point instead of a circle: `nearColliders` hands back what is near, and a collider is
 * either a circle (`r`) or a box (`hx`, `hz`), exactly as `roomToSwing` reads them.
 *
 * A world with no colliders - a test's - is open ground, which is the right answer and is what
 * lets the flight be measured without building one.
 */
export function solidAt(world, x, z, radius = BOW.radius) {
  for (const collider of world?.nearColliders?.(x, z, radius + 2, []) ?? []) {
    const reach = collider.r ?? Math.hypot(collider.hx ?? 0, collider.hz ?? 0);
    if (Math.hypot(collider.x - x, collider.z - z) < reach + radius) return collider;
  }
  return null;
}

/**
 * **Two in three.** Which shaft breaks is the arrow's own number rather than a roll, so the rule
 * is exactly two in three over any run of them, a test can state it, and a reload cannot change
 * what happened. A player counting his quiver sees two back out of every three he looses.
 */
export const survives = n => (Math.floor(Number(n) || 0) % BOW.breaksEvery) !== 0;
/** How many of `loosed` arrows come back, which is what the rule above adds up to. */
export const recoveredOf = loosed =>
  Math.max(0, Math.floor(Number(loosed) || 0)) - Math.floor(Math.max(0, Math.floor(Number(loosed) || 0)) / BOW.breaksEvery);

/**
 * One arrow's flight, for measuring it without a fight: where it starts, where it is at a moment,
 * and what stops it first. `world` may be null, which is open ground.
 *
 * This is the same arithmetic `combat.update` runs a step at a time, written once so that a test
 * can ask "where does it stop" without standing a traveler in a wood.
 */
export function flightOf({ x = 0, z = 0, yaw = 0, range = BOW.range, world = null, step = .25 } = {}) {
  const dx = Math.sin(yaw), dz = Math.cos(yaw);
  for (let travelled = step; travelled <= range; travelled += step) {
    const at = { x: x + dx * travelled, z: z + dz * travelled };
    const solid = solidAt(world, at.x, at.z);
    if (solid) return freeze({ ...at, travelled, stopped: 'solid', collider: solid });
  }
  return freeze({ x: x + dx * range, z: z + dz * range, travelled: range, stopped: 'spent', collider: null });
}
