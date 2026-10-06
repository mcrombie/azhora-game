import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/gameplay/movement/game-state.js';
import { PLAYABLE_REGIONS, REGION_BIOMES } from '../src/world/terrain/region-layout.js';
import { PLAYABLE_SURVEY } from '../src/dev/tools/region-survey.js';
import { RIVER_EDGES } from '../src/world/terrain/region-rivers.js';
import {
  REGION_CELLS, REGION_IDS, REGION_TERRAIN, WORLD_BOUNDS, hexOwnerAt, hexCentre, regions, insideRegion,
} from '../src/world/terrain/region-world.js';
import {
  WEST_LOTHARN, WEST_LOTHARN_CLIMATE, WEST_LOTHARN_KOPPEN, COLD_HEAD_HEX, WEST_LOTHARN_BOX,
  PEAKS, PEAK_TOPS, BANDS, BALD, TREE_LINE, LONG_VALLEY, LONG_VALLEY_DIVIDE, NORTH_VALLEY, NOTCH, COL,
  longValleyFloor, northValleyFloor, notchFloor, westLotharnShare, peakLiftAt, peakUplift, onBald, onRamp,
  pointOn, nearestOn, WEST_LOTHARN_LANDMARKS,
} from '../src/content/regions/west-lotharn/west-lotharn-world.js';
import { KEMRATH, kemrathFloor } from '../src/content/regions/east-lotharn/east-lotharn-world.js';
import {
  WEST_LOTHARN_WATERS, KEMRATH_REACH, KEMRATH_WATER, MENETH_BECKS, WEST_REGION_NAMES, courseDistance,
} from '../src/content/regions/western-regions/west-regions.js';
import { WEST_PROFILES, westGroundAt, westWaterSurface } from '../src/content/regions/western-regions/west-ground.js';
import { WEST_LOTHARN_WILDLIFE_ZONES } from '../src/content/regions/west-lotharn/west-lotharn-wildlife.js';
import { DEFAULT_SKY, regionSky } from '../src/world/environment/region-sky.js';
import { SUBREGIONS } from '../src/ui/map/map-fog.js';
import { regionBuildStatus } from '../src/dev/tools/build-status.js';
import { regionLevel } from '../src/world/terrain/region-levels.js';
import { REGION_LANGUAGE } from '../src/gameplay/skills/languages.js';
import { DEV_WORLD_DESTINATIONS } from '../src/dev/tools/developer-atlas.js';
import { isClimbTerrain } from '../src/gameplay/movement/climbing.js';

/**
 * The West Lotharn Mountains: the spine of the range, and the taller half of it (the user,
 * 29 September 2026 - a crest of about five hundred and fifty metres, and everything else carried
 * over from the East: cliffs in courses, cut ramps, ledge paths and caves).
 *
 * Terrain, climate, water, scenery, caves and wildlife only. The East Lotharn's pass road, its inn
 * and its iron workings were built to an earlier brief and are not copied; nothing here belongs to
 * anybody (docs/west-lotharn-brief.md).
 */
const { createWorld } = await sourceModule('../src/world.js');
const { WEST_LIFE_ZONES } = await sourceModule('../src/content/regions/western-regions/west-regions-life.js');
const world = createWorld(new THREE.Scene());
const g = world.groundHeight;
const own = (x, z) => hexOwnerAt(x, z) === WEST_LOTHARN;
const cells = REGION_CELLS[WEST_LOTHARN];
const MAP = '../../world-builder/map/resources/examples/azhora.wwmap';
/**
 * The last sample of a tapered course, where `strength` is nought: the channel is deliberately
 * given up there - "a beck that reaches level ground simply spreads and sinks" - so the ground may
 * stand above the water. What must still hold is that nothing floats: either the ribbon is broken
 * (`westWaterSurface` answers null) or the ground is under the water as everywhere else.
 */
const dryOrUnder = sample => {
  const surface = westWaterSurface(sample.x, sample.z);
  return surface === null || westGroundAt(sample.x, sample.z) <= surface + .01;
};

test('the atlas: forty-eight hexes, twenty-five of mountain, forty-seven Cfa and one Dfa, and no river at all', () => {
  assert.equal(cells.length, 48);
  const byTerrain = {};
  for (const cell of cells) byTerrain[cell.terrain] = (byTerrain[cell.terrain] ?? 0) + 1;
  assert.deepEqual(byTerrain, { mountain: 25, hills: 23 });
  // The whole justification for the height: the East Lotharn is fifteen mountain hexes to this
  // country's twenty-five, so this is the main range and the East is its eastern foothills.
  const east = REGION_CELLS['East Lotharn Mountains'].filter(cell => cell.terrain === 'mountain');
  assert.equal(east.length, 15);
  assert.ok(byTerrain.mountain > east.length * 1.6, 'the West has two thirds again as much true mountain');

  // Climate, per hex, off the World Builder map - not the one-code-per-region default field.
  assert.equal(Object.keys(WEST_LOTHARN_CLIMATE).length, 48);
  const codes = {};
  for (const code of Object.values(WEST_LOTHARN_CLIMATE)) codes[code] = (codes[code] ?? 0) + 1;
  assert.deepEqual(codes, { Cfa: 47, Dfa: 1 });
  assert.equal(WEST_LOTHARN_KOPPEN, 'Cfa');
  assert.equal(WEST_LOTHARN_CLIMATE[`${COLD_HEAD_HEX.q},${COLD_HEAD_HEX.r}`], 'Dfa');
  // The one continental hex is a `mountain` hex at the range's western tip, and that is where the
  // cold head stands: a single hex is a hundred metres of ground and carries a name, not a band.
  const cold = cells.find(cell => cell.q === COLD_HEAD_HEX.q && cell.r === COLD_HEAD_HEX.r);
  assert.equal(cold.terrain, 'mountain');
  assert.equal(cold.x, Math.min(...cells.map(one => one.x)), 'the westernmost hex in the country');
  const head = PEAKS.find(peak => peak.id === 'cold-head');
  assert.ok(Math.hypot(head.x - cold.x, head.z - cold.z) < 160, 'the cold head stands on that block');
  // No climate landform anywhere: nothing in this country is shaped by the one hex.
  assert.equal(WEST_LOTHARN_LANDMARKS.filter(place => /cold head/i.test(place.name)).length, 1);

  const url = new URL(MAP, import.meta.url);
  if (existsSync(url)) {
    const map = JSON.parse(readFileSync(url, 'utf8'));
    for (const [key, code] of Object.entries(WEST_LOTHARN_CLIMATE)) assert.equal(map.hexes?.[key]?.climate, code, key);
  }

  // The atlas draws no water here at all - the East Lotharn has its border river and this half has
  // nothing - so every course in the country is derived from the landform, as Meneth's becks are.
  const keys = new Set(cells.map(cell => `${cell.q},${cell.r}`));
  assert.equal(RIVER_EDGES.filter(edge => keys.has(`${edge.a[0]},${edge.a[1]}`) || keys.has(`${edge.b[0]},${edge.b[1]}`)).length, 0);
  assert.equal(PLAYABLE_SURVEY.regions.find(region => region.name === WEST_LOTHARN).cells.length, 48);
});

test('this country does not grow the world box, and the four north of it do', () => {
  // Its world extent is about x -2550…-1550, z -981…-260, well inside bounds that West Izol, Amod
  // and the Ascarth Peninsula already set, and rows 95-102 are inside the survey WINDOW. So when
  // this country was built, tests/region-layout.test.js, tests/isareos-world.test.js and
  // tests/nethereum-world.test.js needed no new numbers.
  //
  // **The four Mithala countries built next did grow it, north.** North Mithala reaches atlas row
  // 82 against this range's 95, so the world's northern edge went from -1301.17 to -2167.196 and
  // the world from 37.00 hexes tall to 45.66. Nothing this country stands on moved with it: the
  // three edges it does not set are still the numbers they were.
  //
  // **And the four southwestern countries built after those did grow it, west.** The Ganesh Desert
  // reaches atlas column q -33 against this range's -8, its westernmost hexes' outer flat standing
  // at x = -3900, so the world's western edge went from -3010.002 to -3960.002 and the world from
  // 36.20 hexes wide to 45.70, and **Cape Heth then took it to -4360.002 and 49.70**, on the one
  // `coast` hex the atlas puts inside any country (docs/southwest-3-report.md). This range stands at
  // x -2550...-1550, nearly two kilometres inside it, and nothing of it moved for either. So what
  // this test now holds is the three facts together: this country spent nothing, the Mithala spent
  // the north, the southwest spent the west - twice - **and West Ibenwood then took the west a third
  // time, to -4610.002 and 52.20**, when the Ibenwood belt landed alongside: its rim is at x = -4550,
  // two hundred and fifty metres past Cape Heth's. Nothing of this range moved for that either.
  // ...and to -4860.002 when Alezhor's and South Ibenal's coasts landed (4 October 2026); still not this range's.
  assert.ok(Math.abs(WORLD_BOUNDS.minX - -4860.001927939128) < 1e-6, `minX is ${WORLD_BOUNDS.minX}`);
  // Since the Baldro Mountains landed as regions 52 and 53 the eastern and northern edges are theirs:
  // maxX 2209.998, minZ -3899.247, the world 68.20 by 73.369 hexes, the window's maxQ 60 and minR 59.
  // Babon now sets the southern edge at z3437.632, two atlas rows beyond Trogo.
  // Every assertion below that holds one of those numbers holds the Baldros' and nothing of this country's.
  assert.ok(Math.abs(WORLD_BOUNDS.maxX - 2209.9980720608737) < 1e-6, `maxX is ${WORLD_BOUNDS.maxX}`);
  assert.ok(Math.abs(WORLD_BOUNDS.minZ - -3899.2468035704924) < 1e-6, `minZ is ${WORLD_BOUNDS.minZ}`);
  // ...and the four Meroshe deserts took the south, 2398.401 -> 3177.824, which this range is two
  // and a half kilometres north of (docs/southwest-2-report.md).
  // ...and Trogo took it further south again, 3177.824 -> 3264.426 (docs/southwest-4-report.md).
  assert.ok(Math.abs(WORLD_BOUNDS.maxZ - 3437.6315612998296) < 1e-6, `maxZ is ${WORLD_BOUNDS.maxZ}`);
  // This range's own hexes are a long way inside the northern edge the Mithala set, and that edge
  // is the Mithala's: 866 m of new world north of where this country's own build left it.
  assert.ok(WORLD_BOUNDS.minZ < -2100 && Math.min(...cells.map(cell => cell.z)) - WORLD_BOUNDS.minZ > 1100);
  const xs = cells.map(cell => cell.x), zs = cells.map(cell => cell.z);
  assert.ok(Math.min(...xs) > WORLD_BOUNDS.minX + 100 && Math.max(...xs) < WORLD_BOUNDS.maxX - 100);
  assert.ok(Math.min(...zs) > WORLD_BOUNDS.minZ + 100 && Math.max(...zs) < WORLD_BOUNDS.maxZ - 100);
});

test('the crest is the highest ground in Azhora, and every summit stands on the atlas’s mountain hexes', () => {
  const mountains = cells.filter(cell => cell.terrain === 'mountain');
  for (const peak of PEAKS) {
    const near = mountains.reduce((best, cell) => Math.hypot(cell.x - peak.x, cell.z - peak.z) < Math.hypot(best.x - peak.x, best.z - peak.z) ? cell : best, mountains[0]);
    assert.ok(Math.hypot(near.x - peak.x, near.z - peak.z) < 90, `${peak.id} stands off the mountain hexes`);
  }
  // The crest, measured on the ground the game actually makes.
  let highest = -Infinity, at = null;
  for (let x = WEST_LOTHARN_BOX.minX; x <= WEST_LOTHARN_BOX.maxX; x += 6) for (let z = WEST_LOTHARN_BOX.minZ; z <= WEST_LOTHARN_BOX.maxZ; z += 6) {
    if (!own(x, z)) continue;
    const y = g(x, z);
    if (y > highest) { highest = y; at = { x, z }; }
  }
  assert.ok(highest > 535 && highest < 565, `the crest stands ${highest.toFixed(0)} m`);
  assert.ok(Math.hypot(at.x - PEAKS[0].x, at.z - PEAKS[0].z) < 60, 'and it is the crest');
  // Higher than anything the East Lotharn has by a clear margin: its eastern peak is about 420 m.
  let eastHighest = -Infinity;
  for (const cell of REGION_CELLS['East Lotharn Mountains']) for (let dx = -40; dx <= 40; dx += 8) for (let dz = -40; dz <= 40; dz += 8) {
    const x = cell.x + dx, z = cell.z + dz;
    if (hexOwnerAt(x, z) === 'East Lotharn Mountains') eastHighest = Math.max(eastHighest, g(x, z));
  }
  assert.ok(highest > eastHighest + 100, `the West's ${highest.toFixed(0)} m against the East's ${eastHighest.toFixed(0)}`);
});

test('the long valley crosses the range, and its two becks leave the divide in opposite directions', () => {
  assert.ok(LONG_VALLEY.line.length > 900, `the valley is ${LONG_VALLEY.line.length.toFixed(0)} m long`);
  // The divide is in the middle third of the line, and the floor falls from it both ways.
  assert.ok(LONG_VALLEY_DIVIDE.along > 120 && LONG_VALLEY_DIVIDE.along < LONG_VALLEY.line.length * .5);
  assert.ok(longValleyFloor(0) < LONG_VALLEY_DIVIDE.level - 8, 'the east mouth is below the divide');
  assert.ok(longValleyFloor(LONG_VALLEY.line.length) < LONG_VALLEY_DIVIDE.level - 18, 'and so is the west end, by more');
  // The floor is flat across and the walls climb away from it on both sides.
  for (const along of [80, 260, 520, 760, 900]) {
    const p = pointOn(LONG_VALLEY.line, along), mid = g(p.x, p.z);
    assert.ok(own(p.x, p.z), `the floor at ${along} m is in the country`);
    for (const side of [-1, 1]) {
      const near = g(p.x + p.nx * 12 * side, p.z + p.nz * 12 * side);
      assert.ok(Math.abs(near - mid) < 4, `the floor at ${along} m is not level (${near.toFixed(1)} against ${mid.toFixed(1)})`);
      const wall = g(p.x + p.nx * 70 * side, p.z + p.nz * 70 * side);
      assert.ok(wall > mid + 2, `the valley at ${along} m has no wall on one side (${wall.toFixed(1)})`);
    }
  }
  // A beck out of each end, each falling the whole way, and each staying on the floor.
  const east = WEST_PROFILES.get('long-valley-east-beck'), west = WEST_PROFILES.get('long-valley-west-beck');
  for (const [name, profile] of [['east', east], ['west', west]]) {
    for (let i = 1; i < profile.length; i++) assert.ok(profile[i].surface <= profile[i - 1].surface + 1e-9, `the ${name} beck climbs at ${i}`);
    for (const sample of profile) {
      // `strength` 0 is the last sample of a tapered course: the channel is deliberately given up
      // there - "a beck that reaches level ground simply spreads and sinks" - so the ground stands
      // above the water, and `westWaterSurface` answers null rather than floating a sheet on air.
      if (!sample.strength) { assert.ok(dryOrUnder(sample), `the ${name} beck floats at its end`); continue; }
      assert.ok(westGroundAt(sample.x, sample.z) <= sample.surface + .01, `the ${name} beck floats at ${sample.x.toFixed(0)}`);
      assert.ok(nearestOn(LONG_VALLEY.line, sample.x, sample.z).distance < LONG_VALLEY.half, `the ${name} beck has left the floor`);
    }
  }
  assert.ok(east.at(-1).x > west.at(-1).x, 'they end at opposite ends of the country');
});

test('the north valley drains the massif to the Mithala plain, open all the way down', () => {
  assert.ok(northValleyFloor(0) > northValleyFloor(NORTH_VALLEY.line.length) + 30, 'it falls forty metres');
  const beck = WEST_PROFILES.get('west-lotharn-north-beck');
  for (let i = 1; i < beck.length; i++) assert.ok(beck[i].surface <= beck[i - 1].surface + 1e-9, `the north beck climbs at ${i}`);
  for (const sample of beck) {
    if (!sample.strength) { assert.ok(dryOrUnder(sample), 'the north beck floats at its end'); continue; }
    assert.ok(westGroundAt(sample.x, sample.z) <= sample.surface + .01, `the north beck floats at ${sample.x.toFixed(0)}`);
  }
  // It is a valley, not a gorge: the floor is walked, and the walls are above it on both sides.
  //
  // **Not at 150 m, which is where it arrives.** The probe was [30, 90, 150] and 150 is eleven
  // metres from the end of a hundred-and-fifty-one-metre line - the mouth. While the Mithala plain
  // was unbuilt, the ground a hex north of the mouth was `outland` blended with this range, six
  // metres of relief on a lifted base, and the mouth appeared to have a wall on its northern side
  // because the empty country did. With South Mithala registered that ground is a river plain at
  // 28 m, six metres *below* the valley floor at 150 m, and the wall is gone because the valley has
  // got where it was going. The code is right and the probe was measuring the outland: it reads at
  // 130 m now, the last station that is still inside the range, and the mouth is asserted open
  // below instead.
  for (const along of [30, 90, 130]) {
    const p = pointOn(NORTH_VALLEY.line, along), mid = g(p.x, p.z);
    for (const side of [-1, 1]) assert.ok(g(p.x + p.nx * 60 * side, p.z + p.nz * 60 * side) > mid + 2, `no wall at ${along} m`);
  }
  // And the mouth is open to the north, onto the plain the lore says it drains to: sixty metres out
  // on the Mithala's side the ground is below the valley's own floor, and it is South Mithala's.
  const mouth = pointOn(NORTH_VALLEY.line, NORTH_VALLEY.line.length);
  const onto = { x: mouth.x - mouth.nx * 60, z: mouth.z - mouth.nz * 60 };
  assert.equal(hexOwnerAt(onto.x, onto.z), 'South Mithala', 'the north valley comes out on the Mithala plain');
  assert.ok(g(onto.x, onto.z) < g(mouth.x, mouth.z), 'and the plain is below its floor: nothing shuts the mouth');
  // Nothing rises out of the floor: the summits' lift is nothing on either valley.
  for (const valley of [LONG_VALLEY, NORTH_VALLEY]) for (let along = 0; along <= valley.line.length; along += 20) {
    const p = pointOn(valley.line, along);
    assert.equal(peakUplift(p.x, p.z), 0, `a summit rises on the valley floor at ${along} m`);
  }
});

test('the col and the notch: Kemrath’s water is taken on where it runs out of the East Lotharn, without a step', () => {
  // The East Lotharn's Kemrath "drains west, out of the range toward the West Lotharn", and with
  // this country registered its floor and its water end inside these hexes.
  const end = KEMRATH.line.points.at(-1);
  assert.ok(own(end.x, end.z), 'Kemrath now ends inside the West Lotharn');
  assert.ok(Math.hypot(end.x - COL.x, end.z - COL.z) < COL.radius, 'and it ends at the col');
  assert.ok(Math.abs(g(COL.x, COL.z) - kemrathFloor(KEMRATH.line.length)) < 2.5, 'the col is Kemrath’s own floor');
  // A river cannot stop in the middle of a country: the reach picks it up at exactly its level.
  const kemrath = WEST_PROFILES.get('kemrath-water'), reach = WEST_PROFILES.get('kemrath-reach');
  assert.equal(reach[0].surface, kemrath.at(-1).surface, 'the hand-over is not a waterfall');
  assert.ok(Math.hypot(reach[0].x - kemrath.at(-1).x, reach[0].z - kemrath.at(-1).z) < 25, 'the two lines meet end to end');
  assert.equal(KEMRATH_REACH.headOf, KEMRATH_WATER.id, 'the level is read from that course, not typed in');
  for (let i = 1; i < reach.length; i++) assert.ok(reach[i].surface <= reach[i - 1].surface + 1e-9, `the reach climbs at ${i}`);
  assert.ok(reach[0].surface - reach.at(-1).surface > 15, 'and it falls nineteen metres to the Mithala margin');
  for (const sample of reach) {
    if (!sample.strength) { assert.ok(dryOrUnder(sample), 'the reach floats at its end'); continue; }
    assert.ok(westGroundAt(sample.x, sample.z) <= sample.surface + .01, `the reach floats at ${sample.x.toFixed(0)}`);
  }
  // West of the col this country climbs at once, which is why the water turns north at all.
  assert.ok(g(COL.x - 30, COL.z) > g(COL.x, COL.z) + 15, 'the ground west of the col climbs');
  assert.ok(notchFloor(0) > notchFloor(NOTCH.line.length) + 15, 'the notch falls the whole way');

  // Meneth's first beck used to run on into what is now this country's southern front. It ends
  // where the ground stops falling instead, and it is the only course outside this country touched.
  const meneth = WEST_PROFILES.get('meneth-beck-0');
  for (const sample of meneth) assert.ok(!own(sample.x, sample.z), 'meneth-beck-0 no longer runs into the range');
  assert.equal(MENETH_BECKS.length, 4, 'the other three valleys still have theirs');
  for (const beck of MENETH_BECKS.slice(1)) assert.ok(WEST_PROFILES.get(beck.id).length > 40, `${beck.id} is untouched`);
});

test('the seams: twenty-nine edges against built country, and none of their ground is written on', () => {
  const AXIAL = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  const keys = new Set(cells.map(cell => `${cell.q},${cell.r}`)), counts = {};
  for (const cell of cells) for (const [dq, dr] of AXIAL) {
    if (keys.has(`${cell.q + dq},${cell.r + dr}`)) continue;
    const centre = hexCentre(cell.q + dq, cell.r + dr), name = hexOwnerAt(centre.x, centre.z) ?? 'Open country';
    counts[name] = (counts[name] ?? 0) + 1;
  }
  assert.equal(counts['East Lotharn Mountains'], 7);
  assert.equal(counts.Vastos, 8);
  assert.equal(counts.Meneth, 7);
  assert.equal(counts.Isareos, 7);
  assert.equal(counts['East Lotharn Mountains'] + counts.Vastos + counts.Meneth + counts.Isareos, 29);
  // The relief numbers are the East Lotharn's to the digit, because the two halves are one massif
  // and the seam between them must have nothing to hide.
  const mine = REGION_TERRAIN[WEST_LOTHARN], theirs = REGION_TERRAIN['East Lotharn Mountains'];
  for (const key of ['base', 'amp', 'wave']) assert.equal(mine[key], theirs[key], key);
  for (const terrain of ['hills', 'mountain']) for (const key of ['base', 'amp', 'wave'])
    assert.equal(mine.byTerrain[terrain][key], theirs.byTerrain[terrain][key], `${terrain}.${key}`);
  // Nothing this country makes is written inside a built neighbour's own hexes.
  const built = ['East Lotharn Mountains', 'Vastos', 'Meneth', 'Isareos'];
  const worst = Object.fromEntries(built.map(name => [name, 0]));
  for (let x = WEST_LOTHARN_BOX.minX; x <= WEST_LOTHARN_BOX.maxX; x += 6) for (let z = WEST_LOTHARN_BOX.minZ; z <= WEST_LOTHARN_BOX.maxZ; z += 6) {
    const name = hexOwnerAt(x, z);
    if (!built.includes(name)) continue;
    worst[name] = Math.max(worst[name], peakLiftAt(x, z));
  }
  // The col is the seam that matters most, and this country lifts the East Lotharn's ground by
  // nothing at all anywhere in it.
  assert.equal(worst['East Lotharn Mountains'], 0, 'the East Lotharn’s ground does not move');
  for (const name of built) assert.ok(worst[name] < 40, `${name} takes ${worst[name].toFixed(0)} m of this country’s lift`);
  for (const cell of built.flatMap(name => REGION_CELLS[name])) assert.equal(westLotharnShare(cell.x, cell.z), 0);
});

test('the forest rides the ledges to the tree line and gives out, and nothing grows on a bald or a cliff', () => {
  assert.ok(TREE_LINE.gives > 330 && TREE_LINE.gives < 360, `the tree line is ${TREE_LINE.gives} m`);
  assert.ok(TREE_LINE.thins < TREE_LINE.gives - 60, 'and the wood thins for a hundred metres before it');
  // Two hundred metres of bare stone under the crest's bald - the lore's "within a few hundred
  // meters of their highest summits" - and the East's own line is far lower, as its range is.
  const crest = PEAK_TOPS['the-crest'];
  assert.ok(crest / BANDS.period > 9, 'the crest stands on ten courses or more');
  const trees = world.colliders.filter(one => one.kind === 'west-lotharn-tree');
  assert.ok(trees.length > 2000, `${trees.length} trees`);
  let above = 0, onCliffOrBald = 0;
  for (const tree of trees) {
    const y = g(tree.x, tree.z);
    if (y > TREE_LINE.gives + 12) above++;
    if (onBald(tree.x, tree.z, 2)) onCliffOrBald++;
    assert.ok(own(tree.x, tree.z), 'a tree outside the country');
  }
  assert.equal(above, 0, `${above} trees above the tree line`);
  assert.equal(onCliffOrBald, 0, `${onCliffOrBald} trees on a bald`);
  // The balds are bare grass and nothing else, and the biome scatters nothing of its own here.
  assert.equal(REGION_BIOMES[WEST_LOTHARN].treesPerHex, 0);
  assert.equal(REGION_BIOMES[WEST_LOTHARN].ownScatter, true);
  assert.equal(REGION_BIOMES[WEST_LOTHARN].relief.amplitude, REGION_BIOMES['East Lotharn Mountains'].relief.amplitude);
});

test('the wildlife reads the height, and none of it is anybody’s', () => {
  const species = new Set(WEST_LOTHARN_WILDLIFE_ZONES.map(zone => zone.species));
  for (const kind of ['red-deer', 'boar', 'upland-hare', 'wading-bird', 'river-fox', 'turkey-vulture', 'plateau-hawk'])
    assert.ok(species.has(kind), kind);
  // Nothing domestic: a flock with nobody near it is still somebody's flock.
  for (const kind of ['hill-sheep', 'longhorn', 'nethrani-cattle']) assert.ok(!species.has(kind), `${kind} belongs to somebody`);
  for (const zone of WEST_LOTHARN_WILDLIFE_ZONES) {
    assert.equal(zone.region, WEST_LOTHARN);
    assert.ok(zone.note.length > 60, zone.id);
    assert.ok(WEST_LIFE_ZONES.some(one => one.id === zone.id), `${zone.id} is not drawn`);
    if (zone.air) continue;
    for (const [x, z] of zone.sites) {
      assert.ok(own(x, z), `${zone.id} site out of the range`);
      assert.ok(westWaterSurface(x, z) === null, `${zone.id} site in the water`);
      assert.ok(canStand(x, z, world, zone.radius), `${zone.id} site cannot be stood on`);
    }
  }
  // The hares are on the balds above the tree line and the deer and the boar on the valley floors:
  // the ledge forest, which is most of the country, has nothing in it and is meant not to.
  for (const zone of WEST_LOTHARN_WILDLIFE_ZONES.filter(one => one.species === 'upland-hare'))
    for (const [x, z] of zone.sites) assert.ok(g(x, z) > TREE_LINE.gives - 100 && onBald(x, z, 6), `${zone.id} is not on a bald`);
  for (const zone of WEST_LOTHARN_WILDLIFE_ZONES.filter(one => ['red-deer', 'boar'].includes(one.species)))
    for (const [x, z] of zone.sites) assert.ok(g(x, z) < 100, `${zone.id} is off the valley floor`);
  for (const zone of WEST_LOTHARN_WILDLIFE_ZONES.filter(one => one.species === 'wading-bird'))
    assert.ok(zone.sites.every(([x, z]) => courseDistance(KEMRATH_REACH, x, z, 40) < 8), 'herons by the water');
});

test('nobody lives here yet: no people, no road, no made place, and the chart says what is built', () => {
  const region = regions.find(one => one.name === WEST_LOTHARN);
  assert.equal(REGION_IDS[WEST_LOTHARN], 27);
  // Appended, never inserted, which is what the id and the order are really about: the biome scatter
  // in world-regions.js walks PLAYABLE_REGIONS with one seeded stream, so a name put anywhere but
  // the end re-rolls every region after it. This used to assert that this country was *last*; it is
  // not last any more, because the four Mithala countries went on the end after it, so what it says
  // now is what it always meant.
  assert.ok(PLAYABLE_REGIONS.indexOf(WEST_LOTHARN) >= 0, 'registered');
  for (const name of PLAYABLE_REGIONS.slice(PLAYABLE_REGIONS.indexOf(WEST_LOTHARN) + 1))
    assert.ok(REGION_IDS[name] > 27, `${name} was added after the West Lotharn and carries a higher id`);
  assert.deepEqual(region.npcIds, []);
  assert.equal(regionLevel(WEST_LOTHARN), 4);
  assert.equal(WEST_REGION_NAMES.includes(WEST_LOTHARN), true);
  // The spawn is on dry walkable ground on the long valley's floor.
  assert.ok(own(region.spawn.x, region.spawn.z) && canStand(region.spawn.x, region.spawn.z, world, .34));
  assert.equal(westWaterSurface(region.spawn.x, region.spawn.z), null);
  // Its own sky, thinner and clearer than the East's, which is what altitude and distance do.
  const sky = regionSky(region);
  assert.notDeepEqual({ ...sky }, { ...DEFAULT_SKY });
  assert.ok(sky.density < regionSky(regions.find(one => one.name === 'East Lotharn Mountains')).density);
  // The same dialect as the East: one range, one valley people, and the lore's own unit.
  assert.deepEqual(REGION_LANGUAGE[WEST_LOTHARN], REGION_LANGUAGE['East Lotharn Mountains']);
  // The chart, the build record and the developer atlas all know it.
  const areas = SUBREGIONS.filter(area => area.region === WEST_LOTHARN);
  assert.ok(areas.length >= 3 && areas.length <= 8, `${areas.length} charted areas`);
  for (const area of areas) {
    assert.ok(area.radius >= 18 && area.radius <= 130, `${area.id} radius ${area.radius}`);
    assert.ok(insideRegion(WEST_LOTHARN, area.x, area.z), `${area.name} stands outside the country`);
  }
  const status = regionBuildStatus(WEST_LOTHARN);
  assert.equal(status.state, 'early');
  assert.match(status.detail, /crest/i);
  assert.match(status.work, /No road and no pass/);
  assert.ok(DEV_WORLD_DESTINATIONS.some(one => one.regionId === WEST_LOTHARN));
  // Nothing anybody made: the landmarks are ground and water, and no collider here is a building.
  for (const place of WEST_LOTHARN_LANDMARKS) {
    assert.ok(place.description.length > 80, place.id);
    assert.ok(!/inn|mine|workings|road|village|town|farm|wall|bridge/i.test(place.name), `${place.name} is somebody's`);
  }
  assert.equal(region.landmarks.every(id => WEST_LOTHARN_LANDMARKS.some(place => place.id === id)), true);
  // The climbing rule reaches this country, by id and by name.
  const climbWorld = { regionAt: (x, z) => ({ id: REGION_IDS[hexOwnerAt(x, z)] ?? 0, name: hexOwnerAt(x, z) }) };
  assert.equal(isClimbTerrain(climbWorld, PEAKS[0].x, PEAKS[0].z), true);
  assert.equal(isClimbTerrain({ regionAt: () => 27 }, 0, 0), true);
  assert.equal(isClimbTerrain({ regionAt: () => WEST_LOTHARN }, 0, 0), true);
});
