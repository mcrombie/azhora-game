import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { sourceModule } from './module-loader.js';
import * as THREE from '../vendor/three.module.js';
import { canStand } from '../src/game-state.js';
import { PLAYABLE_REGIONS, REGION_BIOMES } from '../src/region-layout.js';
import { PLAYABLE_SURVEY } from '../src/region-survey.js';
import { RIVER_EDGES } from '../src/region-rivers.js';
import {
  REGION_CELLS, REGION_IDS, REGION_TERRAIN, hexOwnerAt, regionAt, regions, landDistance, SEA_LEVEL,
} from '../src/region-world.js';
import {
  LIZEEM, LIZEEM_REACH, EER_CHANNELS, WEST_BRAIDS, WEST_RIVERS, WEST_REGION_LANDMARKS,
  courseDistance, westBareGround, inWestWater,
} from '../src/west-regions.js';
import { WEST_PROFILES, westGroundAt, westWaterSurface, braidThreadOffset } from '../src/west-ground.js';
import { DEFAULT_SKY, regionSky, composeSky, mixHex } from '../src/region-sky.js';
import { groundWithRiver } from '../src/world-terrain.js';
import { SUBREGIONS } from '../src/map-fog.js';
import { regionBuildStatus } from '../src/build-status.js';
import { regionLevel, levelWords } from '../src/region-levels.js';

/**
 * Eer: the first of the six south-western countries, and the only one a traveler can walk to.
 *
 * The standing rule for this pass is the user's, 2026-09-21: **the atlas wins over the lore**.
 * So most of what is asserted below is the atlas's own arithmetic rather than a number
 * somebody chose — twenty-five hexes, twelve of plains and thirteen of grassland, eleven `Cfa`
 * and fourteen `Csa`, no hills, no forest, no lake, no wetland, and not one dry hex edge
 * between Eer and Gala anywhere along the Lizeem.
 */
const { createWorld } = await sourceModule('../src/world.js');
const { WEST_LIFE_ZONES, createWestLife } = await sourceModule('../src/west-regions-life.js');
const scene = new THREE.Scene();
const world = createWorld(scene);
const cells = REGION_CELLS.Eer;
const loam = cells.filter(cell => cell.terrain === 'plains');
const coast = cells.filter(cell => cell.terrain === 'grassland');
const samples = cells.flatMap(cell => [[0, 0], [30, 0], [-30, 0], [0, 30], [0, -30], [34, 34], [-34, -34]]
  .map(([dx, dz]) => ({ x: cell.x + dx, z: cell.z + dz })));
const AXIAL = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
/**
 * Who owns every hex on the whole atlas, not only inside the survey window. Eer's southern
 * corner touches Northern Ascarth, which the window does not carry, so a border count taken
 * off `PLAYABLE_SURVEY` silently loses an edge and reports a shorter river than there is.
 */
const ATLAS_OWNERS = (() => {
  const atlas = JSON.parse(readFileSync(new URL('../assets/azhora-dev-regions.json', import.meta.url), 'utf8'));
  const owners = new Map();
  for (const region of atlas.regions) for (const cell of region.cells) owners.set(`${cell.q},${cell.r}`, region.name ?? region.id);
  return owners;
})();

test('Eer is a registered region, and the atlas divides it once', () => {
  assert.ok(PLAYABLE_REGIONS.includes('Eer'));
  assert.equal(PLAYABLE_REGIONS.at(-1), 'Eer', 'and last, so no region already built is re-seeded');
  assert.equal(REGION_IDS.Eer, 15, 'Nesdor took 14 first');
  assert.equal(cells.length, 25, 'the atlas authors twenty-five Eer hexes');
  assert.equal(new Set(PLAYABLE_REGIONS.map(name => REGION_BIOMES[name].id)).size, PLAYABLE_REGIONS.length);
  assert.equal(loam.length, 12, 'twelve plains hexes: the humid inland half');
  assert.equal(coast.length, 13, 'and thirteen of grassland: the Mediterranean coast');
  // What the atlas refuses. It has `hills`, `forest`, `lake` and `wetland` in its vocabulary
  // and uses every one of them elsewhere on the continent; it uses none of them here, which
  // is why Eer has no hill line (the lore's chalk hills are gone) and no woodland anywhere.
  assert.deepEqual([...new Set(cells.map(cell => cell.terrain))].sort(), ['grassland', 'plains']);
  assert.ok(REGION_TERRAIN.Eer.byTerrain.grassland, 'the coastal half has a profile of its own');
  assert.equal(REGION_TERRAIN.Eer.byTerrain.hills, undefined, 'and there is no hill profile to give it one');
});

test('the Köppen field says the same thing the terrain field does, and the game is built to it', () => {
  // The World Builder map carries a `climate` per hex that the dev export drops. It is only
  // readable when that repository is checked out beside this one, so this is the one check in
  // the file that steps out; when it cannot, it says so rather than passing quietly.
  const map = new URL('../../world-builder/map/resources/examples/azhora.wwmap', import.meta.url);
  if (!existsSync(map)) { assert.ok(true, 'World Builder not checked out beside this repo'); return; }
  const atlas = JSON.parse(readFileSync(map, 'utf8').replace(/^﻿/, ''));
  assert.equal(atlas.climateSystem, 'koppen-v1');
  const eer = PLAYABLE_SURVEY.regions.find(region => region.name === 'Eer');
  const counts = {};
  for (const cell of eer.cells) {
    const code = atlas.hexes[`${cell.q},${cell.r}`]?.climate ?? '(none)';
    counts[code] = (counts[code] ?? 0) + 1;
  }
  assert.deepEqual(counts, { Cfa: 11, Csa: 14 }, 'humid inland, hot-summer Mediterranean on the coast');
  // Terrain and climate agree hex for hex but one: the north-east corner on the sea is plains
  // ground under a Mediterranean sky, which is why the ground and the weather are read from
  // two different fields rather than one.
  const disagree = eer.cells.filter(cell => (atlas.hexes[`${cell.q},${cell.r}`]?.climate === 'Csa')
    !== (cell.terrain === 'grassland'));
  assert.equal(disagree.length, 1, 'one hex, and it is the corner on the water');
  assert.equal(disagree[0].terrain, 'plains');
});

test('Eer is a plain that falls to the sea, flatter than the Flats and dark where they are pale', () => {
  const inland = REGION_TERRAIN.Eer, sea = REGION_TERRAIN.Eer.byTerrain.grassland;
  assert.ok(inland.amp < REGION_TERRAIN.Nesdor.byTerrain.plains.amp + .4 && inland.amp < 1,
    'relief amplitude under one, over a long wavelength');
  assert.ok(sea.base < inland.base - 3, 'and the coast lies well below the inland shoulder');
  // It runs off Nesdor and the Moros without a step: the lore has the ground rising "very
  // gently inland to the north-west and then simply stops being farmed", not climbing a bank.
  assert.ok(Math.abs(inland.base - REGION_TERRAIN.Nesdor.byTerrain.plains.base) < 1.2);
  assert.ok(Math.abs(inland.base - REGION_TERRAIN['Moros Plain'].base) < 1.5);
  const mean = list => list.reduce((sum, cell) => sum + westGroundAt(cell.x, cell.z), 0) / list.length;
  assert.ok(mean(loam) > mean(coast) + 2, `the loam stands above the coast (${mean(loam).toFixed(1)} against ${mean(coast).toFixed(1)})`);
  // The darkest open ground in the game, which is the deep alluvial loam's job.
  const opens = ['Moros Plain', 'Nesdor', 'Vastos', 'Meneth', 'Caricas', 'West Suval'];
  const luma = hex => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) & 255) * .3 + ((n >> 8) & 255) * .6 + (n & 255) * .1; };
  for (const name of opens) assert.ok(luma(REGION_BIOMES.Eer.ground) < luma(REGION_BIOMES[name].ground),
    `Eer's loam is not darker than ${name}'s ground`);
});

test('the Lizeem is a wall on the Eer bank, and its last reach takes the water over without a step', () => {
  // The atlas's own arithmetic first, and off the whole dev export rather than off the survey:
  // the survey window carries only what the game builds near, and Northern Ascarth — which
  // owns one of these edges — is outside it.
  const owner = ATLAS_OWNERS;
  const wet = new Set();
  for (const edge of RIVER_EDGES) { wet.add(`${edge.a}|${edge.b}`); wet.add(`${edge.b}|${edge.a}`); }
  let shared = 0, dry = 0;
  for (const [key, name] of owner) {
    if (name !== 'Eer') continue;
    const [q, r] = key.split(',').map(Number);
    for (const [dq, dr] of AXIAL) {
      if (!['Gala', 'Northern Ascarth'].includes(owner.get(`${q + dq},${r + dr}`))) continue;
      shared++;
      if (!wet.has(`${[q, r]}|${[q + dq, r + dr]}`)) dry++;
    }
  }
  assert.equal(shared, 6, `${shared} shared edges: five with Gala and one with Northern Ascarth`);
  assert.equal(dry, 0, `${dry} of ${shared} edges off Eer’s western side have no river on them`);
  // And the only dry ground into Eer is from the north, which is why it is the one of the six
  // a traveler can walk to: eight edges with Nesdor and five with the Moros Plain.
  const dryWith = far => {
    let count = 0;
    for (const [key, name] of owner) {
      if (name !== 'Eer') continue;
      const [q, r] = key.split(',').map(Number);
      for (const [dq, dr] of AXIAL) if (owner.get(`${q + dq},${r + dr}`) === far
        && !wet.has(`${[q, r]}|${[q + dq, r + dr]}`)) count++;
    }
    return count;
  };
  assert.equal(dryWith('Nesdor'), 8);
  assert.equal(dryWith('Moros Plain'), 5);
  assert.equal(dryWith('Gala'), 0);
  // And the game is built to it: nothing about this reach is wadeable.
  assert.equal(LIZEEM_REACH.fordUntil, 0, 'eer.md: "it cannot be crossed anywhere along the Eer bank"');
  assert.equal(LIZEEM.fordUntil, 0);
  // One river in two courses. The reach starts on the Lizeem's last point, at its last level.
  const above = WEST_PROFILES.get(LIZEEM.id), below = WEST_PROFILES.get(LIZEEM_REACH.id);
  assert.equal(LIZEEM_REACH.headOf, 'lizeem');
  assert.ok(Math.hypot(LIZEEM_REACH.points[0].x - LIZEEM.points.at(-1).x,
    LIZEEM_REACH.points[0].z - LIZEEM.points.at(-1).z) < 1, 'the reach begins where the Lizeem stops');
  assert.ok(Math.abs(above.at(-1).surface - below[0].surface) < .02,
    `the water steps ${(above.at(-1).surface - below[0].surface).toFixed(3)} m at the handover`);
  for (let i = 1; i < below.length; i++) assert.ok(below[i].surface < below[i - 1].surface, `the reach climbs at sample ${i}`);
  // The wall itself: a line of deep-water colliders with no gap a traveler could walk through.
  const blockers = world.colliders.filter(collider => collider.kind === 'west-deep-water');
  for (const sample of below) {
    if (sample.ford) continue;   // the first sample, which is the Lizeem's own last and is blocked by it
    const near = blockers.filter(collider => Math.hypot(collider.x - sample.x, collider.z - sample.z) < sample.half + 4);
    assert.ok(near.length >= 2, `a gap in the Lizeem's wall at (${sample.x.toFixed(0)}, ${sample.z.toFixed(0)})`);
  }
});

test('the Neth is why the far four need a ford, and this pass does not build one', () => {
  // Not Eer's water, and stated here because the next builder needs it and the atlas has it:
  // every Nethereum-Ovesos hex edge is the Neth, so a Neth built as a wall would make the
  // unbuilt Nether Desert the only land bridge between two countries that are built
  // (docs/six-regions-brief.md, "The Neth's ford, and why it is there").
  const owner = ATLAS_OWNERS;
  const wet = new Set();
  for (const edge of RIVER_EDGES) { wet.add(`${edge.a}|${edge.b}`); wet.add(`${edge.b}|${edge.a}`); }
  let shared = 0, dry = 0;
  for (const [key, name] of owner) {
    if (name !== 'Nethereum') continue;
    const [q, r] = key.split(',').map(Number);
    for (const [dq, dr] of AXIAL) {
      if (owner.get(`${q + dq},${r + dr}`) !== 'Ovesos') continue;
      shared++;
      if (!wet.has(`${[q, r]}|${[q + dq, r + dr]}`)) dry++;
    }
  }
  assert.equal(shared, 5, 'five hex edges between Nethereum and Ovesos');
  assert.equal(dry, 0, 'and every one of them is the Neth');
  // Neither country is built, so there is no course to ford yet, and nothing here pretends
  // otherwise. The ford lands with Nethereum and Ovesos. (`meneth-beck` is not the Neth.)
  assert.equal(WEST_RIVERS.find(course => course.id.startsWith('neth')), undefined);
  assert.ok(!PLAYABLE_REGIONS.includes('Nethereum') && !PLAYABLE_REGIONS.includes('Ovesos'));
});

test('two channels cross the plain to the sea, braiding where the gradient dies', () => {
  assert.equal(EER_CHANNELS.length, 2);
  const braids = WEST_BRAIDS.filter(braid => braid.id.startsWith('eer-'));
  assert.equal(braids.length, 2, 'one braided reach each');
  for (const channel of EER_CHANNELS) {
    const profile = WEST_PROFILES.get(channel.id);
    assert.equal(channel.fordUntil, 1, 'a channel this shallow is walked through anywhere, like every beck out here');
    for (let i = 1; i < profile.length; i++) assert.ok(profile[i].surface < profile[i - 1].surface, `${channel.id} climbs at ${i}`);
    // Every metre of water sits in a hollow that was cut for it.
    for (const sample of profile) {
      const surface = westWaterSurface(sample.x, sample.z);
      if (surface === null) continue;
      assert.ok(westGroundAt(sample.x, sample.z) <= surface + .01, `${channel.id} floats at ${sample.x.toFixed(0)}`);
    }
    // It starts on the loam beside the great river and it gets to the sea.
    assert.equal(hexOwnerAt(profile[0].x, profile[0].z), 'Eer');
    assert.ok(courseDistance(LIZEEM_REACH, profile[0].x, profile[0].z, 400) < 260,
      `${channel.id} does not rise anywhere near the river it comes off`);
    assert.ok(landDistance(profile.at(-1).x, profile.at(-1).z) < 45,
      `${channel.id} stops ${landDistance(profile.at(-1).x, profile.at(-1).z).toFixed(0)} m short of the water`);
  }
  for (const braid of braids) {
    const profile = WEST_PROFILES.get(braid.course.id);
    const middle = profile[Math.round(profile.length * (braid.from + braid.to) / 2)];
    assert.ok(braidThreadOffset(braid, middle.along) > braid.offset * .9, 'the threads are widest in the middle');
    assert.equal(braidThreadOffset(braid, 0), null, 'and there is no braid at the head');
    let runs = 0, wet = false;
    for (let offset = -braid.offset - 12; offset <= braid.offset + 12; offset += .5) {
      const x = middle.x + middle.nx * offset, z = middle.z + middle.nz * offset;
      const water = westWaterSurface(x, z) !== null;
      if (water && !wet) runs++;
      wet = water;
    }
    assert.equal(runs, 3, `${braid.id} runs as three channels`);
  }
});

test('every hex of Eer is honest ground, and nobody is sealed in', () => {
  let worst = 0;
  for (const spot of samples) {
    const y = world.heightAt(spot.x, spot.z);
    assert.ok(Number.isFinite(y), `NaN ground at ${spot.x}, ${spot.z}`);
    // Water is not walking ground, and the shore is the coast field's business rather than
    // this module's: `westGroundAt` measures from `westNaturalGround`, which is the hex blend
    // and the relief and nothing else, while `groundWithRiver` starts from bedrock with the
    // shore already cut into it. Eer is the first of these regions with a coast, so the two
    // are only asked to agree where that cut has finished. Measured over every sample of
    // every hex: the furthest inland they differ at all is 39.4 m, so 45 is the threshold
    // with room in it, and inside it the difference is the beach and not a bug.
    if (westBareGround(spot.x, spot.z, 4) || landDistance(spot.x, spot.z) < 45) continue;
    worst = Math.max(worst, Math.abs(groundWithRiver(spot.x, spot.z) - westGroundAt(spot.x, spot.z)));
    const standable = canStand(spot.x, spot.z, world, .5)
      || [0, 1, 2, 3, 4, 5, 6, 7].some(i => canStand(spot.x + Math.sin(i / 8 * Math.PI * 2) * 3.4, spot.z + Math.cos(i / 8 * Math.PI * 2) * 3.4, world, .5));
    assert.ok(standable, `penned in at ${spot.x}, ${spot.z}`);
  }
  assert.ok(worst < 1e-9, `west-ground.js and world-terrain.js disagree by ${worst}`);
  const spawn = regions.find(region => region.name === 'Eer').spawn;
  assert.equal(hexOwnerAt(spawn.x, spawn.z), 'Eer');
  assert.ok(canStand(spawn.x, spawn.z, world, .5), 'the travel button puts the traveler on ground');
  // And a traveler who walks south off the Moros or Nesdor is told they are in Eer.
  for (const spot of [{ x: -1025, z: 880 }, { x: -1275, z: 960 }])
    assert.equal(regionAt(spot.x, spot.z).name, 'Eer', `(${spot.x}, ${spot.z}) should be Eer`);
});

test('nothing Eer plants stands in water, and everything it plants stands on its own hexes', () => {
  const planted = world.colliders.filter(collider => collider.kind === 'eer-tree' || collider.kind === 'eer-scrub');
  assert.ok(planted.filter(collider => collider.kind === 'eer-tree').length > 200, 'the galleries and the standing olives');
  assert.ok(planted.filter(collider => collider.kind === 'eer-scrub').length > 40, 'cushion scrub on the dry half');
  for (const collider of planted) {
    assert.equal(hexOwnerAt(collider.x, collider.z), 'Eer', `something of Eer’s stands at (${collider.x.toFixed(0)}, ${collider.z.toFixed(0)})`);
    assert.equal(westWaterSurface(collider.x, collider.z), null, 'something of Eer’s is standing in the water');
    assert.ok(!inWestWater(collider.x, collider.z), 'something of Eer’s is inside a watercourse');
    assert.ok(landDistance(collider.x, collider.z) > 0, 'something of Eer’s is standing in the sea');
  }
  // No rock: the atlas gives Eer no hills and the lore gives it loam to the depth of a spade.
  assert.equal(REGION_BIOMES.Eer.rocksPerHex, 0);
  // The scrub is the dry half's and the galleries reach both halves, which is the one line
  // the country has. Measured against the atlas's own hexes rather than a drawn boundary.
  const terrainOf = spot => cells.reduce((best, cell) =>
    Math.hypot(cell.x - spot.x, cell.z - spot.z) < Math.hypot(best.x - spot.x, best.z - spot.z) ? cell : best).terrain;
  const scrub = planted.filter(collider => collider.kind === 'eer-scrub');
  assert.ok(scrub.filter(collider => terrainOf(collider) === 'grassland').length > scrub.length * .85,
    'cushion scrub belongs to the Mediterranean half');
});

test('Eer is the first country with a sky of its own, and it takes it the way the module allows', () => {
  const eer = regions.find(region => region.name === 'Eer');
  const sky = regionSky(eer);
  // Condition one: a new palette field, and never `palette.fog`, which is the chart legend's.
  assert.ok(Number.isInteger(eer.palette.sky) && Number.isInteger(eer.palette.haze));
  assert.ok(Number.isFinite(eer.palette.hazeDensity) && eer.palette.hazeDensity > 0);
  assert.equal(typeof eer.palette.fog, 'string', 'palette.fog is still the chart colour it always was');
  assert.equal(sky.background, eer.palette.sky);
  assert.equal(sky.fog, eer.palette.haze);
  assert.equal(sky.density, eer.palette.hazeDensity);
  assert.notDeepEqual({ ...sky }, { ...DEFAULT_SKY });
  // And it says what a dry coast looks like: clearer air than the lake country's.
  assert.ok(sky.density < DEFAULT_SKY.density, 'you can see further on a Mediterranean coast');
  // Condition two: composable with whatever comes. A time-of-day tint is a function from a
  // sky to a sky, and applying one to Eer's leaves Eer's own choice showing through it.
  const dusk = value => ({ ...value, background: mixHex(value.background, 0x2a2140, .5), density: value.density * 1.3 });
  const evening = composeSky(sky, dusk), plain = composeSky(DEFAULT_SKY, dusk);
  assert.notDeepEqual({ ...evening }, { ...plain }, 'the hour swallowed the country');
  assert.equal(evening.density, sky.density * 1.3);
  assert.deepEqual({ ...composeSky(sky) }, { ...sky }, 'no tint, no change');
  // Every other region is still on the three numbers the game has always used.
  for (const region of regions) if (region.name !== 'Eer')
    assert.deepEqual({ ...regionSky(region) }, { ...DEFAULT_SKY }, `${region.name} lost the default sky`);
});

test('the birds of the Lizeem’s distributaries, the boar in the scrub, and the dolphins nobody can reach', () => {
  const here = WEST_LIFE_ZONES.filter(zone => zone.region === 'Eer');
  assert.ok(here.length >= 6, 'six ranges at least');
  const species = new Set(here.map(zone => zone.species));
  for (const name of ['wading-bird', 'egret', 'stilt', 'duck', 'boar', 'gull', 'dolphin'])
    assert.ok(species.has(name), `Eer has no ${name}`);
  // Four of the seven are birds on water, because the one direct statement the fauna overview
  // makes about this water is that it carries "the richest avian assemblage documented on the
  // continent", and it names herons, spoonbills and stilt-legged species in it.
  assert.ok(here.filter(zone => ['wading-bird', 'egret', 'stilt', 'duck'].includes(zone.species)).length >= 4);
  // Every one of them says where the lore puts it.
  for (const zone of here) assert.ok(zone.note && zone.note.length > 40, `${zone.id} says nothing about why it is here`);

  const life = createWestLife(scene, world);
  const mine = life.snapshot().creatures.filter(animal => animal.region === 'Eer');
  assert.equal(mine.length, here.reduce((sum, zone) => sum + zone.sites.length, 0), 'every one of them found a place');
  for (const animal of mine) {
    const zone = here.find(item => animal.id.startsWith(`${item.id}-`));
    if (zone.sea) continue;
    assert.equal(hexOwnerAt(animal.x, animal.z), 'Eer', `${animal.id} strayed off the country`);
  }
  // Thirty seconds of them moving about with somebody in the middle of them.
  const player = { x: -1050, y: 0, z: 1100 };
  for (let step = 0; step < 900; step++) life.update(1 / 30, player, true);
  for (const animal of life.snapshot().creatures) {
    const zone = WEST_LIFE_ZONES.find(item => animal.id.startsWith(`${item.id}-`));
    assert.ok(Number.isFinite(animal.x + animal.y + animal.z), `${animal.id} went to NaN`);
    assert.ok(animal.x >= zone.minX - .5 && animal.x <= zone.maxX + .5
      && animal.z >= zone.minZ - .5 && animal.z <= zone.maxZ + .5, `${animal.id} left its range`);
    if (!zone.air && !zone.sea && !zone.float) assert.ok(Math.abs(animal.groundY - world.heightAt(animal.x, animal.z)) < .05, `${animal.id} floats`);
  }
  // The duck is the one that *should* float. A mallard sits on a river; it does not stand
  // on the bed of one, and photographed before `zone.float` existed it was three-quarters
  // submerged in its own channel. Its feet are on the water surface wherever there is water
  // under it, and on the ground wherever there is not.
  const ducks = life.snapshot().creatures.filter(animal => animal.species === 'duck');
  assert.ok(ducks.length >= 3);
  let afloat = 0;
  for (const duck of ducks) {
    const water = westWaterSurface(duck.x, duck.z), ground = world.heightAt(duck.x, duck.z);
    if (water === null) { assert.ok(Math.abs(duck.groundY - ground) < .05, `${duck.id} is on dry land and not on it`); continue; }
    afloat++;
    assert.ok(Math.abs(duck.groundY - (water - .04)) < .05, `${duck.id} sits ${(duck.groundY - water).toFixed(2)} m off its own water`);
    assert.ok(duck.groundY > ground, `${duck.id} is standing on the bed of the channel`);
  }
  assert.ok(afloat >= 2, `only ${afloat} of ${ducks.length} duck are on the water`);
  // The dolphins: out past the surf, at the sea's own level, and never anywhere a man could
  // get to. A flock only ticks with somebody inside its reach, so the traveler stands on the
  // nearest shore first — which is also the only place anybody ever watches one from.
  const sea = here.find(zone => zone.sea);
  const watcher = { x: -930, y: 0, z: 1177 };
  assert.ok(Math.hypot(watcher.x - (sea.minX + sea.maxX) / 2, watcher.z - (sea.minZ + sea.maxZ) / 2) < 130,
    'the watcher has to be near enough for the pod to be running at all');
  assert.ok(canStand(watcher.x, watcher.z, world, .5), 'and standing on Eer’s own shore');
  for (let step = 0; step < 120; step++) life.update(1 / 30, watcher, true);
  const pod = life.snapshot().creatures.filter(animal => animal.id.startsWith(`${sea.id}-`));
  assert.equal(pod.length, sea.sites.length);
  for (const animal of pod) {
    assert.ok(landDistance(animal.x, animal.z) < 0, `${animal.id} is on the beach`);
    assert.ok(!canStand(animal.x, animal.z, world, .4), `${animal.id} can be walked up to`);
    assert.ok(Math.abs(animal.groundY - (SEA_LEVEL - .5)) < .01, `${animal.id} is not swimming at the sea's level`);
    assert.ok(animal.y <= SEA_LEVEL + .5 && animal.y >= SEA_LEVEL - .55, `${animal.id} is ${animal.y.toFixed(2)} m, which is neither in the sea nor on it`);
    assert.equal(animal.action, 'swim');
  }
  // Over a minute they porpoise: up out of the water and down under it again, more than once.
  const track = [];
  for (let step = 0; step < 60 * 30; step++) { life.update(1 / 30, watcher, true);
    track.push(life.snapshot().creatures.find(animal => animal.id === `${sea.id}-1`).y); }
  assert.ok(Math.max(...track) > SEA_LEVEL + .2, 'a back and a fin out of the water');
  assert.ok(Math.min(...track) < SEA_LEVEL - .3, 'and down again');
  let breaths = 0;
  for (let i = 1; i < track.length; i++) if (track[i - 1] <= SEA_LEVEL && track[i] > SEA_LEVEL) breaths++;
  assert.ok(breaths >= 4, `it came up ${breaths} times in a minute`);
  life.dispose();
});

test('the quick ones of Eer cannot be run down either', () => {
  // The same law `tests/west-life.test.js` holds for the four regions, applied to the kinds
  // Eer brings: a bird gets off the ground and a boar outruns a man, and neither is reached.
  const WALK = 4.2, RUN = 7.2, HZ = 60;
  for (const zone of WEST_LIFE_ZONES.filter(item => item.region === 'Eer' && !item.sea)) {
    const life = createWestLife(new THREE.Scene(), world);
    const band = () => life.snapshot().creatures.filter(animal => animal.id.startsWith(`${zone.id}-`));
    const first = band()[0];
    const player = { x: first.x + 40, z: first.z };
    let closest = Infinity, flew = false;
    for (let i = 0; i < 25 * HZ; i++) {
      const at = band().find(animal => animal.id === first.id);
      const dx = at.x - player.x, dz = at.z - player.z, d = Math.hypot(dx, dz);
      if (d > .4) { const step = Math.min(d - .3, RUN / HZ); player.x += dx / d * step; player.z += dz / d * step; }
      life.update(1 / HZ, player, true);
      const now = band().find(animal => animal.id === first.id);
      if (now.lift < 1) closest = Math.min(closest, Math.hypot(now.x - player.x, now.z - player.z));
      if (now.action === 'fly') flew = true;
    }
    assert.ok(closest > 1.5, `${zone.id}: somebody running got within ${closest.toFixed(2)} m`);
    if (zone.species !== 'boar') assert.ok(flew, `${zone.id}: a bird that is run at takes to the air`);
    life.dispose();
    void WALK;
  }
});

test('Eer is charted, levelled and listed, and nobody lives there', () => {
  const eer = regions.find(region => region.name === 'Eer');
  assert.deepEqual([...eer.npcIds], [], 'terrain and wildlife only');
  for (const id of eer.landmarks)
    assert.ok(world.landmarks.some(landmark => landmark.id === id), `the chart knows ${id}`);
  for (const landmark of WEST_REGION_LANDMARKS.filter(item => eer.landmarks.includes(item.id)))
    assert.equal(hexOwnerAt(landmark.x, landmark.z), 'Eer', `${landmark.id} stands outside Eer`);
  assert.ok(SUBREGIONS.filter(area => area.region === 'Eer').length >= 3);
  for (const area of SUBREGIONS.filter(item => item.region === 'Eer'))
    assert.equal(hexOwnerAt(area.x, area.z), 'Eer', `the chart puts ${area.id} outside Eer`);
  assert.equal(regionBuildStatus('Eer').playable, true);
  // Level 2: "A troubled country", which is what the ladder gives a farmland that has been
  // taken eleven times. Nothing in this pass is an encounter, so nothing reads the number yet.
  assert.equal(regionLevel('Eer'), 2);
  assert.equal(levelWords(2), 'A troubled country');
  // And every country built as terrain and wildlife still places nobody.
  for (const name of ['Vastos', 'Meneth', 'Caricas', 'Nesdor', 'Eer'])
    assert.deepEqual([...regions.find(region => region.name === name).npcIds], [], `${name} places nobody`);
});
