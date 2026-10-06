import { izolSeamWeight } from '../izol/izol-ground.js';
/**
 * East Izol: terrain, climate and water only. `src/content/regions/east-izol/east-izol-scenery.js` and `src/content/regions/east-izol/east-izol-wildlife.js` carry
 * what grows and what lives here. Nothing here belongs to anybody: no Merrath, no shrine, no Hearthstone, no
 * flock, road, fold or quarry. Their ground is kept for them and nothing is built on it.
 *
 * Pure: no three, no DOM. `src/world/terrain/world-terrain.js` lays the ground (`eastIzolGround`) and colours it
 * (`eastIzolTint`, `eastIzolShoreTint`); the scenery, the wildlife, the chart and the tests read the same numbers.
 *
 * **What the atlas gives** (the authority): twenty-seven hexes, rows 122-130 - eleven grassland, eight plains,
 * four hills, three forest and one mountain, (10,125). `Csa` on the north arm and the whole east coast, `Csb` on
 * the interior: the mountain, the hills (11,124) and (10,126), the three forest hexes and the southern plains
 * (`EAST_IZOL_CLIMATE`). Ten hex edges against West Izol, thirty-two on the open sea. No river edge anywhere.
 *
 * **What the lore gives** (`world-builder/azhora_lore/geography/regions/izol.md`): rock throughout, "dark grey and
 * iron-brown in the lower elevations, lightening to slate-grey at height", "good pasture on its softer slopes and
 * very little else"; a coast of headlands - "high cliff faces, sheltered coves reachable by sea but not easily by
 * land, stretches of coast where the interior slopes straight to the water" - with a few small flats where water
 * reached the sea; an interior rising to "three peaks ... at intervals too wide to be called a range - isolated
 * mountains, each distinct in profile and each visible from points across the island": the Three Presences.
 *
 * **What West Izol already put here, adopted** (`src/content/regions/izol/izol-world.js`): the Three Presences stood here as skyline
 * props (`THREE_PRESENCES`); they are ground now, at the props' own places and heights, and the props are drawn
 * only where the ground does not already carry a peak (src/content/regions/izol/izol-scenery.js). The Hearth Road's last hundred
 * metres run on this ground and end on it, at the western edge of the level ground kept for the Hearthstone.
 *
 * **The shape, in one paragraph.** A central plain at fifteen to eighteen metres - the atlas's `plains` hexes, and
 * the island's middle by distance from every shore - where the Hearth Road ends. Out of it the eastern Presence
 * (136 m) stands as a horn and the southern one (116 m) as a tilted block with a sheer face toward the plain; the
 * northern (122 m) is a dome on the atlas's mountain hex, its west flank running down to the sea. Each has one
 * walkable shoulder on its far side and a level summit platform kept clear. Hills on the four `hills` hexes; the
 * three forest hexes are folds on the eastern fall, each with a dry gully down it. The coast is cliff all round
 * but for two bays with a flat behind each - the east bay, kept for Merrath, and a small one on the north-east -
 * seven pocket coves, one of which a gully comes down to, and the slope under the northern Presence.
 *
 * **The seam with West Izol** is Celder's (`celderSeamMove`, src/content/regions/south-celder/south-celder-world.js): within `EAST_IZOL_SEAM.feather`
 * of the ten shared edges the design gives way to the ground handed to it, laid on the seamless hex blend, and the
 * handed ground is then moved to meet the far side exactly at the line. West Izol's ground is never moved.
 */
import { regionAt, hexOwnerAt, hexAt, hexCentre, REGION_CELLS, REGION_OUTLINES, REGION_IDS, terrainMix, seamlessTerrainMix, relief, landDistance } from '../../../world/terrain/region-world.js';
import { THREE_PRESENCES, IZOL_ROAD } from '../izol/izol-world.js';

const freeze = Object.freeze, point = (x, z) => freeze({ x, z });
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const bell = u => (u >= 1 ? 0 : (1 - u * u) ** 2);
/** A smooth maximum: `max(a, b)` with the crease rounded over `k` metres. */
const smax = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.max(a, b) + h * h * k * .25; };
const segment = (x, z, a, b) => {
  const dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz, t = l2 ? clamp(((x - a.x) * dx + (z - a.z) * dz) / l2, 0, 1) : 0;
  return { distance: Math.hypot(x - a.x - dx * t, z - a.z - dz * t), t };
};
/** Two slow sines that never line up, -1 to 1: for outlines that should not look drawn with a ruler. */
const wobble = (x, z, wave, phase) => Math.sin(x / wave * 1.31 + z / wave * .73 + phase) * .6 + Math.sin(z / wave * 1.9 - x / wave * .41 + phase * 2.3 + 1.1) * .4;

export const EAST_IZOL = 'East Izol';
const WEST_IZOL = 'West Izol';
export const EAST_IZOL_CELLS = freeze(REGION_CELLS[EAST_IZOL] ?? []);
/** Whether a point is on East Izol's own ground. */
export function eastIzolOwns(x, z) { return regionAt(x, z)?.name === EAST_IZOL; }

/**
 * The climate per hex, off the World Builder map (`azhora.wwmap`, `hexes[key].climate`): `Csb` on the interior -
 * the mountain, the hills (11,124) and (10,126), the three forest hexes and the six southern plains - and `Csa` on
 * the north arm and the east coast. Thirteen and fourteen. The sky stays the world's default, as West Izol's does:
 * the island is one air.
 */
const CSB = new Set(['11,124', '12,124', '10,125', '11,125', '9,126', '10,126', '11,126', '8,127', '9,127', '10,127', '8,128', '9,128', '8,129']);
export const EAST_IZOL_CLIMATE = freeze(Object.fromEntries(EAST_IZOL_CELLS.map(c => [`${c.q},${c.r}`, CSB.has(`${c.q},${c.r}`) ? 'Csb' : 'Csa'])));
/** East Izol's hexes with ninety metres round them - past the furthest its shore fringe reaches: nothing in this file is asked about outside it. */
export const EAST_IZOL_BOX = freeze({
  minX: Math.min(...EAST_IZOL_CELLS.map(c => c.x)) - 90, maxX: Math.max(...EAST_IZOL_CELLS.map(c => c.x)) + 90,
  minZ: Math.min(...EAST_IZOL_CELLS.map(c => c.z)) - 90, maxZ: Math.max(...EAST_IZOL_CELLS.map(c => c.z)) + 90,
});
const inBox = (x, z) => x > EAST_IZOL_BOX.minX && x < EAST_IZOL_BOX.maxX && z > EAST_IZOL_BOX.minZ && z < EAST_IZOL_BOX.maxZ;

// ---------------------------------------------------------------------------
// The line with West Izol
// ---------------------------------------------------------------------------
/**
 * The ten hex edges East Izol shares with West Izol, each with its outward normal (toward West Izol). The two at
 * the coast are carried twelve metres on out to sea along their own line: that line is where `regionAt`'s shore
 * fringe changes hands between the two countries, so the few metres of beach past the last corner are met too.
 */
export const EAST_IZOL_LINE = freeze((() => {
  const edges = [];
  for (const loop of REGION_OUTLINES[EAST_IZOL] ?? []) for (let i = 0; i < loop.length; i++) {
    const a = loop[i], b = loop[(i + 1) % loop.length], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
    let nx = dz / length, nz = -dx / length;
    if (hexOwnerAt(mx + nx, mz + nz) === EAST_IZOL) { nx = -nx; nz = -nz; }
    if (hexOwnerAt(mx + nx, mz + nz) !== WEST_IZOL) continue;
    edges.push({ a: point(a.x, a.z), b: point(b.x, b.z), nx, nz });
  }
  const shared = p => edges.filter(e => (e.a.x === p.x && e.a.z === p.z) || (e.b.x === p.x && e.b.z === p.z)).length;
  return edges.map(e => {
    let { a, b } = e;
    const l = Math.hypot(b.x - a.x, b.z - a.z), ux = (b.x - a.x) / l, uz = (b.z - a.z) / l;
    if (shared(a) === 1) a = point(a.x - ux * 12, a.z - uz * 12);
    if (shared(b) === 1) b = point(b.x + ux * 12, b.z + uz * 12);
    return freeze({ a, b, nx: e.nx, nz: e.nz, length: Math.hypot(b.x - a.x, b.z - a.z) });
  });
})());
/** Distance to the line with West Izol. */
export function lineDistance(x, z) {
  let best = Infinity;
  for (const e of EAST_IZOL_LINE) best = Math.min(best, segment(x, z, e.a, e.b).distance);
  return best;
}

// ---------------------------------------------------------------------------
// The upland: the level the island's own ground stands at, before anything stands on it
// ---------------------------------------------------------------------------
/**
 * The upland's level at each hex's middle, in metres: low on the central plain and behind the two bays, higher on
 * the coast's headlands, highest on the `hills` and `mountain` hexes. West Izol's hexes along the line carry their
 * own ground's level, so the upland arrives at the line near what is already there; two points more lay the
 * valleys down to the two flats. Laid between the points with a forty-metre Gaussian, so no hex edge shows.
 */
const UPLAND = freeze([
  // q, r, level
  [11, 122, 19], [12, 122, 27],
  [11, 123, 29], [12, 123, 12], [13, 123, 21],
  [10, 124, 22], [11, 124, 33], [12, 124, 25], [13, 124, 23],
  [9, 125, 13], [10, 125, 40], [11, 125, 21], [12, 125, 8],
  [9, 126, 18], [10, 126, 31], [11, 126, 25], [12, 126, 23],
  [8, 127, 16], [9, 127, 18], [10, 127, 24], [11, 127, 22],
  [8, 128, 16], [9, 128, 19], [10, 128, 21],
  [8, 129, 17], [9, 129, 23],
  [8, 130, 21],
  // West Izol along the line: its own ground's level, never moved.
  [8, 126, 15], [7, 127, 16], [7, 128, 12], [7, 129, 13], [7, 130, 11],
].map(([q, r, level]) => freeze({ ...hexCentre(q, r), level })).concat([
  // The Merrath valley and the north-east bay's: the ground let down to each flat from inland.
  freeze({ x: 698, z: 1678, level: 11 }), freeze({ x: 646, z: 1474, level: 13 }),
]));
const UPLAND_SIGMA = 40;
export function uplandLevel(x, z) {
  let sum = 0, total = 0;
  for (const p of UPLAND) {
    const d2 = (x - p.x) ** 2 + (z - p.z) ** 2;
    if (d2 > 160 * 160) continue;
    const w = Math.exp(-d2 / (2 * UPLAND_SIGMA * UPLAND_SIGMA));
    sum += w * p.level; total += w;
  }
  return total > 1e-9 ? sum / total : 16;
}

/** Two of the world's relief, turned seventy degrees apart, so the pasture rolls every way (Selemis's `lumps`). */
const TURN = freeze({ c: Math.cos(1.22), s: Math.sin(1.22) });
function lumps(x, z, amp, wave) {
  const u = x * TURN.c - z * TURN.s, v = x * TURN.s + z * TURN.c;
  return relief(x, z, amp * .6, wave) + relief(u + 417, v - 263, amp * .55, wave * 1.37);
}

// ---------------------------------------------------------------------------
// The hills
// ---------------------------------------------------------------------------
/** A rounded crown on each `hills` hex: three along the north arm's spine, and one between the northern and eastern Presences. */
export const EAST_IZOL_HILLS = freeze([
  freeze({ id: 'north-arm-hill', x: 604, z: 1420, radius: 58, height: 11, phase: .4 }),
  freeze({ id: 'west-bay-hill', x: 548, z: 1502, radius: 56, height: 10, phase: 2.2 }),
  freeze({ id: 'spine-hill', x: 602, z: 1590, radius: 62, height: 12, phase: 3.9 }),
  freeze({ id: 'middle-hill', x: 616, z: 1770, radius: 58, height: 12, phase: 5.3 }),
]);
function hillLift(x, z) {
  let lift = 0;
  for (const h of EAST_IZOL_HILLS) {
    const theta = Math.atan2(z - h.z, x - h.x), r = h.radius * (1 + Math.sin(theta * 3 + h.phase) * .1 + Math.sin(theta * 5 - h.phase) * .05);
    lift = Math.max(lift, h.height * bell(Math.hypot(x - h.x, z - h.z) / r));
  }
  return lift;
}

// ---------------------------------------------------------------------------
// The Three Presences
// ---------------------------------------------------------------------------
/**
 * The Three Presences, as ground, at West Izol's own places and heights (`THREE_PRESENCES`): each summit stands
 * where its prop's apex stood - the prop's place moved by its `lean` - with a level platform at the prop's `topY`
 * for the shrine the lore puts there, and nothing on it.
 *
 * Each is its own shape, because the lore says "each distinct in profile":
 * - **the northern** is a dome on the atlas's mountain hex: rounded at the top, its western flank running down to
 *   the sea, its south-western face steep where West Izol's line comes within eighty metres of it. Its shoulder is
 *   the long ridge north-east to the north arm's spine hill.
 * - **the eastern**, the highest, is a horn: three arêtes and steep faces between them. Its shoulder is the
 *   eastern arête, which runs out toward the east coast.
 * - **the southern** is a tilted block: a back rising out of the south head to a sheer face toward the central
 *   plain and West Izol, with the summit at the top corner of the face. Its back is its shoulder.
 *
 * For the dome and the horn, `radii` is the distance from the summit toward east, south-east, south, south-west,
 * west, north-west, north and north-east (z grows southward) at which the flank has come down to `foot` - well
 * under the upland, so the upland stands over the last of it and the foot is where the two meet - ribbed by
 * `ribs`. `a` rounds the top and `b` flares the foot (`(1 - u^a)^b`). Every shoulder falls at `grade` and is flat
 * for `band` metres either side of its crest, because steep rock here is climbed and a shoulder is how a walker
 * goes up.
 */
const PRESENCE_BY_ID = Object.fromEntries(THREE_PRESENCES.map(p => [p.id, p]));
const presence = (id, spec) => {
  const prop = PRESENCE_BY_ID[id], shoulder = (spec.shoulder ?? []).map(([x, z]) => point(x, z));
  let length = 0;
  for (let i = 1; i < shoulder.length; i++) length += Math.hypot(shoulder[i].x - shoulder[i - 1].x, shoulder[i].z - shoulder[i - 1].z);
  return freeze({ id, prop, x: prop.x + prop.lean, z: prop.z - 1.5, base: point(prop.x, prop.z), top: prop.topY, ...spec,
    radii: freeze(spec.radii ?? []), aretes: freeze(spec.aretes ?? []), shoulder: freeze(shoulder), length });
};
export const EAST_IZOL_PRESENCES = freeze([
  presence('presence-north', { kind: 'dome', platform: 9, foot: 4, a: 2.3, b: 1.45, ribs: .07, phase: .3,
    radii: [72, 64, 60, 52, 108, 86, 80, 78], shoulder: [[515, 1688.5], [548, 1648], [578, 1612], [604, 1588]], grade: .62, ease: 24, band: 3.2, side: 1.7 }),
  presence('presence-east', { kind: 'horn', platform: 5.5, foot: 4, a: 1.35, b: 1.6, ribs: .08, phase: 1.4,
    aretes: [-.47, -2.35, 1.85], areteDepth: .12, areteWidth: .3,
    radii: [62, 58, 56, 54, 54, 58, 60, 62], shoulder: [[592, 1864.5], [640, 1846], [690, 1838], [736, 1834], [768, 1846]], grade: .66, ease: 12, band: 3, side: 1.7 }),
  presence('presence-south', { kind: 'block', platform: 7, foot: 4, phase: 2.6, dip: freeze({ x: .35, z: .937 }), back: 176,
    near: 8, far: 40, taper: .45, cap: 40, face: .3, nearFace: .22, scarp: .24, grade: .66, ease: 14, lateral: .2 }),
]);

const angleGap = (a, b) => ((a - b) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
/** A dome's or a horn's foot radius toward a bearing: interpolated round the eight given, ribbed, and longer down an arête. */
function footRadius(p, dx, dz) {
  const theta = Math.atan2(dz, dx), f = ((theta / (Math.PI / 4)) % 8 + 8) % 8, i = Math.floor(f), t = f - i;
  const r0 = p.radii[i], r1 = p.radii[(i + 1) % 8], c = (1 - Math.cos(t * Math.PI)) / 2;
  let lift = 0;
  for (const bearing of p.aretes) lift = Math.max(lift, Math.exp(-((angleGap(theta, bearing) / p.areteWidth) ** 2)));
  const ribs = 1 + p.ribs * (Math.sin(theta * 7 + p.phase) * .6 + Math.sin(theta * 11 + p.phase * 2) * .4);
  return mix(r0, r1, c) * (1 + (p.areteDepth ?? 0) * lift) * ribs;
}
/** The shape of a flank between the summit platform (u = 0) and the foot (u = 1). */
const flank = (p, u) => (u >= 1 ? 0 : (1 - u ** p.a) ** p.b);

/** The body of a dome or a horn: its height, leaning from the base toward the summit as it rises; -Infinity off it. */
function bodyHeight(p, x, z) {
  let cx = p.x, cz = p.z, u = 0;
  for (let i = 0; i < 2; i++) {
    const dx = x - cx, dz = z - cz, r = Math.hypot(dx, dz), R = footRadius(p, dx, dz);
    u = Math.max(0, (r - p.platform) / Math.max(1, R - p.platform));
    cx = mix(p.x, p.base.x, Math.min(1, u)); cz = mix(p.z, p.base.z, Math.min(1, u));
  }
  return u >= 1 ? -Infinity : p.foot + (p.top - p.foot) * flank(p, u);
}
/** How far a point is from a shoulder's line. */
function shoulderDistance(p, x, z) {
  let best = Infinity;
  for (let i = 1; i < p.shoulder.length; i++) best = Math.min(best, segment(x, z, p.shoulder[i - 1], p.shoulder[i]).distance);
  return best;
}
/**
 * The crest's level `s` metres along the shoulder from the summit: level on the platform, easing over `ease`
 * metres into its `grade` - so the shoulder stands over the body's rounded top from the rim on, and a walker never
 * meets the body's steeper flank where the two hand over - then falling at that grade.
 */
function crestLevel(p, s) {
  const e = Math.max(0, s - p.platform), ease = p.ease ?? 0;
  return p.top - p.grade * (e < ease ? e * e / (2 * ease) : e - ease / 2);
}
/**
 * The shoulder: its crest, flat for `band` metres either side, falling away at `side` beyond - more gently over
 * its last sixty metres, where it is no more than a rise in the ground - and back past the summit falling away at
 * three in one, under the body, so the shoulder is only ever on its own side of the peak. How far down the
 * shoulder a point is reads every stretch of the line, each weighted by how near it is: read off the nearest
 * stretch alone it jumps on the inside of a bend, and the crest with it.
 */
function shoulderHeight(p, x, z) {
  const line = p.shoulder, last = line.length - 1;
  let near = Infinity, run = 0, behind = 0;
  const reads = [];
  for (let i = 1; i <= last; i++) {
    const a = line[i - 1], b = line[i], length = Math.hypot(b.x - a.x, b.z - a.z), ux = (b.x - a.x) / length, uz = (b.z - a.z) / length;
    const dx = x - a.x, dz = z - a.z, perpendicular = Math.abs(-dx * uz + dz * ux);
    let t = dx * ux + dz * uz, distance;
    if (t < 0 && i === 1) { behind = -t; t = 0; distance = perpendicular; }
    else if (t > length && i === last) distance = perpendicular;
    else { t = clamp(t, 0, length); distance = Math.hypot(x - a.x - ux * t, z - a.z - uz * t); }
    reads.push([distance, run + t]);
    near = Math.min(near, distance);
    run += length;
  }
  let sum = 0, total = 0;
  for (const [distance, along] of reads) { const w = Math.exp(-(distance - near) / 2); sum += w * along; total += w; }
  const along = sum / total, off = Math.max(0, near - p.band), side = mix(p.side, .45, smooth(p.length - 60, p.length, along));
  return crestLevel(p, along) - side * off * off / (off + 2.5) - 3 * behind;
}
/**
 * The southern Presence's frame: `along` down its back from the summit toward the south head, `across` from the
 * back's middle line, positive toward West Izol. The back runs from `platform` behind the summit to `back` in front
 * of it, `near` metres to the West Izol side of its line and `far` to the other, narrowing by `taper` toward its
 * foot and rounded off over its last `cap` metres; both sides wander a little, as a weathered edge does.
 */
function blockFrame(p, x, z) {
  const dx = x - p.x, dz = z - p.z, along = dx * p.dip.x + dz * p.dip.z, across = -dx * p.dip.z + dz * p.dip.x;
  const t = clamp(along / p.back, 0, 1), narrow = 1 - p.taper * t;
  const cap = along > p.back - p.cap ? Math.sqrt(Math.max(0, 1 - ((along - (p.back - p.cap)) / p.cap) ** 2)) : 1;
  const near = p.near * (1 + .25 * Math.sin(along / 17 + .8)) * Math.max(narrow, .75) * cap;
  const far = p.far * narrow * (1 + .12 * Math.sin(along / 23 + 2.1)) * cap;
  const behind = Math.max(0, -along - p.platform - 2.5 * wobble(across, 0, 9, p.phase)), ahead = Math.max(0, along - p.back);
  const side = across > 0 ? Math.max(0, across - near) : Math.max(0, -across - far);
  return { along, across, near, far, behind, out: Math.hypot(behind, ahead, side) };
}
/** The block's height: the back, and the faces off it - sheerest at the scarp behind the summit - falling to `foot`; -Infinity off it. */
function blockHeight(p, x, z) {
  const f = blockFrame(p, x, z);
  const rise = smooth(p.platform, p.platform + 18, f.along);
  // The summit is the block's top corner: the top falls away from it down the back and toward the far side both.
  const back = crestLevel(p, f.along) - p.lateral * Math.max(0, -f.across - p.platform) + rise * (1.1 * Math.sin(f.along / 19 + f.across / 27)
    - 2 * (f.across / Math.max(12, f.across > 0 ? f.near + 8 : f.far)) ** 2);
  if (f.out <= 0) return back;
  // Buttresses: the faces stand out and fall back along their length. Toward the foot of the back, where it is
  // only a few metres over the south head, its sides lie back into slopes a walker can step up.
  const share = f.behind / Math.max(1e-6, f.out), face = f.across > 0 ? p.nearFace : p.face;
  const steep = mix(mix(face, p.scarp, share), 2.4, smooth(p.back - 70, p.back - 30, f.along));
  const width = Math.max(4, steep * (back - p.foot) * (1 + .15 * Math.sin(f.along / 8.5 + f.across / 11 + p.phase))), fall = f.out / width;
  return fall >= 1 ? -Infinity : p.foot + (back - p.foot) * (1 - fall) ** 1.5;
}
/** One Presence's height at a point, or -Infinity off it. */
export function presenceHeight(p, x, z) {
  // Far enough that every part of every Presence is tens of metres under the ground there (the tests hold it).
  if (Math.hypot(x - p.x, z - p.z) > 260) return -Infinity;
  if (p.kind === 'block') return blockHeight(p, x, z);
  return smax(bodyHeight(p, x, z), shoulderHeight(p, x, z), 4);
}
/** How far a point is up the Presences: 0 below twenty metres on them or off them, 1 on a summit platform. */
export function presenceShare(x, z) {
  let best = 0;
  for (const p of EAST_IZOL_PRESENCES) {
    const h = presenceHeight(p, x, z);
    if (h > -Infinity) best = Math.max(best, clamp((h - 20) / (p.top - 20), 0, 1));
  }
  return best;
}
/** How near a Presence's walkable shoulder a point is: 1 on its crest (or on the southern one's back), 0 a few metres off. */
export function shoulderCrest(x, z) {
  let best = 0;
  for (const p of EAST_IZOL_PRESENCES) {
    if (Math.hypot(x - p.x, z - p.z) > 200) continue;
    if (p.kind === 'block') {
      const f = blockFrame(p, x, z);
      if (f.out > 0) continue;
      const inside = Math.min(f.along + p.platform, p.back - f.along, f.across > 0 ? f.near - f.across : f.far + f.across);
      best = Math.max(best, smooth(1, 3, inside));
      continue;
    }
    best = Math.max(best, 1 - smooth(p.band + 1, p.band + 8, shoulderDistance(p, x, z)));
  }
  return best;
}
/** The summit platform under a point, if any. */
export function summitPlatformAt(x, z) {
  return EAST_IZOL_PRESENCES.find(p => Math.hypot(x - p.x, z - p.z) <= p.platform) ?? null;
}

// ---------------------------------------------------------------------------
// The kept ground: the Hearthstone's site, Merrath's flat and the north-east bay's
// ---------------------------------------------------------------------------
/**
 * Ground kept open for what belongs to somebody, with nothing on it. Each is a plane (`level` at its middle, rising
 * by `rise` metres per metre along `axis`) inside a rounded rectangle of half-sizes `halfA` along `axis` by
 * `halfB` across it, its edge wandering by `wander` metres, let back into the country round it over `feather`
 * metres - or `back` metres on its landward side, where a valley comes down to it.
 * - **The Hearthstone's site**: the middle of the island by distance from every shore, at the Hearth Road's end -
 *   the road's last metres run onto its western edge. Level, and all three Presences stand up from it.
 * - **Merrath's flat**: the head of the east bay, between the two headlands, facing the open sea: a hundred and
 *   forty metres along the shore and a hundred back, three metres over the water at the strand and seven at the
 *   back, where the Merrath gully comes down its valley out of the folds.
 * - **The north-east bay's flat**: a small one at the head of the bay on the `plains` hex (12,123).
 */
const kept = (id, name, x, z, spec) => freeze({ id, name, x, z, ...spec, axis: freeze(spec.axis) });
export const EAST_IZOL_KEPT = freeze([
  kept('hearthstone-site', "The Hearthstone's site", 513, 1900, { halfA: 21, halfB: 21, round: 21, axis: { x: 1, z: 0 }, level: 15.6, rise: 0, feather: 28, back: 28, wander: 2 }),
  kept('merrath-flat', "Merrath's flat", 748, 1675, { halfA: 48, halfB: 70, round: 28, axis: { x: 1, z: 0 }, level: 5.2, rise: -.045, feather: 40, back: 56, wander: 6 }),
  kept('north-east-bay-flat', "The north-east bay's flat", 664, 1482, { halfA: 28, halfB: 30, round: 18, axis: { x: .5, z: -.866 }, level: 4.2, rise: -.05, feather: 20, back: 40, wander: 4 }),
]);
function keptFrame(k, x, z) {
  const wx = x + k.wander * wobble(x, z, 23, k.level), wz = z + k.wander * wobble(z, x, 19, k.level + 1);
  const dx = wx - k.x, dz = wz - k.z, a = dx * k.axis.x + dz * k.axis.z, b = -dx * k.axis.z + dz * k.axis.x;
  const qa = Math.max(0, Math.abs(a) - (k.halfA - k.round)), qb = Math.max(0, Math.abs(b) - (k.halfB - k.round));
  const ax = x - k.x, az = z - k.z;
  return { outside: Math.max(0, Math.hypot(qa, qb) - k.round), level: k.level + k.rise * (ax * k.axis.x + az * k.axis.z),
    feather: mix(k.feather, k.back, smooth(-.3 * k.halfA, -k.halfA, a)) };
}
/** How much of a point is kept ground: 1 on it, 0 past its feather. */
export function keptShare(x, z) {
  let best = 0;
  for (const k of EAST_IZOL_KEPT) { const f = keptFrame(k, x, z); best = Math.max(best, 1 - smooth(0, f.feather, f.outside)); }
  return best;
}
/** The kept place a point is on, if any. */
export const keptAt = (x, z) => EAST_IZOL_KEPT.find(k => keptFrame(k, x, z).outside <= 0) ?? null;
function keepLevel(x, z, h) {
  for (const k of EAST_IZOL_KEPT) {
    const f = keptFrame(k, x, z);
    if (f.outside >= f.feather) continue;
    h = mix(h, f.level, 1 - smooth(0, f.feather, f.outside));
  }
  return h;
}

// ---------------------------------------------------------------------------
// The coast: cliffs, bays and coves
// ---------------------------------------------------------------------------
/**
 * The coves: pocket beaches at the notches where two coastal hexes meet the sea, each a strand of sand or shingle
 * between cliffs, backed by a wall. Reachable by sea, and by land only where a gully comes down to it (`gully`).
 * `x`, `z` is the notch and `inland` the way into the land; `floor` is the level of the cove's back, `r` how far
 * the bowl reaches inland at its middle, `wall` the width of the wall behind it, and `beach` the strand's reach
 * along the shore either side of the notch.
 */
const notch = (q1, r1, q2, r2, qs, rs) => {
  const a = hexCentre(q1, r1), b = hexCentre(q2, r2), s = hexCentre(qs, rs), v = point((a.x + b.x + s.x) / 3, (a.z + b.z + s.z) / 3);
  const n = Math.hypot(v.x - s.x, v.z - s.z);
  return { x: v.x, z: v.z, inland: point((v.x - s.x) / n, (v.z - s.z) / n) };
};
const cove = (id, name, hexes, spec) => freeze({ id, name, ...notch(...hexes), ...spec });
export const EAST_IZOL_COVES = freeze([
  cove('north-cove', 'The north cove', [11, 122, 12, 122, 12, 121], { floor: 1.9, r: 15, wall: 7, beach: 13, shingle: true, phase: .7 }),
  cove('east-head-cove', 'The cove under the east head', [13, 123, 13, 124, 14, 123], { floor: 1.8, r: 14, wall: 6, beach: 12, shingle: true, phase: 1.9 }),
  cove('fold-cove', 'The fold cove', [12, 126, 11, 127, 12, 127], { floor: 2, r: 16, wall: 7, beach: 14, shingle: false, phase: 3.1 }),
  cove('middle-cove', 'The middle cove', [11, 127, 10, 128, 11, 128], { floor: 1.8, r: 14, wall: 6, beach: 12, shingle: true, phase: 4.4 }),
  cove('gate-cove', 'The gate cove', [10, 128, 9, 129, 10, 129], { floor: 2, r: 17, wall: 8, beach: 14, shingle: false, gully: 'gate-gully', phase: 5.2 }),
  cove('south-cove', 'The south cove', [9, 129, 8, 130, 9, 130], { floor: 1.8, r: 14, wall: 6, beach: 12, shingle: true, phase: .2 }),
  cove('west-cove', 'The west cove', [9, 125, 10, 124, 9, 124], { floor: 1.8, r: 14, wall: 7, beach: 12, shingle: true, phase: 2.8 }),
]);
/** A point against a cove's bowl: how far from the notch (`r`), how far the bowl's floor reaches toward it (`edge`), and how far inland (`along`). */
function coveReach(c, x, z) {
  const dx = x - c.x, dz = z - c.z, along = dx * c.inland.x + dz * c.inland.z, across = -dx * c.inland.z + dz * c.inland.x;
  const theta = Math.atan2(across, along), r = c.r * (1 + .3 * Math.cos(theta)) * (1 + .08 * wobble(theta * 2.5, c.phase, 1, c.phase));
  return { r: Math.hypot(along, across), edge: r, along };
}
/** The two bays with a strand at their head: the east bay, under Merrath's flat, and the north-east bay. */
const bay = (id, name, a, b, spec) => freeze({ id, name, a: point(...a), b: point(...b), ...spec });
export const EAST_IZOL_BAYS = freeze([
  bay('east-bay', 'The east bay', [800, 1645.6], [800, 1703.3], { beach: 24 }),
  bay('north-east-bay', 'The north-east bay', [650, 1443.5], [700, 1472.4], { beach: 16 }),
]);
/**
 * "Stretches of coast where the interior slopes straight to the water": under the northern Presence, from the west
 * cove round its western foot toward where West Izol begins. There the land comes down to the sea as a steep
 * rocky slope rather than a face.
 */
export const EAST_IZOL_SLOPES = freeze([
  freeze({ id: 'presence-slope', a: point(414, 1694), b: point(436, 1636), reach: 36, cliff: .2 }),
]);
/** How much of a cliff the shore beside a point is: 1 on the headlands, 0 on a strand, between on a slope to the water. */
export function cliffShare(x, z) {
  let cliff = 1;
  for (const c of EAST_IZOL_COVES) cliff = Math.min(cliff, smooth(c.beach, c.beach + 7, Math.hypot(x - c.x, z - c.z)));
  for (const b of EAST_IZOL_BAYS) cliff = Math.min(cliff, smooth(b.beach, b.beach + 10, segment(x, z, b.a, b.b).distance));
  for (const s of EAST_IZOL_SLOPES) cliff = Math.min(cliff, mix(s.cliff, 1, smooth(s.reach * .55, s.reach, segment(x, z, s.a, s.b).distance)));
  return cliff;
}
/** The coves' bowls: the clifftop let down to the cove's floor behind each strand, the floor rising a little inland. */
function coveBowl(x, z, h) {
  for (const c of EAST_IZOL_COVES) {
    if (Math.abs(x - c.x) > 45 || Math.abs(z - c.z) > 45) continue;
    const at = coveReach(c, x, z);
    if (at.r >= at.edge + c.wall) continue;
    const floor = c.floor + .06 * Math.max(0, at.along);
    h = mix(Math.min(h, floor), h, smooth(at.edge, at.edge + c.wall, at.r));
  }
  return h;
}
/**
 * The headlands stand a little higher toward their points: the coast's convex corners, found off the atlas - every
 * corner of the outline the coast field has pulled inland, which is what smoothing does to a point - and none of
 * them within sixty metres of West Izol.
 */
const HEADS = freeze((() => {
  const out = [];
  for (const loop of REGION_OUTLINES[EAST_IZOL] ?? []) for (const a of loop) {
    if (landDistance(a.x, a.z) > -.5 || lineDistance(a.x, a.z) < 60) continue;
    out.push(point(a.x, a.z));
  }
  return out;
})());
function headLift(x, z, d) {
  let lift = 0;
  for (const h of HEADS) if (Math.abs(x - h.x) < 50 && Math.abs(z - h.z) < 50) lift = Math.max(lift, bell(Math.hypot(x - h.x, z - h.z) / 46));
  return lift * 5 * (1 - smooth(30, 70, d));
}
/** The sea floor and strand every region shares, below and up to the waterline (src/world/terrain/world-terrain.js `regionBase`). */
const beachAt = d => mix(-5.6, 1.4, smooth(-26, 6, d));
/**
 * The land let down to the water, as Selemis's and the Ascarth's are (`coastProfile`, src/content/regions/selemis/selemis-world.js): a
 * cliff keeps the land's height to within 3.6 m of the water and drops; a strand is the ordinary forty-metre
 * beach. Below the first forty centimetres it is the shore every region shares, so the waterline is exactly where
 * the coast field puts it.
 */
export function coastProfile(d, top, cliff) {
  const beach = beachAt(d);
  return mix(mix(beach, top, smooth(2, 40, d)), mix(beach, top, smooth(.4, 3.6, d)), cliff);
}

// ---------------------------------------------------------------------------
// The folds and the gullies
// ---------------------------------------------------------------------------
/**
 * A gully's line: the points given, walked every six metres and wandering up to `meander` metres either side of
 * them in a long slow swing, as a bed cut by water does - none at its head and none at its mouth, which stay where
 * they are put.
 */
const gully = (id, name, points, spec) => {
  const given = points.map(([x, z]) => point(x, z)), out = [given[0]];
  let total = 0;
  for (let i = 1; i < given.length; i++) total += Math.hypot(given[i].x - given[i - 1].x, given[i].z - given[i - 1].z);
  let run = 0;
  const amp = spec.meander ?? 2.6, phase = id.length * 1.7;
  for (let i = 1; i < given.length; i++) {
    const a = given[i - 1], b = given[i], length = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.round(length / 6));
    for (let k = 1; k <= n; k++) {
      const s = run + length * k / n, t = k / n, ends = Math.sin(Math.PI * Math.min(1, s / total));
      const off = i === given.length - 1 && k === n ? 0 : amp * ends * Math.sin(s / 26 + phase) * (.75 + .25 * Math.sin(s / 11 + phase * 2));
      out.push(point(a.x + (b.x - a.x) * t - (b.z - a.z) / length * off, a.z + (b.z - a.z) * t + (b.x - a.x) / length * off));
    }
    run += length;
  }
  return freeze({ id, name, points: freeze(out), ...spec });
};
/**
 * The water the island has, and there is none in it. The atlas draws no river edge on Izol and `Csa` and `Csb` are
 * dry summers by definition; the lore's towns stand where "rivers have cut their way to the sea", and the atlas
 * wins. So the winter's rain comes off the heights down five dry gullies, each in a fold, to a cove, a bay or a
 * clifftop: a bed of washed stones a few metres wide, never a water surface, never a lake.
 *
 * `fold` is the broad hollow the gully lies in - the sheltered ground the three forest hexes' woods stand in - as
 * its depth and half-width; `half` is the bed's half-width and `depth` how far it is let into the fold's floor. The
 * bed falls the whole way, never steeper than `grade`, and cuts a ravine into the clifftop where it must reach a
 * cove. `mouth` is the level it arrives at, or null for one that ends on a clifftop.
 */
export const EAST_IZOL_GULLIES = freeze([
  gully('merrath-gully', 'The Merrath gully', [[596, 1712], [632, 1700], [668, 1690], [706, 1680], [752, 1676], [797, 1674]],
    { fold: 6, foldHalf: 34, half: 3.4, depth: 1.2, grade: .3, mouth: 1.1 }),
  // These two hang: each ends on the clifftop over a cove, which is reached by sea.
  gully('fold-gully', 'The fold gully', [[648, 1772], [684, 1786], [722, 1798], [758, 1808], [774, 1812]],
    { fold: 5.5, foldHalf: 30, half: 3, depth: 1.2, grade: .42, mouth: null }),
  gully('north-fold-gully', 'The north fold gully', [[648, 1600], [684, 1590], [722, 1574], [756, 1558], [772, 1550]],
    { fold: 5, foldHalf: 30, half: 2.8, depth: 1.1, grade: .45, mouth: null }),
  gully('gate-gully', 'The gate gully', [[596, 1928], [628, 1946], [660, 1964], [699, 1992]],
    { fold: 3, foldHalf: 24, half: 3, depth: 1.2, grade: .42, mouth: 1.4 }),
  gully('north-bay-gully', 'The north-east bay gully', [[600, 1462], [628, 1470], [652, 1476], [672, 1470]],
    { fold: 3, foldHalf: 22, half: 2.6, depth: 1, grade: .4, mouth: 2.9 }),
]);
/** Each stretch of a gully's line, with where it starts down the gully, and a box round the whole gully to skip it by. */
const GULLY_SEGMENTS = new Map(EAST_IZOL_GULLIES.map(g => {
  const out = [];
  let run = 0;
  for (let i = 1; i < g.points.length; i++) {
    const a = g.points[i - 1], b = g.points[i], length = Math.hypot(b.x - a.x, b.z - a.z);
    out.push(freeze({ a, b, run, length, ux: (b.x - a.x) / length, uz: (b.z - a.z) / length }));
    run += length;
  }
  return [g.id, freeze(out)];
}));
const GULLY_BOXES = new Map(EAST_IZOL_GULLIES.map(g => [g.id, freeze({
  minX: Math.min(...g.points.map(p => p.x)) - 42, maxX: Math.max(...g.points.map(p => p.x)) + 42,
  minZ: Math.min(...g.points.map(p => p.z)) - 42, maxZ: Math.max(...g.points.map(p => p.z)) + 42,
})]));
const gullyLength = g => { const segs = GULLY_SEGMENTS.get(g.id), s = segs[segs.length - 1]; return s.run + s.length; };
/**
 * Where a point lies against one gully: how far from its line, and how far down it - read off every stretch,
 * each weighted by how near it is, so that it runs on smoothly round a bend where the nearest stretch changes
 * (read off the nearest alone it jumps there; read off each stretch alone, each stretch's end cuts a step).
 * Null beyond forty metres.
 */
function gullyField(g, x, z) {
  const box = GULLY_BOXES.get(g.id);
  if (x < box.minX || x > box.maxX || z < box.minZ || z > box.maxZ) return null;
  let near = Infinity;
  const reads = [];
  for (const s of GULLY_SEGMENTS.get(g.id)) {
    const t = clamp((x - s.a.x) * s.ux + (z - s.a.z) * s.uz, 0, s.length), distance = Math.hypot(x - s.a.x - s.ux * t, z - s.a.z - s.uz * t);
    if (distance > 52) continue;
    reads.push(distance, s.run + t);
    near = Math.min(near, distance);
  }
  if (near > 40) return null;
  let sum = 0, total = 0;
  for (let i = 0; i < reads.length; i += 2) { const w = Math.exp(-(reads[i] - near) / 2); sum += w * reads[i + 1]; total += w; }
  return { distance: near, along: sum / total };
}
/** The folds' hollows, before any bed is cut in them: full depth from a little below the head to a little above the sea. */
function foldCut(x, z) {
  let cut = 0;
  for (const g of EAST_IZOL_GULLIES) {
    const at = gullyField(g, x, z);
    if (!at || at.distance >= g.foldHalf) continue;
    const length = gullyLength(g), envelope = smooth(-10, 40, at.along) * (1 - smooth(length - 30, length + 5, at.along));
    cut = Math.max(cut, g.fold * bell(at.distance / g.foldHalf) * envelope);
  }
  return cut;
}

// ---------------------------------------------------------------------------
// The design: the island's own ground, before the line with West Izol
// ---------------------------------------------------------------------------
/** The top of the land at a point: the upland, the hills, the Presences, the folds and the kept ground, before the coast and the gullies. */
function landTop(x, z, d) {
  let h = uplandLevel(x, z) + hillLift(x, z) + headLift(x, z, d) + lumps(x, z, 1.1, 95) + lumps(x + 211, z - 97, .45, 34);
  h -= foldCut(x, z);
  for (const p of EAST_IZOL_PRESENCES) {
    const peak = presenceHeight(p, x, z);
    if (peak > h - 6) h = smax(h, peak, 5);
  }
  // Rock at height: the short wave is louder where the ground stands up, except on a shoulder's crest and round
  // a summit, which stays the top of its Presence.
  const high = smooth(38, 70, h);
  if (high > 0) {
    let calm = 1;
    for (const p of EAST_IZOL_PRESENCES) calm = Math.min(calm, smooth(p.platform + 2, p.platform + 22, Math.hypot(x - p.x, z - p.z)));
    h += lumps(x - 97, z + 241, 1.8, 19) * high * (1 - shoulderCrest(x, z)) * calm;
  }
  // The summit platforms are level, the shrine's ground, kept; and nothing round a summit stands over it.
  for (const p of EAST_IZOL_PRESENCES) {
    const r = Math.hypot(x - p.x, z - p.z);
    if (r < 40) h = Math.min(h, p.top);
    if (r < p.platform + 3) h = mix(p.top, h, smooth(p.platform - .5, p.platform + 3, r));
  }
  h = keepLevel(x, z, h);
  return coveBowl(x, z, h);
}

/** Each gully's bed, sampled every two metres down its line: never rising, never steeper than its grade. */
const GULLY_BEDS = new Map();
function gullyBed(g) {
  let bed = GULLY_BEDS.get(g.id);
  if (bed) return bed;
  const samples = [];
  const pts = g.points;
  let run = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], length = Math.hypot(b.x - a.x, b.z - a.z), steps = Math.max(1, Math.ceil(length / 2));
    for (let s = i === 1 ? 0 : 1; s <= steps; s++) {
      const x = a.x + (b.x - a.x) * s / steps, z = a.z + (b.z - a.z) * s / steps;
      samples.push({ x, z, along: run + length * s / steps, level: landTop(x, z, landDistance(x, z)) - g.depth });
    }
    run += length;
  }
  // Downhill all the way, and at the mouth no higher than its strand; a gully that ends on a clifftop has no mouth.
  if (g.mouth !== null) samples[samples.length - 1].level = Math.min(samples[samples.length - 1].level, g.mouth);
  for (let i = 1; i < samples.length; i++) samples[i].level = Math.min(samples[i].level, samples[i - 1].level);
  // Never steeper than its grade: where the ground falls faster - over a cliff - the bed cuts back into it.
  for (let i = samples.length - 2; i >= 0; i--) {
    const ds = samples[i + 1].along - samples[i].along;
    samples[i].level = Math.min(samples[i].level, samples[i + 1].level + g.grade * ds);
  }
  for (let pass = 0; pass < 2; pass++) for (let i = 1; i < samples.length - 1; i++)
    samples[i].level = Math.min(samples[i].level, (samples[i - 1].level + samples[i].level * 2 + samples[i + 1].level) / 4);
  bed = freeze(samples.map(s => freeze(s)));
  GULLY_BEDS.set(g.id, bed);
  return bed;
}
/** A gully's bed level `along` metres down it. */
function bedLevel(g, along) {
  const bed = gullyBed(g);
  let lo = 0, hi = bed.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (bed[m].along <= along) lo = m; else hi = m; }
  return mix(bed[lo].level, bed[hi].level, clamp((along - bed[lo].along) / Math.max(1e-6, bed[hi].along - bed[lo].along), 0, 1));
}
/** Where a point lies against the nearest gully: the gully, how far from its line, how far down it, its length and the bed's level there. */
export function gullyAt(x, z) {
  let best = null;
  for (const g of EAST_IZOL_GULLIES) {
    const at = gullyField(g, x, z);
    if (at && (!best || at.distance < best.distance)) best = { gully: g, distance: at.distance, along: at.along };
  }
  if (!best) return null;
  best.length = gullyLength(best.gully);
  best.level = bedLevel(best.gully, best.along);
  return best;
}
/**
 * The gullies' beds cut into the ground they cross, with banks as steep as the cut is deep - up to a ravine's
 * width, beyond which the ground is a valley's side and the gully leaves it alone. Each gully cuts for itself and
 * the lowest answers, so where two come near each other neither steps.
 */
function gullyCut(x, z, h) {
  let out = h;
  for (const g of EAST_IZOL_GULLIES) {
    const at = gullyField(g, x, z);
    if (!at || at.distance >= g.half + 17) continue;
    const length = gullyLength(g), level = bedLevel(g, at.along), cut = Math.max(0, h - level), valley = g.half + 3 + Math.min(cut * 1.15, 14);
    if (at.distance >= valley) continue;
    // A hanging gully lets go of its last few metres, so it ends on the clifftop rather than in a slot.
    const ends = g.mouth === null ? 1 - smooth(length - 8, length, at.along) : 1;
    out = Math.min(out, mix(h, mix(Math.min(level, h), h, smooth(g.half * .7, valley, at.distance)), ends));
  }
  return out;
}

/** The island's own ground at a point on it, with the coast let down to the water: no seam, nothing handed. */
export function eastIzolDesign(x, z, d = landDistance(x, z)) {
  const top = gullyCut(x, z, landTop(x, z, d));
  return coastProfile(d, top, cliffShare(x, z));
}

// ---------------------------------------------------------------------------
// The line with West Izol: the handed ground made seamless, and met to the far side
// ---------------------------------------------------------------------------
/**
 * How far in from the line the design gives way to the handed ground (`feather`), and how the step is read and met
 * (`reach`, `probe`, `step`, `widen`, `exact`): Celder's numbers (`CELDER_SEAM`), with a feather narrow enough to
 * leave the southern Presence's face standing clear of it.
 */
export const EAST_IZOL_SEAM = freeze({ feather: 28, reach: 40, probe: .05, step: .5, widen: 1, exact: 1 });
/**
 * The ground handed to East Izol, laid on the hex blend that has no seams (`seamlessTerrainMix`): the world's blend
 * steps by up to four metres at the hex corners round here (it takes in a hex two steps away all at once), and
 * within the feather that would show along East Izol's own hex edges where they run in from the line.
 */
function seamlessHanded(x, z, handed, d, legacy = false) {
  const seamless = seamlessTerrainMix(x, z), mixed = terrainMix(x, z);
  // West Izol already contributes this proportion of the continuous blend.
  // Apply only the remainder; adding it twice restores the old hex steps.
  return handed + (legacy ? 1 : 1 - izolSeamWeight(x, z)) * smooth(2, 40, d) * (seamless.base + relief(x, z, seamless.amp, seamless.wave) - mixed.base - relief(x, z, mixed.amp, mixed.wave));
}
const SEAMS = new WeakMap();
function seamLines(before, legacy) {
  let cache = SEAMS.get(before);
  if (!cache) { cache = []; SEAMS.set(before, cache); }
  if (cache[+legacy]) return cache[+legacy];
  const S = EAST_IZOL_SEAM, lines = [];
  for (const e of EAST_IZOL_LINE) {
    const count = Math.max(1, Math.ceil(e.length / S.step)), steps = new Float64Array(count + 1);
    for (let i = 0; i <= count; i++) {
      const s = Math.max(.1, Math.min(e.length - .1, e.length * i / count));
      const x = e.a.x + (e.b.x - e.a.x) * s / e.length, z = e.a.z + (e.b.z - e.a.z) * s / e.length;
      const ix = x - e.nx * S.probe, iz = z - e.nz * S.probe, d = landDistance(ix, iz);
      steps[i] = d > 0 ? before(x + e.nx * S.probe, z + e.nz * S.probe) - seamlessHanded(ix, iz, before(ix, iz), d, legacy) : 0;
    }
    const h = e.length / count, sums = new Float64Array(count + 1);
    for (let i = 1; i <= count; i++) sums[i] = sums[i - 1] + (steps[i - 1] + steps[i]) / 2 * h;
    lines.push({ ...e, h, steps, sums, count });
  }
  return (cache[+legacy] = freeze(lines));
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
/** How far the handed ground at a point is moved to meet West Izol at the line. */
export function eastIzolSeamMove(x, z, before, legacy = false) {
  if (!before) return 0;
  const lines = seamLines(before, legacy), reach = EAST_IZOL_SEAM.reach;
  let near = Infinity;
  const found = [];
  for (const line of lines) {
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
    const w = Math.exp(-k);
    total += w; sum += w * stepNear(line, p.t * line.length, p.distance * EAST_IZOL_SEAM.widen);
  }
  const move = sum / total * (1 - smooth(0, reach, near));
  if (near >= EAST_IZOL_SEAM.exact) return move;
  // Within a metre of the line the step is read where the point stands rather than off the samples.
  const [line, p] = nearest, s = clamp(p.t * line.length, .1, line.length - .1);
  const lx = line.a.x + (line.b.x - line.a.x) * s / line.length, lz = line.a.z + (line.b.z - line.a.z) * s / line.length;
  const ix = lx - line.nx * EAST_IZOL_SEAM.probe, iz = lz - line.nz * EAST_IZOL_SEAM.probe, d = landDistance(ix, iz);
  const exact = d > 0 ? before(lx + line.nx * EAST_IZOL_SEAM.probe, lz + line.nz * EAST_IZOL_SEAM.probe) - seamlessHanded(ix, iz, before(ix, iz), d, legacy) : 0;
  return mix(exact, move, smooth(0, EAST_IZOL_SEAM.exact, near));
}

// ---------------------------------------------------------------------------
// The ground
// ---------------------------------------------------------------------------
/**
 * The ground. `incoming` is the ground every other layer laid; `before(x, z)` answers the ground without East
 * Izol's layer, for measuring the seam with West Izol. Writes only on East Izol's own land - its hexes, and the
 * few metres of its shore that run onto a sea hex (`regionAt`'s fringe) - and answers `incoming` everywhere else,
 * the sea included, so the waterline is where the coast field puts it.
 */
export function eastIzolGround(x, z, incoming, before, legacy = false) {
  if (!inBox(x, z) || regionAt(x, z)?.name !== EAST_IZOL) return incoming;
  const d = landDistance(x, z);
  if (d <= 0) return incoming;
  const w = smooth(0, EAST_IZOL_SEAM.feather, lineDistance(x, z));
  const handed = w < 1 ? seamlessHanded(x, z, incoming, d, legacy) : incoming;
  const ground = w > 0 ? mix(handed, eastIzolDesign(x, z, d), w) : handed;
  return ground + eastIzolSeamMove(x, z, before, legacy);
}

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------
/**
 * The colours the ground is drawn in: the island's stone - dark grey and iron-brown low, slate-grey high - its
 * pasture and maquis, the folds' darker ground under the woods, the gullies' washed stones, the flats' greener
 * grass, and on the shore the stone of the cliffs and the shingle of the coves.
 */
export const EAST_IZOL_GROUND = freeze({
  pasture: 0x949a6b, dryPasture: 0xa3a272, plain: 0x8e9b63, maquis: 0x6f7a50, fold: 0x5f6f48, flat: 0x889f5f,
  ironStone: 0x6f6458, darkStone: 0x5e605c, slate: 0x7d8387, bed: 0x9a9484, stone: 0x6b6862, shingle: 0x8d8a82,
});
const rgb = c => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
const mixColour = (a, b, t) => { const p = rgb(a), q = rgb(b), k = clamp(t, 0, 1); return (Math.round(mix(p[0], q[0], k)) << 16) | (Math.round(mix(p[1], q[1], k)) << 8) | Math.round(mix(p[2], q[2], k)); };
const swatchNumber = ground => (typeof ground === 'string' && /^#[0-9a-f]{6}$/i.test(ground) ? parseInt(ground.slice(1), 16) : null);
const CSA_HEXES = new Set(Object.entries(EAST_IZOL_CLIMATE).filter(([, c]) => c === 'Csa').map(([k]) => k));

/**
 * What covers the ground at a point, each 0 to 1, for the colour, the scatter and the tests alike: `slope` (the
 * ground's own, as rise over run), `height` (0 at the water to 1 at the highest summit), `rock` (bare stone: steep
 * ground, and the Presences above their shoulders), `fold` (the sheltered hollows the woods stand in), `bed` (a
 * gully's stones), `kept` (ground kept for somebody), `cove` (a strand), `cliff` (a cliff's top and face), `dry`
 * (the `Csa` coast's thinner, paler turf) and `shoulder` (a Presence's walkable crest).
 */
export function eastIzolCover(x, z) {
  const d = landDistance(x, z), h = eastIzolDesign(x, z, d), e = 2;
  const gx = (eastIzolDesign(x + e, z) - eastIzolDesign(x - e, z)) / (2 * e), gz = (eastIzolDesign(x, z + e) - eastIzolDesign(x, z - e)) / (2 * e);
  const slope = Math.hypot(gx, gz), gul = gullyAt(x, z), cell = hexAt(x, z), crest = shoulderCrest(x, z);
  return {
    slope, height: clamp(h / 136, 0, 1),
    rock: Math.max(smooth(.75, 1.5, slope) * (1 - crest * .5), smooth(.45, .8, presenceShare(x, z)) * (1 - crest * .25)),
    fold: foldCut(x, z) / 6,
    bed: gul ? 1 - smooth(gul.gully.half * .6, gul.gully.half + 1.5, gul.distance) : 0,
    kept: keptShare(x, z),
    cove: 1 - cliffShare(x, z),
    cliff: cliffShare(x, z) * (1 - smooth(4, 14, d)),
    dry: CSA_HEXES.has(`${cell.q},${cell.r}`) ? 1 : 0,
    shoulder: crest,
  };
}
/**
 * East Izol's row in the ground-tint table (`GROUND_TINTS`, src/world/terrain/world-terrain.js), as 0xRRGGBB, or null off its own
 * ground. Every swatch of the blend is painted on East Izol's ground, and over the last twelve metres before the
 * West Izol line the colour fades back into the swatch it was given, so nothing changes colour at the line.
 */
let lastTint = { x: NaN, z: NaN, colour: 0 };
export function eastIzolTint(x, z, ground = null) {
  if (!inBox(x, z) || regionAt(x, z)?.name !== EAST_IZOL) return null;
  // The tint table asks once for every swatch in the blend at a point: the cover is worked out once.
  const colour = lastTint.x === x && lastTint.z === z ? lastTint.colour : (lastTint = { x, z, colour: ownColour(x, z) }).colour;
  const edge = lineDistance(x, z), swatch = swatchNumber(ground);
  return edge < 12 && swatch !== null ? mixColour(swatch, colour, smooth(0, 12, edge)) : colour;
}
function ownColour(x, z) {
  const c = eastIzolCover(x, z), g = EAST_IZOL_GROUND;
  let colour = mixColour(g.pasture, g.plain, 1 - c.dry);
  colour = mixColour(colour, g.dryPasture, c.dry * .5 * (1 - c.fold));
  colour = mixColour(colour, g.maquis, smooth(.25, .6, c.slope) * .55 * (1 - c.rock));
  colour = mixColour(colour, g.fold, smooth(.15, .6, c.fold) * .85);
  colour = mixColour(colour, g.flat, c.kept * .6);
  const stone = mixColour(mixColour(g.ironStone, g.darkStone, smooth(.05, .3, c.height)), g.slate, smooth(.35, .75, c.height));
  colour = mixColour(colour, stone, c.rock * .9);
  return mixColour(colour, g.bed, c.bed * .6);
}
/**
 * The shore's colour, for the shore stage of the terrain's tint (`SHORE_TINTS`, src/world/terrain/world-terrain.js), in the shape
 * the Ascarth's and Selemis's answer in: `sand` is how much of the world's sand tint to keep, `rock` how much of the
 * face is bare stone, and `stone` its colour. The cliffs are the island's dark stone from under the water to a rim
 * a few metres back; the shingle coves are grey stones; the bays and the two sand coves take the world's own sand.
 * Nothing within twenty metres of West Izol, whose shore is the world's.
 */
export function eastIzolShoreTint(x, z, d) {
  if (!inBox(x, z) || d < -30 || d > 16 || regionAt(x, z)?.name !== EAST_IZOL) return null;
  if (lineDistance(x, z) < 20) return null;
  const cliff = cliffShare(x, z);
  let shingle = 0;
  for (const c of EAST_IZOL_COVES) if (c.shingle) shingle = Math.max(shingle, 1 - smooth(c.beach, c.beach + 7, Math.hypot(x - c.x, z - c.z)));
  if (cliff <= 0 && shingle <= 0) return null;
  if (shingle > cliff) return { sand: 1, rock: shingle * .75 * (1 - smooth(6, 14, d)), stone: EAST_IZOL_GROUND.shingle };
  // Stone down the face to a rim a few metres back, and behind the rim the clifftop's own ground: the world's sand
  // runs fifteen metres in from every shore, and a headland's turf is not sand.
  const own = lastTint.x === x && lastTint.z === z ? lastTint.colour : ownColour(x, z);
  return { sand: 1 - cliff, rock: cliff, stone: mixColour(EAST_IZOL_GROUND.stone, own, smooth(4.5, 9, d)) };
}

// ---------------------------------------------------------------------------
// The country's own exports
// ---------------------------------------------------------------------------
const [HEARTH, MERRATH, NE_FLAT] = EAST_IZOL_KEPT;
const [NORTH, EAST, SOUTH] = EAST_IZOL_PRESENCES;
/** Where West Izol's Hearth Road ends: on this ground, at the western edge of the Hearthstone's site. */
export const HEARTH_ROAD_END = IZOL_ROAD.at(-1);
/** Where the developer's travel tool sets a traveler down: the central plain, south of the Hearth Road's end. */
export const EAST_IZOL_ARRIVAL = point(500, 1934);
/**
 * The places kept for what belongs to somebody, for the scenery to leave alone: a circle `{ id, name, x, z, radius }`,
 * or a box `{ id, name, x, z, halfX, halfZ, yaw }` turned by `yaw` (a point's box frame is `dx cos yaw - dz sin yaw`
 * and `dx sin yaw + dz cos yaw`), so that Merrath's flat keeps the flat and not the fold's wood beside it.
 */
const keptBox = k => freeze({ id: k.id, name: k.name, x: k.x, z: k.z, halfX: k.halfA + k.wander, halfZ: k.halfB + k.wander, yaw: -Math.atan2(k.axis.z, k.axis.x) });
export const EAST_IZOL_RESERVED = freeze([
  freeze({ id: HEARTH.id, name: HEARTH.name, x: HEARTH.x, z: HEARTH.z, radius: 24 }),
  keptBox(MERRATH),
  keptBox(NE_FLAT),
  ...EAST_IZOL_PRESENCES.map(p => freeze({ id: `${p.id}-summit`, name: 'A summit platform', x: p.x, z: p.z, radius: p.platform + 1 })),
]);
const place = (id, name, x, z, radius, description) => freeze({ id, name, region: REGION_IDS[EAST_IZOL], x, z, radius, description });
/** Places for the chart: natural places only, in plain words. The Presences stay unnamed, as the lore keeps them. */
export const EAST_IZOL_LANDMARKS = freeze([
  place('east-izol-central-plain', 'The central plain', HEARTH.x + 2, HEARTH.z - 30, 45,
    'Level grass at the middle of the island, the furthest ground from every shore, where the Hearth Road comes to its end. All three Presences stand up from here at once.'),
  place('east-izol-northern-presence', 'The northern Presence', NORTH.x, NORTH.z, 40,
    'A dome of grey rock on the island’s one mountain, its western flank running straight down into the sea. Its long north-eastern shoulder can be walked to a level summit, and nothing stands on it.'),
  place('east-izol-eastern-presence', 'The eastern Presence', EAST.x, EAST.z, 36,
    'The highest of the three: a horn of slate-grey rock with three arêtes. The eastern one can be walked, out over the plain toward the sea; the faces between them cannot.'),
  place('east-izol-southern-presence', 'The southern Presence', SOUTH.x, SOUTH.z, 36,
    'A tilted block: a long back rising out of the south head to a sheer face over the central plain, with the summit at the top of the face.'),
  place('east-izol-east-bay', 'The east bay', MERRATH.x + 30, MERRATH.z, 50,
    'A strand at the head of a bay on the east coast, between two cliffed headlands, and a flat of grass behind it where a gully comes down out of the folds. The open sea beyond, and nothing between it and whatever is east.'),
  place('east-izol-folds', 'The wooded folds', 680, 1702, 40,
    'Sheltered hollows on the eastern fall of the heights, where the island’s only woods stand out of the wind, each with a dry bed of washed stones down its floor.'),
  place('east-izol-north-arm', 'The north arm', 600, 1500, 50,
    'The island’s long northern arm: a spine of grass hills between two cliffed coasts, a bay on either side of it, and the Svaleen coast to the north-west on a clear day.'),
  place('east-izol-east-head', 'The east head', 822, 1590, 30,
    'The island’s easternmost point: grass to the edge of a cliff of dark stone, seabirds on its face, and open water to the east.'),
  place('east-izol-south-head', 'The south head', 615, 2140, 30,
    'The island’s southern point, cliffed on every side, where the back of the southern Presence comes down to the sea.'),
]);
/** Walked routes kept clear of scenery: the ways the ground gives, not roads. */
const trail = (id, width, points) => freeze({ id, width, points: freeze(points.map(([x, z]) => point(x, z))) });
export const EAST_IZOL_TRAILS = freeze([
  // From the Hearth Road's end north over the central plain, through the saddle under the northern Presence's
  // south-eastern foot and down the Merrath fold to the east bay. The principal journey.
  trail('east-izol-centre-to-the-east-bay', 4, [[492, 1892], [494, 1862], [514, 1836], [530, 1808], [531, 1790], [560, 1758], [590, 1727], [612, 1705], [660, 1690], [704, 1678], [760, 1676]]),
  // The east coast's clifftops, from the north-east bay's flat over Merrath's flat and the eastern Presence's
  // shoulder where it comes down to the coast, to the gate cove.
  trail('east-izol-east-coast', 3, [[664, 1482], [667, 1499], [706, 1540], [706, 1601], [712, 1624], [748, 1660], [748, 1745], [734, 1762], [734, 1777], [770, 1818], [772, 1850], [757, 1865], [734, 1876], [700, 1912], [659, 1956], [659, 1962], [665, 1968], [681, 1983], [694, 1988.6]]),
  // The north arm, from the saddle up its spine of hills to the north point.
  trail('east-izol-north-arm', 3, [[596, 1726], [602, 1694], [624, 1666], [624, 1610], [604, 1584], [601, 1510], [590, 1478], [560, 1440]]),
  // The three shoulders, from their feet to their platforms; the southern one round the block's west side to the south head first.
  trail('east-izol-northern-shoulder', 3, [[604, 1588], [578, 1612], [548, 1648], [518, 1685]]),
  trail('east-izol-eastern-shoulder', 3, [[768, 1846], [736, 1834], [690, 1838], [640, 1846], [596, 1863]]),
  trail('east-izol-southern-back', 3, [[512, 1944], [516, 1970], [532, 1988], [535, 2009], [554, 2036], [573, 2062], [581, 2080], [582, 2120], [600, 2138], [616, 2140], [617, 2120], [608, 2102], [601, 2070], [590, 2042], [586, 2012], [566, 1993]]),
]);
/**
 * Review views: high ones over the country, and walker's ones with the eye 1.8 m over the ground at its own
 * place (`walk: true`; the heights are the ground's, written out). Main.js lifts the fog for any view whose eye is
 * more than a hundred metres from its target, so the walker's ones that look at a Presence look past that.
 */
const view = (eye, target, walk = false) => freeze({ eye: freeze({ x: eye[0], z: eye[1], y: eye[2] }), target: freeze({ x: target[0], z: target[1], y: target[2] }), ...(walk ? { walk: true } : {}) });
export const EAST_IZOL_VIEWS = freeze({
  // Over the whole country from the south-east, out at sea.
  'east-izol': view([880, 2180, 160], [590, 1790, 30]),
  // From the road just west of West Izol's Sightstone: all three Presences at once, as the Sightstone promises.
  'east-izol-from-the-sightstone': view([345, 1812, 19.99], [545, 1815.5, 70], true),
  // From the western edge of the Hearthstone's site, where the Hearth Road ends: the northern and eastern Presences.
  'east-izol-hearthstone-site': view([497, 1898, 17.4], [589.3, 1779.8, 60.4], true),
  // Through the gap between the eastern and southern Presences, down the gate gully toward the sea.
  'east-izol-the-gate': view([530, 1945, 17.95], [700, 1985, 25], true),
  // On the northern Presence's shoulder, looking up it to the summit.
  'east-izol-northern-shoulder': view([578, 1612, 75.38], [515, 1688.5, 120], true),
  // On the eastern Presence's summit platform, looking north-west over the island to the northern one.
  'east-izol-summit': view([592, 1864.5, 137.8], [515, 1688.5, 122], true),
  // On the north arm's spine, looking south at the northern Presence.
  'east-izol-north-arm': view([570, 1450, 28.38], [515, 1688.5, 100], true),
  // The east bay and the flat behind it, from the water.
  'east-izol-east-bay': view([880, 1700, 30], [760, 1676, 6]),
  // The headland cliffs and the middle cove, from offshore.
  'east-izol-coast': view([880, 1880, 35], [775, 1860, 14]),
  // The wooded folds on the eastern fall, from over the east bay.
  'east-izol-folds': view([790, 1730, 45], [660, 1700, 20]),
  // The gulls on the east head.
  'east-izol-wildlife': view([790, 1600, 30], [835, 1585, 15]),
});
