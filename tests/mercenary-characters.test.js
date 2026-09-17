import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { MERCENARY_ROSTER } from '../src/mercenaries.js';

const { createCharacter } = await sourceModule('../src/characters.js');
const joints = ['Weight and hips', 'Chest', 'Head', 'Left Shoulder', 'Right Shoulder', 'Left Elbow', 'Right Elbow',
  'Left Wrist', 'Right Wrist', 'Left Hip', 'Right Hip', 'Left Knee', 'Right Knee', 'Left Ankle', 'Right Ankle'];
const PROPS = {
  sword: ['Plain iron mercenary sword'], bow: ['Hunting bow', 'Quiver'], mace: ['Iron mace'], dagger: ['Long dagger'], axe: ['Bearded axe'],
  spear: ['Ash spear'], spears: ['Medium spear', 'Short spear'], pike: ['Long spear'], 'sword-shield': ['Plain iron mercenary sword', 'Round shield'],
  greatsword: ['Greatsword'], staff: ['Quarterstaff'],
};

test('every hired sword is built with his own look and the weapon of his fighting style', () => {
  const seen = new Set();
  for (const mercenary of MERCENARY_ROSTER) {
    const actor = createCharacter({ role: 'mercenary', tunic: mercenary.look.tunic, skin: mercenary.look.skin, look: { ...mercenary.look, weapon: mercenary.weapon } });
    assert.equal(actor.group.name, 'character-mercenary');
    assert.ok(joints.every(name => actor.group.getObjectByName(name)?.isGroup), `${mercenary.name} keeps the rig`);
    for (const prop of PROPS[mercenary.weapon]) assert.ok(actor.group.getObjectByName(prop), `${mercenary.name} carries a ${prop}`);
    seen.add(mercenary.weapon);
    let draws = 0, triangles = 0;
    actor.group.traverse(object => {
      if (!object.isMesh) return;
      draws++; triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
      for (const key of ['position', 'normal']) assert.ok(object.geometry.attributes[key].array.every(Number.isFinite), `${mercenary.name} has invalid ${key} geometry`);
    });
    assert.ok(draws <= 34, `${mercenary.name} draws ${draws} batches`);
    assert.ok(triangles < 9000, `${mercenary.name} has ${triangles} triangles`);
    let time = 0;
    for (let i = 0; i < 40; i++) { time += 1 / 30; actor.animate(time, i < 20 ? 1.3 : 0, true, {}); }
    actor.group.traverse(object => {
      if (!object.isGroup) return;
      for (const value of [...object.position.toArray(), object.rotation.x, object.rotation.y, object.rotation.z]) assert.ok(Number.isFinite(value), `${mercenary.name} ${object.name}`);
    });
    if (['spear', 'spears', 'pike', 'staff'].includes(mercenary.weapon)) {
      const planted = actor.group.getObjectByName(PROPS[mercenary.weapon][0]);
      actor.group.updateMatrixWorld(true);
      const up = new THREE.Vector3(0, 1, 0).transformDirection(planted.matrixWorld);
      assert.ok(up.y > 0.95, `${mercenary.name}'s ${planted.name} stands upright (${up.y.toFixed(2)})`);
    }
  }
  assert.equal(seen.size, 11, 'eleven men, eleven different kits');
});

test('the traveler’s own model can show any tradeable weapon, and only one at a time', () => {
  const traveler = createCharacter();
  for (const id of ['simple-sword', 'iron-mace', 'long-dagger', 'bearded-axe', 'greatsword', 'forest-stick']) {
    assert.equal(traveler.setWeapon(id), true, `the traveler can hold ${id}`);
    const visible = ['Plain iron mercenary sword', 'Iron mace', 'Long dagger', 'Bearded axe', 'Greatsword', 'Picked forest stick']
      .filter(name => traveler.group.getObjectByName(name)?.visible);
    assert.equal(visible.length, 1, `holding ${id} shows exactly one weapon (${visible.join(', ')})`);
  }
  assert.equal(traveler.setWeapon('hunting-bow'), false, 'bows are not held weapons yet');
});
