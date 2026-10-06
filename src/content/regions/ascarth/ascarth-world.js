/**
 * Northern and Southern Ascarth: the ground of the peninsula, as pure numbers.
 *
 * Pure: no three, no DOM. `src/world/terrain/world-terrain.js` lays the ground to it (`ascarthGround`) and tints
 * the cliffs by it (`ascarthCliffTint`); `src/content/regions/ascarth/ascarth-scenery.js` plants it; the chart, the wildlife
 * and the tests read the same numbers.
 *
 * **What the atlas gives** (it is the authority, and the lore is adjusted to it):
 *  - Northern Ascarth: sixteen hexes, thirteen of `grassland` and three of `hills`; Southern Ascarth:
 *    eighteen hexes, every one `grassland`. One finger of land running south-south-east from the
 *    Lizeem's mouth to a tip at row 132, the sea on both sides of it all the way down.
 *  - Its only land borders are Gala's, eight hex edges along the north-west and west of the neck, and
 *    one edge with Eer at the very top - and **that one is the Lizeem's last edge**, the great river
 *    going into the sea (`src/content/regions/western-regions/west-regions.js`, `LIZEEM_REACH`). So the peninsula is on Gala's side of
 *    the river, the far bank: there is no dry way into it from Eer.
 *  - No river anywhere inside it: the map's one river edge on either country is that Eer edge.
 *  - The climate, per hex off the World Builder map (`ASCARTH_CLIMATE`): `Csa`, hot-summer
 *    Mediterranean, on all thirty-one grassland hexes, and `Csb`, warm-summer Mediterranean, on the
 *    three hill hexes and on nothing else - the hills are the cooler ground, and that is the whole of
 *    the climate's pattern.
 *
 * **What the lore gives** (`../world-builder/azhora_lore/geography/regions/ascarth.md`): "a rugged
 * finger of land ... rocky and forested in its interior, cliff-faced along much of its coast, with
 * good anchorage only in the sheltered bays on its eastern and northern shores"; "a reliable source
 * of the right copper ore in the interior hills". Aevis, the peninsula's other cities, their harbours,
 * the bronze, the burial mounds and the copper workings are all somebody's and none of it is built.
 *
 * **Where the two meet, and what was chosen** (docs/ascarth-brief.md, and the lore adjusted to it):
 *  - the "highland interior" is the atlas's three hill hexes: two rounded rocky hills and the
 *    shoulder of a third, wooded in evergreen oak with pine on the tops, with the copper showing as
 *    green stain on the stone (`GREEN_STONE`), nothing dug;
 *  - the rest is open Mediterranean grass and scrub on a low plateau rolling to the sea;
 *  - the western shore and the tip are cliffs; the eastern shore is lower, falls to the sheltered bays
 *    the atlas's own indentations make (`BAYS`), and is cliffed only on the low headlands between them;
 *  - the neck against Gala is low grass at Gala's own level, and the peninsula rises out of it.
 *
 * **The seam with Gala** (the contract in the brief, which the Gala builder has too): the `grassland`
 * profile on every hex touching the border is base 4.0 m, amplitude .6, wavelength 320, which is what
 * Gala uses on its side; nothing here writes ground on a hex of Gala's or Eer's; and every landform in
 * this file is nothing at all within `FRONTIER.clear` (a hundred metres) of the border, so across that
 * band the ordinary hex blend is the ground on both sides. The one hill hex that touches the border is
 * the reason `REGION_TERRAIN`'s hill profile is low: the blend lifts the Gala side of that one edge by
 * a metre at the most (`tests/ascarth-world.test.js`).
 *
 * No names are coined: the World Builder has no Avite naming profile, so every place here is named in
 * plain English or in the lore's own words.
 */
import { hexCentre, landDistance, relief, REGION_CELLS, METRES_PER_HEX, regionAt } from '../../../world/terrain/region-world.js';
import { PLAYABLE_SURVEY } from '../../../dev/tools/region-survey.js';
import { RIVER_EDGES } from '../../../world/terrain/region-rivers.js';

const freeze = Object.freeze;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const smooth = (a, b, x) => { const v = clamp((x - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); };
const lerp = (a, b, t) => a + (b - a) * t;
const point = (x, z) => freeze({ x, z });

export const NORTH = 'Northern Ascarth';
export const SOUTH = 'Southern Ascarth';
const OURS = freeze(new Set([NORTH, SOUTH]));
export const isAscarth = name => OURS.has(name);

// ---------------------------------------------------------------------------
// The atlas
// ---------------------------------------------------------------------------
/**
 * The Köppen code the World Builder map paints on every hex of both countries
 * (`world-builder/map/resources/examples/azhora.wwmap`, `hexes[key].climate`; the dev export drops
 * the field). `world-builder/azhora.cmap.json` carries one code per *region* and says `Cfb` for both,
 * as it does for eighty-four of its hundred and sixteen regions, Eer and Gala among them - a campaign
 * map's default with a three-code vocabulary, and not a reading of these hexes. The per-hex field is.
 */
export const ASCARTH_CLIMATE = freeze({
  '-7,120': 'Csa', '-8,121': 'Csa', '-10,122': 'Csa', '-9,122': 'Csb', '-8,122': 'Csa',
  '-10,123': 'Csa', '-9,123': 'Csb', '-8,123': 'Csa', '-10,124': 'Csa', '-9,124': 'Csa', '-8,124': 'Csa', '-7,124': 'Csa',
  '-9,125': 'Csa', '-8,125': 'Csb', '-7,125': 'Csa', '-9,126': 'Csa',
  '-8,126': 'Csa', '-7,126': 'Csa', '-8,127': 'Csa', '-7,127': 'Csa', '-6,127': 'Csa', '-8,128': 'Csa', '-7,128': 'Csa', '-6,128': 'Csa',
  '-7,129': 'Csa', '-6,129': 'Csa', '-5,129': 'Csa', '-7,130': 'Csa', '-6,130': 'Csa', '-5,130': 'Csa',
  '-7,131': 'Csa', '-6,131': 'Csa', '-5,131': 'Csa', '-6,132': 'Csa',
});
/** The three `hills` hexes, all Northern Ascarth's: the lore's "interior hills". */
export const HILL_HEXES = freeze([freeze([-9, 122]), freeze([-9, 123]), freeze([-8, 125])]);

const CELLS = freeze([...(REGION_CELLS[NORTH] ?? []), ...(REGION_CELLS[SOUTH] ?? [])]);
const AXIAL = freeze([[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]]);
const key = (q, r) => `${q},${r}`;
/** Who the atlas gives each hex to, for every region the survey carries (Gala and Eer among them). */
const ATLAS_OWNER = (() => {
  const owners = new Map();
  for (const region of PLAYABLE_SURVEY.regions) for (const cell of region.cells) owners.set(key(cell.q, cell.r), region.name);
  return owners;
})();

/** Everything in this file is asked about only inside this box: both countries' hexes and a hex and a half round them. */
export const ASCARTH_BOX = (() => {
  const box = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const cell of CELLS) {
    const reach = METRES_PER_HEX * 1.5;
    box.minX = Math.min(box.minX, cell.x - reach); box.maxX = Math.max(box.maxX, cell.x + reach);
    box.minZ = Math.min(box.minZ, cell.z - reach); box.maxZ = Math.max(box.maxZ, cell.z + reach);
  }
  return freeze(box);
})();
export const inAscarthBox = (x, z) => x > ASCARTH_BOX.minX && x < ASCARTH_BOX.maxX && z > ASCARTH_BOX.minZ && z < ASCARTH_BOX.maxZ;

/**
 * The hex edge two neighbouring hexes share, as a segment in world metres. A regular hexagon's
 * edge is as long as its circumradius and lies square across the line between the two centres, at
 * its middle, so it is found without knowing which way the atlas turns.
 */
function sharedEdge(a, b) {
  const ca = hexCentre(a[0], a[1]), cb = hexCentre(b[0], b[1]);
  const dx = cb.x - ca.x, dz = cb.z - ca.z, length = Math.hypot(dx, dz), half = length / Math.sqrt(3) / 2;
  const mx = (ca.x + cb.x) / 2, mz = (ca.z + cb.z) / 2, px = -dz / length, pz = dx / length;
  return freeze({ a: point(mx + px * half, mz + pz * half), b: point(mx - px * half, mz - pz * half) });
}

/**
 * **The frontier**: every edge between one of the two countries and a hex another region of the
 * atlas claims - eight with Gala and one with Eer, and the Eer one is the Lizeem. Measured off the
 * survey rather than typed in, so the atlas and this list cannot disagree.
 */
export const FRONTIER_EDGES = freeze((() => {
  const wet = new Set();
  for (const edge of RIVER_EDGES) { wet.add(`${edge.a}|${edge.b}`); wet.add(`${edge.b}|${edge.a}`); }
  const edges = [];
  for (const cell of CELLS) for (const [dq, dr] of AXIAL) {
    const other = [cell.q + dq, cell.r + dr], owner = ATLAS_OWNER.get(key(...other));
    if (!owner || OURS.has(owner)) continue;
    edges.push(freeze({ ours: freeze([cell.q, cell.r]), theirs: freeze(other), with: owner,
      river: wet.has(`${[cell.q, cell.r]}|${other}`), ...sharedEdge([cell.q, cell.r], other) }));
  }
  return edges;
})());

/**
 * How far inside the peninsula the ground is its own to shape. Nothing within `clear` of the frontier
 * - the Gala contract's hundred metres - and all of it from `full`. Between, the ordinary ground and
 * the peninsula's are blended, and that blend is where the plateau rises out of the neck.
 */
export const FRONTIER = freeze({ clear: 100, full: 190 });
export function frontierDistance(x, z) {
  let best = Infinity;
  for (const edge of FRONTIER_EDGES) {
    const dx = edge.b.x - edge.a.x, dz = edge.b.z - edge.a.z;
    const t = clamp(((x - edge.a.x) * dx + (z - edge.a.z) * dz) / (dx * dx + dz * dz), 0, 1);
    best = Math.min(best, Math.hypot(x - edge.a.x - dx * t, z - edge.a.z - dz * t));
  }
  return best;
}
export const frontierWeight = (x, z) => smooth(FRONTIER.clear, FRONTIER.full, frontierDistance(x, z));

// ---------------------------------------------------------------------------
// The spine, and which coast a point is on
// ---------------------------------------------------------------------------
/**
 * The peninsula's middle line, head to tip: the mean of each atlas row of its hexes, softened, so
 * "east" and "west" are measured across the finger the way it actually lies rather than across a
 * straight line that misses its neck.
 */
export const SPINE = freeze((() => {
  const rows = new Map();
  for (const cell of CELLS) { const row = rows.get(cell.r) ?? { x: 0, z: 0, n: 0 }; row.x += cell.x; row.z += cell.z; row.n++; rows.set(cell.r, row); }
  let line = [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([, row]) => ({ x: row.x / row.n, z: row.z / row.n }));
  for (let pass = 0; pass < 2; pass++) line = line.map((p, i) => i === 0 || i === line.length - 1 ? p
    : { x: (line[i - 1].x + p.x * 2 + line[i + 1].x) / 4, z: (line[i - 1].z + p.z * 2 + line[i + 1].z) / 4 });
  return line.map(p => point(p.x, p.z));
})());
const SPINE_RUN = (() => { const run = [0]; for (let i = 1; i < SPINE.length; i++) run.push(run[i - 1] + Math.hypot(SPINE[i].x - SPINE[i - 1].x, SPINE[i].z - SPINE[i - 1].z)); return freeze(run); })();
export const SPINE_LENGTH = SPINE_RUN.at(-1);
/**
 * Where a point lies against the spine: `along` in metres from the head, and `across`, positive on
 * the east side of the finger and negative on the west. Past either end the line is carried straight
 * on, so the tip's own shore still has a side.
 */
export function spineAt(x, z) {
  let best = null;
  for (let i = 1; i < SPINE.length; i++) {
    const a = SPINE[i - 1], b = SPINE[i], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    let t = ((x - a.x) * dx + (z - a.z) * dz) / (length * length);
    if (i > 1) t = Math.max(t, 0);
    if (i < SPINE.length - 1) t = Math.min(t, 1);
    const px = a.x + dx * t, pz = a.z + dz * t, distance = Math.hypot(x - px, z - pz);
    if (!best || distance < best.distance) {
      // East of a line running south-south-east is its left: (dz, -dx) turns the direction toward +x.
      const across = ((x - px) * dz - (z - pz) * dx) / length;
      best = { distance, along: SPINE_RUN[i - 1] + t * length, across };
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// The coast
// ---------------------------------------------------------------------------
/**
 * **The sheltered bays.** "Good anchorage only in the sheltered bays on its eastern and northern
 * shores." The atlas draws the finger across its own grid, so both coasts are a staircase of hexes,
 * and where a sea hex has three of the peninsula's hexes round it the coast goes in a hex deep. On the
 * west those notches are coves in the cliff with no beach in them; on the east and north they are the
 * bays. Found off the atlas, not placed: four of them, the northernmost under the Lizeem's mouth.
 * Each is centred a little in from its sea hex's middle, toward the land round it.
 */
export const BAYS = freeze((() => {
  const seen = new Set(), bays = [];
  const east = [], names = ['The north bay', 'The upper east bay', 'The middle east bay', 'The lower east bay'];
  for (const cell of CELLS) for (const [dq, dr] of AXIAL) {
    const q = cell.q + dq, r = cell.r + dr, k = key(q, r);
    if (seen.has(k) || ATLAS_OWNER.has(k)) continue;
    seen.add(k);
    const land = AXIAL.map(([aq, ar]) => [q + aq, r + ar]).filter(([aq, ar]) => OURS.has(ATLAS_OWNER.get(key(aq, ar))));
    if (land.length < 3) continue;
    const c = hexCentre(q, r), side = spineAt(c.x, c.z);
    if (side.across <= 0) continue;
    const toward = land.map(([aq, ar]) => hexCentre(aq, ar)).reduce((sum, p) => ({ x: sum.x + p.x / land.length, z: sum.z + p.z / land.length }), { x: 0, z: 0 });
    const dx = toward.x - c.x, dz = toward.z - c.z, n = Math.hypot(dx, dz);
    east.push({ q, r, x: c.x + dx / n * 22, z: c.z + dz / n * 22, along: side.along });
  }
  east.sort((a, b) => a.along - b.along);
  east.forEach((bay, i) => {
    // Its beach: walked in from the middle of the bay toward the land until the ground is six
    // metres from the water, which is where the chart names it and a traveler stands to see it.
    const c = hexCentre(bay.q, bay.r), dx = bay.x - c.x, dz = bay.z - c.z, n = Math.hypot(dx, dz);
    let s = 0; while (s < 120 && landDistance(bay.x + dx / n * s, bay.z + dz / n * s) < 6) s += .5;
    bays.push(freeze({ id: `ascarth-bay-${i + 1}`, name: names[i] ?? `Bay ${i + 1}`, hex: freeze([bay.q, bay.r]),
      x: bay.x, z: bay.z, r: 70, shore: point(bay.x + dx / n * s, bay.z + dz / n * s) }));
  });
  return bays;
})());
export function bayWeight(x, z) {
  let weight = 0;
  for (const bay of BAYS) weight = Math.max(weight, 1 - smooth(bay.r * .55, bay.r, Math.hypot(x - bay.x, z - bay.z)));
  return weight;
}

/**
 * The cliffs. The shore field every region shares draws a beach wherever land meets sea: a ramp
 * forty metres long. Here the land keeps its height to within `face` metres of the water and then
 * drops - South Suval's cliffs, made the same way - on the whole western shore and round the tip.
 * The eastern shore is lower ground (`EAST_FALL`) and is cliffed only on the headlands between the
 * bays, less sheer; in the bays themselves it is the ordinary beach.
 */
export const CLIFF = freeze({ face: 3.2, east: .72, tip: 110 });
/** How much of a cliff the shore beside a point is: 1 on the west and the tip, `east` on the eastern headlands, nothing in a bay. */
export function cliffShare(x, z, side = spineAt(x, z)) {
  const west = 1 - smooth(-45, 35, side.across);
  const tip = smooth(SPINE_LENGTH - CLIFF.tip, SPINE_LENGTH - CLIFF.tip * .35, side.along);
  const share = Math.max(lerp(CLIFF.east, 1, west), tip);
  return share * (1 - bayWeight(x, z));
}

// ---------------------------------------------------------------------------
// The land
// ---------------------------------------------------------------------------
/**
 * The plateau: the finger stands `rise` metres above the neck's four, a little lower on its eastern
 * side and lower again toward the tip, rolling on a long wave with a short rough one over it - the
 * lore's "rugged", on ground the atlas calls grass.
 */
export const PLATEAU = freeze({ neck: 4, rise: 10.5, roll: 2.1, rollWave: 150, rough: .7, roughWave: 47, eastFall: 5, tipFall: 1.5, bayDip: 3.5 });

/**
 * **The interior hills**: the lore's "highland interior" and "interior hills", which the atlas draws
 * as three hexes of `hills`. Two rounded hills on the hexes that are clear of the Gala contract's band,
 * with a saddle between them, and the third hex - the one that touches Gala - the low shoulder the
 * hex blend makes of it. Not the East Lotharn: domes a traveler walks up, twenty-odd metres above the
 * plateau, about one in three on their flanks and steeper only where rock stands out of them.
 */
const hill = (id, name, hex, x, z, radius, height, phase) => freeze({ id, name, hex: freeze(hex), x, z, radius, height, phase });
export const HILLS = freeze([
  hill('north-hill', 'The north hill', [-9, 123], -1440, 1528, 102, 21, 1.3),
  hill('south-hill', 'The south hill', [-8, 125], -1256, 1676, 108, 24, 4.1),
]);
export const SADDLE = freeze({ height: 8, half: 72 });
const bell = u => (u >= 1 ? 0 : (1 - u * u) ** 2);
function hillRadius(h, x, z) {
  const theta = Math.atan2(z - h.z, x - h.x);
  return h.radius * (1 + Math.sin(theta * 3 + h.phase) * .1 + Math.sin(theta * 5 - h.phase * 1.7) * .06);
}
/** How far up a hill a point is: 1 at a summit, 0 at the foot and beyond. */
export function hillWeight(x, z) {
  let best = 0;
  for (const h of HILLS) best = Math.max(best, bell(Math.hypot(x - h.x, z - h.z) / hillRadius(h, x, z)));
  return best;
}
/** Which hill a point is on, and how far up it: `null` off both. */
export function hillAt(x, z) {
  let best = null;
  for (const h of HILLS) {
    const u = Math.hypot(x - h.x, z - h.z) / hillRadius(h, x, z);
    if (u < 1 && (!best || u < best.u)) best = { hill: h, u };
  }
  return best;
}
function saddleLift(x, z) {
  const [a, b] = HILLS, dx = b.x - a.x, dz = b.z - a.z;
  const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
  return SADDLE.height * bell(Math.hypot(x - a.x - dx * t, z - a.z - dz * t) / SADDLE.half);
}
/** The hills' own lift above the plateau: the higher of the two domes and the saddle, never their sum. */
export function hillLift(x, z) {
  let lift = saddleLift(x, z);
  for (const h of HILLS) lift = Math.max(lift, h.height * bell(Math.hypot(x - h.x, z - h.z) / hillRadius(h, x, z)));
  return lift;
}

/**
 * The world's `relief` is three sines on fixed bearings, and laid on its own over open ground it
 * reads from a hill as corrugation - parallel ridges every wavelength, all one way. Two of it, turned
 * seventy degrees apart and on wavelengths that never line up, is ground that rolls in every
 * direction, which is what a plateau of old rock worn down does.
 */
const TURN = Object.freeze({ c: Math.cos(1.22), s: Math.sin(1.22) });
function lumps(x, z, amp, wave) {
  const u = x * TURN.c - z * TURN.s, v = x * TURN.s + z * TURN.c;
  return relief(x, z, amp * .6, wave) + relief(u + 517, v - 229, amp * .55, wave * 1.37);
}

/** The peninsula's land at a point, before the coast is let down to the water. */
export function uplandHeight(x, z, side = spineAt(x, z)) {
  const p = PLATEAU;
  let height = p.neck + p.rise + lumps(x, z, p.roll, p.rollWave) + lumps(x + 311, z - 173, p.rough, p.roughWave);
  height -= p.eastFall * smooth(-30, 120, side.across);
  height -= p.tipFall * smooth(SPINE_LENGTH - 420, SPINE_LENGTH, side.along);
  let dip = 0;
  for (const bay of BAYS) dip = Math.max(dip, 1 - smooth(30, 150, Math.hypot(x - bay.x, z - bay.z)));
  height -= p.bayDip * dip;
  // Rocky on the hills: the short wave is louder where the ground stands up.
  const lift = hillLift(x, z);
  return height + lift + lumps(x - 97, z + 241, 1, 29) * smooth(2, 14, lift);
}

/** The shore's own profile: the sea floor and beach every region shares, below and up to the waterline. */
const beachAt = d => lerp(-5.6, 1.4, smooth(-26, 6, d));
/** The land let down to the water: a cliff where `cliff` is 1, the ordinary forty-metre beach where it is 0. */
export function coastProfile(d, top, cliff) {
  const beach = beachAt(d);
  return lerp(lerp(beach, top, smooth(2, 40, d)), lerp(beach, top, smooth(.4, CLIFF.face, d)), cliff);
}

/**
 * **The peninsula's own ground**, from the ground it is handed. Outside the box, on anybody else's
 * hex, at sea, and within the frontier's hundred metres it answers with exactly what it was given;
 * from there to `FRONTIER.full` it blends into the peninsula's, which is all of it beyond.
 *
 * "Anybody else's hex" is asked of `regionAt`, which carries each country a quarter of a hex out
 * past its own grid along its own shore, so the few metres of the peninsula's beach that run onto an
 * unclaimed sea hex are the peninsula's, and Eer's and Gala's shores are theirs.
 */
export function ascarthGround(x, z, ground) {
  if (!inAscarthBox(x, z)) return ground;
  if (!OURS.has(regionAt(x, z)?.name)) return ground;
  const weight = frontierWeight(x, z);
  if (weight <= 0) return ground;
  const d = landDistance(x, z);
  if (d <= 0) return ground;
  const side = spineAt(x, z);
  const own = coastProfile(d, uplandHeight(x, z, side), cliffShare(x, z, side));
  return lerp(ground, own, weight);
}

/**
 * The cliffs' colour, for the terrain's own tint (`groundTint`, src/world/terrain/world-terrain.js). `sand` is how
 * much of the shore's sand tint to keep - none on a cliff top, where every other shore in the world is
 * a beach - and `rock` how much of the face is bare stone. Both are exactly 0 and 1 outside the
 * peninsula, so no other shore changes colour by a digit.
 */
export function ascarthCliffTint(x, z, d) {
  if (!inAscarthBox(x, z) || d < -30 || d > 16) return null;
  if (!OURS.has(regionAt(x, z)?.name)) return null;
  const weight = frontierWeight(x, z);
  if (weight <= 0) return null;
  const cliff = cliffShare(x, z) * weight;
  if (cliff <= 0) return null;
  // Stone from under the water to a rim a few metres back from the edge. The terrain is drawn from
  // vertices seven metres apart out here, so a face three metres wide is one row of triangles between
  // a vertex in the sea and one on the top, and both ends of it have to be stone for it to read as a
  // face and not as a sandy bank.
  return { sand: 1 - cliff, rock: cliff * (1 - smooth(4.5, 9, d)) };
}

/**
 * Whether a point is at the foot of the cliffs, for the fallen rock that lies there: the shallows and
 * the first half-metre of the face, below where it starts to climb.
 */
export function onCliffFoot(x, z) {
  if (!inAscarthBox(x, z)) return false;
  const d = landDistance(x, z);
  if (d < -3 || d > .7) return false;
  const near = regionAt(x, z);
  if (!OURS.has(near?.name)) return false;
  return frontierWeight(x, z) > .5 && cliffShare(x, z) > .6;
}

// ---------------------------------------------------------------------------
// The green stone
// ---------------------------------------------------------------------------
/**
 * "A reliable source of the right copper ore in the interior hills." What shows of it at the surface
 * is stain: outcrops on the south hill's upper flank where the rock has weathered green and blue-green
 * in streaks down its faces. A mineral feature and nobody's - nothing is dug, nothing is stacked, and
 * the stone lies where the hill put it.
 */
export const GREEN_STONE = freeze({ id: 'green-stone', name: 'The green stone', x: -1224, z: 1650, radius: 22 });

// ---------------------------------------------------------------------------
// The chart
// ---------------------------------------------------------------------------
const tip = SPINE.at(-1);
/**
 * The two countries' places. Plain words for plain things, or the lore's own: "the interior hills",
 * "the sheltered bays", the Iberos Sea, Selemi across its "narrow channel" (iberos_coast.md).
 */
export const ASCARTH_LANDMARKS = freeze([
  freeze({ id: 'ascarth-neck', name: 'The neck', ...hexCentre(-8, 121), radius: 70,
    description: 'Where the peninsula joins the mainland: low grass at Gala’s own level between the sea and the Lizeem’s mouth, before the ground begins to rise.' }),
  freeze({ id: 'interior-hills', name: 'The interior hills', x: (HILLS[0].x + HILLS[1].x) / 2, z: (HILLS[0].z + HILLS[1].z) / 2, radius: 150,
    description: 'Two rounded rocky hills and the shoulder of a third, wooded in evergreen oak with pine on the tops: the peninsula’s highland interior, and its copper.' }),
  freeze({ id: 'green-stone', name: GREEN_STONE.name, x: GREEN_STONE.x, z: GREEN_STONE.z,
    description: 'Outcrops on the south hill streaked green and blue-green where the stone has weathered: the copper in the interior hills, showing at the surface and untouched.' }),
  freeze({ id: 'ascarth-west-cliffs', name: 'The west cliffs', x: -1536, z: 1592,
    description: 'The peninsula’s western shore: grass to the edge, then a fall of fifteen metres to rock and swell, and seabirds on the tops.' }),
  freeze({ id: 'ascarth-north-bay', name: BAYS[0].name, x: BAYS[0].shore.x, z: BAYS[0].shore.z,
    description: 'A sheltered bay under the Lizeem’s mouth, where the ground comes down to a beach. The lore’s good anchorage on the northern shore.' }),
  freeze({ id: 'ascarth-east-bays', name: 'The east bays', x: BAYS[2].shore.x, z: BAYS[2].shore.z,
    description: 'Small sheltered bays between low headlands on the eastern shore, each with its beach: the only places on this coast a boat could come in.' }),
  freeze({ id: 'ascarth-tip', name: 'The tip', x: tip.x, z: tip.z,
    description: 'The end of the finger: cliffs round three sides of it, and Selemi across the channel to the south.' }),
  freeze({ id: 'selemi-channel', name: 'The Selemi channel', x: -730, z: 2306,
    description: 'The narrow channel between the peninsula’s tip and Selemi, seen from the cliff top above it: open water no wider than a long field, and the island’s shore on the far side.' }),
]);
