/**
 * South Ibenal, and the corridor plain both Ibenals stand on: terrain, climate and water only. The scenery and the
 * wildlife are `src/content/regions/south-ibenal/south-ibenal-scenery.js` and `src/content/regions/south-ibenal/south-ibenal-wildlife.js` (and North Ibenal's own). Nothing here
 * belongs to anybody: no town, anchorage, raft landing, farm, road or pass provisioner. The flats at the river mouths,
 * where the corridor's anchorages stand, are kept level and open, and nothing is built on them.
 *
 * Pure: no three, no DOM. `src/world/terrain/world-terrain.js` lays the ground (`southIbenalGround`, and `northIbenalGround` in
 * src/content/regions/north-ibenal/north-ibenal-world.js) and colours it (`southIbenalTint`, `southIbenalShoreTint`); the scenery draws the streams'
 * ribbons and lays their colliders (`ibenalWaterRibbons`, `ibenalWaterColliders`); the scenery, the wildlife, the chart
 * and the tests read the same numbers.
 *
 * **What the atlas gives** (the authority): South Ibenal, thirty hexes of plains, all `Csb`, rows 106-116; North
 * Ibenal, thirty-four, thirty-three plains and one hills at (-21,99), all `Csc`, rows 99-107. One strip between the open
 * western ocean and the Ibenwood: South Ibenal meets West Ibenwood on eighteen hex edges, Alezhor on three and the sea on
 * twenty-five; North Ibenal meets the South Oremindi on eight, North Ibenwood on eight, West Ibenwood on six and the sea
 * on eighteen; the two share eight. The strip is narrowest at South Ibenal's southern end (170 m from the sea to the
 * trees), widens northward to 500-600 m through North Ibenal's middle rows, and pinches to 200 m against the Oremindi
 * at its north end, the Narrows. Small rivers: three inside South Ibenal, one inside North Ibenal, one on their shared
 * line, West Ibenwood's stream along the tree line and Alezhor's west stream along Alezhor's line.
 *
 * **What the lore gives** (`world-builder/azhora_lore/geography/regions/ibenale.md`, `north_ibenal.md`): "two parallel
 * lines that are never quite parallel: the coastline ... and the forest edge"; "the rivers of Ibenale come out of the
 * forest at angles, crossing the plain and reaching the sea at intervals"; "farmland in the better-drained soil between
 * the rivers"; small river-mouth anchorages; the open western ocean, "less cliff-faced than Legemum's but it is not
 * docile"; and in the north a colder, more exposed coast, "the rocky northern shore", and the Narrows, the last flat
 * ground before the passes.
 *
 * **The shape, in one paragraph.** One plain over both countries, laid by one function (`ibenalLand`) and written by
 * each country on its own ground, so nothing changes at their shared line. It rises from a low terrace behind the shore
 * (three to five metres) to the level of the high ground beside it - the forest's, read live along every tree-line
 * edge, and the Oremindi's foot at the north end - most of the rise in the last third of the way, steepest at the
 * trees (`IBENAL_FOOT`). Long low swells roll across it, rougher in North Ibenal. Five streams come out from under the
 * trees at angles and cross it to the sea in shallow vales, each to a small bay at one of the coast's notches; at every
 * mouth a flat is kept level and open beside the water, and one more at the Narrows' end. The coast is strand in the
 * bays and low rock at the points, dune-backed in South Ibenal's warm south-west, rockier and higher in the north,
 * where a rounded foothill stands on the hills cell under the Oremindi.
 *
 * **The borders** are met by Celder's method (`celderSeamMove`, src/content/regions/south-celder/south-celder-world.js) along the forest's and the
 * Oremindi's lines, the step tables read edge by edge. **Alezhor's three edges are the exception**, and exactly one side
 * meets the other there: South Ibenal makes no move at them and holds them exactly as handed (`IBENAL_ALEZHOR_HOLD`),
 * and Alezhor's own seam, which reads this country live, meets them - so Alezhor's ground, and the west stream it lays
 * eight metres inside the line (which reads its ceiling off this side), are exactly as Alezhor delivered them, and the
 * plain comes down from the line into its own shape over thirty metres. West Ibenwood's border stream reads its level
 * off the ground its samples stand on, most of which lie on this side of the line, so that ground is left exactly as it
 * was handed (`IBENWOOD_STREAM_KEEP`); the forest's own channel, cut over every country's ground, is its bank.
 */
import { regionAt, hexOwnerAt, hexAt, hexCentre, isLandHex, REGION_CELLS, REGION_OUTLINES, REGION_IDS, SHORE_FRINGE,
  landDistance, SEA_LEVEL, terrainMix, seamlessTerrainMix, relief } from '../../../world/terrain/region-world.js';
import { IBENWOOD_RIVERS } from '../ibenwood/ibenwood-rivers.js';
// The ground without either Ibenal's layer, for meeting the borders and reading the high ground at the lines. A cycle
// with src/world/terrain/world-terrain.js, as src/content/regions/alezhor/alezhor-world.js has: nothing here calls it while a module loads.
import { groundBeforeSouthIbenal, groundBeforeNorthIbenal } from '../../../world/terrain/world-terrain.js';

const freeze = Object.freeze, point = (x, z) => freeze({ x, z });
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const bell = u => (u >= 1 ? 0 : (1 - u * u) ** 2);
const segment = (x, z, a, b) => {
  const dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz, t = l2 ? clamp(((x - a.x) * dx + (z - a.z) * dz) / l2, 0, 1) : 0;
  return { distance: Math.hypot(x - a.x - dx * t, z - a.z - dz * t), t };
};

export const SOUTH_IBENAL = 'South Ibenal';
const NORTH = 'North Ibenal';
/** The two countries the one plain is laid on. */
export const IBENAL_COUNTRIES = freeze([SOUTH_IBENAL, NORTH]);
const isIbenal = name => name === SOUTH_IBENAL || name === NORTH;
export const SOUTH_IBENAL_CELLS = freeze(REGION_CELLS[SOUTH_IBENAL] ?? []);
export const IBENAL_CELLS = freeze([...SOUTH_IBENAL_CELLS, ...(REGION_CELLS[NORTH] ?? [])]);
/**
 * The climate per hex, off the World Builder map: `Csb` on all thirty, the warm-summer Mediterranean of the corridor's
 * south-western end. The sky stays the world's default, as Alezhor's does beside it.
 */
export const SOUTH_IBENAL_KOPPEN = 'Csb';
export const SOUTH_IBENAL_CLIMATE = freeze(Object.fromEntries(SOUTH_IBENAL_CELLS.map(c => [`${c.q},${c.r}`, SOUTH_IBENAL_KOPPEN])));
/** Both countries' hexes with ninety metres round them: nothing in this file is asked about outside it. */
export const IBENAL_BOX = freeze({
  minX: Math.min(...IBENAL_CELLS.map(c => c.x)) - 90, maxX: Math.max(...IBENAL_CELLS.map(c => c.x)) + 90,
  minZ: Math.min(...IBENAL_CELLS.map(c => c.z)) - 90, maxZ: Math.max(...IBENAL_CELLS.map(c => c.z)) + 90,
});
const inBox = (x, z) => x > IBENAL_BOX.minX && x < IBENAL_BOX.maxX && z > IBENAL_BOX.minZ && z < IBENAL_BOX.maxZ;
/** Whether a point is on South Ibenal's own ground, as the traveler is told it (`regionAt`, with its shore fringe). */
export function southIbenalOwns(x, z) { return regionAt(x, z)?.name === SOUTH_IBENAL; }

// ---------------------------------------------------------------------------
// Whose ground a point is
// ---------------------------------------------------------------------------
const AXIAL = freeze([[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]]);
/**
 * Whose ground a point is, for writing it (Alezhor's rule, `groundOwner` in src/content/regions/alezhor/alezhor-world.js): on a land hex, that
 * hex's owner; on a sea hex, the owner of the nearest land hex beside it within the shore fringe, so the few metres of
 * beach the coast field lays past the hexes are written by the country whose shore they are.
 */
function groundOwner(x, z) {
  const home = hexAt(x, z), centre = hexCentre(home.q, home.r);
  if (isLandHex(centre.x, centre.z)) return hexOwnerAt(x, z);
  let best = null, nearest = SHORE_FRINGE;
  for (const [dq, dr] of AXIAL) {
    const c = hexCentre(home.q + dq, home.r + dr);
    if (!isLandHex(c.x, c.z)) continue;
    const d = Math.hypot(c.x - x, c.z - z);
    if (d < nearest) { nearest = d; best = hexOwnerAt(c.x, c.z); }
  }
  return best;
}
/** Which Ibenal writes the ground at a point - its hexes and its own shore past them - or null. */
export function ibenalWriter(x, z) {
  if (!inBox(x, z)) return null;
  const owner = groundOwner(x, z);
  return isIbenal(owner) ? owner : null;
}
export const southIbenalWrites = (x, z) => ibenalWriter(x, z) === SOUTH_IBENAL;

// ---------------------------------------------------------------------------
// The borders of the one plain
// ---------------------------------------------------------------------------
/** What each neighbour is to the plain: the forest's tree line, the Oremindi's foot, or Alezhor. */
const NEIGHBOUR_KIND = freeze({ 'West Ibenwood': 'forest', 'North Ibenwood': 'forest', 'South Oremindi Mountains': 'mountain', Alezhor: 'alezhor' });
/** Every hex edge of either country's outline, with its outward normal, the country it belongs to and what lies across it. */
export const IBENAL_EDGES = freeze((() => {
  const edges = [];
  for (const country of IBENAL_COUNTRIES) for (const loop of REGION_OUTLINES[country] ?? []) for (let i = 0; i < loop.length; i++) {
    const a = loop[i], b = loop[(i + 1) % loop.length], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
    let nx = dz / length, nz = -dx / length;
    if (hexOwnerAt(mx + nx, mz + nz) === country) { nx = -nx; nz = -nz; }
    const owner = hexOwnerAt(mx + nx, mz + nz);
    const far = owner !== 'Open country' ? owner : isLandHex(mx + nx * 10, mz + nz * 10) ? 'Open country' : 'sea';
    edges.push(freeze({ a: point(a.x, a.z), b: point(b.x, b.z), nx, nz, length, far, country }));
  }
  return edges;
})());
/**
 * The outer land borders, the lines the ground is met on: every edge whose far side is neither the sea nor the other
 * Ibenal. The two that reach the coast - Alezhor's at the west stream's mouth and the Oremindi's at the corridor's
 * northern point - are carried twelve metres on out to sea along their own line, as Alezhor's are, because that is where
 * the shore past the hexes changes hands. `edge` is the atlas's own edge, without that carry.
 */
export const IBENAL_LINES = freeze((() => {
  const land = IBENAL_EDGES.filter(e => e.far !== 'sea' && !isIbenal(e.far));
  const sea = IBENAL_EDGES.filter(e => e.far === 'sea');
  const at = (p, q) => Math.abs(p.x - q.x) < 1e-6 && Math.abs(p.z - q.z) < 1e-6;
  const coastal = p => sea.some(e => at(e.a, p) || at(e.b, p));
  return land.map(e => {
    let { a, b } = e;
    const ux = (b.x - a.x) / e.length, uz = (b.z - a.z) / e.length;
    if (coastal(a)) a = point(a.x - ux * 12, a.z - uz * 12);
    if (coastal(b)) b = point(b.x + ux * 12, b.z + uz * 12);
    return freeze({ a, b, nx: e.nx, nz: e.nz, far: e.far, country: e.country, kind: NEIGHBOUR_KIND[e.far] ?? 'other',
      length: Math.hypot(b.x - a.x, b.z - a.z), edge: freeze({ a: e.a, b: e.b, length: e.length }) });
  });
})());
const FOREST_LINES = IBENAL_LINES.filter(l => l.kind === 'forest');
/** The forest's and the Oremindi's lines: the high ground the plain rises to and is met on. */
const HIGH_LINES = IBENAL_LINES.filter(l => l.kind === 'forest' || l.kind === 'mountain');
/** Distance to the nearest of a set of lines, and which. */
function nearestLine(x, z, lines = IBENAL_LINES, limit = Infinity) {
  let best = null, distance = limit, t = 0;
  for (const e of lines) {
    if (x < Math.min(e.a.x, e.b.x) - distance || x > Math.max(e.a.x, e.b.x) + distance
      || z < Math.min(e.a.z, e.b.z) - distance || z > Math.max(e.a.z, e.b.z) + distance) continue;
    const p = segment(x, z, e.a, e.b);
    if (p.distance < distance) { distance = p.distance; best = e; t = p.t; }
  }
  return { line: best, distance, t };
}
/** Distance to the tree line: the nearest edge with West or North Ibenwood across it. */
export function treeLineDistance(x, z, limit = Infinity) { return nearestLine(x, z, FOREST_LINES, limit).distance; }
/** The ground without the Ibenal whose line it is, for reading what lies across it and what this side was handed. */
const beforeFor = country => (country === SOUTH_IBENAL ? groundBeforeSouthIbenal : groundBeforeNorthIbenal);

// ---------------------------------------------------------------------------
// The high ground beside the plain: the forest's level at the tree line, and the Oremindi's foot
// ---------------------------------------------------------------------------
/**
 * The plain rises to the high ground beside it. Far out on the plain it rises toward the soft-nearest high edges'
 * mean levels (`rimLevel`); within `reach` of an edge it rises the rest of the way to that edge's own level, read every
 * half metre along the far side of the line and averaged over `window` metres either way (`footLevel`), gently at first
 * and steepest at the trees. Both are read live, so the plain follows the forest and the mountains wherever their
 * builders put them; the seam then meets them exactly.
 */
export const IBENAL_FOOT = freeze({ reach: 78, window: 12, meanStep: 4 });
let HIGH = null;
/** The forest's and the Oremindi's edges, each read the first time a point needs it - edge by edge, never all at once. */
function highLines() {
  return (HIGH ??= HIGH_LINES
    .map(l => ({ ...l, before: beforeFor(l.country), count: 0, mean: NaN })));
}
/** An edge's mean level across the line, over the atlas's own edge (not its carry out to sea), every four metres. */
function lineMean(line) {
  if (!Number.isNaN(line.mean)) return line.mean;
  const e = line.edge, n = Math.max(2, Math.ceil(e.length / IBENAL_FOOT.meanStep));
  let sum = 0;
  for (let i = 0; i <= n; i++) {
    const s = clamp(e.length * i / n, .1, e.length - .1), x = e.a.x + (e.b.x - e.a.x) * s / e.length, z = e.a.z + (e.b.z - e.a.z) * s / e.length;
    sum += line.before(x + line.nx * .05, z + line.nz * .05);
  }
  return (line.mean = sum / (n + 1));
}
/** The level the open plain rises toward, and how far the nearest high edge is: soft over every edge, wider the farther out. */
function rimLevel(x, z) {
  let near = Infinity;
  const lines = highLines(), distances = new Float64Array(lines.length);
  for (let i = 0; i < lines.length; i++) { distances[i] = segment(x, z, lines[i].a, lines[i].b).distance; near = Math.min(near, distances[i]); }
  const soft = 30 + .35 * near;
  let sum = 0, total = 0;
  for (let i = 0; i < lines.length; i++) {
    const k = (distances[i] - near) / soft;
    if (k >= 12) continue;
    const w = Math.exp(-k) * (1 - smooth(9, 12, k));
    sum += w * lineMean(lines[i]); total += w;
  }
  return { level: sum / total, distance: near };
}
/** One edge's far-side levels every half metre, read the first time a point comes within reach of it. */
function lineLevels(line) {
  if (line.count) return line;
  const count = Math.max(1, Math.ceil(line.length / .5)), levels = new Float64Array(count + 1);
  for (let i = 0; i <= count; i++) {
    const s = Math.max(.1, Math.min(line.length - .1, line.length * i / count));
    const x = line.a.x + (line.b.x - line.a.x) * s / line.length, z = line.a.z + (line.b.z - line.a.z) * s / line.length;
    levels[i] = line.before(x + line.nx * .05, z + line.nz * .05);
  }
  const h = line.length / count, sums = new Float64Array(count + 1);
  for (let i = 1; i <= count; i++) sums[i] = sums[i - 1] + (levels[i - 1] + levels[i]) / 2 * h;
  return Object.assign(line, { h, levels, sums, count });
}
function levelIntegral(line, s) {
  const f = clamp(s, 0, line.length) / line.h, j = Math.min(line.count - 1, Math.floor(f)), u = f - j, a = line.levels[j], b = line.levels[j + 1];
  return line.sums[j] + line.h * (a * u + (b - a) * u * u / 2);
}
function levelNear(line, s, w) {
  const from = Math.max(0, s - w), to = Math.min(line.length, s + w);
  return (levelIntegral(line, to) - levelIntegral(line, from)) / Math.max(1e-6, to - from);
}
/** The high ground's own level a point near it rises to, and how far it is from the line (soft over nearby edges). */
function footLevel(x, z) {
  const reach = IBENAL_FOOT.reach;
  let near = Infinity;
  const found = [];
  for (const line of highLines()) {
    if (x < Math.min(line.a.x, line.b.x) - reach || x > Math.max(line.a.x, line.b.x) + reach
      || z < Math.min(line.a.z, line.b.z) - reach || z > Math.max(line.a.z, line.b.z) + reach) continue;
    const p = segment(x, z, line.a, line.b);
    if (p.distance >= reach) continue;
    found.push([line, p]); near = Math.min(near, p.distance);
  }
  if (!found.length) return null;
  const soft = 2 + .25 * near;
  let sum = 0, total = 0;
  for (const [line, p] of found) {
    const k = (p.distance - near) / soft;
    if (k > 20) continue;
    // An edge comes into the reckoning gently, so nothing steps where it first counts.
    const w = Math.exp(-k) * (1 - smooth(reach - 18, reach, p.distance)) + 1e-9;
    total += w; sum += w * levelNear(lineLevels(line), p.t * line.length, IBENAL_FOOT.window);
  }
  return { level: sum / total, distance: near };
}
/** How much of the rise a point at `distance` from the high ground has still to make: 1 at the line, 0 past the reach. */
const footShare = distance => { const t = clamp(1 - distance / IBENAL_FOOT.reach, 0, 1); return t * t * (1.6 - .6 * t); };

// ---------------------------------------------------------------------------
// The coast: points and bays
// ---------------------------------------------------------------------------
/**
 * The coast's corners, off the atlas: a **point** where one land hex meets two of the sea (the land's corner stands out
 * into the water) and a **bay** where two land hexes meet one of the sea (the water's corner reaches into the land).
 * Every stream comes to the sea at a bay.
 */
export const IBENAL_COAST_CORNERS = freeze((() => {
  const seen = new Map();
  for (const e of IBENAL_EDGES) if (e.far === 'sea') for (const p of [e.a, e.b]) {
    const key = `${p.x.toFixed(2)},${p.z.toFixed(2)}`;
    if (seen.has(key)) continue;
    let land = 0;
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; if (isLandHex(p.x + Math.cos(a) * 8, p.z + Math.sin(a) * 8)) land++; }
    seen.set(key, freeze({ x: p.x, z: p.z, kind: land <= 2 ? 'point' : 'bay' }));
  }
  return [...seen.values()];
})());
const POINTS = IBENAL_COAST_CORNERS.filter(c => c.kind === 'point');
const BAYS = IBENAL_COAST_CORNERS.filter(c => c.kind === 'bay');
/** How far north a point is along the corridor, 0 in South Ibenal's south to 1 at North Ibenal's end. */
export const northness = z => smooth(700, -560, z);
/** The rockiness of each point: a hash of its place, so each is its own; higher and more often rock in the north. */
const pointRock = c => {
  const h = Math.abs(Math.sin(c.x * 12.9898 + c.z * 78.233) * 43758.5453) % 1;
  return clamp(mix(.5, .95, northness(c.z)) + (h - .5) * .5, 0, 1);
};
/**
 * How much of a point's ground is a point of the coast (1 at the corner), how much of that is rock (the strongest of
 * the points' shares, so it never jumps where two points are equally near), and how much a bay.
 */
function coastShape(x, z) {
  let point = 0, rocky = 0, bay = 0;
  for (const c of POINTS) {
    if (Math.abs(x - c.x) > 60 || Math.abs(z - c.z) > 60) continue;
    const w = 1 - smooth(14, 52, Math.hypot(x - c.x, z - c.z));
    point = Math.max(point, w); rocky = Math.max(rocky, w * pointRock(c));
  }
  const rock = point > 1e-9 ? rocky / point : 0;
  for (const c of BAYS) {
    if (Math.abs(x - c.x) > 55 || Math.abs(z - c.z) > 55) continue;
    bay = Math.max(bay, 1 - smooth(16, 48, Math.hypot(x - c.x, z - c.z)));
  }
  return { point, rock, bay };
}

// ---------------------------------------------------------------------------
// The plain
// ---------------------------------------------------------------------------
/**
 * The numbers of the plain: the terrace behind the shore, low in the south and higher in the north; how the rise to
 * the high ground is spread across the plain (`ramp`, a share at the mid-point); and the swells, low and long in South
 * Ibenal, rougher and shorter in North Ibenal ("the terrain roughening over the last quarter of the corridor").
 */
export const IBENAL_PLAIN = freeze({ terraceSouth: 3.2, terraceNorth: 4.4, pointLift: 2.4, bayDrop: .7, rampLinear: .3,
  swellSouth: .85, swellNorth: 1.35, rough: .55 });
/** How much of the rise to the high ground a point has made at `u` across the plain (0 at the shore, 1 at the line). */
export const ibenalRamp = u => IBENAL_PLAIN.rampLinear * u + (1 - IBENAL_PLAIN.rampLinear) * u * u;
function terraceLevel(x, z, shape) {
  const P = IBENAL_PLAIN, n = northness(z);
  return mix(P.terraceSouth, P.terraceNorth, n) + .35 * Math.sin(x / 61 + z / 83 + .7) + P.pointLift * shape.point * mix(.45, 1, shape.rock) - P.bayDrop * shape.bay;
}
/** The swells: long low rolls across the corridor, never quite in step; and in the north a rougher, shorter ground. */
export function ibenalSwell(x, z) {
  const u = x * .9 + z * .43, v = -x * .43 + z * .9;
  const long = .6 * Math.sin(u / 53 + 1.2) * Math.cos(v / 89 - .3) + .35 * Math.sin(x / 31 - z / 47 + .8) + .2 * Math.sin(z / 19 + x / 29 + 2.1);
  const rough = Math.sin(x / 17 + z / 23 + .4) * Math.sin(z / 13 - x / 37 + 1.7);
  const n = northness(z);
  return long * mix(IBENAL_PLAIN.swellSouth, IBENAL_PLAIN.swellNorth, n) + rough * IBENAL_PLAIN.rough * smooth(.45, 1, n);
}

/**
 * **The foothill** on the atlas's one hills cell, (-21,99), under the South Oremindi at the corridor's north end: "a
 * foothill, not a mountain". A rounded hill of grass and broken rock rising to about fifteen metres over the Narrows,
 * its crest a little west of the cell's middle, its north side falling to the rocky shore at the corridor's end and its
 * east side down to a shallow col at the mountains' own foot, where the Oremindi's ground is met as it stands.
 */
export const IBENAL_FOOTHILL = freeze({ x: -3866, z: -585, rx: 58, rz: 48, rise: 12.5, knolls: 1.2 });
export function foothillLift(x, z) {
  const F = IBENAL_FOOTHILL;
  const dx = (x - F.x) / F.rx, dz = (z - F.z) / F.rz;
  if (Math.abs(dx) > 1.6 || Math.abs(dz) > 1.6) return 0;
  // Steeper to the sea on the north and the west, gentler toward the mountains on the east.
  const r = Math.hypot(dx * (dx < 0 ? 1.12 : .9), dz * (dz < 0 ? 1.18 : .95));
  const body = r >= 1.45 ? 0 : (1 - smooth(0, 1.45, r)) ** 1.15;
  const knolls = 1 + .12 * Math.sin(x / 9 + z / 13) + .08 * Math.sin(z / 7 - x / 11 + 1.1);
  return F.rise * body * knolls;
}
/**
 * **The Narrows**: rows 99 to 101, where the corridor pinches between the sea and the Oremindi from six hexes to two -
 * "the last flat ground before the pass approaches". The plain here is kept low and quiet by the shore, so a flat way
 * a little over a hundred metres wide runs between the shore's rocks and the rise to the mountains' foot.
 */
export const IBENAL_NARROWS = freeze({ x: -3955, z: -470, fromZ: -330 });
const narrowsShare = (x, z) => smooth(IBENAL_NARROWS.fromZ, IBENAL_NARROWS.fromZ - 90, z) * (1 - smooth(-3880, -3800, x));

/** The plain's own level at a point before the shore, the vales and the kept flats: the rise, the swells, the foothill and the foot. */
function plainTop(x, z, d) {
  const shape = coastShape(x, z), rim = rimLevel(x, z), narrows = narrowsShare(x, z);
  const u = clamp(d / Math.max(1e-6, d + rim.distance), 0, 1) ** (1 + .9 * narrows);
  const terrace = terraceLevel(x, z, shape);
  let h = terrace + (rim.level - terrace) * ibenalRamp(u);
  // Quiet by the shore and at the points, whose rock is their own shape, and in the Narrows' flat way.
  h += ibenalSwell(x, z) * smooth(10, 55, d) * (1 - .6 * narrows) * (1 - .5 * shape.point);
  h += foothillLift(x, z);
  const foot = footLevel(x, z);
  if (foot) h = mix(h, foot.level, footShare(foot.distance));
  return h;
}

// ---------------------------------------------------------------------------
// The coast
// ---------------------------------------------------------------------------
/** The sea floor and strand every region shares, below and up to the waterline (src/world/terrain/world-terrain.js `regionBase`). */
const beachAt = d => mix(-5.6, 1.4, smooth(-26, 6, d));
/** The sea's own surface (`SEA_LEVEL`, src/world/terrain/region-world.js): the level a stream's mouth comes down to. */
const SEA = SEA_LEVEL;
/**
 * The land let down to the water, as Alezhor's is: rock keeps the land's height to within 3.6 m of the water and drops;
 * a strand ramps down over `strand` metres. Below the first forty centimetres it is the shore handed to it, so the
 * waterline is exactly where the coast field puts it.
 */
export function coastProfile(d, top, cliff, strand = 30, shore = beachAt(d)) {
  return mix(mix(shore, top, smooth(2, strand, d)), mix(shore, top, smooth(.4, 3.6, d)), cliff);
}
/**
 * How much of the shore beside a point is rock: the coast's points, some low and some higher, more of them and more of
 * each in the north ("the rocky northern shore"), and in North Ibenal a broken rocky shore between the bays as well;
 * never in a bay, at a stream's mouth or in front of a kept flat, which are strand.
 */
export function cliffShare(x, z) {
  const s = coastShape(x, z), n = northness(z);
  let rock = s.point * smooth(.2, .7, s.rock);
  rock = Math.max(rock, smooth(.55, .95, n) * (.55 + .3 * Math.sin(x / 37 - z / 29 + .6)));
  rock *= (1 - s.bay) * (1 - mouthShare(x, z)) * (1 - keptShare(x, z));
  return clamp(rock, 0, 1);
}
/** How far in from the water a strand's ramp reaches: wider behind the dunes, fourteen metres in front of a kept flat. */
const strandWidth = (x, z) => mix(mix(30, 38, duneZone(x, z)), 14, keptShare(x, z));

/**
 * **The dunes**: behind the strands of South Ibenal's warm south-west, rows 112 to 116, where Alezhor's own dunes stand
 * across the line - a broken ridge of sand and dune grass a metre or two high, twenty-odd metres back from the water,
 * hummocky, and gone at the rocky points, the stream mouths and the kept flats.
 */
export const IBENAL_DUNES = freeze({ fromZ: 545, toZ: 905, maxX: -4610, back: 23, half: 9, height: 1.8 });
const duneZone = (x, z) => {
  const D = IBENAL_DUNES;
  return smooth(D.fromZ - 10, D.fromZ + 40, z) * (1 - smooth(D.toZ - 40, D.toZ, z)) * (1 - smooth(D.maxX - 30, D.maxX, x));
};
export function duneLift(x, z, d = landDistance(x, z)) {
  const D = IBENAL_DUNES, zone = duneZone(x, z);
  if (zone <= 0 || d < 6 || d > D.back + D.half + 4) return 0;
  const s = coastShape(x, z);
  const hummock = 1 + .3 * Math.sin(x / 11 + z / 27) + .2 * Math.sin(z / 7.7 - x / 13 + 1.3);
  return D.height * hummock * bell(Math.abs(d - D.back - 2 * Math.sin(z / 31 + .4)) / D.half) * zone
    * (1 - smooth(.15, .6, s.point * s.rock)) * (1 - mouthShare(x, z)) * (1 - keptShare(x, z)) * smooth(30, 45, alezhorLineDistance(x, z));
}

// ---------------------------------------------------------------------------
// The streams
// ---------------------------------------------------------------------------
/** A polyline softened twice (corners cut a quarter each side), its ends kept where they are. */
function soften(points, passes = 2) {
  let current = points;
  for (let pass = 0; pass < passes; pass++) {
    const next = [current[0]];
    for (let i = 0; i < current.length - 1; i++) {
      const a = current[i], b = current[i + 1];
      next.push({ x: a.x * .75 + b.x * .25, z: a.z * .75 + b.z * .25 }, { x: a.x * .25 + b.x * .75, z: a.z * .25 + b.z * .75 });
    }
    next.push(current.at(-1));
    current = next;
  }
  return current;
}
/** Evenly spaced stations along a polyline, each with how far along it is and the unit normal there. */
function stations(points, spacing) {
  const out = [];
  let run = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], length = Math.hypot(b.x - a.x, b.z - a.z);
    if (length < 1e-6) continue;
    const n = Math.max(1, Math.round(length / spacing));
    for (let k = out.length ? 1 : 0; k <= n; k++) out.push({ x: a.x + (b.x - a.x) * k / n, z: a.z + (b.z - a.z) * k / n, along: run + length * k / n });
    run += length;
  }
  for (let i = 0; i < out.length; i++) {
    const p = out[Math.max(0, i - 1)], q = out[Math.min(out.length - 1, i + 1)], l = Math.hypot(q.x - p.x, q.z - p.z) || 1;
    out[i].nx = -(q.z - p.z) / l; out[i].nz = (q.x - p.x) / l;
  }
  return out;
}
/** A value along a reach from keyframes `[along, value]`, eased between each pair. */
function keyed(keys, s) {
  if (s <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (s <= keys[i][0]) return mix(keys[i - 1][1], keys[i][1], smooth(keys[i - 1][0], keys[i][0], s));
  return keys.at(-1)[1];
}
const GRID = 24;
/** A reach's segments bucketed on a grid, padded by `pad`, so a point asks only the few near it. */
function indexReach(samples, pad) {
  const grid = new Map();
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i];
    for (let gx = Math.floor((Math.min(a.x, b.x) - pad) / GRID); gx <= Math.floor((Math.max(a.x, b.x) + pad) / GRID); gx++)
      for (let gz = Math.floor((Math.min(a.z, b.z) - pad) / GRID); gz <= Math.floor((Math.max(a.z, b.z) + pad) / GRID); gz++) {
        const key = gx * 100003 + gz;
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key).push(i);
      }
  }
  return grid;
}
/**
 * Where a point lies against a reach: how far from its line, how far down it, and which side. How far down is read off
 * every nearby segment weighted by how near it is, so it runs on smoothly round a bend. Null beyond `limit`.
 */
function reachAt(reach, x, z, limit) {
  const list = reach.grid.get(Math.floor(x / GRID) * 100003 + Math.floor(z / GRID));
  if (!list) return null;
  let near = Infinity, side = 1;
  const reads = [];
  for (const i of list) {
    const a = reach.samples[i - 1], b = reach.samples[i], dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz;
    const t = l2 ? clamp(((x - a.x) * dx + (z - a.z) * dz) / l2, 0, 1) : 0;
    const distance = Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
    if (distance > limit + 6) continue;
    reads.push(distance, mix(a.along, b.along, t));
    if (distance < near) { near = distance; side = (x - a.x) * mix(a.nx, b.nx, t) + (z - a.z) * mix(a.nz, b.nz, t) >= 0 ? 1 : -1; }
  }
  if (near > limit) return null;
  let sum = 0, total = 0;
  for (let i = 0; i < reads.length; i += 2) { const w = Math.exp(-(reads[i] - near) / 1.5); sum += w * reads[i + 1]; total += w; }
  return { distance: near, along: sum / total, side };
}
/** The two stations either side of `along` metres down a reach, and how far between them it lies. */
function bracket(s, along) {
  if (along <= s[0].along) return [s[0], s[1], 0];
  if (along >= s.at(-1).along) return [s.at(-2), s.at(-1), 1];
  let lo = 0, hi = s.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (s[m].along <= along) lo = m; else hi = m; }
  return [s[lo], s[hi], (along - s[lo].along) / Math.max(1e-9, s[hi].along - s[lo].along)];
}

/**
 * **The five streams.** Each comes out from under the trees at the tree line, at an angle to the corridor, and is
 * carried down the atlas's own river edges, within a few metres of them, to the sea at a bay. Each is its own:
 * - **the south stream** (South Ibenal, rows 110-112) leaves the forest where West Ibenwood's hex (-33,112) stands into
 *   the plain, runs west and then north-west down three edges, short and quick, to the bay at (-4650, 404);
 * - **the middle stream** (rows 108-110) comes out at the forest's corner under (-31,110), crosses the plain
 *   west-south-west, turns north along the edge between (-32,109) and (-33,109) and reaches the bay at (-4550, 231);
 * - **the north stream** (rows 106-108) comes out under (-29,109), runs south-west and down three edges to the bay at
 *   (-4450, 58), its vale opening into a broad floor of meadow above the mouth;
 * - **the border stream** comes out at the corner of three countries at (-4100, 145) and runs along the line between
 *   the two Ibenals, crossing it as it wanders, to the atlas's two edges and the bay at (-4400, -29) - the longest and
 *   the gentlest;
 * - **the last stream** (North Ibenal, rows 101-104), the last water before the Narrows, comes out under North
 *   Ibenwood's corner at (-3900, -87) and runs north-north-west down six edges in a narrower, deeper vale with gravel in
 *   its bed, to the bay at (-4100, -375).
 *
 * Keyframes are metres down the stream: `half` the water's half-width, `depth` its bed under the water, `drop` how far
 * under the plain beside it the water runs, `floor` the half-width of the vale's level floor beyond the bank, `side` the
 * width of the vale's side up to the plain. `ford` is the riffle where the corridor's line of travel wades it.
 */
const stream = (id, name, country, control, spec) => freeze({ id, name, country, control: freeze(control.map(([x, z]) => point(x, z))), ...spec });
export const IBENAL_STREAM_SPECS = freeze([
  stream('south-ibenal-south-stream', 'The south stream', SOUTH_IBENAL,
    [[-4459, 525.5], [-4472, 527.5], [-4492, 525.5], [-4515, 520], [-4535, 522], [-4552, 518.5], [-4575, 505.5], [-4597, 492.5], [-4603, 476], [-4598, 455], [-4601, 437],
      [-4624, 419.5], [-4649, 405], [-4666, 395]],
    { half: [[0, 1.05], [50, 1.45], [230, 1.8]], depth: [[0, .55], [100, .7]], drop: [[0, .55], [35, 1.15], [120, 1.7], [250, 1.3]],
      floor: [[0, 2.5], [90, 5], [250, 8]], side: [[0, 9], [120, 15], [250, 19]] }),
  stream('south-ibenal-middle-stream', 'The middle stream', SOUTH_IBENAL,
    [[-4359, 348], [-4374, 344], [-4398, 336], [-4428, 331], [-4462, 325], [-4489, 320], [-4502, 309], [-4497, 291], [-4502, 273], [-4505, 259],
      [-4526, 246], [-4549, 232], [-4563, 223]],
    { half: [[0, 1.1], [60, 1.5], [260, 1.9]], depth: [[0, .55], [120, .75]], drop: [[0, .55], [40, 1.2], [150, 1.9], [265, 1.4]],
      floor: [[0, 3], [100, 6], [265, 10]], side: [[0, 11], [130, 18], [265, 22]] }),
  stream('south-ibenal-north-stream', 'The north stream', SOUTH_IBENAL,
    [[-4257, 224.5], [-4272, 217.5], [-4294, 204], [-4322, 189], [-4348, 176], [-4373, 159.5], [-4397, 145], [-4403, 125], [-4398, 105], [-4401, 88],
      [-4424, 73], [-4449, 59], [-4463, 50]],
    { half: [[0, 1.1], [60, 1.55], [280, 2]], depth: [[0, .55], [120, .8]], drop: [[0, .55], [40, 1.1], [140, 1.6], [280, 1.1]],
      floor: [[0, 3], [120, 7], [200, 12], [285, 17]], side: [[0, 12], [150, 18], [285, 24]] }),
  stream('ibenal-border-stream', 'The border stream', SOUTH_IBENAL,
    [[-4101.5, 134], [-4107, 116], [-4119, 98], [-4146, 80], [-4181, 72], [-4214, 63], [-4238, 42], [-4251, 17], [-4268, -11], [-4296, -26],
      [-4324, -12], [-4350, -1], [-4376, -14], [-4400, -29], [-4413, -39]],
    { half: [[0, 1.1], [70, 1.5], [340, 2.1]], depth: [[0, .55], [150, .8]], drop: [[0, .55], [50, 1.0], [200, 1.35], [340, 1.1]],
      floor: [[0, 4], [150, 9], [340, 14]], side: [[0, 14], [180, 22], [340, 26]] }),
  stream('north-ibenal-last-stream', 'The last stream', NORTH,
    [[-3908, -93.5], [-3923, -103], [-3946, -117], [-3953, -140], [-3949, -170], [-3974, -188], [-4001, -203], [-3998, -231], [-4002, -258],
      [-4026, -274], [-4049, -289], [-4052, -318], [-4049, -345], [-4075, -361], [-4100, -376], [-4111, -386]],
    { half: [[0, 1.1], [60, 1.5], [400, 1.9]], depth: [[0, .6], [150, .85]], drop: [[0, .6], [45, 1.5], [170, 2.5], [330, 2.2], [405, 1.6]],
      floor: [[0, 2], [150, 4], [405, 7]], side: [[0, 8], [180, 11], [405, 14]] }),
]);
/** How far under the water's surface the bank's edge stands, the lip it rises to over 1.6 m, and the bank's slope beyond. */
export const IBENAL_BANK = freeze({ edge: .08, run: 1.6, lip: .5, slope: .7, floorRise: .03 });
/**
 * **The fords**: wherever one of the corridor's ways (`IBENAL_TRAILS`) crosses a stream, the stream spreads over a gravel
 * riffle `half` metres either side of the crossing, wider by `widen` and only `depth` deep, and is waded, not swum.
 */
export const IBENAL_FORD = freeze({ half: 5, ease: 3, widen: 1.3, depth: .22 });
/** Where the ways cross a stream's stations: how far down the stream each crossing is. */
function crossings(raw, trails) {
  const out = [];
  for (const t of trails) for (let j = 1; j < t.points.length; j++) {
    const a = t.points[j - 1], b = t.points[j];
    for (let i = 1; i < raw.length; i++) {
      const p = raw[i - 1], q = raw[i];
      const d = (b.x - a.x) * (q.z - p.z) - (b.z - a.z) * (q.x - p.x);
      if (Math.abs(d) < 1e-12) continue;
      const u = ((p.x - a.x) * (q.z - p.z) - (p.z - a.z) * (q.x - p.x)) / d, v = ((p.x - a.x) * (b.z - a.z) - (p.z - a.z) * (b.x - a.x)) / d;
      if (u >= 0 && u <= 1 && v >= 0 && v <= 1) out.push(mix(p.along, q.along, v));
    }
  }
  return out.sort((m, n) => m - n);
}
/** How much of a ford a point `along` a stream is in, 1 on the riffle and 0 clear of it. */
const fordShare = (fords, along) => {
  let best = 0;
  for (const f of fords) best = Math.max(best, 1 - smooth(IBENAL_FORD.half, IBENAL_FORD.half + IBENAL_FORD.ease, Math.abs(along - f)));
  return best;
};
let STREAMS = null;
/**
 * Each stream is built the first time a point comes within its reach - one at a time, never all at once - and
 * `ibenalStreams` builds whichever are left: their stations every metre, their fall read off the ground they cross.
 */
const BUILT = IBENAL_STREAM_SPECS.map(() => null);
const SPEC_BOXES = freeze(IBENAL_STREAM_SPECS.map(spec => freeze({
  minX: Math.min(...spec.control.map(p => p.x)) - 54, maxX: Math.max(...spec.control.map(p => p.x)) + 54,
  minZ: Math.min(...spec.control.map(p => p.z)) - 54, maxZ: Math.max(...spec.control.map(p => p.z)) + 54 })));
const streamAt = i => (BUILT[i] ??= buildStream(IBENAL_STREAM_SPECS[i]));
/** Whether a point could be within reach of stream `i`, judged before it is built. */
const nearSpec = (i, x, z) => { const b = SPEC_BOXES[i]; return x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ; };
export function ibenalStreams() {
  return (STREAMS ??= freeze(IBENAL_STREAM_SPECS.map((_, i) => streamAt(i))));
}
function buildStream(spec) {
  const raw = stations(soften(spec.control), 1);
  // The ground the stream crosses, met to the borders but with no vale cut yet: the lower of its two sides within
  // twelve metres. Under the trees that is the forest's own level as the seam meets it, so the water comes out from
  // under them at the ground it finds there.
  // Read every second station, each one between taking the lower of its two neighbours.
  const plain = raw.map((p, i) => {
    if (i % 2 && i < raw.length - 1) return NaN;
    let low = Infinity;
    for (const o of [-12, -6, 0, 6, 12]) {
      const x = p.x + p.nx * o, z = p.z + p.nz * o, d = landDistance(x, z);
      if (d <= 4 || !ibenalWriter(x, z)) continue;
      low = Math.min(low, metGround(x, z, d, beachAt(d)));
    }
    return low;
  });
  for (let i = 1; i < plain.length - 1; i += 2) if (Number.isNaN(plain[i])) plain[i] = Math.min(plain[i - 1], plain[i + 1]);
  // The mouth: where the shore begins. Past it the water is the sea's.
  let mouth = raw.findIndex(p => landDistance(p.x, p.z) < 3);
  if (mouth < 0) mouth = raw.length - 1;
  const fall = .006, surface = raw.map(() => SEA);
  for (let i = 0; i < mouth; i++) {
    const want = Number.isFinite(plain[i]) ? plain[i] - keyed(spec.drop, raw[i].along) : Infinity;
    surface[i] = i === 0 ? want : Math.min(want, surface[i - 1] - fall * (raw[i].along - raw[i - 1].along));
  }
  for (let pass = 0; pass < 6; pass++) for (let i = 1; i < mouth - 1; i++) surface[i] = Math.min(surface[i], (surface[i - 1] + surface[i] * 2 + surface[i + 1]) / 4);
  for (let i = 1; i < mouth; i++) surface[i] = Math.min(surface[i], surface[i - 1] - fall * .5 * (raw[i].along - raw[i - 1].along));
  // The last twenty metres come down to the sea's own level at the mouth.
  for (let i = 1; i < mouth; i++) { const left = raw[mouth].along - raw[i].along; if (left < 20) surface[i] = mix(SEA + .05, surface[i], left / 20); }
  for (let i = 1; i < raw.length; i++) surface[i] = Math.max(Math.min(surface[i], surface[i - 1]), i < mouth ? SEA + .05 : SEA);
  const mouthAlong = raw[mouth].along;
  // The fords, where the corridor's ways cross, clear of the head and the mouth.
  const fords = freeze(crossings(raw, IBENAL_TRAILS).filter(a => a > 12 && a < mouthAlong - 12));
  const samples = raw.map((p, i) => {
    const ford = fordShare(fords, p.along), F = IBENAL_FORD;
    const half = keyed(spec.half, p.along) * mix(1, F.widen, ford), depth = mix(keyed(spec.depth, p.along), F.depth, ford);
    return freeze({ ...p, surface: surface[i], half, depth, ford, floor: keyed(spec.floor, p.along), side: keyed(spec.side, p.along),
      bed: i < mouth ? surface[i] - depth : Math.max(-2.4, SEA - .9 - .1 * (p.along - mouthAlong)), estuary: i >= mouth });
  });
  const xs = samples.map(p => p.x), zs = samples.map(p => p.z);
  const reach = Math.max(...samples.map(p => p.half + IBENAL_BANK.run + p.floor + p.side)) + 2;
  return freeze({ id: spec.id, name: spec.name, country: spec.country, samples: freeze(samples), length: samples.at(-1).along, mouthAlong,
    fords, reach, grid: indexReach(samples, reach),
    box: freeze({ minX: Math.min(...xs) - reach, maxX: Math.max(...xs) + reach, minZ: Math.min(...zs) - reach, maxZ: Math.max(...zs) + reach }) });
}
/** A stream at `along` metres down it, lerped between its stations. */
function streamSample(reach, along) {
  const [a, b, t] = bracket(reach.samples, along);
  return { surface: mix(a.surface, b.surface, t), half: mix(a.half, b.half, t), bed: mix(a.bed, b.bed, t), floor: mix(a.floor, b.floor, t),
    side: mix(a.side, b.side, t), ford: mix(a.ford, b.ford, t), x: mix(a.x, b.x, t), z: mix(a.z, b.z, t) };
}
const inStreamBox = (s, x, z) => x > s.box.minX && x < s.box.maxX && z > s.box.minZ && z < s.box.maxZ;
/** The streams' mouths, where each meets the sea. */
function mouthShare(x, z) {
  let best = 0;
  for (const s of IBENAL_MOUTHS) {
    if (Math.abs(x - s.x) > 45 || Math.abs(z - s.z) > 45) continue;
    best = Math.max(best, 1 - smooth(18, 42, Math.hypot(x - s.x, z - s.z)));
  }
  return best;
}
/** Where each stream's atlas course meets the coast: the bay at its mouth (fixed by the atlas, so known before the streams are built). */
export const IBENAL_MOUTHS = freeze([[-4650, 404.3], [-4550, 231.1], [-4450, 57.9], [-4400, -28.7], [-4100, -375.1]].map(([x, z]) => point(x, z)));

/**
 * The vales, cut into the ground the borders were met on: within each stream's reach the ground comes down to a level
 * floor a lip over the water and rises over the vale's side to the ground round it, never above it. Kept flats are left
 * as kept, and within a few metres of the forest's and the Oremindi's lines a vale lets go, so the lines are met as
 * they stand (and are met without asking where the streams are).
 */
function valeCut(x, z, h) {
  if (!inStreamsBox(x, z)) return h;
  const free = smooth(2, 9, nearestLine(x, z, HIGH_LINES, 10).distance) * (1 - keptShare(x, z));
  if (free <= 0) return h;
  const before = h;
  for (let i = 0; i < BUILT.length; i++) {
    if (!nearSpec(i, x, z)) continue;
    const s = streamAt(i);
    if (!inStreamBox(s, x, z)) continue;
    const at = reachAt(s, x, z, s.reach);
    if (!at) continue;
    const p = streamSample(s, at.along), B = IBENAL_BANK, inner = p.half + B.run;
    const floorEnd = inner + p.floor, base = p.surface + B.lip;
    const floorLevel = base + B.floorRise * clamp(at.distance - inner, 0, p.floor);
    const vale = at.distance < floorEnd ? floorLevel : mix(floorLevel, h, smooth(floorEnd, floorEnd + p.side, at.distance));
    // The vale opens out into the bay over its last metres, where the shore takes over.
    const open = 1 - smooth(s.mouthAlong - 6, s.mouthAlong + 4, at.along);
    h = Math.min(h, mix(h, vale, open));
  }
  return free < 1 ? mix(before, h, free) : h;
}
const STREAMS_BOX = freeze({ minX: -4720, maxX: -3860, minZ: -420, maxZ: 560 });
const inStreamsBox = (x, z) => x > STREAMS_BOX.minX && x < STREAMS_BOX.maxX && z > STREAMS_BOX.minZ && z < STREAMS_BOX.maxZ;
/**
 * The channels, cut last into whatever ground the rest laid: a bed under the water rising to its edge, then a bank at
 * the water's own level rising `lip` over it, whatever the borders did to the vale's floor. Within a few metres of the
 * high ground's line a stream's head lets go, and the line is met as it stands.
 */
function channels(x, z, g) {
  if (!inStreamsBox(x, z)) return g;
  for (let i = 0; i < BUILT.length; i++) {
    if (!nearSpec(i, x, z)) continue;
    const s = streamAt(i);
    if (!inStreamBox(s, x, z)) continue;
    // On to the end of its reach: where the coast field still lays land past the mouth, the channel runs on through it.
    const at = reachAt(s, x, z, 9);
    if (!at) continue;
    const p = streamSample(s, at.along), c = at.distance, B = IBENAL_BANK;
    // Cut to the lowest water within a metre and a half either way, for the quicker runs below the trees.
    const low = Math.min(p.surface, streamSample(s, at.along - 1.5).surface, streamSample(s, at.along + 1.5).surface);
    const bed = Math.min(p.bed, low - mix(.3, .18, p.ford));
    // Under the water the bed is the channel's own shape; beside it the bank stands from the water's edge to the lip
    // and is let back into the ground beyond, and nothing stands higher than the bank's own slope from the edge.
    let h;
    if (c < p.half) h = mix(bed, low - B.edge, smooth(p.half * .55, p.half, c));
    else {
      const cap = low - B.edge + (c - p.half) * B.slope, bank = low - B.edge + (B.lip + B.edge) * smooth(p.half, p.half + B.run, c);
      const under = Math.min(g, cap);
      h = Math.max(under, mix(bank, under, smooth(p.half + B.run + 1, p.half + B.run + 3, c)));
    }
    const free = smooth(.5, 3, nearestLine(x, z, IBENAL_LINES, 4).distance);
    g = mix(g, h, free);
  }
  return g;
}
/** A stream's mouth, cut through the shared shore below the waterline out to sea. */
function mouths(x, z, incoming) {
  if (!inStreamsBox(x, z)) return incoming;
  for (let i = 0; i < BUILT.length; i++) {
    if (!nearSpec(i, x, z)) continue;
    const s = streamAt(i);
    if (!inStreamBox(s, x, z)) continue;
    const at = reachAt(s, x, z, 6);
    if (!at || at.along < s.mouthAlong - 12) continue;
    const p = streamSample(s, at.along);
    if (at.distance > p.half + 2) continue;
    const B = IBENAL_BANK;
    incoming = Math.min(incoming, at.distance < p.half ? mix(p.bed, p.surface - B.edge, smooth(p.half * .55, p.half, at.distance))
      : p.surface - B.edge + (at.distance - p.half) * B.slope);
  }
  return incoming;
}

// ---------------------------------------------------------------------------
// The streams' water, for the scenery, the wildlife, the chart and the traveler
// ---------------------------------------------------------------------------
/**
 * Where a point lies against the Ibenals' own water: which stream, how far from its line and how far down it, the
 * water's level, half-width and bed there, whether the point is in the water, and whether it is the mouth (the sea's
 * water). Null beyond `limit` metres. West Ibenwood's stream is the forest's, and Alezhor's is Alezhor's.
 */
export function ibenalRiverAt(x, z, limit = 30) {
  if (!inStreamsBox(x, z)) return null;
  let best = null;
  for (let i = 0; i < BUILT.length; i++) {
    if (!nearSpec(i, x, z)) continue;
    const s = streamAt(i);
    if (!inStreamBox(s, x, z)) continue;
    const at = reachAt(s, x, z, limit);
    if (!at || (best && at.distance >= best.distance)) continue;
    const p = streamSample(s, at.along), running = at.along <= s.mouthAlong;
    best = { river: s.id, country: s.country, distance: at.distance, along: at.along, surface: running ? p.surface : SEA, half: p.half, bed: p.bed,
      water: running && at.distance < p.half, estuary: !running, ford: running && p.ford > .5 };
  }
  return best;
}
/** The level of the Ibenals' own running water over a point, or null where there is none (the sea is the sea's). */
export function ibenalWaterAt(x, z) {
  const at = ibenalRiverAt(x, z, 8);
  return at?.water ? at.surface : null;
}
/**
 * The water's ribbons, drawn exactly where `ibenalWaterAt` answers: per stream, the stations' edges at the water's level
 * (`positions`, x y z in turn) and the triangles between them (`indices`), with the country whose scenery draws it.
 */
export function ibenalWaterRibbons() {
  return ibenalStreams().map(s => {
    const positions = [], indices = [];
    for (const p of s.samples) {
      if (p.along > s.mouthAlong + 1e-6) break;
      positions.push(p.x + p.nx * p.half, p.surface, p.z + p.nz * p.half, p.x - p.nx * p.half, p.surface, p.z - p.nz * p.half);
      const k = positions.length / 3 - 4;
      if (k >= 0) indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
    return freeze({ id: s.id, name: s.name, country: s.country, positions: freeze(positions), indices: freeze(indices) });
  });
}
/** Each ribbon's outline, for the chart (`mapWaters` in src/world.js takes `{ id, kind: 'polygon', points }`). */
export function ibenalMapWaters() {
  return ibenalWaterRibbons().map(r => {
    const left = [], right = [];
    for (let i = 0; i < r.positions.length; i += 6) { left.push(point(r.positions[i], r.positions[i + 2])); right.push(point(r.positions[i + 3], r.positions[i + 5])); }
    return freeze({ id: `${r.id}-water`, kind: 'polygon', points: freeze([...left, ...right.reverse()]) });
  });
}
/**
 * The water as the world's water colliders (`kind: 'river-water'`, src/gameplay/movement/game-state.js), which `world.waterAt` reads:
 * circles along each stream, each carrying the lowest level of the water it covers. None over a ford, which is waded.
 */
export function ibenalWaterColliders() {
  const out = [];
  for (const s of ibenalStreams()) {
    for (let along = 0; along < s.mouthAlong;) {
      const p = streamSample(s, along), r = Math.max(1.1, p.half * .9);
      const skip = s.fords.some(f => along + r >= f - IBENAL_FORD.half - 1 && along - r <= f + IBENAL_FORD.half + 1);
      if (!skip) {
        // At the head, a metre further down than it reaches: a point there reads its place down the stream a little
        // further on than it is, and must never be told of water over its own.
        let low = p.surface;
        for (let t = Math.max(0, along - r); t <= along + r + (along < 4 ? 1 : 0); t += .5) low = Math.min(low, t > s.mouthAlong ? SEA : streamSample(s, t).surface);
        out.push(freeze({ x: p.x, z: p.z, r, kind: 'river-water', stream: s.id, country: s.country, surface: low }));
      }
      along += Math.max(.8, r * .8);
    }
  }
  return out;
}
/**
 * The streams in the shape the forest's own fine terrain pass reads (`refineIbenwoodRiverGroundSteps`,
 * src/content/regions/ibenwood/ibenwood-rivers.js: `courses[].bounds` and `nearest(x, z, maxReach)`), so the world's 7.1-metre terrain mesh can be
 * laid at two metres along this water too, as it is along the forest's and Alezhor's.
 */
export function ibenalRiverIndex() {
  const rivers = ibenalStreams().map(s => {
    const xs = s.samples.map(p => p.x), zs = s.samples.map(p => p.z);
    return { reach: { id: s.id, samples: s.samples, grid: indexReach(s.samples, 56) },
      bounds: freeze({ minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) }) };
  });
  return freeze({
    courses: freeze(rivers.map(r => freeze({ id: r.reach.id, bounds: r.bounds }))),
    nearest(x, z, maxReach = 48) {
      let best = null;
      for (const { reach } of rivers) {
        const at = reachAt(reach, x, z, Math.min(maxReach, 80));
        if (at && (!best || at.distance < best.distance)) best = { distance: at.distance, along: at.along, course: reach.id };
      }
      return best;
    },
  });
}

// ---------------------------------------------------------------------------
// Kept ground
// ---------------------------------------------------------------------------
/**
 * **The river-mouth flats**: ground kept open and level beside each stream's mouth, where the corridor's anchorages
 * stand ("the river-mouth anchorages are smaller and shallower than Alezhor's"), with nothing on it - and one more at the
 * Narrows' end, the last flat ground before the passes, where the corridor's terminus stands. A plane (`level` at its
 * middle, rising `rise` for every metre inland, along `inland`) inside a rounded rectangle `halfX` by `halfZ`, its edge
 * wandering by a metre or two, let back into the country round it over `feather` metres.
 */
const kept = (id, name, country, x, z, spec) => freeze({ id, name, country, x, z, ...spec, inland: freeze(spec.inland) });
export const IBENAL_KEPT = freeze([
  kept('south-ibenal-south-flat', "The south stream's flat", SOUTH_IBENAL, -4612, 377, { halfX: 17, halfZ: 22, round: 9, level: 3.1, rise: .02, inland: { x: .9, z: .43 }, feather: 15, wander: 1.6 }),
  kept('south-ibenal-middle-flat', "The middle stream's flat", SOUTH_IBENAL, -4556, 278, { halfX: 20, halfZ: 18, round: 9, level: 3.2, rise: .02, inland: { x: .9, z: .43 }, feather: 16, wander: 1.8 }),
  kept('south-ibenal-north-flat', "The north stream's flat", SOUTH_IBENAL, -4455, 108, { halfX: 22, halfZ: 24, round: 11, level: 3.3, rise: .02, inland: { x: .9, z: .43 }, feather: 18, wander: 2 }),
  kept('ibenal-border-flat', "The border stream's flat", NORTH, -4372, -62, { halfX: 18, halfZ: 18, round: 9, level: 3.4, rise: .02, inland: { x: .82, z: .57 }, feather: 15, wander: 1.6 }),
  kept('north-ibenal-last-flat', "The last stream's flat", NORTH, -4113, -334, { halfX: 17, halfZ: 15, round: 8, level: 3.6, rise: .02, inland: { x: .82, z: .57 }, feather: 15, wander: 1.6 }),
  kept('north-ibenal-narrows-flat', "The flat at the Narrows' end", NORTH, -3944, -540, { halfX: 22, halfZ: 20, round: 10, level: 5.4, rise: .015, inland: { x: .82, z: .57 }, feather: 18, wander: 1.8 }),
]);
const wobble = (x, z, wave, phase) => Math.sin(x / wave * 1.31 + z / wave * .73 + phase) * .6 + Math.sin(z / wave * 1.9 - x / wave * .41 + phase * 2.3 + 1.1) * .4;
function keptFrame(k, x, z) {
  const wx = x + k.wander * wobble(x, z, 23, k.level), wz = z + k.wander * wobble(z, x, 19, k.level + 1);
  const qa = Math.max(0, Math.abs(wx - k.x) - (k.halfX - k.round)), qb = Math.max(0, Math.abs(wz - k.z) - (k.halfZ - k.round));
  return { outside: Math.max(0, Math.hypot(qa, qb) - k.round), level: k.level + k.rise * ((x - k.x) * k.inland.x + (z - k.z) * k.inland.z) };
}
/** How much of a point is kept ground: 1 on it, 0 past its feather. */
export function keptShare(x, z) {
  let best = 0;
  for (const k of IBENAL_KEPT) {
    if (Math.abs(x - k.x) > k.halfX + k.feather + 4 || Math.abs(z - k.z) > k.halfZ + k.feather + 4) continue;
    const f = keptFrame(k, x, z);
    best = Math.max(best, 1 - smooth(0, k.feather, f.outside));
  }
  return best;
}
/** The kept place a point is on, if any. */
export const keptAt = (x, z) => IBENAL_KEPT.find(k => keptFrame(k, x, z).outside <= 0) ?? null;
function keepLevel(x, z, h) {
  for (const k of IBENAL_KEPT) {
    if (Math.abs(x - k.x) > k.halfX + k.feather + 4 || Math.abs(z - k.z) > k.halfZ + k.feather + 4) continue;
    const f = keptFrame(k, x, z);
    if (f.outside >= k.feather) continue;
    h = mix(h, f.level, 1 - smooth(0, k.feather, f.outside));
  }
  return h;
}

// ---------------------------------------------------------------------------
// The design: the plain's own ground, before any border
// ---------------------------------------------------------------------------
/** The top of the land at a point: the plain, the kept flats and the dunes, before the shore lets it down. */
function landTop(x, z, d) {
  return keepLevel(x, z, plainTop(x, z, d)) + duneLift(x, z, d);
}
/** The plain's own shape at a point with the shore let down to the water: no seam, no vale, nothing handed. */
function shapeAt(x, z, d, shore) {
  return coastProfile(d, landTop(x, z, d), cliffShare(x, z), strandWidth(x, z), shore);
}
/** That shape met to the forest and the Oremindi at their lines: the ground the streams are laid on and the vales cut into. */
function metGround(x, z, d, shore) {
  return shapeAt(x, z, d, shore) + ibenalSeamMove(x, z) * smooth(0, 1.5, d);
}
/** The plain's own ground at a point, its vales cut: no seam, nothing handed, no channel (the cover reads its slope). */
export function ibenalDesign(x, z, d = landDistance(x, z), shore = beachAt(d)) {
  return valeCut(x, z, shapeAt(x, z, d, shore));
}

// ---------------------------------------------------------------------------
// What is left exactly as it was handed: West Ibenwood's stream, and Alezhor's line where its stream reads it
// ---------------------------------------------------------------------------
const IBENWOOD_WEST = IBENWOOD_RIVERS.find(c => c.id === 'ibenwood-west-stream');
/**
 * **West Ibenwood's border stream** runs along the tree line from (-4550, 693) to the corner of three countries at
 * (-4500, 837), and two in three of its samples stand on this side of the line: the forest reads its water's level off
 * the ground they stand on. Within `inner` metres of its course this country answers the ground it was handed, exactly,
 * letting go by `outer` - inside the forest's own channel, which takes everything within 2.35 m of its line down to its
 * bed - so the forest's stream lies where and how it always did; the forest's own channel, cut over
 * every country's ground, is its bank on this side.
 */
export const IBENWOOD_STREAM_KEEP = freeze({ inner: .4, outer: 2, points: freeze(IBENWOOD_WEST.points.map(p => point(p.x, p.z))) });
const KEEP_BOX = freeze({ minX: -4562, maxX: -4488, minZ: 681, maxZ: 849 });
function forestStreamDistance(x, z) {
  if (x < KEEP_BOX.minX || x > KEEP_BOX.maxX || z < KEEP_BOX.minZ || z > KEEP_BOX.maxZ) return Infinity;
  const pts = IBENWOOD_STREAM_KEEP.points;
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) best = Math.min(best, segment(x, z, pts[i - 1], pts[i]).distance);
  return best;
}
const forestStreamKeep = (x, z) => smooth(IBENWOOD_STREAM_KEEP.inner, IBENWOOD_STREAM_KEEP.outer, forestStreamDistance(x, z));

/**
 * **Alezhor's line.** Alezhor's seam reads this country live and meets it (`alezhorSeamMove`, src/content/regions/alezhor/alezhor-world.js), so
 * exactly one side meets the other: this country makes no move at its three Alezhor edges, and holds them exactly as
 * they were handed - within `hold` metres of the line it answers the ground it was handed, letting its own plain in
 * over `release`. So Alezhor's ground, the west stream Alezhor lays eight metres inside the line (whose water reads its
 * ceiling off this side of the line), its banks and its west mouth's flat are all exactly as Alezhor delivered them,
 * and the stream's far bank is Alezhor's own. A lower bank on this side would move Alezhor's ground: its seam reaches
 * forty metres in, and when this side was tried a few metres lower it drew the stream's inner bank under its water and
 * tilted the flat by half a metre.
 */
export const IBENAL_ALEZHOR_HOLD = freeze({ hold: .15, seamless: 1.6, release: 30 });
const ALEZHOR_LINES_HERE = IBENAL_LINES.filter(l => l.kind === 'alezhor');
const ALEZHOR_BOX_HERE = freeze({ minX: -4680, maxX: -4440, minZ: 800, maxZ: 1010 });
const nearAlezhor = (x, z) => x > ALEZHOR_BOX_HERE.minX && x < ALEZHOR_BOX_HERE.maxX && z > ALEZHOR_BOX_HERE.minZ && z < ALEZHOR_BOX_HERE.maxZ;
/** Distance to Alezhor's line, or Infinity well away from it. */
export function alezhorLineDistance(x, z) {
  if (!nearAlezhor(x, z)) return Infinity;
  let best = Infinity;
  for (const l of ALEZHOR_LINES_HERE) best = Math.min(best, segment(x, z, l.a, l.b).distance);
  return best;
}
/** How much of a point is this country's to write at all: 0 within `hold` of Alezhor's line, 1 past `release`. */
const alezhorHold = d => (d >= IBENAL_ALEZHOR_HOLD.release ? 1 : smooth(IBENAL_ALEZHOR_HOLD.hold, IBENAL_ALEZHOR_HOLD.release, d));
/**
 * The ground handed to this country laid on the hex blend that has no seams (`seamlessTerrainMix`, as Alezhor's own
 * `seamlessHanded` does): the world's blend steps by up to two metres where this country's own hex edge runs into
 * Alezhor's line at (-4550, 866), and a held ground must not carry that step out into the plain.
 */
function seamlessCorrection(x, z, d) {
  const seamless = seamlessTerrainMix(x, z), mixed = terrainMix(x, z);
  return smooth(2, 40, d) * (seamless.base + relief(x, z, seamless.amp, seamless.wave) - mixed.base - relief(x, z, mixed.amp, mixed.wave));
}

// ---------------------------------------------------------------------------
// The borders: the forest's and the Oremindi's lines met to the far side
// ---------------------------------------------------------------------------
/**
 * How the forest's and the Oremindi's lines are met: Celder's method (`celderSeamMove`, src/content/regions/south-celder/south-celder-world.js). The
 * step from this side to the far one is read every half metre along every such line, and a point is moved by the step on
 * its nearest lines averaged over as many metres either way as the point stands in from the line, letting go over
 * `reach`. At the line the move is the step itself; the far side is never moved. Alezhor's lines are not among them:
 * Alezhor meets this country there.
 */
export const IBENAL_SEAM = freeze({ reach: 40, probe: .05, step: .5, widen: 1, exact: 1 });
let SEAM = null;
/** Every high line, its steps read the first time a point comes within reach of it - edge by edge, never all at once. */
function seamLines() { return (SEAM ??= highLines().map(l => ({ ...l, count: 0 }))); }
function nearSide(line, s) {
  const x = line.a.x + (line.b.x - line.a.x) * s / line.length, z = line.a.z + (line.b.z - line.a.z) * s / line.length;
  return [x, z, x - line.nx * IBENAL_SEAM.probe, z - line.nz * IBENAL_SEAM.probe];
}
/**
 * This side's ground at a point by the line before the seam is met: the plain's shape, or what was handed where it is
 * kept. No vale reaches a line (`valeCut`), so the step tables never ask where the streams are.
 */
function preSeamAt(x, z, handed, d) {
  const k = forestStreamKeep(x, z);
  if (k <= 0) return handed;
  const shape = shapeAt(x, z, d, handed);
  return k < 1 ? mix(handed, shape, k) : shape;
}
function stepAt(line, s) {
  const [x, z, ix, iz] = nearSide(line, s), d = landDistance(ix, iz);
  if (d <= 0) return 0;
  return line.before(x + line.nx * IBENAL_SEAM.probe, z + line.nz * IBENAL_SEAM.probe) - preSeamAt(ix, iz, line.before(ix, iz), d);
}
function seamTable(line) {
  if (line.count) return line;
  const count = Math.max(1, Math.ceil(line.length / IBENAL_SEAM.step)), steps = new Float64Array(count + 1);
  for (let i = 0; i <= count; i++) steps[i] = stepAt(line, Math.max(.1, Math.min(line.length - .1, line.length * i / count)));
  const h = line.length / count, sums = new Float64Array(count + 1);
  for (let i = 1; i <= count; i++) sums[i] = sums[i - 1] + (steps[i - 1] + steps[i]) / 2 * h;
  return Object.assign(line, { h, steps, sums, count });
}
function stepIntegral(line, s) {
  const f = clamp(s, 0, line.length) / line.h, j = Math.min(line.count - 1, Math.floor(f)), u = f - j, a = line.steps[j], b = line.steps[j + 1];
  return line.sums[j] + line.h * (a * u + (b - a) * u * u / 2);
}
function stepNear(line, s, w) {
  const from = Math.max(0, s - w), to = Math.min(line.length, s + w);
  if (to - from < 1e-6) { const f = clamp(s, 0, line.length) / line.h, j = Math.min(line.count - 1, Math.floor(f)); return mix(line.steps[j], line.steps[j + 1], f - j); }
  return (stepIntegral(line, to) - stepIntegral(line, from)) / (to - from);
}
/** How far the ground at a point is moved to meet the far side of the nearest high lines. */
export function ibenalSeamMove(x, z) {
  const S = IBENAL_SEAM, reach = S.reach;
  let near = Infinity;
  const found = [];
  for (const line of seamLines()) {
    if (x < Math.min(line.a.x, line.b.x) - reach || x > Math.max(line.a.x, line.b.x) + reach
      || z < Math.min(line.a.z, line.b.z) - reach || z > Math.max(line.a.z, line.b.z) + reach) continue;
    const p = segment(x, z, line.a, line.b);
    if (p.distance >= reach) continue;
    found.push([line, p]); near = Math.min(near, p.distance);
  }
  if (!found.length) return 0;
  const soft = .1 + .5 * near;
  let sum = 0, total = 0, nearest = null;
  for (const [line, p] of found) {
    if (p.distance === near) nearest = [line, p];
    const k = (p.distance - near) / soft;
    if (k > 24) continue;
    // A line comes into the reckoning gently, so nothing steps where it first counts.
    const w = Math.exp(-k) * (1 - smooth(reach * .7, reach, p.distance)) + 1e-12;
    total += w; sum += w * stepNear(seamTable(line), p.t * line.length, p.distance * S.widen);
  }
  const move = sum / total * (1 - smooth(0, reach, near));
  if (near >= S.exact) return move;
  // Within a metre of the line the step is read where the point stands rather than off the samples.
  const [line, p] = nearest, s = clamp(p.t * line.length, .1, line.length - .1);
  return mix(stepAt(line, s), move, smooth(0, S.exact, near));
}

// ---------------------------------------------------------------------------
// The ground
// ---------------------------------------------------------------------------
/**
 * The ground of the one plain at a point either Ibenal writes; the caller answers `incoming` everywhere else. At sea
 * nothing is written but the streams' mouths, cut through the shared shore; on land the design, met to the forest and
 * the Oremindi at their lines, held over Alezhor's line as above, the streams' channels cut last, and the ground under
 * West Ibenwood's stream and at Alezhor's coast end left exactly as handed.
 */
export function ibenalLand(x, z, incoming) {
  const d = landDistance(x, z);
  if (d <= 0) return mouths(x, z, incoming);
  const forest = forestStreamKeep(x, z), toAlezhor = alezhorLineDistance(x, z), keep = forest * alezhorHold(toAlezhor);
  if (keep <= 0) return incoming;
  let g = valeCut(x, z, metGround(x, z, d, incoming));
  g = channels(x, z, g);
  if (keep >= 1) return g;
  // What is held is the ground as handed - exactly, where a neighbour reads it (Alezhor, five centimetres in from its
  // line; the forest, on its stream's own course) - and on the seamless blend a metre and a half in from Alezhor's line.
  const seamless = toAlezhor < IBENAL_ALEZHOR_HOLD.release ? smooth(IBENAL_ALEZHOR_HOLD.hold, IBENAL_ALEZHOR_HOLD.seamless, toAlezhor)
    * smooth(IBENWOOD_STREAM_KEEP.outer, IBENWOOD_STREAM_KEEP.outer + 3, forestStreamDistance(x, z)) : 0;
  const handed = seamless > 0 ? incoming + seamless * seamlessCorrection(x, z, d) : incoming;
  return mix(handed, g, keep);
}
/**
 * The ground. `incoming` is the ground every other layer laid; `before(x, z)` answers the ground without this country's
 * layer (src/world/terrain/world-terrain.js `groundBeforeSouthIbenal`), which the plain reads through its own copy for each line. Writes
 * only on South Ibenal's own land - its hexes and its own shore past them - and answers `incoming` everywhere else.
 */
export function southIbenalGround(x, z, incoming, before) {
  if (!southIbenalWrites(x, z)) return incoming;
  return ibenalLand(x, z, incoming);
}

// ---------------------------------------------------------------------------
// What covers the ground, and its colour
// ---------------------------------------------------------------------------
/**
 * The colours the ground is drawn in: the summer-dry grass of the plain, tawnier in South Ibenal's warm south-west and
 * cooler and greener-grey in the north, drier on the swells' crests and greener in their hollows; the shadowed ground of
 * the forest's foot; the sheltered green of the vales and the banks' lush green; the kept flats' meadow; washed gravel
 * at the mouths and in the last stream's bed; the dunes' pale sand-grass; heath and broken rock on the foothill; and the
 * grey rock of the points.
 */
export const IBENAL_GROUND = freeze({
  south: 0x939d63, north: 0x86976a, tawny: 0xa3a26a, crest: 0x9ca468, hollow: 0x7f975c, foot: 0x6c8953, vale: 0x6f9356,
  bank: 0x6b9857, flat: 0x8ba463, gravel: 0x9b968a, dune: 0xb9b083, heath: 0x84855f, rock: 0x7b766d, stone: 0x86806f,
});
const rgb = c => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
const mixColour = (a, b, t) => { const p = rgb(a), q = rgb(b), k = clamp(t, 0, 1); return (Math.round(mix(p[0], q[0], k)) << 16) | (Math.round(mix(p[1], q[1], k)) << 8) | Math.round(mix(p[2], q[2], k)); };
const swatchNumber = ground => (typeof ground === 'string' && /^#[0-9a-f]{6}$/i.test(ground) ? parseInt(ground.slice(1), 16) : null);

/**
 * What covers the ground at a point, each 0 to 1, for the colour, the scatter and the tests alike:
 * - `slope`: the design's own, rise over run; `height`: the design's level, 0 at the water to 1 at thirty metres;
 * - `edge`: the forest's edge habitat, 1 at the tree line and 0 thirty metres out; `foot`: the rise to the high ground,
 *   1 at its line and 0 past `IBENAL_FOOT.reach`; `mountain`: 1 at the Oremindi's line, 0 sixty metres out;
 * - `vale`: in a stream's vale (its floor and side), where the corridor's sheltered drainage is; `swell`: -1 in a
 *   hollow to 1 on a crest; `dry`: the warm south-west's tawny grass; `north`: the corridor's colder north;
 * - `kept`: a kept flat; `water`: in the streams' own running water; `bank`: within a few metres of it, or of West
 *   Ibenwood's stream on this side; `gravel`: washed gravel at the mouths and in the last stream's bed;
 * - `strand`: a beach; `cliff`: the rock of a point or the north's broken shore, its top and face; `dune`: the dunes;
 *   `hill`: the foothill; `narrows`: the Narrows' flat way.
 */
export function ibenalCover(x, z) {
  const d = landDistance(x, z), e = 1.5, shore = beachAt(d);
  const H = (px, pz) => ibenalDesign(px, pz, landDistance(px, pz));
  const h = ibenalDesign(x, z, d, shore), slope = Math.hypot(H(x + e, z) - H(x - e, z), H(x, z + e) - H(x, z - e)) / (2 * e);
  const foot = footLevel(x, z), river = ibenalRiverAt(x, z, 40);
  let vale = 0, bank = 0, gravel = 0, wet = false;
  if (river) {
    const s = ibenalStreams().find(t => t.id === river.river), p = streamSample(s, river.along), edgeOut = river.distance - river.half;
    wet = river.water;
    if (river.estuary) gravel = (1 - smooth(1.5, 6, edgeOut)) * smooth(-1, .5, edgeOut);
    else {
      bank = 1 - smooth(1, 6, edgeOut);
      vale = 1 - smooth(p.half + IBENAL_BANK.run + p.floor + p.side * .4, p.half + IBENAL_BANK.run + p.floor + p.side, river.distance);
      const stony = river.river === 'north-ibenal-last-stream' ? .8 : .45 * smooth(river.along - 60, river.along, s.mouthAlong);
      gravel = Math.max(river.ford ? (1 - smooth(1, 4, edgeOut)) : 0, (1 - smooth(-.4, .6, edgeOut)) * stony);
    }
  }
  const fs = forestStreamDistance(x, z);
  if (fs < 12) bank = Math.max(bank, 1 - smooth(3, 9, fs));
  const cliff = cliffShare(x, z), n = northness(z), lineNear = nearestLine(x, z, IBENAL_LINES, 61);
  const mountain = lineNear.line?.kind === 'mountain' ? 1 - smooth(0, 60, lineNear.distance) : 0;
  return {
    slope, height: clamp(h / 30, 0, 1),
    edge: 1 - smooth(0, 30, treeLineDistance(x, z, 31)),
    foot: foot ? footShare(foot.distance) : 0, mountain,
    vale, swell: clamp(ibenalSwell(x, z) / 1.2, -1, 1),
    dry: clamp((1 - n) * smooth(-4400, -4700, x + (z - 400) * .1) * .9 + (1 - n) * .2, 0, 1), north: n,
    kept: keptShare(x, z),
    water: wet ? 1 : 0, bank, gravel,
    strand: (1 - cliff) * (1 - smooth(6, 30, d)) * (d > 0 ? 1 : 0),
    cliff: cliff * (1 - smooth(4, 14, d)),
    dune: clamp(duneLift(x, z, d) / 1.6, 0, 1),
    hill: clamp(foothillLift(x, z) / 5, 0, 1),
    narrows: narrowsShare(x, z) * (1 - smooth(60, 140, d)),
  };
}
function ownColour(x, z) {
  const c = ibenalCover(x, z), g = IBENAL_GROUND;
  let colour = mixColour(g.south, g.north, c.north);
  colour = mixColour(colour, g.tawny, c.dry * .8);
  colour = c.swell > 0 ? mixColour(colour, g.crest, smooth(.2, .9, c.swell) * .5) : mixColour(colour, g.hollow, smooth(.2, .9, -c.swell) * .5);
  colour = mixColour(colour, g.foot, c.foot * .55 + c.edge * .25);
  colour = mixColour(colour, g.vale, c.vale * .6);
  colour = mixColour(colour, g.heath, Math.max(c.hill * .8, c.mountain * .35));
  colour = mixColour(colour, g.flat, c.kept * .65);
  colour = mixColour(colour, g.bank, c.bank * .7);
  colour = mixColour(colour, g.dune, c.dune * .85);
  colour = mixColour(colour, g.rock, Math.max(smooth(.55, 1.2, c.slope) * .75, c.cliff * smooth(.5, 1, c.slope) * .6));
  return mixColour(colour, g.gravel, c.gravel * .85);
}
let lastTint = { x: NaN, z: NaN, colour: 0 };
/**
 * The plain's row in the ground-tint table (`GROUND_TINTS`, src/world/terrain/world-terrain.js), as 0xRRGGBB, on ground `writes` says
 * is the country's, or null. Over the last twelve metres before every outer land border the colour fades back into the
 * swatch it was given, so nothing changes colour at a line; at the shared line nothing changes at all.
 */
export function ibenalTint(x, z, ground = null) {
  // The tint table asks once for every swatch in the blend at a point: the cover is worked out once.
  const colour = lastTint.x === x && lastTint.z === z ? lastTint.colour : (lastTint = { x, z, colour: ownColour(x, z) }).colour;
  const edge = nearestLine(x, z, IBENAL_LINES, 13).distance, swatch = swatchNumber(ground);
  return edge < 12 && swatch !== null ? mixColour(swatch, colour, smooth(0, 12, edge)) : colour;
}
/** The colour of the ground on South Ibenal's own ground, as 0xRRGGBB, or null for "no opinion here". */
export function southIbenalTint(x, z, ground = null) {
  if (!southIbenalWrites(x, z)) return null;
  return ibenalTint(x, z, ground);
}
/**
 * The shore's colour, for the shore stage of the terrain's tint (`SHORE_TINTS`, src/world/terrain/world-terrain.js), in Alezhor's
 * shape: `sand` how much of the world's sand tint to keep, `rock` how much of the face is bare stone, `stone` its colour.
 * The rocky points and the north's broken shore are stone from the water to a rim a few metres back; the mouths' bars
 * are gravel; the strands keep the world's own sand. Nothing within twenty metres of an outer land border.
 */
export function ibenalShoreTint(x, z, d) {
  if (!inBox(x, z) || d < -30 || d > 16 || !ibenalWriter(x, z)) return null;
  if (nearestLine(x, z, IBENAL_LINES, 21).distance < 20) return null;
  const cliff = cliffShare(x, z), river = ibenalRiverAt(x, z, 20);
  const bar = river?.estuary ? 1 - smooth(3, 8, river.distance - river.half) : 0;
  if (cliff <= .02 && bar <= 0) return null;
  if (bar > cliff) return { sand: 1, rock: bar * .6 * (1 - smooth(6, 14, d)), stone: IBENAL_GROUND.gravel };
  const own = lastTint.x === x && lastTint.z === z ? lastTint.colour : ownColour(x, z);
  return { sand: 1 - cliff, rock: cliff, stone: mixColour(IBENAL_GROUND.stone, own, smooth(4.5, 9, d)) };
}
export function southIbenalShoreTint(x, z, d) { return southIbenalWrites(x, z) ? ibenalShoreTint(x, z, d) : null; }

// ---------------------------------------------------------------------------
// The country's own exports
// ---------------------------------------------------------------------------
/** Where the developer's travel tool sets a traveler down: open grass in the middle of the plain, beside the corridor's way. */
export const SOUTH_IBENAL_ARRIVAL = point(-4530, 425);
/**
 * The places kept for what belongs to somebody, for the scenery to leave alone: the kept flats, as boxes
 * `{ id, name, country, x, z, halfX, halfZ, yaw }` (`yaw` 0: their sides run with the world's axes).
 */
export const IBENAL_RESERVED = freeze(IBENAL_KEPT.map(k => freeze({ id: k.id, name: k.name, country: k.country, x: k.x, z: k.z,
  halfX: k.halfX + k.wander, halfZ: k.halfZ + k.wander, yaw: 0 })));
export const SOUTH_IBENAL_RESERVED = freeze(IBENAL_RESERVED.filter(r => r.country === SOUTH_IBENAL));
/** North Ibenal's share, re-exported live by src/north-ibenal-world.js. */
export const NORTH_IBENAL_RESERVED = freeze(IBENAL_RESERVED.filter(r => r.country === NORTH));
/** South Ibenal's cover, and its share of the streams: the cover where it writes, the streams its scenery draws. */
export function southIbenalCover(x, z) { return southIbenalWrites(x, z) ? ibenalCover(x, z) : null; }
export const southIbenalRiverAt = (x, z, limit = 30) => ibenalRiverAt(x, z, limit);
export const southIbenalWaterAt = (x, z) => ibenalWaterAt(x, z);
export const southIbenalWaterRibbons = () => ibenalWaterRibbons().filter(r => r.country === SOUTH_IBENAL);
export const southIbenalWaterColliders = () => ibenalWaterColliders().filter(c => c.country === SOUTH_IBENAL);
const place = (id, name, x, z, radius, description) => freeze({ id, name, region: REGION_IDS[SOUTH_IBENAL], x, z, radius, description });
/** Places for the chart: natural places only, named in plain words - no town, anchorage, road or farm is named. */
export const SOUTH_IBENAL_LANDMARKS = freeze([
  place('south-ibenal-alezhor-bank', 'Above the west stream', -4570, 905, 30,
    "The corridor's southern end: a low rise of grass along the line with Alezhor, and beyond it Alezhor's west stream running down its little valley to the sea."),
  place('south-ibenal-dunes', 'The south-western dunes', -4733, 770, 30,
    'A broken ridge of sand and dune grass behind the open-ocean beaches of the warm south-western end, with damp hollows of rough grass in its lee.'),
  place('south-ibenal-forest-stream', 'The stream under the trees', -4562, 728, 30,
    "West Ibenwood's stream runs south along the tree line here in a little valley of its own, the plain's grass coming down to its western bank."),
  place('south-ibenal-narrow-south', 'The narrow south', -4650, 650, 40,
    'The narrowest stretch of the corridor: the forest stands less than two hundred metres from the open sea, and the plain rises quickly from the dunes to the trees.'),
  place('south-ibenal-south-mouth', "The south stream's mouth", -4615, 380, 30,
    'The south stream comes out of its short, quick vale into a small bay at a notch of the coast, with a stretch of level grass beside its mouth.'),
  place('south-ibenal-tree-line', 'The tree line', -4415, 445, 34,
    'Where the plain ends and West Ibenwood begins: the grass rises over its last stretch to the forest\'s own level, and the trees stand dark at the top of the rise.'),
  place('south-ibenal-middle-mouth', "The middle stream's bay", -4553, 278, 30,
    'The middle stream turns north along the coast before it reaches the sea, and level grass lies between its last bend and the little bay at its mouth.'),
  place('south-ibenal-rocky-point', 'The low rocks', -4535, 182, 30,
    'A low point of grey rock where the plain meets the open ocean between the middle and north streams, the swell breaking at its foot even in summer.'),
  place('south-ibenal-north-meadow', "The north stream's meadow", -4378, 120, 30,
    'The north stream\'s vale opens into a wide floor of meadow above its mouth, sheltered from the sea wind and green after the plain has gone dry.'),
  place('south-ibenal-open-plain', 'The open plain', -4250, 130, 40,
    "South Ibenal's widest grass, rising three hundred metres from the sea to the trees between the north stream and the border stream, drier on every rise."),
  place('south-ibenal-border-ford', "The border stream's ford", -4335, 12, 28,
    'Where the corridor\'s way wades the border stream on the line between the two Ibenals: a riffle of gravel, shallow in every season.'),
]);
/**
 * Walked routes kept clear of scenery: the ways the ground gives, not roads. **The corridor** is the natural line of
 * travel the lore's road keeps to ("it knows which stretches of the coast are unpassable in winter and skirts inland;
 * it knows where the river crossings are most reliable"): along the middle of the plain, wading every stream at a
 * ford, from Alezhor's line to the Narrows' end. It is two ways, one in each country, meeting at the border stream's ford
 * on their shared line; nothing is built along it. A shorter way in each country leaves it for the high ground: up to
 * the tree line in South Ibenal, and across North Ibenal's widest plain to the Oremindi's foot where the passes begin.
 */
const trail = (id, width, points) => freeze({ id, width, points: freeze(points.map(([x, z]) => point(x, z))) });
export const SOUTH_IBENAL_TRAILS = freeze([
  trail('south-ibenal-the-corridor', 4, [[-4628, 918], [-4645, 870], [-4667, 810], [-4684, 750], [-4675, 690], [-4652, 630], [-4626, 575],
    [-4602, 535], [-4580, 495], [-4563, 452], [-4548, 405], [-4510, 362], [-4470, 324], [-4452, 282], [-4430, 236], [-4398, 202],
    [-4370, 162], [-4362, 112], [-4353, 62], [-4342, 18], [-4336, -11]]),
  trail('south-ibenal-to-the-trees', 3, [[-4548, 405], [-4510, 418], [-4470, 432], [-4436, 444], [-4405, 452]]),
]);
/** North Ibenal's ways, re-exported live by src/north-ibenal-world.js. */
export const NORTH_IBENAL_TRAILS = freeze([
  trail('north-ibenal-the-corridor', 4, [[-4336, -11], [-4312, -70], [-4272, -140], [-4222, -210], [-4165, -275], [-4108, -330],
    [-4066, -372], [-4032, -410], [-3998, -455], [-3968, -500], [-3950, -545], [-3936, -590]]),
  trail('north-ibenal-to-the-mountain-foot', 3, [[-4032, -410], [-3950, -392], [-3860, -370], [-3770, -340], [-3700, -318], [-3658, -301]]),
]);
/** Both countries' ways: the fords are where they cross the streams. */
export const IBENAL_TRAILS = freeze([...SOUTH_IBENAL_TRAILS, ...NORTH_IBENAL_TRAILS]);
/**
 * Review views: high ones over the country, and walker's ones with the eye 1.8 m over the ground at its own place
 * (`walk: true`; the heights are the ground's, written out). The wildlife view is low over the south stream's mouth,
 * where the water birds and the otters are.
 */
const view = (eye, target, walk = false) => freeze({ eye: freeze({ x: eye[0], z: eye[1], y: eye[2] }), target: freeze({ x: target[0], z: target[1], y: target[2] }), ...(walk ? { walk: true } : {}) });
export const SOUTH_IBENAL_VIEWS = freeze({
  // Over the whole southern corridor from the open sea west of the middle stream.
  'south-ibenal': view([-4950, 360, 150], [-4470, 330, 8]),
  // On the rise at the forest's foot, looking east into West Ibenwood.
  'south-ibenal-tree-line': view([-4452, 440, 13.76], [-4360, 450, 20], true),
  // On South Ibenal's bank of West Ibenwood's stream, looking south along it under the trees.
  'south-ibenal-forest-stream': view([-4568, 712, 17.13], [-4528, 790, 15], true),
  // The narrow south from the sea: dunes, the quick rise and the forest close behind.
  'south-ibenal-narrow-south': view([-4880, 690, 40], [-4560, 680, 12]),
  // On the north stream's meadow, looking up its vale to the forest it comes out of.
  'south-ibenal-north-meadow': view([-4425, 100, 5.72], [-4300, 190, 14], true),
  // On the rise above Alezhor's west stream, looking down its valley to the sea.
  'south-ibenal-alezhor-bank': view([-4562, 905, 10.87], [-4592, 958, 2], true),
  // The low rocks from the sea.
  'south-ibenal-rocky-point': view([-4620, 150, 14], [-4545, 178, 3]),
  // Low over the south stream's mouth and the flat beside it.
  'south-ibenal-wildlife': view([-4690, 425, 7], [-4635, 402, 1]),
});
