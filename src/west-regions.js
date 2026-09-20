/**
 * The four western regions of the playable world — Vastos, Meneth, Caricas and
 * Nesdor — as water, landform parameters and named natural ground.
 *
 * Pure: no three, no DOM, and no heights. `src/west-ground.js` turns what is
 * described here into the ground the traveler walks on, and
 * `src/west-regions-scenery.js` draws it; both read the same numbers, as do the
 * tests. The split is the one `amod-world.js` and `amod-terraces.js` use: the
 * shapes live apart from the height field that needs them, so the height field
 * can import them without a cycle.
 *
 * Everything here is in world metres. These four regions never existed in the
 * old 56 m frame and no world-scale cluster reaches them, so nothing here goes
 * through `toWorld`.
 *
 * What comes from the atlas: the regions' hexes (through the survey) and their
 * rivers, read from the World Builder map's river edges (`src/region-rivers.js`)
 * and chained and softened the way the journal chart draws them. What the atlas
 * does not draw — Meneth's valley streams, Nesdor's braids, Vastos's watering
 * pans and sulfur ground — is derived from the landform the lore describes, and
 * said so at each one. See docs/four-regions-brief.md.
 */
import { PLAYABLE_SURVEY } from './region-survey.js';
import { RIVER_EDGES } from './region-rivers.js';
import { riverCourses } from './region-layout.js';
import { regionNameAt, REGION_CELLS, METRES_PER_HEX } from './region-world.js';
import { ELAGOS_REACHES } from './elagos-world.js';

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const point = (x, z) => Object.freeze({ x, z });

// ---------------------------------------------------------------------------
// Watercourses
// ---------------------------------------------------------------------------
const soften = (points, passes = 2) => {
  let current = points;
  for (let pass = 0; pass < passes; pass++) {
    const next = [current[0]];
    for (let i = 0; i < current.length - 1; i++) {
      const a = current[i], b = current[i + 1];
      next.push({ x: a.x * .75 + b.x * .25, z: a.z * .75 + b.z * .25 }, { x: a.x * .25 + b.x * .75, z: a.z * .25 + b.z * .75 });
    }
    next.push(current.at(-1));
    current = next;
  }
  return current;
};

/** Evenly spaced samples along a polyline, with the unit normal of each piece. */
function resample(points, spacing) {
  const out = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], length = Math.hypot(b.x - a.x, b.z - a.z);
    if (length < 1e-6) continue;
    const steps = Math.max(1, Math.round(length / spacing));
    for (let step = out.length ? 1 : 0; step <= steps; step++) {
      const t = step / steps;
      out.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, nx: -(b.z - a.z) / length, nz: (b.x - a.x) / length });
    }
  }
  return out;
}

/**
 * The atlas's courses for these four regions, keyed by the regions their edges
 * run between. A key is the regions of one chain, sorted and joined, which is
 * stable whatever order the edges are read in and says plainly which map line
 * each river is. `riverCourses` breaks a chain wherever three edges meet a hex
 * corner, so a confluence arrives as two courses and is rejoined by hand.
 */
const ATLAS_COURSES = (() => {
  const courses = new Map();
  for (const course of riverCourses(PLAYABLE_SURVEY, RIVER_EDGES, undefined, { soften: 0 })) {
    const key = [...new Set(course.edges.flatMap(edge => edge.regions))].sort().join(',');
    courses.set(key, course.points.map(p => point(p.x, p.z)));
  }
  return courses;
})();

function atlasCourse(key) {
  const points = ATLAS_COURSES.get(key);
  if (!points) throw new Error(`The atlas draws no river between ${key}. Is src/region-rivers.js stale?`);
  return points;
}

/**
 * A watercourse in world metres. `cut` is how far the water surface lies below
 * the lie of the land, `bed` how far the bed lies below that water — which is
 * simply how deep the river is — and `halfWidth` how wide the water is. A course
 * that changes along its length takes `cutEnd` and `halfWidthEnd` as well and is
 * lerped between the two: a river that loses gradient widens and stops cutting,
 * and the Carica does exactly that between its upper section and its corridor.
 *
 * `fordUntil` is how far along a course a traveler can still walk through it: all
 * the way for a beck, not at all for the Lizeem, and a third of the way down the
 * Carica, which is shallow over gravel at its head and a wall below it. Nobody in
 * these four regions has built a bridge, so deep water is the end of the road.
 *
 * `taper` is how many metres of its end a course gives its channel up over: a
 * beck that reaches level ground spreads and sinks, and ending one in a wall of
 * bank would be a lie about what happens to snow water on a flat plain.
 */
function river(id, name, course, { halfWidth, cut, bed = .55, halfWidthEnd, cutEnd, fordUntil = 1, taper = 0, head = null }) {
  const points = Object.freeze(soften(course).map(p => point(p.x, p.z)));
  const samples = Object.freeze(resample(points, 5).map(sample => Object.freeze(sample)));
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of points) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); }
  return Object.freeze({ id, name, points, samples, halfWidth, cut, bed, taper, fordUntil, head,
    halfWidthEnd: halfWidthEnd ?? halfWidth, cutEnd: cutEnd ?? cut,
    maxHalf: Math.max(halfWidth, halfWidthEnd ?? halfWidth),
    bounds: Object.freeze({ minX, maxX, minZ, maxZ }) });
}

/** How wide and how deeply cut a course is at a point of its length, 0 at the source. */
export const courseHalfAt = (course, along) => course.halfWidth + (course.halfWidthEnd - course.halfWidth) * along;
export const courseCutAt = (course, along) => course.cut + (course.cutEnd - course.cut) * along;

// ---------------------------------------------------------------------------
// Vastos: the cold tableland
// ---------------------------------------------------------------------------
/**
 * The Vastos River, on the atlas's own line across the plain's southern portion.
 * It is drawn small, and the lore keeps it small: "not a large river in the
 * lowland sense: it is relatively shallow, braided in its middle sections where
 * the flat terrain slows it". So: a metre and a half of cut and three metres of
 * water either side of the line, which a traveler wades.
 *
 * The lore has it running east to west. The atlas runs it the other way, and so
 * does the game's own relief — Vastos stands ten metres above the lake country,
 * so its water can only leave eastward. Built flowing east; see the brief.
 */
export const VASTOS_RIVER = river('vastos-river', 'The Vastos River',
  atlasCourse('Elagos,Meneth,Vastos'), { halfWidth: 3.2, cut: 1.55, bed: .5 });

/**
 * The snowmelt beck off the Amod margin: "fed by snow melt from the higher
 * ground at the margins". The atlas draws it down the north-eastern border and
 * then stops, because whatever it joins is in country nobody has built. On flat
 * upland a beck that reaches level ground simply spreads and sinks, so its cut
 * tapers away over its last stretch rather than ending in a wall of bank.
 */
export const VASTOS_BECK = river('vastos-beck', 'The Snowmelt Beck',
  [...atlasCourse('Amod,Vastos')].reverse(), { halfWidth: 1.7, cut: 1.1, bed: .35, taper: 70 });

/**
 * Where the plain slows the river enough to let it split. The lore puts the
 * braid "in its middle sections", so the two side threads leave the main line
 * over the middle third of the course and rejoin it, with an island of gravel
 * between them. They are shallower than the main channel: a braid is what a
 * river does when it has more bed than water.
 */
export const VASTOS_BRAID = Object.freeze({ from: .34, to: .68, offset: 17, half: 2.1, cut: .95 });

/**
 * The watering points the vel-vastos is organised round: "the management of the
 * small watering points across the plain". The atlas draws none — on ground this
 * flat they are not river features — so these are placed on the open range
 * between the river and the northern margin, well clear of both.
 *
 * A pan is wide and shallow: a dish of turf a hand deep in water, not a pond.
 */
export const VASTOS_PANS = Object.freeze([
  Object.freeze({ id: 'west-pan', x: -1580, z: -450, radius: 12, depth: .55 }),
  Object.freeze({ id: 'mid-pan', x: -1500, z: -420, radius: 9, depth: .5 }),
  Object.freeze({ id: 'long-pan', x: -1560, z: -330, radius: 12.5, depth: .6 }),
  Object.freeze({ id: 'east-pan', x: -1420, z: -300, radius: 8.5, depth: .45 }),
  Object.freeze({ id: 'south-pan', x: -1545, z: -185, radius: 10, depth: .5 }),
]);

/**
 * The sulfur ground on the plain's western margin, where Vastos begins to fall
 * toward the Pyros side: "the residual geothermal ground, the occasional sulfur
 * spring, the rock types that the Pyrosi identify as meaningful even when they
 * are not actively fumarolic". One apron of pale sinter, standing a little proud
 * of the turf because that is how sinter is made, with a warm pool at its
 * middle and three vents round it.
 */
export const VASTOS_SINTER = Object.freeze({
  id: 'sulfur-ground', x: -1700, z: -430, radius: 30, rise: 1.3,
  pool: Object.freeze({ x: -1690, z: -424, radius: 5.4, depth: 1.1, rim: .25 }),
  vents: Object.freeze([point(-1712, -442), point(-1684, -412), point(-1707, -414)]),
});

/**
 * The eastern margin's lake basins: "moister and more varied, with some small
 * lake basins that prefigure the Elagosi landscape beyond". Two of them, on the
 * fall toward the lake country, deep enough that they are water and not a wet
 * meadow — which is what makes them a rehearsal for Elagos rather than more pan.
 */
export const VASTOS_BASINS = Object.freeze([
  Object.freeze({ id: 'upper-basin', x: -1325, z: -370, radius: 22, depth: 3.2, rim: .6 }),
  Object.freeze({ id: 'lower-basin', x: -1380, z: -195, radius: 18, depth: 2.6, rim: .55 }),
]);

// ---------------------------------------------------------------------------
// Meneth: the ridges
// ---------------------------------------------------------------------------
/**
 * The Meneth Upland, as the lore describes it and nothing more: "a sequence of
 * parallel ridges running roughly east-west across the territory, with the open
 * valleys between them acting as natural corridors... The ridges are low enough
 * to cross without specialized route-finding but high enough to make the
 * crossing of them a measurable effort."
 *
 * So the field is a wave in z alone, which is what "running east-west" means, at
 * a hundred and thirty metres crest to crest and seven either side of the mean —
 * fourteen metres of climb to cross one, which is work and is not mountaineering.
 * `wander` bends each crest line gently north and south along its length, because
 * a ridge is a landform and not a corrugation.
 *
 * `fadeFrom`/`fadeTo` are the lore's other insistence: "Moving south from Meneth,
 * the ridges lower and widen, the valley floors broaden... There is no clear line
 * that marks where Meneth ends and the lake country begins."
 */
export const MENETH_RIDGES = Object.freeze({
  wavelength: 132, amplitude: 7.2, wander: 9, wanderLength: 950, origin: -404,
  fadeFrom: 20, fadeTo: 210,
});

/** Where a point stands in the ridge sequence: a crest at each integer, a trough at each half. */
export function menethRidgePhase(x, z) {
  const R = MENETH_RIDGES;
  return (z - R.origin + R.wander * Math.sin(x / R.wanderLength * Math.PI * 2)) / R.wavelength;
}
/** The z of trough `index` at a given x. The becks are cut along these lines. */
export function menethTroughZ(index, x) {
  const R = MENETH_RIDGES;
  return R.origin + (index + .5) * R.wavelength - R.wander * Math.sin(x / R.wanderLength * Math.PI * 2);
}

/**
 * "Each valley has its stream, fed by the Lotharn snowmelt, running generally
 * south and east toward the lake-country drainage." The atlas draws no water in
 * Meneth at all, so every beck here is derived from the landform: each follows
 * its own valley's trough line, which is where a valley's water has to be.
 *
 * They run **west**, not east, and that is the third place where this region's
 * lore and the authored map disagree about a compass bearing. Measured on the
 * ground the map actually makes: each of these valley floors stands at about
 * twenty metres on its eastern side and falls to eight or twelve on its western
 * one, and the Vastos River along Meneth's eastern border runs at twenty-one,
 * which is above the valley floors and cannot be drained into. The lake country
 * is not downhill of Meneth on this map; the branch country and the Lizeem are.
 * So each beck starts at the head of its own valley — which is its eastern end —
 * and runs west and down, and leaves the region for the country beyond. A stream
 * has to go downhill; where the lore and the ground disagree, the ground wins.
 *
 * `headX` is that high point, measured off the ground each valley actually has.
 */
const MENETH_VALLEYS = Object.freeze([
  Object.freeze({ index: 0, headX: -1760, footX: -2070 }),
  Object.freeze({ index: 1, headX: -1720, footX: -2070 }),
  Object.freeze({ index: 2, headX: -1640, footX: -2070 }),
  Object.freeze({ index: 3, headX: -1690, footX: -2060 }),
]);

export const MENETH_BECKS = Object.freeze(MENETH_VALLEYS.map(valley => {
  const line = [];
  for (let x = valley.headX; x >= valley.footX; x -= 30) line.push(point(x, menethTroughZ(valley.index, x)));
  line.push(point(valley.footX, menethTroughZ(valley.index, valley.footX)));
  return river(`meneth-beck-${valley.index}`, `The ${['first', 'second', 'third', 'fourth'][valley.index]} valley beck`,
    line, { halfWidth: 1.6, cut: 1, bed: .3, taper: 55 });
}));

// ---------------------------------------------------------------------------
// Caricas: the Lizeem, the Carica and the fox's corridor
// ---------------------------------------------------------------------------
/**
 * The Lizeem's upper channel. The atlas draws it as one line down the whole
 * western side of Caricas and then east along Nesdor's southern edge, in two
 * chains that meet where the Carica joins it; `riverCourses` breaks a chain at
 * any corner three edges meet, so the confluence is rejoined here. The map marks
 * its head medium and the rest of it large, and the river is built that way:
 * five metres of water either side at the head and fifteen at the mouth.
 *
 * This is the biggest water in the playable world and the drain for the whole
 * western quarter of it. The lore of the branch countries has it navigable for
 * light boats with a predictable annual rise; nobody has bridged it here, and
 * nothing here can be waded.
 */
export const LIZEEM = river('lizeem', 'The Lizeem', (() => {
  const upper = [...atlasCourse('Caricas,Isareos,Nethereum,Ovesos')].reverse();
  const lower = atlasCourse('Gala,Nesdor,Ovesos');
  // The two chains share the junction corner; drop the duplicate.
  return [...upper, ...lower.slice(1)];
})(), { halfWidth: 5, halfWidthEnd: 15, cut: 2.6, cutEnd: 3.4, bed: 2.2, fordUntil: 0 });

/**
 * The Carica, and with it the whole of what Caricas is. The lore gives the river
 * two halves and the region takes its character from both:
 *
 *  - "a fast, rocky upper section where the eastern plateau breaks into the inner
 *    drainage basin" — narrow, deeply cut, gravel-bedded, and shallow enough at
 *    its head to wade;
 *  - "a slower, wooded middle valley where the river loses gradient and the banks
 *    thicken with the mixed riverine forest that is the Carica's characteristic
 *    landscape. This wooded middle valley — the Carica corridor — is the homeland
 *    of the vel-caric, the river fox."
 *
 * So the width doubles and the cut halves between the two, which is what losing
 * gradient does to a river, and the corridor is the stretch where that has
 * happened.
 */
export const CARICA = river('carica', 'The Carica', atlasCourse('Caricas,Nesdor'),
  { halfWidth: 2.2, halfWidthEnd: 6, cut: 2.8, cutEnd: 1.7, bed: .9, fordUntil: .3 });

/**
 * The fox corridor: "approximately six miles of the Carica's middle reach", which
 * at this scale is the lower two-thirds of the river. Inside it the bank woodland
 * is old growth and uncleared, and the fox keepers' one rule holds — the
 * immediate riverbank is fox ground. The keepers are people and are not built;
 * the ground they keep is terrain, and is.
 */
export const CARICA_CORRIDOR = Object.freeze({ from: .34, to: .96, bankReach: 34, woodReach: 92 });

/**
 * The shelf itself, as a ramp in x: nothing at the western bank, fifteen metres
 * of it by the eastern edge. `from` and `to` are where the ramp starts and ends,
 * which is most of the width of the region, because the lore calls the shelf
 * broad and the country below it a corridor rather than a plain.
 */
export const CARICAS_SHELF = Object.freeze({ from: -2130, to: -1700, rise: 15 });

// ---------------------------------------------------------------------------
// Nesdor: the Flats, and the water that braids across them
// ---------------------------------------------------------------------------
/**
 * The Ela-South Reach. The atlas's own water network hands the Lake Lands' whole
 * drainage into Nesdor and then stops: the Ela-south (src/elagos-world.js) ends
 * at (-1625, 514), which was past the western edge of the world while Elagos was
 * the westernmost built region and is inside Nesdor now. Neither region's lore
 * mentions the other's river. A river cannot stop in the middle of a country, so
 * Nesdor's drainage takes the water on to the Lizeem, which is where every other
 * drop in this quarter of the continent goes.
 *
 * It crosses the Flats to get there, so it does what the lore says water does on
 * the Flats: "the tributaries widen, slow, and begin to braid in the way that
 * rivers braid when the gradient declines".
 */
const ELA_SOUTH = ELAGOS_REACHES.find(reach => reach.id === 'ela-south');
export const ELA_SOUTH_REACH = river('ela-south-reach', 'The Ela-South Reach', [
  point(ELA_SOUTH.points.at(-1).x, ELA_SOUTH.points.at(-1).z),
  point(-1638, 556), point(-1651, 600), point(-1661, 648),
  point(-1668, 696), point(-1678, 738), point(-1694, 774), point(-1714, 796),
  // It takes its level from the water it is taking over, not from the ground it
  // starts on: a river handed on from one region to the next cannot step upward
  // at the handover, and `head` is what stops it.
], { halfWidth: 4.2, halfWidthEnd: 5.6, cut: 1.5, cutEnd: 1.2, bed: .6, head: ELA_SOUTH.points.at(-1).surface - .1 });

/**
 * The second of "the several small tributaries that cross Nesdor", off the
 * valley head in the north-west. The atlas draws none of them, so this one is
 * derived: it starts on the last of the branch country's shallow valleys and
 * runs south-east and then south onto the Flats, where it gives up choosing a
 * channel in the same way the reach does.
 */
export const NESDOR_BECK = river('nesdor-beck', 'The Flats Beck', [
  point(-1596, 344), point(-1570, 392), point(-1548, 440), point(-1534, 492),
  point(-1530, 546), point(-1538, 600), point(-1556, 650), point(-1580, 694),
], { halfWidth: 2.6, halfWidthEnd: 4, cut: 1.3, cutEnd: 1, bed: .45, taper: 60 });

/**
 * The braided reaches. A braid is what a river does when it has more bed than
 * water, and the Flats give both of these more bed than they know what to do
 * with: the last two-fifths of each one runs as three channels round bars of
 * sand rather than as one.
 */
export const WEST_BRAIDS = Object.freeze([
  Object.freeze({ id: 'vastos', course: VASTOS_RIVER, ...VASTOS_BRAID, lift: .18 }),
  Object.freeze({ id: 'ela-south', course: ELA_SOUTH_REACH, from: .42, to: .94, offset: 21, half: 2.6, cut: .9, lift: .16 }),
  Object.freeze({ id: 'nesdor-beck', course: NESDOR_BECK, from: .46, to: .92, offset: 16, half: 1.9, cut: .75, lift: .14 }),
]);

// ---------------------------------------------------------------------------
// Every piece of western water, and the questions the rest of the game asks of it
// ---------------------------------------------------------------------------
export const WEST_RIVERS = Object.freeze([VASTOS_RIVER, VASTOS_BECK, ...MENETH_BECKS, LIZEEM, CARICA,
  ELA_SOUTH_REACH, NESDOR_BECK]);
/** Standing water: pans, basins and the warm pool, as circles with their own depth. */
export const WEST_POOLS = Object.freeze([
  ...VASTOS_PANS, ...VASTOS_BASINS,
  Object.freeze({ id: 'sulfur-pool', ...VASTOS_SINTER.pool, depth: VASTOS_SINTER.pool.depth }),
]);

/** The four western regions, in the order they were built. */
export const WEST_REGION_NAMES = Object.freeze(['Vastos', 'Meneth', 'Caricas', 'Nesdor']);

const boxOf = () => ({ minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity });
const grow = (box, x, z, reach) => {
  box.minX = Math.min(box.minX, x - reach); box.maxX = Math.max(box.maxX, x + reach);
  box.minZ = Math.min(box.minZ, z - reach); box.maxZ = Math.max(box.maxZ, z + reach);
};
/**
 * Each western region's own ground, from its authored hexes. A landform that
 * belongs to one region is asked about only inside that region's box, so the
 * cost of the whole west is two comparisons at every point of the rest of Azhora.
 * A region not yet registered has no cells and gets an empty box, which every
 * test rejects — so a region under construction shapes nothing.
 */
export const WEST_REGION_BOXES = Object.freeze(Object.fromEntries(WEST_REGION_NAMES.map(name => {
  const box = boxOf();
  for (const cell of REGION_CELLS[name] ?? []) grow(box, cell.x, cell.z, METRES_PER_HEX * .8);
  return [name, Object.freeze(box)];
})));

export const inBox = (box, x, z) => x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ;

/** The box every western landform reaches, with a margin: outside it nothing here applies. */
export const WEST_GROUND = Object.freeze((() => {
  const box = boxOf();
  for (const course of WEST_RIVERS) {
    const b = course.bounds, reach = course.halfWidth + course.cut * 3 + 24;
    grow(box, b.minX, b.minZ, reach); grow(box, b.maxX, b.maxZ, reach);
  }
  for (const pool of WEST_POOLS) grow(box, pool.x, pool.z, pool.radius + 24);
  grow(box, VASTOS_SINTER.x, VASTOS_SINTER.z, VASTOS_SINTER.radius + 24);
  for (const name of WEST_REGION_NAMES) {
    const region = WEST_REGION_BOXES[name];
    if (!Number.isFinite(region.minX)) continue;
    grow(box, region.minX, region.minZ, 0); grow(box, region.maxX, region.maxZ, 0);
  }
  return { ...box };
})());

/** Distance from a point to a course's centre line; cheap to reject far away. */
export function courseDistance(course, x, z, limit = Infinity) {
  const b = course.bounds;
  const outside = Math.max(b.minX - x, x - b.maxX, b.minZ - z, z - b.maxZ, 0);
  if (outside > limit) return outside;
  let best = Infinity;
  const points = course.points;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], c = points[i], dx = c.x - a.x, dz = c.z - a.z;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
    best = Math.min(best, Math.hypot(x - a.x - dx * t, z - a.z - dz * t));
  }
  return best;
}

/** How far along a course a point lies, from 0 at the source to 1 at the mouth. */
export function coursePosition(course, x, z) {
  let best = 0, bestDistance = Infinity;
  const samples = course.samples;
  for (let i = 0; i < samples.length; i++) {
    const d = (samples[i].x - x) ** 2 + (samples[i].z - z) ** 2;
    if (d < bestDistance) { bestDistance = d; best = i; }
  }
  return samples.length < 2 ? 0 : best / (samples.length - 1);
}

/** The nearest western river and the distance to its centre line. */
export function nearestWestRiver(x, z, limit = Infinity) {
  let best = null, distance = Infinity;
  for (const course of WEST_RIVERS) {
    const d = courseDistance(course, x, z, Math.min(limit, distance));
    if (d < distance) { distance = d; best = course; }
  }
  return { river: best, distance };
}

/** How far a point is from the Carica inside the fox corridor, or Infinity outside it. */
export function caricaCorridorDistance(x, z) {
  const distance = courseDistance(CARICA, x, z, CARICA_CORRIDOR.woodReach);
  if (distance > CARICA_CORRIDOR.woodReach) return Infinity;
  const along = coursePosition(CARICA, x, z);
  return along >= CARICA_CORRIDOR.from && along <= CARICA_CORRIDOR.to ? distance : Infinity;
}
export const westRiverDistance = (x, z, limit = Infinity) => nearestWestRiver(x, z, limit).distance;

/** The standing water a point is in, or null. Used to keep scatter out of it. */
export function westPoolAt(x, z, margin = 0) {
  for (const pool of WEST_POOLS) if (Math.hypot(x - pool.x, z - pool.z) < pool.radius + margin) return pool;
  return null;
}

/** True where the regional scatter must not plant: any western water, with a margin. */
export function inWestWater(x, z, margin = 0) {
  if (westPoolAt(x, z, margin)) return true;
  // The widest the course ever gets, not its width here: this is a keep-out test
  // for scatter, and a tuft of grass in the river is a worse error than a bare
  // metre of bank on the narrow half of one.
  const near = nearestWestRiver(x, z, 60);
  return Boolean(near.river) && near.distance < near.river.maxHalf + margin;
}

/**
 * Ground that grows nothing: western water, and the sinter crust, where the
 * grass stops in a line because the crust is not soil.
 *
 * This is a test and not a list of circles on purpose. The other regions hand
 * `world-regions.js` their clearings as discs in `REGION_CLEARINGS`, which is
 * scanned once per scatter candidate for the whole world; Elagos's water alone
 * costs a hundred and seventy-four of them, and four western regions of rivers
 * would have doubled that list for every tuft of grass in Drent. A function that
 * rejects on a bounding box in two comparisons is cheaper and says the same thing.
 */
export function westBareGround(x, z, margin = 0) {
  if (inWestWater(x, z, margin)) return true;
  return Math.hypot(x - VASTOS_SINTER.x, z - VASTOS_SINTER.z) < VASTOS_SINTER.radius * .8 + margin;
}

// ---------------------------------------------------------------------------
// What the rest of the game needs by name
// ---------------------------------------------------------------------------
/**
 * The middle of a course, pulled to the nearest point of it that stands in the
 * region being named. Two of these rivers run along a border for part of their
 * length — the beck's middle is on the Amod side of the line — and a chart entry
 * for a Vastos river should be a place in Vastos.
 */
function midpointIn(course, region, fraction = .5) {
  const points = course.points, middle = Math.floor(points.length * fraction);
  for (let step = 0; step < points.length; step++) for (const index of [middle - step, middle + step]) {
    const p = points[index];
    if (p && regionNameAt(p.x, p.z) === region) return point(p.x, p.z);
  }
  return point(points[middle].x, points[middle].z);
}
/** The middle of a course's braided reach, as a bare point. */
const braidMiddle = (course, braid) => {
  const sample = course.samples[Math.round(course.samples.length * (braid.from + braid.to) / 2)];
  return point(sample.x, sample.z);
};

/** Natural ground worth a name on the chart. Nothing here is built by anybody. */
export const WEST_REGION_LANDMARKS = Object.freeze([
  Object.freeze({ id: 'vastos-river', name: 'The Vastos River', ...midpointIn(VASTOS_RIVER, 'Vastos'),
    description: 'The plain’s one river, shallow and wide-banked, running east off the tableland toward the lake country. In a dry year you cross it without wetting your knees; in a wet one it is the reason nobody on this plain builds anything they cannot leave.' }),
  Object.freeze({ id: 'vastos-braids', name: 'The Braided Reach', ...braidMiddle(VASTOS_RIVER, VASTOS_BRAID),
    description: 'Where the ground goes flat the river stops choosing. Three shallow channels run side by side round bars of grey gravel, and none of them is the river.' }),
  Object.freeze({ id: 'vastos-sinter', name: 'The Sulfur Ground', x: VASTOS_SINTER.x, z: VASTOS_SINTER.z,
    description: 'A crust of pale sinter on the plain’s western fall, standing a hand’s breadth above the turf, with a warm pool at its middle and three vents breathing round it. The grass stops where the crust starts.' }),
  Object.freeze({ id: 'vastos-pans', name: 'The Watering Pans', x: VASTOS_PANS[2].x, z: VASTOS_PANS[2].z,
    description: 'Wide shallow dishes of turf holding a hand’s depth of water, strung across the open range. On a plain this flat they are the only thing that decides where a herd can be.' }),
  Object.freeze({ id: 'vastos-basins', name: 'The Eastern Basins', x: VASTOS_BASINS[0].x, z: VASTOS_BASINS[0].z,
    description: 'Two small cold lakes on the fall toward the lake country, with sedge to the waterline. Everything about them is a rehearsal for Elagos except the size.' }),
  Object.freeze({ id: 'meneth-ridges', name: 'The Meneth Ridges', x: -1870, z: -240,
    description: 'Rounded ridge after rounded ridge, all of them running east and west, with an open valley between each pair. None of them needs route-finding and every one of them is a climb. This is the whole of what Meneth is, and it is the reason everything that crosses between the mountains and the lake country crosses here.' }),
  Object.freeze({ id: 'meneth-becks', name: 'The Valley Becks', ...midpointIn(MENETH_BECKS[1], 'Meneth'),
    description: 'Every valley floor has its stream: cold, shallow, quick, running east off the ridges to the one river that takes them. You can step over any of them without thinking about it, which is why nobody has ever bridged one.' }),
  Object.freeze({ id: 'meneth-nut-slopes', name: 'The Nut Slopes', x: -1905, z: -180,
    description: 'Wild chestnut and walnut standing well apart on the lower ridge faces, with the close-grown hardwood above them and the hay meadow below. The spacing is the giveaway: nothing in a wood grows that far from its neighbour by accident.' }),
  Object.freeze({ id: 'nesdor-flats', name: 'The Nesdor Flats', x: -1450, z: 700,
    description: 'Dark alluvial ground with the relief measured in feet, running east until it stops being Nesdor and starts being the Moros without anything happening in between. The horizon opens here in a way it does not anywhere in the branch country behind it.' }),
  Object.freeze({ id: 'nesdor-braids', name: 'The Braided Water', ...braidMiddle(ELA_SOUTH_REACH, WEST_BRAIDS[1]),
    description: 'Where the gradient dies the water stops keeping to one channel: three shallow threads side by side round bars of sand, wide, slow, and a different shape after every flood season.' }),
  Object.freeze({ id: 'nesdor-head', name: 'The Valley Head', x: -1570, z: 380,
    description: 'The last of the branch country: a shallow broad valley with hazel and oak on its slopes and a beck on its floor, and then the ground opens out and there are no more valleys.' }),
  Object.freeze({ id: 'lizeem-bend', name: 'The Lizeem Bend', ...midpointIn(LIZEEM, 'Nesdor'),
    description: 'Where the great river turns south-east along the foot of the Flats, taking the Carica and everything off the Flats with it. Deep, slow and a hundred paces of water across; the far bank is another country and there is no way to it here.' }),
  Object.freeze({ id: 'carica-corridor', name: 'The Carica Corridor', ...midpointIn(CARICA, 'Caricas'),
    description: 'Six miles of riverbank that nobody has ever cleared: old-growth mixed forest standing to the water on both sides, the river slow and deep between them, and the vel-caric somewhere in it looking at you. The Caricas have not cleared this ground and do not discuss the possibility.' }),
  Object.freeze({ id: 'carica-upper', name: 'The Upper Carica', ...midpointIn(CARICA, 'Caricas', .13),
    description: 'Where the river comes off the eastern shelf: quick, cold, and running over rock and gravel in a cut too narrow and too steep for anything to stand on the bank. A summer storm on the plateau arrives here two days later.' }),
  Object.freeze({ id: 'lizeem-channel', name: 'The Lizeem', ...midpointIn(LIZEEM, 'Caricas'),
    description: 'The upper channel of the great river, the drain for this whole quarter of the continent and the western edge of the country. Deep, slow, wide enough for light boats, and not crossable anywhere along here by anyone on foot.' }),
  Object.freeze({ id: 'caricas-shelf', name: 'The Eastern Shelf', x: -1740, z: 250,
    description: 'The rough, dry upland the Carica comes off: fifteen metres above the corridor, stony, thin in the soil, and holding no water at all. Everything that makes the valley below it worth having drains off this.' }),
  Object.freeze({ id: 'vastos-beck', name: 'The Snowmelt Beck', ...midpointIn(VASTOS_BECK, 'Vastos'),
    description: 'Snow water off the high ground on the plain’s north-eastern margin, running hard for a few hundred metres and then giving up: the bank flattens, the channel spreads, and the beck is simply gone into the grass.' }),
]);

export { point as westPoint, resample as westResample, soften as westSoften, river as westRiver, atlasCourse };
