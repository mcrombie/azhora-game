/** Free climbing in Suval, both Lotharn ranges, Feradom's hills, South/West Oremindi, Baldro, the Telemon highland, Babon's jungle cliffs Dinelv's mesa faces and East Izol's Presences and sea cliffs.
 * This controller owns no input, rendering or saved state.
 * Feet follow the actual heightfield; only the exposed bedrock skins cease to be obstacles.
 * Walls, frontier rocks, water, trees and people remain solid at every substep, and a face the world marks
 * unclimbable (`climbForbidden`) gives no hold at all. */
import { OUTER_PROFILES } from '../../content/regions/outer-regions/outer-regions-data.js';
export const CLIMBING = Object.freeze({ grabSlope: .9, restSlope: .6, maxSlope: 12, reach: 1.45, radius: .34,
  speed: 1.8, movingDrain: 7, descendingDrain: 3.5, hangingDrain: 1.2, burstCost: 14,
  safeDrop: 3.5, gravity: 20 });
// Telemonia is here by name only (docs/telemonia-stage1-brief.md): its number is written in `REGION_IDS` and nowhere
// else, because it is renumbered the day it lands, and every caller in the game asks `world.regionAt`, which answers
// the region itself - so `r.name` finds it. Its rim's cliff bands are what stop a walker there (src/content/regions/telemonia/telemonia-world.js).
const CLIMB_REGIONS = new Set([...OUTER_PROFILES.flatMap(p=>[p.name,p.id]),70,71,72,73,74,75,76,77,78,79,65,66,67,68,69,'East Oremindi Mountains','North Oreminidi Mountains','Lesser Oremindi Mountains','Cudon','Narcosh',56, 'West Oremindi Mountains', 4, 5, 18, 20, 21, 27, 37, 52, 53, 'East Suval', 'West Suval', 'South Suval', 'East Lotharn Mountains', 'Feradom', 'West Lotharn Mountains', 'South Oremindi Mountains', 'West Baldro Mountains', 'East Baldro Mountains', 'Telemonia', 60, 'Babon', 'Dinelv Highlands', 'East Izol']);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const copy = p => p ? { x: p.x, y: p.y, z: p.z } : null;
const finite = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
const region = (world, x, z) => world.regionAt?.(x, z);
const closedRegion = r => r === 4 || r === 'East Suval' || r?.id === 4 || r?.name === 'East Suval' ? 'East Suval'
  : r === 21 || r === 'Feradom' || r?.id === 21 || r?.name === 'Feradom' ? 'Feradom' : null;
export function isClimbTerrain(world, x, z) {
  const r = region(world, x, z);
  return CLIMB_REGIONS.has(r) || CLIMB_REGIONS.has(r?.id) || CLIMB_REGIONS.has(r?.name);
}

// Compatibility for existing Suval callers; the supported terrain now includes the new ranges.
export const isSuvalClimbTerrain = isClimbTerrain;

/**
 * Faces no hand holds, whatever the skill: the world says where (`world.unclimbableAt(x, z)`; src/world.js
 * answers it from the table in src/gameplay/movement/no-climb-zones.js, a row to a place - the rock Varn's walls are built into
 * is one, and Kethorn's rock and its wall in Telemonia, whose gate is the only way onto the top, another). Read
 * where this rule decides whether a hand can go somewhere - the surface a grab looks for, and every
 * attached step of a climb - and nowhere else: walking, falling and sliding off are the ground's own, so a
 * walker still cannot walk up such a face (`canWalkSlope`) and a faller still comes down it.
 */
export const climbForbidden = (world, x, z) => !!world.unclimbableAt?.(x, z);

/** Collision filtering is deliberately a one-kind allowlist, never a generic rock bypass. */
export function climbSurfaceClear(world, x, z, { radius = CLIMBING.radius, ignoreFaces = true } = {}) {
  const b = world.bounds;
  if (b && (x < b.minX + radius || x > b.maxX - radius || z < b.minZ + radius || z > b.maxZ - radius)) return false;
  const h = world.heightAt(x, z), water = world.waterAt?.(x, z) ?? .45;
  if (!Number.isFinite(h) || h < water) return false;
  for (const c of world.nearColliders?.(x, z, radius) ?? world.colliders ?? []) {
    if (c.kind === 'river-water' || c.kind === 'pond-water' || (ignoreFaces && c.kind === 'suval-peak-face')) continue;
    if (c.r != null ? Math.hypot(x - c.x, z - c.z) < c.r + radius
      : Math.abs(x - c.x) < c.hx + radius && Math.abs(z - c.z) < c.hz + radius) return false;
  }
  return true;
}

export function sampleClimbSurface(world, x, z) {
  const step = .4, h = world.heightAt(x, z);
  const gx = (world.heightAt(x + step, z) - world.heightAt(x - step, z)) / (step * 2);
  const gz = (world.heightAt(x, z + step) - world.heightAt(x, z - step)) / (step * 2);
  const slope = Math.hypot(gx, gz), valid = Number.isFinite(h + slope);
  const gradient = { x: slope > 1e-7 ? gx / slope : 0, z: slope > 1e-7 ? gz / slope : 0 };
  const allowed = valid && slope <= CLIMBING.maxSlope && isClimbTerrain(world, x, z) && !climbForbidden(world, x, z) && climbSurfaceClear(world, x, z);
  return { allowed, height: h, slope, gradient, yaw: Math.atan2(gradient.x, gradient.z),
    climbable: allowed && slope >= CLIMBING.grabSlope, resting: allowed && slope <= CLIMBING.restSlope };
}

/** Optional player-only guard. Ordinary roads and terrain outside the climbing regions retain their rules. */
export function canWalkSlope(fromX, fromZ, toX, toZ, world) {
  if (!isClimbTerrain(world, toX, toZ) && !isClimbTerrain(world, fromX, fromZ)) return true;
  const d = Math.hypot(toX - fromX, toZ - fromZ);
  if (d < 1e-8) return true;
  const rise = world.heightAt(toX, toZ) - world.heightAt(fromX, fromZ);
  // A steep descent loses ground support and falls in the traveler controller;
  // it is not an invisible wall. Keep uphill walking behind the climbing guard.
  if (rise <= 1e-6) return true;
  // Allow 8 cm of roughness above the normal walking grade, independent of input step size. Keep the
  // full-face check below: tiny movement steps must not bypass a steep mountainside.
  if (rise > d * CLIMBING.grabSlope + .08) return false;
  // The walking resolver slides along X/Z separately. Check the complete face, otherwise
  // alternating two permissive axes could walk straight up a steep diagonal mountainside.
  const x = (fromX + toX) / 2, z = (fromZ + toZ) / 2, s = .4;
  const gx = (world.heightAt(x + s, z) - world.heightAt(x - s, z)) / (s * 2);
  const gz = (world.heightAt(x, z + s) - world.heightAt(x, z - s)) / (s * 2);
  return Math.hypot(gx, gz) <= CLIMBING.grabSlope;
}

function crossingAllowed(world, from, to) {
  if (world.canClimbMove && !world.canClimbMove(from, to)) return false;
  const target = closedRegion(region(world, to.x, to.z));
  return !target || closedRegion(region(world, from.x, from.z)) === target;
}

export function createClimbing({ world: worldSource, onEvent = () => {} }) {
  const world = () => typeof worldSource === 'function' ? worldSource() : worldSource;
  let phase = 'idle', position = null, safePosition = null, yaw = 0, slope = 0, progress = 0;
  let moving = false, staminaSpent = 0, damage = 0, xp = 0, fallTop = 0, fallVelocity = 0;
  let drift = { x: 0, z: 0 }, burstQueued = false, burstRemaining = 0, fallTime = 0;
  const view = () => ({ phase, position: copy(position), safePosition: copy(safePosition), yaw, slope,
    moving, progress, staminaSpent, damage, xp });
  function event(type, extra = {}) { onEvent({ type, ...view(), ...extra }); }
  function probe(from, facing) {
    if (!finite(from) || !Number.isFinite(facing)) return { available: false, reason: 'No reachable rock face.' };
    const w = world();
    if (!isClimbTerrain(w, from.x, from.z)) return { available: false, reason: 'Climbing is available in Suval, the Lotharn, Feradom, Oremindi, Baldro, Telemonia, Babon and Dinelv.' };
    const base = w.heightAt(from.x, from.z), forward = { x: Math.sin(facing), z: Math.cos(facing) };
    let previous = { ...from }, found = null;
    // Do not jump a collider to grab the other side, or snap up a ledge taller than the body.
    for (let reach = 0; reach <= CLIMBING.reach + .001; reach += .145) {
      const target = { x: from.x + forward.x * reach, z: from.z + forward.z * reach };
      const surface = sampleClimbSurface(w, target.x, target.z);
      if (!surface.allowed || !crossingAllowed(w, previous, target) || surface.height - base > 2.1) break;
      const withinVerticalReach = !Number.isFinite(from.y) || Math.abs(surface.height - from.y) <= 2.1;
      if (withinVerticalReach && surface.climbable && surface.gradient.x * forward.x + surface.gradient.z * forward.z > .2) {
        found = { available: true, reason: 'Climb the rock face', position: { ...target, y: surface.height }, ...surface };
        break;
      }
      previous = target;
    }
    return found ?? { available: false, reason: 'Face a steep rock slope and move closer.' };
  }
  function grab(from, facing, { stamina = 0 } = {}) {
    if (phase !== 'idle' || stamina < 5) return false;
    const target = probe(from, facing);
    if (!target.available) return false;
    const w = world();
    safePosition = { x: from.x, y: w.heightAt(from.x, from.z), z: from.z };
    position = copy(target.position); yaw = target.yaw; slope = target.slope; phase = 'climbing';
    progress = 0; moving = false; staminaSpent = damage = xp = 0; burstQueued = false; burstRemaining = 0;
    event('grabbed'); return true;
  }
  function fall(reason) {
    if (phase !== 'climbing') return;
    phase = 'falling'; fallTop = position.y; fallVelocity = 0; fallTime = 0;
    const g = sampleClimbSurface(world(), position.x, position.z).gradient;
    drift = { x: -g.x, z: -g.z }; moving = true; event(reason);
  }
  function settle(reason) {
    // A long controlled descent is harmless; only the height lost since releasing is damage.
    const drop = Math.max(0, fallTop - position.y - CLIMBING.safeDrop);
    if (phase === 'falling') damage += Math.min(100, Math.round(drop * 5));
    phase = 'idle'; moving = false;
    if (climbSurfaceClear(world(), position.x, position.z, { ignoreFaces: false })) safePosition = copy(position);
    event(reason);
  }
  function move(dx, dz, attached = true) {
    const w = world(), steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .12));
    let covered = 0;
    for (let i = 0; i < steps; i++) {
      const next = { x: position.x + dx / steps, z: position.z + dz / steps };
      if (!isClimbTerrain(w, next.x, next.z) || (attached && climbForbidden(w, next.x, next.z)) || !climbSurfaceClear(w, next.x, next.z) || !crossingAllowed(w, position, next)) break;
      const h = w.heightAt(next.x, next.z);
      if (attached && Math.abs(h - position.y) > 1.2) break;
      if (!attached && h > position.y + .1) break;
      const old = copy(position); position.x = next.x; position.z = next.z;
      if (attached) position.y = h;
      covered += Math.hypot(next.x - old.x, attached ? h - old.y : 0, next.z - old.z);
    }
    return covered;
  }
  function tick(elapsed, { playing = true, up = 0, side = 0, stamina = 0, level = 1, burst = false } = {}) {
    staminaSpent = damage = xp = 0;
    if (!playing || phase === 'idle' || !Number.isFinite(elapsed) || elapsed <= 0) return view();
    const dt = Math.min(elapsed, .25), steps = Math.max(1, Math.ceil(dt / .025));
    const skill = clamp(Number(level) || 1, 1, 20), efficiency = Math.max(.6, 1 - (skill - 1) * .025);
    const speed = CLIMBING.speed * Math.min(1.6, 1 + (skill - 1) * .035);
    let charge = Math.max(0, Number(stamina) || 0), actual = 0;
    if (burst && !burstQueued && burstRemaining <= 0 && phase === 'climbing' && charge >= CLIMBING.burstCost) {
      charge -= CLIMBING.burstCost; staminaSpent += CLIMBING.burstCost; burstQueued = true;
      burstRemaining = .45;
    } else if (!burst) burstQueued = false;
    for (let i = 0; i < steps && phase !== 'idle'; i++) {
      const slice = dt / steps, w = world(), surface = sampleClimbSurface(w, position.x, position.z);
      slope = surface.slope;
      if (phase === 'climbing') {
        if (charge <= .001) { fall('exhausted'); continue; }
        const boosting = burstRemaining > 0, boost = boosting ? 2.8 : 1;
        burstRemaining = Math.max(0, burstRemaining - slice);
        const length = Math.max(1, Math.hypot(up, side));
        const vertical = boosting ? 1 : clamp(up / length, -1, 1), sideways = boosting ? 0 : clamp(side / length, -1, 1);
        const g = surface.gradient, along = speed * boost / Math.sqrt(1 + slope * slope);
        const moved = move((g.x * vertical * along - g.z * sideways * speed) * slice,
          (g.z * vertical * along + g.x * sideways * speed) * slice);
        const draining = moved > 1e-5 ? (vertical < -.1 ? CLIMBING.descendingDrain : CLIMBING.movingDrain) : CLIMBING.hangingDrain;
        const spent = Math.min(charge, draining * efficiency * slice); charge -= spent; staminaSpent += spent;
        actual += moved; progress += moved * 3; xp += moved * .65;
        if (surface.slope > .1) yaw = surface.yaw;
        const next = sampleClimbSurface(w, position.x, position.z);
        // A genuine ledge has room for the body; a flattened bit under a tree is not a rest.
        if (moved > 0 && next.resting && climbSurfaceClear(w, position.x, position.z, { ignoreFaces: false })) {
          safePosition = copy(position); phase = 'idle'; moving = false; event(vertical >= 0 ? 'crested' : 'landed');
        }
        if (charge <= .001 && phase === 'climbing') fall('exhausted');
      } else {
        fallTime += slice;
        if (surface.slope > .08) drift = { x: -surface.gradient.x, z: -surface.gradient.z };
        const slide = Math.min(9, 2.6 + fallTime * 3.5), before = copy(position);
        let covered = move(drift.x * slide * slice, drift.z * slide * slice, false);
        // Slide around solid props without ever crossing them or pushing through the frontier.
        if (covered < .0001) for (const turn of [.55, -.55, 1.05, -1.05]) {
          const dx = drift.x * Math.cos(turn) - drift.z * Math.sin(turn), dz = drift.x * Math.sin(turn) + drift.z * Math.cos(turn);
          if (w.heightAt(position.x + dx * .12, position.z + dz * .12) > position.y + .02) continue;
          covered = move(dx * slide * slice, dz * slide * slice, false); if (covered > .0001) break;
        }
        fallVelocity -= CLIMBING.gravity * slice;
        const floor = w.heightAt(position.x, position.z); position.y = Math.max(floor, position.y + fallVelocity * slice);
        if (position.y <= floor + .001) {
          fallVelocity = 0;
          const next = sampleClimbSurface(w, position.x, position.z);
          if (next.slope <= CLIMBING.restSlope || (covered < .0001 && fallTime > .3)) settle(covered < .0001 ? 'caught' : 'landed');
        }
        actual += Math.hypot(position.x - before.x, position.y - before.y, position.z - before.z);
      }
    }
    moving = phase !== 'idle' && actual > .00001;
    return view();
  }
  return { probe, grab, tick, view, release: () => fall('released'),
    cancel() { phase = 'idle'; position = safePosition = null; moving = false; staminaSpent = damage = xp = burstRemaining = 0; },
    get active() { return phase !== 'idle'; } };
}
