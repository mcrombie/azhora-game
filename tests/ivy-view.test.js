import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { IVY_PATCHES, IVY_VARIETIES } from '../src/content/quests/sylvia/ivy-sites.js';
import { SYLVIA_STUDIO } from '../src/gameplay/skills/performance/visual-arts.js';
import { canStand } from '../src/gameplay/movement/game-state.js';

const { createIvyView } = await sourceModule('../src/content/quests/sylvia/ivy-view.js');
const { createCharacter } = await sourceModule('../src/content/characters/characters.js');

test('ivy runners hug sloping ground, clearing removes growth, and cancelling a pull restores the remaining foliage', () => {
  const scene = new THREE.Scene(), cleared = new Set(), world = { heightAt: (x, z) => 3 + x * .02 - z * .01, colliders: [] };
  let pose = null;
  const view = createIvyView({ scene, world, ivy: { isCleared: id => cleared.has(id), pose: () => pose } });
  assert.equal(view.group.children.length, 4);
  assert.equal(world.colliders.length, 0, 'The ivy cannot introduce invisible obstacles');
  for (const site of IVY_PATCHES) {
    const patch = view.group.children.find(part => part.userData.ivyId === site.id);
    assert.equal(patch.position.y, world.heightAt(site.x, site.z), 'Each authored patch follows its own actual terrain height');
    const growth = patch.children.find(child => child.name.endsWith('living runners'));
    const leaves = growth.children.filter(child => child.name.includes('lobed leaves'));
    assert.ok(leaves.reduce((sum, leaf) => sum + leaf.count, 0) >= 140, 'The creepers form a conspicuous leafy infestation');
    assert.ok(patch.children.filter(child => child.name === 'Weathered ivy support').length === 2);
    assert.equal(growth.visible, true);
    const full = leaves.map(leaf => leaf.count);
    pose = { id: site.id, progress: .75 }; view.update();
    assert.ok(leaves.every((leaf, i) => leaf.count < full[i]), 'A pull visibly removes a few trailing leaves');
    pose = null; view.update();
    assert.deepEqual(leaves.map(leaf => leaf.count), full, 'An interrupted attempt does not appear completed');
    cleared.add(site.id); view.update();
    assert.equal(growth.visible, false);
    assert.ok(patch.children.filter(child => child.name === 'Weathered ivy support').every(stake => stake.visible), 'Bare stakes show the lasting cleanup');
  }
  view.dispose();
  assert.equal(scene.children.length, 0);
});

test('the ivy lesson has clear footing around Sylvia without occupying her cottage, easel or narrow approach', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const world = createWorld(new THREE.Scene());
  assert.equal(IVY_VARIETIES.drent.hostile, false);
  assert.equal(IVY_VARIETIES.drent.clearSeconds, 2);
  for (const patch of IVY_PATCHES) {
    assert.equal(patch.variety, 'drent');
    assert.ok(canStand(patch.stand.x, patch.stand.z, world, .45), `${patch.id}: the gardener has space to kneel`);
    assert.ok(canStand(patch.x, patch.z, world, .2), `${patch.id}: the ivy is on land beside the wall, not inside the cottage`);
    for (const key of ['easel', 'practice', 'stand']) assert.ok(Math.hypot(patch.x - SYLVIA_STUDIO[key].x, patch.z - SYLVIA_STUDIO[key].z) > 3, 'The art lesson stays accessible');
  }
});

test('weeding visibly kneels and pulls with bare hands while leaving the actor origin steady', () => {
  const actor = createCharacter(), idle = createCharacter();
  const joint = (target, name) => target.group.getObjectByName(name);
  const point = name => joint(actor, name).getWorldPosition(new THREE.Vector3());
  const settle = (progress, start) => {
    for (let i = 0; i < 90; i++) actor.animate(start + i / 60, 0, true, { weeding: { progress }, armed: false });
    actor.group.updateMatrixWorld(true);
  };
  settle(0, 0);
  assert.ok(joint(actor, 'Left Knee').rotation.x > 1.7 && joint(actor, 'Right Knee').rotation.x > 1.7, 'Both knees support the low gardening posture');
  const reached = point('Right Wrist');
  assert.ok(reached.y < .6, 'The hands reach the low ivy runners');
  settle(.25, 2);
  const pulled = point('Right Wrist');
  assert.ok(pulled.distanceTo(reached) > .1, 'The player visibly pulls the handful back');
  assert.deepEqual(actor.group.position.toArray(), [0, 0, 0], 'No camera-bearing actor position changes');
  for (let i = 0; i < 120; i++) {
    actor.animate(4 + i / 60, 0, true, { armed: true }); idle.animate(4 + i / 60, 0, true, { armed: true });
  }
  for (const name of ['Left Knee', 'Right Knee', 'Left Shoulder', 'Right Shoulder', 'Left Elbow', 'Right Elbow']) {
    assert.ok(joint(actor, name).quaternion.angleTo(joint(idle, name).quaternion) < 1e-6, `${name} returns to ordinary idle after clearing or cancelling`);
  }
});
