import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { SOUTH_OREMINDI, SOUTH_OREMINDI_BOUNDS, SOUTH_OREMINDI_LAKES, SOUTH_OREMINDI_PATHS,
  southOremindiFeatures, southOremindiGround, southOremindiWaterAt } from '../src/content/regions/south-oremindi/south-oremindi-world.js';
import { groundWithRiver } from '../src/world/terrain/world-terrain.js';
import { timberForSpecies } from '../src/gameplay/skills/woodcutting/wood-species.js';
import { canStand } from '../src/gameplay/movement/game-state.js';
import { isClimbTerrain } from '../src/gameplay/movement/climbing.js';
import { INQUEST, INQUEST_HOME, INQUEST_HOME_PATH, INQUEST_PLACEHOLDER, inquestHomeClear } from '../src/content/quests/homes/inquest-home.js';
const { createSouthOremindiScenery } = await sourceModule('../src/content/regions/south-oremindi/south-oremindi-scenery.js');
const { getTreeRegistry } = await sourceModule('../src/world/scenery/tree-registry.js');
const parent = new THREE.Group(), colliders = [];
const scenery = createSouthOremindiScenery({ parent, colliders, heightAt: groundWithRiver });
const world = { bounds:SOUTH_OREMINDI_BOUNDS, heightAt: groundWithRiver, colliders, waterAt: (x,z) => southOremindiWaterAt(x,z) ?? .45,
  regionAt: () => ({ id: 37, name: SOUTH_OREMINDI }) };
parent.updateMatrixWorld(true);

test('The real terrain pipeline provides South Oremindi lake beds and enables climbing', () => {
  for (const lake of SOUTH_OREMINDI_LAKES) {
    assert.ok(groundWithRiver(lake.centre.x,lake.centre.z) < lake.surface - 1);
    assert.ok(isClimbTerrain(world,lake.centre.x,lake.centre.z));
  }
  assert.equal(southOremindiGround(0,0,123),123);
});

test('Mountain trees all have harvestable species and registered visible parts', () => {
  const registry = getTreeRegistry(colliders);
  assert.ok(scenery.trees.length > 250, `Only ${scenery.trees.length} mountain trees`);
  assert.deepEqual(new Set(scenery.trees.map(t=>t.species)),new Set(['silver-fir','silver-birch','stone-pine','common-juniper']));
  assert.equal(registry.trees.length,scenery.trees.length);
  for (const tree of scenery.trees) {
    assert.ok(timberForSpecies(tree.species)); assert.equal(tree.harvestable,true);
    assert.equal(southOremindiWaterAt(tree.x,tree.z),null);
    assert.ok(southOremindiFeatures(tree.x,tree.z).pathDistance>=5);
    assert.equal(colliders.find(c=>c.id===tree.id)?.species,tree.species);
  }
  assert.ok(scenery.metrics.batches < scenery.metrics.trees,'Trees are spatially batched');
});

test('Rendered lake surfaces use the exact swimming heights and polygon basins', () => {
  const ray = new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0));
  for (const lake of SOUTH_OREMINDI_LAKES) {
    ray.ray.origin.set(lake.centre.x,1500,lake.centre.z);
    const hit=ray.intersectObjects(scenery.waterMeshes,false)[0];
    assert.ok(hit, lake.name); assert.ok(Math.abs(hit.point.y-lake.surface)<.001);
    assert.equal(world.waterAt(hit.point.x,hit.point.z),lake.surface);
  }
});

test('Scenery leaves both natural mountain approaches clear of trunk and boulder collisions', () => {
  for (const path of SOUTH_OREMINDI_PATHS) for (let j=1;j<path.points.length;j++) {
    const a=path.points[j-1],b=path.points[j],steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z));
    for(let i=0;i<=steps;i++) {
      const x=a.x+(b.x-a.x)*i/steps,z=a.z+(b.z-a.z)*i/steps;
      assert.ok(canStand(x,z,world),`${path.name}: ${x}, ${z}`);
    }
  }
});

test('The Long Tarn cottage clears a local approach without moving its landmark or surrounding forest', () => {
  const cottageColliders = [];
  const cottageScenery = createSouthOremindiScenery({ parent: new THREE.Group(), colliders: cottageColliders,
    heightAt: groundWithRiver, isReserved: inquestHomeClear });
  const cottageWorld = { ...world, colliders: cottageColliders };
  const house = INQUEST_HOME.house;
  // The east-facing house has its depth along world X and width along world Z.
  for (let ix = 0; ix <= 12; ix++) for (let iz = 0; iz <= 16; iz++) {
    const x = house.x - house.depth / 2 + house.depth * ix / 12;
    const z = house.z - house.width / 2 + house.width * iz / 16;
    assert.ok(canStand(x, z, cottageWorld), `Cottage footprint remains obstructed at ${x}, ${z}`);
  }
  for (let j = 1; j < INQUEST_HOME_PATH.length; j++) {
    const a = INQUEST_HOME_PATH[j - 1], b = INQUEST_HOME_PATH[j];
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / .25);
    for (let i = 0; i <= steps; i++) {
      const x = a.x + (b.x - a.x) * i / steps, z = a.z + (b.z - a.z) * i / steps;
      assert.ok(canStand(x, z, cottageWorld), `Cottage approach remains obstructed at ${x}, ${z}`);
    }
  }
  for (const p of [INQUEST, INQUEST_HOME.mailbox]) {
    assert.ok(canStand(p.x, p.z, cottageWorld), `Reserved standing spot is obstructed at ${p.x}, ${p.z}`);
  }

  const erratic = colliders.find(c => c.kind === 'rock' && Math.hypot(c.x + 3458.939458955894, c.z + 462.5571666201686) < .01);
  assert.ok(erratic, 'The screenshot\'s pale shoreline boulder is still identifiable');
  assert.deepEqual(cottageColliders.find(c => c.kind === 'rock' && c.x === erratic.x && c.z === erratic.z), erratic,
    'Adding the cottage must preserve the pale shoreline boulder');

  const original = new Map(scenery.trees.map(t => [t.id, t]));
  const retained = new Map(cottageScenery.trees.map(t => [t.id, t]));
  const treeFacts = t => ({ x: t.x, y: t.y, z: t.z, species: t.species, height: t.height, radius: t.radius, base: t.base });
  for (const tree of cottageScenery.trees) {
    assert.ok(original.has(tree.id), `Reservation unexpectedly generated a new tree: ${tree.id}`);
    assert.deepEqual(treeFacts(tree), treeFacts(original.get(tree.id)), `Reservation moved or changed ${tree.id}`);
  }
  const removed = scenery.trees.filter(t => !retained.has(t.id));
  assert.ok(removed.length > 0, 'The birch obstructing the approach must actually be removed');
  for (const tree of removed) {
    assert.ok(Math.hypot(tree.x - house.x, tree.z - house.z) < 22, `Clearing spilled beyond the cottage: ${tree.id}`);
    assert.ok(inquestHomeClear(tree.x, tree.z, tree.height * .5), `An unrelated tree was removed: ${tree.id}`);
  }
  const outside = scenery.trees.filter(t => Math.hypot(t.x - house.x, t.z - house.z) >= 22);
  assert.ok(outside.length > 250);
  assert.deepEqual(cottageScenery.trees.filter(t => Math.hypot(t.x - house.x, t.z - house.z) >= 22).map(treeFacts), outside.map(treeFacts),
    'The forest outside the small cottage clearing must retain its exact seeded placement');
  assert.equal(getTreeRegistry(cottageColliders).trees.length, cottageScenery.trees.length);
  assert.equal(INQUEST.name, 'Inquest Clearlistern');
  assert.equal(INQUEST.look.blankSlate, true);
  assert.equal(INQUEST_PLACEHOLDER, 'This person could use more characterization.');
});
