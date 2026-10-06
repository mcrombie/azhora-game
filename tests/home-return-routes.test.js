import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { bodyWorld, stepToward, BODY } from '../src/gameplay/combat/bodies.js';
import { canStand } from '../src/gameplay/movement/game-state.js';
import { BEN_HOME, TROY_HOME, CAGNEY_RESIDENCE } from '../src/content/quests/homes/quest-homes.js';
import { homeReturnRoute, homeReturnQuayRoute, createHomeReturnWalker, TROY_HOME_FERRY } from '../src/content/quests/homes/home-return-routes.js';
import { COBBLE_STANDS } from '../src/content/regions/peblos/peblos-world.js';
import { OSSEN_TRACK } from '../src/content/regions/ambron/elagos-world.js';
import { AMBRON_SAFE_ARRIVAL, inAmbronOutline } from '../src/content/regions/ambron/ambron-city-layout.js';
import { ALEX_DOOR, ALEX_STEP } from '../src/content/quests/roadside/alex.js';

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
    ['ben-sorcerer', BEN_HOME.route.at(-5), BEN_HOME],
    ['bee-keeper', TROY_HOME.route.at(-6), TROY_HOME],
    ['bee-keeper', {x:(TROY_HOME.route.at(-6).x+TROY_HOME.route.at(-5).x)/2,z:TROY_HOME.route.at(-5).z}, TROY_HOME],
  ]) {
    const route = homeReturnRoute(world, id, from);
    assert.ok(Math.hypot(route[0].x - from.x, route[0].z - from.z) < 1, 'resume where the resident already reached');
    assert.ok(route.every(p => Math.hypot(p.x-OSSEN_TRACK[0].x,p.z-OSSEN_TRACK[0].z)>20), 'no return to the east gate');
    const end = walk(from, route);
    assert.ok(Math.hypot(end.x - home.door.x, end.z - home.door.z) < .25);
  }
});

test('return walking retains obstacle detours when every frame supplies a fresh saved-position record', () => {
  const move = createHomeReturnWalker(bodyWorld(world)), post = TROY_HOME.mailbox;
  const target = {x:post.x,z:post.z+4}, stride = 2.8 / 20;
  // Walk around the actual mailbox. Replacing the navigation cursor every frame
  // used to erase the detour before the resident could step around the post.
  let position = {x:post.x,z:post.z-4}, frames = 0;
  assert.ok(canStand(position.x,position.z,world,BODY.person));
  assert.ok(canStand(target.x,target.z,world,BODY.person));
  assert.equal(canStand(post.x,post.z,world,BODY.person),false,'a real solid prop blocks the direct line');
  while (frames++ < 1200 && Math.hypot(position.x - target.x, position.z - target.z) > .25) {
    const before = { ...position }, supplied = { ...position };
    position = move('bee-keeper', supplied, { ...target }, stride);
    assert.deepEqual(supplied, before, 'the authoritative input record is unchanged');
    assert.ok(Math.hypot(position.x - before.x, position.z - before.z) <= stride + 1e-7);
    assert.ok(canStand(position.x, position.z, world, BODY.person));
  }
  assert.ok(Math.hypot(position.x - target.x, position.z - target.z) <= .25, 'Troy gets around the actual obstacle and continues');
  const reset = {...TROY_HOME.entry}, next = move('bee-keeper', reset, TROY_HOME.door, stride);
  assert.ok(Math.hypot(next.x - reset.x, next.z - reset.z) <= stride + 1e-7, 'reloading elsewhere synchronizes actual feet without replaying old positions');
});


test('the concave city boundary routes outside travelers through the Ossen Gate',()=>{
  const from=OSSEN_TRACK[1];assert.equal(inAmbronOutline(from.x,from.z),false);
  const route=homeReturnRoute(world,'ben-sorcerer',from);
  assert.ok(route.some(p=>Math.hypot(p.x-OSSEN_TRACK[0].x,p.z-OSSEN_TRACK[0].z)<.01),'the real gate remains mandatory');
  walk(from,route);
});

test('residents migrated from the old city reach each new doorstep from the safe entrance',()=>{
  for(const home of [BEN_HOME,TROY_HOME,CAGNEY_RESIDENCE])walk(AMBRON_SAFE_ARRIVAL,homeReturnRoute(world,home.npcId,AMBRON_SAFE_ARRIVAL));
});

test('Alex can leave the shared door and stand beside Cagney without clipping their house or mailbox',()=>{
  assert.ok(canStand(ALEX_DOOR.x,ALEX_DOOR.z,world,BODY.person));
  walk(ALEX_DOOR,[ALEX_STEP]);
});
