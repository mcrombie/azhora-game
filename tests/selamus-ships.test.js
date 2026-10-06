import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';

const THREE = await sourceModule('../vendor/three.module.js');
const { createSelamusShip } = await sourceModule('../src/content/regions/selamus/selamus-ships.js');
const feature = (ship, name) => ship.children.filter(m => m.userData.feature === name);

test('Selemis hulls straddle their waterline and have closed outward-facing pointed volumes', () => {
  for (const kind of ['merchant', 'galley', 'gondola']) {
    const ship = createSelamusShip({ kind, length: 24 });
    assert.deepEqual(ship.position.toArray(), [0, 0, 0]);
    assert.equal(ship.userData.waterline, 0);
    assert.deepEqual(ship.userData.bow, [0, 0, -1]);
    const hull = feature(ship, 'hull')[0], pos = hull.geometry.attributes.position, normal = hull.geometry.attributes.normal;
    const box = hull.geometry.boundingBox;
    assert.ok(box.min.y < -.2 && box.max.y > .4, `${kind} has draft and freeboard`);
    assert.ok(box.max.x - box.min.x > (box.max.z - box.min.z) * .15, `${kind} hull has volume`);
    const bowX = [], waistX = [];
    let volume = 0, upwardDeck = 0;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      if (Math.abs(pos.getZ(i) - box.min.z) < .001) bowX.push(Math.abs(pos.getX(i)));
      if (Math.abs(pos.getZ(i)) < .001) waistX.push(Math.abs(pos.getX(i)));
      assert.ok(Number.isFinite(normal.getX(i)) && Number.isFinite(normal.getY(i)) && Number.isFinite(normal.getZ(i)));
      if (Math.abs(pos.getZ(i)) < .001 && Math.abs(pos.getX(i)) > box.max.x * .9 && pos.getY(i) > .3 && normal.getY(i) > .7) upwardDeck++;
    }
    for (let i = 0; i < pos.count; i += 3) {
      a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
      volume += a.dot(b.cross(c)) / 6;
    }
    assert.ok(Math.max(...bowX) < Math.max(...waistX) * .03, `${kind} bow comes to a point`);
    assert.ok(volume > 1, `${kind} uses outward hull winding: ${volume}`);
    assert.ok(upwardDeck > 0, `${kind} deck faces upward with front-face culling`);
    assert.ok(Math.abs((box.max.z - box.min.z) * ship.scale.z - 24) < .001);
  }
});

test('The trading carrack, ceremonial galley and canal gondola have different usable silhouettes', () => {
  const merchant = createSelamusShip({ kind: 'merchant', length: 30 });
  const galley = createSelamusShip({ kind: 'galley', length: 32 });
  const gondola = createSelamusShip({ kind: 'gondola', length: 10 });
  const bounds = ship => new THREE.Box3().setFromObject(ship).getSize(new THREE.Vector3());
  assert.ok(bounds(merchant).y > 20, 'Carrack has a tall ocean-going rig');
  assert.ok(bounds(galley).x > bounds(merchant).x, 'Sweeps give the galley a wide working footprint');
  assert.ok(bounds(gondola).y < 3, 'Canal gondola stays low enough for the city canals');
  assert.equal(feature(merchant, 'sail').length, 4);
  assert.equal(feature(galley, 'sail').length, 2);
  assert.equal(feature(gondola, 'sail').length, 0);
  assert.equal(galley.userData.metrics.oars, 30);
  assert.equal(gondola.userData.metrics.oars, 1);
  assert.ok(merchant.children.some(m => m.userData.features?.includes('cargo')));
  assert.ok(galley.children.some(m => m.userData.features?.includes('sea god figurehead')));
  assert.ok(gondola.children.some(m => m.userData.features?.includes('ferro teeth')));
  for (const ship of [merchant, galley]) assert.ok(ship.children.some(m => m.userData.features?.includes('stern gallery')));
});

test('Fleet copies share geometry and materials and remain within a bounded static scenery budget', () => {
  for (const kind of ['merchant', 'galley', 'gondola']) {
    const ship = createSelamusShip({ kind, length: 24 }), larger = createSelamusShip({ kind, length: 36 });
    assert.equal(feature(ship, 'hull')[0].geometry, feature(larger, 'hull')[0].geometry);
    assert.equal(feature(ship, 'hull')[0].material, feature(larger, 'hull')[0].material);
    const a = new THREE.Box3().setFromObject(ship), b = new THREE.Box3().setFromObject(larger);
    for (const axis of ['x', 'y', 'z']) {
      assert.ok(Math.abs(a.min[axis] * 1.5 - b.min[axis]) < .001);
      assert.ok(Math.abs(a.max[axis] * 1.5 - b.max[axis]) < .001);
    }
    assert.ok(ship.userData.metrics.meshes <= 24);
    assert.ok(ship.userData.metrics.triangles < 16000);
    assert.ok(ship.userData.metrics.instances < 550);
    for (const mesh of ship.children) {
      assert.ok(mesh.isMesh);
      assert.ok(mesh.geometry.attributes.position.count > 0);
      if (mesh.isInstancedMesh) assert.ok(mesh.boundingSphere.radius > 0 && Number.isFinite(mesh.boundingSphere.radius));
      for (const value of mesh.geometry.attributes.position.array) assert.ok(Number.isFinite(value));
    }
  }
});

test('Ship creation validates dimensions and accepts independent names and livery', () => {
  for (const length of [0, -1, NaN, Infinity]) assert.throws(() => createSelamusShip({ length }), RangeError);
  assert.throws(() => createSelamusShip({ kind: 'unknown' }), RangeError);
  const red = createSelamusShip({ accent: '#aa4433', name: 'Selemis eastern trader' });
  assert.equal(red.name, 'Selemis eastern trader');
  assert.equal(red.userData.length, 24);
  assert.notEqual(feature(red, 'hull')[0].geometry, feature(createSelamusShip(), 'hull')[0].geometry);
});
