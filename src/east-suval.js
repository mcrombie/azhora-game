/**
 * East Suval, the stone country behind Elod's shut gate, and the city of Elod.
 *
 * Pure data and pure geometry: no three, no DOM. `src/east-suval-world.js`
 * renders what is described here, `src/elod-people.js` speaks for it, and the
 * charts and the tests read the same numbers.
 *
 * What the atlas gives and this file does not invent: the region's twenty-three
 * hexes, its outline, and the fact that its eastern edge *is* its coast — on the
 * east side of the peninsula the authored land ends exactly where the hex ends.
 * That is why Elod's quay is a quayside along the shore and the breakwater is a
 * separate mole of rock: a pier walking out past the outline would take a
 * traveler outside East Suval, and `src/closed-border.js` would refuse to let
 * them walk back in.
 *
 * Like Pueth and Peblos, everything here is authored **directly in world metres**
 * (100 m per hex). North is -Z, east is +X, and the sea is east of every number
 * in this file.
 *
 * The lore this is built on lives in ../world-builder/azhora_lore:
 * `geography/regions/svaleen.md` (pale limestone, thin soil, scrub and aromatic
 * plants, terraces where slope and water permit, an east coast with harder
 * weather and harder people than the west, and a Confederation that keeps
 * lighthouses and weights), `culture/azhoran_religions.md` (the Elodi, Balog in
 * three senses, the Threshold, what a foreigner may and may not do in the
 * harbour quarter), `fauna/azhoran_fauna_overview.md` (birds as travellers to
 * "the part of the world that waits"), and `docs/the-war-and-the-house-of-ambron.md`
 * in this repo, which is why the neutrality is three years old and contested.
 */
import { insideRegion, landDistance, REGION_CELLS, ELOD_TERRACE } from './region-world.js';
import { frontierPoint, FRONTIER_GATE } from './frontier.js';

const point = (x, z) => Object.freeze({ x, z });

// ---------------------------------------------------------------------------
// Elod, on its shelf above the eastern sea
// ---------------------------------------------------------------------------
/**
 * The city is laid out square to the world about the chart's own Elod point,
 * where the branch road from the waystation ends: +x is seaward, -z is north
 * along the coast. It is a small city on a hard coast — sixty metres of rock
 * between the crest the road comes over and the water — so it is built in
 * bands, not in rings: the landward gate on the crest, the walled precinct of
 * the Threshold on the levelled shelf below it, the ordinary city south of
 * that, and the harbour quarter on the low ground at the waterline.
 */
export const ELOD = Object.freeze({
  id: 'elod', name: 'Elod', centre: point(-50, 635), radius: 62,
  /** A point `a` metres east and `b` metres south of the Sea-Road Gate. */
});
export const elodPoint = (a, b) => point(ELOD.centre.x + a, ELOD.centre.z + b);

/** The gate the branch road ends at: Elod's landward door, shut since 976. */
export const SEA_ROAD_GATE = Object.freeze({
  id: 'sea-road-gate', name: 'The Sea-Road Gate', ...elodPoint(0, 0),
  halfWidth: 4.2, wing: 17, yaw: Math.atan2(1, 0),      // the wall wings run north and south
});

/**
 * The levelled shelf the inner districts stand on. The natural rock here runs
 * from twelve to nineteen metres; the platform takes it to fifteen, which means
 * a cut face on the landward side and a revetment on the seaward one. That
 * revetment is the wall the harbour looks up at.
 */
export const PRECINCT = Object.freeze({
  id: 'elod-precinct', name: 'The Inner Districts',
  minX: -47, maxX: -27, minZ: 612, maxZ: 652, level: 15,
  // The east run is a parapet, not a wall: it stands on six metres of revetment
  // above the harbour and has nothing to keep out that the drop does not.
  wallHeight: 4.6, eastWallHeight: 1.7, thickness: 1.1,
});
/** The made ground itself lives in region-world.js, where the terrain can see it. */
export const PRECINCT_PAD = ELOD_TERRACE;

/**
 * The Inner Gate: one opening, in the precinct's west wall, on the square
 * inside the Sea-Road Gate. A warden stands outside it. Nobody who is not Elodi
 * goes through, and the lore is silent on how anyone ever does, so
 * `ELOD_ADMISSION` below says what this build decided it costs.
 */
export const INNER_GATE = Object.freeze({
  id: 'elod-inner-gate', name: 'The Inner Gate', ...point(-41, PRECINCT.minZ),
  halfWidth: 2.1, height: 4.0, outward: point(0, -1),
});

/**
 * The Threshold itself.
 *
 * The lore names it and says the inner districts lie around it. It does not say
 * what it looks like or whether the Elodi make images, so this build decided,
 * and `docs/east-suval-report.md` says so: **no image of Balog, and no image of
 * any living thing, is made inside the inner districts.** The ornament is cut
 * lettering and cut geometry, nothing else. The building is a walled court
 * entered from the west, open to the sky, with one tall opening in its east
 * wall through which the first light comes off the sea. Nobody passes that
 * opening. It is the threshold, and it is why the thing has the name: the
 * Elodi will tell you that Balog is not in the building.
 */
export const THRESHOLD = Object.freeze({
  id: 'the-threshold', name: 'The Threshold', ...point(-36, 633),
  halfX: 6.5, halfZ: 10, platform: 2.2, courtWall: 6.2, eastWall: 10.4,
  opening: Object.freeze({ width: 3.2, height: 6.4 }),   // in the east wall, facing the sea
  porch: point(-45, 633),                                // square piers on the west, where the court is entered
  basin: point(-44, 628),                                // the washing basin outside the porch
});

/**
 * The Sea Gate: the arch and the low wall along the lip of the harbour bank,
 * between the harbour quarter and the city above it. This is the gate a
 * foreigner actually meets, and it is not absolute — a factor with business
 * goes up. What may not go up is a god: no image carried, no bell rung, no
 * libation poured, above this line. That is the lore's own rule, put on the
 * ground.
 */
export const SEA_GATE = Object.freeze({
  id: 'elod-sea-gate', name: 'The Sea Gate', ...point(-21.5, 612),
  // South of the gate the precinct's own revetment is the boundary; the wall is
  // only needed where the stepped street climbs at the harbour's northern end.
  // Two runs, and the opening between them is the gate.
  runs: Object.freeze([
    Object.freeze([point(-22.6, 600), point(-21.9, 607.4)]),
    Object.freeze([point(-21.2, 616.6), point(-21, 621)]),
  ]),
  halfWidth: 2.4,
});

/**
 * The quay: dressed stone along the waterline, not a pier out into it. Its deck
 * is flat standable ground (`quayHeight`), like Tidehaven's pier and Cobble's
 * quay, and every metre of it is inside East Suval's outline.
 */
export const ELOD_QUAY = Object.freeze({
  id: 'elod-quay', name: 'The Quay of Elod',
  minX: -12.5, maxX: -4, minZ: 612, maxZ: 646, deckY: 4.8,
  rings: Object.freeze([point(-5.2, 615), point(-5.2, 622), point(-5.2, 629), point(-5.2, 636), point(-5.2, 643)]),
  steps: point(-5.6, 640),                               // down the face to the foreshore and the landing stage
  stage: point(-1.2, 641),                               // the timber landing stage: scenery, not deck
  crane: point(-10.6, 621),                              // the harbour's one stone-and-timber derrick
});

/** The deck height at a point, or null where there is no deck. */
export function quayHeight(x, z) {
  const q = ELOD_QUAY;
  return x >= q.minX && x <= q.maxX && z >= q.minZ && z <= q.maxZ ? q.deckY : null;
}

/**
 * The breakwater: a mole of rough stone laid off the quay's northern end and
 * bent south, taking the weather that comes down the open coast. It is rock and
 * not a walkway — its crest is barely two metres of tumbled block, it carries
 * colliders and no deck, and it lies outside the region's outline, where no
 * traveler has any business standing.
 */
export const BREAKWATER = Object.freeze({
  id: 'elod-breakwater', name: 'The Breakwater',
  spine: Object.freeze([point(-2, 607), point(8, 610), point(17, 618), point(21, 630), point(20, 643)]),
  crest: 2.4, halfWidth: 3.6,
});

/**
 * Where the traveler would come ashore if the sea route were switched on. It is
 * the head of the quay steps, on the deck, **inside** East Suval's outline, so
 * `closed-border.js` never sees a step from outside the region to inside it.
 * The passage itself is not built: see `ELOD_SEA_ROUTE`.
 */
export const ELOD_LANDING = Object.freeze({
  ashore: Object.freeze({ ...point(-7.5, 640), yaw: -Math.PI / 2 }),
  stand: Object.freeze({ ...point(-6.4, 634), yaw: -Math.PI / 2 }),   // where a boatman would wait
  mooring: Object.freeze({ ...point(0.8, 641.5), yaw: 0 }),           // where a boat lies, off the landing stage
});

/**
 * The one lore-honest way into Elod while the land border stays shut, left as a
 * stub for the lead. Elod tolerates foreigners at the quay and nowhere else, so
 * the sea is the way in, and the game already has a ferryman and a pier.
 * `docs/east-suval-report.md` lists what wiring this up needs.
 */
export const ELOD_SEA_ROUTE = Object.freeze({
  id: 'elod-sea-route', from: 'peblos', to: 'elod', built: false,
  landing: ELOD_LANDING,
  note: 'Cobble to Elod, a day and a night under sail with the land on your right hand. Not built: the crossing, the fare and the boatman are stubs.',
});

/**
 * What being let past the Inner Gate costs, decided here because the lore does
 * not say. It is not money and it is not a favour. A stranger is admitted as a
 * *witness*, not a worshipper: they must put off every other allegiance for the
 * day — no token, no charm, no oath sworn by another power carried through the
 * gate — be vouched for by an Elodi householder who answers for them, and stand
 * where the warden puts them and nowhere else. The cost is the vouching: an
 * Elodi has to be willing to answer for a foreigner in front of the priest.
 */
export const ELOD_ADMISSION = Object.freeze({
  id: 'elod-admission', granted: false,
  terms: Object.freeze([
    'Nothing carried through the gate that is sworn by, prayed to, or asked of.',
    'An Elodi householder who will answer for you by name, in front of the priest.',
    'You stand where the warden puts you. You do not go up onto the platform.',
  ]),
  note: 'Not wired to the quest: no flag is set, no door opens. The warden states the terms and the traveler has no way yet to meet them.',
});

// ---------------------------------------------------------------------------
// The city's buildings
// ---------------------------------------------------------------------------
const building = ([id, x, z, width, depth, height, roof, wall, yaw, zone, note]) =>
  Object.freeze({ id, x, z, width, depth, height, roof, wall, yaw, zone, note });

/**
 * Eighteen buildings in three bands. Elodi building is pale limestone rubble
 * with a low slate pitch, blank to the street and open to a court behind, and
 * nothing painted: the colours here are the quarry's and the roof's.
 */
export const ELOD_BUILDINGS = Object.freeze([
  // The harbour quarter: the only ground a foreigner is free on.
  ['net-loft', -18.5, 606, 7.8, 5.2, 4.1, '#646c6c', '#cac2aa', .22, 'harbour',
    'The net loft, its upper floor open to the wind on the seaward side, with the year’s nets hanging out of it.'],
  ['factor-house-north', -18, 615.5, 6.0, 5.2, 4.1, '#68706c', '#c9c1a9', 0, 'harbour',
    'The second factor’s house, Enebreum’s. It has stood twenty years and has never once rung a bell.'],
  ['factor-house-east', -18, 623, 6.2, 5.4, 4.3, '#5d6668', '#d0c8b0', 0, 'harbour',
    'A factor’s house: shuttered street face, a court behind, and a lamp burning indoors for a god that may not be carried out of doors.'],
  ['weights-house', -18.5, 632, 8.4, 6.2, 3.9, '#5f6a6b', '#c8c0a8', 0, 'harbour',
    'The weights house. The Confederation’s measures hang on the wall in a locked frame and the harbourmaster’s table stands under them.'],
  ['harbour-hostel', -19, 644, 10.5, 7.4, 4.6, '#6a6f6d', '#cec6ae', 0, 'harbour',
    'The strangers’ hostel: eleven beds, a locked chest for each, and a yard where a foreigner may keep whatever household image he keeps.'],
  ['fish-shed', -13, 651, 6.4, 4.8, 3.2, '#6b6d64', '#c2baa4', -.18, 'harbour',
    'The gutting shed at the quay’s southern end, and the drying racks behind it.'],
  ['salt-store', -19, 655.5, 7.6, 5.6, 3.5, '#6d7069', '#c4bda6', 0, 'harbour',
    'The salt store, cut back into the bank, cold in summer and full to the roof before the autumn fishing.'],

  // The ordinary city: houses, water, grain and the schools that make scribes.
  ['scribe-school', -35, 662, 11.5, 8.0, 5.0, '#5f6a6b', '#cfc7af', 0, 'city',
    'The writing school. Elodi scribes are wanted in every city on this coast, and this is where they are made: forty boys and nine girls, and a master who does not raise his voice.'],
  ['grain-store', -22, 665, 9.0, 7.0, 6.2, '#646c6a', '#c9c1a9', 0, 'city',
    'The grain store: a high blind box on stone feet, sealed with the city’s mark, and the one building in Elod whose contents are counted aloud twice a year.'],
  ['city-house-1', -38, 671, 6.8, 5.6, 4.2, '#6a6f6d', '#ccc4ac', .12, 'city', ''],
  ['city-house-2', -28, 673, 6.4, 5.4, 4.0, '#606a6b', '#c7bfa7', -.16, 'city', ''],
  ['city-house-3', -17, 673, 6.6, 5.6, 4.4, '#6d7069', '#d1c9b1', .3, 'city', ''],
  ['city-house-4', -44, 601, 6.4, 5.2, 4.0, '#646c6c', '#cac2aa', -.24, 'city', ''],
  ['city-house-5', -34, 602, 6.8, 5.4, 4.2, '#5f6a6b', '#cec6ae', .18, 'city', ''],
  ['dyers-house', -25, 601, 7.2, 5.8, 3.8, '#6b6d64', '#c5bda5', 0, 'city',
    'The dyer’s yard. Purple from the rock whelks of this coast, which is the one luxury Elod sells and the one thing about Elod that Solis has ever envied.'],

  // The inner districts: what stands outside the Threshold's own court.
  ['warden-lodge', -42.5, 647, 6.6, 5.2, 3.6, '#5a6465', '#c6bea6', 0, 'inner',
    'The warden’s lodge inside the gate, with the day’s list of who has been vouched for nailed to the door frame.'],
  ['reading-house', -38, 619, 9.0, 6.6, 4.8, '#5d6668', '#cdc5ad', 0, 'inner',
    'The reading house, where the three senses of Balog are argued out loud every morning and the argument is minuted.'],
  ['priests-house', -34, 647, 7.4, 6.0, 4.2, '#626a6a', '#c8c0a8', 0, 'inner',
    'The priests’ house, plain as a barn, and the only door in Elod that is never locked.'],
].map(building));

/** Where each of Elod's people stands, and the way each one faces. */
export const ELOD_STANDS = Object.freeze({
  // The harbour quarter: the only ground a stranger is free on
  'elod-netmender': Object.freeze({ ...point(-9.5, 612.5), yaw: -Math.PI / 2 + .6 }),   // on the quay, mending
  'elod-harbourmaster': Object.freeze({ ...point(-9.5, 618.5), yaw: -Math.PI / 2 }),    // above the mooring rings
  'elod-factor': Object.freeze({ ...point(-14.5, 619), yaw: -Math.PI / 2 }),            // outside his own shutters
  'elod-quay-clerk': Object.freeze({ ...point(-9.5, 626), yaw: -Math.PI / 2 }),
  'elod-delegate': Object.freeze({ ...point(-14.5, 628), yaw: -Math.PI / 2 + .4 }),
  'elod-exile': Object.freeze({ ...point(-9.5, 634), yaw: -Math.PI / 2 }),
  'elod-refugee': Object.freeze({ ...point(-15, 636), yaw: -Math.PI / 2 }),
  'elod-hostel-keeper': Object.freeze({ ...point(-13, 641), yaw: Math.PI / 2 }),
  'elod-salter': Object.freeze({ ...point(-9, 644), yaw: Math.PI / 2 }),
  // The Sea Gate, at the top of the harbour steps
  'elod-gatekeeper': Object.freeze({ ...point(-23.5, 609), yaw: -Math.PI / 2 }),
  // The inner districts: everyone a traveler may speak to stands outside the gate
  'elod-warden': Object.freeze({ ...point(-41, 608.5), yaw: Math.PI }),
  'elod-warden-guard': Object.freeze({ ...point(-45, 608.5), yaw: Math.PI }),
  'elod-priest': Object.freeze({ ...point(-37, 608.5), yaw: Math.PI - .4 }),
  'elod-theologian': Object.freeze({ ...point(-49, 607), yaw: Math.PI + .3 }),
  'elod-reader': Object.freeze({ ...point(-33, 608), yaw: Math.PI + .5 }),
  // The ordinary city
  'elod-scribe-master': Object.freeze({ ...point(-35, 653.5), yaw: Math.PI }),
  'elod-scribe': Object.freeze({ ...point(-30, 655), yaw: Math.PI - .5 }),
  'elod-grain-keeper': Object.freeze({ ...point(-25, 659), yaw: Math.PI }),
  'elod-cistern-keeper': Object.freeze({ ...point(-33, 671), yaw: .7 }),
  'elod-young-man': Object.freeze({ ...point(-42, 664), yaw: -.4 }),
  'elod-dyer': Object.freeze({ ...point(-29, 598), yaw: 1.6 }),
});

/**
 * The people of East Suval who do not live in the city: the two who keep the
 * frontier work behind its shut gate, and the three at the outlying places.
 * The frontier's own stands come from `src/frontier.js`, so they move if the
 * atlas ever moves the border.
 */
export const EAST_SUVAL_STANDS = Object.freeze({
  'suval-frontier-serjeant': Object.freeze({ ...frontierPoint(24, 8), yaw: Math.atan2(-FRONTIER_GATE.u.x, -FRONTIER_GATE.u.z) }),
  'suval-beacon-watch': Object.freeze({ ...frontierPoint(66, -4), yaw: Math.atan2(-FRONTIER_GATE.u.x, -FRONTIER_GATE.u.z) }),
  'suval-lightkeeper': Object.freeze({ ...point(-69, 543), yaw: -Math.PI / 2 }),
  'suval-fisher': Object.freeze({ ...point(85, 797), yaw: -Math.PI / 2 }),
  'suval-terrace-farmer': Object.freeze({ ...point(-205, 696), yaw: 1.2 }),
});

/** The cisterns: the whole reason a city stands on a rock with no river. */
export const ELOD_CISTERNS = Object.freeze([
  Object.freeze({ id: 'cistern-square', ...point(-44, 630), radius: 2.6, note: 'The square’s cistern, under a stone lid with a bronze rim worn to a shine.' }),
  Object.freeze({ id: 'cistern-city', ...point(-31, 666.5), radius: 2.9, note: 'The city cistern, fed off the roofs of the whole southern quarter by channels cut in the kerbs.' }),
  Object.freeze({ id: 'cistern-harbour', ...point(-24, 636), radius: 2.2, note: 'The harbour cistern, which foreigners may draw from and do not have to ask.' }),
]);

/** The stepped street from the Sea Gate down to the quay, and the streets above it. */
export const ELOD_STREETS = Object.freeze([
  // From the Sea-Road Gate round the precinct's northern side and down the steps to the water.
  Object.freeze([point(-50, 635), point(-53, 626), point(-51, 613), point(-40, 607), point(-30, 606), point(-21.5, 612), point(-14, 618)]),
  // And south from the gate into the ordinary city.
  Object.freeze([point(-50, 635), point(-49, 648), point(-44, 658), point(-35, 666), point(-25, 668)]),
  // The quay street, along the foot of the revetment.
  Object.freeze([point(-14, 618), point(-13.5, 630), point(-14, 642), point(-14.5, 650)]),
]);

/** Ground the region's scatter keeps clear: the city, its gates and every place. */
export const ELOD_CLEARINGS = Object.freeze([
  Object.freeze({ x: -34, z: 632, r: 34 }),
  Object.freeze({ x: -14, z: 628, r: 24 }),
  Object.freeze({ x: -32, z: 662, r: 22 }),
  Object.freeze({ x: -36, z: 606, r: 20 }),
  Object.freeze({ x: -50, z: 635, r: 14 }),
]);

// ---------------------------------------------------------------------------
// The rest of East Suval
// ---------------------------------------------------------------------------
/**
 * The light on the northern point. The Confederation allots each member city a
 * stretch of coast to keep lit; the Elodi do not attend the Conclave, do not
 * argue about the allocations and have never once let this one go dark. It is
 * the only obligation to anybody else that Elod accepts, and the Elodi are
 * careful to describe it as a debt to sailors rather than to the Confederation.
 */
export const NORTH_LIGHT = Object.freeze({
  id: 'north-light', name: 'The North Light', ...point(-64, 540),
  keeperHut: point(-72, 546), towerHeight: 13.5,
});

/**
 * Sorrow Beach — the fishing settlement on the exposed east coast, an hour and
 * a half south of the city. The svaleen lore says the east-coast settlements
 * have a harder character than the western cities, and this one is the proof:
 * seven roofs, no quay worth the name, boats hauled bodily up the shingle, and
 * a stone with names cut on it.
 */
export const SORROW_BEACH = Object.freeze({
  id: 'sorrow-beach', name: 'Sorrow Beach', ...point(84, 800),
  boats: Object.freeze([point(92, 792), point(93, 799), point(92.5, 806)]),
  namestone: point(78, 807),
  huts: Object.freeze([
    Object.freeze({ id: 'beach-hut-1', ...point(80, 792), width: 5.4, depth: 4.2, height: 2.9, yaw: -1.35 }),
    Object.freeze({ id: 'beach-hut-2', ...point(78, 799), width: 5.0, depth: 4.0, height: 2.7, yaw: -1.5 }),
    Object.freeze({ id: 'beach-hut-3', ...point(79, 813), width: 5.2, depth: 4.2, height: 2.8, yaw: -1.2 }),
    Object.freeze({ id: 'beach-hut-4', ...point(72, 805), width: 4.8, depth: 4.0, height: 2.7, yaw: -1.7 }),
  ]),
});

/**
 * Sevenwalls, the cistern village in the dry valley inland: terraces where the
 * slope and the water permit, exactly as the lore has it, and a covered cistern
 * that is the only reason anybody farms here at all.
 */
export const SEVENWALLS = Object.freeze({
  id: 'sevenwalls', name: 'Sevenwalls', ...point(-205, 690),
  cistern: point(-201, 694), press: point(-212, 684),
  terraces: Object.freeze([
    Object.freeze({ x: -196, z: 676, length: 44, yaw: .38 }),
    Object.freeze({ x: -199, z: 686, length: 50, yaw: .34 }),
    Object.freeze({ x: -202, z: 696, length: 52, yaw: .30 }),
    Object.freeze({ x: -205, z: 706, length: 46, yaw: .26 }),
  ]),
  huts: Object.freeze([
    Object.freeze({ id: 'sevenwalls-house-1', ...point(-209, 691), width: 6.2, depth: 5.0, height: 3.3, yaw: .3 }),
    Object.freeze({ id: 'sevenwalls-house-2', ...point(-203, 700), width: 5.8, depth: 4.8, height: 3.1, yaw: .1 }),
    Object.freeze({ id: 'sevenwalls-house-3', ...point(-213, 699), width: 5.6, depth: 4.6, height: 3.0, yaw: -.2 }),
  ]),
});

/** The dry hills in the south: a shepherd's cistern below the old ridge lookout. */
export const SHEPHERDS_CISTERN = Object.freeze({
  id: 'shepherds-cistern', name: 'The Shepherds’ Cistern', ...point(-150, 850),
  fold: point(-158, 858),
});

/** Every named place in East Suval outside the frontier work, with its discovery text. */
export const EAST_SUVAL_PLACES = Object.freeze([
  Object.freeze({ id: THRESHOLD.id, name: THRESHOLD.name, ...point(-38, 631), radius: 12,
    description: 'Above the revetment stands a wall of great ashlar with one tall opening in its eastern face, and nothing in the opening. No image, no altar in the street, no name on the stone. The Elodi will tell you, patiently, that Balog is not in the building.' }),
  Object.freeze({ id: INNER_GATE.id, name: INNER_GATE.name, ...point(INNER_GATE.x, INNER_GATE.z - 4),
    description: 'One opening in a blank wall, a warden beside it, and a list of names nailed up on the frame. Inside is the ground where no other power may be offered anything at all.' }),
  Object.freeze({ id: SEA_GATE.id, name: SEA_GATE.name, ...point(SEA_GATE.x, SEA_GATE.z),
    description: 'The arch at the top of the harbour steps. A foreigner with business goes up through it. What does not go up through it is a god: nothing carried, nothing rung, nothing poured, above this line.' }),
  Object.freeze({ id: ELOD_QUAY.id, name: ELOD_QUAY.name, ...point(-8, 629), radius: 16,
    description: 'Dressed stone laid along the waterline, mooring rings in its face, a derrick at its northern end, and a mole of tumbled rock out in the water taking the weather. Foreign ships lie here and foreign sailors stay here.' }),
  Object.freeze({ id: 'elod-harbour-quarter', name: 'The Harbour Quarter', ...point(-17, 633), radius: 18,
    description: 'Warehouses, factors’ houses with their shutters closed, a hostel for outsiders, and lamps burning indoors for gods that may not be carried into the street. The only part of Elod a stranger is free in, because trade requires it.' }),
  Object.freeze({ id: 'frontier-guard-house', name: 'Behind the Frontier Gate', ...frontierPoint(26, 6), radius: 14,
    description: 'The Elodi side of the shut gate: a ditch you now have your back to, a guard house with a cold stove, a stable for four horses, and a serjeant who has read the same order every morning for three years.' }),
  Object.freeze({ id: NORTH_LIGHT.id, name: NORTH_LIGHT.name, ...point(NORTH_LIGHT.x, NORTH_LIGHT.z),
    description: 'A squat stone tower on the northern point, whitewashed to the sill and swept out daily. The Confederation allots the coast; Elod keeps this stretch of it lit and sends no delegate to argue about the rest.' }),
  Object.freeze({ id: SORROW_BEACH.id, name: SORROW_BEACH.name, ...point(SORROW_BEACH.x, SORROW_BEACH.z), radius: 20,
    description: 'Seven roofs on the open coast, boats dragged bodily up the shingle, and a standing stone with names cut on it in three different hands. The east coast keeps worse weather than the west and harder people.' }),
  Object.freeze({ id: SEVENWALLS.id, name: SEVENWALLS.name, ...point(SEVENWALLS.x, SEVENWALLS.z), radius: 22,
    description: 'Four dry terraces stepping down a valley that has no stream in it, a covered cistern with a bronze lid, and an olive press older than the houses. Where the slope and the water permit, and not one yard further.' }),
  Object.freeze({ id: SHEPHERDS_CISTERN.id, name: SHEPHERDS_CISTERN.name, ...point(SHEPHERDS_CISTERN.x, SHEPHERDS_CISTERN.z),
    description: 'A stone-lidded tank in the dry hills with a trough beside it and a fold of piled rock. Somebody comes up twice a year to clear the channel, and nobody in Elod could tell you who.' }),
]);

/** The named ground of the region, for keeping the scatter off it. */
export const EAST_SUVAL_CLEARINGS = Object.freeze([
  ...ELOD_CLEARINGS,
  Object.freeze({ x: NORTH_LIGHT.x, z: NORTH_LIGHT.z, r: 16 }),
  Object.freeze({ x: SORROW_BEACH.x, z: SORROW_BEACH.z, r: 22 }),
  Object.freeze({ x: SEVENWALLS.x, z: SEVENWALLS.z, r: 24 }),
  Object.freeze({ x: SHEPHERDS_CISTERN.x, z: SHEPHERDS_CISTERN.z, r: 12 }),
]);

// ---------------------------------------------------------------------------
// The region's own scatter
// ---------------------------------------------------------------------------
/**
 * East Suval scatters itself rather than taking the generic per-hex counts,
 * because what grows here is decided by how far the ground is from the sea and
 * how high it stands, which a single number per hex cannot say: aromatic
 * cushion scrub everywhere, grey limestone bones on the ridges, wind-cut
 * juniper and a few olives in the hollows, thrift and sea-lavender on the
 * exposed coast, and dry-stone field walls wherever anybody has ever tried to
 * farm. Nothing here is forest. The tallest thing in the region is the
 * Threshold's east wall.
 */
export const EAST_SUVAL_SCATTER = Object.freeze({
  treesPerHex: 3,          // olives and juniper, in the hollows only
  rocksPerHex: 26,         // limestone bones, thickest on the high ground
  scrubPerHex: 54,         // thyme, lavender, spurge: the aromatic cushions
  tuftsPerHex: 64,
  wallsPerHex: 1.1,        // runs of dry-stone field wall on the terraced ground
});

/** The hexes of East Suval, from the atlas, with their authored terrain. */
export const EAST_SUVAL_CELLS = Object.freeze(REGION_CELLS['East Suval'].map(cell =>
  Object.freeze({ q: cell.q, r: cell.r, x: cell.x, z: cell.z, terrain: cell.terrain })));

/** True inside Elod's own ground, where the region's scatter must not grow. */
export const inElod = (x, z, margin = 0) =>
  ELOD_CLEARINGS.some(spot => Math.hypot(x - spot.x, z - spot.z) < spot.r + margin);

/** True where the region's scatter must not grow at all. */
export const eastSuvalClear = (x, z, margin = 0) =>
  EAST_SUVAL_CLEARINGS.some(spot => Math.hypot(x - spot.x, z - spot.z) < spot.r + margin)
  || quayHeight(x, z) !== null;

export { insideRegion, landDistance };
