/**
 * People and animals are solid to one another. The traveler bumps into a
 * passer-by instead of walking through them; a villager on a lane steps round
 * the traveler, or round another villager, instead of passing through.
 *
 * Bodies are rebuilt every frame from whoever is standing about. A mover is
 * never blocked by its own body, nor by one it already overlaps, so two people
 * who have ended up in the same spot (a warp, a spawn, a story start) can
 * always walk themselves apart.
 */
import { moveCharacter } from './game-state.js';

/** Footprints, in metres of radius. */
export const BODY = Object.freeze({ person: .3, traveler: .34, dog: .26, cat: .15, horse: .5, ogre: 1.05, wolf: .32 });

/**
 * A view of `world` whose colliders include the frame's bodies. `moving(who, radius)`
 * says who is about to move: `who` is read live (its position may change mid-step).
 * `ignore` lists collider kinds this mover passes over: a cat hops a crate.
 */
export function bodyWorld(world, { ignore = [] } = {}) {
  let bodies = [], mover = null, moverRadius = BODY.traveler;
  const adapter = {
    get bounds() { return world.bounds; },
    get colliders() { return world.colliders; },
    heightAt: (x, z) => world.heightAt(x, z),
    nearColliders(x, z, reach = 0, out) {
      const near = world.nearColliders ? world.nearColliders(x, z, reach, out) : [...world.colliders];
      if (ignore.length) { let kept = 0; for (let i = 0; i < near.length; i++) if (!ignore.includes(near[i].kind)) near[kept++] = near[i]; near.length = kept; }
      for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        if (mover && (body.id === mover.id || Math.hypot(body.x - mover.x, body.z - mover.z) < body.r + moverRadius)) continue;
        if (Math.abs(body.x - x) <= body.r + reach && Math.abs(body.z - z) <= body.r + reach) near.push(body);
      }
      return near;
    },
    /** Who is standing about this frame: [{ id, x, z, r }]. */
    setBodies(list) { bodies = list; return adapter; },
    /** Who is about to move, and how wide it is. */
    moving(who, radius = BODY.traveler) { mover = who; moverRadius = radius; return adapter; },
    get bodies() { return bodies; },
  };
  return adapter;
}

/**
 * Take a step; if someone is in the way, try a little to either side before
 * giving up, the way two people meeting on a path each lean aside. Returns the
 * distance actually moved.
 */
export function stepAround(position, dx, dz, world, radius, side = 1) {
  const want = Math.hypot(dx, dz);
  if (!(want > 0)) return 0;
  const start = { x: position.x, z: position.z };
  moveCharacter(position, dx, dz, world, radius);
  const moved = Math.hypot(position.x - start.x, position.z - start.z);
  if (moved >= want * .6) return moved;
  for (const turn of [.6, -.6, 1.2, -1.2]) {
    const angle = turn * side, c = Math.cos(angle), s = Math.sin(angle), trial = { x: start.x, z: start.z };
    moveCharacter(trial, dx * c - dz * s, dx * s + dz * c, world, radius);
    const got = Math.hypot(trial.x - start.x, trial.z - start.z);
    if (got >= want * .6) { position.x = trial.x; position.z = trial.z; return got; }
  }
  return moved;
}
