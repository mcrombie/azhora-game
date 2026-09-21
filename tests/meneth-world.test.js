import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import * as THREE from '../vendor/three.module.js';
import { canStand } from '../src/game-state.js';
import { PLAYABLE_REGIONS, REGION_BIOMES } from '../src/region-layout.js';
import { REGION_CELLS, REGION_IDS, REGION_TERRAIN, hexOwnerAt, regions } from '../src/region-world.js';
import { MENETH_RIDGES, MENETH_BECKS, menethTroughZ, WEST_REGION_LANDMARKS, westBareGround } from '../src/west-regions.js';
import { WEST_PROFILES, menethRidge, menethBand, westGroundAt, westWaterSurface } from '../src/west-ground.js';
import { groundWithRiver } from '../src/world-terrain.js';
import { SUBREGIONS } from '../src/map-fog.js';
import { regionBuildStatus } from '../src/build-status.js';

const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());
const cells = REGION_CELLS.Meneth;
const samples = cells.flatMap(cell => [[0, 0], [30, 0], [-30, 0], [0, 30], [0, -30]]
  .map(([dx, dz]) => ({ x: cell.x + dx, z: cell.z + dz })));

test('Meneth is a registered upland region that scatters its own slopes', () => {
  assert.ok(PLAYABLE_REGIONS.includes('Meneth'));
  assert.equal(REGION_IDS.Meneth, 12, 'Vastos took 11 first');
  assert.equal(cells.length, 24, 'the atlas authors twenty-four Meneth hexes');
  assert.equal(new Set(PLAYABLE_REGIONS.map(name => REGION_BIOMES[name].id)).size, PLAYABLE_REGIONS.length);
  assert.equal(REGION_BIOMES.Meneth.ownScatter, true, 'what grows here is set by height above the valley floor');
  const meneth = REGION_TERRAIN.Meneth;
  assert.ok(meneth.base > REGION_TERRAIN['Moros Plain'].base + 10, 'cold upland, not lowland');
  assert.ok(meneth.base < REGION_TERRAIN.Vastos.base, 'and lower than the tableland next to it');
});

test('The ridges run east and west, and crossing one is a measurable effort', () => {
  // A line south through the middle of the region crosses ridge after ridge.
  const x = -1800;
  const profile = [];
  for (let z = -380; z <= 120; z += 2) profile.push({ z, y: menethRidge(x, z) });
  let crests = 0, troughs = 0;
  for (let i = 1; i < profile.length - 1; i++) {
    if (profile[i].y > profile[i - 1].y && profile[i].y >= profile[i + 1].y && profile[i].y > 1) crests++;
    if (profile[i].y < profile[i - 1].y && profile[i].y <= profile[i + 1].y && profile[i].y < -1) troughs++;
  }
  assert.ok(crests >= 3, `a sequence of parallel ridges, not one (${crests} crests)`);
  assert.ok(troughs >= 3, `with a valley between each pair (${troughs} troughs)`);
  const relief = Math.max(...profile.map(p => p.y)) - Math.min(...profile.map(p => p.y));
  assert.ok(relief > 9 && relief < 22, `crossing a ridge is work but not route-finding (${relief.toFixed(1)} m)`);
  // East and west along a crest the ground barely changes; north and south it does.
  const crest = profile.reduce((best, p) => p.y > best.y ? p : best).z;
  const alongCrest = [], acrossRidges = [];
  for (let d = -60; d <= 60; d += 4) { alongCrest.push(menethRidge(x + d, crest)); acrossRidges.push(menethRidge(x, crest + d)); }
  const spread = list => Math.max(...list) - Math.min(...list);
  assert.ok(spread(acrossRidges) > spread(alongCrest) * 4,
    `the ridges lie east to west: ${spread(acrossRidges).toFixed(1)} m across them, ${spread(alongCrest).toFixed(1)} m along one`);
});

test('The ridges lower and widen toward the lake country, with no line where Meneth ends', () => {
  const swing = z => {
    const heights = [];
    for (let x = -1950; x <= -1600; x += 25) heights.push(menethRidge(x, z));
    return Math.max(...heights) - Math.min(...heights);
  };
  const north = Math.max(swing(-300), swing(-270)), south = Math.max(swing(120), swing(150));
  assert.ok(south < north * .5, `the ridges give out southward (${north.toFixed(1)} m against ${south.toFixed(1)} m)`);
  assert.ok(Math.abs(menethRidge(-1600, 260)) < .6, 'and are gone before the lake country starts');
  // Nor do they stand up in the regions next door.
  assert.ok(Math.abs(menethRidge(-1350, -300)) < 1.5, 'the ridge field does not reach into Vastos');
});

test('Every valley has its beck, and every beck falls and lies in its trough', () => {
  assert.ok(MENETH_BECKS.length >= 3, 'the lore gives each valley its stream');
  for (const beck of MENETH_BECKS) {
    const profile = WEST_PROFILES.get(beck.id);
    for (let i = 1; i < profile.length; i++)
      assert.ok(profile[i].surface < profile[i - 1].surface, `${beck.id} climbs at sample ${i}`);
    for (const sample of profile) {
      const surface = westWaterSurface(sample.x, sample.z);
      if (surface === null) continue;
      assert.ok(westGroundAt(sample.x, sample.z) <= surface + .01, `${beck.id} floats at ${sample.x.toFixed(0)}`);
      // A beck lies on the valley floor, not on the side of a ridge.
      assert.ok(menethRidge(sample.x, sample.z) < menethRidge(sample.x, sample.z - 40) + .5
        || menethRidge(sample.x, sample.z) < menethRidge(sample.x, sample.z + 40) + .5,
        `${beck.id} runs along a ridge face`);
    }
  }
  // The trough line is where the becks are cut.
  const trough = menethTroughZ(1, -1850);
  assert.ok(menethRidge(-1850, trough) < menethRidge(-1850, trough + MENETH_RIDGES.wavelength / 2) - 4,
    'a trough is lower than the crest half a wavelength from it');
});

test('Every hex of the upland is honest ground, and its ground is world-terrain’s', () => {
  let worst = 0;
  for (const spot of samples) {
    const y = world.heightAt(spot.x, spot.z);
    assert.ok(Number.isFinite(y), `NaN ground at ${spot.x}, ${spot.z}`);
    assert.ok(y > 5, `${spot.x}, ${spot.z} sinks to ${y.toFixed(1)} m`);
    // Meneth is wooded on two of its three bands, so a sample may land on a trunk.
    // What the ground has to promise is that nobody is ever penned: somewhere
    // within a stride of any point of it there is ground to stand on.
    if (westBareGround(spot.x, spot.z, 1)) continue;
    const standable = canStand(spot.x, spot.z, world, .5)
      || [0, 1, 2, 3, 4, 5, 6, 7].some(i => canStand(spot.x + Math.sin(i / 8 * Math.PI * 2) * 3.2, spot.z + Math.cos(i / 8 * Math.PI * 2) * 3.2, world, .5));
    assert.ok(standable, `penned in at ${spot.x}, ${spot.z}`);
    worst = Math.max(worst, Math.abs(groundWithRiver(spot.x, spot.z) - westGroundAt(spot.x, spot.z)));
  }
  assert.ok(worst < 1e-9, `west-ground.js and world-terrain.js disagree by ${worst}`);
  const spawn = regions.find(region => region.name === 'Meneth').spawn;
  assert.equal(hexOwnerAt(spawn.x, spawn.z), 'Meneth');
  assert.ok(canStand(spawn.x, spawn.z, world, .5));
});

test('Three bands of growing: meadow on the floor, nut groves below, hardwood above', () => {
  const bands = new Set();
  for (const spot of samples) bands.add(menethBand(spot.x, spot.z));
  assert.deepEqual([...bands].sort(), ['floor', 'grove', 'wood'], 'all three bands are on the ground somewhere');
  const trees = world.colliders.filter(collider => collider.kind === 'meneth-tree');
  assert.ok(trees.length > 120, 'the ridge slopes carry real woodland');
  const onFloor = trees.filter(tree => menethBand(tree.x, tree.z) === 'floor');
  assert.ok(onFloor.length / trees.length < .06, 'the valley floors are hay meadow, not wood');
  const groves = trees.filter(tree => menethBand(tree.x, tree.z) === 'grove');
  const wood = trees.filter(tree => menethBand(tree.x, tree.z) === 'wood');
  assert.ok(groves.length > 20 && wood.length > 40, 'both the nut slopes and the hardwood above them are planted');
  const spacing = list => {
    let total = 0;
    for (const tree of list) {
      let nearest = Infinity;
      for (const other of list) if (other !== tree) nearest = Math.min(nearest, Math.hypot(other.x - tree.x, other.z - tree.z));
      total += nearest;
    }
    return total / list.length;
  };
  assert.ok(spacing(groves) > spacing(wood),
    'orchard trees stand apart from each other; close-grown hardwood does not');
});

test('Meneth is charted and listed, and nobody lives there', () => {
  const meneth = regions.find(region => region.name === 'Meneth');
  assert.deepEqual([...meneth.npcIds], [], 'terrain and wildlife only');
  for (const id of meneth.landmarks)
    assert.ok(world.landmarks.some(landmark => landmark.id === id), `the chart knows ${id}`);
  for (const landmark of WEST_REGION_LANDMARKS.filter(item => item.id.startsWith('meneth-')))
    assert.equal(hexOwnerAt(landmark.x, landmark.z), 'Meneth', `${landmark.id} stands in Meneth`);
  assert.ok(SUBREGIONS.filter(area => area.region === 'Meneth').length >= 2);
  assert.equal(regionBuildStatus('Meneth').playable, true);
});
