import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
const { createBatman } = await sourceModule('../src/content/quests/batman/batman-model.js');
const { createCharacter } = await sourceModule('../src/content/characters/characters.js');

test('The real bat model has a stable passenger anchor, beating wings and the combat animation interface', () => {
  const actor = createBatman();
  assert.ok(actor.passengerAnchor); assert.equal(typeof actor.animate, 'function');
  actor.update(1, { flying: true, speed: 21 }); const a = actor.wings.map(w => w.rotation.z);
  const seat = actor.passengerAnchor.position.clone();
  actor.update(1.15, { flying: true, speed: 21 }); const b = actor.wings.map(w => w.rotation.z);
  assert.notDeepEqual(a, b); assert.deepEqual(actor.passengerAnchor.position, seat);
  actor.group.updateMatrixWorld(true);
  const orientation = actor.passengerAnchor.getWorldQuaternion(new THREE.Quaternion());
  assert.ok(orientation.angleTo(new THREE.Quaternion()) < 1e-10);
  actor.animate(2, 0, true, { action: 'attack', progress: .5 });
  assert.ok(actor.rig.position.z > .2);
  actor.animate(2.2, 0, true, { action: 'idle' }); assert.equal(actor.rig.position.z, 0);
  actor.animate(3, 0, true, { action: 'dead', progress: 1 }); assert.ok(actor.rig.rotation.x > 1.5);
});

test('The settled player sits on the bat back rather than standing above it', () => {
  const actor = createBatman(), player = createCharacter();
  for (let i = 0; i < 90; i++) player.animate(i / 60, 0, true, { action: 'idle', riding: { pace: 0 }, armed: false });
  for (const flying of [false, true]) {
    actor.group.position.set(18, 90, -34); actor.group.rotation.y = .7;
    actor.update(1.5, { flying, speed: 21, bank: .15 }); actor.group.updateMatrixWorld(true);
    actor.passengerAnchor.getWorldPosition(player.group.position); player.group.rotation.y = actor.group.rotation.y;
    player.group.updateMatrixWorld(true);
    const left = player.group.getObjectByName('Left Hip').getWorldPosition(new THREE.Vector3());
    const right = player.group.getObjectByName('Right Hip').getWorldPosition(new THREE.Vector3());
    const hips = left.add(right).multiplyScalar(.5), seat = actor.passengerSeat.getWorldPosition(new THREE.Vector3());
    assert.ok(hips.distanceTo(seat) < .025, `hips must rest on the back during ${flying ? 'flight' : 'departure'}`);
    const upright = new THREE.Vector3(0, 1, 0).applyQuaternion(actor.passengerAnchor.getWorldQuaternion(new THREE.Quaternion()));
    assert.ok(upright.distanceTo(new THREE.Vector3(0, 1, 0)) < 1e-8, 'banking does not tip the carried traveler');
  }
});
