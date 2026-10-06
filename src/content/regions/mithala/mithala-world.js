/**
 * The Mithala plain: South, West, East and North Mithala, as ground, climate, water margin and
 * named natural places.
 *
 * Pure: no three, no DOM. `src/content/regions/western-regions/west-ground.js` puts the landforms here into the ground
 * (`mithalaGround`) in the same sum as Caricas's shelf, Nethereum's hollow, Gala's steppe rise and
 * the Oves's basin, so the eight channels that run through them read the ground they are cut in;
 * `src/content/regions/western-regions/west-regions.js` declares those channels with the rest of the west's water;
 * `src/content/regions/mithala/mithala-scenery.js` draws what grows, and `src/content/regions/mithala/mithala-wildlife.js` places what lives there.
 * The tests, the chart and the terrain tint read the same numbers.
 *
 * Authored directly in **world metres** (100 m per authored hex), like every country since Pueth.
 *
 * **Four countries in one module, because the atlas gives them one landform.** One hundred and
 * sixteen hexes, forty-nine hex edges shared among the four, one river system with a single outlet,
 * and one climate code on every hex of all of it. They are quarters of one plain and not four
 * countries that happen to touch, so everything below is laid continuously across all four names and
 * the internal seams have nothing in them to see. The Oves built two countries this way for the same
 * reason and the lore says it outright here: "Mithala is the portion specifically north of the
 * Lotharn Mountains - the flat, sky-dominated, flood-managed river plains that the Lizeem crosses."
 *
 * **`Dfa` on all one hundred and sixteen hexes, and it is the first properly continental country in
 * the game.** Everything built so far is `Cfa`, `Csa`, `Csb` or `BSh`; `Dfa` is hot-summer humid
 * continental - warm wet summers and genuinely cold winters, with the ground frozen and snow-covered
 * for a stretch of every year. For context, the whole of this quarter of the continent reads the
 * same: Henborth `Dfa` x 27 on the western border, North Celder `Dfa` x 33 + `Dfc` x 1, the Acor
 * Wetlands one step colder at `Dfb` x 21 + `Dsb` x 4, Yunethre `Dfa` x 26.
 *
 * **The game has no seasons, so what is built is the summer face**, and the continentality is
 * carried by the species rather than by the weather (`src/content/regions/mithala/mithala-scenery.js`,
 * `src/content/regions/mithala/mithala-wildlife.js`): tall warm-season prairie grass standing to the waist by July on
 * ground that was frozen in February, prairie forbs, not one evergreen anywhere, willow, poplar and
 * alder on the water because they are what tolerates both a spring flood and a hard freeze, and a
 * heavy cold-adapted wild bovid on the open grass whose whole distribution is a seasonal circuit.
 * **What winter would bring** is written out in `docs/mithala-report.md` and is worth stating here
 * in one line, because nothing else in the game will need it sooner: the plain white and level from
 * the Lotharn to the Acorwood, the channels frozen hard enough to walk (which is the only season
 * the main channel is crossed), the tall grass standing dead and buff above the snow, and then the
 * spring flood - "every spring, when the snowmelt off the Oremindi arrives with the rains of the
 * interior, the Lizeem rises. The channels spread. The plain between them is inundated."
 *
 * **Everything the lore of the Mithala is actually about belongs to somebody, and none of it is
 * built**: Minora at the first fork and every channel-confluence market below it, the villages on
 * their levees with their raised granaries, the flood calendar and the water courts and the channel
 * affiliations that are the people's whole spatial identity, the floodwheat and the barley and the
 * rye, the river-horn herds that pull the harrows through flooded fields, the barges and the docks
 * and the grain that feeds the continent, the sky-reading tradition and the astronomy that came out
 * of it, Mithalenna's cult with the Temple of the Seven Bowls and its Bowl-Keepers, the Cref oath at
 * the old seat and the warlords who broke from it.
 */
import { terrainMix, hexOwnerAt, REGION_CELLS, REGION_TERRAIN, landDistance } from '../../../world/terrain/region-world.js';
import {
  MITHALA_RIVERS, MITHALA_MAIN, MITHALA_WEST_ARM, MITHALA_NORTH_BRAID, MITHALA_CELDER_WATER,
  MITHALA_CROSS_BRAID, MITHALA_FAN, courseDistance, coursePosition,
} from '../western-regions/west-regions.js';

const freeze = Object.freeze;
const point = (x, z) => freeze({ x, z });
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const smooth = (a, b, x) => { const v = clamp((x - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); };

export const MITHALA_REGIONS = freeze(['South Mithala', 'West Mithala', 'East Mithala', 'North Mithala']);

// ---------------------------------------------------------------------------
// The climate, which is one code a hundred and sixteen times
// ---------------------------------------------------------------------------
/**
 * What the World Builder map paints on every hex of all four countries
 * (`world-builder/map/resources/examples/azhora.wwmap`, `hexes[key].climate`, `koppen-v1` - *not*
 * `azhora.cmap.json`, whose one-code-per-region field is a default). The dev export drops the field,
 * so it is written out here and `tests/mithala-world.test.js` holds it to the map hex for hex
 * whenever the map is on the machine to ask.
 *
 * **One hundred and sixteen entries and one code.** So there is no climate gradient to draw and
 * none is drawn - which is the same answer Ovesos and the Oves Desert came to for their `BSh`, and
 * the opposite of Gala's three bands and Eer's diagonal. Where a region's own climate is uniform
 * there is no `<region>Climate` blend function either, because a blend of one code is the code.
 */
export const SOUTH_MITHALA_CLIMATE = freeze({
  '9,89': 'Dfa',
  '5,90': 'Dfa', '6,90': 'Dfa', '7,90': 'Dfa', '8,90': 'Dfa', '9,90': 'Dfa', '10,90': 'Dfa', '11,90': 'Dfa', '12,90': 'Dfa',
  '4,91': 'Dfa', '5,91': 'Dfa', '6,91': 'Dfa', '7,91': 'Dfa', '8,91': 'Dfa', '9,91': 'Dfa', '10,91': 'Dfa', '11,91': 'Dfa',
  '3,92': 'Dfa', '4,92': 'Dfa', '6,92': 'Dfa', '7,92': 'Dfa',
  '1,93': 'Dfa', '2,93': 'Dfa', '3,93': 'Dfa', '4,93': 'Dfa', '5,93': 'Dfa', '6,93': 'Dfa',
  '-1,94': 'Dfa', '0,94': 'Dfa', '1,94': 'Dfa', '2,94': 'Dfa', '3,94': 'Dfa', '4,94': 'Dfa',
});
export const WEST_MITHALA_CLIMATE = freeze({
  '1,87': 'Dfa', '2,87': 'Dfa', '3,87': 'Dfa', '4,87': 'Dfa',
  '0,88': 'Dfa', '1,88': 'Dfa', '2,88': 'Dfa', '3,88': 'Dfa', '4,88': 'Dfa',
  '-1,89': 'Dfa', '0,89': 'Dfa', '1,89': 'Dfa', '2,89': 'Dfa', '3,89': 'Dfa', '4,89': 'Dfa', '5,89': 'Dfa',
  '-1,90': 'Dfa', '0,90': 'Dfa', '1,90': 'Dfa', '2,90': 'Dfa', '3,90': 'Dfa', '4,90': 'Dfa',
  '-1,91': 'Dfa', '0,91': 'Dfa', '1,91': 'Dfa', '2,91': 'Dfa', '3,91': 'Dfa',
  '2,92': 'Dfa',
});
export const EAST_MITHALA_CLIMATE = freeze({
  '11,86': 'Dfa', '12,86': 'Dfa',
  '8,87': 'Dfa', '9,87': 'Dfa', '10,87': 'Dfa', '11,87': 'Dfa', '12,87': 'Dfa', '13,87': 'Dfa',
  '5,88': 'Dfa', '6,88': 'Dfa', '7,88': 'Dfa', '8,88': 'Dfa', '9,88': 'Dfa', '10,88': 'Dfa', '11,88': 'Dfa', '12,88': 'Dfa', '13,88': 'Dfa',
  '6,89': 'Dfa', '7,89': 'Dfa', '8,89': 'Dfa', '10,89': 'Dfa', '11,89': 'Dfa', '12,89': 'Dfa',
});
export const NORTH_MITHALA_CLIMATE = freeze({
  '11,82': 'Dfa',
  '7,83': 'Dfa', '8,83': 'Dfa', '9,83': 'Dfa', '10,83': 'Dfa', '11,83': 'Dfa',
  '5,84': 'Dfa', '6,84': 'Dfa', '7,84': 'Dfa', '8,84': 'Dfa', '9,84': 'Dfa', '10,84': 'Dfa', '11,84': 'Dfa',
  '4,85': 'Dfa', '5,85': 'Dfa', '6,85': 'Dfa', '7,85': 'Dfa', '8,85': 'Dfa', '9,85': 'Dfa', '10,85': 'Dfa', '11,85': 'Dfa',
  '3,86': 'Dfa', '4,86': 'Dfa', '5,86': 'Dfa', '6,86': 'Dfa', '7,86': 'Dfa', '8,86': 'Dfa', '9,86': 'Dfa', '10,86': 'Dfa',
  '5,87': 'Dfa', '6,87': 'Dfa', '7,87': 'Dfa',
});
export const MITHALA_CLIMATE = freeze({
  ...SOUTH_MITHALA_CLIMATE, ...WEST_MITHALA_CLIMATE, ...EAST_MITHALA_CLIMATE, ...NORTH_MITHALA_CLIMATE,
});
/** The one code. Anything that asks what the weather is on this plain gets this and nothing else. */
export const MITHALA_KOPPEN = 'Dfa';

// ---------------------------------------------------------------------------
// The boxes, and how much of a point belongs to the plain
// ---------------------------------------------------------------------------
const boxOf = names => {
  const box = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const name of names) for (const cell of REGION_CELLS[name] ?? []) {
    box.minX = Math.min(box.minX, cell.x - 95); box.maxX = Math.max(box.maxX, cell.x + 95);
    box.minZ = Math.min(box.minZ, cell.z - 95); box.maxZ = Math.max(box.maxZ, cell.z + 95);
  }
  return freeze(box);
};
/** The whole plain and a margin: outside it nothing in this file shapes anything. */
export const MITHALA_BOX = boxOf(MITHALA_REGIONS);
export const MITHALA_BOXES = freeze(Object.fromEntries(MITHALA_REGIONS.map(name => [name, boxOf([name])])));
const inBox = (box, x, z) => x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ;
export const inMithalaBox = (x, z) => inBox(MITHALA_BOX, x, z);

/**
 * How much of a point is the plain's own to shape, by the ground blend's own weights, at the
 * threshold Meneth's ridges, Nethereum's hollow, Gala's rise and the Oves's basin all use: a point
 * on the far side of a border still carries a quarter of the country behind it, and a quarter of a
 * nine-metre tilt is enough to lift somebody else's ground by two.
 *
 * **It is the four countries together and never one of them**, which is the whole point of building
 * them as one job. Ask each name separately and the answer at an internal border is two halves that
 * each fail the threshold, and a landform gated on them would die out in a valley down the middle of
 * the plain along every one of the forty-nine internal edges.
 */
export function mithalaWeight(x, z, mix = null) {
  if (!inMithalaBox(x, z)) return 0;
  const weights = (mix ?? terrainMix(x, z)).weights;
  let own = 0;
  for (const name of MITHALA_REGIONS) own += weights[name] ?? 0;
  return own;
}
export const mithalaShare = (x, z, mix = null) => smooth(.3, .8, mithalaWeight(x, z, mix));
/**
 * **The same weight at a much lower threshold, for the three things that have to reach the water.**
 * The atlas draws six of this plain's eight channels **on a border**, and four of those borders are
 * with countries nobody has built: at the water's own edge the blend is a third of the Mithala and
 * two thirds of something else, so the tilt, the levees and the swale below - the three landforms
 * that are about the river - would all stop short of the river they belong to. It is exactly the
 * allowance the Sorten's bench needs on the Oveth (`ovesWeights.sorten`, src/content/regions/oves/oves-world.js), for
 * exactly the same reason, and it is why the west arm's floor is the plain's and not the outland's.
 */
export const mithalaBankShare = (x, z, mix = null) =>
  smooth(.05, .30, mithalaWeight(x, z, mix)) * lotharnGate(x, z);

/**
 * **Nothing this plain does happens inside either Lotharn's ground.** The low threshold above is
 * what lets the tilt and the levees reach a river drawn on a border, and it is safe on the four
 * unbuilt margins - North Celder, South Celder, Henborth, the Acor Wetlands and the two Acorwoods
 * are outland and nothing of anybody's is there to move. The Lotharn is the one exception and it is
 * the exception that matters: twenty-five of South Mithala's edges are the two ranges, the Celder
 * water's head stands at the three-country corner where South Mithala, North Celder and the West
 * Lotharn meet, and the West Lotharn's mountain front is a hundred and ninety metres of built ground
 * within a hex of it.
 *
 * Measured before this gate existed: the swale, reading a blended base at a point the range's own
 * landform had lifted, took **92.6 m out of the West Lotharn's face** at (-2059, -942), and 4.7 m
 * out of the East Lotharn's at (-1073, -1201).
 *
 * It is a **distance from the ranges' own hex centres** and not a blend weight, and that is the one
 * thing about it that had to be measured rather than reasoned. A blend weight is symmetrical: at a
 * point that is a third mountain and a third plain it says the same thing whichever side of the line
 * the point is on, so a gate tight enough to keep the swale off a cliff a few metres inside the
 * range also turned it off across a whole row of the plain's own hexes, and the Celder water lost
 * its floor. A distance does not: `keep` is a hex half-width, so a point nearer than that to a
 * mountain hex's middle is that hex's and this plain leaves it alone, and by `free` - a hex and a
 * sixth - the plain has it back. Every Mithala hex centre is clear of it and every Lotharn hex
 * centre is inside it, by construction.
 */
export const LOTHARN_NAMES = freeze(['East Lotharn Mountains', 'West Lotharn Mountains']);
export const LOTHARN_KEEP = freeze({ keep: 58, free: 118 });
/** Every Lotharn hex centre within reach of the plain, once. */
const LOTHARN_CENTRES = freeze(LOTHARN_NAMES.flatMap(name => (REGION_CELLS[name] ?? [])
  .filter(cell => cell.x > MITHALA_BOX.minX - 160 && cell.x < MITHALA_BOX.maxX + 160
    && cell.z > MITHALA_BOX.minZ - 160 && cell.z < MITHALA_BOX.maxZ + 160)
  .map(cell => point(cell.x, cell.z))));
export function lotharnGate(x, z) {
  if (!inMithalaBox(x, z)) return 1;
  let nearest = Infinity;
  for (const centre of LOTHARN_CENTRES) {
    const d = (centre.x - x) ** 2 + (centre.z - z) ** 2;
    if (d < nearest) nearest = d;
  }
  if (nearest >= LOTHARN_KEEP.free ** 2) return 1;
  return smooth(LOTHARN_KEEP.keep, LOTHARN_KEEP.free, Math.sqrt(nearest));
}

// ---------------------------------------------------------------------------
// The tilt: the whole fall of the plain, in one field
// ---------------------------------------------------------------------------
/**
 * **The only reason the water goes anywhere.** The four countries share one terrain profile to the
 * digit (`REGION_TERRAIN`, src/world/terrain/region-world.js) precisely so that no level difference is hidden in
 * the hex blend, which means the plain's whole fall has to be a landform - and this is it, one
 * plane laid across all one hundred and sixteen hexes and gated only by the blend at the outside
 * edge.
 *
 * **Which way it falls is the atlas's, not a choice.** Every drawn channel runs to one outlet at
 * (-1000, -1414), where the hexes beyond are unclaimed water, so the plain falls **east**; and the
 * north braid rises on the northern shelf and runs south, so the plain falls **south** as well,
 * which makes those northern rows the low divide between this drainage and the Acor Wetlands
 * behind them. Eight metres of easting over fourteen hundred and fifty, and two and two fifths of
 * northing over nine hundred and fifty: one in a hundred and eighty and one in four hundred. The
 * lore's word for the result is "a plain that has no interest in rising".
 *
 * The pivot is the meeting of the arms, so the tilt is nought there and the plain's own profile
 * base (10.5 m on `plains`) is the level of the river junction rather than of an average nobody
 * stands on. Measured at the extremes: +4.1 m at West Mithala's western rim, -3.9 at the river's
 * mouth, +1.8 on North Mithala's northernmost hex, -1.1 at South Mithala's Lotharn corner. **Under
 * five metres anywhere**, which is what keeps the step at the four unbuilt margins to about what
 * Gala's steppe rise makes at its own.
 */
export const MITHALA_TILT = freeze({ pivotX: -1700, pivotZ: -1414, perEast: 8 / 1450, perNorth: 2.4 / 950 });
/** The plane itself, ungated: how far this point stands above the meeting of the arms. */
export const mithalaSlope = (x, z) => MITHALA_TILT.perEast * (MITHALA_TILT.pivotX - x)
  + MITHALA_TILT.perNorth * (MITHALA_TILT.pivotZ - z);
export function mithalaTilt(x, z, own = mithalaBankShare(x, z)) {
  if (own <= 0) return 0;
  return mithalaSlope(x, z) * own;
}

// ---------------------------------------------------------------------------
// The flood plain: levees, and the backswamps between them
// ---------------------------------------------------------------------------
/**
 * **The one landform a flood plain actually has**, and the lore puts the whole of Mithala settlement
 * on it: "Mithala settlements are built for the flood. Villages and towns sit on the highest
 * available ground - the natural levees along the main channel banks, the slightly elevated patches
 * between braids." A levee is not built by anybody: it is what a river in flood leaves when it comes
 * over its bank, drops the coarse part of its load in the first few paces and carries the fine part
 * away across the plain. So the ground is **highest at the water and lowest halfway to the next
 * channel**, which is the exact opposite of what anybody expects of a river and is the reason the
 * villages are where they are.
 *
 * Read off the **nearest** channel and not summed over all of them: a levee is a bank beside one
 * river, and two banks added together where two channels run two hundred metres apart would stand a
 * ridge between them instead of the basin the lore says is there.
 *
 * `crest` is how high the bank stands above the plain, `bank` how far out it holds that height and
 * `reach` where it is gone; `basin` is how far the ground between the channels lies below the plain,
 * coming on over `basinFrom`...`basinTo` and gone again by `basinBack`, so that ground far from every
 * channel is the plain's own level and not a permanent hollow. The crest is **scaled by the
 * channel's own width**, because a bank is made of what the river carried: the main channel's is the
 * full metre and a quarter, the north braid's and the west arm's about half of that, and the fan's
 * two distributaries barely a hand's breadth.
 */
export const MITHALA_FLOOD = freeze({
  crest: 1.25, bank: 18, reach: 66, basin: .6, basinFrom: 96, basinTo: 215, basinBack: 430, widest: 11,
});
/** The nearest channel to a point, with its distance, or null if none is within reach. */
export function nearestChannel(x, z, limit = MITHALA_FLOOD.basinBack) {
  let best = null, bestDistance = limit;
  for (const course of MITHALA_RIVERS) {
    const distance = courseDistance(course, x, z, bestDistance);
    if (distance < bestDistance) { bestDistance = distance; best = course; }
  }
  return best ? { course: best, distance: bestDistance } : null;
}
const leveeScale = course => clamp(course.maxHalf / MITHALA_FLOOD.widest, .22, 1);
/**
 * The levee and the backswamp in one number: positive on the bank, negative between the channels,
 * nought far from any of them and nought off the plain.
 */
export function mithalaFlood(x, z, own = mithalaBankShare(x, z), near = null) {
  if (own <= 0) return 0;
  const found = near ?? nearestChannel(x, z);
  return found ? floodAt(found) * own : 0;
}
function floodAt(found) {
  const F = MITHALA_FLOOD, d = found.distance, scale = leveeScale(found.course);
  const crest = F.crest * scale * (1 - smooth(F.bank, F.reach, d));
  const basin = F.basin * scale * smooth(F.basinFrom, F.basinTo, d) * (1 - smooth(F.basinBack * .55, F.basinBack, d));
  return crest - basin;
}

// ---------------------------------------------------------------------------
// The swale: the floor the river has levelled for itself
// ---------------------------------------------------------------------------
/**
 * **A river on a flood plain does not run across the country's relief; it runs on a floor it has
 * laid itself**, out to a couple of hundred metres either side, and that floor is level across
 * whatever the ground would otherwise have done. Every channel here is therefore given one: within
 * `inner` metres of a channel the ground is the plain's own designed surface — the blend's base, the
 * tilt and the levee, and no relief at all — and it comes back to the ordinary ground by `outer`.
 *
 * **It is not decoration; without it there are no rivers here.** Six of the eight channels run on a
 * border and four of those borders are unbuilt, so up to two thirds of the blend along them is
 * `outland`, whose relief is six metres on a hundred-and-fifty-metre wave — twelve times this
 * plain's own amplitude. Measured before the swale was built: the west arm's water was forced down
 * **6.79 m** over its thousand metres, all of it in four sample dips where the outland wave happened
 * to be low, and it arrived at the meeting **5.3 m below the main channel it flows into**. With the
 * swale it falls a little under four, which is the tilt, which is what the atlas draws.
 *
 * The blend's `base` is kept and only `relief()` is dropped, because a base blends linearly across a
 * hex boundary and is therefore already smooth; it is the sine that chirps. And the swale lets go at
 * the shore (`landDistance`), because the coast field lowers the last forty metres to the sea and a
 * levelled floor laid over that would draw the river's bed in the air above the beach.
 */
export const MITHALA_SWALE = freeze({ inner: 45, outer: 165, shoreFrom: 22, shoreTo: 72 });
export function mithalaSwaleWeight(x, z, bank = null, near = null) {
  const found = near ?? nearestChannel(x, z, MITHALA_SWALE.outer);
  if (!found) return 0;
  const S = MITHALA_SWALE;
  const across = 1 - smooth(S.inner, S.outer, found.distance);
  if (across <= 0) return 0;
  const own = bank ?? mithalaBankShare(x, z);
  if (own <= 0) return 0;
  return across * own * smooth(S.shoreFrom, S.shoreTo, landDistance(x, z));
}
/** How high a point stands on a levee, 0 off one and 1 on a main-channel crest: the scatter reads it. */
export const onLevee = (x, z) => clamp(mithalaFlood(x, z) / MITHALA_FLOOD.crest, 0, 1);
/**
 * How deep in a backswamp a point stands, 0 on the levees and the open plain and 1 in the middle of
 * the wettest ground between two channels. The whole of what grows on the flood plain is read off
 * this and `mithalaWet` below, the way Nethereum's meadow is read off `nethereumWet`.
 */
export const inBackswamp = (x, z) => clamp(-mithalaFlood(x, z) / (MITHALA_FLOOD.basin * .9), 0, 1);

// ---------------------------------------------------------------------------
// The northern margin: where the plain stops being plain
// ---------------------------------------------------------------------------
/**
 * **The Acor Wetlands fall.** "To the north, the plain eventually gives way to the Acorwood... the
 * edge communities sitting against the open country without wall or cliff to announce the boundary."
 * The atlas puts twelve of North Mithala's outside edges against the Acor Wetlands (`Dfb` x 21 +
 * `Dsb` x 4 - one step colder than here) on its northern rows, and eight against West Acorwood on
 * its north-eastern ones, and the two margins are not the same thing at all: one is water and one is
 * forest. So the fall is laid on the **wetland side only** (`wetSide`), over the last hundred and
 * fifty metres before the border, and the forest side keeps the plain's own level, because a forest
 * grows on ground and a fen is a hole.
 *
 * It is a little more than the tilt raises that ground, so the northern rows come out **level and
 * then very slightly falling** rather than rising - a divide a traveler cannot see, with the braid's
 * two heads a hundred metres south of it and the wetlands beginning a hundred metres north. That is
 * what a watershed on ground this flat is, and it is why the atlas can draw a river starting there.
 */
export const MITHALA_FEN = freeze({ drop: 2.4, from: -1950, to: -2075, eastFrom: -1550, eastTo: -1400 });
/** How far into the fen margin a point stands, 0 on the dry shelf and 1 at the wetland border. */
export function mithalaWet(x, z) {
  if (!inMithalaBox(x, z)) return 0;
  const F = MITHALA_FEN;
  return smooth(-F.from, -F.to, -z) * (1 - smooth(F.eastFrom, F.eastTo, x));
}
/**
 * The fall itself, taken out of the ground. It is weighed by `mithalaBankShare` and not by
 * `mithalaShare` for the same reason the tilt is: at the wetland border two thirds of the blend is
 * the Acor Wetlands, which are unbuilt, so the ordinary threshold has the fall dying out exactly
 * where it should be deepest. Nothing of anybody's moves for it - what it writes past the border is
 * the first hundred metres of a fen the atlas already calls `wetland`.
 */
export function mithalaFenFall(x, z, own = mithalaBankShare(x, z)) {
  if (own <= 0) return 0;
  const wet = mithalaWet(x, z);
  return wet > 0 ? MITHALA_FEN.drop * wet * own : 0;
}

// ---------------------------------------------------------------------------
// The summer channels, and there is no water in any of them
// ---------------------------------------------------------------------------
/**
 * **"The summer-only channels that fill in high-water years and run dry otherwise."** The atlas
 * draws the channels that carry water every year; these are the other kind, and on a plain whose
 * whole calendar is the flood they are as much a part of the ground as the levees are. Each is a
 * real cut bed with a flat silt floor and **nothing in it**: no water surface, no ribbon, no reed,
 * and a traveler walks down the middle of any of them. The Oves Desert's four dry channels are the
 * same machinery for the opposite reason - there it never rains, here it floods every spring.
 *
 * Four, one to a country, each leaving a levee and giving out on the flat: they start where a bank
 * is lowest and end where the ground stops falling, which is what a crevasse channel does.
 *
 * `floor` is the half-width of the flat silt, `bank` the half-width of the cut at the top, `depth`
 * how far the floor lies below the ground beside it. Each deepens over its first `head` metres and
 * fans out over its last `foot`.
 */
const summerChannel = (id, name, region, points, spec) => freeze({
  id, name, region, points: freeze(points.map(p => point(p.x, p.z))),
  floor: 3.8, bank: 11, depth: .95, head: 36, foot: 70, ...spec,
});
export const MITHALA_SUMMER_CHANNELS = freeze([
  summerChannel('south-mithala-summer-channel', 'The Summer Channel', 'South Mithala', [
    point(-1560, -1342), point(-1548, -1300), point(-1540, -1258), point(-1536, -1214), point(-1538, -1176),
  ], { depth: 1 }),
  summerChannel('east-mithala-summer-channel', 'The Back Channel', 'East Mithala', [
    point(-1466, -1462), point(-1440, -1496), point(-1406, -1524), point(-1366, -1544), point(-1322, -1556),
  ], { depth: 1.05, bank: 12, floor: 4.2 }),
  summerChannel('west-mithala-summer-channel', 'The Grass Channel', 'West Mithala', [
    point(-2082, -1300), point(-2058, -1338), point(-2036, -1378), point(-2020, -1418), point(-2012, -1452),
  ], { depth: .85, bank: 10, floor: 3.2 }),
  summerChannel('north-mithala-summer-channel', 'The Shelf Channel', 'North Mithala', [
    point(-1866, -1762), point(-1824, -1746), point(-1780, -1734), point(-1736, -1728), point(-1700, -1726),
  ], { depth: .8, bank: 10, floor: 3.2 }),
]);

const summerMetrics = freeze(new Map(MITHALA_SUMMER_CHANNELS.map(channel => {
  let length = 0;
  for (let i = 1; i < channel.points.length; i++)
    length += Math.hypot(channel.points[i].x - channel.points[i - 1].x, channel.points[i].z - channel.points[i - 1].z);
  const reach = channel.bank + 4;
  const xs = channel.points.map(p => p.x), zs = channel.points.map(p => p.z);
  return [channel.id, freeze({ length, reach, bounds: freeze({
    minX: Math.min(...xs) - reach, maxX: Math.max(...xs) + reach, minZ: Math.min(...zs) - reach, maxZ: Math.max(...zs) + reach }) })];
})));
export const summerChannelLength = id => summerMetrics.get(id).length;

/** Distance to a summer channel's centre line and how far along it, in metres from its head, or null. */
export function summerChannelPlace(channel, x, z) {
  const b = summerMetrics.get(channel.id).bounds;
  if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) return null;
  let best = Infinity, along = 0, run = 0;
  for (let i = 1; i < channel.points.length; i++) {
    const a = channel.points[i - 1], c = channel.points[i];
    const dx = c.x - a.x, dz = c.z - a.z, length = Math.hypot(dx, dz);
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (length * length), 0, 1);
    const d = Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
    if (d < best) { best = d; along = run + t * length; }
    run += length;
  }
  return { channel, distance: best, along, length: summerMetrics.get(channel.id).length };
}
/** The nearest summer channel to a point, or null. */
export function nearestSummerChannel(x, z) {
  let best = null;
  for (const channel of MITHALA_SUMMER_CHANNELS) {
    const place = summerChannelPlace(channel, x, z);
    if (place && (!best || place.distance < best.distance)) best = place;
  }
  return best;
}
/** How deep a summer channel is cut here, 0 outside them all. Subtracted from the ground. */
export function mithalaSummerCut(x, z, own = mithalaShare(x, z)) {
  if (own <= 0) return 0;
  let cut = 0;
  for (const channel of MITHALA_SUMMER_CHANNELS) {
    const place = summerChannelPlace(channel, x, z);
    if (!place || place.distance >= channel.bank) continue;
    const lengthwise = smooth(0, channel.head, place.along) * (1 - smooth(place.length - channel.foot, place.length, place.along));
    if (lengthwise <= 0) continue;
    cut = Math.max(cut, channel.depth * lengthwise * (1 - smooth(channel.floor, channel.bank, place.distance)) * own);
  }
  return cut;
}
/** On a summer channel's silt floor, where it is deep enough to be one. */
export function onSummerFloor(x, z, margin = 0) {
  const place = nearestSummerChannel(x, z);
  return !!place && place.distance < place.channel.floor + margin && mithalaSummerCut(x, z) > .3;
}

// ---------------------------------------------------------------------------
// The whole of it, for the ground
// ---------------------------------------------------------------------------
/**
 * Everything this module adds to or takes out of the ground, in one number, the way
 * `galaRise(x, z) - galaWash(x, z)` and `ovesGround(x, z)` are each one term of `west-ground.js`'s
 * sum. Two comparisons reject the rest of Azhora.
 *
 * The order inside it does not matter - they are added - but which of them is which does: the tilt
 * carries the plain downhill, the levees stand the ground up beside the water and let it down
 * between, the fen takes the northern margin away, and the summer channels are cut into whatever the
 * rest leave, so a dry channel on the tilt runs downhill with it.
 */
export function mithalaGround(x, z, ground) {
  if (!inMithalaBox(x, z)) return ground;
  const mix = terrainMix(x, z), raw = mithalaWeight(x, z, mix);
  if (raw <= 0) return ground;
  const keep = lotharnGate(x, z);
  if (keep <= 0) return ground;
  const bank = smooth(.05, .30, raw) * keep, own = smooth(.3, .8, raw) * keep;
  const near = nearestChannel(x, z);
  const flood = near ? floodAt(near) : 0;
  let height = ground + mithalaSlope(x, z) * bank + flood * bank - mithalaFenFall(x, z, bank);
  const swale = mithalaSwaleWeight(x, z, bank, near);
  // The designed surface: the blend's own base, the tilt and the levee, and no relief at all.
  if (swale > 0) height = height + (mix.base + mithalaSlope(x, z) + flood - height) * swale;
  return height - mithalaSummerCut(x, z, own);
}

/** Whether the scatter must keep off a point for this plain's own reasons: a summer channel's floor. */
export const mithalaClear = (x, z, margin = 0) => onSummerFloor(x, z, margin);

// ---------------------------------------------------------------------------
// The colour of the ground
// ---------------------------------------------------------------------------
/**
 * Three grounds the atlas's terrain field cannot colour, for the reason Gala's plains and the Oves's
 * could not be: the field says `plains` and `grassland` and means several things at once.
 *
 * On this plain what decides the colour is **how far the ground is from a channel**, because that is
 * what decides how often it is under water and what grows on it - "a precision about what to plant
 * where, when to plant it, which fields need the flood and which need to be protected from it". The
 * levee crest is the driest ground in the country and reads pale and warm; the backswamp between two
 * channels is the wettest and reads dark and green; and the northern fen margin, where the wetland
 * begins without a line to say so, reads grey-green with sedge in it. The whole of that changes over
 * a hundred metres, which no count per hex can say.
 *
 * Hooked into `groundTint` (src/world/terrain/world-terrain.js) for these countries' own swatches only; everywhere
 * else it answers null and nothing changes.
 */
export const MITHALA_GROUND = freeze({
  levee: 0x8a904f,     // the bank: drier and warmer, the one ground here that is never under water
  plain: 0x6f8043,     // the open flood plain between the two, which is South Mithala's own swatch
  basin: 0x51703b,     // the backswamp: dark, rank, green into August
  fen: 0x69795a,       // the northern margin: sedge and rush over standing water
});
const SWATCHES = freeze(new Set(MITHALA_REGIONS.flatMap(name => {
  const profile = REGION_TERRAIN[name];
  return [profile.ground, ...Object.values(profile.byTerrain ?? {}).map(entry => entry.ground)];
})));
const mixHex = (from, to, t) => {
  const k = clamp(t, 0, 1);
  const channel = shift => { const a = (from >> shift) & 255, b = (to >> shift) & 255; return Math.round(a + (b - a) * k) & 255; };
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
};
const hexOf = swatch => (typeof swatch === 'string' ? parseInt(swatch.replace('#', ''), 16) : swatch);
export function mithalaTint(x, z, ground) {
  if (!inMithalaBox(x, z) || !SWATCHES.has(ground)) return null;
  const own = mithalaShare(x, z);
  if (own <= 0) return null;
  const base = hexOf(ground);
  const wet = mithalaWet(x, z);
  let colour = base;
  const bank = onLevee(x, z), basin = inBackswamp(x, z);
  if (bank > 0) colour = mixHex(base, MITHALA_GROUND.levee, smooth(.12, .85, bank));
  else if (basin > 0) colour = mixHex(base, MITHALA_GROUND.basin, smooth(.1, .9, basin) * .85);
  if (wet > 0) colour = mixHex(colour, MITHALA_GROUND.fen, smooth(.05, .8, wet));
  return colour === base ? null : colour;
}

// ---------------------------------------------------------------------------
// The places
// ---------------------------------------------------------------------------
/**
 * The natural places worth a name on the chart. **Nothing here is coined.**
 * `world-builder/azhoran_language_profiles.py` has no Mithali profile at all - Mithala appears only
 * as an *inspiration* in the Grassic and Bouéni lists, which are two other peoples' grammars - and
 * the lore is explicit that the name itself is substrate: "The word does not decompose cleanly in
 * any Mittoli root system... The Academy's linguistic file on it has been growing for two centuries
 * and has not produced a consensus etymology." A name built out of Mittoli roots would contradict
 * the lore it was meant to serve, exactly as it would in the Lotharn. So everything is either the
 * lore's own word (the north braid, the main channel, the Mithala) or plain English.
 *
 * One place was named for what was *not* built on it, because leaving it unnamed would have been
 * dishonest about the ground, and is now named for what is: **the meeting of the arms**, where the
 * campaign's river-city stands (`campaign-world.js`: "Where the rivers of West, East and South
 * Mithala meet"), built round it on all four countries (src/content/regions/mithala/mithala-city.js). **The levees** are
 * still named for what is not on them: every village on this plain is on one, and none of them is yet.
 */
const onLine = (course, t) => {
  const points = course.points;
  const index = clamp(Math.round((points.length - 1) * t), 0, points.length - 1);
  return point(points[index].x, points[index].z);
};
const besideLine = (course, t, offset) => {
  const at = onLine(course, t);
  const samples = course.samples;
  let best = samples[0], bestDistance = Infinity;
  for (const sample of samples) {
    const d = (sample.x - at.x) ** 2 + (sample.z - at.z) ** 2;
    if (d < bestDistance) { bestDistance = d; best = sample; }
  }
  for (const side of [1, -1]) {
    const x = best.x + best.nx * offset * side, z = best.z + best.nz * offset * side;
    if (MITHALA_REGIONS.includes(hexOwnerAt(x, z))) return point(x, z);
  }
  return at;
};

export const MITHALA_LANDMARKS = freeze([
  // ----- South Mithala -----
  freeze({ id: 'mithala-meeting', name: 'The Meeting of the Arms', x: -1700, z: -1414,
    description: 'Where the arm out of the western hill country and the north braid come together and go on east as one channel. Three quarters of the plain have a corner here and every drop of water on it passes the spot, and Mithala is built round it on all four. The ground on the inside of the fork is the highest, driest and most obvious building land in the Mithala, and the old seat stands on it, with the sky tower over the point and the flood gauge at the water’s edge; the Quays face it across the braid and the Ford across the main channel.' }),
  freeze({ id: 'the-main-channel', name: 'The Main Channel', ...besideLine(MITHALA_MAIN, .5, 30),
    description: 'The largest water on the plain, running east to the sea in a bed it has laid itself: levees a pace and a half high on both banks, bars of grey silt down the middle, and three threads round them where it cannot decide. Wadeable over gravel at its head, where Mithala has paved the ford, and deep below that. A flat-bottomed boat would go anywhere on it, and the grain barges at Mithala’s quay are the ones that do.' }),
  freeze({ id: 'south-mithala-apron', name: 'The Apron', x: -1500, z: -1270,
    description: 'The last rise of the Lotharn, come out into the plain as two long low swells of older ground between the mountains’ water and the main channel. Twelve metres is the whole of it, and on this ground twelve metres is a view: from the top of the eastern swell you can see the range behind you and the channel country in front, and no flood has ever been up here.' }),
  freeze({ id: 'south-mithala-levees', name: 'The Levees', ...besideLine(MITHALA_MAIN, .68, 34),
    description: 'The banks the river built for itself, and the only ground on the plain that is never under water. The country drops away behind them into the backswamps, so that a traveler walking inland from the channel walks steadily downhill for two hundred paces and then up again to the next one. Every village in the Mithala stands on a bank like this. None of them is here.' }),
  freeze({ id: 'mountain-march', name: 'The Mountain March', x: -1850, z: -1050,
    description: 'The plain’s one hard edge. Everywhere else the Mithala gives out gradually — into hills in the west, into forest in the north — and here the flat simply stops and the Lotharn stands up out of it. The farmers’ phrase for the range is "the places where the land went wrong", which is precision and not hostility: this ground is right for what they do and that ground is not.' }),
  // ----- West Mithala -----
  freeze({ id: 'round-horizon', name: 'The Round Horizon', x: -2100, z: -1490,
    description: 'The middle of the upper grass, and the emptiest place in Azhora. The horizon here is a line circling the full compass, unbroken except by weather; a traveler out of hill country stands in it and feels briefly exposed, the way animals do when they leave the treeline, and after a day or two the feeling turns into something else. The people who live on this plain read the western horizon for the next three days and have words for it that Standard Mittoli has not found it necessary to invent.' }),
  freeze({ id: 'the-west-arm', name: 'The West Arm', ...besideLine(MITHALA_WEST_ARM, .45, 24),
    description: 'The longer of the two arms, coming onto the plain along the Celder margin and bending south-east and then north-east to the meeting. Small enough to wade at any point on it, and the reason the west of the plain is grass rather than braid: it has not yet had room to split.' }),
  freeze({ id: 'west-mithala-fan', name: 'The Fan', ...besideLine(MITHALA_FAN[0], .5, 20),
    description: 'Two short channels leaving the arm on its northern side and giving out on the grass within a few hundred paces — the beginning of the braiding that makes the rest of the plain. Each is a cut of dark silt with willow along it, running until the ground stops falling and then simply stopping.' }),
  freeze({ id: 'west-mithala-grass', name: 'The Upper Grass', x: -2000, z: -1560,
    description: 'Warm-season prairie grass standing to the waist by midsummer on two metres of black river soil, with forbs through it and not a tree anywhere out of sight of water. It is dead and buff from the first frost to the thaw and green again a month after, which is the whole of what this climate does to a plain and the whole of why the grass is this tall.' }),
  // ----- East Mithala -----
  freeze({ id: 'east-mithala-gather', name: 'Where the Channels Gather', ...besideLine(MITHALA_MAIN, .8, 40),
    description: 'The lowest and wettest ground in the Mithala, where the threads of the main channel come back together for the run to the sea. Rank grass to the knee on silt that is still soft in August, backswamps on both sides that stand under water for weeks of every spring, and a gallery of willow and poplar two trees deep on the water.' }),
  freeze({ id: 'the-river-mouth', name: 'The River Mouth', ...besideLine(MITHALA_MAIN, .97, 26),
    description: 'Where the plain ends and the water goes. The channel widens, the levees flatten out, the grass turns to sand within forty paces, and the sea is there with nothing at all to announce it. Everything the Mithala grows that leaves the Mithala leaves past this point, in the flat grain barges that load at Mithala’s quay.' }),
  // Thirty metres off the centre line and not twenty-two: at twenty-two the point stood on the
  // levee crest, where the analytic ground rises a pace and a half over eighteen metres and the
  // renderer's seven-metre grid cannot follow it, so the drawn triangle floated a metre over the
  // ground a traveler walks on. It had been within a hand's breadth of the limit since this plain
  // was built and went over it when the world grew west and every coarse-band vertex moved a
  // little (docs/southwest-1-report.md). Thirty is off the crest and on the bank the gallery
  // actually stands on, which is what this landmark was always about.
  freeze({ id: 'east-mithala-gallery', name: 'The Gallery', ...besideLine(MITHALA_MAIN, .62, 30),
    description: 'The only wood on the plain: willow, black poplar and alder standing two and three trees deep along the channel banks, roots in water that freezes every winter and floods every spring, which is a combination very little else will tolerate. Seen from half a mile out on the grass it is a dark line with nothing behind it, and it is how you find the river.' }),
  freeze({ id: 'acorwood-horizon', name: 'The Acorwood Horizon', x: -1230, z: -1680,
    description: 'The north-eastern skyline, where the treeline thickens along the top of the plain until it is a forest. There is no wall, no cliff and no line: the Acorwood closes off the north of the continent and it does it by getting gradually nearer. The river communities have no reason that would outweigh the navigation, and do not go in.' }),
  // ----- North Mithala -----
  freeze({ id: 'the-north-braid', name: 'The North Braid', ...besideLine(MITHALA_NORTH_BRAID, .55, 22),
    description: 'The plain’s northern arm, and one of the two channels the lore names — a village on this plain says it is on the North Braid the way anywhere else says which valley it is in, because the channel is the flood timing and the flood timing is everything. It runs south out of the wet shelf on two heads, takes the cross braid in, and splits into threads where the ground flattens.' }),
  freeze({ id: 'north-braid-heads', name: 'The Braid Heads', x: -1950, z: -1790,
    description: 'Two channels beginning a hundred paces apart on flat wet ground, with no spring, no hill and nothing else to explain them. This is the divide: water a short walk north of here goes to the Acor Wetlands and never sees the Mithala, and water here goes the length of the plain to the sea. On ground this flat a watershed is a thing you can stand on without knowing.' }),
  freeze({ id: 'north-mithala-shelf', name: 'The Shelf', x: -1700, z: -1830,
    description: 'The last dry ground going north: tall grass on a very slight rise, with the plain falling away south to the braid and north into sedge. It is two metres higher than the fen and it is the difference between grass and rush.' }),
  freeze({ id: 'north-mithala-fen', name: 'The Fen Margin', x: -1850, z: -1990,
    description: 'Where the plain stops being plain, over about a hundred and fifty paces and without anything to mark it: the grass shortens, sedge and rush come up through it, the ground softens, and then there is standing water between the tussocks and you are in the Acor Wetlands. Nobody drew the line because there is not one.' }),
  freeze({ id: 'acorwood-approach', name: 'The Approach to the Acorwood', x: -1420, z: -1880,
    description: 'The north-eastern corner, where the wetland margin and the forest margin meet and the plain is squeezed between them. The dark line on the horizon here is the Acorwood’s western edge; the open country runs right up to it without a wall or a cliff, and the last hundred paces of grass have young trees standing in them.' }),
]);
