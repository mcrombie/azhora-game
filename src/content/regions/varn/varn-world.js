import { lotharnRouteJoinDelta, nearLotharnRouteJoin } from '../east-lotharn/east-lotharn-world.js';
/**
 * Varn: the Empire's fortress-city in the notch of Amod, on the pass that comes south out of the East
 * Lotharn - as pure numbers. `src/content/regions/varn/varn-scenery.js` draws what is described here.
 *
 * The user, 2 October 2026, with a ring drawn round the four hexes of Amod's notch: "a heavily and
 * beautifully fortified city called Varn that has walls that are built into the mountains and completely
 * surround the perimeter of the city making that mountain pass completely impassable. Adjust the
 * mountains if needed to make sure this city becomes the key strategic chokehold blocking movement south
 * from this mountain pass."
 *
 * **Where, and why there** (measured on the built world, docs/varn-report.md). The pass road came down
 * off Kemrath's floor and stopped at (-1150, -792), in the tip of the notch: hex (7,97), Amod's, with the
 * East Lotharn's mountain hexes (6,97) and (8,97) either side of it. The cliffs of the south-west peak and
 * of the eastern massif stood a hundred and twenty-eight metres apart there, with sixty metres of level
 * ground between them that anybody could walk - and the mountains' own lift is let down to nothing a
 * stone's throw short of every border, so the rock stopped short of the notch on both sides.
 *
 * **What was done to the mountains** (the user gave leave): two shoulders of rock, **the jambs**, are
 * stood on the East Lotharn's own ground hard against the notch's two sides - each massif's first ledge
 * carried out level, at its own height, to within a metre of Amod's hex, and sheer on every face that is
 * not the mountain behind it. The city stands in the slot between them, a hundred metres across and
 * fifty-six deep, and its curtain is built into their faces. Nothing of Amod's own ground is raised; the
 * city's floor is graded (a made town) and a ditch is cut before its two fronts.
 *
 * **The city**: a shield of six walls on the notch's own hexagon - the pass front straight across the
 * north with the Pass Gate in it, the two long sides in the jambs' faces, and a salient to the south with
 * the Amod Gate in its face. Fourteen towers. The citadel - a keep in its own ward - stands in the
 * north-west corner, on the highest ground, over the Pass Gate; barracks fill the north-east; the town is
 * two blocks of houses either side of a market square on the one street, which is the pass road.
 *
 * **Medieval, never Roman**: the Empire's own masonry and its red and gold (src/content/regions/ambron/elagos-scenery.js,
 * src/content/regions/moros/moros-works.js). The garrison is the Empire's men-at-arms on the walls (src/content/regions/varn/varn-garrison.js); no
 * townspeople yet.
 *
 * **The user's three decisions, 2 October 2026** ("1. There should be a very difficult climber's route. 2. All
 * gates shut by default. 3. garrison the walls."): the route is the two slabs on the east jamb (`VARN_SLABS`),
 * and every other way over the mountain within Varn's reach is shut by the no-hold rule and the lips
 * (`varnUnclimbable`, `lipRib`); both gates read the one flag, and the Amod Gate has a wicket that opens from
 * inside only (`VARN_WICKET`, `VARN_CLOSED`); the garrison is src/varn-garrison.js.
 *
 * Pure: no three, no DOM.
 */
import { fortCircuit, FORT_STANDARD } from '../../../world/scenery/fortification.js';
import { KELMOD_ROAD_END, AMOD_ROAD } from '../amod/amod-world.js';
import { amodRoadBench, amodTerracedGround } from '../amod/amod-terraces.js';
import { firstCliff, onPeakWay, RAMPS_KEEP_THEIR_HOLD } from '../west-lotharn/lotharn-first-course.js';
import { peakUplift as eastUplift, BANDS as EAST_BANDS, LOTHARN as EAST_LOTHARN, RAMPS as EAST_RAMPS, nearestOn, pointOn as pointOnLine,
  lotharnLandscapeDelta, LOTHARN_WESTERN_SHOULDER } from '../east-lotharn/east-lotharn-world.js';
import { RAMPS as WEST_RAMPS } from '../west-lotharn/west-lotharn-world.js';
import { CAVE_LINES as EAST_CAVE_LINES } from '../east-lotharn/east-lotharn-caves.js';
import { WEST_CAVE_LINES } from '../west-lotharn/west-lotharn-caves.js';
import { hexOwnerAt } from '../../../world/terrain/region-world.js';
// A cycle, on purpose: the lips are read off the ground as it lay before Varn, which only the chain knows
// (`groundBeforeVarn`), and the chain lays Varn's ground. Nothing here calls it while a module is loading.
import { groundBeforeVarn } from '../../../world/terrain/world-terrain.js';

const freeze = Object.freeze;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const v = clamp((x - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); };
const point = (x, z) => freeze({ x, z });

// ---------------------------------------------------------------------------
// The one flag
// ---------------------------------------------------------------------------
/**
 * **Whether the Empire's gates on the Lotharn passes are shut.** One flag: both of Varn's gates and the gate of
 * every fort in `src/content/regions/west-lotharn/lotharn-forts.js` read it, and nothing else decides it.
 *
 * Shut, at the user's word (2 October 2026: "All gates shut by default"), and by the game's own precedent for
 * a fortress on a pass - Feradom's castles keep "the gate toward the border shut" (src/content/regions/feradom/feradom-scenery.js).
 * The Amod Gate was first left open as the town's own door, so that the city was never a sealed box; shut,
 * it keeps a **wicket** (`VARN_WICKET`) that opens from inside only, so whoever is in Varn can leave and
 * nobody comes in: the city is a closed place the way East Suval and Feradom are (`VARN_CLOSED`,
 * src/world/travel/closed-border.js). `false` opens every gate, takes the wicket's rule off, and leaves the no-hold rock
 * and the lips as they are.
 */
export const LOTHARN_PASSES_SHUT = true;

// ---------------------------------------------------------------------------
// The plan
// ---------------------------------------------------------------------------
/** The notch's tip, hex (7,97): a hundred metres across, flat sides at x = -1200 and x = -1100. */
const WEST = -1199, EAST = -1101, NORTH = -783, SHOULDER = -723, FRONT = -705, FRONT_HALF = 18, AXIS = -1150;

export const VARN = freeze({ id: 'varn', name: 'Varn', x: AXIS, z: -746, radius: 52, axis: AXIS });

/** A fortress-city's measures: taller than the capital's own and as thick (src/content/regions/ambron/ambron.js), because this one is all wall. */
export const VARN_STANDARD = freeze({
  ...FORT_STANDARD,
  wallHeight: 8.4, walkHeight: 6.2, wallThickness: 4.6,
  towerSize: 6.4, towerPlatform: 12.2, towerProjection: 1.4,
  towerSpacing: freeze({ min: 20, max: 38 }),
  gateWidth: 4.8, berm: 1.2, ditchWidth: 5.0, causewayHalf: 5.6,
});

/** The six corners, round by the east: the pass front, the east side, the salient's three faces, the west side. */
export const VARN_CORNERS = freeze([
  point(WEST, NORTH), point(EAST, NORTH), point(EAST, SHOULDER),
  point(AXIS + FRONT_HALF, FRONT), point(AXIS - FRONT_HALF, FRONT), point(WEST, SHOULDER),
]);
export const VARN_PASS_GATE = 'varn-pass-gate', VARN_AMOD_GATE = 'varn-amod-gate';
export const VARN_CIRCUIT = fortCircuit({
  id: 'varn', kind: 'varn', standard: VARN_STANDARD,
  corners: VARN_CORNERS.map(p => ({ x: p.x, z: p.z })),
  gates: [
    { id: VARN_PASS_GATE, edge: 0, at: AXIS - WEST },
    { id: VARN_AMOD_GATE, edge: 3, at: FRONT_HALF },
  ],
  // A tower between each corner and each gate on the pass front, and one in the middle of each long side.
  extraTowers: [{ edge: 0, at: 21.5 }, { edge: 0, at: EAST - WEST - 21.5 }, { edge: 1, at: (SHOULDER - NORTH) / 2 }, { edge: 5, at: (SHOULDER - NORTH) / 2 }],
  // A ditch before the two fronts; the long sides stand in the rock.
  ditchEdges: [0, 2, 3, 4],
});
/** Whether a gate of the city is shut: the one flag, for both of them. */
export const varnGateShut = gateId => LOTHARN_PASSES_SHUT && VARN_CIRCUIT.gates.some(gate => gate.id === gateId);

/**
 * **The wicket**: a door a man wide in the Amod Gate's right-hand leaf as you go out (the western one), which
 * opens from inside only. The great leaves are barred and the portcullis of that gate hangs in its arch,
 * because a wicket in use wants the grate up; the Pass Gate's grate is down. The shut gate's colliders stop a
 * body everywhere across the passage but here, and the rule that a closed place is entered from nowhere
 * (src/world/travel/closed-border.js, `VARN_CLOSED`) refuses the step in through the gap and lets the step out alone.
 */
export const VARN_WICKET = freeze({ gate: VARN_AMOD_GATE, side: 1, width: 1.2 });
/** Where the wicket stands: its centre in the world, the gate it is in, and its width. */
export function varnWicket() {
  const gate = VARN_CIRCUIT.gates.find(one => one.id === VARN_WICKET.gate), s = VARN_WICKET.side * (gate.halfWidth - VARN_WICKET.width / 2);
  return { gate, x: gate.centre.x + gate.along.x * s, z: gate.centre.z + gate.along.z * s, width: VARN_WICKET.width, side: VARN_WICKET.side };
}
/**
 * **Varn is a closed place while its gates are shut**: a move from outside its wall line to inside it is
 * refused wherever it happens, and a move out is not - the game's own rule for East Suval and Feradom
 * (src/world/travel/closed-border.js), which reads this. The walls and the shut leaves are solid anyway; what this decides
 * is the wicket. The lines are what the traveler is told, at most once a cooldown, by nobody with a name.
 */
export const VARN_CLOSED = freeze({
  name: 'Varn', shut: LOTHARN_PASSES_SHUT, inside: (x, z) => VARN_CIRCUIT.inside(x, z),
  title: 'VARN · THE GATES ARE SHUT',
  lines: freeze([
    'A man-at-arms stands in the wicket with his spear across the gap, and does not move. The gates of Varn are shut.',
    'From the gallery over the gate a sentry calls down: nothing comes in off the road. The wicket is held from inside.',
    'Red tabards along the wall-walk, every one of them looking at you. Varn is shut.',
  ]),
});

// ---------------------------------------------------------------------------
// The jambs
// ---------------------------------------------------------------------------
/**
 * **The jambs**: the two shoulders of rock the city is built between. Each is a rectangle of the East
 * Lotharn's own ground - never a metre of Amod's: the west one in hexes (6,97) and (7,96), the east in
 * (8,97) and (8,96) - raised to a level top `top` metres up, with a face `face` metres deep on every side.
 * Where the mountain behind already stands higher it is left as it is, so a jamb is its massif's own first
 * ledge carried out to the notch.
 *
 * **Why the top is the ledge's own height, and not lower** (measured, docs/varn-report.md). Both massifs
 * have a ledge at a hundred and thirteen to a hundred and nineteen metres above their first course of
 * cliff, and a walker reaches the south-west peak's from the Kemrath saddle by the peak's own ramp. From
 * that ledge to the notch's slope was a fall of thirty-four metres. A jamb built lower than the ledge is a
 * step in that fall: at eighty-eight metres, as this was first built, a body came down twenty-one metres
 * onto it and fifteen off it, and lived. Level with the ledge it is no step: the ledge is simply wider,
 * every way off it is fifty-six metres into the city or thirty-four and more outside it, and its free
 * edges carry a parapet (`VARN_PARAPETS`) so that nobody steps off them at all.
 */
export const VARN_JAMBS = freeze([
  freeze({ id: 'west-jamb', name: 'The west jamb', minX: -1270, maxX: -1201, minZ: -796, maxZ: -722, inward: 1 }),
  freeze({ id: 'east-jamb', name: 'The east jamb', minX: -1099, maxX: -1050, minZ: -796, maxZ: -722, inward: -1 }),
]);
export const JAMB = freeze({ top: 116, face: 4.5 });
/**
 * **The landing**: the west part of the east jamb's top, over the city's east wall, stands twelve metres
 * higher than the rest of the jamb and the mountain's ledge, with a sheer step down to them on its east side.
 * It is where the climbers' route lands (`VARN_SLABS`): the two slabs top out on it, and nothing else reaches
 * it - no walker from the ledge (twelve metres of rock that gives no hold), and nobody from above (the lips
 * of the courses over it, `lipRib`). Whoever is on it steps down to the ledge, or goes back down a slab.
 * `rail` is where its breastwork over the city stands: on the top, at the head of the face (which is `JAMB.face` deep
 * from the jamb's edge), so that whoever climbs up cannot step off into Varn.
 */
export const LANDING = freeze({ jamb: 'east-jamb', minX: -1099, maxX: -1075, top: 128.4, wall: 1.6, rail: -1094.6 });
/** How far inside a jamb a point is (metres from its nearest edge), or 0 outside it. */
function jambInset(jamb, x, z) {
  return Math.max(0, Math.min(x - jamb.minX, jamb.maxX - x, z - jamb.minZ, jamb.maxZ - z));
}
/** 0 off the jambs, 1 on their tops, between on their faces. */
export function varnJambRise(x, z) {
  let rise = 0;
  for (const jamb of VARN_JAMBS) {
    const inset = jambInset(jamb, x, z);
    if (inset > 0) rise = Math.max(rise, smooth(0, JAMB.face, inset));
  }
  return rise;
}
/** On the landing's top (not its step), or `margin` metres inside it. */
export function onLanding(x, z, margin = 0) {
  const jamb = VARN_JAMBS[1];
  return x >= LANDING.minX + JAMB.face + margin && x <= LANDING.maxX - LANDING.wall / 2 - margin && z >= jamb.minZ + JAMB.face + margin && z <= jamb.maxZ - JAMB.face - margin;
}
/**
 * A jamb's top at a point: level, and never quite a plane; the landing stands over the east jamb's, and is
 * nearly flat, so that both slabs are the same climb to within a hand's breadth.
 */
export function jambTop(x, z) {
  const wobble = Math.sin(x * .21 + z * .13) * .5 + Math.sin(z * .17 - x * .09) * .4, base = JAMB.top + wobble;
  const east = VARN_JAMBS[1];
  if (x < east.minX - 1 || x > LANDING.maxX + LANDING.wall || z < east.minZ - 1 || z > east.maxZ + 1) return base;
  return lerp(LANDING.top + wobble * .2, base, smooth(LANDING.maxX - LANDING.wall / 2, LANDING.maxX + LANDING.wall / 2, x));
}

// ---------------------------------------------------------------------------
// The slabs: the climbers' route
// ---------------------------------------------------------------------------
/**
 * **The one way over the mountain past Varn, for a very good climber** (the user, 2 October 2026: "There
 * should be a very difficult climber's route"). Two slabs of rock stand against the east jamb's two free
 * faces - the north slab over the forecourt before the Pass Gate, the south slab over the Empire's ground
 * behind the city - each ten metres wide, each a plane sixty-four metres high at a grade of seven and a
 * half (82 degrees), from a flat apron at 64 m to the landing's lip at 128 m. Going south you climb the
 * north slab, cross the landing and come down the south slab; going north the other way about.
 *
 * **Why those numbers, in the climbing system's own terms** (src/gameplay/movement/climbing.js, src/gameplay/combat/combat-skills.js). A
 * climb is paid for in wind, which does not come back while you hang on: climbing up drains 7 a second,
 * less with skill (a quarter less at level 11, two fifths less from level 17), and the body goes up at
 * 1.8 m/s, more with skill (half again from level 18). A traveler's wind is his toughness: 100 at level 1,
 * 180 at 99. There is no rest on a slab - no ledge, nothing under 31 degrees - so one pitch is one pool of
 * wind. On a plane this steep, with the base wind of 100, a climber at level 17 reaches 66 m before his
 * wind is gone and at 16 reaches 62: so sixty-four metres is finished by a climber of level 17 with two
 * metres to spare, and a climber of level 16 lets go two metres under the lip, falls sixty metres and takes
 * the full hundred of damage a climbing fall can do - which kills a traveler of base health, and puts him
 * back at the foot. More toughness lowers the level: with 116 wind (toughness 20) level 15 finishes it.
 * Coming down a slab is cheap, as every descent is in this game (half the drain): a climber of level 1 who
 * comes down one lets go ten metres short of the apron and lives. So the route's difficulty is its ascent,
 * and both directions have one.
 */
export const SLAB = freeze({ width: 10, top: LANDING.top, foot: 64, run: 8.5, apron: 2, blend: 2.5, side: 7 });
export const VARN_SLABS = freeze([
  // `lipZ` is the edge of the landing the slab tops out at; `dir` is the way down it (-1 north, +1 south).
  freeze({ id: 'north-slab', name: 'The north slab', minX: -1094, maxX: -1084, lipZ: VARN_JAMBS[1].minZ + JAMB.face, dir: -1 }),
  freeze({ id: 'south-slab', name: 'The south slab', minX: -1087, maxX: -1077, lipZ: VARN_JAMBS[1].maxZ - JAMB.face, dir: 1 }),
]);
/** How far down a slab a point is, in metres from its lip along the way down: 0 at the lip, `run` at the foot. */
const slabAlong = (slab, z) => (z - slab.lipZ) * slab.dir;
/** The slab a point is on (its plane or its apron), `margin` metres generous, or null. */
export function onSlab(x, z, margin = 0) {
  for (const slab of VARN_SLABS) {
    const along = slabAlong(slab, z), aside = Math.max(0, slab.minX - x, x - slab.maxX);
    if (along < -margin || along > SLAB.run + SLAB.apron + SLAB.blend + margin) continue;
    if (aside <= margin || (along > SLAB.run && aside <= SLAB.side + margin)) return slab;
  }
  return null;
}
/** Where a slab's foot stands, on its apron: where a climber starts it. */
export function slabFoot(slab) {
  return point((slab.minX + slab.maxX) / 2, slab.lipZ + slab.dir * (SLAB.run + SLAB.apron / 2));
}
/** The slab's own ground at a point - the plane, the apron, or the blend into the hill - or null off it. */
function slabGround(x, z, ground) {
  for (const slab of VARN_SLABS) {
    const along = slabAlong(slab, z);
    if (along < 0 || along > SLAB.run + SLAB.apron + SLAB.blend) continue;
    const aside = Math.max(0, slab.minX - x, x - slab.maxX);
    if (aside > 0) {
      // Beside the apron the ground is let down to the apron's level over `side` metres, so the apron is walked into and out
      // of from the hill beside it at a grade a walker takes, and is never a pit. Beside the plane itself nothing changes.
      if (along < SLAB.run - 1 || aside > SLAB.side) continue;
      const apron = along <= SLAB.run + SLAB.apron ? SLAB.foot : lerp(SLAB.foot, ground, smooth(SLAB.run + SLAB.apron, SLAB.run + SLAB.apron + SLAB.blend, along));
      return lerp(apron, ground, smooth(0, SLAB.side, aside));
    }
    if (along <= SLAB.run) return lerp(jambTop(x, slab.lipZ), SLAB.foot, along / SLAB.run);
    if (along <= SLAB.run + SLAB.apron) return SLAB.foot;
    return lerp(SLAB.foot, ground, smooth(SLAB.run + SLAB.apron, SLAB.run + SLAB.apron + SLAB.blend, along));
  }
  return null;
}

// ---------------------------------------------------------------------------
// The lips
// ---------------------------------------------------------------------------
/**
 * **A rim of harder stone along the edge of every ledge within Varn's reach**, so that nobody steps off one.
 * The fall rule caps what a fall costs at a hundred health (src/gameplay/movement/terrain-fall.js), and a traveler's health
 * runs to four hundred: no height in the game kills a tough man, so a ledge over the Empire's ground is a
 * way round the walls for anybody who can walk to its edge. The coordinator's reading of the user's answer
 * (docs/varn-report.md) is that a hard climb is the only way round; so the edges are taken away. Wherever
 * gentle ground stands over a drop - the top of a course of cliff, or the edge where a ledge runs out at the
 * range's border and the mountain is let down to the plain - the ground within a stride of the drop is
 * raised `height` metres in a hump too steep to walk up from the ledge (a grade of two and more) and too
 * steep to be anything but cliff from below, and it gives no hold.
 *
 * **Read off the ground, not off the lift.** The lips of the courses are where the lift crosses a period,
 * but the edges that matter most are not: they are where the first ledge runs out toward Amod or Vastos
 * and the massif's ground is blended down to the lowland (`lotharnShare`), which the courses know nothing
 * of. So the rule asks the ground as it lay before Varn (`groundBeforeVarn`): downhill of a point, by the
 * lift's own slope, is the ground `probe` metres away more than `drop` metres lower? Then the point is a lip.
 *
 * **Where**: the East Lotharn's own ground in `VARN_ROCK`, every course from the first cliff's top up (lift
 * 30 and more) - both massifs' edges over the Empire's ground from fifty metres beyond the Vastos Gate's
 * eastern end to the eastern massif's far end, and their edges over the pass, which costs nothing. Every
 * course, because on these faces the ledges are too narrow to catch a body that drops onto them from the
 * ledge above: from the eastern massif's third ledge a body came down a hundred and thirty-six metres into
 * Amod in one fall, over two ledges it never rested on.
 * **Never on the peaks' own ways** (the ramps, and the ledge paths between them, which run along the lips):
 * a way crosses its lip where it always did. Not on the valleys' floors and shoulders (lift under 30), not
 * on the landing (whose edges are the slabs' lips and its own step), not on the slabs. The west jamb's and the
 * east shelf's own edges are taken like any other: where the mountain's first ledge runs out at a jamb's corner
 * beyond the end of a rail, the rim is what stops a walker (the west jamb's south-west corner is such a place).
 *
 * It is the mountains' own ground that is reshaped here, on the user's leave ("Adjust the mountains if
 * needed"), and it is the builder's extent, not the coordinator's words, which named one ledge: the one the
 * least-fall search found first, at (-1426, -648). Every other edge within reach is a fall of thirty-six to
 * forty metres, which the same rule lets a tough man live through.
 */
export const VARN_ROCK = freeze({ minX: -1560, maxX: -700, minZ: -960, maxZ: -600 });
export const VARN_NEIGHBOURHOOD = freeze({ minX: -1110, maxX: -1040, minZ: -830, maxZ: -700 });
export const RIB = freeze({ height: 3, over: 2.5, most: 5, reach: 3, peak: 1, near: 2.4, cliff: 1.2, drop: 6, lift: freeze({ low: 30, high: 68 }) });
const inBoxOf = (box, x, z) => x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ;
export const inVarnRock = (x, z) => inBoxOf(VARN_ROCK, x, z);
export const inVarnNeighbourhood = (x, z) => inBoxOf(VARN_NEIGHBOURHOOD, x, z);
/**
 * **The doors the rim would stand in.** A cave comes out onto a ledge, and a rim reaches three metres in from a ledge's
 * brink: where the ledge is narrow its inner treads stand in the cave's own doorway, and a traveler stepped out of the
 * eastern peak's high chimney, and up to its eastern chamber, onto a riser a metre and three quarters high
 * (tests/east-lotharn-peaks.test.js, "never a step"). A cave is the mountain's own way, as a ramp is, and a way crosses
 * its lip where it always did: no rim stands within `DOOR` metres of where a cave's line comes out.
 *
 * Two metres, and no more, because the rim is what keeps a body on the mountain. On a ledge wider than its rim that
 * clears the door and leaves the crest on the brink (the south-west chamber's, the western chimney's lower door). On a
 * shelf no wider than its rim it leaves the brink before the door open, as it was before there were rims - and at
 * three doors of the eastern peak a body that steps off there comes to the Empire's ground by falls: the high
 * chimney's two (by two falls, over the east jamb's back) and the eastern chamber's (by one, ninety-two metres, onto
 * Amod's hills). On 3 October nobody came to them; since the user's decision of that day (`CAVE_WAY`, below) a
 * climber does, and those three doors carry rails (`CAVE_RAILS`): rock beyond the two metres, not in the door.
 */
const CAVE_MOUTHS = freeze([...EAST_CAVE_LINES, ...WEST_CAVE_LINES].flatMap(cave => cave.kind === 'chamber' ? [cave.points[0]] : [cave.points[0], cave.points.at(-1)]));
const CAVE_MOUTH_DIRECTIONS = EAST_CAVE_LINES.flatMap(cave => (cave.kind === 'chamber' ? [0] : [0, 1]).map(end => {
  const p = end ? cave.points.at(-1) : cave.points[0], q = end ? cave.points.at(-2) : cave.points[1], length = Math.hypot(q.x - p.x, q.z - p.z);
  return { ...p, dx: (q.x - p.x) / length, dz: (q.z - p.z) / length };
}));
const DOOR = 2;
const nearCaveMouth = (x, z) => CAVE_MOUTHS.some(mouth => Math.hypot(mouth.x - x, mouth.z - z) <= DOOR);
/** Whether the lip rule looks at a point at all: Varn's reach, the mountain's own hexes, the courses it takes, off the ways, the caves' mouths and the works. */
export function lipRuleApplies(x, z, legacyCaves = false) {
  if (!inVarnRock(x, z) || hexOwnerAt(x, z) !== EAST_LOTHARN || onSlab(x, z, SLAB.side + 1) || onLanding(x, z, -2.5) || nearCaveMouth(x, z)) return false;
  // The restored cave shelf has its own outer rim; the old brink must not stand across its tread.
  if (!legacyCaves && caveBenchNearest(x, z)?.distance < CAVE_BENCH.reach) return false;
  if (onPeakWay(x, z)) return onWayShoulder(x, z);
  return eastUplift(x, z) >= RIB.lift.low;
}
/**
 * **The ways' shoulders.** A ramp is cut slantwise across a cliff and a ledge path is cut along a lip: the outer edge
 * of either is a brink, and a rim is wanted there as much as anywhere - more, because a way over the Empire's ground
 * (the eastern peak's second ramp passes over the east jamb) is a walk to a jump. The rim stands on the outer
 * shoulder of the way's cut, `WAY_SHOULDER.from` to `WAY_SHOULDER.to` metres from its line, leaving the tread, and a way
 * keeps its rim at every course, not only the first. The brink rule does not ask of a shoulder whether it is on
 * the face: the way's cut is the face.
 */
export const WAY_SHOULDER = freeze({ from: 1.6, to: 2.7, near: 4 });
const WAYS = freeze([...EAST_RAMPS, ...WEST_RAMPS]);
/** The nearest point on any way's line to a point, with the distance - or null beyond the ways' reach. */
function wayNearest(x, z) {
  let best = null;
  for (const way of WAYS) {
    const b = way.line.bounds;
    if (x < b.minX - 4 || x > b.maxX + 4 || z < b.minZ - 4 || z > b.maxZ + 4) continue;
    const near = nearestOn(way.line, x, z);
    if (!best || near.distance < best.distance) best = { ...near, line: way.line };
  }
  return best;
}
const wayDistance = (x, z) => wayNearest(x, z)?.distance ?? Infinity;
export function onWayShoulder(x, z) {
  const distance = wayDistance(x, z);
  return distance >= WAY_SHOULDER.from && distance <= WAY_SHOULDER.to;
}
/**
 * The rim's height at a point, read off `unbuilt`, the ground with everything of Varn on it but the lips
 * (`varnBeforeLips`): nothing off the edges, on a way, or
 * outside the rule's reach. Downhill is whichever of eight ways round the point the ground `reach` metres off
 * is lowest - the ground's own, not the lift's, because the drops that matter most (a ledge running out at
 * the border, a jamb's corner) are not where the lift falls. Along that line: if the ground `reach` metres on
 * is not `near` metres lower there is no brink within reach; if the ground a metre on is already `cliff`
 * metres lower the point is on the face itself; and the ground a stride beyond `reach` must be `drop` metres
 * lower, or it is a step and not a cliff. What is left is the two metres of ledge above a brink (wide enough
 * that nothing a metre apart steps between two stones of it), and that is raised in a ridge - its crest `peak`
 * metres from the brink, falling to nothing `reach` metres in, so that nothing dropping onto it from a ledge
 * above comes to rest on it - to
 * a crest `height` over it, or `over` the ground three metres inward if that is more (a ledge that slopes
 * toward its own edge would otherwise bring a walker down onto the rim), and never more than `most`. The
 * inner side of the rim is a step of a metre and more in a metre, which no walker takes; the outer side is
 * the cliff.
 */
export function lipRib(x, z, unbuilt = varnBeforeLips, here = null, legacyCaves = false) {
  return Math.max(brinkRib(x, z, unbuilt, here, legacyCaves), stopRib(x, z), railRib(x, z, unbuilt, here, legacyCaves), legacyCaves ? 0 : caveBenchRib(x, z, unbuilt, here));
}
/**
 * **The stops**: a rim stood by hand where the brink rule has no brink to stand one on. One, so far.
 *
 * The rule above looks for a brink: gentle ground, and then a cliff. On the south-west peak's first ledge, over
 * the hills between Varn and the Vastos Gate, there is a stretch thirty metres long with no brink at all: the
 * ledge tips toward its own edge at a grade of one to one and a fifth for six or seven metres - steeper than a
 * walker's grade, and never suddenly steeper - and then goes over. The rule reads that as a ledge that slopes,
 * which it is; to a traveler it is a slide. Measured on 3 October 2026 with the game's own step and its own
 * fall (docs/varn-report.md): a traveler who stepped south off the last gentle ground at (-1418, -648) slid to
 * the edge, went over, and came down forty metres onto the Empire's ground - and a hundred is all any fall costs,
 * so a traveler of more than a hundred health walked on into Amod. It is the place the first least-fall search
 * named, (-1426, -648), whose rim stops six metres short of it.
 *
 * A rim on that edge would stop the fall and keep the man: nobody walks back up a grade of 1.1, and the rock
 * within Varn's reach gives no hold. So the rim stands at the **head** of the slide, where the walking ends: a
 * ridge of the same stone along `from`-`to`, `height` over the ground it stands on at its line and nothing
 * `half` metres either side, from the rim the rule built west of the slide to the one it built east of it. Its
 * uphill foot is on ground a walker walks back up. The ledge either side of it is two dead ends, as it was (the
 * course above bulges out between them); nothing that was walked to is cut off, and the slide itself is now
 * reached by nobody.
 */
export const LIP_STOPS = freeze([
  freeze({ id: 'south-west-slide', from: point(-1427.5, -648.15), to: point(-1387, -648.15), half: 1.25, height: 3.2 }),
]);
/** The height of a stop's ridge at a point: `height` on its line, falling to nothing `half` metres off it. */
export function stopRib(x, z) {
  let rib = 0;
  for (const stop of LIP_STOPS) {
    const { from, to, half, height } = stop;
    if (x < Math.min(from.x, to.x) - half || x > Math.max(from.x, to.x) + half || z < Math.min(from.z, to.z) - half || z > Math.max(from.z, to.z) + half) continue;
    const dx = to.x - from.x, dz = to.z - from.z, t = clamp(((x - from.x) * dx + (z - from.z) * dz) / (dx * dx + dz * dz), 0, 1);
    rib = Math.max(rib, height * Math.max(0, 1 - Math.hypot(x - from.x - dx * t, z - from.z - dz * t) / half));
  }
  return rib;
}

/**
 * **The way to the eastern peak's caves** (the user, 3 October 2026: "Restore a way to them - give the eastern peak back
 * one climbing way to its caves that does not lead past Varn, and rail the cave doors that open over the Empire's
 * ground"). The rule below took every face within Varn's reach, and with it the caves of the eastern peak: the ledges
 * they open on are narrow and tilted, and were walked to with a hand on the rock, which the rule took away (measured in
 * docs/varn-report.md, section 10). The mark is lifted again on one way, and on nothing else: the tread of the peak's
 * fourth ledge from the top of its fourth ramp west to the high chimney's lower door, whose passage climbs to the upper.
 * Only that ledge's own band of lift (`lift`), within `half` metres of the line, and never a rim or a rail: the cliffs
 * above and below and every brink keep no hold. A climber's way: the ledge tilts past a walker's grade in places.
 * The chamber and low chimney use the restored second-ledge shelf below (`CAVE_BENCHES`): its rim was
 * moved outward instead of granting holds on the cliff below it, which would allow a fall into Amod.
 */
export const CAVE_WAY = freeze({
  id: 'eastern-caves-way', name: 'The cave ledges', half: 2.5,
  stretches: freeze([
    freeze({ id: 'chimney-ledge', ledge: 4, lift: freeze([159, 189]), line: freeze([
      point(-938, -759), point(-950, -755), point(-958, -757), point(-961, -757), point(-970, -761), point(-980, -765), point(-991, -766),
      point(-994, -769), point(-1004, -772), point(-1021, -777), point(-1037, -796), point(-1038, -797)]) }),
  ]),
});
const segmentDistance = (line, x, z) => {
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i], dx = b.x - a.x, dz = b.z - a.z, t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
    best = Math.min(best, Math.hypot(x - a.x - dx * t, z - a.z - dz * t));
  }
  return best;
};
const WAY_BOXES = CAVE_WAY.stretches.map(s => ({ minX: Math.min(...s.line.map(p => p.x)) - CAVE_WAY.half, maxX: Math.max(...s.line.map(p => p.x)) + CAVE_WAY.half,
  minZ: Math.min(...s.line.map(p => p.z)) - CAVE_WAY.half, maxZ: Math.max(...s.line.map(p => p.z)) + CAVE_WAY.half }));
/** Within `margin` metres more than the caves' way's reach of one of its lines, on that ledge's band of lift as widened. */
function nearCaveWay(x, z, margin = 0) {
  for (let i = 0; i < CAVE_WAY.stretches.length; i++) {
    const s = CAVE_WAY.stretches[i], b = WAY_BOXES[i];
    if (x < b.minX - margin || x > b.maxX + margin || z < b.minZ - margin || z > b.maxZ + margin || segmentDistance(s.line, x, z) > CAVE_WAY.half + margin) continue;
    const u = eastUplift(x, z);
    if (u >= s.lift[0] - margin && u <= s.lift[1] + margin) return true;
  }
  return false;
}
/** On the caves' way: within its reach of one of its lines, and on that ledge's own band of lift. Rims and rails are not taken off. */
export const onCaveWay = (x, z) => nearCaveWay(x, z) && !inVarnNeighbourhood(x, z);

/** The second ledge joins the third ramp's foot, the chamber and the low chimney's upper door.
 * The old rim filled that shelf. Its tread is now cut into the ledge and the rim carried along
 * its outer shoulder. All adjacent cliff faces still give no hold. The lower chimney door is
 * reached through the existing passage, with its own rail; it never becomes a descent to Amod.
 * Points follow the original ground, preserving cave identities, their lines and the peak route. */
export const CAVE_BENCH = freeze({ half: 1.35, reach: 3.8, rail: 2.65, railHalf: .95, height: 3.6 });
const cavePoint = (id, end = 0) => {
  const line = EAST_CAVE_LINES.find(cave => cave.id === id);
  return end ? line.points.at(-1) : line.points[0];
};
const chamberMouth = cavePoint('eastern-chamber');
// Surveyed on the actual ground, rather than its uplift: the third ramp's shoulder and the
// northeastern ridge both distort a nominal band contour. Retain those landforms above the shelf.
export const CAVE_BENCHES = freeze([
  freeze({ id: 'eastern-chamber-approach', line: freeze([
    EAST_RAMPS.find(r => r.id === 'eastern-peak-ramp-3').line.points[0],
    point(-1027.359,-762.454), point(-1023.002,-761.243), point(-1018.640,-760.321), point(-1014.605,-759.290),
    point(-1010.692,-758.344), point(-1007.010,-757.287), point(-1003.421,-756.269), point(-999.898,-755.305),
    point(-996.423,-754.407), point(-992.991,-753.563), point(-989.626,-752.686), point(-986.323,-751.720),
    point(-983.019,-750.797), point(-979.753,-749.709), point(-976.506,-748.366), point(-973.116,-747.582),
    point(-969.681,-746.987), point(-966.255,-745.792), point(-962.739,-744.651), point(-959.131,-743.645),
    point(-955.447,-742.940), point(-951.680,-742.277), point(-947.947,-742.405), point(-944.302,-743.154),
    point(-940.668,-743.955), point(-937.108,-745.038), point(-933.585,-746.228), point(-930.078,-747.472),
    point(-926.502,-748.600), point(-922.885,-749.740), chamberMouth,
  ]) }),
  freeze({ id: 'eastern-low-chimney-approach', line: freeze([
    chamberMouth, point(-914.872,-751.190), point(-910.369,-751.572), point(-905.579,-751.907),
    point(-900.559,-752.331), point(-895.204,-752.767), point(-889.529,-753.296), point(-883.279,-753.734),
    point(-876.209,-753.981), point(-865.897,-752.330), point(-853.729,-750.377), point(-847.460,-753.330),
    point(-860.715,-767.868), point(-867.028,-776.953), point(-871.115,-784.055), point(-874.281,-790.142),
    point(-876.592,-795.429), point(-878.267,-800.153), point(-881.667,-804.531),
    freeze({ x: -884.771, z: -808.623, level: 162.54 }), freeze({ x: -885.701, z: -812.511, level: 162.18 }),
    freeze({ x: -885.536, z: -816.249, level: 161.81 }), freeze({ x: -885.259, z: -819.864, level: 161.45 }), point(-883.869,-823.386),
    point(-884.377,-826.845), point(-884.874,-830.262), point(-885.081,-833.682), point(-886.543,-836.931),
    point(-888.291,-840.037), point(-890.352,-842.966), point(-892.362,-845.787), point(-894.370,-848.500),
    point(-896.352,-851.123), cavePoint('eastern-low-chimney', 1),
  ]) }),
]);
const CAVE_BENCH_SEGMENTS = CAVE_BENCHES.flatMap(bench => bench.line.slice(1).map((b, i) => {
  const a = bench.line[i], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
  return { a, b, dx, dz, length, minX: Math.min(a.x, b.x) - CAVE_BENCH.reach, maxX: Math.max(a.x, b.x) + CAVE_BENCH.reach,
    minZ: Math.min(a.z, b.z) - CAVE_BENCH.reach, maxZ: Math.max(a.z, b.z) + CAVE_BENCH.reach };
}));
function caveBenchNearest(x, z, margin = 0) {
  if (x < -1040 - margin || x > -840 + margin || z < -865 - margin || z > -730 + margin) return null;
  let best = null;
  for (const s of CAVE_BENCH_SEGMENTS) {
    if (x < s.minX - margin || x > s.maxX + margin || z < s.minZ - margin || z > s.maxZ + margin) continue;
    const t = clamp(((x - s.a.x) * s.dx + (z - s.a.z) * s.dz) / (s.length * s.length), 0, 1);
    const px = s.a.x + s.dx * t, pz = s.a.z + s.dz * t, distance = Math.hypot(x - px, z - pz);
    const outward = ((x - px) * -s.dz + (z - pz) * s.dx) / s.length;
    if (!best || distance < best.distance - 1e-7) best = { segment: s, t, x: px, z: pz, distance, outward };
    // Outside a convex corner both segments have the same nearest endpoint. Their outward
    // half-planes must join: picking only the first segment leaves half the corner unguarded.
    else if (Math.abs(distance - best.distance) <= 1e-7) best.outward = Math.max(best.outward, outward);
  }
  return best;
}
const caveBenchLevels = new Map();
function caveBenchLevel(p) {
  if (p.level !== undefined) return p.level;
  if (!caveBenchLevels.has(p)) caveBenchLevels.set(p, groundBeforeVarn(p.x, p.z));
  return caveBenchLevels.get(p);
}
const benchLevel = near => lerp(caveBenchLevel(near.segment.a), caveBenchLevel(near.segment.b), near.t);
function caveBenchGround(x, z, ground) {
  const near = caveBenchNearest(x, z);
  if (!near || near.distance >= CAVE_BENCH.reach) return ground;
  // Flatten the shelf right up to a mouth, but leave its inward passage on the original ground.
  // The first opening is at least a metre inside the surveyed mouth, beyond this feather.
  let outside = 1;
  for (const p of CAVE_MOUTH_DIRECTIONS) {
    const distance = Math.hypot(x - p.x, z - p.z);
    if (distance < 4) outside = Math.min(outside, 1 - (1 - smooth(2, 4, distance)) * smooth(.2, .8, (x - p.x) * p.dx + (z - p.z) * p.dz));
  }
  // Keep level footing right to the inner foot of the outer ridge. A feather starting before
  // the ridge would make a steep gutter from which the falling controller can begin sliding.
  const flat = near.outward > 0 ? Math.max(CAVE_BENCH.half, CAVE_BENCH.rail - CAVE_BENCH.railHalf + .1) : CAVE_BENCH.half;
  return lerp(ground, benchLevel(near), (1 - smooth(flat, CAVE_BENCH.reach, near.distance)) * outside);
}
export function caveBenchRib(x, z, unbuilt = varnBeforeLips, here = null) {
  const near = caveBenchNearest(x, z);
  if (!near || near.outward <= 0 || near.distance >= CAVE_BENCH.reach) return 0;
  if (onPeakWay(x, z) && !onWayShoulder(x, z)) return 0;
  // Distance rounds an outside bend continuously. The normal's projection alone leaves an
  // open wedge where two segments turn, even though each straight shoulder is protected.
  const profile = Math.max(0, 1 - Math.abs(near.distance - CAVE_BENCH.rail) / CAVE_BENCH.railHalf);
  if (!profile) return 0;
  // Rail the shoulder right into the mouth's existing arc, never through the doorway.
  if (nearCaveMouth(x, z)) return 0;
  return Math.max(0, benchLevel(near) + CAVE_BENCH.height * profile - (here ?? unbuilt(x, z)));
}
/**
 * **The rails at the caves' doors.** At five doors of the eastern peak the rim stops two metres short of the mouth
 * (`DOOR`) on a shelf no wider than the rim, and the brink before the door was open: a body stepping out came to the
 * Empire's ground by falls. Each has a rail of the same stone as the rims: an arc round the mouth from the rim on one
 * side to the rim on the other, over the open brink (`from` to `to`, degrees, 0 along +x and 90 along +z), its crest
 * `height` over the ground at the mouth, `radius` metres out. Never in the door: its inner foot is `DOOR` metres from
 * the mouth, and between door and rail the brink's roll-off is made up level with the mouth (`fill`), so a body
 * stepping out stands on flat ground, is stopped by the rail and walks back in. Steeper outward than inward, so its
 * crest is no resting place. No hold, like every rim.
 */
export const RAIL = freeze({ radius: 2.9, inner: .9, outer: .5, height: 3.2, fill: 1 });
export const CAVE_RAILS = freeze([
  freeze({ id: 'eastern-chamber', cave: 'eastern-chamber', end: 0, from: 15, to: 145 }),
  freeze({ id: 'eastern-high-chimney-lower', cave: 'eastern-high-chimney', end: 0, from: 94, to: 214 }),
  freeze({ id: 'eastern-high-chimney-upper', cave: 'eastern-high-chimney', end: 1, from: 146, to: 282 }),
  freeze({ id: 'eastern-low-chimney-lower', cave: 'eastern-low-chimney', end: 0, from: -150, to: 120 }),
  freeze({ id: 'eastern-low-chimney-upper', cave: 'eastern-low-chimney', end: 1, from: 200, to: 20 }),
].map(rail => {
  const line = EAST_CAVE_LINES.find(cave => cave.id === rail.cave), mouth = rail.end ? line.points.at(-1) : line.points[0];
  return freeze({ ...rail, mouth: point(mouth.x, mouth.z) });
}));
const railLevels = new Map();
/** The ground at a rail's mouth, as it lay before the lips: what the rail and its fill are measured from (read on first use). */
const railLevel = rail => { if (!railLevels.has(rail.id)) railLevels.set(rail.id, varnBeforeLips(rail.mouth.x, rail.mouth.z)); return railLevels.get(rail.id); };
/** Whether a bearing from a mouth (degrees) is within a rail's arc. */
const inArc = (rail, a) => ((a - rail.from) % 360 + 360) % 360 <= ((rail.to - rail.from) % 360 + 360) % 360;
/** How much a rail raises the ground at a point (its fill, its rise, its crest), over `here`. */
export function railRib(x, z, unbuilt = varnBeforeLips, here = null, legacyCaves = false) {
  let rib = 0;
  for (const rail of CAVE_RAILS) {
    if (legacyCaves && rail.cave === 'eastern-low-chimney') continue;
    const dx = x - rail.mouth.x, dz = z - rail.mouth.z;
    if (Math.abs(dx) > RAIL.radius + RAIL.outer || Math.abs(dz) > RAIL.radius + RAIL.outer) continue;
    const r = Math.hypot(dx, dz);
    const arc = legacyCaves && rail.cave === 'eastern-chamber' ? { from: -20, to: 160 } : rail;
    if (r < RAIL.fill || r > RAIL.radius + RAIL.outer || !inArc(arc, Math.atan2(dz, dx) * 180 / Math.PI)) continue;
    const level = railLevel(rail), off = r - RAIL.radius;
    const target = off >= 0 ? level + RAIL.height * (1 - off / RAIL.outer) : level + RAIL.height * Math.max(0, 1 + off / RAIL.inner);
    if (here === null) here = unbuilt(x, z);
    rib = Math.max(rib, target - here);
  }
  return rib;
}
/** The rim the brink rule builds at a point (the comment above `lipRib`). */
function brinkRib(x, z, unbuilt, here, legacyCaves = false) {
  if (!lipRuleApplies(x, z, legacyCaves)) return 0;
  if (here === null) here = unbuilt(x, z);
  const shoulder = onPeakWay(x, z);
  let dx = 0, dz = 0, low = Infinity, tread = null;
  if (shoulder) {
    // On a way's shoulder, downhill is straight out from the way's line, and the tread is the ground on the line.
    const near = wayNearest(x, z), run = Math.hypot(x - near.x, z - near.z) || 1;
    dx = (x - near.x) / run; dz = (z - near.z) / run;
    // The tread the rim stands over is the way's own ground beside it and three metres along it either way: a ramp falls
    // along its line, and a rim level with the tread beside it would be stepped onto from the tread above.
    tread = unbuilt(near.x, near.z);
    for (const along of [near.along - 3, near.along + 3]) { const p = pointOnLine(near.line, along); tread = Math.max(tread, unbuilt(p.x, p.z)); }
    low = unbuilt(x + dx * RIB.reach, z + dz * RIB.reach);
    if (tread - low < WAY_SHOULDER.near) return 0;                     // the way's cut does not fall away here
  } else {
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, ex = Math.cos(a), ez = Math.sin(a), h = unbuilt(x + ex * RIB.reach, z + ez * RIB.reach);
      if (h < low) { low = h; dx = ex; dz = ez; }
    }
    if (here - low < RIB.near) return 0;                               // no brink within reach
  }
  const down = r => unbuilt(x + dx * r, z + dz * r);
  // Where the brink is: between the last metre on that is still ledge and the first that has fallen away - metre by
  // metre, so a ledge that slopes toward its own edge is not mistaken for the edge.
  let brink = null;
  if (shoulder) brink = RIB.peak;                                      // the shoulder is the brink of the way's cut
  else {
    const steps = [here, down(1), down(2), low];
    for (let r = 1; r < steps.length; r++) {
      // The brink is where the ground starts falling faster than a walker's grade and much faster than it did the metre
      // before: a ledge that slopes toward its edge at a steady grade is not the edge, however steep. Found to the metre,
      // then to the quarter within it, so the ridge built on it is a ridge and not a row of steps.
      const drop = steps[r - 1] - steps[r], before = r > 1 ? steps[r - 2] - steps[r - 1] : 0;
      if (!(drop > RIB.cliff && drop > 1.8 * before)) continue;
      const half = down(r - .5), early = steps[r - 1] - half > drop / 2;
      const quarter = early ? down(r - .75) : down(r - .25);
      brink = early ? (steps[r - 1] - quarter > drop / 4 ? r - .875 : r - .625) : (half - quarter > drop / 4 ? r - .375 : r - .125);
      break;
    }
  }
  if (brink === null) return 0;                                        // no brink within reach
  if (brink < 1 && !shoulder) {
    // The ground falls away within the first metre: the face itself, unless the point is still gentle ground - the last
    // few centimetres of ledge before the edge, which must carry the rim or they are a tongue to step down onto.
    const s = .4, gx = (unbuilt(x + s, z) - unbuilt(x - s, z)) / (2 * s), gz = (unbuilt(x, z + s) - unbuilt(x, z - s)) / (2 * s);
    if (Math.hypot(gx, gz) > .9) return 0;
  }
  if (here - down(RIB.reach + 1) < RIB.drop) return 0;                 // a step, not a cliff
  // A ridge and not a shelf: it peaks `RIB.peak` metres from the brink and falls to nothing `RIB.reach` metres in, so
  // nothing that drops onto it from above comes to rest on it - a body slides off it, inward. A shoulder is the crest.
  // On a shoulder the ground is already the way's cut falling off to the cliff, so the crest is measured from the tread
  // (three metres back toward the way's line), not from the point itself.
  const crest = shoulder ? tread + RIB.over : Math.min(here + RIB.most, Math.max(here + RIB.height, down(-3) + RIB.over));
  const at = shoulder ? RIB.peak : Math.max(brink, RIB.peak);
  return (crest - here) * Math.max(0, 1 - (at - RIB.peak) / (RIB.reach - RIB.peak));
}
/** Whether a point is on the rim: where a hand finds no hold and a foot no step up. */
export const onLip = (x, z) => lipRib(x, z) > .05;
/**
 * **The parapets**: a breastwork along every edge of a jamb's top that a walker could reach and step off
 * where he should not - into the city, or onto the Empire's ground - a little back from the lip, as runs
 * square to the world. They are solid.
 *
 * **The west jamb** is the mountain's ledge carried out, and is walked onto from it: the city side, the pass
 * end and the Amod end are railed, and where a rail stops at the mountain's own ledge a **return** runs out
 * to the jamb's very edge, because a breastwork that merely stopped would be walked round. **The east jamb**
 * is in two parts. Its landing (`LANDING`) nobody walks onto, so it has one rail: along the city's lip, the
 * whole length of the jamb from edge to edge, so that whoever climbs up to it cannot step off into Varn. The
 * shelf east of the landing is at the ledge's level and walked onto from it, so its Amod end and the free
 * part of its far side are railed, with a return, as before.
 */
export const PARAPET = freeze({ back: JAMB.face + 1.6, half: .6, height: 1.5 });
const rail = (jamb, side, x0, z0, x1, z1) => freeze({ jamb, side, from: point(x0, z0), to: point(x1, z1),
  x: (x0 + x1) / 2, z: (z0 + z1) / 2, hx: Math.abs(x1 - x0) / 2 + PARAPET.half, hz: Math.abs(z1 - z0) / 2 + PARAPET.half });
export const VARN_PARAPETS = freeze((() => {
  const [west, east] = VARN_JAMBS, b = PARAPET.back;
  const wLip = west.maxX - b, north = west.minZ + b, south = west.maxZ - b;
  return [
    rail(west.id, 'city', wLip, north, wLip, south),
    rail(west.id, 'pass', west.minX + b, north, wLip, north),
    rail(west.id, 'pass-return', west.minX + b, west.minZ, west.minX + b, north),
    rail(west.id, 'amod', -1256, south, wLip, south),
    rail(west.id, 'amod-return', -1256, south, -1256, west.maxZ),
    rail(east.id, 'city', LANDING.rail, east.minZ, LANDING.rail, east.maxZ),
    rail(east.id, 'amod', LANDING.maxX, south, east.maxX - b, south),
    rail(east.id, 'far', east.maxX - b, -748, east.maxX - b, south),
    rail(east.id, 'far-return', east.maxX - b, -748, east.maxX, -748),
  ];
})());
/** The watch turrets on the jambs: the west one at its pass end, the east one on the landing. */
export const VARN_WATCHES = freeze([
  freeze({ jamb: 'west-jamb', x: VARN_JAMBS[0].maxX - PARAPET.back - 4.2, z: VARN_JAMBS[0].minZ + PARAPET.back + 4.4 }),
  freeze({ jamb: 'east-jamb', x: -1082, z: -780 }),
]);

// ---------------------------------------------------------------------------
// The city's ground
// ---------------------------------------------------------------------------
/**
 * The made floor, by how far south a point is: the upper court behind the Pass Gate lies level at the
 * pass road's own grade, the street falls one in ten through the town, and the lower court behind the
 * Amod Gate is level again.
 */
export const VARN_FLOOR = freeze({ upper: 60.2, lower: 54.4, fallFrom: -772, fallTo: -716 });
export const varnFloor = z => lerp(VARN_FLOOR.upper, VARN_FLOOR.lower, clamp((z - VARN_FLOOR.fallFrom) / (VARN_FLOOR.fallTo - VARN_FLOOR.fallFrom), 0, 1));

/**
 * **The citadel's ward**, in the north-west corner against the west jamb: a metre and a half over the
 * upper court, on the highest ground in the city. Its own wall shuts its east and south sides, with one
 * gate in the east wall onto the court; the city's curtain is its north and west.
 */
export const VARN_WARD = freeze({ minX: WEST, maxX: -1166, minZ: NORTH, maxZ: -752, level: 61.8, gateZ: -766 });
export const VARN_WARD_STANDARD = freeze({ ...FORT_STANDARD, wallHeight: 6.0, walkHeight: 4.2, wallThickness: 2.4,
  towerSize: 4.2, towerPlatform: 8.4, towerProjection: .8, gateWidth: 4.0, berm: 0, ditchWidth: 0, causewayHalf: 3 });
export const VARN_WARD_WALL = fortCircuit({
  id: 'varn-ward', kind: 'varn-ward', standard: VARN_WARD_STANDARD, open: true, outside: point(-1150, -760),
  corners: [point(VARN_WARD.maxX, NORTH + VARN_STANDARD.wallThickness / 2), point(VARN_WARD.maxX, VARN_WARD.maxZ), point(WEST + VARN_STANDARD.wallThickness / 2, VARN_WARD.maxZ)],
  gates: [{ id: 'varn-ward-gate', edge: 0, at: VARN_WARD.gateZ - (NORTH + VARN_STANDARD.wallThickness / 2) }],
  cornerTowers: [1], ditchEdges: [],
});

/** The ward's lift over the floor: all of it inside the ward, none outside, and a ramp through its gate. */
function wardLift(x, z) {
  const W = VARN_WARD;
  if (x > W.maxX + 8 || z > W.maxZ + 2) return 0;
  const gate = 1 - smooth(2.2, 3.6, Math.abs(z - W.gateZ));
  const from = lerp(W.maxX + 1.2, W.maxX + 6.5, gate), to = lerp(W.maxX - 1.2, W.maxX - 6.5, gate);
  return (W.level - varnFloor(z)) * smooth(from, to, x) * smooth(W.maxZ + 1.2, W.maxZ - 1.2, z);
}

/** The ditch before the two fronts: how deep, and how its sides are cut. */
export const VARN_DITCH = freeze({ depth: 2.4, side: 1.3 });
const DITCHED = new Set([0, 2, 3, 4]);
/** The nearest wall of the circuit to a point: which edge, how far along it, and how far outside it (negative within). */
function nearestWall(x, z) {
  let best = null;
  for (const edge of VARN_CIRCUIT.edges) {
    const along = clamp((x - edge.a.x) * edge.dir.x + (z - edge.a.z) * edge.dir.z, 0, edge.length);
    const distance = Math.hypot(x - edge.a.x - edge.dir.x * along, z - edge.a.z - edge.dir.z * along);
    if (!best || distance < best.distance) best = { edge: edge.index, along, distance };
  }
  best.outward = VARN_CIRCUIT.inside(x, z) ? -best.distance : best.distance;
  return best;
}
/** How deep the ditch is cut at a point: nothing off it, nothing on a gate's causeway. */
export function varnDitchCut(x, z) {
  const S = VARN_STANDARD, inner = S.wallThickness / 2 + S.berm, outer = inner + S.ditchWidth;
  const wall = nearestWall(x, z);
  if (wall.outward <= inner || wall.outward >= outer || !DITCHED.has(wall.edge)) return 0;
  let cut = smooth(inner, inner + VARN_DITCH.side, wall.outward) * (1 - smooth(outer - VARN_DITCH.side, outer, wall.outward));
  for (const gate of VARN_CIRCUIT.gates) if (gate.edge === wall.edge) cut *= smooth(S.causewayHalf - .2, S.causewayHalf + 1.2, Math.abs(wall.along - gate.at));
  return cut * VARN_DITCH.depth;
}

// ---------------------------------------------------------------------------
// The road
// ---------------------------------------------------------------------------
/**
 * **The Varn road.** The pass road stopped at (-1150, -792) (src/content/regions/east-lotharn/east-lotharn-world.js, `PASS_ROAD`, whose
 * first vertex that is). This takes it on: in at the Pass Gate, down the city's one street, out at the
 * Amod Gate, and down the hills to the bar at the end of Amod's own road (`KELMOD_ROAD_END`) - which is
 * the descent the lore gives to Sareth-am-Vel, a town that is still only a name on a fingerpost.
 */
export const VARN_ROAD_HEAD = point(-1150, -792);
export const VARN_STREET = freeze([VARN_ROAD_HEAD, point(AXIS, NORTH), point(AXIS, -764), point(AXIS, -744), point(AXIS, -724), point(AXIS, FRONT)]);
export const VARN_DESCENT = freeze([
  point(AXIS, FRONT), point(AXIS, -692), point(-1132, -674), point(-1094, -656), point(-1052, -637), point(-1012, -613),
  point(-976, -586), point(-946, -561), point(-917, -542), point(-898, -534), point(KELMOD_ROAD_END.x, KELMOD_ROAD_END.z), AMOD_ROAD.at(-1),
]);
/** The whole of it, for the chart and the ribbon: the pass road's end to Amod's road. */
export const VARN_ROAD = freeze([...VARN_STREET, ...VARN_DESCENT.slice(1)]);
export const VARN_ROAD_HALF = 2.3;

const SPACING = 5;
function resample(points, spacing) {
  const out = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], steps = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.z - a.z) / spacing));
    for (let step = out.length ? 1 : 0; step <= steps; step++) out.push({ x: lerp(a.x, b.x, step / steps), z: lerp(a.z, b.z, step / steps) });
  }
  return out;
}
/**
 * The descent's bed, as Amod grades a road (src/content/regions/amod/amod-terraces.js): the lie of the land along it smoothed,
 * then held to one in nine, starting at the Amod Gate's own level and ending at the level Amod's road
 * already has at the bar - so neither end is a step.
 */
const MAX_GRADE = .1;
export const VARN_DESCENT_PROFILE = (() => {
  const samples = resample(VARN_DESCENT, SPACING);
  let level = samples.map(sample => amodTerracedGround(sample.x, sample.z));
  // Both the bar and the last vertex beyond it lie on the bed Amod's own road already has, at that bed's level.
  const end = amodRoadBench(KELMOD_ROAD_END.x + 5, KELMOD_ROAD_END.z)?.level;
  const pin = () => { level[0] = VARN_FLOOR.lower; if (end !== undefined) level[level.length - 1] = level[level.length - 2] = end; };
  pin();
  for (let pass = 0; pass < 10; pass++) {
    const next = level.slice();
    for (let i = 1; i < level.length - 1; i++) next[i] = (level[i - 1] + level[i] * 2 + level[i + 1]) / 4;
    level = next; pin();
  }
  for (let pass = 0; pass < 8; pass++) {
    for (let i = 1; i < level.length; i++) level[i] = clamp(level[i], level[i - 1] - MAX_GRADE * SPACING, level[i - 1] + MAX_GRADE * SPACING);
    pin();
    for (let i = level.length - 2; i >= 0; i--) level[i] = clamp(level[i], level[i + 1] - MAX_GRADE * SPACING, level[i + 1] + MAX_GRADE * SPACING);
    pin();
  }
  return freeze(samples.map((sample, index) => freeze({ x: sample.x, z: sample.z, index, level: level[index] })));
})();
const DESCENT_BOX = (() => {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const s of VARN_DESCENT_PROFILE) { minX = Math.min(minX, s.x); maxX = Math.max(maxX, s.x); minZ = Math.min(minZ, s.z); maxZ = Math.max(maxZ, s.z); }
  return { minX, maxX, minZ, maxZ };
})();
const BENCH_HALF = 3.2, BENCH_FEATHER = 12;
/** The descent's graded level under a point and how strongly its bench holds there, or null off it. */
export function varnRoadBench(x, z) {
  const B = DESCENT_BOX;
  if (x < B.minX - BENCH_FEATHER || x > B.maxX + BENCH_FEATHER || z < B.minZ - BENCH_FEATHER || z > B.maxZ + BENCH_FEATHER) return null;
  let best = 0, nearest = Infinity;
  for (let i = 0; i < VARN_DESCENT_PROFILE.length; i++) {
    const s = VARN_DESCENT_PROFILE[i], d = (s.x - x) ** 2 + (s.z - z) ** 2;
    if (d < nearest) { nearest = d; best = i; }
  }
  // On the nearer of the two pieces of the line that meet at that sample, so the bed is one line and not a
  // stair of five-metre treads, and does not jump where the nearest sample changes.
  const P = VARN_DESCENT_PROFILE;
  let found = null;
  for (const [i, j] of [[best - 1, best], [best, best + 1]]) {
    if (i < 0 || j >= P.length) continue;
    const a = P[i], b = P[j], dx = b.x - a.x, dz = b.z - a.z, t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
    const distance = Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
    if (!found || distance < found.distance) found = { distance, level: lerp(a.level, b.level, t), along: i + t };
  }
  if (!found || found.distance > BENCH_FEATHER) return null;
  // The bed lets go over its last five metres, from the bar on, where it lies on the bed Amod's own road already
  // has: at the road's end, and anywhere beyond it, the ground is Amod's as Amod made it (its culvert, its terraces).
  const letGo = smooth(0, 1, P.length - 1 - found.along);
  return { level: found.level, weight: (1 - smooth(BENCH_HALF, BENCH_FEATHER, found.distance)) * letGo, distance: found.distance };
}
/** Distance from a point to the Varn road's line. */
export function varnRoadDistance(x, z) {
  let best = Infinity;
  for (let i = 1; i < VARN_ROAD.length; i++) {
    const a = VARN_ROAD[i - 1], b = VARN_ROAD[i], dx = b.x - a.x, dz = b.z - a.z;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
    best = Math.min(best, Math.hypot(x - a.x - dx * t, z - a.z - dz * t));
  }
  return best;
}

// ---------------------------------------------------------------------------
// The ground
// ---------------------------------------------------------------------------
/** Everything Varn shapes lies in this box, or along the descent. */
export const VARN_BOX = freeze({ minX: -1282, maxX: -1038, minZ: -808, maxZ: -686 });
const inBox = (x, z) => x > VARN_BOX.minX && x < VARN_BOX.maxX && z > VARN_BOX.minZ && z < VARN_BOX.maxZ;
/** How far the made floor reaches beyond the wall line before it lets go, and over how many metres it does. */
const FLOOR_REACH = 3, FLOOR_FEATHER = 9;

/**
 * **Varn's ground**, from the ground it is handed: the lips on the mountains' ledges within its reach, the
 * made floor inside the walls and a little beyond them, the citadel's ward on it, the ditch before the two
 * fronts, the jambs over all of it, the two slabs against the east jamb, and the descent's bench down to
 * Amod's road. `src/world/terrain/world-terrain.js` calls this after the East Lotharn has levelled its pass road, whose
 * end this floor meets at the road's own grade. Outside `VARN_ROCK` and off the descent it answers with the
 * ground it was given.
 */
export function varnGround(x, z, ground, lips = true, legacyCaves = false) {
  let height = legacyCaves ? ground : caveBenchGround(x, z, ground);
  const bench = varnRoadBench(x, z);
  if (bench && bench.weight > 0) height = lerp(height, bench.level, bench.weight);
  const unbuilt = legacyCaves ? varnLegacyBeforeLips : varnBeforeLips;
  if (!inBox(x, z)) return lips ? height + lipRib(x, z, unbuilt, height, legacyCaves) : height;
  const wall = nearestWall(x, z);
  if (wall.outward < FLOOR_REACH + FLOOR_FEATHER) {
    // Outside the Amod Gate the floor is the road's own bed, so the street runs out onto the descent without a hump.
    const street = wall.outward > 0 && bench ? lerp(varnFloor(z), bench.level, bench.weight) : varnFloor(z);
    const floor = street + (wall.outward < 0 ? wardLift(x, z) : 0);
    height = lerp(floor, height, smooth(FLOOR_REACH, FLOOR_REACH + FLOOR_FEATHER, wall.outward));
    height -= varnDitchCut(x, z);
  }
  for (const jamb of VARN_JAMBS) {
    const inset = jambInset(jamb, x, z);
    if (inset <= 0) continue;
    const top = jambTop(x, z);
    if (top > height) height = lerp(height, top, smooth(0, JAMB.face, inset));
  }
  const slab = slabGround(x, z, height);
  if (slab !== null) height = slab;
  // The lips last, read off this same ground without them: a brink the jambs have buried is no brink.
  return lips ? height + lipRib(x, z, unbuilt, height, legacyCaves) : height;
}
/** The ground with everything of Varn on it but the lips: what the lip rule reads. */
export const varnBeforeLips = (x, z) => varnGround(x, z, groundBeforeVarn(x, z), false);
const varnLegacyBeforeLips = (x, z) => varnGround(x, z, groundBeforeVarn(x, z), false, true);
/**
 * Scenery-only inverse of the western shoulder's change to the old brink rims.
 * The visible/physical rims still follow their actual ground. Seeded legacy
 * scatter must read its original terrain, including the old derived rim, or
 * one changed rejection would advance the rest of the regional random stream.
 */
export function varnLandscapeSceneryDelta(x, z) {
  const s = LOTHARN_WESTERN_SHOULDER, reach = RIB.reach + 1;
  if (x < s.minX - reach || x > s.maxX + reach || z < s.minZ - reach || z > s.maxZ + reach) return 0;
  const here = varnLegacyBeforeLips(x, z);
  const original = (a, b) => varnLegacyBeforeLips(a, b) - lotharnLandscapeDelta(a, b);
  return lipRib(x, z, varnLegacyBeforeLips, here, true)
    - lipRib(x, z, original, here - lotharnLandscapeDelta(x, z), true);
}
/** Subtract only for legacy seeded scenery acceptance; rendered and traversed ground keeps the shelf.
 * Existing harvestable tree identities must not change when a new shelf raises a height threshold. */
export function varnCaveAccessDelta(x, z) {
  if (x < -1040 || x > -840 || z < -865 || z > -730) return 0;
  const ground = groundBeforeVarn(x, z);
  return varnGround(x, z, ground) - varnGround(x, z, ground, true, true);
}

/**
 * How far the world's own ground grid is sunk under Varn's (src/content/regions/varn/varn-scenery.js draws the city's floor,
 * its ditch and the jambs on a finer one): all the way inside the box, back to nothing over the last
 * stretch before its edge, where the two grids agree.
 */
export const VARN_PATCH = freeze({ minX: VARN_BOX.minX, maxX: VARN_BOX.maxX, minZ: VARN_BOX.minZ, maxZ: VARN_BOX.maxZ, step: 1.5 });
export function varnTerrainSink(x, z) {
  const p = VARN_PATCH, inside = Math.min(x - p.minX, p.maxX - x, z - p.minZ, p.maxZ - z);
  if (inside <= 9) return 0;
  return 66 * smooth(9, 17, inside);
}

/**
 * Ground the neighbours' scatter is taken off again: the city and its ditch, the jambs' faces, and the
 * road. Their trees, stones and grass are put down by their own seeded streams before Varn is built
 * (src/content/regions/amod/amod-scenery.js, src/content/regions/east-lotharn/east-lotharn-scenery.js); refusing a candidate there would move every one
 * after it, across both countries, so they are left to fall where they always fell and the ones on this
 * ground are lifted afterwards (src/world/scenery/scenery-clearing.js).
 */
export function varnKeepsClear(x, z, margin = 0) {
  if (varnRoadDistance(x, z) < VARN_ROAD_HALF + 2.2 + margin) return true;
  if (caveBenchNearest(x, z, 1 + margin)?.distance < CAVE_BENCH.reach + 1 + margin) return true;
  // The caves' way, a metre beyond its reach: a narrow ledge, and a tree on it is a wall.
  if (nearCaveWay(x, z, 1 + margin)) return true;
  if (!inBox(x, z)) return false;
  // The slabs, their aprons, and the landing they top out on: a climber's way is kept clear like a road.
  if (onSlab(x, z, 1.5 + margin) || onLanding(x, z, -1.5 - margin)) return true;
  const S = VARN_STANDARD;
  if (nearestWall(x, z).outward < S.wallThickness / 2 + S.berm + S.ditchWidth + 3 + margin) return true;
  const rise = varnJambRise(x, z);
  return rise > .001 && rise < .999;
}

/**
 * What the ground is at a point of Varn, for whoever colours it: `street`, `paved` (the square and the two
 * courts), `ward`, `yard` (the trodden earth between the houses), `ditch`, `berm`, `jamb-top`, `jamb-face`,
 * `slab`, `apron`, or `outside`.
 */
export function varnSurface(x, z) {
  if (!inBox(x, z)) return varnRoadDistance(x, z) < VARN_ROAD_HALF ? 'street' : 'outside';
  const slab = onSlab(x, z);
  if (slab) return slabAlong(slab, z) <= SLAB.run ? 'slab' : 'apron';
  const rise = varnJambRise(x, z);
  if (rise > 0) return rise > .985 ? 'jamb-top' : 'jamb-face';
  const wall = nearestWall(x, z), S = VARN_STANDARD;
  if (wall.outward > 0) {
    if (varnDitchCut(x, z) > .08) return 'ditch';
    if (varnRoadDistance(x, z) < VARN_ROAD_HALF + .3) return 'street';
    return wall.outward < S.wallThickness / 2 + S.berm + S.ditchWidth + 1 ? 'berm' : 'outside';
  }
  const W = VARN_WARD;
  if (x < W.maxX && z < W.maxZ) return 'ward';
  if (Math.abs(x - AXIS) < VARN_ROAD_HALF + .5 || Math.abs(z - VARN_CROSS_STREET[0].z) < 2.2) return 'street';
  const paved = [VARN_SQUARE, ...VARN_COURTS].some(c => Math.abs(x - c.x) < c.halfX && Math.abs(z - c.z) < c.halfZ);
  return paved ? 'paved' : 'yard';
}

// ---------------------------------------------------------------------------
// No hand holds
// ---------------------------------------------------------------------------
/**
 * **The rock within Varn's reach gives no hold, but for the two slabs and the peaks' own ways.** One row of
 * the game's table of such places (src/gameplay/movement/no-climb-zones.js); the climbing rule reads it through
 * `world.unclimbableAt`, where a grab looks for a surface and at every attached step of a climb.
 *
 * In `VARN_ROCK` - the eastern massif whole and the south-west peak's massif from the Vastos Gate's eastern
 * end east - every face of the East Lotharn's own ground is no-hold, at every course: the jambs' faces and the
 * landing's step, the first cliff, the rims on the ledges' edges (`lipRib`) and the roll-offs between them and
 * the brinks, and the cliffs above. The first row of this rule took the first cliff only and left the upper
 * courses to be climbed; but on these faces the ledges between the courses are a few metres wide where the
 * lift is steep, too narrow to catch a falling body, so a climber who came up an upper cliff and stepped off
 * its ledge came down a hundred and thirty metres into Amod. The whole of the rock is one rule now, and what
 * is climbed within Varn's reach is the two slabs and the peaks' own ways. Beyond the box the mountains are
 * climbed as before.
 *
 * **A ramp keeps its hold** (src/content/regions/west-lotharn/lotharn-first-course.js, `RAMPS_KEEP_THEIR_HOLD`). The eastern peak's own
 * way up begins on the pass floor before Varn's Pass Gate, a stone's throw from the north slab, climbs the
 * first cliff and goes on over the back of the east jamb's shelf from ledge to ledge; a rule that took it
 * would cut the highest peak in the range off from its only route (the range's own rule puts the first ramp
 * there and nowhere else: no other stretch of that cliff is off a valley's shoulder).
 */
export function varnUnclimbable(x, z) {
  if (onSlab(x, z, .5)) return false;
  // A way keeps its hold - but not the rim on its shoulder, which a climber would otherwise take as a step to the brink.
  if (RAMPS_KEEP_THEIR_HOLD && onPeakWay(x, z)) return onWayShoulder(x, z) && lipRib(x, z) > .05;
  if (inVarnNeighbourhood(x, z)) return true;
  // The caves' way keeps its hold on its ledges' tread - but not on a rim or a rail (`CAVE_WAY`).
  if (onCaveWay(x, z)) return lipRib(x, z) > .05;
  const rise = varnJambRise(x, z);
  if (rise > 0 && rise < 1) return true;
  if (!inVarnRock(x, z)) return false;
  // Every face of the mountain within Varn's reach, at every course: the rims and the roll-offs between them and the
  // brinks are rock a hand would take otherwise, and a climber who topped out beside a rim would be a jumper; and on
  // this massif's steep faces the ledges between the courses are too narrow to catch a body, so the upper cliffs are
  // as much a way down onto the Empire's ground as the first. Ground the mountain does not lift is no climbing rock in
  // any case (the first-cliff rule covers it, for the forts' sake).
  return hexOwnerAt(x, z) === EAST_LOTHARN || firstCliff(x, z);
}

// ---------------------------------------------------------------------------
// The town
// ---------------------------------------------------------------------------
/**
 * What stands inside the walls. `[id, kind, x, z, width, depth, storeys]`, square to the world as the
 * walls are; `width` runs east and west. The imperial works are the Empire's ashlar under slate; the
 * houses are Amod's own - "compact, stone-built, and vertically organized: storage and animals below,
 * households above, drying rooms and work lofts under steep roofs" - because Amodian masons built them.
 */
const building = ([id, kind, x, z, width, depth, storeys, note = '']) => freeze({ id, kind, x, z, width, depth, storeys, note });
export const VARN_KEEP = freeze({ id: 'varn-keep', name: 'The keep', x: -1185, z: -771, size: 12.5, height: 23, turret: 3.2 });
export const VARN_BUILDINGS = freeze([
  // The citadel's hall, along the ward's south wall.
  ['citadel-hall', 'hall', -1184, -757.2, 19, 6.6, 2, 'The castellan’s hall: one long room over an undercroft, its door on the ward.'],
  // The barracks quarter, north-east: three long blocks and the armoury on a drill yard.
  ['barracks-north', 'barracks', -1119, -775.8, 24, 6.4, 2],
  ['barracks-middle', 'barracks', -1119, -765, 24, 6.4, 2],
  ['barracks-south', 'barracks', -1122, -754.4, 18, 6.2, 2],
  ['armoury', 'armoury', -1139, -756, 7.6, 8.4, 2, 'The armoury: iron-bound doors, and a rack of spears under the eaves.'],
  // The market square's sides.
  ['market-hall', 'hall', -1166.4, -740.2, 7.4, 12, 2, 'The market hall, open-arcaded below, with the toll room over it.'],
  ['granary', 'granary', -1133.6, -740.2, 7.4, 12, 3, 'The granary: three floors of a year’s grain, because a fortress is measured in months.'],
  // The town, west block.
  ['house-w1', 'house', -1189.5, -742.4, 7, 6.2, 3], ['house-w2', 'house', -1180.3, -742.6, 6.4, 6.6, 2], ['house-w3', 'house', -1189.2, -733.4, 7.2, 6, 2],
  ['house-w4', 'house', -1180.2, -733.2, 6.6, 6.4, 3], ['house-w5', 'house', -1171.8, -728.6, 6.2, 6.2, 2],
  // The town, east block.
  ['house-e1', 'house', -1110.5, -742.4, 7, 6.2, 3], ['house-e2', 'house', -1119.7, -742.6, 6.4, 6.6, 2], ['house-e3', 'house', -1110.8, -733.4, 7.2, 6, 3],
  ['house-e4', 'house', -1119.8, -733.2, 6.6, 6.4, 2], ['house-e5', 'house', -1128.2, -728.6, 6.2, 6.2, 2],
  // The lower court behind the Amod Gate.
  ['smithy', 'smithy', -1167.5, -716.2, 7, 6, 1, 'The smithy: horseshoes, hinges and spearheads.'],
  ['stables', 'stables', -1131.5, -716.2, 8, 6, 1, 'The stables, for the mule trains off the pass.'],
].map(building));
/** The market square, the well in it, and the two courts: ground kept open and paved. */
export const VARN_SQUARE = freeze({ id: 'varn-market', name: 'The market square', x: AXIS, z: -740.2, halfX: 12.2, halfZ: 8.4 });
export const VARN_WELL = freeze({ x: -1157.2, z: -740.2, r: 1.5 });
export const VARN_COURTS = freeze([
  freeze({ id: 'upper-court', x: AXIS, z: -770.5, halfX: 12, halfZ: 9.5 }),
  freeze({ id: 'lower-court', x: AXIS, z: -715.5, halfX: 10.5, halfZ: 7.5 }),
]);
/** The cross street, from wall to wall along the north side of the square. */
export const VARN_CROSS_STREET = freeze([point(WEST + 4, -748.6), point(EAST - 4, -748.6)]);

// ---------------------------------------------------------------------------
// The chart
// ---------------------------------------------------------------------------
/** Varn's places, for the chart and the journal. All of them stand in Amod. */
export const VARN_LANDMARKS = freeze([
  freeze({ id: 'varn', name: 'Varn', x: VARN.x, z: VARN.z, radius: VARN.radius,
    description: 'The Empire’s fortress-city on the pass out of the East Lotharn, in the notch where Amod reaches up into the mountains: six walls and fourteen towers between two shoulders of rock, a keep over the north gate, and a town of stone houses on the one street, which is the pass road. Both gates are kept shut, and the Empire’s men-at-arms keep the walls. Nothing crosses the mountains here but a very good climber, by the two slabs on the east jamb.' }),
  freeze({ id: 'varn-pass-gate', name: 'The Pass Gate', x: AXIS, z: NORTH + 5,
    description: 'Varn’s north gate, where the pass road comes down off Kemrath: twin towers, a ditch and a causeway, and the curtain running out both ways into the rock. The mountains are on the far side of it, and it is kept shut, grate down and leaves barred.' }),
  freeze({ id: 'varn-slabs', name: 'The Slabs', x: -1088, z: -759,
    description: 'The climbers’ way past Varn: two planes of sheer rock against the east jamb’s two free faces, ten metres wide and sixty-four high, from a flat apron at the foot to the landing on the jamb’s top. The north slab rises from the forecourt before the Pass Gate; the south slab comes down behind the city onto the Empire’s ground. Neither has a ledge to rest on, and the rock either side of them gives no hold.' }),
  freeze({ id: 'varn-citadel', name: 'The Citadel', x: -1178, z: -764,
    description: 'The keep and its ward in the north-west corner of Varn, against the west jamb and over the Pass Gate: the highest ground in the city, behind its own wall, with the castellan’s hall along the south side of the yard.' }),
  freeze({ id: 'varn-market', name: 'The Market Square', x: VARN_SQUARE.x + 4, z: VARN_SQUARE.z,
    description: 'The square in the middle of Varn, on the one street: a well, the market hall along its west side and the granary along its east, three floors of grain against a siege.' }),
  freeze({ id: 'varn-amod-gate', name: 'The Amod Gate', x: AXIS, z: FRONT - 5,
    description: 'Varn’s south gate, in the face of its salient, on the road down through the hills to Ostel: the town’s own door, shut and barred like the other, with a wicket in its right-hand leaf that is opened from inside and from nowhere else. From here the terraces begin.' }),
]);

/** Scenery-only inverse for the old derived rim near repaired trail joins.
 * Physical rims retain the actual field. Never use this to move a traveler. */
export function varnRouteJoinSceneryDelta(x, z) {
  if (!nearLotharnRouteJoin(x, z, RIB.reach + 2) || !inVarnRock(x, z)) return 0;
  const here = varnLegacyBeforeLips(x, z);
  const original = (a, b) => varnLegacyBeforeLips(a, b) - lotharnRouteJoinDelta(a, b);
  return lipRib(x, z, varnLegacyBeforeLips, here, true)
    - lipRib(x, z, original, here - lotharnRouteJoinDelta(x, z), true);
}
