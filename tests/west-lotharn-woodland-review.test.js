import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { scopedWorld } from './scoped-world.js';
import { canStand } from '../src/gameplay/movement/game-state.js';
import { WEST_LOTHARN_WILDLIFE_ZONES } from '../src/content/regions/west-lotharn/west-lotharn-wildlife.js';
import { onBald, onRamp } from '../src/content/regions/west-lotharn/west-lotharn-world.js';
import { inWestWater } from '../src/content/regions/western-regions/west-regions.js';

const { createWestLife, LIFE_REACH } = await sourceModule('../src/content/regions/western-regions/west-regions-life.js');
const world = await scopedWorld(new THREE.Scene(), [27]);
const woods = WEST_LOTHARN_WILDLIFE_ZONES.filter(zone => zone.habitat === 'woodland');
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const center = zone => ({ x: (zone.minX + zone.maxX) / 2, z: (zone.minZ + zone.maxZ) / 2 });
function validFooting(animal, zone) {
  assert.equal(world.regionAt(animal.x, animal.z)?.name, zone.region, animal.id);
  assert.ok(canStand(animal.x, animal.z, world, zone.radius), `${animal.id}: unobstructed ground`);
  const y = world.heightAt(animal.x, animal.z), water = world.waterAt(animal.x, animal.z);
  assert.ok(water === null || water <= y, `${animal.id}: dry feet`);
  assert.equal(animal.groundY, y, `${animal.id}: grounded`);
  const r = Math.max(.4, zone.radius);
  const e = world.heightAt(animal.x + r, animal.z), w = world.heightAt(animal.x - r, animal.z);
  const n = world.heightAt(animal.x, animal.z - r), s = world.heightAt(animal.x, animal.z + r);
  assert.ok(Math.hypot((e - w) / (2 * r), (s - n) / (2 * r)) <= zone.maxSlope + 1e-6, `${animal.id}: traversable slope`);
  assert.ok(Math.max(...[e, w, n, s].map(h => Math.abs(h - y))) <= r * zone.maxSlope + 1e-6, `${animal.id}: broad footing`);
}

test('the original twenty-four West Lotharn animals retain their site order and identities', () => {
  const original = [
    ['long-valley-deer', [[-1717, -679], [-1767, -677], [-1827, -676], [-1790, -690]]],
    ['long-valley-boar', [[-2065, -556], [-1985, -592], [-2093, -540], [-2032, -570]]],
    ['north-valley-deer', [[-1882, -853], [-1872, -881], [-1893, -866]]],
    ['west-beck-fox', [[-2229, -447], [-2323, -405], [-2276, -426]]],
    ['notch-herons', [[-1606, -943], [-1611, -957]]],
    ['crest-hares', [[-1836, -797], [-1846, -791], [-1838, -785]]],
    ['cold-head-hares', [[-2400, -494], [-2384, -478], [-2364, -474]]],
    ['crest-vulture', [[-1842, -792]]], ['west-shoulder-hawk', [[-2130, -615]]],
  ];
  assert.deepEqual(WEST_LOTHARN_WILDLIFE_ZONES.slice(0, original.length).map(zone => [zone.id, zone.sites]), original);
  assert.equal(new Set(WEST_LOTHARN_WILDLIFE_ZONES.map(zone => zone.id)).size, WEST_LOTHARN_WILDLIFE_ZONES.length);
});

test('ten appended residents live among actual West Lotharn trees on dry, broad interior footing', t => {
  assert.equal(woods.length, 4);
  assert.equal(woods.reduce((n, zone) => n + zone.sites.length, 0), 10);
  const scene = new THREE.Scene(), life = createWestLife(scene, world, { zones: WEST_LOTHARN_WILDLIFE_ZONES });
  const trees = world.treeRegistry.trees.filter(tree => tree.id.startsWith('west-lotharn-'));
  const blockedSites = [], sparseSites = [];
  try {
    assert.equal(life.state().creatures.length, 34);
    for (const zone of woods) t.diagnostic(`${zone.id}: ${life.state().creatures.filter(a => a.id.startsWith(`${zone.id}-`))
      .map(a => `${a.x.toFixed(4)},${a.z.toFixed(4)}`).join('; ')}`);
    for (const zone of woods) {
      assert.ok(Math.hypot(zone.maxX - zone.minX, zone.maxZ - zone.minZ) / 2 < LIFE_REACH, zone.id);
      const animals = life.state().creatures.filter(animal => animal.id.startsWith(`${zone.id}-`));
      assert.equal(animals.length, zone.sites.length);
      for (let i = 0; i < animals.length; i++) {
        const animal = animals[i]; validFooting(animal, zone);
        if (!canStand(...zone.sites[i], world, zone.radius)) blockedSites.push(animal.id);
        assert.equal(onBald(animal.x, animal.z, 2), false, animal.id);
        assert.equal(onRamp(animal.x, animal.z, 2), false, animal.id);
        assert.equal(inWestWater(animal.x, animal.z, 3), false, animal.id);
        const nearby = trees.filter(tree => distance(tree, animal) < 28).length;
        if (nearby < 4) sparseSites.push(`${animal.id}: ${nearby} trees within 28m`);
      }
    }
    assert.deepEqual(blockedSites, [], 'authored sites themselves must be clear');
    assert.deepEqual(sparseSites, [], 'homes belong inside actual woods');
  } finally { life.dispose(); }
});

test('woodland residents flee and return through real tree gaps while preserving identity through culling', () => {
  for (const zone of woods) {
    const scene = new THREE.Scene(), life = createWestLife(scene, world, { zones: [zone] });
    try {
      const animals = life.state().creatures, original = [...animals], animal = animals[0], home = { x: animal.x, z: animal.z };
      life.update(.05, center(zone));
      assert.ok(scene.children.find(group => group.name === zone.id)?.visible, zone.id);
      let fled = false;
      for (let tick = 0; tick < 160; tick++) {
        life.update(.05, { x: animal.x + 2, z: animal.z + 2 });
        fled ||= animal.action === 'flee';
        for (const resident of animals) validFooting(resident, zone);
      }
      assert.ok(fled && distance(animal, home) > 2, `${zone.id}: visible flight through the woods`);
      const observer = { x: home.x + 65, z: home.z + 65 };
      let nearestReturn = Infinity;
      for (let tick = 0; tick < 1800; tick++) {
        life.update(.05, observer);
        nearestReturn = Math.min(nearestReturn, distance(animal, home));
        if (tick % 5 === 0) for (const resident of animals) validFooting(resident, zone);
      }
      // Residents resume grazing after settling; the last sample can therefore
      // be away from home again. Observe the completed return during the journey.
      assert.ok(nearestReturn < 6.05, `${zone.id}: returns to its own home (${nearestReturn.toFixed(1)}m)`);
      life.update(.1, { x: 10000, z: 10000 });
      assert.ok(life.state().groups.every(group => !group.visible));
      life.setObserver(home);
      for (let i = 0; i < animals.length; i++) assert.equal(life.state().creatures[i], original[i]);
    } finally { life.dispose(); }
  }
});
