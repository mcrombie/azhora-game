/**
 * **Ovesos for the Farmlands of the Lizeem** (docs/lizeem-farmlands-design.md 5.4, 6.6 and the appendix; the user's
 * design of 5 October 2026, with his ruling of the same day that Ovesos is fertile along the river and dries toward
 * the desert; built 6 October 2026, "keep building everything"): Velsorten, the Water Council's village on the terrace
 * above the Sorten, its canal from the Lizeem, the plots along the canal in the order of their water rights, and Lahar's
 * herders' camp on the upland grass.
 *
 * Coordinates only: no terrain, world or renderer dependency (src/ovesos-farm-scenery.js draws them). +x is east and
 * +z is south. Every place was read off the built ground and is pinned by tests/ovesos-farm.test.js on a scoped world;
 * each bed's `y` is the ground's height under it when the plots were laid out.
 *
 * **The canal.** Its head is on the Lizeem's northern reach, the high water above the Carica's fall, where the river
 * runs at fourteen metres and the plain beside it at sixteen and seventeen: the divider stands on the bank there. From
 * the divider the canal runs south over the plain, carried on its own banks across the swale that crosses the north of
 * the country, falls with the plain to the terrace where the village is, and turns south-west below it toward the
 * Sorten, ending in the dry wedge between the Sorten's bench and the Dry Gully. The water stands a quarter of a metre
 * over the canal's bed and never climbs (`ovesosCanalProfile`): where the ground under it dips, the bed is raised and
 * the banks grow into an embankment, which is how a canal crosses a hollow.
 *
 * **The plots** go down the canal in the order the water reaches them, which is the order of seniority: the head's four
 * by the river in a row across the slope at the canal's first turnout (Ziusudra's grant is the oldest and his house
 * stands at their end), the middle's four along the canal halfway down, and the tail's four at the dry end below the
 * village, a hundred and fifty metres from the Lizeem, where Ashnan farms and Rollo starts. All twelve lie on the
 * canal's west bank; the way, the mills' doors and the village are on its east. Nobody needs a bridge to reach a
 * plot: the banks are walked over, and the water in the canal comes to the shin.
 */
const freeze = Object.freeze;
const p = (x, z) => freeze({ x, z });
const clamp01 = v => Math.max(0, Math.min(1, v));

export const OVESOS_COUNTRY = 'ovesos';
export const VELSORTEN = freeze({ id: 'velsorten', name: 'Velsorten', region: 'Ovesos', x: -1895, z: 699 });

// ---------------------------------------------------------------------------
// The canal
// ---------------------------------------------------------------------------
/**
 * The canal's line from the divider to its tail, and its section: `half` the channel's half-width, the banks' crest
 * from `crestIn` to `crestOut` metres off the middle, their outer face falling `slope` metres a metre to the ground;
 * the water `depth` over the bed where the canal runs on its own ground, the crest `freeboard` over the water, and the
 * bed `carried` under the water where the canal is carried on a bank.
 */
export const OVESOS_CANAL = freeze({
  id: 'velsorten-canal', name: 'The Velsorten canal',
  points: freeze([p(-1962, 536), p(-1961, 556), p(-1955, 585), p(-1944, 618), p(-1928, 655), p(-1918, 682), p(-1919, 702),
    p(-1926, 722), p(-1936, 748)]),
  half: .8, crestIn: 1, crestOut: 1.8, slope: .5, depth: .25, freeboard: .22, carried: .32,
});
const CANAL_SEGMENTS = (() => {
  const out = []; let s = 0;
  const pts = OVESOS_CANAL.points;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], length = Math.hypot(b.x - a.x, b.z - a.z);
    out.push(freeze({ a, b, length, s0: s, dx: (b.x - a.x) / length, dz: (b.z - a.z) / length })); s += length;
  }
  return freeze(out);
})();
export const OVESOS_CANAL_LENGTH = CANAL_SEGMENTS.reduce((sum, seg) => sum + seg.length, 0);
/** The farthest the canal's banks reach from its middle, at the deepest of the embankment. */
export const OVESOS_CANAL_REACH = 5;
const CANAL_BOX = freeze({
  minX: Math.min(...OVESOS_CANAL.points.map(q => q.x)) - OVESOS_CANAL_REACH, maxX: Math.max(...OVESOS_CANAL.points.map(q => q.x)) + OVESOS_CANAL_REACH,
  minZ: Math.min(...OVESOS_CANAL.points.map(q => q.z)) - OVESOS_CANAL_REACH, maxZ: Math.max(...OVESOS_CANAL.points.map(q => q.z)) + OVESOS_CANAL_REACH,
});
/** The canal's middle `s` metres down from the divider, with its heading: (dx, dz) downstream. */
export function ovesosCanalAt(s) {
  const at = Math.max(0, Math.min(OVESOS_CANAL_LENGTH, s));
  const seg = CANAL_SEGMENTS.find(item => at <= item.s0 + item.length) ?? CANAL_SEGMENTS.at(-1);
  const t = (at - seg.s0) / seg.length;
  return { x: seg.a.x + (seg.b.x - seg.a.x) * t, z: seg.a.z + (seg.b.z - seg.a.z) * t, dx: seg.dx, dz: seg.dz, yaw: Math.atan2(seg.dx, seg.dz) };
}
/** A point `offset` metres east of the canal's middle (west when negative), `s` metres down from the divider. */
export function ovesosCanalBeside(s, offset) {
  const c = ovesosCanalAt(s);
  return { x: c.x + c.dz * offset, z: c.z - c.dx * offset, yaw: c.yaw };
}
/** How far a point is from the canal's middle, and how far down the canal its nearest point lies. */
export function ovesosCanalFrame(x, z) {
  let distance = Infinity, along = 0;
  for (const seg of CANAL_SEGMENTS) {
    const t = Math.max(0, Math.min(seg.length, (x - seg.a.x) * seg.dx + (z - seg.a.z) * seg.dz));
    const d = Math.hypot(x - seg.a.x - seg.dx * t, z - seg.a.z - seg.dz * t);
    if (d < distance) { distance = d; along = seg.s0 + t; }
  }
  return { distance, along };
}
const PROFILES = new WeakMap();
/**
 * The canal's water, bed and crest down its length, read off the ground it is laid on once and kept: a metre a
 * sample. The water stands `depth` over the ground at every point and **never climbs** — it is the highest that any
 * point downstream asks for — so where the ground dips under it the canal is carried, its bed `carried` under the
 * water and its banks an embankment; elsewhere the bed is the ground.
 */
export function ovesosCanalProfile(groundAt) {
  if (PROFILES.has(groundAt)) return PROFILES.get(groundAt);
  const C = OVESOS_CANAL, count = Math.ceil(OVESOS_CANAL_LENGTH) + 1;
  const ground = new Float64Array(count), water = new Float64Array(count), bed = new Float64Array(count);
  for (let i = 0; i < count; i++) { const c = ovesosCanalAt(i); ground[i] = groundAt(c.x, c.z); }
  let level = -Infinity;
  for (let i = count - 1; i >= 0; i--) { level = Math.max(level, ground[i] + C.depth); water[i] = level; }
  for (let i = 0; i < count; i++) bed[i] = Math.max(ground[i], water[i] - C.carried);
  const at = s => {
    const u = Math.max(0, Math.min(count - 1, s)), i = Math.min(count - 2, Math.floor(u)), t = u - i;
    const w = water[i] + (water[i + 1] - water[i]) * t, b = bed[i] + (bed[i + 1] - bed[i]) * t;
    return { water: w, bed: b, crest: w + C.freeboard, ground: ground[i] + (ground[i + 1] - ground[i]) * t };
  };
  const profile = freeze({ count, ground, water, bed, at });
  PROFILES.set(groundAt, profile);
  return profile;
}
/** How far the canal's bed or banks stand over the ground at a point, 0 off them. */
export function ovesosCanalLift(x, z, groundAt) {
  if (x < CANAL_BOX.minX || x > CANAL_BOX.maxX || z < CANAL_BOX.minZ || z > CANAL_BOX.maxZ) return 0;
  const C = OVESOS_CANAL, { distance: u, along } = ovesosCanalFrame(x, z);
  if (u >= OVESOS_CANAL_REACH) return 0;
  const level = ovesosCanalProfile(groundAt).at(along);
  const target = u < C.half ? level.bed
    : u < C.crestIn ? level.bed + (level.crest - level.bed) * (u - C.half) / (C.crestIn - C.half)
      : u < C.crestOut ? level.crest : level.crest - (u - C.crestOut) * C.slope;
  return Math.max(0, target - groundAt(x, z));
}
/**
 * The world's height over the canal's banks and its carried bed, or null anywhere else: the ground with the bank on
 * it, as Haethom's levee answers `world.heightAt` (src/nethereum-farm.js). Built ground and not terrain.
 */
export function ovesosFarmHeight(x, z, groundAt) {
  const lift = ovesosCanalLift(x, z, groundAt);
  return lift > 1e-4 ? groundAt(x, z) + lift : null;
}

// ---------------------------------------------------------------------------
// The plots
// ---------------------------------------------------------------------------
/** The farming view's bed (src/farming-view.js), across and along, and the spacing between beds in a row. */
export const OVESOS_BED = freeze({ across: 2.8, along: 3.1, pitch: 4.2 });
// [id, farmstead, reach, x, z, yaw, y]: the head across the slope by the first turnout, the middle and the tail along
// the canal's west bank, 5.3 m off its middle; each bed's long side runs with the canal or with its row.
const ROW_SPECS = [
  ['ovesos-head-1', 'velsorten-head', 'head', -1968.6, 550.5, Math.PI / 2, 16.44],
  ['ovesos-head-2', 'velsorten-head', 'head', -1972.8, 550.5, Math.PI / 2, 16.4],
  ['ovesos-head-3', 'velsorten-head', 'head', -1977, 550.5, Math.PI / 2, 16.38],
  ['ovesos-head-4', 'velsorten-head', 'head', -1981.2, 550.5, Math.PI / 2, 16.36],
  ['ovesos-mid-1', 'velsorten-mid', 'mid', -1943.3, 633, .41, 14.24],
  ['ovesos-mid-2', 'velsorten-mid', 'mid', -1941.6, 636.9, .41, 14.04],
  ['ovesos-mid-3', 'velsorten-mid', 'mid', -1939.9, 640.7, .41, 13.84],
  ['ovesos-mid-4', 'velsorten-mid', 'mid', -1938.3, 644.6, .41, 13.64],
  ['ovesos-tail-1', 'velsorten-tail', 'tail', -1930.3, 718.1, -.34, 11.31],
  ['ovesos-tail-2', 'velsorten-tail', 'tail', -1931.6, 721.9, -.37, 11.23],
  ['ovesos-tail-3', 'velsorten-tail', 'tail', -1933.2, 725.8, -.37, 11.15],
  ['ovesos-tail-4', 'velsorten-tail', 'tail', -1934.7, 729.8, -.37, 11.08],
];
const REACH_NAME = freeze({ head: 'the head', mid: 'the middle', tail: 'the tail' });
/** The beds in the farming row shape, for `farming.registerRows`, in seniority order: head, middle, tail. */
export const OVESOS_FARM_ROWS = freeze(ROW_SPECS.map(([id, farmstead, reach, x, z, yaw, y]) => freeze({
  id, name: `Velsorten, ${REACH_NAME[reach]} of the canal, plot ${id.split('-').at(-1)}`, country: OVESOS_COUNTRY, farmstead, reach, x, z, yaw, y })));
export const OVESOS_FARM_ROW_IDS = freeze(OVESOS_FARM_ROWS.map(row => row.id));
export const OVESOS_FARMSTEADS = freeze(['velsorten-head', 'velsorten-mid', 'velsorten-tail']);
/** Where each reach's plots take their water: the turnout in the canal's west bank by its first plot. */
export const OVESOS_TURNOUTS = freeze(OVESOS_FARMSTEADS.map(farmstead => {
  const first = OVESOS_FARM_ROWS.find(row => row.farmstead === farmstead);
  return freeze({ id: `${farmstead}-turnout`, farmstead, along: Math.round(ovesosCanalFrame(first.x, first.z).along * 10) / 10 });
}));
/** Each reach's seed bench, beside its first plot (a bench, and no tub: the water here comes by turns). */
export const OVESOS_SEED_BENCHES = freeze([
  ['velsorten-head', 'Velsorten head seed bench', -1970.7, 546.2],
  ['velsorten-mid', 'Velsorten middle seed bench', -1945, 629.2],
  ['velsorten-tail', 'Velsorten tail seed bench', -1929.2, 715.1],
].map(([farmId, name, x, z]) => freeze({ id: `${farmId}-seed-station`, farmId, name, region: 'Ovesos', x, z })));

// ---------------------------------------------------------------------------
// Buildings and the things that stand about them
// ---------------------------------------------------------------------------
/** Axis-aligned footprints: `w` along x, `d` along z, `h` to the eaves; `door` names the face it opens on. */
export const OVESOS_BUILDINGS = freeze([
  ['velsorten-register', 'The register house', 'register', -1873, 700, 10, 13, 4.2, 'west', 'nisaba'],
  ['velsorten-brewhouse', 'Ninkasi’s brewhouse', 'brewhouse', -1886, 677, 9, 7, 3.4, 'south', 'ninkasi'],
  ['velsorten-mill', 'Ezina’s mill', 'mill', -1911, 684, 7, 9, 4.4, 'east', 'ezina'],
  ['velsorten-fulling-mill', 'Uttu’s fulling mill', 'fulling-mill', -1927.5, 701, 7, 8, 3.8, 'south', 'uttu'],
  ['ziusudra-house', 'Ziusudra’s house', 'great-house', -1997, 551, 13, 9, 3.8, 'east', 'ziusudra'],
  ['ashnan-house', 'Ashnan’s house', 'cottage', -1915, 730, 6.5, 5.5, 2.8, 'west', 'ashnan'],
  ['enbilulu-hut', 'The warden’s hut', 'hut', -1948, 539.5, 5, 4.5, 2.5, 'west', 'enbilulu'],
].map(([id, name, kind, x, z, w, d, h, door, keeper]) => freeze({ id, name, kind, region: 'Ovesos', x, z, w, d, h, door, keeper })));
export const ovesosBuilding = id => OVESOS_BUILDINGS.find(building => building.id === id) ?? null;

/** The water wheels: one in the canal at each mill, its axle across the stream into the mill's wall. */
export const OVESOS_WHEELS = freeze([
  freeze({ id: 'velsorten-mill-wheel', mill: 'velsorten-mill', x: -1918.1, z: 684, radius: 1.45, width: .7, wall: -1914.5 }),
  freeze({ id: 'velsorten-fulling-wheel', mill: 'velsorten-fulling-mill', x: -1918.95, z: 701, radius: 1.3, width: .6, wall: -1924 }),
]);
/** The divider on the bank at the canal's head, and the stone intake below it to the river. */
export const OVESOS_DIVIDER = freeze({ id: 'the-divider', name: 'The Divider', x: -1962, z: 536, width: 4.4, length: 1.6, gates: 3,
  intake: freeze({ from: p(-1962, 522.5), to: p(-1962, 535.2), half: .9 }) });
/** Plank footbridges: where the way crosses below the divider, and from the square to the fulling mill. */
export const OVESOS_BRIDGES = freeze([
  freeze({ id: 'velsorten-head-bridge', along: 5, width: 1.6 }),
  freeze({ id: 'velsorten-mill-bridge', along: 180, width: 1.4 }),
]);
/** The square of beaten earth the village stands round. */
export const OVESOS_SQUARE = freeze({ id: 'velsorten-square', x: -1895, z: 699, minX: -1906, maxX: -1883, minZ: 690, maxZ: 711 });
/** Nisaba's order board (merchants `ovesos-register`), on the square before the register house, its face to the square. */
export const OVESOS_ORDER_BOARD = freeze({ id: 'ovesos-register', name: 'The register board', keeper: 'nisaba', x: -1880.6, z: 696.8, yaw: -Math.PI / 2 });
/** Uttu's tenter frames, cloth stretched to dry on the open ground west of the fulling mill, and her dye vats. */
export const OVESOS_TENTERS = freeze([
  freeze({ id: 'velsorten-tenter-1', x: -1937.5, z: 697, length: 5.5 }),
  freeze({ id: 'velsorten-tenter-2', x: -1941, z: 697, length: 5.5 }),
]);
export const OVESOS_DYE_VATS = freeze({ x: -1930.5, z: 708.3 });
/** Named mailboxes for the three people the design gives a house (docs/design-answers.md, 25 September 2026). */
export const OVESOS_MAILBOXES = freeze([
  freeze({ id: 'ziusudra-mailbox', name: 'Ziusudra', home: 'ziusudra-house', x: -1988.6, z: 546.4, yaw: Math.PI / 2 }),
  freeze({ id: 'ashnan-mailbox', name: 'Ashnan', home: 'ashnan-house', x: -1920.4, z: 734.4, yaw: -Math.PI / 2 }),
  freeze({ id: 'enbilulu-mailbox', name: 'Enbilulu', home: 'enbilulu-hut', x: -1951.4, z: 543, yaw: -Math.PI / 2 }),
]);
/**
 * Lahar's camp on the upland grass: two tents of dark wool, a hearth where the roasted barley is served, a rack of
 * ewe cheeses, a hay rick, and a fold of wattle hurdles with its gate to the south. The flock is out on the grass.
 */
export const OVESOS_CAMP = freeze({ id: 'lahar-camp', name: 'Lahar’s camp', x: -2050, z: 598,
  tents: freeze([freeze({ x: -2057, z: 600.5, yaw: .25 }), freeze({ x: -2046, z: 602.5, yaw: -.3 })]),
  hearth: freeze({ x: -2050.5, z: 595.5, r: .8 }), rack: freeze({ x: -2055.6, z: 594.2 }), rick: freeze({ x: -2062.5, z: 595.5, r: 1.4 }),
  fold: freeze({ x: -2039.5, z: 591, r: 4.2, gate: Math.PI / 2 }) });

/** The places the arc and the people speak of, by the contract's names. */
export const OVESOS_SITES = freeze({
  divider: p(OVESOS_DIVIDER.x, OVESOS_DIVIDER.z),
  canalHead: p(-1962, 527),
  canalTail: OVESOS_CANAL.points.at(-1),
  mill: p(-1911, 684),
  register: p(-1873, 700),
  brewhouse: p(-1886, 677),
  fullingMill: p(-1927.5, 701),
  camp: p(OVESOS_CAMP.x, OVESOS_CAMP.z),
  wardenHut: p(-1948, 539.5),
  square: p(OVESOS_SQUARE.x, OVESOS_SQUARE.z),
});

// ---------------------------------------------------------------------------
// The ways
// ---------------------------------------------------------------------------
/**
 * As `NESDOR_ROADS` are declared: `{ id, width, points }`. The way comes over the Neth at its ford, east across the
 * upland grass past Lahar's camp, round Ziusudra's house to the canal's head, over the canal below the divider, and
 * down its east bank to the square; the tail path goes on from the square to Ashnan's door, and the lane joins the
 * brewhouse and the register house across the square.
 */
export const OVESOS_ROADS = freeze([
  freeze({ id: 'velsorten-way', width: 2.4, points: freeze([p(-2281, 607), p(-2240, 613), p(-2190, 615), p(-2140, 613), p(-2095, 612),
    p(-2066, 614), p(-2036, 610), p(-2018, 590), p(-2008, 566), p(-2007, 544), p(-1992, 541.5), p(-1975, 541), p(-1962, 541),
    p(-1955.2, 543), p(-1955.5, 548), p(-1953.4, 560.7), p(-1949.7, 578.7), p(-1944.8, 598.3), p(-1929.4, 637.8), p(-1918, 666.1),
    p(-1912, 674), p(-1904.6, 678), p(-1904.3, 690), p(-1899, 697)]) }),
  freeze({ id: 'velsorten-tail-path', width: 2, points: freeze([p(-1899, 697), p(-1903, 709), p(-1908, 720), p(-1914, 724.6), p(-1920.5, 725.2), p(-1920.6, 729)]) }),
  freeze({ id: 'velsorten-lane', width: 2.2, points: freeze([p(-1886, 682.2), p(-1888, 689), p(-1893, 697), p(-1880.6, 700)]) }),
]);
/** The same ways for navigation (`world.paths`). */
export const OVESOS_PATHS = OVESOS_ROADS;

// ---------------------------------------------------------------------------
// People and the chart
// ---------------------------------------------------------------------------
/**
 * Where the eight people of design 6.6 stand, by the contract's ids: each more than a metre from any building and
 * four from water, on ground a body stands on. Facing is (sin yaw, cos yaw), as `person()` stands people
 * (src/amod-people.js). King Melos is spoken of and never placed.
 */
export const OVESOS_NPC_STANDS = freeze({
  enbilulu: freeze({ x: -1956.6, z: 537.4, yaw: -Math.PI / 2 }),        // by the divider, facing its gates
  nisaba: freeze({ x: -1881.2, z: 702.4, yaw: -Math.PI / 2 }),            // before the register house, facing the square
  ziusudra: freeze({ x: -1988.2, z: 553.6, yaw: Math.PI / 2 }),         // at his door, looking over the head plots
  ashnan: freeze({ x: -1936.8, z: 734.6, yaw: 2.77 }),                  // past the last tail plot, looking up the canal
  lahar: freeze({ x: -2047.6, z: 593.2, yaw: -.9 }),                    // at his hearth
  ezina: freeze({ x: -1906.2, z: 681, yaw: Math.PI / 2 }),              // at her mill door, toward the way
  ninkasi: freeze({ x: -1882.6, z: 683.6, yaw: -.79 }),                 // by the brewhouse door, toward the square
  uttu: freeze({ x: -1933.6, z: 697.4, yaw: -Math.PI / 2 }),            // at the tenter frames
});
export const OVESOS_PEOPLE_IDS = freeze(Object.keys(OVESOS_NPC_STANDS));

export const OVESOS_FARM_LANDMARKS = freeze([
  freeze({ id: 'velsorten', name: 'Velsorten', x: VELSORTEN.x, z: VELSORTEN.z, radius: 34,
    description: 'The Water Council’s village on the terrace above the Sorten: the register house, Ninkasi’s brewhouse and Ezina’s mill round a square of beaten earth, Uttu’s fulling mill across the canal, and the canal’s plots running up the plain to the river in the order of their water rights.' }),
  freeze({ id: 'velsorten-canal', name: 'The Velsorten canal', x: -1944, z: 618, radius: 40,
    description: 'A channel two paces wide on banks of its own, from the divider on the Lizeem’s bank south over the plain to the village and out to the dry end below it. The oldest rights take their water first, by the river; the newest take what is left, a hundred and fifty metres from it.' }),
  freeze({ id: 'the-divider', name: OVESOS_DIVIDER.name, x: OVESOS_DIVIDER.x, z: OVESOS_DIVIDER.z, radius: 10,
    description: 'A dressed stone across the canal’s head on the Lizeem’s bank, with three timber sluices in it and the canal-warden’s hut beside it. Every turn of water on the canal starts here.' }),
  freeze({ id: 'lahar-camp', name: OVESOS_CAMP.name, x: OVESOS_CAMP.x, z: OVESOS_CAMP.z, radius: 16,
    description: 'The upland herders’ camp: two tents of dark wool, a hearth, a rack of ewe cheeses and a fold of hurdles on the grass above the canal’s head. The herders hold the grass by agreement and have no water right at all.' }),
]);
export const OVESOS_FARM_LANDMARK_IDS = freeze(OVESOS_FARM_LANDMARKS.map(landmark => landmark.id));

// ---------------------------------------------------------------------------
// Ground kept clear
// ---------------------------------------------------------------------------
const segmentDistance = (a, b, x, z) => {
  const dx = b.x - a.x, dz = b.z - a.z, t = clamp01(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1));
  return Math.hypot(x - a.x - t * dx, z - a.z - t * dz);
};
export const distanceToOvesosRoad = (road, x, z) => road.points.slice(1).reduce((best, b, i) => Math.min(best, segmentDistance(road.points[i], b, x, z)), Infinity);
const BOX = freeze({ minX: -2290, maxX: -1860, minZ: 515, maxZ: 760 });
/**
 * Whether incidental scatter (grass, scrub, stones, wild trees) should keep off a point: the buildings, the beds, the
 * benches, the canal and its banks, the intake, the square, the tenters and the camp with `margin` to spare, and the
 * ways within half their width and `margin`. A test and not a list of discs, for the reason `westBareGround` gives.
 */
export function ovesosFarmReserved(x, z, margin = 0) {
  if (x < BOX.minX - margin || x > BOX.maxX + margin || z < BOX.minZ - margin || z > BOX.maxZ + margin) return false;
  if (OVESOS_BUILDINGS.some(b => Math.abs(x - b.x) < b.w / 2 + 1.5 + margin && Math.abs(z - b.z) < b.d / 2 + 1.5 + margin)) return true;
  const bed = Math.max(OVESOS_BED.across, OVESOS_BED.along) / 2 + .6 + margin;
  if (OVESOS_FARM_ROWS.some(row => Math.abs(x - row.x) < bed && Math.abs(z - row.z) < bed)) return true;
  if (OVESOS_SEED_BENCHES.some(bench => Math.abs(x - bench.x) < 1.6 + margin && Math.abs(z - bench.z) < 1.2 + margin)) return true;
  if (x > CANAL_BOX.minX - margin && x < CANAL_BOX.maxX + margin && z > CANAL_BOX.minZ - margin && z < CANAL_BOX.maxZ + margin
    && ovesosCanalFrame(x, z).distance < OVESOS_CANAL_REACH + margin) return true;
  const intake = OVESOS_DIVIDER.intake;
  if (Math.abs(x - intake.from.x) < OVESOS_DIVIDER.width / 2 + 1 + margin && z > intake.from.z - 1 - margin && z < OVESOS_DIVIDER.z + 2 + margin) return true;
  if (x > OVESOS_SQUARE.minX - margin && x < OVESOS_SQUARE.maxX + margin && z > OVESOS_SQUARE.minZ - margin && z < OVESOS_SQUARE.maxZ + margin) return true;
  if (OVESOS_TENTERS.some(t => Math.abs(x - t.x) < 1.2 + margin && Math.abs(z - t.z) < t.length / 2 + 1 + margin)) return true;
  if (Math.hypot(x - OVESOS_DYE_VATS.x, z - OVESOS_DYE_VATS.z) < 2.5 + margin) return true;
  if (Math.hypot(x - OVESOS_CAMP.x, z - OVESOS_CAMP.z) < 17 + margin) return true;
  return OVESOS_ROADS.some(road => distanceToOvesosRoad(road, x, z) < road.width / 2 + margin);
}
