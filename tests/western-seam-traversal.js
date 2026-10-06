import { moveCharacter, canStand } from '../src/gameplay/movement/game-state.js';
import { bodyWorld, BODY } from '../src/gameplay/combat/bodies.js';
import { canWalkSlope } from '../src/gameplay/movement/climbing.js';
import { canPushThrough } from '../src/world/scenery/undergrowth.js';
import { closedRegionEntered } from '../src/world/travel/closed-border.js';
import { SWIM } from '../src/gameplay/movement/swimming.js';
import { WALK_STEP } from '../src/world/collision/walk-surfaces.js';
import { createTerrainFall, shouldStartTerrainFall } from '../src/gameplay/movement/terrain-fall.js';

export const WESTERN_SEAM_CROSSINGS = Object.freeze([
  { name: 'Isareos internal dry edge', x: -2300.4349406410192, z: -201.6901076758503, nx: .5, nz: .8660254037844387 },
  { name: 'Meneth / West Lotharn dry edge', x: -2099.5689152372347, z: -259.9251345948129, nx: -.5, nz: -.866025403784437 },
  { name: 'Elagos / Nesdor dry edge', x: -1450.4349406410201, z: 346.29264805429415, nx: -.5, nz: .866025403784438 },
]);

/** Static production scene with real colliders, support acquisition and falling.
 * A normal 4.2 m/s walk holds the direction toward the opposite point; it does
 * not jump, climb, bypass collision, teleport around props, or erase fall damage.
 * Water uses the same support adapter as main.js but these routes must stay dry.
 */
export function walkWesternSeam(world, row, reverse = false, halfSpan = 18) {
  const point = side => ({ x: row.x + side * row.nx * halfSpan, z: row.z + side * row.nz * halfSpan });
  const start = point(reverse ? 1 : -1), goal = point(reverse ? -1 : 1);
  const at = { ...start, y: world.heightAt(start.x, start.z) }, initial = { ...at };
  const fall = createTerrainFall(), dt = 1 / 30, speed = 4.2, falls = [], landings = [];
  const playerWorld = bodyWorld(world).moving(at, BODY.traveler, 'traveler');
  const climbWorld = { ...world, nearColliders: (x, z, r) => playerWorld.nearColliders(x, z, r) };
  const surfaceAt = (x, z, { maxY = at.y, stepUp = fall.active ? 0 : WALK_STEP } = {}) => {
    const support = world.supportAt(x, z, { maxY, stepUp });
    if (support.id) return { ...support, water: false };
    const water = world.waterAt(x, z);
    return Number.isFinite(water) && support.height < water
      ? { height: Math.max(support.height, water - SWIM.sink), slope: 0, gradient: { x: 0, z: 0 }, water: true }
      : { ...support, water: false };
  };
  const fallingWorld = { ...world,
    heightAt: (x, z) => world.supportAt(x, z, { maxY: at.y, groundSlope: false }).height,
    nearColliders: (x, z, r) => playerWorld.nearColliders(x, z, r).filter(c => c.kind !== 'suval-peak-face') };
  let frames = 0, walked = 0, damage = 0, stalled = 0, wetFrames = 0, biggestGroundedRise = 0;
  let maxSupportGap = 0, maxSlope = 0;
  for (; frames < 3600; frames++) {
    const distance = Math.hypot(goal.x - at.x, goal.z - at.z);
    if (distance <= .2 && !fall.active) break;
    const dx = (goal.x - at.x) / (distance || 1), dz = (goal.z - at.z) / (distance || 1), before = { ...at };
    if (!fall.active) {
      moveCharacter(at, dx * Math.min(speed * dt, distance), dz * Math.min(speed * dt, distance),
        playerWorld, BODY.traveler, { swimming: true,
          canTraverse: (x, z, nx, nz) => canWalkSlope(x, z, nx, nz, climbWorld) && canPushThrough(x, z, nx, nz, climbWorld) });
      const support = surfaceAt(at.x, at.z); maxSlope = Math.max(maxSlope, support.slope);
      if (!support.water && shouldStartTerrainFall({ before, after: at, floor: support.height, groundSlope: support.slope })) {
        falls.push({ before, after: { ...at }, floor: support.height, slope: support.slope });
        fall.begin(at, { drift: { x: (at.x - before.x) / dt, z: (at.z - before.z) / dt } });
      } else {
        biggestGroundedRise = Math.max(biggestGroundedRise, support.height - before.y);
        at.y = support.height;
      }
    }
    if (fall.active) {
      const state = fall.tick(dt, { position: at, steer: { x: dx, z: dz }, surfaceAt,
        moveHorizontal: (p, x, z) => moveCharacter(p, x, z, fallingWorld, BODY.traveler,
          { swimming: true, canTraverse: (x, z, nx, nz) => fallingWorld.heightAt(nx, nz) <= p.y + WALK_STEP
            && !closedRegionEntered({ x, z }, { x: nx, z: nz }) }) });
      damage += state.damage;
      if (state.landed) landings.push({ ...at, damage: state.damage });
    }
    const moved = Math.hypot(at.x - before.x, at.z - before.z), support = surfaceAt(at.x, at.z);
    walked += moved; wetFrames += +support.water;
    if (!fall.active) maxSupportGap = Math.max(maxSupportGap, Math.abs(at.y - support.height));
    stalled = moved < .001 ? stalled + dt : 0;
    if (stalled > 3 || falls.length > 20) break;
  }
  return { name: row.name, direction: reverse ? 'reverse' : 'forward', halfSpan, initial, goal, at,
    clearStart: canStand(start.x, start.z, world, BODY.traveler), complete: Math.hypot(goal.x - at.x, goal.z - at.z) <= .2 && !fall.active,
    walked, frames, damage, wetFrames, biggestGroundedRise, maxSupportGap, maxSlope,
    falls, landings, nearbyAtStop: world.nearColliders(at.x, at.z, 1).map(c => ({ kind: c.kind, x: c.x, z: c.z, r: c.r })) };
}
