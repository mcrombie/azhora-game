/**
 * The playable world, derived from the atlas.
 *
 * `region-layout.js` is pure geometry over the survey; this module turns that
 * geometry into the actual places the game needs: where each region is, where
 * the land ends, where the roads run, and where every person, site and landmark
 * stands. No THREE, no DOM: `world.js` renders what is described here, and the
 * charts, the checkpoint rules and the smokes read the same numbers.
 *
 * North is -Z, east is +X, one authored hex is METRES_PER_HEX metres
 * (HEX_WORLD_TRANSFORM). Every hand-placed literal below is still written in the
 * authored 56 m frame the content was designed in and converted here, at the
 * boundary, by `at()` for a place and `road()` for a road vertex.
 * Ids: 1 Drent, 2 Luscia, 3 Moros Plain, 4 East Suval, 5 West Suval, 6 Pueth, 7 Peblos, 8 Elagos.
 */
import { PLAYABLE_SURVEY, LAND_HEXES, SURVEY_ORIGIN } from './region-survey.js';
import {
  HEX_WORLD_TRANSFORM, REGION_BIOMES, PLAYABLE_REGIONS, METRES_PER_HEX, ATLAS_HEX_SIZE, ATLAS_HEX_WIDTH,
  regionCells, regionOutline, worldBoundsFor, routeAnchors, borderMidpoint, pointInPolygon,
} from './region-layout.js';
import { toWorld, toWorldRoad, toWorldIn, AUTHORED_METRES_PER_HEX, WORLD_SCALE } from './world-scale.js';

export const SURVEY = PLAYABLE_SURVEY;
export const TRANSFORM = HEX_WORLD_TRANSFORM;
export const REGION_ORDER = PLAYABLE_REGIONS;
export const REGION_IDS = Object.freeze({ Drent: 1, Luscia: 2, 'Moros Plain': 3, 'East Suval': 4, 'West Suval': 5, Pueth: 6, Peblos: 7, 'West Izol': 8, Elagos: 9, Amod: 10, Vastos: 11, Meneth: 12, Caricas: 13, Nesdor: 14 });
export const REGION_NAME_BY_ID = Object.freeze(Object.fromEntries(Object.entries(REGION_IDS).map(([name, id]) => [id, name])));

export const ANCHORS = Object.freeze(routeAnchors(SURVEY));
export const WORLD_BOUNDS = Object.freeze(worldBoundsFor(SURVEY));
export const REGION_CELLS = Object.freeze(Object.fromEntries(REGION_ORDER.map(id => [id, regionCells(SURVEY, id)])));
export const REGION_OUTLINES = Object.freeze(Object.fromEntries(REGION_ORDER.map(id => [id, regionOutline(SURVEY, id)])));
/** Softened outlines for charts: the same border, without hexagonal corners. */
export const REGION_BORDERS = Object.freeze(Object.fromEntries(
  REGION_ORDER.map(id => [id, regionOutline(SURVEY, id, TRANSFORM, { soften: 2 })])));

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const smooth = (a, b, x) => { const v = clamp((x - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); };
const lerp = (a, b, t) => a + (b - a) * t;
const point = (x, z) => Object.freeze({ x, z });
/** An authored point (56 m per hex), in world metres: rigid inside its cluster. */
const at = (x, z) => { const p = toWorld(x, z); return point(p.x, p.z); };
/** An authored road vertex. Only Tidehaven's own trail is rigid; see world-scale.js. */
const road = (x, z) => { const p = toWorldRoad(x, z); return point(p.x, p.z); };
/** An authored point carried by a named cluster, wherever it lies. */
const inCluster = (id, x, z) => { const p = toWorldIn(id, x, z); return point(p.x, p.z); };
export { AUTHORED_METRES_PER_HEX, WORLD_SCALE };

// ---------------------------------------------------------------------------
// Hexes, land and coast
// ---------------------------------------------------------------------------
const AXIAL_NEIGHBORS = Object.freeze([[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]]);
const key = (q, r) => `${q},${r}`;
const landHexes = new Set(LAND_HEXES.map(([q, r]) => key(q, r)));
const cellRegion = new Map(), cellTerrain = new Map();
for (const id of REGION_ORDER) for (const cell of SURVEY.regions.find(r => r.name === id).cells) { cellRegion.set(key(cell.q, cell.r), id); cellTerrain.set(key(cell.q, cell.r), cell.terrain); }

/** Axial hex containing a world point. */
export function hexAt(x, z) {
  const atlas = TRANSFORM.worldToAtlas(x, z);
  const px = atlas.x + SURVEY_ORIGIN.x, py = atlas.y + SURVEY_ORIGIN.y;
  return axialRound((Math.sqrt(3) / 3 * px - py / 3) / ATLAS_HEX_SIZE, py * 2 / 3 / ATLAS_HEX_SIZE);
}
function axialRound(q, r) {
  const y = -q - r;
  let rq = Math.round(q), rr = Math.round(r), ry = Math.round(y);
  const dq = Math.abs(rq - q), dr = Math.abs(rr - r), dy = Math.abs(ry - y);
  if (dq > dr && dq > dy) rq = -rr - ry; else if (dr > dy) rr = -rq - ry;
  return { q: rq, r: rr };
}
export function hexCentre(q, r) {
  return TRANSFORM.atlasToWorld(ATLAS_HEX_WIDTH * (q + r / 2) - SURVEY_ORIGIN.x, ATLAS_HEX_SIZE * 1.5 * r - SURVEY_ORIGIN.y);
}
/** The six corners of a hex in atlas pixels, for drawing the chart's own grid over it. */
export function hexAtlasCorners(q, r) {
  const cx = ATLAS_HEX_WIDTH * (q + r / 2) - SURVEY_ORIGIN.x, cy = ATLAS_HEX_SIZE * 1.5 * r - SURVEY_ORIGIN.y;
  return Array.from({ length: 6 }, (_, i) => {
    const angle = Math.PI / 180 * (60 * i - 30);
    return { x: cx + ATLAS_HEX_SIZE * Math.cos(angle), y: cy + ATLAS_HEX_SIZE * Math.sin(angle) };
  });
}

/** True where the authored atlas claims land; everything else inside the world is the Stills. */
export function isLandHex(x, z) { const h = hexAt(x, z); return landHexes.has(key(h.q, h.r)); }

// ---------------------------------------------------------------------------
// Tidehaven's placement: the original village keeps its own local coordinates
// ---------------------------------------------------------------------------
/**
 * Tidehaven, the Greenway and the woodland places were authored with the sea to
 * the south. Drent's coast faces east, so the whole settlement is carried over
 * as one piece, turned a quarter turn: local -Z (inland) becomes world -X.
 */
export const VILLAGE = Object.freeze({ ...at(-20, 29), yaw: Math.PI / 2 });
export const villageToWorld = (lx, lz) => ({ x: lz + VILLAGE.x, z: VILLAGE.z - lx });
export const worldToVillage = (x, z) => ({ x: VILLAGE.z - z, z: x - VILLAGE.x });

// The goblin camp (HIDEOUT_SITE, hideoutToWorld) stands in southern Pueth now: see src/pueth-world.js.
/** The local box Tidehaven's original terrain and woodland scatter occupy. */
export const VILLAGE_LOCAL_BOX = Object.freeze({ minX: -112, maxX: 112, minZ: -168, maxZ: 60 });

// ---------------------------------------------------------------------------
// Terrain: a base level and relief per biome, blended between neighbouring hexes
// ---------------------------------------------------------------------------
export const REGION_TERRAIN = Object.freeze({
  Drent: Object.freeze({ base: 4.6, amp: 2.6, wave: 90, ground: REGION_BIOMES.Drent.ground }),
  Luscia: Object.freeze({ base: 8.6, amp: 4.5, wave: 140, ground: REGION_BIOMES.Luscia.ground }),
  'Moros Plain': Object.freeze({ base: 6.4, amp: .9, wave: 260, ground: REGION_BIOMES['Moros Plain'].ground }),
  // The blade of the peninsula: pale limestone, thin soil. Its authored hills are
  // the southern ridges, which stand higher and barer than the coastal ground.
  'East Suval': Object.freeze({ base: 17, amp: 11, wave: 120, ground: REGION_BIOMES['East Suval'].ground, byTerrain: Object.freeze({
    hills: Object.freeze({ base: 25, amp: 13, wave: 110, ground: '#8f9182' }),
  }) }),
  'West Suval': Object.freeze({ base: 9.5, amp: REGION_BIOMES['West Suval'].relief.amplitude, wave: REGION_BIOMES['West Suval'].relief.wavelength, ground: REGION_BIOMES['West Suval'].ground }),
  // A cell's atlas terrain may refine its region's ground: Pueth's hills stand high and bare, its coastal plains low.
  Pueth: Object.freeze({ base: 7.2, amp: 3.2, wave: 130, ground: REGION_BIOMES.Pueth.ground, byTerrain: Object.freeze({
    hills: Object.freeze({ base: 19, amp: 9, wave: 115, ground: '#8f9585' }),
    plains: Object.freeze({ base: 5.6, amp: 1.8, wave: 170, ground: '#8c9a78' }),
  }) }),
  // Peblos is islands: its hills are the rock spines that hold each one above the Stills, its plains the low sand and turf between.
  Peblos: Object.freeze({ base: 6.4, amp: 2.6, wave: 95, ground: REGION_BIOMES.Peblos.ground, byTerrain: Object.freeze({
    hills: Object.freeze({ base: 10.5, amp: 4.6, wave: 85, ground: '#6f7c63' }),
    plains: Object.freeze({ base: 3.4, amp: 1.2, wave: 120, ground: '#7c8862' }),
  }) }),
  // West Izol is rock: dark and iron-brown at the water, slate-grey at height, with good pasture on the softer
  // slopes and one river flat where the town stands. The atlas's own terrain says which is which.
  'West Izol': Object.freeze({ base: 12.5, amp: 4.4, wave: 115, ground: REGION_BIOMES['West Izol'].ground, byTerrain: Object.freeze({
    hills: Object.freeze({ base: 21, amp: 7.5, wave: 130, ground: '#8a8b84' }),
    plains: Object.freeze({ base: 8, amp: 1.6, wave: 150, ground: '#94a06e' }),
  }) }),
  // Elagos is the northern shelf: it stands high above everything round it, and the ground falls to the Moros at its southern border.
  // Its lakes are cut back out of this ground by src/world-terrain.js from the water in src/elagos-world.js.
  Elagos: Object.freeze({ base: 19.8, amp: 2.6, wave: 165, ground: REGION_BIOMES.Elagos.ground, byTerrain: Object.freeze({
    forest: Object.freeze({ base: 20.6, amp: 3.0, wave: 150, ground: '#6d8a58' }),
    lake: Object.freeze({ base: 18.6, amp: 1.4, wave: 200, ground: '#84986a' }),
  }) }),
  // Amod is the slope itself. The atlas puts hills and one mountain along its northern rows and grassland along
  // its southern ones, so the plain hex blend already tips the whole country southward, out of the Lotharn and
  // down toward Elagos: a traveler walking west out of Pueth climbs, and every valley drains past them.
  // The relief here is deliberately quiet: Amod's shape is the hex tilt, the stream valleys and the
  // terraces themselves (src/amod-terraces.js), not noise. A loud sine field puts one-in-three pitches
  // under a road that an Amodian would never have laid, and no channel could hold grade across it.
  Amod: Object.freeze({ base: 24, amp: 2.4, wave: 190, ground: REGION_BIOMES.Amod.ground, byTerrain: Object.freeze({
    hills: Object.freeze({ base: 44, amp: 6.5, wave: 160, ground: '#94986c' }),
    mountain: Object.freeze({ base: 78, amp: 14, wave: 130, ground: '#8a8c80' }),
  }) }),
  // Vastos is the flattest high ground in the world and the highest ordinary ground in it:
  // "a broad elevated tableland that sits above the surrounding terrain on both its eastern
  // and western approaches, reached by gradual climbs". Thirty metres puts it ten above the
  // Elagos shelf, so the hex blend alone makes the climb from the lake country a rise of ten
  // metres over two hundred, which is what a gradual climb is. The amplitude is a tenth of
  // Amod's over a wavelength twice as long: on this plain the eye should find nothing to
  // rest on but the river, the pans and the weather.
  Vastos: Object.freeze({ base: 30.5, amp: 1, wave: 300, ground: REGION_BIOMES.Vastos.ground }),
  // Meneth is cold upland on a mountain margin, lower than the tableland beside it and much
  // higher than the branch country below it. Its base is quiet on purpose: the region's shape
  // is the ridge field in src/west-ground.js, and noise on top of a ridge is just noise.
  Meneth: Object.freeze({ base: 26, amp: 1.8, wave: 140, ground: REGION_BIOMES.Meneth.ground }),
  // Caricas is the fall from an upland shelf to the Lizeem. Its base is the corridor's own
  // level, low enough that the big river has somewhere to be; the shelf that stands above it
  // is added by src/west-ground.js, because it is a ramp across the region and not a level.
  // The relief is louder than the uplands': "rougher and less well-watered", says the lore.
  Caricas: Object.freeze({ base: 17, amp: 3.2, wave: 130, ground: REGION_BIOMES.Caricas.ground }),
  // Nesdor is two countries and the atlas already divides them: grassland and one forest hex at
  // the north-western head, plains everywhere south and east of it. The head keeps the branch
  // country's shallow broad valleys; the Flats are the Moros approach, where "the terrain relief
  // is measured in feet rather than hundreds of feet" — half the amplitude of the Moros itself,
  // over a wavelength half again as long, so the horizon opens and stays open.
  Nesdor: Object.freeze({ base: 9.5, amp: 1.6, wave: 200, ground: REGION_BIOMES.Nesdor.ground, byTerrain: Object.freeze({
    plains: Object.freeze({ base: 7.2, amp: .45, wave: 340, ground: '#aeb075' }),
    forest: Object.freeze({ base: 10.2, amp: 2, wave: 170, ground: '#8d9c63' }),
  }) }),
  outland: Object.freeze({ base: 11.5, amp: 6, wave: 150, ground: '#8d9a6d' }),
});
/** The terrain a hex cell stands on: its region's profile, refined by the cell's atlas terrain where the region says so. */
const cellProfile = (name, terrain) => REGION_TERRAIN[name].byTerrain?.[terrain] ?? REGION_TERRAIN[name];

/** Biome weights around a world point: the containing hex and its six neighbours. */
export function terrainMix(x, z) {
  const home = hexAt(x, z);
  let total = 0, base = 0, amp = 0, wave = 0;
  const weights = Object.fromEntries(Object.keys(REGION_TERRAIN).map(name => [name, 0]));
  const grounds = {};
  for (const [dq, dr] of [[0, 0], ...AXIAL_NEIGHBORS]) {
    const q = home.q + dq, r = home.r + dr, centre = hexCentre(q, r);
    const weight = Math.max(0, 1 - Math.hypot(x - centre.x, z - centre.z) / (METRES_PER_HEX * 1.28));
    if (!weight) continue;
    const name = cellRegion.get(key(q, r)) ?? 'outland';
    const terrain = cellProfile(name, cellTerrain.get(key(q, r)));
    total += weight; base += terrain.base * weight; amp += terrain.amp * weight; wave += terrain.wave * weight;
    weights[name] += weight;
    grounds[terrain.ground] = (grounds[terrain.ground] ?? 0) + weight;
  }
  if (!total) return { base: REGION_TERRAIN.outland.base, amp: REGION_TERRAIN.outland.amp, wave: REGION_TERRAIN.outland.wave, weights, grounds };
  for (const name of Object.keys(weights)) weights[name] /= total;
  for (const ground of Object.keys(grounds)) grounds[ground] /= total;
  return { base: base / total, amp: amp / total, wave: wave / total, weights, grounds };
}

export function relief(x, z, amp, wave) {
  const k = 6.2831853 / Math.max(20, wave);
  return amp * (Math.sin(x * k + z * k * .55) * .5 + Math.sin(x * k * .62 - z * k * 1.1) * .3 + Math.sin(x * k * 2.1 + z * k * 1.7) * .2);
}

// ---------------------------------------------------------------------------
// Signed distance to the coast, from the authored land hexes
// ---------------------------------------------------------------------------
const COAST_CELL = 4, COAST_MARGIN = 96;
/**
 * The lattice the coast is sampled on keeps one fixed phase — the one the seven
 * regions before Amod gave it. Growing the world at an edge then adds cells there
 * and moves no existing coastline by a fraction of a cell. Without this, adding a
 * region anywhere shifted every shore by a few centimetres, which was enough to
 * flip a seeded "is this stone above the tideline" test on the Solis downs and
 * reshuffle every field wall and olive tree after it.
 */
const COAST_PHASE = Object.freeze({ x: -1556.0019279391274, z: -704.3502691896258 });
const snapToCoast = (value, phase) => phase + Math.floor((value - phase) / COAST_CELL + 1e-9) * COAST_CELL;
const coast = (() => {
  const minX = snapToCoast(WORLD_BOUNDS.minX - COAST_MARGIN, COAST_PHASE.x), minZ = snapToCoast(WORLD_BOUNDS.minZ - COAST_MARGIN, COAST_PHASE.z);
  const columns = Math.ceil((WORLD_BOUNDS.maxX + COAST_MARGIN - minX) / COAST_CELL) + 1;
  const rows = Math.ceil((WORLD_BOUNDS.maxZ + COAST_MARGIN - minZ) / COAST_CELL) + 1;
  const land = new Uint8Array(columns * rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++)
    land[j * columns + i] = isLandHex(minX + i * COAST_CELL, minZ + j * COAST_CELL) ? 1 : 0;
  const transform = seeds => {
    const distance = new Float32Array(columns * rows).fill(1e9);
    for (let i = 0; i < distance.length; i++) if (seeds[i]) distance[i] = 0;
    const straight = COAST_CELL, diagonal = COAST_CELL * Math.SQRT2;
    for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) {
      const at = j * columns + i; let best = distance[at];
      if (i > 0) best = Math.min(best, distance[at - 1] + straight);
      if (j > 0) best = Math.min(best, distance[at - columns] + straight);
      if (i > 0 && j > 0) best = Math.min(best, distance[at - columns - 1] + diagonal);
      if (i < columns - 1 && j > 0) best = Math.min(best, distance[at - columns + 1] + diagonal);
      distance[at] = best;
    }
    for (let j = rows - 1; j >= 0; j--) for (let i = columns - 1; i >= 0; i--) {
      const at = j * columns + i; let best = distance[at];
      if (i < columns - 1) best = Math.min(best, distance[at + 1] + straight);
      if (j < rows - 1) best = Math.min(best, distance[at + columns] + straight);
      if (i < columns - 1 && j < rows - 1) best = Math.min(best, distance[at + columns + 1] + diagonal);
      if (i > 0 && j < rows - 1) best = Math.min(best, distance[at + columns - 1] + diagonal);
      distance[at] = best;
    }
    return distance;
  };
  const sea = new Uint8Array(land.length);
  for (let i = 0; i < land.length; i++) sea[i] = land[i] ? 0 : 1;
  const toSea = transform(sea), toLand = transform(land);
  let field = new Float32Array(land.length);
  for (let i = 0; i < land.length; i++) field[i] = land[i] ? toSea[i] : -toLand[i];
  // Two light smoothing passes turn the hexagonal edge into an ordinary coast.
  for (let pass = 0; pass < 2; pass++) {
    const next = new Float32Array(field.length);
    for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) {
      let sum = 0, count = 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const nj = j + dj, ni = i + di;
        if (nj < 0 || nj >= rows || ni < 0 || ni >= columns) continue;
        sum += field[nj * columns + ni]; count++;
      }
      next[j * columns + i] = sum / count;
    }
    field = next;
  }
  return { minX, minZ, columns, rows, field };
})();

function sampleCoast(x, z) {
  const fx = clamp((x - coast.minX) / COAST_CELL, 0, coast.columns - 1.0001);
  const fz = clamp((z - coast.minZ) / COAST_CELL, 0, coast.rows - 1.0001);
  const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
  const at = (a, b) => coast.field[b * coast.columns + a];
  return lerp(lerp(at(i, j), at(i + 1, j), tx), lerp(at(i, j + 1), at(i + 1, j + 1), tx), tz);
}

/** Tidehaven's own beach, in the village's local frame: the old shoreline curve. */
export function villageShoreLocalZ(lx) {
  return 27.5 + Math.sin(lx * .055) * 2.8 + Math.cos(lx * .15) * .65;
}

/**
 * Metres inland from the coast; negative at sea. The Stills reach a little
 * inside Drent's easternmost hex so Tidehaven keeps its original bay and pier.
 */
export function landDistance(x, z) {
  const atlas = sampleCoast(x, z);
  const bay = smooth(-70, -26, z) * (1 - smooth(88, 132, z));
  if (bay <= 0) return atlas;
  const local = worldToVillage(x, z);
  return lerp(atlas, Math.min(atlas, villageShoreLocalZ(local.x) - local.z), bay);
}

export const SEA_LEVEL = 0.06;

// ---------------------------------------------------------------------------
// The Caloss: the Drent–Luscia border river
// ---------------------------------------------------------------------------
export const CALOSS = Object.freeze({
  crossing: point(ANCHORS.calossCrossing.x, ANCHORS.calossCrossing.z),
  halfWidth: 7.4,
  points: Object.freeze([at(-556, -2), at(-482, 36), at(-424, 52), at(-386, 70),
    at(-345, 92.9), at(-306, 122), at(-266, 142), at(-222, 163), at(-182, 188)]),
});

/** Distance to the Caloss centre line, and the fraction of the way along it. */
export function calossDistance(x, z) {
  let best = Infinity;
  const points = CALOSS.points;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], dx = b.x - a.x, dz = b.z - a.z;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
    best = Math.min(best, Math.hypot(x - a.x - dx * t, z - a.z - dz * t));
  }
  return best;
}

// ---------------------------------------------------------------------------
// Roads
// ---------------------------------------------------------------------------
/** From Tidehaven's landing, through the forest, across the Caloss and west to the Moros. */
export const MAIN_ROAD = Object.freeze([
  // Tidehaven's own trail, point for point, turned onto Drent's coast.
  road(5, 29), road(-11, 29), road(-25, 29), road(-40, 30.6), road(-54, 27.3),
  road(-67, 29), road(-80, 30.5), road(-92, 29), road(-106, 40), road(-128, 34), road(-148, 21), road(-163, 26),
  road(-176, 29), road(-196, 25), road(-214, 30), road(-236, 30), road(-258, 39),
  road(-278, 52), road(-300, 64), road(-322, 78), road(-345, 92.9), road(-362, 107),
  road(-374, 124), road(-382, 142), road(-390, 162), road(-386, 182.9), road(-396, 202),
  road(-404, 222), road(-408, 228), road(-414, 242), road(-427, 259.4), road(-446, 276), road(-468, 292),
  road(-492, 308), road(-518, 326), road(-549.2, 348.1), road(-596, 352), road(-648, 348),
  road(-700, 352), road(-752, 348), road(-772, 350),
]);

/** The branch that leaves the Lauvel for Elod's border post and the town beyond. */
export const SUVAL_ROAD = Object.freeze([
  road(-390, 162), road(-360, 178), road(-330, 196), road(-300, 216), road(-272, 240),
  road(-250, 262), road(-231, 283.6), road(-204, 298), road(-176, 308), road(-150, 318),
  road(-118, 332), road(-86, 346), road(-56, 358), road(-28, 368.5),
]);

/**
 * Solis, the walled city on West Suval's south-west coast. Its whole layout is
 * in its own frame, square to the world: `solisPoint(a, b)` is `a` metres east
 * and `b` metres south of the market cross, with the Gate of Sun Horses at
 * (0, -42) on the road from the border and the quay gate at (-50, -8) on the sea.
 * The centre is an authored point (the `solis` cluster); the rest is metres.
 */
export const SOLIS = Object.freeze({ name: 'Solis', centre: at(-297, 551), halfX: 50, halfZ: 42 });
export const solisPoint = (a, b) => point(SOLIS.centre.x + a, SOLIS.centre.z + b);

/** From the border stockade on the Moros, south-east over the downs to the Gate of Sun Horses. */
export const SOLIS_ROAD = Object.freeze([
  at(-368, 308), road(-370, 339), road(-363, 374), road(-353, 407.5), road(-339, 441), road(-324, 472), road(-308, 495.5),
  solisPoint(-2, -78), solisPoint(0, -56), solisPoint(0, -42), solisPoint(0, -34),
]);

/**
 * Built ground: a plane that overrides the natural relief inside its half
 * extents and fades back to it across `feather` metres. Solis stands on one,
 * rising gently from the quay to the Court of Oaths, so its walls keep one
 * height and its square is level enough to fight across.
 */
/**
 * Cobble's harbour terrace on Peblos: the shelf of made ground the village and
 * its quay stand on, between the beach of its bay and the rock behind. Low, so
 * the quay is two metres above the water and not a cliff over it.
 */
export const COBBLE_TERRACE = Object.freeze({ id: 'cobble', x: 334, z: 428, halfX: 11, halfZ: 13, feather: 24, level: 3, slopeX: .1, slopeZ: .03, shore: true });

/**
 * Elod's inner precinct stands on a levelled shelf of the rock above its
 * harbour: the natural ground there runs from twelve to nineteen metres and the
 * platform takes it to fifteen, which is a cut face on the landward side and a
 * revetment above the harbour. The feather is short on purpose — that revetment
 * is meant to read as built, not as a hillside (see src/east-suval.js).
 */
export const ELOD_TERRACE = Object.freeze({ id: 'elod-precinct', x: -37, z: 632, halfX: 10, halfZ: 20, feather: 9, level: 15, slopeX: 0, slopeZ: 0 });

/**
 * West Izol's made ground. Izol is rock: the coast is a run of hex-pointed
 * headlands with a small cove between each pair, and none of those coves has a
 * platform behind it. Every settled place on the island therefore stands on
 * ground somebody cut, which is why the Izoli have protocols for quarrying.
 * Izolveth's own terrace climbs from the quay at the water to the meeting house
 * at the back of the town; the other three are shelves the size of what stands
 * on them.
 */
export const IZOLVETH_TERRACE = Object.freeze({ id: 'izolveth', x: 58, z: 1782, halfX: 32, halfZ: 44, feather: 17, level: 7.6, slopeX: 0, slopeZ: .108, shore: true });
export const IZOL_CAMP_GROUND = Object.freeze({ id: 'izol-camp', x: 176, z: 1886, halfX: 42, halfZ: 28, feather: 22, level: 8.4, slopeX: 0, slopeZ: 0 });
export const ARDVETH_SHELF = Object.freeze({ id: 'ardveth', x: -88, z: 1818, halfX: 16, halfZ: 14, feather: 16, level: 3.8, slopeX: .06, slopeZ: 0, shore: true });
export const KELVATH_SHELF = Object.freeze({ id: 'kelvath', x: 250, z: 1748, halfX: 18, halfZ: 13, feather: 14, level: 3.4, slopeX: 0, slopeZ: .05, shore: true });

/**
 * Ambron, the walled city on the Lake Ela narrows: the seat of the empire and
 * the toll that pays for it. Like Solis it is laid out in its own frame, square
 * to the world: `ambronPoint(a, b)` is `a` metres east and `b` metres south of
 * the head of the causeway, which stands in the middle of the water.
 *
 * The channel of the Ela-south runs north to south straight through the city at
 * a = 0, so the walls enclose ground on both banks and every barge going south
 * passes under the city's chain. The east bank is the old city and stands
 * higher; the west bank is the timber strand and stands nearly at the water.
 */
export const AMBRON = Object.freeze({ name: 'Ambron', centre: point(-1274, 286), halfA: 92, halfB: 68, channelHalf: 23 });
export const ambronPoint = (a, b) => point(AMBRON.centre.x + a, AMBRON.centre.z + b);
/** The made ground the city stands on: level, tilting up to the old east bank. */
export const AMBRON_TERRACE = Object.freeze({ id: 'ambron', x: AMBRON.centre.x, z: AMBRON.centre.z,
  halfX: AMBRON.halfA + 12, halfZ: AMBRON.halfB + 12, feather: 30, level: 17.2, slopeX: .012, slopeZ: 0 });

export const TERRAIN_PADS = Object.freeze([
  Object.freeze({ id: 'solis', x: SOLIS.centre.x, z: SOLIS.centre.z, halfX: SOLIS.halfX + 13, halfZ: SOLIS.halfZ + 13, feather: 28, level: 6.5, slopeX: .05, slopeZ: 0 }),
  COBBLE_TERRACE, IZOLVETH_TERRACE, IZOL_CAMP_GROUND, ARDVETH_SHELF, KELVATH_SHELF,
  ELOD_TERRACE,
  AMBRON_TERRACE,
]);

/** Where the tutorial ends and the journey's road begins: the Caloss Gate onward. */
const CALOSS_GATE_VERTEX = road(-176, 29);
export const ONWARD_ROAD = Object.freeze(MAIN_ROAD.slice(MAIN_ROAD.findIndex(p => p.x === CALOSS_GATE_VERTEX.x && p.z === CALOSS_GATE_VERTEX.z)));
/** The whole walkable road network, for the traversal smoke and the charts. */
export const ROAD_JUNCTION = road(-390, 162);

// ---------------------------------------------------------------------------
// Places along the road
// ---------------------------------------------------------------------------
/** Tidehaven's forest gate. Beyond it the road runs on to the Caloss. */
export const CALOSS_GATE = Object.freeze({ ...at(-176, 29), name: 'The Caloss Gate', barrierX: at(-182, 29).x,
  regionName: 'The Avrel clearing', open: true });
export const FERNWAY_REST = Object.freeze({ ...at(-128, 34), name: 'Fernway Rest' });
/** Drent's one farm clearing, cut out of the forest where the Avrel families work. */
export const AVREL_CLEARING = Object.freeze({ ...at(-236, 30), radius: 38 });

/**
 * Lumber Town, the market town at the centre of Luscia, between the field at
 * the Lauvel and the Moros gate. The main road runs through its square, and
 * everything in the town is placed in the square's own frame: `a` metres along
 * the road toward the Moros, `b` metres across it to the east.
 */
export const LUMBER_TOWN = Object.freeze({
  name: 'Lumber Town', square: at(-408, 228), radius: 30,
  along: point(-0.4472, 0.8944), across: point(0.8944, 0.4472),
});
/** A point in Lumber Town's frame. */
export const townPoint = (a, b) => point(
  LUMBER_TOWN.square.x + LUMBER_TOWN.along.x * a + LUMBER_TOWN.across.x * b,
  LUMBER_TOWN.square.z + LUMBER_TOWN.along.z * a + LUMBER_TOWN.across.z * b);
/**
 * The stable yard at the town's south-west end, beside the road to the Moros: where the ostler stands and where the
 * traveler's horse is hitched when it is handed over (src/ostler.js, src/riding.js). Keep 6 m round each clear.
 */
export const LUMBER_TOWN_STABLE = Object.freeze({
  stand: Object.freeze({ ...townPoint(23, 8), yaw: Math.atan2(-LUMBER_TOWN.across.x, -LUMBER_TOWN.across.z) }),   // facing the road
  hitch: Object.freeze({ ...townPoint(26.5, 10.5), yaw: Math.atan2(LUMBER_TOWN.along.x, LUMBER_TOWN.along.z) }),  // head toward the Moros
});

export const regionNpcPositions = Object.freeze({
  'meadow-courier': at(-230, 17),         // Corvan, army quartermaster, at the farm clearing
  'crossing-keeper': at(-357, 106),       // Hollis, at the Caloss bridge
  'ridge-keeper': at(-372, 131),          // Sava, at her shrine on the Luscia side
  'relay-clerk': townPoint(5, -6),        // Iven, at the army relay post on Lumber Town's square
  // Lumber Town's people, around the square and the timber yard.
  'town-innkeeper': townPoint(-8, 4),
  'town-carter': townPoint(-2, 9),
  'town-elder': townPoint(-16, 2),
  'timber-stall': townPoint(8, 7),
  'town-sawyer': townPoint(4, 13),
  'town-yardhand': townPoint(0, 14),
  'town-beggar': townPoint(0, -4),        // Smiths, who wanders the square
  // Captain Drevan's garrison keeps the Tessen road post in Pueth now (src/pueth-world.js).
  // The field at the Lauvel and the burned hamlet, north-east of the town.
  'lauvel-picket': at(-392, 186),         // Talven, on the picket line
  'burial-searcher': at(-387, 198),       // Ilva, at the burial line
  'hamlet-drover': at(-344, 208),         // Garran, at the burned hamlet
});

export const journeySites = Object.freeze({
  'cart-parcel-1': Object.freeze({ id: 'cart-parcel-1', ...at(-252, 8), name: 'Cloth parcel', type: 'parcel', region: 2 }),
  'cart-parcel-2': Object.freeze({ id: 'cart-parcel-2', ...at(-259, 20), name: 'Provision parcel', type: 'parcel', region: 2 }),
  'cart-parcel-3': Object.freeze({ id: 'cart-parcel-3', ...at(-246, 2), name: 'Wax-sealed parcel', type: 'parcel', region: 2 }),
  'bridge-repair': Object.freeze({ id: 'bridge-repair', ...at(-345, 92.9), name: 'The Caloss bridge', type: 'bridge', region: 3 }),
  'beacon-west': Object.freeze({ id: 'beacon-west', ...at(-392, 132), name: 'First waymarker', type: 'beacon', region: 4 }),
  'beacon-east': Object.freeze({ id: 'beacon-east', ...at(-364, 150), name: 'Second waymarker', type: 'beacon', region: 4 }),
  'beacon-north': Object.freeze({ id: 'beacon-north', ...at(-404, 172), name: 'Third waymarker', type: 'beacon', region: 4 }),
  'bridge-debris-1': Object.freeze({ id: 'bridge-debris-1', ...at(-330, 76), name: 'Dry driftwood', type: 'sticks', quantity: 2, region: 3 }),
  'bridge-debris-2': Object.freeze({ id: 'bridge-debris-2', ...at(-366, 112), name: 'Fallen branches', type: 'sticks', quantity: 2, region: 3 }),
  'meadow-fruit': Object.freeze({ id: 'meadow-fruit', ...at(-258, 46), name: 'Pawpaw windfalls', type: 'fruit', quantity: 2, region: 2 }),
  'river-fruit': Object.freeze({ id: 'river-fruit', ...at(-330, 130), name: 'Riverside pawpaws', type: 'fruit', quantity: 2, region: 3 }),
  'ridge-fruit': Object.freeze({ id: 'ridge-fruit', ...at(-412, 152), name: 'Sheltered pawpaws', type: 'fruit', quantity: 2, region: 4 }),
  'meadow-sticks': Object.freeze({ id: 'meadow-sticks', ...at(-216, 12), name: 'Dry branches', type: 'sticks', quantity: 2, region: 2 }),
  'ridge-sticks': Object.freeze({ id: 'ridge-sticks', ...at(-356, 128), name: 'Wind-fallen branches', type: 'sticks', quantity: 2, region: 4 }),
});

export const regionRepairBenches = Object.freeze([
  Object.freeze({ id: 'meadow-repair', ...at(-220, 40), name: 'Avrel clearing repair bench' }),
  Object.freeze({ id: 'crossing-repair', ...at(-368, 96), name: 'Caloss crossing repair bench' }),
  Object.freeze({ id: 'ridge-repair', ...at(-384, 138), name: 'Sava’s shrine repair bench' }),
]);

const fire = (x, z) => { const p = toWorld(x, z); return { fireX: p.x, fireZ: p.z }; };
export const regionFirePits = Object.freeze([
  Object.freeze({ id: 'meadow-fire', ...at(-212, 40), ...fire(-212, 41.5) }),
  Object.freeze({ id: 'crossing-fire', ...at(-370, 118), ...fire(-371.4, 118.6) }),
  Object.freeze({ id: 'ridge-fire', ...at(-398, 146), ...fire(-399.4, 146.6) }),
]);

/** The marked fishing bank on the Caloss, upstream of the bridge. */
export const CALOSS_BANK = Object.freeze({ spot: at(-306, 104), cast: at(-300, 114) });

export const regionLandmarks = Object.freeze([
  Object.freeze({ id: 'sunmeadow', name: 'The Avrel Clearing', ...at(-236, 30), description: 'The one farm clearing cut out of Drent’s forest: crop rows, a canvas field camp, and the army’s supply post.' }),
  Object.freeze({ id: 'fallen-cart', name: 'The Tumbled Cart', ...at(-243, 19), description: 'A courier’s wheel gave way on the farm track. Scattered parcels lie among the stubble.' }),
  Object.freeze({ id: 'old-mill', name: 'The Clearing Mill', ...at(-227, 57), description: 'Slow canvas sails turn above the Avrel grain rows and a stone-lined well.' }),
  Object.freeze({ id: 'reedwater', name: 'Caloss Crossing', ...at(-334, 84), description: 'The road drops to the Caloss. Drent ends on this bank; Luscia begins on the far one.' }),
  Object.freeze({ id: 'reed-bridge', name: 'The Caloss Bridge', ...at(-345, 92.9), description: 'An old timber bridge crosses the border river. Its sound eastern walkway remains passable.' }),
  Object.freeze({ id: 'reedwater-bank', name: 'The Quiet Bank', ...at(-306, 104), description: 'A rod rest and a low stool mark a sheltered place to fish the slow water.' }),
  Object.freeze({ id: 'river-camp', name: 'The Reedcutters’ Camp', ...at(-372, 116), description: 'Drying reeds, tied boats, and a small raised shelter stand above the Luscian bank.' }),
  Object.freeze({ id: 'threefold', name: 'Sava’s Shrine', ...at(-377, 138), description: 'A swept step, clean water and straight road stones on the first open ground of Luscia.' }),
  Object.freeze({ id: 'beacon-ridge', name: 'The Three Waymarkers', ...at(-386, 152), description: 'Three reflective road stones once guided every traveler between the Caloss and the Lauvel.' }),
  Object.freeze({ id: 'north-relay', name: 'The Lauvel Relay', ...at(-401, 196), description: 'The army’s old relay hut, empty since the clerk moved his desk down to Lumber Town’s square.' }),
  Object.freeze({ id: 'lumber-town', name: 'Lumber Town', ...at(-408, 228), radius: 26, description: 'Luscia’s market town between its two palisade gates: a square of stalls and a well, an inn, a smithy and a hall, the timber yard above the sawpits, the stable yard, and the army’s relay post on the corner.' }),
  // Story hooks placed as scenery for the chapter that follows.
  Object.freeze({ id: 'lauvel-field', name: 'The Field at the Lauvel', ...at(-386, 182.9), description: 'Broken carts, a fallen banner and a burial line: ten days ago the army met a rebel army here.' }),
  Object.freeze({ id: 'burned-hamlet', name: 'The Burned Hamlet', ...at(-348, 212), description: 'Four roofless walls and a standing chimney. Nobody has come back to clear the ash.' }),
  Object.freeze({ id: 'moros-gate', name: 'The Moros Gate', ...at(-427, 259.4), description: 'Two great posts under a beam, palisade wings and a watch platform where the last copse ends. West of here the grass runs to the horizon.' }),
  Object.freeze({ id: 'legion-camp', name: 'The Army Camp', ...at(-549.2, 348.1), description: 'The Ambroni outpost at the heart of the Moros: a ditch, a timber palisade on its rampart, towers, ordered tent lines and the Marshal’s standard.' }),
  Object.freeze({ id: 'moros-stockade', name: 'The Border Stockade', ...at(-368, 308), description: 'The small timber work the army and the republic both want: a ditch, a rampart with a fighting platform, corner towers and a truce flag.' }),
  Object.freeze({ id: 'suval-border-post', name: 'Elod’s Border Post', ...at(-224, 292), description: 'Elod’s old barrier across the road, behind the stone frontier that now shuts East Suval.' }),
  Object.freeze({ id: 'old-waystation', name: 'The Roofless Waystation', ...at(-154, 328), description: 'A leaning stone arch and a few paving slabs outlast a forgotten roadside shelter.' }),
  Object.freeze({ id: 'elod-gate', name: 'The Sea-Road Gate of Elod', ...at(-28, 368.5), radius: 12,
    description: 'Where the stone road ends: two piers of grey ashlar, a lintel with three lines of Koleth cut across it, and a gate that has been shut for three years. The cutting says what the road is for and not one word about who may use it. Beyond it the city steps down its rock to the water.' }),
  Object.freeze({ id: 'bandit-lookout', name: 'The Hill Lookout', ...at(-74, 498), description: 'A ring of ridge stones above the southern hills. Somebody watches the road from here, but not today.' }),
]);

/** Scenery-and-stand hooks the next chapter will use. Positions only. */
export const STORY_SITES = Object.freeze({
  lauvelField: at(-386, 182.9), burnedHamlet: at(-348, 212), morosGate: at(-427, 259.4),
  legionCamp: at(-549.2, 348.1), morosStockade: at(-368, 308), horseHitch: at(-566, 320),
  suvalBorderPost: at(-224, 292), waystation: at(-154, 328), elodGate: at(-28, 368.5),
  banditLookout: at(-74, 498),
});

/**
 * The army’s rope line west of the camp. It was the end of the built world until Nesdor was
 * built beyond it; it stays where it is, as an Ambroni line inside a country the Empire does
 * not hold (docs/design-answers.md). Nothing about it moves: only what it is called.
 */
export const FRONTIER = Object.freeze({ ...at(-776, 350), barrierX: at(-782, 350).x, name: 'The Army’s Line',
  regionName: 'An Ambroni line across the Nesdor Flats, in a country the Empire does not hold' });

// ---------------------------------------------------------------------------
// Regions
// ---------------------------------------------------------------------------
function outlineBounds(loops) {
  const points = loops.flat();
  return { minX: Math.min(...points.map(p => p.x)), maxX: Math.max(...points.map(p => p.x)),
    minZ: Math.min(...points.map(p => p.z)), maxZ: Math.max(...points.map(p => p.z)) };
}

const REGION_TEXT = {
  Drent: { subtitle: 'The forest coast and Tidehaven', spawn: at(-15, 29),
    description: 'All of Drent is broadleaf forest: ferns, sorrel and deer, with Tidehaven on the eastern shore, one farm clearing inland, and the ruins of Rena at its centre, where the region’s principal town stood until eighty years ago.',
    palette: { ground: '#4d7a3e', accent: '#c9d3a0', fog: '#b6c6ad' },
    npcIds: ['meadow-courier', 'commons-miller', 'rena-lorn', 'rena-hesta', 'apple-reeve'],
    landmarks: ['sunmeadow', 'fallen-cart', 'old-mill', 'mill-commons', 'rena-ruins', 'applegarth', 'east-rena-stone'] },
  Luscia: { subtitle: 'Across the Caloss', spawn: at(-362, 110),
    description: 'Rolling grass and thinning copses beyond the border river: the shrines of the valley, Lumber Town on the road, and the field at the Lauvel.',
    palette: { ground: '#8fa35a', accent: '#dfc77d', fog: '#bdc9b5' },
    npcIds: ['crossing-keeper', 'ridge-keeper', 'relay-clerk', 'reed-worker', 'town-innkeeper', 'timber-stall', 'town-sawyer'],
    landmarks: ['reedwater', 'reed-bridge', 'reedwater-bank', 'river-camp', 'landing-workshop', 'threefold', 'beacon-ridge', 'north-relay', 'lauvel-field', 'lumber-town', 'burned-hamlet'] },
  'Moros Plain': { subtitle: 'The army’s open country', spawn: at(-452, 278),
    description: 'Flat treeless grassland under an enormous sky. The army camp is visible from a long way off, and horses graze the line.',
    palette: { ground: '#b9b36c', accent: '#e4d59a', fog: '#cfd3b4' },
    npcIds: [], landmarks: ['moros-gate', 'legion-camp', 'moros-stockade'] },
  // East Suval is closed (src/closed-border.js): its spawn is the city, which is
  // where the developer tools and the testing panel set a tester down.
  'East Suval': { subtitle: 'Stone hills and Elod', spawn: point(-56, 636),
    description: 'Pale limestone and thin soil, aromatic scrub, dry terraces and field walls, and an eastern coast with harder weather than the west. Elod stands on its shelf above the water and has closed its country to stay out of the war; its black-clad pickets turn back anyone who tries to cross.',
    palette: { ground: '#9b9d85', accent: '#e1d1a7', fog: '#bbc6bf' },
    npcIds: ['shelter-keeper', 'elod-harbourmaster', 'elod-warden', 'elod-theologian', 'elod-priest', 'elod-factor', 'elod-scribe-master', 'suval-lightkeeper'],
    landmarks: ['suval-border-post', 'old-waystation', 'waystation-shelter', 'elod-gate', 'bandit-lookout',
      'the-threshold', 'elod-inner-gate', 'elod-sea-gate', 'elod-quay', 'elod-harbour-quarter',
      'frontier-guard-house', 'north-light', 'sorrow-beach', 'sevenwalls', 'shepherds-cistern'] },
  'West Suval': { subtitle: 'The coast downs and Solis', spawn: road(-353, 407.5),
    description: 'Rolling coastal grass, thorn and olive, field walls of pale stone, and Solis on its terraces above the sea: once a kingdom’s capital, then the Empire’s, and for a few days now the Coalition’s.',
    palette: { ground: '#a9a95c', accent: '#e8cf8e', fog: '#c9d0bd' },
    npcIds: ['solis-gate-captain', 'solis-merchant'], landmarks: ['west-suval-border', 'shepherds-fold', 'old-watchtower', 'wayside-well', 'coalition-camp', 'solis'] },
  // Pueth is authored in world metres (src/pueth-world.js); its spawn is the Tessen road post.
  Pueth: { subtitle: 'Across the Tessen', spawn: point(-137, -214),
    description: 'Cold timber country north of Drent: birch and fir by the Tessen, open valley grass, bare hills toward Feradom, and Rimeholt on the road north.',
    palette: { ground: '#7f9175', accent: '#d9dccb', fog: '#b9c4c4' },
    npcIds: ['garrison-captain', 'garrison-casso', 'garrison-brill', 'rimeholt-reeve', 'rimeholt-innkeeper', 'rimeholt-foreman', 'rimeholt-carter', 'rimeholt-trapper', 'rimeholt-sentry'],
    landmarks: ['tessen-bridge', 'tessen-post', 'tessen-shallows', 'bramble-scout-camp', 'birch-landing', 'rimeholt', 'grey-shoulder', 'cold-hearth', 'ordel-mouth', 'feradom-road'] },
  // Amod is authored in world metres (src/amod-world.js); its spawn is the pass stones on the road in from Pueth.
  Amod: { subtitle: 'The terrace country', spawn: point(-676, -474),
    description: 'Foothills south of the Lotharn, ribbed from the stream beds to the chestnut woods with dry-stone terraces that the same families have rebuilt for eight hundred years. Water is the law here and the water courts keep it; there is no crown, only the Terrace Compact. Ostel is the first town on the road in, dry-slope stone and hard white wine.',
    palette: { ground: '#9aa169', accent: '#e0cf9a', fog: '#c6c7ac' },
    npcIds: ['ostel-measure-keeper', 'ostel-stonecutter', 'ostel-roadhouse', 'ostel-accountant', 'ostel-clerk', 'ostel-vintner'],
    landmarks: ['amod-pass-stones', 'amod-toll-stone', 'amod-first-terrace', 'amod-pueth-view', 'amod-culvert', 'tarvel-bridge', 'ostel', 'ostel-spring', 'tir-ostel', 'vessen', 'dromel-gate', 'tarvel-head', 'kelmod-road'] },
  // Peblos is authored in world metres too (src/peblos-world.js); its spawn is the quay the boatman lands at.
  Peblos: { subtitle: 'The islands off the Drent coast', spawn: point(316, 428),
    description: 'Low barrier islands south-east of Drent, an hour under oars from Tidehaven: salt grass and thrift, grey rock at the waterline, gulls, and one fishing village on the quay at Cobble.',
    palette: { ground: '#76855f', accent: '#e7e0c0', fog: '#bdcdc9' },
    npcIds: ['cobble-netmistress', 'cobble-boatwright', 'cobble-lobsterman', 'cobble-salter', 'cobble-oldhand', 'cobble-keeper', 'cobble-runner',
      'peblos-decurion', 'peblos-legionary-1', 'peblos-legionary-2', 'peblos-legionary-3', 'boatman'],
    landmarks: ['cobble', 'cobble-quay', 'sea-shrine', 'headland-light', 'seal-cove', 'drowned-field', 'longstone-beacon', 'gull-scarp', 'pilots-stone', 'wreck-of-the-sea-mare', 'saltings'] },
  // West Izol is authored in world metres too (src/izol-world.js); its spawn is the quay a ship puts the traveler ashore on.
  'West Izol': { subtitle: 'The western half of the island of Izol', spawn: point(56, 1725),
    description: 'Rock, sea turf and headlands across the Izoli Channel: Izolveth on its river flat with the Coalition\u2019s army camped above it, the fishing cove at Ardveth, and the road inland toward the Three Presences. The confederation has no capital, and says so.',
    palette: { ground: '#7e8b62', accent: '#d8d0ae', fog: '#b4c3c0' },
    npcIds: [], landmarks: [] },
  // Elagos is authored in world metres too (src/elagos-world.js); its spawn is the haul road below Ambron's Plain Gate.
  Elagos: { subtitle: 'The Lake Lands and Ambron', spawn: point(-1221, 386),
    description: 'The northern shelf, and the lakes that made an empire: Ela running north out of sight, Brul and Ossen and the Thelas chain beyond it, and Ambron astride the narrows where all of that water goes south. Everything that floats out of the Lake Lands pays the chain.',
    palette: { ground: '#7d9560', accent: '#cfe0e4', fog: '#b4c6c4' },
    npcIds: ['ambron-toll-clerk', 'ambron-legate', 'ambron-committee', 'ambron-gate-optio'],
    landmarks: ['ambron', 'ambron-chain', 'ambron-causeway', 'ambron-plain-gate', 'physic-garden', 'lake-ela', 'nemmel', 'ice-road-stone', 'drowned-causeway', 'lake-shrine', 'the-stair', 'thelas-link', 'lake-brul', 'lake-ossen'] },
  // Vastos is terrain and wildlife only (src/west-regions.js, src/west-ground.js). Nobody
  // lives here yet: the winter quarters, the river crossings and the vel-vastos routes the
  // lore describes are all somebody's, and somebody is not built.
  Vastos: { subtitle: 'The cold tableland', spawn: point(-1520, -330),
    description: 'A high, flat, treeless upland west of the lake country: cold-adapted tussock from one horizon to the other, a shallow river braiding across the south, watering pans on the open range, and longhorn cattle grazing loose on all of it. Sulfur ground breathes on the western fall; two small cold lakes on the eastern one prefigure Elagos.',
    palette: { ground: '#8f9d6c', accent: '#d9d3a4', fog: '#c2c8bc' },
    npcIds: [], landmarks: ['vastos-river', 'vastos-braids', 'vastos-sinter', 'vastos-pans', 'vastos-basins', 'vastos-beck'] },
  // Meneth is terrain and wildlife only too. The routes the lore is built round — the Southern
  // Lotharn Road and the junction communities that live off it — are somebody's, and are not built.
  Meneth: { subtitle: 'The ridge country', spawn: point(-1850, -206),
    description: 'Cold ridge-and-valley upland between the mountains and the lake country: parallel ridges running east and west, a beck on every valley floor, hay meadow between them, wild chestnut and walnut on the lower faces and close-grown hardwood above. Southward the ridges lower and the country opens, and there is no line at which Meneth stops.',
    palette: { ground: '#7d8f63', accent: '#cfd4a6', fog: '#bac6bb' },
    npcIds: [], landmarks: ['meneth-ridges', 'meneth-becks', 'meneth-nut-slopes'] },
  // Caricas is terrain and wildlife only. The fox keeper families, the Water Council and the
  // farms on the terraced slopes are the region's whole political life and none of it is built;
  // what is built is the ground they keep, and the fox.
  Caricas: { subtitle: 'The Carica corridor', spawn: point(-1950, 289),
    description: 'A wooded river corridor on the fall from an upland shelf to the Lizeem: the Carica quick and rocky where it leaves the shelf, slow and deep-banked below, and old-growth forest tight to the water for the whole of its middle reach. This is the ground of the vel-caric, the river fox, and it has never been cleared.',
    palette: { ground: '#7e8f5b', accent: '#c7cf9a', fog: '#b0bfae' },
    npcIds: [], landmarks: ['carica-corridor', 'carica-upper', 'lizeem-channel', 'caricas-shelf'] },
  // Nesdor is terrain and wildlife only. The Nesdor Way, the route-communities that live off
  // it, the inns and warehouses and the legal practitioners who sell the difference between
  // two jurisdictions are the whole of what the lore is about, and none of it is built.
  Nesdor: { subtitle: 'The Flats', spawn: point(-1550, 462),
    description: 'Where the counted rivers of the branch country give out and the open country begins: shallow broad valleys with hazel and oak on their slopes in the north-west, and east and south of them the Flats — dark alluvial ground, relief measured in feet, shallow water braiding across it toward the Lizeem, cattle on the grass and an open horizon all the way to the Moros.',
    palette: { ground: '#a3a86a', accent: '#ded9a4', fog: '#cbd0b6' },
    npcIds: [], landmarks: ['nesdor-flats', 'nesdor-braids', 'nesdor-head', 'lizeem-bend'] },
};

export const regions = Object.freeze(REGION_ORDER.map(name => {
  const text = REGION_TEXT[name], loops = REGION_OUTLINES[name];
  const bounds = outlineBounds(loops);
  return Object.freeze({
    id: REGION_IDS[name], name, subtitle: text.subtitle, description: text.description,
    palette: Object.freeze({ ...text.palette }), spawn: text.spawn,
    biome: REGION_BIOMES[name].id, minZ: bounds.minZ, maxZ: bounds.maxZ, minX: bounds.minX, maxX: bounds.maxX,
    bounds: Object.freeze(bounds), outline: Object.freeze(loops.map(loop => Object.freeze(loop.map(p => point(p.x, p.z))))),
    border: Object.freeze(REGION_BORDERS[name].map(loop => Object.freeze(loop.map(p => point(p.x, p.z))))),
    npcIds: Object.freeze([...text.npcIds]), landmarks: Object.freeze([...text.landmarks]),
  });
}));
const regionById = new Map(regions.map(region => [region.id, region]));
const regionByName = new Map(regions.map(region => [region.name, region]));

/**
 * Which region a world point belongs to, by authored hex. Points beyond every
 * outline (the sea, the neighbouring countries) report the nearest region, so
 * the charts and the traversal always have a district to name.
 */
export function regionAt(x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  const home = hexAt(x, z), owner = cellRegion.get(key(home.q, home.r));
  if (owner) return regionByName.get(owner);
  let best = regions[0], bestDistance = Infinity;
  for (const name of REGION_ORDER) for (const cell of REGION_CELLS[name]) {
    const distance = Math.hypot(cell.x - x, cell.z - z);
    if (distance < bestDistance) { bestDistance = distance; best = regionByName.get(name); }
  }
  return best;
}
export const regionNameAt = (x, z) => regionAt(x, z)?.name ?? null;
export const regionInfo = id => regionById.get(id) ?? null;
/** Strictly inside an authored outline, with no nearest-region fallback. */
export function insideRegion(name, x, z) {
  return (REGION_OUTLINES[name] ?? []).some(loop => pointInPolygon(loop, x, z));
}

export { REGION_BIOMES, METRES_PER_HEX, borderMidpoint, pointInPolygon };
