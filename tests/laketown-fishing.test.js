import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';

const THREE = await sourceModule('../vendor/three.module.js');
const {createLaketownFishing, laketownFishingPose, LAKETOWN_FISHING_PHASES, LAKETOWN_FISHING_PERIOD: PERIOD}
  = await sourceModule('../src/content/regions/minora-frontier/laketown-fishing.js');
const {LAKETOWN_FISHING: SITE} = await sourceModule('../src/content/regions/minora-frontier/laketown-waterfront-layout.js');
const {southOremindiWaterAt} = await sourceModule('../src/content/regions/south-oremindi/south-oremindi-world.js');
const {groundWithRiver} = await sourceModule('../src/world/terrain/world-terrain.js');
const near = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a - b) < tolerance, `${a} is not near ${b}`);
const resources = root => {
  const geometries = new Set(), materials = new Set(); let meshes = 0, triangles = 0;
  root.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of [].concat(object.material ?? [])) materials.add(material);
    if (object.isMesh) {meshes++; triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;}
  });
  return {geometries, materials, meshes, triangles};
};

test('the fisherman departs, works, returns and unloads in a continuous repeating loop', () => {
  assert.deepEqual(LAKETOWN_FISHING_PHASES.map(p => p.id), ['departing', 'fishing', 'returning', 'unloading']);
  let time = 0;
  for (const phase of LAKETOWN_FISHING_PHASES) {
    const middle = laketownFishingPose(time + phase.seconds / 2);
    assert.equal(middle.phase, phase.id); near(middle.progress, .5);
    const repeated = laketownFishingPose(time + phase.seconds / 2 + PERIOD * 3);
    for (const key of ['x', 'y', 'z', 'yaw', 'progress']) near(middle[key], repeated[key]);
    assert.equal(repeated.cycles, 3);
    time += phase.seconds;
    const before = laketownFishingPose(time - 1e-5), after = laketownFishingPose(time + 1e-5);
    assert.ok(Math.hypot(before.x - after.x, before.z - after.z) < .001, 'No teleport at ' + phase.id);
    assert.ok(Math.abs(Math.atan2(Math.sin(before.yaw - after.yaw), Math.cos(before.yaw - after.yaw))) < .001,
      'No sudden turn at ' + phase.id);
  }
  assert.deepEqual(laketownFishingPose(0), laketownFishingPose(-1));
  assert.deepEqual(laketownFishingPose(0), laketownFishingPose(NaN));
  assert.equal(laketownFishingPose(69).phase, 'unloading');
  assert.equal(laketownFishingPose(81).caught, false, 'The catch has been unloaded before another departure');
  near(laketownFishingPose(PERIOD).x, SITE.berth.x); near(laketownFishingPose(PERIOD).z, SITE.berth.z);
});

test('the entire hull and sweep footprint stays in the real high Forest Tarn water', () => {
  for (let seconds = 0; seconds <= PERIOD; seconds += .2) {
    const pose = laketownFishingPose(seconds);
    assert.equal(pose.y, 35, 'The boat floats on the high tarn, not the lower town or sea');
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 12) {
      const x = pose.x + Math.sin(angle) * 2.8, z = pose.z + Math.cos(angle) * 2.8;
      assert.equal(southOremindiWaterAt(x, z), SITE.surface, `Boat/oar shoreline margin at ${seconds}s`);
      assert.ok(groundWithRiver(x, z) < SITE.surface - .4, `Boat/oar has water below it at ${seconds}s`);
    }
    const next = laketownFishingPose(seconds + .02);
    assert.ok(Math.hypot(next.x - pose.x, next.z - pose.z) / .02 < 2.3, 'A small rowing boat does not sprint');
  }
});

test('clock ownership is deterministic, pauses do not animate, and distant boats skip rig work', () => {
  let ready = true;
  const world = {loading: {isReady: () => ready}}, scene = new THREE.Scene();
  const fishing = createLaketownFishing(scene, world), second = createLaketownFishing(new THREE.Scene(), world);
  try {
    fishing.update(10, 1, SITE.berth); second.update(100000, .5, SITE.berth); second.update(-10, .5, SITE.berth);
    for (const key of ['clock', 'phase', 'x', 'z', 'yaw']) assert.equal(fishing.state()[key], second.state()[key]);
    const snapshot = fishing.state();
    scene.updateMatrixWorld(true); const before = [];
    scene.traverse(object => before.push(object.matrixWorld.toArray()));
    fishing.update(999999, 0, SITE.berth); fishing.update(999999, -10, SITE.berth);
    assert.deepEqual(fishing.state(), snapshot, 'Wall-clock changes cannot animate a paused boat');
    scene.updateMatrixWorld(true); const after = [];
    scene.traverse(object => after.push(object.matrixWorld.toArray())); assert.deepEqual(after, before);
    fishing.update(1000000, 30, {x: 0, z: 0});
    assert.equal(fishing.state().visible, false); assert.equal(fishing.state().updates, snapshot.updates);
    assert.equal(fishing.state().phase, 'fishing', 'The cheap routine continues outside the detail radius');
    fishing.update(0, 0, SITE.berth);
    assert.equal(fishing.state().fishermanVisible, true); assert.equal(fishing.state().netVisible, true);
    assert.ok(fishing.state().updates > snapshot.updates, 'Returning observers see the current pose');
    ready = false; fishing.update(0, 0, SITE.berth); assert.equal(fishing.state().visible, false);
  } finally {fishing.dispose(); second.dispose();}
});

test('a working trip reuses its small geometry budget and releases only its owned resources once', () => {
  const scene = new THREE.Scene(), fishing = createLaketownFishing(scene, {loading: {isReady: () => true}});
  const initial = resources(scene), root = scene.getObjectByName('Laketown fishing / working skiff');
  assert.ok(initial.meshes <= 28, `Small boat and one fisherman: ${initial.meshes} meshes`);
  assert.ok(initial.triangles < 10000, `Local actor budget: ${initial.triangles} triangles`);
  const hull = scene.getObjectByName('Fishing skiff / clinker hull, ribs and rowing thwart');
  const wake = scene.getObjectByName('Small skiff wake');
  const disposed = new Map();
  for (const resource of [hull.geometry, hull.material, wake.geometry, wake.material]) {
    disposed.set(resource, 0); resource.addEventListener('dispose', () => disposed.set(resource, disposed.get(resource) + 1));
  }
  for (let i = 0; i < 450; i++) fishing.update(i, .2, SITE.berth);
  const final = resources(scene);
  assert.deepEqual(final.geometries, initial.geometries); assert.deepEqual(final.materials, initial.materials);
  assert.ok(fishing.state().drawCalls >= 15 && fishing.state().drawCalls <= 28, 'Reported draw count includes the fisherman');
  const human = scene.getObjectByName('Laketown / working fisherman');
  assert.ok(human && human.parent === root.getObjectByName('Forest Tarn fishing skiff'), 'The visible human rides with the hull');
  const nextLoop = Math.ceil(fishing.state().clock / PERIOD) * PERIOD;
  fishing.update(0, nextLoop - fishing.state().clock - .01, SITE.berth);
  const beforeLoop = human.position.clone(), beforeYaw = human.rotation.y;
  fishing.update(0, .02, SITE.berth);
  assert.ok(human.position.distanceTo(beforeLoop) < .001, 'The fisherman sits before departure instead of snapping onto the bench');
  assert.ok(Math.abs(human.rotation.y - beforeYaw) < .001, 'His orientation remains continuous at the repeat');
  fishing.dispose(); fishing.dispose(); fishing.update(999, 1, SITE.berth);
  assert.equal(scene.children.length, 0); assert.equal(fishing.state().disposed, true);
  for (const count of disposed.values()) assert.equal(count, 1, 'Owned GPU resources are released exactly once');
});
