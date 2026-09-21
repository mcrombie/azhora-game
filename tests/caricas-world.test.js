import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import * as THREE from '../vendor/three.module.js';
import { canStand } from '../src/game-state.js';
import { PLAYABLE_REGIONS, REGION_BIOMES } from '../src/region-layout.js';
import { REGION_CELLS, REGION_IDS, REGION_TERRAIN, hexOwnerAt, regions } from '../src/region-world.js';
import {
  LIZEEM, CARICA, CARICA_CORRIDOR, CARICAS_SHELF, WEST_REGION_LANDMARKS,
  caricaCorridorDistance, courseDistance, westBareGround,
} from '../src/west-regions.js';
import { WEST_PROFILES, caricasShelf, westGroundAt, westWaterSurface } from '../src/west-ground.js';
import { groundWithRiver } from '../src/world-terrain.js';
import { SUBREGIONS } from '../src/map-fog.js';
import { regionBuildStatus } from '../src/build-status.js';

const { createWorld } = await sourceModule('../src/world.js');
// west-regions-life.js imports three by its bare name, so it has to come through the loader.
const { WEST_LIFE_ZONES, createWestLife } = await sourceModule('../src/west-regions-life.js');
const scene = new THREE.Scene();
const world = createWorld(scene);
const cells = REGION_CELLS.Caricas;
const samples = cells.flatMap(cell => [[0, 0], [30, 0], [-30, 0], [0, 30], [0, -30]]
  .map(([dx, dz]) => ({ x: cell.x + dx, z: cell.z + dz })));

test('Caricas is a registered region that scatters its ground by the water, not by the hex', () => {
  assert.ok(PLAYABLE_REGIONS.includes('Caricas'));
  assert.equal(REGION_IDS.Caricas, 13, 'Meneth took 12 first');
  assert.equal(cells.length, 32, 'the atlas authors thirty-two Caricas hexes');
  assert.equal(new Set(PLAYABLE_REGIONS.map(name => REGION_BIOMES[name].id)).size, PLAYABLE_REGIONS.length);
  assert.equal(REGION_BIOMES.Caricas.ownScatter, true);
  assert.ok(REGION_TERRAIN.Caricas.amp > REGION_TERRAIN.Vastos.amp,
    'caricas.md calls the country rougher than the uplands beside it');
});

test('The eastern shelf stands above the corridor, and the region falls west to the Lizeem', () => {
  const eastern = westGroundAt(CARICAS_SHELF.to + 30, 250), western = westGroundAt(-2150, 250);
  assert.ok(caricasShelf(CARICAS_SHELF.to, 250) > 12, 'the shelf is the full rise at its eastern end');
  assert.ok(caricasShelf(CARICAS_SHELF.from, 250) < 1, 'and nothing at the western bank');
  assert.ok(eastern > western + 10, `the region falls west (${eastern.toFixed(1)} m against ${western.toFixed(1)} m)`);
  assert.equal(caricasShelf(-1400, 250), 0, 'the shelf does not reach past Caricas');
  // The great river is the low ground for all of it.
  const mouth = WEST_PROFILES.get(LIZEEM.id).at(-1);
  for (const cell of cells) assert.ok(westGroundAt(cell.x, cell.z) > mouth.surface,
    `${cell.x}, ${cell.z} stands above the Lizeem's own level`);
});

test('The Lizeem is one river from head to mouth, growing as it goes, and never climbs', () => {
  const profile = WEST_PROFILES.get(LIZEEM.id);
  assert.ok(profile.length > 200, 'the atlas draws it right across the west');
  for (let i = 1; i < profile.length; i++)
    assert.ok(profile[i].surface < profile[i - 1].surface, `the Lizeem climbs at sample ${i}`);
  assert.ok(profile[0].half < 6 && profile.at(-1).half > 13,
    'the map marks its head medium and the rest of it large, and it is built that way');
  assert.ok(profile[0].surface - profile.at(-1).surface > 6, 'and it falls the length of the world');
  // Nobody wades it. Every metre of it is blocked.
  for (const at of [.2, .4, .6, .8]) {
    const sample = profile[Math.round(profile.length * at)];
    assert.equal(westWaterSurface(sample.x, sample.z) === null, false, `the Lizeem holds water at ${at}`);
    assert.equal(canStand(sample.x, sample.z, world, .4), false, `the Lizeem is walkable at ${at}`);
  }
});

test('The Carica is two rivers: quick and narrow off the shelf, slow and wide in the corridor', () => {
  const profile = WEST_PROFILES.get(CARICA.id);
  for (let i = 1; i < profile.length; i++)
    assert.ok(profile[i].surface < profile[i - 1].surface, `the Carica climbs at sample ${i}`);
  const upper = profile.find(sample => sample.along > .1), lower = profile.find(sample => sample.along > .8);
  assert.ok(lower.half > upper.half * 2, 'the corridor is more than twice the width of the upper section');
  // And the shape is the other way round. Measured as how far the ground rises
  // above the water within twenty-five metres of it, against how wide the water
  // itself is: the upper section is a notch several times deeper than it is wide,
  // and the corridor is an open valley about twice as deep as its river is wide.
  const bankAbove = sample => {
    let best = -Infinity;
    for (const side of [-1, 1]) for (let out = sample.half + 3; out <= sample.half + 25; out += 2)
      best = Math.max(best, westGroundAt(sample.x + sample.nx * out * side, sample.z + sample.nz * out * side) - sample.surface);
    return best;
  };
  assert.ok(bankAbove(upper) / upper.half > bankAbove(lower) / lower.half * 1.5,
    `the upper section is a notch and the corridor is an open valley (${(bankAbove(upper) / upper.half).toFixed(2)} against ${(bankAbove(lower) / lower.half).toFixed(2)})`);
  // The head is shallow over gravel and can be waded; the corridor cannot.
  assert.ok(canStand(profile[1].x, profile[1].z, world, .4), 'the head of the Carica is a ford');
  assert.equal(canStand(lower.x, lower.z, world, .4), false, 'the corridor is not');
});

test('The fox corridor is the middle reach, and its woodland stands to the water', () => {
  const profile = WEST_PROFILES.get(CARICA.id);
  const inside = profile.filter(sample => caricaCorridorDistance(sample.x, sample.z) < Infinity);
  assert.ok(inside.length > profile.length * .5 && inside.length < profile.length * .75,
    'about two thirds of the river, which is the lore’s "middle reach"');
  assert.equal(caricaCorridorDistance(profile[0].x, profile[0].z), Infinity, 'the head is not corridor');
  const trees = world.colliders.filter(collider => collider.kind === 'caricas-tree');
  assert.ok(trees.length > 250, 'the corridor is forest and not scrub');
  const onBank = trees.filter(tree => caricaCorridorDistance(tree.x, tree.z) < CARICA_CORRIDOR.bankReach);
  const above = trees.filter(tree => {
    const corridor = caricaCorridorDistance(tree.x, tree.z);
    return corridor >= CARICA_CORRIDOR.bankReach && corridor < CARICA_CORRIDOR.woodReach;
  });
  assert.ok(onBank.length > above.length,
    'the old growth on the bank is thicker than the worked woodland above it');
  const spacing = list => {
    let total = 0;
    for (const tree of list) {
      let nearest = Infinity;
      for (const other of list) if (other !== tree) nearest = Math.min(nearest, Math.hypot(other.x - tree.x, other.z - tree.z));
      total += nearest;
    }
    return total / list.length;
  };
  assert.ok(spacing(onBank) < spacing(above), 'old growth stands closer together than thinned woodland');
  // The shelf is nearly bare away from the water: the lore calls it rougher and
  // less well-watered. Where the river has cut down through it the corridor's own
  // woodland stands, which is the point of a corridor.
  const onShelf = trees.filter(tree => caricasShelf(tree.x, tree.z) > 11
    && caricaCorridorDistance(tree.x, tree.z) === Infinity);
  assert.ok(onShelf.length / trees.length < .05, 'almost nothing grows on the open shelf');
});

test('Every hex of the corridor country is honest ground', () => {
  let worst = 0;
  for (const spot of samples) {
    const y = world.heightAt(spot.x, spot.z);
    assert.ok(Number.isFinite(y), `NaN ground at ${spot.x}, ${spot.z}`);
    assert.ok(y > 2, `${spot.x}, ${spot.z} sinks to ${y.toFixed(1)} m`);
    worst = Math.max(worst, Math.abs(groundWithRiver(spot.x, spot.z) - westGroundAt(spot.x, spot.z)));
    if (westBareGround(spot.x, spot.z, 2)) continue;
    const standable = canStand(spot.x, spot.z, world, .5)
      || [0, 1, 2, 3, 4, 5, 6, 7].some(i => canStand(spot.x + Math.sin(i / 8 * Math.PI * 2) * 3.4, spot.z + Math.cos(i / 8 * Math.PI * 2) * 3.4, world, .5));
    assert.ok(standable, `penned in at ${spot.x}, ${spot.z}`);
  }
  assert.ok(worst < 1e-9, `west-ground.js and world-terrain.js disagree by ${worst}`);
  const spawn = regions.find(region => region.name === 'Caricas').spawn;
  assert.equal(hexOwnerAt(spawn.x, spawn.z), 'Caricas');
  assert.ok(canStand(spawn.x, spawn.z, world, .5));
});

test('The river fox watches; everything else in the west runs', () => {
  const life = createWestLife(scene, world);
  const foxZones = WEST_LIFE_ZONES.filter(zone => zone.species === 'river-fox');
  assert.ok(foxZones.length >= 2, 'the corridor carries foxes along its length');
  for (const zone of foxZones) for (const site of zone.sites) {
    assert.ok(courseDistance(CARICA, site[0], site[1], 60) < CARICA_CORRIDOR.bankReach,
      `a fox at ${site} is off the fox ground`);
    // The Carica runs the Caricas-Nesdor border, so "fox ground" means one bank
    // of it and not the other: the corridor is Carican and the keepers are Carican.
    assert.equal(hexOwnerAt(site[0], site[1]), 'Caricas', `a fox at ${site} is on the wrong bank`);
  }
  for (const zone of WEST_LIFE_ZONES.filter(item => item.species === 'otter'))
    for (const site of zone.sites) assert.equal(hexOwnerAt(site[0], site[1]), 'Caricas', `an otter at ${site} is on the wrong bank`);
  const foxOf = () => life.snapshot().creatures.find(animal => animal.species === 'river-fox');
  const otterOf = () => life.snapshot().creatures.find(animal => animal.species === 'otter');
  assert.ok(foxOf() && otterOf(), 'both are placed on standable bank');

  // Walk a traveler up to within five metres of each and hold there.
  const approach = (animal) => {
    const player = { x: animal.x + 4.4, y: 0, z: animal.z + 2.2 };
    for (let step = 0; step < 240; step++) life.update(1 / 30, player, true);
    return { player, before: animal };
  };
  const foxBefore = foxOf();
  const fox = approach(foxBefore);
  const after = life.snapshot().creatures.find(animal => animal.id === foxBefore.id);
  assert.equal(after.action, 'watch', 'the fox does not flee unless directly threatened');
  assert.ok(after.watching > .9, 'it holds the traveler');
  assert.ok(Math.hypot(after.x - fox.player.x, after.z - fox.player.z) < 11,
    'and it has not gone anywhere');
  // Facing: its yaw points at the traveler, not away.
  const toward = Math.atan2(fox.player.x - after.x, fox.player.z - after.z);
  const delta = Math.abs(Math.atan2(Math.sin(after.yaw - toward), Math.cos(after.yaw - toward)));
  assert.ok(delta < .5, `the fox is looking at the traveler (${delta.toFixed(2)} rad off)`);

  // The otter it shares the water with does what every other animal does.
  const otterBefore = otterOf();
  approach(otterBefore);
  const otter = life.snapshot().creatures.find(animal => animal.id === otterBefore.id);
  assert.notEqual(otter.action, 'watch', 'the otter is an ordinary animal');
  life.dispose();
});

test('Caricas is charted and listed, and nobody lives there', () => {
  const caricas = regions.find(region => region.name === 'Caricas');
  assert.deepEqual([...caricas.npcIds], [], 'terrain and wildlife only');
  for (const id of caricas.landmarks)
    assert.ok(world.landmarks.some(landmark => landmark.id === id), `the chart knows ${id}`);
  for (const landmark of WEST_REGION_LANDMARKS.filter(item => caricas.landmarks.includes(item.id)))
    assert.equal(hexOwnerAt(landmark.x, landmark.z), 'Caricas', `${landmark.id} stands in Caricas`);
  assert.ok(SUBREGIONS.filter(area => area.region === 'Caricas').length >= 3);
  assert.equal(regionBuildStatus('Caricas').playable, true);
});
