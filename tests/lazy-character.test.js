import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sourceModule } from './module-loader.js';

const THREE = await sourceModule('../vendor/three.module.js');
const { createCharacter, BUCKLER_NAME, tunicForRole, skinForRole } = await sourceModule('../src/content/characters/characters.js');
const { createLazyCharacter } = await sourceModule('../src/world/loading/lazy-character.js');
const { createStandIn } = await sourceModule('../src/world/actors/figure-stand-in.js');

// Exercise the composition root's actual LOD transition without a DOM/WebGL
// launch. The function only needs these three geometry/look dependencies.
const mainSource = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
const showStart = mainSource.indexOf('  function showFigure(npc,detail){');
assert.ok(showStart >= 0, 'main still provides its named figure LOD transition');
const showSource = mainSource.slice(showStart, mainSource.indexOf('\n  }\n', showStart) + 5);
const showFigure = Function('createStandIn', 'tunicForRole', 'skinForRole', `return (${showSource});`)(createStandIn, tunicForRole, skinForRole);

// Compare authored parts and posed transforms, including hidden equipment. UUIDs
// and allocation order are deliberately excluded from the visible contract.
function parts(actor) {
  const result = [];
  actor.group.traverse(object => {
    result.push({ name: object.name, type: object.type, visible: object.visible,
      position: object.position.toArray(), rotation: object.quaternion.toArray(), scale: object.scale.toArray(),
      triangles: object.isMesh ? (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3 : 0,
      colors: object.material ? (Array.isArray(object.material) ? object.material : [object.material]).map(mat => mat.color?.getHex()) : [],
    });
  });
  return result;
}

test('logical transforms, markers, diagnostics and hidden animation do not construct a named rig', () => {
  let notifications = 0;
  const actor = createLazyCharacter({ role: 'legion-officer', hat: false }, { onMaterialize: () => notifications++ });
  const scene = new THREE.Scene(), group = actor.group, position = group.position, rotation = group.rotation, scale = group.scale;
  const marker = new THREE.Group(); marker.name = 'external quest attachment'; group.add(marker); scene.add(group);
  position.set(81, 7, -12); rotation.y = .8; scale.setScalar(.7); group.visible = false;
  for (let frame = 0; frame < 1000; frame++) {
    actor.setWeapon('bearded-axe'); actor.setShield(false); actor.animate(frame / 60, 1, true);
  }
  const names = []; scene.traverse(object => names.push(object.name));
  assert.equal(scene.getObjectByName('Left Wrist'), undefined);
  assert.ok(names.includes('external quest attachment')); assert.equal(actor.materialized, false);
  assert.equal(Object.getOwnPropertyDescriptor(actor, 'materialized').get(), false);
  assert.equal(notifications, 0);
  assert.equal(actor.ensureModel(), actor); assert.equal(actor.materialized, true);
  assert.equal(actor.group, group); assert.equal(group.position, position); assert.equal(group.rotation, rotation); assert.equal(group.scale, scale);
  assert.equal(group.parent, scene); assert.equal(marker.parent, group); assert.equal(group.visible, false);
  assert.deepEqual(position.toArray(), [81, 7, -12]); assert.deepEqual(scale.toArray(), [.7, .7, .7]);
  assert.ok(group.getObjectByName('Left Wrist')); assert.ok(group.getObjectByName('Bearded axe'));
  actor.ensureModel(); assert.equal(notifications, 1, 'a rig is built once even after explicit repeated requests');
});

test('deferred named figures preserve authored looks, hats, blank placeholders and root scale overrides', () => {
  for (const options of [
    { role: 'harbormaster', hat: false, skin: 0xc39a72, tunic: 0x2f5a63, look: { slight: true, hairStyle: 'long', hair: 0x3b2a1d } },
    { role: 'fisher', hat: true },
    { role: 'mercenary', look: { build: 'broad', weapon: 'axe', hairStyle: 'short-cropped', hair: 0x553311, facialHair: 'forked', headgear: 'bare' } },
    { role: 'inquest', look: { blankSlate: true } },
    { role: 'villager', hat: false, look: { discoHead: true } },
  ]) {
    const eager = createCharacter(options), lazy = createLazyCharacter(options);
    assert.equal(lazy.group.name, eager.group.name); assert.deepEqual(lazy.group.scale.toArray(), eager.group.scale.toArray());
    assert.equal(lazy.group.userData.blankSlate, eager.group.userData.blankSlate);
    eager.group.position.set(20, 3, -10); lazy.group.position.copy(eager.group.position);
    eager.group.rotation.y = lazy.group.rotation.y = .65;
    eager.group.scale.setScalar(.76); lazy.group.scale.setScalar(.76);
    for (let frame = 0; frame < 10; frame++) {
      eager.animate(frame / 60, 1.3, true, {}); lazy.animate(frame / 60, 1.3, true, {});
    }
    assert.deepEqual(parts(lazy), parts(eager), `${options.role} retains its authored parts and pose`);
  }
});

test('queued shield, fishing and weapon changes retain their effects and order when a distant rig appears', () => {
  const options = { role: 'legion-officer', armed: true, hat: false };
  const eager = createCharacter(options), lazy = createLazyCharacter(options);
  const commands = [['setWeapon', 'bearded-axe'], ['setShield', true], ['setWeapon', 'not-a-weapon'],
    ['setFishing', true], ['setArmed', false], ['setFishing', false], ['setShield', false],
    ['setWeapon', 'simple-sword'], ['setArmed', false], ['setShield', true]];
  for (const [method, value] of commands) { eager[method](value); assert.equal(lazy[method](value), undefined); }
  assert.equal(lazy.materialized, false);
  lazy.ensureModel();
  assert.deepEqual(parts(lazy), parts(eager));
  assert.equal(lazy.setWeapon('not-a-weapon'), false, 'materialized setters return the original result');
  assert.equal(lazy.setWeapon('bearded-axe'), true);
});

test('requesting a fishing endpoint explicitly constructs a hidden teacher at its logical world transform', () => {
  const options = { role: 'doomsayer', hat: false }, eager = createCharacter(options), lazy = createLazyCharacter(options);
  for (const actor of [eager, lazy]) {
    actor.group.position.set(30, 10, -44); actor.group.rotation.y = -.6; actor.group.scale.setScalar(.9);
    actor.group.visible = false; actor.setFishing(true);
  }
  assert.equal(lazy.materialized, false);
  assert.ok(lazy.fishingTip().distanceTo(eager.fishingTip()) < 1e-9);
  assert.equal(lazy.materialized, true); assert.equal(lazy.group.visible, false);
  lazy.group.visible = eager.group.visible = true;
  for (let frame = 0; frame < 20; frame++) {
    eager.animate(frame / 60, 0, true, { fishing: true }); lazy.animate(frame / 60, 0, true, { fishing: true });
  }
  assert.ok(lazy.fishingTip().distanceTo(eager.fishingTip()) < 1e-9);
  assert.deepEqual(parts(lazy), parts(eager));
});

test('materialization hooks see replayed equipment and can apply shadows without loading other figures', () => {
  const distant = createLazyCharacter({ role: 'garden-keeper' });
  let seen = 0;
  const actor = createLazyCharacter({ role: 'mercenary', look: { weapon: 'sword', headgear: 'bare' } }, {
    onMaterialize(ready) {
      seen++; assert.equal(ready.materialized, true); assert.ok(ready.group.getObjectByName(BUCKLER_NAME));
      ready.group.traverse(object => { if (object.isMesh) object.castShadow = false; });
    },
  });
  actor.setShield(true); actor.ensureModel();
  actor.group.traverse(object => { if (object.isMesh) assert.equal(object.castShadow, false); });
  assert.equal(seen, 1); assert.equal(distant.materialized, false);
  assert.equal(distant.group.getObjectByName('Head'), undefined, 'name lookups never instantiate another actor');
});

test('alternating offscreen equipment changes have a bounded queue and keep the exact final equipment', () => {
  const options = { role: 'legion-officer', armed: true }, eager = createCharacter(options);
  let loads = 0;
  const lazy = createLazyCharacter(options, { onMaterialize: () => loads++ }); lazy.group.visible = false;
  for (let frame = 0; frame < 1000; frame++) {
    for (const actor of [eager, lazy]) { actor.setWeapon('bearded-axe'); actor.setFishing(false); actor.setShield(false); }
    if (frame === 16) assert.equal(lazy.materialized, true, 'distinct alternating commands build a single rig before their history can keep growing');
  }
  assert.equal(loads, 1); assert.equal(lazy.group.visible, false);
  eager.group.visible = false; assert.deepEqual(parts(lazy), parts(eager));
});

test('the live LOD transition replaces a stand-in with a scaled lazy rig and restores it on later approaches', () => {
  const npc = { id: 'willowmere-barrett', modelRole: 'villager', color: 0xb29b58, skin: 0xc6a17b,
    look: { hair: 0x68482f, hairStyle: 'short-cropped', child: true, beard: false, hat: false } };
  npc.actor = createLazyCharacter({ role: npc.modelRole, tunic: npc.color, skin: npc.skin, look: npc.look, hat: false }, {
    onMaterialize: () => { npc.shadows = undefined; npc.detailDirty = true; },
  });
  const group = npc.actor.group, position = group.position; group.position.set(12, 4, 30); group.scale.setScalar(.68);
  showFigure(npc, 'stand-in');
  const standIn = npc.standIn; assert.equal(standIn.visible, true); assert.equal(npc.actor.materialized, false);
  npc.actor.ensureModel();
  assert.equal(npc.detailDirty, true, 'an explicit effect lookup requests another LOD pass');
  showFigure(npc, 'stand-in');
  assert.equal(standIn.visible, true); assert.ok(group.children.filter(child => child !== standIn).every(child => !child.visible));
  showFigure(npc, 'full');
  assert.equal(standIn.visible, false); assert.equal(npc.detailDirty, false);
  assert.ok(group.children.filter(child => child !== standIn).every(child => child.visible));
  assert.equal(npc.actor.group, group); assert.equal(group.position, position); assert.deepEqual(group.scale.toArray(), [.68, .68, .68]);
  const count = group.children.length;
  showFigure(npc, 'stand-in'); showFigure(npc, 'full');
  assert.equal(group.children.length, count); assert.equal(standIn.visible, false);
  assert.ok(group.children.filter(child => child !== standIn).every(child => child.visible));
});
