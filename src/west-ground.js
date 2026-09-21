/**
 * The shape of the four western regions: the water cut into them, the standing
 * water they hold, and the landforms their lore describes.
 *
 * This is terrain, not scenery. `world-terrain.js` calls `westGround` inside
 * `groundWithRiver`, so everything here is in the ground the traveler walks on,
 * in the collision height, in the terrain mesh and in everything placed on it.
 * `west-regions-scenery.js` then finds the water surfaces and draws them.
 *
 * Two rules, both of them the lore's and both of them ordinary physics:
 *
 *  - **Water goes downhill.** Every course is sampled along the lie of the land,
 *    smoothed over about fifty metres so the relief's hummocks are not the
 *    river's business, dropped by its own cut, and then forced to fall from
 *    source to mouth. Where a rise stands in the way the channel cuts through it
 *    rather than climbing over it, and the valley widens with the depth of cut.
 *  - **Standing water has one level.** A pan or a basin is a dish whose water
 *    sits at a single height, so its bed is cut to that height at the shore and
 *    below it in the middle. On a plain as flat as Vastos this is the only thing
 *    that makes a watering point visible at all.
 *
 * Pure: no three, no DOM. It imports `region-world.js` and `west-regions.js`,
 * never `world-terrain.js`, so the ground module can call into it without a
 * cycle — the same arrangement `amod-terraces.js` uses.
 */
import { terrainMix, relief } from './region-world.js';
import {
  WEST_RIVERS, WEST_POOLS, WEST_GROUND, VASTOS_SINTER, VASTOS_BRAID, VASTOS_RIVER,
  MENETH_RIDGES, menethRidgePhase, CARICAS_SHELF, WEST_BRAIDS, WEST_REGION_BOXES, inBox,
  courseDistance, coursePosition, courseHalfAt, courseCutAt,
} from './west-regions.js';

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const smooth = (a, b, x) => { const v = clamp((x - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); };
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * The natural ground of a point, before anything here shapes it. These four
 * regions are far enough inland that `regionBase` is its inland term alone and
 * no terrain pad reaches them, so this is the same number `world-terrain.js`
 * would produce — and computing it here keeps this module out of that one's
 * import cycle. `tests/vastos-world.test.js` holds the two to each other.
 */
export function westNaturalGround(x, z) {
  const mix = terrainMix(x, z);
  return mix.base + relief(x, z, mix.amp, mix.wave);
}

// ---------------------------------------------------------------------------
// The sulfur ground: the one place in the west where the land stands up, not down
// ---------------------------------------------------------------------------
/**
 * Sinter is deposited, so it builds. The apron stands proud of the turf at its
 * middle and lets go at its edge, which is why the grass stops in a line round it.
 */
function sinterRise(x, z) {
  const distance = Math.hypot(x - VASTOS_SINTER.x, z - VASTOS_SINTER.z);
  if (distance >= VASTOS_SINTER.radius) return 0;
  return VASTOS_SINTER.rise * (1 - smooth(VASTOS_SINTER.radius * .45, VASTOS_SINTER.radius, distance));
}

// ---------------------------------------------------------------------------
// Meneth's ridges: the whole of that region's landform
// ---------------------------------------------------------------------------
/**
 * How much of the ridge field a point gets. Two things take it away, and both
 * are the lore's.
 *
 * The first is the region itself: the ridges are Meneth and belong nowhere else,
 * so the field is weighed by how much of the point's own hex neighbourhood is
 * Meneth. That comes free with the height blend the whole world already uses, so
 * the ridges fade out at every border of the region by the same rule that fades
 * its ground colour and its base height, and no hand-drawn edge is needed.
 *
 * The second is the south: "Moving south from Meneth, the ridges lower and
 * widen, the valley floors broaden... There is no clear line that marks where
 * Meneth ends and the lake country begins." So the amplitude is gone before the
 * region is, and the last valley floor simply opens out and keeps going.
 */
export function menethAmplitude(x, z) {
  if (!inBox(WEST_REGION_BOXES.Meneth, x, z)) return 0;
  const south = 1 - smooth(MENETH_RIDGES.fadeFrom, MENETH_RIDGES.fadeTo, z);
  if (south <= 0) return 0;
  const weight = terrainMix(x, z).weights.Meneth ?? 0;
  // The threshold is set high on purpose. A point on the far side of Meneth's
  // eastern border still carries a quarter of Meneth in its blend, and a quarter
  // of seven metres of trough is enough to cut a metre out of the bank of Lake
  // Ela, which is two hexes away and has a level of its own to keep.
  return MENETH_RIDGES.amplitude * south * smooth(.28, .8, weight);
}

/** Metres above (at a crest) or below (in a trough) the mean line of the upland. */
export function menethRidge(x, z) {
  const amplitude = menethAmplitude(x, z);
  return amplitude ? amplitude * Math.cos(menethRidgePhase(x, z) * Math.PI * 2) : 0;
}

/**
 * Which of Meneth's three bands of growing a point is in. The lore divides the
 * economy by exactly this measure: "ridge faces that are forested on their upper
 * slopes and cleared to meadow on the valley floors", with "the nut orchards...
 * wild-chestnut and managed walnut groves on the lower ridge slopes" between
 * them. Where the ridges have faded out there is no slope left to be on, and the
 * broad open floor is all there is — which is the south, and is the point of it.
 */
export function menethBand(x, z) {
  const amplitude = menethAmplitude(x, z);
  if (amplitude < 1.6) return 'floor';
  const relative = menethRidge(x, z) / amplitude;
  if (relative < -.30) return 'floor';
  return relative < .25 ? 'grove' : 'wood';
}

// ---------------------------------------------------------------------------
// Caricas: the eastern upland shelf the Carica comes off
// ---------------------------------------------------------------------------
/**
 * "The Carica rises on the eastern upland shelf — a broad elevated plateau east
 * of the Lizeem's main drainage, rougher and less well-watered than the western
 * inner-branch country", and "the eastern edge of Caricas's territory rises again
 * toward the upland shelf".
 *
 * So the region is a ramp: high along its eastern side, falling west and south to
 * the Lizeem, which is the drain for all of it. That one tilt does most of the
 * work — it is why the Carica leaves the shelf fast and rocky and slows in the
 * corridor below, and why the western bank of the region is the low ground.
 * Weighed by the region's own blend, so it ends where Caricas does.
 */
export function caricasShelf(x, z) {
  if (!inBox(WEST_REGION_BOXES.Caricas, x, z)) return 0;
  const weight = terrainMix(x, z).weights.Caricas ?? 0;
  if (weight <= .12) return 0;
  return CARICAS_SHELF.rise * smooth(CARICAS_SHELF.from, CARICAS_SHELF.to, x) * smooth(.12, .7, weight);
}

/** The ground the water is measured against: the region's own relief, plus every landform on it. */
const baseBeforeWater = (x, z) => westNaturalGround(x, z) + sinterRise(x, z) + menethRidge(x, z) + caricasShelf(x, z);

// ---------------------------------------------------------------------------
// Standing water
// ---------------------------------------------------------------------------
const POOL_FADE = 7;
/**
 * Each pool's one water level. It is taken from the **lowest** ground on the ring
 * just outside the pool, not from the ground at its middle: water finds its own
 * level and then leaves by the lowest point of the rim, so a level set from the
 * middle floods out of the low side of any pool that is not on dead-flat ground.
 * Vastos's eastern basins sit on the fall toward the lake country and none of
 * them is on dead-flat ground. `rim` is how far the water then stands below that
 * lowest lip: a pan is a dish set into the plain, not a puddle on top of it.
 */
export const WEST_POOL_LEVELS = Object.freeze(new Map(WEST_POOLS.map(pool => {
  let lip = Infinity;
  for (let i = 0; i < 24; i++) {
    const angle = i / 24 * Math.PI * 2;
    lip = Math.min(lip, baseBeforeWater(pool.x + Math.sin(angle) * (pool.radius + 4), pool.z + Math.cos(angle) * (pool.radius + 4)));
  }
  return [pool.id, lip - (pool.rim ?? .3)];
})));

export const poolSurface = pool => WEST_POOL_LEVELS.get(pool.id);

/** A pool's bowl: the bed at the shore is the water's own level, and below it in the middle. */
function pooled(x, z, ground) {
  let height = ground;
  for (const pool of WEST_POOLS) {
    const distance = Math.hypot(x - pool.x, z - pool.z);
    if (distance >= pool.radius + POOL_FADE) continue;
    const surface = WEST_POOL_LEVELS.get(pool.id);
    const bowl = surface - pool.depth * (1 - smooth(0, pool.radius, distance));
    height = Math.min(height, lerp(bowl, height, smooth(pool.radius, pool.radius + POOL_FADE, distance)));
  }
  return height;
}

/** How deep the water stands over a point, or 0 on dry ground. */
export function westWaterDepth(x, z) {
  let depth = 0;
  for (const pool of WEST_POOLS) {
    const distance = Math.hypot(x - pool.x, z - pool.z);
    if (distance >= pool.radius) continue;
    depth = Math.max(depth, WEST_POOL_LEVELS.get(pool.id) - pooled(x, z, baseBeforeWater(x, z)));
  }
  for (const course of WEST_RIVERS) {
    if (courseDistance(course, x, z, course.maxHalf) >= course.maxHalf) continue;
    const sample = courseSample(course, x, z);
    if (courseDistance(course, x, z, sample.half) >= sample.half) continue;
    depth = Math.max(depth, sample.surface - westGroundAt(x, z));
  }
  return Math.max(0, depth);
}

// ---------------------------------------------------------------------------
// Running water
// ---------------------------------------------------------------------------
/**
 * Every course's water surface, sample by sample, from source to mouth. The
 * window average is the lie of the land over about fifty metres; the fall is
 * forced twice, with a smoothing pass between, so the profile is both even and
 * monotonic — a river that climbs, however slightly, is not a river.
 */
export const WEST_PROFILES = (() => {
  // Built down `WEST_RIVERS` in order rather than all at once, because a course
  // with `headOf` takes its first water level from the last sample of the course
  // it names, and can only read it once that one is done. Every course written
  // before Eer has `headOf: null` and comes out exactly as it did.
  const profiles = new Map();
  for (const course of WEST_RIVERS) {
    const last = Math.max(1, course.samples.length - 1);
    const along = index => index / last;
    const ground = course.samples.map(sample => baseBeforeWater(sample.x, sample.z));
    const surfaces = course.samples.map((_, index) => {
      const window = ground.slice(Math.max(0, index - 5), index + 6);
      return window.reduce((sum, value) => sum + value, 0) / window.length - courseCutAt(course, along(index));
    });
    // A course that takes over another one's water starts at that water's level.
    // `headOf` names the course to take it from; `head` gives the level outright.
    const handover = course.headOf ? profiles.get(course.headOf)?.at(-1).surface ?? null : course.head;
    if (handover !== null && handover !== undefined) surfaces[0] = Math.min(surfaces[0], handover);
    const fall = () => { for (let i = 1; i < surfaces.length; i++) surfaces[i] = Math.min(surfaces[i], surfaces[i - 1] - .01); };
    fall();
    for (let pass = 0; pass < 3; pass++) for (let i = 1; i < surfaces.length - 1; i++)
      surfaces[i] = (surfaces[i - 1] + surfaces[i] * 2 + surfaces[i + 1]) / 4;
    fall();
    // Every question about a course is answered off its nearest sample, so the
    // sample carries the width, the taper and the ford as well as the level. A
    // river that widens as it goes has to be asked where along itself you are.
    profiles.set(course.id, Object.freeze(course.samples.map((sample, index) => {
      const at = along(index);
      const length = course.samples.length * 5;
      return Object.freeze({
        x: sample.x, z: sample.z, nx: sample.nx, nz: sample.nz, index, along: at,
        surface: surfaces[index], half: courseHalfAt(course, at),
        strength: course.taper ? 1 - smooth(1 - course.taper / length, 1, at) : 1,
        ford: at <= course.fordUntil,
      });
    })));
  }
  return profiles;
})();

/** The nearest profile sample of a course. */
export function courseSample(course, x, z) {
  const profile = WEST_PROFILES.get(course.id);
  let best = profile[0], bestDistance = Infinity;
  for (const sample of profile) {
    const distance = (sample.x - x) ** 2 + (sample.z - z) ** 2;
    if (distance < bestDistance) { bestDistance = distance; best = sample; }
  }
  return best;
}
export const courseSurface = (course, x, z) => courseSample(course, x, z).surface;

/**
 * How far a point is from the nearest braid thread, and which braid it belongs
 * to. A thread leaves the main line and comes back to it, so its offset across
 * the river is a half-wave along the braided reach: nothing at either end of it,
 * widest in the middle. Two threads, one either side, with a bar between.
 */
export function braidThreadOffset(braid, along) {
  if (along < braid.from || along > braid.to) return null;
  return braid.offset * Math.sin((along - braid.from) / (braid.to - braid.from) * Math.PI);
}
function nearestBraid(x, z) {
  let best = null, distance = Infinity;
  for (const braid of WEST_BRAIDS) {
    const course = braid.course;
    if (courseDistance(course, x, z, braid.offset + braid.half + 10) > braid.offset + braid.half + 10) continue;
    const sample = courseSample(course, x, z);
    const offset = braidThreadOffset(braid, sample.along);
    if (offset === null) continue;
    const across = (x - sample.x) * sample.nx + (z - sample.z) * sample.nz;
    const d = Math.min(Math.abs(across - offset), Math.abs(across + offset));
    if (d < distance) { distance = d; best = { braid, sample, distance: d }; }
  }
  return best;
}
const braidDistance = (x, z) => nearestBraid(x, z)?.distance ?? Infinity;

/** A course's channel, cut into whatever ground it is handed. */
function channel(x, z, ground) {
  let height = ground;
  for (const course of WEST_RIVERS) {
    const reach = course.maxHalf + Math.max(course.cut, course.cutEnd) * 3 + 20;
    const distance = courseDistance(course, x, z, reach);
    if (distance >= reach) continue;
    const sample = courseSample(course, x, z);
    if (sample.strength <= 0) continue;
    const depth = clamp(ground - sample.surface, 0, 14) * sample.strength;
    const valley = sample.half + 4 + depth * 2.2;
    if (distance >= valley) continue;
    const bed = Math.min(sample.surface - course.bed, ground);
    height = Math.min(height, lerp(bed, ground, smooth(sample.half * .8, valley, distance)));
  }
  // A braid thread is shallower than the river it comes off and runs a little
  // high of it, which is how a channel gets abandoned and how a bar gets made.
  const near = nearestBraid(x, z);
  if (near && near.distance < near.braid.half + 6) {
    const surface = near.sample.surface + near.braid.lift;
    const bed = Math.min(surface - near.braid.cut, ground);
    height = Math.min(height, lerp(bed, ground, smooth(near.braid.half * .8, near.braid.half + 6, near.distance)));
  }
  return height;
}

// ---------------------------------------------------------------------------
// The whole of it
// ---------------------------------------------------------------------------
/**
 * Whether a point is any of the west's business at all. Everything this module
 * shapes already fades to nothing inside `WEST_GROUND` by its own rule — a ridge
 * by its region's blend, a channel by its distance from the water, an apron by
 * its radius — so the box needs no feather of its own and is a plain rejection.
 * Two comparisons here are what the rest of Azhora pays for the whole west.
 */
export function westShaping(x, z) {
  const g = WEST_GROUND;
  return x >= g.minX && x <= g.maxX && z >= g.minZ && z <= g.maxZ;
}

/**
 * The western ground: the sinter apron, then the standing water, then the
 * channels, in that order — sinter first because the warm pool sits on top of
 * it, channels last because a river cuts through whatever it finds.
 * `natural` is the region's own blended relief; everything here only reshapes it.
 */
export function westGround(x, z, natural) {
  if (!westShaping(x, z)) return natural;
  return channel(x, z, pooled(x, z, natural + sinterRise(x, z) + menethRidge(x, z) + caricasShelf(x, z)));
}

/** The western ground of a point on its own, for the scenery and the tests. */
export const westGroundAt = (x, z) => westGround(x, z, westNaturalGround(x, z));

/**
 * The water surface over a point, or null on dry ground. The scenery draws its
 * ribbons and discs from this, so the water it shows is the water the ground was
 * cut for and cannot float above its own banks.
 */
export function westWaterSurface(x, z) {
  for (const pool of WEST_POOLS) {
    if (Math.hypot(x - pool.x, z - pool.z) >= pool.radius) continue;
    return WEST_POOL_LEVELS.get(pool.id);
  }
  // A tapering course keeps a nominal level all the way to its last sample, but
  // its channel is given up before then, so past the taper there is no hollow for
  // that level to sit in. Water is only water where the ground is under it.
  const dry = (x, z, surface) => westGroundAt(x, z) > surface - .03;
  for (const course of WEST_RIVERS) {
    if (courseDistance(course, x, z, course.maxHalf) >= course.maxHalf) continue;
    const sample = courseSample(course, x, z);
    if (courseDistance(course, x, z, sample.half) >= sample.half) continue;
    return dry(x, z, sample.surface) ? null : sample.surface;
  }
  const near = nearestBraid(x, z);
  if (near && near.distance < near.braid.half) {
    const surface = near.sample.surface + near.braid.lift;
    return dry(x, z, surface) ? null : surface;
  }
  return null;
}

export { sinterRise, braidDistance };
