import { colliderOverlapsHeight } from '../../world/collision/walk-surfaces.js';

// Q/E are single-key shortcuts for the existing W+A / W+D diagonals.
// Merge directional intent before normalization so overlapping keys never
// change the angle or make diagonal travel faster than ordinary walking.
export function getMovementInput(keys) {
  const forward = Number(keys.has('KeyW') || keys.has('ArrowUp') || keys.has('KeyQ') || keys.has('KeyE'))
    - Number(keys.has('KeyS') || keys.has('ArrowDown'));
  const side = Number(keys.has('KeyD') || keys.has('ArrowRight') || keys.has('KeyE'))
    - Number(keys.has('KeyA') || keys.has('ArrowLeft') || keys.has('KeyQ'));
  const length = Math.hypot(forward, side);
  return length ? { forward: forward / length, side: side / length } : { forward: 0, side: 0 };
}

/** The height at which ground stops holding a person up. Above it you walk; below it you swim. */
export const WATERLINE = 0.45;

/** Inside the world, and clear of everything solid in it. Both halves of the waterline need this. */
/**
 * River and pond markers describe water coverage, not solid walls. Their collision radius
 * overlaps the dry bank; blocking a walker there left a strip that was neither standable
 * nor swimmable. The ground and local water heights below decide whether to walk or swim.
 */
const WATER_COLLIDERS = new Set(['river-water', 'pond-water']);

function clearHere(x, z, world, radius, afloat = false, feetY = world.feetY) {
  const b = world.bounds;
  if (x < b.minX + radius || x > b.maxX - radius || z < b.minZ + radius || z > b.maxZ - radius) return false;
  // The shapes that could reach this point, from the world's grid (src/world/collision/collider-grid.js);
  // a world without one — a test's stand-in — is asked for its whole list, as before.
  const near = world.nearColliders ? world.nearColliders(x, z, radius) : world.colliders;
  for (let i = 0; i < near.length; i++) {
    const c = near[i];
    if (WATER_COLLIDERS.has(c.kind)) continue;
    if ((Number.isFinite(c.minY) || Number.isFinite(c.maxY))
      && !colliderOverlapsHeight(c, feetY ?? (feetY = world.heightAt(x, z)))) continue;
    if (c.r !== undefined) { const dx = x - c.x, dz = z - c.z, reach = c.r + radius; if (dx * dx + dz * dz < reach * reach) return false; }
    else if (Math.abs(x - c.x) < c.hx + radius && Math.abs(z - c.z) < c.hz + radius) return false;
  }
  return true;
}

/**
 * **Water has a surface, and it is not all at one height** (the user, 22 September 2026: all
 * rivers should be real swimmable water). The sea lies at `WATERLINE`; a river lies wherever its
 * own bed carried it, which for the Caloss is about two and three quarter metres above the sea
 * and for one reach of hill country is twenty-eight. Asking one global line whether a point is
 * wet answered "dry" for every river in the world, which is why they were walled instead.
 *
 * A world that does not know about water bodies — a test's stand-in — answers the sea, which is
 * exactly what this did before.
 */
export const waterAt = (x, z, world) => world?.waterAt?.(x, z) ?? WATERLINE;

export function canStand(x, z, world, radius = 0.34, feetY) {
  return clearHere(x, z, world, radius, false, feetY) && world.heightAt(x, z) >= waterAt(x, z, world);
}

/**
 * Water a person can be in: inside the world, clear of every hull, pier and rock, and under the
 * waterline. It is `canStand`'s exact complement, which is the point of writing it this way - every
 * point of the world is standable, swimmable, or solid, and never two of those (docs/swimming.md).
 * Depth is not a gate: nothing is too deep to enter. Distance is what refuses you, and it refuses
 * you by drowning you.
 */
export function canSwim(x, z, world, radius = 0.34, feetY) {
  return clearHere(x, z, world, radius, true, feetY) && world.heightAt(x, z) < waterAt(x, z, world);
}

/**
 * `radius` is the mover's footprint: a person by default, wider for a rider on a horse. A swimmer
 * may cross the waterline in either direction, which is what lets somebody swim to a beach and
 * walk out of the sea without a prompt or a key.
 */
export function moveCharacter(position, dx, dz, world, radius, { swimming = false, canTraverse = null } = {}) {
  const passable = swimming
    ? (x, z) => canStand(x, z, world, radius, position.y) || canSwim(x, z, world, radius, position.y)
    : (x, z) => canStand(x, z, world, radius, position.y);
  const steps = Math.max(1, Math.ceil(Math.hypot(dx,dz)/0.18));
  for(let i=0;i<steps;i++) {
    if(passable(position.x+dx/steps,position.z) && (!canTraverse || canTraverse(position.x,position.z,position.x+dx/steps,position.z))) position.x+=dx/steps;
    if(passable(position.x,position.z+dz/steps) && (!canTraverse || canTraverse(position.x,position.z,position.x,position.z+dz/steps))) position.z+=dz/steps;
  }
  return position;
}
