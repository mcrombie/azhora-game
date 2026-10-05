import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';

const { createTelemoniaTownScenery, createTelemoniaTownScenerySteps } = await sourceModule('../src/telemonia-town-scenery.js');

test('Kethorn cistern water owns its gloss without changing the cached terrain and stone material', () => {
  // Use the production material-cache contract. An uncached material stub would
  // miss the old bug, which made all terrain glossy after Telemonia was loaded.
  const cache = new Map();
  const material = (color, extra = {}) => {
    const key = `${color}:${JSON.stringify(extra)}`;
    if (!cache.has(key)) cache.set(key, new THREE.MeshStandardMaterial({ color, roughness: .93, ...extra }));
    return cache.get(key);
  };
  const terrain = material('#ffffff', { vertexColors: true, flatShading: true });
  const root = new THREE.Group();
  createTelemoniaTownScenery({ root, material, groundHeight: () => 0, colliders: [],
    dummy: new THREE.Object3D(), color: new THREE.Color(), round: new THREE.IcosahedronGeometry(1, 0) });
  let water;
  root.traverse(mesh => { if (mesh.name.startsWith('Kethorn: the cisterns') && mesh.name.endsWith('water')) water = mesh; });
  assert.ok(water?.isMesh && water.geometry.attributes.position.count > 0, 'the actual cistern water was constructed');
  assert.notEqual(water.material, terrain, 'water must not mutate a material shared with land');
  assert.equal(water.material.roughness, .2);
  assert.equal(water.castShadow, false);
  assert.equal(terrain.roughness, .93);
  assert.equal(material('#ffffff', { vertexColors: true, flatShading: true }), terrain,
    'subsequent land requests still receive the unchanged cached material');
  assert.equal(root.getObjectByName('Kethorn: the halls, the granaries and the cisterns').material, terrain);
});

test('town construction yields expensive fields and vines while retaining exact pre-streaming geometry and colliders', t => {
  const root = new THREE.Group(), colliders = [], slices = [];
  let reads = 0, maximumReads = 0, yields = 0;
  const steps = createTelemoniaTownScenerySteps({ root,
    material: (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .93, ...extra }),
    groundHeight: () => { reads++; return 0; }, colliders,
    dummy: new THREE.Object3D(), color: new THREE.Color(), round: new THREE.IcosahedronGeometry(1, 0) });
  let step;
  do {
    reads = 0; const began = performance.now(); step = steps.next();
    slices.push(performance.now() - began); maximumReads = Math.max(maximumReads, reads); yields++;
  } while (!step.done);
  const hash = createHash('sha256');
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    hash.update(mesh.name);
    for (const [name, attribute] of Object.entries(mesh.geometry.attributes)) {
      hash.update(name); hash.update(Buffer.from(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength));
    }
    if (mesh.geometry.index) hash.update(Buffer.from(mesh.geometry.index.array.buffer));
    if (mesh.isInstancedMesh) {
      hash.update(Buffer.from(mesh.instanceMatrix.array.buffer));
      if (mesh.instanceColor) hash.update(Buffer.from(mesh.instanceColor.array.buffer));
    }
  });
  hash.update(JSON.stringify(colliders)); hash.update(JSON.stringify(step.value.metrics));
  assert.equal(hash.digest('hex'), '3e78001d0117d00fcc0b8ae2b6698b7733557e5a2668333b53f1c0a79ff9caf1');
  assert.ok(yields > 100, 'field and vine searches must release the loader before completing');
  assert.ok(maximumReads <= 256, `bounded physical-ground reads between yields: ${maximumReads}`);
  t.diagnostic(JSON.stringify({ yields, maximumReads, longestSliceMs: Math.max(...slices),
    totalMs: slices.reduce((sum, value) => sum + value, 0) }));
});
