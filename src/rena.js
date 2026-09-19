/**
 * The three Renas: the razed town at the centre of Drent, the village west of
 * it, and the old road that still joins them.
 *
 * Eighty years ago the principal town of the region was **Rena**, in the forest
 * at Drent's centre. It was burned to the ground after a battle and never
 * rebuilt. The village east of it was **East Rena** — Eastreena in Drentish
 * mouths — and is Tidehaven now. The village west of it was **West Rena**,
 * *Westerina*, and calls itself **Applegarth**. Nobody under seventy uses
 * either old name, and two people who were children that day still use both.
 *
 * Pure: no three, no DOM. `src/rena-works.js` renders what is described here;
 * `src/rena-people.js` puts people on these stands; the charts, the tests and
 * the letters quest read the same numbers.
 *
 * Like Pueth and Peblos, and unlike the four oldest places in the tree, this
 * ground is authored directly in **world metres** (100 m per hex). None of it
 * existed in the 56 m frame, and `world-scale.js`'s Tidehaven cluster would
 * capture a 56 m literal anywhere near the village and pin it. If the world
 * scale changes again, everything here needs a cluster of its own in the new
 * frame — see the head of `src/pueth-world.js`, which has the same problem.
 */
import { MAIN_ROAD, AVREL_CLEARING, CALOSS_GATE, villageToWorld, regionNameAt } from './region-world.js';
import { roadFrame } from './wayside.js';

const point = (x, z) => Object.freeze({ x, z });
const unit = (dx, dz) => { const length = Math.hypot(dx, dz) || 1; return point(dx / length, dz / length); };

// ---------------------------------------------------------------------------
// The two places, and the frame each one is laid out in
// ---------------------------------------------------------------------------
/**
 * The ruins of Rena, in the forest north of the modern road at Drent's centre,
 * and Applegarth, the orchard village west of them. Both are laid out in their
 * own frame: `a` metres along the old road toward the west, `b` metres across
 * it, positive to the north. The old road ran straight between the two, and
 * still does where the wood has not taken it.
 */
export const RENA = Object.freeze({ id: 'rena', name: 'The Ruins of Rena', oldName: 'Rena', centre: point(-395, -70), radius: 62 });
export const APPLEGARTH = Object.freeze({ id: 'applegarth', name: 'Applegarth', oldName: 'Westerina', centre: point(-568, -32), radius: 44 });

/** West along the old street; the ruins and the village share it, because the road did. */
export const OLD_ROAD_WEST = unit(APPLEGARTH.centre.x - RENA.centre.x, APPLEGARTH.centre.z - RENA.centre.z);
/** Across the old street, positive to the north side (world -Z is north). */
export const OLD_ROAD_ACROSS = point(-OLD_ROAD_WEST.z, OLD_ROAD_WEST.x);
export const OLD_ROAD_YAW = Math.atan2(OLD_ROAD_WEST.x, OLD_ROAD_WEST.z);

const framePoint = (origin, a, b) => point(
  origin.x + OLD_ROAD_WEST.x * a + OLD_ROAD_ACROSS.x * b,
  origin.z + OLD_ROAD_WEST.z * a + OLD_ROAD_ACROSS.z * b);
/** A point in the ruins' own frame: `a` west along the old street, `b` north across it. */
export const renaPoint = (a, b) => framePoint(RENA.centre, a, b);
/** A point in Applegarth's frame, the same way. */
export const applePoint = (a, b) => framePoint(APPLEGARTH.centre, a, b);

// ---------------------------------------------------------------------------
// The old road: off the modern road, through the ruins, on to Applegarth
// ---------------------------------------------------------------------------
/**
 * The fork, 186 m along the main road past the Caloss Gate: past the timber
 * landing, short of the Avrel clearing, and 360 m out from Tidehaven's landing,
 * so nothing of the rigid village ground is touched and no wayside place is
 * crowded.
 */
export const RENA_JUNCTION = (() => { const frame = roadFrame(MAIN_ROAD, CALOSS_GATE, 186, 0); return point(frame.x, frame.z); })();

/** The ruins' gates: the burnt east gate the old road comes in by, and the west gate it leaves by. */
export const RENA_EAST_GATE = renaPoint(-34, 0);
export const RENA_WEST_GATE = renaPoint(34, 0);
/** Applegarth's ends: the old road comes in from the ruins and gives out in the wood beyond the village. */
export const APPLEGARTH_EAST = applePoint(-30, 0);
export const APPLEGARTH_WEST = applePoint(30, 0);

/**
 * The old road, as a walkable path. It leaves the main road due north, runs
 * down through the ruins' own street, and goes west to Applegarth. Beyond the
 * village it is lost: the last stretch is a lane into the trees and stops.
 */
export const RENA_ROAD = Object.freeze([
  RENA_JUNCTION,
  point(-357, -4), point(-351, -40), point(-347, -66),
  // The last of the approach lies on the old street's own line, so the road runs straight in between the gate piers.
  renaPoint(-50, 0), RENA_EAST_GATE, renaPoint(-10, 0), renaPoint(12, 0), RENA_WEST_GATE,
  point(-460, -56), point(-500, -47), point(-534, -39),
  APPLEGARTH_EAST, applePoint(0, 0), APPLEGARTH_WEST,
  point(-604, -25),
]);

// ---------------------------------------------------------------------------
// The ruins of Rena
// ---------------------------------------------------------------------------
/**
 * What is left of a town that was killed rather than one that faded: the street
 * lines under the grass, the burnt gate, the stump of the hall, the well, the
 * bound stone, the orchard gone wild, and the row of markers over the dead.
 *
 * Every measure is in the ruins' own frame (`renaPoint`). The old street runs
 * the length of it at b = 0 and is 8 m wide; the house plots stand back from it
 * on both sides, their footings one or two courses high.
 */
export const RENA_RUINS = Object.freeze({
  street: Object.freeze({ from: -36, to: 36, half: 4 }),
  /** The burnt gate: two posts of dressed stone, one standing, one down, and the lintel in the grass. */
  gate: Object.freeze({
    standing: renaPoint(-34, 4.4), fallen: renaPoint(-34, -4.4),
    lintel: renaPoint(-29, -6.2), width: 1.5, height: 3.6,
  }),
  /**
   * The house plots: `a` along the street, `b` across, `w` by `d` metres of
   * footing, `h` the height of what is left. The town burned from the gate
   * west, so the plots nearest the gate are lowest.
   */
  plots: Object.freeze([
    ['plot-1', -26, 9.5, 8.5, 6.5, 1.0], ['plot-2', -26, -9.5, 7.5, 6.0, 0.55],
    ['plot-3', -15, 10.5, 9.0, 7.0, 1.7], ['plot-4', -14, -10.0, 8.0, 6.5, 1.3],
    ['plot-5', -2, 11.0, 7.0, 6.0, 2.1], ['plot-6', -3, -10.5, 8.5, 7.0, 1.9],
    ['plot-7', 10, 10.0, 8.0, 6.5, 2.4], ['plot-8', 9, -11.0, 9.5, 7.0, 2.2],
    ['plot-9', 22, 9.0, 7.0, 5.5, 1.6], ['plot-10', 21, -9.5, 7.5, 6.0, 1.4],
    ['plot-11', 31, -10.5, 6.5, 5.5, 0.65],
  ].map(([id, a, b, w, d, h]) => Object.freeze({ id, a, b, ...renaPoint(a, b), width: w, depth: d, height: h }))),
  /** The stump of the hall: three courses of a great room, the hearth still in the floor, the roof in the nettles. */
  hall: Object.freeze({ ...renaPoint(4, 22), a: 4, b: 22, width: 16, depth: 11, height: 3.0,
    hearth: renaPoint(4, 20.5), fallen: Object.freeze([renaPoint(-2, 27), renaPoint(3, 29), renaPoint(9, 27.5)]) }),
  /** The market place: the street widens here, and the well at the north side of it still holds water. */
  well: Object.freeze({ ...renaPoint(-7, 5.5), radius: 1.5, waterDepth: 1.1 }),
  /**
   * The bound stone on the approach, read by a traveler walking up the old road
   * from the south: Rena ahead of it, East Rena behind. It is the oldest sign in
   * Drent and nobody has repainted it.
   */
  boundStone: Object.freeze({ ...renaPoint(-38, 6), facing: OLD_ROAD_YAW + Math.PI, faces: Object.freeze(['Rena', 'East Rena']) }),
  /** The market cross, broken off at the knee. */
  cross: Object.freeze({ ...renaPoint(-6, -6) }),
  /** The orchard the town kept, eighty years untended: rough rows gone to thicket, west of the graves. */
  orchard: Object.freeze(Array.from({ length: 22 }, (_, i) => {
    const row = Math.floor(i / 6), column = i % 6;
    return Object.freeze(renaPoint(24 + column * 6.4 + (row % 2) * 2.2, -20 - row * 7.2 - (column % 2) * 1.1));
  })),
  /** The row of markers over the people who were not carried out: low stones behind the south bank. */
  graves: Object.freeze(Array.from({ length: 16 }, (_, i) => Object.freeze(renaPoint(-26 + i * 2.4, -26 - (i % 3) * 0.5)))),
  /** The bank and ditch the graves were dug behind. */
  graveBank: Object.freeze([renaPoint(-31, -22), renaPoint(15, -22)]),
});

// ---------------------------------------------------------------------------
// Applegarth, the village that was West Rena
// ---------------------------------------------------------------------------
/** Ten roofs in Drent's manner along the old road, with the orchards south of them. */
export const APPLEGARTH_BUILDINGS = Object.freeze([
  ['ardry-cottage', -7, 11.5, 7.0, 5.6, 2.7, '#6f7a70', '#d8c9a4'],
  ['press-house', 7, -12.5, 9.5, 6.4, 3.1, '#8a7a58', '#c9bb98'],
  ['apple-loft', 18, -11.0, 7.5, 5.8, 3.2, '#6f7a70', '#cfc0a0'],
  ['house-1', -19, -11.0, 6.4, 5.2, 2.7, '#6b766d', '#d3c4a1'],
  ['house-2', -17, 12.0, 6.0, 5.0, 2.6, '#727d73', '#cec09e'],
  ['house-3', 3, 12.5, 6.6, 5.4, 2.8, '#6a756c', '#d6c7a3'],
  ['house-4', 21, 11.0, 6.2, 5.2, 2.7, '#707b71', '#d0c1a0'],
  ['house-5', 31, -10.0, 6.0, 5.0, 2.6, '#6d786f', '#d4c5a2'],
  ['byre', -27, 9.0, 8.0, 5.4, 2.3, '#a08a5c', '#9a9888'],
  ['store', 30, 12.0, 6.8, 5.2, 2.7, '#a08a5c', '#cbbd9a'],
].map(([id, a, b, width, depth, height, roof, wall]) => Object.freeze({ id, a, b, ...applePoint(a, b), width, depth, height, roof, wall })));

/** The village's working ground: the well, the racks the apples dry on, the press yard and the pound. */
export const APPLEGARTH_WORKS = Object.freeze({
  well: applePoint(-2, 4.2),
  racks: Object.freeze([applePoint(11, -5.5), applePoint(15, -4.5)]),
  barrels: Object.freeze([applePoint(3, -7.5), applePoint(5, -6.2), applePoint(4.4, -9)]),
  pound: Object.freeze([applePoint(-30, -9), applePoint(-30, -19), applePoint(-19, -19), applePoint(-19, -9)]),
  /** The bound stone at the village's east end, still naming it Westerina, which nobody has recut. */
  boundStone: Object.freeze({ ...applePoint(-33, -5), facing: OLD_ROAD_YAW + Math.PI, faces: Object.freeze(['Westerina', 'Rena']) }),
  /** The place board at the same end, which says what the village calls itself now. */
  placeBoard: Object.freeze({ ...applePoint(-33, 7), facing: OLD_ROAD_YAW + Math.PI, label: 'Applegarth' }),
  /** The orchard: twenty-eight trees in rows south of the road, kept, unlike Rena's. */
  orchard: Object.freeze(Array.from({ length: 28 }, (_, i) => {
    const row = Math.floor(i / 7), column = i % 7;
    return Object.freeze(applePoint(-22 + column * 7.4, -26 - row * 6.8));
  })),
  /** The hurdle fence round the orchard, corner to corner. */
  orchardFence: Object.freeze([applePoint(-27, -22), applePoint(28, -22), applePoint(28, -49), applePoint(-27, -49)]),
});

// ---------------------------------------------------------------------------
// The people: where they stand
// ---------------------------------------------------------------------------
/**
 * Where the new people of this pass stand, in world metres. Lorn is in
 * Tidehaven, on the shingle west of the landing, between the harbourmaster and
 * the fisher and well clear of both; his sister is in Applegarth, by her own
 * door. The rest are Applegarth's, Tidehaven's and the Greenway's.
 */
export const RENA_STANDS = Object.freeze({
  // Tidehaven, in the carried-over village's own frame: nothing here moves an
  // existing stand, nothing stands within reach of an army post, and nothing
  // sits inside a bird's home ground (src/drent-birds.js, BIRD_HABITATS), which
  // would take its perches away.
  'rena-lorn': Object.freeze({ ...villageToWorld(-2, 26), yaw: -2.36 }),        // on the shingle, facing up the beach
  'tide-carter': Object.freeze({ ...villageToWorld(4, 4), yaw: -1.1 }),
  'tide-boy': Object.freeze({ ...villageToWorld(1, 8), yaw: 2.2 }),
  'greenway-forager': Object.freeze({ ...villageToWorld(6, -46), yaw: -1.9 }),
  // Applegarth.
  'rena-hesta': Object.freeze({ ...applePoint(-7, 6), yaw: OLD_ROAD_YAW - Math.PI / 2 }),
  'apple-reeve': Object.freeze({ ...applePoint(2, 2.4), yaw: OLD_ROAD_YAW + Math.PI }),
  'apple-cider': Object.freeze({ ...applePoint(6, -7.6), yaw: OLD_ROAD_YAW + Math.PI / 2 }),
  'apple-cooper': Object.freeze({ ...applePoint(17, -6.4), yaw: OLD_ROAD_YAW + Math.PI / 2 }),
  'apple-carter': Object.freeze({ ...applePoint(-22, -4.5), yaw: OLD_ROAD_YAW + Math.PI / 2 }),
  'apple-young': Object.freeze({ ...applePoint(-26, 4.5), yaw: OLD_ROAD_YAW + Math.PI }),
});

export const RENA_NPC_POSITIONS = Object.freeze(Object.fromEntries(
  Object.entries(RENA_STANDS).map(([id, stand]) => [id, point(stand.x, stand.z)])));

/** The two who remember, and where each of them is. Nothing else in the tree hard-codes their stands. */
export const LORN = Object.freeze({ id: 'rena-lorn', name: 'Lorn Ardry', place: 'Tidehaven' });
export const HESTA = Object.freeze({ id: 'rena-hesta', name: 'Hesta Ardry', place: 'Applegarth' });

// ---------------------------------------------------------------------------
// Small places elsewhere in Drent, on the road that already runs there
// ---------------------------------------------------------------------------
const avrelRoad = (arc, offset) => roadFrame(MAIN_ROAD, AVREL_CLEARING, arc, offset);
const wayside = (id, name, frame, radius, description) => Object.freeze({ id, name, x: frame.x, z: frame.z, radius, description, frame });

/**
 * The stretch of road between the Avrel clearing and the Caloss bank had
 * nothing on it. All three of these are Rena's: the lane its cattle came up,
 * the house its lord took a toll in, and the stone its pedlars paid at. Drent
 * is level 0; nothing here attacks.
 */
export const DRENT_DEEP_PLACES = Object.freeze([
  wayside('drove-lane', 'The Sunken Lane', avrelRoad(56, -19), 11,
    'A green lane cut a chest deep into the ground between two hedge banks, crossing the road and going nowhere now. Drent’s cattle wore it down walking to a market that stopped eighty years ago.'),
  wayside('rena-tollhouse', 'The Toll House', avrelRoad(112, 21), 10,
    'A roofless stone box with a counter window and a chimney, at the head of a stream crossing. The lord of Rena took a toll here on everything going down to the Caloss, and the lords of Drent have argued about tolls ever since.'),
  wayside('pedlars-stone', 'The Pedlar’s Stone', avrelRoad(158, -13), 6,
    'A waist-high stone with a hollow worn in its crown, where pedlars left a copper for the road and picked one up if they needed it. There are three coppers in it, green with age, and nobody has taken them.'),
]);

/**
 * The bound of East Rena: a leaning stone in the fern beside the Greenway, west
 * of Fernway Rest, cut with the village's old name. It is the one place in the
 * game that says so in stone.
 */
export const EAST_RENA_STONE = Object.freeze({
  id: 'east-rena-stone', name: 'The East Rena Stone', ...point(-157.1, 18.8), radius: 5,
  // Its front looks east, back down the road at Tidehaven, so the traveler leaving the village reads it.
  facing: Math.PI / 2, faces: Object.freeze(['East Rena', 'Rena']),
  description: 'A boundary stone leaning back into the fern, sunk to its shoulders. EAST RENA is cut in it, the letters shallow with weather. Tidehaven was East Rena while there was a Rena to be east of, and only the very old still say it that way.',
});

// ---------------------------------------------------------------------------
// Landmarks, clearings and signs
// ---------------------------------------------------------------------------
export const RENA_LANDMARKS = Object.freeze([
  Object.freeze({ id: 'rena-ruins', name: RENA.name, ...RENA.centre, radius: 46,
    description: 'Street lines under the grass, footings a course or two high, a burnt gate and the stump of a hall: the principal town of Drent, burned after a battle eighty years ago and never built again. Nothing fell down here. It was pulled down.' }),
  Object.freeze({ id: 'rena-well', name: 'The Well at Rena', ...RENA_RUINS.well, radius: 6,
    description: 'The well in the middle of the old market place, its coping whole and its water clean and cold. It is the only thing in Rena that still works.' }),
  Object.freeze({ id: 'rena-graves', name: 'The Row at Rena', ...renaPoint(-8, -26), radius: 12,
    description: 'Sixteen low stones in a line behind a bank, none of them cut with a name. Whoever laid them out counted, and then stopped counting.' }),
  Object.freeze({ id: 'rena-orchard', name: 'Rena’s Orchard', ...renaPoint(40, -30), radius: 16,
    description: 'Apple trees in rows that the wood has been swallowing for eighty years: leggy, mossed, half of them down, and still fruiting in the autumn for nobody.' }),
  Object.freeze({ id: 'applegarth', name: APPLEGARTH.name, ...APPLEGARTH.centre, radius: 34,
    description: 'Ten roofs, a press house and a well, with the orchards fenced south of the road. It was West Rena once, and Westerina after that, and it has been Applegarth since the year the town burned.' }),
  Object.freeze({ id: 'old-rena-road', name: 'The Old Rena Road', ...point(-362, -30), radius: 12,
    description: 'A cart road going north off the main road, sunk and grassed and still perfectly straight. It was the road everybody in Drent used, and now it goes to one ruin and one village.' }),
  EAST_RENA_STONE,
  ...DRENT_DEEP_PLACES.map(({ id, name, x, z, radius, description }) => Object.freeze({ id, name, x, z, radius, description })),
]);

/** Ground the regional scatter keeps clear: the ruins, the village, their orchards and the road between. */
export const RENA_CLEARINGS = Object.freeze([
  Object.freeze({ ...RENA.centre, r: RENA.radius }),
  Object.freeze({ ...renaPoint(40, -30), r: 30 }),
  Object.freeze({ ...APPLEGARTH.centre, r: APPLEGARTH.radius }),
  Object.freeze({ ...applePoint(0, -30), r: 32 }),
  ...RENA_ROAD.map(p => Object.freeze({ x: p.x, z: p.z, r: 7 })),
  ...DRENT_DEEP_PLACES.map(place => Object.freeze({ x: place.x, z: place.z, r: place.radius + 3 })),
  Object.freeze({ x: EAST_RENA_STONE.x, z: EAST_RENA_STONE.z, r: 5 }),
]);

/** Fingerposts in the one sign language (src/signs.js): where they stand and what each finger points at. */
export const RENA_SIGNS = Object.freeze([
  Object.freeze({ ...point(RENA_JUNCTION.x - 5.2, RENA_JUNCTION.z - 6), label: 'The Ruins of Rena', toward: RENA.centre,
    back: (() => { const frame = roadFrame(MAIN_ROAD, CALOSS_GATE, 146, 0); return point(frame.x, frame.z); })(), backLabel: 'Tidehaven' }),
  Object.freeze({ ...renaPoint(38, -6.5), label: 'Applegarth', toward: APPLEGARTH.centre, back: RENA.centre, backLabel: 'The Ruins of Rena' }),
]);

// ---------------------------------------------------------------------------
// Checks the tests and the world builder share
// ---------------------------------------------------------------------------
/** Every place this pass adds, with the region each one must stand in. */
export const RENA_PLACES = Object.freeze([RENA, APPLEGARTH]);
export const renaRegion = place => regionNameAt(place.centre ? place.centre.x : place.x, place.centre ? place.centre.z : place.z);
