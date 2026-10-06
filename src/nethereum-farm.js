/**
 * Haethom and the flood meadow: the places of Build 2 of the Farmlands of the Lizeem in Nethereum
 * (docs/lizeem-farmlands-design.md §5.2, §6.4 and the appendix, the design of 5 October 2026; built
 * under the user's "keep building everything" of 6 October 2026). +x is east and +z is south.
 *
 * Coordinates only, as `caricas-settlement.js` and `regional-farmland.js` are: no terrain, world,
 * farming-model or renderer dependency, so the arc, the farming rows and the tests can all import it
 * cheaply. Every `y` here is the built ground's (`groundWithRiver`), read when the place was laid out;
 * tests/nethereum-farm.test.js holds each one to the terrain it stands on.
 *
 * The shape of the place, from the lore and the design:
 *  - **Haethom**, the ridge hamlet, on the north-eastern rim where the Sacred Way from Minora runs out:
 *    four houses of timber, daub and reed round a common, doors to the common, all of them above the
 *    *haethoss*, the reliable line (`RELIABLE_LINE`).
 *  - **The levee and its hatch** on the Deep Basin's north-eastern rim. The levee is the bank of the
 *    north-east thread, the hill-stream that comes off the rim beside the hamlet: it keeps the stream in
 *    its course, and the hatch, a timber sluice in it, lets the stream out over the meadow below. That is
 *    a floated water meadow, and it is what "Rollo opens the hatches and drowns the meadow" asks for.
 *    The levee's head, its highest point, is where the Flood Council sits and the Recall is spoken.
 *  - **The meadow beds** just inside the levee, in two rows along it, and **the deep plots** on the
 *    basin floor farther in, below the line, by Liban's house on its hummock.
 *  - **The weir and the smoke-house** on the Neth below the ford, where the bank above the deep water
 *    has a terrace wide enough for two small buildings; Gwyddno's hut is the second of them.
 *  - **Boann's byre** on the north rim of the basin, above the line, over the post-flood pasture.
 */
const freeze = Object.freeze;
const p = (x, z) => freeze({ x, z });
const round = value => Math.round(value * 100) / 100;

export const NETHEREUM_COUNTRY = 'nethereum';
/** The *haethoss*: the height the spring water does not reach. Haethom and the byre stand above it; the
 * meadow, the deep plots and Liban's house stand below it. */
export const RELIABLE_LINE = 18;

export const HAETHOM = freeze({ id: 'haethom', name: 'Haethom', region: 'Nethereum', x: -2290, z: 335, y: 20.35,
  arrival: p(-2308, 299), common: freeze({ x: -2289.5, z: 336, width: 19, depth: 19 }),
  description: 'The ridge hamlet on the north-eastern rim, where the Sacred Way from Minora runs out: four houses of timber, daub and reed round a common, every one of them above the reliable line.' });

/** One building: `w` along its own x, `d` along its own z, its door in the middle of its +z face, turned
 * by `yaw` (a quarter turn at most, so `hx` and `hz` are its world footprint). */
const building = (id, name, owner, x, z, w, d, h, yaw, kind) => {
  const across = Math.abs(Math.sin(yaw)) > .5;
  return freeze({ id, name, owner, x, z, w, d, h, yaw, kind, hx: (across ? d : w) / 2, hz: (across ? w : d) / 2,
    door: p(round(x + Math.sin(yaw) * (d / 2 + .9)), round(z + Math.cos(yaw) * (d / 2 + .9))) });
};
const EAST = Math.PI / 2, WEST = -Math.PI / 2, NORTH = Math.PI, SOUTH = 0;
export const NETHEREUM_BUILDINGS = freeze([
  building('haethom-mererid-house', 'Mererid’s house', 'mererid', -2304, 336, 8, 6, 2.7, EAST, 'house'),
  building('haethom-seithenyn-house', 'Seithenyn’s house', 'seithenyn', -2289, 321.5, 7, 5.5, 2.5, SOUTH, 'house'),
  building('haethom-fintan-house', 'Fintan’s house', 'fintan', -2275.5, 335, 6, 5, 2.5, WEST, 'house'),
  building('haethom-airmid-house', 'Airmid’s house', 'airmid', -2290, 350.5, 6.5, 5, 2.5, NORTH, 'house'),
  building('haethom-byre', 'Boann’s byre', 'boann', -2416, 318, 9, 5.5, 2.3, SOUTH, 'byre'),
  building('liban-house', 'Liban’s house', 'liban', -2418.5, 394, 6, 5, 2.4, EAST, 'house'),
  building('gwyddno-hut', 'Gwyddno’s hut', 'gwyddno', -2278.5, 557, 5.5, 4.5, 2.4, EAST, 'hut'),
  building('gwyddno-smokehouse', 'The smoke-house', 'gwyddno', -2277.5, 541, 4.4, 4.4, 2.6, EAST, 'smokehouse'),
]);
export const HAETHOM_HOUSES = freeze(NETHEREUM_BUILDINGS.filter(b => b.id.startsWith('haethom-') && b.kind === 'house'));

/**
 * The levee: the south-eastern bank of the north-east thread, seven and a half metres off the stream's
 * centre line from where it comes off the rim to where it reaches the floor. A bank of turf `crest`
 * metres over the ground it stands on, its flat top `crestHalf` either side of the line and its faces
 * `side` metres wide, so it is walked up and along like ground. Its head is a round of crest
 * `headRadius` metres in radius, the Council's place; the hatch is a notch through it with the sluice in it.
 */
export const NETHEREUM_LEVEE = freeze({
  id: 'haethom-levee', name: 'The Haethom levee', crest: 1.1, crestHalf: 1.1, side: 2.5, headRadius: 2.4,
  points: freeze([[-2366.1, 319.8], [-2371.5, 327.3], [-2377.1, 334.6], [-2383, 341.7], [-2389.2, 348.3],
    [-2395.7, 354.4], [-2402.4, 359.9], [-2409.3, 365]].map(([x, z]) => p(x, z))),
  ground: freeze([19.35, 18.37, 17.61, 16.79, 15.98, 15.23, 14.61, 14.12]),
  notchHalf: .75, notchRamp: 1.1,
});
const LEVEE = NETHEREUM_LEVEE.points;
/** The levee's own frame at the hatch: along it toward the floor, and across it toward the meadow. */
const ALONG = (() => { const a = LEVEE[3], b = LEVEE[4], l = Math.hypot(b.x - a.x, b.z - a.z); return p((b.x - a.x) / l, (b.z - a.z) / l); })();
const INTO = p(Math.abs(ALONG.z), Math.abs(ALONG.x));
const HATCH = p(round((LEVEE[3].x + LEVEE[4].x) / 2), round((LEVEE[3].z + LEVEE[4].z) / 2));
/** The meadow beds lie along the levee's lower reach, in its direction, not the hatch's. */
const MEADOW_ALONG = (() => { const a = LEVEE[4], b = LEVEE[7], l = Math.hypot(b.x - a.x, b.z - a.z); return p((b.x - a.x) / l, (b.z - a.z) / l); })();
const MEADOW_INTO = p(Math.abs(MEADOW_ALONG.z), Math.abs(MEADOW_ALONG.x));
const meadowPoint = (along, into) => p(round(HATCH.x + MEADOW_ALONG.x * along + MEADOW_INTO.x * into),
  round(HATCH.z + MEADOW_ALONG.z * along + MEADOW_INTO.z * into));

/** Liban's hummock: a rise of turf on the basin floor with her house on its flat top. */
export const NETHEREUM_HUMMOCK = freeze({ id: 'liban-hummock', x: -2418.5, z: 394, y: 13.82, rise: 1.3, top: 5.4, foot: 9 });

/** The meadow: its eight beds in two rows of four along the levee, 4.6 m apart each way, so that no two
 * of the farming view's 2.8 by 3.1 m beds (with their stakes) touch. */
const MEADOW_FIRST = { along: 3, into: 7.2, step: 4.6 };
const meadowBed = n => meadowPoint(MEADOW_FIRST.along + MEADOW_FIRST.step * (n % 4), MEADOW_FIRST.into + MEADOW_FIRST.step * Math.floor(n / 4));
const MEADOW_Y = freeze([15.88, 15.52, 15.18, 14.86, 15.78, 15.45, 15.13, 14.84]);
const DEEP = freeze([[-2411, 381, 13.86], [-2406.8, 381, 14], [-2411, 385.3, 13.89], [-2406.8, 385.3, 14.04]]);
const row = (id, name, farmstead, at, y) => freeze({ id, name, country: 'nethereum', region: 'Nethereum', farmstead, farmId: farmstead,
  x: at.x, z: at.z, y, yaw: 0 });
/** The farming rows, in the shape `farming.registerRows` takes: `{id, country, farmstead, x, z, yaw}`. The deep
 * plots are farmstead `haethom-deep`, unlocked by the arc at Farming 16. */
export const NETHEREUM_FARM_ROWS = freeze([
  ...Array.from({ length: 8 }, (_, n) => row(`nethereum-meadow-${n + 1}`, `Haethom meadow, bed ${n + 1}`, 'haethom-meadow', meadowBed(n), MEADOW_Y[n])),
  ...DEEP.map(([x, z, y], n) => row(`nethereum-deep-${n + 1}`, `The deep plots, bed ${n + 1}`, 'haethom-deep', p(x, z), y)),
]);
export const NETHEREUM_MEADOW_ROWS = freeze(NETHEREUM_FARM_ROWS.filter(r => r.farmstead === 'haethom-meadow'));
export const NETHEREUM_DEEP_ROWS = freeze(NETHEREUM_FARM_ROWS.filter(r => r.farmstead === 'haethom-deep'));

/** The seed bench at the meadow's head, as the Caricas farms' are (`regional-farmland.js`), with its tub; and a
 * smaller one by the deep plots, which are forty-five metres down the path and are Liban's ground. */
export const NETHEREUM_SEED_BENCH = freeze({ id: 'haethom-meadow-seed-station', farmId: 'haethom-meadow', farmstead: 'haethom-meadow',
  country: 'nethereum', region: 'Nethereum', name: 'Haethom meadow seed bench', x: -2378.8, z: 350.6, y: 16.23,
  tub: p(-2376.8, 349.5) });
export const NETHEREUM_DEEP_SEED_BENCH = freeze({ id: 'haethom-deep-seed-station', farmId: 'haethom-deep', farmstead: 'haethom-deep',
  country: 'nethereum', region: 'Nethereum', name: 'Deep plots seed bench', x: -2403.4, z: 380.2, y: 14.13,
  tub: p(-2403.6, 382.6) });
export const NETHEREUM_SEED_STATIONS = freeze([NETHEREUM_SEED_BENCH, NETHEREUM_DEEP_SEED_BENCH]);

/** The flood meadow's ground: the beds and a margin round them, inside the levee's toe. The water the
 * hatch lets out lies over this (`createNethereumFarmScenery`'s `meadowWater`). */
export const NETHEREUM_MEADOW = freeze([meadowPoint(.6, 4.6), meadowPoint(19.8, 4.6), meadowPoint(19.8, 14.4), meadowPoint(.6, 14.4)]);

/** The weir: a V of stakes and wattle across the deep Neth just below the ford, its point downstream with
 * the trap in it, and the head of it on the bank top where the catch is hauled up. */
const WEIR_TRAP = p(-2250.5, 548.5);
export const NETHEREUM_WEIR = freeze({ id: 'gwyddno-weir', trap: WEIR_TRAP, surface: 12.43,
  arms: freeze([p(-2254.6, 555.2), p(-2246.1, 555.2)]), head: p(-2267, 549.5) });

export const NETHEREUM_SITES = freeze({
  haethom: p(HAETHOM.x, HAETHOM.z),
  common: p(HAETHOM.common.x, HAETHOM.common.z),
  /** The sluice in the levee. `approach` is where a person stands to work its lever, on the meadow side. */
  hatch: freeze({ id: 'haethom-hatch', name: 'The meadow hatch', x: HATCH.x, z: HATCH.z, y: 16.38,
    yaw: round(Math.atan2(ALONG.x, ALONG.z)), approach: p(round(HATCH.x + INTO.x * 2.7 + ALONG.x * 1.6), round(HATCH.z + INTO.z * 2.7 + ALONG.z * 1.6)) }),
  /** The levee's head: its highest point, where the Flood Council sits and Fintan speaks the Recall. */
  levee: freeze({ id: 'haethom-levee', name: 'The Haethom levee', x: LEVEE[0].x, z: LEVEE[0].z, y: round(NETHEREUM_LEVEE.ground[0] + NETHEREUM_LEVEE.crest) }),
  recall: freeze({ id: 'flood-recall', x: LEVEE[0].x, z: LEVEE[0].z }),
  meadow: meadowPoint(10.2, 9.5),
  deep: p(-2408.9, 383.2),
  seedBench: p(NETHEREUM_SEED_BENCH.x, NETHEREUM_SEED_BENCH.z),
  /** `weir` is the head on the bank, where `weir.take()` is worked; `trap` is out in the water. */
  weir: freeze({ id: 'gwyddno-weir', name: 'Gwyddno’s weir', x: NETHEREUM_WEIR.head.x, z: NETHEREUM_WEIR.head.z, y: 17.21,
    yaw: EAST, trap: WEIR_TRAP }),
  /** Where a person stands to smoke fish: before the smoke-house door. */
  smokehouse: freeze({ id: 'gwyddno-smokehouse', name: 'The smoke-house', x: -2277.5, z: 541, door: p(-2274.4, 541), y: 18.07 }),
  byre: freeze({ id: 'haethom-byre', name: 'Boann’s byre', x: -2416, z: 318 }),
  hummock: p(NETHEREUM_HUMMOCK.x, NETHEREUM_HUMMOCK.z),
});

/** Footpaths, drawn as worn earth and handed to navigation as the Caricas roads are. */
const path = (id, width, points) => freeze({ id, width, points: freeze(points.map(([x, z]) => p(x, z))) });
export const NETHEREUM_PATHS = freeze([
  path('haethom-way', 3, [[-2308, 299], [-2305, 309], [-2299.5, 319], [-2295, 328]]),
  path('haethom-levee-path', 2.4, [[-2295, 328], [-2312, 326.5], [-2332, 324.5], [-2350, 322.5], [-2361.4, 323.2],
    [-2366.8, 330.8], [-2372.6, 338.2], [-2377, 345], [-2377.4, 348.4]]),
  path('haethom-weir-path', 2.4, [[-2284, 343], [-2283.5, 358], [-2289, 385], [-2294, 420], [-2296, 455], [-2294, 490],
    [-2287, 515], [-2279, 530], [-2271.5, 538], [-2271.5, 549]]),
  path('haethom-byre-path', 2, [[-2350, 322.5], [-2356, 309], [-2366, 302], [-2381, 305], [-2398, 312], [-2409.5, 323.5]]),
  path('haethom-deep-path', 2, [[-2377.4, 351.5], [-2375.4, 359.5], [-2381.5, 366], [-2390, 371.5], [-2399, 378], [-2403.5, 389], [-2410.5, 393.6]]),
]);
/** Where the byre path steps over the north-east thread, on three flat stones. */
export const NETHEREUM_STEPPING_STONES = freeze([p(-2362.9, 304.1), p(-2364.1, 303.3), p(-2365.3, 302.4)]);

/** The seven of §6.4. Each stands more than a metre from any building and four from water, on ground a
 * body can stand on (tests/nethereum-farm.test.js). `yaw` faces what each of them is for. */
const stand = (x, z, yaw) => freeze({ x, z, yaw });
export const NETHEREUM_NPC_STANDS = freeze({
  mererid: stand(LEVEE[2].x, LEVEE[2].z, .69),
  seithenyn: stand(round(HATCH.x + INTO.x * 4.2), round(HATCH.z + INTO.z * 4.2), -2.45),
  gwyddno: stand(-2269.5, 553, EAST),
  boann: stand(-2413, 324.5, -.64),
  fintan: stand(-2365.4, 318.3, -.78),
  airmid: stand(-2287.5, 345.5, -2.93),
  liban: stand(-2414.2, 396, 2.76),
});

/** Chart names: the places somebody built. The country's natural ground keeps its own names
 * (`WEST_REGION_LANDMARKS`); these are the hamlet, its works and the house below the line. */
export const NETHEREUM_FARM_LANDMARKS = freeze([
  freeze({ id: 'haethom', name: 'Haethom', x: HAETHOM.x, z: HAETHOM.z, radius: 24, description: HAETHOM.description }),
  freeze({ id: 'haethom-levee', name: 'The Haethom levee', x: -2383, z: 341.7, radius: 30,
    description: 'A turf bank along the north-east thread where it comes down into the basin, with a timber hatch in it that lets the stream out over the meadow. The Flood Council sits on its head.' }),
  freeze({ id: 'gwyddno-weir', name: 'Gwyddno’s weir', x: NETHEREUM_WEIR.head.x, z: NETHEREUM_WEIR.head.z, radius: 22,
    description: 'A weir of stakes and wattle across the deep Neth below the ford, a trap at its point, and a smoke-house and a hut on the terrace above it. The same family has kept it for forty generations.' }),
  freeze({ id: 'liban-hummock', name: 'Liban’s hummock', x: NETHEREUM_HUMMOCK.x, z: NETHEREUM_HUMMOCK.z, radius: 16,
    description: 'One house below the reliable line, on a hummock in the basin floor, built there on purpose: the deep ground is where the good ground is.' }),
]);

// ---------------------------------------------------------------------------
// The ground the levee and the hummock add, for the world's height and the scatter
// ---------------------------------------------------------------------------
const clamp01 = v => Math.max(0, Math.min(1, v));
const smoothstep = v => { const t = clamp01(v); return t * t * (3 - 2 * t); };
const LEVEE_LENGTHS = (() => { const out = [0]; for (let i = 1; i < LEVEE.length; i++) out.push(out[i - 1] + Math.hypot(LEVEE[i].x - LEVEE[i - 1].x, LEVEE[i].z - LEVEE[i - 1].z)); return freeze(out); })();
const HATCH_ALONG = (LEVEE_LENGTHS[3] + LEVEE_LENGTHS[4]) / 2;
const reach = NETHEREUM_LEVEE.crestHalf + NETHEREUM_LEVEE.side;
const L_HEAD = NETHEREUM_LEVEE.headRadius + NETHEREUM_LEVEE.side + .5;
const LEVEE_BOX = freeze({ minX: Math.min(...LEVEE.map(q => q.x)) - reach - 3, maxX: Math.max(...LEVEE.map(q => q.x)) + reach + 3,
  minZ: Math.min(...LEVEE.map(q => q.z)) - reach - 3, maxZ: Math.max(...LEVEE.map(q => q.z)) + reach + 3 });
/** Distance to the levee's line and how far along it the nearest point is. */
export function nethereumLeveeFrame(x, z) {
  let best = Infinity, along = 0;
  for (let i = 1; i < LEVEE.length; i++) {
    const a = LEVEE[i - 1], b = LEVEE[i], dx = b.x - a.x, dz = b.z - a.z, q = dx * dx + dz * dz;
    const t = clamp01(((x - a.x) * dx + (z - a.z) * dz) / q), d = Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
    if (d < best) { best = d; along = LEVEE_LENGTHS[i - 1] + t * Math.sqrt(q); }
  }
  return { distance: best, along };
}
/** How far the levee stands over the ground at a point: `crest` on its top, nothing past its toe, and nothing
 * in the hatch's notch. The head is a round of crest, wider than the bank, for the Council. */
export function nethereumLeveeLift(x, z) {
  if (x < LEVEE_BOX.minX || x > LEVEE_BOX.maxX || z < LEVEE_BOX.minZ || z > LEVEE_BOX.maxZ) return 0;
  const L = NETHEREUM_LEVEE, { distance, along } = nethereumLeveeFrame(x, z);
  const head = Math.hypot(x - LEVEE[0].x, z - LEVEE[0].z) - (L.headRadius - L.crestHalf);
  const d = Math.min(distance, Math.max(0, head));
  if (d >= L.crestHalf + L.side) return 0;
  const notch = smoothstep((Math.abs(along - HATCH_ALONG) - L.notchHalf) / L.notchRamp);
  return L.crest * (1 - smoothstep((d - L.crestHalf) / L.side)) * notch;
}
export function nethereumHummockLift(x, z) {
  const H = NETHEREUM_HUMMOCK, r = Math.hypot(x - H.x, z - H.z);
  return r >= H.foot ? 0 : H.rise * (1 - smoothstep((r - H.top) / (H.foot - H.top)));
}
/**
 * The world's height over the levee and the hummock, or null anywhere else: the ground plus the bank, the
 * way Izolveth's quay and Minora's bridges answer `world.heightAt` (src/world.js) over the ground they
 * stand on. Built ground and not terrain, so nothing in the terrain, its rivers or its seams moves.
 */
export function nethereumFarmHeight(x, z, groundAt) {
  if (x < -2432 || x > -2356 || z < 310 || z > 408) return null;
  const lift = Math.max(nethereumLeveeLift(x, z), nethereumHummockLift(x, z));
  return lift > 1e-4 ? groundAt(x, z) + lift : null;
}

const segmentDistance = (x, z, a, b) => {
  const dx = b.x - a.x, dz = b.z - a.z, t = clamp01(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1));
  return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
};
const RESERVED_BOX = freeze({ minX: -2436, maxX: -2240, minZ: 290, maxZ: 570 });
/** Ground the regional scatter keeps off: buildings, beds, paths, the levee, the hummock and the weir's bank.
 * A test and not a list of discs, for the reason `westBareGround` gives. */
export function nethereumFarmReserved(x, z, margin = 0) {
  if (x < RESERVED_BOX.minX - margin || x > RESERVED_BOX.maxX + margin || z < RESERVED_BOX.minZ - margin || z > RESERVED_BOX.maxZ + margin) return false;
  for (const b of NETHEREUM_BUILDINGS) if (Math.abs(x - b.x) < b.hx + 2 + margin && Math.abs(z - b.z) < b.hz + 2 + margin) return true;
  if (Math.abs(x - HAETHOM.common.x) < HAETHOM.common.width / 2 + margin && Math.abs(z - HAETHOM.common.z) < HAETHOM.common.depth / 2 + margin) return true;
  for (const r of NETHEREUM_FARM_ROWS) if (Math.abs(x - r.x) < 2 + margin && Math.abs(z - r.z) < 2.2 + margin) return true;
  for (const bench of NETHEREUM_SEED_STATIONS) if (Math.hypot(x - bench.x, z - bench.z) < 3.4 + margin) return true;
  if (nethereumLeveeFrame(x, z).distance < reach + .5 + margin || Math.hypot(x - LEVEE[0].x, z - LEVEE[0].z) < L_HEAD + margin) return true;
  if (Math.hypot(x - NETHEREUM_HUMMOCK.x, z - NETHEREUM_HUMMOCK.z) < NETHEREUM_HUMMOCK.foot + margin) return true;
  if (Math.hypot(x - NETHEREUM_WEIR.head.x, z - NETHEREUM_WEIR.head.z) < 6 + margin) return true;
  return NETHEREUM_PATHS.some(q => q.points.some((b, i) => i > 0 && segmentDistance(x, z, q.points[i - 1], b) < q.width / 2 + 1 + margin));
}
