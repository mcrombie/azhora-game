/**
 * **The caves of the West Lotharn.** The same rock and the same rule as the East's
 * (`src/content/regions/east-lotharn/east-lotharn-caves.js`), on a range half as tall again.
 *
 * The lore is specific about where they come from: "the limestone is where the caves are. Water
 * that has been working at the Lotharn for as long as there has been water has opened the soluble
 * beds from the inside: passages that run along a course behind the cliff face and come out a ledge
 * higher, rooms at the end of short tunnels, and in places a way right through a ridge from one
 * valley to the next, which the valley people used before anybody cut a pass. Most of them are dry
 * and empty."
 *
 * So, nine of them, in the same three kinds the East has:
 *  - **five chimneys**, each going in at the foot of a cliff from one ledge, climbing inside the
 *    rock, and coming out on the ledge above - the climber's alternative to the cut ramp;
 *  - **three chambers**, a passage into the mountain with a room at the end of it;
 *  - **one way right through**, under the east arm from the col to the long valley: the passage the
 *    valley people would have used to get from Kemrath into the West Lotharn without climbing over
 *    the shoulder between them.
 *
 * A cave is a place of its own that the traveler steps into at its mouth; the surface above goes on
 * being walked over as if nothing were under it, and the shared walker (`createCaveWalk`,
 * `createLotharnCaveWalk`) is the East's, unchanged. **Nothing lives in any of them**, as in the
 * East. Their rock is drawn in src/west-lotharn-scenery.js.
 */
import { CAVE, nearestPlain } from '../east-lotharn/east-lotharn-caves.js';
import { BANDS, PEAKS, pointOn, peakUplift } from './west-lotharn-world.js';

const freeze = Object.freeze;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const smooth = (a, b, x) => { const v = clamp((x - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); };
const lerp = (a, b, t) => a + (b - a) * t;
const point = (x, z) => freeze({ x, z });

export { CAVE, nearestPlain };

// The lift's own geometry, for laying a passage along the bands.
const slopeAt = (x, z) => {
  const e = .75;
  return { gx: (peakUplift(x + e, z) - peakUplift(x - e, z)) / (2 * e), gz: (peakUplift(x, z + e) - peakUplift(x, z - e)) / (2 * e) };
};
function toLevel(p, level) {
  let x = p.x, z = p.z;
  for (let i = 0; i < 60; i++) {
    const miss = level - peakUplift(x, z);
    if (Math.abs(miss) < .05) return point(x, z);
    const { gx, gz } = slopeAt(x, z), g2 = gx * gx + gz * gz;
    if (g2 < 1e-4) return null;
    const step = clamp(miss / g2, -4, 4);
    x += gx * step; z += gz * step;
  }
  return null;
}
function along(level, from, turn, length) {
  const out = [];
  let p = from, run = 0;
  while (run < length) {
    const { gx, gz } = slopeAt(p.x, p.z), g = Math.hypot(gx, gz);
    if (g < .05) return null;
    const next = toLevel({ x: p.x - gz / g * 2 * turn, z: p.z + gx / g * 2 * turn }, level);
    if (!next) return null;
    run += Math.hypot(next.x - p.x, next.z - p.z); p = next; out.push(next);
  }
  return out;
}
const between = (a, b, step = 2) => {
  const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.z - a.z) / step)), out = [];
  for (let i = 1; i < n; i++) out.push(point(lerp(a.x, b.x, i / n), lerp(a.z, b.z, i / n)));
  return out;
};
const peak = id => PEAKS.find(one => one.id === id);
/** From a summit out along a bearing (degrees, from north round by east) to where the lift falls to `level`. */
function outFrom(peakId, bearing, level) {
  const top = peak(peakId), dx = Math.sin(bearing * Math.PI / 180), dz = -Math.cos(bearing * Math.PI / 180);
  for (let r = 4; r < top.reach; r += 2) {
    const q = point(top.x + dx * r, top.z + dz * r);
    if (peakUplift(q.x, q.z) < level + 4) return toLevel(q, level);
  }
  return null;
}
/** A chimney from ledge `band` up to the ledge above, the way the East's are cut. */
function chimney(peakId, band, bearing, turn, run = 46) {
  const P = BANDS.period, a = outFrom(peakId, bearing, (band + .64) * P);
  if (!a) return null;
  const inner = toLevel(a, (band + 2.05) * P);
  if (!inner) return null;
  const inside = along((band + 2.05) * P, inner, turn, run);
  if (!inside) return null;
  const b = toLevel(inside.at(-1), (band + 1.64) * P);
  if (!b) return null;
  // Both mouths open onto a ledge only ten metres wide. The line runs a few metres along the ledge's
  // own contour at each end, so the straight tail `extended` adds afterwards lies **along** the
  // ledge instead of across it and out over the edge - which on a face laid in forty-metre courses
  // is an eight-metre drop the moment a traveler steps out of the rock.
  const foot = along((band + .64) * P, a, -turn, 6) ?? [];
  const head = along((band + 1.64) * P, b, turn, 6) ?? [];
  return [...foot.reverse(), a, ...between(a, inner), inner, ...inside, ...between(inside.at(-1), b), b, ...head];
}
/** A chamber: in from the ledge at the foot of a cliff, `depth` metres, bending a little. */
function chamber(peakId, band, bearing, depth = 30, bend = .35) {
  const a = outFrom(peakId, bearing, (band + .64) * BANDS.period);
  if (!a) return null;
  const { gx, gz } = slopeAt(a.x, a.z), g = Math.hypot(gx, gz) || 1, out = [a];
  let heading = Math.atan2(gx / g, gz / g), p = a;
  for (let run = 0; run < depth; run += 2) {
    heading += bend * 2 / depth * (run < depth / 2 ? 1 : -1);
    p = point(p.x + Math.sin(heading) * 2, p.z + Math.cos(heading) * 2); out.push(p);
  }
  return out;
}

/**
 * Where they are. Named in plain words for what they are, as this country's other places are; the
 * lore names no cave.
 */
const SPECS = [
  { id: 'crest-low-chimney', name: 'The low chimney under the crest', kind: 'chimney', make: () => chimney('the-crest', 2, 212, 1, 86) },
  { id: 'crest-high-chimney', name: 'The high chimney', kind: 'chimney', make: () => chimney('the-crest', 5, 80, -1, 108) },
  { id: 'north-summit-chimney', name: 'The chimney under the north summit', kind: 'chimney', make: () => chimney('north-summit', 3, 124, 1, 58) },
  { id: 'west-shoulder-chimney', name: 'The chimney under the west shoulder', kind: 'chimney', make: () => chimney('west-shoulder', 2, 302, -1, 64) },
  { id: 'east-summit-chimney', name: 'The chimney under the east summit', kind: 'chimney', make: () => chimney('east-summit', 2, 200, 1, 60) },
  { id: 'crest-chamber', name: 'The cave on the crest’s west face', kind: 'chamber', make: () => chamber('the-crest', 0, 296, 34) },
  { id: 'cold-head-chamber', name: 'The cave in the cold head', kind: 'chamber', make: () => chamber('cold-head', 1, 62, 28, -.4) },
  { id: 'rampart-chamber', name: 'The cave in the south rampart', kind: 'chamber', make: () => chamber('south-rampart', 0, 18, 26) },
  // Under the east arm, between the col at the range's join and the long valley's eastern reach:
  // the shoulder between them stands seventy and eighty metres and is too steep to walk over, and
  // this is "a way right through a ridge from one valley to the next".
  { id: 'col-passage', name: 'The passage under the east arm', kind: 'through',
    make: () => [point(-1592, -806), point(-1601, -782), point(-1611, -758), point(-1622, -734), point(-1628, -722)] },
];
/** A passage's line rounded off, twice, the way the valleys' water is: no corner to walk into. */
function rounded(points, passes = 2) {
  let current = points;
  for (let pass = 0; pass < passes; pass++) {
    const next = [current[0]];
    for (let i = 0; i < current.length - 1; i++) {
      const a = current[i], b = current[i + 1];
      next.push(point(a.x * .75 + b.x * .25, a.z * .75 + b.z * .25), point(a.x * .25 + b.x * .75, a.z * .25 + b.z * .75));
    }
    next.push(current.at(-1));
    current = next;
  }
  return current;
}
/**
 * A line carried on straight past an end, so an opening has ground outside it to be walked into
 * from. **Six metres at the head and three at the tail**, where the East Lotharn uses three at both:
 * `createCaves` puts an opening three metres outside the rock, so a head that only reaches three
 * metres out can leave an opening buried in the cliff with no ground in front of it; and a tail
 * carried too far across a ledge only ten metres wide walks out over the edge of it. Measured on
 * this country's own nine.
 */
function extended(points, kind) {
  const out = (a, b, length) => { const d = Math.hypot(a.x - b.x, a.z - b.z) || 1; return point(a.x + (a.x - b.x) / d * length, a.z + (a.z - b.z) / d * length); };
  const head = out(points[0], points[1], 4);
  return kind === 'chamber' ? [head, ...points] : [head, ...points, out(points.at(-1), points.at(-2), 3)];
}
export const WEST_CAVE_LINES = freeze(SPECS.map(spec => {
  const made = spec.make(), points = made && extended(rounded(made), spec.kind);
  return points ? freeze({ id: spec.id, name: spec.name, kind: spec.kind, points: freeze(points) }) : null;
}).filter(Boolean));

/** A line with its running length, and the point and heading a distance along it. */
function measured(points) {
  const runs = [0];
  for (let i = 1; i < points.length; i++) runs.push(runs[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z));
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of points) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); }
  return { points, runs, length: runs.at(-1), bounds: { minX, maxX, minZ, maxZ } };
}

/**
 * The caves on the actual ground (`ground(x, z)`, the world's): each with its floor, its `portals`
 * - the distances along it where the rock closes over and opens again - and its width and height a
 * distance along. The same construction the East's `createCaves` makes, over this country's lines.
 */
export function createWestLotharnCaves(ground) {
  return freeze(WEST_CAVE_LINES.map(line => {
    const path = measured(line.points), { length } = path, end = line.kind === 'chamber';
    const at = s => pointOn(path, s);
    const groundAt = s => { const p = at(s); return ground(p.x, p.z); };
    const first = groundAt(0), last = end ? first + 2.5 : groundAt(length);
    let portalIn = null, portalOut = null;
    for (let s = 0; s <= length; s += .5) {
      const over = groundAt(s) - lerp(first, last, s / length) > CAVE.height + CAVE.roof * .5;
      if (over && portalIn === null) portalIn = s;
      if (over) portalOut = s;
    }
    if (portalIn === null) return null;
    if (end) portalOut = length;
    const open = Math.max(0, portalIn - 3), close = end ? length : Math.min(length, portalOut + 3);
    const lower = groundAt(open), upper = end ? lower + 2.5 : groundAt(close);
    const roomFrom = end ? length - CAVE.roomLength : Infinity;
    const floor = s => s <= open || (!end && s >= close) ? groundAt(Math.max(0, Math.min(length, s))) : lerp(lower, upper, Math.min(1, (s - open) / (close - open)));
    // The opening heights alter the final floor slightly from the first end-to-end estimate.
    // Locate the roof against that actual floor, so a portal is never claimed before rock covers it.
    let roofIn = null, roofOut = null;
    for (let s = open; s <= close; s += .5) {
      if (groundAt(s) - floor(s) <= CAVE.height + CAVE.roof * .5) continue;
      if (roofIn === null) roofIn = s;
      roofOut = s;
    }
    if (roofIn !== null) { portalIn = roofIn; portalOut = end ? length : roofOut; }
    return freeze({
      ...line, path, length, portals: freeze([portalIn, portalOut]), openings: freeze([open, close]), lower, upper,
      at, floor,
      half: s => end ? lerp(CAVE.half, CAVE.room, smooth(roomFrom - 2, roomFrom + 3, s)) : CAVE.half,
      height: s => end ? lerp(CAVE.height, CAVE.roomHeight, smooth(roomFrom - 2, roomFrom + 3, s)) : CAVE.height,
    });
  }).filter(Boolean));
}
