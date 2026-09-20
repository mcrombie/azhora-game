import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { MERCENARY_ROSTER } from '../src/mercenaries.js';

const { createCharacter, MERCENARY_BUILDS } = await sourceModule('../src/characters.js');
const joints = ['Weight and hips', 'Chest', 'Head', 'Left Shoulder', 'Right Shoulder', 'Left Elbow', 'Right Elbow',
  'Left Wrist', 'Right Wrist', 'Left Hip', 'Right Hip', 'Left Knee', 'Right Knee', 'Left Ankle', 'Right Ankle'];
const PROPS = {
  sword: ['Plain iron mercenary sword'], bow: ['Hunting bow', 'Quiver'], mace: ['Iron mace'], dagger: ['Long dagger'], axe: ['Bearded axe'],
  spear: ['Ash spear'], spears: ['Medium spear', 'Short spear'], pike: ['Long spear'], 'sword-shield': ['Plain iron mercenary sword', 'Round shield'],
  greatsword: ['Greatsword'], staff: ['Quarterstaff'],
};
/** The traveler's own hair colour, from createCharacter's default for his role. */
const TRAVELER_HAIR = 0x806044;
const build = mercenary => createCharacter({ role: 'mercenary', tunic: mercenary.look.tunic, skin: mercenary.look.skin, look: { ...mercenary.look, weapon: mercenary.weapon, trades: mercenary.trades } });
/** The named groups a man's look is required to build, one per feature. */
const lookGroups = look => [`mercenary-headgear-${look.headgear}`, `mercenary-hair-${look.hairStyle}`,
  `mercenary-beard-${look.facialHair}`, `mercenary-garment-${look.garment}`, ...look.marks.map(mark => `mercenary-mark-${mark}`)];
const headHeight = actor => {
  actor.group.updateMatrixWorld(true);
  return new THREE.Vector3().setFromMatrixPosition(actor.group.getObjectByName('Head').matrixWorld).y;
};

test('every hired sword is built with his own look and the weapon of his fighting style', () => {
  const seen = new Set();
  for (const mercenary of MERCENARY_ROSTER) {
    const actor = build(mercenary);
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
    assert.ok(draws <= 32, `${mercenary.name} draws ${draws} batches`);
    assert.ok(triangles < 6500, `${mercenary.name} has ${triangles} triangles`);
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
  assert.equal(seen.size, MERCENARY_ROSTER.length, 'every hired sword is built as a different man');
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

test('no two hired swords share a build, a headgear, a hair, a jaw and a garment', () => {
  const combinations = new Map();
  for (const { name, look } of MERCENARY_ROSTER) {
    for (const field of ['build', 'headgear', 'hairStyle', 'facialHair', 'garment']) assert.equal(typeof look[field], 'string', `${name} has a ${field}`);
    assert.ok(Array.isArray(look.marks), `${name}'s marks are a list`);
    const key = [look.build, look.headgear, look.hairStyle, look.facialHair, look.garment].join('/');
    assert.equal(combinations.get(key), undefined, `${name} and ${combinations.get(key)} are the same man in different colours (${key})`);
    combinations.set(key, name);
  }
  // Silhouette before colour: the strongest cues may not repeat at all.
  for (const field of ['build', 'garment']) {
    const values = MERCENARY_ROSTER.map(mercenary => mercenary.look[field]);
    assert.equal(new Set(values).size, values.length, `a different ${field} for each of them`);
  }
});

test('each hired sword builds the named groups his look calls for, and no others', () => {
  for (const mercenary of MERCENARY_ROSTER) {
    const actor = build(mercenary);
    const found = [];
    actor.group.traverse(object => { if (object.isGroup && object.name.startsWith('mercenary-')) found.push(object.name); });
    const wanted = lookGroups(mercenary.look);
    for (const name of wanted) assert.ok(found.includes(name), `${mercenary.name} builds ${name}`);
    assert.deepEqual([...found].sort(), [...wanted].sort(), `${mercenary.name} builds only the look he was given`);
  }
});

test('a hired sword is never the traveler: not his cloak, not his hair, not his height', () => {
  const traveler = createCharacter();
  const travelerHead = headHeight(traveler);
  assert.ok(traveler.group.getObjectByName('Traveler cloak hem'), 'the traveler still wears his own patched cloak');
  assert.ok(traveler.group.getObjectByName('Traveler tousled hair'), 'the traveler still wears his own tousled hair');
  const heights = [];
  for (const mercenary of MERCENARY_ROSTER) {
    const actor = build(mercenary);
    for (const name of ['Traveler cloak hem', 'Traveler tousled hair']) assert.equal(actor.group.getObjectByName(name), undefined, `${mercenary.name} does not wear the traveler's ${name}`);
    assert.notEqual(mercenary.look.hair, TRAVELER_HAIR, `${mercenary.name} does not share the traveler's hair`);
    const shape = MERCENARY_BUILDS[mercenary.look.build];
    assert.ok(shape, `${mercenary.name}'s build '${mercenary.look.build}' is one the builder knows`);
    for (const key of ['height', 'girth']) assert.ok(shape[key] >= 0.9 && shape[key] <= 1.12, `${mercenary.name}'s ${key} (${shape[key]}) still fits the rig and the colliders`);
    const head = headHeight(actor);
    assert.ok(Number.isFinite(head) && head / travelerHead > 0.9 && head / travelerHead < 1.13, `${mercenary.name} stands at ${(head / travelerHead).toFixed(2)} of the traveler`);
    heights.push(head);
  }
  assert.ok(Math.max(...heights) / Math.min(...heights) > 1.12, 'the tallest man in the company is a head above the shortest');
});
