import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
const { regionalWildlifeSight } = await sourceModule('../src/world/life/regional-wildlife-sight.js');
const { createGaneshShadeScrub } = await sourceModule('../src/world/terrain/ganesh-shade-scrub.js');

test('wildlife photography detects an actual transformed trunk even when the animal is in frame', () => {
  const group = new THREE.Group(), mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(.3, .4, 4, 7), new THREE.MeshBasicMaterial(), 2);
  mesh.name = 'retained trunks';
  mesh.setMatrixAt(0, new THREE.Matrix4().makeTranslation(3, 2, 1));
  mesh.setMatrixAt(1, new THREE.Matrix4().makeTranslation(100, 2, 1));
  group.add(mesh); group.position.x = 2; group.updateMatrixWorld(true);
  const eye = { x: 0, y: 1.6, z: 1 }, body = { x: 10, y: 1.4, z: 1 };
  const blocked = regionalWildlifeSight(group, eye, body, () => 0);
  assert.equal(blocked.clear, false); assert.equal(blocked.obstacle, 'retained trunks'); assert.equal(blocked.index, 0);
  assert.equal(regionalWildlifeSight(group, { ...eye, z: 3 }, body, () => 0).clear, true);
  group.visible = false; assert.equal(regionalWildlifeSight(group, eye, body, () => 0).clear, true);
  assert.equal(regionalWildlifeSight(group, eye, body, x => x > 4 && x < 6 ? 2 : 0).obstacle, 'rendered ground');
});

test('the isolated mature scrub stream stays deterministic and supplies body-sized shade under high sun', () => {
  const geometry = new THREE.IcosahedronGeometry(1, 0), material = new THREE.MeshBasicMaterial();
  const ground = (x, z) => .2 * x - .1 * z;
  const a = createGaneshShadeScrub(geometry, material, ground), b = createGaneshShadeScrub(geometry, material, ground);
  assert.equal(a.count, 18); assert.deepEqual(a.instanceMatrix.array, b.instanceMatrix.array); assert.deepEqual(a.instanceColor.array, b.instanceColor.array);
  a.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(), directions = [[-45, 90, 38], [-1, 1, .4], [0, 1, .25], [1, 1, -.4]].map(v => new THREE.Vector3(...v).normalize());
  for (const [x, z] of [[-3507, 1338], [-3468, 1389], [-3549, 1278]]) for (const direction of directions) {
    let usable = false;
    for (let dx = -4.5; dx <= 4.5 && !usable; dx += .15) for (let dz = -4.5; dz <= 4.5 && !usable; dz += .15) {
      if (Math.hypot(dx, dz) > 4.8) continue;
      usable = [[0, 0], [-.12, 0], [.12, 0], [0, -.12], [0, .12]].every(([ox, oz]) => {
        const px = x + dx + ox, pz = z + dz + oz;
        ray.set(new THREE.Vector3(px, ground(px, pz) + .436, pz), direction); ray.far = 4;
        return ray.intersectObject(a, false).length > 0;
      });
    }
    assert.ok(usable, `${x},${z} actual canopy shadow toward ${direction.toArray()}`);
  }
});
