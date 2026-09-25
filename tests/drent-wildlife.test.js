import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { REGION_CELLS } from '../src/region-world.js';
import { canStand } from '../src/game-state.js';
import { DRENT_WILDLIFE_ZONES } from '../src/drent-wildlife.js';

const { createWorld } = await sourceModule('../src/world.js');
const { createWestLife, LIFE_REACH } = await sourceModule('../src/west-regions-life.js');
const world = createWorld(new THREE.Scene());
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const center = zone => ({ x: (zone.minX + zone.maxX) / 2, z: (zone.minZ + zone.maxZ) / 2 });
const zoneIds = new Set(DRENT_WILDLIFE_ZONES.map(zone => zone.id));
const belongs = animal => DRENT_WILDLIFE_ZONES.some(zone => animal.id.startsWith(`${zone.id}-`));

test('wildlife reaches the whole Drent woodland rather than only the village and farms', () => {
  const life = createWestLife(new THREE.Scene(), world);
  try {
    const animals = life.state().creatures.filter(belongs);
    assert.ok(animals.length > 0, 'the Drent wildlife is connected to the live world');
    for (const cell of REGION_CELLS.Drent) {
      const nearest = Math.min(...animals.map(animal => distance(cell, animal)));
      // Before this fix, 25 of the 39 survey cells had no ground animal within
      // 100 m, and the western woods were 384 m from the nearest one.
      assert.ok(nearest <= 55, `${cell.q},${cell.r}: nearest woodland animal is ${nearest.toFixed(1)} m away`);
      for (const [dx, dz] of [[-35, 0], [35, 0], [0, -35], [0, 35]]) {
        const point = { x: cell.x + dx, z: cell.z + dz };
        if (world.regionAt(point.x, point.z)?.name !== 'Drent' || !canStand(point.x, point.z, world)) continue;
        const gap = Math.min(...animals.map(animal => distance(point, animal)));
        assert.ok(gap <= 80, `${cell.q},${cell.r} woodland edge: ${gap.toFixed(1)} m without an animal`);
      }
    }
  } finally { life.dispose(); }
});

test('every woodland population has safe footing and remains in Drent', () => {
  const life = createWestLife(new THREE.Scene(), world);
  try {
    const animals = life.state().creatures.filter(belongs);
    assert.equal(new Set(animals.map(animal => animal.id)).size, animals.length, 'wildlife identities are unique');
    for (const zone of DRENT_WILDLIFE_ZONES) {
      const band = animals.filter(animal => animal.id.startsWith(`${zone.id}-`));
      assert.equal(band.length, zone.sites.length, `${zone.id}: scenery must not prevent the population from spawning`);
      assert.ok(Math.hypot(zone.maxX - zone.minX, zone.maxZ - zone.minZ) / 2 < LIFE_REACH,
        `${zone.id}: an animal cannot flee outside its simulation's activation distance`);
      for (const animal of band) {
        assert.equal(world.regionAt(animal.x, animal.z)?.name, 'Drent', animal.id);
        assert.ok(canStand(animal.x, animal.z, world, zone.radius), `${animal.id}: unobstructed dry footing`);
        assert.equal(animal.groundY, world.heightAt(animal.x, animal.z), `${animal.id}: grounded on the terrain`);
      }
    }
  } finally { life.dispose(); }
});

test('approaching woodland populations draws their complete rigs and leaving culls them', () => {
  const scene = new THREE.Scene(), life = createWestLife(scene, world), matrix = new THREE.Matrix4();
  try {
    for (const zone of DRENT_WILDLIFE_ZONES) {
      life.update(.1, center(zone));
      const group = scene.children.find(object => object.name === zone.id);
      assert.ok(group?.visible, `${zone.id}: visible when approached`);
      let rendered = 0;
      group.traverse(mesh => {
        if (!mesh.isInstancedMesh) return;
        for (let index = 0; index < mesh.count; index++) {
          mesh.getMatrixAt(index, matrix);
          assert.ok(matrix.elements.every(Number.isFinite), `${zone.id}: finite animated geometry`);
          assert.ok(matrix.determinant() > 0, `${zone.id}: visible non-mirrored geometry`);
          rendered++;
        }
      });
      assert.ok(rendered > 0, `${zone.id}: actual animals are rendered`);
    }
    life.update(.1, { x: 10000, z: 10000 });
    assert.ok(life.state().groups.filter(group => zoneIds.has(group.id)).every(group => !group.visible));
  } finally { life.dispose(); }
});

test('woodland animals flee, settle after a visit, and keep their identities through culling and pause', () => {
  const life = createWestLife(new THREE.Scene(), world);
  try {
    const population = life.state().creatures.filter(belongs);
    const original = new Map(population.map(animal => [animal.id, animal]));
    const homes = new Map(population.map(animal => [animal.id, { x: animal.x, z: animal.z }]));
    const species = [...new Set(population.map(animal => animal.species))];
    for (const kind of species) {
      const animal = population.find(candidate => candidate.species === kind), home = homes.get(animal.id);
      let fled = false;
      for (let tick = 0; tick < 200; tick++) {
        life.update(.05, { x: animal.x - 3, z: animal.z - 3 });
        fled ||= animal.action === 'flee';
      }
      assert.ok(fled, `${animal.id}: reacts to an approaching traveler`);
      assert.ok(distance(animal, home) > 1, `${animal.id}: flees instead of standing still`);
      for (let tick = 0; tick < 960; tick++) life.update(.25, { x: 10000, z: 10000 });
      const zone = DRENT_WILDLIFE_ZONES.find(candidate => animal.id.startsWith(`${candidate.id}-`));
      const middle = center(zone);
      const park = [[100, 0], [-100, 0], [0, 100], [0, -100]]
        .map(([dx, dz]) => ({ x: middle.x + dx, z: middle.z + dz }))
        .sort((a, b) => distance(b, home) - distance(a, home))[0];
      life.update(.05, park);
      assert.ok(distance(animal, home) < 20, `${animal.id}: returns to its home ground while left alone`);
      assert.equal(world.regionAt(animal.x, animal.z)?.name, 'Drent', animal.id);
      assert.ok(canStand(animal.x, animal.z, world, zone.radius), `${animal.id}: retains valid footing`);
    }
    for (const animal of life.state().creatures.filter(belongs)) assert.equal(animal, original.get(animal.id));
    const paused = life.snapshot();
    life.update(.25, homes.values().next().value, false);
    assert.deepEqual(life.snapshot(), paused, 'menus pause wildlife and its timers');
  } finally { life.dispose(); }
});
