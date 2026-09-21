import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import {
  RENA, APPLEGARTH, RENA_ROAD, RENA_RUINS, RENA_JUNCTION, RENA_EAST_GATE, RENA_WEST_GATE,
  APPLEGARTH_BUILDINGS, APPLEGARTH_WORKS, APPLEGARTH_EAST, APPLEGARTH_WEST,
  RENA_LANDMARKS, RENA_CLEARINGS, RENA_STANDS, RENA_SIGNS, DRENT_DEEP_PLACES, EAST_RENA_STONE,
  renaPoint, applePoint, OLD_ROAD_WEST, OLD_ROAD_ACROSS,
} from '../src/rena.js';
import { RENA_NPCS } from '../src/rena-people.js';
import { LORN_ID, HESTA_ID } from '../src/rena-letters.js';
import { LEGION_POSTS } from '../src/legion-posts.js';
import { JOURNEY_NPCS } from '../src/journey-content.js';
import { TOWN_LIFE_NPCS } from '../src/town-life.js';
import { SUBREGIONS, subregion, subregionsAt } from '../src/map-fog.js';
import { hexOwnerAt, insideRegion, landDistance, MAIN_ROAD, VILLAGE, worldToVillage } from '../src/region-world.js';
import { validateWoodlandProgress } from '../src/woodland-progress.js';

const { createWorld } = await sourceModule('../src/world.js');
const { SIGN_LABELS } = await sourceModule('../src/signs.js');
const world = createWorld(new THREE.Scene());

const NEW_KINDS = /^(rena-|applegarth-|drove-|tollhouse|pedlars-stone|lorn-)/;
const lineDistance = (points, x, z) => {
  let best = Infinity;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - a.x - dx * t, z - a.z - dz * t));
  }
  return best;
};
const gapTo = (collider, x, z) => (collider.r !== undefined
  ? Math.hypot(collider.x - x, collider.z - z) - collider.r
  : Math.hypot(Math.max(0, Math.abs(collider.x - x) - collider.hx), Math.max(0, Math.abs(collider.z - z) - collider.hz)));

test('the ruins and the village stand on Drent’s own ground, inland, and well clear of the main road', () => {
  for (const [name, place] of [['Rena', RENA.centre], ['Applegarth', APPLEGARTH.centre]]) {
    assert.equal(hexOwnerAt(place.x, place.z), 'Drent', `${name} is in Drent`);
    assert.ok(insideRegion('Drent', place.x, place.z), `${name} is inside Drent's own outline`);
    assert.ok(landDistance(place.x, place.z) > 60, `${name} is well inland, not on a shore`);
    assert.ok(lineDistance(MAIN_ROAD, place.x, place.z) > 60, `${name} is a walk off the main road, not beside it`);
  }
  // Rena is at Drent's centre; Applegarth is west of it; Tidehaven is east of both.
  assert.ok(APPLEGARTH.centre.x < RENA.centre.x - 120, 'Applegarth is west of the ruins');
  assert.ok(VILLAGE.x > RENA.centre.x + 300, 'Tidehaven is east of the ruins');
  const drent = world.regions.find(region => region.name === 'Drent');
  const midX = (drent.bounds.minX + drent.bounds.maxX) / 2, midZ = (drent.bounds.minZ + drent.bounds.maxZ) / 2;
  assert.ok(Math.hypot(RENA.centre.x - midX, RENA.centre.z - midZ) < 130, 'the ruins lie at the centre of the region');
  // The frame is a proper right-handed pair, and +b is north.
  assert.ok(Math.abs(OLD_ROAD_WEST.x * OLD_ROAD_ACROSS.x + OLD_ROAD_WEST.z * OLD_ROAD_ACROSS.z) < 1e-12);
  assert.ok(applePoint(0, 10).z < APPLEGARTH.centre.z, 'across the street, +b is north');
  assert.ok(renaPoint(10, 0).x < RENA.centre.x, 'along the street, +a is west');
});

test('nothing this pass builds stands on the main road, the Suval branch or the old road itself', () => {
  const added = world.colliders.filter(collider => NEW_KINDS.test(collider.kind ?? ''));
  assert.ok(added.length > 250, `the pass adds its colliders (${added.length})`);
  for (const collider of added) {
    const reach = collider.r ?? Math.min(collider.hx, collider.hz);
    for (const [name, road, half] of [['the main road', world.paths[0], 2.1], ['the Suval branch', world.suvalRoute, 1.7], ['the old Rena road', world.renaRoute, 1.3]]) {
      const clearance = lineDistance(road, collider.x, collider.z) - reach;
      assert.ok(clearance >= half - .15, `${collider.kind} at ${collider.x.toFixed(1)}, ${collider.z.toFixed(1)} is ${clearance.toFixed(2)} m from ${name}`);
    }
  }
});

test('the old road leaves the main road, runs through the ruins and reaches Applegarth, and can be walked the whole way', () => {
  const road = world.renaRoute;
  assert.ok(road && road.length === RENA_ROAD.length, 'the world carries the old road as a path');
  assert.ok(world.paths.some(path => path.length === road.length && Math.hypot(path[0].x - road[0].x, path[0].z - road[0].z) < .01), 'it is a drawn path, not only a list');
  assert.ok(lineDistance(MAIN_ROAD, RENA_JUNCTION.x, RENA_JUNCTION.z) < .2, 'it forks off the main road');
  for (const gate of [RENA_EAST_GATE, RENA_WEST_GATE, APPLEGARTH_EAST, APPLEGARTH_WEST])
    assert.ok(road.some(point => Math.hypot(point.x - gate.x, point.z - gate.z) < .01), 'the road runs in at one gate and out at the other');
  let length = 0;
  for (let i = 1; i < road.length; i++) {
    const a = road[i - 1], b = road[i], steps = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.z - a.z)));
    length += Math.hypot(b.x - a.x, b.z - a.z);
    for (let k = 0; k <= steps; k++) {
      const x = a.x + (b.x - a.x) * k / steps, z = a.z + (b.z - a.z) * k / steps;
      assert.ok(canStand(x, z, world, .45), `the old road is blocked at ${x.toFixed(1)}, ${z.toFixed(1)}`);
      assert.equal(hexOwnerAt(x, z), 'Drent', 'the old road never leaves Drent');
    }
  }
  assert.ok(length > 300 && length < 600, `the walk between the two of them is a real one (${length.toFixed(0)} m)`);
});

test('Rena reads as a town that was killed: a street to walk, rooms to walk into, a well, a row of graves and an orchard gone wild', () => {
  assert.ok(RENA_RUINS.plots.length >= 8, 'a town, not a hamlet');
  assert.equal(new Set(RENA_RUINS.plots.map(plot => plot.id)).size, RENA_RUINS.plots.length);
  // The street is walkable from end to end, and every plot stands clear of it.
  for (let a = RENA_RUINS.street.from; a <= RENA_RUINS.street.to; a += 2) {
    const spot = renaPoint(a, 0);
    assert.ok(canStand(spot.x, spot.z, world, .45), `the old street is blocked at a = ${a}`);
  }
  for (const plot of RENA_RUINS.plots) {
    assert.ok(Math.abs(plot.b) - plot.depth / 2 > RENA_RUINS.street.half, `${plot.id} stands back from the street`);
    // Every room can be stood in: the footings are walls with a doorway, not a solid block.
    assert.ok(canStand(plot.x, plot.z, world, .4), `${plot.id} cannot be walked into`);
  }
  assert.ok(canStand(RENA_RUINS.hall.x, RENA_RUINS.hall.z, world, .4), 'the hall’s floor can be stood on');
  // The well holds water and is solid; the gate has one pier standing and one down.
  assert.ok(world.colliders.some(collider => collider.kind === 'rena-well'), 'the well is a real well');
  assert.equal(world.colliders.filter(collider => collider.kind === 'rena-gate-pier').length, 2);
  assert.equal(RENA_RUINS.graves.length, 16);
  assert.ok(RENA_RUINS.graves.every(grave => grave.z !== RENA.centre.z), 'the row lies off the street');
  assert.ok(RENA_RUINS.orchard.length >= 20, 'the orchard is an orchard');
  // The orchard is west of the graves, so neither grows through the other.
  const orchardEast = Math.max(...RENA_RUINS.orchard.map(tree => tree.x));
  const graveWest = Math.min(...RENA_RUINS.graves.map(grave => grave.x));
  assert.ok(orchardEast < graveWest + 2, 'the orchard and the row keep apart');
  // The bound stone at the gate is lettered in the game's own sign language, with both old names on it.
  const stones = world.roadSigns.filter(sign => sign.kind === 'border' && /Rena/.test(sign.label));
  assert.ok(stones.some(sign => sign.label === 'Rena' && sign.returnLabel === 'East Rena'), 'Rena’s own bound stone names East Rena behind it');
  assert.ok(stones.some(sign => sign.label === 'East Rena'), 'and the Greenway keeps a stone cut East Rena');
  assert.ok(world.roadSigns.some(sign => sign.label === 'Westerina'), 'Applegarth’s stone has never been recut');
  for (const label of ['Rena', 'East Rena', 'Westerina', 'Applegarth', 'The Ruins of Rena']) assert.ok(SIGN_LABELS.includes(label), label);
});

test('Applegarth is a village of ten roofs with its own works, none of them growing through another', () => {
  assert.ok(APPLEGARTH_BUILDINGS.length >= 8 && APPLEGARTH_BUILDINGS.length <= 12, `eight to twelve buildings (${APPLEGARTH_BUILDINGS.length})`);
  assert.equal(new Set(APPLEGARTH_BUILDINGS.map(building => building.id)).size, APPLEGARTH_BUILDINGS.length);
  for (const building of APPLEGARTH_BUILDINGS) {
    assert.equal(hexOwnerAt(building.x, building.z), 'Drent', building.id);
    assert.ok(Math.abs(building.b) - building.depth / 2 > 4, `${building.id} stands back from the road`);
    for (const other of APPLEGARTH_BUILDINGS) {
      if (other === building) continue;
      const gap = Math.hypot(other.x - building.x, other.z - building.z) - (building.width + other.width) / 2;
      assert.ok(gap > 0, `${building.id} and ${other.id} overlap`);
    }
    assert.ok(world.colliders.some(collider => collider.kind === `applegarth-${building.id}`), `${building.id} is solid`);
  }
  assert.ok(world.colliders.some(collider => collider.kind === 'applegarth-well'));
  assert.ok(APPLEGARTH_WORKS.orchard.length >= 20, 'the village keeps its own orchard');
  assert.ok(APPLEGARTH_WORKS.orchard.every(tree => applePointAcross(tree) < -20), 'the orchard is south of the road');
  function applePointAcross(point) {
    const dx = point.x - APPLEGARTH.centre.x, dz = point.z - APPLEGARTH.centre.z;
    return dx * OLD_ROAD_ACROSS.x + dz * OLD_ROAD_ACROSS.z;
  }
  // No tree of the regional scatter grows through anything built here.
  const trees = world.colliders.filter(collider => collider.kind === 'region-tree');
  for (const built of world.colliders.filter(collider => /^(applegarth-(house|ardry|press|apple|byre|store)|rena-footing|rena-hall|tollhouse)/.test(collider.kind ?? '')))
    for (const tree of trees) assert.ok(gapTo(built, tree.x, tree.z) - tree.r > -.05, `a tree grows through ${built.kind}`);
});

test('the ten new people stand on walkable ground in Drent, clear of everyone who was already there', () => {
  assert.equal(RENA_NPCS.length, Object.keys(RENA_STANDS).length);
  const ours = new Set(RENA_NPCS.map(npc => npc.id));
  for (const npc of RENA_NPCS) {
    const stand = RENA_STANDS[npc.id];
    assert.ok(stand, `${npc.id} has a stand`);
    assert.deepEqual({ x: world.npcPositions[npc.id].x, z: world.npcPositions[npc.id].z }, { x: stand.x, z: stand.z }, `${npc.id} stands where the world puts it`);
    assert.ok(canStand(stand.x, stand.z, world, .45), `${npc.id} has footing`);
    assert.equal(hexOwnerAt(stand.x, stand.z), 'Drent', `${npc.id} is in Drent`);
    // Everyone already standing anywhere: the world's own stands, and the ones main.js adds from their modules.
    const standing = [...Object.entries(world.npcPositions).map(([id, p]) => ({ id, ...p })),
      ...LEGION_POSTS, ...TOWN_LIFE_NPCS, ...JOURNEY_NPCS.map(person => ({ ...person, ...world.npcPositions[person.id] }))];
    for (const other of standing) {
      if (other.id === npc.id || !Number.isFinite(other.x)) continue;
      const gap = Math.hypot(other.x - stand.x, other.z - stand.z);
      assert.ok(gap >= (ours.has(other.id) ? 3 : 4), `${npc.id} crowds ${other.id} (${gap.toFixed(1)} m)`);
    }
  }
  // Lorn is in Tidehaven and Hesta is at Applegarth, so the road between them is a real walk.
  const lorn = RENA_STANDS[LORN_ID], hesta = RENA_STANDS[HESTA_ID];
  const local = worldToVillage(lorn.x, lorn.z);
  assert.ok(Math.abs(local.x) < 112 && local.z < 60, 'Lorn stands inside Tidehaven’s own ground');
  assert.ok(Math.hypot(hesta.x - APPLEGARTH.centre.x, hesta.z - APPLEGARTH.centre.z) < APPLEGARTH.radius, 'Hesta stands in Applegarth');
  assert.ok(Math.hypot(lorn.x - hesta.x, lorn.z - hesta.z) > 450, 'they live a long way apart');
});

test('nothing this pass puts in Tidehaven stands in a bird’s home ground or in front of an army post', async () => {
  // A stand inside a habitat takes perches away from the birds that live there
  // (habitatSpots drops any spot within 1.6 m of a stand), and the traveler
  // cannot talk to a post he cannot walk up to.
  const { BIRD_HABITATS, habitatSpots } = await sourceModule('../src/drent-birds.js');
  for (const npc of RENA_NPCS) {
    const stand = RENA_STANDS[npc.id];
    for (const habitat of BIRD_HABITATS) {
      const centre = habitatSpots(habitat, world).center;
      const gap = Math.hypot(centre.x - stand.x, centre.z - stand.z) - habitat.radius;
      assert.ok(gap > 1.6, `${npc.id} stands in the ${habitat.id} birds’ ground (${gap.toFixed(1)} m clear)`);
    }
  }
  // And nothing this pass builds — props included — blocks an army post's stand.
  const ours = world.colliders.filter(collider => NEW_KINDS.test(collider.kind ?? ''));
  for (const post of LEGION_POSTS) {
    assert.ok(canStand(post.x, post.z, world, .45), `${post.name} stands on solid ground`);
    for (const collider of ours) assert.ok(gapTo(collider, post.x, post.z) > .6, `${collider.kind} crowds ${post.name}`);
  }
});

test('every new stand can be walked to from a road', () => {
  const step = 1.5, key = (x, z) => `${Math.round(x / step)},${Math.round(z / step)}`;
  const roads = [world.paths[0], world.renaRoute];
  const nearestRoadPoint = (x, z) => {
    let best = null, bestDistance = Infinity;
    for (const road of roads) for (let i = 1; i < road.length; i++) {
      const a = road[i - 1], b = road[i], dx = b.x - a.x, dz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
      const px = a.x + dx * t, pz = a.z + dz * t, d = Math.hypot(x - px, z - pz);
      if (d < bestDistance) { bestDistance = d; best = { x: px, z: pz }; }
    }
    return best;
  };
  for (const npc of RENA_NPCS) {
    const stand = RENA_STANDS[npc.id], start = nearestRoadPoint(stand.x, stand.z);
    const limit = Math.hypot(start.x - stand.x, start.z - stand.z) + 45;
    const seen = new Set([key(start.x, start.z)]), queue = [start];
    let reached = false;
    for (let i = 0; i < queue.length && !reached && i < 60000; i++) {
      const { x, z } = queue[i];
      if (Math.hypot(x - stand.x, z - stand.z) < 2) { reached = true; break; }
      for (const [nx, nz] of [[x + step, z], [x - step, z], [x, z + step], [x, z - step]]) {
        const k = key(nx, nz);
        if (seen.has(k) || Math.hypot(nx - stand.x, nz - stand.z) > limit) continue;
        seen.add(k);
        if (canStand(nx, nz, world, .45)) queue.push({ x: nx, z: nz });
      }
    }
    assert.ok(reached, `${npc.id} cannot be reached from a road`);
  }
});

test('the chart names Tidehaven, with Eastreena as its old name, and adds the ruins and Applegarth without overlapping anything', () => {
  const village = subregion('eastreena');
  assert.ok(village, 'the id is kept so older charts still load');
  assert.equal(village.name, 'Tidehaven', 'the chart says Tidehaven');
  assert.match(village.note, /Eastreena/, 'and keeps Eastreena as the old name in its note');
  for (const area of SUBREGIONS) {
    assert.doesNotMatch(area.name, /Eastreena/, `${area.id} does not use the old name as a title`);
    assert.equal(hexOwnerAt(area.x, area.z), area.region, `${area.name} stands in ${area.region}`);
    assert.ok(area.radius >= 28 && area.radius <= 130, area.id);
  }
  for (const area of SUBREGIONS) for (const other of SUBREGIONS) {
    if (area === other) continue;
    const gap = Math.hypot(area.x - other.x, area.z - other.z);
    assert.ok(gap > Math.max(area.radius, other.radius) * .6, `${area.id} and ${other.id} are ${gap.toFixed(0)} m apart`);
  }
  for (const id of ['rena', 'applegarth']) {
    const area = subregion(id);
    assert.ok(area, `${id} is on the chart`);
    assert.equal(area.region, 'Drent');
    assert.ok(area.note.length > 40, `${id} says what it is`);
  }
  assert.match(subregion('rena').note, /Rena/);
  assert.match(subregion('applegarth').note, /Westerina/);
  assert.deepEqual(subregionsAt(RENA.centre.x, RENA.centre.z).map(area => area.id), ['rena']);
  assert.deepEqual(subregionsAt(APPLEGARTH.centre.x, APPLEGARTH.centre.z).map(area => area.id), ['applegarth']);
});

test('every place this pass adds can be discovered, in Drent, with nothing in it to fight', () => {
  const ids = world.landmarks.map(landmark => landmark.id);
  assert.equal(new Set(ids).size, ids.length, 'landmark ids stay unique');
  for (const place of RENA_LANDMARKS) {
    assert.ok(ids.includes(place.id), `${place.id} can be discovered`);
    assert.ok(place.description.length > 60, `${place.id} has discovery text`);
    assert.doesNotMatch(place.description, /goblin/i);
    assert.equal(hexOwnerAt(place.x, place.z), 'Drent', place.id);
    assert.ok(canStand(place.x, place.z, world, .3) || world.colliders.some(collider => gapTo(collider, place.x, place.z) < 6), `${place.id} is somewhere`);
  }
  assert.equal(DRENT_DEEP_PLACES.length, 3, 'three more small places on the road that already ran there');
  for (const place of DRENT_DEEP_PLACES) assert.ok(lineDistance(MAIN_ROAD, place.x, place.z) > 6, `${place.id} is beside the road, not on it`);
  assert.match(EAST_RENA_STONE.description, /EAST RENA/);
  assert.equal(RENA_SIGNS.length, 2);
  for (const sign of RENA_SIGNS) assert.ok(SIGN_LABELS.includes(sign.label) && SIGN_LABELS.includes(sign.backLabel), sign.label);
  // Every landmark in the game still fits in a checkpoint's discovery list.
  const camp = { version: 1, taught: false, catches: 0, fires: Object.fromEntries(world.firePits.map(fire => [fire.id, 0])) };
  assert.ok(validateWoodlandProgress({ version: 1, acornStatus: 'available', practiceHits: 0, practiceDodges: 0,
    acorns: [], sticks: [], fruits: [], discoveries: ids, camp }, new Map()), `${ids.length} landmarks still fit a save`);
  assert.ok(RENA_CLEARINGS.length > 10, 'the scatter is kept off all of it');
});
