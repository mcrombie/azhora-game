/**
 * The plants of Drent: what Nell Harrow teaches the traveler to find
 * (`src/herbology.js`). Each kind grows where it should — yarrow and plantain on
 * the trodden verge, jewelweed and boneset in wet shade, sassafras and ginseng
 * under the oaks, mullein and sumac in the old fields — and each is drawn once
 * and instanced where it stands. Four stands are authored rather than scattered,
 * because the country put them there: the tuckahoe in the tidal mud of the Caloss
 * bank, the tobacco rows on the Avrel ground, and the jimson weeds.
 * Gathering hides one; the road's checkpoint remembers which.
 */
import * as THREE from 'three';
import { canStand } from './game-state.js';
import { PLANT_SPECIES, PLANT_IDS } from './herbology.js';

const TAU = Math.PI * 2;
const PHI = 2.39996;

function mergedGeometry(pieces) {
  const vertices = [], normals = [], colors = [], m = new THREE.Matrix4(), nm = new THREE.Matrix3();
  const p = new THREE.Vector3(), n = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (const [source, color, position, scale, rotation = [0, 0, 0]] of pieces) {
    q.setFromEuler(e.set(...rotation)); m.compose(new THREE.Vector3(...position), q, new THREE.Vector3(...scale));
    nm.getNormalMatrix(m); const tint = new THREE.Color(color), geometry = source.index ? source.toNonIndexed() : source;
    for (let i = 0; i < geometry.attributes.position.count; i++) {
      p.fromBufferAttribute(geometry.attributes.position, i).applyMatrix4(m); vertices.push(p.x, p.y, p.z);
      n.fromBufferAttribute(geometry.attributes.normal, i).applyMatrix3(nm).normalize(); normals.push(n.x, n.y, n.z);
      colors.push(tint.r, tint.g, tint.b);
    }
    if (geometry !== source) geometry.dispose();
  }
  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  result.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  result.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  result.computeBoundingSphere(); return result;
}

/**
 * One plant of each kind, drawn at the size it grows. The silhouettes are the
 * point: a rosette flat on the path, a candle in the old field, an umbrella an
 * inch off the wood floor, an arrowhead standing out of the water.
 */
export function plantShapes() {
  const blade = new THREE.CylinderGeometry(1, 1, 1, 5);
  const stalk = new THREE.CylinderGeometry(1, 1.2, 1, 5);
  const ball = new THREE.IcosahedronGeometry(1, 0);
  const cone = new THREE.ConeGeometry(1, 1, 6);
  const plate = new THREE.CylinderGeometry(1, 1, 1, 8);
  const shapes = {};

  /** A flat rosette of leaves at ground level. */
  const rosette = (colour, count, length, wide, y = .02) => Array.from({ length: count }, (_, i) => {
    const a = i * PHI;
    return [blade, colour, [Math.sin(a) * length * .45, y, Math.cos(a) * length * .45], [wide, .012, length], [0, a, .06]];
  });
  /** An upright stem. */
  const stem = (colour, x, z, height, thick = .012) => [stalk, colour, [x, height * .5, z], [thick, height, thick]];
  /** Branches leaning out of one root, for a shrub. */
  const shrub = (colour, count, height, lean, thick = .018) => Array.from({ length: count }, (_, i) => {
    const a = i * PHI;
    return [stalk, colour, [Math.sin(a) * height * .14, height * .5, Math.cos(a) * height * .14], [thick, height, thick],
      [Math.sin(a) * lean, 0, Math.cos(a) * lean]];
  });
  /** Leaves scattered up a shrub or a sapling. */
  const foliage = (colour, alt, count, base, rise, spread, wide, long) => Array.from({ length: count }, (_, i) => {
    const a = i * PHI, r = spread * (.6 + (i % 3) * .2);
    return [blade, i % 3 ? colour : alt, [Math.sin(a) * r, base + (i % 4) * rise, Math.cos(a) * r], [wide, .01, long], [.1, a, .18]];
  });
  const berries = (colour, count, radius, y, size) => Array.from({ length: count }, (_, i) =>
    [ball, colour, [Math.sin(i * PHI) * radius, y + (i % 3) * .03, Math.cos(i * PHI) * radius], [size, size * .9, size]]);

  // Verge: a stiff stem, feathery leaves, a flat white plate of flower.
  shapes.yarrow = mergedGeometry([
    ...rosette(0x6f8a52, 5, .2, .022, .015),
    stem(0x7e8f58, 0, 0, .46),
    ...Array.from({ length: 5 }, (_, i) => [blade, 0x7a9159, [Math.sin(i * PHI) * .05, .18 + i * .05, Math.cos(i * PHI) * .05], [.014, .01, .11], [0, i * PHI, .2]]),
    [plate, 0xf2efe2, [0, .47, 0], [.085, .014, .085]],
    [plate, 0xe8e4d2, [.02, .485, .01], [.05, .012, .05]],
  ]);
  // Verge: ribbed ovals flat in the path, one rat-tail spike.
  shapes.plantain = mergedGeometry([
    ...rosette(0x5f8341, 7, .26, .075, .018),
    stem(0x7d8c52, .02, 0, .3, .008),
    [stalk, 0x8c8b5a, [.02, .33, 0], [.014, .16, .014]],
  ]);
  // Wet shade: juicy translucent stems, orange spurred flowers.
  shapes.jewelweed = mergedGeometry([
    stem(0x86a86a, 0, 0, .52, .016),
    ...foliage(0x7aa05f, 0x8bb06d, 6, .18, .06, .09, .055, .09),
    ...Array.from({ length: 3 }, (_, i) => [cone, 0xe8892b, [Math.sin(i * 2.1) * .1, .42 + i * .04, Math.cos(i * 2.1) * .1], [.026, .05, .026], [Math.PI * .62, i * 2.1, 0]]),
    [ball, 0xf0a445, [.1, .46, .02], [.018, .016, .018]],
  ]);
  // Old field: a grey felted rosette and a yellow candle taller than the grass.
  shapes.mullein = mergedGeometry([
    ...rosette(0x9aa189, 7, .34, .085, .02),
    stem(0x8e9179, 0, 0, 1.25, .022),
    [stalk, 0x9a9b7e, [0, 1.0, 0], [.035, .55, .035]],
    ...Array.from({ length: 9 }, (_, i) => [ball, 0xe8cf52, [Math.sin(i * PHI) * .035, .85 + i * .055, Math.cos(i * PHI) * .035], [.028, .022, .028]]),
  ]);
  // Wet shade: the stem runs through one long joined leaf; a haze of dull white.
  shapes.boneset = mergedGeometry([
    stem(0x7f8a5c, 0, 0, .72, .014),
    ...Array.from({ length: 4 }, (_, i) => [blade, 0x6d8450, [0, .18 + i * .16, 0], [.03, .009, .3], [0, i * 1.1, 0]]),
    ...Array.from({ length: 4 }, (_, i) => [plate, 0xe7e6d8, [Math.sin(i * PHI) * .06, .73 + (i % 2) * .02, Math.cos(i * PHI) * .06], [.05, .012, .05]]),
  ]);
  // Wood: a young tree carrying three shapes of leaf, cut short for the understorey.
  shapes.sassafras = mergedGeometry([
    stem(0x6b5338, 0, 0, 1.0, .035),
    ...foliage(0x6f9a4c, 0x7fa657, 7, .55, .16, .22, .11, .16),
  ]);
  // Wood: open shrub, red berries, twigs that smell of allspice.
  shapes.spicebush = mergedGeometry([
    ...shrub(0x6d5b41, 5, .68, .22, .014),
    ...foliage(0x65893f, 0x74964c, 8, .5, .12, .27, .07, .11),
    ...berries(0xc2312a, 5, .16, .6, .018),
  ]);
  // Old field: velvet antler branches, red cones standing up.
  shapes.sumac = mergedGeometry([
    stem(0x6a5540, 0, 0, .5, .03),
    ...Array.from({ length: 4 }, (_, i) => {
      const a = i * PHI;
      return [stalk, 0x74604a, [Math.sin(a) * .16, .72, Math.cos(a) * .16], [.02, .5, .02], [Math.sin(a) * .5, 0, Math.cos(a) * .5]];
    }),
    ...Array.from({ length: 10 }, (_, i) => {
      const a = i * PHI, r = .18 + (i % 3) * .1;
      return [blade, 0x5c7f3d, [Math.sin(a) * r, .72 + (i % 4) * .1, Math.cos(a) * r], [.028, .009, .2], [.06, a, .1]];
    }),
    ...Array.from({ length: 4 }, (_, i) => [cone, 0xa52b25, [Math.sin(i * PHI) * .17, 1.02, Math.cos(i * PHI) * .17], [.05, .18, .05]]),
  ]);
  // Field edge: hollow sprawl, cream plates of flower, black clusters.
  shapes.elder = mergedGeometry([
    ...shrub(0x6e6249, 4, 1.0, .28, .02),
    ...foliage(0x4f7a3d, 0x5d8a46, 10, .7, .14, .3, .06, .13),
    ...Array.from({ length: 3 }, (_, i) => [plate, 0xeeeade, [Math.sin(i * 2.1) * .22, 1.02 + (i % 2) * .06, Math.cos(i * 2.1) * .22], [.12, .016, .12]]),
    ...berries(0x2b2436, 6, .2, .9, .02),
  ]);
  // Wood edge: ragged yellow threads on bare twigs, late in the year.
  shapes['witch-hazel'] = mergedGeometry([
    ...shrub(0x7a6b55, 5, .9, .3, .016),
    ...foliage(0x86924e, 0x97a05a, 7, .55, .13, .26, .07, .1),
    ...Array.from({ length: 12 }, (_, i) => {
      const a = i * PHI, r = .2 + (i % 3) * .06;
      return [stalk, 0xe4c440, [Math.sin(a) * r, .66 + (i % 4) * .1, Math.cos(a) * r], [.005, .07, .005], [1.2, a, .4]];
    }),
  ]);
  // Deep shade: paired hearts on the floor, the flower hidden underneath.
  shapes['wild-ginger'] = mergedGeometry([
    ...Array.from({ length: 4 }, (_, i) => {
      const a = i * 1.6;
      return [blade, i % 2 ? 0x3f6535 : 0x4a713c, [Math.sin(a) * .07, .07, Math.cos(a) * .07], [.075, .012, .1], [.16, a, .1]];
    }),
    [ball, 0x6d2c2c, [0, .018, 0], [.028, .022, .028]],
  ]);
  // Old fence: a vine with a flower too elaborate for this country.
  shapes.maypop = mergedGeometry([
    ...Array.from({ length: 5 }, (_, i) => [stalk, 0x63803f, [Math.sin(i * PHI) * .1, .3 + i * .06, Math.cos(i * PHI) * .1], [.008, .42, .008], [.5, i * PHI, .3]]),
    ...foliage(0x5d8a3c, 0x6d9748, 7, .28, .12, .22, .08, .09),
    [plate, 0xe7e2ee, [.06, .62, .04], [.08, .01, .08]],
    ...Array.from({ length: 12 }, (_, i) => [stalk, 0x7b5fa8, [.06 + Math.sin(i * .52) * .06, .635, .04 + Math.cos(i * .52) * .06], [.004, .05, .004], [1.4, i * .52, 0]]),
    [ball, 0x9bb05a, [-.1, .34, .07], [.045, .06, .045]],
  ]);
  // Wood: one white flower on a bare stalk, wrapped in a single scalloped leaf.
  shapes.bloodroot = mergedGeometry([
    [blade, 0x6c8a58, [0, .12, 0], [.11, .014, .13], [.1, .4, .06]],
    stem(0x8a7a55, .04, .02, .2, .009),
    [plate, 0xf4f2ea, [.04, .21, .02], [.05, .012, .05]],
    ...Array.from({ length: 6 }, (_, i) => [blade, 0xf7f5ef, [.04 + Math.sin(i * 1.05) * .035, .215, .02 + Math.cos(i * 1.05) * .035], [.018, .008, .045], [0, i * 1.05, 0]]),
  ]);
  // Wood: colonies of green umbrellas a foot off the floor.
  shapes.mayapple = mergedGeometry([
    stem(0x7f8a52, 0, 0, .26, .011),
    [plate, 0x5b8244, [0, .27, 0], [.16, .014, .16]],
    ...Array.from({ length: 6 }, (_, i) => [blade, 0x628b49, [Math.sin(i * 1.05) * .12, .265, Math.cos(i * 1.05) * .12], [.05, .01, .11], [.08, i * 1.05, .12]]),
    stem(0x7f8a52, .13, .05, .22, .01),
    [plate, 0x557d40, [.13, .23, .05], [.11, .012, .11]],
    [ball, 0xeeeade, [.06, .19, .02], [.022, .018, .022]],
  ]);
  // Verge: crimson stems head-high, ink-black berries hanging down.
  shapes.pokeweed = mergedGeometry([
    ...Array.from({ length: 3 }, (_, i) => {
      const a = i * PHI;
      return [stalk, 0x8e2f4a, [Math.sin(a) * .07, .6, Math.cos(a) * .07], [.022, 1.2, .022], [Math.sin(a) * .14, 0, Math.cos(a) * .14]];
    }),
    ...foliage(0x4f7a3f, 0x5f8a4a, 9, .55, .16, .24, .07, .16),
    ...Array.from({ length: 4 }, (_, i) => {
      const a = i * PHI;
      return [stalk, 0x8e2f4a, [Math.sin(a) * .18, .98, Math.cos(a) * .18], [.006, .3, .006], [.9, a, .3]];
    }),
    ...Array.from({ length: 10 }, (_, i) => {
      const a = i * PHI, r = .2 + (i % 3) * .05;
      return [ball, 0x231a2c, [Math.sin(a) * r, .86 + (i % 4) * .05, Math.cos(a) * r], [.016, .013, .016]];
    }),
  ]);
  // Deep shade: three prongs of five leaves, red berries at the fork.
  shapes.ginseng = mergedGeometry([
    stem(0x8a7c52, 0, 0, .3, .01),
    ...Array.from({ length: 3 }, (_, i) => {
      const a = i * (TAU / 3);
      return Array.from({ length: 5 }, (_, j) => {
        const b = a + (j - 2) * .34, r = .07 + (j === 2 ? .05 : j % 2 ? .02 : 0);
        return [blade, j % 2 ? 0x4c7a3a : 0x568443, [Math.sin(b) * (.1 + r), .31, Math.cos(b) * (.1 + r)], [.032, .009, .1], [.06, b, .1]];
      });
    }).flat(),
    ...berries(0xc0342c, 4, .03, .35, .014),
  ]);
  // Tidal mud: great arrowheads standing out of the water.
  shapes.tuckahoe = mergedGeometry([
    ...Array.from({ length: 4 }, (_, i) => {
      const a = i * PHI;
      return [stalk, 0x5f7f47, [Math.sin(a) * .06, .3, Math.cos(a) * .06], [.014, .6, .014], [Math.sin(a) * .18, 0, Math.cos(a) * .18]];
    }),
    ...Array.from({ length: 4 }, (_, i) => {
      const a = i * PHI, x = Math.sin(a) * .12, z = Math.cos(a) * .12;
      return [[cone, 0x4f7b3c, [x, .74, z], [.13, .34, .02], [Math.PI, a, .12]],
        [blade, 0x548040, [x, .62, z], [.03, .01, .14], [0, a, .1]]];
    }).flat(),
    [cone, 0x93a55e, [.09, .48, .05], [.045, .2, .045], [0, 0, .1]],
  ]);
  // The field: broad pale sticky leaves up a man-high stalk, topped off.
  shapes.tobacco = mergedGeometry([
    stem(0x8a9058, 0, 0, 1.15, .028),
    ...Array.from({ length: 8 }, (_, i) => {
      const a = i * PHI, r = .16 + (i % 3) * .07, y = .22 + i * .11;
      return [blade, i % 2 ? 0x8fa259 : 0x9aad66, [Math.sin(a) * r, y, Math.cos(a) * r], [.15, .012, .34], [.14, a, .1]];
    }),
    [stalk, 0x9aa46a, [0, 1.18, 0], [.02, .1, .02]],
  ]);
  // Waste ground: jagged leaves, white trumpets, hard spiked pods.
  shapes['jimson-weed'] = mergedGeometry([
    ...Array.from({ length: 3 }, (_, i) => {
      const a = i * PHI;
      return [stalk, 0x5a6a46, [Math.sin(a) * .08, .32, Math.cos(a) * .08], [.018, .64, .018], [Math.sin(a) * .2, 0, Math.cos(a) * .2]];
    }),
    ...Array.from({ length: 9 }, (_, i) => {
      const a = i * PHI, r = .16 + (i % 3) * .08;
      return [blade, i % 3 ? 0x50663f : 0x5d7448, [Math.sin(a) * r, .3 + (i % 4) * .12, Math.cos(a) * r], [.09, .011, .17], [.12, a, .2]];
    }),
    ...Array.from({ length: 2 }, (_, i) => [cone, 0xefeadd, [Math.sin(i * 2.4) * .17, .62, Math.cos(i * 2.4) * .17], [.05, .19, .05], [Math.PI * .86, i * 2.4, 0]]),
    // The pods: hard green eggs stuck all over with spikes. This is what Toft wants.
    ...Array.from({ length: 3 }, (_, i) => {
      const a = i * PHI + .7, x = Math.sin(a) * .14, y = .44 + (i % 2) * .12, z = Math.cos(a) * .14;
      return [[ball, 0x6f8a45, [x, y, z], [.05, .055, .05]],
        ...Array.from({ length: 7 }, (_, j) => {
          const b = j * PHI;
          return [cone, 0x86a055, [x + Math.sin(b) * .04, y + (j % 3 - 1) * .035, z + Math.cos(b) * .04], [.008, .035, .008], [1.1, b, 0]];
        })];
    }).flat(),
  ]);

  blade.dispose(); stalk.dispose(); ball.dispose(); cone.dispose(); plate.dispose();
  return shapes;
}

/** How many of each scattered kind grow in Drent. Authored stands are not listed. */
export const PLANT_PATCHES = Object.freeze({
  yarrow: 5, plantain: 5, jewelweed: 4, mullein: 4, boneset: 3, sassafras: 4, spicebush: 4,
  sumac: 3, elder: 3, 'witch-hazel': 3, 'wild-ginger': 3, maypop: 2, bloodroot: 3, mayapple: 3,
  pokeweed: 4, ginseng: 2,
});

/**
 * The stands the country put where it put them, in world metres.
 * The tuckahoe is in the tidal shallows of the Caloss bank, in southern Drent
 * where the road runs down to Luscia; the tobacco is the Avrel ground; and the
 * three jimson weeds are Nell's (the easy one), a wild one on Drent's waste
 * ground, and a wild one away in Pueth.
 */
export const AUTHORED_STANDS = Object.freeze([
  // The reedwater bank: Drent's side of the river, where the road runs down to Luscia.
  Object.freeze({ id: 'tuckahoe-bank', species: 'tuckahoe', x: -536, z: 168, count: 7, spread: 5, water: true }),
  Object.freeze({ id: 'tobacco-avrel', species: 'tobacco', x: -444, z: 30, count: 12, spread: 0, rows: true }),
  Object.freeze({ id: 'jimson-nell', species: 'jimson-weed', x: -34, z: 44, count: 1, spread: 0 }),
  Object.freeze({ id: 'jimson-drent', species: 'jimson-weed', x: -200, z: 46, count: 1, spread: 0 }),
  Object.freeze({ id: 'jimson-pueth', species: 'jimson-weed', x: 0, z: -226, count: 1, spread: 0 }),
]);

/** Where each scattered kind is looked for. */
const HABITAT_RULE = Object.freeze({
  verge: { nearRoad: [2.2, 6], radius: 7 },
  clearing: { nearRoad: [7, 26], radius: 10, open: true },
  wood: { nearTree: 3.4, radius: 3.4 },
  damp: { nearWater: 14, radius: 6 },
});

/**
 * Put Drent's plants in its country. `avoid` is everywhere people stand, so the
 * traveler never finds one under somebody's feet.
 */
export function createDrentFlora(scene, world, { avoid = [], random = null } = {}) {
  let seed = 0x2f9a17b3, disposed = false;
  const rand = random ?? (() => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; });
  const root = new THREE.Group(); root.name = 'Drent flora'; scene.add(root);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, flatShading: true, side: THREE.DoubleSide });
  const shapes = plantShapes();

  // Drent's walkable country, in world metres: the wood behind Tidehaven and the
  // road west as far as the Caloss bank.
  const inDrent = (x, z) => x >= -600 && x <= 120 && z >= -80 && z <= 220;
  const trees = (world.broadleafTrees ?? []).filter(tree => inDrent(tree.x, tree.z));
  const roads = world.paths ?? [];
  const roadGap = (x, z) => {
    let best = Infinity;
    for (const path of roads) for (const point of path) {
      const d = Math.hypot(point.x - x, point.z - z);
      if (d < best) best = d;
    }
    return best;
  };
  const waters = [{ x: -97, z: 9, r: 16 }, { x: -540, z: 186, r: 26 }];
  const waterGap = (x, z) => Math.min(...waters.map(pool => Math.abs(Math.hypot(pool.x - x, pool.z - z) - pool.r)));
  const treeGap = (x, z) => {
    let best = Infinity;
    for (const tree of trees) {
      const d = Math.hypot(tree.x - x, tree.z - z);
      if (d < best) best = d;
    }
    return best;
  };
  const crowded = (x, z, list, gap) => list.some(item => Math.hypot(item.x - x, item.z - z) < gap);

  const sites = [];
  function fits(x, z, habitat) {
    if (!inDrent(x, z) || !canStand(x, z, world, .5)) return false;
    if (crowded(x, z, sites, 3) || crowded(x, z, avoid, 3)) return false;
    const rule = HABITAT_RULE[habitat];
    if (!rule) return false;
    const road = roadGap(x, z);
    if (rule.nearRoad && (road < rule.nearRoad[0] || road > rule.nearRoad[1])) return false;
    if (!rule.nearRoad && road < 2.4) return false;
    if (rule.nearTree !== undefined && treeGap(x, z) > rule.nearTree) return false;
    if (rule.open && treeGap(x, z) < 5) return false;
    if (rule.nearWater !== undefined && waterGap(x, z) > rule.nearWater) return false;
    return true;
  }

  function add(species, x, z, extra = {}) {
    const entry = PLANT_SPECIES[species];
    const site = { id: extra.id ?? `${species}-${sites.filter(s => s.species === species).length + 1}`,
      species, name: entry.name, x, z, y: world.heightAt(x, z), gathered: false,
      yaw: rand() * TAU, scale: .88 + rand() * .3, ...extra };
    sites.push(site); return site;
  }

  // The scattered kinds: anchored on a tree, a verge or a water's edge, whichever
  // the habitat asks for, and given forty tries before the wood is allowed to say no.
  for (const id of PLANT_IDS) {
    const species = PLANT_SPECIES[id], wanted = PLANT_PATCHES[id];
    if (!wanted) continue;
    for (let n = 0; n < wanted; n++) {
      const rule = HABITAT_RULE[species.habitat];
      let placed = false;
      for (let attempt = 0; attempt < 60 && !placed; attempt++) {
        let ax, az;
        if (rule?.nearTree !== undefined) {
          if (!trees.length) break;
          const tree = trees[Math.floor(rand() * trees.length)];
          const a = rand() * TAU, r = 1.6 + rand() * rule.radius;
          ax = tree.x + Math.sin(a) * r; az = tree.z + Math.cos(a) * r;
        } else if (rule?.nearWater !== undefined) {
          const pool = waters[Math.floor(rand() * waters.length)], a = rand() * TAU;
          const r = pool.r + (rand() - .5) * rule.nearWater;
          ax = pool.x + Math.sin(a) * r; az = pool.z + Math.cos(a) * r;
        } else {
          const path = roads[Math.floor(rand() * roads.length)];
          if (!path?.length) break;
          const point = path[Math.floor(rand() * path.length)], a = rand() * TAU;
          const r = (rule?.nearRoad?.[0] ?? 3) + rand() * ((rule?.nearRoad?.[1] ?? 8) - (rule?.nearRoad?.[0] ?? 3));
          ax = point.x + Math.sin(a) * r; az = point.z + Math.cos(a) * r;
        }
        if (!fits(ax, az, species.habitat)) continue;
        add(id, ax, az); placed = true;
      }
    }
  }

  // The authored stands.
  for (const stand of AUTHORED_STANDS) {
    for (let n = 0; n < stand.count; n++) {
      const a = rand() * TAU, r = stand.spread ? rand() * stand.spread : 0;
      const x = stand.rows ? stand.x + (n % 4) * 1.6 - 2.4 : stand.x + Math.sin(a) * r;
      const z = stand.rows ? stand.z + Math.floor(n / 4) * 1.7 : stand.z + Math.cos(a) * r;
      // The water plants stand in mud the traveler cannot walk into; everything
      // else must be somewhere a person could kneel.
      if (!stand.water && !canStand(x, z, world, .5)) continue;
      add(stand.species, x, z, { id: stand.count > 1 ? `${stand.id}-${n + 1}` : stand.id, stand: stand.id });
    }
  }

  const clumps = new Map();
  for (const id of PLANT_IDS) {
    const mine = sites.filter(site => site.species === id);
    if (!mine.length || !shapes[id]) continue;
    const mesh = new THREE.InstancedMesh(shapes[id], material, mine.length);
    mesh.name = `${PLANT_SPECIES[id].name} stands`; mesh.castShadow = false; mesh.receiveShadow = true;
    root.add(mesh); clumps.set(id, { mesh, sites: mine });
  }
  const dummy = new THREE.Object3D();
  function place(site, index, mesh) {
    dummy.position.set(site.x, site.y + .01, site.z);
    dummy.rotation.set(0, site.yaw, 0);
    dummy.scale.setScalar(site.gathered ? .0001 : site.scale);
    dummy.updateMatrix(); mesh.setMatrixAt(index, dummy.matrix);
  }
  function draw() {
    for (const { mesh, sites: mine } of clumps.values()) {
      mine.forEach((site, i) => place(site, i, mesh));
      mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere();
    }
  }
  draw();

  return {
    /** The nearest plant still standing, for the F prompt. */
    nearest(position, maxDistance = 2.2) {
      let best = null, gap = maxDistance;
      for (const site of sites) {
        if (site.gathered) continue;
        const d = Math.hypot(site.x - position.x, site.z - position.z);
        if (d <= gap) { gap = d; best = site; }
      }
      return best ? { id: best.id, species: best.species, name: best.name, stand: best.stand ?? null, x: best.x, z: best.z } : null;
    },
    /** Take one: what is worth carrying leaves a gap, the rest is noted and left growing. */
    gather(id, { take = true } = {}) {
      const site = sites.find(entry => entry.id === id);
      if (!site || site.gathered) return false;
      if (take) { site.gathered = true; draw(); }
      return true;
    },
    restoreGathered(ids) {
      const taken = new Set(ids ?? []);
      for (const site of sites) site.gathered = taken.has(site.id);
      draw();
    },
    setVisible(visible) { root.visible = !!visible; },
    state() { return { sites: sites.map(({ id, species, x, z, gathered, stand }) => ({ id, species, x, z, gathered, stand: stand ?? null })), kinds: clumps.size }; },
    dispose() {
      if (disposed) return; disposed = true; root.removeFromParent();
      root.traverse(object => { if (object.isInstancedMesh) object.dispose(); });
      for (const shape of Object.values(shapes)) shape.dispose();
      material.dispose();
    },
  };
}
