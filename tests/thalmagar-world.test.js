import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from '../vendor/three.module.js';

const source = (await readFile(new URL('../src/thalmagar-world.js', import.meta.url), 'utf8'))
  .replace("'three'", `'${new URL('../vendor/three.module.js', import.meta.url).href}'`);
const { createThalmagarWorld } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('Thalmagar is a separate developer scene with a high, readable fortress and finite flight area', () => {
  const scene = new THREE.Scene(), existing = new THREE.Group(); existing.name = 'Existing playable world'; scene.add(existing);
  const world = createThalmagarWorld(scene), { bounds: b, spawn } = world;
  assert.equal(scene.children.length, 2); assert.equal(existing.children.length, 0);
  assert.equal(world.metadata.developerOnly, true); assert.equal(world.metadata.playable, false);
  assert.ok(spawn.x > b.minX && spawn.x < b.maxX && spawn.z > b.minZ && spawn.z < b.maxZ);
  assert.ok(spawn.y > world.heightAt(spawn.x, spawn.z) + 20);
  assert.ok(spawn.y < b.maxY); assert.equal(world.heightAt(0, -174), 65);
  assert.ok(world.metadata.fortressHeight > 200, 'The distant citadel must communicate massive scale');
  assert.ok(world.landmarks.length >= 5);
  for (let x = b.minX; x <= b.maxX; x += 17) for (let z = b.minZ; z <= b.maxZ; z += 17)
    assert.ok(Number.isFinite(world.heightAt(x, z)), `${x},${z}`);
  for (const invalid of [NaN, Infinity, -Infinity]) assert.equal(world.heightAt(invalid, 0), 0);
  world.dispose(); assert.deepEqual(scene.children, [existing]);
});

test('The fortress geometry stays within an explicit draw and triangle budget', () => {
  const world = createThalmagarWorld(new THREE.Scene()), meshes = [], box = new THREE.Box3();
  world.root.updateMatrixWorld(true);
  world.root.traverse(object => {
    if (!object.isMesh) return; meshes.push(object);
    for (const value of object.geometry.attributes.position.array) assert.ok(Number.isFinite(value), object.name);
    assert.ok(object.scale.x > 0 && object.scale.y > 0 && object.scale.z > 0);
    if (object.name === 'The high keep and needle crown') box.setFromObject(object);
  });
  assert.ok(meshes.length <= 24, `${meshes.length} draw objects`);
  assert.ok(world.metadata.statistics.triangles < 90000, `${world.metadata.statistics.triangles} triangles`);
  assert.equal(meshes.length, world.metadata.statistics.meshes);
  assert.equal(box.max.y, world.metadata.fortressHeight);
  assert.ok(world.metadata.statistics.trees >= 60); assert.equal(world.metadata.statistics.towers, 18);
  assert.ok(world.root.getObjectByName('Ruined ceremonial causeway'));
  assert.ok(world.root.getObjectByName('The torn black headlands'));
  assert.ok(world.root.getObjectByName('Dull furnace light in fortress slits'));
  assert.ok(world.root.getObjectByName('Thalmagar rust horizon'));
  assert.ok(world.root.getObjectByName('Veiled sun beyond the headlands'));
  const sharedGround = new Map();
  for (const mesh of meshes.filter(mesh => mesh.name.startsWith('Cape terrain '))) {
    const p = mesh.geometry.attributes.position, c = mesh.geometry.attributes.color;
    for (let i = 0; i < p.count; i++) {
      const key = `${p.getX(i).toFixed(3)},${p.getZ(i).toFixed(3)}`, value = [c.getX(i), c.getY(i), c.getZ(i)], previous = sharedGround.get(key);
      if (previous) assert.ok(value.every((v, index) => Math.abs(v - previous[index]) < .00001), 'Adjacent terrain faces must not form mismatched color tiles');
      else sharedGround.set(key, value);
    }
  }
  // Flames and window slits remain small sources, not a portal-sized solid
  // emissive rectangle that overpowers the gatehouse in close views.
  const glowing = world.root.getObjectByName('Dull furnace light in fortress slits').geometry.attributes.position;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < glowing.count; i += 3) {
    a.fromBufferAttribute(glowing, i); b.fromBufferAttribute(glowing, i + 1).sub(a); c.fromBufferAttribute(glowing, i + 2).sub(a);
    assert.ok(b.cross(c).length() / 2 < 10, 'An oversized emissive panel returned');
  }
  world.dispose();
});

test('Only the cinder instances move; repeated disposal releases owned resources without touching its parent', () => {
  const scene = new THREE.Scene(), world = createThalmagarWorld(scene), embers = world.root.getObjectByName('Drifting cinders');
  const initial = [...embers.instanceMatrix.array], keep = world.root.getObjectByName('The high keep and needle crown');
  const position = keep.position.clone(), transform = keep.matrix.clone();
  world.update(18, 1 / 60); assert.notDeepEqual([...embers.instanceMatrix.array], initial);
  assert.ok(keep.position.equals(position)); assert.ok(keep.matrix.equals(transform));
  for (const value of embers.instanceMatrix.array) assert.ok(Number.isFinite(value));
  const valid = [...embers.instanceMatrix.array]; world.update(NaN, .1); assert.deepEqual([...embers.instanceMatrix.array], valid);
  const resources = new Set(), released = new Set();
  let instanceDisposals = 0; embers.addEventListener('dispose', () => instanceDisposals++);
  world.root.traverse(object => {
    if (!object.isMesh) return;
    for (const resource of [object.geometry, ...(Array.isArray(object.material) ? object.material : [object.material])]) {
      if (resources.has(resource)) continue; resources.add(resource); resource.addEventListener('dispose', () => released.add(resource));
    }
  });
  world.dispose(); world.dispose(); world.update(22, .1);
  assert.equal(scene.children.length, 0); assert.equal(released.size, resources.size);
  assert.equal(instanceDisposals, 1, 'Repeated visits release the GPU instance buffers once');
  assert.deepEqual([...embers.instanceMatrix.array], valid);
});
