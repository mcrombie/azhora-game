import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { scopedWorld } from './scoped-world.js';
import { sourceModule } from './module-loader.js';
import { outerProfile, outerFeatures, OUTER_LAKES } from '../src/content/regions/outer-regions/outer-regions-world.js';
import { OUTER_WILDLIFE_ZONES } from '../src/content/regions/outer-regions/outer-regions-wildlife.js';
import { eshtorLandform } from '../src/content/regions/eshtor/eshtor-landform.js';
import { runOuterChecks } from '../src/dev/checks/outer-regions-checks.js';

const p = outerProfile('Eshtor Plateau');
test('Eshtor keeps a broad high table with low ribs, north-facing snow and southern lee hollows', () => {
  assert.equal(p.cells.length, 34);
  assert.ok(p.cells.every(c => c.terrain === 'hills'));
  const points = [];
  for (let x = -150; x <= 150; x += 10) for (let z = -150; z <= 150; z += 10)
    points.push(eshtorLandform(p.anchor.x + x, p.anchor.z + z, p.anchor));
  assert.ok(Math.max(...points.map(f => f.height)) - Math.min(...points.map(f => f.height)) < 30);
  assert.ok(points.every(f => f.height > 125));
  assert.ok(eshtorLandform(p.anchor.x, p.anchor.z - 19, p.anchor).snow > .8);
  assert.ok(eshtorLandform(p.anchor.x, p.anchor.z + 25, p.anchor).shelter > .8);
  assert.equal(OUTER_LAKES.filter(l => l.region === p.name).length, 1);
});

test('Eshtor builds grounded dwarf groves and usable wildlife through the production loader', async () => {
  const scene = new THREE.Scene(), world = await scopedWorld(scene, [p.id]);
  const checks = runOuterChecks(world, [p.name]);
  assert.equal(checks.journeys.length, 2);
  const scenery = world.outerRegions.find(r => r.name === p.name).scenery;
  assert.ok(scenery.metrics.trees >= 3);
  assert.ok(scenery.metrics.rocks > 50);
  assert.equal(scenery.metrics.reeds, 0, 'cold pans have low moss, not tall marsh reeds');
  for (const t of scenery.trees) {
    assert.ok(['silver-birch', 'common-juniper'].includes(t.species));
    assert.ok(t.height < 5);
    assert.ok(outerFeatures(t.x, t.z).shelter > .62);
    assert.ok(Math.abs(t.y - world.renderedGroundHeight(t.x, t.z)) < .01);
  }
  const zones = OUTER_WILDLIFE_ZONES.filter(z => z.region === p.name);
  assert.ok(zones.some(z => z.species === 'thalmagar-long-back'));
  assert.ok(zones.some(z => z.species === 'plateau-hawk'));
  for (const z of zones.filter(z => z.species === 'thalmagar-long-back')) {
    const [x, y] = z.sites[0]; assert.ok(outerFeatures(x, y).shelter > .58);
  }
  const { createWestLife } = await sourceModule('../src/content/regions/western-regions/west-regions-life.js');
  const life = createWestLife(scene, world, { zones });
  for (const z of zones) { const [x, y] = z.sites[0]; life.update(.1, { x, z: y }, true); }
  const animals = life.snapshot().creatures;
  assert.ok(animals.length > 15);
  assert.ok(animals.every(a => Number.isFinite(a.y)));
  console.log(JSON.stringify({ scenery: scenery.metrics, animals: animals.length, journeys: checks.journeys }));
});
