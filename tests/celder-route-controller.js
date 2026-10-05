import { moveCharacter, canStand, canSwim, waterAt } from '../src/game-state.js';
import { bodyWorld, BODY } from '../src/bodies.js';
import { canWalkSlope } from '../src/climbing.js';
import { canPushThrough } from '../src/undergrowth.js';
import { closedRegionEntered } from '../src/closed-border.js';
import { createTerrainFall, shouldStartTerrainFall } from '../src/terrain-fall.js';
import { WALK_STEP } from '../src/walk-surfaces.js';
import { SWIM, swimStep, swimSpeed } from '../src/swimming.js';
import { createSkills } from '../src/skills.js';
import { createLocomotionSkills } from '../src/locomotion-skills.js';
import { createCombat } from '../src/combat.js';

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const copy = p => ({ x: p.x, y: p.y, z: p.z });
const DT = 1 / 30;

/** One novice traveler for an entire journey. The host order follows main.js:
 * movement, locomotion practice/combat recovery, support/fall, then swimming.
 * No mount, armour, sprint, flight, auto-climb, health restoration or teleport.
 * A route can deliberately steer around a prop by authored waypoints; the
 * controller itself never nudges or ignores a collider to reach its target.
 */
export function createCelderRouteController(world, start) {
  const at = { x: start.x, z: start.z, y: world.heightAt(start.x, start.z) };
  const initial = copy(at), fall = createTerrainFall(), skills = createSkills();
  const locomotion = createLocomotionSkills({ skills });
  const playerWorld = bodyWorld(world).moving(at, BODY.traveler, 'traveler');
  const climbWorld = { ...world, nearColliders: (x, z, r) => playerWorld.nearColliders(x, z, r) };
  const combat = createCombat({ world: playerWorld, position: at });
  const player = combat.state.player;
  let inWater = false, elapsed = 0;
  const totals = { walked: 0, swum: 0, swimSeconds: 0, windSpent: 0, windRecovered: 0, leastWind: player.stamina,
    damage: 0, biggestGroundedRise: 0, maxDrySlope: 0, falls: [], landings: [], waterTransitions: [], regions: [] };
  const clearStart = canStand(at.x, at.z, playerWorld, BODY.traveler);
  const surfaceAt = (x, z, { maxY = at.y, stepUp = fall.active ? 0 : WALK_STEP } = {}) => {
    const support = world.supportAt(x, z, { maxY, stepUp });
    if (support.id) return { ...support, water: false };
    const water = waterAt(x, z, world);
    return support.height < water
      ? { height: Math.max(support.height, water - SWIM.sink), slope: 0, gradient: { x: 0, z: 0 }, water: true }
      : { ...support, water: false };
  };
  const fallingWorld = { bounds: world.bounds, waterAt: playerWorld.waterAt,
    heightAt: (x, z) => world.supportAt(x, z, { maxY: at.y, groundSlope: false }).height,
    nearColliders: (x, z, r) => playerWorld.nearColliders(x, z, r).filter(c => c.kind !== 'suval-peak-face') };
  const walkingSlope = (x, z, nx, nz) => !closedRegionEntered({ x, z }, { x: nx, z: nz })
    && canWalkSlope(x, z, nx, nz, climbWorld) && canPushThrough(x, z, nx, nz, climbWorld);

  function frame(goal) {
    const before = copy(at), d = distance(at, goal), dx = (goal.x - at.x) / (d || 1), dz = (goal.z - at.z) / (d || 1);
    const priorWet = inWater, priorHp = player.hp;
    const pace = locomotion.pace({ run: false, stamina: player.stamina, maxStamina: player.maxStamina });
    if (!fall.active) {
      const speed = (inWater ? swimSpeed(skills.level('swimming') || 1) : pace.speed) * combat.movementScale();
      const length = Math.min(speed * DT, d);
      moveCharacter(at, dx * length, dz * length, playerWorld, BODY.traveler, { swimming: true, canTraverse: walkingSlope });
    }
    const practice = locomotion.update(DT, { distance: distance(before, at), mode: pace.mode,
      grounded: !fall.active, swimming: inWater, forced: fall.active, movementScale: combat.movementScale() });
    if (practice.staminaCost) combat.exhaust(practice.staminaCost, 0, { hold: true, cause: 'running' });
    const windBefore = player.stamina;
    combat.update(DT);
    if (inWater && player.stamina > windBefore) player.stamina = windBefore;
    totals.windRecovered += Math.max(0, player.stamina - windBefore);

    const support = surfaceAt(at.x, at.z);
    if (!support.water) totals.maxDrySlope = Math.max(totals.maxDrySlope, support.slope);
    if (!fall.active && !inWater && shouldStartTerrainFall({ before, after: at, floor: support.height, groundSlope: support.slope })) {
      totals.falls.push({ seconds: elapsed, before, after: copy(at), floor: support.height, slope: support.slope, water: support.water });
      fall.begin(at, { drift: { x: (at.x - before.x) / DT, z: (at.z - before.z) / DT } });
    }
    if (fall.active) {
      inWater = false;
      const state = fall.tick(DT, { position: at, surfaceAt, steer: { x: dx, z: dz },
        moveHorizontal: (p, x, z) => moveCharacter(p, x, z, fallingWorld, BODY.traveler,
          { swimming: true, canTraverse: (x, z, nx, nz) => fallingWorld.heightAt(nx, nz) <= p.y + WALK_STEP
            && !closedRegionEntered({ x, z }, { x: nx, z: nz }) }) });
      if (state.damage) combat.exhaust(0, state.damage, { hold: false, cause: 'fall' });
      if (state.landed) totals.landings.push({ seconds: elapsed, at: copy(at), damage: state.damage, water: surfaceAt(at.x, at.z).water });
    } else {
      if (!support.water) totals.biggestGroundedRise = Math.max(totals.biggestGroundedRise, support.height - before.y);
      at.y = support.height;
    }
    const moved = distance(before, at);
    if (!fall.active) {
      inWater = canSwim(at.x, at.z, playerWorld, BODY.traveler);
      if (inWater) {
        const step = swimStep({ dt: DT, level: skills.level('swimming') || 1, wind: player.stamina, health: player.hp });
        combat.exhaust(step.spent, step.damage);
        totals.swum += moved; totals.swimSeconds += DT; totals.windSpent += step.spent;
      } else totals.walked += moved;
    } else totals.walked += moved;
    if (inWater !== priorWet) totals.waterTransitions.push({ seconds: elapsed, entered: inWater, at: copy(at), stamina: player.stamina });
    const country = world.regionAt(at.x, at.z)?.name;
    if (country && totals.regions.at(-1) !== country) totals.regions.push(country);
    totals.damage += priorHp - player.hp; totals.leastWind = Math.min(totals.leastWind, player.stamina);
    elapsed += DT;
    return moved;
  }

  function leg(goal) {
    const from = copy(at), began = elapsed, straight = distance(at, goal), before = snapshot();
    const limit = Math.max(30, straight / swimSpeed(1) * 2 + 20);
    let stalled = 0, reason = null;
    if (!clearStart && !elapsed) reason = 'unclear initial footing';
    while (!reason && (distance(at, goal) > .25 || fall.active)) {
      const moved = frame(goal); stalled = moved < .001 ? stalled + DT : 0;
      if (player.hp <= 0) reason = 'defeated';
      else if (stalled > 4) reason = 'blocked for four simulated seconds';
      else if (elapsed - began > limit) reason = 'bounded leg time exceeded';
      else if (totals.falls.length - before.falls.length > 32) reason = 'repeated unsupported falls';
      else if (![at.x, at.y, at.z].every(Number.isFinite)) reason = 'non-finite position';
    }
    const now = snapshot();
    return { from, goal: { ...goal }, at: copy(at), complete: !reason, reason, seconds: elapsed - began,
      walked: now.walked - before.walked, swum: now.swum - before.swum,
      damage: now.damage - before.damage, startWind: before.stamina, endWind: now.stamina,
      falls: now.falls.slice(before.falls.length), waterTransitions: now.waterTransitions.slice(before.waterTransitions.length),
      nearStop: reason ? world.nearColliders(at.x, at.z, 3).map(c => ({ kind: c.kind, x: c.x, z: c.z, r: c.r, hx: c.hx, hz: c.hz })) : [] };
  }
  function snapshot() { return { ...structuredClone(totals), at: copy(at), initial, clearStart, elapsed,
    stamina: player.stamina, hp: player.hp, inWater, falling: fall.active,
    dryFinish: !fall.active && !inWater && canStand(at.x, at.z, playerWorld, BODY.traveler),
    swimLevel: skills.level('swimming') || 1, walkLevel: skills.level('walking') || 1 }; }
  return { leg, snapshot };
}

/** A failure stops this traveler. Later legs use explicit independent starts
 * only for diagnosis; those starts never count as a continuous journey pass. */
export function inspectCelderRoute(world, route, { continueDiagnostics = true } = {}) {
  let controller = createCelderRouteController(world, route.points[0]), continuous = true;
  const legs = [];
  for (let i = 1; i < route.points.length; i++) {
    if (!continuous && continueDiagnostics) controller = createCelderRouteController(world, route.points[i - 1]);
    if (!continuous && !continueDiagnostics) break;
    const result = controller.leg(route.points[i]);
    legs.push({ index: i, independentStart: !continuous, ...result });
    if (!result.complete) continuous = false;
  }
  return { name: route.name, intent: route.intent, strict: route.strict, points: route.points,
    complete: continuous && legs.length === route.points.length - 1 && legs.every(leg => leg.complete),
    independentStarts: legs.filter(leg => leg.independentStart).length, legs, final: controller.snapshot() };
}
