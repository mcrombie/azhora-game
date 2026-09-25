import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { canStand, moveCharacter } from '../src/game-state.js';

const { sourceModule } = await import('./module-loader.js');
const { forestPlaceDefinitions, forestPlacePaths, forestFeatureClear, tintForestGround } = await sourceModule('../src/forest-places.js');
const { createWorld } = await sourceModule('../src/world.js');
const { villageToWorld } = await sourceModule('../src/region-world.js');
const W = point => villageToWorld(point.x, point.z);
const scene = new THREE.Scene(), world = createWorld(scene);

test('Every woodland destination has a broad collision-free route in both directions', () => {
  assert.equal(world.forestPlaces.length, 6);
  assert.equal(new Set(world.forestPlaces.map(s => s.id)).size, 6);
  for (const site of world.forestPlaces) {
    assert.equal(world.regionAt(site.x, site.z).id, 1, `${site.id} remains in Drent`);
    assert.ok(canStand(site.x, site.z, world, .8), `${site.id} has room to inspect`);
    assert.equal(world.landmarks.filter(s => s.id === site.id).length, 1);
  }
  for (const local of forestPlacePaths) {
    const trail = local.map(W);
    const curve = new THREE.CatmullRomCurve3(trail.map(point => new THREE.Vector3(point.x, 0, point.z)));
    for (const point of curve.getPoints(Math.ceil(curve.getLength() / .2)))
      assert.ok(canStand(point.x, point.z, world, .6), `Rendered curved trail blocked at ${point.x.toFixed(2)},${point.z.toFixed(2)}`);
    const p = { ...trail[0] };
    assert.ok(canStand(p.x, p.z, world, .48), `Trail entrance ${p.x},${p.z} is clear`);
    for (const target of [...trail.slice(1), ...trail.slice(0, -1).reverse()]) {
      const distance = Math.hypot(target.x - p.x, target.z - p.z), steps = Math.ceil(distance / .25);
      const origin = { ...p };
      for (let step = 1; step <= steps; step++) {
        const t = step / steps, x = origin.x + (target.x - origin.x) * t, z = origin.z + (target.z - origin.z) * t;
        assert.ok(canStand(x, z, world, .48), `Trail blocked at ${x.toFixed(2)},${z.toFixed(2)}`);
      }
      moveCharacter(p, target.x - p.x, target.z - p.z, world);
      assert.ok(Math.hypot(p.x - target.x, p.z - target.z) < .04, `Walking stops before ${target.x},${target.z}`);
    }
  }
  assert.ok(canStand(world.npcPositions['forest-woodcutter'].x, world.npcPositions['forest-woodcutter'].z, world, .8));
});

test('Place protection is local and leaves original main quest interaction spaces open', () => {
  for (const point of [world.training, world.encounter, world.northTrail, world.border, world.pond.fishingSpot,
    ...Object.values(world.npcPositions), ...world.firePits]) {
    // The original practice post itself is a collider; its standing space is beside it.
    const z = point === world.training ? point.z - 1.1 : point.z;
    assert.ok(canStand(point.x, z, world), `Original point ${point.x},${z} became blocked`);
  }
  assert.equal(forestFeatureClear(0, -180, true), false);
  assert.equal(forestFeatureClear(24, -412, true), false);
  assert.equal(forestFeatureClear(80, -90, true), false);
  for (const site of forestPlaceDefinitions) assert.ok(forestFeatureClear(site.x, site.z, true));
  for (const collider of world.colliders.filter(c => c.kind === 'forest-place')) assert.ok(collider.x > -164 && collider.x < 6);
});

test('Minor woodland paths stay unsigned while the main road remains marked and terrain tint stays local', () => {
  const mainRoad = world.roadSigns.find(sign => sign.label === 'The Greenway');
  assert.ok(mainRoad, 'the main road retains its fingerpost');
  assert.equal(mainRoad.kind, 'direction');
  assert.equal(mainRoad.returnLabel, 'Tidehaven Landing');
  assert.equal(canStand(mainRoad.x, mainRoad.z, world), false, 'the main-road post has physical collision');
  for (const site of forestPlaceDefinitions) {
    assert.equal(world.roadSigns.some(sign => sign.label === site.name || sign.returnLabel === site.name), false,
      `${site.name} is discovered by following its unsigned dirt path`);
    const head = W(site.trail[0]);
    assert.ok(canStand(head.x, head.z, world, .6), `${site.name}'s unmarked entrance remains walkable`);
  }
  for (const [x, z] of [[0, 5], [0, -162], [20, -230], [-15, -420], [0, -590], [85, -90]]) {
    const initial = new THREE.Color('#85a46b'), copy = initial.clone(); tintForestGround(copy, x, z);
    assert.ok(copy.equals(initial), `Ground outside the six places was recolored at ${x},${z}`);
  }
  for (const site of forestPlaceDefinitions) {
    const color = new THREE.Color('#85a46b'); tintForestGround(color, site.x, site.z);
    assert.ok([color.r, color.g, color.b].every(v => Number.isFinite(v) && v >= 0 && v <= 1));
  }
});

test('Visible bundle and fallen wayboard change independently without blocking inspection', () => {
  const bundle = scene.getObjectByName('Lost woodland work bundle'), board = scene.getObjectByName('Mosskeeper repaired wayboard');
  assert.ok(bundle.visible); assert.ok(board.rotation.z > .8);
  world.setForestPlaceState({ bundleTaken: true });
  assert.equal(bundle.visible, false); assert.ok(board.rotation.z > .8);
  world.setForestPlaceState({ memorialRepaired: true });
  assert.equal(board.rotation.z, 0); assert.equal(bundle.visible, false);
  assert.deepEqual(world.forestPlaceState(), { bundleTaken: true, memorialRepaired: true });
  world.setForestPlaceState({ bundleTaken: false, memorialRepaired: false });
  assert.ok(bundle.visible); assert.ok(board.rotation.z > .8);
  const copy = world.forestPlaceState(); copy.bundleTaken = true;
  assert.equal(world.forestPlaceState().bundleTaken, false);
  for (const site of world.forestPlaces) assert.ok(canStand(site.x, site.z, world, .8));
});

test('Woodland art uses eight bounded static batches with finite geometry', () => {
  const root = scene.getObjectByName('Tidehaven woods places'), meshes = [];
  root.traverse(object => { if (object.isMesh) meshes.push(object); });
  const metrics = world.forestPlaceMetrics();
  assert.equal(meshes.length, 8);
  assert.equal(new Set(meshes.map(m => m.material)).size, 1);
  assert.equal(metrics.meshes, 8); assert.ok(metrics.triangles < 24000, `${metrics.triangles} triangles exceeds scenery budget`);
  for (const mesh of meshes) {
    const p = mesh.geometry.attributes.position;
    for (const value of p.array) assert.ok(Number.isFinite(value), mesh.name);
    assert.ok(mesh.geometry.boundingSphere.radius < 16, `${mesh.name} lost useful local culling bounds`);
    assert.equal(mesh.geometry.attributes.color.count, p.count);
  }
});
