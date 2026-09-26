import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';

const { createKaylaBear, createBearCub } = await sourceModule('../src/kayla-character.js');
const { createEdModel, createEdView } = await sourceModule('../src/chameleon-model.js');
const { createCorpseActor } = await sourceModule('../src/corpse-view.js');
const size = group => new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());

test('the cub is a grounded young bear while Kayla provides a world-space rider anchor on her back', () => {
  const mother = createKaylaBear(), cub = createBearCub(), adultSize = size(mother.group), childSize = size(cub.group);
  assert.ok(childSize.y < adultSize.y * .68 && childSize.y > adultSize.y * .5);
  assert.ok(childSize.z < adultSize.z * .66);
  assert.ok(Math.abs(new THREE.Box3().setFromObject(cub.group).min.y) < .02);
  assert.ok(cub.group.getObjectByName('Head').scale.x > mother.group.getObjectByName('Head').scale.x);
  mother.group.position.set(30, 5, -12); mother.group.rotation.y = Math.PI / 2;
  const seat = mother.seatPosition(), rider = mother.riderPosition();
  assert.ok(seat.y > 6.2 && seat.y < 6.5); assert.ok(seat.x < 30); assert.ok(Math.abs(seat.z + 12) < .1);
  assert.ok(Math.abs(seat.y - rider.y - .58) < 1e-8);
  for (let i = 0; i < 180; i++) { mother.animate(i / 60, 9); cub.animate(i / 60, 2.3); }
  for (const actor of [mother, cub]) {
    actor.group.updateMatrixWorld(true); actor.group.traverse(o => assert.ok(o.matrixWorld.elements.every(Number.isFinite)));
  }
  assert.deepEqual(mother.group.position.toArray(), [30, 5, -12], 'animation never moves the host');
});

test('Ed rides one animated wheel using his original body and returns to his ordinary pose', () => {
  const actor = createEdModel(), originalGroup = actor.group, originalRig = originalGroup.children[0];
  actor.setUnicycle(true); actor.animate(.1, .1, { riding: true, speed: 6 });
  const wheel = originalGroup.getObjectByName('Single unicycle wheel'), cycle = wheel.parent;
  assert.ok(cycle.visible); assert.equal(actor.riding, true); assert.equal(originalGroup.children[0], originalRig);
  const phase = wheel.rotation.x, crank = cycle.getObjectByName('Left crank and pedal'), before = crank.position.toArray();
  actor.animate(.2, .1, { riding: true, speed: 6 });
  assert.ok(wheel.rotation.x > phase); assert.notDeepEqual(crank.position.toArray(), before);
  const box = new THREE.Box3().setFromObject(cycle, true);
  assert.ok(Math.abs(box.min.y) < .015, `wheel touches the ground: ${box.min.y}`);
  for (let i = 0; i < 120; i++) {
    actor.animate(i / 60, 1 / 60, { riding: true, speed: 7.5 }); actor.group.updateMatrixWorld(true);
    actor.group.traverse(o => assert.ok(o.matrixWorld.elements.every(Number.isFinite)));
  }
  actor.setUnicycle(false); actor.animate(4, .1);
  assert.equal(cycle.visible, false); assert.equal(actor.riding, false); assert.ok(originalRig.position.y < .1);
});

test('the existing Ed view can poof into a race without creating a second Ed', () => {
  const scene = new THREE.Scene(), ed = createEdView(scene, { heightAt: () => 3 });
  ed.place({ x: 4, z: 5, yaw: .3 }); ed.setUnicycle(true); ed.puff(); ed.update(0, .1, { riding: true, speed: 5 });
  assert.equal(scene.children.filter(o => o.name === 'Ed').length, 1); assert.equal(ed.puffing, 1);
  for (let i = 0; i < 12; i++) ed.update(i * .1, .1, { riding: true, speed: 5 });
  assert.equal(ed.puffing, 0); assert.deepEqual(ed.group.position.toArray(), [4, 3, 5]);
});

test('a fallen cub retains the cub’s small body when reconstructed after a checkpoint', () => {
  const adult = createCorpseActor({ kind: 'bear', npcId: 'kayla', model: {} }), full = size(adult.group);
  for (const identity of [{ npcId: 'kayla-cub' }, { sourceId: 'kayla-cub' }, { model: { role: 'bear-cub' } }]) {
    const cub = createCorpseActor({ kind: 'bear', model: {}, ...identity }), small = size(cub.group);
    assert.ok(small.x < full.x * .7 && small.y < full.y * .7 && small.z < full.z * .7);
    assert.ok(Math.abs(new THREE.Box3().setFromObject(cub.group).min.y) < .02);
    assert.ok(cub.group.getObjectByName('Kayla’s cub'));
  }
});
