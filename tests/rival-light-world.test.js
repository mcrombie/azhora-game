import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { ELOD_LIGHT, SMUGGLERS_DOOR, LIGHT_GUARDS, TOWER_STEP, BLOCKHOUSE_DOOR, SUBTRACTIDAUGHTER_STAND, SOVIK,
  ROUTE_TO_DOOR, ROUTE_IN, ROUTE_OUT } from '../src/content/quests/rival-light/rival-light.js';
import { bodyWorld, stepToward, BODY } from '../src/gameplay/combat/bodies.js';
import { canStand } from '../src/gameplay/movement/game-state.js';
import { createStealth, STEALTH } from '../src/gameplay/law/stealth.js';
import { guardLineOfSight } from '../src/content/regions/drent/drent-host.js';
import { SEA_LEVEL } from '../src/world/terrain/region-world.js';

const { createWorld } = await sourceModule('../src/world.js');
const scene = new THREE.Scene(), world = createWorld(scene);

/** Walk a route the way a pilot does, and say where it stalled if it did. */
function walk(route) {
  const position = { ...route[0] }, nav = bodyWorld(world).moving(position, BODY.traveler), trail = [];
  for (const [index, target] of route.entries()) {
    const budget = Math.ceil((Math.hypot(target.x - position.x, target.z - position.z) * 2 + 30) / (4.2 / 30));
    let frames = 0;
    while (frames++ < budget && Math.hypot(target.x - position.x, target.z - position.z) > .35) {
      stepToward(position, target, 4.2 / 30, nav, BODY.traveler);
      trail.push({ ...position });
    }
    assert.ok(Math.hypot(target.x - position.x, target.z - position.z) <= .35,
      `stalled before waypoint ${index} (${target.x.toFixed(1)}, ${target.z.toFixed(1)}) at ${position.x.toFixed(2)}, ${position.z.toFixed(2)}`);
  }
  return trail;
}

test('the Elod Light, the smugglers’ door and its hatch are built, on ground a traveler can stand on', () => {
  assert.ok(scene.getObjectByName(ELOD_LIGHT.name));
  assert.ok(scene.getObjectByName('The smugglers’ door'));
  for (const [name, p] of Object.entries({ west: SMUGGLERS_DOOR.west, east: SMUGGLERS_DOOR.east, step: TOWER_STEP, blockhouse: BLOCKHOUSE_DOOR,
    stand: SUBTRACTIDAUGHTER_STAND, ...Object.fromEntries(LIGHT_GUARDS.map(g => [g.id, g])) }))
    assert.ok(canStand(p.x, p.z, world, BODY.traveler), `${name} is clear ground`);
  const t = ELOD_LIGHT.tower;
  assert.ok(world.heightAt(t.x, t.z) > SEA_LEVEL + 12, 'seventeen metres up');
});

test('the yard has a postern: no stone of the wall stands in it', () => {
  const y = ELOD_LIGHT.yard, stones = world.colliders.filter(c => c.kind === 'prop' && Math.abs(Math.hypot(c.x - y.x, c.z - y.z) - y.radius) < .6);
  assert.ok(stones.length > 20, 'the wall is there');
  const inPostern = stones.filter(c => { const a = Math.atan2(c.x - y.x, c.z - y.z); return a > y.postern[0] && a < y.postern[1]; });
  assert.deepEqual(inPostern, []);
});

test('the quiet way can be walked: east to the door, from the hatch to the stair, and back', () => {
  walk(ROUTE_TO_DOOR);
  walk([...ROUTE_TO_DOOR].reverse());
  walk(ROUTE_IN);
  walk(ROUTE_OUT);
});

/** The light's watch, as the host runs it, over a walk. */
function watched(trail, { sneakWithin = 48, carrying = false } = {}) {
  const stealth = createStealth({ lineOfSight: (guard, at) => guardLineOfSight(world, guard, at) });
  const range = STEALTH.visionRange * (carrying ? SOVIK.glow : 1);
  const guards = LIGHT_GUARDS.map(guard => ({ ...guard, range }));
  let worst = 0, seenAt = null;
  const step = 4.2 / 30;
  for (const p of trail) {
    const near = Math.hypot(p.x - ELOD_LIGHT.head.x, p.z - ELOD_LIGHT.head.z) < sneakWithin;
    // Sneaking goes at under half pace, so each metre takes proportionally longer in sight.
    const dt = near ? 1 / 30 / STEALTH.speedMultiplier : 1 / 30;
    const awareness = stealth.update({ dt: Math.min(dt, STEALTH.maxStep), position: p, sneaking: near, taught: true, guards });
    worst = Math.max(worst, awareness.suspicion);
    if (awareness.caught && !seenAt) seenAt = p;
  }
  return { worst, seenAt };
}

test('the quiet way keeps out of both guards’ sight, going in and coming out with Sovik glowing', () => {
  const going = watched(walk(ROUTE_IN));
  assert.equal(going.seenAt, null, `seen going in at ${JSON.stringify(going.seenAt)}`);
  const coming = watched(walk(ROUTE_OUT), { carrying: true });
  assert.equal(coming.seenAt, null, `seen coming out at ${JSON.stringify(coming.seenAt)}`);
  // And the straight way, walking up to the light from the downs as if you had papers, is seen.
  const straight = walk([{ x: -60, z: 760 }, { x: -10, z: 730 }, { x: 1, z: 722 }]);
  const bold = watched([...straight, ...Array(90).fill(straight.at(-1))], { sneakWithin: 0 });
  assert.ok(bold.seenAt, 'walking straight at the land guard gets you seen');
});
