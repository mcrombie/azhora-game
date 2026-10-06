import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { scopedWorld } from './scoped-world.js';
import { canStand } from '../src/game-state.js';
import { REGION_IDS, REGION_CELLS, hexOwnerAt } from '../src/region-world.js';
import { NETH, NETHEREUM_STREAMS, WEST_RIVERS, courseDistance, coursePosition } from '../src/west-regions.js';
import { WEST_PROFILES, courseSample, westWaterSurface, nethereumWet } from '../src/west-ground.js';
import { MENORA_PATHS } from '../src/menora-city.js';
import {
  HAETHOM, HAETHOM_HOUSES, NETHEREUM_BUILDINGS, NETHEREUM_LEVEE, NETHEREUM_HUMMOCK, NETHEREUM_SITES, NETHEREUM_WEIR,
  NETHEREUM_PATHS, NETHEREUM_FARM_ROWS, NETHEREUM_MEADOW_ROWS, NETHEREUM_DEEP_ROWS, NETHEREUM_SEED_BENCH, NETHEREUM_SEED_STATIONS, NETHEREUM_NPC_STANDS,
  NETHEREUM_FARM_LANDMARKS, NETHEREUM_STEPPING_STONES, RELIABLE_LINE,
  nethereumFarmHeight, nethereumLeveeLift, nethereumHummockLift, nethereumLeveeFrame, nethereumFarmReserved,
} from '../src/nethereum-farm.js';

/**
 * Haethom, the levee and its hatch, the meadow and the deep plots, and Gwyddno's weir: the places of
 * Build 2 of the Farmlands of the Lizeem (src/nethereum-farm.js; the design of 5 October 2026, built
 * 6 October 2026). Measured on the real ground of a scoped world, Nethereum and Isareos, with the
 * place's own scenery and colliders laid on it as the world build step would lay them.
 */
const { createNethereumFarmScenery, NETHEREUM_HATCH_STATES, NETHEREUM_FLOOD_STATES } = await sourceModule('../src/nethereum-farm-scenery.js');
const { WEST_LIFE_ZONES } = await sourceModule('../src/west-regions-life.js');
const scene = new THREE.Scene();
const world = await scopedWorld(scene, [REGION_IDS.Nethereum, REGION_IDS.Isareos]);
const mine = [];
// The world's own heightAt has the bank on it since the wiring (src/world.js, 6 October 2026): the scenery, as the world
// build step does, and every measure of the ground below, read the ground without it (`groundHeight`).
const built = createNethereumFarmScenery({ parent: scene, heightAt: world.groundHeight, colliders: mine });
const NEAR = { minX: -2450, maxX: -2230, minZ: 280, maxZ: 580 };
const nearby = world.colliders.filter(c => c.x > NEAR.minX && c.x < NEAR.maxX && c.z > NEAR.minZ && c.z < NEAR.maxZ);
/** The world with this place in it: its colliders added and its bank under foot, as the wiring makes it (the world's own heightAt). */
const here = { bounds: world.bounds, colliders: [...nearby, ...mine], waterAt: world.waterAt,
  heightAt: world.heightAt };
/** Metres from the nearest western water's edge, using each course's width where it is. */
function waterClearance(x, z) {
  let best = Infinity;
  for (const course of WEST_RIVERS) {
    const d = courseDistance(course, x, z, best + course.maxHalf + 1);
    if (d < best + course.maxHalf) best = Math.min(best, d - (courseSample(course, x, z)?.half ?? course.maxHalf));
  }
  return best;
}
const footprint = (x, z, b, margin = 0) => Math.hypot(Math.max(0, Math.abs(x - b.x) - b.hx - margin), Math.max(0, Math.abs(z - b.z) - b.hz - margin));
const segment = (x, z, a, b) => {
  const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
};
const along = route => route.points.slice(1).flatMap((b, i) => {
  const a = route.points[i], n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z));
  return Array.from({ length: n + 1 }, (_, k) => ({ x: a.x + (b.x - a.x) * k / n, z: a.z + (b.z - a.z) * k / n }));
});
const BED = { hx: 1.5, hz: 1.65 }; // the farming view's 2.8 by 3.1 m soil and its corner stakes

test('Haethom stands on the north-eastern rim above the reliable line, where the Sacred Way runs out', () => {
  const end = MENORA_PATHS.find(p => p.id === 'menora-sacred-way').points.at(-1);
  assert.deepEqual({ ...HAETHOM.arrival }, { x: end.x, z: end.z }, 'the hamlet is reached from the Sacred Way’s own end');
  assert.ok(Math.hypot(HAETHOM.x - end.x, HAETHOM.z - end.z) < 45);
  assert.equal(HAETHOM_HOUSES.length, 4, 'four houses round the common');
  assert.deepEqual(HAETHOM_HOUSES.map(b => b.owner).sort(), ['airmid', 'fintan', 'mererid', 'seithenyn']);
  for (const b of NETHEREUM_BUILDINGS) assert.equal(hexOwnerAt(b.x, b.z), 'Nethereum', `${b.id} stands outside Nethereum`);
  const lowest = b => Math.min(...[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => world.groundHeight(b.x + sx * b.hx, b.z + sz * b.hz)));
  for (const b of [...HAETHOM_HOUSES, NETHEREUM_BUILDINGS.find(b => b.owner === 'boann')])
    assert.ok(lowest(b) > RELIABLE_LINE, `${b.id} stands at ${lowest(b).toFixed(1)} m, under the line`);
  const liban = NETHEREUM_BUILDINGS.find(b => b.owner === 'liban');
  assert.ok(lowest(liban) < RELIABLE_LINE - 3, 'Liban built below the line on purpose');
  assert.ok(nethereumHummockLift(liban.x, liban.z) > 1.2, 'and on a hummock');
  for (const row of NETHEREUM_FARM_ROWS) assert.ok(world.groundHeight(row.x, row.z) < RELIABLE_LINE - 2, `${row.id} is not in the flood meadow`);
  // Every house turns its door to the common.
  for (const b of HAETHOM_HOUSES) {
    const toward = Math.hypot(HAETHOM.common.x - b.door.x, HAETHOM.common.z - b.door.z);
    assert.ok(toward < Math.hypot(HAETHOM.common.x - b.x, HAETHOM.common.z - b.z), `${b.id} turns its back on the common`);
  }
});

test('the twelve beds keep their fixed ids and farmsteads, lie on the ground they name, and touch nothing', () => {
  assert.deepEqual(NETHEREUM_MEADOW_ROWS.map(r => r.id), Array.from({ length: 8 }, (_, n) => `nethereum-meadow-${n + 1}`));
  assert.deepEqual(NETHEREUM_DEEP_ROWS.map(r => r.id), Array.from({ length: 4 }, (_, n) => `nethereum-deep-${n + 1}`));
  for (const row of NETHEREUM_FARM_ROWS) {
    assert.equal(row.country, 'nethereum');
    assert.equal(row.farmstead, row.id.includes('meadow') ? 'haethom-meadow' : 'haethom-deep');
    assert.equal(row.yaw, 0, 'the farming view lays its beds square to the world');
    assert.ok(Math.abs(row.y - world.groundHeight(row.x, row.z)) < .06, `${row.id} says ${row.y} and the ground says ${world.groundHeight(row.x, row.z).toFixed(2)}`);
    assert.equal(hexOwnerAt(row.x, row.z), 'Nethereum');
    assert.ok(waterClearance(row.x, row.z) > 6, `${row.id} is ${waterClearance(row.x, row.z).toFixed(1)} m from water`);
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) {
      const x = row.x + sx * BED.hx, z = row.z + sz * BED.hz;
      assert.equal(westWaterSurface(x, z), null, `${row.id} has water under it`);
      assert.equal(nethereumLeveeLift(x, z) + nethereumHummockLift(x, z), 0, `${row.id} climbs the levee or the hummock`);
    }
    assert.ok(canStand(row.x, row.z, here, .5), `nobody can stand on ${row.id}`);
    for (const other of NETHEREUM_FARM_ROWS) if (other !== row)
      assert.ok(Math.abs(other.x - row.x) >= BED.hx * 2 || Math.abs(other.z - row.z) >= BED.hz * 2, `${row.id} overlaps ${other.id}`);
  }
  // The meadow is just inside the levee and the deep plots are farther in and lower.
  for (const row of NETHEREUM_MEADOW_ROWS) assert.ok(nethereumLeveeFrame(row.x, row.z).distance < 13, `${row.id} is far from the levee`);
  const mean = rows => rows.reduce((sum, r) => sum + r.y, 0) / rows.length;
  assert.ok(mean(NETHEREUM_DEEP_ROWS) < mean(NETHEREUM_MEADOW_ROWS) - .8, 'the deep plots lie lower than the meadow');
  for (const row of NETHEREUM_DEEP_ROWS) assert.ok(nethereumWet(row.x, row.z) > .85, `${row.id} is not on the basin floor`);
  // The seed bench is at the meadow's head, within reach of both farmsteads' beds.
  const b = NETHEREUM_SEED_BENCH;
  assert.ok(Math.abs(b.y - world.groundHeight(b.x, b.z)) < .06);
  assert.ok(Math.min(...NETHEREUM_MEADOW_ROWS.map(r => Math.hypot(r.x - b.x, r.z - b.z))) < 8);
  // The Work of Nine works a farmstead whole from forty metres: each one's beds lie well inside that.
  for (const rows of [NETHEREUM_MEADOW_ROWS, NETHEREUM_DEEP_ROWS]) for (const a of rows) for (const c of rows)
    assert.ok(Math.hypot(a.x - c.x, a.z - c.z) < 20, `${a.id} and ${c.id} are a farmstead apart`);
  for (const bench of NETHEREUM_SEED_STATIONS) {
    assert.ok(mine.some(c => c.kind === 'farm-seed-bench' && c.x === bench.x && c.z === bench.z && c.farmId === bench.farmstead));
    assert.ok(Math.abs(bench.y - world.groundHeight(bench.x, bench.z)) < .06, `${bench.id} says ${bench.y}`);
    assert.ok(Math.min(...NETHEREUM_FARM_ROWS.filter(r => r.farmstead === bench.farmstead).map(r => Math.hypot(r.x - bench.x, r.z - bench.z))) < 8);
    assert.ok(canStand(bench.x, bench.z + 1.2, here, .4) || canStand(bench.x, bench.z - 1.2, here, .4), `nobody can reach ${bench.id}`);
  }
});

test('the hatch is in the levee’s notch where it is declared, and the weir is in the deep Neth below the ford', () => {
  const hatch = NETHEREUM_SITES.hatch;
  assert.ok(nethereumLeveeFrame(hatch.x, hatch.z).distance < .05, 'the hatch is on the levee’s line');
  assert.equal(nethereumLeveeLift(hatch.x, hatch.z), 0, 'and the bank is cut through where it stands');
  assert.ok(Math.abs(hatch.y - world.groundHeight(hatch.x, hatch.z)) < .06);
  const thread = NETHEREUM_STREAMS.find(s => s.id === 'nethereum-stream-east');
  assert.ok(courseDistance(thread, hatch.x, hatch.z) < 9, 'beside the stream it lets out');
  const gate = mine.filter(c => c.id === 'haethom-hatch-gate');
  assert.equal(gate.length, 2);
  for (const c of gate) assert.ok(Math.hypot(c.x - hatch.x, c.z - hatch.z) < 1, 'the gate is built at the hatch');
  assert.ok(canStand(hatch.approach.x, hatch.approach.z, here, .4), 'the lever can be reached');
  assert.ok(Math.hypot(hatch.approach.x - hatch.x, hatch.approach.z - hatch.z) < 4);
  // The weir's trap is out in the deep Neth, below the ford; its head is on the Nethereum bank.
  const { trap } = NETHEREUM_SITES.weir, weir = NETHEREUM_SITES.weir;
  const sample = courseSample(NETH, trap.x, trap.z);
  assert.ok(courseDistance(NETH, trap.x, trap.z) < sample.half - 1, 'the trap is in the river');
  assert.ok(coursePosition(NETH, trap.x, trap.z) > NETH.fordUntil, 'below the ford');
  assert.ok(!sample.ford);
  assert.ok(Math.abs(NETHEREUM_WEIR.surface - sample.surface) < .05, 'the weir’s stakes stand to the water’s own level');
  for (const arm of NETHEREUM_WEIR.arms) assert.ok(westWaterSurface(arm.x, arm.z) !== null, 'both arms of the weir stand in the water');
  assert.equal(hexOwnerAt(weir.x, weir.z), 'Nethereum');
  assert.ok(Math.hypot(weir.x - trap.x, weir.z - trap.z) < 20, 'the head is within a rope’s reach of the trap');
  assert.ok(Math.abs(weir.y - world.groundHeight(weir.x, weir.z)) < .06);
  assert.ok(waterClearance(weir.x, weir.z) > 4);
  assert.ok(canStand(weir.x + 1.2, weir.z, here, .4), 'the catch can be hauled from the bank');
  assert.ok(mine.filter(c => c.kind === 'weir-frame').every(c => Math.hypot(c.x - weir.x, c.z - weir.z) < 1));
  // The smoke-house is where it is declared, and its door can be stood at.
  const smoke = NETHEREUM_BUILDINGS.find(b => b.id === 'gwyddno-smokehouse');
  assert.deepEqual([NETHEREUM_SITES.smokehouse.x, NETHEREUM_SITES.smokehouse.z], [smoke.x, smoke.z]);
  assert.ok(canStand(NETHEREUM_SITES.smokehouse.door.x + .6, NETHEREUM_SITES.smokehouse.door.z, here, .4));
  assert.ok(Math.hypot(smoke.x - weir.x, smoke.z - weir.z) < 20 && waterClearance(smoke.x, smoke.z) > 10);
});

test('the levee is a bank to walk along, highest at its head, and Fintan stands on that head', () => {
  const L = NETHEREUM_LEVEE;
  for (const [i, point] of L.points.entries()) {
    assert.ok(Math.abs(L.ground[i] - world.groundHeight(point.x, point.z)) < .06, `the levee’s ground at point ${i}`);
    assert.ok(Math.abs(nethereumLeveeLift(point.x, point.z) - L.crest) < 1e-9, `the crest at point ${i}`);
    assert.ok(waterClearance(point.x, point.z) > 4.5, `the crest at point ${i} is ${waterClearance(point.x, point.z).toFixed(1)} m from the stream`);
  }
  // Nothing is a wall: the faces rise no steeper than one in two, measured across the bank.
  let steep = 0;
  for (let i = 1; i < L.points.length; i++) {
    const a = L.points[i - 1], b = L.points[i], len = Math.hypot(b.x - a.x, b.z - a.z), nx = -(b.z - a.z) / len, nz = (b.x - a.x) / len;
    for (let t = .1; t < 1; t += .2) for (let o = -4.5; o < 4.5; o += .25) {
      const x = a.x + (b.x - a.x) * t + nx * o, z = a.z + (b.z - a.z) * t + nz * o;
      steep = Math.max(steep, Math.abs(nethereumLeveeLift(x + nx * .25, z + nz * .25) - nethereumLeveeLift(x, z)) / .25);
    }
  }
  assert.ok(steep < .7, `the levee’s face is one in ${(1 / steep).toFixed(1)}`);
  let highest = { y: -Infinity };
  for (let x = -2416; x < -2355; x += .5) for (let z = 310; z < 372; z += .5) {
    if (nethereumLeveeLift(x, z) < L.crest - 1e-6) continue;
    const y = here.heightAt(x, z);
    if (y > highest.y) highest = { x, z, y };
  }
  const fintan = NETHEREUM_NPC_STANDS.fintan;
  assert.ok(nethereumLeveeLift(fintan.x, fintan.z) > L.crest - 1e-6, 'Fintan stands on the crest');
  assert.ok(highest.y - here.heightAt(fintan.x, fintan.z) < .2, `Fintan is ${(highest.y - here.heightAt(fintan.x, fintan.z)).toFixed(2)} m under the levee’s highest point`);
  assert.ok(Math.hypot(NETHEREUM_SITES.recall.x - fintan.x, NETHEREUM_SITES.recall.z - fintan.z) < 3, 'and speaks the Recall where the Council sits');
  assert.ok(nethereumLeveeLift(NETHEREUM_NPC_STANDS.mererid.x, NETHEREUM_NPC_STANDS.mererid.z) > L.crest - 1e-6, 'Mererid keeps the levee from its top');
  // The world's height over the place is the bank's, and the plain ground's everywhere else.
  assert.equal(nethereumFarmHeight(-2290, 335, world.groundHeight), null);
  assert.equal(nethereumFarmHeight(-2500, 380, world.groundHeight), null);
  const H = NETHEREUM_HUMMOCK;
  assert.ok(Math.abs(nethereumFarmHeight(H.x, H.z, world.groundHeight) - (world.groundHeight(H.x, H.z) + H.rise)) < 1e-9);
  assert.ok(Math.abs(H.y - world.groundHeight(H.x, H.z)) < .06);
});

test('every stand is on walkable ground, more than a metre from any building and four from water', () => {
  assert.deepEqual(Object.keys(NETHEREUM_NPC_STANDS).sort(), ['airmid', 'boann', 'fintan', 'gwyddno', 'liban', 'mererid', 'seithenyn']);
  // Where §6.4 and the brief put each of them: Mererid on the levee, Seithenyn by the hatch, Gwyddno at the weir,
  // Boann at the byre, Fintan on the levee's head, Airmid by her house, Liban by hers below the line.
  const near = { mererid: NETHEREUM_LEVEE.points[2], seithenyn: NETHEREUM_SITES.hatch, gwyddno: NETHEREUM_SITES.weir, boann: NETHEREUM_SITES.byre,
    fintan: NETHEREUM_SITES.levee, airmid: NETHEREUM_BUILDINGS.find(b => b.owner === 'airmid'), liban: NETHEREUM_BUILDINGS.find(b => b.owner === 'liban') };
  for (const [id, s] of Object.entries(NETHEREUM_NPC_STANDS)) {
    assert.equal(hexOwnerAt(s.x, s.z), 'Nethereum', `${id} stands outside Nethereum`);
    assert.ok(Number.isFinite(s.yaw));
    for (const b of NETHEREUM_BUILDINGS) assert.ok(footprint(s.x, s.z, b) > 1, `${id} stands ${footprint(s.x, s.z, b).toFixed(2)} m from ${b.id}`);
    assert.ok(waterClearance(s.x, s.z) > 4, `${id} stands ${waterClearance(s.x, s.z).toFixed(1)} m from water`);
    assert.ok(canStand(s.x, s.z, here, .5), `${id} cannot stand where he or she is put`);
    assert.ok(here.heightAt(s.x, s.z) >= world.waterAt(s.x, s.z));
    for (const row of NETHEREUM_FARM_ROWS) assert.ok(Math.abs(s.x - row.x) > BED.hx + .4 || Math.abs(s.z - row.z) > BED.hz + .4, `${id} stands on ${row.id}`);
    assert.ok(Math.hypot(s.x - near[id].x, s.z - near[id].z) < 12, `${id} is not where the design puts him or her`);
  }
  assert.ok(nethereumWet(NETHEREUM_NPC_STANDS.liban.x, NETHEREUM_NPC_STANDS.liban.z) > .85 && here.heightAt(NETHEREUM_NPC_STANDS.liban.x, NETHEREUM_NPC_STANDS.liban.z) < RELIABLE_LINE,
    'Liban stands below the line');
});

test('nothing overlaps a house: beds, the bench, the paths and every prop keep off the footprints', () => {
  const houses = mine.filter(c => c.kind === 'building');
  assert.equal(houses.length, NETHEREUM_BUILDINGS.length);
  for (const b of NETHEREUM_BUILDINGS) {
    const c = houses.find(item => item.id === b.id);
    assert.ok(c && c.x === b.x && c.z === b.z && c.hx > b.hx && c.hz > b.hz, `${b.id} has no collider round its plinth`);
    for (const row of NETHEREUM_FARM_ROWS) assert.ok(footprint(row.x, row.z, b, BED.hx + .5) > 0 || footprint(row.x, row.z, b) > 3, `${row.id} is under ${b.id}`);
    for (const other of NETHEREUM_BUILDINGS) if (other !== b)
      assert.ok(Math.abs(other.x - b.x) > other.hx + b.hx + 2 || Math.abs(other.z - b.z) > other.hz + b.hz + 2, `${b.id} crowds ${other.id}`);
    for (const route of NETHEREUM_PATHS) for (const p of along(route))
      assert.ok(footprint(p.x, p.z, c) > route.width / 2 - .3, `${route.id} runs into ${b.id}`);
    for (const bench of NETHEREUM_SEED_STATIONS) assert.ok(footprint(bench.x, bench.z, c) > 2);
  }
  for (const prop of mine.filter(c => !c.kind.startsWith('building')))
    for (const c of houses) assert.ok(footprint(prop.x, prop.z, c) > (prop.r ?? Math.max(prop.hx, prop.hz)) - .5, `${prop.id ?? prop.kind} is inside ${c.id}`);
  // And no prop of the place stands on a bed or across a path.
  for (const prop of mine.filter(c => !c.kind.startsWith('building') && !c.kind.startsWith('sluice') && c.kind !== 'flood-post')) {
    for (const row of NETHEREUM_FARM_ROWS) assert.ok(Math.abs(prop.x - row.x) > BED.hx + .3 || Math.abs(prop.z - row.z) > BED.hz + .3, `${prop.id ?? prop.kind} is on ${row.id}`);
    for (const route of NETHEREUM_PATHS) assert.ok(Math.min(...route.points.slice(1).map((b, i) => segment(prop.x, prop.z, route.points[i], b))) > route.width / 2 - .4,
      `${prop.id ?? prop.kind} blocks ${route.id}`);
  }
  for (const route of NETHEREUM_PATHS) for (const p of along(route)) for (const row of NETHEREUM_FARM_ROWS)
    assert.ok(Math.abs(p.x - row.x) > BED.hx + .2 || Math.abs(p.z - row.z) > BED.hz + .2, `${route.id} crosses ${row.id}`);
  // The country's honest-ground samples (tests/nethereum-world.test.js) are never penned in by a building.
  for (const cell of REGION_CELLS.Nethereum) for (const [dx, dz] of [[0, 0], [30, 0], [-30, 0], [0, 30], [0, -30], [34, 34], [-34, -34]]) {
    const x = cell.x + dx, z = cell.z + dz;
    if (Math.min(...houses.map(c => footprint(x, z, c))) > 4) continue;
    assert.ok([0, 1, 2, 3, 4, 5, 6, 7].some(i => canStand(x + Math.sin(i / 4 * Math.PI) * 3.4, z + Math.cos(i / 4 * Math.PI) * 3.4, here, .5))
      || canStand(x, z, here, .5), `a building pens in (${x}, ${z})`);
  }
});

test('the paths join the Sacred Way to the hamlet, the levee and the weir, dry but for the stepping stones', () => {
  const end = MENORA_PATHS.find(p => p.id === 'menora-sacred-way').points.at(-1);
  const route = id => NETHEREUM_PATHS.find(p => p.id === id);
  assert.deepEqual({ ...route('haethom-way').points[0] }, { x: end.x, z: end.z });
  const common = HAETHOM.common, onCommon = p => Math.abs(p.x - common.x) <= common.width / 2 && Math.abs(p.z - common.z) <= common.depth / 2;
  assert.ok(onCommon(route('haethom-way').points.at(-1)) && onCommon(route('haethom-levee-path').points[0]) && onCommon(route('haethom-weir-path').points[0]));
  const head = NETHEREUM_SITES.levee;
  assert.ok(route('haethom-levee-path').points.some(p => Math.hypot(p.x - head.x, p.z - head.z) < 7), 'the levee path climbs to the levee’s head');
  assert.ok(Math.hypot(route('haethom-levee-path').points.at(-1).x - NETHEREUM_SEED_BENCH.x, route('haethom-levee-path').points.at(-1).z - NETHEREUM_SEED_BENCH.z) < 3);
  const yard = route('haethom-weir-path').points.at(-1);
  assert.ok(Math.hypot(yard.x - NETHEREUM_SITES.weir.x, yard.z - NETHEREUM_SITES.weir.z) < 6, 'the weir path ends at the weir');
  assert.ok(Math.hypot(route('haethom-byre-path').points.at(-1).x - NETHEREUM_SITES.byre.x, route('haethom-byre-path').points.at(-1).z - NETHEREUM_SITES.byre.z) < 9);
  assert.ok(Math.hypot(route('haethom-deep-path').points.at(-1).x - NETHEREUM_HUMMOCK.x, route('haethom-deep-path').points.at(-1).z - NETHEREUM_HUMMOCK.z) < NETHEREUM_HUMMOCK.foot);
  for (const path of NETHEREUM_PATHS) for (const p of along(path)) {
    assert.equal(hexOwnerAt(p.x, p.z), 'Nethereum', `${path.id} leaves the country at (${p.x.toFixed(0)}, ${p.z.toFixed(0)})`);
    if (NETHEREUM_STEPPING_STONES.some(s => Math.hypot(s.x - p.x, s.z - p.z) < 4)) continue;
    assert.ok(waterClearance(p.x, p.z) > path.width / 2, `${path.id} is in the water at (${p.x.toFixed(0)}, ${p.z.toFixed(0)})`);
  }
  // The stones are in the north-east thread, which is a step across anywhere.
  const thread = NETHEREUM_STREAMS.find(s => s.id === 'nethereum-stream-east');
  assert.equal(thread.fordUntil, 1);
  for (const s of NETHEREUM_STEPPING_STONES) assert.ok(courseDistance(thread, s.x, s.z) < 2.5);
  assert.ok(along(route('haethom-byre-path')).some(p => waterClearance(p.x, p.z) < 0), 'and the byre path does cross it');
});

test('the place costs five draws, and the hatch and the flood show one state at a time', () => {
  const meshes = [];
  built.root.traverse(object => { if (object.isMesh) meshes.push(object); });
  const shown = () => meshes.filter(mesh => { for (let o = mesh; o; o = o.parent) if (!o.visible) return false; return true; });
  assert.ok(meshes.length <= 8, `${meshes.length} meshes`);
  assert.equal(built.metrics.batches, meshes.length);
  assert.ok(shown().length <= 5, `${shown().length} drawn`);
  assert.ok(built.metrics.vertices < 60000, `${built.metrics.vertices} vertices`);
  assert.equal(built.hatch.state(), 'broken', 'the hatch starts broken');
  for (const state of NETHEREUM_HATCH_STATES) {
    built.hatch.set(state);
    assert.deepEqual(shown().filter(m => m.userData.hatchState).map(m => m.userData.hatchState), [state]);
  }
  assert.throws(() => built.hatch.set('ajar'));
  assert.equal(built.meadowWater.state(), 'dry');
  assert.equal(built.meadowWater.mesh.visible, false, 'the meadow is dry until the hatch lets the stream out');
  for (const state of NETHEREUM_FLOOD_STATES) {
    built.meadowWater.set(state);
    assert.equal(built.meadowWater.mesh.visible, state !== 'dry');
    assert.ok(shown().length <= 6);
  }
  assert.throws(() => built.meadowWater.set('flood'));
  built.meadowWater.set('dry'); built.hatch.set('broken');
  // The water lies over the meadow's beds, and only over the meadow.
  const box = new THREE.Box3().setFromObject(built.meadowWater.mesh);
  for (const row of NETHEREUM_MEADOW_ROWS) assert.ok(box.containsPoint(new THREE.Vector3(row.x, row.y + .1, row.z)), `${row.id} stays dry in a flood`);
  for (const row of NETHEREUM_DEEP_ROWS) assert.equal(box.containsPoint(new THREE.Vector3(row.x, box.min.y + .01, row.z)), false);
  assert.equal(built.metrics.buildings, NETHEREUM_BUILDINGS.length);
  assert.equal(built.metrics.paths, NETHEREUM_PATHS.length);
  assert.equal(built.mapFeatures.length, NETHEREUM_BUILDINGS.length);
  assert.ok(mine.every(c => !/^nethereum-/.test(c.kind)), 'no collider claims the country’s wild kinds');
});

test('the scatter keeps off what was built, and the rim’s hares have moved off the hamlet', () => {
  for (const b of NETHEREUM_BUILDINGS) assert.ok(nethereumFarmReserved(b.x, b.z), b.id);
  for (const row of NETHEREUM_FARM_ROWS) assert.ok(nethereumFarmReserved(row.x, row.z), row.id);
  for (const route of NETHEREUM_PATHS) for (const p of along(route)) assert.ok(nethereumFarmReserved(p.x, p.z), route.id);
  for (const point of NETHEREUM_LEVEE.points) assert.ok(nethereumFarmReserved(point.x, point.z));
  assert.ok(nethereumFarmReserved(NETHEREUM_HUMMOCK.x, NETHEREUM_HUMMOCK.z) && nethereumFarmReserved(NETHEREUM_SITES.weir.x, NETHEREUM_SITES.weir.z));
  for (const [x, z] of [[-2545, 372], [-2620, 370], [-2650, 289], [-2200, 470], [-2300, 140]]) assert.equal(nethereumFarmReserved(x, z, 2), false);
  const hares = WEST_LIFE_ZONES.find(zone => zone.id === 'nethereum-hares');
  for (const [x, z] of hares.sites) {
    assert.equal(nethereumFarmReserved(x, z, 6), false, `a hare at (${x}, ${z}) sits on Haethom’s ground`);
    assert.ok(nethereumWet(x, z) < .2, `a hare at (${x}, ${z}) is down in the wet`);
    assert.ok(canStand(x, z, here, hares.radius), `a hare at (${x}, ${z}) has no footing`);
    assert.ok(x >= hares.minX && x <= hares.maxX && z >= hares.minZ && z <= hares.maxZ);
  }
  for (const b of NETHEREUM_BUILDINGS) assert.ok(b.x < hares.minX - 4 || b.x > hares.maxX + 4 || b.z < hares.minZ - 4 || b.z > hares.maxZ + 4,
    `${b.id} stands in the hares’ range`);
  // The chart names the places somebody built, each in Nethereum.
  assert.deepEqual(NETHEREUM_FARM_LANDMARKS.map(mark => mark.id), ['haethom', 'haethom-levee', 'gwyddno-weir', 'liban-hummock']);
  for (const mark of NETHEREUM_FARM_LANDMARKS) assert.equal(hexOwnerAt(mark.x, mark.z), 'Nethereum', mark.id);
  assert.equal(WEST_PROFILES.get('nethereum-stream-east').length > 10, true);
});
