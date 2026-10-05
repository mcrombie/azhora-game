import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { PLAYABLE_REGIONS, REGION_BIOMES, METRES_PER_HEX } from '../src/region-layout.js';
import { PLAYABLE, WINDOW } from '../scripts/build-region-survey.mjs';
import { LAND_HEXES } from '../src/region-survey.js';
import { RIVER_EDGES } from '../src/region-rivers.js';
import {
  REGION_CELLS, REGION_IDS, REGION_TERRAIN, WORLD_BOUNDS, hexAt, hexCentre, hexOwnerAt, regionAt,
  regions, terrainMix, landDistance,
} from '../src/region-world.js';
import {
  VAELLIR, ALEZHOR_WATER, MAROSH_NAHR, TROGORETH, SOUTHWEST_RIVERS, WEST_RIVERS, WEST_REGION_NAMES, courseDistance,
} from '../src/west-regions.js';
import { WEST_PROFILES, westGroundAt, westWaterSurface } from '../src/west-ground.js';
import { groundWithRiver, groundTint, GROUND_TINT_FAMILIES } from '../src/world-terrain.js';
import * as THREE from '../vendor/three.module.js';
import {
  SOUTHWEST_REGIONS, SOUTHWEST_NORTH_REGIONS, MEROSHE_REGIONS,
  SOUTHWEST_CLIMATE, NAVARTH_CLIMATE, WEST_PYROS_CLIMATE,
  GANESH_DESERT_CLIMATE, GANESH_PLAIN_CLIMATE, ARIDITY, SOUTHWEST_TILT, GANESH_BASIN,
  GANESH_WASHES, GANESH_DAMP, GANESH_PLAIN_CHANNELS, GANESH_DEPRESSIONS, NAVARTH_CRESTS,
  SOUTHWEST_LANDMARKS, SOUTHWEST_BOX, SOUTHWEST_SWALE,
  MEROSHE_CLIMATE, NORTH_MEROSHE_CLIMATE, WEST_MEROSHE_CLIMATE, CENTRAL_MEROSHE_CLIMATE, SOUTH_MEROSHE_CLIMATE,
  MEROSHE_BENCHES, MEROSHE_SKIRT, MEROSHE_FANS, MEROSHE_SALT, MEROSHE_SINK, MEROSHE_DUNES, MEROSHE_FOG, MEROSHE_BOX,
  southwestAridity, southwestKoppen, southwestGround, southwestWeight, southwestClear,
  ganeshLie, ganeshDamp, inDepression, ganeshDepressionCut, onWashFloor, onChannelFloor,
  nearestWash, navarthCrests, regionShare, merosheShare,
  merosheBench, merosheBenches, merosheSkirt, merosheFan, merosheFans, merosheSink,
  merosheErg, merosheDunes, merosheCorridor, duneProfile, merosheFog, merosheVarnish, onSaltPan, saltPanLevel,
  WEST_EDGE_REGIONS, CAPE_HETH_CLIMATE, DINELV_CLIMATE, HAMA_CLIMATE, WEST_EDGE_CLIMATE, COAST_HEX_DRY,
  HETH_SPINE, HETH_HOLLOWS, hethSpine, hethSpray, inHethHollow,
  DINELV_RIDGES, DINELV_GAPS, DINELV_BASINS, DINELV_MESAS, DINELV_BANDS, DINELV_CHANNELS, DINELV_ASCENT,
  DINELV_STRIKE, dinelvAlong, dinelvAcross, dinelvPoint, dinelvRidgeAt, dinelvMesaAt, inDinelvBasin,
  dinelvAscentAt, dinelvBands, HAMA_BROKEN, HAMA_BEDS, hamaGreen, hamaLie, inHamaBed, westEdgeShare,
  EAST_EDGE_REGIONS, MAROSH_CLIMATE, TROGO_CLIMATE, EAST_EDGE_CLIMATE, eastEdgeShare,
  MAROSH_RIDGE, MAROSH_GAP, MAROSH_COMBES, maroshRidgeAt, maroshCrest, inMaroshCombe,
  TROGO_CREST, TROGO_GULLIES, TROGO_PATHS, TROGO_CLEARINGS, TROGO_WAY,
  trogoCrestAt, trogoThicket, trogoWay, trogoBand, trogoFogForest, inTrogoClearing, onTrogoGullyFloor,
  SOUTHWEST_SWALE_RIVERS, SOUTHWEST_TINT_ROWS, SOUTHWEST_TINT_REGIONS, southwestTint, southwestTintRow,
} from '../src/southwest-world.js';
import { SOUTHWEST_WILDLIFE_ZONES } from '../src/southwest-wildlife.js';
import { DEFAULT_SKY, regionSky } from '../src/region-sky.js';
import { SUBREGIONS } from '../src/map-fog.js';
import { regionBuildStatus } from '../src/build-status.js';
import { regionLevel } from '../src/region-levels.js';
import { REGION_LANGUAGE, DIALECTS } from '../src/languages.js';
import { DEV_WORLD_DESTINATIONS } from '../src/developer-atlas.js';

/**
 * The southwestern block, in two halves and two jobs.
 *
 * **Job 1** — Navarth, West Pyros, the Ganesh Desert and the Ganesh Plain — built as terrain,
 * climate, water, scenery and wildlife and nothing that belongs to anybody
 * (docs/southwest-1-brief.md, 30 September 2026). A hundred and seven authored hexes over four
 * countries, and the first `BWh` ground in the game.
 *
 * **Job 2** — the North, West, Central and South Meroshe Deserts (docs/southwest-2-brief.md, the
 * same day). Ninety-five more hexes, `plains` on every one and `BWh` on every one: the largest
 * single-character expanse the atlas draws anywhere, and the one job in this project where the atlas
 * cannot tell four countries apart. What tells them apart is the **surface** - hamada, fan skirt and
 * salt pan, erg, reg under fog - and the tests for it are at the end of this file. Two things moved
 * that nobody expected: **the world box grew south**, from 45.656 hexes tall to 53.450, and the
 * survey window with it in *both* axes (`maxR` 135 to 144 and, because x = W(q + r/2), `minQ` -41 to
 * -45 without any country reaching west at all).
 *
 * The standing rule is the user's: the atlas wins over the lore. So most of what is asserted below
 * is the atlas's own arithmetic — twenty-two hexes and twenty-seven and thirty-one and twenty-seven,
 * thirty-nine internal edges, twenty-eight authored river edges in two chains, and a climate read
 * hex for hex off the World Builder map, which is checked against the map itself whenever it is on
 * the machine to ask.
 *
 * Three things make this block different from every one before it and each has its own test:
 * **none of the four touches a built country**, so every margin is outland and the block's internal
 * coherence is the only standard; **the world box grew west**, from 36.20 hexes to 45.70, which is
 * more than anything has spent in that direction; and **the climate is a gradient**, where the Oves
 * and the Mithala each had one code over a whole block.
 */

const FOUR = ['Navarth', 'West Pyros', 'Ganesh Desert', 'Ganesh Plain'];
const MEROSHE = ['North Meroshe Desert', 'West Meroshe Desert', 'Central Meroshe Desert', 'South Meroshe Desert'];
const EDGE = ['Cape Heth', 'Dinelv Highlands', 'Hama'];
const EAST = ['Marosh', 'Trogo'];
const BLOCK = [...FOUR, ...MEROSHE, ...EDGE, ...EAST];
const AXIAL = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const MAP_PATH = new URL('../../world-builder/map/resources/examples/azhora.wwmap', import.meta.url);
const H = groundWithRiver;
const owner = new Map();
for (const name of Object.keys(REGION_CELLS)) for (const cell of REGION_CELLS[name]) owner.set(`${cell.q},${cell.r}`, name);
const cellsOf = name => REGION_CELLS[name];
const terrainCount = name => cellsOf(name).reduce((tally, cell) => {
  tally[cell.terrain] = (tally[cell.terrain] ?? 0) + 1; return tally;
}, {});
const step = (x, z) => {
  let worst = 0;
  for (const [dx, dz] of [[2, 0], [0, 2], [1.41, 1.41], [1.41, -1.41]]) worst = Math.max(worst, Math.abs(H(x + dx, z + dz) - H(x - dx, z - dz)));
  return worst;
};
const shareOf = names => (x, z) => {
  const weights = terrainMix(x, z).weights;
  let own = 0; for (const name of names) own += weights[name] ?? 0;
  return own;
};
const blockShare = shareOf(FOUR);
const wholeShare = shareOf(BLOCK);

test('the atlas gives four countries a hundred and seven hexes, in the order the brief fixed', () => {
  // 32-35 as built, 39-42 as landed: the Ibenwood belt landed first and took 32-38, and the whole
  // block moved seven places behind it. The same seven are added in the three lists below.
  assert.deepEqual(FOUR.map(name => REGION_IDS[name]), [39, 40, 41, 42]);
  assert.deepEqual(SOUTHWEST_NORTH_REGIONS, FOUR);
  assert.deepEqual(SOUTHWEST_REGIONS, BLOCK, 'the module\u2019s own list is all four jobs');
  // Appended, never inserted: `world-regions.js` walks PLAYABLE_REGIONS with one seeded scatter
  // stream, so a name put anywhere but the end re-rolls every region after it.
  //
  // **This assertion used to read `PLAYABLE_REGIONS.slice(at)` and be compared with these four**,
  // which says "these are the last four in the list" when what it means is "these come after
  // everything that was there before". It is the fourth file in which that mistake has been found
  // and rewritten - the West Lotharn builder fixed it in `oves-world`, the Mithala builder in
  // `west-lotharn-world`, job 1 in `mithala-world` twice - and job 2 broke it here by appending four
  // more. So it now finds its own index and checks the order rather than the length, and
  // `tests/region-layout.test.js` carries the **permanent guard** the fourth generation earned: that
  // PLAYABLE_REGIONS is in strictly increasing `REGION_IDS` order with no gaps, everywhere, for
  // every country, so nobody needs the "last N" idiom again.
  const at = PLAYABLE_REGIONS.indexOf('Navarth');
  assert.deepEqual(PLAYABLE_REGIONS.slice(at, at + 4), FOUR);
  for (const name of PLAYABLE_REGIONS.slice(at)) assert.ok(REGION_IDS[name] >= 32, `${name} comes after the block with a lower id`);
  for (const name of FOUR) assert.ok(PLAYABLE.includes(name), `${name} is in the survey`);
  assert.deepEqual(FOUR.map(name => cellsOf(name).length), [22, 27, 31, 27]);
  assert.equal(FOUR.reduce((sum, name) => sum + cellsOf(name).length, 0), 107);
  assert.deepEqual(terrainCount('Navarth'), { forest: 1, hills: 10, plains: 11 });
  assert.deepEqual(terrainCount('West Pyros'), { plains: 26, grassland: 1 });
  assert.deepEqual(terrainCount('Ganesh Desert'), { plains: 31 });
  assert.deepEqual(terrainCount('Ganesh Plain'), { plains: 26, grassland: 1 });
  // The one `forest` hex and the two `grassland` hexes are the block's three odd ones, and every one
  // of them is also one of its wettest: the forest is `Csb` at Navarth's Ibenwood tip, and both
  // grassland hexes are `Csa`, one hex from the southern sea. The atlas's terrain and its climate
  // agree with each other, which is why those three hexes carry features rather than bands.
  const odd = FOUR.flatMap(name => cellsOf(name).filter(cell => cell.terrain === 'forest' || cell.terrain === 'grassland')
    .map(cell => [cell.terrain, SOUTHWEST_CLIMATE[`${cell.q},${cell.r}`]]));
  assert.deepEqual(odd.sort(), [['forest', 'Csb'], ['grassland', 'Csa'], ['grassland', 'Csa']]);
});

test('the climate is a gradient, which is a first: BWh over eighty-one hexes, and two green corners', () => {
  assert.equal(Object.keys(SOUTHWEST_CLIMATE).length, 322, 'all four jobs, hex for hex - the whole southwest quarter');
  const tally = {};
  for (const name of FOUR) for (const cell of cellsOf(name)) {
    const code = SOUTHWEST_CLIMATE[`${cell.q},${cell.r}`];
    tally[code] = (tally[code] ?? 0) + 1;
  }
  assert.deepEqual(tally, { BWh: 81, BSh: 18, Csb: 6, Csa: 2 });
  assert.equal(Object.keys(NAVARTH_CLIMATE).length, 22);
  assert.equal(Object.keys(WEST_PYROS_CLIMATE).length, 27);
  assert.equal(Object.keys(GANESH_DESERT_CLIMATE).length, 31);
  assert.equal(Object.keys(GANESH_PLAIN_CLIMATE).length, 27);
  // The Ganesh Desert is the first country in the game with hot desert on every one of its hexes.
  assert.deepEqual([...new Set(Object.values(GANESH_DESERT_CLIMATE))], ['BWh']);
  // Every hex of the block is recorded, and no hex of anybody else's is.
  for (const name of FOUR) for (const cell of cellsOf(name))
    assert.ok(SOUTHWEST_CLIMATE[`${cell.q},${cell.r}`], `(${cell.q},${cell.r}) has no climate`);
  // Held to the World Builder map itself when the map is on the machine.
  if (existsSync(MAP_PATH)) {
    const map = JSON.parse(readFileSync(MAP_PATH, 'utf8').replace(/^﻿/, ''));
    for (const [key, code] of Object.entries(SOUTHWEST_CLIMATE))
      assert.equal(map.hexes[key]?.climate, code, `${key} reads ${map.hexes[key]?.climate} on the map`);
  }
  // The gradient runs west to east and is smooth, not stepped: aridity at the Ganesh's middle is
  // the driest value there is, and at the green tip it is under a fifth of it.
  assert.ok(southwestAridity(-3560, 1520) > .99, 'the Ganesh is as dry as the scale goes');
  assert.ok(southwestAridity(-2560, 1670) < .3, 'the green tip is not');
  assert.ok(southwestAridity(-3300, 900) < .45, 'the Ibenwood corner is not either');
  assert.equal(southwestKoppen(-3560, 1520), 'BWh');
  assert.equal(southwestKoppen(-2550, 1674), 'Csa');
  assert.equal(ARIDITY.BWh, 1);
  // No jump anywhere: walking the block on a 20 m lattice, aridity never changes by more than a
  // twentieth in one step, which is what blending a hex field on the ground's own falloff buys.
  let worst = 0;
  for (let x = SOUTHWEST_BOX.minX; x <= SOUTHWEST_BOX.maxX; x += 20) for (let z = SOUTHWEST_BOX.minZ; z <= SOUTHWEST_BOX.maxZ; z += 20) {
    if (blockShare(x, z) < .5 || blockShare(x + 20, z) < .5) continue;
    worst = Math.max(worst, Math.abs(southwestAridity(x + 20, z) - southwestAridity(x, z)));
  }
  // Steepest measured: 0.157 over twenty metres, at (-2750, 1870) in the Ganesh Plain's
  // south-eastern corner, which is where the map itself puts `Csa` against `BWh` one hex apart.
  // That is the gradient the atlas draws and not a seam in the blend; there is no discontinuity.
  //
  // **Job 3 re-measured it over all eleven countries and it went down, to 0.149 at (-2725, 1760).**
  // Hama is the block's second real gradient - nine `Csb` hexes against ten `BWh` - and it is a
  // *gentler* one than the Ganesh Plain's corner, because `Csb` is a whole step wetter than `Csa` on
  // this scale and the blend has two hexes to do it in rather than one. The wettest edge in the block
  // is not the steepest, which is the opposite of what a line drawn twice by the atlas suggests.
  assert.ok(worst < .2, `aridity jumps ${worst.toFixed(3)} in twenty metres`);
});

test('the world box grew west, then south, then west again, and job 4 grew it south once more', () => {
  // **West, for job 1.** Nethereum set the western edge at -3010.002; the Ganesh Desert's
  // westernmost hexes are (-33,123) through (-33,126), whose outer flat stands at x = -3900, so the
  // edge went to -3960.002 and the world from 36.20 hexes wide to 45.70.
  //
  // **West again, for job 3, and nobody expected that either.** Job 2's report predicted that job 3
  // would not move the box at all, on the ground that Cape Heth's columns (q -39...-34) lie well
  // inside the survey window - which is true of the window and says nothing about the box, because
  // x = W(q + r/2) and Cape Heth's rows are four higher than the Ganesh Desert's. Cape Heth's
  // westernmost hex is its one `coast` hex, (-39,127), whose centre stands at x = **-4250** where the
  // Ganesh Desert's westernmost centres stand at -3850; its outer flat is at -4300 and the margin 60,
  // so `minX` goes to **-4360.001927939127** and the world from 45.700 hexes wide to **49.700**.
  // Nothing else moves: the Dinelv Highlands reach x = -3900 and Hama -3500, and Hama's southernmost
  // hexes stand at exactly the row the South Meroshe already set, so `maxZ` does not budge. **Three
  // briefs in a row have now predicted that the box would hold and been wrong twice**; the lesson is
  // not about any one axis, it is that a prediction about the window is not a prediction about the box.
  //
  // **South, for job 2, and nobody expected it either.** The brief predicted no movement at all: the
  // Meroshe's westernmost hex is the West Meroshe's (-37,133) at x = -3750, a hundred and fifty
  // metres inside the edge job 1 set, so `minX` does not move and is checked here for that. What
  // moves is `maxZ`: the South Meroshe Desert's southernmost hexes are (-32,141) and (-31,141),
  // centres at z = 3060.089 and lower vertices a circumradius (57.735 m) past that at 3117.824, so
  // the southern edge goes from 2398.401 to **3177.824** and the world from 45.656 hexes tall to
  // **53.450**. It is 45.70 by 53.45 now: taller than it is wide, for the first time since the
  // Ascarth Peninsula, and no direction is left that a playable country has not spent.
  // ...and since the Ibenwood belt landed alongside, the western edge is West Ibenwood's and not this
  // block's: its rim at x = -4550 stands two hundred and fifty metres past Cape Heth's, so the edge is
  // -4610.002 and the world 52.20 hexes wide. The block's own reach west is still Cape Heth's -4300.
  // ...and since Alezhor was registered (4 October 2026) the western edge is its west lobe's, (-37,117), whose rim at
  // x = -4600 stands fifty metres past West Ibenwood's: -4660.002.
  // ...and since South Ibenal was registered (the same day) it is South Ibenal's, (-38,115), whose rim at x = -4800 stands two
  // hundred metres past Alezhor's: -4860.002.
  assert.ok(Math.abs(WORLD_BOUNDS.minX - -4860.001927939128) < 1e-6, `minX is ${WORLD_BOUNDS.minX}`);
  // Since the Baldro Mountains landed as regions 52 and 53 the eastern and northern edges are theirs:
  // maxX 2209.998, minZ -3899.247, the world 68.20 by 73.369 hexes, the window's maxQ 60 and minR 59.
  // Babon now sets the southern edge at z3437.632, two atlas rows beyond Trogo.
  // Every assertion below that holds one of those numbers holds the Baldros' and nothing of this country's.
  assert.ok(Math.abs(WORLD_BOUNDS.maxX - 2209.9980720608737) < 1e-6, `maxX is ${WORLD_BOUNDS.maxX}`);
  assert.ok(Math.abs(WORLD_BOUNDS.minZ - -3899.2468035704924) < 1e-6, `minZ is ${WORLD_BOUNDS.minZ}`);
  // **South again, for job 4, and job 2 predicted the number a job and a half in advance.** Trogo's
  // southernmost hexes are (-29,142), (-28,142) and (-27,142), centres at z = 3146.69 and lower
  // vertices a circumradius (57.735 m) past that at 3204.43, so `maxZ` goes from 3177.824 to
  // **3264.4264805429416** - job 2's own arithmetic said "about 3264.4" - and the world from 53.450
  // hexes tall to **54.316**. Nothing else moves: Trogo reaches x = -2050 and Marosh -2750, where Cape
  // Heth's edge stands at -4360.002.
  assert.ok(Math.abs(WORLD_BOUNDS.maxZ - 3437.6315612998296) < 1e-6, `maxZ is ${WORLD_BOUNDS.maxZ}`);
  const wide = (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX) / METRES_PER_HEX;
  const tall = (WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ) / METRES_PER_HEX;
  // 49.70 was this block's own doing; the other two and a half hexes are West Ibenwood's (see minX above), the next half
  // a hex Alezhor's west lobe's, and the last two South Ibenal's coast.
  assert.ok(Math.abs(wide - 70.70) < .01, `east to west is ${wide.toFixed(2)} hexes`);
  assert.ok(Math.abs(tall - 73.369) < .01, `north to south is ${tall.toFixed(3)} hexes`);
  // **Cape Heth alone spends the west now**, and the Ganesh Desert alone spent it before: no other
  // country in eleven reaches past -3900, which is the Dinelv Highlands' own western row.
  const westmost = Object.fromEntries(BLOCK.map(name => [name, Math.min(...cellsOf(name).map(cell => cell.x))]));
  assert.ok(Math.abs(westmost['Cape Heth'] - -4250) < 1, `Cape Heth's westernmost hex centre is ${westmost['Cape Heth'].toFixed(1)}`);
  assert.ok(Math.abs(westmost['Ganesh Desert'] - -3850) < 1, `the Ganesh Desert's westernmost hex centre is ${westmost['Ganesh Desert'].toFixed(1)}`);
  for (const name of BLOCK.filter(item => item !== 'Cape Heth'))
    assert.ok(westmost[name] > westmost['Cape Heth'], `${name} does not spend the western edge`);
  // And the one hex that spends it is the `coast` hex, which is the only one any country holds.
  const point = cellsOf('Cape Heth').find(cell => cell.terrain === 'coast');
  assert.deepEqual([point.q, point.r], [-39, 127]);
  assert.ok(Math.abs(point.x - -4250) < 1, `the point of the cape stands at ${point.x.toFixed(1)}`);
  // **Trogo alone spends the south now**, and the South Meroshe spent it before.
  const southmost = Object.fromEntries(BLOCK.map(name => [name, Math.max(...cellsOf(name).map(cell => cell.z))]));
  assert.ok(Math.abs(southmost['South Meroshe Desert'] - 3060.0889132455354) < 1e-6, `the South Meroshe's southernmost hex centre is ${southmost['South Meroshe Desert']}`);
  assert.ok(Math.abs(southmost.Trogo - 3146.691453623979) < 1e-6, `Trogo's southernmost hex centre is ${southmost.Trogo}`);
  for (const name of BLOCK.filter(item => item !== 'Trogo'))
    assert.ok(southmost[name] <= southmost.Trogo, `${name} is south of Trogo`);
  // **Hama ties the South Meroshe's row to the millimetre**, which is why job 3 did not move `maxZ`.
  assert.ok(Math.abs(southmost.Hama - southmost['South Meroshe Desert']) < 1e-6,
    `Hama's southernmost hex centre is ${southmost.Hama}`);
  assert.ok(WORLD_BOUNDS.maxZ > southmost.Trogo + 57.7 + 59, 'the edge clears the hex rim by the 60 m margin');
  // And nothing in job 4 moves the west: Marosh and Trogo stand eleven hundred metres east of Cape Heth.
  assert.ok(westmost.Marosh > -2800 && westmost.Trogo > -2700, 'job 4 does not spend the western edge');
  // **`minQ` has now moved three times and is -49.** -41 was job 1's, measured off the lattice the
  // Ganesh Desert widened; -45 was job 2's, a side effect of moving the *southern* edge, because
  // x = W(q + r/2) puts a low q and a high r at the same world x; and -49 is job 3's, measured off the
  // lattice Cape Heth widened. **The last move pulls in nothing at all** - the four columns q -49...-46
  // hold no claimed hex anywhere on the atlas in rows 79-144, because west of Cape Heth the map is open
  // ocean to the edge of the sheet - so the generated survey is identical either way and LAND_HEXES does
  // not change. The value moves because the invariant this window keeps is "the last column the lattice
  // reaches, and no slack", and a window that lied about that would be a trap for the next builder.
  // **And `minQ` has moved a fourth time, again without anything reaching west.** Trogo's row 142 takes
  // the lattice one row deeper in the south, and x = W(q + r/2), so one row south is half a column west
  // at the same world x: q = -50 is reached only on rows 144 and 145, in the far south-western corner of
  // the sheet where the map is open ocean. **That is the second time this has happened** (job 2's nine
  // rows bought four columns) and it is the reason job 3's report says a prediction about the window is
  // not a prediction about the box: this job's brief predicted the box might move south, and the box did
  // move south *and* the window moved west, which is not the same statement.
  // -49 was this block's own (Cape Heth's edge at Trogo's rows) and -50 the forest belt's. -52 is
  // neither's: it is West Ibenwood's western edge taken down to Trogo's southern rows, a corner of the
  // box that no country stands in. The two columns it adds hold no claimed hex, and the generated
  // survey is byte-identical either way.
  // -54 is Alezhor's west lobe's, the same way: its rim at x = -4600 takes the western edge fifty metres further, and
  // the lattice's south-western corner a column with it - open ocean, and the survey byte-identical again.
  // -56 is South Ibenal's coast's: its rim at x = -4800 takes the edge two hundred metres further, and the corner two
  // columns with it - open ocean, and the survey byte-identical once more.
  assert.equal(WINDOW.minQ, -56);
  assert.equal(WINDOW.maxQ, 60);
  assert.equal(WINDOW.minR, 59);
  assert.equal(WINDOW.maxR, 147);
  const CELL = 4, MARGIN = 96, PHASE = { x: -1556.0019279391274, z: -704.3502691896258 };
  const snap = (value, phase) => phase + Math.floor((value - phase) / CELL + 1e-9) * CELL;
  const firstX = snap(WORLD_BOUNDS.minX - MARGIN, PHASE.x), firstZ = snap(WORLD_BOUNDS.minZ - MARGIN, PHASE.z);
  const columns = Math.ceil((WORLD_BOUNDS.maxX + MARGIN - firstX) / CELL) + 1;
  const rows = Math.ceil((WORLD_BOUNDS.maxZ + MARGIN - firstZ) / CELL) + 1;
  const lastZ = firstZ + (rows - 1) * CELL, lastX = firstX + (columns - 1) * CELL;
  let west = 99, deep = -99;
  for (let z = firstZ; z <= lastZ; z += CELL) west = Math.min(west, hexAt(firstX, z).q, hexAt(firstX + CELL, z).q);
  for (let x = firstX; x <= lastX; x += CELL) deep = Math.max(deep, hexAt(x, lastZ).r, hexAt(x, lastZ - CELL).r);
  assert.equal(WINDOW.minQ, west, 'the window stops at the last column the lattice reaches: no slack, and nothing left out');
  assert.equal(WINDOW.maxR, deep, 'and at the last row it reaches');
  // Job 1's widening bought only horizon: all four of its countries lay inside q >= -33, so none of
  // the 71 hexes it turned from sea into land was its own. **Job 2's bought its own ground**, and
  // that is the difference: the South Meroshe's twenty-one hexes, eight of the Central's and four of
  // the West's all lie south of row 135, so without the widening thirty-three hexes of a playable
  // country would have been open water. **Job 3's bought nothing**: its seventy-three hexes were all
  // inside job 2's window already - which is exactly why Cape Heth was in LAND_HEXES as job 1's
  // horizon before it was playable - so LAND_HEXES stays at 2,078 across all three jobs.
  for (const name of FOUR) for (const cell of cellsOf(name)) assert.ok(cell.q >= -33, `(${cell.q},${cell.r}) was outside the old window`);
  const beyond = MEROSHE.flatMap(name => cellsOf(name)).filter(cell => cell.r > 135);
  assert.equal(beyond.length, 33, 'thirty-three of the block\u2019s own hexes were outside the old window');
  const land = new Set(LAND_HEXES.map(([q, r]) => `${q},${r}`));
  // **Job 4's widening buys exactly one hex, and it is the one Trogo's own lore looks at.** Rows 79-145
  // in columns -50...-46 hold no claimed hex anywhere; row 145 holds one, **(1,145), an Azhor Stones hex
  // whose terrain word is `deep_forest` like Trogo's own**. `trogo.md`: "The southeastern coast of Trogo
  // faces the southern ocean and the Azhor Stones, which are visible from the higher coastal headlands on
  // clear days." It stands at x = 650, z = 3406 - two thousand eight hundred metres out from Trogo's
  // nearest hex and past `maxX` - so it is horizon and nothing else. That is the smallest widening this
  // window has ever had: job 1's bought 71 hexes, job 2's 143, job 3's none and job 4's one.
  // 2,079 until the Baldro Mountains carried the window to maxQ 60 and minR 59: 903 more claimed hexes are inside it.
  // And two more since the game's own atlas adjustment gave Drent its forested peninsula east of Tidehaven.
  // Babon's wider southern horizon includes one more authored offshore hex.
  assert.equal(LAND_HEXES.length, 2985, 'the survey includes the complete Babon horizon');
  assert.ok(land.has('1,145'), 'the Azhor Stones hex row 145 is the one the widening bought');
  assert.equal(hexCentre(1, 145).x > 600 && hexCentre(1, 145).z > 3400, true, 'and it is out past the eastern edge');
  for (const name of EDGE) for (const cell of cellsOf(name))
    assert.ok(cell.q >= -45 && cell.r <= 144, `(${cell.q},${cell.r}) was outside job 2's window`);
  // Job 4's own hexes were all inside job 3's window except the three on row 142.
  const pastJob3 = EAST.flatMap(name => cellsOf(name)).filter(cell => cell.r > 141);
  assert.equal(pastJob3.length, 3, 'three of Trogo\u2019s hexes are south of everything job 3 built');
  for (const name of BLOCK) for (const cell of cellsOf(name)) assert.ok(land.has(`${cell.q},${cell.r}`), `(${cell.q},${cell.r}) is not land`);
});

test('the block is one island of ground, and nine hex edges of the Ibenwood now join it to the built world', () => {
  const built = new Set(PLAYABLE_REGIONS);
  const neighbours = {};
  let internal = 0, job1 = 0, job2 = 0, job3 = 0, job4 = 0, across = 0;
  for (const name of BLOCK) for (const cell of cellsOf(name)) for (const [dq, dr] of AXIAL) {
    const other = owner.get(`${cell.q + dq},${cell.r + dr}`);
    if (!other || other === name) continue;
    if (BLOCK.includes(other)) {
      internal++;
      const group = who => (FOUR.includes(who) ? 1 : MEROSHE.includes(who) ? 2 : EDGE.includes(who) ? 3 : 4);
      const a = group(name), t = group(other);
      if (a !== t) across++; else if (a === 1) job1++; else if (a === 2) job2++; else if (a === 3) job3++; else job4++;
      continue;
    }
    neighbours[other] = (neighbours[other] ?? 0) + 1;
  }
  // **The whole point of the block's shape, and four jobs have not changed it.** Nothing in any of the
  // thirteen shares an edge with a built country outside the block: the built frontier in the west is
  // Nethereum and Isareos, which border the unbuilt Ibenwoods. So the whole southwest is reached by
  // F8 travel and by nothing else until the forest belt lands - **and the programme is finished, so the
  // Ibenwoods are the only thing that can ever change it.** The unbuilt neighbours left on these
  // margins are Alezhor, Ibenale, the three Ibenwoods, East Pyros, the Nether Desert, Babon and the
  // Azhor Stones, and nothing in the southwest quarter itself is unbuilt any more.
  //
  // **And the forest belt landed, on 2026-10-01, from the other side of the same merge.** The paragraph
  // above was true for all four jobs and is kept as what they built against. What is true now is that
  // the block has a door: Navarth's northern border meets South Ibenwood on five hex edges and East
  // Ibenwood on three, and West Pyros meets East Ibenwood on one. Nine edges, all on the north side,
  // and East Pyros (20 edges) and the Nether Desert (1) are now built too; Alezhor (8) remains unbuilt.
  // Nobody has yet walked through that door or looked at the ground on either side of it.
  // Alezhor was built on 4 October 2026 (src/alezhor-world.js): its eight edges are the Alezhor Water's, five
  // with Navarth and three with the Ganesh Desert, and its bank meets the water at the water's own level.
  const builtOutside = Object.fromEntries(Object.entries(neighbours).filter(([other]) => built.has(other)));
  assert.deepEqual(builtOutside, { 'South Ibenwood': 5, 'East Ibenwood': 4, 'East Pyros': 20, 'Nether Desert': 1, Alezhor: 8 },
    'the forest belt and the built dryland and coast neighbors share the atlas borders');
  assert.equal(job1 / 2, 46, 'forty-six internal hex edges among job 1\u2019s four');
  assert.equal(job2 / 2, 30, 'thirty among job 2\u2019s four');
  assert.equal(job3 / 2, 8, 'eight among job 3\u2019s three, all of them Cape Heth | Dinelv');
  // **One hex edge between Marosh and Trogo**, and it is the whole of what joins job 4's two: Marosh's
  // southernmost `grassland` hex (-25,135) against Trogo's northernmost `deep_forest` hex (-25,136). A
  // Mediterranean terrace and a tropical rainforest, one hex edge apart, which is the second most
  // abrupt thing on the atlas after Trogo's own desert margin.
  assert.equal(job4 / 2, 1, 'one hex edge between Marosh and Trogo');
  assert.equal(across / 2, 100, 'and a hundred between the four jobs');
  assert.equal(internal / 2, 185);
  // **Job 3's three are not one piece**, which is worth stating: Cape Heth and the Dinelv Highlands
  // share eight hex edges and Hama touches neither of them. Hama's only neighbours in eleven
  // countries are the three Meroshe quarters, nineteen edges in all, so the way from the plateau to
  // the green corner is across job 2's desert.
  let hamaEdges = 0;
  for (const cell of cellsOf('Hama')) for (const [dq, dr] of AXIAL) {
    const other = owner.get(`${cell.q + dq},${cell.r + dr}`);
    if (!other || other === 'Hama') continue;
    assert.ok(MEROSHE.includes(other), `Hama shares an edge with ${other}`);
    hamaEdges++;
  }
  assert.equal(hamaEdges, 19, 'nineteen Meroshe edges and nothing else');
  // Those ten are the only seam in the block with a built country on both sides of it, and they are
  // all one pair.
  let pair = 0;
  for (const cell of cellsOf('North Meroshe Desert')) for (const [dq, dr] of AXIAL)
    if (owner.get(`${cell.q + dq},${cell.r + dr}`) === 'Ganesh Plain') pair++;
  assert.equal(pair, 10);
});

test('one wavelength over all thirteen, and the internal seams have nothing in them', () => {
  for (const name of BLOCK) {
    const profile = REGION_TERRAIN[name];
    for (const entry of [profile, ...Object.values(profile.byTerrain ?? {})])
      assert.equal(entry.wave, 320, `${name} is off the block's wavelength`);
  }
  // Measured on all-block ground only: an outland point at the end of a seam is a rib and not a seam.
  const pairs = new Map();
  for (const name of BLOCK) for (const cell of cellsOf(name)) for (const [dq, dr] of AXIAL) {
    const other = owner.get(`${cell.q + dq},${cell.r + dr}`);
    if (!other || other === name || !BLOCK.includes(other)) continue;
    const mate = cellsOf(other).find(o => o.q === cell.q + dq && o.r === cell.r + dr);
    const key = [name, other].sort().join(' | ');
    if (!pairs.has(key)) pairs.set(key, 0);
    for (let i = 0; i < 24; i++) {
      const t = (i + .5) / 24;
      const x = cell.x + (mate.x - cell.x) * t, z = cell.z + (mate.z - cell.z) * t;
      if (wholeShare(x, z) < .999) continue;
      pairs.set(key, Math.max(pairs.get(key), step(x, z)));
    }
  }
  // Twenty-five seams now: job 1's five, job 2's four, job 3's one, job 4's one, and fourteen between
  // the four jobs. **The flattest of all twenty-five is Marosh | Trogo**, which is the one edge between
  // job 4's two countries: a `Csa` Mediterranean terrace at base 17 against `Af` rainforest at 52 ought
  // to be the steepest thing in the block, and the hex blend crosses thirty-five metres of base over a
  // hex and a quarter without a step in it, because that is what a base does and a crest is not authored
  // within reach of that edge.
  assert.equal(pairs.size, 25, 'twenty-five internal seams');
  // **Fourteen of the nineteen are under five metres, which was the bound for all ten of job 2's, and
  // the five that are not are the Dinelv escarpment - one to each of its five built neighbours.** That is not a defect and it is not hidden: it
  // is `hills` at base 96 meeting the Ganesh Plain's 22, the Ganesh Desert's 20, Cape Heth's 13 and
  // the West Meroshe's 14, with the whole eighty-metre fall carried by the hex blend and no landform
  // authored on any of those margins at all - which is the West Lotharn's own contract, "a mountain
  // front is what the atlas draws here", and the reason its report measures the front rather than
  // lowering a base to hide it. Measured on this test's own four-metre central difference: 7.66 m at
  // the worst point of the escarpment against 2.19 for everything else in eleven countries.
  for (const [key, worst] of pairs) {
    const scarp = key.includes('Dinelv Highlands');
    assert.ok(worst < (scarp ? 9 : 5), `${key} steps ${worst.toFixed(2)} m`);
  }
  // **The five steepest of the nineteen are the Dinelv escarpment and nothing else**, which is what
  // it should be: `hills` at base 96 against the Ganesh Plain's 22, the Ganesh Desert's 20, Cape
  // Heth's 13 and the West Meroshe's 14, with the whole eighty-metre fall carried by the hex blend
  // and no landform authored on any of those margins at all. That is the West Lotharn's own contract
  // - "a mountain front is what the atlas draws here" - and it is measured rather than hidden by a
  // lower base. Measured: 4.36 m in two metres at the worst point of it, against 1.12 for the
  // flattest seam job 2 could find and 0.27 for Hama's.
  const escarpment = [...pairs].filter(([key]) => key.includes('Dinelv Highlands')).map(([, worst]) => worst);
  const rest = [...pairs].filter(([key]) => !key.includes('Dinelv Highlands')).map(([, worst]) => worst);
  assert.equal(escarpment.length, 5, 'five escarpment seams');
  assert.ok(Math.min(...escarpment) > Math.max(...rest),
    `the escarpment (${Math.min(...escarpment).toFixed(2)} m) is not steeper than everything else (${Math.max(...rest).toFixed(2)} m)`);
  assert.ok(Math.max(...escarpment) > 6, 'the escarpment is a real front and is measured, not hidden');
  // **And Hama's three are the flattest in eleven countries**: a stony rise at base 28 meeting three
  // deserts at 14 and 16, with the block's one tilt plane running through all four of them and no
  // landform on any of the nineteen edges. Measured, 0.61 m at the worst of them.
  for (const [key, worst] of pairs) if (key.includes('Hama'))
    assert.ok(worst < 1, `${key} steps ${worst.toFixed(2)} m`);
  // **The seam between jobs 1 and 2 was the flattest of job 2's ten** - a plain of clay at base 22
  // meeting a rock floor at 21 over ten hex edges, on the same wavelength, with the block's own tilt
  // running through both, and job 2 measured 0.27 m across the whole of it. Job 3 puts the Dinelv
  // escarpment four hex edges from its western end, so the worst reading on it is now 2.19 m and all of
  // that is at that end; the test that holds the seam clear of the plateau is in the Ganesh Plain seam
  // test below, which measures 0.27 m still on the points where the blend holds no Dinelv at all.
  assert.ok(pairs.get('Ganesh Plain | North Meroshe Desert') < 2.4,
    `the halves meet with ${pairs.get('Ganesh Plain | North Meroshe Desert').toFixed(2)} m`);
});

test('Navarth is the block’s high ground, the Ganesh its lowest, and the ground falls to its two mouths', () => {
  const at = name => cellsOf(name).map(cell => H(cell.x, cell.z));
  const mean = list => list.reduce((a, b) => a + b, 0) / list.length;
  const navarth = at('Navarth'), pyros = at('West Pyros'), desert = at('Ganesh Desert'), plain = at('Ganesh Plain');
  assert.ok(mean(navarth) > 40, `Navarth means ${mean(navarth).toFixed(1)} m`);
  assert.ok(mean(navarth) > mean(pyros) + 12, 'Navarth stands well over West Pyros');
  assert.ok(mean(navarth) > mean(desert) + 24, 'and further over the Ganesh');
  assert.ok(mean(desert) < mean(plain), 'the desert lies below the plain it drains, so the plain’s channels run into it');
  // The swells the atlas draws are real relief and not a rounding: every one of Navarth's ten
  // `hills` hexes stands over the sweeps between them.
  assert.equal(NAVARTH_CRESTS.length, 10);
  assert.equal(cellsOf('Navarth').filter(cell => cell.terrain === 'hills').length, 10);
  for (const crest of NAVARTH_CRESTS) {
    const hex = cellsOf('Navarth').find(cell => Math.abs(cell.x - crest.x) < 1 && Math.abs(cell.z - crest.z) < 1);
    assert.ok(hex && hex.terrain === 'hills', `${crest.id} is not on a hills hex`);
    assert.ok(navarthCrests(crest.x, crest.z, 1) > crest.lift * .9, `${crest.id} does not stand up`);
  }
  // The two outlets are the block's datum, and each is the lowest ground near it.
  const gulf = ALEZHOR_WATER.points.at(-1), mouth = VAELLIR.points.at(-1);
  for (const [name, end] of [['the gulf', gulf], ['the Vaellir’s mouth', mouth]])
    assert.ok(H(end.x, end.z) < 12, `${name} stands at ${H(end.x, end.z).toFixed(1)} m`);
  // And the desert's own fall is one-sided: nothing at the Ganesh Plain margin where the lore says
  // the boundary is diffuse, its whole drop at the shore, so there is no ridge between the two.
  assert.ok(Math.abs(H(GANESH_BASIN.from.x, GANESH_BASIN.from.z) - 18) < 6, 'the desert’s eastern margin is at its own base');
  assert.ok(SOUTHWEST_TILT.perEast > 0 && SOUTHWEST_TILT.perNorth > 0, 'the block tilts toward the Vaellir’s mouth');
});

test('four courses now, two on a border and two inside a country, and every one reaches the sea', () => {
  // Twenty-eight authored edges in two chains, and not one of them inside any of the four: what a
  // desert quarter has is somebody else's rain going past its edge.
  const mine = RIVER_EDGES.filter(edge => edge.regions.some(region => FOUR.includes(region)));
  assert.equal(mine.length, 28);
  for (const edge of mine) assert.ok(edge.regions.some(region => !FOUR.includes(region)), `${edge.a}|${edge.b} is inside the block`);
  const vaellirEdges = mine.filter(edge => edge.regions.includes('West Pyros'));
  assert.equal(vaellirEdges.length, 20);
  const sizes = vaellirEdges.reduce((tally, edge) => { tally[edge.size] = (tally[edge.size] ?? 0) + 1; return tally; }, {});
  assert.deepEqual(sizes, { small: 5, medium: 11, large: 4 });
  // `large` is drawn three times on the whole atlas: the Lizeem through Caricas and Eer, and this.
  // **Job 4 doubles the block's water and changes its character.** Job 1's twenty-eight river edges all
  // run on a border with unbuilt country and jobs 2 and 3 have none at all - a hundred and sixty-eight
  // hexes of desert, cape, plateau and Mediterranean corner without one. Job 4 has seven, and **every
  // one of them has the same country on both banks**: three small edges round the corner of Marosh's
  // (-25,131), which is the water gap through its ridge, and four round Trogo's (-25,140) and (-25,141),
  // which is the Trogoreth. Both chains reach the sea.
  assert.equal(SOUTHWEST_RIVERS.length, 4);
  const inside = RIVER_EDGES.filter(edge => edge.regions.every(name => EAST.includes(name)));
  assert.equal(inside.length, 7, 'seven river edges inside job 4\u2019s two countries');
  assert.equal(inside.filter(edge => edge.regions[0] === edge.regions[1]).length, 7,
    'and every one has the same country on both banks');
  assert.deepEqual([...new Set(inside.map(edge => edge.size))], ['small'], 'all seven are small on the atlas');
  // **Both are waded anywhere, and that is deliberate.** Trogo already carries one movement rule
  // (`src/undergrowth.js`) and a walled river inside it would be a second barrier crossing the first.
  for (const course of [MAROSH_NAHR, TROGORETH]) assert.equal(course.fordUntil, 1, `${course.id} is walled somewhere`);
  // The swale is for the two courses drawn on an unbuilt border and for nothing else. **Leaving job 4's
  // two in that list flattened the ridges they run off**: measured, the Trogoreth's bank comes within
  // sixty-seven metres of the middle of Trogo's canopy and the swale ran at 0.91 there, which pulled
  // thirteen of the crest's seventeen metres back down to the blend's own base.
  assert.deepEqual(SOUTHWEST_SWALE_RIVERS.map(course => course.id), ['vaellir', 'alezhor-water']);
  for (const course of SOUTHWEST_RIVERS) {
    assert.ok(WEST_RIVERS.includes(course), `${course.id} is not in WEST_RIVERS`);
    const profile = WEST_PROFILES.get(course.id);
    for (let i = 1; i < profile.length; i++)
      assert.ok(profile[i].surface <= profile[i - 1].surface, `${course.id} climbs at sample ${i}`);
    for (const sample of profile)
      assert.ok(westGroundAt(sample.x, sample.z) <= sample.surface + .05, `${course.id} runs above its own bed at (${sample.x.toFixed(0)}, ${sample.z.toFixed(0)})`);
    assert.ok(landDistance(profile.at(-1).x, profile.at(-1).z) < 70, `${course.id} does not reach the sea`);
  }
  // The Vaellir is waded over its gravel head and is a wall below it; the Alezhor Water is waded
  // anywhere, which is the only reason Navarth and the Ganesh Desert are joined round the north.
  const vaellir = WEST_PROFILES.get(VAELLIR.id);
  const ford = vaellir.filter(sample => sample.ford).length;
  assert.ok(ford > 40 && ford < 70, `the Vaellir's ford is ${ford} of ${vaellir.length} samples`);
  assert.equal(WEST_PROFILES.get(ALEZHOR_WATER.id).every(sample => sample.ford), true);
  // The swale: at the water's edge on an unbuilt border the ground is the block's designed surface.
  assert.ok(SOUTHWEST_SWALE.inner === 45 && SOUTHWEST_SWALE.outer === 165);
  let worstBank = 0;
  for (const sample of vaellir) {
    if (sample.along < .1 || sample.along > .9) continue;
    for (const side of [-1, 1]) {
      const x = sample.x + sample.nx * 30 * side, z = sample.z + sample.nz * 30 * side;
      if (hexOwnerAt(x, z) !== 'West Pyros') continue;
      worstBank = Math.max(worstBank, step(x, z));
    }
  }
  assert.ok(worstBank < 2.5, `the Vaellir's own bank steps ${worstBank.toFixed(2)} m in two metres`);
});

test('the Ganesh is wind and stone, and the Ganesh Plain is its hollows', () => {
  // The wind field is three quarters of a metre and no more: the lore's surface is "flat or gently
  // rolling, the relief created by ancient alluvial processes rather than by active geological
  // uplift", with no canyon and no escarpment anywhere in it.
  let low = 9, high = -9;
  for (const cell of cellsOf('Ganesh Desert')) for (let i = 0; i < 40; i++) {
    const x = cell.x + (i % 8 - 4) * 11, z = cell.z + (Math.floor(i / 8) - 2) * 19;
    const lie = ganeshLie(x, z);
    if (lie > 0) { low = Math.min(low, lie); high = Math.max(high, lie); }
  }
  assert.ok(low < .25 && high > .75, `the wind field reads ${low.toFixed(2)}…${high.toFixed(2)}: swept ground and pockets both`);
  assert.equal(ganeshLie(-2900, 1250), 0, 'the wind field is the desert’s and stops at its border');
  // Two washes with nothing in either, both clear of the shore, and a damp reach on the lower one.
  assert.equal(GANESH_WASHES.length, 2);
  for (const wash of GANESH_WASHES) {
    const mid = wash.line[Math.floor(wash.line.length / 2)];
    assert.ok(onWashFloor(mid.x, mid.z), `${wash.id} has no floor at its middle`);
    assert.equal(westWaterSurface(mid.x, mid.z), null, `${wash.id} has water in it`);
    assert.ok(landDistance(wash.line.at(-1).x, wash.line.at(-1).z) > 80, `${wash.id} keeps a mouth open`);
    for (const point of wash.line) assert.equal(hexOwnerAt(point.x, point.z), 'Ganesh Desert', `${wash.id} leaves the desert`);
  }
  assert.equal(GANESH_DAMP.wash, 'south-wash');
  const south = GANESH_WASHES.find(wash => wash.id === 'south-wash');
  const damp = south.line[2];
  assert.ok(ganeshDamp(damp.x, damp.z) > .4, 'the damp reach is not damp');
  assert.equal(ganeshDamp(GANESH_WASHES[0].line[2].x, GANESH_WASHES[0].line[2].z), 0, 'the north wash is dry all the way');
  // Three shallow channels and eight depressions, all of them the Ganesh Plain's own, all of them dry.
  assert.equal(GANESH_PLAIN_CHANNELS.length, 3);
  assert.equal(GANESH_DEPRESSIONS.length, 8);
  for (const channel of GANESH_PLAIN_CHANNELS) {
    for (const point of channel.line) assert.equal(hexOwnerAt(point.x, point.z), 'Ganesh Plain', `${channel.id} leaves the plain`);
    const mid = channel.line[Math.floor(channel.line.length / 2)];
    assert.ok(onChannelFloor(mid.x, mid.z), `${channel.id} has no floor`);
    assert.equal(westWaterSurface(mid.x, mid.z), null, `${channel.id} has water in it`);
    // The channels run downhill toward the desert, which is what the lore says and what the atlas
    // makes possible by putting the desert west of the plain rather than south of it.
    assert.ok(H(channel.line.at(-1).x, channel.line.at(-1).z) < H(channel.line[0].x, channel.line[0].z),
      `${channel.id} runs uphill`);
  }
  for (const pan of GANESH_DEPRESSIONS) {
    assert.equal(hexOwnerAt(pan.x, pan.z), 'Ganesh Plain', `${pan.id} is not on the plain`);
    assert.ok(inDepression(pan.x, pan.z) > .9, `${pan.id} is not a hollow`);
    // Measured against the plain's own surface at the same point rather than against a ring round
    // it, and that is deliberate: this plain tilts a metre in a hundred, several of the hollows lie
    // within a hex of a margin where the ground falls away anyway, and two of them are close enough
    // to touch. A hollow here is a metre below the surface it is cut into - which is what makes the
    // water gather in it - and not a closed basin on a level floor.
    const share = regionShare('Ganesh Plain', pan.x, pan.z);
    assert.ok(share > .9, `${pan.id} is not on the plain's own ground`);
    assert.ok(ganeshDepressionCut(pan.x, pan.z, share) < -pan.depth * .85,
      `${pan.id} is cut ${(-ganeshDepressionCut(pan.x, pan.z, share)).toFixed(2)} m against its own ${pan.depth} m`);
    assert.ok(pan.depth >= .8 && pan.radius >= 70, `${pan.id} is too slight to hold anything`);
  }
  // Like the crests, the hollows are a maximum and not a sum, so past one edge a neighbour's may
  // still be there; what has to be true is that the open plain between them is not in any of them.
  for (const [x, z] of [[-3110, 1720], [-2760, 1620], [-2960, 1870], [-3120, 1740]])
    assert.ok(inDepression(x, z) < .01, `(${x}, ${z}) is open plain and reads as a hollow`);
});

test('the ribs against the outland are measured and left alone, and the block is walkable end to end', () => {
  // Every margin of this block is unbuilt, so the ribs Gala, Ovesos, the West Lotharn and the
  // Mithala all reported are here on every side of it. The cure belongs in `relief()`/`terrainMix`
  // and is a world-wide job; what this test holds is that they stay at the margin and that the
  // inside of the block is quiet.
  const inside = [], margin = [];
  for (const name of BLOCK) for (const cell of cellsOf(name)) for (let i = 0; i < 12; i++) {
    const x = cell.x + ((i % 4) - 1.5) * 34, z = cell.z + (Math.floor(i / 4) - 1) * 40;
    if (landDistance(x, z) < 30) continue;
    const share = wholeShare(x, z);
    if (share > .95) inside.push(step(x, z)); else if (share > .02) margin.push(step(x, z));
  }
  const p95 = list => [...list].sort((a, b) => a - b)[Math.floor(list.length * .95)];
  // **Job 2 measured p95 0.75 inside and this reads 2.80**, and the whole of the difference is one
  // country: the Dinelv escarpment, the three mesas' cliff faces and the sea cliff on the plateau's
  // south-western corner are the only ground in eleven countries steep enough to register. Measured
  // with the plateau left out, the p95 inside the other ten is still 0.79.
  assert.ok(p95(inside) < 3.2, `inside the block the 95th percentile step is ${p95(inside).toFixed(2)} m`);
  const flat = [];
  for (const name of BLOCK.filter(item => item !== 'Dinelv Highlands')) for (const cell of cellsOf(name)) for (let i = 0; i < 12; i++) {
    const x = cell.x + ((i % 4) - 1.5) * 34, z = cell.z + (Math.floor(i / 4) - 1) * 40;
    if (landDistance(x, z) < 30 || wholeShare(x, z) <= .95) continue;
    if (shareOf(['Dinelv Highlands'])(x, z) > .02) continue;
    flat.push(step(x, z));
  }
  // **Job 4 put a second and a third escarpment in the block**, so the bound moves: Marosh's ridge at
  // base 74 and Trogo's crest at 52 plus twenty-six both stand over a desert at 14, which is the same
  // contract the Dinelv escarpment has - a front is what the atlas draws here, and it is measured rather
  // than lowered to hide it. With all three of the block's high countries left out, the p95 inside the
  // other ten is still under job 3's own 1.2.
  assert.ok(p95(flat) < 2.4, `outside the plateau the 95th percentile step is ${p95(flat).toFixed(2)} m`);
  const level = [];
  for (const name of BLOCK.filter(item => !['Dinelv Highlands', 'Marosh', 'Trogo'].includes(item)))
    for (const cell of cellsOf(name)) for (let i = 0; i < 12; i++) {
      const x = cell.x + ((i % 4) - 1.5) * 34, z = cell.z + (Math.floor(i / 4) - 1) * 40;
      if (landDistance(x, z) < 30 || wholeShare(x, z) <= .95) continue;
      if (shareOf(['Dinelv Highlands', 'Marosh', 'Trogo'])(x, z) > .02) continue;
      level.push(step(x, z));
    }
  assert.ok(p95(level) < 1.2, `the block’s ten flat countries step ${p95(level).toFixed(2)} m at p95`);
  // **The margin is no longer the steepest thing in the block, and that is a first.** Every country
  // built before this one could say "the worst step inside is smaller than the worst step at the
  // outland margin", because nothing inside any of them was steep. The Dinelv escarpment, the three
  // tables' cliffs and the sea cliff are steeper than the rib: measured, 15.95 m inside against 11.52
  // at the margin. So what this holds is the thing that still means something - **the flat ten
  // countries are quieter inside than the margin is**, which is the original claim with the one
  // country that has a cliff in it taken out.
  assert.ok(Math.max(...margin) > Math.max(...level) * 2.5,
    `the margin (${Math.max(...margin).toFixed(2)} m) is not the noisy place it has always been (${Math.max(...level).toFixed(2)} m inside the flat countries)`);
  // And the whole block is one walkable piece: a flood fill on an eight-metre lattice from West
  // Pyros's own spawn reaches **all eight** countries, round the Vaellir rather than over it, over
  // the Ganesh Plain's divide, across the hamada's benches, along the sand sea's corridors and out
  // to the southern ocean. Two kilometres of desert end to end and no barrier anywhere in it: the
  // steepest thing in the Meroshe is a dune's lee face at about one in three.
  const spawn = regions.find(region => region.name === 'West Pyros').spawn;
  const seen = new Set(), reached = new Set();
  const queue = [[Math.round(spawn.x / 8) * 8, Math.round(spawn.z / 8) * 8]];
  while (queue.length) {
    const [x, z] = queue.pop(), key = `${x},${z}`;
    if (seen.has(key)) continue; seen.add(key);
    if (x < SOUTHWEST_BOX.minX || x > SOUTHWEST_BOX.maxX || z < SOUTHWEST_BOX.minZ || z > SOUTHWEST_BOX.maxZ) continue;
    const here = H(x, z);
    const name = hexOwnerAt(x, z);
    if (BLOCK.includes(name)) reached.add(name);
    for (const [dx, dz] of [[8, 0], [-8, 0], [0, 8], [0, -8]]) {
      if (seen.has(`${x + dx},${z + dz}`)) continue;
      if (westWaterSurface(x + dx, z + dz) !== null) continue;
      if (Math.abs(H(x + dx, z + dz) - here) > 4) continue;
      queue.push([x + dx, z + dz]);
    }
  }
  for (const name of BLOCK) assert.ok(reached.has(name), `${name} cannot be walked to from West Pyros`);
});

test('nothing of this block is written outside its own hexes, and nobody else’s ground moved', () => {
  // There is no built neighbour to step on, so what this holds is the weaker and still necessary
  // thing: `southwestGround` is exactly the ground it was handed wherever the block has no weight,
  // and the box it works in is its own hexes and a hex of margin.
  for (const [x, z] of [[-1700, -1414], [-2205, 902], [-1817, -651], [0, 29], [-1450, 700]])
    assert.equal(southwestGround(x, z, 12.5), 12.5, `(${x}, ${z}) is outside the block and was reshaped`);
  assert.equal(southwestWeight(-1700, -1414), 0);
  assert.ok(SOUTHWEST_BOX.minX < -3900 && SOUTHWEST_BOX.maxX > -2550);
  // And the scatter keeps off the dry beds, which is the one thing this block asks of it.
  const wash = GANESH_WASHES[0].line[2];
  assert.equal(southwestClear(wash.x, wash.z), true);
  assert.equal(southwestClear(-3560, 1520), false);
});

test('every animal stands on this block’s own ground, and the desert is nearly empty on purpose', () => {
  // Fifty-six: the four jobs' fifty-four, plus the ghubr in the Ganesh Desert and the canyon tortoise in
  // the Dinelv Highlands' north gap basin, which the user's two decisions of 2026-10-01 added.
  assert.equal(SOUTHWEST_WILDLIFE_ZONES.length, 56);
  const byRegion = {};
  for (const zone of SOUTHWEST_WILDLIFE_ZONES) byRegion[zone.region] = (byRegion[zone.region] ?? 0) + 1;
  assert.deepEqual(byRegion, { Navarth: 3, 'West Pyros': 7, 'Ganesh Desert': 4, 'Ganesh Plain': 4,
    Marosh: 6, Trogo: 11,
    'North Meroshe Desert': 2, 'West Meroshe Desert': 2, 'Central Meroshe Desert': 1, 'South Meroshe Desert': 2,
    'Cape Heth': 4, 'Dinelv Highlands': 5, Hama: 5 });
  // Thirty-one hexes and four ranges, two of them birds in the air: the honest dry-year reading, and the
  // lore's own — "the Ganesh in a severe dry year presents a surface that appears essentially lifeless."
  // The two on the ground are the hare on the damp reach and the ghubr in the northern pockets, and the
  // ghubr is the one animal of this country's own that the lore names.
  const ganesh = SOUTHWEST_WILDLIFE_ZONES.filter(zone => zone.region === 'Ganesh Desert');
  assert.equal(ganesh.filter(zone => !zone.air).length, 2);
  for (const zone of SOUTHWEST_WILDLIFE_ZONES) {
    assert.ok(BLOCK.includes(zone.region), `${zone.id} claims ${zone.region}`);
    assert.ok(zone.note && zone.note.length > 80, `${zone.id} has no note`);
    assert.ok(Math.hypot(zone.maxX - zone.minX, zone.maxZ - zone.minZ) / 2 < 130, `${zone.id}'s range is wider than it is run from`);
    for (const [x, z] of zone.sites) {
      assert.ok(x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ, `${zone.id}'s home is outside its range`);
      if (!zone.float && !zone.sea) assert.equal(hexOwnerAt(x, z), zone.region, `${zone.id}'s home at (${x}, ${z}) is on ${hexOwnerAt(x, z)}'s hex`);
      if (zone.air) continue;
      // **A sea range is out past the surf and is checked for being there**, which the loop used to miss:
      // job 4's dolphins are the block's first, and `inRange` is the only thing the life system asks of
      // an `air` or a `sea` zone, so nothing else here applies to one.
      if (zone.sea) { assert.ok(landDistance(x, z) < 0, `${zone.id} swims on dry land`); continue; }
      // A raft sits on a river the atlas draws on a hex edge, so what is under it is water and the
      // hex either side of the line; the ground checks below are for the ranges that stand on ground.
      if (zone.float) { assert.ok(westWaterSurface(x, z) !== null, `${zone.id} floats on dry land`); continue; }
      assert.equal(regionAt(x, z)?.name, zone.region, `${zone.id}'s home at (${x}, ${z}) is not in its own country`);
      assert.equal(westWaterSurface(x, z), null, `${zone.id}'s home is under water`);
      assert.equal(southwestClear(x, z), false, `${zone.id}'s home is on a dry bed's floor`);
      assert.ok(step(x, z) < 2, `${zone.id}'s home at (${x}, ${z}) steps ${step(x, z).toFixed(2)} m`);
    }
  }
  // The one new rig, and it is where the lore puts it: the desert margins. Job 1 spent it on three
  // zones and job 2 added one in each of the four Meroshe quarters without spending another rig.
  const boneBirds = SOUTHWEST_WILDLIFE_ZONES.filter(zone => zone.species === 'bone-bird');
  assert.equal(boneBirds.length, 10, 'job 4 added a tenth over Trogo\u2019s crest, and it is the last');
  for (const name of MEROSHE)
    assert.equal(boneBirds.filter(zone => zone.region === name).length, 1, `${name} has no bone-bird`);
  for (const zone of boneBirds) assert.ok(zone.air >= 38, `${zone.id} flies too low for a bird with two and a half metres of wing`);
  // Nothing domestic anywhere: Navarth's grey sheep, the plain's herds and the caravan animals all
  // belong to people, and this block has none of them.
  for (const zone of SOUTHWEST_WILDLIFE_ZONES)
    assert.ok(!['longhorn', 'hill-sheep', 'nethrani-cattle', 'frostback'].includes(zone.species), `${zone.id} is somebody's stock`);
  /**
   * **The ghubr, and the two halves of its own rule.** The lore gives this animal a behaviour and no
   * body, which is why three jobs refused it: "the dustback does not stand still in conditions where the
   * surface air is actively dangerous", and "a dustback seen resting in shade is a reliable signal". So
   * the two things the build owes the lore are that it is in the **northern desert margin** and that it
   * has **shade to rest in** - and in the Ganesh the only shade is the perennial scrub, which stands in
   * the sediment pockets the wind has not swept (`ganeshLie` low). Both are measured here; the behaviour
   * itself is proved in `tests/west-life.test.js`.
   */
  const ghubr = SOUTHWEST_WILDLIFE_ZONES.filter(zone => zone.species === 'ghubr');
  assert.equal(ghubr.length, 1, 'the ghubr is one range and it is the Ganesh Desert’s');
  assert.equal(ghubr[0].region, 'Ganesh Desert');
  assert.ok(ghubr[0].shade > 0, 'the ghubr has no shade to rest in, which is half of what the lore says about it');
  const rows = cellsOf('Ganesh Desert').map(cell => cell.z).sort((a, b) => a - b);
  for (const [x, z] of ghubr[0].sites) {
    assert.ok(z < rows[0] + 180, `the ghubr at (${x}, ${z}) is not in the northern margin (the first row is ${rows[0].toFixed(0)})`);
    assert.ok(ganeshLie(x, z) < .1, `the ghubr at (${x}, ${z}) rests on swept floor (lie ${ganeshLie(x, z).toFixed(3)}) and there is no shade there`);
  }
  // And it is the wild animal of the lore's own sentence and not somebody's bovid drawn small: the
  // Moroshé dustback is the oasis houses' stock and has no range anywhere in the game.
  for (const zone of SOUTHWEST_WILDLIFE_ZONES) assert.notEqual(zone.species, 'dustback', `${zone.id} is somebody's stock`);
});

test('the four are charted, levelled, spoken for and listed, and nothing is built in any of them', () => {
  for (const name of FOUR) {
    assert.ok(REGION_BIOMES[name], `${name} has no biome`);
    assert.ok(REGION_BIOMES[name].ownScatter, `${name} does not scatter its own country`);
    const region = regions.find(entry => entry.name === name);
    assert.ok(region, `${name} is not a region`);
    assert.deepEqual(region.npcIds, [], `${name} has people in it`);
    assert.ok(region.landmarks.length >= 4, `${name} has too few landmarks`);
    for (const id of region.landmarks) assert.ok(SOUTHWEST_LANDMARKS.some(place => place.id === id), `${name} names a landmark that is not built: ${id}`);
    assert.equal(hexOwnerAt(region.spawn.x, region.spawn.z), name, `${name}'s spawn is not on its own hexes`);
    assert.equal(westWaterSurface(region.spawn.x, region.spawn.z), null, `${name}'s spawn is in the water`);
    assert.equal(southwestClear(region.spawn.x, region.spawn.z), false, `${name}'s spawn is on a dry bed`);
    assert.equal(regionBuildStatus(name).state, 'early', `${name} is not listed as early`);
    assert.ok(regionBuildStatus(name).work.length > 40, `${name} does not say what is left`);
    assert.ok(regionLevel(name) >= 3, `${name} has no level`);
    assert.ok(REGION_LANGUAGE[name], `${name} has no tongue`);
    assert.ok(DEV_WORLD_DESTINATIONS.some(place => place.regionId === name), `${name} has no travel stop`);
    assert.ok(SUBREGIONS.some(area => area.region === name), `${name} has no chart area`);
    assert.ok(WEST_REGION_NAMES.includes(name), `${name} is not a western region`);
    // Its own sky, and not the default: three desert countries share one and West Pyros has the
    // steppe's. Clearer air than anything else in the game, because a hot desert has no water in it.
    const sky = regionSky(region);
    assert.notDeepEqual(sky, DEFAULT_SKY, `${name} takes the default sky`);
    assert.ok(sky.density <= .0042, `${name}'s air is thicker than a dry country's`);
  }
  // Navarth and West Pyros speak Pyrosi, the two Ganesh countries the contact speech of the
  // junction the plain sits on, and both dialects exist.
  assert.equal(REGION_LANGUAGE.Navarth.language, 'pyrosi');
  assert.equal(REGION_LANGUAGE['West Pyros'].dialect, 'west-pyrosi');
  assert.equal(REGION_LANGUAGE['Ganesh Plain'].language, 'maroshi');
  assert.equal(REGION_LANGUAGE['Ganesh Desert'].dialect, 'ganesh');
  for (const id of ['west-pyrosi', 'ganesh']) assert.ok(DIALECTS[id], `${id} is not a dialect`);
  // The three desert countries share one sky and West Pyros does not.
  const sky = name => regionSky(regions.find(entry => entry.name === name));
  assert.deepEqual(sky('Navarth'), sky('Ganesh Desert'));
  assert.deepEqual(sky('Navarth'), sky('Ganesh Plain'));
  assert.notDeepEqual(sky('Navarth'), sky('West Pyros'));
  // Every landmark stands on the block's own hexes, which is the check that catches a place named
  // for ground that turned out to be somebody else's.
  for (const place of SOUTHWEST_LANDMARKS)
    assert.ok(BLOCK.includes(hexOwnerAt(place.x, place.z)), `${place.id} stands on ${hexOwnerAt(place.x, place.z)}`);
  assert.equal(SOUTHWEST_LANDMARKS.length, 67, 'job 1\u2019s nineteen, job 2\u2019s seventeen, job 3\u2019s seventeen and job 4\u2019s fourteen');
});

// ---------------------------------------------------------------------------
// Job 2: the four Meroshe deserts
// ---------------------------------------------------------------------------

test('the atlas gives four more countries ninety-five hexes, one terrain word and one climate code', () => {
  assert.deepEqual(MEROSHE.map(name => REGION_IDS[name]), [43, 44, 45, 46]);
  assert.deepEqual(MEROSHE_REGIONS, MEROSHE);
  for (const name of MEROSHE) assert.ok(PLAYABLE.includes(name), `${name} is in the survey`);
  const at = PLAYABLE_REGIONS.indexOf('North Meroshe Desert');
  assert.deepEqual(PLAYABLE_REGIONS.slice(at, at + 4), MEROSHE);
  assert.equal(PLAYABLE_REGIONS.indexOf('Ganesh Plain'), at - 1, 'appended straight after job 1\u2019s last');
  assert.deepEqual(MEROSHE.map(name => cellsOf(name).length), [23, 20, 31, 21]);
  assert.equal(MEROSHE.reduce((sum, name) => sum + cellsOf(name).length, 0), 95);
  // **One terrain word over ninety-five hexes**, which is the largest single-character expanse the
  // atlas draws: no `hills`, no `grassland`, no `forest`, no `coast`, no odd hex anywhere.
  for (const name of MEROSHE) assert.deepEqual(terrainCount(name), { plains: cellsOf(name).length }, `${name} is not all plains`);
  // **And one climate code over the same ninety-five.** With job 1's eighty-one that makes a hundred
  // and seventy-six of this block's two hundred and two hexes hot desert.
  assert.equal(Object.keys(MEROSHE_CLIMATE).length, 95);
  assert.deepEqual([...new Set(Object.values(MEROSHE_CLIMATE))], ['BWh']);
  assert.equal(Object.keys(NORTH_MEROSHE_CLIMATE).length, 23);
  assert.equal(Object.keys(WEST_MEROSHE_CLIMATE).length, 20);
  assert.equal(Object.keys(CENTRAL_MEROSHE_CLIMATE).length, 31);
  assert.equal(Object.keys(SOUTH_MEROSHE_CLIMATE).length, 21);
  for (const name of MEROSHE) for (const cell of cellsOf(name))
    assert.equal(MEROSHE_CLIMATE[`${cell.q},${cell.r}`], 'BWh', `(${cell.q},${cell.r}) has no climate`);
  if (existsSync(MAP_PATH)) {
    const map = JSON.parse(readFileSync(MAP_PATH, 'utf8').replace(/^\ufeff/, ''));
    for (const [key, code] of Object.entries(MEROSHE_CLIMATE))
      assert.equal(map.hexes[key]?.climate, code, `${key} reads ${map.hexes[key]?.climate} on the map`);
    // Every `BWh` hex on the whole claimed atlas is in this one quarter of the continent: these
    // ninety-five are thirty-nine per cent of all the desert there is.
    let total = 0;
    for (const name of Object.keys(REGION_CELLS)) for (const cell of REGION_CELLS[name])
      if (map.hexes[`${cell.q},${cell.r}`]?.climate === 'BWh') total++;
    assert.ok(total >= 176, `the playable world has ${total} BWh hexes`);
  }
  // **So the climate says nothing at all here**, which is the finding the whole job turns on: job 1's
  // half has a gradient and that gradient is its shape, and this half is flat 1.00 on every hex of
  // all four countries, with no green corner in it anywhere.
  // **Measured when job 2 built it: ninety-four of the ninety-five read 1.000 and the ninety-fifth read
  // 0.893.** The one that did not was the North Meroshe's (-24,128), its north-eastern tip, one hex from
  // the Ganesh Plain's `Csb` row - so even the single exception was the blend telling the truth about a
  // neighbour rather than a gradient inside this half.
  //
  // **Job 3 made it five, job 4 made it twenty, and every one of the twenty is still a neighbour's.**
  // Job 3's report predicted that building Marosh would turn the four exceptions into "eight or ten";
  // it is nineteen plus job 2's one, which is a bigger answer than the question expected and for a
  // plain reason: `Af` is zero on this scale where `Csb` is 0.08, so Trogo pulls three times as hard as
  // Hama does. Nine of the twenty are Marosh's doing, seven Trogo's, four Hama's, and the deepest of
  // them, **(-26,136) at 0.646, touches Trogo and Marosh both** - a desert hex a third of the way to a
  // rainforest, where job 2 measured 1.000 on ninety-four of ninety-five hexes. Not one exception is in
  // the interior: **this half still has no gradient of its own and every departure from 1.000 in it is
  // somebody else's climate arriving.**
  const exceptions = [];
  for (const name of MEROSHE) for (const cell of cellsOf(name)) {
    assert.equal(southwestKoppen(cell.x, cell.z), 'BWh');
    const dry = southwestAridity(cell.x, cell.z);
    if (dry > .995) continue;
    exceptions.push(`${cell.q},${cell.r}`);
    assert.ok(dry > .6, `${name} at (${cell.q},${cell.r}) reads ${dry.toFixed(3)}`);
    // Each one touches a country outside the Meroshe: the Ganesh Plain, Marosh, Hama or Trogo.
    const neighbours = AXIAL.map(([dq, dr]) => owner.get(`${cell.q + dq},${cell.r + dr}`));
    assert.ok(neighbours.some(other => other && !MEROSHE.includes(other)),
      `(${cell.q},${cell.r}) is off 1.000 with no wet neighbour`);
  }
  assert.deepEqual(exceptions.sort(), [
    '-24,128', '-25,129', '-26,130', '-26,136', '-27,131', '-27,132', '-27,133', '-27,134', '-27,135',
    '-27,136', '-27,137', '-27,138', '-28,139', '-29,139', '-30,140', '-31,141', '-32,140', '-32,141',
    '-35,136', '-36,136',
  ], 'twenty hexes of ninety-five are pulled off 1.00, and every one of them touches a greener country');
  // The deepest of the twenty is the hex that touches both of job 4's countries at once.
  const deepest = cellsOf('South Meroshe Desert').find(cell => cell.q === -26 && cell.r === 136);
  assert.ok(Math.abs(southwestAridity(deepest.x, deepest.z) - .646) < .01,
    `(-26,136) reads ${southwestAridity(deepest.x, deepest.z).toFixed(3)} against Trogo and Marosh both`);
});

test('the west and south edges are the sea, and the atlas draws no water in the Meroshe at all', () => {
  // **No watercourse anywhere.** The atlas draws five hundred and seventy-two river edges and not one
  // of them touches any of these ninety-five hexes - the nearest are in Marosh, two hexes east of the
  // North Meroshe, and in Trogo, one hex south-east of the South. A desert ringed by water it does not
  // get is the honest reading, and it is what the lore says too: "water is found at depth, in
  // aquifer-fed oases". Nothing wet is built: the Malhat is a salt crust and not a water surface.
  assert.equal(RIVER_EDGES.filter(edge => edge.regions.some(region => MEROSHE.includes(region))).length, 0);
  for (const name of MEROSHE) for (const cell of cellsOf(name))
    assert.equal(westWaterSurface(cell.x, cell.z), null, `${name} has water on (${cell.q},${cell.r})`);
  assert.equal(westWaterSurface(MEROSHE_SALT.x, MEROSHE_SALT.z), null, 'the salt pan is a crust, not a pool');
  // **The west and south edges are sea and not merely unclaimed land**, which the brief asked to be
  // checked. Measured on the World Builder map: every unclaimed hex the West Meroshe and the South
  // Meroshe share an edge with is `coast`, and beyond that column and that row the map is `ocean`.
  if (existsSync(MAP_PATH)) {
    const map = JSON.parse(readFileSync(MAP_PATH, 'utf8').replace(/^\ufeff/, ''));
    // `owner` here is the survey's, so Dinelv, Hama, Marosh and Trogo count as unclaimed too - they
    // are claimed on the atlas and simply not built. What separates sea from unbuilt land is the
    // map's own terrain word, and it is unambiguous: **`coast`, with `ocean` beyond it.**
    const counts = {};
    const coastHexes = new Set();
    for (const name of MEROSHE) {
      counts[name] = 0;
      for (const cell of cellsOf(name)) for (const [dq, dr] of AXIAL) {
        const key = `${cell.q + dq},${cell.r + dr}`;
        if (owner.has(key)) continue;
        const terrain = map.hexes[key]?.terrain;
        if (terrain !== 'coast' && terrain !== 'ocean') continue;
        counts[name]++; coastHexes.add(key);
      }
    }
    // **The atlas's ten sea edges on the West Meroshe and four on the South are sea**, over six
    // coast hexes and three; and the North and the Central have none at all, so their unbuilt
    // neighbours are the Dinelv Highlands' `hills` and Marosh's - land, not water.
    assert.deepEqual(counts, { 'North Meroshe Desert': 0, 'West Meroshe Desert': 10,
      'Central Meroshe Desert': 0, 'South Meroshe Desert': 4 });
    assert.equal(coastHexes.size, 9, 'six hexes west of the West Meroshe and three south of the South');
    for (const key of coastHexes) assert.equal(map.hexes[key]?.terrain, 'coast', `${key} is not coast`);
    // And beyond that column and that row the map is open ocean.
    for (const [q, r] of [[-39, 133], [-39, 134], [-39, 135], [-33, 143], [-32, 143], [-31, 143]])
      assert.equal(map.hexes[`${q},${r}`]?.terrain, 'ocean', `(${q},${r}) is not open water`);
  }
  // And the coast field agrees: both shores are real waterlines a traveler can walk to, and the
  // ground behind them is desert right up to it - the Ganesh's gulf again, twice over, on an open
  // ocean instead of a sheltered one.
  const westShore = [], southShore = [];
  for (const cell of cellsOf('West Meroshe Desert')) if (landDistance(cell.x, cell.z) < 120) westShore.push(cell);
  for (const cell of cellsOf('South Meroshe Desert')) if (landDistance(cell.x, cell.z) < 120) southShore.push(cell);
  assert.ok(westShore.length >= 4, `${westShore.length} West Meroshe hexes within 120 m of the water`);
  assert.ok(southShore.length >= 2, `${southShore.length} South Meroshe hexes within 120 m of the water`);
  // **The shore is as arid as the interior on every hex of it but five.** Job 2 measured all eleven at
  // 1.000 and could, because nothing green was built beside them; job 3 moved three of them with Hama
  // and job 4 moves two more with Trogo. (-36,136) is Hama's on the western shore, (-32,140) and
  // (-32,141) Hama's on the southern one, and **(-30,140) at 0.811 and (-31,141) at 0.883 are Trogo's** -
  // the two southern-shore hexes nearest the rainforest, and the furthest off the driest value any
  // shore hex in the Meroshe gets. It is still the wet edge arriving on the coast rather than inland,
  // which is what an ocean does, except that this time the ocean has a forest on it.
  const wetted = [];
  for (const cell of [...westShore, ...southShore]) {
    const dry = southwestAridity(cell.x, cell.z);
    if (dry > .995) continue;
    wetted.push(`${cell.q},${cell.r}`);
    assert.ok(dry > .75, `(${cell.q},${cell.r}) reads ${dry.toFixed(3)} on a desert shore`);
  }
  assert.deepEqual(wetted.sort(), ['-30,140', '-31,141', '-32,140', '-32,141', '-36,136'],
    'only the five shore hexes nearest Hama and Trogo are off the driest value');
  // The skirt lets go at the shore, so the West Meroshe's own hexes are not under the sea: measured,
  // 0 m at the waterline, 2.6 at twenty metres in and 10.4 at a hundred and thirty.
  for (const cell of cellsOf('West Meroshe Desert')) if (landDistance(cell.x, cell.z) > 12)
    assert.ok(H(cell.x, cell.z) > 0, `(${cell.q},${cell.r}) stands at ${H(cell.x, cell.z).toFixed(2)} m`);
});

test('four surfaces, because one word and one code cannot tell four countries apart', () => {
  // **The design answer of this job, as arithmetic.** Erg, reg, hamada and salt pan are four real and
  // distinct desert surfaces and the game had drawn none of them at scale. Each is one country's and
  // stops at its own border, which is what makes the four quarters four countries.
  //
  // *North: the hamada's benches.* Nine, striking north and south on the dip off the Dinelv highland,
  // one to two metres of riser each, taken as a maximum and not a sum so nine of them make a stepped
  // floor and not a staircase nine risers high.
  assert.equal(MEROSHE_BENCHES.length, 9);
  let lift = 0;
  for (const cell of cellsOf('North Meroshe Desert')) for (let i = 0; i < 100; i++) {
    const x = cell.x + (i % 10 - 5) * 10, z = cell.z + (Math.floor(i / 10) - 5) * 10;
    if (hexOwnerAt(x, z) !== 'North Meroshe Desert') continue;
    lift = Math.max(lift, merosheBench(x, z).lift);
  }
  assert.ok(lift > 1.6 && lift < 2.2, `the benches stand ${lift.toFixed(2)} m at most`);
  assert.ok(Math.max(...MEROSHE_BENCHES.map(b => b.rise)) <= 2, 'no bench is more than two metres');
  for (const b of MEROSHE_BENCHES) assert.equal(hexOwnerAt(b.x, b.z), 'North Meroshe Desert', `${b.id} starts off the hamada`);
  assert.equal(merosheBenches(-2980, 2480, 1), 0, 'the benches are the hamada\u2019s and stop at its border');
  //
  // *Central: the sink and the erg.* The sink first, because an erg is sand that had nowhere left to
  // go: three and a half metres of closed basin with no outlet and no river edge anywhere on it. Then
  // the dunes, on the summer wind's own bearing - job 1's `GANESH_WIND.grainBearing`, because it is
  // the same wind - seven metres crest to floor, two hundred and thirty apart, and **forty-eight per
  // cent of every wavelength dead-flat corridor**, which is the whole of why this country cannot be
  // crossed in a straight line.
  // Six metres crest to floor at a hundred and forty apart, which is one in twenty-three: a real
  // erg's ratio, and the second try at it. The first was 7 m at 230 - the same ratio as a fifty-metre
  // dune a mile and a half wide - and it put **two ridges in the whole country**, which the hillshade
  // caught and the arithmetic did not.
  assert.equal(MEROSHE_DUNES.height, 6);
  assert.equal(MEROSHE_DUNES.wave, 140);
  assert.equal(MEROSHE_DUNES.floor, .48);
  assert.ok(MEROSHE_DUNES.wave / MEROSHE_DUNES.height > 18 && MEROSHE_DUNES.wave / MEROSHE_DUNES.height < 32,
    'the dunes keep a real erg’s height-to-spacing ratio');
  // And the country is wide enough for a field rather than a pair: at least four ridge crests stand
  // between the two ends of its long axis.
  let crossings = 0, was = duneProfile(-3250, 2500);
  for (let k = 1; k <= 120; k++) {
    const here = duneProfile(-3250 + k * 5, 2500);
    if (was > .5 && here <= .5) crossings++;
    was = here;
  }
  assert.ok(crossings >= 4, `only ${crossings} dune crests across six hundred metres`);
  assert.ok(merosheSink(MEROSHE_SINK.x, MEROSHE_SINK.z, 1) < -3.4, 'the sink is not a sink');
  assert.equal(merosheSink(-2950, 2021, 1), 0, 'and it is the sand sea\u2019s own');
  let crest = 0, floors = 0, samples = 0;
  for (const cell of cellsOf('Central Meroshe Desert')) for (let i = 0; i < 100; i++) {
    const x = cell.x + (i % 10 - 5) * 10, z = cell.z + (Math.floor(i / 10) - 5) * 10;
    if (hexOwnerAt(x, z) !== 'Central Meroshe Desert') continue;
    samples++;
    const erg = merosheErg(x, z, regionShare('Central Meroshe Desert', x, z));
    crest = Math.max(crest, merosheDunes(x, z, erg));
    if (merosheCorridor(x, z) > .92) floors++;
  }
  assert.ok(crest > 5.5 && crest < 6.1, `the tallest dune stands ${crest.toFixed(2)} m`);
  assert.ok(floors / samples > .5 && floors / samples < .75, `${(floors / samples * 100).toFixed(0)}% of the sand sea is corridor floor`);
  assert.equal(merosheCorridor(-2950, 2021), 0, 'the corridors are the sand sea\u2019s own');
  //
  // *West: the skirt, the fans and the salt.* The skirt is a one-sided ramp to the ocean, nought at
  // the sand sea's margin and its whole seven metres at the shore; the three fans are a grain-size
  // field on top of it, coarse at the apex and dust at the toe; and the Malhat is a levelled floor
  // and not a bowl, because a playa is flat to the centimetre.
  assert.equal(MEROSHE_FANS.length, 3);
  assert.equal(MEROSHE_SKIRT.drop, 7);
  assert.ok(merosheSkirt(MEROSHE_SKIRT.from.x, MEROSHE_SKIRT.from.z, 1) > -.2, 'the ramp is nought at the sand sea margin');
  assert.ok(merosheSkirt(-3700, 2450, 1) < -5, 'and its full drop near the shore');
  for (const f of MEROSHE_FANS) assert.equal(hexOwnerAt(f.x, f.z), 'West Meroshe Desert', `${f.id}\u2019s apex is off the skirt`);
  assert.ok(merosheFan(MEROSHE_FANS[1].x - 20, MEROSHE_FANS[1].z + 20) > .85, 'the fan heads are coarse');
  assert.ok(merosheFan(-3500, 2620) < .35, 'and the toes are not');
  assert.equal(hexOwnerAt(MEROSHE_SALT.x, MEROSHE_SALT.z), 'West Meroshe Desert');
  assert.ok(onSaltPan(MEROSHE_SALT.x, MEROSHE_SALT.z) > .99 && onSaltPan(-2950, 2021) === 0);
  assert.equal(southwestClear(MEROSHE_SALT.x, MEROSHE_SALT.z), true, 'nothing roots in brine');
  // Flat to the centimetre: the pan's floor is one level over three hundred metres.
  let low = 99, high = -99;
  for (let a = 0; a < 16; a++) for (const k of [.2, .5, .7]) {
    const t = a / 16 * Math.PI * 2;
    const x = MEROSHE_SALT.x + Math.cos(t) * MEROSHE_SALT.radiusX * k, z = MEROSHE_SALT.z + Math.sin(t) * MEROSHE_SALT.radiusZ * k;
    low = Math.min(low, H(x, z)); high = Math.max(high, H(x, z));
  }
  assert.ok(high - low < .12, `the Malhat's floor varies ${(high - low).toFixed(3)} m across itself`);
  assert.ok(Math.abs(saltPanLevel() - H(MEROSHE_SALT.x, MEROSHE_SALT.z)) < .01, 'and it is the level the module measured');
  //
  // *South: the fog and the varnish.* The one `BWh` country in Azhora whose surface gets wet: two
  // fronts, one off the southern ocean and one off the Trogo margin, taken as a maximum, so the
  // south-eastern corner is fog and the north-western one against Hama and the sand sea is not.
  let fogLow = 9, fogHigh = -9;
  for (const cell of cellsOf('South Meroshe Desert')) for (let i = 0; i < 100; i++) {
    const x = cell.x + (i % 10 - 5) * 10, z = cell.z + (Math.floor(i / 10) - 5) * 10;
    if (hexOwnerAt(x, z) !== 'South Meroshe Desert') continue;
    const fog = merosheFog(x, z);
    fogLow = Math.min(fogLow, fog); fogHigh = Math.max(fogHigh, fog);
  }
  assert.ok(fogLow < .1 && fogHigh > .9, `the fog reads ${fogLow.toFixed(2)}\u2026${fogHigh.toFixed(2)}: bare desert and fog belt both`);
  assert.ok(merosheFog(-2580, 2660) > .8, 'the Trogo margin is in the fog');
  assert.ok(merosheFog(-2950, 2714) < .3, 'the Hama corner is not');
  assert.ok(merosheVarnish(-2600, 2700) > merosheVarnish(-2900, 2740) + .3, 'and the pavement is darkest where the fog is');
  assert.equal(merosheFog(-2950, 2021), 0, 'the fog stops where the block\u2019s own hexes do');
  assert.equal(merosheVarnish(-2980, 2480), 0, 'the varnish is the stone floor\u2019s own');
  // And nothing of any of it reaches outside the Meroshe box.
  assert.ok(MEROSHE_BOX.minX < -3840 && MEROSHE_BOX.maxX > -2600 && MEROSHE_BOX.minZ < 1845 && MEROSHE_BOX.maxZ > 3150);
  assert.equal(merosheShare(-2205, 902), 0);
});

test('the Ganesh Plain seam is the flattest in the block, and its divide did not move', () => {
  // **The one seam in this job with a built country on the other side of it**, and the brief asked
  // for three things back: the seam itself, the Ganesh Plain's three channels re-measured, and
  // whether the divide moved. Measured against the same ground built without the Meroshe at all
  // (`git archive` of the base commit, run side by side):
  //
  //  - the three channels fall **1.60 m, 3.00 m and 3.63 m** head to mouth. **The third one changed in
  //    job 4, and job 1 asked for exactly this to be watched.** Job 1's open question 8: "The Ganesh
  //    Plain's third channel runs the wrong way on purpose... If job 2's Meroshe deserts change the
  //    blend along that margin, the divide will move, and the three channels should be re-measured
  //    then." Job 2 did not move it (4.07 to the centimetre) and **Marosh did**: the sea channel's mouth
  //    is on the plain's south-eastern corner, which borders Marosh across three hex edges, and the
  //    ridge at base 74 lifted the mouth by 0.44 m where `outland` at 11.5 had left it. The channel
  //    still falls the whole way and still runs east to the sea;
  //  - the divide's crest stands at **x = -2800** along z = 1790 and **x = -2735** along z = 1730,
  //    the same two points. **The divide did not move.**
  //  - **the divide itself still did not move**, in either job: the crest stands at x = -2800 along
  //    z = 1790 and x = -2735 along z = 1730, which are job 2's own two points.
  //  - and the plain's own margins keep rising as its neighbours are built: its hex-centre mean went
  //    from 18.670 m with no Meroshe to **18.971** with it (job 2) and to **20.308** now, because the
  //    hexes south of it stopped being `outland` at base 11.5 and became the hamada at 21, and the hexes
  //    east of it stopped being `outland` and became Marosh's ridge at 74. That is the rib at a margin
  //    disappearing, which is what building a neighbour is for.
  const falls = GANESH_PLAIN_CHANNELS.map(channel => {
    const a = channel.line[0], b = channel.line.at(-1);
    return +(H(a.x, a.z) - H(b.x, b.z)).toFixed(2);
  });
  assert.deepEqual(falls, [1.60, 3.00, 3.63], 'the first two fall as they did and the sea channel is 0.44 m shallower');
  const crestAt = z => {
    let best = -99, at = 0;
    for (let x = -2900; x <= -2600; x += 5) { const h = H(x, z); if (h > best) { best = h; at = x; } }
    return at;
  };
  assert.equal(crestAt(1790), -2800, 'the divide crest has not moved along z = 1790');
  assert.equal(crestAt(1730), -2735, 'nor along z = 1730');
  const plain = cellsOf('Ganesh Plain').map(cell => H(cell.x, cell.z));
  const mean = plain.reduce((a, b) => a + b, 0) / plain.length;
  // **The plain's own mean has now risen three times for the same reason and it is the right reason.** It
  // was 18.670 m with nothing south of it, 18.971 once job 2 put the hamada at base 21 against it,
  // 20.131 once job 3 put the Dinelv Highlands at base 96 across four hex edges of its south-western
  // corner, and **20.308** now that job 4 has put Marosh's ridge at base 74 against three hex edges of
  // its south-eastern one. Each step is a rib at a margin disappearing, which is what building a
  // neighbour is for; **the divide is unmoved through all four** and only the sea channel's own mouth has
  // changed, which job 1 asked to have watched.
  assert.ok(Math.abs(mean - 20.308) < .01, `the plain means ${mean.toFixed(3)} m`);
  // And the seam is walked over without noticing: the plain at 22 against the rock floor at 21, on
  // the same wavelength, with the block's own tilt running through both.
  assert.ok(Math.abs(REGION_TERRAIN['Ganesh Plain'].base - REGION_TERRAIN['North Meroshe Desert'].base) <= 1);
  let worst = 0, clear = 0;
  const plateauShare = shareOf(['Dinelv Highlands', 'Marosh']);
  for (const cell of cellsOf('North Meroshe Desert')) for (const [dq, dr] of AXIAL) {
    if (owner.get(`${cell.q + dq},${cell.r + dr}`) !== 'Ganesh Plain') continue;
    const mate = cellsOf('Ganesh Plain').find(o => o.q === cell.q + dq && o.r === cell.r + dr);
    for (let i = 0; i < 24; i++) {
      const t = (i + .5) / 24, x = cell.x + (mate.x - cell.x) * t, z = cell.z + (mate.z - cell.z) * t;
      if (wholeShare(x, z) < .999) continue;
      worst = Math.max(worst, step(x, z));
      if (plateauShare(x, z) <= .001) clear = Math.max(clear, step(x, z));
    }
  }
  // **The seam itself has not changed and the measurement of it has.** Job 2 measured 0.27 m over all
  // ten edges; the worst reading now is 2.19 m, and every metre of the difference is at the seam's
  // *western* end, where the Dinelv Highlands' escarpment blend reaches the last two edges of it -
  // the plateau shares four hex edges with the Ganesh Plain a hex south-west of here - **and job 4 put
  // Marosh's ridge on the other end of the same seam**, three hex edges against the plain's own
  // south-eastern corner, which is the second thing now reaching into it. Measured on the points where
  // the blend holds neither the plateau nor the ridge, the two halves still meet at **0.27 m**, which is
  // job 2's figure to the centimetre: the seam itself has never moved, and three jobs in a row have had
  // to narrow the window it is measured in.
  assert.ok(worst < 2.4, `the halves meet with ${worst.toFixed(2)} m`);
  assert.ok(clear < .4, `clear of the escarpment the halves meet with ${clear.toFixed(2)} m`);
});

test('seven ranges over ninety-five hexes, and the sand sea carries one of them', () => {
  const mine = SOUTHWEST_WILDLIFE_ZONES.filter(zone => MEROSHE.includes(zone.region));
  assert.equal(mine.length, 7);
  // **Sparser per hex than the Ganesh, which was already the sparsest country in the game.** Job 1
  // carries three ranges over the Ganesh Desert's thirty-one hexes, 0.097 a hex; this half carries
  // seven over ninety-five, 0.074 - a quarter sparser again, on ground with no green corner and no
  // permanent water anywhere in it. Emptiness measured, which is what the brief asked for.
  const perHex = mine.length / 95;
  assert.ok(perHex < 3 / 31, `${perHex.toFixed(3)} a hex against the Ganesh's ${(3 / 31).toFixed(3)}`);
  // Only three of the seven stand on the ground, and the largest country of the four has one range
  // in it, fifty-two metres up: the emptiest country in Azhora.
  assert.equal(mine.filter(zone => !zone.air).length, 3);
  const erg = mine.filter(zone => zone.region === 'Central Meroshe Desert');
  assert.equal(erg.length, 1);
  assert.equal(erg[0].air, 52);
  assert.ok(erg[0].air > Math.max(...SOUTHWEST_WILDLIFE_ZONES.filter(zone => zone !== erg[0]).map(zone => zone.air ?? 0)),
    'and it flies higher than anything else in the southwest');
  // Nothing domestic - the dustback herds and the caravan animals are somebody's - and no gull, hare
  // or bone-bird is anywhere it cannot stand.
  for (const zone of mine) {
    assert.ok(!['longhorn', 'hill-sheep', 'nethrani-cattle'].includes(zone.species), `${zone.id} is somebody's stock`);
    assert.ok(Math.hypot(zone.maxX - zone.minX, zone.maxZ - zone.minZ) / 2 < 130, `${zone.id}'s range is wider than it is run from`);
    for (const [x, z] of zone.sites) {
      assert.equal(hexOwnerAt(x, z), zone.region, `${zone.id}'s home at (${x}, ${z}) is on ${hexOwnerAt(x, z)}'s hex`);
      if (zone.air) continue;
      assert.equal(regionAt(x, z)?.name, zone.region, `${zone.id}'s home is not in its own country`);
      assert.equal(westWaterSurface(x, z), null, `${zone.id}'s home is under water`);
      assert.equal(southwestClear(x, z), false, `${zone.id}'s home is on a dry bed or the salt`);
      assert.ok(step(x, z) < 2, `${zone.id}'s home at (${x}, ${z}) steps ${step(x, z).toFixed(2)} m`);
    }
  }
  // The gulls are the exception that proves the rule: the one abundant life in this desert is on the
  // waterline and comes out of the sea, so their sites are the only ones in the block within forty
  // metres of a shore.
  const gulls = mine.find(zone => zone.species === 'gull');
  for (const [x, z] of gulls.sites) {
    const d = landDistance(x, z);
    assert.ok(d > 4 && d < 45, `a gull stands ${d.toFixed(0)} m inland`);
  }
});

test('the four Meroshe are charted, levelled, spoken for and listed, and nothing is built in any of them', () => {
  for (const name of MEROSHE) {
    assert.ok(REGION_BIOMES[name]?.ownScatter, `${name} does not scatter its own country`);
    const region = regions.find(entry => entry.name === name);
    assert.ok(region, `${name} is not a region`);
    assert.deepEqual(region.npcIds, [], `${name} has people in it`);
    assert.ok(region.landmarks.length >= 4, `${name} has too few landmarks`);
    for (const id of region.landmarks) assert.ok(SOUTHWEST_LANDMARKS.some(place => place.id === id), `${name} names a landmark that is not built: ${id}`);
    assert.equal(hexOwnerAt(region.spawn.x, region.spawn.z), name, `${name}'s spawn is not on its own hexes`);
    assert.equal(westWaterSurface(region.spawn.x, region.spawn.z), null, `${name}'s spawn is in the water`);
    assert.equal(southwestClear(region.spawn.x, region.spawn.z), false, `${name}'s spawn is on a dry bed or the salt`);
    assert.ok(step(region.spawn.x, region.spawn.z) < 2, `${name}'s spawn steps ${step(region.spawn.x, region.spawn.z).toFixed(2)} m`);
    assert.equal(regionBuildStatus(name).state, 'early', `${name} is not listed as early`);
    assert.ok(regionBuildStatus(name).work.length > 40, `${name} does not say what is left`);
    assert.ok(regionLevel(name) >= 3, `${name} has no level`);
    assert.ok(DEV_WORLD_DESTINATIONS.some(place => place.regionId === name), `${name} has no travel stop`);
    assert.ok(SUBREGIONS.some(area => area.region === name), `${name} has no chart area`);
    assert.ok(WEST_REGION_NAMES.includes(name), `${name} is not a western region`);
    assert.notDeepEqual(regionSky(region), DEFAULT_SKY, `${name} takes the default sky`);
  }
  // **Three skies over four countries, and the argument for each is the atlas's own.** The two
  // interior quarters take job 1's desert sky unchanged, .0024, the clearest air in Azhora. The West
  // Meroshe has ten hex edges of open western ocean, so it carries sea air over a desert at .0032.
  // And the South Meroshe is under fog, so it is **the one `BWh` country in the game whose air is
  // thicker than the average rather than thinner** - .0046, against the Oves steppe's .0034 - and the
  // only desert in Azhora a traveler cannot see across.
  const sky = name => regionSky(regions.find(entry => entry.name === name));
  assert.deepEqual(sky('North Meroshe Desert'), sky('Central Meroshe Desert'));
  assert.deepEqual(sky('North Meroshe Desert'), sky('Ganesh Desert'), 'the interior shares job 1\u2019s desert sky');
  assert.ok(sky('West Meroshe Desert').density > sky('North Meroshe Desert').density, 'the coast is hazier than the interior');
  assert.ok(sky('South Meroshe Desert').density > sky('West Meroshe Desert').density, 'and the fog belt hazier than the coast');
  assert.ok(sky('South Meroshe Desert').density < DEFAULT_SKY.density, 'but still clearer than an ordinary sky');
  // **Plain Maroshi, and no dialect, which is a decision.** The desert peoples' own speech is the
  // centre of this family rather than a margin of it, and both Maroshi dialects the game has are
  // margins: the coastal court form the base tongue carries, and `ganesh`, the northern contact seam
  // on the Ganesh Plain. The Meroshe is neither.
  for (const name of MEROSHE) {
    assert.equal(REGION_LANGUAGE[name].language, 'maroshi', `${name} speaks something else`);
    assert.equal(REGION_LANGUAGE[name].dialect, null, `${name} has been given a dialect`);
  }
  assert.equal(REGION_LANGUAGE['Ganesh Desert'].dialect, 'ganesh', 'and the Ganesh keeps the plain\u2019s');
});

// ---------------------------------------------------------------------------
// Job 3: Cape Heth, the Dinelv Highlands and Hama
// ---------------------------------------------------------------------------

test('the atlas gives three more countries seventy-three hexes, and every one of them is a first', () => {
  assert.deepEqual(EDGE.map(name => REGION_IDS[name]), [47, 48, 49]);
  assert.deepEqual(WEST_EDGE_REGIONS, EDGE);
  for (const name of EDGE) assert.ok(PLAYABLE.includes(name), `${name} is in the survey`);
  const at = PLAYABLE_REGIONS.indexOf('Cape Heth');
  assert.deepEqual(PLAYABLE_REGIONS.slice(at, at + 3), EDGE);
  assert.equal(PLAYABLE_REGIONS.indexOf('South Meroshe Desert'), at - 1, 'appended straight after job 2\u2019s last');
  assert.deepEqual(EDGE.map(name => cellsOf(name).length), [19, 35, 19]);
  assert.equal(EDGE.reduce((sum, name) => sum + cellsOf(name).length, 0), 73);
  // **Cape Heth holds the only `coast` hex any country on the atlas holds.** The map paints 1,332 of
  // them round the continent and exactly one falls inside somebody's outline: (-39,127), the point of
  // this cape, with four of its six neighbours open water.
  assert.deepEqual(terrainCount('Cape Heth'), { plains: 18, coast: 1 });
  const point = cellsOf('Cape Heth').find(cell => cell.terrain === 'coast');
  assert.deepEqual([point.q, point.r], [-39, 127]);
  for (const name of Object.keys(REGION_CELLS)) if (name !== 'Cape Heth')
    assert.ok(!cellsOf(name).some(cell => cell.terrain === 'coast'), `${name} also holds a coast hex`);
  // **The Dinelv Highlands are the only desert highland**: twenty-six `hills`, six `plains`, three
  // `mountain`, and `BWh` on all thirty-five including the three summits, which is what decides how
  // high they can be.
  assert.deepEqual(terrainCount('Dinelv Highlands'), { hills: 26, plains: 6, mountain: 3 });
  assert.deepEqual([...new Set(Object.values(DINELV_CLIMATE))], ['BWh']);
  // **And Hama's two fields draw the same line.** Every `grassland` hex is `Csb` and every `plains`
  // hex is `BWh`, with no hex anywhere in the country where the two disagree - which is the most
  // valuable single fact in this job, because it makes the wet/dry line something the atlas states
  // twice rather than something a build has to interpolate.
  assert.deepEqual(terrainCount('Hama'), { grassland: 9, plains: 10 });
  for (const cell of cellsOf('Hama'))
    assert.equal(HAMA_CLIMATE[`${cell.q},${cell.r}`], cell.terrain === 'grassland' ? 'Csb' : 'BWh',
      `Hama's (${cell.q},${cell.r}) is ${cell.terrain} and ${HAMA_CLIMATE[`${cell.q},${cell.r}`]}`);
  assert.equal(Object.keys(WEST_EDGE_CLIMATE).length, 73);
  assert.equal(Object.keys(CAPE_HETH_CLIMATE).length, 19);
  assert.equal(Object.keys(DINELV_CLIMATE).length, 35);
  assert.equal(Object.keys(HAMA_CLIMATE).length, 19);
  if (existsSync(MAP_PATH)) {
    const map = JSON.parse(readFileSync(MAP_PATH, 'utf8').replace(/^\ufeff/, ''));
    for (const [key, code] of Object.entries(WEST_EDGE_CLIMATE))
      assert.equal(map.hexes[key]?.climate, code, `${key} reads ${map.hexes[key]?.climate} on the map`);
    // **Every `coast` hex on the map reads `Cfb`, and so does almost every `ocean` hex**, which is what
    // proves Cape Heth's one `Cfb` is the water's code and not the air's. Taken at face value it would
    // have put an oceanic-temperate headland on the point of a hot-desert cape.
    let coast = 0, coastCfb = 0, ocean = 0, oceanCfb = 0, mountainBWh = [];
    for (const [key, hex] of Object.entries(map.hexes)) {
      if (hex.terrain === 'coast') { coast++; if (hex.climate === 'Cfb') coastCfb++; }
      if (hex.terrain === 'ocean') { ocean++; if (hex.climate === 'Cfb') oceanCfb++; }
      if (hex.terrain === 'mountain' && hex.climate === 'BWh') mountainBWh.push(key);
    }
    assert.equal(coast, coastCfb, `${coast - coastCfb} of ${coast} coast hexes are not Cfb`);
    assert.ok(oceanCfb / ocean > .99, `${oceanCfb} of ${ocean} ocean hexes are Cfb`);
    // **And the only three hot-desert `mountain` hexes on the whole map are this plateau's.**
    assert.equal(mountainBWh.length, 3);
    assert.deepEqual(mountainBWh.sort(), ['-32,128', '-33,129', '-35,130']);
  }
  // So the point of the cape takes the desert's own dryness, stated rather than fallen through to.
  assert.equal(COAST_HEX_DRY, 1);
  assert.ok(southwestAridity(point.x, point.z) > .995, 'the point of the cape is as arid as the rest of it');
  for (const cell of cellsOf('Cape Heth')) assert.ok(southwestAridity(cell.x, cell.z) > .995, `(${cell.q},${cell.r}) is not desert`);
  for (const cell of cellsOf('Dinelv Highlands')) assert.ok(southwestAridity(cell.x, cell.z) > .995, `(${cell.q},${cell.r}) is not desert`);
});

test('Cape Heth is one low ridge and two sides of it, and the sea is on three sides of that', () => {
  // "It is not a dramatic geographical feature in the mode of high cliff headlands or bold rocky
  // outcrops; it is a low, extended point of land." The atlas agrees and the ground has to: eighteen
  // `plains` hexes at base 13 and the `coast` hex at 5, which is the lowest authored base in the game.
  assert.equal(REGION_TERRAIN['Cape Heth'].base, 13);
  assert.equal(REGION_TERRAIN['Cape Heth'].byTerrain.coast.base, 5);
  const heights = cellsOf('Cape Heth').map(cell => H(cell.x, cell.z));
  assert.ok(Math.max(...heights) < 40, `the cape reaches ${Math.max(...heights).toFixed(1)} m`);
  const point = cellsOf('Cape Heth').find(cell => cell.terrain === 'coast');
  assert.ok(H(point.x, point.z) < 14, `the point stands at ${H(point.x, point.z).toFixed(1)} m`);
  // The spine: six metres at its middle, nothing at the point, and asymmetric - a short steep fall on
  // the weather side and a long slack one into the lee, which is the only reason the lee is a lee.
  assert.equal(HETH_SPINE.lift, 6);
  assert.ok(HETH_SPINE.weather < HETH_SPINE.lee / 1.8, 'the weather face is the steep side');
  assert.ok(Math.abs(hethSpine(-4020, 1868, 1) - 6) < .1, 'the spine stands its full height at its middle');
  assert.equal(hethSpine(point.x, point.z, 1), 0, 'and nothing at the point');
  // The spray field sorts the country: high on the seaward third and near the water, nothing in the
  // lee hollows, which is where all the soil is.
  assert.ok(hethSpray(-4200, 1860) > hethSpray(-3850, 1900) * 3, 'the point is not saltier than the landward end');
  for (const hollow of HETH_HOLLOWS) {
    assert.equal(hexOwnerAt(hollow.x, hollow.z), 'Cape Heth', `${hollow.id} is not on the cape`);
    assert.ok(inHethHollow(hollow.x, hollow.z) > .95, `${hollow.id} does not read as a hollow`);
    assert.ok(hethSpray(hollow.x, hollow.z) < .7, `${hollow.id} takes the spray`);
    assert.equal(westWaterSurface(hollow.x, hollow.z), null, `${hollow.id} holds water`);
    assert.ok(H(hollow.x, hollow.z) > 3, `${hollow.id} floors at ${H(hollow.x, hollow.z).toFixed(1)} m`);
  }
  // **Twenty-one hex edges of open water, which is the most maritime country in the block**, and the
  // atlas makes every one of them a `coast` hex rather than merely unclaimed land.
  let sea = 0, built = 0;
  for (const cell of cellsOf('Cape Heth')) for (const [dq, dr] of AXIAL) {
    const other = owner.get(`${cell.q + dq},${cell.r + dr}`);
    if (other === 'Cape Heth') continue;
    if (other) built++; else sea++;
  }
  assert.equal(sea, 21, 'twenty-one sea edges');
  assert.equal(built, 13, 'and thirteen against the Ganesh Desert and the plateau');
  // The cape is dry to the surf on all three sides, which is the Ganesh's gulf finding for a third time
  // and on the most exposed coast in Azhora.
  for (const [x, z] of [[-4225, 1848], [-4000, 1700], [-3900, 2010]])
    assert.ok(southwestAridity(x, z) > .99, `(${x},${z}) is not desert to the water`);
});

test('the Dinelv escarpment is the hex blend’s, and the bedding is a function of height alone', () => {
  // **The whole eighty-metre front is the blend and nothing is authored on any margin of it**, which is
  // the West Lotharn's contract: `hills` at base 96 against Cape Heth's 13, the Ganesh Desert's 20, the
  // Ganesh Plain's 22 and the West Meroshe's 14. What is authored is what the face is made of.
  assert.equal(REGION_TERRAIN['Dinelv Highlands'].base, 96);
  assert.equal(REGION_TERRAIN['Dinelv Highlands'].byTerrain.plains.base, 82);
  assert.equal(REGION_TERRAIN['Dinelv Highlands'].byTerrain.mountain.base, 138);
  for (const name of ['Cape Heth', 'Ganesh Desert', 'Ganesh Plain', 'West Meroshe Desert', 'North Meroshe Desert'])
    assert.ok(REGION_TERRAIN[name].base < 30, `${name} is not the lowland the plateau stands over`);
  // Measured: the plateau's own hexes mean ninety-nine metres against the Ganesh Desert's seventeen and
  // Cape Heth's eighteen, and it is the highest ground in the game outside the two Lotharns.
  const meanOf = name => { const list = cellsOf(name).map(cell => H(cell.x, cell.z)); return list.reduce((a, b) => a + b, 0) / list.length; };
  assert.ok(meanOf('Dinelv Highlands') > 90, `the plateau means ${meanOf('Dinelv Highlands').toFixed(1)} m`);
  assert.ok(meanOf('Dinelv Highlands') > meanOf('Navarth') + 40, 'and stands well over Navarth, which was the block\u2019s high ground');
  assert.ok(meanOf('Dinelv Highlands') > meanOf('Cape Heth') + 70, 'and seventy metres over the cape below it');
  // **The south-western corner has no coastal strip at all: the plateau stands straight over the ocean.**
  // Measured on the built ground, the worst fall in the first fifty metres inland of that waterline is
  // ninety-seven metres, which is a sea cliff and not an escarpment with a beach under it.
  let cliff = 0;
  for (let z = 2080; z <= 2290; z += 10) {
    let atWater = null, inland = null;
    for (let x = -3960; x < -3700; x += 2) {
      if (hexOwnerAt(x, z) !== 'Dinelv Highlands') continue;
      const ld = landDistance(x, z);
      if (ld < 4 && atWater === null) atWater = H(x, z);
      if (ld > 48 && ld < 56 && inland === null) inland = H(x, z);
    }
    if (atWater !== null && inland !== null) cliff = Math.max(cliff, inland - atWater);
  }
  assert.ok(cliff > 60, `the sea cliff falls ${cliff.toFixed(1)} m in fifty metres`);
  // **The bedding is `h + A sin(2 pi h / period)`, so it is horizontal by construction** and cannot be
  // laid crooked; and `A < period / 2 pi` keeps the surface single-valued, so nothing overhangs.
  assert.ok(DINELV_BANDS.amp * 2 * Math.PI / DINELV_BANDS.period < 1,
    'the bedding amplitude would make the escarpment fold over on itself');
  assert.equal(dinelvBands(120, 0), 0, 'the bedding is gated on the plateau\u2019s own share');
  // It is a function of height and of nothing else, so two points at the same height get the same offset
  // wherever they stand - which is what a bedding plane is.
  assert.equal(dinelvBands(64, 1), dinelvBands(64, 1));
  assert.ok(Math.abs(dinelvBands(64, 1)) <= DINELV_BANDS.amp + 1e-9);
  let monotone = true;
  for (let h = 12; h < 200; h += .25) if (h + dinelvBands(h, 1) >= h + .25 + dinelvBands(h + .25, 1)) monotone = false;
  assert.ok(monotone, 'the bedding is not monotone in height and the surface is therefore not single-valued');
  // The four seasonal channels are dry, cut into the face, and three of them come out at job 2's own
  // fan apexes, which is what job 2's report asked job 3 for.
  assert.equal(DINELV_CHANNELS.length, 4);
  const targets = DINELV_CHANNELS.map(channel => channel.target).filter(Boolean);
  assert.deepEqual(targets.sort(), MEROSHE_FANS.map(fan => fan.id).sort());
  for (const channel of DINELV_CHANNELS) {
    const fan = MEROSHE_FANS.find(item => item.id === channel.target);
    if (!fan) continue;
    const mouth = channel.line[channel.line.length - 1];
    assert.ok(Math.hypot(mouth.x - fan.x, mouth.z - fan.z) < 40,
      `${channel.id} ends ${Math.hypot(mouth.x - fan.x, mouth.z - fan.z).toFixed(0)} m from ${fan.id}`);
    assert.equal(westWaterSurface(mouth.x, mouth.z), null, `${channel.id} has water in it`);
  }
  for (const cell of cellsOf('Dinelv Highlands')) assert.equal(westWaterSurface(cell.x, cell.z), null,
    `(${cell.q},${cell.r}) holds water: this plateau has none`);
  assert.equal(RIVER_EDGES.filter(edge => cellsOf('Dinelv Highlands')
    .some(cell => (edge.q === cell.q && edge.r === cell.r))).length, 0, 'the atlas draws no river on the plateau');
});

test('the ridge systems, the gaps and the tables are the atlas’s own rows read in the lore’s own frame', () => {
  // `dinelv_highlands.md`: "A series of ridge systems crosses it from roughly north to south, aligned
  // with the peninsula's long axis. These ridges create the passes." Measured off this country's own
  // hexes, that axis is north-north-east to south-south-west at about thirty degrees west of south, and
  // in that frame **every one of the thirty-five hexes falls on one of six rows of constant `c`**,
  // eighty-six and a half metres apart. The ridges are those rows.
  assert.equal(DINELV_RIDGES.length, 6);
  const rows = new Map(), outliers = [];
  for (const cell of cellsOf('Dinelv Highlands')) {
    const c = dinelvAcross(cell.x, cell.z);
    const ridge = DINELV_RIDGES.reduce((best, item) => Math.abs(item.c - c) < Math.abs(best.c - c) ? item : best, DINELV_RIDGES[0]);
    // **One hex of the thirty-five is off every ridge line and it is the only one**: (-37,130), the
    // seaward corner over the sea cliff, sits on a seventh strike row of its own that the atlas gives a
    // single hex, and a row of one is not a ridge system. It carries the escarpment and nothing else.
    if (Math.abs(ridge.c - c) > 44) { outliers.push(`${cell.q},${cell.r}`); continue; }
    if (!rows.has(ridge.id)) rows.set(ridge.id, []);
    rows.get(ridge.id).push(cell);
    // and inside its own ridge's run along the strike
    const a = dinelvAlong(cell.x, cell.z);
    assert.ok(a > ridge.from - 60 && a < ridge.to + 60, `(${cell.q},${cell.r}) is off the end of ${ridge.id}`);
  }
  assert.deepEqual(outliers, ['-37,130'], 'one hex, and only one, is off every strike row');
  assert.equal(rows.size, 6, 'six rows, and every other hex on one of them');
  // The frame is a reflection, so it is its own inverse: the round trip is exact.
  for (const cell of cellsOf('Dinelv Highlands')) {
    const back = dinelvPoint(dinelvAlong(cell.x, cell.z), dinelvAcross(cell.x, cell.z));
    assert.ok(Math.hypot(back.x - cell.x, back.z - cell.z) < .5, 'the strike frame is not its own inverse');
  }
  assert.ok(Math.abs(DINELV_STRIKE.ax ** 2 + DINELV_STRIKE.az ** 2 - 1) < .01, 'the strike is a unit vector');
  // **The `plains` hexes are the gaps and the `mountain` hexes are the high points**, which is read off
  // the terrain field rather than imposed on it: every gap centre is within a hex of a `plains` hex and
  // every mesa is on a `mountain` hex.
  assert.equal(DINELV_GAPS.length, 4);
  for (const gap of DINELV_GAPS) {
    const near = cellsOf('Dinelv Highlands').filter(cell => Math.hypot(cell.x - gap.x, cell.z - gap.z) < 70);
    assert.ok(near.length && near.every(cell => cell.terrain === 'plains'),
      `${gap.id} is not on the atlas's own low ground`);
  }
  for (const mesa of DINELV_MESAS) {
    const cell = cellsOf('Dinelv Highlands').find(item => Math.hypot(item.x - mesa.x, item.z - mesa.z) < 3);
    assert.ok(cell && cell.terrain === 'mountain', `${mesa.id} is not on a mountain hex`);
  }
  // Two of the three mesas stand on one strike row to a fifth of a metre, and the third on the next.
  const across = DINELV_MESAS.map(mesa => dinelvAcross(mesa.x, mesa.z));
  assert.ok(Math.abs(across[0] - across[1]) < .5, 'the north and long tables are not on one line');
  assert.ok(Math.abs(across[2] - across[1]) > 60, 'the west table is on the same line after all');
  // **Every gap is well below the crests on either side of it along the strike**, which is what makes it
  // a gap; and the four basins are cut in the four gaps, so the passes and the water points are the same
  // ground - which is the one thing the lore says twice without joining up.
  assert.equal(DINELV_BASINS.length, 4);
  for (const gap of DINELV_GAPS) {
    const ridge = DINELV_RIDGES.find(item => item.id === gap.ridge);
    const up = dinelvPoint(gap.a + gap.half + 50, ridge.c), down = dinelvPoint(gap.a - gap.half - 50, ridge.c);
    const crest = Math.max(H(up.x, up.z), H(down.x, down.z));
    assert.ok(crest - H(gap.x, gap.z) > 6, `${gap.id} stands only ${(crest - H(gap.x, gap.z)).toFixed(1)} m under its crest`);
    const basin = DINELV_BASINS.find(item => item.gap === gap.id);
    assert.ok(basin && basin.x === gap.x && basin.z === gap.z, `${gap.id} has no basin in it`);
    assert.ok(inDinelvBasin(gap.x, gap.z) > .95, `${gap.id} does not read as a basin`);
  }
  // **The tables are sixty and seventy metres over the plateau, flat-topped and too steep to walk**, and
  // that is what a hot-desert `mountain` hex has to be: a summit high enough to be a mountain in the
  // Lotharn sense would not read `BWh` at its top.
  for (const mesa of DINELV_MESAS) {
    assert.ok(H(mesa.x, mesa.z) > 160, `${mesa.id} tops out at ${H(mesa.x, mesa.z).toFixed(1)} m`);
    assert.ok(H(mesa.x, mesa.z) < 210, `${mesa.id} is a Lotharn and not a table`);
    assert.ok(dinelvMesaAt(mesa.x, mesa.z).top > .9, `${mesa.id} has no flat top`);
    assert.ok(mesa.top > mesa.reach * .55, `${mesa.id} is a dome and not a table: its flat top is ${(mesa.top / mesa.reach * 100).toFixed(0)}% of its reach`);
    assert.ok(mesa.lift / (mesa.reach - mesa.top) > 1.8, `${mesa.id}'s sides can be walked up`);
  }
  assert.ok(Math.max(...DINELV_MESAS.map(mesa => H(mesa.x, mesa.z))) < 300,
    'the plateau is lower than every mountain range in the game, which is what BWh on its summits means');
});

test('the plateau can be walked up in exactly one place, and the tables cannot be walked at all', () => {
  // Every margin of this country is an escarpment and one of them is a sea cliff, so somewhere there has
  // to be ground a loaded animal can be walked up or the lore's whole account of the place - stone
  // downhill, food uphill, passes that can be closed - means nothing. That place is the lore's own
  // northern plateau pass, and it is laid **along the grain**, up the swale between two ridges.
  const line = DINELV_ASCENT.line;
  const points = [];
  for (let i = 1; i < line.length; i++) for (let t = 0; t < 1; t += .02)
    points.push([line[i - 1].x + (line[i].x - line[i - 1].x) * t, line[i - 1].z + (line[i].z - line[i - 1].z) * t]);
  points.push([line[line.length - 1].x, line[line.length - 1].z]);
  const heights = points.map(([x, z]) => H(x, z));
  let worst = 0, length = 0;
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    length += d;
    worst = Math.max(worst, Math.abs(heights[i] - heights[i - 1]) / Math.max(d, .01));
  }
  // Measured: 29.0 m at the foot to 85.1 at the head over two hundred and ninety-three metres, and the
  // worst local grade on it is 0.53 - inside the free-walking budget the whole way, where the escarpment
  // either side of it runs to twice that and the sea cliff to four times.
  assert.ok(length > 250, `the ascent is only ${length.toFixed(0)} m long`);
  assert.ok(heights[heights.length - 1] - heights[0] > 45, `it climbs ${(heights[heights.length - 1] - heights[0]).toFixed(1)} m`);
  assert.ok(worst < .7, `the ascent grades ${worst.toFixed(2)} at its worst`);
  for (const [x, z] of points) assert.ok(westWaterSurface(x, z) === null && !southwestClear(x, z), 'the ascent runs through water or a dry bed');
  assert.ok(dinelvAscentAt(line[2].x, line[2].z).weight > .5, 'the ascent does not own its own middle');
  assert.equal(dinelvAscentAt(-3000, 1900), null, 'the ascent reaches ground it has no business on');
  // **And the proof is a flood fill**, on a four-metre lattice from the foot of the ascent, climbing no
  // steeper than 0.45 and descending anything short of a fall: it reaches 117.6 m, which is above the
  // ridge crests, and it does not reach any of the three tables, which top out at 188.
  const seen = new Set();
  let top = -99;
  const queue = [[-3230, 1716]];
  let budget = 400000;
  while (queue.length && budget-- > 0) {
    const [x, z] = queue.pop(), key = `${x},${z}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (x < -4000 || x > -3100 || z < 1620 || z > 2340) continue;
    const here = H(x, z);
    if (hexOwnerAt(x, z) === 'Dinelv Highlands' && here > top) top = here;
    for (const [dx, dz] of [[4, 0], [-4, 0], [0, 4], [0, -4]]) {
      const there = H(x + dx, z + dz);
      if (there - here > 1.8 || here - there > 6 || westWaterSurface(x + dx, z + dz) !== null) continue;
      queue.push([x + dx, z + dz]);
    }
  }
  assert.ok(top > 112, `the plateau top reached is ${top.toFixed(1)} m`);
  const tables = Math.min(...DINELV_MESAS.map(mesa => H(mesa.x, mesa.z)));
  assert.ok(top < tables - 30, `the tables are walkable: the fill reached ${top.toFixed(1)} m against their ${tables.toFixed(1)}`);
});

test('the Meroshe fan heads lifted when the escarpment was built, exactly as job 2 predicted', () => {
  // Job 2's open question 5: "`merosheSkirt` and `MEROSHE_FANS` are deliberately written as a one-sided
  // ramp falling away from the Dinelv margin rather than as a slope down from a fixed head, so when the
  // Dinelv Highlands are built with a highland base the hex blend lifts the fan heads automatically and
  // the apron still falls away from them. Nothing here needs changing for that."
  //
  // **Nothing was changed and the heads lifted.** Measured against the same points on the base commit:
  // the north fan's apex went from 9.28 m to 38.7, the middle fan's from 11.66 to 33.5 and the east
  // fan's from 15.63 to 34.0 - between eighteen and twenty-nine metres - and every metre of it came
  // through `terrainMix`'s own base, which rose by 29.24, 21.68 and 18.41 at those three points as the
  // hex south-east of each of them stopped being `outland` at 11.5 and became the plateau at 96.
  assert.deepEqual(MEROSHE_FANS.map(fan => fan.lift), [4.2, 5.0, 4.6], 'the fans\u2019 own lifts are job 2\u2019s');
  assert.equal(MEROSHE_SKIRT.drop, 7, 'and the skirt\u2019s own drop is job 2\u2019s');
  for (const fan of MEROSHE_FANS) {
    const ground = H(fan.x, fan.z), base = terrainMix(fan.x, fan.z).base;
    assert.ok(ground > 28, `${fan.id}'s apex stands at ${ground.toFixed(1)} m`);
    // The lift is the blend's and not a landform's: the fan's own contribution is under five metres.
    assert.ok(merosheFans(fan.x, fan.z, 1) <= fan.lift + .01);
    assert.ok(base > 28, `${fan.id}'s blended base is ${base.toFixed(1)} m`);
    assert.ok(Math.abs(ground - base) < 10, `${fan.id} is ${Math.abs(ground - base).toFixed(1)} m off its own blended base`);
  }
  // And the apron still falls away from them to the sea, which is what a one-sided ramp buys.
  assert.ok(H(-3720, 2345) > H(-3760, 2430), 'the north fan no longer falls to the shore');
  assert.ok(H(-3590, 2345) > H(-3560, 2480), 'the middle fan no longer falls to the salt');
  // The three fan apexes are still inside the West Meroshe's own hexes, so the lift is a neighbour's
  // and not a trespass: this country writes no ground on job 2's.
  for (const fan of MEROSHE_FANS) assert.equal(hexOwnerAt(fan.x, fan.z), 'West Meroshe Desert', `${fan.id} has changed hands`);
});

test('Hama’s wet/dry line is drawn twice by the atlas and lies eighty metres inland of the surf', () => {
  // The country's whole subject. The atlas draws the line with the terrain word and again with the
  // climate code and puts both in the same place; `southwestAridity` blends the codes on the ground's
  // own falloff, so `hamaGreen` needs no field of its own - it is that blend read back and stretched.
  const grass = cellsOf('Hama').filter(cell => cell.terrain === 'grassland');
  const dry = cellsOf('Hama').filter(cell => cell.terrain === 'plains');
  assert.equal(grass.length, 9);
  assert.equal(dry.length, 10);
  for (const cell of grass) {
    assert.ok(hamaGreen(cell.x, cell.z) > .7, `(${cell.q},${cell.r}) is grassland and reads ${hamaGreen(cell.x, cell.z).toFixed(2)} green`);
    assert.ok(southwestAridity(cell.x, cell.z) < .45, `(${cell.q},${cell.r}) is Csb and reads ${southwestAridity(cell.x, cell.z).toFixed(2)} dry`);
  }
  for (const cell of dry) {
    assert.ok(hamaGreen(cell.x, cell.z) < .25, `(${cell.q},${cell.r}) is plains and reads ${hamaGreen(cell.x, cell.z).toFixed(2)} green`);
    assert.ok(southwestAridity(cell.x, cell.z) > .7, `(${cell.q},${cell.r}) is BWh and reads ${southwestAridity(cell.x, cell.z).toFixed(2)} dry`);
  }
  // **Where the line falls on the ground, measured.** Walking east along six rows and finding where the
  // aridity crosses a half: (-3390, 2740), (-3358, 2800), (-3260, 2860), (-3152, 2920), (-3052, 2980)
  // and (-2950, 3040). It runs from the north-west corner to the south-east, and **it is between
  // sixty-nine and a hundred and ten metres inland of the waterline at every one of those points** -
  // which is to say it is parallel to the shore, about a hex in, all the way round the corner of the
  // continent. The ocean draws it and the Meroshe does not.
  const crossings = [];
  for (const z of [2740, 2800, 2860, 2920, 2980, 3040]) {
    let at = null;
    for (let x = -3560; x < -2900; x += 2) {
      if (hexOwnerAt(x, z) !== 'Hama') continue;
      if (at === null && southwestAridity(x, z) >= .5) at = x;
    }
    assert.ok(at !== null, `no line at z = ${z}`);
    crossings.push([at, z, landDistance(at, z)]);
  }
  for (const [x, z, shore] of crossings) {
    assert.ok(shore > 50 && shore < 130, `the line at (${x},${z}) stands ${shore.toFixed(0)} m from the water`);
  }
  // It moves east as it goes south, which is the coast turning the corner and not a gradient inland.
  for (let i = 1; i < crossings.length; i++)
    assert.ok(crossings[i][0] > crossings[i - 1][0], 'the line does not follow the shore round the corner');
  // The change takes about two hundred paces, which is the blend's reach and not a step.
  const at = x => southwestAridity(x, 2920);
  assert.ok(at(-3260) < .25 && at(-3040) > .8, 'the line is not a line');
  assert.ok(Math.abs(at(-3160) - at(-3140)) < .08, `the line steps ${Math.abs(at(-3160) - at(-3140)).toFixed(2)} in twenty metres`);
  // The friction on the dry half is surface and not relief, because the atlas says `plains`: two turned
  // bearings under two metres, gated off the green half entirely.
  assert.ok(HAMA_BROKEN.amp + HAMA_BROKEN.ribAmp < 2);
  assert.ok(hamaLie(-3000, 2887) >= 0 && hamaLie(-3000, 2887) <= 1);
  assert.ok(Math.abs(REGION_TERRAIN.Hama.amp - 1.6) < 1e-9, 'the dry half is the roughest plains in the block after the hamada');
  assert.ok(REGION_TERRAIN.Hama.amp > REGION_TERRAIN['South Meroshe Desert'].amp * 2);
  // **And the winter beds are dry.** `Csb` is a winter-rain code, the atlas draws no river edge anywhere
  // on Hama's nineteen hexes, and all three beds fall the whole way and end above the tideline.
  assert.equal(HAMA_BEDS.length, 3);
  for (const bed of HAMA_BEDS) {
    const head = bed.line[0], mouth = bed.line[bed.line.length - 1];
    assert.ok(H(head.x, head.z) > H(mouth.x, mouth.z) + 3, `${bed.id} does not fall`);
    assert.ok(H(mouth.x, mouth.z) > 2, `${bed.id} ends at ${H(mouth.x, mouth.z).toFixed(1)} m, under the sea`);
    assert.ok(landDistance(mouth.x, mouth.z) > 20, `${bed.id} ends in the surf`);
    for (const point of bed.line) assert.equal(westWaterSurface(point.x, point.z), null, `${bed.id} holds water`);
    assert.ok(inHamaBed(bed.line[2].x, bed.line[2].z) > .5, `${bed.id} does not read as a bed`);
  }
  for (const cell of cellsOf('Hama')) assert.equal(westWaterSurface(cell.x, cell.z), null,
    `(${cell.q},${cell.r}) holds water: this country has none`);
});

test('thirteen ranges over seventy-three hexes, and the block stops getting emptier', () => {
  const mine = SOUTHWEST_WILDLIFE_ZONES.filter(zone => EDGE.includes(zone.region));
  // Thirteen were job 3's; the fourteenth is the canyon tortoise, which job 3 found the home for and
  // could not build, and which the user's decision of 2026-10-01 put in the plateau's north gap basin.
  assert.equal(mine.length, 14);
  // **The densities, and they are the argument.** Job 1: seventeen over a hundred and seven, 0.159 a
  // hex. Job 2: seven over ninety-five, 0.074, a quarter sparser than the Ganesh, which was already the
  // sparsest country in the game. Job 3: thirteen over seventy-three, **0.178**, the densest of the
  // three - and the reason is not a change of standard but the ground: this job holds the block's only
  // `Csb` country and its most maritime coast.
  const density = names => SOUTHWEST_WILDLIFE_ZONES.filter(zone => names.includes(zone.region)).length
    / names.reduce((sum, name) => sum + cellsOf(name).length, 0);
  assert.ok(density(EDGE) > density(MEROSHE) * 2, `job 3 is ${density(EDGE).toFixed(3)} a hex against job 2's ${density(MEROSHE).toFixed(3)}`);
  assert.ok(density(EDGE) > density(FOUR), 'job 3 is not the densest of the three');
  // Hama is the densest country in eleven and the Dinelv Highlands are the sparsest of job 3's three.
  assert.ok(density(['Hama']) > density(['West Pyros']), 'Hama is not richer than the Vaellir\u2019s own plain');
  assert.ok(density(['Dinelv Highlands']) < density(['Cape Heth']), 'a desert plateau is not sparser than a coast');
  assert.ok(density(['Dinelv Highlands']) > density(MEROSHE), 'a plateau with four water points is not richer than the erg');
  // **Three of Cape Heth's four ranges came out of the sea** and one is on the ground, in the hollows.
  const cape = SOUTHWEST_WILDLIFE_ZONES.filter(zone => zone.region === 'Cape Heth');
  assert.equal(cape.filter(zone => ['sea-plunger', 'gull', 'wading-bird'].includes(zone.species)).length, 3);
  assert.equal(cape.filter(zone => zone.species === 'upland-hare').length, 1);
  // The sea-plunger is the one animal in the block that goes into the water, and the Ascarth tip is the
  // only other place in the game it stands.
  const plunger = cape.find(zone => zone.species === 'sea-plunger');
  assert.ok(plunger.plunge && plunger.plunge.under > 1, 'the plunger does not plunge');
  // **Every one of the Dinelv Highlands' ground ranges is in a basin** - the only ground on the plateau
  // with cover on it - and both of its birds are over the escarpment and the tables. The tortoise's basin
  // is the third of the four and is its own: the lore's "desert seeps" are these, and nothing else is in it.
  const plateau = SOUTHWEST_WILDLIFE_ZONES.filter(zone => zone.region === 'Dinelv Highlands');
  assert.equal(plateau.filter(zone => zone.air).length, 2);
  for (const zone of plateau.filter(zone => !zone.air)) for (const [x, z] of zone.sites)
    assert.ok(inDinelvBasin(x, z) > .3, `${zone.id} is not in a basin`);
  const tortoise = plateau.find(zone => zone.species === 'canyon-tortoise');
  assert.ok(tortoise, 'the canyon tortoise has no range on the plateau the lore gives it');
  const basinOf = (x, z) => DINELV_BASINS.reduce((best, b) =>
    Math.hypot(x - b.x, z - b.z) < Math.hypot(x - best.x, z - best.z) ? b : best).id;
  const basins = new Set(tortoise.sites.map(([x, z]) => basinOf(x, z)));
  assert.deepEqual([...basins], ['north-gap-basin'], 'the tortoises are spread over more than one basin');
  for (const zone of plateau.filter(zone => !zone.air && zone !== tortoise))
    for (const [x, z] of zone.sites) assert.notEqual(basinOf(x, z), 'north-gap-basin', `${zone.id} shares the tortoise's basin`);
  // Its range is the smallest in the block, because this animal does not go anywhere.
  const span = zone => Math.hypot(zone.maxX - zone.minX, zone.maxZ - zone.minZ);
  for (const zone of SOUTHWEST_WILDLIFE_ZONES.filter(zone => !zone.air && !zone.sea && zone !== tortoise))
    assert.ok(span(zone) > span(tortoise), `${zone.id}'s range is tighter than the tortoise's`);
  // **The bone-bird's range stops at Hama's line**, which is the point of putting one there: the four
  // Meroshe quarters have one each, the tables have one, and the last one works the dry half of the only
  // green country in the block and does not cross into the grass.
  const last = SOUTHWEST_WILDLIFE_ZONES.find(zone => zone.id === 'hama-line-bone-bird');
  for (const [x, z] of last.sites) assert.ok(hamaGreen(x, z) < .25, 'the last bone-bird is standing in the grass');
  // And the things in the grass are not: the sward hares and the harrier are all on the wet side.
  for (const id of ['hama-sward-hares', 'hama-harrier'])
    for (const [x, z] of SOUTHWEST_WILDLIFE_ZONES.find(zone => zone.id === id).sites)
      assert.ok(hamaGreen(x, z) > .6, `${id} is on the dry side of the line`);
  // No new rig in job 3: every species it used is one the west already had. The canyon tortoise is the
  // exception and is not job 3's - it is the follow-up's one new rig, built on 2026-10-01 after the user
  // decided the law rather than the animal was what had to change.
  const older = new Set(SOUTHWEST_WILDLIFE_ZONES.filter(zone => !EDGE.includes(zone.region)).map(zone => zone.species));
  const ascarthOnly = new Set(['sea-plunger']);
  const afterwards = new Set(['canyon-tortoise']);
  for (const zone of mine) assert.ok(older.has(zone.species) || ascarthOnly.has(zone.species) || afterwards.has(zone.species),
    `${zone.id} wants a rig the block has not got`);
  // Nothing domestic, and no dustback: the plateau's herds, the highland breeds and Hama's imported
  // food are all somebody's.
  for (const zone of mine) assert.ok(!['longhorn', 'hill-sheep', 'nethrani-cattle', 'frostback', 'dustback'].includes(zone.species),
    `${zone.id} is somebody's stock`);
});

test('the three are charted, levelled, spoken for and listed, and nothing is built in any of them', () => {
  for (const name of EDGE) {
    assert.ok(REGION_BIOMES[name], `${name} has no biome`);
    assert.ok(REGION_BIOMES[name].ownScatter, `${name} does not scatter its own country`);
    assert.equal(REGION_BIOMES[name].relief.wavelength, 320, `${name} is off the block's wavelength`);
    const region = regions.find(entry => entry.name === name);
    assert.ok(region, `${name} is not a region`);
    assert.deepEqual(region.npcIds, [], `${name} has people in it`);
    assert.ok(region.description.length > 600, `${name} has no description`);
    assert.ok(region.landmarks.length >= 5, `${name} has ${region.landmarks.length} landmarks`);
    for (const id of region.landmarks) assert.ok(SOUTHWEST_LANDMARKS.some(place => place.id === id), `${id} is not a place`);
    // Its own sky, and every one argued from the atlas rather than from the climate code.
    assert.notDeepEqual({ ...regionSky(region) }, { ...DEFAULT_SKY }, `${name} uses the default sky`);
    assert.ok(regionLevel(name) > 0, `${name} has no level`);
    assert.equal(regionBuildStatus(name)?.state, 'early', `${name} is not marked early`);
    assert.ok(REGION_LANGUAGE[name], `${name} has no tongue`);
    assert.equal(REGION_LANGUAGE[name].language, 'maroshi', `${name} does not speak the nearest built tongue`);
    assert.ok(SUBREGIONS.some(part => part.region === name), `${name} is not charted`);
    assert.ok(WEST_REGION_NAMES.includes(name), `${name} is not in the western region list`);
    assert.ok(DEV_WORLD_DESTINATIONS.some(place => place.regionId === name), `${name} has no developer anchor`);
    // Every landmark and every charted area stands on its own country's hexes.
    for (const place of SOUTHWEST_LANDMARKS.filter(item => region.landmarks.includes(item.id)))
      assert.equal(hexOwnerAt(place.x, place.z), name, `${place.id} stands on ${hexOwnerAt(place.x, place.z)}`);
    for (const part of SUBREGIONS.filter(item => item.region === name))
      assert.equal(hexOwnerAt(part.x, part.z), name, `${part.id} is charted on ${hexOwnerAt(part.x, part.z)}`);
    // And the spawn is standable ground of its own, dry and off every bed.
    const spawn = region.spawn;
    assert.equal(hexOwnerAt(spawn.x, spawn.z), name, `${name}'s spawn is on ${hexOwnerAt(spawn.x, spawn.z)}`);
    assert.equal(westWaterSurface(spawn.x, spawn.z), null, `${name}'s spawn is under water`);
    assert.equal(southwestClear(spawn.x, spawn.z), false, `${name}'s spawn is on a dry bed`);
    assert.ok(step(spawn.x, spawn.z) < 2, `${name}'s spawn steps ${step(spawn.x, spawn.z).toFixed(2)} m`);
  }
  // Two new dialects, both of them described in the lore rather than guessed, and Cape Heth marked as a
  // stand-in because the tongue its own file asks for - the Alezhor coast's - is not built.
  assert.equal(REGION_LANGUAGE['Dinelv Highlands'].dialect, 'plateau');
  assert.equal(REGION_LANGUAGE.Hama.dialect, 'haman');
  assert.equal(REGION_LANGUAGE['Cape Heth'].dialect, null);
  for (const id of ['plateau', 'haman']) {
    assert.ok(DIALECTS[id], `${id} is not a dialect`);
    assert.equal(DIALECTS[id].language, 'maroshi');
    assert.ok(DIALECTS[id].of.length > 200, `${id} has no description`);
  }
  // Three skies, and Hama's is the thickest air in the block while the plateau's is the clearest in Azhora.
  const sky = name => regionSky(regions.find(entry => entry.name === name));
  assert.ok(sky('Hama').density > sky('South Meroshe Desert').density, 'the green corner sees further than the fog belt');
  assert.ok(sky('Dinelv Highlands').density < sky('Ganesh Desert').density, 'the plateau does not have the clearest air in Azhora');
  assert.ok(sky('Cape Heth').density > sky('Ganesh Desert').density, 'the cape has no sea air in it');
  // The whole block is one field: the three share `southwestAridity`, `SOUTHWEST_TILT` and one tint.
  assert.ok(westEdgeShare(-3450, 2021) > .9, 'the plateau is not its own share');
  assert.equal(westEdgeShare(-2930, 1620), 0, 'the western edge reaches the Ganesh Plain');
  assert.equal(SOUTHWEST_REGIONS.length, 13);
});
// ---------------------------------------------------------------------------
// Job 4: Marosh and Trogo, the last two countries of the southwest quarter
// ---------------------------------------------------------------------------
/**
 * **Marosh and Trogo** (docs/southwest-4-brief.md, 30 September 2026), and with them the programme is
 * finished: thirteen countries and three hundred and twenty-two hexes, the whole southwest quarter of
 * Azhora, built as terrain, climate, water, scenery and wildlife and nothing that belongs to anybody.
 *
 * Both are firsts and both are the atlas stating a division twice. **Marosh is the wall the Meroshe
 * stands behind**: eight `hills` hexes that are every one of them `Csb`, ten `grassland` hexes that are
 * every one of them `Csa`, and - measured here - every one of the hills touching the desert and not one
 * of them touching the sea while every one of the grassland hexes touches the sea. **Trogo is the first
 * rainforest in the game**: twenty-two `deep_forest` hexes that are every one of them `Af`, the wettest
 * code the atlas paints anywhere, thirteen hex edges from a country that is `BWh` on all twenty-one of
 * its own. `tests/trogo-undergrowth.test.js` holds the two rules the user's decision of that day asked
 * for; what is below is the ground, the climate, the water, the colour and the animals.
 */
test('the atlas gives two more countries forty-seven hexes, and neither has a desert hex on it', () => {
  assert.deepEqual(EAST.map(name => REGION_IDS[name]), [50, 51]);
  assert.deepEqual(EAST_EDGE_REGIONS, EAST);
  const at = PLAYABLE_REGIONS.indexOf('Marosh');
  assert.deepEqual(PLAYABLE_REGIONS.slice(at, at + 2), EAST);
  // It was the end of the list while the programme was the only thing adding to it. What holds now is
  // that the block is still one unbroken run of thirteen, ending here.
  assert.deepEqual(PLAYABLE_REGIONS.slice(at - 11, at + 2), BLOCK, 'job 4 ends the block, and the block is one run');
  for (const name of EAST) assert.ok(PLAYABLE.includes(name), `${name} is in the survey`);
  assert.deepEqual(EAST.map(name => cellsOf(name).length), [18, 29]);
  assert.deepEqual(terrainCount('Marosh'), { grassland: 10, hills: 8 });
  assert.deepEqual(terrainCount('Trogo'), { deep_forest: 22, grassland: 7 });
  // **`deep_forest`'s first use anywhere in the game's world.** Until now the word appeared only in
  // `campaign-world.js`'s labels and in the developer atlas's own height table (which puts it at
  // eighteen metres where `plains` is six - the map author's own hint that a deep forest stands over the
  // ground round it). `REGION_TERRAIN` has never carried a profile for it before.
  assert.ok(REGION_TERRAIN.Trogo.base === 52 && REGION_TERRAIN.Trogo.byTerrain.grassland.base === 13);
  const everyTerrain = new Set(Object.keys(REGION_CELLS).flatMap(name => cellsOf(name).map(cell => cell.terrain)));
  assert.ok(everyTerrain.has('deep_forest'));
  assert.deepEqual(Object.keys(REGION_TERRAIN).filter(name => REGION_TERRAIN[name].byTerrain?.deep_forest), [],
    'nothing refines `deep_forest` by terrain: in Trogo it is the country\u2019s own profile');
  // **The climate, hex for hex, and the terrain field draws the same line in both countries.**
  assert.equal(Object.keys(MAROSH_CLIMATE).length, 18);
  assert.equal(Object.keys(TROGO_CLIMATE).length, 29);
  assert.equal(Object.keys(EAST_EDGE_CLIMATE).length, 47);
  const codes = name => cellsOf(name).reduce((tally, cell) => {
    const code = SOUTHWEST_CLIMATE[`${cell.q},${cell.r}`];
    tally[code] = (tally[code] ?? 0) + 1;
    return tally;
  }, {});
  assert.deepEqual(codes('Marosh'), { Csa: 10, Csb: 8 });
  assert.deepEqual(codes('Trogo'), { Af: 22, Csa: 7 });
  for (const cell of cellsOf('Marosh'))
    assert.equal(SOUTHWEST_CLIMATE[`${cell.q},${cell.r}`], cell.terrain === 'hills' ? 'Csb' : 'Csa',
      `Marosh's (${cell.q},${cell.r}) disagrees with itself`);
  for (const cell of cellsOf('Trogo'))
    assert.equal(SOUTHWEST_CLIMATE[`${cell.q},${cell.r}`], cell.terrain === 'deep_forest' ? 'Af' : 'Csa',
      `Trogo's (${cell.q},${cell.r}) disagrees with itself`);
  if (existsSync(MAP_PATH)) {
    const map = JSON.parse(readFileSync(MAP_PATH, 'utf8').replace(/^\ufeff/, ''));
    for (const [key, code] of Object.entries(EAST_EDGE_CLIMATE))
      assert.equal(map.hexes[key]?.climate, code, `${key} reads ${map.hexes[key]?.climate} on the map`);
  }
  // **`Af` is the only zero on the aridity scale and this is where it arrives.** For three jobs the wet
  // end of the field was `Csb` at 0.08; the whole range of it is now spent inside this block, and most
  // of it across one hex edge.
  assert.equal(ARIDITY.Af, 0);
  assert.equal(Math.min(...Object.values(ARIDITY)), 0);
  assert.ok(southwestAridity(-2300, 2900) < .01, 'the middle of the rainforest is as wet as the scale goes');
  assert.equal(southwestKoppen(-2300, 2900), 'Af');
  // **Not one `BWh` hex between the two of them**, which nothing else in thirteen countries can say.
  for (const name of EAST) for (const cell of cellsOf(name))
    assert.notEqual(SOUTHWEST_CLIMATE[`${cell.q},${cell.r}`], 'BWh', `${name} has a desert hex`);
});

test('Marosh is a wall, and the atlas says so three times over', () => {
  // **The third statement is the one no other country in the block makes**: which side each half faces.
  // Seventeen of Marosh's eighteen desert edges are on the eight `hills` hexes and all twenty of its
  // ocean edges are on the ten `grassland` ones, so the terrain word, the climate code and the geography
  // all divide the country in the same place. That is why the ridge is laid on the hills and nowhere else.
  const claimed = new Set();
  for (const name of Object.keys(REGION_CELLS)) for (const cell of cellsOf(name)) claimed.add(`${cell.q},${cell.r}`);
  let hillDesert = 0, hillSea = 0, grassSea = 0, grassDesert = 0;
  for (const cell of cellsOf('Marosh')) for (const [dq, dr] of AXIAL) {
    const key = `${cell.q + dq},${cell.r + dr}`, other = owner.get(key);
    const desert = other && MEROSHE.includes(other), sea = !claimed.has(key);
    if (cell.terrain === 'hills') { if (desert) hillDesert++; if (sea) hillSea++; }
    else { if (desert) grassDesert++; if (sea) grassSea++; }
  }
  assert.deepEqual([hillDesert, hillSea], [17, 0], 'the hills face the desert and never the sea');
  assert.deepEqual([grassSea, grassDesert], [20, 1], 'the grass faces the sea');
  // **Twenty hex edges of open water makes Marosh the second most maritime country in the block**, one
  // ahead of Hama, which is the opposite of what job 3's report expected - it called Marosh inland.
  assert.ok(grassSea > 19, `${grassSea} ocean edges`);
  // The ridge: eight hex centres, a maximum over the line rather than a sum, and the second highest
  // base in the game outside the two Lotharns.
  assert.equal(MAROSH_RIDGE.lift, 15);
  assert.equal(REGION_TERRAIN.Marosh.byTerrain.hills.base, 74);
  assert.ok(REGION_TERRAIN.Marosh.byTerrain.hills.base > REGION_TERRAIN.Navarth.byTerrain.hills.base + 15);
  assert.ok(REGION_TERRAIN.Marosh.byTerrain.hills.base < REGION_TERRAIN['Dinelv Highlands'].base);
  for (const point of MAROSH_RIDGE.line.slice(1, -1))
    assert.equal(hexOwnerAt(point.x, point.z), 'Marosh', `the crest leaves the country at ${point.x}, ${point.z}`);
  const hills = cellsOf('Marosh').filter(cell => cell.terrain === 'hills');
  for (const cell of hills) assert.ok(maroshCrest(cell.x, cell.z) > .55, `(${cell.q},${cell.r}) is a hills hex off the crest`);
  const hillMean = hills.reduce((sum, cell) => sum + H(cell.x, cell.z), 0) / hills.length;
  const grass = cellsOf('Marosh').filter(cell => cell.terrain === 'grassland');
  const grassMean = grass.reduce((sum, cell) => sum + H(cell.x, cell.z), 0) / grass.length;
  assert.ok(Math.abs(hillMean - 60.84) < .5, `the ridge means ${hillMean.toFixed(2)} m`);
  assert.ok(Math.abs(grassMean - 26.63) < .5, `the terrace means ${grassMean.toFixed(2)} m`);
  assert.ok(hillMean - grassMean > 30, 'the ridge does not stand over its own terrace');
  // **The water gap, and the atlas found it rather than a builder.** The three river edges the map draws
  // on this coast all meet at the corner of (-25,131), beside the crest's own western elbow; the notch is
  // there and the crest either side of it stands over it.
  assert.equal(MAROSH_GAP.id, 'marosh-water-gap');
  assert.equal(hexOwnerAt(MAROSH_GAP.x, MAROSH_GAP.z), 'Marosh');
  const atGap = maroshRidgeAt(MAROSH_GAP.x, MAROSH_GAP.z);
  assert.ok(atGap.gap > .99 && atGap.lift < MAROSH_RIDGE.lift * .3,
    `the gap keeps ${atGap.lift.toFixed(2)} m of the crest's ${MAROSH_RIDGE.lift}`);
  const beside = [maroshRidgeAt(-2700, 2107), maroshRidgeAt(-2750, 2194)];
  for (const spot of beside) assert.ok(spot.lift > atGap.lift + 8, 'the crest beside the gap is not above it');
  assert.ok(courseDistance(MAROSH_NAHR, MAROSH_GAP.x, MAROSH_GAP.z, 200) < 90, 'the Nahr does not run through the gap');
  // Four dry combes down the seaward face, all of them falling the whole way and all of them clear of
  // the surf - which is `merosheSkirt`'s lesson and Hama's winter beds' after it.
  assert.equal(MAROSH_COMBES.length, 4);
  for (const combe of MAROSH_COMBES) {
    for (const point of combe.line) assert.equal(hexOwnerAt(point.x, point.z), 'Marosh', `${combe.id} leaves the country`);
    const heights = combe.line.map(point => H(point.x, point.z));
    for (let i = 1; i < heights.length; i++)
      assert.ok(heights[i] < heights[i - 1], `${combe.id} climbs at point ${i}`);
    assert.ok(heights[0] - heights.at(-1) > 25, `${combe.id} falls only ${(heights[0] - heights.at(-1)).toFixed(1)} m`);
    assert.ok(heights.at(-1) > 5, `${combe.id} ends ${heights.at(-1).toFixed(1)} m above the sea`);
    assert.ok(landDistance(combe.line.at(-1).x, combe.line.at(-1).z) > 20, `${combe.id} runs into the surf`);
    const mid = combe.line[1];
    assert.ok(inMaroshCombe(mid.x, mid.z) > .3, `${combe.id} has no floor at its second point`);
    assert.equal(westWaterSurface(mid.x, mid.z), null, `${combe.id} has water in it`);
  }
  // And nothing is authored on the western margin: the front against the Meroshe is the hex blend
  // carrying a base difference, which is the Dinelv escarpment's contract and the West Lotharn's.
  assert.equal(maroshRidgeAt(-2900, 2200).lift, 0, 'the crest reaches into the desert');
});

test('Trogo is the ridgeline that makes the rainforest, and the forest stops where the atlas says', () => {
  // **The crest is read off the atlas and not chosen.** The lore gives the country in one sentence - "a
  // ridgeline that catches the southern moisture and drops a fog wall on its windward face while the
  // leeward side stays desert" - and the atlas says where the line runs: the seven Trogo hexes that share
  // an edge with the South Meroshe are its north-western margin, and the crest is laid along those.
  const margin = cellsOf('Trogo').filter(cell => AXIAL.some(([dq, dr]) =>
    owner.get(`${cell.q + dq},${cell.r + dr}`) === 'South Meroshe Desert'));
  assert.equal(margin.length, 7, 'seven hexes of Trogo touch the desert');
  assert.ok(margin.every(cell => cell.terrain === 'deep_forest'), 'and every one of them is deep forest');
  for (const cell of margin) assert.ok(trogoCrestAt(cell.x, cell.z).crest > .4,
    `the margin hex (${cell.q},${cell.r}) is off the crest`);
  assert.equal(TROGO_CREST.lift, 26);
  for (const point of TROGO_CREST.line.slice(1, -1))
    assert.equal(hexOwnerAt(point.x, point.z), 'Trogo', `the crest leaves the country at ${point.x}, ${point.z}`);
  // The ridge stands over its own canopy and the canopy over its own shore.
  const forest = cellsOf('Trogo').filter(cell => cell.terrain === 'deep_forest');
  const shore = cellsOf('Trogo').filter(cell => cell.terrain === 'grassland');
  const mean = list => list.reduce((sum, cell) => sum + H(cell.x, cell.z), 0) / list.length;
  assert.ok(Math.abs(mean(forest) - 46.89) < .6, `the canopy means ${mean(forest).toFixed(2)} m`);
  assert.ok(Math.abs(mean(shore) - 9.33) < .6, `the shore grass means ${mean(shore).toFixed(2)} m`);
  assert.ok(mean(forest) - mean(shore) > 30, 'the forest does not stand over its own coast');
  assert.ok(H(-2424, 2840) > mean(forest) + 10, 'the crest does not stand over the mid-slope');
  // **The forest wall**: thirteen hex edges of `Af` against `BWh`, and no landform authored on any of
  // them. It is the hex blend carrying a base difference, which is what job 2's own Forest Wall landmark
  // promised a job in advance - "Trogo begins at the next hex east and goes up in one wall of dark
  // canopy with cloud sitting in it."
  let edges = 0, worstFront = 0;
  for (const cell of forest) for (const [dq, dr] of AXIAL) {
    if (owner.get(`${cell.q + dq},${cell.r + dr}`) !== 'South Meroshe Desert') continue;
    edges++;
    const mate = cellsOf('South Meroshe Desert').find(one => one.q === cell.q + dq && one.r === cell.r + dr);
    worstFront = Math.max(worstFront, H(cell.x, cell.z) - H(mate.x, mate.z));
  }
  assert.equal(edges, 13, 'thirteen hex edges of rainforest against hot desert');
  assert.ok(worstFront > 35, `the wall stands only ${worstFront.toFixed(1)} m over the desert`);
  // **Where the forest stops**: every one of the seven `grassland` hexes is on the exposed southern or
  // south-eastern shore, and the `deep_forest` goes to the waterline on the sheltered north-eastern one.
  // Measured against `LAND_HEXES`, which holds every claimed hex in the window and not only the playable
  // ones: an edge is open water when the hex across it is claimed by nobody at all.
  const land = new Set(LAND_HEXES.map(([q, r]) => `${q},${r}`));
  const seaEdges = list => list.reduce((sum, cell) =>
    sum + AXIAL.filter(([dq, dr]) => !land.has(`${cell.q + dq},${cell.r + dr}`)).length, 0);
  assert.equal(seaEdges(shore) + seaEdges(forest), 30, 'thirty hex edges of open water in all');
  assert.equal(seaEdges(shore), 17, 'the coastal grass carries seventeen of the thirty ocean edges');
  assert.equal(seaEdges(forest), 13, 'and the canopy carries thirteen, which is the sheltered shore and the corner');
  // **The forest reaches the water down the north-eastern shore and the grass from row 139 southward**,
  // which is the atlas drawing the distinction the lore states: "the coast is not extensively sheltered -
  // no deep natural harbors on the scale of Hama". A tropical coast open to a southern ocean is
  // salt-pruned and carries tussock and scrub; a sheltered embayment in the same climate carries canopy
  // to the tideline, which is the lore's "mangrove and estuary ecology". Ten of the canopy's thirteen are
  // on the north-eastern shore above row 139 and the other three are the far south-western corner, where
  // Trogo, the Meroshe and the southern ocean meet.
  assert.ok(shore.every(cell => cell.r >= 139), 'every grassland hex is on the southern half of the country');
  let northEast = 0, corner = 0;
  for (const cell of forest) for (const [dq, dr] of AXIAL) {
    if (land.has(`${cell.q + dq},${cell.r + dr}`)) continue;
    if (cell.r <= 138) northEast++; else corner++;
  }
  assert.deepEqual([northEast, corner], [10, 3], 'the canopy meets the water in two places and no more');
  // The altitude band, which is the field the whole country is sorted by, and it is a function of the
  // finished height and of nothing else - the Dinelv bedding's own argument.
  assert.ok(trogoBand(-2400, 3147) < .05, 'the shore grass is at the bottom of the band');
  assert.ok(trogoBand(-2424, 2840) > .85, 'the crest is at the top of it');
  assert.ok(trogoBand(-2300, 2900) > .5 && trogoBand(-2300, 2900) < .8, 'and the mid-slope is in the middle');
  assert.ok(trogoFogForest(-2424, 2840) > .9, 'the fog forest is not on the crest');
  assert.ok(trogoFogForest(-2300, 2900) < .2, 'and it is on the mid-slope, where it should not be');
  // Four gullies, every one of them dry and every one of them falling the whole way. The atlas draws one
  // river on these twenty-nine hexes and these are the drainage it does not draw.
  assert.equal(TROGO_GULLIES.length, 4);
  for (const gully of TROGO_GULLIES) {
    for (const point of gully.line) {
      assert.equal(hexOwnerAt(point.x, point.z), 'Trogo', `${gully.id} leaves the country`);
      assert.equal(westWaterSurface(point.x, point.z), null, `${gully.id} has water in it`);
    }
    const heights = gully.line.map(point => H(point.x, point.z));
    for (let i = 1; i < heights.length; i++)
      assert.ok(heights[i] <= heights[i - 1], `${gully.id} climbs at point ${i}`);
    assert.ok(heights[0] - heights.at(-1) > 25, `${gully.id} falls only ${(heights[0] - heights.at(-1)).toFixed(1)} m`);
    const mid = gully.line[Math.floor(gully.line.length / 2)];
    assert.ok(onTrogoGullyFloor(mid.x, mid.z), `${gully.id} has no floor at its middle`);
  }
  // The Trogoreth is the only permanent water, and it reaches the sea.
  const trogoreth = WEST_PROFILES.get(TROGORETH.id);
  assert.ok(landDistance(trogoreth.at(-1).x, trogoreth.at(-1).z) < 60, 'the Trogoreth does not reach the sea');
  assert.ok(trogoreth.every(sample => sample.ford), 'the Trogoreth is walled somewhere');
  // And nothing is authored outside the two countries' own hexes.
  assert.equal(trogoCrestAt(-2800, 2900).lift, 0, 'the crest reaches into the desert');
  assert.equal(eastEdgeShare(-3560, 1520), 0, 'the east-edge share reaches the Ganesh');
});

test('every ground tint in the game reaches the screen, which is the guard two jobs asked for', () => {
  // **This chain failed silently twice.** Job 2 of the southwest found that `southwestTint` had been
  // computed in `groundTint` and then dropped on the floor since the day the block was built, so four
  // countries' worth of authored colour had never been drawn; job 3 met the same failure mode one level
  // down, where an early `return` inside `southwestTint` would have thrown the Dinelv plateau's colours
  // away on the three hundred metres its box overlaps the Meroshe's. Both reports asked for the chain to
  // become a table walked in order, and job 4 made it one - so this is the guard that makes the failure
  // loud: **every family in the table must move the colour of the ground somewhere in its own country.**
  // Selemis is the fifth family and the first to arrive as a row (2026-10-01, docs/selemis-report.md):
  // its line here is its line there, which is the arrangement this guard was written to force.
  // Telemonia is the sixth (2026-10-02, docs/telemonia-stage1-report.md), the same way.
  assert.deepEqual([...GROUND_TINT_FAMILIES], ['gala', 'oves', 'mithala', 'southwest', 'selemis', 'telemonia', 'east-pyros', 'nether-desert', 'legemum', 'babon', 'south-celder', 'north-celder', 'east-izol', 'alezhor', 'south-ibenal', 'north-ibenal', 'henborth'],
    'a family was added to groundTint without a line here');
  const probes = { gala: ['Gala'], oves: ['Ovesos', 'Oves Desert'],
    mithala: ['South Mithala', 'West Mithala', 'East Mithala', 'North Mithala'],
    southwest: [...BLOCK], selemis: ['Selemi'], telemonia: ['Telemonia'], 'east-pyros': ['East Pyros'], 'nether-desert': ['Nether Desert'], legemum: ['Legemum'], babon: ['Babon'],
    'south-celder': ['South Celder'], 'north-celder': ['North Celder'], 'east-izol': ['East Izol'], alezhor: ['Alezhor'],
    'south-ibenal': ['South Ibenal'], 'north-ibenal': ['North Ibenal'], henborth: ['Henborth'] };
  const painted = new THREE.Color(), swatch = new THREE.Color();
  for (const family of GROUND_TINT_FAMILIES) {
    let worst = 0, at = null;
    for (const name of probes[family]) for (const cell of cellsOf(name)) {
      groundTint(painted, cell.x, cell.z, THREE);
      const mix = terrainMix(cell.x, cell.z);
      let r = 0, g = 0, b = 0, total = 0;
      for (const [ground, weight] of Object.entries(mix.grounds)) {
        if (!weight) continue;
        swatch.set(ground); r += swatch.r * weight; g += swatch.g * weight; b += swatch.b * weight; total += weight;
      }
      const moved = Math.hypot(painted.r - r / total, painted.g - g / total, painted.b - b / total);
      if (moved > worst) { worst = moved; at = `${cell.x}, ${cell.z}`; }
    }
    assert.ok(worst > .02, `the ${family} tint never reaches the screen (worst ${worst.toFixed(4)} at ${at})`);
  }
});

test('every row of the southwest’s own tint table paints, and every one of the thirteen countries is tinted', () => {
  /**
   * **The guard one level down, which is where job 3 met the same failure mode.** `southwestTint` was a
   * chain of three boxes with a nested branch per country inside each; it is now one table of rows walked
   * in order (`SOUTHWEST_TINTS`, src/southwest-world.js). Two things are held here, and between them a
   * missing row cannot be silent: **every row must move the colour somewhere on its own country's hexes**,
   * and **every one of the thirteen countries must come out tinted somewhere in it**. A row added without
   * a line here turns the first assertion red with its own id; a country built without a row turns the
   * last one red with its own name.
   */
  assert.deepEqual([...SOUTHWEST_TINT_ROWS], ['aridity', 'ganesh-lie', 'ganesh-plain-pans', 'ganesh-damp',
    'north-meroshe-hamada', 'central-meroshe-erg', 'south-meroshe-reg', 'west-meroshe-fan',
    'cape-heth-sandstone', 'dinelv-bands', 'hama-sward', 'marosh-ridge', 'trogo-canopy'],
  'a row was added to the southwest’s tint table without a line here');
  // Every country that claims a row is one of the block's own.
  for (const name of Object.values(SOUTHWEST_TINT_REGIONS))
    if (name) assert.ok(BLOCK.includes(name), `${name} is not a country of this block`);
  // **Every row paints.** A row is asked on its own country's hexes with a colour it cannot return by
  // accident, and it must come back with something else somewhere.
  const probe = 0x808080, around = [[0, 0], [40, 0], [-40, 0], [0, 40], [0, -40], [28, 28], [-28, -28]];
  for (const id of SOUTHWEST_TINT_ROWS) {
    // A row that names a country is asked on that country's hexes; `aridity`, which is the block's, is
    // asked on all of them.
    const row = SOUTHWEST_TINT_REGIONS[id];
    const names = row ? [row] : BLOCK;
    let painted = false;
    for (const name of names) for (const cell of cellsOf(name)) {
      for (const [dx, dz] of around) if (southwestTintRow(id, probe, cell.x + dx, cell.z + dz) !== probe) { painted = true; break; }
      if (painted) break;
    }
    assert.ok(painted, `the ${id} row of the southwest tint table never paints anything in ${names.length === 1 ? names[0] : 'the block'}`);
  }
  // **And every one of the thirteen comes out tinted somewhere**, which is the assertion the two silent
  // failures were really about: the four that have no row of their own are coloured by `aridity` and by
  // the Ganesh's and the Ganesh Plain's rows, and if one of them ever stops being coloured, this says so.
  for (const name of BLOCK) {
    let tinted = false;
    for (const cell of cellsOf(name)) {
      const swatch = REGION_TERRAIN[name].byTerrain?.[cell.terrain]?.ground ?? REGION_TERRAIN[name].ground;
      for (const [dx, dz] of [[0, 0], [40, 0], [-40, 0], [0, 40], [0, -40], [28, 28], [-28, -28], [44, -44], [-44, 44]]) {
        if (southwestTint(cell.x + dx, cell.z + dz, swatch) !== null) { tinted = true; break; }
      }
      if (tinted) break;
    }
    assert.ok(tinted, `${name} has no authored ground colour anywhere in it`);
  }
});

test('the two are charted, levelled, spoken for and listed, and nothing is built in either of them', () => {
  for (const name of EAST) {
    assert.ok(REGION_BIOMES[name].ownScatter, `${name} does not scatter its own country`);
    const region = regions.find(entry => entry.name === name);
    assert.deepEqual(region.npcIds, [], `${name} has people in it`);
    assert.ok(region.landmarks.length >= 6, `${name} has too few landmarks`);
    for (const id of region.landmarks) assert.ok(SOUTHWEST_LANDMARKS.some(place => place.id === id), `${name} names a landmark that is not built: ${id}`);
    assert.equal(hexOwnerAt(region.spawn.x, region.spawn.z), name, `${name}'s spawn is not on its own hexes`);
    assert.equal(westWaterSurface(region.spawn.x, region.spawn.z), null, `${name}'s spawn is in the water`);
    assert.equal(regionBuildStatus(name).state, 'early', `${name} is not listed as early`);
    assert.ok(regionBuildStatus(name).work.length > 40, `${name} does not say what is left`);
    assert.ok(regionLevel(name) >= 2, `${name} has no level`);
    assert.ok(REGION_LANGUAGE[name], `${name} has no tongue`);
    assert.ok(DEV_WORLD_DESTINATIONS.some(place => place.regionId === name), `${name} has no travel stop`);
    assert.ok(SUBREGIONS.filter(area => area.region === name).length >= 6, `${name} has too few chart areas`);
    assert.ok(WEST_REGION_NAMES.includes(name), `${name} is not a western region`);
    assert.notDeepEqual(regionSky(region), DEFAULT_SKY, `${name} takes the default sky`);
  }
  // **Marosh speaks plain Maroshi and for once that is the reading rather than a stand-in**: every other
  // Moreshi country in the block carries a dialect because it is a margin of the language, and this one
  // is the centre of it - "Maroshi is its eastern-coast peninsular form", and Marosh is the eastern coast.
  assert.deepEqual(REGION_LANGUAGE.Marosh, { language: 'maroshi', dialect: null });
  // Trogo speaks the transition zone's contact register, whose fog-conditional verb aspect is the single
  // best piece of language in the archive. It is filed under Moreshi because half of it is Moreshi; the
  // forest peoples' own unclassified tongue is an open question rather than a gap.
  assert.deepEqual(REGION_LANGUAGE.Trogo, { language: 'maroshi', dialect: 'fogspeech' });
  assert.ok(DIALECTS.fogspeech, 'the fog speech is not a dialect');
  assert.match(DIALECTS.fogspeech.of, /fog/, 'the dialect does not say what it is for');
  assert.equal(DIALECTS.fogspeech.language, 'maroshi');
  // Two skies, and Trogo's is the whole first half of the user's decision.
  const sky = name => regionSky(regions.find(entry => entry.name === name));
  assert.equal(sky('Trogo').density, .0144);
  assert.equal(sky('Marosh').density, .0055);
  assert.ok(sky('Marosh').density > sky('Hama').density, 'Marosh has more ocean and no desert at all');
  assert.ok(sky('Trogo').density > sky('Marosh').density * 2.5, 'the rainforest is not the thick-air country');
  // Fourteen landmarks, every one of them on its own country's hexes, and every one of them describing
  // ground rather than anything anybody owns.
  const marks = SOUTHWEST_LANDMARKS.filter(place => EAST.includes(hexOwnerAt(place.x, place.z)));
  assert.equal(marks.length, 14, 'fourteen landmarks between the two');
  for (const place of marks) assert.ok(place.description.length > 200, `${place.id} says too little`);
  // The survey, the layout and the ids all agree, and the programme is complete: thirteen countries.
  assert.equal(SOUTHWEST_REGIONS.length, 13);
  assert.equal(SOUTHWEST_REGIONS.reduce((sum, name) => sum + cellsOf(name).length, 0), 322);
});

test('seventeen ranges over forty-seven hexes, and the rainforest is the densest country in the game', () => {
  // **The arithmetic is the argument, and it is the other end of job 2's.** Job 1 put 17 ranges on 107
  // hexes (0.159 a hex), job 2 seven on 95 (0.074, the emptiest country in Azhora), job 3 thirteen on 73
  // (0.178), and job 4 seventeen on 47 (0.362) - twice job 3's and nearly five times job 2's.
  const density = names => {
    const ranges = SOUTHWEST_WILDLIFE_ZONES.filter(zone => names.includes(zone.region)).length;
    const hexes = names.reduce((sum, name) => sum + cellsOf(name).length, 0);
    return ranges / hexes;
  };
  assert.ok(Math.abs(density(EAST) - 17 / 47) < 1e-9, 'job 4 carries seventeen ranges over forty-seven hexes');
  // Against job 3 the figure is 1.89 rather than the 2.03 job 4 reported, and the change is not job 4's:
  // the canyon tortoise was added to the Dinelv Highlands on 2026-10-01, which moved job 3's block from
  // thirteen ranges over seventy-three hexes to fourteen. The claim held to here is the one that survives
  // it - the rainforest is most of twice the densest of the first three blocks - and it is measured.
  assert.ok(density(EAST) > density(EDGE) * 1.85, `job 4 is ${(density(EAST) / density(EDGE)).toFixed(2)} times job 3`);
  assert.ok(density(EAST) > density(MEROSHE) * 4.5, 'job 4 is not nearly five times job 2');
  // **Trogo is the densest country in the game and the South Meroshe one of the emptiest**, and they
  // share thirteen hex edges: a traveler can walk from one to the other in four hundred paces.
  const per = name => SOUTHWEST_WILDLIFE_ZONES.filter(zone => zone.region === name).length / cellsOf(name).length;
  for (const name of BLOCK.filter(item => item !== 'Trogo'))
    assert.ok(per('Trogo') > per(name), `${name} is denser than the rainforest`);
  assert.ok(per('Trogo') / per('South Meroshe Desert') > 3.5, 'the rainforest is not multiples of the desert beside it');
  assert.ok(per('Marosh') > per('Hama'), 'an oak ridge over a terrace is not better country than a sward');
  // **Two new rigs, which is the most any job in this block has spent**, and both are named and
  // described by the fauna overview: the forest edge-cat, which Trogo's own lore asks for - "the
  // carnivores that hunt both zones are the most studied by the communities here" - and the Iberos
  // albatross, which the overview says goes "somewhere beyond the horizon south of Azhora" and which has
  // the southernmost coast in the game to be seen from.
  const species = new Set(SOUTHWEST_WILDLIFE_ZONES.filter(zone => EAST.includes(zone.region)).map(zone => zone.species));
  assert.ok(species.has('forest-cat') && species.has('albatross'));
  // Proved against the file that holds the west's own ranges: the two new species have no zone anywhere
  // but here, and everything else job 4 uses already had one.
  const life = readFileSync(new URL('../src/west-regions-life.js', import.meta.url), 'utf8');
  const older = new Set(SOUTHWEST_WILDLIFE_ZONES.filter(zone => !EAST.includes(zone.region)).map(zone => zone.species));
  for (const name of species) {
    const existed = older.has(name) || life.includes(`species: '${name}'`);
    assert.equal(existed, !['forest-cat', 'albatross'].includes(name),
      `${name} is ${existed ? 'already' : 'not'} an animal this game had`);
  }
  // A rig is a factory now (`'forest-cat': () => ({`), built when its country is first loaded; either spelling is a rig.
  assert.ok(/'forest-cat': (?:\(\) => \()?\{/.test(life) && /albatross: (?:\(\) => \()?\{/.test(life), 'the two new rigs are not built');
  // **One refusal of job 4's three still stands, and it is the one that was never about the lore**:
  // nothing in this block is anybody's stock. The other two were the user's to decide and were decided on
  // 2026-10-01 - the Ganesh dustback is the ghubr in job 1's desert and the canyon tortoise is in job 3's
  // basins - so what is held here is the refusal itself: the *Moroshé* dustback, the oasis houses' bovid
  // whose numbers are what their standing is counted in, is somebody's and is not built.
  for (const zone of SOUTHWEST_WILDLIFE_ZONES)
    assert.ok(!['dustback', 'longhorn', 'hill-sheep', 'nethrani-cattle', 'frostback'].includes(zone.species),
      `${zone.id} is ${zone.species}`);
  // The rainforest's own eleven: one range on the water, two on the estuary, one out at sea, one in the
  // air over the shore, one bone-bird that comes over the crest from the desert and does not cross it,
  // two bands of cat, two of boar and one of gulls.
  const trogo = SOUTHWEST_WILDLIFE_ZONES.filter(zone => zone.region === 'Trogo');
  assert.equal(trogo.length, 11);
  assert.equal(trogo.filter(zone => zone.air).length, 2, 'two of the eleven are in the air');
  assert.equal(trogo.filter(zone => zone.sea).length, 1, 'and one is out past the surf');
  assert.ok(trogo.find(zone => zone.id === 'trogoreth-otters').scale > 1.2,
    'the great river otter is not larger than its smaller cousins');
});
