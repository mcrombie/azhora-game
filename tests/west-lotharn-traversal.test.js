import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { scopedWorld } from './scoped-world.js';
import { canStand, moveCharacter } from '../src/game-state.js';
import { createClimbing, sampleClimbSurface, canWalkSlope } from '../src/climbing.js';
import { createTerrainFall, shouldStartTerrainFall } from '../src/terrain-fall.js';
import { PEAKS, RAMPS, pointOn } from '../src/west-lotharn-world.js';

// The flood-fill tests establish geographic access. This test makes a full-size beginner
// actually follow the highest summit's route: normal walking collision/slope rules, the real
// climbing controller where walking stops, and the game's ordinary stamina recovery on foot.
const world = await scopedWorld(new THREE.Scene(), [27]);
const DT = 1 / 30, WALK_SPEED = 4.2, RECOVERY = 24;
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

// The route is four metres wide. As a person would, choose a continuous clear lane through
// each turn rather than insisting on the mathematical centre where crossfall may be steeper.
function walkingLane(way) {
  const steps = Math.ceil(way.line.length / .75), offsets = [-1.4, -1.2, -.9, -.6, -.3, 0, .3, .6, .9, 1.2, 1.4];
  const stages = [];
  for (let i = 0; i <= steps; i++) {
    const along = way.line.length * i / steps, sample = pointOn(way.line, along);
    const fade = Math.min(1, along / 4, (way.line.length - along) / 4);
    const candidates = offsets.map(offset => {
      const p = { x: sample.x + sample.nx * offset * fade, z: sample.z + sample.nz * offset * fade, way: way.id };
      const cost = canStand(p.x, p.z, world)
        ? 100 * Math.max(0, sampleClimbSurface(world, p.x, p.z).slope - .87) ** 2 + Math.abs(offset) * .0001 : Infinity;
      return { p, cost, score: Infinity, previous: -1 };
    });
    if (!i) candidates.forEach(node => { node.score = node.cost; });
    else for (let j = 0; j < candidates.length; j++) {
      const node = candidates[j];
      for (let k = Math.max(0, j - 2); k <= Math.min(offsets.length - 1, j + 2); k++) {
        const prior = stages[i - 1][k];
        const movement = Math.abs(offsets[j] - offsets[k]) * .01;
        const slopeCost = canWalkSlope(prior.p.x, prior.p.z, node.p.x, node.p.z, world) ? 0 : 2;
        const score = prior.score + node.cost + movement + slopeCost;
        if (score < node.score) { node.score = score; node.previous = k; }
      }
    }
    stages.push(candidates);
  }
  const last = stages.at(-1); let picked = last.reduce((best, n, i) => n.score < last[best].score ? i : best, 0);
  assert.ok(Number.isFinite(last[picked].score), `${way.id}: no clear lane within the authored trail`);
  const out = [];
  for (let i = stages.length - 1; i >= 0; i--) { const node = stages[i][picked]; out.push(node.p); picked = node.previous; }
  return out.reverse();
}

function traverse(peak, descending = false) {
  const ways = RAMPS.filter(way => way.peak === peak.id);
  const route = ways.flatMap(walkingLane);
  route.push({ x: peak.x, z: peak.z, way: 'summit bald' });
  if (descending) route.reverse();
  const at = { ...route[0], y: world.heightAt(route[0].x, route[0].z) };
  const events = [], grips = [], falls = [], climb = createClimbing({ world, onEvent: event => events.push(event) });
  const fall = createTerrainFall(), fallingWorld = { ...world,
    nearColliders: (x, z, r) => (world.nearColliders?.(x, z, r) ?? world.colliders).filter(c => c.kind !== 'suval-peak-face') };
  let stamina = 100, leastStamina = 100, spent = 0, restored = 0, damage = 0, stalled = 0, walked = 0;
  let target = 1, frames = 0;
  let fallOrigin = null;
  assert.ok(canStand(at.x, at.z, world), `${peak.id}: the route's starting point has room for the traveler`);
  const walkingSlope = (x, z, nx, nz) => canWalkSlope(x, z, nx, nz, world);
  function stepFall(dx, dz) {
    const frame = fall.tick(DT, { position: at, steer: { x: dx, z: dz },
      surfaceAt: (x, z) => ({ ...sampleClimbSurface(world, x, z), water: false }),
      moveHorizontal: (p, x, z) => moveCharacter(p, x, z, fallingWorld, .34,
        { canTraverse: (_x, _z, nx, nz) => world.heightAt(nx, nz) <= p.y + .35 }) });
    damage += frame.damage;
    if (frame.damage) falls.push({ from: fallOrigin, to: { ...at }, damage: frame.damage });
  }
  for (; target < route.length && frames < 30 * 1800; frames++) {
    while (target < route.length && distance(at, route[target]) < .35) target++;
    if (target === route.length) break;
    const goal = route[target], d = distance(at, goal), dx = (goal.x - at.x) / d, dz = (goal.z - at.z) / d;
    const before = { ...at }, surface = sampleClimbSurface(world, at.x, at.z);
    if (descending && !climb.active) {
      const next = { x: at.x + dx * WALK_SPEED * DT, z: at.z + dz * WALK_SPEED * DT };
      const ahead = sampleClimbSurface(world, next.x, next.z);
      if ((fall.active || shouldStartTerrainFall({ before, after: next, floor: ahead.height, groundSlope: ahead.slope }))
        && climb.grab(at, surface.yaw, { stamina })) {
        // Face the rock and press Space, then hold S/downward input below. The
        // real main.js tryClimbing path cancels a fall only after a valid grab;
        // this keeps the same reach, stamina, collision and no-hold checks.
        fall.cancel(); Object.assign(at, climb.view().position);
        grips.push({ intent: 'descend', way: goal.way, x: +at.x.toFixed(2), z: +at.z.toFixed(2),
          y: +at.y.toFixed(2), stamina: +stamina.toFixed(2) });
      }
    }
    if (fall.active) stepFall(dx, dz);
    else if (climb.active) {
      // Steering in the controller's surface-relative basis, equivalent to combining W/A/S/D.
      const g = surface.gradient, up = (dx * g.x + dz * g.z) * Math.sqrt(1 + surface.slope ** 2);
      const side = -dx * g.z + dz * g.x;
      const frame = climb.tick(DT, { up, side, stamina, level: 1 });
      stamina = Math.max(0, stamina - frame.staminaSpent); spent += frame.staminaSpent;
      damage += frame.damage; Object.assign(at, frame.position);
    } else {
      // A safe ledge permits an ordinary rest before the next face; no stamina is granted
      // while attached to a cliff, and recovery uses the same 24/second as combat.update().
      const resting = surface.resting && stamina < 90;
      const recharge = Math.min(100 - stamina, RECOVERY * DT);
      stamina += recharge; restored += recharge;
      if (!resting) {
        moveCharacter(at, dx * WALK_SPEED * DT, dz * WALK_SPEED * DT, world, .34, { canTraverse: walkingSlope });
        const moved = distance(at, before); walked += moved;
        const floor = world.heightAt(at.x, at.z), next = sampleClimbSurface(world, at.x, at.z);
        if (shouldStartTerrainFall({ before, after: at, floor, groundSlope: next.slope })) {
          fallOrigin = { way: goal.way, x: before.x, y: before.y, z: before.z };
          fall.begin(at, { drift: { x: (at.x - before.x) / DT, z: (at.z - before.z) / DT } });
          stepFall(dx, dz);
        } else at.y = floor;
        if (!fall.active && moved < .01) {
          // A player faces the rock before grabbing; no teleport or direct position correction.
          if (climb.grab(at, surface.yaw, { stamina })) grips.push({ way: goal.way,
            x: +at.x.toFixed(2), z: +at.z.toFixed(2), y: +at.y.toFixed(2), stamina: +stamina.toFixed(2),
            slope: +surface.slope.toFixed(3) });
        }
      }
    }
    leastStamina = Math.min(leastStamina, stamina);
    assert.ok(canStand(at.x, at.z, world), `${goal.way}: movement collided at ${at.x.toFixed(2)}, ${at.z.toFixed(2)}`);
    assert.ok(fall.active ? at.y >= world.heightAt(at.x, at.z) - .001
      : Math.abs(at.y - world.heightAt(at.x, at.z)) < .001, `${goal.way}: the traveler lost the ground`);
    assert.equal(events.some(event => event.type === 'exhausted'), false,
      `${goal.way}: a beginner exhausted stamina at ${at.x.toFixed(2)}, ${at.z.toFixed(2)}, y${at.y.toFixed(2)}; recent grips ${JSON.stringify(grips.slice(-3))}`);
    const movement = Math.hypot(at.x - before.x, at.y - before.y, at.z - before.z);
    stalled = movement < .002 && !(surface.resting && stamina < 90) ? stalled + DT : 0;
    assert.ok(stalled < 8,
      `${goal.way}: stuck at ${at.x.toFixed(3)}, ${at.z.toFixed(3)} toward ${goal.x.toFixed(3)}, ${goal.z.toFixed(3)}; slope ${surface.slope.toFixed(3)}, ${climb.view().phase}, goalClear ${canStand(goal.x, goal.z, world)}, nextSlope ${sampleClimbSurface(world, at.x + dx * .1, at.z + dz * .1).slope.toFixed(3)}`);
  }
  assert.equal(target, route.length, `${peak.id}: route timed out at ${route[target]?.way}`);
  assert.equal(fall.active || climb.active, false, `${peak.id}: the traveler must finish standing on ${descending ? 'the valley approach' : 'the summit'}`);
  return { at, events, grips, falls, stamina, leastStamina, spent, restored, damage, walked, seconds: frames * DT };
}

test('a beginner reaches the West Lotharn crest through the complete ramps and ledges with real collision and stamina', t => {
  const crest = PEAKS.find(peak => peak.id === 'the-crest'), result = traverse(crest);
  assert.ok(distance(result.at, crest) < .5, 'the traveler reaches the actual summit');
  assert.ok(result.at.y > 520, `the highest country is reached, at ${result.at.y.toFixed(1)} m`);
  assert.ok(result.walked > 300, 'this exercises the ascent, not one isolated grip');
  assert.equal(result.damage, 0, 'the intended ascent does not require falling');
  t.diagnostic(`Reached ${result.at.y.toFixed(1)} m after ${result.walked.toFixed(0)} m on foot and ${(result.seconds / 60).toFixed(1)} simulated minutes; minimum stamina ${result.leastStamina.toFixed(1)}, climbing cost ${result.spent.toFixed(1)}, recovered ${result.restored.toFixed(1)}.`);
});

test('a beginner returns from the West Lotharn crest by its ordinary ramps with real falling and stamina', t => {
  const crest = PEAKS.find(peak => peak.id === 'the-crest'), result = traverse(crest, true);
  const first = RAMPS.find(way => way.peak === crest.id).line.points[0];
  assert.ok(distance(result.at, first) < .5, 'the return reaches the actual foot of the first ramp');
  assert.ok(result.at.y < 150 && world.heightAt(crest.x, crest.z) - result.at.y > 350,
    'the traveler descends the whole massif into the valley');
  assert.ok(result.walked > 300, 'this exercises the complete return, not one isolated step');
  assert.equal(result.damage, 0, `an ordinary return cannot require a damaging fall: ${JSON.stringify(result.falls)}`);
  assert.ok(result.grips.some(grip => grip.intent === 'descend'), 'the steep return uses the real climb-down input');
  t.diagnostic(`Returned to ${result.at.y.toFixed(1)} m after ${result.walked.toFixed(0)} m on foot and ${(result.seconds / 60).toFixed(1)} simulated minutes; minimum stamina ${result.leastStamina.toFixed(1)}, climbing cost ${result.spent.toFixed(1)}, recovered ${result.restored.toFixed(1)}.`);
  t.diagnostic(`Climb-down transitions: ${JSON.stringify(result.grips.filter(grip => grip.intent === 'descend'))}`);
});
