/**
 * The playable world, derived from the atlas.
 *
 * `region-layout.js` is pure geometry over the survey; this module turns that
 * geometry into the actual places the game needs: where each region is, where
 * the land ends, where the roads run, and where every person, site and landmark
 * stands. No THREE, no DOM: `world.js` renders what is described here, and the
 * charts, the checkpoint rules and the smokes read the same numbers.
 *
 * North is -Z, east is +X, one authored hex is 56 m (HEX_WORLD_TRANSFORM).
 * Ids: 1 Drent, 2 Luscia, 3 Moros Plain, 4 East Suval.
 */
import { PLAYABLE_SURVEY, LAND_HEXES, SURVEY_ORIGIN } from './region-survey.js';
import {
  HEX_WORLD_TRANSFORM, REGION_BIOMES, PLAYABLE_REGIONS, METRES_PER_HEX, ATLAS_HEX_SIZE, ATLAS_HEX_WIDTH,
  regionCells, regionOutline, worldBoundsFor, routeAnchors, borderMidpoint, pointInPolygon,
} from './region-layout.js';

export const SURVEY = PLAYABLE_SURVEY;
export const TRANSFORM = HEX_WORLD_TRANSFORM;
export const REGION_ORDER = PLAYABLE_REGIONS;
export const REGION_IDS = Object.freeze({ Drent: 1, Luscia: 2, 'Moros Plain': 3, 'East Suval': 4 });
export const REGION_NAME_BY_ID = Object.freeze({ 1: 'Drent', 2: 'Luscia', 3: 'Moros Plain', 4: 'East Suval' });

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

// ---------------------------------------------------------------------------
// Hexes, land and coast
// ---------------------------------------------------------------------------
const AXIAL_NEIGHBORS = Object.freeze([[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]]);
const key = (q, r) => `${q},${r}`;
const landHexes = new Set(LAND_HEXES.map(([q, r]) => key(q, r)));
const cellRegion = new Map();
for (const id of REGION_ORDER) for (const cell of SURVEY.regions.find(r => r.name === id).cells) cellRegion.set(key(cell.q, cell.r), id);

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
export const VILLAGE = Object.freeze({ x: -20, z: 29, yaw: Math.PI / 2 });
export const villageToWorld = (lx, lz) => ({ x: lz + VILLAGE.x, z: VILLAGE.z - lx });
export const worldToVillage = (x, z) => ({ x: VILLAGE.z - z, z: x - VILLAGE.x });
/** The local box the original Eastreena terrain and scatter occupy. */
export const VILLAGE_LOCAL_BOX = Object.freeze({ minX: -112, maxX: 112, minZ: -168, maxZ: 60 });

// ---------------------------------------------------------------------------
// Terrain: a base level and relief per biome, blended between neighbouring hexes
// ---------------------------------------------------------------------------
export const REGION_TERRAIN = Object.freeze({
  Drent: Object.freeze({ base: 4.6, amp: 2.6, wave: 90, ground: REGION_BIOMES.Drent.ground }),
  Luscia: Object.freeze({ base: 8.6, amp: 4.5, wave: 140, ground: REGION_BIOMES.Luscia.ground }),
  'Moros Plain': Object.freeze({ base: 6.4, amp: .9, wave: 260, ground: REGION_BIOMES['Moros Plain'].ground }),
  'East Suval': Object.freeze({ base: 17, amp: 11, wave: 120, ground: REGION_BIOMES['East Suval'].ground }),
  outland: Object.freeze({ base: 11.5, amp: 6, wave: 150, ground: '#8d9a6d' }),
});

/** Biome weights around a world point: the containing hex and its six neighbours. */
export function terrainMix(x, z) {
  const home = hexAt(x, z);
  let total = 0, base = 0, amp = 0, wave = 0;
  const weights = { Drent: 0, Luscia: 0, 'Moros Plain': 0, 'East Suval': 0, outland: 0 };
  for (const [dq, dr] of [[0, 0], ...AXIAL_NEIGHBORS]) {
    const q = home.q + dq, r = home.r + dr, centre = hexCentre(q, r);
    const weight = Math.max(0, 1 - Math.hypot(x - centre.x, z - centre.z) / (METRES_PER_HEX * 1.28));
    if (!weight) continue;
    const name = cellRegion.get(key(q, r)) ?? 'outland';
    const terrain = REGION_TERRAIN[name];
    total += weight; base += terrain.base * weight; amp += terrain.amp * weight; wave += terrain.wave * weight;
    weights[name] += weight;
  }
  if (!total) return { base: REGION_TERRAIN.outland.base, amp: REGION_TERRAIN.outland.amp, wave: REGION_TERRAIN.outland.wave, weights };
  for (const name of Object.keys(weights)) weights[name] /= total;
  return { base: base / total, amp: amp / total, wave: wave / total, weights };
}

export function relief(x, z, amp, wave) {
  const k = 6.2831853 / Math.max(20, wave);
  return amp * (Math.sin(x * k + z * k * .55) * .5 + Math.sin(x * k * .62 - z * k * 1.1) * .3 + Math.sin(x * k * 2.1 + z * k * 1.7) * .2);
}

// ---------------------------------------------------------------------------
// Signed distance to the coast, from the authored land hexes
// ---------------------------------------------------------------------------
const COAST_CELL = 4, COAST_MARGIN = 96;
const coast = (() => {
  const minX = WORLD_BOUNDS.minX - COAST_MARGIN, minZ = WORLD_BOUNDS.minZ - COAST_MARGIN;
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
  points: Object.freeze([point(-556, -2), point(-482, 36), point(-424, 52), point(-386, 70),
    point(-345, 92.9), point(-306, 122), point(-266, 142), point(-222, 163), point(-182, 188)]),
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
  point(5, 29), point(-11, 29), point(-25, 29), point(-40, 30.6), point(-54, 27.3),
  point(-67, 29), point(-80, 30.5), point(-92, 29), point(-106, 40), point(-128, 34), point(-148, 21), point(-163, 26),
  point(-176, 29), point(-196, 25), point(-214, 30), point(-236, 30), point(-258, 39),
  point(-278, 52), point(-300, 64), point(-322, 78), point(-345, 92.9), point(-362, 107),
  point(-374, 124), point(-382, 142), point(-390, 162), point(-386, 182.9), point(-396, 202),
  point(-404, 222), point(-408, 228), point(-414, 242), point(-427, 259.4), point(-446, 276), point(-468, 292),
  point(-492, 308), point(-518, 326), point(-549.2, 348.1), point(-596, 352), point(-648, 348),
  point(-700, 352), point(-752, 348), point(-772, 350),
]);

/** The branch that leaves the Lauvel for Elod's border post and the town beyond. */
export const SUVAL_ROAD = Object.freeze([
  point(-390, 162), point(-360, 178), point(-330, 196), point(-300, 216), point(-272, 240),
  point(-250, 262), point(-231, 283.6), point(-204, 298), point(-176, 308), point(-150, 318),
  point(-118, 332), point(-86, 346), point(-56, 358), point(-28, 368.5),
]);

/** Where the tutorial ends and the journey's road begins: the Caloss Gate onward. */
export const ONWARD_ROAD = Object.freeze(MAIN_ROAD.slice(MAIN_ROAD.findIndex(p => p.x === -176)));
/** The whole walkable road network, for the traversal smoke and the charts. */
export const ROAD_JUNCTION = point(-390, 162);

// ---------------------------------------------------------------------------
// Places along the road
// ---------------------------------------------------------------------------
/** Tidehaven's forest gate. Beyond it the road runs on to the Caloss. */
export const CALOSS_GATE = Object.freeze({ x: -176, z: 29, name: 'The Caloss Gate', barrierX: -182,
  regionName: 'The Avrel clearing', open: true });
export const FERNWAY_REST = Object.freeze({ x: -128, z: 34, name: 'Fernway Rest' });
/** Drent's one farm clearing, cut out of the forest where the Avrel families work. */
export const AVREL_CLEARING = Object.freeze({ x: -236, z: 30, radius: 38 });

/**
 * Lumber Town, the market town at the centre of Luscia, between the field at
 * the Lauvel and the Moros gate. The main road runs through its square, and
 * everything in the town is placed in the square's own frame: `a` metres along
 * the road toward the Moros, `b` metres across it to the east.
 */
export const LUMBER_TOWN = Object.freeze({
  name: 'Lumber Town', square: point(-408, 228), radius: 30,
  along: point(-0.4472, 0.8944), across: point(0.8944, 0.4472),
});
/** A point in Lumber Town's frame. */
export const townPoint = (a, b) => point(
  LUMBER_TOWN.square.x + LUMBER_TOWN.along.x * a + LUMBER_TOWN.across.x * b,
  LUMBER_TOWN.square.z + LUMBER_TOWN.along.z * a + LUMBER_TOWN.across.z * b);

export const regionNpcPositions = Object.freeze({
  'meadow-courier': point(-230, 17),      // Corvan, Legion quartermaster, at the farm clearing
  'crossing-keeper': point(-357, 106),    // Hollis, at the Caloss bridge
  'ridge-keeper': point(-372, 131),       // Sava, at her shrine on the Luscia side
  'relay-clerk': townPoint(5, -6),        // Iven, at the Legion relay post on Lumber Town's square
  // Lumber Town's people, around the square and the timber yard.
  'town-innkeeper': townPoint(-8, 4),
  'town-carter': townPoint(-2, 9),
  'town-elder': townPoint(-16, 2),
  'timber-stall': townPoint(8, 7),
  'town-sawyer': townPoint(4, 13),
  'town-yardhand': townPoint(0, 14),
  'town-beggar': townPoint(0, -4),        // Smiths, who wanders the square
  // The field at the Lauvel and the burned hamlet, north-east of the town.
  'lauvel-picket': point(-392, 186),      // Talvus, on the picket line
  'burial-searcher': point(-387, 198),    // Ilva, at the burial line
  'hamlet-drover': point(-344, 208),      // Garran, at the burned hamlet
});

export const journeySites = Object.freeze({
  'cart-parcel-1': Object.freeze({ id: 'cart-parcel-1', x: -252, z: 8, name: 'Cloth parcel', type: 'parcel', region: 2 }),
  'cart-parcel-2': Object.freeze({ id: 'cart-parcel-2', x: -259, z: 20, name: 'Provision parcel', type: 'parcel', region: 2 }),
  'cart-parcel-3': Object.freeze({ id: 'cart-parcel-3', x: -246, z: 2, name: 'Wax-sealed parcel', type: 'parcel', region: 2 }),
  'bridge-repair': Object.freeze({ id: 'bridge-repair', x: -345, z: 92.9, name: 'The Caloss bridge', type: 'bridge', region: 3 }),
  'beacon-west': Object.freeze({ id: 'beacon-west', x: -392, z: 132, name: 'First waymarker', type: 'beacon', region: 4 }),
  'beacon-east': Object.freeze({ id: 'beacon-east', x: -364, z: 150, name: 'Second waymarker', type: 'beacon', region: 4 }),
  'beacon-north': Object.freeze({ id: 'beacon-north', x: -404, z: 172, name: 'Third waymarker', type: 'beacon', region: 4 }),
  'bridge-debris-1': Object.freeze({ id: 'bridge-debris-1', x: -330, z: 76, name: 'Dry driftwood', type: 'sticks', quantity: 2, region: 3 }),
  'bridge-debris-2': Object.freeze({ id: 'bridge-debris-2', x: -366, z: 112, name: 'Fallen branches', type: 'sticks', quantity: 2, region: 3 }),
  'meadow-fruit': Object.freeze({ id: 'meadow-fruit', x: -258, z: 46, name: 'Pawpaw windfalls', type: 'fruit', quantity: 2, region: 2 }),
  'river-fruit': Object.freeze({ id: 'river-fruit', x: -330, z: 130, name: 'Riverside pawpaws', type: 'fruit', quantity: 2, region: 3 }),
  'ridge-fruit': Object.freeze({ id: 'ridge-fruit', x: -412, z: 152, name: 'Sheltered pawpaws', type: 'fruit', quantity: 2, region: 4 }),
  'meadow-sticks': Object.freeze({ id: 'meadow-sticks', x: -216, z: 12, name: 'Dry branches', type: 'sticks', quantity: 2, region: 2 }),
  'ridge-sticks': Object.freeze({ id: 'ridge-sticks', x: -356, z: 128, name: 'Wind-fallen branches', type: 'sticks', quantity: 2, region: 4 }),
});

export const regionRepairBenches = Object.freeze([
  Object.freeze({ id: 'meadow-repair', x: -220, z: 40, name: 'Avrel clearing repair bench' }),
  Object.freeze({ id: 'crossing-repair', x: -368, z: 96, name: 'Caloss crossing repair bench' }),
  Object.freeze({ id: 'ridge-repair', x: -384, z: 138, name: 'Sava’s shrine repair bench' }),
]);

export const regionFirePits = Object.freeze([
  Object.freeze({ id: 'meadow-fire', x: -212, z: 40, fireX: -212, fireZ: 41.5 }),
  Object.freeze({ id: 'crossing-fire', x: -370, z: 118, fireX: -371.4, fireZ: 118.6 }),
  Object.freeze({ id: 'ridge-fire', x: -398, z: 146, fireX: -399.4, fireZ: 146.6 }),
]);

/** The marked fishing bank on the Caloss, upstream of the bridge. */
export const CALOSS_BANK = Object.freeze({ spot: point(-306, 104), cast: point(-300, 114) });

export const regionLandmarks = Object.freeze([
  Object.freeze({ id: 'sunmeadow', name: 'The Avrel Clearing', x: -236, z: 30, description: 'The one farm clearing cut out of Drent’s forest: crop rows, a canvas field camp, and the Legion’s supply post.' }),
  Object.freeze({ id: 'fallen-cart', name: 'The Tumbled Cart', x: -243, z: 19, description: 'A courier’s wheel gave way on the farm track. Scattered parcels lie among the stubble.' }),
  Object.freeze({ id: 'old-mill', name: 'The Clearing Mill', x: -227, z: 57, description: 'Slow canvas sails turn above the Avrel grain rows and a stone-lined well.' }),
  Object.freeze({ id: 'reedwater', name: 'Caloss Crossing', x: -334, z: 84, description: 'The road drops to the Caloss. Drent ends on this bank; Luscia begins on the far one.' }),
  Object.freeze({ id: 'reed-bridge', name: 'The Caloss Bridge', x: -345, z: 92.9, description: 'An old timber bridge crosses the border river. Its sound eastern walkway remains passable.' }),
  Object.freeze({ id: 'reedwater-bank', name: 'The Quiet Bank', x: -306, z: 104, description: 'A rod rest and a low stool mark a sheltered place to fish the slow water.' }),
  Object.freeze({ id: 'river-camp', name: 'The Reedcutters’ Camp', x: -372, z: 116, description: 'Drying reeds, tied boats, and a small raised shelter stand above the Luscian bank.' }),
  Object.freeze({ id: 'threefold', name: 'Sava’s Shrine', x: -377, z: 138, description: 'A swept step, clean water and straight road stones on the first open ground of Luscia.' }),
  Object.freeze({ id: 'beacon-ridge', name: 'The Three Waymarkers', x: -386, z: 152, description: 'Three reflective road stones once guided every traveler between the Caloss and the Lauvel.' }),
  Object.freeze({ id: 'north-relay', name: 'The Lauvel Relay', x: -401, z: 196, description: 'The Legion’s old relay hut, empty since the clerk moved his desk down to Lumber Town’s square.' }),
  Object.freeze({ id: 'lumber-town', name: 'Lumber Town', x: -408, z: 228, radius: 26, description: 'Luscia’s market town: a square of stalls and a well, an inn, the timber yard above the sawpits, and the Legion’s relay post on the corner.' }),
  // Story hooks placed as scenery for the chapter that follows.
  Object.freeze({ id: 'lauvel-field', name: 'The Field at the Lauvel', x: -386, z: 182.9, description: 'Broken carts, a fallen banner and a burial line: ten days ago the Legion met a rebel army here.' }),
  Object.freeze({ id: 'burned-hamlet', name: 'The Burned Hamlet', x: -348, z: 212, description: 'Four roofless walls and a standing chimney. Nobody has come back to clear the ash.' }),
  Object.freeze({ id: 'moros-gate', name: 'The Moros Gate', x: -427, z: 259.4, description: 'A signpost, a cattle grid and the last copse. West of here the grass runs to the horizon.' }),
  Object.freeze({ id: 'legion-camp', name: 'The Legion Camp', x: -549.2, z: 348.1, description: 'A palisade, ordered tents, a horse line and the Legate’s standard on the open Moros.' }),
  Object.freeze({ id: 'moros-stockade', name: 'The Border Stockade', x: -368, z: 308, description: 'The small stockade the Legion and the republic both want: a ditch, a rampart and an empty gate.' }),
  Object.freeze({ id: 'suval-border-post', name: 'Elod’s Border Post', x: -224, z: 292, description: 'A barrier across the road, two guards, and a shelter belonging to neither army.' }),
  Object.freeze({ id: 'old-waystation', name: 'The Roofless Waystation', x: -154, z: 328, description: 'A leaning stone arch and a few paving slabs outlast a forgotten roadside shelter.' }),
  Object.freeze({ id: 'elod-gate', name: 'Elod', x: -28, z: 368.5, description: 'The stone gate of Elod, a few slate roofs, and the Stills glittering beyond the town.' }),
  Object.freeze({ id: 'bandit-lookout', name: 'The Hill Lookout', x: -74, z: 498, description: 'A ring of ridge stones above the southern hills. Somebody watches the road from here, but not today.' }),
]);

/** Scenery-and-stand hooks the next chapter will use. Positions only. */
export const STORY_SITES = Object.freeze({
  lauvelField: point(-386, 182.9), burnedHamlet: point(-348, 212), morosGate: point(-427, 259.4),
  legionCamp: point(-549.2, 348.1), morosStockade: point(-368, 308), horseHitch: point(-566, 320),
  suvalBorderPost: point(-224, 292), waystation: point(-154, 328), elodGate: point(-28, 368.5),
  banditLookout: point(-74, 498),
});

/** The end of the built world, west of the Legion camp. */
export const FRONTIER = Object.freeze({ x: -776, z: 350, barrierX: -782, name: 'The Moros Horizon',
  regionName: 'The open road west across the Moros' });

// ---------------------------------------------------------------------------
// Regions
// ---------------------------------------------------------------------------
function outlineBounds(loops) {
  const points = loops.flat();
  return { minX: Math.min(...points.map(p => p.x)), maxX: Math.max(...points.map(p => p.x)),
    minZ: Math.min(...points.map(p => p.z)), maxZ: Math.max(...points.map(p => p.z)) };
}

const REGION_TEXT = {
  Drent: { subtitle: 'The forest coast and Tidehaven', spawn: point(-15, 29),
    description: 'All of Drent is broadleaf forest: ferns, sorrel and deer, with Tidehaven on the eastern shore and one farm clearing inland.',
    palette: { ground: '#4d7a3e', accent: '#c9d3a0', fog: '#b6c6ad' },
    npcIds: ['meadow-courier', 'commons-miller'], landmarks: ['sunmeadow', 'fallen-cart', 'old-mill', 'mill-commons'] },
  Luscia: { subtitle: 'Across the Caloss', spawn: point(-362, 110),
    description: 'Rolling grass and thinning copses beyond the border river: the shrines of the valley, Lumber Town on the road, and the field at the Lauvel.',
    palette: { ground: '#8fa35a', accent: '#dfc77d', fog: '#bdc9b5' },
    npcIds: ['crossing-keeper', 'ridge-keeper', 'relay-clerk', 'reed-worker', 'town-innkeeper', 'timber-stall', 'town-sawyer'],
    landmarks: ['reedwater', 'reed-bridge', 'reedwater-bank', 'river-camp', 'landing-workshop', 'threefold', 'beacon-ridge', 'north-relay', 'lauvel-field', 'lumber-town', 'burned-hamlet'] },
  'Moros Plain': { subtitle: 'The Legion’s open country', spawn: point(-452, 278),
    description: 'Flat treeless grassland under an enormous sky. The Legion camp is visible from a long way off, and horses graze the line.',
    palette: { ground: '#b9b36c', accent: '#e4d59a', fog: '#cfd3b4' },
    npcIds: [], landmarks: ['moros-gate', 'legion-camp', 'moros-stockade'] },
  'East Suval': { subtitle: 'Stone hills and Elod', spawn: point(-214, 294),
    description: 'Grey stone country: heather, ridge rock, a guarded border post that belongs to neither army, and the town of Elod above the Stills.',
    palette: { ground: '#9b9d85', accent: '#e1d1a7', fog: '#bbc6bf' },
    npcIds: ['shelter-keeper'], landmarks: ['suval-border-post', 'old-waystation', 'waystation-shelter', 'elod-gate', 'bandit-lookout'] },
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
