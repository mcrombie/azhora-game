import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from '../vendor/three.module.js';
import { scopedWorld } from './scoped-world.js';
import { REGION_IDS } from '../src/world/terrain/region-world.js';
import { WALK_STEP } from '../src/world/collision/walk-surfaces.js';
import { SOUTH_CELDER_ARRIVAL, SOUTH_CELDER_TRAILS } from '../src/content/regions/south-celder/south-celder-world.js';
import { NORTH_CELDER_ARRIVAL, NORTH_CELDER_TRAILS } from '../src/content/regions/canerd/north-celder-world.js';
import { inspectCelderRoute } from './celder-route-controller.js';
import { canSwim, canStand } from '../src/gameplay/movement/game-state.js';

// Exact supplied waypoint data from East Izol commit 0a47f26, kept as evidence.
// The old walk-route.mjs driver is not reused: it held initial Y and could nudge
// through blockage. These data make no new straight-line mountain-road promise.
const supplied = JSON.parse(readFileSync(new URL('./fixtures/celder-review-waypoints.json', import.meta.url), 'utf8'))
  .map(([name, x, z]) => ({ name, x, z }));
const point = (p, name) => ({ x: p.x, z: p.z, name });
const outAndBack = points => [...points, ...points.slice(0, -1).reverse()];
const south = SOUTH_CELDER_TRAILS.find(trail => trail.id === 'south-celder-length');
const north = NORTH_CELDER_TRAILS.find(trail => trail.id === 'north-celder-length');
const arm = NORTH_CELDER_TRAILS.find(trail => trail.id === 'north-celder-to-the-arm');
assert.ok(south && north && arm, 'all three published natural routes remain available');
const arrivalLink = [point(SOUTH_CELDER_ARRIVAL, 'South Celder arrival'),
  ...south.points.slice(0, 3).reverse().map(p => point(p, 'South length approach')),
  ...north.points.slice(1, 3).map(p => point(p, 'North length approach'))];
const waterRoute = [...arm.points.map(p => point(p, 'West Arm natural approach')), supplied[5], supplied[6], supplied[7],
  ...arm.points.slice().reverse().map(p => point(p, 'West Arm return'))];
const combined = [...arrivalLink, ...waterRoute.slice(1), ...arrivalLink.slice(0, -1).reverse()];
assert.deepEqual(arrivalLink.at(-1), point(NORTH_CELDER_ARRIVAL, 'North length approach'));
const routes = [
  { name: 'both published arrivals, West Arm crossing and continuous return', intent: 'authored routes plus delivered wadeable crossing', strict: true, points: combined },
  ...[south, north].map(trail => ({ name: trail.id + ' complete outward and return', intent: 'published natural route kept clear of scenery', strict: true,
    points: outAndBack(trail.points.map(p => point(p, trail.id))) })),
  { name: 'supplied scenic waypoint loop', intent: 'diagnostic chords between review sites; classify cliffs and props before adopting as a route', strict: false, points: supplied },
];

const files = ['src/world.js', 'src/world/terrain/world-terrain.js', 'src/content/regions/south-celder/south-celder-world.js', 'src/content/regions/canerd/north-celder-world.js',
  'src/content/regions/south-celder/south-celder-scenery.js', 'src/content/regions/canerd/north-celder-scenery.js', 'src/content/regions/west-lotharn/west-lotharn-world.js',
  'src/content/regions/mithala/mithala-water.js', 'src/content/regions/mithala/mithala-scenery.js', 'src/content/regions/west-lotharn/west-lotharn-ground.js', 'src/gameplay/movement/game-state.js', 'src/gameplay/movement/terrain-fall.js', 'src/gameplay/movement/swimming.js', 'src/gameplay/movement/locomotion-skills.js', 'src/gameplay/combat/combat.js'];
const source = Object.fromEntries(files.map(file => [file, createHash('sha256')
  .update(readFileSync(new URL('../' + file, import.meta.url))).digest('hex')]));
const names = ['South Celder', 'North Celder', 'West Lotharn Mountains', 'South Mithala', 'West Mithala', 'South Oremindi Mountains', 'Yunethre'];
assert.ok(names.every(name => Number.isInteger(REGION_IDS[name])), 'the combined Celder registry must be integrated before this test runs');
const scene = new THREE.Scene();
const world = await scopedWorld(scene, [REGION_IDS['North Celder']]);
scene.updateMatrixWorld(true);
const waterReference = JSON.parse(readFileSync(new URL('./fixtures/celder-mithala-water-reference.json', import.meta.url), 'utf8'));
const waterMeshes = world.mithalaWater.group.children.filter(mesh => mesh.isMesh);
const waterRows = waterMeshes.map(mesh => {
  const hash = createHash('sha256');
  for (const name of Object.keys(mesh.geometry.attributes).sort()) hash.update(name).update(Buffer.from(mesh.geometry.attributes[name].array.buffer));
  hash.update(Buffer.from(mesh.geometry.index.array.buffer));
  return { name: mesh.name, hash: hash.digest('hex') };
});
const northFirst = { jobs: world.loading.state().jobs, meshRows: waterRows,
  walls: createHash('sha256').update(JSON.stringify(world.colliders.filter(c => c.kind === 'west-deep-water'))).digest('hex'),
  water: world.waterAt(-2143.8, -1219.55), ground: world.heightAt(-2143.8, -1219.55),
  swimming: canSwim(-2143.8, -1219.55, world), standing: canStand(-2143.8, -1219.55, world) };
const ray = new THREE.Raycaster(new THREE.Vector3(-2143.8, 2000, -1219.55), new THREE.Vector3(0, -1, 0));
northFirst.drawnWater = ray.intersectObjects(waterMeshes, false)[0]?.point.y;
const priorFrame = globalThis.requestAnimationFrame, priorCancel = globalThis.cancelAnimationFrame;
globalThis.requestAnimationFrame = fn => setTimeout(() => fn(performance.now()), 0);
globalThis.cancelAnimationFrame = clearTimeout;
try { await Promise.all(names.map(name => world.loading.ensureRegion(REGION_IDS[name]))); }
finally {
  world.loading.stop();
  if (priorFrame === undefined) delete globalThis.requestAnimationFrame; else globalThis.requestAnimationFrame = priorFrame;
  if (priorCancel === undefined) delete globalThis.cancelAnimationFrame; else globalThis.cancelAnimationFrame = priorCancel;
}
const { inspectCelderScene } = await import('./celder-scene-review.js');
const sceneReview = await inspectCelderScene(scene, world);
const results = [];
for (const route of routes) {
  console.log('Celder movement review:', route.name);
  results.push(inspectCelderRoute(world, route));
}
// Capture every route before any strict assertion so one failing approach does
// not hide the remaining sites. Independent starts are never journey evidence.
if (process.env.AZHORA_CELDER_ROUTE_TRACE) writeFileSync(process.env.AZHORA_CELDER_ROUTE_TRACE, JSON.stringify({ source, northFirst, sceneReview, results }, null, 2));

test('North-first Fast arrival has the original water before neighboring vegetation, then reuses it', t => {
  t.diagnostic(JSON.stringify(northFirst));
  assert.equal(northFirst.jobs.find(job => job.id === 'mithalaWater').status, 'ready');
  assert.equal(northFirst.jobs.find(job => job.id === 'mithalaScenery').status, 'pending');
  assert.deepEqual(northFirst.meshRows, waterReference.meshes);
  assert.equal(northFirst.walls, waterReference.colliders, 'existing deep-channel barriers remain exact');
  assert.ok(northFirst.water > northFirst.ground);
  assert.ok(Math.abs(northFirst.drawnWater - northFirst.water) < .002);
  assert.equal(northFirst.swimming, true); assert.equal(northFirst.standing, false);
  assert.deepEqual(world.mithalaWater.group.children.filter(mesh => mesh.isMesh).map(mesh => mesh.uuid), waterMeshes.map(mesh => mesh.uuid));
  assert.equal(world.waterAt(0, 0), .45, 'the shallow-arm fix does not change the opening-country water lookup');
});

test('combined Celder scenery and wildlife preserve delivered identities and meet actual visible ground', t => {
  t.diagnostic(JSON.stringify({ ...sceneReview, contactProblems: sceneReview.contactProblems.length }));
  assert.deepEqual(sceneReview.problems, [], sceneReview.problems.join('; '));
});

for (const result of results.filter(row => row.strict)) test(result.name, t => {
  t.diagnostic(JSON.stringify(result));
  const problems = [];
  if (!result.complete || result.independentStarts) problems.push('did not complete continuously from the original departure');
  if (!result.final.clearStart || !result.final.dryFinish) problems.push('departure or final arrival lacks dry standing support');
  if (result.legs.some(leg => leg.falls.length)) problems.push('entered falling on a published approach');
  if (result.legs.some(leg => leg.damage) || result.final.hp !== 100) problems.push('lost health to terrain or water');
  if (result.final.biggestGroundedRise > WALK_STEP) problems.push('snapped vertically above the ordinary step allowance');
  if (result.final.leastWind <= 0) problems.push('exhausted ordinary swimming stamina');
  if (result.name.startsWith('both published') && !(result.final.swum > 0 && result.final.waterTransitions.filter(row => row.entered).length >= 2))
    problems.push('did not actually enter and return across the delivered water crossing');
  assert.deepEqual(problems, [], problems.join('; '));
});
test('supplied scenic loop diagnostics remain separate from authored approach acceptance', t => {
  const result = results.find(row => !row.strict);
  t.diagnostic(JSON.stringify(result));
  assert.equal(result.legs.length, supplied.length - 1, 'every supplied leg must be diagnosed even after an earlier obstruction');
});
