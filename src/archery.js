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
 *     **And the first body**, whoever it belongs to (the user, 2026-09-21: arrows hurt whoever
 *     they hit), **and ground that rises above the flight**, which is why the flight has a height
 *     at all.
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
  /**
   * **How near an arrow has to pass a body to stop on it**, measured from the body's middle. A
   * person is about that wide across the shoulders, and it is the figure the fight already used
   * for an enemy, written down here now that friends stop arrows too.
   */
  body: .9,
  /**
   * How far an arrow is down range before the people standing beside the archer are in its way.
   * A companion keeps nine tenths of a metre off the traveler's elbow and no further, so without
   * this every shot in a crowded file would end in the back of the man at his shoulder. The
   * archer's own body space, and nothing more: a tree at half a metre still stops the shot.
   */
  clearOfShooter: 1.2,
  /**
   * **How near a friend has to be to the line for an archer to hold his shot.** Wider than
   * `body`, because a man shifting his feet must not be clipped by a shot already loosed: Jerry
   * never shoots a friend on purpose, so he leaves himself the margin rather than the arrow.
   */
  corridor: 1.4,
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
 * How high the ground is under a point, asked of a world that may not have one. A world with no
 * floor - a test's - is flat at nought, which is the right answer and lets a flight be measured
 * without building one.
 */
export function groundAt(world, x, z) {
  const floor = world?.heightAt?.(x, z);
  return Number.isFinite(floor) ? floor : 0;
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
 *
 * **An arrow has a height**, and it is the plainest model that answers the question the user
 * asked: it leaves the bow at a man's chest and flies level at that height. Thirty-four metres at
 * forty-six a second is nine tenths of a second, which is flat enough to call flat; what matters
 * is that the flight is somewhere rather than nowhere, so that **ground rising above it stops
 * it** - a bank, a terrace, the near side of a ravine - exactly as a tree does. The arrow's own
 * drop is left out on purpose: it would be a number nobody has chosen, and it would move the
 * range of every shot in the game (docs/design-answers.md, 2026-09-21).
 */
export function flightOf({ x = 0, z = 0, yaw = 0, range = BOW.range, world = null, step = .25, height = BOW.height } = {}) {
  const dx = Math.sin(yaw), dz = Math.cos(yaw);
  const y = groundAt(world, x, z) + height;
  for (let travelled = step; travelled <= range; travelled += step) {
    const at = { x: x + dx * travelled, z: z + dz * travelled };
    const solid = solidAt(world, at.x, at.z);
    if (solid) return freeze({ ...at, y, travelled, stopped: 'solid', collider: solid });
    if (groundAt(world, at.x, at.z) > y) return freeze({ ...at, y, travelled, stopped: 'ground', collider: null });
  }
  return freeze({ x: x + dx * range, z: z + dz * range, y, travelled: range, stopped: 'spent', collider: null });
}

/**
 * **Is anybody standing in the corridor of this shot?** The line from `from` to `to`, `corridor`
 * metres either side of it, with the archer's own body space left out at the near end and the
 * target's at the far one. `bodies` is whatever the caller counts as a body: `{x, z}` is all that
 * is read of each. The first one found is handed back, so a caller can say who.
 *
 * One piece of arithmetic for two callers: the ally archer, who will not loose while a friend is
 * in it, and the host, which will not set a straw mark across anybody (src/main.js).
 */
export function inTheLine(from, to, bodies = [], { corridor = BOW.corridor, near = BOW.clearOfShooter, far = 0 } = {}) {
  const dx = to.x - from.x, dz = to.z - from.z, span = Math.hypot(dx, dz);
  if (!(span > 1e-6)) return null;
  const ux = dx / span, uz = dz / span;
  for (const body of bodies) {
    if (!body || !Number.isFinite(body.x) || !Number.isFinite(body.z)) continue;
    const along = (body.x - from.x) * ux + (body.z - from.z) * uz;
    if (along <= near || along >= span - far) continue;
    if (Math.abs((body.x - from.x) * uz - (body.z - from.z) * ux) <= corridor + (body.r ?? 0)) return body;
  }
  return null;
}
