import { createCentralRampJoinCorrection } from './east-lotharn-route-joins.js';
import { createCentralNorthShoulder } from './east-lotharn-north-shoulder.js';
/**
 * The East Lotharn Mountains: the ground, the water lines and the made places of the old range
 * north of Amod, as pure numbers.
 *
 * The lore (`../world-builder/azhora_lore/geography/regions/lotharn.md`): "old mountains... The
 * peaks are rounded. The ridgelines are broad-backed rather than knife-edged. The faces are not
 * sheer; they are long, forested slopes inclined at angles that feet can manage." Forest from the
 * valley floors nearly to the summits; "the valleys are the defining feature of the range... some
 * wide and agricultural, some narrow gorges through which rivers run white, some broad and
 * flat-bottomed where glaciation left deposits". The north face drains toward the Mithala plain,
 * and the ridge between the two drainages "often runs through forest rather than along obvious
 * topographic features". The passes are crossed, not circumnavigated, and "most of the major
 * passes have had permanent inns and waypoints established at their highest sections".
 *
 * The atlas (the standing rule is that it wins): thirty-eight hexes, twenty-three of hills and
 * fifteen of mountain, every one of them Cfa - humid, warm-summered, wet the year round - a
 * central massif, an eastern one, southern mountains along Amod and Vastos, and between them a
 * belt of hills; a notch of Amod reaching north into the middle of the south side; and one small
 * river, along the whole northern border with South Mithala, to the sea at the north-east corner.
 *
 * Built from those two, on the user's word of 26 September 2026 ("start building the East Lotharn
 * Mountains based on the lore"), as ground, water, forest, wildlife and three made places:
 *
 *  - **Kemrath** - the lore's own valley name - is the belt of hills made into the broad,
 *    flat-floored high valley, draining west. Amod's notch opens onto its floor.
 *  - **The col** at Kemrath's eastern head, between the central and eastern massifs, is the
 *    divide and the pass's highest section, and the **pass inn** stands on it.
 *  - **Stonegate** - the lore's name again - is the gorge that falls north from the col, white
 *    water between walls of layered stone, to the border water.
 *  - **Upper Olveth** - and again - is the open high valley of the north face under the central
 *    massif, sheep grass at its head and its beck running north.
 *  - **The iron workings** are on the central massif's south face above Kemrath: "iron is the
 *    most abundant, occurring in seams of rich ore throughout the central range. Coal follows".
 *
 * **Then made tall** (the user, 27 September 2026: "make the very tall so that reaching the peak
 * is difficult and there are lots of passages and caves"; asked, about four hundred metres, a
 * climbing rule with cliffs, and the caves empty to explore). The massifs between the valleys are
 * raised to four peaks, the eastern four hundred and twenty metres, in courses of cliff and ledge,
 * with ramps and ledge paths up them (`The peaks`, below), now using the shared free-climbing rule
 * (src/climbing.js) and eight caves (src/east-lotharn-caves.js). The lore's "the peaks are rounded
 * ... slopes that feet can manage" was rewritten in place to fit: old stone worn into courses. The
 * valleys, the pass and everything built in them are as they were.
 *
 * Nobody lives in any of it yet. Pure: no three.
 */
import { landDistance, terrainMix, seamlessTerrainMix, relief, REGION_CELLS, METRES_PER_HEX, hexOwnerAt } from './region-world.js';
import { PLAYABLE_SURVEY } from './region-survey.js';
import { RIVER_EDGES } from './region-rivers.js';
import { riverCourses } from './region-layout.js';

const freeze = Object.freeze;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const smooth = (a, b, x) => { const v = clamp((x - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); };
const lerp = (a, b, t) => a + (b - a) * t;
const point = (x, z) => freeze({ x, z });

export const LOTHARN = 'East Lotharn Mountains';

// ---------------------------------------------------------------------------
// The country's own ground
// ---------------------------------------------------------------------------
/**
 * Every landform here is asked about only inside this box: the region's hexes, grown by a hex
 * and a half so the north face's descent and the border water have room, and the rest of Azhora
 * pays two comparisons for the whole range.
 */
export const LOTHARN_BOX = (() => {
  const box = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const cell of REGION_CELLS[LOTHARN] ?? []) {
    const reach = METRES_PER_HEX * 1.6;
    box.minX = Math.min(box.minX, cell.x - reach); box.maxX = Math.max(box.maxX, cell.x + reach);
    box.minZ = Math.min(box.minZ, cell.z - reach); box.maxZ = Math.max(box.maxZ, cell.z + reach);
  }
  return freeze(box);
})();
const boxInset = (x, z) => Math.min(x - LOTHARN_BOX.minX, LOTHARN_BOX.maxX - x, z - LOTHARN_BOX.minZ, LOTHARN_BOX.maxZ - z);
export const inLotharnBox = (x, z) => boxInset(x, z) > 0;

/**
 * How much a point is the range's own to shape: all of it where the land round it is the East
 * Lotharn's, nothing across the borders with Amod and Vastos a little way in, and nothing at the
 * box's edge. Both terms are continuous, so a landform weighed by this meets the ground next door
 * without a step - and Amod's and Vastos's own ground, and what stands on it, does not move.
 */
export function lotharnShare(x, z, mix = seamlessTerrainMix(x, z)) {
  const inset = boxInset(x, z), land = 1 - (mix.weights.outland ?? 0);
  if (inset <= 0 || land <= 1e-6) return 0;
  return smooth(.3, .75, (mix.weights[LOTHARN] ?? 0) / land) * smooth(0, 40, inset);
}

// ---------------------------------------------------------------------------
// Lines
// ---------------------------------------------------------------------------
/**
 * The western module's own smoothing, pass for pass (`west-regions.js`, `soften`): its rivers are
 * drawn on the smoothed line, so the valleys here are measured from the same line and each floor
 * lies under its own water. The raw lines go to that module, which smooths them itself.
 */
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
/** A polyline, smoothed as its water will be, with its running length, for distance and along-the-line questions. */
function polyline(raw) {
  const points = soften(raw);
  const runs = [0];
  for (let i = 1; i < points.length; i++) runs.push(runs[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z));
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of points) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); }
  return freeze({ raw: freeze(raw.map(p => point(p.x, p.z))), points: freeze(points.map(p => point(p.x, p.z))), runs: freeze(runs), length: runs.at(-1), bounds: freeze({ minX, maxX, minZ, maxZ }) });
}
/**
 * Distance from a line, how far along it the nearest point is, which side of it (+1 left), and
 * whether that nearest point is one of its two ends - past an end, "which side" means nothing.
 *
 * `along` is blended over the segments nearly as near as the nearest, not read off the nearest
 * alone: on the inside of a bend the nearest segment changes from one to the next across a line,
 * and a floor whose level is read off `along` would step there - a metre and more on a gorge
 * that falls one in seven.
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

/**
 * The border water, on the atlas's own edges: "the northern face drains toward the Lizeem system
 * and the Mithala plain". The atlas draws it along the whole South Mithala border and down to the
 * sea at the north-east corner, in two pieces a hex edge apart at the West Lotharn end - a gap in
 * the painting and not in the river - so the two are joined here, the short piece first, running
 * east with the ground to the sea.
 */
export const BORDER_WATER_LINE = (() => {
  const pieces = riverCourses(PLAYABLE_SURVEY, RIVER_EDGES, undefined, { soften: 0 })
    .filter(course => course.edges.every(edge => edge.regions.includes(LOTHARN)))
    .map(course => course.points.map(p => point(p.x, p.z)))
    .sort((a, b) => b.length - a.length);
  if (!pieces.length) return freeze([]);
  const [main, ...rest] = pieces;
  const east = main[0].x < main.at(-1).x ? main : [...main].reverse();
  const west = rest.map(piece => piece[0].x < piece.at(-1).x ? piece : [...piece].reverse())
    .filter(piece => piece.at(-1).x <= east[0].x + 1e-6);
  return freeze([...west.flat(), ...east]);
})();
const BORDER = BORDER_WATER_LINE.length > 1 ? polyline(BORDER_WATER_LINE) : null;

// ---------------------------------------------------------------------------
// The landforms
// ---------------------------------------------------------------------------
/**
 * **The north face.** From the Mithala plain "the land begins to rise. Not dramatically... gentle
 * swells in the terrain that become longer ridges". The height blend alone drops the range's
 * northern hexes fifty metres in eighty to the plain's level, a wall; so the ground within a
 * hundred and seventy metres of the border water is let down to it in one long slope, the water's
 * own foot at the bottom, and beyond the water - the plain's side, which is not the range's to
 * shape and not a place anybody goes - the ground is laid nearly level, so the plain reads as one.
 */
export const NORTH_FACE = freeze({ reach: 170, footWest: 26, footEast: 13, seaRun: 60, sea: 1.5, plainRise: 3.5 });
/**
 * The water's foot along its line: falling gently east the whole way, and let down to the sea
 * only over its last sixty metres, where the atlas takes it into the sea hex at the corner.
 */
export function borderFoot(along) {
  const length = BORDER?.length ?? 1;
  const gentle = lerp(NORTH_FACE.footWest, NORTH_FACE.footEast, clamp(along / length, 0, 1));
  return lerp(gentle, NORTH_FACE.sea, smooth(length - NORTH_FACE.seaRun, length, along));
}

/**
 * **Kemrath**, "broad and flat-bottomed where glaciation left deposits now grown over with deep
 * soil". The belt of hills between the central massif and the southern mountains, made a floor
 * forty-four metres across that falls gently west from its head under the col, with walls that
 * take it back to the hill over another fifty. It drains west, out of the range toward the West
 * Lotharn, which is where the belt's own ground already runs.
 */
export const KEMRATH = freeze({
  line: polyline([point(-1112, -851), point(-1162, -848), point(-1218, -834), point(-1275, -843), point(-1335, -826),
    point(-1395, -840), point(-1455, -823), point(-1518, -834), point(-1590, -818)]),
  half: 22, wall: 52, head: 60, foot: 43,
});
/**
 * **The col** at Kemrath's head, between the central massif's eastern shoulder and the eastern
 * massif's western one: the divide between the two drainages, and the pass's highest section.
 * A saddle eighteen metres either side of its line, three metres above Kemrath's head.
 */
export const COL = freeze({
  line: polyline([point(-1112, -851), point(-1090, -884), point(-1068, -912), point(-1052, -940)]),
  half: 18, wall: 40, levels: freeze([60, 63.2, 62.4, 58.5]),
});
/**
 * **Stonegate**, "narrow gorges through which rivers run white", and the stone gate the pass goes
 * through: from the col's north side down the north face to the border water, winding, a floor
 * twenty-six metres across between walls that climb back to the hill in twenty-four - white water
 * down the middle of it and the road along its east side, far enough off the water that its bed
 * never touches the channel. It falls about one in seven.
 */
export const STONEGATE = freeze({
  line: polyline([point(-1052, -940), point(-1070, -978), point(-1060, -1018), point(-1070, -1058), point(-1098, -1094),
    point(-1108, -1136), point(-1092, -1176), point(-1100, -1210)]),
  half: 13, wall: 24, head: 58,
});
/**
 * **Upper Olveth**, a high valley of the north face under the central massif - "the higher,
 * cooler valleys - where sheep have been kept on the seasonal upland pastures for as long as
 * anyone has records". Broad and shallow: an open floor thirty metres across at its head, sheep
 * grass, and its beck running north to the border water.
 */
export const OLVETH = freeze({
  line: polyline([point(-1318, -972), point(-1328, -1025), point(-1338, -1078), point(-1347, -1130), point(-1356, -1178)]),
  half: 30, wall: 70, head: 58,
});

/** Where the two north-face waters meet the border water, each floor ends a little above its level. */
const footOf = line => BORDER ? borderFoot(nearestOn(BORDER, line.points.at(-1).x, line.points.at(-1).z).along) : 20;
const STONEGATE_FOOT = footOf(STONEGATE.line) + 1, OLVETH_FOOT = footOf(OLVETH.line) + 2;
/** A valley's floor level at a distance along its line, between its head and its foot. */
const floorAt = (valley, along, foot) => lerp(valley.head, foot, clamp(along / valley.line.length, 0, 1));
export const kemrathFloor = along => floorAt(KEMRATH, along, KEMRATH.foot);
export const stonegateFloor = along => floorAt(STONEGATE, along, STONEGATE_FOOT);
export const colLevel = along => {
  const { levels, line } = COL, t = clamp(along / line.length, 0, 1) * (levels.length - 1), i = Math.min(levels.length - 2, Math.floor(t));
  return lerp(levels[i], levels[i + 1], t - i);
};

/** Cut or build a valley into ground: level floor to `half`, back to the hill by `half + wall`. */
function carve(ground, near, half, wall, level) {
  if (near.distance >= half + wall) return ground;
  return lerp(level, ground, smooth(half, half + wall, near.distance));
}

// ---------------------------------------------------------------------------
// The peaks
// ---------------------------------------------------------------------------
/**
 * **The peaks** (the user, 27 September 2026: "make the very tall so that reaching the peak is
 * difficult and there are lots of passages and caves"; asked, about four hundred metres, a
 * climbing rule with cliffs, and the caves empty to explore). The valleys stay where they were and
 * what stands in them does not move; the massifs between them are lifted, each from its own
 * summit, and the lift is let down to nothing at every valley's shoulder, at the north face and
 * at the range's borders, so Kemrath, the col, Stonegate, Upper Olveth and the neighbours' ground
 * are the ground they were.
 *
 * A summit's lift is `rise` at its top and nothing at the lowland's edge, eased at both ends -
 * the foot comes up gently out of the valley and the top is a rounded bald - and steepest in
 * between, where the faces are sixty and seventy degrees. Nobody walks up that, and the climbing
 * rule (src/climbing.js) says so.
 */
export const PEAKS = freeze([
  freeze({ id: 'eastern-peak', name: 'The eastern peak', x: -962, z: -826, rise: 362, reach: 215 }),
  freeze({ id: 'central-peak', name: 'The central peak', x: -1232, z: -968, rise: 280, reach: 170 }),
  freeze({ id: 'western-peak', name: 'The western peak', x: -1462, z: -928, rise: 245, reach: 150 }),
  freeze({ id: 'south-west-peak', name: 'The south-west peak', x: -1430, z: -702, rise: 195, reach: 130 }),
]);
/**
 * The ridges between the summits of each massif, with a saddle in each: the eastern massif's
 * spine north toward Stonegate's peak and south-east toward the corner, the central massif's
 * over the head of Upper Olveth to the western peak, and the southern mountains' along the
 * borders with Amod and Vastos.
 */
export const RIDGES = freeze([
  freeze({ from: point(-962, -826), to: point(-980, -950), rise: [362, 260], dip: .12, reach: 150 }),
  freeze({ from: point(-980, -950), to: point(-1032, -1082), rise: [240, 140], dip: .25, reach: 100 }),
  freeze({ from: point(-962, -826), to: point(-880, -770), rise: [362, 225], dip: .1, reach: 120 }),
  freeze({ from: point(-1232, -968), to: point(-1462, -928), rise: [280, 245], dip: .3, reach: 130 }),
  freeze({ from: point(-1232, -968), to: point(-1175, -1050), rise: [280, 180], dip: .15, reach: 110 }),
  freeze({ from: point(-1430, -702), to: point(-1262, -752), rise: [195, 150], dip: .25, reach: 100 }),
]);

/**
 * How far a point is inside the range: the distance to the nearest ground that is not the East
 * Lotharn's (Amod, Vastos, the plain, the sea), on a ten-metre lattice made once.
 */
const EDGE = (() => {
  const step = 10, minX = LOTHARN_BOX.minX, minZ = LOTHARN_BOX.minZ;
  const cols = Math.ceil((LOTHARN_BOX.maxX - minX) / step) + 1, rows = Math.ceil((LOTHARN_BOX.maxZ - minZ) / step) + 1;
  const inside = new Uint8Array(cols * rows), rim = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) if (hexOwnerAt(minX + i * step, minZ + j * step) === LOTHARN) inside[j * cols + i] = 1;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    if (inside[j * cols + i]) continue;
    const next = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => inside[(j + b) * cols + i + a] && i + a >= 0 && i + a < cols && j + b >= 0 && j + b < rows);
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
 * The ground the peaks stand on, smoothed. The atlas's blend steps its level from hill hex to
 * mountain hex over a few tens of metres; under a massif that step would tilt a ramp past what can
 * be climbed, so where the peaks rise the ground they rise from is this: the same ground, sampled
 * every ten metres and blurred over fifty.
 */
const CALM = (() => {
  const step = 10, minX = LOTHARN_BOX.minX, minZ = LOTHARN_BOX.minZ;
  const cols = Math.ceil((LOTHARN_BOX.maxX - minX) / step) + 1, rows = Math.ceil((LOTHARN_BOX.maxZ - minZ) / step) + 1;
  let level = new Float32Array(cols * rows);
  const own = new Uint8Array(cols * rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = minX + i * step, z = minZ + j * step, mix = seamlessTerrainMix(x, z);
    level[j * cols + i] = mix.base + relief(x, z, mix.amp, mix.wave);
    own[j * cols + i] = hexOwnerAt(x, z) === LOTHARN ? 1 : 0;
  }
  // Blurred over the range's own ground only: the sea at the corner and the plain past the water
  // would otherwise drag the ground under the massifs down toward them at every edge.
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

/** Plain distance to a line, and nothing past `limit` beyond its box: for the peaks' lowland question, asked often. */
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
/** The road's climb out of Amod's notch onto Kemrath's floor, kept as low as the valley it goes to. */
const NOTCH_LINE = polyline([point(-1152, -770), point(-1150, -792), point(-1144, -818), point(-1128, -842)]);
/** Each lowland and how far from its line the mountains may begin to rise. */
const LOWLANDS = freeze([
  { line: KEMRATH.line, clear: 42 }, { line: COL.line, clear: 30 }, { line: STONEGATE.line, clear: 23 },
  { line: OLVETH.line, clear: 50 }, { line: NOTCH_LINE, clear: 26 },
  ...(BORDER ? [{ line: BORDER, clear: 80 }] : []),
]);
/** How far a point is from the nearest lowland or border, less inside one: where the peaks' lift begins, it is nought. */
function lowlandReach(x, z) {
  let d = edgeDistance(x, z) - 18;
  for (const low of LOWLANDS) {
    const reach = lineDistance(low.line, x, z, Math.max(0, d) + low.clear) - low.clear;
    if (reach < d) d = reach;
  }
  return d;
}
export const lowlandDistance = (x, z) => Math.max(0, lowlandReach(x, z));
/** A slow wander in where the summits are measured from, so no face is a cone. */
const warpX = (x, z) => x + Math.sin(z * .021 + 1.3) * 9 + Math.sin(z * .047 + x * .013) * 5;
const warpZ = (x, z) => z + Math.sin(x * .019 + .4) * 9 + Math.sin(x * .043 - z * .011) * 5;
/** The peaks' lift at a point, before the cliff bands: the highest any one summit gives it. */
function rawUplift(x, z) {
  // The lowland's edge wanders too, so no valley wall is ruled straight along its line - but it
  // wanders on the lowland's side of nought, never into its floor.
  let dv = lowlandReach(x, z);
  if (dv < -12) return 0;
  dv = Math.max(0, dv + Math.sin(x * .031 + z * .017) * 6 + Math.sin(z * .052 - x * .009 + 2) * 4);
  if (dv <= 0) return 0;
  const wx = warpX(x, z), wz = warpZ(x, z);
  let best = 0;
  // Near a lowland the summit's distance is taken twenty metres longer, so where a ridge runs right
  // over a lowland's edge - the central ridge crosses the head of Upper Olveth - it comes down to a
  // saddle there and does not stand up out of the valley as a wall. Well inside, nothing is added.
  const slack = 20 * (1 - smooth(10, 50, dv));
  // The profile is eased at the foot and broad at the top: most of the rise is in the middle of the
  // face, which is where the cliffs are, and a summit is a shoulder with room on it for a bald.
  const lift = (rise, ds, reach) => rise * smooth(0, 1, (dv / (dv + ds + slack)) ** .65) * (1 - smooth(reach * .55, reach, ds));
  // Where two summits' lifts meet, the higher is taken but the join is rounded, so a ridge comes
  // off its peak as a shoulder and not as a crease the cliffs would have to fold round.
  const join = (a, b, k = 28) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.max(a, b) + h * h * k / 4; };
  for (const peak of PEAKS) {
    const ds = Math.hypot(wx - peak.x, wz - peak.z);
    if (ds < peak.reach) best = join(best, lift(peak.rise, ds, peak.reach));
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
 * **The cliff bands.** The lift is laid in courses: every `period` metres of it, most of the rise
 * is taken in one short `riser` - a cliff, seventy and eighty degrees - and the rest of the course
 * is a `tread`, a ledge that runs round the mountain at a slope a traveler can stand on. A face
 * that averages sixty degrees becomes rings of ledges eight or ten metres wide with cliffs of
 * thirty-six metres between them, and a mountain is climbed ledge by ledge.
 */
export const BANDS = freeze({ period: 40, riser: .3, tread: .1 });
export function terrace(u) {
  if (u <= 0) return 0;
  const { period, riser, tread } = BANDS, k = Math.floor(u / period), t = u / period - k;
  const course = t < 1 - riser ? tread * t / (1 - riser) : tread + (1 - tread) * smooth(0, 1, (t - (1 - riser)) / riser);
  return (k + course) * period;
}
/**
 * **The balds.** Each summit is cut off level a little above the cliff that rings it about
 * twenty-eight metres out: a broad, nearly flat top - the lore's balds, the ridge-tops "kept open
 * as seasonal grazing ground" - with its last cliff round it, and the last ramp up onto it on a
 * ring wide enough to take one.
 */
export const BALD = freeze({ radius: 18, above: 1.5 });
const PLATEAUS = (() => {
  const out = new Map();
  // The level with a bald's worth of ground above it round each summit: the lift sampled every two
  // metres out to seventy, the top so many samples taken, and the lowest of them brought down to
  // the top of the cliff below it.
  for (const peak of PEAKS) {
    const lifts = [];
    for (let dx = -70; dx <= 70; dx += 2) for (let dz = -70; dz <= 70; dz += 2) if (dx * dx + dz * dz <= 4900) lifts.push(rawUplift(peak.x + dx, peak.z + dz));
    lifts.sort((a, b) => b - a);
    const level = lifts[Math.min(lifts.length - 1, Math.round(Math.PI * BALD.radius ** 2 / 4))];
    out.set(peak.id, Math.floor(level / BANDS.period) * BANDS.period + BALD.above);
  }
  return out;
})();
/** The top the nearest summit is cut off at. */
function plateauAt(x, z) {
  let best = null, nearest = Infinity;
  for (const peak of PEAKS) { const d = Math.hypot(x - peak.x, z - peak.z); if (d < nearest) { nearest = d; best = peak; } }
  return best ? PLATEAUS.get(best.id) : Infinity;
}
/** The peaks' lift at a point, before the cliff bands: the highest any summit or ridge gives it, and no higher than its bald. */
export function peakUplift(x, z) {
  const u = rawUplift(x, z);
  return u > 0 ? Math.min(u, plateauAt(x, z)) : 0;
}
/** Each summit's bald: its level in lift. */
export const PEAK_TOPS = freeze(Object.fromEntries(PEAKS.map(peak => [peak.id, PLATEAUS.get(peak.id)])));

/** The top of a band's ledge and the foot of the next: where a cliff starts and where it ends, in lift. */
const bandFoot = k => (k + BANDS.tread) * BANDS.period, bandTop = k => (k + 1) * BANDS.period;

/**
 * **The ramps.** Each cliff band is broken in one place on each summit's way up: a ramp cut
 * slantwise across the cliff, a couple of metres wide, climbing the thirty-six metres from one
 * ledge to the next at about forty degrees. The shared climbing controller handles steeper faces; the ramps
 * go round the mountain as they go up: the next one starts well round the ledge from the top of
 * the last, so a hiking route can be found by walking the ledges. The original low-grade routes use these ways or
 * through the caves (src/east-lotharn-caves.js).
 */
export const RAMP = freeze({ half: 2, edge: 2.4, grade: .75, run: 4 });
/** Which way the lift climbs at a point, measured across a metre and a half. */
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
    if (!inLotharnBox(x, z)) return null;
  }
  return null;
}
/**
 * Walk a contour of the lift: along it, a step at a time, and back onto it after every step. The
 * ramps are laid along the cliffs' contours, so they cross a cliff slantwise wherever the cliff
 * goes - round a dome, along a ridge's flank, into the head of a valley.
 */
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
/**
 * The whole of a cliff: the contour of band `k`'s riser that goes round `peak`, found by walking
 * down from the summit to the cliff and then along it both ways until it closes on itself or runs
 * into the range's edge. A list of points, in order.
 */
function cliffLine(peak, k) {
  const level = riserLevel(k);
  // Down from the top to the cliff, the steepest way.
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
/**
 * A ramp across band `k`'s cliff: a stretch of the cliff line long enough for the climb, as near
 * `from` as it can start, climbing the way `turn` goes round if there is room that way and the
 * other way if not.
 */
function rampAcross(peak, k, from, turn, taken = []) {
  const cliff = cliffLine(peak, k);
  if (!cliff || cliff.points.length < 8) return null;
  const pts = cliff.points, n = pts.length, length = (bandTop(k) - bandFoot(k)) / RAMP.grade + RAMP.run * 2;
  let nearest = 0, best = Infinity;
  pts.forEach((q, i) => { const d = Math.hypot(q.x - from.x, q.z - from.z); if (d < best) { best = d; nearest = i; } });
  // Try starting at the nearest point, then a little either side of it, each way round.
  for (let shift = 0; shift < n; shift += 3) for (const start of [nearest + shift, nearest - shift]) for (const way of [turn, -turn]) {
    const out = [];
    let run = 0, i = start;
    let bent = false;
    for (let step = 0; step < n && run < length; step++, i += way) {
      if (!cliff.closed && (i < 0 || i >= n)) break;
      const q = pts[((i % n) + n) % n];
      if (out.length) run += Math.hypot(q.x - out.at(-1).x, q.z - out.at(-1).z);
      // No ramp near a valley's shoulder, where the ground it would land on falls away to the floor;
      // none where the range is giving way to its neighbour's ground, which tilts it; none off its
      // own summit's slopes; and none within reach of another ramp.
      if (lowlandDistance(q.x, q.z) < (k ? 9 : 2) || lotharnShare(q.x, q.z) < .995 || Math.hypot(q.x - peak.x, q.z - peak.z) > peak.reach * .8
        || taken.some(t => Math.abs(t.x - q.x) < 7 && Math.abs(t.z - q.z) < 7 && Math.hypot(t.x - q.x, t.z - q.z) < 7)) { bent = true; break; }
      // No ramp round a sharp bend in the cliff: it would lie across the spur, not along the face.
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
 * The ramps round every summit. The first starts on the side the summit is reached from (`from`,
 * toward the nearest road or floor); each after it starts `stagger` metres on round the ledge from
 * the top of the last, so a climber comes up a ramp onto a ledge and has to walk round the
 * mountain to find the next.
 */
export const RAMP_WAYS = freeze({
  'eastern-peak': freeze({ from: point(-1040, -870), stagger: 12 }),
  'central-peak': freeze({ from: point(-1200, -880), stagger: 12 }),
  'western-peak': freeze({ from: point(-1420, -860), stagger: 12 }),
  'south-west-peak': freeze({ from: point(-1380, -770), stagger: 12 }),
});
/**
 * Along the ledge between two points: the ledge's own contour, a little above the cliff it tops,
 * followed from `a` round whichever way reaches `b` sooner - or straight across if they are close.
 */
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
export function cliffEnds(peakId, k) {
  const peak = PEAKS.find(one => one.id === peakId), cliff = cliffLine(peak, k);
  if (!cliff) return null;
  const end = q => { const { gx, gz } = upliftSlope(q.x, q.z); return { x: +q.x.toFixed(1), z: +q.z.toFixed(1), edge: +edgeDistance(q.x, q.z).toFixed(1), slope: +Math.hypot(gx, gz).toFixed(3), lowland: +lowlandDistance(q.x, q.z).toFixed(1), u: +peakUplift(q.x, q.z).toFixed(1) }; };
  return { first: end(cliff.points[0]), last: end(cliff.points.at(-1)), n: cliff.points.length };
}
export function rampTrouble(peakId, k) {
  const peak = PEAKS.find(one => one.id === peakId), cliff = cliffLine(peak, k);
  if (!cliff) return { cliff: null };
  const count = { points: cliff.points.length, closed: cliff.closed, lowland: 0, share: 0, far: 0, taken: 0 };
  for (const q of cliff.points) {
    if (lowlandDistance(q.x, q.z) < (k ? 9 : 2)) count.lowland++;
    if (lotharnShare(q.x, q.z) < .995) count.share++;
    if (Math.hypot(q.x - peak.x, q.z - peak.z) > peak.reach * .8) count.far++;
    if (RAMPS.some(r => r.peak !== peakId || r.band !== k ? r.line.points.some(t => Math.hypot(t.x - q.x, t.z - q.z) < 7) : false)) count.taken++;
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
      const ramp = rampAcross(peak, k, from, turn, taken);
      if (!ramp) continue;
      // The ledge path from the top of the last ramp along the ledge to the foot of this one, cut
      // level into the ledge so the two are one way up whatever the ledge does between them.
      const last = out.findLast(one => one.peak === peak.id && one.kind === 'ramp');
      if (last) {
        const joining = ledgePath(last.line.points.at(-1), ramp.points[0], k, turn);
        if (joining) out.push(freeze({ id: `${peak.id}-ledge-${k + 1}`, peak: peak.id, band: k, kind: 'ledge', line: polyline(joining),
          from: last.to, to: bandFoot(k), climb: freeze([0, 0]) }));
      }
      const line = polyline(ramp.points);
      taken.push(...ramp.points);
      out.push(freeze({ id: `${peak.id}-ramp-${k + 1}`, peak: peak.id, band: k, kind: 'ramp', line, from: bandFoot(k), to: Math.min(bandTop(k), terrace(top)),
        climb: freeze([RAMP.run, line.length - RAMP.run]) }));
      // On round the ledge above, the way the ramp was going, for the next one.
      const end = ramp.points.at(-1), onward = followContour(end, Math.min(top - 1, (k + 1 + BANDS.tread / 2) * BANDS.period), ramp.turn, way.stagger);
      from = onward ? onward.at(-1) : end;
      turn = ramp.turn;
    }
  }
  return out;
})());
/**
 * **The peaks' own ground.** The world's ground grid is seven metres apart out here, which would
 * draw a thirty-six-metre cliff as a ramp; so the massifs are drawn by a ground of their own, three
 * metres apart (src/east-lotharn-scenery.js), over this box - every point the peaks lift, and a
 * margin - and the world's grid is sunk out of sight under it wherever they do.
 */
export const MOUNTAIN_PATCH = (() => {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let x = LOTHARN_BOX.minX; x <= LOTHARN_BOX.maxX; x += 6) for (let z = LOTHARN_BOX.minZ; z <= LOTHARN_BOX.maxZ; z += 6) {
    if (peakUplift(x, z) * lotharnShare(x, z) <= 0) continue;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  }
  return freeze({ minX: minX - 12, maxX: maxX + 12, minZ: minZ - 12, maxZ: maxZ + 12, step: 3 });
})();
/**
 * How far the world's own ground grid is lowered under the peaks' ground: below the massif's own
 * foot, so it is under every cliff it could cut across and under every cave's floor too.
 */
export function lotharnTerrainSink(x, z) {
  const p = MOUNTAIN_PATCH;
  if (x < p.minX || x > p.maxX || z < p.minZ || z > p.maxZ) return 0;
  const u = peakUplift(x, z);
  if (u <= 1) return 0;
  const lift = u * lotharnShare(x, z);
  return (lift + 40) * smooth(1, 4, lift);
}
/** The peaks' lift as the ground takes it: let down to nothing at the range's borders. */
export const peakLiftAt = (x, z) => { const u = peakUplift(x, z); return u > 0 ? u * lotharnShare(x, z) : 0; };
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

/** Whether a point is on a ramp, or within `margin` of its edge. */
export function onRamp(x, z, margin = 0) {
  const reach = RAMP.half + margin;
  for (const ramp of RAMPS) if (outside(ramp.line, x, z) <= reach && nearestOn(ramp.line, x, z).distance < reach) return true;
  return false;
}
/** A ramp's level in lift at a distance along it: level at each end for a few metres, and one even climb between. */
function rampLevel(ramp, along) {
  if (ramp.kind === 'ledge') return lerp(ramp.from, ramp.to, clamp(along / (ramp.line.length || 1), 0, 1));
  const [a, b] = ramp.climb;
  return lerp(ramp.from, ramp.to, smooth(a, b, along) * .15 + clamp((along - a) / (b - a), 0, 1) * .85);
}
/** The peaks' lift at a point with the cliff bands and the ramps through them: what the ground is raised by. */
export function peakGround(x, z, u = peakUplift(x, z)) {
  if (u <= 0) return 0;
  const height = terrace(u), reach = RAMP.half + RAMP.edge;
  // Where two ways' edges overlap - a ramp and the ledge path above it, on a straight flank where
  // the bands run close and parallel - the nearer decides the ground, so each keeps its own level
  // underfoot and there is a step between them rather than one ironed across the other.
  let best = null;
  for (const ramp of RAMPS) {
    if (outside(ramp.line, x, z) > reach) continue;
    const near = nearestOn(ramp.line, x, z);
    if (near.distance < reach && (!best || near.distance < best.distance)) best = { ramp, distance: near.distance, along: near.along };
  }
  return best ? lerp(rampLevel(best.ramp, best.along), height, smooth(RAMP.half, reach, best.distance)) : height;
}

/**
 * Weathered shoulders on the northern faces. The original contour field still
 * locates caves, ledges and ramps. Between those routes, broad unequal patches
 * recover the underlying continuous slope across complete rock courses, rather
 * than putting another small outcrop on each identical cliff ring.
 *
 * The fortified southern/eastern faces are deliberately left for their own
 * route review: changing a lip there can open a survivable fall past Varn.
 * Export the exact added height so legacy scenery can keep its seeded choices
 * while newly placed vegetation samples the actual ground.
 */
export const LOTHARN_WESTERN_SHOULDER = freeze({ minX: -1440, maxX: -1355, minZ: -980, maxZ: -918, feather: 15 });
function landscapeBeforeCentralNorth(x, z) {
  if (!inLotharnBox(x, z) || x >= -1140 || z >= -918) return 0;
  // A bounded shoulder on the western peak faces Upper Olveth. The northern
  // field alone missed this face: all its visible courses lie south of -975.
  // Keep the first two courses and soften only the higher rock between the
  // established ways; the window is zero well before either nearby cave.
  const u = peakUplift(x, z);
  const s = LOTHARN_WESTERN_SHOULDER;
  const shoulderWindow = smooth(0, s.feather, x - s.minX) * smooth(0, s.feather, s.maxX - x)
    * smooth(0, s.feather, z - s.minZ) * smooth(0, s.feather, s.maxZ - z) * smooth(80, 100, u);
  const northWindow = smooth(0, 30, -975 - z) * smooth(0, 30, -1140 - x);
  const window = Math.max(northWindow, shoulderWindow);
  if (!window) return 0;
  // The central chimney is the only cave in this northern shaping area. Its
  // complete roof and both mouth searches must stay fixed, not just the ledge
  // height at the nominal endpoints. Keep its surveyed corridor plus 12 m clear.
  const caveDistance = Math.max(-1250 - x, x + 1170, -1120 - z, z + 1057, 0);
  const guard = window * smooth(0, 12, caveDistance);
  if (!guard) return 0;
  if (u <= 35 || onBald(x, z, 10)) return 0;
  let pathDistance = Infinity;
  for (const ramp of RAMPS) {
    if (outside(ramp.line, x, z) > 18) continue;
    pathDistance = Math.min(pathDistance, lineDistance(ramp.line, x, z, 18));
  }
  const path = Number.isFinite(pathDistance) ? smooth(7, 18, pathDistance) : 1;
  if (!path) return 0;
  // A soil-covered shoulder can cross several courses. The field is measured
  // in horizontal space, never elevation, so intact outcrops terminate in
  // different places. Keep scattered steep ribs among the broader slopes.
  const shoulder = .58 * Math.sin(x * .019 + z * .011 + 1.4)
    + .28 * Math.sin(z * .029 - x * .009 + 2.1)
    + .14 * Math.sin(x * .047 + z * .023);
  const weathering = .32 + .68 * smooth(-.35, .34, shoulder);
  const rounding = Math.max(0, u - terrace(u));
  return rounding * weathering * guard * path * smooth(12, 35, edgeDistance(x, z));
}

/** The seamless correction (see South Suval): the hex blend's steps taken out of the range's own ground. */
function seamlessLift(x, z, share) {
  if (!share) return 0;
  const now = seamlessTerrainMix(x, z), was = terrainMix(x, z);
  return (now.base + relief(x, z, now.amp, now.wave) - was.base - relief(x, z, was.amp, was.wave)) * share;
}

/**
 * The range's own ground, from the ground it is handed. `west-ground.js` calls this inside its
 * own shaping, so the water it cuts follows these valleys: the rivers' profiles are measured on
 * this ground, and their channels are cut into it afterwards.
 */
export function lotharnGround(x, z, ground) {
  if (!inLotharnBox(x, z)) return ground;
  const share = lotharnShare(x, z);
  let height = ground + seamlessLift(x, z, share);
  const fade = smooth(0, 40, boxInset(x, z));
  // The north face, and the plain beyond the water.
  if (BORDER) {
    const near = nearestOn(BORDER, x, z), foot = borderFoot(near.along);
    // The line runs east, so its left is north: the plain's side of the water.
    const north = near.side < 0 || near.end ? 0 : smooth(0, 30, near.distance);
    const far = lerp(height, Math.min(height, foot + NORTH_FACE.plainRise), north * (1 - share));
    height = lerp(height, lerp(foot, far, smooth(8, NORTH_FACE.reach, near.distance)), fade);
  }
  if (!share) return height;
  // The valleys, each by its own line, weighed by how much of the point is the range's.
  const kemrath = outside(KEMRATH.line, x, z) < KEMRATH.half + KEMRATH.wall ? nearestOn(KEMRATH.line, x, z) : null;
  if (kemrath) height = lerp(height, carve(height, kemrath, KEMRATH.half, KEMRATH.wall, floorAt(KEMRATH, kemrath.along, KEMRATH.foot)), share);
  const col = outside(COL.line, x, z) < COL.half + COL.wall ? nearestOn(COL.line, x, z) : null;
  if (col) height = lerp(height, carve(height, col, COL.half, COL.wall, colLevel(col.along)), share);
  const gate = outside(STONEGATE.line, x, z) < STONEGATE.half + STONEGATE.wall ? nearestOn(STONEGATE.line, x, z) : null;
  if (gate) {
    height = Math.min(height, lerp(height, carve(height, gate, STONEGATE.half, STONEGATE.wall, stonegateFloor(gate.along)), share));
  }
  const olveth = outside(OLVETH.line, x, z) < OLVETH.half + OLVETH.wall ? nearestOn(OLVETH.line, x, z) : null;
  if (olveth) {
    const foot = OLVETH_FOOT;
    height = Math.min(height, lerp(height, carve(height, olveth, OLVETH.half, OLVETH.wall, floorAt(OLVETH, olveth.along, foot)), share));
  }
  // The peaks, with their cliff bands and the ramps through them, on top of what the valleys left:
  // their lift is nothing until well past each valley's shoulder, so no floor or wall moves. As a
  // massif rises, the ground under it is eased onto the smoothed ground (`calmGround`).
  const lift = peakUplift(x, z);
  if (lift > 0) {
    height = lerp(height, calmGround(x, z), smooth(0, 30, lift) * share);
    height += peakGround(x, z, lift) * share;
  }
  return height;
}

/**
 * The coast's own slope, which the western modules leave out because none of their regions came
 * down to the sea before this one's north-east corner. `regionBase` lets the land down to the
 * beach over the last forty metres; the border water reaches the sea there, and its level has to
 * be measured on the ground it actually runs over.
 */
export function lotharnCoast(x, z) {
  if (!inLotharnBox(x, z)) return 0;
  const distance = landDistance(x, z);
  if (distance >= 40) return 0;
  const mix = terrainMix(x, z), inland = mix.base + relief(x, z, mix.amp, mix.wave);
  const beach = lerp(-5.6, 1.4, smooth(-26, 6, distance));
  return lerp(beach, inland, smooth(2, 40, distance)) - inland;
}

/** The water lines the western module builds its courses on: the raw lines, source first. */
/**
 * Stonegate's water rises a little way down the gorge rather than on the col itself: the col is
 * the divide, dry ground the road crosses, and a spring comes out of the gorge's head below it.
 */
const STONEGATE_SPRING = 18;
export const LOTHARN_WATER_LINES = freeze({
  border: BORDER_WATER_LINE,
  // Kemrath's water wanders across its own floor rather than down the middle of it: a floor laid
  // down by ice and grown over is the one place in the range a stream has room to meander.
  kemrath: freeze((() => {
    const line = KEMRATH.line, out = [];
    for (let along = 0; along <= line.length; along += 12) {
      const p = pointOn(line, along), off = Math.sin(along / 110 * Math.PI * 2 + .6) * 7 * smooth(0, 40, along);
      out.push(point(p.x + p.nx * off, p.z + p.nz * off));
    }
    return out;
  })()),
  stonegate: freeze([(() => {
    const [a, b] = STONEGATE.line.raw, length = Math.hypot(b.x - a.x, b.z - a.z);
    return point(a.x + (b.x - a.x) * STONEGATE_SPRING / length, a.z + (b.z - a.z) * STONEGATE_SPRING / length);
  })(), ...STONEGATE.line.raw.slice(1)]),
  olveth: OLVETH.line.raw,
});

// ---------------------------------------------------------------------------
// The pass road
// ---------------------------------------------------------------------------
/**
 * "The Lotharn are crossed... even the most-traveled passes require a day and a half of actual
 * mountain walking at modest elevations." The road comes up out of Amod through the notch the
 * atlas gives it, down onto Kemrath's floor, east along it to the col, over the col past the
 * inn, and down through Stonegate beside the white water to the border water, where the Mithala
 * plain begins and the road stops: the plain is not built, and nor is the descent into Amod below
 * the notch, which the Amod lore gives to Sareth-am-Vel.
 *
 * The whole of it lies on ground this module made - Kemrath's floor, the col's saddle and
 * Stonegate's floor - so each vertex's grade is that ground's own level and the road is neither
 * cut nor built up anywhere but where it climbs out of the notch.
 */
/**
 * Down the east side of Stonegate's floor, nine and a half metres off the water, and out of its
 * mouth to the border water's bank. The road takes one even grade from the col to the bank over
 * its own length rather than the floor's level point by point: on the inside of a bend the road
 * is shorter than the gorge, and a grade copied off the floor would be steeper there than
 * anywhere. The floor is within a metre or two of it the whole way down, and the bed takes that.
 */
const stonegateSide = (() => {
  const pts = STONEGATE.line.points, out = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz) || 1;
    let nx = -dz / length, nz = dx / length;
    if (nx < 0) { nx = -nx; nz = -nz; }
    out.push({ x: pts[i].x + nx * 9.5, z: pts[i].z + nz * 9.5 });
  }
  const mouth = pts.at(-1), bank = BORDER ? nearestOn(BORDER, mouth.x + 9, mouth.z) : null;
  if (bank) {
    const dx = mouth.x + 9 - bank.x, dz = mouth.z - bank.z, length = Math.hypot(dx, dz) || 1;
    out.push({ x: bank.x + dx / length * 6, z: bank.z + dz / length * 6 });
  }
  const top = COL.levels.at(-1) + .12, bottom = STONEGATE_FOOT + .12, start = COL.line.points.at(-1);
  let run = 0, prior = start;
  const runs = out.map(p => (run += Math.hypot(p.x - prior.x, p.z - prior.z), prior = p, run));
  return out.map((p, i) => ({ ...p, grade: lerp(top, bottom, runs[i] / run) }));
})();
const roadVertex = (x, z, grade) => freeze({ x, z, grade });
export const PASS_ROAD = freeze([
  roadVertex(-1150, -792, 60.2),
  roadVertex(-1144, -818, 59.8),
  roadVertex(-1128, -842, kemrathFloor(18) + .12),
  ...COL.line.points.filter((_, i) => i % 3 === 0).map(p => roadVertex(p.x, p.z, colLevel(nearestOn(COL.line, p.x, p.z).along) + .12)),
  ...stonegateSide.map(p => roadVertex(p.x, p.z, p.grade)),
]);
export const PASS_ROAD_HALF = 2.2;
/**
 * The road as built: a Catmull-Rom curve through the vertices, every two metres, its grade
 * carried by arc length. The ground is graded to this line and the ribbon is laid along it.
 */
export const PASS_ROAD_LINE = (() => {
  const v = PASS_ROAD, points = [], at = i => v[clamp(i, 0, v.length - 1)], marks = [];
  for (let i = 0; i < v.length - 1; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const steps = Math.max(2, Math.ceil(Math.hypot(p2.x - p1.x, p2.z - p1.z) / 2));
    marks.push(points.length);
    for (let k = 0; k < steps; k++) {
      const t = k / steps, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => .5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      points.push({ x: f(p0.x, p1.x, p2.x, p3.x), z: f(p0.z, p1.z, p2.z, p3.z) });
    }
  }
  marks.push(points.length); points.push({ x: v.at(-1).x, z: v.at(-1).z });
  const runs = [0];
  for (let i = 1; i < points.length; i++) runs.push(runs[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z));
  return freeze(points.map((p, index) => {
    let seg = 0; while (seg < marks.length - 2 && marks[seg + 1] <= index) seg++;
    const a = marks[seg], b = marks[seg + 1], t = runs[b] > runs[a] ? (runs[index] - runs[a]) / (runs[b] - runs[a]) : 0;
    return freeze({ x: p.x, z: p.z, grade: lerp(v[seg].grade, v[seg + 1].grade, clamp(t, 0, 1)) });
  }));
})();
const ROAD_BOUNDS = (() => {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of PASS_ROAD_LINE) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); }
  return { bounds: { minX, maxX, minZ, maxZ } };
})();
/** The nearest point of the road: distance, and the grade there. */
export function passRoadAt(x, z) {
  let best = { distance: Infinity, grade: 0 };
  for (let i = 1; i < PASS_ROAD_LINE.length; i++) {
    const p = PASS_ROAD_LINE[i - 1], q = PASS_ROAD_LINE[i], dx = q.x - p.x, dz = q.z - p.z, length2 = dx * dx + dz * dz || 1;
    const t = clamp(((x - p.x) * dx + (z - p.z) * dz) / length2, 0, 1);
    const distance = Math.hypot(p.x + dx * t - x, p.z + dz * t - z);
    if (distance < best.distance) best = { distance, grade: lerp(p.grade, q.grade, t) };
  }
  return best;
}

// ---------------------------------------------------------------------------
// The made places
// ---------------------------------------------------------------------------
/**
 * **The pass inn**, on the col beside the road: "permanent inns and waypoints established at
 * their highest sections for centuries, maintained by the communities that benefit from the
 * trade the passes carry". Stone below and timber frame above - "the woodworking communities of
 * the better-forested valleys have traditions of timber-frame construction" - with a mule shed
 * and a trough across the yard. Its yard is levelled into the saddle.
 */
const innAt = (() => {
  const p = COL.line.points, i = Math.round(p.length * .42), a = p[i - 1], b = p[i + 1];
  const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
  let nx = -dz / length, nz = dx / length;
  if (nx > 0) { nx = -nx; nz = -nz; }   // the west side, toward the central massif
  const level = colLevel(nearestOn(COL.line, p[i].x, p[i].z).along);
  return { x: p[i].x + nx * 13, z: p[i].z + nz * 13, facing: Math.atan2(-nx, -nz), level };
})();
export const PASS_INN = freeze({ id: 'pass-inn', name: 'The pass inn', x: innAt.x, z: innAt.z, level: innAt.level,
  facing: innAt.facing, width: 11, depth: 8, yard: 15, clearing: 32 });

/**
 * **The iron workings** above Kemrath, on the central massif's south face: an adit into the
 * seam, a bench levelled in front of it, a spoil heap tipped down the wall below, and the coal
 * that "follows" showing black in the cut beside it. "A mine is not simply opened; it is
 * introduced. The first ore from a new seam is not sold. It is returned to the entrance with
 * bread, salt, and a spoken promise" - so there is a ledge at the portal with ore, bread and salt.
 */
export const IRON_WORKINGS = freeze({ id: 'iron-workings', name: 'The iron workings above Kemrath',
  x: -1292, z: -884, facing: 0, bench: 9, level: 63, clearing: 16 });

/** The cart track from the road down Kemrath's floor and up to the workings' bench. */
export const WORKINGS_TRACK = freeze([point(-1136, -836), point(-1180, -845), point(-1230, -849), point(-1262, -858),
  point(-1282, -870), point(IRON_WORKINGS.x + 1, IRON_WORKINGS.z + 5)]);

/**
 * Ground nothing tall grows on: the balds - "the burning practices of the valley peoples that
 * maintained certain open ridgetop areas as seasonal grazing ground" - on the two massifs' tops,
 * Upper Olveth's sheep grass, Kemrath's fields and vines, the inn's yard, the workings' bench and
 * the road.
 */
export const BALDS = freeze([
  freeze({ id: 'central-bald', name: 'The central bald', x: -1232, z: -968, radius: 24 }),
  freeze({ id: 'eastern-bald', name: 'The eastern bald', x: -962, z: -826, radius: 26 }),
]);
export const OLVETH_PASTURE = freeze({ x: -1326, z: -1010, radius: 58 });
/** Kemrath's fields: along its line from `from` to `to` metres below the head, either side of the water. */
export const KEMRATH_FIELDS = freeze({ from: 90, to: 420, half: 20 });
/** "Every Lotharn valley that can grow a grape does": Kemrath's, on the south-facing foot of its north wall. */
export const KEMRATH_VINES = freeze({ x: -1415, z: -866, width: 34, depth: 12 });

/** Along Kemrath's line and distance from its water, or null away from the floor. */
export function kemrathFloorAt(x, z, margin = 0) {
  if (outside(KEMRATH.line, x, z) > KEMRATH.half + margin + 2) return null;
  const near = nearestOn(KEMRATH.line, x, z);
  return near.distance < KEMRATH.half + margin ? near : null;
}
/** Whether a point is somewhere the forest does not stand. */
export function lotharnOpen(x, z, margin = 0) {
  if (BALDS.some(b => Math.hypot(x - b.x, z - b.z) < b.radius + margin)) return true;
  if (Math.hypot(x - OLVETH_PASTURE.x, z - OLVETH_PASTURE.z) < OLVETH_PASTURE.radius + margin) return true;
  // The col is kept open round the inn, and the workings' bench round its portal.
  if (Math.hypot(x - PASS_INN.x, z - PASS_INN.z) < PASS_INN.clearing + margin) return true;
  if (Math.hypot(x - IRON_WORKINGS.x, z - IRON_WORKINGS.z) < IRON_WORKINGS.clearing + margin) return true;
  if (Math.abs(x - KEMRATH_VINES.x) < KEMRATH_VINES.width / 2 + margin && Math.abs(z - KEMRATH_VINES.z) < KEMRATH_VINES.depth / 2 + margin) return true;
  const floor = kemrathFloorAt(x, z, margin);
  if (floor && floor.along > KEMRATH_FIELDS.from - 10 && floor.along < KEMRATH_FIELDS.to + 10) return true;
  // Nothing grows on a ramp: a tree there would close the only way up.
  if (onRamp(x, z, 1.5 + margin)) return true;
  return passRoadAt(x, z).distance < PASS_ROAD_HALF + 2.5 + margin;
}

/**
 * The road's bed, the inn's yard and the workings' bench, levelled into whatever ground the
 * valleys and the water have left: the one shaping here that runs after the rivers
 * (`world-terrain.js`).
 */
export function eastLotharnGround(x, z, ground) {
  if (!inLotharnBox(x, z)) return ground;
  let height = ground;
  const yard = Math.hypot(x - PASS_INN.x, z - PASS_INN.z);
  if (yard < PASS_INN.yard + 8) height = lerp(PASS_INN.level, height, smooth(PASS_INN.yard, PASS_INN.yard + 8, yard));
  const bench = Math.hypot(x - IRON_WORKINGS.x, z - IRON_WORKINGS.z);
  if (bench < IRON_WORKINGS.bench + 7) height = lerp(IRON_WORKINGS.level, height, smooth(IRON_WORKINGS.bench, IRON_WORKINGS.bench + 7, bench));
  if (outside(ROAD_BOUNDS, x, z) < PASS_ROAD_HALF + 6) {
    const road = passRoadAt(x, z);
    if (road.distance < PASS_ROAD_HALF + 6) height = lerp(road.grade, height, smooth(PASS_ROAD_HALF + .6, PASS_ROAD_HALF + 6, road.distance));
  }
  return height + lotharnLandscapeDelta(x, z) + lotharnRouteJoinDelta(x, z);
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
 * The range's places. Kemrath, Stonegate and Upper Olveth are the lore's own valley names - "a
 * Kemrath person or an Upper Olveth person or a Stonegate Valley person" - and everything else
 * is named in plain words for what it is, as the game names a shore or a pass nobody in the lore
 * has named.
 */
export const EAST_LOTHARN_LANDMARKS = freeze([
  freeze({ id: 'kemrath', name: 'Kemrath', ...alongPoint(KEMRATH.line, .5), radius: 60,
    description: 'A broad high valley with a flat floor of deep soil between the central massif and the southern mountains, its water running west out of the range. Fields in strips down both sides of the water, kept in the old varieties, and vines on the foot of the north wall: every Lotharn valley that can grow a grape does.' }),
  freeze({ id: 'pass-inn', name: 'The pass inn', x: PASS_INN.x, z: PASS_INN.z,
    description: 'Stone below and timber frame above, on the col at the head of Kemrath: the divide between the two drainages and the pass’s highest section, where the valley people have kept an inn for longer than anybody has written down. A mule shed and a trough across the yard, and a waystone by the road.' }),
  freeze({ id: 'stonegate', name: 'Stonegate', ...alongPoint(STONEGATE.line, .45), radius: 50,
    description: 'The gorge the pass goes through, falling north from the col to the border water: white water down the middle of its floor and the road along the east side, between walls of stone in tilted courses - limestone, shale, sandstone, and coal black among them. Shells in the limestone at its head, older than the mountains.' }),
  freeze({ id: 'upper-olveth', name: 'Upper Olveth', x: OLVETH_PASTURE.x, z: OLVETH_PASTURE.z, radius: 60,
    description: 'An open high valley of the north face under the central massif, grass at its head where sheep are kept on the summer pasture, and a dry-stone fold. Its beck runs north down the valley to the border water.' }),
  freeze({ id: 'iron-workings', name: 'The iron workings above Kemrath', x: IRON_WORKINGS.x, z: IRON_WORKINGS.z,
    description: 'An adit into the central massif’s south face, square-timbered, a bench in front of it with rails and a cart, and the spoil tipped down the wall below. Coal shows black in the seam beside the portal. A mine here is not simply opened but introduced: on the ledge by the entrance, the first ore of the seam, with bread and salt.' }),
  freeze({ id: 'central-bald', name: 'The central bald', x: BALDS[0].x, z: BALDS[0].z, radius: BALDS[0].radius,
    description: 'The top of the central peak, three hundred and twenty metres up over Kemrath: a bald of pale grass kept open the way the valley people have always kept the ridge-tops, with the last cliff all round it and one ramp up onto it. Everything below is ledges and cliffs.' }),
  freeze({ id: 'eastern-bald', name: 'The eastern bald', x: BALDS[1].x, z: BALDS[1].z, radius: BALDS[1].radius,
    description: 'The highest ground in the East Lotharn, four hundred and twenty metres: the eastern peak’s bald, level grass on top of eight courses of cliff. The only way up is the ramps, ledge by ledge round the mountain, or the chimneys through the rock.' }),
  freeze({ id: 'olveth-passage', name: 'The passage to Upper Olveth', x: -1331, z: -874,
    description: 'A cave at the foot of the ridge on Kemrath’s north side, going straight in and through: fifty metres of dark passage under the ridge, and out at the head of Upper Olveth. The one way between the two valleys that is not the long way round by the border water.' }),
  freeze({ id: 'border-water', name: 'The border water', ...(BORDER ? alongPoint(BORDER, .4) : point(-1300, -1220)), radius: 60,
    description: 'The range’s northern foot, where the forest gives out and the Mithala plain begins: a mountain river, wadeable, running east along the whole border to the sea.' }),
]);

// Keep the previous field separate: the new lobe fills only the remaining relief,
// and saved canopy eligibility can remove precisely this revision.
export const lotharnCentralNorthDelta = createCentralNorthShoulder({
  peakUplift, terrace, onBald, PEAK_TOPS, RAMPS, edgeDistance, baseLandscapeDelta: landscapeBeforeCentralNorth,
});
export function lotharnLandscapeDelta(x, z) {
  return landscapeBeforeCentralNorth(x, z) + lotharnCentralNorthDelta(x, z);
}

// Independent traversal repair. Exact endpoint stations remove the old tiny
// steps; the wider cliff field and other nearestOn consumers remain unchanged.
const centralRouteJoins = createCentralRampJoinCorrection({ RAMPS, RAMP, nearestOn, lotharnShare, peakUplift, level: rampLevel });
export const lotharnRouteJoinDelta = centralRouteJoins.delta;
export const nearLotharnRouteJoin = centralRouteJoins.near;
