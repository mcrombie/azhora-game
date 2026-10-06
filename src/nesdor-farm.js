/**
 * **Nesdor for the Farmlands of the Lizeem** (docs/lizeem-farmlands-design.md 5.3, 6.5 and the appendix's
 * "Places for people"; the user's design of 5 October 2026, and on 6 October 2026, "keep building
 * everything"): Baugi's farm Ninehands on the western Flats, its strips, Idunn's hazel wood at the
 * valley head, the Counted Water and Forseti's house where the Nesdor Way ends against the army's
 * rope line, Beyla's hives and Byggvir's malt-house by the farm, the Way itself, and the Carica ford
 * marked as the way in from Caricas.
 *
 * Coordinates only: no terrain, world or renderer dependency (src/nesdor-farm-scenery.js draws them).
 * +x is east and +z is south. Every place was read off the built ground and is pinned by
 * tests/nesdor-farm.test.js, which measures it on a scoped world.
 *
 * **The strips.** The Flats are what the lore says they are, "relief measured in feet": the farm's
 * ground is a table at 7.6 m that falls toward the Flats Beck's braids in the south-east by a few
 * decimetres, and the braids themselves are trenches a metre and a half below it. So the three
 * strips lie across that fall, along the contour and each lower than the last toward the braids: the
 * rise (7.6 m) by the yard, the drained bench (7.5 m) below it, and the wet strip (7.3 m) ten metres
 * from the braid's bank. The fourth, longer strip lies on bench ground to the west, and is the
 * farm's to lend at Farming 24. Beds are the farming view's 2.8 by 3.1 m, laid end to end along each
 * strip with their long side down it (yaw a quarter turn), all nine of Ninehands within 32 m of their
 * middle so that the Work of Nine's 40 m reaches every one.
 *
 * Getting here: the Ela-south (src/elagos-world.js) runs forty metres wide and deep across the north
 * of the Flats, so the valley head and the farm meet only on the strip of dry ground west of where it
 * ends. The Way from the Carica ford comes down the valley head, round the Ela-south's end, and wades
 * the Ela-South Reach into the farmyard; from the yard it wades the beck's braids and runs east
 * across the Flats to the inn.
 */
const freeze = Object.freeze;
const p = (x, z) => freeze({ x, z });

export const NESDOR_COUNTRY = 'nesdor';
export const NINEHANDS = freeze({ id: 'ninehands', name: 'Ninehands', region: 'Nesdor', x: -1595, z: 585 });

// ---------------------------------------------------------------------------
// The strips
// ---------------------------------------------------------------------------
/** The farming view's bed (src/farming-view.js), across and along, and the spacing along a strip. */
export const NESDOR_BED = freeze({ across: 2.8, along: 3.1, pitch: 4.2, yaw: Math.PI / 2 });
/** How far past its end beds a strip's marker posts stand. */
const MARKER_GAP = .9;
// [strip id, ground, farmstead, beds, centre x, centre z, name]; strips run west to east.
const STRIP_SPECS = [
  ['nesdor-wet', 'wet', 'ninehands', 3, -1583, 660, 'the wet strip'],
  ['nesdor-bench', 'bench', 'ninehands', 3, -1589, 632, 'the bench strip'],
  ['nesdor-rise', 'rise', 'ninehands', 3, -1595, 602, 'the rise strip'],
  ['nesdor-long', 'bench', 'ninehands-long', 6, -1618, 646, 'the long strip'],
];
export const NESDOR_STRIPS = freeze(STRIP_SPECS.map(([id, ground, farmstead, count, x, z, name]) => {
  const reach = NESDOR_BED.pitch * (count - 1) / 2 + NESDOR_BED.along / 2 + MARKER_GAP;
  const beds = Array.from({ length: count }, (_, n) => freeze({ id: `${id}-${n + 1}`, name: `Ninehands, ${name}, bed ${n + 1}`,
    country: NESDOR_COUNTRY, farmstead, x: x + (n - (count - 1) / 2) * NESDOR_BED.pitch, z, yaw: NESDOR_BED.yaw, ground, strip: id }));
  return freeze({ id, name, ground, farmstead, x, z, beds: freeze(beds.map(bed => bed.id)), rows: freeze(beds),
    start: p(x - reach, z), end: p(x + reach, z) });
}));
/** The beds in the farming row shape, for `farming.registerRows`: wet, bench, rise, then the long strip. */
export const NESDOR_FARM_ROWS = freeze(NESDOR_STRIPS.flatMap(strip => strip.rows));
export const NESDOR_FARM_ROW_IDS = freeze(NESDOR_FARM_ROWS.map(row => row.id));
export const nesdorStrip = id => NESDOR_STRIPS.find(strip => strip.id === id) ?? null;

// ---------------------------------------------------------------------------
// The hazel wood
// ---------------------------------------------------------------------------
/**
 * Idunn's coppice: six hazel stools cut to the ground and grown again, two short rows of three in the
 * clearing among the valley head's own hazel and oak (src/west-regions-scenery.js), each at least four
 * metres from any of those. In the shape of the farming `trees` table (`farming.registerTrees`, as
 * Applegarth's apples): picked for hazelnuts at Farming 12, bearing again ten minutes later.
 */
export const NESDOR_HAZEL_ITEM = 'hazelnuts';
export const NESDOR_HAZEL_TREES = freeze([[-1527.5, 386], [-1522.5, 385.5], [-1517.5, 386.5], [-1529, 392.5], [-1524, 392], [-1519, 392.5]]
  .map(([x, z], index) => freeze({ id: `nesdor-hazel-${index + 1}`, name: 'A hazel coppice stool', x, z,
    item: NESDOR_HAZEL_ITEM, xp: 18, regrow: 600, level: 12, country: NESDOR_COUNTRY })));
export const NESDOR_HAZEL_TREE_IDS = freeze(NESDOR_HAZEL_TREES.map(tree => tree.id));
export const NESDOR_HAZEL_WOOD = freeze({ id: 'nesdor-hazel-wood', name: 'The Hazel Wood', region: 'Nesdor', x: -1523, z: 392 });

// ---------------------------------------------------------------------------
// Buildings and the things that stand about them
// ---------------------------------------------------------------------------
/** Axis-aligned footprints: `w` along x, `d` along z, `h` to the eaves; `door` names the face it opens on. */
export const NESDOR_BUILDINGS = freeze([
  ['ninehands-house', 'Ninehands', 'farmhouse', -1613, 581, 13, 8, 3.4, 'south', 'baugi'],
  ['ninehands-barn', 'The Ninehands barn', 'barn', -1580, 578, 9, 13, 4.4, 'west', 'baugi'],
  ['nesdor-malt-house', 'Byggvir’s malt-house', 'malt-house', -1596, 562, 10, 7, 3.2, 'south', 'byggvir'],
  ['idunn-house', 'Idunn’s house', 'cottage', -1534, 416, 8, 7, 3, 'west', 'idunn'],
  ['counted-water', 'The Counted Water', 'inn', -1420, 588, 14, 10, 5.6, 'south', 'aegir'],
  ['forseti-house', 'Forseti’s house', 'house', -1419, 614, 9, 8, 3.6, 'north', 'forseti'],
].map(([id, name, kind, x, z, w, d, h, door, keeper]) => freeze({ id, name, kind, region: 'Nesdor', x, z, w, d, h, door, keeper })));
export const nesdorBuilding = id => NESDOR_BUILDINGS.find(building => building.id === id) ?? null;

/** Ninehands' seed bench and water tub, beside the track from the yard to the strips. */
export const NESDOR_SEED_BENCH = freeze({ id: 'ninehands-seed-station', farmId: 'ninehands', name: 'Ninehands seed bench', region: 'Nesdor', x: -1598, z: 594.5 });
/** Beyla's skeps: four on a bench under a lean-to, south of the long house, facing the strips. */
export const NESDOR_HIVES = freeze({ id: 'beyla-hives', name: 'Beyla’s hives', x: -1617, z: 595, length: 6.8, skeps: 4 });
/** The inn yard, between the Counted Water and the rope line: a table and bench, barrels, a trough. */
export const NESDOR_INN_YARD = freeze({ id: 'counted-water-yard', x: -1405.5, z: 589, minX: -1412, maxX: -1399, minZ: 582, maxZ: 597,
  table: p(-1406, 586), bench: p(-1406, 584.6), trough: p(-1400.9, 592.5), barrels: p(-1411.6, 584.6), sign: p(-1413.4, 597.6) });
/** Forseti's order board (merchants `nesdor-way`), by the road at his door, its face to the road. */
export const NESDOR_ORDER_BOARD = freeze({ id: 'nesdor-way', name: 'The Way board', keeper: 'forseti', x: -1408.5, z: 606.3, yaw: Math.PI });
/** His writing desk, under an awning on the east wall of his house; he writes facing the road's end. */
export const NESDOR_WRITING_DESK = freeze({ id: 'forseti-desk', x: -1412.6, z: 614.4, yaw: Math.PI / 2 });
/** Named mailboxes for the three people the user's design gives a house (docs/design-answers.md, 25 September 2026). */
export const NESDOR_MAILBOXES = freeze([
  freeze({ id: 'baugi-mailbox', name: 'Baugi', home: 'ninehands-house', x: -1608.5, z: 588.5, yaw: Math.PI / 2 }),
  freeze({ id: 'idunn-mailbox', name: 'Idunn', home: 'idunn-house', x: -1542.6, z: 412.4, yaw: -Math.PI / 2 }),
  freeze({ id: 'forseti-mailbox', name: 'Forseti', home: 'forseti-house', x: -1422.9, z: 606.8, yaw: Math.PI }),
]);
/** The upper Carica, where it is waded over gravel (`CARICA.fordUntil`), and the post on the Nesdor bank. */
export const NESDOR_CARICA_FORD = freeze({ id: 'carica-ford', name: 'The Carica Ford', region: 'Nesdor', x: -1615, z: 334,
  crossing: p(-1619, 329), post: p(-1612.3, 336.2) });
/** Idunn's work about her house: the charcoal clamp, the cut poles and the locked ash box. */
export const NESDOR_HAZEL_WORKS = freeze({ clamp: freeze({ x: -1526.5, z: 425.5, r: 1.6 }), poles: freeze({ x: -1525.8, z: 412.5 }),
  box: freeze({ x: -1538.7, z: 418.6 }) });

// ---------------------------------------------------------------------------
// The Way and the farm roads
// ---------------------------------------------------------------------------
/**
 * As `CARICAS_ROADS` are declared: `{ id, width, points }`. The Way leaves the main road's end at the
 * army's rope line (`FRONTIER.barrierX`, -1396.4), which stops a walker, so on foot it begins at the
 * inn; it fords the beck's braids, crosses the yard at Ninehands, and goes on as a farm road that
 * wades the Ela-South Reach, rounds the Ela-south's end, and climbs the valley head to the ford.
 */
export const NESDOR_ROADS = freeze([
  freeze({ id: 'nesdor-way', width: 4, points: freeze([p(-1378.6, 602.2), p(-1430, 602), p(-1470, 603), p(-1505, 604), p(-1530, 603),
    p(-1562, 598), p(-1576, 593), p(-1590, 588), p(-1598, 579)]) }),
  freeze({ id: 'nesdor-carica-road', width: 3, points: freeze([p(-1598, 579), p(-1604, 572), p(-1613, 567), p(-1624, 558), p(-1637, 553),
    p(-1650, 548), p(-1657, 532), p(-1660, 505), p(-1658, 480), p(-1640, 455), p(-1610, 436), p(-1612, 424), p(-1609.5, 414),
    p(-1606, 406), p(-1602, 396), p(-1604, 386), p(-1604, 372), p(-1602, 358), p(-1609, 348), p(-1615, 334)]) }),
  freeze({ id: 'nesdor-hazel-lane', width: 2.4, points: freeze([p(-1610, 432), p(-1585, 430), p(-1560, 428), p(-1548, 425), p(-1542, 417)]) }),
  freeze({ id: 'ninehands-track', width: 2.2, points: freeze([p(-1597, 588), p(-1604.5, 598), p(-1605, 615), p(-1599, 640), p(-1592.5, 662)]) }),
]);
/**
 * The same roads for navigation (`world.paths`). Drawn, the Way meets the main road's end; walked, the
 * rope is between them, so here it begins on the inn's side, further than src/autopilot.js's seven-metre
 * `JOIN` from any main-road vertex, and no route is planned through the line.
 */
export const NESDOR_PATHS = freeze(NESDOR_ROADS.map(road => (road.id !== 'nesdor-way' ? road
  : freeze({ ...road, points: freeze([p(-1400, 602), ...road.points.filter(point => point.x < -1400)]) }))));

// ---------------------------------------------------------------------------
// People and the chart
// ---------------------------------------------------------------------------
/**
 * Where the eight people of design 6.5 stand, by the people ids of the contract (`baugi`, ...): each
 * more than a metre from any building and four from water, on ground a body stands on. Facing is
 * (sin yaw, cos yaw), as `person()` stands people (src/amod-people.js).
 */
export const NESDOR_NPC_STANDS = freeze({
  baugi: freeze({ x: -1594, z: 587, yaw: Math.atan2(1, .35) }),            // in his yard, toward the Way coming in
  bolverk: freeze({ x: -1580.5, z: 634.2, yaw: -Math.PI / 2 }),            // past the bench strip's east end, looking down it
  idunn: freeze({ x: -1524, z: 397.5, yaw: Math.PI }),                     // at the coppice, facing her stools
  aegir: freeze({ x: -1405, z: 591, yaw: 0 }),                             // in the inn yard, toward the road
  forseti: freeze({ x: -1410.2, z: 610.2, yaw: Math.PI }),                 // by his desk and his board
  egil: freeze({ x: -1486, z: 617, yaw: -Math.PI / 2 }),                   // on the open Flats among the cattle
  beyla: freeze({ x: -1612, z: 598.5, yaw: Math.atan2(-1, -.7) }),         // by the skeps
  byggvir: freeze({ x: -1588.2, z: 562, yaw: -Math.PI / 2 }),              // at the malt-house's kiln end
});
export const NESDOR_PEOPLE_IDS = freeze(Object.keys(NESDOR_NPC_STANDS));

export const NESDOR_FARM_LANDMARKS = freeze([
  freeze({ id: 'ninehands', name: 'Ninehands', x: NINEHANDS.x, z: NINEHANDS.z, radius: 36,
    description: 'Baugi’s farm on the western Flats: a long house, a barn and a malt-house round a yard, and three long strips laid down the fall of the ground toward the braids, wet, bench and rise.' }),
  freeze({ id: 'nesdor-hazel-wood', name: NESDOR_HAZEL_WOOD.name, x: NESDOR_HAZEL_WOOD.x, z: NESDOR_HAZEL_WOOD.z, radius: 22,
    description: 'Idunn’s coppice at the valley head: hazel cut back to the stool and grown again in straight poles, with her house and her charcoal clamp at the edge of it.' }),
  freeze({ id: 'counted-water', name: 'The Counted Water', x: -1420, z: 588, radius: 18,
    description: 'The inn where the Nesdor Way ends against the army’s rope line, and the arbiter’s house across the road from it.' }),
  freeze({ id: 'carica-ford', name: NESDOR_CARICA_FORD.name, x: NESDOR_CARICA_FORD.x, z: NESDOR_CARICA_FORD.z, radius: 10,
    description: 'The upper Carica, shallow over gravel: the way into Nesdor from Caricas, marked by a post on the Nesdor bank.' }),
]);
export const NESDOR_FARM_LANDMARK_IDS = freeze(NESDOR_FARM_LANDMARKS.map(landmark => landmark.id));

// ---------------------------------------------------------------------------
// Ground kept clear
// ---------------------------------------------------------------------------
const segmentDistance = (a, b, x, z) => {
  const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - a.x - t * dx, z - a.z - t * dz);
};
export const distanceToNesdorRoad = (road, x, z) => road.points.slice(1).reduce((best, b, i) => Math.min(best, segmentDistance(road.points[i], b, x, z)), Infinity);
const BOX = freeze({ minX: -1665, maxX: -1375, minZ: 328, maxZ: 670 });
/**
 * Whether incidental scatter (tufts, stones, wild trees) should keep off a point: the buildings, the
 * beds and the yards with `margin` to spare, and the roads within half their width and `margin`.
 */
export function nesdorFarmReserved(x, z, margin = 0) {
  if (x < BOX.minX - margin || x > BOX.maxX + margin || z < BOX.minZ - margin || z > BOX.maxZ + margin) return false;
  if (NESDOR_BUILDINGS.some(b => Math.abs(x - b.x) < b.w / 2 + 1 + margin && Math.abs(z - b.z) < b.d / 2 + 1 + margin)) return true;
  if (NESDOR_FARM_ROWS.some(row => Math.abs(x - row.x) < NESDOR_BED.along / 2 + .4 + margin && Math.abs(z - row.z) < NESDOR_BED.across / 2 + .4 + margin)) return true;
  if (x > NESDOR_INN_YARD.minX - margin && x < NESDOR_INN_YARD.maxX + margin && z > NESDOR_INN_YARD.minZ - margin && z < NESDOR_INN_YARD.maxZ + margin) return true;
  if (Math.abs(x - NESDOR_HIVES.x) < NESDOR_HIVES.length / 2 + 1 + margin && Math.abs(z - NESDOR_HIVES.z) < 1.6 + margin) return true;
  return NESDOR_ROADS.some(road => distanceToNesdorRoad(road, x, z) < road.width / 2 + margin);
}
