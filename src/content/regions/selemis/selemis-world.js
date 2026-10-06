/**
 * Selemis: the ground of the island, as pure numbers.
 *
 * Pure: no three, no DOM. `src/world/terrain/world-terrain.js` lays the ground to it (`selemisGround`) and colours
 * it by it (`selemisTint`, `selemisShoreTint`); `src/content/regions/selemis/selemis-scenery.js` plants it; the chart, the
 * wildlife and the tests read the same numbers.
 *
 * **What the atlas gives** (it is the authority, and the lore is adjusted to it):
 *  - The region's key is **`Selemi`**, the atlas's own spelling, as `Iscare Archipeligo` keeps its.
 *    The place is Selemis and its people the Selemi; only the key is the atlas's.
 *  - **Eight hexes**, in three rows - (-9,133) (-8,133) / (-9,134) (-8,134) (-7,134) /
 *    (-9,135) (-8,135) (-7,135) - every one `grassland`, every one `Csa` on the World Builder map
 *    (`SELEMIS_CLIMATE`). No `hills` hex, no river edge on or beside any of them, and the fourteen
 *    hexes round it are unclaimed `coast`: it touches no other country anywhere.
 *  - **One row of water** between it and Southern Ascarth. The peninsula's last four hexes are
 *    (-7,131), (-6,131), (-5,131) and (-6,132); the water hexes (-8,132), (-7,132), (-7,133) and
 *    (-6,133) wind between them and the island, and at three places a corner of the island stands
 *    a hex edge (57.7 m) from a corner of the tip.
 *  - **The crescent is the atlas's own.** Exactly one sea hex has three of the island's hexes round
 *    it, (-7,133), and the hex straight across that water from the island is the peninsula's very
 *    last, (-6,132): the hollow of the crescent is turned on the tip of the Ascarth Peninsula to the
 *    degree (`HARBOUR`, found off the survey rather than typed in).
 *
 * **What the lore gives** (`../world-builder/azhora_lore/geography/regions/selemis.md`, "The Island",
 * and it is nearly all the lore has that is not the city): "shaped like a crescent, its concave face
 * turned toward the Azhoran coast, forming a natural sheltered harbor"; a city that "fills this
 * crescent from headland to headland"; "the residential districts climbing the island's interior
 * hills"; a channel "narrow but not trivial - enough that a fleet can cross it but not so little that
 * an army can wade", across which "on a clear day you can read smoke from the other shore". The city,
 * its harbour works, its fortifications, its fast ships and everybody in it are somebody's - in the
 * game's own story it was taken in 979 and an Izoli general sits in it (`src/content/regions/izol/izol-world.js`) - and
 * none of it is built. What is built is the ground it stands on.
 *
 * **Where the two meet, and what was chosen** (docs/selemis-brief.md, docs/selemis-report.md):
 *  - **the harbour** is that one sea hex, and its shore is a strand of sand on all three of the
 *    island's edges of it: the only shore on the island that is not a cliff, which is the lore's
 *    "natural sheltered harbor" and the reason a city would be exactly there;
 *  - **the two heads** are the two corners where the island's shore leaves the bay (`HEADS`, found
 *    off the atlas as well), each with a rocky crown on it: the lore's "headland to headland";
 *  - **the interior hills** are three grass hills along the island's back, behind the three places it
 *    is thickest. The atlas says `grassland` on all eight hexes and the lore says hills, and both are
 *    kept: they are hills by their height and grass by what is on them, lower than the peninsula's
 *    wooded `hills` hexes and with no wood on their tops. This is a builder's choice and the report
 *    says so;
 *  - **the island is a tilted table with its back to the open sea.** The bench behind the hills
 *    rises toward the south-south-west, away from the harbour, so the highest cliffs are on the
 *    ocean face and the lowest ground is the hollow the harbour lies in. The lore is silent on every
 *    shore but the harbour's; this is the Iberos coast's own account of its southern end ("the coast
 *    becomes more cliff-faced, more dramatic, the harbors smaller") and the peninsula's precedent
 *    across the channel, and it is a builder's choice too;
 *  - **no stream and no spring.** The atlas draws no river edge here and `Csa` is a dry summer by
 *    definition, so the island's water is the winter's: two dry beds come down out of the saddles
 *    between the hills to the strand (`WINTER_BEDS`), and there is nothing in either of them.
 *
 * **Nothing here touches the peninsula.** The island's own ground is written only where `regionAt`
 * answers `Selemi` and the coast field is positive, and the waterline is left exactly where the coast
 * field puts it on every shore - so the channel is as wide as the atlas makes it and no wider or
 * narrower for anything in this file (`tests/selemis-world.test.js` measures it).
 *
 * **Two names are taken and none is coined.** The Selemi tongue is in `src/gameplay/skills/languages.js` (`selemi`,
 * endonym Selanoc, derived there from the World Builder's `tennoca` profile - the World Builder has
 * no Selemi profile of its own), and two of its lexicon's own words are used as names the way the
 * Vaellir is the Pyrosi word for a river: the bay is **the Seloca**, the tongue's word for a harbour, and the
 * channel is **the Nocveth**, its word for a crossing. Everything else is plain English or the lore's
 * own words.
 */
import { hexCentre, landDistance, relief, REGION_CELLS, REGION_TERRAIN, METRES_PER_HEX, regionAt } from '../../../world/terrain/region-world.js';
import { PLAYABLE_SURVEY, LAND_HEXES } from '../../../dev/tools/region-survey.js';

const freeze = Object.freeze;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const smooth = (a, b, x) => { const v = clamp((x - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); };
const lerp = (a, b, t) => a + (b - a) * t;
const point = (x, z) => freeze({ x, z });

/** The atlas's key for the region, kept as the atlas spells it; the place is Selemis and its people the Selemi. */
export const SELEMI = 'Selemi';
export const isSelemi = name => name === SELEMI;

// ---------------------------------------------------------------------------
// The atlas
// ---------------------------------------------------------------------------
/**
 * The Köppen code the World Builder map paints on each of the eight hexes
 * (`world-builder/map/resources/examples/azhora.wwmap`, `hexes[key].climate`; the dev export drops
 * the field, and `world-builder/azhora.cmap.json` carries one default code per region). `Csa` on all
 * of them: hot-summer Mediterranean, the code of every one of Southern Ascarth's eighteen hexes too.
 */
export const SELEMIS_CLIMATE = freeze({
  '-9,133': 'Csa', '-8,133': 'Csa',
  '-9,134': 'Csa', '-8,134': 'Csa', '-7,134': 'Csa',
  '-9,135': 'Csa', '-8,135': 'Csa', '-7,135': 'Csa',
});

const CELLS = freeze([...(REGION_CELLS[SELEMI] ?? [])]);
const AXIAL = freeze([[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]]);
const key = (q, r) => `${q},${r}`;
const OWN = new Set(CELLS.map(cell => key(cell.q, cell.r)));
/** Every hex the atlas claims as land for anybody, built or not: what is not in here is the sea. */
const LAND = new Set(LAND_HEXES.map(([q, r]) => key(q, r)));
const ATLAS_OWNER = (() => {
  const owners = new Map();
  for (const region of PLAYABLE_SURVEY.regions) for (const cell of region.cells) owners.set(key(cell.q, cell.r), region.name);
  return owners;
})();
/**
 * The six corners of a hex, each with the two other hexes that meet at it. A corner of a regular
 * hex grid is the middle of the three centres round it, so it is found without knowing which way the
 * atlas turns.
 */
function corners(q, r) {
  const c = hexCentre(q, r);
  return AXIAL.map(([dq, dr], i) => {
    const [nq, nr] = AXIAL[(i + 1) % 6], a = hexCentre(q + dq, r + dr), b = hexCentre(q + nq, r + nr);
    return { x: (c.x + a.x + b.x) / 3, z: (c.z + a.z + b.z) / 3, hexes: [[q + dq, r + dr], [q + nq, r + nr]] };
  });
}

/** Everything in this file is asked about only inside this box: the island's hexes and a hex and a half round them. */
export const SELEMIS_BOX = (() => {
  const box = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const cell of CELLS) {
    const reach = METRES_PER_HEX * 1.5;
    box.minX = Math.min(box.minX, cell.x - reach); box.maxX = Math.max(box.maxX, cell.x + reach);
    box.minZ = Math.min(box.minZ, cell.z - reach); box.maxZ = Math.max(box.maxZ, cell.z + reach);
  }
  return freeze(box);
})();
export const inSelemisBox = (x, z) => x > SELEMIS_BOX.minX && x < SELEMIS_BOX.maxX && z > SELEMIS_BOX.minZ && z < SELEMIS_BOX.maxZ;

/** The middle of the island's eight hexes, and its long axis: west-north-west to east-south-east. */
export const MIDDLE = (() => { let x = 0, z = 0; for (const cell of CELLS) { x += cell.x / CELLS.length; z += cell.z / CELLS.length; } return point(x, z); })();
const AXIS = freeze({ x: Math.sqrt(3) / 2, z: .5 });
/** Metres along the island from its middle: negative toward the western end, positive toward the eastern. */
export const alongIsland = (x, z) => (x - MIDDLE.x) * AXIS.x + (z - MIDDLE.z) * AXIS.z;

// ---------------------------------------------------------------------------
// The harbour
// ---------------------------------------------------------------------------
/**
 * **The Seloca: the bay in the hollow of the crescent.** "Shaped like a crescent, its concave face
 * turned toward the Azhoran coast, forming a natural sheltered harbor." Found off the atlas, not
 * placed: every sea hex beside the island is asked how many of the island's hexes stand round it, and
 * exactly one answers three - (-7,133), held on its west, south-west and south-east. `count` is how
 * many answered, so a test can say there is one harbour and not two.
 *
 * `across` is what the hollow is turned toward: the land hex on the far side of that water, which is
 * (-6,132), the last hex of Southern Ascarth. `axis` is the direction from the middle of the bay into
 * the island, and the bay's middle, the hollow's middle and that last hex of the peninsula all lie on
 * it. `x`, `z` is the bay's middle carried a little toward the land, which is what the strand and the
 * hollow are measured from; `water` is the middle of the water itself.
 *
 * The name is the Selemi lexicon's own word for a harbour (`LANGUAGES.selemi.roots.harbour`,
 * src/gameplay/skills/languages.js): the tongue's word used as a name, and not a coinage.
 */
export const HARBOUR = (() => {
  const seen = new Set(), found = [];
  for (const cell of CELLS) for (const [dq, dr] of AXIAL) {
    const q = cell.q + dq, r = cell.r + dr, k = key(q, r);
    if (seen.has(k) || LAND.has(k)) continue;
    seen.add(k);
    const round = AXIAL.map(([aq, ar]) => [q + aq, r + ar]);
    const land = round.filter(([aq, ar]) => OWN.has(key(aq, ar)));
    if (land.length >= 3) found.push({ q, r, land, round });
  }
  const bay = found[0];
  if (!bay) return null;
  const c = hexCentre(bay.q, bay.r);
  const toward = bay.land.map(([q, r]) => hexCentre(q, r)).reduce((sum, p) => ({ x: sum.x + p.x / bay.land.length, z: sum.z + p.z / bay.land.length }), { x: 0, z: 0 });
  const n = Math.hypot(toward.x - c.x, toward.z - c.z), ax = (toward.x - c.x) / n, az = (toward.z - c.z) / n;
  const across = bay.round.filter(([q, r]) => !OWN.has(key(q, r)) && LAND.has(key(q, r)))
    .map(([q, r]) => freeze({ hex: freeze([q, r]), region: ATLAS_OWNER.get(key(q, r)) ?? null, ...hexCentre(q, r) }));
  // Its strand: walked in from the middle of the water toward the island until the ground is six
  // metres from the water, which is where the chart names it and a traveler stands to see it.
  let s = 0; while (s < 120 && landDistance(c.x + ax * s, c.z + az * s) < 6) s += .5;
  return freeze({ id: 'selemis-harbour', name: 'The Seloca', hex: freeze([bay.q, bay.r]), count: found.length,
    water: point(c.x, c.z), x: c.x + ax * 22, z: c.z + az * 22, axis: point(ax, az),
    land: freeze(bay.land.map(hex => freeze(hex))), across: freeze(across), strand: point(c.x + ax * s, c.z + az * s) });
})();
/** Metres from the harbour's middle, and metres back from it along its axis into the island. */
const fromHarbour = (x, z) => Math.hypot(x - HARBOUR.x, z - HARBOUR.z);
export const behindHarbour = (x, z) => (x - HARBOUR.x) * HARBOUR.axis.x + (z - HARBOUR.z) * HARBOUR.axis.z;

/**
 * **The strand.** The shore field every region shares draws a beach wherever land meets sea, and
 * round the bay that is exactly right: sand on all three of the island's edges of it, the whole way
 * from one head's tip to the other's. `strandWeight` is 1 there and falls to nothing going out round
 * either head, where the cliffs begin.
 */
export const STRAND = freeze({ full: 45, none: 75 });
export function strandWeight(x, z) {
  return 1 - smooth(STRAND.full, STRAND.none, fromHarbour(x, z));
}

// ---------------------------------------------------------------------------
// The two heads
// ---------------------------------------------------------------------------
/**
 * **The west head and the east head**: the lore's "headland to headland". Found off the atlas too:
 * of the bay hex's six corners, two are where one hex of the island meets the open sea, and those
 * are the two ends of the strand - the corner of (-8,133) on the west and the corner of (-7,134) on
 * the east. Each head is that corner, with a rocky crown standing `back` metres behind it on its own
 * hex: low rock at the very tip where the sand gives out, rising to the crown, and cliffed on every
 * face that is not the bay's.
 *
 * Plain names. The lore has harbour fortifications on these and names neither of them.
 */
const head = (id, name, tip, back, radius, height, phase) => {
  const c = hexCentre(tip.hex[0], tip.hex[1]), n = Math.hypot(c.x - tip.x, c.z - tip.z);
  return freeze({ id, name, tip: point(tip.x, tip.z), hex: freeze([...tip.hex]),
    x: tip.x + (c.x - tip.x) / n * back, z: tip.z + (c.z - tip.z) / n * back, radius, height, phase });
};
export const HEADS = (() => {
  const tips = [];
  for (const corner of corners(HARBOUR.hex[0], HARBOUR.hex[1])) {
    const own = corner.hexes.filter(([q, r]) => OWN.has(key(q, r))), sea = corner.hexes.filter(([q, r]) => !LAND.has(key(q, r)));
    if (own.length === 1 && sea.length === 1) tips.push({ x: corner.x, z: corner.z, hex: own[0] });
  }
  tips.sort((a, b) => a.x - b.x);
  return freeze([
    head('selemis-west-head', 'The west head', tips[0], 38, 46, 6.5, 2.2),
    head('selemis-east-head', 'The east head', tips[1], 38, 44, 5.5, 4.6),
  ]);
})();

// ---------------------------------------------------------------------------
// The interior hills
// ---------------------------------------------------------------------------
/**
 * **The interior hills**: "the residential districts climbing the island's interior hills". Three of
 * them along the island's back. The island is thickest at three places - the three local maxima of
 * the coast field, 80, 88 and 79 metres from any water - and each hill stands eighteen or twenty
 * metres behind one of them, away from the harbour: so the hollow in front of them is wide enough to
 * be the lore's harbour and the ground its lower districts stand on, and the hills are still
 * sixty-six to seventy-four metres from the open sea behind them. A saddle joins each to the next, so
 * they read as one back to the island with three tops on it rather than three cones on a plate.
 *
 * **Grass hills, and the atlas says so.** All eight hexes are `grassland` and none is `hills`, where
 * the peninsula across the channel has three `hills` hexes that carry its wood. So these are hills by
 * height and grassland by cover: twenty-odd metres at the top, about one in three on their flanks,
 * and not a tree on the upper slopes. They are deliberately lower than the peninsula's
 * thirty-five-metre wooded hills, which stand on hexes the atlas calls hills.
 *
 * Plain names: the lore says only "the island's interior hills".
 */
const hill = (id, name, x, z, radius, height, phase) => freeze({ id, name, x, z, radius, height, phase });
export const HILLS = freeze([
  hill('selemis-west-hill', 'The west hill', -889, 2420, 62, 12, 1.1),
  hill('selemis-high-hill', 'The high hill', -832, 2504, 76, 16.6, 3.7),
  hill('selemis-east-hill', 'The east hill', -739, 2521, 66, 13.4, 5.2),
]);
export const SADDLES = freeze([freeze({ from: 0, to: 1, height: 6, half: 46 }), freeze({ from: 1, to: 2, height: 7, half: 46 })]);
const bell = u => (u >= 1 ? 0 : (1 - u * u) ** 2);
/** A crown's own radius toward a point: not a circle, so no two flanks of it are alike. */
function reach(h, x, z) {
  const theta = Math.atan2(z - h.z, x - h.x);
  return h.radius * (1 + Math.sin(theta * 3 + h.phase) * .09 + Math.sin(theta * 5 - h.phase * 1.7) * .05);
}
function saddleLift(x, z) {
  let best = 0;
  for (const saddle of SADDLES) {
    const a = HILLS[saddle.from], b = HILLS[saddle.to], dx = b.x - a.x, dz = b.z - a.z;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
    best = Math.max(best, saddle.height * bell(Math.hypot(x - a.x - dx * t, z - a.z - dz * t) / saddle.half));
  }
  return best;
}
/** The hills' own lift above the bench: the highest of the three domes and the two saddles, never their sum. */
export function hillLift(x, z) {
  let lift = saddleLift(x, z);
  for (const h of HILLS) lift = Math.max(lift, h.height * bell(Math.hypot(x - h.x, z - h.z) / reach(h, x, z)));
  return lift;
}
/** Which hill a point is on, and how far up it: `null` off all three. */
export function hillAt(x, z) {
  let best = null;
  for (const h of HILLS) {
    const u = Math.hypot(x - h.x, z - h.z) / reach(h, x, z);
    if (u < 1 && (!best || u < best.u)) best = { hill: h, u };
  }
  return best;
}
/** The heads' own lift: the rocky crown on each. */
export function headLift(x, z) {
  let lift = 0;
  for (const h of HEADS) lift = Math.max(lift, h.height * bell(Math.hypot(x - h.x, z - h.z) / reach(h, x, z)));
  return lift;
}

// ---------------------------------------------------------------------------
// The winter beds
// ---------------------------------------------------------------------------
/**
 * **The winter beds: the island's only water, and there is none in them.** The atlas draws no river
 * edge on or beside any of the eight hexes, and `Csa` is a dry summer by definition - all of the
 * year's rain comes in the winter months and none of it stays. The lore does not say whether the
 * island has a stream or a spring. So this is derived from the two things that are known and is a
 * builder's choice: the hills shed their winter rain down the two re-entrants between them, into the
 * hollow and out across the strand, and what that leaves the rest of the year is a shallow dry bed of
 * pale stones in each. No water body, no level, nothing to wade.
 *
 * Each runs from a saddle to the strand, wide and shallow on purpose: the ground out here is drawn
 * from vertices seven metres apart, and a cut narrower than that would not be drawn at all.
 */
const bed = (id, name, points, half, depth) => {
  const line = points.map(([x, z]) => point(x, z));
  const run = [0]; for (let i = 1; i < line.length; i++) run.push(run[i - 1] + Math.hypot(line[i].x - line[i - 1].x, line[i].z - line[i - 1].z));
  return freeze({ id, name, line: freeze(line), run: freeze(run), length: run.at(-1), half, depth });
};
export const WINTER_BEDS = freeze([
  bed('selemis-west-bed', 'The west winter bed', [[-858, 2460], [-842, 2436], [-824, 2414], [-806, 2397]], 11, 1.4),
  bed('selemis-east-bed', 'The east winter bed', [[-785, 2508], [-777, 2482], [-765, 2455], [-755, 2432]], 11, 1.4),
]);
/** Where a point lies against the nearer bed: how far off its line, and how far down it (0 at its head, 1 at the strand). */
export function bedAt(x, z) {
  let best = null;
  for (const course of WINTER_BEDS) for (let i = 1; i < course.line.length; i++) {
    const a = course.line[i - 1], b = course.line[i], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (length * length), 0, 1);
    const distance = Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
    if (!best || distance < best.distance) best = { bed: course, distance, along: (course.run[i - 1] + t * length) / course.length };
  }
  return best;
}
/** How much of a bed a point is in: 1 down its middle, 0 at its banks, fading in at its head and out on the strand. */
export function bedWeight(x, z) {
  const at = bedAt(x, z);
  if (!at || at.distance >= at.bed.half) return 0;
  return bell(at.distance / at.bed.half) * smooth(0, .22, at.along) * (1 - smooth(.8, 1, at.along));
}
const bedCut = (x, z) => { const at = bedAt(x, z); return at && at.distance < at.bed.half ? at.bed.depth * bedWeight(x, z) : 0; };

// ---------------------------------------------------------------------------
// The land
// ---------------------------------------------------------------------------
/**
 * The island's own levels. `shelf` is the ground behind the strand; `bench` the open ground behind
 * the hills where it is lowest, on the channel shore; `tilt` what it gains going away from the harbour
 * to the ocean face, over `tiltOver` metres of `behindHarbour`; `rise` the two distances from the
 * harbour's middle between which the hollow climbs from the shelf to the bench. The two ends fall a
 * little, the eastern tail the more. `roll` and `rough` are the peninsula's two turned waves, quieter:
 * an island four hundred metres long has no room for a hundred-and-fifty-metre swell.
 */
export const ISLAND = freeze({ shelf: 2.6, bench: 8.5, tilt: 4.5, tiltOver: freeze([40, 215]), rise: freeze([50, 122]),
  eastFall: 2.4, westFall: 1, roll: 1.3, rollWave: 110, rough: .45, roughWave: 37 });

/**
 * The world's `relief` is three sines on fixed bearings, and laid on its own over open ground it
 * reads from a hill as corrugation. Two of it, turned seventy degrees apart on wavelengths that never
 * line up, is ground that rolls in every direction (`src/content/regions/ascarth/ascarth-world.js` found this; the phase here
 * is the island's own, so the two shores do not roll in step).
 */
const TURN = freeze({ c: Math.cos(1.22), s: Math.sin(1.22) });
function lumps(x, z, amp, wave) {
  const u = x * TURN.c - z * TURN.s, v = x * TURN.s + z * TURN.c;
  return relief(x, z, amp * .6, wave) + relief(u + 233, v - 611, amp * .55, wave * 1.37);
}
/**
 * **The hollow**: how far down into the harbour's own ground a point is. 1 on the shelf behind the
 * strand, 0 on the bench, and everything between is the slope the lore's city climbs - an
 * amphitheatre open to the bay and closed by the hills, with about eight thousand square metres of
 * it under six metres (`tests/selemis-world.test.js` measures it).
 */
export function hollow(x, z) {
  return 1 - smooth(ISLAND.rise[0], ISLAND.rise[1], fromHarbour(x, z));
}
/** How far toward the ocean face a point is: 0 at the harbour and along the channel shore, 1 at the island's south-western corner. */
export const oceanward = (x, z) => smooth(ISLAND.tiltOver[0], ISLAND.tiltOver[1], behindHarbour(x, z));
/** The island's land at a point, before the coast is let down to the water. */
export function uplandHeight(x, z) {
  const p = ISLAND, s = alongIsland(x, z), up = 1 - hollow(x, z);
  let height = lerp(p.shelf, p.bench + p.tilt * oceanward(x, z), up);
  height -= p.eastFall * smooth(110, 230, s) + p.westFall * smooth(110, 230, -s);
  const hills = hillLift(x, z), heads = headLift(x, z);
  height += hills + heads;
  // The long roll is laid on the bench and let go in the hollow, which is a slope and not a swell.
  height += lumps(x, z, p.roll, p.rollWave) * smooth(.15, .8, up) + lumps(x + 311, z - 173, p.rough, p.roughWave);
  // Rocky on the tops: the short wave is louder where the ground stands up.
  height += lumps(x - 97, z + 241, .8, 27) * smooth(3, 12, Math.max(hills, heads));
  return height - bedCut(x, z);
}

/**
 * **The cliffs.** Every shore of the island that is not the strand. Made the way the peninsula's are
 * (`coastProfile`, src/content/regions/ascarth/ascarth-world.js): the land keeps its height to within `face` metres of the
 * water and then drops, and below the first forty centimetres it is the shore every region shares -
 * so the waterline itself is where the coast field puts it, to the centimetre, on a cliff as on a
 * beach. Eight metres on the channel shore, thirteen on the ocean face.
 */
export const CLIFF = freeze({ face: 3.6 });
/** The shore's own profile: the sea floor and beach every region shares, below and up to the waterline. */
const beachAt = d => lerp(-5.6, 1.4, smooth(-26, 6, d));
/** The land let down to the water: a cliff where `cliff` is 1, the ordinary forty-metre beach where it is 0. */
export function coastProfile(d, top, cliff) {
  const beach = beachAt(d);
  return lerp(lerp(beach, top, smooth(2, 40, d)), lerp(beach, top, smooth(.4, CLIFF.face, d)), cliff);
}
/** How much of a cliff the shore beside a point is: 1 everywhere but round the bay. */
export const cliffShare = (x, z) => 1 - strandWeight(x, z);

/**
 * **The island's own ground**, from the ground it is handed. Outside the box, on anybody else's
 * ground and at sea it answers with exactly what it was given; on the island it is all its own - the
 * island has no land border, so there is no seam to blend across and nothing to leave alone.
 *
 * "The island" is asked of `regionAt`, which carries a country a quarter of a hex out past its own
 * grid along its own shore: the few metres of beach that run onto an unclaimed sea hex are the
 * island's, and the peninsula's shore across the channel is the peninsula's. No point can be both -
 * the two countries' nearest hex centres are a hundred and seventy-three metres apart and the fringe
 * is seventy-six.
 */
export function selemisGround(x, z, ground) {
  if (!inSelemisBox(x, z)) return ground;
  if (regionAt(x, z)?.name !== SELEMI) return ground;
  const d = landDistance(x, z);
  if (d <= 0) return ground;
  return coastProfile(d, uplandHeight(x, z), cliffShare(x, z));
}

/**
 * Whether a point is at the foot of the cliffs, for the fallen rock that lies there: the shallows and
 * the first half-metre of the face, below where it starts to climb.
 */
export function onCliffFoot(x, z) {
  if (!inSelemisBox(x, z)) return false;
  const d = landDistance(x, z);
  if (d < -3 || d > .7) return false;
  return regionAt(x, z)?.name === SELEMI && cliffShare(x, z) > .6;
}

// ---------------------------------------------------------------------------
// The colour of the ground
// ---------------------------------------------------------------------------
const hexOf = swatch => (typeof swatch === 'string' ? parseInt(swatch.replace('#', ''), 16) : swatch);
const mixHex = (from, to, t) => {
  const k = clamp(t, 0, 1), channel = shift => { const a = (from >> shift) & 0xff, b = (to >> shift) & 0xff; return Math.round(a + (b - a) * k) & 0xff; };
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
};
/**
 * What the island's one swatch cannot say. The atlas calls all eight hexes `grassland`, and on an
 * island this small what decides the colour of the ground is which way it faces: the hollow is in the
 * lee of its own hills and holds the island's soil; the tops are thin soil with the stone showing; the
 * ocean face takes the salt; and the two winter beds are bare stones.
 *
 * Colours are written in the space they are read in (`mixHex` over integers, as `src/world/environment/region-sky.js`
 * does), never through HSL.
 */
export const SELEMIS_GROUND = freeze({
  grass: hexOf(REGION_TERRAIN[SELEMI]?.ground ?? '#b1a971'),
  hollow: 0x8f9a5c,     // deeper soil in the lee: greener, and darker for the maquis on it
  crown: 0xc0b78e,      // thin soil on the tops, pale stone showing through it
  salt: 0xa7a17e,       // the ocean face: greyer, salt-burnt
  gravel: 0xc8bfa2,     // the winter beds: washed stones
  stone: 0xa39d8c,      // the cliffs: pale stone, paler than the peninsula's grey-brown
});
/** The four fields the colour is mixed by, each 0 to 1, for the tint, the scatter and the tests alike. */
export function selemisCover(x, z) {
  const d = landDistance(x, z);
  return {
    hollow: smooth(.05, .9, hollow(x, z)),
    crown: smooth(4, 13, Math.max(hillLift(x, z), headLift(x, z) * 1.7)),
    salt: oceanward(x, z) * (1 - smooth(10, 62, d)),
    bed: bedWeight(x, z),
  };
}
/**
 * The island's row in the ground-tint table (`GROUND_TINTS`, src/world/terrain/world-terrain.js). It paints its
 * own swatch, and **the sea hexes' share of the blend as well**: every point of an island this small
 * is within the hex blend's reach of several unclaimed sea hexes, which the blend counts as `outland`
 * and colours a green that belongs to no ground here. On the island's own ground that share is the
 * island's. Everywhere else it answers `null`, and nothing else changes colour by a digit.
 */
const OUTLAND = REGION_TERRAIN.outland.ground;
export function selemisTint(x, z, ground) {
  if (!inSelemisBox(x, z)) return null;
  if (ground !== REGION_TERRAIN[SELEMI].ground && ground !== OUTLAND) return null;
  if (regionAt(x, z)?.name !== SELEMI) return null;
  const cover = selemisCover(x, z), g = SELEMIS_GROUND;
  let colour = g.grass;
  colour = mixHex(colour, g.hollow, cover.hollow * .62);
  colour = mixHex(colour, g.salt, cover.salt * .55);
  colour = mixHex(colour, g.crown, cover.crown * .6);
  colour = mixHex(colour, g.gravel, cover.bed * .85);
  return colour;
}
/**
 * The cliffs' colour, for the shore stage of the terrain's tint (`SHORE_TINTS`, src/world/terrain/world-terrain.js),
 * in the shape the peninsula's answers in: `sand` is how much of the shore's sand tint to keep -
 * all of it on the strand, none on a cliff top - `rock` how much of the face is bare stone, and
 * `stone` its colour. `null` off the island and on the strand, where the shore is the same sand it is
 * everywhere else in the world.
 */
export function selemisShoreTint(x, z, d) {
  if (!inSelemisBox(x, z) || d < -30 || d > 16) return null;
  if (regionAt(x, z)?.name !== SELEMI) return null;
  const cliff = cliffShare(x, z);
  if (cliff <= 0) return null;
  // Stone from under the water to a rim a few metres back from the edge: the face is one row of
  // triangles between a vertex in the sea and one on the top, and both ends of it have to be stone
  // for it to read as a face (docs/ascarth-report.md).
  return { sand: 1 - cliff, rock: cliff * (1 - smooth(4.5, 9, d)), stone: SELEMIS_GROUND.stone };
}

// ---------------------------------------------------------------------------
// The chart
// ---------------------------------------------------------------------------
/** Where the island's own shore is seen across the channel from: the west head's cliff top, on its channel side. */
export const CHANNEL_VIEW = point(-848, 2327);
/** The middle of the ocean face: the cliff top under the high hill, on the island's south-western shore. */
export const SOUTH_CLIFFS = point(-884, 2545);
/**
 * The island's places. Two Selemi words used as names - the Seloca and the Nocveth, a harbour and a
 * crossing (`LANGUAGES.selemi.roots`, src/gameplay/skills/languages.js) - and plain English or the lore's own words
 * for everything else: "headland to headland", "the island's interior hills".
 */
export const SELEMIS_LANDMARKS = freeze([
  freeze({ id: HARBOUR.id, name: HARBOUR.name, x: HARBOUR.strand.x, z: HARBOUR.strand.z, radius: 60,
    description: 'The bay in the hollow of the crescent: sheltered water a hundred paces across with a strand of sand round three sides of it, a rocky head at either end of the strand, and the cliffs of the Ascarth tip closing the fourth. The only shore on the island that is not a cliff. Seloca is the Selemi word for a harbour.' }),
  freeze({ id: HEADS[0].id, name: HEADS[0].name, x: HEADS[0].x, z: HEADS[0].z,
    description: 'The western end of the strand: low rock where the sand gives out, rising to a stony crown with cliffs on every side of it but the bay’s, and the channel under its northern face.' }),
  freeze({ id: HEADS[1].id, name: HEADS[1].name, x: HEADS[1].x, z: HEADS[1].z,
    description: 'The eastern end of the strand, and the lower of the two heads: a stony crown over the bay’s eastern gate, with the open Iberos beyond it and seabirds on its rock.' }),
  freeze({ id: 'selemis-hills', name: 'The interior hills', x: HILLS[1].x, z: HILLS[1].z, radius: 110,
    description: 'Three grass hills along the island’s back with a saddle between each and the next, the middle one the highest ground on the island. Pale stone through thin soil on their tops, the hollow and the harbour below them on one side and the open sea on the other.' }),
  freeze({ id: 'selemis-winter-beds', name: 'The winter beds', x: WINTER_BEDS[0].line[1].x, z: WINTER_BEDS[0].line[1].z,
    description: 'Two shallow beds of pale stones coming down out of the saddles between the hills to the strand. They carry the winter’s rain and nothing else: there is no stream and no spring on the island, and both are dry.' }),
  freeze({ id: 'selemis-south-cliffs', name: 'The south cliffs', x: SOUTH_CLIFFS.x, z: SOUTH_CLIFFS.z,
    description: 'The island’s back, turned to the open sea: grass to the edge and then a fall of thirteen metres of pale stone to the swell, the highest shore the island has, with rock fallen at its foot and sea-plungers working the water off it.' }),
  freeze({ id: 'selemis-channel', name: 'The Nocveth', x: CHANNEL_VIEW.x, z: CHANNEL_VIEW.z,
    description: 'The channel between the island and the tip of the Ascarth Peninsula, from the cliff top on its southern shore: sixty metres of deep water at its narrowest, with the peninsula’s cliffs standing on the far side of it. Nocveth is the Selemi word for a crossing.' }),
]);
