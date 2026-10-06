import { moveCharacter, canStand, canSwim, waterAt } from '../src/gameplay/movement/game-state.js';
import { bodyWorld, BODY } from '../src/gameplay/combat/bodies.js';
import { createClimbing, sampleClimbSurface, canWalkSlope } from '../src/gameplay/movement/climbing.js';
import { canPushThrough } from '../src/world/scenery/undergrowth.js';
import { closedRegionEntered } from '../src/world/travel/closed-border.js';
import { createTerrainFall, shouldStartTerrainFall } from '../src/gameplay/movement/terrain-fall.js';
import { WALK_STEP } from '../src/world/collision/walk-surfaces.js';
import { SWIM, swimStep, swimSpeed } from '../src/gameplay/movement/swimming.js';
import { createSkills } from '../src/gameplay/skills/skills.js';
import { createLocomotionSkills } from '../src/gameplay/movement/locomotion-skills.js';
import { createCombat } from '../src/gameplay/combat/combat.js';

import { createLotharnCaveWalk } from '../src/content/regions/east-lotharn/east-lotharn-cave-walk.js';

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const copy = p => ({ x: p.x, y: p.y, z: p.z });
const DT = 1 / 30;

/** One novice traveler for an entire journey. The host order follows main.js:
 * movement, locomotion practice/combat recovery, support/fall, then swimming.
 * The route may request ordinary climb input and ledge rests; the production
 * controller owns every grab, climb step and stamina cost. No position nudges.
 * A route can deliberately steer around a prop by authored waypoints; the
 * controller itself never nudges or ignores a collider to reach its target.
 */
export function createLotharnShoulderController(world, start) {
  const at = { x: start.x, z: start.z, y: world.heightAt(start.x, start.z) };
  const initial = copy(at), fall = createTerrainFall(), skills = createSkills();
  const locomotion = createLocomotionSkills({ skills });
  const playerWorld = bodyWorld(world).moving(at, BODY.traveler, 'traveler');
  const climbWorld = { ...world, nearColliders: (x, z, r) => playerWorld.nearColliders(x, z, r) };
  const events = [], cave = createLotharnCaveWalk({ caves: [...world.lotharnCaves, ...world.westLotharnCaves], ground: world.groundHeight });
  const climbing = createClimbing({ world: climbWorld, onEvent: e => events.push(e) });
  const combat = createCombat({ world: playerWorld, position: at });
  const player = combat.state.player;
  let inWater = false, elapsed = 0, climbXp = 0, fallingFrom = null;
  const totals = { walked: 0, swum: 0, swimSeconds: 0, windSpent: 0, windRecovered: 0, leastWind: player.stamina,
    damage: 0, grips: [], caveEntries: [], climbed: 0, climbWind: 0, biggestGroundedRise: 0, maxDrySlope: 0, falls: [], landings: [], caughtFalls: 0, maxGravityDrop: 0, maxGravitySeconds: 0, waterTransitions: [], regions: [] };
  const clearStart = canStand(at.x, at.z, playerWorld, BODY.traveler);
  const surfaceAt = (x, z, { maxY = at.y, stepUp = fall.active ? 0 : WALK_STEP } = {}) => {
    if (cave.active) return { id: cave.cave.id, height: cave.floorAt(x,z), slope: 0, gradient: {x:0,z:0}, water:false };
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
    cave.validate(at, { suspended: climbing.active });
    const rock = sampleClimbSurface(climbWorld, at.x, at.z);
    const intended = { x: at.x + dx * pace.speed * combat.movementScale() * DT, z: at.z + dz * pace.speed * combat.movementScale() * DT };
    const ahead = sampleClimbSurface(climbWorld, intended.x, intended.z);
    if (!climbing.active && !cave.active && !inWater && goal.climb
      && shouldStartTerrainFall({ before: at, after: intended, floor: ahead.height, groundSlope: ahead.slope })
      && climbing.grab(at, rock.yaw, { stamina: player.stamina })) {
      if (fall.active) totals.caughtFalls++;
      fall.cancel(); fallingFrom = null; Object.assign(at, climbing.view().position);
      if(!skills.taught('climbing'))skills.learn('climbing');
      totals.grips.push({ intent: 'descend', at: copy(at), stamina: player.stamina });
    }
    const climbingFrame = climbing.active;
    const resting = !climbingFrame && !cave.active && goal.climb && rock.resting && player.stamina < 90;
    if (climbingFrame) {
      const g=rock.gradient, up=(dx*g.x+dz*g.z)*Math.sqrt(1+rock.slope**2), side=-dx*g.z+dz*g.x;
      const step=climbing.tick(DT,{up,side,stamina:player.stamina,level:skills.level('climbing')});
      combat.exhaust(step.staminaSpent,step.damage,{hold:climbing.active,cause:'fall'});
      climbXp+=step.xp||0; if(climbXp>=1){const earned=Math.floor(climbXp);skills.gain('climbing',earned);climbXp-=earned;}
      totals.climbWind+=step.staminaSpent; Object.assign(at,step.position);
      totals.climbed+=Math.hypot(at.x-before.x,at.y-before.y,at.z-before.z);
    }

    if (!fall.active && !climbingFrame && !resting) {
      const speed = (inWater ? swimSpeed(skills.level('swimming') || 1) : pace.speed) * combat.movementScale();
      const length = Math.min(speed * DT, d);
      const hadCave=cave.active;
      if(cave.active||cave.entering(at,dx*length,dz*length,{grounded:true,inWater})) {
        if(!hadCave)totals.caveEntries.push(cave.cave.id);
        cave.move(at,dx*length,dz*length,BODY.traveler);
      } else moveCharacter(at, dx * length, dz * length, playerWorld, BODY.traveler, { swimming: true, canTraverse: walkingSlope });
    }
    const practice = locomotion.update(DT, { distance: distance(before, at), mode: pace.mode,
      grounded: !fall.active, swimming: inWater, climbing: climbingFrame, forced: fall.active, movementScale: combat.movementScale() });
    if (practice.staminaCost) combat.exhaust(practice.staminaCost, 0, { hold: true, cause: 'running' });
    const windBefore = player.stamina;
    combat.update(DT);
    if ((inWater || climbingFrame) && player.stamina > windBefore) player.stamina = windBefore;
    totals.windRecovered += Math.max(0, player.stamina - windBefore);

    const support = surfaceAt(at.x, at.z);
    if (!support.water) totals.maxDrySlope = Math.max(totals.maxDrySlope, support.slope);
    if (!climbingFrame && !cave.active && !fall.active && !inWater && shouldStartTerrainFall({ before, after: at, floor: support.height, groundSlope: support.slope })) {
      totals.falls.push({ seconds: elapsed, before, after: copy(at), floor: support.height, slope: support.slope, water: support.water });
      fall.begin(at, { drift: { x: (at.x - before.x) / DT, z: (at.z - before.z) / DT } });
      fallingFrom = { y: before.y, seconds: elapsed };
    }
    if (fall.active) {
      inWater = false;
      const state = fall.tick(DT, { position: at, surfaceAt, steer: { x: dx, z: dz },
        moveHorizontal: (p, x, z) => moveCharacter(p, x, z, fallingWorld, BODY.traveler,
          { swimming: true, canTraverse: (x, z, nx, nz) => fallingWorld.heightAt(nx, nz) <= p.y + WALK_STEP
            && !closedRegionEntered({ x, z }, { x: nx, z: nz }) }) });
      if (state.damage) combat.exhaust(0, state.damage, { hold: false, cause: 'fall' });
      if (fallingFrom) {
        totals.maxGravityDrop = Math.max(totals.maxGravityDrop, fallingFrom.y - at.y);
        totals.maxGravitySeconds = Math.max(totals.maxGravitySeconds, elapsed + DT - fallingFrom.seconds);
      }
      if (state.landed) totals.landings.push({ seconds: elapsed, at: copy(at), damage: state.damage, water: surfaceAt(at.x, at.z).water });
      if (state.landed) fallingFrom = null;
    } else if (!climbingFrame) {
      if (!support.water) totals.biggestGroundedRise = Math.max(totals.biggestGroundedRise, support.height - before.y);
      at.y = support.height;
    }
    const moved = distance(before, at);
    if(!climbingFrame&&!fall.active&&!cave.active&&!resting&&goal.climb&&moved<.01
      &&climbing.grab(at,rock.yaw,{stamina:player.stamina})) {
      Object.assign(at,climbing.view().position);
      if(!skills.taught('climbing'))skills.learn('climbing');
      totals.grips.push({intent:'ascend',at:copy(at),stamina:player.stamina});
    }
    if (!fall.active) {
      inWater = !climbingFrame && !cave.active && canSwim(at.x, at.z, playerWorld, BODY.traveler);
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
    return resting ? .002 : Math.hypot(at.x-before.x,at.y-before.y,at.z-before.z);
  }

  function leg(goal) {
    const from = copy(at), began = elapsed, straight = distance(at, goal), before = snapshot();
    const limit = Math.max(30, straight / swimSpeed(1) * 2 + 20);
    let stalled = 0, reason = null;
    if (!clearStart && !elapsed) reason = 'unclear initial footing';
    while (!reason && (distance(at, goal) > .25 || fall.active)) {
      const moved = frame(goal); stalled = moved < .001 ? stalled + DT : 0;
      if (events.some(e=>e.type==='exhausted')) reason = 'climbing wind exhausted';
      else if (player.hp <= 0) reason = 'defeated';
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
    events: structuredClone(events), cave: cave.cave?.id ?? null, climbing: climbing.active, stamina: player.stamina, hp: player.hp, inWater, falling: fall.active,
    dryFinish: !fall.active && !inWater && !climbing.active && !cave.active && canStand(at.x, at.z, playerWorld, BODY.traveler),
    swimLevel: skills.level('swimming') || 1, walkLevel: skills.level('walking') || 1 }; }
  return { leg, snapshot };
}

/** A failure stops this traveler. Later legs use explicit independent starts
 * only for diagnosis; those starts never count as a continuous journey pass. */
export function inspectLotharnShoulderRoute(world, route, { continueDiagnostics = true } = {}) {
  let controller = createLotharnShoulderController(world, route.points[0]), continuous = true;
  const legs = [];
  for (let i = 1; i < route.points.length; i++) {
    if (!continuous && continueDiagnostics) controller = createLotharnShoulderController(world, route.points[i - 1]);
    if (!continuous && !continueDiagnostics) break;
    const result = controller.leg(route.points[i]);
    legs.push({ index: i, independentStart: !continuous, ...result });
    if (!result.complete) continuous = false;
  }
  return { name: route.name, intent: route.intent, strict: route.strict, points: route.points,
    complete: continuous && legs.length === route.points.length - 1 && legs.every(leg => leg.complete),
    independentStarts: legs.filter(leg => leg.independentStart).length, legs, final: controller.snapshot() };
}
