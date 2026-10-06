import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { createCaves, nearestPlain } from '../src/content/regions/east-lotharn/east-lotharn-caves.js';
import { groundWithRiver } from '../src/world/terrain/world-terrain.js';
import { easternChamberTrim } from '../src/content/regions/east-lotharn/east-lotharn-cave-trim.js';

const cave = createCaves(groundWithRiver).find(c => c.id === 'eastern-chamber');
const trim = easternChamberTrim(cave, groundWithRiver), at = cave.portals[0], floor = cave.floor(at);
const shape = new THREE.BufferGeometry();
shape.setAttribute('position', new THREE.Float32BufferAttribute(trim.positions, 3)); shape.setIndex(trim.indices);
const mesh = new THREE.Mesh(shape, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })); mesh.updateMatrixWorld(true);

test('the chamber contact strip joins actual cliff ground above the walking body', () => {
  for (let i = 0; i < trim.positions.length; i += 3) {
    const [x, y, z] = trim.positions.slice(i, i + 3);
    const near = nearestPlain(cave.path, x, z);
    assert.ok(y > floor + 2);
    assert.ok(near.distance > cave.half(near.along) + .35 || y > cave.floor(near.along) + cave.height(near.along),
      'every vertex is outside the body corridor or above the passage roof');
    if ((i / 3) % 2) assert.ok(Math.abs(y - groundWithRiver(x, z)) < .026, 'the terrain edge must be embedded in the cliff');
  }
  assert.equal(easternChamberTrim({ id: 'other-cave' }, groundWithRiver), null);
});

test('native-sized approach rays remain clear while the outer jamb seam receives rock', () => {
  const p = cave.at(at - 2), q = cave.at(at + 2);
  const direction = new THREE.Vector3(q.x - p.x, 0, q.z - p.z).normalize();
  const ray = new THREE.Raycaster(new THREE.Vector3(), direction, 0, 5);
  for (const side of [-1.4, 0, 1.4]) for (const up of [.2, 1, 1.8, 2.2]) {
    ray.ray.origin.set(p.x + p.nx * side, floor + up, p.z + p.nz * side);
    assert.equal(ray.intersectObject(mesh).length, 0, 'the contact repair cannot enter the traveler or doorway');
  }
  // Probe the first side panel from outside the old collar toward its cliff contact.
  const a = new THREE.Vector3().fromArray(trim.positions, 0), b = new THREE.Vector3().fromArray(trim.positions, 3);
  const c = new THREE.Vector3().fromArray(trim.positions, 6), centre = a.clone().add(b).add(c).multiplyScalar(1 / 3);
  const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
  ray.ray.origin.copy(centre).addScaledVector(normal, .5); ray.ray.direction.copy(normal).negate();
  assert.ok(ray.intersectObject(mesh).length > 0, 'the lateral seam is covered by the sampled strip');
});

test('the native lateral approach cannot see sky through the right jamb contact', () => {
  const camera = new THREE.PerspectiveCamera(54, 1440 / 900, .1, 650);
  camera.position.set(-928.3, 171.18, -747.77); camera.lookAt(-926.5, 170.94, -748.6); camera.updateMatrixWorld();
  const ray = new THREE.Raycaster();
  // These pixels lie in the actual slit in the 1440x900 Full native review image.
  // The former rear-only skirt missed them because they graze the front plane.
  for (const [x, y] of [[646, 160], [650, 190], [642, 135], [654, 188], [657, 194], [653, 180]]) {
    ray.setFromCamera(new THREE.Vector2(x / 720 - 1, 1 - y / 450), camera);
    assert.ok(ray.intersectObject(mesh).some(hit => hit.distance < 17), `sky at captured pixel ${x},${y}`);
  }
});
