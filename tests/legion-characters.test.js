import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';

const { createCharacter } = await sourceModule('../src/characters.js');
const joints = ['Weight and hips', 'Chest', 'Head', 'Left Shoulder', 'Right Shoulder', 'Left Elbow', 'Right Elbow',
  'Left Wrist', 'Right Wrist', 'Left Hip', 'Right Hip', 'Left Knee', 'Right Knee', 'Left Ankle', 'Right Ankle'];
const SOLDIERS = ['legion-soldier', 'legion-officer', 'suvali-guard'];

function budget(actor, role) {
  let draws = 0, triangles = 0, metal = 0;
  actor.group.traverse(object => {
    if (!object.isMesh) return;
    draws++; triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
    if (object.material.metalness > 0) metal++;
    for (const key of ['position', 'normal', 'color']) {
      const attribute = object.geometry.attributes[key];
      if (attribute) assert.ok(attribute.array.every(Number.isFinite), `${role} has invalid ${key} geometry`);
    }
  });
  return { draws, triangles, metal };
}

test('Ambroni soldiers and Suvali guards are armored men with helmets, no satchel and no hand weapon', () => {
  for (const role of SOLDIERS) {
    const actor = createCharacter({ role });
    assert.equal(actor.group.name, `character-${role}`);
    assert.ok(joints.every(name => actor.group.getObjectByName(name)?.isGroup), `${role} keeps the articulated rig`);
    assert.equal(actor.setWeapon('simple-sword'), false, `${role} keeps the sword sheathed`);
    assert.equal(actor.setFishing(true), false);
    assert.equal(actor.fishingTip(), null);
    const { draws, triangles, metal } = budget(actor, role);
    assert.ok(metal > 0, `${role} wears iron`);
    assert.ok(draws <= 30, `${role} draws ${draws} batches`);
    assert.ok(triangles < 7500, `${role} has ${triangles} triangles`);
    const helmet = role === 'suvali-guard' ? 'Suvali iron cap' : role === 'legion-officer' ? 'Ambroni plumed helm' : 'Ambroni helm';
    assert.ok(actor.group.getObjectByName(helmet), `${role} wears a ${helmet}`);
    assert.equal(Boolean(actor.group.getObjectByName('Ambroni heater shield')), role === 'legion-soldier');
    assert.equal(Boolean(actor.group.getObjectByName('Officer plume')), role === 'legion-officer');
    const spear = actor.group.getObjectByName('Ambroni spear') || actor.group.getObjectByName('Suvali guard spear');
    assert.equal(Boolean(spear), role !== 'legion-officer', `${role} ${spear ? 'carries' : 'has no'} spear`);
    assert.equal(Boolean(actor.group.getObjectByName('Ambroni mail and tabard')), role !== 'suvali-guard');
    assert.equal(Boolean(actor.group.getObjectByName('Suvali studded jerkin')), role === 'suvali-guard');
  }
});

test('a planted spear stays upright with its butt at the ground through idle and walking', () => {
  for (const [role, name] of [['legion-soldier', 'Ambroni spear'], ['suvali-guard', 'Suvali guard spear']]) {
    const actor = createCharacter({ role });
    const spear = actor.group.getObjectByName(name);
    for (const [time, speed] of [[0, 0], [1.5, 0], [3, 0], [4.5, 0], [5.5, 2.2], [6.5, 2.2]]) {
      actor.animate(time, speed, true, {});
      actor.group.updateMatrixWorld(true);
      const up = new THREE.Vector3(0, 1, 0).transformDirection(spear.matrixWorld);
      assert.ok(up.y > 0.95, `${role} spear stays upright at ${time}s (${up.y.toFixed(3)})`);
      const butt = new THREE.Vector3(0, -0.83, 0).applyMatrix4(spear.matrixWorld);
      if (speed === 0) assert.ok(butt.y > -0.15 && butt.y < 0.3, `${role} spear butt rests near the ground (${butt.y.toFixed(2)})`);
      const tip = new THREE.Vector3(0, 1.48, 0).applyMatrix4(spear.matrixWorld);
      assert.ok(tip.y > 1.9 && tip.y < 2.6, `${role} spear tip stands above the helmet (${tip.y.toFixed(2)})`);
    }
  }
});

test('soldiers animate through every combat pose without producing invalid transforms', () => {
  for (const role of SOLDIERS) {
    const actor = createCharacter({ role });
    let time = 0;
    for (const action of ['idle', 'windup', 'attack', 'hurt', 'dead', 'idle']) {
      for (let i = 0; i < 8; i++) {
        time += 1 / 30;
        actor.animate(time, action === 'idle' ? 1.5 : 0, true, { action, progress: i / 7, alert: action !== 'idle' });
      }
    }
    actor.group.traverse(object => {
      if (!object.isGroup) return;
      for (const value of [...object.position.toArray(), object.rotation.x, object.rotation.y, object.rotation.z]) assert.ok(Number.isFinite(value), `${role} ${object.name}`);
    });
  }
});
