import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { deferredScenery } from '../src/world/loading/deferred-scenery.js';

const { createFerryBoat } = await sourceModule('../src/world/travel/ferry-boat.js');
const { FERRY_MOORINGS } = await sourceModule('../src/content/regions/peblos/peblos-world.js');
function toolkit() {
  const root = new THREE.Group(), movingGroups = new Set(), cube = new THREE.BoxGeometry(1, 1, 1);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 7);
  const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .93, ...extra });
  const mesh = (geometry, mat, x, y, z, sx, sy, sz, parent) => {
    const item = new THREE.Mesh(geometry, mat); item.position.set(x, y, z); item.scale.set(sx, sy, sz);
    item.castShadow = item.receiveShadow = true; parent.add(item); return item;
  };
  return { root, movingGroups, material, mesh, wood: material('#71523a'), woodLight: material('#ab7950'),
    box: (mat, x, y, z, sx, sy, sz, parent) => mesh(cube, mat, x, y, z, sx, sy, sz, parent),
    post: (mat, x, y, z, radius, height, parent) => mesh(cylinder, mat, x, y, z, radius, height, radius, parent),
    rope: (points, radius, mat, parent) => {
      const curve = new THREE.CatmullRomCurve3(points);
      return mesh(new THREE.TubeGeometry(curve, 16, radius, 4, false), mat, 0, 0, 0, 1, 1, 1, parent);
    } };
}
function shape(group) {
  const hash = createHash('sha256');
  group.traverse(object => {
    hash.update(JSON.stringify([object.type, object.position.toArray(), object.rotation.toArray(), object.scale.toArray(),
      object.castShadow, object.receiveShadow, object.material?.color.getHex(), object.material?.side]));
    if (!object.isMesh) return;
    for (const attribute of [...Object.values(object.geometry.attributes), object.geometry.index].filter(Boolean)) {
      const a = attribute.array; hash.update(Buffer.from(a.buffer, a.byteOffset, a.byteLength));
    }
  });
  return hash.digest('hex');
}

test('the shared ferry retains its original Full-mode geometry and starts at Tidehaven', () => {
  const kit = toolkit(), ferry = createFerryBoat(kit);
  assert.equal(shape(ferry.group), 'e911caacd1bc29f253d8c596c2a28f5f1d8df632f9472655a1bef7b5b6ebd17a');
  assert.equal(ferry.group.parent, kit.root);
  assert.equal(kit.movingGroups.has(ferry.group), true);
  assert.deepEqual(ferry.group.position.toArray(), [FERRY_MOORINGS.drent.x, .38, FERRY_MOORINGS.drent.z]);
  assert.equal(ferry.group.rotation.y, FERRY_MOORINGS.drent.yaw);
});

test('Fast mode can place the ferry before Peblos loads and late scenery reuses the underway boat', () => {
  const kit = toolkit(), ferry = createFerryBoat(kit), stage = new THREE.Group(); stage.visible = false; kit.root.add(stage);
  const handle = deferredScenery({ ferryBoat: ferry.group, placeFerryBoat: ferry.place });
  handle.value.placeFerryBoat(30, 34, 1.2);
  assert.deepEqual(ferry.group.position.toArray(), [30, .38, 34]);
  const resumed = createFerryBoat({ ...kit, root: stage, ferry });
  assert.equal(resumed, ferry); assert.equal(stage.children.length, 0);
  handle.install({ ferryBoat: resumed.group, placeFerryBoat: resumed.place });
  assert.equal(ferry.group.parent, kit.root);
  assert.deepEqual(ferry.group.position.toArray(), [30, .38, 34]);
  assert.equal(ferry.group.rotation.y, 1.2);
  handle.value.placeFerryBoat(41, 45, 2);
  assert.deepEqual(ferry.group.position.toArray(), [41, .38, 45]);
  assert.equal(kit.root.children.filter(child => child === ferry.group).length, 1);
});
