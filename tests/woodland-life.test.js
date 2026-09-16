import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import { canStand, moveCharacter } from '../src/game-state.js';
import * as THREE from '../vendor/three.module.js';

const { createWorld } = await sourceModule('../src/world.js');
const { createWoodlandLife } = await sourceModule('../src/woodland-life.js');
const scene = new THREE.Scene(), world = createWorld(scene), life = createWoodlandLife(scene, world);

test('Woodland pickups, NPCs, repair, cooking, and fishing are reachable from the village', () => {
  const state = life.state();
  assert.equal(state.acorns.length, 24);
  assert.equal(state.sticks.length, 14);
  assert.equal(state.fruits.length, 12);
  assert.equal(state.fruitPatches.length, 6);
  assert.equal(state.squirrels.length, 4);
  for (const acorn of state.acorns) assert.ok(canStand(acorn.x, acorn.z, world, .6), acorn.id);
  for (const stick of state.sticks) {
    assert.ok(canStand(stick.x, stick.z, world, .65), stick.id);
    assert.ok(state.acorns.every(a => Math.hypot(stick.x - a.x, stick.z - a.z) >= 1.6), `${stick.id} overlaps an acorn hint`);
  }
  assert.ok(state.sticks.filter(stick => stick.z > -20).length >= 2, 'Early sticks must be available before the ambush');
  assert.ok(state.fruits.filter(fruit => fruit.z > -20).length >= 4, 'Two fruit patches must be available before the ambush');
  for (const fruit of state.fruits) {
    assert.ok(canStand(fruit.x, fruit.z, world, .65), fruit.id);
    assert.ok([...state.acorns, ...state.sticks].every(site => Math.hypot(fruit.x - site.x, fruit.z - site.z) >= 2.35),
      `${fruit.id} overlaps another pickup hint`);
  }
  assert.ok(canStand(world.repairBench.x, world.repairBench.z, world, .6), 'Repair bench has a clear standing space');
  assert.ok(Math.hypot(world.repairBench.x - world.training.x, world.repairBench.z - world.training.z) > 3);
  assert.ok(canStand(world.npcPositions['acorn-cook'].x, world.npcPositions['acorn-cook'].z, world));
  // Flood the actual collider map from the village green. A pickup must be
  // approachable from that connected area, not merely clear at its own point.
  const step = .75, minX = -172, minZ = -58, width = 244, height = 228;
  const cells = new Int8Array(width * height), queue = [];
  const indexOf = (x, z) => Math.round((z - minZ) / step) * width + Math.round((x - minX) / step);
  const start = indexOf(-15, 29); cells[start] = 1; queue.push(start);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const index = queue[cursor], ix = index % width, iz = Math.floor(index / width);
    for (const [nx, nz] of [[ix - 1, iz], [ix + 1, iz], [ix, iz - 1], [ix, iz + 1]]) {
      if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;
      const next = nz * width + nx;
      if (cells[next]) continue;
      cells[next] = canStand(minX + nx * step, minZ + nz * step, world, .48) ? 1 : -1;
      if (cells[next] === 1) queue.push(next);
    }
  }
  for (const site of [...state.acorns, ...state.sticks, ...state.fruits, world.repairBench,
    world.npcPositions['acorn-cook'], world.npcPositions.doomsayer, world.npcPositions['pond-fisher'],
    ...world.firePits.filter(fire=>fire.x>-170), world.pond.fishingSpot]) {
    const reachable = queue.some(index => Math.hypot(minX + (index % width) * step - site.x,
      minZ + Math.floor(index / width) * step - site.z) < .9);
    assert.ok(reachable, `Unreachable pickup/NPC at ${site.x}, ${site.z}`);
  }
});

test('Cooking and fishing interaction spots stay clear of NPC prompts and pond water blocks walking', () => {
  const bank = world.pond.fishingSpot;
  for (const point of [...world.firePits, bank]) {
    assert.ok(canStand(point.x, point.z, world, .48), `Blocked activity spot: ${point.id || 'fishing bank'}`);
    for (const [id, npc] of Object.entries(world.npcPositions)) {
      assert.ok(Math.hypot(point.x - npc.x, point.z - npc.z) > 3.3,
        `${point.id || 'fishing bank'} is shadowed by ${id}'s F prompt`);
    }
  }
  for (const id of ['doomsayer', 'pond-fisher']) {
    const npc = world.npcPositions[id];
    assert.ok(canStand(npc.x, npc.z, world), `${id} cannot stand at home`);
    for (const [otherId, other] of Object.entries(world.npcPositions)) {
      if (id !== otherId) assert.ok(Math.hypot(npc.x - other.x, npc.z - other.z) > 3.3,
        `${id}'s home overlaps ${otherId}'s interaction radius`);
    }
  }
  assert.ok(world.firePits.every(fire => Math.hypot(bank.x - fire.x, bank.z - fire.z) > 2.1),
    'A fire prompt must not hide the fishing-bank prompt');
  assert.equal(canStand(world.pond.x, world.pond.z, world), false, 'The pond center is water');
  const player = {x: bank.x, z: bank.z};
  moveCharacter(player, 0, world.pond.z - bank.z - world.pond.radius * 2, world);
  assert.ok(player.z > world.pond.z + world.pond.radius, 'A long movement must stop on the near bank');
  assert.ok(canStand(player.x, player.z, world), 'Water collision leaves the player on valid ground');
});

test('Fire and fishing visuals toggle independently without changing collisions or producing invalid geometry', () => {
  const colliderCount = world.colliders.length;
  const fishing = scene.getObjectByName('Pond fishing line and float');
  assert.ok(fishing);
  assert.equal(fishing.visible, false);
  const finiteGeometry = group => group.traverse(object => {
    assert.ok([...object.matrixWorld.elements].every(Number.isFinite), `${object.name} transform`);
    if (object.geometry) for (const name of ['position', 'normal']) {
      const values = object.geometry.attributes[name]?.array;
      if (values) assert.ok([...values].every(Number.isFinite), `${object.name} ${name}`);
    }
    if (object.isInstancedMesh) assert.ok([...object.instanceMatrix.array].every(Number.isFinite), 'Flame instance transforms');
  });
  for (const fire of world.firePits) {
    const flames = scene.getObjectByName(`${fire.id} flames`);
    assert.ok(flames);
    assert.equal(flames.visible, false);
    assert.equal(world.setCampfireLit(fire.id, true), true);
    assert.equal(flames.visible, true);
    world.update(1.25, 1 / 60); scene.updateMatrixWorld(true);
    finiteGeometry(flames);
    assert.equal(fishing.visible, false, 'Lighting a fire cannot cast the line');
    assert.equal(world.setCampfireLit(fire.id, false), true);
    assert.equal(flames.visible, false);
  }
  assert.equal(world.setCampfireLit('missing-fire', true), false);
  for (const phase of ['waiting', 'bite']) {
    assert.equal(world.setFishingState(phase), true);
    assert.equal(fishing.visible, true);
    world.update(2.75, 1 / 60); scene.updateMatrixWorld(true);
    finiteGeometry(fishing);
    assert.ok(world.firePits.every(fire => !scene.getObjectByName(`${fire.id} flames`).visible),
      'Casting and reeling must not relight a fire');
  }
  assert.equal(world.setFishingState('invalid'), false);
  assert.equal(world.setFishingState('idle'), true);
  assert.equal(fishing.visible, false);
  assert.equal(world.colliders.length, colliderCount, 'Activity visuals must not accumulate invisible obstacles');
});

test('Ripe pawpaws collect once and restore without consuming other woodland pickups', () => {
  const before = life.state(), first = before.fruits[0];
  const fruitMesh = scene.getObjectByName('Collectible ripe pawpaws');
  const saplingMesh = scene.getObjectByName('Pawpaw saplings');
  const fruitTransform = new THREE.Matrix4();
  assert.equal(life.nearestFruit(first).id, first.id);
  assert.equal(life.nearestFruit(first).name, 'Ripe pawpaw');
  assert.equal(life.collectFruit(first.id), true);
  assert.equal(life.collectFruit(first.id), false);
  assert.equal(life.collectFruit(before.sticks[0].id), false);
  assert.equal(life.collectFruit('unknown'), false);
  assert.notEqual(life.nearestFruit(first)?.id, first.id);
  fruitMesh.getMatrixAt(0, fruitTransform);
  assert.equal(fruitTransform.determinant(), 0, 'The collected fruit must disappear from the ground');
  assert.equal(saplingMesh.count, 6, 'Taking fruit must leave its sapling in place');
  assert.deepEqual(life.state().acorns, before.acorns);
  assert.deepEqual(life.state().sticks, before.sticks);
  life.restoreCollectedFruit([first.id]);
  assert.deepEqual(life.state().fruits.filter(fruit => fruit.collected).map(fruit => fruit.id), [first.id]);
  life.restoreCollected([]); life.restoreCollectedSticks([]);
  assert.equal(life.state().fruits.filter(fruit => fruit.collected).length, 1);
  life.restoreCollectedFruit([]);
  fruitMesh.getMatrixAt(0, fruitTransform);
  assert.ok(fruitTransform.determinant() > 0, 'Restoring the fruit resets its visible mesh');
  assert.equal(life.state().fruits.filter(fruit => fruit.collected).length, 0);
});

test('Pawpaw leaves, fruit, and glints have finite batched rendering geometry', () => {
  for (const name of ['Pawpaw saplings', 'Collectible ripe pawpaws', 'Small ripe-pawpaw glints']) {
    const mesh = scene.getObjectByName(name);
    assert.ok(mesh?.isInstancedMesh, `${name} should remain one draw call`);
    assert.ok([...mesh.geometry.attributes.position.array].every(Number.isFinite), `${name} positions`);
    assert.ok([...mesh.geometry.attributes.normal.array].every(Number.isFinite), `${name} normals`);
    assert.ok([...mesh.instanceMatrix.array].every(Number.isFinite), `${name} transforms`);
  }
});

test('Fallen sticks collect once, restore separately, and leave acorns in place', () => {
  const before = life.state(), first = before.sticks[0];
  assert.equal(life.nearestStick(first).id, first.id);
  assert.equal(life.nearestStick({ x: first.x + 2.1, z: first.z }, .01), null);
  assert.equal(life.collectStick(first.id), true);
  assert.equal(life.collectStick(first.id), false);
  assert.equal(life.collectStick(before.acorns[0].id), false);
  assert.equal(life.collectStick('unknown'), false);
  assert.notEqual(life.nearestStick(first)?.id, first.id);
  assert.deepEqual(life.state().acorns, before.acorns);
  life.restoreCollectedSticks([first.id]);
  assert.deepEqual(life.state().sticks.filter(stick => stick.collected).map(stick => stick.id), [first.id]);
  life.restoreCollected([]);
  assert.equal(life.state().sticks.filter(stick => stick.collected).length, 1);
  life.restoreCollectedSticks([]);
  assert.equal(life.state().sticks.filter(stick => stick.collected).length, 0);
});

test('Each acorn is collected once and restoration preserves individual sites', () => {
  const first = life.state().acorns[0];
  assert.equal(life.nearestAcorn(first).id, first.id);
  assert.equal(life.collect(first.id), true);
  assert.equal(life.collect(first.id), false);
  assert.equal(life.collect('unknown'), false);
  assert.notEqual(life.nearestAcorn(first)?.id, first.id);
  life.restoreCollected([first.id]);
  assert.equal(life.state().acorns.filter(a => a.collected).length, 1);
  life.restoreCollected([]);
  assert.equal(life.state().acorns.filter(a => a.collected).length, 0);
});

test('Approached squirrels outrun the traveler and climb their actual trees', () => {
  const squirrel = life.state().squirrels[0], player = { x: squirrel.x + .8, z: squirrel.z };
  life.update(.05, player);
  const running = life.state().squirrels[0];
  assert.equal(running.mode, 'flee');
  assert.ok(Math.hypot(running.x - squirrel.x, running.z - squirrel.z) > 7.2 * .05);
  for (let i = 0; i < 150; i++) life.update(1 / 60, player);
  const perched = life.state().squirrels[0];
  assert.equal(perched.mode, 'perch');
  assert.equal(perched.tree.id, squirrel.tree.id);
  assert.ok(perched.y > world.heightAt(perched.tree.x, perched.tree.z) + 2);
  assert.ok(Math.hypot(perched.x - perched.tree.x, perched.z - perched.tree.z) < 1.5);
  assert.equal(perched.flees, 1); assert.equal(perched.climbs, 1);
});

test('Menus pause wildlife without advancing its simulation', () => {
  const before = life.state();
  for (let i = 0; i < 20; i++) life.update(.05, { x: 0, z: 0 }, false);
  assert.deepEqual(life.state(), before);
});
