import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { createCorpses, CORPSE_TIMING } from '../src/corpses.js';
import { mercenaryById } from '../src/mercenaries.js';
const { createCorpseView, createCorpseActor } = await sourceModule('../src/corpse-view.js');
const { createCharacter } = await sourceModule('../src/characters.js');
const { createStandIn } = await sourceModule('../src/figure-stand-in.js');
const { createCombatView } = await sourceModule('../src/combat-view.js');
const { createCorpseHost } = await sourceModule('../src/corpse-host.js');
const world = { heightAt: () => 4 };

test('every combat body type renders at its death position, stays full size and reconstructs after reload', () => {
  const model = createCorpses(), scene = new THREE.Scene(), view = createCorpseView(scene, world);
  for (const [index, kind] of ['person', 'goblin', 'wolf', 'dog', 'cat', 'ogre', 'spider', 'soldier', 'rebel'].entries()) {
    model.add({ id: `enemy:fight:${kind}`, sourceId: kind, name: kind, kind, x: index * 3, z: 10, yaw: .5, variant: index, model: { role: kind === 'soldier' ? 'legion-soldier' : 'forest-woodcutter' } });
  }
  model.update(10); view.update(model.list(), 10);
  assert.equal(view.count, 9);
  for (const body of model.list()) {
    const actor = view.actor(body.id); assert.ok(actor?.group.visible, body.kind);
    assert.equal(actor.group.scale.x, 1); assert.equal(actor.group.position.x, body.x);
    assert.equal(actor.group.position.y, 4); assert.equal(actor.group.rotation.y, .5);
    actor.group.traverse(object => assert.ok(object.position.toArray().every(Number.isFinite)));
  }
  view.clear(); assert.equal(view.count, 0); view.update(model.list(), 12); assert.equal(view.count, 9);
  view.clear();
});

test('adopted actors keep their identity, weather privately, and cleanup releases only body materials', () => {
  const scene = new THREE.Scene(), model = createCorpses(), view = createCorpseView(scene, world);
  model.add({ id: 'npc:guard', sourceId: 'guard', name: 'Guard', kind: 'person', x: 0, z: 0, model: { role: 'legion-soldier' } });
  const actor = createCharacter({ role: 'legion-soldier' });
  let sourceMaterial; actor.group.traverse(object => { if (object.isMesh && !sourceMaterial) sourceMaterial = object.material; });
  const sourceColor = sourceMaterial.color.clone(), opacity = sourceMaterial.opacity;
  view.adopt(model.get('npc:guard'), actor); assert.equal(view.actor('npc:guard'), actor);
  model.update(CORPSE_TIMING.weathered); view.update(model.list(), 100);
  assert.equal(sourceMaterial.color.getHex(), sourceColor.getHex()); assert.equal(sourceMaterial.opacity, opacity);
  assert.equal(actor.group.userData.corpse.phase, 'weathered'); assert.equal(actor.group.scale.x, 1);
  model.update(CORPSE_TIMING.decay); view.update(model.list());
  assert.equal(view.count, 0); assert.equal(actor.group.parent, null);
});

test('a saved dead humanoid has a settled lying pose instead of replaying a standing actor', () => {
  const model = createCorpses(), view = createCorpseView(new THREE.Scene(), { heightAt: () => 0 });
  model.add({ id: 'npc:man', sourceId: 'man', name: 'Man', kind: 'person', x: 0, z: 0, model: { role: 'traveler' } });
  model.update(30); view.update(model.list(), 30);
  const actor = view.actor('npc:man'), bounds = new THREE.Box3().setFromObject(actor.group);
  assert.ok(bounds.max.y < 1.25, `Resting body reaches ${bounds.max.y}`);
  assert.ok(bounds.max.y - bounds.min.y < 1.25);
  assert.ok(Math.abs(actor.group.getObjectByName('Weight and hips').rotation.z) > 1, 'The articulated body is lying on its side');
  view.clear();
});

test('Chris falls as his full figure when his living actor was using the distant stand-in', () => {
  const chris = mercenaryById('merc-gotwood');
  for (const age of [0, 30]) {
    const model = createCorpses(), view = createCorpseView(new THREE.Scene(), { heightAt: () => 0 });
    const appearance = { role: 'mercenary', look: { ...chris.look, weapon: chris.weapon }, armed: true };
    model.add({ id: `npc:${chris.id}`, sourceId: chris.id, name: chris.name, kind: 'person', x: 0, z: 0, model: appearance });
    const actor = createCharacter(appearance), rig = actor.group.getObjectByName('Weight and hips');
    const unused = new THREE.Group(); unused.name = 'Already hidden detail'; unused.visible = false; actor.group.add(unused);
    // Match showFigure's distant LOD transition: cache each full child's actual
    // visibility, hide that rig, and show the separate unarticulated silhouette.
    for (const child of actor.group.children) { child.userData.shownInFull = child.visible; child.visible = false; }
    const peg = createStandIn(chris.look); actor.group.add(peg);
    let disposed = 0;
    const disposedShared = () => { disposed++; };
    peg.geometry.addEventListener('dispose', disposedShared); peg.material.addEventListener('dispose', disposedShared);
    assert.equal(rig.visible, false); assert.equal(peg.visible, true);
    model.update(age); view.adopt(model.get(`npc:${chris.id}`), actor);
    model.update(3);
    for (let frame = 0; frame < 60; frame++) view.update(model.list(), frame / 30);
    assert.equal(view.actor(`npc:${chris.id}`), actor, 'The actual actor keeps Chris\'s individual appearance');
    assert.equal(rig.visible, true, 'The posed figure must be shown after leaving its living LOD');
    assert.equal(unused.visible, false, 'Restoring the rig preserves intentionally hidden details');
    assert.equal(peg.parent, null, 'The unarticulated stand-in must not contribute to corpse bounds or rendering');
    actor.group.updateMatrixWorld(true);
    const bounds = new THREE.Box3();
    actor.group.traverseVisible(object => {
      if (!object.isMesh || object.userData.groundShadow) return;
      object.geometry.computeBoundingBox(); bounds.union(object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));
    });
    assert.ok(bounds.max.y < 1.25, `Chris should lie on the ground, but reaches ${bounds.max.y}`);
    assert.ok(Math.abs(rig.rotation.z) > 1, 'Chris\'s visible articulated body lies on its side');
    view.clear(); assert.equal(disposed, 0, 'Other living stand-ins still share these cached resources');
    peg.geometry.removeEventListener('dispose', disposedShared); peg.material.removeEventListener('dispose', disposedShared);
  }
});

test('combat renderer hands the original actor to persistent bodies and never creates a second after victory', () => {
  const previous = { document: globalThis.document, innerWidth: globalThis.innerWidth, innerHeight: globalThis.innerHeight };
  const node = () => ({ style: {}, classList: { toggle() {} }, append() {}, remove() {}, hidden: false });
  const elements = new Map();
  globalThis.document = { createElement: node, getElementById(id) { if (!elements.has(id)) elements.set(id, node()); return elements.get(id); } };
  globalThis.innerWidth = 1280; globalThis.innerHeight = 720;
  try {
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(), host = createCorpseHost({ scene, world });
    const combat = createCombatView(scene, world, camera, { onCorpse: (...args) => host.captureCombat(...args) });
    const enemy = { id: 'rebel', kind: 'rebel', name: 'Rebel', hp: 30, maxHp: 30, x: 2, z: 5, yaw: .4, action: 'idle', progress: 0, active: true };
    const state = { encounterId: 'test-fight', phase: 'active', enemies: [enemy], allies: [], player: { action: 'idle', progress: 0, yaw: 0 } };
    combat.update(.1, 0, state, new THREE.Vector3());
    const original = scene.children.find(object => object.name === 'character-forest-woodcutter'); assert.ok(original);
    enemy.hp = 0; enemy.action = 'dead';
    host.combatEvent({ type: 'enemy-defeated', id: enemy.id }, state);
    combat.update(.1, .1, state, new THREE.Vector3()); host.update(3, 3);
    assert.equal(host.view.actor('enemy:test-fight:rebel').group, original);
    assert.equal(original.visible, true); assert.equal(original.scale.x, 1);
    state.phase = 'won'; combat.update(4, 4, state, new THREE.Vector3()); host.update(.1, 4);
    assert.equal(host.model.list().length, 1); assert.equal(host.view.count, 1); assert.equal(original.visible, true);
    state.enemies = []; combat.update(.1, 5, state, new THREE.Vector3());
    assert.equal(original.parent, scene); assert.equal(original.visible, true);
    host.view.clear();
  } finally { for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; } }
});

test('named creatures reconstruct their own appearance and lie still on the ground', () => {
  const cases = [['puck', 'Puck', {}], ['chameleon', 'Ed', {}], ['bosco', 'Bosco', { dye: 0xabcdef }],
    ['batman', 'Batman', {}], ['horse', 'horse-2-saddled', { variant: 2, saddled: true }]];
  for (const [kind, name, appearance] of cases) {
    const model = createCorpses(), view = createCorpseView(new THREE.Scene(), { heightAt: () => 0 });
    model.add({ id: `npc:${kind}`, sourceId: kind, name, kind, x: 0, z: 0, model: appearance }); model.update(5);
    const saved = JSON.parse(JSON.stringify(model.snapshot())); model.restore(saved); view.update(model.list());
    const actor = view.actor(`npc:${kind}`), ownModel = actor.group.getObjectByName(name);
    assert.ok(ownModel, `${name} did not become a generic human`);
    if (kind === 'puck') assert.equal(ownModel.scale.x, .82);
    else { assert.ok(ownModel.rotation.z > 1.4, `${name} lies on its side`); }
    if (kind === 'chameleon') assert.equal(ownModel.scale.x, 1.35);
    if (kind === 'bosco') {
      let dyed = false; ownModel.traverse(object => { if (object.isMesh && object.material.color.getHex() === 0xabcdef) dyed = true; });
      assert.ok(dyed, 'Bosco keeps the dye he had when he fell');
    }
    const before = ownModel.rotation.toArray(); view.update(model.list(), 99); assert.deepEqual(ownModel.rotation.toArray(), before);
    view.clear();
  }
});

test('far bodies retain saved state without actors, reconstruct on approach, and release transferred distant actors', () => {
  const position = { x: 0, z: 0 }, scene = new THREE.Scene();
  const host = createCorpseHost({ scene, world, getPosition: () => position });
  const person = { id: 'remote', name: 'Remote raider', kind: 'rebel', hp: 0, x: 200, z: 0 };
  const supplied = createCharacter({ role: 'forest-woodcutter' }); scene.add(supplied.group);
  assert.equal(host.captureCombat(person, { encounterId: 'far-fight' }, supplied), true);
  host.update(2, 2);
  assert.equal(supplied.group.parent, null); assert.equal(host.view.count, 0);
  const before = host.model.get('enemy:far-fight:remote'); assert.ok(before.lootable);
  position.x = 195; host.update(0, 3);
  assert.equal(host.view.count, 1); assert.ok(host.view.actor(before.id).group.visible);
  assert.deepEqual(host.model.get(before.id).loot, before.loot);
  position.x = 0; host.update(0, 4); assert.equal(host.view.count, 0);
  host.restore(host.snapshot()); assert.equal(host.view.count, 0);
  position.x = 200; host.update(0, 5); assert.equal(host.view.count, 1);
  assert.equal(host.model.list().length, 1); host.view.clear();
});

test('the watch cloth follows the actual fallen pose and hides the complete figure beneath it', () => {
  const terrain = { heightAt: (x, z) => x * .12 - z * .08 };
  const model = createCorpses(), scene = new THREE.Scene(), view = createCorpseView(scene, terrain);
  model.add({ id: 'npc:covered', sourceId: 'covered', name: 'Fallen man', kind: 'person', settlement: true,
    x: 12, z: 8, yaw: 1.1, model: { role: 'forest-woodcutter', armed: true } });
  model.update(5); view.update(model.list(), 5);
  const actor = view.actor('npc:covered'), inverse = actor.group.matrixWorld.clone().invert(), visibleBounds = new THREE.Box3();
  actor.group.updateMatrixWorld(true); inverse.copy(actor.group.matrixWorld).invert();
  actor.group.traverseVisible(object => {
    if (!object.isMesh || object.userData.groundShadow) return;
    object.geometry.computeBoundingBox(); visibleBounds.union(object.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld)));
  });
  const center = visibleBounds.getCenter(new THREE.Vector3());
  model.update(CORPSE_TIMING.townCover); view.update(model.list(), 6);
  const cover = actor.group.getObjectByName('Watch burial cloth');
  assert.equal(cover.visible, true);
  assert.ok(Math.abs(cover.position.x - center.x) < .03 && Math.abs(cover.position.z - center.z) < .03, 'Cloth centers on the offset fallen pose');
  actor.group.traverseVisible(object => {
    if (object.isMesh) assert.ok(object === cover || object.userData.groundShadow, 'The figure must not remain exposed beside the cloth');
  });
  assert.ok(cover.scale.y >= .18 && cover.scale.y <= .48, 'The cloth stays low to the ground');
  cover.updateWorldMatrix(true, false);
  const vertices = cover.geometry.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const at = new THREE.Vector3().fromBufferAttribute(vertices, i).applyMatrix4(cover.matrixWorld);
    assert.ok(at.y >= terrain.heightAt(at.x, at.z) + .024, 'The cloth must not disappear into rising ground');
  }
  view.clear();
});
