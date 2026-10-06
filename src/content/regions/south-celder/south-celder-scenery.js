import * as THREE from 'three';
import { finishBuild } from '../../../world/loading/build-steps.js';
import { registerWorldTree, worldTreeId } from '../../../world/scenery/tree-registry.js';
import { REGION_CELLS } from '../../../world/terrain/region-world.js';
import { westWaterSurface } from '../western-regions/west-ground.js';
import { SOUTH_CELDER, SOUTH_CELDER_TRAILS, SOUTH_CELDER_LANDMARKS, southCelderOwns } from './south-celder-world.js';
// The plain's own design, read where it is offered and never required (`habitat`, `onMoundSite`, the head's bed).
import * as PLAIN from './south-celder-world.js';
import { NORTH_CELDER, NORTH_CELDER_TRAILS, NORTH_CELDER_LANDMARKS, northCelderScatterOwns } from '../canerd/north-celder-world.js';
import { southCelderWildlifeClear } from './south-celder-wildlife.js';
import { northCelderWildlifeClear, northCelderCandidateWildlifeClear } from '../canerd/north-celder-wildlife.js';
import { canerdClear } from '../canerd/canerd-world.js';

/**
 * **The Celder plain, both countries of it, by one hand.** The lore treats Celder as one plain and the atlas
 * cuts it in two, so South and North are drawn by this one builder with one set of rules, each from its own
 * seeded stream (`src/content/regions/canerd/north-celder-scenery.js` calls in here with its own country). Natural things only:
 * nothing here is anybody's - no field, fence, stud, quarry face or track - and the horses this plain is
 * famous for are bred stock and belong to the wildlife of nobody.
 *
 * **What decides what grows is read off the ground at build time, never written down.** The ground is
 * shaped by `src/{south,north}-celder-world.js`, and it is still being shaped while this is written, so not a
 * height or a habitat here is a number: each country's ground is sampled every four metres when it is built
 * (`readCelderGround`), and five things are taken from it -
 *
 *  - **how far from water** (`westWaterSurface`, the Mithala border streams and anything the ground lays into
 *    the western rivers): the stream bank, and back from it the river terraces, "among the finest grazing
 *    country on the continent", whose grass "has a particular mineral quality";
 *  - **how far in from the western border**, which is the Oremindi's foot: the foothills ("the transition zone
 *    between the plain and the Oremindi proper") and, below them, the fans where "the mountain streams spread
 *    their mineral silt across the plain margin";
 *  - **the swell** - the ground against its own surroundings over a hundred and sixty metres - which is the
 *    "low swells... not significant enough to be called hills" that give "horses purchase and cavalry
 *    commanders sight lines": the crests drain and carry the shorter, tawnier grass, the scrub and the stones;
 *    the swales between hold water and carry the tallest, greenest grass;
 *  - **the slope**, which is what makes a foothill a foothill wherever the ground agent puts one;
 *  - and **whose hex it is**, so that nothing is ever planted over the line.
 *
 * **`Dfa` is drawn by the species, because the game has no seasons.** A hot-summer continental plain at the
 * foot of a range: mixed prairie grass and forbs on the open ground (shorter than the Mithala's tallgrass,
 * because the swells drain and the dry west wind comes off the Oremindi in winter); willow, alder and white
 * poplar on the stream and nowhere else on the plain; oak, birch, hawthorn and juniper only in the foothills,
 * where the ground breaks and holds a little shade. **A Dfa plain is open grassland**, so a tree out on the
 * swells is a rarity - a lone hawthorn - and the plain reads from any swell as grass to the horizon with the
 * white Oremindi standing over it.
 *
 * Everything repeated is instanced: the grass in tiles small enough to cull, the rest in one batch per kind
 * per country. Trees are typed and harvestable (`registerWorldTree`). Nothing that blocks a walker stands on a
 * trail or a landmark the world modules export, or inside the range of anything that lives on the ground
 * (`*CelderWildlifeClear`), so no animal giving ground backs into a corner.
 */
const TAU = Math.PI * 2;
const COUNTRIES = Object.freeze({
  [SOUTH_CELDER]: Object.freeze({ name: SOUTH_CELDER, key: 'south-celder', seed: 6107331, owns: southCelderOwns }),
  [NORTH_CELDER]: Object.freeze({ name: NORTH_CELDER, key: 'north-celder', seed: 6209157, owns: northCelderScatterOwns }),
});
const smooth = (a, b, x) => { const v = Math.max(0, Math.min(1, (x - a) / (b - a))); return v * v * (3 - 2 * v); };
const segmentDistance = (x, z, a, b) => {
  const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
};

/** How far a point is from the nearest Celder trail's centre line (either country's), or Infinity. */
export function celderTrailDistance(x, z) {
  let best = Infinity;
  for (const trail of [...SOUTH_CELDER_TRAILS, ...NORTH_CELDER_TRAILS]) {
    const half = (trail.width ?? 3) / 2;
    for (let i = 1; i < trail.points.length; i++) best = Math.min(best, segmentDistance(x, z, trail.points[i - 1], trail.points[i]) - half);
  }
  return best;
}
/**
 * Where nothing that blocks a walker may stand: a trail and a metre and a half either side of it, five metres
 * round a landmark's point, and any ground animal's range. `margin` is the thing's own reach.
 */
export function celderSceneryClear(x, z, margin = 0) {
  if (canerdClear(x,z,margin)) return true;
  for (const p of [...SOUTH_CELDER_LANDMARKS, ...NORTH_CELDER_LANDMARKS]) if (Math.hypot(x - p.x, z - p.z) < 5 + margin) return true;
  if (celderTrailDistance(x, z) < 1.4 + margin) return true;
  return southCelderWildlifeClear(x, z, margin) || northCelderWildlifeClear(x, z, margin);
}
// Preserve the delivered random stream. Canerd and the relocated open-plain
// marker change what is emitted, never which seeded candidates are considered.
const candidateLandmarks = [...SOUTH_CELDER_LANDMARKS, ...NORTH_CELDER_LANDMARKS].map(p => p.id === 'north-celder-open-plain'
  ? { ...p, x: PLAIN.CELDER_MOUND_SITE.x + 20, z: PLAIN.CELDER_MOUND_SITE.z - 65 } : p);
function celderCandidateClear(x, z, margin = 0) {
  if (candidateLandmarks.some(p => Math.hypot(x - p.x, z - p.z) < 5 + margin)) return true;
  return celderTrailDistance(x, z) < 1.4 + margin || southCelderWildlifeClear(x, z, margin) || northCelderCandidateWildlifeClear(x, z, margin);
}
/** Water over the ground here, if any: the surface of a western river that the ground has not risen through. */
export function celderWaterAt(x, z, ground) {
  const surface = westWaterSurface(x, z);
  return surface !== null && surface > ground + .02 ? surface : null;
}

/**
 * The ground of one country, sampled every `STEP` metres at build time: height, whose it is, how far to water,
 * the swell (height against its 160-metre surroundings), the slope, and the western border row by row.
 * `sample(x, z)` answers the nearest node; `habitat(x, z)` turns that into one word.
 */
export function* readCelderGround(name, heightAt) {
  const country = COUNTRIES[name], cells = REGION_CELLS[name];
  const STEP = 4, PAD = 72, R = 20;
  const minX = Math.min(...cells.map(c => c.x)) - PAD, maxX = Math.max(...cells.map(c => c.x)) + PAD;
  const minZ = Math.min(...cells.map(c => c.z)) - PAD, maxZ = Math.max(...cells.map(c => c.z)) + PAD;
  const nx = Math.ceil((maxX - minX) / STEP) + 1, nz = Math.ceil((maxZ - minZ) / STEP) + 1, n = nx * nz;
  const height = new Float32Array(n), own = new Uint8Array(n), water = new Float32Array(n).fill(1e6);
  let work = 0;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    if (++work % 160 === 0) yield;
    const x = minX + i * STEP, z = minZ + j * STEP, k = j * nx + i, h = heightAt(x, z);
    height[k] = h; own[k] = country.owns(x, z) ? 1 : 0;
    if (celderWaterAt(x, z, h) !== null) water[k] = 0;
  }
  // Distance to water: a two-pass chamfer over the grid, in metres.
  const D = STEP, DD = STEP * Math.SQRT2;
  for (let j = 0; j < nz; j++) { if (++work % 8 === 0) yield; for (let i = 0; i < nx; i++) {
    const k = j * nx + i; let d = water[k];
    if (i) d = Math.min(d, water[k - 1] + D);
    if (j) { d = Math.min(d, water[k - nx] + D); if (i) d = Math.min(d, water[k - nx - 1] + DD); if (i < nx - 1) d = Math.min(d, water[k - nx + 1] + DD); }
    water[k] = d;
  } }
  for (let j = nz - 1; j >= 0; j--) { if (++work % 8 === 0) yield; for (let i = nx - 1; i >= 0; i--) {
    const k = j * nx + i; let d = water[k];
    if (i < nx - 1) d = Math.min(d, water[k + 1] + D);
    if (j < nz - 1) { d = Math.min(d, water[k + nx] + D); if (i < nx - 1) d = Math.min(d, water[k + nx + 1] + DD); if (i) d = Math.min(d, water[k + nx - 1] + DD); }
    water[k] = d;
  } }
  // The swell: height against the mean of the 41 x 41 nodes round it, from a summed-area table.
  const W = nx + 1, sum = new Float64Array(W * (nz + 1));
  for (let j = 0; j < nz; j++) { if (++work % 8 === 0) yield; let row = 0;
    for (let i = 0; i < nx; i++) { row += height[j * nx + i]; sum[(j + 1) * W + i + 1] = sum[j * W + i + 1] + row; } }
  const swell = new Float32Array(n), slope = new Float32Array(n);
  for (let j = 0; j < nz; j++) { if (++work % 8 === 0) yield; for (let i = 0; i < nx; i++) {
    const i0 = Math.max(0, i - R), i1 = Math.min(nx - 1, i + R), j0 = Math.max(0, j - R), j1 = Math.min(nz - 1, j + R);
    const total = sum[(j1 + 1) * W + i1 + 1] - sum[j0 * W + i1 + 1] - sum[(j1 + 1) * W + i0] + sum[j0 * W + i0];
    const k = j * nx + i;
    swell[k] = height[k] - total / ((i1 - i0 + 1) * (j1 - j0 + 1));
    const e = height[j * nx + Math.min(nx - 1, i + 1)], w = height[j * nx + Math.max(0, i - 1)];
    const s = height[Math.min(nz - 1, j + 1) * nx + i], north = height[Math.max(0, j - 1) * nx + i];
    slope[k] = Math.hypot((e - w) / (2 * STEP), (s - north) / (2 * STEP));
  } }
  // The western border, row by row: the first node of this country's own ground from the west.
  const west = new Float32Array(nz).fill(NaN);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) if (own[j * nx + i]) { west[j] = minX + i * STEP; break; }
  const node = (x, z) => {
    const i = Math.max(0, Math.min(nx - 1, Math.round((x - minX) / STEP))), j = Math.max(0, Math.min(nz - 1, Math.round((z - minZ) / STEP)));
    return j * nx + i;
  };
  const westOf = z => { const j = Math.max(0, Math.min(nz - 1, Math.round((z - minZ) / STEP))); return west[j]; };
  function sample(x, z) {
    const k = node(x, z), edge = westOf(z);
    return { height: height[k], own: own[k] === 1, water: water[k], swell: swell[k], slope: slope[k],
      inland: Number.isFinite(edge) ? x - edge : Infinity };
  }
  /**
   * One word for a point, in the order the ground decides it, and **from the ground's own design where the world
   * module offers it** (`celderStreamField`, `celderFanAt`, `celderSwell`, `CELDER_HEAD`: src/content/regions/south-celder/south-celder-world.js),
   * so that what grows agrees with the colour the ground is painted: the stream's bank (measured off the water
   * itself), the head's dry gravel bed, the floodplain the plain lays a metre above the water for fifty metres out,
   * the terrace tread behind its riser, the silt fans, the foothills (in from the western border, or anywhere
   * steep), the swell crests and the swales, and the open plain for the rest. Without the design, the same words
   * come off the sampled ground alone.
   */
  function habitat(x, z, here = sample(x, z)) {
    if (here.water <= 7) return 'bank';
    const stream = PLAIN.celderStreamField?.(x, z) ?? null;
    if (stream && PLAIN.CELDER_HEAD && stream.head < PLAIN.CELDER_HEAD.half + .8) return 'bed';
    const d = stream ? stream.distance : here.water;
    if (d < 50) return 'floodplain';
    if (d < 170 && here.slope < .08) return 'terrace';
    const fan = PLAIN.celderFanAt ? PLAIN.celderFanAt(x, z) : here.inland < 380 && here.slope < .05 ? fanLobe(x, z, here.inland) : 0;
    if (fan > .12) return 'fan';
    if (here.slope > .12 || here.inland < 190) return 'foothill';
    const swell = PLAIN.celderSwell ? PLAIN.celderSwell(x, z) / (PLAIN.CELDER_PLAIN?.swell ?? 3) * smooth(60, 160, d) : here.swell / 1.5;
    if (swell > .3) return 'crest';
    if (swell < -.3) return 'swale';
    return 'plain';
  }
  return { name, minX, maxX, minZ, maxZ, sample, habitat, step: STEP };
}
/**
 * The silt fans: lobes along the western margin, each a mountain stream's spread, strongest at the foothills'
 * foot and fading over three or four hundred metres onto the plain. Where along the margin a fan lies is not in
 * the atlas; these lobes put one every couple of hundred metres, out of step between the two countries.
 */
function fanLobe(x, z, inland) {
  const along = Math.cos((z + x * .18) / 230 * TAU) * .5 + .5;
  return along * smooth(380, 140, inland);
}

const geometries = {};
function bladeGeometry(blades, spread, width, base, step) {
  const positions = [], normals = [];
  for (let blade = 0; blade < blades; blade++) {
    const a = blade * (TAU / blades) * 1.07, lean = spread + blade % 3 * spread * .5;
    const bx = Math.cos(a) * spread, bz = Math.sin(a) * spread, h = base + (blade % 3) * step;
    const cx = Math.cos(a + Math.PI / 2) * width, cz = Math.sin(a + Math.PI / 2) * width;
    positions.push(bx - cx, 0, bz - cz, bx + cx, 0, bz + cz, bx + Math.cos(a) * lean, h, bz + Math.sin(a) * lean);
    for (let i = 0; i < 3; i++) normals.push(0, 1, 0);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.computeBoundingSphere();
  return geometry;
}
function shared() {
  if (geometries.ready) return geometries;
  Object.assign(geometries, {
    ready: true,
    // Mixed prairie: bunch grass to the knee or the hip, not the Mithala's tallgrass over the head.
    bunch: bladeGeometry(7, .11, .045, .46, .2),
    // The terrace grass: finer, denser, shorter - grazing turf.
    turf: bladeGeometry(9, .09, .028, .24, .09),
    sedge: bladeGeometry(7, .07, .022, .52, .24),
    lobe: new THREE.IcosahedronGeometry(1, 0),
    stone: new THREE.IcosahedronGeometry(1, 0),
    trunk: new THREE.CylinderGeometry(1, 1.16, 1, 7),
    crown: new THREE.IcosahedronGeometry(1, 1),
    blades: new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide }),
    solid: new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }),
  });
  return geometries;
}

/** The trees, by species: height range, trunk radius, crown spread and depth, lobe lift, and colours. */
const TREES = Object.freeze({
  'white-oak': { h: [6.5, 11], r: [.26, .42], spread: .34, deep: .17, lift: .66, bark: '#6d6352', leaf: '#5e7a45' },
  'silver-birch': { h: [7, 11.5], r: [.17, .26], spread: .17, deep: .22, lift: .7, bark: '#c2c2b2', leaf: '#86a061' },
  hawthorn: { h: [3, 5], r: [.14, .2], spread: .3, deep: .2, lift: .6, bark: '#5f5446', leaf: '#6a7d4c' },
  'common-juniper': { h: [1.8, 3.6], r: [.1, .15], spread: .14, deep: .34, lift: .5, bark: '#5a4c3e', leaf: '#3f5940' },
  'black-willow': { h: [6, 9.5], r: [.24, .36], spread: .3, deep: .2, lift: .7, bark: '#5d5444', leaf: '#7f9466' },
  'black-alder': { h: [8, 12], r: [.2, .3], spread: .2, deep: .24, lift: .7, bark: '#55524a', leaf: '#4c6a45' },
  'white-poplar': { h: [12, 17], r: [.26, .38], spread: .12, deep: .3, lift: .72, bark: '#b4b3a5', leaf: '#8ca277' },
});

export function createSouthCelderScenery(...args) { return finishBuild(createSouthCelderScenerySteps(...args)); }
/** South Celder's scenery: the southern half of the one plain. */
export function* createSouthCelderScenerySteps({ parent, heightAt, renderedGroundHeight = heightAt, candidateHeightAt = heightAt, colliders }) {
  return yield* createCelderScenerySteps(SOUTH_CELDER, { parent, heightAt, renderedGroundHeight, candidateHeightAt, colliders });
}

/** The builder both countries share. `name` is `SOUTH_CELDER` or `NORTH_CELDER`. */
export function* createCelderScenerySteps(name, { parent, heightAt, renderedGroundHeight = heightAt, candidateHeightAt = heightAt, colliders }) {
  const country = COUNTRIES[name], kit = shared();
  const root = new THREE.Group(); root.name = `${name} - grass, scrub, stone and the water's margin`; parent.add(root);
  const metrics = { cells: 0, grass: 0, terraceGrass: 0, fanGrass: 0, forbs: 0, scrub: 0, stones: 0, boulders: 0,
    outcrops: 0, gravel: 0, sedge: 0, trees: 0, oaks: 0, birches: 0, hawthorns: 0, junipers: 0, willows: 0, alders: 0, poplars: 0,
    batches: 0, instances: 0, colliders: 0 };
  let seed = country.seed, work = 0;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a, b) => a + random() * (b - a);
  const field = yield* readCelderGround(name, candidateHeightAt);
  const dry = (x, z) => celderWaterAt(x, z, candidateHeightAt(x, z)) === null;
  const plantable = (x, z) => country.owns(x, z) && dry(x, z);
  /** For a clump whose lobes stand off its centre: its own ground and dry for `r` metres round. */
  const roomy = (x, z, r) => plantable(x, z) && [[r, 0], [-r, 0], [0, r], [0, -r]].every(([dx, dz]) => plantable(x + dx, z + dz));
  /** Where Canerd's mound would stand: the ground is kept open and level for it (src/content/regions/south-celder/south-celder-world.js), so grass
   * grows there and nothing else - no scrub, stone or tree to stand where a made thing will one day. */
  const onMoundSite = (x, z) => !!PLAIN.CELDER_MOUND_SITE && Math.hypot(x - PLAIN.CELDER_MOUND_SITE.x, z - PLAIN.CELDER_MOUND_SITE.z) < PLAIN.CELDER_MOUND_SITE.radius;
  const TILE = 160, tiles = new Map(), tileOf = (x, z) => `${Math.floor((x - field.minX) / TILE)},${Math.floor((z - field.minZ) / TILE)}`;
  const tufts = (kind, x, z) => {
    const key = `${kind}|${tileOf(x, z)}`;
    if (!tiles.has(key)) tiles.set(key, { kind, items: [] });
    return tiles.get(key).items;
  };
  const forbs = [], scrub = [], stones = [], gravel = [], sedge = [], trees = [];
  const spaced = (list, x, z, gap) => !list.some(t => Math.abs(t.x - x) < gap && Math.abs(t.z - z) < gap && Math.hypot(t.x - x, t.z - z) < gap);

  // -------------------------------------------------------------------------
  // The open ground, hex by hex
  // -------------------------------------------------------------------------
  const cells = [...REGION_CELLS[name]].sort((a, b) => a.z - b.z || a.x - b.x);
  for (const cell of cells) {
    yield; metrics.cells++;
    const grassland = cell.terrain === 'grassland';   // the atlas's eastern rows in North Celder: a shade richer
    const point = () => ({ x: cell.x + range(-50, 50), z: cell.z + range(-58, 58) });
    // **Grass, a great deal of it**: an open plain at the west's usual density reads as bare ground from a
    // horse's back (the Gala and Mithala lesson). On a trail's own width it does not grow, so the trail reads.
    for (let i = 0; i < 330; i++) {
      if (++work % 48 === 0) yield;
      const { x, z } = point();
      if (!plantable(x, z) || celderTrailDistance(x, z) < 0) continue;
      const here = field.sample(x, z), habitat = field.habitat(x, z, here);
      const keep = { bank: .55, bed: 0, floodplain: .95, terrace: .95, foothill: .62, fan: .92, crest: .8, swale: .95, plain: .88 }[habitat];
      if (random() > keep) continue;
      const swell = Math.max(-1, Math.min(1, here.swell / 1.5));
      if (habitat === 'terrace' || habitat === 'floodplain' || habitat === 'bank') {
        tufts('turf', x, z).push({ x, z, s: range(.85, 1.35), rot: random() * TAU, habitat, swell, grassland });
        metrics.terraceGrass++;
      } else {
        const s = range(.75, 1.3) * (habitat === 'swale' ? 1.25 : habitat === 'crest' ? .82 : habitat === 'foothill' ? .78 : 1) * (grassland ? 1.08 : 1);
        tufts('bunch', x, z).push({ x, z, s, rot: random() * TAU, habitat, swell, grassland, fan: habitat === 'fan' });
        if (habitat === 'fan') metrics.fanGrass++; else metrics.grass++;
      }
    }
    // **Prairie forbs** through the grass, thickest on the fans and the crests; on the fans, the blue of lupin
    // on mineral ground among the yellow composites. Nobody walks round a flower, so none carries a collider.
    for (let i = 0; i < 70; i++) {
      if (++work % 48 === 0) yield;
      const { x, z } = point();
      if (!roomy(x, z, .6) || celderTrailDistance(x, z) < .5 || field.sample(x, z).slope > .6) continue;
      const habitat = field.habitat(x, z);
      const chance = { bank: .05, bed: 0, floodplain: .1, terrace: .16, foothill: .2, fan: .42, crest: .3, swale: .18, plain: .24 }[habitat];
      if (random() > chance || !spaced(forbs, x, z, 2.6)) continue;
      const kind = habitat === 'fan' && random() < .5 ? 'lupin' : random() < .4 ? 'composite' : 'leafy';
      forbs.push({ x, z, s: range(.45, .9), h: range(.7, 1.15), rot: random() * TAU, kind });
    }
    // **Scrub** on the swell crests and in the foothills - wild rose and silverberry, low and grey-green, the
    // shrubs a dry continental crest carries - and a little in the swales. Under the knee; no collider.
    for (let i = 0; i < 44; i++) {
      if (++work % 48 === 0) yield;
      const { x, z } = point();
      // Not on a scarp: a clump's side lobes would hang in the air off the downhill side of it.
      if (!roomy(x, z, .8) || celderCandidateClear(x, z, .6) || onMoundSite(x, z) || field.sample(x, z).slope > .5) continue;
      const habitat = field.habitat(x, z);
      const chance = { foothill: .42, crest: .2, swale: .07, fan: .05, plain: .03, terrace: .015, floodplain: 0, bank: 0, bed: 0 }[habitat];
      if (random() > chance || !spaced(scrub, x, z, 3.2)) continue;
      scrub.push({ x, z, s: range(.5, 1.05), rot: random() * TAU, rose: random() < .45, habitat });
    }
    // **Stone**: cobbles and the odd boulder on the crests and the fans, brought down by the mountain water
    // over a long time; bedrock breaking through in the foothills. A boulder a metre across blocks a walker.
    for (let i = 0; i < 34; i++) {
      if (++work % 48 === 0) yield;
      const { x, z } = point();
      if (!plantable(x, z) || onMoundSite(x, z) || field.sample(x, z).slope > .8) continue;
      const habitat = field.habitat(x, z);
      const chance = { foothill: .5, crest: .14, fan: .12, plain: .03, swale: .01, terrace: .02, floodplain: .03, bank: 0, bed: 0 }[habitat];
      if (random() > chance) continue;
      const big = habitat === 'foothill' ? random() < .32 : random() < .1;
      const s = big ? range(1, 2.1) : range(.22, .7);
      if (big && (celderCandidateClear(x, z, s + .4) || !spaced(stones.filter(t => t.big), x, z, 7))) continue;
      if (!big && celderTrailDistance(x, z) < .3) continue;
      stones.push({ x, z, s, big, rot: random() * TAU, flat: big ? range(.5, .75) : range(.35, .6), habitat, tint: random() });
      if (big && habitat === 'foothill' && random() < .55) {
        // An outcrop: two or three more blocks leaning on the first, the bedrock of the range showing through.
        for (let k = 0; k < 2 + (random() < .4 ? 1 : 0); k++) {
          const a = random() * TAU, d = s * range(.7, 1.2), px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
          if (!plantable(px, pz) || celderCandidateClear(px, pz, s)) continue;
          stones.push({ x: px, z: pz, s: s * range(.55, .85), big: true, rot: random() * TAU, flat: range(.55, .8), habitat, tint: random(), outcrop: true });
        }
        metrics.outcrops++;
      }
    }
    // **Trees only where the ground allows**: the foothills' draws and shoulders, and - very rarely - a lone
    // hawthorn out on the plain. The stream's own trees are planted from the water below.
    for (let i = 0; i < 30; i++) {
      if (++work % 48 === 0) yield;
      const { x, z } = point();
      if (!plantable(x, z) || celderCandidateClear(x, z, 2) || onMoundSite(x, z)) continue;
      const here = field.sample(x, z), habitat = field.habitat(x, z, here);
      if (here.slope > .45) continue;
      const chance = habitat === 'foothill' ? .3 : habitat === 'floodplain' ? .012 : habitat === 'swale' || habitat === 'fan' ? .006 : habitat === 'plain' || habitat === 'crest' ? .003 : 0;
      if (random() > chance || !spaced(trees, x, z, habitat === 'foothill' ? 5.5 : 30)) continue;
      const species = habitat === 'floodplain' ? (random() < .6 ? 'black-willow' : 'black-alder') : habitat !== 'foothill' ? 'hawthorn'
        : here.swell < -.3 ? (random() < .6 ? 'silver-birch' : 'hawthorn')
        : here.slope > .16 || here.swell > 1.2 ? (random() < .55 ? 'common-juniper' : 'white-oak')
        : random() < .5 ? 'white-oak' : random() < .55 ? 'hawthorn' : 'silver-birch';
      trees.push(tree(species, x, z));
    }
  }
  function tree(species, x, z) {
    const t = TREES[species];
    return { species, x, z, height: range(...t.h), radius: range(...t.r), yaw: random() * TAU };
  }

  // -------------------------------------------------------------------------
  // The water's margin
  // -------------------------------------------------------------------------
  /**
   * **Fast and cold**: the lore's rivers here "run faster and colder", and a quick stream off a range lays
   * gravel, not silt. So the bank is a strip of grey cobble at the water's edge, sedge and rush a pace back,
   * and a thin line of willow, alder and the odd white poplar - thin because a cold quick stream on an open
   * plain grows a fringe, not the Mithala's gallery. Walked over every node of this country's ground that is
   * within eight metres of water and is not itself under it.
   */
  for (let z = field.minZ; z <= field.maxZ; z += field.step) {
    yield;
    for (let x = field.minX; x <= field.maxX; x += field.step) {
      if (++work % 64 === 0) yield;
      const node = field.sample(x, z);
      if (!node.own || node.water > 14 || node.water <= 0) continue;
      for (let k = 0; k < 2; k++) {
        const px = x + range(-2, 2), pz = z + range(-2, 2);
        if (!plantable(px, pz)) continue;
        const reach = field.sample(px, pz).water;
        if (reach <= 4 && random() < .55) gravel.push({ x: px, z: pz, s: range(.12, .36), rot: random() * TAU, flat: range(.3, .5), tint: random() });
        else if (reach <= 8 && random() < .5 && celderTrailDistance(px, pz) > 0) sedge.push({ x: px, z: pz, s: range(.7, 1.25), rot: random() * TAU, rush: random() < .35 });
        else if (reach > 4 && random() < .045 && !celderCandidateClear(px, pz, 2) && spaced(trees, px, pz, 6)) {
          const pick = random();
          trees.push(tree(pick < .5 ? 'black-willow' : pick < .86 ? 'black-alder' : 'white-poplar', px, pz));
        }
      }
    }
  }
  /**
   * **The Celder water's head** (`CELDER_HEAD`, src/content/regions/south-celder/south-celder-world.js): the one atlas river edge between the two
   * Celders, laid as a dry bed - "it carries South Celder's snowmelt in spring and nothing in summer". So it is
   * cobbles and nothing else, each country drawing the half of it that is its own, and no grass grows in it.
   */
  const head = PLAIN.CELDER_HEAD;
  if (head) {
    const dx = head.to.x - head.from.x, dz = head.to.z - head.from.z, length = Math.hypot(dx, dz), nx = -dz / length, nz = dx / length;
    for (let d = 0; d <= length; d += .9) {
      if (++work % 16 === 0) yield;
      for (let k = 0; k < 3; k++) {
        const across = range(-head.half - .4, head.half + .4), px = head.from.x + dx * d / length + nx * across, pz = head.from.z + dz * d / length + nz * across;
        if (!plantable(px, pz) || celderTrailDistance(px, pz) < .3) continue;
        gravel.push({ x: px, z: pz, s: range(.14, .42), rot: random() * TAU, flat: range(.32, .55), tint: random() });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Drawing it
  // -------------------------------------------------------------------------
  const dummy = new THREE.Object3D(), color = new THREE.Color();
  const ground = (x, z) => renderedGroundHeight(x, z);
  // Keep the complete lower hull in contact with the drawn triangles. A
  // center height alone leaves tilted stones and compound shrubs hanging on
  // a slope. This changes only instance Y, after all seeded choices are made.
  const lowerVertices = new WeakMap(), footingMatrix = new THREE.Matrix4();
  function lowerFootGap(matrix, geometry) {
    let vertices = lowerVertices.get(geometry);
    if (!vertices) {
      const p = geometry.attributes.position;
      vertices = [...new Map(Array.from({ length: p.count }, (_, i) =>
        [p.getX(i), p.getY(i), p.getZ(i)]).filter(v => v[1] < 0).map(v => [v.join(','), v])).values()];
      lowerVertices.set(geometry, vertices);
    }
    const e = matrix.elements; let gap = -Infinity;
    for (const [x, y, z] of vertices) {
      const px = e[0] * x + e[4] * y + e[8] * z + e[12], py = e[1] * x + e[5] * y + e[9] * z + e[13];
      const pz = e[2] * x + e[6] * y + e[10] * z + e[14];
      gap = Math.max(gap, py - ground(px, pz));
    }
    return gap;
  }
  function seatStone() {
    dummy.position.y -= Math.max(0, lowerFootGap(dummy.matrix, kit.stone) + .02);
    dummy.updateMatrix();
  }

  const keepItem = item => !canerdClear(item.x, item.z, Math.max(.8, item.s ?? 0))
    && !(item.big && celderSceneryClear(item.x, item.z, item.s + .4));
  function* instanced(geometry, material, items, name, place, perItem = 1) {
    if (!items.length) return null;
    const mesh = new THREE.InstancedMesh(geometry, material, items.length * perItem);
    mesh.name = name;
    let at = 0;
    for (const item of items) {
      if (++work % 32 === 0) yield;
      // `place` also draws random shape and colour values. Run it even for a
      // removed object, then reuse its slots and discard any physical blocker.
      const firstCollider = colliders.length, oldColliders = metrics.colliders, oldBoulders = metrics.boulders;
      const next = place(mesh, item, at);
      if (!keepItem(item)) {
        colliders.length = firstCollider; metrics.colliders = oldColliders; metrics.boulders = oldBoulders;
      } else at = next;
    }
    if (!at) return null;
    mesh.count = at; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.receiveShadow = true; mesh.computeBoundingSphere(); root.add(mesh);
    metrics.batches++; metrics.instances += at;
    return mesh;
  }
  const blade = (mesh, item, at, tall, tint) => {
    dummy.position.set(item.x, ground(item.x, item.z) - .03, item.z); dummy.rotation.set(0, item.rot, 0);
    dummy.scale.set(item.s, item.s * tall, item.s); dummy.updateMatrix();
    mesh.setMatrixAt(at, dummy.matrix); mesh.setColorAt(at, tint); return at + 1;
  };
  /**
   * Grass colour carries the habitat, and it is a saturation note more than a hue (the Meneth lesson: pick the
   * lightnesses low, the renderer pales them). The crests are tawny and dry; the swales deep green; the fans a
   * cool blue-green - the "different" grass of the mineral silt; the terraces the richest green on the plain;
   * the foothills greyer and shorter.
   */
  const grassTint = t => {
    let hue = .2, sat = .34, light = .33;
    if (t.habitat === 'crest') { hue = .16; sat = .32; light = .37; }
    else if (t.habitat === 'swale') { hue = .23; sat = .4; light = .29; }
    else if (t.habitat === 'fan') { hue = .3; sat = .25; light = .32; }
    else if (t.habitat === 'foothill') { hue = .17; sat = .24; light = .35; }
    hue += -t.swell * .012 + (t.grassland ? .01 : 0);
    return color.setHSL(hue + range(-.012, .012), sat + range(-.04, .04), light + range(-.035, .035));
  };
  const turfTint = t => color.setHSL((t.habitat === 'bank' ? .24 : .26) + range(-.012, .012), .42 + range(-.04, .04), .3 + range(-.03, .03));
  metrics.grass = 0; metrics.fanGrass = 0; metrics.terraceGrass = 0;
  for (const [key, tile] of [...tiles].sort((a, b) => a[0] < b[0] ? -1 : 1)) {
    yield;
    const turf = tile.kind === 'turf';
    yield* instanced(turf ? kit.turf : kit.bunch, kit.blades, tile.items, `${name} ${turf ? 'terrace turf' : 'prairie grass'} ${key.split('|')[1]}`,
      (mesh, item, at) => blade(mesh, item, at, turf ? 1 : 1.18, turf ? turfTint(item) : grassTint(item)));
    for (const item of tile.items) if (keepItem(item)) {
      if (turf) metrics.terraceGrass++; else if (item.habitat === 'fan') metrics.fanGrass++; else metrics.grass++;
    }
  }
  yield* instanced(kit.sedge, kit.blades, sedge, `${name} sedge and rush`,
    (mesh, item, at) => blade(mesh, item, at, item.rush ? 1.35 : 1, color.setHSL((item.rush ? .2 : .18) + range(-.015, .015), .26 + range(-.04, .04), .34 + range(-.04, .04))));
  metrics.sedge = sedge.filter(keepItem).length;
  const lobes = (mesh, item, at, count, shape, tint) => {
    const y = ground(item.x, item.z), first = at;
    for (let lobe = 0; lobe < count; lobe++) {
      const a = item.rot + lobe * TAU / count, spread = lobe === count - 1 ? 0 : shape.spread * item.s;
      dummy.position.set(item.x + Math.cos(a) * spread, y + item.s * shape.lift * (lobe === count - 1 ? 1.25 : 1), item.z + Math.sin(a) * spread);
      dummy.rotation.set(range(-.2, .2), a, range(-.2, .2));
      dummy.scale.set(item.s * shape.wide, item.s * shape.tall, item.s * shape.wide * .9); dummy.updateMatrix();
      mesh.setMatrixAt(at, dummy.matrix); mesh.setColorAt(at++, tint(lobe));
    }
    let gap = -Infinity;
    for (let i = first; i < first + Math.min(count, 2); i++) {
      mesh.getMatrixAt(i, footingMatrix);
      gap = Math.max(gap, lowerFootGap(footingMatrix, mesh.geometry));
    }
    const sink = Math.max(0, gap + .02);
    if (sink) for (let i = first; i < at; i++) {
      mesh.getMatrixAt(i, footingMatrix); footingMatrix.elements[13] -= sink; mesh.setMatrixAt(i, footingMatrix);
    }
    return at;
  };
  yield* instanced(kit.lobe, kit.solid, forbs, `${name} prairie forbs`, (mesh, item, at) => lobes(mesh, item, at, 3,
    { spread: .28, lift: item.h * .45, wide: .3, tall: item.h * .38 },
    lobe => (lobe === 2 && item.kind === 'lupin' ? color.set('#6f6fa8')
      : lobe === 2 && item.kind === 'composite' ? color.set('#b59a3e')
      : color.set('#5b7340')).offsetHSL(range(-.02, .02), range(-.05, .05), range(-.04, .05))), 3);
  metrics.forbs = forbs.filter(keepItem).length;
  yield* instanced(kit.lobe, kit.solid, scrub, `${name} rose and silverberry scrub`, (mesh, item, at) => lobes(mesh, item, at, 3,
    { spread: .42, lift: .32, wide: .55, tall: .42 },
    lobe => (item.rose ? color.set(lobe === 2 ? '#64713f' : '#5a6a3c') : color.set(lobe === 2 ? '#8a9779' : '#7a8a6c'))
      .offsetHSL(range(-.02, .02), range(-.04, .04), range(-.04, .04))), 3);
  metrics.scrub = scrub.filter(keepItem).length;
  const stoneTint = item => color.set(item.habitat === 'foothill' ? (item.tint < .5 ? '#8a877e' : '#9b968a') : item.tint < .6 ? '#8c8a82' : '#a39d90')
    .offsetHSL(0, range(-.02, .02), range(-.05, .05));
  yield* instanced(kit.stone, kit.solid, stones, `${name} stone`, (mesh, item, at) => {
    const y = ground(item.x, item.z);
    dummy.position.set(item.x, y + item.s * item.flat * .25, item.z); dummy.rotation.set(range(-.15, .15), item.rot, range(-.15, .15));
    dummy.scale.set(item.s, item.s * item.flat, item.s * range(.75, 1.15)); dummy.updateMatrix();
    seatStone();
    mesh.setMatrixAt(at, dummy.matrix); mesh.setColorAt(at, stoneTint(item));
    if (item.big) {
      const feet = Math.min(y, heightAt(item.x, item.z));
      colliders.push({ x: item.x, z: item.z, r: item.s * .78, minY: feet - .6, maxY: feet + item.s * item.flat * 1.3,
        kind: 'rock', id: `${country.key}-stone-${item.x.toFixed(2)}-${item.z.toFixed(2)}` });
      metrics.colliders++; metrics.boulders++;
    }
    return at + 1;
  });
  metrics.stones = stones.filter(keepItem).length;
  yield* instanced(kit.stone, kit.solid, gravel, `${name} stream gravel`, (mesh, item, at) => {
    dummy.position.set(item.x, ground(item.x, item.z) + .01, item.z); dummy.rotation.set(0, item.rot, 0);
    dummy.scale.set(item.s, item.s * item.flat, item.s * range(.8, 1.3)); dummy.updateMatrix();
    seatStone();
    mesh.setMatrixAt(at, dummy.matrix); mesh.setColorAt(at, color.set(item.tint < .5 ? '#8f8c84' : '#a8a397').offsetHSL(0, 0, range(-.06, .05)));
    return at + 1;
  });
  metrics.gravel = gravel.filter(keepItem).length;

  // The trees: typed, harvestable, one trunk and three crown lobes each, in two batches for the country.
  if (trees.length) {
    const trunk = new THREE.InstancedMesh(kit.trunk, kit.solid, trees.length);
    const crowns = new THREE.InstancedMesh(kit.crown, kit.solid, trees.length * 3);
    trunk.name = `${name} typed living trunks`; crowns.name = `${name} crowns`;
    root.add(trunk, crowns);
    for (const mesh of [trunk, crowns]) { mesh.castShadow = true; mesh.receiveShadow = true; }
    const counts = { 'white-oak': 'oaks', 'silver-birch': 'birches', hawthorn: 'hawthorns', 'common-juniper': 'junipers', 'black-willow': 'willows', 'black-alder': 'alders', 'white-poplar': 'poplars' };
    let treeCount = 0;
    const emittedTrees = [];
    for (const t of trees) {
      if (++work % 12 === 0) yield;
      const i = treeCount;
      const shape = TREES[t.species], y = ground(t.x, t.z), h = t.height, r = t.radius;
      dummy.position.set(t.x, y + h * .46 - .55, t.z); dummy.rotation.set(0, t.yaw, 0);
      dummy.scale.set(r, h * .92 + 1.1, r); dummy.updateMatrix(); trunk.setMatrixAt(i, dummy.matrix);
      trunk.setColorAt(i, color.set(shape.bark));
      const handles = [{ mesh: trunk, index: i }];
      for (let j = 0; j < 3; j++) {
        const angle = t.yaw + j * TAU / 3, spread = h * shape.spread, offset = j === 0 ? 0 : spread * .55;
        dummy.position.set(t.x + Math.cos(angle) * offset, y + h * (shape.lift + j * .08), t.z + Math.sin(angle) * offset);
        dummy.rotation.set(.05, t.yaw, 0);
        dummy.scale.set(spread * (j === 0 ? 1.1 : .86), h * shape.deep, spread * .8); dummy.updateMatrix();
        crowns.setMatrixAt(i * 3 + j, dummy.matrix);
        crowns.setColorAt(i * 3 + j, color.set(shape.leaf).multiplyScalar(.9 + j * .06).offsetHSL(range(-.015, .015), range(-.04, .04), 0));
        handles.push({ mesh: crowns, index: i * 3 + j });
      }
      if (canerdClear(t.x, t.z, h * shape.spread + r) || celderSceneryClear(t.x, t.z, 2)) continue;
      treeCount++; emittedTrees.push(t);
      const feet = Math.min(y, heightAt(t.x, t.z)), id = worldTreeId(country.key, t.x, t.z);
      const collider = { x: t.x, z: t.z, r: r + .08, minY: feet - .9, maxY: feet + h, kind: 'tree', id };
      colliders.push(collider); metrics.colliders++;
      registerWorldTree(colliders, { id, ...t, y, base: { x: t.x, y, z: t.z }, harvestable: true }, handles, collider);
      metrics.trees++; metrics[counts[t.species]]++;
    }
    trunk.count = treeCount; crowns.count = treeCount * 3;
    trunk.computeBoundingSphere(); crowns.computeBoundingSphere();
    metrics.batches += 2; metrics.instances += treeCount * 4;
    trees.splice(0, trees.length, ...emittedTrees);
  }
  // The sampled ground is let go here: the world keeps what was built, not the survey it was built from.
  return { root, metrics, trees };
}
