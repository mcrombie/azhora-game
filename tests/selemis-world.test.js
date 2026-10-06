import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { sourceModule } from './module-loader.js';
import { scopedWorld } from './scoped-world.js';
import * as THREE from '../vendor/three.module.js';
import { canStand, canSwim, moveCharacter, WATERLINE } from '../src/gameplay/movement/game-state.js';
import { PLAYABLE_REGIONS, REGION_BIOMES, HEX_WORLD_TRANSFORM, worldBoundsFor } from '../src/world/terrain/region-layout.js';
import { RIVER_EDGES } from '../src/world/terrain/region-rivers.js';
import { LAND_HEXES, PLAYABLE_SURVEY } from '../src/dev/tools/region-survey.js';
import {
  REGION_CELLS, REGION_IDS, REGION_TERRAIN, WORLD_BOUNDS, hexAt, hexCentre, hexOwnerAt, regionAt, regions, landDistance, insideRegion,
  METRES_PER_HEX,
} from '../src/world/terrain/region-world.js';
import { groundBeforeSelamus, groundTint, GROUND_TINT_FAMILIES, SHORE_TINT_FAMILIES, shoreTintOf } from '../src/world/terrain/world-terrain.js';
import { DEFAULT_SKY, regionSky } from '../src/world/environment/region-sky.js';
import { regionLevel } from '../src/world/terrain/region-levels.js';
import { regionBuildStatus } from '../src/dev/tools/build-status.js';
import { SUBREGIONS } from '../src/ui/map/map-fog.js';
import { REGION_LANGUAGE, LANGUAGES } from '../src/gameplay/skills/languages.js';
import { DEV_WORLD_DESTINATIONS } from '../src/dev/tools/developer-atlas.js';
import { PLAYABLE, WINDOW } from '../scripts/build-region-survey.mjs';
import { SWIM, swimReach, swimRange, swimSpeed, swimStep, levelForCrossing, levelForDryCrossing } from '../src/gameplay/movement/swimming.js';
import { OWN_SKY } from './own-sky.js';
import { HILLS as ASCARTH_HILLS, SOUTH as ASCARTH_TIP } from '../src/content/regions/ascarth/ascarth-world.js';
import {
  SELEMI, SELEMIS_CLIMATE, SELEMIS_BOX, MIDDLE, HARBOUR, STRAND, HEADS, HILLS, SADDLES, WINTER_BEDS, ISLAND, CLIFF, CHANNEL_VIEW, SOUTH_CLIFFS,
  SELEMIS_GROUND, SELEMIS_LANDMARKS, strandWeight, cliffShare, hollow, oceanward, hillAt, bedWeight, selemisCover, selemisGround, selemisTint,
  selemisShoreTint,
} from '../src/content/regions/selemis/selemis-world.js';
import { SELEMIS_WILDLIFE_ZONES } from '../src/content/regions/selemis/selemis-wildlife.js';
import { SELAMUS_ARRIVAL, SELAMUS_LANDMARKS, selamusReserved, selamusCanalAt, selamusGround } from '../src/content/regions/selamus/selamus-city.js';

/**
 * Selemis - the island one row of water south of the tip of the Ascarth Peninsula - built on the
 * user's word of 1 October 2026 ("start working on the Selemis region") as terrain, climate, water,
 * scenery and wildlife (docs/selemis-brief.md, docs/selemis-report.md). Selemis now
 * occupies the island. Natural height/topology claims below explicitly exercise
 * the retained pure island baseline; current structures, coast and wildlife use
 * the composed world. Ordinary bridge/city travel is covered by the city suite.
 *
 * The atlas is the authority. Most of what is asserted below is its own arithmetic: eight hexes, all
 * `grassland`, all `Csa`; fourteen unclaimed hexes round them and no river edge on any; one sea hex
 * held on three sides, and the last hex of the peninsula standing across it. The rest is the lore's
 * few physical sentences held to the ground - a crescent, a sheltered harbour, a headland at either
 * end, hills in the interior, a channel a fleet can cross and an army cannot wade - and the numbers
 * the brief asked to be measured rather than assumed: that the world box and the survey window did
 * not move, how wide the channel is, and what the swim rule as it stands makes of that width.
 */
const { createWestLife, LIFE_REACH, WEST_LIFE_ZONES } = await sourceModule('../src/content/regions/western-regions/west-regions-life.js');
const scene = new THREE.Scene();
const world = await scopedWorld(scene, [REGION_IDS[SELEMI], REGION_IDS[ASCARTH_TIP]]);
const island = regions.find(region => region.name === SELEMI);
const cells = REGION_CELLS[SELEMI];
const WWMAP = new URL('../../world-builder/map/resources/examples/azhora.wwmap', import.meta.url);
const CMAP = new URL('../../world-builder/azhora.cmap.json', import.meta.url);
const AXIAL = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const ATLAS = JSON.parse(readFileSync(new URL('../assets/azhora-dev-regions.json', import.meta.url), 'utf8'));
const ATLAS_OWNERS = (() => {
  const owners = new Map();
  for (const region of ATLAS.regions) for (const cell of region.cells) owners.set(`${cell.q},${cell.r}`, region.name ?? region.id);
  return owners;
})();
// Exact pre-city terrain, including the original shallow seabed at canal mouths.
const H = groundBeforeSelamus;
const naturalWorld = { bounds: world.bounds, colliders: [], heightAt: H, waterAt: () => WATERLINE };
const naturalSpawn = { x: -790, z: 2436 }; // Original terrain-only arrival/scatter anchor.
const RADIUS = .34;
/** Every point of a lattice over the island and the water round it. */
function* lattice(step, box = { minX: -1010, maxX: -590, minZ: 2300, maxZ: 2606 }) {
  for (let x = box.minX; x <= box.maxX; x += step) for (let z = box.minZ; z <= box.maxZ; z += step) yield [x, z];
}
/** The standable ground joined to a point, on a one-metre lattice: what somebody set down there can walk to. */
function flood(seed, box = { minX: -1250, maxX: -450, minZ: 1950, maxZ: 2700 }) {
  const W = box.maxX - box.minX + 1, rows = box.maxZ - box.minZ + 1, seen = new Uint8Array(W * rows), reached = [];
  const start = Math.round(seed.z - box.minZ) * W + Math.round(seed.x - box.minX), queue = [start];
  seen[start] = 1;
  while (queue.length) {
    const k = queue.pop(), i = k % W, j = (k - i) / W;
    reached.push({ x: box.minX + i, z: box.minZ + j });
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nj = j + dj, nk = nj * W + ni;
      if (ni < 0 || nj < 0 || ni >= W || nj >= rows || seen[nk]) continue;
      seen[nk] = 1;
      if (canStand(box.minX + ni, box.minZ + nj, naturalWorld, RADIUS)) queue.push(nk);
    }
  }
  return { reached, has: (x, z) => seen[Math.round(z - box.minZ) * W + Math.round(x - box.minX)] === 1 && canStand(Math.round(x), Math.round(z), naturalWorld, RADIUS) };
}
const walked = flood(naturalSpawn);
/** Actual composed drawn surface, including Selemis' retained fine triangles. */
const drawnHeight = (x, z) => world.renderedGroundHeight(x, z);
/** The shore of a piece of ground: its standable cells with water a body can be in a metre away. */
const shoreOf = ground => ground.filter(c => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => canSwim(c.x + dx, c.z + dz, naturalWorld, RADIUS)));

test('the atlas: an island of eight grassland hexes that touches nobody, registered after everything that was there before', () => {
  // **No number is written here on purpose.** The island was built as the last country on its base, and
  // other countries have taken the next ids on main since: its number is whatever `REGION_IDS` says the
  // day it lands. What holds is that it comes after Trogo, the last country of the base it was built
  // on, and that its id is its place in the list (tests/region-layout.test.js holds that for everybody).
  assert.ok(Number.isInteger(REGION_IDS[SELEMI]) && REGION_IDS[SELEMI] > REGION_IDS.Trogo, `Selemi is region ${REGION_IDS[SELEMI]}`);
  assert.equal(REGION_IDS[SELEMI], PLAYABLE_REGIONS.indexOf(SELEMI) + 1);
  assert.equal(SELEMI, 'Selemi', 'the atlas’s own spelling is the key, as Iscare Archipeligo keeps its');
  assert.ok(PLAYABLE_REGIONS.includes(SELEMI) && PLAYABLE.includes(SELEMI), 'registered and surveyed');
  // Appended, never inserted: the scatter walks the list with one stream, and
  // tests/region-layout.test.js holds the order for every country at once.
  assert.ok(PLAYABLE_REGIONS.indexOf('Trogo') < PLAYABLE_REGIONS.indexOf(SELEMI));
  const atlas = ATLAS.regions.find(region => (region.name ?? region.id) === SELEMI);
  assert.deepEqual(cells.map(cell => [cell.q, cell.r]), atlas.cells.map(cell => [cell.q, cell.r]), 'the survey’s hexes are the atlas’s');
  assert.deepEqual(cells.map(cell => `${cell.q},${cell.r}`),
    ['-9,133', '-8,133', '-9,134', '-8,134', '-7,134', '-9,135', '-8,135', '-7,135']);
  assert.deepEqual([...new Set(cells.map(cell => cell.terrain))], ['grassland'], 'all eight are grassland: the atlas draws no hills hex here');
  assert.deepEqual(PLAYABLE_REGIONS.filter(name => REGION_BIOMES[name].id === REGION_BIOMES[SELEMI].id), [SELEMI], 'a biome of its own');
  assert.equal(REGION_BIOMES[SELEMI].ownScatter, true);
  assert.equal(regionLevel(SELEMI), 3);
  // It touches nobody: every hex round it is one no region claims, fourteen of them.
  const own = new Set(cells.map(cell => `${cell.q},${cell.r}`)), ring = new Set();
  for (const cell of cells) for (const [dq, dr] of AXIAL) { const k = `${cell.q + dq},${cell.r + dr}`; if (!own.has(k)) ring.add(k); }
  assert.equal(ring.size, 14);
  for (const k of ring) assert.equal(ATLAS_OWNERS.get(k), undefined, `${k} is claimed by ${ATLAS_OWNERS.get(k)}`);
  // One row of water to the peninsula, and no more: the nearest hex of anybody's is Southern
  // Ascarth's, two steps away, 173.2 m centre to centre.
  let nearest = { d: Infinity };
  for (const [k, name] of ATLAS_OWNERS) {
    if (name === SELEMI) continue;
    const [q, r] = k.split(',').map(Number), c = hexCentre(q, r);
    for (const cell of cells) { const d = Math.hypot(cell.x - c.x, cell.z - c.z); if (d < nearest.d) nearest = { d, name }; }
  }
  assert.equal(nearest.name, ASCARTH_TIP);
  assert.ok(Math.abs(nearest.d - METRES_PER_HEX * Math.sqrt(3)) < 1e-6, `the nearest hex of the peninsula is ${nearest.d.toFixed(3)} m off`);
  // No river edge on it or beside it, in the game's own file and on the World Builder map.
  assert.equal(RIVER_EDGES.filter(edge => own.has(edge.a.join(',')) || own.has(edge.b.join(','))).length, 0);
  if (existsSync(WWMAP)) {
    const map = JSON.parse(readFileSync(WWMAP, 'utf8').replace(/^﻿/, ''));
    assert.equal(Object.keys(map.rivers).filter(edge => edge.split('|').some(hex => own.has(hex) || ring.has(hex))).length, 0, 'the map draws a river on or beside the island');
    for (const k of ring) assert.equal(map.hexes[k]?.terrain, 'coast', `${k} is ${map.hexes[k]?.terrain} on the map`);
  }
});

test('the climate is the map’s: Csa on all eight, as on the tip across the channel, under the same sky', () => {
  assert.deepEqual(Object.keys(SELEMIS_CLIMATE).sort(), cells.map(cell => `${cell.q},${cell.r}`).sort());
  for (const code of Object.values(SELEMIS_CLIMATE)) assert.equal(code, 'Csa');
  if (existsSync(WWMAP)) {
    const map = JSON.parse(readFileSync(WWMAP, 'utf8').replace(/^﻿/, ''));
    assert.equal(map.climateSystem, 'koppen-v1');
    for (const [key, code] of Object.entries(SELEMIS_CLIMATE)) {
      assert.equal(map.hexes[key]?.climate, code, `${key} is ${map.hexes[key]?.climate} on the map`);
      assert.equal(map.hexes[key]?.region, SELEMI);
    }
    // The peninsula's tip is the same code on every hex: the two shores of the channel are one climate.
    for (const cell of REGION_CELLS[ASCARTH_TIP]) assert.equal(map.hexes[`${cell.q},${cell.r}`]?.climate, 'Csa');
  }
  // The campaign map carries one default code per region and is not a reading of these hexes.
  if (existsSync(CMAP)) assert.equal(JSON.parse(readFileSync(CMAP, 'utf8')).regions[SELEMI]?.climate, 'Cfb');
  // **One air over one channel.** Sixty metres of water, and the lore's sentence about it is that smoke
  // can be read across it: the island's sky is the peninsula's to the digit.
  const sky = regionSky(island), tip = regionSky(regions.find(region => region.name === ASCARTH_TIP));
  assert.notDeepEqual({ ...sky }, { ...DEFAULT_SKY }, 'a sky of its own');
  assert.deepEqual({ ...sky }, { ...tip }, 'nothing changes overhead between the two shores');
  assert.ok(OWN_SKY.has(SELEMI), 'and it is on the one list that says who has asked for a sky');
});

test('it moves neither the world box nor the survey window, and that is measured', () => {
  // The box: the same four numbers with the island as without it, to the last digit. **None of the four
  // is written here, on purpose.** Other countries move the box - two are on their way that take it
  // east and north - and what this island has to hold is that it is not one of them. What the box
  // measured on the base the island was built on is in docs/selemis-report.md and in the ledger above
  // `WINDOW` in scripts/build-region-survey.mjs.
  const without = worldBoundsFor(PLAYABLE_SURVEY, HEX_WORLD_TRANSFORM, PLAYABLE_REGIONS.filter(name => name !== SELEMI));
  assert.deepEqual({ ...WORLD_BOUNDS }, without, 'the island moves the world box');
  // The island's own outline, which is the atlas's arithmetic and nobody else's.
  const outline = island.outline.flat(), xs = outline.map(p => p.x), zs = outline.map(p => p.z);
  assert.equal(island.outline.length, 1, 'one island, one outline');
  const edge = { west: Math.min(...xs), east: Math.max(...xs), north: Math.min(...zs), south: Math.max(...zs) };
  for (const [side, at] of Object.entries({ west: -1000.0019279391271, east: -600.0019279391275, north: 2309.533563299022, south: 2598.2086978938346 }))
    assert.ok(Math.abs(edge[side] - at) < 1e-6, `the island’s ${side}ern edge is at ${edge[side]}`);
  // How far inside the box it stands, on all four sides. **These are floors and not readings**: on its
  // own base it stood 3,610 m inside the western edge, 1,210 m inside the eastern, 4,477 m inside the
  // northern and 666 m inside the southern, and a box that somebody else grows only gives it more.
  const room = { west: edge.west - WORLD_BOUNDS.minX, east: WORLD_BOUNDS.maxX - edge.east, north: edge.north - WORLD_BOUNDS.minZ, south: WORLD_BOUNDS.maxZ - edge.south };
  for (const [side, metres] of Object.entries({ west: 3610, east: 1210, north: 4476.7, south: 666.2 }))
    assert.ok(room[side] > metres - .1, `the island stands ${room[side].toFixed(1)} m inside the ${side}ern edge`);
  // The window: every hex of the island, and every hex round it, lies inside it with a column and a
  // row to spare, so the island asks nothing of it; and all eight are land in the survey whether the
  // island is registered or not - `LAND_HEXES` is every claimed hex inside the window, playable or
  // not, so registering a country cannot add one. The window's own numbers are not written here
  // either: they belong to whoever moved it last.
  const land = new Set(LAND_HEXES.map(([q, r]) => `${q},${r}`));
  for (const cell of cells) {
    assert.ok(land.has(`${cell.q},${cell.r}`), `${cell.q},${cell.r} is not land`);
    assert.ok(cell.q - 1 > WINDOW.minQ && cell.q + 1 < WINDOW.maxQ && cell.r - 1 > WINDOW.minR && cell.r + 1 < WINDOW.maxR, `${cell.q},${cell.r} is at the window’s edge`);
  }
  // The coast lattice, sampled whole exactly as `region-world.js` lays it - 1,355 x 1,408 points on the
  // island's own base - and every hex it falls in kept.
  const phase = { x: -1556.0019279391274, z: -704.3502691896258 }, cell = 4, margin = 96;
  const snap = (v, p) => p + Math.floor((v - p) / cell + 1e-9) * cell;
  const minX = snap(WORLD_BOUNDS.minX - margin, phase.x), minZ = snap(WORLD_BOUNDS.minZ - margin, phase.z);
  const columns = Math.ceil((WORLD_BOUNDS.maxX + margin - minX) / cell) + 1, rows = Math.ceil((WORLD_BOUNDS.maxZ + margin - minZ) / cell) + 1;
  const sampled = new Set();
  let last = null;
  for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) {
    const hex = hexAt(minX + i * cell, minZ + j * cell);
    if (last && hex.q === last.q && hex.r === last.r) continue;
    sampled.add(`${hex.q},${hex.r}`); last = hex;
  }
  for (const own of cells) assert.ok(sampled.has(`${own.q},${own.r}`), `${own.q},${own.r} is not under the lattice`);
  // What a window that is too small breaks is this, and it is what is held, whatever the window's
  // numbers are: **every claimed hex the lattice can sample is land.** A claimed hex under the lattice
  // that is missing from `LAND_HEXES` is land the coast field calls sea.
  //
  // Found on the island's own base and left as it was found (docs/selemis-report.md): the lattice
  // reached column q = -52 there while `WINDOW.minQ` said -50, the Ibenwood belt having taken the
  // western edge to -4610 after `minQ` was last measured. Both columns are open ocean, so this held.
  for (const k of sampled) {
    const owner = ATLAS_OWNERS.get(k);
    if (owner !== undefined) assert.ok(land.has(k), `${k} (${owner}) is claimed, under the lattice and not land`);
  }
});

test('the crescent is the atlas’s own: one bay, turned on the tip of the peninsula, a head at either end and sand between', () => {
  // Exactly one sea hex has three of the island's hexes round it, and the hex across it is the
  // peninsula's last: "its concave face turned toward the Azhoran coast".
  assert.equal(HARBOUR.count, 1, 'one harbour');
  assert.deepEqual([...HARBOUR.hex], [-7, 133]);
  assert.deepEqual(HARBOUR.land.map(hex => hex.join(',')).sort(), ['-7,134', '-8,133', '-8,134']);
  assert.equal(HARBOUR.across.length, 1);
  assert.deepEqual([...HARBOUR.across[0].hex], [-6, 132]);
  assert.equal(HARBOUR.across[0].region, ASCARTH_TIP);
  assert.equal(ATLAS_OWNERS.get('-6,132'), ASCARTH_TIP);
  // The bay's middle, the island's middle hex and that last hex of the peninsula lie on one line.
  const back = hexCentre(-8, 134), tip = HARBOUR.across[0];
  for (const p of [back, tip]) {
    const off = Math.abs((p.x - HARBOUR.water.x) * HARBOUR.axis.z - (p.z - HARBOUR.water.z) * HARBOUR.axis.x);
    assert.ok(off < 1e-6, `(${p.x.toFixed(0)}, ${p.z.toFixed(0)}) is ${off.toFixed(3)} m off the harbour’s axis`);
  }
  assert.ok((tip.x - HARBOUR.water.x) * HARBOUR.axis.x + (tip.z - HARBOUR.water.z) * HARBOUR.axis.z < 0, 'the peninsula is out of the bay’s mouth, not behind it');
  assert.equal(HARBOUR.name, `The ${LANGUAGES.selemi.roots.harbour[0].toUpperCase()}${LANGUAGES.selemi.roots.harbour.slice(1)}`, 'its name is the Selemi word for a harbour');
  // The two heads are the two corners where the island's shore leaves the bay.
  assert.equal(HEADS.length, 2);
  assert.deepEqual(HEADS.map(head => head.hex.join(',')), ['-8,133', '-7,134']);
  for (const head of HEADS) {
    assert.ok(Math.abs(Math.hypot(head.tip.x - HARBOUR.water.x, head.tip.z - HARBOUR.water.z) - METRES_PER_HEX / Math.sqrt(3)) < 1e-6, `${head.id}’s tip is a corner of the bay’s hex`);
    assert.ok(Math.abs(landDistance(head.tip.x, head.tip.z)) < 4, `${head.id}’s tip is on the shore`);
    assert.equal(hexOwnerAt(head.x, head.z), SELEMI);
    const crown = H(head.x, head.z);
    assert.ok(crown > 9 && crown < 13, `${head.id}’s crown stands at ${crown.toFixed(1)} m`);
    assert.ok(crown - H(HARBOUR.strand.x, HARBOUR.strand.z) > 7, `${head.id} stands over the strand`);
    assert.ok(walked.has(head.x, head.z), `${head.id} can be walked to`);
  }
  // Sand round the bay and a cliff everywhere else: five metres in from the water the strand is a
  // metre and a half up and every other shore is at least six.
  const tally = { strand: 0, cliff: 0, low: 0, sand: 0 };
  for (const [x, z] of lattice(2)) {
    const d = landDistance(x, z);
    if (d < 4.6 || d > 5.4 || regionAt(x, z)?.name !== SELEMI) continue;
    const weight = strandWeight(x, z), height = H(x, z);
    if (weight === 1) { tally.strand++; if (height < 2) tally.sand++; }
    if (weight === 0) { tally.cliff++; if (height < 6) tally.low++; assert.equal(cliffShare(x, z), 1); }
  }
  assert.ok(tally.strand >= 20 && tally.sand === tally.strand, `${tally.sand} of ${tally.strand} strand samples are a beach`);
  assert.ok(tally.cliff >= 180 && tally.low === 0, `${tally.low} of ${tally.cliff} samples of the other shores are under six metres`);
  assert.ok(canStand(HARBOUR.strand.x, HARBOUR.strand.z, naturalWorld, .5), 'the natural strand is dry before the Exchange Canal cut');
  assert.equal(strandWeight(HARBOUR.strand.x, HARBOUR.strand.z), 1);
  assert.ok(STRAND.full < STRAND.none && CLIFF.face > 2);
  // And the bay is water: its middle is deep, and it is nobody's hex.
  assert.ok(canSwim(HARBOUR.water.x, HARBOUR.water.z, naturalWorld, RADIUS) && H(HARBOUR.water.x, HARBOUR.water.z) < -5, 'the natural bay remains deep water beneath the moored fleet');
  assert.equal(hexOwnerAt(HARBOUR.water.x, HARBOUR.water.z), 'Open country');
});

test('the natural baseline has three grass hills along its back, lower than the peninsula’s, and a table tilted up toward the open sea', () => {
  assert.equal(HILLS.length, 3);
  const tops = HILLS.map(h => H(h.x, h.z));
  for (const [i, [low, high]] of [[19, 24], [25.5, 30], [20.5, 25.5]].entries()) {
    assert.ok(tops[i] > low && tops[i] < high, `${HILLS[i].id} tops out at ${tops[i].toFixed(1)} m`);
    assert.equal(hexOwnerAt(HILLS[i].x, HILLS[i].z), SELEMI);
    // Interior: sixty metres and more from any shore, on an island a hundred and ninety deep.
    assert.ok(landDistance(HILLS[i].x, HILLS[i].z) > 60, `${HILLS[i].id} is ${landDistance(HILLS[i].x, HILLS[i].z).toFixed(0)} m from the sea`);
    assert.ok(walked.has(HILLS[i].x, HILLS[i].z), `${HILLS[i].id} can be walked to`);
  }
  assert.ok(tops[1] > tops[0] && tops[1] > tops[2], 'the middle hill is the high one');
  // The highest ground on the island is the high hill's own top.
  let highest = { h: -Infinity };
  for (const [x, z] of lattice(2)) { if (regionAt(x, z)?.name !== SELEMI) continue; const h = H(x, z); if (h > highest.h) highest = { h, x, z }; }
  assert.ok(Math.hypot(highest.x - HILLS[1].x, highest.z - HILLS[1].z) < 25 && highest.h < 30, `the island’s highest ground is ${highest.h.toFixed(1)} m at ${highest.x}, ${highest.z}`);
  // **Grass hills on grassland hexes.** The atlas gives the island no `hills` hex, so these are hills by
  // height only: every one of them is lower than either of the peninsula's wooded hills, which stand
  // on hexes the atlas does call hills.
  for (const hill of ASCARTH_HILLS) assert.ok(H(hill.x, hill.z) > highest.h + 5, `the peninsula’s ${hill.id} is ${H(hill.x, hill.z).toFixed(1)} m`);
  // One back with three tops: a saddle between each and the next, well under both and well over the bench.
  for (const saddle of SADDLES) {
    const a = HILLS[saddle.from], b = HILLS[saddle.to];
    let low = Infinity;
    for (let t = 0; t <= 1; t += .02) low = Math.min(low, H(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t));
    assert.ok(low > ISLAND.bench + 4 && low < Math.min(tops[saddle.from], tops[saddle.to]) - 3, `the saddle between ${a.id} and ${b.id} is at ${low.toFixed(1)} m`);
  }
  // The tilt: the cliff tops on the ocean face stand well over the ones on the channel shore.
  const ocean = [], channel = [];
  let steepest = 0;
  for (const [x, z] of lattice(2)) {
    if (regionAt(x, z)?.name !== SELEMI) continue;
    const d = landDistance(x, z);
    if (d > 6) steepest = Math.max(steepest, Math.hypot(H(x + 1, z) - H(x - 1, z), H(x, z + 1) - H(x, z - 1)) / 2);
    if (d < 4.6 || d > 5.4 || strandWeight(x, z) > 0) continue;
    if (oceanward(x, z) > .85) ocean.push(H(x, z)); else if (oceanward(x, z) < .05) channel.push(H(x, z));
  }
  const mean = list => list.reduce((sum, v) => sum + v, 0) / list.length;
  assert.ok(ocean.length > 40 && channel.length > 60);
  assert.ok(mean(ocean) > 12 && mean(ocean) < 14, `the ocean face’s cliff tops stand at ${mean(ocean).toFixed(1)} m`);
  assert.ok(mean(channel) > 7 && mean(channel) < 9.5, `the channel shore’s at ${mean(channel).toFixed(1)} m`);
  // Hills a traveler walks up: nowhere on the island more than six metres from the sea is a cliff.
  assert.ok(steepest < .8, `the steepest inland ground is ${steepest.toFixed(2)}`);
  // And the profile the hex blend carries says what the ground is.
  let sum = 0, n = 0;
  for (const [x, z] of lattice(2)) if (regionAt(x, z)?.name === SELEMI && H(x, z) >= WATERLINE) { sum += H(x, z); n++; }
  assert.ok(Math.abs(sum / n - REGION_TERRAIN[SELEMI].base) < .5, `the island’s mean height is ${(sum / n).toFixed(2)} m`);
});

test('the natural hollow and dry island remain a connected baseline beneath the new city', () => {
  // The ground the lore's city "fills ... from headland to headland" and climbs: low behind the
  // strand, rising to the hills. This is the measured natural baseline, not a
  // claim that the constructed canals can be crossed without their bridges.
  let low = 0, standable = 0;
  for (const [x, z] of lattice(2)) {
    if (regionAt(x, z)?.name !== SELEMI || H(x, z) < WATERLINE) continue;
    standable++;
    if (H(x, z) < 6 && hollow(x, z) > .2) low++;
  }
  assert.ok(low * 4 > 7000 && low * 4 < 9000, `${low * 4} m² of the hollow is under six metres`);
  assert.ok(standable * 4 > 69000 && standable * 4 < 72500, `the island is ${standable * 4} m² above the waterline`);
  // The travel button sets a traveler down in it, on ground, on the island's own hex.
  assert.equal(hexOwnerAt(island.spawn.x, island.spawn.z), SELEMI);
  assert.ok(canStand(island.spawn.x, island.spawn.z, world, .5), 'the travel button puts the traveler on ground');
  assert.ok(Math.hypot(island.spawn.x - SELAMUS_ARRIVAL.x, island.spawn.z - SELAMUS_ARRIVAL.z) < 1e-6, 'arrival uses the authored city square');
  assert.ok(world.heightAt(island.spawn.x, island.spawn.z) < 4);
  // **Nobody is sealed in a pocket.** From there, every standable square metre of the island is
  // joined to every other: the flood from the spawn reaches all of it.
  let all = 0, reached = 0;
  for (const [x, z] of lattice(1)) {
    if (regionAt(x, z)?.name !== SELEMI || !canStand(x, z, naturalWorld, RADIUS)) continue;
    all++; if (walked.has(x, z)) reached++;
  }
  assert.ok(all > 69000, `${all} standable cells on the island`);
  assert.equal(reached, all, `${all - reached} standable cells of the island cannot be walked to from the travel button`);
  // Its whole length and its whole depth.
  const mine = walked.reached.filter(c => c.z > 2300);
  const span = { x: Math.max(...mine.map(c => c.x)) - Math.min(...mine.map(c => c.x)), z: Math.max(...mine.map(c => c.z)) - Math.min(...mine.map(c => c.z)) };
  assert.ok(span.x > 395 && span.x < 415 && span.z > 275 && span.z < 295, `the walkable island is ${span.x} m by ${span.z} m`);
  for (const cell of cells) assert.ok(walked.has(cell.x, cell.z), `the middle of ${cell.q},${cell.r} cannot be walked to`);
  for (const place of [...SELEMIS_LANDMARKS, CHANNEL_VIEW, SOUTH_CLIFFS, MIDDLE]) assert.ok(walked.has(place.x, place.z), `${place.id ?? 'a place'} cannot be walked to`);
  // And nobody is put under the ground the world draws: the travel button and every named place stand
  // within half a metre of the drawn surface, where the grid cannot follow a cliff.
  for (const place of [island.spawn, ...SELEMIS_LANDMARKS, CHANNEL_VIEW, SOUTH_CLIFFS]) {
    // Legacy labels can now lie inside a building or canal; city-route tests
    // cover their public approaches. The actual arrival is always checked.
    if (place !== island.spawn && selamusReserved(place.x, place.z, 3)) continue;
    const buried = drawnHeight(place.x, place.z) - world.heightAt(place.x, place.z);
    assert.ok(buried < .5, `${place.id ?? 'the travel button'} is ${buried.toFixed(2)} m inside the drawn ground`);
  }
  // And it does not reach the peninsula: the island is an island.
  assert.ok(!walked.reached.some(c => c.z < 2300), 'the island’s ground joins the peninsula’s');
});

test('the natural island has two dry winter beds and no freshwater, beneath the tidal city canals', () => {
  assert.equal(WINTER_BEDS.length, 2);
  for (const bed of WINTER_BEDS) {
    const heights = [];
    for (let i = 1; i < bed.line.length; i++) {
      const a = bed.line[i - 1], b = bed.line[i], length = Math.hypot(b.x - a.x, b.z - a.z);
      for (let s = 0; s <= length; s += 2) {
        const x = a.x + (b.x - a.x) * s / length, z = a.z + (b.z - a.z) * s / length;
        assert.equal(hexOwnerAt(x, z), SELEMI, `${bed.id} leaves the island`);
        // Dry: no water body anywhere on it, and its floor is ground a traveler stands on.
        assert.equal(naturalWorld.waterAt(x, z), WATERLINE);
        assert.ok(canStand(x, z, naturalWorld, RADIUS), `${bed.id} cannot be stood in at ${x.toFixed(0)}, ${z.toFixed(0)}`);
        heights.push(H(x, z));
      }
    }
    // It runs downhill the whole way, from a saddle to the strand.
    for (let i = 1; i < heights.length; i++) assert.ok(heights[i] < heights[i - 1] + .15, `${bed.id} climbs ${(heights[i] - heights[i - 1]).toFixed(2)} m at sample ${i}`);
    assert.ok(heights[0] > 15 && heights.at(-1) < 2.5 && heights[0] - heights.at(-1) > 13, `${bed.id} falls from ${heights[0].toFixed(1)} to ${heights.at(-1).toFixed(1)} m`);
    assert.ok(strandWeight(bed.line.at(-1).x, bed.line.at(-1).z) > .95, `${bed.id} runs out on the strand`);
    assert.equal(bedWeight(bed.line[1].x, bed.line[1].z), 1); assert.equal(bedWeight(bed.line[2].x, bed.line[2].z), 1);
    assert.ok(bed.half * 2 > 14, 'wide enough for vertices seven metres apart to draw it');
  }
  // No freshwater body has been added: the new canals carry the existing sea.
  assert.equal(world.colliders.filter(c => (c.kind === 'river-water' || c.kind === 'pond-water' || c.kind === 'west-deep-water') && regionAt(c.x, c.z)?.name === SELEMI).length, 0);
  for (const [x, z] of lattice(6)) if (regionAt(x, z)?.name === SELEMI) assert.equal(world.waterAt(x, z), WATERLINE);
  assert.ok(world.selemisMetrics.bedStones > 150, 'and what says a bed is a bed is the stones in it');
});

/**
 * **The channel, measured as built.** The brief: do not change the swim rule; measure whether the
 * channel can be swum and report the numbers, because whether it should be is the user's decision.
 * So nothing below is a ruling. It pins the ground - three pinches, each a hex corner of the island
 * opposite a hex corner of the tip - and then says what the rule **as it stands** makes of that
 * width, so that the day somebody decides the question, the line that has to change is here and has
 * its reason beside it (docs/swimming.md, docs/selemis-report.md).
 *
 * Shore to shore the way `tests/swimming.test.js` measures the Pebbles: standable ground with water
 * within a metre, and the shortest line from one shore to the other. Not from the hex outlines, which
 * say 57.7 m: the built shorelines sit inside them.
 */
const tipGround = flood({ x: hexCentre(-7, 131).x, z: hexCentre(-7, 131).z });
const CHANNEL = (() => {
  const mine = shoreOf(walked.reached), theirs = shoreOf(tipGround.reached.filter(c => c.z > 2180));
  const gap = test => {
    let best = { metres: Infinity };
    for (const p of mine) for (const q of theirs) { if (!test(p, q)) continue; const metres = Math.hypot(p.x - q.x, p.z - q.z); if (metres < best.metres) best = { metres, island: p, tip: q }; }
    return best;
  };
  return {
    west: gap((p, q) => p.x < -825 && q.x < -825),
    middle: gap((p, q) => p.x >= -825 && p.x <= -770 && q.x >= -800 && q.x <= -740),
    east: gap((p, q) => p.x > -730 && q.x > -730),
    strand: (() => { let best = { metres: Infinity }; for (const p of mine) { if (strandWeight(p.x, p.z) < .9) continue; for (const q of theirs) { const metres = Math.hypot(p.x - q.x, p.z - q.z); if (metres < best.metres) best = { metres, island: p, tip: q }; } } return best; })(),
  };
})();

test('the natural channel remains one row of water: three pinches of sixty metres, six metres deep, and nobody wades it', () => {
  for (const [name, metres] of [['west', 61.0], ['middle', 59.7], ['east', 61.0]])
    assert.ok(Math.abs(CHANNEL[name].metres - metres) < 1.5, `the ${name} pinch is ${CHANNEL[name].metres.toFixed(1)} m shore to shore; docs/selemis-report.md says ${metres} m`);
  // The nearest the strand's own sand comes to the peninsula: no cliff under a swimmer at either end of it.
  assert.ok(Math.abs(CHANNEL.strand.metres - 64) < 1.5, `from the strand to the tip is ${CHANNEL.strand.metres.toFixed(1)} m`);
  for (const [name, pinch] of Object.entries(CHANNEL)) {
    // "Not so little that an army can wade": every line across is full depth for most of its length.
    let deepest = Infinity, wet = 0, n = 0;
    for (let t = 0; t <= 1; t += .01) {
      const x = pinch.island.x + (pinch.tip.x - pinch.island.x) * t, z = pinch.island.z + (pinch.tip.z - pinch.island.z) * t;
      deepest = Math.min(deepest, H(x, z)); n++;
      if (canSwim(x, z, naturalWorld, RADIUS)) wet++;
    }
    assert.ok(WATERLINE - deepest > 5.5, `the ${name} crossing is ${(WATERLINE - deepest).toFixed(1)} m deep at its deepest`);
    assert.ok(wet / n > .93, `${Math.round(wet / n * 100)}% of the ${name} crossing is water over a traveler’s head`);
    // Both ends of it are shore, on their own sides.
    assert.equal(regionAt(pinch.island.x, pinch.island.z)?.name, SELEMI);
    assert.equal(regionAt(pinch.tip.x, pinch.tip.z)?.name, ASCARTH_TIP);
  }
  // The island did not move its own waterline: on every shore it is where the coast field puts it,
  // a little over two metres seaward of the field's zero, cliff or strand alike.
  for (const p of shoreOf(walked.reached)) assert.ok(landDistance(p.x, p.z) > -3.6 && landDistance(p.x, p.z) < 1.5, `the shore at ${p.x}, ${p.z} is ${landDistance(p.x, p.z).toFixed(1)} m off the coast field’s zero`);
});

test('what the unchanged swim rule makes of the natural channel width: a first-day swimmer crosses either way, drowning for the last few metres', () => {
  // **A measurement, not a ruling.** If the user decides the channel should not be swum, this is the
  // test that changes, along with either the ground or the rule.
  for (const name of ['west', 'middle', 'east']) {
    const metres = CHANNEL[name].metres;
    assert.ok(swimReach(1) < metres, `a level-1 bar of wind is ${swimReach(1).toFixed(1)} m and the ${name} pinch is ${metres.toFixed(1)} m`);
    assert.ok(swimRange(1) > metres, `and a level-1 swimmer dies at ${swimRange(1).toFixed(1)} m`);
    assert.equal(levelForCrossing(metres), 1, `the ${name} pinch is survivable from level 1`);
    assert.ok(levelForDryCrossing(metres) >= 4 && levelForDryCrossing(metres) <= 7, `and dry from level ${levelForDryCrossing(metres)}`);
  }
  assert.equal(levelForCrossing(CHANNEL.strand.metres), 1, 'and from the strand itself');
  // The same thing with a body in the water, through the game's own movement: from each shore to the
  // other, entering and leaving the sea with nothing but `moveCharacter` and `swimStep`.
  const cross = (from, to, level) => {
    const n = Math.hypot(to.x - from.x, to.z - from.z), beyond = { x: to.x + (to.x - from.x) / n * 2.5, z: to.z + (to.z - from.z) / n * 2.5 };
    const p = { x: from.x, z: from.z, y: H(from.x, from.z) }, dt = 1 / 30;
    let wind = SWIM.wind, health = 100, swum = 0, wet = false;
    for (let i = 0; i < 30 * 120 && health > 0; i++) {
      const inWater = canSwim(p.x, p.z, naturalWorld, RADIUS);
      if (wet && !inWater) break;                      // out the other side
      if (inWater) wet = true;
      const dx = beyond.x - p.x, dz = beyond.z - p.z, d = Math.hypot(dx, dz), step = Math.min(d, (inWater ? swimSpeed(level) : 4.2) * dt), bx = p.x, bz = p.z;
      moveCharacter(p, dx / d * step, dz / d * step, naturalWorld, RADIUS, { swimming: true });
      if (inWater) { const s = swimStep({ dt, level, wind, health }); wind = s.wind; health = s.health; swum += Math.hypot(p.x - bx, p.z - bz); }
    }
    return { landed: wet && canStand(p.x, p.z, naturalWorld, RADIUS), health, wind, swum, offTarget: Math.hypot(p.x - to.x, p.z - to.z) };
  };
  for (const name of ['west', 'middle', 'east']) for (const [from, to, way] of [[CHANNEL[name].tip, CHANNEL[name].island, 'to the island'], [CHANNEL[name].island, CHANNEL[name].tip, 'to the peninsula']]) {
    const first = cross(from, to, 1);
    assert.ok(first.landed && first.offTarget < 3, `a level-1 swimmer going ${way} at the ${name} pinch did not land (${first.swum.toFixed(1)} m swum, ${first.health.toFixed(0)} health)`);
    assert.equal(first.wind, 0, 'he arrives with no wind left');
    assert.ok(first.health > 80 && first.health < 97, `and ${first.health.toFixed(0)} of a hundred health, going ${way} at the ${name} pinch`);
    assert.ok(Math.abs(first.swum - CHANNEL[name].metres) < 2.5, `having swum ${first.swum.toFixed(1)} m`);
    const tenth = cross(from, to, 10);
    assert.ok(tenth.landed && tenth.health === 100 && tenth.wind > 0, `a level-10 swimmer going ${way} at the ${name} pinch arrives dry with wind in hand`);
  }
});

test('city terrain is bounded: the coast and water outside canal mouths and southern cliffs keep their physical heights', () => {
  let unchanged = 0, sea = 0, changed = 0;
  for (const [x, z] of lattice(2, { minX: -1020, maxX: -580, minZ: 2260, maxZ: 2620 })) {
    const before = H(x, z), expected = selamusGround(x, z, before), actual = world.groundHeight(x, z);
    assert.ok(Math.abs(actual - expected) < 1e-8, `city ground composition differs at ${x}, ${z}`);
    if (expected === before) { unchanged++; assert.equal(actual, before); }
    else changed++;
    if (landDistance(x, z) <= 0 && selamusCanalAt(x, z)?.edge >= 1.3) { sea++; assert.equal(actual, before, `sea bed outside a canal mouth changed at ${x}, ${z}`); }
  }
  assert.ok(unchanged > 10000 && sea > 10000 && changed > 1000);
  for (const zone of SELEMIS_WILDLIFE_ZONES.filter(zone => zone.species === 'gull')) for (const [x, z] of zone.sites) {
    if (oceanward(x, z) > .85) assert.equal(world.groundHeight(x, z), H(x, z), 'ocean colony cliff changed');
    assert.ok(selamusCanalAt(x, z).edge > 1.3, `${zone.id} home is inside a tidal canal`);
  }
});

test('the island writes nothing off itself: the peninsula across the channel is the ground it was', () => {
  let checked = 0, tip = 0, sea = 0;
  for (const [x, z] of lattice(3, { minX: -1160, maxX: -440, minZ: 2140, maxZ: 2760 })) {
    const here = regionAt(x, z)?.name, d = landDistance(x, z);
    if (here === SELEMI && d > 0) continue;
    const g = -3 + ((x * 7 + z * 13) % 11);
    assert.equal(selemisGround(x, z, g), g, `the island writes ground at ${x}, ${z} (${here})`);
    if (here !== SELEMI) {
      assert.equal(selemisTint(x, z, REGION_TERRAIN[SELEMI].ground), null, `the island paints ground at ${x}, ${z} (${here})`);
      assert.equal(selemisTint(x, z, REGION_TERRAIN.outland.ground), null);
      assert.equal(selemisShoreTint(x, z, d), null, `the island paints a shore at ${x}, ${z} (${here})`);
    }
    checked++; if (here === ASCARTH_TIP) tip++; if (d <= 0) sea++;
  }
  assert.ok(checked > 40000 && tip > 2500 && sea > 30000, `${checked} points checked, ${tip} of them the peninsula’s and ${sea} at sea`);
  // And on its own ground it is all its own: there is no land border to blend across.
  for (const cell of cells) assert.notEqual(selemisGround(cell.x, cell.z, -99), -99);
  assert.ok(SELEMIS_BOX.minX < -1000 && SELEMIS_BOX.maxX > -600);
  // In the channel each shore's name reaches a quarter of a hex out over the water and no further, and
  // a point is named for whichever country's hex it is nearer: the island never takes the peninsula's
  // water and the peninsula never takes the island's.
  const nearestOf = (name, x, z) => Math.min(...REGION_CELLS[name].map(cell => Math.hypot(cell.x - x, cell.z - z)));
  let named = { [SELEMI]: 0, [ASCARTH_TIP]: 0, open: 0 };
  for (const [x, z] of lattice(3, { minX: -960, maxX: -640, minZ: 2240, maxZ: 2420 })) {
    if (landDistance(x, z) > 0) continue;
    const here = regionAt(x, z)?.name, mine = nearestOf(SELEMI, x, z), theirs = nearestOf(ASCARTH_TIP, x, z);
    if (here === ASCARTH_TIP) { assert.ok(theirs < mine && theirs < 76, `the peninsula’s name reaches ${x}, ${z}`); named[ASCARTH_TIP]++; }
    else if (here === SELEMI) { assert.ok(mine < theirs && mine < 76, `the island’s name reaches ${x}, ${z}`); named[SELEMI]++; }
    else { assert.ok(mine >= 76 && theirs >= 76, `${x}, ${z} is open water ${mine.toFixed(0)} m from the island and ${theirs.toFixed(0)} m from the tip`); named.open++; }
  }
  // The middle of the channel is nobody's: open water between the two fringes.
  assert.ok(named[SELEMI] > 300 && named[ASCARTH_TIP] > 300 && named.open > 100, JSON.stringify(named));
});

test('the unwalled city is registered without inventing residents, preserving the island landmarks', () => {
  const mine = world.colliders.filter(c => regionAt(c.x, c.z)?.name === SELEMI);
  const kinds = new Set(mine.map(c => c.kind));
  for (const kind of kinds) assert.ok(['selemis-tree', 'ridge-rock', 'building', 'building-column', 'bridge-rail', 'bollard', 'naval-pedestal', 'harbor-crane', 'harbor-cargo', 'ship'].includes(kind), `a ${kind} on the island`);
  for (const path of world.paths ?? []) for (const p of path) assert.notEqual(regionAt(p.x, p.z)?.name, SELEMI, 'a road on the island');
  for (const [id, stand] of Object.entries(world.npcPositions)) assert.notEqual(regionAt(stand.x, stand.z)?.name, SELEMI, `${id} stands on the island`);
  assert.deepEqual(island.npcIds, []);
  assert.equal(island.id, REGION_IDS[SELEMI]);
  // Its places: every one of the region's own, on its own ground, and described.
  assert.ok(island.landmarks.includes('selamus') && island.landmarks.includes('selamus-temple'));
  for (const place of SELEMIS_LANDMARKS) assert.ok(world.landmarks.some(entry => entry.id === place.id), `${place.id} was removed`);
  for (const id of island.landmarks) {
    const place = [...SELEMIS_LANDMARKS, ...SELAMUS_LANDMARKS].find(entry => entry.id === id);
    assert.ok(world.landmarks.some(entry => entry.id === id), `${id} is not on the world’s list`);
    assert.equal(regionAt(place.x, place.z).name, SELEMI, `${id} is not on the island`);
    assert.ok(landDistance(place.x, place.z) > 3, `${id} is in the water`);
    assert.ok(place && place.description.length > 30);
  }
  // **Two names are the Selemi tongue's own words and none is coined** (LANGUAGES.selemi.roots).
  const named = word => `The ${word[0].toUpperCase()}${word.slice(1)}`;
  assert.equal(SELEMIS_LANDMARKS.find(place => place.id === 'selemis-harbour').name, named(LANGUAGES.selemi.roots.harbour));
  assert.equal(SELEMIS_LANDMARKS.find(place => place.id === 'selemis-channel').name, named(LANGUAGES.selemi.roots.crossing));
  assert.match(LANGUAGES.selemi.from, /tennoca/, 'the tongue’s own derivation is the profile the names stand on');
  for (const place of SELEMIS_LANDMARKS.filter(entry => !['selemis-harbour', 'selemis-channel'].includes(entry.id)))
    assert.match(place.name, /^The (west|east) head$|^The interior hills$|^The winter beds$|^The south cliffs$/, `${place.name} is not plain English`);
  // The chart.
  const status = regionBuildStatus(SELEMI);
  assert.equal(status.state, 'environment'); assert.equal(status.playable, true);
  assert.match(status.detail, /Selemis/); assert.match(status.work, /residents|interiors/);
  const areas = SUBREGIONS.filter(area => area.region === SELEMI && area.id.startsWith('selemis-'));
  assert.deepEqual(areas.map(area => area.id).sort(), ['selemis-east-head', 'selemis-interior-hills', 'selemis-seloca', 'selemis-west-head']);
  for (const place of SELAMUS_LANDMARKS) assert.ok(SUBREGIONS.some(area => area.region === SELEMI && area.id === place.id), `${place.id} has no city map area`);
  for (const area of areas) {
    assert.equal(regionAt(area.x, area.z).name, SELEMI, area.id);
    assert.ok(insideRegion(SELEMI, area.x, area.z), area.id);
    assert.ok(area.radius >= 18 && area.radius <= 130, area.id);
    let owned = 0, samples = 0;
    for (let a = 0; a < 24; a++) for (let r = 1; r <= 4; r++) {
      samples++; if (insideRegion(SELEMI, area.x + Math.cos(a / 24 * Math.PI * 2) * area.radius * r / 4, area.z + Math.sin(a / 24 * Math.PI * 2) * area.radius * r / 4)) owned++;
    }
    assert.ok(owned / samples > .6, `${area.id} is only ${Math.round(owned / samples * 100)}% inside the island`);
    assert.ok(walked.has(area.x, area.z), `${area.id}’s middle cannot be walked to`);
  }
  // The Selemi's own tongue, which was in the game before the island was.
  assert.deepEqual({ ...REGION_LANGUAGE[SELEMI] }, { language: 'selemi', dialect: null });
  assert.equal(LANGUAGES.selemi.endonym, 'Selanoc');
  // One travel button, on its own authored hex.
  const stop = DEV_WORLD_DESTINATIONS.find(destination => destination.regionId === SELEMI);
  assert.ok(stop, 'the island has no travel button');
  assert.equal(stop.region, REGION_IDS[SELEMI], 'and its number is the registry’s, read and not written');
  const anchor = hexCentre(stop.atlas.q, stop.atlas.r);
  assert.equal(hexOwnerAt(anchor.x, anchor.z), SELEMI);
  const atlasCell = ATLAS.regions.find(region => (region.name ?? region.id) === SELEMI).cells.find(cell => cell.q === stop.atlas.q && cell.r === stop.atlas.r);
  assert.ok(Math.abs(atlasCell.x - stop.atlas.x) < .01 && Math.abs(atlasCell.y - stop.atlas.y) < .01, 'the anchor is that hex’s own point on the atlas');
});

test('what grows there: straw grass and scrub, maquis and a few trees in the lee, stone on the tops, wrack on the strand', () => {
  const m = world.selemisMetrics;
  for (const [key, least] of Object.entries({ rocks: 400, outcrops: 25, scrub: 700, maquis: 60, tufts: 2400, pines: 12, olives: 5, tamarisks: 6, bedStones: 150, wrack: 60, cliffRocks: 150 }))
    assert.ok(m[key] >= least, `${m[key]} ${key}`);
  const trees = world.colliders.filter(c => c.kind === 'selemis-tree');
  assert.equal(trees.length + world.selamus.metrics.cleared.trees, m.trees, 'only city-reserved trees are removed');
  for (const tree of trees) assert.equal(selamusReserved(tree.x, tree.z, 3), false, 'a retained tree blocks the city');
  assert.equal(m.trees, m.pines + m.olives + m.tamarisks);
  assert.ok(m.trees < 50, 'few trees: an island with a sea wind on it');
  // Every one is enrolled in the world's tree registry under an id of its own, with its species - what
  // tests/tree-registry.test.js holds for the kinds on its list, held here for the island's.
  const enrolled = new Map(world.treeRegistry.trees.map(tree => [tree.id, tree]));
  assert.equal(new Set(trees.map(tree => tree.id)).size, trees.length, 'two trees with one id');
  for (const tree of trees) {
    assert.ok(tree.id?.startsWith('selemis-') && enrolled.has(tree.id), `the tree at ${tree.x.toFixed(0)}, ${tree.z.toFixed(0)} is not enrolled`);
    assert.equal(enrolled.get(tree.id).species, tree.species);
  }
  for (const tree of trees) {
    assert.equal(hexOwnerAt(tree.x, tree.z), SELEMI, 'a tree off the island');
    const d = landDistance(tree.x, tree.z), cover = selemisCover(tree.x, tree.z);
    if (tree.species === 'tamarisk') {
      // Along the back of the strand, where the sand ends.
      assert.ok(d >= 9 && d <= 16 && strandWeight(tree.x, tree.z) >= .85, `a tamarisk ${d.toFixed(0)} m from the water at ${tree.x.toFixed(0)}, ${tree.z.toFixed(0)}`);
    } else if (tree.species === 'olive') {
      assert.ok(d >= 16 && cover.hollow >= .3, 'a wild olive out of the hollow');
    } else {
      // A pine: in the lee of a hill - below its top, on its harbour side - and never on the upper slopes.
      assert.equal(tree.species, 'stone-pine');
      const on = hillAt(tree.x, tree.z);
      assert.ok(on && on.u > .3, `a pine on a hilltop at ${tree.x.toFixed(0)}, ${tree.z.toFixed(0)}`);
      assert.ok(Math.hypot(tree.x - HARBOUR.x, tree.z - HARBOUR.z) < Math.hypot(on.hill.x - HARBOUR.x, on.hill.z - HARBOUR.z), 'a pine on the windward side of its hill');
    }
    assert.ok(Math.hypot(tree.x - island.spawn.x, tree.z - island.spawn.z) > 6, 'a tree on the travel button');
  }
  // Nothing solid within four metres of where the travel button puts a traveler.
  assert.ok(!world.colliders.some(c => Math.hypot(c.x - island.spawn.x, c.z - island.spawn.z) < (c.r ?? 0) + 4));
});

test('both tint tables reach the screen on the island: its own colours inland, and stone on its cliffs', () => {
  assert.ok(GROUND_TINT_FAMILIES.includes('selemis'), 'the island has a row in the ground table');
  // **The shore table's guard**: exactly these rows, and every one of them puts stone on its own
  // country's shore and nothing on the other's. A row that quietly stops painting says so with its id.
  assert.deepEqual([...SHORE_TINT_FAMILIES], ['ascarth', 'selemis', 'legemum', 'babon', 'east-izol', 'alezhor', 'south-ibenal', 'north-ibenal'], 'a row was added to the shore table without a line here');
  const probes = { ascarth: ASCARTH_TIP, selemis: SELEMI, legemum: 'Legemum', babon: 'Babon', 'east-izol': 'East Izol', alezhor: 'Alezhor', 'south-ibenal': 'South Ibenal', 'north-ibenal': 'North Ibenal' };
  for (const family of SHORE_TINT_FAMILIES) {
    let stone = 0, strays = 0;
    for (const [x, z] of lattice(2, family === 'south-ibenal' ? { minX: -4820, maxX: -4380, minZ: -40, maxZ: 980 } : family === 'north-ibenal' ? { minX: -4420, maxX: -3820, minZ: -660, maxZ: 0 } : family === 'alezhor' ? { minX: -4680, maxX: -3700, minZ: 880, maxZ: 1240 } : family === 'east-izol' ? { minX: 380, maxX: 880, minZ: 1340, maxZ: 2180 } : family === 'babon' ? { minX: -2120, maxX: -1030, minZ: 2650, maxZ: 3390 } : family === 'legemum' ? { minX: -2480, maxX: -1790, minZ: 1460, maxZ: 2000 } : { minX: -1010, maxX: -590, minZ: 2180, maxZ: 2606 })) {
      const d = landDistance(x, z);
      if (d < 0 || d > 3) continue;
      const answer = shoreTintOf(family, x, z, d);
      if (regionAt(x, z)?.name === probes[family]) { if (answer?.rock > .9) stone++; } else if (answer) strays++;
    }
    assert.ok(stone > 40, `the ${family} row never puts stone on its own shore (${stone} samples)`);
    assert.equal(strays, 0, `the ${family} row paints ${strays} samples of somebody else’s shore`);
  }
  const colour = new THREE.Color(), want = new THREE.Color();
  const near = (x, z, hex) => { groundTint(colour, x, z, THREE); want.set(hex); return Math.hypot(colour.r - want.r, colour.g - want.g, colour.b - want.b); };
  // Stone at the foot of the south cliffs and sand on the strand, drawn.
  let face = null, sand = null;
  for (const [x, z] of lattice(1, { minX: -905, maxX: -880, minZ: 2555, maxZ: 2580 })) { const d = landDistance(x, z); if (d > 0 && d < 2 && regionAt(x, z)?.name === SELEMI) { face = [x, z]; break; } }
  assert.ok(face && near(face[0], face[1], SELEMIS_GROUND.stone) < .02, 'the south cliffs’ face is not stone-coloured');
  for (let s = 0; s < 30 && !sand; s += .5) { const x = HARBOUR.water.x + HARBOUR.axis.x * (40 + s), z = HARBOUR.water.z + HARBOUR.axis.z * (40 + s), d = landDistance(x, z); if (d > 1.5 && d < 3.5) sand = [x, z]; }
  assert.ok(sand && near(sand[0], sand[1], '#cdb98a') < .03, 'the strand is not sand-coloured');
  assert.equal(selemisShoreTint(sand[0], sand[1], landDistance(sand[0], sand[1])), null, 'the strand takes the world’s own sand');
  // Inland the four fields move the colour: the hollow, a hilltop, the ocean bench and a winter bed
  // are four different grounds, and none of them is the bare swatch.
  const at = (x, z) => { colour.set(selemisTint(x, z, REGION_TERRAIN[SELEMI].ground)); return [colour.r, colour.g, colour.b]; };
  const gap = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  want.set(REGION_TERRAIN[SELEMI].ground);
  const swatch = [want.r, want.g, want.b];
  const grounds = { hollow: at(naturalSpawn.x - 6, naturalSpawn.z + 12), crown: at(HILLS[1].x, HILLS[1].z), bed: at(WINTER_BEDS[0].line[1].x, WINTER_BEDS[0].line[1].z), ocean: at(-870, 2560) };
  for (const [name, value] of Object.entries(grounds)) assert.ok(gap(value, swatch) > .02, `the ${name} is drawn as the bare swatch`);
  const names = Object.keys(grounds);
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++)
    assert.ok(gap(grounds[names[i]], grounds[names[j]]) > .03, `the ${names[i]} and the ${names[j]} are drawn the same colour`);
  // The sea hexes' share of the blend is the island's on the island, and nobody else's anywhere else.
  assert.notEqual(selemisTint(MIDDLE.x, MIDDLE.z, REGION_TERRAIN.outland.ground), null);
  const tip = hexCentre(-7, 131), iscare = hexCentre(1, 119);
  for (const p of [tip, iscare]) for (const ground of [REGION_TERRAIN.outland.ground, REGION_TERRAIN[SELEMI].ground]) assert.equal(selemisTint(p.x, p.z, ground), null);
  // The cover fields say what they are for.
  assert.ok(selemisCover(naturalSpawn.x, naturalSpawn.z).hollow > .9 && selemisCover(HILLS[1].x, HILLS[1].z).crown === 1);
  assert.ok(selemisCover(SOUTH_CLIFFS.x, SOUTH_CLIFFS.z).salt > .6 && selemisCover(CHANNEL_VIEW.x, CHANNEL_VIEW.z).salt === 0);
});

test('the wildlife is the sea’s: gulls on both heads and the ocean cliffs, sea-plungers off them, dolphins in the lane', () => {
  assert.deepEqual([...new Set(SELEMIS_WILDLIFE_ZONES.map(zone => zone.species))].sort(), ['dolphin', 'gull', 'sea-plunger']);
  for (const zone of SELEMIS_WILDLIFE_ZONES) {
    assert.equal(zone.region, SELEMI);
    assert.ok(WEST_LIFE_ZONES.includes(zone), `${zone.id} is not in the west’s list`);
    assert.ok(zone.note.length > 60, `${zone.id} does not say why it is here`);
    // No range wider than it is run from, and every home inside its own range.
    if (!zone.air && !zone.sea) assert.ok(Math.hypot(zone.maxX - zone.minX, zone.maxZ - zone.minZ) / 2 < LIFE_REACH, `${zone.id}'s range is wider than it is run from`);
    for (const [x, z] of zone.sites) {
      assert.ok(x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ, `${zone.id}'s home is outside its range`);
      if (zone.sea) { assert.ok(landDistance(x, z) < -20, `${zone.id} is not at sea`); continue; }
      if (zone.plunge) {
        // Every point of its circle is over deep water, so every dive lands in the sea.
        for (let a = 0; a < 36; a++) assert.ok(landDistance(x + Math.sin(a / 36 * Math.PI * 2) * zone.circle, z + Math.cos(a / 36 * Math.PI * 2) * zone.circle) < -10, `${zone.id} would dive onto land`);
        continue;
      }
      assert.ok(canStand(x, z, world, zone.radius), `${zone.id} stands on nothing at ${x}, ${z}`);
      assert.equal(hexOwnerAt(x, z), SELEMI, `${zone.id} is off the island at ${x}, ${z}`);
      assert.ok(!world.colliders.some(c => Math.hypot(c.x - x, c.z - z) < 2.5), `${zone.id} is in a trunk or a stone at ${x}, ${z}`);
      // A gull: on a cliff top, a dozen metres back from the edge - far enough that the ground the
      // renderer draws under it is the ground it stands on. Six metres back, one floated 1.6 m over it.
      const d = landDistance(x, z);
      assert.ok(d > 9 && d < 14 && H(x, z) > 7 && cliffShare(x, z) > .9, `${zone.id} is not on a cliff top at ${x}, ${z}`);
      // Head colonies now stand on open waterfront; the ocean colony retains
      // its original cliff. The rendered-footing check is always the real city.
      assert.ok(Math.abs(world.heightAt(x, z) - drawnHeight(x, z)) < .3, `${zone.id} stands ${(world.heightAt(x, z) - drawnHeight(x, z)).toFixed(2)} m off the drawn ground at ${x}, ${z}`);
    }
  }
  // Each head has its gulls, and so has the ocean face.
  const gulls = SELEMIS_WILDLIFE_ZONES.filter(zone => zone.species === 'gull');
  assert.equal(gulls.length, 3);
  for (const head of HEADS) assert.ok(gulls.some(zone => zone.sites.every(([x, z]) => Math.hypot(x - head.x, z - head.z) < 70)), `no gulls on ${head.id}`);
  assert.ok(gulls.some(zone => zone.sites.every(([x, z]) => oceanward(x, z) > .85)), 'no gulls on the ocean face');
  // The plungers work the ocean side of the island, not the channel.
  const plungers = SELEMIS_WILDLIFE_ZONES.find(zone => zone.species === 'sea-plunger');
  assert.ok(plungers.sites[0][1] > MIDDLE.z + 80 && plungers.sites[0][0] < MIDDLE.x - 80, 'the plungers are not off the south-western cliffs');
  // Soaring, then folded and falling to the water, under it, and back up again.
  const life = createWestLife(new THREE.Scene(), world, { zones: [plungers] });
  const seen = new Set(), viewer = { x: SOUTH_CLIFFS.x, z: SOUTH_CLIFFS.z };
  for (let i = 0; i < 40 * 30; i++) {
    life.update(1 / 30, viewer, true);
    for (const bird of life.state().creatures) {
      seen.add(bird.action);
      if (bird.action !== 'soar') assert.ok(landDistance(bird.x, bird.z) < -10, 'it went into the sea and not onto the land');
    }
  }
  for (const action of ['soar', 'plunge', 'under', 'climb']) assert.ok(seen.has(action), `never saw it ${action}`);
  life.dispose();
});

/**
 * **The west's chase laws, on the island's own ranges.** `tests/west-life.test.js` walks every range
 * in the west inside one loop per law and stops at the first band that fails, so a new country's
 * ranges are only ever reached on a base where everybody else's pass - which this base's do not. So
 * the island's three ground ranges are held to the same laws here, by the same chase: nothing can be
 * walked down, from any side; and a band that has been run at is home again in a few minutes,
 * watched or not.
 */
test('the gulls keep the west’s laws: nobody walks one down from any side, and a flushed band comes home', () => {
  const WALK = 4.2, RUN = 7.2, HZ = 60;
  const chase = (zone, pace, seconds, bearing) => {
    const life = createWestLife(new THREE.Scene(), world, { zones: [zone] });
    const band = () => life.state().creatures;
    const first = band()[0], homes = new Map(band().map(animal => [animal.id, { x: animal.x, z: animal.z }]));
    const player = { x: first.x + Math.sin(bearing) * 40, z: first.z + Math.cos(bearing) * 40 };
    const report = { life, band, homes, player, closest: Infinity, offFooting: 0, actions: new Set() };
    report.watch = () => {
      for (const animal of band()) {
        report.actions.add(animal.action);
        const standing = !animal.hidden && animal.action !== 'fly' && animal.action !== 'dive';
        if (standing && !(canStand(animal.x, animal.z, world, zone.radius) && animal.x >= zone.minX && animal.x <= zone.maxX && animal.z >= zone.minZ && animal.z <= zone.maxZ)) report.offFooting++;
        if (animal.id === first.id && !animal.hidden && animal.lift < 1) report.closest = Math.min(report.closest, Math.hypot(animal.x - player.x, animal.z - player.z));
      }
    };
    for (let i = 0; i < seconds * HZ; i++) {
      const animal = band().find(item => item.id === first.id), dx = animal.x - player.x, dz = animal.z - player.z, d = Math.hypot(dx, dz);
      if (d > .4) { const step = Math.min(d - .3, pace / HZ); player.x += dx / d * step; player.z += dz / d * step; }
      life.update(1 / HZ, player, true); report.watch();
    }
    return report;
  };
  const fromHome = report => Math.max(...report.band().map(animal => { const home = report.homes.get(animal.id); return Math.hypot(animal.x - home.x, animal.z - home.z); }));
  for (const zone of SELEMIS_WILDLIFE_ZONES.filter(item => !item.air && !item.sea)) {
    // From the four quarters, because an island's range has the sea on some of them and a walker
    // coming out of the sea is the one a headland has not seen before.
    for (const bearing of [Math.PI / 2, -Math.PI / 2, 0, Math.PI]) {
      const walk = chase(zone, WALK, 30, bearing);
      assert.equal(walk.band().length, zone.sites.length, `${zone.id}: not every bird found a home`);
      assert.ok(walk.closest >= 3, `${zone.id}: somebody walking from bearing ${bearing.toFixed(2)} got within ${walk.closest.toFixed(2)} m`);
      assert.ok(walk.actions.has('fly'), `${zone.id}: a gull that is walked at takes to the air`);
      assert.equal(walk.offFooting, 0, `${zone.id}: a bird on the ground stood somewhere it cannot stand`);
      walk.life.dispose();
    }
    // Watched: run at them, then stand a hundred metres off for three minutes.
    const watched = chase(zone, RUN, 20, Math.PI / 2), centre = { x: (zone.minX + zone.maxX) / 2, z: (zone.minZ + zone.maxZ) / 2 };
    const clear = spot => Math.min(...watched.band().map(animal => Math.hypot(animal.x - spot.x, animal.z - spot.z)));
    const park = [[100, 0], [-100, 0], [0, 100], [0, -100], [70, 70], [-70, -70], [70, -70], [-70, 70]]
      .map(([dx, dz]) => ({ x: centre.x + dx, z: centre.z + dz })).sort((a, b) => clear(b) - clear(a))[0];
    assert.ok(clear(park) > 40, `${zone.id}: nowhere within reach of the band is clear of all of it`);
    watched.player.x = park.x; watched.player.z = park.z;
    for (let i = 0; i < 180 * 30; i++) { watched.life.update(1 / 30, watched.player, true); watched.watch(); }
    assert.ok(fromHome(watched) <= 20, `${zone.id}: three minutes on, watched, one is still ${fromHome(watched).toFixed(0)} m from home`);
    assert.equal(watched.offFooting, 0, `${zone.id}: a bird going home stood somewhere it cannot stand`);
    watched.life.dispose();
    // Unwatched: run at them, go a kilometre off for four minutes, and come back.
    const left = chase(zone, RUN, 20, Math.PI / 2);
    for (let i = 0; i < 240 * 30; i++) left.life.update(1 / 30, { x: centre.x + 1000, z: centre.z }, true);
    left.life.update(1 / 30, { x: centre.x, z: centre.z + 100 }, true);
    assert.ok(fromHome(left) <= 20, `${zone.id}: left alone for four minutes and still ${fromHome(left).toFixed(0)} m from home`);
    assert.ok(left.band().every(animal => !animal.hidden && animal.action !== 'fly'), `${zone.id}: somebody is still in the air`);
    left.life.dispose();
  }
});
