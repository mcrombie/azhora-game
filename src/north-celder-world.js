/**
 * North Celder: terrain, climate and water only (src/north-celder-scenery.js and src/north-celder-wildlife.js carry
 * the grass and the animals). Canerd's level foundations and castle are a separate settlement layer in canerd-world.js.
 * Horse-lord houses, herds, studs and farms remain outside this natural terrain module.
 *
 * **The ground is South Celder's plain, laid on these hexes** (`celderLand`, src/south-celder-world.js): the two
 * countries are one plain to the lore and one function here, so nothing changes at the fourteen hex edges they
 * share. What this country has that South Celder does not is the Mithala's border water: the West Arm down its
 * north-eastern edge and the Celder water down its south-eastern one, eleven and six atlas edges, built by the
 * Mithala as its own (src/west-regions.js). The plain falls to both at 1 in 110 and comes down to their banks a
 * metre above the water; within 13 m of either stream's line the channel and its bank are the Mithala's.
 *
 * **Where Canerd's mound would stand** (`CELDER_MOUND_SITE`, (-2620, -1035)): "somewhere on the plain west of
 * central Celder". This underlying plain stays level; canerd-world.js places the castle directly on it.
 */
import { regionAt, regionAtWithout, hexOwnerAt, REGION_CELLS, REGION_IDS } from './region-world.js';
import { celderLand, celderTint, CELDER_BOX, CELDER_MOUND_SITE } from './south-celder-world.js';

const freeze = Object.freeze, point = (x, z) => freeze({ x, z });
export const NORTH_CELDER = 'North Celder';
export const NORTH_CELDER_CELLS = freeze(REGION_CELLS[NORTH_CELDER] ?? []);
/** The climate, per hex off the World Builder map: `Dfa` on 33 of the 34 hexes and `Dfc` at (-6,90), the
 * north-western corner under Henborth and the East Oremindi. The sky stays the world's default. */
export const NORTH_CELDER_KOPPEN = 'Dfa';
export const NORTH_CELDER_CLIMATE = freeze(Object.fromEntries(NORTH_CELDER_CELLS.map(c => [`${c.q},${c.r}`, c.q === -6 && c.r === 90 ? 'Dfc' : 'Dfa'])));
const inBox = (x, z) => x > CELDER_BOX.minX && x < CELDER_BOX.maxX && z > CELDER_BOX.minZ && z < CELDER_BOX.maxZ;
/** Whether a point is on North Celder's own ground. */
export function northCelderOwns(x, z) { return regionAt(x, z)?.name === NORTH_CELDER; }
/** Where North Celder's scatter may plant: its ground as it was when its delivered composition was reviewed, before
 * Henborth was registered beside it (`regionAtWithout`; tests/fixtures/celder-delivered-identities.json). */
export function northCelderScatterOwns(x, z) { return regionAtWithout(x, z, ['Henborth'])?.name === NORTH_CELDER; }
/** Where the developer's travel tool sets a traveler down. */
export const NORTH_CELDER_ARRIVAL = point(-2500, -1183.5);
const place = (id, name, x, z, radius, description) => freeze({ id, name, region: REGION_IDS[NORTH_CELDER], x, z, radius, description });
/** Places for the chart: natural places only, in plain words. */
export const NORTH_CELDER_LANDMARKS = freeze([
  place('north-celder-west-arm-bank', "The West Arm's Celder bank", -2140, -1185, 35,
    'Terrace grass falling a metre a hundred paces to the West Arm, fast and cold here, over gravel and wadeable.'),
  place('north-celder-celder-water-bank', "The Celder water's bank", -2060, -1110, 35,
    'The plain comes down to the Celder water in a floodplain a metre above the stream and a terrace behind it.'),
  place('north-celder-silt-fans', 'The northern silt fans', -2620, -1220, 45,
    "Two low fans of mountain silt spread across the plain margin from the foothills' foot."),
  place('north-celder-foothills', 'The western foothills', -2745, -1290, 45,
    'Rounded grass hills under the East Oremindi, the first ground the mountains own.'),
  place('north-celder-open-plain', 'The open plain', CELDER_MOUND_SITE.x + 30, CELDER_MOUND_SITE.z - 145, 45,
    'Level grass west of the middle of Celder, with the Oremindi white along the western sky.'),
]);
/** Walked routes kept clear of scenery: open ways the plain gives naturally, not roads. */
export const NORTH_CELDER_TRAILS = freeze([
  freeze({ id: 'north-celder-length', width: 6, points: freeze([point(-2190, -975), point(-2320, -1080), point(-2500, -1183.5), point(-2620, -1300), point(-2700, -1370)]) }),
  freeze({ id: 'north-celder-to-the-arm', width: 5, points: freeze([point(-2500, -1183.5), point(-2330, -1205), point(-2160, -1205)]) }),
]);
/** Review views. */
export const NORTH_CELDER_VIEWS = freeze({
  'north-celder': freeze({ eye: freeze({ x: -2180, z: -1120, y: 62 }), target: freeze({ x: -2560, z: -1200, y: 16 }) }),
  'north-celder-west-arm': freeze({ eye: freeze({ x: -2200, z: -1180, y: 24 }), target: freeze({ x: -2150, z: -1232, y: 13 }) }),
  'north-celder-celder-water': freeze({ eye: freeze({ x: -2110, z: -1120, y: 22 }), target: freeze({ x: -2040, z: -1060, y: 12 }) }),
  'north-celder-foothills': freeze({ eye: freeze({ x: -2560, z: -1180, y: 36 }), target: freeze({ x: -2800, z: -1220, y: 20 }) }),
  'north-celder-shared-line': freeze({ eye: freeze({ x: -2420, z: -1060, y: 30 }), target: freeze({ x: -2560, z: -900, y: 16 }) }),
  // At a walker's height north of the castle, looking west across the plain.
  'north-celder-open-plain': freeze({ eye: freeze({ x: -2560, z: -1180, y: 21 }), target: freeze({ x: -2860, z: -1160, y: 19 }) }),
});
/**
 * The ground. `incoming` is the ground every other layer laid; `before(x, z)` answers the ground without
 * either Celder's layer, for measuring a border seam. Answers `incoming` off North Celder's own hexes.
 */
export function northCelderGround(x, z, incoming, before) {
  if (!inBox(x, z) || hexOwnerAt(x, z) !== NORTH_CELDER) return incoming;
  return celderLand(x, z, incoming, before);
}
/** The colour of the ground on North Celder's own hexes, as 0xRRGGBB, or null for "no opinion here". */
export function northCelderTint(x, z, ground = null) {
  if (!inBox(x, z) || hexOwnerAt(x, z) !== NORTH_CELDER) return null;
  return celderTint(x, z, ground);
}
