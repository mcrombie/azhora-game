import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { bodyWorld, stepToward, BODY } from '../src/bodies.js';
import { canStand } from '../src/game-state.js';
import { WORD_BEACH } from '../src/word-arrival.js';
import { INSTRUCTOR_STAND } from '../src/instructor.js';
import { villageToWorld } from '../src/region-world.js';
import { FERNWAY_SHELTER } from '../src/places.js';

const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());

// Use the actual town's props, rotated houses and terrain, not idealized walls.
// The default walking NPC covers 2.4 m/s; every case is capped at 16.7 game seconds.
function walk(start, target, t) {
  const position = { ...start }, nav = bodyWorld(world).moving(position, BODY.person);
  assert.ok(canStand(start.x, start.z, world, BODY.person), 'the authored start is standable');
  assert.ok(canStand(target.x, target.z, world, BODY.person), 'the authored destination is standable');
  let frames = 0, maxStepMs = 0, traveled = 0;
  for (; frames < 1000 && Math.hypot(position.x - target.x, position.z - target.z) > .1; frames++) {
    const before = { ...position }, clock = performance.now();
    stepToward(position, target, 2.4 / 60, nav, BODY.person);
    maxStepMs = Math.max(maxStepMs, performance.now() - clock);
    const distance = Math.hypot(position.x - before.x, position.z - before.z);
    assert.ok(distance <= 2.4 / 60 + 1e-8, 'a detour never teleports the walker');
    traveled += distance;
    for (const fraction of [.5, 1]) {
      const x = before.x + (position.x - before.x) * fraction, z = before.z + (position.z - before.z) * fraction;
      assert.ok(canStand(x, z, world, BODY.person), `walked inside a real collider at ${x.toFixed(2)}, ${z.toFixed(2)}`);
    }
  }
  const remaining = Math.hypot(position.x - target.x, position.z - target.z);
  assert.ok(remaining <= .1, `stalled ${remaining.toFixed(2)} m from the destination after ${frames} frames`);
  t.diagnostic(`${frames} frames, ${traveled.toFixed(1)} m traveled; slowest navigation step ${maxStepMs.toFixed(1)} ms`);
}

test('Ed clears the actual shore props and reaches Jojo from his scripted beach landing', t => {
  walk(WORD_BEACH, world.pierHead, t);
});

test('a walker reaches Glun from the pier head without getting wedged in village props', t => {
  walk(world.pierHead, INSTRUCTOR_STAND, t);
});

test('villagers go around the real cottage between Tobin and Orris in either direction', t => {
  const fisher = world.npcPositions.fisher, doomsayer = world.npcPositions.doomsayer;
  assert.ok(world.colliders.some(collider => collider.kind === 'house'
    && Math.abs(collider.x + 8) < 1 && Math.abs(collider.z - 40) < 1), 'the cottage still occupies this shortcut');
  walk(fisher, doomsayer, t); walk(doomsayer, fisher, t);
});

test('Fernway walkers clear the bench instead of walking in place against its seat', t => {
  const bench = villageToWorld(-.1, -106.8);
  assert.ok(world.colliders.some(collider => Math.hypot(collider.x - bench.x, collider.z - bench.z) < .05 && collider.r === 1.1), 'the original solid bench is present');
  const east = { x: bench.x + 1.7, z: bench.z }, west = { x: bench.x - 1.7, z: bench.z };
  walk(east, west, t); walk(west, east, t);
});

test('Fernway walkers use the cleared fork beside the cairn in either direction', t => {
  const sign = villageToWorld(-10.7, -105), cairn = villageToWorld(-9.8, -109.7);
  assert.equal(world.colliders.some(collider => collider.kind === 'signpost' && Math.hypot(collider.x - sign.x, collider.z - sign.z) < .5), false, 'the crowded signpost was removed');
  // Nearby stones retain their own generated footprints. Keep the real route regression.
  const approach = (x, direction) => {
    for (let offset = 0; offset <= 6; offset += .5) {
      const point = { x: x + direction * offset, z: sign.z };
      if (canStand(point.x, point.z, world, BODY.person)) return point;
    }
    assert.fail('there is no walkable approach beside the fork signpost');
  };
  const east = approach(sign.x + 1.2, 1), west = approach(cairn.x - 2, -1);
  t.diagnostic(`Fork approaches: (${east.x.toFixed(1)}, ${east.z.toFixed(1)}) and (${west.x.toFixed(1)}, ${west.z.toFixed(1)})`);
  walk(east, west, t); walk(west, east, t);
});

test('Fernway walkers go around the rest shelter when the hut blocks their direct line', t => {
  const hut = FERNWAY_SHELTER;
  assert.ok(world.colliders.some(collider => collider.kind?.startsWith('fernway-shelter')
    && Math.hypot(collider.x - hut.x, collider.z - hut.z) < 3), 'the real shelter walls are present');
  assert.equal(canStand(hut.x, hut.z + 1.35, world, BODY.person), false, 'the rear wall blocks a straight walk');
  walk({ x: hut.x, z: hut.z - 3.2 }, { x: hut.x, z: hut.z + 3.2 }, t);
});
