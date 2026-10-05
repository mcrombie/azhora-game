import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { scopedWorld } from './scoped-world.js';
import { REGION_IDS } from '../src/region-world.js';
import { CANERD_PATHS } from '../src/canerd-world.js';
import { runCanerdChecks } from '../src/canerd-checks.js';

// The production fast loader builds only North Celder and its shared jobs.
// This catches missing registration, stale collision indices and late support
// surfaces without generating every settlement on the continent.
const scene = new THREE.Scene();
const world = await scopedWorld(scene, [REGION_IDS['North Celder']]);

test('a traveler reaches Canerd court, enters the hall, climbs the battlements and returns without collision or falling', t => {
  assert.ok(world.loading.isReady(REGION_IDS['North Celder']));
  const result = runCanerdChecks(world);
  assert.equal(result.ok, true);
  assert.ok(result.journeys.length >= 6);
  for (const route of result.journeys) t.diagnostic(`${route.id}: ${route.walked.toFixed(1)} m, height ${route.start.y.toFixed(2)} to ${route.end.y.toFixed(2)} m, maximum grade ${route.maxSlope.toFixed(3)}`);
});

test('the level castle approach is supported by visible terrain triangles at the same height as physical feet', () => {
  scene.updateMatrixWorld(true);
  const terrain = scene.getObjectByName('The ground of Azhora');
  assert.ok(terrain, 'the production world supplies its terrain meshes');
  const visible = object => { for (let p = object; p; p = p.parent) { if (!p.visible) return false; if (p === scene) return true; } return false; };
  const meshes = [];
  terrain.traverse(object => { if (object.isMesh && visible(object)) meshes.push(object); });
  const patches = world.canerdGround?.patches ?? [];
  assert.ok(patches.length > 0 && patches.every(visible), 'the Canerd fine patches are installed and visible after regional loading');
  meshes.push(...patches.filter(object => !meshes.includes(object)));
  const route = CANERD_PATHS.find(path => path.id === 'canerd-ascent').points;
  const samples = [0, .15, .3, .45, .6, .75, .9, 1].map(t => route[Math.round((route.length - 1) * t)]);
  const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0);
  for (const point of samples) {
    const floor = world.heightAt(point.x, point.z), drawn = world.renderedGroundHeight(point.x, point.z);
    ray.set(new THREE.Vector3(point.x, floor + 150, point.z), down);
    const hit = ray.intersectObjects(meshes, false)[0];
    assert.ok(hit, `visible ground supports ${point.x}, ${point.z}`);
    assert.ok(Math.abs(hit.point.y - drawn) < .03,
      `${hit.object.name}: drawn triangle ${hit.point.y} differs from surface callback ${drawn} at ${point.x}, ${point.z}`);
    assert.ok(Math.abs(hit.point.y - floor) < .03, 'feet remain on the terrain that the traveler sees');
  }
});
