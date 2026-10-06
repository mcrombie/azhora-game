import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { REGION_CELLS, hexOwnerAt } from '../src/world/terrain/region-world.js';
import { IBENWOOD_NAMES, IBENWOOD_PATHS, IBENWOOD_PILOT, IBENWOOD_GROVES, ibenwoodWaterClear, segmentDistance } from '../src/content/regions/ibenwood/ibenwood-environment.js';
import { IBENWOOD_BRANCH_SITES, IBENWOOD_BRANCH_IDS, createIbenwoodGatheringSites } from '../src/content/regions/ibenwood/ibenwood-gathering.js';
import { GROVE_WOOD } from '../src/content/regions/ibenwood/ibenwood-pilot.js';
import { validateWoodlandProgress, copyWoodlandProgress } from '../src/content/chapters/journey/woodland-progress.js';
import { createRoadCheckpoint } from '../src/app/saves/road-checkpoint.js';
import { createInventoryState } from '../src/gameplay/inventory/inventory.js';
import { createWeapons } from '../src/gameplay/combat/weapons.js';
import { createJourney } from '../src/content/chapters/journey/journey.js';
import { createForestStory } from '../src/content/quests/forest/forest-story.js';
import { METRES_PER_HEX } from '../src/world/terrain/world-scale.js';

const { createWoodlandLife } = await sourceModule('../src/world/life/woodland-life.js');
const legacyIds = Array.from({ length: 7 }, (_, pocket) => [1, 2].map(slot => `stick-${pocket + 1}-${slot}`)).flat();
const groveIds = ['ibenwood-fallen-0', 'ibenwood-fallen-1', 'ibenwood-fallen-2'];
const allIds = [...legacyIds, ...groveIds, ...IBENWOOD_BRANCH_IDS];
const woodland = (sticks = []) => ({ version: 1, acornStatus: 'available', practiceHits: 0, practiceDodges: 0,
  acorns: [], sticks, fruits: [], discoveries: [], camp: { version: 1, taught: false, catches: 0, fires: {} } });
const flatWorld = () => ({ bounds: { minX: -10000, maxX: 10000, minZ: -10000, maxZ: 10000 },
  heightAt: () => 22, waterAt: () => null, colliders: [], broadleafTrees: [], regionalBroadleafTrees: [],
  paths: [[{ x: 0, z: -200 }, { x: 0, z: 150 }]], npcPositions: {},
  training: { x: 1000, z: 1000 }, repairBench: { x: 1000, z: 1000 }, encounter: { x: 1000, z: 1000, radius: 2 },
  regionAt: (x, z) => ({ name: hexOwnerAt(x, z) }) });

test('stable branch identities cover all five regions at about one site per two atlas cells', async () => {
  const second = await import('../src/content/regions/ibenwood/ibenwood-gathering.js?determinism=1');
  assert.deepEqual(second.IBENWOOD_BRANCH_SITES, IBENWOOD_BRANCH_SITES);
  assert.equal(new Set(allIds).size, allIds.length);
  assert.deepEqual(GROVE_WOOD.map(site => site.id), groveIds, 'pilot save identities are unchanged');
  const cells = IBENWOOD_NAMES.reduce((count, name) => count + REGION_CELLS[name].length, 0);
  assert.ok(IBENWOOD_BRANCH_SITES.length >= cells * .43 && IBENWOOD_BRANCH_SITES.length <= cells * .52);
  for (const region of IBENWOOD_NAMES) {
    const sites = IBENWOOD_BRANCH_SITES.filter(site => site.region === region);
    assert.ok(sites.length >= Math.floor(REGION_CELLS[region].length / 3), `${region}: enough trail pickups`);
    assert.ok(sites.length <= Math.ceil(REGION_CELLS[region].length / 2), `${region}: modest regional allowance`);
    for (let i = 0; i < sites.length; i++) for (let j = i + 1; j < sites.length; j++) {
      assert.ok(Math.hypot(sites[i].x - sites[j].x, sites[i].z - sites[j].z) >= 20, 'no clustered branch piles');
    }
  }
});

test('every placement option follows a forest path and excludes settlements and mapped water', () => {
  const segments = IBENWOOD_PATHS.flatMap(path => path.points.slice(1).map((b, i) => [path.points[i], b]));
  for (const site of IBENWOOD_BRANCH_SITES) {
    assert.ok(Object.isFrozen(site) && Object.isFrozen(site.positions));
    for (const point of site.positions) {
      assert.equal(hexOwnerAt(point.x, point.z), site.region);
      const trailDistance = Math.min(...segments.map(([a, b]) => segmentDistance(point.x, point.z, a, b)));
      assert.ok(trailDistance < .36, `${site.id}: accessible from the path`);
      for (const settlement of [IBENWOOD_PILOT, ...IBENWOOD_GROVES]) {
        assert.ok(Math.hypot(point.x - settlement.x, point.z - settlement.z) > settlement.radius + 5, site.id);
      }
      assert.ok(ibenwoodWaterClear(point.x, point.z, 3), `${site.id}: outside mapped water and banks`);
    }
  }
});

test('final placement checks solid ground and water while retaining the same pickup identity', () => {
  const world = flatWorld(), site = IBENWOOD_BRANCH_SITES.find(s => s.positions.length === 5);
  assert.ok(site);
  assert.equal(createIbenwoodGatheringSites(world).length, IBENWOOD_BRANCH_IDS.length);
  world.colliders.push({ x: site.x, z: site.z, r: .2 });
  const shifted = createIbenwoodGatheringSites(world).find(s => s.id === site.id);
  assert.ok(shifted && Math.hypot(shifted.x - site.x, shifted.z - site.z) > 1);
  world.waterAt = (x, z) => Math.hypot(x - site.x, z - site.z) < 6 ? 23 : null;
  assert.ok(!createIbenwoodGatheringSites(world).some(s => s.id === site.id), 'submerged alternatives are not pickups');
});

test('save whitelist accepts exact legacy, pilot and regional IDs and rejects invented IDs', () => {
  const stock = new Set();
  assert.equal(validateWoodlandProgress(woodland(), stock), true);
  assert.equal(validateWoodlandProgress(woodland([...legacyIds, ...groveIds]), stock), true);
  assert.equal(validateWoodlandProgress(woodland(allIds), stock), true);
  for (const sticks of [
    ['stick-8-1'], ['ibenwood-fallen-3'], ['ibenwood-branch-invented-1-0'],
    [`${IBENWOOD_BRANCH_IDS[0]}-extra`], [IBENWOOD_BRANCH_IDS[0], IBENWOOD_BRANCH_IDS[0]],
    [null], [1], 'ibenwood-fallen-0',
  ]) assert.equal(validateWoodlandProgress(woodland(sticks), stock), false, String(sticks));
  const original = woodland([...groveIds, IBENWOOD_BRANCH_IDS[0]]), copy = copyWoodlandProgress(original);
  copy.sticks.pop();
  assert.equal(original.sticks.length, 4, 'save copies do not share pickup arrays');
});

test('ordinary fallen-stick collection survives an actual checkpoint and recreated pickup controller', () => {
  const scene = new THREE.Scene(), life = createWoodlandLife(scene, flatWorld());
  const inventory = createInventoryState(); inventory.grant('simple-sword');
  const weapons = createWeapons({ inventory }), story = createForestStory({ inventory, weapons });
  const gathered = [...IBENWOOD_BRANCH_IDS, ...groveIds, 'stick-1-1'];
  for (const id of gathered) {
    const site = life.state().sticks.find(stick => stick.id === id);
    assert.ok(site, `${id}: registered with the existing controller`);
    assert.equal(life.nearestStick(site, .01)?.id, id);
    assert.equal(life.collectStick(id), true);
    inventory.add('forest-stick');
    assert.equal(life.collectStick(id), false, 'no repeat collection');
  }
  let raw;
  const checkpoint = createRoadCheckpoint({ storage: { getItem: () => raw, setItem: (_, value) => { raw = value; } } });
  const data = { version: 1, questStage: 1, journey: createJourney().snapshot(),
    inventory: inventory.items().map(id => ({ id, quantity: inventory.count(id) })), weapons: weapons.snapshot(),
    journeyGathered: [], meadowCleared: false, worldScale: METRES_PER_HEX, position: { x: 0, z: 16 }, heardDoom: false,
    health: 81, woodland: woodland(life.state().sticks.filter(stick => stick.collected).map(stick => stick.id)), forestStory: story.snapshot() };
  assert.equal(checkpoint.save(data).ok, true);
  const saved = checkpoint.read().data;
  assert.equal(saved.inventory.find(item => item.id === 'forest-stick').quantity, gathered.length);
  assert.deepEqual(saved.woodland.sticks, data.woodland.sticks);
  const restoredScene = new THREE.Scene(), restored = createWoodlandLife(restoredScene, flatWorld());
  restored.restoreCollectedSticks(saved.woodland.sticks);
  const restoredState = restored.state().sticks;
  assert.deepEqual(restoredState.filter(stick => stick.collected).map(stick => stick.id), data.woodland.sticks);
  const mesh = restoredScene.getObjectByName('Collectible fallen sticks'), matrix = new THREE.Matrix4();
  for (const id of gathered) {
    const index = restoredState.findIndex(stick => stick.id === id);
    mesh.getMatrixAt(index, matrix);
    assert.equal(matrix.determinant(), 0, `${id}: collected branch stays hidden`);
    assert.equal(restored.nearestStick(restoredState[index], .01), null);
    assert.equal(restored.collectStick(id), false);
  }
  assert.equal(restored.collectStick('stick-1-2'), true, 'uncollected legacy stick remains available');
});
