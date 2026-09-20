import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import * as THREE from '../vendor/three.module.js';
import { canStand } from '../src/game-state.js';
import { PLAYABLE_REGIONS, REGION_BIOMES } from '../src/region-layout.js';
import { REGION_CELLS, REGION_IDS, REGION_TERRAIN, regionNameAt, regions } from '../src/region-world.js';
import {
  LIZEEM, ELA_SOUTH_REACH, NESDOR_BECK, WEST_BRAIDS, WEST_REGION_LANDMARKS,
  courseDistance, westBareGround,
} from '../src/west-regions.js';
import { WEST_PROFILES, westGroundAt, westWaterSurface, braidThreadOffset } from '../src/west-ground.js';
import { ELAGOS_REACHES, inElagosWater } from '../src/elagos-world.js';
import { groundWithRiver } from '../src/world-terrain.js';
import { SUBREGIONS } from '../src/map-fog.js';
import { regionBuildStatus } from '../src/build-status.js';

const { createWorld } = await sourceModule('../src/world.js');
const { WEST_LIFE_ZONES, createWestLife } = await sourceModule('../src/west-regions-life.js');
const scene = new THREE.Scene();
const world = createWorld(scene);
const cells = REGION_CELLS.Nesdor;
const flats = cells.filter(cell => cell.terrain === 'plains');
const head = cells.filter(cell => cell.terrain !== 'plains');
const samples = cells.flatMap(cell => [[0, 0], [30, 0], [-30, 0], [0, 30], [0, -30]]
  .map(([dx, dz]) => ({ x: cell.x + dx, z: cell.z + dz })));

test('Nesdor is a registered region, and the atlas already divides it in two', () => {
  assert.ok(PLAYABLE_REGIONS.includes('Nesdor'));
  assert.equal(REGION_IDS.Nesdor, 14, 'Caricas took 13 first');
  assert.equal(cells.length, 30, 'the atlas authors thirty Nesdor hexes');
  assert.equal(new Set(PLAYABLE_REGIONS.map(name => REGION_BIOMES[name].id)).size, PLAYABLE_REGIONS.length);
  assert.equal(flats.length, 27, 'twenty-seven plains hexes: the Flats');
  assert.equal(head.length, 3, 'and three of grassland and forest: the valley head');
  assert.ok(REGION_TERRAIN.Nesdor.byTerrain.plains, 'the Flats have a profile of their own');
});

test('The Flats are the flattest ground in the world outside the Moros, and fall to it', () => {
  const plains = REGION_TERRAIN.Nesdor.byTerrain.plains;
  assert.ok(plains.amp < REGION_TERRAIN['Moros Plain'].amp,
    'nesdor.md: "the terrain relief is measured in feet rather than hundreds of feet"');
  assert.ok(plains.base < REGION_TERRAIN.Nesdor.base, 'and the Flats lie below the valley head');
  // Measured on the ground rather than in the table: the head is real country and
  // the Flats are not, and nobody has drawn a line between them.
  const swing = list => {
    const heights = list.flatMap(cell => [[0, 0], [34, 34], [-34, -34], [34, -34], [-34, 34]]
      .map(([dx, dz]) => westGroundAt(cell.x + dx, cell.z + dz))
      .filter((_, i, all) => all.length));
    return { mean: heights.reduce((a, b) => a + b, 0) / heights.length, heights };
  };
  const dry = list => list.filter(cell => courseDistance(LIZEEM, cell.x, cell.z, 90) > 80);
  const onFlats = swing(dry(flats)), onHead = swing(head);
  assert.ok(onHead.mean > onFlats.mean + 3, `the head stands above the Flats (${onHead.mean.toFixed(1)} against ${onFlats.mean.toFixed(1)})`);
  // And the Flats run into the Moros without a step.
  const east = cells.reduce((best, cell) => cell.x > best.x ? cell : best);
  const moros = REGION_CELLS['Moros Plain'].reduce((best, cell) =>
    Math.hypot(cell.x - east.x, cell.z - east.z) < Math.hypot(best.x - east.x, best.z - east.z) ? cell : best);
  assert.ok(Math.abs(world.heightAt(east.x, east.z) - world.heightAt(moros.x, moros.z)) < 4,
    'there is no line at which the Flats stop and the plain starts');
});

test('The Ela-south is handed over rather than left to stop in the middle of a country', () => {
  const ela = ELAGOS_REACHES.find(reach => reach.id === 'ela-south');
  const end = ela.points.at(-1);
  assert.equal(regionNameAt(end.x, end.z), 'Nesdor', 'the lake country’s drainage ends inside Nesdor');
  const head = ELA_SOUTH_REACH.points[0];
  assert.ok(Math.hypot(head.x - end.x, head.z - end.z) < 1, 'and the reach starts exactly where it ends');
  const profile = WEST_PROFILES.get(ELA_SOUTH_REACH.id);
  assert.ok(profile[0].surface <= end.surface, 'the water does not step up at the handover');
  for (let i = 1; i < profile.length; i++)
    assert.ok(profile[i].surface < profile[i - 1].surface, `the reach climbs at sample ${i}`);
  // And it gets where it is going.
  const mouth = profile.at(-1);
  assert.ok(courseDistance(LIZEEM, mouth.x, mouth.z, 60) < 20, 'the reach reaches the Lizeem');
});

test('Both watercourses braid where the gradient dies, and hold water the whole way', () => {
  const braids = WEST_BRAIDS.filter(braid => braid.id !== 'vastos');
  assert.equal(braids.length, 2, 'the reach and the beck');
  for (const braid of braids) {
    const profile = WEST_PROFILES.get(braid.course.id);
    const middle = profile[Math.round(profile.length * (braid.from + braid.to) / 2)];
    assert.ok(braidThreadOffset(braid, middle.along) > braid.offset * .9, 'the threads are widest in the middle');
    assert.equal(braidThreadOffset(braid, 0), null, 'and there is no braid at the head');
    // Three channels across the braided reach, with dry bar between them.
    let runs = 0, wet = false;
    for (let offset = -braid.offset - 12; offset <= braid.offset + 12; offset += .5) {
      const x = middle.x + middle.nx * offset, z = middle.z + middle.nz * offset;
      const water = westWaterSurface(x, z) !== null;
      if (water && !wet) runs++;
      wet = water;
    }
    assert.equal(runs, 3, `${braid.id} runs as three channels`);
    // Every metre of water sits in a hollow.
    for (const sample of profile) {
      const surface = westWaterSurface(sample.x, sample.z);
      if (surface === null) continue;
      assert.ok(westGroundAt(sample.x, sample.z) <= surface + .01, `${braid.id} floats at ${sample.x.toFixed(0)}`);
    }
  }
});

test('Every hex of the Flats is honest ground', () => {
  let worst = 0;
  for (const spot of samples) {
    const y = world.heightAt(spot.x, spot.z);
    assert.ok(Number.isFinite(y), `NaN ground at ${spot.x}, ${spot.z}`);
    // The Ela-south itself crosses the head of the Flats before this region's own
    // reach takes it over. It is Elagos's water, deep, and cut by Elagos's own
    // ground function, so it is neither walking ground nor west-ground.js's business.
    if (westBareGround(spot.x, spot.z, 4) || inElagosWater(spot.x, spot.z, 14)) continue;
    worst = Math.max(worst, Math.abs(groundWithRiver(spot.x, spot.z) - westGroundAt(spot.x, spot.z)));
    const standable = canStand(spot.x, spot.z, world, .5)
      || [0, 1, 2, 3, 4, 5, 6, 7].some(i => canStand(spot.x + Math.sin(i / 8 * Math.PI * 2) * 3.4, spot.z + Math.cos(i / 8 * Math.PI * 2) * 3.4, world, .5));
    assert.ok(standable, `penned in at ${spot.x}, ${spot.z}`);
  }
  assert.ok(worst < 1e-9, `west-ground.js and world-terrain.js disagree by ${worst}`);
  const spawn = regions.find(region => region.name === 'Nesdor').spawn;
  assert.equal(regionNameAt(spawn.x, spawn.z), 'Nesdor');
  assert.ok(canStand(spawn.x, spawn.z, world, .5));
});

test('Nothing grows on the Flats; the hazel and oak are all on the valley head', () => {
  const trees = world.colliders.filter(collider => collider.kind === 'nesdor-tree');
  assert.ok(trees.length > 40, 'the valley head is wooded');
  const nearestCell = tree => cells.reduce((best, cell) =>
    Math.hypot(cell.x - tree.x, cell.z - tree.z) < Math.hypot(best.x - tree.x, best.z - tree.z) ? cell : best);
  assert.equal(trees.filter(tree => nearestCell(tree).terrain === 'plains').length, 0,
    'not one tree stands on a plains hex');
  for (const tree of trees) assert.equal(regionNameAt(tree.x, tree.z), 'Nesdor');
});

test('The cattle of the Flats are the Vastos longhorn drawn smaller, as the lore says', () => {
  const nesdor = WEST_LIFE_ZONES.filter(zone => zone.region === 'Nesdor');
  const vastos = WEST_LIFE_ZONES.filter(zone => zone.region === 'Vastos' && zone.species === 'longhorn');
  const cattle = nesdor.filter(zone => zone.species === 'longhorn');
  assert.ok(cattle.length >= 2 && vastos.length >= 2);
  for (const zone of cattle) assert.ok(zone.scale < vastos[0].scale * .85,
    'nesdor.md: "not the cultural center that the Vastos longhorn is in Vastos"');
  assert.ok(nesdor.some(zone => zone.species === 'hill-sheep'), 'sheep on the margins');
  assert.ok(nesdor.some(zone => zone.species === 'wading-bird'), 'waders on the braided water');
  const life = createWestLife(scene, world);
  const here = life.snapshot().creatures.filter(animal => animal.region === 'Nesdor');
  assert.equal(here.length, nesdor.reduce((sum, zone) => sum + zone.sites.length, 0), 'every one of them found footing');
  for (const animal of here) assert.equal(regionNameAt(animal.x, animal.z), 'Nesdor', `${animal.id} strayed`);
  // Thirty seconds of them moving about: nobody leaves its range or its ground.
  const player = { x: -1500, y: 0, z: 640 };
  for (let step = 0; step < 900; step++) life.update(1 / 30, player, true);
  for (const animal of life.snapshot().creatures) {
    const zone = WEST_LIFE_ZONES.find(item => animal.id.startsWith(item.id));
    assert.ok(Number.isFinite(animal.x + animal.y + animal.z), `${animal.id} went to NaN`);
    assert.ok(animal.x >= zone.minX - .5 && animal.x <= zone.maxX + .5
      && animal.z >= zone.minZ - .5 && animal.z <= zone.maxZ + .5, `${animal.id} left its range`);
    if (!zone.air) assert.ok(Math.abs(animal.groundY - world.heightAt(animal.x, animal.z)) < .05, `${animal.id} floats`);
  }
  life.dispose();
});

test('Nesdor is charted and listed, and nobody lives there', () => {
  const nesdor = regions.find(region => region.name === 'Nesdor');
  assert.deepEqual([...nesdor.npcIds], [], 'terrain and wildlife only');
  for (const id of nesdor.landmarks)
    assert.ok(world.landmarks.some(landmark => landmark.id === id), `the chart knows ${id}`);
  for (const landmark of WEST_REGION_LANDMARKS.filter(item => nesdor.landmarks.includes(item.id)))
    assert.equal(regionNameAt(landmark.x, landmark.z), 'Nesdor', `${landmark.id} stands in Nesdor`);
  assert.ok(SUBREGIONS.filter(area => area.region === 'Nesdor').length >= 3);
  assert.equal(regionBuildStatus('Nesdor').playable, true);
  // Every western region is terrain and wildlife: not one of them places a person.
  for (const name of ['Vastos', 'Meneth', 'Caricas', 'Nesdor'])
    assert.deepEqual([...regions.find(region => region.name === name).npcIds], [], `${name} places nobody`);
  assert.equal(NESDOR_BECK.fordUntil, 1, 'the beck is shallow enough to walk through, like every beck out here');
});
