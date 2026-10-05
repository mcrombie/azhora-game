/** Shared parts for Mithala's scenery (src/mithala-city-scenery.js, src/mithala-city-buildings.js): the palette of
 * the two hands that built the city, deterministic variation, and the small geometric helpers both draw with. */
import { MITHALA_CITY } from './mithala-city.js';

export const TAU = Math.PI * 2;
export const P = MITHALA_CITY.platform;

// Mithali work.
export const FOOT = '#7c725f', FOOT_DARK = '#625a4b', FOOT_LIGHT = '#91866f';
export const BRICKS = ['#4f362b', '#583b2f', '#4a3229', '#5d4134'], STAIN = '#3a2c25', BURNT = '#33241f';
export const TIMBER = '#c9b58d', TIMBER_2 = '#baa47d', TIMBER_OLD = '#a99570', TIMBER_DARK = '#7d6b51';
export const THATCHES = ['#a6935f', '#9e8c5a', '#ad9a66', '#978656'], THATCH_RIDGE = '#74673f', THATCH_EDGE = '#8b7b50';
export const DOOR = '#5e4733', OPENING = '#241e1a', SHUTTER = '#806b4d', BONE = '#d9d0b9';
// The Cref curtain: cool grey Lotharn ashlar, a different hand from everything else on the plain.
export const GREYS = ['#8a9196', '#80878c', '#959ca0', '#878e93', '#7b8287'], GREY_DARK = '#676e73', GREY_LIGHT = '#a8aeb1', COPING = '#b4b9bb';
export const IRON = '#35383b', ROPE = '#9c8b63', SACKS = ['#c6b18b', '#bca77f', '#cfbb95'], MARK = '#2b2d2f';
export const PAVE_FORK = '#795646', PAVE = '#8c7c60', FLAGS = '#9a9283', CLAY_FLOOR = '#a28c68';

// ---------------------------------------------------------------------------
// Small deterministic helpers
// ---------------------------------------------------------------------------
/** A hash in [0, 1) of a few numbers: variation that never changes between loads. */
export function rand(...keys) {
  let h = 2166136261;
  for (const v of keys) { h ^= Math.round(v * 977) | 0; h = Math.imul(h, 16777619); }
  h ^= h >>> 13; h = Math.imul(h, 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export const pick = (list, ...keys) => list[Math.floor(rand(...keys) * list.length) % list.length];
/** A quad (or triangle) wound so its front face looks along `n`, in the builder's current frame. */
export function facing(p, q, r, n) {
  const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2], vx = r[0] - p[0], vy = r[1] - p[1], vz = r[2] - p[2];
  return (uy * vz - uz * vy) * n[0] + (uz * vx - ux * vz) * n[1] + (ux * vy - uy * vx) * n[2] >= 0;
}
export function quadToward(b, tint, p, q, r, s, n) { if (facing(p, q, r, n)) b.quad(tint, p, q, r, s); else b.quad(tint, s, r, q, p); }
export function triToward(b, tint, p, q, r, n) { if (facing(p, q, r, n)) b.triangle(tint, p, q, r); else b.triangle(tint, r, q, p); }
/** A frustum's side (and optionally a top cap) round (x, z): `tint` may be a function of the face index. */
export function drum(b, tint, x, y0, z, r0, y1, r1, sides = 16, phase = 0, { inward = false, cap = null } = {}) {
  for (let i = 0; i < sides; i++) {
    const a0 = phase + i * TAU / sides, a1 = phase + (i + 1) * TAU / sides, am = (a0 + a1) / 2, t = typeof tint === 'function' ? tint(i) : tint;
    const n = inward ? [-Math.cos(am), 0, -Math.sin(am)] : [Math.cos(am), 0, Math.sin(am)];
    quadToward(b, t, [x + Math.cos(a0) * r0, y0, z + Math.sin(a0) * r0], [x + Math.cos(a1) * r0, y0, z + Math.sin(a1) * r0],
      [x + Math.cos(a1) * r1, y1, z + Math.sin(a1) * r1], [x + Math.cos(a0) * r1, y1, z + Math.sin(a0) * r1], n);
    if (cap) triToward(b, cap, [x, y1, z], [x + Math.cos(a0) * r1, y1, z + Math.sin(a0) * r1], [x + Math.cos(a1) * r1, y1, z + Math.sin(a1) * r1], [0, 1, 0]);
  }
}
/** A flat ring (or disc, from r0 = 0) facing up. */
export function annulus(b, tint, x, y, z, r0, r1, sides = 16) {
  for (let i = 0; i < sides; i++) {
    const a0 = i * TAU / sides, a1 = (i + 1) * TAU / sides;
    const p = (r, a) => [x + Math.cos(a) * r, y, z + Math.sin(a) * r];
    if (r0 > 1e-3) quadToward(b, tint, p(r0, a0), p(r1, a0), p(r1, a1), p(r0, a1), [0, 1, 0]);
    else triToward(b, tint, [x, y, z], p(r1, a0), p(r1, a1), [0, 1, 0]);
  }
}
/**
 * A thick reed-thatch roof over a `w` by `d` wall footprint whose wall plate is at local y = 0, the ridge along local x
 * (turn the frame for a ridge along z). `rise` is the underside's height at the ridge above the plate, so a gable
 * triangle of that height fits exactly under it. Hipped roofs keep one pitch all round; gabled ones show the thatch's
 * thickness at the verges.
 */
export function thatchRoof(b, tint, w, d, rise, { hip = true, over = .8, t = .45, edge = THATCH_EDGE, ridge = THATCH_RIDGE } = {}) {
  const hd = d / 2 + over, hw = w / 2 + over, slope = rise / (d / 2), yE = t - slope * over, yR = t + rise;
  const hipIn = hip ? Math.min(hw, hd) : 0;
  const E = [[-hw, yE, -hd], [hw, yE, -hd], [hw, yE, hd], [-hw, yE, hd]], R = [[-hw + hipIn, yR, 0], [hw - hipIn, yR, 0]];
  const down = p => [p[0], p[1] - t, p[2]], Eb = E.map(down), Rb = R.map(down);
  quadToward(b, tint, E[0], E[1], R[1], R[0], [0, 1, -1]); quadToward(b, tint, E[3], E[2], R[1], R[0], [0, 1, 1]);
  quadToward(b, edge, Eb[0], Eb[1], Rb[1], Rb[0], [0, -1, 1]); quadToward(b, edge, Eb[3], Eb[2], Rb[1], Rb[0], [0, -1, -1]);
  quadToward(b, edge, E[0], E[1], Eb[1], Eb[0], [0, 0, -1]); quadToward(b, edge, E[3], E[2], Eb[2], Eb[3], [0, 0, 1]);
  if (hip) {
    triToward(b, tint, E[0], E[3], R[0], [-1, 1, 0]); triToward(b, tint, E[1], E[2], R[1], [1, 1, 0]);
    triToward(b, edge, Eb[0], Eb[3], Rb[0], [1, -1, 0]); triToward(b, edge, Eb[1], Eb[2], Rb[1], [-1, -1, 0]);
    quadToward(b, edge, E[0], E[3], Eb[3], Eb[0], [-1, 0, 0]); quadToward(b, edge, E[1], E[2], Eb[2], Eb[1], [1, 0, 0]);
    for (const [e, r] of [[0, 0], [3, 0], [1, 1], [2, 1]]) b.beam(ridge, E[e], R[r], .32, .26);
  } else {
    for (const [e, r, s] of [[0, 0, -1], [3, 0, -1], [1, 1, 1], [2, 1, 1]]) quadToward(b, edge, E[e], R[r], Rb[r], Eb[e], [s, 0, 0]);
  }
  if (R[1][0] - R[0][0] > .05) b.beam(ridge, [R[0][0] - (hip ? .2 : .1), yR + .05, 0], [R[1][0] + (hip ? .2 : .1), yR + .05, 0], .5, .3);
  else b.box(ridge, 0, yR + .1, 0, .7, .3, .7);
}
/** A gable wall's triangle under `thatchRoof(..., {hip:false})`, in the plane x = `x`. */
export function gable(b, tint, x, d, rise, sign) { triToward(b, tint, [x, 0, -d / 2], [x, 0, d / 2], [x, rise, 0], [sign, 0, 0]); }
