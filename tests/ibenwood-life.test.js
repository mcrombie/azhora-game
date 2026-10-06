import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { REGION_CELLS, hexOwnerAt } from '../src/world/terrain/region-world.js';
import { IBENWOOD_NAMES, IBENWOOD_GROVES, IBENWOOD_PILOT } from '../src/content/regions/ibenwood/ibenwood-environment.js';
import { IBENWOOD_LIFE_ZONES } from '../src/content/regions/ibenwood/ibenwood-life.js';

const { createWestLife, LIFE_REACH } = await sourceModule('../src/content/regions/western-regions/west-regions-life.js');
const ground = IBENWOOD_LIFE_ZONES.filter(zone => !zone.air);
const centre = zone => ({ x: (zone.minX + zone.maxX) / 2, z: (zone.minZ + zone.maxZ) / 2 });
const settled = [IBENWOOD_PILOT, ...IBENWOOD_GROVES];
const outsideHomes = (x, z) => settled.every(place => Math.abs(x - place.x) > place.radius + 10 || Math.abs(z - place.z) > place.radius + 10);

test('natural ground wildlife reaches all five Ibenwood regions without dense herd clusters', () => {
  assert.equal(IBENWOOD_NAMES.length, 5);
  for (const region of IBENWOOD_NAMES) {
    const cells = REGION_CELLS[region], zones = ground.filter(zone => zone.region === region);
    assert.ok(cells?.length > 0, `${region}: registered atlas cells`);
    assert.ok(zones.length > 0, `${region}: resident ground wildlife`);
    assert.deepEqual(new Set(zones.map(zone => zone.species)), new Set(['red-deer', 'boar', 'upland-hare']), `${region}: natural variety`);
    const sites = zones.flatMap(zone => zone.sites);
    for (const cell of cells) {
      if (!outsideHomes(cell.x, cell.z)) continue;
      const nearest = Math.min(...sites.map(([x, z]) => Math.hypot(x - cell.x, z - cell.z)));
      assert.ok(nearest < 95, `${region} ${cell.q},${cell.r}: ${nearest.toFixed(1)} m to resident fauna`);
      const active = ground.filter(zone => Math.hypot(centre(zone).x - cell.x, centre(zone).z - cell.z) <= LIFE_REACH)
        .reduce((sum, zone) => sum + zone.sites.length, 0);
      assert.ok(active <= 22, `${region} ${cell.q},${cell.r}: ${active} nearby animals, not a swarm`);
    }
  }
});

test('Ibenwood habitats use real body radii, stable atlas identities, and bounded roaming ranges', async () => {
  const second = await import(`../src/content/regions/ibenwood/ibenwood-life.js?determinism=1`);
  assert.deepEqual(second.IBENWOOD_LIFE_ZONES, IBENWOOD_LIFE_ZONES);
  assert.equal(new Set(IBENWOOD_LIFE_ZONES.map(zone => zone.id)).size, IBENWOOD_LIFE_ZONES.length);
  for (const zone of IBENWOOD_LIFE_ZONES) {
    assert.ok(Object.isFrozen(zone) && Object.isFrozen(zone.sites));
    assert.ok(zone.sites.length >= 1 && zone.sites.length <= 2);
    assert.ok(Math.hypot(zone.maxX - zone.minX, zone.maxZ - zone.minZ) / 2 < LIFE_REACH, zone.id);
    if (!zone.air) assert.equal(zone.radius, { 'red-deer': .55, boar: .7, 'upland-hare': .3 }[zone.species], zone.id);
    for (const [x, z] of zone.sites) {
      assert.equal(hexOwnerAt(x, z), zone.region, `${zone.id}: home belongs to its atlas region`);
      assert.ok(x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ);
    }
  }
});

test('regional populations exclude settled groves and preserve the pilot population', () => {
  for (const zone of ground) {
    for (const [x, z] of zone.sites) assert.ok(outsideHomes(x, z), `${zone.id}: home avoids buildings and pilot`);
    for (const place of settled) {
      assert.ok(zone.exclusions.some(a => a.minX <= place.x - place.radius && a.maxX >= place.x + place.radius
        && a.minZ <= place.z - place.radius && a.maxZ >= place.z + place.radius), `${zone.id}: roaming also excludes ${place.id ?? 'pilot'}`);
    }
  }
  const birds = IBENWOOD_LIFE_ZONES.filter(zone => zone.air);
  assert.ok(birds.length > 0 && birds.length <= 3, 'only a few solitary hawks');
  for (const zone of birds) {
    assert.equal(zone.species, 'plateau-hawk');
    assert.equal(zone.sites.length, 1);
    const [[x, z]] = zone.sites;
    assert.ok(settled.every(place => Math.hypot(x - place.x, z - place.z) - zone.circle > place.radius));
  }
  assert.ok(IBENWOOD_LIFE_ZONES.every(zone => !zone.float && !zone.sea && zone.species !== 'otter'), 'no unsupported water habitats');
});

test('existing wildlife controller retains Ibenwood residents while culling and pausing distant habitats', () => {
  const scene = new THREE.Scene();
  // The regional scenery owns final terrain clearance. This stand-in checks the
  // zone/controller contract independently of the concurrent environment build.
  const world = { bounds: { minX: -10000, maxX: 10000, minZ: -10000, maxZ: 10000 },
    heightAt: () => 22, waterAt: () => null, colliders: [], paths: [],
    regionAt: (x, z) => ({ name: hexOwnerAt(x, z) }) };
  const life = createWestLife(scene, world, { zones: IBENWOOD_LIFE_ZONES });
  try {
    const original = life.state().creatures;
    assert.equal(original.length, IBENWOOD_LIFE_ZONES.reduce((sum, zone) => sum + zone.sites.length, 0));
    for (const region of IBENWOOD_NAMES) {
      const zone = ground.find(candidate => candidate.region === region);
      life.update(.1, centre(zone));
      assert.ok(life.state().groups.find(group => group.id === zone.id)?.visible, `${region}: approachable existing rig`);
    }
    life.update(.1, { x: 9000, z: 9000 });
    assert.ok(life.state().groups.every(group => !group.visible));
    assert.equal(life.state().creatures, original, 'distance culling does not respawn animals');
    const paused = life.snapshot();
    life.update(.25, centre(ground[0]), false);
    assert.deepEqual(life.snapshot(), paused);
    for (const animal of original.filter(animal => animal.species !== 'plateau-hawk')) {
      assert.ok(outsideHomes(animal.x, animal.z), `${animal.id}: remains outside settled areas`);
      assert.equal(hexOwnerAt(animal.x, animal.z), animal.region);
    }
  } finally { life.dispose(); }
});
