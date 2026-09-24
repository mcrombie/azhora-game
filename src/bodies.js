/**
 * People and animals are solid to one another. The traveler bumps into a
 * passer-by instead of walking through them; a villager on a lane steps round
 * the traveler, or round another villager, instead of passing through.
 *
 * Bodies are rebuilt every frame from whoever is standing about. A mover is
 * never blocked by its own body. An existing overlap (a warp, a spawn, a story
 * start) permits steps that open the gap, but never steps farther through it.
 */
import { canStand, moveCharacter } from './game-state.js';

/** Footprints, in metres of radius. */
export const BODY = Object.freeze({ person: .3, traveler: .34, dog: .26, cat: .15, horse: .5, ogre: .62, wolf: .32, spider: 1.02 });

/**
 * A view of `world` whose colliders include the frame's bodies. `moving(who, radius)`
 * says who is about to move: `who` is read live (its position may change mid-step).
 * `ignore` lists collider kinds this mover passes over: a cat hops a crate.
 */
export function bodyWorld(world, { ignore = [] } = {}) {
  let bodies = [], mover = null, moverId = null, moverRadius = BODY.traveler;
  const adapter = {
    get bounds() { return world.bounds; },
    get colliders() { return world.colliders; },
    heightAt: (x, z) => world.heightAt(x, z),
    waterAt: (x, z) => world.waterAt?.(x, z),
    nearColliders(x, z, reach = 0, out) {
      const near = world.nearColliders ? world.nearColliders(x, z, reach, out) : [...world.colliders];
      // A prop the mover already stands inside (after a warp, a story start, a spawn) never
      // holds it there, any more than a person it overlaps does: it can always walk out.
      let kept = 0;
      for (let i = 0; i < near.length; i++) {
        const c = near[i];
        if (ignore.includes(c.kind)) continue;
        if (mover && c.kind === 'prop' && Math.hypot(c.x - mover.x, c.z - mover.z) < c.r + moverRadius) continue;
        near[kept++] = c;
      }
      near.length = kept;
      for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        if (!body || body.active === false || body.dead || body.fallen || body.lying || body.action === 'dead'
          || (Number.isFinite(body.hp) && body.hp <= 0)) continue;
        if (mover && moverId != null && (body.id === moverId || body.npcId === moverId)) continue;
        if (mover) {
          const awayX = mover.x - body.x, awayZ = mover.z - body.z, before = Math.hypot(awayX, awayZ);
          // Do not turn a small lunge/spawn overlap into permission to pass
          // through someone. The step must start outward: testing only its end
          // lets a large step cross a nearby center and land farther beyond it.
          const outward = awayX * (x - mover.x) + awayZ * (z - mover.z) >= -1e-12;
          if (before < body.r + moverRadius && outward && Math.hypot(body.x - x, body.z - z) >= before + 1e-8) continue;
        }
        if (Math.abs(body.x - x) <= body.r + reach && Math.abs(body.z - z) <= body.r + reach) near.push(body);
      }
      return near;
    },
    /** Who is standing about this frame: [{ id, x, z, r }]. */
    setBodies(list) { bodies = list; return adapter; },
    /** Positions without an id (such as THREE.Vector3) supply their owner explicitly. */
    moving(who, radius = BODY.traveler, id = who?.id) { mover = who; moverRadius = radius; moverId = id; return adapter; },
    get bodies() { return bodies; },
  };
  return adapter;
}

/**
 * Take a step; if someone is in the way, try a little to either side before
 * giving up, the way two people meeting on a path each lean aside. Returns the
 * distance actually moved.
 */
export function stepAround(position, dx, dz, world, radius, side = 1) {
  const want = Math.hypot(dx, dz);
  if (!(want > 0)) return 0;
  const start = { x: position.x, z: position.z };
  moveCharacter(position, dx, dz, world, radius);
  const moved = Math.hypot(position.x - start.x, position.z - start.z);
  if (moved >= want * .6) return moved;
  for (const turn of [.6, -.6, 1.2, -1.2]) {
    const angle = turn * side, c = Math.cos(angle), s = Math.sin(angle), trial = { x: start.x, z: start.z };
    moveCharacter(trial, dx * c - dz * s, dx * s + dz * c, world, radius);
    const got = Math.hypot(trial.x - start.x, trial.z - start.z);
    if (got >= want * .6) { position.x = trial.x; position.z = trial.z; return got; }
  }
  return moved;
}

const detours = new WeakMap();
const NAV_CELL = .75, NAV_REACH = 22, NAV_LIMIT = 1400;

function clearSegment(a, b, world, radius) {
  const distance = Math.hypot(b.x - a.x, b.z - a.z), samples = Math.max(1, Math.ceil(distance / .18));
  for (let i = 1; i <= samples; i++) {
    if (!canStand(a.x + (b.x - a.x) * i / samples, a.z + (b.z - a.z) * i / samples, world, radius)) return false;
  }
  return true;
}

function crossesFootprint(a, b, collider, radius) {
  const dx = b.x - a.x, dz = b.z - a.z;
  if (Number.isFinite(collider.r)) {
    const t = Math.max(0, Math.min(1, ((collider.x - a.x) * dx + (collider.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(a.x + dx * t - collider.x, a.z + dz * t - collider.z) < collider.r + radius;
  }
  let from = 0, to = 1;
  for (const [at, delta, center, extent] of [[a.x, dx, collider.x, collider.hx], [a.z, dz, collider.z, collider.hz]]) {
    if (!Number.isFinite(extent)) return false;
    const low = center - extent - radius, high = center + extent + radius;
    if (Math.abs(delta) < 1e-10) { if (at <= low || at >= high) return false; }
    else { const first = (low - at) / delta, last = (high - at) / delta; from = Math.max(from, Math.min(first, last)); to = Math.min(to, Math.max(first, last)); }
  }
  return from < to;
}

/** Houses and isolated shore cargo need only a few corners, rather than a grid search. */
function cornerRoute(start, goal, world, radius, side) {
  const distance = Math.hypot(goal.x - start.x, goal.z - start.z);
  const nearby = world.nearColliders?.((start.x + goal.x) / 2, (start.z + goal.z) / 2, distance / 2 + radius) ?? world.colliders;
  let obstacle = null, nearest = Infinity;
  for (const collider of nearby) {
    if (!crossesFootprint(start, goal, collider, radius + .04)) continue;
    const d = Math.hypot(collider.x - start.x, collider.z - start.z);
    if (d < nearest) { nearest = d; obstacle = collider; }
  }
  if (!obstacle) return [];
  const padding = radius + .1;
  const corners = Number.isFinite(obstacle.r) ? Array.from({ length: 8 }, (_, i) => {
    const angle = i * Math.PI / 4, reach = (obstacle.r + padding) / Math.cos(Math.PI / 8);
    return { x: obstacle.x + Math.cos(angle) * reach, z: obstacle.z + Math.sin(angle) * reach };
  }) : [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => ({ x: obstacle.x + x * (obstacle.hx + padding), z: obstacle.z + z * (obstacle.hz + padding) }));
  const clear = new Map(), count = corners.length;
  const point = index => index === -1 ? start : index === count ? goal : corners[index];
  function link(a, b) {
    const id = `${Math.min(a, b)},${Math.max(a, b)}`;
    if (!clear.has(id)) clear.set(id, clearSegment(point(a), point(b), world, radius + .015));
    return clear.get(id);
  }
  let shortest = Infinity, result = [];
  for (let first = 0; first < count; first++) {
    if (!link(-1, first)) continue;
    for (const direction of [side < 0 ? -1 : 1, side < 0 ? 1 : -1]) {
      let at = first, length = Math.hypot(start.x - corners[first].x, start.z - corners[first].z);
      const route = [corners[first]];
      for (let step = 0; step < count; step++) {
        const total = length + Math.hypot(goal.x - corners[at].x, goal.z - corners[at].z);
        if (total < shortest && link(at, count)) { shortest = total; result = [...route, goal]; }
        const next = (at + direction + count) % count;
        if (!link(at, next)) break;
        length += Math.hypot(corners[next].x - corners[at].x, corners[next].z - corners[at].z);
        if (length >= shortest) break;
        route.push(corners[next]); at = next;
      }
    }
  }
  return result;
}

/** A small local A* search, used only when direct travel meets an obstacle. */
function detourRoute(start, target, world, radius, side) {
  const length = Math.hypot(target.x - start.x, target.z - start.z);
  const reach = Math.min(length, NAV_REACH), goal = {
    x: start.x + (target.x - start.x) / length * reach,
    z: start.z + (target.z - start.z) / length * reach,
  };
  const corners = cornerRoute(start, goal, world, radius, side);
  if (corners.length) return corners;
  const open = [], records = new Map(), passable = new Map();
  const key = (x, z) => `${x},${z}`;
  function push(node) {
    let i = open.length; open.push(node);
    while (i > 0) { const parent = (i - 1) >> 1; if (open[parent].f <= node.f) break; open[i] = open[parent]; i = parent; }
    open[i] = node;
  }
  function pop() {
    const first = open[0], last = open.pop();
    if (open.length) {
      let i = 0;
      while (i * 2 + 1 < open.length) {
        let child = i * 2 + 1;
        if (child + 1 < open.length && open[child + 1].f < open[child].f) child++;
        if (last.f <= open[child].f) break;
        open[i] = open[child]; i = child;
      }
      open[i] = last;
    }
    return first;
  }
  function point(x, z) { return { x: start.x + x * NAV_CELL, z: start.z + z * NAV_CELL }; }
  function free(x, z) {
    const id = key(x, z);
    if (!passable.has(id)) { const p = point(x, z); passable.set(id, canStand(p.x, p.z, world, radius + .025)); }
    return passable.get(id);
  }
  const first = { x: 0, z: 0, g: 0, h: reach, f: reach, parent: null };
  records.set('0,0', first); push(first);
  let best = first, end = null, checked = 0;
  // Keep a stable side preference in ties: two opposing walkers do not reconsider every frame.
  const directions = side < 0 ? [[0, -1], [-1, 0], [0, 1], [1, 0], [-1, -1], [-1, 1], [1, -1], [1, 1]]
    : [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  while (open.length && checked < NAV_LIMIT) {
    const current = pop();
    if (current.closed || records.get(key(current.x, current.z)) !== current) continue;
    checked++;
    current.closed = true;
    const here = point(current.x, current.z);
    if (current.h < best.h) best = current;
    if (current.h < NAV_CELL * 1.5 && clearSegment(here, goal, world, radius)) { end = current; break; }
    for (const [dx, dz] of directions) {
      const x = current.x + dx, z = current.z + dz;
      // Eight metres of room behind/beside the local objective lets a walker clear a house corner.
      if (Math.abs(x * NAV_CELL) > NAV_REACH + 8 || Math.abs(z * NAV_CELL) > NAV_REACH + 8 || !free(x, z)) continue;
      const next = point(x, z), id = key(x, z), g = current.g + Math.hypot(dx, dz) * NAV_CELL;
      const old = records.get(id);
      if (old && old.g <= g) continue;
      if (!clearSegment(here, next, world, radius)) continue;
      const h = Math.hypot(goal.x - next.x, goal.z - next.z), node = { x, z, g, h, f: g + h, parent: current };
      records.set(id, node); push(node);
    }
  }
  // A distant or presently occupied destination may not be reachable in this local search.
  // Keep only a route that makes meaningful progress; never substitute a teleport.
  const reached = !!end;
  if (!end && best.h < first.h - NAV_CELL) end = best;
  if (!end || end === first) return [];
  const route = [];
  for (let at = end; at.parent; at = at.parent) route.push(point(at.x, at.z));
  route.reverse(); if (reached) route.push(goal);
  // String-pull once when planning, not on every walking frame.
  const simple = []; let from = start, index = 0;
  while (index < route.length) {
    // Test the farthest corner first. Testing every successively longer prefix repeatedly
    // resampled the same ground, producing a visible planning hitch on a long village route.
    let far = route.length - 1;
    while (far > index && !clearSegment(from, route[far], world, radius + .015)) far--;
    simple.push(route[far]); from = route[far]; index = far + 1;
  }
  return simple;
}

/**
 * Walk toward a real destination, retaining the route around a wall/crate until its corner is
 * cleared. The old per-frame left/right guesses can oscillate forever at the middle of a house.
 * Local plans are bounded and cached per position object; open-road walking does no planning.
 * Every actual step still goes through moveCharacter, including other people moving into it.
 */
export function stepToward(position, target, maxDistance, world, radius = BODY.person, side = 1) {
  if (!(maxDistance > 0) || !Number.isFinite(maxDistance) || !Number.isFinite(position?.x) || !Number.isFinite(position?.z)
    || !Number.isFinite(target?.x) || !Number.isFinite(target?.z)) return 0;
  const start = { x: position.x, z: position.z }, remaining = Math.hypot(target.x - start.x, target.z - start.z);
  if (remaining < .015) { detours.delete(position); return 0; }
  let state = detours.get(position);
  if (!state || state.world !== world || Math.hypot(position.x - state.last.x, position.z - state.last.z) > Math.max(2, maxDistance * 4)
    || Math.hypot(target.x - state.target.x, target.z - state.target.z) > 4) {
    state = { world, target: { x: target.x, z: target.z }, last: start, route: [], stalled: 0, retry: 0 };
    detours.set(position, state);
  }
  state.retry = Math.max(0, state.retry - maxDistance);
  while (state.route.length && Math.hypot(position.x - state.route[0].x, position.z - state.route[0].z) < .07) state.route.shift();
  const aim = state.route[0] ?? target, distance = Math.hypot(aim.x - position.x, aim.z - position.z);
  const step = Math.min(maxDistance, distance);
  moveCharacter(position, (aim.x - position.x) / distance * step, (aim.z - position.z) / distance * step, world, radius);
  const moved = Math.hypot(position.x - start.x, position.z - start.z);
  const progress = distance - Math.hypot(aim.x - position.x, aim.z - position.z);
  state.stalled = progress < step * .5 ? state.stalled + step : 0;
  if (state.stalled > .2 && state.retry <= 0) {
    state.route = detourRoute(position, target, world, radius, side);
    state.target = { x: target.x, z: target.z }; state.stalled = 0; state.retry = state.route.length ? .3 : 1.5;
  }
  state.last = { x: position.x, z: position.z };
  return moved;
}

/**
 * Turning to face the traveler is a loan, not a gift.
 *
 * Somebody posed against their work faces it because that is where the work is: Old Hewe faces
 * the grave he is digging, Sela kneels at the board with her son's name on it. Turn them to the
 * traveler for a conversation and never turn them back, and they go on working on empty ground.
 *
 * While `talking` they look at `want`, and the way they were facing on the first frame of it is
 * kept. Afterwards they ease back to it, the short way round, and the loan is let go. `lent` is
 * `undefined` whenever nothing is owed.
 */
export function lendFacing({ facing, lent, talking, want, dt, rate = 4 }) {
  if (talking) return { facing: Number.isFinite(want) ? want : facing, lent: lent ?? facing };
  // A frame with no length, or one the timer could not measure, turns nobody. Without this a NaN
  // reaches a rotation and the figure stops being drawn at all.
  if (lent === undefined || !Number.isFinite(dt) || dt <= 0) return { facing, lent };
  const turn = Math.atan2(Math.sin(lent - facing), Math.cos(lent - facing));
  if (Math.abs(turn) < .01) return { facing: lent, lent: undefined };
  return { facing: facing + turn * (1 - Math.exp(-rate * dt)), lent };
}
