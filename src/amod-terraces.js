/**
 * The shape of Amod's east end: the Tarvel's valley, the terrace steps that rib
 * every slope above it, the channel that holds grade along the contour, and the
 * bench the road is carried on.
 *
 * This is terrain, not scenery. `world-terrain.js` calls `amodGround` inside
 * `groundWithRiver`, so the terraces are in the ground the traveler walks on, in
 * the collision height, in the terrain mesh and in everything placed on it;
 * `amod-scenery.js` then finds the risers and stands a dry-stone rib on each one.
 *
 * Three ideas, all of them the lore's:
 *
 *  - **Terraces are a quantised hillside.** A terrace is a hillside converted into
 *    a stair of level treads, and a contour line is a line of constant height, so
 *    snapping the ground to steps of one rise produces ribs that follow the
 *    contours by construction — they curve where the hill curves, they crowd where
 *    it is steep and they open out where it is gentle, exactly as the real ones do.
 *  - **Water is the law, so the water is graded first.** The Tarvel is forced to
 *    fall to the sea before its channel is cut, and the Dromel — the high channel
 *    off its head — is carried on its own small cut-and-fill bench at a fall of
 *    about one in three hundred. A channel that climbs is not a channel.
 *  - **Amodian roads keep grade.** The road is laid on a bench whose profile is
 *    smoothed and then limited to one in nine, cut into the slope where the ground
 *    stands above it and filled where it falls away. A country whose central
 *    virtue is holding the right slope does not leave a one-in-four pitch on the
 *    only road into its eastern town.
 *
 * Pure: no three, no DOM. It imports only `region-world.js` and `amod-world.js`,
 * never `world-terrain.js`, so the ground module can call into it without a cycle.
 */
import { terrainMix, relief } from './region-world.js';
import { AMOD_ROAD, TARVEL, TARVEL_BRIDGE, DROMEL_CHANNEL, tarvelDistance } from './amod-world.js';

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const smooth = (a, b, x) => { const v = clamp((x - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); };
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * The ground Amod actually shapes, and the ground `world.js` samples finely
 * enough to show it. Outside this box plus `FEATHER` the region is ordinary
 * foothill relief, which is what the unbuilt west of Amod should be.
 */
export const AMOD_TERRACE_GROUND = Object.freeze({ minX: -908, maxX: -644, minZ: -644, maxZ: -420 });
const FEATHER = 34;

/** How much of a point belongs to the shaped ground: 1 inside, falling to 0 across the feather. */
export function amodShaping(x, z) {
  const g = AMOD_TERRACE_GROUND;
  const outside = Math.max(g.minX - x, x - g.maxX, g.minZ - z, z - g.maxZ, 0);
  return outside >= FEATHER ? 0 : 1 - smooth(0, FEATHER, outside);
}

/**
 * The natural ground of a point, before anything here shapes it. Amod is far
 * enough inland that `regionBase` is its inland term alone and no terrain pad
 * reaches it, so this is the same number `world-terrain.js` would produce — and
 * computing it here keeps this module out of that one's import cycle.
 */
function naturalBase(x, z) {
  const mix = terrainMix(x, z);
  return mix.base + relief(x, z, mix.amp, mix.wave);
}

// ---------------------------------------------------------------------------
// The Tarvel: a stream that is made to fall before it is allowed a bed
// ---------------------------------------------------------------------------
const SPACING = 5;

/** Evenly spaced samples along a polyline. */
function resample(points, spacing) {
  const out = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], length = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.max(1, Math.round(length / spacing));
    for (let step = out.length ? 1 : 0; step <= steps; step++) {
      const t = step / steps;
      out.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
    }
  }
  return out;
}

/** Distance from a point to a sampled line, and the index of the nearest sample. */
function nearestSample(samples, x, z) {
  let best = 0, bestDistance = Infinity;
  for (let i = 0; i < samples.length; i++) {
    const d = (samples[i].x - x) ** 2 + (samples[i].z - z) ** 2;
    if (d < bestDistance) { bestDistance = d; best = i; }
  }
  return { index: best, distance: Math.sqrt(bestDistance) };
}

/**
 * The Tarvel's water surface, source to mouth: the lie of the land over about
 * fifty metres, four metres down, and forced to fall. Four metres is what makes
 * it a valley rather than a wet line on a hillside — it is the reason Ostel can
 * stand on a shoulder above its own water, and the reason the road needs an arch.
 */
const TARVEL_CUT = 4;
export const TARVEL_PROFILE = (() => {
  const samples = resample(TARVEL.points, SPACING);
  const ground = samples.map(sample => naturalBase(sample.x, sample.z));
  const surfaces = samples.map((sample, index) => {
    const window = ground.slice(Math.max(0, index - 5), index + 6);
    return window.reduce((sum, value) => sum + value, 0) / window.length - TARVEL_CUT;
  });
  for (let i = 1; i < surfaces.length; i++) surfaces[i] = Math.min(surfaces[i], surfaces[i - 1] - .012 * SPACING);
  for (let pass = 0; pass < 3; pass++) for (let i = 1; i < surfaces.length - 1; i++)
    surfaces[i] = (surfaces[i - 1] + surfaces[i] * 2 + surfaces[i + 1]) / 4;
  for (let i = 1; i < surfaces.length; i++) surfaces[i] = Math.min(surfaces[i], surfaces[i - 1] - .008 * SPACING);
  return Object.freeze(samples.map((sample, index) => Object.freeze({ x: sample.x, z: sample.z, index, surface: surfaces[index] })));
})();

export function tarvelSurface(x, z) {
  return TARVEL_PROFILE[nearestSample(TARVEL_PROFILE, x, z).index].surface;
}

/** The deck of the Ostel bridge: the road's own height where it crosses. */
const VALLEY_REACH = 40;
function tarvelValley(x, z, ground) {
  const distance = tarvelDistance(x, z);
  if (distance > VALLEY_REACH) return ground;
  const surface = tarvelSurface(x, z);
  const depth = clamp(ground - surface, 0, 11), valley = TARVEL.halfWidth + 6 + depth * 2.3;
  if (distance > valley) return ground;
  return Math.min(ground, lerp(Math.min(surface - .8, ground), ground, smooth(TARVEL.halfWidth * .8, valley, distance)));
}

// ---------------------------------------------------------------------------
// The road's bench: smoothed, then held to one in nine
// ---------------------------------------------------------------------------
// One in ten and a half on the profile, which measures out at a little under one
// in nine on the ground once the bench is sampled at the corners of the road.
const MAX_GRADE = .095;
const ROAD_HALF = 3.4, ROAD_FEATHER = 13;

export const AMOD_ROAD_PROFILE = (() => {
  // The bench is read off the ground the valley has not been cut into yet, so the
  // road crosses the Tarvel on the lie of the land and the arch is left to span it.
  const samples = resample(AMOD_ROAD, SPACING);
  let level = samples.map(sample => naturalBase(sample.x, sample.z));
  for (let pass = 0; pass < 8; pass++) {
    const next = level.slice();
    for (let i = 1; i < level.length - 1; i++) next[i] = (level[i - 1] + level[i] * 2 + level[i + 1]) / 4;
    level = next;
  }
  // A slope limiter run forward and back leaves no pitch on the road steeper than one in nine.
  for (let pass = 0; pass < 6; pass++) {
    for (let i = 1; i < level.length; i++) level[i] = clamp(level[i], level[i - 1] - MAX_GRADE * SPACING, level[i - 1] + MAX_GRADE * SPACING);
    for (let i = level.length - 2; i >= 0; i--) level[i] = clamp(level[i], level[i + 1] - MAX_GRADE * SPACING, level[i + 1] + MAX_GRADE * SPACING);
  }
  return Object.freeze(samples.map((sample, index) => Object.freeze({ x: sample.x, z: sample.z, index, level: level[index] })));
})();

const ROAD_BOX = (() => {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const sample of AMOD_ROAD_PROFILE) {
    minX = Math.min(minX, sample.x); maxX = Math.max(maxX, sample.x);
    minZ = Math.min(minZ, sample.z); maxZ = Math.max(maxZ, sample.z);
  }
  return { minX, maxX, minZ, maxZ };
})();

/** The graded road level under a point, and how strongly the bench holds there. */
export function amodRoadBench(x, z) {
  if (x < ROAD_BOX.minX - ROAD_FEATHER || x > ROAD_BOX.maxX + ROAD_FEATHER
    || z < ROAD_BOX.minZ - ROAD_FEATHER || z > ROAD_BOX.maxZ + ROAD_FEATHER) return null;
  const near = nearestSample(AMOD_ROAD_PROFILE, x, z);
  if (near.distance > ROAD_FEATHER) return null;
  return { level: AMOD_ROAD_PROFILE[near.index].level, weight: 1 - smooth(ROAD_HALF, ROAD_FEATHER, near.distance), distance: near.distance };
}

/** The deck of the Ostel bridge: the road's own graded level where it crosses the water. */
export const TARVEL_DECK_Y = amodRoadBench(TARVEL_BRIDGE.crossing.x, TARVEL_BRIDGE.crossing.z).level;

/**
 * Under the arch the causeway is cut through again, so the Tarvel runs beneath the
 * bridge instead of being dammed by the bench that carries the road to it.
 */
function bridgeSpan(x, z, ground) {
  // `axis` runs along the road, so `along` measures the span the arch has to cover
  // and `across` runs up and down the water.
  const b = TARVEL_BRIDGE, dx = x - b.crossing.x, dz = z - b.crossing.z;
  const along = Math.abs(dx * b.axis.x + dz * b.axis.z), across = Math.abs(dx * b.side.x + dz * b.side.z);
  if (along > b.halfSpan + 1 || across > 10) return ground;
  const surface = tarvelSurface(x, z);
  return Math.min(ground, lerp(surface - .8, ground, smooth(TARVEL.halfWidth + 1.2, b.halfSpan + 1, along)));
}

// ---------------------------------------------------------------------------
// The Dromel: a channel that holds grade because someone maintains it
// ---------------------------------------------------------------------------
const CHANNEL_HALF = 1.1, CHANNEL_FEATHER = 6.5, CHANNEL_FALL = .0034;

/**
 * The channel's own line: taken off the Tarvel a little below its head, then
 * falling at about one in three hundred, cut where the slope stands above it and
 * banked where it falls away — but never by more than a couple of metres, because
 * a bank higher than that is a wall and belongs in a different argument.
 */
export const DROMEL_PROFILE = (() => {
  const samples = resample(DROMEL_CHANNEL, SPACING);
  // Taken off just under the Tarvel's own surface at the intake: a channel cannot
  // start above the water it is fed from, whatever the ground beside it is doing.
  const start = tarvelSurface(DROMEL_CHANNEL[0].x, DROMEL_CHANNEL[0].z) - .3;
  let level = samples.map((sample, index) => {
    const wanted = start - index * SPACING * CHANNEL_FALL;
    const natural = naturalBase(sample.x, sample.z);
    return clamp(wanted, natural - 4.5, natural + 3.6);
  });
  // The clamp can leave a step where the hillside bulges; smooth it out and then
  // insist again that the water goes downhill, which is the whole of the work.
  for (let pass = 0; pass < 8; pass++) {
    const next = level.slice();
    for (let i = 1; i < level.length - 1; i++) next[i] = (level[i - 1] + level[i] * 2 + level[i + 1]) / 4;
    level = next;
  }
  for (let i = 1; i < level.length; i++) level[i] = Math.min(level[i], level[i - 1] - CHANNEL_FALL * SPACING);
  return Object.freeze(samples.map((sample, index) => Object.freeze({ x: sample.x, z: sample.z, index, level: level[index] })));
})();

function dromelBench(x, z, ground) {
  if (x < -900 || x > -850 || z < -640 || z > -510) return ground;
  const near = nearestSample(DROMEL_PROFILE, x, z);
  if (near.distance > CHANNEL_FEATHER) return ground;
  const level = DROMEL_PROFILE[near.index].level;
  // The bank is level with the channel's lip; the bed is half a metre under it.
  const bank = lerp(ground, level, 1 - smooth(CHANNEL_HALF, CHANNEL_FEATHER, near.distance));
  return near.distance < CHANNEL_HALF ? Math.min(bank, level - .55) : bank;
}

// ---------------------------------------------------------------------------
// The terraces themselves
// ---------------------------------------------------------------------------
/** One terrace step. A wall this high is a wall you can see over and not climb absently. */
export const TERRACE_RISE = 1.45;
/** How much of each step is level tread; the rest is the face of the wall below it. */
const TREAD = .74;

/** A height, snapped to the stair. Pure, and the one function the ribs are found from. */
export function terraceHeight(height) {
  const band = height / TERRACE_RISE, level = Math.floor(band);
  return level * TERRACE_RISE + TERRACE_RISE * smooth(TREAD, 1, band - level);
}
/** Which terrace a height stands on. The ribs are drawn where this changes. */
export const terraceLevel = height => Math.floor(height / TERRACE_RISE);

/**
 * How strongly a point is terraced: inside the shaped ground, out of the stream
 * bed, and off the road. Ground nobody farms is not ribbed.
 */
function terracing(x, z) {
  const shaping = amodShaping(x, z);
  if (shaping <= 0) return 0;
  return shaping * smooth(3.5, 11, tarvelDistance(x, z));
}

/**
 * Amod's ground: the valley, the stair, the channel and the road, in that order.
 * `natural` is the region's own blended relief; everything here only reshapes it.
 */
export function amodGround(x, z, natural) {
  // The bench runs the whole road, including the two hundred and fifty metres of
  // it that are still in Pueth: the Amodians who keep this road keep all of it,
  // and its profile starts at the junction's own height, so the fork is level.
  const bench = amodRoadBench(x, z);
  const shaping = amodShaping(x, z);
  if (shaping <= 0 && !bench) return natural;
  let height = natural;
  if (shaping > 0) {
    height = tarvelValley(x, z, natural);
    const stair = terracing(x, z);
    if (stair > 0) height = lerp(height, terraceHeight(height), stair);
    height = dromelBench(x, z, height);
  }
  if (bench && bench.weight > 0) height = lerp(height, bench.level, bench.weight);
  return bridgeSpan(x, z, height);
}

/** The terraced ground of a point on its own, for the scenery that has to stand on it. */
export const amodTerracedGround = (x, z) => amodGround(x, z, naturalBase(x, z));
export { naturalBase as amodNaturalGround };
