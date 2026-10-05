/**
 * **The caves of the East Lotharn** (the user, 27 September 2026: "lots of passages and caves";
 * asked what should be in them, "empty, to explore").
 *
 * The ground is one surface, and a tunnel cannot be a dip in it: whoever walked over the top would
 * fall in. So a cave is a place of its own that the traveler steps into at its mouth: from there to
 * the far mouth - or the end - he stands on the cave's floor, the cliff overhead is only what he
 * sees, and the surface above goes on being walked over as if nothing were under it
 * (`createCaveWalk`). Their rock is drawn in src/east-lotharn-scenery.js.
 *
 * Three kinds:
 *  - **chimneys**, the climbers' way through a cliff band: in at the foot of a cliff from one ledge,
 *    along inside the rock climbing all the while, and out onto the ledge above;
 *  - **chambers**, going in and stopping: a passage into the mountain and a room at the end of it;
 *  - **the passage to Upper Olveth**, right through the ridge between Kemrath and the head of
 *    Upper Olveth: the one way between the two valleys that is not the long way round.
 *
 * Nothing lives in any of them yet.
 */
import { BANDS, PEAKS, pointOn, peakUplift } from './east-lotharn-world.js';

const freeze = Object.freeze;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const smooth = (a, b, x) => { const v = clamp((x - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); };
const lerp = (a, b, t) => a + (b - a) * t;
const point = (x, z) => freeze({ x, z });

/** A passage's half-width and height, and a chamber's. */
export const CAVE = freeze({ half: 1.8, height: 3.4, room: 4.6, roomHeight: 5.4, roomLength: 11, roof: 1.2 });

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

/**
 * A chimney from ledge `band` up to the ledge above: its lower mouth on the ledge at the foot of
 * the cliff nearest `near`, in behind the cliff to where the next cliff stands over it, along
 * inside the rock `run` metres the way `turn` goes round, and out at the foot of the next cliff.
 */
/** From a summit out along a bearing (degrees, from north round by east) to where the lift falls to `level`. */
function outFrom(peakId, bearing, level) {
  const top = peak(peakId), dx = Math.sin(bearing * Math.PI / 180), dz = -Math.cos(bearing * Math.PI / 180);
  for (let r = 4; r < top.reach; r += 2) {
    const q = point(top.x + dx * r, top.z + dz * r);
    if (peakUplift(q.x, q.z) < level + 4) return toLevel(q, level);
  }
  return null;
}
function chimney(peakId, band, bearing, turn, run = 44) {
  const P = BANDS.period, a = outFrom(peakId, bearing, (band + .64) * P);
  if (!a) return null;
  const inner = toLevel(a, (band + 2.05) * P);
  if (!inner) return null;
  const inside = along((band + 2.05) * P, inner, turn, run);
  if (!inside) return null;
  const b = toLevel(inside.at(-1), (band + 1.64) * P);
  if (!b) return null;
  return [a, ...between(a, inner), inner, ...inside, ...between(inside.at(-1), b), b];
}
/** A chamber: in from the ledge at the foot of a cliff nearest `near`, `depth` metres, bending a little. */
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

const peak = id => PEAKS.find(one => one.id === id);
/**
 * Where they are. Named in plain words for what they are, as this country's other unnamed places
 * are; the lore names no cave.
 */
const SPECS = [
  { id: 'eastern-low-chimney', name: 'The low chimney', kind: 'chimney', make: () => chimney('eastern-peak', 1, 100, 1) },
  { id: 'eastern-high-chimney', name: 'The high chimney', kind: 'chimney', make: () => chimney('eastern-peak', 4, 250, -1, 40) },
  { id: 'central-chimney', name: 'The chimney under the central peak', kind: 'chimney', make: () => chimney('central-peak', 2, 20, 1) },
  { id: 'western-chimney', name: 'The chimney under the western peak', kind: 'chimney', make: () => chimney('western-peak', 1, 200, -1) },
  { id: 'eastern-chamber', name: 'The cave on the eastern peak', kind: 'chamber', make: () => chamber('eastern-peak', 2, 150, 32) },
  { id: 'central-chamber', name: 'The cave above Kemrath', kind: 'chamber', make: () => chamber('central-peak', 0, 170, 28, -.4) },
  { id: 'south-west-chamber', name: 'The cave on the south-west peak', kind: 'chamber', make: () => chamber('south-west-peak', 1, 300, 26) },
  // Under the ridge between Kemrath and the head of Upper Olveth, which is forty metres through and
  // too steep to climb either side: the one way between the two valleys that is not round by the
  // border water.
  { id: 'olveth-passage', name: 'The passage to Upper Olveth', kind: 'through',
    make: () => [point(-1331, -874), point(-1330, -888), point(-1329, -902), point(-1328, -914), point(-1326, -924)] },
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
/** The caves' lines, before the ground is known: every one that could be laid. */
/** A line carried on straight past an end, so an opening has ground outside it to be walked into from. */
function extended(points, kind) {
  const out = (a, b, length) => { const d = Math.hypot(a.x - b.x, a.z - b.z) || 1; return point(a.x + (a.x - b.x) / d * length, a.z + (a.z - b.z) / d * length); };
  const head = out(points[0], points[1], 3);
  return kind === 'chamber' ? [head, ...points] : [head, ...points, out(points.at(-1), points.at(-2), 3)];
}
export const CAVE_LINES = freeze(SPECS.map(spec => {
  const made = spec.make(), points = made && extended(rounded(made), spec.kind);
  return points ? freeze({ id: spec.id, name: spec.name, kind: spec.kind, points: freeze(points) }) : null;
}).filter(Boolean));

/**
 * The nearest point of a passage's line, plainly: its distance, how far along, and whether it is
 * one of the ends. (The valleys' own nearest point blends how far along over neighbouring
 * stretches, which a valley floor wants and a passage's rounded corners do not.)
 */
export function nearestPlain(line, x, z) {
  const p = line.points;
  let best = { distance: Infinity, along: 0, end: false };
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1], b = p[i], dx = b.x - a.x, dz = b.z - a.z, length2 = dx * dx + dz * dz || 1;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / length2, 0, 1);
    const distance = Math.hypot(a.x + dx * t - x, a.z + dz * t - z);
    if (distance < best.distance) best = { distance, along: line.runs[i - 1] + Math.sqrt(length2) * t, end: (i === 1 && t <= 0) || (i === p.length - 1 && t >= 1) };
  }
  return best;
}
/** A line with its running length, and the point and heading a distance along it. */
function measured(points) {
  const runs = [0];
  for (let i = 1; i < points.length; i++) runs.push(runs[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z));
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of points) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); }
  return { points, runs, length: runs.at(-1), bounds: { minX, maxX, minZ, maxZ } };
}

/**
 * The caves on the actual ground (`ground(x, z)`, the world's): each with its floor, which is the
 * ground outside the mouths and one even climb or fall inside; its `portals`, the distances along
 * it where the rock closes over and opens again; and its width and height a distance along.
 */
export function createCaves(ground) {
  return freeze(CAVE_LINES.map(line => {
    const path = measured(line.points), { length } = path, end = line.kind === 'chamber';
    const at = s => pointOn(path, s);
    // Where the rock closes over, found against a floor laid straight between the two ends; then
    // each opening is taken three metres outside it, and the floor is laid straight between the
    // ground at the two openings (a chamber's rising a little to its room), and is the ground itself
    // outside them.
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
    return freeze({
      ...line, path, length, portals: freeze([portalIn, portalOut]), openings: freeze([open, close]), lower, upper,
      at, floor,
      half: s => end ? lerp(CAVE.half, CAVE.room, smooth(roomFrom - 2, roomFrom + 3, s)) : CAVE.half,
      height: s => end ? lerp(CAVE.height, CAVE.roomHeight, smooth(roomFrom - 2, roomFrom + 3, s)) : CAVE.height,
    });
  }).filter(Boolean));
}

/**
 * Walking in the caves. The traveler is `outside` or in one cave at a distance along it. He goes
 * in when he is at a mouth, within its width, and stepping inward; inside, he keeps to the passage
 * - its walls are its width - and his feet are on its floor; he comes out when he walks back out of
 * a mouth. `move` is one step of him, and answers where he is and on what.
 */
export function createCaveWalk(caves, ground = null, { exteriorEntry = false } = {}) {
  let inside = null;
  const nearest = (cave, x, z) => nearestPlain(cave.path, x, z);
  return {
    get cave() { return inside?.cave ?? null; },
    get along() { return inside?.along ?? null; },
    /** Put him outside, wherever he was (a load, a travel, a defeat). */
    leave() { inside = null; },
    /** From the surface: the cave he is stepping into at (x, z) by (dx, dz), if any. */
    entering(x, z, dx, dz) {
      if (inside) return null;
      for (const cave of caves) {
        const { bounds } = cave.path;
        if (x < bounds.minX - 6 || x > bounds.maxX + 6 || z < bounds.minZ - 6 || z > bounds.maxZ + 6) continue;
        const near = nearest(cave, x, z);
        if (near.distance > cave.half(near.along) - .25) continue;
        // Into the passage from just outside an opening, heading in: the cave's floor there is the ground.
        // Stepped into at the opening itself, where the passage's floor and the ground are one.
        const [open, close] = cave.openings;
        const p = cave.at(near.along), q = cave.at(near.along + .5), forward = dx * (q.x - p.x) + dz * (q.z - p.z);
        if (near.along > open - .2 && near.along < open + .8 && forward > 0) { inside = { cave, along: near.along }; return cave; }
        if (cave.kind !== 'chamber' && near.along < close + .2 && near.along > close - .8 && forward < 0) { inside = { cave, along: near.along }; return cave; }
      }
      return null;
    },
    /**
     * One step inside: the passage keeps him within its walls; walking back out of a mouth puts
     * him outside. Answers the new place, the floor under it, and whether he came out.
     */
    move(position, dx, dz, radius = .34) {
      const { cave } = inside;
      const previousAlong = inside.along;
      const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .18));
      // The whole step if it keeps within the walls, else each half of it on its own, so he slides
      // along a wall at a bend; and a step back toward the middle of the passage is always taken.
      const tryStep = (sx, sz) => {
        const x = position.x + sx, z = position.z + sz, near = nearest(cave, x, z), here = nearest(cave, position.x, position.z);
        if (near.distance <= cave.half(near.along) - radius || near.end || near.distance < here.distance - 1e-4) {
          // How far along he is moves no further than he did: cutting a corner does not jump him on.
          const moved = Math.hypot(sx, sz) + .02;
          position.x = x; position.z = z; inside.along = clamp(near.along, inside.along - moved, inside.along + moved);
          inside.past = near.end && near.distance > .5; return true;
        }
        return false;
      };
      for (let i = 0; i < steps; i++) if (!tryStep(dx / steps, dz / steps)) { tryStep(dx / steps, 0); tryStep(0, dz / steps); }
      // Out of the mouth he came in by, or through and out of the far one; or off either end of the line.
      const [open, close] = cave.openings, s = inside.along;
      // The player wrapper may acquire the existing exterior approach before `open`. Keep
      // ownership while moving inward there; reversing still releases it at the usual exit.
      const lowerExit = s < open - .3 && (!exteriorEntry || s < previousAlong - 1e-5);
      const upperExit = cave.kind !== 'chamber' && s > close + .3 && (!exteriorEntry || s > previousAlong + 1e-5);
      if (lowerExit || upperExit || (inside.past && (s < .01 || (cave.kind !== 'chamber' && s > cave.length - .01)))) {
        inside = null; return { outside: true, floor: null };
      }
      return { outside: false, floor: this.floorAt(position.x, position.z) };
    },
    /**
     * The floor under him: the passage's, and at an opening the ground where he actually stands,
     * blended over the first stride in, so stepping in or out is never a step up or down.
     */
    floorAt(x, z) {
      if (!inside) return null;
      const { cave, along: s } = inside, [open, close] = cave.openings, floor = cave.floor(s);
      if (!ground) return floor;
      const into = cave.kind === 'chamber' ? smooth(open, open + .8, s) : Math.min(smooth(open, open + .8, s), smooth(close, close - .8, s));
      return into >= 1 ? floor : lerp(ground(x, z), floor, into);
    },
    snapshot: () => inside ? { id: inside.cave.id, along: inside.along } : null,
    restore(saved) {
      inside = null;
      const cave = saved && caves.find(one => one.id === saved.id);
      if (cave && Number.isFinite(saved.along)) inside = { cave, along: clamp(saved.along, 0, cave.length) };
    },
  };
}

/**
 * Where to put a traveler who was left at (x, z) and should be outside: if that is under a cave's
 * rock, the ground outside its first opening; otherwise null, and he stays where he is. For a save
 * written, or a place travelled to, inside one.
 */
export function caveOutside(caves, x, z) {
  for (const cave of caves) {
    const { bounds } = cave.path;
    if (x < bounds.minX - 4 || x > bounds.maxX + 4 || z < bounds.minZ - 4 || z > bounds.maxZ + 4) continue;
    const near = nearestPlain(cave.path, x, z), [inAt, outAt] = cave.portals;
    if (near.distance < cave.half(near.along) + .5 && near.along > inAt && near.along < outAt) {
      const at = cave.at(Math.max(0, cave.openings[0] - 1.5));
      return { x: at.x, z: at.z };
    }
  }
  return null;
}
