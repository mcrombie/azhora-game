/**
 * South Suval: the peninsula's southern hills, the Stillwater, and Imlamdris on its shore.
 *
 * Pure: no three, no DOM. `src/content/regions/south-suval/south-suval-scenery.js` renders what is described here;
 * `src/world/terrain/world-terrain.js` cuts the ground to it (`southSuvalGround`); the chart, the tests and
 * the wildlife read the same numbers.
 *
 * Like Pueth, Peblos and Elagos, South Suval is authored directly in **world metres** (100 m per
 * authored hex). It never existed in the 56 m frame.
 *
 * **What comes from the atlas** (the atlas wins over the lore, and here they agree):
 *  - fifteen land hexes - seven of hills, four of mountain and four of grassland - and the lake
 *    hex at (6,120) that no region claims but that South Suval rings on all six sides, taken as
 *    the region's own `lake` cell (`ENCLOSED_HEXES`, scripts/build-region-survey.mjs);
 *  - three climates: `Csa` over ten hexes, `Csc` on the three mountain hexes of the ridge, and
 *    `Cfb` on the two northern hills and on the lake itself;
 *  - no river edge at all, which is the lore's point about the lake.
 *
 * **What comes from the lore** (`../world-builder/azhora_lore/geography/regions/svaleen.md`,
 * `suval.md`, `culture/svaleen_wines.md`):
 *  - the lake is **the Stillwater**, "the only substantial lake in the region, fed by aquifer
 *    springs rather than seasonal rainfall ... The lake does not run dry";
 *  - the lake country is "its own microclimate - cooler, with morning mist off the water";
 *  - **Imlamdris** stands on its shore: the oldest city on the peninsula, no harbour, trade by
 *    road through the hill passes, streets wider than Solis's, the lake visible from most of the
 *    upper city, and the city faces the lake more completely than it faces any road. The great
 *    hall of **the Stillwater Temple** opens on its lakeside face and is closed on its landward
 *    side: "visitors arriving overland enter from the back";
 *  - the temple keeps the peninsula's archive of astronomical records, because "you can see the
 *    stars clearly in the inland hills, far from the coastal haze".
 *
 * **Where the city stands** is the user's (25 September 2026): north-east of the lake, on its
 * shore, in the north-east hex - which is (7,119), grassland, at bearing thirty degrees from the
 * lake's centre, with two mountain hexes of the ridge behind it. The natural ground there climbs
 * seventeen metres from the water to the back of the hex, so the city is built as the lore's
 * lower and upper city on terraces stepping up that slope, every one of them facing the water.
 */
import { hexCentre, landDistance, terrainMix, seamlessTerrainMix, relief } from '../../../world/terrain/region-world.js';
import { SUVAL_HILL_PASSES, hillPassPoint } from '../minora-frontier/frontier-ridges.js';

const freeze = Object.freeze;
const point = (x, z) => freeze({ x, z });
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const smooth = (a, b, x) => { const v = clamp((x - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); };
const lerp = (a, b, t) => a + (b - a) * t;

// ---------------------------------------------------------------------------
// The atlas
// ---------------------------------------------------------------------------
/** The lake hex, and the city's hex on its north-east shore. */
export const STILLWATER_HEX = freeze([6, 120]);
export const IMLAMDRIS_HEX = freeze([7, 119]);
/** What the World Builder map paints on each of South Suval's hexes, for the tests and the scatter. */
export const SOUTH_SUVAL_CLIMATE = freeze({
  '8,117': 'Cfb', '9,117': 'Cfb', '10,117': 'Csa',
  '6,118': 'Csc', '7,118': 'Csc', '8,118': 'Csc', '9,118': 'Csa',
  '5,119': 'Csa', '6,119': 'Csa', '7,119': 'Csa', '8,119': 'Csa',
  '5,120': 'Csa', '6,120': 'Cfb', '7,120': 'Csa',
  '5,121': 'Csa', '6,121': 'Csa',
});

// ---------------------------------------------------------------------------
// The Stillwater
// ---------------------------------------------------------------------------
/**
 * The lake's level. Every shore round it stands above this - the lowest ground on the ring at the
 * hex's own boundary is 16.4 m before the basin is cut - so the water meets land all the way round
 * and never spills: a spring-fed lake in a bowl, which is what the lore says it is.
 */
export const STILLWATER_SURFACE = 15.4;
/** How far outside the water the ground is shaped at all. */
export const STILLWATER_REACH = 44;

const lakeCentre = hexCentre(...STILLWATER_HEX);
/**
 * The basin: an ellipse about the lake hex's centre with a fixed wobble, as Elagos draws its
 * lakes, so the shore never reads as a drawn oval. It fills its hex - the hex's inradius is fifty
 * metres - and its north-east shore reaches the boundary with the city's hex, so Imlamdris stands
 * on the water. The long axis runs from the city's shore to the far south-west one.
 */
export const STILLWATER = freeze({
  id: 'stillwater', name: 'The Stillwater', surface: STILLWATER_SURFACE, hexes: freeze([STILLWATER_HEX]),
  centre: point(lakeCentre.x, lakeCentre.z),
  along: 50, across: 43,
  /**
   * The long axis's bearing, clockwise from north (world -z) toward east (world +x): thirty
   * degrees, which is the bearing from the lake's centre to the city's hex.
   */
  angle: Math.PI / 6,
  phase: 2.1,
});

const lakeCos = Math.cos(STILLWATER.angle), lakeSin = Math.sin(STILLWATER.angle);
/** The shore's radius at a bearing about the centre, in the lake's own frame. */
function shoreRadius(theta) {
  const wobble = 1 + Math.sin(theta * 3 + STILLWATER.phase) * .06 + Math.sin(theta * 5 - STILLWATER.phase * 1.7) * .035;
  const a = STILLWATER.along, b = STILLWATER.across;
  return a * b / Math.hypot(b * Math.cos(theta), a * Math.sin(theta)) * wobble;
}
/**
 * Signed distance to the shore: negative in the water, positive on land. Measured radially from
 * the centre, which is exact enough for a lake this nearly round and is what the ground, the
 * colliders and the tests all read.
 */
export function stillwaterDistance(x, z) {
  const dx = x - STILLWATER.centre.x, dz = z - STILLWATER.centre.z;
  // Into the lake's frame: `u` along the long axis (the bearing), `v` across it.
  const u = dx * lakeSin - dz * lakeCos, v = dx * lakeCos + dz * lakeSin;
  const rho = Math.hypot(u, v);
  return rho - shoreRadius(Math.atan2(v, u));
}
/** The shore, as a ring of points, for the water mesh and the chart. */
export const STILLWATER_SHORE = freeze(Array.from({ length: 64 }, (_, i) => {
  const theta = i / 64 * Math.PI * 2, r = shoreRadius(theta);
  const u = Math.cos(theta) * r, v = Math.sin(theta) * r;
  return point(STILLWATER.centre.x + u * lakeSin + v * lakeCos, STILLWATER.centre.z - u * lakeCos + v * lakeSin);
}));

/** Whether a point is in the lake, or within `margin` metres of its water. */
export const inStillwater = (x, z, margin = 0) => stillwaterDistance(x, z) < margin;

/**
 * The lake's bed. Below footing within a pace of the shore, so the lake is water and not shallows;
 * then down to nine metres in the middle, because a lake that has not run dry in any drought the
 * peninsula remembers is not a pond.
 */
function lakeBed(d) {
  return lerp(STILLWATER_SURFACE - .7, STILLWATER_SURFACE - 9, smooth(0, -30, d));
}
/**
 * The land round the lake: it comes down to a bank just above the water and no lower, over a
 * width that depends on how high the ground was, so a hill shore is steep and a grass shore is a
 * long gentle margin. Elagos's lakes are shaped the same way (`elagosGround`).
 */
function lakeShore(d, natural) {
  const bank = STILLWATER_SURFACE + .5 + 1.1 * smooth(0, 10, d);
  const depth = clamp(natural - bank, 0, 18);
  const valley = 7 + depth * 2.1;
  const shaped = Math.max(bank, Math.min(natural, lerp(bank, natural, smooth(0, valley, d))));
  return lerp(shaped, natural, smooth(0, STILLWATER_REACH, d));
}

// ---------------------------------------------------------------------------
// The ground
// ---------------------------------------------------------------------------
/** The box everything in this file shapes, with room to spare; outside it the ground is untouched. */
export const SOUTH_SUVAL_BOX = freeze({ minX: -330, maxX: 230, minZ: 900, maxZ: 1400 });

/**
 * The fine ground Imlamdris draws for itself (`src/content/regions/south-suval/south-suval-scenery.js`). The world's grid is
 * seven metres apart here, and a seven-metre triangle laid across a five-metre terrace wall comes up
 * through the floor of the terrace below it - through the temple's, first. So the city and its road
 * are drawn on a lattice of their own, laid out in the city's frame, with a line either side of
 * every wall inside the wall's own thickness, one at the foot and head of every flight and one down
 * each side of it (a hair inside the flight, so no line is ever read as off it), so that every step
 * in the ground happens inside stone; and the coarse grid is
 * sunk out of sight beneath it, as Amod's is. `a` and `b` bound the made ground - the terraces and
 * the road's bed - with twenty-four metres of natural hill round it, where the sink eases off and
 * the two grids agree.
 */
export const IMLAMDRIS_PATCH = freeze({ minA: -150, maxA: 77, minB: -32, maxB: 190, step: 2 });
/** Deeper than a coarse triangle can rise across the city's tallest wall or the road's deepest cut. */
const PATCH_SINK = 6;
/** How far the world's coarse grid is lowered under the patch: all the way inside, none at the rim. */
export function imlamdrisTerrainSink(x, z) {
  const p = IMLAMDRIS_PATCH, { a, b } = cityLocal(x, z);
  const inside = Math.min(a - p.minA, p.maxA - a, b - p.minB, p.maxB - b);
  if (inside <= 0) return 0;
  return PATCH_SINK * smooth(4, 20, inside);
}
/** The patch's lattice: its lines up the slope (`a`) and across it (`b`), in the city frame. */
export function imlamdrisPatchLines() {
  const p = IMLAMDRIS_PATCH;
  const lines = (min, max, special) => {
    const out = [...special];
    for (let v = min; v <= max + 1e-6; v += p.step) if (!special.some(s => Math.abs(s - v) < p.step * .3)) out.push(v);
    return [...new Set(out)].filter(v => v >= min && v <= max).sort((u, w) => u - w);
  };
  const walls = TERRACES.slice(1).map(terrace => terrace.from);
  const flights = STAIRS.flatMap(stair => stair.walls.flatMap(wall => [wall - stair.run, wall + stair.run]));
  return freeze({
    a: freeze(lines(p.minA, p.maxA, STAIRS.flatMap(stair => [stair.a - stair.half - .3, stair.a - stair.half + .02, stair.a + stair.half - .02, stair.a + stair.half + .3]))),
    b: freeze(lines(p.minB, p.maxB, [...walls.flatMap(wall => [wall - .4, wall + .4]), ...flights])),
  });
}

/**
 * South Suval's own ground: its hills without the atlas blend's seams, the Stillwater cut to its
 * level, and Imlamdris's made ground on the slope above it. Answers everywhere outside
 * `SOUTH_SUVAL_BOX` with the ground it was given.
 */
export function southSuvalGround(x, z, natural) {
  if (x < SOUTH_SUVAL_BOX.minX || x > SOUTH_SUVAL_BOX.maxX || z < SOUTH_SUVAL_BOX.minZ || z > SOUTH_SUVAL_BOX.maxZ) return natural;
  return roadGround(x, z, cliffGround(x, z, lakeAndCity(x, z, seamless(x, z, natural))));
}
/**
 * How much a point is South Suval's own to shape: all of it where the land round it is South
 * Suval's, fading to nothing across the borders with East and West Suval and inside the box's edge.
 * Both parts are continuous, so what is shaped by it meets the ground next door without a step.
 */
function ownGround(x, z, mix = seamlessTerrainMix(x, z)) {
  const b = SOUTH_SUVAL_BOX, inBox = Math.min(x - b.minX, b.maxX - x, z - b.minZ, b.maxZ - z);
  const land = 1 - (mix.weights.outland ?? 0);
  if (inBox <= 0 || land <= 1e-6) return 0;
  return smooth(.3, .75, (mix.weights['South Suval'] ?? 0) / land) * smooth(0, 30, inBox);
}
/**
 * The hills re-blended over every hex in reach (`seamlessTerrainMix`), which differs from the
 * world's blend only near hex corners, where the world's steps: beside the ridge, a five-metre
 * step down the hill behind the city. Full on South Suval's own ground and nothing beyond it - by
 * the share of the land round a point that is South Suval's, which is continuous - and nothing at
 * the edge of the box, so the ground next door does not move by a centimetre.
 */
function seamless(x, z, natural) {
  const now = seamlessTerrainMix(x, z);
  const fade = ownGround(x, z, now) * smooth(2, 40, landDistance(x, z));
  if (!fade) return natural;
  const was = terrainMix(x, z);
  return natural + (now.base + relief(x, z, now.amp, now.wave) - was.base - relief(x, z, was.amp, was.wave)) * fade;
}
/** The lake cut to its level, and Imlamdris's made ground on the slope above it. */
function lakeAndCity(x, z, natural) {
  if (x < SOUTH_SUVAL_BOX.minX || x > SOUTH_SUVAL_BOX.maxX || z < SOUTH_SUVAL_BOX.minZ || z > SOUTH_SUVAL_BOX.maxZ) return natural;
  const d = stillwaterDistance(x, z);
  let ground = natural;
  if (d < 0) return Math.min(natural, lakeBed(d));
  if (d < STILLWATER_REACH) ground = lakeShore(d, natural);
  // Imlamdris's made ground, on land only: the Lake Walk stops at the water's edge, a stone lip
  // a metre above it, and never fills the lake. Full inside the hex, given back to the hill over
  // its outer seven metres and behind the Star Terrace.
  const { a, b } = cityLocal(x, z);
  if (b < TERRACES[0].from || b > TERRACES[TERRACES.length - 1].to + 8) return ground;
  const inset = hexInset(a, b);
  if (inset <= CITY_FEATHER.none) return ground;
  const weight = smooth(CITY_FEATHER.none, CITY_FEATHER.full, inset) * (1 - smooth(TERRACES[TERRACES.length - 1].to, TERRACES[TERRACES.length - 1].to + 8, b));
  // A terrace's step is a wall, and a wall runs only as far as the full made ground: past its end
  // the ground climbs from one terrace to the next as a slope, so no step runs on into the hill.
  const level = lerp(terraceSlope(b), cityLevel(a, b), smooth(CITY_FEATHER.full - 1, CITY_FEATHER.full, inset));
  return lerp(ground, level, weight);
}

// ---------------------------------------------------------------------------
// Imlamdris
// ---------------------------------------------------------------------------
/**
 * The city's own frame. `b` runs up the slope from the water, on the lake-to-city bearing (thirty
 * degrees, north-east); `a` runs across it, positive toward the south-east. The origin is the
 * shore on that line, so `b = 0` is the water's edge in front of the temple.
 */
export const CITY_UP = freeze({ x: .5, z: -Math.sqrt(3) / 2 });
export const CITY_ACROSS = freeze({ x: Math.sqrt(3) / 2, z: .5 });
const shoreAhead = shoreRadius(0);
export const CITY_ORIGIN = point(STILLWATER.centre.x + CITY_UP.x * shoreAhead, STILLWATER.centre.z + CITY_UP.z * shoreAhead);
/** A point of the city's frame, in the world. */
export const cityPoint = (a, b) => point(CITY_ORIGIN.x + CITY_ACROSS.x * a + CITY_UP.x * b, CITY_ORIGIN.z + CITY_ACROSS.z * a + CITY_UP.z * b);
/** A world point, in the city's frame. */
export function cityLocal(x, z) {
  const dx = x - CITY_ORIGIN.x, dz = z - CITY_ORIGIN.z;
  return { a: dx * CITY_ACROSS.x + dz * CITY_ACROSS.z, b: dx * CITY_UP.x + dz * CITY_UP.z };
}
/** The world yaw of something facing down the slope, toward the lake (its front is +z locally). */
export const FACING_LAKE = Math.atan2(-CITY_UP.x, -CITY_UP.z);

/** The city's hex, in the city frame: its centre, and how far inside it a point stands. */
const hexMid = (() => { const c = hexCentre(...IMLAMDRIS_HEX); return cityLocal(c.x, c.z); })();
/**
 * Metres from a point to the nearest **land** side of the city's hex, negative outside it. The
 * hex's six sides lie fifty metres from its centre along the three axes that are the up-slope
 * bearing and sixty degrees either side of it; five of them are land, and the sixth - the south-
 * west side, shared with the lake's hex - is the water, which the city comes right down to. So
 * that side is not counted here; the lake's own shore is what stops the Lake Walk.
 */
export function hexInset(a, b) {
  const da = a - hexMid.a, db = b - hexMid.b;
  return 50 - Math.max(db, Math.abs(.866 * da + .5 * db), Math.abs(.866 * da - .5 * db));
}

/**
 * The terraces, from the water up. Each is level; the step between two is a retaining wall of
 * the city's pale stone, crossed only by the stairs. The levels follow the hill's own slope - the
 * natural ground climbs from 19.7 m at the foot of the hex to 36.6 m at its back - cut in where
 * the hill stood higher and built out where it stood lower.
 */
export const TERRACES = freeze([
  freeze({ id: 'lake-walk', name: 'The Lake Walk', from: -8, to: 8, level: 16.5 }),
  freeze({ id: 'temple-terrace', name: 'The Temple Terrace', from: 8, to: 32, level: 19.4 }),
  freeze({ id: 'wide-street', name: 'The Wide Street', from: 32, to: 52, level: 24.2 }),
  freeze({ id: 'upper-city', name: 'The Upper City', from: 52, to: 74, level: 29.2 }),
  freeze({ id: 'star-terrace', name: 'The Star Terrace', from: 74, to: 88, level: 34 }),
]);
/** How far inside the hex's edge the made ground is full, and where it has given way to the hill. */
export const CITY_FEATHER = freeze({ full: 11, none: 4 });

/**
 * The stairs. Two grand flights either side of the temple climb the whole city; the temple's own
 * broad steps come up from the Lake Walk in front of the colonnade. Each flight is a ramp over
 * `run` metres either side of the wall it crosses, and the wall is open for its width.
 */
export const STAIRS = freeze([
  freeze({ id: 'west-stair', a: -17, half: 2.2, run: 5.5, walls: freeze([8, 32, 52, 74]) }),
  freeze({ id: 'east-stair', a: 17, half: 2.2, run: 5.5, walls: freeze([8, 32, 52, 74]) }),
  freeze({ id: 'temple-steps', a: 0, half: 7.5, run: 3.5, walls: freeze([8]) }),
]);

/** The level of the terrace a point of the city frame stands on, before any stair. */
function terraceLevel(b) {
  for (const terrace of TERRACES) if (b < terrace.to) return terrace.level;
  return TERRACES[TERRACES.length - 1].level;
}
/** The made ground at a point of the city frame: the terrace, or a flight of steps across it. */
export function cityLevel(a, b) {
  for (const stair of STAIRS) {
    if (Math.abs(a - stair.a) > stair.half) continue;
    for (const wall of stair.walls) {
      if (Math.abs(b - wall) > stair.run) continue;
      const low = terraceLevel(wall - .01), high = terraceLevel(wall + .01);
      return lerp(low, high, (b - (wall - stair.run)) / (stair.run * 2));
    }
  }
  return terraceLevel(b);
}
/** The terraces as one slope, straight from the middle of each to the middle of the next. */
function terraceSlope(b) {
  let last = null;
  for (const terrace of TERRACES) {
    const mid = (terrace.from + terrace.to) / 2;
    if (b <= mid) return last ? lerp(last.level, terrace.level, (b - last.mid) / (mid - last.mid)) : terrace.level;
    last = { mid, level: terrace.level };
  }
  return last.level;
}
/** Whether a point is on the city's made ground (the full terrace, not the feather round it). */
export function inImlamdris(x, z, margin = 0) {
  const { a, b } = cityLocal(x, z);
  return b > TERRACES[0].from - margin && b < TERRACES[TERRACES.length - 1].to + margin && hexInset(a, b) > CITY_FEATHER.none - margin;
}

// ---------------------------------------------------------------------------
// The road through the hill pass
// ---------------------------------------------------------------------------
/**
 * "Imlamdris is not a maritime city. It has no harbor. Its trade moves by road through the hill
 * passes." The road leaves by the Landward Gate at the back of the Star Terrace, runs up the level
 * shelf east of the ridge's spur to the saddle - the lowest way out of the lake's bowl, measured -
 * and turns west there under the ridge's north flank to East Suval's frontier, where it meets the
 * Elod southern hill gate (`src/content/regions/minora-frontier/frontier-ridges.js`). The frontier is a wall of limestone ridge
 * with that gate barred in it, so the road ends at the gate: a hill pass on both sides of the
 * border is one pass, and the city's trade road is the road to it.
 *
 * Each vertex carries the road's own grade, read off the ground and smoothed; the road is cut and
 * built to it, so it never climbs a bank. Under the ridge's spur that is a cutting six metres deep.
 */
const roadVertex = (p, grade) => freeze({ x: p.x, z: p.z, grade });
export const ELOD_SOUTH_GATE = SUVAL_HILL_PASSES.find(gate => gate.id === 'elodi-south-pass');
export const PASS_ROAD = freeze([
  roadVertex(cityPoint(18, 86), 34),
  roadVertex(cityPoint(21, 100), 35.2),
  roadVertex(cityPoint(24, 118), 36.1),
  roadVertex(point(20, 1060), 36.4),
  roadVertex(point(-10, 1054), 40),
  roadVertex(point(-45, 1047), 45.5),
  roadVertex(point(-80, 1041), 46.5),
  roadVertex(point(-106, 1037), 45.5),
  // Seven metres short of the gate's line, on the South Suval side: the gate is barred.
  roadVertex(hillPassPoint(ELOD_SOUTH_GATE, 0, -7), 44),
]);
export const PASS_ROAD_HALF = 2.2;
/**
 * The road as it is built: a Catmull-Rom curve through the vertices above, every two metres,
 * carrying its grade. The ground is graded to this line and `world.js` lays the ribbon along the
 * same points, so the road surface can never slide off its own bed at a bend.
 */
export const PASS_ROAD_LINE = (() => {
  const v = PASS_ROAD, points = [], at = i => v[clamp(i, 0, v.length - 1)];
  const marks = [];   // where each authored vertex falls in the dense line
  for (let i = 0; i < v.length - 1; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const steps = Math.max(2, Math.ceil(Math.hypot(p2.x - p1.x, p2.z - p1.z) / 2));
    marks.push(points.length);
    for (let k = 0; k < steps; k++) {
      const t = k / steps, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      points.push({ x: f(p0.x, p1.x, p2.x, p3.x), z: f(p0.z, p1.z, p2.z, p3.z) });
    }
  }
  marks.push(points.length);
  points.push({ x: v[v.length - 1].x, z: v[v.length - 1].z });
  // The grade is spread by distance along the road, not by the curve's parameter: a Catmull-Rom
  // bunches its samples toward its ends, and grading by parameter put a one-in-four pitch into
  // the road's last metre.
  const run = [0];
  for (let i = 1; i < points.length; i++) run.push(run[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z));
  return freeze(points.map((p, i) => {
    let seg = 0; while (seg < marks.length - 2 && i >= marks[seg + 1]) seg++;
    const s0 = run[marks[seg]], s1 = run[marks[seg + 1]];
    return freeze({ x: p.x, z: p.z, grade: lerp(v[seg].grade, v[seg + 1].grade, s1 > s0 ? (run[i] - s0) / (s1 - s0) : 0) });
  }));
})();
/** The Landward Gate: where the road comes into the city, at the back. */
export const LANDWARD_GATE = freeze({ ...cityPoint(18, 88), a: 18, b: 88 });

/** Nearest point on the road: its distance, and the road's grade there. */
export function passRoadAt(x, z) {
  let best = { distance: Infinity, grade: 0, along: 0 }, run = 0;
  for (let i = 1; i < PASS_ROAD_LINE.length; i++) {
    const p = PASS_ROAD_LINE[i - 1], q = PASS_ROAD_LINE[i], dx = q.x - p.x, dz = q.z - p.z, length = Math.hypot(dx, dz);
    const t = clamp(((x - p.x) * dx + (z - p.z) * dz) / (length * length), 0, 1);
    const distance = Math.hypot(p.x + dx * t - x, p.z + dz * t - z);
    if (distance < best.distance) best = { distance, grade: lerp(p.grade, q.grade, t), along: run + length * t };
    run += length;
  }
  return best;
}
/** The road's bed: its grade across its width, cut into or built out of the hill over six metres. */
function roadGround(x, z, ground) {
  const road = passRoadAt(x, z);
  if (road.distance > PASS_ROAD_HALF + 6) return ground;
  return lerp(road.grade, ground, smooth(PASS_ROAD_HALF + .6, PASS_ROAD_HALF + 6, road.distance));
}

// ---------------------------------------------------------------------------
// The city's buildings
// ---------------------------------------------------------------------------
/**
 * Every building faces the water: the lore's city "faces the lake more completely than it faces any
 * road or market", so a door and the windows are on the lake side of every house, and the backs
 * are to the hill and the road. `a`, `b` are the building's centre in the city frame; `width` runs
 * across the slope, `depth` up it.
 */
const house = (id, a, b, width, depth, height, terrace, storeys = 1) =>
  freeze({ id, kind: 'house', a, b, width, depth, height, terrace, storeys, ...cityPoint(a, b) });
export const IMLAMDRIS_HOUSES = freeze([
  // The Temple Terrace, beyond the two grand stairs.
  house('temple-west-house', -25.5, 24, 6.5, 7, 4.2, 'temple-terrace', 2),
  house('temple-east-house', 25.5, 24, 6.5, 7, 4.2, 'temple-terrace', 2),
  // The Wide Street: a row all along its upper side, broken only by the stairs.
  house('wide-1', -39, 47, 7, 8, 4.6, 'wide-street', 2),
  house('wide-2', -31, 47, 7, 8, 4.1, 'wide-street'),
  house('wide-3', -23.2, 47, 6.4, 8, 4.9, 'wide-street', 2),
  house('wide-4', -9, 47, 7.5, 8, 4.4, 'wide-street', 2),
  house('wide-5', 0, 47.5, 8, 9, 5.4, 'wide-street', 2),
  house('wide-6', 9, 47, 7.5, 8, 4.3, 'wide-street'),
  house('wide-7', 23.2, 47, 6.4, 8, 4.7, 'wide-street', 2),
  house('wide-8', 31, 47, 7, 8, 4.2, 'wide-street'),
  house('wide-9', 39, 47, 7, 8, 4.5, 'wide-street', 2),
  // The Upper City: fewer and larger, because the hex narrows toward its back.
  house('upper-1', -27.5, 66, 7, 8, 4.8, 'upper-city', 2),
  house('upper-2', -8.5, 66, 7.5, 8, 5, 'upper-city', 2),
  house('upper-3', 0, 66.5, 7.5, 9, 5.6, 'upper-city', 2),
  house('upper-4', 8.5, 66, 7.5, 8, 4.6, 'upper-city', 2),
  house('upper-5', 27.5, 66, 7, 8, 4.7, 'upper-city', 2),
]);

/**
 * The Stillwater Temple: "the great hall of the Stillwater Temple, which is not primarily a temple
 * but serves several functions, opens on its lakeside face and is closed on its landward side.
 * Visitors arriving overland enter from the back." So a long hall on the Temple Terrace with a
 * colonnade and no wall on the water side, broad steps from the Lake Walk up to it, three blank
 * walls, and one door in the back wall onto the lane behind.
 */
export const STILLWATER_TEMPLE = freeze({ id: 'stillwater-temple', name: 'The Stillwater Temple',
  a: 0, b: 20.5, width: 22, depth: 17, height: 8.5, columns: 8, ...cityPoint(0, 20.5) });

/**
 * The Star Terrace's furniture. "The Stillwater Temple maintains the peninsula's most significant
 * archive of astronomical records ... you can see the stars clearly in the inland hills, far from
 * the coastal haze." A tall gnomon, a half-ring of sighting stones round it facing the southern sky
 * over the lake, and a stone table for whoever keeps the night's record.
 */
export const STAR_TERRACE = freeze({
  gnomon: freeze({ ...cityPoint(-4, 80), a: -4, b: 80, height: 6.5 }),
  stones: freeze(Array.from({ length: 9 }, (_, i) => {
    const angle = Math.PI * (.12 + .76 * i / 8), a = -4 + Math.cos(angle) * 9, b = 80 - Math.sin(angle) * 5.5;
    return freeze({ a, b, ...cityPoint(a, b), height: 1.1 + (i % 3) * .25 });
  })),
  table: freeze({ ...cityPoint(-15, 83), a: -15, b: 83 }),
});

/**
 * Steps down into the water from the Lake Walk. No quay, no moorings and no boats - the lore says
 * the city has no harbour - only three flights where somebody might go down to the water, and the
 * Lake Walk's parapet open for each.
 */
export const WATER_STEPS = freeze([-12, 0, 12].map(a => freeze({ a, half: 2 })));

// ---------------------------------------------------------------------------
// What the country's scatter keeps off
// ---------------------------------------------------------------------------
/** The lake, the city and the ground round it, and the road. */
export function southSuvalClear(x, z, margin = 0) {
  if (inStillwater(x, z, 1.5 + margin)) return true;
  const { a, b } = cityLocal(x, z);
  if (b > TERRACES[0].from - 2 - margin && b < TERRACES[TERRACES.length - 1].to + 6 + margin && hexInset(a, b) > 1 - margin) return true;
  return passRoadAt(x, z).distance < PASS_ROAD_HALF + 2.5 + margin;
}

// ---------------------------------------------------------------------------
// The coast: cliffs, and two places to land
// ---------------------------------------------------------------------------
/**
 * "The terrain here is hillier than the western section - the ridge system drops more steeply to
 * the southern coast, creating a more dramatic coastline with fewer accessible beaches and more
 * cliff faces. Fishing communities are scattered along the southern coast wherever the topography
 * allows landing" (suval.md).
 *
 * The coast field every region shares draws a beach wherever land meets the sea: a ramp forty or
 * fifty metres long from the hills to the water. Here the ground is lifted just inside the shore
 * instead, so it holds its height nearly to the water and then drops: a face of fourteen to twenty
 * metres on the south and south-west, nine to fourteen on the east, varying along its length so it
 * reads as a coast and not a wall. Two places are left as the ordinary beach: a cove on the south
 * coast below the grass south of the lake, and the east shore where the gap between the ridge and
 * the eastern hills comes down to the sea. The fishing villages the lore puts in places like these
 * are people, and are not built.
 */
export const COVES = freeze([
  freeze({ id: 'south-cove', name: 'The south cove', x: -46, z: 1376, r: 26 }),
  freeze({ id: 'east-landing', name: 'The east landing', x: 128, z: 1108, r: 24 }),
]);
/** How wide the cliff's face is at the water: the land's own height is held to within this of it. */
export const CLIFF = freeze({ reach: 40, face: 3.2 });

/**
 * The coast field every region shares blends the sea floor into the land's own height over the
 * thirty-eight metres between two and forty from the water (`regionBase`, src/world/terrain/world-terrain.js):
 * that is a beach. The cliff is the same blend made over the last three metres instead, so the
 * land keeps its height - sixteen metres on the grass, twenty-six on the hills, its own relief on
 * top - right to the edge, and then drops. Where the region shares the coast with its neighbours
 * the cliff gives way to their beach in proportion, and in the two coves it does not happen at all.
 */
function cliffGround(x, z, ground) {
  const d = landDistance(x, z);
  if (d < 0 || d > CLIFF.reach) return ground;
  // The shore's normal, pointing inland, and the point forty metres from the water behind this one.
  // Near the water the hex blend is pulled down by the sea's own hexes, so the land's height is read
  // back there and carried out to the edge. At forty metres that point is this point, and the
  // plateau meets the ordinary ground with no seam.
  const e = 1.5, gx = landDistance(x + e, z) - landDistance(x - e, z), gz = landDistance(x, z + e) - landDistance(x, z - e);
  const gn = Math.hypot(gx, gz) || 1, back = CLIFF.reach - d, ix = x + gx / gn * back, iz = z + gz / gn * back;
  // South Suval's coast, and none of its neighbours': the share is read where the height is.
  const mix = seamlessTerrainMix(ix, iz), share = ownGround(ix, iz, mix) * smooth(0, 30, Math.min(x - SOUTH_SUVAL_BOX.minX, SOUTH_SUVAL_BOX.maxX - x, z - SOUTH_SUVAL_BOX.minZ, SOUTH_SUVAL_BOX.maxZ - z));
  if (share <= 0) return ground;
  let cove = 0;
  for (const c of COVES) cove = Math.max(cove, 1 - smooth(c.r * .55, c.r, Math.hypot(x - c.x, z - c.z)));
  const top = mix.base + relief(x, z, mix.amp, mix.wave);
  const beach = lerp(-5.6, 1.4, smooth(-26, 6, d));
  const cliffed = lerp(beach, top, smooth(.4, CLIFF.face, d));
  return lerp(ground, Math.max(ground, cliffed), share * (1 - cove));
}
/**
 * Whether a point is at the foot of the cliffed coast, for the fallen rock that lies there: the
 * shallows and the first half-metre of the face, below where the face starts to climb. A rock set
 * any higher is a rock stuck to a wall.
 */
export function onCliffFoot(x, z) {
  const d = landDistance(x, z);
  if (d < -3 || d > .7) return false;
  for (const c of COVES) if (Math.hypot(x - c.x, z - c.z) < c.r) return false;
  return (seamlessTerrainMix(x, z).weights['South Suval'] ?? 0) > .5;
}

// ---------------------------------------------------------------------------
// The chart
// ---------------------------------------------------------------------------
/**
 * South Suval's places. The Stillwater, Imlamdris and the Stillwater Temple are the lore's own names;
 * the Eastern Slopes are the wine catalogue's ("Imlamdris Eastern Slopes"); the rest are plain words
 * for plain things, the way the game names a shore or a pass when nobody in the lore has.
 */
const hillPass = PASS_ROAD[3];   // the saddle
export const SOUTH_SUVAL_LANDMARKS = freeze([
  freeze({ id: 'imlamdris', name: 'Imlamdris', ...cityPoint(0, 45), radius: 58,
    description: 'The oldest city on the peninsula was razed by the Blood Prince. Roofless ashlar shells and charred beams follow the old terraced streets above the Stillwater. Four small timber homes and a new frame stand beside the ruins as rebuilding begins.' }),
  freeze({ id: 'stillwater', name: 'The Stillwater', ...STILLWATER.centre, radius: 50,
    description: 'The only lake on the peninsula, fed by springs from below and not by any river. It does not run dry. Grey-green in the morning mist, blue in the afternoon, black at night; reed round the open shore and stone along the city’s.' }),
  freeze({ id: 'stillwater-temple', name: 'The Stillwater Temple', x: STILLWATER_TEMPLE.x, z: STILLWATER_TEMPLE.z,
    description: 'The Stillwater Temple is a roofless shell: broken columns face the lake, burned rafters lie across the floor, and a blast breach opens the back wall. Some of the old astronomical archive was rescued; the building has not been restored.' }),
  freeze({ id: 'star-terrace', name: 'The Star Terrace', x: STAR_TERRACE.gnomon.x, z: STAR_TERRACE.gnomon.z,
    description: 'The top of the city: open paving, a gnomon and a half-ring of sighting stones turned to the southern sky over the lake, and a stone table for the night’s record. The inland hills are far from the coastal haze.' }),
  freeze({ id: 'landward-gate', name: 'The Landward Gate', x: LANDWARD_GATE.x, z: LANDWARD_GATE.z,
    description: 'The city’s way in from the road, at its back and its highest point, so that whoever comes overland comes down through the whole of Imlamdris to reach the water.' }),
  freeze({ id: 'imlamdris-pass', name: 'The hill pass', x: hillPass.x, z: hillPass.z,
    description: 'The saddle east of the ridge’s spur, the lowest way out of the lake’s bowl, and the only road there is: over it and west under the ridge to the southern hill gate in the East Suval frontier, slower and harder than any coastal route. The gate is barred.' }),
  freeze({ id: 'eastern-slopes', name: 'The Eastern Slopes', ...hexCentre(7, 120),
    description: 'Vines in rows on the hill south-east of the water, across the lake from the city: the lake country’s eastern slopes, whose whites are fresh and bright and higher in acid than the western-facing sites.' }),
  freeze({ id: 'south-cove', name: COVES[0].name, x: COVES[0].x, z: COVES[0].z,
    description: 'A break in the southern cliffs where the grass comes down to a beach, and one of the few places on this coast a boat could be pulled up.' }),
  freeze({ id: 'east-landing', name: COVES[1].name, x: COVES[1].x, z: COVES[1].z,
    description: 'The shore where the gap between the ridge and the eastern hills comes down to the sea: a beach, and not a cliff, for a hundred paces.' }),
  freeze({ id: 'southern-cliffs', name: 'The southern cliffs', x: -150, z: 1372,
    description: 'The ridge country’s drop to the sea: the land holds its height nearly to the water and then falls fifteen or twenty metres to rock and swell. Seabirds on the tops.' }),
]);
/** The Stillwater, as the chart draws it. */
export const SOUTH_SUVAL_CHART_WATERS = freeze([
  freeze({ id: 'stillwater-water', kind: 'polygon', points: STILLWATER_SHORE }),
]);
