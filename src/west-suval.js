/**
 * West Suval and Solis as places: the country along the road from the border,
 * the city's walls, gates and streets, the Coalition's camp outside them, and
 * where everybody stands. Pure: no three, no DOM. `src/west-suval-world.js`
 * builds the scenery from these tables and `src/solis-town.js` gives the people
 * their words.
 *
 * Solis is laid out in its own frame (`solisPoint(a, b)`: `a` metres east and
 * `b` metres south of the market cross), square to the world, so its walls,
 * colliders and fighting ground line up with the world axes. Three layers show:
 *  - the old kingdom in the bones of the place: the walls and their patched sea
 *    face, the Court of Oaths, the temple, the orange courts, the bronze horses
 *    of the Gate of Sun Horses and the sun-horse on everything old;
 *  - the Empire in what it imposed: the Legion barracks and the tax house by the
 *    gate, a milestone and plaques, now defaced or boarded;
 *  - the Coalition in what is days old: the contingents' banners, a paymaster's
 *    table in the tax house door, notices in three hands, and the camp outside.
 *
 * Fortifications follow the shared standard in docs/west-suval-brief.md, in
 * dressed stone: a closed circuit, a wall walk behind a parapet, a tower at every
 * corner and either side of each gate, two gates, and a ditch outside.
 */
import { SOLIS, solisPoint, SOLIS_ROAD, regionNameAt } from './region-world.js';
import { toWorld } from './world-scale.js';

const freeze = Object.freeze;
const point = (x, z) => freeze({ x, z });
const local = (a, b) => solisPoint(a, b);

// ---------------------------------------------------------------------------
// The fortification standard, in metres
// ---------------------------------------------------------------------------
export const FORT = freeze({
  wallTop: 4.2,          // the wall walk, above the ground outside
  parapetTop: 5.0,       // the parapet's coping; merlons rise above it
  merlonTop: 5.7,
  thickness: 2.4,        // wall line ± 1.2: nobody stands inside it
  towerSize: 6,          // square towers, a storey above the wall
  towerOut: 1,           // tower centres sit this far outside the wall line, so they cover its face
  towerTop: 8.2,
  capRise: 2.6,          // tiled pyramid caps
  gateWidth: 4.6,        // clear passage between the gate towers
  ditchOffset: 8,        // ditch centre line, out from the wall line
  ditchWidth: 3.5,
  causeway: 6.4,         // the gap in the ditch before each gate
});

/** The wall line: a rectangle on the frame, corners at (±halfX, ±halfZ). */
export const SOLIS_CIRCUIT = freeze({ halfA: SOLIS.halfX, halfB: SOLIS.halfZ });

/**
 * The two gates. `face` is the side of the circuit, `along` the gate's centre
 * along that face (a for north/south, b for east/west), `out` its outward normal.
 */
export const SOLIS_GATES = freeze([
  freeze({ id: 'sun-horses', name: 'The Gate of Sun Horses', face: 'north', along: 0, out: freeze({ a: 0, b: -1 }) }),
  freeze({ id: 'quay', name: 'The Quay Gate', face: 'west', along: -8, out: freeze({ a: -1, b: 0 }) }),
]);

const FACES = freeze({
  north: freeze({ axis: 'a', fixed: -SOLIS_CIRCUIT.halfB, out: freeze({ a: 0, b: -1 }), span: SOLIS_CIRCUIT.halfA }),
  south: freeze({ axis: 'a', fixed: SOLIS_CIRCUIT.halfB, out: freeze({ a: 0, b: 1 }), span: SOLIS_CIRCUIT.halfA }),
  east: freeze({ axis: 'b', fixed: SOLIS_CIRCUIT.halfA, out: freeze({ a: 1, b: 0 }), span: SOLIS_CIRCUIT.halfB }),
  west: freeze({ axis: 'b', fixed: -SOLIS_CIRCUIT.halfA, out: freeze({ a: -1, b: 0 }), span: SOLIS_CIRCUIT.halfB }),
});
export { FACES as SOLIS_FACES };

/** Where a face's point `along` lies in the frame, pushed `out` metres outward. */
export function facePoint(faceId, along, out = 0) {
  const face = FACES[faceId];
  return face.axis === 'a' ? { a: along, b: face.fixed + face.out.b * out } : { a: face.fixed + face.out.a * out, b: along };
}

const half = FORT.towerSize / 2, gateTower = FORT.gateWidth / 2 + half;
/**
 * Every tower: the four corners, two beside each gate, and one more on each long
 * run so no stretch of wall goes much beyond 45 m uncovered. `a`/`b` is the
 * tower's centre (outside the wall line by `towerOut`), `kind` what it guards.
 */
export const SOLIS_TOWERS = freeze([
  ...[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sa, sb], i) => freeze({ id: `corner-${i + 1}`, kind: 'corner',
    a: sa * (SOLIS_CIRCUIT.halfA + FORT.towerOut), b: sb * (SOLIS_CIRCUIT.halfB + FORT.towerOut) })),
  ...SOLIS_GATES.flatMap(gate => [-1, 1].map(side => {
    const p = facePoint(gate.face, gate.along + side * gateTower, FORT.towerOut);
    return freeze({ id: `${gate.id}-${side < 0 ? 'left' : 'right'}`, kind: 'gate', gate: gate.id, a: p.a, b: p.b });
  })),
  ...[['south', -17], ['south', 17], ['east', 0]].map(([face, along]) => {
    const p = facePoint(face, along, FORT.towerOut);
    return freeze({ id: `${face}-${along}`, kind: 'wall', a: p.a, b: p.b });
  }),
]);

/** The face a tower belongs to, and its span along it. Corner towers belong to two. */
function towerSpans(faceId) {
  const face = FACES[faceId];
  const spans = [];
  for (const tower of SOLIS_TOWERS) {
    const along = face.axis === 'a' ? tower.a : tower.b, across = face.axis === 'a' ? tower.b : tower.a;
    if (Math.abs(Math.abs(across) - (Math.abs(face.fixed) + FORT.towerOut)) > .01 || Math.sign(across) !== Math.sign(face.fixed)) continue;
    spans.push([along - half, along + half]);
  }
  return spans.sort((p, q) => p[0] - q[0]);
}

/** Runs of curtain wall between the towers on a face, as [from, to] along it. Gate passages are left open. */
export function wallRuns(faceId) {
  const spans = towerSpans(faceId), runs = [];
  for (let i = 1; i < spans.length; i++) {
    const from = spans[i - 1][1], to = spans[i][0];
    if (to - from < .01) continue;
    const gate = SOLIS_GATES.find(g => g.face === faceId && g.along > from - .01 && g.along < to + .01);
    if (gate && to - from <= FORT.gateWidth + .01) continue;   // the gate passage itself
    runs.push([from, to]);
  }
  return runs;
}

/** The gate passage in the frame: a box from outside the towers to inside the wall. */
export function gatePassage(gateId) {
  const gate = SOLIS_GATES.find(g => g.id === gateId);
  const outer = facePoint(gate.face, gate.along, half + FORT.towerOut + 4), inner = facePoint(gate.face, gate.along, -(half - FORT.towerOut + 4));
  return freeze({ gate, outer: local(outer.a, outer.b), inner: local(inner.a, inner.b), width: FORT.gateWidth });
}

const box = (a0, a1, b0, b1, kind, extra = {}) => {
  const c = local((a0 + a1) / 2, (b0 + b1) / 2);
  return freeze({ x: c.x, z: c.z, hx: Math.abs(a1 - a0) / 2, hz: Math.abs(b1 - b0) / 2, kind, ...extra });
};

/** Colliders for the walls, towers, open gate leaves and the ditch. The two gate passages are the only way through. */
export function fortColliders() {
  const out = [], t = FORT.thickness / 2;
  for (const faceId of Object.keys(FACES)) {
    const face = FACES[faceId];
    for (const [from, to] of wallRuns(faceId)) out.push(face.axis === 'a'
      ? box(from, to, face.fixed - t, face.fixed + t, 'solis-wall') : box(face.fixed - t, face.fixed + t, from, to, 'solis-wall'));
  }
  for (const tower of SOLIS_TOWERS) out.push(box(tower.a - half, tower.a + half, tower.b - half, tower.b + half, 'solis-tower'));
  // The gate leaves stand open against the sides of each passage.
  for (const gate of SOLIS_GATES) for (const side of [-1, 1]) {
    const across = gate.along + side * (FORT.gateWidth / 2 - .12), p = facePoint(gate.face, across, -.2);
    out.push(FACES[gate.face].axis === 'a' ? box(p.a - .1, p.a + .1, p.b - 1.15, p.b + 1.15, 'solis-gate-leaf')
      : box(p.a - 1.15, p.a + 1.15, p.b - .1, p.b + .1, 'solis-gate-leaf'));
  }
  out.push(...ditchColliders());
  return out;
}

/** The ditch: a ring 8 m out from the wall line, broken only by the causeway before each gate. */
export function ditchRuns() {
  const runs = [], o = FORT.ditchOffset, w = FORT.ditchWidth / 2;
  for (const faceId of Object.keys(FACES)) {
    const face = FACES[faceId], reach = face.span + o + w;
    const gate = SOLIS_GATES.find(g => g.face === faceId);
    const pieces = gate ? [[-reach, gate.along - FORT.causeway / 2], [gate.along + FORT.causeway / 2, reach]] : [[-reach, reach]];
    // North and south runs own the corners; east and west stop at them.
    for (const [from, to] of pieces) runs.push({ face: faceId, from: face.axis === 'b' ? Math.max(from, -face.span - o + w) : from,
      to: face.axis === 'b' ? Math.min(to, face.span + o - w) : to, line: Math.sign(face.fixed) * (Math.abs(face.fixed) + o) });
  }
  return runs;
}
function ditchColliders() {
  const w = FORT.ditchWidth / 2;
  return ditchRuns().map(run => FACES[run.face].axis === 'a' ? box(run.from, run.to, run.line - w, run.line + w, 'solis-ditch')
    : box(run.line - w, run.line + w, run.from, run.to, 'solis-ditch'));
}

/** Stairs up to the wall walk, against the inner face: [face, from, to]. */
export const SOLIS_STAIRS = freeze([['north', -21, -14], ['east', -31, -24], ['south', 21, 28], ['west', 21, 28]].map(([face, from, to]) => freeze({ face, from, to })));
export function stairColliders() {
  const depth = 1.6, t = FORT.thickness / 2;
  return SOLIS_STAIRS.map(({ face: faceId, from, to }) => {
    const face = FACES[faceId], inner = face.fixed - Math.sign(face.fixed) * t, back = inner - Math.sign(face.fixed) * depth;
    return face.axis === 'a' ? box(from, to, Math.min(inner, back), Math.max(inner, back), 'solis-stair') : box(Math.min(inner, back), Math.max(inner, back), from, to, 'solis-stair');
  });
}

// ---------------------------------------------------------------------------
// Inside the walls
// ---------------------------------------------------------------------------
/**
 * The market square, where the day after the battle can be fought: a clear,
 * level rectangle running west from the main street to the quay gate. Retreat
 * is toward +a, back up the main street to the Gate of Sun Horses.
 */
export const SOLIS_SQUARE = freeze({ a: -20, b: -8, halfAlong: 23, halfAcross: 12, axis: 'x' });
/** The road outside the Gate of Sun Horses: retreat is toward +b, the gate. */
export const SOLIS_APPROACH = freeze({ a: 0, b: -77.5, halfAlong: 23, halfAcross: 12, axis: 'z' });

/**
 * The buildings. `a`/`b` centre, `w` along a, `d` along b, `h` to the eaves.
 * `layer` marks what each belongs to; `garden` hangs greenery from its roof.
 */
export const SOLIS_BUILDINGS = freeze([
  // The strip inside the north wall: the Empire's buildings flank the gate.
  { id: 'tax-house', name: 'The old tax house', a: -11, b: -31, w: 10, d: 8, h: 5, layer: 'empire', door: 'east' },
  { id: 'house-nw-1', a: -26, b: -31, w: 8.5, d: 7.5, h: 4.6 },
  { id: 'house-nw-2', a: -38.5, b: -30.5, w: 11, d: 8, h: 5.4, garden: true },
  { id: 'legion-barracks', name: 'The Legion barracks', a: 14, b: -31, w: 16, d: 7.5, h: 4.2, layer: 'empire', door: 'south' },
  { id: 'house-ne-1', a: 29.5, b: -31, w: 9, d: 8, h: 5 },
  { id: 'house-ne-2', a: 40.5, b: -30.5, w: 8, d: 9, h: 5.8, garden: true },
  // The upper town: the old kingdom's royal terrace.
  { id: 'house-e-1', a: 12, b: -17, w: 9, d: 7, h: 5 },
  { id: 'house-e-3', a: 41.5, b: -17, w: 7, d: 9, h: 6.2, garden: true },
  { id: 'house-e-5', a: 12, b: 16.5, w: 8, d: 6, h: 4.8 },
  { id: 'temple', name: 'The Temple of Sea and Sun', a: 16, b: 30, w: 16, d: 14, h: 7, layer: 'kingdom', kind: 'temple', door: 'north' },
  { id: 'guest-house', name: 'The temple guest house', a: 35, b: 30, w: 12, d: 12, h: 5.2, layer: 'kingdom' },
  // The lower town by the sea wall.
  { id: 'warehouse-1', name: 'Quay warehouse', a: -39.5, b: 14, w: 11, d: 10, h: 5.6, kind: 'warehouse' },
  { id: 'warehouse-2', name: 'Quay warehouse', a: -39.5, b: 30, w: 11, d: 13, h: 6.2, kind: 'warehouse' },
  { id: 'inn', name: 'The Bronze Mare', a: -23, b: 15, w: 12, d: 9, h: 6, door: 'north' },
  { id: 'counting-house', name: 'The counting house', a: -9.5, b: 14.5, w: 9, d: 9, h: 6.4, door: 'north' },
  { id: 'house-l-1', a: -25, b: 31, w: 10, d: 10, h: 5 },
  { id: 'house-l-2', a: -11, b: 31, w: 9, d: 9, h: 5.4, garden: true },
].map(entry => freeze({ layer: 'town', kind: 'house', ...entry })));

/**
 * The Court of Oaths: the kingdom's hall of oaths, where the Coalition's council
 * sits. Open to the west behind a colonnade, so the envoy can be found inside.
 */
export const COURT_OF_OATHS = freeze({
  id: 'court-of-oaths', name: 'The Court of Oaths', front: 21.2, back: 41, north: -9, south: 13, h: 8.5,
  columns: freeze([-7.5, -3.5, 7.5, 11.5]), door: freeze([-1, 5]), table: freeze({ a: 31, b: 2, halfA: 4, halfB: 1.2 }),
});
/** A walled court of orange trees in the upper town. */
export const ORANGE_COURT = freeze({ a: 29, b: -17.5, halfA: 6, halfB: 4.5, gap: freeze([-1.5, 1.5]), trees: freeze([[-3, -2], [3, -2], [-3, 2], [3, 2]]) });

/** Market stalls around the square's edges; a fountain and a cart likewise. */
export const SOLIS_STALLS = freeze([[-40, -23], [-32, -23], [-8, -23.5], [-36, 6.5], [-26, 6.5], [-12, 6.5]].map(([a, b], i) => freeze({ id: `stall-${i + 1}`, a, b })));
export const SOLIS_FOUNTAIN = freeze({ a: -19, b: -25.5, r: 1.7 });
export const SOLIS_CART = freeze({ a: -42, b: 6.8, yaw: .2 });
/** Bronze statues of the old kings on the plaza before the Court of Oaths. */
export const SOLIS_STATUES = freeze([freeze({ a: 9.5, b: -6.5 }), freeze({ a: 9.5, b: 10.5 })]);
/** The paymaster's table in the tax house door, where the Coalition pays its companies. */
export const PAYMASTER_TABLE = freeze({ a: -4.9, b: -30, halfA: .45, halfB: 1.1 });
/** A hitching rail outside the Gate of Sun Horses, clear of the road and the fighting ground. */
export const SOLIS_HITCH = freeze({ a: 17, b: -58, halfA: 3, halfB: .2 });
/** The imperial milestone beside the road, its eagle chiselled off. */
export const SOLIS_MILESTONE = freeze({ a: -15, b: -60 });

/** Streets inside the walls, as world paths with their width. */
export const SOLIS_STREETS = freeze([
  freeze({ id: 'main-street', width: 5, points: freeze([local(0, -34), local(0, -8), local(0, 21), local(0, 38)]) }),
  freeze({ id: 'quay-street', width: 4.4, points: freeze([local(-66, -8), local(-49, -8), local(-30, -8), local(-3, -8)]) }),
  freeze({ id: 'oath-steps', width: 4, points: freeze([local(3, 2), local(18, 2)]) }),
  freeze({ id: 'lower-lane', width: 3, points: freeze([local(-45, 22), local(-20, 22.5), local(-3, 22)]) }),
  freeze({ id: 'temple-lane', width: 3, points: freeze([local(3, 21.5), local(24, 21.5), local(45, 21.5)]) }),
  freeze({ id: 'north-lane', width: 3, points: freeze([local(3, -24), local(24, -24), local(45, -24)]) }),
  freeze({ id: 'camp-spur', width: 2.6, points: freeze([local(1, -64), local(30, -67), local(62, -63), local(100, -40), local(100, -22)]) }),
]);

// ---------------------------------------------------------------------------
// The Coalition's camp outside the walls
// ---------------------------------------------------------------------------
/**
 * East of the city on the downs, inside a light picket line with one gate to
 * the north. Tent lines are grouped by contingent under their own banners.
 */
export const COALITION_CAMP = freeze({
  name: 'The Coalition camp', minA: 70, maxA: 130, minB: -30, maxB: 30, gate: freeze([95, 105]),
  contingents: freeze([
    { id: 'izoli', name: 'Izoli Republic', banner: '#3f6fb0', emblem: '#e9e2c6', tents: [[76, -24], [81.5, -24], [87, -24], [92.5, -24], [76, -15], [81.5, -15], [87, -15], [92.5, -15]], flag: [97.2, -19.5] },
    { id: 'suval', name: 'The Suvali companies', banner: '#6a7f3e', emblem: '#e1c77b', tents: [[78, -4], [84, -4], [90, -4], [78, 5], [84, 5], [90, 5]], flag: [97.2, .5] },
    { id: 'ambroni-rebels', name: 'The Ambroni rebels', banner: '#7d3f58', emblem: '#e4d6b0', tents: [[78, 15], [84, 15], [90, 15], [78, 24], [84, 24], [90, 24]], flag: [97.2, 19.5] },
    { id: 'selemis', name: 'Selemis', banner: '#2f7f7a', emblem: '#f0e4c0', tents: [[110, -22], [116, -22], [122, -22]], flag: [103.2, -25.5] },
    { id: 'marosh', name: 'Marosh', banner: '#b0773a', emblem: '#3b2a1e', tents: [[110, -10], [116, -10], [122, -10]], flag: [103.2, -13.5] },
    { id: 'island-cities', name: 'The island cities', banner: '#3f9a6b', emblem: '#f3d27a', tents: [[110, 2], [116, 2], [122, 2]], flag: [103.2, -1.5] },
    { id: 'pyros', name: 'Pyros', banner: '#9a3a26', emblem: '#f1b24a', tents: [[112, 14]], flag: [106.5, 11] },
  ].map(entry => freeze({ ...entry, tents: freeze(entry.tents.map(([a, b]) => freeze({ a, b }))), flag: freeze({ a: entry.flag[0], b: entry.flag[1] }) }))),
  tent: freeze({ w: 3.8, d: 4.4 }),
  fire: freeze({ a: 116, b: 23 }),
});

/** Picket-line colliders round the camp, leaving its gate open. */
export function campPicketColliders() {
  const { minA, maxA, minB, maxB, gate } = COALITION_CAMP, t = .12;
  return [box(minA, gate[0], minB - t, minB + t, 'camp-picket'), box(gate[1], maxA, minB - t, minB + t, 'camp-picket'),
    box(minA, maxA, maxB - t, maxB + t, 'camp-picket'), box(minA - t, minA + t, minB, maxB, 'camp-picket'), box(maxA - t, maxA + t, minB, maxB, 'camp-picket')];
}
export function campTentColliders() {
  const { tent } = COALITION_CAMP;
  return COALITION_CAMP.contingents.flatMap(group => group.tents.map(spot => box(spot.a - tent.w / 2, spot.a + tent.w / 2, spot.b - tent.d / 2, spot.b + tent.d / 2, 'camp-tent')));
}

// ---------------------------------------------------------------------------
// The country along the road
// ---------------------------------------------------------------------------
const anchor = (x, z) => { const p = toWorld(x, z); return point(p.x, p.z); };

/** Where the road to Solis first enters West Suval, and a signpost beside it. */
export const WEST_SUVAL_BORDER = (() => {
  for (let i = 1; i < SOLIS_ROAD.length; i++) {
    const a = SOLIS_ROAD[i - 1], b = SOLIS_ROAD[i], length = Math.hypot(b.x - a.x, b.z - a.z);
    for (let s = 0; s <= length; s += 1) {
      const x = a.x + (b.x - a.x) * s / length, z = a.z + (b.z - a.z) * s / length;
      if (regionNameAt(x, z) !== 'West Suval') continue;
      const ux = (b.x - a.x) / length, uz = (b.z - a.z) / length;
      // The sign stands 4.5 m to the traveler's right, its board square to the road so both faces read.
      return freeze({ crossing: point(x, z), sign: point(x - uz * 4.5, z + ux * 4.5), yaw: Math.atan2(-ux, -uz) });
    }
  }
  return null;
})();

export const WEST_SUVAL_PLACES = freeze({
  fold: freeze({ id: 'shepherds-fold', name: 'The Shepherds’ Fold', ...anchor(-392, 433),
    description: 'A ring of dry-stone walls on the open down, a hut roofed with turf, and a thorn tree the flock has rubbed smooth. The shepherds have taken the sheep inland until the armies go.' }),
  watchtower: freeze({ id: 'old-watchtower', name: 'The Broken Watchtower', ...anchor(-330, 387),
    description: 'The stump of a round tower of the old kingdom, older than the Empire’s road. A sun-horse is still cut over the door. From its rubble the sea shows silver to the south.' }),
  well: freeze({ id: 'wayside-well', name: 'The Wayside Well', ...anchor(-338, 455),
    description: 'A well head and a stone trough under two olive trees, and an imperial milestone beside them with its eagle scraped away. Someone has chalked “Solis, a morning” on the stone.' }),
});

/** Every landmark West Suval adds, for the journal, the charts and discovery. */
export const WEST_SUVAL_LANDMARKS = freeze([
  freeze({ id: 'west-suval-border', name: 'Into West Suval', ...(WEST_SUVAL_BORDER?.crossing ?? SOLIS_ROAD[2]),
    description: 'The grass grows long and tawny past the last of the Moros, and low field walls of pale stone begin. The road runs south-east over the downs to Solis.' }),
  WEST_SUVAL_PLACES.fold, WEST_SUVAL_PLACES.watchtower, WEST_SUVAL_PLACES.well,
  freeze({ id: 'coalition-camp', name: 'The Coalition Camp', ...local(100, 0),
    description: 'Tent lines on the down east of the walls, grouped under the banners of Izol, Suval, the Ambroni rebels, Selemis, Marosh, the island cities and a single tent of Pyros.' }),
  freeze({ id: 'solis', name: 'Solis', ...local(0, 0), radius: 60,
    description: 'The walled city of the south-west coast, once a kingdom’s capital: red-tiled terraces above the harbour, the Gate of Sun Horses on the landward road, and the Court of Oaths, where the Coalition’s council sits.' }),
  freeze({ id: 'gate-of-sun-horses', name: 'The Gate of Sun Horses', ...local(0, -46),
    description: 'Two rearing bronze horses over the landward gate, their manes hammered into rays. Wilted flowers from the summer festival still lie at the foot of the towers.' }),
  freeze({ id: 'court-of-oaths', name: 'The Court of Oaths', ...local(31, 2),
    description: 'The kings of Solis swore their oaths in this hall. The Empire used it for its assizes. The Coalition’s council sits in it now, at a table carried in from the counting house.' }),
  freeze({ id: 'solis-quay', name: 'The Solis Quay', ...local(-66, -8),
    description: 'The quay under the sea wall, two harbour towers and the boom chain between them. The white cliffs stand above the harbour to the south.' }),
]);

/** Ground the regional scatter leaves alone. */
export const WEST_SUVAL_CLEARINGS = freeze([
  freeze({ ...local(0, 0), r: 82 }),                                         // the city, its ditch and the quay
  freeze({ ...local(0, -74), r: 26 }),                                        // the road outside the gate
  freeze({ ...local(100, 0), r: 46 }),                                        // the camp
  freeze({ ...local(40, -64), r: 26 }),                                       // the camp spur
  freeze({ x: WEST_SUVAL_PLACES.fold.x, z: WEST_SUVAL_PLACES.fold.z, r: 14 }),
  freeze({ x: WEST_SUVAL_PLACES.watchtower.x, z: WEST_SUVAL_PLACES.watchtower.z, r: 11 }),
  freeze({ x: WEST_SUVAL_PLACES.well.x, z: WEST_SUVAL_PLACES.well.z, r: 9 }),
]);

// ---------------------------------------------------------------------------
// Who stands where
// ---------------------------------------------------------------------------
const stand = (a, b, yaw) => freeze({ ...local(a, b), yaw });
const NORTH = Math.PI, SOUTH = 0, EAST = Math.PI / 2, WEST = -Math.PI / 2;

/** Stands in the city frame. Stakes (who holds them) are in src/solis-town.js. */
export const SOLIS_STANDS = freeze({
  // The Coalition's watch at the Gate of Sun Horses and the quay gate.
  'solis-gate-captain': stand(-6.5, -53.5, NORTH),
  'solis-gate-guard-west': stand(-3.9, -47, NORTH),
  'solis-gate-guard-east': stand(3.9, -47, NORTH),
  'solis-quay-guard': stand(-45.5, -12.8, WEST),
  // The contingents' captains, by their banners in the camp lane.
  'camp-captain-izoli': stand(98.8, -16.5, WEST),
  'camp-captain-suval': stand(98.8, 3, WEST),
  'camp-captain-rebels': stand(98.8, 22.5, WEST),
  'camp-captain-selemis': stand(101.4, -22.5, EAST),
  'camp-captain-marosh': stand(101.4, -10.5, EAST),
  'camp-captain-islands': stand(101.4, 1.5, EAST),
  'camp-pyrosi': stand(105.5, 15, EAST),
  // The townsfolk: nobody's garrison.
  'solis-merchant': stand(-32, -19.6, SOUTH),
  'solis-fountain-woman': stand(-16.2, -22.8, WEST),
  'solis-porter': stand(-64.5, -2.5, EAST),
  'solis-elder': stand(7, 6.5, EAST),
  'solis-temple-keeper': stand(16, 21, NORTH),
  'solis-innkeeper': stand(-19.5, 9.2, NORTH),
  // The Legion's occupation, out only while the Empire holds West Suval.
  'solis-legion-gate-west': stand(-3.9, -47, NORTH),
  'solis-legion-gate-east': stand(3.9, -47, NORTH),
  'solis-legion-square': stand(-5.6, -13, WEST),
  'solis-tribune-clerk': stand(28.5, -3.4, WEST),
  // The border chapter's people in Solis (src/border-chapter.js).
  'coalition-envoy': stand(25.8, 2, WEST),
  'envoy-guard-north': stand(19.6, -2.6, WEST),
  'envoy-guard-south': stand(19.6, 6.6, WEST),
  'solis-captain': stand(8, -54, NORTH),
});

/**
 * Who holds Solis on the ground right now: `control` is the occupation map
 * (`occupationControl`), `aftermath` the chapter after the battle's state. While
 * the Legion is still clearing the square, the Coalition's army has broken and
 * the Legion is not yet in: the city is 'routed', and neither garrison stands.
 */
export function solisHolder(control = {}, aftermath = null) {
  if (aftermath?.variant === 'solis-sweep' && !aftermath.cleared) return 'routed';
  const holder = control['West Suval'];
  return holder === 'empire' || holder === 'coalition' ? holder : 'routed';
}
