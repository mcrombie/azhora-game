/**
 * South Celder, and the plain both Celders stand on: terrain, climate and water only (src/content/regions/south-celder/south-celder-scenery.js
 * and src/content/regions/south-celder/south-celder-wildlife.js carry the grass and the animals). Nothing here belongs to anybody: no
 * Canerd and no mound, no horse-lord's house, herd, stud, farm, road or quarry.
 *
 * **One plain, laid once.** The lore treats Celder as one country of grass and the atlas splits it in two along
 * fourteen hex edges, so the ground of both is one function (`celderLand`, below) and each country writes it on
 * its own hexes only (`southCelderGround`, and `northCelderGround` in src/content/regions/canerd/north-celder-world.js). Nothing about
 * it changes at the shared line: no ridge, valley or step, because there is nothing there to make one.
 *
 * The plain, read off celder.md: "a gentle gradient from the mountain base that gives the rivers enough current
 * to run clear ... low swells ... not significant enough to be called hills ... significant enough to give
 * horses purchase and give cavalry commanders sight lines". So:
 * - **the fall**: the ground falls toward the water at `CELDER_PLAIN.fall` (1 in 110), from about 22 m under the
 *   western foothills to the banks of the Mithala's border streams, which are the only water the atlas draws
 *   here. It falls toward the nearest of them, so South Celder drains north-east to the one place it can leave,
 *   the corner between the two Celders, South Mithala and the West Lotharn's foot, where the Celder water rises;
 * - **the swells**, three long rolls of 180 to 520 m, up to three metres either way, quietened near the water;
 * - **the foothills** along the western edge, rounded rises of four to eight metres under the unbuilt East
 *   Oremindi ("the transition zone between the plain and the Oremindi proper");
 * - **the river terraces**: a floodplain a metre above the water for fifty metres out, then a riser of 1.3 m to
 *   the terrace tread, which is the plain itself and "among the finest grazing country on the continent";
 * - **the silt fans**: four low cones where the mountain water comes down onto the plain margin at the
 *   foothills' foot and "spreads its mineral silt", each a couple of metres high and two hundred long;
 * - **the head**: the one atlas river edge between the two Celders, (-2,94)|(-2,95), is the Celder water's
 *   head reach above the three-country corner, built as a dry gravel bed falling 0.7 m in sixty: the snowmelt
 *   runs down it in spring and the summer leaves it dry (`CELDER_HEAD`).
 *
 * **The borders.** Within reach of every outer edge the plain gives way to the ground handed to it, laid on the
 * hex blend that has no seams (`seamlessTerrainMix`), and then that ground is moved to meet the far side exactly
 * at the line (`celderSeamMove`, East Pyros's `eastPyrosSeamMove`, read the same way). Built or unbuilt, the far
 * side is never moved. Along the Mithala's two border streams the plain does not feather at all: within 13 m of
 * either stream's line the channel and its bank are the Mithala's own, and the plain comes down to that bank's
 * level by 24 m, so the stream's Celder bank is real ground at the water's level and nothing of this country
 * stands in its water.
 */
import { regionAt, hexOwnerAt, hexAt, REGION_CELLS, REGION_OUTLINES, REGION_IDS, terrainMix, seamlessTerrainMix, relief, landDistance } from '../../../world/terrain/region-world.js';
import { MITHALA_WEST_ARM, MITHALA_CELDER_WATER, courseDistance } from '../western-regions/west-regions.js';
import { courseSample, WEST_PROFILES } from '../western-regions/west-ground.js';
import { westLotharnShare } from '../west-lotharn/west-lotharn-world.js';

const freeze = Object.freeze, point = (x, z) => freeze({ x, z });
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

export const SOUTH_CELDER = 'South Celder';
const NORTH_CELDER_NAME = 'North Celder';
/** The two countries the plain is laid on. */
export const CELDER_COUNTRIES = freeze([SOUTH_CELDER, NORTH_CELDER_NAME]);
const isCelder = name => name === SOUTH_CELDER || name === NORTH_CELDER_NAME;
export const SOUTH_CELDER_CELLS = freeze(REGION_CELLS[SOUTH_CELDER] ?? []);
export const CELDER_CELLS = freeze([...SOUTH_CELDER_CELLS, ...(REGION_CELLS[NORTH_CELDER_NAME] ?? [])]);
/**
 * The climate, per hex off the World Builder map: hot-summer continental, `Dfa`, on 36 of the 37 hexes, and one
 * `Cfa` at (-2,96) against the West Lotharn's foot. The sky stays the world's default, as the Mithala's does:
 * the plain is the same continental country as theirs, one step nearer the mountains.
 */
export const SOUTH_CELDER_KOPPEN = 'Dfa';
export const SOUTH_CELDER_CLIMATE = freeze(Object.fromEntries(SOUTH_CELDER_CELLS.map(c => [`${c.q},${c.r}`, c.q === -2 && c.r === 96 ? 'Cfa' : 'Dfa'])));
/** Both countries with a hex's half-width round them. */
export const CELDER_BOX = freeze({
  minX: Math.min(...CELDER_CELLS.map(c => c.x)) - 60, maxX: Math.max(...CELDER_CELLS.map(c => c.x)) + 60,
  minZ: Math.min(...CELDER_CELLS.map(c => c.z)) - 60, maxZ: Math.max(...CELDER_CELLS.map(c => c.z)) + 60,
});
const inCelderBox = (x, z) => x > CELDER_BOX.minX && x < CELDER_BOX.maxX && z > CELDER_BOX.minZ && z < CELDER_BOX.maxZ;
/** Whether a point is on either Celder's ground. */
export function celderOwns(x, z) { return inCelderBox(x, z) && isCelder(hexOwnerAt(x, z)); }
/** Whether a point is on South Celder's own ground. */
export function southCelderOwns(x, z) { return regionAt(x, z)?.name === SOUTH_CELDER; }

const segment = (x, z, a, b) => {
  const dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz, t = l2 ? clamp(((x - a.x) * dx + (z - a.z) * dz) / l2, 0, 1) : 0;
  return { distance: Math.hypot(x - a.x - dx * t, z - a.z - dz * t), t };
};

// ---------------------------------------------------------------------------
// The outer border of the one plain
// ---------------------------------------------------------------------------
/**
 * How far in from each kind of border the plain gives way to the handed ground. The West Lotharn's foot is the
 * widest, because the hex blend there carries the range's 70 m base well onto this side and the plain rises to it
 * as an apron; the unbuilt East Oremindi next, because the foothills stand highest there; the Mithala's edges the
 * least, because the streams' own banks do the joining.
 */
export const CELDER_FEATHER = freeze({ 'West Lotharn Mountains': 90, Yunethre: 60, 'South Oremindi Mountains': 60,
  'South Mithala': 40, 'West Mithala': 40, 'East Oremindi Mountains': 80, Henborth: 60, streamSide: 14 });
/**
 * Every hex edge of either country whose far side is not a Celder: the outer border of the one plain. `far` is the
 * neighbour; the unbuilt ground is told apart by where it lies (the atlas puts Henborth north of row 90 from
 * x -2750 east, and the East Oremindi west of both countries, round North Celder's north-western corner too).
 */
export const CELDER_EDGES = freeze((() => {
  const edges = [];
  for (const country of CELDER_COUNTRIES) for (const loop of REGION_OUTLINES[country] ?? []) for (let i = 0; i < loop.length; i++) {
    const a = loop[i], b = loop[(i + 1) % loop.length], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
    let nx = dz / length, nz = -dx / length;
    if (hexOwnerAt(mx + nx, mz + nz) === country) { nx = -nx; nz = -nz; }
    let far = hexOwnerAt(mx + nx, mz + nz) ?? 'Open country';
    if (isCelder(far)) continue;
    if (far === 'Open country') far = hexAt(mx + nx * 10, mz + nz * 10).r < 90 && mx + nx * 50 > -2800 ? 'Henborth' : 'East Oremindi Mountains';
    // North Celder's Mithala edges are where the two streams run, and the streams do the joining there.
    const feather = country === NORTH_CELDER_NAME && /Mithala/.test(far) ? CELDER_FEATHER.streamSide : CELDER_FEATHER[far] ?? 60;
    edges.push(freeze({ a, b, nx, nz, length, far, country, feather }));
  }
  return edges;
})());
const WEST_EDGES = CELDER_EDGES.filter(e => e.far === 'East Oremindi Mountains');

/** How much of the plain's own design a point takes from the border: 0 at the line, 1 past every feather. */
function borderWeight(x, z) {
  let w = 1;
  for (const e of CELDER_EDGES) {
    if (x < Math.min(e.a.x, e.b.x) - e.feather || x > Math.max(e.a.x, e.b.x) + e.feather
      || z < Math.min(e.a.z, e.b.z) - e.feather || z > Math.max(e.a.z, e.b.z) + e.feather) continue;
    const d = segment(x, z, e.a, e.b).distance;
    if (d < e.feather) w *= smooth(0, e.feather, d);
    if (w <= 0) return 0;
  }
  return w;
}
/** Distance to the western border, where the foothills are. */
function westDistance(x, z) {
  let d = Infinity;
  for (const e of WEST_EDGES) d = Math.min(d, segment(x, z, e.a, e.b).distance);
  return d;
}

// ---------------------------------------------------------------------------
// The water the plain falls to
// ---------------------------------------------------------------------------
/** The Mithala's two border streams, which this plain's ground meets but never shapes. */
export const CELDER_BORDER_STREAMS = freeze([MITHALA_WEST_ARM, MITHALA_CELDER_WATER]);
const HEAD_FOOT = MITHALA_CELDER_WATER.points[0];
/**
 * **The Celder water's head**: the one atlas river edge between the two Celders, from the corner of (-2,94),
 * (-2,95) and (-3,95) to the corner where the Celder water begins. Built as a dry bed: gravel, 1.6 m either side
 * of its line, falling 0.7 m over its sixty metres to meet the water at the head of the Celder water's own
 * channel. It carries South Celder's snowmelt in spring and nothing in summer, so there is no water surface in it
 * for anybody to draw, and nothing in it to wade.
 */
export const CELDER_HEAD = freeze({
  id: 'celder-head', name: "The Celder water's head",
  from: point(-2200, -952.7), to: point(HEAD_FOOT.x, HEAD_FOOT.z),
  half: 1.6, depth: .55, fall: .7,
  /** The level the head's bed falls to: the Celder water's own surface at its first sample. */
  get foot() { return courseSample(MITHALA_CELDER_WATER, HEAD_FOOT.x, HEAD_FOOT.z).surface; },
});
let HEAD_LEVEL = null;
const headLevel = () => (HEAD_LEVEL ??= CELDER_HEAD.foot);
/** The head's notional water line at `t` along it (0 at the top, 1 at the Celder water). */
const headLine = t => headLevel() + CELDER_HEAD.fall * (1 - t);

const SOFT_STREAM = 30;
/**
 * The water this point's ground falls to: the soft-nearest of the three, and the level of its water. `near` is
 * the distance to the nearer of the Mithala's two streams alone, inside which their ground is theirs.
 */
// Interpolate the river datum across profile samples: a nearest-sample level
// made quarter-metre steps across otherwise gentle parts of the open plain.
// The arms bend, so an inland point can be equally close to distant portions
// of one profile. Blend their levels continuously as well as along each reach.
// Cache a 16 m scalar grid; bilinear interpolation keeps normal walking queries
// cheap and continuous without changing any channel, bank or profile sample.
const datumGrids = new Map();
function continuousCourseDatum(course, x, z) {
  let cache = datumGrids.get(course.id);
  if (!cache) { cache = new Map(); datumGrids.set(course.id, cache); }
  const step = 16, gx = Math.floor(x / step), gz = Math.floor(z / step), u = x / step - gx, v = z / step - gz;
  const at = (i, j) => {
    const key = i + ',' + j;
    if (cache.has(key)) return cache.get(key);
    const px = i * step, pz = j * step, profile = WEST_PROFILES.get(course.id);
    const nearest = courseSample(course, px, pz), least = Math.hypot(px - nearest.x, pz - nearest.z);
    let sum = 0, weight = 0;
    for (const sample of profile) {
      const k = (Math.hypot(px - sample.x, pz - sample.z) - least) / 24;
      if (k > 20) continue;
      const w = Math.exp(-k); sum += sample.surface * w; weight += w;
    }
    const level = sum / weight; cache.set(key, level); return level;
  };
  return { surface: mix(mix(at(gx, gz), at(gx + 1, gz), u), mix(at(gx, gz + 1), at(gx + 1, gz + 1), u), v) };
}
export function celderStreamField(x, z) { return streamField(x, z, continuousCourseDatum); }
function legacyStreamField(x, z) { return streamField(x, z, courseSample); }
function streamField(x, z, sample) {
  const arm = courseDistance(MITHALA_WEST_ARM, x, z), celder = courseDistance(MITHALA_CELDER_WATER, x, z);
  const head = segment(x, z, CELDER_HEAD.from, CELDER_HEAD.to);
  const near = Math.min(arm, celder), least = Math.min(near, head.distance);
  const wa = Math.exp(-(arm - least) / SOFT_STREAM), wc = Math.exp(-(celder - least) / SOFT_STREAM), wh = Math.exp(-(head.distance - least) / SOFT_STREAM);
  const total = wa + wc + wh;
  const level = (wa * sample(MITHALA_WEST_ARM, x, z).surface + wc * sample(MITHALA_CELDER_WATER, x, z).surface
    + wh * headLine(head.t)) / total;
  return { near, head: head.distance, headT: head.t, distance: least - SOFT_STREAM * Math.log(total), level };
}

// ---------------------------------------------------------------------------
// The plain
// ---------------------------------------------------------------------------
/** The numbers of the plain (metres, and a fall of 1 in 110). */
export const CELDER_PLAIN = freeze({ bank: 1.2, fall: 1 / 110, terrace: 1.3, terraceFrom: 50, terraceTo: 88,
  swell: 3.1, foothill: freeze({ reach: 260, low: 3.2, high: 4.6 }), keep: 13, free: 24 });
/**
 * The silt fans, where the East Oremindi's water comes down onto the plain margin at the foothills' foot: apex,
 * the way the fan runs (down the plain's fall), length, half-width at the toe and height at the apex.
 */
export const CELDER_FANS = freeze([
  freeze({ id: 'celder-fan-north', x: -2700, z: -1318, dir: freeze({ x: .91, z: .41 }), length: 230, width: 105, rise: 2.2 }),
  freeze({ id: 'celder-fan-middle', x: -2680, z: -1125, dir: freeze({ x: .96, z: .28 }), length: 240, width: 115, rise: 2.4 }),
  freeze({ id: 'celder-fan-south', x: -2770, z: -880, dir: freeze({ x: .97, z: -.24 }), length: 250, width: 110, rise: 2.5 }),
  freeze({ id: 'celder-fan-far-south', x: -2835, z: -690, dir: freeze({ x: .95, z: -.31 }), length: 220, width: 100, rise: 2.0 }),
]);
/** How much of a fan stands over a point: 1 at its apex, 0 off it. */
export function celderFanAt(x, z) {
  let best = 0;
  for (const fan of CELDER_FANS) {
    const dx = x - fan.x, dz = z - fan.z, along = dx * fan.dir.x + dz * fan.dir.z, across = -dx * fan.dir.z + dz * fan.dir.x;
    if (along < -40 || along > fan.length) continue;
    const s = clamp(along / fan.length, 0, 1), width = fan.width * (.28 + .72 * s);
    const body = (1 - s) ** 1.5 * Math.exp(-((across / width) ** 2) * 2.2) * (along < 0 ? 1 - smooth(0, 40, -along) : 1);
    best = Math.max(best, body);
  }
  return best;
}
function fanRise(x, z) {
  let rise = 0;
  for (const fan of CELDER_FANS) {
    const dx = x - fan.x, dz = z - fan.z, along = dx * fan.dir.x + dz * fan.dir.z, across = -dx * fan.dir.z + dz * fan.dir.x;
    if (along < -40 || along > fan.length) continue;
    const s = clamp(along / fan.length, 0, 1), width = fan.width * (.28 + .72 * s);
    rise = Math.max(rise, fan.rise * (1 - s) ** 1.5 * Math.exp(-((across / width) ** 2) * 2.2) * (along < 0 ? 1 - smooth(0, 40, -along) : 1));
  }
  return rise;
}
/**
 * The natural foundation beneath Canerd's separately authored castle: "somewhere on the plain west of central Celder, visible on
 * any clear day for thirty miles". The canerd-world.js settlement layer places the castle on the plain; this ground remains
 * open and level for it - no swell crest, fan or foothill within `radius` - and nothing is built or named on it.
 */
export const CELDER_MOUND_SITE = freeze({ x: -2620, z: -1035, radius: 110 });

/** The swells: three long rolls, never quite in step, up to three metres either way. */
export function celderSwell(x, z) {
  const u = x * .8 + z * .6, v = -x * .6 + z * .8;
  return 1.7 * Math.sin(u / 57 + 1.3) * Math.cos(v / 83 - .4) + .9 * Math.sin(x / 37 - z / 51 + 2.1) + .5 * Math.sin(z / 29 + x / 44 + .7);
}
/** The foothills: rounded rises that grow toward the western border and the mountains beyond it. */
function foothillRise(x, z, west) {
  const f = 1 - smooth(30, CELDER_PLAIN.foothill.reach, west);
  if (f <= 0) return 0;
  const knolls = .5 + .5 * (Math.sin(x / 19 + z / 31 + .9) * .55 + Math.sin(z / 23 - x / 41 + 2.4) * .45);
  return f * f * (CELDER_PLAIN.foothill.low + CELDER_PLAIN.foothill.high * knolls);
}
/** The designed plain, with no border, no stream channel and no handed ground in it. */
export function celderPlainHeight(x, z, field = celderStreamField(x, z)) {
  const P = CELDER_PLAIN, d = field.distance;
  let h = field.level + P.bank + P.fall * Math.max(0, d) + P.terrace * smooth(P.terraceFrom, P.terraceTo, d);
  const site = smooth(CELDER_MOUND_SITE.radius * .6, CELDER_MOUND_SITE.radius * 1.5, Math.hypot(x - CELDER_MOUND_SITE.x, z - CELDER_MOUND_SITE.z));
  h += celderSwell(x, z) * smooth(60, 220, d) * (.25 + .75 * site);
  h += foothillRise(x, z, westDistance(x, z)) * site;
  h += fanRise(x, z) * site;
  return h;
}

// ---------------------------------------------------------------------------
// The handed ground, made seamless, and met to the far side
// ---------------------------------------------------------------------------
/**
 * The ground handed to the plain, laid on the hex blend that has no seams. The blend the world uses takes in a
 * hex two steps away all at once when a point crosses a hex edge, so it steps by up to five metres along every
 * hex edge in the outland round here; inside the plain that is replaced, but within a border's feather it would
 * show along this country's own edges where they run in from the border. Not near the Mithala's streams, whose
 * ground there is their own swale and has no relief to correct.
 */
function seamlessHanded(x, z, handed, field) {
  // The Mithala's swale reaches 165 m from its channels and has no relief in it: a correction for the blend's relief
  // laid over it would put the very step it corrects elsewhere into the stream's bank. So it is let in past 170 m.
  const streamWeight = smooth(60, 170, field.near);
  if (streamWeight <= 0) return handed;
  // The West Lotharn takes the same steps out of its own share of the ground (`seamlessLift` in
  // src/content/regions/west-lotharn/west-lotharn-world.js), and that share reaches onto this side of its border: taken out twice, they came back
  // as steps the other way, up to seven metres at an inner hex edge. So only the rest is taken out here.
  const seamless = seamlessTerrainMix(x, z), left = 1 - westLotharnShare(x, z, seamless);
  if (left <= 0) return handed;
  const mixed = terrainMix(x, z), shore = smooth(2, 40, landDistance(x, z));
  return handed + streamWeight * shore * left * (seamless.base + relief(x, z, seamless.amp, seamless.wave) - mixed.base - relief(x, z, mixed.amp, mixed.wave));
}
/**
 * How the border is met: the step from this side to the far one is read every half metre along every outer edge,
 * and a point is moved by the step on its nearest edges averaged over as many metres either way as the point
 * stands in from the line (`widen`), letting go over `reach`. At the line the move is the step itself, so the two
 * sides meet; the far side is never moved. Built or unbuilt alike: unbuilt ground is met as it stands.
 */
export const CELDER_SEAM = freeze({ reach: 40, probe: .05, step: .5, widen: 1, exact: 1 });
let SEAM = null;
/**
 * Every outer edge, with its steps read the first time a point comes within `reach` of it. Read all at once, the
 * forty-seven edges cost 1.2 s in a cold process on the first touch of either country, and no loader step can split
 * that; read edge by edge, the dearest first touch is one of the West Lotharn's edges.
 */
function seamLines() {
  return (SEAM ??= freeze(CELDER_EDGES.map(e => ({ ...e, count: 0 }))));
}
function seamTable(line, before) {
  if (line.count) return line;
  const S = CELDER_SEAM;
  // The West Lotharn's cliff bands cross the line here and there, a metre in a quarter of one: read finer there.
  const step = line.far === 'West Lotharn Mountains' ? S.step / 4 : S.step;
  const count = Math.max(1, Math.ceil(line.length / step)), steps = new Float64Array(count + 1);
  for (let i = 0; i <= count; i++) {
    // A hand's breadth in from either end, so neither probe lands in a third hex at a corner.
    const s = Math.max(.1, Math.min(line.length - .1, line.length * i / count));
    const x = line.a.x + (line.b.x - line.a.x) * s / line.length, z = line.a.z + (line.b.z - line.a.z) * s / line.length;
    const ix = x - line.nx * S.probe, iz = z - line.nz * S.probe;
    steps[i] = before(x + line.nx * S.probe, z + line.nz * S.probe) - seamlessHanded(ix, iz, before(ix, iz), celderStreamField(ix, iz));
  }
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
/** How far the handed ground at a point is moved to meet the far side of the border. */
export function celderSeamMove(x, z, before) {
  if (!before) return 0;
  const lines = seamLines(), reach = CELDER_SEAM.reach;
  let near = Infinity;
  const found = [];
  for (const line of lines) {
    if (x < Math.min(line.a.x, line.b.x) - reach || x > Math.max(line.a.x, line.b.x) + reach
      || z < Math.min(line.a.z, line.b.z) - reach || z > Math.max(line.a.z, line.b.z) + reach) continue;
    const p = segment(x, z, line.a, line.b);
    if (p.distance >= reach) continue;
    found.push([seamTable(line, before), p]); near = Math.min(near, p.distance);
  }
  if (!found.length) return 0;
  const soft = .1 + .5 * near;
  let sum = 0, total = 0, nearest = null;
  for (const [line, p] of found) {
    if (p.distance === near) nearest = [line, p];
    const k = (p.distance - near) / soft;
    if (k > 24) continue;
    const w = Math.exp(-k);
    total += w; sum += w * stepNear(line, p.t * line.length, p.distance * CELDER_SEAM.widen);
  }
  const move = sum / total * (1 - smooth(0, reach, near));
  if (near >= CELDER_SEAM.exact) return move;
  // Within a metre of the line the step is read where the point stands rather than off the samples: the West
  // Lotharn's cliff bands cross the border here and there as a riser too sharp for any spacing of samples.
  const [line, p] = nearest, s = clamp(p.t * line.length, .1, line.length - .1);
  const lx = line.a.x + (line.b.x - line.a.x) * s / line.length, lz = line.a.z + (line.b.z - line.a.z) * s / line.length;
  const ix = lx - line.nx * CELDER_SEAM.probe, iz = lz - line.nz * CELDER_SEAM.probe;
  const exact = before(lx + line.nx * CELDER_SEAM.probe, lz + line.nz * CELDER_SEAM.probe) - seamlessHanded(ix, iz, before(ix, iz), celderStreamField(ix, iz));
  return mix(exact, move, smooth(0, CELDER_SEAM.exact, near));
}

/** The head's dry gravel bed, cut into whatever ground it is given. */
function headBed(x, z, ground, field) {
  const H = CELDER_HEAD, valley = H.half + 5;
  if (field.head >= valley) return ground;
  const bed = headLine(field.headT) - H.depth + .35;
  return Math.min(ground, mix(Math.min(bed, ground), ground, smooth(H.half * .8, valley, field.head)));
}

/**
 * The ground of the one plain, on either Celder's hexes; the caller answers `incoming` everywhere else. `before`
 * is the ground without either Celder (src/world/terrain/world-terrain.js `groundBeforeCelder`), read only to meet the border.
 */
export function celderLand(x, z, incoming, before) {
  return landWithField(x, z, incoming, before, celderStreamField(x, z));
}
/** Frozen delivered ground for candidate eligibility, never for physical support. */
export function legacyCelderLand(x, z, incoming, before) {
  return landWithField(x, z, incoming, before, legacyStreamField(x, z));
}
function landWithField(x, z, incoming, before, field) {
  const streamWeight = smooth(CELDER_PLAIN.keep, CELDER_PLAIN.free, field.near);
  const weight = streamWeight * borderWeight(x, z);
  const handed = weight < 1 ? seamlessHanded(x, z, incoming, field) : incoming;
  const ground = weight > 0 ? mix(handed, celderPlainHeight(x, z, field), weight) : handed;
  return headBed(x, z, ground, field) + celderSeamMove(x, z, before);
}

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------
/** What decides the colour of the ground here: how near the water, which terrace, the swell, the fans, the hills. */
export const CELDER_GROUND = freeze({
  plain: 0x8e9a57, crest: 0x9da35f, hollow: 0x7f9450, terrace: 0x6f9049, bank: 0x7b9a5c,
  fan: 0x799d68, foothill: 0x99956a, stony: 0x8f8b76, gravel: 0xa29d88,
});
const rgb = c => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
const mixColour = (a, b, t) => { const p = rgb(a), q = rgb(b); return (Math.round(mix(p[0], q[0], t)) << 16) | (Math.round(mix(p[1], q[1], t)) << 8) | Math.round(mix(p[2], q[2], t)); };
const swatchNumber = ground => (typeof ground === 'string' && /^#[0-9a-f]{6}$/i.test(ground) ? parseInt(ground.slice(1), 16) : null);
/**
 * The plain's colour at a point, as 0xRRGGBB: the terrace grass by the water, crest and hollow on the swells, the
 * silt fans' blue-green, the foothills' brown and their stony shoulders, the head's gravel. It fades back into the
 * hex blend's own swatch over the last twelve metres of every outer border, so nothing changes colour at a line.
 */
export function celderTint(x, z, ground = null) {
  if (!celderOwns(x, z)) return null;
  const field = celderStreamField(x, z), d = field.distance;
  let colour = CELDER_GROUND.plain;
  const swell = celderSwell(x, z) / CELDER_PLAIN.swell;
  if (swell > 0) colour = mixColour(colour, CELDER_GROUND.crest, smooth(.15, .85, swell) * smooth(60, 160, d));
  else colour = mixColour(colour, CELDER_GROUND.hollow, smooth(.2, .9, -swell) * smooth(60, 160, d));
  colour = mixColour(colour, CELDER_GROUND.terrace, (1 - smooth(110, 190, d)) * smooth(40, 70, d) * .85);
  colour = mixColour(colour, CELDER_GROUND.bank, 1 - smooth(25, 55, d));
  const fan = celderFanAt(x, z);
  if (fan > 0) colour = mixColour(colour, CELDER_GROUND.fan, smooth(.05, .5, fan) * .9);
  const west = westDistance(x, z), hills = 1 - smooth(60, CELDER_PLAIN.foothill.reach, west);
  if (hills > 0) {
    colour = mixColour(colour, CELDER_GROUND.foothill, hills * .75);
    const knolls = .5 + .5 * (Math.sin(x / 19 + z / 31 + .9) * .55 + Math.sin(z / 23 - x / 41 + 2.4) * .45);
    colour = mixColour(colour, CELDER_GROUND.stony, hills * smooth(.62, .9, knolls) * .7);
  }
  if (field.head < CELDER_HEAD.half + 1.5) colour = mixColour(colour, CELDER_GROUND.gravel, 1 - smooth(CELDER_HEAD.half * .7, CELDER_HEAD.half + 1.5, field.head));
  let edge = Infinity;
  for (const e of CELDER_EDGES) {
    if (x < Math.min(e.a.x, e.b.x) - 12 || x > Math.max(e.a.x, e.b.x) + 12 || z < Math.min(e.a.z, e.b.z) - 12 || z > Math.max(e.a.z, e.b.z) + 12) continue;
    edge = Math.min(edge, segment(x, z, e.a, e.b).distance);
  }
  const swatch = swatchNumber(ground);
  if (edge < 12) colour = swatch === null ? colour : mixColour(swatch, colour, smooth(0, 12, edge));
  return colour;
}

// ---------------------------------------------------------------------------
// The country's own exports
// ---------------------------------------------------------------------------
/** Where the developer's travel tool sets a traveler down: open terrace grass in the middle of the country. */
export const SOUTH_CELDER_ARRIVAL = point(-2450, -750.5);
const place = (id, name, x, z, radius, description) => freeze({ id, name, region: REGION_IDS[SOUTH_CELDER], x, z, radius, description });
/** Places for the chart: { id, name, x, z, radius?, description? }. Natural places only, named in plain words. */
export const SOUTH_CELDER_LANDMARKS = freeze([
  place('south-celder-head', "The Celder water's head", -2160, -938, 28,
    "A dry gravel bed between the two Celders that carries the plain's snowmelt down to where the Celder water rises, under the West Lotharn's foot."),
  place('south-celder-foothills', 'The western foothills', -2815, -770, 45,
    'Rounded grass hills and stony shoulders: the edge of the plain, with the East Oremindi beyond.'),
  place('south-celder-silt-fan', 'The southern silt fans', -2690, -850, 45,
    "Low fans of mountain silt spread out from the foothills' foot, where the grass grows blue-green and fine."),
  place('south-celder-lotharn-foot', "The Lotharn's foot", -2265, -705, 40,
    "The plain's eastern edge, where the ground rises into the West Lotharn's long apron."),
]);
/** Walked routes kept clear of scenery: open ways the plain gives naturally, not roads. */
export const SOUTH_CELDER_TRAILS = freeze([
  freeze({ id: 'south-celder-length', width: 6, points: freeze([point(-2190, -975), point(-2300, -900), point(-2450, -780), point(-2600, -660), point(-2700, -580)]) }),
]);
/** Review views. */
export const SOUTH_CELDER_VIEWS = freeze({
  // Over the plain's south-eastern swells, clear of the West Lotharn's flank (an eye at (-2250, -620) was inside it).
  'south-celder': freeze({ eye: freeze({ x: -2400, z: -640, y: 80 }), target: freeze({ x: -2690, z: -810, y: 18 }) }),
  'south-celder-foothills': freeze({ eye: freeze({ x: -2620, z: -770, y: 40 }), target: freeze({ x: -2900, z: -820, y: 22 }) }),
  'south-celder-head': freeze({ eye: freeze({ x: -2260, z: -900, y: 30 }), target: freeze({ x: -2160, z: -985, y: 12 }) }),
  'south-celder-lotharn-foot': freeze({ eye: freeze({ x: -2480, z: -720, y: 34 }), target: freeze({ x: -2180, z: -760, y: 40 }) }),
  // At a walker's height on the middle swells, looking west over the fans to the foothills and the Oremindi.
  'south-celder-swells': freeze({ eye: freeze({ x: -2450, z: -752, y: 20.9 }), target: freeze({ x: -2790, z: -800, y: 20.4 }) }),
});

/**
 * The ground. `incoming` is the ground every other layer laid; `before(x, z)` answers the ground without
 * either Celder's layer, for measuring a border seam. Answers `incoming` off South Celder's own hexes.
 */
export function southCelderGround(x, z, incoming, before) {
  if (!inCelderBox(x, z) || hexOwnerAt(x, z) !== SOUTH_CELDER) return incoming;
  return celderLand(x, z, incoming, before);
}
/** The colour of the ground on South Celder's own hexes, as 0xRRGGBB, or null for "no opinion here". */
export function southCelderTint(x, z, ground = null) {
  if (!inCelderBox(x, z) || hexOwnerAt(x, z) !== SOUTH_CELDER) return null;
  return celderTint(x, z, ground);
}
