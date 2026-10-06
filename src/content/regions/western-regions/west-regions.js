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
 * Pure: no three, no DOM, and no heights. `src/content/regions/western-regions/west-ground.js` turns what is
 * described here into the ground the traveler walks on, and
 * `src/content/regions/western-regions/west-regions-scenery.js` draws it; both read the same numbers, as do the
 * tests. The split is the one `amod-world.js` and `amod-terraces.js` use: the
 * shapes live apart from the height field that needs them, so the height field
 * can import them without a cycle.
 *
 * Everything here is in world metres. These four regions never existed in the
 * old 56 m frame and no world-scale cluster reaches them, so nothing here goes
 * through `toWorld`.
 *
 * What comes from the atlas: the regions' hexes (through the survey) and their
 * rivers, read from the World Builder map's river edges (`src/world/terrain/region-rivers.js`)
 * and chained and softened the way the journal chart draws them. What the atlas
 * does not draw — Meneth's valley streams, Nesdor's braids, Vastos's watering
 * pans and sulfur ground — is derived from the landform the lore describes, and
 * said so at each one. See docs/four-regions-brief.md.
 */
import { PLAYABLE_SURVEY } from '../../../dev/tools/region-survey.js';
import { RIVER_EDGES } from '../../../world/terrain/region-rivers.js';
import { riverCourses } from '../../../world/terrain/region-layout.js';
import { hexOwnerAt, REGION_CELLS, METRES_PER_HEX, landDistance } from '../../../world/terrain/region-world.js';
import { ELAGOS_REACHES } from '../ambron/elagos-world.js';
import { LOTHARN_WATER_LINES, LOTHARN_BOX } from '../east-lotharn/east-lotharn-world.js';
import { WEST_LOTHARN_WATER_LINES, WEST_LOTHARN_BOX } from '../west-lotharn/west-lotharn-world.js';

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
const ATLAS_CHAINS = Object.freeze(riverCourses(PLAYABLE_SURVEY, RIVER_EDGES, undefined, { soften: 0 })
  .map(course => Object.freeze({ points: Object.freeze(course.points.map(p => point(p.x, p.z))), edges: course.edges })));
const ATLAS_COURSES = (() => {
  const courses = new Map();
  for (const course of ATLAS_CHAINS) {
    const key = [...new Set(course.edges.flatMap(edge => edge.regions))].sort().join(',');
    courses.set(key, course);
  }
  return courses;
})();
/**
 * A chain named by **where it is** rather than by whose border it is on, oriented from the first
 * point given to the second. The Mithala needs it and nothing before the Mithala did: on a braided
 * plain several chains share one pair of region names — three of the west arm's run between North
 * Celder and West Mithala, three of the north braid's have North Mithala on both banks — so the
 * region key that answers for every other river in the west answers for a set here. Ends match to
 * the metre, which is a tenth of the shortest chain on the map.
 */
function chainBetween(ax, az, bx, bz) {
  const near = (p, x, z) => Math.abs(p.x - x) < 1 && Math.abs(p.z - z) < 1;
  for (const chain of ATLAS_CHAINS) {
    const first = chain.points[0], last = chain.points.at(-1);
    if (near(first, ax, az) && near(last, bx, bz)) return [...chain.points];
    if (near(last, ax, az) && near(first, bx, bz)) return [...chain.points].reverse();
  }
  throw new Error(`The atlas draws no river chain from (${ax}, ${az}) to (${bx}, ${bz}). Is src/world/terrain/region-rivers.js stale?`);
}

function atlasChain(key) {
  const chain = ATLAS_COURSES.get(key);
  if (!chain) throw new Error(`The atlas draws no river between ${key}. Is src/world/terrain/region-rivers.js stale?`);
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
 *
 * `blend` has `west-ground.js` cut the course's channel to its level between its
 * two nearest samples rather than to the nearer one's (`courseBetween`). A course
 * that falls a centimetre or two a sample cannot tell the difference; one that
 * falls half a metre a sample steps its banks by about that much wherever one
 * sample hands over to the next. Only the Treloss's mouth sets it.
 */
function river(id, name, course, { halfWidth, cut, bed = .55, halfWidthEnd, cutEnd, fordUntil = 1, taper = 0, head = null, headOf = null, blend = false }) {
  const points = Object.freeze(soften(course).map(p => point(p.x, p.z)));
  const samples = Object.freeze(resample(points, 5).map(sample => Object.freeze(sample)));
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of points) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); }
  return Object.freeze({ id, name, points, samples, halfWidth, cut, bed, taper, fordUntil, head, headOf, blend,
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
  // The first valley's beck used to run on to x = -2070, which was open country at 11.5 m when
  // these becks were laid. Registering the West Lotharn Mountains put a mountain front across the
  // west end of this one valley, and **a beck cannot run into a mountain**. Measured along this
  // trough on the ground the atlas now makes, the floor falls from 28.6 m at the beck's head to
  // 25.1 m at x = -1840 and then climbs - 30.9, 38.8, 48.9 - so the beck now ends where the ground
  // stops falling, which is the same rule that set every other foot in this file
  // ("a stream has to go downhill; where the lore and the ground disagree, the ground wins",
  // docs/four-regions-brief.md). It spreads and sinks on its own valley floor instead of reaching
  // the country beyond, and the other three valleys are untouched (docs/west-lotharn-report.md).
  Object.freeze({ index: 0, headX: -1760, footX: -1848, taper: 38 }),
  Object.freeze({ index: 1, headX: -1720, footX: -2070 }),
  Object.freeze({ index: 2, headX: -1640, footX: -2070 }),
  Object.freeze({ index: 3, headX: -1690, footX: -2060 }),
]);

export const MENETH_BECKS = Object.freeze(MENETH_VALLEYS.map(valley => {
  const line = [];
  for (let x = valley.headX; x >= valley.footX; x -= 30) line.push(point(x, menethTroughZ(valley.index, x)));
  line.push(point(valley.footX, menethTroughZ(valley.index, valley.footX)));
  return river(`meneth-beck-${valley.index}`, `The ${['first', 'second', 'third', 'fourth'][valley.index]} valley beck`,
    line, { halfWidth: 1.6, cut: 1, bed: .3, taper: valley.taper ?? 55 });
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
 * drainage into Nesdor and then stops: the Ela-south (src/content/regions/ambron/elagos-world.js) ends
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

// ---------------------------------------------------------------------------
// Gala: the Oveth's last reach, the Caelin, the Treloss, and the plain's own water
// ---------------------------------------------------------------------------
/**
 * Gala's water, and every metre of it is the atlas's or the ground's (docs/gala-brief.md).
 *
 * The atlas draws four courses on Gala's borders and none inside it. The Lizeem along the
 * whole Nesdor and Eer side is already built (`LIZEEM`, `LIZEEM_REACH`) and is not touched
 * here. The other three are built here, each only where it has Gala on one bank:
 *
 *  - **the Caelin**, the two `medium` edges between Gala and the Oves Desert. The
 *    atlas carries it on west, `small`, between the Oves Desert and Telemonia; neither of those
 *    is built, so neither is that. It runs north along Gala's north-western corner to the Oveth.
 *  - **the Oveth**, its last reach: three `medium` edges between Gala and Ovesos, from the corner
 *    where the Caelin and the Oveth's own upper course (Ovesos's, unbuilt) come together,
 *    east to the Lizeem.
 *  - **the Treloss**, `small`, down the whole western side to the sea, its last
 *    edge between Gala and Legemum.
 *
 * **The two border streams were named on 2026-10-01 and the names are the Mittoli lexicon's own
 * words**, in the way job 1 of the southwest named the Vaellir: `mittoli.roots.border` is *trelith*
 * and `mittoli.roots.flow` is *caelin* (src/gameplay/skills/languages.js, from the `mittoli` profile in
 * `world-builder/azhoran_language_profiles.py` - `lexical_roots.border` is `["trel", "dor"]`,
 * `lexical_roots.river` is `["cael", "nil"]`, and `-oss`, `-ith` and `-in` are all in the profile's
 * own suffix list). *Treloss* is **trel-** with the **-oss** the tongue puts on a watercourse
 * (*caeloss* is "river"), and it is one of the eight names the profile's own `candidate_pool` emits.
 * *Caelin* is taken whole. Why these two and not the distributary is at `GALA_CHANNEL`.
 *
 * And one course that is the ground's, not the atlas's, which is what the lore's "network of
 * small rivers" and its "Lizeem's distributaries" come to on a map that draws no river inside
 * the country: see `GALA_CHANNEL`.
 */
const galaTail = (key, count) => atlasCourse(key).slice(-count);
/**
 * A course carried to the coast stops where the beach starts. The water level of a western
 * course is worked out from the lie of the land (`westNaturalGround`), which knows nothing of
 * the shore, so a course run on to the sea would draw its water in the air over the sand: the
 * coast field lowers the ground to the sea over the last forty metres and the level does not
 * follow it. Eer's two channels stop short for the same reason (tests/eer-world.test.js: within
 * forty-five metres of the water). So each is cut off where it comes within `reach` of the sea,
 * by interpolation along the segment that crosses that line, and the beach carries it the rest
 * of the way.
 */
function shoreward(points, reach = 42) {
  const out = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], da = landDistance(a.x, a.z), db = landDistance(b.x, b.z);
    if (db >= reach) { out.push(b); continue; }
    const t = clamp((da - reach) / (da - db || 1), 0, 1);
    out.push(point(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t));
    break;
  }
  return out;
}

/**
 * A tributary stops at its parent's bank, not in the middle of it. The atlas ends the Oveth's line
 * on the Lizeem's centre, where three hex corners meet; the course built here stops where its water
 * would begin to lie on the Lizeem's own bank, `reach` metres from the great river's centre line,
 * and the last few paces between are the drop the lore gives it — "drops through a rocky lower
 * section, and joins the Lizeem approaches" — cut by both channels and wet with neither.
 *
 * It is measured, not guessed, and it is there for a second reason as well: the Lizeem's bank reeds
 * (`west-regions-scenery.js`) are sown from one seeded stream that every western country after
 * Caricas draws from in turn, and a single reed on that bank falling into the Oveth's water instead
 * of beside it re-rolled every tree, tuft and thorn in Nesdor, Eer, Isareos and Nethereum. Twenty-
 * five metres keeps the Oveth's water, at its widest, clear of the whole bank the reeds are sown on.
 */
function shortOf(points, parent, reach) {
  const out = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const da = courseDistance(parent, a.x, a.z), db = courseDistance(parent, b.x, b.z);
    if (db >= reach) { out.push(b); continue; }
    const t = clamp((da - reach) / (da - db || 1), 0, 1);
    out.push(point(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t));
    break;
  }
  return out;
}

/**
 * **The Caelin**, its lower reach, which Gala built as "the desert border stream" and which is the
 * same watercourse as the Oves Desert's `OVES_BORDER_STREAM` - one chain on the atlas
 * (`Gala,Oves Desert,Telemonia`), handed over at (-1850, 1039) and carried on north to the Oveth.
 * **It was two names for one river until 2026-10-01 and is now one**, which is the arrangement the
 * Oveth's two reaches have had since Gala was built: `OVETH_UPPER` and `OVETH_REACH` are both "The
 * Oveth" and this is both "The Caelin".
 *
 * **The name is Mittoli for "the flow"** (`mittoli.roots.flow` = *caelin*, src/gameplay/skills/languages.js; the
 * profile's own `cael` river root with its own `-in` suffix), taken whole as a name the way job 1 took
 * *vaellir* for the Vaellir and job 2 took *malhat* for the Malhat. It earns it: the Oves Desert has
 * **no permanent water inside it at all** and this is the one thing on its edge that runs, which is why
 * the Ovesos Water Council's dispute with Telemonia - the one `oves_desert.md` spends a paragraph on -
 * is a dispute about this line. The Council speaks inner-branch Mittoli (`ovesos.md`) and the desert has
 * no speech of its own and takes Ovesos's (docs/oves-report.md), so the tongue that has a use for this
 * water is the tongue that names it.
 *
 * Shallow over gravel the whole of its Gala reach and a step
 * across, which is what a stream off the rain-shadow margin is in any month but the wet ones.
 * It is also half of how the dry country reaches Gala on foot: the Oves Desert shares two edges
 * with Gala and both of them are this stream, so a stream built deep would have walled the
 * desert out of the country beside it. `medium` on the atlas and narrow here, because the
 * atlas's medium begins on these two edges and nowhere upstream of them.
 */
export const GALA_DESERT_STREAM = river('gala-desert-stream', 'The Caelin',
  galaTail('Gala,Oves Desert,Telemonia', 3), { halfWidth: 2.4, halfWidthEnd: 3, cut: 1.1, cutEnd: 1.3, bed: .45 });

/**
 * **The Oveth**, its last reach, and the crossing the six-regions brief left to whoever built
 * Gala: "Ovesos and the Oves Desert both reach Gala only across it, and the lore puts the
 * wadeable part at the lower end rather than the upper — 'below the Sorten it narrows, drops
 * through a rocky lower section' … The course will take a ford window rather than a ford
 * length." This reach *is* the lower end, so the window is its head: shallow over rock for
 * the first two-fifths below the corner where the three countries meet, and then deep, because
 * the last of it "joins the Lizeem approaches" and a river backed up by the great river is not
 * a river anybody wades.
 *
 * It drops as it goes: the cut deepens from a metre and a third to three and a half, which is
 * the "rocky lower section" and is also what brings its water down toward the Lizeem's, three
 * metres cut into its own bed where they meet. It takes its first level from the Caelin
 * (`headOf`), because a river cannot stand above the water that runs into it.
 */
export const OVETH_REACH = river('oveth-reach', 'The Oveth', shortOf(atlasCourse('Gala,Ovesos'), LIZEEM, 25),
  { halfWidth: 3, halfWidthEnd: 5.4, cut: 1.3, cutEnd: 3.5, bed: .85, fordUntil: .4, headOf: 'gala-desert-stream' });

/**
 * **The Treloss**: small on the atlas, a step across here, running south
 * down Gala's whole western side and out to the sea at its south-western corner.
 * The course stops where the beach would start (`shoreward`) and its mouth, below, carries the water on
 * down the Legemum line to the sea (`GALA_TELEMONIA_MOUTH`). It used to taper out there instead (`taper: 30`),
 * which a stream reaching sand does and a stream reaching the foot of a hill does not.
 *
 * **Mittoli for "the border river", and both halves of it are the profile's**: the `mittoli` profile's
 * `lexical_roots.border` is `["trel", "dor"]` and its suffix list carries `-oss`, which is the ending
 * this tongue puts on a watercourse - `mittoli.roots.river` is *caeloss* and `roots.border` is *trelith*
 * (src/gameplay/skills/languages.js). *Treloss* is the border root with the river ending, and the form is not even a
 * coinage: it is one of the eight names in the profile's own `candidate_pool`. What it names is what this
 * stream is and all it is - Gala's whole western side is the Telemonian border and this is the line of it,
 * for every edge the atlas draws.
 *
 * Two things were checked and rejected. **Kellith**, Telemonia's own tongue, whose river root and border
 * root are the *same* root (`lexical_roots.river` and `.border` both carry `ver`), is the profile a name
 * for this border could have come from - but `gala.md` makes Gala Mittoli-speaking, Gala's builder said so
 * at `GALA_LANDMARKS`, and the two forms the root yields, *Verath* and *Verith*, are both taken: the Verath
 * is the Oremindi sacred system, with a lore file of its own. And *trelith* itself is a person in this
 * game (Captain Nessa Trelith, src/content/quests/batman/batman.js), which is no reason to refuse a word but is a reason to take
 * the other ending the profile offers.
 */
export const GALA_TELEMONIA_STREAM = river('gala-telemonia-stream', 'The Treloss',
  shoreward(atlasCourse('Gala,Legemum,Telemonia')), { halfWidth: 1.5, halfWidthEnd: 2.2, cut: 1, cutEnd: .75, bed: .35 });

/**
 * The rest of an atlas line past `shoreward`'s cut: from the same point, where it comes within `reach` of the
 * sea, along the atlas's own line to its last corner on the coast, and on straight the way it was going until
 * it is `out` metres past the line `landDistance` draws (negative is the sea's side), which is where the
 * coast field brings the ground down to the water. The last corner is moved out along its own edge rather
 * than given a stub of its own, so the line keeps its corners and no more: `soften` crowds samples into
 * every short piece, and a course's level falls by the sample, not by the metre.
 */
function seaward(points, reach = 42, out = -2.5) {
  const first = points.findIndex(p => landDistance(p.x, p.z) < reach);
  if (first < 1) throw new Error('An atlas line that starts within reach of the sea has no reach above it.');
  const a = points[first - 1], b = points[first], da = landDistance(a.x, a.z), db = landDistance(b.x, b.z);
  const t = clamp((da - reach) / (da - db || 1), 0, 1);
  const line = [point(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t), ...points.slice(first)];
  const end = line.at(-1), before = line.at(-2), length = Math.hypot(end.x - before.x, end.z - before.z);
  const ux = (end.x - before.x) / length, uz = (end.z - before.z) / length;
  let step = 0;
  while (landDistance(end.x + ux * step, end.z + uz * step) > out && step < 30) step += .25;
  line[line.length - 1] = point(end.x + ux * step, end.z + uz * step);
  return line;
}

/**
 * **The Treloss's mouth**: its last forty metres, down the Gala | Legemum edge from where `shoreward` stops the
 * stream to the water's edge. Built 2026-10-03, because the stream had stopped short of the sea in a wall.
 *
 * The stream was built with Gala, when Legemum was outland, and it stopped forty-two metres short of the sea
 * and gave its channel up over its last thirty (`taper`), because the coast field brings the ground down to
 * the beach over the last forty metres and a western course's level is worked from ground that knows nothing
 * of the shore. That holds where the land at the cut lies at the water's level. Here it does not: the line
 * comes down past the foot of Telemonia's rim and the first of Legemum's hills, the blended ground at the cut
 * stands 7.1 m against the stream's 4.7 and rises to 8.1 a few paces on before it falls to the beach, and the
 * stream ran out into a bank two and a half metres high, forty-two metres short of the sea.
 *
 * So the stream keeps its channel to its last sample now (no taper), and this reach takes the water on: its
 * first level is the stream's last (`headOf`), and it falls 4.6 m over 44 m to the sea - a steep little run
 * through a gully, gentle where it leaves the stream and about one in nine below - cut by `west-ground.js`'s
 * channel into Legemum's ground on its side of the line and Gala's on its own, exactly as the stream above it
 * is cut. Legemum's own shaping lets go of this border over its last 48 m (`legemumGround`), so on Legemum's
 * side the cut stands as it is cut. Its `cut` is large and grows fast, and that is the coast again: the lie of
 * the land a western profile is worked from (`baseBeforeWater`) has no beach in it, and over these metres
 * stands 7 to 12 m where the real ground falls from 8 m to the sea's level. The two numbers are what bring the
 * water down to the sea under that ground; they are measured, not derived, and tests/legemum-world.test.js
 * holds the result on the built world: no step at the join, falling every sample, at the sea's level at its
 * end, the bed under the water the whole way, no bank over a metre beside it, no cliff off either bank, both
 * banks walked to the beach. Shallow, `bed` the stream's own, and waded. What it would have drowned of Gala's
 * scatter and Legemum's cover is moved off it in their own files (`offTheMouth`, `offTreloss`).
 *
 * **Its banks fall with the water** (`blend`, 2026-10-03). The water falls about half a metre a sample here, and
 * a channel cut to its nearest sample's level stepped the walked ground of both banks by that much at every
 * handover from one sample to the next - up to 0.55 m in half a metre, six to twelve metres out, seen from above
 * as darker diamonds on the gully's fine ground. Cut to the level between its two nearest samples, which is the
 * line the water was always drawn on, no half metre of either bank there falls more than 0.18 m past the water
 * beside it, and the most of that is Legemum's hillside coming down into the gully twelve metres out.
 */
export const GALA_TELEMONIA_MOUTH = river('gala-telemonia-mouth', 'The Treloss', seaward(atlasCourse('Gala,Legemum,Telemonia')),
  { halfWidth: 2.2, halfWidthEnd: 2.8, cut: 3.2, cutEnd: 10.05, bed: .35, headOf: 'gala-telemonia-stream', blend: true });

/**
 * **The Treloss's lower gully is drawn finer** (2026-10-03). The ground walked here was right, but the ground
 * drawn was the world's 7.1 m grid (src/world.js), and a water four and a half metres wide in a gully cannot be
 * drawn on it: seen from above, pale triangles of that grid stood up through the water and cut the stream into
 * pieces - over the mouth and the stream's last twenty metres, at two points in five, by up to half a metre.
 * Further up, Telemonia draws its own finer ground along its border, and the stream is fine.
 *
 * So the gully is drawn the way Telemonia, Amod, the Suval highlands, the Lotharns and Feradom are: its own
 * ground a metre and a half apart (src/content/regions/gala/gala-scenery.js), over the world's grid sunk out of sight beneath it
 * (`trelossTerrainSink`, subtracted in src/world.js). `TRELOSS_GULLY` is the line it is drawn along: the mouth,
 * and the stream from `head` metres above the mouth's head, which is well inside the ground Telemonia draws.
 *
 * - **The sink** takes the grid down `depth` metres at every corner within `full` of the line, and lets go by
 *   `none`. A triangle of that grid over any of the water has all three corners within the water's half-width
 *   (2.8 m at most) and a cell's diagonal (7.2 x sqrt 2) of it, under thirteen metres: every such triangle goes
 *   right down.
 * - **The patch** is drawn over every cell of the grid the sink tilts. A corner sunk anywhere short of `none`
 *   tilts its cells out to a diagonal further, so the patch reaches `TRELOSS_PATCH_REACH` past the line (and the
 *   half-diagonal of one of its own cells more, since a cell is drawn by its centre); out there the grid is as it
 *   always was and the two meet at the same height. Drawn only as far as the sink, the tilted cells would
 *   be a trench round it: Telemonia's stage 1 review render found exactly that along its own border.
 */
export const TRELOSS_SINK = Object.freeze({ head: 34, depth: 12, full: 13, none: 16 });
export const TRELOSS_PATCH_REACH = TRELOSS_SINK.none + 7.2 * Math.SQRT2 + 1.1;
export const TRELOSS_GULLY = (() => {
  const stream = GALA_TELEMONIA_STREAM.points, mouth = GALA_TELEMONIA_MOUTH.points;
  let first = stream.length - 1, run = 0;
  while (first > 0 && run < TRELOSS_SINK.head) { run += Math.hypot(stream[first].x - stream[first - 1].x, stream[first].z - stream[first - 1].z); first--; }
  const points = Object.freeze([...stream.slice(first), ...mouth.slice(1)].map(p => point(p.x, p.z)));
  const bounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const p of points) {
    bounds.minX = Math.min(bounds.minX, p.x); bounds.maxX = Math.max(bounds.maxX, p.x);
    bounds.minZ = Math.min(bounds.minZ, p.z); bounds.maxZ = Math.max(bounds.maxZ, p.z);
  }
  return Object.freeze({ points, bounds: Object.freeze(bounds) });
})();
/** Distance from a point to the gully's line; cheap to reject far away, and never less than the truth. */
export function trelossGullyDistance(x, z, limit = Infinity) {
  const b = TRELOSS_GULLY.bounds, outside = Math.max(b.minX - x, x - b.maxX, b.minZ - z, z - b.maxZ, 0);
  if (outside > limit) return outside;
  let best = Infinity;
  const points = TRELOSS_GULLY.points;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], c = points[i], dx = c.x - a.x, dz = c.z - a.z;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
    best = Math.min(best, Math.hypot(x - a.x - dx * t, z - a.z - dz * t));
  }
  return best;
}
/** How far the world's own ground grid is sunk under the Treloss's lower gully, which draws its own (above). */
export function trelossTerrainSink(x, z) {
  const { depth, full, none } = TRELOSS_SINK, d = trelossGullyDistance(x, z, none);
  if (d >= none) return 0;
  const t = clamp((d - full) / (none - full), 0, 1);
  return depth * (1 - t * t * (3 - 2 * t));
}
/**
 * Whether the ground drawn at a point is the gully's own finer ground (or Telemonia's, where the two meet), over
 * the world's grid sunk under it. A neighbour's scenery stands there on `heightAt`, which this ground is drawn
 * from, and not on the grid's triangles, which lie up to `TRELOSS_SINK.depth` metres under it.
 */
export const trelossDrawsGround = (x, z) => trelossGullyDistance(x, z, TRELOSS_PATCH_REACH) < TRELOSS_PATCH_REACH;

/**
 * **The distributary.** The lore of Gala says the south is "well-watered by the Lizeem's
 * distributaries" and the brief asks for "braided distributary channels through reed and
 * tamarisk reaching the sea". The atlas draws no river inside the country, and it puts the
 * Lizeem's mouth at the far south-eastern tip, where Gala, Eer and Northern Ascarth meet — the one
 * corner of Gala nothing may be shaped in, because it is inside the hundred metres the seam with
 * Northern Ascarth keeps clear. So the water is built where the atlas leaves room for it.
 *
 * It rises on the plain beside the Lizeem's western bank and runs south-west across the country
 * to Gala's one short piece of shore, braiding over its last third where the gradient dies. That
 * is Eer's own reading of the same lore, one bank over: a true distributary leaves its parent at
 * the parent's level, and the Lizeem is cut three metres into its bed here, so nothing climbs out
 * of it. What a plain beside a river like that carries is its own drainage, running the same way
 * for the same reason — and at its foot it is the widest slow water in the country, which is
 * where the brief's raft of geese is.
 *
 * Its line is drawn to the seam: every point of it, with its braid and the valley the braid is
 * cut in, is more than a hundred metres inside Gala's own hexes from the Northern Ascarth border
 * (tests/gala-world.test.js measures it). That is why it bends west as it nears the sea: Gala's
 * south narrows to a single hex between Telemonia and Northern Ascarth, and the channel goes down
 * the western side of it.
 *
 * **It stays "the distributary", and that is an answer rather than a gap.** The two border streams were
 * named from the Mittoli lexicon on 2026-10-01 and this one was looked at with them and left alone, on
 * `gala.md`'s own sentence: "A layer of pre-Mittoli terms persists in the names of geographical features
 * - **the small rivers**, the coastal inlets, the specific soils of the agricultural plain - in the way
 * that the names of things that were there before the current speakers arrived tend to persist… The name
 * *Gala* itself is from this older layer. What it meant to whoever named the place before the current
 * population arrived is not established." So the lore does not say this water has no name; it says it has
 * one, in a language that is in no profile and that nobody in the game can gloss. A border is named by
 * whoever argues over it and both of Gala's are; a stream that rises inside the country and runs to its
 * own shore is named by the country, and that name is the old layer's. This is the refusal job 1 made for
 * the Ganesh, on the same kind of sentence, and the lore's own words for it are already used here: "the
 * Lizeem's distributaries, as the Galans call it".
 */
export const GALA_CHANNEL = river('gala-channel', 'The distributary', shoreward([
  point(-1535, 1078), point(-1572, 1116), point(-1610, 1153), point(-1650, 1191), point(-1691, 1231),
  point(-1728, 1273), point(-1757, 1318), point(-1774, 1362), point(-1783, 1398), point(-1788, 1430),
]), { halfWidth: 2.2, halfWidthEnd: 4.6, cut: 1.3, cutEnd: .8, bed: .5 });

export const GALA_RIVERS = Object.freeze([GALA_DESERT_STREAM, OVETH_REACH, GALA_TELEMONIA_STREAM, GALA_CHANNEL, GALA_TELEMONIA_MOUTH]);

// ---------------------------------------------------------------------------
// The Mithala plain: the channels, which are the country
// ---------------------------------------------------------------------------
/**
 * **The river is the whole of what the Mithala is** — "The Lizeem makes the Mithala. This is not a
 * metaphor: the soil of the plain is river deposit" — and the atlas draws it, sixty-one new edges
 * across the four countries, in thirteen chains that make one branching system with a single outlet.
 * It is by a distance the largest piece of authored water in the game after the Lizeem itself.
 *
 * This section stands here, out of build order, because `WEST_BRAIDS` immediately below names two
 * of these courses and a `const` cannot be read before it is written.
 *
 * **The shape, read off the atlas rather than decided:** two arms come in, one from the west along
 * the Celder margin and one from the north out of the wetland country, they meet at (-1700, -1414)
 * at South Mithala's north-western corner, and one channel goes on east from there to the sea at
 * (-1000, -1414), where the hexes beyond are unclaimed water. Every chain either runs to that
 * meeting or hangs off one that does. That is the lore's own account of the plain read backwards:
 * "Below Minora, where the river first forks, the branches multiply... The Lizeem's channels
 * eventually gather again as they approach the sea", and this ground is where they gather.
 *
 * **It is not called the Lizeem**, and that is deliberate. The atlas draws these edges `medium`
 * where it draws the Lizeem `large` through Caricas and Eer, and the lore is plain that the river
 * below Minora is not one river but a set of channels each of which a farmer "knows by name and
 * behavior" — so the biggest of them is what the lore itself calls it, **the main channel**, and the
 * great river's name stays on the great river. The one name taken from the lore is **the north
 * braid**, which it gives as an example of what a village says it is on ("a village describes itself
 * as being on the North Braid or the Third Olveth Arm"). Everything else is plain English, because
 * `world-builder/azhoran_language_profiles.py` has no Mithali profile and the lore says the name
 * Mithala itself "does not decompose cleanly in any Mittoli root system".
 *
 * **Sizes follow the house rule.** The main channel is medium, so it is waded over the gravel of its
 * first third and deep below, exactly as the Isa and the Carica are (`ISAREOS_RIVER`); everything
 * else the atlas draws small, and a small river on a plain is waded anywhere. So the four countries
 * are connected on foot all round the plain, and the one place a traveler is stopped is the lower
 * two-thirds of the main channel — which is the border between South and East Mithala for sixteen
 * hex edges, and is why those two are different places.
 */
const MITHALA_MEET = Object.freeze({ x: -1700, z: -1414 });
/** The main channel, from the meeting of the arms east to the sea, cut off where the beach starts. */
export const MITHALA_MAIN = river('mithala-main-channel', 'The Main Channel',
  shoreward(chainBetween(MITHALA_MEET.x, MITHALA_MEET.z, -1000, -1414)),
  { halfWidth: 5, halfWidthEnd: 11, cut: 1.9, cutEnd: 2.5, bed: .9, fordUntil: .30, headOf: 'mithala-west-arm' });
/**
 * **The west arm**, four atlas chains end to end: down the Celder margin from the plain's
 * north-western corner, south-east to the junction at (-1950, -1155) where the Celder water comes
 * in, then north-east to the meeting. The longest course on the plain.
 */
export const MITHALA_WEST_ARM = river('mithala-west-arm', 'The West Arm', [
  ...chainBetween(-2350, -1386, -2300, -1299),
  ...chainBetween(-2300, -1299, -2200, -1241).slice(1),
  ...chainBetween(-2200, -1241, -1950, -1155).slice(1),
  ...chainBetween(-1950, -1155, MITHALA_MEET.x, MITHALA_MEET.z).slice(1),
], { halfWidth: 3, halfWidthEnd: 5, cut: 1.4, cutEnd: 1.1, bed: .5 });
/**
 * **The Celder water**, off the three-country corner where South Mithala, North Celder and the West
 * Lotharn meet, north-east to the west arm's junction. It is the only water that comes onto the
 * plain from the hill country to the south-west, and it stops at the arm's bank rather than in the
 * middle of it (`shortOf`), as the Oveth stops at the Lizeem's.
 */
export const MITHALA_CELDER_WATER = river('mithala-celder-water', 'The Celder Water',
  shortOf(chainBetween(-2150, -981, -1950, -1155), MITHALA_WEST_ARM, 9),
  { halfWidth: 2.2, halfWidthEnd: 3, cut: 1.1, cutEnd: .9, bed: .4 });
/**
 * **The north braid**, the lore's own name: three chains from a head on the damp northern shelf,
 * south past the cross braid's junction and then south-east to the meeting.
 */
export const MITHALA_NORTH_BRAID = river('mithala-north-braid', 'The North Braid', [
  ...chainBetween(-2000, -1819, -1950, -1732),
  ...chainBetween(-1950, -1732, -1950, -1674).slice(1),
  ...chainBetween(-1950, -1674, MITHALA_MEET.x, MITHALA_MEET.z).slice(1),
], { halfWidth: 2.6, halfWidthEnd: 4.4, cut: 1.2, cutEnd: 1, bed: .45 });
/** The braid's second head, a hundred metres east of the first, joining it at its own bank. */
export const MITHALA_EAST_HEAD = river('mithala-east-head', 'The East Head',
  shortOf(chainBetween(-1900, -1819, -1950, -1732), MITHALA_NORTH_BRAID, 7),
  { halfWidth: 1.6, halfWidthEnd: 2.2, cut: .9, cutEnd: .8, bed: .35 });
/** **The cross braid**, running east along the North Mithala | West Mithala border into the braid. */
export const MITHALA_CROSS_BRAID = river('mithala-cross-braid', 'The Cross Braid',
  shortOf(chainBetween(-2150, -1674, -1950, -1674), MITHALA_NORTH_BRAID, 8),
  { halfWidth: 2, halfWidthEnd: 3, cut: 1, cutEnd: .9, bed: .4 });
/**
 * **The fan**: two short channels leaving the west arm on its northern side and giving out on the
 * grass within a few hundred paces. They are distributaries and not tributaries — the atlas hangs
 * them off the arm and the ground falls away from it — so each is tapered rather than run to a
 * mouth, which is what a channel that spreads and sinks does. Between them they are what West
 * Mithala has instead of braiding: "first two main arms, then distributaries from each".
 */
export const MITHALA_FAN = Object.freeze([
  river('mithala-fan-north', 'The Upper Fan', chainBetween(-2200, -1299, -2200, -1241),
    { halfWidth: 1.6, halfWidthEnd: 2.4, cut: .9, cutEnd: .7, bed: .35, taper: 26 }),
  river('mithala-fan-west', 'The Lower Fan', chainBetween(-2300, -1299, -2250, -1386),
    { halfWidth: 1.6, halfWidthEnd: 2.4, cut: .9, cutEnd: .7, bed: .35, taper: 34 }),
]);
/**
 * Every channel on the plain. **The two arms come before the main channel**, because the main
 * channel takes its first water level from the west arm's last (`headOf`) and `west-ground.js`
 * builds the profiles down this list: the arms arrive at the meeting from a thousand metres of
 * border where two thirds of the hex blend is unbuilt outland, and whatever level they get there is
 * the level the river below them has to start at, or the plain has water running uphill into its
 * own main channel. Measured: the west arm arrives at 10.40 m and the main channel now starts there
 * to the digit, with the north braid coming in a metre above both.
 */
export const MITHALA_RIVERS = Object.freeze([MITHALA_WEST_ARM, MITHALA_NORTH_BRAID, MITHALA_MAIN,
  MITHALA_CELDER_WATER, MITHALA_EAST_HEAD, MITHALA_CROSS_BRAID, ...MITHALA_FAN]);

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
  // Gala's mouths: the distributary's last third, on the only ground Gala has at the sea.
  Object.freeze({ id: 'gala-mouths', course: GALA_CHANNEL, from: .64, to: .97, offset: 10, half: 1.5, cut: .6, lift: .1 }),
  // **The Mithala's two, and they are what the plain is famous for.** "The channels themselves are
  // many and braided... first two main arms, then distributaries from each, then smaller branches."
  // The main channel braids over the whole of its middle and lower reach - the widest offset in the
  // game, because this is the flattest ground in the game and the bars between the threads are what
  // the lore's villages are built on - and the north braid over its lower half, where it comes off
  // the damp shelf onto the flat.
  Object.freeze({ id: 'mithala-main', course: MITHALA_MAIN, from: .30, to: .93, offset: 26, half: 3.2, cut: 1.05, lift: .2 }),
  Object.freeze({ id: 'mithala-north-braid', course: MITHALA_NORTH_BRAID, from: .48, to: .94, offset: 17, half: 2.1, cut: .8, lift: .15 }),
]);


// ---------------------------------------------------------------------------
// Ovesos and the Oves Desert: the Oveth's upper course and the Caelin's upper reach
// ---------------------------------------------------------------------------
/**
 * The water of the two dry countries, and there is very little of it (docs/oves-brief.md).
 *
 * The atlas draws two courses that have Ovesos or the Oves Desert on both banks, and none at all
 * inside either country. The Neth along Ovesos's north-western border and the Lizeem along its
 * north-eastern and eastern ones are already built (`NETH`, `LIZEEM`) and are not touched here; the
 * Oveth's last reach below the three-country corner is Gala's (`OVETH_REACH`) and is not touched
 * either. What is built here is the two above them:
 *
 *  - **the Oveth's upper course**, seven `Oves Desert`|`Ovesos` edges from (-2050, 751) down to the
 *    corner at (-1800, 953) where Ovesos, the Oves Desert and Gala meet;
 *  - **the Caelin**, its upper reach: the `Oves Desert`|`Telemonia` reach of the chain whose
 *    last two edges Gala built as `GALA_DESERT_STREAM`, which is the same river and now the same name.
 *
 * Everything else either country has is terrain: four cut channels with no water in any of them and
 * one reach of one of them that holds water below the gravel (`OVES_CHANNELS`, `OVES_DAMP` in
 * src/content/regions/oves/oves-world.js). **The Oves Desert has no permanent water inside it**, which is the point of it.
 */
/**
 * **The Oveth**, its upper course. The atlas is precise about its size: the two edges at its head are
 * `small` and the five below them are `medium`, so it starts as something a man steps over and is a
 * river by the time it reaches the Sorten.
 *
 * **Waded for its upper third and deep below**, which is the Carica's rule for a medium river, the
 * Neth's after it, and here the lore's own words twice over: by the Sorten the Oveth is "navigable
 * for light boats and substantial enough for irrigation", and "below the Sorten it narrows, drops
 * through a rocky lower section" — which is Gala's reach, and Gala built exactly that, waded over
 * rock for its first two-fifths. So the deep water is the middle of the river and the fords are its
 * two ends, which is the opposite of every other course in the west and is what the lore says.
 *
 * A third of this course is about 135 m, which keeps the ford on the two `small` edges and puts the
 * deep water on the `medium` ones; `tests/oves-world.test.js` holds that arithmetic. The six dry
 * Ovesos|Oves Desert edges above the river's head are how the two countries meet on foot.
 */
export const OVETH_UPPER = river('oveth-upper', 'The Oveth', atlasCourse('Oves Desert,Ovesos'),
  { halfWidth: 1.8, halfWidthEnd: 4.2, cut: 1.15, cutEnd: 1.55, bed: .8, fordUntil: .33 });

/**
 * **The Caelin**, its upper reach, which the Oves built as "the southern border stream" before the chain
 * had a name: it and `GALA_DESERT_STREAM` are two reaches of one watercourse and carry one name between
 * them, as the Oveth's two reaches do. The name is Mittoli for "the flow" and the argument for it is at
 * `GALA_DESERT_STREAM`; the short of it is that this country has no permanent water in it and this is the
 * one thing on its edge that runs.
 *
 * The atlas carries the chain Gala's `GALA_DESERT_STREAM`
 * is the last two edges of on west, `small`, along five `Oves Desert`|`Telemonia` edges; Gala left it
 * unbuilt because neither of those countries was. One of them is now.
 *
 * It is the one piece of permanent water either country has that is not the Oveth, and it is on the
 * desert's **border** and not in it — fed off the Telemon highland edge to the south, which is
 * unbuilt outland, and the reason the lore's "channel sections that retain subsurface flow" matter
 * more than they sound. Waded anywhere, and shallow: a step across over gravel, which is what a
 * stream off a rain-shadow margin is in any month but the wet ones.
 *
 * Its `cutEnd` is measured rather than chosen. It hands the last of itself to Gala's reach at
 * (-1850, 1039), and Gala's reach works its own level out from the ground; a course that ended below
 * the one it runs into would be water flowing uphill, so this one ends a few centimetres above it and
 * the test says by how much.
 */
export const OVES_BORDER_STREAM = river('oves-border-stream', 'The Caelin',
  atlasCourse('Gala,Oves Desert,Telemonia').slice(0, 6), { halfWidth: 1.2, halfWidthEnd: 2, cut: .85, cutEnd: .95, bed: .35 });

export const OVES_RIVERS = Object.freeze([OVES_BORDER_STREAM, OVETH_UPPER]);

// ---------------------------------------------------------------------------
// The East Lotharn: the border water and the three valleys' own
// ---------------------------------------------------------------------------
/**
 * The water of the old range (`src/content/regions/east-lotharn/east-lotharn-world.js` shapes the valleys it runs in). The
 * atlas draws one river, small, along the whole South Mithala border and down to the sea; the lore
 * gives every valley its own water, "each valley has its own drainage", and the three built here
 * are derived from the valleys and say so. None of them is named in the lore, so each is called
 * by the valley it drains, which is what the valley people would call it.
 *
 *  - **The border water**, the atlas's own line, runs east with the ground to the sea. Small on
 *    the atlas, and a mountain foot's river: wadeable, two and a half metres of water either side.
 *  - **The Kemrath water** rises under the col and runs west down Kemrath's floor and out of the
 *    range toward the West Lotharn, widening as it goes, as Meneth's becks leave theirs.
 *  - **The Stonegate water** falls north from the col through the gorge - "rivers run white" - to
 *    the border water, one in seven.
 *  - **The Olveth beck** drains Upper Olveth's sheep grass north to the border water.
 */
export const LOTHARN_BORDER_WATER = river('lotharn-border-water', 'The border water', LOTHARN_WATER_LINES.border,
  { halfWidth: 2.4, cut: 1.1, bed: .55 });
export const KEMRATH_WATER = river('kemrath-water', 'The Kemrath water', LOTHARN_WATER_LINES.kemrath,
  { halfWidth: 1.5, halfWidthEnd: 2.4, cut: .8, bed: .4 });
export const STONEGATE_WATER = river('stonegate-water', 'The Stonegate water', LOTHARN_WATER_LINES.stonegate,
  { halfWidth: 2.3, cut: 1, bed: .5 });
export const OLVETH_BECK = river('olveth-beck', 'The Olveth beck', LOTHARN_WATER_LINES.olveth,
  { halfWidth: 1.1, cut: .7, bed: .3 });
export const LOTHARN_WATERS = Object.freeze([LOTHARN_BORDER_WATER, KEMRATH_WATER, STONEGATE_WATER, OLVETH_BECK]);

// ---------------------------------------------------------------------------
// The West Lotharn: four derived courses, one of them somebody else's water
// ---------------------------------------------------------------------------
/**
 * **The atlas draws no water at all on the West Lotharn's forty-eight hexes**, so every one of these
 * is derived from the landform the way Meneth's four becks are, and the lore is what says there
 * should be any: "each valley has its own drainage... the rivers of the Lotharn flow in two
 * directions. The northern face drains toward the Lizeem system and the Mithala plain."
 *
 *  - **The Kemrath reach** is not this country's own water. The East Lotharn's Kemrath "drains west,
 *    out of the range toward the West Lotharn", and now that the West Lotharn is registered its floor
 *    and its water run out of the East's hexes and stop three metres inside these. A river cannot
 *    stop in the middle of a country, so the reach picks it up at exactly that point and at exactly
 *    that level (`headOf`), turns north along the foot of the east arm, and carries it down the notch
 *    to the Mithala margin. Nothing in src/content/regions/east-lotharn/east-lotharn-world.js was touched to do it - the same
 *    allowance Nesdor's Ela-South Reach makes for Elagos's water.
 *  - **The north beck** drains the massif's north face down the north valley to the same margin.
 *  - **The east beck** and **the west beck** leave the long valley's divide in opposite directions,
 *    east to the Vastos margin and west to the hills above Yunethre, which is what a valley with a
 *    divide in the middle of it does.
 *
 * All four are mountain becks: narrow, shallow, quick, and waded anywhere.
 */
export const KEMRATH_REACH = river('kemrath-reach', 'The Kemrath reach', WEST_LOTHARN_WATER_LINES.kemrathReach,
  { halfWidth: 2.2, halfWidthEnd: 2.6, cut: .9, bed: .45, headOf: 'kemrath-water', taper: 34 });
export const WEST_LOTHARN_NORTH_BECK = river('west-lotharn-north-beck', 'The north beck', WEST_LOTHARN_WATER_LINES.north,
  { halfWidth: 1.1, halfWidthEnd: 1.8, cut: .7, bed: .3, taper: 40 });
export const LONG_VALLEY_EAST_BECK = river('long-valley-east-beck', 'The east beck', WEST_LOTHARN_WATER_LINES.east,
  { halfWidth: 1.1, halfWidthEnd: 1.9, cut: .6, bed: .3, taper: 55 });
export const LONG_VALLEY_WEST_BECK = river('long-valley-west-beck', 'The west beck', WEST_LOTHARN_WATER_LINES.west,
  { halfWidth: 1.1, halfWidthEnd: 2.2, cut: .6, bed: .3, taper: 60 });
export const WEST_LOTHARN_WATERS = Object.freeze([KEMRATH_REACH, WEST_LOTHARN_NORTH_BECK, LONG_VALLEY_EAST_BECK, LONG_VALLEY_WEST_BECK]);

// ---------------------------------------------------------------------------
// The southwest: the Vaellir and the Alezhor water, and they are the only water in a desert
// ---------------------------------------------------------------------------
/**
 * **Two courses over a hundred and seven hexes, both of them on a border, and both of them
 * reaching the sea.** The atlas draws twenty-eight river edges on the four southwestern countries
 * and not one of them is inside any of them: everything this quarter has runs along its edge, which
 * is what a desert's water does - it is somebody else's rain passing through.
 *
 *  - **The Vaellir**, twenty edges down the whole of West Pyros's eastern border, growing from
 *    `small` at its head through `medium` to **`large`** at its mouth. The atlas draws `large`
 *    three times in the whole world: through Caricas and Eer, which is the Lizeem, and here. So
 *    this is the second great river in the game, and after the Lizeem the largest water in it.
 *  - **The Alezhor water**, eight `small` edges running west-south-west along Navarth's northern
 *    border and then the Ganesh Desert's north-eastern one, out of the wet `Csb` grassland of
 *    Alezhor and down to the gulf. It is an exogenous river - it rises in green country and
 *    crosses a desert without gaining anything - and it is the only running water the Ganesh
 *    Desert ever sees.
 *
 * **The names.** `world-builder/azhoran_language_profiles.py` *does* have a `pyrosi` profile - the
 * first country in the west whose people's tongue is in it - and `src/gameplay/skills/languages.js` carries it with
 * its lexicon, in which `vaellir` is simply the word for "river". So the great river of West Pyros
 * is **the Vaellir**, which is the Pyrosi for the river, the way an Avon is a river: nothing is
 * coined, the tongue's own word is used. The other is named for the country it comes out of, which
 * is what `MITHALA_CELDER_WATER` did one quarter of the continent away. The Ganesh's own name is
 * left alone entirely: `ganesh_desert.md` is emphatic that it is pre-Moreshi and that "whoever
 * named this desert named it in a way that no current language on the peninsula can explain".
 *
 * **The Vaellir is a wall below its first quarter**, which is the house rule for a big river (the
 * Lizeem is `fordUntil: 0` and the Isa and the Carica are walled below their gravel heads). Its
 * five `small` edges at the head are waded over gravel; from the first `medium` edge down there is
 * no way across it on foot, and there is nothing to cross to, because East Pyros is not built.
 */
export const VAELLIR = river('vaellir', 'The Vaellir', shoreward(atlasCourse('East Pyros,West Pyros')),
  { halfWidth: 3, halfWidthEnd: 14, cut: 1.5, cutEnd: 3.1, bed: 1.6, fordUntil: .24 });
/**
 * The Alezhor water, out of the green country on the north and away west to the gulf. Small on the
 * atlas over all eight of its edges and small here: two metres of water either side at the head and
 * three at the mouth, waded anywhere along it, which is the only reason the Ganesh Desert and
 * Navarth are connected to each other at all round the north.
 */
export const ALEZHOR_WATER = river('alezhor-water', 'The Alezhor Water',
  shoreward(atlasCourse('Alezhor,Ganesh Desert,Navarth')),
  { halfWidth: 2, halfWidthEnd: 3.2, cut: 1, cutEnd: 1.35, bed: .5 });
/**
 * **The Nahr and the Trogoreth, and they are the first water the atlas draws *inside* a southwestern
 * country.** Job 1's two both run on a border with unbuilt country for the whole of their length and
 * jobs 2 and 3 have nothing at all - a hundred and sixty-eight hexes of Meroshe desert, cape, plateau
 * and Mediterranean corner without one river edge on any of them. These two have the same country on
 * both banks, and both reach the sea: measured on the atlas's own chains, the Nahr's last point stands
 * four metres from the waterline and the Trogoreth's one metre, before `shoreward` trims each back to
 * forty-two.
 *
 *  - **The Nahr**, three `small` edges round the corner of Marosh's (-25,131), which is where its
 *    ridge is broken. The Maroshi for "river" is `nahr` (`src/gameplay/skills/languages.js`, `maroshi.roots.river`),
 *    so the one river the atlas gives this whole coast is called the river, the way job 1's Vaellir is
 *    the Pyrosi for a river and job 2's Malhat is the Moreshi for salt. Nothing is coined. It rises on
 *    the seaward face of the ridge, runs east-south-east through the gap and reaches the Iberos in a
 *    hundred and seventy metres.
 *  - **The Trogoreth**, four `small` edges through Trogo's south-eastern corner, and the lore names it
 *    itself: "The largest, which Maroshi records call the Trogoreth ('the Trogo river,' a construction
 *    that acknowledges they have no better name for it), has a wide delta mouth that has silted into a
 *    shallow estuary system." **It is the only permanent water in the first rainforest in the game**,
 *    and it is one of `src/world/scenery/undergrowth.js`'s ways through: a traveler who cannot push into the thicket
 *    can walk up the watercourse.
 *
 * **Both are waded anywhere, and that is deliberate rather than lazy.** The atlas draws `small` on all
 * seven edges, and `small` is waded everywhere else in the game; the lore's navigable delta and its
 * "canyon narrowing that stops boat traffic" are at a scale the atlas does not draw here. It also
 * matters for the country: Trogo is the first country in the game with a movement rule of its own that
 * is not the climbing one, and **a walled river inside it would be a second barrier crossing the
 * first**, which is exactly how a traveler gets sealed into a corner. One gate in this country, and it
 * is the undergrowth.
 */
export const MAROSH_NAHR = river('marosh-nahr', 'The Nahr', shoreward(atlasCourse('Marosh')),
  { halfWidth: 1.8, halfWidthEnd: 3, cut: .9, cutEnd: 1.25, bed: .5 });
export const TROGORETH = river('trogoreth', 'The Trogoreth', shoreward(atlasCourse('Trogo')),
  { halfWidth: 3.2, halfWidthEnd: 6.4, cut: 1.3, cutEnd: 2, bed: .8 });
/** Every course of the southwestern block. */
export const SOUTHWEST_RIVERS = Object.freeze([VAELLIR, ALEZHOR_WATER, MAROSH_NAHR, TROGORETH]);

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
  NETH_HEAD, NETH, NETHEREUM_OUTLET, ...NETHEREUM_STREAMS, ...LOTHARN_WATERS, ...WEST_LOTHARN_WATERS, ...OVES_RIVERS, ...GALA_RIVERS, ...MITHALA_RIVERS, ...SOUTHWEST_RIVERS]);
/** Standing water: pans, basins and the warm pool, as circles with their own depth. */
export const WEST_POOLS = Object.freeze([
  ...VASTOS_PANS, ...VASTOS_BASINS,
  Object.freeze({ id: 'sulfur-pool', ...VASTOS_SINTER.pool, depth: VASTOS_SINTER.pool.depth }),
]);

/** The regions this module shapes, in the order they were built. */
export const WEST_REGION_NAMES = Object.freeze(['Vastos', 'Meneth', 'Caricas', 'Nesdor', 'Eer', 'Isareos', 'Nethereum', 'East Lotharn Mountains', 'Gala', 'Ovesos', 'Oves Desert', 'West Lotharn Mountains',
  'South Mithala', 'West Mithala', 'East Mithala', 'North Mithala',
  'Navarth', 'West Pyros', 'Ganesh Desert', 'Ganesh Plain',
  'North Meroshe Desert', 'West Meroshe Desert', 'Central Meroshe Desert', 'South Meroshe Desert',
  'Cape Heth', 'Dinelv Highlands', 'Hama', 'Marosh', 'Trogo']);

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
  // The East Lotharn's landforms reach further than its hexes: the north face and the plain.
  if (Number.isFinite(LOTHARN_BOX.minX)) { grow(box, LOTHARN_BOX.minX, LOTHARN_BOX.minZ, 0); grow(box, LOTHARN_BOX.maxX, LOTHARN_BOX.maxZ, 0); }
  if (Number.isFinite(WEST_LOTHARN_BOX.minX)) { grow(box, WEST_LOTHARN_BOX.minX, WEST_LOTHARN_BOX.minZ, 0); grow(box, WEST_LOTHARN_BOX.maxX, WEST_LOTHARN_BOX.maxZ, 0); }
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
