import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/gameplay/movement/game-state.js';
import { BALDRO_CELLS, BALDRO_PATHS, baldroCellAt, baldroSurfaceHeight, baldroPathDistance, baldroWaterAt } from '../src/content/regions/baldro/baldro-world.js';
import { BALDRO_WILDLIFE_ZONES as zones, BALDRO_HABITATS } from '../src/content/regions/baldro/baldro-wildlife.js';

const { createWestLife, LIFE_REACH } = await sourceModule('../src/content/regions/western-regions/west-regions-life.js');
const world = { bounds: { minX: -20000, maxX: 20000, minZ: -20000, maxZ: 20000 },
  heightAt: baldroSurfaceHeight, waterAt: baldroWaterAt, colliders: [],
  paths: BALDRO_PATHS.map(p => Object.assign([...p.points], { width: p.width })),
  regionAt: (x, z) => ({ name: baldroCellAt(x, z)?.regionName ?? null }) };
const centre = zone => ({ x: (zone.minX + zone.maxX) / 2, z: (zone.minZ + zone.maxZ) / 2 });

test('persistent ground wildlife inhabits both whole Baldro countries on suitable owned terrain', () => {
  assert.ok(zones.length >= BALDRO_CELLS.length - 4, 'only unusable steep cells may lack a ground home');
  assert.equal(new Set(zones.map(z => z.id)).size, zones.length);
  assert.deepEqual(new Set(zones.map(z => z.species)), new Set(['hill-sheep', 'red-deer', 'boar', 'upland-hare']));
  for (const region of ['West Baldro Mountains', 'East Baldro Mountains']) assert.ok(zones.filter(z => z.region === region).length > 25);
  for (const zone of zones) {
    assert.ok(Object.isFrozen(zone) && Object.isFrozen(zone.sites));
    assert.equal(zone.keepRegion, true); assert.equal(zone.habitat, 'mountain');
    assert.equal(zone.radius, BALDRO_HABITATS[zone.species].radius);
    assert.ok(!zone.air && !zone.float && zone.sites.length >= 1 && zone.sites.length <= 2);
    assert.ok(Math.hypot(zone.maxX - zone.minX, zone.maxZ - zone.minZ) / 2 < LIFE_REACH);
    if (zone.species === 'hill-sheep') assert.equal(zone.region, 'West Baldro Mountains');
    if (zone.species === 'boar') assert.equal(zone.region, 'East Baldro Mountains');
    for (const [x, z] of zone.sites) {
      const owner = baldroCellAt(x, z), h = baldroSurfaceHeight(x, z);
      assert.deepEqual([owner.q, owner.r], zone.sourceCell); assert.equal(owner.regionName, zone.region);
      assert.ok(h >= zone.minHeight && h <= zone.maxHeight); assert.equal(baldroWaterAt(x, z), null);
      assert.ok(canStand(x, z, world, zone.radius)); assert.ok(baldroPathDistance(x, z) >= 10);
      assert.equal(zone.exclusions.some(b => x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ), false);
    }
  }
});

test('Baldro residents retain their homes while culled, animate on the ground and pause cleanly', () => {
  const life = createWestLife(new THREE.Scene(), world, { zones });
  try {
    const animals = life.state().creatures;
    assert.equal(animals.length, zones.reduce((n, z) => n + z.sites.length, 0), 'all authored homes instantiate');
    for (const zone of zones) {
      life.update(.05, centre(zone));
      for (const animal of animals.filter(a => a.id.startsWith(`${zone.id}-`))) {
        assert.equal(world.regionAt(animal.x, animal.z).name, zone.region);
        assert.ok(Math.abs(animal.groundY - world.heightAt(animal.x, animal.z)) < .001);
        assert.ok(canStand(animal.x, animal.z, world, zone.radius));
      }
    }
    const before = life.snapshot(); life.update(.25, centre(zones[0]), false); assert.deepEqual(life.snapshot(), before);
    life.update(.25, { x: -19000, z: 19000 });
    assert.ok(life.state().groups.every(g => !g.visible)); assert.equal(life.state().creatures, animals);
  } finally { life.dispose(); }
});
