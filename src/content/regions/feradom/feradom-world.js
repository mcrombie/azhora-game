/**
 * Feradom: the barrier hills along the duchy's inland edge, the passes through them, and the ground
 * the pass castles stand on.
 *
 * The lore (world-builder azhora_lore/geography/regions/feradom.md): "a forested ridge system running
 * along the country's inland edge, not dramatic in height but dense in tree cover and limited in
 * crossing points. A half-dozen usable passes exist... Each pass capable of carrying an army is held by
 * a fortified position... A tower above the narrows. A castle at the point where the valley behind a
 * pass opens enough to permit a staging defense. Cleared ground in front, walls at the back."
 *
 * The user, 27 September 2026: the hills are to be obstacles but not mountains, the border lined with
 * fortresses held by the Duchy's own army. So the hills are a belt some forty metres high at the most,
 * everywhere just inside the border from the Ordel to the East Lotharn. From outside, the belt is a
 * scarp: a talus slope that has to be climbed, then a band of bare rock that cannot be. Behind the rock
 * the hills roll - a front row of summits along the edge, a second row behind - and fall away gently to
 * the coast. Six passes cut through the belt: a gorge at the front (the narrows, a tower on its rim),
 * a basin behind it (the castle's yard, walled across from side to side), and a valley down to the
 * coast. A few gullies break the rock band where a determined traveler can scramble up, which is as
 * the lore has it: "a determined force can move through them".
 *
 * Everything is measured from the border. `d` is how far inside Feradom a point lies, from a line
 * through the middle of the atlas's hexagonal border; `s` is how far along it, from the Ordel's mouth
 * westward. The belt narrows where the coast comes close (`k`), and lies down into the Ordel's valley.
 * Pure: no three, no DOM.
 */
import { REGION_OUTLINES, hexOwnerAt, landDistance, terrainMix, seamlessTerrainMix, relief } from '../../../world/terrain/region-world.js';
import { ORDEL, riverLineDistance } from '../pueth/pueth-world.js';
import { lotharnShare, inLotharnBox } from '../east-lotharn/east-lotharn-world.js';

export const FERADOM = 'Feradom';
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const v = clamp((x - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); };
const freeze = Object.freeze;
const point = (x, z) => freeze({ x, z });
/** A smooth maximum and minimum, `k` metres of blending. */
const smax = (a, b, k) => { const h = clamp(.5 + .5 * (a - b) / k, 0, 1); return lerp(b, a, h) + k * h * (1 - h); };
const smin = (a, b, k) => -smax(-a, -b, k);
/** A seeded sequence, so the hills are the same hills every time. */
function sequence(seed) {
  let state = seed >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}

// ---------------------------------------------------------------------------
// The inland border and the line the belt is measured from
// ---------------------------------------------------------------------------
const INLAND_NEIGHBOURS = freeze(['Pueth', 'Amod', 'East Lotharn Mountains']);
/** The atlas's border between Feradom and its three inland neighbours, as hex edges from the Ordel's mouth westward. */
export const INLAND_BORDER = (() => {
  const loop = REGION_OUTLINES[FERADOM][0], edges = [];
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i], b = loop[(i + 1) % loop.length], length = Math.hypot(b.x - a.x, b.z - a.z);
    const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, nx = -(b.z - a.z) / length, nz = (b.x - a.x) / length;
    const one = hexOwnerAt(mx + nx * 6, mz + nz * 6), other = hexOwnerAt(mx - nx * 6, mz - nz * 6);
    const neighbour = one === FERADOM ? other : one;
    edges.push({ a, b, neighbour, inland: INLAND_NEIGHBOURS.includes(neighbour) });
  }
  const first = edges.findIndex((edge, i) => edge.inland && !edges[(i - 1 + edges.length) % edges.length].inland);
  const run = [];
  for (let i = 0; i < edges.length && edges[(first + i) % edges.length].inland; i++) run.push(edges[(first + i) % edges.length]);
  // The run goes round the country one way or the other; the Ordel's mouth, at the east, comes first.
  if (run[0].a.x < run[run.length - 1].b.x) run.reverse().forEach(edge => { const a = edge.a; edge.a = edge.b; edge.b = a; });
  return freeze(run.map(edge => freeze({ a: point(edge.a.x, edge.a.z), b: point(edge.b.x, edge.b.z), neighbour: edge.neighbour })));
})();

function chaikin(points, rounds) {
  let out = points;
  for (let r = 0; r < rounds; r++) {
    const next = [out[0]];
    for (let i = 0; i < out.length - 1; i++) {
      const a = out[i], b = out[i + 1];
      next.push({ x: a.x * .75 + b.x * .25, z: a.z * .75 + b.z * .25 }, { x: a.x * .25 + b.x * .75, z: a.z * .25 + b.z * .75 });
    }
    next.push(out[out.length - 1]);
    out = next;
  }
  return out;
}

/**
 * The line through the middle of the border's hexagonal zigzag, smoothed: the belt's `d = 0`. The zigzag
 * swings about fifteen metres either side of it, so nothing is raised within fifteen metres of it.
 */
export const MIDLINE = (() => {
  const mids = [INLAND_BORDER[0].a, ...INLAND_BORDER.map(edge => ({ x: (edge.a.x + edge.b.x) / 2, z: (edge.a.z + edge.b.z) / 2 })), INLAND_BORDER.at(-1).b];
  // Averaged over five midpoints first, so a corner of the border is a wide bend here: the belt behind a
  // tight bend would fold on itself.
  const weights = [1, 2, 3, 2, 1];
  const eased = mids.map((p, i) => {
    if (i === 0 || i === mids.length - 1) return p;
    let x = 0, z = 0, w = 0;
    weights.forEach((weight, o) => { const q = mids[clamp(i + o - 2, 0, mids.length - 1)]; x += q.x * weight; z += q.z * weight; w += weight; });
    return { x: x / w, z: z / w };
  });
  const points = chaikin(eased, 3), runs = [0];
  for (let i = 1; i < points.length; i++) runs.push(runs[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z));
  // Which side is Feradom's: tried in the middle of the line, forty metres out.
  const m = Math.floor(points.length / 2), a = points[m - 1], b = points[m + 1], len = Math.hypot(b.x - a.x, b.z - a.z);
  const side = hexOwnerAt(points[m].x - (b.z - a.z) / len * 40, points[m].z + (b.x - a.x) / len * 40) === FERADOM ? 1 : -1;
  // The direction along the line at each point, averaged over the segments either side, so the belt's
  // "inward" turns smoothly round a bend and a point far in does not jump from one segment to the next.
  const tangents = points.map((p, i) => {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)], len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    return point((b.x - a.x) / len, (b.z - a.z) / len);
  });
  return freeze({ points: freeze(points.map(p => point(p.x, p.z))), tangents: freeze(tangents), runs: freeze(runs), length: runs.at(-1), side });
})();

/** The point on the midline `s` metres from the Ordel's mouth, and the unit vectors along it and into Feradom. */
export function midlineAt(s) {
  const { points, tangents, runs } = MIDLINE, t = clamp(s, 0, MIDLINE.length);
  let lo = 0, hi = runs.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (runs[mid] <= t) lo = mid; else hi = mid; }
  const a = points[lo], b = points[hi], f = (t - runs[lo]) / (runs[hi] - runs[lo] || 1);
  const tx = lerp(tangents[lo].x, tangents[hi].x, f), tz = lerp(tangents[lo].z, tangents[hi].z, f), len = Math.hypot(tx, tz) || 1;
  const ax = tx / len, az = tz / len;
  return { x: lerp(a.x, b.x, f), z: lerp(a.z, b.z, f), along: point(ax, az), inward: point(-az * MIDLINE.side, ax * MIDLINE.side) };
}
/** World point `d` metres into Feradom from the midline at `s`. */
export function beltPoint(s, d) {
  const m = midlineAt(s);
  return point(m.x + m.inward.x * d, m.z + m.inward.z * d);
}
/** Exact `s` and `d` of a world point, by the nearest point of the midline. */
export function beltCoordinates(x, z) {
  const { points, runs } = MIDLINE;
  // The nearest of every sixth point first, then every segment for a hundred metres either side of it.
  let near = 0, nearest = Infinity;
  for (let i = 0; i < points.length; i += 6) { const q = (x - points[i].x) ** 2 + (z - points[i].z) ** 2; if (q < nearest) { nearest = q; near = i; } }
  let best = Infinity, s = 0, d = 0;
  for (let i = Math.max(0, near - 24); i < Math.min(points.length - 1, near + 24); i++) {
    const a = points[i], b = points[i + 1], dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / l2, 0, 1), px = a.x + dx * t, pz = a.z + dz * t;
    const distance = Math.hypot(x - px, z - pz);
    if (distance < best) {
      best = distance; s = runs[i] + t * Math.sqrt(l2);
      const cross = dx * (z - a.z) - dz * (x - a.x);
      d = distance * Math.sign(cross || 1) * MIDLINE.side;
    }
  }
  return { s, d };
}

// ---------------------------------------------------------------------------
// The measured grid: s, d, and the coast and the Ordel, every four metres
// ---------------------------------------------------------------------------
export const FERADOM_BOX = freeze({ minX: -1016, maxX: 164, minZ: -1172, maxZ: -332 });
const GRID_STEP = 4;
const GRID = (() => {
  const { minX, maxX, minZ, maxZ } = FERADOM_BOX;
  const cols = Math.floor((maxX - minX) / GRID_STEP) + 1, rows = Math.floor((maxZ - minZ) / GRID_STEP) + 1;
  const S = new Float32Array(cols * rows), D = new Float32Array(cols * rows), C = new Float32Array(cols * rows);
  const R = new Float32Array(cols * rows), F = new Float32Array(cols * rows), B = new Float32Array(cols * rows), Q = new Float32Array(cols * rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = minX + i * GRID_STEP, z = minZ + j * GRID_STEP, k = j * cols + i;
    const own = hexOwnerAt(x, z) === FERADOM;
    F[k] = own ? 1 : 0;
    const at = beltCoordinates(x, z);
    S[k] = at.s; D[k] = at.d;
    C[k] = landDistance(x, z);
    R[k] = Math.min(80, riverLineDistance(ORDEL, x, z, 80));
    let border = 60;
    for (const edge of INLAND_BORDER) {
      const dx = edge.b.x - edge.a.x, dz = edge.b.z - edge.a.z, t = clamp(((x - edge.a.x) * dx + (z - edge.a.z) * dz) / (dx * dx + dz * dz), 0, 1);
      border = Math.min(border, Math.hypot(x - edge.a.x - dx * t, z - edge.a.z - dz * t));
    }
    B[k] = own ? border : 0; Q[k] = border;
  }
  return { cols, rows, S, D, C, R, F, B, Q };
})();
function sampleGrid(field, x, z) {
  const { cols, rows } = GRID, fx = (x - FERADOM_BOX.minX) / GRID_STEP, fz = (z - FERADOM_BOX.minZ) / GRID_STEP;
  const i = clamp(Math.floor(fx), 0, cols - 2), j = clamp(Math.floor(fz), 0, rows - 2), u = clamp(fx - i, 0, 1), v = clamp(fz - j, 0, 1);
  const k = j * cols + i;
  return lerp(lerp(field[k], field[k + 1], u), lerp(field[k + cols], field[k + cols + 1], u), v);
}
export const inFeradomBox = (x, z) => x >= FERADOM_BOX.minX && x <= FERADOM_BOX.maxX && z >= FERADOM_BOX.minZ && z <= FERADOM_BOX.maxZ;

// ---------------------------------------------------------------------------
// The belt along the border: how deep the country is, and the shape of the hills
// ---------------------------------------------------------------------------
/** How far it is from the midline straight in to the sea, every eight metres along it, averaged over eighty. */
const DEPTH = (() => {
  const step = 8, count = Math.ceil(MIDLINE.length / step) + 1, raw = [];
  for (let n = 0; n < count; n++) {
    const m = midlineAt(n * step);
    let depth = 400;
    for (let r = 4; r <= 400; r += 4) {
      const x = m.x + m.inward.x * r, z = m.z + m.inward.z * r;
      if (landDistance(x, z) <= 0 || (r > 40 && hexOwnerAt(x, z) !== FERADOM)) { depth = r; break; }
    }
    raw.push(depth);
  }
  const out = raw.map((_, n) => { let sum = 0, weight = 0; for (let o = -5; o <= 5; o++) { const q = raw[clamp(n + o, 0, count - 1)]; sum += q; weight++; } return sum / weight; });
  return freeze({ step, values: freeze(out) });
})();
export function beltDepth(s) {
  const f = clamp(s / DEPTH.step, 0, DEPTH.values.length - 1), i = Math.min(DEPTH.values.length - 2, Math.floor(f));
  return lerp(DEPTH.values[i], DEPTH.values[i + 1], f - i);
}
/** The belt's scale where the coast is near: its widths and heights both shrink, so its slopes do not steepen. */
export const beltScale = s => clamp((beltDepth(s) - 40) / 190, .4, 1);

/**
 * The shape of the belt across, in metres at full scale: the foot of the talus, the rock band, the
 * upland's level, and where the back slope begins and ends. The talus is 0.55 on average and a climb in
 * its middle; the rock band rises eleven metres in four and a half, a cliff too steep for anybody even
 * taken slantwise (the climbing rule reads the rise the way a traveler is going, and he slips off
 * anything steeper than it lets him stand on). The back is walked.
 */
export const BELT = freeze({
  foot: 20, talus: 18, talusRise: 10, crag: 4, cragRise: 11,
  backFrom: 106, backTo: 162,
  /** The hills on the upland: the front row along the rock's edge, the second row behind it, and knolls between. */
  frontRow: 52, backRow: 90,
});

/** Where the rock band is broken by a gully a traveler can scramble up; `s` along the border. */
export const GULLY_HALF = 9;
/** A gully lays the rock band back this many times wider, which brings it just under the climbing rule's limit. */
const GULLY_WIDENS = 2.6;

// The passes are placed along the border by the ground on the other side (see PASSES below); the belt's
// own detail - its summits and gullies - keeps clear of them, so it is laid out after them.

/**
 * The six passes, east to west. `anchor` is where the pass meets the border; the valley through the
 * hills runs in from it, bending as the numbers in `bend` say (metres along the border at depths 0, 40,
 * 80, 120 and 160 in). The Road Pass carries the Feradom road on from the army's barrier in Pueth.
 */
const PASS_SPECS = freeze([
  { id: 'ordel-gap', name: 'The Ordel Gap', anchor: point(-150, -534), bend: [0, 2, 6, 9, 6], castle: 'small' },
  { id: 'road-pass', name: 'The Road Pass', anchor: point(-424, -534), bend: [0, 0, -3, -8, -12], castle: 'great' },
  { id: 'birch-pass', name: 'The Birch Pass', anchor: point(-654.8, -672.1), bend: [0, -3, -6, -4, 0], castle: 'small' },
  { id: 'amod-pass', name: 'The Amod Pass', anchor: point(-752.4, -783.3), bend: [0, 4, 8, 10, 8], castle: 'small' },
  { id: 'stone-pass', name: 'The Stone Pass', anchor: point(-878, -880), bend: [0, -2, -5, -9, -12], castle: 'small' },
  { id: 'fir-pass', name: 'The Fir Pass', anchor: point(-940.3, -993.5), bend: [0, 3, 4, 2, 0], castle: 'small' },
]);

/**
 * A pass across, in metres at full scale: the floor's rise from the mouth to the narrows' saddle, the
 * basin (the castle's yard, level), and the valley out to the coast; how wide the floor is at each
 * depth, and how steep the sides stand. `d` here is measured from the belt's foot.
 */
export const PASS = freeze({
  // [depth from the foot, floor height, floor half-width, side steepness]
  stations: freeze([
    freeze([-16, 0, 17, .45]),
    freeze([0, .4, 9, 1.1]),
    freeze([12, 3.2, 5.2, 2.4]),
    freeze([26, 6.4, 5.4, 2.4]),
    freeze([34, 6.6, 11, 2.1]),
    freeze([42, 6.6, 20, 1.9]),
    freeze([50, 6.6, 24, 1.9]),
    freeze([62, 6.6, 24, 1.9]),
    freeze([70, 6.6, 19, 1.7]),
    freeze([80, 7.2, 11, 1.0]),
    freeze([96, 7.6, 9, .75]),
    freeze([150, 0, 18, .5]),
  ]),
  /** The castle's yard: where the basin is level, from the foot, and how far across it is level at its widest. */
  yardFrom: 34, yardTo: 78, yardHalf: 24,
  /**
   * The castle's plan in the basin, [across, depth from the foot]: an octagon that follows the valley's
   * opening, its front and back walls straight across the floor, its long sides at the foot of the slopes.
   */
  castle: freeze([freeze([-13, 40]), freeze([13, 40]), freeze([21, 47]), freeze([21, 65]), freeze([13, 71]), freeze([-13, 71]), freeze([-21, 65]), freeze([-21, 47])]),
});

function passStation(d) {
  const st = PASS.stations;
  if (d <= st[0][0]) return { floor: st[0][1], half: st[0][2], steep: st[0][3] };
  for (let i = 1; i < st.length; i++) {
    if (d <= st[i][0]) {
      const a = st[i - 1], b = st[i], t = smooth(a[0], b[0], d);
      return { floor: lerp(a[1], b[1], t), half: lerp(a[2], b[2], t), steep: lerp(a[3], b[3], t) };
    }
  }
  const last = st.at(-1);
  return { floor: last[1], half: last[2], steep: last[3] };
}

const bendAt = (bend, d) => {
  const f = clamp(d / 40, 0, bend.length - 1), i = Math.min(bend.length - 2, Math.floor(f)), t = f - i;
  return lerp(bend[i], bend[i + 1], t * t * (3 - 2 * t));
};

export const PASSES = freeze(PASS_SPECS.map(spec => {
  const at = beltCoordinates(spec.anchor.x, spec.anchor.z), s = at.s, k = beltScale(s);
  const foot = BELT.foot * k;
  const axisPoint = d => beltPoint(s + bendAt(spec.bend, d), d);
  const axis = freeze([-16, 0, 12, 26, 42, 56, 70, 96, 124, 150].map(d => axisPoint(foot + d * k)));
  const yardMid = (PASS.yardFrom + PASS.yardTo) / 2;
  return freeze({
    ...spec, s, k, foot,
    axis,
    /** The pass's mouth at the border, the narrows' saddle, the middle of the castle's yard, and the valley's end. */
    mouth: axisPoint(foot - 8 * k), narrows: axisPoint(foot + 19 * k), yard: axisPoint(foot + yardMid * k), exit: axisPoint(foot + 150 * k),
    along: midlineAt(s).along, inward: midlineAt(s).inward,
  });
}));
export const passById = id => PASSES.find(pass => pass.id === id);
/** A point in a pass's own terms: `across` its floor from the middle line, `depth` in from the belt's foot, both at full scale. */
export function passPoint(pass, across, depth) {
  const d = pass.foot + depth * pass.k;
  return beltPoint(pass.s + bendAt(pass.bend, d) + across * pass.k, d);
}

/**
 * A pass's walls at a point already measured along the border: how far the ground stands above the
 * pass's floor there, or Infinity well off the pass. `rel` is the depth from the belt's foot at full scale.
 */
function passWalls(pass, s, d) {
  const k = pass.k, rel = (d - pass.foot) / k;
  if (rel < PROFILE.from || rel > PROFILE.to - 10) return Infinity;
  const across = Math.abs(s - (pass.s + bendAt(pass.bend, d))) / k;
  if (across > 90) return Infinity;
  const { half: plan, steep } = passStation(rel);
  const wander = rel > 30 ? Math.sin(rel * .23 + pass.s * .01) * 1.4 + Math.sin(rel * .51 + pass.s) * .6 : 0;
  const half = plan + wander * smooth(30, 40, rel);
  const e = across - half, fillet = 2.5;
  return (e <= 0 ? 0 : e < fillet ? steep * e * e / (2 * fillet) : steep * (e - fillet / 2)) * k;
}

/**
 * Each pass's floor, found once along its middle line: the ground there before the hills, smoothed over
 * forty metres, with the pass's own rise to its saddles (`PASS.stations`) on top; and level through the
 * castle's yard, with a ramp of eighteen metres in front of it and sixteen behind. Under the East
 * Lotharn the ground falls steeply toward the coast, and a floor that simply followed it would meet a
 * level yard in a step.
 */
const PROFILE = freeze({ from: -40, to: 200, step: 2, yard: 52 });
/** The steepest a pass's floor may run, anywhere along it: an easy walk, and a road. */
const FLOOR_GRADE = .6;
const PROFILES = new Map();
function passProfile(pass, baseAt) {
  if (PROFILES.has(pass.id)) return PROFILES.get(pass.id);
  const { from, to, step } = PROFILE, raw = [];
  for (let rel = from; rel <= to; rel += step) { const p = passPoint(pass, 0, rel); raw.push(baseAt(p.x, p.z)); }
  const n = raw.length, eased = raw.map((_, i) => {
    let sum = 0, weight = 0;
    for (let o = -10; o <= 10; o++) { const w = 11 - Math.abs(o); sum += raw[clamp(i + o, 0, n - 1)] * w; weight += w; }
    return sum / weight;
  });
  // Never above the ground itself, though: where the hills' foot stands on a rise, the smoothed line would
  // put the mouth's floor on the talus.
  const floors = eased.map((base, i) => Math.min(base, raw[i] + .3) + passStation(from + i * step).floor * pass.k);
  // The yard lies at the floor's own height, unless the ground falls so fast toward it from the mouth, or
  // away from it to the coast, that a floor at FLOOR_GRADE could not reach it: then as near as it can.
  const at = rel => floors[clamp(Math.round((rel - from) / step), 0, floors.length - 1)];
  const reach = (rel, towards) => FLOOR_GRADE * Math.abs(towards - rel) * pass.k;
  const mouth = at(-16), exit = at(150);
  const yardLevel = clamp(clamp(at(PROFILE.yard), mouth - reach(-16, PASS.yardFrom), mouth + reach(-16, PASS.yardFrom)),
    exit - reach(150, PASS.yardTo), exit + reach(150, PASS.yardTo));
  const levelled = floors.map((floor, i) => {
    const rel = from + i * step, w = smooth(PASS.yardFrom - 18, PASS.yardFrom, rel) * (1 - smooth(PASS.yardTo, PASS.yardTo + 16, rel));
    return lerp(floor, yardLevel, w);
  });
  // Out from the yard both ways the floor never climbs or falls faster than FLOOR_GRADE: under the East
  // Lotharn the ground falls away from a yard faster than a road can.
  const most = FLOOR_GRADE * step * pass.k, first = Math.round((PASS.yardFrom - from) / step), last = Math.round((PASS.yardTo - from) / step);
  for (let i = last + 1; i < levelled.length; i++) levelled[i] = clamp(levelled[i], levelled[i - 1] - most, levelled[i - 1] + most);
  for (let i = first - 1; i >= 0; i--) levelled[i] = clamp(levelled[i], levelled[i + 1] - most, levelled[i + 1] + most);
  const profile = freeze({ floors: freeze(levelled), yardLevel });
  PROFILES.set(pass.id, profile);
  return profile;
}
function passFloor(pass, rel, baseAt) {
  const { floors } = passProfile(pass, baseAt), f = clamp((rel - PROFILE.from) / PROFILE.step, 0, floors.length - 1);
  const i = Math.min(floors.length - 2, Math.floor(f));
  return lerp(floors[i], floors[i + 1], f - i);
}

// The hills' detail: gullies between the passes, and the summits.
export const GULLIES = freeze((() => {
  const out = [];
  for (let i = 0; i < PASSES.length - 1; i++) {
    const a = PASSES[i].s, b = PASSES[i + 1].s, gap = b - a;
    // One gully in every gap, a second in a long one; never within sixty metres of a pass.
    const spots = gap > 240 ? [a + gap * .3, a + gap * .72] : [a + gap * .5];
    for (const s of spots) if (s - a > 60 && b - s > 60) out.push(freeze({ s, at: beltPoint(s, BELT.foot * beltScale(s)) }));
  }
  return out;
})());
const gullyWeight = s => {
  let w = 0;
  for (const gully of GULLIES) w = Math.max(w, 1 - smooth(GULLY_HALF * .45, GULLY_HALF, Math.abs(s - gully.s)));
  return w;
};

/** The summits on the upland, laid out once along the border: the front row, the second row, knolls between. */
export const SUMMITS = freeze((() => {
  const random = sequence(20260927), out = [];
  const clear = (s, room) => PASSES.every(pass => Math.abs(s - pass.s) > room) && GULLIES.every(gully => Math.abs(s - gully.s) > room * .45);
  const row = (depth, spacing, jitter, radius, height, room, kind) => {
    for (let s = 20 + random() * spacing; s < MIDLINE.length - 10; s += spacing * (.75 + random() * .5)) {
      if (!clear(s, room)) continue;
      const k = beltScale(s), d = (depth + (random() - .5) * 2 * jitter) * k;
      const r = radius[0] + random() * (radius[1] - radius[0]), h = height[0] + random() * (height[1] - height[0]);
      const at = beltPoint(s, d), m = midlineAt(s), stretch = long[0] + random() * (long[1] - long[0]);
      // A ridge lies along the border, turned a little off it either way.
      const turn = (random() - .5) * .5, c = Math.cos(turn), n = Math.sin(turn);
      const along = point(m.along.x * c + m.inward.x * n, m.along.z * c + m.inward.z * n);
      out.push(freeze({ kind, s, d, x: at.x, z: at.z, r: r * Math.sqrt(k), long: r * Math.sqrt(k) * stretch, along, h: h * k }));
    }
  };
  let long = [1.8, 2.6];
  row(BELT.frontRow, 58, 5, [18, 24], [8, 14], 40, 'front');
  long = [1.4, 2.2];
  row(BELT.backRow, 70, 8, [22, 30], [10, 16], 34, 'back');
  long = [1, 1.5];
  row((BELT.frontRow + BELT.backRow) / 2, 80, 12, [12, 18], [4, 8], 28, 'knoll');
  return out;
})());
const SUMMIT_CELL = 48;
const SUMMIT_BUCKETS = (() => {
  const map = new Map();
  for (const summit of SUMMITS) {
    // The relief is sampled through a coordinate warp of up to seven metres.
    // Include that margin so changing buckets cannot drop an active summit.
    const reach = summit.long + 7;
    for (let cx = Math.floor((summit.x - reach) / SUMMIT_CELL); cx <= Math.floor((summit.x + reach) / SUMMIT_CELL); cx++)
      for (let cz = Math.floor((summit.z - reach) / SUMMIT_CELL); cz <= Math.floor((summit.z + reach) / SUMMIT_CELL); cz++) {
        const key = `${cx},${cz}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(summit);
      }
  }
  return map;
})();

/** Small relief everywhere on the hills, so no slope is a plane: a metre or so, over thirty. */
function roughness(x, z) {
  return Math.sin(x * .19 + Math.sin(z * .11) * 1.7) * .45 + Math.sin(z * .23 + x * .07) * .35 + Math.sin((x - z) * .41) * .15;
}

/**
 * The belt's rise above the ground it is laid on, before the passes are cut: the talus and rock band
 * at the front, the upland and its summits, the back slope. `s` and `d` as measured.
 */
/**
 * Along the Ordel the border is the river, and the hills lie down into its valley (`hillRise`); so there
 * the hills' foot is not the belt's usual one but the valley's edge, where the river no longer reaches,
 * and the rock band stands above the valley instead of being laid flat in it. Every eight metres along
 * the border, the depth at which the Ordel's reach ends; nothing where the river is far.
 */
const ORDEL_FOOT = (() => {
  const step = 8, count = Math.ceil(MIDLINE.length / step) + 1, raw = [];
  for (let n = 0; n < count; n++) {
    let edge = 0;
    for (let d = 0; d <= 80; d += 1) {
      const p = beltPoint(n * step, d);
      if (riverLineDistance(ORDEL, p.x, p.z, 60) >= 38) { edge = d; break; }
      edge = d;
    }
    raw.push(edge);
  }
  // Eased along the border, so the foot does not jump where the river bends away.
  const eased = raw.map((_, n) => { let most = 0; for (let o = -2; o <= 2; o++) most = Math.max(most, raw[clamp(n + o, 0, count - 1)]); return most; })
    .map((_, n, list) => { let sum = 0; for (let o = -3; o <= 3; o++) sum += list[clamp(n + o, 0, count - 1)]; return sum / 7; });
  return freeze({ step, values: freeze(eased) });
})();
const ordelFoot = s => {
  const f = clamp(s / ORDEL_FOOT.step, 0, ORDEL_FOOT.values.length - 1), i = Math.min(ORDEL_FOOT.values.length - 2, Math.floor(f));
  return lerp(ORDEL_FOOT.values[i], ORDEL_FOOT.values[i + 1], f - i);
};

/**
 * Where the scarp stands, `s` along the border: the depths of its foot, the top of the talus and the top
 * of the rock band, and the belt's scale there. The rock band is wider (and so climbable) in a gully.
 */
export function scarpAt(s) {
  const k = beltScale(s), foot = Math.max(BELT.foot * k, ordelFoot(s)), talusTop = foot + BELT.talus * k;
  const gully = gullyWeight(s), crag = BELT.crag * k * (1 + GULLY_WIDENS * gully);
  return { k, foot, talusTop, crag, cragTop: talusTop + crag, gully };
}

function beltRise(x, z, s, d) {
  const B = BELT, { k, foot, talusTop, crag, cragTop } = scarpAt(s);
  if (d <= foot) return 0;
  const front = B.talusRise * k * smooth(foot, talusTop + 2 * k, d) + B.cragRise * k * smooth(talusTop - crag * .15, cragTop, d);
  const back = 1 - smooth(B.backFrom * k, B.backTo * k, d);
  const plinth = front * back;
  // The summits, on the upland and its back slope; the front row's own faces break over the rock band's top.
  let hills = 0;
  const wx = x + Math.sin(z * .043 + 1.7) * 5 + Math.sin(z * .11) * 2, wz = z + Math.sin(x * .047 + .4) * 5 + Math.sin(x * .13 + 2) * 2;
  for (const summit of SUMMIT_BUCKETS.get(`${Math.floor(x / SUMMIT_CELL)},${Math.floor(z / SUMMIT_CELL)}`) ?? []) {
    const ox = wx - summit.x, oz = wz - summit.z, a = ox * summit.along.x + oz * summit.along.z, b = ox * summit.along.z - oz * summit.along.x;
    const q = Math.sqrt((a / summit.long) ** 2 + (b / summit.r) ** 2);
    if (q >= 1) continue;
    const bump = summit.h * (1 - q * q) * (1 - q * q);
    // A fixed smoothing width adds up to .75 m even when a new hill has zero
    // height at its radius. Taper it with the contribution: no hidden step at
    // the edge of a summit, while overlapping crests still blend smoothly.
    hills = smax(hills, bump, Math.min(3, bump));
  }
  const onUpland = smooth(cragTop - 3 * k, cragTop + 6 * k, d) * (1 - smooth((B.backTo - 12) * k, B.backTo * k, d));
  const swell = 3 * k * (Math.sin(s * .031 + d * .02) * .6 + Math.sin(s * .013 - d * .045 + 1.3) * .4) * smooth(cragTop, cragTop + 12 * k, d);
  return plinth + (hills + swell) * onUpland + roughness(x, z) * smooth(foot, talusTop, d) * back * k;
}

// ---------------------------------------------------------------------------
// The seams along the border
// ---------------------------------------------------------------------------
/**
 * The world's hex blend (`terrainMix`) has a seam along a hex edge wherever the hexes two steps
 * away differ, and Feradom's are hills and, under the East Lotharn, mountain: a step of up to six
 * metres along its inland border. As South Suval and the East Lotharn do on their own ground, the
 * blend over every hex in reach (`seamlessTerrainMix`) is put in its place - by how much of the land
 * round a point is Feradom's, which is continuous, so on both sides of the border and fading out
 * forty metres or so beyond it. Where the East Lotharn already makes the same correction, Feradom
 * makes only what is left of it; the Ordel's valley and the shore are left as they are.
 */
export function feradomSeam(x, z, ground) {
  if (!inFeradomBox(x, z) || sampleGrid(GRID.Q, x, z) > 70) return ground;
  const now = seamlessTerrainMix(x, z), land = 1 - (now.weights.outland ?? 0);
  if (land <= 1e-6) return ground;
  const own = (now.weights[FERADOM] ?? 0) / land;
  if (own <= .1) return ground;
  const lotharn = inLotharnBox(x, z) ? lotharnShare(x, z, now) : 0;
  const share = Math.min(smooth(.1, .6, own), 1 - lotharn) * smooth(2, 40, sampleGrid(GRID.C, x, z)) * smooth(20, 40, sampleGrid(GRID.R, x, z));
  if (share <= 0) return ground;
  const was = terrainMix(x, z);
  return ground + (now.base + relief(x, z, now.amp, now.wave) - was.base - relief(x, z, was.amp, was.wave)) * share;
}

/** Where the belt dies away at either end of the border: from nothing at the first to full height at the second, metres along. */
const END_TAPER = freeze([30, 110]);
/** How far a point lies inside Feradom's own ground, from the grid; 0 on the border or outside. */
const ownShare = (x, z) => sampleGrid(GRID.F, x, z);

/**
 * The barrier hills' rise above the ground they are laid on, before the passes are cut through them:
 * 0 outside the belt. The belt lies down into the Ordel's valley, does not reach the sea, and dies away
 * at both ends of the border.
 */
export function hillRise(x, z, frontLevel = null, ground = 0) {
  if (!inFeradomBox(x, z)) return 0;
  const own = ownShare(x, z);
  if (own <= 0 || hexOwnerAt(x, z) !== FERADOM) return 0;
  const s = sampleGrid(GRID.S, x, z), d = sampleGrid(GRID.D, x, z);
  if (d <= 0) return 0;
  let rise = beltRise(x, z, s, d);
  if (rise <= 0) return 0;
  // Where the ground falls away behind the hills' foot - under the East Lotharn, the mountains' own
  // foot falling toward the coast - the scarp is raised by that fall, so it stands its full height
  // above the ground in front of it; over the upland behind, the hills let the ground's fall come back.
  if (frontLevel) {
    const { k, foot, talusTop, cragTop } = scarpAt(s);
    const fall = Math.max(0, frontLevel(s) - ground);
    if (fall > 0) rise += fall * smooth(foot, talusTop, d) * (1 - smooth(cragTop + 10 * k, BELT.backFrom * k, d));
  }
  const ordel = sampleGrid(GRID.R, x, z), coast = sampleGrid(GRID.C, x, z);
  const ends = smooth(END_TAPER[0], END_TAPER[1], s) * (1 - smooth(MIDLINE.length - END_TAPER[1], MIDLINE.length - END_TAPER[0], s));
  // Never right up against the atlas's border, whose hexagonal tips reach in toward the hills' foot.
  const border = sampleGrid(GRID.B, x, z);
  return rise * smooth(22, 36, ordel) * smooth(6, 30, coast) * smooth(.5, 1, own) * smooth(0, 6, border) * ends;
}
/** Inside the hills a pass's floor may be cut this far below the ground the hills stand on. */
const PASS_DIG = 6;
/**
 * The hills with the passes cut through them. With `baseAt` (the ground before the hills, anywhere) each
 * pass's floor is its own profile; without it, the floor simply rises with the ground by the stations.
 */
/**
 * The ground at the hills' foot all along the border, every four metres, averaged over twenty-four: what
 * the scarp is measured from (`hillRise`). Found the first time the world's ground is known.
 */
let FRONT = null;
function frontLevelFor(baseAt) {
  if (!FRONT) {
    const step = 4, count = Math.ceil(MIDLINE.length / step) + 1, raw = [];
    for (let n = 0; n < count; n++) { const s = n * step, p = beltPoint(s, scarpAt(s).foot); raw.push(baseAt(p.x, p.z)); }
    const eased = raw.map((_, n) => { let sum = 0; for (let o = -3; o <= 3; o++) sum += raw[clamp(n + o, 0, count - 1)]; return sum / 7; });
    FRONT = s => { const f = clamp(s / step, 0, count - 1), i = Math.min(count - 2, Math.floor(f)); return lerp(eased[i], eased[i + 1], f - i); };
  }
  return FRONT;
}

function hillsAndPasses(x, z, ground, baseAt) {
  const rise = hillRise(x, z, baseAt ? frontLevelFor(baseAt) : null, ground);
  let height = ground + rise;
  const s = sampleGrid(GRID.S, x, z), d = sampleGrid(GRID.D, x, z);
  if (d < -30) return height;
  const floor = baseAt ? null : ground;
  for (const pass of PASSES) {
    if (Math.abs(s - pass.s) > 110) continue;
    const walls = passWalls(pass, s, d);
    if (!Number.isFinite(walls)) continue;
    const rel = (d - pass.foot) / pass.k;
    const cut = (baseAt ? passFloor(pass, rel, baseAt) : floor + passStation(rel).floor * pass.k) + walls;
    const bounded = Math.max(cut, ground - PASS_DIG * smooth(1, 6, rise));
    height = rise > 0 ? smin(height, bounded, 1.2) : Math.min(height, bounded);
  }
  return height;
}

// ---------------------------------------------------------------------------
// Pads: level ground for the towers and the castles
// ---------------------------------------------------------------------------
/**
 * The level ground each work stands on. A castle's yard is the pass's own basin floor; a tower above the
 * narrows stands on a pad cut into the rim of the gorge, on the side the border bends away from; a
 * watchtower stands on a front-row summit, levelled.
 */
export const TOWERS = freeze((() => {
  const out = [];
  for (const pass of PASSES) {
    const k = pass.k, side = pass.id === 'road-pass' ? -1 : (PASSES.indexOf(pass) % 2 ? 1 : -1);
    const d = pass.foot + 24 * k, s = pass.s + bendAt(pass.bend, d) + side * (5.4 + 15) * k;
    const at = beltPoint(s, d);
    out.push(freeze({ id: `${pass.id}-tower`, kind: 'narrows', pass: pass.id, side, x: at.x, z: at.z, s, d, r: 5.5, size: 6.2, height: 11 }));
  }
  // A watchtower in every stretch between two passes: on the front-row summit furthest from both, or, where
  // the stretch has none clear of the passes, on the upland just behind the rock band, clear of any gully.
  for (let i = 0; i < PASSES.length - 1; i++) {
    const a = PASSES[i].s + 45, b = PASSES[i + 1].s - 45, clear = s => Math.min(s - a, b - s);
    const summit = SUMMITS.filter(one => one.kind === 'front' && clear(one.s) > 0).sort((p, q) => clear(q.s) - clear(p.s))[0];
    let spot = summit ? { s: summit.s, d: summit.d, x: summit.x, z: summit.z } : null;
    if (!spot) {
      const mid = (a + b) / 2, s = [0, 25, -25, 45, -45].map(o => mid + o).find(t => GULLIES.every(g => Math.abs(t - g.s) > GULLY_HALF + 8)) ?? mid;
      const d = scarpAt(s).cragTop + 10 * beltScale(s), at = beltPoint(s, d);
      spot = { s, d, x: at.x, z: at.z };
    }
    out.push(freeze({ id: `watch-${PASSES[i].id}-${PASSES[i + 1].id}`, kind: 'watch', ...spot, r: 4.2, size: 4.6, height: 8 }));
  }
  return out;
})());

/**
 * The castles' yards: each pass's basin within the castle's plan (`PASS.castle`), levelled - the hills
 * are laid on ground that itself slopes, most of all under the East Lotharn, and a yard must not.
 */
export const YARDS = freeze(PASSES.map(pass => {
  const corners = freeze(PASS.castle.map(([across, depth]) => passPoint(pass, across, depth)));
  const centre = passPoint(pass, 0, (PASS.castle[0][1] + PASS.castle[4][1]) / 2);
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const c of corners) { minX = Math.min(minX, c.x); maxX = Math.max(maxX, c.x); minZ = Math.min(minZ, c.z); maxZ = Math.max(maxZ, c.z); }
  return freeze({ id: `${pass.id}-yard`, pass: pass.id, x: centre.x, z: centre.z, corners, bounds: freeze({ minX, maxX, minZ, maxZ }) });
}));
/** How far outside a yard's plan a point lies; negative inside. */
function outsideYard(yard, x, z) {
  const c = yard.corners;
  let best = Infinity, inside = false;
  for (let i = 0, j = c.length - 1; i < c.length; j = i++) {
    const a = c[j], b = c[i], dx = b.x - a.x, dz = b.z - a.z, t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
    best = Math.min(best, Math.hypot(x - a.x - dx * t, z - a.z - dz * t));
    if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside ? -best : best;
}
/** How far a yard's levelling reaches beyond its plan, and a pad's beyond its own radius. */
const YARD_BLEND = 4, PAD_BLEND = 5;
const LEVELS = new Map();
/** A pad's height, found the first time anybody asks: the hills' ground at its middle. */
function levelOf(tower, baseAt) {
  if (!LEVELS.has(tower.id)) LEVELS.set(tower.id, hillsAndPasses(tower.x, tower.z, baseAt(tower.x, tower.z), baseAt));
  return LEVELS.get(tower.id);
}

/**
 * Ground with Feradom's barrier hills on it, the passes cut through them. Anything outside the belt is
 * handed back untouched. `baseAt` is the ground before the hills, anywhere: with it each pass's floor
 * follows its own profile and the castles' yards and the towers' pads are level; without it (a test of
 * the hills' shape alone) the floors follow the ground and nothing is levelled.
 */
export function feradomGround(x, z, ground, baseAt = null) {
  if (!inFeradomBox(x, z) || ownShare(x, z) <= 0) return ground;
  let height = hillsAndPasses(x, z, ground, baseAt);
  if (!baseAt) return height;
  for (const yard of YARDS) {
    const b = yard.bounds;
    if (x < b.minX - YARD_BLEND || x > b.maxX + YARD_BLEND || z < b.minZ - YARD_BLEND || z > b.maxZ + YARD_BLEND) continue;
    const out = outsideYard(yard, x, z);
    if (out < YARD_BLEND) height = lerp(passProfile(PASSES.find(pass => pass.id === yard.pass), baseAt).yardLevel, height, smooth(0, YARD_BLEND, out));
  }
  for (const tower of TOWERS) {
    const reach = tower.r + PAD_BLEND;
    if (Math.abs(x - tower.x) > reach || Math.abs(z - tower.z) > reach) continue;
    const distance = Math.hypot(x - tower.x, z - tower.z);
    if (distance < reach) height = lerp(levelOf(tower, baseAt), height, smooth(tower.r, reach, distance));
  }
  return height;
}
/** A castle's yard level, once the world's ground is known: `baseAt` as for `feradomGround`. */
export const yardLevel = (passId, baseAt) => passProfile(PASSES.find(pass => pass.id === passId), baseAt).yardLevel;

// ---------------------------------------------------------------------------
// What the rest of the game asks
// ---------------------------------------------------------------------------
/**
 * How far the world's own ground grid is sunk under the hills, which draw their own finer ground
 * (src/content/regions/feradom/feradom-scenery.js): not at all at the foot, all the way where they are a couple of metres up.
 */
export function feradomTerrainSink(x, z) {
  const rise = hillRise(x, z);
  return rise > 0 ? 50 * smooth(.8, 2.5, rise) : 0;
}
/** Whether the climbing rule holds here: on the barrier hills, never on the lowland or in another country. */
export const inBarrierHills = (x, z) => hillRise(x, z) > .8;
/** The rock band: too steep for trees, bare. */
export function onFeradomCrag(x, z) {
  if (!inFeradomBox(x, z)) return false;
  const s = sampleGrid(GRID.S, x, z), d = sampleGrid(GRID.D, x, z), { talusTop, crag, gully } = scarpAt(s);
  return d > talusTop - crag * .2 && d < talusTop + crag + 1 && gully < .5;
}
/** Where a point is in the belt: `s`, `d`, the scale there, and the nearest pass. */
export function beltAt(x, z) {
  const s = sampleGrid(GRID.S, x, z), d = sampleGrid(GRID.D, x, z);
  let pass = null, best = Infinity;
  for (const one of PASSES) { const gap = Math.abs(s - one.s); if (gap < best) { best = gap; pass = one; } }
  return { s, d, k: beltScale(s), pass, fromPass: best };
}
/** Distance across a pass's floor from its middle line, in metres; Infinity off its length. */
export function passAcross(pass, x, z) {
  const s = sampleGrid(GRID.S, x, z), d = sampleGrid(GRID.D, x, z), rel = (d - pass.foot) / pass.k;
  if (rel < -30 || rel > 170) return Infinity;
  return Math.abs(s - (pass.s + bendAt(pass.bend, d)));
}
/** The pass's floor half-width at a point, from its stations. */
export function passHalfWidth(pass, x, z) {
  const d = sampleGrid(GRID.D, x, z);
  return passStation((d - pass.foot) / pass.k).half * pass.k;
}
