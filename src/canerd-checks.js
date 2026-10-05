import { CANERD, CANERD_PATHS, CANERD_BUILDINGS } from './canerd-world.js';
import { groundWithRiver } from './world-terrain.js';
import { BODY, bodyWorld } from './bodies.js';
import { canStand, moveCharacter } from './game-state.js';
import { canWalkSlope, sampleClimbSurface } from './climbing.js';
import { shouldStartTerrainFall } from './terrain-fall.js';
import { WALK_STEP } from './walk-surfaces.js';

const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const check = (ok, message) => { if (!ok) throw new Error(`Canerd: ${message}`); };
const spot = p => `${p.x.toFixed(3)}, ${p.z.toFixed(3)}, y ${p.y.toFixed(3)}`;

/** Bounded controller acceptance for the built castle. This moves a separate
 * full-size traveler through the world's actual collision, support and slope
 * queries; it does not reposition the player, change the save, or bypass a
 * blocked step. The same check runs under Node and in native review views. */
export function runCanerdChecks(world) {
  const ascent = CANERD_PATHS.find(path => path.id === 'canerd-ascent');
  check(ascent?.points.length > 2, 'the complete approach is registered');
  check(world.canerd?.root && world.canerd?.walkRoutes?.length, 'castle scenery and walked battlements are installed');
  const castleColliders = world.colliders.filter(c => c.kind?.startsWith('canerd-'));
  check(castleColliders.length > 0, 'the actual castle solids are installed');
  const at = { x: ascent.points[0].x, z: ascent.points[0].z,
    y: world.heightAt(ascent.points[0].x, ascent.points[0].z) };
  const walking = bodyWorld(world).moving(at, BODY.traveler);
  check(canStand(at.x, at.z, walking), 'the approach has a clear starting point');
  const journeys = [];

  function walk(id, points, { terrain = false } = {}) {
    check(gap(at, points[0]) < .04, `${id} joins the previous route without a position correction`);
    const start = { ...at };
    let walked = 0, steps = 0, maxSlope = 0, maxRenderGap = 0, maxAnalyticGap = 0, surfaceSteps = 0;
    for (let target = 1; target < points.length; target++) {
      const goal = points[target];
      while (gap(at, goal) > .015) {
        check(++steps < 30000, `${id} exceeded its bounded movement budget`);
        const before = { ...at }, distance = gap(at, goal), step = Math.min(.14, distance);
        moveCharacter(at, (goal.x - at.x) / distance * step, (goal.z - at.z) / distance * step,
          walking, BODY.traveler, { canTraverse: (x, z, nx, nz) => canWalkSlope(x, z, nx, nz, world) });
        const moved = gap(before, at);
        check(moved > .0001, `${id} is blocked at ${spot(at)} toward ${goal.x.toFixed(3)}, ${goal.z.toFixed(3)}`);
        const support = world.supportAt?.(at.x, at.z, { maxY: before.y, stepUp: WALK_STEP })
          ?? sampleClimbSurface(world, at.x, at.z);
        check(!shouldStartTerrainFall({ before, after: at, floor: support.height, groundSlope: support.slope }),
          `${id} loses safe support at ${spot(at)}; floor ${support.height.toFixed(3)}, slope ${support.slope.toFixed(3)}`);
        at.y = support.height;
        check(canStand(at.x, at.z, walking), `${id} enters a solid at ${spot(at)}`);
        walked += moved; maxSlope = Math.max(maxSlope, support.slope);
        if (support.id) surfaceSteps++;
        if (terrain) {
          const drawn = world.renderedGroundHeight(at.x, at.z);
          maxRenderGap = Math.max(maxRenderGap, Math.abs(at.y - drawn));
          check(Math.abs(at.y - drawn) < .03, `${id} feet differ from displayed ground at ${spot(at)} by ${(at.y - drawn).toFixed(3)} m`);
          // The rendered support is checked at every movement substep; sample
          // the more expensive complete analytic terrain chain about every metre.
          if (steps === 1 || steps % 8 === 0) {
            const analytic = groundWithRiver(at.x, at.z);
            maxAnalyticGap = Math.max(maxAnalyticGap, Math.abs(at.y - analytic));
            check(Math.abs(at.y - analytic) < .4, `${id} rendered path departs from its authored grade at ${spot(at)} by ${(at.y - analytic).toFixed(3)} m`);
          }
        }
      }
    }
    const result = { id, start, end: { ...at }, walked, steps, maxSlope, maxRenderGap, maxAnalyticGap, surfaceSteps };
    journeys.push(result); return result;
  }

  const climb = walk('plain-to-court', ascent.points, { terrain: true });
  check(Math.abs(climb.end.y-CANERD.baseHeight)<.03 && Math.abs(climb.end.y-climb.start.y)<3, 'the court stays at plain level');
  check(climb.walked > 100 && climb.walked < 220, 'the direct castle approach was walked');
  const court = { ...at };
  const hall = CANERD_BUILDINGS.find(building => building.id === 'canerd-chief-lords-hall');
  check(hall?.door, 'the court hall has an authored entrance');
  const hallRoute = [court, hall.door, { x: hall.x, z: hall.z }];
  walk('court-hall-interior', hallRoute, { terrain: true });
  walk('court-hall-return', [...hallRoute].reverse(), { terrain: true });
  for (const route of world.canerd.walkRoutes) {
    const outward = [court, ...route.points];
    const visit = walk(route.id, outward);
    check(visit.end.y - court.y > 8 && visit.surfaceSteps > 50, `${route.id} reaches its elevated deck through the real stairs`);
    walk(`${route.id}-return`, [...outward].reverse());
    check(Math.abs(at.y - court.y) < .03, `${route.id} returns to the courtyard floor`);
  }
  const descent = walk('court-to-plain', [...ascent.points].reverse(), { terrain: true });
  check(Math.abs(descent.end.y - climb.start.y) < .03 && gap(descent.end, climb.start) < .04,
    'the complete return reaches its original plain approach');
  return { ok: true, colliders: castleColliders.length, journeys };
}
