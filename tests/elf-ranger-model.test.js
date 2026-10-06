import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';

const THREE = await sourceModule('../vendor/three.module.js');
const { createElvenRanger } = await sourceModule('../src/content/regions/ibenwood/ibenwood-defense-view.js');

test('elven rangers retain visible pointed ears, short hair and bare heads after geometry batching', () => {
  const ranger = createElvenRanger(), head = ranger.group.getObjectByName('Head');
  assert.equal(head.userData.elven, true);
  assert.ok(ranger.group.getObjectByName('mercenary-headgear-bare'));
  assert.ok(ranger.group.getObjectByName('mercenary-hair-short-cropped'));
  const headgear = []; ranger.group.traverse(o => { if (o.name.startsWith('mercenary-headgear-')) headgear.push(o.name); });
  assert.deepEqual(headgear, ['mercenary-headgear-bare']);
  head.updateWorldMatrix(true, true);
  const inverse = head.matrixWorld.clone().invert(), local = new THREE.Matrix4(), point = new THREE.Vector3();
  let left = Infinity, right = -Infinity;
  head.traverse(mesh => {
    if (!mesh.isMesh) return;
    local.multiplyMatrices(inverse, mesh.matrixWorld);
    const positions = mesh.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i).applyMatrix4(local);
      left = Math.min(left, point.x); right = Math.max(right, point.x);
    }
  });
  assert.ok(left < -.37 && right > .37, `pointed ear tips survive the merged head geometry: ${left},${right}`);
});

test('rangers hold real bows with valid animated geometry and no sword showing', () => {
  const ranger = createElvenRanger(1), bow = ranger.group.getObjectByName('Hunting bow (held)');
  assert.ok(bow?.visible); assert.ok(ranger.group.getObjectByName('Bow grip'));
  assert.notEqual(ranger.group.getObjectByName('Plain iron mercenary sword')?.visible, true);
  let draws = 0, triangles = 0;
  ranger.group.traverse(mesh => {
    if (!mesh.isMesh) return;
    draws++; triangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3;
    for (const attribute of ['position', 'normal']) assert.ok(mesh.geometry.attributes[attribute].array.every(Number.isFinite));
  });
  assert.ok(draws < 45 && triangles < 12000, `ranger geometry stays bounded: ${draws} draws, ${triangles} triangles`);
  for (let i = 0; i < 15; i++) ranger.animate(i / 30, 0, true, { armed: true, draw: i / 14, action: 'idle' });
  ranger.group.updateWorldMatrix(true, true);
  const origin = ranger.group.getObjectByName('Bow grip').getWorldPosition(new THREE.Vector3());
  assert.ok(origin.toArray().every(Number.isFinite)); assert.ok(origin.y > .5 && origin.y < 2.5);
});
