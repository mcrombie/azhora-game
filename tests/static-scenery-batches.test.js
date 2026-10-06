import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { batchStaticScenery } from '../src/world/scenery/static-scenery-batches.js';
import { finishBuild, stageBuildSteps } from '../src/world/loading/build-steps.js';

const regionAt = x => ({ id: x < 0 ? 1 : 2 });
const cube = new THREE.BoxGeometry(1, 1, 1);
function add(parent, material, x = 0, geometry = cube) {
  const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, 2, 0);
  mesh.rotation.set(.2, .3, .4); mesh.scale.set(1.1, 1.5, .8); parent.add(mesh); return mesh;
}

test('resumable static batching preserves transformed vertices, UVs, normals and the original bounding sphere', async () => {
  const world = new THREE.Group(), parent = new THREE.Group(), material = new THREE.MeshStandardMaterial({ map: new THREE.Texture() });
  parent.position.set(-5, 0, 8); parent.rotation.y = .4; world.add(parent);
  const originals = Array.from({ length: 80 }, (_, i) => add(parent, material, i));
  originals[0].castShadow = true; world.updateMatrixWorld(true);
  // Small groups across regions merge in the order of their first district.
  const groups = new Map(), centre = new THREE.Vector3();
  for (const mesh of originals) {
    mesh.geometry.computeBoundingSphere();
    centre.copy(mesh.geometry.boundingSphere.center).applyMatrix4(mesh.matrixWorld);
    const id = regionAt(centre.x).id; if (!groups.has(id)) groups.set(id, []); groups.get(id).push(mesh);
  }
  const positions = [], normals = [], uvs = [], p = new THREE.Vector3(), n = new THREE.Vector3(), matrix = new THREE.Matrix3();
  for (const mesh of [...groups.values()].flat()) {
    matrix.getNormalMatrix(mesh.matrixWorld);
    for (let i = 0; i < cube.attributes.position.count; i++) {
      positions.push(...p.fromBufferAttribute(cube.attributes.position, i).applyMatrix4(mesh.matrixWorld));
      normals.push(...n.fromBufferAttribute(cube.attributes.normal, i).applyMatrix3(matrix).normalize());
      uvs.push(cube.attributes.uv.getX(i), cube.attributes.uv.getY(i));
    }
  }
  const props = [], iterator = batchStaticScenery({ THREE, world, movingGroups: new Set(), regionAt, solidProp: mesh => props.push(mesh) });
  let next, pauses = 0;
  do {
    next = iterator.next();
    if (!next.done) { pauses++; await new Promise(resolve => setImmediate(resolve)); }
    if (!world.children.some(mesh => mesh.name === 'Static scenery batch'))
      assert.ok(originals.every(mesh => mesh.parent === parent), 'pending transforms leave their source props visible');
  } while (!next.done);
  assert.ok(pauses > 2);
  assert.equal(props.length, originals.length);
  const batch = world.getObjectByName('Static scenery batch');
  assert.deepEqual(batch.geometry.attributes.position.array, new Float32Array(positions));
  assert.deepEqual(batch.geometry.attributes.normal.array, new Float32Array(normals));
  assert.deepEqual(batch.geometry.attributes.uv.array, new Float32Array(uvs));
  const sphere = batch.geometry.boundingSphere.clone(); batch.geometry.computeBoundingSphere();
  assert.deepEqual(batch.geometry.boundingSphere, sphere);
  assert.equal(batch.castShadow, true); assert.equal(batch.receiveShadow, true);
  assert.equal(batch.userData.district, 1); assert.ok(originals.every(mesh => mesh.parent === null));
});

test('late scenery batches only new static props and never doubles their colliders', () => {
  const world = new THREE.Group(), movingGroups = new Set(), processed = new WeakSet(), props = [];
  const material = new THREE.MeshStandardMaterial(), options = { THREE, world, movingGroups, processed, regionAt, solidProp: mesh => props.push(mesh) };
  const first = new THREE.Group(); world.add(first); add(first, material, -5); add(first, material, 5);
  finishBuild(batchStaticScenery({ ...options, roots: [first] }));
  const oldBatch = world.getObjectByName('Static scenery batch');
  const late = new THREE.Group(); late.position.set(10, 0, 0); world.add(late);
  add(late, material, -2); add(late, material, 2);
  const moving = new THREE.Group(); late.add(moving); movingGroups.add(moving); const animated = add(moving, material);
  const liveTree = add(late, material); liveTree.userData.liveTree = true;
  const transparent = add(late, new THREE.MeshStandardMaterial({ transparent: true }));
  const colouredGeometry = cube.clone(); colouredGeometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(cube.attributes.position.count * 3), 3));
  const coloured = add(late, material, 0, colouredGeometry);
  const shader = add(late, new THREE.ShaderMaterial());
  const instanced = new THREE.InstancedMesh(cube, material, 2); late.add(instanced);
  finishBuild(batchStaticScenery({ ...options, roots: [late] }));
  assert.equal(props.length, 4); assert.equal(oldBatch.parent, world);
  for (const mesh of [animated, liveTree, transparent, coloured, shader, instanced]) assert.ok(mesh.parent);
  const before = world.children.length;
  assert.deepEqual(finishBuild(batchStaticScenery(options)), { batches: 0, sourceMeshes: 0 });
  assert.equal(props.length, 4); assert.equal(world.children.length, before);
});

test('substantial static scenery stays split by district', () => {
  const world = new THREE.Group(), material = new THREE.MeshStandardMaterial(), geometry = new THREE.SphereGeometry(1, 32, 32);
  for (const x of [-10, -8, 8, 10]) add(world, material, x, geometry);
  const result = finishBuild(batchStaticScenery({ THREE, world, movingGroups: new Set(), regionAt, solidProp: () => {} }));
  assert.equal(result.batches, 2);
  assert.deepEqual(world.children.map(mesh => mesh.userData.district), [1, 2]);
});

test('regional visibility can preserve districts for small static batches', () => {
  const world = new THREE.Group(), material = new THREE.MeshStandardMaterial();
  for (const x of [-10, -8, 8, 10]) add(world, material, x);
  const result = finishBuild(batchStaticScenery({ THREE, world, movingGroups: new Set(),
    preserveDistricts: true, regionAt, solidProp: () => {} }));
  assert.equal(result.batches, 2);
  assert.deepEqual(world.children.map(mesh => mesh.userData.district), [1, 2]);
  for (const mesh of world.children) {
    const p = mesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) assert.equal(regionAt(p.getX(i)).id, mesh.userData.district);
  }
});

test('hidden regional batches never escape their stage between construction steps', () => {
  const world = new THREE.Group(), stage = new THREE.Group(), material = new THREE.MeshStandardMaterial();
  stage.visible = false; world.add(stage);
  for (const x of [-10, -8, 8, 10]) add(stage, material, x);
  const iterator = stageBuildSteps(batchStaticScenery({ THREE, world, roots: [stage],
    movingGroups: new Set(), preserveDistricts: true, regionAt, solidProp: () => {} }), world, stage);
  let next;
  do { next = iterator.next(); assert.deepEqual(world.children, [stage]); } while (!next.done);
  assert.equal(stage.children.length, 2);
  assert.ok(stage.children.every(mesh => mesh.name === 'Static scenery batch'));
});

test('staging captures legacy helper props but leaves gameplay additions alone', () => {
  const world = new THREE.Group(), stage = new THREE.Group(), prop = new THREE.Group(), gameplay = new THREE.Group();
  world.add(stage); stage.visible = false;
  const iterator = stageBuildSteps((function* () { world.add(prop); yield 'pause'; return 'done'; })(), world, stage);
  assert.deepEqual(iterator.next(), { done: false, value: 'pause' });
  assert.equal(prop.parent, stage);
  assert.equal(Object.hasOwn(world, 'add'), false);
  assert.equal(world.add, THREE.Object3D.prototype.add);
  world.add(gameplay);
  assert.deepEqual(iterator.next(), { done: true, value: 'done' });
  assert.equal(gameplay.parent, world);
});

test('staging restores the scene API and captures pending props when a builder throws', () => {
  const world = new THREE.Group(), stage = new THREE.Group(), prop = new THREE.Group();
  world.add(stage);
  const steps = stageBuildSteps((function* () { world.add(prop); throw new Error('bad prop'); })(), world, stage);
  assert.throws(() => steps.next(), /bad prop/);
  assert.equal(Object.hasOwn(world, 'add'), false);
  assert.equal(prop.parent, stage);
});
