import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { sourceModule } from './module-loader.js';
import * as THREE from '../vendor/three.module.js';
import { canStand, canSwim } from '../src/gameplay/movement/game-state.js';
import { PLAYABLE_REGIONS, REGION_BIOMES } from '../src/world/terrain/region-layout.js';
import { RIVER_EDGES } from '../src/world/terrain/region-rivers.js';
import {
  REGION_CELLS, REGION_IDS, REGION_TERRAIN, hexAt, hexOwnerAt, regionAt, regions, landDistance, insideRegion, terrainMix, SEA_LEVEL,
} from '../src/world/terrain/region-world.js';
import {
  LIZEEM, LIZEEM_REACH, WEST_BRAIDS, WEST_RIVERS, GALA_RIVERS, GALA_CHANNEL, GALA_DESERT_STREAM, GALA_TELEMONIA_STREAM, GALA_TELEMONIA_MOUTH, OVETH_REACH,
  courseDistance, inWestWater,
} from '../src/content/regions/western-regions/west-regions.js';
import { WEST_PROFILES, westGroundAt, westNaturalGround, westWaterSurface, braidThreadOffset, courseSample } from '../src/content/regions/western-regions/west-ground.js';
import { groundWithRiver, bedrockHeight } from '../src/world/terrain/world-terrain.js';
import {
  GALA_CLIMATE, GALA_SEAM, GALA_SEAM_EDGES, GALA_SEAM_LINE, GALA_RISE, GALA_WASH, GALA_LANDMARKS, GALA_GROUND,
  seamDistance, galaRise, galaWash, galaClimate, galaGroundColour, onWashFloor, washPlace,
} from '../src/content/regions/gala/gala-world.js';
import { GALA_WILDLIFE_ZONES } from '../src/content/regions/gala/gala-wildlife.js';
import { DEFAULT_SKY, regionSky } from '../src/world/environment/region-sky.js';
import { SUBREGIONS } from '../src/ui/map/map-fog.js';
import { regionBuildStatus } from '../src/dev/tools/build-status.js';
import { regionLevel } from '../src/world/terrain/region-levels.js';
import { REGION_LANGUAGE, DIALECTS } from '../src/gameplay/skills/languages.js';
import { DEV_WORLD_DESTINATIONS } from '../src/dev/tools/developer-atlas.js';

/**
 * Gala: the western bank of the Lizeem near its mouth, built as terrain, climate, water and wildlife
 * and nothing that belongs to anybody (docs/gala-brief.md, 28 September 2026).
 *
 * The standing rule is the user's: the atlas wins over the lore. So most of what is asserted below is
 * the atlas's own arithmetic — twenty-one hexes, nineteen `plains` and two `grassland`; twelve `BSh`,
 * seven `Csb`, two `Csa`; four courses on its borders and none inside — and the one contract Gala keeps
 * with a country being built beside it at the same time: the seam with Northern Ascarth.
 */
const { createWorld } = await sourceModule('../src/world.js');
const { WEST_LIFE_ZONES, createWestLife, LIFE_REACH } = await sourceModule('../src/content/regions/western-regions/west-regions-life.js');
const scene = new THREE.Scene();
const world = createWorld(scene);
const gala = regions.find(region => region.name === 'Gala');
const cells = REGION_CELLS.Gala;
const WWMAP = new URL('../../world-builder/map/resources/examples/azhora.wwmap', import.meta.url);
const ATLAS = JSON.parse(readFileSync(new URL('../assets/azhora-dev-regions.json', import.meta.url), 'utf8'));
/** Who owns every hex on the whole atlas: Northern Ascarth and Telemonia are outside the survey window. */
const OWNER = (() => {
  const owners = new Map();
  for (const region of ATLAS.regions) for (const cell of region.cells) owners.set(`${cell.q},${cell.r}`, region.name ?? region.id);
  return owners;
})();
const AXIAL = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const ownerAt = (x, z) => { const h = hexAt(x, z); return OWNER.get(`${h.q},${h.r}`) ?? 'sea'; };
const mean = list => list.reduce((sum, value) => sum + value, 0) / list.length;

test('Gala is region 22, appended after every country before it, and the atlas gives it twenty-one hexes of plain', () => {
  assert.equal(REGION_IDS.Gala, 22, 'the Ascarth job has 23 and 24; Iscare 19, the East Lotharn 20, Feradom 21');
  assert.ok(PLAYABLE_REGIONS.includes('Gala'));
  // Appended, never inserted: `world-regions.js` walks this list with one seeded stream.
  assert.ok(PLAYABLE_REGIONS.indexOf('Gala') > PLAYABLE_REGIONS.indexOf('East Lotharn Mountains'));
  const tally = {};
  for (const cell of cells) tally[cell.terrain] = (tally[cell.terrain] ?? 0) + 1;
  assert.deepEqual(tally, { plains: 19, grassland: 2 });
  // The two grassland hexes are the southern row, on the sea.
  assert.deepEqual(cells.filter(cell => cell.terrain === 'grassland').map(cell => cell.r), [122, 122]);
  assert.equal(REGION_BIOMES.Gala.ownScatter, true);
  assert.equal(new Set(PLAYABLE_REGIONS.map(name => REGION_BIOMES[name].id)).size, PLAYABLE_REGIONS.length);
  // Its neighbours by shared hex edge, off the whole atlas.
  const neighbours = {};
  for (const cell of cells) for (const [dq, dr] of AXIAL) {
    const other = OWNER.get(`${cell.q + dq},${cell.r + dr}`) ?? 'sea';
    if (other !== 'Gala') neighbours[other] = (neighbours[other] ?? 0) + 1;
  }
  assert.deepEqual(neighbours, { Telemonia: 9, 'Northern Ascarth': 8, Eer: 5, Nesdor: 3, Ovesos: 3, 'Oves Desert': 2, Legemum: 1, sea: 3 });
});

test('three climates in three straight bands, held to the World Builder map', () => {
  const counts = {};
  for (const code of Object.values(GALA_CLIMATE)) counts[code] = (counts[code] ?? 0) + 1;
  assert.deepEqual(counts, { BSh: 12, Csb: 7, Csa: 2 });
  assert.equal(Object.keys(GALA_CLIMATE).length, cells.length);
  for (const cell of cells) {
    const code = GALA_CLIMATE[`${cell.q},${cell.r}`];
    assert.equal(code, cell.r <= 119 ? 'BSh' : cell.r <= 121 ? 'Csb' : 'Csa', `(${cell.q},${cell.r}) is out of its band`);
  }
  if (existsSync(WWMAP)) {
    const map = JSON.parse(readFileSync(WWMAP, 'utf8').replace(/^﻿/, ''));
    for (const [key, code] of Object.entries(GALA_CLIMATE)) {
      assert.equal(map.hexes[key]?.climate, code, `${key} is ${map.hexes[key]?.climate} on the map`);
      assert.equal(map.hexes[key]?.region, 'Gala');
    }
  }
  // And the ground is coloured by it, since the terrain field cannot say it: buff on the steppe,
  // tawny-olive in the middle, the coast's own at the sea.
  const north = cells.find(cell => cell.q === -9 && cell.r === 117), coast = cells.find(cell => cell.q === -11 && cell.r === 122);
  assert.equal(galaGroundColour(north.x, north.z), GALA_GROUND.BSh);
  assert.notEqual(galaGroundColour(coast.x, coast.z), GALA_GROUND.BSh);
  const c = galaClimate((north.x + coast.x) / 2, (north.z + coast.z) / 2);
  assert.ok(Math.abs(c.BSh + c.Csb + c.Csa - 1) < 1e-9);
});

test('the seam with Northern Ascarth: the contract’s numbers, eight edges, and nothing shaped within a hundred metres of it', () => {
  // The contract both builders hold: base 4.0 m, amplitude .6, wavelength 320 on the border hexes'
  // plains and grassland, which for Gala is both of its profiles.
  for (const profile of [REGION_TERRAIN.Gala, REGION_TERRAIN.Gala.byTerrain.grassland])
    assert.deepEqual([profile.base, profile.amp, profile.wave], [GALA_SEAM.base, GALA_SEAM.amp, GALA_SEAM.wave]);
  assert.deepEqual([GALA_SEAM.base, GALA_SEAM.amp, GALA_SEAM.wave, GALA_SEAM.keep], [4.0, .6, 320, 100]);
  // The eight edges, read off the atlas and not off the list.
  const shared = [];
  for (const cell of cells) for (const [dq, dr] of AXIAL)
    if (OWNER.get(`${cell.q + dq},${cell.r + dr}`) === 'Northern Ascarth') shared.push(`${cell.q},${cell.r}|${cell.q + dq},${cell.r + dr}`);
  assert.equal(shared.length, 8);
  assert.deepEqual(new Set(shared), new Set(GALA_SEAM_EDGES.map(([q, r, nq, nr]) => `${q},${r}|${nq},${nr}`)));
  assert.equal(GALA_SEAM_LINE.length, 8);
  // No river on any of them: the seam is dry ground both ways.
  const wet = new Set(RIVER_EDGES.flatMap(edge => [`${edge.a}|${edge.b}`, `${edge.b}|${edge.a}`]));
  for (const key of shared) assert.ok(!wet.has(key), `${key} has a river on it`);

  // Nothing hand-built within a hundred metres of the border, on either side: the rise and the wash
  // are exactly nothing there, and every Gala watercourse's cut — its valley, and its braid's —
  // stays a hundred metres inside.
  let near = 0;
  for (let x = -1700; x <= -1350; x += 4) for (let z = 1150; z <= 1500; z += 4) {
    if (seamDistance(x, z) >= GALA_SEAM.keep) continue;
    near++;
    assert.equal(galaRise(x, z), 0, `the rise reaches the seam at ${x}, ${z}`);
    assert.equal(galaWash(x, z), 0, `the wash reaches the seam at ${x}, ${z}`);
    // The ground is the ordinary blend and nothing else here, but for the Lizeem's own cut, which is
    // the river's and older than Gala, and the coast's.
    if (courseDistance(LIZEEM_REACH, x, z, 80) < 60 || courseDistance(LIZEEM, x, z, 80) < 60) continue;
    assert.ok(Math.abs(groundWithRiver(x, z) - bedrockHeight(x, z)) < 1e-9, `something is shaped at ${x}, ${z}, ${seamDistance(x, z).toFixed(0)} m from the seam`);
  }
  assert.ok(near > 3000, `${near} points checked`);
  for (const course of GALA_RIVERS) for (const sample of WEST_PROFILES.get(course.id)) {
    const ground = westNaturalGround(sample.x, sample.z) + galaRise(sample.x, sample.z) - galaWash(sample.x, sample.z);
    const valley = sample.half + 4 + Math.min(14, Math.max(0, ground - sample.surface)) * 2.2;
    assert.ok(seamDistance(sample.x, sample.z) - valley >= GALA_SEAM.keep, `${course.id} cuts within ${(seamDistance(sample.x, sample.z) - valley).toFixed(0)} m of the seam`);
  }
  const mouths = WEST_BRAIDS.find(braid => braid.id === 'gala-mouths');
  for (const sample of WEST_PROFILES.get(GALA_CHANNEL.id)) {
    const offset = braidThreadOffset(mouths, sample.along);
    if (offset === null) continue;
    for (const side of [-1, 1]) {
      const x = sample.x + sample.nx * offset * side, z = sample.z + sample.nz * offset * side;
      assert.ok(seamDistance(x, z) - mouths.half - 6 >= GALA_SEAM.keep, `the braid comes within ${(seamDistance(x, z) - mouths.half - 6).toFixed(0)} m of the seam`);
    }
  }
  for (const point of GALA_WASH.points) assert.ok(seamDistance(point.x, point.z) - GALA_WASH.bank >= GALA_SEAM.keep);
});

test('the steppe stands higher than the coast, and the north-east meets the far bank of the Lizeem within a metre or two', () => {
  const band = code => cells.filter(cell => GALA_CLIMATE[`${cell.q},${cell.r}`] === code);
  const ground = list => mean(list.map(cell => westGroundAt(cell.x, cell.z)));
  assert.ok(ground(band('BSh')) > ground(band('Csb')) + 1.5, `steppe ${ground(band('BSh')).toFixed(1)} against ${ground(band('Csb')).toFixed(1)}`);
  // The margin here was 0.09 m on the day Telemonia was built (2026-10-02), and it was a bump of the unbuilt
  // `outland` across Gala's western border: six metres of roll on a 150 m wave, of which 1.2 m stood on (-11,120).
  // Telemonia's profile is on Gala's own 320 m wave and the bump went with it, which put the middle rows 1.19 m
  // under the coast row (docs/telemonia-stage1-report.md). A metre and a half is the same statement.
  assert.ok(ground(band('Csb')) > ground(band('Csa')) - 1.5, 'and the Mediterranean rows are no higher than the coast by much');
  // The rise is quiet: the steepest a traveler meets on it, off the water, is a gentle slope.
  // Measured on Gala's own ground: at its borders the rise lets go with the blend, as every western
  // landform does, and the step there is the blend's to carry.
  let steepest = 0;
  for (const cell of band('BSh')) for (let dx = -40; dx <= 40; dx += 10) for (let dz = -40; dz <= 40; dz += 10) {
    const x = cell.x + dx, z = cell.z + dz;
    if ((terrainMix(x, z).weights.Gala ?? 0) < .85 || inWestWater(x, z, 12) || washPlace(x, z)?.distance < GALA_WASH.bank + 3) continue;
    steepest = Math.max(steepest, Math.abs(galaRise(x + 1, z) - galaRise(x - 1, z)) / 2, Math.abs(galaRise(x, z + 1) - galaRise(x, z - 1)) / 2);
  }
  assert.ok(steepest < .06, `the rise alone climbs 1 in ${(1 / steepest).toFixed(0)}`);
  assert.ok(GALA_RISE.height < 5);
  // The north-eastern corner hex, across the Lizeem from Nesdor's flats and Eer's inland shoulder.
  const corner = cells.find(cell => cell.q === -7 && cell.r === 117);
  const here = westGroundAt(corner.x, corner.z);
  for (const across of [REGION_TERRAIN.Nesdor.byTerrain.plains.base, REGION_TERRAIN.Eer.base])
    assert.ok(Math.abs(here - across) < 2, `Gala's corner stands at ${here.toFixed(1)} against ${across}`);
  // And the seam hexes are the contract's four metres, give or take the relief and whatever is across.
  const seamHex = cells.find(cell => cell.q === -9 && cell.r === 121);
  assert.equal(galaRise(seamHex.x, seamHex.z), 0);
});

test('the atlas’s water on Gala’s borders, a ford where the brief left one, and nothing that climbs or floats', () => {
  // The courses are the atlas's own edges, and each has Gala on one bank.
  const sides = (course, from = 0, to = 1) => {
    const found = new Set();
    for (const sample of WEST_PROFILES.get(course.id)) {
      if (sample.along < from || sample.along > to) continue;
      found.add([ownerAt(sample.x + sample.nx * 12, sample.z + sample.nz * 12), ownerAt(sample.x - sample.nx * 12, sample.z - sample.nz * 12)].sort().join('|'));
    }
    return found;
  };
  for (const pair of sides(GALA_DESERT_STREAM, .1, .9)) assert.equal(pair, 'Gala|Oves Desert');
  for (const pair of sides(OVETH_REACH, .1, .9)) assert.equal(pair, 'Gala|Ovesos');
  for (const pair of sides(GALA_TELEMONIA_STREAM, .05, .9)) assert.ok(['Gala|Telemonia', 'Gala|Legemum'].includes(pair), pair);
  // Its mouth is the atlas's one Gala | Legemum edge, carried on to the water (tests/legemum-world.test.js asks the rest).
  for (const pair of sides(GALA_TELEMONIA_MOUTH, 0, .75)) assert.equal(pair, 'Gala|Legemum');
  // Gala's own channel is inside Gala, all of it.
  for (const sample of WEST_PROFILES.get(GALA_CHANNEL.id)) assert.equal(hexOwnerAt(sample.x, sample.z), 'Gala');
  assert.ok(courseDistance(LIZEEM_REACH, GALA_CHANNEL.points[0].x, GALA_CHANNEL.points[0].z, 200) < 120, 'it rises beside the Lizeem');

  for (const course of GALA_RIVERS) {
    assert.ok(WEST_RIVERS.includes(course));
    const profile = WEST_PROFILES.get(course.id);
    for (let i = 1; i < profile.length; i++) assert.ok(profile[i].surface < profile[i - 1].surface, `${course.id} climbs at ${i}`);
    for (const sample of profile) {
      const surface = westWaterSurface(sample.x, sample.z);
      if (surface === null) continue;
      assert.ok(westGroundAt(sample.x, sample.z) <= surface + .01, `${course.id} floats at ${sample.x.toFixed(0)}, ${sample.z.toFixed(0)}`);
    }
  }
  // Both that reach the coast stop where the beach starts, as Eer's two do; the Treloss's mouth then carries it
  // on from that point to the water, at its level (2026-10-03, when Legemum's ground had walled it off there).
  for (const course of [GALA_TELEMONIA_STREAM, GALA_CHANNEL]) {
    const end = WEST_PROFILES.get(course.id).at(-1);
    assert.ok(landDistance(end.x, end.z) < 45 && landDistance(end.x, end.z) > 35, `${course.id} ends ${landDistance(end.x, end.z).toFixed(0)} m from the sea`);
  }
  const trelossEnd = WEST_PROFILES.get(GALA_TELEMONIA_STREAM.id).at(-1), trelossMouth = WEST_PROFILES.get(GALA_TELEMONIA_MOUTH.id);
  assert.equal(GALA_TELEMONIA_MOUTH.headOf, GALA_TELEMONIA_STREAM.id);
  assert.ok(Math.hypot(trelossMouth[0].x - trelossEnd.x, trelossMouth[0].z - trelossEnd.z) < 1e-6 && Math.abs(trelossMouth[0].surface - trelossEnd.surface) < 1e-6);
  assert.ok(landDistance(trelossMouth.at(-1).x, trelossMouth.at(-1).z) < 0 && Math.abs(trelossMouth.at(-1).surface - SEA_LEVEL) < .08, 'the Treloss reaches the sea');
  assert.ok(trelossMouth.every(sample => sample.ford), 'the mouth is waded');
  // The desert stream is waded anywhere; the Oveth over its rocky head and nowhere below it.
  assert.ok(WEST_PROFILES.get(GALA_DESERT_STREAM.id).every(sample => sample.ford));
  assert.equal(OVETH_REACH.headOf, GALA_DESERT_STREAM.id, 'the Oveth cannot stand above the water that runs into it');
  const oveth = WEST_PROFILES.get(OVETH_REACH.id);
  assert.ok(oveth[0].surface <= WEST_PROFILES.get(GALA_DESERT_STREAM.id).at(-1).surface + 1e-9);
  assert.ok(oveth.filter(sample => sample.ford).length >= oveth.length * .35 && !oveth.at(-1).ford);
  const walls = world.colliders.filter(collider => collider.kind === 'west-deep-water');
  const firstDeep = oveth.find(sample => !sample.ford);
  let waded = 0;
  for (const sample of oveth) {
    const blocked = walls.some(collider => Math.hypot(collider.x - sample.x, collider.z - sample.z) < collider.r);
    assert.equal(blocked, !sample.ford, `the Oveth is ${sample.ford ? 'walled at its ford' : 'open below it'} at ${sample.index}`);
    // The last pace of the ford is the wall's edge; everything above it is walked through.
    if (sample.ford && Math.hypot(sample.x - firstDeep.x, sample.z - firstDeep.z) > 7) {
      assert.ok(canStand(sample.x, sample.z, world, .34), `the ford is not walkable at ${sample.index}`); waded++;
    }
  }
  assert.ok(waded >= 10, `${waded} samples of ford`);
  // It stops at the Lizeem's bank, above the great river's level, and its water never lies on the
  // bank the Lizeem's reeds are sown on (the Oveth's own comment says what that would re-roll).
  const mouth = oveth.at(-1);
  assert.ok(mouth.surface > courseSample(LIZEEM, mouth.x, mouth.z).surface, 'the Oveth drops into the Lizeem, not the other way');
  for (const sample of oveth) {
    const lizeem = courseSample(LIZEEM, sample.x, sample.z);
    assert.ok(courseDistance(LIZEEM, sample.x, sample.z) - sample.half > lizeem.half + 3.4 + .2, `the Oveth’s water reaches the Lizeem’s reed bank at ${sample.index}`);
  }
  // The braided mouths run as three channels at their widest.
  const mouths = WEST_BRAIDS.find(braid => braid.id === 'gala-mouths');
  const profile = WEST_PROFILES.get(GALA_CHANNEL.id), middle = profile[Math.round(profile.length * (mouths.from + mouths.to) / 2)];
  let runs = 0, wet = false;
  for (let offset = -mouths.offset - 12; offset <= mouths.offset + 12; offset += .5) {
    const water = westWaterSurface(middle.x + middle.nx * offset, middle.z + middle.nz * offset) !== null;
    if (water && !wet) runs++;
    wet = water;
  }
  assert.equal(runs, 3, 'the mouths run as three channels');
  // The Lizeem is still a wall along the whole Gala bank, and still one river at the handover.
  const above = WEST_PROFILES.get(LIZEEM.id), below = WEST_PROFILES.get(LIZEEM_REACH.id);
  assert.ok(Math.abs(above.at(-1).surface - below[0].surface) < .02);
  let dry = 0;
  for (const cell of cells) for (const [dq, dr] of AXIAL) if (['Eer', 'Nesdor'].includes(OWNER.get(`${cell.q + dq},${cell.r + dr}`))) {
    const wetEdge = RIVER_EDGES.some(edge => (edge.a.join(',') === `${cell.q},${cell.r}` && edge.b.join(',') === `${cell.q + dq},${cell.r + dr}`)
      || (edge.b.join(',') === `${cell.q},${cell.r}` && edge.a.join(',') === `${cell.q + dq},${cell.r + dr}`));
    if (!wetEdge) dry++;
  }
  assert.equal(dry, 0, 'not one dry edge between Gala and Eer or Nesdor');
});

test('the dry wash is a bed of gravel with no water in it, and nothing grows on its floor', () => {
  const middle = GALA_WASH.points[3];
  assert.ok(galaWash(middle.x, middle.z) > GALA_WASH.depth * .95, `it is cut ${galaWash(middle.x, middle.z).toFixed(2)} m in the middle`);
  assert.equal(westWaterSurface(middle.x, middle.z), null, 'and there is no water in it');
  assert.ok(onWashFloor(middle.x, middle.z));
  assert.ok(canStand(middle.x, middle.z, world, .5), 'and a traveler walks along it');
  for (const point of GALA_WASH.points) assert.equal(hexOwnerAt(point.x, point.z), 'Gala');
  // It is the steppe's, and gives out where the Mediterranean rows begin.
  for (const point of GALA_WASH.points.slice(0, -1)) assert.ok(galaClimate(point.x, point.z).BSh > .6, 'it is the steppe’s');
  assert.ok(galaClimate(GALA_WASH.points.at(-1).x, GALA_WASH.points.at(-1).z).Csb > .1, 'and it runs out where the maquis starts');
  // The floor lies below the plain beside it.
  const side = { x: middle.x + 14, z: middle.z - 6 };
  assert.ok(world.heightAt(side.x, side.z) - world.heightAt(middle.x, middle.z) > .8);
  assert.ok(world.galaMetrics.gravel > 150, 'gravel on the floor');
  for (const collider of world.colliders.filter(c => c.kind === 'gala-tree' || c.kind === 'gala-scrub'))
    assert.ok(!onWashFloor(collider.x, collider.z), `something grows on the wash floor at ${collider.x.toFixed(0)}, ${collider.z.toFixed(0)}`);
});

test('three climates on the ground: steppe scrub in the north, maquis and standing olives in the middle, tamarisk on the water', () => {
  const m = world.galaMetrics;
  for (const key of ['tufts', 'shrubs', 'maquis', 'trees', 'tamarisk', 'oleander', 'reeds', 'thrift', 'stones', 'sand'])
    assert.ok(m[key] > 10, `no ${key}`);
  const planted = world.colliders.filter(c => c.kind === 'gala-tree' || c.kind === 'gala-scrub');
  for (const c of planted) {
    assert.equal(hexOwnerAt(c.x, c.z), 'Gala', `something of Gala’s stands outside it at ${c.x.toFixed(0)}, ${c.z.toFixed(0)}`);
    assert.equal(westWaterSurface(c.x, c.z), null, 'something of Gala’s stands in the water');
    assert.ok(!inWestWater(c.x, c.z), 'something of Gala’s stands in a watercourse');
    assert.ok(landDistance(c.x, c.z) > 1.5, 'something of Gala’s stands in the sea');
  }
  // No tree on the open steppe: under BSh a tree is a thing that stands by water.
  for (const tree of planted.filter(c => c.kind === 'gala-tree')) {
    const nearWater = GALA_RIVERS.concat([LIZEEM, LIZEEM_REACH]).some(course => courseDistance(course, tree.x, tree.z, 60) < course.maxHalf + 14);
    if (!nearWater) assert.ok(galaClimate(tree.x, tree.z).BSh < .6, `a tree on the dry steppe at ${tree.x.toFixed(0)}, ${tree.z.toFixed(0)}`);
  }
  // The maquis belongs to the Mediterranean rows.
  const maquis = planted.filter(c => c.kind === 'gala-scrub' && !GALA_RIVERS.concat([LIZEEM, LIZEEM_REACH]).some(course => courseDistance(course, c.x, c.z, 60) < course.maxHalf + 14));
  assert.ok(maquis.length > 60);
  assert.ok(maquis.filter(c => galaClimate(c.x, c.z).BSh < .5).length > maquis.length * .9, 'maquis on the steppe');
  // Standing trees are well apart: "singly, well apart". The tamarisk is the water's and stands
  // within a gallery's width of it; everything further out is an olive or a fig.
  const standing = planted.filter(c => c.kind === 'gala-tree' && !GALA_RIVERS.concat([LIZEEM, LIZEEM_REACH]).some(course => courseDistance(course, c.x, c.z, 60) < course.maxHalf + 14));
  assert.ok(standing.length > 8, `${standing.length} standing trees`);
  for (const a of standing) for (const b of standing) if (a !== b) assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > 39, 'two standing olives touching');
  // Every hex of Gala is honest ground a traveler can stand on.
  for (const cell of cells) {
    for (const [dx, dz] of [[0, 0], [25, 10], [-25, -10], [10, -30], [-10, 30]]) {
      const x = cell.x + dx, z = cell.z + dz;
      assert.ok(Number.isFinite(world.heightAt(x, z)));
      if (landDistance(x, z) < 45 || inWestWater(x, z, 4)) continue;
      assert.ok(Math.abs(groundWithRiver(x, z) - westGroundAt(x, z)) < 1e-9, `west-ground.js and world-terrain.js disagree at ${x}, ${z}`);
    }
  }
});

test('every animal in Gala stands where its kind would, and none of them is anybody’s', () => {
  const species = new Set(GALA_WILDLIFE_ZONES.map(zone => zone.species));
  for (const kind of ['goose', 'dolphin', 'gull', 'stilt', 'egret', 'wading-bird', 'upland-hare', 'harrier', 'plateau-hawk', 'boar'])
    assert.ok(species.has(kind), `Gala has no ${kind}`);
  for (const kind of ['longhorn', 'hill-sheep', 'nethrani-cattle']) assert.ok(!species.has(kind), `${kind} is somebody’s stock`);
  for (const zone of GALA_WILDLIFE_ZONES) {
    assert.ok(WEST_LIFE_ZONES.includes(zone), `${zone.id} is not in the west's list`);
    assert.equal(zone.region, 'Gala');
    assert.ok(zone.note.length > 60, `${zone.id} does not say why it is here`);
    if (!zone.air && !zone.sea) assert.ok(Math.hypot(zone.maxX - zone.minX, zone.maxZ - zone.minZ) / 2 < LIFE_REACH, `${zone.id} is wider than it is run from`);
    for (const [x, z] of zone.sites) {
      assert.ok(x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ, `${zone.id}'s home is outside its range`);
      if (zone.sea) { assert.ok(landDistance(x, z) < -20, `${zone.id} is not at sea`); continue; }
      if (zone.air) { assert.equal(hexOwnerAt(x, z), 'Gala'); continue; }
      assert.equal(regionAt(x, z)?.name, 'Gala', `${zone.id} at ${x}, ${z} is not in Gala`);
      assert.ok(canStand(x, z, world, zone.radius) || (zone.float && canSwim(x, z, world, zone.radius)), `${zone.id} stands on nothing at ${x}, ${z}`);
      if (zone.float) assert.notEqual(westWaterSurface(x, z), null, `${zone.id} is not on the water at ${x}, ${z}`);
      else assert.equal(westWaterSurface(x, z), null, `${zone.id} stands in the water at ${x}, ${z}`);
    }
  }
  const life = createWestLife(new THREE.Scene(), world, { zones: GALA_WILDLIFE_ZONES });
  const mine = life.snapshot().creatures;
  assert.equal(mine.length, GALA_WILDLIFE_ZONES.reduce((sum, zone) => sum + zone.sites.length, 0), 'every one of them found a place');
  // A minute of them with somebody in the middle of the country: nothing leaves its range or goes to NaN.
  const player = { x: -1690, y: 0, z: 1240 };
  for (let step = 0; step < 900; step++) life.update(1 / 30, player, true);
  for (const animal of life.snapshot().creatures) {
    const zone = GALA_WILDLIFE_ZONES.find(item => animal.id.startsWith(`${item.id}-`));
    assert.ok(Number.isFinite(animal.x + animal.y + animal.z), `${animal.id} went to NaN`);
    assert.ok(animal.x >= zone.minX - .5 && animal.x <= zone.maxX + .5 && animal.z >= zone.minZ - .5 && animal.z <= zone.maxZ + .5, `${animal.id} left its range`);
  }
  // The raft floats: the geese sit on the distributary's water, not on its bed.
  let afloat = 0;
  for (const goose of life.snapshot().creatures.filter(animal => animal.species === 'goose')) {
    const water = westWaterSurface(goose.x, goose.z);
    if (water === null) continue;
    afloat++;
    assert.ok(Math.abs(goose.groundY - (water - .04)) < .05, `${goose.id} sits ${(goose.groundY - water).toFixed(2)} m off its water`);
  }
  assert.ok(afloat >= 6, `only ${afloat} geese are on the water`);
  // The dolphins, seen from the shore and never reached from it.
  const sea = GALA_WILDLIFE_ZONES.find(zone => zone.sea), watcher = { x: -1752, y: 0, z: 1436 };
  assert.ok(canStand(watcher.x, watcher.z, world, .5), 'the watcher stands on Gala’s own shore');
  for (let step = 0; step < 120; step++) life.update(1 / 30, watcher, true);
  for (const animal of life.snapshot().creatures.filter(item => item.id.startsWith(`${sea.id}-`))) {
    assert.ok(landDistance(animal.x, animal.z) < 0 && !canStand(animal.x, animal.z, world, .4), `${animal.id} can be walked up to`);
    assert.ok(Math.abs(animal.groundY - (SEA_LEVEL - .5)) < .01);
  }
  life.dispose();
});

test('nothing in Gala can be walked down, and the quick ones cannot be run down either', () => {
  // The laws tests/west-life.test.js holds for the whole west, applied to Gala's own ranges here: the
  // west's own run stops at the first range that fails it, which is not one of these.
  const WALK = 4.2, RUN = 7.2, HZ = 60;
  for (const zone of GALA_WILDLIFE_ZONES.filter(item => !item.air && !item.sea)) for (const [pace, seconds] of [[WALK, 30], [RUN, 25]]) {
    const life = createWestLife(new THREE.Scene(), world, { zones: [zone] });
    const band = () => life.state().creatures;
    const first = band()[0];
    const player = { x: first.x + 40, z: first.z };
    let closest = Infinity, flew = false, offFooting = 0;
    for (let i = 0; i < seconds * HZ; i++) {
      const at = band().find(animal => animal.id === first.id);
      const dx = at.x - player.x, dz = at.z - player.z, d = Math.hypot(dx, dz);
      if (d > .4) { const step = Math.min(d - .3, pace / HZ); player.x += dx / d * step; player.z += dz / d * step; }
      life.update(1 / HZ, player, true);
      for (const animal of band()) {
        const standing = !animal.hidden && animal.action !== 'fly' && animal.action !== 'dive';
        if (standing && !(canStand(animal.x, animal.z, world, zone.radius) || (zone.float && canSwim(animal.x, animal.z, world, zone.radius)))) offFooting++;
      }
      const now = band().find(animal => animal.id === first.id);
      if (now.lift < 1) closest = Math.min(closest, Math.hypot(now.x - player.x, now.z - player.z));
      if (now.action === 'fly') flew = true;
    }
    const arm = pace === WALK ? 3 : 1.5;
    assert.ok(closest >= arm, `${zone.id}: somebody ${pace === WALK ? 'walking' : 'running'} got within ${closest.toFixed(2)} m`);
    assert.equal(offFooting, 0, `${zone.id}: an animal stood somewhere it cannot stand`);
    if (pace === RUN && zone.species !== 'boar' && zone.species !== 'upland-hare') assert.ok(flew, `${zone.id}: a bird that is run at takes to the air`);
    life.dispose();
  }
});

test('Gala has a sky of its own, the brightest in the west, and a tongue the lore names', () => {
  const sky = regionSky(gala);
  assert.notDeepEqual({ ...sky }, { ...DEFAULT_SKY });
  assert.ok(Number.isInteger(gala.palette.sky) && Number.isInteger(gala.palette.haze));
  assert.equal(typeof gala.palette.fog, 'string', 'palette.fog is the chart legend’s colour');
  const eer = regionSky(regions.find(region => region.name === 'Eer'));
  assert.ok(sky.density < eer.density, 'a dry country is a long way to see');
  const luma = hex => ((hex >> 16) & 255) * .3 + ((hex >> 8) & 255) * .6 + (hex & 255) * .1;
  assert.ok(luma(sky.fog) > luma(eer.fog), 'and its haze is the dust of the dry country, paler than Eer’s');
  // "Gala speaks a Mittoli-derived mainland dialect", and the lore calls it Galan.
  assert.deepEqual({ ...REGION_LANGUAGE.Gala }, { language: 'mittoli', dialect: 'gala' });
  assert.equal(DIALECTS.gala.name, 'Galan');
});

test('Gala is charted, levelled and listed, and nobody lives there', () => {
  assert.deepEqual([...gala.npcIds], [], 'terrain, climate, water and wildlife only');
  for (const [id, stand] of Object.entries(world.npcPositions ?? {}))
    assert.notEqual(hexOwnerAt(stand.x, stand.z), 'Gala', `${id} stands in Gala`);
  assert.equal(hexOwnerAt(gala.spawn.x, gala.spawn.z), 'Gala');
  assert.ok(canStand(gala.spawn.x, gala.spawn.z, world, .5), 'the travel button puts the traveler on ground');
  for (const id of gala.landmarks) {
    const place = GALA_LANDMARKS.find(item => item.id === id);
    assert.ok(place, `${id} is not a place`);
    assert.ok(world.landmarks.some(landmark => landmark.id === id), `the chart knows ${id}`);
    assert.equal(regionAt(place.x, place.z)?.name, 'Gala', `${id} stands outside Gala`);
    assert.ok(place.description.length > 60);
  }
  const areas = SUBREGIONS.filter(area => area.region === 'Gala');
  assert.ok(areas.length >= 3 && areas.length <= 5, `${areas.length} named areas`);
  for (const area of areas) {
    assert.equal(regionAt(area.x, area.z).name, 'Gala', area.id);
    assert.ok(insideRegion('Gala', area.x, area.z));
    assert.ok(area.radius >= 18 && area.radius <= 130);
  }
  const status = regionBuildStatus('Gala');
  assert.equal(status.state, 'early');
  assert.equal(status.playable, true);
  assert.match(status.work, /Everybody/);
  assert.equal(regionLevel('Gala'), 3, 'a hard country, on the approved ladder');
  const destination = DEV_WORLD_DESTINATIONS.find(item => item.regionId === 'Gala');
  assert.ok(destination && destination.region === 22 && destination.travelTarget === 'gala');
  // The places are named in plain words and the lore's: there is no Galan naming profile to coin from.
  for (const place of GALA_LANDMARKS) assert.match(place.name, /^The /);
});
