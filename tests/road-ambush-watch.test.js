import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { AMBUSH_REBELS, createRoadAmbush } from '../src/road-ambush.js';

const { createRoadAmbushWatch } = await sourceModule('../src/road-ambush-watch.js');
function fixture() {
  const scene = new THREE.Scene(), world = { heightAt: (x, z) => x * .01 + z * .02 };
  const ambush = createRoadAmbush(), watch = createRoadAmbushWatch({ scene, world, definitions: AMBUSH_REBELS });
  return { scene, world, ambush, watch };
}

test('the three waiting ambushers are visible human figures under ragged cover before combat', () => {
  const { scene, world, ambush, watch } = fixture();
  watch.update(0, ambush.actors());
  assert.equal(watch.snapshot().length, 3);
  for (const record of watch.snapshot()) {
    const spec = AMBUSH_REBELS.find(one => one.id === record.id);
    assert.equal(record.visible, true); assert.equal(record.cover, true);
    assert.equal(record.x, spec.home.x); assert.equal(record.z, spec.home.z);
    assert.equal(record.y, world.heightAt(record.x, record.z));
    const group = scene.children.find(one => one.userData.roadAmbushId === record.id);
    for (const joint of ['Head', 'Left Hip', 'Right Hip', 'Left Wrist', 'Right Wrist']) assert.ok(group.getObjectByName(joint), `${joint} remains a human silhouette`);
    assert.ok(group.getObjectByName('Uneven brown cloth panels'));
    assert.ok(group.getObjectByName('Leaves tied into the cloth'));
    group.traverse(object => {
      if (!object.isMesh) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      assert.ok(materials.every(material => material.opacity === 1), 'concealment uses clothing and position, not invisible bodies');
      assert.ok([...object.geometry.attributes.position.array].every(Number.isFinite));
    });
  }
  const head = scene.children[0].getObjectByName('Head'), before = head.rotation.toArray();
  for (let i = 1; i <= 90; i++) watch.update(i / 60, ambush.actors());
  assert.notDeepEqual(head.rotation.toArray(), before, 'the waiting figure breathes instead of being a static shrub');
  watch.dispose();
});

test('combat borrows the same model and has sole control of its position and pose', () => {
  const { scene, ambush, watch } = fixture();
  const initial = ambush.actors(); watch.update(0, initial);
  const id = initial[0].id, actor = watch.actor(id);
  assert.equal(watch.actor(id), actor);
  const ready = watch.snapshot().find(one => one.id === id);
  assert.equal(ready.cover, false);
  assert.equal(ready.x, initial[0].x, 'taking the actor does not relocate it');
  actor.group.position.set(-99, 3, 42); actor.group.rotation.y = 1.25;
  watch.update(1, initial.map(one => ({ ...one, mode: 'active' })), { combat: { phase: 'active', enemies: initial } });
  assert.deepEqual(actor.group.position.toArray(), [-99, 3, 42]); assert.equal(actor.group.rotation.y, 1.25);
  assert.equal(scene.children.filter(one => one.userData.roadAmbushId === id).length, 1, 'there is one body for the stable ID');
  watch.dispose();
});

test('a retreat resumes the same survivor where combat left them and follows supplied return positions', () => {
  const { ambush, watch } = fixture(), records = ambush.actors();
  watch.update(0, records); const actor = watch.actor(records[0].id);
  const retreat = records.map((one, i) => ({ ...one, hp: 30 + i, mode: 'returning', x: one.x + 6, z: one.z - 2, speed: 1.8 }));
  watch.update(1, retreat);
  assert.equal(watch.snapshot()[0].x, retreat[0].x); assert.equal(watch.snapshot()[0].z, retreat[0].z);
  assert.equal(watch.snapshot()[0].cover, true);
  retreat[0].x -= .03; retreat[0].z += .02;
  watch.update(1 + 1 / 60, retreat);
  assert.equal(actor.group.position.x, retreat[0].x);
  assert.equal(actor.group.position.z, retreat[0].z);
  assert.equal(watch.actor(records[0].id), actor, 'returning did not replace the combat survivor');
  watch.dispose();
});

test('a transferred corpse is never hidden or moved by the watcher, while a living save creates a fresh actor', () => {
  const { scene, ambush, watch } = fixture(), records = ambush.actors(), id = records[0].id;
  watch.update(0, records); const body = watch.actor(id);
  const corpseGroup = new THREE.Group(); scene.add(corpseGroup); corpseGroup.add(body.group);
  body.group.position.set(-95, 2, 40); body.group.rotation.z = Math.PI / 2;
  assert.equal(watch.release(id), true);
  watch.update(1, records.map(one => one.id === id ? { ...one, hp: 0, mode: 'dead' } : one));
  assert.equal(body.group.visible, true); assert.deepEqual(body.group.position.toArray(), [-95, 2, 40]);
  assert.equal(body.group.rotation.z, Math.PI / 2); assert.equal(watch.actor(id), null);
  assert.equal(watch.release(id), false);
  corpseGroup.removeFromParent();
  watch.update(2, records);
  assert.notEqual(watch.actor(id), body, 'loading a living checkpoint does not reuse a corpse-owned rig');
  assert.equal(watch.snapshot().find(one => one.id === id).released, false);
  watch.dispose();
});

test('dead records without combat corpses stay hidden and missing records do not leave stray living figures', () => {
  const { ambush, watch } = fixture(), records = ambush.actors();
  watch.update(0, records);
  watch.update(1, [{ ...records[0], hp: 0, mode: 'dead' }]);
  assert.ok(watch.snapshot().every(one => !one.visible));
  watch.dispose(); watch.update(2, records); assert.deepEqual(watch.snapshot(), []);
});


test('woodland cover masks the cap and shoulders while leaving the face readable', () => {
  const { scene, ambush, watch } = fixture(); watch.update(0, ambush.actors());
  for (const actor of scene.children.filter(group => group.userData.roadAmbushId)) {
    actor.updateMatrixWorld(true);
    const head = actor.getObjectByName('Head'), hood = actor.getObjectByName('Rebel leaf hood');
    const cloak = actor.getObjectByName('Rebel ragged woodland cover');
    assert.equal(cloak.parent.name, 'Chest', 'shoulder cover follows the crouching chest');
    assert.equal(hood.parent, head, 'hood follows the articulated head');
    const covered = object => { for (let p = object; p; p = p.parent) if (p === hood) return true; return false; };
    const ray = (from, direction) => {
      const origin = head.localToWorld(new THREE.Vector3(...from));
      const toward = new THREE.Vector3(...direction).transformDirection(head.matrixWorld);
      return new THREE.Raycaster(origin, toward).intersectObject(head, true)[0];
    };
    assert.ok(covered(ray([0, 1.2, 0], [0, -1, 0])?.object), 'opaque hood conceals the bright cap from above');
    const face = ray([0, .20, 2], [0, 0, -1]);
    assert.ok(face && !covered(face.object), 'an opening preserves a glimpse of the actual face');
    let draws = 0, triangles = 0;
    for (const cover of [cloak, hood]) cover.traverse(object => {
      if (!object.isMesh) return; draws++;
      triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3 * (object.isInstancedMesh ? object.count : 1);
    });
    assert.ok(draws <= 10 && triangles < 2400, 'denser foliage keeps a bounded renderer cost');
  }
  watch.dispose();
});
