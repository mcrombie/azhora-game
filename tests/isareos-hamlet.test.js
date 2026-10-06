import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { scopedWorld } from './scoped-world.js';
import { canStand, canSwim } from '../src/game-state.js';
import { REGION_IDS } from '../src/region-world.js';
import { MENORA_GATES, MENORA_CAMP, MENORA_PATHS, MENORA_NPC_ANCHORS, menoraRiverClearance, menoraReserved } from '../src/menora-city.js';
import { YUNETHRE_RAID_ROUTE } from '../src/yunethre-world.js';
import {
  ISAREOS_HAMLET, ISAREOS_HAMLET_BUILDINGS, ISAREOS_HAMLET_STALL, ISAREOS_HAMLET_STAND, ISAREOS_HAMLET_NPC_STANDS, ISAREOS_HAMLET_SITES,
  ISAREOS_HAMLET_ROWS, ISAREOS_HAMLET_PATHS, ISAREOS_HAMLET_LANDMARKS, isareosHamletReserved,
} from '../src/isareos-hamlet.js';

/**
 * Amalthea's hamlet in the Isareos hills (src/isareos-hamlet.js; Build 5 of the Farmlands of the Lizeem,
 * 6 October 2026), measured on the real ground of a scoped Isareos world with the hamlet's own scenery and
 * colliders laid on it as a world build step would lay them.
 */
const { createIsareosHamletScenery } = await sourceModule('../src/isareos-hamlet-scenery.js');
const scene = new THREE.Scene();
const world = await scopedWorld(scene, [REGION_IDS.Isareos]);
const mine = [];
const built = createIsareosHamletScenery({ parent: scene, heightAt: world.groundHeight ?? world.heightAt, colliders: mine });
/** The frontier's thorn and gallery trees that the wiring keeps off the hamlet and its track (`frontierReserved`, margin 1). */
const scatter = c => ['isareos-thorn', 'isareos-tree'].includes(c.kind) && isareosHamletReserved(c.x, c.z, 1);
const NEAR = { minX: -2680, maxX: -2440, minZ: -40, maxZ: 120 };
// Since the integration of 6 October 2026 the world lays the hamlet itself (src/world.js `isareosHamlet`): its colliders are
// the ones laid here as `mine`, so they are told apart from the frontier's by kind and place and measured once.
const key = c => `${c.kind ?? ''}:${c.x.toFixed(2)}:${c.z.toFixed(2)}`, own = new Set(mine.map(key));
const nearby = world.colliders.filter(c => c.x > NEAR.minX && c.x < NEAR.maxX && c.z > NEAR.minZ && c.z < NEAR.maxZ && !own.has(key(c)));
/** The world with the hamlet in it, as the wiring makes it. */
const here = { bounds: world.bounds, colliders: [...nearby.filter(c => !scatter(c)), ...mine], heightAt: world.heightAt, waterAt: world.waterAt };
const gate = MENORA_GATES.find(g => g.id === 'menora-west-gate');
const boxDistance = (x, z, b) => Math.hypot(Math.max(0, Math.abs(x - b.x) - b.width / 2), Math.max(0, Math.abs(z - b.z) - b.depth / 2));
const footprint = (x, z, b) => Math.hypot(Math.max(0, Math.abs(x - b.x) - b.hx), Math.max(0, Math.abs(z - b.z) - b.hz));
const segment = (x, z, a, b) => {
  const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
};
const along = route => route.points.slice(1).flatMap((b, i) => {
  const a = route.points[i], n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z));
  return Array.from({ length: n + 1 }, (_, k) => ({ x: a.x + (b.x - a.x) * k / n, z: a.z + (b.z - a.z) * k / n }));
});
const corners = b => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => ({ x: b.x + sx * b.hx, z: b.z + sz * b.hz }));
/** A point in a building's own frame (door on +z), as the scenery places things. */
const local = (b, lx, lz) => ({ x: b.x + lx * Math.cos(b.yaw) + lz * Math.sin(b.yaw), z: b.z - lx * Math.sin(b.yaw) + lz * Math.cos(b.yaw) });

test('the hamlet is in Isareos, within 300 m north-west of the Muster Gate, clear of the camp, its tents and the raiders’ road', () => {
  const d = Math.hypot(ISAREOS_HAMLET.x - gate.x, ISAREOS_HAMLET.z - gate.z);
  assert.ok(d < 300 && ISAREOS_HAMLET.x < gate.x && ISAREOS_HAMLET.z < gate.z, `${d.toFixed(0)} m from the gate, and to its north-west`);
  for (const b of [...ISAREOS_HAMLET_BUILDINGS, ISAREOS_HAMLET_STAND, ...Object.values(ISAREOS_HAMLET_SITES)]) {
    assert.equal(world.regionAt(b.x, b.z)?.name, 'Isareos', `${b.id} is in Isareos`);
    assert.ok(boxDistance(b.x, b.z, MENORA_CAMP) > 100, `${b.id} is ${boxDistance(b.x, b.z, MENORA_CAMP).toFixed(0)} m from Wilhelm’s camp`);
    for (const tent of MENORA_CAMP.tents) assert.ok(Math.hypot(b.x - tent.x, b.z - tent.z) > 100, `${b.id} is near ${tent.id}`);
    assert.ok(!menoraReserved(b.x, b.z), `${b.id} is on the city’s own ground`);
    const raid = Math.min(...YUNETHRE_RAID_ROUTE.slice(1).map((q, i) => segment(b.x, b.z, YUNETHRE_RAID_ROUTE[i], q)));
    assert.ok(raid > 120, `${b.id} is ${raid.toFixed(0)} m from the centaurs’ raid route`);
    assert.ok(menoraRiverClearance(b.x, b.z) > 40, `${b.id} is ${menoraRiverClearance(b.x, b.z).toFixed(0)} m from water`);
  }
  assert.deepEqual([...ISAREOS_HAMLET_ROWS], [], 'nothing is sown in the hills');
  assert.equal(ISAREOS_HAMLET_NPC_STANDS.amalthea, ISAREOS_HAMLET_STAND);
  assert.equal(ISAREOS_HAMLET_LANDMARKS[0].id, ISAREOS_HAMLET.id);
});

test('it stands on the open top, where no thorn grows, and every building sits on a footing that takes up the fall', () => {
  // The top of the shoulder carries no scatter at all, so the hamlet stands whether or not the wiring reserves it.
  const inTheWay = nearby.filter(c => Math.hypot(c.x - ISAREOS_HAMLET.x, c.z - ISAREOS_HAMLET.z) < ISAREOS_HAMLET.radius + 2);
  assert.deepEqual(inTheWay.map(c => `${c.kind} at ${c.x.toFixed(1)}, ${c.z.toFixed(1)}`), []);
  const centre = world.heightAt(ISAREOS_HAMLET.x, ISAREOS_HAMLET.z);
  for (const b of ISAREOS_HAMLET_BUILDINGS) {
    const heights = [b, ...corners(b)].map(p => world.heightAt(p.x, p.z)), fall = Math.max(...heights) - Math.min(...heights);
    assert.ok(fall < 1.2, `${b.id} falls ${fall.toFixed(2)} m across its footprint`);
    assert.ok(Math.abs(world.heightAt(b.x, b.z) - centre) < 1.5, `${b.id} is on the top with the rest`);
    // Its door can be walked up to: the house's and the byre's from the yard, and the press from its open side.
    const door = local(b, 0, b.d / 2 + 1.5);
    assert.ok(canStand(door.x, door.z, here, .4), `nobody can reach the door of ${b.id}`);
  }
  // And the yard between them is open ground, apart from her stand.
  const { yard } = ISAREOS_HAMLET_SITES, stall = ISAREOS_HAMLET_STALL;
  for (let x = yard.x - yard.width / 2 + 1; x <= yard.x + yard.width / 2; x++) for (let z = yard.z - yard.depth / 2 + .5; z <= yard.z + yard.depth / 2; z++) {
    if (Math.abs(x - stall.x) < stall.width / 2 + .6 && Math.abs(z - stall.z) < stall.depth / 2 + .6) continue;
    assert.ok(canStand(x, z, here, .34), `the yard is blocked at ${x}, ${z}`);
  }
  // Building to building, at least four metres of yard.
  for (const [i, a] of ISAREOS_HAMLET_BUILDINGS.entries()) for (const b of ISAREOS_HAMLET_BUILDINGS.slice(i + 1))
    assert.ok(Math.abs(a.x - b.x) - a.hx - b.hx > 4 || Math.abs(a.z - b.z) - a.hz - b.hz > 4, `${a.id} crowds ${b.id}`);
});

test('Amalthea stands behind her counter on walkable ground, a metre from every building, facing down the track', () => {
  const s = ISAREOS_HAMLET_STAND, stall = ISAREOS_HAMLET_STALL;
  assert.ok(canStand(s.x, s.z, here, .5), 'she cannot stand where she is put');
  assert.ok(here.heightAt(s.x, s.z) >= world.waterAt(s.x, s.z));
  for (const b of ISAREOS_HAMLET_BUILDINGS) assert.ok(footprint(s.x, s.z, b) > 1, `she is within a metre of ${b.id}`);
  assert.ok(Math.abs(s.x - stall.x) < stall.width / 2 && Math.abs(s.z - stall.z) < stall.depth / 2, 'under her own awning');
  // A customer stands before the counter, and gets there from the end of the track on foot.
  const ahead = { x: s.x + Math.sin(s.yaw) * 2.6, z: s.z + Math.cos(s.yaw) * 2.6 };
  assert.ok(canStand(ahead.x, ahead.z, here, .4), 'nobody can stand before her counter');
  const end = ISAREOS_HAMLET_PATHS[0].points.at(-1);
  assert.ok(Math.hypot(end.x - ahead.x, end.z - ahead.z) < Math.hypot(end.x - s.x, end.z - s.z), 'she faces the way the track comes in');
  for (let k = 0; k <= 20; k++) {
    const x = end.x + (ahead.x - end.x) * k / 20, z = end.z + (ahead.z - end.z) * k / 20;
    assert.ok(canStand(x, z, here, .34), `the walk up from the track is blocked at ${x.toFixed(1)}, ${z.toFixed(1)}`);
  }
  assert.deepEqual({ ...ISAREOS_HAMLET.arrival }, { x: end.x, z: end.z });
});

test('the track leaves the end of the Muster road in the camp between the tent rows, and is walked or waded all the way to the yard', () => {
  const [route] = ISAREOS_HAMLET_PATHS;
  const muster = MENORA_PATHS.find(q => q.id === 'menora-muster-approach');
  assert.deepEqual({ ...route.points[0] }, { ...muster.points.at(-1) }, 'it begins where the Muster road ends, by Wilhelm');
  const wet = [];
  for (const q of along(route)) {
    for (const tent of MENORA_CAMP.tents)
      assert.ok(Math.abs(q.x - tent.x) > tent.width / 2 + 2 || Math.abs(q.z - tent.z) > tent.depth / 2 + 2, `the track runs into ${tent.id}`);
    for (const soldier of MENORA_NPC_ANCHORS.army) assert.ok(Math.hypot(q.x - soldier.x, q.z - soldier.z) > 8, 'the track runs through the army’s lines');
    if (canStand(q.x, q.z, here, .34)) continue;
    assert.ok(canSwim(q.x, q.z, here, .34), `the track is blocked at ${q.x.toFixed(1)}, ${q.z.toFixed(1)}`);
    wet.push(q);
  }
  // Only the middle beck is waded, a few metres of it below its head.
  assert.ok(wet.length <= 8, `${wet.length} m of the track are under water`);
  for (const q of wet) assert.ok(Math.hypot(q.x + 2532, q.z - 37) < 10, `wet ground away from the beck at ${q.x.toFixed(0)}, ${q.z.toFixed(0)}`);
  // The way is a walk: no stretch of five metres rises or falls more than a metre and a half, but for the beck's banks.
  const points = along(route).filter((_, i) => i % 5 === 0), atBeck = q => Math.hypot(q.x + 2532, q.z - 37) < 8;
  for (let i = 1; i < points.length; i++) {
    if (atBeck(points[i]) || atBeck(points[i - 1])) continue;
    const rise = Math.abs(world.heightAt(points[i].x, points[i].z) - world.heightAt(points[i - 1].x, points[i - 1].z));
    assert.ok(rise < 1.5, `the track climbs ${rise.toFixed(2)} m in five at ${points[i].x.toFixed(0)}, ${points[i].z.toFixed(0)}`);
  }
  // Out of the camp it is Isareos all the way.
  for (const q of along(route).filter(q => boxDistance(q.x, q.z, MENORA_CAMP) > 0)) assert.equal(world.regionAt(q.x, q.z)?.name, 'Isareos');
});

test('the scatter the wiring keeps off is the hamlet and its track, and nothing far from them', () => {
  for (const b of ISAREOS_HAMLET_BUILDINGS) assert.ok(isareosHamletReserved(b.x, b.z), b.id);
  assert.ok(isareosHamletReserved(ISAREOS_HAMLET_STAND.x, ISAREOS_HAMLET_STAND.z));
  for (const q of along(ISAREOS_HAMLET_PATHS[0])) assert.ok(isareosHamletReserved(q.x, q.z), `the track at ${q.x.toFixed(0)}, ${q.z.toFixed(0)}`);
  for (const [x, z] of [[-2700, 0], [-2560, -60], [-2345, 120], [-2474, 83]]) assert.equal(isareosHamletReserved(x, z), false, `${x}, ${z}`);
  // What the reservation takes away: the thorn and the gallery trees on the track, and nothing on the top.
  const taken = nearby.filter(scatter);
  assert.ok(taken.every(c => Math.hypot(c.x - ISAREOS_HAMLET.x, c.z - ISAREOS_HAMLET.z) > ISAREOS_HAMLET.radius));
  assert.ok(taken.length < 30, `${taken.length} bushes and trees come off the track`);
});

test('the scenery is two draws, small, and every building and the stand have their colliders', () => {
  assert.equal(built.metrics.buildings, ISAREOS_HAMLET_BUILDINGS.length);
  assert.ok(built.metrics.batches <= 2, `${built.metrics.batches} draws`);
  assert.ok(built.metrics.vertices < 30000, `${built.metrics.vertices} vertices`);
  assert.equal(built.metrics.paths, ISAREOS_HAMLET_PATHS.length);
  for (const b of ISAREOS_HAMLET_BUILDINGS) assert.ok(mine.some(c => c.id === b.id || c.id === `${b.id}-wall`), `${b.id} has no collider`);
  assert.ok(mine.some(c => c.id === `${ISAREOS_HAMLET_STALL.id}-counter`), 'the counter stops a body');
  for (const site of ['rick', 'trough', 'turves']) assert.ok(mine.some(c => c.id === ISAREOS_HAMLET_SITES[site].id), site);
  assert.deepEqual(built.mapFeatures.map(f => f.id), ISAREOS_HAMLET_BUILDINGS.map(b => b.id));
  assert.equal(built.landmarks, ISAREOS_HAMLET_LANDMARKS);
});
