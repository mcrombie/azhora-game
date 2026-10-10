import {urubondGround,urubondTint} from '../../content/regions/urubond/urubond-world.js';
import { outerGround, outerTint } from '../../content/regions/outer-regions/outer-regions-world.js';
import { acorGround, acorTint } from '../../content/regions/acor/acor-world.js';
/**
 * The ground of the rebuilt world: where land ends, how high it stands, and
 * what colour it is. Pure functions over `region-world.js` plus the original
 * Tidehaven height field, so `world.js` can build terrain, roads and scatter
 * from one honest source and the charts can ask the same questions.
 */
import {
  VILLAGE, villageToWorld, worldToVillage, villageShoreLocalZ, landDistance, terrainMix, relief,
  REGION_TERRAIN, SEA_LEVEL, CALOSS, calossDistance, WORLD_BOUNDS, TERRAIN_PADS, MAIN_ROAD,
} from './region-world.js';
import { PUETH_RIVERS, TESSEN, TESSEN_BRIDGE, nearestPuethRiver } from '../../content/regions/pueth/pueth-world.js';
import { izolSeamInland } from '../../content/regions/izol/izol-ground.js';
import { westernDrySeamInland, westernDrySeamWeight } from '../../content/regions/western-regions/western-dry-seams.js';
import { elagosGround, elagosWaterDistance, ambronGroundTint } from '../../content/regions/ambron/elagos-world.js';
import { ambronFortressGround } from '../../content/regions/ambron/ambron-fortresses.js';
import { southSuvalGround } from '../../content/regions/south-suval/south-suval-world.js';
import { eastLotharnGround } from '../../content/regions/east-lotharn/east-lotharn-world.js';
import { varnGround } from '../../content/regions/varn/varn-world.js';
import { feradomGround, feradomSeam } from '../../content/regions/feradom/feradom-world.js';
import { ascarthGround, ascarthCliffTint } from '../../content/regions/ascarth/ascarth-world.js';
import { selemisGround, selemisTint, selemisShoreTint } from '../../content/regions/selemis/selemis-world.js';
import { telemoniaGround, telemoniaTint, telemoniaSeamBedrock } from '../../content/regions/telemonia/telemonia-world.js';
import { amodGround } from '../../content/regions/amod/amod-terraces.js';
import { westGround } from '../../content/regions/western-regions/west-ground.js';
import { galaGroundColour, inGalaBox } from '../../content/regions/gala/gala-world.js';
import { ovesTint } from '../../content/regions/oves/oves-world.js';
import { mithalaTint } from '../../content/regions/mithala/mithala-world.js';
import { southwestTint } from '../../content/regions/southwest/southwest-world.js';
import { wineryGround } from '../../content/regions/winery/winery.js';
import { suvalHighlandGround, suvalLandformRise } from '../../content/regions/suval-highlands/suval-highlands.js';
import { iscareGround } from '../../content/regions/iscare/iscare-world.js';
import { menoraGround } from '../../content/regions/minora-frontier/menora-city.js';
import { nylonGround } from '../../content/regions/nylon/nylon-city.js';
import { aevisGround } from '../../content/regions/aevis/aevis-city.js';
import { mithalaCityGround } from '../../content/regions/mithala/mithala-city.js';
import { eastPyrosGround, eastPyrosTint } from '../../content/regions/east-pyros/east-pyros-world.js';
import { netherDesertGround, netherDesertTint } from '../../content/regions/nether-desert/nether-desert-world.js';
import { legemumGround, legemumTint, legemumShoreTint } from '../../content/regions/legemum/legemum-world.js';
import { babonGround, babonTint, babonShoreTint } from '../../content/regions/babon/babon-world.js';
import { southCelderGround, southCelderTint, legacyCelderLand, celderOwns } from '../../content/regions/south-celder/south-celder-world.js';
import { northCelderGround, northCelderTint } from '../../content/regions/canerd/north-celder-world.js';
import { canerdGround, canerdTint } from '../../content/regions/canerd/canerd-world.js';
import { pyraGround, pyraTint } from '../../content/regions/pyra/pyra-world.js';
import { selamusGround, selamusTint } from '../../content/regions/selamus/selamus-city.js';
import { eastIzolGround, eastIzolTint, eastIzolShoreTint } from '../../content/regions/east-izol/east-izol-world.js';
import { alezhorGround, alezhorTint, alezhorShoreTint } from '../../content/regions/alezhor/alezhor-world.js';
import { southIbenalGround, southIbenalTint, southIbenalShoreTint } from '../../content/regions/south-ibenal/south-ibenal-world.js';
import { northIbenalGround, northIbenalTint, northIbenalShoreTint } from '../../content/regions/north-ibenal/north-ibenal-world.js';
import { henborthGround, henborthTint } from '../../content/regions/henborth/henborth-world.js';
import { caricasSettlementGround } from '../../content/regions/minora-frontier/caricas-settlement.js';
import { westOremindiGround, westOremindiTint } from '../../content/regions/west-oremindi/west-oremindi-world.js';
import { northernGround, northernTint } from '../../content/regions/northern-oremindi/northern-oremindi-world.js';
import { southOremindiGround, southOremindiTint } from '../../content/regions/south-oremindi/south-oremindi-world.js';
import { yunethreGround, yunethreTint } from '../../content/regions/minora-frontier/yunethre-world.js';
import { baldroHeight, baldroTint } from '../../content/regions/baldro/baldro-world.js';

let legacyWesternQuery = false;
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
export function regionBase(x, z) { return islandBase(x, z, true); }

/** Original island ground for saved scatter eligibility; drawing uses regionBase. */
export function legacyIzolGroundHeight(x, z) { return islandBase(x, z, false); }

function islandBase(x, z, repairIzol) {
  const mix = terrainMix(x, z), original = mix.base + relief(x, z, mix.amp, mix.wave);
  const island = repairIzol ? izolSeamInland(x, z, original) : original;
  const inland = legacyWesternQuery ? island : westernDrySeamInland(x, z, island);
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
    const plane = pad.heightAt ? pad.heightAt(x,z) : pad.level + (x - pad.x) * pad.slopeX + (z - pad.z) * pad.slopeZ;
    const shapeWeight = pad.weightAt ? pad.weightAt(x, z) : 1 - smooth(0, pad.feather, outside);
    const strength = shapeWeight * (pad.shore ? smooth(-.2, 1.7, natural) : 1);
    height = lerp(height, plane, strength);
  }
  return height;
}

/** The land without water features: the two fields, blended where they meet. */
export function bedrockHeight(x, z) {
  const local = worldToVillage(x, z);
  // The original village beach must give way to the new northern headland.
  // Keep the harbor and all village ground, blending only beyond its northeast
  // shore so the forest joins the mainland instead of becoming an offshore island.
  const headland = smooth(28, 60, local.z) * smooth(58, 98, local.x);
  const weight = villageWeight(local.x, local.z) * (1 - headland);
  if (weight >= 1) return villageBase(local.x, local.z);
  if (weight <= 0) return regionBase(x, z);
  return lerp(regionBase(x, z), villageBase(local.x, local.z), weight);
}

/**
 * The Caloss runs downhill to the Stills. The bedrock is sampled once along the
 * authored border line and the profile is then forced to fall toward the sea,
 * the way Pueth's rivers are: where a rise stands in the way the water does not
 * climb over it, the channel cuts down through it (`groundWithRiver`). Forcing
 * it the other way — raising every reach to the highest ground downstream — held
 * the whole middle Caloss flat at the height of a ridge near the mouth, up to
 * five metres above its own bed, and floated the bridge deck with it.
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
  // Water never flows uphill: walk down from the source and never let it rise.
  for (let i = 1; i < samples.length; i++) samples[i].surface = Math.min(samples[i].surface, samples[i - 1].surface);
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
 * Pueth's rivers (src/content/regions/pueth/pueth-world.js) cross hills the Caloss never meets, so
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
/** The Caloss channel alone: the bed cut into the bedrock, with no bridge in it. */
function calossChannel(x, z, bedrock) {
  const distance = calossDistance(x, z);
  if (distance >= CALOSS_BANK_DISTANCE) return bedrock;
  const bed = calossSurface(x, z) - 1.1;
  return lerp(Math.min(bed, bedrock), bedrock, smooth(6.6, CALOSS_BANK_DISTANCE, distance));
}

/**
 * The Caloss bridge. It lies along the road's real line across the water — the
 * chord between the road's vertices on either bank — and its deck is set to meet
 * the two banks, not measured up from the water: halfway between them, and never
 * lower than a clear metre over the river. The road then ramps to it on both
 * sides, as it does to the Tessen's, so the way over is one even line.
 */
export const CALOSS_BRIDGE = (() => {
  const crossing = CALOSS.crossing;
  let at = 0, bestDistance = Infinity;
  for (let i = 0; i < MAIN_ROAD.length; i++) {
    const distance = Math.hypot(MAIN_ROAD[i].x - crossing.x, MAIN_ROAD[i].z - crossing.z);
    if (distance < bestDistance) { bestDistance = distance; at = i; }
  }
  const before = MAIN_ROAD[Math.max(0, at - 1)], after = MAIN_ROAD[Math.min(MAIN_ROAD.length - 1, at + 1)];
  const heading = Math.atan2(after.x - before.x, after.z - before.z);
  const axis = Object.freeze({ x: Math.sin(heading), z: Math.cos(heading) });
  const side = Object.freeze({ x: Math.cos(heading), z: -Math.sin(heading) });
  const halfSpan = 13.5;
  const bankAt = sign => {
    const x = crossing.x + axis.x * sign * (halfSpan + 2), z = crossing.z + axis.z * sign * (halfSpan + 2);
    return calossChannel(x, z, bedrockHeight(x, z));
  };
  const water = calossSurface(crossing.x, crossing.z);
  const deckY = Math.max(water + 1.1, (bankAt(-1) + bankAt(1)) / 2);
  return Object.freeze({ crossing, heading, axis, side, halfSpan, deckY, water });
})();

function calossEmbankment(x, z, ground) {
  const b = CALOSS_BRIDGE, dx = x - b.crossing.x, dz = z - b.crossing.z;
  const along = Math.abs(dx * b.axis.x + dz * b.axis.z), across = Math.abs(dx * b.side.x + dz * b.side.z);
  if (along > b.halfSpan + 18 || across > 12 || along < b.halfSpan - 1.5) return ground;
  const weight = (1 - smooth(b.halfSpan + 1.5, b.halfSpan + 18, along)) * (1 - smooth(4, 12, across));
  return lerp(ground, b.deckY - .04, weight);
}

function bridgeEmbankment(x, z, ground) {
  const b = TESSEN_BRIDGE, dx = x - b.crossing.x, dz = z - b.crossing.z;
  const along = Math.abs(dx * b.axis.x + dz * b.axis.z), across = Math.abs(dx * b.side.x + dz * b.side.z);
  if (along > b.halfSpan + 22 || across > 14 || along < b.halfSpan - 1.5) return ground;
  const weight = (1 - smooth(b.halfSpan + 2, b.halfSpan + 22, along)) * (1 - smooth(4, 14, across));
  return lerp(ground, TESSEN_DECK_Y - .04, weight);
}

/**
 * Varn's own layer of the ground, and the same ground with that layer left out.
 *
 * The East Lotharn lays its loose stone by how high the ground stands (src/content/regions/east-lotharn/east-lotharn-scenery.js), and a
 * candidate it takes draws more of its seeded stream than one it refuses - so if it judged by the ground
 * Varn's jambs raised, every stone, tree and tuft it laid afterwards would move, across the whole range.
 * It is handed this instead: the ground as it lay before Varn was built on it. Nothing else reads it.
 */
let varnLeftOut = false;
const varnLayer = (x, z, ground) => (varnLeftOut ? ground : varnGround(x, z, ground));
export function groundBeforeVarn(x, z) {
  varnLeftOut = true;
  try { return groundWithRiver(x, z); } finally { varnLeftOut = false; }
}

/** Original ground for saved scatter eligibility in the three repaired dry bands. */
export function legacyWesternGroundHeight(x,z) {
  const previous=legacyWesternQuery;legacyWesternQuery=true;
  try{return groundWithRiver(x,z);}finally{legacyWesternQuery=previous;}
}

/** Ground with the river channels cut, before any deck or pier override. */
export function groundWithRiver(x, z) {
  return ambronFortressGround(x,z,selamusGround(x,z,groundBeforeSelamus(x,z)),elagosWaterDistance);
}
/** Natural island substrate for stable scatter and its terrain regression tests. */
export function groundBeforeSelamus(x,z) {
  const ground = henborthLayer(x,z,northIbenalLayer(x,z,southIbenalLayer(x,z,alezhorLayer(x,z,eastIzolLayer(x,z,celderLayer(x,z,babonGround(x,z,legemumGround(x,z,netherDesertGround(x,z,groundBeforeNether(x,z),groundBeforeNether)))))))));
  return pyraGround(x,z,celderLeftOut ? ground : canerdGround(x,z,ground));
}
// The two Celders lay their ground last of all (src/content/regions/south-celder/south-celder-world.js, src/content/regions/canerd/north-celder-world.js). Each writes only on
// its own hexes; `groundBeforeCelder` answers the ground without either, for measuring their border seams.
let celderLeftOut = false;
const celderLayer = (x, z, ground) => (celderLeftOut ? ground : northCelderGround(x, z, southCelderGround(x, z, ground, groundBeforeCelder), groundBeforeCelder));
export function groundBeforeCelder(x, z) {
  celderLeftOut = true;
  try { return groundWithRiver(x, z); } finally { celderLeftOut = false; }
}
// East Izol lays its ground outermost (src/content/regions/east-izol/east-izol-world.js), on its own hexes only; `groundBeforeEastIzol` answers the
// ground without it, for measuring its seam with West Izol.
let eastIzolLeftOut = false;
const eastIzolLayer = (x, z, ground) => (eastIzolLeftOut ? ground : eastIzolGround(x, z, ground, groundBeforeEastIzol));
export function groundBeforeEastIzol(x, z) {
  eastIzolLeftOut = true;
  try { return groundWithRiver(x, z); } finally { eastIzolLeftOut = false; }
}
/** Pre-review East Izol eligibility, retaining the first combined layout. */
export function legacyEastIzolGroundHeight(x, z) {
  return eastIzolGround(x, z, groundBeforeEastIzol(x, z), groundBeforeEastIzol, true);
}
/** Delivered Celder eligibility, with the current neighboring ground unchanged. Henborth was registered after the
 * Celders' composition was reviewed, and North Celder's border seam reads whatever ground is beside it, so the
 * eligibility is measured with Henborth's layer left out: the composition stays the one delivered, while the trees
 * still stand on the live ground (`legacyCelderWorldGround` in src/world.js). */
export function legacyCelderGroundHeight(x, z) {
  const outer = henborthLeftOut;
  henborthLeftOut = true;
  try {
    if (!celderOwns(x, z)) return groundWithRiver(x, z);
    return legacyCelderLand(x, z, groundBeforeCelder(x, z), groundBeforeCelder);
  } finally { henborthLeftOut = outer; }
}
// Alezhor lays its ground outermost (src/content/regions/alezhor/alezhor-world.js), on its own land only - its hexes and its own shore past
// them, and its two river mouths cut through the shared shore below the waterline; `groundBeforeAlezhor` answers the
// ground without it, for measuring its border seams and reading the forest's two courses where they reach it.
let alezhorLeftOut = false;
const alezhorLayer = (x, z, ground) => (alezhorLeftOut ? ground : alezhorGround(x, z, ground, groundBeforeAlezhor));
export function groundBeforeAlezhor(x, z) {
  alezhorLeftOut = true;
  try { return groundWithRiver(x, z); } finally { alezhorLeftOut = false; }
}
// South Ibenal lays its ground outermost (src/content/regions/south-ibenal/south-ibenal-world.js), on its own hexes only; `groundBeforeSouthIbenal`
// answers the ground without it, for measuring its border seams.
let southIbenalLeftOut = false;
const southIbenalLayer = (x, z, ground) => (southIbenalLeftOut ? ground : southIbenalGround(x, z, ground, groundBeforeSouthIbenal));
export function groundBeforeSouthIbenal(x, z) {
  southIbenalLeftOut = true;
  try { return groundWithRiver(x, z); } finally { southIbenalLeftOut = false; }
}
// North Ibenal lays its ground outermost (src/content/regions/north-ibenal/north-ibenal-world.js), on its own hexes only; `groundBeforeNorthIbenal`
// answers the ground without it, for measuring its border seams.
let northIbenalLeftOut = false;
/**
 * Read the ground with both Ibenals' layers left out: the ground Alezhor's composition was reviewed and approved on
 * (docs/region-briefs/south-ibenal-environment.md, item 6). The Ibenals keep `outland`'s profile, so with their layers
 * out their hexes are exactly the unbuilt ground Alezhor's border fringe was planted on.
 */
export function withoutIbenalLayers(read) {
  const south = southIbenalLeftOut, north = northIbenalLeftOut;
  southIbenalLeftOut = northIbenalLeftOut = true;
  try { return read(); } finally { southIbenalLeftOut = south; northIbenalLeftOut = north; }
}

const northIbenalLayer = (x, z, ground) => (northIbenalLeftOut ? ground : northIbenalGround(x, z, ground, groundBeforeNorthIbenal));
export function groundBeforeNorthIbenal(x, z) {
  northIbenalLeftOut = true;
  try { return groundWithRiver(x, z); } finally { northIbenalLeftOut = false; }
}
// Henborth lays its ground outermost (src/content/regions/henborth/henborth-world.js), on its own hexes only; `groundBeforeHenborth`
// answers the ground without it, for measuring its border seams. North Celder's seam reads Henborth's side live
// (`groundBeforeCelder` keeps this layer), so Henborth holds that line exactly as handed and North Celder meets it.
let henborthLeftOut = false;
const henborthLayer = (x, z, ground) => (henborthLeftOut ? ground : henborthGround(x, z, ground, groundBeforeHenborth));
export function groundBeforeHenborth(x, z) {
  henborthLeftOut = true;
  try { return groundWithRiver(x, z); } finally { henborthLeftOut = false; }
}
/**
 * Mithala's own layer of the ground, and the same ground with that layer left out (`groundBeforeMithalaCity`): the plain
 * as the Mithala's scenery and its channels were laid on, which is what the city's tests hold the river's cut to.
 */
let mithalaCityLeftOut = false;
const mithalaCityLayer = (x, z, ground) => (mithalaCityLeftOut ? ground : mithalaCityGround(x, z, ground, groundBeforeMithalaCity));
export function groundBeforeMithalaCity(x, z) {
  mithalaCityLeftOut = true;
  try { return groundWithRiver(x, z); } finally { mithalaCityLeftOut = false; }
}
/** Everything `groundWithRiver` lays but the Nether Desert and Legemum: the ground the Nether Desert's border seam is measured against. */
function groundBeforeNether(x,z){
  // Feradom owns its inland hills and castle yards; their base includes every other regional layer.
  const base=groundBeforeFrontier(x,z);
  // Mithala (src/content/regions/mithala/mithala-city.js) lays its district platforms, flood banks and ford approaches over the plain, after the
  // western ground has cut the channels into it. It writes nothing within two metres of the water and nothing outside its
  // own box, so the river's cut is the one it was and every seam measured from here is unchanged.
  return eastPyrosGround(x,z,mithalaCityLayer(x,z,aevisGround(x,z,nylonGround(x,z,menoraGround(x,z,caricasSettlementGround(x,z,base,groundBeforeFrontier))))),groundBeforeFrontier);
}
function groundBeforeFrontier(x,z){
  return feradomGround(x, z, groundBeforeFeradom(x, z), groundBeforeFeradom);
}

export function groundBeforeFeradom(x, z) {
  return telemoniaGround(x, z, groundBeforeTelemonia(x, z), groundBeforeTelemonia);
}
/** Everything `groundBeforeFeradom` lays but the Telemon highland: the ground its border seam is measured against. */
function groundBeforeTelemonia(x, z) {
  // Along Telemonia's borders with Legemum and East Pyros the hex blend is laid seamless and unchirped on both
  // sides first, so the three countries shape one smooth ground there and meet on it (src/content/regions/telemonia/telemonia-world.js).
  const bedrock = telemoniaSeamBedrock(x, z, bedrockHeight(x, z)), distance = calossDistance(x, z);
  let ground = distance < CALOSS_BANK_DISTANCE ? calossChannel(x, z, bedrock) : bedrock;
  ground = calossEmbankment(x, z, ground);
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
  // Elagos's lakes and the Ela-south are basins and reaches with their own
  // levels, not courses cut from the atlas: src/content/regions/ambron/elagos-world.js shapes the
  // ground round them, and answers everywhere else with the ground it was given.
  // Amod's east end is a made landscape: the Tarvel's valley, the terrace stair,
  // the Dromel's bench and the road's (src/content/regions/amod/amod-terraces.js). It reshapes the
  // relief it is handed and leaves everything outside its own ground untouched.
  // The four western regions do the same with their own water and landforms
  // (src/content/regions/western-regions/west-ground.js). South Suval cuts the Stillwater to its own level and lays
  // Imlamdris's terraces on the slope above it (src/content/regions/south-suval/south-suval-world.js). None of the four
  // boxes overlaps another, nor the winery's (src/content/regions/winery/winery.js), which is in its own hex at Port Calos.
  // The Ascarth Peninsula lays its plateau, its hills and its cliffs last, over everything else in its
  // own box; it touches nothing within a hundred metres of Gala or of the Lizeem (src/content/regions/ascarth/ascarth-world.js).
  // Lotharn's valleys are cut before western water; level the pass road and made places afterward.
  // Varn (src/content/regions/varn/varn-world.js) stands where that pass road came down into Amod's notch: its made floor, its
  // ditch, the two shoulders of rock it is built between and the bench of its road down to Amod's own are
  // laid straight after, so the floor meets the pass road's end at the road's own grade.
  // Keep the Suval climbing landscape and Iscare ground, then blend Feradom's inland seam.
  // Selemis lays its own ground last of all (src/content/regions/selemis/selemis-world.js). It is an island with no land
  // border, so it has no seam with anything: it writes only where `regionAt` answers `Selemi` and the
  // coast field is positive, and answers with the ground it was handed everywhere else.
  // And Telemonia outside even that (`groundBeforeFeradom`, above; src/content/regions/telemonia/telemonia-world.js): the Telemon
  // highland writes only on its own hexes, meets the ground across its border line - which is where the
  // Caelin and the Treloss run, cut by the Oves's and Gala's own channels before it - and rises off it.
  const regional = selemisGround(x, z, yunethreGround(x,z,southOremindiGround(x,z,ascarthGround(x, z, feradomSeam(x, z, iscareGround(x, z, suvalHighlandGround(x, z, southSuvalGround(x, z, wineryGround(x, z, varnLayer(x, z, eastLotharnGround(x, z, westGround(x, z, amodGround(x, z, elagosGround(x, z, ground)), legacyWesternQuery ? 0 : westernDrySeamWeight(x,z)))))))))))));
  return urubondGround(x,z,outerGround(x,z,acorGround(x,z,northernGround(x,z,westOremindiGround(x,z,baldroHeight(x,z,regional))))));
}

/** Terrain tint before scenery tints, matching the biome and the shore. */
/**
 * **The countries whose ground colour their region's swatch cannot carry, as a table walked in order.**
 *
 * This was an `if/else` chain that grew one branch per country, and it failed silently twice. Job 2 of
 * the southwest found that `southwestTint` had been computed and then dropped on the floor since the day
 * the block was built - so the Ganesh's swept floor and sediment pockets, the Ganesh Plain's green
 * depressions, the damp reach and both wet corners had all been drawn as the flat biome swatch, and
 * nobody could have noticed until a job arrived whose countries could only be told apart by their
 * colour. Job 3 met the same failure mode one level down, inside `southwestTint`, where an early
 * `return` would have thrown the Dinelv plateau's colours away on the three hundred metres its box
 * overlaps the Meroshe's. **Both reports asked for this chain to become a list of pairs walked in
 * order**; this is that, and it is the last job of the southwestern programme, so it is done here.
 *
 * The order is the chain's own and it matters: Gala first, because it matches on one swatch and one box;
 * then the Oves, the Mithala and the southwest, each of which answers `null` everywhere it has no
 * opinion. The first family with an opinion paints, exactly as the first true branch did, and a family
 * that has none costs one call. Nothing about the colour of any ground in Azhora changes.
 *
 * **Selemis is the fifth row, and the first added as a row** (2026-10-01): an island of eight hexes
 * whose one swatch cannot say which side of its own hills a point is on (`selemisTint`,
 * src/content/regions/selemis/selemis-world.js). It answers `null` off the island, so nothing else changes colour for it.
 *
 * **Telemonia is the sixth row** (2026-10-02): its rim, its terraces, its washes, the floors of its
 * passes and the Belketh are all one `hills` or `plains` swatch to the atlas (`telemoniaTint`,
 * src/content/regions/telemonia/telemonia-world.js), and it answers `null` off its own hexes.
 *
 * `tests/southwest-world.test.js` holds the guard the silent failures wanted: **every family in this
 * table must move the colour of the screen somewhere in its own country.** Adding a sixth is one row
 * here and one row there, and forgetting the second turns the test red with the family's own name in it.
 *
 * **And the level below is a table too, as of 2026-10-01**: `southwestTint` was still a chain of three
 * boxes with a branch per country nested inside each - which is the shape job 3 nearly lost the Dinelv
 * plateau's colours to - and is now `SOUTHWEST_TINTS`, thirteen rows walked in order, each naming the
 * country it speaks for. Its own guard holds two things the one here cannot: that every row paints
 * somewhere on its own country's hexes, and that every one of the thirteen countries comes out tinted.
 */
const GROUND_TINTS = Object.freeze([
  Object.freeze({ id: 'gala',
    tint: (x, z, ground) => (inGalaBox(x, z) && ground === REGION_TERRAIN.Gala.ground ? galaGroundColour(x, z) : null) }),
  Object.freeze({ id: 'oves', tint: ovesTint }),
  Object.freeze({ id: 'mithala', tint: mithalaTint }),
  Object.freeze({ id: 'southwest', tint: southwestTint }),
  Object.freeze({ id: 'selemis', tint: selemisTint }),
  Object.freeze({ id: 'telemonia', tint: telemoniaTint }),
  Object.freeze({id:'east-pyros',tint:eastPyrosTint}),
  Object.freeze({id:'nether-desert',tint:netherDesertTint}),
  Object.freeze({id:'legemum',tint:legemumTint}),
  Object.freeze({id:'babon',tint:babonTint}),
  Object.freeze({id:'south-celder',tint:southCelderTint}),
  Object.freeze({id:'north-celder',tint:(x,z,ground)=>canerdTint(x,z)??northCelderTint(x,z,ground)}),
  Object.freeze({id:'east-izol',tint:eastIzolTint}),
  Object.freeze({id:'alezhor',tint:alezhorTint}),
  Object.freeze({id:'south-ibenal',tint:southIbenalTint}),
  Object.freeze({id:'north-ibenal',tint:northIbenalTint}),
  Object.freeze({id:'henborth',tint:henborthTint}),
]);
/**
 * The families, in the order they are walked, for the guard. `tests/southwest-world.test.js` asserts this
 * list is exactly the six it knows about and that every one of them moves the colour of the ground
 * somewhere in its own country - so a sixth family added here turns the test red with its own id in the
 * message, and a family that quietly stops painting turns it red with the same.
 */
export const GROUND_TINT_FAMILIES = Object.freeze(GROUND_TINTS.map(family => family.id));

/**
 * **The shores that are not beaches, as a second table walked the same way.** Every shore in the world
 * is tinted as sand for its last fifteen metres, and a cliff is the one shore that is wrong on: the
 * Ascarth Peninsula's were the first, drawn by one line that named the peninsula, and Selemis's are the
 * second. Two countries is where a line becomes a list - the ground table above is the argument - so a
 * country whose shore is stone is a row here: its function answers `{ sand, rock, stone }` on its own
 * cliffs (how much of the sand tint to keep, how much of the face is bare stone, and what colour that
 * stone is; the peninsula's grey-brown where `stone` is left out) and `null` everywhere else. The first
 * row with an answer paints. `tests/selemis-world.test.js` holds the guard: every row must put stone on
 * its own country's shore somewhere, so a row that quietly stops painting says so with its own id.
 */
const SHORE_TINTS = Object.freeze([
  Object.freeze({ id: 'ascarth', tint: ascarthCliffTint }),
  Object.freeze({ id: 'selemis', tint: selemisShoreTint }),
  Object.freeze({ id: 'legemum', tint: legemumShoreTint }),
  Object.freeze({ id: 'babon', tint: babonShoreTint }),
  // East Izol's headland cliffs and shingle coves (src/content/regions/east-izol/east-izol-world.js); its two bays keep the world's sand.
  Object.freeze({ id: 'east-izol', tint: eastIzolShoreTint }),
  // Alezhor's southern cliffs and its gold estuary's gravel banks (src/content/regions/alezhor/alezhor-world.js); its strands keep the world's sand.
  Object.freeze({ id: 'alezhor', tint: alezhorShoreTint }),
  // The Ibenals' rocky points and North Ibenal's broken rocky shore (src/content/regions/south-ibenal/south-ibenal-world.js); their bays keep the world's sand.
  Object.freeze({ id: 'south-ibenal', tint: southIbenalShoreTint }),
  Object.freeze({ id: 'north-ibenal', tint: northIbenalShoreTint }),
]);
export const SHORE_TINT_FAMILIES = Object.freeze(SHORE_TINTS.map(family => family.id));
/** One row of the shore table asked on its own, for the guard. */
export const shoreTintOf = (id, x, z, distance) => SHORE_TINTS.find(family => family.id === id)?.tint(x, z, distance) ?? null;

// Tinting is synchronous; reuse scratch colours for each THREE namespace instead
// of allocating four or more colours at every vertex of the whole-world grid.
const tintScratch = new WeakMap();
export function groundTint(color, x, z, THREE) {
  const cityTint=ambronGroundTint(x,z)??selamusTint(x,z)??pyraTint(x,z);if(cityTint!==null){color.set(cityTint);return color;}
  const mix = terrainMix(x, z), distance = landDistance(x, z);
  let scratch = tintScratch.get(THREE);
  if (!scratch) {
    scratch = { target: new THREE.Color(), swatch: new THREE.Color(), sand: new THREE.Color('#cdb98a'), rock: new THREE.Color('#8a857a') };
    tintScratch.set(THREE, scratch);
  }
  const { target, swatch, sand, rock } = scratch;
  target.setRGB(0, 0, 0);
  let total = 0;
  // Colours by weight, so a cell whose atlas terrain refines its region's ground (Pueth's hills) is tinted as itself.
  // Gala's plains are the one ground the atlas's terrain field cannot colour: it calls the steppe and the
  // Mediterranean plain both `plains`, and its climate field draws the line between them. So there the
  // colour is the climate's (`galaGroundColour`, src/content/regions/gala/gala-world.js); everywhere else, nothing changes.
  // Ovesos and the Oves Desert have the same trouble in their own `plains`, for their own reasons:
  // in Ovesos the field calls the open steppe and the Sorten's bottomland the same word, and in the
  // desert it calls the soil pockets and the bare rock exposures the same word (`ovesTint`,
  // src/content/regions/oves/oves-world.js). Both answer null everywhere else, and everywhere else nothing changes.
  // The Mithala's four have it worst of all, and for the oldest reason there is: on a flood plain
  // what decides the colour of the ground is how far it is from a channel, because that decides how
  // often it is under water. The levee crest, the open plain and the backswamp between two channels
  // are three different colours inside two hundred metres, and the northern fen margin a fourth
  // (`mithalaTint`, src/content/regions/mithala/mithala-world.js).
  // And in the southwestern block four more, because there what decides the colour is how dry the
  // air is (a gradient across all four countries), whether the wind has swept the sediment off the
  // stone (which changes over forty metres in the Ganesh), whether a point is in one of the Ganesh
  // Plain's depressions, which is where all the grass on that plain is, and whether it is on the
  // damp reach, which is the only green in the desert (`southwestTint`, src/content/regions/southwest/southwest-world.js).
  for (const [ground, weight] of Object.entries(mix.grounds ?? {})) {
    if (!weight) continue;
    let painted = null;
    for (const family of GROUND_TINTS) { painted = family.tint(x, z, ground); if (painted != null) break; }
    swatch.set(painted ?? ground);
    target.r += swatch.r * weight; target.g += swatch.g * weight; target.b += swatch.b * weight; total += weight;
  }
  if (total) { target.r /= total; target.g /= total; target.b /= total; }
  color.copy(target);
  const suval = (mix.weights['West Suval'] ?? 0) + (mix.weights['South Suval'] ?? 0) + (mix.weights['East Suval'] ?? 0);
  if (suval > .01) {
    // Broad heath and grass patches read as hills from the air. Bare limestone
    // follows the steep, exposed shoulders instead of painting every peak alike.
    const patch = .5 + .5 * Math.sin(x * .021 + Math.sin(z * .012) * 1.6) * Math.cos(z * .018 - x * .009);
    swatch.set('#798768'); color.lerp(swatch, suval * (.08 + patch * .18));
    if (x > -625 && x < 65 && z > 555 && z < 1215) {
      const rise = suvalLandformRise(x, z);
      if (rise > 5) {
        const slope = Math.hypot(suvalLandformRise(x + 2, z) - suvalLandformRise(x - 2, z),
          suvalLandformRise(x, z + 2) - suvalLandformRise(x, z - 2)) / 4;
        const bare = smooth(5, 28, rise) * smooth(.4, 1.35, slope) * .58 + smooth(70, 125, rise) * .22;
        swatch.set('#989485'); color.lerp(swatch, bare * suval);
      }
    }
  }
  color.lerp(sand, 1 - smooth(1, 15, distance));
  // The Ascarth cliffs were the one shore in the world that is not a beach: grass to the edge and
  // bare stone down the face (src/content/regions/ascarth/ascarth-world.js). Selemis's are the second (`SHORE_TINTS` above).
  // Everywhere else `cliff` is null and this is the same sand it has always been.
  let cliff = null;
  for (const family of SHORE_TINTS) { cliff = family.tint(x, z, distance); if (cliff) break; }
  color.lerp(sand, (1 - smooth(1, 15, distance)) * (cliff ? cliff.sand : 1));
  if (cliff?.rock) color.lerp(cliff.stone ? swatch.set(cliff.stone) : rock, cliff.rock);
  const oremindi=southOremindiTint(x,z);if(oremindi!==null)color.set(oremindi);
  const yunethre=yunethreTint(x,z);if(yunethre!==null)color.set(yunethre);
  const westernOremindi=westOremindiTint(x,z);if(westernOremindi!==null)color.set(westernOremindi);
  const northern=northernTint(x,z);if(northern!==null)color.set(northern);
  const acor=acorTint(x,z);if(acor!==null)color.set(acor);
  const urubond=urubondTint(x,z);if(urubond!==null)color.set(urubond);
  const outer=outerTint(x,z);if(outer!==null)color.set(outer);
  const baldro=baldroTint(x,z);if(baldro!==null)color.set(baldro);
  return color;
}

export { VILLAGE, villageToWorld, worldToVillage, landDistance, WORLD_BOUNDS, SEA_LEVEL };
