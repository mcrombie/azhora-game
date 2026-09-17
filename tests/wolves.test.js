import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { createCombat } from '../src/combat.js';

const { createWolf } = await sourceModule('../src/characters.js');

function fixture(options = {}) {
  const world = { bounds: { minX: -100, maxX: 100, minZ: -110, maxZ: 60 }, colliders: [], heightAt: () => 1.5, ...options.world };
  const position = { x: 0, y: 1.5, z: -34, ...options.position };
  const events = [];
  const combat = createCombat({ world, position, ...options.combat, onEvent: event => events.push(event) });
  return { combat, world, position, events };
}

function advanceUntil(combat, condition, seconds = 20) {
  for (let i = 0; i < seconds * 60 && !condition(); i++) combat.update(1 / 60);
  assert.ok(condition(), `Condition was not reached within ${seconds} seconds`);
}

const wolfPack = {
  id: 'burial-line-wolves', center: { x: 0, z: -36 }, checkpoint: { x: 0, z: -25 }, retreatZ: -16,
  enemies: [
    { id: 'wolf-lead', x: -1.5, z: -40, hp: 60, kind: 'wolf' },
    { id: 'wolf-second', x: 1.5, z: -42, hp: 60, kind: 'wolf', entry: 1 },
  ],
};

test('a wolf is a four-legged actor the size of a large dog that animates through every combat action', () => {
  for (const variant of [0, 1, 2]) {
    const wolf = createWolf({ variant });
    assert.equal(wolf.group.name, `wolf-${variant}`);
    for (const name of ['Weight and hips', 'Spine', 'Neck', 'Head', 'Jaw', 'Tail', 'Left Fore Hip', 'Right Fore Knee', 'Left Hind Hip', 'Right Hind Knee']) {
      assert.ok(wolf.group.getObjectByName(name)?.isGroup, `wolf has a ${name}`);
    }
    let draws = 0, triangles = 0;
    wolf.group.traverse(object => {
      if (!object.isMesh) return;
      draws++; triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
      for (const key of ['position', 'normal']) assert.ok(object.geometry.attributes[key].array.every(Number.isFinite), `invalid ${key}`);
    });
    assert.ok(draws <= 16, `wolf ${variant} draws ${draws} batches`);
    assert.ok(triangles < 4500, `wolf ${variant} has ${triangles} triangles`);
    wolf.group.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(wolf.group);
    assert.ok(bounds.min.y > -0.08 && bounds.min.y < 0.08, `paws rest at the ground (${bounds.min.y.toFixed(2)})`);
    assert.ok(bounds.max.y > 0.7 && bounds.max.y < 1.2, `a wolf stands lower than a man (${bounds.max.y.toFixed(2)})`);
    assert.ok(bounds.max.z - bounds.min.z > 1.0, 'a wolf is longer than it is tall');
    let time = 0;
    for (const action of ['idle', 'windup', 'attack', 'hurt', 'dead']) {
      for (let i = 0; i < 12; i++) {
        time += 1 / 30;
        wolf.animate(time, action === 'idle' ? 2.5 : 0, true, { action, progress: i / 11, alert: true });
      }
    }
    wolf.group.traverse(object => {
      if (!object.isGroup) return;
      for (const value of [...object.position.toArray(), object.rotation.x, object.rotation.y, object.rotation.z]) assert.ok(Number.isFinite(value), object.name);
    });
    assert.ok(Math.abs(wolf.group.getObjectByName('Weight and hips').rotation.z) > 1.0, 'a dead wolf lies on its side');
    assert.equal(typeof wolf.setArmed, 'function');
  }
});

test('encounters accept wolves as an enemy kind and reject kinds the game has no rules for', () => {
  const { combat } = fixture();
  assert.equal(combat.startEncounter({ ...wolfPack, enemies: [{ ...wolfPack.enemies[0], kind: 'dragon' }] }), false);
  assert.equal(combat.startEncounter(wolfPack), true);
  assert.deepEqual(combat.state.enemies.map(enemy => enemy.kind), ['wolf', 'wolf']);
  assert.equal(combat.state.enemies[0].maxHp, 60);
  assert.equal(combat.state.encounterId, 'burial-line-wolves');
});

test('a wolf closes faster than a goblin, telegraphs its bite and bites for less', () => {
  const run = enemies => {
    const { combat, events } = fixture();
    assert.ok(combat.startEncounter({ ...wolfPack, enemies }));
    const start = combat.state.enemies[0].z;
    for (let i = 0; i < 30; i++) combat.update(1 / 60);
    return { closed: combat.state.enemies[0].z - start, combat, events };
  };
  const wolf = run([{ id: 'wolf', x: 0, z: -44, hp: 60, kind: 'wolf' }]);
  const goblin = run([{ id: 'goblin', x: 0, z: -44, hp: 60 }]);
  assert.ok(goblin.closed > 0.5, `the goblin advances (${goblin.closed.toFixed(2)} m)`);
  assert.ok(wolf.closed > goblin.closed * 1.3, `wolf ${wolf.closed.toFixed(2)} m against goblin ${goblin.closed.toFixed(2)} m in half a second`);
  advanceUntil(wolf.combat, () => wolf.events.some(event => event.type === 'player-hit'), 12);
  assert.ok(wolf.events.some(event => event.type === 'windup' && event.id === 'wolf'), 'the bite is telegraphed');
  assert.equal(wolf.events.find(event => event.type === 'player-hit').damage, 14);
  advanceUntil(goblin.combat, () => goblin.events.some(event => event.type === 'player-hit'), 12);
  assert.equal(goblin.events.find(event => event.type === 'player-hit').damage, 17, 'goblins keep their original damage');
});
