/**
 * Amod: the terrace country west of Pueth, as places, roads and water.
 *
 * Pure: no three, no DOM. `src/amod-scenery.js` renders what is described here,
 * `src/amod-terraces.js` shapes the ground it stands on, and the charts, the
 * tests and the ogre on the road read the same numbers.
 *
 * Amod is authored directly in world metres (100 m per hex), as Pueth and Peblos
 * are. It never existed in the 56 m frame, so it has no `world-scale.js` cluster
 * and nothing here is converted at a boundary.
 *
 * What comes from the atlas: the region's 26 hexes (through the survey) and the
 * three-hex border with Pueth at (11,99), (10,100) and (9,101). Everything else
 * is authored from `geography/regions/amod.md`, which is the design document:
 *
 *  - The land is descending ridges, each throwing a valley southward, each valley
 *    carrying a stream out of the Lotharn. Here that is **the Tarvel**, whose
 *    water court Ostel keeps. The atlas already tips the country the right way —
 *    hills and one mountain along the northern rows, grassland along the south —
 *    so the stream only has to be cut into a slope that already falls.
 *  - Towns stand on shoulders above valley floors, and their streets follow
 *    contour rather than compass. **Ostel** is laid out in its own frame for
 *    exactly that reason: `along` is the contour, `across` is the fall line, and
 *    the road from Pueth climbs the shoulder diagonally, turns to run the street,
 *    and leaves north-west over the Tarvel toward Kelmod and Mavren.
 *  - Water is the law. Every gate, channel and springhouse here belongs to a
 *    named right in the water court's book, and the dispute at the Dromel Gate is
 *    an ordinary week's work, not an event.
 */
import { hexAt, regionNameAt } from './region-world.js';

const point = (x, z) => Object.freeze({ x, z });
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

// ---------------------------------------------------------------------------
// Ostel's frame: the contour and the fall line
// ---------------------------------------------------------------------------
/**
 * The shoulder above the Tarvel falls east toward Pueth at about one in twelve,
 * so the contour runs north-west and south-east across it. `ostelPoint(a, b)` is
 * `a` metres along the contour toward the burial terrace and `b` metres down the
 * fall line toward the road in from Pueth.
 */
export const OSTEL = Object.freeze({
  id: 'ostel', name: 'Ostel', centre: point(-750, -506), radius: 38,
  along: point(-0.52, -0.854), across: point(0.854, -0.52),
});
export const ostelPoint = (a, b) => point(
  OSTEL.centre.x + OSTEL.along.x * a + OSTEL.across.x * b,
  OSTEL.centre.z + OSTEL.along.z * a + OSTEL.across.z * b);

// ---------------------------------------------------------------------------
// The road in from Pueth
// ---------------------------------------------------------------------------
/**
 * The junction is an existing vertex of `PUETH_ROAD` (src/pueth-world.js), so the
 * Amod road leaves the Feradom road exactly where that road already turns, and a
 * traveler walking north out of Rimeholt meets a fork rather than a seam.
 */
export const AMOD_JUNCTION = point(-392, -402);

/** Where the road crosses out of Pueth into Amod, at the pass stones. */
export const AMOD_BORDER = point(-664, -470);

/** Where the road crosses the Tarvel: a single stone arch, a cart and a mule wide. */
export const TARVEL_BRIDGE = Object.freeze({
  id: 'tarvel-bridge', name: 'The Ostel Bridge', crossing: point(-816, -532),
  halfSpan: 5.4, laneHalf: 2.4, axis: point(0.995, 0.0998), side: point(-0.0998, 0.995),
});

/**
 * West out of Pueth along the foot of the hills, over the border at the pass
 * stones, up Ostel's shoulder, along the street, over the Tarvel and out of the
 * built world on the Kelmod road.
 */
export const AMOD_ROAD = Object.freeze([
  AMOD_JUNCTION,
  point(-428, -408), point(-468, -417), point(-508, -424), point(-548, -432), point(-586, -443),
  point(-618, -455), point(-640, -463), AMOD_BORDER,
  point(-686, -477), point(-706, -484), point(-722, -491),
  // Into the town: the road turns onto the street and runs the contour.
  ostelPoint(-16, 11), ostelPoint(-4, 10), ostelPoint(8, 9), ostelPoint(18, 8),
  // Out again, north-west and down to the water.
  point(-776, -528), point(-796, -531), TARVEL_BRIDGE.crossing,
  point(-838, -534), point(-862, -536), point(-882, -537),
]);

/** Where the built road stops. Beyond it the Kelmod road runs on, unbuilt. */
export const KELMOD_ROAD_END = Object.freeze({ id: 'kelmod-road', name: 'The Kelmod Road', ...point(-884, -537), halfWidth: 46 });

// ---------------------------------------------------------------------------
// The Tarvel, the stream of Ostel's valley
// ---------------------------------------------------------------------------
/**
 * Source to mouth, running south out of the Lotharn foot the way every Amodian
 * valley stream does. Ostel's water court records every diversion off it; the
 * Dromel is the high channel, taken off at the head and carried along the
 * contour to the western terraces, and it is the one the valley argues about.
 */
export const TARVEL = Object.freeze({
  id: 'tarvel', name: 'The Tarvel', halfWidth: 2.2,
  points: Object.freeze([
    point(-846, -628), point(-840, -608), point(-833, -588), point(-827, -568), point(-822, -550),
    point(-816, -532), point(-810, -510), point(-805, -486), point(-800, -460), point(-795, -432), point(-791, -404),
  ]),
});

/** Distance from a world point to the Tarvel's centre line. */
export function tarvelDistance(x, z) {
  const outside = Math.max(-890 - x, x + 740, -700 - z, z + 360, 0);
  if (outside > 0) return outside;
  let best = Infinity;
  const points = TARVEL.points;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], dx = b.x - a.x, dz = b.z - a.z;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
    best = Math.min(best, Math.hypot(x - a.x - dx * t, z - a.z - dz * t));
  }
  return best;
}

/**
 * The Dromel: a metre of stone-lined channel taken off the Tarvel at its head and
 * carried along the contour to the western terraces. Not a stream — a work, kept
 * to grade by people who can give you its fall in fingers per hundred paces.
 */
export const DROMEL_CHANNEL = Object.freeze([
  point(-844, -620), point(-852, -608), point(-859, -594), point(-863, -578), point(-864, -562),
  point(-862, -546), point(-857, -532), point(-852, -520),
]);

/** The water gate on the Dromel where the dispute stands: two fields, one board, one afternoon a week. */
export const DROMEL_GATE = Object.freeze({ id: 'dromel-gate', ...point(-864, -562) });
/** Where the Dromel is taken off the Tarvel: a springhouse of dressed stone and a worn sill. */
export const TARVEL_HEAD = Object.freeze({ id: 'tarvel-head', name: 'The Tarvel Head', ...point(-845, -624) });

// ---------------------------------------------------------------------------
// Ostel, the eastern dry-slope town
// ---------------------------------------------------------------------------
/**
 * Amodian houses are vertical: an undercroft of stone for animals and store, a
 * household above it, a drying loft under a steep roof. `storeys` is a real count,
 * not a scale factor, and the walls are the local pale stone rather than timber.
 * `[id, a, b, width, depth, storeys, roof, wall, note]` in the town's own frame.
 */
export const OSTEL_BUILDINGS = Object.freeze([
  ['road-house', -13, 17, 9.8, 7.4, 3, '#7d5a43', '#b9ae92', 'The Struck Measure: beds, soup, and the toll book of the Pueth road.'],
  ['court-house', 6, 2, 8.4, 6.8, 2, '#6f5744', '#c2b79a', 'The water court: one room, a long table, a cupboard of rolls, and a door that is never locked.'],
  ['press-house', -14, -6, 9.2, 7.8, 2, '#6b5640', '#b4a98d', 'The press, and the smell of last autumn under the floor.'],
  ['cellar-house', -20, -13, 6.6, 6.2, 2, '#745841', '#ada285', 'Cellar doors cut back into the shoulder; the wine keeps its cold without ice.'],
  ['stone-shed', 20, 12, 9.0, 6.4, 1, '#6a5742', '#b7ac90', 'The stonecutters’ shed, open on the yard side.'],
  ['smithy', 13, 13, 6.8, 5.8, 2, '#5f4e3c', '#ab9f84', 'Hooks, hinges, channel knives and the small metal that keeps water gates honest.'],
  ['granary', 12, -4, 6.2, 5.6, 3, '#705742', '#bdb295', 'Raised on staddle stones, with a ladder that is taken away at night.'],
  ['house-1', -3, -3, 6.0, 5.4, 3, '#77593f', '#b6ab8f', ''],
  ['house-2', -6, 4, 5.8, 5.2, 3, '#6d5540', '#c0b598', ''],
  ['house-3', 3, -10, 6.2, 5.4, 3, '#7a5c43', '#b1a68a', ''],
  ['house-4', -22, 3, 5.6, 5.0, 2, '#6c5440', '#bab08f', ''],
  ['house-5', 18, -2, 5.8, 5.2, 2, '#745942', '#b4a98d', ''],
  ['house-6', 25, 4, 6.0, 5.2, 3, '#6f5741', '#bcb194', ''],
  ['house-7', -25, 12, 5.6, 5.0, 2, '#785b42', '#b0a589', ''],
  ['house-8', 1, 16, 5.8, 5.4, 2, '#6b5440', '#b8ad91', ''],
].map(([id, a, b, width, depth, storeys, roof, wall, note]) => Object.freeze({
  id, a, b, ...ostelPoint(a, b), width, depth, storeys, roof, wall, note })));

/** The town spring, its basin and the first channel off it: the reason the town is here. */
export const OSTEL_SPRING = Object.freeze({ id: 'ostel-spring', ...ostelPoint(9, -14) });
/** The stonecutters' yard: half-worked blocks, a saw pit and the dust of them. */
export const OSTEL_STONE_YARD = Object.freeze({ id: 'ostel-stone-yard', ...ostelPoint(25, 16), radius: 10 });
/** The road house's toll table, out in the yard where the carts stop. */
export const OSTEL_TOLL_TABLE = Object.freeze({ ...ostelPoint(-18, 21) });

/** Where each of Ostel's people stands. `a` runs up the contour, `b` down the fall line. */
export const OSTEL_STANDS = Object.freeze({
  'ostel-measure-keeper': ostelPoint(9, -11),        // at the spring, reading the basin
  'ostel-springkeeper': ostelPoint(12, -13),
  'ostel-court-clerk': ostelPoint(6, 6),             // on the water court's step
  'ostel-roadhouse': ostelPoint(-13, 13),            // in the road house door
  'ostel-accountant': ostelPoint(-19, 20),           // at the toll table
  'ostel-clerk': ostelPoint(-23, 24),                // Ambron's man, apart, being told nothing
  'ostel-carter': ostelPoint(-22, 16),
  'ostel-muleteer-1': ostelPoint(-27, 20),
  'ostel-muleteer-2': ostelPoint(-24, 27),
  'ostel-stonecutter': ostelPoint(24, 19),           // in the yard among the blocks
  'ostel-apprentice': ostelPoint(28, 14),
  'ostel-smith': ostelPoint(13, 17),
  'ostel-vintner': ostelPoint(-14, -11),             // at the press house door
  'ostel-cellarer': ostelPoint(-21, -18),            // at the cellar mouth
  'ostel-widow': ostelPoint(-4, -18),                // on her wall, below the spring
  'ostel-goatherd': ostelPoint(2, -23),              // where the goat track leaves the town
  'ostel-orchardman': ostelPoint(-9, -20),
  // Two who stand outside the town, on the road the traveler walks in by.
  'amod-culvert-hand': point(-703, -478),            // knee-deep in the culvert, clearing it
  'amod-wall-wright': point(-690, -489),             // rebuilding the first terrace's end
});

// ---------------------------------------------------------------------------
// The ogre on the road
// ---------------------------------------------------------------------------
/**
 * Mallec stands at the pass stones on the border, which is exactly the joke: the
 * pass tolls of Amod are administered by road houses and pass families, and an
 * ogre who has set himself up as his own toll authority is a creature this country
 * can file. Ostel's road house has paid him for two generations and enters it in
 * the book as a charge on the road. The water court served him a judgement once.
 *
 * His stone sits south of the road, and he stands beside it, so a traveler who
 * wants nothing to do with him can keep walking. The arena runs along +X:
 * retreating east, back toward Pueth, ends the fight, and the checkpoint is on
 * that side of it.
 */
export const TOLL_STONE = Object.freeze({ id: 'amod-toll-stone', ...point(-676, -468) });
export const OGRE_STAND = Object.freeze({ ...point(-679, -473), yaw: Math.PI * .52 });

// ---------------------------------------------------------------------------
// The places of the east end
// ---------------------------------------------------------------------------
export const VESSEN = Object.freeze({ id: 'vessen', name: 'Vessen', ...point(-856, -590), radius: 17 });
export const TIR_OSTEL = Object.freeze({ id: 'tir-ostel', name: 'Tir Ostel', ...point(-766, -546), radius: 15 });

export const AMOD_LANDMARKS = Object.freeze([
  Object.freeze({ id: 'amod-pass-stones', name: 'The Amod Pass Stones', ...point(-668, -462),
    description: 'Four standing stones where the road leaves Pueth. A sprig of herb in the cleft of one, the first chestnuts of the year at the foot of another. The country beyond them is ribbed with walls from the stream beds to the tree line.' }),
  Object.freeze({ ...TOLL_STONE, name: 'The Toll Stone',
    description: 'A pass stone worn smooth on top, with a wooden bowl set beside it. An ogre sits here and takes a toll off the road. Ostel’s road house has entered it in the book for two generations, because it is cheaper than the alternative.' }),
  Object.freeze({ id: 'amod-first-terrace', name: 'The First Terrace', ...point(-692, -487),
    description: 'The first wall the road passes: chest-high dry stone, its courses lapped and relapped in four different centuries. Somebody is rebuilding the western end, and has been since spring.' }),
  Object.freeze({ id: 'amod-culvert', name: 'The Ostel Culvert', ...point(-706, -481),
    description: 'A stone culvert takes a field channel under the road. It is being cleared with a long hook, as it is cleared after every storm and before every one anybody expects.' }),
  Object.freeze({ id: 'ostel', name: 'Ostel', ...OSTEL.centre, radius: OSTEL.radius,
    description: 'The eastern dry-slope town, stacked up its shoulder above the Tarvel: stonecutters’ yards and half-worked blocks, a press and cold cellars for the hard white wine, the water court’s one room, and the road house that takes the toll off the Pueth road.' }),
  Object.freeze({ id: 'ostel-spring', name: 'The Ostel Spring', ...OSTEL_SPRING,
    description: 'A stone basin under a low roof, running clear and steady. The measure-keeper reads it the way other people read a page, and the town was built round it rather than the other way about.' }),
  Object.freeze({ id: 'tir-ostel', name: 'Tir Ostel', ...TIR_OSTEL,
    description: 'Ostel’s burial terrace, above the town and never below it. The dead lie facing down the watercourse, so they can see what is being neglected. The wall in front of them is the best-kept in the valley.' }),
  Object.freeze({ id: 'vessen', name: 'Vessen', ...VESSEN,
    description: 'Three roofs and a springhouse on the western flank, sharing one water court with the hamlets above. Its records are kept better than its roofs, and its people would tell you that is the correct order.' }),
  Object.freeze({ id: 'dromel-gate', name: 'The Dromel Gate', ...DROMEL_GATE,
    description: 'A stone gate on the high channel, with a slot for a board and a tally cut in the jamb. Two households have argued about the width of that slot since the year the Tarvel changed its bed, and the water court has heard it four times.' }),
  Object.freeze({ id: 'tarvel-head', name: 'The Tarvel Head', ...TARVEL_HEAD,
    description: 'Where the Dromel is taken off the Tarvel: a springhouse of dressed stone, a sill worn into a curve, and a cup of wine poured on the repaired end of the wall beside it.' }),
  Object.freeze({ id: 'tarvel-bridge', name: 'The Ostel Bridge', ...TARVEL_BRIDGE.crossing,
    description: 'One stone arch over the Tarvel, wide enough for a cart and a mule to disagree. The parapet carries an offering shelf on the upstream side.' }),
  Object.freeze({ ...KELMOD_ROAD_END,
    description: 'The road west, toward Kelmod’s timber and mules and, beyond it, Mavren where the ledgers meet. A fingerpost, a wall, and a great deal of country nobody has walked yet.' }),
]);

/** Ground the Amod scatter keeps clear: the town, the places, the stream head and the stones. */
export const AMOD_CLEARINGS = Object.freeze([
  Object.freeze({ x: OSTEL.centre.x, z: OSTEL.centre.z, r: OSTEL.radius + 4 }),
  Object.freeze({ x: VESSEN.x, z: VESSEN.z, r: VESSEN.radius }),
  Object.freeze({ x: TIR_OSTEL.x, z: TIR_OSTEL.z, r: TIR_OSTEL.radius }),
  Object.freeze({ x: TARVEL_HEAD.x, z: TARVEL_HEAD.z, r: 10 }),
  Object.freeze({ x: DROMEL_GATE.x, z: DROMEL_GATE.z, r: 9 }),
  Object.freeze({ x: TOLL_STONE.x, z: TOLL_STONE.z, r: 16 }),
  Object.freeze({ x: TARVEL_BRIDGE.crossing.x, z: TARVEL_BRIDGE.crossing.z, r: 11 }),
  ...AMOD_LANDMARKS.filter(place => ['amod-pass-stones', 'amod-first-terrace', 'amod-culvert', 'kelmod-road'].includes(place.id))
    .map(place => Object.freeze({ x: place.x, z: place.z, r: 9 })),
]);

/** Fingerposts in the existing style: each names where it points and where the traveler came from. */
export const AMOD_SIGNS = Object.freeze([
  Object.freeze({ ...point(-672, -476), label: 'Ostel', returnLabel: 'Rimeholt', yaw: Math.PI / 2 }),
  Object.freeze({ ...point(-718, -497), label: 'Ostel', returnLabel: 'The Pass Stones', yaw: Math.PI / 2 }),
  Object.freeze({ ...ostelPoint(22, 13), label: 'Kelmod & Mavren', returnLabel: 'Ostel', yaw: Math.PI / 2 }),
  Object.freeze({ ...point(-800, -537), label: 'Sareth-am-Vel', returnLabel: 'Ostel', yaw: Math.PI / 2 }),
]);

/** Every person Amod places, in world metres. */
export const AMOD_NPC_POSITIONS = Object.freeze({ ...OSTEL_STANDS });

/** The hexes the atlas gives Amod on Pueth's western edge; the border is three hexes wide. */
export const AMOD_BORDER_HEXES = Object.freeze([
  Object.freeze({ q: 11, r: 99 }), Object.freeze({ q: 10, r: 100 }), Object.freeze({ q: 9, r: 101 }),
]);

export { hexAt, regionNameAt };
