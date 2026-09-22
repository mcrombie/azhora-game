/**
 * The western and southern regions of the playable world — Vastos, Meneth,
 * Caricas, Nesdor, Eer and Isareos — as water, landform parameters and named
 * natural ground.
 *
 * The southern countries are here rather than in a file of their own, and the
 * reason is their water. Eer's one authored watercourse is the Lizeem's last
 * reach and Isareos's eastern boundary is the Lizeem's head; the Lizeem is built
 * in this module, and a reach that takes the great river's level over at the
 * handover has to be able to read it. `west-ground.js` then cuts every channel in
 * `WEST_RIVERS` in one pass over one bounding box; a parallel southern module
 * would mean a second box, a second profile table and a second pass at every
 * point of Azhora, to save a comment. `docs/six-regions-brief.md` predicted
 * `src/south-regions.js` for all six countries; two of them in, nothing has
 * wanted one. Eer is a plain with two becks on it and Isareos is rolling grass
 * with three, and both are what `relief()` and `REGION_TERRAIN` already draw.
 * The desert's dry channels and waterholes are the first thing on that list that
 * is new machinery, and it can have its own module when it arrives.
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
import { hexOwnerAt, REGION_CELLS, METRES_PER_HEX } from './region-world.js';
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
 * The atlas's courses, keyed by the regions their edges run between. A key is
 * the regions of one chain, sorted and joined, which is stable whatever order
 * the edges are read in and says plainly which map line each river is.
 * `riverCourses` breaks a chain wherever three edges meet a hex corner, so a
 * confluence arrives as two courses and is rejoined by hand.
 *
 * Which chains exist depends on which regions `scripts/build-region-rivers.mjs`
 * was asked for, because a confluence with a river nobody asked for is not a
 * confluence: it is one river going past. When the six southern countries were
 * added to `RIVER_REGIONS` the Lizeem gained four new tributaries and its two
 * chains became five, so `joinAtlas` below puts the Lizeem back together. Every
 * point of it is the same point it was; `tests/west-rivers.test.js` holds it.
 */
const ATLAS_COURSES = (() => {
  const courses = new Map();
  for (const course of riverCourses(PLAYABLE_SURVEY, RIVER_EDGES, undefined, { soften: 0 })) {
    const key = [...new Set(course.edges.flatMap(edge => edge.regions))].sort().join(',');
    courses.set(key, Object.freeze({ points: course.points.map(p => point(p.x, p.z)), edges: course.edges }));
  }
  return courses;
})();

function atlasChain(key) {
  const chain = ATLAS_COURSES.get(key);
  if (!chain) throw new Error(`The atlas draws no river between ${key}. Is src/region-rivers.js stale?`);
  return chain;
}
function atlasCourse(key) { return atlasChain(key).points; }

const same = (a, b) => Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.z - b.z) < 1e-6;
/**
 * One polyline out of several chains that meet end to end, in the order given.
 * Each piece is turned to follow the one before it, and the shared corner is
 * dropped, so the result is what `riverCourses` would have returned had the
 * confluences not broken it. A piece that does not touch the line so far is an
 * error rather than a gap: a river with a hole in it is worse than a crash.
 */
function joinAtlas(...pieces) {
  let line = null;
  for (const piece of pieces) {
    const points = Array.isArray(piece) ? piece : atlasCourse(piece);
    if (!line) { line = [...points]; continue; }
    const end = line.at(-1);
    if (same(end, points[0])) line.push(...points.slice(1));
    else if (same(end, points.at(-1))) line.push(...[...points].reverse().slice(1));
    else throw new Error(`Atlas chains do not meet at (${end.x}, ${end.z}).`);
  }
  return line;
}
/** The part of a chain whose edges still touch `region`, from whichever end it starts on. */
function chainWithin(key, region) {
  const { points } = atlasChain(key);
  return points.slice(0, chainBreak(key, region) + 1);
}
/**
 * The rest of that chain: from the last edge that touches `region` to the far end.
 * The two together are the whole chain, and they share the point they meet at, so
 * a course built on one begins exactly where a course built on the other stops.
 */
function chainBeyond(key, region) {
  const { points } = atlasChain(key);
  return points.slice(chainBreak(key, region));
}
function chainBreak(key, region) {
  const { edges } = atlasChain(key);
  let last = 0;
  while (last < edges.length && edges[last].regions.includes(region)) last++;
  return last;
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
 *
 * `head` is a water level a course starts at rather than works out for itself, and
 * `headOf` is the same thing named as another course instead of as a number: the
 * level that course hands on at, whatever it turns out to be. A river carried on
 * from one region to the next cannot step up at the handover, and it should not
 * step down either — the two reaches are one river and the eye reads a centimetre
 * of waterfall in the middle of it. `west-ground.js` builds the profiles down
 * `WEST_RIVERS` in order, so a course with `headOf` must come after the one it
 * names.
 */
function river(id, name, course, { halfWidth, cut, bed = .55, halfWidthEnd, cutEnd, fordUntil = 1, taper = 0, head = null, headOf = null }) {
  const points = Object.freeze(soften(course).map(p => point(p.x, p.z)));
  const samples = Object.freeze(resample(points, 5).map(sample => Object.freeze(sample)));
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of points) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); }
  return Object.freeze({ id, name, points, samples, halfWidth, cut, bed, taper, fordUntil, head, headOf,
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
  // Five chains now, where there were two. Down the Caricas bank the Oveth, the
  // Neth and the Isareos border river each break the line where they come in;
  // below Caricas the Nesdor bank runs on into the Eer-Gala reach, which belongs
  // to a country that is not built yet. The Lizeem built here is exactly the
  // river the four regions were built against and stops exactly where it did:
  // at the last corner Nesdor's bank reaches.
  const upper = [...joinAtlas('Caricas,Ovesos', 'Caricas,Nethereum', 'Caricas,Isareos')].reverse();
  const lower = joinAtlas('Nesdor,Ovesos', chainWithin('Eer,Gala,Nesdor,Northern Ascarth', 'Nesdor'));
  // The two halves share the junction corner; drop the duplicate.
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

// ---------------------------------------------------------------------------
// Eer: the Lizeem's last reach, and two channels off it to the sea
// ---------------------------------------------------------------------------
/**
 * The Lizeem below Nesdor. The atlas carries the great river on past the bank the
 * four western regions were built against: five more edges down the Eer|Gala
 * border and one on Eer|Northern Ascarth, ending at (-1350, 1213), which on this
 * map is its mouth — the hexes south-west of that point are unclaimed sea, and the
 * estuary reaches inland between Gala and Eer.
 *
 * It is a **separate course** from `LIZEEM` on purpose, and the reason is the four
 * regions already built. Lengthening the Lizeem in place would resample and
 * re-soften its whole polyline, move every point of it by a little, and re-seed
 * every tree on both banks in Caricas and Nesdor — which is the one thing the
 * rejoin of its shattered chains was careful not to do. So the reach begins at the
 * exact point the Lizeem stops (`chainBeyond` and `chainWithin` share that corner)
 * and takes the water over at the level the Lizeem hands it on at (`headOf`),
 * which is what the Ela-South Reach does where the atlas hands Elagos's drainage
 * into Nesdor. Two courses, one river, one water level.
 *
 * Wider and less deeply cut than the channel above it: a river at its mouth
 * spreads and stops digging. Still `fordUntil: 0` — the Lizeem is the wall that
 * puts Gala on the far bank, and the lore of Eer says so in as many words: "it
 * cannot be crossed anywhere along the Eer bank".
 */
export const LIZEEM_REACH = river('lizeem-reach', 'The Lizeem',
  chainBeyond('Eer,Gala,Nesdor,Northern Ascarth', 'Nesdor'),
  { halfWidth: 15, halfWidthEnd: 19, cut: 3.4, cutEnd: 1.9, bed: 2.2, fordUntil: 0, headOf: 'lizeem' });

/**
 * Eer's own water. The atlas draws none inside the region — every river edge it
 * has is the Lizeem on its western border — so these two are derived, and they are
 * derived from the ground rather than from the lore's canals, which are dug and
 * are therefore somebody's.
 *
 * The lore calls what is here "the Lizeem's northern distributaries", and that is
 * nearly what these are: both rise on the loam within a couple of hundred metres
 * of the great river's Eer bank and run south-east across the plain to the sea.
 * Nearly, and not exactly, and the difference is worth writing down — a true
 * distributary leaves its parent at the parent's own level, and the Lizeem here is
 * cut three metres into its bed, so nothing climbs out of it. What an alluvial
 * plain beside a river like that actually carries is its own drainage, running the
 * same way for the same reason, and that is what is built.
 *
 * Where they go is the atlas's. Eer's `plains` hexes are its north and north-west
 * and its `grassland` hexes its south and south-east, and the region falls the
 * same way, from the shoulder it shares with Nesdor and the Moros down to a coast
 * on two sides. So the North Channel crosses to the eastern shore and the South
 * one runs down the narrowing tongue to the southern one, and both cross the line
 * where `Cfa` becomes `Csa` — which is why alder and willow stand on their upper
 * halves and tamarisk and oleander on their lower ones.
 *
 * Shallow, slow, and braiding over their last two-fifths, which is what the Flats
 * one region upstream already do and for the same reason: more bed than water.
 *
 * **The North Channel and the South Channel** (the user's ruling, 2026-09-21).
 * The lore names no river in Eer and the atlas draws none, so the names are the
 * country's own habit rather than anybody's memory: Eer's naming is explicitly
 * descriptive and not commemorative — "A village called Long-Drainage or Red-Clay
 * has a name that tells you something useful about the place" — and these tell you
 * which of the two you are standing on, which is the useful thing.
 */
export const EER_CHANNELS = Object.freeze([
  river('eer-channel-north', 'The North Channel', [
    point(-1430, 985), point(-1350, 1002), point(-1265, 1018), point(-1175, 1034),
    point(-1080, 1050), point(-985, 1064), point(-898, 1078), point(-862, 1084),
  ], { halfWidth: 3, halfWidthEnd: 5.2, cut: 1.4, cutEnd: .9, bed: .5 }),
  river('eer-channel-south', 'The South Channel', [
    point(-1300, 1020), point(-1262, 1078), point(-1216, 1136), point(-1152, 1192),
    point(-1075, 1244), point(-990, 1290), point(-946, 1338), point(-928, 1376),
  ], { halfWidth: 2.6, halfWidthEnd: 4.6, cut: 1.3, cutEnd: .85, bed: .45 }),
]);

// ---------------------------------------------------------------------------
// Isareos: the grass hills, and the one river the atlas draws through them
// ---------------------------------------------------------------------------
/**
 * The medium course along the whole Isareos–Nethereum border. The atlas draws it
 * from (-2800, 87) — a corner inside Isareos itself, where its first edge runs
 * between two Isareos hexes — east and south to the Lizeem at (-2250, 231).
 *
 * **It is the Isa** (the user's ruling, 2026-09-21). The lore names one river in
 * Isareos and this is the only river the atlas draws there, so the name comes
 * inland with the country when the coast goes: Isamouth stands where the Isa joins
 * the Lizeem, at Isareos's south-eastern corner. **Isamouth itself is not built** —
 * it is a settlement and settlements are what this whole pass leaves out — and the
 * ground at that confluence is deliberately kept plain and unplanted so that the
 * town can be put there later without moving anything that is already down.
 *
 * Waded for its upper third, and deep below. That is not a choice made here so
 * much as the house rule for a medium river: the Carica is the same size on the
 * same map and is shallow over gravel at its head and a wall below it, and the
 * brief invokes exactly that precedent for the Neth. It changes no connectivity —
 * Isareos already reaches Nethereum on two dry edges round this river's head.
 */
export const ISAREOS_RIVER = river('isareos-river', 'The Isa',
  atlasCourse('Isareos,Nethereum'),
  { halfWidth: 3.4, halfWidthEnd: 6.5, cut: 1.9, cutEnd: 1.3, bed: .8, fordUntil: .32 });

/**
 * Three becks off the hill ground into it, one to a valley. The atlas draws no
 * water inside Isareos, so these are derived the way Meneth's were — from the
 * landform, because a valley's water has to be on its floor and the floor is
 * where the ground is lowest.
 *
 * All three run **south**, which on this country is simply downhill: Isareos is
 * low hills falling from the Vastos and Meneth margins toward the border river on
 * its southern side, and the lore's own account of the place is "rising gradually
 * from the valley floors to the upland margins". They are becks and not rivers —
 * the lore says the country has "no defining river" — so each is a step across,
 * and each ends on the course that takes it.
 */
/**
 * Where the Isa meets the Lizeem, and the one piece of Isareos that is kept empty
 * on purpose. Isamouth stands here (the user's ruling, 2026-09-21) and Isamouth is
 * a settlement, so it is not built in a pass that builds no settlements. What the
 * scatter does instead is stay off it: a town put down here later should not have
 * to move a gallery to get in, and moving a gallery moves every seeded draw after
 * it. The radius is a town's ground and nothing more.
 */
export const ISAMOUTH_GROUND = Object.freeze({ x: -2250, z: 231, radius: 62 });

export const ISAREOS_BECKS = Object.freeze([
  river('isareos-beck-west', 'The west beck', [
    point(-2698, -8), point(-2706, 38), point(-2704, 82), point(-2694, 118), point(-2686, 142),
  ], { halfWidth: 1.5, halfWidthEnd: 2.2, cut: 1, cutEnd: .8, bed: .3 }),
  river('isareos-beck-middle', 'The middle beck', [
    point(-2522, -28), point(-2530, 24), point(-2538, 78), point(-2544, 128), point(-2548, 162),
  ], { halfWidth: 1.5, halfWidthEnd: 2.2, cut: 1, cutEnd: .8, bed: .3 }),
  river('isareos-beck-east', 'The east beck', [
    point(-2362, 22), point(-2372, 74), point(-2380, 124), point(-2390, 172), point(-2400, 218), point(-2410, 244),
  ], { halfWidth: 1.5, halfWidthEnd: 2.2, cut: 1, cutEnd: .8, bed: .3 }),
]);

// ---------------------------------------------------------------------------
// Nethereum: the Neth, the hollow, and the water that gathers in it
// ---------------------------------------------------------------------------
/**
 * **The Neth above the plateau.** The atlas draws two small edges along the
 * Nethereum–Nether Desert border, from (-2450, 577) east to (-2350, 577), and then
 * hands the line on as `medium` at that corner. The brief's river list names only
 * the medium part; the map draws both, and the map wins. So this is the same river
 * a size smaller and a reach earlier: narrow, cut into the desert margin, and a
 * step across anywhere along it.
 *
 * It is built as a course of its own rather than as the head of one long river so
 * that the ford below can be a third of the *medium* reach, which is where the
 * decision was made (docs/six-regions-brief.md, "The Neth's ford, and why it is
 * there"). `NETH` takes its water level over at the corner by naming this one, so
 * the two are one river with no step at the handover.
 */
export const NETH_HEAD = river('neth-head', 'The Neth', atlasCourse('Nether Desert,Nethereum'),
  { halfWidth: 1.8, halfWidthEnd: 2.6, cut: 1.1, cutEnd: 1.5, bed: .45 });

/**
 * **The Neth.** Off the Nether Desert's edge at (-2350, 577), east and north along
 * the Nethereum–Ovesos line, and into the Lizeem at (-2100, 491). The lore gives it
 * two characters and the region's whole drainage rests on the second: "a short, fast
 * lower section that gives the Neth a split character: gentle and spreading in the
 * middle country, quick and navigable in its lower reach". So it widens and stops
 * cutting as it goes, which is what a river that is about to be navigable does.
 *
 * **Waded for its upper third, and a wall below it**, which is the Carica's rule for
 * a medium river and the Isa's after it. Here it is also the only way between two
 * countries: every one of the five Nethereum–Ovesos hex edges is this river and not
 * one of them is dry, so a Neth built unfordable would make the Nether Desert — which
 * nobody has built — the only land bridge out of Nethereum. A third of this course is
 * 115 m, which takes the ford past the corner at (-2250, 577) and over the first two
 * Nethereum–Ovesos edges; `tests/nethereum-world.test.js` holds that arithmetic.
 */
export const NETH = river('neth', 'The Neth', atlasCourse('Nether Desert,Nethereum,Ovesos'),
  { halfWidth: 3.2, halfWidthEnd: 7, cut: 1.8, cutEnd: 1.4, bed: .85, fordUntil: .33, headOf: 'neth-head' });

/**
 * The hollow: the largest piece of quiet landform in the job, and the whole of what
 * Nethereum is now that the atlas has refused it a lake.
 *
 * The lore's mechanism survives the loss of the water because it was always a
 * statement about shape — "a broad depression in the interior plateau where multiple
 * hill-streams converge and the water has no efficient route to the main Lizeem …
 * the basin's flat bottom means water that enters has nowhere urgent to go". So: a
 * dish, `rx` by `rz` metres, flat over its inner part and falling `depth` metres from
 * the rim over `fall` metres of ground, which is a gradient of one in twenty-five and
 * is nothing anybody would call a bank.
 *
 * **It is an ellipse and not a circle, and that is the country's doing.** Nethereum
 * is seven hundred and fifty metres wide and three hundred and fifty tall, with the
 * Isa on its northern border and the Lizeem on its eastern one, and a round dish six
 * hundred metres across would have its rim in both rivers. Both are built, and a
 * landform that reaches a built river re-cuts that river's profile and re-seeds every
 * tree on both of its banks. So the dish is long east to west, where there is room,
 * and short north to south, where there is not.
 *
 * `clear` is the second half of the same promise and is measured, not chosen: the
 * hollow is nothing at all within that many metres of the Isa or the Lizeem, so
 * neither river's ground moves by a picometre. It is also the honest shape — a basin
 * with no efficient route out has a divide between it and the next drainage, and the
 * divide is exactly the ground that does not fall into the dish.
 */
export const NETHEREUM_HOLLOW = Object.freeze({
  x: -2545, z: 372, rx: 300, rz: 132, floor: .34, depth: 7.4, fall: 200, clear: 120,
});

/**
 * Nethereum's own water, and every metre of it is either the atlas's or the ground's.
 *
 * **The outlet** is the one watercourse the atlas draws *inside* Nethereum: a single
 * small hex edge between the two southern hexes, from (-2350, 520) down to the Neth's
 * head at (-2350, 577). Fifty-seven metres of authored river is not a river, so the
 * derived part carries it up onto the hollow's floor, where the country's water
 * actually is — "the Neth itself exits through a narrow channel to the southeast,
 * where it drops off the plateau edge", which is the lore's own sentence about the
 * basin's drainage and is now the whole of it.
 *
 * **Three hill-streams**, one to each of the rims that has ground above the dish —
 * the north-west shoulder, the north-east shoulder and the south-west margin against
 * the Nether Desert. The atlas draws none of them, so they are derived the way
 * Meneth's becks and Isareos's were, from the ground: water on a slope runs down it.
 * Each `taper`s out on the hollow floor rather than ending in a bank, because that is
 * what a stream reaching flat ground does, and the wet threads of rush and sedge the
 * brief puts on the floor are where they run out.
 *
 * **The outlet is barely cut, and that is measured rather than modest.** The hollow's floor
 * stands about a metre above the water in the Neth's head, so a channel cut a metre
 * and a half into it comes out *below* the river it is supposed to join — which was
 * the first version, and a stream whose mouth is half a metre under the water it
 * joins is a stream running the wrong way. Fifty-five centimetres of cut at the floor
 * and ninety at the mouth leaves it a hand's breadth above the Neth all the way down,
 * and a channel that hardly cuts is what a basin whose water has nowhere urgent to go
 * actually drains through.
 */
export const NETHEREUM_OUTLET = river('nethereum-outlet', 'The outlet', [
  point(-2470, 392), point(-2430, 412), point(-2392, 442), point(-2366, 478),
  ...atlasCourse('Nethereum'),
], { halfWidth: 1.6, halfWidthEnd: 2.4, cut: .55, cutEnd: .9, bed: .3 });

export const NETHEREUM_STREAMS = Object.freeze([
  river('nethereum-stream-north', 'The north-west thread', [
    point(-2700, 248), point(-2688, 288), point(-2670, 324), point(-2646, 352), point(-2620, 370),
  ], { halfWidth: 1.4, halfWidthEnd: 1.9, cut: .95, cutEnd: .7, bed: .3, taper: 60 }),
  river('nethereum-stream-east', 'The north-east thread', [
    point(-2352, 284), point(-2372, 316), point(-2394, 344), point(-2420, 364), point(-2448, 376),
  ], { halfWidth: 1.4, halfWidthEnd: 1.9, cut: .95, cutEnd: .7, bed: .3, taper: 60 }),
  river('nethereum-stream-south', 'The south-west thread', [
    point(-2734, 486), point(-2700, 466), point(-2664, 444), point(-2628, 424), point(-2600, 410),
  ], { halfWidth: 1.4, halfWidthEnd: 1.9, cut: .95, cutEnd: .7, bed: .3, taper: 60 }),
]);

/**
 * The braided reaches. A braid is what a river does when it has more bed than
 * water, and the Flats give both of theirs more bed than they know what to do
 * with: the last two-fifths of each one runs as three channels round bars of
 * sand rather than as one. Eer's two do the same, one region further down the
 * same river and on ground flatter still.
 *
 * Order is load-bearing in one place only: `WEST_BRAIDS[1]` is the Ela-South's,
 * which `WEST_REGION_LANDMARKS` names below, so new braids go on the end.
 */
export const WEST_BRAIDS = Object.freeze([
  Object.freeze({ id: 'vastos', course: VASTOS_RIVER, ...VASTOS_BRAID, lift: .18 }),
  Object.freeze({ id: 'ela-south', course: ELA_SOUTH_REACH, from: .42, to: .94, offset: 21, half: 2.6, cut: .9, lift: .16 }),
  Object.freeze({ id: 'nesdor-beck', course: NESDOR_BECK, from: .46, to: .92, offset: 16, half: 1.9, cut: .75, lift: .14 }),
  Object.freeze({ id: 'eer-north', course: EER_CHANNELS[0], from: .58, to: .96, offset: 15, half: 1.8, cut: .7, lift: .13 }),
  Object.freeze({ id: 'eer-south', course: EER_CHANNELS[1], from: .60, to: .95, offset: 13, half: 1.6, cut: .65, lift: .12 }),
]);

// ---------------------------------------------------------------------------
// Every piece of western water, and the questions the rest of the game asks of it
// ---------------------------------------------------------------------------
/**
 * Order matters in one way: a course that takes its level from another (`headOf`)
 * must come after the course it takes it from, because `west-ground.js` builds the
 * profiles down this list and reads the earlier one's last sample. The Lizeem's
 * reach is therefore after the Lizeem.
 */
export const WEST_RIVERS = Object.freeze([VASTOS_RIVER, VASTOS_BECK, ...MENETH_BECKS, LIZEEM, CARICA,
  ELA_SOUTH_REACH, NESDOR_BECK, LIZEEM_REACH, ...EER_CHANNELS, ISAREOS_RIVER, ...ISAREOS_BECKS,
  NETH_HEAD, NETH, NETHEREUM_OUTLET, ...NETHEREUM_STREAMS]);
/** Standing water: pans, basins and the warm pool, as circles with their own depth. */
export const WEST_POOLS = Object.freeze([
  ...VASTOS_PANS, ...VASTOS_BASINS,
  Object.freeze({ id: 'sulfur-pool', ...VASTOS_SINTER.pool, depth: VASTOS_SINTER.pool.depth }),
]);

/** The regions this module shapes, in the order they were built. */
export const WEST_REGION_NAMES = Object.freeze(['Vastos', 'Meneth', 'Caricas', 'Nesdor', 'Eer', 'Isareos', 'Nethereum']);

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
    if (p && hexOwnerAt(p.x, p.z) === region) return point(p.x, p.z);
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
  Object.freeze({ id: 'eer-loam', name: 'The Black Loam', x: -1250, z: 1000,
    description: 'The heavy ground of the inland half: alluvium the great river has been laying down here for longer than anybody has been counting, black to the depth of a spade and holding water the whole year. The grass on it stands to the knee and is the greenest thing in this quarter of the continent. It is also why everybody who has ever wanted this country has wanted it.' }),
  Object.freeze({ id: 'eer-braids', name: 'The Braided Channels', ...braidMiddle(EER_CHANNELS[0], WEST_BRAIDS[3]),
    description: 'Where the last of the gradient goes the channel stops keeping to itself: three shallow threads side by side round low bars of sand, herons standing in all of them, and the sea near enough that the water in the bed rises and falls without any rain having fallen.' }),
  Object.freeze({ id: 'eer-bays', name: 'The Low Bays', x: -930, z: 1270,
    description: 'The coast of Eer, which the lore of the Iberos calls "a series of low headlands and small sheltered bays, none large enough to be major harbors". No cliff and no beach worth the name: the grass goes tawny, thins, gives out, and the water is there. The surf reaches a long way in at the head of each bay.' }),
  Object.freeze({ id: 'eer-olives', name: 'The Standing Olives', x: -1080, z: 1170,
    description: 'Wild olive and holm oak on the open grass, singly and in twos, never near enough to touch. Nobody planted them and nobody has cut them; on a plain this flat one tree standing alone is what tells a traveler from a long way off that the weather has changed under him.' }),
  Object.freeze({ id: 'isareos-shoulders', name: 'The Isareos Shoulders', x: -2520, z: -60,
    description: 'The high ground between the valley heads: the same modest hundred-foot rises over and over, grass to the top of every one of them and no tree on any. Nothing here needs route-finding and everything here is a climb, which between the lake country and the branch country is the whole use of the place.' }),
  Object.freeze({ id: 'isareos-hollows', name: 'The Thorn Hollows', x: -2610, z: 20,
    description: 'Hawthorn and blackthorn down in the folds and along the lee of every shoulder, in threes and fours and nothing tall enough to stand under. On open hill country the wind decides where a woody thing may live, and it has decided here.' }),
  Object.freeze({ id: 'isareos-gallery', name: 'The Isa Gallery', ...midpointIn(ISAREOS_RIVER, 'Isareos'),
    description: 'Alder, willow and hazel two trees deep along the Isa and not one pace further. The atlas gives this country no forest hex and the lore gives it none either: this ribbon is the whole of the wood in Isareos, and the valley communities cut it and let it grow again.' }),
  Object.freeze({ id: 'isareos-becks', name: 'The Valley Becks', ...midpointIn(ISAREOS_BECKS[1], 'Isareos'),
    description: 'A beck on the floor of every valley, running south off the shoulders to the Isa, which takes all three of them. You step over any of them without thinking about it; the lore says the country has no defining river and means it.' }),
  Object.freeze({ id: 'isareos-west-rim', name: 'The Western Rim', x: -2800, z: 30,
    description: 'Where the hills give out against the Ibenwood: the grass goes thin, short and grey, the shoulders flatten, and the wind comes off the forest with nothing to break it. The country stops being hills here and nobody has ever drawn the line.' }),
  Object.freeze({ id: 'nethereum-hollow', name: 'The Hollow', x: -2600, z: 300,
    description: 'The northern shoulder of the dish, where the ground stops being ordinary and starts going down. Six hundred metres of it, eight metres deep, and the fall spread over two hundred paces, so there is no bank anywhere and no moment at which you have arrived: the grass simply gets greener under you and the horizon gets further away.' }),
  Object.freeze({ id: 'nethereum-basin', name: 'The Deep Basin', x: -2545, z: 372,
    description: 'The bottom of it, which the Nethrani call the *nethoss* and use for any situation that cannot get worse. The richest pasture in the inner branch country, knee-deep and soft, standing in its own damp long after the spring sheet has gone off it — and under water again every year without fail, which is why nothing is built on it and nobody is here but the cattle.' }),
  Object.freeze({ id: 'nethereum-threads', name: 'The Wet Threads', x: -2620, z: 370,
    description: 'Where the hill-streams give up being streams: the channel spreads, the water goes into the ground, and what runs on across the meadow is a line of rush and sedge a few paces wide. Not a marsh — a wet line in a field, of the kind that tells a walker where to put his feet.' }),
  Object.freeze({ id: 'neth-ford', name: 'The Neth Ford', ...midpointIn(NETH, 'Nethereum', .26),
    description: 'Gravel, shin-deep, a hundred paces of it below where the river comes off the desert edge. It is the only dry-shod way out of this country to the south, and it is the only place on the Neth that is: everything below runs deep and navigable to the Lizeem, and there is no bridge anywhere on it.' }),
  Object.freeze({ id: 'neth-lower', name: 'The Lower Neth', ...midpointIn(NETH, 'Nethereum', .82),
    description: 'The short, fast lower section that gives the Neth its split character: gentle and spreading in the middle country, quick and deep-banked here, running east to the Lizeem between banks nobody has bridged. The weirs the lore hangs its fishery on are works, and works are people; the river is the river.' }),
  Object.freeze({ id: 'nethereum-dry-corner', name: 'The Dry Corner', x: -2880, z: 206,
    description: 'The one corner of the country the basin does not drain: the north-western hex against the Nether Desert, two metres lower than the rim and outside its catchment altogether. The grass goes short, thin and grey, and the wind off the desert margin comes across it with nothing at all to break it.' }),
  Object.freeze({ id: 'lizeem-reach', name: 'The Lower Lizeem', ...midpointIn(LIZEEM_REACH, 'Eer'),
    description: 'The last reach of the great river, wide and slow and going grey with what it is carrying. Gala is on the far bank and there is no way to it: not here, not anywhere along this side. Below the last bend the water spreads into the estuary and stops being a river.' }),
]);

export { point as westPoint, resample as westResample, soften as westSoften, river as westRiver, atlasCourse };
