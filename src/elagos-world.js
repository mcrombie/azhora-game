/**
 * Elagos, the Lake Lands, as water, roads and places.
 *
 * Pure: no three, no DOM. `src/elagos-scenery.js` renders what is described
 * here; `src/world-terrain.js` cuts the ground to it; the charts, the tests and
 * `src/ambron.js` read the same numbers.
 *
 * Like Pueth and Peblos, Elagos is authored directly in **world metres**
 * (100 m per authored hex). It never existed in the 56 m frame.
 *
 * What comes from the atlas: the region's 43 hexes (through the survey), and
 * which of them are water. The atlas paints five lake hexes among the
 * grassland — (5,104), (2,105), (4,106), (0,107) and (0,108) — and the lore
 * (`../world-builder/azhora_lore/geography/regions/elagos.md`) names the lakes
 * they must be. Each lake here is a basin drawn around its authored hex or
 * hexes; `tests/elagos-world.test.js` checks every authored lake hex centre is
 * under water and that no basin wanders more than a hex away from it.
 *
 *  - **Lake Ela**, the great one, fills the two joined lake hexes (0,107) and
 *    (0,108) and runs north-west out of sight. Its whole drainage leaves by one
 *    outlet at its south-east tip.
 *  - **The narrows and the Ela-south**: the outlet pinches to forty-six metres
 *    and runs due south. Ambron's walls are built across it, so every barge,
 *    raft and load of dried fish going south passes under the city's chain. Below
 *    the city the shelf ends and the water falls to the Moros down **the Stair**;
 *    the reach beyond is the upper Ros, navigable to the grain towns, and it
 *    leaves the built world to the south-west.
 *  - **Lake Brul** in the north-east, cold and deep and stormy;
 *  - **the Thelas chain**, three connected basins in the west, which drain into
 *    Ela by the river the lake people call simply **the Link**;
 *  - **Lake Ossen** in the east, shallow and warm and full of fish.
 *
 * Water is described two ways. A **basin** is a closed shore with one level: a
 * lake does not run downhill. A **reach** is a course with a half width and a
 * falling surface at each vertex: the narrows and the Link. Both are rasterised
 * once into a signed distance field with the water's own level carried outward,
 * so `elagosGround` can answer any point in the world in one bilinear sample.
 */
import { AMBRON, ambronPoint, MAIN_ROAD } from './region-world.js';

const freeze = Object.freeze;
const point = (x, z) => freeze({ x, z });
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const smooth = (a, b, x) => { const v = clamp((x - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); };
const lerp = (a, b, t) => a + (b - a) * t;

// ---------------------------------------------------------------------------
// The lakes
// ---------------------------------------------------------------------------
/** The floor every basin and reach is cut to: below `canStand`'s footing, so nobody wades a lake. */
export const WATER_FLOOR = 0.2;
/** How far outside the water the ground is shaped at all. */
export const WATER_REACH = 46;

/**
 * A basin's shore: an ellipse about `centre`, turned by `angle`, with a fixed
 * wobble so no lake reads as a drawn oval. Deterministic — the same forty points
 * every run, in Node and in the renderer.
 */
function basinShore(spec, steps = 40) {
  const cos = Math.cos(spec.angle), sin = Math.sin(spec.angle);
  const points = [];
  for (let i = 0; i < steps; i++) {
    const t = i / steps * Math.PI * 2;
    const wobble = 1 + Math.sin(t * 3 + spec.phase) * .075 + Math.sin(t * 5 - spec.phase * 1.7) * .045;
    const a = Math.cos(t) * spec.along * wobble, b = Math.sin(t) * spec.across * wobble;
    points.push(point(spec.centre.x + a * cos - b * sin, spec.centre.z + a * sin + b * cos));
  }
  return freeze(points);
}

const basin = spec => freeze({ ...spec, kind: 'basin', centre: point(spec.centre[0], spec.centre[1]),
  shore: basinShore({ ...spec, centre: { x: spec.centre[0], z: spec.centre[1] } }) });

/**
 * The lakes, each drawn around the atlas hexes it must cover. `hexes` are the
 * authored lake cells the basin answers for; the test holds it to them.
 */
export const LAKE_ELA = basin({ id: 'lake-ela', name: 'Lake Ela', surface: 14.6, hexes: [[0, 107], [0, 108]],
  centre: [-1345, 100], along: 114, across: 62, angle: .878, phase: 1.1 });
export const LAKE_BRUL = basin({ id: 'lake-brul', name: 'Lake Brul', surface: 16.4, hexes: [[5, 104]],
  centre: [-1000, -144], along: 66, across: 52, angle: .5, phase: 2.4 });
export const LAKE_OSSEN = basin({ id: 'lake-ossen', name: 'Lake Ossen', surface: 16, hexes: [[4, 106]],
  centre: [-1000, 29], along: 70, across: 54, angle: -.4, phase: .3 });
/** The Thelas chain: three basins of one drainage that agree about nothing else. */
export const THELAS_BASINS = freeze([
  basin({ id: 'thelas-upper', name: 'Upper Thelas', surface: 16.8, hexes: [], centre: [-1284, -88], along: 32, across: 25, angle: .35, phase: .8 }),
  basin({ id: 'thelas-middle', name: 'Middle Thelas', surface: 16.8, hexes: [[2, 105]], centre: [-1250, -58], along: 30, across: 24, angle: .9, phase: 1.9 }),
  basin({ id: 'thelas-lower', name: 'Lower Thelas', surface: 16.8, hexes: [], centre: [-1217, -30], along: 27, across: 21, angle: .6, phase: 3.1 }),
]);

// ---------------------------------------------------------------------------
// The reaches: the narrows, and the Link
// ---------------------------------------------------------------------------
const reach = (id, name, vertices) => freeze({ id, name, kind: 'reach',
  points: freeze(vertices.map(([x, z, half, surface]) => freeze({ x, z, half, surface }))) });

/**
 * The Ela-south, from the lake's outlet to the edge of the built world.
 *
 * The surface holds Ela's own level through the city — the narrows is the lake,
 * pinched — and then falls: hard over the Stair, where the shelf ends and the
 * ground drops toward the Moros, and gently after it. It never rises.
 * `tests/elagos-world.test.js` checks that and checks the ground stands clear
 * of the water at every vertex.
 */
export const ELA_SOUTH = reach('ela-south', 'The Ela-south', [
  [-1286, 186, 22, 14.6],                     // inside the lake's south-eastern tip
  [-1280, 202, 22, 14.6],                     // the throat
  [-1274, 218, 23, 14.6],                     // the north water gate
  [-1274, 252, 23, 14.6],
  [-1274, 286, 23, 14.6],                     // under the causeway
  [-1274, 322, 23, 14.6],
  [-1274, 354, 23, 14.6],                     // the chain, in the south water gate
  [-1274, 372, 22, 14.6],                     // the lower basin, where the southbound wait
  [-1276, 388, 19, 13.3],                     // the head of the Stair
  [-1280, 400, 17, 11.0],
  [-1286, 412, 16, 9.2],                      // the foot of the Stair
  [-1294, 430, 16, 8.2],
  [-1306, 452, 17, 7.2],
  [-1322, 472, 18, 6.4],
  [-1350, 486, 18, 5.8],
  [-1400, 496, 19, 5.2],
  [-1470, 504, 20, 4.6],
  [-1545, 510, 21, 4.2],
  [-1625, 514, 22, 3.9],
]);

/** The Link: the Thelas chain's drain into Ela. Small, quick, and portaged rather than sailed. */
export const THELAS_LINK = reach('thelas-link', 'The Link', [
  [-1213, -22, 8, 16.8],
  [-1240, -2, 8, 16.2],
  [-1272, 16, 9, 15.6],
  [-1306, 36, 9, 15.0],
  [-1338, 62, 10, 14.6],
]);

export const ELAGOS_BASINS = freeze([LAKE_ELA, LAKE_BRUL, LAKE_OSSEN, ...THELAS_BASINS]);
export const ELAGOS_REACHES = freeze([ELA_SOUTH, THELAS_LINK]);
export const ELAGOS_WATERS = freeze([...ELAGOS_BASINS, ...ELAGOS_REACHES]);

// ---------------------------------------------------------------------------
// The water field
// ---------------------------------------------------------------------------
function inPolygon(polygon, x, z) {
  let inside = false;
  for (let i = 0, previous = polygon.length - 1; i < polygon.length; previous = i++) {
    const a = polygon[previous], b = polygon[i];
    if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

/** Where a reach covers a point: its interpolated surface, or null. */
function onReach(course, x, z) {
  let best = null, bestDistance = Infinity;
  const points = course.points;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], dx = b.x - a.x, dz = b.z - a.z;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
    const distance = Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
    if (distance >= bestDistance) continue;
    bestDistance = distance;
    best = { distance, half: lerp(a.half, b.half, t), surface: lerp(a.surface, b.surface, t) };
  }
  return best && best.distance <= best.half ? best.surface : null;
}

const FIELD_CELL = 4, FIELD_MARGIN = WATER_REACH + 30;

/**
 * One rasterised pass over every basin and reach: a signed distance to the
 * water's edge (negative under water) and, carried outward from the nearest wet
 * cell, the level of the water there. Two chamfer sweeps, as the coastline in
 * `region-world.js` is built, so the whole field costs one pass over its cells
 * rather than a polygon test per query.
 */
const FIELD = (() => {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  const note = (x, z) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); };
  for (const water of ELAGOS_BASINS) for (const p of water.shore) note(p.x, p.z);
  for (const water of ELAGOS_REACHES) for (const p of water.points) { note(p.x - p.half, p.z - p.half); note(p.x + p.half, p.z + p.half); }
  minX -= FIELD_MARGIN; maxX += FIELD_MARGIN; minZ -= FIELD_MARGIN; maxZ += FIELD_MARGIN;
  const columns = Math.ceil((maxX - minX) / FIELD_CELL) + 1, rows = Math.ceil((maxZ - minZ) / FIELD_CELL) + 1;
  const wet = new Uint8Array(columns * rows), level = new Float32Array(columns * rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) {
    const x = minX + i * FIELD_CELL, z = minZ + j * FIELD_CELL, at = j * columns + i;
    let surface = null;
    for (const water of ELAGOS_BASINS) if (inPolygon(water.shore, x, z)) { surface = surface === null ? water.surface : Math.min(surface, water.surface); }
    for (const course of ELAGOS_REACHES) { const s = onReach(course, x, z); if (s !== null) surface = surface === null ? s : Math.min(surface, s); }
    if (surface !== null) { wet[at] = 1; level[at] = surface; }
  }
  /** Chamfer distance from the seeded cells, carrying each seed's level with it. */
  const sweep = seeds => {
    const distance = new Float32Array(columns * rows).fill(1e9), carried = new Float32Array(columns * rows);
    for (let i = 0; i < seeds.length; i++) if (seeds[i]) { distance[i] = 0; carried[i] = level[i]; }
    const straight = FIELD_CELL, diagonal = FIELD_CELL * Math.SQRT2;
    const relax = (at, from, step) => { const value = distance[from] + step; if (value < distance[at]) { distance[at] = value; carried[at] = carried[from]; } };
    for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) {
      const at = j * columns + i;
      if (i > 0) relax(at, at - 1, straight);
      if (j > 0) relax(at, at - columns, straight);
      if (i > 0 && j > 0) relax(at, at - columns - 1, diagonal);
      if (i < columns - 1 && j > 0) relax(at, at - columns + 1, diagonal);
    }
    for (let j = rows - 1; j >= 0; j--) for (let i = columns - 1; i >= 0; i--) {
      const at = j * columns + i;
      if (i < columns - 1) relax(at, at + 1, straight);
      if (j < rows - 1) relax(at, at + columns, straight);
      if (i < columns - 1 && j < rows - 1) relax(at, at + columns + 1, diagonal);
      if (i > 0 && j < rows - 1) relax(at, at + columns - 1, diagonal);
    }
    return { distance, carried };
  };
  const dry = new Uint8Array(wet.length);
  for (let i = 0; i < wet.length; i++) dry[i] = wet[i] ? 0 : 1;
  const toWater = sweep(wet), toLand = sweep(dry);
  const signed = new Float32Array(wet.length), surfaces = new Float32Array(wet.length);
  for (let i = 0; i < wet.length; i++) {
    signed[i] = wet[i] ? -toLand.distance[i] : toWater.distance[i];
    surfaces[i] = wet[i] ? level[i] : toWater.carried[i];
  }
  return { minX, minZ, maxX, maxZ, columns, rows, signed, surfaces };
})();

export const WATER_FIELD_BOUNDS = freeze({ minX: FIELD.minX, maxX: FIELD.maxX, minZ: FIELD.minZ, maxZ: FIELD.maxZ });

/**
 * The water at a world point: `d` is metres to the nearest shore, negative under
 * water, and `surface` the level of that water. Null well away from Elagos.
 */
export function elagosWater(x, z) {
  if (x < FIELD.minX || x > FIELD.maxX || z < FIELD.minZ || z > FIELD.maxZ) return null;
  const fx = clamp((x - FIELD.minX) / FIELD_CELL, 0, FIELD.columns - 1.0001);
  const fz = clamp((z - FIELD.minZ) / FIELD_CELL, 0, FIELD.rows - 1.0001);
  const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
  const at = (a, b) => b * FIELD.columns + a;
  const s00 = FIELD.signed[at(i, j)], s10 = FIELD.signed[at(i + 1, j)], s01 = FIELD.signed[at(i, j + 1)], s11 = FIELD.signed[at(i + 1, j + 1)];
  const d = lerp(lerp(s00, s10, tx), lerp(s01, s11, tx), tz);
  if (d > WATER_REACH) return null;
  const u00 = FIELD.surfaces[at(i, j)], u10 = FIELD.surfaces[at(i + 1, j)], u01 = FIELD.surfaces[at(i, j + 1)], u11 = FIELD.surfaces[at(i + 1, j + 1)];
  return { d, surface: lerp(lerp(u00, u10, tx), lerp(u01, u11, tx), tz) };
}

/** Metres to the nearest Elagosi shore, negative under water; Infinity elsewhere. */
export function elagosWaterDistance(x, z) {
  const water = elagosWater(x, z);
  return water ? water.d : Infinity;
}
/** True under the water of Elagos, with an optional margin outside the shore. */
export const inElagosWater = (x, z, margin = 0) => elagosWaterDistance(x, z) < margin;

/**
 * The ground of Elagos, given the ground the region profile would otherwise
 * have. Under water it falls away to `WATER_FLOOR` within twelve metres of the
 * shore — below footing, so the lakes are water and not shallows, and the opaque
 * surface hides the drop. Outside it, a bank rises from the waterline, and where
 * the land stands high above the water the cut widens with the depth of it, so
 * the Ela-south runs through a valley below the Stair rather than a slot.
 */
export function elagosGround(x, z, natural) {
  const water = elagosWater(x, z);
  if (!water) return natural;
  const { d, surface } = water;
  if (d < 0) return Math.min(natural, lerp(surface, WATER_FLOOR, smooth(0, -12, d)));
  const bank = surface + 1.2 * smooth(0, 12, d);
  const depth = clamp(natural - bank, 0, 18);
  const valley = 8 + depth * 2.3;
  const shaped = Math.max(bank, Math.min(natural, lerp(bank, natural, smooth(0, valley, d))));
  return lerp(shaped, natural, smooth(0, WATER_REACH, d));
}

/** The water's level at a point of it, for the surface mesh and the quays. */
export const elagosWaterSurface = (x, z) => elagosWater(x, z)?.surface ?? null;

// ---------------------------------------------------------------------------
// Roads
// ---------------------------------------------------------------------------
/** The main road's own point at a given x, on the one straight that crosses it. */
function mainRoadAt(x) {
  for (let i = 1; i < MAIN_ROAD.length; i++) {
    const a = MAIN_ROAD[i - 1], b = MAIN_ROAD[i];
    if ((a.x - x) * (b.x - x) <= 0 && a.x !== b.x) { const t = (x - a.x) / (b.x - a.x); return point(x, a.z + (b.z - a.z) * t); }
  }
  throw new Error(`The main road does not pass x = ${x}.`);
}

/** Where the Ambron road leaves the Moros road, out west past the Legion camp. */
export const AMBRON_JUNCTION = mainRoadAt(-1258);

/**
 * The haul road: up the east bank of the Ela-south from the Moros, past the
 * Stair, to Ambron's Plain Gate. This is the way in from everything the traveler
 * has already walked, and the way the toll's grain goes south.
 */
export const AMBRON_ROAD = freeze([
  AMBRON_JUNCTION,
  point(-1250, 566), point(-1246, 524), point(-1242, 482), point(-1234, 442),
  point(-1226, 410), point(-1220, 382),
  ambronPoint(56, 68), ambronPoint(56, 52),
]);

/**
 * The Link crossing: three slabs of lake-stone on piers where the lake road goes
 * over the Thelas water. Its ends are road vertices, so the way across is straight.
 * `world.js` hands it to the same deck list the Caloss and Tessen bridges use.
 */
export const LINK_BRIDGE = (() => {
  const crossing = point(-1272, 15), axis = point(-.3, -.9539), halfSpan = 16;
  return freeze({ id: 'link-bridge', name: 'The Link Crossing', crossing, halfSpan, laneHalf: 2.4,
    axis, side: point(-axis.z, axis.x), deckY: 17.9,
    south: point(crossing.x - axis.x * halfSpan, crossing.z - axis.z * halfSpan),
    north: point(crossing.x + axis.x * halfSpan, crossing.z + axis.z * halfSpan) });
})();

/** Out of the Lake Gate, north along Ela's eastern shore, over the Link, to the shrine. */
export const LAKE_ROAD = freeze([
  ambronPoint(56, -52), ambronPoint(56, -68),
  point(-1222, 200), point(-1240, 178), point(-1248, 152), point(-1258, 126),
  point(-1270, 100), point(-1280, 74), point(-1276, 50),
  LINK_BRIDGE.south, LINK_BRIDGE.north,
  point(-1292, -6), point(-1314, -4), point(-1332, 4),
]);

/** The farm track east out of the Ossen Gate, toward the warm lake and its grain. */
export const OSSEN_TRACK = freeze([
  ambronPoint(92, -6), ambronPoint(106, -8), point(-1150, 270), point(-1120, 258), point(-1096, 240),
]);

/** The strand road west out of the Raft Gate, to where the timber rafts are broken up. */
export const RAFT_TRACK = freeze([
  ambronPoint(-92, 22), ambronPoint(-106, 20), point(-1394, 300), point(-1408, 288), point(-1416, 272),
]);

export const ELAGOS_ROADS = freeze([AMBRON_ROAD, LAKE_ROAD, OSSEN_TRACK, RAFT_TRACK]);
/** Ground the water colliders leave open: the causeway's lane is handled by src/ambron.js. */
export const onLinkBridge = (x, z, margin = 0) => {
  const b = LINK_BRIDGE, dx = x - b.crossing.x, dz = z - b.crossing.z;
  return Math.abs(dx * b.axis.x + dz * b.axis.z) <= b.halfSpan + margin && Math.abs(dx * b.side.x + dz * b.side.z) <= b.laneHalf + margin;
};

// ---------------------------------------------------------------------------
// The lake country: places with something to find
// ---------------------------------------------------------------------------
/** Nemmel, a fishing hamlet on Ela's eastern shore, an hour north of the city. */
export const NEMMEL = freeze({ id: 'nemmel', name: 'Nemmel', ...point(-1258, 126), radius: 26 });
/** The stone that marks where the winter ice-road leaves this shore for the far one. */
export const ICE_ROAD_STONE = freeze({ id: 'ice-road-stone', name: 'The Ice-Road Stone', ...point(-1287, 66) });
/** The shrine of the lake, at the water, where a crossing is asked for and paid for. */
export const LAKE_SHRINE = freeze({ id: 'lake-shrine', name: 'The Lake Shrine', ...point(-1338, 12) });
/** The piers of an older causeway, standing out of the water below the city. */
export const DROWNED_CAUSEWAY = freeze({ id: 'drowned-causeway', name: 'The Drowned Causeway', ...point(-1246, 378), piers: point(-1274, 376) });
/** Where the shelf ends and the water goes down to the plain, and the oxen haul it back up. */
export const THE_STAIR = freeze({ id: 'the-stair', name: 'The Stair', ...point(-1254, 398), head: point(-1279, 396), capstan: point(-1256, 400) });

export const ELAGOS_PLACES = freeze({ nemmel: NEMMEL, iceRoad: ICE_ROAD_STONE, shrine: LAKE_SHRINE,
  drowned: DROWNED_CAUSEWAY, stair: THE_STAIR });

export const ELAGOS_LANDMARKS = freeze([
  freeze({ id: 'ambron', name: 'Ambron', ...AMBRON.centre, radius: 108,
    description: 'The largest city on the continent, built across the narrows where Lake Ela goes south. Walls of four ages on one line, a causeway over the water, quays on both banks, and a chain in the south water gate that every barge on the lake system has to wait for.' }),
  freeze({ id: 'ambron-chain', name: 'The Chain of Ambron', ...ambronPoint(0, 60),
    description: 'A chain the thickness of a man’s arm, slung between two towers across the water gate, and a capstan house to wind it. Nothing goes south until the toll is counted. The lore of the empire is written on a tally board beside it.' }),
  freeze({ id: 'ambron-causeway', name: 'The Ambron Causeway', ...ambronPoint(0, 0),
    description: 'Seven arches on old lake-stone piers, carrying the main street from the old city over to the timber strand. The piers are older than the arches, and the arches are older than the parapet.' }),
  freeze({ id: 'ambron-plain-gate', name: 'The Plain Gate', ...ambronPoint(56, 74),
    description: 'Ambron’s southern gate, on the haul road up from the Moros. The toll board over the arch lists what is owed on grain, fish, timber, salt and hides, in Elagosi and in Mittoli.' }),
  freeze({ id: 'lake-ela', name: 'Lake Ela', ...LAKE_ELA.centre, radius: 96,
    description: 'Cold, clear and old. It runs north-west further than the eye follows, and the whole of it comes south through one gap forty-six metres wide.' }),
  freeze({ id: 'nemmel', name: NEMMEL.name, ...NEMMEL, radius: NEMMEL.radius,
    description: 'A fishing hamlet on Ela’s eastern shore: six roofs, drying frames, a shingle beach with boats hauled up on it, and a smoking shed that works all year.' }),
  freeze({ id: 'ice-road-stone', name: ICE_ROAD_STONE.name, ...ICE_ROAD_STONE,
    description: 'A limewashed stone at the water, cut with a hand’s breadth of marks. When the lake takes the ice the road runs from here straight to the far shore, and the marks say how thick it has to be before a laden sledge may cross.' }),
  freeze({ id: 'drowned-causeway', name: DROWNED_CAUSEWAY.name, ...DROWNED_CAUSEWAY,
    description: 'Eleven stumps of lake-stone standing in the water below the city, in a line for the far bank. An older Ambron crossed here, when the lake stood lower and the walls stood elsewhere.' }),
  freeze({ id: 'lake-shrine', name: LAKE_SHRINE.name, ...LAKE_SHRINE,
    description: 'A niche of lake-stone at the waterline with a stone bowl before it. The offerings are small: a hook, a coin, a strip of net. The lakes were here before Ambron and the people who live on them know it.' }),
  freeze({ id: 'the-stair', name: THE_STAIR.name, ...THE_STAIR,
    description: 'Below the city the shelf ends. The water goes down to the Moros in four steps of shelved rock, white the whole way, and a laden barge that wants to come up does it on the ox capstan at the head of it.' }),
  freeze({ id: 'thelas-link', name: 'The Link', ...point(-1272, 16),
    description: 'The river the Thelas chain sends down to Ela. Too quick to sail and too shallow to load: whatever comes down the chain is portaged round it, which is one of the several things the three basins argue about.' }),
  freeze({ id: 'lake-brul', name: 'Lake Brul', ...LAKE_BRUL.centre, radius: 58,
    description: 'The deep water of the north-east. Its fishers take a fish nobody else on the continent can reach, in weather nobody else would put out in, and Ambron taxes the catch without ever suggesting an improvement.' }),
  freeze({ id: 'lake-ossen', name: 'Lake Ossen', ...LAKE_OSSEN.centre, radius: 62,
    description: 'Shallow, warm and astonishingly productive: the lake that actually feeds Ambron. The granary roofs and the road metal on this shore are the Empire’s own, and they outlast every period that laid them.' }),
]);

// ---------------------------------------------------------------------------
// Ground the regional scatter leaves alone
// ---------------------------------------------------------------------------
/** Water, made ground and every built place of Elagos, as circles the scatter keeps out of. */
export const ELAGOS_CLEARINGS = freeze([
  freeze({ x: AMBRON.centre.x, z: AMBRON.centre.z, r: 124 }),
  freeze({ x: NEMMEL.x, z: NEMMEL.z, r: NEMMEL.radius + 4 }),
  freeze({ x: ICE_ROAD_STONE.x, z: ICE_ROAD_STONE.z, r: 11 }),
  freeze({ x: LAKE_SHRINE.x, z: LAKE_SHRINE.z, r: 11 }),
  freeze({ x: THE_STAIR.x, z: THE_STAIR.z, r: 26 }),
  // The water itself: a fan of circles from each basin's middle to every second
  // point of its shore, and a chain of them down each reach. Their union covers
  // the water and a few metres of its bank, which is all the scatter needs to know.
  ...ELAGOS_BASINS.flatMap(water => water.shore.filter((_, index) => index % 2 === 0).map(p => freeze({
    x: (p.x + water.centre.x) / 2, z: (p.z + water.centre.z) / 2,
    r: Math.hypot(p.x - water.centre.x, p.z - water.centre.z) / 2 + 5 }))),
  ...ELAGOS_REACHES.flatMap(course => course.points.flatMap((p, index) => {
    const next = course.points[index + 1];
    if (!next) return [freeze({ x: p.x, z: p.z, r: p.half + 5 })];
    const steps = Math.max(1, Math.round(Math.hypot(next.x - p.x, next.z - p.z) / 16));
    return Array.from({ length: steps }, (_, k) => freeze({ x: lerp(p.x, next.x, k / steps), z: lerp(p.z, next.z, k / steps),
      r: lerp(p.half, next.half, k / steps) + 8 }));
  })),
]);

// ---------------------------------------------------------------------------
// Signposts, in the road's own language
// ---------------------------------------------------------------------------
export const ELAGOS_SIGNS = freeze([
  freeze({ ...point(AMBRON_JUNCTION.x + 4, AMBRON_JUNCTION.z - 7), label: 'Ambron', returnLabel: 'The Legion Camp', yaw: 0 }),
  freeze({ ...point(-1238, 462), label: 'Ambron', returnLabel: 'Moros Plain', yaw: 0 }),
  freeze({ ...point(-1233, 410), label: 'The Stair', returnLabel: 'Ambron', yaw: 0 }),
  freeze({ ...point(-1228, 198), label: 'Nemmel', returnLabel: 'Ambron', yaw: 0 }),
  freeze({ ...point(-1278, 70), label: 'The Lake Shrine', returnLabel: 'Nemmel', yaw: 0 }),
]);

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------
/** Elagos's water for the journal chart: one polygon per basin, one strip per reach. */
export const ELAGOS_CHART_WATERS = freeze([
  ...ELAGOS_BASINS.map(water => freeze({ id: `${water.id}-water`, kind: 'polygon', points: water.shore })),
  ...ELAGOS_REACHES.map(course => freeze({ id: `${course.id}-water`, kind: 'polygon', points: freeze((() => {
    const left = [], right = [];
    const points = course.points;
    for (let i = 0; i < points.length; i++) {
      const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
      const length = Math.hypot(b.x - a.x, b.z - a.z) || 1, nx = -(b.z - a.z) / length, nz = (b.x - a.x) / length;
      const p = points[i];
      left.push(point(p.x - nx * p.half, p.z - nz * p.half));
      right.push(point(p.x + nx * p.half, p.z + nz * p.half));
    }
    return [...left, ...right.reverse()];
  })()) })),
]);

export { AMBRON, ambronPoint };
