import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { sourceModule } from './module-loader.js';
import * as THREE from '../vendor/three.module.js';
import { canStand } from '../src/gameplay/movement/game-state.js';
import { PLAYABLE_REGIONS, REGION_BIOMES, METRES_PER_HEX } from '../src/world/terrain/region-layout.js';
import { RIVER_EDGES } from '../src/world/terrain/region-rivers.js';
import { LAND_HEXES } from '../src/dev/tools/region-survey.js';
import {
  REGION_CELLS, REGION_IDS, REGION_TERRAIN, WORLD_BOUNDS, hexAt, hexCentre, hexOwnerAt, regionAt, regions, landDistance,
  insideRegion, relief, SEA_LEVEL,
} from '../src/world/terrain/region-world.js';
import { groundWithRiver } from '../src/world/terrain/world-terrain.js';
import { DEFAULT_SKY, regionSky } from '../src/world/environment/region-sky.js';
import { regionLevel } from '../src/world/terrain/region-levels.js';
import { regionBuildStatus } from '../src/dev/tools/build-status.js';
import { SUBREGIONS } from '../src/ui/map/map-fog.js';
import { REGION_LANGUAGE, DIALECTS } from '../src/gameplay/skills/languages.js';
import { DEV_WORLD_DESTINATIONS } from '../src/dev/tools/developer-atlas.js';
import { PLAYABLE, WINDOW } from '../scripts/build-region-survey.mjs';
import {
  NORTH, SOUTH, ASCARTH_CLIMATE, HILL_HEXES, FRONTIER_EDGES, FRONTIER, BAYS, HILLS, SPINE_LENGTH, GREEN_STONE,
  ASCARTH_LANDMARKS, ascarthGround, frontierDistance, frontierWeight, spineAt, bayWeight, cliffShare, isAscarth,
} from '../src/content/regions/ascarth/ascarth-world.js';
import { LIZEEM_REACH } from '../src/content/regions/western-regions/west-regions.js';
import { ASCARTH_WILDLIFE_ZONES } from '../src/content/regions/ascarth/ascarth-wildlife.js';

/**
 * The Ascarth Peninsula - Northern and Southern Ascarth - built on the user's word of 28 September
 * 2026 as terrain, climate, water and wildlife, and nothing that belongs to anybody
 * (docs/ascarth-brief.md, docs/ascarth-report.md).
 *
 * The atlas is the authority. Most of what is asserted below is its own arithmetic: sixteen hexes and
 * eighteen, thirteen of grassland and three of hills and then eighteen of grassland; Csa on every
 * grass hex and Csb on the three hills; eight dry edges with Gala and one with Eer that is the
 * Lizeem; no river inside either. The rest is the lore's sentences held to the ground: cliffs on the
 * west, sheltered bays on the east and north, wooded rocky hills in the interior.
 */
const { createWorld } = await sourceModule('../src/world.js');
const { createWestLife } = await sourceModule('../src/content/regions/western-regions/west-regions-life.js');
const scene = new THREE.Scene();
const world = createWorld(scene);
const north = regions.find(region => region.name === NORTH), south = regions.find(region => region.name === SOUTH);
const cells = [...REGION_CELLS[NORTH], ...REGION_CELLS[SOUTH]];
const WWMAP = new URL('../../world-builder/map/resources/examples/azhora.wwmap', import.meta.url);
const CMAP = new URL('../../world-builder/azhora.cmap.json', import.meta.url);
const AXIAL = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const ATLAS_OWNERS = (() => {
  const atlas = JSON.parse(readFileSync(new URL('../assets/azhora-dev-regions.json', import.meta.url), 'utf8'));
  const owners = new Map();
  for (const region of atlas.regions) for (const cell of region.cells) owners.set(`${cell.q},${cell.r}`, region.name ?? region.id);
  return owners;
})();

test('the atlas: a peninsula of thirty-four hexes, registered after the East Lotharn as twenty-two and twenty-three', () => {
  assert.equal(REGION_IDS[NORTH], 23);
  assert.equal(REGION_IDS[SOUTH], 24);
  // Appended, never inserted, and in that order: the biome scatter walks this list with one stream.
  const order = PLAYABLE_REGIONS.indexOf.bind(PLAYABLE_REGIONS);
  assert.ok(order('East Lotharn Mountains') < order(NORTH) && order(NORTH) + 1 === order(SOUTH));
  if (PLAYABLE_REGIONS.includes('Feradom')) assert.ok(order('Feradom') < order(NORTH), 'after Feradom');
  if (PLAYABLE_REGIONS.includes('Gala')) assert.ok(order('Gala') < order(NORTH), 'after Gala');
  assert.ok(PLAYABLE.indexOf(NORTH) >= 0 && PLAYABLE.indexOf(NORTH) + 1 === PLAYABLE.indexOf(SOUTH), 'surveyed, in order');
  const tally = list => list.reduce((t, cell) => ({ ...t, [cell.terrain]: (t[cell.terrain] ?? 0) + 1 }), {});
  assert.deepEqual(tally(REGION_CELLS[NORTH]), { grassland: 13, hills: 3 });
  assert.deepEqual(tally(REGION_CELLS[SOUTH]), { grassland: 18 });
  assert.deepEqual(HILL_HEXES.map(hex => hex.join(',')).sort(), REGION_CELLS[NORTH].filter(cell => cell.terrain === 'hills').map(cell => `${cell.q},${cell.r}`).sort());
  assert.equal(new Set(PLAYABLE_REGIONS.map(name => REGION_BIOMES[name].id)).size, PLAYABLE_REGIONS.length, 'each its own biome');
  assert.equal(REGION_BIOMES[NORTH].ownScatter, true); assert.equal(REGION_BIOMES[SOUTH].ownScatter, true);
  assert.equal(regionLevel(NORTH), 4); assert.equal(regionLevel(SOUTH), 2);
});

test('it is on the far bank: eight dry edges with Gala, and its one edge with Eer is the Lizeem going into the sea', () => {
  const wet = new Set();
  for (const edge of RIVER_EDGES) { wet.add(`${edge.a}|${edge.b}`); wet.add(`${edge.b}|${edge.a}`); }
  const shared = {}, dry = {};
  for (const [key, name] of ATLAS_OWNERS) {
    if (!isAscarth(name)) continue;
    const [q, r] = key.split(',').map(Number);
    for (const [dq, dr] of AXIAL) {
      const other = ATLAS_OWNERS.get(`${q + dq},${r + dr}`);
      if (!other || isAscarth(other)) continue;
      shared[other] = (shared[other] ?? 0) + 1;
      if (!wet.has(`${[q, r]}|${[q + dq, r + dr]}`)) dry[other] = (dry[other] ?? 0) + 1;
    }
  }
  assert.deepEqual(shared, { Gala: 8, Eer: 1 });
  assert.deepEqual(dry, { Gala: 8 }, 'the only dry way in is Gala’s');
  // The Eer edge is the last edge of the Lizeem's last reach, which ends at the sea there.
  const eer = FRONTIER_EDGES.filter(edge => edge.with === 'Eer');
  assert.equal(eer.length, 1); assert.equal(eer[0].river, true);
  const mouth = LIZEEM_REACH.points.at(-1);
  assert.ok(Math.min(Math.hypot(mouth.x - eer[0].a.x, mouth.z - eer[0].a.z), Math.hypot(mouth.x - eer[0].b.x, mouth.z - eer[0].b.z)) < 1, 'the reach ends at the edge’s seaward corner');
  assert.equal(LIZEEM_REACH.fordUntil, 0);
  // No river inside either country: the map's one river edge on them is that one.
  const own = new Set(cells.map(cell => `${cell.q},${cell.r}`));
  assert.equal(RIVER_EDGES.filter(edge => own.has(edge.a.join(',')) && own.has(edge.b.join(','))).length, 0);
  assert.equal(FRONTIER_EDGES.filter(edge => edge.with === 'Gala').length, 8);
});

test('the climate is the map’s: Csa on every grass hex, Csb on the three hills and nowhere else', () => {
  assert.equal(Object.keys(ASCARTH_CLIMATE).length, 34);
  for (const cell of cells) assert.equal(ASCARTH_CLIMATE[`${cell.q},${cell.r}`], cell.terrain === 'hills' ? 'Csb' : 'Csa', `${cell.q},${cell.r}`);
  if (existsSync(WWMAP)) {
    const map = JSON.parse(readFileSync(WWMAP, 'utf8').replace(/^﻿/, ''));
    assert.equal(map.climateSystem, 'koppen-v1');
    for (const [key, code] of Object.entries(ASCARTH_CLIMATE)) assert.equal(map.hexes[key]?.climate, code, `${key} is ${map.hexes[key]?.climate} on the map`);
  }
  // The campaign map carries one code per region, three codes in all, and says Cfb for both - as it
  // does for Eer and Gala, whose hexes are Cfa, Csa, Csb and BSh. A default, and the hexes win.
  if (existsSync(CMAP)) {
    const cmap = JSON.parse(readFileSync(CMAP, 'utf8'));
    assert.equal(cmap.regions[NORTH]?.climate, 'Cfb'); assert.equal(cmap.regions[SOUTH]?.climate, 'Cfb');
    assert.equal(cmap.regions.Eer?.climate, 'Cfb', 'and Eer, which is Cfa and Csa hex by hex');
  }
  const sky = regionSky(north);
  assert.notDeepEqual({ ...sky }, { ...DEFAULT_SKY }, 'a sky of its own');
  assert.deepEqual({ ...regionSky(south) }, { ...sky }, 'one peninsula, one sky: nothing changes overhead at the seam');
  assert.ok(sky.density < DEFAULT_SKY.density && sky.density < regionSky(regions.find(r => r.name === 'Eer')).density, 'clearer than the default and than Eer');
});

test('the survey window reaches exactly as far south as the coast lattice does, and Selemi is land', () => {
  // The coast field samples a lattice COAST_MARGIN (96 m) beyond the world's bounds; every hex a sample
  // falls in must be in the window or the coast calls that land the sea. Measured the same way here.
  const phase = { x: -1556.0019279391274, z: -704.3502691896258 }, cell = 4, margin = 96;
  const snap = (v, p) => p + Math.floor((v - p) / cell + 1e-9) * cell;
  const minZ = snap(WORLD_BOUNDS.minZ - margin, phase.z), minX = snap(WORLD_BOUNDS.minX - margin, phase.x);
  const lastZ = minZ + (Math.ceil((WORLD_BOUNDS.maxZ + margin - minZ) / cell)) * cell;
  let deepest = -Infinity;
  for (let x = minX; x <= WORLD_BOUNDS.maxX + margin + cell; x += cell) deepest = Math.max(deepest, hexAt(x, lastZ).r, hexAt(x, lastZ - cell).r);
  // 135 when the Ascarth tip set the edge; 144 since the South Meroshe Desert took the world south, and 145
  // since Trogo took it south again (docs/southwest-4-report.md);
  // to z = 3177.824 (docs/southwest-2-report.md). The measurement is the rule and the number follows it.
  assert.equal(deepest, 145, `the lattice reaches row ${deepest}`);
  assert.equal(WINDOW.maxR, deepest, 'the window stops at the last row the lattice reaches: no slack, and nothing left out');
  const land = new Set(LAND_HEXES.map(([q, r]) => `${q},${r}`));
  for (const hex of ['-9,134', '-8,134', '-7,134', '-9,135', '-8,135', '-7,135']) assert.ok(land.has(hex), `Selemi’s ${hex} is land`);
  // Selemi's shore is across the channel from the tip, and is ground, not the sea.
  const selemi = hexCentre(-7, 134);
  assert.ok(landDistance(selemi.x, selemi.z) > 20, 'Selemi reads as land');
  // **The world's southern edge is no longer the tip's**, and this is the guard that had to say so.
  // It was the tip's: Southern Ascarth spent the last of the north-south budget as the budget then
  // stood, 2225.2 -> 2398.401. The budget has been raised twice since - the four Mithala countries
  // carried the world north from -1301.17 to -2167.196 and its height from 36.996 hexes to 45.656,
  // and the South Meroshe Desert then carried it south from 2398.401 to **3177.824** and its height
  // to **53.450**. So what this holds now is three facts: the world's edge is seven hundred and
  // eighty metres past this peninsula's tip, the tip is still comfortably inside it, and the edge the
  // tip did set is still the edge of the tip's own ground.
  // Trogo then carried it south again, from 3177.824 to **3264.4264805429416** and the height from 53.450 hexes to **54.316** (docs/southwest-4-report.md): its three southernmost hexes
  // are on row 142, their lower vertices a circumradius past centres at z = 3146.69. The peninsula has not
  // set the southern edge since job 2 and sets it less now; what it still sets is nothing at all here.
  assert.ok(Math.abs(WORLD_BOUNDS.maxZ - 3437.6315612998296) < 1e-6, `the southern edge is ${WORLD_BOUNDS.maxZ}`);
  const tall = (WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ) / METRES_PER_HEX;
  // Since the Baldro Mountains landed as regions 52 and 53 the eastern and northern edges are theirs:
  // maxX 2209.998, minZ -3899.247, the world 68.20 by 73.369 hexes, the window's maxQ 60 and minR 59.
  // Babon now sets the southern edge at z3437.632, two atlas rows beyond Trogo.
  // Every assertion below that holds one of those numbers holds the Baldros' and nothing of this country's.
  assert.ok(Math.abs(tall - 73.369) < .002, `north to south is ${tall.toFixed(3)} hexes`);
  assert.ok(WORLD_BOUNDS.maxZ > hexCentre(-6, 132).z + 57.7 + 59);
  assert.ok(WORLD_BOUNDS.maxZ - (hexCentre(-6, 132).z + 57.7) > 700, 'the peninsula no longer sets the edge');
  // And the window still stops where the lattice does at both ends: 79 in the north now, 145 here.
  assert.equal(WINDOW.minR, 59, 'the Mithala plain carried the window north with the world');
});

/**
 * The seam contract with Gala (docs/ascarth-brief.md, "Seams"): the same grassland profile both sides,
 * nothing written on the other side, no landform within a hundred metres of the border. Gala is built
 * in another branch, so the blend on its side is measured here with its border hexes at the contract's
 * numbers, which is what that branch uses.
 */
test('the seam with Gala: the same grass either side, nothing written across it, and a hundred metres left alone', () => {
  const grass = REGION_TERRAIN[NORTH];
  assert.deepEqual([grass.base, grass.amp, grass.wave], [4, .6, 320], 'base 4.0, amp .6, wave 320');
  assert.equal(grass.byTerrain.grassland, undefined, 'the grassland hexes take the default, which is the contract');
  // Eer's grassland is 2.9; the one Eer edge is within a metre or two of it.
  assert.ok(Math.abs(grass.base - REGION_TERRAIN.Eer.byTerrain.grassland.base) < 2);
  // Nothing within the hundred metres, and nothing on a hex of Gala's or Eer's, anywhere.
  let checked = 0, band = 0;
  for (let x = -1760; x <= -1250; x += 3) for (let z = 1130; z <= 1520; z += 3) {
    const owner = ATLAS_OWNERS.get(`${hexAt(x, z).q},${hexAt(x, z).r}`);
    const within = frontierDistance(x, z) < FRONTIER.clear;
    if (!within && owner !== 'Gala' && owner !== 'Eer') continue;
    const g = -3 + ((x * 7 + z * 13) % 11);
    assert.equal(ascarthGround(x, z, g), g, `the peninsula writes ground at ${x}, ${z} (${owner ?? 'sea'})`);
    checked++; if (within) band++;
  }
  assert.ok(checked > 8000 && band > 2500, `${checked} points checked, ${band} in the band`);
  // And the hand-built ground is all there from FRONTIER.full in.
  assert.equal(frontierWeight(HILLS[1].x, HILLS[1].z), 1);
  // The blend with Gala at the contract: a step of nothing across the dry edges, and the one hill hex
  // that touches the border lifts Gala's side of that edge by a metre at the most.
  const contract = { base: 4, amp: .6, wave: 320 };
  const profile = (q, r) => {
    const owner = ATLAS_OWNERS.get(`${q},${r}`), terrain = cells.find(cell => cell.q === q && cell.r === r)?.terrain;
    if (owner === 'Gala') return contract;
    if (isAscarth(owner)) return REGION_TERRAIN[owner].byTerrain?.[terrain] ?? REGION_TERRAIN[owner];
    return REGION_TERRAIN.outland;
  };
  const blend = (x, z, override) => {
    const home = hexAt(x, z); let total = 0, base = 0, amp = 0, wave = 0;
    for (const [dq, dr] of [[0, 0], ...AXIAL]) {
      const c = hexCentre(home.q + dq, home.r + dr), w = Math.max(0, 1 - Math.hypot(x - c.x, z - c.z) / (METRES_PER_HEX * 1.28));
      if (!w) continue;
      const p = override?.(home.q + dq, home.r + dr) ?? profile(home.q + dq, home.r + dr);
      total += w; base += p.base * w; amp += p.amp * w; wave += p.wave * w;
    }
    return base / total + relief(x, z, amp / total, wave / total);
  };
  // The blend has seams of its own wherever the sea's hexes are in reach, on every coast in the world,
  // so what is held here is what the peninsula's profiles add to them: the step across the border with
  // its hexes as they are, against the same step with every one of them at the contract.
  const everywhere = (q, r) => (isAscarth(ATLAS_OWNERS.get(`${q},${r}`)) ? contract : undefined);
  let added = 0, lift = 0;
  for (const edge of FRONTIER_EDGES.filter(e => e.with === 'Gala')) for (let t = .02; t < 1; t += .04) {
    const x = edge.a.x + (edge.b.x - edge.a.x) * t, z = edge.a.z + (edge.b.z - edge.a.z) * t;
    const ours = hexCentre(...edge.ours), theirs = hexCentre(...edge.theirs), n = Math.hypot(ours.x - theirs.x, ours.z - theirs.z);
    const nx = (ours.x - theirs.x) / n, nz = (ours.z - theirs.z) / n;
    if (landDistance(x, z) < 40) continue;   // the shore's own beach
    const step = Math.abs(blend(x + nx * .5, z + nz * .5) - blend(x - nx * .5, z - nz * .5));
    const plain = Math.abs(blend(x + nx * .5, z + nz * .5, everywhere) - blend(x - nx * .5, z - nz * .5, everywhere));
    added = Math.max(added, step - plain);
    lift = Math.max(lift, blend(x - nx * .5, z - nz * .5) - blend(x - nx * .5, z - nz * .5, everywhere));
  }
  // Sixteen centimetres, at the two corners where the hill hex drops out of the blend's reach: the
  // ordinary blend's seam for a neighbour three metres higher, and nothing on the edges themselves.
  assert.ok(added < .2, `the peninsula's profiles add a step of ${added.toFixed(2)} m to the border with Gala at the contract`);
  assert.ok(lift > .3 && lift < 1.1, `the hill hex lifts Gala’s side by ${lift.toFixed(2)} m`);
  // When Gala is registered here (after the merge), the real ground holds to it too.
  if (REGION_TERRAIN.Gala) {
    let real = 0;
    for (const edge of FRONTIER_EDGES.filter(e => e.with === 'Gala')) for (let t = .05; t < 1; t += .1) {
      const x = edge.a.x + (edge.b.x - edge.a.x) * t, z = edge.a.z + (edge.b.z - edge.a.z) * t;
      const ours = hexCentre(...edge.ours), theirs = hexCentre(...edge.theirs), n = Math.hypot(ours.x - theirs.x, ours.z - theirs.z);
      real = Math.max(real, Math.abs(groundWithRiver(x + (ours.x - theirs.x) / n, z + (ours.z - theirs.z) / n) - groundWithRiver(x - (ours.x - theirs.x) / n, z - (ours.z - theirs.z) / n)));
    }
    assert.ok(real < .6, `the ground steps ${real.toFixed(2)} m across the border with Gala built`);
  }
});

test('the neck is low, and the peninsula rises out of it to a plateau and two rounded hills', () => {
  const neck = hexCentre(-8, 121);
  assert.equal(frontierWeight(neck.x, neck.z), 0, 'the neck is the hex blend’s');
  let plateau = 0, n = 0;
  for (const cell of cells) if (frontierWeight(cell.x, cell.z) === 1 && cell.terrain === 'grassland' && landDistance(cell.x, cell.z) > 45 && !HILLS.some(h => Math.hypot(h.x - cell.x, h.z - cell.z) < h.radius * 1.2)) { plateau += world.heightAt(cell.x, cell.z); n++; }
  plateau /= n;
  assert.ok(plateau > 9 && plateau < 16, `the plateau stands at ${plateau.toFixed(1)} m`);
  assert.ok(Math.abs(REGION_TERRAIN[SOUTH].base - plateau) < 3, 'Southern Ascarth’s profile says what its ground is');
  for (const h of HILLS) {
    const top = world.heightAt(h.x, h.z);
    assert.ok(top > 30 && top < 45, `${h.id} tops out at ${top.toFixed(1)} m: a hill, not the East Lotharn`);
    assert.equal(hexOwnerAt(h.x, h.z), NORTH);
    assert.equal(cells.find(cell => cell.q === h.hex[0] && cell.r === h.hex[1]).terrain, 'hills', `${h.id} stands on an atlas hill hex`);
    assert.ok(frontierDistance(h.x, h.z) - h.radius * .5 > FRONTIER.clear, `${h.id}'s summit and upper slopes are clear of the hundred metres`);
    // Rounded: from the summit outward the ground falls, and nowhere on the dome is it a cliff.
    for (let a = 0; a < 12; a++) {
      let last = top;
      for (let r = 10; r < h.radius * .8; r += 10) {
        const x = h.x + Math.cos(a / 12 * Math.PI * 2) * r, z = h.z + Math.sin(a / 12 * Math.PI * 2) * r;
        if (landDistance(x, z) < 10) break;
        const here = world.heightAt(x, z);
        // A knob of rock may stand out of the dome; nothing climbs like a second summit.
        assert.ok(here < last + 2.5, `${h.id} climbs ${(here - last).toFixed(1)} m going down it at ${x.toFixed(0)}, ${z.toFixed(0)}`);
        last = here;
      }
    }
  }
  let steepest = 0;
  for (const h of HILLS) for (let x = h.x - h.radius; x <= h.x + h.radius; x += 3) for (let z = h.z - h.radius; z <= h.z + h.radius; z += 3) {
    if (landDistance(x, z) < 8) continue;
    steepest = Math.max(steepest, Math.hypot(groundWithRiver(x + 1, z) - groundWithRiver(x - 1, z), groundWithRiver(x, z + 1) - groundWithRiver(x, z - 1)) / 2);
  }
  assert.ok(steepest < .8, `the steepest ground on the hills is ${steepest.toFixed(2)}`);
});

test('cliffs on the west and round the tip, and sheltered bays with beaches on the east and north', () => {
  const tally = { west: [0, 0], east: [0, 0], tip: [0, 0] };
  for (let x = -1700; x <= -500; x += 3) for (let z = 1150; z <= 2400; z += 3) {
    const d = landDistance(x, z);
    if (d < 3.4 || d > 4.2 || !isAscarth(regionAt(x, z)?.name) || frontierWeight(x, z) < 1 || bayWeight(x, z) > 0) continue;
    const s = spineAt(x, z), side = s.along > SPINE_LENGTH - 60 ? 'tip' : s.across < -40 ? 'west' : s.across > 40 ? 'east' : null;
    if (!side) continue;
    tally[side][0]++; if (world.heightAt(x, z) > 8) tally[side][1]++;
  }
  assert.ok(tally.west[0] > 80 && tally.west[1] / tally.west[0] > .95, `four metres from the water the west is ${tally.west[1]} of ${tally.west[0]} cliff`);
  assert.ok(tally.tip[0] > 20 && tally.tip[1] / tally.tip[0] > .85, `and the tip ${tally.tip[1]} of ${tally.tip[0]}`);
  assert.ok(tally.east[1] / tally.east[0] < .2, 'the east is low ground: its headlands are cliffed, and lower');
  // Four bays, all on the east and north, each an indentation of the atlas's own: a sea hex with
  // three of the peninsula's hexes round it. Their shores are beaches.
  assert.equal(BAYS.length, 4);
  for (const bay of BAYS) {
    const round = AXIAL.filter(([dq, dr]) => isAscarth(ATLAS_OWNERS.get(`${bay.hex[0] + dq},${bay.hex[1] + dr}`))).length;
    assert.equal(round, 3, `${bay.name} is not an indentation`);
    assert.ok(spineAt(bay.x, bay.z).across > 0, `${bay.name} is on the east`);
    let shore = 0;
    for (let a = 0; a < 72; a++) for (let r = 0; r < bay.r * .5; r += 2) {
      const x = bay.x + Math.cos(a / 72 * Math.PI * 2) * r, z = bay.z + Math.sin(a / 72 * Math.PI * 2) * r, d = landDistance(x, z);
      if (d < 3.4 || d > 4.2) continue;
      assert.ok(world.heightAt(x, z) < 2.5, `${bay.name} is cliffed at ${x.toFixed(0)}, ${z.toFixed(0)}`);
      shore++;
    }
    assert.ok(shore > 0, `${bay.name} has no shore`);
    assert.ok(canStand(bay.shore.x, bay.shore.z, world, .5), `${bay.name}’s beach can be stood on`);
  }
  assert.ok(cliffShare(BAYS[0].x, BAYS[0].z) === 0, 'no cliff in a bay');
  // And the west's own notches are coves in the cliff with no beach: there is no anchorage there.
  assert.ok(world.ascarthMetrics.cliffRocks > 300, 'fallen rock at the foot of the faces');
});

test('the wood is on the hills and nowhere else, pine on the tops, and the grass carries scrub, stone and the odd olive', () => {
  const m = world.ascarthMetrics;
  for (const key of ['rocks', 'scrub', 'tufts', 'trees', 'oaks', 'pines', 'olives']) assert.ok(m[key] > 60, `no ${key}`);
  const trees = world.colliders.filter(c => c.kind === 'ascarth-tree');
  assert.equal(trees.length, m.trees);
  let onHills = 0;
  for (const tree of trees) {
    assert.ok(isAscarth(hexOwnerAt(tree.x, tree.z)), 'a tree off the peninsula');
    assert.ok(landDistance(tree.x, tree.z) > 7, 'a tree on the shore');
    const hex = hexAt(tree.x, tree.z), hill = HILL_HEXES.some(([q, r]) => q === hex.q && r === hex.r);
    const dome = HILLS.some(h => Math.hypot(h.x - tree.x, h.z - tree.z) < h.radius * 1.2);
    if (hill || dome) onHills++;
  }
  // Everything that is not on a hill is a wild olive, standing alone.
  assert.equal(trees.length - onHills <= m.olives, true, `${trees.length - onHills} trees off the hills against ${m.olives} olives`);
  assert.ok(onHills > 600, `${onHills} trees in the interior hills’ wood`);
  // The green stone: on the south hill, and nothing dug.
  assert.ok(m.greenStone >= 10);
  assert.equal(hexOwnerAt(GREEN_STONE.x, GREEN_STONE.z), NORTH);
  assert.ok(Math.hypot(GREEN_STONE.x - HILLS[1].x, GREEN_STONE.z - HILLS[1].z) < HILLS[1].radius * .6, 'on the south hill’s upper flank');
});

test('nothing that belongs to anybody: no building, no road, no person, and the chart says what is built', () => {
  const kinds = new Set(world.colliders.filter(c => isAscarth(hexOwnerAt(c.x, c.z))).map(c => c.kind));
  for (const kind of kinds) assert.ok(['ascarth-tree', 'ridge-rock', 'west-deep-water'].includes(kind), `a ${kind} on the peninsula`);
  for (const path of world.paths ?? []) for (const p of path) assert.ok(!isAscarth(hexOwnerAt(p.x, p.z)), 'a road on the peninsula');
  for (const [id, stand] of Object.entries(world.npcPositions)) assert.ok(!isAscarth(hexOwnerAt(stand.x, stand.z)), `${id} stands on the peninsula`);
  for (const region of [north, south]) {
    assert.deepEqual(region.npcIds, []);
    assert.equal(hexOwnerAt(region.spawn.x, region.spawn.z), region.name);
    assert.ok(canStand(region.spawn.x, region.spawn.z, world, .5), `${region.name}’s travel button puts the traveler on ground`);
    for (const id of region.landmarks) {
      const place = ASCARTH_LANDMARKS.find(entry => entry.id === id);
      assert.ok(place, `${id} is not a place`);
      assert.equal(regionAt(place.x, place.z).name, region.name, `${id} is not in ${region.name}`);
      assert.ok(landDistance(place.x, place.z) > 3, `${id} is in the water`);
      assert.ok(place.description.length > 60);
    }
    const status = regionBuildStatus(region.name);
    assert.equal(status.state, 'early'); assert.equal(status.playable, true);
    assert.match(status.work, /Everybody/);
    // The chart's named ground: two to four areas each, inside its own country.
    const areas = SUBREGIONS.filter(area => area.region === region.name);
    assert.ok(areas.length >= 2 && areas.length <= 4, `${region.name} has ${areas.length} charted areas`);
    for (const area of areas) {
      assert.equal(regionAt(area.x, area.z).name, region.name, area.id);
      assert.ok(insideRegion(region.name, area.x, area.z), area.id);
      assert.ok(area.radius >= 18 && area.radius <= 130, area.id);
      let owned = 0, samples = 0;
      for (let a = 0; a < 24; a++) for (let r = 1; r <= 4; r++) {
        samples++; if (insideRegion(region.name, area.x + Math.cos(a / 24 * Math.PI * 2) * area.radius * r / 4, area.z + Math.sin(a / 24 * Math.PI * 2) * area.radius * r / 4)) owned++;
      }
      assert.ok(owned / samples > .6, `${area.id} is only ${Math.round(owned / samples * 100)}% inside ${region.name}`);
    }
    // The Avites' speech, carried as an accent of Mittoli until the lore gives it a family.
    assert.deepEqual({ ...REGION_LANGUAGE[region.name] }, { language: 'mittoli', dialect: 'avite' });
    // One travel button each, on its own authored hexes.
    const stop = DEV_WORLD_DESTINATIONS.find(destination => destination.regionId === region.name);
    assert.ok(stop, `${region.name} has no travel button`);
    const atlasCentre = hexCentre(stop.atlas.q, stop.atlas.r);
    assert.equal(hexOwnerAt(atlasCentre.x, atlasCentre.z), region.name);
  }
  assert.equal(DIALECTS.avite.language, 'mittoli');
});

test('the wildlife stands where its kind would, and the sea-plunger goes into the sea and comes up again', () => {
  const species = new Set(ASCARTH_WILDLIFE_ZONES.map(zone => zone.species));
  for (const kind of ['red-deer', 'boar', 'upland-hare', 'gull', 'dolphin', 'sea-plunger', 'plateau-hawk', 'harrier']) assert.ok(species.has(kind), `no ${kind}`);
  for (const kind of ['hill-sheep', 'longhorn', 'nethrani-cattle']) assert.ok(!species.has(kind), 'domestic stock is somebody’s');
  for (const zone of ASCARTH_WILDLIFE_ZONES) {
    assert.ok(isAscarth(zone.region));
    assert.ok(zone.note.length > 60, `${zone.id} does not say why it is here`);
    if (!zone.air && !zone.sea) assert.ok(Math.hypot(zone.maxX - zone.minX, zone.maxZ - zone.minZ) / 2 < 130, `${zone.id}'s range is wider than it is run from`);
    for (const [x, z] of zone.sites) {
      assert.ok(x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ, `${zone.id}'s home is outside its range`);
      if (zone.sea) { assert.ok(landDistance(x, z) < -20, `${zone.id} is not at sea`); continue; }
      if (zone.plunge) {
        // Every point of its circle is over deep water, so every dive lands in the sea.
        for (let a = 0; a < 36; a++) assert.ok(landDistance(x + Math.sin(a / 36 * Math.PI * 2) * zone.circle, z + Math.cos(a / 36 * Math.PI * 2) * zone.circle) < -10, `${zone.id} would dive onto land`);
        continue;
      }
      if (zone.air) { assert.equal(regionAt(x, z).name, zone.region); continue; }
      assert.ok(canStand(x, z, world, zone.radius), `${zone.id} stands on nothing at ${x}, ${z}`);
      assert.equal(hexOwnerAt(x, z), zone.region, `${zone.id} is off its own country at ${x}, ${z}`);
      assert.ok(!world.colliders.some(c => Math.hypot(c.x - x, c.z - z) < 2.5), `${zone.id} is in a trunk or a stone at ${x}, ${z}`);
    }
  }
  // Gulls on the cliff tops, a few metres back from the edge.
  for (const zone of ASCARTH_WILDLIFE_ZONES.filter(z => z.species === 'gull')) for (const [x, z] of zone.sites) {
    const d = landDistance(x, z);
    assert.ok(d > 4 && d < 10 && world.heightAt(x, z) > 9, `${zone.id} is not on a cliff top at ${x}, ${z}`);
    assert.ok(cliffShare(x, z) > .9);
  }
  // Deer and boar at the edge of the wood; hares out on the grass.
  const trees = world.colliders.filter(c => c.kind === 'ascarth-tree');
  const woodWithin = (x, z, r) => trees.some(t => Math.hypot(t.x - x, t.z - z) < r);
  for (const id of ['interior-hills-deer', 'interior-hills-boar']) {
    const zone = ASCARTH_WILDLIFE_ZONES.find(z => z.id === id);
    assert.ok(zone.sites.every(([x, z]) => woodWithin(x, z, 45)), `${id} is not at a wood’s edge`);
  }
  // The plunger: soaring, then folded and falling to the water, under it, and back up again.
  const zone = ASCARTH_WILDLIFE_ZONES.find(z => z.species === 'sea-plunger');
  const life = createWestLife(new THREE.Scene(), world, { zones: [zone] });
  const seen = new Set();
  let lowest = Infinity, highest = -Infinity;
  const viewer = { x: zone.sites[0][0] - 60, z: zone.sites[0][1] };
  for (let i = 0; i < 40 * 30; i++) {
    life.update(1 / 30, viewer, true);
    for (const bird of life.state().creatures) {
      seen.add(bird.action);
      assert.ok(Number.isFinite(bird.x) && Number.isFinite(bird.y) && Number.isFinite(bird.z));
      if (!bird.hidden) { lowest = Math.min(lowest, bird.y); highest = Math.max(highest, bird.y); }
      if (bird.action === 'under') assert.ok(bird.hidden, 'under the water it is not drawn');
      if (bird.action !== 'soar') assert.ok(landDistance(bird.x, bird.z) < -10, 'it went into the sea and not onto the land');
    }
  }
  for (const action of ['soar', 'plunge', 'under', 'climb']) assert.ok(seen.has(action), `never saw it ${action}`);
  assert.ok(lowest < SEA_LEVEL + .4, `it only came down to ${lowest.toFixed(2)} m`);
  assert.ok(highest > SEA_LEVEL + 18, `and only went up to ${highest.toFixed(1)} m`);
  life.dispose();
});
