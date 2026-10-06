/**
 * The West Lotharn Mountains: the spine of the range, as pure numbers.
 *
 * The same mountains as the East (`src/content/regions/east-lotharn/east-lotharn-world.js`), and **the taller half of them**.
 * The atlas gives this country twenty-five `mountain` hexes to the East's fifteen over forty-eight
 * hexes to the East's thirty-eight, so this is the main range and the East reads as its eastern
 * foothills; asked on 29 September 2026, the user chose a crest of about five hundred and fifty
 * metres and everything else carried over - cliffs in courses, cut ramps, ledge paths and caves.
 *
 * The lore (`../world-builder/azhora_lore/geography/regions/lotharn.md`, rewritten in place for the
 * East on 27 September 2026 and adjusted again here): "old mountains... Age has not made them low.
 * It has made them stepped. The soft beds of shale and coal have worn back faster than the hard
 * sandstone and limestone between them, and every peak now stands as courses of cliff with ledges
 * between them, band over band... a shelf of soil and old forest along the top of each, and a bald
 * of grass at the summit where the last cliff ends." And: "the valleys are the defining feature of
 * the range... some broad and flat-bottomed where glaciation left deposits now grown over with deep
 * soil"; "the northern face drains toward the Lizeem system and the Mithala plain".
 *
 * **The atlas, and where its twenty-five mountain hexes are.** They are not one block. Measured off
 * the survey they fall into four masses, and the crest is put on the largest of them:
 *
 *  - **the main massif**, thirteen hexes running north-east from (-2250,-577) through (-1950,-750)
 *    and splitting into a north arm to (-2050,-924) and an east arm to (-1600,-837). **The crest**
 *    stands on it, with the north summit, the west shoulder and the east summit on its arms;
 *  - **the south-east spur**, five hexes from (-1650,-577) south-west to (-1950,-404);
 *  - **the cold head**, three hexes at the western tip, (-2500,-491) to (-2300,-491);
 *  - **the south rampart**, four hexes along the whole southern edge, (-2400,-317) to (-2100,-317),
 *    one hex deep against Isareos, which is why it is a wall and not a peak.
 *
 * Between them the twenty-three `hills` hexes are the skirts, and one long chain of them runs the
 * whole width of the country from the Vastos margin to the western hills: **the long valley**, with
 * a divide a fifth of the way along it and a beck leaving each end.
 *
 * **Climate.** Read per hex off the World Builder map (`azhora.wwmap`, `hexes[key].climate`,
 * `koppen-v1`), forty-seven hexes are `Cfa` and one is `Dfa` - see `WEST_LOTHARN_CLIMATE`. One hex
 * cannot carry a band, so no band is drawn; what it gets is a name and a note (`the cold head`).
 *
 * **Nothing here belongs to anybody**: no settlement, road, pass, inn, mine, workings, bridge, sign
 * or person. The East Lotharn has a pass road, an inn and iron workings because it was built to an
 * earlier brief, and none of that is copied (docs/west-lotharn-brief.md).
 *
 * Pure: no three.
 */
import { terrainMix, seamlessTerrainMix, relief, REGION_CELLS, METRES_PER_HEX, hexOwnerAt } from '../../../world/terrain/region-world.js';
import { KEMRATH, kemrathFloor } from '../east-lotharn/east-lotharn-world.js';

const freeze = Object.freeze;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const smooth = (a, b, x) => { const v = clamp((x - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); };
const lerp = (a, b, t) => a + (b - a) * t;
const point = (x, z) => freeze({ x, z });

export const WEST_LOTHARN = 'West Lotharn Mountains';

// ---------------------------------------------------------------------------
// The atlas's climate, which is forty-seven of one code and one of another
// ---------------------------------------------------------------------------
/**
 * What the World Builder map paints on every hex of the country. The developer export drops the
 * field, so it is written out here and `tests/west-lotharn-world.test.js` holds it to the map hex
 * for hex whenever the map is on the machine to ask.
 *
 * Forty-seven `Cfa` - humid, warm-summered, wet the year round, which is what the East Lotharn is
 * on all thirty-eight of its hexes - and **one `Dfa`**, at (-8,100), the westernmost `mountain` hex
 * in the country and the one furthest from the Mithala plain's maritime air. A single hex is a
 * hundred metres of ground: it cannot carry a climate band, and none is drawn. It is named instead,
 * and the name is the note: the mountain block it stands on is **the cold head**.
 */
export const WEST_LOTHARN_CLIMATE = freeze({
  '-1,95': 'Cfa', '0,95': 'Cfa', '1,95': 'Cfa', '2,95': 'Cfa', '3,95': 'Cfa',
  '-1,96': 'Cfa', '0,96': 'Cfa', '1,96': 'Cfa', '2,96': 'Cfa', '3,96': 'Cfa',
  '-3,97': 'Cfa', '-2,97': 'Cfa', '-1,97': 'Cfa', '0,97': 'Cfa', '1,97': 'Cfa', '2,97': 'Cfa',
  '-4,98': 'Cfa', '-3,98': 'Cfa', '-2,98': 'Cfa', '-1,98': 'Cfa', '0,98': 'Cfa', '1,98': 'Cfa', '2,98': 'Cfa',
  '-5,99': 'Cfa', '-4,99': 'Cfa', '-3,99': 'Cfa', '-2,99': 'Cfa', '-1,99': 'Cfa', '0,99': 'Cfa', '1,99': 'Cfa',
  '-8,100': 'Dfa', '-7,100': 'Cfa', '-6,100': 'Cfa', '-5,100': 'Cfa', '-4,100': 'Cfa', '-3,100': 'Cfa', '-2,100': 'Cfa',
  '-8,101': 'Cfa', '-7,101': 'Cfa', '-6,101': 'Cfa', '-5,101': 'Cfa', '-4,101': 'Cfa', '-3,101': 'Cfa',
  '-8,102': 'Cfa', '-7,102': 'Cfa', '-6,102': 'Cfa', '-5,102': 'Cfa', '-4,102': 'Cfa',
});
/** The country's climate, in one word, and the one hex that is not it. */
export const WEST_LOTHARN_KOPPEN = 'Cfa';
export const COLD_HEAD_HEX = freeze({ q: -8, r: 100, climate: 'Dfa' });

// ---------------------------------------------------------------------------
// The country's own ground
// ---------------------------------------------------------------------------
/** The box every question here is asked inside: the region's hexes grown by a hex and a half. */
export const WEST_LOTHARN_BOX = (() => {
  const box = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const cell of REGION_CELLS[WEST_LOTHARN] ?? []) {
    const reach = METRES_PER_HEX * 1.5;
    box.minX = Math.min(box.minX, cell.x - reach); box.maxX = Math.max(box.maxX, cell.x + reach);
    box.minZ = Math.min(box.minZ, cell.z - reach); box.maxZ = Math.max(box.maxZ, cell.z + reach);
  }
  return freeze(box);
})();
const boxInset = (x, z) => Math.min(x - WEST_LOTHARN_BOX.minX, WEST_LOTHARN_BOX.maxX - x, z - WEST_LOTHARN_BOX.minZ, WEST_LOTHARN_BOX.maxZ - z);
export const inWestLotharnBox = (x, z) => boxInset(x, z) > 0;

/**
 * How much a point is this range's own to shape: all of it where the land round it is the West
 * Lotharn's, nothing across the borders with the East Lotharn, Vastos, Meneth, Isareos and the
 * unbuilt country a little way in, and nothing at the box's edge. Both terms are continuous, so a
 * landform weighed by this meets the ground next door without a step, and **no neighbour's ground
 * moves** - which matters more here than anywhere: twenty-nine of this country's forty-eight hex
 * edges are against built country.
 */
export function westLotharnShare(x, z, mix = seamlessTerrainMix(x, z)) {
  // The two Celders were unbuilt when this range was shaped, and are still measured as the outland they were: their
  // own ground meets this range's at the line (src/content/regions/south-celder/south-celder-world.js), so registering them moved none of it.
  const later = (mix.weights['South Celder'] ?? 0) + (mix.weights['North Celder'] ?? 0);
  const inset = boxInset(x, z), land = 1 - (mix.weights.outland ?? 0) - later;
  if (inset <= 0 || land <= 1e-6) return 0;
  return smooth(.3, .75, (mix.weights[WEST_LOTHARN] ?? 0) / land) * smooth(0, 40, inset);
}

// ---------------------------------------------------------------------------
// Lines
// ---------------------------------------------------------------------------
/** The western module's own corner cutting, pass for pass, so a valley floor lies under its water. */
function soften(points, passes = 2) {
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
}
/** A polyline, smoothed as its water will be, with its running length and its box. */
function polyline(raw) {
  const points = soften(raw);
  const runs = [0];
  for (let i = 1; i < points.length; i++) runs.push(runs[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z));
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of points) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); }
  return freeze({ raw: freeze(raw.map(p => point(p.x, p.z))), points: freeze(points.map(p => point(p.x, p.z))), runs: freeze(runs), length: runs.at(-1), bounds: freeze({ minX, maxX, minZ, maxZ }) });
}
/**
 * Distance from a line, how far along it the nearest point is, which side of it, and whether that
 * nearest point is one of its two ends. `along` is blended over the segments nearly as near as the
 * nearest, for the same reason the East's is: on the inside of a bend a floor read off the nearest
 * segment alone steps across a line.
 */
export function nearestOn(line, x, z) {
  let best = { distance: Infinity, along: 0, side: 1, end: false };
  const p = line.points, near = [];
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1], b = p[i], dx = b.x - a.x, dz = b.z - a.z, length2 = dx * dx + dz * dz || 1;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / length2, 0, 1);
    const distance = Math.hypot(a.x + dx * t - x, a.z + dz * t - z), along = line.runs[i - 1] + Math.sqrt(length2) * t;
    near.push(distance, along);
    if (distance < best.distance) best = { distance, along, side: dx * (z - a.z) - dz * (x - a.x) < 0 ? 1 : -1,
      end: (i === 1 && t <= 0) || (i === p.length - 1 && t >= 1), x: a.x + dx * t, z: a.z + dz * t };
  }
  let weight = 0, sum = 0;
  for (let k = 0; k < near.length; k += 2) {
    const over = near[k] - best.distance;
    if (over > 12) continue;
    const w = Math.exp(-over / 2.5);
    weight += w; sum += w * near[k + 1];
  }
  best.along = sum / weight;
  return best;
}
/** The point a distance along a line, with the line's left normal there. */
export function pointOn(line, along) {
  const target = clamp(along, 0, line.length);
  let i = 1; while (i < line.runs.length - 1 && line.runs[i] < target) i++;
  const a = line.points[i - 1], b = line.points[i], span = line.runs[i] - line.runs[i - 1] || 1, t = (target - line.runs[i - 1]) / span;
  const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz) || 1;
  return { x: a.x + dx * t, z: a.z + dz * t, nx: -dz / length, nz: dx / length };
}
const outside = (line, x, z) => Math.max(line.bounds.minX - x, x - line.bounds.maxX, line.bounds.minZ - z, z - line.bounds.maxZ, 0);
/** A level read off a list of levels spread evenly down a line. */
const levelAt = (levels, line, along) => {
  const t = clamp(along / line.length, 0, 1) * (levels.length - 1), i = Math.min(levels.length - 2, Math.floor(t));
  return lerp(levels[i], levels[i + 1], t - i);
};

// ---------------------------------------------------------------------------
// The valleys
// ---------------------------------------------------------------------------
/**
 * **The long valley.** The atlas's own: one unbroken chain of `hills` hexes running the whole width
 * of the country from the Vastos margin in the east to the western hills above Yunethre, with the
 * main massif and the cold head on its north-western side and the south-east spur and the south
 * rampart on its other. It is the lore's "broad and flat-bottomed where glaciation left deposits
 * now grown over with deep soil": a floor fifty metres across, walls that take it back to the hill
 * over sixty more, and **a divide a fifth of the way along it**, which is where the ground the
 * atlas gives stands highest. A beck leaves each end - east to the Vastos margin, west to the
 * hills above Yunethre - and the range is crossed by walking up one and down the other.
 *
 * The levels are measured off the ground the hex blend actually makes here, one at each tenth of
 * the line: the valley is cut into that ground, not laid on top of it.
 */
export const LONG_VALLEY = freeze({
  line: polyline([point(-1586, -636), point(-1612, -661), point(-1664, -669), point(-1716, -670), point(-1770, -668),
    point(-1824, -667), point(-1878, -668), point(-1926, -644), point(-1968, -608), point(-2020, -590),
    point(-2072, -566), point(-2112, -528), point(-2162, -508), point(-2208, -482), point(-2246, -444),
    point(-2296, -424), point(-2350, -407), point(-2406, -401), point(-2458, -397)]),
  half: 25, wall: 62,
  // East mouth, up to the divide, then down the long western fall to the western hills.
  levels: freeze([52.5, 59, 64.5, 66, 65, 63.5, 61.5, 59.5, 57.5, 55, 52.5, 50, 47.5, 45.5, 43.5]),
});
export const longValleyFloor = along => levelAt(LONG_VALLEY.levels, LONG_VALLEY.line, along);
/** The divide: the highest point of the floor, and how far along the line it stands. */
export const LONG_VALLEY_DIVIDE = (() => {
  let best = 0, level = -Infinity;
  for (let along = 0; along <= LONG_VALLEY.line.length; along += 2) {
    const here = longValleyFloor(along);
    if (here > level) { level = here; best = along; }
  }
  const p = pointOn(LONG_VALLEY.line, best);
  return freeze({ along: best, level, x: p.x, z: p.z });
})();

/**
 * **The north valley**, the range's own drainage to the Mithala plain - "the northern face drains
 * toward the Lizeem system and the Mithala plain" - down the notch of `hills` the atlas cuts into
 * the massif at (0,96), between the crest's north shoulder and the north summit, and out across the
 * hills shelf of row 95 to the border. Open and steep: a floor twenty metres across falling forty
 * metres in a hundred and eighty, which is a mountain valley and not a gorge.
 */
export const NORTH_VALLEY = freeze({
  line: polyline([point(-1901, -828), point(-1894, -852), point(-1886, -876), point(-1876, -900),
    point(-1864, -922), point(-1852, -944), point(-1841, -966)]),
  half: 19, wall: 54,
  levels: freeze([70, 65, 59, 51, 43, 36, 30]),
});
export const northValleyFloor = along => levelAt(NORTH_VALLEY.levels, NORTH_VALLEY.line, along);

/**
 * **The col**, and **the notch** below it.
 *
 * The East Lotharn's Kemrath is a high valley that "drains west, out of the range toward the West
 * Lotharn" (src/content/regions/east-lotharn/east-lotharn-world.js), and its floor runs out of the East Lotharn's hexes and into
 * this country's at about (-1590,-820). **The col is that gap**: the low ground where the two halves
 * of one range join, forty-three metres, with the West Lotharn's east arm standing over it on one
 * side and the East Lotharn's south-west peak on the other. Nothing is built on it; it is the
 * ground the two ranges meet on and it is left where the East put it.
 *
 * Kemrath's water arrives with it, and **a river cannot stop in the middle of a country**. West of
 * the col this country climbs at once, so the only way out is north: the water turns along the foot
 * of the east arm and cuts **the notch** through the shoulder, falling nineteen metres in a hundred
 * and fifty to the Mithala margin. The notch's floor begins at Kemrath's own foot
 * (`kemrathFloor(KEMRATH.line.length)`), read from the East's module rather than typed in, so the
 * two floors are one floor and there is no step at the hand-over.
 */
export const COL = freeze({ x: -1590, z: -820, radius: 26 });
const KEMRATH_FOOT = kemrathFloor(KEMRATH.line.length);
export const NOTCH = freeze({
  line: polyline([point(-1588, -818), point(-1584, -836), point(-1581, -855), point(-1582, -874),
    point(-1588, -892), point(-1597, -908), point(-1605, -926), point(-1612, -944), point(-1618, -964)]),
  half: 10, wall: 28,
  head: KEMRATH_FOOT - .2, foot: 24.5,
});
export const notchFloor = along => lerp(NOTCH.head, NOTCH.foot, smooth(0, NOTCH.line.length, along));

/** Cut or build a valley into ground: level floor to `half`, back to the hill by `half + wall`. */
function carve(ground, near, half, wall, level) {
  if (near.distance >= half + wall) return ground;
  return lerp(level, ground, smooth(half, half + wall, near.distance));
}

// ---------------------------------------------------------------------------
// The summits
// ---------------------------------------------------------------------------
/**
 * **Seven summits, and the crest is the highest ground in Azhora.** Each stands on mountain hexes
 * the atlas gives, and each `rise` is the lift at its own top before the cliff bands take it in
 * courses; the height a traveler measures is that plus the ground it stands on, cut off level at
 * the bald. The East Lotharn's four are 420, 325, 275 and 240 m, and every one of these but the
 * south rampart stands over the highest of them.
 *
 * The lesser three are lower because the atlas gives them less room, not because they were chosen
 * to be: the south rampart's four `mountain` hexes are a single row against Isareos, forty metres
 * of ground deep, so what the range can be there is a wall over the lake country and not a peak.
 */
export const PEAKS = freeze([
  freeze({ id: 'the-crest', name: 'The crest', x: -1842, z: -792, rise: 545, reach: 232, axis: -.3, stretch: 1.1 }),
  freeze({ id: 'north-summit', name: 'The north summit', x: -2010, z: -878, rise: 440, reach: 204, axis: -.9, stretch: 1.08 }),
  freeze({ id: 'west-shoulder', name: 'The west shoulder', x: -2130, z: -615, rise: 350, reach: 180, axis: -.8, stretch: 1.1 }),
  freeze({ id: 'east-summit', name: 'The east summit', x: -1666, z: -832, rise: 300, reach: 150, axis: .15, stretch: 1.1 }),
  freeze({ id: 'spur-summit', name: 'The spur summit', x: -1778, z: -572, rise: 268, reach: 150, axis: -.6, stretch: 1.1 }),
  freeze({ id: 'cold-head', name: 'The cold head', x: -2392, z: -486, rise: 320, reach: 148, axis: .04, stretch: 1.08 }),
  freeze({ id: 'south-rampart', name: 'The south rampart', x: -2256, z: -330, rise: 186, reach: 136, axis: .1, stretch: 1.1 }),
]);
/**
 * The ridges between them, each with a saddle in it: the main massif's spine from the crest out to
 * its three arms, the spur's own back running south-west toward Meneth, the cold head's three hexes
 * in a row, and the rampart's wall along the whole Isareos border.
 */
export const RIDGES = freeze([
  // Each arm leaves the crest as a **shoulder** rather than as a shoulder-to-summit ramp: it starts
  // well below the crest's own cone and falls gently, so the summit at its end has a bald on it
  // instead of standing on a slope that goes on climbing behind it. Two of them stop short of the
  // summit they lead to and let that summit's own rise finish the job.
  freeze({ from: point(-1842, -792), to: point(-1944, -842), rise: [430, 336], dip: .18, reach: 162 }),
  freeze({ from: point(-1842, -792), to: point(-1780, -818), rise: [430, 285], dip: .16, reach: 140 }),
  freeze({ from: point(-1842, -792), to: point(-1966, -740), rise: [430, 372], dip: .1, reach: 158 }),
  freeze({ from: point(-1966, -740), to: point(-2130, -615), rise: [372, 350], dip: .3, reach: 150 }),
  freeze({ from: point(-2010, -878), to: point(-2050, -914), rise: [400, 270], dip: .12, reach: 118 }),
  freeze({ from: point(-1778, -572), to: point(-1902, -488), rise: [268, 200], dip: .25, reach: 128 }),
  freeze({ from: point(-2392, -486), to: point(-2474, -496), rise: [320, 220], dip: .18, reach: 116 }),
  freeze({ from: point(-2392, -486), to: point(-2308, -488), rise: [320, 265], dip: .2, reach: 120 }),
  freeze({ from: point(-2256, -330), to: point(-2380, -322), rise: [200, 165], dip: .2, reach: 118 }),
  freeze({ from: point(-2256, -330), to: point(-2130, -324), rise: [200, 155], dip: .22, reach: 116 }),
]);

/**
 * How far a point is inside the country: the distance to the nearest ground that is not the West
 * Lotharn's, on a ten-metre lattice made once.
 */
const EDGE = (() => {
  const step = 10, minX = WEST_LOTHARN_BOX.minX, minZ = WEST_LOTHARN_BOX.minZ;
  const cols = Math.ceil((WEST_LOTHARN_BOX.maxX - minX) / step) + 1, rows = Math.ceil((WEST_LOTHARN_BOX.maxZ - minZ) / step) + 1;
  const inside = new Uint8Array(cols * rows), rim = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) if (hexOwnerAt(minX + i * step, minZ + j * step) === WEST_LOTHARN) inside[j * cols + i] = 1;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    if (inside[j * cols + i]) continue;
    const next = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => i + a >= 0 && i + a < cols && j + b >= 0 && j + b < rows && inside[(j + b) * cols + i + a]);
    if (next) rim.push(minX + i * step, minZ + j * step);
  }
  const distance = new Float32Array(cols * rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    if (!inside[j * cols + i]) continue;
    const x = minX + i * step, z = minZ + j * step;
    let best = Infinity;
    for (let k = 0; k < rim.length; k += 2) best = Math.min(best, (rim[k] - x) ** 2 + (rim[k + 1] - z) ** 2);
    distance[j * cols + i] = Math.sqrt(best) - step / 2;
  }
  return freeze({ step, minX, minZ, cols, rows, distance });
})();
export function edgeDistance(x, z) {
  const { step, minX, minZ, cols, rows, distance } = EDGE;
  const fx = (x - minX) / step, fz = (z - minZ) / step, i = Math.floor(fx), j = Math.floor(fz);
  if (i < 0 || j < 0 || i >= cols - 1 || j >= rows - 1) return 0;
  const tx = fx - i, tz = fz - j, at = (a, b) => distance[(j + b) * cols + i + a];
  return lerp(lerp(at(0, 0), at(1, 0), tx), lerp(at(0, 1), at(1, 1), tx), tz);
}

/**
 * The ground the summits stand on, smoothed: the same ground, sampled every ten metres and blurred
 * over fifty, over this country's own hexes only. The atlas's blend steps its level from hill hex
 * to mountain hex over a few tens of metres, and under a massif that step would tilt a ramp past
 * what can be climbed.
 */
const CALM = (() => {
  const step = 10, minX = WEST_LOTHARN_BOX.minX, minZ = WEST_LOTHARN_BOX.minZ;
  const cols = Math.ceil((WEST_LOTHARN_BOX.maxX - minX) / step) + 1, rows = Math.ceil((WEST_LOTHARN_BOX.maxZ - minZ) / step) + 1;
  let level = new Float32Array(cols * rows);
  const own = new Uint8Array(cols * rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = minX + i * step, z = minZ + j * step, mix = seamlessTerrainMix(x, z);
    level[j * cols + i] = mix.base + relief(x, z, mix.amp, mix.wave);
    own[j * cols + i] = hexOwnerAt(x, z) === WEST_LOTHARN ? 1 : 0;
  }
  for (let pass = 0; pass < 3; pass++) {
    const next = new Float32Array(level);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      if (!own[j * cols + i]) continue;
      let sum = 0, count = 0;
      for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) {
        const ii = clamp(i + a, 0, cols - 1), jj = clamp(j + b, 0, rows - 1);
        if (!own[jj * cols + ii]) continue;
        sum += level[jj * cols + ii]; count++;
      }
      next[j * cols + i] = sum / count;
    }
    level = next;
  }
  return freeze({ step, minX, minZ, cols, rows, level });
})();
function calmGround(x, z) {
  const { step, minX, minZ, cols, rows, level } = CALM;
  const fx = clamp((x - minX) / step, 0, cols - 1.001), fz = clamp((z - minZ) / step, 0, rows - 1.001), i = Math.floor(fx), j = Math.floor(fz);
  const tx = fx - i, tz = fz - j, at = (a, b) => level[(j + b) * cols + i + a];
  return lerp(lerp(at(0, 0), at(1, 0), tx), lerp(at(0, 1), at(1, 1), tx), tz);
}

/** Plain distance to a line, and nothing past `limit` beyond its box. */
function lineDistance(line, x, z, limit = Infinity) {
  if (outside(line, x, z) > limit) return Infinity;
  const p = line.points;
  let best = Infinity;
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1], b = p[i], dx = b.x - a.x, dz = b.z - a.z, length2 = dx * dx + dz * dz || 1;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / length2, 0, 1);
    best = Math.min(best, Math.hypot(a.x + dx * t - x, a.z + dz * t - z));
  }
  return best;
}
/** Each lowland and how far from its line the mountains may begin to rise. */
const LOWLANDS = freeze([
  { line: LONG_VALLEY.line, clear: 42 }, { line: NORTH_VALLEY.line, clear: 34 }, { line: NOTCH.line, clear: 20 },
]);
/** How far a point is from the nearest lowland or border, less inside one. */
function lowlandReach(x, z) {
  let d = edgeDistance(x, z) - 8;
  const col = Math.hypot(x - COL.x, z - COL.z) - COL.radius;
  if (col < d) d = col;
  for (const low of LOWLANDS) {
    const reach = lineDistance(low.line, x, z, Math.max(0, d) + low.clear) - low.clear;
    if (reach < d) d = reach;
  }
  return d;
}
export const lowlandDistance = (x, z) => Math.max(0, lowlandReach(x, z));
/** A slow wander in where the summits are measured from, so no face is a cone. */
const warpX = (x, z) => x + Math.sin(z * .019 + .7) * 10 + Math.sin(z * .044 + x * .012) * 6;
const warpZ = (x, z) => z + Math.sin(x * .017 + 1.9) * 10 + Math.sin(x * .041 - z * .013) * 6;
/** The summits' lift at a point, before the cliff bands: the highest any one of them gives it. */
function rawUplift(x, z) {
  let dv = lowlandReach(x, z);
  if (dv < -12) return 0;
  dv = Math.max(0, dv + Math.sin(x * .029 + z * .016) * 6 + Math.sin(z * .049 - x * .011 + 1.2) * 4);
  if (dv <= 0) return 0;
  const wx = warpX(x, z), wz = warpZ(x, z);
  let best = 0;
  const slack = 12 * (1 - smooth(8, 40, dv));
  const lift = (rise, ds, reach) => rise * smooth(0, 1, (dv / (dv + ds + slack)) ** .65) * (1 - smooth(reach * .55, reach, ds));
  const join = (a, b, k = 28) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.max(a, b) + h * h * k / 4; };
  for (const peak of PEAKS) {
    // Each mass follows its own bedrock direction. Broad unequal buttresses break up the
    // circular drum silhouette without making noise-sized obstacles on the ledge routes.
    const dx = wx - peak.x, dz = wz - peak.z, c = Math.cos(peak.axis), s = Math.sin(peak.axis);
    const along = dx * c + dz * s, across = -dx * s + dz * c, angle = Math.atan2(across, along);
    const ds = Math.hypot(along / peak.stretch, across * peak.stretch)
      * (1 + .045 * Math.cos(angle * 3 + peak.axis) + .025 * Math.sin(angle * 5));
    const foot = Math.hypot(dx, dz);
    if (Math.min(ds, foot) < peak.reach) {
      const base = lift(peak.rise, foot, peak.reach), shaped = lift(peak.rise, ds, peak.reach);
      // Keep the valley's lower approach ledges intact; erosion becomes the stronger silhouette
      // on the exposed upper courses, where the original circular towers were most apparent.
      best = join(best, lerp(base, shaped, smooth(140, 300, base)));
    }
  }
  for (const ridge of RIDGES) {
    const { from: a, to: b } = ridge, dx = b.x - a.x, dz = b.z - a.z, length2 = dx * dx + dz * dz;
    const t = clamp(((wx - a.x) * dx + (wz - a.z) * dz) / length2, 0, 1);
    const ds = Math.hypot(a.x + dx * t - wx, a.z + dz * t - wz);
    if (ds >= ridge.reach) continue;
    best = join(best, lift(lerp(ridge.rise[0], ridge.rise[1], t) * (1 - ridge.dip * Math.sin(Math.PI * t)), ds, ridge.reach));
  }
  return best;
}

/**
 * **The cliff bands.** The lift is laid in courses: every `period` metres of it, most of the rise is
 * taken in one short `riser` - a cliff - and the rest of the course is a `tread`, a ledge that runs
 * round the mountain at a slope a traveler can stand on.
 *
 * Forty-six metres to the course against the East Lotharn's forty, so **the cliffs here are forty
 * metres where the East's are thirty-six** and the ledges between them are narrower: the
 * lore's courses are "thirty or forty metres high", and a range a third again as tall wears in
 * thicker beds, not in more of the same. Ten courses and a bald from the crest's foot to its top.
 */
export const BANDS = freeze({ period: 46, riser: .3, tread: .08 });
export function terrace(u) {
  if (u <= 0) return 0;
  const { period, riser, tread } = BANDS, k = Math.floor(u / period), t = u / period - k;
  const course = t < 1 - riser ? tread * t / (1 - riser) : tread + (1 - tread) * smooth(0, 1, (t - (1 - riser)) / riser);
  // The protected lower beds keep broad, shallow soil shelves. Exposed upper beds are worn
  // back into sloping shoulders: their stratification remains visible, but the skyline does
  // not finish as a stack of sheer circular towers. Course endpoints (and route levels) stay put.
  const stepped = (k + course) * period, weathered = smooth(270, 425, u) * .9;
  return lerp(stepped, u, weathered);
}
/**
 * **The balds.** Each summit is cut off level a little above the cliff that rings it: "a bald of
 * grass at the summit where the last cliff ends", broad enough to stand about on, with the last
 * ramp coming up onto it.
 */
export const BALD = freeze({ radius: 19, above: 1.8, clear: .3 });
/** A summit's own lift, before the bald cuts it off: what decides which course the bald is cut at. */
export const summitRaw = peakId => { const peak = PEAKS.find(one => one.id === peakId); return peak ? rawUplift(peak.x, peak.z) : 0; };
const PLATEAUS = (() => {
  const out = new Map();
  // The level with a bald's worth of ground above it round each summit: the lift sampled every two
  // metres out to seventy, the top so many samples taken - **and never within `clear` of a course of
  // the summit's own lift**, which the East Lotharn did not have to say because its four peaks stand
  // clear of one another. Three of these seven stand on the arms of a single massif, close enough
  // that the ground seventy metres back up the arm is higher than the summit itself; with only the
  // first term the cut would be laid above the top it is meant to cut off, and the summit would come
  // to a point instead of a bald. With only the second it would be laid within a metre of the top and
  // the bald would be a single point of ground, so the cut is taken a third of a course below it.
  for (const peak of PEAKS) {
    const lifts = [];
    for (let dx = -70; dx <= 70; dx += 2) for (let dz = -70; dz <= 70; dz += 2) if (dx * dx + dz * dz <= 4900) lifts.push(rawUplift(peak.x + dx, peak.z + dz));
    lifts.sort((a, b) => b - a);
    const spread = lifts[Math.min(lifts.length - 1, Math.round(Math.PI * BALD.radius ** 2 / 4))];
    const level = Math.min(spread, rawUplift(peak.x, peak.z) - BANDS.period * BALD.clear);
    out.set(peak.id, Math.floor(level / BANDS.period) * BANDS.period + BALD.above);
  }
  return out;
})();
/**
 * Summit caps meet across broad saddles. Choosing just the nearest summit made the crest's
 * 462 m cap become the east summit's 232 m cap in one step at their bisector. Compact weights
 * keep each summit's own bald level locally, but blend continuously where the masses meet.
 */
function plateauAt(x, z) {
  let nearest = Infinity;
  for (const peak of PEAKS) nearest = Math.min(nearest, Math.hypot(x - peak.x, z - peak.z));
  let sum = 0, weight = 0;
  for (const peak of PEAKS) {
    const d = Math.hypot(x - peak.x, z - peak.z), w = 1 - smooth(0, 64, d - nearest);
    if (w <= 0) continue;
    // A quiet grassy crown rounds into an uneven shoulder rather than ending at the edge of
    // a level tabletop. The inner bald stays walkable, with different outlines on each massif.
    const dx = x - peak.x, dz = z - peak.z, c = Math.cos(peak.axis), s = Math.sin(peak.axis);
    const shoulder = Math.hypot((dx * c + dz * s) / peak.stretch, (-dx * s + dz * c) * peak.stretch);
    const highCrown = peak.id === 'the-crest' ? 72 : peak.id === 'north-summit' ? 48 : 0;
    const cap = PLATEAUS.get(peak.id) - (highCrown ? smooth(12, 78, shoulder) * highCrown : smooth(24, 74, shoulder) * 9);
    sum += cap * w; weight += w;
  }
  return weight ? sum / weight : Infinity;
}
/** The summits' lift at a point, no higher than its bald. */
export function peakUplift(x, z) {
  const u = rawUplift(x, z);
  return u > 0 ? Math.min(u, plateauAt(x, z)) : 0;
}
/** Each summit's bald: its level in lift. */
export const PEAK_TOPS = freeze(Object.fromEntries(PEAKS.map(peak => [peak.id, PLATEAUS.get(peak.id)])));

/** The top of a band's ledge and the foot of the next: where a cliff starts and where it ends, in lift. */
const bandFoot = k => (k + BANDS.tread) * BANDS.period, bandTop = k => (k + 1) * BANDS.period;

/**
 * **The ramps**, and the ledge paths that join them. "The ledges are walked, and the cliffs between
 * them are climbed where they can be: by ramps the valley people cut slantwise across the stone
 * generations ago." Each cliff is broken in one place on each summit's way up, a couple of metres
 * wide, climbing the forty metres from one ledge to the next at about forty degrees - a climb under
 * the shared rule (src/gameplay/movement/climbing.js) and not a walk - and the next one starts well round the ledge
 * from the top of the last, so a way up has to be found by walking round the mountain.
 */
export const RAMP = freeze({ half: 2, edge: 2.4, grade: .75, run: 4 });
/** Which way the lift climbs at a point. */
function upliftSlope(x, z) {
  const e = .75;
  return { gx: (peakUplift(x + e, z) - peakUplift(x - e, z)) / (2 * e), gz: (peakUplift(x, z + e) - peakUplift(x, z - e)) / (2 * e) };
}
/** Move a point up or down the lift's slope until it stands at `level`, or null if it cannot. */
function toLevel(p, level) {
  let x = p.x, z = p.z;
  for (let i = 0; i < 40; i++) {
    const u = peakUplift(x, z), miss = level - u;
    if (Math.abs(miss) < .05) return { x, z };
    const { gx, gz } = upliftSlope(x, z), g2 = gx * gx + gz * gz;
    if (g2 < 1e-4) return null;
    const step = clamp(miss / g2, -6, 6);
    x += gx * step; z += gz * step;
    if (!inWestLotharnBox(x, z)) return null;
  }
  return null;
}
/** Walk a contour of the lift: along it a step at a time, and back onto it after every step. */
function followContour(start, level, turn, length, step = 2) {
  const points = [point(start.x, start.z)];
  let p = start, run = 0;
  while (run < length) {
    const { gx, gz } = upliftSlope(p.x, p.z), g = Math.hypot(gx, gz);
    if (g < .05) return null;
    const next = toLevel({ x: p.x - gz / g * step * turn, z: p.z + gx / g * step * turn }, level);
    if (!next || edgeDistance(next.x, next.z) < 12) return null;
    run += Math.hypot(next.x - p.x, next.z - p.z); p = next; points.push(point(p.x, p.z));
  }
  return points;
}
const riserLevel = k => (k + 1 - BANDS.riser / 2) * BANDS.period;
/** The whole of a cliff: the contour of band `k`'s riser that goes round `peak`. */
function cliffLine(peak, k) {
  const level = riserLevel(k);
  let p = { x: peak.x, z: peak.z };
  for (let i = 0; i < 400 && peakUplift(p.x, p.z) > level + 1; i++) {
    const { gx, gz } = upliftSlope(p.x, p.z), g = Math.hypot(gx, gz);
    if (g < 1e-3) { p = { x: p.x + 1, z: p.z }; continue; }
    p = { x: p.x - gx / g, z: p.z - gz / g };
  }
  const seed = toLevel(p, level);
  if (!seed) return null;
  const walk = turn => {
    const out = [];
    let q = seed, run = 0;
    for (let i = 0; i < 800; i++) {
      const { gx, gz } = upliftSlope(q.x, q.z), g = Math.hypot(gx, gz);
      if (g < .05) break;
      const next = toLevel({ x: q.x - gz / g * 2 * turn, z: q.z + gx / g * 2 * turn }, level);
      if (!next || edgeDistance(next.x, next.z) < 12) break;
      run += Math.hypot(next.x - q.x, next.z - q.z); q = next; out.push(point(q.x, q.z));
      if (run > 20 && Math.hypot(q.x - seed.x, q.z - seed.z) < 2.5) return { points: out, closed: true };
    }
    return { points: out, closed: false };
  };
  const ahead = walk(1);
  if (ahead.closed) return { points: [point(seed.x, seed.z), ...ahead.points], closed: true };
  const behind = walk(-1);
  return { points: [...behind.points.reverse(), point(seed.x, seed.z), ...ahead.points], closed: false };
}
/** A ramp across band `k`'s cliff: a stretch of the cliff line long enough for the climb. */
function rampAcross(peak, k, from, turn, taken = [], grade = RAMP.grade) {
  const cliff = cliffLine(peak, k);
  if (!cliff || cliff.points.length < 8) return null;
  const pts = cliff.points, n = pts.length, length = (bandTop(k) - bandFoot(k)) / grade + RAMP.run * 2;
  let nearest = 0, best = Infinity;
  pts.forEach((q, i) => { const d = Math.hypot(q.x - from.x, q.z - from.z); if (d < best) { best = d; nearest = i; } });
  for (let shift = 0; shift < n; shift += 3) for (const start of [nearest + shift, nearest - shift]) for (const way of [turn, -turn]) {
    const out = [];
    let run = 0, i = start, bent = false;
    for (let step = 0; step < n && run < length; step++, i += way) {
      if (!cliff.closed && (i < 0 || i >= n)) break;
      const q = pts[((i % n) + n) % n];
      if (out.length) run += Math.hypot(q.x - out.at(-1).x, q.z - out.at(-1).z);
      if (lowlandDistance(q.x, q.z) < (k ? 9 : 2) || westLotharnShare(q.x, q.z) < .995 || Math.hypot(q.x - peak.x, q.z - peak.z) > peak.reach * .8
        // Six metres, where the East Lotharn keeps seven. A summit's top course is a ring of only a
        // hundred and forty metres and the ramp across the course below it ends within a few metres of
        // it, so at seven the last cliff of the north summit and of the spur had no unclaimed run long
        // enough left in them and their balds could not be reached at all.
        || taken.some(t => Math.abs(t.x - q.x) < 6 && Math.abs(t.z - q.z) < 6 && Math.hypot(t.x - q.x, t.z - q.z) < 6)) { bent = true; break; }
      if (out.length >= 2) {
        const a = out.at(-2), b = out.at(-1), turned = Math.abs(Math.atan2((b.x - a.x) * (q.z - b.z) - (b.z - a.z) * (q.x - b.x), (b.x - a.x) * (q.x - b.x) + (b.z - a.z) * (q.z - b.z)));
        if (turned > .45) { bent = true; break; }
      }
      out.push(q);
    }
    if (!bent && run >= length) return { points: out, turn: way };
  }
  return null;
}
/**
 * Where each summit's way up starts, and how far round the ledge the next ramp is put. Every one is
 * taken from the valley the summit is reached from: the long valley for the crest, the spur, the
 * cold head and the rampart, the north valley for the north summit, the notch and the col for the
 * east summit.
 */
export const RAMP_WAYS = freeze({
  'the-crest': freeze({ from: point(-1846, -694), stagger: 13 }),
  'north-summit': freeze({ from: point(-1962, -846), stagger: 17 }),
  'west-shoulder': freeze({ from: point(-2100, -546), stagger: 13 }),
  'east-summit': freeze({ from: point(-1650, -760), stagger: 13 }),
  'spur-summit': freeze({ from: point(-1790, -628), stagger: 16 }),
  'cold-head': freeze({ from: point(-2362, -430), stagger: 12 }),
  'south-rampart': freeze({ from: point(-2256, -396), stagger: 12 }),
});
/** Along the ledge between two points: the ledge's own contour, followed whichever way is shorter. */
function ledgePath(a, b, k, way = 1) {
  const gap = Math.hypot(b.x - a.x, b.z - a.z);
  if (gap < 14) return [point(a.x, a.z), point(b.x, b.z)];
  const level = k * BANDS.period + 2, start = toLevel(a, level);
  if (!start) return [point(a.x, a.z), point(b.x, b.z)];
  let best = null;
  for (const turn of [way, -way]) {
    const out = [point(a.x, a.z)];
    let p = start, run = 0;
    for (let i = 0; i < 400; i++) {
      const { gx, gz } = upliftSlope(p.x, p.z), g = Math.hypot(gx, gz);
      if (g < .05) break;
      const next = toLevel({ x: p.x - gz / g * 2 * turn, z: p.z + gx / g * 2 * turn }, level);
      if (!next) break;
      run += Math.hypot(next.x - p.x, next.z - p.z); p = next; out.push(point(p.x, p.z));
      if (Math.hypot(p.x - b.x, p.z - b.z) < 8) { out.push(point(b.x, b.z)); if (!best || run < best.run) best = { points: out, run }; break; }
    }
  }
  return best ? best.points : [point(a.x, a.z), point(b.x, b.z)];
}
/** For the tests and the design notes: why a band's cliff will not take a ramp, point by point. */
export function rampTrouble(peakId, k) {
  const peak = PEAKS.find(one => one.id === peakId), cliff = cliffLine(peak, k);
  if (!cliff) return { cliff: null };
  const count = { points: cliff.points.length, closed: cliff.closed, lowland: 0, share: 0, far: 0, taken: 0 };
  for (const q of cliff.points) {
    if (lowlandDistance(q.x, q.z) < (k ? 9 : 2)) count.lowland++;
    if (westLotharnShare(q.x, q.z) < .995) count.share++;
    if (Math.hypot(q.x - peak.x, q.z - peak.z) > peak.reach * .8) count.far++;
    if (RAMPS.some(r => (r.peak !== peakId || r.band !== k) && r.line.points.some(t => Math.hypot(t.x - q.x, t.z - q.z) < 7))) count.taken++;
  }
  return count;
}
export const RAMPS = freeze((() => {
  const out = [], taken = [];
  for (const peak of PEAKS) {
    const way = RAMP_WAYS[peak.id];
    if (!way) continue;
    let top = 0;
    for (let dx = -30; dx <= 30; dx += 3) for (let dz = -30; dz <= 30; dz += 3) top = Math.max(top, peakUplift(peak.x + dx, peak.z + dz));
    let from = way.from, turn = 1;
    for (let k = 0; riserLevel(k) < top - 2; k++) {
      const ramp = rampAcross(peak, k, from, turn, taken) ?? rampAcross(peak, k, from, turn, taken, .82);
      if (!ramp) continue;
      const last = out.findLast(one => one.peak === peak.id && one.kind === 'ramp');
      if (last) {
        const joining = ledgePath(last.line.points.at(-1), ramp.points[0], k, turn);
        if (joining) out.push(freeze({ id: `${peak.id}-ledge-${k + 1}`, peak: peak.id, band: k, kind: 'ledge', line: polyline(joining),
          from: last.to, to: bandFoot(k), climb: freeze([0, 0]) }));
      }
      const line = polyline(ramp.points);
      taken.push(...ramp.points);
      const built = { id: `${peak.id}-ramp-${k + 1}`, peak: peak.id, band: k, kind: 'ramp', line, from: bandFoot(k), to: Math.min(bandTop(k), terrace(top)),
        climb: freeze([RAMP.run, line.length - RAMP.run]),
        // The crown already steepens the final approach; avoid adding an easing hump to it.
        linear: peak.id === 'the-crest' && k === 9 };
      if (peak.id === 'the-crest' && k === 8) {
        // A short exposed face leads onto this natural rest shelf. Keep the remaining trail's
        // easy grade by lowering it by the removed rise; the next ledge recovers that height
        // gradually, rather than asking an exhausted climber to tackle a steeper catch-up ramp.
        const lower = rampLevel(built, 26), upper = rampLevel(built, 30);
        built.profileTo = built.to;
        built.rest = freeze({ from: 26, to: 30, level: lower, drop: upper - lower });
        built.to -= built.rest.drop;
      }
      out.push(freeze(built));
      const end = ramp.points.at(-1), onward = followContour(end, Math.min(top - 1, (k + 1 + BANDS.tread / 2) * BANDS.period), ramp.turn, way.stagger);
      from = onward ? onward.at(-1) : end;
      turn = ramp.turn;
    }
  }
  return out;
})());

/**
 * **The summits' own ground.** The world's ground grid is seven metres apart out here, which would
 * draw a forty-metre cliff as a ramp; so the massifs are drawn by a ground of their own, three
 * metres apart (src/content/regions/west-lotharn/west-lotharn-scenery.js), over this box, and the world's grid is sunk out of
 * sight under it wherever they do.
 */
export const MOUNTAIN_PATCH = (() => {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let x = WEST_LOTHARN_BOX.minX; x <= WEST_LOTHARN_BOX.maxX; x += 6) for (let z = WEST_LOTHARN_BOX.minZ; z <= WEST_LOTHARN_BOX.maxZ; z += 6) {
    if (peakUplift(x, z) * westLotharnShare(x, z) <= 0) continue;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  }
  return freeze({ minX: minX - 12, maxX: maxX + 12, minZ: minZ - 12, maxZ: maxZ + 12, step: 3 });
})();
/** How far the world's own ground grid is lowered under the summits' ground. */
export function westLotharnTerrainSink(x, z) {
  const p = MOUNTAIN_PATCH;
  if (x < p.minX || x > p.maxX || z < p.minZ || z > p.maxZ) return 0;
  const u = peakUplift(x, z);
  if (u <= 1) return 0;
  const lift = u * westLotharnShare(x, z);
  return (lift + 40) * smooth(1, 4, lift);
}
/** The summits' lift as the ground takes it: let down to nothing at the country's borders. */
export const peakLiftAt = (x, z) => { const u = peakUplift(x, z); return u > 0 ? u * westLotharnShare(x, z) : 0; };
/** Whether a point is on a summit's bald. */
export function onBald(x, z, margin = 0) {
  for (const peak of PEAKS) if (Math.hypot(x - peak.x, z - peak.z) < BALD.radius + 12 + margin && peakUplift(x, z) >= PEAK_TOPS[peak.id] - .5) return true;
  return false;
}
/** Whether a point is on one of the cliffs: a band's riser, steeper than anybody climbs. */
export function onCliff(x, z) {
  const u = peakUplift(x, z);
  if (u <= 0 || onRamp(x, z, 1)) return false;
  const t = u / BANDS.period - Math.floor(u / BANDS.period);
  return t > 1 - BANDS.riser - .06;
}
/** Whether a point is on a ramp or a ledge path, or within `margin` of its edge. */
export function onRamp(x, z, margin = 0) {
  const reach = RAMP.half + margin;
  for (const ramp of RAMPS) if (outside(ramp.line, x, z) <= reach && nearestOn(ramp.line, x, z).distance < reach) return true;
  return false;
}
/** A way's level in lift at a distance along it. */
function rampLevel(ramp, along) {
  if (ramp.kind === 'ledge') return lerp(ramp.from, ramp.to, clamp(along / (ramp.line.length || 1), 0, 1));
  const [a, b] = ramp.climb, rest = ramp.rest;
  if (rest && along >= rest.from && along <= rest.to) return rest.level;
  const easing = ramp.linear ? 0 : .06;
  const level = lerp(ramp.from, ramp.profileTo ?? ramp.to, smooth(a, b, along) * easing + clamp((along - a) / (b - a), 0, 1) * (1 - easing));
  return level - (rest && along > rest.to ? rest.drop : 0);
}
/** The summits' lift with the cliff bands and the ways through them: what the ground is raised by. */
export function peakGround(x, z, u = peakUplift(x, z)) {
  if (u <= 0) return 0;
  const height = terrace(u), reach = RAMP.half + RAMP.edge;
  const cuts = [];
  let nearest = Infinity, influence = 0;
  for (const ramp of RAMPS) {
    if (outside(ramp.line, x, z) > reach) continue;
    const near = nearestOn(ramp.line, x, z);
    if (near.distance >= reach) continue;
    const strength = 1 - smooth(RAMP.half, reach, near.distance);
    const center = pointOn(ramp.line, near.along);
    // Cut the underlying hillside level across the trail, not just its mountain uplift.
    const crossfall = calmGround(center.x, center.z) - calmGround(x, z);
    cuts.push({ distance: near.distance, height: rampLevel(ramp, near.along) + crossfall });
    nearest = Math.min(nearest, near.distance); influence = Math.max(influence, strength);
  }
  // Preserve each trail core. Only near the boundary where two equally near cuts meet should
  // they blend: combining every nearby ledge raises the lower trail toward the upper one's floor.
  let sum = 0, weight = 0;
  for (const cut of cuts) {
    const w = 1 - smooth(0, .9, cut.distance - nearest);
    sum += cut.height * w; weight += w;
  }
  return weight ? lerp(height, sum / weight, influence) : height;
}

/** The seamless correction (see South Suval): the hex blend's steps taken out of this ground. */
function seamlessLift(x, z, share) {
  if (!share) return 0;
  const now = seamlessTerrainMix(x, z), was = terrainMix(x, z);
  return (now.base + relief(x, z, now.amp, now.wave) - was.base - relief(x, z, was.amp, was.wave)) * share;
}

/**
 * The range's own ground, from the ground it is handed. `west-ground.js` calls this inside its own
 * shaping, so the water it cuts follows these valleys. Nothing is written outside this country's
 * own hexes: every term is weighed by `westLotharnShare`, which is nothing at every border.
 */
export function westLotharnGround(x, z, ground, baseCorrection = 0) {
  if (!inWestLotharnBox(x, z)) return ground;
  const share = westLotharnShare(x, z);
  if (!share) return ground;
  let height = ground + seamlessLift(x, z, share) * (1 - baseCorrection);
  // The valleys, each by its own line.
  const long = outside(LONG_VALLEY.line, x, z) < LONG_VALLEY.half + LONG_VALLEY.wall ? nearestOn(LONG_VALLEY.line, x, z) : null;
  if (long) height = lerp(height, carve(height, long, LONG_VALLEY.half, LONG_VALLEY.wall, longValleyFloor(long.along)), share);
  const north = outside(NORTH_VALLEY.line, x, z) < NORTH_VALLEY.half + NORTH_VALLEY.wall ? nearestOn(NORTH_VALLEY.line, x, z) : null;
  if (north) height = Math.min(height, lerp(height, carve(height, north, NORTH_VALLEY.half, NORTH_VALLEY.wall, northValleyFloor(north.along)), share));
  const notch = outside(NOTCH.line, x, z) < NOTCH.half + NOTCH.wall ? nearestOn(NOTCH.line, x, z) : null;
  if (notch) height = Math.min(height, lerp(height, carve(height, notch, NOTCH.half, NOTCH.wall, notchFloor(notch.along)), share));
  // The summits, with their cliff bands and the ways through them, on top of what the valleys left.
  const lift = peakUplift(x, z);
  if (lift > 0) {
    height = lerp(height, calmGround(x, z), smooth(0, 30, lift) * share);
    height += peakGround(x, z, lift) * share;
  }
  return height;
}

// ---------------------------------------------------------------------------
// The water
// ---------------------------------------------------------------------------
/**
 * **The atlas draws no water in this country at all** - not one river edge on any of its forty-eight
 * hexes, where the East Lotharn has its border river. So every course here is derived from the
 * landform, as Meneth's four becks were, and the lore is what says there should be any: "each valley
 * has its own drainage", "the rivers of the Lotharn flow in two directions".
 *
 * Four of them, and one is not this country's own water:
 *
 *  - **the Kemrath reach**, which is the East Lotharn's Kemrath water taken on where it runs out of
 *    the East Lotharn's hexes and into these, down the notch and out to the Mithala margin. It takes
 *    its level from that course (`headOf`) rather than from a number, so the two are one river;
 *  - **the north beck**, down the north valley to the same margin;
 *  - **the east beck**, from the long valley's divide east to the Vastos margin;
 *  - **the west beck**, from the divide the long way west to the hills above Yunethre.
 *
 * Each beck wanders a little across its own floor rather than running down the middle of it, which
 * is what a stream does on a flat-bottomed valley grown over with deep soil.
 */
const wander = (line, from, to, period, swing, step = 12) => {
  const out = [];
  for (let along = from; along <= to; along += step) {
    const p = pointOn(line, along), t = (along - from) / Math.max(1, to - from);
    const off = Math.sin(along / period * Math.PI * 2 + .4) * swing * smooth(0, .12, t) * smooth(1, .9, t);
    out.push(point(p.x + p.nx * off, p.z + p.nz * off));
  }
  return out;
};
export const WEST_LOTHARN_WATER_LINES = freeze({
  // The reach starts exactly where Kemrath's water stops, a couple of metres on, so the two lines
  // meet end to end and `headOf` carries the level across without a step.
  kemrathReach: freeze(NOTCH.line.raw.map(p => point(p.x, p.z))),
  north: freeze(wander(NORTH_VALLEY.line, 8, NORTH_VALLEY.line.length, 90, 4)),
  east: freeze(wander(LONG_VALLEY.line, 0, LONG_VALLEY_DIVIDE.along - 6, 120, 8).reverse()),
  west: freeze(wander(LONG_VALLEY.line, LONG_VALLEY_DIVIDE.along + 6, LONG_VALLEY.line.length - 8, 150, 9)),
});

// ---------------------------------------------------------------------------
// What grows, and where it does not
// ---------------------------------------------------------------------------
/**
 * **The tree line.** The lore: "heavily, continuously, completely forested from their base to
 * within a few hundred meters of their highest summits... The forest rides up the ledges as far as
 * there is soil for it, thinning on the highest courses, and gives out where there is only stone and
 * the balds' grass."
 *
 * The East Lotharn's forest stands to about two hundred and eighty metres out of four hundred and
 * twenty. This range is taller and its own numbers are its own: **the wood thins from two hundred
 * and fifty and gives out at three hundred and forty-five** - two hundred metres below the crest,
 * which is the lore's "a few hundred metres", and five courses of bare stone above it.
 */
export const TREE_LINE = freeze({ thins: 250, gives: 345 });
/** How much wood stands at a height above this country's own feet: 1 below the thinning, 0 above the line. */
export const canopyAt = height => 1 - smooth(TREE_LINE.thins, TREE_LINE.gives, height);

/** Whether a point is somewhere no tree stands: a bald, a cliff or a way up. */
export function westLotharnOpen(x, z, margin = 0) {
  if (onBald(x, z, margin)) return true;
  if (onRamp(x, z, 1.5 + margin)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// The chart
// ---------------------------------------------------------------------------
const alongPoint = (line, fraction) => {
  const target = line.length * fraction;
  let i = 1; while (i < line.runs.length - 1 && line.runs[i] < target) i++;
  const a = line.points[i - 1], b = line.points[i], t = (target - line.runs[i - 1]) / (line.runs[i] - line.runs[i - 1] || 1);
  return point(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t);
};
/**
 * The country's places. **Nothing here is coined.** `azhoran_language_profiles.py` has a `mittoli`
 * profile and a `lothi` one, but the lore is explicit that Lotharn place names are substrate - "the
 * valley names, the mountain names... in many cases cannot be decomposed using any Mittoli root
 * system" - so a name built out of Mittoli roots would contradict the lore it was meant to serve.
 * The East Lotharn used the three valley names the lore itself gives (Kemrath, Stonegate, Upper
 * Olveth) and plain English for everything else; the lore gives this half none, so everything here
 * is named in plain words for what it is.
 */
export const WEST_LOTHARN_LANDMARKS = freeze([
  freeze({ id: 'the-crest', name: 'The crest', x: PEAKS[0].x, z: PEAKS[0].z, radius: BALD.radius + 8,
    description: 'Pale grass crowns the highest summit of the Lotharn. Weathered shoulders fall toward bare rock and forested ledges far below; beyond the eastern col, the rest of the range recedes into mist.' }),
  freeze({ id: 'north-summit', name: 'The north summit', x: PEAKS[1].x, z: PEAKS[1].z, radius: BALD.radius + 8,
    description: 'The northern arm of the massif rises above a narrow wooded valley. Its rounded crown faces the Mithala plain, while bands of cliff and old forest shelter its lower slopes.' }),
  freeze({ id: 'west-shoulder', name: 'The west shoulder', x: PEAKS[2].x, z: PEAKS[2].z, radius: BALD.radius + 8,
    description: 'A broad shoulder overlooking the middle of the long valley. Old woodland gathers on the sheltered shelves, and the exposed grassy crown catches the weather arriving from the west.' }),
  freeze({ id: 'east-summit', name: 'The east summit', x: PEAKS[3].x, z: PEAKS[3].z, radius: BALD.radius + 8,
    description: 'The eastern end of the massif stands above the col between the two halves of the Lotharn. Kemrath water bends around its foot before turning north through the notch.' }),
  freeze({ id: 'long-valley', name: 'The long valley', ...alongPoint(LONG_VALLEY.line, .62), radius: 130,
    description: 'A broad, grassy valley crosses the range from the Vastos margin toward the western hills above Yunethre. Small streams wind across its deep-soiled floor, beneath layered cliffs and patches of old woodland.' }),
  freeze({ id: 'long-valley-divide', name: 'The divide', x: LONG_VALLEY_DIVIDE.x, z: LONG_VALLEY_DIVIDE.z, radius: 50,
    description: 'A gentle rise divides the waters of the long valley. One beck runs east toward Vastos; the other follows the valley west, with little more than a swell of grass marking where they part.' }),
  freeze({ id: 'north-valley', name: 'The north valley', ...alongPoint(NORTH_VALLEY.line, .5), radius: 80,
    description: 'A narrower, steeper valley opens toward the Mithala plain. A beck descends between wooded shelves and rocky shoulders, with open country visible beyond the mouth.' }),
  freeze({ id: 'lotharn-col', name: 'The col', x: COL.x, z: COL.z, radius: COL.radius + 10,
    description: 'The low gap joining the eastern and western Lotharn. Kemrath water passes through it beneath opposing mountain shoulders, then turns north along the notch.' }),
  freeze({ id: 'the-notch', name: 'The notch', ...alongPoint(NOTCH.line, .5), radius: 60,
    description: 'A steep cut through the northeastern shoulder of the range. Kemrath water runs quickly over stone here, descending toward the Mithala plain between close valley walls.' }),
  freeze({ id: 'south-rampart', name: 'The south rampart', x: PEAKS[6].x, z: PEAKS[6].z, radius: 110,
    description: 'Layered cliffs form the southern wall of the range above Isareos. Sheltered woodland clings to the shelves, overlooking the softer hills of the lake country below.' }),
  freeze({ id: 'the-cold-head', name: 'The cold head', x: PEAKS[5].x, z: PEAKS[5].z, radius: 110,
    description: 'The western headland of the mountains meets the prevailing weather first. Its exposed grassy top overlooks old woodland, rough stone shelves and the descending western hills.' }),
  freeze({ id: 'spur-summit', name: 'The spur', x: PEAKS[4].x, z: PEAKS[4].z, radius: 100,
    description: 'A wooded spur runs southwest toward Meneth from the eastern reach of the long valley. Steep sides rise to an open grassy crown, with the taller massif standing across the water.' }),
]);
