/**
 * Ovesos and the Oves Desert: the middle Oveth and the rain shadow behind it, as ground, climate and
 * named natural places.
 *
 * Pure: no three, no DOM. `src/west-ground.js` puts the landforms here into the ground (`ovesGround`)
 * in the same sum as Caricas's shelf, Nethereum's hollow and Gala's steppe rise, so the water that
 * runs through them reads the ground it is cut in; `src/west-regions.js` declares the Oveth's upper
 * course with the rest of the west's; `src/oves-scenery.js` draws what grows, and
 * `src/oves-wildlife.js` places what lives there. The tests, the chart and the terrain tint read the
 * same numbers.
 *
 * Authored directly in **world metres** (100 m per authored hex), like every country since Pueth.
 *
 * **Two countries in one module, because the atlas gives them one border and one basin.** They share
 * thirteen hex edges, seven of which are the Oveth, and the lore's boundary between them is a lawsuit
 * rather than a line on the ground — "the rain shadow's position shifts slightly on a decadal cycle
 * … the 'true' boundary is not a fixed line but a zone that moves back and forth across a band of
 * several miles". One module lays both, continuously, so that seam has nothing in it to see.
 *
 * **There is no climate gradient here at all, and that is the atlas's own word.** Read per hex from
 * the World Builder map (`azhora.wwmap`, `hexes[key].climate`, `koppen-v1`), **Ovesos is `BSh` on all
 * nineteen of its hexes and the Oves Desert is `BSh` on all twenty-three of its** — hot semi-arid
 * steppe, every row of both. Gala next door is three bands and the Ascarths two; these two are one
 * climate, and the whole difference between them is **terrain and water**:
 *
 *  - **Ovesos has the river.** The Oveth runs its entire south-western border, and along it lies the
 *    Sorten, the bench of bottomland the country is named for (`OVES_SORTEN`). Above it the atlas
 *    gives eight `grassland` hexes over the northern two rows and eleven `plains` over the southern
 *    three, so the country is a tilt from upland grass at 16 m to the river's floor at 10.
 *  - **The Oves Desert has the hills and no permanent water.** Twenty `plains` hexes falling the
 *    length of a wedge to its eastern apex, where the Oveth and the Caelin come
 *    together (`ovesBasin`); three `hills` hexes on the north-western rim, which is exactly where the
 *    lore puts the ridge the whole rain shadow depends on (`ovesRim`); a short, hard, broken stone
 *    relief that a sine wave of the world's own wavelength cannot draw (`ovesStone`); and four
 *    channels with **no water in any of them** (`OVES_CHANNELS`), which is what "the surface drainage
 *    is intermittent; the seasonal water channels … are active only during and immediately after
 *    rainfall events" comes to on ground that has no seasons yet.
 *
 * **It is built as the dry year**, which is what the classification means and what the lore says in
 * as many words. The wet-year face — "annual grasses and forbs that exist as seed banks through the
 * dry years germinate in large numbers" — is what a season would bring, and there are no seasons;
 * what is drawn instead is the seed-bank stubble where that flush would be.
 *
 * Everything the two lore files are otherwise about is somebody's and none of it is built: the Water
 * Council and every water right in it, the five branch countries, the Branch Court and the Branch
 * Compact, King Melos and the house Oveth-Hold, the Middle Reach dispute, the market towns, the
 * mills, the irrigated bottomland grain, the Sorten's grazing rights, the Telemon bands' routes and
 * the wells and watering points on them.
 *
 * **The green belt (the user's ruling of 5 October 2026; built 6 October 2026).** Ovesos is fertile
 * along the river and dries toward the desert in the south and west: the least productive of the
 * four farm countries of the Lizeem, but real farm country. That supersedes the ruling of 21
 * September that it was green only along the Oveth. The atlas is not changed by it — every hex is
 * still `BSh` and nothing here reads a climate — so the gradient is **distance from water**: a belt
 * of denser, greener grass with poplar, willow and tamarisk along the Lizeem and, narrower, along the
 * Neth (`ovesosBelt`), thinning to the old bunch grass, wormwood and saltbush toward the south-west.
 * The belt is widest on the Lizeem's northern reach, where the river runs a metre or two under the
 * plain, and narrows southward below the Carica's fall, where the Lizeem has cut four metres down
 * and the plain beside it stands high and dry. The Sorten keeps its own green on the Oveth. The Water
 * Council's village of Velsorten and its canal are src/ovesos-farm.js's, built on this ground; the
 * rest of the list above is still nobody's.
 */
import { hexAtlasCorners, TRANSFORM, terrainMix, hexCentre, hexOwnerAt, REGION_CELLS, REGION_TERRAIN } from './region-world.js';
import { LIZEEM, NETH, OVETH_UPPER, courseDistance } from './west-regions.js';

const freeze = Object.freeze;
const point = (x, z) => freeze({ x, z });
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const smooth = (a, b, x) => { const v = clamp((x - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); };
const TAU = Math.PI * 2;

export const OVES_REGIONS = freeze(['Ovesos', 'Oves Desert']);

// ---------------------------------------------------------------------------
// The atlas's climate, which is one code twice over
// ---------------------------------------------------------------------------
/**
 * What the World Builder map paints on every hex of both countries. The dev export drops the field,
 * so it is written out here and `tests/oves-world.test.js` holds it to the map hex for hex whenever
 * the map is on the machine to ask.
 *
 * Nineteen and twenty-three entries, and one code: `BSh`. For context, the whole of this quarter of
 * the continent reads the same — Telemonia `BSh` × 23 with two `Csb`, the Nether Desert `BSh` × 26,
 * East Pyros `BSh` × 29 — so there is nothing to draw a band with and no band is drawn. Where a
 * region's own climate is uniform there is no `<region>Climate` blend function either, because a
 * blend of one code is the code.
 */
export const OVESOS_CLIMATE = freeze({
  '-11,112': 'BSh', '-10,112': 'BSh', '-9,112': 'BSh', '-8,112': 'BSh',
  '-12,113': 'BSh', '-11,113': 'BSh', '-10,113': 'BSh', '-9,113': 'BSh', '-8,113': 'BSh',
  '-12,114': 'BSh', '-11,114': 'BSh', '-10,114': 'BSh', '-9,114': 'BSh', '-8,114': 'BSh',
  '-10,115': 'BSh', '-9,115': 'BSh', '-8,115': 'BSh',
  '-9,116': 'BSh', '-8,116': 'BSh',
});
export const OVES_DESERT_CLIMATE = freeze({
  '-14,114': 'BSh', '-13,114': 'BSh',
  '-15,115': 'BSh', '-14,115': 'BSh', '-13,115': 'BSh', '-12,115': 'BSh', '-11,115': 'BSh',
  '-16,116': 'BSh', '-15,116': 'BSh', '-14,116': 'BSh', '-13,116': 'BSh', '-12,116': 'BSh', '-11,116': 'BSh', '-10,116': 'BSh',
  '-16,117': 'BSh', '-15,117': 'BSh', '-14,117': 'BSh', '-13,117': 'BSh', '-12,117': 'BSh', '-11,117': 'BSh', '-10,117': 'BSh',
  '-16,118': 'BSh', '-15,118': 'BSh',
});
export const OVES_CLIMATE = freeze({ ...OVESOS_CLIMATE, ...OVES_DESERT_CLIMATE });
/** The one code. Anything that asks what the weather is here gets this and nothing else. */
export const OVES_KOPPEN = 'BSh';

// ---------------------------------------------------------------------------
// The seam with Gala
// ---------------------------------------------------------------------------
/**
 * Gala is built, and it is the one built neighbour either of these countries touches on dry-ish
 * ground rather than across a wall of river. The contract (docs/oves-brief.md) is Gala's own: its
 * plains and grassland profile is base 4.0, amplitude .6, wavelength 320, its steppe rows stand
 * about 4.2 m higher than that by `galaRise`, and its measured steppe average is 7.5 m. So this
 * builder meets it within a metre or two on the five shared edges and **writes no ground inside
 * Gala's hexes**: every landform in this file is multiplied by `galaGate`, which is exactly nothing
 * within `keep` metres of the border.
 *
 * The exception is the Oveth itself, and it is not an exception anybody can avoid: the atlas draws
 * the river **on** the Ovesos|Gala line, so its channel is cut in both countries by definition. It
 * is the river's cut and it is older than either name, which is the same allowance
 * `tests/gala-world.test.js` already makes for the Lizeem's.
 */
export const OVES_SEAM = freeze({ base: 4.0, amp: .6, wave: 320, keep: 100 });

const AXIAL = freeze([[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]]);
const worldCorners = (q, r) => hexAtlasCorners(q, r).map(p => TRANSFORM.atlasToWorld(p.x, p.y));
const sharedCorners = (q, r, nq, nr) => {
  const mine = worldCorners(q, r), theirs = worldCorners(nq, nr);
  return mine.filter(p => theirs.some(o => Math.hypot(o.x - p.x, o.z - p.z) < 1e-3));
};

/**
 * The hex edges these two countries share with Gala, read off the survey rather than written down:
 * Gala is registered, so `hexOwnerAt` can be asked. Three on Ovesos's side and two on the desert's,
 * which is what the atlas gives (docs/oves-brief.md).
 */
export const OVES_GALA_EDGES = freeze(OVES_REGIONS.flatMap(name => (REGION_CELLS[name] ?? []).flatMap(cell =>
  AXIAL.map(([dq, dr]) => [cell.q + dq, cell.r + dr])
    .filter(([q, r]) => { const c = hexCentre(q, r); return hexOwnerAt(c.x, c.z) === 'Gala'; })
    .map(([q, r]) => freeze([cell.q, cell.r, q, r])))));

/** The border itself, as segments in world metres: the two corners each pair of hexes shares. */
export const OVES_GALA_LINE = freeze(OVES_GALA_EDGES.map(([q, r, nq, nr]) => {
  const shared = sharedCorners(q, r, nq, nr);
  if (shared.length !== 2) throw new Error(`(${q},${r}) and Gala's (${nq},${nr}) share no edge`);
  return freeze({ a: point(shared[0].x, shared[0].z), b: point(shared[1].x, shared[1].z) });
}));

const segmentDistance = (lines, x, z) => {
  let best = Infinity;
  for (const { a, b } of lines) {
    const dx = b.x - a.x, dz = b.z - a.z, t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
    best = Math.min(best, Math.hypot(x - a.x - dx * t, z - a.z - dz * t));
  }
  return best;
};
/** Metres from a point to the Gala border. */
export const galaSeamDistance = (x, z) => segmentDistance(OVES_GALA_LINE, x, z);
/** 0 inside the seam's keep, 1 once clear of it: every landform here is multiplied by it. */
export const galaGate = (x, z, feather = 60) => smooth(OVES_SEAM.keep, OVES_SEAM.keep + feather, galaSeamDistance(x, z));

// ---------------------------------------------------------------------------
// The two boxes, and how much of a point belongs to each country
// ---------------------------------------------------------------------------
const boxOf = name => {
  const box = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const cell of REGION_CELLS[name] ?? []) {
    box.minX = Math.min(box.minX, cell.x - 95); box.maxX = Math.max(box.maxX, cell.x + 95);
    box.minZ = Math.min(box.minZ, cell.z - 95); box.maxZ = Math.max(box.maxZ, cell.z + 95);
  }
  return freeze(box);
};
export const OVESOS_BOX = boxOf('Ovesos');
export const OVES_DESERT_BOX = boxOf('Oves Desert');
/** Both countries and a margin: outside it nothing in this file shapes anything. */
export const OVES_BOX = freeze({
  minX: Math.min(OVESOS_BOX.minX, OVES_DESERT_BOX.minX), maxX: Math.max(OVESOS_BOX.maxX, OVES_DESERT_BOX.maxX),
  minZ: Math.min(OVESOS_BOX.minZ, OVES_DESERT_BOX.minZ), maxZ: Math.max(OVESOS_BOX.maxZ, OVES_DESERT_BOX.maxZ),
});
const inBox = (box, x, z) => x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ;
export const inOvesBox = (x, z) => inBox(OVES_BOX, x, z);

/**
 * How much of a point is a country's own to shape, by the ground blend's own weights, at the
 * threshold Meneth's ridges, Nethereum's hollow and Gala's rise all use: a point on the far side of
 * a border still carries a quarter of the country behind it, and a quarter of a twelve-metre basin
 * tilt is enough to lift somebody else's riverbank by three.
 */
function shareOf(name, box, x, z) {
  if (!inBox(box, x, z)) return 0;
  return smooth(.3, .8, terrainMix(x, z).weights[name] ?? 0);
}
export const ovesosShare = (x, z) => shareOf('Ovesos', OVESOS_BOX, x, z);
export const desertShare = (x, z) => shareOf('Oves Desert', OVES_DESERT_BOX, x, z);
/**
 * Both countries' raw blend weights in one hex blend rather than two, for the ground, which wants
 * them at every point of the west. `sorten` is the same weight at a lower threshold: the Sorten's
 * bench reaches the water's own edge, where the blend is half Ovesos and half the desert, and a
 * landform that needed three-tenths of the country would stop short of the river it belongs to.
 */
function ovesWeights(x, z) {
  const weights = terrainMix(x, z).weights;
  const own = weights.Ovesos ?? 0, far = weights['Oves Desert'] ?? 0;
  return { raw: own + far, ovesos: smooth(.3, .8, own), desert: smooth(.3, .8, far), sorten: smooth(.12, .5, own) };
}

// ---------------------------------------------------------------------------
// Ovesos: the Sorten
// ---------------------------------------------------------------------------
/**
 * **The Sorten** — "a stretch of bottomland the people of the region call the Sorten, 'the wide
 * seat' … roughly twelve miles of valley floor where the Oveth slows, widens, and deposits what it
 * has carried from the upland". It is the one landform Ovesos has, it is the thing the country is
 * named after (*oves-*: "lower valley, the wide place where hill country flattens into cultivable
 * ground"), and the atlas puts it where the river is: along the south-western border and not through
 * the middle of the country, which is one of this build's lore adjustments.
 *
 * Built as a bench rather than a valley: the ground within `reach` metres of the Oveth's line lies
 * `depth` metres below the plain, with the fall spread over the outer half of that, so the gradient
 * is about one in a hundred and nothing about it is a bank. A river that deposits does it on one
 * bank, so the bench is **Ovesos's side only** — the desert margin across the water keeps its own
 * height, and the valley is asymmetric, which is what a depositing river actually leaves.
 *
 * It is the river's **middle** reach and not the whole of it, `from` to `to` along the course, and
 * both ends of that are load-bearing. The lore says "below the Sorten it narrows, drops through a
 * rocky lower section": the lower end is Gala's reach, and stopping short of it keeps the bench out
 * of the hundred metres this builder promised Gala and keeps the Oveth's hand-over level where Gala
 * built its own reach to meet it. The upper end is where the river is still small.
 */
export const OVES_SORTEN = freeze({ reach: 155, depth: .95, inner: .5, onto: 34, from: .16, to: .84 });

/**
 * **Where the Oveth's deep water gives out.** The upper reach is waded for its first third and deep
 * from there (`OVETH_UPPER.fordUntil`), and the reach below it — Gala's — is waded again over rock
 * for its first two-fifths, because "below the Sorten it narrows, drops through a rocky lower
 * section". Those two things meet at the corner where Ovesos, the Oves Desert and Gala have a corner,
 * and a wall of deep water butted against somebody else's ford is not a river: it is a wall with a
 * gate in it. So the deep water stops `to` of the way down and the last twenty-five metres of the
 * Sorten narrows over the same rock Gala's ford is on, which is where the two builders' fords meet.
 *
 * `river()` takes one `fordUntil` and cannot say "ford, deep, ford", so this is the scenery's
 * business (`src/oves-scenery.js` lays the wall) and the test reads the same number.
 */
export const OVETH_WALL = freeze({ from: OVETH_UPPER.fordUntil, to: .94 });

/** The nearest sample of the upper Oveth, with its index, so the normal and the along come together. */
function ovethAt(x, z) {
  const samples = OVETH_UPPER.samples;
  let best = 0, bestDistance = Infinity;
  for (let i = 0; i < samples.length; i++) {
    const d = (samples[i].x - x) ** 2 + (samples[i].z - z) ** 2;
    if (d < bestDistance) { bestDistance = d; best = i; }
  }
  return { sample: samples[best], along: samples.length < 2 ? 0 : best / (samples.length - 1) };
}
/**
 * Which way the course's own normal points into Ovesos. The Oveth keeps Ovesos on its northern and
 * eastern side for the whole of this reach, so one sign answers for all of it; it is read off the
 * survey at a middle sample rather than assumed, because a softened course's normals are the
 * polyline's and nobody should have to know which way round `resample` wrote them.
 */
const OVESOS_SIDE = (() => {
  const s = OVETH_UPPER.samples[Math.round(OVETH_UPPER.samples.length * .5)];
  for (const side of [1, -1]) if (hexOwnerAt(s.x + s.nx * 45 * side, s.z + s.nz * 45 * side) === 'Ovesos') return side;
  return 1;
})();

export function ovesSorten(x, z, gate = galaGate(x, z), own = null) {
  const S = OVES_SORTEN;
  if (!inBox(OVESOS_BOX, x, z) || gate <= 0) return 0;
  const distance = courseDistance(OVETH_UPPER, x, z, S.reach + 8);
  if (distance >= S.reach) return 0;
  const { sample, along } = ovethAt(x, z);
  const lengthwise = smooth(S.from, S.from + .10, along) * (1 - smooth(S.to - .10, S.to, along));
  if (lengthwise <= 0) return 0;
  // A depositing river leaves its bench on one bank. `across` is signed by the course's own normal,
  // so the bench climbs out of the water onto Ovesos over `onto` metres and is nothing at all on the
  // desert's bank — which is why the valley here is lop-sided, and why the river's own water level,
  // measured on its centre line, hardly feels the bench at all.
  const across = ((x - sample.x) * sample.nx + (z - sample.z) * sample.nz) * OVESOS_SIDE;
  const bank = smooth(-8, S.onto, across);
  if (bank <= 0) return 0;
  const bench = 1 - smooth(S.reach * S.inner, S.reach, distance);
  const share = own === null ? smooth(.12, .5, terrainMix(x, z).weights.Ovesos ?? 0) : own;
  return S.depth * bench * lengthwise * bank * share * gate;
}
/** On the Sorten's floor: the flat bottomland, for the scatter and the chart. */
export const onSorten = (x, z) => ovesSorten(x, z) > OVES_SORTEN.depth * .55;

// ---------------------------------------------------------------------------
// The Oves Desert: the basin, the rim, and the stone
// ---------------------------------------------------------------------------
/**
 * **The basin.** "It occupies a wedge of the Oveth basin's … section, perhaps fifteen miles at its
 * widest, running … from the hill junction." On the atlas that wedge has its apex in the **east**,
 * at the corner where the Oveth and the Caelin come together at (-1800, 953), and it
 * opens westward to the rim hills. So the country's floor falls the length of it, from the rim down
 * to that corner, which is also the only direction its water could ever go: "the seasonal water
 * channels that cross the Oves" run down this tilt and the channels below are laid on it.
 *
 * `rise` metres over `span` of westing, with a little northing in it (`lean`) because the rim is on
 * the north-western side and the apex on the south-eastern. Gated by the country's own blend and by
 * the Gala seam, as every western landform is — so it is nothing at all in Ovesos across the river,
 * nothing in Gala, and nothing in the unbuilt outland of Telemonia, East Pyros and the Nether
 * Desert, which will settle it further when they are built.
 */
export const OVES_BASIN = freeze({ rise: 9, apexX: -1840, apexZ: 995, span: 560, lean: .16 });
export function ovesBasin(x, z, own = desertShare(x, z), gate = galaGate(x, z)) {
  if (own <= 0 || gate <= 0) return 0;
  const B = OVES_BASIN, u = (B.apexX - x) + B.lean * (B.apexZ - z);
  if (u <= 0) return 0;
  return B.rise * smooth(0, B.span, u) * own * gate;
}

/**
 * **The rim hills.** "The hills along the desert's own north-western rim run roughly north to south,
 * low by continental standards but high enough to intercept the moisture from the westerly weather
 * systems." The atlas gives the country exactly three `hills` hexes and puts them exactly there —
 * (-14,114), (-15,115) and (-16,116), a line down the western side stepping one hex west for every
 * hex south, so the ridge runs north-east to south-west rather than due north to south. The atlas
 * wins; the lore is adjusted to the lean.
 *
 * Three broad crests, one on each hex, taken as a **maximum** rather than a sum: overlapping domes
 * summed would stand the saddles higher than the tops, where a maximum leaves a broad-backed ridge
 * with shallow dips between the summits, which is what a worn low range is. The flanks are about one
 * in four at their steepest — a traveler walks up any of them — and nothing is a cliff.
 *
 * Each crest is well inside its own hex, so the country's own blend gate has the field at nothing
 * before East Pyros on the far side and the Nether Desert to the north; the moisture gradient the
 * lore makes so much of is across this ridge, and the far side of it is not built.
 */
export const OVES_RIM = freeze({
  crests: freeze([
    freeze({ id: 'rim-north', x: -2400, z: 726, height: 12, radius: 118, inner: .3 }),
    freeze({ id: 'rim-middle', x: -2452, z: 808, height: 13.5, radius: 122, inner: .3 }),
    freeze({ id: 'rim-south', x: -2498, z: 891, height: 11, radius: 118, inner: .3 }),
  ]),
});
export function ovesRim(x, z, own = desertShare(x, z), gate = galaGate(x, z)) {
  if (own <= 0 || gate <= 0) return 0;
  let height = 0;
  for (const crest of OVES_RIM.crests) {
    const distance = Math.hypot(x - crest.x, z - crest.z);
    if (distance >= crest.radius) continue;
    height = Math.max(height, crest.height * (1 - smooth(crest.radius * crest.inner, crest.radius, distance)));
  }
  return height ? height * own * gate : 0;
}
/** How high a point stands on the rim, 0 off it and 1 on a summit: the scatter reads it. */
export const onRim = (x, z) => clamp(ovesRim(x, z) / OVES_RIM.crests[1].height, 0, 1);

/**
 * **The stone.** "The terrain is rocky rather than sandy: exposed formations of the sedimentary
 * series underlying the inner-branch country, worn smooth by older water action than the current
 * drainage system represents, covered in a thin, poor soil that accumulates in the lower-gradient
 * sections and is absent on the ridge exposures."
 *
 * That is not a sine wave of the world's own three hundred and twenty metres, and it is the one
 * thing about this country that had to be built rather than set. It is a short, low, knobbly field —
 * two waves of about forty and sixty metres on **two turned bearings**, so that seen from the rim it
 * reads as broken ground and not as corrugation, which is the mistake the Ascarth plateau made once
 * and fixed.
 *
 * **It is not the region's `wave`.** Every profile in these two countries is on Gala's 320 on
 * purpose: the blend mixes wavelengths, and a margin where the wavelength changes chirps into short
 * steep ribs, which is what Gala measured at x ≈ -1900 against `outland`'s 150. The desert's own
 * roughness is therefore a landform gated by the country's blend, which fades out over a hundred
 * metres at every border instead of changing the phase of the world.
 *
 * `ovesLie` reads the same field back: 1 on an exposure where there is no soil, 0 in a low-gradient
 * pocket where the soil accumulates and the scrub is.
 */
export const OVES_STONE = freeze({ amp: 1.05, waveA: 39, waveB: 61, bearingA: .58, bearingB: -1.12, mixA: .6 });
function stoneField(x, z) {
  const S = OVES_STONE;
  const a = Math.sin((x * Math.cos(S.bearingA) + z * Math.sin(S.bearingA)) / S.waveA * TAU);
  const b = Math.sin((x * Math.cos(S.bearingB) + z * Math.sin(S.bearingB)) / S.waveB * TAU);
  return a * S.mixA + b * (1 - S.mixA);
}
export function ovesStone(x, z, own = desertShare(x, z), gate = galaGate(x, z)) {
  if (own <= 0 || gate <= 0) return 0;
  return OVES_STONE.amp * stoneField(x, z) * own * gate;
}
/** Where the rock is up and the soil is not, 0 to 1. Off the desert it is half, which is neither. */
export function ovesLie(x, z) {
  if (desertShare(x, z) <= 0) return .5;
  return clamp(stoneField(x, z) * .5 + .5, 0, 1);
}

// ---------------------------------------------------------------------------
// The channels, and there is no water in any of them
// ---------------------------------------------------------------------------
/**
 * **Dry channels.** "The surface drainage is intermittent; the seasonal water channels that cross
 * the Oves are active only during and immediately after rainfall events, which are themselves
 * irregular." So these are real cut beds with coarse gravel and boulders on their floors and
 * **nothing in them**: no water surface, no ribbon, no reed, and a traveler walks down the middle of
 * any of them. Gala's dry wash on the steppe one border over is the same machinery and the same idea;
 * these are its four cousins on the ground the idea came from.
 *
 * Three run in the desert, from the feet of the rim hills east-south-east down the basin's tilt
 * toward the Oveth, and each stops short of the river rather than joining it — a channel that only
 * runs after rain does not keep a mouth open. The fourth is **Ovesos's**, off the shoulder of the
 * grassland rows down to the Sorten, because a steppe drains to its one river the same way.
 *
 * `floor` is the half-width of the flat gravel, `bank` the half-width of the cut at the top, `depth`
 * how far the floor lies below the ground beside it. Each deepens over its first `head` metres and
 * fans out over its last `foot`, as a wash does where it leaves its own ground.
 */
const channel = (id, name, region, points, spec) => freeze({
  id, name, region, points: freeze(points.map(p => point(p.x, p.z))),
  floor: 3.4, bank: 9.5, depth: 1.35, head: 40, foot: 60, ...spec,
});
export const OVES_CHANNELS = freeze([
  channel('oves-north-channel', 'The North Channel', 'Oves Desert', [
    point(-2352, 745), point(-2288, 762), point(-2222, 782), point(-2160, 802), point(-2110, 820),
  ], { depth: 1.45 }),
  channel('oves-middle-channel', 'The Middle Channel', 'Oves Desert', [
    point(-2404, 836), point(-2338, 856), point(-2268, 874), point(-2196, 890), point(-2130, 904), point(-2072, 916),
  ], { depth: 1.55, bank: 10.5, floor: 3.8 }),
  channel('oves-south-channel', 'The South Channel', 'Oves Desert', [
    point(-2452, 924), point(-2386, 948), point(-2314, 968), point(-2246, 984), point(-2192, 996),
  ], { depth: 1.3 }),
  channel('oveth-gully', 'The Dry Gully', 'Ovesos', [
    point(-1962, 688), point(-1952, 724), point(-1946, 758), point(-1948, 786), point(-1952, 806),
  ], { depth: 1.1, bank: 8, floor: 2.8, head: 30, foot: 40 }),
]);

const channelMetrics = freeze(new Map(OVES_CHANNELS.map(ch => {
  let length = 0;
  for (let i = 1; i < ch.points.length; i++) length += Math.hypot(ch.points[i].x - ch.points[i - 1].x, ch.points[i].z - ch.points[i - 1].z);
  const reach = ch.bank + 3;
  const xs = ch.points.map(p => p.x), zs = ch.points.map(p => p.z);
  return [ch.id, freeze({ length, reach,
    bounds: freeze({ minX: Math.min(...xs) - reach, maxX: Math.max(...xs) + reach, minZ: Math.min(...zs) - reach, maxZ: Math.max(...zs) + reach }) })];
})));
export const channelLength = id => channelMetrics.get(id).length;

/** Distance to a channel's centre line and how far along it, in metres from its head, or null. */
export function channelPlace(ch, x, z) {
  const m = channelMetrics.get(ch.id), b = m.bounds;
  if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) return null;
  let best = Infinity, along = 0, run = 0;
  for (let i = 1; i < ch.points.length; i++) {
    const a = ch.points[i - 1], c = ch.points[i], dx = c.x - a.x, dz = c.z - a.z, length = Math.hypot(dx, dz);
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (length * length), 0, 1);
    const d = Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
    if (d < best) { best = d; along = run + t * length; }
    run += length;
  }
  return { channel: ch, distance: best, along, length: m.length };
}
/** The nearest channel to a point, or null. */
export function nearestChannel(x, z) {
  let best = null;
  for (const ch of OVES_CHANNELS) {
    const place = channelPlace(ch, x, z);
    if (place && (!best || place.distance < best.distance)) best = place;
  }
  return best;
}
/** How deep a channel is cut here, 0 outside them all. Subtracted from the ground. */
export function ovesChannelCut(x, z, shares = null, gate = null) {
  let cut = 0;
  for (const ch of OVES_CHANNELS) {
    const place = channelPlace(ch, x, z);
    if (!place || place.distance >= ch.bank) continue;
    const lengthwise = smooth(0, ch.head, place.along) * (1 - smooth(place.length - ch.foot, place.length, place.along));
    if (lengthwise <= 0) continue;
    const desert = ch.region === 'Oves Desert';
    const own = shares ? (desert ? shares.desert : shares.ovesos) : (desert ? desertShare(x, z) : ovesosShare(x, z));
    if (own <= 0) continue;
    const keep = gate === null ? galaGate(x, z) : gate;
    if (keep <= 0) continue;
    cut = Math.max(cut, ch.depth * lengthwise * (1 - smooth(ch.floor, ch.bank, place.distance)) * own * keep);
  }
  return cut;
}
/** On a channel's gravel floor, where it is deep enough to be one. */
export function onChannelFloor(x, z, margin = 0) {
  const place = nearestChannel(x, z);
  return !!place && place.distance < place.channel.floor + margin && ovesChannelCut(x, z) > .35;
}

/**
 * **The damp reach.** The lore's one exception to a country with no water: "the primary springs, the
 * deeper wells, **the channel sections that retain subsurface flow**". The wells are somebody's and
 * the springs are where their watering points are, so what is built is the third thing — a stretch of
 * the Middle Channel's floor where the gravel holds water below the surface and nothing above it.
 * There is no water surface here and nothing to drink; what there is, is the only green in the
 * country, a hundred metres of scrub and two or three tamarisk standing in a dry bed.
 */
export const OVES_DAMP = freeze({ channel: 'oves-middle-channel', from: 132, to: 244, reach: 16 });
export function dampReach(x, z) {
  const ch = OVES_CHANNELS.find(c => c.id === OVES_DAMP.channel);
  const place = channelPlace(ch, x, z);
  if (!place || place.distance >= OVES_DAMP.reach) return 0;
  const along = smooth(OVES_DAMP.from - 24, OVES_DAMP.from + 10, place.along) * (1 - smooth(OVES_DAMP.to - 10, OVES_DAMP.to + 24, place.along));
  return along * (1 - smooth(OVES_DAMP.reach * .4, OVES_DAMP.reach, place.distance));
}

// ---------------------------------------------------------------------------
// The whole of it, for the ground
// ---------------------------------------------------------------------------
/**
 * Everything this module adds to or takes out of the ground, in one number, the way
 * `galaRise(x, z) - galaWash(x, z)` is one term of `west-ground.js`'s sum. Two comparisons reject
 * the rest of Azhora.
 *
 * The order inside it does not matter — they are added — but which of them is which does: the basin
 * tilt and the rim stand the desert up, the stone field roughens it, the Sorten's bench and the
 * channels' cuts take ground away, and the channels are cut into whatever the others leave, so a
 * channel on the tilt runs downhill with it.
 */
export function ovesGround(x, z) {
  if (!inOvesBox(x, z)) return 0;
  // The two region shares and the Gala gate are each one of the more expensive things the ground
  // asks anybody (a hex blend and five segment distances), and five landforms want the same three
  // numbers, so they are worked out once here and handed down.
  const gate = galaGate(x, z);
  if (gate <= 0) return 0;
  const shares = ovesWeights(x, z);
  if (shares.raw <= 0) return 0;
  return ovesBasin(x, z, shares.desert, gate) + ovesRim(x, z, shares.desert, gate) + ovesStone(x, z, shares.desert, gate)
    - ovesSorten(x, z, gate, shares.sorten) - ovesChannelCut(x, z, shares, gate);
}

/** Whether the scatter must keep off a point for these countries' own reasons: a channel's floor. */
export const ovesClear = (x, z, margin = 0) => onChannelFloor(x, z, margin);

// ---------------------------------------------------------------------------
// The green belt along the Lizeem and the Neth
// ---------------------------------------------------------------------------
/**
 * **How green Ovesos's ground is, by its distance from the water** (the user's ruling of 5 October 2026):
 * 1 within `full` metres of a river's middle, nothing past `dry`, and a smooth fall between. The
 * Lizeem's belt is the broad one, and it narrows from `north` to `south`: on the northern reach the
 * river runs a metre or two under the plain and the ground beside it is watered for a hundred and
 * sixty metres; below the Carica's fall the Lizeem has cut down four metres and the plain beside it
 * is dry at a hundred and twenty. The Neth is a smaller water and its belt is narrower. Nothing here
 * is a climate — every hex is `BSh` — and the south-west of the country, farthest from both rivers,
 * is the old steppe exactly as it was.
 */
export const OVESOS_BELT = freeze({
  lizeem: freeze({ full: 45, dry: 165, fullSouth: 30, drySouth: 120 }),
  neth: freeze({ full: 22, dry: 100 }),
  north: 560, south: 900,
});
/** 0 to 1: how much of the river belt a point of Ovesos is in. Nothing outside the country's box. */
export function ovesosBelt(x, z) {
  if (!inBox(OVESOS_BOX, x, z)) return 0;
  const B = OVESOS_BELT, south = smooth(B.north, B.south, z);
  const full = B.lizeem.full + (B.lizeem.fullSouth - B.lizeem.full) * south, dry = B.lizeem.dry + (B.lizeem.drySouth - B.lizeem.dry) * south;
  const lizeem = 1 - smooth(full, dry, courseDistance(LIZEEM, x, z, dry + 5));
  if (lizeem >= 1) return 1;
  return Math.max(lizeem, 1 - smooth(B.neth.full, B.neth.dry, courseDistance(NETH, x, z, B.neth.dry + 5)));
}

// ---------------------------------------------------------------------------
// The colour of the ground
// ---------------------------------------------------------------------------
/**
 * Two grounds the atlas's terrain field cannot colour, for the same reason Gala's plains could not be
 * coloured by it: the field says `plains` and means two different things.
 *
 * In **Ovesos** it means the open steppe and the Sorten's bottomland, and the difference between them
 * is the whole of what the river did — the bench is greener than the plain above it, and it is
 * forty metres wide where the hex it is in is a hundred. Since the ruling of 5 October 2026 the
 * river belt (`ovesosBelt`) greens both of Ovesos's grounds, the northern grassland's as well as the
 * plains', from the Lizeem's and the Neth's banks outward, and the Sorten's green lies over that.
 *
 * In the **Oves Desert** it means the low-gradient pockets where "a thin, poor soil … accumulates"
 * and the exposures where it "is absent", and that alternation is the country's face; it changes over
 * forty metres (`OVES_STONE.waveA`), which no count per hex can say. `ovesLie` decides, so the
 * pavement the scenery lays on the exposures stands on ground that is already the colour of stone.
 *
 * Hooked into `groundTint` (src/world-terrain.js) for these two grounds only; everywhere else it
 * answers null and nothing changes.
 */
export const OVES_GROUND = freeze({
  steppe: 0xa8a06a,   // Ovesos's plains, which is also `REGION_BIOMES.Ovesos.ground`
  upland: 0x9ba566,   // Ovesos's northern grassland rows, `REGION_TERRAIN.Ovesos.byTerrain.grassland.ground`
  belt: 0x86994f,     // the river belt at the bank: denser, greener grass (the ruling of 5 October 2026)
  sorten: 0x93a05d,   // the bench: greener, because the river put the soil there
  pocket: 0x9d9573,   // the desert's low-gradient ground, where there is soil to speak of
  pavement: 0xb2aa95, // the desert's exposures: worn rock under a gravel lag
});
const mixHex = (from, to, t) => {
  const k = clamp(t, 0, 1);
  const channel = shift => { const a = (from >> shift) & 255, b = (to >> shift) & 255; return Math.round(a + (b - a) * k) & 255; };
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
};
/** The hex swatches this replaces: the two countries' own `plains` ground, and Ovesos's grassland. */
export const OVES_PLAINS_GROUND = freeze({ Ovesos: REGION_TERRAIN.Ovesos.ground, 'Oves Desert': REGION_TERRAIN['Oves Desert'].ground });
export const OVESOS_GRASSLAND_GROUND = REGION_TERRAIN.Ovesos.byTerrain.grassland.ground;
export function ovesTint(x, z, ground) {
  if (!inOvesBox(x, z)) return null;
  const plains = ground === OVES_PLAINS_GROUND.Ovesos;
  if (plains || ground === OVESOS_GRASSLAND_GROUND) {
    // The river belt first, over either of Ovesos's grounds; then the Sorten's bench over the plains.
    const belt = ovesosBelt(x, z), bench = plains ? clamp(ovesSorten(x, z) / (OVES_SORTEN.depth * .7), 0, 1) : 0;
    if (belt <= 0 && bench <= 0) return null;
    const own = plains ? OVES_GROUND.steppe : OVES_GROUND.upland, base = belt > 0 ? mixHex(own, OVES_GROUND.belt, belt * .92) : own;
    return bench > 0 ? mixHex(base, OVES_GROUND.sorten, bench) : base;
  }
  if (ground === OVES_PLAINS_GROUND['Oves Desert']) return mixHex(OVES_GROUND.pocket, OVES_GROUND.pavement, smooth(.28, .82, ovesLie(x, z)));
  return null;
}

// ---------------------------------------------------------------------------
// The places
// ---------------------------------------------------------------------------
/**
 * The natural places worth a name on the chart. **Nothing here is coined.** There is no Ovesi and no
 * Oves profile in `world-builder/azhoran_language_profiles.py` — the lore makes both countries
 * inner-branch Mittoli-speaking and gives no naming grammar for either — so the brief's rule applies:
 * the lore's own words (the Oveth, the Sorten, the Oves) or plain English (the rim hills, the dry
 * channels, the dry wedge), and no invented name at all.
 *
 * The Sorten is the lore's word for the bottomland and is used for the bottomland. The Sorten's
 * *grazing rights* and the *vel-sorten* allocation that divides it are the Water Council's and are
 * not here.
 */
const sortenMiddle = (() => {
  const samples = OVETH_UPPER.samples;
  const at = samples[Math.round((samples.length - 1) * (OVES_SORTEN.from + OVES_SORTEN.to) / 2)];
  for (const inward of [70, 95, 120, 45]) {
    const x = at.x + at.nx * inward * OVESOS_SIDE, z = at.z + at.nz * inward * OVESOS_SIDE;
    if (hexOwnerAt(x, z) === 'Ovesos') return point(x, z);
  }
  return point(at.x, at.z);
})();
const middleChannel = OVES_CHANNELS[1];
const dampMiddle = (() => {
  const target = (OVES_DAMP.from + OVES_DAMP.to) / 2;
  let run = 0;
  for (let i = 1; i < middleChannel.points.length; i++) {
    const a = middleChannel.points[i - 1], b = middleChannel.points[i], length = Math.hypot(b.x - a.x, b.z - a.z);
    if (run + length >= target) { const t = (target - run) / length; return point(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t); }
    run += length;
  }
  return middleChannel.points.at(-1);
})();

export const OVES_LANDMARKS = freeze([
  freeze({ id: 'the-sorten', name: 'The Sorten', ...sortenMiddle,
    description: 'The wide seat: a bench of bottomland a hundred and fifty paces across lying a metre below the plain, where the Oveth slows and spreads and leaves behind what it has carried out of the upland. It is the green ground at the dry end of the country and the reason the country has the river’s name on it. Who may graze it is the Water Council’s to say.' }),
  freeze({ id: 'upper-oveth', name: 'The Upper Oveth', ...(() => { const s = OVETH_UPPER.samples[Math.round(OVETH_UPPER.samples.length * .22)]; return { x: s.x + s.nx * 20 * OVESOS_SIDE, z: s.z + s.nz * 20 * OVESOS_SIDE }; })(),
    description: 'The river coming down out of the plateau country: small, quick, waded anywhere along here, and running in a cut you do not see until you are at it. Poplar, willow and tamarisk stand along it in a dark line two trees deep, and at this dry end of the country that line is visible from a mile off.' }),
  freeze({ id: 'oves-upland-grass', name: 'The Upland Grass', x: -2050, z: 592,
    description: 'The northern rows, rolling and higher than the plain: close green grass near the Lizeem and the Neth, going over to bunch grass in tussocks with the bare ground showing between them farther from the water. The upland herders hold this grass by agreement and keep their camp on it; they have no water right on the canal at all.' }),
  freeze({ id: 'oveth-gully', name: 'The Dry Gully', x: OVES_CHANNELS[3].points[2].x, z: OVES_CHANNELS[3].points[2].z,
    description: 'A shallow cut of grey gravel coming off the grass shoulder down toward the Sorten, dry from one year’s end to the next but for the few days after the rains. It stops a bowshot short of the river: water that only runs after rain does not keep a mouth open.' }),
  freeze({ id: 'oves-lizeem-bank', name: 'The Lizeem Bank', x: -1985, z: 575,
    description: 'The river belt (the ruling of 5 October 2026): close green grass along the Lizeem’s bank with poplar, willow and tamarisk standing on it, widest on the northern reach where the river runs a metre or two under the plain, and thinning away from the water to the steppe. The canal draws from the river here, and the oldest water rights lie along it.' }),
  freeze({ id: 'oves-open-plain', name: 'The Open Plain', x: -1800, z: 790,
    description: 'The southern rows of Ovesos, flatter than the grass above them: green along the Lizeem’s bank and drying westward away from it, to short bunch grass going to bare ground, grey wormwood and blue-grey saltbush wherever the soil gives out, and stones on the rises. Walking south-west off it the grass thins further, the stone comes up, and nothing at all announces the desert.' }),
  freeze({ id: 'rim-hills', name: 'The Rim Hills', x: OVES_RIM.crests[1].x, z: OVES_RIM.crests[1].z,
    description: 'Three low rounded hills stepping south-west down the desert’s north-western rim, broad-backed and worn, bare stone showing through a thin soil on their tops. They are not high — sixteen metres over the ground at their feet — and they are the whole reason the country behind them is a desert: what moisture the westerlies carry is spent on their far side.' }),
  freeze({ id: 'dry-channels', name: 'The Dry Channels', x: OVES_CHANNELS[0].points[2].x, z: OVES_CHANNELS[0].points[2].z,
    description: 'Cut beds of coarse gravel and boulders running east-south-east off the hills’ feet, deep enough to stand in and dry in every one of them. They carry water for a day or two after a rainfall event and nothing for the rest of the decade; a traveler walks down the middle of one as a road.' }),
  freeze({ id: 'oves-damp-reach', name: 'The Damp Reach', ...dampMiddle,
    description: 'A hundred paces of the Middle Channel’s floor where the gravel holds water below the surface and none above it: the only green in the Oves, a band of scrub and two or three tamarisk standing in a dry bed. The springs and the deeper wells the lore hangs its water rights on are somewhere along here, and they are somebody’s.' }),
  freeze({ id: 'oves-dry-wedge', name: 'The Dry Wedge', x: -2220, z: 940,
    description: 'The floor of the Oves: worn rock through a poor thin soil, gravel pavement wherever the rock is up, perennial scrub spaced wide enough to walk between, and a stubble of dead seed-heads in the pockets where the soil has gathered. In a wet year that stubble comes up as grass and the word desert looks like an overstatement. This is the other kind of year.' }),
  freeze({ id: 'oves-apex', name: 'The Wedge’s Point', x: -1868, z: 962,
    description: 'The eastern point of the desert, where the Oveth comes down off the Ovesian border and the Caelin comes in to meet it, and where three countries have a corner. The lowest ground in the Oves and the only place in it a traveler can drink, and the water belongs to the river and not to the desert.' }),
]);
