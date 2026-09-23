import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { hexOwnerAt } from '../src/region-world.js';
import { westWaterSurface } from '../src/west-ground.js';

const { createWorld } = await sourceModule('../src/world.js');
const { VASTOS_CAMP, VASTOS_POSITIONS, createVastosCamp } = await sourceModule('../src/vastos-camp.js');
const scene = new THREE.Scene(), world = createWorld(scene);
const originalColliders = world.colliders.slice();
const originalGround = Object.entries(VASTOS_POSITIONS).map(([id, p]) => [id, world.heightAt(p.x, p.z)]);
const camp = createVastosCamp(scene, world);

test('The Common Water stands on dry atlas Vastos without removing its terrain or scenery', () => {
  assert.equal(VASTOS_CAMP.id, 'vastos-herders-camp');
  assert.equal(hexOwnerAt(VASTOS_CAMP.x, VASTOS_CAMP.z), 'Vastos');
  assert.ok(canStand(VASTOS_CAMP.x, VASTOS_CAMP.z, world, .5));
  const retained = new Set(world.colliders);
  for (const collider of originalColliders) assert.ok(retained.has(collider), 'an existing collider was removed');
  for (const [id, y] of originalGround) {
    const p = VASTOS_POSITIONS[id];
    assert.equal(world.heightAt(p.x, p.z), y, `${id}: original terrain survives`);
    assert.equal(hexOwnerAt(p.x, p.z), 'Vastos', `${id}: exact atlas owner`);
    assert.equal(westWaterSurface(p.x, p.z), null, `${id}: dry ground, not a wadeable pan`);
    assert.ok(canStand(p.x, p.z, world, .65), `${id}: clear standing room`);
  }
});

test('Every visitor and investigation site can be walked to from the eastern approach', () => {
  // Flood actual collision ground, checking the whole metre between grid cells.
  // This catches a clear prompt trapped behind a shelter, rail or water collider.
  const origin = { x: -1345, z: -268 }, queue = [origin], seen = new Set([`${origin.x},${origin.z}`]);
  assert.ok(canStand(origin.x, origin.z, world, .5));
  assert.equal(hexOwnerAt(origin.x, origin.z), 'Vastos');
  const minimum = { x: -1460, z: -333 }, maximum = { x: -1332, z: -242 };
  for (let next = 0; next < queue.length; next++) {
    const p = queue[next];
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = p.x + dx, z = p.z + dz, key = `${x},${z}`;
      if (seen.has(key) || x < minimum.x || x > maximum.x || z < minimum.z || z > maximum.z) continue;
      if (![.25, .5, .75, 1].every(t => canStand(p.x + dx * t, p.z + dz * t, world, .5))) continue;
      seen.add(key); queue.push({ x, z });
    }
  }
  for (const [id, p] of Object.entries(VASTOS_POSITIONS)) assert.ok(seen.has(`${p.x},${p.z}`), `${id} is reachable on foot`);
});

test('The procedural camp has two shelters and three distinct longhorns with a small draw budget', () => {
  const metrics = camp.metrics();
  assert.equal(metrics.shelters, 2); assert.equal(metrics.cattle, 3);
  assert.ok(metrics.drawCalls < 35, `${metrics.drawCalls} draw calls`);
  assert.ok(metrics.vertices > 500 && metrics.vertices < 20000, `${metrics.vertices} vertices`);
  assert.equal(metrics.recovered, 0); assert.equal(metrics.wateringOpened, false);
  for (const animal of metrics.animals) {
    const site = VASTOS_POSITIONS[`vastos-stray-${animal.id}`];
    assert.ok(Math.hypot(animal.x - site.x, animal.z - site.z) < 2.1, `${animal.id} starts beside its own site`);
    assert.ok(canStand(animal.x, animal.z, world, .85), `${animal.id} has clear dry footing`);
  }
  camp.group.traverse(object => {
    if (!object.isMesh) return;
    assert.ok(object.geometry.boundingSphere || object.geometry.attributes.position, object.name);
    assert.ok([...object.geometry.attributes.position.array].every(Number.isFinite), `${object.name}: finite geometry`);
  });
});

test('Recovered strays appear in the corral and restoration deterministically resets the herd', () => {
  camp.setState({ strays: ['west', 'ridge'], wateringOpened: true, outcome: null });
  let metrics = camp.metrics();
  assert.equal(metrics.recovered, 2); assert.equal(metrics.wateringOpened, true);
  for (const cow of metrics.animals.filter(animal => animal.recovered)) {
    assert.ok(cow.x > -1405 && cow.x < -1397 && cow.z > -259 && cow.z < -250);
    assert.ok(canStand(cow.x, cow.z, world, .7), `${cow.id} does not overlap a rail`);
  }
  assert.ok(metrics.animals.find(cow => cow.id === 'east').x > -1350, 'the unclaimed eastern stray stays out');
  camp.setState({ strays: ['west', 'east', 'ridge'], wateringOpened: true, outcome: 'mediation' });
  assert.equal(camp.metrics().recovered, 3);
  camp.setState({ strays: [], wateringOpened: false, outcome: null });
  metrics = camp.metrics(); assert.equal(metrics.recovered, 0); assert.equal(metrics.wateringOpened, false);
  assert.deepEqual(metrics.flags, []);
});

test('Each settlement has exactly one differently coloured banner and switches without stale flags', () => {
  const colours = new Set();
  for (const outcome of ['republican', 'monarchist', 'mediation']) {
    camp.setState({ strays: ['west', 'east', 'ridge'], wateringOpened: true, outcome });
    assert.deepEqual(camp.metrics().flags, [outcome]);
    const banner = camp.group.children.find(object => object.userData.outcome === outcome);
    assert.ok(banner.visible); colours.add([...banner.geometry.attributes.color.array.slice(0, 3)].join(','));
  }
  assert.equal(colours.size, 3);
  camp.setState({ outcome: 'unknown' }); assert.deepEqual(camp.metrics().flags, []);
  camp.update(1 / 60, { x: 0, z: 0 }, true); assert.equal(camp.metrics().visible, false);
  camp.update(1 / 60, VASTOS_CAMP, false); assert.equal(camp.metrics().visible, true);
  camp.update(1 / 60, VASTOS_CAMP, true);
});

test('Disposal releases the camp and its colliders while leaving the world untouched', () => {
  const added = camp.metrics().colliders;
  assert.equal(world.colliders.length, originalColliders.length + added);
  camp.dispose(); camp.dispose();
  assert.equal(camp.group.parent, null); assert.equal(camp.metrics().disposed, true);
  assert.deepEqual(world.colliders, originalColliders);
});
