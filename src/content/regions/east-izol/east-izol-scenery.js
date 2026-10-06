import * as THREE from 'three';
import { finishBuild } from '../../../world/loading/build-steps.js';
import { registerWorldTree, worldTreeId } from '../../../world/scenery/tree-registry.js';
import { REGION_CELLS, hexAt } from '../../../world/terrain/region-world.js';
import { WATERLINE } from '../../../gameplay/movement/game-state.js';
import { westWaterSurface } from '../western-regions/west-ground.js';
import { IZOL_PATHS } from '../izol/izol-world.js';
import { EAST_IZOL, EAST_IZOL_ARRIVAL, EAST_IZOL_LANDMARKS, EAST_IZOL_TRAILS, eastIzolOwns } from './east-izol-world.js';
// The ground's own design, read where it is offered and never required: what covers each point (`eastIzolCover`), its
// gullies, coves and bays, the places it keeps, and the Presences.
import * as GROUND from './east-izol-world.js';
import { eastIzolWildlifeClear } from './east-izol-wildlife.js';

/**
 * **East Izol's natural cover: the eastern half of a rocky island in a warm sea.** Natural things only - nothing
 * here is anybody's: no field, wall, fold, terrace, orchard or path is drawn, and the highland tribes' flocks,
 * which keep the pasture short, are stock and are not drawn either.
 *
 * What the lore gives (`world-builder/azhora_lore/geography/regions/izol.md`): "older, harder stone: dark grey and
 * iron-brown in the lower elevations, lightening to slate-grey at height", "good pasture on its softer slopes and
 * very little else", a coast that is "high cliff faces, sheltered coves reachable by sea but not easily by land,
 * stretches of coast where the interior slopes straight to the water", and an interior that "rises progressively
 * ... toward the island's central heights" and the Three Presences. The atlas adds the climate: **Csa** on the north
 * and east coasts, **Csb** in the south-western interior, the three forest cells and the southern plains. A
 * Mediterranean island, then, drawn by its species, because the game has no seasons: short grazed pasture with
 * asphodel in it; sea turf and thrift on the headlands; **garrigue** (rosemary, thyme, cistus - low grey cushions)
 * on the dry stony ground and the sunny faces; **maquis** (lentisk, myrtle, tree heath, strawberry tree - dark,
 * dense, head-high) on the rough slopes and the shaded faces; gorse through both, which is West Izol's kit
 * (`src/content/regions/izol/izol-scenery.js`) carried over the line so the island reads as one; rock and scree at height and on the
 * headlands; **wind-bent stone pine and holm oak** in the forest cells' folds and the other sheltered hollows,
 * leaning away from the channel wind; West Izol's wind-cut thorn, lone on the pasture; juniper cut low on the
 * headlands; in the five dry gullies a bed of washed stones, with rush and oleander on the damp of their banks and
 * tamarisk toward their mouths; and in the coves sand or shingle, as the ground marks each one, with tamarisk at
 * the back of a sandy one and a bleached log now and then above the tide.
 *
 * **What decides what grows is read off the ground at build time, never written down**, because the ground
 * (`src/content/regions/east-izol/east-izol-world.js`) is still being shaped while this is written. Not one height here is a number: the
 * country is sampled every four metres when it is built (`readEastIzolGround`) and each point is given one word
 * (`habitat`) - **from the ground's own design where the ground module offers it** (`eastIzolCover`: rock, fold,
 * gully bed, kept ground, cove, cliff; `gullyAt`), so that what grows agrees with the colour the ground is painted,
 * and from what is measured there for the rest: how far it is from the sea and how much sea is round it (a
 * headland has the sea on three sides), the slope and which way it faces, how high it stands against the island's
 * own top, whether it is a knuckle of ground or a hollow against the fifty metres round it, and whose hex it is and
 * that hex's terrain and climate in the atlas. Everything repeated is instanced, the grass in tiles small enough to
 * cull; trees are typed and harvestable (`registerWorldTree`). Nothing that blocks a walker stands on a trail, at a
 * landmark, at the arrival, on a place the ground keeps for something to be built later, or inside the range of
 * anything that lives on the ground (`eastIzolWildlifeClear`), so no animal giving ground backs into a corner; and
 * no tree stands between the Hearthstone's site and any of the three Presences.
 */
const TAU = Math.PI * 2;
const SEED = 6301153;
const smooth = (a, b, x) => { const v = Math.max(0, Math.min(1, (x - a) / (b - a))); return v * v * (3 - 2 * v); };
const clamp01 = v => Math.max(0, Math.min(1, v));
const segmentDistance = (x, z, a, b) => {
  const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
};

export const EAST_IZOL_CELLS = Object.freeze(REGION_CELLS[EAST_IZOL] ?? []);
const cellKey = (q, r) => `${q},${r}`;
const CELL_BY_KEY = new Map(EAST_IZOL_CELLS.map(cell => [cellKey(cell.q, cell.r), cell]));
/**
 * **The atlas's climate, hex by hex**: Csb (warm summer) in the south-western interior, the three forest cells and
 * the southern plains; Csa (hot summer) on the north and the east coasts. Csa's ground is the drier: more
 * garrigue, tawnier grass. Read off the World Builder's atlas into the brief (13 Csb, 14 Csa); the ground module's
 * own table wins if it offers one (`EAST_IZOL_CLIMATE`, keyed "q,r").
 */
const CSB = new Set(['11,124', '12,124', '10,125', '11,125', '9,126', '10,126', '11,126', '8,127', '9,127', '10,127', '8,128', '9,128', '8,129']);
export const EAST_IZOL_CLIMATE = Object.freeze(Object.fromEntries(EAST_IZOL_CELLS.map(cell => {
  const key = cellKey(cell.q, cell.r);
  return [key, GROUND.EAST_IZOL_CLIMATE?.[key] ?? (CSB.has(key) ? 'Csb' : 'Csa')];
})));
/** The East Izol hex a point is on, or the nearest one to it (for the shore that runs past the atlas's grid). */
export function eastIzolCellAt(x, z) {
  const { q, r } = hexAt(x, z), own = CELL_BY_KEY.get(cellKey(q, r));
  if (own) return own;
  let best = null, nearest = Infinity;
  for (const cell of EAST_IZOL_CELLS) { const d = Math.hypot(cell.x - x, cell.z - z); if (d < nearest) { nearest = d; best = cell; } }
  return best;
}

// ---------------------------------------------------------------------------
// What must be kept clear
// ---------------------------------------------------------------------------
/** The walked lines: East Izol's own trails, and the end of West Izol's Hearth Road, which runs onto this ground. */
const TRAILS = [...EAST_IZOL_TRAILS, ...IZOL_PATHS].filter(trail => trail.points.some(p => p.x > 380 && p.z > 1300 && p.z < 2250));
/** How far a point is from the nearest trail's edge (negative on it), or Infinity. */
export function eastIzolTrailDistance(x, z) {
  let best = Infinity;
  for (const trail of TRAILS) {
    const half = (trail.width ?? 3) / 2;
    for (let i = 1; i < trail.points.length; i++) best = Math.min(best, segmentDistance(x, z, trail.points[i - 1], trail.points[i]) - half);
  }
  return best;
}
/**
 * **The places the ground keeps for something to be built later**: the Hearthstone's site, Merrath's flat and a
 * platform on each Presence (the brief: "shape the ground round them, build nothing on them"). They are the ground
 * module's to name and place; this reads whatever it exports as a reserved place - a list of
 * `{ x, z, radius }` circles or `{ x, z, halfX, halfZ, yaw? }` boxes - and keeps them in grass and flowers and
 * nothing else: no shrub, stone or tree.
 */
function reservedPlaces() {
  const out = [];
  const take = entry => {
    if (!entry || !Number.isFinite(entry.x) || !Number.isFinite(entry.z)) return;
    if (Number.isFinite(entry.radius ?? entry.r)) out.push({ x: entry.x, z: entry.z, radius: entry.radius ?? entry.r });
    else if (Number.isFinite(entry.halfX) && Number.isFinite(entry.halfZ)) out.push({ x: entry.x, z: entry.z, halfX: entry.halfX, halfZ: entry.halfZ, yaw: entry.yaw ?? 0 });
  };
  const list = GROUND.EAST_IZOL_RESERVED;
  if (Array.isArray(list)) list.forEach(take);
  else if (list && typeof list === 'object') Object.values(list).forEach(value => Array.isArray(value) ? value.forEach(take) : take(value));
  return out;
}
const RESERVED = reservedPlaces();
/** Inside a reserved place, `margin` metres out. */
export function eastIzolReserved(x, z, margin = 0) {
  for (const place of RESERVED) {
    if (place.radius !== undefined) { if (Math.hypot(x - place.x, z - place.z) < place.radius + margin) return true; continue; }
    const c = Math.cos(place.yaw), s = Math.sin(place.yaw), dx = x - place.x, dz = z - place.z;
    const a = dx * c - dz * s, b = dx * s + dz * c;
    if (Math.abs(a) < place.halfX + margin && Math.abs(b) < place.halfZ + margin) return true;
  }
  return false;
}
const LANDMARK_POINTS = [...EAST_IZOL_LANDMARKS, EAST_IZOL_ARRIVAL].filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.z));
/**
 * Where no shrub grows, blocking or not: a trail and a metre and a half either side of it, five metres round a
 * landmark's point or the arrival, and a reserved place. `margin` is the thing's reach.
 */
export function eastIzolPathClear(x, z, margin = 0) {
  for (const p of LANDMARK_POINTS) if (Math.hypot(x - p.x, z - p.z) < 5 + margin) return true;
  if (eastIzolTrailDistance(x, z) < 1.4 + margin) return true;
  return eastIzolReserved(x, z, margin);
}
/**
 * Where nothing that blocks a walker may stand: all of the above, and any ground animal's range as well. Gorse,
 * garrigue and the low maquis stop nobody, so they grow among the hares; a trunk, a boulder or a head-high bush is a
 * corner for an animal giving ground, so none stands in a range.
 */
export function eastIzolSceneryClear(x, z, margin = 0) {
  return eastIzolPathClear(x, z, margin) || eastIzolWildlifeClear(x, z, margin);
}
/**
 * **The Hearthstone's sightlines.** The Assembly is sworn at the Hearthstone "where all three presences can witness it"
 * (the lore), so from the site the ground keeps for it (`EAST_IZOL_RESERVED`, the `hearthstone-site`) no tree stands in
 * the way of any of the three summits: a corridor six metres either side of each line, out three-quarters of the way
 * to the peak, where the ground has risen past anything a tree could hide. A bush is too low to matter.
 */
const HEARTH = (GROUND.EAST_IZOL_RESERVED ?? []).find(place => /hearth/i.test(place.id ?? '')) ?? null;
const SUMMITS = (GROUND.EAST_IZOL_PRESENCES ?? []).filter(p => Number.isFinite(p.x) && Number.isFinite(p.z));
export const EAST_IZOL_SIGHTLINES = Object.freeze(HEARTH ? SUMMITS.map(p => Object.freeze({ id: p.id, a: Object.freeze({ x: HEARTH.x, z: HEARTH.z }),
  b: Object.freeze({ x: HEARTH.x + (p.x - HEARTH.x) * .75, z: HEARTH.z + (p.z - HEARTH.z) * .75 }), half: 6 })) : []);
export function eastIzolSightline(x, z, margin = 0) {
  return EAST_IZOL_SIGHTLINES.some(line => segmentDistance(x, z, line.a, line.b) < line.half + margin);
}
/** Water over the ground here, if any: the sea (the world's waterline), or a western water's own surface. */
export function eastIzolWaterAt(x, z, ground) {
  if (ground < WATERLINE) return WATERLINE;
  const surface = westWaterSurface(x, z);
  return surface !== null && surface > ground + .02 ? surface : null;
}

// ---------------------------------------------------------------------------
// The ground, read at build time
// ---------------------------------------------------------------------------
/**
 * The words a point can be, and the measurements that decide them. Lengths in metres; `rise` is height over the
 * island's own highest sampled point; `exposure` is the share of the sea in the 160 metres round a point (about a
 * half on a straight shore, more on a headland, less in a cove); `swell` is height against the mean of the 56
 * metres round it (positive on a knoll, negative in a hollow): local, because a wider window on this island measures
 * nothing but how near the Presences a point is. The `...Share` numbers are read against the ground's own design where it
 * offers one (`eastIzolCover`, src/content/regions/east-izol/east-izol-world.js).
 */
export const EAST_IZOL_HABITAT = Object.freeze({
  strandReach: 9, strandTop: 2.6, strandSlope: .42, coveReach: 15,
  cliffReach: 24, cliffSlope: .7, cragSlope: .9,
  headlandReach: 64, headlandExposure: .5, turfReach: 40,
  heightRise: .55, steepRise: .38, steepSlope: .5, heightFloor: 40,
  woodSlope: .62, woodFold: .08, woodShade: .3, woodExposure: .45,
  foldDepth: .9, foldSlope: .5, foldExposure: .42, foldShare: .3,
  rockShare: .55, keptShare: .5, bedShare: .5, bankReach: 5, mouthReach: 70,
  maquisSlope: .4, shadeSlope: .26, garrigueSlope: .26, knoll: 2.2, sunSlope: .18, drySlope: .21, dryKnoll: .3,
});
export const EAST_IZOL_HABITATS = Object.freeze(['sea', 'strand', 'bed', 'cliff', 'crag', 'kept', 'bank', 'headland', 'height', 'wood', 'fold',
  'maquis', 'garrigue', 'turf', 'pasture']);
/** A gully's length down its line, for how near its mouth a point on its bank is. */
const gullyLength = gully => gully.points.reduce((n, p, i) => i ? n + Math.hypot(p.x - gully.points[i - 1].x, p.z - gully.points[i - 1].z) : 0, 0);
/**
 * Whether a strand is shingle: the ground marks which coves are (`EAST_IZOL_COVES[].shingle`); its two bays and the
 * other coves are sand, and any other foot of the coast - the slope under the northern Presence - is stones.
 */
export function eastIzolShingle(x, z) {
  for (const c of GROUND.EAST_IZOL_COVES ?? []) if (Math.hypot(x - c.x, z - c.z) < c.beach + 7) return !!c.shingle;
  for (const b of GROUND.EAST_IZOL_BAYS ?? []) if (segmentDistance(x, z, b.a, b.b) < b.beach + 10) return false;
  return true;
}

/**
 * The ground of East Izol, sampled every `STEP` metres at build time: height, whose it is, whether the sea is over
 * it, how far it is from the sea and how much sea is round it, the swell, the slope and its aspect, the atlas's hex
 * under it, and - where the ground module offers its design - what that design says covers the ground there (rock,
 * fold, gully bed, kept ground, cove, cliff) and how near a gully's line it is. `sample(x, z)` answers the nearest
 * node; `habitat(x, z)` turns that into one word.
 */
export function* readEastIzolGround(heightAt) {
  const STEP = 4, PAD = 96, R = 7, W = 20;
  const minX = Math.min(...EAST_IZOL_CELLS.map(c => c.x)) - 50 - PAD, maxX = Math.max(...EAST_IZOL_CELLS.map(c => c.x)) + 50 + PAD;
  const minZ = Math.min(...EAST_IZOL_CELLS.map(c => c.z)) - 58 - PAD, maxZ = Math.max(...EAST_IZOL_CELLS.map(c => c.z)) + 58 + PAD;
  const nx = Math.ceil((maxX - minX) / STEP) + 1, nz = Math.ceil((maxZ - minZ) / STEP) + 1, n = nx * nz;
  const height = new Float32Array(n), own = new Uint8Array(n), wet = new Uint8Array(n), sea = new Float32Array(n).fill(1e6);
  const cellIndex = new Int16Array(n).fill(-1), cellList = [...EAST_IZOL_CELLS];
  // The design, where the ground offers it: each share 0 to 1, and a gully's edge and mouth in metres.
  const designed = typeof GROUND.eastIzolCover === 'function', gullied = typeof GROUND.gullyAt === 'function';
  const rock = new Float32Array(n), fold = new Float32Array(n), bed = new Float32Array(n), kept = new Float32Array(n);
  const cove = new Float32Array(n), cliff = new Float32Array(n), bank = new Float32Array(n).fill(Infinity), mouth = new Float32Array(n).fill(Infinity);
  const lengths = new Map((GROUND.EAST_IZOL_GULLIES ?? []).map(g => [g.id, gullyLength(g)]));
  // Steps are paid for by what they cost: a node of sea is a height, a node of this country's ground is a height, an
  // owner, a hex and the design's whole account of it, about four times as much.
  let work = 0, cost = 0, top = -Infinity;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    if (cost >= 48) { cost = 0; yield; }
    cost++;
    const x = minX + i * STEP, z = minZ + j * STEP, k = j * nx + i, h = heightAt(x, z);
    height[k] = h;
    if (eastIzolWaterAt(x, z, h) !== null) { wet[k] = 1; sea[k] = 0; continue; }
    if (!eastIzolOwns(x, z)) continue;
    own[k] = 1; top = Math.max(top, h);
    cellIndex[k] = cellList.indexOf(eastIzolCellAt(x, z));
    if (designed) {
      cost += 3;
      const c = GROUND.eastIzolCover(x, z);
      rock[k] = c.rock; fold[k] = c.fold; bed[k] = c.bed; kept[k] = c.kept; cove[k] = c.cove; cliff[k] = c.cliff;
    }
    if (gullied) {
      const g = GROUND.gullyAt(x, z);
      if (g) { bank[k] = g.distance - (g.gully.half ?? 3); mouth[k] = Math.max(0, (lengths.get(g.gully.id) ?? g.along) - g.along); }
    }
  }
  // Distance to the sea: a two-pass chamfer over the grid, in metres.
  const D = STEP, DD = STEP * Math.SQRT2;
  for (let j = 0; j < nz; j++) { if (++work % 8 === 0) yield; for (let i = 0; i < nx; i++) {
    const k = j * nx + i; let d = sea[k];
    if (i) d = Math.min(d, sea[k - 1] + D);
    if (j) { d = Math.min(d, sea[k - nx] + D); if (i) d = Math.min(d, sea[k - nx - 1] + DD); if (i < nx - 1) d = Math.min(d, sea[k - nx + 1] + DD); }
    sea[k] = d;
  } }
  for (let j = nz - 1; j >= 0; j--) { if (++work % 8 === 0) yield; for (let i = nx - 1; i >= 0; i--) {
    const k = j * nx + i; let d = sea[k];
    if (i < nx - 1) d = Math.min(d, sea[k + 1] + D);
    if (j < nz - 1) { d = Math.min(d, sea[k + nx] + D); if (i < nx - 1) d = Math.min(d, sea[k + nx + 1] + DD); if (i) d = Math.min(d, sea[k + nx - 1] + DD); }
    sea[k] = d;
  } }
  // The swell and the exposure: two summed-area tables, one of height and one of sea.
  const SW = nx + 1, hSum = new Float64Array(SW * (nz + 1)), sSum = new Float64Array(SW * (nz + 1));
  for (let j = 0; j < nz; j++) { if (++work % 8 === 0) yield; let hRow = 0, sRow = 0;
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i; hRow += Math.max(height[k], WATERLINE - 2); sRow += wet[k];
      hSum[(j + 1) * SW + i + 1] = hSum[j * SW + i + 1] + hRow; sSum[(j + 1) * SW + i + 1] = sSum[j * SW + i + 1] + sRow;
    } }
  const boxMean = (table, i, j, half) => {
    const i0 = Math.max(0, i - half), i1 = Math.min(nx - 1, i + half), j0 = Math.max(0, j - half), j1 = Math.min(nz - 1, j + half);
    const total = table[(j1 + 1) * SW + i1 + 1] - table[j0 * SW + i1 + 1] - table[(j1 + 1) * SW + i0] + table[j0 * SW + i0];
    return total / ((i1 - i0 + 1) * (j1 - j0 + 1));
  };
  const swell = new Float32Array(n), slope = new Float32Array(n), north = new Float32Array(n), exposure = new Float32Array(n);
  for (let j = 0; j < nz; j++) { if (++work % 8 === 0) yield; for (let i = 0; i < nx; i++) {
    const k = j * nx + i;
    swell[k] = height[k] - boxMean(hSum, i, j, R);
    exposure[k] = boxMean(sSum, i, j, W);
    const e = height[j * nx + Math.min(nx - 1, i + 1)], w = height[j * nx + Math.max(0, i - 1)];
    const s = height[Math.min(nz - 1, j + 1) * nx + i], nn = height[Math.max(0, j - 1) * nx + i];
    const gx = (e - w) / (2 * STEP), gz = (s - nn) / (2 * STEP), g = Math.hypot(gx, gz);
    slope[k] = g;
    // A face is north-facing when the ground climbs toward the south (+z): what it looks at is the north.
    north[k] = g > .02 ? gz / g : 0;
  } }
  const node = (x, z) => {
    const i = Math.max(0, Math.min(nx - 1, Math.round((x - minX) / STEP))), j = Math.max(0, Math.min(nz - 1, Math.round((z - minZ) / STEP)));
    return j * nx + i;
  };
  const rise = h => Math.max(0, h) / Math.max(1, top);
  function sample(x, z) {
    const k = node(x, z), cell = cellIndex[k] >= 0 ? cellList[cellIndex[k]] : null;
    return { height: height[k], own: own[k] === 1, wet: wet[k] === 1, sea: sea[k], swell: swell[k], slope: slope[k], north: north[k],
      exposure: exposure[k], rise: rise(height[k]), cell, terrain: cell?.terrain ?? null,
      climate: cell ? EAST_IZOL_CLIMATE[cellKey(cell.q, cell.r)] : null,
      design: designed && own[k] ? { rock: rock[k], fold: fold[k], bed: bed[k], kept: kept[k], cove: cove[k], cliff: cliff[k] } : null,
      bank: bank[k], mouth: mouth[k] };
  }
  /**
   * One word for a point, in the order the ground decides it, and **from the ground's own design where the world
   * module offers it** (`eastIzolCover`, `gullyAt`: src/content/regions/east-izol/east-izol-world.js), so that what grows agrees with the colour
   * the ground is painted: the sea; the **strand** of a cove or a bay at the waterline; a gully's **bed** of washed
   * stones; the **cliff**, steep ground over the sea; bare rock - a **crag**, or the **height** where it is the
   * Presences' upper ground; ground **kept** for something to be built, which carries grass and nothing else; a
   * gully's damp **bank**; the **headland**, exposed ground with the sea round most of it; the **wood**, the folds of
   * the atlas's forest cells; a **fold**, sheltered hollow ground anywhere else; **maquis** on the rough slopes and the
   * shaded (north-facing) faces; **garrigue** on the dry stony ground - the sunny faces, the knolls, the hot Csa coast;
   * **turf** - sea turf - on the gentle ground near the shore; and **pasture**, the softer slopes, for the rest.
   * Without the design, the same words come off the sampled ground alone.
   */
  function habitat(x, z, here = sample(x, z)) {
    const H = EAST_IZOL_HABITAT;
    if (here.wet) {
      // The node is the sea's, but the point between it and the land may not be: the waterline is finer than the grid.
      if (eastIzolWaterAt(x, z, heightAt(x, z)) !== null) return 'sea';
      here = { ...here, wet: false, sea: 0 };
    }
    const d = here.design;
    if (here.height < H.strandTop && here.slope < H.strandSlope && (d ? d.cove > .5 && here.sea <= H.coveReach : here.sea <= H.strandReach)) return 'strand';
    if (d && d.bed > H.bedShare) return 'bed';
    if (here.sea <= H.cliffReach && here.slope > H.cliffSlope) return 'cliff';
    if (d ? d.rock > H.rockShare : here.slope > H.cragSlope)
      return here.height > H.heightFloor && here.rise > H.steepRise ? 'height' : 'crag';
    if (d && d.kept > H.keptShare) return 'kept';
    if (here.bank < H.bankReach && here.slope < H.foldSlope) return 'bank';
    if (here.sea < H.headlandReach && here.exposure > H.headlandExposure) return 'headland';
    if (here.height > H.heightFloor && (here.rise > H.heightRise || (here.rise > H.steepRise && here.slope > H.steepSlope))) return 'height';
    // A forest hex's wood: its fold, the fold's shaded flanks and any hollow out of the wind; its sunny spurs are maquis.
    if (here.terrain === 'forest' && here.slope < H.woodSlope && here.exposure < H.woodExposure
      && ((d ? d.fold > H.woodFold : here.swell < -H.foldDepth) || (here.north > H.woodShade && here.slope > .1) || here.swell < -.3)) return 'wood';
    if (here.slope < H.foldSlope && (d ? d.fold > H.foldShare : here.swell < -H.foldDepth && here.exposure < H.foldExposure)) return 'fold';
    const sunny = here.north < -.45 && here.slope > H.sunSlope, shaded = here.north > .4 && here.slope > H.shadeSlope;
    if (here.slope > H.maquisSlope || shaded) return 'maquis';
    if (here.slope > H.garrigueSlope || here.swell > H.knoll || sunny || (here.climate === 'Csa' && here.slope > H.drySlope && here.swell > H.dryKnoll)) return 'garrigue';
    if (here.sea < H.turfReach) return 'turf';
    return 'pasture';
  }
  return { minX, maxX, minZ, maxZ, step: STEP, top, sample, habitat, designed };
}

// ---------------------------------------------------------------------------
// The kit
// ---------------------------------------------------------------------------
const geometries = {};
function bladeGeometry(blades, spread, width, base, step) {
  const positions = [], normals = [];
  for (let blade = 0; blade < blades; blade++) {
    const a = blade * (TAU / blades) * 1.07, lean = spread + blade % 3 * spread * .5;
    const bx = Math.cos(a) * spread, bz = Math.sin(a) * spread, h = base + (blade % 3) * step;
    const cx = Math.cos(a + Math.PI / 2) * width, cz = Math.sin(a + Math.PI / 2) * width;
    positions.push(bx - cx, 0, bz - cz, bx + cx, 0, bz + cz, bx + Math.cos(a) * lean, h, bz + Math.sin(a) * lean);
    for (let i = 0; i < 3; i++) normals.push(0, 1, 0);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.computeBoundingSphere();
  return geometry;
}
function shared() {
  if (geometries.ready) return geometries;
  Object.assign(geometries, {
    ready: true,
    // Grazed and wind-cut: the island's grass is short everywhere the flocks and the sea wind reach it.
    pasture: bladeGeometry(7, .1, .036, .3, .12),
    // Sea turf: finer, denser and shorter again, the salt-pruned sward of the cliff tops and the headlands.
    turf: bladeGeometry(9, .085, .026, .17, .07),
    // Rush: upright, dark and stiff, in the damp at a gully's edge.
    rush: bladeGeometry(7, .06, .02, .55, .22),
    lobe: new THREE.IcosahedronGeometry(1, 0),
    stone: new THREE.IcosahedronGeometry(1, 0),
    trunk: new THREE.CylinderGeometry(1, 1.16, 1, 7),
    crown: new THREE.IcosahedronGeometry(1, 1),
    blades: new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide }),
    solid: new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }),
  });
  return geometries;
}

/**
 * The trees, by species: height range, trunk radius, how far up the trunk the crown starts, the crown's spread and
 * depth (both against the height), how far the wind can lay it over, and the colours. Every species is in the
 * timber table (`src/gameplay/skills/woodcutting/wood-species.js`), so every one is harvestable. The stone pine is West Izol's tree; the holm
 * oak is the evergreen oak of the Mediterranean folds; the juniper stands in for the island's low coastal juniper
 * (the timber table has no other); the tamarisk is the salt-tolerant tree at the back of a beach.
 */
export const EAST_IZOL_TREES = Object.freeze({
  'stone-pine': Object.freeze({ h: [6.5, 11.5], r: [.2, .32], bole: .78, spread: .3, deep: .09, lean: [.1, .34], bark: '#5f5240', leaf: '#3f5748' }),
  'holm-oak': Object.freeze({ h: [5, 8.5], r: [.22, .36], bole: .42, spread: .3, deep: .24, lean: [.02, .12], bark: '#504a41', leaf: '#3b4c35' }),
  'common-juniper': Object.freeze({ h: [1.6, 3.4], r: [.1, .16], bole: .25, spread: .2, deep: .3, lean: [.12, .4], bark: '#5a4c3e', leaf: '#3c5440' }),
  tamarisk: Object.freeze({ h: [3, 5.5], r: [.12, .2], bole: .38, spread: .27, deep: .26, lean: [.05, .18], bark: '#6b5d4e', leaf: '#86977f' }),
  // West Izol's wind-cut thorn (`src/content/regions/izol/izol-scenery.js`), carried over the line as the tree it is.
  hawthorn: Object.freeze({ h: [2.6, 4.6], r: [.13, .2], bole: .34, spread: .3, deep: .22, lean: [.16, .42], bark: '#5f5446', leaf: '#56683f' }),
});
/**
 * **The channel wind.** West Izol's roofs are "weighted against the channel wind", and the channel is to the
 * north-west; a tree that grows in the open on this island leans away from it, to the south-east, and the more
 * exposed it stands the further it leans. Not a law of the lore, the builder's reading of it.
 */
const LEE = Object.freeze({ x: Math.SQRT1_2, z: Math.SQRT1_2 });
/** A maquis bush taller than this (its scale) is head-high and carries a collider. */
const MAQUIS_TALL = 1.45;

export function createEastIzolScenery(...args) { return finishBuild(createEastIzolScenerySteps(...args)); }
/** East Izol's scenery: what grows on the island's eastern half, and the stone and the shore. */
export function* createEastIzolScenerySteps({ parent, heightAt, candidateHeightAt = heightAt, renderedGroundHeight = heightAt, colliders }) {
  const kit = shared();
  const root = new THREE.Group(); root.name = `${EAST_IZOL} - pasture, maquis, garrigue, rock and the coves`; parent.add(root);
  const metrics = { blocks: 0, turf: 0, pasture: 0, forbs: 0, asphodel: 0, thrift: 0, garrigue: 0, maquis: 0, gorse: 0,
    stones: 0, boulders: 0, outcrops: 0, scree: 0, shingle: 0, cobbles: 0, driftwood: 0, rushes: 0, oleander: 0,
    trees: 0, pines: 0, oaks: 0, junipers: 0, tamarisks: 0, thorns: 0, batches: 0, instances: 0, colliders: 0, habitats: {} };
  let seed = SEED, work = 0;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a, b) => a + random() * (b - a);
  const field = yield* readEastIzolGround(candidateHeightAt);
  const dry = (x, z, lift = .08) => { const h = candidateHeightAt(x, z); return eastIzolWaterAt(x, z, h) === null && h > WATERLINE + lift; };
  const plantable = (x, z) => eastIzolOwns(x, z) && dry(x, z);
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
  const forbs = [], garrigue = [], maquis = [], gorse = [], stones = [], shingle = [], cobbles = [], driftwood = [], trees = [];
  const shrubSpace = spacer(6), treeSpace = spacer(8), boulderSpace = spacer(10);

  // -------------------------------------------------------------------------
  // The ground, ten metres at a time
  // -------------------------------------------------------------------------
  /**
   * Every ten-metre block of the survey that has any of this country's dry ground in it is planted from the one
   * seeded stream, in a fixed order, so the same ground grows the same island. What a block grows is decided per
   * candidate by the word for the ground under it, from the tables below.
   */
  const BLOCK = 10;
  const CHANCE = Object.freeze({
    //          grass forb  garr. maquis gorse stone tree
    sea:      [0,    0,    0,    0,    0,    0,    0],
    strand:   [.12,  .04,  0,    0,    0,    .14,  0],
    bed:      [.06,  .03,  0,    0,    0,    .3,   0],
    kept:     [.95,  .28,  0,    0,    0,    0,    0],
    bank:     [.95,  .18,  .02,  .62,  .04,  .1,   .14],
    cliff:    [.25,  .3,   .18,  0,    .04,  .75,  0],
    crag:     [.18,  .06,  .3,   .04,  .06,  .9,   .01],
    headland: [.92,  .42,  .4,   .03,  .16,  .42,  .03],
    height:   [.5,   .1,   .55,  .1,   .1,   .7,   .02],
    wood:     [.32,  .04,  .02,  .5,   .04,  .07,  .8],
    fold:     [.88,  .16,  .04,  .55,  .1,   .08,  .26],
    maquis:   [.5,   .08,  .2,   .78,  .28,  .22,  .03],
    garrigue: [.55,  .14,  .8,   .1,   .42,  .36,  .02],
    turf:     [.95,  .32,  .1,   0,    .05,  .1,   0],
    pasture:  [.9,   .3,   .05,  .03,  .07,  .06,  .08],
  });
  for (let bz = field.minZ; bz < field.maxZ; bz += BLOCK) {
    yield;
    for (let bx = field.minX; bx < field.maxX; bx += BLOCK) {
      if (++work % 2 === 0) yield;
      // Anything of ours here? The block's centre and corners, off the survey that is already in hand.
      const probes = [[5, 5], [0, 0], [BLOCK, 0], [0, BLOCK], [BLOCK, BLOCK]].map(([dx, dz]) => field.sample(bx + dx, bz + dz));
      if (!probes.some(p => p.own)) continue;
      metrics.blocks++;
      // The census: what the ground is, a hundred square metres to a word, from the middle of the block.
      if (probes[0].own) { const word = field.habitat(bx + 5, bz + 5, probes[0]); metrics.habitats[word] = (metrics.habitats[word] ?? 0) + 1; }
      const point = () => ({ x: bx + random() * BLOCK, z: bz + random() * BLOCK });
      const look = (x, z) => { const here = field.sample(x, z); return { here, word: field.habitat(x, z, here) }; };
      // **Grass**: four goes a block. The island is grazed and wind-cut, so it is short everywhere; it is sea turf
      // near the shore and on the headlands, pasture inland. On a trail's own width it does not grow.
      for (let i = 0; i < 4; i++) {
        const { x, z } = point();
        if (!plantable(x, z) || eastIzolTrailDistance(x, z) < 0) continue;
        const { here, word } = look(x, z);
        if (random() > CHANCE[word][0]) continue;
        const turf = word === 'turf' || word === 'headland' || word === 'cliff' || word === 'strand' || (word === 'height' && here.rise > .8);
        // Rush in the damp at a gully's edge: the one place on the island the winter's water lies a while.
        const rush = (word === 'bank' && here.bank < 2.5 && random() < .55) || (word === 'bed' && random() < .5);
        const s = range(.8, 1.3) * (word === 'fold' || word === 'bank' ? 1.3 : word === 'wood' ? 1.15 : word === 'garrigue' || word === 'height' ? .85 : 1);
        tufts(rush ? 'rush' : turf ? 'turf' : 'pasture', x, z).push({ x, z, s, rot: random() * TAU, word, rise: here.rise, csa: here.climate === 'Csa', north: here.north });
        if (rush) metrics.rushes++; else if (turf) metrics.turf++; else metrics.pasture++;
      }
      // **Forbs**: asphodel in the pasture - the white spikes of grazed Mediterranean grass, which the flocks leave
      // standing - thrift on the turf and the cliff tops, and yellow composites everywhere the grass is. Nobody
      // walks round a flower, so none carries a collider.
      {
        const { x, z } = point();
        if (roomy(x, z, .4) && eastIzolTrailDistance(x, z) > .4) {
          const { here, word } = look(x, z);
          if (random() < CHANCE[word][1] && here.slope < .9) {
            const kind = word === 'headland' || word === 'cliff' || word === 'turf' ? (random() < .7 ? 'thrift' : 'composite')
              : word === 'pasture' || word === 'fold' || word === 'kept' ? (random() < .55 ? 'asphodel' : 'composite')
              : random() < .5 ? 'composite' : 'thrift';
            forbs.push({ x, z, s: range(.5, .95), h: range(.7, 1.2), rot: random() * TAU, kind });
          }
        }
      }
      // **Garrigue**: low grey aromatic cushions - rosemary, thyme, cistus - on the dry stony ground, two goes a
      // block. Under the knee; no collider.
      for (let i = 0; i < 2; i++) {
        const { x, z } = point();
        if (!roomy(x, z, .5) || eastIzolPathClear(x, z, .4)) continue;
        const { here, word } = look(x, z);
        if (here.slope > 1.1 || random() > CHANCE[word][2] * (here.climate === 'Csa' ? 1 : .8) || !shrubSpace.free(x, z, 1.5)) continue;
        const pick = random();
        garrigue.push(shrubSpace.add({ x, z, s: range(.32, .72) * (word === 'headland' || word === 'cliff' ? .8 : 1), rot: random() * TAU,
          kind: pick < .38 ? 'rosemary' : pick < .7 ? 'cistus' : 'thyme', bloom: random() < .45 }));
      }
      // **Maquis**: dense dark evergreen shrubs - lentisk, myrtle, tree heath, strawberry tree - on the rough slopes,
      // the shaded faces, the folds and under the trees. The tallest are head-high and stop a walker.
      for (let i = 0; i < 2; i++) {
        const { x, z } = point();
        if (!roomy(x, z, .8) || eastIzolPathClear(x, z, 1.2)) continue;
        const { here, word } = look(x, z);
        if (here.slope > .85 || random() > CHANCE[word][3] * (here.climate === 'Csb' ? 1 : .85) || !shrubSpace.free(x, z, 2.2)) continue;
        const ranged = eastIzolWildlifeClear(x, z, 1.2);
        const pick = random();
        // Oleander is the shrub of a dry Mediterranean gully - pink, head-high, along the bed - and nowhere else here.
        const kind = word === 'bank' ? (pick < .6 ? 'oleander' : pick < .85 ? 'myrtle' : 'lentisk')
          : pick < .4 ? 'lentisk' : pick < .66 ? 'myrtle' : pick < .86 ? 'heath' : 'arbutus';
        const size = range(.7, 1.75) * (word === 'wood' ? .85 : 1);
        maquis.push(shrubSpace.add({ x, z, s: ranged ? Math.min(size, MAQUIS_TALL - .05) : size, rot: random() * TAU, kind }));
      }
      // **Gorse**, West Izol's own shrub, carried across the line: the island's yellow.
      {
        const { x, z } = point();
        if (roomy(x, z, .6) && !eastIzolPathClear(x, z, .6)) {
          const { here, word } = look(x, z);
          if (here.slope < .9 && random() < CHANCE[word][4] && shrubSpace.free(x, z, 2)) gorse.push(shrubSpace.add({ x, z, s: range(.7, 1.4), rot: random() * TAU }));
        }
      }
      // **Stone**: "rocky throughout" - cobbles everywhere a little, bedrock breaking through on the headlands, the
      // knolls and the heights, and the slate-grey crags and their scree. A boulder a metre across stops a walker.
      {
        const { x, z } = point();
        if (plantable(x, z) && eastIzolTrailDistance(x, z) > .3 && !eastIzolReserved(x, z)) {
          const { here, word } = look(x, z);
          if (random() < CHANCE[word][5]) {
            const rocky = word === 'crag' || word === 'cliff' || word === 'height' || word === 'headland';
            const big = rocky ? random() < .3 : random() < .07;
            const s = big ? range(1, 2.4) : range(.2, .65);
            if (!(big && (eastIzolSceneryClear(x, z, s + .4) || !boulderSpace.free(x, z, 6)))) {
              const stone = { x, z, s, big, rot: random() * TAU, flat: big ? range(.48, .78) : range(.35, .62), rise: here.rise, sea: here.sea, tint: random() };
              stones.push(stone); if (big) boulderSpace.add(stone);
              if (big && rocky && random() < .5) {
                // An outcrop: two or three more blocks leaning on the first, the island's bedrock showing through.
                for (let k = 0; k < 2 + (random() < .4 ? 1 : 0); k++) {
                  const a = random() * TAU, d = s * range(.7, 1.2), px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
                  if (!plantable(px, pz) || eastIzolSceneryClear(px, pz, s)) continue;
                  stones.push({ x: px, z: pz, s: s * range(.5, .85), big: true, rot: random() * TAU, flat: range(.5, .8), rise: here.rise, sea: here.sea, tint: random(), outcrop: true });
                }
                metrics.outcrops++;
              }
              // Scree: under a crag or a height's steep face, a spill of small stones down the slope.
              if (word === 'crag' || (word === 'height' && here.slope > .55)) {
                for (let k = 0; k < 3; k++) {
                  const px = x + range(-3, 3), pz = z + range(-3, 3);
                  if (!plantable(px, pz) || eastIzolTrailDistance(px, pz) < .3) continue;
                  stones.push({ x: px, z: pz, s: range(.12, .32), big: false, rot: random() * TAU, flat: range(.35, .55), rise: here.rise, sea: here.sea, tint: random(), scree: true });
                  metrics.scree++;
                }
              }
            }
          }
        }
      }
      // **Trees, only where the ground shelters them**: holm oak and stone pine in the forest cells' folds and the
      // sheltered hollows; a wind-bent pine on a rough slope now and then; juniper cut low on the headlands and the
      // garrigue; a lone holm oak in the pasture; and tamarisk at the back of a cove. Two goes a block in the woods.
      for (let i = 0; i < 4; i++) {
        const { x, z } = point();
        if (!plantable(x, z) || eastIzolSceneryClear(x, z, 2) || eastIzolSightline(x, z, 2)) continue;
        const { here, word } = look(x, z);
        if (here.slope > .7) continue;
        const backOfCove = word === 'strand' && here.sea > 4 && !eastIzolShingle(x, z);
        const lowBank = word === 'bank' && here.mouth < EAST_IZOL_HABITAT.mouthReach;
        let chance = backOfCove ? .12 : lowBank ? .3 : word === 'maquis' && here.terrain === 'forest' ? .16 : CHANCE[word][6];
        if (word === 'wood') chance *= here.swell < -.3 ? 1.1 : here.swell > .8 ? .5 : .85;
        if (i && word !== 'wood') continue;
        if (random() > chance) continue;
        const species = backOfCove || lowBank ? 'tamarisk'
          : word === 'garrigue' ? (random() < .65 ? 'common-juniper' : 'hawthorn')
          : word === 'headland' || word === 'crag' ? 'common-juniper'
          : word === 'height' ? (random() < .55 ? 'common-juniper' : 'stone-pine')
          : word === 'pasture' ? (random() < .75 ? 'hawthorn' : 'holm-oak')
          : word === 'maquis' ? (random() < .7 ? 'stone-pine' : 'holm-oak')
          : word === 'bank' ? (random() < .65 ? 'holm-oak' : 'stone-pine')
          : here.climate === 'Csb' ? (random() < .58 ? 'holm-oak' : 'stone-pine') : (random() < .45 ? 'holm-oak' : 'stone-pine');
        const gap = species === 'common-juniper' || species === 'tamarisk' || species === 'hawthorn' ? 4 : word === 'wood' ? 4.5 : 7;
        if (!treeSpace.free(x, z, gap)) continue;
        trees.push(treeSpace.add(tree(species, x, z, here)));
      }
      // **The coves**: shingle at the waterline where a beach is open to the sea, a scatter of it at the back of a
      // sandy one, and now and then a bleached log the sea has left above the tide.
      if (probes.some(p => p.sea <= EAST_IZOL_HABITAT.strandReach + 2)) {
        for (let i = 0; i < 6; i++) {
          const { x, z } = point();
          if (!plantable(x, z)) continue;
          const { here, word } = look(x, z);
          if (word !== 'strand') continue;
          const sandy = !eastIzolShingle(x, z);
          if (random() > (sandy ? .12 : .8)) continue;
          shingle.push({ x, z, s: range(.08, .26), rot: random() * TAU, flat: range(.3, .5), tint: random(), rise: 0 });
        }
        const { x, z } = point();
        if (plantable(x, z) && random() < .06) {
          const { here, word } = look(x, z);
          if (word === 'strand' && here.sea > 3 && !eastIzolPathClear(x, z, 1.5)) driftwood.push({ x, z, length: range(1.4, 3.2), radius: range(.07, .14), yaw: random() * TAU });
        }
      }
      // **The gullies' beds**: washed stones, pale and rounded, the whole width of the bed - "a bed of washed stones a
      // few metres wide, never a water surface" (src/content/regions/east-izol/east-izol-world.js). Small enough to walk over.
      if (probes.some(p => p.bank < 1)) {
        for (let i = 0; i < 5; i++) {
          const { x, z } = point();
          if (!plantable(x, z) || eastIzolTrailDistance(x, z) < .2) continue;
          const { word } = look(x, z);
          if (word !== 'bed' || random() > .85) continue;
          cobbles.push({ x, z, s: range(.1, .34), rot: random() * TAU, flat: range(.4, .62), tint: random() });
        }
      }
    }
  }
  function tree(species, x, z, here) {
    const t = EAST_IZOL_TREES[species];
    // Exposure lays a tree over: the sea round it, its height on the island, a knuckle of ground under it.
    const exposed = clamp01(here.exposure * 1.5 + here.rise * .7 + Math.max(0, here.swell) * .12 - (here.swell < -.6 ? .25 : 0));
    const shelter = 1 - exposed * .3;
    const turn = range(-.35, .35), c = Math.cos(turn), s = Math.sin(turn);
    return { species, x, z, height: range(...t.h) * shelter, radius: range(...t.r), yaw: random() * TAU,
      lean: t.lean[0] + (t.lean[1] - t.lean[0]) * clamp01(exposed + range(-.15, .15)),
      leeX: LEE.x * c - LEE.z * s, leeZ: LEE.x * s + LEE.z * c };
  }

  // -------------------------------------------------------------------------
  // Drawing it
  // -------------------------------------------------------------------------
  const dummy = new THREE.Object3D(), color = new THREE.Color(), up = new THREE.Vector3(), axis = new THREE.Vector3();
  const lean = new THREE.Quaternion(), turn = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0);
  const ground = (x, z) => renderedGroundHeight(x, z);
  // Seat an unsupported basal lobe without burying a rock that already
  // intersects a slope. Natural downhill overhang is retained; each basal
  // hull needs actual contact, not every underside vertex below terrain.
  // Only instance Y changes, after all seeded choices are made.
  const lowerVertices = new WeakMap(), footingMatrix = new THREE.Matrix4();
  function lowerFootGap(matrix, geometry) {
    let vertices = lowerVertices.get(geometry);
    if (!vertices) {
      const p = geometry.attributes.position;
      vertices = [...new Map(Array.from({ length: p.count }, (_, i) =>
        [p.getX(i), p.getY(i), p.getZ(i)]).filter(v => v[1] < 0).map(v => [v.join(','), v])).values()];
      lowerVertices.set(geometry, vertices);
    }
    const e = matrix.elements; let gap = Infinity;
    for (const [x, y, z] of vertices) {
      const px = e[0] * x + e[4] * y + e[8] * z + e[12], py = e[1] * x + e[5] * y + e[9] * z + e[13];
      const pz = e[2] * x + e[6] * y + e[10] * z + e[14];
      gap = Math.min(gap, py - ground(px, pz));
    }
    return gap;
  }
  function seatParts(mesh, first, end, basal) {
    let gap = -Infinity;
    for (let i = first; i < first + basal; i++) {
      mesh.getMatrixAt(i, footingMatrix);
      gap = Math.max(gap, lowerFootGap(footingMatrix, mesh.geometry));
    }
    const sink = Math.max(0, gap + .02);
    if (sink) for (let i = first; i < end; i++) {
      mesh.getMatrixAt(i, footingMatrix); footingMatrix.elements[13] -= sink; mesh.setMatrixAt(i, footingMatrix);
    }
  }
  function seatStone() {
    dummy.position.y -= Math.max(0, lowerFootGap(dummy.matrix, kit.stone) + .02);
    dummy.updateMatrix();
  }

  function* instanced(geometry, material, items, name, place, perItem = 1) {
    if (!items.length) return null;
    const mesh = new THREE.InstancedMesh(geometry, material, items.length * perItem);
    mesh.name = name;
    let at = 0;
    for (const item of items) {
      if (++work % 32 === 0) yield;
      at = place(mesh, item, at);
    }
    mesh.count = at; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.receiveShadow = true; mesh.computeBoundingSphere(); root.add(mesh);
    metrics.batches++; metrics.instances += at;
    return mesh;
  }
  const blade = (mesh, item, at, tall, tint) => {
    dummy.position.set(item.x, ground(item.x, item.z) - .03, item.z); dummy.quaternion.identity(); dummy.rotation.set(0, item.rot, 0);
    dummy.scale.set(item.s, item.s * tall, item.s); dummy.updateMatrix();
    mesh.setMatrixAt(at, dummy.matrix); mesh.setColorAt(at, tint); return at + 1;
  };
  /**
   * Grass colour carries the climate and the ground, and it is a saturation note more than a hue (the Meneth lesson:
   * pick the lightnesses low, the renderer pales them). West Izol's own turf is the key it is matched to across the
   * line. Csa's grass is tawnier and drier than Csb's; a fold's and a north face's are the greenest on the island;
   * the turf at height is pale and thin.
   */
  const grassTint = t => {
    let hue = t.csa ? .19 : .23, sat = t.csa ? .22 : .28, light = .36;
    if (t.word === 'fold' || t.word === 'wood') { hue = .25; sat = .3; light = .31; }
    else if (t.word === 'garrigue' || t.word === 'height') { hue = .16; sat = .18; light = .4; }
    hue += Math.max(0, t.north) * .015;
    return color.setHSL(hue + range(-.014, .014), sat + range(-.04, .04), light + range(-.035, .035));
  };
  const turfTint = t => t.rise > .6 ? color.setHSL(range(.15, .2), range(.1, .17), range(.4, .5))
    : color.setHSL((t.csa ? .21 : .24) + range(-.014, .014), .3 + range(-.05, .05), .34 + range(-.035, .035));
  const rushTint = () => color.setHSL(.2 + range(-.015, .015), .3 + range(-.05, .05), .27 + range(-.03, .03));
  const GRASS = { turf: ['sea turf', turfTint], pasture: ['pasture grass', grassTint], rush: ['damp rush', rushTint] };
  for (const [key, tile] of [...tiles].sort((a, b) => a[0] < b[0] ? -1 : 1)) {
    yield;
    const [label, tint] = GRASS[tile.kind];
    yield* instanced(kit[tile.kind], kit.blades, tile.items, `${EAST_IZOL} ${label} ${key.split('|')[1]}`,
      (mesh, item, at) => blade(mesh, item, at, 1, tint(item)));
  }
  // Each lobe stands on the ground under itself, so a bush on a slope hugs the slope rather than hanging off it.
  const lobes = (mesh, item, at, count, shape, tint) => {
    const first = at;
    for (let lobe = 0; lobe < count; lobe++) {
      const a = item.rot + lobe * TAU / count, spread = lobe === count - 1 ? 0 : shape.spread * item.s;
      const px = item.x + Math.cos(a) * spread, pz = item.z + Math.sin(a) * spread;
      dummy.position.set(px, ground(px, pz) + item.s * shape.lift * (lobe === count - 1 ? 1.25 : 1), pz);
      dummy.quaternion.identity(); dummy.rotation.set(range(-.2, .2), a, range(-.2, .2));
      dummy.scale.set(item.s * shape.wide, item.s * shape.tall, item.s * shape.wide * .9); dummy.updateMatrix();
      mesh.setMatrixAt(at, dummy.matrix); mesh.setColorAt(at++, tint(lobe));
    }
    seatParts(mesh, first, at, count - 1);
    return at;
  };
  yield* instanced(kit.lobe, kit.solid, forbs, `${EAST_IZOL} asphodel, thrift and yellow composites`, (mesh, item, at) => lobes(mesh, item, at, 3,
    item.kind === 'asphodel' ? { spread: .14, lift: item.h * .5, wide: .16, tall: item.h * .55 }
      : item.kind === 'thrift' ? { spread: .2, lift: .12, wide: .26, tall: .14 }
      : { spread: .24, lift: item.h * .4, wide: .26, tall: item.h * .32 },
    lobe => (lobe === 2 && item.kind === 'asphodel' ? color.set('#d9d4c4')
      : item.kind === 'thrift' ? color.set(lobe === 2 ? '#b77a8f' : '#61704a')
      : lobe === 2 ? color.set('#b8a03c') : color.set('#5a6c40')).offsetHSL(range(-.02, .02), range(-.05, .05), range(-.04, .05))), 3);
  metrics.forbs = forbs.length;
  metrics.asphodel = forbs.filter(f => f.kind === 'asphodel').length; metrics.thrift = forbs.filter(f => f.kind === 'thrift').length;
  const GARRIGUE_TINT = { rosemary: ['#5d6b55', '#6c7a62', '#7d7fa0'], cistus: ['#66704f', '#748057', '#c9b3b8'], thyme: ['#6a6d58', '#777a62', '#9a83a0'] };
  yield* instanced(kit.lobe, kit.solid, garrigue, `${EAST_IZOL} garrigue: rosemary, cistus and thyme`, (mesh, item, at) => lobes(mesh, item, at, 3,
    { spread: .38, lift: .3, wide: .52, tall: .36 },
    lobe => color.set(GARRIGUE_TINT[item.kind][lobe === 2 && item.bloom ? 2 : lobe % 2]).offsetHSL(range(-.015, .015), range(-.04, .04), range(-.035, .035))), 3);
  metrics.garrigue = garrigue.length;
  const MAQUIS_TINT = { lentisk: ['#34452f', '#3d4f36'], myrtle: ['#3a4d34', '#45583b'], heath: ['#4a5a3c', '#55653f'], arbutus: ['#3c5136', '#4b5e3a'],
    oleander: ['#4b5d3e', '#56673f', '#c3889a'] };
  yield* instanced(kit.lobe, kit.solid, maquis, `${EAST_IZOL} maquis: lentisk, myrtle, tree heath, strawberry tree and oleander`, (mesh, item, at) => {
    const next = lobes(mesh, item, at, 4, { spread: .42, lift: .5, wide: .62, tall: .6 },
      lobe => color.set(MAQUIS_TINT[item.kind][item.kind === 'oleander' && lobe === 3 ? 2 : lobe % 2]).offsetHSL(range(-.015, .015), range(-.04, .04), range(-.03, .03)));
    // The tall ones stop a walker; under the shoulder they are pushed through.
    if (item.s > MAQUIS_TALL) {
      const feet = Math.min(ground(item.x, item.z), heightAt(item.x, item.z));
      colliders.push({ x: item.x, z: item.z, r: item.s * .42, minY: feet - .5, maxY: feet + item.s * 1.2, kind: 'scrub', id: `east-izol-maquis-${item.x.toFixed(2)}-${item.z.toFixed(2)}` });
      metrics.colliders++;
    }
    return next;
  }, 4);
  metrics.maquis = maquis.length; metrics.oleander = maquis.filter(m => m.kind === 'oleander').length;
  // Gorse as West Izol draws it: a dark green body and a lighter top, and the yellow of it in flower on half of them.
  yield* instanced(kit.lobe, kit.solid, gorse, `${EAST_IZOL} gorse`, (mesh, item, at) => {
    const first = at;
    for (let part = 0; part < 2; part++) {
      const px = item.x + (part ? .3 * item.s : 0), pz = item.z + (part ? -.25 * item.s : 0);
      dummy.position.set(px, ground(px, pz) + item.s * (part ? .42 : .3), pz);
      dummy.quaternion.identity(); dummy.rotation.set(range(-.2, .2), item.rot + part, range(-.2, .2));
      dummy.scale.set(item.s * (part ? .5 : .82), item.s * (part ? .34 : .5), item.s * (part ? .46 : .78)); dummy.updateMatrix();
      mesh.setMatrixAt(at, dummy.matrix);
      mesh.setColorAt(at++, part && random() < .5 ? color.setHSL(.14, .6, range(.44, .55)) : color.setHSL(range(.23, .3), range(.2, .32), range(.19, .28)));
    }
    seatParts(mesh, first, at, 1);
    return at;
  }, 2);
  metrics.gorse = gorse.length;
  /** The lore's stone: "dark grey and iron-brown in the lower elevations, lightening to slate-grey at height". */
  const stoneTint = item => {
    const high = smooth(.25, .6, item.rise);
    const low = item.tint < .5 ? color.setHSL(range(.07, .11), range(.1, .16), range(.28, .38)) : color.setHSL(range(.1, .14), range(.04, .08), range(.27, .34));
    const lowR = low.r, lowG = low.g, lowB = low.b;
    color.setHSL(range(.55, .62), range(.02, .05), range(.4, .52));
    return color.setRGB(lowR + (color.r - lowR) * high, lowG + (color.g - lowG) * high, lowB + (color.b - lowB) * high);
  };
  yield* instanced(kit.stone, kit.solid, stones, `${EAST_IZOL} stone`, (mesh, item, at) => {
    const y = ground(item.x, item.z);
    dummy.position.set(item.x, y + item.s * item.flat * .25, item.z); dummy.quaternion.identity(); dummy.rotation.set(range(-.15, .15), item.rot, range(-.15, .15));
    dummy.scale.set(item.s, item.s * item.flat, item.s * range(.75, 1.15)); dummy.updateMatrix();
    seatStone();
    mesh.setMatrixAt(at, dummy.matrix); mesh.setColorAt(at, stoneTint(item));
    if (item.big) {
      const feet = Math.min(y, heightAt(item.x, item.z));
      colliders.push({ x: item.x, z: item.z, r: item.s * .78, minY: feet - .6, maxY: feet + item.s * item.flat * 1.3,
        kind: 'rock', id: `east-izol-stone-${item.x.toFixed(2)}-${item.z.toFixed(2)}` });
      metrics.colliders++; metrics.boulders++;
    }
    return at + 1;
  });
  metrics.stones = stones.length;
  yield* instanced(kit.stone, kit.solid, shingle, `${EAST_IZOL} cove shingle`, (mesh, item, at) => {
    dummy.position.set(item.x, ground(item.x, item.z) + .01, item.z); dummy.quaternion.identity(); dummy.rotation.set(0, item.rot, 0);
    dummy.scale.set(item.s, item.s * item.flat, item.s * range(.8, 1.3)); dummy.updateMatrix();
    seatStone();
    mesh.setMatrixAt(at, dummy.matrix); mesh.setColorAt(at, color.set(item.tint < .4 ? '#7d7a72' : item.tint < .75 ? '#8f8a7e' : '#a29a8a').offsetHSL(0, 0, range(-.06, .05)));
    return at + 1;
  });
  metrics.shingle = shingle.length;
  yield* instanced(kit.stone, kit.solid, cobbles, `${EAST_IZOL} gully cobbles`, (mesh, item, at) => {
    dummy.position.set(item.x, ground(item.x, item.z) + .01, item.z); dummy.quaternion.identity(); dummy.rotation.set(range(-.1, .1), item.rot, range(-.1, .1));
    dummy.scale.set(item.s, item.s * item.flat, item.s * range(.8, 1.25)); dummy.updateMatrix();
    seatStone();
    mesh.setMatrixAt(at, dummy.matrix); mesh.setColorAt(at, color.set(item.tint < .45 ? '#a39d8e' : item.tint < .8 ? '#b2ab9b' : '#8e897d').offsetHSL(0, 0, range(-.05, .04)));
    return at + 1;
  });
  metrics.cobbles = cobbles.length;
  yield* instanced(kit.trunk, kit.solid, driftwood, `${EAST_IZOL} driftwood`, (mesh, item, at) => {
    dummy.position.set(item.x, ground(item.x, item.z) + item.radius * .6, item.z); dummy.quaternion.identity(); dummy.rotation.set(0, item.yaw, Math.PI / 2);
    dummy.scale.set(item.radius, item.length, item.radius); dummy.updateMatrix();
    mesh.setMatrixAt(at, dummy.matrix); mesh.setColorAt(at, color.set('#b3aa98').offsetHSL(0, range(-.03, .03), range(-.05, .04)));
    return at + 1;
  });
  metrics.driftwood = driftwood.length;

  // The trees: typed, harvestable, one trunk and three crown lobes each, in two batches for the country.
  if (trees.length) {
    const trunk = new THREE.InstancedMesh(kit.trunk, kit.solid, trees.length);
    const crowns = new THREE.InstancedMesh(kit.crown, kit.solid, trees.length * 3);
    trunk.name = `${EAST_IZOL} typed living trunks`; crowns.name = `${EAST_IZOL} crowns`;
    root.add(trunk, crowns);
    for (const mesh of [trunk, crowns]) { mesh.castShadow = true; mesh.receiveShadow = true; }
    const counts = { 'stone-pine': 'pines', 'holm-oak': 'oaks', 'common-juniper': 'junipers', tamarisk: 'tamarisks', hawthorn: 'thorns' };
    for (const [i, t] of trees.entries()) {
      if (++work % 12 === 0) yield;
      const shape = EAST_IZOL_TREES[t.species], y = ground(t.x, t.z), h = t.height, r = t.radius;
      // The trunk leans to the lee and comes out of the ground at the tree's own point - where its collider stands and
      // where it is felled from - with its foot sunk a metre below that for a slope to take. It ends inside its crown.
      axis.set(t.leeZ, 0, -t.leeX); lean.setFromAxisAngle(axis, t.lean); turn.setFromAxisAngle(Y, t.yaw);
      const cos = Math.cos(t.lean), sunk = 1.1 / cos, length = sunk + h * Math.min(.92, shape.bole + shape.deep) / cos;
      up.set(0, length / 2 - sunk, 0).applyQuaternion(lean);
      dummy.position.set(t.x + up.x, y + up.y, t.z + up.z); dummy.quaternion.copy(lean).multiply(turn);
      dummy.scale.set(r, length, r); dummy.updateMatrix(); trunk.setMatrixAt(i, dummy.matrix);
      trunk.setColorAt(i, color.set(shape.bark));
      const handles = [{ mesh: trunk, index: i }];
      // Where along the leaning trunk the crown sits, and the crown drawn out to the lee by the same wind.
      up.set(0, h * shape.bole / cos, 0).applyQuaternion(lean);
      const cx = t.x + up.x, cy = y + up.y, cz = t.z + up.z, drift = Math.sin(t.lean) * h * .25;
      for (let j = 0; j < 3; j++) {
        const angle = t.yaw + j * TAU / 3, spread = h * shape.spread, offset = j === 0 ? 0 : spread * .55;
        const lee = j === 0 ? drift * .4 : drift;
        dummy.position.set(cx + Math.cos(angle) * offset + t.leeX * lee, cy + h * (shape.deep * .6 + j * .05), cz + Math.sin(angle) * offset + t.leeZ * lee);
        dummy.quaternion.copy(lean).multiply(turn);
        dummy.scale.set(spread * (j === 0 ? 1.1 : .82), h * shape.deep, spread * .8); dummy.updateMatrix();
        crowns.setMatrixAt(i * 3 + j, dummy.matrix);
        crowns.setColorAt(i * 3 + j, color.set(shape.leaf).multiplyScalar(.9 + j * .06).offsetHSL(range(-.015, .015), range(-.04, .04), 0));
        handles.push({ mesh: crowns, index: i * 3 + j });
      }
      const feet = Math.min(y, heightAt(t.x, t.z)), id = worldTreeId('east-izol', t.x, t.z);
      const collider = { x: t.x, z: t.z, r: r + .08, minY: feet - .9, maxY: feet + h, kind: 'tree', id };
      colliders.push(collider); metrics.colliders++;
      const { leeX: _x, leeZ: _z, lean: _lean, ...facts } = t;
      registerWorldTree(colliders, { id, ...facts, y, base: { x: t.x, y, z: t.z }, harvestable: true }, handles, collider);
      metrics.trees++; metrics[counts[t.species]]++;
    }
    trunk.computeBoundingSphere(); crowns.computeBoundingSphere();
    metrics.batches += 2; metrics.instances += trees.length * 4;
  }
  // The sampled ground is let go here: the world keeps what was built, not the survey it was built from.
  return { root, metrics, trees };
}
