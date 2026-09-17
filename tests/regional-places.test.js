import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { canStand, moveCharacter } from '../src/game-state.js';
import { sourceModule } from './module-loader.js';
import { toWorld, WORLD_SCALE } from '../src/world-scale.js';

/** Authored metres, converted the way the content itself is. */
const at = (x, z) => toWorld(x, z);

const { REGIONAL_PLACES, REGIONAL_NPC_POSITIONS, REGIONAL_ACTIVITY_SITES, REGIONAL_PATHS,
  regionalFeatureClear, createRegionalPlaces, YARD_FRAMES, place } = await sourceModule('../src/regional-places.js');
/** Standing beside the boatyard, where the float lines stir in the air. */
const WORKSHOP = YARD_FRAMES.workshop.world;
const targets = [...REGIONAL_PLACES, ...Object.values(REGIONAL_NPC_POSITIONS), ...Object.values(REGIONAL_ACTIVITY_SITES),
  { id: 'mill-tally-inspect', ...at(-238, 63) }, { id: 'workshop-inspect', ...at(-385, 124) }];
function fixture() {
  const scene = new THREE.Scene(), world = { bounds: { minX: -844, maxX: 144, minZ: -209, maxZ: 655 }, colliders: [],
    heightAt: (x, z) => 5 + Math.sin(x * .04) * .3 + Math.sin(z * .02) * .6 };
  return { scene, world, art: createRegionalPlaces(scene, world) };
}
function assertRoutes(world) {
  for (const target of targets) assert.ok(canStand(target.x, target.z, world, .8), `Blocked destination ${target.id || ''} at ${target.x},${target.z}`);
  for (const [i, path] of REGIONAL_PATHS.entries()) {
    const curve = new THREE.CatmullRomCurve3(path.map(p => new THREE.Vector3(p.x, 0, p.z)));
    for (const p of curve.getPoints(250)) assert.ok(canStand(p.x, p.z, world, .6), `Path ${i} blocked at ${p.x},${p.z}`);
    const position = { ...path[0] };
    for (const target of [...path.slice(1), ...path.slice().reverse()]) {
      moveCharacter(position, target.x - position.x, target.z - position.z, world);
      assert.ok(Math.hypot(position.x - target.x, position.z - target.z) < .04, `Cannot walk regional path ${i} to ${target.x},${target.z}`);
    }
  }
}

test('Working places preserve NPC, activity, and curved approach clearances', () => {
  const { world, art } = fixture(); assertRoutes(world);
  assert.ok(world.colliders.every(c => c.kind.startsWith('regional-')));
  for (const state of [{ millLowered: true }, { netWestFreed: true, netEastFreed: true }, { testimonyRecorded: true }]) {
    art.setState(state); assertRoutes(world);
  }
  art.dispose();
});

test('Regional clearance protects only the three new workyards and approaches', () => {
  for (const p of targets) assert.ok(regionalFeatureClear(p.x, p.z));
  for (const path of REGIONAL_PATHS) for (const p of path) assert.ok(regionalFeatureClear(p.x, p.z));
  for (const p of [at(-15, 29), at(-80, 34), at(-306, 104), at(-345, 93), at(-549, 348), at(-91, 411)])
    assert.equal(regionalFeatureClear(p.x, p.z), false);
  assert.equal(regionalFeatureClear(Number.NaN, 62), false);
  assert.equal(regionalFeatureClear(-236, Number.POSITIVE_INFINITY), false);
  const beyond = at(-248, 71);
  assert.ok(regionalFeatureClear(beyond.x, beyond.z, 5 * WORLD_SCALE), 'large scatter margins should not be cut off by broad-phase bounds');
  assert.equal(regionalFeatureClear(beyond.x, beyond.z), false);
});

test('Actual regional roads connect every new activity without removing existing journey resources', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const { journeySites, regionNpcPositions, regionFirePits, regionRepairBenches, northernRoad } = await sourceModule('../src/regions.js');
  const scene = new THREE.Scene(), world = createWorld(scene);
  assert.equal(world.regionalPlaces.length, 3); assertRoutes(world);
  assert.deepEqual(Object.keys(world.journeySites).sort(), Object.keys(journeySites).sort());
  for (const target of [...Object.values(journeySites), ...Object.values(regionNpcPositions), ...regionFirePits, ...regionRepairBenches])
    assert.ok(canStand(target.x, target.z, world, .48), `Old regional destination obstructed: ${target.id || ''}`);
  // Connect each new spur to the old road, using the old mill/ruin approach
  // where appropriate. The bridge's deliberately broken strip is elsewhere.
  const connectors = [[at(-230, 38), at(-230, 50)], [at(-374, 124)], [at(-176, 308), at(-150, 318)]];
  for (const [i, connector] of connectors.entries()) {
    const curve = new THREE.CatmullRomCurve3([...connector, ...REGIONAL_PATHS[i].slice(1)].map(p => new THREE.Vector3(p.x, 0, p.z)));
    for (const p of curve.getPoints(300)) assert.ok(canStand(p.x, p.z, world, .48), `Disconnected regional spur ${i}`);
  }
  assert.ok(northernRoad.every(p => !world.colliders.some(c => c.kind?.startsWith('regional-') && Math.hypot(c.x - p.x, c.z - p.z) < (c.r || 0) + 1.5)), 'New workyard blocks the northern road');
});

test('Activity state swaps immediately restore all four visibly different results', () => {
  const { art, world } = fixture(), initialColliders = world.colliders.slice();
  const original = Object.fromEntries(Object.entries(art.visuals).map(([id, mesh]) => [id, mesh.geometry]));
  const initialMinY = original.cradle.boundingBox.min.y;
  art.setState({ millLowered: true, netWestFreed: true, netEastFreed: true, testimonyRecorded: true });
  assert.ok(Math.abs(art.visuals.cradle.geometry.boundingBox.min.y - initialMinY + 1.75) < .001, 'Grain cradle must lower to reachable height');
  for (const [id, mesh] of Object.entries(art.visuals)) assert.notEqual(mesh.geometry, original[id], `${id} lacks a completed state`);
  assert.deepEqual(world.colliders, initialColliders, 'Visual restoration must not add or remove collision obstacles');
  const snapshot = art.state(); snapshot.millLowered = false; assert.equal(art.state().millLowered, true);
  art.setState({ millLowered: false, netWestFreed: false, netEastFreed: false, testimonyRecorded: false });
  for (const [id, mesh] of Object.entries(art.visuals)) assert.equal(mesh.geometry, original[id]);
  art.setState({ millLowered: 'yes', invented: true }); assert.equal(art.state().millLowered, false); art.dispose();
});

test('Seven finite batches stay under the triangle budget; idle animation pauses and disposal releases both states', () => {
  const { scene, world, art } = fixture(), resources = new Set(), released = new Map(), outside = { x: 80, z: -280, r: .5 };
  world.colliders.push(outside);
  const collect = () => art.root.traverse(mesh => {
    if (!mesh.isMesh) return;
    assert.equal(mesh.geometry.attributes.position.count, mesh.geometry.attributes.color.count);
    for (const attribute of ['position', 'normal', 'color']) for (const value of mesh.geometry.attributes[attribute].array) assert.ok(Number.isFinite(value));
    for (const resource of [mesh.geometry, mesh.material]) if (!resources.has(resource)) {
      resources.add(resource); resource.addEventListener('dispose', () => released.set(resource, (released.get(resource) || 0) + 1));
    }
  });
  assert.equal(art.metrics().meshes, 7); assert.equal(art.metrics().staticMeshes, 3); assert.ok(art.metrics().triangles < 15000);
  collect(); art.setState({ millLowered: true, netWestFreed: true, netEastFreed: true, testimonyRecorded: true }); collect();
  assert.equal(resources.size, 12, 'Both geometry states and their shared material must be tracked');
  const before = art.visuals.netWest.position.z;
  art.update(.1, WORKSHOP, false); assert.equal(art.visuals.netWest.position.z, before);
  art.update(.1, { x: 0, z: 0 }, true); assert.equal(art.visuals.netWest.position.z, before);
  art.update(.1, WORKSHOP, true); assert.notEqual(art.visuals.netWest.position.z, before);
  const moving = art.visuals.netWest.position.z; art.update(Infinity, WORKSHOP, true); assert.equal(art.visuals.netWest.position.z, moving);
  art.dispose(); art.dispose(); art.setState({ millLowered: false }); art.update(.1, WORKSHOP, true);
  assert.equal(scene.children.length, 0); assert.deepEqual(world.colliders, [outside]);
  assert.equal(released.size, resources.size); assert.ok([...released.values()].every(count => count === 1));
});

test('each workyard is drawn where its people stand, with its working prop beside the site that works it', () => {
  const { scene, art } = fixture();
  const names = { 'mill-commons': 'Mill Commons workyard', 'landing-workshop': 'Landing Workshop boatyard and net frames', 'waystation-shelter': 'Waystation canvas shelter' };
  for (const site of REGIONAL_PLACES) {
    const mesh = scene.getObjectByName(names[site.id]);
    mesh.geometry.computeBoundingSphere();
    const centre = mesh.geometry.boundingSphere.center;
    assert.ok(Math.hypot(centre.x - site.center.x, centre.z - site.center.z) < site.radius, `${site.name} is drawn on its own ground`);
  }
  for (const [frame, [x, z], id] of [[YARD_FRAMES.mill, [-31, -282], 'mill-hoist'], [YARD_FRAMES.workshop, [-30, -451.3], 'net-float-west'],
    [YARD_FRAMES.workshop, [-35, -451.3], 'net-float-east'], [YARD_FRAMES.shelter, [-32, -578], 'shelter-ledger']]) {
    const spot = place(frame, x, z), site = REGIONAL_ACTIVITY_SITES[id];
    assert.ok(Math.hypot(spot.x - site.x, spot.z - site.z) < 3, `${id} is worked beside its prop`);
  }
  art.dispose();
});
