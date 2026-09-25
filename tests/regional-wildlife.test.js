import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { REGIONAL_WILDLIFE_ZONES, WEST_SUVAL_WILDLIFE_ZONES, SUVAL_WILDLIFE_EXCLUSIONS } from '../src/regional-wildlife.js';
import { canStand } from '../src/game-state.js';
import { REGION_ORDER, REGION_NAME_BY_ID, REGION_CELLS } from '../src/region-world.js';

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

const suvalCountry = animal => animal.id.startsWith('suval-country-');
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const outsideSolis = point => !SUVAL_WILDLIFE_EXCLUSIONS.some(area =>
  point.x >= area.minX && point.x <= area.maxX && point.z >= area.minZ && point.z <= area.maxZ);

test('West Suval countryside has ground wildlife throughout its usable hexes, not only two isolated flocks', () => {
  const life = createWestLife(new THREE.Scene(), world);
  try {
    const animals = life.state().creatures.filter(suvalCountry);
    assert.ok(animals.length > 0, 'the new countryside residents are connected to the live world');
    for (const cell of REGION_CELLS['West Suval']) {
      if (!outsideSolis(cell)) continue;
      const gap = Math.min(...animals.map(animal => distance(cell, animal)));
      assert.ok(gap <= 55, `${cell.q},${cell.r}: nearest ground animal is ${gap.toFixed(1)} m away`);
      for (const [dx, dz] of [[-35, 0], [35, 0], [0, -35], [0, 35]]) {
        const point = { x: cell.x + dx, z: cell.z + dz };
        if (!outsideSolis(point) || world.regionAt(point.x, point.z)?.name !== 'West Suval'
          || !canStand(point.x, point.z, world)) continue;
        const nearest = Math.min(...animals.map(animal => distance(point, animal)));
        assert.ok(nearest <= 80, `${cell.q},${cell.r} countryside edge: ${nearest.toFixed(1)} m without an animal`);
      }
    }
  } finally { life.dispose(); }
});

test('West Suval residents spawn on dry countryside clear of roads, Solis, and quest gathering places', () => {
  const life = createWestLife(new THREE.Scene(), world);
  try {
    const animals = life.state().creatures.filter(suvalCountry);
    assert.equal(new Set(animals.map(animal => animal.id)).size, animals.length);
    const gatheringPlaces = [...Object.values(world.npcPositions), ...Object.values(world.journeySites),
      ...Object.values(world.storySites), ...world.firePits, ...world.repairBenches]
      .filter(point => Number.isFinite(point?.x) && Number.isFinite(point?.z));
    for (const zone of WEST_SUVAL_WILDLIFE_ZONES) {
      const band = animals.filter(animal => animal.id.startsWith(`${zone.id}-`));
      assert.equal(band.length, zone.sites.length, `${zone.id}: scenery must not silently remove residents`);
      assert.ok(Math.hypot(zone.maxX - zone.minX, zone.maxZ - zone.minZ) / 2 < LIFE_REACH, zone.id);
      for (const animal of band) {
        assert.equal(world.regionAt(animal.x, animal.z)?.name, 'West Suval', animal.id);
        assert.ok(outsideSolis(animal), `${animal.id}: outside Solis and its wall approaches`);
        assert.ok(canStand(animal.x, animal.z, world, zone.radius), `${animal.id}: unobstructed dry footing`);
        assert.equal(animal.groundY, world.heightAt(animal.x, animal.z), `${animal.id}: on the terrain`);
        assert.ok(gatheringPlaces.every(point => distance(animal, point) >= 8), `${animal.id}: clear of quest gathering places`);
        for (const path of world.paths) for (let i = 1; i < path.length; i++) {
          const a = path[i - 1], b = path[i], dx = b.x - a.x, dz = b.z - a.z;
          const t = Math.max(0, Math.min(1, ((animal.x - a.x) * dx + (animal.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
          assert.ok(distance(animal, { x: a.x + dx * t, z: a.z + dz * t }) > (path.width ?? 2) / 2 + 3,
            `${animal.id}: home is beside the road rather than on it`);
        }
      }
    }
  } finally { life.dispose(); }
});

test('West Suval ground animals visibly animate and keep their identities and positions when observer culling changes', () => {
  const scene = new THREE.Scene(), life = createWestLife(scene, world), matrix = new THREE.Matrix4();
  try {
    const original = new Map(life.state().creatures.filter(suvalCountry).map(animal => [animal.id, animal]));
    for (const zone of WEST_SUVAL_WILDLIFE_ZONES) {
      life.update(.1, centre(zone));
      const group = scene.children.find(object => object.name === zone.id);
      assert.ok(group?.visible, `${zone.id}: approaching normally draws the group`);
      let rendered = 0;
      group.traverse(mesh => {
        if (!mesh.isInstancedMesh) return;
        for (let i = 0; i < mesh.count; i++) {
          mesh.getMatrixAt(i, matrix);
          assert.ok(matrix.elements.every(Number.isFinite), `${zone.id}: finite geometry`);
          assert.ok(matrix.determinant() > 0, `${zone.id}: visible body parts`);
          rendered++;
        }
      });
      assert.ok(rendered > 0, `${zone.id}: actual animals, not just distribution records`);
      const before = life.snapshot().creatures.filter(suvalCountry);
      life.setObserver({ x: 10000, z: 10000 });
      assert.equal(group.visible, false);
      life.setObserver(centre(zone));
      assert.equal(group.visible, true, `${zone.id}: returning the observer restores the same group`);
      assert.deepEqual(life.snapshot().creatures.filter(suvalCountry), before, 'observer movement cannot replace or move animals');
    }
    for (const animal of life.state().creatures.filter(suvalCountry)) assert.equal(animal, original.get(animal.id));
    const paused = life.snapshot();
    life.update(.25, centre(WEST_SUVAL_WILDLIFE_ZONES[0]), false);
    assert.deepEqual(life.snapshot(), paused, 'pausing freezes wildlife and its timers');
    life.update(.1, { x: 10000, z: 10000 });
    assert.ok(life.state().groups.filter(group => group.id.startsWith('suval-country-')).every(group => !group.visible));
  } finally { life.dispose(); }
});

test('West Suval residents flee and return without entering Solis, leaving the region, or respawning', () => {
  for (const species of ['hill-sheep', 'upland-hare', 'red-deer', 'boar']) {
    const zone = WEST_SUVAL_WILDLIFE_ZONES.find(candidate => candidate.species === species);
    const life = createWestLife(new THREE.Scene(), world, { zones: [zone] });
    try {
      const animal = life.state().creatures[0], home = { x: animal.x, z: animal.z };
      let fled = false;
      for (let tick = 0; tick < 200; tick++) {
        life.update(.05, { x: animal.x - 3, z: animal.z - 3 });
        fled ||= animal.action === 'flee';
        assert.ok(outsideSolis(animal), `${animal.id}: stays outside the city while fleeing`);
        assert.equal(world.regionAt(animal.x, animal.z)?.name, 'West Suval', animal.id);
        assert.ok(canStand(animal.x, animal.z, world, zone.radius), `${animal.id}: valid fleeing footing`);
      }
      assert.ok(fled && distance(animal, home) > 1, `${animal.id}: flees from a traveler`);
      for (let tick = 0; tick < 960; tick++) life.update(.25, { x: 10000, z: 10000 });
      const middle = centre(zone);
      const park = [[100, 0], [-100, 0], [0, 100], [0, -100]].map(([dx, dz]) => ({ x: middle.x + dx, z: middle.z + dz }))
        .sort((a, b) => distance(b, home) - distance(a, home))[0];
      life.update(.05, park);
      assert.equal(life.state().creatures[0], animal, 'the same resident returns after a long absence');
      assert.ok(distance(animal, home) < 20, `${animal.id}: returns to its home range`);
    } finally { life.dispose(); }
  }
});
