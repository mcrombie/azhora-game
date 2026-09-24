import test from 'node:test';
import assert from 'node:assert/strict';
import { BODY, bodyWorld, stepToward } from '../src/bodies.js';
import { canStand } from '../src/game-state.js';

const ground = colliders => ({ bounds: { minX: -60, maxX: 60, minZ: -60, maxZ: 60 }, colliders, heightAt: () => 1 });

function walk(position, target, world, frames = 2000, step = .06) {
  const trace = [];
  for (let i = 0; i < frames && Math.hypot(target.x - position.x, target.z - position.z) > .08; i++) {
    world.moving(position, BODY.person);
    const before = { ...position };
    stepToward(position, target, step, world);
    assert.ok(Math.hypot(position.x - before.x, position.z - before.z) <= step + 1e-8, 'movement never teleports or exceeds walking pace');
    assert.ok(canStand(position.x, position.z, world, BODY.person), 'every frame stays outside the walls');
    trace.push({ ...position });
  }
  return trace;
}

test('an NPC approaching the middle of a house follows a persistent route around its corner', () => {
  const position = { x: 0, z: -9 }, target = { x: 0, z: 9 };
  const world = bodyWorld(ground([{ x: 0, z: 0, hx: 5, hz: 4, kind: 'house' }]));
  const trace = walk(position, target, world);
  assert.ok(Math.hypot(position.x - target.x, position.z - target.z) < .08, `stalled at ${JSON.stringify(position)}`);
  assert.ok(trace.some(point => Math.abs(point.x) > 5.3), 'the route actually rounds the house');
  assert.ok(trace.length < 700, 'the walker does not spend minutes oscillating at the wall');
});

test('the shore departure crosses a cluster of solid crates and barrels without entering them', () => {
  const position = { x: 0, z: -5 }, target = { x: 0, z: 8 };
  const world = bodyWorld(ground([
    { x: -.3, z: 0, r: .75, kind: 'prop' }, { x: 1, z: 0, r: .6, kind: 'prop' },
    { x: -1.7, z: .25, r: .6, kind: 'prop' }, { x: .2, z: 1.2, r: .55, kind: 'prop' },
  ]));
  walk(position, target, world);
  assert.ok(Math.hypot(position.x, position.z - 8) < .08, `stalled beside the shore cargo at ${JSON.stringify(position)}`);
});

test('a cached detour yields to a moving crowd and replans when a body blocks its waypoint', () => {
  const position = { id: 'ed', x: 0, z: -6 }, target = { x: 0, z: 7 };
  const world = bodyWorld(ground([{ x: 0, z: 0, hx: 1.5, hz: 1.5, kind: 'house' }]));
  for (let frame = 0; frame < 1600 && Math.hypot(position.x, position.z - 7) > .08; frame++) {
    const people = [{ id: 'guard-a', x: 2, z: 1, r: .3 }, { id: 'guard-b', x: -2, z: 1, r: .3 },
      { id: 'passer', x: Math.sin(frame / 70) * 3, z: 3.5, r: .3 }];
    world.setBodies(people).moving(position, BODY.person);
    const before = { ...position };
    stepToward(position, target, .06, world);
    for (const body of people) {
      const startedOverlapping = Math.hypot(before.x - body.x, before.z - body.z) < body.r + BODY.person;
      if (!startedOverlapping) assert.ok(Math.hypot(position.x - body.x, position.z - body.z) >= body.r + BODY.person - 1e-8);
    }
  }
  assert.ok(Math.hypot(position.x, position.z - 7) < .08, `stalled in the crowd at ${JSON.stringify(position)}`);
});

test('a changed scripted destination discards the old detour instead of walking to a stale home', () => {
  const position = { x: 0, z: -6 }, world = bodyWorld(ground([{ x: 0, z: 0, hx: 3, hz: 2, kind: 'house' }]));
  walk(position, { x: 0, z: 7 }, world, 95);
  const target = { x: -10, z: -6 }; walk(position, target, world);
  assert.ok(Math.hypot(position.x - target.x, position.z - target.z) < .08);
});

test('unreachable destinations have bounded replanning and remain solid', () => {
  let checks = 0;
  const base = ground([{ x: 0, z: 0, hx: 5, hz: 5, kind: 'house' }]);
  const world = bodyWorld({ ...base, heightAt: () => { checks++; return 1; } });
  const position = { x: 0, z: -7 };
  walk(position, { x: 0, z: 0 }, world, 120);
  assert.ok(Math.abs(position.x) >= 5.3 || Math.abs(position.z) >= 5.3, 'cannot walk inside an unreachable house');
  assert.ok(checks < 90000, `search must not run anew every frame (${checks} checks)`);
});

test('open ground needs no path search and does not overshoot a nearby destination', () => {
  let checks = 0;
  const world = bodyWorld({ ...ground([]), heightAt: () => { checks++; return 1; } });
  const position = { x: 0, z: 0 }, target = { x: .025, z: 0 };
  world.moving(position); stepToward(position, target, .08, world);
  assert.equal(position.x, target.x); assert.ok(checks <= 2);
  assert.equal(stepToward(position, target, .08, world), 0);
});
