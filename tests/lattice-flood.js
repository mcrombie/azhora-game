import { canStand, moveCharacter, waterAt } from '../src/gameplay/movement/game-state.js';
import { colliderOverlapsHeight } from '../src/world/collision/walk-surfaces.js';
import { CLIMBING, isClimbTerrain, canWalkSlope } from '../src/gameplay/movement/climbing.js';
import { TERRAIN_FALL, createTerrainFall, shouldStartTerrainFall } from '../src/gameplay/movement/terrain-fall.js';
import { closedRegionEntered } from '../src/world/travel/closed-border.js';
import { nearestPlain } from '../src/content/regions/east-lotharn/east-lotharn-caves.js';

/**
 * **Where can a traveler get to, and what does it cost him?** - asked of the built world, on a lattice, by
 * the game's own rules.
 *
 * Not a test: the measuring tool `tests/varn-world.test.js` and `tests/lotharn-forts.test.js` share.
 * A flood says where a traveler can get to; `travel`, at the foot of this file, is one traveler sent to see.
 *
 *  - **Standing** is `canStand` itself (src/gameplay/movement/game-state.js), asked of the built world at every lattice
 *    point with a traveler's radius: colliders, water, the world's edge.
 *  - **Walking** is `canWalkSlope`'s rule (src/gameplay/movement/climbing.js) on the lattice's own heights: in a climbing
 *    country a step up is refused when it rises faster than the grab slope or the face under it is steeper
 *    than that; anywhere else there is no limit; and a step down is always allowed. **The face is read twice**:
 *    by the lattice, a step either side of each end, and - where the lattice's reading is over half the grab
 *    slope, so that it matters - by the game, forty centimetres either side of the step's middle, which is the
 *    reading `canWalkSlope` itself takes. The lattice's alone irons a ledge that tilts at a grade of one into
 *    one it walks up (it took a climber along the eastern massif's first ledge that way, on ground the
 *    traveler's own step refuses); a step must pass both.
 *  - **Falling** is what a step down onto ground too steep to stand on becomes (src/gameplay/movement/terrain-fall.js): the
 *    body comes down the face to the first ground that holds it. A fall is never refused - the game does
 *    not refuse it - it is **costed**: what a flood answers, for every point, is the least worst single
 *    fall on any way there (`Infinity` where there is no way at all). `LETHAL_FALL` is the fall that kills
 *    a traveler with a hundred health; a fall's damage stops at a hundred, so a traveler with more lives
 *    through any of them, and "no way whatever he is willing to fall" is a cost of `Infinity`.
 *  - **The caves** are ways the surface does not show: a passage walked into at one mouth is walked out of
 *    at the other (src/content/regions/east-lotharn/east-lotharn-caves.js), so the two mouths are one step apart (`caveLinks`).
 *  - **Climbing**, for a flood asked as a climber's, is the controller's rule (`sampleClimbSurface`): in a
 *    climbing country, on a face no steeper than its limit, clear of colliders, and not on rock the world
 *    marks unclimbable - at either end of the step **or at its quarter points**, because the controller asks at
 *    every twelve centimetres of an attached move and a band of no-hold rock a metre wide (the rim on a ramp's
 *    shoulder) lies between two lattice points. Stamina is not counted, which is the worst case: a climber
 *    who never tires.
 *  - With `midpoints`, a step is refused if a collider stands half-way along it, so that a lattice coarser
 *    than something thin cannot step over it. Without, the flood is the more generous, which is the safe
 *    side for saying that somewhere cannot be reached.
 *  - **Risers** (`risers(x, z)`): ground that stands in steps the lattice cannot see. The rims Varn raises on the
 *    ledges' brinks (src/content/regions/varn/varn-world.js, `lipRib`) are built in treads and risers of half a metre to two metres, and
 *    a lattice a metre apart, reading the face two metres across, irons three of them into a hill it walks up
 *    slantwise - which the traveler's own step does not: `moveCharacter` takes eighteen centimetres at a time and
 *    `canWalkSlope` refuses any of them that rises more than a quarter of a metre. So where `risers` answers more
 *    at the far end of a step than at the near end (by more than that quarter metre), the step is taken as the
 *    traveler takes it: in strides of eighteen centimetres along the lattice's line, every one asked of
 *    `canWalkSlope` itself. **And so is a step off an edge**, wherever `riserReach(x, z)` says the risers are
 *    (everywhere, if it is not given): the rim on a ramp's shoulder is a metre wide and lies between the tread
 *    and the face beyond it, between two lattice points, and a lattice that asks only its two ends steps over
 *    it and falls - which no traveler does. A flood without `risers` is as it always was.
 *  - **The peaks' own ways** (`ways(x, z)`): a ramp cut slantwise up a cliff is four metres wide at a grade a
 *    traveler walks, and the game's own check (`canWalkSlope`) reads the face eighty centimetres across; a
 *    lattice a metre apart reads it two metres across, which on a ramp is the cliff either side, so without
 *    this the lattice refuses what the traveler walks. With `ways`, a step between two points on a way is
 *    walked at the walking grade whatever the lattice makes of the face under it.
 */
const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const RADIUS = .34;
/** `moveCharacter`'s longest stride (src/gameplay/movement/game-state.js), and the most `canWalkSlope` lets one of them rise: its grade and its eight centimetres of roughness. */
const STRIDE = .18, RISER = STRIDE * CLIMBING.grabSlope + .08;
/** The fall a traveler with a hundred health does not walk away from, in metres. */
export const LETHAL_FALL = TERRAIN_FALL.safeDrop + TERRAIN_FALL.maxDamage / TERRAIN_FALL.damagePerMetre;

/** Sample the built world over a box, `step` metres apart; `use(x, z)` says which points are asked at all. */
export function sampleLattice(world, box, step, use = () => true) {
  const W = Math.round((box.maxX - box.minX) / step) + 1, H = Math.round((box.maxZ - box.minZ) / step) + 1;
  const heights = new Float32Array(W * H).fill(NaN), stand = new Uint8Array(W * H), used = new Uint8Array(W * H), climb = new Uint8Array(W * H), slope = new Float32Array(W * H);
  const region = new Array(W * H).fill(null);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const x = box.minX + i * step, z = box.minZ + j * step, k = j * W + i;
    if (!use(x, z)) continue;
    used[k] = 1; heights[k] = world.heightAt(x, z); region[k] = world.regionAt(x, z)?.name ?? null;
    stand[k] = canStand(x, z, world, RADIUS, heights[k]) ? 1 : 0; climb[k] = isClimbTerrain(world, x, z) ? 1 : 0;
  }
  for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) {
    const k = j * W + i; if (!used[k]) continue;
    const at = n => (used[n] ? heights[n] : heights[k]);
    slope[k] = Math.hypot(at(k + 1) - at(k - 1), at(k + W) - at(k - W)) / (2 * step);
  }
  const L = { ...box, step, W, H, heights, stand, used, climb, slope, region };
  L.cell = (x, z) => Math.round((z - box.minZ) / step) * W + Math.round((x - box.minX) / step);
  L.at = k => ({ x: box.minX + (k % W) * step, z: box.minZ + Math.floor(k / W) * step });
  /** The nearest point to (x, z) that can be stood on, within `reach` metres; -1 if there is none. */
  L.near = (x, z, reach = 6) => {
    let best = -1, least = reach + 1e-9;
    for (let dz = -reach; dz <= reach; dz += step) for (let dx = -reach; dx <= reach; dx += step) {
      const px = x + dx, pz = z + dz;
      if (px < box.minX || px > box.maxX || pz < box.minZ || pz > box.maxZ) continue;
      const k = L.cell(px, pz), d = Math.hypot(dx, dz);
      if (stand[k] && d < least) { least = d; best = k; }
    }
    return best;
  };
  return L;
}

/**
 * Whether something solid stands at a point, among the colliders `near` answers with: `canStand`'s own
 * test (src/gameplay/movement/game-state.js), water markers passed over and a collider with a height asked whether it
 * reaches a body standing on the ground there.
 */
function solidAt(near, world, x, z) {
  let feet;
  for (const c of near(x, z)) {
    if (c.kind === 'river-water' || c.kind === 'pond-water') continue;
    if (!(c.r !== undefined ? Math.hypot(x - c.x, z - c.z) < c.r + RADIUS : Math.abs(x - c.x) < c.hx + RADIUS && Math.abs(z - c.z) < c.hz + RADIUS)) continue;
    if ((Number.isFinite(c.minY) || Number.isFinite(c.maxY)) && !colliderOverlapsHeight(c, feet ?? (feet = world.heightAt(x, z)))) continue;
    return true;
  }
  return false;
}

/**
 * The caves as steps: for every passage that goes through (a chimney, a way from one valley to the next),
 * the points a traveler steps into it from at one mouth, joined to the points he steps out onto at the
 * other. The mouth is `createCaveWalk`'s own: within the passage's width of its line, at its opening.
 */
export function caveLinks(L, caves) {
  const links = new Map();
  const mouth = (cave, at, low, high) => {
    const p = cave.at(at), out = new Set();
    for (let dz = -4; dz <= 4; dz += L.step) for (let dx = -4; dx <= 4; dx += L.step) {
      const x = p.x + dx, z = p.z + dz;
      if (x < L.minX || x > L.maxX || z < L.minZ || z > L.maxZ) continue;
      const k = L.cell(x, z), q = L.at(k);
      if (!L.stand[k]) continue;
      const near = nearestPlain(cave.path, q.x, q.z);
      if (near.distance <= cave.half(near.along) - RADIUS && near.along >= low && near.along <= high) out.add(k);
    }
    return [...out];
  };
  const join = (from, to) => { for (const k of from) links.set(k, [...(links.get(k) ?? []), ...to]); };
  for (const cave of caves) {
    if (cave.kind === 'chamber') continue;
    const [open, close] = cave.openings, a = mouth(cave, open, open - 1.3, open + .8), b = mouth(cave, close, close - .8, close + 1.3);
    join(a, b); join(b, a);
  }
  return links;
}

/**
 * Flood a sampled lattice from `seeds` (points, or lattice indices). Options:
 *  - `open`: a predicate on a collider; colliders it answers true for are not there. Opening a gate is
 *    `shutGate`, or a narrower predicate for one gate: the same world, less the colliders that shut it.
 *  - `climber`: flood as a climber as well as a walker; `forbidden(x, z)` is rock that gives no hold.
 *  - `within(x, z)`: ground the flood may use; nothing outside it is entered.
 *  - `links`: steps the surface does not show (`caveLinks`).
 *  - `midpoints`: refuse a step with something solid half-way along it.
 * Returns, for every lattice point, the least worst single fall on any way to it from the seeds, in
 * metres: 0 where it is walked to, `Infinity` where there is no way.
 */
export function leastFall(L, world, seeds, { open = null, climber = false, forbidden = () => false, within = null, links = null, midpoints = false, ways = null, risers = null, riserReach = null } = {}) {
  const { W, H, heights, stand, used, climb, slope, step } = L;
  const onWay = ways ? (L.onWay ??= (() => { const out = new Uint8Array(W * H); for (let k = 0; k < out.length; k++) if (used[k]) { const p = L.at(k); if (ways(p.x, p.z)) out[k] = 1; } return out; })()) : null;
  const near = (x, z) => { const got = world.nearColliders(x, z, RADIUS); return open ? got.filter(c => !open(c)) : got; };
  // A point `canStand` refused may be standable with a gate open: ask again of the colliders that are left.
  const opened = open ? new Int8Array(W * H) : null;
  const ok = k => {
    if (!used[k]) return false;
    if (within) { const p = L.at(k); if (!within(p.x, p.z)) return false; }
    if (stand[k]) return true;
    if (!open) return false;
    if (!opened[k]) { const p = L.at(k); opened[k] = !solidAt(near, world, p.x, p.z) && heights[k] >= waterAt(p.x, p.z, world) ? 1 : -1; }
    return opened[k] > 0;
  };
  const banned = climber ? k => { const p = L.at(k); return forbidden(p.x, p.z); } : null;
  /** No hold somewhere along a hand's move from one point to the next: the quarter points, as the controller's own steps would find it. */
  const barredHand = (k, n) => {
    const a = L.at(k), b = L.at(n);
    for (const t of [.25, .5, .75]) if (forbidden(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return true;
    return false;
  };
  /** The face half-way along a step, read as `canWalkSlope` reads it: forty centimetres either side, on the ground itself. Kept with the lattice. */
  const faces = L.faces ??= new Map();
  const face = (k, n) => {
    const key = k < n ? k * W * H + n : n * W * H + k;
    let s = faces.get(key);
    if (s === undefined) { const a = L.at(k), b = L.at(n), x = (a.x + b.x) / 2, z = (a.z + b.z) / 2, e = .4; s = Math.hypot((world.heightAt(x + e, z) - world.heightAt(x - e, z)) / (2 * e), (world.heightAt(x, z + e) - world.heightAt(x, z - e)) / (2 * e)); faces.set(key, s); }
    return s;
  };
  // The traveler's own step up onto a riser (the header, **Risers**): how much of the ground at a point is riser, and
  // whether the game's own strides take a lattice step. Both are the ground's own business, kept with the lattice.
  const raised = risers ? (L.raised ??= new Float32Array(W * H).fill(NaN)) : null, strides = risers ? (L.strides ??= new Map()) : null;
  const reach = risers && riserReach ? (L.reach ??= new Int8Array(W * H)) : null;
  const guarded = k => { if (!reach) return true; if (!reach[k]) { const p = L.at(k); reach[k] = riserReach(p.x, p.z) ? 1 : -1; } return reach[k] > 0; };
  const riser = k => { if (Number.isNaN(raised[k])) { const p = L.at(k); raised[k] = risers(p.x, p.z); } return raised[k]; };
  const strode = (k, n) => {
    const key = k * W * H + n;
    let took = strides.get(key);
    if (took === undefined) {
      const a = L.at(k), b = L.at(n), pieces = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / STRIDE);
      took = true;
      for (let i = 0; i < pieces && took; i++) took = canWalkSlope(a.x + (b.x - a.x) * i / pieces, a.z + (b.z - a.z) * i / pieces, a.x + (b.x - a.x) * (i + 1) / pieces, a.z + (b.z - a.z) * (i + 1) / pieces, world);
      strides.set(key, took);
    }
    return took;
  };
  // Where a falling body comes to rest is judged as the game judges it (src/gameplay/movement/terrain-fall.js): on the ground's own slope
  // read forty centimetres either side of the foot, not the lattice's, which reads it a step either side and so
  // smooths a ridge a metre wide into a shelf a body could stand on.
  // (The same reading decides whether a step down onto a cell is a step or the start of a fall: src/main.js asks
  // `shouldStartTerrainFall` of the surface under the foot, read the same way.)
  const resting = L.resting ??= new Int8Array(W * H);
  const holds = k => {
    if (!resting[k]) { const p = L.at(k), s = .4, gx = (world.heightAt(p.x + s, p.z) - world.heightAt(p.x - s, p.z)) / (2 * s), gz = (world.heightAt(p.x, p.z + s) - world.heightAt(p.x, p.z - s)) / (2 * s); resting[k] = Math.hypot(gx, gz) <= CLIMBING.grabSlope ? 1 : -1; }
    return resting[k] > 0;
  };
  // The least worst fall, by levels of a tenth of a metre, taken in order: a bottleneck Dijkstra.
  const cost = new Float32Array(W * H).fill(Infinity), levels = new Map();
  const push = (k, c) => { const level = Math.round(c * 10); let bucket = levels.get(level); if (!bucket) levels.set(level, bucket = { list: [], head: 0 }); bucket.list.push(k); };
  for (const s of seeds) { const k = typeof s === 'number' ? s : L.cell(s.x, s.z); if (k >= 0 && ok(k) && cost[k] > 0) { cost[k] = 0; push(k, 0); } }
  let level = 0;
  for (;;) {
    const bucket = levels.get(level);
    if (!bucket || bucket.head >= bucket.list.length) {
      levels.delete(level);
      let next = Infinity; for (const key of levels.keys()) if (key > level && key < next) next = key;
      if (next === Infinity) break;
      level = next; continue;
    }
    const k = bucket.list[bucket.head++];
    if (Math.round(cost[k] * 10) !== level) continue;
    const i = k % W, j = (k - i) / W, here = heights[k];
    for (const n of links?.get(k) ?? []) if (ok(n) && cost[k] < cost[n]) { cost[n] = cost[k]; push(n, cost[k]); }
    for (const [a, b] of N8) {
      const ii = i + a, jj = j + b; if (ii < 1 || jj < 1 || ii >= W - 1 || jj >= H - 1) continue;
      let n = jj * W + ii;
      if (!ok(n)) continue;
      if (midpoints && solidAt(near, world, L.minX + (i + a / 2) * step, L.minZ + (j + b / 2) * step)) continue;
      const run = Math.hypot(a, b) * step, rise = heights[n] - here;
      // A diagonal step is a step through one of its two corner cells, as a body a step wide must take it: a rim a cell thick
      // that runs slantwise is not stepped through where two of its stones touch at a corner.
      if (a && b) {
        const wall = m => !ok(m) || heights[m] > here + step * CLIMBING.grabSlope + .08;
        if (wall(j * W + ii) && wall(jj * W + i)) continue;
      }
      const hand = climber && climb[k] && climb[n] && slope[k] <= CLIMBING.maxSlope && slope[n] <= CLIMBING.maxSlope && !banned(k) && !banned(n) && !barredHand(k, n);
      // A riser between the two points stops a foot whichever of them is the higher: a ledge that slopes to its edge
      // brings the far side of its rim's first tread level with the near side of it.
      const barred = risers !== null && riser(n) > riser(k) + RISER && !strode(k, n);
      let fall = 0;
      if (rise > 1e-6) {
        const grade = rise <= run * CLIMBING.grabSlope + .08;
        const lattice = (slope[k] + slope[n]) / 2;
        const walk = !barred && (!(climb[k] || climb[n]) || (grade && lattice <= CLIMBING.grabSlope && (lattice <= CLIMBING.grabSlope / 2 || face(k, n) <= CLIMBING.grabSlope)) || (onWay && grade && onWay[k] && onWay[n]));
        if (!walk && !hand) continue;
      } else if (barred && !hand) continue;
      else if (-rise > TERRAIN_FALL.stepDown && (-rise / run > CLIMBING.grabSlope || !holds(n)) && !hand) {
        // He has stepped off - if his own strides take him off (the header, **Risers**): down the face to the first ground that holds him.
        if (risers !== null && climb[k] && guarded(k) && !strode(k, n)) continue;
        let land = n;
        for (let guard = 0; guard < 4000 && !holds(land); guard++) {
          const li = land % W, lj = (land - li) / W;
          let best = -1, low = heights[land];
          for (const [c, d] of N8) {
            if (li + c < 1 || lj + d < 1 || li + c >= W - 1 || lj + d >= H - 1) continue;
            const m = (lj + d) * W + li + c;
            if (!ok(m) || heights[m] >= low) continue;
            // A sliding body is a step wide too: it does not pass between two stones of a rim that touch at a corner.
            if (c && d && heights[lj * W + li + c] > heights[land] + .5 && heights[(lj + d) * W + li] > heights[land] + .5) continue;
            low = heights[m]; best = m;
          }
          if (best < 0) break;
          land = best;
        }
        fall = here - heights[land]; n = land;
      }
      const c = Math.max(cost[k], fall);
      if (c >= cost[n]) continue;
      cost[n] = c; push(n, c);
    }
  }
  return cost;
}

/** How much ground of each country a flood reached at no worse than `maxFall`, in square metres. */
export function reachedByCountry(L, cost, maxFall = LETHAL_FALL, where = () => true) {
  const out = {};
  for (let k = 0; k < cost.length; k++) {
    if (!(cost[k] < maxFall)) continue;
    const p = L.at(k);
    if (!where(p.x, p.z, k)) continue;
    const name = L.region[k] ?? 'Open country';
    out[name] = (out[name] ?? 0) + L.step * L.step;
  }
  return out;
}
/** The colliders that shut a gate: what "open the gates" takes away. */
export const shutGate = c => typeof c.kind === 'string' && c.kind.endsWith('gate-shut');

/**
 * **One traveler, moved as src/main.js moves him.** His step is `moveCharacter` with `canWalkSlope` and the
 * closed-place rule; after every frame `shouldStartTerrainFall` is asked of the ground under his foot, read as
 * the host reads it; and a fall, once begun, is run by `createTerrainFall` with the stick still held - its drift
 * off the edge, its slide down a face, its landing, and what it costs.
 *
 * He sets out from (`x`, `z`) on a `heading` (radians; 0 looks along +z) at `speed` metres a second and keeps the
 * stick forward for `seconds`. Answers where he ended, every fall he took, the worst of them in metres, and the
 * health they cost in all. A flood is a lattice's opinion of the ground; this is the game's.
 */
export function travel(world, { x, z, heading, speed = 6, seconds = 10, dt = 1 / 60 }) {
  const at = { x, y: world.heightAt(x, z), z }, dir = { x: Math.sin(heading), z: Math.cos(heading) };
  const surfaceAt = (px, pz) => {
    const s = .4, gx = (world.heightAt(px + s, pz) - world.heightAt(px - s, pz)) / (2 * s), gz = (world.heightAt(px, pz + s) - world.heightAt(px, pz - s)) / (2 * s), slope = Math.hypot(gx, gz);
    return { height: world.heightAt(px, pz), slope, gradient: { x: slope > 1e-7 ? gx / slope : 0, z: slope > 1e-7 ? gz / slope : 0 }, water: false };
  };
  const step = (px, pz, nx, nz) => canWalkSlope(px, pz, nx, nz, world) && !closedRegionEntered({ x: px, z: pz }, { x: nx, z: nz });
  const falling = (p, dx, dz) => moveCharacter(p, dx, dz, world, RADIUS, { swimming: true, canTraverse: (px, pz, nx, nz) => world.heightAt(nx, nz) <= p.y + .35 && !closedRegionEntered({ x: px, z: pz }, { x: nx, z: nz }) });
  const fall = createTerrainFall(), falls = [];
  let worst = 0, damage = 0;
  for (let t = 0; t < seconds; t += dt) {
    if (!fall.active) {
      const before = { x: at.x, y: at.y, z: at.z };
      moveCharacter(at, dir.x * speed * dt, dir.z * speed * dt, world, RADIUS, { swimming: true, canTraverse: step });
      const surface = surfaceAt(at.x, at.z);
      if (shouldStartTerrainFall({ before, after: at, floor: surface.height, groundSlope: surface.slope })) { fall.begin(at, { drift: { x: (at.x - before.x) / dt, z: (at.z - before.z) / dt } }); falls.push({ from: before }); }
      else at.y = surface.height;
    }
    if (fall.active) {
      const state = fall.tick(dt, { position: at, surfaceAt, steer: dir, moveHorizontal: falling });
      if (state.landed) { const drop = state.peak - at.y; Object.assign(falls.at(-1), { to: { x: at.x, y: at.y, z: at.z }, drop, damage: state.damage }); worst = Math.max(worst, drop); damage += state.damage; }
    }
  }
  return { at, falls, worst, damage, falling: fall.active };
}
