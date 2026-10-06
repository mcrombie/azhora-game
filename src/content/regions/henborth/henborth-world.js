/**
 * Henborth: terrain and climate only (src/content/regions/henborth/henborth-scenery.js and src/content/regions/henborth/henborth-wildlife.js carry what grows and what
 * lives here). Nothing here belongs to anybody: no pass road, marker, cairn or keeper's shelter, no summer camp, fold
 * or herd, and nobody gathering in the bogs. The three ways up to the passes are left as the ground gives them.
 *
 * Pure: no three, no DOM. `src/world/terrain/world-terrain.js` lays the ground (`henborthGround`, the outermost layer) and colours it
 * (`henborthTint`); the scenery, the wildlife, the chart and the tests read the same numbers (`henborthCover`,
 * `henborthDamp`, `HENBORTH_HOLLOWS`, `HENBORTH_KNOLLS`, `HENBORTH_APPROACHES`, `HENBORTH_RESERVED`).
 *
 * **What the atlas gives** (the authority): twenty-seven hexes of plains, all `Dfa`, rows 83-89, a band nine hundred
 * metres long and three to four hundred wide running from North Celder's north-western corner to the Acor Wetlands.
 * Low country on one side: North Celder on eight edges, West Mithala on eight and North Mithala on six, the Acor
 * Wetlands on two at the north-eastern tip. Mountains on the other: the North Oremindi on six edges, the Lesser
 * Oremindi on six, Narcosh's highland and mountain hexes on nine, and the East Oremindi on one at the south-western
 * corner. No river edge: the Mithala's West Arm and cross braid rise at the band's two south-eastern corners.
 *
 * **What the lore gives** (`world-builder/azhora_lore/geography/regions/henborth.md`): "transition country", the ground
 * between the settled plain and the mountains, where "the soil thins, the drainage becomes less reliable" and pasture
 * becomes "thin rough pasture", then scrub; "elevated ... not dramatically so"; "no cliff, no ridge, no sharp
 * geological feature"; the northern bog cranberry and the herbs of cold, thin ground; and three passes northward -
 * Henborth Main in the middle, the most reliable, the Eastern Cold, lower and facing the weather, which "holds snow in
 * the gullies", and Vel-Henboth, the westernmost, whose course nobody writes down.
 *
 * **The shape, in one paragraph.** A plain that stands at the Mithala's own level along the Mithala's lines and rises
 * gently toward the mountains (`HENBORTH_PLAIN`): about two and a half metres over three hundred, with long low swells and, under
 * the Oremindi, a scatter of low rounded foothill knolls. Three firmer, slightly raised ways run up to the mountain foot
 * where the passes are (`HENBORTH_APPROACHES`): the central one broad and plain, the eastern one cut into by short
 * gullies down its flanks, the western one narrow and easy to miss. Between and below them the drainage is poor and
 * the ground holds water in shallow closed hollows with flat, wet floors (`HENBORTH_HOLLOWS`): the bogs and the herb
 * ground. A few dry knolls of thin, stony soil stand out of the pasture (`HENBORTH_KNOLLS`).
 *
 * **The borders** are met by Celder's method (`celderSeamMove`, src/content/regions/south-celder/south-celder-world.js), read edge by edge: along every
 * line the step to the ground that must be met is read every half metre, and a point is moved by the step averaged over
 * as many metres either way as it stands in from the line, letting go over the line's reach. The Mithala's ground and the
 * unbuilt mountains' are met where they stand, and never moved. **North Celder's eight edges are the exception, and
 * exactly one side meets the other there**: North Celder's seam reads this country live and meets it, so Henborth makes
 * no move at those lines and holds them exactly as handed - within `hold` of the line it answers the ground it was handed,
 * and its plain comes down to that ground over the line's reach. North Celder's ground is therefore exactly as North
 * Celder delivered it, whichever of the two is asked first.
 */
import { regionAt, hexOwnerAt, hexAt, REGION_CELLS, REGION_OUTLINES, REGION_IDS } from '../../../world/terrain/region-world.js';
// The ground without this country's layer, for meeting its lines. A cycle with src/world/terrain/world-terrain.js, as the Ibenals' and
// Alezhor's are: nothing here calls it while a module loads.
import { groundBeforeHenborth } from '../../../world/terrain/world-terrain.js';

const freeze = Object.freeze, point = (x, z) => freeze({ x, z });
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const segment = (x, z, a, b) => {
  const dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz, t = l2 ? clamp(((x - a.x) * dx + (z - a.z) * dz) / l2, 0, 1) : 0;
  return { distance: Math.hypot(x - a.x - dx * t, z - a.z - dz * t), t };
};
const segment2 = (x, z, a, b) => {
  const dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz, t = l2 ? clamp(((x - a.x) * dx + (z - a.z) * dz) / l2, 0, 1) : 0;
  const ex = x - a.x - dx * t, ez = z - a.z - dz * t;
  return ex * ex + ez * ez;
};

export const HENBORTH = 'Henborth';
export const HENBORTH_CELLS = freeze(REGION_CELLS[HENBORTH] ?? []);
/**
 * The climate per hex, off the World Builder map: `Dfa` on all twenty-seven, the hot-summer continental climate of the
 * Celder and the Mithala beside it. The sky stays the world's default, as theirs does.
 */
export const HENBORTH_KOPPEN = 'Dfa';
export const HENBORTH_CLIMATE = freeze(Object.fromEntries(HENBORTH_CELLS.map(c => [`${c.q},${c.r}`, HENBORTH_KOPPEN])));
/** The hexes with ninety metres round them: nothing in this file is asked about outside it. */
export const HENBORTH_BOX = freeze({
  minX: Math.min(...HENBORTH_CELLS.map(c => c.x)) - 90, maxX: Math.max(...HENBORTH_CELLS.map(c => c.x)) + 90,
  minZ: Math.min(...HENBORTH_CELLS.map(c => c.z)) - 90, maxZ: Math.max(...HENBORTH_CELLS.map(c => c.z)) + 90,
});
const inBox = (x, z) => x > HENBORTH_BOX.minX && x < HENBORTH_BOX.maxX && z > HENBORTH_BOX.minZ && z < HENBORTH_BOX.maxZ;
/** Whether a point is on Henborth's own ground, as the traveler is told it. */
export function henborthOwns(x, z) { return regionAt(x, z)?.name === HENBORTH; }
/** Whether this country writes the ground at a point: on its own hexes, and nowhere else. */
export function henborthWrites(x, z) { return inBox(x, z) && hexOwnerAt(x, z) === HENBORTH; }

// ---------------------------------------------------------------------------
// The lines
// ---------------------------------------------------------------------------
/**
 * The unbuilt countries round the band, by the atlas hex across each line (`assets/azhora-dev-regions.json`): the
 * world has no name for them yet (`hexOwnerAt` calls their ground open country), so the atlas's own are written here.
 */
export const HENBORTH_UNBUILT = freeze({
  '-6,89': 'East Oremindi Mountains',
  '-5,88': 'North Oreminidi Mountains', '-4,87': 'North Oreminidi Mountains', '-3,86': 'North Oreminidi Mountains',
  '-2,85': 'Lesser Oremindi Mountains', '-1,85': 'Lesser Oremindi Mountains', '0,84': 'Lesser Oremindi Mountains',
  '1,83': 'Narcosh', '2,83': 'Narcosh', '3,83': 'Narcosh', '4,82': 'Narcosh', '5,82': 'Narcosh',
  '6,82': 'Acor Wetlands', '6,83': 'Acor Wetlands',
});
const KIND = freeze({ 'North Celder': 'celder', 'West Mithala': 'mithala', 'North Mithala': 'mithala', 'Acor Wetlands': 'wetland',
  'East Oremindi Mountains': 'mountain', 'North Oreminidi Mountains': 'mountain', 'Lesser Oremindi Mountains': 'mountain', Narcosh: 'mountain' });
/**
 * Every hex edge of the outline, with its outward normal, what lies across it and what kind of line it is: `celder`
 * (held as handed: North Celder meets it), `mithala` (the Mithala's ground, met), `mountain` (the unbuilt Oremindi and
 * Narcosh, met as they stand) or `wetland` (the unbuilt Acor Wetlands, met as they stand).
 */
export const HENBORTH_EDGES = freeze((() => {
  const edges = [];
  for (const loop of REGION_OUTLINES[HENBORTH] ?? []) for (let i = 0; i < loop.length; i++) {
    const a = loop[i], b = loop[(i + 1) % loop.length], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
    let nx = dz / length, nz = -dx / length;
    if (hexOwnerAt(mx + nx, mz + nz) === HENBORTH) { nx = -nx; nz = -nz; }
    let far = hexOwnerAt(mx + nx, mz + nz);
    if (far === 'Open country') { const h = hexAt(mx + nx * 10, mz + nz * 10); far = HENBORTH_UNBUILT[`${h.q},${h.r}`] ?? 'Open country'; }
    edges.push(freeze({ a: point(a.x, a.z), b: point(b.x, b.z), nx, nz, length, far, kind: KIND[far] ?? 'mountain' }));
  }
  return edges;
})());
const LOW_EDGES = HENBORTH_EDGES.filter(e => e.kind === 'mithala' || e.kind === 'wetland');
const HIGH_EDGES = HENBORTH_EDGES.filter(e => e.kind === 'mountain');
const OREMINDI_EDGES = HIGH_EDGES.filter(e => /Oremin/.test(e.far));
const CELDER_EDGES_HERE = HENBORTH_EDGES.filter(e => e.kind === 'celder');
/** Distance to the nearest of a set of edges, or `limit` if none is nearer. */
function edgeDistance(x, z, edges, limit = Infinity) {
  let best = limit;
  for (const e of edges) {
    if (x < Math.min(e.a.x, e.b.x) - best || x > Math.max(e.a.x, e.b.x) + best
      || z < Math.min(e.a.z, e.b.z) - best || z > Math.max(e.a.z, e.b.z) + best) continue;
    best = Math.min(best, segment(x, z, e.a, e.b).distance);
  }
  return best;
}
/** A soft nearest distance to a set of edges (a p-norm over all of them): smooth where the nearest edge changes. */
function softDistance(x, z, edges) {
  let sum = 0;
  for (const e of edges) { const d2 = Math.max(1e-6, segment2(x, z, e.a, e.b)); sum += 1 / (d2 * d2 * d2); }
  return sum ** (-1 / 6);
}
/** Distance to North Celder's line, which this country holds. */
export const celderLineDistance = (x, z, limit = Infinity) => edgeDistance(x, z, CELDER_EDGES_HERE, limit);
/** Distance to the mountains' lines (the Oremindi's and Narcosh's). */
export const mountainLineDistance = (x, z, limit = Infinity) => edgeDistance(x, z, HIGH_EDGES, limit);

// ---------------------------------------------------------------------------
// The plain
// ---------------------------------------------------------------------------
/**
 * The plain's numbers. `low` is its level along the low side, the Mithala's lines and the Acor Wetlands' (the Mithala's
 * plain stands at 14.1 to 16.0 m along them, measured on 4 October 2026; the seam meets it there exactly, live), and it
 * rises by `rise` toward the mountains: "elevated ... not dramatically so". `swell` is the long low rolls, either way.
 * The foothills are rounded knolls under the Oremindi, within `reach` of their lines.
 */
export const HENBORTH_PLAIN = freeze({ low: 14.8, rise: 2.4, swell: 1.05, foothill: freeze({ reach: 230, low: .4, high: 1.3 }) });
/** How far toward the mountains a point stands: 0 on the low side's lines, 1 on the mountains'. */
export function henborthNorthness(x, z) {
  const low = softDistance(x, z, LOW_EDGES), high = softDistance(x, z, HIGH_EDGES);
  return low / (low + high);
}
/** The swells: three long rolls, never quite in step, a metre either way; their long axis runs with the band. */
export function henborthSwell(x, z) {
  const u = x * .8 - z * .6, v = x * .6 + z * .8;
  return .55 * Math.sin(u / 73 + .8) * Math.cos(v / 101 - .5) + .3 * Math.sin(x / 47 + z / 63 + 2.3) + .18 * Math.sin(z / 41 - x / 57 + .4);
}
/** The foothill knolls' pattern, 0 to 1. */
const knollField = (x, z) => .5 + .5 * (Math.sin(x / 23 + z / 37 + .9) * .55 + Math.sin(z / 29 - x / 43 + 2.4) * .45);
/** The foothills: low rounded knolls that grow toward the Oremindi's lines (not Narcosh's highland). */
function foothillRise(x, z) {
  const F = HENBORTH_PLAIN.foothill, f = 1 - smooth(40, F.reach, edgeDistance(x, z, OREMINDI_EDGES, F.reach));
  if (f <= 0) return 0;
  return f * f * (F.low + F.high * knollField(x, z));
}

// ---------------------------------------------------------------------------
// The ways up to the passes
// ---------------------------------------------------------------------------
/**
 * **The approaches**: three ways up to the mountain foot where the lore's three passes leave the plain, each a broad,
 * slightly raised tongue of firmer ground, drier than the pasture either side, rising from its foot on the plain to its
 * head on the line, where the atlas's mountains begin. Natural ground only: no road, no marker, no cairn. `half` is the
 * half-width of the rise, `lift` its height on its crest.
 * - **The main approach** runs up to Narcosh's highland in the middle of the north side (the lore's Henborth Main, "the
 *   central and most reliable"): the broadest and plainest.
 * - **The eastern approach** runs up to the corner of Narcosh's highland and its mountain hex (the Eastern Cold, "lower
 *   ... it holds snow in the gullies longer"): narrower, with short gullies cut down both its flanks.
 * - **The western spur** runs out from the foothills to the Lesser Oremindi between its mountain and its hills
 *   (Vel-Henboth, "the westernmost of the three ... rarely discussed"): narrow and low, easy to walk past.
 * Each head stands where the ground across the line is highest along that stretch. The unbuilt ranges' ground stands
 * lower than this plain's, so for now each way eases down its last few dozen metres to meet it; the lines are read live,
 * and when the ranges are built the ways will climb to whatever ground they are given.
 */
const approach = (id, name, pass, points, spec) => freeze({ id, name, pass, points: freeze(points.map(([x, z]) => point(x, z))), ...spec });
export const HENBORTH_APPROACHES = freeze([
  approach('henborth-main-approach', 'The main approach', 'Henborth Main',
    [[-2318, -1748], [-2333, -1800], [-2350, -1858], [-2362, -1912]], { half: 46, lift: 1.6, gullies: 0 }),
  approach('henborth-eastern-approach', 'The eastern approach', 'the Eastern Cold',
    [[-2166, -1812], [-2177, -1860], [-2190, -1905], [-2200, -1946]], { half: 36, lift: 1.3, gullies: 4 }),
  approach('henborth-western-spur', 'The western spur', 'Vel-Henboth',
    [[-2586, -1648], [-2592, -1690], [-2597, -1730], [-2600, -1761]], { half: 28, lift: .9, gullies: 0 }),
]);
const APPROACH_SHAPES = HENBORTH_APPROACHES.map(a => {
  const segs = [];
  let run = 0;
  for (let i = 1; i < a.points.length; i++) {
    const p = a.points[i - 1], q = a.points[i], length = Math.hypot(q.x - p.x, q.z - p.z);
    segs.push({ a: p, b: q, from: run, length, ux: (q.x - p.x) / length, uz: (q.z - p.z) / length }); run += length;
  }
  const xs = a.points.map(p => p.x), zs = a.points.map(p => p.z), pad = a.half * 2;
  return { ...a, segs, length: run, box: { minX: Math.min(...xs) - pad, maxX: Math.max(...xs) + pad, minZ: Math.min(...zs) - pad, maxZ: Math.max(...zs) + pad } };
});
/** Where a point stands on an approach: distance across its line, how far along from its foot, and which side. */
function approachPlace(shape, x, z) {
  const b = shape.box;
  if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) return null;
  let best = null;
  for (const s of shape.segs) {
    const p = segment(x, z, s.a, s.b);
    if (!best || p.distance < best.across) {
      const side = (x - s.a.x) * s.uz - (z - s.a.z) * s.ux >= 0 ? 1 : -1;
      best = { across: p.distance, along: s.from + p.t * s.length, side };
    }
  }
  return best;
}
/** How much of an approach's rise stands over a point, 0 to 1, and the gully cut there in metres. */
function approachAt(x, z) {
  let share = 0, gully = 0, which = null;
  for (const shape of APPROACH_SHAPES) {
    const p = approachPlace(shape, x, z);
    if (!p) continue;
    const along = smooth(0, shape.length * .5, p.along) * (.75 + .25 * clamp(p.along / shape.length, 0, 1)) * (p.along > shape.length ? 0 : 1);
    const s = along * Math.exp(-((p.across / shape.half) ** 2) * 1.6);
    if (s > share) { share = s; which = shape; }
    if (shape.gullies) {
      // Short gullies down both flanks of the upper half, alternating sides, each a shallow V across the slope.
      for (let k = 0; k < shape.gullies; k++) {
        const at = shape.length * (.42 + .5 * k / shape.gullies), side = k % 2 ? 1 : -1;
        if (p.side !== side) continue;
        const v = 1 - smooth(0, 2.6, Math.abs(p.along - at));
        if (v <= 0) continue;
        const flank = smooth(shape.half * .3, shape.half * .6, p.across) * (1 - smooth(shape.half * 1.15, shape.half * 1.6, p.across));
        gully = Math.max(gully, .45 * v * flank);
      }
    }
  }
  return { share, gully, which };
}

// ---------------------------------------------------------------------------
// The wet ground and the dry
// ---------------------------------------------------------------------------
/**
 * **The damp hollows**: shallow closed hollows with flat, wet floors, where the plain's poor drainage holds the
 * snowmelt into the summer - the lore's bog cranberry ground and the herb ground of cold, thin soil. Terrain only: what
 * grows there is the scenery's, and the gathering is somebody's. `rx`, `rz` are the half-axes of the rim, `yaw` turns
 * them, `depth` is how far the floor lies below the plain's level at the middle.
 */
const hollow = (id, name, x, z, rx, rz, yaw, depth) => freeze({ id, name, x, z, rx, rz, yaw, depth });
export const HENBORTH_HOLLOWS = freeze([
  hollow('henborth-cranberry-bog', 'The cranberry bog', -2380, -1766, 44, 31, .5, 2.2),
  hollow('henborth-sedge-hollow', 'The sedge hollow', -2245, -1790, 44, 32, -.35, 1.5),
  hollow('henborth-wet-corner', 'The wet corner', -2072, -1946, 34, 26, .2, 1.2),
  hollow('henborth-middle-hollow', 'The middle hollow', -2505, -1618, 40, 30, 1, 1.4),
]);
const wobble = (x, z, wave, phase) => Math.sin(x / wave * 1.31 + z / wave * .73 + phase) * .6 + Math.sin(z / wave * 1.9 - x / wave * .41 + phase * 2.3 + 1.1) * .4;
/** A point's place in a hollow: 0 at its middle, 1 on its rim (the rim wanders a little), and beyond. */
function hollowRadius(h, x, z) {
  const dx = x - h.x, dz = z - h.z, c = Math.cos(h.yaw), s = Math.sin(h.yaw);
  const u = (dx * c + dz * s) / h.rx, v = (-dx * s + dz * c) / h.rz;
  return Math.hypot(u, v) * (1 + .12 * wobble(x, z, 17, h.depth * 3));
}
/** How far into a damp hollow a point stands: 1 on its wet floor, 0 at and beyond its rim. */
export function hollowShare(x, z) {
  let best = 0;
  for (const h of HENBORTH_HOLLOWS) {
    if (Math.abs(x - h.x) > Math.max(h.rx, h.rz) * 1.4 || Math.abs(z - h.z) > Math.max(h.rx, h.rz) * 1.4) continue;
    best = Math.max(best, 1 - smooth(.45, 1, hollowRadius(h, x, z)));
  }
  return best;
}
/**
 * **The dry knolls**: low rounded rises of thin, stony, well-drained soil standing out of the pasture, where the
 * lichens and the short turf are. `radius` is the foot of the rise, `rise` its height over the plain.
 */
const knoll = (id, name, x, z, radius, rise) => freeze({ id, name, x, z, radius, rise });
export const HENBORTH_KNOLLS = freeze([
  knoll('henborth-dry-knoll', 'The dry knoll', -2300, -1862, 34, 2.4),
  knoll('henborth-lichen-knoll', 'The lichen knoll', -2640, -1585, 30, 2),
]);
function knollAt(x, z) {
  let rise = 0, share = 0;
  for (const k of HENBORTH_KNOLLS) {
    const d = Math.hypot(x - k.x, z - k.z) / (k.radius * (1 + .1 * wobble(x, z, 13, k.rise)));
    if (d >= 1) continue;
    const b = (1 - d * d) ** 2;
    rise = Math.max(rise, k.rise * b); share = Math.max(share, b);
  }
  return { rise, share };
}

// ---------------------------------------------------------------------------
// The design: the plain's own ground, before any line is met
// ---------------------------------------------------------------------------
/** The plain's level at a point before its hollows: the rise, the swells, the foothills, the approaches and knolls. */
function plainLevel(x, z, t = henborthNorthness(x, z)) {
  const P = HENBORTH_PLAIN;
  const rise = P.low + P.rise * (.4 * t + .6 * smooth(0, 1, t));
  const ap = approachAt(x, z);
  let lift = 0;
  if (ap.which) lift = ap.which.lift * ap.share;
  return rise + henborthSwell(x, z) * P.swell * (.65 + .45 * t) + foothillRise(x, z) + lift - ap.gully + knollAt(x, z).rise;
}
/**
 * The plain's own ground at a point: its level with the hollows let into it, each with a flat floor `depth` below the
 * plain at its middle, so the water it holds lies level whatever the plain does around it. No line met, nothing handed.
 */
export function henborthDesign(x, z) {
  let h = plainLevel(x, z);
  for (const o of HENBORTH_HOLLOWS) {
    if (Math.abs(x - o.x) > Math.max(o.rx, o.rz) * 1.4 || Math.abs(z - o.z) > Math.max(o.rx, o.rz) * 1.4) continue;
    const r = hollowRadius(o, x, z);
    if (r >= 1) continue;
    h = mix(h, Math.min(h, floorLevel(o)), 1 - smooth(.45, 1, r));
  }
  return h;
}
const FLOORS = new Map();
function floorLevel(o) {
  if (!FLOORS.has(o.id)) FLOORS.set(o.id, plainLevel(o.x, o.z) - o.depth);
  return FLOORS.get(o.id);
}

// ---------------------------------------------------------------------------
// The lines met: Celder's method, edge by edge
// ---------------------------------------------------------------------------
/**
 * How the lines are met: Celder's method (`celderSeamMove`, src/content/regions/south-celder/south-celder-world.js), with the plain laid right to every
 * line and moved there to meet what it must. The step from the plain to the ground it meets is read every half metre
 * along every line (`step`, `probe` either side of it), and a point is moved by the step on its nearest lines averaged
 * over twice as many metres either way as it stands in from the line (`widen`), letting go over the line's own `reach`: the
 * Mithala's ground within forty metres, the unbuilt Acor Wetlands' within fifty, North Celder's line within seventy and
 * the unbuilt mountains' within eighty, the farther the more the ground there differs from the plain. The average is
 * weighted to the middle of its span (a triangle, not a box), and the span grows twice as fast as the distance from the
 * line: the hex blend's relief changes its wavelength along the Mithala's margin and the ground there swings by a metre
 * or two every ten metres, and so it is smoothed out within a few metres of the line instead of being carried in as
 * steep little ribs. Within `exact` of the line the step is read where the point stands. The far side is never moved.
 *
 * **North Celder's line is met the other way round**: North Celder's seam reads this side live and meets it, so what
 * this side meets there is the ground it was handed, read five centimetres in from the line, and within `hold` of the
 * line it answers that ground exactly; the plain is let in over the next metre and a half (`handed`).
 */
export const HENBORTH_SEAM = freeze({ probe: .05, step: .5, widen: 2, exact: 1, hold: .15, handed: 1.6,
  reach: freeze({ mithala: 40, wetland: 50, celder: 70, mountain: 80 }) });
// Past either end a span reaches out as far as the widest average at the farthest reach.
const PAD = Math.max(...Object.values(HENBORTH_SEAM.reach)) * HENBORTH_SEAM.widen + 1;
let LINES = null;
/** Every line, its steps read the first time a point comes within its reach: edge by edge, never all at once. */
function lines() {
  return (LINES ??= HENBORTH_EDGES.map(e => ({ ...e, reach: HENBORTH_SEAM.reach[e.kind], count: 0 })));
}
/** The ground a line meets at a point of it: across the line, or at North Celder's the ground handed to this side. */
function targetAt(line, x, z) {
  const S = HENBORTH_SEAM, side = line.kind === 'celder' ? -1 : 1;
  return groundBeforeHenborth(x + line.nx * S.probe * side, z + line.nz * S.probe * side);
}
function stepAt(line, s) {
  const S = HENBORTH_SEAM, x = line.a.x + (line.b.x - line.a.x) * s / line.length, z = line.a.z + (line.b.z - line.a.z) * s / line.length;
  return targetAt(line, x, z) - henborthDesign(x - line.nx * S.probe, z - line.nz * S.probe);
}
/**
 * A line's steps every half metre, read the first time a point comes within its reach, with their running integral and
 * the integral of that, so a triangle-weighted average over any span costs three lookups. Past either end the end's own
 * step stands, so a span reaching off the line's end is still a whole span.
 */
function seamTable(line) {
  if (line.count) return line;
  const S = HENBORTH_SEAM, count = Math.max(1, Math.ceil(line.length / S.step)), h = line.length / count;
  const pad = Math.ceil(PAD / h), n = count + 1 + 2 * pad, steps = new Float64Array(n);
  // A hand's breadth in from either end, so neither probe lands in a third hex at a corner.
  for (let i = 0; i <= count; i++) steps[pad + i] = stepAt(line, Math.max(.1, Math.min(line.length - .1, line.length * i / count)));
  for (let i = 0; i < pad; i++) { steps[i] = steps[pad]; steps[pad + count + 1 + i] = steps[pad + count]; }
  const one = new Float64Array(n), two = new Float64Array(n);
  for (let i = 1; i < n; i++) { one[i] = one[i - 1] + (steps[i - 1] + steps[i]) / 2 * h; two[i] = two[i - 1] + (one[i - 1] + one[i]) / 2 * h; }
  return Object.assign(line, { h, pad, steps, one, two, count });
}
/**
 * A table read at `s` metres along the line (negative and past the end within the pad): the steps linearly between
 * samples, and their integrals as the cubic their own derivative gives (`slope`, the table below them), which keeps the
 * span's average true when the span is only a few samples wide.
 */
function tableAt(line, table, s, slope = null) {
  const f = clamp(s / line.h + line.pad, 0, table.length - 1.000001), j = Math.floor(f), t = f - j;
  if (!slope) return mix(table[j], table[j + 1], t);
  const t2 = t * t, t3 = t2 * t, h = line.h;
  return (2 * t3 - 3 * t2 + 1) * table[j] + (t3 - 2 * t2 + t) * h * slope[j] + (-2 * t3 + 3 * t2) * table[j + 1] + (t3 - t2) * h * slope[j + 1];
}
/** The steps near `s`, averaged over `w` metres either way, weighted to the middle. */
function stepNear(line, s, w) {
  if (w < .05) return tableAt(line, line.steps, s);
  const two = q => tableAt(line, line.two, q, line.one);
  return (two(s + w) - 2 * two(s) + two(s - w)) / (w * w);
}
/** How far the plain at a point is moved to meet its lines. */
export function henborthSeamMove(x, z) {
  const S = HENBORTH_SEAM;
  let near = Infinity;
  const found = [];
  for (const line of lines()) {
    const r = line.reach;
    if (x < Math.min(line.a.x, line.b.x) - r || x > Math.max(line.a.x, line.b.x) + r
      || z < Math.min(line.a.z, line.b.z) - r || z > Math.max(line.a.z, line.b.z) + r) continue;
    const p = segment(x, z, line.a, line.b);
    if (p.distance >= r) continue;
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
    const w = Math.exp(-k) * (1 - smooth(line.reach * .7, line.reach, p.distance)) + 1e-12;
    total += w;
    sum += w * stepNear(seamTable(line), p.t * line.length, p.distance * S.widen) * (1 - smooth(0, line.reach, p.distance));
  }
  const move = sum / total;
  if (near >= S.exact) return move;
  // Within a metre of the line the step is read where the point stands rather than off the samples.
  const [line, p] = nearest, s = clamp(p.t * line.length, .1, line.length - .1);
  return mix(stepAt(line, s), move, smooth(0, S.exact, near));
}

// ---------------------------------------------------------------------------
// The ground
// ---------------------------------------------------------------------------
/** The plain met to its lines at a point this country writes, before North Celder's line is held. */
export function henborthLand(x, z) {
  return henborthDesign(x, z) + henborthSeamMove(x, z);
}
/**
 * The ground. `incoming` is the ground every other layer laid; `before(x, z)` answers the ground without this country's
 * layer (src/world/terrain/world-terrain.js `groundBeforeHenborth`), which the lines read through their own import. Writes only on
 * Henborth's own hexes and answers `incoming` everywhere else; within `hold` of North Celder's line it answers
 * `incoming` exactly, because North Celder's seam reads that ground and meets it.
 */
export function henborthGround(x, z, incoming, before) {
  if (!henborthWrites(x, z)) return incoming;
  const S = HENBORTH_SEAM, toCelder = celderLineDistance(x, z, S.handed + 1);
  if (toCelder <= S.hold) return incoming;
  const g = henborthLand(x, z);
  return toCelder < S.handed ? mix(incoming, g, smooth(S.hold, S.handed, toCelder)) : g;
}

// ---------------------------------------------------------------------------
// What covers the ground, and its colour
// ---------------------------------------------------------------------------
/**
 * What covers the ground at a point, each 0 to 1 (`swell` -1 to 1), for the colour, the scatter and the tests alike:
 * - `slope`: the design's own, rise over run (the scenery reads the ground's own off `heightAt`); `north`: how far
 *   toward the mountains (0 on the low side's lines, 1 on the mountains');
 * - `damp`: wet ground - a hollow's floor and sides, and the low ground where the mountain foot holds water;
 * - `hollow`: inside a damp hollow's rim; `approach`: on one of the three ways' raised ground; `gully`: in one of the
 *   eastern approach's gullies; `knoll`: on a dry knoll; `stony`: thin stony soil (knoll tops, the approaches' crests,
 *   the foothill knolls' shoulders);
 * - `foot`: the mountain foot, 1 at the Oremindi's and Narcosh's lines and 0 a hundred and twenty metres out, where the
 *   pasture gives out into cold-margin scrub; `foothill`: the Oremindi's foothill knolls;
 * - `celder`: 1 at North Celder's line and 0 sixty metres out; `mithala`: the same for the Mithala's lines.
 */
export function henborthCover(x, z) {
  const t = henborthNorthness(x, z), e = 1, D = henborthDesign;
  const h = D(x, z), slope = Math.hypot(D(x + e, z) - D(x - e, z), D(x, z + e) - D(x, z - e)) / (2 * e);
  const ap = approachAt(x, z), kn = knollAt(x, z), hollowIn = hollowShare(x, z);
  const toMountain = mountainLineDistance(x, z, 130), foot = 1 - smooth(0, 120, toMountain);
  // The mountain foot is wet where the seam takes the plain down into low ground across the line: five metres and
  // more below the plain's own level, within sixty metres of the line.
  const sunk = toMountain < 60 ? clamp((-henborthSeamMove(x, z) - 5) / 3, 0, 1) * (1 - smooth(10, 60, toMountain)) : 0;
  const fh = foothillRise(x, z) / (HENBORTH_PLAIN.foothill.low + HENBORTH_PLAIN.foothill.high);
  return {
    slope, north: t,
    damp: clamp(Math.max(hollowIn, sunk * .7), 0, 1),
    hollow: hollowIn,
    approach: ap.share, gully: clamp(ap.gully / .45, 0, 1),
    knoll: kn.share,
    stony: clamp(Math.max(smooth(.35, .9, kn.share), ap.share * smooth(.6, .95, ap.share) * .7, fh * smooth(.7, .95, knollField(x, z))), 0, 1),
    foot, foothill: clamp(fh, 0, 1),
    swell: clamp(henborthSwell(x, z), -1, 1),
    celder: 1 - smooth(0, 60, celderLineDistance(x, z, 61)),
    mithala: 1 - smooth(0, 60, edgeDistance(x, z, HENBORTH_EDGES.filter(l => l.kind === 'mithala'), 61)),
  };
}
/** How wet the ground is at a point, 0 to 1: the damp hollows and the wet mountain foot. Null off Henborth's hexes. */
export function henborthDamp(x, z) { return henborthWrites(x, z) ? henborthCover(x, z).damp : null; }

/**
 * The colours the ground is drawn in: the continental summer grass of the plain, greener toward the Mithala and greyer
 * and thinner toward the mountains; crest and hollow on the swells; the dark sedge and moss of the damp hollows and
 * the wet foot; the firm, paler, thin grass of the approaches; the stony turf of the knolls; and the brown heath of the
 * cold margin under the mountains.
 */
export const HENBORTH_GROUND = freeze({
  south: 0x8e9a58, north: 0x8d9364, crest: 0x9a9f62, hollow: 0x7f9352, bog: 0x5f7346, sedge: 0x6c7d4c,
  way: 0x979570, stony: 0x96917a, heath: 0x7f7f5a, foothill: 0x99956a,
});
const rgb = c => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
const mixColour = (a, b, t) => { const p = rgb(a), q = rgb(b), k = clamp(t, 0, 1); return (Math.round(mix(p[0], q[0], k)) << 16) | (Math.round(mix(p[1], q[1], k)) << 8) | Math.round(mix(p[2], q[2], k)); };
const swatchNumber = ground => (typeof ground === 'string' && /^#[0-9a-f]{6}$/i.test(ground) ? parseInt(ground.slice(1), 16) : null);
function ownColour(x, z) {
  const c = henborthCover(x, z), g = HENBORTH_GROUND;
  let colour = mixColour(g.south, g.north, smooth(.2, .9, c.north));
  colour = c.swell > 0 ? mixColour(colour, g.crest, smooth(.2, .9, c.swell) * .45) : mixColour(colour, g.hollow, smooth(.2, .9, -c.swell) * .45);
  colour = mixColour(colour, g.foothill, c.foothill * .6);
  colour = mixColour(colour, g.heath, c.foot * .55);
  colour = mixColour(colour, g.way, c.approach * .6);
  colour = mixColour(colour, g.stony, c.stony * .75);
  colour = mixColour(colour, g.sedge, c.damp * .7);
  return mixColour(colour, g.bog, smooth(.55, 1, c.hollow) * .8);
}
let lastTint = { x: NaN, z: NaN, colour: 0 };
/**
 * Henborth's row in the ground-tint table (`GROUND_TINTS`, src/world/terrain/world-terrain.js), as 0xRRGGBB on its own hexes, or
 * null. Over the last twelve metres before every line the colour fades back into the swatch it was given, so nothing
 * changes colour at a line.
 */
export function henborthTint(x, z, ground = null) {
  if (!henborthWrites(x, z)) return null;
  // The tint table asks once for every swatch in the blend at a point: the cover is worked out once.
  const colour = lastTint.x === x && lastTint.z === z ? lastTint.colour : (lastTint = { x, z, colour: ownColour(x, z) }).colour;
  const edge = edgeDistance(x, z, HENBORTH_EDGES, 13), swatch = swatchNumber(ground);
  return edge < 12 && swatch !== null ? mixColour(swatch, colour, smooth(0, 12, edge)) : colour;
}

// ---------------------------------------------------------------------------
// The country's own exports
// ---------------------------------------------------------------------------
/**
 * The places kept for what belongs to somebody, for the scenery to leave alone: the line of travel up each approach,
 * which the pass-keepers keep and the lore's pass roads follow (`half` metres either side of `points`: nothing tall,
 * nothing that blocks a walker), and nothing else - the bogs' plants and the knolls' lichens are the ground's, and the
 * gathering of them is not built.
 */
export const HENBORTH_RESERVED = freeze(HENBORTH_APPROACHES.map(a => freeze({ id: `${a.id}-way`, name: `${a.name}: its line of travel`,
  kind: 'way', points: a.points, half: 4 })));
/** Where the developer's travel tool sets a traveler down: open dry grass in the middle of the plain. */
export const HENBORTH_ARRIVAL = point(-2400, -1700);
const place = (id, name, x, z, radius, description) => freeze({ id, name, region: REGION_IDS[HENBORTH], x, z, radius, description });
/** Places for the chart: natural places only, named in plain words - no pass, keeper, marker or camp is named or built. */
export const HENBORTH_LANDMARKS = freeze([
  place('henborth-open-plain', 'The open plain', -2430, -1560, 45,
    'The middle of Henborth: open grass on a plain a little higher than the Mithala, rising so gently toward the mountains that the rise is felt in the wind before it is seen.'),
  place('henborth-celder-margin', 'The Celder margin', -2580, -1445, 40,
    "Henborth's southern edge, where the plain comes up out of Celder's grass across a shallow, uneven trough in the ground."),
  place('henborth-main-approach', 'The main approach', -2345, -1840, 40,
    "A broad, firm rise of thin grass running up from the middle of the plain to Narcosh's highland: the most travelled way toward the passes, and the plainest. Nothing marks it."),
  place('henborth-eastern-approach', 'The eastern approach', -2185, -1880, 34,
    "A narrower rise running up to where Narcosh's highland meets its mountains, facing east into the weather, with short gullies down both flanks that keep their snow into the summer."),
  place('henborth-western-spur', 'The western spur', -2594, -1715, 30,
    'A low, narrow spur of firm ground running out of the foothills under the Lesser Oremindi to the gap between the range\'s mountain and its hills, easy to walk past without noticing. Few accounts mention a way here.'),
  place('henborth-cranberry-bog', 'The cranberry bog', -2380, -1766, 40,
    "A shallow closed hollow under the main approach's western flank, its flat floor moss and sedge over standing water into the summer: the northern bog cranberry's ground."),
  place('henborth-sedge-hollow', 'The sedge hollow', -2245, -1790, 36,
    'A damp hollow between the main and eastern approaches, where the snowmelt has nowhere to go and the sedge grows thick on its flat, wet floor.'),
  place('henborth-middle-hollow', 'The middle hollow', -2505, -1618, 34,
    'A shallow damp hollow in the open middle of the plain, its floor still green after the grass round it has turned.'),
  place('henborth-wet-corner', 'The wet corner', -2072, -1946, 30,
    "The plain's north-eastern tip, where the ground runs down damp and sedgy into the Acor Wetlands."),
  place('henborth-dry-knoll', 'The dry knoll', -2300, -1862, 30,
    "A low rounded knoll of thin, stony, quick-draining soil below Narcosh, its crown short turf and lichen, dry when the ground round it is soft."),
  place('henborth-lichen-knoll', 'The lichen knoll', -2640, -1585, 30,
    "A stony knoll among the low foothills under the North Oremindi, grey and rust with the lichens that grow in Henborth's thin soil and nowhere south of it."),
  place('henborth-oremindi-foot', 'Under the Oremindi', -2700, -1520, 34,
    'Low rounded foothills along the western edge of the plain, where the ground begins to gather itself toward the North Oremindi.'),
]);
/**
 * Walked routes kept clear of scenery: the ways the ground gives, not roads. **The plain** carries North Celder's own
 * way on from its line, north-east across the open middle to the main approach's foot and up it to the mountain foot;
 * shorter ways leave it for the western spur and, from the main approach's foot, for the eastern approach. Nothing is
 * built along any of them.
 */
const trail = (id, width, points) => freeze({ id, width, points: freeze(points.map(([x, z]) => point(x, z))) });
export const HENBORTH_TRAILS = freeze([
  trail('henborth-the-plain', 5, [[-2690, -1425], [-2640, -1470], [-2560, -1530], [-2480, -1585], [-2420, -1640], [-2370, -1690],
    [-2335, -1740], [-2335, -1790], [-2345, -1840], [-2354, -1880], [-2358, -1900]]),
  trail('henborth-to-the-western-spur', 3, [[-2560, -1530], [-2580, -1590], [-2588, -1650], [-2594, -1705], [-2598, -1745]]),
  trail('henborth-to-the-eastern-approach', 3, [[-2335, -1740], [-2290, -1742], [-2230, -1748], [-2185, -1775], [-2172, -1830],
    [-2182, -1880], [-2194, -1925]]),
]);
/**
 * Review views: one high over the country, and walker's ones with the eye 1.8 m over the ground at its own place
 * (`walk: true`; the heights are the ground's, written out). The wildlife view stands at a walker's height at the edge of
 * the frostback's summer grass.
 */
const view = (eye, target, walk = false) => freeze({ eye: freeze({ x: eye[0], z: eye[1], y: eye[2] }), target: freeze({ x: target[0], z: target[1], y: target[2] }), ...(walk ? { walk: true } : {}) });
export const HENBORTH_VIEWS = freeze({
  // From over North Celder's north-western corner, north-east across the whole band to Narcosh and the Oremindi.
  'henborth': view([-2700, -1330, 70], [-2350, -1780, 14]),
  // On the plain just in from Celder, looking north-east along the open middle to the main approach.
  'henborth-celder-margin': view([-2640, -1470, 18.18], [-2345, -1840, 19], true),
  // At the main approach's foot, looking up the rise to the mountain foot.
  'henborth-main-approach': view([-2335, -1760, 17.56], [-2362, -1912, 18], true),
  // At the eastern approach's foot, looking up between its gullies.
  'henborth-eastern-approach': view([-2172, -1835, 18.52], [-2200, -1946, 17.5], true),
  // In the foothills, looking along the western spur to the gap in the Lesser Oremindi.
  'henborth-western-spur': view([-2588, -1660, 19.54], [-2600, -1761, 16], true),
  // On the cranberry bog's eastern rim, looking across its floor.
  'henborth-cranberry-bog': view([-2351.6, -1744.7, 17.06], [-2400, -1778, 14.4], true),
  // Above the wet corner, looking down into it and the Acor Wetlands beyond.
  'henborth-wet-corner': view([-2110, -1915, 17.93], [-2020, -1985, 14], true),
  // At the edge of the frostback's summer grass, looking into the band.
  'henborth-wildlife': view([-2515, -1485, 17.96], [-2462, -1530, 16.8], true),
});
