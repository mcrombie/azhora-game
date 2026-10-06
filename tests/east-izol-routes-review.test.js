import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from '../vendor/three.module.js';
import { scopedWorld } from './scoped-world.js';
import { inspectCelderRoute } from './celder-route-controller.js';
import { REGION_IDS } from '../src/world/terrain/region-world.js';
import { IZOL_ROAD, SEA_GATE_PATH } from '../src/content/regions/izol/izol-world.js';
import { EAST_IZOL_TRAILS, EAST_IZOL_ARRIVAL, EAST_IZOL_PRESENCES } from '../src/content/regions/east-izol/east-izol-world.js';
import { WALK_STEP } from '../src/world/collision/walk-surfaces.js';
import { inspectEastIzolScene } from './east-izol-scene-review.js';

// The delivered walk-route.mjs kept initial Y and nudged blocked positions.
// Only its published trail data are used here. Every journey below is one
// ordinary novice traveler through the actual support/fall/body controllers.
const copy = p => ({ x: p.x, z: p.z });
const outAndBack = points => [...points, ...points.slice(0, -1).reverse()].map(copy);
const trails = EAST_IZOL_TRAILS.map(trail => ({ name: `${trail.id} complete ascent/approach and return`,
  intent: 'published natural trail kept clear of scenery', strict: true, points: outAndBack(trail.points) }));
const routes = [
  { name: 'Hearth Road from West Izol to the reserved central site and back',
    intent: 'existing cross-region road on the corrected West Izol terrain', strict: true, points: outAndBack(IZOL_ROAD) },
  ...trails,
  { name: 'East Izol arrival to the Hearth Road end and back', intent: 'arrival must reach the existing island routes', strict: true,
    points: outAndBack([EAST_IZOL_ARRIVAL, { x: 513, z: 1900 }, IZOL_ROAD.at(-1)]) },
  { name: 'West Izol harbor contact remains safe after East Izol integration', intent: 'the previously repaired deck-to-shore return',
    strict: true, points: outAndBack(SEA_GATE_PATH.slice(0, 2)) },
];
assert.equal(trails.length, 6, 'all six delivered clear routes are checked');
assert.equal(EAST_IZOL_PRESENCES.length, 3);
const sourceFiles = ['src/world.js', 'src/world/terrain/world-terrain.js', 'src/content/regions/east-izol/east-izol-world.js', 'src/content/regions/east-izol/east-izol-scenery.js',
  'src/content/regions/east-izol/east-izol-wildlife.js', 'src/content/regions/izol/izol-world.js', 'src/content/regions/izol/izol-ground.js', 'src/content/regions/izol/izol-scenery.js',
  'src/gameplay/movement/game-state.js', 'src/gameplay/movement/climbing.js', 'src/gameplay/movement/terrain-fall.js', 'src/content/regions/western-regions/west-regions-life.js', 'tests/celder-route-controller.js'];
const source = Object.fromEntries(sourceFiles.map(file => [file, createHash('sha256')
  .update(readFileSync(new URL('../' + file, import.meta.url))).digest('hex')]));
const scene = new THREE.Scene(), world = await scopedWorld(scene, [REGION_IDS['East Izol'], REGION_IDS['West Izol']]);
const sceneReview = await inspectEastIzolScene(scene, world);
const results = [];
for (const route of routes) {
  console.log('East Izol movement review:', route.name);
  results.push(inspectCelderRoute(world, route, { continueDiagnostics: false }));
}
if (process.env.AZHORA_EAST_IZOL_ROUTE_TRACE)
  writeFileSync(process.env.AZHORA_EAST_IZOL_ROUTE_TRACE, JSON.stringify({ source, sceneReview, results }, null, 2));

test('East Izol preserves West Izol saved trees and people while new scenery meets actual retained ground', t => {
  t.diagnostic(JSON.stringify(sceneReview));
  assert.deepEqual(sceneReview.problems, [], sceneReview.problems.join('; '));
});

for (const result of results) test(result.name, t => {
  const f = result.final, problems = [];
  t.diagnostic(JSON.stringify(result));
  if (!result.complete || result.independentStarts) problems.push('journey did not finish continuously from its original departure');
  if (!f.clearStart || !f.dryFinish) problems.push('departure or return lacks clear dry standing support');
  if (f.falls.length) problems.push(`entered ${f.falls.length} terrain falls`);
  if (f.damage || f.hp !== 100) problems.push(`lost ${f.damage} health`);
  if (f.swum || f.waterTransitions.length) problems.push('left the published dry approach for water');
  if (f.biggestGroundedRise > WALK_STEP) problems.push('snapped upward beyond the ordinary step allowance');
  if (Math.hypot(f.at.x - f.initial.x, f.at.z - f.initial.z) > .25) problems.push('did not return to the original starting point');
  assert.deepEqual(problems, [], problems.join('; '));
});
