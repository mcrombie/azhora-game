import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import * as THREE from '../vendor/three.module.js';
import { canStand } from '../src/game-state.js';
import { PLAYABLE_REGIONS, REGION_BIOMES } from '../src/region-layout.js';
import { REGION_CELLS, REGION_IDS, REGION_TERRAIN, regionAt, regionNameAt, regions } from '../src/region-world.js';
import {
  VASTOS_RIVER, VASTOS_BECK, VASTOS_BRAID, VASTOS_PANS, VASTOS_BASINS, VASTOS_SINTER,
  WEST_POOLS, WEST_RIVERS, WEST_REGION_LANDMARKS, westBareGround, westRiverDistance, coursePosition,
} from '../src/west-regions.js';
import {
  WEST_PROFILES, poolSurface, westGroundAt, westNaturalGround, westWaterSurface, sinterRise,
} from '../src/west-ground.js';
import { groundWithRiver } from '../src/world-terrain.js';
import { SUBREGIONS } from '../src/map-fog.js';
import { regionBuildStatus } from '../src/build-status.js';

const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());
const cells = REGION_CELLS.Vastos;
/** Five points per hex: the middle and four offsets, which is enough to weigh a plain. */
const plainSamples = cells.flatMap(cell => [[0, 0], [30, 0], [-30, 0], [0, 30], [0, -30]]
  .map(([dx, dz]) => ({ x: cell.x + dx, z: cell.z + dz })));

test('Vastos is a registered region with its own biome, id and terrain profile', () => {
  assert.ok(PLAYABLE_REGIONS.includes('Vastos'));
  assert.equal(REGION_IDS.Vastos, 11, 'Amod took 10 first');
  assert.ok(regions.some(region => region.name === 'Vastos'));
  assert.equal(new Set(PLAYABLE_REGIONS.map(name => REGION_BIOMES[name].id)).size, PLAYABLE_REGIONS.length,
    'every region still has its own biome');
  assert.equal(REGION_BIOMES.Vastos.treesPerHex, 0, 'the lore leaves no sheltering terrain of any kind');
  assert.equal(REGION_BIOMES.Vastos.canopy, null);
  assert.equal(cells.length, 29, 'the atlas authors twenty-nine Vastos hexes');
});

test('The tableland stands above the lake country, and is flatter than anything but the Moros', () => {
  const vastos = REGION_TERRAIN.Vastos;
  assert.ok(vastos.base > REGION_TERRAIN.Elagos.base + 8,
    'vastos.md: the plain "sits above the surrounding terrain on both its eastern and western approaches"');
  assert.ok(vastos.amp < REGION_TERRAIN.Amod.amp / 2 && vastos.wave > REGION_TERRAIN.Amod.wave,
    'quieter relief over a longer wavelength than the foothills it borders');
  // The lore's "gradual climbs" from the lake country: the rise off the Elagos
  // border is a slope a laden animal walks up, not a step.
  const border = REGION_CELLS.Elagos.reduce((best, cell) => {
    const nearest = Math.min(...cells.map(other => Math.hypot(other.x - cell.x, other.z - cell.z)));
    return nearest < best.gap ? { cell, gap: nearest } : best;
  }, { gap: Infinity }).cell;
  const inward = cells.reduce((best, cell) =>
    Math.hypot(cell.x - border.x, cell.z - border.z) < Math.hypot(best.x - border.x, best.z - border.z) ? cell : best);
  const run = Math.hypot(inward.x - border.x, inward.z - border.z);
  const rise = world.heightAt(inward.x, inward.z) - world.heightAt(border.x, border.z);
  assert.ok(rise > 3, `the plain climbs out of the lake country (rise ${rise.toFixed(1)} m)`);
  assert.ok(rise / run < .2, `and climbs gradually (1 in ${(run / rise).toFixed(0)})`);
});

test('Every hex of the plain is honest ground a traveler can stand on', () => {
  const heights = [];
  for (const spot of plainSamples) {
    const y = world.heightAt(spot.x, spot.z);
    assert.ok(Number.isFinite(y), `NaN ground at ${spot.x}, ${spot.z}`);
    heights.push(y);
    if (westBareGround(spot.x, spot.z, 1)) continue;   // water and sinter are not walking ground
    assert.ok(canStand(spot.x, spot.z, world, .5), `blocked plain at ${spot.x}, ${spot.z}`);
  }
  assert.ok(Math.min(...heights) > 10, 'nothing on the plain sinks toward sea level');
  const sorted = [...heights].sort((a, b) => a - b);
  const median = sorted[sorted.length >> 1];
  assert.ok(median > 28 && median < 32, `the plain sits where its profile says (median ${median.toFixed(1)} m)`);
});

test('The region answers for itself, and its ground is the ground world-terrain builds', () => {
  const spawn = regions.find(region => region.name === 'Vastos').spawn;
  assert.equal(regionAt(spawn.x, spawn.z).name, 'Vastos');
  assert.ok(canStand(spawn.x, spawn.z, world, .5), 'the spawn point is standable');
  let worst = 0;
  for (const spot of plainSamples) worst = Math.max(worst, Math.abs(groundWithRiver(spot.x, spot.z) - westGroundAt(spot.x, spot.z)));
  assert.ok(worst < 1e-9, `west-ground.js and world-terrain.js disagree by ${worst}`);
});

test('Both watercourses fall from source to mouth and lie in their own channels', () => {
  const vastosWater = WEST_RIVERS.filter(course => course.id.startsWith('vastos-'));
  assert.equal(vastosWater.length, 2, 'the atlas draws Vastos a river and a beck');
  for (const course of vastosWater) {
    const profile = WEST_PROFILES.get(course.id);
    assert.ok(profile.length > 20, `${course.id} is sampled along its length`);
    for (let i = 1; i < profile.length; i++)
      assert.ok(profile[i].surface < profile[i - 1].surface, `${course.id} climbs at sample ${i}`);
    assert.ok(profile[0].surface - profile.at(-1).surface > 4, `${course.id} falls a real distance`);
    // Where there is water there is a channel under it.
    for (const sample of profile) {
      const surface = westWaterSurface(sample.x, sample.z);
      if (surface === null) continue;
      assert.ok(westGroundAt(sample.x, sample.z) <= surface + .01,
        `${course.id} floats above its bed at ${sample.x.toFixed(0)}, ${sample.z.toFixed(0)}`);
    }
  }
  // The beck gives its channel up rather than ending in a wall of bank.
  const end = WEST_PROFILES.get(VASTOS_BECK.id).at(-1);
  assert.equal(westWaterSurface(end.x, end.z), null, 'the snowmelt beck runs out into the grass');
});

test('The braided reach is three channels round bars of dry gravel', () => {
  const middle = VASTOS_RIVER.samples[Math.round(VASTOS_RIVER.samples.length * (VASTOS_BRAID.from + VASTOS_BRAID.to) / 2)];
  const at = offset => {
    const x = middle.x + middle.nx * offset, z = middle.z + middle.nz * offset;
    return { x, z, water: westWaterSurface(x, z), y: westGroundAt(x, z) };
  };
  const wet = [], dry = [];
  for (let offset = -30; offset <= 30; offset += .5) (at(offset).water === null ? dry : wet).push(offset);
  assert.ok(wet.length && dry.length, 'the reach has both water and bar');
  // Three runs of water with dry gravel between them.
  let runs = 0, inWater = false;
  for (let offset = -30; offset <= 30; offset += .5) {
    const water = at(offset).water !== null;
    if (water && !inWater) runs++;
    inWater = water;
  }
  assert.equal(runs, 3, 'the main channel and one thread either side');
  // A bar stands above the water on both sides of it.
  const bar = at(VASTOS_BRAID.offset / 2);
  assert.equal(bar.water, null);
  assert.ok(bar.y > at(0).water && bar.y > at(VASTOS_BRAID.offset).water, 'the gravel is above both channels');
  // And there is no braid outside the reach the lore puts it in.
  const head = VASTOS_RIVER.samples[2];
  assert.equal(westWaterSurface(head.x + head.nx * VASTOS_BRAID.offset, head.z + head.nz * VASTOS_BRAID.offset), null);
  assert.ok(coursePosition(VASTOS_RIVER, middle.x, middle.z) > VASTOS_BRAID.from);
});

test('Every pan and basin holds its water in a hollow, with the bank above it all the way round', () => {
  assert.equal(VASTOS_PANS.length, 5);
  assert.equal(VASTOS_BASINS.length, 2);
  for (const pool of WEST_POOLS) {
    const surface = poolSurface(pool);
    assert.ok(Number.isFinite(surface), `${pool.id} has a level`);
    const depth = surface - westGroundAt(pool.x, pool.z);
    assert.ok(Math.abs(depth - pool.depth) < .05, `${pool.id} is ${pool.depth} m deep, not ${depth.toFixed(2)}`);
    for (let i = 0; i < 24; i++) {
      const angle = i / 24 * Math.PI * 2;
      for (const distance of [pool.radius + 1, pool.radius + 2.5, pool.radius + 4]) {
        const y = westGroundAt(pool.x + Math.sin(angle) * distance, pool.z + Math.cos(angle) * distance);
        assert.ok(y >= surface - .02, `${pool.id} spills at bearing ${i}, ${distance.toFixed(1)} m out`);
      }
    }
  }
  // A pan is a dish a herd stands in; a basin is water and is blocked.
  const pan = VASTOS_PANS[2];
  assert.ok(canStand(pan.x, pan.z, world, .4), 'the watering pans are wadeable');
  for (const basin of VASTOS_BASINS) assert.equal(canStand(basin.x, basin.z, world, .4), false, `${basin.id} is water`);
  assert.equal(canStand(VASTOS_SINTER.pool.x, VASTOS_SINTER.pool.z, world, .4), false, 'the warm pool is not paddling');
});

test('The sulfur ground stands proud of the turf and stops in a line', () => {
  assert.ok(sinterRise(VASTOS_SINTER.x, VASTOS_SINTER.z) > 1, 'sinter is deposited, so it builds');
  assert.ok(sinterRise(VASTOS_SINTER.x + VASTOS_SINTER.radius + 2, VASTOS_SINTER.z) === 0, 'and it ends');
  assert.ok(westGroundAt(VASTOS_SINTER.x, VASTOS_SINTER.z) > westNaturalGround(VASTOS_SINTER.x, VASTOS_SINTER.z) + 1);
  assert.equal(VASTOS_SINTER.vents.length, 3);
  for (const vent of VASTOS_SINTER.vents)
    assert.ok(Math.hypot(vent.x - VASTOS_SINTER.x, vent.z - VASTOS_SINTER.z) < VASTOS_SINTER.radius, 'the vents are on the apron');
  assert.ok(westBareGround(VASTOS_SINTER.x, VASTOS_SINTER.z), 'nothing grows on the crust');
  assert.ok(!westBareGround(VASTOS_SINTER.x + VASTOS_SINTER.radius + 20, VASTOS_SINTER.z), 'and the grass starts again outside it');
});

test('Vastos is charted, listed and named, and nobody lives there', () => {
  const vastos = regions.find(region => region.name === 'Vastos');
  assert.deepEqual([...vastos.npcIds], [], 'terrain and wildlife only');
  for (const id of vastos.landmarks)
    assert.ok(world.landmarks.some(landmark => landmark.id === id), `the chart knows ${id}`);
  for (const landmark of WEST_REGION_LANDMARKS.filter(item => item.id.startsWith('vastos-'))) {
    assert.equal(regionNameAt(landmark.x, landmark.z), 'Vastos', `${landmark.id} stands in Vastos`);
    assert.ok(landmark.description.length > 60, `${landmark.id} says what it is`);
  }
  assert.ok(SUBREGIONS.filter(area => area.region === 'Vastos').length >= 4, 'the plain charts in named pieces');
  assert.equal(regionBuildStatus('Vastos').playable, true);
});

test('The plain grows grass and nothing else, and its water is left out of the scatter', () => {
  const trees = world.colliders.filter(collider => collider.kind === 'region-tree'
    && regionNameAt(collider.x, collider.z) === 'Vastos');
  assert.equal(trees.length, 0, 'no tree stands on the Vastos plain');
  const thorn = world.colliders.filter(collider => collider.kind === 'vastos-thorn');
  assert.ok(thorn.length > 4, 'the thorn in the lee of the river banks is the only woody thing here');
  for (const bush of thorn) {
    assert.equal(regionNameAt(bush.x, bush.z), 'Vastos');
    assert.ok(westRiverDistance(bush.x, bush.z, 60) < 30, 'and it only grows where a bank shelters it');
  }
  assert.ok(world.colliders.some(collider => collider.kind === 'vastos-erratic'), 'the plain carries erratics');
});
