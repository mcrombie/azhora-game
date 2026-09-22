/**
 * The built-up places of Drent and Luscia: what the towns-and-signs pass adds
 * round each place's existing people, sites and colliders.
 *
 * Every place is laid out in its own frame on top of the world metres the rest
 * of the tree already uses: offsets from the Avrel clearing's centre, Lumber
 * Town's along/across frame, the Lauvel field, the burned hamlet, the Caloss
 * crossing. Nothing here moves an existing stand. Pure: no three, no DOM.
 */
import {
  AVREL_CLEARING, CALOSS, CALOSS_GATE, FERNWAY_REST, LUMBER_TOWN, LUMBER_TOWN_STABLE, STORY_SITES, townPoint,
} from './region-world.js';
import { toWorld } from './world-scale.js';

const P = (x, z, extra = {}) => Object.freeze({ x, z, ...extra });
const offset = origin => (dx, dz, extra = {}) => P(origin.x + dx, origin.z + dz, extra);
const roadYaw = Math.atan2(LUMBER_TOWN.along.x, LUMBER_TOWN.along.z);
/** A point in Nothom's frame with a yaw that faces its front toward the road. */
const town = (a, b, extra = {}) => { const p = townPoint(a, b); return P(p.x, p.z, { yaw: Math.atan2(Math.sign(b || 1) * LUMBER_TOWN.across.x, Math.sign(b || 1) * LUMBER_TOWN.across.z), a, b, ...extra }); };

export const avrel = offset(AVREL_CLEARING);
export const lauvel = offset(STORY_SITES.lauvelField);
export const hamlet = offset(STORY_SITES.burnedHamlet);
export const crossing = offset(CALOSS.crossing);
export const SHRINE_CENTRE = Object.freeze(toWorld(-374, 134));
export const RELAY_CENTRE = Object.freeze(toWorld(-401, 196));
export const LANDING_CENTRE = Object.freeze(toWorld(-372, 116));
const shrine = offset(SHRINE_CENTRE), relay = offset(RELAY_CENTRE), landing = offset(LANDING_CENTRE);

// ---------------------------------------------------------------------------
// Drent
// ---------------------------------------------------------------------------
/** The Avrel farm hamlet round the clearing's existing cottage, mill, fields and Corvan's post. East is along the road toward Tidehaven. */
export const AVREL_HAMLET = Object.freeze({
  barn: avrel(29, -25, { yaw: 0, width: 10, depth: 7 }),
  byre: avrel(46, -15, { yaw: Math.PI / 2, width: 8, depth: 5.5 }),
  stackYard: avrel(46, -33, { radius: 7 }),
  // Dry-stone walls along the far sides of the three fields, leaving their road sides and the parcels open.
  fieldWalls: Object.freeze([
    [avrel(-38, 23), avrel(-38, 40)], [avrel(-38, 40), avrel(-14, 40)],
    [avrel(20, 36), avrel(41, 36)], [avrel(41, 36), avrel(41, 17)],
    [avrel(-42, -28), avrel(-42, -8)],
  ]),
  corvanPost: avrel(4, -8, { yaw: 0 }),
  well: avrel(21, 26),
});

/**
 * Tidehaven's forest gate: a roofed timber gatehouse over the old field gate,
 * its upper room carried on the gate's own posts and a second pair behind the
 * leaves, and a guard hut on the Avrel side.
 */
export const CALOSS_GATEHOUSE = Object.freeze({
  front: CALOSS_GATE.barrierX, back: CALOSS_GATE.barrierX - 5, half: 3.8, z: CALOSS_GATE.z,
  hut: P(CALOSS_GATE.barrierX - 10, CALOSS_GATE.z + 12.5, { yaw: Math.PI }),
});

/** Fernway Rest: a timber shelter with a bench inside, on the north side of the road across from the old bench. */
export const FERNWAY_SHELTER = P(FERNWAY_REST.x - 8, FERNWAY_REST.z + 2, { yaw: 0 });

// ---------------------------------------------------------------------------
// Luscia
// ---------------------------------------------------------------------------
/** The Caloss crossing camp on the Luscian bank: Chip's timber yard and the ferryman's hut by the water. */
export const CROSSING_CAMP = Object.freeze({
  timber: Object.freeze([crossing(-32, 13, { yaw: .7 }), crossing(-26.6, 8.6, { yaw: .7 })]),
  sawhorses: crossing(-33.4, 6.7, { yaw: .7 }),
  ferryHut: crossing(17, 35, { yaw: -2.2 }),
  jetty: crossing(26, 30, { yaw: -2.2 }),
});

/** The reedcutters' landing: drying racks, reed stacks and a punt carried up from the water. */
export const REED_LANDING = Object.freeze({
  racks: Object.freeze([landing(-8, -10, { yaw: .4 }), landing(-15, -5, { yaw: .4 })]),
  stacks: Object.freeze([landing(-3, -13), landing(-20, -11), landing(-22, -3)]),
  punt: landing(-12, -17, { yaw: 1.1 }),
});

/** Sava's shrine in a walled court, open to the west where the road passes, with offerings on its step. */
export const SHRINE_COURT = Object.freeze({ centre: shrine(-1.5, 1.5), width: 13, depth: 11, open: 'west', returnsStop: 5.2 });

/** The old relay hut: a fenced yard, a mast and a notice left behind when the clerk moved to town. */
export const RELAY_YARD = Object.freeze({
  mast: relay(9, -4), notice: relay(6, 8, { yaw: -Math.PI / 2 }),
  fence: Object.freeze([relay(-14, -8), relay(-14, 10), relay(-4, 14)]),
});

/** More of the field at the Lauvel: a field hospital, a cairn for the unclaimed, and trampled ground. */
export const LAUVEL_AFTERMATH = Object.freeze({
  hospital: lauvel(-31, -4, { yaw: Math.PI / 2, width: 9, depth: 5.5 }),
  cairn: lauvel(19, 19),
  trampled: Object.freeze([lauvel(-8, -14), lauvel(9, 6), lauvel(-15, 20), lauvel(20, -10)]),
  debris: Object.freeze([lauvel(-10, -18), lauvel(6, -16), lauvel(14, 9), lauvel(-20, 12), lauvel(24, -3), lauvel(-4, 24)]),
});

/** The burned hamlet: fallen roof timbers in the shells, a well and a scorched orchard. */
export const HAMLET_RUINS = Object.freeze({
  // Four roofless shells round the yard, clear of the track that comes in from the west.
  houses: Object.freeze([hamlet(2, -11, { width: 6.4, depth: 5, chimney: true }), hamlet(9, -.5, { width: 5, depth: 6 }),
    hamlet(2.5, 11, { width: 6, depth: 5, chimney: true }), hamlet(-10, -10, { width: 5.5, depth: 4.6 })]),
  well: hamlet(-7, 6),
  orchard: Object.freeze(Array.from({ length: 12 }, (_, i) => hamlet(14 + (i % 4) * 5.5, -12 + Math.floor(i / 4) * 7 + (i % 2) * .8))),
});

/**
 * Nothom grown along its road: palisade gates at either end, a smithy and
 * a hall, washing lines, carts and a notice board, and the ostler's stable yard
 * dressed round the stand the ostler already has.
 */
export const LUMBER_TOWN_WORKS = Object.freeze({
  gates: Object.freeze([town(-46, -1.2, { id: 'north' }), town(40, -.7, { id: 'south' })]),
  smithy: town(-30, -11.5, { width: 7, depth: 5 }),
  hall: town(-36, 11.5, { width: 10, depth: 6 }),
  notice: town(-12, -4.2),
  carts: Object.freeze([town(-21, -4.8, { yaw: roadYaw + .2 }), town(15, 23.5, { yaw: roadYaw + 1.4 })]),
  washing: Object.freeze([[town(11, -19.5), town(19, -17.5)], [town(-17, 17.5), town(-9, 19.5)]]),
  stable: town(29, 20.5, { width: 9, depth: 5 }),
  trough: town(34.5, 12.5),
  rail: town(19.5, 17.5),
  paddock: Object.freeze([town(24, 24), town(40, 24), town(40, 34), town(24, 34)]),
});
export const STABLE_CLEARANCE = 6;
export { LUMBER_TOWN_STABLE };

// ---------------------------------------------------------------------------
// Stands, landmarks and clearings
// ---------------------------------------------------------------------------
/** Where the new townsfolk and workers stand. Each is at least 4 m from anyone the quests use. */
export const PLACE_STANDS = Object.freeze({
  'life-avrel-farmer': avrel(19, 15, { yaw: -2.4 }),
  'life-town-smith': town(-24.5, -6.5, { yaw: .9 }),
  'life-town-hall': town(-32.5, 6.5, { yaw: -2.2 }),
  'life-town-watch-north': town(-43.5, -6.2, { yaw: 1.2 }),
  'life-crossing-ferryman': crossing(12, 30, { yaw: .9 }),
  'life-lauvel-healer': lauvel(-25.5, -3, { yaw: -1.2 }),
});

export const PLACE_LANDMARKS = Object.freeze([
  Object.freeze({ id: 'avrel-hamlet', name: 'The Avrel Farmsteads', ...avrel(34, -20), radius: 12,
    description: 'A barn, a byre and a stack yard behind dry-stone walls: the Avrel families farm what the forest lets them keep.' }),
  Object.freeze({ id: 'crossing-ferry', name: 'The Ferryman’s Hut', ...CROSSING_CAMP.ferryHut, radius: 9,
    description: 'Before the bridge there was a ferry, and the ferryman never left. His boat is still tied up for when the bridge is not.' }),
  Object.freeze({ id: 'lauvel-hospital', name: 'The Field Hospital', ...LAUVEL_AFTERMATH.hospital, radius: 9,
    description: 'A patched tent at the edge of the field. Whoever was still breathing after the Lauvel was carried here, whichever side they fought on.' }),
  Object.freeze({ id: 'lauvel-cairn', name: 'The Cairn of the Unclaimed', ...LAUVEL_AFTERMATH.cairn, radius: 6,
    description: 'A heap of field stones over the dead nobody came to name. People passing add a stone.' }),
  Object.freeze({ id: 'lumber-town-hall', name: 'Nothom Hall', ...LUMBER_TOWN_WORKS.hall, radius: 8,
    description: 'The town’s hall and chapel in one: quarrels settled at one end, prayers said at the other, and a bell over both.' }),
]);

/** Ground each place keeps clear of the regional scatter. */
export const PLACE_CLEARINGS = Object.freeze([
  Object.freeze({ ...avrel(38, -22), r: 20 }), Object.freeze({ ...avrel(-40, 28), r: 10 }), Object.freeze({ ...avrel(-44, -18), r: 10 }),
  Object.freeze({ x: CALOSS_GATE.barrierX - 6, z: CALOSS_GATE.z + 6, r: 14 }),
  Object.freeze({ ...crossing(-28, 16), r: 12 }), Object.freeze({ ...crossing(18, 32), r: 12 }),
  Object.freeze({ ...landing(-11, -9), r: 14 }),
  Object.freeze({ ...SHRINE_COURT.centre, r: 10 }),
  Object.freeze({ ...relay(0, 2), r: 18 }),
  Object.freeze({ ...lauvel(-31, -4), r: 9 }), Object.freeze({ ...lauvel(19, 19), r: 6 }),
  Object.freeze({ ...hamlet(22, -5), r: 16 }),
  Object.freeze({ ...townPoint(-40, 0), r: 22 }), Object.freeze({ ...townPoint(34, 12), r: 20 }), Object.freeze({ ...townPoint(40, -8), r: 14 }),
]);
