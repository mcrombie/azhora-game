/**
 * Alezhor: terrain, climate and water only. `src/content/regions/alezhor/alezhor-scenery.js` and `src/content/regions/alezhor/alezhor-wildlife.js` carry what grows
 * and what lives here. Nothing here belongs to anybody: no city, harbour, quay, gold working, farm or road. The
 * river-mouth flats where the coastal cities would stand are kept level and open, and nothing is built on them.
 *
 * Pure: no three, no DOM. `src/world/terrain/world-terrain.js` lays the ground (`alezhorGround`) and colours it (`alezhorTint`,
 * `alezhorShoreTint`); the scenery draws the water's ribbons and lays its colliders (`alezhorWaterRibbons`,
 * `alezhorWaterColliders`); the scenery, the wildlife, the chart and the tests read the same numbers.
 *
 * **What the atlas gives** (the authority): twenty-five hexes, rows 115-119 - thirteen grassland and twelve plains,
 * `Csb` on every one. Thirteen hex edges against South Ibenwood and ten against West Ibenwood (the tree line, along
 * the north), five against Navarth and three against the Ganesh Desert (the Alezhor Water's, along the east and the
 * south), three against South Ibenal (not built), and twenty-two on the sea, which lies south and west of the strip
 * and runs into a bay between its two lobes. Three courses: the gold river's last edge, (-30,116)|(-31,116), medium;
 * West Ibenwood's stream along South Ibenal's line, three small edges; and the Alezhor Water, the southwest's.
 *
 * **What the lore gives** (`world-builder/azhora_lore/geography/regions/alezhor.md`, fitted to the atlas on 4 October
 * 2026): "a coastal plain that is narrow in the south ... and widens slightly in the center where the largest rivers
 * emerge from the forest hills"; "the forest begins where the coastal plain ends"; gold in the rivers' gravel, and
 * cities at the river mouths. Cool Mediterranean, and nothing here that anybody made.
 *
 * **The shape, in one paragraph.** A plain of grass over the head of the bay and over the west lobe, three to six
 * metres over the water and gently swelling, rising over its last seventy metres to the forest's own level at the
 * tree line (`ALEZHOR_FOOT`, read live off the far side of every tree-line edge). Two shallow folds cross it, and
 * two more the south, where the strip's own woods stand. The south is a narrow tilted strip falling west from a bank
 * at the Alezhor Water's own level to a line of cliffs with two pocket coves. The bay and the west lobe are strand
 * all round, with a line of low dunes behind the west lobe's open-ocean beach. The gold river comes out of the forest
 * at the bay's north-eastern corner, where the forest stands nearest the sea, and drops thirteen metres to it in three
 * falls between rock walls, over a gravel ford, into a short estuary; the west stream runs eight metres inside South
 * Ibenal's line to a beach at the west lobe's corner. The flats at both mouths are kept.
 *
 * **The borders** are met by Celder's method (`celderSeamMove`, src/content/regions/south-celder/south-celder-world.js): within each border's
 * feather the design gives way to the ground handed to it, laid on the seamless hex blend, and the handed ground is
 * moved to meet the far side exactly at the line, the step tables read edge by edge. No neighbour's ground is ever
 * moved, built or unbuilt. Where the forest's gold river runs its last metres on Alezhor's side of the line, its
 * samples are left exactly as handed (`IBENWOOD_KEEP`), so the forest's river ends where and how it always did.
 */
import { regionAt, regionAtWithout, hexOwnerAt, hexAt, hexCentre, isLandHex, REGION_CELLS, REGION_OUTLINES, REGION_IDS, SHORE_FRINGE,
  terrainMix, seamlessTerrainMix, relief, landDistance, SEA_LEVEL } from '../../../world/terrain/region-world.js';
import { ALEZHOR_WATER } from '../western-regions/west-regions.js';
import { WEST_PROFILES } from '../western-regions/west-ground.js';
import { IBENWOOD_RIVERS, createIbenwoodRiverSystem } from '../ibenwood/ibenwood-rivers.js';
// The ground without this country's layer, for reading the Ibenwood's two courses where they reach Alezhor and the
// unbuilt ground along the west stream. A cycle with src/world/terrain/world-terrain.js, as src/content/regions/varn/varn-world.js has: nothing here
// calls it while a module is loading.
import { groundBeforeAlezhor } from '../../../world/terrain/world-terrain.js';

const freeze = Object.freeze, point = (x, z) => freeze({ x, z });
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const bell = u => (u >= 1 ? 0 : (1 - u * u) ** 2);
const segment = (x, z, a, b) => {
  const dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz, t = l2 ? clamp(((x - a.x) * dx + (z - a.z) * dz) / l2, 0, 1) : 0;
  return { distance: Math.hypot(x - a.x - dx * t, z - a.z - dz * t), t };
};

export const ALEZHOR = 'Alezhor';
export const ALEZHOR_CELLS = freeze(REGION_CELLS[ALEZHOR] ?? []);
/** Whether a point is on Alezhor's own ground, as the traveler is told it (`regionAt`, with its shore fringe). */
export function alezhorOwns(x, z) { return regionAt(x, z)?.name === ALEZHOR; }
/** The Ibenals, registered after Alezhor's composition was reviewed and approved (392 trees, 92 batches, 16,210
 * instances; docs/region-briefs/south-ibenal-environment.md, item 6). */
export const ALEZHOR_APPROVED_WITHOUT = Object.freeze(['South Ibenal', 'North Ibenal']);
/** Where Alezhor's scatter may plant: its ground as it was when that composition was approved (`regionAtWithout`). */
export function alezhorScatterOwns(x, z) { return regionAtWithout(x, z, ALEZHOR_APPROVED_WITHOUT)?.name === ALEZHOR; }

/**
 * The climate per hex, off the World Builder map (`azhora.wwmap`, `hexes[key].climate`): `Csb` on all twenty-five,
 * the cool-summer Mediterranean. The sky stays the world's default, as the Ibenwood's does beside it: the strip is
 * the forest's own air with the sea in front of it, and the lore's "cooler than Dinova's" is a matter of degree.
 */
export const ALEZHOR_KOPPEN = 'Csb';
export const ALEZHOR_CLIMATE = freeze(Object.fromEntries(ALEZHOR_CELLS.map(c => [`${c.q},${c.r}`, ALEZHOR_KOPPEN])));
/** Alezhor's hexes with ninety metres round them: nothing in this file is asked about outside it. */
export const ALEZHOR_BOX = freeze({
  minX: Math.min(...ALEZHOR_CELLS.map(c => c.x)) - 90, maxX: Math.max(...ALEZHOR_CELLS.map(c => c.x)) + 90,
  minZ: Math.min(...ALEZHOR_CELLS.map(c => c.z)) - 90, maxZ: Math.max(...ALEZHOR_CELLS.map(c => c.z)) + 90,
});
const inBox = (x, z) => x > ALEZHOR_BOX.minX && x < ALEZHOR_BOX.maxX && z > ALEZHOR_BOX.minZ && z < ALEZHOR_BOX.maxZ;

// ---------------------------------------------------------------------------
// Whose ground a point is
// ---------------------------------------------------------------------------
const AXIAL = freeze([[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]]);
/**
 * Whose ground a point is, for writing it: on a land hex, that hex's owner (South Ibenal's are nobody's, and are
 * never written); on a sea hex, the owner of the nearest land hex beside it within the shore fringe - which is
 * `regionAt`'s rule with the unbuilt land counted as a claimant, so the few metres of beach the coast field lays past
 * the hexes are Alezhor's only where they are Alezhor's shore and not South Ibenal's.
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
/** Whether this file writes the ground at a point: Alezhor's hexes, and its own shore past them. */
export const alezhorWrites = (x, z) => inBox(x, z) && groundOwner(x, z) === ALEZHOR;

// ---------------------------------------------------------------------------
// The borders
// ---------------------------------------------------------------------------
/** The unbuilt country north-west of the strip, which the atlas names and the game has not registered. */
export const SOUTH_IBENAL = 'South Ibenal';
const FOREST = new Set(['West Ibenwood', 'South Ibenwood']);
/**
 * Every hex edge of Alezhor's outline, with its outward normal and what lies across it: one of the four built
 * neighbours, South Ibenal (land nobody has registered), or the sea.
 */
export const ALEZHOR_EDGES = freeze((() => {
  const edges = [];
  for (const loop of REGION_OUTLINES[ALEZHOR] ?? []) for (let i = 0; i < loop.length; i++) {
    const a = loop[i], b = loop[(i + 1) % loop.length], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
    let nx = dz / length, nz = -dx / length;
    if (hexOwnerAt(mx + nx, mz + nz) === ALEZHOR) { nx = -nx; nz = -nz; }
    const owner = hexOwnerAt(mx + nx, mz + nz);
    const far = owner !== 'Open country' ? owner : isLandHex(mx + nx * 10, mz + nz * 10) ? SOUTH_IBENAL : 'sea';
    edges.push(freeze({ a: point(a.x, a.z), b: point(b.x, b.z), nx, nz, length, far }));
  }
  return edges;
})());
/**
 * How far in from each kind of land border the country's own design gives way to the ground handed to it. The
 * forest's is short because the rise to the forest's own level is designed (`footRise`); South Ibenal's carries the
 * west stream's far bank; Navarth's and the Ganesh's are a few metres, because the Alezhor Water's bank is designed
 * to the water's own level and does the joining there.
 */
export const ALEZHOR_FEATHER = freeze({ 'West Ibenwood': 0, 'South Ibenwood': 0, [SOUTH_IBENAL]: 18, Navarth: 0, 'Ganesh Desert': 0 });
/**
 * The land borders, the lines the ground is met on. The two that reach the coast - the Ganesh Desert's corner on the
 * gulf and South Ibenal's at the west stream's mouth - are carried twelve metres on out to sea along their own line,
 * because that is where the shore past the hexes changes hands (`groundOwner`), so the beach there is met too.
 */
export const ALEZHOR_LINES = freeze((() => {
  const land = ALEZHOR_EDGES.filter(e => e.far !== 'sea');
  const at = (p, q) => Math.abs(p.x - q.x) < 1e-6 && Math.abs(p.z - q.z) < 1e-6;
  const shared = p => land.filter(e => at(e.a, p) || at(e.b, p)).length;
  return land.map(e => {
    let { a, b } = e;
    const ux = (b.x - a.x) / e.length, uz = (b.z - a.z) / e.length;
    if (shared(a) === 1) a = point(a.x - ux * 12, a.z - uz * 12);
    if (shared(b) === 1) b = point(b.x + ux * 12, b.z + uz * 12);
    return freeze({ a, b, nx: e.nx, nz: e.nz, far: e.far, length: Math.hypot(b.x - a.x, b.z - a.z), feather: ALEZHOR_FEATHER[e.far] });
  });
})());
const FOREST_LINES = ALEZHOR_LINES.filter(e => FOREST.has(e.far));
/** South Ibenal's lines, where the west stream's far bank meets the unbuilt country, and West Ibenwood's at its head. */
const STREAM_LINES = ALEZHOR_LINES.filter(e => e.far === SOUTH_IBENAL || e.far === 'West Ibenwood');
/** The lines the Alezhor Water runs on: Navarth's and the Ganesh Desert's. */
const WATER_LINES = ALEZHOR_LINES.filter(e => e.far === 'Navarth' || e.far === 'Ganesh Desert');
/** Distance to the nearest land border, and which. */
function nearestLine(x, z, lines = ALEZHOR_LINES, limit = Infinity) {
  let best = null, distance = limit;
  for (const e of lines) {
    if (x < Math.min(e.a.x, e.b.x) - distance || x > Math.max(e.a.x, e.b.x) + distance
      || z < Math.min(e.a.z, e.b.z) - distance || z > Math.max(e.a.z, e.b.z) + distance) continue;
    const d = segment(x, z, e.a, e.b).distance;
    if (d < distance) { distance = d; best = e; }
  }
  return { line: best, distance };
}
/** Distance to the tree line: the nearest edge with the West or South Ibenwood across it. */
export function treeLineDistance(x, z, limit = Infinity) { return nearestLine(x, z, FOREST_LINES, limit).distance; }
/** How much of the country's own design a point takes from the borders: 0 at a line, 1 past every feather. */
function borderWeight(x, z) {
  let w = 1;
  for (const e of ALEZHOR_LINES) {
    const f = e.feather;
    if (x < Math.min(e.a.x, e.b.x) - f || x > Math.max(e.a.x, e.b.x) + f || z < Math.min(e.a.z, e.b.z) - f || z > Math.max(e.a.z, e.b.z) + f) continue;
    const d = segment(x, z, e.a, e.b).distance;
    if (d < f) w *= smooth(0, f, d);
    if (w <= 0) return 0;
  }
  return w;
}

// ---------------------------------------------------------------------------
// The plain
// ---------------------------------------------------------------------------
/**
 * The level of the country's own ground at each hex's middle, in metres, before the coast lets it down to the
 * water: low over the bay's head and the west lobe, where the plain is widest; higher along the forest's foot; and in
 * the south a tilted strip falling west from the Alezhor Water's bank to its cliffs. Laid between the points with a
 * forty-two-metre Gaussian, so no hex edge shows.
 */
const UPLAND = freeze([
  // q, r, level
  [-34, 115, 9.5], [-33, 115, 9], [-32, 115, 8.5], [-31, 115, 8.5],
  [-36, 116, 8], [-35, 116, 6.5], [-34, 116, 4.6], [-33, 116, 4.2], [-32, 116, 4], [-31, 116, 3.8], [-30, 116, 5.5], [-29, 116, 12], [-28, 116, 16.5],
  [-37, 117, 3.6], [-36, 117, 4.8], [-35, 117, 4.8], [-30, 117, 9.5], [-29, 117, 14.5], [-28, 117, 20], [-27, 117, 25],
  [-30, 118, 11], [-29, 118, 16], [-28, 118, 22.5],
  [-30, 119, 12], [-29, 119, 16.5],
].map(([q, r, level]) => freeze({ ...hexCentre(q, r), level })));
const UPLAND_SIGMA = 42;
export function uplandLevel(x, z) {
  let sum = 0, total = 0;
  for (const p of UPLAND) {
    const d2 = (x - p.x) ** 2 + (z - p.z) ** 2;
    if (d2 > 170 * 170) continue;
    const w = Math.exp(-d2 / (2 * UPLAND_SIGMA * UPLAND_SIGMA));
    sum += w * p.level; total += w;
  }
  return total > 1e-9 ? sum / total : 8;
}
/** The swells: long low rolls of grass, never quite in step, a metre and a bit either way. */
export function alezhorSwell(x, z) {
  const u = x * .82 + z * .57, v = -x * .57 + z * .82;
  return .75 * Math.sin(u / 47 + .6) * Math.cos(v / 71 - 1.1) + .4 * Math.sin(x / 29 - z / 43 + 2.3) + .2 * Math.sin(z / 23 + x / 37 + .4);
}

// ---------------------------------------------------------------------------
// The forest's foot
// ---------------------------------------------------------------------------
/**
 * "The forest begins where the coastal plain ends": the plain rises to the forest's own level at the tree line over
 * `reach` metres, gently at first and steepest at the trees. The level it rises to is read live, off the far side of
 * each tree-line edge (`lineLevels`, every half metre and averaged over `window` metres either way), so the foot
 * follows the built forest wherever its builder puts it.
 */
export const ALEZHOR_FOOT = freeze({ reach: 72, window: 12 });
let FOOT = null;
function footLines() { return (FOOT ??= FOREST_LINES.map(e => ({ ...e, count: 0 }))); }
/** One tree-line edge's far-side levels, read the first time a point comes within reach of it. */
function lineLevels(line, before) {
  if (line.count) return line;
  const count = Math.max(1, Math.ceil(line.length / .5)), levels = new Float64Array(count + 1);
  for (let i = 0; i <= count; i++) {
    const s = Math.max(.1, Math.min(line.length - .1, line.length * i / count));
    const x = line.a.x + (line.b.x - line.a.x) * s / line.length, z = line.a.z + (line.b.z - line.a.z) * s / line.length;
    levels[i] = before(x + line.nx * .05, z + line.nz * .05);
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
/** The forest's level a point rises toward, and how far it is from the trees (soft over nearby edges). */
function forestFoot(x, z, before) {
  const reach = ALEZHOR_FOOT.reach;
  let near = Infinity;
  const found = [];
  for (const line of footLines()) {
    if (x < Math.min(line.a.x, line.b.x) - reach || x > Math.max(line.a.x, line.b.x) + reach
      || z < Math.min(line.a.z, line.b.z) - reach || z > Math.max(line.a.z, line.b.z) + reach) continue;
    const p = segment(x, z, line.a, line.b);
    if (p.distance >= reach) continue;
    found.push([line, p]); near = Math.min(near, p.distance);
  }
  if (!found.length || !before) return null;
  const soft = 2 + .25 * near;
  let sum = 0, total = 0;
  for (const [line, p] of found) {
    const k = (p.distance - near) / soft;
    if (k > 20) continue;
    // A line comes into the reckoning gently, so nothing steps where it first counts.
    const w = Math.exp(-k) * (1 - smooth(reach - 18, reach, p.distance)) + 1e-9;
    total += w; sum += w * levelNear(lineLevels(line, before), p.t * line.length, ALEZHOR_FOOT.window);
  }
  return { level: sum / total, distance: near };
}
/** How much of the rise a point at `distance` from the trees has still to make: 1 at the line, 0 past the reach. */
const footShare = distance => { const t = clamp(1 - distance / ALEZHOR_FOOT.reach, 0, 1); return t * t * (1.6 - .6 * t); };

// ---------------------------------------------------------------------------
// The coast
// ---------------------------------------------------------------------------
/** The sea floor and strand every region shares, below and up to the waterline (src/world/terrain/world-terrain.js `regionBase`). */
const beachAt = d => mix(-5.6, 1.4, smooth(-26, 6, d));
/** The sea's own surface (`SEA_LEVEL`, src/world/terrain/region-world.js): the level an estuary and a mouth come down to. */
const SEA = SEA_LEVEL;
/**
 * The land let down to the water, as East Izol's is: a cliff keeps the land's height to within 3.6 m of the water
 * and drops; a strand ramps down over `strand` metres. Below the first forty centimetres it is the shore handed to
 * it - the shore every region shares, or near the Ganesh's corner that country's own, which stands a little higher -
 * so the waterline is exactly where it was and nothing steps at the water.
 */
export function coastProfile(d, top, cliff, strand = 30, shore = beachAt(d)) {
  return mix(mix(shore, top, smooth(2, strand, d)), mix(shore, top, smooth(.4, 3.6, d)), cliff);
}
/**
 * How much of a cliff the shore beside a point is. The west lobe and the bay are strand all round: the open-ocean
 * beach under the dunes, the sheltered head of the bay and the two river mouths. From the gold river's estuary south
 * the coast is cliff - the narrow south, where the high ground comes down to the sea - but for the two coves.
 */
export function cliffShare(x, z) {
  let cliff = smooth(-3944, -3928, x);
  if (cliff <= 0) return 0;
  // A cove is strand across its bowl, which runs longer along the shore than into the land.
  for (const c of ALEZHOR_COVES) {
    if (Math.abs(x - c.x) > 60 || Math.abs(z - c.z) > 60) continue;
    const at = coveReach(c, x, z);
    cliff = Math.min(cliff, smooth(at.edge * .85, at.edge + c.wall * .75, at.r));
  }
  return cliff;
}
/** How far in from the water a strand's ramp reaches: the ordinary thirty metres, and fourteen in front of a kept flat. */
const strandWidth = (x, z) => mix(30, 14, keptShare(x, z));

// ---------------------------------------------------------------------------
// The water: the Ibenwood's two courses carried on to the sea, and the Alezhor Water's bank
// ---------------------------------------------------------------------------
const IBENWOOD_GOLD = IBENWOOD_RIVERS.find(c => c.id === 'ibenwood-central-south-river');
const IBENWOOD_WEST = IBENWOOD_RIVERS.find(c => c.id === 'ibenwood-west-stream');
let IBENWOOD_ENDS = null;
/**
 * Where the Ibenwood's two courses reach Alezhor: each one's last sample - its place, level, half-width, depth and
 * normal - read off the forest's own river system (`createIbenwoodRiverSystem`) built on the ground without
 * Alezhor. That is the very ground those samples stand on: Alezhor leaves the gold river's last samples, which lie on
 * its own side of the line, exactly as it found them (`IBENWOOD_KEEP`), so the forest's river ends where it always
 * did, at the level it always had, and this country's reaches begin there.
 */
export function ibenwoodEnds() {
  if (IBENWOOD_ENDS) return IBENWOOD_ENDS;
  const system = createIbenwoodRiverSystem({ groundHeight: groundBeforeAlezhor });
  const end = id => {
    const samples = system.profiles.find(p => p.course.id === id).samples, p = samples.at(-1), q = samples.at(-2);
    const l = Math.hypot(p.x - q.x, p.z - q.z);
    return freeze({ x: p.x, z: p.z, surface: p.surface, half: p.half, depth: p.depth, nx: p.nx, nz: p.nz, dx: (p.x - q.x) / l, dz: (p.z - q.z) / l });
  };
  return (IBENWOOD_ENDS = freeze({ gold: end(IBENWOOD_GOLD.id), west: end(IBENWOOD_WEST.id) }));
}
/**
 * The gold river's last metres in the forest run along the border with South Ibenwood and its last samples lie on
 * Alezhor's side of the line, so the forest's river reads their level off Alezhor's ground. Within `inner` metres of
 * that stretch of its course Alezhor answers the ground it was handed, exactly, letting go of it by `outer`.
 */
export const IBENWOOD_KEEP = freeze({ inner: .6, outer: 2.6, points: freeze(IBENWOOD_GOLD.points.slice(-4).map(p => point(p.x, p.z))) });
function ibenwoodKeepDistance(x, z) {
  const pts = IBENWOOD_KEEP.points;
  if (x < -3960 || x > -3920 || z < 845 || z > 876) return Infinity;
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) best = Math.min(best, segment(x, z, pts[i - 1], pts[i]).distance);
  return best;
}

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
/** A value along a reach from keyframes `[along, value]`, eased between each pair so a pool is level and a fall is a fall. */
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
 * Where a point lies against a reach: how far from its line, how far down it, and which side (+1 on the normal's
 * side). How far down is read off every nearby segment weighted by how near it is, so it runs on smoothly round a
 * bend (East Izol's gullies' rule). Null beyond `limit`.
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

/**
 * **The gold river's Alezhor reach.** The atlas carries the medium river of the Central and South Ibenwood on from
 * the forest's border along the edge between (-30,116) and (-31,116) to the sea: sixty metres. The forest leaves it
 * at thirteen and a half metres, so it comes down to the sea the way a river leaves hills that stand at the shore -
 * "where the largest rivers emerge from the forest hills" - in a gorge of three falls and three pools between rock
 * walls, over a gravel ford at the foot of the falls where the placer gold lies, and into a short estuary at the head
 * of the bay. Its first metres are the forest's last ones: the same place, level, half-width and depth, and the same
 * line, turning south over the first fifteen.
 *
 * Keyframes are metres down the reach: `surface` the water's level, `half` its half-width, `depth` the bed under the
 * water, `rim` the gorge's rim (its first two over the forest river's level, the rest outright). Past `estuaryFrom`
 * the water is the sea's.
 */
export const GOLD_REACH_SPEC = freeze({
  id: 'alezhor-gold-reach', name: 'The gold river',
  control: freeze([[-3957.6, 873.4], [-3958.6, 881], [-3957.6, 889], [-3955.6, 897], [-3953, 905], [-3951, 913], [-3950, 921], [-3949.5, 930], [-3949, 946]].map(([x, z]) => point(x, z))),
  // The falls: three, of 3.3, 3.4 and 4.1 metres, each into a pool.
  surface: freeze([[9, -.13], [13, 10], [19, 9.85], [23, 6.45], [29, 6.3], [33.5, 2.25], [44, 1.45], [50.5, .12]]),
  half: freeze([[8, 0], [11, 2.6], [15, 3.2], [21, 2.5], [25, 3.1], [31, 2.4], [35, 3.6], [40, 5], [46, 5.4], [50.5, 6]]),
  depth: freeze([[8, 1.45], [11, .55], [15, 1.6], [21, .55], [25, 1.6], [31, .6], [35, 1.4], [38.5, .45], [40, .32], [46, .3], [50.5, .5]]),
  /** The gorge's rim, its level as it falls the reach's length: one even fall beside the water's steps. */
  rim: freeze([[0, 1.4], [8, 2.2], [20, 13.6], [31, 9], [36, 5.2], [40, 3.3], [46, 2.4], [50.5, 1.6]]),
  ford: freeze({ from: 38.5, to: 46.5 }),
  /** The three falls, where no water collider is centred (a traveler climbs down beside them, through white water). */
  falls: freeze([freeze([9, 13]), freeze([19, 23]), freeze([29, 33.5])]),
  capFrom: 3.5,
  estuaryFrom: 50.5,
  /** The estuary: half-width and bed at metres down the reach, the sea's water over it. */
  estuary: freeze({ half: freeze([[50.5, 6], [62, 13], [76, 19]]), bed: freeze([[50.5, -.6], [62, -2.2], [80, -3.4]]) }),
});
let GOLD = null;
/** The gold reach, built the first time it is asked for: its stations every half metre, with level, width and depth. */
export function goldReach() {
  if (GOLD) return GOLD;
  const S = GOLD_REACH_SPEC, end = ibenwoodEnds().gold;
  const head = point(end.x, end.z), lead = point(end.x + end.dx * 5, end.z + end.dz * 5);
  const line = soften([head, lead, ...S.control]);
  const raw = stations(line, .5);
  // The first station carries the forest's own normal, so the two ribbons share their last and first edge.
  raw[0].nx = end.nx; raw[0].nz = end.nz;
  const surfaceKeys = [[0, end.surface], ...S.surface.map(([s, v], i) => [s, i === 0 ? end.surface + v : v])];
  const halfKeys = [[0, end.half], ...S.half.map(([s, v], i) => [s, i === 0 ? end.half : v])];
  const depthKeys = [[0, end.depth], ...S.depth];
  // The rim's first two keys are over the forest river's own level; the rest are levels outright.
  const rimKeys = S.rim.map(([s, v], i) => [s, i < 2 ? end.surface + v : v]);
  const samples = raw.map(p => freeze({ ...p,
    surface: p.along <= S.estuaryFrom ? keyed(surfaceKeys, p.along) : 0,
    half: p.along <= S.estuaryFrom ? keyed(halfKeys, p.along) : keyed(S.estuary.half, p.along),
    depth: keyed(depthKeys, p.along), rim: keyed(rimKeys, p.along),
    bed: p.along <= S.estuaryFrom ? keyed(surfaceKeys, p.along) - keyed(depthKeys, p.along) : keyed(S.estuary.bed, p.along),
    estuary: p.along > S.estuaryFrom,
  }));
  const length = samples.at(-1).along;
  return (GOLD = freeze({ id: S.id, name: S.name, samples: freeze(samples), length, grid: indexReach(samples, 40),
    head, ford: S.ford, estuaryFrom: S.estuaryFrom }));
}
/** The reach's stations either side of `along`, lerped: level, half-width, bed and rim. */
function reachSample(reach, along) {
  const [a, b, t] = bracket(reach.samples, along);
  return { surface: mix(a.surface, b.surface, t), half: mix(a.half, b.half, t), bed: mix(a.bed, b.bed, t), rim: mix(a.rim, b.rim, t),
    estuary: along > reach.estuaryFrom, x: mix(a.x, b.x, t), z: mix(a.z, b.z, t) };
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
 * The gold reach's gorge walls: the rock either side of the falls raised to the rim, which falls the reach's length
 * in one even line while the water drops in steps inside it, then falling away steeply into the country round them -
 * a spur of rock the river has cut down through. Part of the design, so the borders are met with them standing.
 */
export const GOLD_GORGE = freeze({ shelf: 6, fall: .8, curve: .02 });
function goldWalls(x, z, ground) {
  if (x < -3995 || x > -3905 || z < 852 || z > 965) return ground;
  const reach = goldReach(), at = reachAt(reach, x, z, 34);
  if (!at || at.along >= reach.estuaryFrom) return ground;
  const p = reachSample(reach, at.along), c = at.distance, G = GOLD_GORGE;
  const out = c - G.shelf, wall = out <= 0 ? p.rim : p.rim - G.fall * out - G.curve * out * out;
  const fade = 1 - smooth(reach.estuaryFrom - 6, reach.estuaryFrom, at.along);
  return wall > ground ? mix(ground, wall, fade) : ground;
}
/**
 * The gold reach's channel, cut into whatever ground the rest laid, after the borders are met: a bed under the
 * water rising to the water's edge, then a bank as steep as the gorge's rock - or, at the ford, a low gravel one -
 * and in the estuary the bed under the sea's water with a gravel bar either side. Over its first metres the reach
 * lies in the forest river's own end (`createIbenwoodRiverSystem`'s `ground`, which cuts a bowl round its last
 * sample after every country's layer), so the cut comes in from `capFrom` metres down.
 */
function goldChannel(x, z, ground) {
  if (x < -3995 || x > -3905 || z < 852 || z > 965) return ground;
  const reach = goldReach(), at = reachAt(reach, x, z, 34);
  if (!at) return ground;
  const p = reachSample(reach, at.along), c = at.distance;
  // The river's own channel, and the estuary's, handing over across the last metres of the riffle.
  const toSea = smooth(reach.estuaryFrom - 5, reach.estuaryFrom + 1, at.along);
  let cap = Infinity;
  if (toSea < 1) {
    // The ford's low banks run on down the riffle into the estuary's own bars, so there is no rock between them.
    const ford = smooth(reach.ford.from - 2, reach.ford.from, at.along) * (1 - smooth(reach.estuaryFrom, reach.estuaryFrom + 3, at.along));
    // At the ford a strip of gravel three metres wide either side, rising gently, then a grass bank a walker climbs;
    // elsewhere the gorge's rock.
    const gravel = 3 * ford, steep = mix(2.4, .75, ford);
    // Cut to the lowest water within a metre and a half either way: down a fall the water's sheet drops a metre in a
    // metre, and a point beside the line reads its place along the reach a little differently from the sheet's edge.
    const w = mix(1.5, .5, smooth(34, 37, at.along));
    const low = Math.min(p.surface, reachSample(reach, at.along - w).surface, reachSample(reach, at.along + w).surface);
    const bed = Math.min(p.bed, low - mix(.35, .2, ford));
    const u = c - p.half;
    cap = c < p.half ? mix(bed, low - .08, smooth(p.half * .55, p.half, c)) : low - .08 + Math.min(u, gravel) * .45 + Math.max(0, u - gravel) * steep;
  }
  if (toSea > 0) cap = mix(cap === Infinity ? 0 : cap, estuaryCap(p, c, at.along), toSea);
  return mix(ground, Math.min(ground, cap), smooth(GOLD_REACH_SPEC.capFrom, GOLD_REACH_SPEC.capFrom + 3, at.along));
}
/** The estuary's cross-section: its bed, the water's edge forty centimetres under the sea's surface, a gravel bar a metre over it, then the land. */
function estuaryCap(p, c, along) {
  const E = GOLD_REACH_SPEC.estuary, e = Math.max(p.half, keyed(E.half, along)), bed = Math.min(p.bed, keyed(E.bed, along));
  if (c < e) return mix(bed, -.4, smooth(e * .6, e, c));
  if (c < e + 1.4) return mix(-.4, .95, (c - e) / 1.4);
  if (c < e + 5) return mix(.95, 1.15, (c - e - 1.4) / 3.6);
  const u = c - e - 5;
  return 1.15 + .35 * u + .04 * u * u;
}
/** How far the gold estuary's mouth may cut the shared shore below the waterline: inside its water, out to sea. */
function goldMouth(x, z, incoming) {
  if (x < -3985 || x > -3915 || z < 915 || z > 965) return incoming;
  const reach = goldReach(), at = reachAt(reach, x, z, 24);
  if (!at || at.along < reach.estuaryFrom) return incoming;
  const p = reachSample(reach, at.along);
  if (at.distance > p.half + 1.4) return incoming;
  return Math.min(incoming, at.distance < p.half ? mix(p.bed, -.4, smooth(p.half * .6, p.half, at.distance)) : mix(-.4, .95, (at.distance - p.half) / 1.4));
}

/**
 * **The Alezhor Water's bank.** The water is the southwest's (`ALEZHOR_WATER`, src/content/regions/western-regions/west-regions.js): Navarth's and the
 * Ganesh's own, drawn on their border with Alezhor and never moved. Alezhor gives it a real bank at the water's own
 * level: under the water a bed half a metre down, rising to eight centimetres under the surface at the water's edge,
 * and from there a bank rising `lip` over the water in `rise` metres and to `top` across `width`, then let back into
 * the country over `blend`. The level is read off the water's own profile where the point stands
 * (`alezhorWaterNear`), so the bank follows the water down its fall off Navarth's rim and along its last reach to the
 * gulf. After the borders are met (`waterHold`) the bank is held to the water but within `floorFrom`-`floorTo`
 * metres of a line, where the neighbour's own ground is met as it stands.
 */
export const ALEZHOR_WATER_BANK = freeze({ bed: .5, edge: .08, rise: 2, lip: .3, width: 10, top: .9, blend: 30, floorFrom: 1.5, floorTo: 5 });
const inWaterBox = (x, z) => x > -3790 && x < -3460 && z > 925 && z < 1240;
let WATER_LINE = null;
/** The Alezhor Water as the line of its own profile's stations (the line its ribbon is drawn on), with how far along each is. */
function alezhorWaterLine() {
  if (WATER_LINE) return WATER_LINE;
  const profile = WEST_PROFILES.get(ALEZHOR_WATER.id);
  let run = 0;
  const samples = profile.map((p, i) => {
    if (i) run += Math.hypot(p.x - profile[i - 1].x, p.z - profile[i - 1].z);
    return freeze({ x: p.x, z: p.z, nx: p.nx, nz: p.nz, along: run, surface: p.surface, half: p.half });
  });
  return (WATER_LINE = freeze({ samples: freeze(samples), length: run, grid: indexReach(samples, 40) }));
}
/**
 * Where a point lies against the Alezhor Water: how far from its line, and the water's level and half-width there,
 * read off its profile by how far along the line the point lies - which runs on smoothly round a bend, where the
 * nearest sample alone would jump from one side of the bend to the other.
 */
export function alezhorWaterNear(x, z, limit = 40) {
  if (!inWaterBox(x, z)) return null;
  const line = alezhorWaterLine(), at = reachAt(line, x, z, limit);
  if (!at) return null;
  const s = line.samples;
  let lo = 0, hi = s.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (s[m].along <= at.along) lo = m; else hi = m; }
  const t = clamp((at.along - s[lo].along) / Math.max(1e-6, s[hi].along - s[lo].along), 0, 1);
  return { distance: at.distance, along: at.along, surface: mix(s[lo].surface, s[hi].surface, t), half: mix(s[lo].half, s[hi].half, t) };
}
function waterBank(x, z, ground) {
  const p = alezhorWaterNear(x, z, ALEZHOR_WATER_BANK.blend + 2);
  if (!p || p.distance >= ALEZHOR_WATER_BANK.blend) return ground;
  const B = ALEZHOR_WATER_BANK, c = p.distance, S = p.surface, h = p.half;
  const bank = c < h ? mix(S - B.bed, S - B.edge, smooth(h * .7, h, c))
    : c < h + B.rise ? mix(S - B.edge, S + B.lip, (c - h) / B.rise)
      : mix(S + B.lip, S + B.top, smooth(h + B.rise, h + B.width, c));
  return mix(bank, ground, smooth(h + B.width * .6, B.blend, c));
}
/**
 * After the borders are met, the bank is held to the water: nothing of Alezhor's stands in the water, and none of
 * its ground beside the water lies under it - except within `floorFrom` metres of the line, where the neighbour's
 * own bank is met as it stands, wherever its builder puts it.
 */
function waterHold(x, z, ground) {
  const p = alezhorWaterNear(x, z, 12);
  if (!p || p.distance >= 11) return ground;
  const B = ALEZHOR_WATER_BANK, c = p.distance, S = p.surface, h = p.half;
  // Under the water no higher than its edge; and the level the ground is held up to: from half way across the water
  // rising to the water's edge, and beside the water at the water's own level and a little over it.
  const g = c < h ? Math.min(ground, S - B.edge) : ground;
  const floor = c < h ? S - B.edge - 2.5 * (1 - smooth(h * .5, h, c))
    : c < h + B.rise ? mix(S - B.edge, S + B.lip, (c - h) / B.rise) : S + B.lip;
  const hold = smooth(B.floorFrom, B.floorTo, nearestLine(x, z, ALEZHOR_LINES, B.floorTo + 1).distance) * (1 - smooth(h + 6, 11, c));
  return g < floor ? mix(g, floor, hold) : g;
}

/**
 * **The west stream's Alezhor reach.** West Ibenwood's border stream comes down to the corner of three countries at
 * (-4500, 837) and the atlas runs it on along South Ibenal's border - three edges, (-36,115)|(-36,116),
 * (-36,116)|(-37,116) and (-37,116)|(-37,117) - to the sea at the west lobe's corner. South Ibenal is not built, so
 * the stream is laid eight metres inside Alezhor along that line, on Alezhor's own ground with both its banks
 * Alezhor's: its far bank rises to meet the unbuilt country at the line as it stands. It starts where the forest's
 * stream stops, at its level and width, and its fall is read off the ground it runs through (`westStream`): never
 * nearer than a metre under the unbuilt ground at the line or under this country's own, never rising, and at the
 * sea at its mouth.
 */
export const WEST_STREAM_SPEC = freeze({
  id: 'alezhor-west-stream', name: 'The west stream',
  control: freeze([[-4500.002, 842.5], [-4505.5, 850.5], [-4519, 857.5], [-4532, 864.5], [-4540.5, 872], [-4541.5, 884], [-4541.5, 900],
    [-4541, 912], [-4540.2, 921], [-4541.3, 928.9], [-4545, 932.8], [-4554, 937.2], [-4571.5, 946.7], [-4588.8, 956.7], [-4601, 963.5],
    [-4614, 971]].map(([x, z]) => point(x, z))),
  half: freeze([[0, 0], [30, 1.75], [120, 1.9], [175, 2.3]]),
  depth: freeze([[0, 0], [12, .7], [150, .6], [175, .7]]),
  /** How far under the lower of the unbuilt line and this country's own ground the water keeps, and its least fall. */
  clear: 1.1, fall: .004, bank: .9,
});
let WEST = null;
/** The west stream, built the first time it is asked for: its stations every metre, its fall read off the ground. */
export function westStream() {
  if (WEST) return WEST;
  const S = WEST_STREAM_SPEC, end = ibenwoodEnds().west, before = groundBeforeAlezhor;
  const head = point(end.x, end.z);
  const raw = stations(soften([head, ...S.control]), 1);
  raw[0].nx = end.nx; raw[0].nz = end.nz;
  const southIbenal = ALEZHOR_LINES.filter(e => e.far === SOUTH_IBENAL);
  // The ground the water must keep under: the unbuilt country at the nearest point of the line, and this country's own design.
  const ceiling = raw.map(p => {
    const { line } = nearestLine(p.x, p.z, southIbenal);
    const t = segment(p.x, p.z, line.a, line.b).t, lx = mix(line.a.x, line.b.x, t), lz = mix(line.a.z, line.b.z, t);
    const d = landDistance(p.x, p.z);
    const own = d > 0 ? Math.min(alezhorDesign(p.x, p.z, d, before), before(p.x, p.z)) : -1;
    return Math.min(before(lx + line.nx * .05, lz + line.nz * .05), own) - S.clear;
  });
  // The mouth: where the shore begins. Past it the water is the sea's, and the channel is cut a little under it.
  let mouth = raw.findIndex(p => landDistance(p.x, p.z) < 3);
  if (mouth < 0) mouth = raw.length;
  const surface = raw.map(() => SEA);
  surface[0] = end.surface;
  for (let i = 1; i < mouth; i++) surface[i] = Math.max(SEA + .05, Math.min(ceiling[i], surface[i - 1] - S.fall * (raw[i].along - raw[i - 1].along)));
  for (let pass = 0; pass < 4; pass++) for (let i = 1; i < mouth - 1; i++) surface[i] = Math.min(surface[i], (surface[i - 1] + surface[i] * 2 + surface[i + 1]) / 4);
  for (let i = 1; i < mouth; i++) surface[i] = Math.min(surface[i], surface[i - 1] - S.fall * .5);
  // The last ten metres come down to the sea's own level at the mouth.
  for (let i = 1; i < mouth; i++) { const left = raw[mouth - 1].along - raw[i].along; if (left < 10) surface[i] = mix(SEA + .05, surface[i], left / 10); }
  for (let i = 1; i < raw.length; i++) surface[i] = Math.min(surface[i], surface[i - 1]);
  const halfKeys = [[0, end.half], ...S.half.slice(1)], depthKeys = [[0, end.depth], ...S.depth.slice(1)];
  const samples = raw.map((p, i) => freeze({ ...p, surface: surface[i], half: keyed(halfKeys, p.along),
    bed: i < mouth ? surface[i] - keyed(depthKeys, p.along) : Math.max(-2.2, SEA - .9 - .12 * (p.along - raw[Math.min(mouth, raw.length - 1)].along)),
    estuary: i >= mouth }));
  mouth = Math.min(mouth, raw.length - 1);
  return (WEST = freeze({ id: S.id, name: S.name, samples: freeze(samples), length: samples.at(-1).along, grid: indexReach(samples, 30), head,
    mouthAlong: raw[mouth].along }));
}
/** The west stream at `along` metres down it, lerped between its stations. */
function streamSample(reach, along) {
  const [a, b, t] = bracket(reach.samples, along);
  return { surface: mix(a.surface, b.surface, t), half: mix(a.half, b.half, t), bed: mix(a.bed, b.bed, t), x: mix(a.x, b.x, t), z: mix(a.z, b.z, t) };
}
const inWestBox = (x, z) => x > -4640 && x < -4480 && z > 825 && z < 990;
/** The west stream's channel, cut last: a bed under the water, its banks rising at `bank` to whatever the rest laid. */
function westChannel(x, z, ground) {
  if (!inWestBox(x, z)) return ground;
  const reach = westStream(), at = reachAt(reach, x, z, 24);
  if (!at) return ground;
  const p = streamSample(reach, at.along), c = at.distance;
  // Cut to the lowest water within a metre and a half either way, as the gold river's is, for its steeper runs.
  const low = Math.min(p.surface, streamSample(reach, at.along - 1.5).surface, streamSample(reach, at.along + 1.5).surface);
  const bed = Math.min(p.bed, low - .3);
  const cap = c < p.half ? mix(bed, low - .08, smooth(p.half * .55, p.half, c)) : low - .08 + (c - p.half) * WEST_STREAM_SPEC.bank;
  // Over its first metres it lies in the forest stream's own end, which cuts its own bowl; and its far bank lets go
  // of the unbuilt country, and of West Ibenwood at the corner, over the last two metres before the line, which is met
  // as it stands.
  const far = smooth(.3, 2, nearestLine(x, z, STREAM_LINES, 3).distance);
  return mix(ground, Math.min(ground, cap), smooth(3, 6, at.along) * far);
}
/** The west stream's mouth, cut through the shared shore below the waterline. */
function westMouth(x, z, incoming) {
  if (!inWestBox(x, z)) return incoming;
  const reach = westStream(), at = reachAt(reach, x, z, 8);
  if (!at || at.along < reach.mouthAlong - 12) return incoming;
  const p = streamSample(reach, at.along);
  if (at.distance > p.half + 2) return incoming;
  // The same cross-section as the channel on the land, so nothing steps where the coast field's line is crossed.
  return Math.min(incoming, at.distance < p.half ? mix(p.bed, p.surface - .08, smooth(p.half * .55, p.half, at.distance)) : p.surface - .08 + (at.distance - p.half) * WEST_STREAM_SPEC.bank);
}

// ---------------------------------------------------------------------------
// Alezhor's own running water, for the scenery, the wildlife, the chart and the traveler
// ---------------------------------------------------------------------------
/**
 * The two reaches whose water is Alezhor's own (the Alezhor Water is the southwest's, and the sea is the sea's):
 * the gold river from the forest's end to its estuary, and the west stream from the forest's end to its mouth.
 * Each is `{ id, name, samples: [{ x, z, nx, nz, along, surface, half, bed }], length }`; a station's water runs
 * while `waterTo` has not been passed. Built the first time they are asked for.
 */
export function alezhorRivers() {
  const gold = goldReach(), west = westStream();
  return [{ reach: gold, waterTo: gold.estuaryFrom }, { reach: west, waterTo: west.mouthAlong }];
}
const sampleOf = (reach, along) => (reach === GOLD ? reachSample(reach, along) : streamSample(reach, along));
/**
 * Where a point lies against Alezhor's own water: which reach, how far from its line and how far down it, the
 * water's level, half-width and bed there, and whether the point is in the water. Null beyond `limit` metres.
 */
export function alezhorRiverAt(x, z, limit = 30) {
  if (!inBox(x, z)) return null;
  let best = null;
  for (const { reach, waterTo } of alezhorRivers()) {
    const at = reachAt(reach, x, z, limit);
    if (!at || (best && at.distance >= best.distance)) continue;
    const p = sampleOf(reach, at.along), running = at.along <= waterTo;
    best = { river: reach.id, distance: at.distance, along: at.along, surface: running ? p.surface : SEA, half: p.half, bed: p.bed,
      water: running && at.distance < p.half, estuary: !running };
  }
  return best;
}
/** The level of Alezhor's own running water over a point, or null where there is none (the sea is the sea's). */
export function alezhorWaterAt(x, z) {
  const at = alezhorRiverAt(x, z, 8);
  return at?.water ? at.surface : null;
}
/**
 * The water's ribbons, drawn exactly where `alezhorWaterAt` answers: per reach, the stations' edges at the water's
 * level (`positions`, x y z in turn) and the triangles between them (`indices`). The gold river's first edge is the
 * forest river's last one, so the two sheets meet without a seam.
 */
export function alezhorWaterRibbons() {
  return alezhorRivers().map(({ reach, waterTo }) => {
    const positions = [], indices = [];
    for (const p of reach.samples) {
      if (p.along > waterTo + 1e-6) break;
      positions.push(p.x + p.nx * p.half, p.surface, p.z + p.nz * p.half, p.x - p.nx * p.half, p.surface, p.z - p.nz * p.half);
      const k = positions.length / 3 - 4;
      if (k >= 0) indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
    return freeze({ id: reach.id, name: reach.name, positions: freeze(positions), indices: freeze(indices) });
  });
}
/**
 * The two reaches in the shape the forest's own fine terrain pass reads (`refineIbenwoodRiverGroundSteps`,
 * src/content/regions/ibenwood/ibenwood-rivers.js: `courses[].bounds` and `nearest(x, z, maxReach)`), so the world's 7.1-metre terrain mesh can
 * be laid at two metres along this water too, as it is along the forest's. The shared ground-only job combines both
 * indices before either country's scenery, so a tile touching their join is refined once for the whole course.
 */
export function alezhorRiverIndex() {
  const rivers = alezhorRivers().map(({ reach }) => {
    const xs = reach.samples.map(p => p.x), zs = reach.samples.map(p => p.z);
    // Its own grid, padded past the pass's reach, so a distance is answered all the way out to where the pass lets go.
    return { reach: { id: reach.id, samples: reach.samples, grid: indexReach(reach.samples, 56) },
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
/** Each ribbon's outline, for the chart (`mapWaters` in src/world.js takes `{ id, kind: 'polygon', points }`). */
export function alezhorMapWaters() {
  return alezhorWaterRibbons().map(r => {
    const left = [], right = [];
    for (let i = 0; i < r.positions.length; i += 6) { left.push(point(r.positions[i], r.positions[i + 2])); right.push(point(r.positions[i + 3], r.positions[i + 5])); }
    return freeze({ id: `${r.id}-water`, kind: 'polygon', points: freeze([...left, ...right.reverse()]) });
  });
}
/**
 * The water as the world's water colliders (`kind: 'river-water'`, src/gameplay/movement/game-state.js), which `world.waterAt` reads:
 * circles along each reach, each carrying the lowest level of the water it covers, so nobody is told he is under a
 * surface that is not over him. None over the gold river's ford, which is waded, nor down its falls, which are rock
 * and white water a traveler climbs down beside; the pools between the falls are swum.
 */
export function alezhorWaterColliders() {
  const out = [];
  for (const { reach, waterTo } of alezhorRivers()) {
    const gold = reach === GOLD, F = GOLD_REACH_SPEC.ford;
    for (let along = 0; along < waterTo;) {
      const p = sampleOf(reach, along), r = Math.max(1.1, p.half * .9);
      // None centred on a fall, and none reaching the ford, which is waded.
      const skip = gold && (GOLD_REACH_SPEC.falls.some(([a, b]) => along >= a && along <= b) || (along + r >= F.from && along - r <= F.to));
      if (!skip) {
        // The lowest water the circle covers - past the reach's own water, the sea's.
        let low = p.surface;
        for (let s = Math.max(0, along - r); s <= along + r; s += .5) low = Math.min(low, s > waterTo ? SEA : sampleOf(reach, s).surface);
        out.push(freeze({ x: p.x, z: p.z, r, kind: 'river-water', stream: reach.id, surface: low }));
      }
      along += Math.max(.8, r * .8);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Kept ground, folds, coves and dunes
// ---------------------------------------------------------------------------
/**
 * **The river-mouth flats**: ground kept open and level where the lore's coastal cities stand ("These river mouths
 * are where the cities are"), with nothing on it. A plane (`level` at its middle, rising `rise` metres for every metre
 * inland, which is along `inland`) inside a rounded rectangle `halfX` by `halfZ`, its edge wandering by a metre or
 * two, let back into the country round it over `feather` metres.
 * - **The gold estuary's flat**, on the west bank of the gold river's mouth at the head of the bay, between the
 *   gorge's west wall and the bay's sheltered strand: the largest river's mouth, and the lore's largest harbour.
 * - **The west mouth's flat**, behind the beach at the west stream's mouth on the west lobe's open-ocean corner.
 */
const kept = (id, name, x, z, spec) => freeze({ id, name, x, z, ...spec, inland: freeze(spec.inland) });
export const ALEZHOR_KEPT = freeze([
  kept('gold-estuary-flat', "The gold estuary's flat", -4029, 911, { halfX: 62, halfZ: 21, round: 14, level: 3.25, rise: .03, inland: { x: 0, z: -1 }, feather: 22, wander: 2.5 }),
  kept('west-mouth-flat', "The west mouth's flat", -4553, 985, { halfX: 31, halfZ: 19, round: 12, level: 3, rise: .025, inland: { x: .6, z: -.8 }, feather: 18, wander: 2 }),
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
  for (const k of ALEZHOR_KEPT) { const f = keptFrame(k, x, z); best = Math.max(best, 1 - smooth(0, k.feather, f.outside)); }
  return best;
}
/** The kept place a point is on, if any. */
export const keptAt = (x, z) => ALEZHOR_KEPT.find(k => keptFrame(k, x, z).outside <= 0) ?? null;
function keepLevel(x, z, h) {
  for (const k of ALEZHOR_KEPT) {
    const f = keptFrame(k, x, z);
    if (f.outside >= k.feather) continue;
    h = mix(h, f.level, 1 - smooth(0, k.feather, f.outside));
  }
  return h;
}

/**
 * **The folds**: shallow hollows where the winter's water comes off the forest's foot toward the sea - dry swales,
 * not streams; the atlas draws no water here but the three courses - and where the strip's own woods stand out of the
 * wind (the life builder's "local woodland in folds"). Two cross the open plain; two cross the tilted south and come
 * out at the two coves under its cliffs. `depth` at the middle of the fold, `half` its half-width.
 */
const fold = (id, points, depth, half) => {
  const pts = points.map(([x, z]) => point(x, z));
  let length = 0;
  for (let i = 1; i < pts.length; i++) length += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
  return freeze({ id, points: freeze(pts), depth, half, length,
    box: freeze({ minX: Math.min(...pts.map(p => p.x)) - half, maxX: Math.max(...pts.map(p => p.x)) + half, minZ: Math.min(...pts.map(p => p.z)) - half, maxZ: Math.max(...pts.map(p => p.z)) + half }) });
};
export const ALEZHOR_FOLDS = freeze([
  fold('centre-fold', [[-4206, 792], [-4211, 832], [-4224, 878], [-4244, 917]], 1.7, 24),
  fold('west-fold', [[-4421, 858], [-4412, 902], [-4404, 952], [-4401, 998]], 1.4, 22),
  fold('south-fold', [[-3708, 884], [-3752, 940], [-3803, 1000], [-3841, 1034]], 2.2, 26),
  fold('far-south-fold', [[-3626, 1047], [-3688, 1083], [-3748, 1110], [-3794, 1123]], 2, 24),
]);
/** Where a point lies against a fold: its depth there (0 off it) and how far down it, 0 to 1. */
export function foldAt(x, z) {
  let best = { cut: 0, fold: null, t: 0 };
  for (const f of ALEZHOR_FOLDS) {
    if (x < f.box.minX || x > f.box.maxX || z < f.box.minZ || z > f.box.maxZ) continue;
    let near = Infinity, along = 0, run = 0;
    for (let i = 1; i < f.points.length; i++) {
      const a = f.points[i - 1], b = f.points[i], l = Math.hypot(b.x - a.x, b.z - a.z), p = segment(x, z, a, b);
      if (p.distance < near) { near = p.distance; along = run + p.t * l; }
      run += l;
    }
    if (near >= f.half) continue;
    const t = along / f.length, envelope = smooth(0, .18, t) * (1 - smooth(.9, 1.02, t) * .5);
    const cut = f.depth * bell(near / f.half) * envelope;
    if (cut > best.cut) best = { cut, fold: f, t };
  }
  return best;
}

/**
 * **The coves**: two pocket beaches under the south's cliffs, at the notches where the coast steps east between
 * rows 117 and 118 and between 118 and 119 - each a strand between cliffs, at the foot of a fold. `x`, `z` is the
 * notch and `inland` the way into the land; `floor` the level of the cove's back, `r` how far the bowl reaches inland,
 * `wall` the width of the wall behind it, and `beach` the strand's reach along the shore either side.
 */
const notch = (q1, r1, q2, r2, qs, rs) => {
  const a = hexCentre(q1, r1), b = hexCentre(q2, r2), s = hexCentre(qs, rs), v = point((a.x + b.x + s.x) / 3, (a.z + b.z + s.z) / 3);
  const n = Math.hypot(v.x - s.x, v.z - s.z);
  return { x: v.x, z: v.z, inland: point((v.x - s.x) / n, (v.z - s.z) / n) };
};
const cove = (id, name, hexes, spec) => freeze({ id, name, ...notch(...hexes), ...spec });
export const ALEZHOR_COVES = freeze([
  cove('north-cove', 'The north cove', [-30, 117, -30, 118, -31, 118], { floor: 1.7, r: 17, wall: 8, beach: 15, phase: .9 }),
  cove('south-cove', 'The south cove', [-30, 118, -30, 119, -31, 119], { floor: 1.8, r: 16, wall: 8, beach: 14, phase: 2.4 }),
]);
function coveReach(c, x, z) {
  const dx = x - c.x, dz = z - c.z, along = dx * c.inland.x + dz * c.inland.z, across = -dx * c.inland.z + dz * c.inland.x;
  // Longer along the shore than into the land: a pocket beach, not a crater.
  const theta = Math.atan2(across / 1.6, along), r = c.r * (1 + .25 * Math.cos(theta)) * (1 + .08 * wobble(theta * 2.5, c.phase, 1, c.phase));
  return { r: Math.hypot(along, across / 1.6), edge: r, along };
}
function coveBowl(x, z, h) {
  for (const c of ALEZHOR_COVES) {
    if (Math.abs(x - c.x) > 50 || Math.abs(z - c.z) > 50) continue;
    const at = coveReach(c, x, z);
    if (at.r >= at.edge + c.wall) continue;
    const floor = c.floor + .06 * Math.max(0, at.along);
    h = mix(Math.min(h, floor), h, smooth(at.edge, at.edge + c.wall, at.r));
  }
  return h;
}

/**
 * **The dunes**: the west lobe's open-ocean shore is a beach, and behind it a line of low dunes of the lore's "coastal
 * scrub and dune grass" - a hummocky ridge a metre and a half to two and a half high, laid along a line of its own
 * rather than along the coast field (whose shoreline keeps the atlas's hex teeth), so it stands twenty to thirty-five
 * metres back from the water at the teeth and closer at the notches, from east of the west mouth's flat to the
 * bay's mouth.
 */
export const ALEZHOR_DUNES = freeze({ fromX: -4512, toX: -4322, z: 1003, half: 9, height: 1.9 });
const duneLine = x => ALEZHOR_DUNES.z + 3 * Math.sin(x / 37 + .8) + 1.5 * Math.sin(x / 17 - .4);
export function duneLift(x, z, d = landDistance(x, z)) {
  const D = ALEZHOR_DUNES;
  if (x < D.fromX - 20 || x > D.toX + 20 || Math.abs(z - D.z) > D.half + 6 || d < 5) return 0;
  const zone = smooth(D.fromX - 20, D.fromX + 8, x) * (1 - smooth(D.toX - 8, D.toX + 20, x)) * smooth(5, 12, d);
  const hummock = 1 + .3 * Math.sin(x / 13 + z / 31) + .2 * Math.sin(x / 7.3 - z / 11 + 1.3);
  return D.height * hummock * bell(Math.abs(z - duneLine(x)) / D.half) * zone;
}

// ---------------------------------------------------------------------------
// The design: the country's own ground, before any border
// ---------------------------------------------------------------------------
/** The top of the land at a point: the plain, its swells, the folds, the forest's foot and the kept flats, before the coast. */
function landTop(x, z, d, before) {
  const keep = keptShare(x, z);
  const calm = smooth(10, 45, d) * (1 - keep);
  let h = uplandLevel(x, z) + alezhorSwell(x, z) * calm - foldAt(x, z).cut + duneLift(x, z, d);
  const foot = forestFoot(x, z, before);
  if (foot) h = mix(h, foot.level, footShare(foot.distance));
  return coveBowl(x, z, keepLevel(x, z, h));
}
/**
 * Alezhor's own ground at a point on it, with the coast let down to the water and the banks and gorge walls laid:
 * no seam, nothing handed, and no channel yet (`alezhorChannels` cuts those last).
 */
export function alezhorDesign(x, z, d = landDistance(x, z), before = null, shore = before ? before(x, z) : beachAt(d)) {
  const ground = coastProfile(d, landTop(x, z, d, before), cliffShare(x, z), strandWidth(x, z), shore);
  return goldWalls(x, z, waterBank(x, z, ground));
}
/** The channels, cut last into whatever ground the rest laid: the gold reach and its estuary, the west stream, and the Alezhor Water held to its bank. */
export function alezhorChannels(x, z, ground) {
  return waterHold(x, z, westChannel(x, z, goldChannel(x, z, ground)));
}

// ---------------------------------------------------------------------------
// The borders: the handed ground made seamless, and met to the far side
// ---------------------------------------------------------------------------
/**
 * The ground handed to Alezhor, laid on the hex blend that has no seams (`seamlessTerrainMix`): the world's blend
 * steps by up to a metre and a half at the hex corners round here, and within a feather that would show along
 * Alezhor's own hex edges where they run in from a border.
 */
function seamlessHanded(x, z, handed, d) {
  const seamless = seamlessTerrainMix(x, z), mixed = terrainMix(x, z);
  return handed + smooth(2, 40, d) * (seamless.base + relief(x, z, seamless.amp, seamless.wave) - mixed.base - relief(x, z, mixed.amp, mixed.wave));
}
/** The ground before the seam is met: the design, given way to the handed ground within each border's feather. */
function preSeam(x, z, incoming, before, d = landDistance(x, z)) {
  const w = borderWeight(x, z);
  const handed = w < 1 ? seamlessHanded(x, z, incoming, d) : incoming;
  return w > 0 ? mix(handed, alezhorDesign(x, z, d, before, incoming), w) : handed;
}
/** How much of a point is Alezhor's to write at all: 0 on the forest river's own last samples (`IBENWOOD_KEEP`). */
const keepWeight = (x, z) => smooth(IBENWOOD_KEEP.inner, IBENWOOD_KEEP.outer, ibenwoodKeepDistance(x, z));
/**
 * How the borders are met: Celder's method (`celderSeamMove`, src/content/regions/south-celder/south-celder-world.js). The step from this side to
 * the far one is read every half metre along every land line, and a point is moved by the step on its nearest lines
 * averaged over as many metres either way as the point stands in from the line, letting go over `reach`. At the line
 * the move is the step itself; the far side is never moved, built or unbuilt.
 */
export const ALEZHOR_SEAM = freeze({ reach: 40, probe: .05, step: .5, widen: 1, exact: 1 });
let SEAM = null;
/** Every land line, its steps read the first time a point comes within reach of it - edge by edge, never all at once. */
function seamLines() { return (SEAM ??= ALEZHOR_LINES.map(e => ({ ...e, count: 0 }))); }
function nearSide(line, s) {
  const x = line.a.x + (line.b.x - line.a.x) * s / line.length, z = line.a.z + (line.b.z - line.a.z) * s / line.length;
  return [x, z, x - line.nx * ALEZHOR_SEAM.probe, z - line.nz * ALEZHOR_SEAM.probe];
}
function stepAt(line, s, before) {
  const [x, z, ix, iz] = nearSide(line, s), d = landDistance(ix, iz);
  if (d <= 0) return 0;
  const handed = before(ix, iz), k = keepWeight(ix, iz);
  return before(x + line.nx * ALEZHOR_SEAM.probe, z + line.nz * ALEZHOR_SEAM.probe) - (k > 0 ? mix(handed, preSeam(ix, iz, handed, before, d), k) : handed);
}
function seamTable(line, before) {
  if (line.count) return line;
  const count = Math.max(1, Math.ceil(line.length / ALEZHOR_SEAM.step)), steps = new Float64Array(count + 1);
  for (let i = 0; i <= count; i++) steps[i] = stepAt(line, Math.max(.1, Math.min(line.length - .1, line.length * i / count)), before);
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
/** How far the ground at a point is moved to meet the far side of the nearest borders. */
export function alezhorSeamMove(x, z, before) {
  if (!before) return 0;
  const S = ALEZHOR_SEAM, reach = S.reach;
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
    total += w; sum += w * stepNear(seamTable(line, before), p.t * line.length, p.distance * S.widen);
  }
  const move = sum / total * (1 - smooth(0, reach, near));
  if (near >= S.exact) return move;
  // Within a metre of the line the step is read where the point stands rather than off the samples.
  const [line, p] = nearest, s = clamp(p.t * line.length, .1, line.length - .1);
  return mix(stepAt(line, s, before), move, smooth(0, S.exact, near));
}

// ---------------------------------------------------------------------------
// The ground
// ---------------------------------------------------------------------------
/**
 * The ground. `incoming` is the ground every other layer laid; `before(x, z)` answers the ground without Alezhor's
 * layer, for meeting the borders and reading the forest's level at the tree line. Writes only on Alezhor's own land -
 * its hexes and the few metres of its own shore past them - and answers `incoming` everywhere else, the sea
 * included, so the waterline is where the coast field puts it.
 */
export function alezhorGround(x, z, incoming, before) {
  if (!alezhorWrites(x, z)) return incoming;
  const d = landDistance(x, z);
  // At sea nothing is Alezhor's to write but the two mouths, which are cut through the shared shore.
  if (d <= 0) return westMouth(x, z, goldMouth(x, z, incoming));
  const k = keepWeight(x, z);
  if (k <= 0) return incoming;
  // The seam lets go over the last metres to the water, where both sides come down to the shore every region shares.
  const ground = alezhorChannels(x, z, preSeam(x, z, incoming, before, d) + alezhorSeamMove(x, z, before) * smooth(0, 1.5, d));
  return k < 1 ? mix(incoming, ground, k) : ground;
}

// ---------------------------------------------------------------------------
// What covers the ground, and its colour
// ---------------------------------------------------------------------------
/**
 * The colours the ground is drawn in: the cool Mediterranean grass of the plain, greener on the open west and over
 * the bay and tawnier on the tilted south toward Navarth's desert, drier on the swells' crests and greener in their
 * hollows; the shadowed ground of the forest's foot and of the folds where the woods stand; the river banks' lush
 * green; the kept flats' meadow; the washed gravel of the ford, the bars and the gorge's floor; the estuary's mud; the
 * dunes' pale sand-grass; and the dark rock of the gorge walls and the cliffs.
 */
export const ALEZHOR_GROUND = freeze({
  plain: 0x8d9c64, green: 0x84a05e, tawny: 0xa4a36b, crest: 0x9ba667, hollow: 0x7e985a, foot: 0x6d8a52, fold: 0x5f7e4a,
  bank: 0x6c9a57, flat: 0x8aa463, gravel: 0x9d978a, mud: 0x7e7d66, dune: 0xbab184, rock: 0x77716a, stone: 0x857d70,
});
const rgb = c => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
const mixColour = (a, b, t) => { const p = rgb(a), q = rgb(b), k = clamp(t, 0, 1); return (Math.round(mix(p[0], q[0], k)) << 16) | (Math.round(mix(p[1], q[1], k)) << 8) | Math.round(mix(p[2], q[2], k)); };
const swatchNumber = ground => (typeof ground === 'string' && /^#[0-9a-f]{6}$/i.test(ground) ? parseInt(ground.slice(1), 16) : null);

/**
 * What covers the ground at a point, each 0 to 1, for the colour, the scatter and the tests alike:
 * - `slope`: the design's own, rise over run (the channels and the borders' last metres aside);
 * - `height`: the design's level, 0 at the water to 1 at thirty metres;
 * - `edge`: the forest's edge habitat - 1 at the tree line, 0 thirty metres out ("the light changes within twenty
 *   feet of the tree line"); `foot`: the rise to the forest, 1 at the line and 0 past `ALEZHOR_FOOT.reach`;
 * - `fold`: the folds' hollows, where the strip's own woods stand; `swell`: -1 in a hollow to 1 on a crest;
 * - `dry`: the tawny south, toward Navarth's desert; `kept`: the river-mouth flats, kept open;
 * - `water`: in Alezhor's own running water; `bank`: the banks of the gold river, the west stream and the
 *   Alezhor Water, within a few metres of their water; `gravel`: washed gravel - the ford, the estuary's bars, the
 *   gorge's floor and the stream's mouth; `estuary`: the estuary's margins and mud; `gorge`: the gold river's rock
 *   walls round the falls;
 * - `strand`: a beach (the bay, the west lobe, the coves); `cliff`: a cliff's top and face; `dune`: the dunes.
 */
export function alezhorCover(x, z) {
  const before = groundBeforeAlezhor, d = landDistance(x, z), e = 1.5;
  const H = (px, pz) => alezhorDesign(px, pz, landDistance(px, pz), before);
  const h = H(x, z), slope = Math.hypot(H(x + e, z) - H(x - e, z), H(x, z + e) - H(x, z - e)) / (2 * e);
  const foot = forestFoot(x, z, before), river = alezhorRiverAt(x, z, 30), water = alezhorWaterNear(x, z, 20);
  let bank = 0, gravel = 0, estuary = 0, gorge = 0, wet = false;
  if (river) {
    const edgeOut = river.distance - river.half;
    wet = river.water;
    if (river.estuary) {
      estuary = 1 - smooth(4, 14, edgeOut);
      gravel = Math.max(gravel, (1 - smooth(1.5, 5.5, edgeOut)) * smooth(-1, .5, edgeOut));
    } else {
      bank = 1 - smooth(1, 6, edgeOut);
      if (river.river === GOLD_REACH_SPEC.id) {
        const F = GOLD_REACH_SPEC.ford;
        const ford = smooth(F.from - 3, F.from, river.along) * (1 - smooth(F.to + 2, F.to + 6, river.along));
        gravel = Math.max(gravel, ford * (1 - smooth(1, 4, edgeOut)), (1 - smooth(-.5, .6, edgeOut)) * .7);
        gorge = smooth(8, 12, river.along) * (1 - smooth(36, 42, river.along)) * (1 - smooth(GOLD_GORGE.shelf, GOLD_GORGE.shelf + 6, river.distance));
      } else gravel = Math.max(gravel, (1 - smooth(-.3, .5, edgeOut)) * .5 * smooth(100, 170, river.along));
    }
  }
  if (water && water.distance < water.half + 8) bank = Math.max(bank, 1 - smooth(water.half + 1, water.half + 7, water.distance));
  const cliff = cliffShare(x, z), cell = hexAt(x, z);
  return {
    slope, height: clamp(h / 30, 0, 1),
    edge: 1 - smooth(0, 30, treeLineDistance(x, z, 31)),
    foot: foot ? footShare(foot.distance) : 0,
    fold: clamp(foldAt(x, z).cut / 1.6, 0, 1),
    swell: clamp(alezhorSwell(x, z) / 1.2, -1, 1),
    dry: clamp(smooth(-3880, -3620, x) * smooth(880, 1000, z) + (cell.q >= -29 ? .15 : 0), 0, 1),
    kept: keptShare(x, z),
    water: wet ? 1 : 0, bank, gravel, estuary, gorge,
    strand: (1 - cliff) * (1 - smooth(6, 30, d)) * (d > 0 ? 1 : 0),
    cliff: cliff * (1 - smooth(4, 14, d)),
    dune: clamp(duneLift(x, z, d) / 1.8, 0, 1),
  };
}
function ownColour(x, z) {
  const c = alezhorCover(x, z), g = ALEZHOR_GROUND;
  let colour = mixColour(g.green, g.tawny, c.dry * .85);
  colour = c.swell > 0 ? mixColour(colour, g.crest, smooth(.2, .9, c.swell) * .55) : mixColour(colour, g.hollow, smooth(.2, .9, -c.swell) * .55);
  colour = mixColour(colour, g.foot, c.foot * .6 + c.edge * .25);
  colour = mixColour(colour, g.fold, smooth(.1, .7, c.fold) * .8);
  colour = mixColour(colour, g.flat, c.kept * .7);
  colour = mixColour(colour, g.bank, c.bank * .75);
  colour = mixColour(colour, g.dune, c.dune * .85);
  colour = mixColour(colour, g.mud, c.estuary * .6);
  colour = mixColour(colour, g.rock, Math.max(c.gorge * .85, smooth(.75, 1.4, c.slope) * .7));
  return mixColour(colour, g.gravel, c.gravel * .85);
}
let lastTint = { x: NaN, z: NaN, colour: 0 };
/**
 * Alezhor's row in the ground-tint table (`GROUND_TINTS`, src/world/terrain/world-terrain.js), as 0xRRGGBB, or null off its own
 * ground. Over the last twelve metres before every land border the colour fades back into the swatch it was given,
 * so nothing changes colour at a line.
 */
export function alezhorTint(x, z, ground = null) {
  if (!alezhorWrites(x, z)) return null;
  // The tint table asks once for every swatch in the blend at a point: the cover is worked out once.
  const colour = lastTint.x === x && lastTint.z === z ? lastTint.colour : (lastTint = { x, z, colour: ownColour(x, z) }).colour;
  const edge = nearestLine(x, z, ALEZHOR_LINES, 13).distance, swatch = swatchNumber(ground);
  return edge < 12 && swatch !== null ? mixColour(swatch, colour, smooth(0, 12, edge)) : colour;
}
/**
 * The shore's colour, for the shore stage of the terrain's tint (`SHORE_TINTS`, src/world/terrain/world-terrain.js), in East Izol's
 * shape: `sand` is how much of the world's sand tint to keep, `rock` how much of the face is bare stone, and `stone`
 * its colour. The south's cliffs are stone from under the water to a rim a few metres back; the gold estuary's banks
 * are its gravel; the strands keep the world's own sand. Nothing within twenty metres of a land border.
 */
export function alezhorShoreTint(x, z, d) {
  if (!inBox(x, z) || d < -30 || d > 16 || !alezhorWrites(x, z)) return null;
  if (nearestLine(x, z, ALEZHOR_LINES, 21).distance < 20) return null;
  const cliff = cliffShare(x, z), river = alezhorRiverAt(x, z, 30);
  const bar = river?.estuary ? 1 - smooth(5, 9, river.distance - river.half) : 0;
  if (cliff <= 0 && bar <= 0) return null;
  if (bar > cliff) return { sand: 1, rock: bar * .7 * (1 - smooth(6, 14, d)), stone: ALEZHOR_GROUND.gravel };
  const own = lastTint.x === x && lastTint.z === z ? lastTint.colour : ownColour(x, z);
  return { sand: 1 - cliff, rock: cliff, stone: mixColour(ALEZHOR_GROUND.stone, own, smooth(4.5, 9, d)) };
}

// ---------------------------------------------------------------------------
// The country's own exports
// ---------------------------------------------------------------------------
/** Where the developer's travel tool sets a traveler down: open grass on the plain over the head of the bay. */
export const ALEZHOR_ARRIVAL = point(-4100, 870);
/**
 * The places kept for what belongs to somebody, for the scenery to leave alone: the two river-mouth flats, as boxes
 * `{ id, name, x, z, halfX, halfZ, yaw }` (`yaw` 0: their sides run with the world's axes).
 */
export const ALEZHOR_RESERVED = freeze(ALEZHOR_KEPT.map(k => freeze({ id: k.id, name: k.name, x: k.x, z: k.z, halfX: k.halfX + k.wander, halfZ: k.halfZ + k.wander, yaw: 0 })));
const place = (id, name, x, z, radius, description) => freeze({ id, name, region: REGION_IDS[ALEZHOR], x, z, radius, description });
/** Places for the chart: natural places only, named in plain words - no city, harbour or working is named. */
export const ALEZHOR_LANDMARKS = freeze([
  place('alezhor-gold-falls', 'The falls of the gold river', -3942, 885, 22,
    'Where the gold river leaves the forest it drops thirteen metres to the sea in three falls and three pools between walls of dark rock, and spreads over a gravel ford at their foot.'),
  place('alezhor-gold-estuary', "The gold river's estuary", -3935, 921, 24,
    'A short estuary at the head of the bay, where the gold river runs out over gravel bars into the sea between the gorge and the first of the southern cliffs.'),
  place('alezhor-gold-flat', "The flat at the gold river's mouth", -4040, 906, 40,
    "Level grass at the head of the bay, west of the gold river's mouth, between the gorge's west wall and the strand: the widest open ground at any river mouth on this coast."),
  place('alezhor-bay-head', 'The head of the bay', -4185, 912, 40,
    "A sheltered strand of sand at the head of the bay between the west lobe and the cliffed south, with the forest's dark line a long stone's throw behind the grass."),
  place('alezhor-tree-line', 'The tree line', -4205, 800, 36,
    'Where the coastal plain ends and the Ibenwood begins: the ground rises, the grass gives way to the forest edge, and within twenty feet of the first trees the light changes.'),
  place('alezhor-west-mouth', "The west stream's mouth", -4566, 980, 30,
    "The strip's north-western corner, where the west stream comes out from under South Ibenal's rise onto an open-ocean beach, with level ground behind it."),
  place('alezhor-dunes', 'The western dunes', -4420, 1000, 40,
    'A line of low dunes of sand and dune grass behind the open-ocean beach of the west lobe, between the west mouth and the mouth of the bay.'),
  place('alezhor-southern-cliffs', 'The southern cliffs', -3815, 1075, 40,
    'The narrow south: tawny grass tilting down from the Alezhor Water to a line of cliffs over the open sea, broken by two pocket coves at the foot of their folds.'),
  place('alezhor-water-bank', 'The bank of the Alezhor Water', -3572, 1060, 34,
    "A level bank of grass at the water's own height along the small river down the strip's eastern edge, with Navarth's dry rim rising beyond the water."),
  place('alezhor-gulf-head', 'The head of the gulf', -3735, 1165, 30,
    "The strip's southern point, where the Alezhor Water comes down off Navarth's rim to its last reach and the coast turns south along the Ganesh."),
]);
/** Walked routes kept clear of scenery: the ways the ground gives, not roads. */
const trail = (id, width, points) => freeze({ id, width, points: freeze(points.map(([x, z]) => point(x, z))) });
export const ALEZHOR_TRAILS = freeze([
  // The length of the strip: from the west mouth's flat along the bay's head to the gold river, over its ford below
  // the falls, up the estuary's east bank onto the south and along it to the head of the gulf. The principal journey.
  trail('alezhor-the-length', 4, [[-4560, 990], [-4500, 968], [-4440, 948], [-4380, 925], [-4310, 900], [-4240, 893], [-4160, 893], [-4090, 893],
    [-4015, 897], [-3972, 903], [-3953, 905], [-3947, 906.5], [-3942.5, 911.5], [-3937, 915], [-3932, 918.5], [-3926, 922], [-3918, 925], [-3908, 927], [-3888, 936], [-3862, 955],
    [-3835, 975], [-3800, 1000], [-3765, 1040], [-3735, 1085], [-3722, 1125], [-3730, 1160]]),
  // Up the middle fold from the bay's head to the tree line.
  trail('alezhor-to-the-trees', 3, [[-4200, 900], [-4214, 868], [-4214, 832], [-4208, 790]]),
  // From the gold river's flat up beside the gorge to the rim over its head pool, where the forest's river comes out.
  trail('alezhor-falls-rim', 3, [[-3990, 900], [-3984, 890], [-3978, 878], [-3972, 870]]),
  // Along the Alezhor Water's bank from the south's north-eastern corner to the head of the gulf.
  trail('alezhor-water-bank', 3, [[-3514, 966], [-3517, 1002], [-3537, 1024], [-3557, 1047], [-3562, 1079], [-3578, 1102], [-3604, 1127], [-3613, 1160],
    [-3628, 1182], [-3650, 1192], [-3680, 1182], [-3712, 1176], [-3730, 1160]]),
]);
/**
 * Review views: high ones over the country, and walker's ones with the eye 1.8 m over the ground at its own place
 * (`walk: true`; the heights are the ground's, written out). The wildlife view frames the gold river's estuary, where
 * the water birds are.
 */
const view = (eye, target, walk = false) => freeze({ eye: freeze({ x: eye[0], z: eye[1], y: eye[2] }), target: freeze({ x: target[0], z: target[1], y: target[2] }), ...(walk ? { walk: true } : {}) });
export const ALEZHOR_VIEWS = freeze({
  // Over the whole strip from the open sea south-west of the bay.
  'alezhor': view([-4180, 1170, 170], [-4040, 925, 8]),
  // From the ford, looking straight up the gorge at the falls (an eye on the flat had the gorge's west rim in the way).
  'alezhor-gold-falls': view([-3954, 909, 2.35], [-3957, 878, 10.5], true),
  // The estuary and the flat beside it, from the bay.
  'alezhor-gold-estuary': view([-3985, 990, 14], [-3952, 915, 1.5]),
  // At the head of the bay, looking east along the strand to the gold river's mouth and the southern cliffs.
  'alezhor-bay-head': view([-4250, 912, 5.55], [-3905, 975, 6], true),
  // On the plain at the forest's foot, looking north into the trees.
  'alezhor-tree-line': view([-4185, 838, 9.49], [-4175, 745, 21], true),
  // On the west mouth's flat, looking at the stream's mouth and South Ibenal's rise beyond it.
  'alezhor-west-mouth': view([-4586, 962, 5.6740766], [-4560.5625, 940.7625, 2.7792836], true),
  // The dunes behind the western beach, from the sea.
  'alezhor-dunes': view([-4430, 1095, 22], [-4420, 1004, 3]),
  // The southern cliffs and the north cove, from the sea.
  'alezhor-southern-cliffs': view([-3975, 1115, 32], [-3835, 1060, 8]),
  // On the Alezhor Water's bank, looking south along the water with Navarth's rim on the left.
  'alezhor-water-bank': view([-3536, 1012, 28.49], [-3585, 1120, 26], true),
  // Low over the gold river's estuary from the bay: the water birds on its mouth and bars, the ford and the falls behind.
  'alezhor-wildlife': view([-3990, 968, 8], [-3948, 922, 1.2]),
});
