import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { scopedWorld } from './scoped-world.js';
import { canStand } from '../src/game-state.js';
import { REGION_IDS, regions, hexOwnerAt } from '../src/region-world.js';
import { LIZEEM, NETH, courseDistance } from '../src/west-regions.js';
import { WEST_PROFILES, westWaterSurface } from '../src/west-ground.js';
import { galaSeamDistance, ovesosBelt, OVES_CHANNELS, OVES_LANDMARKS } from '../src/oves-world.js';
import { OVES_WILDLIFE_ZONES } from '../src/oves-wildlife.js';
import {
  OVESOS_COUNTRY, VELSORTEN, OVESOS_CANAL, OVESOS_CANAL_LENGTH, OVESOS_BED, OVESOS_FARM_ROWS, OVESOS_FARM_ROW_IDS, OVESOS_FARMSTEADS,
  OVESOS_TURNOUTS, OVESOS_SEED_BENCHES, OVESOS_BUILDINGS, OVESOS_WHEELS, OVESOS_DIVIDER, OVESOS_SQUARE, OVESOS_ORDER_BOARD,
  OVESOS_TENTERS, OVESOS_MAILBOXES, OVESOS_CAMP, OVESOS_SITES, OVESOS_ROADS, OVESOS_PATHS, OVESOS_NPC_STANDS, OVESOS_PEOPLE_IDS,
  OVESOS_FARM_LANDMARKS, ovesosCanalAt, ovesosCanalBeside, ovesosCanalFrame, ovesosCanalProfile, ovesosCanalLift, ovesosFarmHeight,
  ovesosFarmReserved, distanceToOvesosRoad,
} from '../src/ovesos-farm.js';

// Velsorten and its canal for the Farmlands of the Lizeem (the user's design of 5 October 2026 and his ruling of the same day
// that Ovesos is fertile along the river; built 6 October 2026): the contract's ids, the plots in the order of their water
// rights on the real ground, the canal's water never climbing, and nothing standing on anything else. The world is scoped
// to Ovesos (tests/scoped-world.js).
const { createOvesosFarmScenery, OVESOS_CANAL_STATES } = await sourceModule('../src/ovesos-farm-scenery.js');
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const outside = (point, b, clear) => Math.abs(point.x - b.x) > b.w / 2 + clear || Math.abs(point.z - b.z) > b.d / 2 + clear;
/** The bed's footprint whichever way the farming view turns it. */
const BED_HALF = Math.max(OVESOS_BED.across, OVESOS_BED.along) / 2;
const reach = id => OVESOS_FARM_ROWS.filter(row => row.reach === id);
const mean = list => list.reduce((a, b) => a + b, 0) / list.length;
const lizeemDistance = point => Math.min(courseDistance(LIZEEM, point.x, point.z), courseDistance(NETH, point.x, point.z));

/** A build on flat ground: geometry and colliders without a world under them. */
function flatBuild() {
  const parent = new THREE.Group(), colliders = [];
  const result = createOvesosFarmScenery({ parent, heightAt: () => 11, colliders });
  return { parent, colliders, result };
}
const covers = (c, point, clear) => (c.r !== undefined ? gap(c, point) < c.r + clear
  : Math.abs(point.x - c.x) < c.hx + clear && Math.abs(point.z - c.z) < c.hz + clear);

// The built ground, made before any test is declared (scripts/run-tests.cjs runs a file with `--test-isolation=none`, and
// a test declared after a top-level await is never run). Velsorten is built into that world as src/world.js will build
// it, on the world's own ground and into its colliders, unless the world has already built it itself.
const scene = new THREE.Scene();
const world = await scopedWorld(scene, [REGION_IDS.Ovesos]);
const ground = world.groundHeight;
const built = world.ovesosFarm ?? createOvesosFarmScenery({ parent: scene, heightAt: ground, colliders: world.colliders });
const flatColliders = flatBuild().colliders;
const mine = world.colliders.filter(c => flatColliders.some(f => f.kind === c.kind && f.x === c.x && f.z === c.z && f.id === c.id));
const wet = (x, z) => {
  const height = world.heightAt(x, z), surface = westWaterSurface(x, z);
  return (surface !== null && surface > height) || world.waterAt(x, z) > height;
};
/** The nearest water within `limit` metres, by rings, or Infinity. */
function waterWithin(point, limit) {
  for (let r = 0; r <= limit; r += .5) for (let a = 0; a < 24; a++)
    if (wet(point.x + Math.cos(a / 24 * Math.PI * 2) * r, point.z + Math.sin(a / 24 * Math.PI * 2) * r)) return r;
  return Infinity;
}

test('The plots carry exactly the contract’s ids, in seniority order, each with its reach and farmstead', () => {
  const ids = ['head', 'mid', 'tail'].flatMap(name => [1, 2, 3, 4].map(n => `ovesos-${name}-${n}`));
  assert.deepEqual([...OVESOS_FARM_ROW_IDS], ids);
  assert.deepEqual([...OVESOS_FARMSTEADS], ['velsorten-head', 'velsorten-mid', 'velsorten-tail']);
  for (const row of OVESOS_FARM_ROWS) {
    assert.equal(row.country, OVESOS_COUNTRY);
    assert.equal(row.country, 'ovesos');
    const name = row.id.split('-')[1];
    assert.equal(row.reach, name);
    assert.equal(row.farmstead, `velsorten-${name}`);
    assert.ok([row.x, row.z, row.yaw, row.y].every(Number.isFinite), `${row.id} has a place, a facing and a height`);
    assert.equal(typeof row.name, 'string');
  }
  assert.deepEqual([...OVESOS_PEOPLE_IDS].sort(), ['ashnan', 'enbilulu', 'ezina', 'lahar', 'ninkasi', 'nisaba', 'uttu', 'ziusudra']);
  assert.ok(!OVESOS_PEOPLE_IDS.includes('melos'), 'King Melos is spoken of and never placed');
  for (const key of ['divider', 'canalHead', 'mill', 'register', 'brewhouse', 'fullingMill', 'camp', 'wardenHut'])
    assert.ok(Number.isFinite(OVESOS_SITES[key]?.x + OVESOS_SITES[key]?.z), `the site ${key} has a place`);
  assert.equal(OVESOS_ORDER_BOARD.id, 'ovesos-register');
  assert.equal(OVESOS_ORDER_BOARD.keeper, 'nisaba');
  assert.deepEqual(OVESOS_SEED_BENCHES.map(bench => bench.farmId), [...OVESOS_FARMSTEADS]);
  assert.deepEqual(OVESOS_SEED_BENCHES.map(bench => bench.id), OVESOS_FARMSTEADS.map(farm => `${farm}-seed-station`));
  assert.equal(OVESOS_PATHS, OVESOS_ROADS);
});

test('The canal runs down from the divider on the Lizeem’s bank, its water never climbing and never under the ground', () => {
  // The head is on the river: the intake runs from the water's edge to the divider, and the divider is on the bank.
  const intake = OVESOS_DIVIDER.intake;
  assert.ok(waterWithin(intake.from, 2) < Infinity, 'the intake starts at the Lizeem');
  assert.ok(courseDistance(LIZEEM, OVESOS_DIVIDER.x, OVESOS_DIVIDER.z) < 30, 'the divider stands on the Lizeem’s bank');
  assert.ok(gap(OVESOS_CANAL.points[0], OVESOS_DIVIDER) < .5 && gap(OVESOS_SITES.canalHead, OVESOS_DIVIDER) < 12);
  // In the north of the country, where the river runs highest: above the Carica's fall, not below it.
  const nearest = WEST_PROFILES.get(LIZEEM.id).reduce((best, s) => (gap(s, OVESOS_DIVIDER) < gap(best, OVESOS_DIVIDER) ? s : best));
  const below = WEST_PROFILES.get(LIZEEM.id).filter(s => hexOwnerAt(s.x + s.nx * (s.half + 10), s.z + s.nz * (s.half + 10)) === 'Ovesos');
  assert.ok(nearest.surface > Math.max(...below.map(s => s.surface)) - .9, 'the head takes the water where the river is highest');
  assert.ok(OVESOS_DIVIDER.z < Math.min(...OVESOS_FARM_ROWS.map(row => row.z)), 'the divider is north of every plot');
  // It falls toward the Sorten and the dry end: the tail is south and west of the head.
  const tail = OVESOS_CANAL.points.at(-1);
  assert.ok(tail.z - OVESOS_DIVIDER.z > 180 && tail.x > OVESOS_DIVIDER.x - 10 && tail.x < OVESOS_DIVIDER.x + 40);
  const [first, second] = [OVESOS_CANAL.points.at(-3), OVESOS_CANAL.points.at(-1)];
  assert.ok(second.x < first.x && second.z > first.z, 'below the village the canal turns south-west');
  // The water: a quarter of a metre over the ground at the least, never climbing, and the canal carried on a bank
  // across the swale in the north of the country rather than flowing uphill out of it.
  const profile = ovesosCanalProfile(ground);
  let carried = 0;
  for (let i = 0; i < profile.count; i++) {
    assert.ok(profile.water[i] >= profile.ground[i] + OVESOS_CANAL.depth - 1e-9, `the water is under the ground ${i} m down`);
    if (i) assert.ok(profile.water[i] <= profile.water[i - 1] + 1e-9, `the water climbs ${i} m down`);
    assert.ok(profile.bed[i] >= profile.ground[i] - 1e-9 && profile.bed[i] < profile.water[i]);
    if (profile.water[i] - profile.ground[i] > .6) carried++;
  }
  assert.ok(carried > 8 && carried < 40, `${carried} m of the canal is carried on a bank`);
  assert.ok(profile.water[0] - profile.water.at(-1) > 5, 'the canal falls with the plain');
  // The banks are built ground: the crest stands over the ground and the bed is walked in, and both come back to the
  // ground within the canal's reach.
  for (const s of [10, 60, 120, 200]) {
    const crest = ovesosCanalBeside(s, (OVESOS_CANAL.crestIn + OVESOS_CANAL.crestOut) / 2), far = ovesosCanalBeside(s, 6);
    assert.ok(ovesosCanalLift(crest.x, crest.z, ground) > .35, `no bank at ${s} m`);
    assert.equal(ovesosFarmHeight(far.x, far.z, ground), null, `the bank reaches six metres out at ${s} m`);
    const middle = ovesosCanalAt(s);
    assert.ok(Math.abs((ovesosFarmHeight(middle.x, middle.z, ground) ?? ground(middle.x, middle.z)) - profile.at(s).bed) < .05, `the bed at ${s} m`);
  }
  assert.equal(ovesosFarmHeight(-2100, 700, ground), null);
  assert.ok(Math.abs(OVESOS_CANAL_LENGTH - 222.6) < 1);
});

test('The plots lie head, middle and tail down the canal, from the river’s green to the dry end', () => {
  const along = row => ovesosCanalFrame(row.x, row.z).along;
  const turnouts = Object.fromEntries(OVESOS_TURNOUTS.map(t => [t.farmstead, t.along]));
  assert.ok(turnouts['velsorten-head'] < turnouts['velsorten-mid'] && turnouts['velsorten-mid'] < turnouts['velsorten-tail']);
  // The mid and tail plots lie along the canal's west bank in order; the head's are a row across the slope from its turnout.
  for (const name of ['mid', 'tail']) {
    const rows = reach(name);
    rows.forEach((row, n) => {
      const frame = ovesosCanalFrame(row.x, row.z);
      assert.ok(Math.abs(frame.distance - 5.3) < .3, `${row.id} is ${frame.distance.toFixed(2)} m off the canal`);
      const west = ovesosCanalBeside(frame.along, -5.3);
      assert.ok(gap(west, row) < .4, `${row.id} is on the west bank`);
      if (n) assert.ok(along(row) > along(rows[n - 1]) + 3.5, `${row.id} is downstream of ${rows[n - 1].id}`);
    });
  }
  const head = reach('head');
  head.forEach((row, n) => { if (n) assert.ok(gap(row, OVESOS_CANAL.points[0]) > gap(head[n - 1], OVESOS_CANAL.points[0]), `${row.id} is farther from the canal`); });
  assert.ok(ovesosCanalFrame(head[0].x, head[0].z).distance < 8, 'the first head plot is at the turnout');
  assert.ok(Math.max(...head.map(along)) < Math.min(...reach('mid').map(along)) && Math.max(...reach('mid').map(along)) < Math.min(...reach('tail').map(along)));
  // The oldest rights by the river, the newest out at the dry end: distance from the Lizeem and the belt say so.
  const distance = name => mean(reach(name).map(lizeemDistance)), belt = name => mean(reach(name).map(row => ovesosBelt(row.x, row.z)));
  assert.ok(distance('head') < 60 && distance('mid') > 90 && distance('tail') > 140, `${distance('head')}, ${distance('mid')}, ${distance('tail')}`);
  assert.ok(belt('head') > .9 && belt('mid') > .15 && belt('mid') < .6 && belt('tail') < .08, `belt ${belt('head')}, ${belt('mid')}, ${belt('tail')}`);
  // Every bed a pitch from the next and none touching another.
  for (const a of OVESOS_FARM_ROWS) for (const b of OVESOS_FARM_ROWS)
    if (a !== b) assert.ok(gap(a, b) > OVESOS_BED.along + .8, `${a.id} and ${b.id} overlap`);
  for (const farmstead of OVESOS_FARMSTEADS) {
    const rows = OVESOS_FARM_ROWS.filter(row => row.farmstead === farmstead);
    for (let n = 1; n < rows.length; n++) assert.ok(Math.abs(gap(rows[n], rows[n - 1]) - OVESOS_BED.pitch) < .25, `${rows[n].id} is a pitch on`);
    const bench = OVESOS_SEED_BENCHES.find(item => item.farmId === farmstead);
    assert.ok(gap(bench, rows[0]) < 6, `the ${farmstead} bench is by its first plot`);
  }
});

test('The scenery is at most ten batches, a solid collider for every house, and the canal’s water and wheels answer its state', () => {
  const { parent, colliders, result } = flatBuild();
  let meshes = 0, triangles = 0;
  parent.traverse(object => { if (object.isMesh) { meshes++; triangles += object.geometry.attributes.position.count / 3; } });
  assert.ok(meshes <= 10, `${meshes} meshes`);
  assert.equal(meshes, result.metrics.batches);
  assert.ok(triangles < 40000, `${triangles} triangles`);
  for (const b of OVESOS_BUILDINGS) {
    const box = colliders.find(c => c.kind === 'building' && c.id === b.id);
    assert.ok(box, `${b.id} is solid`);
    assert.deepEqual([box.hx, box.hz], [b.w / 2, b.d / 2]);
    assert.ok(box.maxY > box.minY + b.h);
  }
  for (const w of OVESOS_WHEELS) assert.ok(colliders.some(c => c.kind === 'ovesos-wheel' && c.id === w.id), `${w.id} is solid`);
  assert.ok(colliders.some(c => c.kind === 'ovesos-divider' && c.id === OVESOS_DIVIDER.id), 'the divider is solid');
  assert.equal(colliders.filter(c => c.kind === 'farm-seed-bench').length, 3);
  assert.equal(result.metrics.wheels, 2); assert.equal(result.metrics.mailboxes, 3); assert.equal(result.metrics.turnouts, 3);
  assert.equal(result.metrics.buildings, OVESOS_BUILDINGS.length); assert.equal(result.metrics.tents, 2);
  assert.deepEqual(result.labels.userData.labels, ['Ziusudra', 'Ashnan', 'Enbilulu', 'Velsorten']);
  // The canal's state: the water is drawn while a turn runs, and the wheels turn with it and stop when it is dry.
  assert.deepEqual([...OVESOS_CANAL_STATES], ['dry', 'running']);
  assert.equal(result.canal.state(), 'running');
  assert.equal(result.canal.water.visible, true);
  result.update(10); result.update(10.2);
  const turned = result.wheels.map(wheel => wheel.rotation.x);
  assert.ok(turned.every(angle => angle < 0), 'the wheels turn while the water runs');
  assert.equal(result.canal.set('dry'), 'dry');
  assert.equal(result.canal.water.visible, false);
  result.update(10.4);
  assert.deepEqual(result.wheels.map(wheel => wheel.rotation.x), turned, 'and stand still when it is dry');
  assert.throws(() => result.canal.set('flooded'));
  result.canal.set('running');
  assert.equal(result.mapFeatures.length, OVESOS_BUILDINGS.length);
});

test('Nothing is built on top of anything else, and nobody stands on anything', () => {
  const { colliders } = flatBuild();
  for (const a of OVESOS_BUILDINGS) for (const b of OVESOS_BUILDINGS)
    if (a !== b) assert.ok(Math.abs(a.x - b.x) > (a.w + b.w) / 2 + 2 || Math.abs(a.z - b.z) > (a.d + b.d) / 2 + 2, `${a.id} crowds ${b.id}`);
  const props = colliders.filter(c => c.kind !== 'building');
  for (const row of OVESOS_FARM_ROWS) {
    for (const b of OVESOS_BUILDINGS) assert.ok(outside(row, b, BED_HALF + 1), `${row.id} is clear of ${b.id}`);
    for (const c of props) assert.ok(!covers(c, row, BED_HALF + .3), `${row.id} is clear of a ${c.kind}`);
    for (const road of OVESOS_ROADS) assert.ok(distanceToOvesosRoad(road, row.x, row.z) > road.width / 2 + BED_HALF, `${row.id} is off ${road.id}`);
    assert.ok(ovesosCanalFrame(row.x, row.z).distance > OVESOS_CANAL.crestOut + 1 + BED_HALF, `${row.id} is off the canal’s bank`);
  }
  // Every house stands clear of the canal's banks, and no way runs into a house.
  for (const b of OVESOS_BUILDINGS) for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]])
    assert.ok(ovesosCanalFrame(b.x + sx * b.w / 2, b.z + sz * b.d / 2).distance > OVESOS_CANAL.crestOut + 1, `${b.id} stands on the canal’s bank`);
  for (const road of OVESOS_ROADS) for (const b of OVESOS_BUILDINGS) {
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]])
      assert.ok(distanceToOvesosRoad(road, b.x + sx * b.w / 2, b.z + sz * b.d / 2) > road.width / 2 + .5, `${road.id} runs into ${b.id}`);
    for (let i = 1; i < road.points.length; i++) for (let t = 0; t <= 1; t += .05) {
      const a = road.points[i - 1], c = road.points[i], point = { x: a.x + (c.x - a.x) * t, z: a.z + (c.z - a.z) * t };
      assert.ok(outside(point, b, road.width / 2 + .3), `${road.id} crosses ${b.id}`);
    }
  }
  for (const [id, stand] of Object.entries(OVESOS_NPC_STANDS)) {
    for (const b of OVESOS_BUILDINGS) assert.ok(outside(stand, b, 1), `${id} is a metre clear of ${b.id}`);
    for (const c of props) assert.ok(!covers(c, stand, .5), `${id} is not standing in a ${c.kind}`);
    for (const row of OVESOS_FARM_ROWS) assert.ok(gap(stand, row) > BED_HALF + .6, `${id} is off ${row.id}`);
    for (const other of Object.entries(OVESOS_NPC_STANDS)) if (other[0] !== id) assert.ok(gap(stand, other[1]) > 3, `${id} and ${other[0]}`);
    assert.ok(ovesosCanalFrame(stand.x, stand.z).distance > OVESOS_CANAL.crestOut + 1, `${id} stands on the canal’s bank`);
    assert.ok(Number.isFinite(stand.yaw), `${id} faces somewhere`);
  }
  for (const m of OVESOS_MAILBOXES) {
    const home = OVESOS_BUILDINGS.find(b => b.id === m.home);
    assert.ok(home && gap(m, home) < 12, `${m.name}’s mailbox is at ${m.home}`);
    assert.ok(outside(m, home, .6), `${m.name}’s mailbox stands clear of the wall`);
    assert.ok(OVESOS_ROADS.every(road => distanceToOvesosRoad(road, m.x, m.z) > road.width / 2 + .4), `${m.name}’s mailbox is beside the way, not on it`);
  }
  // The reserve keeps scatter off what is built and nowhere else.
  for (const b of OVESOS_BUILDINGS) assert.ok(ovesosFarmReserved(b.x, b.z));
  for (const row of OVESOS_FARM_ROWS) assert.ok(ovesosFarmReserved(row.x, row.z));
  for (const s of [0, 50, 150, 222]) { const c = ovesosCanalAt(s); assert.ok(ovesosFarmReserved(c.x, c.z)); }
  assert.ok(ovesosFarmReserved(OVESOS_CAMP.x, OVESOS_CAMP.z) && ovesosFarmReserved(OVESOS_SQUARE.x, OVESOS_SQUARE.z));
  assert.ok(!ovesosFarmReserved(-2100, 700) && !ovesosFarmReserved(-1800, 800) && !ovesosFarmReserved(-1500, 600));
});

// ---------------------------------------------------------------------------
// On the built ground
// ---------------------------------------------------------------------------
test('Every bed and every stand is walkable ground in Ovesos above the water, and every bed lies level', () => {
  for (const row of OVESOS_FARM_ROWS) {
    assert.equal(hexOwnerAt(row.x, row.z), 'Ovesos');
    assert.ok(canStand(row.x, row.z, world, .45), `${row.id} has footing`);
    assert.ok(waterWithin(row, 4) === Infinity, `${row.id} is above the water`);
    assert.ok(Math.abs(world.heightAt(row.x, row.z) - row.y) < .05, `${row.id} is laid at ${row.y}, the ground is ${world.heightAt(row.x, row.z).toFixed(2)}`);
    // The plain tilts toward the Oveth, so a bed falls a hand across, and no more.
    const corners = [[-1.4, -1.55], [1.4, -1.55], [-1.4, 1.55], [1.4, 1.55]].map(([u, v]) => world.heightAt(
      row.x + u * Math.cos(row.yaw) + v * Math.sin(row.yaw), row.z - u * Math.sin(row.yaw) + v * Math.cos(row.yaw)));
    assert.ok(Math.max(...corners) - Math.min(...corners) < .2, `${row.id} tilts ${(Math.max(...corners) - Math.min(...corners)).toFixed(2)} m`);
  }
  for (const [id, stand] of Object.entries(OVESOS_NPC_STANDS)) {
    assert.equal(hexOwnerAt(stand.x, stand.z), 'Ovesos', `${id} stands in Ovesos`);
    assert.ok(canStand(stand.x, stand.z, world, .45), `${id} has footing at ${stand.x}, ${stand.z}`);
    assert.ok(waterWithin(stand, 4) === Infinity, `${id} is four metres from water`);
    for (const c of world.colliders) if (c.kind === 'building') assert.ok(
      Math.abs(stand.x - c.x) > c.hx + 1 || Math.abs(stand.z - c.z) > c.hz + 1, `${id} is a metre clear of ${c.id ?? c.kind}`);
  }
  // The pads: in Ovesos, off the water, and at least 160 m from the Gala border (tests/oves-world.test.js's seam).
  for (const b of OVESOS_BUILDINGS) {
    assert.equal(hexOwnerAt(b.x, b.z), 'Ovesos');
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const corner = { x: b.x + sx * b.w / 2, z: b.z + sz * b.d / 2 };
      assert.ok(waterWithin(corner, 6) === Infinity, `${b.id} keeps off the water`);
      assert.ok(galaSeamDistance(corner.x, corner.z) >= 160, `${b.id} is ${galaSeamDistance(corner.x, corner.z).toFixed(0)} m from Gala`);
    }
  }
  assert.ok(galaSeamDistance(VELSORTEN.x, VELSORTEN.z) >= 160 && hexOwnerAt(VELSORTEN.x, VELSORTEN.z) === 'Ovesos');
  for (const landmark of OVESOS_FARM_LANDMARKS) {
    assert.equal(hexOwnerAt(landmark.x, landmark.z), 'Ovesos', `${landmark.id} is charted in Ovesos`);
    assert.ok(landmark.description.length > 60 && !OVES_LANDMARKS.some(place => place.id === landmark.id));
  }
});

test('Each of them is where the design puts them', () => {
  const S = OVESOS_NPC_STANDS, building = id => OVESOS_BUILDINGS.find(b => b.id === id);
  assert.ok(gap(S.enbilulu, OVESOS_DIVIDER) < 8, 'Enbilulu keeps the divider');
  assert.ok(gap(S.enbilulu, building('enbilulu-hut')) < 12 && gap(building('enbilulu-hut'), OVESOS_DIVIDER) < 16, 'his hut is at the head');
  assert.ok(gap(S.nisaba, building('velsorten-register')) < 9 && gap(S.nisaba, OVESOS_ORDER_BOARD) < 6, 'Nisaba keeps the register and its board');
  assert.ok(gap(S.ziusudra, building('ziusudra-house')) < 10, 'Ziusudra is at his house');
  assert.ok(gap(building('ziusudra-house'), OVESOS_DIVIDER) < 45 && gap(S.ziusudra, reach('head').at(-1)) < 10, 'the oldest house is by the head plots');
  assert.ok(gap(S.ashnan, reach('tail').at(-1)) < 8, 'Ashnan is at the tail plots');
  assert.ok(gap(building('ashnan-house'), reach('tail')[0]) < 25, 'her house is at the canal’s tail');
  assert.ok(gap(S.lahar, OVESOS_CAMP) < 6 && gap(OVESOS_CAMP, { x: -2050, z: 592 }) < 10, 'Lahar is at his camp on the upland grass');
  assert.ok(gap(S.ezina, building('velsorten-mill')) < 7, 'Ezina is at her mill');
  assert.ok(gap(S.ninkasi, building('velsorten-brewhouse')) < 9, 'Ninkasi is at her brewhouse');
  assert.ok(gap(S.uttu, OVESOS_TENTERS[0]) < 5 && gap(S.uttu, building('velsorten-fulling-mill')) < 9, 'Uttu is at his tenters by the fulling mill');
  // The mills are on the canal: each wheel stands in its channel, beside its own mill's wall.
  for (const w of OVESOS_WHEELS) {
    assert.ok(ovesosCanalFrame(w.x, w.z).distance < .2, `${w.id} is in the canal`);
    const mill = building(w.mill);
    assert.ok(Math.abs(Math.abs(w.wall - mill.x) - mill.w / 2) < .01 && Math.abs(w.z - mill.z) < mill.d / 2, `${w.id} turns into ${w.mill}’s wall`);
  }
  // The village is the terrace the design names, and the region's own arrival point is in its square.
  const ovesos = regions.find(region => region.name === 'Ovesos');
  assert.ok(gap(VELSORTEN, { x: -1870, z: 705 }) < 30);
  assert.ok(ovesos.spawn.x > OVESOS_SQUARE.minX - 2 && ovesos.spawn.x < OVESOS_SQUARE.maxX && ovesos.spawn.z > OVESOS_SQUARE.minZ && ovesos.spawn.z < OVESOS_SQUARE.maxZ, 'the arrival is in the square');
});

test('The ways are walked from the Neth ford to the square and on to Ashnan’s door, and every one stays in Ovesos', () => {
  const way = OVESOS_ROADS.find(road => road.id === 'velsorten-way');
  const ford = WEST_PROFILES.get(NETH.id).filter(sample => sample.ford);
  assert.ok(ford.some(sample => gap(sample, way.points[0]) < 12), 'the way begins at the Neth’s ford');
  assert.ok(gap(way.points.at(-1), OVESOS_SQUARE) < 6, 'and ends in the square');
  assert.ok(way.points.some(point => gap(point, OVESOS_CAMP) < 20), 'past Lahar’s camp');
  assert.ok(way.points.some(point => gap(point, OVESOS_DIVIDER) < 8), 'and over the canal at its head');
  const tail = OVESOS_ROADS.find(road => road.id === 'velsorten-tail-path'), ashnan = OVESOS_BUILDINGS.find(b => b.id === 'ashnan-house');
  assert.ok(gap(tail.points.at(-1), ashnan) < 7);
  for (const road of OVESOS_ROADS) for (let i = 1; i < road.points.length; i++) {
    const a = road.points[i - 1], b = road.points[i], n = Math.ceil(gap(a, b) / 2);
    for (let k = 0; k <= n; k++) {
      const x = a.x + (b.x - a.x) * k / n, z = a.z + (b.z - a.z) * k / n;
      assert.ok(canStand(x, z, world, .34), `${road.id} is blocked at ${x.toFixed(1)}, ${z.toFixed(1)}`);
      assert.equal(hexOwnerAt(x, z), 'Ovesos', `${road.id} leaves Ovesos at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    }
  }
  // Built into the world once.
  assert.ok(built.root.parent && built.metrics.buildings === OVESOS_BUILDINGS.length, 'built into the world');
  assert.equal(mine.length, flatColliders.length, 'every collider the farm makes is in the world, once');
});

test('Velsorten leaves free every place Ovesos’s animals live, the dry channels and the arrival, and the belt’s trees leave it free', () => {
  for (const zone of OVES_WILDLIFE_ZONES.filter(item => item.region === 'Ovesos' && !item.air)) for (const [x, z] of zone.sites) {
    assert.ok(!mine.some(c => covers(c, { x, z }, zone.radius + .5)), `${zone.id} keeps its home at ${x}, ${z}`);
    assert.ok(canStand(x, z, world, zone.radius) || zone.float, `${zone.id} still finds footing at ${x}, ${z}`);
  }
  // tests/oves-world.test.js walks down the middle of every dry channel and puts the traveler at the region's spawn.
  for (const ch of OVES_CHANNELS) {
    const middle = ch.points[Math.floor(ch.points.length / 2)];
    assert.ok(!ovesosFarmReserved(middle.x, middle.z, 2) && canStand(middle.x, middle.z, world, .5), `${ch.id} is clear`);
  }
  const spawn = regions.find(region => region.name === 'Ovesos').spawn;
  assert.ok(!mine.some(c => covers(c, spawn, 1)) && canStand(spawn.x, spawn.z, world, .5), 'the arrival is clear');
  // The belt's planting (src/oves-scenery.js) keeps off the village, its canal and its plots.
  const planted = world.colliders.filter(c => c.kind === 'oves-tree' || c.kind === 'oves-scrub');
  assert.ok(planted.length > 40);
  for (const c of planted) assert.ok(!ovesosFarmReserved(c.x, c.z, .5), `a ${c.kind} grows on Velsorten’s ground at ${c.x.toFixed(1)}, ${c.z.toFixed(1)}`);
  assert.ok(world.ovesMetrics?.beltTrees === undefined || world.ovesMetrics.beltTrees > 20, 'the belt has its trees');
});
