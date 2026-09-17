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

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export const smooth = (a, b, x) => { const v = clamp((x - a) / (b - a), 0, 1); return v * v * (3 - 2 * v); };
export const lerp = (a, b, t) => a + (b - a) * t;

/** How much of a world point belongs to the carried-over Tidehaven height field. */
export function villageWeight(lx, lz) {
  return (1 - smooth(84, 124, Math.abs(lx))) * (1 - smooth(-148, -196, lz));
}

/**
 * Tidehaven's original ground, in the village's own local metres. This is the
 * shipped Eastreena field with the old northern-district terms removed: beyond
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

/** Built ground (`TERRAIN_PADS`) replaces the relief it stands on and fades back into it at its edge. */
function padded(x, z, natural) {
  let height = natural;
  for (const pad of TERRAIN_PADS) {
    const outside = Math.max(Math.abs(x - pad.x) - pad.halfX, Math.abs(z - pad.z) - pad.halfZ, 0);
    if (outside >= pad.feather) continue;
    const plane = pad.level + (x - pad.x) * pad.slopeX + (z - pad.z) * pad.slopeZ;
    height = lerp(plane, height, smooth(0, pad.feather, outside));
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

/** Ground with the river channel cut, before any deck or pier override. */
export function groundWithRiver(x, z) {
  const bedrock = bedrockHeight(x, z), distance = calossDistance(x, z);
  if (distance >= CALOSS_BANK_DISTANCE) return bedrock;
  const bed = calossSurface(x, z) - 1.1;
  return lerp(Math.min(bed, bedrock), bedrock, smooth(6.6, CALOSS_BANK_DISTANCE, distance));
}

/** Terrain tint before scenery tints, matching the biome and the shore. */
export function groundTint(color, x, z, THREE) {
  const mix = terrainMix(x, z), distance = landDistance(x, z);
  const target = new THREE.Color(0, 0, 0);
  const swatch = new THREE.Color();
  let total = 0;
  for (const [name, weight] of Object.entries(mix.weights)) {
    if (!weight) continue;
    swatch.set(REGION_TERRAIN[name].ground);
    target.r += swatch.r * weight; target.g += swatch.g * weight; target.b += swatch.b * weight; total += weight;
  }
  if (total) { target.r /= total; target.g /= total; target.b /= total; }
  color.copy(target);
  color.lerp(new THREE.Color('#cdb98a'), 1 - smooth(1, 15, distance));
  return color;
}

export { VILLAGE, villageToWorld, worldToVillage, landDistance, WORLD_BOUNDS, SEA_LEVEL };
