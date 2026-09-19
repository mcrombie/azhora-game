/**
 * The Ambroni outpost on the Moros Plain: the army's timber fort at the exact
 * centre of the plain, built to the shared fortification standard.
 *
 * Everything here is measured from the camp's centre (`STORY_SITES.legionCamp`,
 * where the main road's vertex is) in world metres: +x east, +z south. The
 * road comes in from the north-east through the main gate, crosses the parade
 * ground and leaves by the rear gate in the west wall. The north-east face is
 * set square to that road, so everything north round to east of the gate, where
 * the day after the border battle is fought, lies outside the ditch.
 * Pure: no three, no DOM.
 */
import { MAIN_ROAD, STORY_SITES, SOLIS_ROAD } from './region-world.js';
import { fortCircuit, FORT_STANDARD } from './fortification.js';

export const OUTPOST_CENTRE = Object.freeze({ x: STORY_SITES.legionCamp.x, z: STORY_SITES.legionCamp.z });
const centreIndex = MAIN_ROAD.findIndex(p => Math.hypot(p.x - OUTPOST_CENTRE.x, p.z - OUTPOST_CENTRE.z) < .01);
const unit = (a, b) => { const l = Math.hypot(b.x - a.x, b.z - a.z); return { x: (b.x - a.x) / l, z: (b.z - a.z) / l }; };
/** The road toward the north-east gate, and on toward the west gate. */
export const OUTPOST_ROAD = Object.freeze({
  east: Object.freeze(unit(OUTPOST_CENTRE, MAIN_ROAD[centreIndex - 1])),
  west: Object.freeze(unit(OUTPOST_CENTRE, MAIN_ROAD[centreIndex + 1])),
});
/** A point `dx` east and `dz` south of the camp's centre. */
export const campPoint = (dx, dz) => Object.freeze({ x: OUTPOST_CENTRE.x + dx, z: OUTPOST_CENTRE.z + dz });
/** A point `along` the north-east road from the centre and `across` it (positive to the south-east). */
export const gateRoadPoint = (along, across = 0) => {
  const u = OUTPOST_ROAD.east, n = { x: -u.z, z: u.x };
  return campPoint(u.x * along + n.x * across, u.z * along + n.z * across);
};

/** How far along the north-east road the main gate stands. The ditch beyond it ends 6.5 m further out. */
export const MAIN_GATE_ALONG = 21;
const NORTH = -38, SOUTH = 34, WEST = -60, EAST = 40;
const chamferX = z => (MAIN_GATE_ALONG - z * OUTPOST_ROAD.east.z) / OUTPOST_ROAD.east.x;
const chamferZ = x => (MAIN_GATE_ALONG - x * OUTPOST_ROAD.east.x) / OUTPOST_ROAD.east.z;
const westGateZ = WEST * OUTPOST_ROAD.west.z / OUTPOST_ROAD.west.x;

const corners = [campPoint(WEST, NORTH), campPoint(chamferX(NORTH), NORTH), campPoint(EAST, chamferZ(EAST)), campPoint(EAST, SOUTH), campPoint(WEST, SOUTH)];
const along = (i, point) => Math.hypot(point.x - corners[i].x, point.z - corners[i].z);
const edgeLength = i => along(i, corners[(i + 1) % corners.length]);

/** The palisade circuit: north wall, the north-east face with the main gate, east, south, and the west wall with the rear gate. */
export const OUTPOST_CIRCUIT = fortCircuit({
  id: 'outpost', kind: 'palisade', corners,
  gates: [
    { id: 'outpost-main-gate', kind: 'main', edge: 1, at: along(1, gateRoadPoint(MAIN_GATE_ALONG)) },
    { id: 'outpost-rear-gate', kind: 'rear', edge: 4, at: along(4, campPoint(WEST, westGateZ)) },
  ],
  extraTowers: [{ edge: 0, at: edgeLength(0) / 2 }, { edge: 3, at: edgeLength(3) / 3 }, { edge: 3, at: edgeLength(3) * 2 / 3 }],
});

/** Ground the outpost owns, for scatter and for the tests: the circuit, its ditch and a margin. */
export const OUTPOST_CLEARING = Object.freeze({ ...campPoint(-10, -2), r: 82 });

const tent = (dx, dz, size = 'contubernium') => Object.freeze({ ...campPoint(dx, dz), size, hx: size === 'contubernium' ? 2.3 : 3.1, hz: size === 'contubernium' ? 2.7 : 2.2 });
/** The interior, in the order a visitor from the main gate meets it. */
export const OUTPOST_LAYOUT = Object.freeze({
  parade: Object.freeze({ ...gateRoadPoint(9), radius: 14 }),
  tribunal: Object.freeze({ ...campPoint(2.5, -18), hx: 1.7, hz: 1.3 }),
  command: Object.freeze({ ...campPoint(6, 20), hx: 4.5, hz: 5.6 }),
  standard: Object.freeze(campPoint(12.5, 14.5)),
  stores: Object.freeze({ ...campPoint(-16, -12), hx: 3.1, hz: 2.2 }),
  smithy: Object.freeze({ ...campPoint(-30, -10), hx: 3.6, hz: 2.6 }),
  forge: Object.freeze(campPoint(-31.5, -11)),
  granary: Object.freeze({ ...campPoint(15, 5), hx: 2.2, hz: 1.7 }),
  well: Object.freeze(campPoint(-40, -6.5)),
  trough: Object.freeze({ ...campPoint(-23, -24), hx: 1.3, hz: .4 }),
  hay: Object.freeze(campPoint(-26, -30)),
  mess: Object.freeze({ awning: campPoint(-16, 18.8), benches: Object.freeze([campPoint(-18.7, 12.6), campPoint(-13.3, 12.6), campPoint(-16, 15)]) }),
  tents: Object.freeze([
    // North-west lines
    ...[-52, -45.5, -39].flatMap(dx => [tent(dx, -30), tent(dx, -21)]),
    // South-west lines
    ...[-52, -45.5, -39, -32.5].flatMap(dx => [tent(dx, 16.5), tent(dx, 25.5)]),
    // South-east lines, beside the Marshal's tent
    tent(19, 18), tent(25.5, 18), tent(19, 27), tent(25.5, 27), tent(32, 27),
  ]),
  /** Stairs up to the wall walk, inside the wall beside each gate. */
  stairs: Object.freeze([]),
});

/** The working places, registered like every other bench and fire (see `region-world.js`). */
export const OUTPOST_BENCH = Object.freeze({ id: 'outpost-repair', ...campPoint(-25, -5), name: 'Outpost smithy repair bench' });
export const OUTPOST_FIRE = Object.freeze({ id: 'outpost-fire', ...campPoint(-16, 10.4), fireX: campPoint(-16, 12).x, fireZ: campPoint(-16, 12).z });

/** The ground inside each gate that must stay open: the gate passage continued inward. */
export function outpostGateApproaches() {
  return OUTPOST_CIRCUIT.gates.map(gate => ({ id: gate.id, ...OUTPOST_CIRCUIT.passage(gate.id) }));
}

/**
 * Walled places the autopilot must leave and enter by their gates, in the shape
 * `world.enclosures` takes (see src/autopilot.js): the outpost, and the forward
 * stockade on the border.
 */
export const enclosureOf = (circuit, id, name) => Object.freeze({
  id, name,
  // Inside means behind the wall line, as it does for Solis. The berm and the ditch
  // are outside: a traveler who fought in front of the wall leaves by walking away,
  // not by being marched through the masonry to the gate's inner end.
  contains: (x, z) => circuit.outward(x, z) < 0,
  gates: Object.freeze(circuit.gates.map(gate => {
    // `passage` walks from beyond the ditch (`from`) to well inside the wall (`to`).
    const walk = circuit.passage(gate.id, 14);
    return Object.freeze({ id: gate.id, outer: Object.freeze({ x: walk.from.x, z: walk.from.z }), inner: Object.freeze({ x: walk.to.x, z: walk.to.z }) });
  })),
});

export { FORT_STANDARD };

// ---------------------------------------------------------------------------
// The forward stockade on the border: a smaller work to the same pattern
// ---------------------------------------------------------------------------
export const STOCKADE_CENTRE = Object.freeze({ x: STORY_SITES.morosStockade.x, z: STORY_SITES.morosStockade.z });
const stockadePoint = (dx, dz) => Object.freeze({ x: STOCKADE_CENTRE.x + dx, z: STOCKADE_CENTRE.z + dz });
/**
 * One gate, in the south face where the road to Solis leaves the stockade's
 * yard, a tower at each corner, the ditch and a wall walk all round. The track
 * up from the Moros road comes round the west side to that gate.
 */
const solisLeg = (() => { const a = SOLIS_ROAD[0], b = SOLIS_ROAD[1], l = Math.hypot(b.x - a.x, b.z - a.z); return { x: (b.x - a.x) / l, z: (b.z - a.z) / l }; })();
const STOCKADE_HALF = 8;
/** Where the Solis road crosses the south wall line, measured from the south-east corner along the south face. */
const southGateAt = STOCKADE_HALF - solisLeg.x * STOCKADE_HALF / solisLeg.z;
export const STOCKADE_CIRCUIT = fortCircuit({
  id: 'stockade', kind: 'stockade',
  corners: [stockadePoint(-8, -8), stockadePoint(8, -8), stockadePoint(8, 8), stockadePoint(-8, 8)],
  gates: [{ id: 'stockade-gate', kind: 'main', edge: 2, at: southGateAt, towers: false }],
  standard: { wallThickness: 3.0, towerSize: 3.4, towerProjection: 0 },
});
/** Outside the south gate, on the Solis road: where the track from the Moros road joins it. */
export const STOCKADE_APPROACH = Object.freeze(stockadePoint(solisLeg.x * 16, solisLeg.z * 16));
export const STOCKADE_TRACK_BEND = Object.freeze(stockadePoint(-15, 17));
export const STOCKADE_LAYOUT = Object.freeze({
  truce: stockadePoint(-3.6, 2.4),
  notice: stockadePoint(-4, -3.6),
  shelter: stockadePoint(3.4, -3.6),
});
export const STOCKADE_CLEARING = Object.freeze({ ...STOCKADE_CENTRE, r: 18 });
