import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { INVENTORY_ITEMS, ICON_KINDS } from '../src/inventory.js';
const { createCharacter } = await sourceModule('../src/characters.js');
const meshCount = group => { let count = 0; group.traverse(node => { if (node.isMesh) count++; }); return count; };

test('the plain wand and oak staff are lazy, inexpensive wooden models that replace the sword', () => {
  const actor = createCharacter(), base = meshCount(actor.group);
  const sword = actor.group.getObjectByName('Plain iron mercenary sword');
  assert.ok(sword?.visible);
  assert.equal(actor.group.getObjectByName('Plain wand'), undefined);
  assert.equal(actor.group.getObjectByName('Oak staff'), undefined);
  const props = [['wand', 'Plain wand', 1], ['oak-staff', 'Oak staff', 1]];
  let expected = base;
  for (const [id, name, draws] of props) {
    assert.equal(actor.setWeapon(id), true);
    const prop = actor.group.getObjectByName(name);
    assert.ok(prop?.visible); assert.equal(prop.parent.name, 'Traveler weapon grip');
    assert.equal(sword.visible, false, `${name} replaces the sword`);
    expected += draws; assert.equal(meshCount(actor.group), expected);
    prop.traverse(node => {
      if (!node.isMesh) return;
      assert.equal(node.material.metalness, 0, `${name} is ordinary wood and grip`);
      assert.equal(node.material.emissive.getHex(), 0, 'Spell light belongs to casting, not an ornate prop');
      assert.ok(node.geometry.attributes.position.array.every(Number.isFinite));
    });
    for (let i = 0; i < 5; i++) actor.setWeapon(id);
    assert.equal(meshCount(actor.group), expected, 'Re-equipping never builds another model');
    actor.setWeapon('simple-sword'); assert.equal(prop.visible, false); assert.equal(sword.visible, true);
    assert.ok(ICON_KINDS.includes(INVENTORY_ITEMS[id].icon));
  }
  actor.setWeapon('oak-staff');
  assert.equal(actor.group.getObjectByName('Plain wand').visible, false);
  actor.setWeapon('wand');
  assert.equal(actor.group.getObjectByName('Oak staff').visible, false);
  assert.equal(actor.setWeapon(null), true); assert.equal(actor.group.getObjectByName('Plain wand').visible, false);
});

test('wand and staff have clearly different lengths while both follow the right hand during a swing', () => {
  const actor = createCharacter();
  actor.setWeapon('wand'); actor.setWeapon('oak-staff');
  const wand = actor.group.getObjectByName('Plain wand'), staff = actor.group.getObjectByName('Oak staff');
  const length = prop => {
    const previous = prop.parent; previous.remove(prop);
    const bounds = new THREE.Box3().setFromObject(prop), size = bounds.getSize(new THREE.Vector3());
    previous.add(prop); return size.y;
  };
  assert.ok(length(wand) > .4 && length(wand) < .55);
  assert.ok(length(staff) > 1.6 && length(staff) < 1.9);
  actor.animate(0, 0, true, { action: 'idle', armed: true }); actor.group.updateMatrixWorld(true);
  const before = staff.getWorldQuaternion(new THREE.Quaternion());
  for (let i = 1; i < 12; i++) actor.animate(i / 30, 0, true, { action: 'attack', progress: i / 14, armed: true });
  actor.group.updateMatrixWorld(true);
  assert.ok(before.angleTo(staff.getWorldQuaternion(new THREE.Quaternion())) > .1, 'The staff moves with the weapon hand');
});
