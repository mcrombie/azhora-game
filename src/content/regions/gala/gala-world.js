/**
 * Gala: the western bank of the Lizeem near its mouth, as ground, climate and named natural places.
 *
 * Pure: no three, no DOM. `src/content/regions/western-regions/west-ground.js` puts the landform here into the ground (`galaRise`,
 * `galaWash`), in the same sum as Caricas's shelf and Nethereum's hollow, so the rivers that run
 * through it read the ground they are cut in; `src/content/regions/western-regions/west-regions.js` declares Gala's water with the
 * rest of the west's; `src/content/regions/gala/gala-scenery.js` draws what grows, and `src/content/regions/gala/gala-wildlife.js` places what
 * lives there. The tests, the chart and the terrain tint read the same numbers.
 *
 * Authored directly in **world metres** (100 m per authored hex), like every country since Pueth.
 *
 * **What comes from the atlas** (docs/gala-brief.md; the atlas wins over the lore):
 *  - twenty-one hexes, nineteen `plains` and two `grassland` on the sea;
 *  - three climates in three straight bands: `BSh` over the northern three rows, `Csb` over the
 *    next two, `Csa` on the southern row at the sea (`GALA_CLIMATE`);
 *  - its water, all of it on its borders: the Lizeem east (built), the Oveth and a medium stream
 *    north and north-west (the Caelin), the Treloss down the Telemonia border to the sea (src/content/regions/western-regions/west-regions.js);
 *  - its neighbours, and one of them in particular: Northern Ascarth on eight edges of the
 *    south-east side, being built in another branch at the same time (`GALA_SEAM`).
 *
 * **What comes from the lore** (`world-builder/azhora_lore/geography/regions/gala.md`): "the coastal
 * plain is flat, fertile, drained by a network of small rivers"; the north "is the interior weather
 * — dry, hot, and grazed rather than farmed"; the south "warm, well-watered by the Lizeem's
 * distributaries and seasonal rains off the sea". Everything else the lore is about — the city, its
 * harbour and market, the Guild of Assessors, the herding communities of the north, the irrigation
 * channels in the dry stretches — is somebody's, and none of it is built.
 */
import { hexAtlasCorners, TRANSFORM, terrainMix, hexAt, hexCentre, REGION_CELLS, METRES_PER_HEX } from '../../../world/terrain/region-world.js';
import { OVETH_REACH, GALA_CHANNEL, WEST_BRAIDS } from '../western-regions/west-regions.js';

const freeze = Object.freeze;
const point = (x, z) => freeze({ x, z });
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const smooth = (a, b, x) => { const v = clamp((x - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); };

// ---------------------------------------------------------------------------
// The atlas
// ---------------------------------------------------------------------------
/**
 * What the World Builder map paints on each of Gala's hexes (`azhora.wwmap`, `climate`). The dev
 * export drops the field, so it is written out here and `tests/gala-world.test.js` holds it to the
 * map whenever the map is on the machine to ask. Three rows of hot steppe, two of the cooler-summer
 * Mediterranean, one of the hot-summer one on the sea: "the gradient runs the length of the country".
 */
export const GALA_CLIMATE = freeze({
  '-9,117': 'BSh', '-8,117': 'BSh', '-7,117': 'BSh',
  '-10,118': 'BSh', '-9,118': 'BSh', '-8,118': 'BSh', '-7,118': 'BSh',
  '-11,119': 'BSh', '-10,119': 'BSh', '-9,119': 'BSh', '-8,119': 'BSh', '-7,119': 'BSh',
  '-11,120': 'Csb', '-10,120': 'Csb', '-9,120': 'Csb', '-8,120': 'Csb',
  '-11,121': 'Csb', '-10,121': 'Csb', '-9,121': 'Csb',
  '-12,122': 'Csa', '-11,122': 'Csa',
});
export const GALA_BANDS = freeze(['BSh', 'Csb', 'Csa']);

/**
 * How much of each climate a point is in, blended over Gala's own hexes by the weights the ground
 * blend uses, so the steppe gives way to the Mediterranean over about a hundred metres and nobody
 * crosses a line. Only Gala's hexes vote: a neighbour's weather is its own.
 */
export function galaClimate(x, z) {
  const home = hexAt(x, z), out = { BSh: 0, Csb: 0, Csa: 0 };
  let total = 0;
  for (const [dq, dr] of [[0, 0], [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]]) {
    const q = home.q + dq, r = home.r + dr, code = GALA_CLIMATE[`${q},${r}`];
    if (!code) continue;
    const c = hexCentre(q, r), weight = Math.max(0, 1 - Math.hypot(x - c.x, z - c.z) / (METRES_PER_HEX * 1.28));
    if (!weight) continue;
    out[code] += weight; total += weight;
  }
  if (!total) return { BSh: 0, Csb: 0, Csa: 0, gala: false };
  return { BSh: out.BSh / total, Csb: out.Csb / total, Csa: out.Csa / total, gala: true };
}

/** 0 on the steppe, 1 on the coast: one number for the scatter to read the gradient off. */
export const galaSouthness = (x, z) => { const c = galaClimate(x, z); return c.gala ? c.Csb * .55 + c.Csa : 0; };

/**
 * The ground's colour by climate. The atlas's terrain field cannot tell the steppe from the
 * Mediterranean plain — it calls both `plains` — so the terrain tint asks this instead wherever
 * Gala's plains colour would have been used (src/world/terrain/world-terrain.js, `groundTint`). Buff and grey
 * on the steppe, tawny with olive in it in the middle, and the coast's own colour at the sea.
 */
export const GALA_GROUND = freeze({ BSh: 0xaa9b6b, Csb: 0x9c9a63, Csa: 0x979b62 });
export function galaGroundColour(x, z) {
  const c = galaClimate(x, z);
  if (!c.gala) return GALA_GROUND.Csb;
  const channel = shift => ((GALA_GROUND.BSh >> shift) & 255) * c.BSh + ((GALA_GROUND.Csb >> shift) & 255) * c.Csb + ((GALA_GROUND.Csa >> shift) & 255) * c.Csa;
  return (clamp(Math.round(channel(16)), 0, 255) << 16) | (clamp(Math.round(channel(8)), 0, 255) << 8) | clamp(Math.round(channel(0)), 0, 255);
}

// ---------------------------------------------------------------------------
// The seam with Northern Ascarth
// ---------------------------------------------------------------------------
/**
 * The contract both builders hold (docs/gala-brief.md, "Seam with Northern Ascarth"): the plains
 * and grassland profile of the hexes on the shared border is base 4.0 m, amplitude .6, wavelength
 * 320 (`REGION_TERRAIN.Gala`), neither branch writes ground outside its own hexes, and anything
 * shaped by hand stays at least `keep` metres inside its own hexes from the border.
 */
export const GALA_SEAM = freeze({ base: 4.0, amp: .6, wave: 320, keep: 100 });
/**
 * The eight shared edges, as the Gala hex and the Northern Ascarth hex on either side of each. The
 * survey the game bakes does not carry Northern Ascarth (it is not built here), so they are written
 * down, and the test reads the atlas export and holds this list to it edge for edge.
 */
export const GALA_SEAM_EDGES = freeze([
  [-7, 119, -7, 120], [-8, 120, -7, 120], [-8, 120, -8, 121], [-9, 121, -8, 121],
  [-9, 121, -9, 122], [-9, 121, -10, 122], [-10, 121, -10, 122], [-11, 122, -10, 122],
].map(edge => freeze(edge)));

const worldCorners = (q, r) => hexAtlasCorners(q, r).map(p => TRANSFORM.atlasToWorld(p.x, p.y));
/** The border itself, as eight segments in world metres: the two corners each pair of hexes shares. */
export const GALA_SEAM_LINE = freeze(GALA_SEAM_EDGES.map(([q, r, nq, nr]) => {
  const mine = worldCorners(q, r), theirs = worldCorners(nq, nr);
  const shared = mine.filter(p => theirs.some(o => Math.hypot(o.x - p.x, o.z - p.z) < 1e-3));
  if (shared.length !== 2) throw new Error(`Gala (${q},${r}) and (${nq},${nr}) share no edge`);
  return freeze({ a: point(shared[0].x, shared[0].z), b: point(shared[1].x, shared[1].z) });
}));

/** Metres from a point to the Gala–Northern Ascarth border. */
export function seamDistance(x, z) {
  let best = Infinity;
  for (const { a, b } of GALA_SEAM_LINE) {
    const dx = b.x - a.x, dz = b.z - a.z, t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
    best = Math.min(best, Math.hypot(x - a.x - dx * t, z - a.z - dz * t));
  }
  return best;
}
/** 0 inside the seam's keep, 1 once clear of it, over `feather` metres: every landform here is multiplied by it. */
export const seamGate = (x, z, feather = 60) => smooth(GALA_SEAM.keep, GALA_SEAM.keep + feather, seamDistance(x, z));

// ---------------------------------------------------------------------------
// The ground
// ---------------------------------------------------------------------------
/** Gala's hexes and a margin: outside it nothing in this file shapes anything. */
export const GALA_BOX = freeze((() => {
  const box = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const cell of REGION_CELLS.Gala ?? []) {
    box.minX = Math.min(box.minX, cell.x - 90); box.maxX = Math.max(box.maxX, cell.x + 90);
    box.minZ = Math.min(box.minZ, cell.z - 90); box.maxZ = Math.max(box.maxZ, cell.z + 90);
  }
  return box;
})());
export const inGalaBox = (x, z) => x >= GALA_BOX.minX && x <= GALA_BOX.maxX && z >= GALA_BOX.minZ && z <= GALA_BOX.maxZ;

/**
 * How much of a point is Gala's own to shape, by the ground blend's own weights, at the threshold
 * Meneth's ridges and Nethereum's hollow use: a point across a border still carries a share of
 * Gala, and a share of a four-metre rise is enough to lift somebody else's bank.
 */
export function galaShare(x, z) {
  if (!inGalaBox(x, z)) return 0;
  return smooth(.3, .8, terrainMix(x, z).weights.Gala ?? 0);
}

/**
 * **The steppe shoulder.** The atlas makes Gala one plain and puts the interior weather on its
 * northern half; the six-regions brief built it "from 12 m on the dry northern shoulder under
 * Ovesos and the Oves Desert down to 4 m on the southern coastal plain", and the seam contract
 * fixes the four. So the country is tilted, and only just: a rise of `height` metres that is all
 * there across the steppe rows, gone by the Mediterranean ones, leaning a little west because the
 * dry country is north and north-west of it.
 *
 * Eight metres on the shoulder rather than twelve, because of what the north-eastern corner meets:
 * Nesdor's flats at 7.2 m and Eer's inland shoulder at 7.4 m across the Lizeem, and the brief asks
 * for the fall between countries to be a metre or two where they meet. Twelve would have stood the
 * steppe five metres over the river's far bank; eight stands it within one.
 *
 * Three gates, each the house rule: the region's box, the region's blend, and the seam — the rise
 * is exactly nothing within a hundred metres of Northern Ascarth, and reaches its full height only
 * `feather` metres further in.
 */
export const GALA_RISE = freeze({ height: 4.2, southZ: 1290, meridian: -1600, lean: .25, span: 300, feather: 80 });
export function galaRise(x, z) {
  const share = galaShare(x, z);
  if (share <= 0) return 0;
  const R = GALA_RISE, u = (R.southZ - z) + R.lean * (R.meridian - x);
  if (u <= 0) return 0;
  return R.height * smooth(0, R.span, u) * share * seamGate(x, z, R.feather);
}

/**
 * **The dry wash.** The steppe's one watercourse, and it has no water in it: a bed of gravel a few
 * metres across between low cut banks, running south-east off the north-western shoulder and giving
 * out onto the plain where the Mediterranean rows begin — which is where the distributary rises, and
 * where the water that runs down it in the rains goes. "Seasonal water channels … active only during
 * and immediately after rainfall" is the Oves Desert's lore, one border over; the brief asks for it
 * here, and it is terrain, not water: nothing is drawn in it, and it wets nobody's feet.
 *
 * `floor` is the half-width of the flat gravel, `bank` the half-width of the cut at the top, `depth`
 * how far the floor lies below the plain. It deepens over its first `head` metres and fans out over
 * its last `foot`, as a wash does where it leaves its own ground.
 */
export const GALA_WASH = freeze({
  id: 'gala-wash', name: 'The Dry Wash', floor: 3.2, bank: 8, depth: 1.25, head: 35, foot: 55,
  points: freeze([point(-1768, 1052), point(-1748, 1082), point(-1728, 1112), point(-1711, 1142),
    point(-1694, 1170), point(-1678, 1196)]),
});
const WASH_LENGTH = (() => {
  let total = 0;
  for (let i = 1; i < GALA_WASH.points.length; i++) total += Math.hypot(GALA_WASH.points[i].x - GALA_WASH.points[i - 1].x, GALA_WASH.points[i].z - GALA_WASH.points[i - 1].z);
  return total;
})();
const WASH_REACH = GALA_WASH.bank + 2;
const WASH_BOUNDS = freeze((() => {
  const xs = GALA_WASH.points.map(p => p.x), zs = GALA_WASH.points.map(p => p.z);
  return { minX: Math.min(...xs) - WASH_REACH, maxX: Math.max(...xs) + WASH_REACH, minZ: Math.min(...zs) - WASH_REACH, maxZ: Math.max(...zs) + WASH_REACH };
})());
/** Distance to the wash's centre line and how far along it, in metres from its head. */
export function washPlace(x, z) {
  if (x < WASH_BOUNDS.minX || x > WASH_BOUNDS.maxX || z < WASH_BOUNDS.minZ || z > WASH_BOUNDS.maxZ) return null;
  let best = Infinity, along = 0, run = 0;
  for (let i = 1; i < GALA_WASH.points.length; i++) {
    const a = GALA_WASH.points[i - 1], b = GALA_WASH.points[i], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (length * length), 0, 1);
    const d = Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
    if (d < best) { best = d; along = run + t * length; }
    run += length;
  }
  return { distance: best, along, length: WASH_LENGTH };
}
/** How deep the wash is here, 0 outside it. Subtracted from the ground in `west-ground.js`. */
export function galaWash(x, z) {
  const place = washPlace(x, z);
  if (!place || place.distance >= GALA_WASH.bank) return 0;
  const W = GALA_WASH;
  const lengthwise = smooth(0, W.head, place.along) * (1 - smooth(place.length - W.foot, place.length, place.along));
  if (lengthwise <= 0) return 0;
  return W.depth * lengthwise * (1 - smooth(W.floor, W.bank, place.distance)) * seamGate(x, z);
}
/** On the wash's gravel floor, where it is deep enough to be one. */
export const onWashFloor = (x, z, margin = 0) => { const place = washPlace(x, z); return !!place && place.distance < GALA_WASH.floor + margin && galaWash(x, z) > .35; };

// ---------------------------------------------------------------------------
// The places
// ---------------------------------------------------------------------------
/** A point `inward` metres off a border river into Gala, at `fraction` of the way along it. */
function besideCourse(course, fraction, inward) {
  const s = course.samples[Math.round((course.samples.length - 1) * fraction)];
  for (const side of [1, -1]) {
    const x = s.x + s.nx * inward * side, z = s.z + s.nz * inward * side, c = hexAt(x, z);
    if (GALA_CLIMATE[`${c.q},${c.r}`]) return point(x, z);
  }
  return point(s.x, s.z);
}
const washMiddle = GALA_WASH.points[3];
const mouths = WEST_BRAIDS.find(braid => braid.id === 'gala-mouths');
const mouthsMiddle = (() => { const s = GALA_CHANNEL.samples[Math.round((GALA_CHANNEL.samples.length - 1) * (mouths.from + mouths.to) / 2)]; return point(s.x, s.z); })();

/**
 * Gala's natural places. The Oveth and the Lizeem are the lore's names; the rest are plain words
 * for plain things. There is no Galan naming profile in `azhoran_language_profiles.py` (Kellith,
 * Telemonia's tongue, lists Gala among its inspirations, but the lore makes Gala Mittoli-speaking),
 * so nothing here is coined.
 */
export const GALA_LANDMARKS = freeze([
  freeze({ id: 'gala-steppe', name: 'The Dry North', x: -1650, z: 1030,
    description: 'The interior weather, and not sheltered from it: bunch grass in tussocks with the bare ground showing between them, grey wormwood and saltbush where the soil thins, and a hot wind off the Oves Desert that has nothing to stop it. Grazed rather than farmed, the lore says. Nobody is grazing it.' }),
  freeze({ id: 'gala-wash', name: GALA_WASH.name, ...washMiddle,
    description: 'A bed of grey gravel between banks a man could step down, running south-east off the steppe shoulder and giving out on the plain below. It carries water for a few days after the winter rains and none at all the rest of the year, and it is the only watercourse on the steppe.' }),
  freeze({ id: 'oveth-ford', name: 'The Oveth Ford', ...besideCourse(OVETH_REACH, .18, 16),
    description: 'Where the Oveth comes down out of the dry country and narrows over rock, below the corner where Gala, Ovesos and the Oves Desert meet: shin-deep and quick, and the only place on this reach anybody crosses it. Below the ford it deepens toward the Lizeem and nobody does.' }),
  freeze({ id: 'lower-oveth', name: 'The Lower Oveth', ...besideCourse(OVETH_REACH, .82, 18),
    description: 'The last of the Oveth, dropping through its rocky lower section into the Lizeem approaches: deep, quick, cut down between steep banks, and not waded by anybody. The great river takes it a few hundred paces on.' }),
  freeze({ id: 'gala-maquis', name: 'The Maquis', x: -1700, z: 1245,
    description: 'Where the rain starts coming off the sea: tawny grass, low aromatic scrub knee to chest on every rise and never closed, and wild olive and fig standing singly a long way apart. Nobody planted any of it, and the lore’s grain, olives and figs are somebody’s farming, which is not here.' }),
  freeze({ id: 'gala-reed-bank', name: 'The Reed Bank', x: -1502, z: 1088,
    description: 'The Lizeem’s western bank below the Nesdor bend: reed and tamarisk along the water and the whole of the great river going by, wide and grey and too deep to cross. Eer is the far bank, and there is no way to it from here.' }),
  freeze({ id: 'gala-mouths', name: 'The Braided Mouths', ...mouthsMiddle,
    description: 'The plain’s own water coming down to the sea: one slow channel splitting into three round low bars of sand, reed and tamarisk thick along all of them, and the black geese on the widest of the water. The Lizeem’s distributaries, the lore calls them; the river itself goes out to sea a few hundred paces east, in country that is not Gala.' }),
  freeze({ id: 'gala-shore', name: 'The Galan Shore', x: -1745, z: 1432,
    description: 'Gala’s whole coast, and it is short: a few hundred paces of low sand between the Treloss’s mouth and the Ascarth ground, the Iberos Sea in front and dolphins out past the break. The harbour the lore gives the city of Gala is somewhere else, and is somebody’s.' }),
]);

/** Whether scatter should keep off a point for Gala's own reasons: the wash's floor. Water is `westBareGround`'s. */
export const galaClear = (x, z, margin = 0) => onWashFloor(x, z, margin);
