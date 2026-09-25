import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { bodyWorld, stepToward, BODY } from '../src/bodies.js';
import { canStand } from '../src/game-state.js';
import { BEN_HOME, TROY_HOME, CAGNEY_RESIDENCE } from '../src/quest-homes.js';
import { homeReturnRoute, homeReturnQuayRoute, createHomeReturnWalker, TROY_HOME_FERRY } from '../src/home-return-routes.js';
import { COBBLE_STANDS } from '../src/peblos-world.js';
import { ambronPoint } from '../src/region-world.js';

const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());

function walk(from, route) {
  const position = { ...from }, nav = bodyWorld(world).moving(position, BODY.person), stride = 2.8 / 20;
  for (const [index, target] of route.entries()) {
    assert.ok(canStand(target.x, target.z, world, BODY.person), `waypoint ${index} is usable (${target.x}, ${target.z})`);
    const budget = Math.ceil((Math.hypot(target.x - position.x, target.z - position.z) * 2 + 35) / stride);
    let frames = 0;
    while (frames++ < budget && Math.hypot(target.x - position.x, target.z - position.z) > .25) {
      const before = { ...position };
      stepToward(position, target, stride, nav, BODY.person);
      assert.ok(Math.hypot(position.x - before.x, position.z - before.z) <= stride + 1e-7, 'each step stays within walking speed');
      assert.ok(canStand(position.x, position.z, world, BODY.person), 'feet remain outside walls and water');
    }
    assert.ok(Math.hypot(target.x - position.x, target.z - position.z) <= .25,
      `stalled approaching waypoint ${index} (${target.x}, ${target.z}) at ${position.x.toFixed(2)}, ${position.z.toFixed(2)}`);
  }
  return position;
}

test('Ben walks from the thorn clearing through the Ossen Gate to his own door', () => {
  const from = { x: -788, z: 280 }, route = homeReturnRoute(world, 'ben-sorcerer', from);
  const end = walk(from, route);
  assert.ok(Math.hypot(end.x - BEN_HOME.door.x, end.z - BEN_HOME.door.z) < .25);
});

test('Troy reaches the Cobble quay on foot and has a distinct ferry leg to Port Calos', () => {
  const from = COBBLE_STANDS['bee-keeper'];
  const end = walk(from, homeReturnQuayRoute(world, from));
  assert.ok(Math.hypot(end.x - TROY_HOME_FERRY.board.x, end.z - TROY_HOME_FERRY.board.z) < .25);
  assert.equal(TROY_HOME_FERRY.from, 'peblos');
  assert.equal(TROY_HOME_FERRY.to, 'port-calos');
  assert.ok(Math.hypot(end.x - TROY_HOME_FERRY.ashore.x, end.z - TROY_HOME_FERRY.ashore.z) > 500);
});

test('Troy walks inland from Port Calos through Ambron to his separate house', () => {
  const from = TROY_HOME_FERRY.ashore, route = homeReturnRoute(world, 'bee-keeper', from);
  const end = walk(from, route);
  assert.ok(Math.hypot(end.x - TROY_HOME.door.x, end.z - TROY_HOME.door.z) < .25);
  assert.ok(Math.hypot(TROY_HOME.door.x - BEN_HOME.door.x, TROY_HOME.door.z - BEN_HOME.door.z) > 70);
});

test('Cagney only crosses her porch after receiving her escort reward', () => {
  const route = homeReturnRoute(world, 'cagney', CAGNEY_RESIDENCE.porch);
  assert.deepEqual(route, [{ ...CAGNEY_RESIDENCE.door }]);
  walk(CAGNEY_RESIDENCE.porch, route);
});

test('restored residents continue along their city street without walking back through the gate', () => {
  for (const [id, from, home] of [
    ['ben-sorcerer', ambronPoint(70, -40), BEN_HOME],
    ['bee-keeper', ambronPoint(-10, 0), TROY_HOME],
    ['bee-keeper', ambronPoint(-48, -6), TROY_HOME],
  ]) {
    const route = homeReturnRoute(world, id, from);
    assert.ok(Math.hypot(route[0].x - from.x, route[0].z - from.z) < 1, 'resume where the resident already reached');
    assert.ok(route.every(p => p.x <= from.x + (id === 'ben-sorcerer' ? 20 : 1)), 'no return to the east gate');
    const end = walk(from, route);
    assert.ok(Math.hypot(end.x - home.door.x, end.z - home.door.z) < .25);
  }
});

test('return walking retains obstacle detours when every frame supplies a fresh saved-position record', () => {
  const move = createHomeReturnWalker(bodyWorld(world)), target = ambronPoint(-58, -6), stride = 2.8 / 20;
  // A street prop on the Timber Strand stops a direct westward stride.
  // Resetting the navigator object each frame meant it never accumulated the
  // stalled distance needed to walk around it in the real residence host.
  let position = ambronPoint(-34, -6), frames = 0;
  while (frames++ < 1200 && Math.hypot(position.x - target.x, position.z - target.z) > .25) {
    const before = { ...position }, supplied = { ...position };
    position = move('bee-keeper', supplied, { ...target }, stride);
    assert.deepEqual(supplied, before, 'the authoritative input record is unchanged');
    assert.ok(Math.hypot(position.x - before.x, position.z - before.z) <= stride + 1e-7);
    assert.ok(canStand(position.x, position.z, world, BODY.person));
  }
  assert.ok(Math.hypot(position.x - target.x, position.z - target.z) <= .25, 'Troy gets around the actual obstacle and continues');
  const reset = ambronPoint(-58, -14), next = move('bee-keeper', reset, ambronPoint(-58, -22), stride);
  assert.ok(Math.hypot(next.x - reset.x, next.z - reset.z) <= stride + 1e-7, 'reloading elsewhere synchronizes actual feet without replaying old positions');
});
