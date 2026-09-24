import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';

const { createMagicView } = await sourceModule('../src/magic-view.js');
const swarm = (id, x = 0) => ({ id, x, y: 2, z: 0, profile: { swarm: true } });
const fixture = () => {
  const state = { projectiles: [], swarms: [swarm('bees')] }, scene = new THREE.Scene();
  const view = createMagicView({ scene, magic: { view: () => state } });
  return { state, scene, view };
};
const instance = (mesh, index = 0) => { const matrix = new THREE.Matrix4(); mesh.getMatrixAt(index, matrix); return matrix; };

test('a summoned swarm has striped oval bodies, dark heads and paired wings within a three-draw-call budget', () => {
  const { scene, state, view } = fixture(), before = JSON.stringify(state);
  try {
    view.update(.1);
    const flock = scene.getObjectByName('summoned-bees'), bodies = flock.getObjectByName('Striped bee bodies');
    const heads = flock.getObjectByName('Dark bee heads'), wings = flock.getObjectByName('Fluttering bee wings');
    assert.deepEqual(flock.position.toArray(), [0, 2, 0]);
    assert.equal(flock.children.length, 3, 'many bees are batched instead of separate meshes per body part');
    for (const mesh of [bodies, heads, wings]) assert.equal(mesh.isInstancedMesh, true);
    assert.equal(bodies.count, 12); assert.equal(heads.count, bodies.count); assert.equal(wings.count, bodies.count * 2);
    assert.ok(wings.material.transparent && wings.material.opacity > .5 && wings.material.opacity < 1);
    const colors = bodies.geometry.getAttribute('color'), shades = new Set();
    for (let i = 0; i < colors.count; i++) shades.add(`${colors.getX(i).toFixed(3)}:${colors.getY(i).toFixed(3)}:${colors.getZ(i).toFixed(3)}`);
    assert.equal(shades.size, 2, 'the dark and amber stripes are in the body geometry');
    bodies.geometry.computeBoundingBox(); const size = bodies.geometry.boundingBox.getSize(new THREE.Vector3());
    assert.ok(size.z > size.x * 1.5 && size.z < .3, 'small lengthwise oval, not a cube');
    for (const mesh of [bodies, heads, wings]) for (const number of mesh.instanceMatrix.array) assert.ok(Number.isFinite(number));
    assert.equal(JSON.stringify(state), before, 'rendering never changes gameplay swarm data');
  } finally { view.dispose(); }
});

test('wings flutter independently, bees face their flight, and zero-time updates preserve the pose', () => {
  const { scene, state, view } = fixture();
  try {
    view.update(.1);
    const bodies = scene.getObjectByName('Striped bee bodies'), wings = scene.getObjectByName('Fluttering bee wings');
    const before = [...wings.instanceMatrix.array];
    state.swarms[0].x += 2; view.update(.1);
    assert.notDeepEqual([...wings.instanceMatrix.array], before, 'wings and orbit animate');
    const forward = new THREE.Vector3(0, 0, 1).transformDirection(instance(bodies));
    assert.ok(forward.x > .9, 'a fast swarm heading east faces its direction of travel');
    const posed = [...wings.instanceMatrix.array]; view.update(0);
    assert.deepEqual([...wings.instanceMatrix.array], posed, 'pause keeps the same wing and body pose');
  } finally { view.dispose(); }
});

test('concurrent swarms reuse geometry and materials, and expiry releases per-swarm instance buffers', () => {
  const { scene, state, view } = fixture(); state.swarms.push(swarm('more-bees', 4)); view.update(.1);
  const flocks = scene.getObjectByName('learned-spells').children;
  assert.equal(flocks.length, 2);
  let released = 0, disposedGeometry = 0;
  for (let part = 0; part < 3; part++) {
    assert.equal(flocks[0].children[part].geometry, flocks[1].children[part].geometry);
    assert.equal(flocks[0].children[part].material, flocks[1].children[part].material);
    flocks[0].children[part].addEventListener('dispose', () => released++);
    flocks[0].children[part].geometry.addEventListener('dispose', () => disposedGeometry++);
  }
  const expired = flocks[0]; state.swarms.shift(); view.update(.1);
  assert.equal(expired.parent, null); assert.equal(released, 3); assert.equal(disposedGeometry, 0);
  assert.equal(flocks.length, 1, 'other living swarms remain drawn');
  view.dispose(); assert.equal(disposedGeometry, 3); assert.equal(scene.children.length, 0);
});
