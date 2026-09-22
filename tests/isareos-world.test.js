import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { sourceModule } from './module-loader.js';
import * as THREE from '../vendor/three.module.js';
import { canStand } from '../src/game-state.js';
import { PLAYABLE_REGIONS, REGION_BIOMES, METRES_PER_HEX } from '../src/region-layout.js';
import { PLAYABLE_SURVEY, LAND_HEXES } from '../src/region-survey.js';
import { RIVER_EDGES } from '../src/region-rivers.js';
import {
  REGION_CELLS, REGION_IDS, REGION_TERRAIN, WORLD_BOUNDS, hexOwnerAt, regions, landDistance, hexCentre,
} from '../src/region-world.js';
import {
  LIZEEM, ISAREOS_RIVER, ISAREOS_BECKS, ISAMOUTH_GROUND, WEST_REGION_LANDMARKS, courseDistance, westBareGround,
} from '../src/west-regions.js';
import { WEST_PROFILES, westGroundAt, westWaterSurface, isareosLie } from '../src/west-ground.js';
import { DEFAULT_SKY, regionSky } from '../src/region-sky.js';
import { groundWithRiver } from '../src/world-terrain.js';
import { SUBREGIONS } from '../src/map-fog.js';
import { regionBuildStatus } from '../src/build-status.js';
import { regionLevel, levelWords } from '../src/region-levels.js';

/**
 * Isareos: the second of the six south-western countries, the first on the far bank of the
 * Lizeem, and the one that widens the world.
 *
 * Two of the atlas's refusals matter more here than anywhere else in the job. It gives
 * Isareos **no unclaimed edge at all** — the country is landlocked, and the lore's coast,
 * its inlets, its inshore fishery and Isamouth went with the adjustment. And it gives it
 * **no `forest` hex**, in a map that has `forest` and `deep_forest` and uses them two hexes
 * west in the Ibenwood. Both are asserted below, because both are things a later builder
 * would otherwise be tempted to put back.
 */
const { createWorld } = await sourceModule('../src/world.js');
const { WEST_LIFE_ZONES, createWestLife } = await sourceModule('../src/west-regions-life.js');
const scene = new THREE.Scene();
const world = createWorld(scene);
const cells = REGION_CELLS.Isareos;
const hills = cells.filter(cell => cell.terrain === 'grassland');
const rim = cells.filter(cell => cell.terrain === 'plains');
const samples = cells.flatMap(cell => [[0, 0], [30, 0], [-30, 0], [0, 30], [0, -30], [34, 34], [-34, -34]]
  .map(([dx, dz]) => ({ x: cell.x + dx, z: cell.z + dz })));
const AXIAL = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const ATLAS_OWNERS = (() => {
  const atlas = JSON.parse(readFileSync(new URL('../assets/azhora-dev-regions.json', import.meta.url), 'utf8'));
  const owners = new Map();
  for (const region of atlas.regions) for (const cell of region.cells) owners.set(`${cell.q},${cell.r}`, region.name ?? region.id);
  return owners;
})();

test('Isareos is a registered region, landlocked, and without a tree the atlas did not refuse', () => {
  assert.ok(PLAYABLE_REGIONS.includes('Isareos'));
  // **The appending order, not the last name.** This used to pin "Isareos is last", which was
  // true for exactly one country and broke the moment Nethereum landed. What actually has to
  // hold is that nothing is ever *inserted*: the biome scatter walks this list with one seeded
  // stream, so a country put anywhere but the end re-rolls every region after it.
  assert.deepEqual(PLAYABLE_REGIONS.slice(13), ['Nesdor', 'Eer', 'Isareos', 'Nethereum'],
    'the south-western countries are appended in the order they were built');
  assert.equal(REGION_IDS.Isareos, 16, 'Eer took 15 first');
  assert.equal(cells.length, 31, 'the atlas authors thirty-one Isareos hexes');
  assert.equal(new Set(PLAYABLE_REGIONS.map(name => REGION_BIOMES[name].id)).size, PLAYABLE_REGIONS.length);
  assert.equal(hills.length, 25, 'twenty-five grassland hexes: the hill country');
  assert.equal(rim.length, 6, 'and six of plains: a single column down the western rim');
  assert.deepEqual([...new Set(cells.map(cell => cell.terrain))].sort(), ['grassland', 'plains']);
  // Landlocked. Every neighbour of every hex is somebody's land; not one is sea.
  const land = new Set(LAND_HEXES.map(([q, r]) => `${q},${r}`));
  let sea = 0, unowned = 0;
  for (const cell of cells) for (const [dq, dr] of AXIAL) {
    const key = `${cell.q + dq},${cell.r + dr}`;
    if (ATLAS_OWNERS.has(key)) continue;
    unowned++;
    if (!land.has(key)) sea++;
  }
  assert.equal(unowned, 0, 'the atlas leaves Isareos no unclaimed edge: it has no coast');
  assert.equal(sea, 0);
  assert.equal(regions.find(region => region.name === 'Isareos').landmarks.some(id => /coast|harbour|inlet|mouth/.test(id)), false);
});

test('the Köppen field says one thing over the whole country, and the traveler notices nothing', () => {
  const map = new URL('../../world-builder/map/resources/examples/azhora.wwmap', import.meta.url);
  if (!existsSync(map)) { assert.ok(true, 'World Builder not checked out beside this repo'); return; }
  const atlas = JSON.parse(readFileSync(map, 'utf8').replace(/^﻿/, ''));
  const isareos = PLAYABLE_SURVEY.regions.find(region => region.name === 'Isareos');
  const counts = {};
  for (const cell of isareos.cells) counts[atlas.hexes[`${cell.q},${cell.r}`]?.climate ?? '(none)'] = 1 + (counts[atlas.hexes[`${cell.q},${cell.r}`]?.climate ?? '(none)'] ?? 0);
  assert.deepEqual(counts, { Cfa: 31 }, 'humid subtropical over every hex, the same as Drent and the lake country');
  // Which is why Isareos, alone of the six, declares no sky: there is nothing to say.
  assert.deepEqual({ ...regionSky(regions.find(region => region.name === 'Isareos')) }, { ...DEFAULT_SKY });
});

test('Isareos is the country that spent most of the hex budget', () => {
  // Eer lay inside the box Caricas already made. Isareos's western rim against the
  // Ibenwood is what takes the world's edge out, from -2310 to -2960, and the guard in
  // region-layout.test.js was raised from 30 to 36 for it and for nothing else. Nethereum's
  // one `plains` hex then took it fifty metres further, to -3010, and the guard to 37.
  const west = Math.min(...cells.map(cell => cell.x));
  assert.ok(west < -2840, `Isareos reaches x = ${west.toFixed(0)}`);
  assert.ok(WORLD_BOUNDS.minX < -2900, `the world's western edge is ${WORLD_BOUNDS.minX.toFixed(0)}`);
  const wide = (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX) / METRES_PER_HEX;
  const tall = (WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ) / METRES_PER_HEX;
  assert.ok(wide > 36 && wide < 37, `the world is ${wide.toFixed(2)} hexes wide`);
  assert.ok(Math.abs(tall - 30.93) < .05, `north to south is still ${tall.toFixed(2)} hexes: nothing here touched it`);
});

test('low hills, not quite highlands, blurring into the two countries either side of them', () => {
  const hill = REGION_TERRAIN.Isareos, edge = REGION_TERRAIN.Isareos.byTerrain.plains;
  assert.ok(hill.amp > REGION_TERRAIN.Caricas.amp && hill.amp < REGION_TERRAIN.Amod.byTerrain.hills.amp,
    'rolling country: rougher than a river corridor and nothing like a foothill');
  assert.ok(edge.base < hill.base && edge.amp < hill.amp, 'the western rim is lower and flatter: the hills giving out');
  // "rising gradually... to the upland margins where the territory blurs into the southern
  // edges of the lake country": it sits between the two countries it hands itself to.
  assert.ok(hill.base > REGION_TERRAIN.Caricas.base && hill.base < REGION_TERRAIN.Meneth.base,
    `Isareos at ${hill.base} is not between Caricas at ${REGION_TERRAIN.Caricas.base} and Meneth at ${REGION_TERRAIN.Meneth.base}`);
  // And the hills are real on the ground, not only in the table: a shoulder and a floor
  // differ by several metres over a hundred, which is a climb and is not mountaineering.
  let worstRise = 0;
  for (const cell of hills) {
    const heights = [];
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      heights.push(westGroundAt(cell.x + Math.sin(a) * 60, cell.z + Math.cos(a) * 60));
    }
    worstRise = Math.max(worstRise, Math.max(...heights) - Math.min(...heights));
  }
  assert.ok(worstRise > 5 && worstRise < 22, `the biggest rise across a hex is ${worstRise.toFixed(1)} m`);
  // `isareosLie` tells a hollow from a shoulder, which is the whole of what the scatter reads.
  const lies = hills.flatMap(cell => [[0, 0], [40, 0], [0, 40], [-40, 0], [0, -40]]
    .map(([dx, dz]) => isareosLie(cell.x + dx, cell.z + dz)));
  assert.ok(Math.min(...lies) < .2 && Math.max(...lies) > .8, 'it finds both floors and shoulders');
  for (const lie of lies) assert.ok(lie >= 0 && lie <= 1, `lie out of range: ${lie}`);
});

test('the Isa, the three becks that feed it, and the ground kept clear where it meets the Lizeem', () => {
  // The atlas's own line: every authored edge between Isareos and Nethereum is under it.
  const mine = RIVER_EDGES.filter(edge => edge.regions.includes('Isareos') && edge.regions.includes('Nethereum'));
  assert.ok(mine.length >= 10, `only ${mine.length} authored edges`);
  for (const edge of mine) {
    const a = hexCentre(edge.a[0], edge.a[1]), b = hexCentre(edge.b[0], edge.b[1]);
    const mid = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
    assert.ok(courseDistance(ISAREOS_RIVER, mid.x, mid.z, 60) < 12,
      `the border river runs off the authored edge at (${mid.x.toFixed(0)}, ${mid.z.toFixed(0)})`);
  }
  const head = ISAREOS_RIVER.points[0], mouth = ISAREOS_RIVER.points.at(-1);
  assert.ok(Math.abs(head.x - -2800) < 1 && Math.abs(head.z - 87) < 1, `head at (${head.x.toFixed(0)}, ${head.z.toFixed(0)})`);
  assert.ok(Math.abs(mouth.x - -2250) < 1 && Math.abs(mouth.z - 231) < 1, `mouth at (${mouth.x.toFixed(0)}, ${mouth.z.toFixed(0)})`);
  // **It is the Isa** (the user's ruling, 2026-09-21). The lore names one river in Isareos
  // and the atlas draws one, so the name comes inland with the country when its coast goes.
  assert.equal(ISAREOS_RIVER.name, 'The Isa');
  assert.ok(WEST_REGION_LANDMARKS.some(mark => /\bIsa\b/.test(mark.name) || /\bIsa\b/.test(mark.description ?? '')),
    'and the chart says so somewhere');
  // **Isamouth is not built**, because it is a settlement and this pass builds none — and
  // the ground where it will stand is kept plain, so that putting it there later does not
  // mean moving a gallery and re-rolling every seeded draw after it.
  assert.ok(!WEST_REGION_LANDMARKS.some(mark => /Isamouth/.test(mark.name)), 'Isamouth is a town and is not built');
  assert.ok(!SUBREGIONS.some(area => /Isamouth/.test(area.name)));
  const confluence = ISAREOS_RIVER.points.at(-1);
  assert.ok(Math.hypot(confluence.x - ISAMOUTH_GROUND.x, confluence.z - ISAMOUTH_GROUND.z) < 8,
    'the ground kept clear is the confluence the Isa actually makes');
  const crowding = world.colliders.filter(collider => /^isareos-/.test(collider.kind ?? '')
    && Math.hypot(collider.x - ISAMOUTH_GROUND.x, collider.z - ISAMOUTH_GROUND.z) < ISAMOUTH_GROUND.radius);
  assert.equal(crowding.length, 0, `${crowding.length} things of Isareos's stand on Isamouth's ground`);
  // Waded at the head, a wall below, which is what the Carica does at the same size.
  assert.ok(ISAREOS_RIVER.fordUntil > .2 && ISAREOS_RIVER.fordUntil < .5);
  assert.equal(LIZEEM.fordUntil, 0, 'and the great river beside it is still no ford at all');
  // The three becks: on Isareos's own ground, falling, holding water, and stepped across.
  assert.equal(ISAREOS_BECKS.length, 3);
  for (const beck of ISAREOS_BECKS) {
    assert.equal(beck.fordUntil, 1, 'a beck is a step across anywhere');
    assert.ok(beck.maxHalf < 3, 'and none of them is a river: the lore says the country has no defining one');
    const profile = WEST_PROFILES.get(beck.id);
    for (let i = 1; i < profile.length; i++) assert.ok(profile[i].surface < profile[i - 1].surface, `${beck.id} climbs at ${i}`);
    for (const sample of profile) {
      assert.equal(hexOwnerAt(sample.x, sample.z), 'Isareos', `${beck.id} leaves the country at (${sample.x.toFixed(0)}, ${sample.z.toFixed(0)})`);
      const surface = westWaterSurface(sample.x, sample.z);
      if (surface !== null) assert.ok(westGroundAt(sample.x, sample.z) <= surface + .01, `${beck.id} floats at ${sample.x.toFixed(0)}`);
    }
    // Each one finds the course that takes it.
    const mouthAt = profile.at(-1);
    assert.ok(courseDistance(ISAREOS_RIVER, mouthAt.x, mouthAt.z, 90) < 40,
      `${beck.id} ends ${courseDistance(ISAREOS_RIVER, mouthAt.x, mouthAt.z, 90).toFixed(0)} m from the river`);
  }
});

test('every hex of Isareos is honest ground, and nobody is sealed in', () => {
  let worst = 0;
  for (const spot of samples) {
    const y = world.heightAt(spot.x, spot.z);
    assert.ok(Number.isFinite(y), `NaN ground at ${spot.x}, ${spot.z}`);
    assert.ok(landDistance(spot.x, spot.z) > 0, `${spot.x}, ${spot.z} is under water in a landlocked country`);
    if (westBareGround(spot.x, spot.z, 4)) continue;
    worst = Math.max(worst, Math.abs(groundWithRiver(spot.x, spot.z) - westGroundAt(spot.x, spot.z)));
    const standable = canStand(spot.x, spot.z, world, .5)
      || [0, 1, 2, 3, 4, 5, 6, 7].some(i => canStand(spot.x + Math.sin(i / 8 * Math.PI * 2) * 3.4, spot.z + Math.cos(i / 8 * Math.PI * 2) * 3.4, world, .5));
    assert.ok(standable, `penned in at ${spot.x}, ${spot.z}`);
  }
  assert.ok(worst < 1e-9, `west-ground.js and world-terrain.js disagree by ${worst}`);
  const spawn = regions.find(region => region.name === 'Isareos').spawn;
  assert.equal(hexOwnerAt(spawn.x, spawn.z), 'Isareos');
  assert.ok(canStand(spawn.x, spawn.z, world, .5), 'the travel button puts the traveler on ground');
});

test('the only wood in Isareos is the gallery, and the thorn keeps to the hollows', () => {
  const trees = world.colliders.filter(collider => collider.kind === 'isareos-tree');
  const thorn = world.colliders.filter(collider => collider.kind === 'isareos-thorn');
  assert.ok(trees.length > 100, 'a gallery on the river and the three becks');
  assert.ok(thorn.length > 150, 'thorn in the hollows');
  const water = spot => Math.min(courseDistance(ISAREOS_RIVER, spot.x, spot.z, 120),
    ...ISAREOS_BECKS.map(beck => courseDistance(beck, spot.x, spot.z, 120)));
  for (const tree of trees) {
    assert.equal(hexOwnerAt(tree.x, tree.z), 'Isareos', `a tree of Isareos stands at (${tree.x.toFixed(0)}, ${tree.z.toFixed(0)})`);
    assert.equal(westWaterSurface(tree.x, tree.z), null, 'a tree is standing in the water');
    // Two trees deep and not one pace further: the lore's "narrow gallery ... on the water".
    assert.ok(water(tree) < 16, `a gallery tree stands ${water(tree).toFixed(0)} m from any water`);
  }
  for (const bush of thorn) {
    assert.equal(hexOwnerAt(bush.x, bush.z), 'Isareos');
    assert.equal(westWaterSurface(bush.x, bush.z), null);
  }
  // The thorn is a hollow-dweller by measurement, not by intention: most of it stands below
  // the half-way mark between its own valley floor and the shoulder over it.
  const low = thorn.filter(bush => isareosLie(bush.x, bush.z) < .5).length;
  assert.ok(low > thorn.length * .75, `only ${low} of ${thorn.length} thorn bushes are in a hollow`);
  // And no rock: the atlas gives Isareos no hills hex and the lore gives it grass to the top.
  assert.equal(REGION_BIOMES.Isareos.rocksPerHex, 0);
});

test('red deer on the open grass, hares on the shoulders, otters on the water and something circling', () => {
  const here = WEST_LIFE_ZONES.filter(zone => zone.region === 'Isareos');
  assert.ok(here.length >= 5);
  const species = new Set(here.map(zone => zone.species));
  for (const name of ['red-deer', 'upland-hare', 'otter', 'turkey-vulture', 'longhorn', 'hill-sheep'])
    assert.ok(species.has(name), `Isareos has no ${name}`);
  // The stock is the one part of this country's fauna the lore names outright — "cattle and
  // sheep on grass that never dries out" — and it is loose, as every other country's is.
  const cattle = here.find(zone => zone.species === 'longhorn');
  const vastos = WEST_LIFE_ZONES.find(zone => zone.region === 'Vastos' && zone.species === 'longhorn');
  assert.ok(cattle.scale < vastos.scale * .85, 'the lore names no breed here: these are not the Vastos longhorn');
  assert.ok(here.some(zone => zone.species === 'hill-sheep'));
  // Every range says why it is there, and in Isareos every one of them is an extension:
  // the lore of this country names cattle and sheep and nothing wild at all.
  for (const zone of here) assert.ok(zone.note && zone.note.length > 40, `${zone.id} says nothing about why it is here`);
  // Hinds and stags are the same animal with a different head, not two species.
  const deer = here.filter(zone => zone.species === 'red-deer');
  assert.equal(deer.length, 2);
  assert.equal(deer.filter(zone => zone.hornless).length, 1, 'one band carries antlers and one does not');
  assert.ok(deer.find(zone => !zone.hornless).scale > deer.find(zone => zone.hornless).scale, 'and the stags are the bigger');
  // The otter is the Carica's at a larger size, which is what "great river otter" means here.
  const otter = here.find(zone => zone.species === 'otter');
  const carica = WEST_LIFE_ZONES.find(zone => zone.region === 'Caricas' && zone.species === 'otter');
  assert.ok(otter.scale > carica.scale * 1.1, 'the great river otter is the bigger animal');

  const life = createWestLife(scene, world);
  const mine = life.snapshot().creatures.filter(animal => animal.region === 'Isareos');
  assert.equal(mine.length, here.reduce((sum, zone) => sum + zone.sites.length, 0), 'every one of them found a place');
  for (const animal of mine) {
    const zone = here.find(item => animal.id.startsWith(`${item.id}-`));
    if (zone.air) continue;
    assert.equal(hexOwnerAt(animal.x, animal.z), 'Isareos', `${animal.id} strayed off the country`);
  }
  const player = { x: -2500, y: 0, z: -60 };
  for (let step = 0; step < 900; step++) life.update(1 / 30, player, true);
  for (const animal of life.snapshot().creatures) {
    const zone = WEST_LIFE_ZONES.find(item => animal.id.startsWith(`${item.id}-`));
    assert.ok(Number.isFinite(animal.x + animal.y + animal.z), `${animal.id} went to NaN`);
    assert.ok(animal.x >= zone.minX - .5 && animal.x <= zone.maxX + .5
      && animal.z >= zone.minZ - .5 && animal.z <= zone.maxZ + .5, `${animal.id} left its range`);
    if (!zone.air && !zone.sea && !zone.float) assert.ok(Math.abs(animal.groundY - world.heightAt(animal.x, animal.z)) < .05, `${animal.id} floats`);
  }
  // The vulture holds its circle a long way up and never comes down for anybody.
  const sky = here.find(zone => zone.air);
  for (const bird of life.snapshot().creatures.filter(animal => animal.id.startsWith(`${sky.id}-`))) {
    assert.equal(bird.action, 'soar');
    assert.ok(bird.y - world.heightAt(bird.x, bird.z) > 24, `it is only ${(bird.y - world.heightAt(bird.x, bird.z)).toFixed(0)} m up`);
  }
  life.dispose();
});

test('a red deer cannot be run down, and the country is charted, levelled and empty of people', () => {
  /**
   * The law `tests/west-life.test.js` holds for the whole west, spelled out for the animal
   * this country is for — and measured the way that file measures a cornered sheep, because
   * a deer does the same thing and for the same reason.
   *
   * A red deer runs at 10.5 m/s against a traveler's 7.2 and moves off at eighteen metres,
   * which is further than anything else in the west. Between the two it should never be got
   * near at all, and it is not: measured over twenty-five seconds of somebody running flat
   * out at one, the closest anybody gets is fifteen metres, where the Vastos and Meneth
   * hares — which pass the same law — are reached to four and a half.
   *
   * It took two wrong answers to get there and both are worth the next builder knowing.
   * The first deer had a small range and was cornered against its own edge in twenty
   * seconds. The second had a range three hundred and sixty metres across, and froze: a
   * flock is ticked from its centre, so the corner of a wide range is outside the reach it
   * is run from. See `tests/west-life.test.js`, "no band is given a range it can run out of
   * the reach of".
   */
  const RUN = 7.2, HZ = 60;
  const zone = WEST_LIFE_ZONES.find(item => item.id === 'isareos-hinds');
  const life = createWestLife(new THREE.Scene(), world);
  const band = () => life.snapshot().creatures.filter(animal => animal.id.startsWith(`${zone.id}-`));
  const first = band()[0], player = { x: first.x + 40, z: first.z };
  let closest = Infinity, ran = 0, ticks = 0;
  for (let i = 0; i < 25 * HZ; i++) {
    const at = band().find(animal => animal.id === first.id);
    const dx = at.x - player.x, dz = at.z - player.z, d = Math.hypot(dx, dz);
    if (d > .4) { const step = Math.min(d - .3, RUN / HZ); player.x += dx / d * step; player.z += dz / d * step; }
    life.update(1 / HZ, player, true);
    const now = band().find(animal => animal.id === first.id);
    closest = Math.min(closest, Math.hypot(now.x - player.x, now.z - player.z));
    ran = Math.max(ran, now.speed);
    if (now.speed > .1) ticks++;
  }
  assert.ok(ran > RUN, `a red deer at ${ran.toFixed(1)} m/s cannot outrun a man at ${RUN}`);
  assert.ok(closest > 8, `somebody running got within ${closest.toFixed(2)} m of a red deer`);
  // And it was running, rather than frozen out of its own flock's reach.
  assert.ok(ticks > 10 * HZ, `the band moved for only ${(ticks / HZ).toFixed(1)} s of twenty-five: it stopped being run`);
  life.dispose();

  const isareos = regions.find(region => region.name === 'Isareos');
  assert.deepEqual([...isareos.npcIds], [], 'terrain and wildlife only');
  for (const id of isareos.landmarks) assert.ok(world.landmarks.some(mark => mark.id === id), `the chart knows ${id}`);
  for (const mark of WEST_REGION_LANDMARKS.filter(item => isareos.landmarks.includes(item.id)))
    assert.equal(hexOwnerAt(mark.x, mark.z), 'Isareos', `${mark.id} stands outside Isareos`);
  assert.ok(SUBREGIONS.filter(area => area.region === 'Isareos').length >= 3);
  for (const area of SUBREGIONS.filter(item => item.region === 'Isareos'))
    assert.equal(hexOwnerAt(area.x, area.z), 'Isareos', `the chart puts ${area.id} outside Isareos`);
  assert.equal(regionBuildStatus('Isareos').playable, true);
  assert.equal(regionLevel('Isareos'), 3);
  assert.equal(levelWords(3), 'A hard country');
  for (const name of ['Vastos', 'Meneth', 'Caricas', 'Nesdor', 'Eer', 'Isareos'])
    assert.deepEqual([...regions.find(region => region.name === name).npcIds], [], `${name} places nobody`);
});
