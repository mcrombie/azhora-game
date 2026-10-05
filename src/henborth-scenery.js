import * as THREE from 'three';
import { finishBuild } from './build-steps.js';
import { registerWorldTree, worldTreeId } from './tree-registry.js';
import { REGION_CELLS, hexAt, regionAt } from './region-world.js';
import { westWaterSurface } from './west-ground.js';
// The ground's own design, read where it is offered and never required: its water, the hollows it shapes, the places
// it keeps, the trails it leaves open, and whatever account of its cover it gives.
import * as GROUND from './henborth-world.js';
import { HENBORTH_WILDLIFE_ZONES, henborthWildlifeClear } from './henborth-wildlife.js';

/**
 * **Henborth's natural cover: open continental grassland running up from the Celder and Mithala plains toward the
 * Oremindi and Narcosh, thinning into cold-margin scrub under the mountains, with damp hollows of bog in it.** Natural
 * things only - nothing here is anybody's: no camp, marker, cairn, track, fold or fence is drawn, the Lond families'
 * summer stock is not here, and the cranberry and herb grounds are drawn as the plants and not as anybody's harvest.
 *
 * What the lore gives (`world-builder/azhora_lore/geography/regions/henborth.md`): "the thinning-out country" where
 * "the soil thins, the drainage becomes less reliable, the growing season shortens, the frost returns earlier", and
 * "what was thin rough pasture becomes scrub, and what was scrub becomes something colder and more exposed"; the wind
 * from the north, which Henborth "channels ... rather than sheltering from it"; "in the warmest summers, it is briefly
 * a productive one"; and its cold-climate plants - "**northern bog cranberry**, the various *vel-henb* medicinal herbs
 * ... grown in cold stress rather than comfort, the specific lichen varieties that appear in Henborth's thin soil and
 * nowhere south of it". The Plains' own account (`the_plains.md`): "in the north it is tough, short-grassed steppe,
 * cold in winter and briefly lush in summer". The atlas adds that every hex is **Dfa plains**, with the built plains
 * (North Celder, West and North Mithala) along its south and east and the North and Lesser Oremindi, the East
 * Oremindi's foot and Narcosh along its north and west. So, drawn by its species because the game has no seasons:
 *
 *  - **the open plain** (`plain`), mixed prairie grass to the knee on the side nearest Celder and the Mithala, where it
 *    meets their own, shortening and greying northward into the tough short steppe sward of the thin pasture, with
 *    yarrow, harebell, golden composites, wild flax and fireweed through it, and pasque flower on the knolls;
 *  - **the thin pasture of the rise** (`upland`) - the cold side of the plain, the three ways' firm raised ground up
 *    to the passes, the Oremindi's foothill knolls - short tussocky steppe grass, cobbles through the turf, the lore's
 *    pale soil lichens in mats between the tussocks and its dye lichens crusting the stones, crowberry and bilberry,
 *    and the first dwarf birch;
 *  - **the cold-margin scrub** (`scrub`) along the mountain foot, "where the pasture gives out": dwarf birch and grey
 *    willow scrub in patches with the short grass between, creeping juniper, crowberry and lichen, wind-cut junipers,
 *    and in the most sheltered folds nearest the range a birch or a fir come down off it; on bare stony or steep ground
 *    (`rock`), stone, roseroot and juniper; and where the foot holds the water coming down to the line, a seepage
 *    **flush** (`flush`) of sedge, rush, moss and willow scrub;
 *  - **the damp hollows**: a bog on the floor (`bog`) - sphagnum hummocks green, ochre and red, sedge and cotton grass,
 *    the **bog cranberry** in mats over the moss, bog myrtle and a stunted birch - and a damp rim (`damp`) of lush
 *    meadow grass with the *vel-henb* herb ground's plants in it (angelica, meadowsweet, marsh cinquefoil, bogbean),
 *    grey willow scrub, and the plain's few trees: willow, alder, birch and a bluff of poplar. Wherever the ground
 *    lays open water, a margin (`margin`) of sedge, rush and bogbean round it, and willow at the edge;
 *  - **shelter** (`shelter`): the eastern approach's gullies, a fold, or a foothill's or an approach's flank turned
 *    away from the north wind, where a birch, a thorn or a poplar stands with rose and willow about it: the brief's
 *    "sparse trees by water and shelter only";
 *  - **the knolls** (`knoll`), dry and short-grassed, with stone and lichen breaking through and pasque flower in the
 *    turf: the marmots' ground, whose burrow mounds are drawn where `src/henborth-wildlife.js` puts their holes.
 *
 * **What decides what grows is read off the ground at build time, never written down**, because the ground
 * (`src/henborth-world.js`) is shaped by another hand at the same time as this is written. Not one height here is a
 * number: the country is sampled every four metres when it is built (`readHenborthGround`), the ground's own account
 * of its cover (`henborthCover`: its damp hollows, the wet foot, the knolls, the ways, the gullies, the stony ground,
 * the mountain foot and how far toward the mountains) is read at every node, and each point is given one word
 * (`habitat`) from that and from what is measured there - its slope and the way it faces, whether it is a knuckle of
 * ground or a fold against the ground round it, and how high it stands in the country's own range of heights - so
 * that what grows agrees with the colour the ground is painted. Without the ground's account the same words come off
 * the measurements alone. Everything repeated is instanced, the grass in tiles small enough to cull; trees are typed and
 * harvestable (`registerWorldTree`). Nothing that blocks a walker stands on a trail, at a landmark or the arrival, on a
 * place the ground keeps, or inside the range of anything that lives on the ground (`henborthWildlifeClear`).
 */
const freeze = Object.freeze;
const TAU = Math.PI * 2;
/**
 * How much a build step may ask of the ground before it pauses, in heights asked. Twenty heights is about a
 * millisecond of the game's ground; the renderer runs as many steps in a frame as its budget allows, so short steps
 * cost nothing but the pause itself.
 */
const STEP_COST = 20;
const smooth = (a, b, x) => { const v = Math.max(0, Math.min(1, (x - a) / (b - a))); return v * v * (3 - 2 * v); };
const clamp01 = v => Math.max(0, Math.min(1, v));
const segmentDistance = (x, z, a, b) => {
  const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
};

export const HENBORTH = 'Henborth';
export const HENBORTH_CELLS = freeze(REGION_CELLS[HENBORTH] ?? []);
const cellKey = (q, r) => `${q},${r}`;
const CELL_BY_KEY = new Map(HENBORTH_CELLS.map(cell => [cellKey(cell.q, cell.r), cell]));
/** Whether a point is on Henborth's own ground. */
export const henborthOwnsPoint = (x, z) => regionAt(x, z)?.name === HENBORTH;
/**
 * **The two sides of the country**, from the atlas's shared edges. The built plains it runs down into on its south and
 * east - North Celder, West and North Mithala - are its low side; everything else round it is the mountain side (the
 * North, Lesser and East Oremindi and Narcosh), except the atlas's two Acor Wetlands hexes off the north-east corner,
 * which are wet low ground and neither.
 */
export const HENBORTH_PLAINS_SIDE = freeze(['North Celder', 'West Mithala', 'North Mithala']);
const ACOR_HEXES = new Set(['6,83', '6,82']);
/** 0 on Henborth's southernmost row (89, over Celder) and 1 on its northernmost (83, under Narcosh). */
const ROWS_Z = HENBORTH_CELLS.length ? [Math.max(...HENBORTH_CELLS.map(c => c.z)), Math.min(...HENBORTH_CELLS.map(c => c.z))] : [1, 0];
export function henborthNorth(z) { return clamp01((ROWS_Z[0] - z) / ((ROWS_Z[0] - ROWS_Z[1]) || 1)); }

// ---------------------------------------------------------------------------
// What the ground offers
// ---------------------------------------------------------------------------
/** Every export of the ground module whose name matches `pattern` and is of `type`. */
function offers(pattern, type = 'function') {
  return Object.entries(GROUND).filter(([name, value]) => pattern.test(name) && typeof value === type && value !== null).map(([, value]) => value);
}
/** The first of `names` the ground module offers as a function, or null. */
function offered(names) {
  for (const name of names) if (typeof GROUND[name] === 'function') return GROUND[name];
  return null;
}

// ---------------------------------------------------------------------------
// What must be kept clear
// ---------------------------------------------------------------------------
/**
 * The ground's trails. The ways up to the passes are not trails but natural ground, and the ground keeps their line of
 * travel open itself (`HENBORTH_RESERVED`, read below), so nothing tall stands on them and the grass grows as it does.
 */
const TRAILS = (GROUND.HENBORTH_TRAILS ?? []).filter(trail => Array.isArray(trail?.points) && trail.points.length > 1);
const TRAIL_SEGMENTS = TRAILS.flatMap(trail => trail.points.slice(1).map((b, i) => {
  const a = trail.points[i], half = (trail.width ?? 3) / 2;
  return freeze({ a, b, half, minX: Math.min(a.x, b.x) - half, maxX: Math.max(a.x, b.x) + half, minZ: Math.min(a.z, b.z) - half, maxZ: Math.max(a.z, b.z) + half });
}));
/** How far a point is from the nearest trail's edge (negative on it), or Infinity. */
export function henborthTrailDistance(x, z) {
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
 * **The places the ground keeps for something to be built later** - a summer camp's flat, a pass-keeper's ground -
 * are the ground module's to name and place; this reads whatever it exports as a kept place (`..._RESERVED`, or else
 * its `..._KEPT`, `..._FLATS` or `..._CAMPS`): `{ x, z, radius }` circles, `{ x, z, halfX, halfZ, yaw? }` boxes or
 * `{ points }` polygons, and keeps them in grass and flowers and nothing else.
 */
function reservedPlaces() {
  const out = [], seen = new Set();
  const take = entry => {
    if (!entry || typeof entry !== 'object') return;
    if (entry.id !== undefined) { if (seen.has(entry.id)) return; seen.add(entry.id); }
    // A line kept open (`{ points, half }`): the line of travel up an approach, `half` metres either side of it.
    if (Array.isArray(entry.points) && entry.points.length >= 2 && Number.isFinite(entry.half)) {
      out.push({ line: entry.points.map(p => ({ x: p.x, z: p.z })), half: entry.half + (Number.isFinite(entry.wander) ? entry.wander : 0) });
      return;
    }
    if (Array.isArray(entry.points) && entry.points.length >= 3) { out.push({ polygon: entry.points.map(p => ({ x: p.x, z: p.z })) }); return; }
    if (!Number.isFinite(entry.x) || !Number.isFinite(entry.z)) return;
    const wander = Number.isFinite(entry.wander) ? entry.wander : 0;
    if (Number.isFinite(entry.radius ?? entry.r)) out.push({ x: entry.x, z: entry.z, radius: (entry.radius ?? entry.r) + wander });
    else if (Number.isFinite(entry.halfX) && Number.isFinite(entry.halfZ)) out.push({ x: entry.x, z: entry.z, halfX: entry.halfX + wander, halfZ: entry.halfZ + wander, yaw: entry.yaw ?? 0 });
  };
  const reserved = offers(/RESERVED$/, 'object');
  for (const list of reserved.length ? reserved : offers(/(KEPT|FLATS|CAMPS)$/, 'object')) {
    if (Array.isArray(list)) list.forEach(take);
    else Object.values(list).forEach(value => Array.isArray(value) ? value.forEach(take) : take(value));
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
/** Inside a kept place, `margin` metres out. */
export function henborthReserved(x, z, margin = 0) {
  for (const place of RESERVED) {
    if (place.line) {
      for (let i = 1; i < place.line.length; i++) if (segmentDistance(x, z, place.line[i - 1], place.line[i]) < place.half + margin) return true;
      continue;
    }
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
const LANDMARK_POINTS = [...(GROUND.HENBORTH_LANDMARKS ?? []), GROUND.HENBORTH_ARRIVAL].filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.z));
/** The landmarks' and the arrival's points, for the tests. */
export const HENBORTH_KEPT_POINTS = freeze(LANDMARK_POINTS.map(p => freeze({ id: p.id ?? 'arrival', x: p.x, z: p.z })));
/**
 * Where no shrub grows, blocking or not: a trail and a metre and a half either side of it, five metres round a
 * landmark's point or the arrival, and a kept place. `margin` is the thing's reach.
 */
export function henborthPathClear(x, z, margin = 0) {
  for (const p of LANDMARK_POINTS) if (Math.hypot(x - p.x, z - p.z) < 5 + margin) return true;
  if (henborthTrailDistance(x, z) < 1.4 + margin) return true;
  return henborthReserved(x, z, margin);
}
/**
 * Where nothing that blocks a walker may stand: all of the above, and any ground animal's range as well. Low scrub,
 * crowberry, cranberry and moss stop nobody, so they grow among the animals; a trunk, a boulder or a head-high willow
 * is a corner for an animal giving ground, so none stands in a range.
 */
export function henborthSceneryClear(x, z, margin = 0) {
  return henborthPathClear(x, z, margin) || henborthWildlifeClear(x, z, margin);
}

// ---------------------------------------------------------------------------
// Water
// ---------------------------------------------------------------------------
/**
 * The atlas gives Henborth no river, so any open water on it is the ground's own - a pool in a hollow - and is read
 * from whatever the ground module offers: a water function (`...WaterAt`, `...WaterSurface`, `...PoolAt`), or a list
 * of pools (`..._POOLS`: `{ x, z, radius, surface | level }`). The western rivers' own surface (`westWaterSurface`)
 * is asked as well, for a Mithala channel's ribbon lying a few metres onto this side of the line.
 */
const WATER_FNS = offers(/^henborth\w*(WaterAt|WaterSurface|PoolAt|PoolSurface)$/);
const POOLS = offers(/POOLS$/, 'object').flat().filter(p => Number.isFinite(p?.x) && Number.isFinite(p?.z) && Number.isFinite(p?.radius ?? p?.r)
  && Number.isFinite(p?.surface ?? p?.level));
export function henborthWaterAt(x, z, ground) {
  let best = null;
  for (const fn of WATER_FNS) {
    const level = fn(x, z);
    if (Number.isFinite(level) && level > ground + .02 && (best === null || level > best)) best = level;
  }
  for (const pool of POOLS) {
    const level = pool.surface ?? pool.level;
    if (Math.hypot(x - pool.x, z - pool.z) < (pool.radius ?? pool.r) && level > ground + .02 && (best === null || level > best)) best = level;
  }
  if (best !== null) return best;
  const west = westWaterSurface(x, z);
  return west !== null && west > ground + .02 ? west : null;
}

// ---------------------------------------------------------------------------
// The ground's design
// ---------------------------------------------------------------------------
/**
 * **The ground's own account of what covers it** (`henborthCover`, src/henborth-world.js): each 0 to 1 - `damp` (the
 * hollows and the wet mountain foot), `hollow` (inside a damp hollow's rim, 1 on its wet floor), `approach` (on one of
 * the three ways' raised, firmer ground), `gully` (in the eastern approach's gullies), `knoll` (on a dry knoll), `stony`
 * (thin stony soil), `foot` (the mountain foot, "where the pasture gives out into cold-margin scrub"), `foothill` (the
 * Oremindi's foothill knolls), `north` (how far toward the mountains), `celder` and `mithala` (how near those lines) and
 * `swell` (-1 to 1). It is read at every node of the survey, and what grows agrees with the colour the ground is painted.
 * Where the ground offers no account, the same words come off the sampled ground alone.
 */
const COVER_FN = offered(['henborthCover']);
/** How far into a damp hollow a point stands, asked exactly where it is (cheap), since a hollow's rim is finer than the survey. */
const HOLLOW_SHARE = offered(['hollowShare', 'henborthHollowShare']);
const COVER_FIELDS = freeze(['damp', 'hollow', 'approach', 'gully', 'knoll', 'stony', 'foot', 'foothill', 'north', 'celder', 'mithala']);

// ---------------------------------------------------------------------------
// The ground, read at build time
// ---------------------------------------------------------------------------
/**
 * The words a point can be, and the measurements that decide them. Lengths in metres. `swell` is a point's height
 * against the mean of the 56 metres round it, `hollow` how deep it lies across the lines through it at twenty and
 * forty metres (positive in a fold); `cold` how far into the cold margin it is (0 at the built plains, 1 under the
 * mountains: `henborthCold`); `bog` and `damp` how far into a damp hollow (the ground's `hollowShare`, 1 on the wet
 * floor) or how wet the mountain foot is; `foot`, `knollCover`, `gully`, `approach`, `foothill` and `stonyRock` are the
 * shares of the ground's own cover that make a point the scrub under the range, a dry knoll, a gully, one of the ways
 * up to the passes, the Oremindi's foothills and bare stony ground.
 */
export const HENBORTH_HABITAT = freeze({
  kept: .5, marginReach: 7, marginSlope: .5, rockSlope: .55,
  bog: .8, bogSlope: .12, damp: .15, dampSlope: .3,
  hollowShare: .07, hollowDepth: .55, shelterShare: .05, shelterDepth: .45, shelterFacing: -.55, shelterSlope: .06,
  knollCover: .3, stonyRock: .75, foot: .58, wetFoot: .5, gully: .3, approach: .35, foothill: .25,
  scrubCold: .78, uplandCold: .55, knollShare: .08, knoll: .45, firCold: .8,
});
const H = HENBORTH_HABITAT;
export const HENBORTH_HABITATS = freeze(['water', 'kept', 'margin', 'rock', 'bog', 'damp', 'knoll', 'flush', 'scrub', 'shelter', 'upland', 'plain']);
const WATER = 1, OWN = 2, PLAINS = 3, WILD = 4, WETSIDE = 5;
const AXIAL = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];

/**
 * Henborth's ground, sampled every `STEP` metres at build time over its own hexes and the ring of hexes round them:
 * height, whose it is, whether water is over it, how far it is from water, from the built plains and from the mountain
 * side, the slope and the way it faces, the swell and the hollows, and how high it stands in the country's own range.
 * `sample(x, z)` answers the nearest node; `habitat(x, z)` turns that into one word. `charge(n)` is told what a question
 * the builder did not ask itself has cost, in heights, so its steps stay short.
 */
export function* readHenborthGround(heightAt, charge = () => {}) {
  const STEP = 4, PAD = 72, LOCAL = 7;
  const cells = HENBORTH_CELLS;
  const minX = Math.min(...cells.map(c => c.x)) - 50 - PAD, maxX = Math.max(...cells.map(c => c.x)) + 50 + PAD;
  const minZ = Math.min(...cells.map(c => c.z)) - 58 - PAD, maxZ = Math.max(...cells.map(c => c.z)) + 58 + PAD;
  const nx = Math.ceil((maxX - minX) / STEP) + 1, nz = Math.ceil((maxZ - minZ) / STEP) + 1, n = nx * nz;
  // Only Henborth's hexes and the ring round them are read: the rest of the box is somebody else's and far off.
  const near = new Set();
  for (const c of cells) { near.add(cellKey(c.q, c.r)); for (const [dq, dr] of AXIAL) near.add(cellKey(c.q + dq, c.r + dr)); }
  const height = new Float32Array(n), level = new Float32Array(n), kind = new Uint8Array(n);
  const fresh = new Float32Array(n).fill(1e6), plain = new Float32Array(n).fill(1e6), wild = new Float32Array(n).fill(1e6);
  const cellIndex = new Int16Array(n).fill(-1), cellList = [...cells];
  // The ground's own account of each of its nodes, field by field (`COVER_FIELDS`).
  const cover = COVER_FIELDS.map(() => new Float32Array(n));
  let cost = 0;
  yield;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    if (cost >= 4 * STEP_COST) { cost = 0; yield; }
    const x = minX + i * STEP, z = minZ + j * STEP, k = j * nx + i, { q, r } = hexAt(x, z), key = cellKey(q, r);
    if (!near.has(key)) { cost += .05; continue; }
    cost += 4;
    const h = heightAt(x, z), owner = regionAt(x, z)?.name, water = henborthWaterAt(x, z, h);
    height[k] = h;
    const cell = CELL_BY_KEY.get(key);
    if (cell) cellIndex[k] = cellList.indexOf(cell);
    if (water !== null) { kind[k] = WATER; level[k] = water; fresh[k] = 0; continue; }
    level[k] = h;
    if (owner === HENBORTH) {
      kind[k] = OWN;
      if (COVER_FN) {
        // The ground's whole account of a point costs it about a height and a quarter of its own: it is paid for as such.
        cost += 1.25;
        const said = COVER_FN(x, z);
        if (said) for (let f = 0; f < COVER_FIELDS.length; f++) cover[f][k] = said[COVER_FIELDS[f]] ?? 0;
      }
    }
    else if (HENBORTH_PLAINS_SIDE.includes(owner)) { kind[k] = PLAINS; plain[k] = 0; }
    else if (ACOR_HEXES.has(key)) kind[k] = WETSIDE;
    else { kind[k] = WILD; wild[k] = 0; }
  }
  // Distances, in metres: a two-pass chamfer over the grid for each of the water, the plains side and the mountain side.
  const D = STEP, DD = STEP * Math.SQRT2;
  const chamfer = function* (field) {
    const relax = (k, from, add) => { if (field[from] + add < field[k]) field[k] = field[from] + add; };
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
  yield* chamfer(fresh); yield* chamfer(plain); yield* chamfer(wild);
  // The slope and the way it faces, from the nodes either side.
  const slope = new Float32Array(n), facing = new Float32Array(n);
  for (let j = 0; j < nz; j++) { if (j % 8 === 0) yield; for (let i = 0; i < nx; i++) {
    const k = j * nx + i;
    if (!kind[k]) continue;
    const at = (di, dj) => { const kk = Math.min(nz - 1, Math.max(0, j + dj)) * nx + Math.min(nx - 1, Math.max(0, i + di)); return kind[kk] ? height[kk] : height[k]; };
    const gx = (at(1, 0) - at(-1, 0)) / (2 * STEP), gz = (at(0, 1) - at(0, -1)) / (2 * STEP), g = Math.hypot(gx, gz);
    slope[k] = g;
    // A face is north-facing when the ground climbs toward the south (+z), and turned from the north wind when it
    // climbs toward the north: then `facing` is negative.
    facing[k] = g > .02 ? gz / g : 0;
  } }
  // The swell: summed-area tables of the visible level and of how many nodes were read.
  const SW = nx + 1, hSum = new Float64Array(SW * (nz + 1)), cSum = new Float64Array(SW * (nz + 1));
  for (let j = 0; j < nz; j++) { if (j % 6 === 0) yield; let hRow = 0, cRow = 0;
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i, read = kind[k] ? 1 : 0;
      hRow += read ? level[k] : 0; cRow += read;
      const at = (j + 1) * SW + i + 1, above = j * SW + i + 1;
      hSum[at] = hSum[above] + hRow; cSum[at] = cSum[above] + cRow;
    } }
  const box = (table, i, j, half) => {
    const i0 = Math.max(0, i - half), i1 = Math.min(nx - 1, i + half), j0 = Math.max(0, j - half), j1 = Math.min(nz - 1, j + half);
    return table[(j1 + 1) * SW + i1 + 1] - table[j0 * SW + i1 + 1] - table[(j1 + 1) * SW + i0] + table[j0 * SW + i0];
  };
  const swell = new Float32Array(n);
  for (let j = 0; j < nz; j++) { if (j % 4 === 0) yield; for (let i = 0; i < nx; i++) {
    const k = j * nx + i;
    if (!kind[k]) continue;
    const local = box(cSum, i, j, LOCAL);
    swell[k] = local ? level[k] - box(hSum, i, j, LOCAL) / local : 0;
  } }
  /**
   * **A hollow is ground with ground rising on both sides of it** - a valley across one line through it, or a bowl
   * across all of them - and not merely ground lower than its surroundings: the foot of the rise toward the mountains is
   * lower than the ground behind it and is no hollow at all, because it is open on the side away from the rise. So the
   * depth of a point's hollow is read across four lines through it (east-west, north-south and the two diagonals), at
   * twenty and at forty metres either side: on each line, the lesser of the two rises; of the lines, the deepest.
   */
  const hollow = new Float32Array(n), reachSteps = [[5, 0], [0, 5], [4, 4], [4, -4]], wideSteps = [[10, 0], [0, 10], [7, 7], [7, -7]];
  const levelAt = (i, j, fallback) => (i < 0 || j < 0 || i >= nx || j >= nz || !kind[j * nx + i]) ? fallback : level[j * nx + i];
  for (let j = 0; j < nz; j++) { if (j % 3 === 0) yield; for (let i = 0; i < nx; i++) {
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
   * **What counts as a hollow, a sheltered fold and a knoll is this country's own relief, not a number of metres**,
   * because the ground is shaped by another hand: a fixed depth would make a bog of every dip on a lumpy plain and none
   * on a smooth one. So a hollow is among the deepest `hollowShare` of the country's gentle ground and at least
   * `hollowDepth` deep, a fold among the deepest `shelterShare`, a knoll among the highest `knollShare` against the 56
   * metres round it; and the country's heights are ranked, low to high, for how far up its own rise a point stands.
   */
  const BINS = 640, LO = -32, WIDTH = 64 / BINS, hollowCounts = new Uint32Array(BINS), swellCounts = new Uint32Array(BINS);
  const bin = v => Math.max(0, Math.min(BINS - 1, Math.floor((v - LO) / WIDTH)));
  let counted = 0, lowest = Infinity, highest = -Infinity;
  for (let k = 0; k < n; k++) {
    if (k % 4096 === 0) yield;
    if (kind[k] !== OWN) continue;
    lowest = Math.min(lowest, height[k]); highest = Math.max(highest, height[k]);
    if (slope[k] >= H.rockSlope) continue;
    hollowCounts[bin(hollow[k])]++; swellCounts[bin(swell[k])]++; counted++;
  }
  const quantile = (counts, q) => { let sum = 0; for (let b = 0; b < BINS; b++) { sum += counts[b]; if (sum >= q * counted) return LO + (b + .5) * WIDTH; } return LO + BINS * WIDTH; };
  const hollowCut = counted ? Math.max(H.hollowDepth, quantile(hollowCounts, 1 - H.hollowShare)) : H.hollowDepth;
  const shelterCut = counted ? Math.max(H.shelterDepth, quantile(hollowCounts, 1 - H.shelterShare)) : H.shelterDepth;
  const knollCut = counted ? Math.max(H.knoll, quantile(swellCounts, 1 - H.knollShare)) : H.knoll;
  // The heights' own ranking: a histogram of this country's ground, read as a cumulative share.
  const span = Math.max(1e-3, highest - lowest), rank = new Float32Array(257);
  {
    const counts = new Uint32Array(256);
    let total = 0;
    for (let k = 0; k < n; k++) { if (k % 4096 === 0) yield; if (kind[k] !== OWN) continue; counts[Math.min(255, Math.floor((height[k] - lowest) / span * 256))]++; total++; }
    let sum = 0;
    for (let b = 0; b < 256; b++) { rank[b] = total ? sum / total : 0; sum += counts[b]; }
    rank[256] = 1;
  }
  const elevation = h => {
    const t = Math.max(0, Math.min(256, (h - lowest) / span * 256)), b = Math.min(255, Math.floor(t));
    return rank[b] + (rank[b + 1] - rank[b]) * (t - b);
  };
  yield;
  const node = (x, z) => {
    const i = Math.max(0, Math.min(nx - 1, Math.round((x - minX) / STEP))), j = Math.max(0, Math.min(nz - 1, Math.round((z - minZ) / STEP)));
    return j * nx + i;
  };
  const [DAMP, HOLLOW, APPROACH, GULLY, KNOLL, STONY, FOOT, FOOTHILL, NORTH, CELDER, MITHALA] = COVER_FIELDS.map((_, i) => i);
  /** The nearest node's account of a point. A node that was not read (far off Henborth's hexes) is nobody's dry land. */
  function sample(x, z) {
    const k = node(x, z), cell = cellIndex[k] >= 0 ? cellList[cellIndex[k]] : null;
    const toward = plain[k] + wild[k] < 2e6 ? plain[k] / Math.max(1e-6, plain[k] + wild[k]) : .5;
    const elev = kind[k] === OWN ? elevation(height[k]) : .5, north = henborthNorth(z);
    // How far toward the mountains: the ground's own measure where it gives one, else the distances to the two sides.
    const rise = COVER_FN && kind[k] === OWN ? cover[NORTH][k] : toward;
    return { read: kind[k] !== 0, own: kind[k] === OWN, wet: kind[k] === WATER, height: height[k], level: level[k],
      fresh: fresh[k], plain: plain[k], wild: wild[k], toward, rise, elev, north, cold: henborthCold(rise, elev, north),
      slope: slope[k], facing: facing[k], swell: swell[k], hollow: hollow[k], cell,
      damp: cover[DAMP][k], hollowIn: cover[HOLLOW][k], approach: cover[APPROACH][k], gully: cover[GULLY][k], knoll: cover[KNOLL][k],
      stony: cover[STONY][k], foot: cover[FOOT][k], foothill: cover[FOOTHILL][k], celder: cover[CELDER][k], mithala: cover[MITHALA][k] };
  }
  /**
   * How far into a damp hollow a point stands, 0 to 1, asked exactly where it is (the ground's `hollowShare`: a hollow's
   * rim is finer than the survey). Without the ground's account, a fold among the country's deepest is a hollow.
   */
  function damp(x, z, here) {
    if (!COVER_FN) return here.hollow <= hollowCut * .55 ? 0 : clamp01((here.hollow - hollowCut * .55) / (hollowCut * .9));
    return HOLLOW_SHARE ? HOLLOW_SHARE(x, z) : here.hollowIn;
  }
  /** The ground's own account of the wet mountain foot, where it takes the plain down to the low ground across the line. */
  const footWet = here => here.hollowIn > .01 ? 0 : here.damp;
  /**
   * One word for a point, in the order the ground decides it: **water**; a place the ground keeps (**kept**); the
   * **margin** round open water; steep ground (**rock**); a hollow's wet floor (**bog**) and its damp rim (**damp**);
   * a dry **knoll**; the wettest of the mountain foot (a seepage **flush**); the cold-margin **scrub** under the
   * mountains; a fold or a slope turned from the north wind (**shelter**); the thin pasture of the rise (**upland**); and
   * the open **plain**.
   */
  function habitat(x, z, here = sample(x, z)) {
    if (here.wet) {
      // The node is the water's, but the point between it and the land may not be: the water's edge is finer than the grid.
      charge(1);
      const h = heightAt(x, z);
      if (henborthWaterAt(x, z, h) !== null) return 'water';
      here = { ...here, wet: false, height: h };
    }
    if (henborthReserved(x, z)) return 'kept';
    if (here.fresh <= H.marginReach && here.slope < H.marginSlope) return 'margin';
    if (here.slope > H.rockSlope) return 'rock';
    const wet = damp(x, z, here);
    if (wet > H.bog && here.slope < H.bogSlope) return 'bog';
    if (wet > H.damp && here.slope < H.dampSlope) return 'damp';
    // The dry knolls' thin stony soil, and its bare crown where the stone is through the turf.
    if (here.knoll > H.knollCover) return here.stony > H.stonyRock && here.slope > .2 ? 'rock' : 'knoll';
    // The wettest of the mountain foot, where the ground holds the water coming down to the line: a seepage flush.
    if (footWet(here) > H.wetFoot && here.slope < H.dampSlope) return 'flush';
    // The rest of the mountain foot, "where the pasture gives out into cold-margin scrub".
    if (here.foot > H.foot || (!COVER_FN && here.cold > H.scrubCold)) return here.stony > H.stonyRock ? 'rock' : 'scrub';
    // Shelter: the eastern approach's gullies, a fold among the country's deepest, or the lee side of a foothill knoll
    // or an approach's flank, turned from the north wind.
    const folded = here.hollow > shelterCut;
    const turned = here.facing < H.shelterFacing && here.slope > H.shelterSlope && (here.foothill > H.foothill || here.approach > H.approach);
    if ((here.gully > H.gully || folded || turned) && here.slope < .4) return 'shelter';
    // The thin pasture: the ways' firm raised ground, the foothill knolls, and the cold side of the plain.
    if (here.approach > H.approach || here.foothill > H.foothill || here.cold > H.uplandCold) return here.swell > knollCut ? 'knoll' : 'upland';
    if (here.swell > knollCut) return 'knoll';
    return 'plain';
  }
  /** Whether the nearest node is Henborth's own dry ground: the cheap question, for skipping what is not. */
  const owns = (x, z) => kind[node(x, z)] === OWN;
  return { minX, maxX, minZ, maxZ, step: STEP, lowest, highest, hollowCut, shelterCut, knollCut, owns, sample, habitat, damp };
}
/**
 * **How far into the cold margin a point is**, 0 to 1: how far it lies from the built plains toward the mountain side
 * (or the ground's own rise, where it gives one), how high it stands in the country's own range of heights, and how
 * far north. "The plain simply stops being the plain: the soil thins, ... the growing season shortens, the frost
 * returns earlier" - which is a gradient, not a line, and is drawn as one.
 */
export function henborthCold(rise, elevation, north) {
  return clamp01(smooth(.05, .95, rise) * .65 + elevation * .2 + north * .15);
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
function shared() {
  if (geometries.ready) return geometries;
  Object.assign(geometries, {
    ready: true,
    // Mixed prairie grass to the knee, the grass of the side nearest Celder and the Mithala, where it meets theirs.
    prairie: bladeGeometry(7, .11, .044, .44, .19),
    // The short steppe sward of the thin pasture: fine, wiry, tussocky and bent by the wind off the mountains.
    steppe: bladeGeometry(9, .088, .026, .25, .1, .7),
    // Lush meadow grass on a hollow's damp rim and in the shelter: fuller and softer, and never quite dry.
    meadow: bladeGeometry(8, .1, .04, .48, .17),
    // Sedge on the bog and at the water: stiff, narrow and arching.
    sedge: bladeGeometry(7, .07, .022, .5, .22, .55),
    // Rush at the water's edge: upright, dark and stiff.
    rush: bladeGeometry(7, .055, .02, .62, .24, .3),
    lobe: new THREE.IcosahedronGeometry(1, 0),
    stone: new THREE.IcosahedronGeometry(1, 0),
    trunk: new THREE.CylinderGeometry(1, 1.16, 1, 7),
    crown: new THREE.IcosahedronGeometry(1, 1),
    spire: new THREE.ConeGeometry(1, 1, 7),
    disc: new THREE.CircleGeometry(1, 20),
    blades: new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide }),
    solid: new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }),
    water: new THREE.MeshStandardMaterial({ color: '#56767a', roughness: .3, metalness: .06, side: THREE.DoubleSide }),
  });
  return geometries;
}

/**
 * The trees, by species: height range, trunk radius, how far up the trunk the crown starts, the crown's spread and
 * depth (both against the height), how far the wind can lay it over, its colours, and its form - `round` (three crown
 * lobes) or `spire` (a cone: the juniper and the fir). Every species is in the timber table (`src/wood-species.js`), so
 * every one is harvestable. A cold plain's trees are smaller than a forest's: birch, willow, alder and a poplar bluff in
 * the hollows, a thorn or a birch in shelter, juniper on the rough ground, and a fir only under the range.
 */
export const HENBORTH_TREES = freeze({
  'silver-birch': freeze({ h: [5, 10.5], r: [.12, .21], bole: .38, spread: .2, deep: .36, lean: [.03, .16], bark: '#b8b8a6', leaf: '#768a50', form: 'round' }),
  'black-willow': freeze({ h: [4, 8], r: [.16, .3], bole: .3, spread: .34, deep: .26, lean: [.04, .16], bark: '#6f634c', leaf: '#7c8f63', form: 'round' }),
  'black-alder': freeze({ h: [6, 10.5], r: [.16, .27], bole: .4, spread: .2, deep: .28, lean: [.02, .12], bark: '#675b4c', leaf: '#47684a', form: 'round' }),
  'white-poplar': freeze({ h: [8, 13.5], r: [.19, .31], bole: .44, spread: .14, deep: .36, lean: [.01, .08], bark: '#c0c0b2', leaf: '#8aa173', form: 'round' }),
  hawthorn: freeze({ h: [3, 5], r: [.13, .2], bole: .32, spread: .32, deep: .24, lean: [.08, .36], bark: '#5f5446', leaf: '#5d6e45', form: 'round' }),
  'common-juniper': freeze({ h: [1.4, 3], r: [.09, .14], bole: .12, spread: .2, deep: .78, lean: [.1, .38], bark: '#5a4c3e', leaf: '#3e5642', form: 'spire' }),
  'silver-fir': freeze({ h: [6, 11], r: [.17, .28], bole: .14, spread: .19, deep: .78, lean: [.01, .07], bark: '#645a4a', leaf: '#34574a', form: 'spire' }),
});
const TREE_COUNT = freeze({ 'silver-birch': 'birches', 'black-willow': 'willows', 'black-alder': 'alders', 'white-poplar': 'poplars',
  hawthorn: 'thorns', 'common-juniper': 'junipers', 'silver-fir': 'firs' });
/** A willow scrub bush taller than this (its scale) is head-high and carries a collider. */
const SHRUB_TALL = 1.45;
const TALL_SHRUBS = new Set(['willow-scrub']);

/**
 * What grows, by word: the chance, per go, of grass, a flower or herb, a shrub, ground cover (moss, cranberry, lichen),
 * a stone and a tree.
 */
const CHANCE = freeze({
  //           grass forb  shrub cover stone tree
  water:     [0,    0,    0,    0,    0,    0],
  kept:      [.95,  .3,   0,    0,    0,    0],
  margin:    [.95,  .3,   .08,  .55,  .04,  .14],
  rock:      [.55,  .22,  .3,   .25,  .75,  .05],
  bog:       [.95,  .26,  .08,  .9,   .02,  .03],
  damp:      [.95,  .36,  .2,   .28,  .03,  .18],
  flush:     [.95,  .24,  .22,  .45,  .03,  .015],
  scrub:     [.86,  .2,   .62,  .4,   .26,  .035],
  shelter:   [.93,  .3,   .3,   .05,  .05,  .22],
  upland:    [.93,  .28,  .16,  .3,   .16,  .01],
  knoll:     [.9,   .34,  .1,   .2,   .24,  .008],
  plain:     [.95,  .34,  .04,  .02,  .03,  .004],
});
const WOODED = new Set(['margin', 'damp', 'shelter']);

export function createHenborthScenery(options) { return finishBuild(createHenborthScenerySteps(options)); }

/** Henborth's scenery, from its own seeded stream: what grows on it, its stone, and the water the ground lays. */
export function* createHenborthScenerySteps({ parent, heightAt, renderedGroundHeight = heightAt, colliders }) {
  const kit = shared();
  yield;
  const root = new THREE.Group(); root.name = 'Henborth - grass, scrub, bog, stone and the few trees'; parent.add(root);
  const metrics = { blocks: 0, prairie: 0, steppe: 0, meadow: 0, sedge: 0, rush: 0, cotton: 0, forbs: 0,
    yarrow: 0, harebell: 0, composite: 0, flax: 0, fireweed: 0, pasque: 0, roseroot: 0, angelica: 0, meadowsweet: 0, cinquefoil: 0, bogbean: 0,
    shrubs: 0, dwarfBirch: 0, willowScrub: 0, rose: 0, silverberry: 0, crowberry: 0, bilberry: 0, bogMyrtle: 0, juniperMat: 0,
    sphagnum: 0, cranberry: 0, lichenMats: 0, lichens: 0, stones: 0, boulders: 0, burrows: 0, water: 0, waterMarkers: 0,
    trees: 0, birches: 0, willows: 0, alders: 0, poplars: 0, thorns: 0, junipers: 0, firs: 0,
    batches: 0, instances: 0, colliders: 0, habitats: {} };
  let seed = 6713397, cost = 0;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a, b) => a + random() * (b - a);
  // Every question put to the ground is paid for: the steps below yield by what they have asked, not by a count of loops.
  const field = yield* readHenborthGround((x, z) => { cost++; return heightAt(x, z); }, n => { cost += n; });
  cost = 0;
  // A point is dry if the survey says so with room to spare; near any water the ground itself is asked.
  const dry = (x, z) => {
    const here = field.sample(x, z);
    if (!here.wet && here.fresh > 8) return true;
    cost++;
    return henborthWaterAt(x, z, heightAt(x, z)) === null;
  };
  const plantable = (x, z) => { cost += .3; return henborthOwnsPoint(x, z) && dry(x, z); };
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
  const forbs = [], shrubs = [], cover = [], stones = [], lichens = [], trees = [];
  const shrubSpace = spacer(6), treeSpace = spacer(8), boulderSpace = spacer(10), loneSpace = spacer(30);

  // -------------------------------------------------------------------------
  // The ground, ten metres at a time
  // -------------------------------------------------------------------------
  /**
   * Every ten-metre block of the survey with any of Henborth's dry ground in it is planted from the one seeded stream,
   * in a fixed order, so the same ground grows the same plain. What a block grows is decided per candidate by the word
   * for the ground under it, from `CHANCE`.
   */
  const BLOCK = 10;
  const word = (x, z) => { const here = field.sample(x, z); return { here, word: field.habitat(x, z, here) }; };
  for (let bz = field.minZ; bz < field.maxZ; bz += BLOCK) {
    for (let bx = field.minX; bx < field.maxX; bx += BLOCK) {
      if (cost >= STEP_COST) { cost = 0; yield; }
      cost += .5;
      // Anything of ours here? The block's centre and corners, off the survey that is already in hand.
      const corners = [[5, 5], [0, 0], [BLOCK, 0], [0, BLOCK], [BLOCK, BLOCK]];
      if (!corners.some(([dx, dz]) => field.owns(bx + dx, bz + dz))) continue;
      // A block of Henborth's ground is a dozen and more candidates each read against the survey, the trails, the kept
      // places and the ranges whether or not it asks the ground anything: about four heights' worth of work before it asks.
      cost += 4;
      metrics.blocks++;
      const centre = field.sample(bx + 5, bz + 5);
      // The census: what the ground is, a hundred square metres to a word, from the middle of the block.
      if (centre.own) { const w = field.habitat(bx + 5, bz + 5, centre); metrics.habitats[w] = (metrics.habitats[w] ?? 0) + 1; }
      const point = () => ({ x: bx + random() * BLOCK, z: bz + random() * BLOCK });
      // **Grass**: six goes a block, because an open plain at the west's usual density reads as bare ground from a
      // horse's back. Prairie grass on the plain nearest the built plains, going over to the steppe sward northward and
      // up the rise; meadow grass on a hollow's rim, in the shelter and on a kept place; sedge on the bog, with the
      // cotton grass's white heads over some of it; sedge and rush at the water. A walked way across the plain is the
      // ground's and nobody's road: on its own width the grass is trodden thin and short (`trodden`), not gone.
      for (let i = 0; i < 6; i++) {
        const { x, z } = point();
        if (!plantable(x, z)) continue;
        const trodden = henborthTrailDistance(x, z) < 0;
        if (trodden && random() > .3) continue;
        const { here, word: w } = word(x, z);
        if (random() > CHANCE[w][0]) continue;
        const cold = here.cold;
        const kind = w === 'bog' ? 'sedge' : w === 'margin' ? (random() < .55 ? 'sedge' : 'rush')
          : w === 'flush' ? (random() < .45 ? 'sedge' : random() < .4 ? 'rush' : 'meadow')
          : w === 'damp' || w === 'shelter' || w === 'kept' ? (cold > .7 && random() < .3 ? 'steppe' : 'meadow')
          : w === 'scrub' || w === 'rock' || w === 'knoll' || w === 'upland' ? 'steppe'
          // The open plain: prairie grass on the low side, steppe sward taking over as the ground goes north and up.
          : trodden || random() < smooth(.18, .5, cold) ? 'steppe' : 'prairie';
        // Along the Mithala's lines the prairie grass stands as tall as the Mithala's own, which it meets there.
        const s = range(.8, 1.3) * (kind === 'prairie' ? (1.12 - cold * .3) * (1 + here.mithala * .3) : kind === 'steppe' ? 1 - Math.max(0, cold - .5) * .3 : 1)
          * (w === 'knoll' || w === 'rock' ? .85 : 1) * (trodden ? .6 : 1);
        tufts(kind, x, z).push({ x, z, s, rot: random() * TAU, word: w, cold, swell: here.swell, facing: here.facing, mithala: here.mithala });
        if (kind === 'sedge' && (w === 'bog' || w === 'flush') && random() < (w === 'bog' ? .3 : .15)) {
          // Cotton grass: the bog's white heads, three bobbles on stalks over a sedge tuft.
          forbs.push({ x, z, s: range(.75, 1.1), h: range(.85, 1.15), rot: random() * TAU, kind: 'cotton' });
          metrics.cotton++;
        }
        metrics[kind]++;
      }
      // **Flowers and herbs**: yarrow, harebell, golden composites, wild flax and fireweed on the plain, pasque flower on
      // the knolls and the thin pasture, roseroot on the stony rise; on the hollows' damp rims and in the wet, the plants of
      // the lore's herb ground - angelica, meadowsweet, marsh cinquefoil, bogbean. Nobody walks round a flower.
      {
        const { x, z } = point();
        if (roomy(x, z, .4) && henborthTrailDistance(x, z) > .4) {
          const { here, word: w } = word(x, z);
          if (random() < CHANCE[w][1] && here.slope < .9) {
            const roll = random(), cold = here.cold;
            const kind = w === 'bog' ? (roll < .5 ? 'bogbean' : roll < .8 ? 'cinquefoil' : 'cotton')
              : w === 'margin' ? (roll < .5 ? 'bogbean' : roll < .8 ? 'cinquefoil' : 'meadowsweet')
              : w === 'flush' ? (roll < .35 ? 'cinquefoil' : roll < .6 ? 'meadowsweet' : roll < .8 ? 'bogbean' : 'harebell')
              : w === 'damp' ? (roll < .3 ? 'meadowsweet' : roll < .55 ? 'angelica' : roll < .75 ? 'cinquefoil' : roll < .9 ? 'fireweed' : 'harebell')
              : w === 'shelter' ? (roll < .35 ? 'fireweed' : roll < .55 ? 'meadowsweet' : roll < .8 ? 'harebell' : 'yarrow')
              : w === 'rock' || w === 'scrub' ? (roll < .35 ? 'roseroot' : roll < .7 ? 'harebell' : roll < .85 ? 'pasque' : 'yarrow')
              : w === 'knoll' || w === 'upland' ? (roll < .3 ? 'pasque' : roll < .55 ? 'harebell' : roll < .8 ? 'yarrow' : cold > .55 ? 'roseroot' : 'composite')
              : w === 'kept' ? (roll < .5 ? 'yarrow' : 'harebell')
              : roll < .28 ? 'yarrow' : roll < .5 ? 'composite' : roll < .66 ? 'harebell' : roll < .82 ? 'flax' : roll < .94 ? 'fireweed' : 'pasque';
            forbs.push({ x, z, s: range(.5, .95) * (1 - cold * .15), h: range(.7, 1.2), rot: random() * TAU, kind });
            if (kind === 'cotton') metrics.cotton++;
          }
        }
      }
      // **Shrubs**: dwarf birch and grey willow scrub in the cold margin, with creeping juniper, crowberry and bilberry
      // under them; crowberry, bilberry and the first dwarf birch on the thin pasture; bog myrtle and dwarf birch in the
      // bog, willow scrub on a hollow's rim; wild rose and silverberry on the plain's swells and in the shelter. Two goes.
      for (let i = 0; i < 2; i++) {
        const { x, z } = point();
        if (!roomy(x, z, .7) || henborthPathClear(x, z, .6)) continue;
        const { here, word: w } = word(x, z);
        if (here.slope > .9 || random() > CHANCE[w][2] || !shrubSpace.free(x, z, 1.9)) continue;
        const roll = random();
        const kind = w === 'scrub' ? (roll < .38 ? 'dwarf-birch' : roll < .62 ? 'willow-scrub' : roll < .76 ? 'juniper-mat' : roll < .9 ? 'crowberry' : 'bilberry')
          : w === 'rock' ? (roll < .45 ? 'juniper-mat' : roll < .75 ? 'crowberry' : 'dwarf-birch')
          : w === 'upland' ? (roll < .35 ? 'crowberry' : roll < .62 ? 'bilberry' : roll < .85 ? 'dwarf-birch' : 'rose')
          : w === 'bog' ? (roll < .6 ? 'bog-myrtle' : 'dwarf-birch')
          : w === 'margin' ? (roll < .6 ? 'willow-scrub' : 'bog-myrtle')
          : w === 'flush' ? (roll < .5 ? 'willow-scrub' : roll < .8 ? 'bog-myrtle' : 'dwarf-birch')
          : w === 'damp' ? (roll < .55 ? 'willow-scrub' : roll < .8 ? 'bog-myrtle' : 'rose')
          : w === 'shelter' ? (roll < .45 ? 'rose' : roll < .75 ? 'willow-scrub' : 'silverberry')
          : w === 'knoll' ? (roll < .5 ? 'rose' : roll < .8 ? 'silverberry' : 'crowberry')
          : roll < .55 ? 'rose' : 'silverberry';
        const tall = TALL_SHRUBS.has(kind);
        let size = kind === 'crowberry' || kind === 'juniper-mat' || kind === 'bilberry' ? range(.35, .7)
          : kind === 'willow-scrub' ? range(.7, 1.7) : kind === 'dwarf-birch' ? range(.45, 1) : range(.5, 1.05);
        // The north wind keeps the scrub low on the exposed ground.
        if (w === 'scrub' || w === 'upland' || w === 'rock') size *= 1 - Math.max(0, here.swell) * .15;
        // A tall bush is a corner for an animal giving ground, and a wall on a trail: under the shoulder there.
        if (tall && size > SHRUB_TALL && henborthSceneryClear(x, z, size * .5 + .4)) size = SHRUB_TALL - .05;
        shrubs.push(shrubSpace.add({ x, z, s: size, rot: random() * TAU, kind, bloom: random() < .5 }));
      }
      // **Ground cover**: the bog's sphagnum hummocks and the **bog cranberry** in mats over them, and on the thin
      // pasture and the scrub the pale soil lichens of Henborth's thin ground. Two goes, low enough to walk on.
      for (let i = 0; i < 2; i++) {
        const { x, z } = point();
        if (!roomy(x, z, .5) || henborthTrailDistance(x, z) < .5 || henborthReserved(x, z)) continue;
        const { here, word: w } = word(x, z);
        if (here.slope > .7 || random() > CHANCE[w][3]) continue;
        const roll = random();
        const kind = w === 'bog' ? (roll < .55 ? 'sphagnum' : 'cranberry')
          : w === 'margin' || w === 'flush' ? (roll < .6 ? 'sphagnum' : 'cranberry')
          : w === 'damp' ? (roll < .55 ? 'cranberry' : 'sphagnum')
          : 'lichen';
        cover.push({ x, z, s: range(.6, 1.2) * (kind === 'lichen' ? .8 : 1), rot: random() * TAU, kind, tint: random() });
      }
      // **Stone**: cobbles through the thin pasture's turf and the knolls, bedrock and boulders on the steep ground and in
      // the scrub under the mountains, and hardly any on the deep-soiled plain. A boulder a metre across stops a walker. On
      // the stones of the cold margin, the lore's dye lichens: orange, yellow, grey-green and rust crusts.
      {
        const { x, z } = point();
        if (plantable(x, z) && henborthTrailDistance(x, z) > .3 && !henborthReserved(x, z)) {
          const { here, word: w } = word(x, z);
          // The ground's own thin stony soil (`stony`) carries the most; the cold side more than the low.
          if (random() < CHANCE[w][4] * (.5 + here.cold * .6 + here.stony * 1.6)) {
            const rocky = w === 'rock' || w === 'scrub';
            const big = rocky ? random() < .3 : w === 'upland' || w === 'knoll' ? random() < .08 : random() < .03;
            const s = big ? range(.9, 2) : range(.18, .55);
            if (!(big && (henborthSceneryClear(x, z, s + .4) || !boulderSpace.free(x, z, 7)))) {
              const stone = { x, z, s, big, rot: random() * TAU, flat: big ? range(.5, .78) : range(.35, .6), tint: random(), word: w };
              stones.push(stone); if (big) boulderSpace.add(stone);
              if (random() < (big ? .35 + here.cold * .5 : here.cold * .3)) {
                const roll = random();
                lichens.push({ stone, kind: roll < .35 ? 'orange' : roll < .6 ? 'yellow' : roll < .88 ? 'grey' : 'rust', rot: random() * TAU, s: range(.4, .7) });
              }
            }
          }
        }
      }
      // **Trees, only where the ground has them**: willow and alder at the water; willow, alder, birch and a poplar bluff
      // on a hollow's rim; a stunted birch on the bog; a birch, a thorn or a poplar in shelter; junipers on the rough
      // ground and in the scrub, and a fir only in the shelter nearest the range; and, now and then, a lone thorn or birch
      // out on the grass. Two more goes a block by the water and in shelter, where the plain's few trees are.
      for (let i = 0; i < 3; i++) {
        const { x, z } = point();
        if (!plantable(x, z) || henborthSceneryClear(x, z, 2)) continue;
        const { here, word: w } = word(x, z);
        if (i && !WOODED.has(w)) continue;
        if (here.slope > .7 || random() > CHANCE[w][5]) continue;
        const roll = random(), cold = here.cold;
        let species;
        if (w === 'margin') species = roll < .6 ? 'black-willow' : 'black-alder';
        else if (w === 'damp') species = roll < .32 ? 'black-willow' : roll < .52 ? 'black-alder' : roll < .8 ? 'silver-birch' : 'white-poplar';
        else if (w === 'bog') species = roll < .7 ? 'silver-birch' : 'black-willow';
        else if (w === 'flush') species = roll < .65 ? 'black-willow' : 'silver-birch';
        else if (w === 'shelter') species = cold > H.firCold && roll < .3 ? 'silver-fir'
          : roll < .45 ? 'silver-birch' : roll < .68 ? 'white-poplar' : roll < .9 ? 'hawthorn' : 'black-alder';
        else if (w === 'scrub') species = cold > H.firCold && here.hollow > field.shelterCut && roll < .25 ? 'silver-fir' : roll < .65 ? 'common-juniper' : 'silver-birch';
        else if (w === 'rock') species = roll < .8 ? 'common-juniper' : 'silver-birch';
        else if (w === 'upland') species = roll < .5 ? 'common-juniper' : roll < .75 ? 'hawthorn' : 'silver-birch';
        else if (w === 'knoll') species = roll < .6 ? 'common-juniper' : 'hawthorn';
        else species = roll < .6 ? 'hawthorn' : roll < .85 ? 'silver-birch' : 'white-poplar';
        const lone = w === 'plain' || w === 'knoll' || w === 'upland';
        const gap = species === 'common-juniper' || species === 'hawthorn' ? 3.5 : WOODED.has(w) ? 4.5 : 6;
        if (!treeSpace.free(x, z, gap) || (lone && !loneSpace.free(x, z, 30))) continue;
        const t = treeSpace.add(tree(species, x, z, here, w));
        if (lone) loneSpace.add(t);
        trees.push(t);
      }
    }
  }
  function tree(species, x, z, here, w) {
    const t = HENBORTH_TREES[species];
    // The north wind lays a tree over: how exposed its ground is - high, cold, out on a swell - and a hollow or a fold
    // shelters it. A bog's birch is stunted by the wet as well as the wind.
    const exposed = clamp01(here.cold * .5 + Math.max(0, here.swell) * .2 + here.elev * .2 - (w === 'shelter' || w === 'damp' || w === 'margin' ? .35 : 0));
    const stunted = w === 'bog' || w === 'flush' ? .65 : w === 'rock' || w === 'scrub' ? .85 : 1;
    // The lee is south, away from the north wind, turned a little by the way the ground faces.
    const turn = range(-.4, .4), lx = Math.sin(turn), lz = Math.cos(turn);
    return { species, x, z, height: range(...t.h) * (1 - exposed * .3) * stunted, radius: range(...t.r) * (w === 'bog' ? .8 : 1), yaw: random() * TAU,
      lean: t.lean[0] + (t.lean[1] - t.lean[0]) * clamp01(exposed + range(-.15, .15)), leeX: lx, leeZ: lz, habitat: w };
  }

  // -------------------------------------------------------------------------
  // The marmots' burrows
  // -------------------------------------------------------------------------
  /**
   * **The steppe marmot's holes**, wherever `src/henborth-wildlife.js` puts them: a low fan of bare earth thrown out
   * of each, and its dark mouth. Nothing here blocks anybody; it is where the colony goes.
   */
  const burrows = [];
  for (const zone of HENBORTH_WILDLIFE_ZONES) for (const hole of zone.burrows ?? []) {
    if (!henborthOwnsPoint(hole.x, hole.z)) continue;
    burrows.push({ x: hole.x, z: hole.z, r: hole.r ?? .3, rot: random() * TAU, s: range(.8, 1.15) });
  }
  metrics.burrows = burrows.length;

  // -------------------------------------------------------------------------
  // Drawing it
  // -------------------------------------------------------------------------
  const dummy = new THREE.Object3D(), color = new THREE.Color(), up = new THREE.Vector3(), axis = new THREE.Vector3();
  const lean = new THREE.Quaternion(), turn = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0);
  const ground = (x, z) => { cost++; return renderedGroundHeight(x, z); };
  const ask = (x, z) => { cost++; return heightAt(x, z); };
  /**
   * One instanced batch, laid a step at a time. **Its bounding sphere is gathered as its instances are laid**: each
   * instance's own sphere (the geometry's, carried by its matrix) widens a box, and the batch's sphere is the box's. The
   * three.js way, a pass over every instance once they are all laid, was a single step of four thousand sphere unions
   * for the scrub and the ground cover, and the slowest step of the build.
   */
  const bounds = new THREE.Box3(), corner = new THREE.Vector3(), held = new THREE.Vector3(), matrix = new THREE.Matrix4();
  function* instanced(geometry, material, items, name, place, perItem = 1) {
    if (!items.length) return null;
    const mesh = new THREE.InstancedMesh(geometry, material, items.length * perItem);
    mesh.name = name;
    if (!geometry.boundingSphere) geometry.computeBoundingSphere();
    const own = geometry.boundingSphere;
    bounds.makeEmpty();
    let at = 0;
    for (const item of items) {
      if (cost >= STEP_COST) { cost = 0; yield; }
      const from = at;
      at = place(mesh, item, at);
      for (let i = from; i < at; i++) {
        mesh.getMatrixAt(i, matrix);
        const r = own.radius * matrix.getMaxScaleOnAxis();
        held.copy(own.center).applyMatrix4(matrix);
        bounds.expandByPoint(corner.set(held.x - r, held.y - r, held.z - r)).expandByPoint(corner.set(held.x + r, held.y + r, held.z + r));
      }
      cost += (at - from) * .02;
    }
    mesh.count = at; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.receiveShadow = true; mesh.boundingSphere = bounds.getBoundingSphere(new THREE.Sphere()); root.add(mesh);
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
   * pick the lightnesses low, the renderer pales them). On the low side it is the Celder prairie's green going tawny on
   * the swells, the colour of the grass it meets at the line; northward and up the rise it greys and pales into the
   * steppe sward's buff-green; the hollows' rims and the shelter keep it green, and the bog's sedge is grey-green.
   */
  const prairieTint = t => {
    const cold = t.cold ?? 0, wet = t.mithala ?? 0;
    let hue = .2 - cold * .03 + wet * .025, sat = .34 - cold * .08 + wet * .02, light = .33 + cold * .03 - wet * .01;
    if ((t.swell ?? 0) > .2) { hue -= .012; light += .02; sat -= .02; }
    hue += Math.max(0, t.facing ?? 0) * .01;
    return color.setHSL(hue + range(-.012, .012), sat + range(-.04, .04), light + range(-.035, .035));
  };
  const steppeTint = t => {
    const cold = t.cold ?? .5;
    let hue = .17 + (1 - cold) * .02, sat = .24 - cold * .06, light = .37 + cold * .02;
    if (t.word === 'knoll' || t.word === 'rock') { hue -= .01; light += .02; }
    return color.setHSL(hue + range(-.015, .015), sat + range(-.04, .04), light + range(-.04, .04));
  };
  const meadowTint = t => color.setHSL(.235 - (t.cold ?? 0) * .02 + range(-.012, .012), .38 - (t.cold ?? 0) * .08 + range(-.04, .04), .3 + range(-.03, .03));
  const sedgeTint = () => color.setHSL(.19 + range(-.014, .014), .22 + range(-.03, .03), .38 + range(-.04, .04));
  const rushTint = () => color.setHSL(.2 + range(-.015, .015), .3 + range(-.05, .05), .27 + range(-.03, .03));
  const GRASS = { prairie: ['prairie grass', prairieTint], steppe: ['steppe sward', steppeTint], meadow: ['meadow grass', meadowTint],
    sedge: ['sedge', sedgeTint], rush: ['rush', rushTint] };
  for (const [key, tile] of [...tiles].sort((a, b) => a[0] < b[0] ? -1 : 1)) {
    const [label, tint] = GRASS[tile.kind];
    yield* instanced(kit[tile.kind], kit.blades, tile.items, `Henborth ${label} ${key.split('|')[1]}`, (mesh, item, at) => blade(mesh, item, at, tint(item)));
  }
  // Each lobe stands on the ground under itself, so a bush on a slope hugs the slope rather than hanging off it.
  const lobes = (mesh, item, at, count, shape, tint) => {
    for (let lobe = 0; lobe < count; lobe++) {
      const a = item.rot + lobe * TAU / count, spread = lobe === count - 1 ? 0 : shape.spread * item.s;
      const px = item.x + Math.cos(a) * spread, pz = item.z + Math.sin(a) * spread;
      dummy.position.set(px, ground(px, pz) + item.s * shape.lift * (lobe === count - 1 ? 1.25 : 1), pz);
      dummy.quaternion.identity(); dummy.rotation.set(range(-.2, .2), a, range(-.2, .2));
      dummy.scale.set(item.s * shape.wide, item.s * shape.tall, item.s * shape.wide * .9); dummy.updateMatrix();
      mesh.setMatrixAt(at, dummy.matrix); mesh.setColorAt(at++, tint(lobe));
    }
    return at;
  };
  const FLOWER = { yarrow: '#d6d0bd', harebell: '#6f78b5', composite: '#b8a03c', flax: '#7d93c8', fireweed: '#b0457e', pasque: '#8a6fb0',
    roseroot: '#c9b23d', meadowsweet: '#e0dbc0', angelica: '#d3d4bd', cinquefoil: '#7a2f3a', bogbean: '#e6dcd8', cotton: '#f1efe8' };
  yield* instanced(kit.lobe, kit.solid, forbs, 'Henborth flowers, herbs and cotton grass', (mesh, item, at) => lobes(mesh, item, at, 3,
    item.kind === 'cotton' ? { spread: .1, lift: item.h * .42, wide: .045, tall: .055 }
      : item.kind === 'fireweed' || item.kind === 'angelica' || item.kind === 'meadowsweet' ? { spread: .13, lift: item.h * .55, wide: .16, tall: item.h * .55 }
      : item.kind === 'pasque' || item.kind === 'roseroot' || item.kind === 'cinquefoil' ? { spread: .2, lift: .12, wide: .24, tall: .15 }
      : { spread: .24, lift: item.h * .4, wide: .26, tall: item.h * .32 },
    lobe => item.kind === 'cotton' ? color.set(FLOWER.cotton).offsetHSL(0, 0, range(-.03, .02))
      : (lobe === 2 ? color.set(FLOWER[item.kind]) : color.set(item.kind === 'roseroot' ? '#6b7f58' : item.kind === 'bogbean' ? '#4f6a46' : '#5a6c40'))
        .offsetHSL(range(-.02, .02), range(-.05, .05), range(-.04, .05))), 3);
  metrics.forbs = forbs.length;
  for (const kind of ['yarrow', 'harebell', 'composite', 'flax', 'fireweed', 'pasque', 'roseroot', 'angelica', 'meadowsweet', 'cinquefoil', 'bogbean'])
    metrics[kind] = forbs.filter(f => f.kind === kind).length;
  const SHRUB = {
    // Dwarf birch: a low round mat of small leaves on wiry red-brown twigs, the cold margin's own shrub.
    'dwarf-birch': { shape: { spread: .38, lift: .3, wide: .52, tall: .38 }, tint: ['#4f5e33', '#596a3a', '#8a5a34'] },
    // Grey willow scrub: upright, silvery grey-green, to the shoulder in shelter.
    'willow-scrub': { shape: { spread: .36, lift: .5, wide: .5, tall: .62 }, tint: ['#6f7f5e', '#7a8a68', '#97a387'] },
    rose: { shape: { spread: .42, lift: .32, wide: .55, tall: .42 }, tint: ['#5a6a3c', '#64713f', '#b5576a'] },
    silverberry: { shape: { spread: .42, lift: .32, wide: .55, tall: .42 }, tint: ['#7a8a6c', '#8a9779', '#a8b39a'] },
    // Crowberry: a low dark mat of needle leaves with black berries in it.
    crowberry: { shape: { spread: .42, lift: .16, wide: .6, tall: .2 }, tint: ['#2f3d2c', '#36452f', '#272a26'] },
    // Bilberry: a knee-low bright green mat with blue-black berries.
    bilberry: { shape: { spread: .38, lift: .18, wide: .5, tall: .24 }, tint: ['#4d6a36', '#55733b', '#2f3550'] },
    // Bog myrtle: low, grey-green and resinous, the bog's own shrub and one of its herbs.
    'bog-myrtle': { shape: { spread: .34, lift: .36, wide: .46, tall: .46 }, tint: ['#5b6b40', '#647548', '#8f6a3a'] },
    // Creeping juniper: a flat blue-green mat over the stony ground.
    'juniper-mat': { shape: { spread: .5, lift: .14, wide: .65, tall: .18 }, tint: ['#344a3a', '#3c5240', '#4a5e48'] },
  };
  yield* instanced(kit.lobe, kit.solid, shrubs, 'Henborth dwarf birch, willow scrub, rose, crowberry, bilberry, bog myrtle and juniper', (mesh, item, at) => {
    const kind = SHRUB[item.kind];
    const next = lobes(mesh, item, at, 3, kind.shape,
      lobe => color.set(kind.tint[lobe === 2 && item.bloom ? 2 : lobe % 2]).offsetHSL(range(-.015, .015), range(-.04, .04), range(-.03, .03)));
    // The tall willow stops a walker; under the shoulder it is pushed through.
    if (TALL_SHRUBS.has(item.kind) && item.s > SHRUB_TALL) {
      const feet = Math.min(ground(item.x, item.z), ask(item.x, item.z));
      colliders.push({ x: item.x, z: item.z, r: item.s * .36, minY: feet - .5, maxY: feet + item.s * 1.15, kind: 'scrub', id: `henborth-${item.kind}-${item.x.toFixed(2)}-${item.z.toFixed(2)}` });
      metrics.colliders++;
    }
    return next;
  }, 3);
  const SHRUB_COUNT = { 'dwarf-birch': 'dwarfBirch', 'willow-scrub': 'willowScrub', rose: 'rose', silverberry: 'silverberry', crowberry: 'crowberry',
    bilberry: 'bilberry', 'bog-myrtle': 'bogMyrtle', 'juniper-mat': 'juniperMat' };
  for (const item of shrubs) metrics[SHRUB_COUNT[item.kind]]++;
  metrics.shrubs = shrubs.length;
  /**
   * The ground cover, low enough to walk on: sphagnum hummocks green, ochre and red; the **bog cranberry**, a dark mat
   * with its red berries; and the pale soil lichens of the thin ground, grey-white cushions between the tussocks.
   */
  const COVER = {
    sphagnum: { shape: { spread: .3, lift: .05, wide: .45, tall: .14 }, tint: t => t < .5 ? ['#6f8a3c', '#7d8f3e', '#93913f'] : t < .8 ? ['#8a8a3a', '#968a42', '#9a6a3a'] : ['#9a5a3a', '#8d4f38', '#7d8a3c'] },
    cranberry: { shape: { spread: .28, lift: .04, wide: .36, tall: .08 }, tint: () => ['#3c5233', '#44593a', '#a3262c'] },
    lichen: { shape: { spread: .26, lift: .03, wide: .3, tall: .07 }, tint: t => t < .6 ? ['#c3c8b4', '#b9bfa8', '#cfd2c0'] : ['#a9b38f', '#b2b996', '#9ea68a'] },
  };
  yield* instanced(kit.lobe, kit.solid, cover, 'Henborth sphagnum, bog cranberry and soil lichen', (mesh, item, at) => {
    const kind = COVER[item.kind], tints = kind.tint(item.tint);
    return lobes(mesh, item, at, 3, kind.shape, lobe => color.set(tints[lobe]).offsetHSL(range(-.01, .01), range(-.03, .03), range(-.03, .03)));
  }, 3);
  metrics.sphagnum = cover.filter(c => c.kind === 'sphagnum').length;
  metrics.cranberry = cover.filter(c => c.kind === 'cranberry').length;
  metrics.lichenMats = cover.filter(c => c.kind === 'lichen').length;
  /** Henborth's stone: the grey of the range's own rock in the scrub and on the steep ground, browner in the turf. */
  const stoneTint = item => item.word === 'rock' || item.word === 'scrub'
    ? color.set(item.tint < .5 ? '#7f7d76' : '#8e8a80').offsetHSL(0, range(-.02, .02), range(-.05, .05))
    : color.set(item.tint < .6 ? '#8c877a' : '#9c9586').offsetHSL(0, range(-.02, .02), range(-.05, .05));
  yield* instanced(kit.stone, kit.solid, stones, 'Henborth stone', (mesh, item, at) => {
    const y = ground(item.x, item.z);
    item.y = y;
    dummy.position.set(item.x, y + item.s * item.flat * .25, item.z); dummy.quaternion.identity(); dummy.rotation.set(range(-.12, .12), item.rot, range(-.12, .12));
    dummy.scale.set(item.s, item.s * item.flat, item.s * range(.75, 1.15)); dummy.updateMatrix();
    mesh.setMatrixAt(at, dummy.matrix); mesh.setColorAt(at, stoneTint(item));
    if (item.big) {
      const feet = Math.min(y, ask(item.x, item.z));
      colliders.push({ x: item.x, z: item.z, r: item.s * .78, minY: feet - .6, maxY: feet + item.s * item.flat * 1.3,
        kind: 'rock', id: `henborth-stone-${item.x.toFixed(2)}-${item.z.toFixed(2)}` });
      metrics.colliders++; metrics.boulders++;
    }
    return at + 1;
  });
  metrics.stones = stones.length;
  // The dye lichens: a crust on the top of a stone, a hand off its centre.
  const LICHEN = { orange: '#c27a2c', yellow: '#b3ab47', grey: '#a2a995', rust: '#9a4a2c' };
  yield* instanced(kit.lobe, kit.solid, lichens, 'Henborth dye lichen on stone', (mesh, item, at) => {
    const { stone } = item, top = stone.y + stone.s * stone.flat * 1.1;
    dummy.position.set(stone.x + Math.cos(item.rot) * stone.s * .2, top, stone.z + Math.sin(item.rot) * stone.s * .2);
    dummy.quaternion.identity(); dummy.rotation.set(0, item.rot, 0);
    dummy.scale.set(stone.s * item.s, stone.s * .07, stone.s * item.s * .8); dummy.updateMatrix();
    mesh.setMatrixAt(at, dummy.matrix); mesh.setColorAt(at, color.set(LICHEN[item.kind]).offsetHSL(range(-.01, .01), range(-.05, .05), range(-.04, .04)));
    return at + 1;
  });
  metrics.lichens = lichens.length;
  // The burrows: a fan of bare earth, and the dark mouth in it.
  yield* instanced(kit.lobe, kit.solid, burrows, 'Henborth marmot burrows', (mesh, item, at) => {
    const y = ground(item.x, item.z);
    dummy.position.set(item.x - Math.sin(item.rot) * .35, y + .02, item.z - Math.cos(item.rot) * .35); dummy.quaternion.identity(); dummy.rotation.set(0, item.rot, 0);
    dummy.scale.set(.7 * item.s, .14 * item.s, .95 * item.s); dummy.updateMatrix();
    mesh.setMatrixAt(at, dummy.matrix); mesh.setColorAt(at, color.set('#8a7454').offsetHSL(0, range(-.03, .03), range(-.04, .04)));
    dummy.position.set(item.x, y + .03, item.z); dummy.rotation.set(0, item.rot, 0);
    dummy.scale.set(item.r * .9, .05, item.r * .75); dummy.updateMatrix();
    mesh.setMatrixAt(at + 1, dummy.matrix); mesh.setColorAt(at + 1, color.set('#1f1913'));
    return at + 2;
  }, 2);
  /**
   * **Any open water the ground lays**, drawn as the ground gives it: its own ribbons or sheets (`...WaterRibbons`:
   * `{ id, positions, indices }`), or its pools (`..._POOLS`) as a disc at the pool's level - and the same water as the
   * world knows water: the ground's own markers (`...WaterColliders`), or a `pond-water` marker for each pool, which
   * `world.waterAt` reads and nobody bumps into (src/game-state.js). The scenery is the one builder handed the world's
   * colliders, so it is the one that lays them; what they say is the ground's.
   */
  const ribbons = offers(/WaterRibbons$/).flatMap(fn => { try { return fn() ?? []; } catch { return []; } });
  for (const ribbon of ribbons) {
    yield;
    if (!ribbon?.indices?.length) continue;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([...ribbon.positions], 3));
    geometry.setIndex([...ribbon.indices]); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
    const sheet = new THREE.Mesh(geometry, kit.water);
    sheet.name = `Henborth ${ribbon.name ?? ribbon.id ?? 'pool'} water`; sheet.receiveShadow = true; root.add(sheet);
    metrics.water++; metrics.batches++;
  }
  if (!ribbons.length) for (const pool of POOLS) {
    yield;
    const sheet = new THREE.Mesh(kit.disc, kit.water);
    sheet.rotation.x = -Math.PI / 2; sheet.position.set(pool.x, pool.surface ?? pool.level, pool.z); sheet.scale.setScalar(pool.radius ?? pool.r);
    sheet.name = `Henborth ${pool.name ?? pool.id ?? 'pool'} water`; sheet.receiveShadow = true; root.add(sheet);
    metrics.water++; metrics.batches++;
  }
  const markers = offers(/WaterColliders$/).flatMap(fn => { try { return fn() ?? []; } catch { return []; } });
  if (markers.length) for (const marker of markers) { colliders.push({ ...marker }); metrics.waterMarkers++; }
  else for (const pool of POOLS) {
    colliders.push({ x: pool.x, z: pool.z, r: (pool.radius ?? pool.r) - .04, surface: pool.surface ?? pool.level, kind: 'pond-water', id: `henborth-pool-${pool.id ?? `${pool.x}-${pool.z}`}` });
    metrics.waterMarkers++;
  }

  // The trees: typed, harvestable, one trunk and three crown lobes each (or a spire), in three batches.
  if (trees.length) {
    const spires = trees.filter(t => HENBORTH_TREES[t.species].form === 'spire').length, rounds = trees.length - spires;
    const trunk = new THREE.InstancedMesh(kit.trunk, kit.solid, trees.length);
    const crowns = new THREE.InstancedMesh(kit.crown, kit.solid, Math.max(1, rounds * 3));
    const cones = new THREE.InstancedMesh(kit.spire, kit.solid, Math.max(1, spires));
    trunk.name = 'Henborth typed living trunks'; crowns.name = 'Henborth crowns'; cones.name = 'Henborth spire crowns';
    const batches = [trunk, ...(rounds ? [crowns] : []), ...(spires ? [cones] : [])];
    root.add(...batches);
    for (const mesh of batches) { mesh.castShadow = true; mesh.receiveShadow = true; }
    let crownAt = 0, coneAt = 0;
    for (const [i, t] of trees.entries()) {
      if (cost >= STEP_COST) { cost = 0; yield; }
      // A tree asks the ground twice and registers itself: its registration is paid for as two more questions.
      cost += 2;
      const shape = HENBORTH_TREES[t.species], y = ground(t.x, t.z), h = t.height, r = t.radius;
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
      const feet = Math.min(y, ask(t.x, t.z)), id = worldTreeId('henborth', t.x, t.z);
      const collider = { x: t.x, z: t.z, r: r + .08, minY: feet - .9, maxY: feet + h, kind: 'tree', id };
      colliders.push(collider); metrics.colliders++;
      const { leeX: _x, leeZ: _z, lean: _lean, habitat: _w, ...facts } = t;
      registerWorldTree(colliders, { id, region: HENBORTH, ...facts, y, base: { x: t.x, y, z: t.z }, harvestable: true }, handles, collider);
      metrics.trees++; metrics[TREE_COUNT[t.species]]++;
    }
    trunk.count = trees.length; crowns.count = crownAt; cones.count = coneAt;
    for (const mesh of batches) { yield; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; mesh.computeBoundingSphere(); }
    metrics.batches += batches.length; metrics.instances += trees.length + crownAt + coneAt;
  }
  // The sampled ground is let go here: the world keeps what was built, not the survey it was built from.
  return { root, metrics, trees };
}
