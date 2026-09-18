/**
 * West Izol, and Izolveth, as places.
 *
 * Pure: no three, no DOM. `src/izol-scenery.js` builds what is described here,
 * `src/izol-people.js` speaks for it, `src/izol-host.js` is main.js's one hook,
 * and the charts and the tests read the same numbers.
 *
 * What the lore gave (`../world-builder/azhora_lore/geography/regions/izol.md`):
 * the island is rock; the coast is the productive zone and the towns sit on the
 * small flats where a river reached the sea; headland country separates every
 * community from the next; the interior rises to three isolated peaks, the Three
 * Presences, each with a shrine kept by the highland tribes; the confederation is
 * tribes and towns, equal before the goddess, with an Assembly that binds because
 * it is sworn at the Hearthstone where all three presences can witness it — and
 * **no capital**. Izolveth is named there as the island's largest town, on the
 * north-western coast, the point of contact with the Svaleen and the channel,
 * with Svaleen merchant houses in it and a Selemi outpost on terms that satisfy
 * neither side and have not been renegotiated in forty years.
 *
 * What `docs/izol-and-the-triumvirate.md` gave: the Selemi war of 978, the taking
 * of Selemis in 979, and the three generals who hold Izol between them in 980.
 * Their names are in `IZOL_GENERALS` and nowhere else, so they are one edit to
 * rename.
 *
 * What the atlas gave: twenty-one hexes, q 3-8, r 125-130 — eleven grassland,
 * five hills, five plains. The north coast is a run of hex-pointed headlands with
 * a small cove between each pair, which is exactly the coast the lore describes,
 * and one hex (6, 125) stands out into the sea on its own: the headland that
 * shelters Izolveth's harbour. The plains are inland and low: the Long Pasture.
 *
 * Everything below is authored **directly in world metres** (100 m per hex), like
 * Pueth and Peblos and for the same reason: West Izol never existed in the old
 * 56 m frame, and its ground is measured from the waterline, which no cluster of
 * `world-scale.js` describes. If the world scale changes again, West Izol's
 * places need clusters of their own.
 */
import {
  IZOLVETH_TERRACE, IZOL_CAMP_GROUND, ARDVETH_SHELF, KELVATH_SHELF,
  landDistance, insideRegion,
} from './region-world.js';

const freeze = Object.freeze;
const point = (x, z) => freeze({ x, z });

// ---------------------------------------------------------------------------
// The triumvirate
// ---------------------------------------------------------------------------
/**
 * The three generals who hold Izol. **The only place their names appear**: the
 * people, the banners, the tests and the report all read them from here, so the
 * user renaming one is a one-line change.
 *
 * `home` is true of the general who is on the island in person. Kellveth is on
 * the island only if Solis was lost, which is Chapter 2's outcome
 * (`generalsStance`), so the flag is computed, never stored.
 */
export const IZOL_GENERALS = freeze([
  freeze({ id: 'kellveth', name: 'Orsen Kellveth', rank: 'General', party: 'the towns',
    banner: '#3f6fb0', emblem: '#e9e2c6', seat: 'Solis',
    note: 'Town-born, out of the coastal commercial towns. He argues, he bargains, and he keeps his agreements past the point where breaking them would pay, which is the Izoli reputation and which he uses.' }),
  freeze({ id: 'doreth', name: 'Tavren Doreth', rank: 'General', party: 'the sea',
    banner: '#2f7f7a', emblem: '#f0e4c0', seat: 'Selemis',
    note: 'Occupies Selemis and cannot leave it: the moment he does the Selemi take it back. He commands the sea and is a prisoner of it.' }),
  freeze({ id: 'marech', name: 'Hesk Marech', rank: 'General', party: 'the highlands',
    banner: '#6b5540', emblem: '#d9c79c', seat: 'the siege lines before Nylon',
    note: 'The highland general, and the best army of the three. Territorial claim, oath, and no patience at all for the coastal towns’ arithmetic.' }),
]);
export const generalById = id => IZOL_GENERALS.find(entry => entry.id === id) ?? null;

/**
 * Where the three generals stand when the traveler reaches West Izol.
 *
 * `control` is the occupation map (`occupationControl`). Chapter 2 decides who
 * holds Solis: the Coalition keeps it if the traveler helped it win the border
 * battle, and the Legion takes it back if the traveler helped the Empire. Solis
 * held is Kellveth's command; Solis lost and he is home in West Izol, a general
 * without an army and with everything to prove.
 */
export function generalsStance(control = {}) {
  const solis = control['West Suval'];
  const kellvethHome = solis === 'empire';
  return freeze({ solisHeld: !kellvethHome, kellvethHome, solis: solis ?? 'coalition' });
}

// ---------------------------------------------------------------------------
// Izolveth: the town's own frame
// ---------------------------------------------------------------------------
/**
 * The town stands on made ground (`IZOLVETH_TERRACE`) in the notch between two
 * rock knobs, climbing from the quay at the water to the meeting house at the
 * back. `P(a, b)` is `a` metres east and `b` metres south of the terrace's
 * centre, so the streets run square to the world and along the water.
 */
export const IZOLVETH = freeze({
  id: 'izolveth', name: 'Izolveth', centre: point(IZOLVETH_TERRACE.x, IZOLVETH_TERRACE.z),
  terrace: IZOLVETH_TERRACE, halfA: IZOLVETH_TERRACE.halfX, halfB: IZOLVETH_TERRACE.halfZ, radius: 62,
});
export const P = (a, b) => point(IZOLVETH.centre.x + a, IZOLVETH.centre.z + b);
/** The terrace's own plane: the ground under the town before anything is built on it. */
export const terraceHeight = b => IZOLVETH_TERRACE.level + b * IZOLVETH_TERRACE.slopeZ;

// ---------------------------------------------------------------------------
// The harbour
// ---------------------------------------------------------------------------
/**
 * The quay is a rectangle of dressed granite laid out over the cove; the two
 * moles run out from the rock knobs on either side of it and leave a mouth
 * twenty-six metres wide facing the channel. Their decks are standable ground,
 * as Cobble's quay is (`izolDeckHeight`, hooked into `world.js`'s `heightAt`).
 */
export const IZOL_QUAY = freeze({
  id: 'izolveth-quay', name: 'The Long Quay',
  minX: 30, maxX: 80, minZ: 1712, maxZ: 1730, deckY: 2.9,
  /** Where a ship's boat sets the traveler ashore, and the boards they land on. */
  landing: point(56, 1725),
  bollards: freeze([point(34, 1715), point(45, 1715), point(56, 1715), point(67, 1715), point(77, 1715),
    point(34, 1728), point(68, 1728)]),
  capstan: point(77, 1727),
  /** The timber gallows crane at the quay's middle, that the army's stores go up and down on. */
  crane: point(64, 1719),
  steps: point(31.5, 1723),
});

const mole = (id, name, points, half, deckY) => freeze({ id, name, points: freeze(points.map(([x, z]) => point(x, z))), half, deckY });
/** The two moles, west and east, and the boom chain between their heads. */
export const IZOL_MOLES = freeze([
  mole('west-mole', 'The Long Mole', [[14, 1722], [8, 1698], [14, 1676], [34, 1664]], 3.4, 2.9),
  mole('east-mole', 'The Short Mole', [[88, 1724], [90, 1702], [84, 1682], [60, 1668]], 3.4, 2.9),
]);
export const IZOL_BOOM = freeze({ id: 'izolveth-boom', name: 'The harbour boom',
  a: point(34, 1664), b: point(60, 1668) });
/** The sheltered water inside the moles. */
export const IZOL_BASIN = freeze({ centre: point(52, 1696), radius: 46 });

/** Distance from a point to a mole's centre line. */
export function moleDistance(moleEntry, x, z) {
  let best = Infinity;
  const points = moleEntry.points;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - a.x - dx * t, z - a.z - dz * t));
  }
  return best;
}

/** The height of the quay or a mole deck at a point, or null where there is neither. */
export function izolDeckHeight(x, z) {
  const q = IZOL_QUAY;
  if (x >= q.minX && x <= q.maxX && z >= q.minZ && z <= q.maxZ) return q.deckY;
  for (const entry of IZOL_MOLES) if (moleDistance(entry, x, z) <= entry.half) return entry.deckY;
  return null;
}

/**
 * The ships in the harbour. Five hulls, and the war is written on all of them:
 * two Izoli, one Suvali transport, one Selemi hull under a prize crew from 979,
 * and one Ambroni bottom taken at Solis.
 */
const ship = (id, name, x, z, yaw, length, beam, banner, note) =>
  freeze({ id, name, x, z, yaw, length, beam, banner, note });
export const IZOL_SHIPS = freeze([
  ship('gannet', 'The Gannet', 38, 1708, 0, 16, 4.6, 'izoli',
    'Izoli, out of Izolveth. She runs the channel in weather that keeps the Svaleen at their moorings.'),
  ship('serrow', 'The Serrow', 56, 1707.5, 0, 17, 4.8, 'izoli',
    'Izoli, out of Solne, on a charter her master signed at the Stone and has regretted since.'),
  ship('cormel', 'The Cormel', 74, 1708, 0, 15, 4.4, 'suval',
    'A Suvali transport with the companies’ baggage in her and a Suvali master who wants paying.'),
  ship('anwyl', 'The Anwyl', 36, 1687, 1.35, 19, 5.2, 'selemis',
    'Selemi-built, Selemi-rigged, and taken in 979 with the city. She flies the Selemi colours because Selemis is in the Coalition, and she sails where Izol says.'),
  ship('tarrow', 'The Tarrow', 68, 1690, 1.6, 15, 4.4, 'ambroni-rebels',
    'Ambroni-built, taken at Solis, and crewed by Ambroni who would rather be sailing her against Ambron.'),
]);

/** The slip on the west horn where the town's own boats are drawn out. */
export const IZOL_SLIP = freeze({ ...point(20, 1733), yaw: -0.35 });

// ---------------------------------------------------------------------------
// The town
// ---------------------------------------------------------------------------
/**
 * Buildings, in the town's frame. `a`/`b` centre, `w` along a, `d` along b, `h`
 * to the eaves. Izolveth is built of the island: dark granite below, lime-washed
 * rubble above, slate roofs weighted against the channel wind. Nothing here is
 * marble, and nothing here is a palace.
 */
export const IZOLVETH_BUILDINGS = freeze([
  // The strand: what the port does for a living.
  { id: 'warehouse-1', name: 'The west warehouse', a: -23, b: -33, w: 14, d: 9, h: 5.4, kind: 'warehouse' },
  { id: 'warehouse-2', name: 'The middle warehouse', a: -5, b: -33, w: 13, d: 9, h: 5.4, kind: 'warehouse' },
  { id: 'commissary', name: 'The commissary', a: 13, b: -33, w: 13, d: 9, h: 5.4, kind: 'warehouse',
    note: 'A cooper’s warehouse until spring. The army keeps its stores in it now, and the cooper keeps his outside.' },
  { id: 'fish-market', name: 'The fish market', a: 27, b: -34, w: 9, d: 11, h: 4.2, kind: 'open-shed' },
  { id: 'sail-loft', name: 'The sail loft', a: -25, b: -13, w: 15, d: 11, h: 6.6, kind: 'loft',
    note: 'Two floors, the upper one one long room with light on three sides, which is why it is the army’s hospital now.' },
  { id: 'harbour-office', name: 'The harbour office', a: -7, b: -20, w: 8, d: 6, h: 4.4 },
  // The Svaleen houses: tall, narrow, and not in the island's style.
  { id: 'svaleen-house-1', name: 'A Svaleen merchant house', a: 8, b: -11, w: 7, d: 7.5, h: 7.6, kind: 'tall' },
  { id: 'svaleen-house-2', name: 'A Svaleen merchant house', a: 17.5, b: -11, w: 6.5, d: 7.5, h: 7.2, kind: 'tall' },
  // The Selemi outpost: one building inside its own wall, on terms nobody has renegotiated in forty years.
  { id: 'selemi-outpost', name: 'The Selemi outpost', a: 25, b: -1, w: 7.5, d: 7.5, h: 5, kind: 'compound' },
  // The town itself, climbing.
  { id: 'inn', name: 'The Channel House', a: -22, b: 3, w: 13, d: 10, h: 6, door: 'north' },
  { id: 'house-1', a: -8, b: 2, w: 8, d: 7, h: 4.8 },
  { id: 'house-2', a: 3, b: 2, w: 7.5, d: 7, h: 5 },
  { id: 'house-3', a: 12, b: 6, w: 8, d: 7.5, h: 4.9 },
  { id: 'house-4', a: -26, b: 18, w: 8.5, d: 7.5, h: 5 },
  { id: 'house-5', a: -16, b: 30, w: 8, d: 7, h: 4.8 },
  { id: 'house-6', a: -4, b: 32, w: 7.5, d: 7, h: 5.1 },
  { id: 'house-7', a: 8, b: 33, w: 8, d: 7.5, h: 4.9 },
  { id: 'house-8', a: 22, b: 30, w: 8.5, d: 7, h: 5 },
  { id: 'house-9', a: 25, b: 14, w: 7.5, d: 8, h: 4.8 },
  { id: 'net-store', name: 'The net store', a: -27, b: 31, w: 9, d: 6, h: 4 },
].map(entry => freeze({ kind: 'house', ...entry })));

/**
 * The meeting house: where the towns of the confederation send representatives
 * when they meet on this coast. It is deliberately the plainest public building
 * in the game — a long low hall with a porch of undressed posts, a slate roof
 * weighted with stones, one door, and benches in a ring inside. Longer than a
 * warehouse and lower. No dais, no throne, no gate, because there is no capital
 * and the Izoli do not want anybody getting the idea that there is.
 */
export const MEETING_HOUSE = freeze({
  id: 'meeting-house', name: 'The Meeting House', a: -7, b: 19, w: 22, d: 11, h: 4.6,
  door: freeze({ a: -7, b: 13.2 }), posts: freeze([-16, -11.5, -7, -2.5, 2]),
  benches: freeze([[-14, 16], [-14, 22], [0, 16], [0, 22], [-7, 23.5]]),
});

/**
 * The Stone of Izol: a block of the island's own rock, left standing where the
 * cutting for the town found it, with a dry-stone ring round it and one gap in
 * the ring. No roof, no image, no altar, no priest. The rock of the island is
 * the goddess in a sense the Izoli mean literally, so the shrine is a piece of
 * her that nobody moved.
 */
export const IZOL_STONE = freeze({
  id: 'izol-stone', name: 'The Stone of Izol', a: 15, b: 20, ringRadius: 6.4, gap: 0.9,
  height: 2.4, width: 1.5, depth: 1.2, keeper: freeze({ a: 9, b: 25.5 }),
});

/** The open ground between the hall and the stone, where the town meets in the open when it is dry. */
export const OATH_GROUND = freeze({ a: 6, b: 18, halfA: 15, halfB: 10 });

/** A long open-sided roof on posts where cable for three armies is laid. Walkable between the posts. */
export const IZOL_ROPEWALK = freeze({ id: 'ropewalk', name: 'The ropewalk', b: -25, fromA: -28, toA: 28, halfWidth: 2.3, h: 3.2, postStep: 4 });

/** Streets, in the town's frame: `points` are [a, b] pairs. */
export const IZOLVETH_STREETS = freeze([
  freeze({ id: 'the-strand', width: 7, points: freeze([[-30, -40], [-8, -40.5], [14, -40], [31, -39]]) }),
  freeze({ id: 'market-lane', width: 4.4, points: freeze([[-30, -17], [-6, -17.5], [20, -17], [31, -15]]) }),
  freeze({ id: 'stair-street', width: 5, points: freeze([[1, -39], [2, -22], [3, -6], [4, 10], [5, 26], [6, 41]]) }),
  freeze({ id: 'oath-lane', width: 4, points: freeze([[-28, 12], [-8, 12.5], [12, 13], [30, 12]]) }),
  freeze({ id: 'east-lane', width: 3.4, points: freeze([[26, -36], [27, -24], [27, -11]]) }),
  freeze({ id: 'west-lane', width: 3.4, points: freeze([[-27, -36], [-28, -18], [-27, 4], [-28, 24], [-27, 34]]) }),
]);

/** The trodden working ground: net frames, fish trestles, stacked casks, the tar pot and the town's cistern. */
export const IZOLVETH_WORKING = freeze({
  netFrames: freeze([P(-31, -34), P(-31, -27), P(-31, -20)]),
  trestles: freeze([P(24, -39), P(29.5, -39), P(24, -30), P(29.5, -30)]),
  casks: freeze([P(11, -39), P(14, -38), P(17, -39), P(8, -37.5), P(20, -37.5)]),
  crates: freeze([P(5, -38), P(2, -37), P(-12, -39), P(-15, -38)]),
  tarPot: P(19, -6),
  cistern: P(-2, 6),
  /** Peat and driftwood stacked against the back walls of the upper town: there is no firewood on Izol. */
  peatStacks: freeze([P(-21, 26), P(-9, 27), P(15, 27), P(27, 25)]),
  barrows: freeze([P(-12, 18), P(19, 8)]),
  /** The army's tally table outside the commissary: the friction, made visible. */
  tally: P(13, -38),
});

/**
 * The three generals' recruiting stands, on the strand where men are taken. Each
 * is a board on two posts with a pennon over it and a man beside it, and the
 * three of them stand within thirty metres of each other, which is the whole
 * situation in one sentence.
 */
export const RECRUITING_STANDS = freeze([
  freeze({ general: 'kellveth', ...P(13, -44.5), yaw: 0, board: 'For Solis, and the road to the Moros' }),
  freeze({ general: 'doreth', ...P(-4, -44.5), yaw: 0, board: 'Hulls and hands for Selemis' }),
  freeze({ general: 'marech', ...P(-19, -44.5), yaw: 0, board: 'The levy for the lines before Nylon' }),
]);

// ---------------------------------------------------------------------------
// The army the town shelters
// ---------------------------------------------------------------------------
/**
 * The Coalition's camp stands on the pasture above the town, not in it — but the
 * town is full of soldiers all the same: the sail loft is a hospital, the
 * commissary is requisitioned, and the ropewalk lays cable for the fleet instead
 * of for the boats. `C(a, b)` is the camp's own frame.
 *
 * The lore is emphatic that the confederation has no army. It has one now, and
 * this is how: town contingents and highland levies, each sworn at the
 * Hearthstone in the goddess's name, and hulls hired from Selemis before 978 and
 * taken from her after. The oath is the whole machinery — which is why everyone
 * on this island is frightened of a general who might break one.
 */
export const IZOL_CAMP = freeze({
  id: 'izolveth-camp', name: 'The Coalition Camp', centre: point(IZOL_CAMP_GROUND.x, IZOL_CAMP_GROUND.z),
  minA: -54, maxA: 52, minB: -24, maxB: 24, gate: freeze([-6, 6]),
  drill: freeze({ a: -34, b: 0, halfA: 17, halfB: 19 }),
  fire: freeze({ a: 30, b: 18 }),
  horseLine: freeze({ a: 45, b: -16 }),
  contingents: freeze([
    { id: 'izoli', name: 'The Izoli spearmen', banner: '#3f6fb0', emblem: '#e9e2c6',
      tents: [[-2, -18], [4, -18], [10, -18], [16, -18], [22, -18], [-2, -10], [4, -10], [10, -10], [16, -10], [22, -10]], flag: [-7, -14] },
    { id: 'suval', name: 'The Suvali companies', banner: '#6a7f3e', emblem: '#e1c77b',
      tents: [[-2, 0], [4, 0], [10, 0], [16, 0], [-2, 8], [4, 8], [10, 8]], flag: [-7, 4] },
    { id: 'ambroni-rebels', name: 'The Ambroni rebels', banner: '#7d3f58', emblem: '#e4d6b0',
      tents: [[-2, 16], [4, 16], [10, 16], [16, 16], [22, 16], [22, 8]], flag: [-7, 14] },
    { id: 'selemis', name: 'Selemis', banner: '#2f7f7a', emblem: '#f0e4c0', tents: [[34, -18], [40, -18], [46, -18]], flag: [30, -21],
      note: 'Three tents, pitched apart from the rest, of a contingent from a city the Izoli took the year before last.' },
    { id: 'marosh', name: 'Marosh', banner: '#b0773a', emblem: '#3b2a1e', tents: [[34, -6], [40, -6], [46, -6]], flag: [30, -9] },
    { id: 'island-cities', name: 'The island cities', banner: '#3f9a6b', emblem: '#f3d27a', tents: [[34, 6], [40, 6], [46, 6]], flag: [30, 3] },
    { id: 'pyros', name: 'Pyros', banner: '#9a3a26', emblem: '#f1b24a', tents: [[36, 18]], flag: [31, 15] },
  ].map(entry => freeze({ ...entry, tents: freeze(entry.tents.map(([a, b]) => freeze({ a, b }))), flag: freeze({ a: entry.flag[0], b: entry.flag[1] }) }))),
  tent: freeze({ w: 4, d: 4.6 }),
});
export const C = (a, b) => point(IZOL_CAMP.centre.x + a, IZOL_CAMP.centre.z + b);

const boxCollider = (origin, a0, a1, b0, b1, kind) => freeze({
  x: origin.x + (a0 + a1) / 2, z: origin.z + (b0 + b1) / 2,
  hx: Math.abs(a1 - a0) / 2, hz: Math.abs(b1 - b0) / 2, kind });

/** The camp's picket line, open at its west gate where the road comes up from the town. */
export function campPicketColliders() {
  const { minA, maxA, minB, maxB, gate } = IZOL_CAMP, t = .12, o = IZOL_CAMP.centre;
  return [
    boxCollider(o, minA, maxA, minB - t, minB + t, 'izol-camp-picket'),
    boxCollider(o, minA, maxA, maxB - t, maxB + t, 'izol-camp-picket'),
    boxCollider(o, minA - t, minA + t, minB, gate[0], 'izol-camp-picket'),
    boxCollider(o, minA - t, minA + t, gate[1], maxB, 'izol-camp-picket'),
    boxCollider(o, maxA - t, maxA + t, minB, maxB, 'izol-camp-picket'),
  ];
}
export function campTentColliders() {
  const { tent } = IZOL_CAMP, o = IZOL_CAMP.centre;
  return IZOL_CAMP.contingents.flatMap(group => group.tents.map(spot =>
    boxCollider(o, spot.a - tent.w / 2, spot.a + tent.w / 2, spot.b - tent.d / 2, spot.b + tent.d / 2, 'izol-camp-tent')));
}

// ---------------------------------------------------------------------------
// The rest of West Izol
// ---------------------------------------------------------------------------
/** Ardveth: the fishing cove down the west coast, and the island's second town the traveler can reach. */
export const ARDVETH = freeze({
  id: 'ardveth', name: 'Ardveth', centre: point(ARDVETH_SHELF.x, ARDVETH_SHELF.z), radius: 28,
  shelf: ARDVETH_SHELF,
  cottages: freeze([[-96, 1806], [-82, 1804], [-74, 1806], [-95, 1829], [-80, 1830], [-68, 1823]].map(([x, z]) => point(x, z))),
  shrine: point(-101, 1818),
  hulls: freeze([point(-106, 1810), point(-105, 1826), point(-110, 1818)]),
  racks: freeze([point(-88, 1811), point(-88, 1826)]),
});

/** The boatyard in Kelvath Cove, the next cove east of the headland: reachable by sea, awkwardly by land. */
export const KELVATH = freeze({
  id: 'kelvath', name: 'Kelvath Cove', centre: point(KELVATH_SHELF.x, KELVATH_SHELF.z), radius: 24,
  shelf: KELVATH_SHELF,
  slip: point(250, 1737), stocks: point(243, 1747), shed: point(258, 1751),
  sawPit: point(238, 1755), tarPot: point(255, 1742),
});

/** The Sea Gate: the town's older shrine, in the cleft at the head of the harbour headland. */
export const SEA_GATE = freeze({ id: 'sea-gate', name: 'The Sea Gate', ...point(148, 1668), ringRadius: 6.6 });

/**
 * The Sightstone, on the shoulder of the road inland: a flat rock where all three
 * Presences stand up at once. It is not the Hearthstone — that is further in, at
 * the island's centre, in country this build does not reach — but it is the place
 * the road makes a traveler stop, and every Izoli who uses the road does.
 */
export const SIGHTSTONE = freeze({ id: 'sightstone', name: 'The Sightstone', ...point(380, 1802) });

/**
 * The Three Presences, drawn where the atlas puts the high ground of East Izol.
 * The lore names them only as a set; the highland tribes have their own names for
 * each and do not translate them, which is what the people of Izolveth tell a
 * traveler who asks.
 */
export const THREE_PRESENCES = freeze([
  // Close enough to the Sightstone to read through the fog, and far enough from the
  // town that Izolveth sees only the nearest of them on a clear day. The northern one
  // stands on the atlas's own mountain hex in East Izol, (10, 125).
  freeze({ id: 'presence-north', ...point(520, 1690), topY: 122, width: 96, depth: 82, lean: -5, phase: .3 }),
  freeze({ id: 'presence-east', ...point(588, 1866), topY: 136, width: 92, depth: 84, lean: 4, phase: 1.4 }),
  freeze({ id: 'presence-south', ...point(566, 1990), topY: 116, width: 86, depth: 76, lean: -2, phase: 2.6 }),
]);

/** The Long Pasture: the low inland basin the atlas authored as plains, where the highland flocks come down. */
export const LONG_PASTURE = freeze({ id: 'long-pasture', name: 'The Long Pasture', ...point(268, 1958),
  fold: point(268, 1958), cairn: point(296, 1936) });

// ---------------------------------------------------------------------------
// Roads and paths
// ---------------------------------------------------------------------------
/**
 * The Hearth Road: the only made road on this side of the island. It leaves the
 * top of Izolveth, runs inland past the Coalition's camp and over the shoulder to
 * the Sightstone, and goes on east toward the island's centre and the Hearthstone,
 * which is outside the built world.
 */
export const IZOL_ROAD = freeze([
  P(6, 42), point(76, 1836), point(110, 1844), point(146, 1850), point(184, 1852),
  point(222, 1846), point(258, 1836), point(296, 1826), point(332, 1818), point(362, 1810),
  point(392, 1808), point(428, 1822), point(462, 1852), point(492, 1892),
]);

/** The spur from the road up to the camp's west gate. */
export const CAMP_SPUR = freeze([point(146, 1850), point(128, 1852), point(112, 1860), point(106, 1874), point(112, 1886), point(131, 1886)]);
/** The coast path west to Ardveth, over the shoulder: the lore's headland country, on foot. */
export const ARDVETH_PATH = freeze([P(-30, 11), point(14, 1794), point(-6, 1798), point(-32, 1804), point(-58, 1810), point(-67, 1811)]);
/** The path up the headland to the Sea Gate, from the east end of the quay. */
export const SEA_GATE_PATH = freeze([point(86, 1731), point(100, 1716), point(116, 1700), point(132, 1682), point(146, 1672)]);
/** The track east over the headland's root to the boatyard in Kelvath Cove. */
export const KELVATH_PATH = freeze([P(28, 6), point(104, 1790), point(140, 1784), point(178, 1776), point(214, 1762), point(236, 1762), point(248, 1755)]);

/** Every path West Izol adds, as world polylines with the width they are drawn at. */
export const IZOL_PATHS = freeze([
  freeze({ id: 'hearth-road', width: 4.2, points: IZOL_ROAD }),
  freeze({ id: 'camp-spur', width: 3, points: CAMP_SPUR }),
  freeze({ id: 'ardveth-path', width: 2.2, points: ARDVETH_PATH }),
  freeze({ id: 'sea-gate-path', width: 1.9, points: SEA_GATE_PATH }),
  freeze({ id: 'kelvath-path', width: 2.4, points: KELVATH_PATH }),
]);

/** Fingerposts, in the island's plain style. */
export const IZOL_SIGNS = freeze([
  freeze({ ...P(15, 41), label: 'The Hearth Road', returnLabel: 'Izolveth', yaw: 0 }),
  freeze({ ...point(148, 1845), label: 'The camp', returnLabel: 'Izolveth', yaw: -1.5 }),
  freeze({ ...point(16, 1790), label: 'Ardveth', returnLabel: 'Izolveth', yaw: Math.PI / 2 }),
  freeze({ ...point(106, 1786), label: 'Kelvath Cove', returnLabel: 'Izolveth', yaw: -Math.PI / 2 }),
]);

// ---------------------------------------------------------------------------
// Where everyone stands
// ---------------------------------------------------------------------------
const stand = (a, b, yaw) => freeze({ ...P(a, b), yaw });
const campStand = (a, b, yaw) => freeze({ ...C(a, b), yaw });
const at = (x, z, yaw) => freeze({ ...point(x, z), yaw });
const NORTH = Math.PI, SOUTH = 0, EAST = Math.PI / 2, WEST = -Math.PI / 2;

export const IZOL_STANDS = freeze({
  // The confederation, on the oath ground at the top of the town.
  'izol-speaker': stand(-9.25, 11.2, SOUTH),                 // under the porch, between two of its posts, facing the harbour
  'izol-clerk': stand(-15, 10.4, SOUTH),
  'izol-solne-representative': stand(5.5, 15, WEST),
  'izol-highland-representative': stand(-2.5, 27, NORTH),
  'izol-keeper': stand(IZOL_STONE.keeper.a, IZOL_STONE.keeper.b, EAST),
  // General Kellveth, out only when Solis has been lost and he has come home.
  'izol-general-kellveth': stand(-3, 8, SOUTH),
  // The harbour.
  'izol-harbourmaster': at(62, 1727, NORTH),
  'izol-quay-runner': at(46, 1726.5, WEST),
  'izol-netmaker': stand(-22, -24, SOUTH),
  'izol-fishwife': stand(26.5, -36.5, WEST),
  'izol-sail-mistress': stand(-25, -6.5, SOUTH),
  'izol-master-gannet': at(39, 1713.5, NORTH),
  'izol-master-serrow': at(72, 1713.5, NORTH),
  // The outsiders who live here.
  'izol-svaleen-merchant': stand(12.5, -6.5, SOUTH),
  'izol-selemi-factor': stand(19.2, 0, EAST),
  // The three generals' men, on the strand within thirty metres of each other.
  'izol-quartermaster': stand(13, -42.5, NORTH),
  'izol-doreth-agent': stand(-4, -42.5, NORTH),
  'izol-marech-serjeant': stand(-19, -42.5, NORTH),
  // The army.
  'izol-surgeon': stand(-25, -21, SOUTH),                    // at the loft's door, facing the stairs she carries water up
  'izol-captain-izoli': campStand(-16, 0, WEST),
  'izol-serjeant-suval': campStand(-8, 6, EAST),
  'izol-rebel-officer': campStand(-8, 14, EAST),
  'izol-marosh-spearman': campStand(29, -6, EAST),
  // Down the coast.
  'izol-ardveth-elder': at(-92, 1818, WEST),
  'izol-boatwright': at(248, 1743, EAST),
});

export const IZOL_NPC_POSITIONS = freeze(
  Object.fromEntries(Object.entries(IZOL_STANDS).map(([id, spot]) => [id, point(spot.x, spot.z)])));

// ---------------------------------------------------------------------------
// Places and the chart
// ---------------------------------------------------------------------------
export const IZOL_LANDMARKS = freeze([
  freeze({ id: 'izolveth', name: 'Izolveth', ...IZOLVETH.centre, radius: 58,
    description: 'The largest town on the island of Izol, and not its capital, because the island has none: a quay and two moles under a headland, warehouses and a ropewalk on the strand, slate roofs climbing the cut behind them, and a meeting house at the top that is plainly not a palace.' }),
  freeze({ id: 'izolveth-harbour', name: 'The Harbour of Izolveth', ...point(52, 1698), radius: 40,
    description: 'Two moles built out of the rock on either side of the cove, a mouth twenty-six metres wide with a boom chain across it, and five hulls at the quay under four different flags. Beyond the moles the Izoli Channel, and the Svaleen coast on a day that lets it show.' }),
  freeze({ id: 'izolveth-quay', name: 'The Long Quay', ...point(57, 1723), radius: 14,
    description: 'Dressed granite laid out over the cove, a timber gallows crane at its middle, bollards worn round by forty years of warp. Everything three armies eat goes over these boards, and the town counts every barrel of it.' }),
  freeze({ id: 'meeting-house', name: 'The Meeting House', ...P(MEETING_HOUSE.a, MEETING_HOUSE.b - 8),
    description: 'A long low hall with a porch of undressed posts and a slate roof weighted with stones. The towns send representatives here when they meet on this coast; twice a year they meet instead at the Hearthstone in the island’s centre, which is a rock in a field. There is no throne in Izol and nowhere to put one.' }),
  freeze({ id: 'izol-stone', name: 'The Stone of Izol', ...P(IZOL_STONE.a, IZOL_STONE.b),
    description: 'A block of the island’s own dark rock, left standing where the cutting for the town found it, with a ring of dry stone round it and one gap in the ring. No image, no altar, no priest. The Izoli say the rock of the island is the goddess, and they do not mean it as a figure of speech.' }),
  freeze({ id: 'izolveth-camp', name: 'The Coalition Camp', ...IZOL_CAMP.centre, radius: 58,
    description: 'Tent lines on the pasture above the town under the banners of Izol, Suval, the Ambroni rebels, Selemis, Marosh, the island cities and one tent of Pyros. A drill ground trodden to bare rock, a horse line, and an army eating an island that grows very little.' }),
  freeze({ id: 'sea-gate', name: 'The Sea Gate', ...point(SEA_GATE.x, SEA_GATE.z),
    description: 'A cleft in the rock at the head of the harbour headland, ringed with stones, with the channel on three sides of it. Boats are spoken for here going out and thanked here coming in, and what is said is not about fish.' }),
  freeze({ id: 'ardveth', name: 'Ardveth', ...ARDVETH.centre, radius: 30,
    description: 'Six roofs and a shingle beach in the next cove but one, facing the open channel. Ardveth sends its own representative to the Assembly and does not think of itself as smaller than Izolveth, only as fewer.' }),
  freeze({ id: 'kelvath', name: 'The Boatyard at Kelvath Cove', ...KELVATH.centre, radius: 24,
    description: 'A slip, a saw pit and a hull on the stocks with its frames up and no planking on them. The yard has been building the same boat since spring, because the generals bought every length of cable on the island.' }),
  freeze({ id: 'sightstone', name: 'The Sightstone', ...point(SIGHTSTONE.x, SIGHTSTONE.z),
    description: 'A flat rock on the shoulder of the Hearth Road where all three Presences stand up at once. Not the Hearthstone, which is further in; but every Izoli who walks this road stops here, and so will you.' }),
  freeze({ id: 'long-pasture', name: 'The Long Pasture', ...point(LONG_PASTURE.x, LONG_PASTURE.z), radius: 26,
    description: 'The low ground in the middle of the western half, where the highland flocks come down in the dry months. A dry-stone fold, a cairn, and the only level grass on this side of the island that nobody had to cut.' }),
]);

/** Ground West Izol's own scatter keeps clear of. */
export const IZOL_CLEARINGS = freeze([
  freeze({ ...IZOLVETH.centre, r: 66 }),
  freeze({ ...point(52, 1700), r: 52 }),
  freeze({ ...IZOL_CAMP.centre, r: 64 }),
  freeze({ ...ARDVETH.centre, r: 32 }),
  freeze({ ...KELVATH.centre, r: 26 }),
  freeze({ ...point(SEA_GATE.x, SEA_GATE.z), r: 14 }),
  freeze({ ...point(SIGHTSTONE.x, SIGHTSTONE.z), r: 12 }),
  freeze({ ...point(LONG_PASTURE.x, LONG_PASTURE.z), r: 18 }),
]);

/** True inside the town's own ground, where the regional scatter must not grow. */
export const inIzolveth = (x, z, margin = 0) =>
  Math.abs(x - IZOLVETH.centre.x) < IZOLVETH.halfA + 8 + margin && Math.abs(z - IZOLVETH.centre.z) < IZOLVETH.halfB + 8 + margin;

/**
 * The sea round West Izol for the charts: a row every twelve metres from the
 * western edge of the chart to the island's own shore, so the island reads as an
 * island. The land itself is painted back over it from `world.mapLands`.
 */
export const IZOL_SEA = (() => {
  const west = -420, rows = [];
  for (let z = 1596; z <= 2204; z += 12) {
    let x = west;
    while (x < 600 && !(landDistance(x, z) >= 0 && insideRegion('West Izol', x, z))) x += 6;
    rows.push(point(x < 600 ? x : west + 30, z));
  }
  return freeze([point(west, rows[0].z), ...rows, point(west, rows.at(-1).z)]);
})();
