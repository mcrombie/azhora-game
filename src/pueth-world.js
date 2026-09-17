/**
 * Pueth: the region north of Drent, as places, roads and water.
 *
 * Pure: no three, no DOM. `src/pueth-scenery.js` renders what is described
 * here; the charts, the tests and the quest modules read the same numbers.
 *
 * Unlike the four older regions, Pueth is authored directly in world metres
 * (100 m per hex). It never existed in the 56 m frame, and the Tidehaven
 * cluster's 190 m radius would capture any 56 m literal in southern Pueth and
 * pin it to the village. If the world scale changes again, Pueth's places need
 * clusters of their own in the new frame.
 *
 * What comes from the atlas: the region's 27 hexes (through the survey), and its
 * two rivers, read from the World Builder map's river edges
 * (`src/region-rivers.js`) and chained and softened the way the journal chart
 * draws them. Nothing else here is water.
 *
 *  - **The Tessen** runs the eastern half of the Drent–Pueth border, from a
 *    source among the woods north of the Avrel country down to the Stills. Its
 *    authored last reach runs south through the carried-over ground north of
 *    Tidehaven, which is rigid and must come out unchanged, so the built river
 *    leaves the map's line at the edge of that ground and meets the sea by the
 *    shortest way east (see `TESSEN_MOUTH_REACH`).
 *  - **The Ordel** runs the Pueth–Feradom border in the north-east hills, down
 *    to the coast. No road crosses it.
 */
import { PLAYABLE_SURVEY } from './region-survey.js';
import { RIVER_EDGES } from './region-rivers.js';
import { riverCourses } from './region-layout.js';
import { landDistance, worldToVillage, MAIN_ROAD, hexAt } from './region-world.js';

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const point = (x, z) => Object.freeze({ x, z });

// ---------------------------------------------------------------------------
// Rivers, from the atlas
// ---------------------------------------------------------------------------
/**
 * Tidehaven's carried-over height field fades out between 84 and 124 m from the
 * village's own centre line (`villageWeight` in world-terrain.js). A built river
 * may not cut into it; tests/pueth-world.test.js checks the two agree.
 */
export const TIDEHAVEN_GROUND_REACH = 124;
const insideTidehavenGround = (x, z, margin = 0) => {
  const local = worldToVillage(x, z);
  return Math.abs(local.x) < TIDEHAVEN_GROUND_REACH + margin && local.z > -196 - margin;
};

/** The raw chains, before softening, oriented from source to mouth. */
function chains() {
  const raw = riverCourses(PLAYABLE_SURVEY, RIVER_EDGES, undefined, { soften: 0 });
  return raw.map(course => {
    const first = course.points[0], last = course.points.at(-1);
    const points = landDistance(first.x, first.z) < landDistance(last.x, last.z) ? [...course.points].reverse() : course.points;
    const regions = [...new Set(course.edges.flatMap(edge => edge.regions))].sort();
    return { size: course.size, edges: course.edges, regions, points };
  });
}

const soften = (points, passes = 2) => {
  let current = points;
  for (let pass = 0; pass < passes; pass++) {
    const next = [current[0]];
    for (let i = 0; i < current.length - 1; i++) {
      const a = current[i], b = current[i + 1];
      next.push({ x: a.x * .75 + b.x * .25, z: a.z * .75 + b.z * .25 }, { x: a.x * .25 + b.x * .75, z: a.z * .25 + b.z * .75 });
    }
    next.push(current.at(-1));
    current = next;
  }
  return current;
};

/** Evenly spaced samples along a polyline, with the unit normal of each piece. */
function resample(points, spacing) {
  const out = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], length = Math.hypot(b.x - a.x, b.z - a.z);
    if (length < 1e-6) continue;
    const steps = Math.max(1, Math.round(length / spacing));
    for (let step = out.length ? 1 : 0; step <= steps; step++) {
      const t = step / steps;
      out.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, nx: -(b.z - a.z) / length, nz: (b.x - a.x) / length });
    }
  }
  return out;
}

const RAW = chains();
const DRENT_BORDER = RAW.find(course => course.regions.includes('Drent'));
const FERADOM_BORDER = RAW.find(course => course.regions.includes('Feradom'));

/**
 * Where the Tessen leaves the map's line: the first authored corner inside
 * Tidehaven's ground is replaced by a reach east along its edge to the Stills.
 */
export const TESSEN_MOUTH_REACH = Object.freeze([point(60, -92), point(135, -96)]);

function builtTessen() {
  const kept = [];
  for (const p of DRENT_BORDER.points) {
    if (insideTidehavenGround(p.x, p.z, -30)) break;
    kept.push(p);
  }
  return [...kept, ...TESSEN_MOUTH_REACH];
}

function river(id, name, course, authored, halfWidth) {
  const points = Object.freeze(soften(course).map(p => point(p.x, p.z)));
  const samples = resample(points, 4).map(sample => Object.freeze(sample));
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of points) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); }
  return Object.freeze({ id, name, size: authored.size, halfWidth, regions: Object.freeze(authored.regions),
    edges: authored.edges, mapLine: Object.freeze(soften(authored.points).map(p => point(p.x, p.z))),
    points, samples: Object.freeze(samples), bounds: Object.freeze({ minX, maxX, minZ, maxZ }) });
}

export const TESSEN = river('tessen', 'The Tessen', builtTessen(), DRENT_BORDER, 4.2);
export const ORDEL = river('ordel', 'The Ordel', FERADOM_BORDER.points, FERADOM_BORDER, 3.6);
export const PUETH_RIVERS = Object.freeze([TESSEN, ORDEL]);

/** Distance from a world point to a river's centre line. */
export function riverLineDistance(river, x, z, limit = Infinity) {
  const b = river.bounds;
  const outside = Math.max(b.minX - x, x - b.maxX, b.minZ - z, z - b.maxZ, 0);
  if (outside > limit) return outside;
  let best = Infinity;
  const points = river.points;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], c = points[i], dx = c.x - a.x, dz = c.z - a.z;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
    best = Math.min(best, Math.hypot(x - a.x - dx * t, z - a.z - dz * t));
  }
  return best;
}

/** The nearest of Pueth's rivers and the distance to its centre line. */
export function nearestPuethRiver(x, z, limit = Infinity) {
  let best = null, distance = Infinity;
  for (const river of PUETH_RIVERS) {
    const d = riverLineDistance(river, x, z, Math.min(limit, distance));
    if (d < distance) { distance = d; best = river; }
  }
  return { river: best, distance };
}
export const puethRiverDistance = (x, z, limit = Infinity) => nearestPuethRiver(x, z, limit).distance;

// ---------------------------------------------------------------------------
// The road north: off the main road past the Caloss Gate, over the Tessen, to Rimeholt
// ---------------------------------------------------------------------------
/** The main road's point at a given x on its straight west of the Caloss Gate. */
function mainRoadAt(x) {
  for (let i = 1; i < MAIN_ROAD.length; i++) {
    const a = MAIN_ROAD[i - 1], b = MAIN_ROAD[i];
    if ((a.x - x) * (b.x - x) <= 0 && a.x !== b.x) { const t = (x - a.x) / (b.x - a.x); return point(x, a.z + (b.z - a.z) * t); }
  }
  throw new Error(`The main road does not pass x = ${x}.`);
}

/**
 * The junction: 38 m past the Caloss Gate and 24 m beyond the edge of the
 * rigid Tidehaven ground (190 m round the landing), so nothing of the village
 * moves and the Greenway's own scatter never meets the new road.
 */
export const PUETH_JUNCTION = mainRoadAt(-214);

/** Where the road crosses the Tessen: the river's northern bend, where it runs due east. */
export const TESSEN_BRIDGE = (() => {
  const x = -100, points = TESSEN.points;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    if ((a.x - x) * (b.x - x) > 0 || a.x === b.x || Math.min(a.z, b.z) > -185) continue;
    const t = (x - a.x) / (b.x - a.x), z = a.z + (b.z - a.z) * t;
    // The deck runs due north, so a traveler on the road walks straight across it.
    return Object.freeze({ id: 'tessen-bridge', name: 'The Tessen Bridge', crossing: point(x, z), halfSpan: 8.5, laneHalf: 2.3,
      axis: point(0, -1), side: point(1, 0), heading: Math.PI,
      south: point(x, z + 8.5), north: point(x, z - 8.5) });
  }
  throw new Error('The Tessen does not cross the road line.');
})();

const bridge = TESSEN_BRIDGE;
/** Rimeholt's square and its frame: `a` metres along the road toward Feradom, `b` across it. */
export const RIMEHOLT = Object.freeze({
  id: 'rimeholt', name: 'Rimeholt', square: point(-335, -362), radius: 36, palisadeRadius: 40,
  along: point(-0.8944, -0.4472), across: point(-0.4472, 0.8944),
});
export const rimeholtPoint = (a, b) => point(
  RIMEHOLT.square.x + RIMEHOLT.along.x * a + RIMEHOLT.across.x * b,
  RIMEHOLT.square.z + RIMEHOLT.along.z * a + RIMEHOLT.across.z * b);

/** The Legion's barrier where the Feradom road leaves the built world. */
export const FERADOM_BARRIER = Object.freeze({ id: 'feradom-road', name: 'The Feradom Road', ...point(-424, -522), halfWidth: 150 });

export const PUETH_ROAD = Object.freeze([
  PUETH_JUNCTION,
  point(-214, -20), point(-202, -74), point(-166, -117), point(-133, -142), point(-114, -153), point(-104, -163),
  point(bridge.crossing.x, bridge.south.z + 13),
  // The deck's own ends are road vertices, so the road is straight across the water.
  bridge.south, bridge.north,
  point(-100, bridge.north.z - 14), point(-103, -254), point(-112, -280), point(-135, -310), point(-170, -330), point(-214, -339), point(-262, -338),
  rimeholtPoint(-37, 0), rimeholtPoint(0, 0), rimeholtPoint(37, 0),
  point(-392, -402), point(-409, -440), point(-419, -482), point(FERADOM_BARRIER.x, FERADOM_BARRIER.z + 4),
]);

// ---------------------------------------------------------------------------
// The Legion's road post at the Pueth end of the bridge
// ---------------------------------------------------------------------------
/** A palisaded yard west of the road, its gate on the road, a watch hut and a beacon over the bridge. */
export const TESSEN_POST = Object.freeze({
  id: 'tessen-post', name: 'The Tessen Road Post', yard: point(-117, -228), halfX: 7.5, halfZ: 8.5,
  gate: point(-109.5, -228), gateHalf: 2.2, hut: point(-120.5, -232.5), beacon: point(-111, -216.5),
});

/** The garrison that tells of the camp and marches on it, at their post. Yaw faces the way each one watches. */
export const GARRISON_STANDS = Object.freeze({
  'garrison-captain': Object.freeze({ ...point(-105.2, -229.5), yaw: Math.PI / 2 }),   // at the gate, facing the road
  'garrison-casso': Object.freeze({ ...point(-105.4, -208.6), yaw: 0 }),               // at the bridge head, facing Drent
  'garrison-brill': Object.freeze({ ...point(-107, -246), yaw: Math.PI }),             // on the north road, facing Rimeholt
});

// ---------------------------------------------------------------------------
// The Bramble Scout Camp, moved out of Luscia to the woods north of the Tessen
// ---------------------------------------------------------------------------
/**
 * The camp keeps the local layout it was authored with (a trail of six points
 * into a clearing, src/forest-hideout-world.js), turned a quarter turn so its
 * trail runs north into the camp and the way out of the fight is south, back
 * down the trail toward the road: local (60, -118), the camp's centre, is world
 * (55, -190), in the coastal woods east of the post, 155 m from the road.
 */
export const HIDEOUT_SITE = Object.freeze({ x: 173, z: -130, yaw: Math.PI / 2 });
const SITE_COS = Math.round(Math.cos(HIDEOUT_SITE.yaw) * 1e12) / 1e12, SITE_SIN = Math.round(Math.sin(HIDEOUT_SITE.yaw) * 1e12) / 1e12;
export const hideoutToWorld = (lx, lz) => ({ x: HIDEOUT_SITE.x + lx * SITE_COS + lz * SITE_SIN, z: HIDEOUT_SITE.z - lx * SITE_SIN + lz * SITE_COS });
export const worldToHideout = (x, z) => {
  const dx = x - HIDEOUT_SITE.x, dz = z - HIDEOUT_SITE.z;
  return { x: dx * SITE_COS - dz * SITE_SIN, z: dx * SITE_SIN + dz * SITE_COS };
};
/** The camp's own frame names its retreat as local -x; in the world that is south, +z. */
export const HIDEOUT_RETREAT_AXIS = 'z';

/** The side trail from the road to where the camp's own trail begins, marked with the same scraps of blue cloth. */
export const HIDEOUT_APPROACH_TRAIL = Object.freeze([
  point(-100, -212.5), point(-78, -214), point(-45, -206), point(-12, -188), point(18, -166), point(42, -146),
  point(hideoutToWorld(1, -117).x, hideoutToWorld(1, -117).z),
]);
export const HIDEOUT_TRAIL_PENNANTS = Object.freeze([point(-80, -218), point(-40, -212), point(-6, -195), point(38, -154)]);

/** Ground the scatter keeps clear for the camp and both its trails. */
export const HIDEOUT_CLEARINGS = Object.freeze([
  Object.freeze({ ...hideoutToWorld(60, -118), r: 16 }), Object.freeze({ ...hideoutToWorld(70, -123), r: 6 }),
  ...[[1, -117], [14, -112], [29, -111], [45, -109], [53, -111]].map(([lx, lz]) => Object.freeze({ ...hideoutToWorld(lx, lz), r: 5 })),
]);

// ---------------------------------------------------------------------------
// Rimeholt, the timber town on the Feradom road
// ---------------------------------------------------------------------------
/** Ten buildings in the town's frame: the Legion's garrison house, the inn, the reeve's hall, houses, a store and the yard shed. */
export const RIMEHOLT_BUILDINGS = Object.freeze([
  ['garrison-house', 11, -14, 9.4, 6.6, 3.5, '#6b3f38', '#a9a293'],
  ['birch-bench', -12, 13, 8.6, 6.4, 3.4, '#4f5652', '#c2b89c'],
  ['reeve-hall', -13, -15, 7.6, 6.0, 3.3, '#555b55', '#b7ad94'],
  ['house-1', -26, 12, 6.0, 5.0, 3.0, '#50574f', '#bdb398'],
  ['house-2', -27, -12, 5.8, 4.8, 3.0, '#585c56', '#b3aa92'],
  ['house-3', 24, 13, 6.2, 5.0, 3.1, '#4d534e', '#b9b196'],
  ['house-4', 26, -13, 5.8, 5.0, 3.0, '#5a5e57', '#beb69b'],
  ['house-5', 0, -24, 6.0, 4.8, 2.9, '#52584f', '#b5ad95'],
  ['store', -16, 25, 6.8, 5.2, 3.0, '#4b514c', '#aaa38c'],
].map(([id, a, b, width, depth, height, roof, wall]) => Object.freeze({ id, a, b, ...rimeholtPoint(a, b), width, depth, height, roof, wall })));
/** The timber yard: an open shed and stacks of cold-birch, south of the road by the north gate. */
export const RIMEHOLT_YARD = Object.freeze({ shed: rimeholtPoint(14, 19), stacks: Object.freeze([
  Object.freeze({ ...rimeholtPoint(2, 27), count: 6 }), Object.freeze({ ...rimeholtPoint(27, 25), count: 5 }), Object.freeze({ ...rimeholtPoint(14, 31), count: 4 }),
]), well: rimeholtPoint(-3, 6) });

/** The people of Rimeholt, and the Legion sentry at the garrison house. */
export const RIMEHOLT_STANDS = Object.freeze({
  'rimeholt-reeve': rimeholtPoint(-4, -8),
  'rimeholt-innkeeper': rimeholtPoint(-12, 5.5),
  'rimeholt-foreman': rimeholtPoint(12, 16),
  'rimeholt-carter': rimeholtPoint(27, 5.5),
  'rimeholt-trapper': rimeholtPoint(-24, -6),
  'rimeholt-sentry': rimeholtPoint(4.5, -6.5),
});

// ---------------------------------------------------------------------------
// Landmarks, clearings and signs
// ---------------------------------------------------------------------------
export const PUETH_LANDMARKS = Object.freeze([
  Object.freeze({ id: 'tessen-bridge', name: 'The Tessen Bridge', ...point(bridge.crossing.x + 7, bridge.north.z - 3),
    description: 'A timber bridge over the Tessen. Drent’s broadleaf ends at the south bank; the birch begins on the north one.' }),
  Object.freeze({ id: 'tessen-post', name: 'The Tessen Road Post', ...TESSEN_POST.yard,
    description: 'A palisaded yard, a watch hut and a beacon at the Pueth end of the bridge. Three men of the Legion keep the crossing.' }),
  Object.freeze({ id: 'tessen-shallows', name: 'The Tessen Shallows', ...point(100, -110),
    description: 'The Tessen spreads over shingle into the Stills. At low water a goblin could wade it without wetting its knees, and the beach runs south to Tidehaven.' }),
  Object.freeze({ id: 'rimeholt', name: 'Rimeholt', ...RIMEHOLT.square, radius: RIMEHOLT.radius,
    description: 'A palisaded timber town on the Feradom road: a Legion garrison house, the Birch Bench inn, and a yard stacked with cold-birch for the lake shipwrights.' }),
  Object.freeze({ id: 'birch-landing', name: 'Birch Landing', ...point(76, -246),
    description: 'Cold-birch logs stacked above the shingle, branded for the coast barges. Nobody is loading them this season.' }),
  Object.freeze({ id: 'grey-shoulder', name: 'The Grey Shoulder', ...point(-268, -500),
    description: 'A bare hill with a cairn on its crown. North of it the hills lift toward Feradom; hill goblins, the trappers say, and nothing that wants company.' }),
  Object.freeze({ id: 'cold-hearth', name: 'The Cold Hearth', ...point(-40, -418),
    description: 'A turf shelter and a ring of cold stones, with boot prints going east. Nobody in Rimeholt will say whose they are.' }),
  Object.freeze({ id: 'ordel-mouth', name: 'The Ordel Mouth', ...point(84, -349),
    description: 'The Ordel comes down out of the hills to the sea here. Feradom is the far bank.' }),
  Object.freeze({ ...FERADOM_BARRIER,
    description: 'A barrier the Legion has dropped across the road north. Feradom’s hills begin beyond it, and the road is closed by order.' }),
]);

/** Ground the Pueth scatter keeps clear: the bridge approaches, the post, the town, the landmarks. */
export const PUETH_CLEARINGS = Object.freeze([
  Object.freeze({ ...bridge.crossing, r: 14 }), Object.freeze({ ...bridge.south, r: 8 }), Object.freeze({ ...bridge.north, r: 8 }),
  Object.freeze({ ...TESSEN_POST.yard, r: 15 }),
  Object.freeze({ ...RIMEHOLT.square, r: RIMEHOLT.palisadeRadius + 5 }),
  ...PUETH_LANDMARKS.filter(place => !['tessen-bridge', 'tessen-post', 'rimeholt', 'feradom-road'].includes(place.id))
    .map(place => Object.freeze({ x: place.x, z: place.z, r: 9 })),
  Object.freeze({ x: FERADOM_BARRIER.x, z: FERADOM_BARRIER.z, r: 8 }),
]);

/** Signposts in the existing style. */
export const PUETH_SIGNS = Object.freeze([
  Object.freeze({ ...point(PUETH_JUNCTION.x - 5.5, PUETH_JUNCTION.z - 5), label: 'The Tessen Bridge', returnLabel: 'Tidehaven', yaw: 0 }),
  Object.freeze({ ...point(bridge.south.x - 5, bridge.south.z + 9), label: 'Rimeholt', returnLabel: 'Tidehaven', yaw: 0 }),
  Object.freeze({ ...rimeholtPoint(-44, -6), label: 'Rimeholt', returnLabel: 'The Tessen Bridge', yaw: Math.atan2(RIMEHOLT.along.x, RIMEHOLT.along.z) }),
]);

/** Every person Pueth places, in world metres. */
export const PUETH_NPC_POSITIONS = Object.freeze({
  ...Object.fromEntries(Object.entries(GARRISON_STANDS).map(([id, stand]) => [id, point(stand.x, stand.z)])),
  ...RIMEHOLT_STANDS,
});

export { hexAt, MAIN_ROAD };
