import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { findBird } from '../src/bird-finder.js';
const { createBirdPointer } = await sourceModule('../src/bird-pointer.js');

const bird = { id: 'wren', species: 'wren', x: 0, y: 1, z: 0, visible: true, action: 'look' };
const camera = new THREE.PerspectiveCamera(54, 16 / 9, .1, 1000);
camera.position.set(0, 3, 20); camera.lookAt(0, 1, 0);
const find = (overrides = {}) => findBird([{ ...bird, ...overrides }], { position: { x: 0, z: 15 }, range: 18 });

test('a stronger bird cue still hides absent, flying, hidden and out-of-range birds', () => {
  const marker = createBirdPointer();
  assert.equal(marker.visible, false);
  assert.equal(marker.update(find(), { camera }), true);
  for (const target of [null, find({ visible: false }), find({ action: 'flight' }), find({ z: -20 }), { ...find(), range: 1 }]) {
    assert.equal(marker.update(target, { camera }), false);
    assert.equal(marker.visible, false);
  }
  marker.dispose();
});

test('outlined silhouette stays readable at observation distance and still respects world occlusion', () => {
  const marker = createBirdPointer({ reducedMotion: true });
  for (const distance of [12, 24, 38]) {
    camera.position.set(0, 2, distance); camera.lookAt(0, 1, 0);
    marker.update(find(), { camera, viewportHeight: 1080 }); marker.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(marker), pixels = bounds.getSize(new THREE.Vector3()).y
      / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * distance) * 1080;
    assert.ok(pixels >= 20 && pixels <= 50, `A bird cue is legible without covering the scene (${pixels.toFixed(1)} px)`);
    assert.ok(marker.quaternion.angleTo(camera.quaternion) < 1e-7, 'the chevron never rotates edge-on');
  }
  assert.ok(marker.children.every(mesh => mesh.material.depthTest), 'terrain and objects can occlude the cue');
  assert.ok(marker.children.every(mesh => !mesh.material.transparent && mesh.material.opacity === 1), 'the cue never fades out');
  assert.ok(new Set(marker.children.map(mesh => mesh.material.color.getHex())).size >= 2, 'readability does not rely on a single colour');
  marker.dispose();
});

test('pulse is gentle and bounded; reduced motion produces a completely steady cue', () => {
  const marker = createBirdPointer(), quiet = createBirdPointer({ reducedMotion: true });
  const scales = [], positions = [], quietPoses = [];
  for (let time = 0; time < 6; time += .1) {
    marker.update(find(), { camera, time }); quiet.update(find(), { camera, time });
    scales.push(marker.scale.x); positions.push(marker.position.y);
    quietPoses.push([...quiet.position.toArray(), ...quiet.scale.toArray()]);
  }
  assert.ok(Math.max(...scales) > Math.min(...scales));
  assert.ok(Math.max(...scales) / Math.min(...scales) < 1.11, 'no distracting size jump');
  assert.ok(Math.max(...positions) - Math.min(...positions) < .06, 'no large vertical motion');
  for (const pose of quietPoses) assert.deepEqual(pose, quietPoses[0]);
  marker.dispose(); quiet.dispose();
});
