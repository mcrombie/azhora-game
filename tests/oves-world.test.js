import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { sourceModule } from './module-loader.js';
import * as THREE from '../vendor/three.module.js';
import { canStand, canSwim } from '../src/gameplay/movement/game-state.js';
import { PLAYABLE_REGIONS, REGION_BIOMES } from '../src/world/terrain/region-layout.js';
import { RIVER_EDGES } from '../src/world/terrain/region-rivers.js';
import {
  REGION_CELLS, REGION_IDS, REGION_TERRAIN, hexAt, hexCentre, hexOwnerAt, regionAt, regions, insideRegion, terrainMix,
} from '../src/world/terrain/region-world.js';
import {
  LIZEEM, NETH, OVETH_UPPER, OVES_BORDER_STREAM, OVES_RIVERS, OVETH_REACH, GALA_DESERT_STREAM, GALA_RIVERS,
  WEST_RIVERS, WEST_REGION_NAMES, courseDistance, nearestWestRiver, inWestWater,
} from '../src/content/regions/western-regions/west-regions.js';
import { WEST_PROFILES, westGroundAt, westNaturalGround, westWaterSurface } from '../src/content/regions/western-regions/west-ground.js';
import { groundWithRiver, bedrockHeight } from '../src/world/terrain/world-terrain.js';
import {
  OVES_CLIMATE, OVESOS_CLIMATE, OVES_DESERT_CLIMATE, OVES_KOPPEN, OVES_SEAM, OVES_GALA_EDGES, OVES_GALA_LINE,
  OVES_SORTEN, OVES_BASIN, OVES_RIM, OVES_STONE, OVES_CHANNELS, OVES_DAMP, OVES_LANDMARKS, OVETH_WALL,
  galaSeamDistance, ovesSorten, ovesBasin, ovesRim, ovesStone, ovesChannelCut, ovesGround, ovesLie,
  onSorten, onChannelFloor, channelPlace, dampReach, desertShare, ovesosShare,
  OVESOS_BELT, OVESOS_BOX, OVES_GROUND, OVES_PLAINS_GROUND, OVESOS_GRASSLAND_GROUND, ovesosBelt, ovesTint,
} from '../src/content/regions/oves/oves-world.js';
import { OVES_WILDLIFE_ZONES } from '../src/content/regions/oves/oves-wildlife.js';
import { OVESOS_BUILDINGS, OVESOS_CAMP, OVESOS_FARM_LANDMARKS, OVESOS_PEOPLE_IDS, ovesosFarmReserved } from '../src/content/regions/oves/ovesos-farm.js';
import { DEFAULT_SKY, regionSky } from '../src/world/environment/region-sky.js';
import { SUBREGIONS } from '../src/ui/map/map-fog.js';
import { BUILD_STATES, regionBuildStatus } from '../src/dev/tools/build-status.js';
import { regionLevel } from '../src/world/terrain/region-levels.js';
import { REGION_LANGUAGE, DIALECTS } from '../src/gameplay/skills/languages.js';
import { DEV_WORLD_DESTINATIONS } from '../src/dev/tools/developer-atlas.js';

/**
 * Ovesos and the Oves Desert, built as terrain, climate, water, scenery and wildlife and nothing that
 * belongs to anybody (docs/oves-brief.md, 28 September 2026).
 *
 * The standing rule is the user's: the atlas wins over the lore. So most of what is asserted below is
 * the atlas's own arithmetic — nineteen hexes and twenty-three, eight `grassland` and three `hills`,
 * thirteen shared edges of which seven are the Oveth — and the two things this job had to get right
 * that nobody else could check: **one climate over both countries**, so the difference between them is
 * terrain and water and not weather, and **the Oveth's hand-over to the reach Gala already built**.
 *
 * **The user's ruling of 5 October 2026** (built 6 October 2026) supersedes the 21 September one that
 * Ovesos was green only along the Oveth: it is fertile along the river and dries toward the desert in
 * the south and west, the least productive of the four farm countries of the Lizeem but real farm
 * country. The atlas is untouched — `BSh` on every hex — so the green is distance from the Lizeem and
 * the Neth (`ovesosBelt`), and the Water Council's village of Velsorten stands on it with its canal
 * (src/content/regions/oves/ovesos-farm.js, tests/ovesos-farm.test.js). The tests below that pinned the old look — no tree
 * away from the Oveth, no stock, nobody living here — now state the new rule instead.
 */
const { createWorld } = await sourceModule('../src/world.js');
const { WEST_LIFE_ZONES, createWestLife, LIFE_REACH } = await sourceModule('../src/content/regions/western-regions/west-regions-life.js');
const scene = new THREE.Scene();
const world = createWorld(scene);
const ovesos = regions.find(region => region.name === 'Ovesos');
const desert = regions.find(region => region.name === 'Oves Desert');
const CELLS = { Ovesos: REGION_CELLS.Ovesos, 'Oves Desert': REGION_CELLS['Oves Desert'] };
const WWMAP = new URL('../../world-builder/map/resources/examples/azhora.wwmap', import.meta.url);
const ATLAS = JSON.parse(readFileSync(new URL('../assets/azhora-dev-regions.json', import.meta.url), 'utf8'));
/** The whole atlas remains the authority for neighbour ownership as more regions become playable. */
const OWNER = (() => {
  const owners = new Map();
  for (const region of ATLAS.regions) for (const cell of region.cells) owners.set(`${cell.q},${cell.r}`, region.name ?? region.id);
  return owners;
})();
const AXIAL = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const ownerAt = (x, z) => { const h = hexAt(x, z); return OWNER.get(`${h.q},${h.r}`) ?? 'sea'; };
const mean = list => list.reduce((sum, value) => sum + value, 0) / list.length;
// A newly registered neighbour can retain the old outland height profile while
// its own heightfield is built separately. Its blend weight then has a region
// name instead of `outland`, although the inherited boundary relief is identical.
// Test the profile rather than treating registration as a cure for short-wave ribs.
const retainedOutlandProfiles = Object.keys(REGION_TERRAIN).filter(name =>
  ['base', 'amp', 'wave'].every(field => REGION_TERRAIN[name][field] === REGION_TERRAIN.outland[field]));
const retainedOutlandShare = (x, z) => {
  const weights = terrainMix(x, z).weights;
  return retainedOutlandProfiles.reduce((sum, name) => sum + (weights[name] ?? 0), 0);
};
const edgeKey = (a, b) => `${a}|${b}`;
const WET_EDGES = new Set(RIVER_EDGES.flatMap(edge => [edgeKey(edge.a, edge.b), edgeKey(edge.b, edge.a)]));

test('Ovesos is 25 and the Oves Desert 26, appended in that order, with the atlas’s own hexes', () => {
  assert.equal(REGION_IDS.Ovesos, 25);
  assert.equal(REGION_IDS['Oves Desert'], 26);
  assert.equal(REGION_IDS['Southern Ascarth'], 24, 'both go after the Ascarths');
  // Appended, never inserted: `world-regions.js` walks this list with one seeded stream.
  const order = PLAYABLE_REGIONS;
  assert.ok(order.indexOf('Ovesos') > order.indexOf('Southern Ascarth'));
  assert.equal(order.indexOf('Oves Desert'), order.indexOf('Ovesos') + 1);
  // The Oves Desert was the last name in this list until the West Lotharn Mountains were appended
  // after it (27, 29 September 2026). What the line is about is that nothing was *inserted*:
  // everything that follows these two carries a higher id than either of them.
  assert.ok(order.slice(order.indexOf('Oves Desert') + 1).every(name => REGION_IDS[name] > 26),
    'a region was inserted before the Oves Desert rather than appended after it');
  const tally = name => { const out = {}; for (const cell of CELLS[name]) out[cell.terrain] = (out[cell.terrain] ?? 0) + 1; return out; };
  assert.deepEqual(tally('Ovesos'), { grassland: 8, plains: 11 });
  assert.deepEqual(tally('Oves Desert'), { plains: 20, hills: 3 });
  // Ovesos's grassland is exactly its northern two rows; the desert's hills are the north-western rim.
  assert.deepEqual([...new Set(CELLS.Ovesos.filter(c => c.terrain === 'grassland').map(c => c.r))].sort(), [112, 113]);
  assert.deepEqual(CELLS['Oves Desert'].filter(c => c.terrain === 'hills').map(c => `${c.q},${c.r}`), ['-14,114', '-15,115', '-16,116']);
  for (const name of ['Ovesos', 'Oves Desert']) assert.equal(REGION_BIOMES[name].ownScatter, true);
  assert.equal(new Set(PLAYABLE_REGIONS.map(name => REGION_BIOMES[name].id)).size, PLAYABLE_REGIONS.length);
  // Their neighbours by shared hex edge, off the whole atlas.
  const neighbours = name => {
    const out = {};
    for (const cell of CELLS[name]) for (const [dq, dr] of AXIAL) {
      const other = OWNER.get(`${cell.q + dq},${cell.r + dr}`) ?? 'sea';
      if (other !== name) out[other] = (out[other] ?? 0) + 1;
    }
    return out;
  };
  assert.deepEqual(neighbours('Ovesos'), { 'Oves Desert': 13, Caricas: 7, Nesdor: 7, Nethereum: 5, Gala: 3, 'Nether Desert': 1 });
  assert.deepEqual(neighbours('Oves Desert'), { Ovesos: 13, Telemonia: 12, 'Nether Desert': 8, 'East Pyros': 5, Gala: 2 });
});

test('one climate over both countries: `BSh` on all forty-two hexes, held to the World Builder map', () => {
  assert.equal(Object.keys(OVESOS_CLIMATE).length, 19);
  assert.equal(Object.keys(OVES_DESERT_CLIMATE).length, 23);
  assert.equal(new Set(Object.values(OVES_CLIMATE)).size, 1, 'there is no climate line between them');
  assert.deepEqual([...new Set(Object.values(OVES_CLIMATE))], [OVES_KOPPEN]);
  for (const name of ['Ovesos', 'Oves Desert']) for (const cell of CELLS[name])
    assert.equal(OVES_CLIMATE[`${cell.q},${cell.r}`], 'BSh', `(${cell.q},${cell.r}) has no climate`);
  if (existsSync(WWMAP)) {
    const map = JSON.parse(readFileSync(WWMAP, 'utf8').replace(/^﻿/, ''));
    for (const [table, name] of [[OVESOS_CLIMATE, 'Ovesos'], [OVES_DESERT_CLIMATE, 'Oves Desert']])
      for (const [key, code] of Object.entries(table)) {
        assert.equal(map.hexes[key]?.climate, code, `${key} is ${map.hexes[key]?.climate} on the map`);
        assert.equal(map.hexes[key]?.region, name);
      }
  }
  // So the whole difference between the two is terrain and water: two profiles each, and the wave is
  // Gala's 320 on every one of them (which is also the cure for the outland ribs — see below).
  const profiles = [REGION_TERRAIN.Ovesos, REGION_TERRAIN.Ovesos.byTerrain.grassland,
    REGION_TERRAIN['Oves Desert'], REGION_TERRAIN['Oves Desert'].byTerrain.hills];
  for (const profile of profiles) assert.equal(profile.wave, OVES_SEAM.wave, 'every profile here is on Gala’s wavelength');
  assert.ok(REGION_TERRAIN.Ovesos.byTerrain.grassland.base > REGION_TERRAIN.Ovesos.base + 4, 'the grass stands above the river');
  assert.ok(REGION_TERRAIN['Oves Desert'].byTerrain.hills.base > REGION_TERRAIN['Oves Desert'].base + 8, 'the rim stands above the wedge');
});

test('the seam with Gala: five edges, nothing shaped within a hundred metres of it, and the levels meet', () => {
  // The five edges, read off the atlas and not off the list: three of Ovesos's and two of the desert's.
  const shared = [];
  for (const name of ['Ovesos', 'Oves Desert']) for (const cell of CELLS[name]) for (const [dq, dr] of AXIAL)
    if (OWNER.get(`${cell.q + dq},${cell.r + dr}`) === 'Gala') shared.push(`${cell.q},${cell.r}|${cell.q + dq},${cell.r + dr}`);
  assert.equal(shared.length, 5);
  assert.deepEqual(new Set(shared), new Set(OVES_GALA_EDGES.map(([q, r, nq, nr]) => `${q},${r}|${nq},${nr}`)));
  assert.equal(OVES_GALA_LINE.length, 5);
  // Every one of the five carries a river: there is no dry way from either country into Gala, which
  // is why Gala's builder put a ford at the head of its own reach.
  for (const key of shared) assert.ok(WET_EDGES.has(key.replace('|', '|')), `${key} has no river on it`);

  // Nothing this build shapes reaches the border, and nothing is written inside Gala's hexes, but for
  // the Oveth's own channel: the atlas draws the river **on** the Ovesos|Gala line, so its cut is in
  // both countries by definition, exactly as the Lizeem's is in tests/gala-world.test.js.
  let near = 0;
  for (let x = -1950; x <= -1650; x += 4) for (let z = 850; z <= 1100; z += 4) {
    if (galaSeamDistance(x, z) >= OVES_SEAM.keep) continue;
    near++;
    assert.equal(ovesGround(x, z), 0, `a landform reaches the seam at ${x}, ${z}`);
    // Every watercourse in reach cuts its own channel here, and a channel on a border is cut in both
    // countries by definition; the Lizeem's and the Oveth's are older than either name.
    if (nearestWestRiver(x, z, 140).distance < 110) continue;
    assert.ok(Math.abs(groundWithRiver(x, z) - bedrockHeight(x, z)) < 1e-9,
      `something is shaped at ${x}, ${z}, ${galaSeamDistance(x, z).toFixed(0)} m from the seam`);
  }
  assert.ok(near > 1200, `${near} points checked`);
  // **The levels meet.** On the border line itself the comparison would be meaningless — all five
  // edges carry a river, and a river on a border cuts its channel in both countries — so the two
  // sides are compared at their **hex centres**, a hundred metres apart across each shared edge,
  // which is the furthest either country's own ground gets from the water and is what "these two
  // countries meet Gala within a metre or two" actually means.
  let worst = 0;
  assert.equal(OVES_GALA_EDGES.length, 5);
  for (const [q, r, nq, nr] of OVES_GALA_EDGES) {
    const mine = hexCentre(q, r), theirs = hexCentre(nq, nr);
    assert.ok(['Ovesos', 'Oves Desert'].includes(hexOwnerAt(mine.x, mine.z)));
    assert.equal(hexOwnerAt(theirs.x, theirs.z), 'Gala');
    const step = Math.abs(westGroundAt(mine.x, mine.z) - westGroundAt(theirs.x, theirs.z));
    worst = Math.max(worst, step);
    assert.ok(step < 2.6, `(${q},${r}) stands ${step.toFixed(1)} m off Gala's (${nq},${nr})`);
  }
  assert.ok(worst > 0, 'the five edges were not compared at all');
  // Velsorten's pads (the ruling of 5 October 2026) keep 160 m from the seam, so nothing built there is Gala's business.
  for (const b of OVESOS_BUILDINGS) for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
    assert.ok(galaSeamDistance(b.x + sx * b.w / 2, b.z + sz * b.d / 2) >= 160, `${b.id} stands within 160 m of Gala`);
});

test('the upper Oveth is the atlas’s own line, waded above the Sorten and deep through it, and it hands Gala one river', () => {
  assert.ok(WEST_RIVERS.includes(OVETH_UPPER) && WEST_RIVERS.includes(OVES_BORDER_STREAM));
  assert.equal(OVES_RIVERS.length, 2);
  // Both of them are on the atlas's own edges, with one of these two countries on each bank.
  const sides = (course, from, to) => {
    const found = new Set();
    for (const sample of WEST_PROFILES.get(course.id)) {
      if (sample.along < from || sample.along > to) continue;
      found.add([ownerAt(sample.x + sample.nx * 12, sample.z + sample.nz * 12), ownerAt(sample.x - sample.nx * 12, sample.z - sample.nz * 12)].sort().join('|'));
    }
    return found;
  };
  for (const pair of sides(OVETH_UPPER, .08, .92)) assert.equal(pair, 'Oves Desert|Ovesos');
  for (const pair of sides(OVES_BORDER_STREAM, .08, .92)) assert.equal(pair, 'Oves Desert|Telemonia');
  // Water goes downhill, and nothing floats above its own bank.
  for (const course of OVES_RIVERS) {
    const profile = WEST_PROFILES.get(course.id);
    for (let i = 1; i < profile.length; i++) assert.ok(profile[i].surface < profile[i - 1].surface, `${course.id} climbs at ${i}`);
    for (const sample of profile) {
      const surface = westWaterSurface(sample.x, sample.z);
      if (surface === null) continue;
      assert.ok(westGroundAt(sample.x, sample.z) <= surface + .01, `${course.id} floats at ${sample.x.toFixed(0)}, ${sample.z.toFixed(0)}`);
    }
  }
  // The ford is the upper third, above the Sorten — the atlas draws the first two edges `small` — and
  // everything through the Sorten is "navigable for light boats" and walled.
  const oveth = WEST_PROFILES.get(OVETH_UPPER.id);
  assert.equal(OVETH_UPPER.fordUntil, .33);
  assert.equal(OVETH_WALL.from, OVETH_UPPER.fordUntil);
  const walls = world.colliders.filter(collider => collider.kind === 'west-deep-water');
  const deep = sample => !sample.ford && sample.along <= OVETH_WALL.to;
  for (const sample of oveth) {
    const blocked = walls.some(collider => Math.hypot(collider.x - sample.x, collider.z - sample.z) < collider.r);
    assert.equal(blocked, deep(sample), `the Oveth is ${deep(sample) ? 'open where it should be walled' : 'walled where it should be open'} at ${sample.index}`);
  }
  // And the wall stops above the corner, so that Gala's ford at the head of its own reach is not
  // walled by this one: the first sample of `OVETH_REACH` has to be walkable water.
  const join = WEST_PROFILES.get(OVETH_REACH.id)[0];
  assert.ok(!walls.some(c => Math.hypot(c.x - join.x, c.z - join.z) < c.r), 'this build walls Gala\u2019s ford');
  let waded = 0;
  const firstDeep = oveth.find(sample => !sample.ford);
  for (const sample of oveth) {
    if (!sample.ford || Math.hypot(sample.x - firstDeep.x, sample.z - firstDeep.z) <= 7) continue;
    assert.ok(canStand(sample.x, sample.z, world, .34), `the ford is not walkable at ${sample.index}`);
    waded++;
  }
  assert.ok(waded >= 8, `${waded} samples of ford`);

  // **The hand-over.** Gala built the lower Oveth and left this builder one number: the upper reach
  // must end at or above 5.38 m at (-1800, 953) (docs/gala-report.md), because Gala's reach starts
  // there and a river cannot step up in the middle of itself.
  const mouth = oveth.at(-1);
  assert.ok(Math.hypot(mouth.x - -1800, mouth.z - 953) < 6, `the Oveth ends at ${mouth.x.toFixed(0)}, ${mouth.z.toFixed(0)}`);
  assert.ok(mouth.surface >= 5.38, `the upper Oveth ends at ${mouth.surface.toFixed(2)} m, below what Gala was promised`);
  const head = WEST_PROFILES.get(OVETH_REACH.id)[0];
  assert.ok(mouth.surface >= head.surface - .01, `the Oveth steps up ${(head.surface - mouth.surface).toFixed(2)} m into Gala's reach`);
  assert.ok(mouth.surface - head.surface < 1.2, `and it falls ${(mouth.surface - head.surface).toFixed(2)} m at the corner, which is a waterfall`);
  // The desert's southern border stream hands Gala's reach of itself the same way, from above.
  const streamEnd = WEST_PROFILES.get(OVES_BORDER_STREAM.id).at(-1);
  const galaStart = WEST_PROFILES.get(GALA_DESERT_STREAM.id)[0];
  assert.ok(Math.hypot(streamEnd.x - galaStart.x, streamEnd.z - galaStart.z) < 12, 'the two reaches meet');
  assert.ok(streamEnd.surface >= galaStart.surface - .02, `the border stream steps up ${(galaStart.surface - streamEnd.surface).toFixed(2)} m`);
  assert.ok(streamEnd.surface - galaStart.surface < .6, `and it drops ${(streamEnd.surface - galaStart.surface).toFixed(2)} m at the join`);
  // It is waded for the whole of its length: the desert's only two edges with Gala are Gala's reach of
  // it, and a deep border stream would have walled the desert out of the only country it can reach.
  assert.ok(WEST_PROFILES.get(OVES_BORDER_STREAM.id).every(sample => sample.ford));
  // Registering these two countries did not take the Lizeem's wall down or turn the Neth round.
  for (const course of [LIZEEM, NETH]) {
    const profile = WEST_PROFILES.get(course.id);
    for (let i = 1; i < profile.length; i++) assert.ok(profile[i].surface < profile[i - 1].surface, `${course.id} climbs at ${i}`);
  }
  assert.ok(WEST_REGION_NAMES.includes('Ovesos') && WEST_REGION_NAMES.includes('Oves Desert'));
});

test('Ovesos is a tilt to one river, and the Sorten is a bench on the Ovesian bank only', () => {
  const rows = terrain => CELLS.Ovesos.filter(cell => cell.terrain === terrain);
  const ground = list => mean(list.map(cell => westGroundAt(cell.x, cell.z)));
  assert.ok(ground(rows('grassland')) > ground(rows('plains')) + 3,
    `the grass rows ${ground(rows('grassland')).toFixed(1)} against the plains ${ground(rows('plains')).toFixed(1)}`);
  // **The Sorten.** The bench is measured along the whole course rather than across one sample's
  // normal, because the atlas's Oveth zig-zags from hex edge to hex edge and a single normal crosses
  // the river's own bends. Ovesos lies on one side of the course's stored normal for every sample of
  // this reach, which the module reads off the survey once (`OVESOS_SIDE`) rather than assuming.
  const samples = WEST_PROFILES.get(OVETH_UPPER.id);
  const side = (() => {
    const s = samples[Math.round(samples.length / 2)];
    return hexOwnerAt(s.x + s.nx * 45, s.z + s.nz * 45) === 'Ovesos' ? 1 : -1;
  })();
  let benched = 0, ovesian = 0, onDesertBank = 0, middling = 0;
  for (const s of samples) {
    for (const out of [45, 70]) {
      const x = s.x + s.nx * out * side, z = s.z + s.nz * out * side;
      if (hexOwnerAt(x, z) !== 'Ovesos') continue;
      ovesian++;
      if (ovesSorten(x, z) > OVES_SORTEN.depth * .55) benched++;
      if (s.along > OVES_SORTEN.from + .12 && s.along < OVES_SORTEN.to - .12) middling++;
    }
    // Nothing at all on the desert's bank: a depositing river leaves its bench on one side.
    for (const out of [20, 45, 70, 110, 150]) {
      const x = s.x - s.nx * out * side, z = s.z - s.nz * out * side;
      if (hexOwnerAt(x, z) === 'Oves Desert' && ovesSorten(x, z) > .02) onDesertBank++;
    }
  }
  assert.ok(ovesian > 40, `${ovesian} points of Ovesian bank sampled`);
  assert.ok(benched >= middling * .5 && benched > 20, `${benched} of ${middling} middle-reach points are benched`);
  assert.equal(onDesertBank, 0, 'the bench reaches the desert’s bank');
  // Neither end of the river is benched: the head is where it is still small, and the mouth is Gala's.
  for (const along of [0, .04, .08, .96, 1]) {
    const s = samples[Math.min(samples.length - 1, Math.round((samples.length - 1) * along))];
    for (const out of [45, 70, 110]) assert.ok(ovesSorten(s.x + s.nx * out * side, s.z + s.nz * out * side) < .25,
      `the bench reaches ${along} along the Oveth`);
  }
  // The bench is a floodplain and not a bank: it lies above the water it belongs to, and it slopes
  // gently. It is also lower than the ten metres nearest the water, which is the levee a depositing
  // river builds for itself — the lore's "the Oveth slows, widens, and deposits what it has carried".
  const mid = samples[Math.round(samples.length * (OVES_SORTEN.from + OVES_SORTEN.to) / 2)];
  const floor = { x: mid.x + mid.nx * 45 * side, z: mid.z + mid.nz * 45 * side };
  assert.equal(hexOwnerAt(floor.x, floor.z), 'Ovesos');
  assert.ok(onSorten(floor.x, floor.z), 'the middle of the reach has no bench');
  assert.ok(westGroundAt(floor.x, floor.z) > mid.surface, 'the Sorten’s floor is under its own river');
  let steepest = 0;
  for (let out = 20; out <= 155; out += 5) {
    const a = { x: mid.x + mid.nx * out * side, z: mid.z + mid.nz * out * side };
    const b = { x: mid.x + mid.nx * (out + 5) * side, z: mid.z + mid.nz * (out + 5) * side };
    steepest = Math.max(steepest, Math.abs(ovesSorten(b.x, b.z) - ovesSorten(a.x, a.z)) / 5);
  }
  // The bench's own depth changes fastest not at its edges but where the river bends and the nearest
  // sample — and so `lengthwise` — changes under the traverse; 1 in 5 on a one-metre feature is not a
  // bank. What the *ground* does is measured over both countries in the ribs test below.
  assert.ok(steepest < .2, `the bench’s own edge climbs 1 in ${(1 / steepest).toFixed(0)}`);
});

test('the Oves Desert is a wedge falling to its eastern point, with three hills on the rim and broken stone between', () => {
  // The basin falls the length of the country, west to east, and the fall is the landform and not the level.
  const at = (x, z) => westGroundAt(x, z);
  assert.ok(ovesBasin(-2400, 900) > ovesBasin(-2100, 900) + 3, 'the wedge does not fall');
  assert.ok(ovesBasin(-1880, 975) < 2, 'and it is nothing at the point where three countries meet');
  const westEnd = mean(CELLS['Oves Desert'].filter(c => c.q <= -15 && c.terrain === 'plains').map(c => at(c.x, c.z)));
  const eastEnd = mean(CELLS['Oves Desert'].filter(c => c.q >= -11).map(c => at(c.x, c.z)));
  assert.ok(westEnd > eastEnd + 5, `the wedge runs ${westEnd.toFixed(1)} m in the west to ${eastEnd.toFixed(1)} in the east`);
  // The three hills stand well over the ground at their feet, and a traveler walks up any of them.
  for (const crest of OVES_RIM.crests) {
    const top = at(crest.x, crest.z);
    const foot = mean([0, 1, 2, 3].map(i => { const a = i / 4 * Math.PI * 2 + .3; return at(crest.x + Math.sin(a) * (crest.radius + 30), crest.z + Math.cos(a) * (crest.radius + 30)); }));
    assert.ok(top > foot + 14, `${crest.id} stands only ${(top - foot).toFixed(1)} m over its own foot`);
    assert.ok(top - foot < 30, `${crest.id} stands ${(top - foot).toFixed(1)} m over its foot, which is not "low by continental standards"`);
    // Measure the desert's own flanks away from the retained legacy boundary
    // profile. East Pyros and Nether Desert are now built, but intentionally
    // preserve that profile so registration does not change existing rivers.
    let steepest = 0, measured = 0;
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2;
      for (let d = 6; d < crest.radius; d += 4) {
        const x = crest.x + Math.sin(a) * d, z = crest.z + Math.cos(a) * d;
        if (hexOwnerAt(x, z) !== 'Oves Desert' || retainedOutlandShare(x, z) > 0) continue;
        measured++;
        steepest = Math.max(steepest, Math.abs(at(x + 2, z) - at(x - 2, z)) / 4, Math.abs(at(x, z + 2) - at(x, z - 2)) / 4);
      }
    }
    assert.ok(measured > 50, `${crest.id}: too little of the actual flank was checked`);
    assert.ok(steepest < .5, `${crest.id} has a face of 1 in ${(1 / steepest).toFixed(1)} on its own ground`);
  }
  // The rim is the atlas's three `hills` hexes and nowhere else.
  for (const crest of OVES_RIM.crests) assert.equal(CELLS['Oves Desert'].find(cell => hexCentre(cell.q, cell.r) && Math.hypot(cell.x - crest.x, cell.z - crest.z) < 30)?.terrain, 'hills', crest.id);
  // The stone field is the desert's own and stops with it: nothing of it in Ovesos or Gala.
  let inside = 0;
  for (const cell of CELLS['Oves Desert']) if (Math.abs(ovesStone(cell.x, cell.z)) > .2) inside++;
  assert.ok(inside > 12, `the stone field reaches ${inside} of the desert’s hexes`);
  for (const cell of [...CELLS.Ovesos, ...REGION_CELLS.Gala]) assert.ok(Math.abs(ovesStone(cell.x, cell.z)) < .35,
    `the desert’s stone reaches ${hexOwnerAt(cell.x, cell.z)} at ${cell.x}, ${cell.z}`);
  assert.ok(OVES_STONE.waveA < 80 && OVES_STONE.waveB < 80, 'worn rock is not a three-hundred-metre sine wave');
  // `ovesLie` reads the same field back, and it is half off the desert, which is neither.
  assert.equal(ovesLie(-1700, 400), .5);
  const lies = CELLS['Oves Desert'].map(cell => ovesLie(cell.x, cell.z));
  assert.ok(Math.min(...lies) < .35 && Math.max(...lies) > .65, 'the desert has both exposures and pockets');
});

test('four channels with no water in any of them, and each stops short of the river', () => {
  assert.equal(OVES_CHANNELS.length, 4);
  assert.equal(OVES_CHANNELS.filter(ch => ch.region === 'Oves Desert').length, 3);
  for (const ch of OVES_CHANNELS) {
    // Every point of every channel is on its own country's hexes.
    for (const p of ch.points) assert.equal(hexOwnerAt(p.x, p.z), ch.region, `${ch.id} leaves ${ch.region} at ${p.x}, ${p.z}`);
    // It is cut, it is dry, and a traveler walks down it.
    const middle = ch.points[Math.floor(ch.points.length / 2)];
    assert.ok(ovesChannelCut(middle.x, middle.z) > ch.depth * .8, `${ch.id} is only ${ovesChannelCut(middle.x, middle.z).toFixed(2)} m deep in the middle`);
    assert.equal(westWaterSurface(middle.x, middle.z), null, `${ch.id} has water in it`);
    assert.ok(onChannelFloor(middle.x, middle.z));
    assert.ok(canStand(middle.x, middle.z, world, .5), `${ch.id} cannot be walked down`);
    // The floor lies below the ground beside it.
    const place = channelPlace(ch, middle.x, middle.z);
    assert.ok(place && place.distance < 2);
    // Nothing keeps a mouth open that only runs after rain: every channel stops clear of the Oveth.
    for (const p of ch.points) assert.ok(courseDistance(OVETH_UPPER, p.x, p.z, 200) > 30, `${ch.id} joins the Oveth at ${p.x}, ${p.z}`);
  }
  // Nothing grows on a channel floor.
  for (const collider of world.colliders.filter(c => c.kind === 'oves-tree' || c.kind === 'oves-scrub')) {
    if (dampReach(collider.x, collider.z) > .2) continue;   // the damp reach is the lore's own exception
    assert.ok(!onChannelFloor(collider.x, collider.z), `something grows on a channel floor at ${collider.x.toFixed(0)}, ${collider.z.toFixed(0)}`);
  }
  // The damp reach: green, and still dry.
  const ch = OVES_CHANNELS.find(c => c.id === OVES_DAMP.channel);
  let damp = 0;
  for (let i = 1; i < ch.points.length; i++) for (let t = 0; t < 1; t += .05) {
    const a = ch.points[i - 1], b = ch.points[i];
    if (dampReach(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t) > .6) damp++;
  }
  assert.ok(damp >= 8, `the damp reach is only ${damp} samples of its own channel`);
  assert.ok(world.ovesMetrics.tamarisk > 0, 'nothing grows in the damp reach');
});

test('the shared long-wave relief stays smooth across Ovesos, the Oves Desert and Gala', () => {
  // Gala reported short steep "ribs" along x ≈ -1900: `relief()` takes its phase from x / wave, the
  // hex blend mixes the wavelengths, and where Gala's 320 m relief blended into `outland`'s 150 the
  // blended wavelength changed across the margin and the relief chirped into ribs up to ten metres
  // deep with slopes past fifty degrees. Every profile in these two countries is on 320, so that
  // margin is gone. Neighbours that retain the old short-wave boundary profile
  // remain outside this assertion even after their region names are registered.
  const slopeAt = (x, z) => Math.max(Math.abs(westGroundAt(x + 2, z) - westGroundAt(x - 2, z)) / 4,
    Math.abs(westGroundAt(x, z + 2) - westGroundAt(x, z - 2)) / 4);
  const scan = (x0, x1, z0, z1, owners) => {
    let steepest = 0, where = null, counted = 0, over5 = 0;
    for (let x = x0; x <= x1; x += 4) for (let z = z0; z <= z1; z += 4) {
      if (!owners.includes(hexOwnerAt(x, z))) continue;
      if (retainedOutlandShare(x, z) > 0) continue;
      counted++;
      const slope = slopeAt(x, z);
      if (slope > .2) over5++;
      if (slope > steepest) { steepest = slope; where = [x, z]; }
    }
    return { steepest, where, counted, over5 };
  };
  // **Round x = -1900**, the corner where Ovesos, the Oves Desert and Gala meet, on ground whose
  // blend has no `outland` in it at all: the three countries' own ground and nothing else.
  const built = scan(-1990, -1780, 620, 1010, ['Ovesos', 'Oves Desert', 'Gala']);
  assert.ok(built.counted > 3000, `${built.counted} points of all-built ground checked`);
  assert.ok(built.steepest < .75, `1 in ${(1 / built.steepest).toFixed(2)} at ${built.where}: that is a rib`);
  assert.ok(built.over5 < built.counted * .12, `${built.over5} of ${built.counted} are over 1 in 5`);
  // The whole Ovesos|Oves Desert seam, which is this job's own and is meant to be invisible.
  const seam = scan(-2300, -1800, 620, 1010, ['Ovesos', 'Oves Desert']);
  assert.ok(seam.counted > 5000 && seam.steepest < .75, `the seam's steepest is 1 in ${(1 / seam.steepest).toFixed(2)} at ${seam.where}`);
  // Do not require an old frontier defect to remain steep: later region work
  // may improve it. Keep the useful whole-country traversal ceiling instead.
  // The two countries' own ground is walkable almost everywhere: the
  // desert is stonier than Ovesos on purpose, and the rim hills are most of what is left.
  for (const [name, limit] of [['Ovesos', .09], ['Oves Desert', .16]]) {
    let n = 0, steep = 0;
    for (const cell of CELLS[name]) for (let dx = -40; dx <= 40; dx += 8) for (let dz = -44; dz <= 44; dz += 8) {
      const x = cell.x + dx, z = cell.z + dz;
      if (hexOwnerAt(x, z) !== name) continue;
      n++;
      if (slopeAt(x, z) > 1 / 3) steep++;
    }
    assert.ok(n > 1500, `${n} points of ${name}`);
    assert.ok(steep < n * limit, `${(steep / n * 100).toFixed(1)}% of ${name} is steeper than 1 in 3`);
  }
});

test('what grows is a steppe greening toward the Lizeem and a stone desert, and nothing wild grows on Velsorten', () => {
  const m = world.ovesMetrics;
  for (const key of ['reeds', 'gravel', 'boulders', 'pavement', 'tufts', 'shrubs', 'scrub', 'stubble', 'trees', 'tamarisk', 'stones', 'beltTrees', 'beltTufts'])
    assert.ok(m[key] > 5, `no ${key}`);
  assert.equal(m.water, OVES_RIVERS.length, 'one unbroken ribbon on each of the two courses');
  assert.ok(m.blockers > 30, 'the Oveth through the Sorten is not walled');
  const planted = world.colliders.filter(c => c.kind === 'oves-tree' || c.kind === 'oves-scrub');
  assert.ok(planted.length > 40, `${planted.length} things with a trunk`);
  for (const c of planted) {
    assert.ok(['Ovesos', 'Oves Desert'].includes(hexOwnerAt(c.x, c.z)), `something of theirs stands outside them at ${c.x.toFixed(0)}, ${c.z.toFixed(0)}`);
    assert.equal(westWaterSurface(c.x, c.z), null, 'something of theirs stands in the water');
    assert.ok(!inWestWater(c.x, c.z), 'something of theirs stands in a watercourse');
    // Since the ruling of 5 October 2026 the Water Council's village stands here; nothing wild grows on its ground.
    assert.ok(!ovesosFarmReserved(c.x, c.z, .5), `a ${c.kind} grows on Velsorten’s ground at ${c.x.toFixed(0)}, ${c.z.toFixed(0)}`);
  }
  // **Trees by the water, and in Ovesos's river belt.** Under `BSh` a tree is a thing that stands by a
  // river. Since the ruling of 5 October 2026 Ovesos is fertile along the Lizeem and the Neth, so a
  // tree may stand anywhere in that belt; the desert's one exception is still the damp reach, and out on
  // the dry south-west of Ovesos, away from every river, there is still no tree at all.
  for (const tree of planted.filter(c => c.kind === 'oves-tree')) {
    const nearWater = OVES_RIVERS.some(course => courseDistance(course, tree.x, tree.z, 60) < course.maxHalf + 16);
    const belt = hexOwnerAt(tree.x, tree.z) === 'Ovesos' ? ovesosBelt(tree.x, tree.z) : 0;
    assert.ok(nearWater || belt > .3 || dampReach(tree.x, tree.z) > .2, `a tree on the dry steppe at ${tree.x.toFixed(0)}, ${tree.z.toFixed(0)}`);
  }
  // The Oveth's gallery is as it was, most of it on the Ovesian bank, because that is where the soil is.
  const gallery = planted.filter(c => c.kind === 'oves-tree' && courseDistance(OVETH_UPPER, c.x, c.z, 60) < 30);
  assert.ok(gallery.length > 15, `${gallery.length} trees on the Oveth`);
  assert.ok(gallery.filter(c => hexOwnerAt(c.x, c.z) === 'Ovesos').length > gallery.length * .5, 'the gallery is not on the bottomland');
  // And the Lizeem has one now: poplar, willow and tamarisk along its Ovesian bank, thickest on the northern
  // reach where the belt is widest, with trees standing apart in the green behind it.
  const lizeemBank = planted.filter(c => c.kind === 'oves-tree' && hexOwnerAt(c.x, c.z) === 'Ovesos' && courseDistance(LIZEEM, c.x, c.z, 60) < 40);
  assert.ok(lizeemBank.length > 25, `${lizeemBank.length} trees on the Lizeem’s bank`);
  assert.ok(lizeemBank.filter(c => c.z < 600).length > 10, 'the northern reach has no gallery');
  assert.ok(planted.some(c => c.kind === 'oves-tree' && courseDistance(LIZEEM, c.x, c.z, 80) > 50 && ovesosBelt(c.x, c.z) > .45), 'no tree stands out in the belt');
  // Every hex of both countries is honest ground a traveler can stand on, and the two ground modules agree.
  for (const name of ['Ovesos', 'Oves Desert']) for (const cell of CELLS[name])
    for (const [dx, dz] of [[0, 0], [25, 10], [-25, -10], [10, -30], [-10, 30]]) {
      const x = cell.x + dx, z = cell.z + dz;
      assert.ok(Number.isFinite(world.heightAt(x, z)));
      if (inWestWater(x, z, 4)) continue;
      assert.ok(Math.abs(groundWithRiver(x, z) - westGroundAt(x, z)) < 1e-9, `west-ground.js and world-terrain.js disagree at ${x}, ${z}`);
    }
});

test('the river belt: Ovesos greens from the Lizeem and the Neth, dries toward the south-west, and its climate does not move', () => {
  // The ruling of 5 October 2026 is distance from water and nothing else: the atlas's code is the same on every hex.
  assert.deepEqual([...new Set(Object.values(OVESOS_CLIMATE))], [OVES_KOPPEN]);
  const inward = (course, index, distance) => {
    const s = WEST_PROFILES.get(course.id)[index];
    for (const side of [1, -1]) if (hexOwnerAt(s.x + s.nx * (s.half + 10) * side, s.z + s.nz * (s.half + 10) * side) === 'Ovesos')
      return { x: s.x + s.nx * distance * side, z: s.z + s.nz * distance * side };
    return null;
  };
  // Full on the Lizeem's bank; narrower in the south, below the Carica's fall, than on the northern reach.
  const north = WEST_PROFILES.get(LIZEEM.id).findIndex(s => s.z < 520 && hexOwnerAt(s.x, s.z + s.half + 10) === 'Ovesos' && s.x > -2000);
  const south = WEST_PROFILES.get(LIZEEM.id).findIndex(s => s.z > 830 && s.z < 860);
  assert.ok(north > 0 && south > 0);
  for (const index of [north, south]) { const bank = inward(LIZEEM, index, 30); assert.equal(ovesosBelt(bank.x, bank.z), 1, 'the bank is not green'); }
  const farNorth = inward(LIZEEM, north, 100), farSouth = inward(LIZEEM, south, 100);
  assert.ok(ovesosBelt(farNorth.x, farNorth.z) > ovesosBelt(farSouth.x, farSouth.z) + .2, 'the belt does not narrow southward');
  assert.ok(OVESOS_BELT.neth.dry < OVESOS_BELT.lizeem.drySouth, 'the Neth is the smaller water');
  // Nothing in the dry south-west, farthest from both rivers, and nothing outside the country.
  assert.equal(ovesosBelt(-2100, 720), 0);
  assert.equal(ovesosBelt(OVESOS_BOX.maxX + 50, 600), 0);
  // The least productive of the four, but farm country: about half of Ovesos is in the belt, and a third is the old steppe.
  let n = 0, green = 0, dry = 0;
  for (let x = -2350; x <= -1600; x += 10) for (let z = 450; z <= 1000; z += 10) {
    if (hexOwnerAt(x, z) !== 'Ovesos' || westWaterSurface(x, z) !== null) continue;
    n++; const belt = ovesosBelt(x, z);
    if (belt > .3) green++; if (belt < .05) dry++;
  }
  assert.ok(n > 1000 && green > n * .35 && green < n * .7, `${green} of ${n} points are green`);
  assert.ok(dry > n * .2, `only ${dry} of ${n} points are the dry steppe`);
  // The colour reaches the ground on both of Ovesos's swatches, greener at the bank, and leaves the dry steppe its own.
  // Compared as authored, in the swatches' own sRGB, which is how the rest of the ground's colours are written.
  const colour = hex => { const n = typeof hex === 'number' ? hex : parseInt(hex.slice(1), 16); return { r: (n >> 16 & 255) / 255, g: (n >> 8 & 255) / 255, b: (n & 255) / 255 }; };
  const greenness = c => c.g - (c.r + c.b) / 2;
  const bank = inward(LIZEEM, north, 30);
  for (const ground of [OVES_PLAINS_GROUND.Ovesos, OVESOS_GRASSLAND_GROUND]) {
    const tinted = ovesTint(bank.x, bank.z, ground);
    assert.ok(tinted !== null && greenness(colour(tinted)) > greenness(colour(ground)) + .02, `the belt does not green ${ground}`);
    assert.equal(ovesTint(-2100, 720, ground), null, `the dry steppe is tinted on ${ground}`);
  }
  assert.ok(greenness(colour(OVES_GROUND.belt)) > greenness(colour(OVES_GROUND.sorten)), 'the river belt is the greenest of Ovesos’s grounds');
  // And the scenery plants it: the belt's own trees and its own grass.
  assert.ok(world.ovesMetrics.beltTrees > 20, `${world.ovesMetrics.beltTrees} trees in the belt`);
  assert.ok(world.ovesMetrics.beltTufts > 200, `${world.ovesMetrics.beltTufts} tufts of the belt’s grass`);
});

test('every animal here stands where its kind would, and any stock grazes by its herders’ camp', () => {
  const species = new Set(OVES_WILDLIFE_ZONES.map(zone => zone.species));
  for (const kind of ['otter', 'duck', 'wading-bird', 'river-fox', 'upland-hare', 'harrier', 'bone-bird', 'plateau-hawk'])
    assert.ok(species.has(kind), `there is no ${kind}`);
  // Domestic stock is somebody's (docs/oves-brief.md). Since the ruling of 5 October 2026 somebody is here: the upland
  // herders keep their camp on the grass (src/content/regions/oves/ovesos-farm.js), so a flock may graze Ovesos near Lahar's camp, and nowhere
  // else and never in the desert. None is drawn yet; the rule stands for when one is.
  for (const zone of OVES_WILDLIFE_ZONES.filter(item => ['longhorn', 'hill-sheep', 'nethrani-cattle'].includes(item.species))) {
    assert.equal(zone.region, 'Ovesos', `${zone.id} is stock in the desert`);
    for (const [x, z] of zone.sites) assert.ok(Math.hypot(x - OVESOS_CAMP.x, z - OVESOS_CAMP.z) < 150, `${zone.id} grazes away from its herders`);
  }
  const byRegion = {};
  for (const zone of OVES_WILDLIFE_ZONES) {
    assert.ok(WEST_LIFE_ZONES.includes(zone), `${zone.id} is not in the west's list`);
    assert.ok(['Ovesos', 'Oves Desert'].includes(zone.region));
    byRegion[zone.region] = (byRegion[zone.region] ?? 0) + 1;
    assert.ok(zone.note.length > 60, `${zone.id} does not say why it is here`);
    if (!zone.air && !zone.sea) assert.ok(Math.hypot(zone.maxX - zone.minX, zone.maxZ - zone.minZ) / 2 < LIFE_REACH, `${zone.id} is wider than it is run from`);
    for (const [x, z] of zone.sites) {
      assert.ok(x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ, `${zone.id}'s home is outside its range`);
      if (zone.air) { assert.equal(hexOwnerAt(x, z), zone.region, `${zone.id} flies over somebody else`); continue; }
      assert.equal(regionAt(x, z)?.name, zone.region, `${zone.id} at ${x}, ${z} is not in ${zone.region}`);
      assert.ok(canStand(x, z, world, zone.radius) || (zone.float && canSwim(x, z, world, zone.radius)), `${zone.id} stands on nothing at ${x}, ${z}`);
      if (zone.float) assert.notEqual(westWaterSurface(x, z), null, `${zone.id} is not on the water at ${x}, ${z}`);
      else assert.equal(westWaterSurface(x, z), null, `${zone.id} stands in the water at ${x}, ${z}`);
    }
  }
  assert.ok(byRegion['Oves Desert'] >= 3, 'the desert has nothing at all in it');
  assert.ok(byRegion.Ovesos >= 6, 'the river has nothing on it');
  const life = createWestLife(new THREE.Scene(), world, { zones: OVES_WILDLIFE_ZONES });
  assert.equal(life.snapshot().creatures.length, OVES_WILDLIFE_ZONES.reduce((sum, zone) => sum + zone.sites.length, 0), 'every one of them found a place');
  const player = { x: -1950, y: 0, z: 800 };
  for (let step = 0; step < 900; step++) life.update(1 / 30, player, true);
  for (const animal of life.snapshot().creatures) {
    const zone = OVES_WILDLIFE_ZONES.find(item => animal.id.startsWith(`${item.id}-`));
    assert.ok(Number.isFinite(animal.x + animal.y + animal.z), `${animal.id} went to NaN`);
    assert.ok(animal.x >= zone.minX - .5 && animal.x <= zone.maxX + .5 && animal.z >= zone.minZ - .5 && animal.z <= zone.maxZ + .5, `${animal.id} left its range`);
  }
  // The raft floats: the ducks sit on the Oveth's water and not on its bed.
  let afloat = 0;
  for (const duck of life.snapshot().creatures.filter(animal => animal.species === 'duck')) {
    const water = westWaterSurface(duck.x, duck.z);
    if (water === null) continue;
    afloat++;
    assert.ok(Math.abs(duck.groundY - (water - .04)) < .06, `${duck.id} sits ${(duck.groundY - water).toFixed(2)} m off its water`);
  }
  assert.ok(afloat >= 3, `only ${afloat} ducks are on the water`);
  life.dispose();
});

test('nothing here can be walked down, and the quick ones cannot be run down either', () => {
  // The laws tests/west-life.test.js holds for the whole west, applied to these two countries' own
  // ranges: the west's own run stops at the first range that fails it, which is not one of these.
  const WALK = 4.2, RUN = 7.2, HZ = 60;
  const FLIES = new Set(['duck', 'wading-bird']);
  for (const zone of OVES_WILDLIFE_ZONES.filter(item => !item.air && !item.sea)) for (const [pace, seconds] of [[WALK, 30], [RUN, 25]]) {
    const life = createWestLife(new THREE.Scene(), world, { zones: [zone] });
    const band = () => life.state().creatures;
    const first = band()[0];
    const player = { x: first.x + 40, z: first.z };
    let closest = Infinity, flew = false, dived = false, offFooting = 0;
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
      // "Within reach" means on the ground and in sight: a bird that has taken off is over the water
      // within a wingbeat, and an otter under the water is not there at all. That is the rule
      // tests/west-life.test.js holds the whole west to, and it is the one law this country needed
      // that none of Gala's ranges asked for, because Gala has no otter.
      if (!now.hidden && now.lift < 1) closest = Math.min(closest, Math.hypot(now.x - player.x, now.z - player.z));
      if (now.action === 'fly') flew = true;
      if (now.action === 'dive' || now.hidden) dived = true;
    }
    // **The fox is the west's own exception** and its law is different in both directions: it never
    // flees, it drifts back to keep about two metres from a walker, and **a flat run does gain on
    // it** — which tests/west-life.test.js asserts of the Carica's foxes in so many words. So a
    // walker is held to two metres here and a runner is expected to close, which is the whole point
    // of the one animal in either country that will look at a traveler instead of leaving.
    const fox = zone.species === 'river-fox';
    const arm = fox ? 2 : pace === WALK ? 3 : 1.5;
    if (fox && pace === RUN) assert.ok(closest < 2, `${zone.id}: a flat run does not gain on the fox (${closest.toFixed(2)} m)`);
    else assert.ok(closest >= arm, `${zone.id}: somebody ${pace === WALK ? 'walking' : 'running'} got within ${closest.toFixed(2)} m`);
    assert.equal(offFooting, 0, `${zone.id}: an animal stood somewhere it cannot stand`);
    if (pace === RUN && FLIES.has(zone.species)) assert.ok(flew, `${zone.id}: a bird that is run at takes to the air`);
    // The otter's own answer, and the reason it is on this river and nowhere else in either country.
    if (zone.species === 'otter') assert.ok(dived, `${zone.id}: an otter did not take to the water`);
    life.dispose();
  }
});

test('two skies for one climate, one tongue the lore names and none for the desert', () => {
  for (const region of [ovesos, desert]) {
    const sky = regionSky(region);
    assert.notDeepEqual({ ...sky }, { ...DEFAULT_SKY }, `${region.name} has the old sky`);
    assert.ok(Number.isInteger(region.palette.sky) && Number.isInteger(region.palette.haze));
    assert.equal(typeof region.palette.fog, 'string', 'palette.fog is the chart legend’s colour');
  }
  const gala = regionSky(regions.find(region => region.name === 'Gala'));
  // The steppe air is Gala's own — its northern rows are this same country with another name on it —
  // and the desert's is the clearest in the game, because the one thing a rain shadow has is distance.
  assert.ok(Math.abs(regionSky(ovesos).density - gala.density) < .0012, 'Ovesos is the same air as Gala’s north');
  assert.ok(regionSky(desert).density < regionSky(ovesos).density, 'a desert is a long way to see');
  const luma = hex => ((hex >> 16) & 255) * .3 + ((hex >> 8) & 255) * .6 + (hex & 255) * .1;
  assert.ok(luma(regionSky(desert).fog) > luma(regionSky(ovesos).fog), 'and its haze is dustier');
  // "Inner-branch Mittoli. A variant of Standard Mittoli fully intelligible to any downstream
  // speaker", says ovesos.md; the desert's lore gives it no speech of its own at all.
  assert.deepEqual({ ...REGION_LANGUAGE.Ovesos }, { language: 'mittoli', dialect: 'ovesos' });
  assert.equal(DIALECTS.ovesos.name, 'Inner-branch Mittoli');
  assert.deepEqual({ ...REGION_LANGUAGE['Oves Desert'] }, { language: 'mittoli', dialect: 'ovesos' });
});

test('both are charted, levelled and listed; Ovesos is lived in by Velsorten’s people and the desert by nobody', () => {
  for (const region of [ovesos, desert]) {
    // Since the ruling of 5 October 2026 Ovesos is farm country with the Water Council's village on it
    // (src/content/regions/oves/ovesos-farm.js): whoever its record lists is one of Velsorten's eight. The desert is still nobody's.
    if (region === desert) assert.deepEqual([...region.npcIds], [], 'terrain, climate, water, scenery and wildlife only');
    else for (const id of region.npcIds) assert.ok(OVESOS_PEOPLE_IDS.includes(id), `${id} is not one of Velsorten’s people`);
    assert.equal(hexOwnerAt(region.spawn.x, region.spawn.z), region.name);
    assert.ok(canStand(region.spawn.x, region.spawn.z, world, .5), `the travel button puts the traveler in ${region.name}'s water`);
    for (const id of region.landmarks) {
      const place = [...OVES_LANDMARKS, ...OVESOS_FARM_LANDMARKS].find(item => item.id === id);
      assert.ok(place, `${id} is not a place`);
      assert.ok(world.landmarks.some(landmark => landmark.id === id), `the chart knows ${id}`);
      assert.equal(regionAt(place.x, place.z)?.name, region.name, `${id} stands outside ${region.name}`);
      assert.ok(place.description.length > 60);
    }
    const areas = SUBREGIONS.filter(area => area.region === region.name);
    assert.ok(areas.length >= 2 && areas.length <= 5, `${areas.length} named areas in ${region.name}`);
    for (const area of areas) {
      assert.equal(regionAt(area.x, area.z).name, region.name, area.id);
      assert.ok(insideRegion(region.name, area.x, area.z));
      assert.ok(area.radius >= 18 && area.radius <= 130);
    }
    const status = regionBuildStatus(region.name);
    assert.ok(BUILD_STATES[status.state], `${region.name} has no build state`);
    assert.equal(status.playable, true);
    if (region === desert) { assert.equal(status.state, 'early'); assert.match(status.work, /Everybody|somebody/); }
    else assert.ok(status.work.length > 40, 'what Ovesos still lacks is not said');
  }
  for (const [id, stand] of Object.entries(world.npcPositions ?? {})) {
    const owner = hexOwnerAt(stand.x, stand.z);
    assert.notEqual(owner, 'Oves Desert', `${id} stands in the desert`);
    if (owner === 'Ovesos') assert.ok(OVESOS_PEOPLE_IDS.includes(id), `${id} stands in Ovesos and is not one of Velsorten’s people`);
  }
  assert.equal(regionLevel('Ovesos'), 3, 'on the approved ladder');
  assert.equal(regionLevel('Oves Desert'), 4, 'on the approved ladder');
  for (const [name, id, target] of [['Ovesos', 25, 'ovesos'], ['Oves Desert', 26, 'oves-desert']]) {
    const destination = DEV_WORLD_DESTINATIONS.find(item => item.regionId === name);
    assert.ok(destination && destination.region === id && destination.travelTarget === target, `${name} has no travel stop`);
  }
  // Nothing is coined: there is no Ovesi or Oves naming profile, so every name is the lore's own word
  // or plain English.
  for (const place of OVES_LANDMARKS) assert.match(place.name, /^The /);
  assert.ok(OVES_LANDMARKS.some(place => place.name === 'The Sorten'), 'the lore’s own word for the bottomland');
});
