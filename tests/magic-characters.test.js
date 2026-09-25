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


test('casting raises the equipped right wand and releases forward from its visible tip', () => {
  const actor = createCharacter(); actor.setWeapon('wand'); actor.setShield(true);
  const right = actor.group.getObjectByName('Right Shoulder'), wrist = actor.group.getObjectByName('Right Wrist');
  for (let i = 0; i <= 60; i++) actor.animate(i / 60, 0, true, { armed: true });
  const restArm = right.rotation.x, restTip = actor.focusTip().clone();
  for (let i = 1; i <= 24; i++) actor.animate(1 + i / 60, 0, true, { armed: true, spellCast: { progress: i / 24 * .4 } });
  const raisedTip = actor.focusTip().clone(), raisedWrist = wrist.rotation.x;
  assert.ok(right.rotation.x < restArm - .3, 'The wand shoulder lifts instead of staying idle');
  assert.ok(raisedTip.y > restTip.y + .25, 'The player visibly gathers the spell above the resting grip');
  // Release can occur on the same clock tick as the preceding pose update.
  actor.animate(1 + 24 / 60, 0, true, { armed: true, spellCast: { progress: .5 } });
  const releaseTip = actor.focusTip().clone(), wand = actor.group.getObjectByName('Plain wand');
  assert.ok(wrist.rotation.x > raisedWrist + .8, 'The wrist flick is distinct from raising the arm');
  assert.ok(releaseTip.z > raisedTip.z + .35, 'The tip sweeps forward at release');
  assert.ok(releaseTip.x > .25 && releaseTip.z > .7, 'The origin is visibly outside the torso');
  assert.ok(new THREE.Vector3(0, 1, 0).transformDirection(wand.matrixWorld).z > .9, 'The wand points toward the target at release');
  const modelTip = new THREE.Vector3(0, .4, 0).applyMatrix4(wand.matrixWorld);
  assert.ok(modelTip.distanceTo(releaseTip) < 1e-8, 'The projectile attachment is the end of the rendered wand');
  for (let i = 1; i <= 24; i++) actor.animate(1.4 + i / 60, 0, true, { armed: true, spellCast: { progress: .5 + i / 48 } });
  assert.ok(Math.abs(wrist.rotation.x) < .01, 'Recovery lowers the casting wrist');
  assert.ok(actor.focusTip().distanceTo(restTip) < .15, 'The focus returns to its ordinary carried pose');
});

test('wand and staff spell origins include the full animated world transform and reject other equipment', () => {
  const actor = createCharacter();
  assert.equal(actor.focusTip(), null, 'A sword cannot be used as a spell origin');
  for (const id of ['wand', 'oak-staff']) {
    actor.setWeapon(id); actor.group.position.set(14, 3, -27); actor.group.rotation.y = 1.23; actor.group.scale.setScalar(1.2);
    actor.animate(0, 0, true, { armed: true, spellCast: { progress: .5 } });
    const model = actor.group.getObjectByName(id === 'wand' ? 'Plain wand' : 'Oak staff');
    const localTip = id === 'wand' ? new THREE.Vector3(0, .4, 0)
      : new THREE.Vector3(.014 + Math.sin(.12) * .12, .83 + Math.cos(.12) * .12, 0);
    const actual = actor.focusTip().clone();
    assert.ok(actual.distanceTo(localTip.applyMatrix4(model.matrixWorld)) < 1e-8, `${id} samples its model rather than an offset from the torso`);
    actor.group.position.x += 9;
    assert.ok(actor.focusTip().distanceTo(actual.add(new THREE.Vector3(9, 0, 0))) < 1e-8, 'World transforms update even between rendered frames');
    actor.setFishing(true); assert.equal(actor.focusTip(), null, 'A stowed focus cannot cast through the fishing rod');
    actor.setFishing(false); actor.setArmed(false); assert.equal(actor.focusTip(), null, 'A hidden weapon has no spell origin');
    actor.setArmed(true); assert.ok(actor.focusTip());
  }
  actor.setWeapon(null); assert.equal(actor.focusTip(), null);
});

test('a casting overlay preserves walking legs and does not move an unequipped wand hand', () => {
  const cast = createCharacter(), walk = createCharacter(); cast.setWeapon('wand'); walk.setWeapon('wand');
  for (let i = 0; i <= 40; i++) {
    cast.animate(i / 60, 3, true, { armed: true, spellCast: { progress: .3 } });
    walk.animate(i / 60, 3, true, { armed: true });
  }
  for (const name of ['Right Hip', 'Left Hip', 'Right Knee', 'Left Knee']) {
    assert.ok(cast.group.getObjectByName(name).quaternion.angleTo(walk.group.getObjectByName(name).quaternion) < 1e-7, 'Casting does not freeze or reset the walking gait');
  }
  const sword = createCharacter(), idle = createCharacter();
  sword.animate(0, 0, true, { armed: true, spellCast: { progress: .5 } }); idle.animate(0, 0, true, { armed: true });
  assert.ok(sword.group.getObjectByName('Right Shoulder').quaternion.angleTo(idle.group.getObjectByName('Right Shoulder').quaternion) < 1e-7);
});


test('a guarded cast keeps the shield arm raised and a melee attack overrides the casting gesture', () => {
  const cast = createCharacter(), guard = createCharacter();
  for (const actor of [cast, guard]) { actor.setWeapon('wand'); actor.setShield(true); }
  for (let i = 0; i <= 40; i++) {
    cast.animate(i / 60, 0, true, { armed: true, guarding: true, spellCast: { progress: .5 } });
    guard.animate(i / 60, 0, true, { armed: true, guarding: true });
  }
  for (const name of ['Left Shoulder', 'Left Elbow']) {
    assert.ok(cast.group.getObjectByName(name).quaternion.angleTo(guard.group.getObjectByName(name).quaternion) < 1e-7, 'The protective arm pose agrees with the active guard');
  }
  assert.ok(cast.group.getObjectByName('Right Wrist').rotation.x > 1, 'The wand still completes its release while guarding');
  const interrupted = createCharacter(), melee = createCharacter();
  for (const actor of [interrupted, melee]) actor.setWeapon('wand');
  for (let i = 0; i <= 12; i++) {
    interrupted.animate(i / 60, 0, true, { armed: true, action: 'attack', progress: i / 15, spellCast: { progress: .5 } });
    melee.animate(i / 60, 0, true, { armed: true, action: 'attack', progress: i / 15 });
  }
  for (const name of ['Right Shoulder', 'Right Elbow', 'Right Wrist']) {
    assert.ok(interrupted.group.getObjectByName(name).quaternion.angleTo(melee.group.getObjectByName(name).quaternion) < 1e-7, 'An interrupted spell cannot override the melee pose');
  }
});
