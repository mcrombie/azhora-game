// `WATERLINE` is the line the predicates judge wet by; `waterAt` below answers it for the sea
// and each river's own surface for a river (src/game-state.js). game-state imports nothing, so
// there is no cycle here.
import { WATERLINE } from './game-state.js';
import * as THREE from 'three';
import { REGIONAL_PLACES, REGIONAL_NPC_POSITIONS, REGIONAL_ACTIVITY_SITES, REGIONAL_PATHS, regionalFeatureClear, createRegionalPlaces } from './regional-places.js';
import { regions, regionAt, isOpenCountry, regionNpcPositions, journeySites, regionFirePits, regionRepairBenches, regionLandmarks } from './regions.js';
import { forestPlaceDefinitions, forestPlacePaths, forestWoodcutter, forestFeatureClear, tintForestGround, createForestPlaces } from './forest-places.js';
import { FOREST_HIDEOUT, createForestHideout } from './forest-hideout-world.js';
import {
  VILLAGE, villageToWorld, worldToVillage, WORLD_BOUNDS, SEA_LEVEL, MAIN_ROAD, SUVAL_ROAD, ONWARD_ROAD,
  CALOSS, CALOSS_BANK, CALOSS_GATE, FERNWAY_REST, FRONTIER, STORY_SITES, AVREL_CLEARING,
  calossDistance, landDistance, SOLIS, solisPoint,
} from './region-world.js';
import { villageWeight, villageBase, bedrockHeight, groundWithRiver, groundTint, calossSurface, puethRiverSurface, smooth, lerp } from './world-terrain.js';
import { toWorld, WORLD_SCALE } from './world-scale.js';
import { createSigns, SIGN_COLOURS } from './signs.js';
import { buildMorosWorks } from './moros-works.js';
import { OUTPOST_BENCH, OUTPOST_FIRE, STOCKADE_TRACK_BEND, STOCKADE_APPROACH, OUTPOST_CIRCUIT, STOCKADE_CIRCUIT, enclosureOf } from './outpost.js';
import { WAYSIDE_LANDMARKS } from './wayside.js';
import { buildFrontierWorks } from './frontier-works.js';
import { buildPlaceWorks } from './place-works.js';
import { PLACE_LANDMARKS } from './places.js';
import { FRONTIER_ROUTE, FRONTIER_LANDMARKS, FRONTIER_GATE, FRONTIER_APPROACH } from './frontier.js';
import { SOLIS_ROAD } from './region-world.js';
import { WEST_SUVAL_LANDMARKS, SOLIS_ENCLOSURES, WEST_SUVAL_SEA } from './west-suval.js';
import { atticDeckHeight } from './wine-attic.js';
import { createBrandyYard } from './brandy-yard.js';
import { createLighthouse } from './lighthouse-world.js';
import { ELOD_LIGHT } from './rival-light.js';
import { createWoodlot } from './woodlot-world.js';
import { createHomestead } from './homestead-world.js';
import { inKoopwood } from './woodcutting.js';
import { createWestSuvalScenery } from './west-suval-world.js';
import { createWineryScenery } from './winery-world.js';
import { buildBirdGarden, birdGardenSites, inBirdGarden } from './bird-garden.js';
import { createRegionScenery, regionClear } from './world-regions.js';
import { createColliderGrid } from './collider-grid.js';
import { OPENING_FIGHT_GROUND } from './opening-fights.js';
import { HIDEOUT_SITE, hideoutToWorld, PUETH_ROAD, HIDEOUT_APPROACH_TRAIL, TESSEN_BRIDGE, PUETH_RIVERS, PUETH_NPC_POSITIONS, PUETH_LANDMARKS, puethRiverDistance } from './pueth-world.js';
import { createPuethScenery } from './pueth-scenery.js';
import { PEBLOS_LANDMARKS, PEBLOS_NPC_POSITIONS, PEBLOS_ISLANDS, COBBLE_QUAY, quayHeight, islandAt } from './peblos-world.js';
import { createPeblosScenery } from './peblos-scenery.js';
import { RENA_ROAD, RENA_LANDMARKS, RENA_NPC_POSITIONS } from './rena.js';
import { buildRenaWorks } from './rena-works.js';
import { EAST_SUVAL_PLACES, ELOD_STANDS, EAST_SUVAL_STANDS, ELOD_QUAY, ELOD_LANDING, quayHeight as elodQuayHeight } from './east-suval.js';
import { createEastSuvalScenery } from './east-suval-world.js';
import { IZOL_LANDMARKS, IZOL_NPC_POSITIONS, IZOL_PATHS, IZOL_SEA, IZOL_QUAY, izolDeckHeight } from './izol-world.js';
import { createIzolScenery } from './izol-scenery.js';
import { ELAGOS_ROADS, AMBRON_ROAD, LAKE_ROAD, ELAGOS_LANDMARKS, ELAGOS_CHART_WATERS, inElagosWater } from './elagos-world.js';
import { AMBRON_ENCLOSURE, ambronDeckHeight } from './ambron.js';
import { ELAGOS_NPC_POSITIONS } from './ambron-people.js';
import { createElagosScenery } from './elagos-scenery.js';
import { AMOD_ROAD, AMOD_NPC_POSITIONS, AMOD_LANDMARKS, tarvelDistance } from './amod-world.js';
import { amodTerrainSink } from './amod-terraces.js';
import { createAmodScenery } from './amod-scenery.js';
import { WEST_REGION_LANDMARKS, westBareGround, westRiverDistance } from './west-regions.js';
import { createWestScenery } from './west-regions-scenery.js';

/**
 * The playable world of Drent, Luscia, the Moros Plain and East Suval.
 *
 * Shapes, sizes and positions come from the authored atlas through
 * `region-world.js`; north is -Z and one authored hex is METRES_PER_HEX metres.
 * The literals outside Tidehaven are still written in the authored 56 m frame
 * and converted by `at()` at the point of use (see `world-scale.js`). Tidehaven, the
 * Greenway tutorial and the woodland places were built with the sea to the
 * south, so they are carried over whole inside `villageRoot`, a group turned a
 * quarter turn onto Drent's east-facing coast. Everything inside that group
 * still speaks the village's own local metres; everything else is world metres.
 */
export function createWorld(scene, { spatialBatches = true } = {}) {
  /** An authored (56 m per hex) point in world metres; Tidehaven's own frame never uses it. */
  const at = (x, z) => { const p = toWorld(x, z); return { x: p.x, z: p.z }; };
  let seed = 341937;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a, b) => a + random() * (b - a);
  let terrainSeed = 0x5a2f11b7;
  const trandom = () => { terrainSeed = (Math.imul(terrainSeed, 1664525) + 1013904223) >>> 0; return terrainSeed / 4294967296; };
  const trange = (a, b) => a + trandom() * (b - a);
  const clamp = THREE.MathUtils.clamp;
  const colliders = [];
  const training = { x: 3, z: -12 };
  const repairBench = { x: 6, z: -6.4, name: 'Village repair bench' };
  const doomsayer = { x: -9.3, z: 2.2 }, pondFisher = { x: 20.4, z: -82 };
  const pond = { x: 27, z: -77, radius: 5.4, surfaceY: 0,
    fishingSpot: { x: 20.4, z: -77 }, castPoint: { x: 24.8, y: 0, z: -77.2 } };
  const firePits = [
    { id: 'village-fire', x: -9.2, z: -2.3, fireX: -10.5, fireZ: -2.3 },
    { id: 'pond-fire', x: 17.8, z: -72, fireX: 17.8, fireZ: -70.7 },
  ];
  const pondPaths = [
    [{ x: 0, z: -74 }, { x: 8, z: -74.7 }, { x: 15, z: -76.7 }, pond.fishingSpot],
    [{ x: 16.1, z: -77 }, { x: 18, z: -80 }, pondFisher],
    [{ x: 12.7, z: -76 }, { x: 15, z: -73 }, firePits[1]],
  ];
  function pondPathDistance(x, z) {
    let distance = Infinity;
    for (const path of pondPaths) for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i], dx = b.x - a.x, dz = b.z - a.z;
      const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
      distance = Math.min(distance, Math.hypot(x - a.x - dx * t, z - a.z - dz * t));
    }
    return distance;
  }
  const featureClear = (x, z, tree = false) => Math.hypot(x - pond.x, z - pond.z) < pond.radius + (tree ? 2.8 : .1)
    || pondPathDistance(x, z) < (tree ? 2.35 : 1.45)
    || [doomsayer, pondFisher, ...firePits].some(p => Math.hypot(x - p.x, z - p.z) < (tree ? 2.1 : 1.0))
    || firePits.some(p => Math.hypot(x - p.fireX, z - p.fireZ) < (tree ? 2.1 : 1.25))
    || forestFeatureClear(x, z, tree);
  const encounter = { x: 0, z: -34, radius: 8 };
  const northTrail = { x: -5, z: -108, name: FERNWAY_REST.name };
  const border = { x: 0, z: -156, name: CALOSS_GATE.name, barrierZ: -162,
    regionName: CALOSS_GATE.regionName, open: true };
  const routeNorth = [
    { x: 0, z: -72 }, { x: -11, z: -86 }, { x: -5, z: -108 },
    { x: 8, z: -128 }, { x: 3, z: -143 }, { x: border.x, z: border.z },
  ];
  const inLessonSpace = (x, z, margin = 0) => Math.hypot(x - training.x, z - training.z) < 2.5 + margin
    || Math.hypot(x - encounter.x, z - encounter.z) < encounter.radius + margin;

  const world = new THREE.Group();
  world.name = 'Drent and the road to the Moros';
  scene.add(world);
  // Tidehaven, carried over whole onto Drent's east coast.
  const villageRoot = new THREE.Group();
  villageRoot.name = 'Tidehaven and the Greenway';
  villageRoot.position.set(VILLAGE.x, 0, VILLAGE.z);
  villageRoot.rotation.y = VILLAGE.yaw;
  world.add(villageRoot);
  const isLocal = parent => { for (let node = parent; node; node = node.parent) if (node === villageRoot) return true; return false; };
  /** Village colliders are authored locally; the world only ever sees world metres. */
  function vpush(collider) {
    const point = villageToWorld(collider.x, collider.z);
    collider.x = point.x; collider.z = point.z;
    if (Number.isFinite(collider.angle)) collider.angle += VILLAGE.yaw;
    if (collider.hx !== undefined) { const half = collider.hx; collider.hx = collider.hz; collider.hz = half; }
    colliders.push(collider);
    return collider;
  }
  // The goblin camp is authored in its own local metres too; it stands in the woods of southern Pueth (src/pueth-world.js).
  const hideoutRoot = new THREE.Group();
  hideoutRoot.name = 'Goblin camp site';
  hideoutRoot.position.set(HIDEOUT_SITE.x, 0, HIDEOUT_SITE.z);
  hideoutRoot.rotation.y = HIDEOUT_SITE.yaw;
  world.add(hideoutRoot);
  const hideoutPlaced = new WeakSet();
  const hideoutColliders = new Proxy(colliders, {
    get(target, property) {
      // A collider is converted once; the camp re-adds its supply collider when a save is restored.
      if (property === 'push') return (...items) => { for (const item of items) { if (!hideoutPlaced.has(item)) { const p = hideoutToWorld(item.x, item.z); item.x = p.x; item.z = p.z; if (Number.isFinite(item.angle)) item.angle += HIDEOUT_SITE.yaw; hideoutPlaced.add(item); } target.push(item); } return target.length; };
      const value = target[property];
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  const localColliders = new Proxy(colliders, {
    get(target, property) {
      if (property === 'push') return (...items) => { for (const item of items) vpush(item); return target.length; };
      const value = target[property];
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });

  const materials = {};
  const material = (color, extra = {}) => {
    const key = `${color}:${JSON.stringify(extra)}`;
    return materials[key] ||= new THREE.MeshStandardMaterial({ color, roughness: 0.93, ...extra });
  };
  const wood = material('#71523a');
  const woodLight = material('#ab7950');
  const darkWood = material('#59432e');
  const cream = material('#eee0ac');
  const rockMat = material('#85998a');
  const windowMat = material('#ffe4a0', { emissive: '#ffd287', emissiveIntensity: 0.52, roughness: 0.35 });
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 7);
  const round = new THREE.IcosahedronGeometry(1, 0);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  function mesh(geometry, mat, x, y, z, sx = 1, sy = 1, sz = 1, parent = villageRoot) {
    const item = new THREE.Mesh(geometry, mat);
    item.position.set(x, y, z);
    item.scale.set(sx, sy, sz);
    item.castShadow = true;
    item.receiveShadow = true;
    parent.add(item);
    return item;
  }
  const box = (mat, x, y, z, sx, sy, sz, parent = villageRoot) => mesh(cube, mat, x, y, z, sx, sy, sz, parent);
  const post = (mat, x, y, z, radius, height, parent = villageRoot) => mesh(cylinder, mat, x, y, z, radius, height, radius, parent);
  const pebble = (mat, x, y, z, sx, sy, sz, parent = villageRoot) => mesh(round, mat, x, y, z, sx, sy, sz, parent);

  // ---------------------------------------------------------------------------
  // Ground
  // ---------------------------------------------------------------------------
  /** Tidehaven's own field, including its pond, in local metres. */
  function localGround(x, z) {
    const original = villageBase(x, z), distance = Math.hypot(x - pond.x, z - pond.z);
    if (distance < pond.radius) return pond.surfaceY - .85 * (1 - smooth(pond.radius - 1.5, pond.radius, distance));
    if (distance < pond.radius + 2.4) return THREE.MathUtils.lerp(pond.surfaceY, original, smooth(pond.radius, pond.radius + 2.4, distance));
    return original;
  }
  /** World ground: the hex biomes, Tidehaven where it stands, the Caloss channel. */
  function groundHeight(x, z) {
    const local = worldToVillage(x, z), weight = villageWeight(local.x, local.z);
    if (weight <= 0) return groundWithRiver(x, z);
    const village = localGround(local.x, local.z);
    if (weight >= 1) return village;
    return lerp(groundWithRiver(x, z), village, weight);
  }
  pond.surfaceY = villageBase(pond.x, pond.z) - .55;
  pond.castPoint.y = pond.surfaceY + .035;
  const pondWorld = villageToWorld(pond.x, pond.z);

  let bridgeDeck = null;
  const bridgeDecks = [];
  /** The bridge deck under a point, if any: the Caloss's, or the Tessen's in Pueth. */
  function deckAt(x, z) {
    for (const deck of bridgeDecks) {
      const dx = x - deck.crossing.x, dz = z - deck.crossing.z;
      const along = dx * deck.axis.x + dz * deck.axis.z;
      const across = dx * deck.side.x + dz * deck.side.z;
      if (Math.abs(along) <= deck.halfSpan + .4 && Math.abs(across) <= 2.55) return deck;
    }
    return null;
  }
  function heightAt(x, z) {
    const local = worldToVillage(x, z);
    // The pier deck, exactly as Tidehaven always had it.
    if (Math.abs(local.x) < 2.2 && local.z >= 22 && local.z <= 48) return 1.8;
    // Cobble's quay, out over the water of the bay in Peblos.
    const quay = quayHeight(x, z);
    if (quay !== null) return quay;
    // Elod's quayside, along the waterline under the city's revetment.
    const elodQuay = elodQuayHeight(x, z);
    if (elodQuay !== null) return elodQuay;
    // Izolveth's quay and the two moles that close its harbour, in West Izol.
    const izolDeck = izolDeckHeight(x, z);
    if (izolDeck !== null) return izolDeck;
    // Tharganhom's stair and attic floor, on the main street of Solis.
    const attic = atticDeckHeight(x, z, groundHeight);
    if (attic !== null) return attic;
    const deck = deckAt(x, z);
    if (deck) return deck.deckY + .09;
    // Ambron's causeway, over the narrows and down to the made ground of each bank.
    const causeway = ambronDeckHeight(x, z);
    if (causeway !== null) return causeway;
    return groundHeight(x, z);
  }

  const fishingSpots = [
    { id: 'willowmere', name: 'Willowmere Pond', x: pondWorld.x, z: pondWorld.z, radius: pond.radius, surfaceY: pond.surfaceY,
      fishingSpot: villageToWorld(pond.fishingSpot.x, pond.fishingSpot.z),
      castPoint: { ...villageToWorld(pond.castPoint.x, pond.castPoint.z), y: pond.castPoint.y } },
    { id: 'reedwater', name: 'Caloss fishing bank', x: CALOSS_BANK.spot.x, z: CALOSS_BANK.spot.z,
      surfaceY: calossSurface(CALOSS_BANK.cast.x, CALOSS_BANK.cast.z),
      fishingSpot: { ...CALOSS_BANK.spot },
      castPoint: { x: CALOSS_BANK.cast.x, y: calossSurface(CALOSS_BANK.cast.x, CALOSS_BANK.cast.z) + .035, z: CALOSS_BANK.cast.z } },
    // A bank on the Tessen, downstream of the bridge on the Pueth side.
    { id: 'tessen-bank', name: 'Tessen bank', x: -80, z: -201.5, surfaceY: puethRiverSurface(PUETH_RIVERS[0], -80, -193.5),
      fishingSpot: { x: -80, z: -201.5 }, castPoint: { x: -80, y: puethRiverSurface(PUETH_RIVERS[0], -80, -193.5) + .035, z: -193.5 } },
  ];
  let activeFishingSpot = fishingSpots[0];

  // ---------------------------------------------------------------------------
  // Roads: drawn in world metres, sampled locally for Tidehaven's own scatter
  // ---------------------------------------------------------------------------
  const roadSegments = [], paths = [], movingGroups = new Set();
  /** Road centre lines, coarse, for keeping scatter and scenery off the road. */
  function measurePath(points, width) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p.x, 0, p.z)));
    const samples = curve.getPoints(Math.max(2, Math.ceil(curve.getLength() / 4)));
    for (let i = 1; i < samples.length; i++) roadSegments.push({ ax: samples[i - 1].x, az: samples[i - 1].z,
      bx: samples[i].x, bz: samples[i].z, width });
  }
  function addPath(points, width, parent = world) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p.x, 0, p.z)));
    const samples = curve.getPoints(Math.max(2, Math.ceil(curve.getLength() / 1.1)));
    const positions = [], indices = [];
    for (let i = 0; i < samples.length; i++) {
      const p = samples[i];
      const direction = samples[Math.min(i + 1, samples.length - 1)].clone().sub(samples[Math.max(0, i - 1)]).normalize();
      const left = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(width / 2 * (1 + Math.sin(i * .61) * .025));
      for (const sign of [-1, 1]) {
        const x = p.x + left.x * sign, z = p.z + left.z * sign;
        const deck = deckAt(x, z);
        positions.push(x, (deck ? deck.deckY + .05 : groundHeight(x, z)) + .045, z);
      }
      if (i) { const j = i * 2; indices.push(j - 2, j, j - 1, j - 1, j, j + 1); }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const path = new THREE.Mesh(geometry, material('#c6b384', { side: THREE.DoubleSide }));
    path.receiveShadow = true;
    parent.add(path);
    paths.push(points.map(p => ({ x: p.x, z: p.z })));
  }
  function roadDistance(x, z) {
    let min = Infinity;
    for (const s of roadSegments) {
      const dx = s.bx - s.ax, dz = s.bz - s.az;
      const t = clamp(((x - s.ax) * dx + (z - s.az) * dz) / (dx * dx + dz * dz), 0, 1);
      min = Math.min(min, Math.hypot(x - s.ax - t * dx, z - s.az - t * dz) - s.width / 2);
    }
    return min;
  }
  // Tidehaven's vegetation uses the original local road sampling, so the
  // woodland's tree, acorn, stick and squirrel layout is unchanged.
  const originalScatterSegments = [];
  const localTrail = [{ x: 0, z: 25 }, { x: 0, z: 9 }, { x: 0, z: -5 }, { x: -1.6, z: -20 }, { x: 1.7, z: -34 },
    { x: 0, z: -47 }, { x: -1.5, z: -60 }, ...routeNorth,
    { x: 1, z: -184 }, { x: -9, z: -220 }, { x: -25, z: -267 }, { x: -19, z: -330 }];
  const localSidePaths = [
    [{ x: -21, z: 13 }, { x: -10, z: 8 }, { x: 0, z: 7 }, { x: 14, z: 7 }, { x: 27, z: 9 }],
    [{ x: -24, z: -12 }, { x: -11, z: -8 }, { x: 0, z: -9 }, { x: 12, z: -9 }, { x: 25, z: -17 }],
    [{ x: 0, z: -40 }, { x: 12, z: -43 }, { x: 24, z: -53 }, { x: 32, z: -60 }],
  ];
  for (const [index, points] of [localTrail, ...localSidePaths].entries()) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p.x, 0, p.z)));
    const samples = curve.getPoints(Math.ceil(curve.getLength() / .65));
    for (let i = 1; i < samples.length; i++) originalScatterSegments.push({ ax: samples[i - 1].x, az: samples[i - 1].z,
      bx: samples[i].x, bz: samples[i].z, width: index === 0 ? 4.2 : 2.6 });
  }
  function localPathDistance(x, z) {
    let min = Infinity;
    for (const s of originalScatterSegments) {
      const dx = s.bx - s.ax, dz = s.bz - s.az;
      const t = clamp(((x - s.ax) * dx + (z - s.az) * dz) / (dx * dx + dz * dz), 0, 1);
      min = Math.min(min, Math.hypot(x - s.ax - t * dx, z - s.az - t * dz) - s.width / 2);
    }
    return min;
  }
  const distanceToPath = localPathDistance;

  // ---------------------------------------------------------------------------
  // Terrain: one graded grid over the whole world, finest around Tidehaven
  // ---------------------------------------------------------------------------
  function axisSamples(min, max, fineMin, fineMax) {
    const out = [min];
    let value = min;
    while (value < max) {
      const outside = Math.max(fineMin - value, value - fineMax, 0);
      const next = value + 2.5 + Math.min(4.6, outside / 20 * 4.6);
      if (next < max) { value = next; out.push(value); continue; }
      // The last step is clamped to the edge, which can leave a sliver narrower than the fine
      // band there - 0.27 m when the world grew west. Fold the remainder into the last step if
      // that step can take it, else share it between the last two, so no gap is ever under the
      // fine spacing or over the coarse.
      const before = out.length >= 2 ? out[out.length - 2] : null;
      if (max - value >= 2.2 || before === null) out.push(max);
      else if (max - before <= 7.1) out[out.length - 1] = max;
      else { out[out.length - 1] = (before + max) / 2; out.push(max); }
      break;
    }
    return out;
  }
  // Vertex spacing is unchanged; the grid simply covers more ground. The fine
  // 2.5 m band still holds Tidehaven, which did not move, and the Avrel
  // clearing, which did.
  const terrainXs = axisSamples(WORLD_BOUNDS.minX - 80, WORLD_BOUNDS.maxX + 80, Math.min(-252, AVREL_CLEARING.x - 60), 62);
  // The fine band reaches north over the Tessen bridge and its road post, so the river's cut and the embankment read true.
  const terrainZs = axisSamples(WORLD_BOUNDS.minZ - 80, WORLD_BOUNDS.maxZ + 80, Math.min(-110, TESSEN_BRIDGE.crossing.z - 45), Math.max(172, AVREL_CLEARING.z + 60));
  const columns = terrainXs.length, rows = terrainZs.length;
  const terrainPositions = new Float32Array(columns * rows * 3);
  const terrainColors = new Float32Array(columns * rows * 3);
  const grassColors = ['#86a859', '#80a452', '#92ac5e', '#75994f', '#83a45b'];
  const meadowTint = new THREE.Color(), beachColor = new THREE.Color('#d5c99a'), villageColor = new THREE.Color();
  for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) {
    const x = terrainXs[i], z = terrainZs[j], index = j * columns + i;
    // Amod's terraces are drawn by their own fine patch (src/amod-scenery.js); the coarse grid is sunk out of sight beneath it.
    terrainPositions.set([x, groundHeight(x, z) - amodTerrainSink(x, z), z], index * 3);
    groundTint(color, x, z, THREE);
    const local = worldToVillage(x, z), weight = villageWeight(local.x, local.z);
    if (weight > 0) {
      villageColor.set(grassColors[Math.floor(trandom() * grassColors.length)]);
      meadowTint.setHSL(.198 + Math.sin(local.x * .034 + local.z * .012) * .023, .31, .49, THREE.SRGBColorSpace);
      villageColor.lerp(meadowTint, smooth(132, 171, -local.z));
      villageColor.lerp(beachColor, smooth(18.5, 29, local.z - Math.sin(local.x * .055) * 2.5));
      villageColor.multiplyScalar(trange(0.94, 1.05));
      tintForestGround(villageColor, local.x, local.z);
      color.lerp(villageColor, weight);
    } else color.multiplyScalar(trange(.955, 1.045));
    terrainColors.set([color.r, color.g, color.b], index * 3);
  }
  const terrainIndices = [];
  for (let j = 0; j < rows - 1; j++) for (let i = 0; i < columns - 1; i++) {
    const a = j * columns + i;
    terrainIndices.push(a, a + columns, a + 1, a + 1, a + columns, a + columns + 1);
  }
  const terrainGeometry = new THREE.BufferGeometry();
  terrainGeometry.setAttribute('position', new THREE.BufferAttribute(terrainPositions, 3));
  terrainGeometry.setAttribute('color', new THREE.BufferAttribute(terrainColors, 3));
  terrainGeometry.setIndex(terrainIndices);
  terrainGeometry.computeVertexNormals();
  const terrainMaterial = material('#ffffff', { vertexColors: true, flatShading: true });
  const terrainRoot = new THREE.Group();
  terrainRoot.name = 'The ground of the four regions';
  world.add(terrainRoot);
  if (!spatialBatches) {
    const single = new THREE.Mesh(terrainGeometry, terrainMaterial);
    single.receiveShadow = true; single.name = 'Whole-world terrain';
    terrainRoot.add(single);
  } else {
    // Share one vertex buffer between tiles; only index ranges and bounds differ,
    // so a camera facing Drent can discard the Moros without changing the ground.
    // More ground, same tile footprint: a camera in Drent still discards the Moros.
    const tilesX = Math.round(7 * WORLD_SCALE), tilesZ = Math.round(7 * WORLD_SCALE);
    const spanX = Math.ceil((columns - 1) / tilesX), spanZ = Math.ceil((rows - 1) / tilesZ);
    const bounds = new THREE.Box3(), vertex = new THREE.Vector3();
    const positionAttribute = terrainGeometry.attributes.position;
    for (let tz = 0; tz < tilesZ; tz++) for (let tx = 0; tx < tilesX; tx++) {
      const firstX = tx * spanX, firstZ = tz * spanZ;
      const lastX = Math.min(firstX + spanX, columns - 1), lastZ = Math.min(firstZ + spanZ, rows - 1);
      if (firstX >= lastX || firstZ >= lastZ) continue;
      const indices = [];
      bounds.makeEmpty();
      for (let j = firstZ; j <= lastZ; j++) for (let i = firstX; i <= lastX; i++)
        bounds.expandByPoint(vertex.fromBufferAttribute(positionAttribute, j * columns + i));
      for (let j = firstZ; j < lastZ; j++) for (let i = firstX; i < lastX; i++) {
        const a = j * columns + i;
        indices.push(a, a + columns, a + 1, a + 1, a + columns, a + columns + 1);
      }
      const geometry = new THREE.BufferGeometry();
      for (const [name, attribute] of Object.entries(terrainGeometry.attributes)) geometry.setAttribute(name, attribute);
      geometry.setIndex(indices);
      geometry.boundingBox = bounds.clone();
      geometry.boundingSphere = bounds.getBoundingSphere(new THREE.Sphere());
      const tile = new THREE.Mesh(geometry, terrainMaterial);
      tile.name = `Terrain ${tx}:${tz}`; tile.receiveShadow = true;
      terrainRoot.add(tile);
    }
  }

  // ---------------------------------------------------------------------------
  // The Stills
  // ---------------------------------------------------------------------------
  // Open water on every side, far enough out that its edge reads as the horizon
  // rather than as the corner of a plane: from Peblos the traveler looks east at nothing else.
  const seaWidth = WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX + 900, seaDepth = WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ + 900;
  // One vertex per 32 m, as the 2 280 m sea always had, so the swell keeps its scale.
  const waterGeometry = new THREE.PlaneGeometry(seaWidth, seaDepth, Math.round(seaWidth / 32), Math.round(seaDepth / 32));
  waterGeometry.rotateX(-Math.PI / 2);
  const waterMaterial = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, shallow: { value: new THREE.Color('#65bdba') }, deep: { value: new THREE.Color('#328e9c') } },
    vertexShader: `uniform float time; varying vec3 vWorld; varying float vWave;
      void main() { vec3 p=position; float w=sin(p.x*.12+time*.65)*.10+sin(p.z*.19+p.x*.035+time*.8)*.055;
      p.y+=w; vWave=w; vec4 world=modelMatrix*vec4(p,1.); vWorld=world.xyz; gl_Position=projectionMatrix*viewMatrix*world; }`,
    fragmentShader: `uniform float time; uniform vec3 shallow; uniform vec3 deep; varying vec3 vWorld; varying float vWave;
      void main() { float band=sin(vWorld.x*.26+vWorld.z*.47+time*.7)*sin(vWorld.x*.45-vWorld.z*.1+time*.21);
      vec3 col=mix(shallow,deep,smoothstep(20.,150.,vWorld.x)); col+=vWave*.32;
      float sparkle=pow(max(0.,band),22.); col+=vec3(.21,.25,.20)*sparkle;
      gl_FragColor=vec4(col,1.); }`,
  });
  const water = new THREE.Mesh(waterGeometry, waterMaterial);
  water.name = 'The Stills';
  water.position.set((WORLD_BOUNDS.minX + WORLD_BOUNDS.maxX) / 2, SEA_LEVEL, (WORLD_BOUNDS.minZ + WORLD_BOUNDS.maxZ) / 2);
  world.add(water);
  // A foam line traced along the actual coast, from Drent's north cape to the
  // southern bay, so the shore reads as a place and not a plane edge.
  const shorePoints = [];
  const shoreFrom = at(240, -170), shoreTo = at(-320, 330);
  for (let z = shoreFrom.z; z <= shoreTo.z; z += 5) {
    let best = null;
    for (let x = shoreFrom.x; x > shoreTo.x; x -= 3) {
      const distance = landDistance(x, z);
      // The Pebbles are land too; the mainland's coast is what this traces.
      if (distance >= 0 && !islandAt(x, z)) { best = x + clamp(distance, 0, 2.5); break; }
    }
    if (best !== null) shorePoints.push({ x: best, z });
  }
  const shorePositions = [];
  for (const spot of shorePoints) shorePositions.push(spot.x, .11, spot.z, spot.x + .28 + Math.sin(spot.z * .2) * .09, .115, spot.z);
  const shoreIndices = [];
  for (let i = 2; i < shorePositions.length / 3; i += 2) shoreIndices.push(i - 2, i, i - 1, i - 1, i, i + 1);
  const shoreGeometry = new THREE.BufferGeometry();
  shoreGeometry.setAttribute('position', new THREE.Float32BufferAttribute(shorePositions, 3));
  shoreGeometry.setIndex(shoreIndices);
  const shoreFoam = new THREE.Mesh(shoreGeometry, new THREE.MeshBasicMaterial({ color: '#ddf2d9', transparent: true, opacity: .38, side: THREE.DoubleSide }));
  shoreFoam.name = 'Shore foam';
  world.add(shoreFoam);

  // ---------------------------------------------------------------------------
  // Shared props, authored in whichever frame their parent belongs to
  // ---------------------------------------------------------------------------
  const groundFor = parent => (isLocal(parent) ? localGround : groundHeight);
  const pushFor = parent => (isLocal(parent) ? vpush : (collider => { colliders.push(collider); return collider; }));
  function roofGeometry(width, depth, rise) {
    const w = width / 2, d = depth / 2;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([-w, 0, -d, w, 0, -d, 0, rise, -d, -w, 0, d, w, 0, d, 0, rise, d], 3));
    geometry.setIndex([0, 2, 1, 3, 4, 5, 0, 3, 5, 0, 5, 2, 1, 2, 5, 1, 5, 4, 0, 1, 4, 0, 4, 3]);
    geometry.computeVertexNormals();
    return geometry;
  }
  function rope(points, radius = .033, mat = material('#d7c198'), parent = villageRoot) {
    const geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), Math.max(6, points.length * 6), radius, 4, false);
    return mesh(geometry, mat, 0, 0, 0, 1, 1, 1, parent);
  }
  const houseLocations = [];
  const smokeSources = [];
  // `plain` leaves off the window flower boxes: nothing is grown on a window ledge in the Pebbles.
  function cottage(x, z, width, depth, height, roofColor, wallColor, angle = 0, parent = villageRoot, { plain = false } = {}) {
    const y = groundFor(parent)(x, z);
    const group = new THREE.Group(); group.position.set(x, y, z); group.rotation.y = angle; parent.add(group);
    if (isLocal(parent)) houseLocations.push({ x, z, r: Math.max(width, depth) * .72 });
    pushFor(parent)({ x, z, r: Math.max(width, depth) * .62, kind: 'house', width, depth, angle });
    box(material('#929580'), 0, .2, 0, width + .35, .7, depth + .3, group);
    box(material(wallColor), 0, height / 2 + .38, 0, width, height, depth, group);
    box(darkWood, 0, .59, depth / 2 + .035, width, .19, .13, group);
    box(darkWood, 0, height + .28, depth / 2 + .035, width, .17, .14, group);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(wood, sx * (width / 2 - .06), height / 2 + .35, sz * (depth / 2 + .02), .18, height + .14, .18, group);
    const roofBase = height + .33;
    mesh(roofGeometry(width + .95, depth + 1.05, 1.85), material(roofColor), 0, roofBase, 0, 1, 1, 1, group);
    box(material('#d4a66f'), 0, roofBase + 1.85, 0, .18, .15, depth + 1.14, group);
    for (const side of [-1, 1]) {
      const trim = box(darkWood, side * (width + .95) / 4, roofBase + .92, depth / 2 + .55, Math.hypot((width + .95) / 2, 1.85), .15, .16, group);
      trim.rotation.z = -side * Math.atan2(1.85, (width + .95) / 2);
    }
    box(darkWood, 0, 1.32, depth / 2 + .09, 1.12, 2.02, .17, group);
    box(material('#997348'), 0, 1.32, depth / 2 + .19, .89, 1.88, .10, group);
    for (let k = -1; k <= 1; k++) box(wood, k * .23, 1.32, depth / 2 + .26, .028, 1.87, .025, group);
    pebble(material('#d4b465'), .3, 1.25, depth / 2 + .3, .055, .055, .035, group);
    box(rockMat, 0, .26, depth / 2 + .52, 1.55, .3, .8, group);
    for (const side of [-1, 1]) {
      const wx = side * width * .31;
      box(darkWood, wx, 2.03, depth / 2 + .075, 1.08, 1.18, .15, group);
      box(windowMat, wx, 2.03, depth / 2 + .17, .86, .94, .04, group);
      box(wood, wx, 2.03, depth / 2 + .21, .075, 1.0, .05, group);
      box(wood, wx, 2.03, depth / 2 + .215, .91, .075, .055, group);
      for (const shutter of [-1, 1]) box(material(roofColor), wx + shutter * .65, 2.03, depth / 2 + .14, .26, 1.13, .08, group);
      if (plain) continue;
      box(woodLight, wx, 1.34, depth / 2 + .35, 1.19, .27, .43, group);
      for (let f = 0; f < 5; f++) pebble(material(f % 2 ? '#eeb679' : '#d78082'), wx - .42 + f * .21, 1.62, depth / 2 + .38, .13, .17, .13, group);
    }
    box(darkWood, width / 2 + .075, 2.05, 0, .14, 1.1, 1.05, group);
    box(windowMat, width / 2 + .155, 2.05, 0, .035, .87, .84, group);
    box(wood, width / 2 + .19, 2.05, 0, .05, .92, .07, group);
    const chimneyX = -width * .27, chimneyZ = -depth * .21;
    box(material('#b38e77'), chimneyX, roofBase + 1.45, chimneyZ, .61, 2.1, .65, group);
    box(material('#cbb19a'), chimneyX, roofBase + 2.48, chimneyZ, .8, .16, .81, group);
    const source = new THREE.Vector3(chimneyX, roofBase + 2.64, chimneyZ).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle).add(group.position);
    if (isLocal(parent)) { const world3 = villageToWorld(source.x, source.z); source.set(world3.x, source.y, world3.z); }
    smokeSources.push(source);
    return group;
  }
  function barrel(x, z, scale = 1, parent = villageRoot, y = groundFor(parent)(x, z)) {
    const barrelGeo = new THREE.CylinderGeometry(.38, .35, .95, 9);
    mesh(barrelGeo, woodLight, x, y + .48 * scale, z, scale, scale, scale, parent);
    const hoop = material('#59605a');
    [.18, .75].forEach(h => post(hoop, x, y + h * scale, z, .391 * scale, .06 * scale, parent));
    post(wood, x, y + .975 * scale, z, .33 * scale, .028, parent);
  }
  function crate(x, z, size = .8, y = null, parent = villageRoot) {
    const base = y === null ? groundFor(parent)(x, z) : y;
    box(woodLight, x, base + size / 2, z, size, size, size, parent);
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) box(wood, x + dx * size * .43, base + size * .5, z + dz * size * .5, size * .095, size, size * .09, parent);
    const diagonal = box(wood, x, base + size * .5, z + size * .512, size * 1.14, size * .095, size * .045, parent); diagonal.rotation.z = Math.PI / 4;
  }
  function fence(x, z, length, rotation = 0, parent = villageRoot) {
    const group = new THREE.Group(); group.position.set(x, groundFor(parent)(x, z), z); group.rotation.y = rotation; parent.add(group);
    for (let f = -length / 2; f <= length / 2 + .1; f += 1.35) box(woodLight, f, .67, 0, .11, 1.3, .12, group);
    box(woodLight, 0, .51, 0, length, .12, .10, group); box(woodLight, 0, 1.04, 0, length, .11, .10, group);
  }
  function leanTo(x, z, tint = '#b29b70', angle = 0, parent = villageRoot) {
    const ground = groundFor(parent);
    const shelter = new THREE.Group(); shelter.position.set(x, ground(x, z), z); shelter.rotation.y = angle; parent.add(shelter);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) post(wood, sx * 2.2, 1.45, sz * 1.55, .11, 2.9, shelter);
    mesh(roofGeometry(5.2, 4.0, 1.25), material(tint), 0, 2.85, 0, 1, 1, 1, shelter);
    box(woodLight, -1.3, .42, -.7, 1.6, .1, .65, shelter);
    for (const x0 of [-1.85, -.75]) box(wood, x0, .2, -.7, .14, .4, .55, shelter);
    const push = pushFor(parent);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) push({
      x: x + sx * 2.2 * Math.cos(angle) + sz * 1.55 * Math.sin(angle),
      z: z - sx * 2.2 * Math.sin(angle) + sz * 1.55 * Math.cos(angle), r: .17, kind: 'shelter-post' });
    return shelter;
  }
  function wornPatch(x, z, radius, tint, edgeScale = 1, parent = world) {
    const ground = groundFor(parent);
    const geometry = new THREE.CircleGeometry(radius, 32);
    geometry.rotateX(-Math.PI / 2);
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const localX = p.getX(i), localZ = p.getZ(i);
      const irregular = i ? 1 + Math.sin(i * 2.1) * .045 : 1;
      const px = x + localX * irregular, pz = z + localZ * irregular * edgeScale;
      p.setXYZ(i, px, ground(px, pz) + .028, pz);
    }
    geometry.computeVertexNormals();
    const patch = new THREE.Mesh(geometry, material(tint));
    patch.receiveShadow = true;
    parent.add(patch);
  }
  const localPatch = (x, z, radius, tint, edgeScale = 1) => wornPatch(x, z, radius, tint, edgeScale, villageRoot);

  // ---------------------------------------------------------------------------
  // Tidehaven, unchanged in its own frame
  // ---------------------------------------------------------------------------
  const square = new THREE.CircleGeometry(6.8, 32);
  square.rotateX(-Math.PI / 2);
  const sqv = square.attributes.position;
  for (let i = 0; i < sqv.count; i++) {
    const x = sqv.getX(i), z = sqv.getZ(i) + 5;
    sqv.setXYZ(i, x, localGround(x, z) + .06, z);
  }
  square.computeVertexNormals();
  const plaza = new THREE.Mesh(square, material('#cabb8b')); plaza.receiveShadow = true; villageRoot.add(plaza);
  localPatch(training.x, training.z, 2.2, '#b9aa7b', .88);
  localPatch(encounter.x, encounter.z, 7.4, '#9ba967', 1.03);

  const pondGeometry = new THREE.CircleGeometry(pond.radius, 72);
  pondGeometry.rotateX(-Math.PI / 2);
  const pondMaterial = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `varying vec3 p; void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform float time;varying vec3 p;void main(){
      float wave=sin(p.x*2.4+p.z*.8+time*.7)*sin(p.z*1.7-p.x*.5-time*.45);
      float edge=smoothstep(2.8,5.4,length(p.xz));
      vec3 color=mix(vec3(.105,.285,.255),vec3(.25,.44,.31),edge);
      color+=vec3(.11,.17,.13)*pow(max(0.,wave),12.);
      gl_FragColor=vec4(color,1.);}`,
  });
  const pondWater = new THREE.Mesh(pondGeometry, pondMaterial);
  pondWater.name = 'Willowmere forest pond';
  pondWater.position.set(pond.x, pond.surfaceY + .027, pond.z); villageRoot.add(pondWater);
  vpush({ x: pond.x, z: pond.z, r: pond.radius - .04, kind: 'pond-water' });

  const boardCount = 35;
  const dockBoards = new THREE.InstancedMesh(cube, material('#b48d61'), boardCount);
  for (let i = 0; i < boardCount; i++) {
    dummy.position.set(0, 1.67, 22 + i * .75);
    dummy.rotation.set(0, range(-.009, .009), 0); dummy.scale.set(4.3, .26, .72); dummy.updateMatrix();
    dockBoards.setMatrixAt(i, dummy.matrix); dockBoards.setColorAt(i, color.setHSL(.092, .30, range(.43, .55)));
  }
  dockBoards.castShadow = true; dockBoards.receiveShadow = true; villageRoot.add(dockBoards);
  box(darkWood, -1.65, 1.32, 34.8, .25, .4, 26.5); box(darkWood, 1.65, 1.32, 34.8, .25, .4, 26.5);
  for (const side of [-1, 1]) {
    let previous = null;
    for (let z = 24; z <= 48; z += 4) {
      post(wood, side * 2.1, 1.2, z, .16, 4.2);
      post(woodLight, side * 2.1, 3.31, z, .19, .11);
      if (previous !== null && !(side === -1 && z === 44))
        rope([new THREE.Vector3(side * 2.1, 2.88, previous), new THREE.Vector3(side * 2.1, 2.52, z - 2), new THREE.Vector3(side * 2.1, 2.88, z)]);
      previous = z;
    }
  }
  const ramp = new THREE.BufferGeometry();
  ramp.setAttribute('position', new THREE.Float32BufferAttribute([-2.15, 1.8, 22, 2.15, 1.8, 22, -2.15, localGround(-2.15, 19) + .035, 19, 2.15, localGround(2.15, 19) + .035, 19], 3));
  ramp.setIndex([0, 1, 2, 1, 3, 2]); ramp.computeVertexNormals();
  const rampMesh = new THREE.Mesh(ramp, woodLight); rampMesh.receiveShadow = true; villageRoot.add(rampMesh);

  function boat(x, z, scale = 1, rotation = 0, sail = false) {
    const group = new THREE.Group(); group.position.set(x, .38, z); group.rotation.y = rotation; group.scale.setScalar(scale); villageRoot.add(group);
    const outline = [[0, -3.2], [1.1, -2.1], [1.3, .9], [.82, 2.55], [0, 3.1], [-.82, 2.55], [-1.3, .9], [-1.1, -2.1]];
    const bp = [], bi = [];
    for (const [bx, bz] of outline) bp.push(bx, .67, bz, bx * .53, -.35, bz * .78);
    for (let i = 0; i < outline.length; i++) { const a = i * 2, b = ((i + 1) % outline.length) * 2; bi.push(a, b, a + 1, b, b + 1, a + 1); }
    const hull = new THREE.BufferGeometry(); hull.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3)); hull.setIndex(bi); hull.computeVertexNormals();
    mesh(hull, material('#497c80', { side: THREE.DoubleSide }), 0, 0, 0, 1, 1, 1, group);
    box(woodLight, 0, -.08, 0, 1.5, .16, 4.4, group);
    [-1.6, -.1, 1.45].forEach(bz => box(woodLight, 0, .53, bz, 2.07, .16, .32, group));
    const rail = outline.map(([bx, bz]) => new THREE.Vector3(bx, .72, bz)); rail.push(rail[0]); rope(rail, .09, woodLight, group);
    if (sail) {
      post(wood, 0, 2.7, -.45, .085, 5.8, group);
      const sailGeometry = new THREE.BufferGeometry();
      sailGeometry.setAttribute('position', new THREE.Float32BufferAttribute([.1, 5.5, -.45, .1, 1.3, -.45, 2.8, 1.55, -.3], 3)); sailGeometry.computeVertexNormals();
      mesh(sailGeometry, material('#f2e6bd', { side: THREE.DoubleSide }), 0, 0, 0, 1, 1, 1, group);
      rope([new THREE.Vector3(0, 5.5, -.45), new THREE.Vector3(0, .72, 2.9)], .018, material('#e7d1a3'), group);
      const flag = box(material('#e4ac59'), 0, 5.62, -.45, .85, .32, .028, group); flag.position.x = .41;
    } else {
      const oar = box(woodLight, .65, .85, .4, .09, .09, 4.3, group); oar.rotation.y = .45;
      const blade = box(woodLight, 1.51, .85, 2.17, .33, .08, .65, group); blade.rotation.y = .45;
    }
    return group;
  }
  const arrivalBoat = boat(-5.0, 43, 1, -.12, true);
  const gangplank = box(woodLight, -3.25, 1.36, 43, 3.25, .12, .95);
  gangplank.rotation.z = .25;
  rope([new THREE.Vector3(-2.1, 2.6, 44), new THREE.Vector3(-3.1, 1.55, 44.2), new THREE.Vector3(-3.8, 1.1, 44.5)], .038);
  const fishingBoat = boat(-18, 31, .72, 1.05, false);
  boat(28, 33, .62, -.8, false);
  boat(-56, 97, .6, 1.1, true);
  boat(66, 118, .74, -.65, true);

  cottage(-11, 12, 5.2, 4.7, 3.15, '#bf785e', '#e9dbad', .64);
  cottage(12, 13, 6.0, 5.3, 3.8, '#547f7b', '#efdb9f', -.61);
  cottage(-16, 0, 6.0, 5.0, 3.45, '#87905a', '#eeddb4', 1.19);
  cottage(16, -2, 6.3, 5.5, 3.15, '#d19b55', '#e8d1a0', -1.20);
  cottage(-10, -13, 5.6, 4.8, 3.5, '#6d8895', '#efe0b9', .44);
  cottage(11, -21, 5.9, 5.3, 3.45, '#bd8062', '#e9d4a8', -.37);
  cottage(-25, -12, 6.2, 5.2, 3.25, '#ae8564', '#e8d4a6', .85);
  cottage(29, 8, 5.5, 5.1, 3.0, '#73876b', '#eadcb9', -1.38);
  cottage(27, -20, 5.6, 4.6, 3.15, '#648d90', '#eddfb5', -.75);


  barrel(2.95, 19, .95); barrel(3.76, 18.6, .78); crate(5.0, 18.7, .88); crate(5.05, 18.7, .57, localGround(5.05, 18.7) + .89);
  crate(-1.15, 37.2, .68, 1.8); barrel(-1.24, 35.9, .62, villageRoot, 1.8);
  barrel(-15.0, 19.6, .85); crate(-16.0, 20.2, .75); barrel(19, 2, .85); crate(-19, -2, .84);
  const acornCook = { x: -5.6, z: 9.1 };
  const cookTable = { x: -7.5, z: 9.9 }, cookY = localGround(cookTable.x, cookTable.z);
  box(woodLight, cookTable.x, cookY + .82, cookTable.z, 1.65, .12, .85);
  for (const dx of [-.66, .66]) for (const dz of [-.28, .28]) box(wood, cookTable.x + dx, cookY + .40, cookTable.z + dz, .12, .80, .12);
  vpush({ x: cookTable.x, z: cookTable.z, hx: .84, hz: .44, kind: 'cook-table' });
  const basketMat = material('#aa7c49'), nutMat = material('#915630'), capMat = material('#654a32');
  post(basketMat, cookTable.x - .41, cookY + 1.0, cookTable.z, .27, .24);
  const basketRim = new THREE.TorusGeometry(.255, .031, 4, 10); basketRim.rotateX(Math.PI / 2);
  mesh(basketRim, woodLight, cookTable.x - .41, cookY + 1.13, cookTable.z);
  for (let i = 0; i < 8; i++) {
    const a = i * 2.4, nx = cookTable.x - .41 + Math.cos(a) * .16, nz = cookTable.z + Math.sin(a) * .14;
    pebble(nutMat, nx, cookY + 1.12 + (i % 2) * .035, nz, .065, .075, .061);
    pebble(capMat, nx, cookY + 1.17 + (i % 2) * .035, nz, .07, .03, .065);
  }
  post(material('#b98e69'), cookTable.x + .35, cookY + .98, cookTable.z, .25, .18);
  post(material('#74999b'), cookTable.x + .35, cookY + 1.077, cookTable.z, .205, .009);
  const spoon = box(wood, cookTable.x + .62, cookY + .92, cookTable.z + .23, .06, .025, .42);
  spoon.rotation.y = .5;
  pebble(woodLight, cookTable.x + .52, cookY + .92, cookTable.z + .05, .09, .018, .11);
  for (const x of [-17.4, -13.2]) post(wood, x, localGround(x, 22) + 1.35, 22, .095, 2.7);
  const netTop = localGround(-15.3, 22) + 2.5;
  rope([new THREE.Vector3(-17.4, netTop, 22), new THREE.Vector3(-15.3, netTop - .3, 22), new THREE.Vector3(-13.2, netTop, 22)], .035);
  const netPositions = [];
  for (let i = 0; i <= 10; i++) { const x = -17.4 + i * .42; netPositions.push(x, netTop - .1, 22, x, netTop - 1.55, 22.05); }
  for (let i = 0; i < 6; i++) netPositions.push(-17.4, netTop - .15 - i * .27, 22, -13.2, netTop - .15 - i * .27, 22);
  const netGeo = new THREE.BufferGeometry(); netGeo.setAttribute('position', new THREE.Float32BufferAttribute(netPositions, 3));
  const net = new THREE.LineSegments(netGeo, new THREE.LineBasicMaterial({ color: '#c5b394', transparent: true, opacity: .75 })); villageRoot.add(net);
  for (let i = 0; i < 6; i++) {
    const fish = pebble(material(i % 2 ? '#a9c3c0' : '#789b9e'), -17 + i * .6, netTop - .45 - i % 2 * .2, 22.12, .105, .31, .065); fish.rotation.z = .15;
  }
  fence(-23, 5, 6, -.12); fence(-26.5, 1, 7, .12 + Math.PI / 2); fence(23, -9, 6, -.08); fence(34, 4, 5, Math.PI / 2);
  fence(-18, -23, 7, .1); fence(18, -29, 6, -.08);
  for (const [gx, gz] of [[-24, 1], [23, -10], [-18, -21]]) {
    box(material('#887553'), gx, localGround(gx, gz) + .045, gz, 4.5, .09, 2.4);
    for (let i = 0; i < 12; i++) {
      const px = gx - 1.8 + (i % 6) * .7, pz = gz - .65 + Math.floor(i / 6) * 1.25;
      pebble(material('#5f9150'), px, localGround(px, pz) + .25, pz, .3, .27, .32);
    }
  }
  // Perrin's garden on the eastern side of the village: the hummingbird feeder's hook, a bird bath, his bench.
  const birdGarden = buildBirdGarden({ root: villageRoot, material, mesh, box, post, pebble, localGround, vpush, movingGroups });
  const wellX = -5.7, wellZ = 1.5, wellY = localGround(wellX, wellZ);
  const wellRing = new THREE.TorusGeometry(1, .26, 5, 12); wellRing.rotateX(Math.PI / 2);
  mesh(wellRing, material('#a8a18a'), wellX, wellY + .6, wellZ);
  post(material('#4b6e6b'), wellX, wellY + .2, wellZ, .83, .07);
  [-1, 1].forEach(s => box(wood, wellX + s * 1.1, wellY + 1.6, wellZ, .15, 3.2, .16));
  mesh(roofGeometry(2.85, 2.5, .72), material('#849273'), wellX, wellY + 3.15, wellZ);
  box(woodLight, wellX, wellY + 2.35, wellZ, 2.25, .13, .13);
  rope([new THREE.Vector3(wellX, wellY + 2.35, wellZ), new THREE.Vector3(wellX, wellY + .55, wellZ)], .027);
  vpush({ x: wellX, z: wellZ, r: 1.3 });
  const arrowGeo = new THREE.Shape();
  arrowGeo.moveTo(-.55, -.09); arrowGeo.lineTo(.15, -.09); arrowGeo.lineTo(.15, -.23); arrowGeo.lineTo(.53, 0); arrowGeo.lineTo(.15, .23); arrowGeo.lineTo(.15, .09); arrowGeo.lineTo(-.55, .09);
  function lantern(x, z, h = 3.2) {
    const y = localGround(x, z);
    post(wood, x, y + h / 2, z, .075, h); box(darkWood, x + .27, y + h - .12, z, .64, .075, .075);
    box(windowMat, x + .5, y + h - .45, z, .25, .43, .25);
    box(darkWood, x + .5, y + h - .71, z, .33, .09, .33); box(darkWood, x + .5, y + h - .2, z, .36, .09, .36);
    for (const dx of [-.13, .13]) for (const dz of [-.13, .13]) box(darkWood, x + .5 + dx, y + h - .45, z + dz, .027, .45, .027);
  }
  lantern(2.15, 26, 2.9); lantern(-3.6, 16.0); lantern(5.3, -5); lantern(-9, -29);

  const trainingY = localGround(training.x, training.z);
  const trainingStand = new THREE.Group();
  trainingStand.name = 'Village practice post';
  trainingStand.position.set(training.x, trainingY, training.z);
  villageRoot.add(trainingStand);
  post(wood, 0, 1.05, 0, .105, 2.1, trainingStand);
  box(woodLight, 0, 1.57, 0, 1.45, .15, .18, trainingStand);
  const footA = box(darkWood, 0, .12, 0, .95, .16, .18, trainingStand); footA.rotation.y = .56;
  const footB = box(wood, 0, .12, 0, .95, .16, .18, trainingStand); footB.rotation.y = -.56;
  const sack = new THREE.Group();
  sack.name = 'Straw practice sack';
  sack.position.set(0, 1.85, 0);
  trainingStand.add(sack);
  const straw = material('#c7ad70'), binding = material('#8d754d');
  mesh(cylinder, straw, 0, -.51, .07, .43, 1.00, .29, sack);
  pebble(straw, 0, -.07, .07, .38, .17, .27, sack);
  pebble(straw, 0, -.98, .07, .36, .14, .25, sack);
  [-.22, -.78].forEach(y => mesh(cylinder, binding, 0, y, .07, .444, .065, .304, sack));
  box(binding, .12, -.51, .365, .028, .90, .026, sack);
  for (let i = 0; i < 5; i++) {
    const tuft = box(cream, -.16 + i * .08, .055 + (i % 2) * .035, .04, .026, .16, .025, sack);
    tuft.rotation.z = (i - 2) * .17;
  }
  vpush({ x: training.x, z: training.z, r: .5, kind: 'training' });
  training.object = sack;
  training.y = trainingY;

  const repairX = repairBench.x + 1.5, repairZ = repairBench.z;
  const repairY = localGround(repairX, repairZ);
  const repairProps = new THREE.Group(); repairProps.name = repairBench.name;
  repairProps.position.set(repairX, repairY, repairZ); villageRoot.add(repairProps);
  box(woodLight, 0, .77, 0, 1.7, .15, .94, repairProps);
  for (const dx of [-.66, .66]) for (const dz of [-.32, .32]) box(wood, dx, .36, dz, .15, .72, .15, repairProps);
  box(darkWood, 0, .25, 0, 1.48, .12, .58, repairProps);
  const iron = material('#737872', { metalness: .35, roughness: .8 });
  const wheel = mesh(new THREE.CylinderGeometry(.43, .43, .18, 16), material('#a09e8c'), .14, 1.2, -.06, 1, 1, 1, repairProps);
  wheel.rotation.x = Math.PI / 2;
  for (const z of [-.25, .15]) box(darkWood, .14, 1.0, z, .14, .44, .12, repairProps);
  const axle = post(iron, .14, 1.2, .02, .055, .72, repairProps); axle.rotation.x = Math.PI / 2;
  box(woodLight, .14, 1.07, .4, .095, .30, .095, repairProps);
  const crank = post(wood, .14, .94, .48, .057, .20, repairProps); crank.rotation.x = Math.PI / 2;
  box(material('#c5c3a7'), -.56, .88, .16, .35, .08, .16, repairProps);
  post(material('#98704a'), -.53, .91, -.27, .10, .16, repairProps);
  post(darkWood, .67, 1.41, -.36, .055, 1.35, repairProps);
  box(woodLight, .67, 1.91, -.36, .52, .62, .10, repairProps);
  const signMetal = material('#e0d2a8');
  box(signMetal, .67, 2.0, -.299, .053, .29, .017, repairProps);
  box(signMetal, .67, 1.835, -.294, .25, .046, .023, repairProps);
  box(darkWood, .67, 1.76, -.29, .057, .11, .029, repairProps);
  vpush({ x: repairX, z: repairZ, hx: .87, hz: .49, kind: 'repair-bench' });

  const bellX = 4, bellZ = -25, bellY = localGround(bellX, bellZ);
  const bellFrame = new THREE.Group();
  bellFrame.name = 'Greenway warning bell';
  bellFrame.position.set(bellX, bellY, bellZ);
  villageRoot.add(bellFrame);
  for (const side of [-1, 1]) {
    post(wood, side * .58, 1.6, 0, .10, 3.2, bellFrame);
    vpush({ x: bellX + side * .58, z: bellZ, r: .14 });
  }
  box(woodLight, 0, 3.19, 0, 1.42, .17, .22, bellFrame);
  const bellSwing = new THREE.Group();
  bellSwing.position.y = 3.1;
  bellFrame.add(bellSwing);
  const bellMetal = material('#ac975c', { metalness: .45, roughness: .52 });
  mesh(new THREE.CylinderGeometry(.15, .39, .48, 10, 1, true), bellMetal, 0, -.35, 0, 1, 1, 1, bellSwing);
  const bellRim = new THREE.TorusGeometry(.36, .038, 4, 10); bellRim.rotateX(Math.PI / 2);
  mesh(bellRim, bellMetal, 0, -.59, 0, 1, 1, 1, bellSwing);
  post(darkWood, 0, -.1, 0, .05, .2, bellSwing);
  const bellTongue = new THREE.Group();
  bellTongue.position.y = -.17;
  bellSwing.add(bellTongue);
  post(darkWood, 0, -.27, 0, .025, .54, bellTongue);
  pebble(bellMetal, 0, -.53, 0, .071, .09, .071, bellTongue);
  rope([new THREE.Vector3(.37, 2.86, .03), new THREE.Vector3(.4, 1.37, .06)], .023, cream, bellFrame);
  let bellStarted = -Infinity, worldTime = 0;
  rope([new THREE.Vector3(-8, 5.8, 7), new THREE.Vector3(0, 4.9, 7), new THREE.Vector3(7, 5.6, 7)], .022);
  for (let i = 0; i < 13; i++) {
    const t = (i + .5) / 13, x = THREE.MathUtils.lerp(-8, 7, t), y = 5.8 - .2 * t - .75 * Math.sin(t * Math.PI);
    const flagGeo = new THREE.BufferGeometry();
    flagGeo.setAttribute('position', new THREE.Float32BufferAttribute([-.28, 0, 0, .28, 0, 0, 0, -.55, .03], 3)); flagGeo.computeVertexNormals();
    mesh(flagGeo, material(['#dba168', '#749b95', '#ddba70', '#c88b7c'][i % 4], { side: THREE.DoubleSide }), x, y, 7);
  }

  const wy = localGround(0, -66);
  const archMat = material('#756245');
  [-3.9, 3.9].forEach(x => { post(archMat, x, localGround(x, -66) + 2.4, -66, .26, 4.8); vpush({ x, z: -66, r: .36 }); });
  const arch = box(woodLight, 0, wy + 4.72, -66, 8.4, .32, .36); arch.rotation.z = -.015;
  box(wood, 0, wy + 4.02, -66, 2.35, .75, .15);
  const leaf = pebble(material('#c9d3a0'), 0, wy + 4.04, -65.9, .20, .31, .055); leaf.rotation.z = -.5;
  cottage(-10, -68, 4.9, 4.0, 2.8, '#748770', '#dfd6b3', .83);
  const benchX = 5.6, benchZ = -63, benchY = localGround(benchX, benchZ);
  box(woodLight, benchX, benchY + .62, benchZ, 2.7, .14, .65);
  [-1, 1].forEach(s => box(wood, benchX + s * .95, benchY + .3, benchZ, .15, .6, .49));
  box(woodLight, benchX, benchY + 1.15, benchZ - .32, 2.7, .5, .12);
  vpush({ x: benchX, z: benchZ, r: 1.15 });
  const markerX = 31, markerZ = -59, markerY = localGround(markerX, markerZ);
  const standingStone = pebble(material('#899b8f'), markerX, markerY + 1.7, markerZ, 1.3, 2.1, .8); standingStone.rotation.z = -.1;
  vpush({ x: markerX, z: markerZ, r: 1.25 });
  // The waystone's old road mark, picked out in paint like every other marker (no glow).
  const inset = box(material('#96c5b1'), markerX, markerY + 1.9, markerZ + .68, .13, .76, .08); inset.rotation.z = .42;

  // ---------------------------------------------------------------------------
  // Road signs, shared between Tidehaven and the regions
  // ---------------------------------------------------------------------------
  // One sign language everywhere (src/signs.js): fingers point, square boards
  // name a place, plaques carry notices and painted stones mark a border.
  const signs = createSigns({ material, mesh, box, groundFor, pushFor,
    worldSpot: (parent, x, z) => (isLocal(parent) ? villageToWorld(x, z) : { x, z }) });
  const roadSigns = signs.records;
  /**
   * The older roadside-sign call, (x, z, label, yaw, returnLabel), as scenery
   * modules still make it: a fingerpost whose fingers point at the places they
   * name where those are known, and along the road's line otherwise.
   */
  const signTargets = { Solis: SOLIS.centre, 'The Gate of Sun Horses': solisPoint(0, -42), 'The Coalition camp': solisPoint(100, 0), 'The border stockade': STORY_SITES.morosStockade };
  const roadsideSign = (x, z, label, yaw = 0, returnLabel = 'Tidehaven') => {
    const along = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
    return signs.direction({ x, z, label, parent: world, backLabel: returnLabel,
      toward: signTargets[label] ?? { x: x + along.x * 20, z: z + along.z * 20 }, back: signTargets[returnLabel] ?? { x: x - along.x * 20, z: z - along.z * 20 } });
  };
  // The Greenway's own fingerposts, in the village's local metres (north is -z here).
  // The smithy is built here, not up with the cottages, because `signs` is declared above
  // this line and not above those: its board would be a temporal dead zone.
  /**
   * The smithy on the south street (TIDEHAVEN_SMITHY, src/region-world.js, where the measurement
   * that chose the plot is written down). Modest and open-sided, as a village forge is: a
   * lean-to, a stone forge with its chimney and banked coals, an anvil on its stump, the quench
   * barrel, and a rack of bar stock. Drent is level 0, so what is sold here is what you landed
   * with; the bog iron is a country up the road.
   */
  {
    const a = 16.5, b = -35, turn = -.42;
    const shelter = leanTo(a, b, '#8a7a5c', turn);
    const along = (da, db) => ({ x: a + da * Math.cos(turn) + db * Math.sin(turn), z: b - da * Math.sin(turn) + db * Math.cos(turn) });
    const stone = material('#6f6a63'), soot = material('#3b3531'), iron = material('#4a474a'), coals = material('#c65a22');
    // The forge, against the closed side of the shelter, with its chimney up through the roof.
    const forge = along(-1.5, -1.1), forgeY = localGround(forge.x, forge.z);
    box(stone, forge.x, forgeY + .45, forge.z, 1.9, .9, 1.25);
    box(soot, forge.x, forgeY + .93, forge.z, 1.6, .07, 1.0);
    box(coals, forge.x, forgeY + .99, forge.z, .8, .06, .5);
    box(stone, forge.x, forgeY + 1.9, forge.z, .72, 2.0, .72);
    vpush({ x: forge.x, z: forge.z, hx: .98, hz: .66, kind: 'forge' });
    // The anvil, out where the light is, on an oak stump.
    const anvil = along(1.0, .5), anvilY = localGround(anvil.x, anvil.z);
    post(wood, anvil.x, anvilY + .3, anvil.z, .28, .6);
    box(iron, anvil.x, anvilY + .72, anvil.z, .9, .24, .3);
    box(iron, anvil.x, anvilY + .58, anvil.z, .42, .16, .24);
    vpush({ x: anvil.x, z: anvil.z, r: .42, kind: 'anvil' });
    // The quench barrel and a rack of bar stock along the back post.
    const quench = along(-.2, 1.5); barrel(quench.x, quench.z, .78);
    const rack = along(-2.1, .9), rackY = localGround(rack.x, rack.z);
    for (const [dx, h] of [[-.22, 1.5], [0, 1.68], [.22, 1.4]]) box(iron, rack.x + dx, rackY + h / 2, rack.z, .05, h, .05);
    // The board over the open side, in the sign language of the rest of Drent (src/signs.js).
    const board = along(1.6, -1.9);
    signs.hanging({ x: board.x, y: localGround(board.x, board.z) + 2.5, z: board.z, label: 'The Smithy', facing: turn, parent: villageRoot });
  }
  signs.direction({ x: 4.4, z: 15.1, label: 'The Greenway', toward: { x: 0, z: -36 }, back: { x: 0, z: 29 }, backLabel: 'Tidehaven Landing', parent: villageRoot });
  signs.direction({ x: -6, z: -86, label: 'Fernway Rest', toward: northTrail, back: { x: -2, z: -60 }, backLabel: 'Tidehaven', parent: villageRoot });
  signs.direction({ x: -10.7, z: -105, label: 'The Caloss Gate', toward: border, back: { x: -8, z: -80 }, backLabel: 'Tidehaven', parent: villageRoot });
  signs.direction({ x: 12.9, z: -129, label: 'The Caloss Gate', toward: border, back: northTrail, backLabel: 'Fernway Rest', parent: villageRoot });
  // Pueth's scenery still calls the older trailSign(x, z, direction, label, yaw, returnLabel, parent): the same
  // fingerposts, pointing ahead along the Pueth road to the place named and back along it (or the main road home).
  /** The point `metres` along a road (negative: back toward its start) from the road point nearest (x, z). */
  const roadStep = (road, x, z, metres) => {
    let best = { i: 1, t: 0, d: Infinity };
    for (let i = 1; i < road.length; i++) {
      const a = road[i - 1], b = road[i], dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
      const d = Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
      if (d < best.d) best = { i, t, d };
    }
    let i = best.i, left = metres, a = road[i - 1], b = road[i], length = Math.hypot(b.x - a.x, b.z - a.z), at = best.t * length;
    while (true) {
      const target = at + left;
      if (target >= 0 && target <= length || (target < 0 && i === 1) || (target > length && i === road.length - 1)) {
        const t = Math.max(0, Math.min(1, target / (length || 1)));
        return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
      }
      if (target > length) { left = target - length; i++; at = 0; } else { left = target; i--; }
      a = road[i - 1]; b = road[i]; length = Math.hypot(b.x - a.x, b.z - a.z);
      if (target < 0) at = length;
    }
  };
  function trailSign(x, z, direction = 1, label = '', signYaw = 0, returnLabel = 'Tidehaven', parent = villageRoot) {
    if (parent === villageRoot || !label) return signs.direction({ x, z, label: label || 'Tidehaven', parent, backLabel: returnLabel,
      toward: { x: x - Math.sin(signYaw) * 20, z: z - Math.cos(signYaw) * 20 }, back: { x: x + Math.sin(signYaw) * 20, z: z + Math.cos(signYaw) * 20 } });
    const atJunction = Math.hypot(x - PUETH_ROAD[0].x, z - PUETH_ROAD[0].z) < 15;
    return signs.direction({ x, z, label, parent, backLabel: returnLabel, toward: roadStep(PUETH_ROAD, x, z, 20),
      back: atJunction && returnLabel === 'Tidehaven' ? roadStep(MAIN_ROAD, x, z, -40) : roadStep(PUETH_ROAD, x, z, -20) });
  }

  localPatch(northTrail.x, northTrail.z, 6.7, '#aaa87d', .82);
  const restX = northTrail.x + 4.9, restZ = northTrail.z + 1.2;
  const restY = localGround(restX, restZ);
  box(woodLight, restX, restY + .58, restZ, 2.5, .16, .72);
  box(woodLight, restX, restY + 1.08, restZ - .34, 2.5, .45, .12);
  for (const s of [-1, 1]) box(wood, restX + s * .87, restY + .26, restZ, .18, .52, .61);
  vpush({ x: restX, z: restZ, r: 1.1 });
  const cairnX = northTrail.x - 4.8, cairnZ = northTrail.z - 1.7, cairnY = localGround(cairnX, cairnZ);
  pebble(rockMat, cairnX, cairnY + .24, cairnZ, .68, .37, .56);
  pebble(rockMat, cairnX + .08, cairnY + .67, cairnZ, .48, .26, .41);
  pebble(rockMat, cairnX - .03, cairnY + 1.00, cairnZ + .05, .29, .17, .25);
  vpush({ x: cairnX, z: cairnZ, r: .65 });
  lantern(restX + 1.6, restZ - .2, 2.8);

  // The Caloss Gate: an open field gate between Tidehaven's wood and the clearing.
  localPatch(border.x, border.z, 7.6, '#b5b387', .83);
  const gateY = localGround(0, border.barrierZ);
  for (const side of [-1, 1]) {
    const x = side * 3.8, y = localGround(x, border.barrierZ);
    box(rockMat, x, y + .31, border.barrierZ, .72, .62, .7);
    post(wood, x, y + 1.25, border.barrierZ, .19, 2.5);
    post(woodLight, x, y + 2.54, border.barrierZ, .23, .13);
    for (const gy of [.53, 1.22]) box(woodLight, x, gateY + gy, border.barrierZ - 1.8, .15, .16, 3.6);
    vpush({ x, z: border.barrierZ, r: .35 });
    // Short wing fences, not a wall across the forest: the border is a place.
    for (let distance = 8.8; distance <= 26; distance += 5) {
      const nextX = side * distance, nextY = localGround(nextX, border.barrierZ);
      post(wood, nextX, nextY + .76, border.barrierZ, .09, 1.52);
    }
    for (let distance = 8.8; distance < 26; distance += 5) {
      const a = side * distance, b = side * (distance + 5);
      rope([new THREE.Vector3(a, localGround(a, border.barrierZ) + 1.13, border.barrierZ),
        new THREE.Vector3((a + b) / 2, localGround((a + b) / 2, border.barrierZ) + .94, border.barrierZ),
        new THREE.Vector3(b, localGround(b, border.barrierZ) + 1.13, border.barrierZ)], .035);
    }
  }
  // Tidehaven's boundary: a painted stone, its faces naming the ground each looks into.
  signs.border({ x: -5.2, z: border.z + 1.0, facing: Math.PI, parent: villageRoot,
    faces: [{ label: 'Tidehaven', paint: SIGN_COLOURS.paint.drent }, { label: 'Avrel', paint: SIGN_COLOURS.paint.drent }] });

  // ---------------------------------------------------------------------------
  // Tidehaven's woodland: the original deterministic scatter
  // ---------------------------------------------------------------------------
  const specialClearings = [{ x: 0, z: 5, r: 9 }, { x: 0, z: -64, r: 7.5 }, { x: 31, z: -59, r: 5.7 }, { x: -10, z: -68, r: 5.5 },
    { x: training.x, z: training.z, r: 2.5 }, { x: encounter.x, z: encounter.z, r: encounter.radius }, { x: bellX, z: bellZ, r: 1.4 },
    { x: northTrail.x, z: northTrail.z, r: 7.7 }, { x: border.x, z: border.z, r: 11 }];
  function canPlant(x, z, margin = 0) {
    if (z > 19 || Math.abs(x) < 5 && z > 12) return false;
    if (z < -153 + Math.cos(x * .073) * 3) return false;
    if (z < -126 && random() < smooth(126, 154, -z) * .86) return false;
    if (distanceToPath(x, z) < 2.0 + margin) return false;
    if (houseLocations.some(h => Math.hypot(x - h.x, z - h.z) < h.r + 2.5 + margin)) return false;
    if (specialClearings.some(h => Math.hypot(x - h.x, z - h.z) < h.r + margin)) return false;
    if (Math.abs(x) < 30 && z > -28 && random() < .83) return false;
    return true;
  }
  const trees = [];
  [[-25, 17, 1.35], [25, 20, 1.4], [-34, 7, 1.2], [37, 5, 1.5], [-11, -30, 1.2], [10, -36, 1.3]]
    .forEach(([x, z, s]) => trees.push({ x, z, s, pine: false, h: range(8.1, 10.5), rot: range(0, 6.28) }));
  let attempts = 0;
  while (trees.length < 610 && attempts++ < 18000) {
    const x = range(-105, 105), z = range(-157, 22);
    if (!canPlant(x, z, .7) || trees.some(t => Math.hypot(x - t.x, z - t.z) < 3.0)) continue;
    trees.push({ x, z, s: range(.74, 1.25), pine: z < -70 ? random() < .56 : random() < .28, h: range(7, 11), rot: range(0, Math.PI * 2) });
  }
  const trunkMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(.21, .38, 1, 7), material('#795e41'), trees.length);
  const broadTrees = trees.filter(t => !t.pine), pineTrees = trees.filter(t => t.pine);
  const canopyMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), material('#ffffff', { flatShading: true }), broadTrees.length * 4);
  const pineMesh = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 7), material('#ffffff', { flatShading: true }), pineTrees.length * 3);
  let broadIndex = 0, pineIndex = 0;
  trees.forEach((tree, i) => {
    const { x, z, s, h, rot } = tree, y = localGround(x, z), th = h * s;
    // Hidden trees keep their index, so oak ids, acorns and squirrel homes never shuffle.
    tree.hidden = featureClear(x, z, true) || forestFeatureClear(x, z, true, th * .52)
      || (spot => landDistance(spot.x, spot.z) < 3 || inKoopwood(spot.x, spot.z, 2.5))(villageToWorld(x, z));   // and none in Bowden's woodlot but his own
    dummy.position.set(x, y + th * .41, z); dummy.rotation.set(range(-.025, .025), rot, range(-.025, .025));
    dummy.scale.set(s, th * .82, s); if (tree.hidden) dummy.scale.setScalar(0); dummy.updateMatrix(); trunkMesh.setMatrixAt(i, dummy.matrix);
    const axis = new THREE.Vector3(0, 1, 0).applyEuler(dummy.rotation);
    const base = villageToWorld(x - axis.x * th * .41, z - axis.z * th * .41);
    tree.trunk = { axis: [axis.z, axis.y, -axis.x], base: { x: base.x, y: y + th * .41 - axis.y * th * .41, z: base.z } };
    if (!tree.hidden && x > -95 && x < 95 && z > border.barrierZ) vpush({ x, z, r: .52 * s });
    if (tree.pine) for (let c = 0; c < 3; c++) {
      dummy.position.set(x, y + th * (.48 + c * .19), z); dummy.rotation.set(0, rot + c * .35, 0);
      dummy.scale.set(th * (.29 - c * .051), th * .49, th * (.29 - c * .051)); if (tree.hidden) dummy.scale.setScalar(0);
      dummy.updateMatrix(); pineMesh.setMatrixAt(pineIndex, dummy.matrix);
      pineMesh.setColorAt(pineIndex++, color.setHSL(range(.25, .31), range(.28, .40), range(.28, .41) + c * .025));
    } else for (let c = 0; c < 4; c++) {
      const a = rot + c * 2.1, spread = c === 3 ? 0 : th * .15;
      dummy.position.set(x + Math.sin(a) * spread, y + th * (c === 3 ? .96 : .77) + Math.sin(c * 3) * .18, z + Math.cos(a) * spread);
      dummy.rotation.set(range(-.2, .2), a, range(-.18, .18));
      dummy.scale.set(th * (c === 3 ? .28 : .32), th * (c === 3 ? .25 : .31), th * (c === 3 ? .27 : .31));
      if (tree.hidden) dummy.scale.setScalar(0); dummy.updateMatrix(); canopyMesh.setMatrixAt(broadIndex, dummy.matrix);
      canopyMesh.setColorAt(broadIndex++, color.setHSL(range(.215, .29), range(.32, .47), range(.37, .52) + (c === 3 ? .025 : 0)));
    }
  });
  [trunkMesh, canopyMesh, pineMesh].forEach(m => { m.castShadow = true; m.receiveShadow = true; villageRoot.add(m); });

  const grassPositions = [], grassNormals = [];
  for (let b = 0; b < 5; b++) {
    const a = b * 2.4, bx = Math.cos(a) * .16, bz = Math.sin(a) * .16, w = .055, h = .24 + (b % 3) * .085;
    const cx = Math.cos(a + Math.PI / 2) * w, cz = Math.sin(a + Math.PI / 2) * w;
    grassPositions.push(bx - cx, 0, bz - cz, bx + cx, 0, bz + cz, bx + Math.cos(a) * .09, h, bz + Math.sin(a) * .09);
    for (let j = 0; j < 3; j++) grassNormals.push(0, 1, 0);
  }
  const grassGeometry = new THREE.BufferGeometry();
  grassGeometry.setAttribute('position', new THREE.Float32BufferAttribute(grassPositions, 3));
  grassGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(grassNormals, 3));
  const grass = new THREE.InstancedMesh(grassGeometry, material('#ffffff', { side: THREE.DoubleSide }), 4300);
  let grassIndex = 0, grassAttempts = 0;
  while (grassIndex < 4300 && grassAttempts++ < 18000) {
    const x = range(-88, 88), z = range(-166, 24);
    if (distanceToPath(x, z) < .15 || houseLocations.some(h => Math.hypot(x - h.x, z - h.z) < h.r + .2) || specialClearings.some(h => Math.hypot(x - h.x, z - h.z) < h.r * .58)) continue;
    if (inLessonSpace(x, z) && random() < .76) continue;
    const y = localGround(x, z); if (y < .65) continue;
    dummy.position.set(x, y + .02, z); dummy.rotation.set(0, range(0, 6.28), 0);
    const s = range(.7, 1.65) * (inLessonSpace(x, z) ? .45 : 1); dummy.scale.set(s, s, s); dummy.updateMatrix(); grass.setMatrixAt(grassIndex, dummy.matrix);
    grass.setColorAt(grassIndex++, color.setHSL(z < -140 ? range(.15, .22) : range(.20, .28), range(.35, .49), range(.34, .52)));
  }
  grass.count = grassIndex; grass.receiveShadow = true; villageRoot.add(grass);
  const bushCount = 210, bushes = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), material('#ffffff'), bushCount);
  let bidx = 0;
  for (let i = 0; i < 1800 && bidx < bushCount; i++) {
    const x = range(-80, 80), z = range(-149, 19);
    if (distanceToPath(x, z) < 1.4 || houseLocations.some(h => Math.hypot(x - h.x, z - h.z) < h.r + 1) || inLessonSpace(x, z, 1.2) || Math.hypot(x - bellX, z - bellZ) < 2 || specialClearings.some(h => Math.hypot(x - h.x, z - h.z) < h.r * .7)) continue;
    const s = range(.45, 1.2); dummy.position.set(x, localGround(x, z) + s * .42, z); dummy.rotation.set(0, range(0, 6.28), 0);
    dummy.scale.set(s, s * .7, s * .85); if (inBirdGarden(x, z)) dummy.scale.setScalar(0); dummy.updateMatrix(); bushes.setMatrixAt(bidx, dummy.matrix);
    bushes.setColorAt(bidx++, color.setHSL(range(.22, .31), .34, range(.33, .46)));
  }
  bushes.count = bidx; bushes.castShadow = true; bushes.receiveShadow = true; villageRoot.add(bushes);
  const flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), material('#ffffff'), 600);
  let findex = 0;
  const flowerColors = ['#efe4b1', '#eac780', '#b8b9db', '#e7a2a0', '#e6e5c5'];
  for (let i = 0; i < 1800 && findex < 600; i++) {
    const x = range(-45, 45), z = range(-158, 22), d = distanceToPath(x, z);
    if (d < .28 || d > 9 || houseLocations.some(h => Math.hypot(x - h.x, z - h.z) < h.r + .6) || inLessonSpace(x, z, .5)) continue;
    const count = Math.min(3, 600 - findex), fc = flowerColors[Math.floor(random() * flowerColors.length)];
    for (let f = 0; f < count; f++) {
      const fx = x + range(-.5, .5), fz = z + range(-.5, .5), s = range(.07, .13);
      dummy.position.set(fx, localGround(fx, fz) + range(.2, .38), fz); dummy.rotation.set(0, range(0, 6.28), 0);
      dummy.scale.set(s, s * .48, s); if (inBirdGarden(fx, fz)) dummy.scale.setScalar(0); dummy.updateMatrix(); flowers.setMatrixAt(findex, dummy.matrix); flowers.setColorAt(findex++, color.set(fc));
    }
  }
  flowers.count = findex; villageRoot.add(flowers);
  const rocks = new THREE.InstancedMesh(round, rockMat, 145);
  for (let i = 0; i < 145; i++) {
    let x, z;
    do {
      if (i < 75) { x = range(-95, 95); z = range(23, 31); } else { x = range(-100, 100); z = range(-157, 19); }
    } while (distanceToPath(x, z) < 1.6 || houseLocations.some(h => Math.hypot(x - h.x, z - h.z) < h.r + 1.3) || inLessonSpace(x, z, 1.4) || Math.hypot(x - bellX, z - bellZ) < 2 || specialClearings.some(h => Math.hypot(x - h.x, z - h.z) < h.r * .8));
    const s = range(.3, 1.25), y = localGround(x, z);
    dummy.position.set(x, y + s * .21, z); dummy.rotation.set(range(-.2, .2), range(0, 6.28), range(-.2, .2));
    dummy.scale.set(s, s * range(.35, .75), s * range(.7, 1.3)); if (inBirdGarden(x, z)) dummy.scale.setScalar(0); dummy.updateMatrix(); rocks.setMatrixAt(i, dummy.matrix);
    rocks.setColorAt(i, color.setHSL(.17, .10, range(.44, .61)));
    if (s > .55 && y > .4) vpush({ x, z, r: s * .76 });
  }
  rocks.castShadow = true; rocks.receiveShadow = true; villageRoot.add(rocks);

  // ---------------------------------------------------------------------------
  // Roads, in world metres
  // ---------------------------------------------------------------------------
  const roadSpurs = [
    [at(-236, 30), at(-248, 16), at(-252, 8)],
    [at(-230, 38), at(-230, 50)],
    [at(-330, 88), at(-318, 96), { x: CALOSS_BANK.spot.x, z: CALOSS_BANK.spot.z }],
    [at(-362, 107), at(-370, 114), at(-374, 118)],
    [at(-378, 132), at(-392, 132)],
    [at(-372, 142), at(-364, 150)],
    [at(-394, 168), at(-404, 172)],
    [at(-392, 176), { x: STORY_SITES.lauvelField.x, z: STORY_SITES.lauvelField.z }],
    [at(-398, 202), at(-376, 208), { x: STORY_SITES.burnedHamlet.x, z: STORY_SITES.burnedHamlet.z }],
    // The track to the border stockade comes round its west side to the south gate, where the Solis road leaves.
    [at(-446, 276), at(-420, 292), STOCKADE_TRACK_BEND, STOCKADE_APPROACH],
    [at(-556, 334), { x: STORY_SITES.horseHitch.x, z: STORY_SITES.horseHitch.z }],
  ];
  // Measure every road before any scenery, so nothing is planted across one.
  measurePath(MAIN_ROAD, 4.2); measurePath(SUVAL_ROAD, 3.4); measurePath(SOLIS_ROAD, 4.2); measurePath(PUETH_ROAD, 4.2); measurePath(AMOD_ROAD, 4.2); measurePath(HIDEOUT_APPROACH_TRAIL, 1.85);
  measurePath(RENA_ROAD, 2.6);   // the old Rena road, off the main road at Drent's centre (src/rena.js)
  for (const path of IZOL_PATHS) measurePath(path.points, path.width);
  measurePath(AMBRON_ROAD, 4.6); measurePath(LAKE_ROAD, 3.6); for (const track of ELAGOS_ROADS.slice(2)) measurePath(track, 2.6);
  for (const spur of roadSpurs) measurePath(spur, 2.2);
  for (const path of REGIONAL_PATHS) measurePath(path, 1.85);
  const regionScenery = createRegionScenery({
    root: world, material, mesh, box, post, pebble, rope, cottage, fence, leanTo, barrel, crate,
    groundHeight, colliders, wornPatch, dummy, color,
    wood, woodLight, darkWood, cream, rockMat, roofGeometry, cylinder, round,
    movingGroups, roadDistance,
    riverDistance: (x, z) => Math.min(calossDistance(x, z), puethRiverDistance(x, z, 14), tarvelDistance(x, z), westRiverDistance(x, z, 14)),
    // Ground the biome scatter grows nothing on: Elagosi water, western water, and
    // the sinter crust on Vastos's western fall, where the grass stops in a line.
    waterClear: (x, z) => inElagosWater(x, z, 2.5) || westBareGround(x, z, 2),
    // Tidehaven's own woodland already fills this box; the regional scatter
    // starts where the carried-over settlement ends.
    insideVillage: (x, z) => {
      const local = worldToVillage(x, z);
      return local.x > -122 && local.x < 122 && local.z > -182 && local.z < 40;
    },
  });
  bridgeDeck = regionScenery.bridge; bridgeDecks.push(bridgeDeck);
  // Pueth: its rivers, the Tessen bridge and road post, Rimeholt and its own scatter.
  const puethScenery = createPuethScenery({
    root: world, material, mesh, box, post, pebble, rope, cottage, fence, barrel, crate, wornPatch, trailSign: (...args) => trailSign(...args),
    groundHeight, colliders, dummy, color, wood, woodLight, darkWood, cream, rockMat, roofGeometry, cylinder, round,
    roadDistance, riverMaterial: regionScenery.riverMaterial, regionClear,
    insideVillage: (x, z) => { const local = worldToVillage(x, z); return local.x > -122 && local.x < 122 && local.z > -182 && local.z < 40; },
  });
  bridgeDecks.push(puethScenery.bridge);
  // Amod: the Tarvel and its terraces, Ostel on its shoulder, the burial ground, the pass stones and the region's own scatter.
  const amodScenery = createAmodScenery({
    root: world, material, mesh, box, post, pebble, barrel, crate, wornPatch, trailSign: (...args) => trailSign(...args),
    groundHeight, colliders, dummy, color, wood, woodLight, darkWood, roofGeometry, cylinder, round,
    riverMaterial: regionScenery.riverMaterial, regionClear,
  });
  bridgeDecks.push(amodScenery.bridge);
  // Peblos: Cobble and its quay, the island places, the outer islands' landmarks and the ferryman's boat.
  const peblosScenery = createPeblosScenery({
    root: world, material, mesh, box, post, pebble, rope, cottage, barrel, crate, wornPatch, trailSign: (...args) => trailSign(...args),
    groundHeight, colliders, dummy, color, wood, woodLight, darkWood, cream, rockMat, roofGeometry, cylinder, round, movingGroups,
  });
  // East Suval (src/east-suval-world.js): Elod on its rock, the places along its
  // coast and its dry valleys, and the region's own limestone scatter.
  const eastSuval = createEastSuvalScenery({
    root: world, material, mesh, box, post, pebble, rope, barrel, crate, wornPatch, sign: roadsideSign,
    groundHeight, colliders, dummy, color, wood, woodLight, darkWood, cream, rockMat, roofGeometry, cylinder, round,
    roadDistance,
  });
  // West Suval and Solis (src/west-suval-world.js): the city, its walls, the Coalition's camp and the road's country.
  const westSuval = createWestSuvalScenery({ root: world, material, mesh, box, post, pebble, rope, groundHeight, colliders, wornPatch, roofGeometry, cylinder, round,
    wood, woodLight, darkWood, cream, movingGroups, roadDistance, sign: roadsideSign, signs, barrel });
  // Paradise Springs (src/winery-world.js): Lakota's old winery in the north-east of West Suval.
  const winery = createWineryScenery({ root: world, material, mesh, box, post, barrel, groundHeight, colliders, cylinder, round, wornPatch, signs, movingGroups });
  // West Izol (src/izol-scenery.js): Izolveth, its harbour and moles, the Coalition's camp above the town,
  // Ardveth, Kelvath Cove, the Sea Gate, the Sightstone and the island's own scatter.
  const izol = createIzolScenery({ root: world, material, mesh, box, post, pebble, rope, cottage, barrel, crate, wornPatch, sign: roadsideSign,
    groundHeight, colliders, dummy, color, wood, woodLight, darkWood, cream, roofGeometry, cylinder, round, movingGroups });
  // Elagos and Ambron (src/elagos-scenery.js): the lakes, the walled city on the narrows, and the lake country.
  const elagos = createElagosScenery({ parent: world, heightAt: groundHeight, colliders, signs, roadDistance });
  bridgeDecks.push(elagos.bridge);
  // The four western regions (src/west-regions-scenery.js): their water, their gravel,
  // their sedge and Vastos's sulfur ground. Terrain and wildlife only; nobody lives there.
  const westScenery = createWestScenery({ root: world, material, mesh, pebble, groundHeight, colliders, wornPatch, dummy, color, round });
  // The built places: the Moros Plain's outpost, stockade, gate and wayside (see moros-works.js).
  const stakedProps = [];
  buildMorosWorks({ parent: world, heightAt: groundHeight, colliders, signs, movingGroups, stakedProps, roadDistance });
  buildFrontierWorks({ parent: world, heightAt: groundHeight, colliders, signs });
  buildPlaceWorks({ parent: world, heightAt: groundHeight, colliders, signs, roadDistance });
  // The three Renas: the razed town at Drent's centre, Applegarth, and Rena's own wayside (src/rena-works.js).
  buildRenaWorks({ parent: world, heightAt: groundHeight, colliders, signs, roadDistance });
  // Brandy Frank's dye yard, on the lane up to Saltwind Lookout (src/brandy-yard.js).
  createBrandyYard({ parent: world, material, mesh, box, post, round, cylinder, heightAt, colliders, signs });
  // The two lights of this coast (src/lighthouse-world.js): Addison's on the West Suval head
  // south of the winery lane, and her sister's across the water on the head below Elod, which
  // is taller, blacker, and has a derrick over the cliff for bringing up what the sea leaves.
  createLighthouse({ parent: world, material, mesh, box, post, round, cylinder, heightAt, colliders, signs });
  createLighthouse({ parent: world, material, mesh, box, post, round, cylinder, heightAt, colliders, signs }, ELOD_LIGHT,
    { stone: '#4a4a4f', stoneDark: '#343438', stoneLight: '#5e5e63', slate: '#26262a', door: '#2b2723' });
  // The Koopwood, Bowden Koop's woodlot, where woodcutting is learned (src/woodcutting.js, src/woodlot-world.js).
  const woodlot = createWoodlot({ parent: world, material, mesh, box, post, round, cylinder, heightAt, colliders, signs, movingGroups });
  // The traveler's house on the plot beside it, and the birdhouse posts in the Greenway (src/construction.js, src/homestead-world.js).
  const homestead = createHomestead({ parent: world, material, mesh, box, post, round, cylinder, heightAt, colliders, movingGroups, reindex: () => { colliderIndex = null; } });
  addPath(MAIN_ROAD, 4.2);
  addPath(SUVAL_ROAD, 3.4);
  addPath(SOLIS_ROAD, 4.2);
  for (const spur of roadSpurs) addPath(spur, 2.2);
  // Tidehaven's own lanes and woodland spurs stay in the village's frame.
  function addLocalPath(points, width) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p.x, 0, p.z)));
    const samples = curve.getPoints(Math.max(2, Math.ceil(curve.getLength() / .9)));
    const positions = [], indices = [];
    for (let i = 0; i < samples.length; i++) {
      const p = samples[i];
      const direction = samples[Math.min(i + 1, samples.length - 1)].clone().sub(samples[Math.max(0, i - 1)]).normalize();
      const left = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(width / 2);
      for (const sign of [-1, 1]) {
        const x = p.x + left.x * sign, z = p.z + left.z * sign;
        positions.push(x, localGround(x, z) + .045, z);
      }
      if (i) { const j = i * 2; indices.push(j - 2, j, j - 1, j - 1, j, j + 1); }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    const path = new THREE.Mesh(geometry, material('#c6b384', { side: THREE.DoubleSide }));
    path.receiveShadow = true; villageRoot.add(path);
    paths.push(points.map(p => villageToWorld(p.x, p.z)));
  }
  for (const lane of localSidePaths) addLocalPath(lane, 2.6);
  for (const path of pondPaths) addLocalPath(path, 2.1);
  for (const path of forestPlacePaths) addLocalPath(path, 1.85);
  for (const path of REGIONAL_PATHS) addPath(path, 1.85);
  addPath(FOREST_HIDEOUT.trail.map(p => hideoutToWorld(p.x, p.z)), 1.85);
  addPath(PUETH_ROAD, 4.2);
  addPath(AMOD_ROAD, 4.2);
  addPath(HIDEOUT_APPROACH_TRAIL, 1.85);
  addPath(RENA_ROAD, 2.6);
  for (const path of IZOL_PATHS) addPath(path.points, path.width);
  addPath(AMBRON_ROAD, 4.6); addPath(LAKE_ROAD, 3.6); for (const track of ELAGOS_ROADS.slice(2)) addPath(track, 2.6);

  // Fingerposts along the new road: each points at its place, and back the way the traveler came.
  /** A point 40 m back along the nearest road, toward where that road starts. */
  const backAlong = (x, z) => {
    let best = null, bestDistance = Infinity;
    for (const road of [MAIN_ROAD, SUVAL_ROAD]) for (let i = 1; i < road.length; i++) {
      const a = road[i - 1], b = road[i], dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (length * length)));
      const distance = Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
      if (distance < bestDistance) { bestDistance = distance; best = { x: a.x + dx * (t - 40 / length), z: a.z + dz * (t - 40 / length) }; }
    }
    return best;
  };
  /** Ground a traveler could walk up to a post on: dry, and inside nothing already built. */
  const signFooting = (px, pz) => {
    if (groundHeight(px, pz) < .45) return false;
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (c.r !== undefined) { const dx = px - c.x, dz = pz - c.z, reach = c.r + .45; if (dx * dx + dz * dz < reach * reach) return false; }
      else if (Math.abs(px - c.x) < c.hx + .45 && Math.abs(pz - c.z) < c.hz + .45) return false;
    }
    return true;
  };
  const branch = (() => { const [a, b] = SUVAL_ROAD, l = Math.hypot(b.x - a.x, b.z - a.z); return { x: a.x + (b.x - a.x) / l * 14 - (b.z - a.z) / l * 3.6, z: a.z + (b.z - a.z) / l * 14 + (b.x - a.x) / l * 3.6 }; })();
  for (const [x, z, label, target, backLabel = 'Tidehaven'] of [
    [-192, 22, 'The Avrel Clearing', AVREL_CLEARING], [-222, 46, 'Clearing mill & farms', at(-222, 62)],
    [-284, 58, 'Caloss Crossing', CALOSS.crossing], [-330, 82, 'The Caloss Bridge', CALOSS.crossing],
    [-366, 112, 'Reedcutters’ Camp', at(-372, 116)], [-378, 128, 'Sava’s Shrine', at(-374, 134)],
    [-386, 158, 'The Waymarkers', at(-386, 152)], [-396, 186, 'The Lauvel Relay', at(-401, 196)],
    [-321, 100, 'Quiet fishing bank', CALOSS_BANK.spot, 'Return to bridge'],
    [-470, 300, 'The Army Camp', STORY_SITES.legionCamp],
    [branch, null, 'The Elodi Frontier', SUVAL_ROAD[6]], [-120, 330, 'Elod', STORY_SITES.elodGate, 'The Elodi Frontier'],
  ]) {
    const spot = typeof x === 'object' ? x : at(x, z);
    let px = spot.x, py = spot.z, guard = 0;
    while (roadDistance(px, py) < 2.4 && guard++ < 14) { px += Math.sign(spot.x + 535) * .8; py += 1.1; }
    // That nudge walks one fixed diagonal, so where a road runs the same way the post has
    // far to go before it is clear - and it can walk off the bank. At the Caloss it ended
    // in the river, 3.8 m below the ground beside it, with its head under the water. A post
    // nobody can read is worse than one close to the road, so find dry ground off the road.
    if (!signFooting(px, py)) {
      let dry = null;
      for (let reach = 1; reach <= 14 && !dry; reach += .5) for (let turn = 0; turn < 24; turn++) {
        const angle = turn / 24 * Math.PI * 2, cx = spot.x + Math.cos(angle) * reach, cz = spot.z + Math.sin(angle) * reach;
        if (roadDistance(cx, cz) >= 2.4 && signFooting(cx, cz)) { dry = { cx, cz }; break; }
      }
      if (dry) { px = dry.cx; py = dry.cz; }
    }
    signs.direction({ x: px, z: py, label, toward: target, back: backAlong(px, py), backLabel, parent: world });
  }

  // ---------------------------------------------------------------------------
  // Journey sites, benches and fires along the new road
  // ---------------------------------------------------------------------------
  const journeyVisuals = new Map();
  const journeyState = Object.fromEntries(Object.keys(journeySites).map(id => [id, false]));
  for (const p of Object.values(regionNpcPositions)) wornPatch(p.x, p.z, 4.7, '#b2a881');
  for (const p of Object.values(journeySites)) wornPatch(p.x, p.z, p.type === 'beacon' ? 3.0 : 1.25, '#b5a582');
  let beaconIndex = 0;
  for (const site of Object.values(journeySites)) {
    const group = new THREE.Group(); group.name = `Journey site ${site.id}`; world.add(group); movingGroups.add(group);
    const y = groundHeight(site.x, site.z);
    if (site.type === 'parcel') {
      box(material(site.id.endsWith('2') ? '#849b8e' : '#c4b384'), site.x, y + .24, site.z, .62, .43, .47, group);
      box(cream, site.x, y + .465, site.z, .075, .016, .49, group); box(cream, site.x, y + .466, site.z, .65, .016, .07, group);
      pebble(material('#b17150'), site.x, y + .48, site.z, .075, .025, .065, group);
      journeyVisuals.set(site.id, { incomplete: group });
    } else if (site.type === 'sticks') {
      for (let i = 0; i < 3; i++) { const branch = post(woodLight, site.x + (i - 1) * .15, y + .10, site.z, .065, 1.15, group); branch.rotation.set(Math.PI / 2, 0, (i - 1) * .22); }
      journeyVisuals.set(site.id, { incomplete: group });
    } else if (site.type === 'fruit') {
      for (let i = 0; i < 3; i++) pebble(material('#b5b66c'), site.x + (i - 1) * .22, y + .13, site.z + (i % 2) * .22, .15, .13, .26, group);
      journeyVisuals.set(site.id, { incomplete: group });
      const tx = site.x + 2.9, tz = site.z + .7, ty = groundHeight(tx, tz);
      post(wood, tx, ty + 1.45, tz, .13, 2.9, world); pebble(material('#799757'), tx, ty + 3.0, tz, 1.65, 1.2, 1.45, world);
      colliders.push({ x: tx, z: tz, r: .25, kind: 'fruit-tree' });
    } else if (site.type === 'beacon') {
      const lean = beaconIndex++ % 2 ? .24 : -.24;
      const bx = site.x + (lean < 0 ? -2.1 : 2.1), bz = site.z, by = groundHeight(bx, bz);
      post(material('#a6a596'), bx, by + .30, bz, .77, .6, world);
      group.position.set(bx, by + .35, bz); group.rotation.z = lean;
      pebble(material('#91998c'), 0, 1.0, 0, .55, 1.18, .45, group);
      box(material('#897a51'), 0, 1.21, .40, .18, .78, .05, group);
      const arrowInset = mesh(new THREE.ShapeGeometry(arrowGeo), material('#8f8963'), 0, 1.59, .43, .34, .34, 1, group); arrowInset.rotation.z = Math.PI / 2;
      colliders.push({ x: bx, z: bz, r: .85, kind: 'waymarker' });
      const flame = new THREE.Group(); flame.name = `${site.id} light`; flame.position.set(0, 1.21, .445); group.add(flame);
      // Restored: a fresh coat of lime on the face and the arrow repainted, in the signs' own paint.
      box(material(SIGN_COLOURS.letter), 0, 0, 0, .18, .78, .025, flame);
      const polishedArrow = mesh(new THREE.ShapeGeometry(arrowGeo), material(SIGN_COLOURS.paint.empire), 0, .38, .012, .34, .34, 1, flame);
      polishedArrow.rotation.z = Math.PI / 2;
      flame.visible = false;
      journeyVisuals.set(site.id, { complete: flame, pivot: group, lean });
    }
  }
  journeyVisuals.set('bridge-repair', { complete: regionScenery.repairedDeck, incomplete: regionScenery.brokenCord, blockers: regionScenery.damagedColliders });
  movingGroups.add(regionScenery.repairedDeck); movingGroups.add(regionScenery.brokenCord); movingGroups.add(regionScenery.millSails);
  for (const bench of [...regionRepairBenches, OUTPOST_BENCH]) {
    const x = bench.x - 1.65, z = bench.z, y = groundHeight(x, z);
    wornPatch(bench.x, bench.z, 2.5, '#aaa182');
    box(woodLight, x, y + .78, z, 1.5, .15, .75, world);
    for (const dx of [-.57, .57]) for (const dz of [-.25, .25]) box(wood, x + dx, y + .38, z + dz, .13, .76, .13, world);
    pebble(material('#96988e'), x, y + .96, z, .4, .11, .25, world); box(darkWood, x + .43, y + .92, z + .17, .4, .07, .08, world);
    colliders.push({ x, z, hx: .78, hz: .4, kind: 'repair-bench' });
  }
  const worldFirePits = [
    ...firePits.map(fire => ({ ...fire, ...villageToWorld(fire.x, fire.z),
      ...(({ x, z }) => ({ fireX: x, fireZ: z }))(villageToWorld(fire.fireX, fire.fireZ)) })),
    ...regionFirePits.map(fire => ({ ...fire })), { ...OUTPOST_FIRE },
  ];

  // ---------------------------------------------------------------------------
  // Distant country and the inland horizon
  // ---------------------------------------------------------------------------
  // The Elagos summits keep their height; only their footprint and their
  // distance grow, so the horizon reads the same from a bigger Drent.
  const distantSummits = [
    { ...at(-690, -120), topY: 58, width: 34 * WORLD_SCALE, depth: 29 * WORLD_SCALE, lean: -3, phase: .2 },
    { ...at(-760, -40), topY: 66, width: 37 * WORLD_SCALE, depth: 31 * WORLD_SCALE, lean: 2, phase: 1.1 },
    { ...at(-800, 60), topY: 54, width: 30 * WORLD_SCALE, depth: 26 * WORLD_SCALE, lean: -1.5, phase: 2.4 },
  ];
  const summitMaterial = material('#7c8b83', { flatShading: true });
  for (const [index, summit] of distantSummits.entries()) {
    const baseY = bedrockHeight(summit.x, summit.z) - 2, height = summit.topY - baseY, positions = [], indices = [];
    for (let ring = 0; ring < 3; ring++) for (let i = 0; i < 7; i++) {
      const angle = i * Math.PI * 2 / 7 + summit.phase, radius = [1, .70, .29][ring] * (1 + Math.sin(i * 1.83 + summit.phase) * .13);
      const localY = height * [0, .43, .77][ring] + (ring ? Math.sin(i * 2.2 + summit.phase) * height * .045 : 0);
      positions.push(Math.cos(angle) * summit.width * radius + summit.lean * ring * .28, localY, Math.sin(angle) * summit.depth * radius);
    }
    positions.push(summit.lean, height, -1.5);
    for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 7; i++) {
      const a = ring * 7 + i, b = ring * 7 + (i + 1) % 7;
      indices.push(a, a + 7, b, b, a + 7, b + 7);
    }
    for (let i = 0; i < 7; i++) indices.push(14 + i, 21, 14 + (i + 1) % 7);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
    const peak = mesh(geometry, summitMaterial, summit.x, baseY, summit.z, 1, 1, 1, world);
    peak.name = `Three Presences summit ${index + 1}`; peak.castShadow = false;
  }
  const mountainMat = material('#849b83');
  for (let i = 0; i < 10; i++) {
    const { x, z } = at(-880 - (i % 5) * 46, -160 + i * 92);
    const mountain = mesh(new THREE.ConeGeometry(1, 1, 7), mountainMat, x, 6, z,
      range(30, 48) * WORLD_SCALE, range(12, 26), range(30, 50) * WORLD_SCALE, world);
    mountain.rotation.y = range(0, 6.28); mountain.castShadow = false;
  }

  // ---------------------------------------------------------------------------
  // Clearings, places and people
  // ---------------------------------------------------------------------------
  const clearingMatrix = new THREE.Matrix4(), clearingPosition = new THREE.Vector3();
  for (const cover of [grass, bushes, flowers, rocks]) {
    for (let i = 0; i < cover.count; i++) {
      cover.getMatrixAt(i, clearingMatrix); clearingPosition.setFromMatrixPosition(clearingMatrix);
      const spot = villageToWorld(clearingPosition.x, clearingPosition.z);
      if (!featureClear(clearingPosition.x, clearingPosition.z, cover === rocks) && landDistance(spot.x, spot.z) > .4) continue;
      clearingMatrix.makeScale(0, 0, 0); cover.setMatrixAt(i, clearingMatrix);
    }
    cover.instanceMatrix.needsUpdate = true;
  }
  for (let i = colliders.length - 1; i >= 0; i--) {
    const local = worldToVillage(colliders[i].x, colliders[i].z);
    if (!colliders[i].kind && featureClear(local.x, local.z, true)) colliders.splice(i, 1);
  }
  const forestSignPositions = [[-5, -43.5, Math.PI / 2], [19, -43, -Math.PI / 2], [14.3, -81, .6],
    [-14, -89, Math.PI / 2], [-10, -109.7, Math.PI / 2], [-27, 13, Math.PI / 2]];
  forestPlaceDefinitions.forEach((site, index) => {
    const [x, z] = forestSignPositions[index], head = site.trail[1] ?? site;
    signs.direction({ x, z, label: site.name, toward: head, back: { x: 2 * x - head.x, z: 2 * z - head.z }, backLabel: 'Village road', parent: villageRoot });
  });
  const localWorld = { heightAt: localGround, colliders: localColliders };
  const forestPlaces = createForestPlaces(villageRoot, localWorld);
  const forestHideout = createForestHideout(hideoutRoot, { heightAt: (x, z) => { const p = hideoutToWorld(x, z); return groundHeight(p.x, p.z); }, colliders: hideoutColliders });
  const regionalPlaces = createRegionalPlaces(world, { heightAt: groundHeight, colliders });

  const reedMat = material('#758249'), reedHead = material('#705637');
  for (let i = 0; i < 25; i++) {
    const angle = i * .247 + .3, r = pond.radius + .2 + Math.sin(i * 1.7) * .18;
    const x = pond.x + Math.sin(angle) * r, z = pond.z + Math.cos(angle) * r;
    if (Math.hypot(x - pond.fishingSpot.x, z - pond.fishingSpot.z) < 3.8) continue;
    const y = localGround(x, z);
    if (i % 3 === 0) pebble(rockMat, x, y + .10, z, .38, .22, .28);
    for (let j = 0; j < 3; j++) {
      const rx = x + Math.sin(j * 2.1) * .17, rz = z + Math.cos(j * 2.1) * .17, h = .55 + (i % 4) * .11 + j * .06;
      post(reedMat, rx, localGround(rx, rz) + h / 2, rz, .018, h);
      const leaf2 = box(reedMat, rx + .09, localGround(rx, rz) + h * .46, rz, .04, h * .66, .019); leaf2.rotation.z = -.35;
      if (j === 0) post(reedHead, rx, localGround(rx, rz) + h * .96, rz, .043, .19);
    }
  }
  localPatch(pond.fishingSpot.x, pond.fishingSpot.z, 1.1, '#b7aa7b', .8);
  const fishingBucket = { x: pondFisher.x - 1.0, z: pondFisher.z - 1.3 };
  post(woodLight, fishingBucket.x, localGround(fishingBucket.x, fishingBucket.z) + .23, fishingBucket.z, .28, .43);
  post(darkWood, fishingBucket.x, localGround(fishingBucket.x, fishingBucket.z) + .455, fishingBucket.z, .23, .012);
  mesh(new THREE.TorusGeometry(.24, .024, 4, 12, Math.PI), darkWood, fishingBucket.x, localGround(fishingBucket.x, fishingBucket.z) + .42, fishingBucket.z);

  // ---------------------------------------------------------------------------
  // Fires and fishing
  // ---------------------------------------------------------------------------
  const campfires = new Map();
  const flameMat = new THREE.MeshBasicMaterial({ color: '#ee9a3f' });
  const flameCoreMat = new THREE.MeshBasicMaterial({ color: '#ffe6a4' });
  for (const fire of worldFirePits) {
    const x = fire.fireX, z = fire.fireZ, y = groundHeight(x, z);
    wornPatch(x, z, 1.02, '#8c8166');
    for (let i = 0; i < 9; i++) {
      const a = i * Math.PI * 2 / 9;
      pebble(rockMat, x + Math.sin(a) * .68, y + .13, z + Math.cos(a) * .68, .22, .17, .19, world);
    }
    for (const angle of [-.65, .7]) {
      const log = post(darkWood, x, y + .17, z, .13, .91, world); log.rotation.set(Math.PI / 2, 0, angle);
    }
    colliders.push({ x, z, r: .62, kind: 'firepit' });
    const flames = new THREE.Group(); flames.name = `${fire.id} flames`; flames.position.set(x, y + .2, z); world.add(flames);
    const flameBatch = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 6), flameMat, 3);
    for (let i = 0; i < 3; i++) {
      dummy.position.set((i - 1) * .17, .21 + (i % 2) * .14, (i % 2) * .10);
      dummy.rotation.set(.08, i * 2, (i - 1) * -.15); dummy.scale.set(.20, .60 + (i % 2) * .27, .17); dummy.updateMatrix();
      flameBatch.setMatrixAt(i, dummy.matrix);
    }
    flames.add(flameBatch);
    const flameCore = new THREE.Mesh(new THREE.ConeGeometry(.15, .48, 5), flameCoreMat); flameCore.position.y = .15; flames.add(flameCore);
    const glow = new THREE.PointLight('#ffc675', 2.4, 4.5, 2); glow.position.y = .52; flames.add(glow);
    flames.visible = false; fire.lit = false; campfires.set(fire.id, { fire, flames, glow });
    movingGroups.add(flames);
  }
  let fishingPhase = 'idle';
  const fishingVisual = new THREE.Group(); fishingVisual.name = 'Pond fishing line and float'; world.add(fishingVisual);
  const bobber = new THREE.Group();
  bobber.position.set(fishingSpots[0].castPoint.x, fishingSpots[0].castPoint.y, fishingSpots[0].castPoint.z); fishingVisual.add(bobber);
  pebble(material('#d9794e'), 0, .035, 0, .095, .12, .095, bobber);
  pebble(cream, 0, -.02, 0, .103, .065, .103, bobber);
  const rippleGeometry = new THREE.RingGeometry(.25, .28, 32); rippleGeometry.rotateX(-Math.PI / 2);
  const fishingRipple = new THREE.Mesh(rippleGeometry, new THREE.MeshBasicMaterial({ color: '#e4e8bd', transparent: true, opacity: .6, depthWrite: false }));
  fishingRipple.position.set(fishingSpots[0].castPoint.x, fishingSpots[0].surfaceY + .048, fishingSpots[0].castPoint.z); fishingVisual.add(fishingRipple);
  const lineStart = new THREE.Vector3(fishingSpots[0].fishingSpot.x, groundHeight(fishingSpots[0].fishingSpot.x, fishingSpots[0].fishingSpot.z) + 1.65, fishingSpots[0].fishingSpot.z + 1.45);
  const lineEnd = new THREE.Vector3(fishingSpots[0].castPoint.x, fishingSpots[0].castPoint.y + .08, fishingSpots[0].castPoint.z);
  const fishingLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
    lineStart, lineStart.clone().lerp(lineEnd, .5).add(new THREE.Vector3(0, -.23, 0)), lineEnd,
  ]), new THREE.LineBasicMaterial({ color: '#d7c89b', transparent: true, opacity: .85 }));
  const fishingMidpoint = new THREE.Vector3();
  function setFishingOrigin(position) {
    if (!position || ![position.x, position.y, position.z].every(Number.isFinite)) return false;
    lineStart.copy(position); lineEnd.copy(bobber.position); lineEnd.y += .08;
    fishingMidpoint.copy(lineStart).lerp(lineEnd, .5); fishingMidpoint.y -= .23;
    const vertices = fishingLine.geometry.attributes.position;
    vertices.setXYZ(0, lineStart.x, lineStart.y, lineStart.z);
    vertices.setXYZ(1, fishingMidpoint.x, fishingMidpoint.y, fishingMidpoint.z);
    vertices.setXYZ(2, lineEnd.x, lineEnd.y, lineEnd.z);
    vertices.needsUpdate = true; fishingLine.geometry.computeBoundingSphere(); return true;
  }
  fishingVisual.add(fishingLine); fishingVisual.visible = false;
  movingGroups.add(fishingVisual);
  function setFishingSpot(id) {
    const next = fishingSpots.find(spot => spot.id === id);
    if (!next || (fishingPhase !== 'idle' && next !== activeFishingSpot)) return false;
    activeFishingSpot = next;
    bobber.position.set(next.castPoint.x, next.castPoint.y, next.castPoint.z);
    fishingRipple.position.set(next.castPoint.x, next.surfaceY + .048, next.castPoint.z);
    lineEnd.set(next.castPoint.x, next.castPoint.y + .08, next.castPoint.z);
    setFishingOrigin(lineStart); return true;
  }

  const smoke = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#ecebd4', transparent: true, opacity: .13, depthWrite: false }), smokeSources.length * 4);
  world.add(smoke);
  const birds = [];
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, .66, .06, .13, .22, 0, -.13], 3)); wingGeo.computeVertexNormals();
  const birdMat = material('#f4ecce', { side: THREE.DoubleSide });
  for (let i = 0; i < 9; i++) {
    const group = new THREE.Group(); world.add(group);
    const l = mesh(wingGeo, birdMat, 0, 0, 0, 1, 1, 1, group), r = mesh(wingGeo, birdMat, 0, 0, 0, -1, 1, 1, group);
    l.castShadow = false; r.castShadow = false;
    birds.push({ group, l, r, phase: range(0, 6.28), radius: range(13, 36), height: range(12, 22), speed: range(.06, .13) });
    movingGroups.add(group);
  }
  const butterflies = [];
  const butterflyMat = material('#e8cd83', { side: THREE.DoubleSide, emissive: '#cfb45f', emissiveIntensity: .1 });
  for (let i = 0; i < 12; i++) {
    const bx = range(-13, 13), bz = range(-55, 6); if (distanceToPath(bx, bz) < 1) continue;
    const group = new THREE.Group(); villageRoot.add(group);
    const l = pebble(butterflyMat, .065, 0, 0, .105, .018, .095, group), r = pebble(butterflyMat, -.065, 0, 0, .105, .018, .095, group);
    l.castShadow = false; r.castShadow = false;
    butterflies.push({ group, l, r, x: bx, z: bz, phase: range(0, 6.28) });
    movingGroups.add(group);
  }

  // ---------------------------------------------------------------------------
  // Static batching, kept per district
  // ---------------------------------------------------------------------------
  for (const group of [arrivalBoat, fishingBoat, sack, bellSwing, ...[...campfires.values()].map(f => f.flames)]) movingGroups.add(group);
  const batches = new Map(), batchCenter = new THREE.Vector3();
  world.updateMatrixWorld(true);
  const solidProp = standingProps(paths, heightAt, colliders);
  world.traverse(object => {
    if (!object.isMesh || object.isInstancedMesh || object.material.isShaderMaterial || object.material.transparent || object.geometry.attributes.color) return;
    for (let parent = object; parent && parent !== world; parent = parent.parent) if (movingGroups.has(parent)) return;
    solidProp(object);
    if (!object.geometry.attributes.normal) return;
    if (!object.geometry.boundingSphere) object.geometry.computeBoundingSphere();
    batchCenter.copy(object.geometry.boundingSphere.center).applyMatrix4(object.matrixWorld);
    // Open country has id 0; scenery out there batches with Drent as it always did.
    const district = spatialBatches ? regionAt(batchCenter.x, batchCenter.z)?.id || 1 : 1;
    if (!batches.has(object.material)) batches.set(object.material, new Map());
    const districtBatches = batches.get(object.material);
    if (!districtBatches.has(district)) districtBatches.set(district, []);
    districtBatches.get(district).push(object);
  });
  for (const [mat, districtBatches] of batches) if (districtBatches.size > 1) {
    const objects = [...districtBatches.values()].flat();
    const triangles = objects.reduce((sum, object) => sum + (object.geometry.index?.count || object.geometry.attributes.position.count) / 3, 0);
    if (triangles < 2400) batches.set(mat, new Map([[1, objects]]));
  }
  const positionVector = new THREE.Vector3(), normalVector = new THREE.Vector3(), normalMatrix = new THREE.Matrix3();
  for (const [mat, districtBatches] of batches) for (const [district, objects] of districtBatches) {
    if (objects.length < 2) continue;
    let vertexCount = 0, indexCount = 0;
    for (const object of objects) { vertexCount += object.geometry.attributes.position.count; indexCount += object.geometry.index?.count || object.geometry.attributes.position.count; }
    const positions = new Float32Array(vertexCount * 3), normals = new Float32Array(vertexCount * 3), indices = new Uint32Array(indexCount), uvs = mat.map ? new Float32Array(vertexCount * 2) : null;
    let vertexOffset = 0, indexOffset = 0;
    for (const object of objects) {
      const geometry = object.geometry, p = geometry.attributes.position, n = geometry.attributes.normal;
      normalMatrix.getNormalMatrix(object.matrixWorld);
      for (let i = 0; i < p.count; i++) {
        positionVector.fromBufferAttribute(p, i).applyMatrix4(object.matrixWorld); positionVector.toArray(positions, (vertexOffset + i) * 3);
        normalVector.fromBufferAttribute(n, i).applyMatrix3(normalMatrix).normalize(); normalVector.toArray(normals, (vertexOffset + i) * 3);
        if (uvs && geometry.attributes.uv) { uvs[(vertexOffset + i) * 2] = geometry.attributes.uv.getX(i); uvs[(vertexOffset + i) * 2 + 1] = geometry.attributes.uv.getY(i); }
      }
      if (geometry.index) { for (let i = 0; i < geometry.index.count; i++) indices[indexOffset++] = vertexOffset + geometry.index.getX(i); }
      else { for (let i = 0; i < p.count; i++) indices[indexOffset++] = vertexOffset + i; }
      vertexOffset += p.count;
      object.removeFromParent();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    if (uvs) geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.computeBoundingSphere();
    const batch = new THREE.Mesh(geometry, mat); batch.castShadow = objects.some(o => o.castShadow); batch.receiveShadow = true;
    batch.name = 'Static scenery batch'; batch.userData.district = district; world.add(batch);
  }

  // ---------------------------------------------------------------------------
  // Chart geometry
  // ---------------------------------------------------------------------------
  const mapPoint = (x, z) => Object.freeze({ x, z });
  const seaEdge = shorePoints.map(spot => mapPoint(spot.x, spot.z));
  const mapWaters = Object.freeze([
    Object.freeze({ id: 'coast-water', kind: 'polygon', points: Object.freeze([...seaEdge,
      mapPoint(WORLD_BOUNDS.maxX + 120, seaEdge.at(-1).z), mapPoint(WORLD_BOUNDS.maxX + 120, seaEdge[0].z)]) }),
    Object.freeze({ id: 'willowmere-water', kind: 'circle', x: pondWorld.x, z: pondWorld.z, radius: pond.radius }),
    Object.freeze({ id: 'west-suval-water', kind: 'polygon', points: WEST_SUVAL_SEA }),
    Object.freeze({ id: 'west-izol-water', kind: 'polygon', points: IZOL_SEA }),
    Object.freeze({ id: 'caloss-water', kind: 'polygon', points: Object.freeze([
      ...regionScenery.riverSamples.map(s => mapPoint(s.x - s.nx * CALOSS.halfWidth, s.z - s.nz * CALOSS.halfWidth)),
      ...[...regionScenery.riverSamples].reverse().map(s => mapPoint(s.x + s.nx * CALOSS.halfWidth, s.z + s.nz * CALOSS.halfWidth))]) }),
    ...Object.entries(puethScenery.riverSamples).map(([id, samples]) => Object.freeze({ id: `${id}-water`, kind: 'polygon', points: Object.freeze([
      ...samples.map(s => mapPoint(s.x - s.nx * s.half, s.z - s.nz * s.half)),
      ...[...samples].reverse().map(s => mapPoint(s.x + s.nx * s.half, s.z + s.nz * s.half))]) })),
    ...ELAGOS_CHART_WATERS,
  ]);

  // Islands are land inside the chart's sea: the charts paint these over the water (src/local-map-data.js).
  const mapLands = Object.freeze([...PEBLOS_ISLANDS.flatMap(island => regions.find(region => region.name === 'Peblos')?.border
    ?.filter(loop => loop.some(p => island.cells.some(cell => Math.hypot(cell.x - p.x, cell.z - p.z) < 90)))
    .map((loop, index) => Object.freeze({ id: `${island.id}-land-${index}`, kind: 'polygon', region: 'Peblos',
      points: Object.freeze(loop.map(p => mapPoint(p.x, p.z))) })) ?? []),
    // West Izol is an island too: its own outline is painted back over the chart's water.
    ...(regions.find(region => region.name === 'West Izol')?.border ?? []).map((loop, index) => Object.freeze({
      id: `west-izol-land-${index}`, kind: 'polygon', region: 'West Izol', points: Object.freeze(loop.map(p => mapPoint(p.x, p.z))) })),
  ]);
  const worldSpawn = villageToWorld(0, 43), worldBoat = villageToWorld(-4.8, 43);
  const worldTraining = villageToWorld(training.x, training.z);
  const worldEncounter = villageToWorld(encounter.x, encounter.z);
  const worldNorthTrail = villageToWorld(northTrail.x, northTrail.z);
  const worldBorder = villageToWorld(border.x, border.z);
  const worldRepairBench = villageToWorld(repairBench.x, repairBench.z);

  // Collision asks this grid, not the whole list. The list only ever changes by a
  // push or a splice (a recovered sack, a repaired beacon, a camp struck), each of
  // which changes its length, so the length is what tells the index it is stale.
  let colliderIndex = null, indexedFor = -1;
  const colliderGrid = () => {
    if (!colliderIndex || indexedFor !== colliders.length) { colliderIndex = createColliderGrid(colliders); indexedFor = colliders.length; }
    return colliderIndex;
  };
  const api = {
    heightAt,
    mapWaters,
    colliders,
    /** Bowden's woodlot, whose trees fall and grow back (src/woodlot-world.js). */
    woodlot,
    /** The traveler's house and the birdhouse posts, built as Construction goes (src/homestead-world.js). */
    homestead,
    /** The burial ground at the Lauvel, whose open grave is filled in if Sela's son is found (src/lauvel-burying.js). */
    lauvelField: regionScenery.lauvelField,
    /** The colliders that could reach within `reach` of a point; see src/collider-grid.js. */
    nearColliders: (x, z, reach = 0, out) => colliderGrid().near(x, z, reach, out),
    /**
     * **The surface of whatever water is at this point**, or the sea's line where there is none.
     *
     * The sea lies at `WATERLINE`; a river lies at whatever height its own bed carried it to,
     * which for the Caloss is a little under three metres above the sea and for one reach of hill
     * country is twenty-eight. Every water collider carries the surface of the water it marks
     * (`surface`, written where each river is built), so this is a grid lookup and not a search
     * through a list of rivers: it runs inside `canStand`, which is the most-asked question in
     * the game.
     *
     * Where two bodies overlap - a river's mouth in the sea - the higher surface wins, because
     * the point is under both and the deeper of the two is what you are in.
     */
    waterAt(x, z) {
      let surface = WATERLINE;
      for (const c of colliderGrid().near(x, z, 0)) {
        if (c.surface === undefined || c.r === undefined) continue;
        const dx = x - c.x, dz = z - c.z;
        if (dx * dx + dz * dz < c.r * c.r && c.surface > surface) surface = c.surface;
      }
      return surface;
    },
    reindexColliders: () => { colliderIndex = null; },
    /** Leave props passable within `clear` metres of each point: a stand, a site, a bench. */
    keepPropsClear(points, clear = .8) {
      const spots = points.filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.z));
      for (let i = colliders.length - 1; i >= 0; i--) {
        const c = colliders[i];
        if (c.kind === 'prop' && spots.some(p => Math.hypot(c.x - p.x, c.z - p.z) < c.r + clear)) colliders.splice(i, 1);
      }
      colliderIndex = null;
    },
    colliderIndexState: () => ({ ...colliderGrid(), near: undefined }),
    training: { ...worldTraining, object: training.object, y: training.y },
    repairBench: { ...worldRepairBench, name: repairBench.name },
    repairBenches: [{ ...worldRepairBench, name: repairBench.name }, ...regionRepairBenches, OUTPOST_BENCH],
    /** Props that belong to a garrison and are out only while their side holds the region (see occupation.js). */
    stakedProps,
    regions,
    regionAt, isOpenCountry,
    journeySites,
    routeJourney: ONWARD_ROAD.map(p => ({ x: p.x, z: p.z })),
    // The branch is walkable only to Elod's shut gate: East Suval is closed (closed-border.js).
    suvalRoute: FRONTIER_ROUTE.map(p => ({ x: p.x, z: p.z })),
    closedFrontier: { region: 'East Suval', gate: { x: FRONTIER_GATE.x, z: FRONTIER_GATE.z }, approach: { x: FRONTIER_APPROACH.x, z: FRONTIER_APPROACH.z }, into: { x: FRONTIER_GATE.u.x, z: FRONTIER_GATE.u.z } },
    solisRoute: SOLIS_ROAD.map(p => ({ x: p.x, z: p.z })),
    westSuvalMetrics: westSuval.metrics,
    setSolisHolder: westSuval.setHolder,
    // Walled places the autopilot leaves and enters by their gates: Solis and its court, the outpost, the stockade.
    enclosures: [...SOLIS_ENCLOSURES, AMBRON_ENCLOSURE, enclosureOf(OUTPOST_CIRCUIT, 'outpost', 'The Ambroni outpost'), enclosureOf(STOCKADE_CIRCUIT, 'stockade', 'The border stockade')],
    solisHolder: westSuval.holder,
    elagosRoute: AMBRON_ROAD.map(p => ({ x: p.x, z: p.z })),
    lakeRoute: LAKE_ROAD.map(p => ({ x: p.x, z: p.z })),
    elagosMetrics: elagos.metrics,
    puethRoute: PUETH_ROAD.map(p => ({ x: p.x, z: p.z })),
    renaRoute: RENA_ROAD.map(p => ({ x: p.x, z: p.z })),
    puethMetrics: puethScenery.metrics,
    peblosMetrics: peblosScenery.metrics,
    izolMetrics: izol.metrics,
    izolQuay: IZOL_QUAY,
    amodMetrics: amodScenery.metrics,
    peblosQuay: COBBLE_QUAY,
    eastSuvalMetrics: eastSuval.metrics,
    elodQuay: ELOD_QUAY,
    // Where a boat would put a traveler down if the sea route were ever switched
    // on (src/east-suval.js, ELOD_SEA_ROUTE). Nothing sails there yet.
    elodLanding: ELOD_LANDING,
    placeFerryBoat: peblosScenery.placeFerryBoat,
    mapLands,
    roadSigns,
    frontier: { x: FRONTIER.x, z: FRONTIER.z, name: FRONTIER.name, regionName: FRONTIER.regionName },
    storySites: STORY_SITES,
    regionMetrics: regionScenery.metrics,
    distantSummits,
    forestPlaces: forestPlaceDefinitions.map(site => ({ ...site, ...villageToWorld(site.x, site.z),
      trail: site.trail.map(p => villageToWorld(p.x, p.z)) })),
    forestPlaceMetrics: forestPlaces.metrics,
    setForestPlaceState: forestPlaces.setState,
    regionalPlaces: REGIONAL_PLACES,
    regionalActivitySites: REGIONAL_ACTIVITY_SITES,
    regionalPlaceMetrics: regionalPlaces.metrics,
    setRegionalPlaceState: regionalPlaces.setState,
    regionalPlaceState: regionalPlaces.state,
    updateRegionalPlaces: regionalPlaces.update,
    forestPlaceState: forestPlaces.state,
    forestHideout: {
      ...FOREST_HIDEOUT, ...hideoutToWorld(FOREST_HIDEOUT.x, FOREST_HIDEOUT.z),
      center: hideoutToWorld(FOREST_HIDEOUT.center.x, FOREST_HIDEOUT.center.z),
      approach: hideoutToWorld(FOREST_HIDEOUT.approach.x, FOREST_HIDEOUT.approach.z),
      checkpoint: hideoutToWorld(FOREST_HIDEOUT.checkpoint.x, FOREST_HIDEOUT.checkpoint.z),
      supplies: hideoutToWorld(FOREST_HIDEOUT.supplies.x, FOREST_HIDEOUT.supplies.z),
      trail: FOREST_HIDEOUT.trail.map(p => hideoutToWorld(p.x, p.z)),
      enemies: FOREST_HIDEOUT.enemies.map(p => hideoutToWorld(p.x, p.z)),
      retreatAxis: 'z', retreatLine: hideoutToWorld(37, FOREST_HIDEOUT.approach.z).z,
    },
    forestHideoutMetrics: forestHideout.metrics,
    setForestHideoutState: forestHideout.setState,
    forestHideoutState: forestHideout.state,
    setJourneySiteState(id, completed) {
      if (!(id in journeyState)) return false;
      journeyState[id] = Boolean(completed);
      const visual = journeyVisuals.get(id);
      if (visual?.incomplete) visual.incomplete.visible = !completed;
      if (visual?.complete) visual.complete.visible = Boolean(completed);
      if (visual?.pivot) visual.pivot.rotation.z = completed ? 0 : visual.lean;
      for (const blocker of visual?.blockers ?? []) {
        const index = colliders.indexOf(blocker);
        if (completed && index !== -1) colliders.splice(index, 1);
        if (!completed && index === -1) colliders.push(blocker);
      }
      return true;
    },
    journeySiteState: () => ({ ...journeyState }),
    pond: { ...pond, x: pondWorld.x, z: pondWorld.z,
      fishingSpot: fishingSpots[0].fishingSpot, castPoint: fishingSpots[0].castPoint },
    fishingSpots,
    setFishingSpot,
    activeFishingSpot: () => activeFishingSpot,
    firePits: worldFirePits,
    setCampfireLit(id, lit) {
      const camp = campfires.get(id); if (!camp) return false;
      camp.fire.lit = Boolean(lit); camp.flames.visible = camp.fire.lit; return true;
    },
    setFishingState(phase) {
      if (!['idle', 'waiting', 'bite'].includes(phase)) return false;
      fishingPhase = phase; fishingVisual.visible = phase !== 'idle'; return true;
    },
    setFishingOrigin,
    encounter: { ...worldEncounter, radius: encounter.radius },
    northTrail: { ...worldNorthTrail, name: northTrail.name },
    border: { ...worldBorder, name: border.name, barrierX: CALOSS_GATE.barrierX,
      regionName: border.regionName, open: true },
    routeNorth: routeNorth.map(p => villageToWorld(p.x, p.z)),
    broadleafTrees: broadTrees.flatMap((tree, i) => {
      if (tree.hidden) return [];
      const spot = villageToWorld(tree.x, tree.z);
      return [{ id: `oak-${i}`, x: spot.x, z: spot.z, y: localGround(tree.x, tree.z), height: tree.h * tree.s,
        radius: .38 * tree.s, trunkHeight: tree.h * tree.s * .82, trunkTopRadius: .21 * tree.s, ...tree.trunk }];
    }),
    ringBell(time = worldTime) { bellStarted = time; },
    /**
     * The arrival boat, for the opening sequence (src/opening-sequence.js): world metres and a world
     * heading in. It is a child of the village root, so its own frame is the village's.
     */
    placeArrivalBoat(x, z, yaw) { const local = worldToVillage(x, z); arrivalBoat.position.x = local.x; arrivalBoat.position.z = local.z; arrivalBoat.rotation.y = yaw - VILLAGE.yaw; },
    /** Back to where the boat has always lain, against the pier's south face with the gangplank up to the deck. */
    restArrivalBoat() { arrivalBoat.position.x = -5.0; arrivalBoat.position.z = 43; arrivalBoat.rotation.y = -.12; },
    /** Where the boat is now, in world terms, for tests. */
    arrivalBoatPose() { const p = villageToWorld(arrivalBoat.position.x, arrivalBoat.position.z); return { x: p.x, z: p.z, yaw: arrivalBoat.rotation.y + VILLAGE.yaw }; },
    birdGarden: birdGardenSites(groundHeight),
    setFeederHung: hung => birdGarden.setFeederHung(hung),
    spawn: { x: worldSpawn.x, z: worldSpawn.z },
    boatStart: { x: worldBoat.x, z: worldBoat.z, y: 1.0 },
    bounds: { minX: WORLD_BOUNDS.minX, maxX: WORLD_BOUNDS.maxX, minZ: WORLD_BOUNDS.minZ, maxZ: WORLD_BOUNDS.maxZ },
    /** The head of the pier, where Jojo the harbourmaster meets the traveler off the boat. */
    pierHead: villageToWorld(4, 20),
    npcPositions: {
      fisher: villageToWorld(-15, 22), warden: villageToWorld(0, -65),
      'acorn-cook': villageToWorld(acornCook.x, acornCook.z), doomsayer: villageToWorld(doomsayer.x, doomsayer.z),
      'pond-fisher': villageToWorld(pondFisher.x, pondFisher.z),
      'forest-woodcutter': villageToWorld(forestWoodcutter.x, forestWoodcutter.z),
      ...regionNpcPositions, ...REGIONAL_NPC_POSITIONS, ...PUETH_NPC_POSITIONS, ...PEBLOS_NPC_POSITIONS, ...RENA_NPC_POSITIONS, ...IZOL_NPC_POSITIONS, ...ELAGOS_NPC_POSITIONS, ...AMOD_NPC_POSITIONS,
      ...Object.fromEntries(Object.entries({ ...ELOD_STANDS, ...EAST_SUVAL_STANDS }).map(([id, stand]) => [id, { x: stand.x, z: stand.z }])),
    },
    landmarks: [
      { id: 'harbor', name: 'Tidehaven Landing', ...villageToWorld(0, 29), description: 'Small fishing boats cross the Stills to this sheltered corner of Drent’s coast.' },
      { id: 'village', name: 'Tidehaven Village', ...villageToWorld(0, 5), description: 'Salt on the breeze. Smoke above the rooftops. A quiet place to begin.' },
      { id: 'woodland', name: 'The Greenway', ...villageToWorld(0, -36), description: 'An old footpath winds inland beneath the welcoming forest canopy.' },
      { id: 'waystone', name: 'Mosslight Waystone', ...villageToWorld(31, -59), description: 'A weathered marker remembers a road older than the village.' },
      { id: 'watch', name: 'Greenway Watch', ...villageToWorld(0, -66), description: 'The woodland warden watches the route to the greater regions of Azhora.' },
      { id: 'pond', name: 'Willowmere Pond', ...fishingSpots[0].fishingSpot, description: 'A quiet forest pool, a fishing ledge, and an old stone firepit beside the water.' },
      { id: 'northTrail', name: northTrail.name, ...worldNorthTrail, description: 'A shaded bench and an old cairn mark the last rest beneath Drent’s canopy.' },
      { id: 'border', name: border.name, ...worldBorder, description: 'An old field gate stands open where the Tidehaven wood gives way to the Avrel clearing and the road to the Caloss.' },
      ...forestPlaceDefinitions.map(site => ({ ...site, ...villageToWorld(site.x, site.z) })),
      { ...FOREST_HIDEOUT, ...hideoutToWorld(FOREST_HIDEOUT.x, FOREST_HIDEOUT.z),
        description: 'Scraps of blue cloth mark a side trail east from the Tessen road post. A goblin camp squats in the birch beyond, with sacks taken from the post’s stores.' },
      ...regionLandmarks,
      ...WAYSIDE_LANDMARKS,
      ...FRONTIER_LANDMARKS,
      ...PLACE_LANDMARKS,
      ...PUETH_LANDMARKS,
      ...AMOD_LANDMARKS,
      ...PEBLOS_LANDMARKS,
      ...RENA_LANDMARKS,
      ...EAST_SUVAL_PLACES,
      ...IZOL_LANDMARKS,
      ...REGIONAL_PLACES,
      ...WEST_SUVAL_LANDMARKS,
      ...ELAGOS_LANDMARKS,
      ...WEST_REGION_LANDMARKS,
    ],
    paths,
    update(time, dt) {
      winery.update(time);
      worldTime = time;
      const bellAge = Number.isFinite(bellStarted) ? Math.max(0, time - bellStarted) : 6;
      const bellEnvelope = bellAge < 6 ? Math.exp(-bellAge * .7) : 0;
      bellSwing.rotation.z = Math.sin(bellAge * 10) * .43 * bellEnvelope;
      bellTongue.rotation.z = Math.sin(bellAge * 10 - .9) * .5 * bellEnvelope;
      waterMaterial.uniforms.time.value = time;
      pondMaterial.uniforms.time.value = time;
      regionScenery.riverMaterial.uniforms.time.value = time;
      elagos.waterMaterial.uniforms.time.value = time;
      westScenery.update(time);
      regionScenery.millSails.rotation.z = time * .115;
      for (const [i, camp] of [...campfires.values()].entries()) if (camp.fire.lit) {
        camp.flames.scale.set(1 + Math.sin(time * 8 + i) * .04, .94 + Math.sin(time * 11 + i) * .10, 1);
        camp.glow.intensity = 2.3 + Math.sin(time * 9 + i) * .24;
      }
      if (fishingPhase !== 'idle') {
        bobber.position.y = activeFishingSpot.castPoint.y + Math.sin(time * (fishingPhase === 'bite' ? 12 : 2.5)) * (fishingPhase === 'bite' ? .13 : .026);
        bobber.rotation.z = Math.sin(time * 6) * (fishingPhase === 'bite' ? .36 : .06);
        fishingRipple.scale.setScalar(.8 + (time * (fishingPhase === 'bite' ? 1.7 : .6) % 1) * 2.4);
        fishingRipple.material.opacity = fishingPhase === 'bite' ? .77 : .38;
      }
      shoreFoam.material.opacity = .31 + Math.sin(time * .55) * .09;
      arrivalBoat.position.y = .38 + Math.sin(time * .72) * .085; arrivalBoat.rotation.z = Math.sin(time * .62) * .018;
      fishingBoat.position.y = .38 + Math.sin(time * .82 + 2) * .065; fishingBoat.rotation.z = Math.sin(time * .77) * .026;
      let si = 0;
      for (let i = 0; i < smokeSources.length; i++) for (let j = 0; j < 4; j++) {
        const age = (time * .11 + j * .25 + i * .073) % 1, source = smokeSources[i];
        dummy.position.set(source.x + age * 1.65 + Math.sin(time * .25 + j) * age * .28, source.y + age * 4.4, source.z + age * .6);
        dummy.rotation.set(age, age * 2, 0); const s = .19 + age * .56; dummy.scale.set(s, s * .85, s); dummy.updateMatrix(); smoke.setMatrixAt(si++, dummy.matrix);
      }
      smoke.instanceMatrix.needsUpdate = true;
      birds.forEach((bird, i) => {
        const a = time * bird.speed + bird.phase;
        bird.group.position.set(worldSpawn.x + 8 + Math.cos(a) * bird.radius, bird.height + Math.sin(a * 3) * 1.0, worldSpawn.z + Math.sin(a) * bird.radius * .7);
        bird.group.rotation.y = -a;
        const flap = Math.sin(time * 3.4 + i) * .3;
        bird.l.rotation.z = flap; bird.r.rotation.z = -flap;
      });
      butterflies.forEach((butterfly, i) => {
        const a = time * .42 + butterfly.phase;
        const x = butterfly.x + Math.sin(a) * 1.3, z = butterfly.z + Math.cos(a * .8) * 1.0;
        butterfly.group.position.set(x, localGround(x, z) + 1.1 + Math.sin(time * 1.25 + i) * .26, z);
        butterfly.group.rotation.y = a;
        butterfly.l.rotation.z = Math.sin(time * 13 + i) * .95; butterfly.r.rotation.z = -Math.sin(time * 13 + i) * .95;
      });
    },
  };
  // A prop never swallows the spot where somebody stands or where the traveler is meant to go.
  api.keepPropsClear([api.training, ...OPENING_FIGHT_GROUND, ...Object.values(api.npcPositions ?? {}), ...Object.values(api.storySites ?? {}), ...Object.values(api.journeySites ?? {}),
    ...(api.forestPlaces ?? []), ...(api.fishingSpots ?? []).map(spot => spot.fishingSpot), ...(api.repairBenches ?? [])]);
  return api;
}

/**
 * Anything small that stands in a person's way is solid: posts and poles, crates
 * and barrels, stall counters, fence rails, a board on its posts. Houses, walls and
 * the larger pieces carry colliders of their own; bushes and grass are instanced
 * and stay passable. A road's middle is never blocked. Returns the per-mesh check.
 */
export const PROP_SOLID = Object.freeze({ low: .6, high: 1.6, widest: 2.4, longest: 6, lane: 1.1, pole: .2, gap: 1.2 });
function standingProps(paths, heightAt, colliders) {
  const CELL = 16, cells = new Map(), key = (cx, cz) => `${cx},${cz}`;
  for (const path of paths) for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    for (let cx = Math.floor(Math.min(a.x, b.x) / CELL); cx <= Math.floor(Math.max(a.x, b.x) / CELL); cx++)
      for (let cz = Math.floor(Math.min(a.z, b.z) / CELL); cz <= Math.floor(Math.max(a.z, b.z) / CELL); cz++) {
        const list = cells.get(key(cx, cz)); if (list) list.push([a, b]); else cells.set(key(cx, cz), [[a, b]]);
      }
  }
  const toRoad = (x, z) => {
    let best = Infinity;
    for (let cx = Math.floor(x / CELL) - 1; cx <= Math.floor(x / CELL) + 1; cx++) for (let cz = Math.floor(z / CELL) - 1; cz <= Math.floor(z / CELL) + 1; cz++) {
      for (const [a, b] of cells.get(key(cx, cz)) ?? []) {
        const vx = b.x - a.x, vz = b.z - a.z, len = vx * vx + vz * vz || 1;
        const t = Math.max(0, Math.min(1, ((x - a.x) * vx + (z - a.z) * vz) / len));
        best = Math.min(best, Math.hypot(x - a.x - vx * t, z - a.z - vz * t));
      }
    }
    return best;
  };
  const box = new THREE.Box3(), size = new THREE.Vector3(), mid = new THREE.Vector3(), axes = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const add = (x, z, r) => { if (toRoad(x, z) > PROP_SOLID.lane + r && heightAt(x, z) >= .45) colliders.push({ x, z, r, kind: 'prop' }); };
  // A thin pole in a doorway or a lane would close it: one that close to a wall stays passable.
  const built = createColliderGrid(colliders.slice()), gapTo = (x, z, r) => {
    let gap = Infinity;
    for (const c of built.near(x, z, r + PROP_SOLID.gap + 1.5, [])) {
      const d = c.r !== undefined ? Math.hypot(x - c.x, z - c.z) - c.r
        : Math.hypot(Math.max(0, Math.abs(x - c.x) - c.hx), Math.max(0, Math.abs(z - c.z) - c.hz));
      gap = Math.min(gap, d - r);
    }
    return gap;
  };
  return object => {
    if (object.userData.passable) return;
    const geometry = object.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    box.copy(geometry.boundingBox).applyMatrix4(object.matrixWorld);
    const x = (box.min.x + box.max.x) / 2, z = (box.min.z + box.max.z) / 2, ground = heightAt(x, z);
    // Between the knees and the head: something a walking person would strike.
    if (box.min.y - ground > PROP_SOLID.high || box.max.y - ground < PROP_SOLID.low) return;
    // Its footprint in its own frame, so a rail or a sign's finger turned at an angle is still a rail.
    geometry.boundingBox.getSize(size); geometry.boundingBox.getCenter(mid).applyMatrix4(object.matrixWorld);
    object.matrixWorld.extractBasis(axes[0], axes[1], axes[2]);
    const spans = axes.map((axis, i) => ({ x: axis.x * size.getComponent(i), z: axis.z * size.getComponent(i) }))
      .map(v => ({ ...v, length: Math.hypot(v.x, v.z) })).sort((a, b) => b.length - a.length);
    const long = spans[0].length, thick = spans[1].length + spans[2].length * .5;
    if (long < .06) return;
    if (long / Math.max(thick, .01) <= 2.5) {
      const across = Math.max(box.max.x - box.min.x, box.max.z - box.min.z), r = Math.min(1, Math.max(.1, across / 2 * .85));
      if (across <= PROP_SOLID.widest && (r >= PROP_SOLID.pole || gapTo(x, z, r) >= PROP_SOLID.gap)) add(x, z, r);
      return;
    }
    // A rail, a plank, a board: a row of small circles along its length.
    if (long > PROP_SOLID.longest) return;
    const r = Math.max(.1, thick / 2 + .02), count = Math.max(2, Math.ceil(long / (r * 1.4)));
    for (let i = 0; i < count; i++) {
      const f = (i + .5) / count - .5;
      add(mid.x + spans[0].x * f, mid.z + spans[0].z * f, r);
    }
  };
}
