import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { sourceModule } from './module-loader.js';
import * as THREE from '../vendor/three.module.js';
import { canStand } from '../src/gameplay/movement/game-state.js';
import { PLAYABLE_REGIONS, REGION_BIOMES } from '../src/world/terrain/region-layout.js';
import { PLAYABLE, WINDOW, ENCLOSED_HEXES } from '../scripts/build-region-survey.mjs';
import { LAND_HEXES } from '../src/dev/tools/region-survey.js';
import { RIVER_EDGES } from '../src/world/terrain/region-rivers.js';
import {
  REGION_CELLS, REGION_IDS, REGION_TERRAIN, WORLD_BOUNDS, hexCentre, hexOwnerAt, regionAt,
  regions, terrainMix, landDistance,
} from '../src/world/terrain/region-world.js';
import {
  MITHALA_RIVERS, MITHALA_MAIN, MITHALA_WEST_ARM, MITHALA_NORTH_BRAID, MITHALA_CELDER_WATER,
  MITHALA_EAST_HEAD, MITHALA_CROSS_BRAID, MITHALA_FAN, WEST_RIVERS, WEST_BRAIDS, WEST_REGION_NAMES,
  courseDistance,
} from '../src/content/regions/western-regions/west-regions.js';
import { WEST_PROFILES, westGroundAt, westWaterSurface } from '../src/content/regions/western-regions/west-ground.js';
import { groundWithRiver } from '../src/world/terrain/world-terrain.js';
import {
  MITHALA_REGIONS, MITHALA_CLIMATE, MITHALA_KOPPEN, SOUTH_MITHALA_CLIMATE, WEST_MITHALA_CLIMATE,
  EAST_MITHALA_CLIMATE, NORTH_MITHALA_CLIMATE, MITHALA_TILT, MITHALA_FLOOD, MITHALA_FEN,
  MITHALA_SWALE, MITHALA_SUMMER_CHANNELS, MITHALA_LANDMARKS, MITHALA_BOX,
  mithalaSlope, mithalaTilt, mithalaFlood, mithalaGround, mithalaWet, mithalaWeight, lotharnGate,
  onLevee, inBackswamp, onSummerFloor, nearestChannel, summerChannelPlace,
} from '../src/content/regions/mithala/mithala-world.js';
import { MITHALA_WILDLIFE_ZONES } from '../src/content/regions/mithala/mithala-wildlife.js';
import { DEFAULT_SKY, regionSky } from '../src/world/environment/region-sky.js';
import { SUBREGIONS } from '../src/ui/map/map-fog.js';
import { regionBuildStatus } from '../src/dev/tools/build-status.js';
import { regionLevel } from '../src/world/terrain/region-levels.js';
import { REGION_LANGUAGE, DIALECTS } from '../src/gameplay/skills/languages.js';
import { DEV_WORLD_DESTINATIONS } from '../src/dev/tools/developer-atlas.js';
import { MITHALA_CITY_LANDMARKS, MITHALA_STREETS, MITHALA_DISTRICTS, mithalaCityReserved, polygonDepth } from '../src/content/regions/mithala/mithala-city.js';

/**
 * The Mithala plain — South, West, East and North Mithala — built as terrain, climate, water,
 * scenery and wildlife and nothing that belongs to anybody (docs/mithala-brief.md, 29 September
 * 2026). One hundred and sixteen authored hexes over four countries, more than double any previous
 * job, and one landform.
 *
 * The standing rule is the user's: the atlas wins over the lore. So most of what is asserted below
 * is the atlas's own arithmetic — thirty-three hexes and twenty-eight and twenty-three and
 * thirty-two, forty-seven internal edges, twenty-five against the Lotharn, sixty-one new river edges
 * in thirteen chains with one outlet — and the four things this job had to get right that nothing
 * else could check:
 *
 *  1. **one climate over all four**, `Dfa`, the first properly continental country in the game, so
 *     the difference between the quarters is water and nothing else;
 *  2. **the world grew north**, from 37.00 hexes tall to 45.656, and every guard that pinned the old
 *     number now states each country's case;
 *  3. **the water falls**, on a plain whose whole relief is half a metre, six of whose eight channels
 *     are drawn on a border and four of those borders unbuilt;
 *  4. **nothing of either Lotharn's ground moved**, which is the one built neighbour this block has.
 *
 * Since 4 October 2026 one thing on it is somebody's: the city of Mithala at the meeting of the arms,
 * a quarter on each of the four (docs/mithala-city-brief.md). Its own tests are
 * tests/mithala-city.test.js and tests/mithala-city-world.test.js; here it is set apart from the
 * plain, which outside it is still nobody's.
 */
const { scopedWorld } = await import('./scoped-world.js');
const { WEST_LIFE_ZONES, LIFE_REACH } = await sourceModule('../src/content/regions/western-regions/west-regions-life.js');
const scene = new THREE.Scene();
const NAMES = ['South Mithala', 'West Mithala', 'East Mithala', 'North Mithala'];
const world = await scopedWorld(scene, [...NAMES, 'West Lotharn Mountains', 'East Lotharn Mountains'].map(name => REGION_IDS[name]));
const CELLS = Object.fromEntries(NAMES.map(name => [name, REGION_CELLS[name]]));
const ALL = NAMES.flatMap(name => CELLS[name]);
const g = (x, z) => groundWithRiver(x, z);
const own = (x, z) => NAMES.includes(hexOwnerAt(x, z));
const AXIAL = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const WWMAP = new URL('../../world-builder/map/resources/examples/azhora.wwmap', import.meta.url);
const ATLAS = JSON.parse(readFileSync(new URL('../assets/azhora-dev-regions.json', import.meta.url), 'utf8'));

test('the atlas: four countries, 116 authored hexes and one the atlas forgot, and one river system', () => {
  // The atlas's own counts, region by region. The enclosed hex is South Mithala's thirty-fourth and
  // is not in these: it is the one the World Builder map paints `hills` and leaves unclaimed.
  const authored = Object.fromEntries(ATLAS.regions.map(region => [region.name ?? region.id, region.cells]));
  assert.equal(authored['South Mithala'].length, 33);
  assert.equal(authored['West Mithala'].length, 28);
  assert.equal(authored['East Mithala'].length, 23);
  assert.equal(authored['North Mithala'].length, 32);
  assert.equal(ALL.length, 117, '116 authored hexes and the one enclosed by South Mithala');
  const terrain = name => CELLS[name].reduce((tally, cell) => ({ ...tally, [cell.terrain]: (tally[cell.terrain] ?? 0) + 1 }), {});
  assert.deepEqual(terrain('South Mithala'), { grassland: 10, plains: 19, hills: 5 });
  assert.deepEqual(terrain('West Mithala'), { plains: 4, grassland: 24 });
  // Two plains hexes in from North Mithala and two grassland out to it, in the user's trade of
  // 4 October 2026 that puts all four countries round the city (`mithala-city-quarters-v1`).
  assert.deepEqual(terrain('East Mithala'), { plains: 14, grassland: 9 });
  assert.deepEqual(terrain('North Mithala'), { plains: 20, grassland: 12 });
  // **No mountain hex anywhere, and the five `hills` are the only relief the atlas asks for.**
  assert.equal(ALL.filter(cell => cell.terrain === 'mountain').length, 0, 'this is a plain');
  // The enclosed hex, and the reason it is held: ringed by South Mithala on all six sides, `hills`
  // on the World Builder map, and unclaimed in the atlas export.
  assert.deepEqual(ENCLOSED_HEXES['South Mithala'], [[5, 92, 'hills']]);
  const owner = new Map();
  for (const region of ATLAS.regions) for (const cell of region.cells) owner.set(`${cell.q},${cell.r}`, region.name ?? region.id);
  assert.equal(owner.get('5,92'), undefined, 'the atlas leaves it unclaimed');
  for (const [dq, dr] of AXIAL) assert.equal(owner.get(`${5 + dq},${92 + dr}`), 'South Mithala');
  // And with it held, the ground there is the plain's and not the sea's: it read 0.6 m before.
  const hole = hexCentre(5, 92);
  assert.ok(new Set(LAND_HEXES.map(([q, r]) => `${q},${r}`)).has('5,92'), 'the coast field calls it land');
  assert.ok(g(hole.x, hole.z) > 14, `the enclosed hex stands at ${g(hole.x, hole.z).toFixed(1)} m, on the apron`);
  assert.ok(landDistance(hole.x, hole.z) > 300, 'and it is nowhere near a shore');

  // **The neighbour tables**, read off the survey rather than written down.
  const edges = name => {
    const tally = {};
    for (const cell of CELLS[name]) for (const [dq, dr] of AXIAL) {
      const centre = hexCentre(cell.q + dq, cell.r + dr), at = hexOwnerAt(centre.x, centre.z);
      if (at === name) continue;
      tally[at ?? 'unbuilt'] = (tally[at ?? 'unbuilt'] ?? 0) + 1;
    }
    return tally;
  };
  const south = edges('South Mithala');
  assert.equal(south['East Lotharn Mountains'], 15);
  assert.equal(south['West Lotharn Mountains'], 10);
  assert.equal(south['East Mithala'], 16);
  assert.equal(south['West Mithala'], 8);
  // The trade moved four of West Mithala's edges from East to North Mithala: East and West now meet
  // on one edge only, the braid's last fifty-eight metres into the meeting, inside the city.
  assert.equal(edges('West Mithala')['North Mithala'], 11);
  assert.equal(edges('West Mithala')['East Mithala'], 1);
  assert.equal(edges('East Mithala')['North Mithala'], 11);
  // Forty-seven internal edges, counted once each: the reason this is one job and one module. It was
  // forty-nine until the city trade: four East-North edges became North Mithala's own ground and two
  // new ones opened round the Braid Bank.
  const internal = NAMES.reduce((sum, name) => sum + NAMES.reduce((part, other) => part + (edges(name)[other] ?? 0), 0), 0);
  assert.equal(internal / 2, 47, 'forty-seven hex edges among the four');
  // Twenty-five against built country when the plain was built, and the Lotharn was the whole of it. The two
  // Celders were built against the plain's western margin on 3 October 2026: North Celder along twelve of West
  // Mithala's edges and six of South Mithala's, South Celder along one. Henborth was registered on 4 October 2026
  // north of the plain: eight of West Mithala's edges and six of North Mithala's. Nothing else built touches the four.
  assert.equal(south['East Lotharn Mountains'] + south['West Lotharn Mountains'], 25);
  const later = { 'West Mithala': { 'North Celder': 12, Henborth: 8 }, 'South Mithala': { 'North Celder': 6, 'South Celder': 1 },
    'North Mithala': { Henborth: 6, 'West Acorwood': 8, 'Acor Wetlands': 12 },
    'East Mithala': { 'West Acorwood': 3, 'South Acordwood': 4 } };
  for (const [name, counts] of Object.entries(later)) for (const [built, n] of Object.entries(counts))
    assert.equal(edges(name)[built], n, `${name} meets ${built} on ${n} edges`);
  for (const name of ['West Mithala', 'East Mithala', 'North Mithala'])
    for (const built of PLAYABLE_REGIONS) {
      if (NAMES.includes(built) || later[name]?.[built]) continue;
      assert.equal(edges(name)[built], undefined, `${name} touches no other built country`);
    }

  // **The water.** Sixty-one new river edges came in with these four names, in thirteen chains.
  const mine = new Set(ALL.map(cell => `${cell.q},${cell.r}`));
  const touching = RIVER_EDGES.filter(edge => mine.has(edge.a.join(',')) || mine.has(edge.b.join(',')));
  assert.ok(touching.length >= 75, `${touching.length} authored river edges touch the plain`);
  assert.equal(RIVER_EDGES.filter(edge => edge.regions.every(region => NAMES.includes(region))).length >= 40, true);
});

test('the climate is Dfa on every one of the 116 hexes, and it is the first continental country in the game', () => {
  assert.equal(MITHALA_KOPPEN, 'Dfa');
  assert.equal(Object.keys(MITHALA_CLIMATE).length, 116, 'one code per authored hex');
  assert.ok(Object.values(MITHALA_CLIMATE).every(code => code === 'Dfa'), 'and it is the same code');
  assert.equal(Object.keys(SOUTH_MITHALA_CLIMATE).length, 33);
  assert.equal(Object.keys(WEST_MITHALA_CLIMATE).length, 28);
  assert.equal(Object.keys(EAST_MITHALA_CLIMATE).length, 23);
  assert.equal(Object.keys(NORTH_MITHALA_CLIMATE).length, 32);
  // Nothing built before this is `D` anything: everything is `Cfa`, `Csa`, `Csb` or `BSh`, with one
  // `Dfa` hex at the West Lotharn's western tip. This block is 116 of them.
  if (!existsSync(WWMAP)) return;
  const map = JSON.parse(readFileSync(WWMAP, 'utf8').replace(/^﻿/, ''));
  for (const [key, code] of Object.entries(MITHALA_CLIMATE))
    assert.equal(map.hexes[key]?.climate, code, `the World Builder map says ${map.hexes[key]?.climate} at ${key}`);
  // Every authored hex is in the table, and the enclosed one is not (the atlas does not own it).
  for (const cell of ALL) {
    const key = `${cell.q},${cell.r}`;
    if (key === '5,92') { assert.equal(MITHALA_CLIMATE[key], undefined); continue; }
    assert.equal(MITHALA_CLIMATE[key], 'Dfa', key);
  }
  // The neighbours, for the record: the whole of this quarter of the continent is continental.
  const codeOf = name => ATLAS.regions.find(region => (region.name ?? region.id) === name)
    .cells.map(cell => map.hexes[`${cell.q},${cell.r}`]?.climate);
  assert.ok(codeOf('Henborth').every(code => code === 'Dfa'), 'Henborth is Dfa throughout');
  assert.ok(codeOf('Acor Wetlands').every(code => code.startsWith('D')), 'the wetlands are colder still');
});

test('the expanded world still contains the whole Mithala plain and its northern neighbors', () => {
  // World bounds now include the northern islands, Eshtor and the Ibenals. Keep this
  // test about Mithala's coverage; global atlas tests own the expanded world's extents.
  for (const cell of ALL) {
    assert.ok(cell.x - 58 > WORLD_BOUNDS.minX && cell.x + 58 < WORLD_BOUNDS.maxX);
    assert.ok(cell.z - 58 > WORLD_BOUNDS.minZ && cell.z + 58 < WORLD_BOUNDS.maxZ);
    assert.ok(cell.q >= WINDOW.minQ && cell.q <= WINDOW.maxQ && cell.r >= WINDOW.minR && cell.r <= WINDOW.maxR);
  }
  assert.equal(Math.min(...CELLS['North Mithala'].map(cell => cell.r)), 82);
  assert.ok(Math.min(...CELLS['North Mithala'].map(cell => cell.z)) < Math.min(...CELLS['East Mithala'].map(cell => cell.z)));
  assert.ok(WORLD_BOUNDS.minX < MITHALA_BOX.minX && WORLD_BOUNDS.maxX > MITHALA_BOX.maxX);
  assert.ok(WORLD_BOUNDS.minZ < MITHALA_BOX.minZ && WORLD_BOUNDS.maxZ > MITHALA_BOX.maxZ);
  const inWindow = cell => cell.q >= WINDOW.minQ && cell.q <= WINDOW.maxQ && cell.r >= WINDOW.minR && cell.r <= WINDOW.maxR;
  for (const name of ['Acor Wetlands', 'Henborth', 'South Acordwood', 'West Acorwood', 'Narcosh']) {
    const cells = ATLAS.regions.find(region => (region.name ?? region.id) === name).cells;
    assert.ok(cells.length && cells.every(inWindow), `${name} remains inside the land survey`);
  }
});

test('one plain, one profile: the four quarters share their terrain numbers and their wavelength', () => {
  const profiles = NAMES.map(name => REGION_TERRAIN[name]);
  const plains = profiles.map(profile => profile.byTerrain?.plains ?? profile);
  const grass = profiles.map(profile => profile.byTerrain?.grassland ?? profile);
  for (const set of [plains, grass]) for (const profile of set) {
    assert.equal(profile.base, set[0].base, 'the same base in all four');
    assert.equal(profile.amp, set[0].amp);
    assert.equal(profile.wave, 320, 'and all on one wavelength');
  }
  assert.equal(REGION_TERRAIN['South Mithala'].byTerrain.hills.wave, 320, 'the apron too');
  // The flattest large country in the game after the Moros: half a metre of relief on the plains.
  assert.ok(plains[0].amp <= .5 && grass[0].amp <= .8);
  assert.ok(plains[0].amp < REGION_TERRAIN.Eer.amp, 'flatter than Eer, which was the flattest');
  // The grass stands back from the braids on older ground; the plains are what the flood levelled.
  assert.ok(grass[0].base > plains[0].base);
  assert.ok(REGION_TERRAIN['South Mithala'].byTerrain.hills.base > grass[0].base + 10, 'the apron is a swell you can see across');
  // **The whole fall of the plain is a landform and not a profile**, which is what keeps the
  // forty-nine internal seams quiet.
  const seams = [];
  for (const name of NAMES) for (const cell of CELLS[name]) for (const [dq, dr] of AXIAL) {
    const centre = hexCentre(cell.q + dq, cell.r + dr), at = hexOwnerAt(centre.x, centre.z);
    if (at === name || !NAMES.includes(at)) continue;
    for (let t = -60; t <= 60; t += 4) {
      const x = (cell.x + centre.x) / 2 + (centre.x - cell.x) / 100 * t;
      const z = (cell.z + centre.z) / 2 + (centre.z - cell.z) / 100 * t;
      seams.push(Math.max(Math.abs(g(x + 2, z) - g(x, z)), Math.abs(g(x, z + 2) - g(x, z))));
    }
  }
  const worst = Math.max(...seams);
  assert.ok(worst < 2.2, `the steepest two-metre step on any internal seam is ${worst.toFixed(2)} m`);
});

test('the tilt is the only reason the water goes anywhere, and every channel falls the whole way', () => {
  // Eight metres of easting over fourteen hundred and fifty, two and two fifths of northing over
  // nine hundred and fifty: the pivot is the meeting of the arms.
  assert.equal(MITHALA_TILT.pivotX, -1700);
  assert.equal(MITHALA_TILT.pivotZ, -1414);
  assert.ok(Math.abs(mithalaSlope(-1700, -1414)) < 1e-9, 'nothing at the meeting');
  assert.ok(mithalaSlope(-2400, -1414) > 3.8 && mithalaSlope(-2400, -1414) < 4.2, 'about four metres at the western rim');
  assert.ok(mithalaSlope(-950, -1414) < -4, 'and below the meeting at the mouth');
  assert.ok(mithalaSlope(-1700, -2049) > 1.5, 'the northern shelf stands above it');
  // Nowhere does the plain write more than five metres of its own on to anybody's border.
  let biggest = 0;
  for (const cell of ALL) biggest = Math.max(biggest, Math.abs(mithalaSlope(cell.x, cell.z)));
  assert.ok(biggest < 5, `the tilt is ${biggest.toFixed(2)} m at its extreme`);

  // **Every channel falls from its head to its mouth, sample by sample.**
  for (const course of MITHALA_RIVERS) {
    const profile = WEST_PROFILES.get(course.id);
    for (let i = 1; i < profile.length; i++)
      assert.ok(profile[i].surface <= profile[i - 1].surface + 1e-9, `${course.id} climbs at sample ${i}`);
    assert.ok(profile[0].surface > profile.at(-1).surface, `${course.id} falls`);
    // And the water it draws is water the ground was cut for: never above its own banks.
    for (const sample of profile) {
      if (!sample.strength) continue;
      assert.ok(westGroundAt(sample.x, sample.z) <= sample.surface + .01,
        `${course.id} floats at ${sample.x.toFixed(0)}, ${sample.z.toFixed(0)}`);
    }
  }
  // **And the arms arrive at or above the channel they join**, which is the thing the swale and the
  // hand-over were both for. The west arm ends exactly at the main channel's head (`headOf`).
  const main = WEST_PROFILES.get(MITHALA_MAIN.id), arm = WEST_PROFILES.get(MITHALA_WEST_ARM.id);
  const braid = WEST_PROFILES.get(MITHALA_NORTH_BRAID.id);
  assert.ok(Math.abs(main[0].surface - arm.at(-1).surface) < 1e-9, 'the main channel starts at the west arm’s own level');
  assert.ok(braid.at(-1).surface >= main[0].surface - .01, 'and the north braid comes in above it');
  assert.equal(MITHALA_MAIN.headOf, 'mithala-west-arm');
  // The tributaries stop at their parent's bank rather than in the middle of it.
  assert.ok(courseDistance(MITHALA_WEST_ARM, ...Object.values(MITHALA_CELDER_WATER.points.at(-1)), 40) > 7);
  assert.ok(courseDistance(MITHALA_NORTH_BRAID, ...Object.values(MITHALA_EAST_HEAD.points.at(-1)), 40) > 5);
  assert.ok(courseDistance(MITHALA_NORTH_BRAID, ...Object.values(MITHALA_CROSS_BRAID.points.at(-1)), 40) > 6);
  // The main channel reaches the sea and stops where the beach starts.
  const mouth = MITHALA_MAIN.points.at(-1);
  assert.ok(landDistance(mouth.x, mouth.z) < 50, `the mouth stops ${landDistance(mouth.x, mouth.z).toFixed(0)} m inland`);
  assert.ok(landDistance(MITHALA_MAIN.points[0].x, MITHALA_MAIN.points[0].z) > 150, 'and its head is a long way from it');
});

test('the levees stand above the plain and the backswamps lie below it, which is what a flood plain is', () => {
  // The ground is highest at the water and lowest halfway to the next channel. Measured across the
  // main channel in South Mithala, on the levee and two hundred metres back.
  const sample = WEST_PROFILES.get(MITHALA_MAIN.id).find(one => one.along > .5);
  for (const side of [-1, 1]) {
    const at = d => ({ x: sample.x + sample.nx * d * side, z: sample.z + sample.nz * d * side });
    const crest = at(sample.half + 6), back = at(170);
    if (!own(crest.x, crest.z) || !own(back.x, back.z)) continue;
    assert.ok(g(crest.x, crest.z) > g(back.x, back.z),
      `the bank stands ${(g(crest.x, crest.z) - g(back.x, back.z)).toFixed(2)} m over the ground behind it`);
  }
  // The levee is scaled by the channel's own width: the main channel's is the full crest and the
  // fan's a fraction of it, because a bank is made of what the river carried.
  assert.ok(MITHALA_FLOOD.crest > 1 && MITHALA_FLOOD.crest < 1.6);
  const mainBank = Math.max(...WEST_PROFILES.get(MITHALA_MAIN.id).slice(40, 120)
    .map(one => mithalaFlood(one.x + one.nx * (one.half + 4), one.z + one.nz * (one.half + 4))));
  const fanBank = Math.max(...WEST_PROFILES.get(MITHALA_FAN[0].id)
    .map(one => mithalaFlood(one.x + one.nx * (one.half + 4), one.z + one.nz * (one.half + 4))));
  assert.ok(mainBank > fanBank * 1.8, `the main channel's bank is ${mainBank.toFixed(2)} against the fan's ${fanBank.toFixed(2)}`);
  // `onLevee` and `inBackswamp` are what the scenery and the tint read, and they are exclusive.
  for (const cell of ALL) for (const [dx, dz] of [[0, 0], [30, 30], [-30, -30]]) {
    const x = cell.x + dx, z = cell.z + dz;
    assert.ok(!(onLevee(x, z) > .05 && inBackswamp(x, z) > .05), `both at ${x}, ${z}`);
  }
  // The fen: the northern margin falls, and it falls on the wetland side only.
  assert.ok(mithalaWet(-1850, -2040) > .5, 'the wetland margin is wet');
  assert.equal(mithalaWet(-1380, -1870), 0, 'the Acorwood margin is not: a forest grows on ground');
  assert.ok(MITHALA_FEN.drop > 2 && MITHALA_FEN.drop < 3);
  assert.ok(g(-1850, -2040) < g(-1850, -1880), 'the plain falls into the fen');
  // The braid heads are on the divide: the ground north of them is lower and goes to the wetlands.
  const heads = MITHALA_NORTH_BRAID.points[0];
  assert.ok(g(heads.x, heads.z - 220) < g(heads.x, heads.z), 'north of the heads the ground falls away');
});

test('the summer channels are cut beds with no water in any of them', () => {
  assert.equal(MITHALA_SUMMER_CHANNELS.length, 4, 'one to a country');
  assert.deepEqual(MITHALA_SUMMER_CHANNELS.map(channel => channel.region).sort(), [...NAMES].sort());
  for (const channel of MITHALA_SUMMER_CHANNELS) {
    const middle = channel.points[Math.floor(channel.points.length / 2)];
    assert.equal(hexOwnerAt(middle.x, middle.z), channel.region, `${channel.id} is on its own country`);
    assert.equal(westWaterSurface(middle.x, middle.z), null, `${channel.id} has water in it`);
    assert.ok(onSummerFloor(middle.x, middle.z), `${channel.id} is not cut deep enough to be one`);
    // A traveler walks down the middle of any of them.
    assert.ok(canStand(middle.x, middle.z, world, .5), `${channel.id} cannot be walked`);
    // And the floor is below the ground beside it, measured across the bed and not along it.
    const a = channel.points[Math.floor(channel.points.length / 2) - 1], b = channel.points[Math.floor(channel.points.length / 2) + 1];
    const length = Math.hypot(b.x - a.x, b.z - a.z), nx = -(b.z - a.z) / length, nz = (b.x - a.x) / length;
    let banks = 0;
    for (const side of [-1, 1]) {
      const x = middle.x + nx * (channel.bank + 7) * side, z = middle.z + nz * (channel.bank + 7) * side;
      if (g(middle.x, middle.z) < g(x, z) - .3) banks++;
    }
    assert.ok(banks === 2, `${channel.id} has ${banks} banks and a cut has two`);
  }
});

test('neither Lotharn moves: the one built neighbour this block has, over twenty-five hex edges', () => {
  // The rule is the plain one — neither side writes ground outside its own hexes — and here it
  // needed a gate of its own, because the tilt and the levees are deliberately let reach past the
  // border to follow a river drawn on one. `lotharnGate` is nothing wherever either range is more
  // than four tenths of the blend.
  for (const range of ['East Lotharn Mountains', 'West Lotharn Mountains']) {
    let worst = 0, at = null;
    for (const cell of REGION_CELLS[range]) for (let dx = -45; dx <= 45; dx += 9) for (let dz = -45; dz <= 45; dz += 9) {
      const x = cell.x + dx, z = cell.z + dz;
      if (hexOwnerAt(x, z) !== range) continue;
      const written = Math.abs(mithalaGround(x, z, 100) - 100);
      if (written > worst) { worst = written; at = [x, z]; }
    }
    assert.ok(worst < .35, `${range}: the Mithala writes ${worst.toFixed(2)} m at ${at}`);
  }
  // The gate is shut outright at every Lotharn hex centre the plain can see at all, which is what
  // `LOTHARN_KEEP.keep` being a hex half-width buys: a point nearer than that to a mountain hex's
  // middle is that hex's. (Further off, the gate answers 1 and `mithalaGround` never asks it,
  // because the point is outside the plain's own box.)
  for (const range of ['East Lotharn Mountains', 'West Lotharn Mountains'])
    for (const cell of REGION_CELLS[range]) {
      const seen = cell.x > MITHALA_BOX.minX && cell.x < MITHALA_BOX.maxX
        && cell.z > MITHALA_BOX.minZ && cell.z < MITHALA_BOX.maxZ;
      if (seen) assert.equal(lotharnGate(cell.x, cell.z), 0, `${range} at ${cell.q},${cell.r}`);
    }
  // And the plain keeps its own: the worst any of its hex centres loses to the gate is a fifth.
  let lowest = 1;
  for (const name of NAMES) for (const cell of CELLS[name]) lowest = Math.min(lowest, lotharnGate(cell.x, cell.z));
  assert.ok(lowest > .7, `a Mithala hex centre is gated to ${lowest.toFixed(2)}`);
  // The seam itself reads as a mountain front over a plain, which is what the atlas draws when it
  // puts `mountain` and `hills` hexes against `plains` at ten metres.
  const front = [];
  for (const cell of CELLS['South Mithala']) for (const [dq, dr] of AXIAL) {
    const centre = hexCentre(cell.q + dq, cell.r + dr), at = hexOwnerAt(centre.x, centre.z);
    if (at !== 'West Lotharn Mountains' && at !== 'East Lotharn Mountains') continue;
    front.push(g(centre.x, centre.z) - g(cell.x, cell.z));
  }
  assert.ok(Math.max(...front) > 60, 'the range stands over the plain');
  assert.ok(front.every(step => step > -10), 'and nowhere does the plain stand over the range');
});

test('the plain is walkable all round without crossing the main channel, which is a wall below its ford', () => {
  // The house rule for a medium river: waded over the gravel of its first third, deep below.
  assert.equal(MITHALA_MAIN.fordUntil, .30);
  for (const course of MITHALA_RIVERS) if (course !== MITHALA_MAIN)
    assert.equal(course.fordUntil, 1, `${course.id} should be waded anywhere`);
  const walled = world.colliders.filter(collider => collider.kind === 'west-deep-water'
    && collider.x > MITHALA_BOX.minX && collider.x < MITHALA_BOX.maxX
    && collider.z > MITHALA_BOX.minZ && collider.z < MITHALA_BOX.maxZ);
  assert.ok(walled.length > 400, `${walled.length} deep-water blockers on the main channel`);
  // A flood fill on an eight-metre lattice from the middle of West Mithala: every country is
  // reached, and South Mithala and East Mithala are reached by going round the meeting rather than
  // across the water, because nothing crosses the main channel below its ford.
  const STEP = 8;
  const minX = Math.round(MITHALA_BOX.minX / STEP) * STEP, minZ = Math.round(MITHALA_BOX.minZ / STEP) * STEP;
  const cols = Math.ceil((MITHALA_BOX.maxX - minX) / STEP) + 1, rows = Math.ceil((MITHALA_BOX.maxZ - minZ) / STEP) + 1;
  const seen = new Uint8Array(cols * rows);
  const start = regions.find(region => region.name === 'West Mithala').spawn;
  const stack = [[Math.round((start.x - minX) / STEP), Math.round((start.z - minZ) / STEP)]];
  const reached = new Set();
  seen[stack[0][1] * cols + stack[0][0]] = 1;
  while (stack.length) {
    const [i, j] = stack.pop();
    const x = minX + i * STEP, z = minZ + j * STEP;
    const at = hexOwnerAt(x, z);
    if (NAMES.includes(at)) reached.add(at);
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= cols || nj >= rows || seen[nj * cols + ni]) continue;
      const nx = minX + ni * STEP, nz = minZ + nj * STEP;
      seen[nj * cols + ni] = 1;
      if (!canStand(nx, nz, world, .5)) continue;
      if (Math.abs(g(nx, nz) - g(x, z)) > 3.2) continue;
      stack.push([ni, nj]);
    }
  }
  for (const name of NAMES) assert.ok(reached.has(name), `${name} cannot be walked to from West Mithala`);
});

test('what grows: a gallery on the water, tall prairie between, and not one evergreen', () => {
  const metrics = world.mithalaMetrics;
  assert.ok(metrics.grass > 20000, `${metrics.grass} tufts of prairie grass`);
  assert.ok(metrics.forbs > 1500, `${metrics.forbs} prairie forbs`);
  assert.ok(metrics.trees > 150 && metrics.trees < 1200, `${metrics.trees} trees, and the plain is not a wood`);
  assert.ok(metrics.reeds > 1500 && metrics.sedge > 400 && metrics.bars > 100 && metrics.silt > 200);
  assert.ok(metrics.water >= 8, 'every channel draws a ribbon');
  // **Every tree on the plain stands on water or on the Acorwood margin, and nowhere else.**
  const trees = world.colliders.filter(collider => collider.kind === 'mithala-tree');
  assert.ok(trees.length > 150);
  const FOREST_CORNER = { x: -1700, z: -1500 };
  for (const tree of trees) {
    const near = Math.min(...MITHALA_RIVERS.map(course => courseDistance(course, tree.x, tree.z, 60)));
    const margin = tree.x > FOREST_CORNER.x && tree.z < FOREST_CORNER.z;
    assert.ok(near < 40 || margin, `a tree stands ${near.toFixed(0)} m from any water at ${tree.x.toFixed(0)}, ${tree.z.toFixed(0)}`);
  }
  // Nothing grows in the water or on a dry channel's floor.
  for (const tree of trees) {
    assert.equal(westWaterSurface(tree.x, tree.z), null, 'a tree stands in the river');
    assert.ok(!onSummerFloor(tree.x, tree.z), 'a tree stands in a summer channel');
  }
  // The biomes carry no conifer and no per-hex tree count: the scatter here is its own.
  for (const name of NAMES) {
    assert.equal(REGION_BIOMES[name].ownScatter, true);
    assert.equal(REGION_BIOMES[name].treesPerHex, 0);
    assert.equal(REGION_BIOMES[name].rocksPerHex, 0);
  }
});

test('what lives here: nineteen ranges, one new rig, and none of it is anybody’s', () => {
  assert.equal(MITHALA_WILDLIFE_ZONES.length, 19, 'the most populous country in the game');
  for (const zone of MITHALA_WILDLIFE_ZONES) {
    assert.ok(NAMES.includes(zone.region), zone.id);
    assert.equal(zone.keepRegion, true);
    assert.ok(zone.note.length > 120, `${zone.id} says why it is there`);
    assert.ok(WEST_LIFE_ZONES.includes(zone), `${zone.id} is spread into the west's list`);
    // Half a range's diagonal has to be inside the reach the flock is ticked from.
    assert.ok(Math.hypot(zone.maxX - zone.minX, zone.maxZ - zone.minZ) / 2 < LIFE_REACH, `${zone.id} is too big`);
    for (const [x, z] of zone.sites) {
      assert.ok(x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ, `${zone.id} site outside its range`);
      assert.equal(regionAt(x, z)?.name, zone.region, `${zone.id} at ${x}, ${z}`);
      assert.equal(hexOwnerAt(x, z), zone.region, `${zone.id} at ${x}, ${z}`);
      assert.ok(canStand(x, z, world, zone.radius), `${zone.id} cannot stand at ${x}, ${z}`);
      assert.ok(!onSummerFloor(x, z, 1), `${zone.id} stands in a dry channel`);
      if (zone.float) assert.ok(westWaterSurface(x, z) !== null, `${zone.id} floats on dry land`);
      else assert.equal(westWaterSurface(x, z), null, `${zone.id} stands in the water`);
    }
  }
  // **The frostback buffalo is the one new rig**, and it is wild: the lore is explicit that it is
  // not stock. Three bands, which is what a species with a continental circuit looks like here.
  const frostback = MITHALA_WILDLIFE_ZONES.filter(zone => zone.species === 'frostback');
  assert.equal(frostback.length, 3);
  assert.equal(new Set(frostback.map(zone => zone.region)).size, 3, 'one to a country, and not the same country');
  for (const zone of frostback) assert.match(zone.note, /wild|not domestic|circuit/i);
  // No domestic stock anywhere: the river-horn is the animal this plain is about and it is somebody's.
  const DOMESTIC = new Set(['longhorn', 'hill-sheep', 'nethrani-cattle']);
  for (const zone of MITHALA_WILDLIFE_ZONES) assert.ok(!DOMESTIC.has(zone.species), `${zone.id} is stock`);
  // Every species is either a rig the game already had or the one new one.
  const RIGS = new Set(['boar', 'duck', 'egret', 'goose', 'harrier', 'otter', 'plateau-hawk', 'red-deer',
    'river-fox', 'stilt', 'turkey-vulture', 'upland-hare', 'wading-bird', 'frostback']);
  for (const zone of MITHALA_WILDLIFE_ZONES) assert.ok(RIGS.has(zone.species), `${zone.species} is not a rig`);
  // The three Plains predators the overview names are deliberately absent.
  for (const zone of MITHALA_WILDLIFE_ZONES)
    assert.ok(!/hunt-hound|grass-lion|wolf/.test(zone.species), 'no predator stands about in the open');
});

test('nobody lives here yet: no people, one made place - the city at the meeting - and the chart says what is built', () => {
  for (const [index, name] of NAMES.entries()) {
    assert.equal(REGION_IDS[name], 28 + index, `${name} is ${28 + index}`);
    // Appended, never inserted - the rule `world-regions.js`'s one seeded scatter stream depends on.
    // It used to read `PLAYABLE_REGIONS.length - 4 + index`, which said "last four in the list" when
    // it meant "after everything that was there before"; the four southwestern countries went on the
    // end afterwards and it failed. This is the same assertion the West Lotharn builder had to
    // rewrite in tests/oves-world.test.js and the Mithala builder in tests/west-lotharn-world.test.js.
    const at = PLAYABLE_REGIONS.indexOf(name);
    assert.equal(at, PLAYABLE_REGIONS.indexOf('South Mithala') + index, 'appended, never inserted');
    for (const later of PLAYABLE_REGIONS.slice(at + 1)) assert.ok(REGION_IDS[later] > REGION_IDS[name], `${later} was inserted before ${name}`);
    assert.equal(PLAYABLE.indexOf(name), PLAYABLE.indexOf('South Mithala') + index, 'and in the survey in the same order');
    const region = regions.find(one => one.name === name);
    assert.deepEqual(region.npcIds, []);
    assert.equal(WEST_REGION_NAMES.includes(name), true);
    assert.equal(regionBuildStatus(name).state, 'early');
    assert.ok(/nobody|Everybody/.test(regionBuildStatus(name).work), `${name} says what is missing`);
    // The spawn is dry, standable, and this country's own.
    assert.equal(hexOwnerAt(region.spawn.x, region.spawn.z), name, `${name}'s spawn`);
    assert.equal(westWaterSurface(region.spawn.x, region.spawn.z), null);
    assert.ok(canStand(region.spawn.x, region.spawn.z, world, .5), `${name}'s spawn is not on ground`);
    // Landmarks, map-fog areas and a developer destination each.
    assert.ok(region.landmarks.length >= 4, `${name} has landmarks`);
    // The plain's own places, and since 4 October 2026 the city's (src/content/regions/mithala/mithala-city.js) in whichever country each stands.
    for (const id of region.landmarks)
      assert.ok(MITHALA_LANDMARKS.some(mark => mark.id === id) || MITHALA_CITY_LANDMARKS.some(mark => mark.id === id && mark.region === name),
        `${name} names ${id} and nothing defines it`);
    assert.ok(SUBREGIONS.filter(area => area.region === name).length >= 4, `${name} has chart areas`);
    assert.ok(DEV_WORLD_DESTINATIONS.some(destination => destination.regionId === name));
  }
  assert.deepEqual(NAMES.map(name => regionLevel(name)), [3, 3, 4, 4], 'the levels region-levels.js already carried');
  // **Nothing anybody made stands on this ground but the city.** The landmarks talk about the
  // villages, the barges and the grain a good deal — a country whose whole lore is one farming system
  // cannot be described without them, and several of them say in as many words that none of it is
  // here — so the test is not the words but the world. Since 4 October 2026 one place on the plain is
  // somebody's: Mithala, the city at the meeting of the arms, a quarter on each of the four countries
  // (src/content/regions/mithala/mithala-city.js, docs/mithala-city-brief.md; tests/mithala-city-world.test.js walks it). So the
  // city's own ground is set apart, and outside it nothing has changed: inside the plain's box the only
  // things this build puts in anybody's way are trees and deep water, there is no sign, and the only
  // roads are the city's own streets, which stop at the plain's edge of their approaches.
  const insideBox = item => item.x > MITHALA_BOX.minX && item.x < MITHALA_BOX.maxX
    && item.z > MITHALA_BOX.minZ && item.z < MITHALA_BOX.maxZ && own(item.x, item.z);
  // The city's barges are moored on the water off its quay, a metre or two outside the reserved ground: they are the city's.
  const onCity = item => mithalaCityReserved(item.x, item.z) || item.kind === 'mithala-barge';
  const kinds = new Set(world.colliders.filter(collider => insideBox(collider) && !onCity(collider)).map(collider => collider.kind));
  assert.deepEqual([...kinds].sort(), ['mithala-tree', 'west-deep-water'], `the plain off the city carries ${[...kinds].join(', ')}`);
  const city = world.colliders.filter(collider => insideBox(collider) && onCity(collider));
  assert.ok(city.length > 100, `the city stands at the meeting (${city.length} colliders on its ground)`);
  assert.equal(city.filter(collider => collider.kind === 'mithala-tree').length, 0, 'and no tree of the plain stands on it');
  assert.equal((world.signs ?? []).filter(sign => insideBox(sign) && !onCity(sign)).length, 0, 'no sign anywhere on the plain');
  const key = points => points.map(p => `${p.x},${p.z}`).join(' ');
  const roads = (world.paths ?? []).filter(path => (path ?? []).some(insideBox));
  assert.deepEqual(roads.map(key).sort(), MITHALA_STREETS.map(street => key(street.points)).sort(), 'the only roads are the city’s streets');
  for (const path of roads) for (const p of path)
    assert.ok(MITHALA_DISTRICTS.some(district => polygonDepth(district.outline, p.x, p.z) > -30), `a street runs out to ${p.x}, ${p.z}`);
  assert.equal(MITHALA_LANDMARKS.length, 18);
  for (const mark of MITHALA_LANDMARKS) {
    assert.ok(mark.description.length > 80, mark.id);
    assert.ok(own(mark.x, mark.z) || NAMES.includes(regionAt(mark.x, mark.z)?.name), `${mark.id} is off the plain`);
  }
});

test('one sky and one dialect over all four, because the plain’s own divisions are channels', () => {
  const skies = NAMES.map(name => regionSky(regions.find(one => one.name === name)));
  for (const sky of skies) {
    assert.deepEqual({ ...sky }, { ...skies[0] }, 'one horizon over the whole plain');
    assert.notDeepEqual({ ...sky }, { ...DEFAULT_SKY }, 'and it is not the default');
  }
  // Clearer than any green country in the game: "the sky is large here because there is nothing to
  // interrupt it... the approach of storm is visible long in advance."
  assert.ok(skies[0].density < DEFAULT_SKY.density * .65, `haze density ${skies[0].density}`);
  assert.ok(skies[0].density < regionSky(regions.find(one => one.name === 'Eer')).density);
  // One dialect, Mittoli in family, over all four.
  for (const name of NAMES) {
    assert.deepEqual(REGION_LANGUAGE[name], { language: 'mittoli', dialect: 'mithali' });
  }
  assert.equal(DIALECTS.mithali.language, 'mittoli');
  assert.match(DIALECTS.mithali.of, /sky|flood/i);
  assert.match(DIALECTS.mithali.of, /Vet mithalan/, 'the proverb the lore gives, and nothing coined');
});

test('the scenery, the ground and the chart read the same numbers', () => {
  // Every landmark the regions name is in the module, every map-fog area is inside its own country,
  // and the braids the scenery draws are the ones west-regions.js declares.
  const braids = WEST_BRAIDS.filter(braid => braid.id.startsWith('mithala'));
  assert.equal(braids.length, 2, 'the main channel and the north braid');
  for (const braid of braids) assert.ok(MITHALA_RIVERS.includes(braid.course));
  for (const course of MITHALA_RIVERS) assert.ok(WEST_RIVERS.includes(course), `${course.id} is not in WEST_RIVERS`);
  // The swale is what makes the water possible and it lets go at the shore.
  assert.ok(MITHALA_SWALE.outer > MITHALA_SWALE.inner * 3);
  assert.ok(MITHALA_SWALE.shoreTo > MITHALA_SWALE.shoreFrom);
  // Every part of the plain is inside the module's box, and the box reaches nothing else.
  for (const cell of ALL) assert.ok(cell.x > MITHALA_BOX.minX && cell.x < MITHALA_BOX.maxX
    && cell.z > MITHALA_BOX.minZ && cell.z < MITHALA_BOX.maxZ, `${cell.q},${cell.r} is outside the box`);
  assert.equal(mithalaWeight(0, 0), 0, 'and it shapes nothing at the other end of the world');
  assert.equal(mithalaTilt(0, 0), 0);
  assert.equal(mithalaGround(0, 0, 42), 42);
});
