/**
 * Ambron: the walled city on the Lake Ela narrows, and the seat of the empire.
 *
 * Pure: no three, no DOM. `src/elagos-scenery.js` builds it, `src/ambron-people.js`
 * gives its people words, and the tests read these tables.
 *
 * The city is laid out in its own frame, square to the world (`ambronPoint(a, b)`
 * is `a` metres east and `b` metres south of the middle of the causeway), and the
 * channel of the Ela-south runs north to south straight through the middle of it
 * at a = 0. The walls are built across the water: a water gate at each end of the
 * channel, the **chain** in the southern one, and the **causeway** over the middle.
 * Everything the Lake Lands send south stops here, and that is the empire.
 *
 * Three things the lore insists on, built as ground:
 *  - **No single period.** The wall is one line in four masonries: old lake-stone
 *    at the water where the first settlement was, the high imperial ashlar of the
 *    east and north, patched contraction-period rubble on the west, and new
 *    coursed work where the last siege took a piece out of it. The street paving
 *    changes with it, from worn lake-stone slabs by the chain to fresh setts at
 *    the Ossen Gate.
 *  - **The toll.** The chain, its capstan house, the toll house over it, the tally
 *    boards, the queue of barges above it and the empty water below.
 *  - **The winters.** Ice-road stones, sledge runners stacked against walls,
 *    steep roofs, and a lake gauge cut into the quay.
 *
 * Fortification follows the shared standard (`src/fortification.js`) with the
 * measures of a capital rather than an outpost: a higher wall, a thicker one, and
 * a tower every thirty metres or so of it.
 */
import { AMBRON, ambronPoint } from './region-world.js';
import { AMBRON_TERRACE } from './region-world.js';
import { fortCircuit, FORT_STANDARD } from './fortification.js';

const freeze = Object.freeze;
const point = (x, z) => freeze({ x, z });
const lerp = (a, b, t) => a + (b - a) * t;
const P = ambronPoint;

/** The made ground the city stands on, as an exact plane: the terrain pad, analytically. */
export const cityGround = a => AMBRON_TERRACE.level + a * AMBRON_TERRACE.slopeX;

/** A capital's measures, on the shared standard's plan. */
export const AMBRON_STANDARD = freeze({
  ...FORT_STANDARD,
  wallHeight: 7.2, walkHeight: 5.0, wallThickness: 4.6,
  towerSize: 5.8, towerPlatform: 10.2, towerProjection: 1.4,
  towerSpacing: freeze({ min: 24, max: 38 }),
  gateWidth: 5.2, berm: 1.2, ditchWidth: 5.0, causewayHalf: 5.6,
});

const HALF_A = AMBRON.halfA, HALF_B = AMBRON.halfB;
/** The wall line: north-west, north-east, south-east, south-west. */
export const AMBRON_CORNERS = freeze([P(-HALF_A, -HALF_B), P(HALF_A, -HALF_B), P(HALF_A, HALF_B), P(-HALF_A, HALF_B)]);

/**
 * Six gates. Four for the road and two for the water: the channel passes through
 * the wall at each end of the city, and the chain hangs in the southern one.
 * `at` is measured from the first corner of the edge, as `fortCircuit` wants it.
 */
export const AMBRON_GATES = freeze([
  freeze({ id: 'lake-gate', name: 'The Lake Gate', edge: 0, at: HALF_A + 56, kind: 'gate', face: 'north', a: 56 }),
  freeze({ id: 'north-water-gate', name: 'The North Water Gate', edge: 0, at: HALF_A, kind: 'water', face: 'north', a: 0, width: 46, causeway: 0 }),
  freeze({ id: 'ossen-gate', name: 'The Ossen Gate', edge: 1, at: HALF_B - 6, kind: 'gate', face: 'east', b: -6 }),
  freeze({ id: 'south-water-gate', name: 'The South Water Gate', edge: 2, at: HALF_A, kind: 'water', face: 'south', a: 0, width: 46, causeway: 0 }),
  freeze({ id: 'plain-gate', name: 'The Plain Gate', edge: 2, at: HALF_A - 56, kind: 'gate', face: 'south', a: 56 }),
  freeze({ id: 'raft-gate', name: 'The Raft Gate', edge: 3, at: HALF_B - 22, kind: 'gate', face: 'west', b: 22 }),
]);

/** Towers between the gates, so no curtain run stands much beyond thirty metres uncovered. */
export const AMBRON_EXTRA_TOWERS = freeze([
  { edge: 0, at: 32 }, { edge: 0, at: 172 },
  { edge: 1, at: 28 }, { edge: 1, at: 100 },
  { edge: 2, at: 22 }, { edge: 2, at: 140 }, { edge: 2, at: 162 },
  { edge: 3, at: 20 }, { edge: 3, at: 78 }, { edge: 3, at: 108 },
].map(freeze));

export const AMBRON_CIRCUIT = fortCircuit({
  id: 'ambron', kind: 'city', standard: AMBRON_STANDARD,
  corners: AMBRON_CORNERS.map(p => ({ x: p.x, z: p.z })),
  gates: AMBRON_GATES.map(gate => ({ id: gate.id, edge: gate.edge, at: gate.at, kind: gate.kind, width: gate.width, causeway: gate.causeway })),
  extraTowers: AMBRON_EXTRA_TOWERS.map(entry => ({ ...entry })),
});

export const AMBRON_LAND_GATES = freeze(AMBRON_GATES.filter(gate => gate.kind === 'gate'));
export const AMBRON_WATER_GATES = freeze(AMBRON_GATES.filter(gate => gate.kind === 'water'));

// ---------------------------------------------------------------------------
// The water through the city
// ---------------------------------------------------------------------------
/** The channel's own edges inside the walls: the quay faces, in the city frame. */
export const CHANNEL = freeze({ half: AMBRON.channelHalf, surface: 14.6,
  eastQuay: AMBRON.channelHalf, westQuay: -AMBRON.channelHalf });

/**
 * The causeway: seven arches on lake-stone piers carrying the main street over
 * the water. Its deck is level between the piers and ramps down to the made
 * ground of each bank, so a traveler walks straight across.
 */
export const CAUSEWAY = freeze({ b: 0, halfWidth: 4.2, deckY: 17.7, level: 24, foot: 32,
  piers: freeze([-1, -.6, -.2, .2, .6, 1].map(f => Math.round(f * AMBRON.channelHalf * 5 / 7 * 100) / 100)) });

/** The deck of the causeway under a world point, or null: `world.heightAt` asks this. */
export function ambronDeckHeight(x, z) {
  const a = x - AMBRON.centre.x, b = z - AMBRON.centre.z - CAUSEWAY.b;
  if (Math.abs(b) > CAUSEWAY.halfWidth || Math.abs(a) > CAUSEWAY.foot) return null;
  if (Math.abs(a) <= CAUSEWAY.level) return CAUSEWAY.deckY;
  const t = (Math.abs(a) - CAUSEWAY.level) / (CAUSEWAY.foot - CAUSEWAY.level);
  return lerp(CAUSEWAY.deckY, cityGround(a), t);
}
/** True on the causeway's lane, where the water below it must not block the way. */
export const onCauseway = (x, z, margin = 0) =>
  Math.abs(z - AMBRON.centre.z - CAUSEWAY.b) <= CAUSEWAY.halfWidth + margin && Math.abs(x - AMBRON.centre.x) <= CAUSEWAY.foot + margin;

/**
 * The chain, in the south water gate: a chain the thickness of a man's arm
 * between the two gate towers, and the capstan house on the east quay that winds
 * it. Nothing passes until the tally is signed.
 */
export const AMBRON_CHAIN = freeze({ b: HALF_B, halfSpan: 23, ringY: 16.4, sagY: 15.2,
  capstan: freeze({ a: 29, b: 58 }), tally: freeze({ a: 33, b: 50 }) });

/** The quays: paved aprons along both banks, with steps down to the water. */
export const AMBRON_QUAYS = freeze([
  freeze({ id: 'east-quay', name: 'The Barge Quay', from: 23, to: 34, minB: -62, maxB: 62, side: 1,
    steps: freeze([-40, -6, 30, 52]), cranes: freeze([-46, -14, 22, 44]) }),
  freeze({ id: 'west-quay', name: 'The Timber Strand', from: -34, to: -23, minB: -60, maxB: 60, side: -1,
    steps: freeze([-30, 10, 44]), cranes: freeze([-22, 26]) }),
]);

// ---------------------------------------------------------------------------
// Streets
// ---------------------------------------------------------------------------
const street = (id, width, layer, points) => freeze({ id, width, layer, points: freeze(points.map(([a, b]) => freeze({ a, b }))) });

/**
 * The streets, with the age of the stone under them. `layer` is which Ambron laid
 * it: `lake-stone` the first settlement by the water, `imperial` the high periods,
 * `patched` the contractions, `new` what has been relaid since the last siege.
 */
export const AMBRON_STREETS = freeze([
  street('causeway-street', 8, 'imperial', [[-23, -6], [23, -6], [56, -6], [92, -6]]),
  street('ela-street', 8, 'imperial', [[56, -66], [56, -6], [56, 66]]),
  street('quay-street', 7, 'lake-stone', [[30, -58], [30, -6], [30, 48]]),
  street('toll-lane', 5, 'lake-stone', [[34, 40], [60, 40], [80, 40]]),
  street('upper-lane', 5, 'new', [[34, -40], [60, -40], [88, -40]]),
  street('strand-street', 6, 'patched', [[-32, -52], [-32, -6], [-32, 52]]),
  street('raft-street', 6, 'patched', [[-58, -64], [-58, -6], [-58, 64]]),
  street('raft-way', 6.5, 'patched', [[-23, -6], [-46, -6], [-64, -2], [-80, 8], [-92, 22]]),
  street('strand-lane', 4, 'patched', [[-86, 40], [-58, 40], [-38, 40]]),
]);

/** The market of the narrows: the widened part of the causeway street, and where it is fought over if it ever is. */
export const AMBRON_MARKET = freeze({ minA: 34, maxA: 60, minB: -20, maxB: 4 });
/** The plaza before the Lord Marshal's Seat. */
export const SEAT_COURT = freeze({ minA: 60, maxA: 62, minB: 3, maxB: 33 });

// ---------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------
/**
 * `a`/`b` centre, `w` along a, `d` along b, `h` to the eaves. `layer` is the age
 * of the building; `door` the face its door is on; `kind` changes how it is drawn.
 */
const building = entry => freeze({ layer: 'imperial', kind: 'house', door: 'north', ...entry });

export const AMBRON_BUILDINGS = freeze([
  // The east bank: the old city, the administration and the toll.
  building({ id: 'toll-house', name: 'The Toll House', a: 43, b: 54, w: 16, d: 18, h: 9.5, layer: 'imperial', kind: 'hall', door: 'north' }),
  building({ id: 'chain-house', name: 'The Capstan House', a: 29, b: 58, w: 10, d: 11, h: 6, layer: 'lake-stone', door: 'north' }),
  building({ id: 'warehouse-1', a: 43, b: -54, w: 16, d: 18, h: 7.5, kind: 'warehouse', door: 'west' }),
  building({ id: 'warehouse-2', a: 43, b: -30, w: 16, d: 12, h: 7, kind: 'warehouse', door: 'west' }),
  building({ id: 'harbour-inn', name: 'The Chain and Sledge', a: 43, b: 14, w: 16, d: 16, h: 8, layer: 'patched', door: 'west' }),
  building({ id: 'warehouse-3', a: 43, b: 32, w: 16, d: 10, h: 7, kind: 'warehouse', door: 'west' }),
  building({ id: 'record-house', name: 'The Record House', a: 71, b: -54, w: 18, d: 18, h: 8, kind: 'hall', door: 'south' }),
  building({ id: 'house-ne', name: "Ben's home", a: 85, b: -54, w: 8, d: 18, h: 6.5, layer: 'new', door: 'south' }),
  building({ id: 'lake-temple', name: 'The House of the Lake', a: 70, b: -24, w: 14, d: 22, h: 8.5, layer: 'lake-stone', kind: 'temple', door: 'west' }),
  building({ id: 'clerks-house', a: 84, b: -24, w: 10, d: 22, h: 7, layer: 'patched' }),
  building({ id: 'legate-seat', name: 'The Lord Marshal’s Seat', a: 75, b: 18, w: 28, d: 30, h: 11.5, layer: 'imperial', kind: 'seat', door: 'west' }),
  building({ id: 'lake-granary', name: 'The Lake Granary', a: 71, b: 54, w: 18, d: 18, h: 10.5, kind: 'granary', door: 'west' }),
  building({ id: 'house-se', a: 85, b: 54, w: 8, d: 18, h: 6.5, layer: 'new' }),
  // The west bank: the timber strand, newer, poorer and working.
  building({ id: 'raft-shed', name: 'The Raft Shed', a: -45, b: -54, w: 14, d: 18, h: 6, layer: 'new', kind: 'shed', door: 'east' }),
  building({ id: 'sawpit-shed', a: -45, b: -26, w: 14, d: 16, h: 5.5, layer: 'patched', kind: 'shed', door: 'east' }),
  building({ id: 'salt-house', name: 'The Salt House', a: -45, b: 14, w: 14, d: 22, h: 6.5, layer: 'patched', kind: 'warehouse', door: 'east' }),
  building({ id: 'strand-store', a: -45, b: 52, w: 14, d: 18, h: 6, layer: 'new', kind: 'warehouse', door: 'east' }),
  building({ id: 'ropewalk', name: 'The Ropewalk', a: -75, b: -50, w: 20, d: 26, h: 5, layer: 'patched', kind: 'shed', door: 'east' }),
  building({ id: 'poor-row-1', name: "Troy's home", a: -75, b: -22, w: 20, d: 20, h: 5, layer: 'patched', kind: 'row', door: 'east' }),
  building({ id: 'boatyard', name: 'The Lake Boatyard', a: -71, b: 22, w: 14, d: 20, h: 6.5, layer: 'new', kind: 'shed', door: 'east' }),
  building({ id: 'poor-row-2', a: -75, b: 52, w: 20, d: 18, h: 4.8, layer: 'patched', kind: 'row', door: 'east' }),
  // The armourer's forge, in the gap between the poor row and the boatyard, fronting the raft
  // way. A forge is fire and hammering, so it stands on the working bank and not among the
  // granaries: the plot was measured rather than chosen (see AMBRON_FORGE below).
  building({ id: 'ambron-forge', name: 'The Strand Forge', a: -78, b: -3, w: 9, d: 7, h: 5.2, layer: 'patched', kind: 'shed', door: 'south' }),
]);

/**
 * The Outside: the straggle of houses along the haul road below the Plain Gate,
 * where the city overflows its walls in the fat decades and stands roofless in
 * the thin ones. Three of these are roofless and two have been re-roofed since.
 * `b` is metres south of the wall line; `side` which side of the road.
 */
export const AMBRON_OUTSIDE = freeze([
  freeze({ id: 'out-1', a: 72, b: 84, w: 10, d: 9, h: 5.4, state: 'kept' }),
  freeze({ id: 'out-2', a: 72, b: 100, w: 9, d: 8, h: 5, state: 'roofless' }),
  freeze({ id: 'out-3', a: 72, b: 116, w: 11, d: 9, h: 5.2, state: 'kept' }),
  freeze({ id: 'out-4', a: 40, b: 88, w: 10, d: 9, h: 5.2, state: 'roofless' }),
  freeze({ id: 'out-5', a: 38, b: 106, w: 9, d: 9, h: 4.8, state: 'reroofed' }),
  freeze({ id: 'out-6', a: 36, b: 126, w: 11, d: 9, h: 5.4, state: 'kept' }),
  freeze({ id: 'out-7', a: 70, b: 134, w: 9, d: 8, h: 4.8, state: 'roofless' }),
  freeze({ id: 'out-8', a: 34, b: 146, w: 10, d: 9, h: 5, state: 'reroofed' }),
]);

/** Market stalls round the widened street, and the well at its middle. */
export const AMBRON_STALLS = freeze([[36, -18], [36, -12], [36, 2], [44, -18], [50, -18], [44, 2], [50, 2]]
  .map(([a, b], index) => freeze({ id: `stall-${index + 1}`, a, b })));
export const AMBRON_WELL = freeze({ a: 47, b: -16, r: 1.9 });
/**
 * The Physic Garden of the Record House: the city's own beds of plants, kept by the
 * botanist, with a stone-cutter's specimen wall along its north side and a dovecote
 * and pigeon loft over its gate. Ambron has a specialist for everything; this is
 * where four of them work. Walled on three sides, open to Ela Street in the west.
 */
export const PHYSIC_GARDEN = freeze({
  minA: 64, maxA: 86, minB: 34, maxB: 44,
  beds: freeze([[68, 36.2], [68, 41.8], [74, 36.2], [74, 41.8], [80, 36.2], [80, 41.8]].map(([a, b]) => freeze({ a, b }))),
  // Three trees, in the corners, clear of the walk down the middle between the beds.
  trees: freeze([[65.4, 35.4], [84.4, 36.4], [84.4, 41.6]].map(([a, b]) => freeze({ a, b }))),
  specimenWall: freeze({ a: 76, b: 34.6 }), dovecote: freeze({ a: 85, b: 39 }),
});

/** The lake gauge cut into the east quay: a limewashed post with the flood years on it. */
export const AMBRON_GAUGE = freeze({ a: 24.5, b: 20 });
/** Where the sledges and ice-road stakes are stacked all summer, against the granary wall. */
export const AMBRON_SLEDGES = freeze({ a: 62.5, b: 48 });

// ---------------------------------------------------------------------------
// Colliders
// ---------------------------------------------------------------------------
const box = (a0, a1, b0, b1, kind, extra = {}) => {
  const c = P((a0 + a1) / 2, (b0 + b1) / 2);
  return freeze({ x: c.x, z: c.z, hx: Math.abs(a1 - a0) / 2, hz: Math.abs(b1 - b0) / 2, kind, ...extra });
};

/** Everything of the city that a traveler cannot walk through. */
export function ambronColliders() {
  const out = [...AMBRON_CIRCUIT.colliders.map(collider => freeze({ ...collider }))];
  for (const entry of AMBRON_BUILDINGS)
    out.push(box(entry.a - entry.w / 2, entry.a + entry.w / 2, entry.b - entry.d / 2, entry.b + entry.d / 2, 'ambron-building', { id: entry.id }));
  for (const entry of AMBRON_OUTSIDE)
    out.push(box(entry.a - entry.w / 2, entry.a + entry.w / 2, entry.b - entry.d / 2, entry.b + entry.d / 2, 'ambron-suburb', { id: entry.id }));
  for (const stall of AMBRON_STALLS) out.push(box(stall.a - 1.5, stall.a + 1.5, stall.b - 1.1, stall.b + 1.1, 'market-stall'));
  out.push(freeze({ ...P(AMBRON_WELL.a, AMBRON_WELL.b), r: AMBRON_WELL.r + .2, kind: 'ambron-well' }));
  out.push(box(AMBRON_CHAIN.capstan.a - 2.4, AMBRON_CHAIN.capstan.a + 2.4, AMBRON_CHAIN.capstan.b - 2.4, AMBRON_CHAIN.capstan.b + 2.4, 'ambron-capstan'));
  // The physic garden's three walls; its fourth side is open to the street.
  out.push(box(PHYSIC_GARDEN.minA, PHYSIC_GARDEN.maxA, PHYSIC_GARDEN.minB - .3, PHYSIC_GARDEN.minB + .3, 'garden-wall'));
  out.push(box(PHYSIC_GARDEN.minA, PHYSIC_GARDEN.maxA, PHYSIC_GARDEN.maxB - .3, PHYSIC_GARDEN.maxB + .3, 'garden-wall'));
  out.push(box(PHYSIC_GARDEN.maxA - .3, PHYSIC_GARDEN.maxA + .3, PHYSIC_GARDEN.minB, PHYSIC_GARDEN.maxB, 'garden-wall'));
  for (const bed of PHYSIC_GARDEN.beds) out.push(box(bed.a - 2.2, bed.a + 2.2, bed.b - 1.5, bed.b + 1.5, 'garden-bed'));
  for (const tree of PHYSIC_GARDEN.trees) out.push(freeze({ ...P(tree.a, tree.b), r: .4, kind: 'garden-tree' }));
  // The causeway's parapets: the deck is the only walkable line over the water. They
  // reach a metre past each quay face and no further, so the quays stay walkable.
  const parapet = CHANNEL.half + 1;
  for (const side of [-1, 1]) out.push(box(-parapet, parapet, CAUSEWAY.b + side * (CAUSEWAY.halfWidth + .3) - .25, CAUSEWAY.b + side * (CAUSEWAY.halfWidth + .3) + .25, 'causeway-parapet'));
  return freeze(out);
}

// ---------------------------------------------------------------------------
// Who stands where
// ---------------------------------------------------------------------------
const NORTH = Math.PI, SOUTH = 0, EAST = Math.PI / 2, WEST = -Math.PI / 2;
const stand = (a, b, yaw) => freeze({ ...P(a, b), a, b, yaw });

/**
 * **The capital's forge, and the spot at its door** (`AMBRON_ARMOURER_NPC`, `src/smith.js`).
 *
 * The plot was swept rather than chosen. Every metre inside the walls was scored for a seven-
 * by-six shed that keeps three metres clear of everything already drawn, stands off every street
 * corridor but within sight of one, and leaves standable ground at its door: **the east bank
 * offers nothing at all** — the old city is full of warehouses, halls and the physic garden — and
 * every plot that passes is on the timber strand. That is the right answer for a forge anyway.
 * This one sits in the twenty-four-metre gap between the poor row and the boatyard, nine metres
 * clear of each, with the raft way climbing past its door to the Raft Gate.
 *
 * He stands 2.4 m out from the south face, facing the street with his forge behind him, a pace
 * clear of the carriageway. Measured: 6 m of standable ground all round him.
 */
const FORGE_PLOT = AMBRON_BUILDINGS.find(entry => entry.id === 'ambron-forge');
export const AMBRON_FORGE = freeze({ ...FORGE_PLOT, ...P(FORGE_PLOT.a, FORGE_PLOT.b),
  stand: stand(FORGE_PLOT.a, FORGE_PLOT.b + FORGE_PLOT.d / 2 + 2.4, SOUTH) });

/** Stands in the city's frame. Who each of them is, is in `src/ambron-people.js`. */
export const AMBRON_STANDS = freeze({
  // The toll, at the chain and over it
  'ambron-toll-clerk': stand(43, 43, NORTH),
  'ambron-tally-boy': stand(33, 43, EAST),
  'ambron-chainman': stand(29, 50, NORTH),
  'ambron-bargemaster': stand(31, 36, WEST),
  'ambron-bargewoman': stand(31, 22, WEST),
  // The empire's own
  'ambron-legate': stand(57, 18, EAST),
  'ambron-adjutant': stand(57, 27, EAST),
  'ambron-scrivener': stand(59, -50, EAST),
  'ambron-gate-optio': stand(56, 60, SOUTH),
  'ambron-gate-legionary': stand(60.5, 62, SOUTH),
  'ambron-lake-gate-guard': stand(56, -60, NORTH),
  'ambron-causeway-legionary': stand(26, -2, WEST),
  // The revolution, one day old
  'ambron-committee': stand(52, -14, EAST),
  'ambron-printer': stand(47, -3, NORTH),
  // The market and the lake country
  'ambron-fishwife': stand(38, -8, EAST),
  'ambron-grain-factor': stand(56.5, -13, WEST),
  'ambron-farmer': stand(52, -20, SOUTH),
  'ambron-farmwife': stand(56.5, -24, WEST),
  'ambron-brul-fisher': stand(31, -30, WEST),
  'ambron-ice-warden': stand(33, -46, EAST),
  // The west bank
  'ambron-raftsman': stand(-31, 20, EAST),
  'ambron-sawyer': stand(-36, -26, WEST),
  'ambron-ropewalker': stand(-63, -34, EAST),
  // The specialists: Ambron keeps one of everybody, and these five teach what
  // Drent's own people teach (src/ambron-people.js).
  'ambron-aviarist': stand(63, -42, SOUTH),
  'ambron-fishmaster': stand(33, 16, WEST),
  'ambron-mushroomer': stand(40, 1, NORTH),
  'ambron-botanist': stand(70, 39, WEST),
  'ambron-stonecutter': stand(-36, -46, WEST),
  // The ones the toll does not reach
  'ambron-beggar': stand(25.5, 6, EAST),
  'ambron-widow': stand(-63, 44, EAST),
});

/**
 * Ambron for the autopilot: a walled place entered only by its four land gates.
 * The water gates are not ways in, and the causeway is inside the walls.
 */
const REACH_A = HALF_A - AMBRON_STANDARD.wallThickness / 2, REACH_B = HALF_B - AMBRON_STANDARD.wallThickness / 2;
export const AMBRON_ENCLOSURE = freeze({
  id: 'ambron', name: AMBRON.name,
  contains: (x, z) => Math.abs(x - AMBRON.centre.x) < REACH_A && Math.abs(z - AMBRON.centre.z) < REACH_B,
  gates: freeze(AMBRON_LAND_GATES.map(gate => {
    const g = AMBRON_CIRCUIT.gates.find(entry => entry.id === gate.id);
    const reach = AMBRON_STANDARD.wallThickness / 2 + AMBRON_STANDARD.berm + AMBRON_STANDARD.ditchWidth + 8;
    return freeze({ id: gate.id,
      outer: point(g.centre.x - g.inward.x * reach, g.centre.z - g.inward.z * reach),
      inner: point(g.centre.x + g.inward.x * 11, g.centre.z + g.inward.z * 11) });
  })),
});

export { AMBRON, ambronPoint, P as ambronLocal };
