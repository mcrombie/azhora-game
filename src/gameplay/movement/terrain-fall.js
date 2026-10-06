/** Ordinary walking can leave a ledge; only the traveler controller owns gravity and its pose.
 * These rules distinguish a small step or a walkable descent from losing ground support. */
import { CLIMBING } from './climbing.js';

export const TERRAIN_FALL = Object.freeze({ stepDown: .45, gravity: CLIMBING.gravity,
  safeDrop: CLIMBING.safeDrop, damagePerMetre: 5, maxDamage: 100, maxDriftSpeed: 11.5, jumpVelocity: 8.2, airAcceleration: 8 });

export function shouldStartTerrainFall({ before, after, floor, groundSlope = 0 }) {
  if (!before || !after || ![before.x, before.y, before.z, after.x, after.z, floor].every(Number.isFinite)) return false;
  const drop = before.y - floor;
  if (drop > TERRAIN_FALL.stepDown) return true;
  const travel = Math.hypot(after.x - before.x, after.z - before.z);
  // A high frame rate must not turn a cliff into many tiny, individually safe steps.
  return travel > 1e-5 && drop > 1e-4
    && (drop / travel > CLIMBING.grabSlope || groundSlope > CLIMBING.grabSlope);
}

/** Keep the highest airborne foot position until landing; never reset it at an intermediate
 * contact with a steep face. Swimming has its own hazards and cushions the impact. */
export function terrainFallDamage(drop, { water = false } = {}) {
  if (water || !Number.isFinite(drop)) return 0;
  return Math.min(TERRAIN_FALL.maxDamage,
    Math.max(0, Math.round((drop - TERRAIN_FALL.safeDrop) * TERRAIN_FALL.damagePerMetre)));
}

/** Airborne feet keep their own height instead of snapping to every new ground sample.
 * Horizontal collision and border policy stay with the caller. `steer` is normalized world-space
 * input; `drift` is metres per second carried from the walk/run that left the edge. */
export function createTerrainFall() {
  let active = false, velocity = 0, peak = 0, elapsed = 0, drift = { x: 0, z: 0 };
  let landed = false, damage = 0;
  const capDrift = () => {
    const length = Math.hypot(drift.x, drift.z), scale = Math.min(1, TERRAIN_FALL.maxDriftSpeed / (length || 1));
    drift.x *= scale; drift.z *= scale;
  };
  const view = () => ({ active, velocity, peak, elapsed, drift: { ...drift }, landed, damage });
  function begin(position, options = {}) {
    if (!position || !Number.isFinite(position.y)) return false;
    active = true; velocity = Number.isFinite(options.velocity) ? options.velocity : 0;
    peak = position.y; elapsed = 0; landed = false; damage = 0;
    drift = { x: Number.isFinite(options.drift?.x) ? options.drift.x : 0,
      z: Number.isFinite(options.drift?.z) ? options.drift.z : 0 };
    capDrift(); return true;
  }
  function tick(dt, { position, surfaceAt, moveHorizontal, steer = { x: 0, z: 0 }, playing = true } = {}) {
    landed = false; damage = 0;
    if (!active || !playing || !Number.isFinite(dt) || dt <= 0) return view();
    const duration = Math.min(dt, .25), steps = Math.max(1, Math.ceil(duration / .025)), step = duration / steps;
    const sx = Number.isFinite(steer.x) ? steer.x : 0, sz = Number.isFinite(steer.z) ? steer.z : 0;
    const magnitude = Math.max(1, Math.hypot(sx, sz));
    for (let i = 0; i < steps && active; i++) {
      elapsed += step;
      const beforeY = position.y;
      const start = surfaceAt(position.x, position.z, { maxY: beforeY });
      const steepContact = !start.water && start.slope > CLIMBING.grabSlope
        && position.y <= start.height + .08 && velocity <= 0;
      drift.x += sx / magnitude * TERRAIN_FALL.airAcceleration * step; drift.z += sz / magnitude * TERRAIN_FALL.airAcceleration * step;
      if (steepContact) {
        // A broad cliff can be touched many times during one fall. Gravity pulls the feet
        // downslope until they reach a walkable shelf; those touches do not erase the drop.
        const gradient = start.gradient ?? { x: 0, z: 0 }, slide = Math.min(8, 2.6 + elapsed * 3.5);
        drift.x = -gradient.x * slide + sx / magnitude * .5;
        drift.z = -gradient.z * slide + sz / magnitude * .5;
      }
      capDrift();
      const bx = position.x, bz = position.z;
      if (moveHorizontal) moveHorizontal(position, drift.x * step, drift.z * step);
      else { position.x += drift.x * step; position.z += drift.z * step; }
      velocity -= TERRAIN_FALL.gravity * step;
      position.y += velocity * step;
      peak = Math.max(peak, position.y);
      // Resolve against the previous feet height, so a fast fall cannot pass through a deck.
      const ground = surfaceAt(position.x, position.z, { maxY: beforeY });
      if (velocity <= 0 && position.y <= ground.height) {
        position.y = ground.height;
        const blocked = Math.hypot(position.x - bx, position.z - bz) < 1e-5;
        if (ground.water || ground.slope <= CLIMBING.grabSlope || (blocked && elapsed > .3)) {
          active = false; landed = true;
          damage = terrainFallDamage(peak - position.y, { water: !!ground.water });
        }
        velocity = 0;
      }
    }
    return view();
  }
  return { begin, tick, view,
    cancel() { active = false; velocity = peak = elapsed = damage = 0; landed = false; drift = { x: 0, z: 0 }; },
    get active() { return active; } };
}
