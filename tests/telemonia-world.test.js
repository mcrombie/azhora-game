import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { sourceModule } from './module-loader.js';
import * as THREE from '../vendor/three.module.js';
import { canStand } from '../src/game-state.js';
import { PLAYABLE_REGIONS, REGION_BIOMES, HEX_WORLD_TRANSFORM, worldBoundsFor } from '../src/region-layout.js';
import { RIVER_EDGES } from '../src/region-rivers.js';
import { LAND_HEXES, PLAYABLE_SURVEY } from '../src/region-survey.js';
import { REGION_CELLS, REGION_IDS, REGION_TERRAIN, hexAt, hexCentre, hexOwnerAt, regionAt, regions, insideRegion, terrainMix, landDistance } from '../src/region-world.js';
import { groundWithRiver, GROUND_TINT_FAMILIES } from '../src/world-terrain.js';
import { regionSky } from '../src/region-sky.js';
import { regionLevel } from '../src/region-levels.js';
import { regionBuildStatus } from '../src/build-status.js';
import { SUBREGIONS } from '../src/map-fog.js';
import { REGION_LANGUAGE, LANGUAGES } from '../src/languages.js';
import { DEV_WORLD_DESTINATIONS } from '../src/developer-atlas.js';
import { describeRegion, FACTIONS } from '../src/campaign-world.js';
import { NO_CLIMB_ZONES, unclimbableAt } from '../src/no-climb-zones.js';
import { PLAYABLE, WINDOW } from '../scripts/build-region-survey.mjs';
import { canWalkSlope, isClimbTerrain, createClimbing, sampleClimbSurface } from '../src/climbing.js';
import { OWN_SKY } from './own-sky.js';
import { OVES_BORDER_STREAM, GALA_DESERT_STREAM, GALA_TELEMONIA_STREAM, OVES_RIVERS, GALA_RIVERS, inWestWater } from '../src/west-regions.js';
import { WEST_PROFILES, westGroundAt, westWaterSurface } from '../src/west-ground.js';
import {
  TELEMONIA, TELEMONIA_CLIMATE, UNBUILT_NEIGHBOURS, TELEMONIA_CELLS, PLAIN_CELLS, RIM_CELLS, BORDER, TELEMONIA_BOX, PLAIN_MIDDLE,
  GALMETH, CREST, INNER, ROTHKAR, PASSES, WASHES, GULLIES, KETHORN, KETHORN_WALL, STRATA, TERRACES, TELEMONIA_LANDMARKS, TERRACE_VIEW,
  telemoniaGround, telemoniaPlace, telemoniaTint, plainLevel, plainDistance, borderDepth, passAt, passCol, washAt, washWeight, kethornFrame,
  kethornPoint, kethornLift, onKethornTop, topOutside, stairDistance, belkethShare, crestHeight, ridgePhase, gullyAt,
  kethornBearing, kethornUnclimbable, ROTHKAR_WAY, wayAt, onPassFloor, inTelemoniaBox, TELEMONIA_PATCH_REACH,
} from '../src/telemonia-world.js';
import { closedRegionEntered } from '../src/closed-border.js';
import { TELEMONIA_WILDLIFE_ZONES } from '../src/telemonia-wildlife.js';
import { TELEMONIA_TOWN_LANDMARKS } from '../src/telemonia-ways.js';
import { legemumSeamDistance } from '../src/legemum-world.js';
import { eastPyrosBoundaryDistance } from '../src/east-pyros-world.js';

/**
 * Telemonia, stage 1: the country and not its people (docs/telemonia-stage1-brief.md,
 * docs/telemonia-stage1-report.md). The user's paragraph is the specification - "rockier and more
 * elevated so there is room for terrace farming and rock based defenses" - and the lore rewritten to it
 * on 2026-10-01 is the rest: a bowl with a thick rim of ridges and cliff bands, few passes, one enclosed
 * plain, a rock in the middle of it with cliff on three sides and a wall on the fourth, terraces on the
 * rim's inner faces, a wood in one corner.
 *
 * The atlas is the authority, and most of the first tests are its arithmetic. The rest holds the ground
 * to what the brief asked of it and could be got wrong quietly: **the cliffs stop a walker**, measured
 * with the game's own climbing rule over the whole country, and **nobody is sealed in**, on the rim, in
 * the basin or on the rock.
 */
const { scopedWorld } = await import('./scoped-world.js');
const { createWestLife, LIFE_REACH, WEST_LIFE_ZONES } = await sourceModule('../src/west-regions-life.js');
const scene = new THREE.Scene();
// Build this country and its actual registered neighbors through Fast's production
// jobs. The fixture retains real neighboring meshes and colliders for seam tests.
const reviewNames = new Set([TELEMONIA, ...BORDER.map(edge => edge.neighbour)]);
const world = await scopedWorld(scene, regions.filter(region => reviewNames.has(region.name)).map(region => region.id));
const country = regions.find(region => region.name === TELEMONIA);
const cells = REGION_CELLS[TELEMONIA];
const WWMAP = new URL('../../world-builder/map/resources/examples/azhora.wwmap', import.meta.url);
const ATLAS = JSON.parse(readFileSync(new URL('../assets/azhora-dev-regions.json', import.meta.url), 'utf8'));
const OWNER = (() => {
  const owners = new Map();
  for (const region of ATLAS.regions) for (const cell of region.cells) owners.set(`${cell.q},${cell.r}`, region.name ?? region.id);
  return owners;
})();
const AXIAL = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const H = (x, z) => world.heightAt(x, z);
const slope = (x, z, s = .4) => Math.hypot(H(x + s, z) - H(x - s, z), H(x, z + s) - H(x, z - s)) / (2 * s);
const mean = list => list.reduce((sum, v) => sum + v, 0) / list.length;
const RADIUS = .34;

// ---------------------------------------------------------------------------
// The walking flood: the game's own rules, over the whole country, once
// ---------------------------------------------------------------------------
/**
 * Every metre of the box, its height and whether a body can stand there, sampled once. Steps between
 * neighbours are judged by the game's own `canWalkSlope` (src/climbing.js) - which is what the traveler
 * controller asks before every uphill step in a climbing country - against a heightfield read off this
 * lattice, and by `canStand`, which carries every collider the world placed: the wall, the trees, the
 * rocks. A descent is always allowed, as it is in the game: going down a cliff is a fall, not a wall.
 */
const LAT = (() => {
  const step = 1, B = TELEMONIA_BOX;
  const cols = Math.floor((B.maxX - B.minX) / step) + 1, rows = Math.floor((B.maxZ - B.minZ) / step) + 1;
  const h = new Float32Array(cols * rows), stand = new Uint8Array(cols * rows), own = new Uint8Array(cols * rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = B.minX + i * step, z = B.minZ + j * step, k = j * cols + i;
    h[k] = H(x, z); stand[k] = canStand(x, z, world, RADIUS) ? 1 : 0; own[k] = hexOwnerAt(x, z) === TELEMONIA ? 1 : 0;
  }
  const heightAt = (x, z) => {
    const fx = (x - B.minX) / step, fz = (z - B.minZ) / step, i = Math.max(0, Math.min(cols - 2, Math.floor(fx))), j = Math.max(0, Math.min(rows - 2, Math.floor(fz)));
    const u = fx - i, v = fz - j, k = j * cols + i;
    return (h[k] * (1 - u) + h[k + 1] * u) * (1 - v) + (h[k + cols] * (1 - u) + h[k + cols + 1] * u) * v;
  };
  const climbWorld = { heightAt, regionAt: world.regionAt };
  const at = k => ({ x: B.minX + (k % cols) * step, z: B.minZ + Math.floor(k / cols) * step });
  const index = (x, z) => Math.round((z - B.minZ) / step) * cols + Math.round((x - B.minX) / step);
  /** May a walker step from cell `a` to its neighbour `b`? */
  const walk = (a, b) => {
    if (!stand[b]) return false;
    const p = at(a), q = at(b);
    return canWalkSlope(p.x, p.z, q.x, q.z, climbWorld);
  };
  const neighbours = k => {
    const i = k % cols, out = [];
    if (i > 0) out.push(k - 1); if (i < cols - 1) out.push(k + 1);
    if (k >= cols) out.push(k - cols); if (k < cols * (rows - 1)) out.push(k + cols);
    return out;
  };
  /** Everywhere a walker can get to from `seeds`, with `blocked` cells refused. */
  const flood = (seeds, blocked = () => false) => {
    const seen = new Uint8Array(cols * rows), queue = new Int32Array(cols * rows);
    let tail = 0;
    for (const k of seeds) if (stand[k] && !blocked(k) && !seen[k]) { seen[k] = 1; queue[tail++] = k; }
    for (let head = 0; head < tail; head++) {
      const k = queue[head];
      for (const n of neighbours(k)) if (!seen[n] && !blocked(n) && walk(k, n)) { seen[n] = 1; queue[tail++] = n; }
    }
    return seen;
  };
  /** Everywhere a walker can get **out** from: the flood run backwards, from `targets`. */
  const reaches = targets => {
    const seen = new Uint8Array(cols * rows), queue = new Int32Array(cols * rows);
    let tail = 0;
    for (const k of targets) if (stand[k] && !seen[k]) { seen[k] = 1; queue[tail++] = k; }
    for (let head = 0; head < tail; head++) {
      const k = queue[head];
      for (const n of neighbours(k)) if (!seen[n] && stand[n] && walk(n, k)) { seen[n] = 1; queue[tail++] = n; }
    }
    return seen;
  };
  const outside = [];
  for (let k = 0; k < cols * rows; k++) if (!own[k] && stand[k]) outside.push(k);
  return { step, cols, rows, h, stand, own, at, index, flood, reaches, outside, walk };
})();
const passCorridor = (x, z) => { const p = passAt(x, z); return !!p && p.distance < p.half + 6 && p.along > p.pass.run[1] - 4 && p.along < p.pass.length - 12; };
const OPEN = LAT.flood(LAT.outside);
const SHUT = LAT.flood(LAT.outside, k => { const p = LAT.at(k); return passCorridor(p.x, p.z); });

test('the atlas: twenty-five hexes of hills round eight of plain, registered after everything that was there before', () => {
  // **No number is written here on purpose**: the country is renumbered the day it lands. What holds is
  // that it comes after everything on the base it was built on, and that its id is its place in the list.
  assert.ok(Number.isInteger(REGION_IDS[TELEMONIA]) && REGION_IDS[TELEMONIA] > REGION_IDS.Selemi, `Telemonia is region ${REGION_IDS[TELEMONIA]}`);
  assert.equal(REGION_IDS[TELEMONIA], PLAYABLE_REGIONS.indexOf(TELEMONIA) + 1);
  assert.ok(PLAYABLE_REGIONS.indexOf('Selemi') < PLAYABLE_REGIONS.indexOf(TELEMONIA), 'appended, never inserted');
  assert.ok(PLAYABLE.includes(TELEMONIA), 'surveyed');
  const atlas = ATLAS.regions.find(region => (region.name ?? region.id) === TELEMONIA);
  assert.deepEqual(cells.map(cell => [cell.q, cell.r]), atlas.cells.map(cell => [cell.q, cell.r]), 'the survey’s hexes are the atlas’s');
  assert.equal(cells.length, 25);
  const tally = {}; for (const cell of cells) tally[cell.terrain] = (tally[cell.terrain] ?? 0) + 1;
  assert.deepEqual(tally, { hills: 17, plains: 8 });
  assert.deepEqual(PLAIN_CELLS.map(c => `${c.q},${c.r}`), ['-14,119', '-13,119', '-15,120', '-14,120', '-13,120', '-15,121', '-14,121', '-13,121']);
  // Every one of the eight plains is ringed by the country, and sixteen of the seventeen hills hexes are on
  // its edge. The seventeenth, (-16,121), is the one place the rim is two hexes thick all round - the
  // western rim, where the Rothkar stands.
  for (const cell of PLAIN_CELLS) for (const [dq, dr] of AXIAL) assert.equal(OWNER.get(`${cell.q + dq},${cell.r + dr}`), TELEMONIA, `(${cell.q},${cell.r}) touches the border`);
  const inland = RIM_CELLS.filter(cell => AXIAL.every(([dq, dr]) => OWNER.get(`${cell.q + dq},${cell.r + dr}`) === TELEMONIA));
  assert.deepEqual(inland.map(c => `${c.q},${c.r}`), ['-16,121']);
  const rothkarHex = hexAt(ROTHKAR.x, ROTHKAR.z);
  assert.deepEqual([rothkarHex.q, rothkarHex.r], [-16, 121], 'the Rothkar stands on the one hills hex that touches no border');
  assert.equal(REGION_BIOMES[TELEMONIA].ownScatter, true);
  assert.equal(new Set(PLAYABLE_REGIONS.map(name => REGION_BIOMES[name].id)).size, PLAYABLE_REGIONS.length, 'a biome of its own');
  assert.equal(regionLevel(TELEMONIA), 3);
  // Neighbours by shared hex edge, off the whole atlas, and the module's own reading of them agrees.
  const neighbours = {};
  for (const cell of cells) for (const [dq, dr] of AXIAL) {
    const other = OWNER.get(`${cell.q + dq},${cell.r + dr}`) ?? 'sea';
    if (other !== TELEMONIA) neighbours[other] = (neighbours[other] ?? 0) + 1;
  }
  assert.deepEqual(neighbours, { 'Oves Desert': 12, Gala: 9, Legemum: 9, 'East Pyros': 8 });
  const read = {}; for (const edge of BORDER) read[edge.neighbour] = (read[edge.neighbour] ?? 0) + 1;
  assert.deepEqual(read, neighbours);
  for (const [k, name] of Object.entries(UNBUILT_NEIGHBOURS)) assert.equal(OWNER.get(k), name, k);
  // No river inside; the Caelin on five of the Oves edges and the Treloss on seven of Gala's.
  const own = new Set(cells.map(c => `${c.q},${c.r}`));
  const wet = { inside: 0, 'Oves Desert': 0, Gala: 0 };
  for (const edge of RIVER_EDGES) {
    const a = edge.a.join(','), b = edge.b.join(',');
    if (own.has(a) && own.has(b)) wet.inside++;
    else if (own.has(a) || own.has(b)) wet[OWNER.get(own.has(a) ? b : a)]++;
  }
  assert.deepEqual(wet, { inside: 0, 'Oves Desert': 5, Gala: 7 });
});

test('the climate is the World Builder map’s, hex by hex, and the sky is the Oves Desert’s', () => {
  assert.equal(Object.keys(TELEMONIA_CLIMATE).length, 25);
  const counts = {}; for (const code of Object.values(TELEMONIA_CLIMATE)) counts[code] = (counts[code] ?? 0) + 1;
  assert.deepEqual(counts, { BSh: 23, Csb: 2 });
  assert.deepEqual(Object.entries(TELEMONIA_CLIMATE).filter(([, c]) => c === 'Csb').map(([k]) => k), ['-12,121', '-13,122'], 'the Belketh is the south-east corner');
  if (existsSync(WWMAP)) {
    const map = JSON.parse(readFileSync(WWMAP, 'utf8').replace(/^﻿/, ''));
    for (const [k, code] of Object.entries(TELEMONIA_CLIMATE)) {
      assert.equal(map.hexes[k]?.climate, code, `${k} is ${map.hexes[k]?.climate} on the map`);
      assert.equal(map.hexes[k]?.region, TELEMONIA);
    }
  }
  const desert = regions.find(region => region.name === 'Oves Desert');
  assert.deepEqual({ ...regionSky(country) }, { ...regionSky(desert) }, 'one dry air over the belt');
  assert.ok(OWN_SKY.has(TELEMONIA));
  assert.equal(REGION_TERRAIN[TELEMONIA].wave, REGION_TERRAIN['Oves Desert'].wave, 'on the neighbours’ wavelength: no ribs at the border');
});

test('it moves neither the world box nor the survey window', () => {
  const survey = PLAYABLE_SURVEY;
  const all = worldBoundsFor(survey, HEX_WORLD_TRANSFORM, PLAYABLE_REGIONS);
  assert.deepEqual(worldBoundsFor(survey, HEX_WORLD_TRANSFORM, PLAYABLE_REGIONS.filter(name => name !== TELEMONIA)), all);
  const outline = country.outline.flat();
  const box = { minX: Math.min(...outline.map(p => p.x)), maxX: Math.max(...outline.map(p => p.x)), minZ: Math.min(...outline.map(p => p.z)), maxZ: Math.max(...outline.map(p => p.z)) };
  assert.ok(box.minX - all.minX > 2000 && all.maxX - box.maxX > 2000 && box.minZ - all.minZ > 3000 && all.maxZ - box.maxZ > 1500, JSON.stringify(box));
  // Every hex already land, and the window holds them with room.
  const land = new Set(LAND_HEXES.map(([q, r]) => `${q},${r}`));
  for (const cell of cells) {
    assert.ok(land.has(`${cell.q},${cell.r}`));
    assert.ok(cell.q > WINDOW.minQ && cell.q < WINDOW.maxQ && cell.r > WINDOW.minR && cell.r < WINDOW.maxR);
  }
});

test('the border is the neighbours’ own ground, and their streams, seams and slopes are as they were', () => {
  // Nothing is written off the country's own hexes, and at the border line the country's shape alone is
  // the ground it was handed.
  for (const edge of BORDER) for (const t of [.1, .3, .5, .7, .9]) {
    const x = edge.a.x + (edge.b.x - edge.a.x) * t, z = edge.a.z + (edge.b.z - edge.a.z) * t;
    for (const g of [3, 12, 40]) assert.ok(Math.abs(telemoniaGround(x, z, g) - g) < .05, `the border at ${x.toFixed(1)}, ${z.toFixed(1)} is not the ground it was handed`);
  }
  // In the world, the ground never steps **up** on the way out of the country - the world's hex blend
  // steps along the border, and this side is lifted to meet the far side where it is lower - and at each
  // pass's mouth it meets the far side to a few centimetres, both ways.
  let worst = 0;
  for (const edge of BORDER) {
    const c = hexCentre(edge.cell[0], edge.cell[1]), a = hexCentre(edge.across[0], edge.across[1]), n = Math.hypot(a.x - c.x, a.z - c.z);
    // Not within six metres of a corner: where two of the far side's hexes meet the border at one point,
    // the far side has a seam of its own there, and no one height on this side meets both of them.
    for (let t = .1; t < .91; t += .05) {
      const x = edge.a.x + (edge.b.x - edge.a.x) * t, z = edge.a.z + (edge.b.z - edge.a.z) * t;
      // In a border stream the ground is the stream's channel on both sides, and none of it is this country's.
      if (inWestWater(x, z, 2)) continue;
      // A tenth of a metre across the line: a step up that size is one the climbing rule lets a walker take
      // (.9 of the run and eight centimetres, src/climbing.js), and a seam would be the whole of it.
      const inside = H(x - (a.x - c.x) / n * .05, z - (a.z - c.z) / n * .05), outside = H(x + (a.x - c.x) / n * .05, z + (a.z - c.z) / n * .05);
      worst = Math.max(worst, outside - inside);
      assert.ok(outside - inside < .17, `leaving the country at ${x.toFixed(1)}, ${z.toFixed(1)} is a step up of ${(outside - inside).toFixed(2)} m`);
      const p = passAt(x, z);
      if (p && p.distance < p.half - 1 && p.along < p.pass.run[1] + 6) assert.ok(Math.abs(outside - inside) < .35, `${p.pass.id}’s mouth steps ${(outside - inside).toFixed(2)} m`);
    }
  }
  for (const name of ['Gala', 'Oves Desert']) for (const cell of REGION_CELLS[name]) for (const [dx, dz] of [[0, 0], [25, 10], [-25, -10], [10, -30], [-10, 30], [40, 20], [-40, -20]]) {
    const x = cell.x + dx, z = cell.z + dz;
    if (hexOwnerAt(x, z) !== name) continue;
    assert.equal(telemoniaGround(x, z, 7.25), 7.25, `Telemonia writes on ${name} at ${x}, ${z}`);
    if (inWestWater(x, z, 4) || landDistance(x, z) < 45) continue;
    assert.ok(Math.abs(groundWithRiver(x, z) - westGroundAt(x, z)) < 1e-9, `the two ground modules disagree in ${name} at ${x}, ${z}`);
  }
  // The Caelin still hands Gala's reach of itself one river, and both streams still fall the whole way.
  const streamEnd = WEST_PROFILES.get(OVES_BORDER_STREAM.id).at(-1), galaStart = WEST_PROFILES.get(GALA_DESERT_STREAM.id)[0];
  assert.ok(streamEnd.surface >= galaStart.surface - .02 && streamEnd.surface - galaStart.surface < .6,
    `the Caelin drops ${(streamEnd.surface - galaStart.surface).toFixed(2)} m at the join`);
  for (const course of [...OVES_RIVERS, ...GALA_RIVERS]) {
    const profile = WEST_PROFILES.get(course.id);
    for (let i = 1; i < profile.length; i++) assert.ok(profile[i].surface < profile[i - 1].surface, `${course.id} climbs at ${i}`);
  }
  // The Treloss rises at the east pass's foot, and its water is not buried by the highland.
  const head = WEST_PROFILES.get(GALA_TELEMONIA_STREAM.id)[0];
  assert.ok(Math.hypot(head.x - -1900, head.z - 1125.9) < 2);
  for (const sample of WEST_PROFILES.get(GALA_TELEMONIA_STREAM.id).slice(0, 30)) {
    const surface = westWaterSurface(sample.x, sample.z);
    if (surface !== null) assert.ok(H(sample.x, sample.z) <= surface + .05, `the Treloss is buried at ${sample.x.toFixed(0)}, ${sample.z.toFixed(0)}`);
  }
});

test('the rim: high, broken rock round the plain, ridges on the north-east grain, and the Rothkar its highest rock', () => {
  // The Galmeth is a raised, level plain: its own ground is within a metre or two of its level everywhere
  // but the washes and the rock, and it stands well above every neighbour.
  const plain = [];
  for (let x = TELEMONIA_BOX.minX; x < TELEMONIA_BOX.maxX; x += 6) for (let z = TELEMONIA_BOX.minZ; z < TELEMONIA_BOX.maxZ; z += 6) {
    if (hexOwnerAt(x, z) !== TELEMONIA || plainDistance(x, z) > -8 || kethornLift(x, z) > .05 || washWeight(x, z) > 0 || passAt(x, z)?.distance < 20) continue;
    plain.push(H(x, z));
  }
  assert.ok(plain.length > 800, `${plain.length} plain samples`);
  const lo = Math.min(...plain), hi = Math.max(...plain), level = mean(plain);
  assert.ok(Math.abs(level - GALMETH.level) < 1 && hi - lo < 4.5, `the Galmeth is ${lo.toFixed(1)}...${hi.toFixed(1)}, mean ${level.toFixed(1)}`);
  // Every hex across the border stands well below it: the plain is climbed up to from every side.
  for (const name of ['Gala', 'Oves Desert', 'Legemum', 'East Pyros']) {
    const across = [...new Set(BORDER.filter(edge => edge.neighbour === name).map(edge => edge.across.join(',')))]
      .map(k => { const [q, r] = k.split(',').map(Number); const c = hexCentre(q, r); return H(c.x, c.z); });
    // Legemum and East Pyros were unbuilt outland when this was written. Built (3 October 2026), Legemum is hill
    // country at its own base and East Pyros rises toward the divide: their border hexes stand 6.6 m and 3.6 m
    // under the plain where the outland's stood more than ten. The rim between is what stops a walker, and that
    // is held below; here it is enough that the plain is still the higher ground.
    const need = { Legemum: 5, 'East Pyros': 3 }[name] ?? 10;
    assert.ok(level - mean(across) > need, `the plain stands only ${(level - mean(across)).toFixed(1)} m over ${name}’s border hexes`);
  }
  // The rim: its crest stands everywhere at least a cliff over the plain, and the Rothkar is the highest
  // ground in the country, where the rim is thickest.
  let highest = { h: -Infinity };
  const crest = [];
  for (const cell of RIM_CELLS) for (let dx = -40; dx <= 40; dx += 4) for (let dz = -40; dz <= 40; dz += 4) {
    const x = cell.x + dx, z = cell.z + dz;
    if (hexOwnerAt(x, z) !== TELEMONIA || passAt(x, z)?.distance < 30 || gullyAt(x, z)?.distance < 14) continue;
    const h = H(x, z);
    if (h > highest.h) highest = { h, x, z };
    if (plainDistance(x, z) > INNER.terraceWidth + INNER.cliffWidth && borderDepth(x, z) > 40) crest.push(h);
  }
  assert.ok(Math.hypot(highest.x - ROTHKAR.x, highest.z - ROTHKAR.z) < 12, `the highest ground is at ${highest.x}, ${highest.z}, not the Rothkar`);
  assert.ok(highest.h > 85, `the Rothkar stands ${highest.h.toFixed(1)} m`);
  assert.ok(Math.min(...crest) > GALMETH.level + INNER.terraceTop + 8, `the crest falls to ${Math.min(...crest).toFixed(1)} m`);
  assert.ok(mean(crest) > 55, `the crest averages ${mean(crest).toFixed(1)} m`);
  // The Rothkar is on the East Pyros side, and found off the ground: the point of the rim furthest from both the plain and the border.
  assert.equal(hexOwnerAt(ROTHKAR.x, ROTHKAR.z), TELEMONIA);
  assert.ok(ROTHKAR.x < PLAIN_MIDDLE.x - 150, 'the Rothkar is on the western rim');
  // Ridge behind ridge: across the grain, the crest field rises and falls; along it, it holds.
  const across = [], alongGrain = [];
  for (let s = -80; s <= 80; s += 4) {
    across.push(crestHeight(-2300 + s * Math.SQRT1_2, 1240 + s * Math.SQRT1_2));
    alongGrain.push(crestHeight(-2300 + s * Math.SQRT1_2, 1240 - s * Math.SQRT1_2));
  }
  const spread = list => Math.max(...list) - Math.min(...list);
  assert.ok(spread(across) > CREST.amp * 1.5, `across the grain the crest field rises and falls only ${spread(across).toFixed(1)} m`);
  assert.ok(Math.abs(ridgePhase(-2300, 1240) - ridgePhase(-2300 + 30 * Math.SQRT1_2, 1240 - 30 * Math.SQRT1_2)) < .25, 'a ridge runs north-east');
});

test('the cliffs stop a walker: the Galmeth is reached by the three passes and by nothing else', () => {
  // The climbing rule holds over the whole country, and it is the rule that refuses the cliff bands.
  for (const cell of cells) assert.ok(isClimbTerrain(world, cell.x, cell.z), `(${cell.q},${cell.r}) is not climbing country`);
  let plain = 0, open = 0, shut = 0, terrace = 0, terraceShut = 0;
  const leaks = [];
  for (let k = 0; k < LAT.cols * LAT.rows; k += 3) {
    if (!LAT.own[k] || !LAT.stand[k]) continue;
    const p = LAT.at(k), d = plainDistance(p.x, p.z);
    if (d < -6 && kethornLift(p.x, p.z) < .5) { plain++; if (OPEN[k]) open++; if (SHUT[k]) { shut++; if (leaks.length < 6) leaks.push(`${p.x.toFixed(0)}, ${p.z.toFixed(0)}`); } }
    else if (d > 2 && d < INNER.terraceWidth - 2 && telemoniaPlace(p.x, p.z)?.terraced) { terrace++; if (SHUT[k]) terraceShut++; }
  }
  assert.ok(plain > 15000, `${plain} plain cells`);
  assert.ok(open / plain > .97, `with the passes open a walker reaches ${(open / plain * 100).toFixed(1)}% of the Galmeth`);
  assert.equal(shut, 0, `with the passes shut a walker still reaches the Galmeth at ${leaks.join('; ')}`);
  assert.equal(terraceShut, 0, 'or the terraces');
  // Each pass, on its own, lets a walker in: shut the other two and the plain is still reached.
  for (const p of PASSES) {
    const others = PASSES.filter(o => o !== p);
    const seen = LAT.flood(LAT.outside, k => { const q = LAT.at(k), at = passAt(q.x, q.z); return !!at && others.includes(at.pass) && passCorridor(q.x, q.z); });
    assert.equal(seen[LAT.index(PLAIN_MIDDLE.x + 40, PLAIN_MIDDLE.z + 40)], 1, `${p.id} does not reach the Galmeth on its own`);
  }
  // The rim itself is not walked onto from outside: above its foot, nothing outside reaches it.
  let rimHigh = 0, rimReached = 0;
  for (let k = 0; k < LAT.cols * LAT.rows; k += 5) {
    if (!LAT.own[k] || !LAT.stand[k]) continue;
    const p = LAT.at(k);
    if (plainDistance(p.x, p.z) < INNER.terraceWidth + INNER.cliffWidth || passAt(p.x, p.z)?.distance < 25) continue;
    if (LAT.h[k] < 40) continue;
    rimHigh++; if (SHUT[k]) rimReached++;
  }
  assert.ok(rimHigh > 5000);
  assert.equal(rimReached, 0, `${rimReached} cells of the high rim are walked onto from outside`);
});

test('nobody is sealed in: from the rim, the basin and the rock, a walker can always get out', () => {
  const out = LAT.reaches(LAT.outside);
  const pockets = { rim: [], basin: [], rock: [] };
  let counted = 0;
  for (let k = 0; k < LAT.cols * LAT.rows; k++) {
    if (!LAT.own[k] || !LAT.stand[k]) continue;
    counted++;
    if (out[k]) continue;
    const p = LAT.at(k), where = onKethornTop(p.x, p.z) || kethornLift(p.x, p.z) > 2 ? 'rock' : plainDistance(p.x, p.z) < 0 ? 'basin' : 'rim';
    pockets[where].push(`${p.x.toFixed(0)}, ${p.z.toFixed(0)}`);
  }
  assert.ok(counted > 150000, `${counted} cells`);
  for (const [where, list] of Object.entries(pockets)) assert.deepEqual(list.slice(0, 8), [], `${list.length} cells of the ${where} cannot be walked out of`);
  // The travel button's spot is on the plain, and every landmark is reached from it or leads out of the country.
  assert.equal(hexOwnerAt(country.spawn.x, country.spawn.z), TELEMONIA);
  assert.ok(canStand(country.spawn.x, country.spawn.z, world, .5));
  assert.equal(OPEN[LAT.index(country.spawn.x, country.spawn.z)], 1, 'the travel spot is reached from outside');
});

test('Kethorn’s rock: cliff on three sides, a wall with one gate across the fourth, and level ground on top', () => {
  const top = H(KETHORN.x, KETHORN.z), plain = plainLevel(KETHORN.x, KETHORN.z);
  assert.ok(top - plain > 18 && top - plain < 25, `the rock stands ${(top - plain).toFixed(1)} m over the plain`);
  assert.equal(hexOwnerAt(KETHORN.x, KETHORN.z), TELEMONIA);
  const home = hexAt(KETHORN.x, KETHORN.z);
  assert.deepEqual([home.q, home.r], [-14, 120], 'on the middle plains hex');
  // Cliff all round but the spur, and a crag's cliff (the user, 2026-10-02: "it reads as a smooth round
  // drum"): from the top's edge outward the ground falls fourteen metres inside twelve, and round the three
  // cliff sides it comes down in courses - a band of cliff, a ledge, another band.
  let cliffs = 0, open = 0, coursed = 0, crag = 0;
  for (let a = 0; a < 72; a++) {
    const angle = a / 72 * Math.PI * 2, cx = Math.cos(angle), cz = Math.sin(angle);
    // Walk out from the middle to the top's edge on this bearing.
    let r = 0; while (r < 80 && topOutside(KETHORN.x + cx * r, KETHORN.z + cz * r) < 0) r += .25;
    const x = KETHORN.x + cx * r, z = KETHORN.z + cz * r;
    const { u } = kethornFrame(x, z);
    if (u > KETHORN.neck - 6) { open++; continue; }
    const drop = H(x - cx, z - cz) - H(x + cx * 12, z + cz * 12);
    assert.ok(drop > 14, `the rock’s edge on bearing ${(angle * 180 / Math.PI).toFixed(0)} falls only ${drop.toFixed(1)} m`);
    cliffs++;
    if (Math.abs(kethornBearing(x, z)) < 1.05) continue;   // the spur end keeps its plain cliff
    crag++;
    // Down the face a quarter metre at a time: a band is a run steeper than two in one, a ledge a metre or
    // more under one in two between two bands.
    let bands = 0, ledges = 0, inBand = false, flat = 0;
    for (let s = 0; s < 12; s += .25) {
      const g = (H(x + cx * s, z + cz * s) - H(x + cx * (s + .25), z + cz * (s + .25))) / .25;
      if (g > 2) { if (!inBand) { if (bands && flat >= 1) ledges++; bands++; } inBand = true; flat = 0; }
      else { inBand = false; if (g < .5) flat += .25; }
    }
    if (bands >= 2 && ledges >= 1) coursed++;
  }
  assert.ok(cliffs > 50 && open > 2, `${cliffs} bearings of cliff and ${open} of open spur`);
  assert.ok(crag > 30 && coursed / crag > .8, `${coursed} of ${crag} bearings round the cliffs come down in courses`);
  // Its outline is a crag's and not an ellipse's: walked round in the ellipse's own measure, the top's edge
  // stands out in buttresses and falls back in bays all round the three cliff sides.
  const reach = [];
  for (let a = 0; a < 180; a++) {
    const theta = -Math.PI + a / 180 * Math.PI * 2;
    if (Math.abs(theta) < 1.05) { reach.push(null); continue; }
    let r = .5;
    for (;;) { const p = kethornPoint(KETHORN.topShift + Math.cos(theta) * r * KETHORN.topHalf, Math.sin(theta) * r * KETHORN.topWide); if (topOutside(p.x, p.z) >= 0 || r > 2) break; r += .004; }
    reach.push(r);
  }
  let lobes = 0;
  for (let a = 1; a < 179; a++) if (reach[a - 1] && reach[a] && reach[a + 1] && reach[a] > reach[a - 1] && reach[a] >= reach[a + 1]) lobes++;
  const known = reach.filter(r => r !== null);
  assert.ok(lobes >= 5 && Math.max(...known) - Math.min(...known) > .1, `${lobes} buttresses, the edge between ${Math.min(...known).toFixed(2)} and ${Math.max(...known).toFixed(2)} of the ellipse`);
  // The spur is walked: its own line from the plain to the gate never pitches more than a walker takes.
  for (let u = KETHORN.spurTo; u > KETHORN.neck + 3; u -= 1) {
    const a = kethornPoint(u, 0), b = kethornPoint(u - 1, 0);
    assert.ok(canWalkSlope(a.x, a.z, b.x, b.z, world), `the spur cannot be walked up at ${u} m`);
  }
  // The wall: a real barrier with colliders, an open gate in it, and its ends on the cliff's lip.
  const walls = world.colliders.filter(c => c.kind === 'kethorn-wall'), towers = world.colliders.filter(c => c.kind === 'kethorn-tower');
  assert.ok(walls.length >= 12 && towers.length === 2, `${walls.length} wall colliders and ${towers.length} towers`);
  const gate = KETHORN_WALL.gate;
  assert.ok(canStand(gate.centre.x, gate.centre.z, world, RADIUS), 'the gate passage is open');
  assert.ok(gate.halfWidth * 2 > 3.5);
  const ends = [KETHORN_WALL.circuit.corners[0], KETHORN_WALL.circuit.corners.at(-1)];
  for (const end of ends) {
    const { v } = kethornFrame(end.x, end.z), side = Math.sign(v), beyond = kethornPoint(kethornFrame(end.x, end.z).u, v + side * 4);
    assert.ok(top - H(beyond.x, beyond.z) > 10, `four metres past the wall’s end the ground is ${(top - H(beyond.x, beyond.z)).toFixed(1)} m below the top`);
  }
  // Shut the gate and the top cannot be walked onto; open it and all of it can.
  const gateCells = k => { const p = LAT.at(k); return Math.hypot(p.x - gate.centre.x, p.z - gate.centre.z) < gate.halfWidth + 1.5; };
  const shutGate = LAT.flood(LAT.outside, gateCells);
  let onTop = 0, reached = 0, reachedShut = 0;
  for (let k = 0; k < LAT.cols * LAT.rows; k++) {
    const p = LAT.at(k);
    if (!LAT.stand[k] || !onKethornTop(p.x, p.z, 3)) continue;
    onTop++; if (OPEN[k]) reached++; if (shutGate[k]) reachedShut++;
  }
  assert.ok(onTop > 2500, `${onTop} m² of the top`);
  assert.equal(reached, onTop, 'all of the top is walked onto through the gate');
  assert.equal(reachedShut, 0, 'and none of it without the gate');
  // The top is usable ground: most of it pitches less than one in ten.
  let level = 0, all = 0;
  for (let x = KETHORN.x - 60; x <= KETHORN.x + 60; x += 2) for (let z = KETHORN.z - 60; z <= KETHORN.z + 60; z += 2) {
    if (!onKethornTop(x, z, 1)) continue;
    all++; if (slope(x, z, 1) < .1) level++;
  }
  assert.ok(all * 4 > 3000 && level / all > .9, `${level * 4} of ${all * 4} m² of the top is level`);
});

test('Kethorn’s rock cannot be climbed: the gate is the only way onto its top, for a climber as for a walker', () => {
  // The rule is the climbing rule's own (src/climbing.js, `climbForbidden`): the world marks the rock and
  // the game's climbing check reads the mark. The climbing world is built as the game builds it for the
  // controller (src/main.js), and the same world without the mark shows what the mark refuses.
  // The world answers from one table of such places now (src/no-climb-zones.js); Kethorn's rock is a row of it.
  assert.equal(world.unclimbableAt, unclimbableAt);
  assert.ok(NO_CLIMB_ZONES.some(zone => zone.at === kethornUnclimbable), 'Kethorn’s rock is not a row of the no-climb table');
  const climbWorld = { bounds: world.bounds, colliders: world.colliders, heightAt: world.heightAt, waterAt: world.waterAt, regionAt: world.regionAt,
    nearColliders: (x, z, r) => world.nearColliders(x, z, r), unclimbableAt: world.unclimbableAt, canClimbMove: (from, to) => !closedRegionEntered(from, to) };
  const unmarked = { ...climbWorld, unclimbableAt: undefined };
  // Every square metre of the rock - faces, ledges, talus, spur, top - gives no hold, and the faces would.
  let rock = 0, held = 0, faces = 0;
  for (let x = KETHORN.x - 110; x <= KETHORN.x + 110; x += 1) for (let z = KETHORN.z - 110; z <= KETHORN.z + 110; z += 1) {
    if (kethornLift(x, z) <= .2) continue;
    rock++;
    if (sampleClimbSurface(climbWorld, x, z).allowed) held++;
    if (sampleClimbSurface(unmarked, x, z).climbable) faces++;
  }
  assert.ok(rock > 9000, `${rock} m² of rock`);
  assert.equal(held, 0, `${held} m² of the rock give a hold`);
  assert.ok(faces > 800, `${faces} m² of the rock’s faces are steep enough to climb, and only the mark refuses them`);
  // The game's own climbing check, from the foot of every band of every face and of the spur's sides,
  // facing the rock: no grab - where without the mark there would be one.
  const stands = [];
  for (let a = 0; a < 120; a++) {
    const angle = a / 120 * Math.PI * 2, cx = Math.cos(angle), cz = Math.sin(angle);
    let r = 0; while (r < 90 && topOutside(KETHORN.x + cx * r, KETHORN.z + cz * r) < 0) r += .25;
    for (let s = .5; s < 30; s += .25) {
      const x = KETHORN.x + cx * (r + s), z = KETHORN.z + cz * (r + s);
      if (kethornLift(x, z) <= 0) break;
      const inward = H(x - cx * 1.2, z - cz * 1.2) - H(x, z);
      if (slope(x, z, .3) < .5 && inward > 1.2 && canStand(x, z, world, RADIUS)) stands.push({ x, z, facing: Math.atan2(-cx, -cz) });
    }
  }
  for (let u = KETHORN.spurFrom + 6; u < KETHORN.spurTo - 8; u += 3) for (const side of [-1, 1]) for (let off = 0; off < 12; off += .5) {
    const p = kethornPoint(u, side * (KETHORN.spurHalf + off)), inward = kethornPoint(u, side * (KETHORN.spurHalf + off - 1.2));
    if (slope(p.x, p.z, .3) < .5 && H(inward.x, inward.z) - H(p.x, p.z) > 1.2 && canStand(p.x, p.z, world, RADIUS)) {
      stands.push({ x: p.x, z: p.z, facing: Math.atan2(inward.x - p.x, inward.z - p.z) });
      break;
    }
  }
  let grabs = 0, grabsUnmarked = 0;
  for (const s of stands) for (const turn of [0, -.5, .5]) {
    const from = { x: s.x, y: H(s.x, s.z), z: s.z };
    if (createClimbing({ world: climbWorld }).probe(from, s.facing + turn).available) grabs++;
    if (createClimbing({ world: unmarked }).probe(from, s.facing + turn).available) grabsUnmarked++;
  }
  assert.ok(stands.length > 100, `${stands.length} places to stand at the foot of a band`);
  assert.equal(grabs, 0, `${grabs} grabs on the rock`);
  assert.ok(grabsUnmarked > stands.length, `without the mark ${grabsUnmarked} of those would have been grabs`);
  // The wall gives no hold either: from the spur, facing it on either side of the gate.
  const gate = KETHORN_WALL.gate;
  for (const off of [-5, -3, 3, 5]) {
    const p = { x: gate.centre.x - gate.inward.x * 2 + gate.inward.z * off, z: gate.centre.z - gate.inward.z * 2 - gate.inward.x * off };
    assert.equal(createClimbing({ world: climbWorld }).probe({ ...p, y: H(p.x, p.z) }, Math.atan2(gate.inward.x, gate.inward.z)).available, false, 'the wall is climbed');
  }
  // The rim is as it was: a climber can still come over it. From the foot of a band on the outer face
  // above the Oves Desert, the same check finds holds, and a climb gains the band.
  const rimStands = [];
  for (const edge of BORDER.filter(e => e.neighbour === 'Oves Desert')) {
    const c = hexCentre(edge.cell[0], edge.cell[1]), mid = { x: (edge.a.x + edge.b.x) / 2, z: (edge.a.z + edge.b.z) / 2 };
    const n = Math.hypot(c.x - mid.x, c.z - mid.z), nx = (c.x - mid.x) / n, nz = (c.z - mid.z) / n;
    for (let s = 3; s < 40; s += .25) {
      const x = mid.x + nx * s, z = mid.z + nz * s;
      if (passAt(x, z)?.distance < 20) break;
      if (slope(x, z, .3) < .5 && H(x + nx * 1.2, z + nz * 1.2) - H(x, z) > 1.2 && canStand(x, z, world, RADIUS)) { rimStands.push({ x, z, facing: Math.atan2(nx, nz) }); break; }
    }
  }
  const rimGrabs = rimStands.filter(s => createClimbing({ world: climbWorld }).probe({ x: s.x, y: H(s.x, s.z), z: s.z }, s.facing).available);
  assert.ok(rimGrabs.length >= 3, `${rimGrabs.length} of ${rimStands.length} bands of the outer rim give a hold`);
  const climber = createClimbing({ world: climbWorld }), first = rimGrabs[0], before = H(first.x, first.z);
  assert.ok(climber.grab({ x: first.x, y: before, z: first.z }, first.facing, { stamina: 100 }));
  let stamina = 100;
  for (let t = 0; t < 12 && climber.active; t += 1 / 30) stamina -= climber.tick(1 / 30, { playing: true, up: 1, stamina, level: 1 }).staminaSpent;
  assert.ok(climber.view().position.y > before + 2, `the climber gained only ${(climber.view().position.y - before).toFixed(1)} m`);
});

test('the Rothkar way: walked from the Galmeth up onto the rim at the foot of the Rothkar - onto it, and not through it', () => {
  const w = ROTHKAR_WAY, start = w.points[0], end = w.points.at(-1);
  const alongWay = s => {
    let i = 1; while (i < w.run.length - 1 && w.run[i] < s) i++;
    const a = w.points[i - 1], b = w.points[i], t = Math.max(0, Math.min(1, (s - w.run[i - 1]) / (w.run[i] - w.run[i - 1])));
    return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
  };
  assert.ok(plainDistance(start.x, start.z) < 0, 'it leaves from the Galmeth');
  assert.ok(plainDistance(end.x, end.z) > INNER.terraceWidth + INNER.cliffWidth, 'and comes out over the inner cliff');
  const toRothkar = Math.hypot(end.x - ROTHKAR.x, end.z - ROTHKAR.z);
  assert.ok(toRothkar < ROTHKAR.radius, `its landing is ${toRothkar.toFixed(1)} m from the Rothkar: at its foot`);
  assert.ok(H(end.x, end.z) > GALMETH.level + INNER.terraceTop + INNER.minCliff, `the landing stands at ${H(end.x, end.z).toFixed(1)} m`);
  // Walked the whole way up, half a metre at a time on its own line, with nothing standing on it.
  let steepest = 0;
  for (let s = 0; s < w.length - .5; s += .5) {
    const a = alongWay(s), b = alongWay(s + .5);
    assert.ok(canWalkSlope(a.x, a.z, b.x, b.z, world), `the way cannot be walked up at ${s} m`);
    assert.ok(canStand(b.x, b.z, world, RADIUS), `something stands on the way at ${s} m`);
    steepest = Math.max(steepest, (H(b.x, b.z) - H(a.x, a.z)) / .5);
  }
  assert.ok(steepest < .45, `the way pitches ${steepest.toFixed(2)}`);
  // In the flood: the landing is walked onto from outside through the passes, and with them shut it is not.
  const landing = LAT.index(end.x, end.z);
  assert.equal(OPEN[landing], 1, 'the landing is walked onto');
  assert.equal(SHUT[landing], 0, 'and not without a pass');
  // **Onto the rim, not through it.** From anywhere on the way, with the passes shut, nobody gets out of
  // the country - not even down the outer cliff bands a drop at a time, which the ledges round the
  // Rothkar's foot would lead to if the way were not walled where it stands over the crest.
  const onIt = [];
  for (let k = 0; k < LAT.cols * LAT.rows; k++) { if (!LAT.own[k]) continue; const p = LAT.at(k), at = wayAt(p.x, p.z); if (at && at.distance < at.half) onIt.push(k); }
  assert.ok(onIt.length > 300, `${onIt.length} m² of way`);
  const fromWay = LAT.flood(onIt, k => { const p = LAT.at(k); return passCorridor(p.x, p.z); });
  let out = 0;
  for (let k = 0; k < LAT.cols * LAT.rows; k++) if (fromWay[k] && !LAT.own[k]) out++;
  assert.equal(out, 0, `${out} m² outside the country are walked to from the way without a pass`);
  // And of the high rim, the way and its landing are all a walker reaches - with the west gully's head,
  // which the Galmeth reached before the way was built.
  const elsewhere = [];
  for (let k = 0; k < LAT.cols * LAT.rows; k++) {
    if (!LAT.own[k] || !OPEN[k] || LAT.h[k] < 40) continue;
    const p = LAT.at(k);
    if (plainDistance(p.x, p.z) < INNER.terraceWidth + INNER.cliffWidth || passAt(p.x, p.z)?.distance < 25) continue;
    const at = wayAt(p.x, p.z), g = gullyAt(p.x, p.z);
    if ((at && at.distance < at.half + 8) || (g && g.distance < 14)) continue;
    elsewhere.push(`${p.x.toFixed(0)}, ${p.z.toFixed(0)}`);
  }
  assert.deepEqual(elsewhere.slice(0, 6), [], `${elsewhere.length} m² of the high rim are walked onto off the way`);
  // Its revetment and its parapets are drawn.
  assert.ok(world.telemoniaMetrics.wayWallMetres > 100, `${world.telemoniaMetrics.wayWallMetres} m of the way’s walls`);
});

test('the old backdrop mountains stand on no built country', () => {
  // `src/world.js` drew ten green cones on the horizon of the first small world. The west was built under
  // them since: one stood in Gala by the Treloss at Telemonia's border, half sunk in the rim. A cone is
  // drawn only where all of its footprint is open country, and on 2026-10-02 none of the ten is.
  const mountains = world.backdropMountains;
  assert.equal(mountains.length, 10);
  assert.deepEqual(mountains.map(m => m.region), ['Vastos', 'Meneth', 'Meneth', 'Caricas', 'Caricas', 'Nesdor', 'Nesdor', 'Ovesos', 'Oves Desert', 'Gala']);
  assert.deepEqual(mountains.filter(m => m.drawn).map(m => m.index), []);
  let cones = 0;
  scene.traverse(o => { if (o.isMesh && o.material?.color?.getHexString?.() === '849b83') cones++; });
  assert.equal(cones, 0, 'no cone of theirs is in the scene');
});

test('the passes: three, each to its own neighbour, floors a walker takes and walls he does not', () => {
  assert.deepEqual(PASSES.map(p => p.faces), ['Oves Desert', 'Gala', 'Legemum']);
  assert.equal(PASSES[0].name, 'The Tarnel');
  for (const p of PASSES) {
    // It opens on the neighbour it faces: the hex just outside its mouth is that country's.
    const outside = p.points[0];
    assert.equal(OWNER.get(`${hexAt(outside.x, outside.z).q},${hexAt(outside.x, outside.z).r}`), p.faces, `${p.id} opens on ${OWNER.get(`${hexAt(outside.x, outside.z).q},${hexAt(outside.x, outside.z).r}`)}`);
    assert.ok(plainDistance(p.points.at(-1).x, p.points.at(-1).z) < 0, `${p.id} does not reach the Galmeth`);
    // Its floor is walked the whole way in, step by step on its own line.
    let worst = 0;
    for (let s = p.run[1] - 6; s < p.length - 1; s += .5) {
      const a = alongPass(p, s), b = alongPass(p, s + .5);
      assert.ok(canWalkSlope(a.x, a.z, b.x, b.z, world), `${p.id} cannot be walked up at ${s.toFixed(1)} m`);
      worst = Math.max(worst, Math.abs(H(b.x, b.z) - H(a.x, a.z)) / .5);
    }
    assert.ok(worst < .65, `${p.id} pitches ${worst.toFixed(2)}`);
    // And its walls are not: four metres off the floor's edge at the narrows, the ground is a cliff.
    const narrows = p.stations.reduce((best, st) => (st[2] < best[2] ? st : best));
    const mid = alongPass(p, narrows[0]), next = alongPass(p, narrows[0] + 2);
    const nx = -(next.z - mid.z) / 2, nz = (next.x - mid.x) / 2;
    for (const side of [-1, 1]) {
      const x = mid.x + nx * side * (narrows[2] + 3), z = mid.z + nz * side * (narrows[2] + 3);
      assert.ok(H(x, z) - H(mid.x, mid.z) > 3, `${p.id}’s ${side < 0 ? 'left' : 'right'} wall stands only ${(H(x, z) - H(mid.x, mid.z)).toFixed(1)} m`);
    }
  }
  function alongPass(p, s) {
    let i = 1; while (i < p.run.length - 1 && p.run[i] < s) i++;
    const a = p.points[i - 1], b = p.points[i], t = Math.max(0, Math.min(1, (s - p.run[i - 1]) / (p.run[i] - p.run[i - 1])));
    return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
  }
});

test('the Legemum and East Pyros borders: one smooth ground across the line, and the south pass walked from Legemum', () => {
  // Built after this country, each shaped its ground toward the world's hex blend at the border, which along
  // these two borders steps at hex edges and ribs (a blend of 150 m and 320 m waves): up to 4.9 m at the line
  // by the hex corners, and ribs of one in one and more over the neighbours' last forty metres. Measured
  // 2026-10-03 after the seam was laid unchirped on both sides (`telemoniaSeamBedrock`): 0.44 m and 0.69 m at
  // the line, and 0.41 m in any half-metre of either neighbour's own ground within forty metres of it.
  const seam = BORDER.filter(edge => edge.neighbour === 'Legemum' || edge.neighbour === 'East Pyros');
  const third = BORDER.filter(edge => ![TELEMONIA, 'Legemum', 'East Pyros'].includes(edge.neighbour));
  // Where a third country meets the line - the Oves Desert at its north end, Gala at its east - its own seam
  // with the neighbour arrives there too, and nothing laid along this line can meet all three.
  const corners = [];
  for (const edge of seam) for (const p of [edge.a, edge.b])
    if (third.some(o => Math.hypot(o.a.x - p.x, o.a.z - p.z) < .01 || Math.hypot(o.b.x - p.x, o.b.z - p.z) < .01)) corners.push(p);
  assert.equal(corners.length, 2, 'the line runs from the Oves Desert round to Gala');
  for (const name of ['Legemum', 'East Pyros']) {
    let line = 0, side = 0, samples = 0;
    for (const edge of seam.filter(e => e.neighbour === name)) {
      const c = hexCentre(edge.cell[0], edge.cell[1]), a = hexCentre(edge.across[0], edge.across[1]), n = Math.hypot(a.x - c.x, a.z - c.z);
      const nx = (a.x - c.x) / n, nz = (a.z - c.z) / n, length = Math.hypot(edge.b.x - edge.a.x, edge.b.z - edge.a.z);
      for (let s = 0; s <= length; s += .5) {
        const x = edge.a.x + (edge.b.x - edge.a.x) * s / length, z = edge.a.z + (edge.b.z - edge.a.z) * s / length;
        const corner = Math.min(...corners.map(p => Math.hypot(p.x - x, p.z - z)));
        if (corner < 6) continue;
        // Every hex corner on the line is in this, and they were the worst of it.
        const step = Math.abs(H(x + nx * .05, z + nz * .05) - H(x - nx * .05, z - nz * .05));
        line = Math.max(line, step); samples++;
        assert.ok(step < 1, `the ground steps ${step.toFixed(2)} m across the ${name} border at ${x.toFixed(1)}, ${z.toFixed(1)}`);
        if (corner < 40) continue;
        for (let d = .05; d < 40; d += .5) {
          const x0 = x + nx * d, z0 = z + nz * d, x1 = x0 + nx * .5, z1 = z0 + nz * .5;
          if (hexOwnerAt(x0, z0) !== name || hexOwnerAt(x1, z1) !== name) continue;
          const rise = Math.abs(H(x1, z1) - H(x0, z0));
          side = Math.max(side, rise);
          assert.ok(rise < .5, `${name}’s ground ribs ${rise.toFixed(2)} m in half a metre at ${x0.toFixed(1)}, ${z0.toFixed(1)}, ${d.toFixed(1)} m out`);
        }
      }
    }
    assert.ok(samples > 800, `${samples} samples along the ${name} border`);
  }
  // And the neighbours' ground comes down to the rim's foot without creasing where the nearest of the border's
  // hex edges changes - which their feathers did, off the exact distance, in lit bands down the slope (a second
  // difference over two metres of up to 0.64 m in Legemum and 1.15 m in East Pyros; 0.42 and 0.45 since).
  const seg = (x, z, a, b) => { const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - a.x - dx * t, z - a.z - dz * t); };
  for (const name of ['Legemum', 'East Pyros']) {
    let worst = { crease: 0 }, counted = 0;
    for (let x = TELEMONIA_BOX.minX - 60; x < TELEMONIA_BOX.maxX + 60; x += 3) for (let z = TELEMONIA_BOX.minZ - 60; z < TELEMONIA_BOX.maxZ + 60; z += 3) {
      if (hexOwnerAt(x, z) !== name) continue;
      const d = Math.min(...seam.map(edge => seg(x, z, edge.a, edge.b)));
      if (d < 3 || d > 80 || Math.min(...corners.map(p => Math.hypot(p.x - x, p.z - z))) < 40) continue;
      // Only where this border is the nearest of the neighbour's own: its other borders are its own business.
      if ((name === 'Legemum' ? legemumSeamDistance(x, z) : eastPyrosBoundaryDistance(x, z)) < d - .01) continue;
      counted++;
      const h = H(x, z);
      for (const [ux, uz] of [[1, 0], [0, 1], [Math.SQRT1_2, Math.SQRT1_2], [Math.SQRT1_2, -Math.SQRT1_2]]) {
        const crease = Math.abs(H(x + ux * 2, z + uz * 2) - 2 * h + H(x - ux * 2, z - uz * 2));
        if (crease > worst.crease) worst = { crease, x, z };
      }
    }
    assert.ok(counted > 1000, `${counted} points of ${name}`);
    assert.ok(worst.crease < .55, `${name}’s ground creases ${worst.crease.toFixed(2)} m in two metres at ${worst.x}, ${worst.z}`);
  }
  // The south pass is a way: from Legemum's ground thirty metres short of its line's outer end (forty-six from
  // the border), through the mouth with no step at the border, up the floor over the col and down onto the
  // Galmeth - and back - every half-metre at a grade the climbing rule lets a walker take.
  const south = PASSES.find(p => p.faces === 'Legemum');
  const [p0, p1] = south.points, l = Math.hypot(p0.x - p1.x, p0.z - p1.z);
  const at = s => {
    if (s < 0) return { x: p0.x + (p0.x - p1.x) / l * -s, z: p0.z + (p0.z - p1.z) / l * -s };
    let i = 1; while (i < south.run.length - 1 && south.run[i] < s) i++;
    const a = south.points[i - 1], b = south.points[i], t = Math.max(0, Math.min(1, (s - south.run[i - 1]) / (south.run[i] - south.run[i - 1])));
    return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
  };
  assert.equal(hexOwnerAt(at(-30).x, at(-30).z), 'Legemum');
  assert.ok(plainDistance(at(south.length).x, at(south.length).z) < 0, 'it ends on the Galmeth');
  let crossed = false, worst = 0;
  for (let s = -30; s < south.length - .5; s += .5) {
    const a = at(s), b = at(s + .5);
    assert.ok(canWalkSlope(a.x, a.z, b.x, b.z, world), `the south pass cannot be walked in at ${s.toFixed(1)} m`);
    assert.ok(canWalkSlope(b.x, b.z, a.x, a.z, world), `the south pass cannot be walked out at ${s.toFixed(1)} m`);
    worst = Math.max(worst, Math.abs(H(b.x, b.z) - H(a.x, a.z)) / .5);
    if (!crossed && hexOwnerAt(a.x, a.z) !== TELEMONIA && hexOwnerAt(b.x, b.z) === TELEMONIA) {
      crossed = true;
      let lo = s, hi = s + .5;
      for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2, p = at(m); if (hexOwnerAt(p.x, p.z) === TELEMONIA) hi = m; else lo = m; }
      const out = at((lo + hi) / 2 - .05), inn = at((lo + hi) / 2 + .05);
      assert.ok(Math.abs(H(inn.x, inn.z) - H(out.x, out.z)) < .15, `the south pass’s mouth steps ${(H(inn.x, inn.z) - H(out.x, out.z)).toFixed(2)} m at the border`);
    }
  }
  assert.ok(crossed, 'the walk crosses the border');
  assert.ok(worst < .65, `the way from Legemum onto the Galmeth pitches ${worst.toFixed(2)}`);
  // And nothing of either neighbour is buried where this country draws its own ground past the border.
  const m = new THREE.Matrix4(), p = new THREE.Vector3();
  for (const name of ['legemum', 'eastPyros']) {
    const root = world[name]?.root;
    assert.ok(root, `${name}’s scenery`);
    root.updateMatrixWorld(true);
    let near = 0;
    const check = (x, y, z, what) => {
      if (!inTelemoniaBox(x, z) || borderDepth(x, z) > 0 || borderDepth(x, z) < -TELEMONIA_PATCH_REACH) return;
      near++;
      assert.ok(y > H(x, z) - 1, `${what} of ${name} stands ${(H(x, z) - y).toFixed(1)} m under the ground at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    };
    root.traverse(o => {
      if (o.isInstancedMesh) for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); p.setFromMatrixPosition(m).applyMatrix4(o.matrixWorld); check(p.x, p.y, p.z, o.name); }
      else if (o.isMesh && o.geometry?.attributes?.position) {
        const pos = o.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) { p.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); check(p.x, p.y, p.z, o.name); }
      }
    });
    assert.ok(near > 500, `${near} pieces of ${name} near the border`);
  }
});

test('the terraces: dry-stone steps from the cliff foot to the plain, walked up by their stairs', () => {
  // On a line straight up the belt clear of every stair, the ground steps: level treads and risers too
  // steep to walk, a metre and eight a time.
  const angle = Math.atan2(TERRACE_VIEW.z - PLAIN_MIDDLE.z, TERRACE_VIEW.x - PLAIN_MIDDLE.x) + .05;
  const dx = Math.cos(angle), dz = Math.sin(angle);
  const line = [];
  for (let r = 60; r < 260; r += .25) {
    const x = PLAIN_MIDDLE.x + dx * r, z = PLAIN_MIDDLE.z + dz * r;
    const place = telemoniaPlace(x, z);
    if (place?.terraced && stairDistance(x, z) > 3) line.push({ r, h: H(x, z) });
  }
  assert.ok(line.length > 60, 'the line crosses the belt');
  let risers = 0, treads = 0;
  for (let i = 4; i < line.length; i++) {
    const rise = line[i].h - line[i - 4].h, run = line[i].r - line[i - 4].r;
    if (run > 1.1) continue;
    if (rise / run > 1.2) risers++;
    if (Math.abs(rise / run) < .08) treads++;
  }
  assert.ok(risers >= 5 * 2 && treads > 30, `${risers} riser samples and ${treads} tread samples`);
  const span = line.at(-1).h - line[0].h;
  assert.ok(span > INNER.terraceTop - 3, `the belt climbs ${span.toFixed(1)} m`);
  // Every terrace is walled with one coursed, capped face along its course line from stair to stair (the
  // user, 2026-10-02: "plain rows of blocks" before), and every step of the gullies' floors has its check-wall.
  const m = world.telemoniaMetrics;
  assert.ok(m.terraceWallMetres > 4500 && m.terraceWalls > 60, `${m.terraceWallMetres} m of terrace wall in ${m.terraceWalls} walls`);
  assert.ok(m.terraceWallMetres / m.terraceWalls > 15, `the walls average ${(m.terraceWallMetres / m.terraceWalls).toFixed(1)} m: walls, not blocks`);
  assert.ok(m.wallStones > m.wallMetres * 4, `${m.wallStones} stones in ${Math.round(m.wallMetres)} m of wall: laid in courses`);
  assert.ok(m.checkWalls >= 20, `${m.checkWalls} check-walls across the gullies`);
  // None of it stands on a pass's floor: where the belt meets the Tarnel's walls, the walls stop short.
  let stray = 0, stones = 0;
  scene.traverse(o => {
    if (!o.isMesh || o.name !== 'Telemonia dry-stone walls') return;
    const p = o.geometry.attributes.position;
    for (let v = 0; v < p.count; v += 4) { stones++; if (onPassFloor(p.getX(v), p.getZ(v)) > .5) stray++; }
  });
  assert.ok(stones > 10000);
  assert.equal(stray, 0, `${stray} wall stones stand on a pass’s floor`);
  // The stairs: from the plain to the cliff foot a walker goes straight up a stair.
  let stairs = 0;
  for (let deg = -180 + 4; deg < 180; deg += TERRACES.stairEvery) {
    const a = deg * Math.PI / 180, ax = Math.cos(a), az = Math.sin(a);
    const points = [];
    for (let r = 40; r < 320; r += .5) {
      const x = PLAIN_MIDDLE.x + ax * r, z = PLAIN_MIDDLE.z + az * r, place = telemoniaPlace(x, z);
      if (place?.terraced && plainDistance(x, z) > .5) points.push({ x, z });
      else if (points.length) break;
    }
    if (points.length < 30 || points.some(p => passAt(p.x, p.z)?.distance < 12 || washWeight(p.x, p.z) > 0 || gullyAt(p.x, p.z)?.distance < 6)) continue;
    // Up to the cliff foot: the stair ends where the cliff band begins, and the last step is onto rock.
    const flight = points.slice(0, -3);
    const blocked = flight.slice(1).some((p, i) => !canWalkSlope(flight[i].x, flight[i].z, p.x, p.z, world));
    assert.ok(!blocked, `the stair at ${deg}° is not walked`);
    stairs++;
  }
  assert.ok(stairs >= 12, `${stairs} stairs`);
});

test('the washes are dry stone across the plain, and leave it by the east pass', () => {
  assert.equal(WASHES.length, 3);
  const exit = PASSES.find(p => p.id === 'telemonia-east-pass');
  for (const wash of WASHES) {
    for (const p of wash.points) {
      assert.equal(hexOwnerAt(p.x, p.z), TELEMONIA, `${wash.id} leaves the country`);
      assert.equal(westWaterSurface(p.x, p.z), null, `${wash.id} has water in it`);
      assert.equal(kethornLift(p.x, p.z), 0, `${wash.id} runs over the rock`);
    }
    const end = wash.points.at(-1), heights = wash.points.map(p => H(p.x, p.z));
    assert.ok(passAt(end.x, end.z)?.pass === exit, `${wash.id} does not come to the east pass`);
    assert.ok(heights[0] > heights.at(-1), `${wash.id} does not fall`);
    const middle = wash.points[Math.floor(wash.points.length / 2)];
    assert.ok(washWeight(middle.x, middle.z) > .9 && canStand(middle.x, middle.z, world, .5));
  }
  // Nothing grows on a wash floor: "the Telemon build nothing in a wash", and nothing stands in one.
  for (const c of world.colliders.filter(c => c.kind === 'telemonia-tree' || (c.kind === 'ridge-rock' && hexOwnerAt(c.x, c.z) === TELEMONIA)))
    assert.ok(washWeight(c.x, c.z) < .2, `something stands in a wash at ${c.x.toFixed(0)}, ${c.z.toFixed(0)}`);
  // And the east pass's floor carries the water out: it falls the whole way from the plain to Gala, with
  // no col in it, where the other two climb to one and drop into the plain.
  assert.ok(exit.stations.every((st, i) => i === 0 || st[1] >= exit.stations[i - 1][1] - .01), 'the east pass climbs from Gala to the plain without a col');
  for (const p of PASSES.filter(one => one !== exit)) assert.ok(Math.max(...p.stations.map(st => st[1])) > p.stations.at(-1)[1] + 1, `${p.id} has no col: the plain would drain through it`);
  assert.ok(GULLIES.length === 2 && GULLIES.every(g => WASHES.some(w => w.id === g.wash)));
});

test('what grows: bunch grass, wormwood and thorn, scrub oak and juniper in the folds, and the Belketh in its corner', () => {
  const m = world.telemoniaMetrics;
  for (const key of ['tufts', 'wormwood', 'thorn', 'rocks', 'talus', 'washStones'])
    assert.ok(m[key] > 10, `no ${key}: ${m[key]}`);
  // Trees are few outside the Belketh, and how many of each the seeded scatter finds room for moves when
  // the ground it is scattered over does (the crag and the way, 2026-10-02): every kind is there.
  for (const key of ['oaks', 'junipers', 'pines']) assert.ok(m[key] > 5, `no ${key}: ${m[key]}`);
  assert.ok(m.groundVertices > 80000, 'the country draws its own ground');
  const trees = world.colliders.filter(c => c.kind === 'telemonia-tree');
  assert.equal(trees.length, m.trees);
  for (const tree of trees) {
    assert.equal(hexOwnerAt(tree.x, tree.z), TELEMONIA);
    assert.ok(['holm-oak', 'common-juniper', 'stone-pine'].includes(tree.species), tree.species);
    assert.ok(!onKethornTop(tree.x, tree.z), 'a tree on the rock’s top');
    assert.ok(!(telemoniaPlace(tree.x, tree.z)?.terraced), 'a tree on a terrace');
  }
  // The wood is the Belketh's: most of the trees, and every pine, are on the two Csb hexes' ground.
  const wood = trees.filter(t => belkethShare(t.x, t.z) > .35);
  assert.ok(wood.length > trees.length * .45 && wood.length === m.belkethTrees, `${wood.length} of ${trees.length} trees in the Belketh`);
  for (const pine of trees.filter(t => t.species === 'stone-pine')) assert.ok(belkethShare(pine.x, pine.z) > .35, 'a pine outside the Belketh');
  // Stage 1 put nothing of anybody's here. Stage 2 (docs/telemonia-stage2-brief.md) builds the town and the huts
  // and stands the people up, and they are its own tests' (tests/telemonia-people.test.js, the town's): here, only
  // that nobody the world itself places stands in the country, and that every solid thing is stage 1's or the town's.
  assert.deepEqual([...country.npcIds], []);
  for (const [id, stand] of Object.entries(world.npcPositions ?? {})) assert.notEqual(hexOwnerAt(stand.x, stand.z), TELEMONIA, `${id} stands in Telemonia`);
  const kinds = new Set(world.colliders.filter(c => hexOwnerAt(c.x, c.z) === TELEMONIA).map(c => c.kind));
  for (const kind of kinds) assert.ok(['telemonia-tree', 'ridge-rock'].includes(kind) || /^(kethorn|telemonia)-/.test(kind), `${kind} stands in Telemonia`);
});

test('every wild animal is somebody the neighbours already have, and nothing can be walked down', () => {
  const species = TELEMONIA_WILDLIFE_ZONES.map(zone => zone.species);
  assert.deepEqual(species.sort(), ['harrier', 'plateau-hawk', 'upland-hare']);
  for (const zone of TELEMONIA_WILDLIFE_ZONES) {
    assert.ok(WEST_LIFE_ZONES.includes(zone));
    assert.equal(zone.region, TELEMONIA);
    assert.ok(zone.note.length > 60);
    if (!zone.air) assert.ok(Math.hypot(zone.maxX - zone.minX, zone.maxZ - zone.minZ) / 2 < LIFE_REACH);
    for (const [x, z] of zone.sites) {
      assert.ok(x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ);
      if (zone.air) { assert.equal(hexOwnerAt(x, z), TELEMONIA); continue; }
      assert.equal(regionAt(x, z)?.name, TELEMONIA);
      assert.ok(canStand(x, z, world, zone.radius) && slope(x, z, .5) < zone.maxSlope, `${zone.id} stands on nothing at ${x}, ${z}`);
    }
  }
  const life = createWestLife(new THREE.Scene(), world, { zones: TELEMONIA_WILDLIFE_ZONES });
  assert.equal(life.snapshot().creatures.length, TELEMONIA_WILDLIFE_ZONES.reduce((sum, zone) => sum + zone.sites.length, 0), 'every one of them found a place');
  life.dispose();
  // The west's laws on the ground range: walked at and run at from the four quarters, never reached.
  const WALK = 4.2, RUN = 7.2, HZ = 60;
  for (const zone of TELEMONIA_WILDLIFE_ZONES.filter(item => !item.air)) for (const [dx, dz] of [[40, 0], [-40, 0], [0, 40], [0, -40]]) for (const [pace, seconds] of [[WALK, 30], [RUN, 25]]) {
    const herd = createWestLife(new THREE.Scene(), world, { zones: [zone] });
    const band = () => herd.state().creatures, first = band()[0];
    const player = { x: first.x + dx, z: first.z + dz };
    let closest = Infinity, offFooting = 0;
    for (let i = 0; i < seconds * HZ; i++) {
      const at = band().find(animal => animal.id === first.id), ddx = at.x - player.x, ddz = at.z - player.z, d = Math.hypot(ddx, ddz);
      if (d > .4) { const step = Math.min(d - .3, pace / HZ); player.x += ddx / d * step; player.z += ddz / d * step; }
      herd.update(1 / HZ, player, true);
      for (const animal of band()) if (!animal.hidden && !canStand(animal.x, animal.z, world, zone.radius)) offFooting++;
      const now = band().find(animal => animal.id === first.id);
      if (now.lift < 1) closest = Math.min(closest, Math.hypot(now.x - player.x, now.z - player.z));
    }
    assert.ok(closest >= (pace === WALK ? 3 : 1.5), `${zone.id}: somebody ${pace === WALK ? 'walking' : 'running'} from ${dx}, ${dz} got within ${closest.toFixed(2)} m`);
    assert.equal(offFooting, 0, `${zone.id}: an animal stood somewhere it cannot`);
    herd.dispose();
  }
});

test('the chart, the tongue, the polity and the travel stop know the country, and every name is the lore’s or plain', () => {
  const places = [...TELEMONIA_LANDMARKS, ...TELEMONIA_TOWN_LANDMARKS];
  for (const id of country.landmarks) {
    const place = places.find(item => item.id === id);
    assert.ok(place, `${id} is not a place`);
    assert.ok(world.landmarks.some(landmark => landmark.id === id), `the chart knows ${id}`);
    assert.equal(regionAt(place.x, place.z)?.name, TELEMONIA, `${id} stands outside Telemonia`);
    assert.ok(canStand(place.x, place.z, world, RADIUS), `${id} is on nothing`);
    assert.ok(place.description.length > 60);
  }
  assert.equal(country.landmarks.length, places.length);
  const names = places.map(place => place.name).join(' ');
  for (const word of ['Galmeth', 'Kethorn', 'Rothkar', 'Belketh', 'Tarnel']) assert.match(names, new RegExp(word));
  assert.doesNotMatch(names, /\bCrom\b/, 'the hero is Cromb, and nothing here is named Crom');
  const areas = SUBREGIONS.filter(area => area.region === TELEMONIA);
  assert.ok(areas.length >= 3 && areas.length <= 6);
  for (const area of areas) assert.ok(insideRegion(TELEMONIA, area.x, area.z) && area.radius >= 18 && area.radius <= 130, area.id);
  assert.deepEqual({ ...REGION_LANGUAGE[TELEMONIA] }, { language: 'kellith', dialect: null });
  assert.match(LANGUAGES.kellith.where, /Telemonia/);
  assert.doesNotMatch(LANGUAGES.kellith.where, /Zorkys/);
  const status = regionBuildStatus(TELEMONIA);
  assert.equal(status.state, 'early');
  assert.match(status.work, /border market/i, 'what is left after stage 2 is named');
  const destination = DEV_WORLD_DESTINATIONS.find(item => item.regionId === TELEMONIA);
  assert.ok(destination && destination.region === REGION_IDS[TELEMONIA] && destination.travelTarget === 'telemonia');
  const design = describeRegion(TELEMONIA);
  assert.equal(design.control, 'telemon');
  assert.equal(FACTIONS.telemon.seat, 'Kethorn');
  assert.equal(design.level, 3);
  assert.deepEqual(design.settlements.map(s => s.name), ['Kethorn']);
  assert.equal(describeRegion('Gala').control, 'galan', 'the Lizeem’s Gala is not the Pyrosi capital');
  assert.notEqual(describeRegion('West Pyros').control, 'galan');
  assert.ok(GROUND_TINT_FAMILIES.includes('telemonia'));
  // The tint paints the country and nothing else.
  const c = cells[12];
  assert.notEqual(telemoniaTint(c.x, c.z, REGION_TERRAIN[TELEMONIA].ground), null);
  assert.equal(telemoniaTint(-1700, 1100, REGION_TERRAIN[TELEMONIA].ground), null);
  void terrainMix; void STRATA; void washAt; void passCol;
});

test('the region’s number is written in REGION_IDS and nowhere else in the code', () => {
  const id = REGION_IDS[TELEMONIA];
  const hits = [];
  for (const file of readdirSync(new URL('../src/', import.meta.url))) {
    if (!file.endsWith('.js')) continue;
    const text = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
    if (new RegExp(`\\[\\s*${id}\\s*,\\s*'Telemonia'|Telemonia'?\\s*:\\s*${id}\\b|regions:\\s*new Set\\(\\[[^\\]]*\\b${id}\\b`).test(text)) hits.push(file);
  }
  assert.deepEqual(hits, ['region-world.js']);
});
