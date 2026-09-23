import * as THREE from 'three';
import {
  REGION_ORDER, REGION_CELLS, REGION_BIOMES, METRES_PER_HEX, AVREL_CLEARING, CALOSS, CALOSS_BANK,
  STORY_SITES, MAIN_ROAD, SUVAL_ROAD, FRONTIER, LUMBER_TOWN, townPoint, hexOwnerAt, journeySites, regionNpcPositions } from './region-world.js';
import { HIDEOUT_CLEARINGS, PUETH_CLEARINGS } from './pueth-world.js';
import { PEBLOS_CLEARINGS } from './peblos-world.js';
import { AMOD_CLEARINGS } from './amod-world.js';
import { calossSurface, CALOSS_BRIDGE } from './world-terrain.js';
import { toWorld, WORLD_SCALE } from './world-scale.js';
import { regionalFeatureClear } from './regional-places.js';
import { OUTPOST_CLEARING, STOCKADE_CLEARING } from './outpost.js';
import { WAYSIDE_CLEARINGS } from './wayside.js';
import { PLACE_CLEARINGS } from './places.js';
import { FRONTIER_CLEARINGS } from './frontier.js';
import { WEST_SUVAL_CLEARINGS } from './west-suval.js';
import { WINERY, WINERY_LAYOUT } from './winery.js';
import { RENA_CLEARINGS, DRENT_DEEP_PLACES } from './rena.js';
import { ELAGOS_CLEARINGS } from './elagos-world.js';
import { createLauvelField } from './lauvel-field-world.js';

/** An authored (56 m per hex) anchor in world metres; its own scenery keeps its offsets. */
const at = (x, z) => { const p = toWorld(x, z); return Object.freeze({ x: p.x, z: p.z }); };
/** The same, spread straight into a prop helper's (x, z) arguments. */
const xz = (x, z) => { const p = toWorld(x, z); return [p.x, p.z]; };

/**
 * Scenery for the four rebuilt regions, in world metres.
 *
 * `world.js` owns Tidehaven (which keeps its own local frame) and hands this
 * module a toolkit of shared geometry helpers. Everything here is placed from
 * the authored hexes and the route anchors, never from hand-measured strips,
 * and every batch is kept per region so a camera in Drent submits Drent.
 */

/** Clearings the biome scatter must leave alone: yards, camps and quest ground. */
export const REGION_CLEARINGS = Object.freeze([
  Object.freeze({ x: AVREL_CLEARING.x, z: AVREL_CLEARING.z, r: AVREL_CLEARING.radius }),
  Object.freeze({ ...at(-222, 62), r: 13 }),                                 // the clearing mill
  Object.freeze({ x: CALOSS.crossing.x, z: CALOSS.crossing.z, r: 26 }),      // the bridge approach
  Object.freeze({ ...at(-372, 116), r: 14 }),                                // the reedcutters' camp
  Object.freeze({ ...at(-306, 104), r: 9 }),                                 // the quiet bank
  Object.freeze({ ...at(-374, 134), r: 15 }),                                // Sava's shrine
  Object.freeze({ ...at(-401, 196), r: 15 }),                                // the Lauvel relay
  Object.freeze({ x: STORY_SITES.lauvelField.x, z: STORY_SITES.lauvelField.z, r: 30 }),
  Object.freeze({ x: STORY_SITES.burnedHamlet.x, z: STORY_SITES.burnedHamlet.z, r: 18 }),
  Object.freeze({ x: LUMBER_TOWN.square.x, z: LUMBER_TOWN.square.z, r: 36 }),               // Nothom
  Object.freeze({ x: STORY_SITES.morosGate.x, z: STORY_SITES.morosGate.z, r: 18 }),
  OUTPOST_CLEARING,                                                           // the Ambroni outpost and its ditch
  STOCKADE_CLEARING,                                                          // the forward stockade and its ditch
  ...WAYSIDE_CLEARINGS,                                                       // wayside places on the empty road
  ...PLACE_CLEARINGS,                                                         // the built-up places of Drent and Luscia
  ...FRONTIER_CLEARINGS,                                                      // Elod's closed frontier
  Object.freeze({ x: STORY_SITES.suvalBorderPost.x, z: STORY_SITES.suvalBorderPost.z, r: 18 }),
  Object.freeze({ x: STORY_SITES.waystation.x, z: STORY_SITES.waystation.z, r: 15 }),
  Object.freeze({ x: STORY_SITES.elodGate.x, z: STORY_SITES.elodGate.z, r: 26 }),
  Object.freeze({ x: STORY_SITES.banditLookout.x, z: STORY_SITES.banditLookout.z, r: 10 }),
  ...HIDEOUT_CLEARINGS,                                                       // the goblin camp and its trail, north Luscia
  ...WEST_SUVAL_CLEARINGS,                                                    // Solis, its camp and the road's places (src/west-suval.js)
  Object.freeze({ x: WINERY.centre.x, z: WINERY.centre.z, r: WINERY.radius }),  // Paradise Springs, its vines and its spring (src/winery.js)
  ...WINERY_LAYOUT.lane.slice(1).flatMap((to, i) => {                          // and the lane to it across the downs
    const from = WINERY_LAYOUT.lane[i], steps = Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 6);
    return Array.from({ length: steps + 1 }, (_, k) => Object.freeze({ x: from.x + (to.x - from.x) * k / steps, z: from.z + (to.z - from.z) * k / steps, r: 4 }));
  }),
  ...HIDEOUT_CLEARINGS,                                                       // the goblin camp and its trail, southern Pueth
  ...PUETH_CLEARINGS,                                                         // the Tessen bridge and post, Rimeholt, Pueth's landmarks
  ...PEBLOS_CLEARINGS,                                                        // Cobble, its quay, and every landmark in the Pebbles
  ...RENA_CLEARINGS,                                                          // the ruins of Rena, Applegarth, the old road and Rena's wayside
  ...ELAGOS_CLEARINGS,                                                        // Ambron, the lake country's places, and every stretch of Elagosi water
  ...AMOD_CLEARINGS,                                                          // Ostel, the pass stones, the water gates and the burial terrace
]);


/** The unit perpendicular of the nearest road segment: gates straddle the road. */
function roadNormal(x, z) {
  let best = { x: 1, z: 0 }, bestDistance = Infinity;
  for (const road of [MAIN_ROAD, SUVAL_ROAD]) for (let i = 1; i < road.length; i++) {
    const a = road[i - 1], b = road[i], dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
    const distance = Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
    if (distance < bestDistance) { bestDistance = distance; const length = Math.hypot(dx, dz) || 1; best = { x: -dz / length, z: dx / length }; }
  }
  return best;
}

const near = (x, z, point, radius) => Math.hypot(x - point.x, z - point.z) < radius;

/** True where regional scatter must not stand. */
export function regionClear(x, z, margin = 0) {
  if (REGION_CLEARINGS.some(spot => near(x, z, spot, spot.r + margin))) return true;
  for (const site of Object.values(journeySites)) if (near(x, z, site, 4 + margin)) return true;
  for (const npc of Object.values(regionNpcPositions)) if (near(x, z, npc, 4.5 + margin)) return true;
  if (regionalFeatureClear(x, z, 2 + margin)) return true;
  return near(x, z, CALOSS_BANK.spot, 5 + margin);
}

// A hex now covers WORLD_SCALE^2 times the ground, so fewer of them make a
// batch of roughly the old size: culling stays as fine-grained as it was.
const BLOCK_HEXES = Math.max(1, Math.round(6 / (WORLD_SCALE * WORLD_SCALE)));

/** Groups of nearby hexes, so each batch of scatter has a small bounding sphere. */
function cellBlocks(name, size = BLOCK_HEXES) {
  const cells = [...REGION_CELLS[name]].sort((a, b) => a.z - b.z || a.x - b.x);
  const blocks = [];
  for (let i = 0; i < cells.length; i += size) blocks.push(cells.slice(i, i + size));
  return blocks;
}

export function createRegionScenery(kit) {
  const { root, material, mesh, box, post, pebble, rope, cottage, fence, leanTo, barrel, crate,
    groundHeight, colliders, wornPatch, dummy, color,
    wood, woodLight, darkWood, cream, rockMat, roofGeometry, cylinder, round, movingGroups } = kit;
  let seed = 917351;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a, b) => a + random() * (b - a);
  const districts = new Map();
  const district = name => {
    if (!districts.has(name)) { const group = new THREE.Group(); group.name = `${name} scenery`; root.add(group); districts.set(name, group); }
    return districts.get(name);
  };
  const metrics = { trees: 0, rocks: 0, grass: 0, batches: 0 };

  // -------------------------------------------------------------------------
  // Biome scatter: trees, rocks and ground cover, one instanced batch per block
  // -------------------------------------------------------------------------
  const trunkGeometry = new THREE.CylinderGeometry(.21, .38, 1, 6);
  // Regional canopies use the cheap icosahedron: thousands of them stand between
  // Tidehaven and the Moros, and their silhouette reads the same at road distance.
  const canopyGeometry = new THREE.IcosahedronGeometry(1, 0);
  const coneGeometry = new THREE.ConeGeometry(1, 1, 6);
  const grassGeometry = (() => {
    const positions = [], normals = [];
    for (let b = 0; b < 4; b++) {
      const a = b * 1.9, bx = Math.cos(a) * .16, bz = Math.sin(a) * .16, w = .055, h = .24 + (b % 3) * .085;
      const cx = Math.cos(a + Math.PI / 2) * w, cz = Math.sin(a + Math.PI / 2) * w;
      positions.push(bx - cx, 0, bz - cz, bx + cx, 0, bz + cz, bx + Math.cos(a) * .09, h, bz + Math.sin(a) * .09);
      for (let j = 0; j < 3; j++) normals.push(0, 1, 0);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    return geometry;
  })();
  const trunkMaterial = material('#795e41');
  const leafMaterial = material('#ffffff', { flatShading: true });
  const grassMaterial = material('#ffffff', { side: THREE.DoubleSide });
  const stoneMaterial = material('#8b9187');

  /**
   * Ground cover is per hex too, so its density survives the bigger hex. A biome
   * may name its own count: the Moros's treeless sky wants more grass than a
   * wooded region, and Vastos's cold-adapted tussock is denser still.
   */
  const tuftsPerHex = biome => Math.round((biome.tuftsPerHex ?? (biome.undergrowth === 'none' ? 34 : 26)) * WORLD_SCALE * WORLD_SCALE);

  function scatterBlock(name, block, biome, parent) {
    const trees = [], rocks = [], tufts = [];
    const dense = biome.undergrowth === 'dense';
    for (const cell of block) {
      // Copses in Luscia, an even canopy in Drent: seeded clusters per cell.
      const clusters = biome.treesPerHex && biome.id === 'sparse-woodland' ? 3 : 0;
      const seeds = Array.from({ length: clusters }, () => ({ x: cell.x + range(-22 * WORLD_SCALE, 22 * WORLD_SCALE), z: cell.z + range(-24 * WORLD_SCALE, 24 * WORLD_SCALE) }));
      for (let i = 0; i < biome.treesPerHex; i++) {
        const anchor = clusters ? seeds[i % clusters] : cell;
        // A copse grows with the hex it stands in, so its trees keep their spacing.
        const spread = clusters ? 9 * WORLD_SCALE : METRES_PER_HEX * .48;
        const x = anchor.x + range(-spread, spread), z = anchor.z + range(-spread * 1.1, spread * 1.1);
        if (hexOwnerAt(x, z) !== name || kit.insideVillage(x, z)) continue;
        if (regionClear(x, z, 2.5) || kit.roadDistance(x, z) < 4.2 || kit.riverDistance(x, z) < 12) continue;
        if (groundHeight(x, z) < 1.4) continue;
        if (trees.some(tree => Math.hypot(tree.x - x, tree.z - z) < (dense ? 3.1 : 5.2))) continue;
        // Two biomes carry no conifer at all: the tawny Suval downs, and the Lake Lands,
        // whose timber stands are the broadleaf the lake fleet is built from.
        const noPines = biome.id === 'coastal-downs' || biome.id === 'lake-shelf';
        trees.push({ x, z, s: range(.78, 1.3), pine: !noPines && random() < (dense ? .3 : .16), h: range(7, 11.5), rot: range(0, 6.28) });
      }
      for (let i = 0; i < biome.rocksPerHex; i++) {
        const x = cell.x + range(-26 * WORLD_SCALE, 26 * WORLD_SCALE), z = cell.z + range(-28 * WORLD_SCALE, 28 * WORLD_SCALE);
        if (hexOwnerAt(x, z) !== name || kit.insideVillage(x, z) || regionClear(x, z, 2) || kit.roadDistance(x, z) < 3.4) continue;
        rocks.push({ x, z, s: range(.55, biome.id === 'stone-hills' ? 3.1 : 1.3), rot: range(0, 6.28) });
      }
      for (let i = 0; i < tuftsPerHex(biome); i++) {
        const x = cell.x + range(-27 * WORLD_SCALE, 27 * WORLD_SCALE), z = cell.z + range(-30 * WORLD_SCALE, 30 * WORLD_SCALE);
        if (hexOwnerAt(x, z) !== name || kit.insideVillage(x, z) || kit.roadDistance(x, z) < 2.1) continue;
        // Grass grows on any ground above the tideline, which in the Lake Lands includes the bed of a lake.
        if (kit.waterClear?.(x, z)) continue;
        if (groundHeight(x, z) < 1.2) continue;
        tufts.push({ x, z, s: range(.7, 1.7), rot: range(0, 6.28) });
      }
    }
    if (trees.length) {
      const broad = trees.filter(tree => !tree.pine), pines = trees.filter(tree => tree.pine);
      const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, trees.length);
      const canopies = new THREE.InstancedMesh(canopyGeometry, leafMaterial, Math.max(1, broad.length * 3));
      const cones = new THREE.InstancedMesh(coneGeometry, leafMaterial, Math.max(1, pines.length * 3));
      let broadIndex = 0, pineIndex = 0;
      trees.forEach((tree, index) => {
        const y = groundHeight(tree.x, tree.z), height = tree.h * tree.s;
        dummy.position.set(tree.x, y + height * .41, tree.z);
        dummy.rotation.set(0, tree.rot, 0); dummy.scale.set(tree.s, height * .82, tree.s); dummy.updateMatrix();
        trunks.setMatrixAt(index, dummy.matrix);
        colliders.push({ x: tree.x, z: tree.z, r: .52 * tree.s, kind: 'region-tree' });
        if (tree.pine) for (let c = 0; c < 3; c++) {
          dummy.position.set(tree.x, y + height * (.48 + c * .19), tree.z);
          dummy.rotation.set(0, tree.rot + c * .35, 0);
          dummy.scale.set(height * (.29 - c * .051), height * .49, height * (.29 - c * .051)); dummy.updateMatrix();
          cones.setMatrixAt(pineIndex, dummy.matrix);
          cones.setColorAt(pineIndex++, color.setHSL(range(.25, .31), range(.28, .40), range(.26, .38)));
        } else for (let c = 0; c < 3; c++) {
          const a = tree.rot + c * 2.1, spread = c === 2 ? 0 : height * .15;
          dummy.position.set(tree.x + Math.sin(a) * spread, y + height * (c === 2 ? .95 : .78) + Math.sin(c * 3) * .18, tree.z + Math.cos(a) * spread);
          dummy.rotation.set(range(-.2, .2), a, range(-.18, .18));
          dummy.scale.set(height * (c === 2 ? .29 : .33), height * (c === 2 ? .26 : .31), height * (c === 2 ? .28 : .32)); dummy.updateMatrix();
          canopies.setMatrixAt(broadIndex, dummy.matrix);
          canopies.setColorAt(broadIndex++, color.set(biome.canopy ?? '#5f8a48').offsetHSL(range(-.03, .03), range(-.05, .06), range(-.08, .07)));
        }
      });
      canopies.count = broadIndex; cones.count = pineIndex;
      for (const batch of [trunks, canopies, cones]) {
        if (!batch.count) continue;
        batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); parent.add(batch); metrics.batches++;
      }
      metrics.trees += trees.length;
    }
    if (rocks.length) {
      const batch = new THREE.InstancedMesh(round, stoneMaterial, rocks.length);
      rocks.forEach((rock, index) => {
        const y = groundHeight(rock.x, rock.z);
        dummy.position.set(rock.x, y + rock.s * .28, rock.z);
        dummy.rotation.set(range(-.16, .16), rock.rot, range(-.16, .16));
        dummy.scale.set(rock.s, rock.s * range(.4, .8), rock.s * range(.75, 1.25)); dummy.updateMatrix();
        batch.setMatrixAt(index, dummy.matrix);
        batch.setColorAt(index, color.setHSL(.17, .09, range(.42, .62)));
        if (rock.s > 1.35) colliders.push({ x: rock.x, z: rock.z, r: rock.s * .66, kind: 'ridge-rock' });
      });
      batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); parent.add(batch);
      metrics.rocks += rocks.length; metrics.batches++;
    }
    if (tufts.length) {
      const batch = new THREE.InstancedMesh(grassGeometry, grassMaterial, tufts.length);
      tufts.forEach((tuft, index) => {
        dummy.position.set(tuft.x, groundHeight(tuft.x, tuft.z) + .02, tuft.z);
        dummy.rotation.set(0, tuft.rot, 0); dummy.scale.setScalar(tuft.s); dummy.updateMatrix();
        batch.setMatrixAt(index, dummy.matrix);
        batch.setColorAt(index, color.setHSL(range(.17, .27), range(.3, .46), range(.31, .5)));
      });
      batch.receiveShadow = true; batch.computeBoundingSphere(); parent.add(batch);
      metrics.grass += tufts.length; metrics.batches++;
    }
  }

  // -------------------------------------------------------------------------
  // The Caloss: a real channel, a timber bridge, and the crossing's working camp
  // -------------------------------------------------------------------------
  const luscia = district('Luscia');
  const riverVertices = [], riverIndices = [];
  const riverSamples = [];
  for (let i = 1; i < CALOSS.points.length; i++) {
    const a = CALOSS.points[i - 1], b = CALOSS.points[i];
    const length = Math.hypot(b.x - a.x, b.z - a.z), steps = Math.max(1, Math.round(length / 5));
    for (let step = i === 1 ? 0 : 1; step <= steps; step++) {
      const t = step / steps;
      riverSamples.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t,
        nx: -(b.z - a.z) / length, nz: (b.x - a.x) / length });
    }
  }
  riverSamples.forEach((sample, index) => {
    const y = calossSurface(sample.x, sample.z), half = CALOSS.halfWidth;
    riverVertices.push(sample.x - sample.nx * half, y, sample.z - sample.nz * half,
      sample.x + sample.nx * half, y, sample.z + sample.nz * half);
    if (index) { const v = index * 2; riverIndices.push(v - 2, v, v - 1, v - 1, v, v + 1); }
  });
  const riverGeometry = new THREE.BufferGeometry();
  riverGeometry.setAttribute('position', new THREE.Float32BufferAttribute(riverVertices, 3));
  riverGeometry.setIndex(riverIndices); riverGeometry.computeVertexNormals();
  const riverMaterial = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } }, side: THREE.DoubleSide,
    vertexShader: 'varying vec3 p; void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform float time; varying vec3 p; void main(){float w=sin(p.x*.35-time*1.2+p.z*.9)*sin(p.x*.13+p.z*1.1);vec3 c=vec3(.17,.38,.37)+vec3(.12,.17,.13)*pow(max(w,0.),8.);gl_FragColor=vec4(c,1.);}',
  });
  const riverMesh = new THREE.Mesh(riverGeometry, riverMaterial);
  riverMesh.name = 'The Caloss'; luscia.add(riverMesh);

  // The bridge lane: the one walkable line across the water.
  const crossing = CALOSS.crossing;
  // The deck lies along the road's real line across the water: the chord
  // between the vertices on either bank, not one of the two legs. The road bends
  // a few degrees at the crossing, and at 100 m per hex those legs are long
  // enough that a traveler walking straight over would meet the rail if the deck
  // followed either leg. Its height meets the banks; the terrain ramps the road
  // up or down to it (CALOSS_BRIDGE in src/world-terrain.js).
  const roadHeading = CALOSS_BRIDGE.heading;
  const deckY = CALOSS_BRIDGE.deckY;
  const bridge = new THREE.Group();
  bridge.name = 'The Caloss bridge';
  bridge.position.set(crossing.x, 0, crossing.z);
  bridge.rotation.y = roadHeading;
  luscia.add(bridge);
  const HALF_SPAN = 13.5;
  const bridgeAxis = { x: Math.sin(roadHeading), z: Math.cos(roadHeading) };
  const bridgeSide = { x: Math.cos(roadHeading), z: -Math.sin(roadHeading) };
  const bridgePoint = (alongLocal, sideLocal) => ({
    x: crossing.x + bridgeAxis.x * alongLocal + bridgeSide.x * sideLocal,
    z: crossing.z + bridgeAxis.z * alongLocal + bridgeSide.z * sideLocal,
  });
  /**
   * **The middle of the span is in the river** (the user, 22 September 2026: the bridge is what
   * saves you from swimming, so it has to be a thing you cannot simply walk over). The break sits
   * just past the centre, on the Luscia side of it: `along` runs from the Drent bank at -13.5,
   * which is the bank the traveler arrives on, so he walks out along sound planks and the gap is
   * in front of him - and the repair site, which is the crossing's own centre, is under his feet
   * rather than out in the hole where nothing could reach it.
   *
   * Six metres of it, which is wider than a running jump (6.3 m/s up against 17 of gravity is
   * three quarters of a second in the air), and closed by `damagedColliders` besides, because a
   * jump in this game is a hop: the horizontal movement still goes through the same mover.
   */
  const BREAK = { from: .6, to: 6.6 };
  const broken = along => along >= BREAK.from && along <= BREAK.to;
  for (let along = -HALF_SPAN; along <= HALF_SPAN; along += .7) {
    if (broken(along)) continue;
    box(woodLight, .8, deckY, along, 3.9, .18, .64, bridge);
  }
  for (const side of [-1, 1]) {
    box(darkWood, side * 2.55, deckY - .4, 0, .25, .5, HALF_SPAN * 2, bridge);
    for (let along = -HALF_SPAN; along <= HALF_SPAN; along += 4) post(wood, side * 2.6, deckY + .17, along, .12, 1.6, bridge);
    box(wood, side * 2.6, deckY + .71, 0, .1, .1, HALF_SPAN * 2 - 1, bridge);
    // Thin rails: a line of small colliders, because the deck runs at an angle
    // to the world axes and an axis-aligned box would swallow the whole lane.
    // They reach from the deck's own edge out to where the water blockers begin
    // again, so there is no standable ledge of river beside the deck for a
    // traveler to wander onto and be trapped on. Over the banks the deck is a
    // step off ordinary ground and needs no rail: a wall there would only pen a
    // traveler who walked round the end of it.
    for (let along = -HALF_SPAN; along <= HALF_SPAN; along += .6) {
      const spot = bridgePoint(along, side * 2.8);
      if (kit.riverDistance(spot.x, spot.z) > CALOSS.halfWidth) continue;
      colliders.push({ x: spot.x, z: spot.z, r: .35, kind: 'bridge-rail' });
    }
  }
  const repairedDeck = new THREE.Group();
  repairedDeck.name = 'Caloss repaired western deck';
  luscia.add(repairedDeck); movingGroups.add(repairedDeck);
  repairedDeck.position.copy(bridge.position); repairedDeck.rotation.y = roadHeading;
  for (let along = -HALF_SPAN; along <= HALF_SPAN; along += .7) {
    box(woodLight, -1.58, deckY, along, 1.2, .18, .64, repairedDeck);
    // And the span itself, relaid: mended, the bridge is exactly the bridge it always was.
    if (broken(along)) box(woodLight, .8, deckY, along, 3.9, .18, .64, repairedDeck);
  }
  repairedDeck.visible = false;
  const brokenCord = new THREE.Group();
  brokenCord.name = 'Bridge repair cord';
  brokenCord.position.copy(bridge.position); brokenCord.rotation.y = roadHeading;
  luscia.add(brokenCord); movingGroups.add(brokenCord);
  // A cord strung across the near lip of the break, which is what somebody does before they
  // have the timber to do anything better.
  rope([new THREE.Vector3(-2.45, deckY + .59, BREAK.from), new THREE.Vector3(.8, deckY + .38, BREAK.from),
    new THREE.Vector3(2.75, deckY + .59, BREAK.from)], .045, material('#cfaf6b'), brokenCord);
  // **The break closes the whole lane**, not one side of it: across the deck's full width and out
  // to the rails, so there is no edge of plank to sidle along and no corner to be caught on.
  const damagedColliders = [];
  for (let along = BREAK.from; along <= BREAK.to; along += .8) {
    for (const across of [-1.9, -.7, .5, 1.7, 2.7]) {
      const spot = bridgePoint(along, across);
      damagedColliders.push({ x: spot.x, z: spot.z, r: .7, kind: 'bridge-damage' });
    }
  }
  colliders.push(...damagedColliders);

  const LANE_HALF = 2.3;
  /** Which side of the bridge lane's centre line a point lies, and how far, or Infinity past its ends. */
  function laneOffset(x, z) {
    const dx = x - crossing.x, dz = z - crossing.z;
    if (Math.abs(dx * bridgeAxis.x + dz * bridgeAxis.z) > HALF_SPAN + 3) return Infinity;
    return dx * bridgeSide.x + dz * bridgeSide.z;
  }
  const laneDistance = (x, z) => Math.abs(laneOffset(x, z));
  // Water blocks the channel everywhere but the bridge lane. Small, dense
  // blockers near the crossing keep the lane exactly as wide as the deck; the
  // rails above close the strip between the deck's edge and where they resume.
  for (let i = 1; i < riverSamples.length; i++) {
    const a = riverSamples[i - 1], b = riverSamples[i];
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    const close = Math.min(Math.hypot(a.x - crossing.x, a.z - crossing.z), Math.hypot(b.x - crossing.x, b.z - crossing.z)) < 36;
    const step = close ? 1.5 : 4, offsets = close ? [-6.3, -4.5, -2.7, -.9, .9, 2.7, 4.5, 6.3] : [-4.2, 0, 4.2];
    const radius = close ? 1.3 : 4.0, count = Math.max(1, Math.round(length / step));
    for (let k = 0; k < count; k++) {
      const t = k / count, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      for (const offset of offsets) {
        let px = x + a.nx * offset, pz = z + a.nz * offset;
        // A blocker that would reach into the lane is pushed out until its edge
        // sits on the lane's edge, rather than dropped. Dropping it left a strip
        // of standable river beside the deck, between the lane's cleared width
        // and wherever the next blocker happened to fall, and a traveler who
        // wandered onto that strip was penned there by the rail.
        const lane = laneOffset(px, pz);
        if (Number.isFinite(lane) && Math.abs(lane) < radius + LANE_HALF) {
          if (Math.abs(lane) + radius <= LANE_HALF) continue;
          const push = radius + LANE_HALF - Math.abs(lane), away = Math.sign(lane) || 1;
          px += bridgeSide.x * away * push; pz += bridgeSide.z * away * push;
        }
        // `surface` is the height of the water this marks, so the world can answer what is wet
        // where (`waterAt`, src/world.js): a river is water at its own level, not the sea's.
        colliders.push({ x: px, z: pz, r: radius, kind: 'river-water', surface: calossSurface(px, pz) });
      }
    }
  }

  // Reeds, bank stones and the reedcutters' camp on the Luscia side.
  for (let i = 0; i < 150; i++) {
    const sample = riverSamples[Math.floor(random() * riverSamples.length)];
    const side = random() < .5 ? -1 : 1, offset = CALOSS.halfWidth + range(.6, 4.2);
    const x = sample.x + sample.nx * offset * side, z = sample.z + sample.nz * offset * side;
    if (Math.hypot(x - crossing.x, z - crossing.z) < 9 || regionClear(x, z, 1)) continue;
    const y = groundHeight(x, z), height = range(.7, 1.5);
    post(material('#6a8058'), x, y + height / 2, z, .026, height, luscia);
    if (i % 3 === 0) pebble(material('#7b9084'), x + .4, groundHeight(x + .4, z) + .12, z, .42, .22, .34, luscia);
  }
  leanTo(...xz(-372, 116), '#82917c', .6, luscia);
  const reedCrate = at(-376, 112); crate(reedCrate.x, reedCrate.z, .78, groundHeight(reedCrate.x, reedCrate.z), luscia);
  barrel(...xz(-368, 111), .8, luscia);
  leanTo(...xz(-362, 98), '#7e9780', -.7, luscia);
  for (const { x, z } of [at(-386, 108), at(-330, 118), at(-318, 90)]) {
    const y = groundHeight(x, z);
    post(wood, x - 1.5, y + 1.25, z, .085, 2.5, luscia); post(wood, x + 1.5, y + 1.25, z, .085, 2.5, luscia);
    box(wood, x, y + 2.3, z, 3.2, .11, .13, luscia);
    for (let i = 0; i < 10; i++) post(material('#b19c60'), x - 1.3 + i * .29, y + 1.35, z, .04, 1.8, luscia);
  }
  // The marked fishing bank, upstream of the bridge.
  const bank = CALOSS_BANK.spot, stool = { x: bank.x + 1.9, z: bank.z + 1.4 };
  const stoolY = groundHeight(stool.x, stool.z);
  box(woodLight, stool.x, stoolY + .47, stool.z, .7, .12, .58, luscia);
  for (const dx of [-.25, .25]) for (const dz of [-.2, .2]) post(wood, stool.x + dx, stoolY + .22, stool.z + dz, .055, .44, luscia);
  colliders.push({ x: stool.x, z: stool.z, r: .43, kind: 'fishing-stool' });
  const rest = { x: bank.x - 1.2, z: bank.z - 1.0 }, restY = groundHeight(rest.x, rest.z);
  post(wood, rest.x, restY + .5, rest.z, .055, 1, luscia);
  for (const side of [-1, 1]) { const fork = post(woodLight, rest.x + side * .12, restY + 1.0, rest.z, .035, .35, luscia); fork.rotation.z = -side * .6; }
  wornPatch(bank.x, bank.z, 1.25, '#afa883');

  // -------------------------------------------------------------------------
  // Drent: the Avrel farm clearing cut out of the forest
  // -------------------------------------------------------------------------
  const drent = district('Drent');
  wornPatch(AVREL_CLEARING.x, AVREL_CLEARING.z, AVREL_CLEARING.radius * .8, '#9f8d57', .9);
  cottage(...xz(-222, 52), 5.2, 4.4, 2.9, '#9c7753', '#d8c59c', .35, drent);
  leanTo(...xz(-224, 14), '#c3aa72', .3, drent);
  barrel(...xz(-220, 10), .9, drent);
  const farmCrate = at(-221.4, 12); crate(farmCrate.x, farmCrate.z, .7, groundHeight(farmCrate.x, farmCrate.z), drent);
  // Five fields on the clearing's rim, because the road runs through its middle. The last two
  // stand where the army's ground was (the user, 23 September 2026): measured 28 m and 30 m off
  // the road, on ground flat to 1.3 and 2.0 metres.
  for (const [{ x: fx, z: fz }, width, depth] of [[at(-262, 58), 22, 20], [at(-206, 56), 18, 16], [at(-268, 12), 18, 18],
    [at(-238, -6), 18, 16], [at(-216, -8), 18, 16]]) {
    wornPatch(fx, fz, width * .6, '#9f8d57', depth / width);
    for (let x = -width / 2; x < width / 2; x += 2.4) for (let z = -depth / 2; z < depth / 2; z += 1.6) {
      const px = fx + x + .6, pz = fz + z, y = groundHeight(px, pz);
      post(material('#bfa860'), px, y + .35, pz, .04, .7, drent);
      const ear = pebble(material('#c8b66d'), px, y + .78, pz, .14, .27, .11, drent); ear.rotation.z = .12;
    }
    fence(fx, fz + depth / 2 + 1, width + 2, 0, drent);
    for (const sx of [-1, 1]) {
      const hx = fx + sx * (width / 2 + 2);
      const hay = mesh(cylinder, material('#bba266'), hx, groundHeight(hx, fz) + .8, fz, .82, 1.3, .82, drent);
      hay.rotation.z = Math.PI / 2;
    }
  }
  const mill = at(-222, 62), millY = groundHeight(mill.x, mill.z);
  mesh(new THREE.CylinderGeometry(1.7, 2.6, 8.2, 10), material('#bcb59a'), mill.x, millY + 4.1, mill.z, 1, 1, 1, drent);
  mesh(new THREE.ConeGeometry(2.8, 2.4, 10), material('#746858'), mill.x, millY + 9.3, mill.z, 1, 1, 1, drent);
  box(darkWood, mill.x, millY + 1.2, mill.z + 2.35, 1.15, 2.3, .12, drent);
  colliders.push({ x: mill.x, z: mill.z, r: 2.65, kind: 'windmill' });
  const millSails = new THREE.Group();
  millSails.name = 'Clearing mill sails';
  millSails.position.set(mill.x, millY + 7.3, mill.z + 2.75);
  drent.add(millSails); movingGroups.add(millSails);
  for (let i = 0; i < 4; i++) {
    const sail = new THREE.Group(); sail.rotation.z = i * Math.PI / 2; millSails.add(sail);
    box(wood, 0, 2.8, 0, .16, 5.6, .15, sail);
    box(material('#d3c69e'), .48, 3.5, .03, .95, 3.2, .04, sail);
    for (let r = 2; r <= 5; r += .75) box(woodLight, .43, r, .07, 1.12, .055, .065, sail);
  }
  pebble(darkWood, 0, 0, .04, .35, .35, .2, millSails);
  // The courier's cart lay tumbled here, with three army parcels spilled out of it, until the
  // user took the army out of the clearing (23 September 2026). Silas's marl cart below is a
  // farm cart and stays.
  // Silas Garrow's marl cart, at the Toll House stream (src/geology.js). He digs the marl out of
  // the bank under the Weatherhead and the Avrel families pay him by the load; the cart is how it
  // gets here. It stands on the road side of the house, because the house hides him from anybody
  // walking up from Tidehaven and the cart is what says somebody is working here.
  {
    const toll = DRENT_DEEP_PLACES[1];
    const marlSpot = { x: toll.x - toll.frame.left.x * 3.6, z: toll.z - toll.frame.left.z * 3.6 };
    const marlCart = new THREE.Group();
    marlCart.name = 'Silas Garrow’s marl cart';
    marlCart.position.set(marlSpot.x, groundHeight(marlSpot.x, marlSpot.z) + .75, marlSpot.z);
    marlCart.rotation.y = Math.atan2(toll.frame.dir.x, toll.frame.dir.z); drent.add(marlCart);
    box(woodLight, 0, 0, 0, 1.9, .18, 2.6, marlCart);
    for (const side of [-1, 1]) {
      box(wood, side * .93, .38, 0, .11, .76, 2.6, marlCart);
      const wheel = mesh(new THREE.TorusGeometry(.68, .11, 5, 12), darkWood, side * 1.14, -.08, .1, 1, 1, 1, marlCart);
      wheel.rotation.y = Math.PI / 2;
      for (let k = 0; k < 4; k++) { const spoke = box(wood, side * 1.14, -.08, .1, .09, .09, 1.3, marlCart); spoke.rotation.x = k * Math.PI / 4; }
      // The shafts, tipped down to the ground the way a cart is left standing.
      box(wood, side * .55, -.42, 1.9, .1, .12, 2.2, marlCart);
    }
    // The load: shell marl, which is what a field wants and what a geologist reads.
    const marl = material('#cfc7b4');
    for (const [mx, my, mz, r] of [[0, .3, -.35, .52], [-.32, .24, .35, .4], [.36, .22, .55, .34]])
      pebble(marl, mx, my, mz, r, r * .62, r * .9, marlCart);
    colliders.push({ x: marlSpot.x, z: marlSpot.z, r: 1.5, kind: 'marl-cart' });
  }
  // Luscia: the shrine, the relay, the field at the Lauvel and a burned hamlet
  // -------------------------------------------------------------------------
  const shrine = at(-374, 134), shrineY = groundHeight(shrine.x, shrine.z);
  wornPatch(shrine.x, shrine.z, 5.2, '#b1ae96');
  for (const side of [-1, 1]) box(material('#b0afa0'), shrine.x + side * 1.5, shrineY + 1.05, shrine.z, .5, 2.1, .6, luscia);
  box(material('#a6a99a'), shrine.x, shrineY + 2.3, shrine.z, 3.8, .45, .8, luscia);
  box(material('#919688'), shrine.x, shrineY + .18, shrine.z, 4.2, .36, 1.8, luscia);
  const basin = post(material('#96a89c'), shrine.x, shrineY + .6, shrine.z + .9, .52, .5, luscia);
  basin.name = 'Shrine basin';
  colliders.push({ x: shrine.x, z: shrine.z, r: 1.4, kind: 'shrine' });
  cottage(...xz(-408, 200), 6.7, 5.1, 3.0, '#6d7875', '#c7c4ac', .15, luscia);
  leanTo(...xz(-396, 192), '#aaa48a', .2, luscia); barrel(...xz(-393, 189), .9, luscia);
  const relayCrate = at(-395, 187); crate(relayCrate.x, relayCrate.z, .9, groundHeight(relayCrate.x, relayCrate.z), luscia);
  // The Lauvel: broken carts, a fallen banner, a burial line and an army picket.
  const field = STORY_SITES.lauvelField;
  wornPatch(field.x, field.z, 22, '#9c9a6e', 1.1);
  for (let i = 0; i < 4; i++) {
    const angle = i * 1.7 + .4, x = field.x + Math.sin(angle) * (7 + i * 3.3), z = field.z + Math.cos(angle) * (6 + i * 3.1);
    if (kit.roadDistance(x, z) < 5) continue;
    const y = groundHeight(x, z), wreck = new THREE.Group();
    wreck.position.set(x, y, z); wreck.rotation.set(.18 * (i % 2 ? 1 : -1), angle, .22 * (i % 2 ? -1 : 1)); luscia.add(wreck);
    box(woodLight, 0, .55, 0, 2.2, .18, 2.8, wreck);
    const wheel = mesh(new THREE.TorusGeometry(.72, .11, 5, 10), darkWood, 1.2, .5, .3, 1, 1, 1, wreck);
    wheel.rotation.y = Math.PI / 2;
    box(wood, -1.1, .5, 0, .12, .8, 2.9, wreck);
    colliders.push({ x, z, r: 1.7, kind: 'lauvel-wreck' });
  }
  for (let i = 0; i < 11; i++) {
    const x = field.x - 14 + i * 2.6, z = field.z + 13 + Math.sin(i * .9) * 1.4, y = groundHeight(x, z);
    pebble(material('#9aa08f'), x, y + .16, z, .34, .3, .26, luscia);
    const marker = box(darkWood, x, y + .52, z, .1, .78, .1, luscia); marker.rotation.z = (i % 3 - 1) * .07;
  }
  const bannerPole = post(wood, field.x + 4, groundHeight(field.x + 4, field.z - 8) + 1.1, field.z - 8, .09, 2.2, luscia);
  bannerPole.rotation.z = .7;
  const banner = box(material('#5d6f86'), field.x + 5.4, groundHeight(field.x + 4, field.z - 8) + .3, field.z - 7.4, 1.5, .06, .9, luscia);
  banner.name = 'Fallen rebel banner';
  for (const [dx, dz] of [[-16, -6], [-14, 8]]) {
    const x = field.x + dx, z = field.z + dz, y = groundHeight(x, z);
    if (kit.roadDistance(x, z) < 5) continue;
    for (const sx of [-1, 1]) post(wood, x + sx * 1.4, y + .9, z, .08, 1.8, luscia);
    mesh(roofGeometry(3.4, 2.8, .8), material('#9d9377'), x, y + 1.8, z, 1, 1, 1, luscia);
    colliders.push({ x, z, r: 1.6, kind: 'legion-picket' });
  }
  // Ten days on: the fallen still on the field, arrows in the turf, crows, and the valley's burial ground (src/lauvel-aftermath.js).
  const lauvelField = createLauvelField({ parent: luscia, material, box, mesh, post, groundHeight, colliders, roadDistance: kit.roadDistance });
  // -------------------------------------------------------------------------
  // Nothom: Luscia's market town, with the main road through its square
  // -------------------------------------------------------------------------
  const square = LUMBER_TOWN.square, squareY = groundHeight(square.x, square.z);
  const roadAngle = Math.atan2(LUMBER_TOWN.along.x, LUMBER_TOWN.along.z);
  // A house set back on the east side faces west across the road, and the reverse.
  const faceRoad = b => Math.atan2(-Math.sign(b) * LUMBER_TOWN.across.x, -Math.sign(b) * LUMBER_TOWN.across.z);
  wornPatch(square.x, square.z, 15, '#a89b78', 1);
  for (const [a, b, radius] of [[-16, 6, 7], [4, 17, 9], [10, 20, 6], [8, -8, 6]])
    { const spot = townPoint(a, b); wornPatch(spot.x, spot.z, radius, '#a3987a', 1); }
  // Ten buildings: the inn, five houses, the town store, the relay post, the
  // sawmill shed and the log store above the sawpits.
  for (const [a, b, width, depth, height, roof, wall] of [
    [-11, 10, 8.4, 6.6, 3.5, '#6f7a70', '#cdc4a6'],   // the Sawyer's Rest
    [-19, 8, 6.0, 5.0, 3.0, '#71786b', '#c9c2a4'],
    [-15, -10, 5.8, 4.8, 3.0, '#6b7469', '#d0c7a8'],
    [11, -12, 6.2, 5.0, 3.1, '#767c6d', '#c6bfa2'],
    [15, 9, 5.8, 5.2, 3.0, '#6d7568', '#ccc3a5'],
    [20, -9, 6.0, 4.8, 3.0, '#737a6c', '#c8c0a3'],
    [-4, -12, 5.4, 4.4, 2.8, '#6a7165', '#c4bd9f'],   // the town store
  ]) {
    const spot = townPoint(a, b);
    cottage(spot.x, spot.z, width, depth, height, roof, wall, faceRoad(b) + (a % 2 ? .08 : -.06), luscia);
  }
  // The well on the square: a stone ring, a frame and a bucket.
  const well = townPoint(-2, 5), wellY = groundHeight(well.x, well.z);
  for (let i = 0; i < 8; i++) {
    const angle = i / 8 * Math.PI * 2;
    box(rockMat, well.x + Math.sin(angle) * .95, wellY + .45, well.z + Math.cos(angle) * .95, .5, .9, .5, luscia);
  }
  for (const side of [-1, 1]) post(wood, well.x + LUMBER_TOWN.across.x * side * 1.1, wellY + 1.5, well.z + LUMBER_TOWN.across.z * side * 1.1, .1, 2.2, luscia);
  box(woodLight, well.x, wellY + 2.6, well.z, 2.6, .16, .5, luscia).rotation.y = roadAngle;
  barrel(well.x + 1.4, well.z + 1.2, .8, luscia, groundHeight(well.x + 1.4, well.z + 1.2));
  colliders.push({ x: well.x, z: well.z, r: 1.4, kind: 'town-well' });
  // Three market stalls: posts, a canvas roof and a counter.
  for (const [a, b, tint] of [[3, 7, '#b8a582'], [7, 5, '#a9b0a0'], [-5, 7, '#c0ab83']]) {
    const spot = townPoint(a, b), y = groundHeight(spot.x, spot.z);
    const stall = new THREE.Group(); stall.position.set(spot.x, y, spot.z); stall.rotation.y = roadAngle; luscia.add(stall);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) post(wood, sx * 1.5, 1.1, sz * 1.0, .09, 2.2, stall);
    mesh(roofGeometry(3.6, 2.6, .7), material(tint), 0, 2.2, 0, 1, 1, 1, stall);
    box(woodLight, 0, .85, .9, 3.0, .14, .7, stall);
    for (let i = 0; i < 3; i++) box(material(i % 2 ? '#8e7f5f' : '#a08a63'), -.8 + i * .8, 1.02, .9, .55, .2, .5, stall);
    colliders.push({ x: spot.x, z: spot.z, r: 1.5, kind: 'market-stall' });
  }
  // The army's relay post on the corner of the square.
  const relayPost = townPoint(9, -10), relayY = groundHeight(relayPost.x, relayPost.z);
  leanTo(relayPost.x, relayPost.z, '#a89d84', roadAngle, luscia);
  const desk = townPoint(6.6, -8.2), deskY = groundHeight(desk.x, desk.z);
  box(woodLight, desk.x, deskY + .78, desk.z, 2.0, .14, .9, luscia).rotation.y = roadAngle;
  colliders.push({ x: desk.x, z: desk.z, r: 1.0, kind: 'relay-desk' });
  post(wood, relayPost.x + 3.0, relayY + 2.0, relayPost.z, .1, 4.0, luscia);
  const relayStandard = box(material('#8c3f38'), relayPost.x + 3.3, relayY + 3.4, relayPost.z, .62, .9, .05, luscia);
  relayStandard.name = 'Army relay standard';
  colliders.push({ x: relayPost.x + 3.0, z: relayPost.z, r: .3, kind: 'relay-standard' });
  crate(townPoint(11, -7).x, townPoint(11, -7).z, .85, groundHeight(townPoint(11, -7).x, townPoint(11, -7).z), luscia);
  // The timber yard: an open sawmill shed, the sawpit and stacked logs.
  const shed = townPoint(4, 17), shedY = groundHeight(shed.x, shed.z);
  const shedGroup = new THREE.Group(); shedGroup.position.set(shed.x, shedY, shed.z); shedGroup.rotation.y = roadAngle; luscia.add(shedGroup);
  for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) post(wood, sx * 4.2, 1.6, sz * 3.2, .16, 3.2, shedGroup);
  mesh(roofGeometry(10.4, 8.0, 2.2), material('#8d8168'), 0, 3.2, 0, 1, 1, 1, shedGroup);
  box(woodLight, 0, .95, -2.6, 8.6, .2, 1.1, shedGroup);
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    colliders.push({ x: shed.x + (sx * 4.2 * Math.cos(roadAngle) + sz * 3.2 * Math.sin(roadAngle)),
      z: shed.z - (sx * 4.2 * Math.sin(roadAngle)) + sz * 3.2 * Math.cos(roadAngle), r: .5, kind: 'sawmill-post' });
  for (const [a, b, count] of [[10, 16, 4], [-2, 18, 3], [8, 21, 3]]) {
    const stack = townPoint(a, b), stackY = groundHeight(stack.x, stack.z);
    for (let i = 0; i < count; i++) {
      const log = mesh(cylinder, darkWood, stack.x, stackY + .42 + Math.floor(i / 2) * .72, stack.z + (i % 2 ? .8 : -.05), .36, 4.6, .36, luscia);
      log.rotation.set(0, roadAngle, Math.PI / 2);
    }
    colliders.push({ x: stack.x, z: stack.z, r: 2.4, kind: 'log-stack' });
  }
  const sawpit = townPoint(2, 12);
  wornPatch(sawpit.x, sawpit.z, 3.2, '#8d8163', 1);
  for (const side of [-1, 1]) post(wood, sawpit.x + LUMBER_TOWN.along.x * side * 1.8, groundHeight(sawpit.x, sawpit.z) + .85, sawpit.z + LUMBER_TOWN.along.z * side * 1.8, .12, 1.7, luscia);
  // Fences and a paddock behind the eastern houses.
  for (const [a, b, length] of [[-24, 13, 11], [-9, 16, 9], [18, -13, 8]]) {
    const spot = townPoint(a, b);
    fence(spot.x, spot.z, length, roadAngle + Math.PI / 2, luscia);
  }

  // A burned hamlet: four roofless walls and a standing chimney.
  const hamlet = STORY_SITES.burnedHamlet;
  wornPatch(hamlet.x, hamlet.z, 11, '#8a7f63', 1);
  for (let i = 0; i < 4; i++) {
    const angle = i * 1.6, x = hamlet.x + Math.sin(angle) * 6.5, z = hamlet.z + Math.cos(angle) * 6.0, y = groundHeight(x, z);
    if (kit.roadDistance(x, z) < 6) continue;
    for (const side of [-1, 1]) box(material('#6f6656'), x + side * 2.2, y + .95, z, .4, 1.9, 4.2, luscia);
    box(material('#6f6656'), x, y + .7, z - 2.1, 4.4, 1.4, .4, luscia);
    colliders.push({ x: x + 2.2, z, hx: .4, hz: 2.2, kind: 'hamlet-wall' });
    colliders.push({ x: x - 2.2, z, hx: .4, hz: 2.2, kind: 'hamlet-wall' });
    if (i === 0) {
      box(material('#7d7364'), x, y + 2.5, z + 1.6, 1.1, 5.0, 1.1, luscia);
      colliders.push({ x, z: z + 1.6, r: .8, kind: 'hamlet-chimney' });
    }
  }

  // -------------------------------------------------------------------------
  // Moros Plain: the gate, the army camp and the contested stockade
  // -------------------------------------------------------------------------
  const moros = district('Moros Plain');
  // The Moros gate, the outpost's walls, tents and standard and the forward stockade are built by
  // `moros-works.js` to the shared fortification standard; the horse line stays here with its horses.
  // The army's horse line, where the traveler's horse is claimed.
  const hitch = STORY_SITES.horseHitch, hitchY = groundHeight(hitch.x, hitch.z);
  for (let i = 0; i <= 6; i++) post(wood, hitch.x + i * 2.4, hitchY + .65, hitch.z, .1, 1.3, moros);
  box(woodLight, hitch.x + 7.2, hitchY + 1.15, hitch.z, 16.8, .12, .12, moros);
  colliders.push({ x: hitch.x + 7.2, z: hitch.z, hx: 8.4, hz: .22, kind: 'horse-line' });
  for (let i = 0; i < 4; i++) {
    const x = hitch.x + 1.8 + i * 3.6, z = hitch.z - 1.6, y = groundHeight(x, z);
    if (kit.roadDistance(x, z) < 4) continue;
    // The horses themselves are animated models placed by the game; only their footprint lives here.
    colliders.push({ x, z, r: 1.15, kind: 'horse' });
  }

  // -------------------------------------------------------------------------
  // East Suval: the border post, the waystation, Elod and a bandit lookout
  // -------------------------------------------------------------------------
  const suval = district('East Suval');
  const border = STORY_SITES.suvalBorderPost, borderY = groundHeight(border.x, border.z);
  const borderNormal = roadNormal(border.x, border.z);
  wornPatch(border.x, border.z, 8, '#aaa182');
  for (const side of [-1, 1]) {
    const x = border.x + borderNormal.x * side * 5.6, z = border.z + borderNormal.z * side * 5.6, y = groundHeight(x, z);
    box(material('#9aa08f'), x, y + .7, z, 1.0, 1.4, 1.0, suval);
    post(wood, x, y + 1.9, z, .14, 1.2, suval);
    colliders.push({ x, z, r: .8, kind: 'border-pillar' });
  }
  // The barrier itself is raised: a guarded post, not a wall across the road.
  const barrier = box(material('#c7b27a'), border.x, borderY + 2.3, border.z, 11.4, .22, .22, suval);
  barrier.rotation.y = Math.atan2(borderNormal.x, borderNormal.z);
  barrier.name = 'Border barrier';
  leanTo(border.x - 7, border.z + 5, '#a69b84', .5, suval);
  crate(border.x - 9, border.z + 7, .8, groundHeight(border.x - 9, border.z + 7), suval);
  const waystation = STORY_SITES.waystation, ruinY = groundHeight(waystation.x, waystation.z);
  wornPatch(waystation.x, waystation.z, 4.4, '#b1ae96');
  for (const side of [-1, 1]) {
    const x = waystation.x + side * 2.4;
    box(material('#b0afa0'), x, ruinY + 1.65, waystation.z, .95, 3.3, 1.2, suval);
    box(material('#919688'), x, ruinY + .25, waystation.z, 1.45, .5, 1.55, suval);
    colliders.push({ x, z: waystation.z, r: .7, kind: 'ruin-pillar' });
    const arch = box(material('#a6a99a'), waystation.x + side * 1.15, ruinY + 3.47, waystation.z, 2.9, .65, 1.2, suval);
    arch.rotation.z = -side * .14;
  }
  for (let i = 0; i < 5; i++) box(material('#a9aa99'), waystation.x - 1.6 + i * .8, ruinY + .055, waystation.z + 2.0, .65, .11, 1.0, suval);
  // Elod itself — its gate, its walls, the Threshold and its harbour — is built
  // by src/east-suval-world.js now; the three cottages and the bare lintel that
  // stood here were the placeholder for it.
  const lookout = STORY_SITES.banditLookout, lookoutY = groundHeight(lookout.x, lookout.z);
  for (let i = 0; i < 7; i++) {
    const angle = i / 7 * Math.PI * 2, x = lookout.x + Math.sin(angle) * 4.2, z = lookout.z + Math.cos(angle) * 4.0;
    const y = groundHeight(x, z), size = 1.1 + (i % 3) * .45;
    const stone = pebble(material(i % 2 ? '#8b9187' : '#b2afa0'), x, y + size * .4, z, size, size * .8, size * .9, suval);
    stone.rotation.set(.1, angle, .1);
    colliders.push({ x, z, r: size * .7, kind: 'ridge-rock' });
  }
  post(wood, lookout.x, lookoutY + 1.5, lookout.z, .12, 3.0, suval);

  // -------------------------------------------------------------------------
  // Biome scatter last, so every yard and camp above is already reserved
  // -------------------------------------------------------------------------
  for (const name of REGION_ORDER) {
    const biome = REGION_BIOMES[name], parent = district(name);
    if (biome.ownScatter) continue;   // Pueth scatters its own woods (src/pueth-scenery.js)
    // A region may ask for bigger scatter blocks: Elagos is the largest of them, and
    // its stands of lake timber read the same from two blocks as from six.
    for (const block of cellBlocks(name, biome.blockHexes)) scatterBlock(name, block, biome, parent);
  }

  // The frontier: the end of the built world, west of the army camp.
  for (let z = FRONTIER.z - 170; z <= FRONTIER.z + 170; z += 8) {
    const y = groundHeight(FRONTIER.barrierX, z);
    post(wood, FRONTIER.barrierX, y + .64, z, .085, 1.28, moros);
    if (z + 8 <= FRONTIER.z + 170) rope([
      new THREE.Vector3(FRONTIER.barrierX, y + 1.0, z),
      new THREE.Vector3(FRONTIER.barrierX, groundHeight(FRONTIER.barrierX, z + 4) + .8, z + 4),
      new THREE.Vector3(FRONTIER.barrierX, groundHeight(FRONTIER.barrierX, z + 8) + 1.0, z + 8),
    ], .03, cream, moros);
  }
  colliders.push({ x: FRONTIER.barrierX, z: FRONTIER.z, hx: .1, hz: 172, kind: 'frontier' });
  wornPatch(FRONTIER.x, FRONTIER.z, 7, '#aca990');

  return {
    metrics, riverMaterial, riverSamples, districts,
    bridge: { deckY, heading: roadHeading, halfSpan: HALF_SPAN, axis: bridgeAxis, side: bridgeSide, crossing },
    repairedDeck, brokenCord, damagedColliders, millSails, lauvelField,
    bank: { spot: bank, surfaceY: calossSurface(bank.x, bank.z), castPoint: { x: CALOSS_BANK.cast.x, y: calossSurface(CALOSS_BANK.cast.x, CALOSS_BANK.cast.z) + .035, z: CALOSS_BANK.cast.z } },
    riverSurface: calossSurface,
  };
}
