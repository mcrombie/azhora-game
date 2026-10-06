/**
 * Telemonia, stage 2: the ways a body walks in the Telemon's country, the kingdom's stock, and the town's
 * places on the chart (docs/telemonia-stage2-brief.md). Pure: no three, no DOM.
 *
 * - **Ways** (`groundKind`, `walkedRoute`, `walkOutRoute`, `footBelow`, `PASS_MOUTHS`): which ground the
 *   Telemon walk after somebody on - everything but the high rim, which "is not walked onto except by the
 *   one way" - and the walked routes between two points of it: off the rock by the street, the gate and
 *   the spur; off a terrace by its nearest stair; off the Rothkar way down it; round Kethorn's rock rather
 *   than up its faces. The walk out ends at a pass mouth two and a half metres inside the border: "they
 *   stop at the border and return to the highland". The host of the rule (src/content/regions/telemonia/telemonia-host.js) walks the
 *   Telemon by these.
 * - **The stock** (`CATTLE_RANGE`, `HORSE_RANGE`, `TELEMON_HORSES`): "the hill pastures carry cattle and
 *   horses"; the rim is not walked onto, so the kingdom's beasts graze the Galmeth's margins - the cattle by
 *   the head of the south pass, the compact Telemon horse by the head of the east pass.
 * - **The chart** (`TELEMONIA_TOWN_LANDMARKS`): the town's places, in plain English.
 *
 * Nothing here is built: the buildings, the fields and the dwellings are src/content/regions/telemonia/telemonia-town.js's. The
 * places on the rock are in the rock's own frame (`kethornPoint(u, v)`, src/content/regions/telemonia/telemonia-world.js), where the
 * stage 1 report puts the gate (`u` 36-38), the street and the hall at the north-eastern end (`u` -40).
 */
import {
  TELEMONIA, KETHORN, KETHORN_WALL, PASSES, ROTHKAR_WAY, PLAIN_MIDDLE, TERRACES, INNER,
  kethornPoint, kethornFrame, onKethornTop, kethornLift, spurAt, plainDistance, washAt, passAt, wayAt, gullyAt,
  telemoniaPlace, borderDepth, inTelemoniaBox,
} from './telemonia-world.js';
import { hexOwnerAt } from '../../../world/terrain/region-world.js';
import { KETHORN_STREET, CATTLE_RANGE, HORSE_RANGE, PENS, HAMLETS } from './telemonia-town.js';

const freeze = Object.freeze;
const point = (x, z) => freeze({ x, z });
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/** The yaw that faces from `from` to `to`, as the game's people face ({sin(yaw), cos(yaw)}). */
export const facing = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
/** The rock's grain: a yaw of `YAW_ALONG` looks along `u`, toward the gate. */
export const ALONG = (() => { const a = kethornPoint(0, 0), b = kethornPoint(1, 0); return point(b.x - a.x, b.z - a.z); })();
export const YAW_ALONG = Math.atan2(ALONG.x, ALONG.z);
/** Kethorn's street, the town's (src/content/regions/telemonia/telemonia-town.js): from just inside the gate to the king's hall, on the rock's own middle line (`v` 0). */
const STREET = KETHORN_STREET;
/** A point on the Galmeth `inside` metres in from its edge, on a bearing (radians, x east, z south) from its middle. */
export function plainEdgePoint(angle, inside = 7) {
  const dx = Math.cos(angle), dz = Math.sin(angle);
  for (let r = 20; r < 320; r += .25) {
    const x = PLAIN_MIDDLE.x + dx * r, z = PLAIN_MIDDLE.z + dz * r;
    if (plainDistance(x, z) >= -inside) return point(x, z);
  }
  return PLAIN_MIDDLE;
}

// ---------------------------------------------------------------------------
// The kingdom's stock
// ---------------------------------------------------------------------------
/** The cattle's grazing and the horses', the town's (src/content/regions/telemonia/telemonia-town.js), and their folds. */
export { CATTLE_RANGE, HORSE_RANGE };
const horseFold = PENS.find(p => p.kind === 'horse');
/**
 * Five of the compact Telemon horse: three loose on the unploughed ground by the head of the east pass, with
 * the man who has them, and two in their fold at the plain's edge above it, whose gateway stands open.
 */
export const TELEMON_HORSES = freeze([
  ...[[-6, -4, 1.1], [3, -7, -.4], [8, 2, 2.6]].map(([dx, dz, yaw]) => ({ x: HORSE_RANGE.x + dx, z: HORSE_RANGE.z + dz, yaw })),
  ...(horseFold ? [[-3, 1, .5], [3, -1, 2.2]].map(([a, b, yaw]) => { const fx = Math.sin(horseFold.yaw), fz = Math.cos(horseFold.yaw);
    return { x: horseFold.x + fz * a + fx * b, z: horseFold.z - fx * a + fz * b, yaw: horseFold.yaw + yaw }; }) : []),
].map((h, i) => freeze({ id: `telemonia-horse-${i + 1}`, ...h, variant: i % 4 })));
/**
 * Six head of the kingdom's cattle, as a range of the western wildlife rigs (src/content/regions/western-regions/west-regions-life.js):
 * the lore names no breed, so they are the compact, short-legged hill beast the west already draws
 * (`nethrani-cattle`), loose on the fallow by the south pass. Ambient, as every grazer in the west is.
 */
export const TELEMONIA_HERD_ZONES = freeze([freeze({
  id: 'telemonia-cattle', species: 'nethrani-cattle', region: TELEMONIA, radius: .8, scale: .9, keepRegion: true, maxSlope: .5,
  minX: CATTLE_RANGE.x - 30, maxX: CATTLE_RANGE.x + 26, minZ: CATTLE_RANGE.z - 28, maxZ: CATTLE_RANGE.z + 15,
  sites: freeze([[-10, -6], [-2, 4], [8, -4], [2, -14], [14, 8], [-16, 8]].map(([dx, dz]) => freeze([CATTLE_RANGE.x + dx, CATTLE_RANGE.z + dz]))),
  note: 'telemonia.md: "The hill pastures carry cattle and horses", and the herds are the kingdom’s, held through the band halls. The rim is walked onto only by the one way, so the cattle graze the Galmeth’s fallow by the head of the south pass, a Telemon man with them. The lore names no breed: the compact hill beast the west already has.',
})]);

// ---------------------------------------------------------------------------
// Ways a body walks
// ---------------------------------------------------------------------------
const alongLine = (line, run, s) => {
  let i = 1; while (i < run.length - 1 && run[i] < s) i++;
  const a = line[i - 1], b = line[i], t = clamp((s - run[i - 1]) / (run[i] - run[i - 1]), 0, 1);
  return point(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t);
};
/**
 * The pass mouths, where a walk out ends: on each pass's own line two and a half metres inside the
 * border, where the Telemon stop. `outside` is a few metres past the border on the same line. `line` is
 * the walk down the pass from its head on the plain to the mouth.
 */
export const PASS_MOUTHS = freeze(PASSES.map(p => {
  let mouth = null, outside = null;
  for (let s = 0; s < p.length; s += .25) {
    const q = alongLine(p.points, p.run, s), d = borderDepth(q.x, q.z);
    if (!outside && d > -5 && d < -3.5) outside = q;
    if (d >= 2.5) { mouth = { s, ...q }; break; }
  }
  const head = p.points.at(-1), line = [];
  for (let i = p.points.length - 1; i >= 0; i--) if (p.run[i] > mouth.s + 1) line.push(p.points[i]);
  line.push(point(mouth.x, mouth.z));
  return freeze({ id: p.id, name: p.name, faces: p.faces, mouth: point(mouth.x, mouth.z), outside: outside ?? point(p.points[0].x, p.points[0].z),
    head: point(head.x, head.z), line: freeze(line), length: p.run.at(-1) - mouth.s });
}));

/**
 * What kind of ground a point is to somebody on foot: `top` (Kethorn's top behind its wall, the gate and
 * the raised spur), `way` (the Rothkar way), `pass` (a pass's floor), `terrace` (the belt, reached by its
 * stairs), `plain`, or `rim` - the high rock nobody walks onto - or null off the country.
 */
export function groundKind(x, z) {
  if (!inTelemoniaBox(x, z) || hexOwnerAt(x, z) !== TELEMONIA) return null;
  const { u } = kethornFrame(x, z);
  if (onKethornTop(x, z) || (u > KETHORN.neck - 3 && u < KETHORN.spurTo + 2 && spurAt(x, z)?.off < 0 && kethornLift(x, z) > .5)) return 'top';
  const w = wayAt(x, z); if (w && w.distance < w.half + .5) return 'way';
  const p = passAt(x, z); if (p && p.distance < p.half + 1 && plainDistance(x, z) > -2) return 'pass';
  const pd = plainDistance(x, z);
  if (pd <= 0 && kethornLift(x, z) < 2) return 'plain';
  if (telemoniaPlace(x, z)?.terraced) return 'terrace';
  if (pd < 1.5 && kethornLift(x, z) < 2) return 'plain';
  return 'rim';
}
/** Ground the Telemon walk after somebody on: everything in the country but the high rim. */
export const walkedGround = (x, z) => { const k = groundKind(x, z); return !!k && k !== 'rim'; };

const STAIR_ANGLES = (() => { const out = []; for (let a = -180 + 4; a < 180; a += TERRACES.stairEvery) out.push(a * Math.PI / 180); return out; })();
const stairPoint = (angle, out) => plainEdgePoint(angle, -out);
/** The stairs a walker can actually go up: not cut by a pass, a gully, a wash or the way. */
export const WALKED_STAIRS = freeze(STAIR_ANGLES.filter(a => {
  for (let out = 1; out < INNER.terraceWidth - 2; out += 2) {
    const p = stairPoint(a, out), pass = passAt(p.x, p.z), g = gullyAt(p.x, p.z), w = washAt(p.x, p.z), way = wayAt(p.x, p.z);
    if ((pass && pass.distance < 12) || (g && g.distance < 6) || (w && w.distance < w.wash.half + 1) || (way && way.distance < 5)) return false;
  }
  return true;
}));
/** A segment that keeps to ground a walker takes round Kethorn, and not up its faces. */
function clearOfRock(a, b) {
  const n = Math.max(1, Math.ceil(gap(a, b) / 2));
  for (let i = 0; i <= n; i++) { const x = a.x + (b.x - a.x) * i / n, z = a.z + (b.z - a.z) * i / n; if (kethornLift(x, z) > 2.2 && !(spurAt(x, z)?.off < -1)) return false; }
  return true;
}
/** Round the rock: points on the plain about it, in order, that the plain routes go by. */
const ROCK_RING = freeze([[-78, 0], [-52, 50], [10, 56], [70, 40], [128, 0], [70, -40], [10, -56], [-52, -50]].map(([u, v]) => kethornPoint(u, v)));
function plainRoute(a, b) {
  if (clearOfRock(a, b)) return [];
  let best = null;
  for (let i = 0; i < ROCK_RING.length; i++) for (const dir of [1, -1]) {
    const via = [];
    for (let k = 0; k < ROCK_RING.length; k++) {
      const p = ROCK_RING[(i + dir * k + ROCK_RING.length * 2) % ROCK_RING.length];
      via.push(p);
      if (!clearOfRock(via.length === 1 ? a : via.at(-2), p)) { via.length = 0; break; }
      if (clearOfRock(p, b)) break;
    }
    if (!via.length || !clearOfRock(via.at(-1), b)) continue;
    let length = gap(a, via[0]) + gap(via.at(-1), b);
    for (let k = 1; k < via.length; k++) length += gap(via[k - 1], via[k]);
    if (!best || length < best.length) best = { via, length };
  }
  return best ? best.via : [];
}
/**
 * The walked way off a point's own ground onto the plain, ending on the plain: from the top down the
 * street, through the gate and down the spur; from the way down the way; from a terrace along its tread
 * to the nearest walked stair and down it; from a pass's floor to its head. Empty on the plain, null on the rim.
 */
export function wayDown(x, z) {
  const kind = groundKind(x, z);
  if (!kind || kind === 'rim') return null;
  if (kind === 'plain') return [];
  if (kind === 'top') {
    const { u } = kethornFrame(x, z), out = [];
    if (u < STREET.from) out.push(kethornPoint(clamp(u, STREET.to, STREET.from), 0));
    if (u < KETHORN.neck) out.push(kethornPoint(STREET.from - 2, 0), point(KETHORN_WALL.gate.centre.x, KETHORN_WALL.gate.centre.z));
    if (u < KETHORN.spurTo - 6) out.push(kethornPoint(Math.max(u + 6, 64), 0));
    out.push(kethornPoint(KETHORN.spurTo + 8, 0));
    return out;
  }
  if (kind === 'way') {
    const at = wayAt(x, z), out = [];
    for (let i = ROTHKAR_WAY.points.length - 1; i >= 0; i--) if (ROTHKAR_WAY.run[i] < at.along - 1) out.push(ROTHKAR_WAY.points[i]);
    const foot = ROTHKAR_WAY.points[0];
    out.push(plainEdgePoint(Math.atan2(foot.z - PLAIN_MIDDLE.z, foot.x - PLAIN_MIDDLE.x), 4));
    return out;
  }
  if (kind === 'pass') {
    const mouth = PASS_MOUTHS.find(m => m.id === passAt(x, z).pass.id);
    return [plainEdgePoint(Math.atan2(mouth.head.z - PLAIN_MIDDLE.z, mouth.head.x - PLAIN_MIDDLE.x), 6)];
  }
  const angle = Math.atan2(z - PLAIN_MIDDLE.z, x - PLAIN_MIDDLE.x), out = plainDistance(x, z);
  let stair = WALKED_STAIRS[0], best = Infinity;
  for (const a of WALKED_STAIRS) { let d = Math.abs(angle - a); d = Math.min(d, Math.PI * 2 - d); if (d < best) { best = d; stair = a; } }
  return [stairPoint(stair, out), stairPoint(stair, -3)];
}
/** A walked route from one point of the country to another: off the one's ground, over the plain, up onto the other's. */
export function walkedRoute(from, to) {
  const down = wayDown(from.x, from.z), up = wayDown(to.x, to.z);
  if (!down || !up) return null;
  const a = down.at(-1) ?? from, b = up.at(-1) ?? to, kind = groundKind(from.x, from.z);
  if (kind === groundKind(to.x, to.z) && kind !== 'plain' && gap(from, to) < 40) return [point(to.x, to.z)];
  return [...down, ...plainRoute(a, b), ...[...up].reverse(), point(to.x, to.z)];
}
/** **The walk out**: the walked route to the nearest pass mouth by the length of the route. Null on the rim. */
export function walkOutRoute(x, z) {
  const down = wayDown(x, z);
  if (!down) return null;
  const start = down.at(-1) ?? point(x, z);
  let best = null;
  for (const m of PASS_MOUTHS) {
    const onPass = groundKind(x, z) === 'pass' && passAt(x, z).pass.id === m.id;
    const path = onPass ? [m.mouth] : [...down, ...plainRoute(start, m.line[0]), ...m.line];
    let length = 0, prev = point(x, z);
    for (const p of path) { length += gap(prev, p); prev = p; }
    if (!best || length < best.length) best = { mouth: m, path, length };
  }
  return freeze({ mouth: best.mouth, waypoints: freeze(best.path.map(p => point(p.x, p.z))), length: best.length });
}
/** The nearest ground the Telemon walk on, below somebody on the rim: where one who came for him stops and waits. */
export function footBelow(x, z) {
  if (walkedGround(x, z)) return point(x, z);
  return plainEdgePoint(Math.atan2(z - PLAIN_MIDDLE.z, x - PLAIN_MIDDLE.x), 2);
}

// ---------------------------------------------------------------------------
// The chart
// ---------------------------------------------------------------------------
/**
 * The town's places on the chart, beside the country's own (`TELEMONIA_LANDMARKS`). Plain English: the
 * lore names no hall, no granary and no row of huts.
 */
const hutsAt = point(HAMLETS[0].yard.x, HAMLETS[0].yard.z);
export const TELEMONIA_TOWN_LANDMARKS = freeze([
  freeze({ id: 'telemonia-band-halls', name: 'The halls of the bands', ...kethornPoint(-12, 0),
    description: 'Kethorn’s one street, between the halls of the bands: long, plain stone halls where the fighting men eat and sleep in common, a band to a hall, with the granaries and the cisterns between them and the street. A Telemon man belongs to his band before he belongs to a household.' }),
  freeze({ id: 'telemonia-king-hall', name: 'The hall of the king', ...kethornPoint(-34, 0),
    description: 'At the far end of the street from the gate, on the highest ground of the rock and over the cliffs that face both passes: a hall built like the others. It is distinguished from them mainly by where it stands.' }),
  freeze({ id: 'telemonia-field-huts', name: 'The field people’s huts', ...hutsAt,
    description: 'Low dry-stone huts at the foot of the terraces: where the field people live, the toreth, the descendants of the armies that came to take the country and never went home. They are held in common, allotted to the band halls, and carry no weapons.' }),
]);
