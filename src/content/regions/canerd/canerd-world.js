/** Canerd stands directly on the Celder plain, per the user's revised layout.
 * The court is level with its natural foundation; no artificial hill is added. */
import { REGION_IDS, regionAt } from '../../../world/terrain/region-world.js';
import { CELDER_MOUND_SITE, celderPlainHeight } from '../south-celder/south-celder-world.js';

const freeze = Object.freeze;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const { x: cx, z: cz, radius } = CELDER_MOUND_SITE;
const point = (x, z, y) => freeze({ x: cx + x, z: cz + z, ...(y === undefined ? {} : { y }) });
const baseHeight = celderPlainHeight(cx, cz), rise = 0, summitHeight = baseHeight + rise;
const arrival = point(122, 93, celderPlainHeight(cx + 122, cz + 93));

export const CANERD = freeze({ id: 'canerd', name: 'Canerd', region: REGION_IDS['North Celder'],
  x: cx, z: cz, radius, plateauRadius: 42, baseHeight, rise, summitHeight,
  arrival, courtyard: point(0, 18, summitHeight), gate: point(0, 34, summitHeight),
});
export const CANERD_FAIR = freeze({ id: 'canerd-horse-fair', region: REGION_IDS['South Celder'], ...point(120, 90), width: 50, depth: 36, height: arrival.y });

// A direct approach crosses the flat forecourt and enters the south gate.
// Keep the existing route id for review tools and map consumers.
const approachAnchors = [arrival, point(80, 60, baseHeight), point(0, 60, baseHeight), CANERD.courtyard];
const approach = [];
for (let i=1;i<approachAnchors.length;i++) {
  const a=approachAnchors[i-1], b=approachAnchors[i], n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/1.5);
  for(let j=0;j<n;j++) { const t=j/n; approach.push(freeze({x:mix(a.x,b.x,t),z:mix(a.z,b.z,t),y:mix(a.y,b.y,smooth(0,1,t))})); }
}
approach.push(CANERD.courtyard);
export const CANERD_PATHS = freeze([
  freeze({ id: 'canerd-ascent', name: 'The castle approach', width: 10, points: freeze(approach) }),
]);

export const CANERD_BUILDINGS = freeze([
  freeze({ id: 'canerd-chief-lords-hall', name: "The chief lord's hall", kind: 'keep', ...point(-5, -13), width: 26, depth: 22, height: 47, door: point(-5, -2) }),
  freeze({ id: 'canerd-high-tower', name: 'The high tower', kind: 'tower', ...point(-19, -20), radius: 8, height: 84 }),
  freeze({ id: 'canerd-service-hall', name: 'The household range', kind: 'hall', ...point(22, -9), width: 14, depth: 24, height: 16, door: point(22, 3) }),
]);
const curtain = [[7, 34], [25, 25], [34, 7], [34, -15], [22, -32], [-22, -32], [-34, -15], [-34, 7], [-25, 25], [-7, 34]].map(([x, z]) => point(x, z));
export const CANERD_WALLS = freeze(curtain.slice(1).map((b, i) => freeze({ id: `canerd-curtain-${i}`, a: curtain[i], b, height: 10, thickness: 3 })));
export const CANERD_GATES = freeze([freeze({ id: 'canerd-south-gate', ...CANERD.gate, width: 14, height: 12, facing: 0 })]);
const landmark = (id, name, x, z, radius, description) => freeze({ id, name, region: regionAt(cx + x, cz + z)?.id ?? CANERD.region, ...point(x, z), radius, description });
export const CANERD_LANDMARKS = freeze([
  landmark('canerd', 'Canerd', 0, 0, 108, "The chief lord's layered stone castle stands directly on Celder's open horse plain."),
  landmark('canerd-court', "The chief lord's court", 0, 18, 16, 'A neutral court for the horse-lord houses, beneath upper works added over centuries.'),
  landmark('canerd-horse-fair', 'The great horse fair', 120, 90, 30, 'The plain market beside Canerd, where the houses display their bloodlines and agree the breeding of generations to come.'),
]);
const view = (eye, target) => freeze({ eye: freeze(eye), target: freeze(target) });
export const CANERD_VIEWS = freeze({
  canerd: view({ x: cx + 150, z: cz + 170, y: baseHeight + 55 }, { x: cx, z: cz, y: summitHeight + 24 }),
  'canerd-ascent': view({ x: cx + 130, z: cz + 80, y: baseHeight + 17 }, { x: cx - 12, z: cz, y: summitHeight + 26 }),
  'canerd-court': view({ x: cx + 8, z: cz + 28, y: summitHeight + 2.4 }, { x: cx - 5, z: cz - 8, y: summitHeight + 5.4 }),
  'canerd-hall': view({ x: cx - 5, z: cz - 4, y: summitHeight + 1.7 }, { x: cx - 5, z: cz - 20, y: summitHeight + 3.5 }),
  'canerd-lookout': view({ x: cx, z: cz + 33, y: summitHeight + 11.3 }, { x: cx + 200, z: cz + 130, y: baseHeight + 7 }),
  'canerd-high-tower': view({ x: cx - 82, z: cz - 105, y: summitHeight + 74 }, { x: cx - 10, z: cz - 10, y: summitHeight + 35 }),
});

const segment = (x, z, a, b) => {
  const dx = b.x - a.x, dz = b.z - a.z, t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1));
  return { distance: Math.hypot(x - a.x - dx * t, z - a.z - dz * t), t };
};
// Ground and scatter queries are frequent. Only inspect nearby route segments.
const buckets = new Map(), bucketSize = 16, routeReach = 12;
for (const path of CANERD_PATHS) for (let i = 1; i < path.points.length; i++) {
  const a = path.points[i - 1], b = path.points[i];
  for (let ix = Math.floor((Math.min(a.x, b.x) - routeReach) / bucketSize); ix <= Math.floor((Math.max(a.x, b.x) + routeReach) / bucketSize); ix++)
    for (let iz = Math.floor((Math.min(a.z, b.z) - routeReach) / bucketSize); iz <= Math.floor((Math.max(a.z, b.z) + routeReach) / bucketSize); iz++) {
      const key = `${ix},${iz}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push({ a, b });
    }
}
export function canerdPathSample(x, z) {
  let nearest = null;
  for (const { a, b } of buckets.get(`${Math.floor(x / bucketSize)},${Math.floor(z / bucketSize)}`) ?? []) {
    const sample = segment(x, z, a, b);
    if (!nearest || sample.distance < nearest.distance) nearest = { ...sample, y: mix(a.y, b.y, sample.t) };
  }
  return nearest;
}
const fairDistance = (x, z) => Math.max(Math.abs(x - CANERD_FAIR.x) - CANERD_FAIR.width / 2, Math.abs(z - CANERD_FAIR.z) - CANERD_FAIR.depth / 2);

/** Local outermost ground layer; every point beyond the castle grounds, fair apron and
 * approach remains exactly the incoming ground, including both regional borders.
 */
export function canerdGround(x, z, incoming) {
  if (x < cx - 110 || x > cx + 150 || z < cz - 110 || z > cz + 115) return incoming;
  const r = Math.hypot(x - cx, z - cz), fair = fairDistance(x, z);
  let ground = incoming;
  if (r < radius) {
    const body = baseHeight;
    ground = mix(ground, body, 1 - smooth(103, radius, r));
  }
  if (fair < 4) ground = mix(ground, CANERD_FAIR.height, 1 - smooth(0, 4, fair));
  const road = canerdPathSample(x, z);
  if (road && road.distance < 11) {
    // The approach meets the court, so its inner shoulder cannot
    // hollow out the level foundations of the curtain and gate towers.
    const shoulder = smooth(42, 47, r);
    ground = mix(ground, road.y, (1 - smooth(5.3, 11, road.distance)) * shoulder);
  }
  return ground;
}

/** No ambient rocks, tall grass or wild animals on the castle grounds or fair. */
export function canerdClear(x, z, margin = 0) {
  if (Math.hypot(x - cx, z - cz) < radius + margin || fairDistance(x, z) < 4 + margin) return true;
  const road = canerdPathSample(x, z);
  return !!road && road.distance < 11 + margin;
}
export function canerdTint(x, z) {
  if (!canerdClear(x, z)) return null;
  const road = canerdPathSample(x, z), r = Math.hypot(x - cx, z - cz);
  if (road && road.distance < 5.2) return 0xb2a58c;
  if (r < 39) return 0x999180;
  if (fairDistance(x, z) < 1) return 0xaaa16f;
  return 0x8e9a57;
}

/** The coarse tile surface is lowered only where a metre-scale patch restores
 * the exact surface. Two metres keeps coarse triangles below the level court and approach.
 * The patch continues eleven metres beyond the sink and joins original ground.
 */
export function canerdGroundDistance(x, z) {
  return Math.min(Math.hypot(x - cx, z - cz) - radius, fairDistance(x, z) - 4);
}
export const CANERD_GROUND_BOUNDS = freeze({ minX: cx - 137, maxX: cx + 176, minZ: cz - 137, maxZ: cz + 139 });
export function canerdTerrainSink(x, z) {
  if (x < cx - 126 || x > cx + 165 || z < cz - 126 || z > cz + 128) return 0;
  return 2 * (1 - smooth(0, 15, canerdGroundDistance(x, z)));
}
export function canerdGroundPatchWeight(x, z) { return 1 - smooth(15, 26, canerdGroundDistance(x, z)); }
