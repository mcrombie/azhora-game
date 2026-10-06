import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { FARMSTEADS, FARM_LANES, REGIONAL_FARM_ROWS, REGIONAL_SEED_STATIONS,
  FARMLAND_WILDLIFE_EXCLUSIONS, regionalFarmlandClear, regionalFarmlandWorked, inFarmPolygon } from '../src/world/scenery/regional-farmland.js';
import { groundWithRiver } from '../src/world/terrain/world-terrain.js';
import { hexOwnerAt, landDistance, WORLD_BOUNDS } from '../src/world/terrain/region-world.js';
import { CARICAS_ROADS } from '../src/content/regions/minora-frontier/caricas-settlement.js';
import { inWestWater } from '../src/content/regions/western-regions/west-regions.js';
import { elagosWaterDistance, ELAGOS_ROADS } from '../src/content/regions/ambron/elagos-world.js';
import { ambronOutsideDistance } from '../src/content/regions/ambron/ambron-city-layout.js';
import { PASSES, passPoint, YARDS } from '../src/content/regions/feradom/feradom-world.js';
import { canStand } from '../src/gameplay/movement/game-state.js';

const { createRegionalFarmlandScenery } = await sourceModule('../src/world/scenery/regional-farmland-scenery.js');
const grade = (x, z) => Math.hypot((groundWithRiver(x + 1, z) - groundWithRiver(x - 1, z)) / 2,
  (groundWithRiver(x, z + 1) - groundWithRiver(x, z - 1)) / 2);
function lineSamples(a, b, step = 2) {
  const count = Math.max(1, Math.ceil(Math.hypot(a.x - b.x, a.z - b.z) / step));
  return Array.from({ length: count + 1 }, (_, i) => ({ x: a.x + (b.x - a.x) * i / count, z: a.z + (b.z - a.z) * i / count }));
}
function lineDistance(p, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t);
}
const passSegments = PASSES.flatMap(pass => Array.from({ length: 60 }, (_, i) => [passPoint(pass, 0, -20 + i * 4), passPoint(pass, 0, -16 + i * 4)]));
const citySegments = ELAGOS_ROADS.flatMap(road => road.slice(1).map((point, i) => [road[i], point]));
const caricasSegments = CARICAS_ROADS.flatMap(road => road.points.slice(1).map((point, i) => [road.points[i], point]));

test('usable farms cover Feradom, Ambron hinterland and the occupied Caricas shelf', () => {
  assert.equal(FARMSTEADS.filter(farm => farm.region === 'Feradom').length, 7);
  assert.equal(FARMSTEADS.filter(farm => farm.region === 'Elagos').length, 3);
  assert.equal(FARMSTEADS.filter(farm => farm.region === 'Caricas').length, 5);
  const plains = FARMSTEADS.filter(farm => farm.region === 'Feradom');
  assert.ok(Math.max(...plains.map(f => f.x)) - Math.min(...plains.map(f => f.x)) > 800, 'fields are spread across the plain');
  assert.equal(REGIONAL_FARM_ROWS.length, 47);
  assert.equal(new Set(REGIONAL_FARM_ROWS.map(row => row.id)).size, 47, 'save IDs never collide');
  assert.equal(REGIONAL_SEED_STATIONS.length, FARMSTEADS.length);
  for (const farm of FARMSTEADS) {
    assert.ok(farm.rows.length >= 2 && farm.rows.length <= 4, `${farm.id} remains a modest playable garden`);
    for (const field of farm.fields) assert.ok([null, 'barley', 'carrot', 'beet'].includes(field.crop));
    const samples = [...farm.boundary, ...farm.rows, ...farm.orchardTrees, farm.shed, farm.seedStation,
      ...farm.fields.flatMap(field => field.polygon.flatMap((a, i) => lineSamples(a, field.polygon[(i + 1) % field.polygon.length])))];
    for (const p of samples) {
      assert.equal(hexOwnerAt(p.x, p.z), farm.region, `${farm.id} stays in its region`);
      assert.ok(landDistance(p.x, p.z) > 4, `${farm.id} keeps away from the sea`);
      assert.ok(elagosWaterDistance(p.x, p.z) > 10, `${farm.id} never covers a lake margin`);
      if (farm.region === 'Caricas') assert.equal(inWestWater(p.x, p.z, 8), false, `${farm.id} preserves western river margins`);
      assert.ok(grade(p.x, p.z) < .72, `${farm.id} stays on walkable cultivated slopes`);
      if (farm.region === 'Elagos') {
        assert.ok(ambronOutsideDistance(p.x, p.z) > 20, `${farm.id} leaves the city wall and gate apron clear`);
        assert.ok(ambronOutsideDistance(p.x, p.z) < 150, `${farm.id} belongs to Ambron's immediate hinterland`);
      }
    }
    for (const row of farm.rows) {
      const heights = [-1.5, 1.5].flatMap(dx => [-1.65, 1.65].map(dz => groundWithRiver(row.x + dx, row.z + dz)));
      assert.ok(Math.max(...heights) - Math.min(...heights) < .45, `${row.id} is on gentle garden ground`);
      assert.ok(regionalFarmlandClear(row.x, row.z, 2));
      assert.ok(regionalFarmlandWorked(row.x, row.z));
      assert.ok(FARMLAND_WILDLIFE_EXCLUSIONS.some(e => row.x > e.minX && row.x < e.maxX && row.z > e.minZ && row.z < e.maxZ));
    }
  }
  assert.equal(regionalFarmlandClear(0, 0), false, 'the reservation has no effect on the starting village');
  const meadow = FARMSTEADS[2].fields.find(field => field.kind === 'meadow');
  const inside = { x: meadow.polygon.reduce((n, p) => n + p.x, 0) / meadow.polygon.length,
    z: meadow.polygon.reduce((n, p) => n + p.z, 0) / meadow.polygon.length };
  assert.ok(inFarmPolygon(meadow.polygon, inside.x, inside.z));
  assert.equal(regionalFarmlandWorked(inside.x, inside.z), false, 'wildlife may still use unworked meadow margins');
});

test('farms preserve public roads, fortified passes, and linked pedestrian access', () => {
  for (const farm of FARMSTEADS) {
    const roads = farm.region === 'Feradom' ? passSegments : farm.region === 'Caricas' ? caricasSegments : citySegments;
    for (const p of [...farm.boundary, ...farm.rows, farm.shed, farm.seedStation]) {
      assert.ok(Math.min(...roads.map(([a, b]) => lineDistance(p, a, b))) > 8, `${farm.id} does not occupy a road/pass floor`);
      for (const yard of YARDS) assert.equal(inFarmPolygon(yard.corners, p.x, p.z), false, `${farm.id} stays out of castle yards`);
    }
    const lane = FARM_LANES.find(l => l.farmId === farm.id);
    assert.ok(lane, `${farm.id} has a footpath`);
    assert.ok([farm.approach[0], farm.approach.at(-1)].some(p => p.x === lane.points[0].x && p.z === lane.points[0].z));
    const end = lane.points.at(-1);
    const linksOtherFarm = FARMSTEADS.some(other => other.id !== farm.id && other.approach.some(p => Math.hypot(p.x - end.x, p.z - end.z) < 1));
    assert.ok(linksOtherFarm || Math.min(...roads.map(([a, b]) => lineDistance(end, a, b))) < 2, `${lane.id} reaches an existing route`);
    for (let i = 1; i < lane.points.length; i++) for (const p of lineSamples(lane.points[i - 1], lane.points[i], 1.5)) {
      assert.equal(hexOwnerAt(p.x, p.z), lane.region);
      assert.ok(landDistance(p.x, p.z) > 10 && elagosWaterDistance(p.x, p.z) > 10, `${lane.id} stays dry`);
      assert.ok(grade(p.x, p.z) < .7, `${lane.id} needs walking, not climbing`);
      assert.ok(regionalFarmlandClear(p.x, p.z), `${lane.id} clears incidental vegetation along its length`);
    }
  }
});

test('scenery follows real terrain, keeps access clear, and batches rather than making individual crop objects', () => {
  const scene = new THREE.Scene(), colliders = [];
  const { group, metrics } = createRegionalFarmlandScenery({ root: scene, groundHeight: groundWithRiver, colliders });
  assert.equal(metrics.farms, 15);
  assert.equal(metrics.seedStations, 15);
  assert.equal(metrics.gardenBeds, 47);
  assert.equal(metrics.lanes, 15);
  assert.ok(metrics.grainFields >= 5 && metrics.vegetableFields >= 4 && metrics.orchards >= 4 && metrics.meadows >= 10);
  assert.ok(metrics.cropTufts > 2000, 'the open fields have readable crops, not just brown ground patches');
  assert.equal(metrics.batches, 45, 'three merged scenery batches per farm');
  assert.ok(metrics.vertices < 675_000, 'bounded scenery complexity');
  const world = { colliders, heightAt: groundWithRiver, bounds: WORLD_BOUNDS };
  for (const farm of FARMSTEADS) {
    for (const row of farm.rows) assert.ok(canStand(row.x, row.z, world), `${row.id} remains reachable`);
    assert.ok(canStand(farm.seedStation.x, farm.seedStation.z + 1.2, world), `${farm.id} seed bench has a clear standing place`);
    assert.ok(canStand(farm.shed.x, farm.shed.z + 1, world), `${farm.id} tool shelter is open at the front`);
    for (const p of farm.approach) assert.ok(canStand(p.x, p.z, world), `${farm.id} footpath is not blocked by its props`);
  }
  group.traverse(object => {
    if (!object.isMesh) return;
    assert.ok(!object.material.map, 'no new external textures');
    const positions = object.geometry.attributes.position.array;
    assert.ok(positions.every(Number.isFinite), `${object.name} finite geometry`);
    if (object.name.endsWith('— ground')) {
      const normals = object.geometry.attributes.normal.array;
      for (let i = 1; i < normals.length; i += 3) assert.ok(normals[i] > .5, `${object.name} faces upward`);
      for (let i = 0; i < positions.length; i += 3) {
        const lift = positions[i + 1] - groundWithRiver(positions[i], positions[i + 2]);
        assert.ok(lift >= .03 && lift < .09, `${object.name} follows the terrain without floating`);
      }
    }
    object.geometry.dispose();
  });
});

test('all regional beds and seed stations are accessible in the combined world', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const world = createWorld(new THREE.Scene());
  assert.equal(world.farmlandMetrics.farms, 15);
  for (const row of REGIONAL_FARM_ROWS) assert.ok(canStand(row.x, row.z, world), `${row.id} blocked by combined-world scenery`);
  for (const station of REGIONAL_SEED_STATIONS) {
    assert.ok(canStand(station.x, station.z + 1.2, world), `${station.id} approach blocked by combined-world scenery`);
  }
});
