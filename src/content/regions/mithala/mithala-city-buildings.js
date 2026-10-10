import { createSceneryBuilder } from '../../../world/scenery/scenery-builder.js';
import {decorateMithalaBuilding} from './mithala-polish.js';
import { MITHALA_DISTRICTS, MITHALA_BUILDINGS, MITHALA_TOWER_STAIR, MITHALA_STREETS, MITHALA_QUAY, MITHALA_BARGES,
  mithalaSegmentDistance, mithalaCityWaterClearance } from './mithala-city.js';
import { TAU, P, FOOT, FOOT_DARK, FOOT_LIGHT, BRICKS, BURNT, TIMBER, TIMBER_2, TIMBER_OLD, TIMBER_DARK, THATCHES,
  DOOR, OPENING, SHUTTER, BONE, GREYS, IRON, ROPE, SACKS, FLAGS, CLAY_FLOOR, rand, pick, quadToward, triToward, drum,
  annulus, thatchRoof } from './mithala-city-parts.js';

/** Mithala's buildings (docs/mithala-city-brief.md; footprints and heights from `MITHALA_BUILDINGS` in
 * src/content/regions/mithala/mithala-city.js): the old seat's hall and court, the houses, the Braid Bank's byres, barn and pens, the Quays'
 * granaries, weighing house and factors' halls, the Ford's inns, smithy and market, and the sky tower with its stair.
 * Called by `createMithalaCityScenerySteps` with that module's root, collider list, walking surfaces and metrics; it
 * makes and finishes its own merged batches.
 *
 * All of it is Mithali work: stone footings, walls of dark brick of fired flood clay between pale timber posts, thick
 * reed thatch, and a tide line on every wall where the water stands one season a year (the bricks under it darker,
 * a pale line of silt along it). Broad and low; only the sky tower stands up.
 *
 * Each building is drawn in its own frame at its footprint, turned so that its front faces the nearest street (a hall
 * turns a long side to it), standing on the highest ground under the footprint with its footing carried a metre below
 * the lowest. A footprint that the layout moves is followed; nothing here names a position. Colliders are the layout's
 * axis-aligned boxes (`hx`, `hz`) and posts (`r`), with `minY`/`maxY` wherever something can be walked under or over;
 * the bodies are `house` colliders so the charts draw them. The sky tower's stair is walked flight by flight on ramps
 * and landings (src/world/collision/walk-surfaces.js), with railings that stand only at their own flight's height.
 */

// Colours of this module's own: the brick under the tide line, the silt along it, a slit's daylight seen from inside.
const WET = ['#3d2c24', '#43312a', '#392922', '#47342b'], SILT = '#8f826b', SKY_LIGHT = '#c9d3d4';
const EMBER = '#e0682a', COALS = '#2a2421', WATER_DARK = '#3d4b4c', HAY = '#b8a463', LEATHER = '#4b3a2c';
const CANVAS = ['#b5873f', '#9a4d3c', '#55657a', '#6d7848', '#a8703a'], CANVAS_PALE = '#e3d7b8';
const CHESTNUT = '#5e3b23', BASKET = '#8a6a43', CLAY_POT = '#a5664a', CLOTH = ['#7a3b34', '#3f5370', '#a08a3c'];
const STONES = [FOOT, FOOT_DARK, '#857a65', '#746a57'];

// ---------------------------------------------------------------------------
// Where a building faces
// ---------------------------------------------------------------------------
const STREET_SEGMENTS = MITHALA_STREETS.flatMap(s => s.points.slice(1).map((q, i) => ({ a: s.points[i], b: q, half: s.width / 2 })));
const streetGap = (x, z) => Math.min(...STREET_SEGMENTS.map(g => mithalaSegmentDistance(x, z, g.a, g.b) - g.half));
const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]];
/** The world direction a building's front looks: the side nearest a street. A hall, a court and the garrison turn one
 * of their long sides to it; a factors' hall, a barn or a byre may show the street its gable. */
function frontOf(bd) {
  const long = bd.kind === 'court' || (bd.kind === 'hall' && bd.district !== 'mithala-quays');
  let best = null;
  for (const [fx, fz] of SIDES) {
    if (long && (bd.width >= bd.depth ? fx !== 0 : fz !== 0)) continue;
    const gap = streetGap(bd.x + fx * bd.width / 2, bd.z + fz * bd.depth / 2);
    if (!best || gap < best.gap - 1e-6) best = { fx, fz, gap };
  }
  return [best.fx, best.fz];
}

/**
 * A building's frame and the means to collide and walk in it. Local x runs across the front, local z out of it (the
 * front is at +z), y up from `base`; `W` by `D` is the footprint in that frame. Its yaw is a quarter turn, so every
 * box in it is an axis-aligned box in the world.
 */
function makeSite(bd, groundHeight, push, walk, front = null) {
  const [fx, fz] = front ?? frontOf(bd), yaw = Math.atan2(fx, fz), c = Math.round(Math.cos(yaw)), sn = Math.round(Math.sin(yaw));
  const swap = fx !== 0, W = swap ? bd.depth : bd.width, D = swap ? bd.width : bd.depth;
  const toWorld = (lx, lz) => ({ x: bd.x + lx * c + lz * sn, z: bd.z - lx * sn + lz * c });
  const grounds = [];
  for (const i of [-1, 0, 1]) for (const k of [-1, 0, 1]) grounds.push(groundHeight(bd.x + i * bd.width / 2, bd.z + k * bd.depth / 2));
  const base = bd.onQuay ? MITHALA_QUAY.deck : Math.max(...grounds);
  const foot = Math.min(...grounds, base) - 1.1 - base, seed = Math.round(Math.abs(bd.x * 7.31 + bd.z * 3.17)) % 9973;
  const span = (lx0, lz0, lx1, lz1) => { const p = toWorld(lx0, lz0), q = toWorld(lx1, lz1); return { x0: Math.min(p.x, q.x), x1: Math.max(p.x, q.x), z0: Math.min(p.z, q.z), z1: Math.max(p.z, q.z) }; };
  return { bd, yaw, W, D, base, foot, seed, thatch: pick(THATCHES, seed, 3), toWorld,
    /** A box collider over a local rectangle, `y0`..`y1` above the base. */
    rect(lx0, lz0, lx1, lz1, y0, y1, part = null, kind = 'house') {
      const r = span(lx0, lz0, lx1, lz1), w = r.x1 - r.x0, d = r.z1 - r.z0;
      return push({ x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2, hx: w / 2, hz: d / 2, width: w, depth: d, angle: 0,
        minY: base + y0, maxY: base + y1, kind, id: part ? `${bd.id}-${part}` : bd.id });
    },
    round(lx, lz, r, y0, y1, part, kind = 'post') {
      const p = toWorld(lx, lz);
      return push({ x: p.x, z: p.z, r, minY: base + y0, maxY: base + y1, kind, id: `${bd.id}-${part}` });
    },
    /** A level floor over a local rectangle, `y` above the base. */
    deck(lx0, lz0, lx1, lz1, y, part) {
      const lz = (lz0 + lz1) / 2, a = toWorld(lx0, lz), b = toWorld(lx1, lz);
      return walk({ id: `${bd.id}-${part}`, kind: 'deck', a: { x: a.x, y: base + y, z: a.z }, b: { x: b.x, y: base + y, z: b.z }, width: Math.abs(lz1 - lz0) });
    },
  };
}

// ---------------------------------------------------------------------------
// Walls, openings and roofs, drawn in a building's frame
// ---------------------------------------------------------------------------
/** The four faces of a `w` by `d` box centred at (cx, cz): `at(s, y, o)` is `s` metres along the face from its left
 * end as seen from outside, `o` metres out from it. */
function facesOf(w, d, cx = 0, cz = 0) {
  return {
    front: { L: w, n: [0, 0, 1], at: (s, y, o = 0) => [cx - w / 2 + s, y, cz + d / 2 + o] },
    right: { L: d, n: [1, 0, 0], at: (s, y, o = 0) => [cx + w / 2 + o, y, cz + d / 2 - s] },
    back: { L: w, n: [0, 0, -1], at: (s, y, o = 0) => [cx + w / 2 - s, y, cz - d / 2 - o] },
    left: { L: d, n: [-1, 0, 0], at: (s, y, o = 0) => [cx - w / 2 - o, y, cz - d / 2 + s] },
  };
}
/** The same face seen from inside: its normal turned in, `o` measured inward. */
const inward = f => ({ L: f.L, n: f.n.map(v => -v), at: (s, y, o = 0) => f.at(s, y, -o) });
const fq = (b, f, tint, s0, s1, y0, y1, o = 0) => quadToward(b, tint, f.at(s0, y0, o), f.at(s1, y0, o), f.at(s1, y1, o), f.at(s0, y1, o), f.n);
/** A box standing on a face from y0 to y1: `ws` along it, `wo` deep, its middle `o` out from it. */
function fbox(b, f, tint, s, y0, y1, o, ws, wo) {
  const [x, , z] = f.at(s, 0, o), across = f.n[0] !== 0;
  b.box(tint, x, (y0 + y1) / 2, z, across ? wo : ws, y1 - y0, across ? ws : wo);
}
const bays = posts => posts.slice(1).map((p, i) => (posts[i] + p) / 2);
const nearest = (list, v) => list.reduce((best, x, i) => Math.abs(x - v) < Math.abs(list[best] - v) ? i : best, 0);

/** Brick in courses on a face, each course its own shade; under the tide line the bricks are the wet season's. */
function brickRun(b, f, s0, s1, y0, y1, seed, tide = null, o = 0) {
  if (Math.abs(s1 - s0) < .02 || y1 - y0 < .02) return;
  const cut = tide !== null && tide > y0 + .1 && tide < y1 - .1 ? tide : null;
  const bands = cut === null ? [[y0, y1, tide !== null && tide >= y1 ? WET : BRICKS]] : [[y0, cut, WET], [cut, y1, BRICKS]];
  for (const [a, c, tints] of bands) {
    const rows = Math.max(1, Math.round((c - a) / .42)), h = (c - a) / rows;
    for (let r = 0; r < rows; r++) fq(b, f, pick(tints, seed, r, a), s0, s1, a + r * h, a + (r + 1) * h, o);
  }
  if (cut !== null) fq(b, f, SILT, s0, s1, cut - .03, cut + .06, o + .012);
}
/** A brick wall between pale timber posts about `spacing` apart, on a sill and under a plate. Returns the posts. */
function framedWall(b, f, y0, y1, seed, { tide = null, spacing = 2.4, s0 = 0, s1 = f.L, post = TIMBER, sill = true, plate = true, braces = false, odd = false } = {}) {
  const L = s1 - s0; if (L < .2) return [];
  let n = Math.max(1, Math.round(L / spacing));
  // An odd number of bays puts a bay, not a post, in the middle of the wall: where a central door goes.
  if (odd && n % 2 === 0) n = L / spacing > n ? n + 1 : Math.max(1, n - 1);
  const step = L / n, posts = [];
  for (let i = 0; i < n; i++) brickRun(b, f, s0 + i * step, s0 + (i + 1) * step, y0, y1, seed + i * 13, tide);
  for (let i = 0; i <= n; i++) { posts.push(s0 + i * step); fbox(b, f, post, s0 + i * step, y0, y1, .05, .24, .18); }
  if (sill) fbox(b, f, TIMBER_2, (s0 + s1) / 2, y0, y0 + .18, .06, L + .24, .2);
  if (plate) fbox(b, f, TIMBER_2, (s0 + s1) / 2, y1 - .26, y1, .07, L + .36, .26);
  if (braces && y1 - y0 > 2.2) for (let i = 0; i < n; i++) {
    const a = s0 + i * step, c = a + step, yb = y1 - .26, k = Math.min(.85, step * .32);
    b.beam(post, f.at(a + .1, yb - k, .05), f.at(a + k, yb, .05), .13, .11);
    b.beam(post, f.at(c - .1, yb - k, .05), f.at(c - k, yb, .05), .13, .11);
  }
  return posts;
}
/** A stone plinth: footing below the ground, a dressed course on top. */
function plinth(b, foot, w, d, top, cx = 0, cz = 0) {
  b.block(FOOT, cx, foot, cz, w, top - .12 - foot, d);
  b.block(FOOT_LIGHT, cx, top - .12, cz, w + .08, .12, d + .08);
}
/** A plinth and four framed brick walls up to `plate`; returns the faces and their posts. */
function brickBody(b, s, { w, d, cx = 0, cz = 0, plinthTop = .45, plate, tide = .95, spacing = 2.4, braces = false, seed = s.seed, oddFront = false } = {}) {
  plinth(b, s.foot, w + .36, d + .36, plinthTop, cx, cz);
  const f = facesOf(w, d, cx, cz), posts = {};
  let k = 0;
  for (const [name, face] of Object.entries(f)) posts[name] = framedWall(b, face, plinthTop, plate, seed + 101 * k++, { tide, spacing, braces, odd: oddFront && name === 'front' });
  return { f, posts };
}
function doorway(b, f, s, w, h, y0, { open = false, leaf = DOOR, frame = TIMBER, bands = true } = {}) {
  fq(b, f, open ? OPENING : leaf, s - w / 2, s + w / 2, y0, y0 + h, .06);
  if (!open) {
    fq(b, f, TIMBER_DARK, s - .025, s + .025, y0, y0 + h, .075);
    if (bands) for (const y of [y0 + .35, y0 + h - .45]) fbox(b, f, IRON, s, y, y + .07, .08, w - .12, .03);
  }
  for (const side of [-1, 1]) fbox(b, f, frame, s + side * (w / 2 + .09), y0, y0 + h, .07, .18, .2);
  fbox(b, f, frame, s, y0 + h, y0 + h + .22, .08, w + .5, .24);
  fbox(b, f, FOOT_LIGHT, s, y0 - .06, y0 + .03, .2, w + .3, .4);
}
function windowOn(b, f, s, w, h, y0, { open = true } = {}) {
  fq(b, f, open ? OPENING : SHUTTER, s - w / 2, s + w / 2, y0, y0 + h, .06);
  if (open) for (const side of [-1, 1]) fq(b, f, SHUTTER, s + side * (w / 2 + .05), s + side * (w + .05), y0 + .02, y0 + h - .02, .1);
  else fq(b, f, TIMBER_DARK, s - .02, s + .02, y0, y0 + h, .075);
  fbox(b, f, TIMBER_2, s, y0 - .1, y0, .1, w + .3, .2);
  fbox(b, f, TIMBER_2, s, y0 + h, y0 + h + .12, .08, w + .2, .2);
}
/** A gable's triangle on a face, from `y0` up `rise` to its apex over the face's middle, in courses. */
function gableOn(b, f, y0, rise, seed, tints = BRICKS, o = 0) {
  const rows = Math.max(1, Math.round(rise / .42)), h = rise / rows, L = f.L;
  for (let r = 0; r < rows; r++) {
    const ya = r * h, yb = ya + h, ha = L / 2 * (1 - ya / rise), hb = L / 2 * (1 - yb / rise), c = pick(tints, seed, r);
    if (hb < .02) triToward(b, c, f.at(L / 2 - ha, y0 + ya, o), f.at(L / 2 + ha, y0 + ya, o), f.at(L / 2, y0 + yb, o), f.n);
    else quadToward(b, c, f.at(L / 2 - ha, y0 + ya, o), f.at(L / 2 + ha, y0 + ya, o), f.at(L / 2 + hb, y0 + yb, o), f.at(L / 2 - hb, y0 + yb, o), f.n);
  }
}
/** A thick reed-thatch roof over a `w` by `d` wall footprint with its plate at `y`; the ridge runs the long way. Returns
 * the ridge's top and its half-length, measured along local z when `alongZ`. */
function roofOver(b, w, d, y, rise, { cx = 0, cz = 0, hip = true, t = .6, over = 1, tint, alongZ = d > w } = {}) {
  const rw = alongZ ? d : w, rd = alongZ ? w : d;
  b.frame(cx, y, cz, alongZ ? Math.PI / 2 : 0, () => thatchRoof(b, tint, rw, rd, rise, { hip, t, over }));
  return { top: y + t + rise, half: hip ? Math.max(0, (rw - rd) / 2) : rw / 2 + over, alongZ };
}
/** A pair of river-horn horns, the Mithali finial, at a ridge's end looking out along (ux, uz). */
function horns(b, x, y, z, ux, uz, size = 1) {
  const sx = -uz, sz = ux;
  b.box(BONE, x, y + .05 * size, z, .32 * size, .24 * size, .32 * size);
  for (const side of [-1, 1]) {
    const m = [x + ux * .2 * size + sx * side * .42 * size, y + .3 * size, z + uz * .2 * size + sz * side * .42 * size];
    const t = [x + ux * .08 * size + sx * side * .6 * size, y + .82 * size, z + uz * .08 * size + sz * side * .6 * size];
    b.beam(BONE, [x, y + .1 * size, z], m, .14 * size); b.beam(BONE, m, t, .09 * size);
  }
}
function ridgeHorns(b, r, cx = 0, cz = 0, size = 1) {
  for (const e of [-1, 1]) {
    const ux = r.alongZ ? 0 : e, uz = r.alongZ ? e : 0;
    horns(b, cx + ux * r.half, r.top + .1, cz + uz * r.half, ux, uz, size);
  }
}
/** A small thatched smoke louvre standing on a ridge. */
function louvre(b, x, y, z, alongZ, tint) {
  b.box(TIMBER_DARK, x, y + .2, z, .8, .5, .8);
  b.frame(x, y + .45, z, alongZ ? Math.PI / 2 : 0, () => thatchRoof(b, tint, .8, .8, .3, { hip: false, t: .16, over: .18 }));
}
/** A round timber between two points. */
function rod(b, tint, p, q, r, sides = 8, caps = true) {
  const d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], L = Math.hypot(...d);
  if (L < 1e-4) return;
  const u = d.map(v => v / L), ref = Math.abs(u[1]) < .9 ? [0, 1, 0] : [1, 0, 0];
  const cross = (a, c) => [a[1] * c[2] - a[2] * c[1], a[2] * c[0] - a[0] * c[2], a[0] * c[1] - a[1] * c[0]];
  let e1 = cross(u, ref); const l1 = Math.hypot(...e1); e1 = e1.map(v => v / l1); const e2 = cross(u, e1);
  const dir = a => [0, 1, 2].map(i => e1[i] * Math.cos(a) + e2[i] * Math.sin(a));
  const at = (c, a) => { const v = dir(a); return [c[0] + v[0] * r, c[1] + v[1] * r, c[2] + v[2] * r]; };
  for (let i = 0; i < sides; i++) {
    const a0 = i * TAU / sides, a1 = (i + 1) * TAU / sides;
    quadToward(b, tint, at(p, a0), at(p, a1), at(q, a1), at(q, a0), dir((a0 + a1) / 2));
    if (caps) { triToward(b, tint, p, at(p, a0), at(p, a1), u.map(v => -v)); triToward(b, tint, q, at(q, a0), at(q, a1), u); }
  }
}
/** A flat disc on a face, `r` across, its middle at (s, y). */
function discOn(b, f, tint, s, y, r, o, sides = 12) {
  for (let i = 0; i < sides; i++) {
    const a0 = i * TAU / sides, a1 = (i + 1) * TAU / sides;
    triToward(b, tint, f.at(s, y, o), f.at(s + Math.cos(a0) * r, y + Math.sin(a0) * r, o), f.at(s + Math.cos(a1) * r, y + Math.sin(a1) * r, o), f.n);
  }
}
/** A grain sack standing at (x, y, z). */
const sack = (b, x, y, z, seed, yaw = 0) => { b.box(pick(SACKS, seed), x, y + .3, z, .5, .6, .38, yaw); b.box(ROPE, x, y + .64, z, .16, .1, .16, yaw); };
function trough(b, s, x, z, len, part, alongX = true) {
  const [w, d] = alongX ? [len, .6] : [.6, len];
  b.block(TIMBER_OLD, x, 0, z, w, .55, d);
  b.box(WATER_DARK, x, .5, z, w - .16, .02, d - .16);
  s.rect(x - w / 2, z - d / 2, x + w / 2, z + d / 2, 0, .6, part, 'trough');
}

// ---------------------------------------------------------------------------
// The kinds
// ---------------------------------------------------------------------------
/** A house of an old Mithali family (in the Fork: taller, gabled, horned) or a plain house of the Ford (hipped). */
function drawHouse(b, s) {
  const { bd, W, D } = s, w = W - .9, d = D - .9, old = bd.district === 'mithala-fork';
  const plate = old ? 3.3 : 2.8, t = .62, rise = Math.max(1.8, bd.height - plate - t - .25);
  const { f, posts } = brickBody(b, s, { w, d, plate });
  const mids = bays(posts.front), door = nearest(mids, f.front.L / 2);
  mids.forEach((m, i) => i === door ? doorway(b, f.front, m, 1.2, 2.1, .45) : windowOn(b, f.front, m, .75, .9, 1.35, { open: (i + s.seed) % 2 === 0 }));
  for (const side of ['left', 'right', 'back']) bays(posts[side]).forEach((m, i) => {
    if ((i + s.seed + side.length) % 2 === 0) windowOn(b, f[side], m, .7, .85, 1.4, { open: rand(s.seed, i, side.length) < .5 });
  });
  const alongZ = d > w, r = roofOver(b, w, d, plate, rise, { hip: !old, t, tint: s.thatch, alongZ });
  if (old) {
    const ends = alongZ ? [f.front, f.back] : [f.left, f.right];
    ends.forEach((e, i) => { gableOn(b, e, plate, rise, s.seed + i); if (i === 0) windowOn(b, e, e.L / 2, .8, 1, plate + .35); });
    ridgeHorns(b, r);
  } else louvre(b, 0, r.top, 0, alongZ, s.thatch);
  s.rect(-w / 2 - .2, -d / 2 - .2, w / 2 + .2, d / 2 + .2, s.foot, bd.height);
}

/** The King's Hall: the old Mithali royal hall, long and grand on a high plinth, a gabled porch on four columns before
 * its great doors, which are shut (a collider across them) until stage 2. */
function drawKingsHall(b, s) {
  const { bd, W, D } = s, porch = 2.6, w = W - .6, d = D - porch - .3, cz = (.3 - porch) / 2, front = cz + d / 2;
  const plinthTop = .75, plate = 4.8, t = .75, rise = Math.max(3, bd.height - plate - t - .3);
  const { f, posts } = brickBody(b, s, { w, d, cz, plinthTop, plate, spacing: 2.05, braces: true, tide: 1.15, oddFront: true });
  // Tall shuttered windows down both long sides, the doors in the middle of the front.
  const mids = bays(posts.front), door = nearest(mids, f.front.L / 2);
  mids.forEach((m, i) => { if (Math.abs(i - door) > 2 && i % 2 === 0) windowOn(b, f.front, m, .8, 1.6, 1.9, { open: false }); });
  bays(posts.back).forEach((m, i) => { if (i % 2 === 1) windowOn(b, f.back, m, .8, 1.6, 1.9, { open: false }); });
  for (const side of ['left', 'right']) bays(posts[side]).forEach((m, i) => { if (i % 2 === 1) windowOn(b, f[side], m, .8, 1.6, 1.9, { open: false }); });
  // The great doors, shut: two leaves banded in iron under a carved lintel, the king's horns over it.
  const dw = 3.2, dh = 3.4;
  doorway(b, f.front, f.front.L / 2, dw, dh, plinthTop, { frame: TIMBER_2 });
  for (const x of [-.7, .7]) for (const y of [plinthTop + .9, plinthTop + 1.7, plinthTop + 2.5]) b.box(IRON, x, y, front + .12, .12, .12, .06);
  horns(b, 0, plinthTop + dh + .35, front + .25, 0, 1, 1.25);
  // The porch: a stone floor a step up from the street, four pale columns, a gabled thatch with the sun disc of the
  // sky-readers in its gable.
  const px = 4.5, pz0 = front, pz1 = D / 2, colY = 4.2;
  b.block(FOOT, 0, s.foot, (pz0 + pz1) / 2, 2 * px + .2, .3 - s.foot - .1, pz1 - pz0);
  b.block(FOOT_LIGHT, 0, .2, (pz0 + pz1) / 2, 2 * px + .3, .1, pz1 - pz0 + .05);
  for (const x of [-px + .6, -1.9, 1.9, px - .6]) {
    b.block(FOOT_LIGHT, x, .3, pz1 - .4, .6, .3, .6);
    b.cylinder(TIMBER, x, .6, pz1 - .4, .22, colY - .85, 0, 7);
    b.block(TIMBER_2, x, colY - .25, pz1 - .4, .6, .25, .6);
    s.round(x, pz1 - .4, .35, 0, colY, `column-${x.toFixed(1)}`);
  }
  b.box(TIMBER_2, 0, colY + .15, pz1 - .4, 2 * px + .4, .3, .34);
  for (const x of [-px + .6, px - .6]) b.box(TIMBER_2, x, colY + .15, (pz0 + pz1 - .4) / 2, .3, .3, pz1 - .4 - pz0);
  const pr = roofOver(b, 2 * px, pz1 - 1.6, colY + .3, 3, { cz: (1.6 + pz1) / 2, hip: false, t: .6, over: .4, tint: s.thatch, alongZ: true });
  const pg = { L: 2 * px, n: [0, 0, 1], at: (q, y, o = 0) => [-px + q, y, pz1 + o] };
  gableOn(b, pg, colY + .3, 3, s.seed + 7, [TIMBER_2, TIMBER, TIMBER_2]);
  discOn(b, pg, BONE, px, colY + 1.3, .55, .04);
  for (let i = 0; i < 8; i++) { const a = i * TAU / 8, cs = px + Math.cos(a) * .72, cy = colY + 1.3 + Math.sin(a) * .72; fq(b, pg, TIMBER_DARK, cs - .06, cs + .06, cy - .06, cy + .06, .05); }
  horns(b, 0, pr.top + .1, pz1 + .4, 0, 1, .9);
  // The hall's own roof: hipped, steep, horned at both ends of the ridge, two smoke louvres.
  const r = roofOver(b, w, d, plate, rise, { cz, t, over: 1.2, tint: s.thatch, alongZ: false });
  ridgeHorns(b, r, 0, cz, 1.3);
  for (const x of [-r.half * .5, r.half * .5]) louvre(b, x, r.top, cz, false, s.thatch);
  // Solid but for the doorway, which is shut by a collider of its own.
  const z0 = cz - d / 2 - .2;
  s.rect(-w / 2 - .2, z0, w / 2 + .2, front - .35, s.foot, bd.height);
  s.rect(-w / 2 - .2, front - .35, -dw / 2 - .2, front + .2, s.foot, bd.height, 'front-west', 'wall');
  s.rect(dw / 2 + .2, front - .35, w / 2 + .2, front + .2, s.foot, bd.height, 'front-east', 'wall');
  s.rect(-dw / 2 - .2, front - .35, dw / 2 + .2, front + .2, s.foot, bd.height, 'doors', 'shut-door');
  s.deck(-px, pz0, px, pz1, .3, 'porch');
}

/** A long single-storey hall: the Cref garrison's, Mithali-built, with the conquerors' grey banners by its doors. */
function drawHall(b, s) {
  const { bd, W, D } = s, w = W - .8, d = D - .8, plate = 3.6, t = .7, rise = Math.max(2.4, bd.height - plate - t - .3);
  const { f, posts } = brickBody(b, s, { w, d, plate, spacing: 2.4, braces: true });
  const mids = bays(posts.front), doors = [Math.floor(mids.length / 4), mids.length - 1 - Math.floor(mids.length / 4)];
  mids.forEach((m, i) => doors.includes(i) ? doorway(b, f.front, m, 1.5, 2.4, .45) : windowOn(b, f.front, m, .8, 1, 1.5, { open: i % 2 === 0 }));
  for (const side of ['left', 'right', 'back']) bays(posts[side]).forEach((m, i) => { if (i % 2 === 0) windowOn(b, f[side], m, .8, 1, 1.5, { open: i % 4 === 0 }); });
  // The banners: grey cloth on short poles out from the wall, one each side of the doors.
  for (const i of doors) for (const side of [-1, 1]) {
    const m = mids[i] + side * 1.35, top = plate - .5, [x, , z] = f.front.at(m, 0, .45);
    b.beam(TIMBER_DARK, f.front.at(m, top, .05), f.front.at(m, top, .6), .08);
    b.sheet(GREYS[2], [x - .3, top - .05, z], [x + .3, top - .05, z], [x + .3, top - 1.7, z], [x - .3, top - 1.7, z]);
    b.box(GREYS[4], x, top - 1.78, z, .62, .16, .03);
  }
  // A spear rack between the doors, and a trough at the end.
  const rx = (mids[doors[0]] + mids[doors[1]]) / 2 - f.front.L / 2, rz = d / 2 + .55;
  b.box(TIMBER_DARK, rx, .5, rz, 2.2, .1, .1); b.box(TIMBER_DARK, rx, 1.5, rz - .12, 2.2, .1, .1);
  for (const e of [-1, 1]) b.block(TIMBER_DARK, rx + e * 1.05, 0, rz, .12, 1.6, .3);
  for (let i = 0; i < 6; i++) b.beam(TIMBER_OLD, [rx - .9 + i * .36, .05, rz + .12], [rx - .9 + i * .36, 2.5, rz - .2], .05);
  s.rect(rx - 1.2, rz - .3, rx + 1.2, rz + .3, 0, 2.5, 'spear-rack', 'rack');
  trough(b, s, w / 2 - 1.4, d / 2 + .55, 2, 'trough');
  const r = roofOver(b, w, d, plate, rise, { t, over: 1.1, tint: s.thatch });
  ridgeHorns(b, r);
  louvre(b, 0, r.top, 0, r.alongZ, s.thatch);
  s.rect(-w / 2 - .2, -d / 2 - .2, w / 2 + .2, d / 2 + .2, s.foot, bd.height);
}

/** A grain factors' hall: two storeys, gable to the street, brick below and close-studded timber above, jettied over
 * the street, with a hoist in the gable and loading doors on both floors. */
function drawFactorsHall(b, s) {
  const { bd, W, D } = s, jetty = .45, w = W - .9, d = D - .9 - jetty, cz = -jetty / 2;
  const ground = 3.4, upper = 6.1, t = .65, rise = Math.max(2.4, bd.height - upper - t - .25);
  const { f, posts } = brickBody(b, s, { w, d, cz, plate: ground, oddFront: true });
  doorway(b, f.front, f.front.L / 2, 2.4, 2.6, .45, { open: true });
  for (const side of ['left', 'right']) bays(posts[side]).forEach((m, i) => { if (i % 2 === 0) windowOn(b, f[side], m, .7, .8, 1.5, { open: i % 4 === 0 }); });
  bays(posts.back).forEach((m, i) => { if (i % 2 === 1) windowOn(b, f.back, m, .7, .8, 1.5); });
  // The upper storey, jettied out over the front: close studs and brick nogging, a middle rail.
  const fu = facesOf(w + .2, d + .2 + jetty, 0, cz + jetty / 2), up = {};
  let k = 0;
  for (const [name, face] of Object.entries(fu)) {
    up[name] = framedWall(b, face, ground, upper, s.seed + 300 + 57 * k++, { spacing: .95, odd: name === 'front' });
    fbox(b, face, TIMBER_2, face.L / 2, ground + 1.15, ground + 1.3, .08, face.L, .16);
  }
  for (let x = -w / 2; x <= w / 2 + 1e-6; x += w / 8) b.box(TIMBER_DARK, x, ground - .1, d / 2 + cz + jetty / 2, .2, .2, jetty + .1);
  quadToward(b, TIMBER_DARK, [-w / 2 - .1, ground - .2, cz + d / 2], [w / 2 + .1, ground - .2, cz + d / 2], [w / 2 + .1, ground - .2, cz + d / 2 + jetty + .1], [-w / 2 - .1, ground - .2, cz + d / 2 + jetty + .1], [0, -1, 0]);
  // The loading door of the upper floor, standing open in front of the studs.
  const lm = fu.front.L / 2;
  fq(b, fu.front, OPENING, lm - .7, lm + .7, ground + .25, upper - .45, .16);
  for (const e of [-1, 1]) fbox(b, fu.front, TIMBER_DARK, lm + e * .78, ground + .2, upper - .3, .17, .16, .1);
  fbox(b, fu.front, TIMBER_DARK, lm, upper - .45, upper - .3, .17, 1.72, .1);
  for (const side of ['left', 'right']) bays(up[side]).forEach((m, i) => { if (i % 3 === 1) windowOn(b, fu[side], m, .55, .7, ground + 1.45, { open: false }); });
  // Roof and gables: the gables are boarded timber, the front one with the loft door and the hoist beam over it.
  const r = roofOver(b, w + .2, d + .2 + jetty, upper, rise, { cz: cz + jetty / 2, hip: false, t, over: .9, tint: s.thatch, alongZ: true });
  gableOn(b, fu.front, upper, rise, s.seed + 1, [TIMBER_2, TIMBER, TIMBER_OLD]);
  gableOn(b, fu.back, upper, rise, s.seed + 2, [TIMBER_2, TIMBER, TIMBER_OLD]);
  const fz = fu.front.at(0, 0, 0)[2];
  fq(b, fu.front, OPENING, fu.front.L / 2 - .55, fu.front.L / 2 + .55, upper + .1, upper + 1.6, .05);
  const hy = upper + Math.min(rise - .5, 2.4);
  b.beam(TIMBER_DARK, [0, hy, fz - .6], [0, hy, fz + 1.5], .26, .3);
  b.box(TIMBER_DARK, 0, hy - .3, fz + 1.3, .18, .34, .34);
  b.beam(ROPE, [0, hy - .45, fz + 1.3], [0, ground + 1.1, fz + 1.3], .04);
  for (const [i, x] of [[0, -.18], [1, .18]]) sack(b, x, ground + .4, fz + 1.3, s.seed + i);
  ridgeHorns(b, { ...r, half: r.half - .1 }, 0, cz + jetty / 2, .9);
  // Sacks by the door.
  for (let i = 0; i < 6; i++) sack(b, (i % 3 - 1) * .55 + 2, (i < 3 ? 0 : .6), d / 2 + cz + .6, s.seed + i * 3, rand(s.seed, i) * .4);
  s.rect(2 - 1, d / 2 + cz + .25, 2 + 1, d / 2 + cz + .95, 0, 1.25, 'sacks', 'crate');
  s.rect(-w / 2 - .2, cz - d / 2 - .2, w / 2 + .2, cz + d / 2 + .2, s.foot, bd.height);
}

/** The Water Court, where the flood's claims are heard: an open-fronted hall on a stone floor a step up from the
 * street, pale columns along the front, a dais with the judges' seats at the back and the court's long water table. */
function drawCourt(b, s) {
  const { bd, W, D } = s, w = W - .6, d = D - .6, fl = .3, plate = 4.2, t = .62, rise = Math.max(2.4, bd.height - plate - t - .25), th = .4;
  plinth(b, s.foot, w + .4, d + .4, fl);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) {
    const x0 = -w / 2 + i * w / 6, x1 = x0 + w / 6, z0 = -d / 2 + j * d / 3, z1 = z0 + d / 3;
    quadToward(b, pick([FLAGS, '#8f877a', '#a39b8c'], s.seed, i, j), [x0, fl + .01, z0], [x1, fl + .01, z0], [x1, fl + .01, z1], [x0, fl + .01, z1], [0, 1, 0]);
  }
  const f = facesOf(w, d), fi = facesOf(w - 2 * th, d - 2 * th);
  for (const [k, side] of ['back', 'left', 'right'].entries()) framedWall(b, f[side], fl, plate, s.seed + k * 41, { tide: .95 });
  brickRun(b, inward(fi.back), 0, fi.back.L, fl, plate, s.seed + 5, .95);
  brickRun(b, inward(fi.left), 0, fi.left.L + th, fl, plate, s.seed + 6, .95);
  brickRun(b, inward(fi.right), -th, fi.right.L, fl, plate, s.seed + 7, .95);
  for (const e of [-1, 1]) {
    quadToward(b, pick(BRICKS, s.seed, e), [e * w / 2, fl, d / 2], [e * (w / 2 - th), fl, d / 2], [e * (w / 2 - th), plate, d / 2], [e * w / 2, plate, d / 2], [0, 0, 1]);
    windowOn(b, f[e < 0 ? 'left' : 'right'], f.left.L / 2, .8, 1.1, 1.6, { open: true });
  }
  // The front: three columns on stone bases between the side walls' ends, a plate along them.
  for (const x of [-w / 4, 0, w / 4]) {
    b.block(FOOT_LIGHT, x, fl, d / 2 - .3, .5, .25, .5);
    b.cylinder(TIMBER, x, fl + .25, d / 2 - .3, .2, plate - fl - .5, 0, 7);
    s.round(x, d / 2 - .3, .3, 0, plate, `column-${x.toFixed(1)}`);
  }
  b.box(TIMBER_2, 0, plate - .15, d / 2 - .3, w, .3, .3);
  // The dais, the seats, the water table and the measuring rods.
  const dz = -d / 2 + th + .8;
  b.block(FOOT, 0, fl, dz, w * .5, .45, 1.6); b.block(FOOT_LIGHT, 0, fl + .45, dz, w * .5 + .1, .06, 1.7);
  for (const x of [-1.6, 0, 1.6]) { b.block(TIMBER_DARK, x, fl + .51, dz - .1, .7, .45, .6); b.block(TIMBER_DARK, x, fl + .96, dz - .38, .7, x === 0 ? 1.1 : .75, .1); }
  s.rect(-w / 4 - .05, dz - .8, w / 4 + .05, dz + .85, 0, fl + 1.9, 'dais', 'dais');
  b.block(FOOT_LIGHT, 0, fl, .8, 3.4, .75, .9); b.box(WATER_DARK, 0, fl + .73, .8, 3.1, .02, .6);
  for (let i = 0; i <= 6; i++) b.box(IRON, -1.5 + i * .5, fl + .62, .8 + .46, .04, .2, .02);
  s.rect(-1.75, .8 - .5, 1.75, .8 + .5, 0, fl + .8, 'water-table', 'table');
  for (let i = 0; i < 3; i++) b.beam(TIMBER_2, [w / 2 - th - .25 - i * .35, fl, -d / 2 + th + .45], [w / 2 - th - .15 - i * .35, fl + 3, -d / 2 + th + .08], .07);
  const r = roofOver(b, w, d, plate, rise, { t, over: 1, tint: s.thatch });
  ridgeHorns(b, r);
  s.rect(-w / 2, -d / 2, w / 2, -d / 2 + th, s.foot, bd.height, 'back-wall', 'house');
  for (const e of [-1, 1]) s.rect(e < 0 ? -w / 2 : w / 2 - th, -d / 2, e < 0 ? -w / 2 + th : w / 2, d / 2, s.foot, bd.height, `${e < 0 ? 'left' : 'right'}-wall`, 'wall');
  s.deck(-w / 2 - .2, -d / 2 - .2, w / 2 + .2, d / 2 + .2, fl, 'floor');
}

/** The cattle market's pens: rails on posts round four pens, a gate on each side and between them, troughs and a hay
 * rack. They stand empty between markets. */
function drawPens(b, s) {
  const { W, D } = s, hw = W / 2 - .2, hd = D / 2 - .2, gate = 2.4;
  let n = 0;
  const run = (a, c) => {
    const L = Math.hypot(c[0] - a[0], c[1] - a[1]); if (L < .3) return;
    const k = Math.max(1, Math.round(L / 2));
    for (let i = 0; i <= k; i++) b.block(TIMBER_OLD, a[0] + (c[0] - a[0]) * i / k, -.3, a[1] + (c[1] - a[1]) * i / k, .17, 1.75, .17);
    for (const y of [.45, .85, 1.25]) b.beam(TIMBER_2, [a[0], y, a[1]], [c[0], y, c[1]], .08, .14);
    s.rect(Math.min(a[0], c[0]) - .09, Math.min(a[1], c[1]) - .09, Math.max(a[0], c[0]) + .09, Math.max(a[1], c[1]) + .09, 0, 1.45, `fence-${n++}`, 'fence');
  };
  // Outer rails with a gate into each pen from outside, then the cross rails, open where they cross so the four pens
  // are driven through one another.
  for (const [z, gx] of [[hd, -hw / 2], [-hd, hw / 2]]) { run([-hw, z], [gx - gate / 2, z]); run([gx + gate / 2, z], [hw, z]); }
  for (const [x, gz] of [[-hw, -hd / 2], [hw, hd / 2]]) { run([x, -hd], [x, gz - gate / 2]); run([x, gz + gate / 2], [x, hd]); }
  run([0, -hd], [0, -gate / 2]); run([0, gate / 2], [0, hd]);
  run([-hw, 0], [-gate / 2, 0]); run([gate / 2, 0], [hw, 0]);
  trough(b, s, -hw / 2, -hd + .8, 2.2, 'trough-1'); trough(b, s, hw / 2, hd - .8, 2.2, 'trough-2');
  // A hay rack on legs in one pen, with a little hay left in it.
  const hx = hw / 2, hz = -hd / 2;
  for (const e of [-1, 1]) for (const f of [-1, 1]) b.block(TIMBER_OLD, hx + e * .8, 0, hz + f * .35, .1, 1.4, .1);
  for (let i = 0; i < 7; i++) b.beam(TIMBER_2, [hx - .8 + i * .27, .7, hz - .35], [hx - .8 + i * .27, 1.4, hz + .35], .04);
  b.box(HAY, hx, .8, hz, 1.5, .25, .5);
  s.rect(hx - .9, hz - .45, hx + .9, hz + .45, 0, 1.4, 'hay-rack', 'rack');
}

/** A river-horn byre: low brick walls under a gabled thatch that comes down low, a wide door in the gable end with the
 * skull and horns of a river-horn over it, and a hay rack by the door. */
function drawByre(b, s) {
  const { bd, W, D } = s, w = W - .8, d = D - .8, plate = 2.3, t = .6, rise = Math.max(2, bd.height - plate - t - .2);
  const { f, posts } = brickBody(b, s, { w, d, plate, spacing: 2.2, oddFront: true });
  const alongZ = d >= w, r = roofOver(b, w, d, plate, rise, { hip: false, t, over: 1, tint: s.thatch, alongZ });
  const [g0, g1] = alongZ ? [f.front, f.back] : [f.left, f.right];
  gableOn(b, g0, plate, rise, s.seed + 1); gableOn(b, g1, plate, rise, s.seed + 2);
  doorway(b, f.front, f.front.L / 2, 2.2, 2.1, .45, { open: true, frame: TIMBER_OLD });
  const [hx, , hz] = f.front.at(f.front.L / 2, 0, .3);
  horns(b, hx, alongZ ? plate + .4 : 2.85, hz, 0, 1, 1.1);
  if (alongZ) fq(b, g0, OPENING, g0.L / 2 - .5, g0.L / 2 + .5, plate + .7, plate + 1.4, .05);
  for (const side of ['left', 'right']) bays(posts[side]).forEach((m, i) => { if (i % 2 === 0) fq(b, f[side], OPENING, m - .5, m + .5, 1.4, 1.75, .06); });
  // A slatted hay rack against the front wall beside the door.
  const ax = -w / 2 + .95, az = d / 2 + .35;
  b.box(TIMBER_OLD, ax, 1.4, az, 1.4, .1, .5);
  for (let i = 0; i < 5; i++) b.beam(TIMBER_OLD, [ax - .6 + i * .3, .8, az - .2], [ax - .6 + i * .3, 1.4, az + .2], .04);
  b.box(HAY, ax, 1.25, az, 1.3, .25, .4);
  s.rect(ax - .75, d / 2 + .1, ax + .75, az + .3, 0, 1.5, 'hay-rack', 'rack');
  ridgeHorns(b, { ...r, half: r.half - .2 }, 0, 0, .8);
  s.rect(-w / 2 - .2, -d / 2 - .2, w / 2 + .2, d / 2 + .2, s.foot, bd.height);
}

/** The threshing floor: a round floor of rammed clay in a stone kerb, a step proud of the ground, with stooks round it
 * and the stone roller the river-horns draw. */
function drawThreshingFloor(b, s) {
  const { W, D } = s, r = Math.min(W, D) / 2 - .2, top = .3, n = 20;
  drum(b, i => pick(STONES, s.seed, i), 0, s.foot + .6, 0, r, top, r, n);
  annulus(b, FOOT_LIGHT, 0, top, 0, r - .4, r, n);
  annulus(b, CLAY_FLOOR, 0, top - .01, 0, 0, r - .4, n);
  for (let i = 0; i < 9; i++) {
    const a = rand(s.seed, i) * TAU, q = rand(s.seed, i, 2) * (r - 1.2), x = Math.cos(a) * q, z = Math.sin(a) * q, yaw = rand(s.seed, i, 3) * Math.PI;
    const c = Math.cos(yaw) * .5, sn = Math.sin(yaw) * .5;
    quadToward(b, pick(THATCHES, s.seed, i), [x - c, top + .01, z - sn], [x + sn * .6, top + .01, z - c * .6], [x + c, top + .01, z + sn], [x - sn * .6, top + .01, z + c * .6], [0, 1, 0]);
  }
  // The roller on the floor, its yoke frame.
  rod(b, FOOT, [-.6, top + .32, 1.1], [.6, top + .32, 1.1], .32, 9);
  for (const e of [-1, 1]) b.beam(TIMBER_DARK, [e * .7, top + .32, 1.1], [e * .45, top + .5, 2.4], .1);
  b.beam(TIMBER_DARK, [-.45, top + .5, 2.4], [.45, top + .5, 2.4], .1);
  s.round(0, 1.4, .75, 0, 1, 'roller', 'post');
  // Stooks of sheaves standing round the floor's corners.
  for (const [i, [x, z]] of [[W / 2 - .45, D / 2 - .45], [-W / 2 + .45, D / 2 - .45], [-W / 2 + .45, -D / 2 + .45], [W / 2 - .45, -D / 2 + .45]].entries()) {
    b.cone(pick(THATCHES, s.seed, i, 9), x, 0, z, .45, 1.3, i);
    s.round(x, z, .4, 0, 1.3, `stook-${i}`, 'post');
  }
  // The floor walks as a round-ish deck: a cross and a square inside the kerb.
  const a = r * .92, q = r * Math.SQRT1_2 * .98;
  s.deck(-a, -r * .38, a, r * .38, top, 'floor-ew');
  s.deck(-r * .38, -a, r * .38, a, top, 'floor-ns');
  s.deck(-q, -q, q, q, top, 'floor');
}

/** A barn: brick walls on stone under a big gabled thatch, wagon doors standing open in the gable to the street, a
 * loft door above them and slits along the sides. */
function drawBarn(b, s) {
  const { bd, W, D } = s, w = W - .8, d = D - .8, plate = 3.2, t = .65, rise = Math.max(2.4, bd.height - plate - t - .2);
  const { f, posts } = brickBody(b, s, { w, d, plate, spacing: 2.3, braces: true, oddFront: true });
  const alongZ = d >= w, r = roofOver(b, w, d, plate, rise, { hip: false, t, over: 1, tint: s.thatch, alongZ });
  const [g0, g1] = alongZ ? [f.front, f.back] : [f.left, f.right];
  gableOn(b, g0, plate, rise, s.seed + 1); gableOn(b, g1, plate, rise, s.seed + 2);
  const m = f.front.L / 2, dw = Math.min(3.6, f.front.L - 2.2);
  doorway(b, f.front, m, dw, 3.1, .45, { open: true, frame: TIMBER_OLD });
  for (const side of [-1, 1]) fbox(b, f.front, DOOR, m + side * (dw / 2 + .2 + dw / 4), .5, 3.4, .16, dw / 2 - .1, .08);
  if (alongZ) fq(b, f.front, OPENING, m - .6, m + .6, plate + .3, plate + 1.5, .05);
  for (const side of ['left', 'right']) bays(posts[side]).forEach(c => fq(b, f[side], OPENING, c - .09, c + .09, 1.3, 2.5, .06));
  ridgeHorns(b, { ...r, half: r.half - .2 });
  s.rect(-w / 2 - .2, -d / 2 - .2, w / 2 + .2, d / 2 + .2, s.foot, bd.height);
}

/** A raised granary: a timber store of pale boards on a sill frame, lifted clear of the wet season and the rats on
 * staddle stones (the first) or on posts with stone caps (the second). People walk under it. */
function drawGranary(b, s) {
  const { bd, W, D } = s, lift = bd.posts ?? 2.2, w = W - .8, d = D - .8, plate = lift + 3.1, t = .7;
  const rise = Math.max(2.4, bd.height - plate - t - .25), staddles = bd.id.endsWith('1') || rand(s.seed, 4) < .5;
  const nx = Math.max(2, Math.round(w / 3) + 1), nz = Math.max(2, Math.round(d / 3) + 1);
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
    const x = -w / 2 + .3 + i * (w - .6) / (nx - 1), z = -d / 2 + .3 + k * (d - .6) / (nz - 1);
    if (staddles) {
      b.cylinder(FOOT, x, s.foot + .6, z, .26, lift - .5 - s.foot - .6, 0, 7);
      b.cylinder(FOOT_LIGHT, x, lift - .5, z, .55, .22, i + k, 7);
    } else {
      b.block(FOOT, x, s.foot + .6, z, .5, .3 - s.foot - .6, .5);
      b.block(TIMBER_OLD, x, .3, z, .26, lift - .8, .26);
      b.cylinder(FOOT_LIGHT, x, lift - .5, z, .5, .14, i + k, 7);
    }
    s.round(x, z, staddles ? .32 : .26, s.foot, lift - .3, `staddle-${i}-${k}`, 'post');
  }
  // Bearers on the caps, the floor, the walls of boards in their frame.
  for (let k = 0; k < nz; k++) b.box(TIMBER_DARK, 0, lift - .17, -d / 2 + .3 + k * (d - .6) / (nz - 1), w + .2, .26, .3);
  b.box(TIMBER_DARK, 0, lift + .06, 0, w + .3, .2, d + .3);
  const f = facesOf(w, d);
  for (const [k, face] of Object.values(f).entries()) {
    const rows = 10, h = (plate - lift - .2) / rows;
    for (let r = 0; r < rows; r++) fq(b, face, pick([TIMBER, TIMBER_2, TIMBER_OLD, TIMBER], s.seed + k, r), 0, face.L, lift + .16 + r * h, lift + .16 + (r + 1) * h, (r % 2) * .025);
    const n = Math.max(1, Math.round(face.L / 2));
    for (let i = 0; i <= n; i++) fbox(b, face, TIMBER_DARK, i * face.L / n, lift + .16, plate, .06, .2, .16);
    fbox(b, face, TIMBER_DARK, face.L / 2, plate - .24, plate, .08, face.L + .3, .24);
  }
  const m = f.front.L / 2;
  doorway(b, f.front, m, 1.1, 1.9, lift + .2, { frame: TIMBER_DARK, bands: false });
  // Its ladder leans on the wall beside the door, not under it, as it is kept, so nothing climbs in.
  const lp = (q, y, o) => f.front.at(m + 1.6 + q, y, o);
  for (const e of [-.22, .22]) b.beam(TIMBER_OLD, lp(e, 0, .65), lp(e, lift + .5, .12), .07);
  for (let i = 1; i <= 6; i++) { const y = i * (lift + .4) / 7; b.beam(TIMBER_OLD, lp(-.24, y, .65 - .53 * y / (lift + .5)), lp(.24, y, .65 - .53 * y / (lift + .5)), .05); }
  // The roof, hipped and thick, with a vent at each end of the ridge.
  const r = roofOver(b, w, d, plate, rise, { t, over: 1, tint: s.thatch });
  louvre(b, (r.alongZ ? 0 : r.half * .6), r.top, (r.alongZ ? r.half * .6 : 0), r.alongZ, s.thatch);
  s.rect(-w / 2 - .25, -d / 2 - .25, w / 2 + .25, d / 2 + .25, lift - .25, bd.height, null, 'house');
}

/** The Weighing House: an arcade of brick arches on piers round an open floor, a brick room above it, and under the
 * room's great beam the city's beam scale, sacks on one pan and stones on the other. */
function drawWeighingHouse(b, s) {
  const { bd, W, D } = s, w = W - .4, d = D - .4, upper = 4.1, plate = 6.6, t = .65, rise = Math.max(2.2, bd.height - plate - t - .25);
  const pier = .9, xs = [-w / 2 + pier / 2, 0, w / 2 - pier / 2], zs = [-d / 2 + pier / 2, 0, d / 2 - pier / 2];
  plinth(b, s.foot, w + .3, d + .3, .15);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const x0 = -w / 2 + i * w / 4, z0 = -d / 2 + j * d / 4;
    quadToward(b, pick([FLAGS, '#8f877a', '#a39b8c'], s.seed, i, j), [x0, .16, z0], [x0 + w / 4, .16, z0], [x0 + w / 4, .16, z0 + d / 4], [x0, .16, z0 + d / 4], [0, 1, 0]);
  }
  // Piers, and the arches between them on every side.
  for (const x of xs) for (const z of zs) {
    if (x === 0 && z === 0) continue;
    b.block(pick(BRICKS, s.seed, x, z), x, .15, z, pier, upper - .15, pier);
    b.block(FOOT_LIGHT, x, .15, z, pier + .1, .35, pier + .1);
    b.block(FOOT_LIGHT, x, 2.35, z, pier + .12, .15, pier + .12);
    s.rect(x - pier / 2, z - pier / 2, x + pier / 2, z + pier / 2, s.foot, upper, `pier-${x.toFixed(1)}-${z.toFixed(1)}`, 'pier');
  }
  const arch = (yaw, off, side) => b.frame(0, 0, 0, yaw, () => {
    const span = (side - 3 * pier) / 2, R0 = span / 2, spring = 2.5, rise0 = 1.05, R = (R0 * R0 + rise0 * rise0) / (2 * rise0), alpha = Math.asin(R0 / R), yc = spring + rise0 - R;
    for (const cx of [-(pier / 2 + R0), pier / 2 + R0]) {
      for (let i = 0; i < 6; i++) {
        const a0 = -alpha + 2 * alpha * i / 6, a1 = -alpha + 2 * alpha * (i + 1) / 6, am = (a0 + a1) / 2;
        b.box(i % 2 ? FOOT_LIGHT : pick(BRICKS, s.seed, i), cx + Math.sin(am) * (R + .2), yc + Math.cos(am) * (R + .2), off, 2 * (R + .2) * Math.sin((a1 - a0) / 2) + .03, .4, pier, 0, 0, -am);
        const x0 = cx + Math.sin(a0) * R, x1 = cx + Math.sin(a1) * R, ytop = yc + Math.max(Math.cos(a0), Math.cos(a1)) * R;
        b.box(pick(BRICKS, s.seed, i, 5), (x0 + x1) / 2, (ytop + upper) / 2 + .2, off, Math.abs(x1 - x0) + .02, upper - ytop - .4, pier - .04);
      }
    }
  });
  arch(0, d / 2 - pier / 2, w); arch(Math.PI, d / 2 - pier / 2, w); arch(Math.PI / 2, w / 2 - pier / 2, d); arch(-Math.PI / 2, w / 2 - pier / 2, d);
  s.deck(-w / 2, -d / 2, w / 2, d / 2, .15, 'floor');
  // The room over the arcade: a ceiling of joists, framed brick walls with shuttered windows.
  quadToward(b, TIMBER_DARK, [-w / 2, upper - .05, -d / 2], [w / 2, upper - .05, -d / 2], [w / 2, upper - .05, d / 2], [-w / 2, upper - .05, d / 2], [0, -1, 0]);
  for (let i = 1; i < 6; i++) b.box(TIMBER_OLD, -w / 2 + i * w / 6, upper - .2, 0, .2, .25, d - .2);
  b.box(TIMBER_DARK, 0, upper - .35, 0, w - .2, .4, .5);
  b.box(FOOT_LIGHT, 0, upper + .05, 0, w + .25, .14, d + .25);
  const f = facesOf(w, d);
  for (const [k, face] of Object.values(f).entries()) {
    const posts = framedWall(b, face, upper + .12, plate, s.seed + 70 * k, { spacing: 2.5 });
    bays(posts).forEach((m, i) => { if (i % 2 === 1) windowOn(b, face, m, .8, .9, upper + .8, { open: k % 2 === 0 }); });
  }
  // The beam scale.
  const arm = 2.2, tilt = .05, yb = 2.95, pan = .5;
  b.box(IRON, 0, (yb + upper - .55) / 2, 0, .12, upper - .55 - yb, .12);
  b.box(TIMBER_DARK, 0, yb, 0, .3, .5, .3);
  b.beam(TIMBER_DARK, [-arm - .1, yb + tilt * arm, 0], [arm + .1, yb - tilt * arm, 0], .2, .26);
  for (const e of [-1, 1]) {
    const ex = e * arm, ey = yb - e * tilt * arm, py = pan - e * .06;
    for (const [cx, cz] of [[-.55, -.55], [.55, -.55], [.55, .55], [-.55, .55]]) b.beam(ROPE, [ex, ey - .1, 0], [ex + cx, py + .1, cz], .035);
    b.box(TIMBER_OLD, ex, py, 0, 1.3, .1, 1.3);
    s.rect(ex - .7, -.7, ex + .7, .7, 0, py + .95, `pan-${e < 0 ? 'west' : 'east'}`, 'scale');
  }
  for (let i = 0; i < 3; i++) sack(b, -arm + (i - 1) * .38, pan + .06 + .06, (i % 2 ? .2 : -.2), s.seed + i);
  for (let i = 0; i < 3; i++) b.block(i === 2 ? IRON : FOOT_DARK, arm + (i - 1) * .4, pan - .06 + .05, i % 2 ? .25 : -.2, .32, .28 - i * .04, .32);
  const r = roofOver(b, w, d, plate, rise, { t, over: 1, tint: s.thatch });
  louvre(b, 0, r.top, 0, r.alongZ, s.thatch);
  s.rect(-w / 2 - .1, -d / 2 - .1, w / 2 + .1, d / 2 + .1, upper - .6, bd.height, null, 'house');
}

/** An inn with a yard: a two-storey range on the street, its upper storey jettied timber, a gateway at one end under the
 * inn's sign into a walled yard with a stable lean-to along the back, a well, a trough and a cart. */
function drawInn(b, s) {
  const { bd, W, D } = s, gate = 3.4, wall = .4, fr = Math.min(6, Math.max(4.5, D * .42));
  const rw = W - gate - .6, rcx = -W / 2 + .3 + rw / 2, rcz = D / 2 - .3 - fr / 2, ground = 3, upper = 5.4, t = .62;
  const rise = Math.max(2, bd.height - upper - t - .25), jetty = .4;
  const { f, posts } = brickBody(b, s, { w: rw, d: fr, cx: rcx, cz: rcz, plate: ground });
  const mids = bays(posts.front), door = mids.length - 1;
  mids.forEach((m, i) => i === door ? doorway(b, f.front, m, 1.3, 2.2, .45, { open: true }) : windowOn(b, f.front, m, .85, 1, 1.3, { open: true }));
  bays(posts.back).forEach((m, i) => { if (i % 2 === 0) doorway(b, f.back, m, 1.1, 2.1, .45, { bands: false }); else windowOn(b, f.back, m, .7, .8, 1.4); });
  const fu = facesOf(rw + .1, fr + .1 + jetty, rcx, rcz + jetty / 2);
  let k = 0;
  for (const [name, face] of Object.entries(fu)) {
    const up = framedWall(b, face, ground, upper, s.seed + 200 + 31 * k++, { spacing: 1.1 });
    if (name !== 'left') bays(up).forEach((m, i) => { if (i % 2 === 1) windowOn(b, face, m, .6, .75, ground + .9, { open: name === 'front' }); });
  }
  quadToward(b, TIMBER_DARK, [rcx - rw / 2, ground - .15, rcz + fr / 2], [rcx + rw / 2, ground - .15, rcz + fr / 2], [rcx + rw / 2, ground - .15, rcz + fr / 2 + jetty + .05], [rcx - rw / 2, ground - .15, rcz + fr / 2 + jetty + .05], [0, -1, 0]);
  for (let i = 0; i <= 6; i++) b.box(TIMBER_DARK, rcx - rw / 2 + i * rw / 6, ground - .05, rcz + fr / 2 + jetty / 2, .18, .18, jetty + .05);
  const r = roofOver(b, rw + .1, fr + .1 + jetty, upper, rise, { cx: rcx, cz: rcz + jetty / 2, t, over: 1, tint: s.thatch });
  louvre(b, rcx + (r.alongZ ? 0 : r.half * .5), r.top, rcz + jetty / 2, r.alongZ, s.thatch);
  s.rect(rcx - rw / 2 - .2, rcz - fr / 2 - .2, rcx + rw / 2 + .2, rcz + fr / 2 + .2, s.foot, bd.height);
  // The yard walls, brick with a coping, and the gateway at the street end.
  const yw = (x0, z0, x1, z1, part, h = 2.2) => {
    const along = Math.abs(x1 - x0) > Math.abs(z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, L = along ? x1 - x0 : z1 - z0;
    b.block(FOOT, cx, s.foot, cz, along ? L : wall + .1, .4 - s.foot, along ? wall + .1 : L);
    b.block(pick(BRICKS, s.seed, cx, cz), cx, .4, cz, along ? L : wall, h - .4, along ? wall : L);
    b.block(FOOT_LIGHT, cx, h, cz, along ? L + .06 : wall + .14, .12, along ? wall + .14 : L + .06);
    b.box(WET[0], cx, .7, cz, along ? L + .01 : wall + .01, .6, along ? wall + .01 : L + .01);
    s.rect(Math.min(x0, x1) - (along ? 0 : wall / 2), Math.min(z0, z1) - (along ? wall / 2 : 0), Math.max(x0, x1) + (along ? 0 : wall / 2), Math.max(z0, z1) + (along ? wall / 2 : 0), s.foot, h + .2, part, 'wall');
  };
  const xr = W / 2 - .3, xl = -W / 2 + .3, zb = -D / 2 + .3, zf = D / 2 - .3;
  yw(xr, zb, xr, zf, 'yard-wall-side'); yw(xl, zb, xr, zb, 'yard-wall-back', 3.2); yw(xl, zb, xl, rcz - fr / 2, 'yard-wall-end');
  const g0 = rcx + rw / 2 + .2, g1 = xr - wall / 2;
  for (const [i, x] of [g0 + .15, g1 - .15].entries()) { b.block(TIMBER_DARK, x, 0, zf, .3, 3.6, .3); s.round(x, zf, .2, 0, 3.6, `gate-post-${i}`); }
  b.box(TIMBER_DARK, (g0 + g1) / 2, 3.65, zf, g1 - g0 + .4, .3, .34);
  for (const x of [g0 + .3, g1 - .3]) b.box(DOOR, x + (x < (g0 + g1) / 2 ? .05 : -.05), 1.3, zf - .9, .08, 2.2, 1.5);
  // The sign: a board hung from a bracket over the street, painted with a sheaf.
  const sx = (g0 + g1) / 2;
  b.beam(TIMBER_DARK, [sx, 3.5, zf], [sx, 3.5, zf + 1.2], .1);
  for (const e of [-.3, .3]) b.beam(IRON, [sx + e, 3.45, zf + .9], [sx + e, 2.75, zf + .9], .02);
  b.box(TIMBER_OLD, sx, 2.35, zf + .9, .95, .8, .06);
  for (const side of [-1, 1]) { b.box('#c59a3a', sx, 2.35, zf + .9 + side * .04, .2, .55, .01); b.box('#c59a3a', sx, 2.6, zf + .9 + side * .04, .5, .12, .01); }
  // The stable lean-to against the back wall: posts, a thatched pent roof, stall boards.
  const sd = 2.4, sz = zb + wall / 2 + sd, sl = xl + wall / 2, sr = xr - wall / 2;
  const nposts = Math.max(2, Math.round((sr - sl) / 2.6) + 1);
  for (let i = 0; i < nposts; i++) {
    const x = sl + .2 + i * (sr - sl - .4) / (nposts - 1);
    b.block(TIMBER_OLD, x, 0, sz, .2, 2.3, .2);
    s.round(x, sz, .16, 0, 2.3, `stable-post-${i}`);
    if (i > 0 && i < nposts - 1) b.box(TIMBER_2, x, .65, sz - sd / 2, .06, 1.3, sd - .1);
  }
  b.box(TIMBER_DARK, (sl + sr) / 2, 2.38, sz, sr - sl, .16, .2);
  {
    // The pent roof of thatch from the back wall's head out over the posts.
    const zw = zb + wall / 2, zo = sz + .5, yw0 = 3.1, yo = 2.3, th = .32, edge = '#8b7b50';
    const P0 = [sl, yw0, zw], P1 = [sr, yw0, zw], P2 = [sr, yo, zo], P3 = [sl, yo, zo], up = p => [p[0], p[1] + th, p[2]];
    quadToward(b, s.thatch, up(P0), up(P1), up(P2), up(P3), [0, 1, zo > zw ? .5 : -.5]);
    quadToward(b, edge, P0, P1, P2, P3, [0, -1, 0]);
    quadToward(b, edge, P3, P2, up(P2), up(P3), [0, 0, Math.sign(zo - zw)]);
    for (const [a, c, e] of [[P0, P3, -1], [P1, P2, 1]]) quadToward(b, edge, a, c, up(c), up(a), [e, 0, 0]);
  }
  // A well with its winding frame, a trough, a cart.
  const yz = (sz + (rcz - fr / 2)) / 2, wx = xl + 1.6;
  if (rcz - fr / 2 - sz > 2.2) {
    drum(b, i => pick(STONES, s.seed, i), wx, 0, yz, .7, .85, .7, 10);
    annulus(b, FOOT_LIGHT, wx, .85, yz, .5, .72, 10); annulus(b, WATER_DARK, wx, .55, yz, 0, .5, 10);
    for (const e of [-1, 1]) b.block(TIMBER_DARK, wx + e * .62, .8, yz, .12, 1.3, .12);
    rod(b, TIMBER_OLD, [wx - .6, 1.85, yz], [wx + .6, 1.85, yz], .1, 6);
    b.beam(ROPE, [wx, 1.8, yz], [wx, .9, yz], .03); b.box(TIMBER_OLD, wx, .8, yz, .26, .3, .26);
    s.round(wx, yz, .8, 0, 2, 'well', 'post');
    trough(b, s, (sl + sr) / 2 + 1, yz + .4, 1.8, 'trough');
  }
  const cx = Math.min(sr - 1.4, g0 + (g1 - g0) / 2), cz = sz + 1.6;
  if (cz + 1.2 < rcz - fr / 2) {
    b.block(TIMBER_OLD, cx, .65, cz, 1.3, .2, 2.1);
    for (const e of [-1, 1]) { rod(b, TIMBER_DARK, [cx + e * .72, .55, cz], [cx + e * .82, .55, cz], .55, 10); b.box(TIMBER_DARK, cx + e * .45, .9, cz, .08, .3, 2); }
    b.beam(TIMBER_DARK, [cx - .3, .7, cz + 1], [cx - .35, .05, cz + 1.9], .08); b.beam(TIMBER_DARK, [cx + .3, .7, cz + 1], [cx + .35, .05, cz + 1.9], .08);
    for (let i = 0; i < 3; i++) sack(b, cx + (i - 1) * .4, .75, cz - .3 + (i % 2) * .5, s.seed + 40 + i);
    s.rect(cx - .9, cz - 1.1, cx + .9, cz + 1.1, 0, 1.5, 'cart', 'cart');
  }
}

/** A smithy: a brick back room, and before it a forge shed open on the front and sides under the same thatch, the
 * hearth against the back room's wall with its tall brick chimney up through the roof, bellows, anvil and quench tub. */
function drawSmithy(b, s) {
  const { bd, W, D } = s, w = W - .6, d = D - .6, plate = 2.8, t = .6, rise = Math.max(2, bd.height - plate - t - .25);
  const back = d * .42, bcz = -d / 2 + back / 2, shed0 = -d / 2 + back;
  const { f, posts } = brickBody(b, s, { w, d: back, cz: bcz, plate });
  bays(posts.front).forEach((m, i, list) => { if (i === list.length - 1) doorway(b, f.front, m, 1.1, 2.1, .45, { bands: false }); });
  bays(posts.back).forEach((m, i) => { if (i % 2 === 0) windowOn(b, f.back, m, .7, .7, 1.5, { open: false }); });
  // The shed: posts on stone pads, a plate on them, a floor of trodden earth and clinker.
  plinth(b, s.foot, w + .2, d - back, .05, 0, shed0 + (d - back) / 2);
  quadToward(b, BURNT, [-w / 2, .06, shed0], [w / 2, .06, shed0], [w / 2, .06, d / 2], [-w / 2, .06, d / 2], [0, 1, 0]);
  const xs = [-w / 2 + .15, 0, w / 2 - .15], zs = [d / 2 - .15, shed0 + (d / 2 - shed0) / 2];
  for (const x of xs) for (const z of zs) {
    if (z !== zs[0] && x === 0) continue;
    b.block(FOOT_LIGHT, x, 0, z, .4, .2, .4); b.block(TIMBER, x, .2, z, .24, plate - .2, .24);
    s.round(x, z, .2, 0, plate, `post-${x.toFixed(1)}-${z.toFixed(1)}`);
  }
  for (const x of [-w / 2 + .15, w / 2 - .15]) b.box(TIMBER_2, x, plate - .13, (shed0 + d / 2) / 2, .26, .26, d / 2 - shed0);
  b.box(TIMBER_2, 0, plate - .13, d / 2 - .15, w + .2, .26, .26);
  const r = roofOver(b, w, d, plate, rise, { hip: false, t, over: .8, tint: s.thatch, alongZ: true });
  const ff = facesOf(w, d);
  gableOn(b, ff.front, plate, rise, s.seed + 1, [TIMBER_2, TIMBER_OLD]);
  gableOn(b, ff.back, plate, rise, s.seed + 2);
  // The hearth and its chimney, the coals glowing.
  const hx = -w / 2 + 1.5, hz = shed0 + .7;
  b.block(pick(BRICKS, s.seed, 1), hx, 0, hz, 1.9, .95, 1.4);
  b.block(FOOT_LIGHT, hx, .95, hz, 2, .08, 1.5);
  b.box(COALS, hx, 1.06, hz + .1, 1, .08, .8); b.box(EMBER, hx, 1.1, hz + .1, .6, .04, .5);
  b.block(pick(BRICKS, s.seed, 2), hx, 1.03, shed0 + .35, 1.5, 1.2, .7);
  const cTop = r.top + 1.6;
  b.block(pick(BRICKS, s.seed, 3), hx, 2.2, shed0 + .3, 1.05, cTop - 2.2, 1.05);
  b.block(FOOT_LIGHT, hx, cTop, shed0 + .3, 1.2, .14, 1.2);
  b.block(BURNT, hx, cTop + .14, shed0 + .3, .6, .25, .6);
  // Bellows by the hearth, the anvil on its stump, the quench tub, iron bars and a heap of charcoal.
  b.box(LEATHER, hx + 1.35, .8, hz - .1, .7, .3, 1.2, 0, .12); b.box(TIMBER_DARK, hx + 1.35, .62, hz - .1, .72, .06, 1.25);
  b.beam(TIMBER_DARK, [hx + 1.35, .95, hz + .5], [hx + 1.35, 1.7, hz + 1.3], .07);
  const ax = .6, az = shed0 + 2;
  b.cylinder(TIMBER_OLD, ax, 0, az, .3, .55, 0, 7);
  b.box(IRON, ax, .7, az, .3, .3, .7); b.box(IRON, ax, .86, az, .36, .1, .8); b.box(IRON, ax, .84, az + .5, .14, .08, .3);
  s.round(ax, az, .45, 0, 1, 'anvil');
  b.cylinder(TIMBER_DARK, -w / 2 + .9, 0, d / 2 - 1.1, .38, .6, 0, 8); annulus(b, WATER_DARK, -w / 2 + .9, .58, d / 2 - 1.1, 0, .33, 8);
  s.round(-w / 2 + .9, d / 2 - 1.1, .42, 0, .7, 'quench-tub');
  for (let i = 0; i < 5; i++) b.box(i % 2 ? IRON : '#55595c', w / 2 - .6, .06 + i * .07, shed0 + 1.2 + (i % 3) * .08, .3, .06, 2);
  b.cone(COALS, w / 2 - .7, .05, d / 2 - .9, .55, .45, 0);
  s.rect(hx - 1, shed0 - .1, hx + 1.75, hz + .75, 0, cTop, 'hearth', 'hearth');
  s.rect(w / 2 - .85, shed0 + .9, w / 2 - .3, shed0 + 2.4, 0, .5, 'iron', 'crate');
  s.rect(-w / 2 - .2, -d / 2 - .2, w / 2 + .2, shed0 + .05, s.foot, bd.height);
}

/** The mountain market: a paved floor a step up from the street, two rows of stalls under striped awnings along an
 * aisle, selling Lotharn iron, Amodian chestnuts and the plain's grain. */
function drawMarket(b, s) {
  const { W, D } = s, top = .3;
  plinth(b, s.foot, W, D, top);
  for (let i = 0; i < 5; i++) for (let j = 0; j < 7; j++) {
    const x0 = -W / 2 + i * W / 5, z0 = -D / 2 + j * D / 7;
    quadToward(b, pick([FLAGS, '#8f877a', '#a39b8c', '#958c7d'], s.seed, i, j), [x0, top + .01, z0], [x0 + W / 5, top + .01, z0], [x0 + W / 5, top + .01, z0 + D / 7], [x0, top + .01, z0 + D / 7], [0, 1, 0]);
  }
  s.deck(-W / 2, -D / 2, W / 2, D / 2, top, 'floor');
  const goods = ['iron', 'chestnuts', 'grain', 'pots', 'cloth', 'chestnuts'];
  const per = Math.max(1, Math.floor((D - 1) / 4.4)), len = 3.4, depth = 2, aisle = Math.max(1.9, W / 2 - depth - .5);
  let n = 0;
  for (const side of [-1, 1]) for (let i = 0; i < per; i++) {
    const cz = -D / 2 + .5 + (i + .5) * (D - 1) / per, x0 = side * aisle, x1 = side * (aisle + depth), seed = s.seed + n * 17, kind = goods[n % goods.length];
    for (const x of [x0, x1]) for (const z of [cz - len / 2, cz + len / 2]) {
      b.block(TIMBER_OLD, x, top, z, .14, (x === x1 ? 2.6 : 2.2), .14);
      s.round(x, z, .12, 0, top + 2.6, `stall-${n}-post-${x === x1 ? 'back' : 'front'}-${z < cz ? 'n' : 's'}`);
    }
    // The awning in stripes, high at the back and out over the counter.
    const tint = CANVAS[n % CANVAS.length], strips = 5;
    for (let k = 0; k < strips; k++) {
      const z0 = cz - len / 2 - .1 + k * (len + .2) / strips, z1 = z0 + (len + .2) / strips;
      b.sheet(k % 2 ? CANVAS_PALE : tint, [x1, top + 2.65, z0], [x1, top + 2.65, z1], [x0 - side * .45, top + 2.1, z1], [x0 - side * .45, top + 2.1, z0]);
    }
    b.sheet(tint, [x0 - side * .45, top + 2.1, cz - len / 2 - .1], [x0 - side * .45, top + 2.1, cz + len / 2 + .1], [x0 - side * .45, top + 1.85, cz + len / 2 + .1], [x0 - side * .45, top + 1.85, cz - len / 2 - .1]);
    // The counter and what is on it.
    const cx = x0 + side * .4;
    b.block(TIMBER_2, cx, top, cz, .7, .85, len - .3);
    b.block(TIMBER_OLD, cx, top + .85, cz, .8, .06, len - .2);
    const y = top + .91;
    if (kind === 'iron') for (let k = 0; k < 8; k++) b.box(k % 2 ? IRON : '#55595c', cx, y + .04 + Math.floor(k / 4) * .08, cz - .6 + (k % 4) * .4, .5, .07, .09);
    else if (kind === 'chestnuts') for (let k = 0; k < 3; k++) { b.cylinder(BASKET, cx, y, cz - 1 + k * 1, .28, .3, k, 7); annulus(b, CHESTNUT, cx, y + .28, cz - 1 + k, 0, .25, 7); }
    else if (kind === 'grain') for (let k = 0; k < 4; k++) sack(b, cx, y, cz - 1.1 + k * .72, seed + k);
    else if (kind === 'pots') for (let k = 0; k < 5; k++) b.cylinder(CLAY_POT, cx + (k % 2) * .1, y, cz - 1.2 + k * .6, .17 + (k % 3) * .04, .3 + (k % 2) * .12, k, 7);
    else for (let k = 0; k < 4; k++) b.box(pick(CLOTH, seed, k), cx, y + .1, cz - 1 + k * .65, .55, .2, .45);
    s.rect(Math.min(cx - .4, cx + .4), cz - len / 2 + .1, Math.max(cx - .4, cx + .4), cz + len / 2 - .1, 0, top + 1.2, `stall-${n}-counter`, 'counter');
    // Behind the counter: baskets and sacks of stock.
    for (let k = 0; k < 2; k++) sack(b, x1 - side * .45, top, cz - .8 + k * 1.6, seed + 9 + k);
    n++;
  }
}

/** The warehouse crane on the quay: a mast on crossed sills with raking braces, a winch on the mast, and a jib slewed
 * out over the water toward the nearest barge with a sling of sacks on its rope. Its collider is the mast alone, so the
 * quay stays passable either side. Drawn in a frame that is not turned. */
function drawCrane(b, s) {
  const { bd } = s, q = MITHALA_QUAY.points;
  let best = null;
  for (let i = 1; i < q.length; i++) { const d = mithalaSegmentDistance(bd.x, bd.z, q[i - 1], q[i]); if (!best || d < best.d) best = { d, a: q[i - 1], c: q[i] }; }
  let ux = 1, uz = 0;
  if (best) { const l = Math.hypot(best.c.x - best.a.x, best.c.z - best.a.z); ux = (best.c.x - best.a.x) / l; uz = (best.c.z - best.a.z) / l; }
  let nx = -uz, nz = ux;
  if (mithalaCityWaterClearance(bd.x + nx * 4, bd.z + nz * 4) > mithalaCityWaterClearance(bd.x - nx * 4, bd.z - nz * 4)) { nx = -nx; nz = -nz; }
  const mx = 0, mz = 0;
  const barge = MITHALA_BARGES.reduce((p, c) => !p || Math.hypot(c.x - bd.x, c.z - bd.z) < Math.hypot(p.x - bd.x, p.z - bd.z) ? c : p, null);
  let hx = nx, hz = nz, reach = 7;
  if (barge) { const dx = barge.x - bd.x - mx, dz = barge.z - bd.z - mz, l = Math.hypot(dx, dz); if (l > 3 && dx * nx + dz * nz > 0) { hx = dx / l; hz = dz / l; reach = Math.max(5, Math.min(9.5, l * .85)); } }
  const H = Math.min(bd.height, 12) - .6, jy = H - 2.8;
  b.beam(TIMBER_DARK, [mx - ux * .85, .1, mz - uz * .85], [mx + ux * .85, .1, mz + uz * .85], .26, .22);
  b.beam(TIMBER_DARK, [mx - nx * .85, .1, mz - nz * .85], [mx + nx * .85, .1, mz + nz * .85], .26, .22);
  b.beam(TIMBER_OLD, [mx, -.4, mz], [mx, H, mz], .42, .42);
  b.box(TIMBER_DARK, mx, H + .12, mz, .55, .25, .55);
  for (const [ax, az] of [[ux, uz], [-ux, -uz], [nx, nz], [-nx, -nz]]) b.beam(TIMBER_OLD, [mx + ax * .78, .2, mz + az * .78], [mx + ax * .16, 2.6, mz + az * .16], .14);
  // The winch on the landward face of the mast: a drum between cheeks, cranks at either end.
  const wx = mx - nx * .36, wz = mz - nz * .36;
  rod(b, TIMBER_2, [wx - ux * .38, 1.1, wz - uz * .38], [wx + ux * .38, 1.1, wz + uz * .38], .17, 8);
  for (const e of [-1, 1]) {
    b.box(TIMBER_DARK, wx + ux * e * .42, 1.05, wz + uz * e * .42, .08, .6, .08);
    b.beam(IRON, [wx + ux * e * .47, 1.1, wz + uz * e * .47], [wx + ux * e * .47 - nx * .02, 1.38, wz + uz * e * .47 - nz * .02], .04);
  }
  // The jib, its knee brace and stay, the rope and the hanging load.
  const tx = mx + hx * reach, tz = mz + hz * reach, ty = jy + .7;
  b.beam(TIMBER_OLD, [mx - hx * .5, jy, mz - hz * .5], [tx, ty, tz], .28, .32);
  b.beam(TIMBER_DARK, [mx + hx * .2, jy - 2.4, mz + hz * .2], [mx + hx * reach * .38, jy + .2, mz + hz * reach * .38], .16);
  b.beam(ROPE, [mx, H + .2, mz], [tx, ty + .1, tz], .045);
  b.box(TIMBER_DARK, tx, ty - .25, tz, .26, .32, .26);
  b.beam(ROPE, [tx, ty - .1, tz], [mx + hx * .25, jy - .1, mz + hz * .25], .035);
  b.beam(ROPE, [mx + hx * .25, jy - .1, mz + hz * .25], [wx, 1.25, wz], .035);
  const ly = Math.max(1.6, jy - 4.2);
  b.beam(ROPE, [tx, ty - .4, tz], [tx, ly + .9, tz], .04);
  b.box(IRON, tx, ly + .85, tz, .12, .14, .12);
  for (const e of [-1, 1]) b.beam(ROPE, [tx, ly + .85, tz], [tx + e * .32, ly + .45, tz], .03);
  for (let i = 0; i < 3; i++) sack(b, tx + (i - 1) * .32, ly - .25, tz + (i % 2) * .14, s.seed + i, .3);
  // Only the mast collides, with its winch.
  s.round(mx, mz, .6, -.5, H + .4, 'mast', 'post');
}

const DRAW = Object.freeze({ house: drawHouse, hall: drawHall, court: drawCourt, pens: drawPens, byre: drawByre,
  floor: drawThreshingFloor, barn: drawBarn, granary: drawGranary, weighing: drawWeighingHouse, inn: drawInn,
  smithy: drawSmithy, market: drawMarket, crane: drawCrane });
function drawerOf(bd) {
  if (bd.kind === 'hall' && bd.shut) return drawKingsHall;
  if (bd.kind === 'hall' && bd.district === 'mithala-quays') return drawFactorsHall;
  return DRAW[bd.kind] ?? drawHouse;
}

// ---------------------------------------------------------------------------
// The sky tower
// ---------------------------------------------------------------------------
/** Courses on a face with holes cut where a door goes through, each row broken in bond and each block its own shade. */
function coursed(b, f, y0, y1, rowH, tintOf, { holes = [], o = 0, segs = 3 } = {}) {
  const rows = Math.max(1, Math.round((y1 - y0) / rowH)), h = (y1 - y0) / rows, L = f.L, seg = L / segs;
  for (let r = 0; r < rows; r++) {
    const ya = y0 + r * h, yb = ya + h, cuts = [ya, yb];
    for (const hole of holes) for (const y of [hole.y0, hole.y1]) if (y > ya + 1e-4 && y < yb - 1e-4) cuts.push(y);
    cuts.sort((p, q) => p - q);
    const breaks = [0];
    for (let x = r % 2 ? seg / 2 : seg; x < L - 1e-3; x += seg) breaks.push(x);
    breaks.push(L);
    for (let c = 1; c < cuts.length; c++) {
      const ca = cuts[c - 1], cb = cuts[c], mid = (ca + cb) / 2, open = holes.filter(hole => mid > hole.y0 && mid < hole.y1);
      for (let k = 1; k < breaks.length; k++) {
        let spans = [[breaks[k - 1], breaks[k]]];
        for (const hole of open) spans = spans.flatMap(([p, q]) => [[p, Math.min(q, hole.s0)], [Math.max(p, hole.s1), q]]).filter(([p, q]) => q - p > 1e-3);
        for (const [p, q] of spans) fq(b, f, tintOf(r, k, ya), p, q, ca, cb, o);
      }
    }
  }
  return h;
}

/**
 * The sky tower: forty metres of dark brick with stone quoins, on a stone base, slit windows over each flight, a
 * corbelled parapet round the open platform, and on the parapet the sighting stones - the horizon marks of the
 * equinox and solstice risings and settings, north and south - with the backsight pillar and the ring of the flood
 * calendar's thirteen moons on the platform. Inside, the stair of `MITHALA_TOWER_STAIR` climbs the four walls flight by
 * flight on stone treads, a timber railing on its open side.
 */
function* drawTower(b, bd, groundHeight, push, walk, metrics) {
  const st = MITHALA_TOWER_STAIR, T = st.tower, half = T.size / 2, inner = half - T.wall, tx = T.x, tz = T.z;
  const floor = P, top = P + st.top, crown = P + T.height, width = st.flights[0].width;
  const foot = Math.min(...[[0, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]].map(([i, k]) => groundHeight(tx + i * half, tz + k * half))) - 1.8;
  const id = bd.id, doorZ = st.door.z - tz, rowH = .6;
  const rows = Math.round(T.height / rowH), h = T.height / rows, doorHead = floor + 4 * h, plinthTop = floor + 2 * h;
  const outer = facesOf(T.size, T.size), inside = facesOf(2 * inner, 2 * inner);
  const tint = (r, k, y) => y < plinthTop - 1e-3 ? pick(STONES, 900 + r, k) : pick(BRICKS, 911 + r, k);
  b.frame(tx, 0, tz, 0, () => {
    b.block(FOOT_DARK, 0, foot, 0, T.size + .5, floor - .05 - foot, T.size + .5);
    // The faces, outside and in, the west ones with the doorway cut through.
    Object.entries(outer).forEach(([name, f], i) => {
      const holes = name === 'left' ? [{ s0: doorZ - width / 2 + half, s1: doorZ + width / 2 + half, y0: floor - 1, y1: doorHead }] : [];
      coursed(b, f, floor, crown, h, tint, { holes });
      // Quoins: long and short stones in turn up each corner.
      for (let r = 2; r < rows; r++) {
        const q = (r + i) % 2 ? .95 : .5, ya = floor + r * h, c = r % 2 ? FOOT_LIGHT : FOOT;
        fq(b, f, c, 0, q, ya, ya + h, .025); fq(b, f, c, f.L - q, f.L, ya, ya + h, .025);
      }
    });
    Object.entries(inside).forEach(([name, f]) => {
      const holes = name === 'left' ? [{ s0: doorZ - width / 2 + inner, s1: doorZ + width / 2 + inner, y0: floor - 1, y1: doorHead }] : [];
      coursed(b, inward(f), floor, crown, h, (r, k) => pick(BRICKS, 931 + r, k), { holes, segs: 2 });
    });
    // The doorway: dressed jambs and soffit through the wall, a threshold, a lintel stone with the sky disc over it,
    // and the door itself standing open against the wall.
    const z0 = doorZ - width / 2, z1 = doorZ + width / 2;
    quadToward(b, FOOT_LIGHT, [-half, floor, z0], [-inner, floor, z0], [-inner, doorHead, z0], [-half, doorHead, z0], [0, 0, 1]);
    quadToward(b, FOOT_LIGHT, [-half, floor, z1], [-inner, floor, z1], [-inner, doorHead, z1], [-half, doorHead, z1], [0, 0, -1]);
    quadToward(b, FOOT, [-half, doorHead, z0], [-inner, doorHead, z0], [-inner, doorHead, z1], [-half, doorHead, z1], [0, -1, 0]);
    quadToward(b, FOOT_LIGHT, [-half - .2, floor + .03, z0], [-inner, floor + .03, z0], [-inner, floor + .03, z1], [-half - .2, floor + .03, z1], [0, 1, 0]);
    const W = outer.left, sd = doorZ + half;
    for (const e of [-1, 1]) fbox(b, W, FOOT_LIGHT, sd + e * (width / 2 + .17), floor, doorHead, .06, .34, .12);
    fbox(b, W, FOOT_LIGHT, sd, doorHead, doorHead + .5, .07, width + .9, .14);
    discOn(b, W, BONE, sd, doorHead + 1.15, .45, .04, 12);
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8; fq(b, W, FOOT_LIGHT, sd + Math.cos(a) * .58 - .05, sd + Math.cos(a) * .58 + .05, doorHead + 1.15 + Math.sin(a) * .58 - .05, doorHead + 1.15 + Math.sin(a) * .58 + .05, .035); }
    fbox(b, W, DOOR, sd - width / 2 - 1.15, floor + .05, doorHead - .1, .1, width - .1, .07);
    for (const y of [floor + .5, doorHead - .6]) fbox(b, W, IRON, sd - width / 2 - 1.15, y, y + .07, .14, width - .2, .02);
    // String courses at the plinth (round the doorway), at mid-height, and the corbel table under the parapet.
    Object.entries(outer).forEach(([name, f]) => {
      const spans = name === 'left' ? [[0, sd - width / 2 - .4], [sd + width / 2 + .4, f.L]] : [[0, f.L]];
      for (const [p, q] of spans) fbox(b, f, FOOT_LIGHT, (p + q) / 2, plinthTop - .1, plinthTop + .08, .1, q - p + (p === 0 ? .2 : 0) + (q === f.L ? .2 : 0), .2);
      fbox(b, f, FOOT_LIGHT, f.L / 2, floor + 20, floor + 20.2, .1, f.L + .2, .2);
      fbox(b, f, FOOT_LIGHT, f.L / 2, top - 1, top - .72, .16, f.L + .32, .32);
      for (let i = 0; i < 7; i++) fbox(b, f, FOOT, (i + .5) * f.L / 7, top - 1.42, top - 1, .12, .32, .24);
    });
    // The coping round the parapet.
    for (const z of [-1, 1]) b.box(FOOT_LIGHT, 0, crown + .13, z * (inner + T.wall / 2), T.size + .3, .26, T.wall + .3);
    for (const x of [-1, 1]) b.box(FOOT_LIGHT, x * (inner + T.wall / 2), crown + .13, 0, T.wall + .3, .26, 2 * inner - .3);
    // Slit windows, one over the middle of each flight, dark outside and daylight within.
    const walls = ['left', 'back', 'right', 'front'];
    st.flights.forEach((fl, k) => {
      const name = walls[k % 4], y = floor + (fl.from.y + fl.to.y) / 2 + 1.3, f = outer[name], g = inward(inside[name]);
      fq(b, f, FOOT_LIGHT, f.L / 2 - .3, f.L / 2 + .3, y - .2, y + 1.3, .015);
      fq(b, f, OPENING, f.L / 2 - .12, f.L / 2 + .12, y, y + 1.1, .03);
      fq(b, g, SKY_LIGHT, g.L / 2 - .12, g.L / 2 + .12, y, y + 1.1, .015);
    });
    // The floor inside, flagged.
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const x0 = -inner + i * inner / 2, z0 = -inner + j * inner / 2;
      quadToward(b, pick([FLAGS, '#8f877a', '#a39b8c'], 950, i, j), [x0, floor + .02, z0], [x0 + inner / 2, floor + .02, z0], [x0 + inner / 2, floor + .02, z0 + inner / 2], [x0, floor + .02, z0 + inner / 2], [0, 1, 0]);
    }
  });
  yield;

  // The stair: landings, treads over a sloping soffit, a railing on the open side, and the walking surfaces under them.
  const L = st.landings, local = p => [p.x - tx, p.z - tz];
  L.forEach((l, i) => {
    if (i > 0) b.block(FOOT, l.x, floor + l.y - .3, l.z, width, .3, width);
    walk({ id: `${id}-landing-${i}`, kind: 'deck', a: { x: l.x - width / 2, y: floor + l.y, z: l.z }, b: { x: l.x + width / 2, y: floor + l.y, z: l.z }, width });
  });
  for (const [k, fl] of st.flights.entries()) {
    yield;
    const a = fl.from, c = fl.to, len = Math.hypot(c.x - a.x, c.z - a.z), ux = (c.x - a.x) / len, uz = (c.z - a.z) / len;
    let nx = -uz, nz = ux;
    if (nx * (tx - (a.x + c.x) / 2) + nz * (tz - (a.z + c.z) / 2) < 0) { nx = -nx; nz = -nz; }
    const y0 = floor + a.y, y1 = floor + c.y, e0 = { x: a.x + ux * width / 2, z: a.z + uz * width / 2 }, e1 = { x: c.x - ux * width / 2, z: c.z - uz * width / 2 };
    const run = Math.hypot(e1.x - e0.x, e1.z - e0.z), rise = y1 - y0, yaw = Math.atan2(ux, uz);
    walk({ id: `${id}-flight-${k}`, kind: 'ramp', a: { x: e0.x, y: y0, z: e0.z }, b: { x: e1.x, y: y1, z: e1.z }, width });
    for (let i = 0; i < fl.steps; i++) {
      const t0 = (i + .5) / fl.steps, x = e0.x + (e1.x - e0.x) * t0, z = e0.z + (e1.z - e0.z) * t0, yt = y0 + rise * t0;
      b.box(i % 2 ? FOOT_LIGHT : '#a0947b', x, yt - (rise / fl.steps + .12) / 2, z, width, rise / fl.steps + .12, run / fl.steps + .02, yaw);
    }
    b.beam(FOOT_DARK, [e0.x, y0 - .3, e0.z], [e1.x, y1 - .3, e1.z], width, .25);
    // The railing on the inner edge, from landing corner to landing corner.
    const p0 = { x: e0.x + nx * width / 2, z: e0.z + nz * width / 2 }, p1 = { x: e1.x + nx * width / 2, z: e1.z + nz * width / 2 };
    b.block(TIMBER_DARK, p0.x, y0 - .3, p0.z, .16, 1.45, .16);
    b.beam(TIMBER_2, [p0.x, y0 + 1, p0.z], [p1.x, y1 + 1, p1.z], .1, .09);
    b.beam(TIMBER_DARK, [p0.x, y0 - .05, p0.z], [p1.x, y1 - .05, p1.z], .12, .3);
    for (let i = 1; i <= 5; i++) { const t0 = i / 6, x = p0.x + (p1.x - p0.x) * t0, z = p0.z + (p1.z - p0.z) * t0, y = y0 + rise * t0; b.beam(TIMBER_2, [x, y + .1, z], [x, y + 1, z], .05); }
    const along = Math.abs(ux) > .5;
    push({ x: (p0.x + p1.x) / 2, z: (p0.z + p1.z) / 2, hx: along ? Math.abs(p1.x - p0.x) / 2 : .06, hz: along ? .06 : Math.abs(p1.z - p0.z) / 2,
      width: along ? Math.abs(p1.x - p0.x) : .12, depth: along ? .12 : Math.abs(p1.z - p0.z), angle: 0,
      minY: y0 - .5, maxY: y1 + 1.1, kind: 'stair-rail', id: `${id}-rail-${k}` });
    if (k === st.flights.length - 1) b.block(TIMBER_DARK, p1.x, y1 - .3, p1.z, .16, 1.45, .16);
  }
  metrics.stairFlights += st.flights.length;
  yield;

  // The open platform: a flagged deck over the well, but for the hatch the last flight comes up through, railed.
  const last = st.flights.at(-1), hatchZ = last.from.z + (last.from.z > tz ? -width / 2 : width / 2) - tz;
  const sgn = Math.sign(last.from.z - tz) || 1, deckZ0 = sgn > 0 ? -inner : hatchZ, deckZ1 = sgn > 0 ? hatchZ : inner;
  b.frame(tx, 0, tz, 0, () => {
    b.block(FOOT_DARK, 0, top - .3, (deckZ0 + deckZ1) / 2, 2 * inner, .3, deckZ1 - deckZ0);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const x0 = -inner + i * 2 * inner / 3, za = deckZ0 + j * (deckZ1 - deckZ0) / 3, zb = za + (deckZ1 - deckZ0) / 3;
      quadToward(b, pick([FLAGS, '#8f877a', '#a39b8c'], 960, i, j), [x0, top + .01, za], [x0 + 2 * inner / 3, top + .01, za], [x0 + 2 * inner / 3, top + .01, zb], [x0, top + .01, zb], [0, 1, 0]);
    }
    // The hatch rail at the platform's height, from the stair's head to the far wall.
    const hx0 = local(last.to)[0] + (last.to.x > last.from.x ? -width / 2 : width / 2), hx1 = last.from.x > last.to.x ? inner : -inner;
    for (const x of [hx0 + (hx1 - hx0) / 3, hx0 + 2 * (hx1 - hx0) / 3, hx1 - Math.sign(hx1 - hx0) * .1]) b.block(TIMBER_DARK, x, top, hatchZ, .14, 1.05, .14);
    b.beam(TIMBER_2, [hx0, top + 1, hatchZ], [hx1, top + 1, hatchZ], .1, .09);
    // The sighting stones on the coping, each with its notch.
    const sights = [[1, 0], [-1, 0], [0, -1], [0, 1], [.819, -.574], [.819, .574], [-.819, -.574], [-.819, .574]];
    for (const [i, [dx, dz]] of sights.entries()) {
      const k = (inner + T.wall / 2) / Math.max(Math.abs(dx), Math.abs(dz)), x = dx * k, z = dz * k;
      b.frame(x, crown + .26, z, Math.atan2(dx, dz), () => {
        b.block(i < 4 ? FOOT_LIGHT : '#b9b09c', 0, 0, 0, .55, i < 4 ? .95 : .75, .3);
        for (const e of [-1, 1]) b.block(FOOT, e * .18, i < 4 ? .95 : .75, 0, .16, .25, .3);
      });
    }
    // The backsight pillar on the platform's north side, where the pole is read, its sighting ring cut through east to
    // west, and round it the flood calendar's ring of thirteen moons set in the floor; the middle is left open.
    const pz = deckZ0 + 1.6;
    b.block(FOOT_LIGHT, 0, top, pz, .6, .95, .6);
    for (const [x, y, w, hh] of [[0, top + 1.32, .5, .1], [0, top + .98, .5, .1], [-.2, top + 1.15, .1, .25], [.2, top + 1.15, .1, .25]]) b.box(FOOT, x, y, pz, w, hh, .14);
    for (let i = 0; i < 13; i++) { const a = i * TAU / 13; b.box(BONE, Math.cos(a) * 1.25, top + .02, pz + Math.sin(a) * 1.25, .3, .04, .18, -a); }
  });
  const hx0w = last.to.x + (last.to.x > last.from.x ? -width / 2 : width / 2), hx1w = tx + (last.from.x > last.to.x ? inner : -inner);
  const lo = Math.min(hx0w, hx1w), hi = Math.max(hx0w, hx1w), railTop = last.from.x + (last.from.x > last.to.x ? -width / 2 : width / 2);
  // Only past the last flight's own railing, and only at the platform's height, so the flights below pass under it.
  const near = last.from.x > last.to.x ? [railTop, hi] : [lo, railTop];
  push({ x: (near[0] + near[1]) / 2, z: tz + hatchZ, hx: Math.abs(near[1] - near[0]) / 2, hz: .06, width: Math.abs(near[1] - near[0]), depth: .12, angle: 0,
    minY: top - .3, maxY: top + 1.1, kind: 'stair-rail', id: `${id}-hatch-rail` });
  const cz = tz + (deckZ0 + deckZ1) / 2;
  push({ x: tx, z: tz + deckZ0 + 1.6, r: .45, minY: top - .1, maxY: top + 1.5, kind: 'post', id: `${id}-backsight` });
  walk({ id: `${id}-top`, kind: 'deck', a: { x: tx - inner, y: top, z: cz }, b: { x: tx + inner, y: top, z: cz }, width: deckZ1 - deckZ0 });

  // The walls collide at every height but at the doorway, which is open to its head.
  const wall = (x0, z0, x1, z1, minY, part) => push({ x: tx + (x0 + x1) / 2, z: tz + (z0 + z1) / 2, hx: (x1 - x0) / 2, hz: (z1 - z0) / 2,
    width: x1 - x0, depth: z1 - z0, angle: 0, minY, maxY: crown + 1.3, kind: part === 'over-door' ? 'wall' : 'house', id: `${id}-${part}` });
  wall(-half, -half, half, -inner, foot, 'north');
  wall(-half, inner, half, half, foot, 'south');
  wall(inner, -inner, half, inner, foot, 'east');
  if (doorZ - width / 2 > -inner + .05) wall(-half, -inner, -inner, doorZ - width / 2, foot, 'west');
  if (doorZ + width / 2 < inner - .05) wall(-half, doorZ + width / 2, -inner, inner, foot, 'west-south');
  wall(-half, doorZ - width / 2, -inner, doorZ + width / 2, doorHead, 'over-door');
}

export function* createMithalaCityBuildingSteps({ root, groundHeight, colliders, walkSurfaces, metrics }) {
  const push = c => { colliders.push(c); metrics.colliders++; return c; };
  const walk = s => { walkSurfaces.push(s); metrics.walkSurfaces++; return s; };
  const finish = function* (b) { metrics.vertices += b.vertexCount; const m = yield* b.finishSteps(root); if (m) metrics.batches++; return m; };
  // One merged batch per district, so each is culled on its own; the tower has its own.
  const groups = new Map();
  for (const bd of MITHALA_BUILDINGS) if (bd.kind !== 'tower') {
    if (!groups.has(bd.district)) groups.set(bd.district, []);
    groups.get(bd.district).push(bd);
  }
  for (const [district, list] of groups) {
    const name = MITHALA_DISTRICTS.find(d => d.id === district)?.name ?? district;
    const b = createSceneryBuilder(`Mithala - buildings of ${name}`);
    for (const bd of list) {
      yield;
      const s = makeSite(bd, groundHeight, push, walk, bd.kind === 'crane' ? [0, 1] : null);
      b.frame(bd.x, s.base, bd.z, s.yaw, () => {drawerOf(bd)(b, s);decorateMithalaBuilding(b,s);});
      metrics.buildings++;
    }
    yield* finish(b);
  }
  for (const bd of MITHALA_BUILDINGS.filter(t => t.kind === 'tower')) {
    const b = createSceneryBuilder('Mithala - the sky tower');
    yield* drawTower(b, bd, groundHeight, push, walk, metrics);
    metrics.buildings++;
    yield* finish(b);
  }
}
