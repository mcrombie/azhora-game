/**
 * Telemonia: the ground of the Telemon highland, as pure numbers - stage 1, the country and not its
 * people (docs/telemonia-stage1-brief.md).
 *
 * Pure: no three, no DOM. `src/world/terrain/world-terrain.js` lays the ground to it (`telemoniaGround`) and colours
 * it by it (`telemoniaTint`); `src/content/regions/telemonia/telemonia-scenery.js` draws the rim's own finer ground, the wall,
 * the terraces' walls and what grows; the chart, the wildlife and the tests read the same numbers.
 *
 * **What the atlas gives** (it is the authority; the lore was rewritten to it on 2026-10-01):
 *  - **Twenty-five hexes**, rows 118-122, q -17...-11: seventeen `hills` on every edge and eight
 *    `plains` in the middle - (-14,119) (-13,119) / (-15,120) (-14,120) (-13,120) / (-15,121) (-14,121)
 *    (-13,121). The ring of hills round the plains is the lore's bowl, and the atlas drew it.
 *  - **Climate** `BSh` on twenty-three and `Csb` on two, (-12,121) and (-13,122), the south-east corner
 *    (`TELEMONIA_CLIMATE`, read off the World Builder map hex by hex).
 *  - **Neighbours**: the Oves Desert (12 edges, north), Gala (9, east), Legemum (9, south) and East
 *    Pyros (8, west). No river inside; the Caelin on five of the Oves edges and the Treloss on seven of
 *    Gala's, both already built by their own countries (src/content/regions/western-regions/west-regions.js) and joined, not rebuilt.
 *
 * **What the lore gives** (`world-builder/azhora_lore/geography/regions/telemonia.md` and
 * `peoples/the_telemon.md`): "a bowl with a thick rim. The rim is rock: ridge behind ridge, running
 * northeast to southwest, bare along the crests and broken by cliff bands ... The valleys between the
 * ridges are narrow, funnel movement ... The passes through the rim are few ... Inside the rim the
 * ground levels into a single enclosed plain, the Galmeth ... and in the middle of the plain stands the
 * rock that carries Kethorn" - "a rock with cliff on three sides and a wall closing the fourth". The
 * terraces "step the inner faces of the rim from the cliff foot down to the plain". "Bunch grass,
 * wormwood and thorn on the slopes, grey scrub oak and juniper in the folds where a little soil has
 * collected, bare stone above"; the Belketh, "the wooded edge", in the south-eastern corner. No river
 * inside: "the washes that drain the rim run for a few days after rain ... and are dry stone by
 * midsummer. The Telemon build nothing in a wash." The god sits on the Rothkar, "the highest rock of the
 * rim". And the user's own words: "rockier and more elevated so there is room for terrace farming and
 * rock based defenses".
 *
 * **How the ground is made.** Every height here is a function of four smooth fields read off grids
 * laid once over the country (`GRID`): how far a point is inside the border, how far outside the
 * Galmeth, and the ridge field. The rim is the lower of two faces - the outer one rising off the
 * neighbours' own ground at the border, the inner one off the plain - capped by the crest field, whose
 * ridges run north-east to south-west. Then three things cut it: **cliff bands** (`strata`, every
 * steep face laid in courses of ledge and cliff, which is what stops a walker), **terraces** on the
 * lower inner faces (courses a metre and eight high with level treads, and stairs up through them),
 * and the **passes and gullies**, cut by their own floors. The crag stands on the plain; the washes are
 * cut into it.
 *
 * **Nothing here writes outside Telemonia's own hexes**, and at the border itself it hands back exactly
 * the ground it was given: the Caelin and the Treloss run along the border line, and their channels and
 * levels are the Oves's and Gala's.
 */
import { hexAt, hexCentre, hexOwnerAt, REGION_CELLS, REGION_TERRAIN, terrainMix, seamlessTerrainMix, relief, landDistance, METRES_PER_HEX } from '../../../world/terrain/region-world.js';
import { fortCircuit, FORT_STANDARD } from '../../../world/scenery/fortification.js';
import { OVES_BORDER_STREAM, GALA_TELEMONIA_STREAM, GALA_DESERT_STREAM, courseDistance } from '../western-regions/west-regions.js';

const freeze = Object.freeze;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const smooth = (a, b, x) => { const v = clamp((x - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); };
const lerp = (a, b, t) => a + (b - a) * t;
const point = (x, z) => freeze({ x, z });
/** A smooth minimum and maximum, `k` metres of blending. */
const smin = (a, b, k) => { const h = clamp(.5 + .5 * (b - a) / k, 0, 1); return lerp(b, a, h) - k * h * (1 - h); };
const smax = (a, b, k) => -smin(-a, -b, k);
const bell = u => (u >= 1 ? 0 : (1 - u * u) ** 2);

export const TELEMONIA = 'Telemonia';
export const isTelemonia = name => name === TELEMONIA;

// ---------------------------------------------------------------------------
// The atlas
// ---------------------------------------------------------------------------
/**
 * The Köppen code the World Builder map paints on each hex (`world-builder/map/resources/examples/
 * azhora.wwmap`, `hexes[key].climate`; never `azhora.cmap.json`, whose one code per region is a
 * default). Hot semi-arid steppe on twenty-three, and warm-summer Mediterranean on the two hexes of the
 * south-east corner, where "the hills stand near enough to the sea to catch its weather": the Belketh.
 */
export const TELEMONIA_CLIMATE = freeze({
  '-14,118': 'BSh', '-13,118': 'BSh', '-12,118': 'BSh', '-11,118': 'BSh',
  '-16,119': 'BSh', '-15,119': 'BSh', '-14,119': 'BSh', '-13,119': 'BSh', '-12,119': 'BSh',
  '-16,120': 'BSh', '-15,120': 'BSh', '-14,120': 'BSh', '-13,120': 'BSh', '-12,120': 'BSh',
  '-17,121': 'BSh', '-16,121': 'BSh', '-15,121': 'BSh', '-14,121': 'BSh', '-13,121': 'BSh', '-12,121': 'Csb',
  '-17,122': 'BSh', '-16,122': 'BSh', '-15,122': 'BSh', '-14,122': 'BSh', '-13,122': 'Csb',
});
/**
 * The hexes round Telemonia that no playable country holds yet, by the atlas's own names
 * (`assets/azhora-dev-regions.json`; the game's survey carries only playable regions, so it cannot
 * say these itself). `tests/telemonia-world.test.js` holds this table to the atlas.
 */
export const UNBUILT_NEIGHBOURS = freeze({
  '-17,119': 'East Pyros', '-17,120': 'East Pyros', '-18,121': 'East Pyros', '-18,122': 'East Pyros', '-18,123': 'East Pyros',
  '-17,123': 'Legemum', '-16,123': 'Legemum', '-15,123': 'Legemum', '-14,123': 'Legemum', '-13,123': 'Legemum',
});

export const TELEMONIA_CELLS = freeze([...(REGION_CELLS[TELEMONIA] ?? [])]);
const AXIAL = freeze([[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]]);
const key = (q, r) => `${q},${r}`;
const OWN = new Set(TELEMONIA_CELLS.map(cell => key(cell.q, cell.r)));
const PLAIN = new Set(TELEMONIA_CELLS.filter(cell => cell.terrain === 'plains').map(cell => key(cell.q, cell.r)));
export const PLAIN_CELLS = freeze(TELEMONIA_CELLS.filter(cell => cell.terrain === 'plains'));
export const RIM_CELLS = freeze(TELEMONIA_CELLS.filter(cell => cell.terrain !== 'plains'));

/** The corner of hex (q, r) between its neighbours `i` and `i + 1`: the middle of the three centres round it. */
function corner(q, r, i) {
  const c = hexCentre(q, r), [aq, ar] = AXIAL[i], [bq, br] = AXIAL[(i + 1) % 6];
  const a = hexCentre(q + aq, r + ar), b = hexCentre(q + bq, r + br);
  return point((c.x + a.x + b.x) / 3, (c.z + a.z + b.z) / 3);
}
/** The edges between the cells a test holds and the cells it does not, each with the hex across it. */
function boundary(holds) {
  const out = [];
  for (const cell of TELEMONIA_CELLS) {
    if (!holds(cell.q, cell.r)) continue;
    for (let i = 0; i < 6; i++) {
      const nq = cell.q + AXIAL[i][0], nr = cell.r + AXIAL[i][1];
      if (holds(nq, nr)) continue;
      out.push(freeze({ a: corner(cell.q, cell.r, (i + 5) % 6), b: corner(cell.q, cell.r, i), cell: freeze([cell.q, cell.r]), across: freeze([nq, nr]) }));
    }
  }
  return freeze(out);
}
/** Telemonia's own border, edge by edge, and who is across each: a built country, or an unbuilt one by the atlas's name. */
export const BORDER = freeze(boundary((q, r) => OWN.has(key(q, r))).map(edge => {
  const across = hexCentre(edge.across[0], edge.across[1]);
  const owner = hexOwnerAt(across.x, across.z);
  return freeze({ ...edge, neighbour: OWN.has(key(...edge.across)) ? TELEMONIA : owner !== 'Open country' ? owner : UNBUILT_NEIGHBOURS[key(...edge.across)] ?? null });
}));
/** The Galmeth's own edge: the eight `plains` hexes against the seventeen `hills` round them. */
export const PLAIN_EDGE = boundary((q, r) => PLAIN.has(key(q, r)));

/** The middle of the eight plains hexes. */
export const PLAIN_MIDDLE = (() => {
  let x = 0, z = 0;
  for (const cell of PLAIN_CELLS) { x += cell.x / PLAIN_CELLS.length; z += cell.z / PLAIN_CELLS.length; }
  return point(x, z);
})();

// ---------------------------------------------------------------------------
// The grid: three distances, measured once
// ---------------------------------------------------------------------------
/** Everything in this file is asked about only inside this box: the country's outline and forty metres round it. */
export const TELEMONIA_BOX = (() => {
  const box = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const edge of BORDER) for (const p of [edge.a, edge.b]) {
    box.minX = Math.min(box.minX, p.x - 40); box.maxX = Math.max(box.maxX, p.x + 40);
    box.minZ = Math.min(box.minZ, p.z - 40); box.maxZ = Math.max(box.maxZ, p.z + 40);
  }
  return freeze(box);
})();
export const inTelemoniaBox = (x, z) => x > TELEMONIA_BOX.minX && x < TELEMONIA_BOX.maxX && z > TELEMONIA_BOX.minZ && z < TELEMONIA_BOX.maxZ;

function segmentDistance(x, z, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
  return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
}
const GRID_STEP = 2;
/**
 * The measured grid, every two metres over the box:
 *  - `R`, how far a point is inside Telemonia's border (negative outside it), exactly;
 *  - `B`, the same blurred over about twelve metres, so a face laid off it does not show the
 *    border's hexagonal zigzag - the zigzag swings fourteen metres either side of its own mean line;
 *  - `P`, how far a point is outside the Galmeth (negative inside it), blurred the same way, which
 *    rounds the eight plains hexes into one plain with a natural edge.
 */
const GRID = (() => {
  const { minX, maxX, minZ, maxZ } = TELEMONIA_BOX;
  const cols = Math.floor((maxX - minX) / GRID_STEP) + 2, rows = Math.floor((maxZ - minZ) / GRID_STEP) + 2;
  const R = new Float32Array(cols * rows), P = new Float32Array(cols * rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = minX + i * GRID_STEP, z = minZ + j * GRID_STEP, k = j * cols + i;
    let border = Infinity, plain = Infinity;
    for (const edge of BORDER) border = Math.min(border, segmentDistance(x, z, edge.a, edge.b));
    for (const edge of PLAIN_EDGE) plain = Math.min(plain, segmentDistance(x, z, edge.a, edge.b));
    R[k] = hexOwnerAt(x, z) === TELEMONIA ? border : -border;
    const home = hexOwnerAt(x, z) === TELEMONIA && PLAIN.has(hexKeyAt(x, z));
    P[k] = home ? -plain : plain;
  }
  const blur = (field, radius, passes) => {
    let a = Float32Array.from(field), b = new Float32Array(field.length);
    for (let pass = 0; pass < passes; pass++) {
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        let sum = 0, n = 0;
        for (let o = -radius; o <= radius; o++) { const ii = clamp(i + o, 0, cols - 1); sum += a[j * cols + ii]; n++; }
        b[j * cols + i] = sum / n;
      }
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        let sum = 0, n = 0;
        for (let o = -radius; o <= radius; o++) { const jj = clamp(j + o, 0, rows - 1); sum += b[jj * cols + i]; n++; }
        a[j * cols + i] = sum / n;
      }
    }
    return a;
  };
  return freeze({ cols, rows, R, B: blur(R, 3, 3), P: blur(P, 3, 3) });
})();
function hexKeyAt(x, z) { const h = hexAt(x, z); return key(h.q, h.r); }
function sample(field, x, z) {
  const { cols, rows } = GRID, fx = (x - TELEMONIA_BOX.minX) / GRID_STEP, fz = (z - TELEMONIA_BOX.minZ) / GRID_STEP;
  const i = clamp(Math.floor(fx), 0, cols - 2), j = clamp(Math.floor(fz), 0, rows - 2), u = clamp(fx - i, 0, 1), v = clamp(fz - j, 0, 1);
  const k = j * cols + i;
  return lerp(lerp(field[k], field[k + 1], u), lerp(field[k + cols], field[k + cols + 1], u), v);
}
/** Metres inside the border: exact (`raw`) and with the hexagonal zigzag smoothed out (`smooth`). Negative outside. */
export const borderDepth = (x, z) => sample(GRID.R, x, z);
export const borderDepthSmooth = (x, z) => sample(GRID.B, x, z);
/** Metres outside the Galmeth's rounded edge, negative inside it. */
export const plainDistance = (x, z) => sample(GRID.P, x, z);

// ---------------------------------------------------------------------------
// The levels
// ---------------------------------------------------------------------------
/**
 * **The Galmeth**: "a single enclosed plain", raised. `level` is its floor, eighteen metres above the
 * `outland` it replaces and as much above the Oves Desert's southern rows, twenty-two above Gala's: a
 * plain you climb up to. It falls a metre and a half from west to east, toward the gorge it drains
 * through (`PASSES`, the east pass), so that its washes run somewhere; across three hundred metres
 * that is level to the eye. `relief` is what is left of the ground's roll on a plain the lore calls
 * level.
 */
export const GALMETH = freeze({ level: 30, fall: 1.5, fallFrom: -2190, fallTo: -1995, relief: .35 });
export function plainLevel(x, z) {
  return GALMETH.level + GALMETH.fall * (.5 - smooth(GALMETH.fallFrom, GALMETH.fallTo, x))
    + GALMETH.relief * (Math.sin(x * .029 + z * .011) * .6 + Math.sin(z * .041 - x * .017 + 1.3) * .4);
}

/**
 * **The rim**: the crest field and the two faces under it.
 *
 * `CREST` is the height of the rock where neither face cuts it. Its ridges run **north-east to
 * south-west**, as the lore says, `spacing` metres apart across the grain, `amp` metres above and below
 * `base`; they wander a little along their length (`wander`) and rise and fall along it (`swell`), so
 * that no two crests are the same. Where the rim is a single hex thick - the north, the east and the
 * south - the ridges cross it slantwise and the crest line rises and falls as each one goes over; where
 * it is two hexes thick, on the East Pyros side, they stand one behind another with a narrow valley
 * between, which is "ridge behind ridge".
 *
 * `OUTER` is the face toward the neighbours: it rises off whatever ground it is handed at the border
 * (`from`, metres inside) to the crest (`to`), steepest at its foot and easing toward the top (`shape`),
 * and hands back that ground exactly at the border line - "the terrain is the wall".
 * `INNER` is the face toward the Galmeth: the terrace slope from the plain's edge up `terraceTop` metres
 * over `terraceWidth`, and above it the cliff to the crest over `cliffWidth`, never less than `minCliff`
 * high - the crest is held at least that far above the cliff foot, so that there is no place round
 * the plain where the rim's inner face is low enough to walk up. "The terraces step the inner faces of
 * the rim from the cliff foot down to the plain."
 */
export const CREST = freeze({ base: 56, amp: 7, spacing: 58, wander: 9, swell: 4 });
export const OUTER = freeze({ from: 1, to: 42, shape: 1.6 });
export const INNER = freeze({ terraceTop: 12.6, terraceWidth: 27, cliffWidth: 9, minCliff: 10.5 });
const GRAIN = freeze({ x: Math.SQRT1_2, z: -Math.SQRT1_2 });   // north-east, along the ridges
const ACROSS = freeze({ x: Math.SQRT1_2, z: Math.SQRT1_2 });   // south-east, across them
const along = (x, z) => x * GRAIN.x + z * GRAIN.z;
const across = (x, z) => x * ACROSS.x + z * ACROSS.z;

/** Which ridge a point is on, and where across it: `phase` 0 on a crest line, ±.5 in the valley between two. */
export function ridgePhase(x, z) {
  const u = along(x, z), v = across(x, z) + CREST.wander * Math.sin(u / 47 + .8) + CREST.wander * .45 * Math.sin(u / 19 - 1.7);
  const f = v / CREST.spacing + .31;
  return f - Math.round(f);
}
/** 1 on a crest line, 0 in the bottom of the valley between two. Crests are broad and bare, valleys narrow. */
export function ridgeShare(x, z) {
  const p = Math.abs(ridgePhase(x, z)) * 2;   // 0 on the crest, 1 in the valley
  return 1 - smooth(.15, 1, p) ** .8;
}

// ---------------------------------------------------------------------------
// The Rothkar
// ---------------------------------------------------------------------------
/**
 * **The Rothkar**, "the highest rock of the rim", where Tormon sits. Placed where the ground argues for
 * it rather than where it would look well: at the point of the rim that is furthest from both the
 * Galmeth and the border, which is the thickest rock in the country and so the one place a rock can
 * stand highest above everything round it. That point is found off the grid, not typed in: it is on
 * the East Pyros side, where the rim is two hexes thick and nothing crosses it. It stands where every
 * part of the plain can see it, which is what the three seasonal ceremonies need - "held in the open
 * and within sight of the Rothkar".
 */
export const ROTHKAR = (() => {
  let best = null;
  const { minX, minZ } = TELEMONIA_BOX;
  for (let j = 0; j < GRID.rows; j++) for (let i = 0; i < GRID.cols; i++) {
    const k = j * GRID.cols + i, depth = Math.min(GRID.B[k], GRID.P[k]);
    if (!best || depth > best.depth) best = { x: minX + i * GRID_STEP, z: minZ + j * GRID_STEP, depth };
  }
  return freeze({ id: 'telemonia-rothkar', name: 'The Rothkar', x: best.x, z: best.z, depth: best.depth,
    lift: 31, radius: 46, top: 7 });
})();
/** The Rothkar's own lift above the crest: a broad base, steep upper flanks, a small flat summit. */
export function rothkarLift(x, z) {
  const d = Math.hypot(x - ROTHKAR.x, z - ROTHKAR.z);
  if (d >= ROTHKAR.radius) return 0;
  const u = d / ROTHKAR.radius;
  return ROTHKAR.lift * (1 - smooth(ROTHKAR.top / ROTHKAR.radius, 1, u)) ** 1.35;
}

/** The crest field at a point: the ridges, their swell along the grain, and the Rothkar. */
export function crestHeight(x, z) {
  const u = along(x, z);
  const swell = CREST.swell * (Math.sin(u / 61 + 2.1) * .6 + Math.sin(u / 23 - .4) * .4);
  return CREST.base + CREST.amp * (ridgeShare(x, z) * 2 - 1) + swell + rothkarLift(x, z);
}

// ---------------------------------------------------------------------------
// The passes
// ---------------------------------------------------------------------------
/**
 * **The passes**: "few, known to every Telemon child, and defensible by small numbers against very
 * large forces". Three, and the only ways through the rim on foot:
 *
 *  - **the Tarnel**, north to the Oves Desert, through the rim where it is thinnest - the notch in the
 *    border where the desert's hex (-13,117) reaches into the hills, fifty-eight metres from the
 *    Galmeth's edge. It is the bands' road: the lore's "track along their foot - the desert's southern
 *    route, with its wells - is kept by Telemon bands in every season ... It is the road by which the
 *    bands go out to their contracts and come home from them." It climbs to a col above the plain and
 *    drops into it, so the Galmeth does not drain north. The Caelin rises fifty metres east of its
 *    mouth. The name is the `kellith` profile's own - `tarn`, the profile's root for a hill and a fort,
 *    with its `-el` ending, and one of the eight names in its candidate pool;
 *  - **the east pass**, to Gala, the Galans who broker the contracts and keep the border markets. It is
 *    the gorge the Galmeth drains through: the washes come together at its head and leave by it, and it
 *    opens on Gala on the one stretch of that border with no stream on it, between where the Caelin
 *    hands over to Gala's reach and where the Treloss rises;
 *  - **the south pass**, toward Legemum, whose tin reaches the border markets. Like the Tarnel it climbs
 *    to a col and drops into the plain.
 *
 * None on the East Pyros side: the lore has the two peoples trading "occasionally at the western edge"
 * and interfering with each other not at all, and the west is where the rim is widest.
 *
 * A pass is a line from outside the border to the Galmeth, a floor along it, and walls either side.
 * `stations` are [metres along, floor height, floor half-width]; within `mouthIn` metres of the border
 * the floor is drawn toward the ground it meets there, and at the border it is that ground.
 */
const pass = (id, name, faces, line, stations, { mouthIn = 14, steep = 2.4 } = {}) => {
  const points = line.map(([x, z]) => point(x, z));
  const run = [0]; for (let i = 1; i < points.length; i++) run.push(run[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z));
  return freeze({ id, name, faces, points: freeze(points), run: freeze(run), length: run.at(-1),
    stations: freeze(stations.map(s => freeze(s))), mouthIn, steep });
};
export const PASSES = freeze([
  pass('telemonia-tarnel', 'The Tarnel', 'Oves Desert',
    [[-2148, 1012], [-2150, 1040], [-2156, 1063], [-2166, 1086], [-2176, 1108], [-2183, 1130]],
    [[0, 14, 10], [28, 13, 6.5], [44, 16.6, 5.2], [60, 24.4, 4.5], [76, 31.8, 4.5], [86, 32.3, 5.2], [106, 30.6, 9], [124, 30.2, 12]]),
  pass('telemonia-east-pass', 'The east pass', 'Gala',
    [[-1836, 1072], [-1856, 1080], [-1884, 1094], [-1914, 1110], [-1946, 1128], [-1976, 1145], [-2004, 1158], [-2030, 1168]],
    [[0, 9, 10], [22, 11.5, 7], [50, 15.5, 4.8], [84, 21, 5.4], [120, 26.2, 7], [150, 28.6, 11], [200, 29, 16]]),
  pass('telemonia-south-pass', 'The south pass', 'Legemum',
    [[-2128, 1474], [-2124, 1452], [-2118, 1430], [-2112, 1408], [-2106, 1386], [-2100, 1360], [-2098, 1338]],
    [[0, 11, 10], [22, 11, 6.5], [40, 17, 5], [56, 24.5, 4.4], [70, 31, 4.4], [78, 31.8, 5], [100, 30, 10], [139, 29.8, 14]]),
]);
/** Where a point lies against a line: how far off it, how far along it (in metres), and the line's direction there. */
function onLine(line, run, x, z) {
  let best = null;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i], dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / l2, 0, 1), d = Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
    if (!best || d < best.distance) best = { distance: d, along: run[i - 1] + t * Math.sqrt(l2), segment: i };
  }
  return best;
}
function stationAt(stations, s) {
  if (s <= stations[0][0]) return { floor: stations[0][1], half: stations[0][2] };
  // The floor runs straight from station to station, so its steepest is the steepest pair of stations
  // and no steeper; the width eases between them.
  for (let i = 1; i < stations.length; i++) if (s <= stations[i][0]) {
    const a = stations[i - 1], b = stations[i], t = (s - a[0]) / (b[0] - a[0]);
    return { floor: lerp(a[1], b[1], t), half: lerp(a[2], b[2], smooth(0, 1, t)) };
  }
  const last = stations.at(-1);
  return { floor: last[1], half: last[2] };
}
/** Where a point is against the nearest pass: the pass, metres off its line, metres along it, its floor and half-width there. */
export function passAt(x, z) {
  let best = null;
  for (const p of PASSES) {
    const on = onLine(p.points, p.run, x, z);
    if (on.distance > 90) continue;
    if (!best || on.distance < best.distance) {
      const st = stationAt(p.stations, on.along);
      best = { pass: p, distance: on.distance, along: on.along, floor: st.floor, half: st.half };
    }
  }
  return best;
}
/** The pass's floor and walls at a point, given the ground at the mouth: Infinity off every pass. */
function passCut(x, z, ground) {
  const at = passAt(x, z);
  if (!at) return Infinity;
  const { pass: p, distance, half } = at;
  // At the mouth the floor is the ground it meets, and it takes over from it over the first metres in;
  // at the inner end it comes down onto the plain's own level and never stands above it there.
  const inner = plainDistance(x, z);
  const floor = Math.min(lerp(ground, at.floor, clamp(borderDepth(x, z) / p.mouthIn, 0, 1)), plainLevel(x, z) + Math.max(0, inner) * .3);
  const e = distance - half, fillet = 2.2;
  const walls = e <= 0 ? 0 : e < fillet ? p.steep * e * e / (2 * fillet) : p.steep * (e - fillet / 2);
  return floor + walls + .25 * Math.sin(x * .37 + z * .23) * smooth(0, 3, -e) * smooth(0, 8, inner) * clamp(borderDepth(x, z) / p.mouthIn, 0, 1);
}
/** 1 on a pass's floor, 0 off it, feathered over two metres: the scatter and the tint read it. */
export function onPassFloor(x, z) {
  const at = passAt(x, z);
  return at ? 1 - smooth(at.half - 1, at.half + 1.5, at.distance) : 0;
}

// ---------------------------------------------------------------------------
// The washes and the gullies
// ---------------------------------------------------------------------------
/**
 * **The washes.** "The washes that drain the rim run for a few days after rain - too quick and too
 * shallow for anything but drowning the careless - flood without warning in spring, and are dry stone
 * by midsummer. The Telemon build nothing in a wash." Three cross the Galmeth: one off the south rim,
 * one off the west, one down out of the Tarnel; they come together at the head of the east pass and
 * leave the country by it, which is where the Treloss rises at the gorge's foot on the Gala side. Wide
 * and shallow: a floor of washed stones under a metre of bank, nothing growing on it.
 *
 * Where a wash comes down the rim's inner face it is a **gully** (`GULLIES`), cut through the terrace
 * belt with check-walls across it: "what water the country has through the dry months is kept ...
 * behind check-walls across the gullies". The terraces stop at the gully's banks.
 */
const course = (id, name, line, half, depth) => {
  const points = line.map(([x, z]) => point(x, z));
  const run = [0]; for (let i = 1; i < points.length; i++) run.push(run[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z));
  return freeze({ id, name, points: freeze(points), run: freeze(run), length: run.at(-1), half, depth });
};
export const WASHES = freeze([
  course('telemonia-south-wash', 'The south wash', [[-2148, 1362], [-2122, 1336], [-2086, 1312], [-2052, 1290], [-2026, 1258], [-2014, 1222], [-2008, 1188], [-2012, 1162]], 6.5, .85),
  course('telemonia-west-wash', 'The west wash', [[-2214, 1290], [-2192, 1266], [-2170, 1232], [-2150, 1196], [-2118, 1170], [-2080, 1158], [-2040, 1160], [-2012, 1162]], 6, .8),
  course('telemonia-north-wash', 'The north wash', [[-2183, 1130], [-2160, 1142], [-2120, 1146], [-2080, 1150], [-2040, 1158], [-2012, 1162]], 5, .7),
]);
/** The gullies the washes come down the rim's inner face by: floor from the cliff foot to the plain, with check-walls. */
export const GULLIES = freeze([
  freeze({ ...course('telemonia-south-gully', 'The south gully', [[-2172, 1394], [-2160, 1378], [-2148, 1362]], 3.4, 0), wash: 'telemonia-south-wash', checks: 1.15 }),
  freeze({ ...course('telemonia-west-gully', 'The west gully', [[-2252, 1314], [-2232, 1302], [-2214, 1290]], 3.2, 0), wash: 'telemonia-west-wash', checks: 1.15 }),
]);
/** Where a point is against the nearest wash: how far off its line and how far along, 0 at its head. */
export function washAt(x, z) {
  let best = null;
  for (const w of WASHES) {
    const on = onLine(w.points, w.run, x, z);
    if (on.distance > w.half + 8) continue;
    if (!best || on.distance - w.half < best.distance - best.wash.half) best = { wash: w, distance: on.distance, along: on.along / w.length };
  }
  return best;
}
/** How much of a wash's floor a point is in: 1 down its middle, 0 at its banks, fading in at its head. */
export function washWeight(x, z) {
  const at = washAt(x, z);
  if (!at || at.distance >= at.wash.half) return 0;
  return bell(at.distance / at.wash.half) * smooth(0, .06, at.along);
}
const washCut = (x, z) => { const at = washAt(x, z); return at ? at.wash.depth * (1 - smooth(at.wash.half * .45, at.wash.half, at.distance)) * smooth(0, .06, at.along) : 0; };
export function gullyAt(x, z) {
  let best = null;
  for (const g of GULLIES) {
    const on = onLine(g.points, g.run, x, z);
    if (on.distance > 30) continue;
    if (!best || on.distance < best.distance) best = { gully: g, distance: on.distance, along: on.along };
  }
  return best;
}

// ---------------------------------------------------------------------------
// Kethorn's rock
// ---------------------------------------------------------------------------
/**
 * **Kethorn's rock**: "an outcrop in the middle of the Galmeth, a rock with cliff on three sides and a
 * wall closing the fourth". It stands on the atlas's middle plains hex, (-14,120), and it is long on
 * the country's own grain - a piece of the same north-east-to-south-west rock as the rim, standing out
 * of the plain. Its top is level ground; the cliffs go round its north-east, north-west and south-east
 * faces; its south-west end runs out as a spur that comes down to the plain, and that is the open side
 * the wall closes, across the spur's head, with one gate in it.
 *
 * **Which end is open is a builder's choice**, and the reasons are two. The cliffs face the two passes
 * the built world comes in by, the Tarnel and the east pass, and the open side faces away from them,
 * which is the side a rock defended by its cliffs would choose to have open. And a spur toward the
 * north-east would have run straight into the head of the east pass, where the washes leave the plain.
 * (The Rothkar is not in sight from the plain below the spur, which lies too close under the western
 * rim's inner cliff; it is from the rock's top and from the eastern half of the plain.)
 *
 * In the rock's own frame: `u` metres along it toward the south-west (the spur), `v` across it. The
 * top is an ellipse of `topHalf` by `topWide` centred `topShift` along, broken into a crag's outline
 * (`edgeRadius`); it stands `height` over the plain and rises `rise` toward its north-eastern end, over
 * the cliffs and furthest from the gate. The spur runs from `spurFrom` along to `spurTo`, `spurHalf` wide
 * either side of the middle, falling from the top's level to the plain's.
 *
 * **The faces are a crag's, not a drum's** (the user, 2026-10-02: "it reads as a smooth round drum").
 * Round the three cliff sides the rock comes down in `courses` bands - a cliff, a ledge, a cliff, a
 * ledge, a cliff, each cliff about five metres of stone standing at five or six in one - over a face
 * `face` metres deep that swings `faceSwing` either way round the rock, onto a talus apron `talus` high
 * (swinging `talusSwing`) and `talusWidth` wide; and the outline in plan has buttresses standing out of it
 * and bays between them. At the spur end - within about thirty-five degrees of it - the rock is as it was:
 * a plain cliff `cliff` metres deep onto the talus, so the neck, the wall and its gate are where they
 * were. Every band is too steep to walk up, and every ledge falls outward to the next band, so a walker
 * who drops onto one can always go on down.
 */
export const KETHORN = (() => {
  const home = TELEMONIA_CELLS.find(cell => cell.q === -14 && cell.r === 120) ?? { x: -2100, z: 1241.4 };
  return freeze({ id: 'telemonia-kethorn', name: 'Kethorn’s rock', x: home.x, z: home.z, hex: freeze([-14, 120]),
    height: 20, rise: 2.4, topHalf: 46, topWide: 29, topShift: -6, spurFrom: 40, spurTo: 108, spurHalf: 14, spurEnd: 10,
    cliff: 3.6, talus: 3.2, talusWidth: 13, neck: 36,
    courses: 3, face: 8, faceSwing: 2.4, riser: .36, tread: .05, talusSwing: 1, talusWidthSwing: 3 });
})();
const K_ALONG = point(-GRAIN.x, -GRAIN.z), K_ACROSS = point(-ACROSS.x, -ACROSS.z);   // south-west, and north-west
/** A point in the rock's own frame. */
export function kethornFrame(x, z) {
  const dx = x - KETHORN.x, dz = z - KETHORN.z;
  return { u: dx * K_ALONG.x + dz * K_ALONG.z, v: dx * K_ACROSS.x + dz * K_ACROSS.z };
}
/** The world point at `u` along the rock and `v` across it. */
export const kethornPoint = (u, v) => point(KETHORN.x + K_ALONG.x * u + K_ACROSS.x * v, KETHORN.z + K_ALONG.z * u + K_ACROSS.z * v);
/**
 * The crag's outline: a wobble on the ellipse's radius round its middle - a few slow lobes, finer ribs,
 * and five buttresses ([bearing, how far out, how wide], radians round the top from the spur end) - and
 * none of it at the spur end (`cragShare`), where the neck and the wall are.
 */
const OUTLINE = freeze([[3, .05, .4], [4, .03, 2.2], [5, .04, 1.3], [7, .028, 4.1], [9, .02, .7], [13, .014, 2.9]]);
const BUTTRESSES = freeze([[2.1, .1, .12], [-1.7, .09, .1], [3, .08, .14], [-2.6, .11, .11], [1.35, .07, .09]]);
const cragShare = theta => smooth(.6, 1, Math.abs(theta));
function edgeRadius(theta) {
  let wobble = 0;
  for (const [k, a, p] of OUTLINE) wobble += a * Math.sin(k * theta + p);
  for (const [c, a, w] of BUTTRESSES) { let d = theta - c; d -= Math.round(d / (Math.PI * 2)) * Math.PI * 2; wobble += a * Math.exp(-(d * d) / (w * w)); }
  return 1 + wobble * cragShare(theta);
}
/** Where a point is round the top: its bearing from the top's middle (0 toward the spur), and its radius over the outline's there. */
function topPolar(u, v) {
  const du = (u - KETHORN.topShift) / KETHORN.topHalf, dv = v / KETHORN.topWide, theta = Math.atan2(dv, du);
  return { theta, rho: Math.hypot(du, dv) / edgeRadius(theta), r: Math.hypot(du, dv) };
}
/** Metres outside the top's edge (negative inside): the outline's radius ratio over its gradient, to first order. */
export function topOutside(x, z) {
  const { u, v } = kethornFrame(x, z), here = topPolar(u, v);
  if (here.r < .05) return -KETHORN.topWide;
  const d = .05;
  const gu = (topPolar(u + d, v).rho - topPolar(u - d, v).rho) / (2 * d), gv = (topPolar(u, v + d).rho - topPolar(u, v - d).rho) / (2 * d);
  return (here.rho - 1) / Math.max(1e-6, Math.hypot(gu, gv));
}
/** A point's bearing round the top, 0 toward the spur, ±π at the north-eastern end. */
export function kethornBearing(x, z) { const { u, v } = kethornFrame(x, z); return topPolar(u, v).theta; }
/**
 * The crag's face at `out` metres outside the top's edge, on bearing `theta` round it, under a top `top`
 * over the plain: the courses down to the talus, then the talus apron. Never rising outward, so there is
 * no hollow on it a walker could be shut in.
 */
function cragFace(out, theta, top) {
  if (out <= 0) return top;
  const K = KETHORN;
  const run = K.face + K.faceSwing * (Math.sin(2 * theta + 1.1) * .6 + Math.sin(5 * theta + .3) * .4);
  const talus = K.talus + K.talusSwing * Math.sin(3 * theta + 2);
  const talusWidth = K.talusWidth + K.talusWidthSwing * Math.sin(4 * theta + .6);
  if (out >= run) return talus * (1 - smooth(run, run + talusWidth, out));
  const drop = top - talus, riser = K.riser + .08 * Math.sin(3 * theta - .9);
  return talus + courses(drop * (1 - out / run), drop / K.courses, riser, K.tread);
}
/** The top's own level: `height` over the plain, rising toward the north-eastern end. */
export function kethornTopLevel(x, z) {
  const { u } = kethornFrame(x, z);
  return KETHORN.height + KETHORN.rise * smooth(10, -48, u) + .25 * Math.sin(x * .21 + z * .17) * Math.sin(z * .13 - x * .07);
}
/** The spur: how far off its middle line a point is, and its surface's lift over the plain there. */
export function spurAt(x, z) {
  const { u, v } = kethornFrame(x, z);
  if (u < KETHORN.spurFrom - 6 || u > KETHORN.spurTo + 10) return null;
  const t = clamp((u - KETHORN.spurFrom) / (KETHORN.spurTo - KETHORN.spurFrom), 0, 1);
  const half = lerp(KETHORN.spurHalf, KETHORN.spurEnd, t);
  // The spur's surface falls from the top's level to the plain's, steepest in its middle third and
  // never steeper than a walker takes in his stride.
  const lift = KETHORN.height * (1 - (t * .55 + smooth(0, 1, t) * .45));
  return { u, v, t, half, lift, off: Math.abs(v) - half };
}
/** The rock's lift over the plain at a point: the top with its cliffs and talus, and the spur with its sides. */
export function kethornLift(x, z) {
  const dx = x - KETHORN.x, dz = z - KETHORN.z;
  if (dx * dx + dz * dz > 150 * 150) return 0;
  const out = topOutside(x, z), top = kethornTopLevel(x, z), theta = kethornBearing(x, z), crag = cragShare(theta);
  // The spur end's plain cliff onto its talus; round the cliffs the crag's courses take its place.
  let lift = top * (1 - smooth(0, KETHORN.cliff, out));
  lift = Math.max(lift, KETHORN.talus * (1 - smooth(KETHORN.cliff * .4, KETHORN.talusWidth, out)) * (1 - smooth(-2, 2, -out)) + 0);
  if (crag > 0) lift = lerp(lift, cragFace(out, theta, top), crag);
  const spur = spurAt(x, z);
  if (spur) {
    const sides = spur.lift * (1 - smooth(0, KETHORN.cliff * (1 + spur.t), spur.off));
    const fade = spur.u > KETHORN.spurTo ? 1 - smooth(KETHORN.spurTo, KETHORN.spurTo + 10, spur.u) : 1;
    lift = Math.max(lift, sides * fade, spur.lift > 1 ? KETHORN.talus * .7 * (1 - smooth(KETHORN.cliff, KETHORN.talusWidth * .8, spur.off)) * fade * smooth(0, .2, 1 - spur.t) : 0);
  }
  return lift;
}
/** 1 on the rock's level top (inside its cliffs and behind the wall), 0 off it. */
export function onKethornTop(x, z, margin = 0) {
  const { u } = kethornFrame(x, z);
  return topOutside(x, z) < -margin && u < KETHORN.neck - margin;
}
/**
 * **The rock cannot be climbed** (the user, 2026-10-02): the gate is the only way onto its top, for a
 * walker and for a climber. Everywhere the rock stands off the plain - its faces and ledges, its talus,
 * the spur and its sides, the top and the wall on it - is a face no hand holds; the climbing rule reads it
 * through `world.unclimbableAt` (src/gameplay/movement/climbing.js, `climbForbidden`). The rim is left as it is: a climber
 * can still come over it.
 */
export function kethornUnclimbable(x, z) {
  if (!inTelemoniaBox(x, z)) return false;
  return kethornLift(x, z) > .2;
}

/**
 * **The wall**: across the spur's head, from the north-western cliff to the south-eastern, with one
 * gate in the middle of it - the only wall in a country "proud of needing none". Laid out by the
 * fortification standard every wall in the game is (src/world/scenery/fortification.js), as Feradom's castles are,
 * so it is a barrier with colliders and not a picture of one: an open line whose two ends run on into
 * the cliffs, so that nobody walks round its end, two towers flanking the gate and none elsewhere, and
 * no ditch - it stands on rock. A little taller than the army's standard: it is looked up at from the
 * spur. Stone of the rock it stands on: "the town is built of the stone it stands on".
 *
 * The gate is left open: who comes through it, and how, is stage 2's.
 */
export const KETHORN_STANDARD = freeze({ ...FORT_STANDARD, wallHeight: 5.6, walkHeight: 4.0, towerPlatform: 7.6, gateWidth: 4.2, wallThickness: 3.6 });
export const KETHORN_WALL = (() => {
  // From cliff to cliff across the neck: the spur's own width there, and 1.3 m on over each edge, where
  // the ground is already six metres down the face - so the wall's two ends run on into the cliff, their
  // colliders cover its lip, and the only way past them is down it. At 0.8 m a one-metre ledge was left
  // on the lip beside each end that a walker who dropped onto it could not leave (the test found it).
  const u = KETHORN.neck, reach = KETHORN.spurHalf + 1.3;
  const ends = [kethornPoint(u, -reach), kethornPoint(u + 2, -reach * .45), kethornPoint(u + 2, reach * .45), kethornPoint(u, reach)];
  const edge = i => Math.hypot(ends[i + 1].x - ends[i].x, ends[i + 1].z - ends[i].z);
  const outside = kethornPoint(u + 30, 0);
  const circuit = fortCircuit({
    id: 'kethorn-wall', kind: 'kethorn', corners: ends, open: true, outside,
    gates: [{ id: 'kethorn-gate', edge: 1, at: edge(1) / 2 }],
    cornerTowers: false, ditchEdges: [], standard: KETHORN_STANDARD,
  });
  const gate = circuit.gates[0];
  return freeze({ id: 'telemonia-kethorn-wall', name: 'The wall of Kethorn', circuit, gate,
    outside: point(gate.centre.x - gate.inward.x * 14, gate.centre.z - gate.inward.z * 14),
    inside: point(gate.centre.x + gate.inward.x * 12, gate.centre.z + gate.inward.z * 12) });
})();

// ---------------------------------------------------------------------------
// The courses: cliff bands and terraces
// ---------------------------------------------------------------------------
/**
 * A height laid in courses: every `period` metres of it, most of the rise is taken in one short riser
 * and the rest of the course is a tread. The East Lotharn's rule (`terrace`, src/content/regions/east-lotharn/east-lotharn-world.js)
 * with its own numbers. `riser` is the share of each course's run that is riser, `tread` the share of
 * its rise the tread takes: so on ground of slope s a tread stands at s * tread / (1 - riser) and a
 * riser at s * (1 - tread) / riser.
 */
function courses(h, period, riser, tread) {
  const k = Math.floor(h / period), t = h / period - k;
  const c = t < 1 - riser ? tread * t / (1 - riser) : tread + (1 - tread) * smooth(0, 1, (t - (1 - riser)) / riser);
  return (k + c) * period;
}
/**
 * **The cliff bands**: "bare along the crests and broken by cliff bands that a party can spend a day
 * finding the end of". Every face of the rim is laid in courses six and a half metres high: a ledge
 * that takes a fifth of the rise over four fifths of the run, and a cliff that takes the rest. On the
 * outer faces, which climb a metre for a metre, that is a ledge five metres wide and a cliff five metres
 * high standing at better than three in one; on anything steeper than one in four the cliff is too
 * steep to walk up (the climbing rule's `grabSlope` is .9, src/gameplay/movement/climbing.js), and that is the whole of
 * how the rim stops a walker. The courses follow the ground's contours round every ridge and down every
 * valley, so a valley that runs out against the next ridge ends in a cliff, and there is no way up a
 * face except a pass, a stair or the climbing skill. A slow wave in their phase tilts them a metre or
 * two along their length, as bedded rock lies.
 *
 * **Each course is cliff first and ledge after**, so the courses only ever raise the ground they are laid
 * on and never cut into it. The other way round - a ledge, then the cliff - lowers the ground at the
 * foot of each course, and where the courses fade in at the foot of the outer face that lowering made a
 * moat along the border: 761 square metres of pockets nobody could walk out of, found by the test that
 * looks for them (`tests/telemonia-world.test.js`, "nobody is sealed in").
 */
export const STRATA = freeze({ period: 6.5, riser: .22, tread: .2 });
const strataPhase = (x, z) => .9 * Math.sin(x * .019 + z * .012) + .6 * Math.sin(-x * .015 + z * .024 + 1.1);
/** A course that rises first and lies level after: never below the height it is handed. */
function coursesUp(h, period, riser, tread) {
  const k = Math.floor(h / period), t = h / period - k;
  const c = t < riser ? (1 - tread) * smooth(0, 1, t / riser) : (1 - tread) + tread * (t - riser) / (1 - riser);
  return (k + c) * period;
}
export function strata(h, x, z) {
  const phase = strataPhase(x, z);
  return coursesUp(h + phase, STRATA.period, STRATA.riser, STRATA.tread) - phase;
}
/**
 * **The terraces**: "dry-stone steps of barley, pulses and vines climbing the inner slopes as far as
 * there is soil to hold" - stage 2 plants them; stage 1 builds the steps. Courses a metre and eight
 * high with level treads, across the whole terrace belt of the inner faces from the plain's edge to the
 * cliff foot: a riser is a retaining wall of the rim's own stone (src/content/regions/telemonia/telemonia-scenery.js draws it),
 * and a tread is bare earth about four metres deep.
 *
 * A riser is too steep to walk up, as a dry-stone wall is, so **stairs** go up through the belt every
 * `stairEvery` degrees round the plain, two and a half metres wide, on the ground's own slope - which
 * the lore's girls are taught to hold, "a gate, a terrace wall, a cistern, a stair". Where a stair
 * crosses a terrace the wall stops either side of it.
 */
export const TERRACES = freeze({ period: 1.8, riser: .16, tread: .03, stairEvery: 13, stairHalf: 1.25, stairFeather: .9 });
const terraceCourses = h => courses(h, TERRACES.period, TERRACES.riser, TERRACES.tread);
const STAIR_ANGLES = (() => {
  const out = [];
  for (let a = -180 + 4; a < 180; a += TERRACES.stairEvery) out.push(a * Math.PI / 180);
  return freeze(out);
})();
/** How far a point is from the middle line of the nearest stair, in metres. */
export function stairDistance(x, z) {
  const dx = x - PLAIN_MIDDLE.x, dz = z - PLAIN_MIDDLE.z, r = Math.hypot(dx, dz), angle = Math.atan2(dz, dx);
  let best = Infinity;
  for (const a of STAIR_ANGLES) {
    let d = angle - a; d -= Math.round(d / (Math.PI * 2)) * Math.PI * 2;
    if (Math.abs(d) < Math.PI / 2) best = Math.min(best, Math.abs(Math.sin(d)) * r);
  }
  return best;
}

// ---------------------------------------------------------------------------
// The way up onto the rim
// ---------------------------------------------------------------------------
/**
 * **The Rothkar way**: the one walked way from the Galmeth up onto the rim (the user, 2026-10-02: "there is
 * no walked way up onto the rim" - and stage 2 wants one for the ceremonies, the herds and the bands). It
 * leaves the plain at its western edge south of the spur's foot, climbs the terraces slantwise, then goes
 * up across the inner cliff as a shelf cut into the face - half cut, half built out, as a hill path is -
 * and comes out on the ledge at the foot of the Rothkar, the broad shelf under its eastern flank, 59.8 m
 * up: "the three seasonal ceremonies are held in the open and within sight of the Rothkar", and from here
 * there is nothing between a man and it.
 *
 * `points` are laid by bearing from the plain's middle and metres out from its edge (`beltPoint`), so they
 * follow the curve of the inner face; `stations` are [metres along, floor, half-width], the floor running
 * straight between them: the terrace stretch on the belt's own slope, the cliff stretch at about one in
 * four. On the floor the ground is the floor; beside it, where the ground stands higher it is cut back in
 * a wall at `steep` (too steep to walk up, so the way is a way and not a ramp onto the rock round it), and
 * where it lies lower the floor is built out over it on a revetment, a face at `revet` in one.
 *
 * **It goes up onto the rim, not through it.** The ledges round the Rothkar's foot are one broad tread of
 * the rim's strata that runs round the rock and out to the western faces, and from it a walker can go down
 * the outer cliff bands and out of the country, one drop at a time - so where the way stands over the crest
 * (from `lipFrom` metres along) and round its landing it is walled in rock on both sides, `lip` metres over
 * its floor with a sharp crest nobody can walk up onto, and the parapet the scenery lays on it. From the way
 * and its landing the only walked way is back down to the Galmeth; the outer faces of the rim are as they
 * were, so nobody comes in by it either (tests/telemonia-world.test.js measures both).
 */
const WAY_LINE = freeze([[128, -3], [132, 6], [134.5, 16], [136.5, 25.5], [140, 28], [144, 30.5], [148, 33], [151.5, 35.5], [154, 38.5], [155.5, 41.5]]);
export const ROTHKAR_WAY = (() => {
  const points = WAY_LINE.map(([bearing, out]) => beltPoint(bearing * Math.PI / 180, out));
  const run = [0]; for (let i = 1; i < points.length; i++) run.push(run[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z));
  // The floor at vertices 0-3 is the terrace belt's own slope there, then one grade up the cliff to the shelf.
  const floors = [30.9, 33.4, 38, 42.8, 46, 49.6], end = 59.8, length = run.at(-1);
  // Five metres short of its end it widens into a landing on the shelf, level, ten metres across.
  const stations = floors.map((floor, i) => freeze([run[i], floor, 1.6]));
  stations.push(freeze([length - 5, end - (end - floors[5]) * 5 / (length - run[5]), 1.6]), freeze([length, end, 5]));
  const xs = points.map(p => p.x), zs = points.map(p => p.z);
  const box = freeze({ minX: Math.min(...xs) - 30, maxX: Math.max(...xs) + 30, minZ: Math.min(...zs) - 30, maxZ: Math.max(...zs) + 30 });
  return freeze({ id: 'telemonia-rothkar-way', name: 'The Rothkar way', points: freeze(points), run: freeze(run), length,
    stations: freeze(stations), box, steep: 2.4, fillet: .9, revet: 6, lipFrom: 70, lip: 1.8, lipTop: 1.6 });
})();
/** Where a point is against the way: metres off its line, metres along it, its floor and half-width there. Null well off it. */
export function wayAt(x, z) {
  const w = ROTHKAR_WAY, b = w.box;
  if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) return null;
  const on = onLine(w.points, w.run, x, z), st = stationAt(w.stations, on.along);
  return { way: w, distance: on.distance, along: on.along, floor: st.floor, half: st.half };
}
/** The way's floor, its cut wall and its built-out face, over the ground the rest of the country has laid. */
function wayCut(x, z, height) {
  const at = wayAt(x, z);
  if (!at) return height;
  const e = at.distance - at.half;
  if (e <= 0) return at.floor;
  const { steep, fillet, revet, lipFrom, lip } = at.way, rise = e < fillet ? steep * e * e / (2 * fillet) : steep * (e - fillet / 2);
  // Built out, the floor stands on a revetment: a dry-stone face almost upright (the scenery draws it).
  const fall = e < .3 ? revet * e * e / .6 : revet * (e - .15);
  const ground = height > at.floor ? Math.min(height, at.floor + rise) : Math.max(height, at.floor - fall);
  if (at.along < lipFrom) return ground;
  // Over the crest, the rock is left standing in a lip either side, `lipTop` metres across its crest: it
  // starts at its full height, so there is no end of it to walk up.
  // Its outer face is the revetment's, where the way is built out: almost upright.
  const up = lip / steep, wall = e < up ? steep * e : e < up + at.way.lipTop ? lip : lip - revet * (e - up - at.way.lipTop);
  return Math.max(ground, at.floor + wall);
}
/** Where a point is on the way's walled stretch, beside its floor: the lip, and the parapet the scenery lays on it. */
export function wayLip(x, z) {
  const at = wayAt(x, z);
  if (!at || at.along < at.way.lipFrom) return null;
  const e = at.distance - at.half, up = at.way.lip / at.way.steep;
  return e > 0 && e < 2 * up + at.way.lipTop ? { ...at, e, up } : null;
}
/** 1 on the way's floor, 0 off it, feathered: the tint and the scatter read it. */
export function onWayFloor(x, z) {
  const at = wayAt(x, z);
  return at ? 1 - smooth(at.half - .5, at.half + .8, at.distance) : 0;
}

// ---------------------------------------------------------------------------
// The Belketh
// ---------------------------------------------------------------------------
/**
 * **The Belketh**, "the wooded edge": the only wood in the country, on the two `Csb` hexes of the
 * south-east corner, "where the hills stand near enough to the sea to catch its weather". How much of a
 * point is in it, by the same hex blend every country's ground is coloured with, so it thins out into
 * the scrub round it rather than stopping at a hex edge.
 */
const BELKETH_CELLS = freeze(TELEMONIA_CELLS.filter(cell => TELEMONIA_CLIMATE[key(cell.q, cell.r)] === 'Csb'));
export function belkethShare(x, z) {
  let near = Infinity;
  for (const cell of BELKETH_CELLS) near = Math.min(near, Math.hypot(cell.x - x, cell.z - z));
  return 1 - smooth(48, 92, near);
}

// ---------------------------------------------------------------------------
// The ground
// ---------------------------------------------------------------------------
/**
 * The rim's smooth form before anything cuts it: the lower of the outer face (off the ground it is
 * handed) and the inner face (off the plain), under the crest. Returns the parts the rest of this file
 * reads, so the ground is worked out once per point.
 */
function form(x, z, ground) {
  const raw = borderDepth(x, z), outer = borderDepthSmooth(x, z), inner = plainDistance(x, z);
  const plain = plainLevel(x, z), foot = plain + INNER.terraceTop, crest = Math.max(crestHeight(x, z), foot + INNER.minCliff);
  const t = clamp((outer - OUTER.from) / (OUTER.to - OUTER.from), 0, 1);
  const rise = (1 - (1 - t) ** OUTER.shape) * smooth(0, 6, raw);
  const outerFace = ground + (crest - ground) * rise;
  const terrace = INNER.terraceTop * clamp(inner / INNER.terraceWidth, 0, 1) ** 1.08;
  // The cliff takes the whole of its height at one steady pitch, never less than one in one.
  const cliff = (crest - foot) * clamp((inner - INNER.terraceWidth) / INNER.cliffWidth, 0, 1);
  const innerFace = plain + terrace + cliff;
  const height = smin(outerFace, innerFace, 4);
  return { raw, outer, inner, plain, crest, height, innerFace, outerFace };
}

/** Which part of the country a point is: what the tint, the scatter and the tests sort it by. */
export function telemoniaPlace(x, z, ground = REGION_TERRAIN[TELEMONIA].base) {
  if (!inTelemoniaBox(x, z) || hexOwnerAt(x, z) !== TELEMONIA) return null;
  const f = form(x, z, ground);
  const pass = passAt(x, z), gully = gullyAt(x, z), way = wayAt(x, z);
  const terraced = !(pass && pass.distance < pass.half + .5) && !(gully && gully.distance < gully.gully.half + 1.5) && !(way && way.distance < way.half + .6) && f.inner > -.5 && f.inner < INNER.terraceWidth + 1 && f.height < f.plain + INNER.terraceTop + .05 && f.height <= f.outerFace + .5;
  return { ...f, terraced, plainSide: f.inner < 0, belketh: belkethShare(x, z) };
}

/**
 * **The seam at the border.** The world's hex blend (`terrainMix`) steps along a hex edge wherever the
 * hexes two steps away differ, and along Telemonia's western and southern borders the hexes across are
 * unbuilt `outland`, six metres of roll on a 150 m wave against this country's eighty centimetres on
 * 320: so the ground the outer face rises off can stand up to a metre and a half below the ground a pace
 * across the border. Measured, that left a trench a metre wide along the hex edge at the face's foot -
 * thirty-two square metres a walker could fall into off the rim and not walk out of, because the step
 * out was an ascent and the climbing rule refuses it.
 *
 * So, a pace either side of every metre of the border, the ground before this country is asked once
 * (`baseAt`, the same arrangement Feradom's `frontLevelFor` uses), and where the far side stands higher
 * this side is lifted to meet it, fading out over four metres inside: the ground at the border then
 * never steps **up** on the way out of the country. Where this side stands higher it is left alone - the
 * step is down on the way out, which a walker takes. Nothing outside the country is touched.
 */
const SEAM = freeze({ step: 1, probe: .3, reach: 4, full: 1, seamless: 26, seamlessFull: 12 });
/**
 * The same blend's seams **inside** the border, along the edges between two of this country's own hexes
 * where they run down to it: the hexes two steps away there are the neighbours', so the blend steps a
 * metre or so along each such edge, and the outer face's foot rises off that step - a trench a metre wide
 * and a few long, found twenty square metres at a time. Within the face's foot the blend over every hex
 * in reach (`seamlessTerrainMix`) is put in its place, as Feradom and the Suvals do on their own ground.
 */
function seamlessDelta(x, z) {
  const now = seamlessTerrainMix(x, z), was = terrainMix(x, z);
  return now.base + relief(x, z, now.amp, now.wave) - was.base - relief(x, z, was.amp, was.wave);
}
const seamlessShare = depth => 1 - smooth(SEAM.seamlessFull, SEAM.seamless, depth);
/**
 * **Not in the border streams.** The Caelin and the Treloss run along the border line, and a channel is
 * cut to its own water level (src/content/regions/western-regions/west-ground.js), which has no seam in it: lifting either side of a
 * stream bed would stand it out of its own water. Their lines are softened off the hex edges, and in
 * places cut a corner of this country by a few metres. So the whole of this country's ground lets go of
 * them over the five metres outside each stream's widest water, and in it is the stream's.
 */
const BORDER_STREAMS = freeze([OVES_BORDER_STREAM, GALA_TELEMONIA_STREAM, GALA_DESERT_STREAM]);
function dryOfStreams(x, z) {
  let near = Infinity;
  for (const course of BORDER_STREAMS) near = Math.min(near, courseDistance(course, x, z, 12) - course.maxHalf);
  return smooth(1, 6, near);
}
let SEAM_SAMPLES = null;
function seamSamples(baseAt) {
  if (SEAM_SAMPLES) return SEAM_SAMPLES;
  const cell = 8, buckets = new Map();
  for (const edge of BORDER) {
    const c = hexCentre(edge.cell[0], edge.cell[1]), a = hexCentre(edge.across[0], edge.across[1]);
    const n = Math.hypot(a.x - c.x, a.z - c.z), nx = (a.x - c.x) / n, nz = (a.z - c.z) / n;
    const length = Math.hypot(edge.b.x - edge.a.x, edge.b.z - edge.a.z), count = Math.max(1, Math.ceil(length / SEAM.step));
    for (let i = 0; i <= count; i++) {
      const t = i / count, x = edge.a.x + (edge.b.x - edge.a.x) * t, z = edge.a.z + (edge.b.z - edge.a.z) * t;
      const ix = x - nx * SEAM.probe, iz = z - nz * SEAM.probe;
      // The far side is asked at a hand's breadth and at a forearm's, and the higher answer taken: where it
      // falls away from the border, the nearer is the step a walker meets.
      const far = Math.max(baseAt(x + nx * .05, z + nz * .05), baseAt(x + nx * SEAM.probe, z + nz * SEAM.probe));
      const lift = (far - (baseAt(ix, iz) + seamlessDelta(ix, iz) * dryOfStreams(ix, iz) * (1 - seamGroundShare(ix, iz)))) * dryOfStreams(x, z);
      if (!(lift > 0)) continue;
      const sample = { x, z, lift };
      for (let bx = Math.floor((x - SEAM.reach) / cell); bx <= Math.floor((x + SEAM.reach) / cell); bx++)
        for (let bz = Math.floor((z - SEAM.reach) / cell); bz <= Math.floor((z + SEAM.reach) / cell); bz++) {
          const k = `${bx},${bz}`; if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(sample);
        }
    }
  }
  SEAM_SAMPLES = freeze({ cell, buckets });
  return SEAM_SAMPLES;
}
/** How far this side of the border is lifted to meet the far side: never down, and nothing beyond four metres in. */
export function seamLift(x, z, baseAt) {
  if (!baseAt) return 0;
  const { cell, buckets } = seamSamples(baseAt);
  let lift = 0;
  for (const sample of buckets.get(`${Math.floor(x / cell)},${Math.floor(z / cell)}`) ?? []) {
    const d = Math.hypot(x - sample.x, z - sample.z);
    if (d < SEAM.reach) lift = Math.max(lift, sample.lift * (1 - smooth(SEAM.full, SEAM.reach, d)));
  }
  return lift;
}

/**
 * **The ground either side of the Legemum and East Pyros borders** (2026-10-03). Both were unbuilt
 * `outland` when this country was built, and both were then built as countries of their own, each
 * shaping its ground toward the ground it is handed over its last tens of metres (48 m in Legemum, 72 in
 * East Pyros) - which is the world's hex blend. Along these two borders that blend is at its worst: it
 * mixes their six metres of roll on a 150 m wave with this country's eighty centimetres on 320, and a blend
 * of wavelengths is a chirp - ribs of three to five metres every few metres for seventy metres out - and it
 * steps along hex edges as well. Measured, that was a step of up to 4.9 m at the border line itself, by the
 * hex corners, and ribs steeper than one in one over much of both neighbours' last forty metres.
 *
 * So within `hold` metres of these two borders, on both sides of them and on no one else's ground, the
 * blend's own ground is laid seamless and unchirped before anybody shapes it (`telemoniaSeamBedrock`,
 * which src/world/terrain/world-terrain.js lays under everything): every hex in reach weighed as the blend weighs it, and
 * **each hex's own relief** blended, not its wavelength. Both sides of the border then hand their countries
 * the same smooth ground, the neighbours feather to it as they did, the outer face rises off it as it did,
 * and they meet at the line. It lets go over `fade` metres away from the border, out where both
 * neighbours' own ground has long since taken over from it, and within `corner` metres of every line where
 * these three countries meet anybody else - Gala, the Oves Desert, the open country - whose ground is left
 * exactly as it was.
 */
export const SEAM_GROUND = freeze({ hold: 75, fade: 110, corner: 40 });
const SEAM_COUNTRIES = freeze([TELEMONIA, 'Legemum', 'East Pyros']);
const SEAM_EDGES = freeze(BORDER.filter(edge => edge.neighbour === 'Legemum' || edge.neighbour === 'East Pyros'));
const SEAM_BOX = (() => {
  const box = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const edge of SEAM_EDGES) for (const p of [edge.a, edge.b]) {
    box.minX = Math.min(box.minX, p.x - SEAM_GROUND.fade); box.maxX = Math.max(box.maxX, p.x + SEAM_GROUND.fade);
    box.minZ = Math.min(box.minZ, p.z - SEAM_GROUND.fade); box.maxZ = Math.max(box.maxZ, p.z + SEAM_GROUND.fade);
  }
  return freeze(box);
})();
/** Every hex's own terrain profile, as the world's blend reads it (`cellProfile` in src/world/terrain/region-world.js). */
const HEX_PROFILE = (() => {
  const profiles = new Map();
  for (const [name, list] of Object.entries(REGION_CELLS)) for (const cell of list)
    profiles.set(key(cell.q, cell.r), REGION_TERRAIN[name]?.byTerrain?.[cell.terrain] ?? REGION_TERRAIN[name]);
  return profiles;
})();
const ownerOf = (q, r) => { const c = hexCentre(q, r); return hexOwnerAt(c.x, c.z); };
/** The hex edges between these three countries and anybody else, round the seam: the lines whose ground is left alone. */
const SEAM_ENDS = (() => {
  const out = [], inBox = c => c.x > SEAM_BOX.minX - 100 && c.x < SEAM_BOX.maxX + 100 && c.z > SEAM_BOX.minZ - 100 && c.z < SEAM_BOX.maxZ + 100;
  for (const name of SEAM_COUNTRIES) for (const cell of REGION_CELLS[name] ?? []) {
    if (!inBox(cell)) continue;
    for (let i = 0; i < 6; i++) if (!SEAM_COUNTRIES.includes(ownerOf(cell.q + AXIAL[i][0], cell.r + AXIAL[i][1])))
      out.push(freeze({ a: corner(cell.q, cell.r, (i + 5) % 6), b: corner(cell.q, cell.r, i) }));
  }
  return freeze(out);
})();
const BLEND_REACH = METRES_PER_HEX * 1.28;
const WITHIN_TWO = freeze([[0, 0], ...AXIAL, [2, 0], [2, -1], [2, -2], [1, -2], [0, -2], [-1, -1], [-2, 0], [-2, 1], [-2, 2], [-1, 2], [0, 2], [1, 1]]);
/** How much of a point's ground is laid unchirped: 1 along the two borders, 0 off the three countries and at the lines they share with anybody else. */
export function seamGroundShare(x, z) {
  if (x < SEAM_BOX.minX || x > SEAM_BOX.maxX || z < SEAM_BOX.minZ || z > SEAM_BOX.maxZ) return 0;
  if (!SEAM_COUNTRIES.includes(hexOwnerAt(x, z))) return 0;
  let seam = Infinity, end = Infinity;
  for (const edge of SEAM_EDGES) seam = Math.min(seam, segmentDistance(x, z, edge.a, edge.b));
  if (seam >= SEAM_GROUND.fade) return 0;
  for (const edge of SEAM_ENDS) end = Math.min(end, segmentDistance(x, z, edge.a, edge.b));
  return (1 - smooth(SEAM_GROUND.hold, SEAM_GROUND.fade, seam)) * smooth(0, SEAM_GROUND.corner, end);
}
/** The blend's inland ground with every hex in reach and each hex's own relief, less the stepped, chirping one the world lays. */
function unchirpedDelta(x, z) {
  const home = hexAt(x, z);
  let total = 0, sum = 0;
  for (const [dq, dr] of WITHIN_TWO) {
    const q = home.q + dq, r = home.r + dr, c = hexCentre(q, r);
    const weight = Math.max(0, 1 - Math.hypot(x - c.x, z - c.z) / BLEND_REACH);
    if (!weight) continue;
    const p = HEX_PROFILE.get(key(q, r)) ?? REGION_TERRAIN.outland;
    total += weight; sum += weight * (p.base + relief(x, z, p.amp, p.wave));
  }
  if (!total) return 0;
  const was = terrainMix(x, z);
  // `regionBase` (src/world/terrain/world-terrain.js) blends the inland ground into its beach over 2...40 m from the coast.
  return (sum / total - was.base - relief(x, z, was.amp, was.wave)) * smooth(2, 40, landDistance(x, z));
}
/** The bedrock the world lays, with the blend made seamless and unchirped along the Legemum and East Pyros borders. */
export function telemoniaSeamBedrock(x, z, bedrock) {
  const share = seamGroundShare(x, z);
  return share > 0 ? bedrock + unchirpedDelta(x, z) * share : bedrock;
}

/**
 * **Telemonia's own ground**, from the ground it is handed. Outside the box and on anybody else's hexes
 * it answers with exactly what it was given; at the border line it meets the ground across it (`seamLift`),
 * because the outer face rises off that; inside, it is the country's own. `baseAt` is the ground before
 * this country anywhere, for the seam; without it (a test of the country's shape alone) there is no lift.
 */
export function telemoniaGround(x, z, ground, baseAt = null) {
  if (!inTelemoniaBox(x, z) || hexOwnerAt(x, z) !== TELEMONIA) return ground;
  const handed = ground, dry = dryOfStreams(x, z);
  if (dry <= 0) return handed;
  if (baseAt) {
    const depth = borderDepth(x, z);
    // Along the Legemum and East Pyros borders the ground handed over is already seamless (`telemoniaSeamBedrock`).
    if (depth < SEAM.seamless) ground += seamlessDelta(x, z) * seamlessShare(depth) * dryOfStreams(x, z) * (1 - seamGroundShare(x, z));
    if (depth < SEAM.reach + 1) ground += seamLift(x, z, baseAt);
  }
  const f = form(x, z, ground);
  if (f.raw <= 0) return ground;
  let height;
  if (f.inner <= 0) {
    // The Galmeth: level, with the washes cut into it.
    height = f.height - washCut(x, z);
  } else {
    // The rim: cliff bands on the rock, terraces on the lower inner face with stairs up through them.
    // No terraces in a pass: its floor goes down through the belt to the plain on its own grade.
    const pass = passAt(x, z), inPass = !!pass && pass.distance < pass.half + .5;
    const terraceZone = !inPass && f.inner < INNER.terraceWidth + 1 && f.height < f.plain + INNER.terraceTop + .05 && f.height <= f.outerFace + .5;
    if (terraceZone) {
      const stepped = f.plain + terraceCourses(f.height - f.plain);
      const stair = 1 - smooth(TERRACES.stairHalf, TERRACES.stairHalf + TERRACES.stairFeather, stairDistance(x, z));
      height = lerp(stepped, f.height, stair);
    } else {
      // Laid in courses everywhere on the rock, let in over the first metres inside the border - by the
      // smoothed border, so the first cliff does not follow the hexes' zigzag - and only ever upward, so
      // the ground never dips between the border and the face.
      height = lerp(f.height, strata(f.height, x, z), smooth(0, 3, f.raw) * smooth(-1, 4, f.outer));
    }
    // Where the rock meets the plain at a face the terraces do not reach, a course is never let down
    // below the plain it stands on.
    height = lerp(height, Math.max(height, f.plain - .2), 1 - smooth(4, 12, f.inner));
    height -= washCut(x, z) * (1 - smooth(0, 8, f.inner));
  }
  // The gullies: a floor from the cliff foot to the plain, stepped by check-walls, with steep banks.
  const g = gullyAt(x, z);
  if (g && g.distance < 24) {
    const t = clamp(g.along / g.gully.length, 0, 1), top = f.plain + INNER.terraceTop + 1.4;
    const floorRaw = lerp(top, f.plain - .5, t);
    const floor = f.plain - .5 + courses(floorRaw - (f.plain - .5), g.gully.checks, .1, .08);
    const e = g.distance - g.gully.half, walls = e <= 0 ? 0 : e < 1.6 ? 1.3 * e * e / 3.2 : 1.3 * (e - .8);
    height = Math.min(height, floor + walls);
  }
  // The Rothkar way: its floor up the terraces and across the inner cliff, cut in or built out.
  height = wayCut(x, z, height);
  // The passes cut through everything, down to their own floors.
  height = Math.min(height, passCut(x, z, ground));
  // The rock stands on the plain.
  const lift = kethornLift(x, z);
  if (lift > 0) height = Math.max(height, plainLevel(x, z) + lift);
  // Where a border stream's softened line cuts a corner of the country, its water and its banks are its own.
  return dry < 1 ? lerp(handed, height, dry) : height;
}

/**
 * How far the world's own ground grid is sunk under Telemonia, which draws its own finer ground
 * (src/content/regions/telemonia/telemonia-scenery.js): not at all at the border, all the way once the country's ground stands a
 * couple of metres off what it was handed. The world's grid is seven metres apart out here, and a cliff
 * band five metres wide is not drawn on it at all.
 */
export function telemoniaTerrainSink(x, z) {
  if (!inTelemoniaBox(x, z) || hexOwnerAt(x, z) !== TELEMONIA) return 0;
  return 60 * smooth(1.5, 4, borderDepth(x, z));
}
/**
 * How far past the border the country's own ground is drawn: over every cell of the world's grid with a
 * sunk corner. A cell of that grid is 7.1 m square (src/world.js, `axisSamples`), so a corner sunk 1.5 m
 * inside the border tilts the whole cell down, out to 7.1 x sqrt 2 - 1.5 = 8.5 m outside it; and nothing
 * else draws the neighbours' ground there. Drawn only to the border, that cell was a trench along the
 * outside of the country, up to 17 m deep (by the Gala border), the sea at its bottom in places - the
 * review pictures showed the sea through it from the Oves Desert. Out here this ground is the
 * neighbours' own (`groundHeight` is theirs) in their own colour.
 */
export const TELEMONIA_PATCH_REACH = 9;
/**
 * Whether the ground drawn at a point is this country's own finer ground (above), as it is out to
 * `TELEMONIA_PATCH_REACH` past the border, over the world's grid sunk under it. A neighbour's scenery
 * stands there on `heightAt`, which this ground is drawn from, and not on the grid's triangles
 * (`renderedGroundHeight`): out there they lie up to sixty metres under the drawn ground, and Legemum's and
 * East Pyros's grass, stones and trees within a few metres of the border were buried in it (2026-10-03).
 */
export const telemoniaDrawsGround = (x, z) => inTelemoniaBox(x, z) && borderDepth(x, z) > -TELEMONIA_PATCH_REACH;

// ---------------------------------------------------------------------------
// What the ground is made of: the colour and the scatter read it
// ---------------------------------------------------------------------------
const hexOf = swatch => (typeof swatch === 'string' ? parseInt(swatch.replace('#', ''), 16) : swatch);
const mixHex = (from, to, t) => {
  const k = clamp(t, 0, 1), channel = shift => { const a = (from >> shift) & 0xff, b = (to >> shift) & 0xff; return Math.round(a + (b - a) * k) & 0xff; };
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
};
/**
 * The ground's own colours, written in the space they are read in (`mixHex` over integers, as
 * `src/world/environment/region-sky.js` and the Selemis tint do), never through HSL.
 */
export const TELEMONIA_GROUND = freeze({
  grass: hexOf(REGION_TERRAIN[TELEMONIA]?.ground ?? '#a59c7a'),   // bunch grass, buff, on the plain and the ledges
  rock: 0x8f877a,       // the rim's stone: warm grey, darker than the Oves's worn rock
  ledge: 0x9d9478,      // thin soil on the ledges, stone through it
  terrace: 0x9a8566,    // the terraces' bare earth, worked and unplanted
  wash: 0xc0b49a,       // washed stones in the washes
  belketh: 0x6f7550,    // leaf litter and shade under the wood
  passFloor: 0xa9a084,  // the passes' floors: gravel and stone, walked
});
/**
 * What a point's ground is, each 0 to 1: how much of it is bare rock (the cliff bands, by slope), a
 * ledge, a terrace tread, a wash, the Belketh's floor, a pass's floor. The tint, the scatter and the
 * tests all read this.
 */
export function telemoniaCover(x, z, slope = 0) {
  const place = telemoniaPlace(x, z);
  if (!place) return null;
  const rimShare = smooth(-1, 3, place.inner) * smooth(1, 8, place.raw);
  const rock = smooth(.7, 1.3, slope) * rimShare * (place.terraced ? .2 : 1);
  return {
    rock,
    ledge: rimShare * (1 - rock) * (place.terraced ? 0 : smooth(place.plain + 6, place.plain + 14, place.height)),
    terrace: place.terraced ? 1 - smooth(-.5, .5, -place.inner) : 0,
    wash: washWeight(x, z),
    belketh: place.belketh,
    pass: onPassFloor(x, z),
    way: onWayFloor(x, z),
    plain: 1 - smooth(-2, 2, place.inner),
    kethorn: kethornLift(x, z) > 2 ? 1 : 0,
  };
}
/**
 * Telemonia's row in the ground-tint table (`GROUND_TINTS`, src/world/terrain/world-terrain.js). The rim's own fine
 * ground is coloured again by the scenery, by slope, which the tint cannot know; this is the colour the
 * world's grid, the chart and the minimap see. `null` off Telemonia's own ground.
 */
export function telemoniaTint(x, z, ground) {
  if (!inTelemoniaBox(x, z)) return null;
  if (ground !== REGION_TERRAIN[TELEMONIA].ground) return null;
  if (hexOwnerAt(x, z) !== TELEMONIA) return null;
  const cover = telemoniaCover(x, z);
  if (!cover) return null;
  const g = TELEMONIA_GROUND;
  let colour = g.grass;
  colour = mixHex(colour, g.ledge, cover.ledge * .7);
  colour = mixHex(colour, g.terrace, cover.terrace * .75);
  colour = mixHex(colour, g.belketh, cover.belketh * .55);
  colour = mixHex(colour, g.passFloor, Math.max(cover.pass * .5, cover.way * .7));
  colour = mixHex(colour, g.wash, cover.wash * .8);
  colour = mixHex(colour, g.rock, cover.kethorn * .6);
  return colour;
}

// ---------------------------------------------------------------------------
// The chart
// ---------------------------------------------------------------------------
/** The point `s` metres along a line. */
function alongLine(line, run, s) {
  let i = 1; while (i < run.length - 1 && run[i] < s) i++;
  const a = line[i - 1], b = line[i], t = clamp((s - run[i - 1]) / (run[i] - run[i - 1]), 0, 1);
  return point(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t);
}
/**
 * Where on a pass the chart names it: its col, where it has one - the Tarnel and the south pass climb to
 * a col over the plain and drop into it - and otherwise its narrows, the narrowest of its floor, which is
 * where the east pass is held: it climbs from Gala to the plain without a col, because it is the gorge
 * the plain drains through.
 */
export function passCol(p) {
  let top = p.stations[0], narrow = p.stations[0];
  for (const st of p.stations) { if (st[1] > top[1]) top = st; if (st[2] < narrow[2]) narrow = st; }
  return alongLine(p.points, p.run, top[1] > p.stations.at(-1)[1] + 1 ? top[0] : narrow[0]);
}
/** A point on the terrace belt, `distance` metres out from the Galmeth's edge on a bearing from its middle. */
export function beltPoint(angle, distance = 13) {
  const dx = Math.cos(angle), dz = Math.sin(angle);
  for (let r = 40; r < 320; r += .5) {
    const x = PLAIN_MIDDLE.x + dx * r, z = PLAIN_MIDDLE.z + dz * r;
    if (plainDistance(x, z) >= distance) return point(x, z);
  }
  return PLAIN_MIDDLE;
}
/** The Galmeth's open ground, south-east of the rock: the plain where stage 2's fields go. */
export const GALMETH_VIEW = point(-2032, 1296);
/** The Belketh's own ground: the middle of the two `Csb` hexes. */
export const BELKETH = (() => {
  const cells = TELEMONIA_CELLS.filter(cell => TELEMONIA_CLIMATE[key(cell.q, cell.r)] === 'Csb');
  return point(cells.reduce((sum, c) => sum + c.x, 0) / cells.length, cells.reduce((sum, c) => sum + c.z, 0) / cells.length);
})();
/** The west rim, where it is two hexes thick and ridge stands behind ridge: the middle of (-16,120). */
export const WEST_RIM = (() => { const c = TELEMONIA_CELLS.find(cell => cell.q === -16 && cell.r === 120) ?? { x: -2300, z: 1241.4 }; return point(c.x, c.z); })();
/** The terrace belt the chart names: the west inner face, under the Rothkar, below the way's shelf across the cliff (and not on the way). */
export const TERRACE_VIEW = beltPoint(Math.atan2(ROTHKAR.z - PLAIN_MIDDLE.z, ROTHKAR.x - PLAIN_MIDDLE.x) - .25);

/**
 * The country's places. Five names are the lore's own - the Galmeth, Kethorn, the Rothkar, the Belketh
 * and the Tarnel, every one of them in the `kellith` profile's own candidate pool - and the rest are
 * plain English: the lore names no other pass, no wall and no terrace.
 */
export const TELEMONIA_LANDMARKS = freeze([
  freeze({ id: 'telemonia-galmeth', name: 'The Galmeth', x: GALMETH_VIEW.x, z: GALMETH_VIEW.z, radius: 150,
    description: 'The plain: one enclosed, raised and level plain inside the rim, thirty metres up, with dry washes across it and the rock of Kethorn in the middle. The translators give the word simply as "the plain". It is farmed to its edges, barley and pulses, by the field people.' }),
  freeze({ id: KETHORN.id, name: 'Kethorn’s rock', x: KETHORN.x, z: KETHORN.z, radius: 50,
    description: 'An outcrop in the middle of the Galmeth: a rock with cliff on three sides and a wall closing the fourth, twenty metres over the plain, its top level ground, and on it the town, built of the stone it stands on.' }),
  freeze({ id: 'telemonia-kethorn-gate', name: 'The gate of Kethorn', x: KETHORN_WALL.outside.x, z: KETHORN_WALL.outside.z,
    description: 'The one gate in the only wall in Telemonia, across the head of the spur that comes down off the rock’s south-western end. Nobody is appointed to keep it, because nobody is exempt from keeping it.' }),
  freeze({ id: ROTHKAR.id, name: ROTHKAR.name, x: ROTHKAR.x, z: ROTHKAR.z,
    description: 'The highest rock of the rim, on the East Pyros side where the rim is thickest: ninety metres up, sixty over the plain, bare and steep on every side. Tormon is said to sit here. The three seasonal ceremonies are held in the open, within sight of it.' }),
  ...PASSES.map(p => {
    const at = passCol(p);
    const words = {
      'telemonia-tarnel': 'The pass north to the Oves Desert, through the rim where it is thinnest: a gorge up to a col four metres over the plain and down into it. The track along the hills’ foot below it is the desert’s southern route, and the road the bands go out to their contracts by. Tarnel is a Kellith name: the root for a hill and a fort.',
      'telemonia-east-pass': 'The pass east to Gala, and the gorge the Galmeth drains through: every wash on the plain comes together at its head and leaves by it, and the Treloss rises at its foot. It opens on Gala on the one stretch of that border with no stream on it.',
      'telemonia-south-pass': 'The pass south toward Legemum, whose tin reaches the border markets: a gorge up to a col over the plain and down into it.',
    };
    return freeze({ id: p.id, name: p.name, x: at.x, z: at.z, description: words[p.id] });
  }),
  freeze({ id: 'telemonia-terraces', name: 'The terraces', x: TERRACE_VIEW.x, z: TERRACE_VIEW.z,
    description: 'Dry-stone steps on the rim’s inner faces, from the cliff foot down to the plain: walls a metre and eight high holding treads four metres deep, with stairs up through them, and the dry-country vine in a row along every tread.' }),
  freeze({ id: ROTHKAR_WAY.id, name: ROTHKAR_WAY.name, x: ROTHKAR_WAY.points.at(-1).x, z: ROTHKAR_WAY.points.at(-1).z,
    description: 'The one walked way from the Galmeth onto the rim: up the western terraces slantwise and across the inner cliff on a shelf cut into the face, to the ledge at the foot of the Rothkar, sixty metres up with nothing between a man and the rock. It goes up onto the rim and not through it.' }),
  freeze({ id: 'telemonia-belketh', name: 'The Belketh', x: BELKETH.x, z: BELKETH.z,
    description: '"The wooded edge": the only wood in Telemonia, evergreen oak with pine on its ledges, in the south-eastern corner where the hills stand near enough to the sea to catch its weather.' }),
  freeze({ id: 'telemonia-west-rim', name: 'The western rim', x: WEST_RIM.x, z: WEST_RIM.z,
    description: 'Ridge behind ridge on the East Pyros side, running north-east to south-west, bare along the crests and broken by cliff bands, with narrow valleys between them that end against the next ridge. No pass crosses it.' }),
]);
