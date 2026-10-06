import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { scopedWorld } from './scoped-world.js';
import { canStand } from '../src/gameplay/movement/game-state.js';
import { FRONTIER, MAIN_ROAD, REGION_CELLS, REGION_IDS, hexOwnerAt } from '../src/world/terrain/region-world.js';
import { CARICA } from '../src/content/regions/western-regions/west-regions.js';
import { WEST_PROFILES, westWaterSurface } from '../src/content/regions/western-regions/west-ground.js';
import { inElagosWater } from '../src/content/regions/ambron/elagos-world.js';
import {
  NESDOR_COUNTRY, NINEHANDS, NESDOR_BED, NESDOR_STRIPS, NESDOR_FARM_ROWS, NESDOR_FARM_ROW_IDS, NESDOR_HAZEL_TREES, NESDOR_HAZEL_WOOD,
  NESDOR_BUILDINGS, NESDOR_SEED_BENCH, NESDOR_HIVES, NESDOR_INN_YARD, NESDOR_ORDER_BOARD, NESDOR_WRITING_DESK, NESDOR_MAILBOXES,
  NESDOR_CARICA_FORD, NESDOR_ROADS, NESDOR_PATHS, NESDOR_NPC_STANDS, NESDOR_PEOPLE_IDS, NESDOR_FARM_LANDMARKS, distanceToNesdorRoad, nesdorFarmReserved,
} from '../src/content/regions/nesdor/nesdor-farm.js';

// Nesdor's farm country for the Farmlands of the Lizeem (the user's design of 5 October 2026; built
// 6 October 2026): the contract's ids, the strips' order on the real ground, and nothing standing on
// anything else. The world is scoped to Nesdor and Caricas (tests/scoped-world.js).
const { createNesdorFarmScenery } = await sourceModule('../src/content/regions/nesdor/nesdor-farm-scenery.js');
const { getTreeRegistry } = await sourceModule('../src/world/scenery/tree-registry.js');
const { WEST_LIFE_ZONES } = await sourceModule('../src/content/regions/western-regions/west-regions-life.js');
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const outside = (point, b, clear) => Math.abs(point.x - b.x) > b.w / 2 + clear || Math.abs(point.z - b.z) > b.d / 2 + clear;
const NINE = NESDOR_FARM_ROWS.filter(row => row.farmstead === 'ninehands');
const LONG = NESDOR_FARM_ROWS.filter(row => row.farmstead === 'ninehands-long');
/** The bed's footprint whichever way the farming view turns it. */
const BED_HALF = Math.max(NESDOR_BED.across, NESDOR_BED.along) / 2;

/** A build on flat ground: geometry and colliders without a world under them. */
function flatBuild() {
  const parent = new THREE.Group(), colliders = [];
  const result = createNesdorFarmScenery({ parent, heightAt: () => 7.5, colliders });
  return { parent, colliders, result };
}

// The built ground (tests/scoped-world.js), made before any test is declared: with `--test-isolation=none`, as
// scripts/run-tests.cjs runs a file, a test declared after a top-level await is never run (moved at integration,
// 6 October 2026, when only the first five of the eleven ran).
const scene = new THREE.Scene();
const world = await scopedWorld(scene, [REGION_IDS.Nesdor, REGION_IDS.Caricas]);
const wildTrees = world.colliders.filter(c => c.kind === 'nesdor-tree');
// Ninehands is one of the world's own build steps since the wiring (src/world.js `nesdorFarm`, 6 October 2026), so the
// test reads what the world built rather than building it twice. The farm's colliders are those a flat build of the
// same scenery makes, found in the world where they stand (a collider's place does not depend on the ground's height).
const built = world.nesdorFarm;
const flatColliders = flatBuild().colliders;
const mine = world.colliders.filter(c => flatColliders.some(f => f.kind === c.kind && f.x === c.x && f.z === c.z && f.id === c.id));
const wet = (x, z) => {
  const ground = world.heightAt(x, z), surface = westWaterSurface(x, z);
  return (surface !== null && surface > ground) || inElagosWater(x, z, 0) || world.waterAt(x, z) > ground;
};
/** The nearest water within `reach` metres, by rings, or Infinity. */
function waterWithin(point, reach) {
  for (let r = 0; r <= reach; r += .5) for (let a = 0; a < 24; a++)
    if (wet(point.x + Math.cos(a / 24 * Math.PI * 2) * r, point.z + Math.sin(a / 24 * Math.PI * 2) * r)) return r;
  return Infinity;
}

test('The beds, strips and coppice carry exactly the ids the contract fixes', () => {
  const ids = [...['wet', 'bench', 'rise'].flatMap(ground => [1, 2, 3].map(n => `nesdor-${ground}-${n}`)),
    ...[1, 2, 3, 4, 5, 6].map(n => `nesdor-long-${n}`)];
  assert.deepEqual([...NESDOR_FARM_ROW_IDS], ids);
  for (const row of NESDOR_FARM_ROWS) {
    assert.equal(row.country, NESDOR_COUNTRY);
    assert.ok([row.x, row.z, row.yaw].every(Number.isFinite), `${row.id} has a place and a facing`);
    assert.equal(typeof row.name, 'string');
    if (row.id.startsWith('nesdor-long')) { assert.equal(row.farmstead, 'ninehands-long'); assert.equal(row.ground, 'bench'); }
    else { assert.equal(row.farmstead, 'ninehands'); assert.equal(row.ground, row.id.split('-')[1]); }
  }
  assert.deepEqual(NESDOR_STRIPS.map(strip => [strip.id, strip.beds.length]),
    [['nesdor-wet', 3], ['nesdor-bench', 3], ['nesdor-rise', 3], ['nesdor-long', 6]]);
  for (const strip of NESDOR_STRIPS) assert.deepEqual([...strip.beds], strip.rows.map(row => row.id));
  assert.deepEqual(NESDOR_HAZEL_TREES.map(tree => tree.id), [1, 2, 3, 4, 5, 6].map(n => `nesdor-hazel-${n}`));
  for (const tree of NESDOR_HAZEL_TREES) {
    assert.equal(tree.item, 'hazelnuts'); assert.equal(tree.regrow, 600); assert.equal(tree.level, 12);
    assert.ok(tree.xp > 0 && Number.isFinite(tree.x + tree.z));
  }
  assert.deepEqual([...NESDOR_PEOPLE_IDS], ['baugi', 'bolverk', 'idunn', 'aegir', 'forseti', 'egil', 'beyla', 'byggvir']);
  assert.equal(NESDOR_ORDER_BOARD.id, 'nesdor-way');
});

test('Every strip runs west to east between its two markers, its beds evenly spaced and never touching', () => {
  for (const strip of NESDOR_STRIPS) {
    assert.ok(strip.start.x < strip.end.x && strip.start.z === strip.z && strip.end.z === strip.z, `${strip.id} runs along x`);
    strip.rows.forEach((row, n) => {
      assert.equal(row.z, strip.z);
      assert.ok(row.x - BED_HALF > strip.start.x && row.x + BED_HALF < strip.end.x, `${row.id} lies between the markers`);
      if (n) assert.ok(Math.abs(row.x - strip.rows[n - 1].x - NESDOR_BED.pitch) < 1e-9, `${row.id} is one pitch on`);
    });
  }
  for (const a of NESDOR_FARM_ROWS) for (const b of NESDOR_FARM_ROWS)
    if (a !== b) assert.ok(Math.abs(a.x - b.x) > 2 * BED_HALF || Math.abs(a.z - b.z) > 2 * BED_HALF, `${a.id} and ${b.id} overlap`);
  assert.ok(NESDOR_BED.pitch > 2 * BED_HALF, 'a bed turned either way leaves a furrow before the next');
});

test('Ninehands’ nine beds lie within the Work of Nine’s forty metres of one place, and the long strip is a farm of its own', () => {
  const middle = { x: NINE.reduce((sum, row) => sum + row.x, 0) / 9, z: NINE.reduce((sum, row) => sum + row.z, 0) / 9 };
  for (const row of NINE) assert.ok(gap(row, middle) < 35, `${row.id} is ${gap(row, middle).toFixed(1)} m out`);
  assert.ok(gap(middle, NINEHANDS) < 60, 'the strips are the farm’s own');
  assert.equal(LONG.length, 6);
  for (const row of LONG) for (const nine of NINE) assert.ok(gap(row, nine) > 10, `${row.id} keeps apart from ${nine.id}`);
});

test('The scenery is five batches, a solid collider for every house, and a tree for every stool that cannot be felled', () => {
  const { parent, colliders, result } = flatBuild();
  let meshes = 0, triangles = 0;
  parent.traverse(object => { if (object.isMesh) { meshes++; triangles += object.geometry.attributes.position.count / 3; } });
  assert.ok(meshes <= 6, `${meshes} meshes`);
  assert.equal(meshes, result.metrics.batches);
  assert.ok(triangles < 40000, `${triangles} triangles`);
  for (const b of NESDOR_BUILDINGS) {
    const box = colliders.find(c => c.kind === 'building' && c.id === b.id);
    assert.ok(box, `${b.id} is solid`);
    assert.deepEqual([box.hx, box.hz], [b.w / 2, b.d / 2]);
    assert.ok(box.maxY > box.minY + b.h);
  }
  const registry = getTreeRegistry(colliders);
  for (const tree of NESDOR_HAZEL_TREES) {
    const kept = registry.get(tree.id);
    assert.ok(kept, `${tree.id} is a tree in the world`);
    assert.equal(kept.harvestable, false, `${tree.id} cannot be felled`);
    assert.equal(kept.species, 'common-hazel');
    assert.ok(colliders.some(c => c.id === tree.id && Math.abs(c.x - tree.x) < 1e-9 && Math.abs(c.z - tree.z) < 1e-9));
  }
  assert.equal(result.metrics.strips, 4); assert.equal(result.metrics.markers, 8); assert.equal(result.metrics.mailboxes, 3);
  assert.deepEqual(result.labels.userData.labels, ['Baugi', 'Idunn', 'Forseti', 'The Counted Water']);
});

test('Nothing is built on top of anything else, nobody stands on anything, and nothing crosses the rope line', () => {
  const { colliders } = flatBuild();
  for (const a of NESDOR_BUILDINGS) for (const b of NESDOR_BUILDINGS)
    if (a !== b) assert.ok(Math.abs(a.x - b.x) > (a.w + b.w) / 2 + 2 || Math.abs(a.z - b.z) > (a.d + b.d) / 2 + 2, `${a.id} crowds ${b.id}`);
  const props = colliders.filter(c => c.kind !== 'building');
  const covers = (c, point, clear) => (c.r !== undefined ? gap(c, point) < c.r + clear
    : Math.abs(point.x - c.x) < c.hx + clear && Math.abs(point.z - c.z) < c.hz + clear);
  for (const row of NESDOR_FARM_ROWS) {
    for (const b of NESDOR_BUILDINGS) assert.ok(outside(row, b, BED_HALF + 1), `${row.id} is clear of ${b.id}`);
    for (const c of props) assert.ok(!covers(c, row, BED_HALF + .3), `${row.id} is clear of a ${c.kind}`);
    for (const road of NESDOR_ROADS) assert.ok(distanceToNesdorRoad(road, row.x, row.z) > road.width / 2 + BED_HALF, `${row.id} is off ${road.id}`);
  }
  for (const road of NESDOR_ROADS) for (const b of NESDOR_BUILDINGS) {
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]])
      assert.ok(distanceToNesdorRoad(road, b.x + sx * b.w / 2, b.z + sz * b.d / 2) > road.width / 2 + .5, `${road.id} runs into ${b.id}`);
    for (let i = 1; i < road.points.length; i++) for (let t = 0; t <= 1; t += .05) {
      const a = road.points[i - 1], c = road.points[i], point = { x: a.x + (c.x - a.x) * t, z: a.z + (c.z - a.z) * t };
      assert.ok(outside(point, b, road.width / 2 + .3), `${road.id} crosses ${b.id}`);
    }
  }
  for (const [id, stand] of Object.entries(NESDOR_NPC_STANDS)) {
    for (const b of NESDOR_BUILDINGS) assert.ok(outside(stand, b, 1), `${id} is a metre clear of ${b.id}`);
    for (const c of props) assert.ok(!covers(c, stand, .5), `${id} is not standing in a ${c.kind}`);
    for (const row of NESDOR_FARM_ROWS) assert.ok(gap(stand, row) > BED_HALF + .6, `${id} is off ${row.id}`);
    for (const other of Object.entries(NESDOR_NPC_STANDS)) if (other[0] !== id) assert.ok(gap(stand, other[1]) > 3, `${id} and ${other[0]}`);
    assert.ok(Number.isFinite(stand.yaw), `${id} faces somewhere`);
  }
  for (const m of NESDOR_MAILBOXES) {
    const home = NESDOR_BUILDINGS.find(b => b.id === m.home);
    assert.ok(home && gap(m, home) < 12, `${m.name}’s mailbox is at ${m.home}`);
    assert.ok(NESDOR_ROADS.every(road => distanceToNesdorRoad(road, m.x, m.z) > road.width / 2 + .4), `${m.name}’s mailbox is beside the way, not on it`);
  }
  for (const c of colliders) assert.ok(c.x + (c.hx ?? c.r) < FRONTIER.barrierX - 1, `a ${c.kind} at ${c.x.toFixed(1)} reaches the rope line`);
  assert.ok(NESDOR_INN_YARD.maxX < FRONTIER.barrierX - 2, 'the inn yard stops short of the rope');
  const way = NESDOR_ROADS.find(road => road.id === 'nesdor-way');
  assert.ok(Math.abs(way.points[0].x - (-1378.6)) < 1 && Math.abs(way.points[0].z - 602.2) < 1, 'the Way leaves the main road’s end');
  assert.ok(gap(way.points.at(-1), NINEHANDS) < 10, 'and comes into the yard at Ninehands');
  assert.ok(gap(NESDOR_ROADS.find(road => road.id === 'nesdor-carica-road').points.at(-1), NESDOR_CARICA_FORD) < 1, 'the farm road ends at the ford');
  // Navigation never plans a route through the rope: the Way's walked line begins on the inn's side, unjoined.
  assert.deepEqual(NESDOR_PATHS.map(path => path.id), NESDOR_ROADS.map(road => road.id));
  for (const path of NESDOR_PATHS) for (const point of path.points) {
    assert.ok(point.x < FRONTIER.barrierX - 3, `${path.id} has a vertex at the rope`);
    for (const road of MAIN_ROAD) assert.ok(gap(point, road) > 7, `${path.id} joins the main road across the rope`);
  }
  // The reserve keeps scatter off what is built and nowhere else.
  for (const b of NESDOR_BUILDINGS) assert.ok(nesdorFarmReserved(b.x, b.z));
  for (const row of NESDOR_FARM_ROWS) assert.ok(nesdorFarmReserved(row.x, row.z));
  assert.ok(!nesdorFarmReserved(-1500, 660) && !nesdorFarmReserved(-1520, 400) && !nesdorFarmReserved(-2000, 300));
});

// ---------------------------------------------------------------------------
// On the built ground
// ---------------------------------------------------------------------------
const meanHeight = row => [[0, 0], [-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]
  .reduce((sum, [dx, dz]) => sum + world.heightAt(row.x + dx, row.z + dz), 0) / 5;

test('On the built ground the strips lie in order: every wet bed below every bench bed, and every bench bed below every rise bed', () => {
  const by = ground => NESDOR_FARM_ROWS.filter(row => row.ground === ground).map(meanHeight);
  const wetBeds = by('wet'), bench = by('bench'), rise = by('rise');
  assert.ok(Math.max(...wetBeds) < Math.min(...bench), `wet up to ${Math.max(...wetBeds).toFixed(2)}, bench from ${Math.min(...bench).toFixed(2)}`);
  assert.ok(Math.max(...bench) < Math.min(...rise), `bench up to ${Math.max(...bench).toFixed(2)}, rise from ${Math.min(...rise).toFixed(2)}`);
  const strip = id => NESDOR_STRIPS.find(item => item.id === id).rows.map(meanHeight);
  const mean = list => list.reduce((a, b) => a + b, 0) / list.length;
  assert.ok(mean(strip('nesdor-rise')) - mean(strip('nesdor-wet')) > .2, 'the rise stands a good hand above the wet strip');
  // The wet strip is the one by the braids.
  const toWater = id => Math.min(...NESDOR_STRIPS.find(item => item.id === id).rows.map(row => waterWithin(row, 30)));
  assert.ok(toWater('nesdor-wet') < toWater('nesdor-bench') && toWater('nesdor-wet') < 16, 'the wet strip lies nearest the braids');
  // And each bed is level enough to work: no more than a few centimetres across it.
  for (const row of NESDOR_FARM_ROWS) {
    const corners = [[-1.55, -1.55], [1.55, -1.55], [-1.55, 1.55], [1.55, 1.55]].map(([dx, dz]) => world.heightAt(row.x + dx, row.z + dz));
    assert.ok(Math.max(...corners) - Math.min(...corners) < .12, `${row.id} tilts`);
  }
});

test('Every bed and every stand is walkable ground in Nesdor, and every stand is four metres from water', () => {
  for (const row of NESDOR_FARM_ROWS) {
    assert.equal(hexOwnerAt(row.x, row.z), 'Nesdor');
    assert.ok(canStand(row.x, row.z, world, .45), `${row.id} has footing`);
    assert.ok(waterWithin(row, 4) === Infinity, `${row.id} is above the water`);
  }
  for (const [id, stand] of Object.entries(NESDOR_NPC_STANDS)) {
    assert.equal(hexOwnerAt(stand.x, stand.z), 'Nesdor', `${id} stands in Nesdor`);
    assert.ok(canStand(stand.x, stand.z, world, .45), `${id} has footing at ${stand.x}, ${stand.z}`);
    assert.ok(waterWithin(stand, 4) === Infinity, `${id} is four metres from water`);
    for (const c of world.colliders) if (c.kind === 'building') assert.ok(
      Math.abs(stand.x - c.x) > c.hx + 1 || Math.abs(stand.z - c.z) > c.hz + 1, `${id} is a metre clear of ${c.id ?? c.kind}`);
  }
  for (const b of NESDOR_BUILDINGS) {
    assert.equal(hexOwnerAt(b.x, b.z), 'Nesdor');
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
      assert.ok(waterWithin({ x: b.x + sx * b.w / 2, z: b.z + sz * b.d / 2 }, 6) === Infinity, `${b.id} keeps off the water`);
  }
  for (const landmark of NESDOR_FARM_LANDMARKS) assert.equal(hexOwnerAt(landmark.x, landmark.z), 'Nesdor', `${landmark.id} is charted in Nesdor`);
});

test('The coppice stands among the valley head’s own hazel, clear of every wild tree, with room to pick each stool', () => {
  const near = wildTrees.filter(tree => gap(tree, NESDOR_HAZEL_WOOD) < 25);
  assert.ok(near.length >= 8, 'the hazel wood is in a wood');
  assert.ok(near.filter(tree => tree.species === 'common-hazel').length > near.length / 2, 'and the wood is mostly hazel');
  for (const tree of NESDOR_HAZEL_TREES) {
    for (const wild of wildTrees) assert.ok(gap(tree, wild) > 4, `${tree.id} crowds a ${wild.species} at ${wild.x.toFixed(1)}, ${wild.z.toFixed(1)}`);
    assert.ok(gap(tree, NESDOR_HAZEL_WOOD) < 12);
    let reach = false;
    for (let a = 0; a < 12 && !reach; a++) reach = canStand(tree.x + Math.cos(a / 12 * Math.PI * 2) * 1.6, tree.z + Math.sin(a / 12 * Math.PI * 2) * 1.6, world, .34);
    assert.ok(reach, `${tree.id} can be reached to pick`);
  }
  for (const a of NESDOR_HAZEL_TREES) for (const b of NESDOR_HAZEL_TREES) if (a !== b) assert.ok(gap(a, b) > 4, `${a.id} and ${b.id}`);
});

test('The houses and roads keep clear of the valley head’s trees, and every road is walked from the inn to the Carica ford', () => {
  for (const b of NESDOR_BUILDINGS) for (const tree of wildTrees)
    assert.ok(outside(tree, b, 3), `${b.id} stands under a ${tree.species}`);
  for (const road of NESDOR_ROADS) {
    for (const tree of wildTrees) assert.ok(distanceToNesdorRoad(road, tree.x, tree.z) > road.width / 2 + 2, `${road.id} runs into a ${tree.species}`);
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1], b = road.points[i], n = Math.ceil(gap(a, b) / 2);
      for (let k = 0; k <= n; k++) {
        const x = a.x + (b.x - a.x) * k / n, z = a.z + (b.z - a.z) * k / n;
        // The rope line itself stops a walker, by design; the Way on its far side is the main road's.
        if (x > FRONTIER.barrierX - .6) continue;
        assert.ok(canStand(x, z, world, .34), `${road.id} is blocked at ${x.toFixed(1)}, ${z.toFixed(1)}`);
        assert.equal(hexOwnerAt(x, z), 'Nesdor');
      }
    }
  }
  // The ford: a post on the Nesdor bank, beside the shallow head of the Carica.
  const post = NESDOR_CARICA_FORD.post, profile = WEST_PROFILES.get(CARICA.id);
  const crossing = profile.reduce((best, sample) => gap(sample, NESDOR_CARICA_FORD.crossing) < gap(best, NESDOR_CARICA_FORD.crossing) ? sample : best);
  assert.equal(crossing.ford, true, 'the crossing is on the Carica’s fordable head');
  assert.ok(gap(crossing, NESDOR_CARICA_FORD.crossing) < 3);
  assert.equal(hexOwnerAt(post.x, post.z), 'Nesdor', 'the post stands on the Nesdor bank');
  assert.ok(!wet(post.x, post.z) && gap(post, crossing) < 12);
  assert.ok(built.root.parent && built.metrics.buildings === NESDOR_BUILDINGS.length, 'built into the world');
  assert.equal(mine.length, flatColliders.length, 'every collider the farm makes is in the world, once');
});

test('The seed bench, hives, board, desk and mailboxes stand on dry ground, each where its keeper is', () => {
  const places = [NESDOR_SEED_BENCH, NESDOR_HIVES, NESDOR_ORDER_BOARD, NESDOR_WRITING_DESK, ...NESDOR_MAILBOXES];
  for (const place of places) {
    assert.equal(hexOwnerAt(place.x, place.z), 'Nesdor');
    assert.ok(waterWithin(place, 3) === Infinity, `${place.id} is dry`);
  }
  assert.ok(gap(NESDOR_SEED_BENCH, NINEHANDS) < 15, 'the seed bench is at the farm');
  assert.ok(gap(NESDOR_HIVES, NESDOR_NPC_STANDS.beyla) < 7, 'Beyla keeps her hives');
  assert.ok(gap(NESDOR_NPC_STANDS.byggvir, NESDOR_BUILDINGS.find(b => b.id === 'nesdor-malt-house')) < 9, 'Byggvir keeps his malt-house');
  assert.ok(gap(NESDOR_NPC_STANDS.forseti, NESDOR_ORDER_BOARD) < 6 && gap(NESDOR_NPC_STANDS.forseti, NESDOR_WRITING_DESK) < 5, 'Forseti keeps his board and his desk');
  assert.ok(NESDOR_NPC_STANDS.aegir.x > NESDOR_INN_YARD.minX && NESDOR_NPC_STANDS.aegir.x < NESDOR_INN_YARD.maxX
    && NESDOR_NPC_STANDS.aegir.z > NESDOR_INN_YARD.minZ && NESDOR_NPC_STANDS.aegir.z < NESDOR_INN_YARD.maxZ, 'Aegir is in his yard');
  assert.ok(gap(NESDOR_NPC_STANDS.idunn, NESDOR_HAZEL_WOOD) < 8, 'Idunn is at her coppice');
  assert.ok(gap(NESDOR_NPC_STANDS.baugi, NINEHANDS) < 6, 'Baugi is in his yard');
  const bench = NESDOR_STRIPS.find(strip => strip.id === 'nesdor-bench');
  assert.ok(gap(NESDOR_NPC_STANDS.bolverk, bench.end) < 4, 'Bolverk waits at the end of the bench strip');
  const farmEast = Math.max(...NESDOR_BUILDINGS.filter(b => b.id.startsWith('ninehands')).map(b => b.x + b.w / 2));
  assert.ok(NESDOR_NPC_STANDS.egil.x > farmEast + 40, 'Egil is out on the open Flats east of the farm');
});

test('The farm leaves free every place Nesdor’s animals live and every spot its ground test stands on', () => {
  const covers = (c, x, z, clear) => (c.r !== undefined ? Math.hypot(x - c.x, z - c.z) < c.r + clear
    : Math.abs(x - c.x) < c.hx + clear && Math.abs(z - c.z) < c.hz + clear);
  for (const zone of WEST_LIFE_ZONES.filter(item => item.region === 'Nesdor')) for (const [x, z] of zone.sites) {
    assert.ok(!mine.some(c => covers(c, x, z, zone.radius + .5)), `${zone.id} keeps its home at ${x}, ${z}`);
    assert.ok(canStand(x, z, world, zone.radius), `${zone.id} still finds footing at ${x}, ${z}`);
  }
  // tests/nesdor-world.test.js stands on each hex's middle and thirty metres out from it each way.
  for (const cell of REGION_CELLS.Nesdor) for (const [dx, dz] of [[0, 0], [30, 0], [-30, 0], [0, 30], [0, -30]])
    assert.ok(!mine.some(c => covers(c, cell.x + dx, cell.z + dz, 1)), `the ground test's spot at ${cell.x + dx}, ${cell.z + dz} is free`);
});
