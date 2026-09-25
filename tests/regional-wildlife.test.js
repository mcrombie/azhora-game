import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { REGIONAL_WILDLIFE_ZONES } from '../src/regional-wildlife.js';
import { canStand } from '../src/game-state.js';
import { REGION_ORDER, REGION_NAME_BY_ID } from '../src/region-world.js';

const { createWorld } = await sourceModule('../src/world.js');
const { createWestLife, LIFE_REACH, WEST_LIFE_ZONES } = await sourceModule('../src/west-regions-life.js');
const { ROAD_LIFE_ZONES } = await sourceModule('../src/road-life.js');
const world = createWorld(new THREE.Scene());
const centre = zone => ({ x: (zone.minX + zone.maxX) / 2, z: (zone.minZ + zone.maxZ) / 2 });

test('every loaded region has ambient wildlife, independent of hostile quest encounters', () => {
  const present = new Set([...WEST_LIFE_ZONES.map(zone => zone.region), ...ROAD_LIFE_ZONES.map(zone => REGION_NAME_BY_ID[zone.region])]);
  for (const region of REGION_ORDER) assert.ok(present.has(region), `${region} needs a living animal population`);
});

test('previously empty regions have distinct modest populations, including West Suval downs and coast', () => {
  const regions = [...new Set(REGIONAL_WILDLIFE_ZONES.map(zone => zone.region))];
  assert.deepEqual(regions, ['West Suval', 'Pueth', 'Peblos', 'West Izol', 'Elagos', 'Amod']);
  for (const region of regions) {
    const groups = REGIONAL_WILDLIFE_ZONES.filter(zone => zone.region === region);
    const population = groups.reduce((total, zone) => total + zone.sites.length, 0);
    assert.ok(population >= 8 && population <= 18, `${region} remains a modest animal population`);
    assert.ok(new Set(groups.map(zone => zone.species)).size >= 2);
  }
  const suval = REGIONAL_WILDLIFE_ZONES.filter(zone => zone.region === 'West Suval');
  assert.ok(suval.some(zone => zone.species === 'hill-sheep'));
  assert.ok(suval.some(zone => zone.species === 'gull'));
  for (const zone of REGIONAL_WILDLIFE_ZONES)
    assert.ok(Math.hypot(zone.maxX - zone.minX, zone.maxZ - zone.minZ) / 2 < LIFE_REACH, zone.id);
});

test('every new animal spawns visibly in its intended region and keeps valid animated geometry', () => {
  const scene = new THREE.Scene(), life = createWestLife(scene, world), matrix = new THREE.Matrix4();
  const byId = new Map(life.snapshot().groups.map(group => [group.id, group]));
  for (const zone of REGIONAL_WILDLIFE_ZONES) {
    assert.equal(byId.get(zone.id)?.count, zone.sites.length, `${zone.id}: all intended animals must spawn`);
    const initial = life.snapshot().creatures.filter(animal => animal.id.startsWith(`${zone.id}-`));
    for (const animal of initial) {
      assert.equal(world.regionAt(animal.x, animal.z)?.name, zone.region, animal.id);
      if (!zone.air) assert.ok(canStand(animal.x, animal.z, world, zone.radius), animal.id);
    }
    for (let tick = 0; tick < 40; tick++) life.update(.1, centre(zone));
    const group = scene.children.find(group => group.name === zone.id);
    assert.equal(group.visible, true);
    group.traverse(mesh => {
      if (!mesh.isInstancedMesh) return;
      for (let index = 0; index < mesh.count; index++) {
        mesh.getMatrixAt(index, matrix);
        assert.ok(matrix.elements.every(Number.isFinite), `${zone.id} finite pose`);
        assert.ok(matrix.determinant() > 0, `${zone.id} visible, non-mirrored body`);
      }
    });
  }
  life.dispose();
});

test('new flocks pause and cull, and livestock care calms cattle without taming wild deer', () => {
  const life = createWestLife(new THREE.Scene(), world);
  const cow = life.snapshot().creatures.find(animal => animal.id.startsWith('elagos-meadow-cattle'));
  assert.ok(cow);
  assert.equal(life.calm(cow.id, 10), true);
  life.update(.1, cow);
  const calm = life.snapshot().creatures.find(animal => animal.id === cow.id);
  assert.equal(calm.action, 'graze'); assert.ok(calm.calmFor > 9);
  assert.equal(life.calm('pueth-birch-deer-1', 10), false);
  const paused = life.snapshot(); life.update(.2, cow, false);
  assert.deepEqual(life.snapshot(), paused);
  life.update(.1, { x: 10000, z: 10000 });
  assert.ok(life.snapshot().groups.every(group => !group.visible));
  life.dispose();
});
