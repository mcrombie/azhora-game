import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';

const { createCharacter } = await sourceModule('../src/characters.js');
const roles = ['commons-miller', 'reed-worker', 'shelter-keeper'];
const joints = ['Weight and hips', 'Chest', 'Head', 'Left Shoulder', 'Right Shoulder', 'Left Elbow', 'Right Elbow',
  'Left Wrist', 'Right Wrist', 'Left Hip', 'Right Hip', 'Left Knee', 'Right Knee', 'Left Ankle', 'Right Ankle'];
const pose = actor => joints.map(name => {
  const joint = actor.group.getObjectByName(name);
  return [...joint.position.toArray(), joint.rotation.x, joint.rotation.y, joint.rotation.z];
});

test('the three local workers retain articulated cloth silhouettes within a small rigid-batch budget', () => {
  const shapes = [];
  for (const role of roles) {
    const actor = createCharacter({ role });
    assert.equal(actor.group.name, `character-${role}`);
    assert.equal(actor.setWeapon('simple-sword'), false);
    assert.equal(actor.setWeapon('forest-stick'), false);
    assert.equal(actor.setFishing(false), false, 'idle workers have not created a borrowed fishing rod');
    assert.equal(actor.fishingTip(), null);
    assert.ok(joints.every(name => actor.group.getObjectByName(name)?.isGroup));
    let draws = 0, triangles = 0;
    actor.group.traverse(object => {
      assert.ok(!/weapon|sword|armor|staff/i.test(object.name), `${role} accidentally carries combat equipment`);
      if (!object.isMesh) return;
      draws++; triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
      assert.equal(object.material.metalness, 0, 'plain cloth, wood, and skin need no metallic armor material');
      for (const key of ['position', 'normal', 'color']) {
        const attribute = object.geometry.attributes[key];
        if (attribute) assert.ok(attribute.array.every(Number.isFinite), `${role} has invalid ${key} geometry`);
      }
    });
    assert.ok(draws <= 18, `${role} exceeded the articulated model draw budget`);
    assert.ok(triangles < 4200, `${role} exceeded the low-poly model budget`);
    shapes.push(triangles);
    const drape = actor.group.getObjectByName('Shelter keeper shawl drape');
    assert.equal(Boolean(drape), role === 'shelter-keeper');
    if (drape) assert.equal(drape.parent.name, 'Chest', 'the shawl must follow the shoulders independently of the hips');
  }
  assert.equal(new Set(shapes).size, 3, 'new neighbors have distinct geometry rather than color swaps');
});

test('quiet local idles stay finite and grounded while independent shoulders, heads, and hips move', () => {
  const finalPoses = [];
  for (const role of roles) {
    const actor = createCharacter({ role }), motion = new Map(joints.map(name => [name, []]));
    for (let frame = 0; frame < 900; frame++) {
      actor.animate(frame / 30, 0, true);
      actor.group.updateMatrixWorld(true);
      actor.group.traverse(object => {
        assert.ok(object.matrixWorld.elements.every(Number.isFinite), `${role}: invalid animated transform`);
        assert.ok(object.scale.x > 0 && object.scale.y > 0 && object.scale.z > 0, `${role}: collapsed articulated part`);
      });
      if (frame < 60 || frame % 15) continue;
      const bounds = new THREE.Box3().setFromObject(actor.group);
      assert.ok(bounds.min.y >= -.025 && bounds.min.y <= .025, `${role} floated or sank while standing: ${bounds.min.y}`);
      assert.ok(bounds.max.y < 2 && bounds.max.x - bounds.min.x < 1.05, `${role} has an oversized idle silhouette`);
      for (const name of joints) motion.get(name).push(actor.group.getObjectByName(name).rotation.toArray().slice(0, 3));
    }
    for (const group of [['Chest'], ['Head'], ['Left Shoulder', 'Right Shoulder'], ['Left Elbow', 'Right Elbow'], ['Weight and hips']]) {
      const changing = group.some(name => {
        const samples = motion.get(name);
        return [0, 1, 2].some(axis => Math.max(...samples.map(p => p[axis])) - Math.min(...samples.map(p => p[axis])) > .003);
      });
      assert.ok(changing, `${role}: ${group.join('/')} remained stiff through the entire idle`);
    }
    const body = actor.group.getObjectByName('Weight and hips'), head = actor.group.getObjectByName('Head');
    assert.notEqual(head.rotation.y, body.rotation.y, `${role}: head moves independently of the hips`);
    finalPoses.push(JSON.stringify(pose(actor)));
  }
  assert.equal(new Set(finalPoses).size, 3, 'each neighbor has a different resting pose and idle rhythm');
});

test('animating a local worker cannot move another character or alter shared source geometry', () => {
  const first = createCharacter({ role: 'commons-miller' }), second = createCharacter({ role: 'commons-miller' });
  first.animate(0); second.animate(0);
  const before = pose(second), geometry = [];
  first.group.traverse(object => { if (object.isMesh) geometry.push([object.geometry, object.geometry.attributes.position.array.slice()]); });
  for (let frame = 1; frame <= 90; frame++) first.animate(frame / 30, frame < 45 ? 0 : 2.5, true);
  assert.deepEqual(pose(second), before, 'joint animation leaked between NPC instances');
  for (const [source, positions] of geometry) assert.deepEqual(source.attributes.position.array, positions, 'idle animation rewrote shared vertex data');
});


test('the one-eyed seer wears his covering in front of the hood face while his other eye stays visible', () => {
  const mark = createCharacter({ role: 'doomsayer' });
  const seer = createCharacter({ role: 'doomsayer', look: { eyePatch: true } });
  const eyeSurface = (actor, x) => {
    actor.group.updateMatrixWorld(true);
    const head = actor.group.getObjectByName('Head');
    const ray = new THREE.Raycaster(head.localToWorld(new THREE.Vector3(x, .216, 1)),
      new THREE.Vector3(0, 0, -1).transformDirection(head.matrixWorld));
    const hit = ray.intersectObject(head, true)[0], colors = hit.object.geometry.attributes.color;
    return { depth: head.worldToLocal(hit.point).z,
      color: [colors.getX(hit.face.a), colors.getY(hit.face.a), colors.getZ(hit.face.a)] };
  };
  assert.equal(mark.group.getObjectByName('Eye patch'), undefined, 'Mark keeps his existing face');
  assert.ok(seer.group.getObjectByName('Eye patch'));
  const covered = eyeSurface(seer, -.063), original = eyeSurface(mark, -.063);
  assert.ok(covered.depth > original.depth + .02, 'the covering is not buried behind the hood or its replacement eye');
  assert.notDeepEqual(covered.color, original.color, 'weathered leather is visible against the hood shadow');
  assert.deepEqual(eyeSurface(seer, .063), eyeSurface(mark, .063), 'the uninjured eye stays unchanged');
});
