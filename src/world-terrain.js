/**
 * The ground of the rebuilt world: where land ends, how high it stands, and
 * what colour it is. Pure functions over `region-world.js` plus the original
 * Tidehaven height field, so `world.js` can build terrain, roads and scatter
 * from one honest source and the charts can ask the same questions.
 */
import {
  VILLAGE, villageToWorld, worldToVillage, villageShoreLocalZ, landDistance, terrainMix, relief,
  REGION_TERRAIN, SEA_LEVEL, CALOSS, calossDistance, WORLD_BOUNDS, TERRAIN_PADS,
} from './region-world.js';
import { PUETH_RIVERS, TESSEN, TESSEN_BRIDGE, nearestPuethRiver } from './pueth-world.js';
import { amodGround } from './amod-terraces.js';

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export const smooth = (a, b, x) => { const v = clamp((x - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); };
export const lerp = (a, b, t) => a + (b - a) * t;

/**
 * How much of a world point belongs to the carried-over Tidehaven height field.
 *
 * It fades along the village's own three directions: sideways (`lx`), inland to
 * the north (`lz` negative), and — since the Pebbles were built out in the water
 * east of the pier — seaward as well. Without that last fade the village's field
 * ran east for ever inside a 248 m band, and its `outer` term raised sandbanks
 * out of the Stills a hundred metres offshore and over the north of Longstone.
 * The seaward fade begins past the pier's end (local z 48) and is complete at
 * local z 96, 76 m east of Tidehaven, where the village's field and the ordinary
 * sea floor already agree to within a tenth of a metre.
 */
export function villageWeight(lx, lz) {
  return (1 - smooth(84, 124, Math.abs(lx))) * (1 - smooth(-148, -196, lz)) * (1 - smooth(56, 96, lz));
}

/**
 * Tidehaven's original ground, in the village's own local metres. This is the
 * village's original field with the old northern-district terms removed: beyond
 * the settlement the authored hexes take over.
 */
export function villageBase(x, z) {
  const shoreline = villageShoreLocalZ(x);
  const inland = 1.35 + Math.sin(x * 0.07) * Math.sin(z * 0.055) * 0.72;
  const north = smooth(-17, -103, z);
  const hills = north * (2.9 + Math.sin(x * 0.045 + z * 0.05) * 1.7 + Math.cos(x * 0.085) * 0.85);
  const outer = smooth(53, 108, Math.abs(x)) * (5.2 + Math.sin(z * 0.055) * 3.8);
  // A gentle beach below the village gives the water a real shallow edge.
  return inland + hills + outer - smooth(shoreline - 4.5, shoreline + 13, z) * 7;
}

/** Hex-blended biome ground with its own beach and sea floor. */
export function regionBase(x, z) {
  const mix = terrainMix(x, z), inland = mix.base + relief(x, z, mix.amp, mix.wave);
  const distance = landDistance(x, z);
  const beach = lerp(-5.6, 1.4, smooth(-26, 6, distance));
  return padded(x, z, lerp(beach, inland, smooth(2, 40, distance)));
}

/**
 * Built ground (`TERRAIN_PADS`) replaces the relief it stands on and fades back
 * into it at its edge. A pad marked `shore` is made ground at the water: it
 * levels the land it stands on and lets go where the natural ground is already
 * below the tideline, so a quayside terrace cannot reclaim the bay in front of it.
 */
function padded(x, z, natural) {
  let height = natural;
  for (const pad of TERRAIN_PADS) {
    const outside = Math.max(Math.abs(x - pad.x) - pad.halfX, Math.abs(z - pad.z) - pad.halfZ, 0);
    if (outside >= pad.feather) continue;
    const plane = pad.level + (x - pad.x) * pad.slopeX + (z - pad.z) * pad.slopeZ;
    const strength = (1 - smooth(0, pad.feather, outside)) * (pad.shore ? smooth(-.2, 1.7, natural) : 1);
    height = lerp(height, plane, strength);
  }
  return height;
}

/** The land without water features: the two fields, blended where they meet. */
export function bedrockHeight(x, z) {
  const local = worldToVillage(x, z), weight = villageWeight(local.x, local.z);
  if (weight >= 1) return villageBase(local.x, local.z);
  if (weight <= 0) return regionBase(x, z);
  return lerp(regionBase(x, z), villageBase(local.x, local.z), weight);
}

/**
 * The Caloss runs downhill to the Stills. Sampling the bedrock once along the
 * authored border line, then forcing the profile to fall, keeps the bridge deck
 * level and the channel believable where the two banks differ in height.
 */
export const CALOSS_PROFILE = (() => {
  const samples = [];
  const points = CALOSS.points;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], length = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.max(1, Math.round(length / 6));
    for (let step = i === 1 ? 0 : 1; step <= steps; step++) {
      const t = step / steps, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      samples.push({ x, z, surface: regionBase(x, z) - 1.35 });
    }
  }
  // Water never flows uphill: walk back from the sea and keep the running minimum.
  for (let i = samples.length - 2; i >= 0; i--) samples[i].surface = Math.max(samples[i].surface, samples[i + 1].surface);
  for (let pass = 0; pass < 3; pass++) for (let i = 1; i < samples.length - 1; i++)
    samples[i].surface = (samples[i - 1].surface + samples[i].surface * 2 + samples[i + 1].surface) / 4;
  for (const sample of samples) sample.surface = Math.max(sample.surface, SEA_LEVEL + .05);
  return samples;
})();

export function calossSurface(x, z) {
  let best = CALOSS_PROFILE[0], bestDistance = Infinity;
  for (const sample of CALOSS_PROFILE) {
    const distance = Math.hypot(sample.x - x, sample.z - z);
    if (distance < bestDistance) { bestDistance = distance; best = sample; }
  }
  return best.surface;
}

export const CALOSS_BANK_DISTANCE = 13.5;

/**
 * Pueth's rivers (src/pueth-world.js) cross hills the Caloss never meets, so
 * their water is never raised above the ground: sampled along the course, the
 * surface may only fall toward the sea, and where a rise stands in its way the
 * river cuts down through it and its valley widens with the depth of the cut.
 */
export const PUETH_RIVER_PROFILES = new Map(PUETH_RIVERS.map(river => {
  const ground = river.samples.map(sample => regionBase(sample.x, sample.z));
  // The relief's small hummocks are not the river's business: it follows the lie of the land over about 50 m.
  const samples = river.samples.map((sample, index) => {
    const window = ground.slice(Math.max(0, index - 6), index + 7);
    return { x: sample.x, z: sample.z, index, surface: window.reduce((sum, value) => sum + value, 0) / window.length - 1.35 };
  });
  const fall = () => { for (let i = 1; i < samples.length; i++) samples[i].surface = Math.min(samples[i].surface, samples[i - 1].surface); };
  fall();
  for (let pass = 0; pass < 3; pass++) for (let i = 1; i < samples.length - 1; i++)
    samples[i].surface = (samples[i - 1].surface + samples[i].surface * 2 + samples[i + 1].surface) / 4;
  fall();
  for (const sample of samples) sample.surface = Math.max(sample.surface, SEA_LEVEL + .05);
  return [river.id, samples];
}));

/** The nearest profile sample of one of Pueth's rivers. */
export function puethRiverSample(river, x, z) {
  let best = null, bestDistance = Infinity;
  for (const sample of PUETH_RIVER_PROFILES.get(river.id)) {
    const distance = (sample.x - x) ** 2 + (sample.z - z) ** 2;
    if (distance < bestDistance) { bestDistance = distance; best = sample; }
  }
  return best;
}
export const puethRiverSurface = (river, x, z) => puethRiverSample(river, x, z).surface;
/** A small river starts narrow at its authored source and reaches its width over its first 60 m. */
export const puethRiverHalfWidth = (river, sample) => river.halfWidth * clamp(.45 + sample.index * 4 / 60 * .55, .45, 1);
const PUETH_VALLEY_REACH = 44;

/**
 * The Tessen bridge's deck, and the embankment that carries the road up to it:
 * on the banks the road rises or falls to the deck over 20 m, so the way over is
 * one even line and never a step down into the cut.
 */
export const TESSEN_DECK_Y = (() => {
  const { crossing } = TESSEN_BRIDGE;
  const surface = puethRiverSurface(TESSEN, crossing.x, crossing.z);
  return surface + 1.6;
})();
function bridgeEmbankment(x, z, ground) {
  const b = TESSEN_BRIDGE, dx = x - b.crossing.x, dz = z - b.crossing.z;
  const along = Math.abs(dx * b.axis.x + dz * b.axis.z), across = Math.abs(dx * b.side.x + dz * b.side.z);
  if (along > b.halfSpan + 22 || across > 14 || along < b.halfSpan - 1.5) return ground;
  const weight = (1 - smooth(b.halfSpan + 2, b.halfSpan + 22, along)) * (1 - smooth(4, 14, across));
  return lerp(ground, TESSEN_DECK_Y - .04, weight);
}

/** Ground with the river channels cut, before any deck or pier override. */
export function groundWithRiver(x, z) {
  const bedrock = bedrockHeight(x, z), distance = calossDistance(x, z);
  let ground = bedrock;
  if (distance < CALOSS_BANK_DISTANCE) {
    const bed = calossSurface(x, z) - 1.1;
    ground = lerp(Math.min(bed, bedrock), bedrock, smooth(6.6, CALOSS_BANK_DISTANCE, distance));
  }
  const near = nearestPuethRiver(x, z, PUETH_VALLEY_REACH);
  if (near.distance < PUETH_VALLEY_REACH) {
    const sample = puethRiverSample(near.river, x, z), half = puethRiverHalfWidth(near.river, sample);
    const depth = clamp(bedrock - sample.surface, 0, 12), valley = half + 4 + depth * 2.4;
    if (near.distance < valley) {
      const cut = lerp(Math.min(sample.surface - .9, bedrock), bedrock, smooth(half * .8, valley, near.distance));
      ground = Math.min(ground, cut);
    }
    if (near.river === TESSEN) ground = bridgeEmbankment(x, z, ground);
  }
  // Amod's east end is a made landscape: the Tarvel's valley, the terrace stair,
  // the Dromel's bench and the road's (src/amod-terraces.js). It reshapes the
  // relief it is handed and leaves everything outside its own ground untouched.
  return amodGround(x, z, ground);
}

/** Terrain tint before scenery tints, matching the biome and the shore. */
export function groundTint(color, x, z, THREE) {
  const mix = terrainMix(x, z), distance = landDistance(x, z);
  const target = new THREE.Color(0, 0, 0);
  const swatch = new THREE.Color();
  let total = 0;
  // Colours by weight, so a cell whose atlas terrain refines its region's ground (Pueth's hills) is tinted as itself.
  for (const [ground, weight] of Object.entries(mix.grounds ?? {})) {
    if (!weight) continue;
    swatch.set(ground);
    target.r += swatch.r * weight; target.g += swatch.g * weight; target.b += swatch.b * weight; total += weight;
  }
  if (total) { target.r /= total; target.g /= total; target.b /= total; }
  color.copy(target);
  color.lerp(new THREE.Color('#cdb98a'), 1 - smooth(1, 15, distance));
  return color;
}

export { VILLAGE, villageToWorld, worldToVillage, landDistance, WORLD_BOUNDS, SEA_LEVEL };
