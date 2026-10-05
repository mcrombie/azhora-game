import * as THREE from 'three';
import { finishBuild } from './build-steps.js';
import { registerWorldTree, worldTreeId } from './tree-registry.js';
import { REGION_CELLS, hexAt, regionAtWithout } from './region-world.js';
import { WATERLINE } from './game-state.js';
import { westWaterSurface } from './west-ground.js';
import { ibenwoodTreeSpecies } from './ibenwood-environment.js';
import { IBENWOOD_RIVERS } from './ibenwood-rivers.js';
import { ALEZHOR, ALEZHOR_ARRIVAL, ALEZHOR_LANDMARKS, ALEZHOR_TRAILS, ALEZHOR_APPROVED_WITHOUT, alezhorScatterOwns } from './alezhor-world.js';
// The ground's own design, read where it is offered and never required: its water, the river-mouth flats it keeps,
// and whatever account of its cover it gives (`alezhorCover`).
import * as GROUND from './alezhor-world.js';
import { alezhorWildlifeClear } from './alezhor-wildlife.js';

/**
 * **Alezhor's natural cover: a cool summer-dry coastal strip between the open ocean and the Ibenwood's tree line.**
 * Natural things only - nothing here is anybody's: no field, hedge, orchard, garden, track, panning bar or quay is
 * drawn, and no stock. The gold is in the gravel and is not drawn either; the gravel is.
 *
 * What the lore gives (`world-builder/azhora_lore/geography/regions/alezhor.md`): "a coastal plain that is narrow in
 * the south - where the forest presses close to the cliffs - and widens slightly in the center where the largest
 * rivers emerge from the forest hills and deposit their loads of gravel and sediment into broad estuaries before
 * entering the sea"; "the forest begins where the coastal plain ends"; "the light changes within twenty feet of the
 * tree line"; the climate "Mediterranean, cooler than Dinova's - the summers are warm and dry, the winters mild and
 * moderately wet", cooling northward until "the grey wet season is beginning to assert itself". The atlas adds that
 * every one of its twenty-five hexes is **Csb** - the cool-summer Mediterranean - thirteen of them grassland and twelve
 * plains, and that it meets the built Ibenwood along two borders. So, drawn by its species because the game has no
 * seasons:
 *
 *  - **the open strip** is coastal grassland - tall bunch grass going gold, with poppy, lupin, yarrow and yellow
 *    composites in it - on the grassland hexes, and a shorter, tawnier sward on the plains hexes; greener and more
 *    northern (more lupin and yarrow, less poppy) toward the West Ibenwood, drier and more southern toward the Ganesh;
 *  - **the rough ground** - a knuckle of ground, a steep face - carries the Atlantic coast's scrub: gorse, broom and
 *    heather;
 *  - **local woodland, not forest**, in the folds of the ground: white oak, sweet chestnut and hazel in the cool
 *    north-west, holm oak and stone pine taking over toward the warm south-east, hawthorn through both, with bracken
 *    and bramble under them; and now and then a lone oak or thorn out on the grass;
 *  - **the tree line's edge** (`edge`), the habitat the fauna overview says "is a distinct habitat rather than merely a
 *    transition": a mantle a few dozen metres deep of young trees **of the built forest's own species at that point of
 *    the line** - alder, willow, bald cypress and sycamore against the South Ibenwood, beech, white oak, chestnut and
 *    walnut against the West (read from the forest's own table, `ibenwoodTreeSpecies`, so the two cannot disagree) -
 *    with hazel and hawthorn, bramble, bracken and foxglove in the shade of it;
 *  - **the rivers**: washed gravel at the water's edge - the gravel the gold is in - then reed and rush, then a fringe
 *    of alder, willow, white poplar and plane; tamarisk where the river meets the salt;
 *  - **the estuaries**: reedbed and salt-marsh rush with sea-lavender on the low ground where a river meets the sea;
 *  - **the shore**: sand at the waterline with the odd bleached log, marram and sea holly on the dunes behind it and
 *    stone pine at their back; on the cliffs where the forest presses close, rock, thrift, sea turf, heather and
 *    wind-cut juniper.
 *
 * **What decides what grows is read off the ground at build time, never written down**, because the ground
 * (`src/alezhor-world.js`) is shaped by another hand at the same time as this is written. Not one height here is a
 * number: the strip is sampled every four metres when it is built (`readAlezhorGround`) and each point is given one
 * word (`habitat`) from what is measured there - how far it is from the sea, from fresh water and from the tree line,
 * how much sea is round it, its slope and the way it faces, whether it is a knuckle of ground or a fold against the
 * ground round it, and its hex's terrain on the atlas - and from the ground module's own design wherever it offers
 * one. Everything repeated is instanced, the grass in tiles small enough to cull; trees are typed and harvestable
 * (`registerWorldTree`). Nothing that blocks a walker stands on a trail, at a landmark, at the arrival, on a place the
 * ground keeps for something to be built later (the river-mouth flats), or inside the range of anything that lives
 * on the ground (`alezhorWildlifeClear`), so no animal giving ground backs into a corner.
 */
const freeze = Object.freeze;
const TAU = Math.PI * 2;
const SEED = 6417311;
/**
 * How much a build step may ask of the ground before it pauses, in heights asked (a survey node is four: a height, an
 * owner, its water and its hex). Twenty heights is about a millisecond of the game's ground; the renderer runs as many
 * steps in a frame as its budget allows, so short steps cost nothing but the pause itself.
 */
const STEP_COST = 20;
const smooth = (a, b, x) => { const v = Math.max(0, Math.min(1, (x - a) / (b - a))); return v * v * (3 - 2 * v); };
const clamp01 = v => Math.max(0, Math.min(1, v));
const segmentDistance = (x, z, a, b) => {
  const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
};

export const ALEZHOR_CELLS = freeze(REGION_CELLS[ALEZHOR] ?? []);
const cellKey = (q, r) => `${q},${r}`;
const CELL_BY_KEY = new Map(ALEZHOR_CELLS.map(cell => [cellKey(cell.q, cell.r), cell]));
/** The Alezhor hex a point is on, or the nearest one to it (for the shore that runs past the atlas's grid). */
export function alezhorCellAt(x, z) {
  const { q, r } = hexAt(x, z), own = CELL_BY_KEY.get(cellKey(q, r));
  if (own) return own;
  let best = null, nearest = Infinity;
  for (const cell of ALEZHOR_CELLS) { const d = Math.hypot(cell.x - x, cell.z - z); if (d < nearest) { nearest = d; best = cell; } }
  return best;
}
/** The tree line: the two built Ibenwoods that Alezhor meets. Whatever stands over the line is the forest's. */
export const ALEZHOR_FOREST = freeze(['South Ibenwood', 'West Ibenwood']);
/**
 * **"Cooling northward."** 0 on Alezhor's southernmost row (row 119, against the Ganesh Desert) and 1 on its northernmost
 * (row 115, under the West Ibenwood): the lore's gradient from the warm south, where Dinova's summer still reaches, to
 * "the grey wet season beginning to assert itself" in the north.
 */
const ROWS_Z = ALEZHOR_CELLS.length ? [Math.max(...ALEZHOR_CELLS.map(c => c.z)), Math.min(...ALEZHOR_CELLS.map(c => c.z))] : [1, 0];
export function alezhorNorth(z) { return clamp01((ROWS_Z[0] - z) / ((ROWS_Z[0] - ROWS_Z[1]) || 1)); }

// ---------------------------------------------------------------------------
// What must be kept clear
// ---------------------------------------------------------------------------
const TRAIL_SEGMENTS = ALEZHOR_TRAILS.flatMap(trail => trail.points.slice(1).map((b, i) => {
  const a = trail.points[i], half = (trail.width ?? 3) / 2;
  return freeze({ a, b, half, minX: Math.min(a.x, b.x) - half, maxX: Math.max(a.x, b.x) + half, minZ: Math.min(a.z, b.z) - half, maxZ: Math.max(a.z, b.z) + half });
}));
/** How far a point is from the nearest trail's edge (negative on it), or Infinity. */
export function alezhorTrailDistance(x, z) {
  let best = Infinity;
  for (const s of TRAIL_SEGMENTS) {
    // A segment whose box is further off than the best so far cannot be nearer.
    const out = Math.max(s.minX - x, x - s.maxX, s.minZ - z, z - s.maxZ, 0);
    if (out - s.half >= best) continue;
    best = Math.min(best, segmentDistance(x, z, s.a, s.b) - s.half);
  }
  return best;
}
/**
 * **The places the ground keeps for something to be built later**: the river-mouth flats where the cities stand (the
 * brief: "at least the gold river's estuary and one other mouth - shaping the ground, building nothing"). They are the
 * ground module's to name and place; this reads whatever it exports as a reserved place - a list of
 * `{ x, z, radius }` circles or `{ x, z, halfX, halfZ, yaw? }` boxes, or `{ points }` polygons - and keeps them in
 * grass and flowers and nothing else: no shrub, stone or tree.
 */
function reservedPlaces() {
  const out = [];
  const take = entry => {
    if (!entry || typeof entry !== 'object') return;
    if (Array.isArray(entry.points) && entry.points.length >= 3) { out.push({ polygon: entry.points.map(p => ({ x: p.x, z: p.z })) }); return; }
    if (!Number.isFinite(entry.x) || !Number.isFinite(entry.z)) return;
    // A kept place's edge may wander off its box by a metre or two (`wander`): the box is taken that much wider.
    const wander = Number.isFinite(entry.wander) ? entry.wander : 0;
    if (Number.isFinite(entry.radius ?? entry.r)) out.push({ x: entry.x, z: entry.z, radius: (entry.radius ?? entry.r) + wander });
    else if (Number.isFinite(entry.halfX) && Number.isFinite(entry.halfZ)) out.push({ x: entry.x, z: entry.z, halfX: entry.halfX + wander, halfZ: entry.halfZ + wander, yaw: entry.yaw ?? 0 });
  };
  // The ground's own reserved list where it gives one; its kept places or flats where it does not.
  for (const list of GROUND.ALEZHOR_RESERVED ? [GROUND.ALEZHOR_RESERVED] : [GROUND.ALEZHOR_FLATS, GROUND.ALEZHOR_KEPT]) {
    if (Array.isArray(list)) list.forEach(take);
    else if (list && typeof list === 'object') Object.values(list).forEach(value => Array.isArray(value) ? value.forEach(take) : take(value));
  }
  return out;
}
const RESERVED = reservedPlaces();
const inside = (polygon, x, z) => {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) hit = !hit;
  }
  return hit;
};
/** Inside a reserved place, `margin` metres out. */
export function alezhorReserved(x, z, margin = 0) {
  for (const place of RESERVED) {
    if (place.polygon) {
      if (inside(place.polygon, x, z)) return true;
      if (margin > 0) for (let i = 0; i < place.polygon.length; i++)
        if (segmentDistance(x, z, place.polygon[i], place.polygon[(i + 1) % place.polygon.length]) < margin) return true;
      continue;
    }
    if (place.radius !== undefined) { if (Math.hypot(x - place.x, z - place.z) < place.radius + margin) return true; continue; }
    const c = Math.cos(place.yaw), s = Math.sin(place.yaw), dx = x - place.x, dz = z - place.z;
    const a = dx * c - dz * s, b = dx * s + dz * c;
    if (Math.abs(a) < place.halfX + margin && Math.abs(b) < place.halfZ + margin) return true;
  }
  return false;
}
const LANDMARK_POINTS = [...ALEZHOR_LANDMARKS, ALEZHOR_ARRIVAL].filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.z));
/**
 * Where no shrub grows, blocking or not: a trail and a metre and a half either side of it, five metres round a
 * landmark's point or the arrival, and a reserved place. `margin` is the thing's reach.
 */
export function alezhorPathClear(x, z, margin = 0) {
  for (const p of LANDMARK_POINTS) if (Math.hypot(x - p.x, z - p.z) < 5 + margin) return true;
  if (alezhorTrailDistance(x, z) < 1.4 + margin) return true;
  return alezhorReserved(x, z, margin);
}
/**
 * Where nothing that blocks a walker may stand: all of the above, and any ground animal's range as well. Gorse under
 * the shoulder, heather, bracken and bramble stop nobody, so they grow among the animals; a trunk, a boulder or a
 * head-high bush is a corner for an animal giving ground, so none stands in a range.
 */
export function alezhorSceneryClear(x, z, margin = 0) {
  return alezhorPathClear(x, z, margin) || alezhorWildlifeClear(x, z, margin);
}

// ---------------------------------------------------------------------------
// Water
// ---------------------------------------------------------------------------
/**
 * Fresh water over the ground here, if any: Alezhor's own rivers as the ground module lays them (whatever it calls
 * its water function), or a western river's own surface (`westWaterSurface`: the Alezhor Water on the Navarth and
 * Ganesh line). Null on dry ground and on the open sea.
 */
const NAMED_WATER = ['alezhorWaterSurface', 'alezhorWaterAt', 'alezhorRiverSurface', 'alezhorWater']
  .map(name => GROUND[name]).find(fn => typeof fn === 'function') ?? null;
/**
 * Without a water function, the ground's own reaches are read directly: every export that builds a reach of stations
 * (`goldReach`, `westStream`, and any other `...Reach` or `...Stream`) - each station's place, half-width and water
 * level - and a point within a station's half-width of the line is under that station's water. The estuary's water is
 * the sea's, and is the sea.
 */
const REACHES = Object.entries(GROUND).filter(([name, fn]) => /(Reach|Stream)$/.test(name) && typeof fn === 'function').map(([, fn]) => fn);
let reaches = null, reachCache = null;
/** The ground's reaches, built the first time they are asked for (by the ground itself, long before this, in the game). */
function reachList() {
  return (reaches ??= REACHES.map(fn => { try { return fn(); } catch { return null; } })
    .filter(reach => Array.isArray(reach?.samples) && reach.samples.length > 1));
}
function reachWater(x, z) {
  if (!REACHES.length) return null;
  if (!reachCache) {
    reachCache = reachList().map(reach => {
      const s = reach.samples.filter(p => !p.estuary);
      const pad = Math.max(...s.map(p => p.half ?? 0)) + 1;
      return { s, minX: Math.min(...s.map(p => p.x)) - pad, maxX: Math.max(...s.map(p => p.x)) + pad, minZ: Math.min(...s.map(p => p.z)) - pad, maxZ: Math.max(...s.map(p => p.z)) + pad };
    }).filter(reach => reach.s.length > 1);
  }
  for (const reach of reachCache) {
    if (x < reach.minX || x > reach.maxX || z < reach.minZ || z > reach.maxZ) continue;
    let best = null, near = Infinity;
    for (let i = 1; i < reach.s.length; i++) {
      const a = reach.s[i - 1], b = reach.s[i], d = segmentDistance(x, z, a, b);
      if (d < near) { near = d; best = a; }
    }
    if (best && near < (best.half ?? 0) && Number.isFinite(best.surface)) return best.surface;
  }
  return null;
}
const OWN_WATER = NAMED_WATER ?? (REACHES.length ? reachWater : null);
// (A named water function, where the ground offers one, is the authority on where its water is; the reaches are still
// what its water is drawn on.)
/**
 * **The Ibenwood's own water on this side of the line.** The South Ibenwood's river runs its last edge along the
 * Alezhor border and the West Ibenwood's stream comes down to it, and their ribbons (`src/ibenwood-rivers.js`) lie a
 * few metres onto Alezhor's ground. The world carries their surface (`world.waterAt`) and the scenery is not handed
 * it, so where they are is read off the courses themselves: within the channel's half-width of a course is water. The
 * half-widths are the courses' own (`small` 1.7 m, `medium` 3.4 m, from the atlas's edge sizes), a hand wider.
 */
const IBENWOOD_WATER = (() => {
  const box = ALEZHOR_CELLS.length ? { minX: Math.min(...ALEZHOR_CELLS.map(c => c.x)) - 90, maxX: Math.max(...ALEZHOR_CELLS.map(c => c.x)) + 90,
    minZ: Math.min(...ALEZHOR_CELLS.map(c => c.z)) - 100, maxZ: Math.max(...ALEZHOR_CELLS.map(c => c.z)) + 100 } : null;
  if (!box) return [];
  return IBENWOOD_RIVERS.flatMap(course => {
    const half = course.edges.some(edge => edge.size === 'medium' && edge.regions.includes(ALEZHOR)) ? 3.4
      : course.edges.some(edge => edge.size === 'large') ? 5.5 : course.edges.some(edge => edge.size === 'medium') ? 3.4 : 1.7;
    return course.points.slice(1).map((b, i) => ({ a: course.points[i], b, half: half + .3 }))
      .filter(s => Math.max(s.a.x, s.b.x) > box.minX && Math.min(s.a.x, s.b.x) < box.maxX && Math.max(s.a.z, s.b.z) > box.minZ && Math.min(s.a.z, s.b.z) < box.maxZ);
  });
})();
const ibenwoodChannel = (x, z) => IBENWOOD_WATER.some(s => Math.abs(x - s.a.x) < 40 && Math.abs(z - s.a.z) < 40 && segmentDistance(x, z, s.a, s.b) < s.half);
export function alezhorFreshWater(x, z, ground) {
  const own = OWN_WATER ? OWN_WATER(x, z) : null;
  if (Number.isFinite(own) && own > ground + .02) return own;
  const west = westWaterSurface(x, z);
  if (west !== null && west > ground + .02) return west;
  // The Ibenwood's ribbon: its level is the world's to know; here it is enough that the water is over the ground.
  return ibenwoodChannel(x, z) ? ground + .5 : null;
}
/** Water over the ground here, if any: fresh water's own surface, or the sea's (the world's waterline). */
export function alezhorWaterAt(x, z, ground) {
  const fresh = alezhorFreshWater(x, z, ground);
  if (fresh !== null) return fresh;
  return ground < WATERLINE ? WATERLINE : null;
}

// ---------------------------------------------------------------------------
// The ground, read at build time
// ---------------------------------------------------------------------------
/**
 * The words a point can be, and the measurements that decide them. Lengths in metres. `swell` is height against the
 * mean of the 56 metres round it and `fold` against the 150 round it (positive on a knuckle, negative in a hollow);
 * `exposure` is the share of the sea in the 160 metres round a point. `edge` is how deep the tree line's own habitat
 * runs out from the line; the lore's "within twenty feet" is the shade of it, and the mantle of young trees, bramble
 * and bracken that a forest throws out onto open ground is deeper than that.
 */
// Distances are measured node to node on a four-metre grid, so the first ring of dry nodes round the water is four to
// five and a half metres from the nearest wet one: that ring is the bar.
export const ALEZHOR_HABITAT = freeze({
  strandReach: 12, strandTop: 2.4, strandSlope: .3, cliffReach: 26, cliffSlope: .75,
  clifftopReach: 36, clifftopSea: 80, clifftopRise: 3, duneReach: 30, duneFringe: 9, duneLift: .12, duneTop: 5, duneSlope: .55, foldCut: .55,
  kept: .5, riverReach: 16,
  barReach: 5.7, bankReach: 12, bankSlope: .55, marshSea: 90, marshRiver: 40, marshTop: 1.5, marshSlope: .1,
  edge: 26, foldShare: .1, foldDepth: .6, foldSlope: .55, foldExposure: .3, scrubSlope: .45, knollShare: .08, knoll: .6,
});
export const ALEZHOR_HABITATS = freeze(['sea', 'river', 'flat', 'strand', 'cliff', 'bar', 'marsh', 'bank', 'dune', 'clifftop',
  'edge', 'fold', 'scrub', 'knoll', 'grassland', 'plain']);
const SEA = 1, RIVER = 2, OWN = 3, WOOD = 4, LAND = 5;
const AXIAL = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];

/**
 * Alezhor's ground, sampled every `STEP` metres at build time over its own hexes and the ring of hexes round them:
 * height, whose it is, whether the sea or fresh water is over it, how far it is from the sea, from fresh water and
 * from the tree line (and which Ibenwood that is), the swell at two scales, the slope and the way it faces, and how
 * much sea is round it. `sample(x, z)` answers the nearest node; `habitat(x, z)` turns that into one word. `charge(n)`
 * is told what a question the builder did not ask itself has cost, in heights, so its steps stay short.
 */
export function* readAlezhorGround(heightAt, charge = () => {}) {
  const STEP = 4, PAD = 72, LOCAL = 7, BROAD = 19, WIDE = 20;
  const cells = ALEZHOR_CELLS;
  const minX = Math.min(...cells.map(c => c.x)) - 50 - PAD, maxX = Math.max(...cells.map(c => c.x)) + 50 + PAD;
  const minZ = Math.min(...cells.map(c => c.z)) - 58 - PAD, maxZ = Math.max(...cells.map(c => c.z)) + 58 + PAD;
  const nx = Math.ceil((maxX - minX) / STEP) + 1, nz = Math.ceil((maxZ - minZ) / STEP) + 1, n = nx * nz;
  // Only this country's hexes and the ring round them are read: the rest of the box is somebody else's and far off.
  const near = new Set();
  for (const c of cells) { near.add(cellKey(c.q, c.r)); for (const [dq, dr] of AXIAL) near.add(cellKey(c.q + dq, c.r + dr)); }
  const height = new Float32Array(n), level = new Float32Array(n), kind = new Uint8Array(n), forest = new Int8Array(n).fill(-1);
  const sea = new Float32Array(n).fill(1e6), fresh = new Float32Array(n).fill(1e6), wood = new Float32Array(n).fill(1e6);
  const cellIndex = new Int8Array(n).fill(-1), cellList = [...cells];
  let cost = 0, top = -Infinity;
  yield;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    if (cost >= 4 * STEP_COST) { cost = 0; yield; }
    const x = minX + i * STEP, z = minZ + j * STEP, k = j * nx + i, { q, r } = hexAt(x, z);
    if (!near.has(cellKey(q, r))) { cost += .05; continue; }
    cost += 4;
    const h = heightAt(x, z), owner = regionAtWithout(x, z, ALEZHOR_APPROVED_WITHOUT)?.name, water = alezhorFreshWater(x, z, h);
    height[k] = h; cellIndex[k] = cellList.indexOf(alezhorCellAt(x, z));
    if (water !== null) { kind[k] = RIVER; level[k] = water; fresh[k] = 0; continue; }
    if (h < WATERLINE) { kind[k] = SEA; level[k] = WATERLINE; sea[k] = 0; continue; }
    level[k] = h;
    if (owner === ALEZHOR) { kind[k] = OWN; top = Math.max(top, h); }
    else if (ALEZHOR_FOREST.includes(owner)) { kind[k] = WOOD; wood[k] = 0; forest[k] = ALEZHOR_FOREST.indexOf(owner); }
    else kind[k] = LAND;
  }
  // Distances, in metres: a two-pass chamfer over the grid for each of the sea, fresh water and the tree line. The
  // tree line's carries which of the two Ibenwoods is nearest along with it.
  const D = STEP, DD = STEP * Math.SQRT2;
  const chamfer = function* (field, label = null) {
    const relax = (k, from, add) => { if (field[from] + add < field[k]) { field[k] = field[from] + add; if (label) label[k] = label[from]; } };
    for (let j = 0; j < nz; j++) { if (j % 6 === 0) yield; for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      if (i) relax(k, k - 1, D);
      if (j) { relax(k, k - nx, D); if (i) relax(k, k - nx - 1, DD); if (i < nx - 1) relax(k, k - nx + 1, DD); }
    } }
    for (let j = nz - 1; j >= 0; j--) { if (j % 6 === 0) yield; for (let i = nx - 1; i >= 0; i--) {
      const k = j * nx + i;
      if (i < nx - 1) relax(k, k + 1, D);
      if (j < nz - 1) { relax(k, k + nx, D); if (i < nx - 1) relax(k, k + nx + 1, DD); if (i) relax(k, k + nx - 1, DD); }
    } }
  };
  yield* chamfer(sea); yield* chamfer(fresh); yield* chamfer(wood, forest);
  // The slope and the way it faces, from the nodes either side.
  const slope = new Float32Array(n), facing = new Float32Array(n);
  for (let j = 0; j < nz; j++) { if (j % 8 === 0) yield; for (let i = 0; i < nx; i++) {
    const k = j * nx + i;
    if (!kind[k]) continue;
    const at = (di, dj) => { const kk = Math.min(nz - 1, Math.max(0, j + dj)) * nx + Math.min(nx - 1, Math.max(0, i + di)); return kind[kk] ? height[kk] : height[k]; };
    const gx = (at(1, 0) - at(-1, 0)) / (2 * STEP), gz = (at(0, 1) - at(0, -1)) / (2 * STEP), g = Math.hypot(gx, gz);
    slope[k] = g;
    // A face is north-facing when the ground climbs toward the south (+z): what it looks at is the north.
    facing[k] = g > .02 ? gz / g : 0;
  } }
  // How far a point is from a cliff (steep ground over the sea) and from a strand (low, gentle ground at the sea's
  // edge): a clifftop is high ground with a cliff between it and the sea, and a dune is low ground behind a strand.
  const H = ALEZHOR_HABITAT, cliff = new Float32Array(n).fill(1e6), strand = new Float32Array(n).fill(1e6);
  for (let k = 0; k < n; k++) {
    if (k % 8192 === 0) yield;
    if (kind[k] !== OWN && kind[k] !== LAND) continue;
    if (sea[k] <= H.cliffReach && slope[k] > H.cliffSlope) cliff[k] = 0;
    else if (sea[k] <= H.strandReach && height[k] - WATERLINE < H.strandTop && slope[k] < H.strandSlope) strand[k] = 0;
  }
  yield* chamfer(cliff); yield* chamfer(strand);
  // The swell at two scales and the sea's share: summed-area tables of the visible level (water at its surface),
  // of how many nodes were read, and of the sea.
  const SW = nx + 1, hSum = new Float64Array(SW * (nz + 1)), cSum = new Float64Array(SW * (nz + 1)), sSum = new Float64Array(SW * (nz + 1));
  for (let j = 0; j < nz; j++) { if (j % 6 === 0) yield; let hRow = 0, cRow = 0, sRow = 0;
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i, read = kind[k] ? 1 : 0;
      hRow += read ? level[k] : 0; cRow += read; sRow += kind[k] === SEA ? 1 : 0;
      const at = (j + 1) * SW + i + 1, above = j * SW + i + 1;
      hSum[at] = hSum[above] + hRow; cSum[at] = cSum[above] + cRow; sSum[at] = sSum[above] + sRow;
    } }
  const box = (table, i, j, half) => {
    const i0 = Math.max(0, i - half), i1 = Math.min(nx - 1, i + half), j0 = Math.max(0, j - half), j1 = Math.min(nz - 1, j + half);
    return table[(j1 + 1) * SW + i1 + 1] - table[j0 * SW + i1 + 1] - table[(j1 + 1) * SW + i0] + table[j0 * SW + i0];
  };
  const swell = new Float32Array(n), fold = new Float32Array(n), exposure = new Float32Array(n);
  const leeX = new Float32Array(n), leeZ = new Float32Array(n);
  for (let j = 0; j < nz; j++) { if (j % 4 === 0) yield; for (let i = 0; i < nx; i++) {
    const k = j * nx + i;
    if (!kind[k]) continue;
    const local = box(cSum, i, j, LOCAL), broad = box(cSum, i, j, BROAD), wide = box(cSum, i, j, WIDE);
    swell[k] = local ? level[k] - box(hSum, i, j, LOCAL) / local : 0;
    fold[k] = broad ? level[k] - box(hSum, i, j, BROAD) / broad : 0;
    exposure[k] = wide ? box(sSum, i, j, WIDE) / wide : 0;
    // The lee: straight away from the nearest sea, which is where the wind off the open ocean comes from.
    const sx = sea[j * nx + Math.min(nx - 1, i + 1)] - sea[j * nx + Math.max(0, i - 1)];
    const sz = sea[Math.min(nz - 1, j + 1) * nx + i] - sea[Math.max(0, j - 1) * nx + i], sl = Math.hypot(sx, sz);
    // Far from the sea the field is flat; the prevailing wind off the open ocean is westerly, so the lee is the east.
    if (sl > .5 && sea[k] < 400) { leeX[k] = sx / sl; leeZ[k] = sz / sl; } else { leeX[k] = .93; leeZ[k] = -.37; }
  } }
  /**
   * **A fold is ground with ground rising on both sides of it** - a valley across one line through it, or a bowl across
   * all of them - and not merely ground lower than its surroundings: the foot of the rise to the forest is lower than
   * the ground round it and is no shelter at all, because it is open on the side away from the rise. So the depth of a
   * point's hollow is read across four lines through it (east-west, north-south and the two diagonals), at twenty and at
   * forty metres either side: on each line, the lesser of the two rises; of the lines, the deepest.
   */
  const hollow = new Float32Array(n), reachSteps = [[5, 0], [0, 5], [4, 4], [4, -4]], wideSteps = [[10, 0], [0, 10], [7, 7], [7, -7]];
  const levelAt = (i, j, fallback) => (i < 0 || j < 0 || i >= nx || j >= nz || !kind[j * nx + i]) ? fallback : level[j * nx + i];
  for (let j = 0; j < nz; j++) { if (j % 6 === 0) yield; for (let i = 0; i < nx; i++) {
    const k = j * nx + i;
    if (kind[k] !== OWN) continue;
    let deepest = -Infinity;
    for (const [steps, scale] of [[reachSteps, 1], [wideSteps, .6]]) for (const [di, dj] of steps) {
      const here = level[k], a = levelAt(i + di, j + dj, here) - here, b = levelAt(i - di, j - dj, here) - here;
      deepest = Math.max(deepest, Math.min(a, b) * scale);
    }
    hollow[k] = deepest;
  } }
  /**
   * **What counts as a fold, and as a knoll, is this country's own relief, not a number of metres.** The ground is
   * shaped by another hand, and a fixed depth would make a wood of every hollow on a lumpy strip and none on a smooth
   * one. So a fold is among the deepest `foldShare` of this country's gentle ground and at least `foldDepth` deep; a
   * knoll is among the highest `knollShare` against the 56 metres round it, and at least `knoll` high. Read off two
   * histograms.
   */
  const BINS = 640, LO = -32, WIDTH = 64 / BINS, hollowCounts = new Uint32Array(BINS), swellCounts = new Uint32Array(BINS);
  const bin = v => Math.max(0, Math.min(BINS - 1, Math.floor((v - LO) / WIDTH)));
  let counted = 0;
  for (let k = 0; k < n; k++) {
    if (k % 8192 === 0) yield;
    if (kind[k] !== OWN || slope[k] >= H.foldSlope) continue;
    hollowCounts[bin(hollow[k])]++; swellCounts[bin(swell[k])]++; counted++;
  }
  const quantile = (counts, q) => { let sum = 0; for (let b = 0; b < BINS; b++) { sum += counts[b]; if (sum >= q * counted) return LO + (b + .5) * WIDTH; } return LO + BINS * WIDTH; };
  const foldCut = counted ? Math.max(H.foldDepth, quantile(hollowCounts, 1 - H.foldShare)) : H.foldDepth;
  const knollCut = counted ? Math.max(H.knoll, quantile(swellCounts, 1 - H.knollShare)) : H.knoll;
  yield;
  const node = (x, z) => {
    const i = Math.max(0, Math.min(nx - 1, Math.round((x - minX) / STEP))), j = Math.max(0, Math.min(nz - 1, Math.round((z - minZ) / STEP)));
    return j * nx + i;
  };
  // The ground's own account of a point (`alezhorCover`), asked within reach of a river, where what it says - gravel,
  // gorge, estuary, bank - is finer than four metres; and its own flats, folds and dunes everywhere, which are cheap to
  // ask (`keptShare`, `foldAt`, `duneLift`): what grows agrees with what was shaped.
  const design = typeof GROUND.alezhorCover === 'function' ? GROUND.alezhorCover : null;
  const riverNear = typeof GROUND.alezhorRiverAt === 'function' ? GROUND.alezhorRiverAt : null;
  const designedKept = typeof GROUND.keptShare === 'function' ? GROUND.keptShare : null;
  const designedFold = typeof GROUND.foldAt === 'function' ? GROUND.foldAt : null;
  const designedDune = typeof GROUND.duneLift === 'function' ? GROUND.duneLift : null;
  /** The nearest node's account of a point. A node that was not read (far off this country's hexes) is nobody's dry land. */
  function sample(x, z) {
    const k = node(x, z), cell = cellIndex[k] >= 0 ? cellList[cellIndex[k]] : null;
    return { read: kind[k] !== 0, height: height[k], level: level[k], own: kind[k] === OWN, wet: kind[k] === SEA || kind[k] === RIVER,
      sea: sea[k], fresh: fresh[k], wood: wood[k], cliff: cliff[k], strand: strand[k], forest: forest[k] >= 0 ? ALEZHOR_FOREST[forest[k]] : null,
      swell: swell[k], fold: fold[k], hollow: hollow[k], slope: slope[k], facing: facing[k], exposure: exposure[k], leeX: leeX[k], leeZ: leeZ[k],
      cell, terrain: cell?.terrain ?? null, north: alezhorNorth(z) };
  }
  /**
   * One word for a point, in the order the ground decides it: the **sea** and fresh water (**river**); a **flat** the
   * ground keeps; the **strand**, low gentle ground at the sea's edge; the **cliff**, steep ground over the sea; a river's
   * gravel **bar** at the water's edge and its **bank** behind that; the **marsh** of an estuary, low level ground
   * between a river and the sea; the **dune**, low ground behind a strand; the **clifftop**, high ground over the sea;
   * the tree line's **edge**; a **fold** in the ground, sheltered from the sea wind; **scrub** on the steep ground; a
   * **knoll**; and the open grass, **grassland** or **plain** as the atlas has the hex. The ground module's own account
   * of a point (`alezhorCover`, where it offers one) is taken before the measurements wherever it speaks.
   */
  function habitat(x, z, here = sample(x, z)) {
    if (here.wet) {
      // The node is the water's, but the point between it and the land may not be: the waterline is finer than the grid.
      const h = heightAt(x, z);
      if (alezhorWaterAt(x, z, h) !== null) return alezhorFreshWater(x, z, h) !== null ? 'river' : 'sea';
      here = { ...here, wet: false, height: h };
    }
    if (alezhorReserved(x, z) || (designedKept && designedKept(x, z) > H.kept)) return 'flat';
    if (design && (!riverNear || riverNear(x, z, H.riverReach))) {
      // The ground's whole account of a point costs it about five of its own heights: it is paid for as such.
      charge(5);
      const said = design(x, z);
      if (said && typeof said === 'object') {
        if ((said.gorge ?? 0) > .5) return 'cliff';
        if ((said.gravel ?? 0) > .5) return 'bar';
        if ((said.estuary ?? 0) > .5) return 'marsh';
        if ((said.bank ?? 0) > .5) return 'bank';
      }
    }
    const above = here.height - WATERLINE;
    if (here.sea <= H.strandReach && above < H.strandTop && here.slope < H.strandSlope) return 'strand';
    if (here.sea <= H.cliffReach && here.slope > H.cliffSlope) return 'cliff';
    if (here.fresh <= H.barReach && here.slope < H.bankSlope) return 'bar';
    if (here.fresh <= H.marshRiver && here.sea <= H.marshSea && above < H.marshTop && here.slope < H.marshSlope) return 'marsh';
    if (here.fresh <= H.bankReach && here.slope < H.bankSlope) return 'bank';
    // The dunes are the ground's where it lays them, and elsewhere a narrow fringe of marram behind any strand.
    const laid = designedDune ? designedDune(x, z) > H.duneLift : false;
    const fringe = here.strand <= (designedDune ? H.duneFringe : H.duneReach) && above < H.duneTop;
    if ((laid || fringe) && here.slope < H.duneSlope && here.fresh > H.bankReach) return 'dune';
    if (here.cliff <= H.clifftopReach && here.sea <= H.clifftopSea && above >= H.clifftopRise) return 'clifftop';
    if (here.wood <= H.edge) return 'edge';
    // The folds: the ground's own where it lays them ("where the strip's own woods stand out of the wind"); measured
    // off the ground's own relief where it does not.
    const folded = designedFold ? (designedFold(x, z)?.cut ?? 0) > H.foldCut : here.hollow > foldCut;
    if (here.slope < H.foldSlope && folded && here.exposure < H.foldExposure) return 'fold';
    if (here.slope > H.scrubSlope) return 'scrub';
    if (here.swell > knollCut) return 'knoll';
    return here.terrain === 'plains' ? 'plain' : 'grassland';
  }
  /** Whether the nearest node is this country's own dry ground: the cheap question, for skipping what is not. */
  const owns = (x, z) => kind[node(x, z)] === OWN;
  return { minX, maxX, minZ, maxZ, step: STEP, top, foldCut, knollCut, owns, sample, habitat };
}

// ---------------------------------------------------------------------------
// The kit
// ---------------------------------------------------------------------------
const geometries = {};
function bladeGeometry(blades, spread, width, base, step, lean = 1) {
  const positions = [], normals = [];
  for (let blade = 0; blade < blades; blade++) {
    const a = blade * (TAU / blades) * 1.07, out = (spread + blade % 3 * spread * .5) * lean;
    const bx = Math.cos(a) * spread, bz = Math.sin(a) * spread, h = base + (blade % 3) * step;
    const cx = Math.cos(a + Math.PI / 2) * width, cz = Math.sin(a + Math.PI / 2) * width;
    positions.push(bx - cx, 0, bz - cz, bx + cx, 0, bz + cz, bx + Math.cos(a) * out, h, bz + Math.sin(a) * out);
    for (let i = 0; i < 3; i++) normals.push(0, 1, 0);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.computeBoundingSphere();
  return geometry;
}
/** Bracken: five fronds arching out from a crown, each a long narrow blade bent over at the tip. */
function frondGeometry() {
  const positions = [];
  for (let f = 0; f < 5; f++) {
    const a = f * TAU / 5 + .3, c = Math.cos(a), s = Math.sin(a), wc = Math.cos(a + Math.PI / 2) * .16, ws = Math.sin(a + Math.PI / 2) * .16;
    // Base to knee, knee to tip: two triangles a frond, the second bent down and out.
    positions.push(-wc * .3, 0, -ws * .3, wc * .3, 0, ws * .3, c * .45 + wc, .8, s * .45 + ws);
    positions.push(-wc * .3, 0, -ws * .3, c * .45 + wc, .8, s * .45 + ws, c * .45 - wc, .78, s * .45 - ws);
    positions.push(c * .45 - wc, .78, s * .45 - ws, c * .45 + wc, .8, s * .45 + ws, c * 1.05, .52, s * 1.05);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  return geometry;
}
function shared() {
  if (geometries.ready) return geometries;
  Object.assign(geometries, {
    ready: true,
    // Coastal grassland: bunch grass to the knee and over it, going gold in the summer.
    prairie: bladeGeometry(7, .11, .042, .5, .2),
    // The plains' sward: shorter and finer, a dry summer's grass on open level ground.
    sward: bladeGeometry(8, .1, .032, .32, .12),
    // Meadow grass in the folds, on the banks and at the tree line: fuller and softer, and never quite dry.
    meadow: bladeGeometry(8, .1, .04, .42, .17),
    // Sea turf on the clifftops: short, dense, salt-pruned.
    turf: bladeGeometry(9, .085, .026, .17, .07),
    // Marram on the dunes: stiff, narrow, grey-green and upright, in tussocks.
    marram: bladeGeometry(9, .07, .022, .62, .22, .45),
    // Reed: head-high and over, the estuary and river margins' wall of stems.
    reed: bladeGeometry(7, .06, .024, 1.55, .38, .35),
    // Rush: upright, dark and stiff, in the wet at a river's edge and on the salt marsh.
    rush: bladeGeometry(7, .06, .02, .55, .22),
    frond: frondGeometry(),
    lobe: new THREE.IcosahedronGeometry(1, 0),
    stone: new THREE.IcosahedronGeometry(1, 0),
    trunk: new THREE.CylinderGeometry(1, 1.16, 1, 7),
    crown: new THREE.IcosahedronGeometry(1, 1),
    spire: new THREE.ConeGeometry(1, 1, 7),
    blades: new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide }),
    solid: new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }),
    fronds: new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true, side: THREE.DoubleSide }),
    // The Ibenwood's river water (`src/ibenwood-rivers.js`), so the gold river is one water across the line.
    water: new THREE.MeshStandardMaterial({ color: '#527e78', roughness: .3, metalness: .06, side: THREE.DoubleSide }),
  });
  return geometries;
}

/**
 * The trees, by species: height range, trunk radius, how far up the trunk the crown starts, the crown's spread and
 * depth (both against the height), how far the wind can lay it over, its colours, and its form - `round` (three crown
 * lobes), `spire` (a cone: the bald cypress and the juniper) or `umbrella` (the stone pine's flat head on a long bole).
 * Every species is in the timber table (`src/wood-species.js`), so every one is harvestable. The tree line's eight are
 * the Ibenwood's own outer species, drawn in the forest's own colours (`src/ibenwood-regional-scenery.js`) and at the
 * size of the young trees a forest throws out onto open ground, not of the forest's standing giants.
 */
export const ALEZHOR_TREES = freeze({
  // The South Ibenwood's line.
  'black-alder': freeze({ h: [7, 13], r: [.18, .3], bole: .4, spread: .2, deep: .26, lean: [.02, .12], bark: '#675b4c', leaf: '#446847', form: 'round' }),
  'black-willow': freeze({ h: [6, 10.5], r: [.22, .36], bole: .32, spread: .32, deep: .22, lean: [.04, .16], bark: '#706449', leaf: '#537c54', form: 'round' }),
  'bald-cypress': freeze({ h: [8, 14], r: [.24, .38], bole: .22, spread: .16, deep: .7, lean: [.01, .06], bark: '#796c55', leaf: '#647b4d', form: 'spire' }),
  sycamore: freeze({ h: [8, 15], r: [.24, .4], bole: .42, spread: .28, deep: .24, lean: [.02, .1], bark: '#a5a18a', leaf: '#67844e', form: 'round' }),
  // The West Ibenwood's line.
  beech: freeze({ h: [7, 14], r: [.22, .36], bole: .36, spread: .3, deep: .3, lean: [.02, .1], bark: '#898776', leaf: '#58734a', form: 'round' }),
  'white-oak': freeze({ h: [6.5, 13], r: [.26, .44], bole: .38, spread: .36, deep: .22, lean: [.03, .16], bark: '#80735c', leaf: '#5e794c', form: 'round' }),
  'sweet-chestnut': freeze({ h: [7, 13], r: [.26, .42], bole: .36, spread: .33, deep: .26, lean: [.02, .12], bark: '#77624a', leaf: '#62844c', form: 'round' }),
  'black-walnut': freeze({ h: [7, 13], r: [.22, .36], bole: .44, spread: .3, deep: .22, lean: [.02, .1], bark: '#66543e', leaf: '#496d46', form: 'round' }),
  // The strip's own.
  'holm-oak': freeze({ h: [5, 9], r: [.22, .36], bole: .4, spread: .32, deep: .25, lean: [.03, .14], bark: '#766951', leaf: '#4f5d3c', form: 'round' }),
  'stone-pine': freeze({ h: [7, 12.5], r: [.2, .32], bole: .76, spread: .32, deep: .1, lean: [.08, .32], bark: '#786448', leaf: '#4f6646', form: 'umbrella' }),
  'common-hazel': freeze({ h: [3, 5.5], r: [.1, .16], bole: .12, spread: .34, deep: .4, lean: [.02, .1], bark: '#7a6a55', leaf: '#5f7a48', form: 'round' }),
  hawthorn: freeze({ h: [3, 5], r: [.13, .2], bole: .32, spread: .32, deep: .24, lean: [.08, .36], bark: '#5f5446', leaf: '#5d6e45', form: 'round' }),
  'white-poplar': freeze({ h: [10, 16], r: [.24, .36], bole: .4, spread: .14, deep: .34, lean: [.01, .08], bark: '#b4b3a5', leaf: '#8ca277', form: 'round' }),
  tamarisk: freeze({ h: [3, 5.5], r: [.12, .2], bole: .36, spread: .28, deep: .26, lean: [.06, .22], bark: '#6b5d4e', leaf: '#86977f', form: 'round' }),
  'common-juniper': freeze({ h: [1.6, 3.2], r: [.1, .15], bole: .12, spread: .2, deep: .78, lean: [.1, .38], bark: '#5a4c3e', leaf: '#3c5440', form: 'spire' }),
});
const TREE_COUNT = freeze({ 'black-alder': 'alders', 'black-willow': 'willows', 'bald-cypress': 'cypresses', sycamore: 'sycamores',
  beech: 'beeches', 'white-oak': 'oaks', 'sweet-chestnut': 'chestnuts', 'black-walnut': 'walnuts', 'holm-oak': 'holmOaks',
  'stone-pine': 'pines', 'common-hazel': 'hazels', hawthorn: 'thorns', 'white-poplar': 'poplars', tamarisk: 'tamarisks', 'common-juniper': 'junipers' });
/** A gorse or broom bush taller than this (its scale) is head-high and carries a collider. */
const SHRUB_TALL = 1.45;

export function createAlezhorScenery(...args) { return finishBuild(createAlezhorScenerySteps(...args)); }
/** Alezhor's scenery: what grows on the strip between the open ocean and the Ibenwood, and the stone and the shore. */
export function* createAlezhorScenerySteps({ parent, heightAt, legacyHeightAt = heightAt, renderedGroundHeight = heightAt, colliders }) {
  const kit = shared();
  yield;
  const root = new THREE.Group(); root.name = `${ALEZHOR} - grass, scrub, woodland, the tree line and the water's margins`; parent.add(root);
  const metrics = { blocks: 0, grass: 0, sward: 0, meadow: 0, turf: 0, marram: 0, reeds: 0, rushes: 0, forbs: 0, poppies: 0, foxgloves: 0,
    thrift: 0, gorse: 0, broom: 0, heather: 0, bramble: 0, bracken: 0, stones: 0, boulders: 0, gravel: 0, driftwood: 0, water: 0, waterMarkers: 0,
    trees: 0, edgeTrees: 0, alders: 0, willows: 0, cypresses: 0, sycamores: 0, beeches: 0, oaks: 0, chestnuts: 0, walnuts: 0, holmOaks: 0,
    pines: 0, hazels: 0, thorns: 0, poplars: 0, tamarisks: 0, junipers: 0, batches: 0, instances: 0, colliders: 0, habitats: {} };
  let seed = SEED, cost = 0;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a, b) => a + random() * (b - a);
  // Every question put to the ground is paid for: the steps below yield by what they have asked, not by a count of loops.
  const field = yield* readAlezhorGround((x, z) => { cost++; return legacyHeightAt(x, z); }, n => { cost += n; });
  cost = 0;
  // A point is dry if the survey says so with room to spare; near any water the ground itself is asked.
  const dry = (x, z, lift = .06) => {
    const here = field.sample(x, z);
    if (!here.wet && here.sea > 8 && here.fresh > 8 && here.height > WATERLINE + 1.5) return true;
    cost++;
    const h = legacyHeightAt(x, z);
    return alezhorWaterAt(x, z, h) === null && h > WATERLINE + lift;
  };
  const plantable = (x, z) => alezhorScatterOwns(x, z) && dry(x, z);
  /** For a clump whose lobes stand off its centre: its own ground and dry for `r` metres round. */
  const roomy = (x, z, r) => plantable(x, z) && [[r, 0], [-r, 0], [0, r], [0, -r]].every(([dx, dz]) => plantable(x + dx, z + dz));
  // Spacing by a hash grid rather than a scan of everything already placed.
  const spacer = cell => {
    const grid = new Map(), key = (i, j) => `${i},${j}`;
    return {
      free(x, z, gap) {
        const i0 = Math.floor((x - gap) / cell), i1 = Math.floor((x + gap) / cell), j0 = Math.floor((z - gap) / cell), j1 = Math.floor((z + gap) / cell);
        for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (const p of grid.get(key(i, j)) ?? [])
          if (Math.hypot(p.x - x, p.z - z) < gap) return false;
        return true;
      },
      add(item) { const k = key(Math.floor(item.x / cell), Math.floor(item.z / cell)); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(item); return item; },
    };
  };
  const TILE = 160, tiles = new Map(), tileOf = (x, z) => `${Math.floor((x - field.minX) / TILE)},${Math.floor((z - field.minZ) / TILE)}`;
  const tufts = (kind, x, z) => {
    const key = `${kind}|${tileOf(x, z)}`;
    if (!tiles.has(key)) tiles.set(key, { kind, items: [] });
    return tiles.get(key).items;
  };
  const forbs = [], shrubs = [], ferns = [], stones = [], gravel = [], driftwood = [], trees = [];
  const shrubSpace = spacer(6), treeSpace = spacer(8), boulderSpace = spacer(10), loneSpace = spacer(24);

  // -------------------------------------------------------------------------
  // The ground, ten metres at a time
  // -------------------------------------------------------------------------
  /**
   * Every ten-metre block of the survey with any of this country's dry ground in it is planted from the one seeded
   * stream, in a fixed order, so the same ground grows the same strip. What a block grows is decided per candidate by
   * the word for the ground under it, from the table below: the chance, per go, of grass, a flower, a shrub, bracken,
   * a stone and a tree.
   */
  const BLOCK = 10;
  const CHANCE = freeze({
    //           grass forb  shrub fern  stone tree
    sea:       [0,    0,    0,    0,    0,    0],
    river:     [0,    0,    0,    0,    0,    0],
    flat:      [.95,  .3,   0,    0,    0,    0],
    strand:    [.05,  .02,  0,    0,    .08,  0],
    cliff:     [.3,   .3,   .12,  0,    .7,   0],
    bar:       [.1,   .02,  0,    0,    .3,   0],
    marsh:     [.95,  .3,   0,    0,    0,    .02],
    bank:      [.95,  .2,   .08,  .25,  .06,  .22],
    dune:      [.8,   .16,  .12,  0,    .02,  .05],
    clifftop:  [.95,  .45,  .5,   0,    .3,   .05],
    edge:      [.92,  .32,  .5,   .75,  .06,  .55],
    fold:      [.88,  .14,  .32,  .6,   .07,  .5],
    scrub:     [.7,   .14,  .7,   .15,  .32,  .05],
    knoll:     [.85,  .3,   .4,   .03,  .22,  .03],
    grassland: [.96,  .36,  .06,  .03,  .04,  .02],
    plain:     [.93,  .32,  .1,   .02,  .07,  .015],
  });
  const word = (x, z) => { const here = field.sample(x, z); return { here, word: field.habitat(x, z, here) }; };
  for (let bz = field.minZ; bz < field.maxZ; bz += BLOCK) {
    for (let bx = field.minX; bx < field.maxX; bx += BLOCK) {
      if (cost >= STEP_COST) { cost = 0; yield; }
      cost += .5;
      // Anything of ours here? The block's centre and corners, off the survey that is already in hand.
      const corners = [[5, 5], [0, 0], [BLOCK, 0], [0, BLOCK], [BLOCK, BLOCK]];
      if (!corners.some(([dx, dz]) => field.owns(bx + dx, bz + dz))) continue;
      // A block of this country's ground is a dozen candidates each read against the survey, the trails, the flats and the
      // ranges whether or not it asks the ground anything: about four heights' worth of work before it asks.
      cost += 4;
      const probes = corners.map(([dx, dz]) => field.sample(bx + dx, bz + dz));
      metrics.blocks++;
      // The census: what the ground is, a hundred square metres to a word, from the middle of the block.
      if (probes[0].own) { const w = field.habitat(bx + 5, bz + 5, probes[0]); metrics.habitats[w] = (metrics.habitats[w] ?? 0) + 1; }
      const point = () => ({ x: bx + random() * BLOCK, z: bz + random() * BLOCK });
      // **Grass**: five goes a block. Bunch grass on the grassland hexes, the plains' shorter sward, meadow grass in
      // the folds and at the tree line and on the banks, sea turf on the clifftops, marram on the dunes. On a
      // trail's own width it does not grow.
      for (let i = 0; i < 5; i++) {
        const { x, z } = point();
        if (!plantable(x, z) || alezhorTrailDistance(x, z) < 0) continue;
        const { here, word: w } = word(x, z);
        if (random() > CHANCE[w][0]) continue;
        const kind = w === 'dune' ? 'marram' : w === 'clifftop' || w === 'cliff' ? 'turf'
          : w === 'fold' || w === 'edge' || w === 'bank' || w === 'flat' ? 'meadow'
          : w === 'marsh' || w === 'bar' ? 'rush'
          : w === 'plain' || w === 'knoll' || w === 'scrub' || w === 'strand' ? 'sward' : 'prairie';
        const s = range(.8, 1.3) * (kind === 'prairie' ? (here.terrain === 'grassland' ? 1.08 : 1) : 1) * (w === 'knoll' ? .85 : 1);
        tufts(kind, x, z).push({ x, z, s, rot: random() * TAU, word: w, north: here.north, swell: here.swell, facing: here.facing });
        metrics[{ prairie: 'grass', sward: 'sward', meadow: 'meadow', turf: 'turf', marram: 'marram', rush: 'rushes' }[kind]]++;
      }
      // **Flowers**: poppy, lupin, yarrow and yellow composites in the grass, poppy toward the warm south and lupin
      // toward the cool north; foxglove at the tree line and in the folds; thrift on the clifftops; sea holly on the
      // dunes; sea-lavender on the salt marsh; yellow flag on the banks. Nobody walks round a flower.
      {
        const { x, z } = point();
        if (roomy(x, z, .4) && alezhorTrailDistance(x, z) > .4) {
          const { here, word: w } = word(x, z);
          if (random() < CHANCE[w][1] && here.slope < .9) {
            const roll = random(), warm = 1 - here.north;
            const kind = w === 'clifftop' || w === 'cliff' ? (roll < .65 ? 'thrift' : 'campion')
              : w === 'dune' ? (roll < .5 ? 'holly' : 'composite')
              : w === 'marsh' ? (roll < .7 ? 'lavender' : 'campion')
              : w === 'bank' || w === 'bar' ? (roll < .5 ? 'flag' : roll < .75 ? 'loosestrife' : 'yarrow')
              : w === 'edge' || w === 'fold' ? (roll < .45 ? 'foxglove' : roll < .75 ? 'yarrow' : 'composite')
              : roll < .12 + warm * .22 ? 'poppy' : roll < .4 + warm * .1 ? 'composite' : roll < .72 ? 'lupin' : 'yarrow';
            forbs.push({ x, z, s: range(.5, .95), h: range(.7, 1.2), rot: random() * TAU, kind });
          }
        }
      }
      // **Shrubs**: gorse, broom and heather on the rough ground, the knuckles and the clifftops, the Atlantic
      // coast's scrub; bramble at the tree line, in the folds and on the banks. Two goes a block.
      for (let i = 0; i < 2; i++) {
        const { x, z } = point();
        if (!roomy(x, z, .7) || alezhorPathClear(x, z, .6)) continue;
        const { here, word: w } = word(x, z);
        if (here.slope > .95 || random() > CHANCE[w][2] || !shrubSpace.free(x, z, 1.9)) continue;
        const roll = random();
        const kind = w === 'edge' || w === 'fold' || w === 'bank' ? (roll < .7 ? 'bramble' : 'gorse')
          : w === 'clifftop' || w === 'cliff' ? (roll < .55 ? 'heather' : 'gorse')
          : w === 'dune' ? (roll < .6 ? 'gorse' : 'broom')
          : roll < .45 ? 'gorse' : roll < .75 ? 'broom' : 'heather';
        const tall = kind === 'gorse' || kind === 'broom';
        let size = kind === 'heather' ? range(.35, .7) : kind === 'bramble' ? range(.5, 1.1) : range(.6, 1.75) * (w === 'clifftop' || w === 'dune' ? .75 : 1);
        // A tall bush is a corner for an animal giving ground, and a wall on a trail: under the shoulder there.
        if (tall && size > SHRUB_TALL && alezhorSceneryClear(x, z, size * .5 + .4)) size = SHRUB_TALL - .05;
        shrubs.push(shrubSpace.add({ x, z, s: size, rot: random() * TAU, kind, bloom: random() < .5 }));
      }
      // **Bracken** at the tree line and in the woods' shade, and a little out on the banks and the rough ground.
      {
        const { x, z } = point();
        if (roomy(x, z, .6) && alezhorTrailDistance(x, z) > .8 && !alezhorReserved(x, z)) {
          const { here, word: w } = word(x, z);
          if (here.slope < .8 && random() < CHANCE[w][3]) ferns.push({ x, z, s: range(.75, 1.35) * (w === 'edge' ? 1.1 : 1), rot: random() * TAU, dry: random() < .25 });
        }
      }
      // **Stone**: rock on the cliffs and breaking through on the clifftops and the knuckles of the strip, and old
      // river cobbles in the plains' sward. A boulder a metre across stops a walker.
      {
        const { x, z } = point();
        if (plantable(x, z) && alezhorTrailDistance(x, z) > .3 && !alezhorReserved(x, z)) {
          const { here, word: w } = word(x, z);
          if (random() < CHANCE[w][4]) {
            const rocky = w === 'cliff' || w === 'clifftop' || w === 'scrub';
            const big = rocky ? random() < .28 : random() < .05;
            const s = big ? range(.95, 2.1) : range(.18, .55);
            if (!(big && (alezhorSceneryClear(x, z, s + .4) || !boulderSpace.free(x, z, 7)))) {
              const stone = { x, z, s, big, rot: random() * TAU, flat: big ? range(.5, .78) : range(.35, .6), tint: random(), word: w };
              stones.push(stone); if (big) boulderSpace.add(stone);
            }
          }
        }
      }
      // **Trees, only where the ground has them**: the tree line's mantle, the folds' woods, the banks' fringe, the
      // stone pines at the back of the dunes, a wind-cut juniper on a clifftop and, now and then, a lone oak or thorn
      // out on the grass. Two goes a block at the tree line and in the folds.
      for (let i = 0; i < 3; i++) {
        const { x, z } = point();
        if (!plantable(x, z) || alezhorSceneryClear(x, z, 2)) continue;
        const { here, word: w } = word(x, z);
        if (i && w !== 'edge' && w !== 'fold') continue;
        // The tree line's mantle is thickest at the line and thins out onto the open grass.
        const thin = w === 'edge' ? .3 + .7 * smooth(ALEZHOR_HABITAT.edge, 4, here.wood) : 1;
        if (here.slope > .7 || random() > CHANCE[w][5] * thin) continue;
        const warm = 1 - here.north, roll = random();
        let species, edge = false;
        if (w === 'edge') {
          // The forest's own species at this point of the line, from its own table; hazel and thorn in the mantle.
          edge = roll < .72 && !!here.forest;
          species = edge ? ibenwoodTreeSpecies(here.forest, x, z, random()) : roll < .88 ? 'common-hazel' : 'hawthorn';
        } else if (w === 'fold') {
          species = roll < .3 - warm * .14 ? 'white-oak' : roll < .48 - warm * .2 ? 'sweet-chestnut' : roll < .62 - warm * .2 ? 'common-hazel'
            : roll < .7 ? 'hawthorn' : roll < .9 ? 'holm-oak' : (warm > .45 ? 'stone-pine' : 'white-oak');
        } else if (w === 'bank') {
          species = here.sea < 90 ? (roll < .5 ? 'tamarisk' : 'black-willow')
            : roll < .4 ? 'black-alder' : roll < .72 ? 'black-willow' : roll < .88 ? 'white-poplar' : 'sycamore';
        } else if (w === 'dune') species = here.fresh < 60 && roll < .35 ? 'tamarisk' : 'stone-pine';
        else if (w === 'marsh') species = 'tamarisk';
        else if (w === 'clifftop' || w === 'cliff' || w === 'scrub') species = roll < .7 ? 'common-juniper' : 'hawthorn';
        else species = roll < .55 ? (warm > .55 ? 'holm-oak' : 'white-oak') : 'hawthorn';
        const lone = w === 'grassland' || w === 'plain' || w === 'knoll';
        const gap = species === 'common-juniper' || species === 'common-hazel' || species === 'hawthorn' || species === 'tamarisk' ? 3.5 : w === 'edge' || w === 'fold' ? 4.5 : 6;
        if (!treeSpace.free(x, z, gap) || (lone && !loneSpace.free(x, z, 26))) continue;
        const t = treeSpace.add(tree(species, x, z, here, w));
        if (lone) loneSpace.add(t);
        if (edge) { t.edge = true; metrics.edgeTrees++; }
        trees.push(t);
      }
      // **The shore**: now and then a bleached log the sea has left above the tide.
      if (probes.some(p => p.sea <= ALEZHOR_HABITAT.strandReach + 3) && random() < .1) {
        const { x, z } = point();
        if (plantable(x, z)) {
          const { here, word: w } = word(x, z);
          if (w === 'strand' && here.sea > 3 && !alezhorPathClear(x, z, 1.5)) driftwood.push({ x, z, length: range(1.4, 3.4), radius: range(.07, .15), yaw: random() * TAU });
        }
      }
    }
  }
  function tree(species, x, z, here, w) {
    const t = ALEZHOR_TREES[species];
    // The sea wind lays a tree over: the sea round it and its nearness to the water. A fold or the forest's lee
    // shelters it.
    const exposed = clamp01(here.exposure * 1.6 + smooth(140, 20, here.sea) * .55 + Math.max(0, here.swell) * .1
      - (w === 'fold' || w === 'edge' ? .35 : 0));
    // The tree line's young trees are tallest nearest the forest they came out of.
    const young = w === 'edge' ? .75 + .25 * smooth(ALEZHOR_HABITAT.edge, 2, here.wood) : 1;
    const turn = range(-.35, .35), c = Math.cos(turn), s = Math.sin(turn);
    return { species, x, z, height: range(...t.h) * (1 - exposed * .3) * young, radius: range(...t.r) * (w === 'edge' ? .85 : 1), yaw: random() * TAU,
      lean: t.lean[0] + (t.lean[1] - t.lean[0]) * clamp01(exposed + range(-.15, .15)),
      leeX: here.leeX * c - here.leeZ * s, leeZ: here.leeX * s + here.leeZ * c, habitat: w };
  }

  // -------------------------------------------------------------------------
  // The water's margins, node by node
  // -------------------------------------------------------------------------
  /**
   * **The rivers and the estuaries.** Walked over every node of this country's dry ground within a dozen metres of
   * fresh water, and of the estuary marsh: washed gravel at the water's edge - the river's own gravel, the bars the
   * placer gold is in - then reed a pace back, and rush behind it; reedbed across the estuary's marsh. A cold strip of
   * water does not grow a gallery forest; the fringe of alder and willow comes off the bank in the block pass above.
   */
  for (let z = field.minZ; z <= field.maxZ; z += field.step) {
    for (let x = field.minX; x <= field.maxX; x += field.step) {
      if (cost >= STEP_COST) { cost = 0; yield; }
      cost += .1;
      const node = field.sample(x, z), H = ALEZHOR_HABITAT;
      if (!node.own || node.wet) continue;
      const marsh = node.fresh <= H.marshRiver && node.sea <= H.marshSea && node.height - WATERLINE < H.marshTop && node.slope < H.marshSlope;
      if (node.fresh > 12 && !marsh) continue;
      // An estuary's reedbed is a bed, not a scatter: twice the goes on the marsh.
      const goes = marsh ? 4 : 2;
      for (let k = 0; k < goes; k++) {
        const px = x + range(-2, 2), pz = z + range(-2, 2);
        if (!plantable(px, pz) || alezhorTrailDistance(px, pz) < .2) continue;
        const reach = field.sample(px, pz).fresh, w = field.habitat(px, pz);
        if (w === 'flat') continue;
        if (reach <= ALEZHOR_HABITAT.barReach && random() < .7) gravel.push({ x: px, z: pz, s: range(.1, .34), rot: random() * TAU, flat: range(.3, .5), tint: random() });
        else if ((reach <= 9 || w === 'marsh') && random() < .6) {
          const reed = w === 'marsh' ? random() < .75 : reach <= 8 && random() < .7;
          tufts(reed ? 'reed' : 'rush', px, pz).push({ x: px, z: pz, s: range(.75, 1.25), rot: random() * TAU, word: w });
          if (reed) metrics.reeds++; else metrics.rushes++;
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Drawing it
  // -------------------------------------------------------------------------
  const dummy = new THREE.Object3D(), color = new THREE.Color(), up = new THREE.Vector3(), axis = new THREE.Vector3();
  const lean = new THREE.Quaternion(), turn = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0);
  const ground = (x, z) => { cost++; return renderedGroundHeight(x, z); };
  const ask = (x, z) => { cost++; return heightAt(x, z); };
  // An individual shrub lobe needs a basal contact, while its other side may
  // overhang sloping ground. Lower only unsupported lobes; retain every seeded
  // horizontal transform, rotation, scale and color and leave stone overhangs.
  const lobeFeet = [], lobePosition = kit.lobe.attributes.position;
  let lobeMinimum = Infinity;
  for (let i = 0; i < lobePosition.count; i++) lobeMinimum = Math.min(lobeMinimum, lobePosition.getY(i));
  for (let i = 0; i < lobePosition.count; i++) if (lobePosition.getY(i) <= lobeMinimum + 1e-5)
    lobeFeet.push([lobePosition.getX(i), lobePosition.getY(i), lobePosition.getZ(i)]);
  function seatShrubLobe() {
    const e = dummy.matrix.elements; let gap = Infinity;
    for (const [x, y, z] of lobeFeet) {
      const px = e[0] * x + e[4] * y + e[8] * z + e[12], py = e[1] * x + e[5] * y + e[9] * z + e[13];
      const pz = e[2] * x + e[6] * y + e[10] * z + e[14];
      gap = Math.min(gap, py - ground(px, pz));
    }
    if (gap > 0) { dummy.position.y -= gap + .015; dummy.updateMatrix(); }
  }
  function* instanced(geometry, material, items, name, place, perItem = 1) {
    if (!items.length) return null;
    const mesh = new THREE.InstancedMesh(geometry, material, items.length * perItem);
    mesh.name = name;
    let at = 0;
    for (const item of items) {
      if (cost >= STEP_COST) { cost = 0; yield; }
      at = place(mesh, item, at);
    }
    // A bounding sphere over a thousand instances is a step of its own.
    if (at > 600) { cost = 0; yield; }
    mesh.count = at; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.receiveShadow = true; mesh.computeBoundingSphere(); root.add(mesh);
    metrics.batches++; metrics.instances += at;
    return mesh;
  }
  const blade = (mesh, item, at, tint) => {
    dummy.position.set(item.x, ground(item.x, item.z) - .03, item.z); dummy.quaternion.identity(); dummy.rotation.set(0, item.rot, 0);
    dummy.scale.set(item.s, item.s, item.s); dummy.updateMatrix();
    mesh.setMatrixAt(at, dummy.matrix); mesh.setColorAt(at, tint); return at + 1;
  };
  /**
   * Grass colour carries the climate and the ground, and it is a saturation note more than a hue (the Meneth lesson:
   * pick the lightnesses low, the renderer pales them). Csb's grass goes gold in the dry summer and the open strip is
   * the goldest of it, the more so toward the warm south; the folds, the banks and the tree line's shade keep it
   * green; the north, under the West Ibenwood, is the greenest of the open ground, the grey wet season reaching it.
   */
  const grassTint = t => {
    const warm = 1 - (t.north ?? .5);
    let hue = .2 - warm * .035, sat = .3, light = .34 + warm * .03;
    if (t.word === 'plain' || t.word === 'knoll' || t.word === 'scrub' || t.word === 'strand') { hue -= .02; sat = .28; light += .03; }
    hue += Math.max(0, t.facing ?? 0) * .012;
    return color.setHSL(hue + range(-.014, .014), sat + range(-.04, .04), light + range(-.035, .035));
  };
  const meadowTint = t => color.setHSL(.235 + (t.north ?? .5) * .015 + range(-.012, .012), .36 + range(-.04, .04), .3 + range(-.03, .03));
  const turfTint = () => color.setHSL(.235 + range(-.014, .014), .3 + range(-.05, .05), .34 + range(-.035, .035));
  const marramTint = () => color.setHSL(.19 + range(-.015, .015), .16 + range(-.04, .04), .45 + range(-.04, .04));
  const reedTint = () => color.setHSL(.15 + range(-.015, .015), .3 + range(-.05, .05), .4 + range(-.05, .04));
  const rushTint = () => color.setHSL(.2 + range(-.015, .015), .3 + range(-.05, .05), .27 + range(-.03, .03));
  const GRASS = { prairie: ['coastal bunch grass', grassTint], sward: ['plains sward', grassTint], meadow: ['meadow grass', meadowTint],
    turf: ['sea turf', turfTint], marram: ['dune marram', marramTint], reed: ['reed', reedTint], rush: ['rush', rushTint] };
  for (const [key, tile] of [...tiles].sort((a, b) => a[0] < b[0] ? -1 : 1)) {
    const [label, tint] = GRASS[tile.kind];
    yield* instanced(kit[tile.kind], kit.blades, tile.items, `${ALEZHOR} ${label} ${key.split('|')[1]}`, (mesh, item, at) => blade(mesh, item, at, tint(item)));
  }
  // Each lobe stands on the ground under itself, so a bush on a slope hugs the slope rather than hanging off it.
  const lobes = (mesh, item, at, count, shape, tint, seat = false) => {
    for (let lobe = 0; lobe < count; lobe++) {
      const a = item.rot + lobe * TAU / count, spread = lobe === count - 1 ? 0 : shape.spread * item.s;
      const px = item.x + Math.cos(a) * spread, pz = item.z + Math.sin(a) * spread;
      dummy.position.set(px, ground(px, pz) + item.s * shape.lift * (lobe === count - 1 ? 1.25 : 1), pz);
      dummy.quaternion.identity(); dummy.rotation.set(range(-.2, .2), a, range(-.2, .2));
      dummy.scale.set(item.s * shape.wide, item.s * shape.tall, item.s * shape.wide * .9); dummy.updateMatrix();
      if (seat) seatShrubLobe();
      mesh.setMatrixAt(at, dummy.matrix); mesh.setColorAt(at++, tint(lobe));
    }
    return at;
  };
  const FLOWER = { poppy: '#b2453a', composite: '#b8a03c', lupin: '#6c6fa8', yarrow: '#d6d0bd', foxglove: '#a0628c', thrift: '#b77a8f',
    campion: '#d9d4c6', holly: '#8f9fb0', lavender: '#8a7fb0', flag: '#c9b23d', loosestrife: '#a35a8c' };
  yield* instanced(kit.lobe, kit.solid, forbs, `${ALEZHOR} poppy, lupin, yarrow, foxglove, thrift and the shore's flowers`, (mesh, item, at) => lobes(mesh, item, at, 3,
    item.kind === 'foxglove' || item.kind === 'lupin' || item.kind === 'loosestrife' ? { spread: .13, lift: item.h * .5, wide: .15, tall: item.h * .55 }
      : item.kind === 'thrift' || item.kind === 'holly' ? { spread: .2, lift: .12, wide: .26, tall: .14 }
      : { spread: .24, lift: item.h * .4, wide: .26, tall: item.h * .32 },
    lobe => (lobe === 2 ? color.set(FLOWER[item.kind]) : color.set(item.kind === 'holly' ? '#7d8c8c' : '#5a6c40')).offsetHSL(range(-.02, .02), range(-.05, .05), range(-.04, .05))), 3);
  metrics.forbs = forbs.length;
  metrics.poppies = forbs.filter(f => f.kind === 'poppy').length; metrics.foxgloves = forbs.filter(f => f.kind === 'foxglove').length;
  metrics.thrift = forbs.filter(f => f.kind === 'thrift').length;
  const SHRUB = { gorse: { lobes: 3, shape: { spread: .36, lift: .45, wide: .55, tall: .55 }, tint: ['#34452c', '#3d4f32', '#c9a632'] },
    broom: { lobes: 3, shape: { spread: .3, lift: .5, wide: .42, tall: .62 }, tint: ['#4d6332', '#56703a', '#d1b443'] },
    heather: { lobes: 3, shape: { spread: .4, lift: .25, wide: .55, tall: .3 }, tint: ['#5a5143', '#62584a', '#7e5a78'] },
    bramble: { lobes: 3, shape: { spread: .45, lift: .32, wide: .62, tall: .42 }, tint: ['#36452e', '#3e4f34', '#45573a'] } };
  yield* instanced(kit.lobe, kit.solid, shrubs, `${ALEZHOR} gorse, broom, heather and bramble`, (mesh, item, at) => {
    const kind = SHRUB[item.kind];
    const next = lobes(mesh, item, at, kind.lobes, kind.shape,
      lobe => color.set(kind.tint[lobe === kind.lobes - 1 && item.bloom ? 2 : lobe % 2]).offsetHSL(range(-.015, .015), range(-.04, .04), range(-.03, .03)), true);
    // The tall ones stop a walker; under the shoulder they are pushed through.
    if ((item.kind === 'gorse' || item.kind === 'broom') && item.s > SHRUB_TALL) {
      const feet = Math.min(ground(item.x, item.z), ask(item.x, item.z));
      colliders.push({ x: item.x, z: item.z, r: item.s * .38, minY: feet - .5, maxY: feet + item.s * 1.15, kind: 'scrub', id: `alezhor-${item.kind}-${item.x.toFixed(2)}-${item.z.toFixed(2)}` });
      metrics.colliders++;
    }
    return next;
  }, 3);
  for (const kind of ['gorse', 'broom', 'heather', 'bramble']) metrics[kind] = shrubs.filter(s => s.kind === kind).length;
  yield* instanced(kit.frond, kit.fronds, ferns, `${ALEZHOR} bracken`, (mesh, item, at) => {
    dummy.position.set(item.x, ground(item.x, item.z) - .02, item.z); dummy.quaternion.identity(); dummy.rotation.set(0, item.rot, 0);
    dummy.scale.set(item.s, item.s * range(.85, 1.15), item.s); dummy.updateMatrix();
    mesh.setMatrixAt(at, dummy.matrix);
    mesh.setColorAt(at, item.dry ? color.setHSL(.09 + range(-.01, .01), .4 + range(-.05, .05), .32 + range(-.03, .03)) : color.set('#4c7455').offsetHSL(range(-.015, .015), range(-.05, .05), range(-.04, .03)));
    return at + 1;
  });
  metrics.bracken = ferns.length;
  /** The strip's stone: the grey of the coast's rock, browner where it lies in the grass. */
  const stoneTint = item => item.word === 'cliff' || item.word === 'clifftop'
    ? color.set(item.tint < .5 ? '#7d7b74' : '#8c887d').offsetHSL(0, range(-.02, .02), range(-.05, .05))
    : color.set(item.tint < .6 ? '#8a8578' : '#9b9384').offsetHSL(0, range(-.02, .02), range(-.05, .05));
  yield* instanced(kit.stone, kit.solid, stones, `${ALEZHOR} stone`, (mesh, item, at) => {
    const y = ground(item.x, item.z);
    dummy.position.set(item.x, y + item.s * item.flat * .25, item.z); dummy.quaternion.identity(); dummy.rotation.set(range(-.15, .15), item.rot, range(-.15, .15));
    dummy.scale.set(item.s, item.s * item.flat, item.s * range(.75, 1.15)); dummy.updateMatrix();
    mesh.setMatrixAt(at, dummy.matrix); mesh.setColorAt(at, stoneTint(item));
    if (item.big) {
      const feet = Math.min(y, ask(item.x, item.z));
      colliders.push({ x: item.x, z: item.z, r: item.s * .78, minY: feet - .6, maxY: feet + item.s * item.flat * 1.3,
        kind: 'rock', id: `alezhor-stone-${item.x.toFixed(2)}-${item.z.toFixed(2)}` });
      metrics.colliders++; metrics.boulders++;
    }
    return at + 1;
  });
  metrics.stones = stones.length;
  // The rivers' gravel: washed, rounded and pale, small enough to walk over - and the gold is in it.
  yield* instanced(kit.stone, kit.solid, gravel, `${ALEZHOR} river gravel`, (mesh, item, at) => {
    dummy.position.set(item.x, ground(item.x, item.z) + .01, item.z); dummy.quaternion.identity(); dummy.rotation.set(0, item.rot, 0);
    dummy.scale.set(item.s, item.s * item.flat, item.s * range(.8, 1.3)); dummy.updateMatrix();
    mesh.setMatrixAt(at, dummy.matrix); mesh.setColorAt(at, color.set(item.tint < .45 ? '#a39d8e' : item.tint < .85 ? '#b0a894' : '#a89a72').offsetHSL(0, 0, range(-.05, .04)));
    return at + 1;
  });
  metrics.gravel = gravel.length;
  yield* instanced(kit.trunk, kit.solid, driftwood, `${ALEZHOR} driftwood`, (mesh, item, at) => {
    dummy.position.set(item.x, ground(item.x, item.z) + item.radius * .6, item.z); dummy.quaternion.identity(); dummy.rotation.set(0, item.yaw, Math.PI / 2);
    dummy.scale.set(item.radius, item.length, item.radius); dummy.updateMatrix();
    mesh.setMatrixAt(at, dummy.matrix); mesh.setColorAt(at, color.set('#b3aa98').offsetHSL(0, range(-.03, .03), range(-.05, .04)));
    return at + 1;
  });
  metrics.driftwood = driftwood.length;
  /**
   * **The water of Alezhor's own reaches** - the gold river from the forest's end to its estuary, and the west stream to
   * its mouth - drawn as the ground module lays it: its own ribbons (`alezhorWaterRibbons`, "drawn exactly where
   * `alezhorWaterAt` answers"), the gold river's first edge being the forest river's last one. Where the ground offers no
   * ribbons they are drawn on its reaches' stations instead. The estuaries are the sea's water, and the sea is drawn.
   */
  const ribbons = typeof GROUND.alezhorWaterRibbons === 'function' ? GROUND.alezhorWaterRibbons()
    : reachList().map(reach => {
      const positions = [], indices = [];
      let run = 0;
      for (const p of reach.samples) {
        if (p.estuary || !(p.half > .05) || !Number.isFinite(p.surface) || !Number.isFinite(p.nx)) { run = 0; continue; }
        positions.push(p.x + p.nx * p.half, p.surface, p.z + p.nz * p.half, p.x - p.nx * p.half, p.surface, p.z - p.nz * p.half);
        const k = positions.length / 3 - 4;
        if (run++) indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
      }
      return { id: reach.id, name: reach.name, positions, indices };
    });
  for (const ribbon of ribbons) {
    yield;
    if (!ribbon?.indices?.length) continue;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([...ribbon.positions], 3));
    geometry.setIndex([...ribbon.indices]); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
    // A ribbon is seen from above and from the bank: its faces are drawn from both sides.
    const sheet = new THREE.Mesh(geometry, kit.water);
    sheet.name = `${ALEZHOR} ${ribbon.name ?? ribbon.id ?? 'reach'} water`; sheet.receiveShadow = true; root.add(sheet);
    metrics.water++; metrics.batches++;
  }
  /**
   * And the same water as the world knows water: the ground's own `river-water` markers (`alezhorWaterColliders`),
   * which `world.waterAt` reads and nobody bumps into (src/game-state.js), so the pools are swum and the ford is waded
   * where the ground says so. The scenery is the one builder handed the world's colliders, so it is the one that lays
   * them; what they say is the ground's.
   */
  if (typeof GROUND.alezhorWaterColliders === 'function') {
    for (const marker of GROUND.alezhorWaterColliders()) { colliders.push({ ...marker }); metrics.waterMarkers++; }
  }

  // The trees: typed, harvestable, one trunk and three crown lobes each (or a spire), in three batches for the country.
  if (trees.length) {
    const spires = trees.filter(t => ALEZHOR_TREES[t.species].form === 'spire').length, rounds = trees.length - spires;
    const trunk = new THREE.InstancedMesh(kit.trunk, kit.solid, trees.length);
    const crowns = new THREE.InstancedMesh(kit.crown, kit.solid, Math.max(1, rounds * 3));
    const cones = new THREE.InstancedMesh(kit.spire, kit.solid, Math.max(1, spires));
    trunk.name = `${ALEZHOR} typed living trunks`; crowns.name = `${ALEZHOR} crowns`; cones.name = `${ALEZHOR} spire crowns`;
    const batches = [trunk, ...(rounds ? [crowns] : []), ...(spires ? [cones] : [])];
    root.add(...batches);
    for (const mesh of batches) { mesh.castShadow = true; mesh.receiveShadow = true; }
    let crownAt = 0, coneAt = 0;
    for (const [i, t] of trees.entries()) {
      if (cost >= STEP_COST) { cost = 0; yield; }
      // A tree asks the ground twice and registers itself: its registration is paid for as two more questions.
      cost += 2;
      const shape = ALEZHOR_TREES[t.species], y = ground(t.x, t.z), h = t.height, r = t.radius;
      // The trunk leans to the lee and comes out of the ground at the tree's own point - where its collider stands and
      // where it is felled from - with its foot sunk a metre below that for a slope to take. It ends inside its crown.
      axis.set(t.leeZ, 0, -t.leeX); lean.setFromAxisAngle(axis, t.lean); turn.setFromAxisAngle(Y, t.yaw);
      const cos = Math.cos(t.lean), sunk = 1.1 / cos, length = sunk + h * Math.min(.92, shape.bole + shape.deep * (shape.form === 'spire' ? .5 : 1)) / cos;
      up.set(0, length / 2 - sunk, 0).applyQuaternion(lean);
      dummy.position.set(t.x + up.x, y + up.y, t.z + up.z); dummy.quaternion.copy(lean).multiply(turn);
      dummy.scale.set(r, length, r); dummy.updateMatrix(); trunk.setMatrixAt(i, dummy.matrix);
      trunk.setColorAt(i, color.set(shape.bark));
      const handles = [{ mesh: trunk, index: i }];
      // Where along the leaning trunk the crown sits, and the crown drawn out to the lee by the same wind.
      up.set(0, h * shape.bole / cos, 0).applyQuaternion(lean);
      const cx = t.x + up.x, cy = y + up.y, cz = t.z + up.z, drift = Math.sin(t.lean) * h * .25;
      if (shape.form === 'spire') {
        // One cone from the top of the bole to the tip of the tree.
        const tall = h * (1 - shape.bole), wide = h * shape.spread;
        up.set(0, tall / 2, 0).applyQuaternion(lean);
        dummy.position.set(cx + up.x + t.leeX * drift * .3, cy + up.y, cz + up.z + t.leeZ * drift * .3); dummy.quaternion.copy(lean).multiply(turn);
        dummy.scale.set(wide, tall, wide); dummy.updateMatrix();
        cones.setMatrixAt(coneAt, dummy.matrix); cones.setColorAt(coneAt, color.set(shape.leaf).offsetHSL(range(-.015, .015), range(-.04, .04), range(-.02, .02)));
        handles.push({ mesh: cones, index: coneAt++ });
      } else {
        for (let j = 0; j < 3; j++) {
          const angle = t.yaw + j * TAU / 3, spread = h * shape.spread, offset = j === 0 ? 0 : spread * .55;
          const lee = j === 0 ? drift * .4 : drift;
          dummy.position.set(cx + Math.cos(angle) * offset + t.leeX * lee, cy + h * (shape.deep * .6 + j * .05), cz + Math.sin(angle) * offset + t.leeZ * lee);
          dummy.quaternion.copy(lean).multiply(turn);
          dummy.scale.set(spread * (j === 0 ? 1.1 : .82), h * shape.deep, spread * .8); dummy.updateMatrix();
          crowns.setMatrixAt(crownAt, dummy.matrix);
          crowns.setColorAt(crownAt, color.set(shape.leaf).multiplyScalar(.9 + j * .06).offsetHSL(range(-.015, .015), range(-.04, .04), 0));
          handles.push({ mesh: crowns, index: crownAt++ });
        }
      }
      const feet = Math.min(y, ask(t.x, t.z)), id = worldTreeId('alezhor', t.x, t.z);
      const collider = { x: t.x, z: t.z, r: r + .08, minY: feet - .9, maxY: feet + h, kind: 'tree', id };
      colliders.push(collider); metrics.colliders++;
      const { leeX: _x, leeZ: _z, lean: _lean, habitat: _w, ...facts } = t;
      registerWorldTree(colliders, { id, ...facts, y, base: { x: t.x, y, z: t.z }, harvestable: true }, handles, collider);
      metrics.trees++; metrics[TREE_COUNT[t.species]]++;
    }
    trunk.count = trees.length; crowns.count = crownAt; cones.count = coneAt;
    for (const mesh of batches) { yield; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; mesh.computeBoundingSphere(); }
    metrics.batches += batches.length; metrics.instances += trees.length + crownAt + coneAt;
  }
  // The sampled ground is let go here: the world keeps what was built, not the survey it was built from.
  return { root, metrics, trees };
}
