import * as THREE from 'three';
import {createMithalaOuterDefenses} from './mithala-defenses.js';
import {polishMithala} from './mithala-polish.js';
import { finishBuild } from '../../../world/loading/build-steps.js';
import { createSceneryBuilder } from '../../../world/scenery/scenery-builder.js';
import { westWaterSurface } from '../western-regions/west-ground.js';
import { MITHALA_CITY, MITHALA_DISTRICTS, MITHALA_FORK_BANK, MITHALA_BANK_PASSAGES, MITHALA_BRIDGES, MITHALA_FORD, MITHALA_QUAY,
  MITHALA_BARGES, MITHALA_STREETS, MITHALA_BUILDINGS, MITHALA_TOWER_STAIR, MITHALA_GAUGE,
  mithalaCityWaterClearance, mithalaSegmentDistance, polygonDepth, mithalaDeckHeight } from './mithala-city.js';

/** Mithala is one river city behind a shared outer wall. Low flood banks and
 * open bridges link its neighborhoods; the only defensive gates are on the
 * exterior approaches. Warm brick, pale timber and reed thatch distinguish the
 * local buildings from the grey outer masonry. River beds, platform approaches,
 * quay, gauge stairs and sky tower retain their authored support surfaces.
 * Outer defenses are built by mithala-defenses.js. */
import {
  TAU, P, FOOT, FOOT_DARK, FOOT_LIGHT, BRICKS, STAIN, BURNT, TIMBER, TIMBER_2, TIMBER_OLD, TIMBER_DARK, THATCHES, THATCH_RIDGE, THATCH_EDGE, DOOR, OPENING, SHUTTER, BONE, GREYS, GREY_DARK, GREY_LIGHT, COPING, IRON, ROPE, SACKS, MARK, PAVE_FORK, PAVE, FLAGS, CLAY_FLOOR, rand, pick, facing, quadToward, triToward, drum, annulus, thatchRoof, gable,
} from './mithala-city-parts.js';
import { createMithalaCityBuildingSteps } from './mithala-city-buildings.js';


// ---------------------------------------------------------------------------
// What the layout implies for the masonry: gate gaps, the ways that must stay clear
// ---------------------------------------------------------------------------
const T = MITHALA_CITY.curtain.thickness, RING = MITHALA_FORK_BANK;
const FORK = MITHALA_DISTRICTS.find(d => d.id === 'mithala-fork');
const STREET_SEGMENTS = MITHALA_STREETS.flatMap(s => s.points.slice(1).map((q, i) => ({ id: s.id, a: s.points[i], b: q, half: s.width / 2 })));
function streetAt(id, x, z) {
  let best = null;
  for (const seg of STREET_SEGMENTS) if (seg.id === id) {
    const d = mithalaSegmentDistance(x, z, seg.a, seg.b);
    if (!best || d < best.d) best = { d, seg };
  }
  const { a, b, half } = best.seg, l = Math.hypot(b.x - a.x, b.z - a.z);
  return { sx: (b.x - a.x) / l, sz: (b.z - a.z) / l, half };
}
/**
 * Every gate with its geometry: the wall (or bank) line it cuts, the street through it, the passage's half-width square
 * to the street (`pass`), and how far along the wall either side of the gate's centre a square-cut jamb has to stand for
 * its corners to clear that passage (`half`) - wider than half the gate where the street crosses on the skew.
 */
const GATES = MITHALA_BANK_PASSAGES.map(g => {
  const line = MITHALA_DISTRICTS.find(d => d.id === g.district).line, a = line[g.edge], c = line[(g.edge + 1) % line.length];
  const len = Math.hypot(c.x - a.x, c.z - a.z), ux = (c.x - a.x) / len, uz = (c.z - a.z) / len, street = streetAt(g.street, g.x, g.z);
  const sin = Math.max(.25, Math.abs(ux * street.sz - uz * street.sx)), cos = Math.abs(ux * street.sx + uz * street.sz);
  const pass = g.width / 2 * sin, thick = g.kind === 'stone' ? T : 0;
  return { ...g, ux, uz, len, s: Math.hypot(g.x - a.x, g.z - a.z), sx: street.sx, sz: street.sz, streetHalf: street.half, sin, cos,
    pass, half: (pass + thick / 2 * cos) / sin };
});
const buildingGap = (x, z) => Math.min(...MITHALA_BUILDINGS.map(b =>
  Math.hypot(Math.max(0, Math.abs(x - b.x) - b.width / 2), Math.max(0, Math.abs(z - b.z) - b.depth / 2))));

/** Coursed ashlar on one face of a run, from p0 to p1: each block its own grey (or `palette`), the courses broken in bond. */
function ashlar(b, p0, p1, y0, y1, n, seed, course = .8, block = 1.7, palette = GREYS) {
  const L = Math.hypot(p1.x - p0.x, p1.z - p0.z); if (L < .05) return;
  const ux = (p1.x - p0.x) / L, uz = (p1.z - p0.z) / L, rows = Math.max(1, Math.round((y1 - y0) / course)), h = (y1 - y0) / rows;
  for (let r = 0; r < rows; r++) {
    const ya = y0 + r * h, yb = ya + h;
    let s = 0, col = 0;
    while (s < L - 1e-4) {
      const e = Math.min(L, col === 0 ? block * (r % 2 ? .5 : .25 + .5 * rand(seed, r)) : s + block * (.8 + .4 * rand(seed, r, col)));
      quadToward(b, pick(palette, seed, r, col), [p0.x + ux * s, ya, p0.z + uz * s], [p0.x + ux * e, ya, p0.z + uz * e],
        [p0.x + ux * e, yb, p0.z + uz * e], [p0.x + ux * s, yb, p0.z + uz * s], n);
      s = e; col++;
    }
  }
}

// ---------------------------------------------------------------------------
// Mithali work: the frame of a straight run, warm stone, the flood marks
// ---------------------------------------------------------------------------
/** A straight run from `a` to `c`: along `u`, its left normal `n`, the yaw that lays a box's length along it, and the
 * point `s` metres along it and `o` across. */
function runFrame(a, c) {
  const len = Math.hypot(c.x - a.x, c.z - a.z), ux = (c.x - a.x) / len, uz = (c.z - a.z) / len;
  return { a, c, len, ux, uz, nx: -uz, nz: ux, yaw: Math.atan2(ux, uz),
    at: (s, o = 0) => ({ x: a.x + ux * s - uz * o, z: a.z + uz * s + ux * o }) };
}
const STONES = Object.freeze([FOOT, FOOT_LIGHT, '#857a64', '#766c59']);
const SETTS = Object.freeze(['#8a8170', '#968d7b', '#7f7766', FLAGS]);
/**
 * The flood marks the city cuts in its stone, the same years at the same heights wherever they are cut, because the
 * flood is the plain's water and not any one channel's. The highest is the line the made ground stands clear of.
 */
const FLOOD_MARKS = Object.freeze([
  { y: 12.62, glyphs: 3 }, { y: 13.02, glyphs: 4 }, { y: 13.34, glyphs: 3 }, { y: MITHALA_CITY.floodLine, glyphs: 5, great: true },
].map(Object.freeze));
/**
 * Flood marks on a vertical face centred at `c`, looking along `f`, running along `h`, `half` wide each way, between
 * `y0` and `y1`: for each flood a notch cut at its height with a pointer, and under it a dressed band with its year.
 */
function floodMarks(b, c, f, h, half, y0, y1, seed) {
  let cut = 0;
  const at = (d, s, y) => [c.x + f.x * d + h.x * s, y, c.z + f.z * d + h.z * s];
  const on = (d, s0, s1, ya, yb, tint) => quadToward(b, tint, at(d, s0, ya), at(d, s1, ya), at(d, s1, yb), at(d, s0, yb), [f.x, 0, f.z]);
  FLOOD_MARKS.forEach((mark, m) => {
    if (mark.y < y0 + .4 || mark.y > y1 - .03) return;
    const w = Math.min(half - .2, mark.great ? .85 : .62);
    on(.03, -w, w, mark.y - .03, mark.y + .03, MARK);
    triToward(b, MARK, at(.03, -w - .16, mark.y + .09), at(.03, -w - .16, mark.y - .09), at(.03, -w, mark.y), [f.x, 0, f.z]);
    on(.015, -w + .04, w - .04, mark.y - .34, mark.y - .07, FOOT_LIGHT);
    for (let g = 0; g < mark.glyphs; g++) { const s = -w + .14 + g * .19; on(.035, s, s + .06 + .05 * rand(seed, m, g), mark.y - .3, mark.y - .11, MARK); }
    cut++;
  });
  return cut;
}
/** The sides of an upright convex prism on the ring `ring` ([{x, z}]), in `courses` courses whose tint may be a function
 * of (course, side); a flat top in `top` if given. */
function prism(b, tint, ring, y0, y1, courses = 1, top = null) {
  const cx = ring.reduce((s, p) => s + p.x, 0) / ring.length, cz = ring.reduce((s, p) => s + p.z, 0) / ring.length, h = (y1 - y0) / courses;
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i], q = ring[(i + 1) % ring.length];
    let nx = q.z - p.z, nz = p.x - q.x;
    if (nx * ((p.x + q.x) / 2 - cx) + nz * ((p.z + q.z) / 2 - cz) < 0) { nx = -nx; nz = -nz; }
    for (let k = 0; k < courses; k++) {
      const ya = y0 + k * h, yb = ya + h, t = typeof tint === 'function' ? tint(k, i) : tint;
      quadToward(b, t, [p.x, ya, p.z], [q.x, ya, q.z], [q.x, yb, q.z], [p.x, yb, p.z], [nx, 0, nz]);
    }
  }
  if (top) for (let i = 1; i < ring.length - 1; i++) triToward(b, top, [ring[0].x, y1, ring[0].z], [ring[i].x, y1, ring[i].z], [ring[i + 1].x, y1, ring[i + 1].z], [0, 1, 0]);
}
/** Whether a point stands within `margin` of a gate's passage through its wall: the wall's thickness and a little either
 * side, along the street, and the passage's width across it. */
function nearGate(x, z, margin = 0) {
  return GATES.some(g => {
    const dx = x - g.x, dz = z - g.z, along = dx * g.sx + dz * g.sz, across = Math.abs(dz * g.sx - dx * g.sz);
    return Math.abs(along) < GATE_DEPTH + margin && across < g.pass + margin;
  });
}
/** How far either side of a gate's line its passage runs: through the curtain's thickness, or the cut in a bank. */
const GATE_DEPTH = 1.6;

export function createMithalaCityScenery(...args) { return finishBuild(createMithalaCityScenerySteps(...args)); }

export function* createMithalaCityScenerySteps({ parent, heightAt, groundHeight = heightAt, colliders }) {
  const root = new THREE.Group(); root.name = 'Mithala - the city at the meeting of the arms'; parent.add(root);
  const metrics = { buildings: 0, gates: 0, earthGates: 0, bridges: 0, piers: 0, towers: 0, wallSegments: 0, barges: 0,
    stairFlights: 0, batches: 0, vertices: 0, colliders: 0, walkSurfaces: 0,
    thresholds: 0, floodMarks: 0, fordPosts: 0, quays: 0, bollards: 0, mooringPosts: 0, gaugeSteps: 0, sceneryVertices: 0 };
  const walkSurfaces = [];
  const push = c => { colliders.push(c); metrics.colliders++; return c; };
  const walk = s => { walkSurfaces.push(s); metrics.walkSurfaces++; return s; };
  const finish = function* (b) { metrics.vertices += b.vertexCount; const m = yield* b.finishSteps(root); if (m) metrics.batches++; return m; };
  const ground = (x, z) => groundHeight(x, z);
  let work = 0;

  // -------------------------------------------------------------------------
  // The streets: brick-paved inside the Fork, rammed gravel in the other three districts
  // -------------------------------------------------------------------------
  {
    const b = createSceneryBuilder('Mithala - streets');
    const lift = .05, inFork = (x, z) => polygonDepth(FORK.outline, x, z) > 0;
    const strip = (a, c, width, seed) => {
      const dx = c.x - a.x, dz = c.z - a.z, len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len, nx = -uz, nz = ux;
      const n = Math.max(1, Math.ceil(len / 3)), across = [-width / 2, 0, width / 2];
      // Where a street runs out onto the quay, the quay's own flags carry it: the strip stops at the deck's edge.
      const onDeck = s => mithalaDeckHeight(a.x + ux * s, a.z + uz * s) !== null;
      for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) {
        let s0 = len * i / n, s1 = len * (i + 1) / n;
        const o0 = across[j], o1 = across[j + 1], deck0 = onDeck(s0), deck1 = onDeck(s1);
        if (deck0 && deck1) continue;
        if (deck0 !== deck1) {
          let dry = deck0 ? s1 : s0, wet = deck0 ? s0 : s1;
          for (let k = 0; k < 20; k++) { const m = (dry + wet) / 2; if (onDeck(m)) wet = m; else dry = m; }
          if (deck0) s0 = dry; else s1 = dry;
        }
        const p = (s, o) => { const x = a.x + ux * s + nx * o, z = a.z + uz * s + nz * o; return [x, heightAt(x, z) + lift, z]; };
        const mx = a.x + ux * (s0 + s1) / 2, mz = a.z + uz * (s0 + s1) / 2;
        const tint = inFork(mx, mz) ? (rand(seed, i, j) < .5 ? PAVE_FORK : '#72503f') : (rand(seed, i, j) < .5 ? PAVE : '#857559');
        quadToward(b, tint, p(s0, o0), p(s1, o0), p(s1, o1), p(s0, o1), [0, 1, 0]);
      }
    };
    for (const s of MITHALA_STREETS) {
      yield;
      for (let i = 1; i < s.points.length; i++) strip(s.points[i - 1], s.points[i], s.width, i * 31 + s.width);
      // A square of paving at each bend, so the strips meet without a notch.
      for (let i = 1; i < s.points.length - 1; i++) {
        const c = s.points[i], h = s.width / 2;
        const p = (x, z) => [x, heightAt(x, z) + lift + .005, z];
        quadToward(b, inFork(c.x, c.z) ? PAVE_FORK : PAVE, p(c.x - h, c.z - h), p(c.x + h, c.z - h), p(c.x + h, c.z + h), p(c.x - h, c.z + h), [0, 1, 0]);
      }
    }
    yield* finish(b);
  }

  // All four quarters share the outer circuit; their internal banks and bridgeheads are open.
  // -------------------------------------------------------------------------
  // The three bridges: warm stone abutments and piers on the bed, pale timber decks at the layout's height
  // -------------------------------------------------------------------------
  // Each runs out from its ends on a stone abutment as far as the ground stands within `HEADROOM` of the deck, so nobody
  // walks under a deck they would strike; the rest is timber spans of at most `SPAN` metres on piers with cutwaters up
  // and down stream and the flood marks cut in both faces. Rails stand outside the deck's width, and stop short of the
  // former bank passages; their colliders keep the deck's whole width clear, and like the piers' they stand above the water,
  // which passes under every span.
  const bridges = [];
  {
    const b = createSceneryBuilder('Mithala - the bridges');
    const HEADROOM = 2.4, SPAN = 8.5;
    for (const [bi, bridge] of MITHALA_BRIDGES.entries()) {
      yield;
      const F = runFrame(bridge.a, bridge.b), D = bridge.deck, W = bridge.width, hw = W / 2, L = F.len, seed = 700 + bi * 31;
      const under = D - .12, beamLow = D - .62;
      const highAcross = s => Math.max(...[-hw - .3, 0, hw + .3].map(o => { const p = F.at(s, o); return ground(p.x, p.z); }));
      const lowOver = (s0, s1, half) => {
        let low = Infinity;
        for (let i = 0; i <= 4; i++) for (const o of [-half, 0, half]) { const p = F.at(s0 + (s1 - s0) * i / 4, o); low = Math.min(low, ground(p.x, p.z)); }
        return low;
      };
      let sA = 1.5, sB = 1.5;
      while (sA < L / 2 - 1 && highAcross(sA) > D - HEADROOM) sA += .25;
      while (sB < L / 2 - 1 && highAcross(L - sB) > D - HEADROOM) sB += .25;
      const open = L - sA - sB, spans = Math.max(1, Math.ceil(open / SPAN));
      const supports = Array.from({ length: spans + 1 }, (_, i) => sA + open * i / spans);
      // Abutments: coursed warm stone up to the planks, solid below the deck's own height.
      for (const [end, s0, s1] of [[0, 0, sA], [1, L - sB, L]]) {
        const half = hw + .6, foot = lowOver(s0, s1, half) - .8;
        const ring = [F.at(s0, -half), F.at(s1, -half), F.at(s1, half), F.at(s0, half)];
        prism(b, (k, i) => pick(STONES, seed, end, k, i), ring, foot, under, Math.max(1, Math.round((under - foot) / .62)), FOOT_DARK);
        for (const side of [-1, 1]) {
          const p = F.at((s0 + s1) / 2, side * (half - .1));
          b.box(FOOT_LIGHT, p.x, under - .1, p.z, .32, .24, s1 - s0 + .1, F.yaw);
        }
        const r = W / 4 + .55, count = Math.max(1, Math.ceil((s1 - s0 - 1.2 * r) / 1.6));
        for (let i = 0; i <= count; i++) for (const side of [-1, 1]) {
          const s = s1 - s0 <= 1.2 * r ? (s0 + s1) / 2 : s0 + .6 * r + (s1 - s0 - 1.2 * r) * i / count, p = F.at(s, side * W / 4);
          push({ x: p.x, z: p.z, r, minY: foot, maxY: D - .4, kind: 'mithala-abutment', id: `${bridge.id}-abutment-${end}-${i}-${side < 0 ? 'l' : 'r'}` });
        }
      }
      // Piers: a hexagon in plan with its points up and down stream, coursed, under a dressed cap.
      for (let k = 1; k < spans; k++) {
        const s = supports[k], t = .9, h = hw + .5, cw = 1.3;
        const plan = (dt, dh, dc) => [[-t - dt, -h - dh], [0, -h - cw - dc], [t + dt, -h - dh], [t + dt, h + dh], [0, h + cw + dc], [-t - dt, h + dh]].map(([ds, o]) => F.at(s + ds, o));
        const ring = plan(0, 0, 0), centre = F.at(s);
        const foot = Math.min(ground(centre.x, centre.z), ...ring.map(p => ground(p.x, p.z))) - .7, capLow = beamLow - .1;
        prism(b, (kk, i) => pick(STONES, seed, k, kk, i), ring, foot, capLow, Math.max(1, Math.round((capLow - foot) / .62)));
        prism(b, FOOT_LIGHT, plan(.14, .14, .2), capLow, beamLow, 1, FOOT_LIGHT);
        for (const side of [-1, 1])
          metrics.floodMarks += floodMarks(b, F.at(s + side * t, 0), { x: F.ux * side, z: F.uz * side }, { x: F.nx * side, z: F.nz * side }, h, foot, capLow, seed + k * 7 + side);
        const reach = h + cw - .9, n = Math.max(1, Math.ceil(2 * reach / 1.1));
        for (let i = 0; i <= n; i++) {
          const p = F.at(s, -reach + 2 * reach * i / n);
          push({ x: p.x, z: p.z, r: .95, minY: foot, maxY: beamLow, kind: 'mithala-pier', id: `${bridge.id}-pier-${k}-${i}` });
        }
        metrics.piers++;
      }
      // Stringers from support to support, bearing on the abutments and the piers' caps.
      for (let k = 0; k < spans; k++) {
        const s0 = supports[k] - .8, s1 = supports[k + 1] + .8;
        for (const o of [-hw + .35, -hw / 3, hw / 3, hw - .35]) {
          const p0 = F.at(s0, o), p1 = F.at(s1, o);
          b.beam(TIMBER_DARK, [p0.x, under - .25, p0.z], [p1.x, under - .25, p1.z], .3, .5);
        }
      }
      // The planks, laid across, wherever the deck is off the made ground and outside the old bank threshold.
      let deck0 = Infinity, deck1 = -Infinity;
      for (let s = 0; s < L - 1e-6; s += .55) {
        const s1 = Math.min(L, s + .51), m = F.at((s + s1) / 2);
        if (ground(m.x, m.z) > D - .1 || polygonDepth(RING, m.x, m.z) > -(T / 2 + .7)) continue;
        const p = (ss, o) => { const q = F.at(ss, o); return [q.x, D + .01, q.z]; };
        quadToward(b, pick([TIMBER, TIMBER_2, TIMBER_OLD, TIMBER_2], seed, s * 3), p(s, -hw - .25), p(s1, -hw - .25), p(s1, hw + .25), p(s, hw + .25), [0, 1, 0]);
        deck0 = Math.min(deck0, s); deck1 = Math.max(deck1, s1);
      }
      if (deck1 > deck0) {
        const p = (ss, o, y) => { const q = F.at(ss, o); return [q.x, y, q.z]; };
        for (const side of [-1, 1]) quadToward(b, TIMBER_OLD, p(deck0, side * (hw + .25), under), p(deck1, side * (hw + .25), under), p(deck1, side * (hw + .25), D + .01), p(deck0, side * (hw + .25), D + .01), [F.nx * side, 0, F.nz * side]);
        quadToward(b, TIMBER_DARK, p(deck0, -hw - .25, under), p(deck1, -hw - .25, under), p(deck1, hw + .25, under), p(deck0, hw + .25, under), [0, -1, 0]);
        // A stone sill where the planks meet the made ground at each end.
        for (const s of [deck0 - .3, deck1 + .3]) { const q = F.at(s); b.box(FOOT_LIGHT, q.x, D - .1, q.z, W + .5, .22, .6, F.yaw); }
      }
      // Rails: posts on the deck's edge, a top rail and a middle rail, clear of the bank passages.
      const railBlocked = s => [-1, 1].some(side => { const p = F.at(s, side * (hw + .5)); return nearGate(p.x, p.z, .9); });
      let r0 = Math.max(deck0, 0), r1 = Math.min(deck1, L);
      while (r0 < L / 2 && railBlocked(r0)) r0 += .1;
      while (r1 > L / 2 && railBlocked(r1)) r1 -= .1;
      if (r1 - r0 > 2) {
        const posts = Math.ceil((r1 - r0) / 1.9);
        for (const side of [-1, 1]) {
          const o = side * (hw + .12);
          for (let i = 0; i <= posts; i++) { const q = F.at(r0 + (r1 - r0) * i / posts, o); b.box(TIMBER_2, q.x, D + .4, q.z, .2, 1.4, .2, F.yaw); }
          for (const [y, w] of [[D + 1.08, .16], [D + .55, .1]]) { const q0 = F.at(r0, o), q1 = F.at(r1, o); b.beam(TIMBER, [q0.x, y, q0.z], [q1.x, y, q1.z], w, w * .8); }
          const n = Math.max(1, Math.ceil((r1 - r0) / 1.3));
          for (let i = 0; i <= n; i++) {
            const q = F.at(r0 + (r1 - r0) * i / n, side * (hw + .5));
            push({ x: q.x, z: q.z, r: .5, minY: D - .5, maxY: D + 1.2, kind: 'mithala-rail', id: `${bridge.id}-rail-${side < 0 ? 'l' : 'r'}-${i}` });
          }
        }
      }
      walk({ id: `${bridge.id}-deck`, kind: 'deck', a: { x: bridge.a.x, y: D, z: bridge.a.z }, b: { x: bridge.b.x, y: D, z: bridge.b.z }, width: W });
      bridges.push(Object.freeze({ id: bridge.id, supports: Object.freeze(supports), rails: Object.freeze([r0, r1]) }));
      metrics.bridges++;
    }
    yield* finish(b);
  }

  // One shared outer defense, with land gates and open arches over the rivers.
  const defenses = yield* createMithalaOuterDefenses({root,colliders,groundHeight,metrics});

  // -------------------------------------------------------------------------
  // The paved ford, and the flood gauge with its steps down from the Water Gate
  // -------------------------------------------------------------------------
  {
    const b = createSceneryBuilder('Mithala - the paved ford and the flood gauge');
    // The ford: setts laid flat on the bed between kerbs, down one hollow way, across the gravel and up the other; it is
    // waded, so the paving follows the ground and nothing is walked above it. A line of posts on the downstream side,
    // where the deep water begins, shows the way across with their pale heads above the stream.
    {
      const F = runFrame(MITHALA_FORD.a, MITHALA_FORD.b), W = MITHALA_FORD.width, hw = W / 2, seed = 1100;
      const at = (s, o, lift = .045) => { const p = F.at(s, o); return [p.x, ground(p.x, p.z) + lift, p.z]; };
      const rows = Math.ceil(F.len / .9), cols = 5;
      for (let i = 0; i < rows; i++) {
        if (i % 4 === 0) yield;
        const s0 = F.len * i / rows, s1 = F.len * (i + 1) / rows;
        for (let j = 0; j < cols; j++) {
          const o0 = -hw + W * j / cols, o1 = -hw + W * (j + 1) / cols;
          quadToward(b, pick(SETTS, seed, i, j), at(s0, o0), at(s1, o0), at(s1, o1), at(s0, o1), [0, 1, 0]);
        }
      }
      for (let s = 0; s < F.len - .2; s += 1.8) for (const side of [-1, 1]) {
        const s1 = Math.min(F.len, s + 1.8), p = at(s, side * (hw + .15), .02), q = at(s1, side * (hw + .15), .02);
        b.beam(pick([FOOT_DARK, FOOT], seed, s, side), p, q, .3, .24);
      }
      // Their heads stand a metre and a half over the stream's own level, read where the ford crosses it.
      let stream = -Infinity;
      for (let s = 0; s <= F.len; s += .5) { const p = F.at(s), w = westWaterSurface(p.x, p.z); if (w !== null) stream = Math.max(stream, w); }
      const side = F.nx > 0 ? 1 : -1, count = Math.max(2, Math.round((F.len - 3) / 2.4));
      for (let i = 0; i <= count; i++) {
        const p = F.at(1.5 + (F.len - 3) * i / count, side * (hw + .65)), gp = ground(p.x, p.z);
        const top = Math.max(gp, stream) + 1.5, foot = gp - .9;
        b.block(TIMBER_DARK, p.x, foot, p.z, .22, top - foot, .22, F.yaw);
        b.block(BONE, p.x, top - .42, p.z, .27, .3, .27, F.yaw);
        b.block(TIMBER_DARK, p.x, top, p.z, .3, .08, .3, F.yaw);
        push({ x: p.x, z: p.z, r: .2, minY: foot, maxY: top + .1, kind: 'mithala-ford-post', id: `mithala-ford-post-${i}` });
        metrics.fordPosts++;
      }
    }
    yield;
    // The gauge: a squared post of warm stone on a plinth at the foot of Gauge Lane, its face to the lane cut with the
    // flood marks, its face to the water with the reading scale, and round its head on all four sides the proverb.
    const G = MITHALA_GAUGE, lane = MITHALA_STREETS.find(s => s.id === 'mithala-gauge-lane');
    const gate = GATES.find(g => g.street === lane.id && g.kind === 'stone');
    const S = { x: gate.x + gate.sx * (T / 2 + .3) / gate.sin, z: gate.z + gate.sz * (T / 2 + .3) / gate.sin };
    const toGauge = Math.hypot(G.x - S.x, G.z - S.z), dir = { x: (G.x - S.x) / toGauge, z: (G.z - S.z) / toGauge };
    const yaw = Math.atan2(-dir.x, -dir.z), cos = Math.cos(yaw), sin = Math.sin(yaw);
    const local = (lx, lz) => ({ x: G.x + lx * cos + lz * sin, z: G.z - lx * sin + lz * cos });
    const w = G.width, plinth = w / 2 + .35, LANDING = 2;
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]].map(([i, k]) => { const p = local(i * plinth, k * plinth); return ground(p.x, p.z); });
    const gy = Math.max(...corners), foot = Math.min(...corners) - .7, plinthTop = gy + .3, bodyTop = gy + G.height - .45;
    // The landing round it, flagged on the ground it stands on.
    for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) {
      const f = (a, c) => { const p = local(-LANDING + a, -LANDING + c); return [p.x, ground(p.x, p.z) + .085, p.z]; };
      quadToward(b, pick(SETTS, 1200, i, k), f(i, k), f(i + 1, k), f(i + 1, k + 1), f(i, k + 1), [0, 1, 0]);
    }
    b.frame(G.x, 0, G.z, yaw, () => {
      b.block(FOOT_DARK, 0, foot, 0, 2 * plinth, plinthTop - foot, 2 * plinth);
      b.block(FOOT_LIGHT, 0, plinthTop - .1, 0, 2 * plinth + .12, .12, 2 * plinth + .12);
      const courses = Math.max(3, Math.round((bodyTop - plinthTop) / .7));
      for (let k = 0; k < courses; k++) {
        const y0 = plinthTop + (bodyTop - plinthTop) * k / courses, y1 = plinthTop + (bodyTop - plinthTop) * (k + 1) / courses;
        b.block(pick(STONES, 1210, k), 0, y0, 0, w, y1 - y0 - .02, w);
      }
      b.block(FOOT_LIGHT, 0, bodyTop, 0, w + .26, .24, w + .26);
      b.cone(FOOT, 0, bodyTop + .24, 0, (w / 2 + .05) * Math.SQRT2, .5, Math.PI / 4, 4);
      // Faces in the post's own frame: +z to the lane, -z to the water.
      const face = (fz, d, s0, s1, y0, y1, tint) => quadToward(b, tint, [s0 * fz, y0, fz * (w / 2 + d)], [s1 * fz, y0, fz * (w / 2 + d)],
        [s1 * fz, y1, fz * (w / 2 + d)], [s0 * fz, y1, fz * (w / 2 + d)], [0, 0, fz]);
      metrics.floodMarks += floodMarks(b, { x: 0, z: w / 2 }, { x: 0, z: 1 }, { x: 1, z: 0 }, w / 2, plinthTop, bodyTop - 1.5, 1220);
      // The reading scale toward the water: a tick every quarter metre up from the plinth, a long one and its count at each metre.
      for (let k = 1, y = plinthTop + .25; y < bodyTop - 1.5; k++, y += .25) {
        const metre = k % 4 === 0;
        face(-1, .02, -.7, metre ? -.15 : -.42, y - .025, y + .025, MARK);
        if (metre) for (let n = 0; n < k / 4; n++) face(-1, .025, .05 + n * .12, .11 + n * .12, y + .06, y + .26, MARK);
      }
      // The proverb, in two lines on a dressed band round the head: "Vet mithalan, / vel noreth".
      const bandLow = gy + G.height - 1.4, bandHigh = gy + G.height - .75;
      for (let side = 0; side < 4; side++) b.frame(0, 0, 0, side * Math.PI / 2, () => {
        face(1, .012, -w / 2 + .04, w / 2 - .04, bandLow, bandHigh, BONE);
        [[3, 8], [3, 6]].forEach((words, line) => {
          const letters = words[0] + words[1], width = letters * .06 + .1, y = bandHigh - .1 - line * .29;
          let s = -width / 2;
          words.forEach((count, word) => {
            for (let n = 0; n < count; n++, s += .06) {
              const tall = rand(1230, side, line, word, n);
              face(1, .022, s, s + .042, y - .16 - (tall > .7 ? .05 : 0), y - (tall < .2 ? .04 : 0), MARK);
            }
            s += .1;
          });
        });
      });
    });
    push({ x: G.x, z: G.z, r: plinth * .9 + .1, minY: foot, maxY: gy + G.height + .3, kind: 'mithala-gauge', id: G.id });
    // The steps: from the threshold of the Water Gate down the lane to the landing, each tread a block of warm stone set
    // on the cutting, with a ramp along their nosings to walk on, a few treads to a ramp.
    {
      const E = { x: G.x - dir.x * LANDING, z: G.z - dir.z * LANDING }, SF = runFrame(S, E), width = lane.width - .4, half = width / 2;
      const treads = Math.max(2, Math.round(SF.len / .45)), tl = SF.len / treads, tops = [];
      for (let k = 0; k < treads; k++) {
        const sb = k * tl, sf = sb + tl;
        let high = -Infinity, low = Infinity;
        for (const s of [sb, (sb + sf) / 2, sf]) for (const o of [-half, 0, half]) { const p = SF.at(s, o), g = ground(p.x, p.z); high = Math.max(high, g); low = Math.min(low, g); }
        const top = Math.min(high + .09, k ? tops[k - 1] : Infinity), m = SF.at((sb + sf) / 2);
        tops.push(top);
        b.box(pick(STONES, 1240, k), m.x, (top + low - .3) / 2, m.z, width, top - low + .3, tl + .02, SF.yaw);
        metrics.gaugeSteps++;
      }
      const breaks = [[0, tops[0]]];
      for (let k = 3; k < treads - 1; k += 4) breaks.push([(k + 1) * tl, tops[k]]);
      breaks.push([SF.len, tops[treads - 1]]);
      // Each ramp is raised, with its neighbours' shared ends, until no nosing stands above it.
      for (let j = 1; j < breaks.length; j++) {
        const [s0, y0] = breaks[j - 1], [s1, y1] = breaks[j];
        let lift = 0;
        for (let k = 0; k < treads; k++) {
          const nose = (k + 1) * tl;
          if (nose > s0 + 1e-6 && nose < s1 - 1e-6) lift = Math.max(lift, tops[k] - (y0 + (y1 - y0) * (nose - s0) / (s1 - s0)));
        }
        breaks[j - 1][1] += lift; breaks[j][1] += lift;
      }
      for (let j = 1; j < breaks.length; j++) {
        const [s0, y0] = breaks[j - 1], [s1, y1] = breaks[j], a = SF.at(s0), c = SF.at(s1);
        walk({ id: `mithala-gauge-steps-${j - 1}`, kind: 'ramp', a: { x: a.x, y: y0, z: a.z }, b: { x: c.x, y: y1, z: c.z }, width });
      }
    }
    yield* finish(b);
  }

  // -------------------------------------------------------------------------
  // The Grain Quay and the two barges moored off it
  // -------------------------------------------------------------------------
  // A deck of flags at the layout's height on a solid body of coursed warm stone, its face carried down past the ground
  // at its foot, and the bank below it pitched with stone to the water's edge; bollards along the deck's outer edge,
  // mooring posts at the water, and the barges' lines to them. The barges float on the water the plain's channels are cut
  // for (`westWaterSurface`), flat-bottomed and laden with sacks.
  {
    const b = createSceneryBuilder('Mithala - the Grain Quay and the barges');
    const Q = MITHALA_QUAY, pts = Q.points, D = Q.deck, hw = Q.width / 2, seed = 1300;
    const segs = pts.slice(1).map((p, i) => runFrame(pts[i], p));
    // Which side is the water: the side nearer it, measured off the middle of the quay.
    const mid = segs[Math.floor(segs.length / 2)], centre = mid.at(mid.len / 2), side = (o) => { const p = { x: centre.x + mid.nx * o, z: centre.z + mid.nz * o }; return mithalaCityWaterClearance(p.x, p.z); };
    const ws = side(6) < side(-6) ? 1 : -1;
    const offset = o => pts.map((p, i) => {
      const s0 = segs[Math.max(0, i - 1)], s1 = segs[Math.min(segs.length - 1, i)];
      let mx = s0.nx + s1.nx, mz = s0.nz + s1.nz; const l = Math.hypot(mx, mz); mx /= l; mz /= l;
      const k = o / (mx * s1.nx + mz * s1.nz);
      return { x: p.x + mx * k, z: p.z + mz * k };
    });
    const outer = offset(ws * hw), inner = offset(-ws * hw);
    const lowAlong = (p, q, out = 0, n = { x: 0, z: 0 }) => {
      let low = Infinity;
      for (let i = 0; i <= 6; i++) { const x = p.x + (q.x - p.x) * i / 6 + n.x * out, z = p.z + (q.z - p.z) * i / 6 + n.z * out; low = Math.min(low, ground(x, z)); }
      return low;
    };
    const mooring = [];
    for (const [i, F] of segs.entries()) {
      yield;
      const n = { x: F.nx * ws, z: F.nz * ws }, nOut = [n.x, 0, n.z], nIn = [-n.x, 0, -n.z];
      const foot = lowAlong(outer[i], outer[i + 1], .3, n) - .8, footIn = lowAlong(inner[i], inner[i + 1]) - .5;
      const at = (p, y) => [p.x, y, p.z];
      ashlar(b, outer[i], outer[i + 1], foot, D - .02, nOut, seed + i * 11, .62, 1.35, STONES);
      quadToward(b, FOOT_DARK, at(inner[i], footIn), at(inner[i + 1], footIn), at(inner[i + 1], D), at(inner[i], D), nIn);
      const coping = F.at(F.len / 2, ws * (hw - .15));
      b.box(FOOT_LIGHT, coping.x, D - .1, coping.z, .5, .24, F.len + (i ? .3 : 0) + (i < segs.length - 1 ? .3 : 0), F.yaw);
      if (i === 0) quadToward(b, FOOT_DARK, at(inner[0], Math.min(foot, footIn)), at(outer[0], Math.min(foot, footIn)), at(outer[0], D), at(inner[0], D), [-F.ux, 0, -F.uz]);
      if (i === segs.length - 1) quadToward(b, FOOT_DARK, at(inner[i + 1], Math.min(foot, footIn)), at(outer[i + 1], Math.min(foot, footIn)), at(outer[i + 1], D), at(inner[i + 1], D), [F.ux, 0, F.uz]);
      // The flags of the deck, between the mitred edges.
      const cells = Math.max(1, Math.ceil(F.len / 1.3));
      const flag = (t, v) => {
        const ix = inner[i].x + (inner[i + 1].x - inner[i].x) * t, iz = inner[i].z + (inner[i + 1].z - inner[i].z) * t;
        const ox = outer[i].x + (outer[i + 1].x - outer[i].x) * t, oz = outer[i].z + (outer[i + 1].z - outer[i].z) * t;
        return [ix + (ox - ix) * v, D + .015, iz + (oz - iz) * v];
      };
      for (let c = 0; c < cells; c++) for (let v = 0; v < 3; v++)
        quadToward(b, pick(SETTS, seed, i, c, v), flag(c / cells, v / 3), flag((c + 1) / cells, v / 3), flag((c + 1) / cells, (v + 1) / 3), flag(c / cells, (v + 1) / 3), [0, 1, 0]);
      // The deck to walk on, carried past the bend far enough to close the mitre on the outer side.
      const ext = k => { if (k < 0 || k >= segs.length) return 0; const g = segs[k], h = segs[k + 1] ?? segs[k - 1]; return hw * Math.tan(Math.acos(Math.max(-1, Math.min(1, g.ux * h.ux + g.uz * h.uz))) / 2); };
      const a0 = F.at(i > 0 ? -ext(i) : 0), a1 = F.at(F.len + (i < segs.length - 1 ? ext(i) : 0));
      walk({ id: `${Q.id}-deck-${i}`, kind: 'deck', a: { x: a0.x, y: D, z: a0.z }, b: { x: a1.x, y: D, z: a1.z }, width: Q.width });
      // Its body is solid below the deck, down the face and back into the made ground; nobody on the bank walks into it.
      const r = hw, count = Math.max(1, Math.ceil(F.len / 1.6));
      for (let c = 0; c <= count; c++) { const p = F.at(F.len * c / count); push({ x: p.x, z: p.z, r, minY: Math.min(foot, footIn), maxY: D - .4, kind: 'mithala-quay', id: `${Q.id}-body-${i}-${c}` }); }
      // Bollards along the outer edge, clear of the stair's head and the crane.
      for (let s = 2.2; s < F.len - 1; s += 5.5) {
        const p = F.at(s, ws * (hw - .65));
        if (buildingGap(p.x, p.z) < 1 || STREET_SEGMENTS.some(t => mithalaSegmentDistance(p.x, p.z, t.a, t.b) < t.half + .5)) continue;
        drum(b, FOOT_DARK, p.x, D, p.z, .3, D + .55, .26, 8);
        drum(b, FOOT, p.x, D + .55, p.z, .36, D + .75, .36, 8, 0, { cap: FOOT_LIGHT });
        push({ x: p.x, z: p.z, r: .4, minY: D - .2, maxY: D + .9, kind: 'mithala-bollard', id: `${Q.id}-bollard-${i}-${Math.round(s * 10)}` });
        metrics.bollards++;
      }
      // The bank below the face, pitched with stone down to the water, and the mooring posts at its edge.
      for (let s = 0; s < F.len - 1e-6; s += 1.5) {
        const s1 = Math.min(F.len, s + 1.5), edge = sm => { for (let o = hw + .25; o < hw + 14; o += .25) { const p = F.at(sm, ws * o); if (westWaterSurface(p.x, p.z) !== null) return o; } return null; };
        const w0 = edge(s) ?? hw + 6, w1 = edge(s1) ?? hw + 6;
        const steps = Math.max(1, Math.ceil(Math.max(w0, w1) - hw));
        const pitch = (sa, o) => { const p = F.at(sa, ws * o); return [p.x, ground(p.x, p.z) + .04, p.z]; };
        for (let k = 0; k < steps; k++) {
          const o00 = hw + .02 + (w0 + .5 - hw) * k / steps, o01 = hw + .02 + (w0 + .5 - hw) * (k + 1) / steps;
          const o10 = hw + .02 + (w1 + .5 - hw) * k / steps, o11 = hw + .02 + (w1 + .5 - hw) * (k + 1) / steps;
          quadToward(b, pick([FOOT_DARK, '#6c6352', FOOT], seed, i, s, k), pitch(s, o00), pitch(s1, o10), pitch(s1, o11), pitch(s, o01), [0, 1, 0]);
        }
      }
      for (let s = 3; s < F.len - 1; s += 7) {
        let o = null, water = null;
        for (let t = hw + .5; t < hw + 14; t += .25) { const p = F.at(s, ws * t); water = westWaterSurface(p.x, p.z); if (water !== null) { o = t - .3; break; } }
        if (o === null) continue;
        const p = F.at(s, ws * o), gp = ground(p.x, p.z), top = Math.max(gp, water) + 1.5, pf = gp - 1.2;
        b.block(TIMBER_DARK, p.x, pf, p.z, .32, top - pf, .32, F.yaw);
        b.block(IRON, p.x, top - .45, p.z, .36, .1, .36, F.yaw);
        push({ x: p.x, z: p.z, r: .25, minY: pf, maxY: top + .1, kind: 'mithala-mooring-post', id: `${Q.id}-mooring-${i}-${Math.round(s)}` });
        mooring.push({ x: p.x, y: top - .3, z: p.z });
        metrics.mooringPosts++;
      }
    }
    metrics.quays++;
    // The barges: a flat bottom, slab sides and swim ends raked up out of the water, a floor of boards under the load,
    // sacks stacked amidships, a sweep at the stern; each tied to the nearest posts by the bow and the stern.
    for (const [bi, barge] of MITHALA_BARGES.entries()) {
      yield;
      const water = westWaterSurface(barge.x, barge.z) ?? ground(barge.x, barge.z) + .9;
      const L = barge.length, Wd = barge.width, hb = Wd / 2, draft = .42, free = .72, rake = 1.7, s = 300 + bi * 17;
      const HULL = '#4e3d2d', HULL_DARK = '#3d3024';
      // The layout's yaw turns the barge's length from +x toward +z.
      const ux = Math.cos(barge.yaw), uz = Math.sin(barge.yaw), toWorld = (lx, lz) => ({ x: barge.x + ux * lx - uz * lz, z: barge.z + uz * lx + ux * lz });
      b.frame(barge.x, water, barge.z, -barge.yaw, () => {
        const xb = L / 2 - rake;
        for (const zs of [-1, 1]) {
          quadToward(b, HULL, [-xb, -draft, zs * hb], [xb, -draft, zs * hb], [L / 2, free, zs * hb], [-L / 2, free, zs * hb], [0, 0, zs]);
          quadToward(b, HULL_DARK, [-L / 2 + .1, free - .62, zs * (hb - .08)], [L / 2 - .1, free - .62, zs * (hb - .08)], [L / 2 - .1, free, zs * (hb - .08)], [-L / 2 + .1, free, zs * (hb - .08)], [0, 0, -zs]);
          b.beam(TIMBER_DARK, [-L / 2 + .05, free + .04, zs * (hb - .03)], [L / 2 - .05, free + .04, zs * (hb - .03)], .14, .12);
          b.beam(TIMBER_OLD, [-xb + .3, .32, zs * (hb + .05)], [xb - .3, .32, zs * (hb + .05)], .1, .16);
        }
        const xe = L / 2 - 1;
        for (const xs of [-1, 1]) {
          quadToward(b, HULL, [xs * xb, -draft, -hb], [xs * xb, -draft, hb], [xs * L / 2, free, hb], [xs * L / 2, free, -hb], [xs * (draft + free), -rake, 0]);
          // A short deck over each swim end, and the bulkhead that closes the hold under it.
          quadToward(b, TIMBER_2, [xs * xe, free, -hb], [xs * L / 2, free, -hb], [xs * L / 2, free, hb], [xs * xe, free, hb], [0, 1, 0]);
          quadToward(b, HULL_DARK, [xs * xe, free - .62, -hb + .08], [xs * xe, free - .62, hb - .08], [xs * xe, free, hb - .08], [xs * xe, free, -hb + .08], [-xs, 0, 0]);
        }
        quadToward(b, HULL_DARK, [-xb, -draft, -hb], [xb, -draft, -hb], [xb, -draft, hb], [-xb, -draft, hb], [0, -1, 0]);
        quadToward(b, TIMBER_OLD, [-xe, free - .62, -hb + .08], [xe, free - .62, -hb + .08], [xe, free - .62, hb - .08], [-xe, free - .62, hb - .08], [0, 1, 0]);
        for (const x of [-L / 2 + 1.2, -L / 4, L / 4, L / 2 - 1.2]) b.box(TIMBER_DARK, x, free - .05, 0, .2, .12, Wd - .1);
        // The load: sacks two deep amidships, the upper tier set back from the ends.
        for (let x = -L / 2 + 2.6, i = 0; x <= L / 2 - 2.6; x += .82, i++) for (let row = -1; row <= 1; row++) {
          const z = row * (hb - .62);
          b.rock(pick(SACKS, s, i, row), x, free - .38, z, .44, .27, .32, rand(s, i, row) * .6);
          if (x > -L / 2 + 3.5 && x < L / 2 - 3.5 && row !== 1) b.rock(pick(SACKS, s, i, row, 2), x + .2, free - .02, z + .3, .42, .26, .31, rand(s, i, row, 3) * .6);
        }
        // Bitts at the bow, a sweep over the stern, a pole along the gunwale.
        b.block(TIMBER_DARK, L / 2 - .7, free - .62, 0, .3, 1.1, .3);
        b.block(TIMBER_DARK, -L / 2 + .7, free - .62, 0, .26, 1.4, .26);
        b.beam(TIMBER_OLD, [-L / 2 + .7, free + .7, 0], [-L / 2 - 3.2, free - .35, .3], .1);
        b.box(TIMBER_OLD, -L / 2 - 3.4, free - .45, .32, .06, .55, .32, 0, 0, .3);
        b.beam(TIMBER_2, [-L / 2 + 1, free + .12, hb - .25], [L / 2 - 1.2, free + .12, hb - .25], .07);
      });
      // Its lines, bow and stern, to the nearest mooring posts, sagging a little.
      for (const lx of [L / 2 - .7, -L / 2 + .7]) {
        const p = toWorld(lx, 0), from = [p.x, water + free + .35, p.z];
        const post = mooring.map(m => ({ m, d: Math.hypot(m.x - p.x, m.z - p.z) })).sort((u, v) => u.d - v.d)[0];
        if (!post || post.d > 14) continue;
        const to = [post.m.x, post.m.y, post.m.z], sag = [(from[0] + to[0]) / 2, Math.min(from[1], to[1]) - .45, (from[2] + to[2]) / 2];
        b.beam(ROPE, from, sag, .05); b.beam(ROPE, sag, to, .05);
      }
      // A hull swimmers go round, from its bottom to the top of its load.
      const r = hb + .05, count = Math.max(2, Math.ceil((L - 2 * r) / r));
      for (let i = 0; i <= count; i++) {
        const p = toWorld(-L / 2 + r + (L - 2 * r) * i / count, 0);
        push({ x: p.x, z: p.z, r, minY: water - draft, maxY: water + free + .6, kind: 'mithala-barge', id: `${barge.id}-hull-${i}` });
      }
      metrics.barges++;
    }
    yield* finish(b);
  }

  // The buildings, the sky tower and its stair (src/content/regions/mithala/mithala-city-buildings.js).
  metrics.sceneryVertices = metrics.vertices;
  yield* createMithalaCityBuildingSteps({ root, groundHeight, colliders, walkSurfaces, metrics });

  const detail = yield* polishMithala({root,colliders,heightAt});
  metrics.vertices += detail.vertices; metrics.batches += detail.batches; metrics.colliders += detail.placements.length; metrics.streetDetails = detail.placements.length;
  return { root, metrics, detail, defenses, walkSurfaces, bridges,
    mapFeatures: MITHALA_BUILDINGS.map(b => ({ id: b.id, name: b.name, x: b.x, z: b.z, width: b.width, depth: b.depth, kind: b.kind })) };
}
