import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';

const { createKaylaBear } = await sourceModule('../src/kayla-character.js');
const pawNames = ['Left Fore Paw', 'Right Fore Paw', 'Left Hind Paw', 'Right Hind Paw'];

test('Kayla has a large natural bear silhouette and four articulated paws within a small draw budget', () => {
  const actor = createKaylaBear();
  assert.equal(actor.setWeapon('simple-sword'), false);
  assert.ok(pawNames.every(name => actor.group.getObjectByName(name)?.isGroup));
  let draws = 0, triangles = 0;
  actor.group.traverse(object => {
    assert.ok(!/hat|ribbon|sword|shield|dress/i.test(object.name), 'Kayla has no unrequested accessories');
    if (!object.isMesh) return;
    draws++; triangles += object.geometry.index.count / 3;
    assert.equal(object.material.vertexColors, true);
    for (const attribute of Object.values(object.geometry.attributes)) assert.ok(attribute.array.every(Number.isFinite));
  });
  assert.ok(draws <= 18, `${draws} draw calls`);
  assert.ok(triangles < 7000, `${triangles} triangles`);
  const bounds = new THREE.Box3().setFromObject(actor.group), size = bounds.getSize(new THREE.Vector3());
  assert.ok(size.x > 1 && size.x < 1.5, `broad shoulders: ${size.x}`);
  assert.ok(size.y > 1.45 && size.y < 1.8, `bear height: ${size.y}`);
  assert.ok(size.z > 2.3 && size.z < 2.9, `bear length: ${size.z}`);
  assert.ok(Math.abs(bounds.min.y) < .02, `paws meet the ground: ${bounds.min.y}`);
  const head = actor.group.getObjectByName('Head'), eyeColor = new THREE.Color(0x332419);
  for (const side of [-1, 1]) {
    const origin = head.localToWorld(new THREE.Vector3(side * .147, .066, 1));
    const direction = new THREE.Vector3(0, 0, -1).transformDirection(head.matrixWorld);
    const hit = new THREE.Raycaster(origin, direction).intersectObject(head, true)[0];
    const color = hit.object.geometry.attributes.color;
    assert.ok(Math.abs(color.getX(hit.face.a) - eyeColor.r) < .0001, 'both brown eyes remain visible in front of the fur');
  }
});

test('Kayla walks, swipes a forepaw and recovers without changing host placement or another bear', () => {
  const actor = createKaylaBear(), second = createKaylaBear();
  const paw = actor.group.getObjectByName('Right Fore Paw'), getPaw = () => paw.getWorldPosition(new THREE.Vector3());
  const unchanged = second.group.getObjectByName('Head').rotation.toArray();
  const idlePaw = getPaw();
  for (let frame = 1; frame <= 30; frame++) actor.animate(frame / 30, 0, true, { action: 'attack', progress: .3 });
  const attackPaw = getPaw();
  assert.ok(attackPaw.y > idlePaw.y + .35, 'the attack lifts a forepaw');
  assert.ok(attackPaw.z > idlePaw.z + .4, 'the attack reaches toward its target');
  assert.ok(attackPaw.x < idlePaw.x - .08, 'the paw sweeps across the front');
  for (let frame = 31; frame <= 150; frame++) actor.animate(frame / 30, 0, true);
  assert.ok(Math.abs(getPaw().y - idlePaw.y) < .025, 'the paw returns to the ground');
  assert.deepEqual(second.group.getObjectByName('Head').rotation.toArray(), unchanged);
  actor.group.position.set(15, 3, -7); actor.group.rotation.set(.1, .8, .25); actor.group.scale.setScalar(1.3);
  const placement = [...actor.group.position.toArray(), ...actor.group.rotation.toArray(), ...actor.group.scale.toArray()];
  let frame = 151;
  for (const action of ['idle', 'windup', 'attack', 'hurt', 'stagger', 'dodge', 'dead', 'down']) {
    for (let step = 0; step <= 30; step++) {
      actor.animate(frame++ / 30, 1.6, true, { action, progress: step / 30 }); actor.group.updateMatrixWorld(true);
      actor.group.traverse(object => assert.ok(object.matrixWorld.elements.every(Number.isFinite), `${action} has valid transforms`));
    }
  }
  assert.deepEqual([...actor.group.position.toArray(), ...actor.group.rotation.toArray(), ...actor.group.scale.toArray()], placement);
});
