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
  LIZEEM, ISAREOS_RIVER, NETH, NETH_HEAD, NETHEREUM_OUTLET, NETHEREUM_STREAMS, NETHEREUM_HOLLOW,
  ISAMOUTH_GROUND, WEST_REGION_LANDMARKS, WEST_RIVERS, courseDistance, coursePosition, westBareGround,
} from '../src/west-regions.js';
import {
  WEST_PROFILES, westGroundAt, westWaterSurface, nethereumHollow, nethereumWet,
} from '../src/west-ground.js';
import { DEFAULT_SKY, regionSky } from '../src/region-sky.js';
import { groundWithRiver } from '../src/world-terrain.js';
import { SUBREGIONS } from '../src/map-fog.js';
import { regionBuildStatus } from '../src/build-status.js';
import { regionLevel, levelWords } from '../src/region-levels.js';
import { REGION_LANGUAGE, LANGUAGES, DIALECTS } from '../src/languages.js';
import { CHAMELEON_SPOTS } from '../src/chameleon.js';

/**
 * Nethereum: the third of the six south-western countries, and the one the atlas took a whole
 * country away from.
 *
 * Its lore is a lake — the Nethermere, the flood, the weirs, the reed-grain, the fishery. The
 * atlas gives it **twenty-six `grassland` hexes and one `plains`**, in a map that has a `lake`
 * terrain and uses it twenty-eight times and a `wetland` terrain and uses it twenty-eight
 * times, and puts neither of them here. The user's ruling of 2026-09-21 settled it: the flood
 * is a shallow spring sheet over the basin's grass, gone by midsummer, and the game has no
 * seasons to bring it. So what is built is the dry state — the dish, and the pasture the water
 * leaves — and the first three tests below are that refusal, because it is the thing a later
 * builder would be most tempted to put back.
 */
const { createWorld } = await sourceModule('../src/world.js');
const { WEST_LIFE_ZONES, createWestLife, LIFE_REACH } = await sourceModule('../src/west-regions-life.js');
const scene = new THREE.Scene();
const world = createWorld(scene);
const cells = REGION_CELLS.Nethereum;
const meadow = cells.filter(cell => cell.terrain === 'grassland');
const corner = cells.filter(cell => cell.terrain === 'plains');
const samples = cells.flatMap(cell => [[0, 0], [30, 0], [-30, 0], [0, 30], [0, -30], [34, 34], [-34, -34]]
  .map(([dx, dz]) => ({ x: cell.x + dx, z: cell.z + dz })));
const AXIAL = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const ATLAS_OWNERS = (() => {
  const atlas = JSON.parse(readFileSync(new URL('../assets/azhora-dev-regions.json', import.meta.url), 'utf8'));
  const owners = new Map();
  for (const region of atlas.regions) for (const cell of region.cells) owners.set(`${cell.q},${cell.r}`, region.name ?? region.id);
  return owners;
})();

test('Nethereum is a registered region, appended last, and the atlas gives it no lake and no marsh', () => {
  assert.ok(PLAYABLE_REGIONS.includes('Nethereum'));
  assert.equal(PLAYABLE_REGIONS.at(-1), 'Nethereum', 'appended, so nothing already built is re-seeded by the biome loop');
  assert.equal(REGION_IDS.Nethereum, 17, 'Isareos took 16 first');
  assert.equal(REGION_BIOMES.Nethereum.ownScatter, true, 'it draws its own meadow');
  assert.equal(cells.length, 27, 'the atlas authors twenty-seven Nethereum hexes');
  assert.equal(new Set(PLAYABLE_REGIONS.map(name => REGION_BIOMES[name].id)).size, PLAYABLE_REGIONS.length);
  assert.equal(meadow.length, 26, 'twenty-six grassland hexes');
  assert.equal(corner.length, 1, 'and one of plains, the north-western corner');
  assert.deepEqual([...new Set(cells.map(cell => cell.terrain))].sort(), ['grassland', 'plains']);
  /**
   * **The refusal itself, counted off the dev export and not off the survey.** The survey is
   * a window round the playable world and carries no `wetland` hex at all — the twenty-five in
   * the Acor Wetlands are a continent away — so counting the vocabulary there would have said
   * the map cannot draw a marsh, which is the opposite of the truth and is exactly the way a
   * fixture lies. `assets/azhora-dev-regions.json` has all 131 regions.
   */
  const atlas = JSON.parse(readFileSync(new URL('../assets/azhora-dev-regions.json', import.meta.url), 'utf8'));
  const terrains = new Map();
  for (const region of atlas.regions) for (const cell of region.cells)
    terrains.set(cell.terrain, (terrains.get(cell.terrain) ?? 0) + 1);
  assert.equal(terrains.get('lake'), 15, 'the dev export draws fifteen lake hexes');
  assert.equal(terrains.get('wetland'), 28, 'and twenty-eight of wetland');
  assert.equal(cells.some(cell => cell.terrain === 'lake' || cell.terrain === 'wetland'), false,
    'and spends neither of them on Nethereum: there is no Nethermere and no marsh round it');
  /**
   * **Nethereum is landlocked on the atlas, and not quite landlocked in the game.** Every hex
   * the atlas draws beside it is claimed land; but three hexes at its south-western corner are
   * claimed by nobody, and `LAND_HEXES` is built from claimed cells, so the coast field reads
   * that hole as sea. It is one of four such holes in the survey window — thirteen hexes in
   * all, every one of them ringed entirely by grassland, forest, plains or hills, and the
   * largest of them an eight-hex bay between Drent, Pueth, Elagos and Amod. **Filling them is
   * a change to four built countries' coastlines and is the coordinator's to make, not this
   * country's**; what is asserted here is only what is true today.
   */
  const land = new Set(LAND_HEXES.map(([q, r]) => `${q},${r}`));
  let unclaimed = 0;
  for (const cell of cells) for (const [dq, dr] of AXIAL) {
    const key = `${cell.q + dq},${cell.r + dr}`;
    if (!ATLAS_OWNERS.has(key) && !land.has(key)) unclaimed++;
  }
  assert.equal(unclaimed, 4, 'the same three unclaimed hexes, counted from the two Nethereum cells that touch them');
  for (const [q, r] of [[-17, 110], [-17, 111], [-18, 111]])
    assert.equal(ATLAS_OWNERS.has(`${q},${r}`), false, `(${q}, ${r}) has been claimed: this hole is filled and the note above is stale`);
});

test('the Köppen field says Cfa over the whole of it, and the sky says what that is like here', () => {
  const map = new URL('../../world-builder/map/resources/examples/azhora.wwmap', import.meta.url);
  if (existsSync(map)) {
    const atlas = JSON.parse(readFileSync(map, 'utf8').replace(/^﻿/, ''));
    const counts = {};
    for (const cell of cells) {
      const climate = atlas.hexes[`${cell.q},${cell.r}`]?.climate ?? '(none)';
      counts[climate] = 1 + (counts[climate] ?? 0);
    }
    assert.deepEqual(counts, { Cfa: 27 }, 'humid subtropical over every hex: rain all year, no dry month');
  }
  // The second country in the game with a sky of its own, and it asks for the opposite of the
  // first. The lore's one observation that survived the loss of the lake was never about the
  // lake: "The sky over Nethereum is often overcast. The light has a quality that travelers
  // describe as muffled." That is a sky call and not a ground call.
  const here = regions.find(region => region.name === 'Nethereum');
  const sky = regionSky(here);
  assert.notDeepEqual({ ...sky }, { ...DEFAULT_SKY });
  assert.equal(sky.background, here.palette.sky);
  assert.equal(sky.fog, here.palette.haze);
  assert.ok(sky.density > DEFAULT_SKY.density, 'a damp basin under cloud does not see as far as the lake country');
  const eer = regionSky(regions.find(region => region.name === 'Eer'));
  assert.ok(sky.density > eer.density, 'and nothing like as far as a dry Mediterranean coast');
  /**
   * And not so close that the country disappears. `FogExp2` leaves exp(-(d·density)²) of the
   * light, which at .0071 is 45% at a hundred and twenty-five metres and 3% at two hundred and
   * sixty — so the hollow reads across its short axis and does not read along its long one,
   * and `south-nethereum` is taken across it for exactly that reason. A hundred and twenty-five
   * metres is the distance that view is taken from.
   */
  const survives = d => Math.exp(-((d * sky.density) ** 2));
  assert.ok(survives(NETHEREUM_HOLLOW.rz * .95) > .35,
    `only ${(100 * survives(NETHEREUM_HOLLOW.rz * .95)).toFixed(0)}% of the light survives the fall the view is taken across`);
  assert.ok(sky.density < DEFAULT_SKY.density * 1.25, 'muffled, not blind');
  // `palette.fog` is the chart legend's colour and stays the CSS string it has always been.
  assert.equal(typeof here.palette.fog, 'string');
});

test('the hollow is a dish and not a bank, and it does not reach a river anybody has built', () => {
  const H = NETHEREUM_HOLLOW;
  // **The brief's own numbers, measured on the ground that was built.** "A wide shallow hollow
  // at the middle of the region, about 600 m across, floor at 13 m against a rim at 21, with
  // the fall spread over two hundred metres so that nothing about it is a bank."
  assert.equal(H.rx * 2, 600, 'six hundred metres on its long axis');
  assert.ok(H.depth > 7 && H.depth < 8);
  const floor = westGroundAt(H.x, H.z), rim = westGroundAt(H.x + H.rx * 1.02, H.z);
  assert.ok(floor > 12 && floor < 15, `the floor is at ${floor.toFixed(1)} m`);
  assert.ok(rim > 19 && rim < 23, `the rim is at ${rim.toFixed(1)} m`);
  /**
   * **Nothing about it is a bank**, measured on the landform itself rather than on the ground.
   * The ground is the hollow *plus* the region's relief plus the blend into whatever is over
   * each border, and the southern border is an unbuilt neighbour at `outland`'s amplitude of
   * six, which swings four metres in twelve on its own and is nothing to do with the dish.
   * What the brief promises is the dish: "the fall spread over two hundred metres so that
   * nothing about it is a bank".
   */
  let worst = 0, worstAxis = null;
  for (const [axis, along] of [['long', [1, 0]], ['short', [0, 1]]]) {
    let steep = 0;
    for (let t = -1.05; t <= 1.05; t += .005) {
      const x = H.x + along[0] * H.rx * t, z = H.z + along[1] * H.rz * t;
      const step = 2;
      steep = Math.max(steep, Math.abs(nethereumHollow(x, z) - nethereumHollow(x + along[0] * step, z + along[1] * step)) / step);
    }
    if (steep > worst) { worst = steep; worstAxis = axis; }
  }
  assert.ok(worst < .15, `the fall reaches one in ${(1 / worst).toFixed(0)} on its ${worstAxis} axis`);
  // The long axis is the one the brief's two hundred metres is about, and it is gentler still.
  let longAxis = 0;
  for (let t = -1.05; t <= 1.05; t += .005) {
    const x = H.x + H.rx * t;
    longAxis = Math.max(longAxis, Math.abs(nethereumHollow(x, H.z) - nethereumHollow(x + 2, H.z)) / 2);
  }
  assert.ok(longAxis < .07, `one in ${(1 / longAxis).toFixed(0)} along the six hundred metres`);
  // It is a landform of the `caricasShelf` shape: gated by its region's box, weighed by its
  // region's blend, and nought outside. A point in the next country gets none of it.
  assert.equal(nethereumHollow(-1500, 400), 0, 'it does not reach Nesdor');
  assert.equal(nethereumHollow(-2545, -400), 0, 'nor anywhere north of the country');
  assert.ok(nethereumWet(H.x, H.z) > .95 && nethereumWet(H.x + H.rx, H.z) === 0);
  /**
   * **And it is nought on both of the rivers that were built before it**, which is the whole
   * reason `NETHEREUM_HOLLOW.clear` exists. The Isa and the Lizeem read `baseBeforeWater` at
   * their own samples to work out their water surfaces; a dish that reached either of them
   * would lower its bed, move its water, and re-seed every draw on both of its banks in a
   * country somebody else has finished.
   */
  for (const course of [ISAREOS_RIVER, LIZEEM]) for (const sample of WEST_PROFILES.get(course.id))
    assert.ok(nethereumHollow(sample.x, sample.z) < 1e-12,
      `the hollow is ${nethereumHollow(sample.x, sample.z)} m deep on ${course.id} at (${sample.x.toFixed(0)}, ${sample.z.toFixed(0)})`);
});

test('the Neth is waded in its upper third, and that ford is the only way out of this country to the south', () => {
  /**
   * The arithmetic `tests/eer-world.test.js` states and this country acts on: every one of the
   * five Nethereum-Ovesos hex edges is the Neth and not one of them is dry, so a Neth built as
   * a wall would make the unbuilt Nether Desert the only land bridge out of here.
   */
  const wet = new Set();
  for (const edge of RIVER_EDGES) { wet.add(`${edge.a}|${edge.b}`); wet.add(`${edge.b}|${edge.a}`); }
  let shared = 0, dry = 0;
  for (const [key, name] of ATLAS_OWNERS) {
    if (name !== 'Nethereum') continue;
    const [q, r] = key.split(',').map(Number);
    for (const [dq, dr] of AXIAL) {
      if (ATLAS_OWNERS.get(`${q + dq},${r + dr}`) !== 'Ovesos') continue;
      shared++;
      if (!wet.has(`${[q, r]}|${[q + dq, r + dr]}`)) dry++;
    }
  }
  assert.equal(shared, 5);
  assert.equal(dry, 0, 'every metre of the Nethereum-Ovesos line is the river');
  // The course itself, on the atlas's own line: off the Nether Desert edge at (-2350, 577) and
  // into the Lizeem at (-2100, 491).
  const head = NETH.points[0], mouth = NETH.points.at(-1);
  assert.ok(Math.abs(head.x - -2350) < 1 && Math.abs(head.z - 577) < 1, `head at (${head.x.toFixed(0)}, ${head.z.toFixed(0)})`);
  assert.ok(Math.abs(mouth.x - -2100) < 1 && Math.abs(mouth.z - 491) < 1, `mouth at (${mouth.x.toFixed(0)}, ${mouth.z.toFixed(0)})`);
  // Both lines come off the same authored corner; each is softened on its own, so the two
  // centre lines meet within a river's width rather than to the metre.
  assert.ok(courseDistance(LIZEEM, mouth.x, mouth.z, 40) < 10,
    `the Neth ends ${courseDistance(LIZEEM, mouth.x, mouth.z, 40).toFixed(1)} m from the Lizeem`);
  assert.ok(NETH.fordUntil > .2 && NETH.fordUntil < .5, 'waded in its upper third, as the Carica and the Isa are');
  /**
   * **The ford is real in both halves of the machinery, and forgetting the second half is a
   * bug the Isa already had.** `fordUntil` says how far a traveler may wade; the deep-water
   * blockers say where they may not. The Neth is in that loop, so it has blockers below the
   * ford and none on it.
   */
  const blockers = world.colliders.filter(collider => collider.kind === 'west-deep-water');
  const blocked = (x, z) => blockers.some(collider => Math.hypot(collider.x - x, collider.z - z) < collider.r);
  const profile = WEST_PROFILES.get(NETH.id);
  const fordable = profile.filter(sample => sample.ford), deep = profile.filter(sample => !sample.ford);
  assert.ok(fordable.length > 10 && deep.length > 30);
  for (const sample of deep) assert.ok(blocked(sample.x, sample.z),
    `the deep Neth can be walked over at (${sample.x.toFixed(0)}, ${sample.z.toFixed(0)})`);
  /**
   * **And somebody can actually get across it, which is the thing the ford is for.** Counting
   * clear samples is not enough: the Neth doubles back on itself at (-2250, 577), so two limbs
   * of it come within a few metres there and a blocker on the deep limb sits beside a sample on
   * the fordable one. What has to be true is that *some* line across the water is open, so this
   * walks the normal at every ford sample, bank to bank, and asks for one that nothing stops.
   */
  const crossings = fordable.filter(sample => {
    for (let out = -(sample.half + 8); out <= sample.half + 8; out += .5)
      if (blocked(sample.x + sample.nx * out, sample.z + sample.nz * out)) return false;
    return true;
  });
  assert.ok(crossings.length > 8, `only ${crossings.length} of ${fordable.length} ford samples can be waded bank to bank`);
  // And the crossings reach past the corner onto the Nethereum-Ovesos line, which is the point
  // of the whole thing: a ford only on the Nether Desert edge joins two countries nobody built.
  const onTheLine = crossings.filter(sample => sample.z < 605 && sample.x > -2340);
  assert.ok(onTheLine.length > 4, `only ${onTheLine.length} of them are on the Ovesos line`);
  // And it is shallow enough to be a ford: the bed is cut by the course's own depth and no more.
  for (const sample of fordable)
    assert.ok(sample.surface - westGroundAt(sample.x, sample.z) <= NETH.bed + .05,
      `the ford is ${(sample.surface - westGroundAt(sample.x, sample.z)).toFixed(2)} m deep`);
});

test('every piece of Nethereum water is the atlas’s or the ground’s, holds water, and never climbs', () => {
  // The Neth's two reaches are one river with no step at the handover: `NETH_HEAD` is the small
  // authored pair of edges above the plateau, `NETH` takes its water level over by naming it.
  assert.equal(NETH.headOf, 'neth-head');
  const handover = WEST_PROFILES.get(NETH_HEAD.id).at(-1).surface - WEST_PROFILES.get(NETH.id)[0].surface;
  assert.ok(Math.abs(handover) < .001, `the Neth steps ${handover.toFixed(3)} m at its own handover`);
  assert.ok(WEST_RIVERS.indexOf(NETH_HEAD) < WEST_RIVERS.indexOf(NETH), 'and the profile it names is built first');
  // The outlet: its last two points are the one watercourse the atlas draws inside Nethereum.
  const stub = NETHEREUM_OUTLET.points.at(-1);
  assert.ok(Math.abs(stub.x - -2350) < 1 && Math.abs(stub.z - 577) < 1, `the outlet ends at (${stub.x.toFixed(0)}, ${stub.z.toFixed(0)})`);
  assert.ok(courseDistance(NETH, stub.x, stub.z, 20) < 2, 'on the Neth’s head, which is where the atlas draws it');
  // And it does not come out below the river it joins, which the first version did by half a metre.
  const mouth = WEST_PROFILES.get(NETHEREUM_OUTLET.id).at(-1);
  const joins = WEST_PROFILES.get(NETH.id)[0].surface;
  assert.ok(mouth.surface >= joins - .01, `the outlet's mouth is ${(joins - mouth.surface).toFixed(2)} m under the Neth`);
  assert.equal(NETHEREUM_STREAMS.length, 3, 'three hill-streams off the rim into the hollow');
  for (const course of [NETH_HEAD, NETH, NETHEREUM_OUTLET, ...NETHEREUM_STREAMS]) {
    const profile = WEST_PROFILES.get(course.id);
    for (let i = 1; i < profile.length; i++)
      assert.ok(profile[i].surface < profile[i - 1].surface, `${course.id} climbs at sample ${i}`);
    // Water the whole way: a river with a hole in it is worse than no river.
    for (const sample of profile) {
      if (sample.strength <= .05) continue;
      assert.notEqual(westWaterSurface(sample.x, sample.z), null,
        `${course.id} has no water at (${sample.x.toFixed(0)}, ${sample.z.toFixed(0)})`);
      assert.ok(westGroundAt(sample.x, sample.z) <= sample.surface + .01, `${course.id} floats at ${sample.x.toFixed(0)}`);
    }
  }
  // The three streams run inside the country, start on ground above the dish and end on its floor.
  for (const stream of NETHEREUM_STREAMS) {
    const profile = WEST_PROFILES.get(stream.id);
    for (const sample of profile)
      assert.equal(hexOwnerAt(sample.x, sample.z), 'Nethereum', `${stream.id} leaves the country at (${sample.x.toFixed(0)}, ${sample.z.toFixed(0)})`);
    assert.ok(nethereumWet(profile[0].x, profile[0].z) < .35, `${stream.id} starts in the hollow rather than above it`);
    assert.ok(nethereumWet(profile.at(-1).x, profile.at(-1).z) > .8, `${stream.id} does not reach the floor`);
    assert.equal(stream.fordUntil, 1, 'a hill-stream is a step across anywhere');
    assert.ok(stream.taper > 0, 'and it spreads and sinks rather than ending in a bank');
  }
});

test('every hex of Nethereum is honest ground, and nobody is sealed in', () => {
  let worst = 0;
  for (const spot of samples) {
    const y = world.heightAt(spot.x, spot.z);
    assert.ok(Number.isFinite(y), `NaN ground at ${spot.x}, ${spot.z}`);
    assert.ok(landDistance(spot.x, spot.z) > 0, `${spot.x}, ${spot.z} is under water in a landlocked country`);
    if (westBareGround(spot.x, spot.z, 4)) continue;
    /**
     * **The shore band is skipped, and the shore is not a shore.** `westGroundAt` is
     * `west-ground.js` over its own natural relief; `groundWithRiver` starts from bedrock with
     * `regionBase`'s coast blend already cut in, and that blend runs out to `landDistance` 40 m.
     * Eer skips it because Eer has a coast. Nethereum has no coast: what it has is the
     * three-hex hole in the atlas at its south-western corner (see the first test), which the
     * coast field reads as sea and which pulls 4.1% of this country's own ground toward a
     * beach — down to 0.93 m at its worst, from a rim at 21. Nothing goes under water and
     * nothing is sealed in, and the two fields agree everywhere past 40 m, measured.
     */
    if (landDistance(spot.x, spot.z) < 45) continue;
    worst = Math.max(worst, Math.abs(groundWithRiver(spot.x, spot.z) - westGroundAt(spot.x, spot.z)));
    const standable = canStand(spot.x, spot.z, world, .5)
      || [0, 1, 2, 3, 4, 5, 6, 7].some(i => canStand(spot.x + Math.sin(i / 8 * Math.PI * 2) * 3.4, spot.z + Math.cos(i / 8 * Math.PI * 2) * 3.4, world, .5));
    assert.ok(standable, `penned in at ${spot.x}, ${spot.z}`);
  }
  assert.ok(worst < 1e-9, `west-ground.js and world-terrain.js disagree by ${worst}`);
  const spawn = regions.find(region => region.name === 'Nethereum').spawn;
  assert.equal(hexOwnerAt(spawn.x, spawn.z), 'Nethereum');
  assert.ok(canStand(spawn.x, spawn.z, world, .5), 'the travel button puts the traveler on ground');
  // Nethereum reaches half a hex further west than Isareos did, and that is all the budget it
  // spends: 36.20 hexes east to west against 35.70, and nothing at all north to south.
  const wide = (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX) / METRES_PER_HEX;
  const tall = (WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ) / METRES_PER_HEX;
  assert.ok(wide > 36 && wide < 37, `the world is ${wide.toFixed(2)} hexes wide`);
  assert.ok(Math.abs(tall - 30.93) < .05, `north to south is still ${tall.toFixed(2)} hexes`);
  assert.ok(Math.abs(Math.min(...cells.map(cell => cell.x)) - -2900) < 1,
    'and the hex that spends it is the one `plains` corner at x = -2900');
});

test('nothing grows in Nethereum but grass, rush and the gallery — and nothing stands on Isamouth', () => {
  const trees = world.colliders.filter(collider => collider.kind === 'nethereum-tree');
  assert.ok(trees.length > 100, 'a gallery on the water');
  // The atlas gives this country no `forest` hex either, so the gallery is the whole of the
  // wood in it and every tree in it stands on water.
  const water = spot => Math.min(courseDistance(ISAREOS_RIVER, spot.x, spot.z, 120), courseDistance(NETH, spot.x, spot.z, 120),
    courseDistance(NETH_HEAD, spot.x, spot.z, 120), courseDistance(NETHEREUM_OUTLET, spot.x, spot.z, 120),
    ...NETHEREUM_STREAMS.map(stream => courseDistance(stream, spot.x, spot.z, 120)));
  for (const tree of trees) {
    assert.equal(hexOwnerAt(tree.x, tree.z), 'Nethereum', `a tree of Nethereum stands at (${tree.x.toFixed(0)}, ${tree.z.toFixed(0)})`);
    assert.equal(westWaterSurface(tree.x, tree.z), null, 'a tree is standing in the water');
    assert.ok(water(tree) < 17, `a gallery tree stands ${water(tree).toFixed(0)} m from any water`);
  }
  // Isamouth's reserved ground reaches across the Isa onto Nethereum's own hexes, and a country
  // built after Isareos has to keep off it too: a town put there later should not have to move
  // a gallery, and moving a gallery re-rolls every seeded draw after it.
  const crowding = world.colliders.filter(collider => /^nethereum-/.test(collider.kind ?? '')
    && Math.hypot(collider.x - ISAMOUTH_GROUND.x, collider.z - ISAMOUTH_GROUND.z) < ISAMOUTH_GROUND.radius);
  assert.equal(crowding.length, 0, `${crowding.length} things of Nethereum's stand on Isamouth's ground`);
  // No thorn, no scrub and no rock: this ground is under water every spring.
  assert.equal(REGION_BIOMES.Nethereum.rocksPerHex, 0);
  assert.equal(REGION_BIOMES.Nethereum.treesPerHex, 0);
  const strays = world.colliders.filter(collider => /^nethereum-/.test(collider.kind ?? '') && collider.kind !== 'nethereum-tree');
  assert.equal(strays.length, 0, `Nethereum put down ${[...new Set(strays.map(s => s.kind))].join(', ')}`);
  // The terrain profile: the rim between the two built countries it hands itself to, and one
  // paler, lower corner where the atlas says plains.
  const here = REGION_TERRAIN.Nethereum, dry = here.byTerrain.plains;
  assert.ok(here.base > REGION_TERRAIN.Caricas.base && here.base < REGION_TERRAIN.Isareos.base,
    `Nethereum at ${here.base} is not between Caricas at ${REGION_TERRAIN.Caricas.base} and Isareos at ${REGION_TERRAIN.Isareos.base}`);
  assert.ok(dry.base < here.base && dry.amp < here.amp, 'the dry corner is lower and flatter');
  assert.ok(here.amp < REGION_TERRAIN.Isareos.amp, 'and the country itself is quieter than the hills above it: the shape here is the dish');
});

test('the cattle on the floor, the hares on the rim, the otters in the deep Neth and a harrier over all of it', () => {
  const here = WEST_LIFE_ZONES.filter(zone => zone.region === 'Nethereum');
  assert.equal(here.length, 5);
  const species = new Set(here.map(zone => zone.species));
  for (const name of ['nethrani-cattle', 'upland-hare', 'otter', 'wading-bird', 'harrier'])
    assert.ok(species.has(name), `Nethereum has no ${name}`);
  for (const zone of here) assert.ok(zone.note && zone.note.length > 40, `${zone.id} says nothing about why it is here`);
  // The Nethrani beast is not the Vastos longhorn: a different model, three-quarters the height
  // and the full width, which is what "a compact, short-legged breed adapted to wet ground" is.
  const cattle = here.find(zone => zone.species === 'nethrani-cattle');
  assert.equal(WEST_LIFE_ZONES.some(zone => zone.region === 'Nethereum' && zone.species === 'longhorn'), false);
  assert.ok(cattle.sites.length >= 5, 'a herd and not a pair');
  for (const [x, z] of cattle.sites) assert.ok(nethereumWet(x, z) > .9, `a cow at (${x}, ${z}) is off the floor`);
  // The hares are on the rim, which is the only ground here that is not under water in spring.
  const hares = here.find(zone => zone.species === 'upland-hare');
  for (const [x, z] of hares.sites) assert.ok(nethereumWet(x, z) < .2, `a hare at (${x}, ${z}) is down in the wet`);
  // The otters are below the ford, where there is deep water to go into. The Isa's are
  // Isareos's and are a different range: a filter on the species alone would catch both.
  const otters = here.find(zone => zone.species === 'otter');
  const deep = world.colliders.filter(collider => collider.kind === 'west-deep-water');
  for (const [x, z] of otters.sites) {
    assert.ok(coursePosition(NETH, x, z) > NETH.fordUntil, `an otter at (${x}, ${z}) sits on the ford`);
    assert.ok(Math.min(...deep.map(collider => Math.hypot(collider.x - x, collider.z - z) - collider.r)) < 5,
      `an otter at (${x}, ${z}) has no water to dive into`);
  }
  // Every fleeing range obeys `LIFE_REACH`'s law; the harrier is air and is exempt, as the
  // hawk and the vulture are.
  for (const zone of here) {
    if (zone.air) continue;
    assert.ok(Math.hypot(zone.maxX - zone.minX, zone.maxZ - zone.minZ) / 2 < LIFE_REACH, `${zone.id} is wider than its own reach`);
  }

  const life = createWestLife(scene, world);
  const mine = life.snapshot().creatures.filter(animal => animal.region === 'Nethereum');
  assert.equal(mine.length, here.reduce((sum, zone) => sum + zone.sites.length, 0), 'every one of them found a place');
  for (const animal of mine) {
    const zone = here.find(item => animal.id.startsWith(`${item.id}-`));
    if (zone.air) continue;
    assert.equal(hexOwnerAt(animal.x, animal.z), 'Nethereum', `${animal.id} strayed off the country`);
  }
  const player = { x: NETHEREUM_HOLLOW.x, y: 0, z: NETHEREUM_HOLLOW.z };
  for (let step = 0; step < 900; step++) life.update(1 / 30, player, true);
  for (const animal of life.snapshot().creatures.filter(item => item.region === 'Nethereum')) {
    const zone = here.find(item => animal.id.startsWith(`${item.id}-`));
    assert.ok(Number.isFinite(animal.x + animal.y + animal.z), `${animal.id} went to NaN`);
    assert.ok(animal.x >= zone.minX - .5 && animal.x <= zone.maxX + .5
      && animal.z >= zone.minZ - .5 && animal.z <= zone.maxZ + .5, `${animal.id} left its range`);
    if (!zone.air) assert.ok(Math.abs(animal.groundY - world.heightAt(animal.x, animal.z)) < .05, `${animal.id} floats`);
  }
  /**
   * **The harrier quarters; it does not soar.** It holds a thirty-four metre turn carried
   * seventy metres east and west, nine metres over whatever is under it — which is the whole
   * of how it is told from the hawk over Vastos and the vulture over Isareos, both of which
   * hold one circle over one spot a long way up. `follow` is what keeps it nine metres over
   * the ground rather than nine metres over the point it started from: over a dish six hundred
   * metres across, those are not the same number.
   */
  const sky = here.find(zone => zone.air);
  const seen = { lowest: Infinity, highest: -Infinity, west: Infinity, east: -Infinity };
  for (let step = 0; step < 60 * 60 * 3; step++) {
    life.update(1 / 60, player, true);
    for (const bird of life.snapshot().creatures.filter(item => item.id.startsWith(`${sky.id}-`))) {
      const up = bird.y - world.heightAt(bird.x, bird.z);
      seen.lowest = Math.min(seen.lowest, up); seen.highest = Math.max(seen.highest, up);
      seen.west = Math.min(seen.west, bird.x); seen.east = Math.max(seen.east, bird.x);
      assert.equal(bird.action, 'soar');
    }
  }
  assert.ok(seen.lowest > 4, `the harrier came down to ${seen.lowest.toFixed(1)} m over the grass`);
  assert.ok(seen.highest < 16, `and went up to ${seen.highest.toFixed(1)} m, which is soaring and not quartering`);
  assert.ok(seen.east - seen.west > 120, `it quartered only ${(seen.east - seen.west).toFixed(0)} m of meadow`);
  life.dispose();
});

test('the Nethrani beast gives ground instead of bolting, and the country is charted, tongued and empty of people', () => {
  /**
   * The cattle law, spelled out for the breed this country is for. `tests/west-life.test.js`
   * holds it for every cow in the world; here it is with the numbers, because the branch that
   * carries it used to be a test on the word `longhorn` and was true of exactly one animal.
   */
  const zone = WEST_LIFE_ZONES.find(item => item.id === 'nethereum-cattle');
  const life = createWestLife(new THREE.Scene(), world);
  const herd = () => life.snapshot().creatures.filter(animal => animal.id.startsWith(`${zone.id}-`));
  const first = herd()[0], player = { x: first.x + 40, z: first.z };
  const HZ = 60;
  let closest = Infinity;
  const actions = new Set();
  for (let i = 0; i < 20 * HZ; i++) {
    const at = herd().find(animal => animal.id === first.id);
    const dx = at.x - player.x, dz = at.z - player.z, d = Math.hypot(dx, dz);
    if (d > .4) { const step = Math.min(d - .3, 4.2 / HZ); player.x += dx / d * step; player.z += dz / d * step; }
    life.update(1 / HZ, player, true);
    const now = herd().find(animal => animal.id === first.id);
    closest = Math.min(closest, Math.hypot(now.x - player.x, now.z - player.z));
    actions.add(now.action);
  }
  assert.ok(actions.has('yield') && !actions.has('flee'), `a Nethrani cow ${[...actions].join(', ')}`);
  assert.ok(closest > 5, `somebody walking got within ${closest.toFixed(2)} m of a cow`);
  life.dispose();

  const here = regions.find(region => region.name === 'Nethereum');
  assert.deepEqual([...here.npcIds], [], 'terrain and wildlife only');
  for (const id of here.landmarks) assert.ok(world.landmarks.some(mark => mark.id === id), `the chart knows ${id}`);
  for (const mark of WEST_REGION_LANDMARKS.filter(item => here.landmarks.includes(item.id)))
    assert.equal(hexOwnerAt(mark.x, mark.z), 'Nethereum', `${mark.id} stands outside Nethereum`);
  // Nothing anybody built is named on the chart: no Nethermere, no weir, no levee, no council.
  // The names, not the descriptions — a description is allowed to say what is *not* here, and
  // the Lower Neth's says exactly that about the fish weirs.
  const banned = /Nethermere|weir|levee|council|village|town|mill/i;
  for (const mark of WEST_REGION_LANDMARKS.filter(item => here.landmarks.includes(item.id)))
    assert.equal(banned.test(mark.name), false, `${mark.id} names something somebody built`);
  assert.ok(SUBREGIONS.filter(area => area.region === 'Nethereum').length >= 3);
  for (const area of SUBREGIONS.filter(item => item.region === 'Nethereum'))
    assert.equal(hexOwnerAt(area.x, area.z), 'Nethereum', `the chart puts ${area.id} outside Nethereum`);
  assert.equal(regionBuildStatus('Nethereum').playable, true);
  assert.equal(regionLevel('Nethereum'), 3);
  assert.equal(levelWords(3), 'A hard country');
  // A tongue, from the lore file's own Language section: "Nethrani is an inner-branch Mittoli
  // variant, recognizable to any Standard Mittoli speaker."
  const spoken = REGION_LANGUAGE.Nethereum;
  assert.equal(spoken.language, 'mittoli');
  assert.ok(LANGUAGES[spoken.language] && DIALECTS[spoken.dialect]);
  assert.equal(DIALECTS[spoken.dialect].language, 'mittoli');
  assert.ok(LANGUAGES.mittoli.dialects.includes(spoken.dialect), 'and Mittoli claims it');
  // And somewhere for Ed to be, which every built country owes him.
  assert.equal(CHAMELEON_SPOTS.filter(spot => spot.region === 'Nethereum').length, 1);
});
