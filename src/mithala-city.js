/** Mithala: the river-city at the meeting of the arms, one district on each of the four
 * Mithala countries' hexes (docs/mithala-city-brief.md). Pure layout, the single source of truth:
 * no three, no meshes.
 *
 * Laid out here: the four district platforms, kept clear of the north braid (with its braid
 * threads), the west arm and the main channel as they actually run; the earth flood banks round the
 * Braid Bank, the Quays and the Ford and the Cref curtain round the Fork, with their gates found
 * where the streets cross them; the three bridges from the Fork and the paved ford; the streets,
 * including the dry street between the Braid Bank and the Quays; the stone quay and its moored
 * barges; building footprints with heights; the sky tower with a stair recorded flight by flight;
 * the flood gauge at the meeting; and the approaches, which carry every street that leaves the made
 * ground down to the plain or the water at a grade a cart can take. The ground is laid into the
 * world's terrain chain (src/world-terrain.js), the countryside's scatter is lifted off it and the
 * city's scenery, streets and landmarks are built with the Mithala (src/world.js); the chart badge,
 * the travel arrival at the Ford and the review views follow Nylon's. Not yet: people. Nothing here
 * straightens, moves or fills a channel. */
import { MITHALA_MAIN, MITHALA_WEST_ARM, MITHALA_NORTH_BRAID, MITHALA_RIVERS, WEST_BRAIDS,
  courseDistance, coursePosition, courseHalfAt } from './west-regions.js';
import { MITHALA_FLOOD } from './mithala-world.js';

const freeze = Object.freeze;
const point = (x, z) => freeze({ x, z });
const smooth = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };

/**
 * Heights. The plain under the city stands at 11.9-12.5 m (the brief's measure at the four hex
 * centres) and the main channel's levee at most `MITHALA_FLOOD.crest` above it, so the highest
 * water the plain is shaped for stands at the highest centre plus a full crest. Every platform
 * stands clear of that line; the banks stand a metre and a half above the platforms.
 */
const PLAIN_HIGH = 12.48;
export const MITHALA_CITY = freeze({
  id: 'mithala', name: 'Mithala', meeting: point(-1700, -1414.4),
  // Where a traveler is put down: on Inn Street in the Ford, the quarter the south road and the Empire arc come in by,
  // on the platform between the inns and the mountain market, facing north to the meeting. The chart's badge and the
  // testing panel's place are here.
  arrival: freeze({ x: -1696, z: -1353.2, facing: 0 }),
  floodLine: PLAIN_HIGH + MITHALA_FLOOD.crest, platform: 14.5,
  bank: freeze({ inset: 4, crest: 1.5, top: 2.5, side: 2.5 }),
  curtain: freeze({ inset: 2.5, thickness: 2.4, height: 9 }),
  // `edgeGrade`: the steepest the made ground comes down toward the water, measured from the `waterKeep` line.
  skirt: 6, waterKeep: 2, platformClearance: 6, edgeGrade: .6,
  bounds: freeze({ minX: -1800, maxX: -1600, minZ: -1590, maxZ: -1300 }),
});

// ---------------------------------------------------------------------------
// The water: the three channels as they run, braid threads included
// ---------------------------------------------------------------------------
const CHANNELS = freeze([MITHALA_NORTH_BRAID, MITHALA_WEST_ARM, MITHALA_MAIN]);
const braidOf = course => WEST_BRAIDS.find(b => b.course === course) ?? null;
/** How far out from a course's centre line its water reaches here: the channel's own half-width, or
 * across its outer braid thread where the course braids (the bar between counts as water). */
export function mithalaChannelReach(course, x, z) {
  const along = coursePosition(course, x, z), half = courseHalfAt(course, along), braid = braidOf(course);
  if (!braid || along < braid.from || along > braid.to) return half;
  const offset = braid.offset * Math.sin((along - braid.from) / (braid.to - braid.from) * Math.PI);
  return Math.max(half, offset + braid.half);
}
/** Signed distance from the nearest water of the plain's channels: negative in it. */
export function mithalaCityWaterClearance(x, z) {
  let best = Infinity;
  for (const course of MITHALA_RIVERS) {
    const d = courseDistance(course, x, z, best + 30);
    if (d - 30 > best) continue;
    best = Math.min(best, d - mithalaChannelReach(course, x, z));
  }
  return best;
}

// ---------------------------------------------------------------------------
// Polygons
// ---------------------------------------------------------------------------
export function mithalaSegmentDistance(x, z, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, length2 = dx * dx + dz * dz;
  const t = length2 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / length2)) : 0;
  return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
}
function inPolygon(polygon, x, z) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}
const edgeDistance = (polygon, x, z) => Math.min(...polygon.map((a, i) => mithalaSegmentDistance(x, z, a, polygon[(i + 1) % polygon.length])));
/** Positive inside, negative outside: metres to the outline. */
export const polygonDepth = (polygon, x, z) => (inPolygon(polygon, x, z) ? 1 : -1) * edgeDistance(polygon, x, z);
/** A convex outline drawn in by `d` metres: each edge moved inward, neighbours intersected. */
function insetConvex(polygon, d) {
  const n = polygon.length, area = polygon.reduce((s, a, i) => s + a.x * polygon[(i + 1) % n].z - polygon[(i + 1) % n].x * a.z, 0);
  const sign = area > 0 ? 1 : -1;
  const lines = polygon.map((a, i) => {
    const b = polygon[(i + 1) % n], l = Math.hypot(b.x - a.x, b.z - a.z);
    const nx = -(b.z - a.z) / l * sign, nz = (b.x - a.x) / l * sign;
    return { x: a.x + nx * d, z: a.z + nz * d, dx: b.x - a.x, dz: b.z - a.z };
  });
  return freeze(lines.map((l1, i) => {
    const l0 = lines[(i + n - 1) % n], den = l0.dx * l1.dz - l0.dz * l1.dx;
    const t = ((l1.x - l0.x) * l1.dz - (l1.z - l0.z) * l1.dx) / den;
    return point(+(l0.x + l0.dx * t).toFixed(3), +(l0.z + l0.dz * t).toFixed(3));
  }));
}
const outline = coordinates => freeze(coordinates.map(([x, z]) => point(x, z)));

// ---------------------------------------------------------------------------
// The districts: platforms on their own hexes
// ---------------------------------------------------------------------------
/** Each outline sits inside its hex and stands back from the water by at least
 * `platformClearance`; the north braid's threads are what pull the Fork's and the Braid Bank's
 * northern sides in so far. */
export const MITHALA_DISTRICTS = freeze([
  freeze({ id: 'mithala-fork', name: 'The Fork', region: 'West Mithala', hex: freeze({ q: 5, r: 89 }), centre: point(-1750, -1443.2),
    wall: 'curtain', outline: outline([[-1795,-1447],[-1765,-1459],[-1738,-1468],[-1720,-1457],[-1713,-1449],[-1713,-1431],[-1718,-1420],[-1745,-1404.5],[-1760,-1399],[-1795,-1418]]) }),
  freeze({ id: 'mithala-braid-bank', name: 'The Braid Bank', region: 'North Mithala', hex: freeze({ q: 6, r: 88 }), centre: point(-1700, -1529.8),
    wall: 'bank', outline: outline([[-1745,-1555],[-1700,-1580],[-1655,-1555],[-1655,-1505],[-1690,-1485],[-1710,-1500],[-1735,-1515],[-1745,-1520]]) }),
  freeze({ id: 'mithala-quays', name: 'The Quays', region: 'East Mithala', hex: freeze({ q: 6, r: 89 }), centre: point(-1650, -1443.2),
    wall: 'bank', outline: outline([[-1688,-1468],[-1650,-1495],[-1605,-1468],[-1605,-1421],[-1622,-1417],[-1650,-1407],[-1675,-1415],[-1688,-1427]]) }),
  freeze({ id: 'mithala-ford', name: 'The Ford', region: 'South Mithala', hex: freeze({ q: 5, r: 90 }), centre: point(-1700, -1356.6),
    wall: 'bank', outline: outline([[-1700,-1397],[-1665,-1380],[-1655,-1375],[-1655,-1335],[-1700,-1305],[-1740,-1332],[-1738,-1365],[-1723,-1385],[-1710,-1393]]) }),
].map(d => freeze({ ...d,
  // The wall line: the curtain's centre line on the Fork, the bank's crest line elsewhere.
  line: insetConvex(d.outline, d.wall === 'curtain' ? MITHALA_CITY.curtain.inset : MITHALA_CITY.bank.inset) })));
export const mithalaDistrict = id => MITHALA_DISTRICTS.find(d => d.id === id);
export const mithalaDistrictAt = (x, z) => MITHALA_DISTRICTS.find(d => inPolygon(d.outline, x, z)) ?? null;
export const MITHALA_CURTAIN = mithalaDistrict('mithala-fork').line;
export const MITHALA_FLOOD_BANKS = freeze(MITHALA_DISTRICTS.filter(d => d.wall === 'bank').map(d => freeze({ district: d.id, line: d.line })));

// ---------------------------------------------------------------------------
// Bridges, the ford and the quay
// ---------------------------------------------------------------------------
const span = (id, name, from, to, a, b, width, over, extra = {}) => freeze({ id, name, from, to, a: point(...a), b: point(...b), width, over, ...extra });
/** Level decks at platform height: both ends a metre onto platform ground, the water well under. */
export const MITHALA_BRIDGES = freeze([
  span('mithala-braid-bridge', 'The Braid Bridge', 'mithala-fork', 'mithala-braid-bank', [-1726.3, -1459.3], [-1704.25, -1496.9], 7, MITHALA_NORTH_BRAID.id),
  span('mithala-quays-bridge', 'The Quays Bridge', 'mithala-fork', 'mithala-quays', [-1714, -1440], [-1687, -1440], 8, MITHALA_NORTH_BRAID.id),
  span('mithala-arm-bridge', 'The Arm Bridge', 'mithala-fork', 'mithala-ford', [-1733, -1413.7], [-1717.3, -1386.6], 7, MITHALA_WEST_ARM.id),
].map(b => freeze({ ...b, deck: MITHALA_CITY.platform })));
/** The plain's only crossing of the main channel, paved over its gravel; it is waded, so its
 * paving follows the bed and the approaches come down to it off the two platforms. */
export const MITHALA_FORD = span('mithala-ford-crossing', 'The Paved Ford', 'mithala-quays', 'mithala-ford', [-1667.16, -1413.91], [-1682.1, -1387.4], 6, MITHALA_MAIN.id);
/** Where the ford's paving meets the river's own bank on each side, `waterKeep` from the water; and where the hollow way
 * up from it reaches the platform, straight on along the ford's own line, `FORD_RUN` metres up from that foot. Ford
 * Landing and Ford Street come down to the ford through those tops, so neither cutting bends on its slope: a bend in a
 * ramp leaves a step on its inside, where the ground is read off the nearer of two legs at different heights. */
const FORD_RUN = 20;
const FORD_QUAYS_FOOT = waterLine(MITHALA_FORD.a, MITHALA_FORD.b), FORD_SOUTH_FOOT = waterLine(MITHALA_FORD.b, MITHALA_FORD.a);
const rampTop = (foot, from, to) => {
  const dx = to.x - from.x, dz = to.z - from.z, l = Math.hypot(dx, dz);
  return point(+(foot.x + dx / l * FORD_RUN).toFixed(2), +(foot.z + dz / l * FORD_RUN).toFixed(2));
};
const FORD_QUAYS_TOP = rampTop(FORD_QUAYS_FOOT, MITHALA_FORD.b, MITHALA_FORD.a), FORD_SOUTH_TOP = rampTop(FORD_SOUTH_FOOT, MITHALA_FORD.a, MITHALA_FORD.b);
/** The stone-faced quay on the main channel's north bank, outside the Quays' bank, at platform
 * height; its outer face is the water's edge. It follows the bank in four straight runs, its face a
 * quarter of a metre short of the water at every bend and about a metre short at most between them,
 * so a barge lies alongside it; the face stands on the river's own bank and the bank is left as it is. */
export const MITHALA_QUAY = freeze({ id: 'mithala-quay', name: 'The Grain Quay', width: 5, deck: MITHALA_CITY.platform,
  points: outline([[-1663, -1403.01], [-1658, -1401.6], [-1643, -1401.48], [-1635, -1403.86], [-1621, -1411.61]]) });
/** Moored alongside the quay's two long runs, square to them, with a metre of water or less between hull and face. */
export const MITHALA_BARGES = freeze([
  freeze({ id: 'mithala-barge-1', name: 'Grain barge', x: -1650.54, z: -1395.85, yaw: 0.008, length: 16, width: 3.6 }),
  freeze({ id: 'mithala-barge-2', name: 'Grain barge', x: -1625.67, z: -1403.52, yaw: -0.506, length: 14, width: 3.4 }),
]);
function alongSpan(s, x, z, margin = 0) {
  const dx = s.b.x - s.a.x, dz = s.b.z - s.a.z, len = Math.hypot(dx, dz), px = x - s.a.x, pz = z - s.a.z;
  const along = (px * dx + pz * dz) / len, across = (-px * dz + pz * dx) / len;
  if (along < -margin || along > len + margin || Math.abs(across) > s.width / 2 + margin) return null;
  return along / len;
}
export const mithalaBridgeAt = (x, z, margin = 0) => MITHALA_BRIDGES.find(b => alongSpan(b, x, z, margin) !== null) ?? null;
/** The top of a made surface - a bridge deck or the quay - or null. */
export function mithalaDeckHeight(x, z) {
  const bridge = mithalaBridgeAt(x, z);
  if (bridge) return bridge.deck;
  const q = MITHALA_QUAY.points;
  for (let i = 1; i < q.length; i++) if (mithalaSegmentDistance(x, z, q[i - 1], q[i]) <= MITHALA_QUAY.width / 2) return MITHALA_QUAY.deck;
  return null;
}

// ---------------------------------------------------------------------------
// Streets and gates
// ---------------------------------------------------------------------------
const street = (id, name, width, coordinates) => freeze({ id, name, width, points: outline(coordinates) });
export const MITHALA_STREETS = freeze([
  // The Fork: the land gate west toward the Round Horizon, straight through to the Quays bridge.
  street('mithala-kings-way', 'The King’s Way', 8, [[-1822, -1440], [-1740, -1440], [-1726.3, -1440], [-1714, -1440]]),
  street('mithala-braid-gate-street', 'Braid Gate Street', 6, [[-1726.3, -1440], [-1726.3, -1459.3]]),
  street('mithala-arm-gate-street', 'Arm Gate Street', 6, [[-1740, -1440], [-1733, -1413.7]]),
  // The gauge lane: down the tower's east side and out through the water gate to the gauge at the
  // meeting, where the flood is read (the user's choice of gate, 4 October 2026).
  street('mithala-gauge-lane', 'Gauge Lane', 4, [[-1719, -1440], [-1719, -1427], [-1711, -1422.6]]),
  // The Quays.
  street('mithala-quay-street', 'Quay Street', 8, [[-1687, -1440], [-1665, -1440], [-1660, -1440], [-1640, -1440], [-1616, -1440]]),
  street('mithala-dry-street', 'The Dry Street', 7, [[-1660, -1440], [-1660, -1470], [-1675, -1496], [-1680, -1530]]),
  // Ford Landing turns on the level at the top of the hollow way and goes down it on the ford's own line.
  street('mithala-ford-landing', 'Ford Landing', 6, [[-1665, -1440], [FORD_QUAYS_TOP.x, FORD_QUAYS_TOP.z], [-1667.16, -1413.91]]),
  street('mithala-quay-stairs', 'Quay Stairs', 5, [[-1640, -1440], [-1640, -1401.27]]),
  // The Braid Bank, and the road north toward the Acorwood.
  street('mithala-market-street', 'Market Street', 8, [[-1704.25, -1496.9], [-1700, -1515], [-1680, -1530], [-1680, -1600]]),
  // The Ford, and the south road toward the Lotharn passes.
  street('mithala-inn-street', 'Inn Street', 8, [[-1717.3, -1386.6], [-1700, -1362], [-1690, -1340], [-1690, -1290]]),
  street('mithala-ford-street', 'Ford Street', 6, [[-1682.1, -1387.4], [FORD_SOUTH_TOP.x, FORD_SOUTH_TOP.z], [-1700, -1362]]),
]);
const GATE_NAMES = freeze({
  'mithala-fork:mithala-kings-way:0': 'The Horizon Gate', 'mithala-fork:mithala-kings-way:1': 'The Quays Bridge Gate',
  'mithala-fork:mithala-braid-gate-street:0': 'The Braid Bridge Gate', 'mithala-fork:mithala-arm-gate-street:0': 'The Arm Bridge Gate',
  'mithala-fork:mithala-gauge-lane:0': 'The Water Gate',
});
function crossings(line, path) {
  const found = [];
  for (let i = 1; i < path.points.length; i++) {
    const p = path.points[i - 1], r = path.points[i];
    for (let k = 0; k < line.length; k++) {
      const a = line[k], b = line[(k + 1) % line.length];
      const den = (r.x - p.x) * (b.z - a.z) - (r.z - p.z) * (b.x - a.x);
      if (Math.abs(den) < 1e-9) continue;
      const t = ((a.x - p.x) * (b.z - a.z) - (a.z - p.z) * (b.x - a.x)) / den;
      const u = ((a.x - p.x) * (r.z - p.z) - (a.z - p.z) * (r.x - p.x)) / den;
      if (t >= 0 && t <= 1 && u >= 0 && u < 1) found.push({ edge: k, x: p.x + (r.x - p.x) * t, z: p.z + (r.z - p.z) * t });
    }
  }
  return found;
}
/** A gate wherever a street crosses a district's wall line, and nowhere else. The Fork's five are
 * the brief's land gate west and three bridge gates, and the water gate down to the gauge. */
export const MITHALA_GATES = freeze(MITHALA_DISTRICTS.flatMap(d => MITHALA_STREETS.flatMap(s =>
  crossings(d.line, s).map((c, i) => freeze({ id: `${d.id}:${s.id}:${i}`, district: d.id, street: s.id, edge: c.edge,
    name: GATE_NAMES[`${d.id}:${s.id}:${i}`] ?? `${d.name} gate (${s.name})`,
    x: +c.x.toFixed(3), z: +c.z.toFixed(3), width: s.width + 2, kind: d.wall === 'curtain' ? 'stone' : 'earth' })))));
const gateGap = (x, z) => Math.min(...MITHALA_GATES.map(g => Math.hypot(x - g.x, z - g.z) - g.width / 2));

// ---------------------------------------------------------------------------
// Buildings, the tower and its stair, the gauge
// ---------------------------------------------------------------------------
const building = (id, name, district, x, z, width, depth, height, kind = 'house', extra = {}) => freeze({ id, name, district, x, z, width, depth, height, kind, ...extra });
const TOWER = freeze({ x: -1727, z: -1431, size: 10, height: 40, wall: 1.1, floor: 38.6 });
export const MITHALA_BUILDINGS = freeze([
  // The Fork: the old seat.
  building('mithala-kings-hall', 'The King’s Hall', 'mithala-fork', -1765, -1427, 40, 14, 11, 'hall', { shut: true }),
  building('mithala-water-court', 'The Water Court', 'mithala-fork', -1752, -1450, 16, 8, 9, 'court'),
  building('mithala-sky-tower', 'The Sky Tower', 'mithala-fork', TOWER.x, TOWER.z, TOWER.size, TOWER.size, TOWER.height, 'tower'),
  // North of the King's Way between the water court and Braid Gate Street: the ground west of the hall is too narrow for a
  // house inside the curtain, and this stands clear of the Braid Bridge Gate's towers.
  building('mithala-fork-house-1', 'House of an old Mithali family', 'mithala-fork', -1737.5, -1451, 10, 8, 8),
  building('mithala-fork-house-2', 'House of an old Mithali family', 'mithala-fork', -1752, -1414.5, 12, 8, 8),
  // The Braid Bank: cattle, threshing, the garrison.
  building('mithala-garrison-hall', 'The Cref Garrison Hall', 'mithala-braid-bank', -1716, -1548, 24, 12, 9, 'hall'),
  building('mithala-cattle-pens', 'The cattle market pens', 'mithala-braid-bank', -1712, -1530, 14, 12, 1.4, 'pens'),
  building('mithala-byre-1', 'River-horn byre', 'mithala-braid-bank', -1669, -1545, 10, 8, 6, 'byre'),
  building('mithala-byre-2', 'River-horn byre', 'mithala-braid-bank', -1669, -1520, 10, 8, 6, 'byre'),
  building('mithala-threshing-floor', 'Threshing floor', 'mithala-braid-bank', -1733, -1532, 8, 8, .3, 'floor'),
  building('mithala-barn-1', 'Barn', 'mithala-braid-bank', -1700, -1563, 12, 9, 8, 'barn'),
  // The Quays: the grain trade.
  building('mithala-granary-1', 'Raised granary', 'mithala-quays', -1650, -1422, 14, 7, 10, 'granary', { posts: 2.2 }),
  building('mithala-granary-2', 'Raised granary', 'mithala-quays', -1628, -1430, 10, 8, 10, 'granary', { posts: 2.2 }),
  building('mithala-weighing-house', 'The Weighing House', 'mithala-quays', -1674, -1455, 10, 10, 9, 'weighing'),
  building('mithala-factors-hall-1', 'Grain factors’ hall', 'mithala-quays', -1640, -1460, 18, 12, 11, 'hall'),
  building('mithala-factors-hall-2', 'Grain factors’ hall', 'mithala-quays', -1620, -1456, 10, 14, 11, 'hall'),
  building('mithala-quay-crane', 'The warehouse crane', 'mithala-quays', -1653, -1400.8, 3, 3, 12, 'crane', { onQuay: true }),
  // The Ford: the mountain market, inns, smithies.
  building('mithala-inn-1', 'Inn with a yard', 'mithala-ford', -1718, -1355, 14, 14, 9, 'inn'),
  building('mithala-inn-2', 'Inn with a yard', 'mithala-ford', -1672, -1350, 12, 10, 9, 'inn'),
  building('mithala-smithy-1', 'Smithy', 'mithala-ford', -1715, -1332, 10, 8, 6, 'smithy'),
  building('mithala-mountain-market', 'The mountain market', 'mithala-ford', -1675, -1364, 14, 10, .3, 'market'),
  building('mithala-ford-house-1', 'House', 'mithala-ford', -1722, -1342, 9, 7, 7),
]);
/**
 * The tower's inside stair: twelve straight flights up the four inner walls, turning on a square
 * landing in each corner, from the floor at the door to the open platform under the sighting
 * stones. Every step is recorded by its flight, so a test reads the grade off the numbers.
 */
export const MITHALA_TOWER_STAIR = (() => {
  const inner = TOWER.size / 2 - TOWER.wall, width = 1.4, tread = .3, flights = 12;
  const run = inner * 2 - width * 2, steps = Math.round(run / tread), rise = TOWER.floor / flights;
  const corners = [[-1, 1], [-1, -1], [1, -1], [1, 1]].map(([sx, sz]) => point(TOWER.x + sx * (inner - width / 2), TOWER.z + sz * (inner - width / 2)));
  const landings = [], flightList = [];
  for (let i = 0; i <= flights; i++) landings.push(freeze({ ...corners[i % 4], y: +(rise * i).toFixed(3), size: width }));
  for (let i = 0; i < flights; i++) {
    const a = landings[i], b = landings[i + 1], len = Math.hypot(b.x - a.x, b.z - a.z) - width;
    flightList.push(freeze({ from: a, to: b, steps, riser: +(rise / steps).toFixed(4), tread: +(len / steps).toFixed(4), width }));
  }
  return freeze({ tower: TOWER, door: point(TOWER.x - TOWER.size / 2, TOWER.z + inner - width / 2), top: TOWER.floor,
    landings: freeze(landings), flights: freeze(flightList) });
})();
/** The gauge, a squared stone post at the water's edge on the Fork's point, cut with the flood
 * marks and the proverb; reached by Gauge Lane through the water gate, and read from the tower too. */
export const MITHALA_GAUGE = freeze({ id: 'mithala-flood-gauge', name: 'The Flood Gauge', x: -1708.6, z: -1421.5, width: 1.6, height: 5.5,
  inscription: 'Vet mithalan, vel noreth', meaning: 'The flood returns. The grain does not ask.' });

/** The places the world names in the city, each in the country its point stands in. The city's own
 * mark is on the King's Way in the Fork, the old seat, a hundred and fifty metres from every quarter's
 * far side; the paved ford's is on the Ford's half of the water, south of the border the main channel
 * runs along. Empty of people until stage 2, so nothing here says who is in it. */
export const MITHALA_CITY_LANDMARKS = freeze([
  freeze({ id: 'mithala', name: 'Mithala', region: 'West Mithala', x: -1745, z: -1440, radius: 150,
    description: 'The river-city at the meeting of the arms, a quarter on each of the four Mithala countries: the Fork, the old seat, inside the fork behind the only stone wall on the plain; the Braid Bank over the north braid with its cattle market; the Quays on the main channel with the grain; and the Ford at the plain’s only crossing. Every quarter stands on made ground above the flood, the three across the water behind banks of earth that keep out water and not people: dark brick, pale timber and reed thatch on stone footings.' }),
  freeze({ id: 'mithala-sky-tower', name: 'The Sky Tower', region: 'West Mithala', x: TOWER.x, z: TOWER.z, radius: 12,
    description: 'Forty metres of dark brick at the Fork’s point, over the meeting, and the one view over the whole plain. A stair climbs the inside walls in twelve flights to an open platform where the sighting stones stand for the horizon and the flood calendar: the sky-reading here is among the oldest on the continent.' }),
  freeze({ id: 'mithala-kings-hall', name: 'The King’s Hall', region: 'West Mithala', x: -1765, z: -1427, radius: 22,
    description: 'The old Mithali royal hall, a long brick hall in the Fork, where a Cref king still holds the oath at the old seat and holds little else. The curtain round it is the conquerors’ one visible mark on the city. Its doors are shut.' }),
  freeze({ id: 'mithala-flood-gauge', name: 'The Flood Gauge', region: 'West Mithala', x: MITHALA_GAUGE.x, z: MITHALA_GAUGE.z, radius: 6,
    description: `A squared stone post at the water’s edge on the Fork’s point, where the arms meet, cut with the marks of the floods and with the proverb “${MITHALA_GAUGE.inscription}”: ${MITHALA_GAUGE.meaning} Gauge Lane comes down to it from beside the tower, through the water gate.` }),
  freeze({ id: 'mithala-quay', name: 'The Grain Quay', region: 'East Mithala', x: -1645, z: -1402, radius: 22,
    description: 'A stone-faced quay on the main channel’s north bank, outside the Quays’ bank, with grain barges moored along it and the warehouse crane over them. Raised granaries, the weighing house and the grain factors’ halls stand behind: the richest ground in the city.' }),
  freeze({ id: 'mithala-paved-ford', name: 'The Paved Ford', region: 'South Mithala', x: -1676.5, z: -1397.5, radius: 14,
    description: 'The plain’s only crossing of the main channel, paved over its gravel and waded, with a hollow way cut down to it through the bank on either side. Lotharn iron and Amodian chestnuts come north over it and grain goes back.' }),
  freeze({ id: 'mithala-cattle-market', name: 'The Cattle Market', region: 'North Mithala', x: -1700, z: -1532, radius: 16,
    description: 'The Braid Bank’s market for the river-horn herds that pull the plain’s harrows: pens and byres, threshing floors and barns, and the Cref garrison hall over them. The pens stand empty between markets.' }),
  freeze({ id: 'mithala-mountain-market', name: 'The Mountain Market', region: 'South Mithala', x: -1675, z: -1364, radius: 14,
    description: 'The Ford’s open market, where the road comes in from the Lotharn passes: iron and chestnuts in, grain out, with inns and their yards and the smithies round it.' }),
]);

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------
const nearby = (x, z, margin = 0) => { const b = MITHALA_CITY.bounds; return x > b.minX - 30 - margin && x < b.maxX + 20 + margin && z > b.minZ - 20 - margin && z < b.maxZ + 20 + margin; };
export const inMithalaCity = (x, z) => nearby(x, z) && mithalaDistrictAt(x, z) !== null;
const segments = path => path.points.slice(1).map((b, i) => [path.points[i], b]);
export function mithalaCityReserved(x, z, margin = 0) {
  if (!nearby(x, z, margin)) return false;
  if (MITHALA_DISTRICTS.some(d => polygonDepth(d.outline, x, z) > -MITHALA_CITY.skirt - margin)) return true;
  if (mithalaBridgeAt(x, z, 3 + margin) || alongSpan(MITHALA_FORD, x, z, 3 + margin) !== null) return true;
  if (MITHALA_QUAY.points.some((a, i) => i > 0 && mithalaSegmentDistance(x, z, MITHALA_QUAY.points[i - 1], a) < MITHALA_QUAY.width / 2 + 3 + margin)) return true;
  return MITHALA_STREETS.some(s => segments(s).some(([a, b]) => mithalaSegmentDistance(x, z, a, b) < s.width / 2 + 3 + margin));
}
/** The bank's own rise over the platform at a depth inside the outline: a flat-topped earth ridge. */
function bankRise(depth) {
  const B = MITHALA_CITY.bank, off = Math.abs(depth - B.inset) - B.top / 2;
  return B.crest * (1 - smooth(off / B.side));
}
/** Where a point lies against a path: `c` metres off its line, `u` metres along it from `points[0]`. */
function onPath(points, x, z) {
  let c = Infinity, u = 0, run = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (length * length)));
    const d = Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
    if (d < c) { c = d; u = run + t * length; }
    run += length;
  }
  return { c, u };
}
/** Linear in the middle and rounded at both ends, so the steepest of it is a quarter over the mean grade. */
function ease(value, round = .2) {
  const t = Math.max(0, Math.min(1, value));
  if (t < round) return t * t / (2 * round * (1 - round));
  if (t > 1 - round) return 1 - (1 - t) * (1 - t) / (2 * round * (1 - round));
  return (t - round / 2) / (1 - round);
}
/** The first point from `from` toward `to` that is `MITHALA_CITY.waterKeep` from the water: where a ford's paving meets the river's own bank. */
function waterLine(from, to) {
  const at = s => ({ x: from.x + (to.x - from.x) * s, z: from.z + (to.z - from.z) * s });
  let dry = 0, wet = 0;
  for (let s = 0; s <= 1; s += .01) { const p = at(s); if (mithalaCityWaterClearance(p.x, p.z) <= MITHALA_CITY.waterKeep) { wet = s; break; } dry = s; }
  for (let i = 0; i < 30; i++) { const s = (dry + wet) / 2, p = at(s); if (mithalaCityWaterClearance(p.x, p.z) > MITHALA_CITY.waterKeep) dry = s; else wet = s; }
  const p = at(dry);
  return point(+p.x.toFixed(3), +p.z.toFixed(3));
}

// ---------------------------------------------------------------------------
// The approaches: every street off the made ground, graded
// ---------------------------------------------------------------------------
/**
 * A platform stands two to two and a half metres over the plain and its skirt drops that in six
 * metres, six in ten at the steepest, which nobody takes a cart up; and the river's own cut at the
 * ford is another two and a half under the plain. So every street that leaves the made ground does it
 * on an approach, at three in ten or less anywhere along it (Aevis's worst street is 0.33):
 *
 *  - an **embankment** where a road goes out to the plain - the King's Way west from the Horizon
 *    Gate, Market Street north toward the Acorwood, Inn Street south toward the Lotharn passes. It
 *    carries the platform's level past the skirt and comes down to the plain beyond it; Inn Street's
 *    comes down past the step the plain itself has at the hex border south of the Ford (a third of a
 *    metre), so that step is under the road's level stretch and never on its slope;
 *  - a **cutting** where a street goes down to the water: the paved ford from each of its platforms,
 *    a hollow way through the bank that reaches the river's own bank two metres from the water, and
 *    Gauge Lane from beside the tower out through the water gate to the gauge's foot;
 *  - a **causeway** where a street crosses from one made level to another at that level: the Dry
 *    Street over the gap between the Quays and the Braid Bank, and the Quay Stairs out through the
 *    Quays' bank onto the quay.
 *
 * Each rises along its `path` from `path[0]`, its foot, where it meets the ground it is going to,
 * and is at the platform's level `run` metres along; a causeway (`run` 0) is at that level the whole
 * way. Across, it is the street's own width and a metre of shoulder each side, and then
 * `APPROACH_BAND` metres in which it meets whatever the ground beside it is: the side of an
 * embankment, the wall of a cutting.
 */
export const APPROACH_BAND = 3;
const streetOf = id => MITHALA_STREETS.find(s => s.id === id);
const approach = (id, street, run, coordinates) => freeze({ id, street, run,
  half: streetOf(street).width / 2 + 1, path: freeze(coordinates.map(p => Array.isArray(p) ? point(...p) : p)) });
export const MITHALA_APPROACHES = freeze([
  approach('mithala-kings-way-approach', 'mithala-kings-way', 10, [[-1805, -1440], [-1786, -1440]]),
  approach('mithala-market-approach', 'mithala-market-street', 12, [[-1680, -1581], [-1680, -1560]]),
  approach('mithala-inn-approach', 'mithala-inn-street', 13, [[-1690, -1290], [-1690, -1318]]),
  // The cuttings are straight from foot to top, each on one line: a ramp that bends on its slope leaves a step on the
  // inside of the bend. The ford's go on along the ford's own line; Gauge Lane's from the gauge's foot to its turn
  // beside the tower, which is the top.
  approach('mithala-ford-quays-approach', 'mithala-ford-landing', FORD_RUN, [FORD_QUAYS_FOOT, FORD_QUAYS_TOP]),
  approach('mithala-ford-south-approach', 'mithala-ford-street', FORD_RUN, [FORD_SOUTH_FOOT, FORD_SOUTH_TOP]),
  approach('mithala-gauge-approach', 'mithala-gauge-lane', +Math.hypot(MITHALA_GAUGE.x - streetOf('mithala-gauge-lane').points[1].x,
    MITHALA_GAUGE.z - streetOf('mithala-gauge-lane').points[1].z).toFixed(3), [point(MITHALA_GAUGE.x, MITHALA_GAUGE.z), streetOf('mithala-gauge-lane').points[1]]),
  approach('mithala-dry-street-causeway', 'mithala-dry-street', 0, streetOf('mithala-dry-street').points),
  // Stopped a metre short of the quay's inner edge: the quay's own deck carries the street on over the water's edge, and
  // made ground run out under it would stand as a lip outside its stone face.
  approach('mithala-quay-stairs-causeway', 'mithala-quay-stairs', 0, [streetOf('mithala-quay-stairs').points[0], [-1640, -1405.98]]),
].map(a => {
  const reach = a.half + APPROACH_BAND;
  return freeze({ ...a, box: freeze({ minX: Math.min(...a.path.map(p => p.x)) - reach, maxX: Math.max(...a.path.map(p => p.x)) + reach,
    minZ: Math.min(...a.path.map(p => p.z)) - reach, maxZ: Math.max(...a.path.map(p => p.z)) + reach }) });
}));
/** The ground at each approach's foot, read once from the ground the city is laid on. */
const FEET = new WeakMap();
function footOf(a, baseAt, base) {
  if (!baseAt) return base;
  if (!FEET.has(baseAt)) FEET.set(baseAt, new Map());
  const feet = FEET.get(baseAt);
  if (!feet.has(a.id)) feet.set(a.id, baseAt(a.path[0].x, a.path[0].z));
  return feet.get(a.id);
}
/**
 * The made ground over a base ground: the platforms at `MITHALA_CITY.platform`, their skirts down
 * to the plain, the flood banks on the three outer districts (cut at the gates), and the approaches.
 * It never writes within `waterKeep` of a channel, so the river's own cut is untouched. `baseAt` is
 * the same base ground anywhere (the terrain chain passes `groundBeforeMithalaCity`): an approach
 * comes down to the ground at its own foot, wherever that is, at its own grade, so the plain's own
 * slope and the river's bank never show through it. Without it a flat plain is assumed.
 */
export function mithalaCityGround(x, z, base, baseAt = null) {
  if (!nearby(x, z)) return base;
  const water = mithalaCityWaterClearance(x, z);
  if (water <= MITHALA_CITY.waterKeep) return base;
  const P = MITHALA_CITY.platform;
  let weight = 0, rise = 0;
  for (const d of MITHALA_DISTRICTS) {
    const depth = polygonDepth(d.outline, x, z);
    if (depth < -MITHALA_CITY.skirt) continue;
    weight = Math.max(weight, depth >= 0 ? 1 : 1 - smooth(-depth / MITHALA_CITY.skirt));
    if (d.wall === 'bank' && depth > 0) rise = Math.max(rise, bankRise(depth) * smooth(gateGap(x, z) / 3));
  }
  // Toward the water the made ground comes down at `edgeGrade` at most from the water-keep line: a platform stands six
  // metres from its channel and its skirt would otherwise be squeezed into the last few metres and drop at more than one
  // in one. Nothing more than about six metres from the water is touched by this.
  let height = base + Math.min((P - base) * weight + rise, (water - MITHALA_CITY.waterKeep) * MITHALA_CITY.edgeGrade);
  // The approaches, over whatever is beside them; within a metre and a half of the water-keep line
  // they give way to the river's own bank, which they meet at the foot of a cutting.
  const wet = smooth((water - MITHALA_CITY.waterKeep) / 1.5);
  for (const a of MITHALA_APPROACHES) {
    if (x < a.box.minX || x > a.box.maxX || z < a.box.minZ || z > a.box.maxZ) continue;
    const { c, u } = onPath(a.path, x, z), band = c - a.half;
    if (band >= APPROACH_BAND) continue;
    const foot = a.run ? footOf(a, baseAt, base) : P;
    const level = a.run ? foot + (P - foot) * ease(u / a.run) : P;
    const core = base + (level - base) * wet;
    height = core + (height - core) * smooth(band / APPROACH_BAND);
  }
  return height;
}
