import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import * as THREE from '../vendor/three.module.js';
import { canStand, moveCharacter } from '../src/game-state.js';
import {
  regions, regionAt, northernRoad, regionNpcPositions, journeySites, regionRepairBenches,
  SUVAL_ROAD, CALOSS, FRONTIER, ANCHORS, WORLD_BOUNDS, insideRegion,
} from '../src/regions.js';
import { toWorld, WORLD_SCALE, METRES_PER_HEX } from '../src/world-scale.js';

const { createWorld } = await sourceModule('../src/world.js');
const scene = new THREE.Scene(), world = createWorld(scene);

test('The four authored regions carry the atlas into the world, with Drent on the coast', () => {
  assert.deepEqual(regions.map(r => r.id), [1, 2, 3, 4]);
  assert.deepEqual(regions.map(r => r.name), ['Drent', 'Luscia', 'Moros Plain', 'East Suval']);
  for (const [name, anchor] of [['Drent', ANCHORS.drentHeart], ['Luscia', ANCHORS.lauvelField],
    ['Moros Plain', ANCHORS.legionCamp], ['East Suval', ANCHORS.suvalHills]]) {
    assert.equal(regionAt(anchor.x, anchor.z).name, name, `${name} claims its own heart`);
    assert.ok(insideRegion(name, anchor.x, anchor.z), `${name} contains its anchor by hex outline`);
  }
  assert.equal(regionAt(0, Number.NaN), null);
  // Off the authored hexes the nearest district still answers, so charts and
  // the traversal always have a district to name.
  assert.equal(regionAt(5000, 5000).id, regions.some(r => r.id === regionAt(5000, 5000).id) ? regionAt(5000, 5000).id : 0);
  assert.equal(insideRegion('Drent', 5000, 5000), false);
  // Drent is far larger than the 190 m strip it replaces, and every region has
  // a real polygon, not a Z band.
  const drent = regions[0];
  assert.ok(drent.bounds.maxX - drent.bounds.minX > 6.8 * METRES_PER_HEX, 'Drent is wider than the old Eastreena');
  for (const region of regions) {
    assert.ok(region.outline.length >= 1 && region.outline[0].length >= 6, `${region.name} has an outline`);
    assert.ok(region.border[0].length === region.outline[0].length * 4, `${region.name} has a softened chart border`);
    assert.equal(regionAt(region.spawn.x, region.spawn.z).id, region.id, `${region.name} spawns inside itself`);
  }
  assert.equal(world.bounds.minX, WORLD_BOUNDS.minX);
  assert.equal(world.bounds.maxZ, WORLD_BOUNDS.maxZ);
  assert.equal(world.border.open, true);
  assert.ok(canStand(world.border.barrierX, world.border.z, world), 'the Caloss Gate stands open');
  assert.equal(canStand(WORLD_BOUNDS.minX - 1, ANCHORS.legionCamp.z, world), false, 'the world edge is enforced');
});

test('The whole road out of Drent is walkable in both directions, including the Caloss bridge', () => {
  const walk = route => {
    const p = { x: route[0].x, z: route[0].z };
    assert.ok(canStand(p.x, p.z, world), `road start blocked at ${p.x}, ${p.z}`);
    for (const target of route) {
      moveCharacter(p, target.x - p.x, target.z - p.z, world);
      assert.ok(Math.hypot(p.x - target.x, p.z - target.z) < 1,
        `Blocked road at ${target.x}, ${target.z}; reached ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`);
      p.x = target.x; p.z = target.z;
    }
  };
  walk(northernRoad); walk([...northernRoad].reverse());
  walk(SUVAL_ROAD); walk([...SUVAL_ROAD].reverse());
  for (const point of [...northernRoad, ...SUVAL_ROAD]) assert.ok(canStand(point.x, point.z, world, .5), `road point ${point.x}, ${point.z}`);
  // East Suval's stone country stands well above the Caloss hollow. Relief is a
  // wave field, so this weighs the hills as a whole rather than one sample that
  // may land in a dip.
  const hills = [[0, 0], [40, 0], [-40, 0], [0, 40], [0, -40]]
    .map(([dx, dz]) => world.heightAt(ANCHORS.suvalHills.x + dx, ANCHORS.suvalHills.z + dz));
  assert.ok(hills.reduce((sum, y) => sum + y, 0) / hills.length > world.heightAt(CALOSS.crossing.x, CALOSS.crossing.z) + 5,
    'East Suval rises above the border river');
  assert.equal(world.regionAt(ANCHORS.morosGate.x, ANCHORS.morosGate.z).id, 3);
});

test('Every NPC, activity, pickup, repair bench and firepit has a clear reachable approach', () => {
  const objectives = [...Object.values(regionNpcPositions), ...Object.values(journeySites),
    ...regionRepairBenches, ...world.firePits, world.fishingSpots[1].fishingSpot];
  for (const target of objectives) assert.ok(canStand(target.x, target.z, world, .48), `Blocked objective ${target.id || ''} at ${target.x}, ${target.z}`);
  // Flood the actual road corridor. This catches props enclosing a pickup even
  // when the exact standing point is collision-free.
  // The corridor is measured in authored metres and grows with the world, so a
  // riverside pickup that was 40 m off the road is still judged the same way.
  const step = 2, road = [...world.paths[0], ...SUVAL_ROAD];
  const reach = 34 * WORLD_SCALE, halo = 16 * WORLD_SCALE;
  const corridor = (x, z) => {
    for (let i = 1; i < road.length; i++) {
      const a = road[i - 1], b = road[i], dx = b.x - a.x, dz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
      if (Math.hypot(x - a.x - dx * t, z - a.z - dz * t) < reach) return true;
    }
    return objectives.some(target => Math.hypot(x - target.x, z - target.z) < halo);
  };
  const key = (x, z) => `${Math.round(x / step)},${Math.round(z / step)}`;
  const start = { x: road[0].x, z: road[0].z };
  const seen = new Set([key(start.x, start.z)]), queue = [start];
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const { x, z } = queue[cursor];
    for (const [nx, nz] of [[x - step, z], [x + step, z], [x, z - step], [x, z + step]]) {
      if (seen.has(key(nx, nz)) || !corridor(nx, nz)) continue;
      seen.add(key(nx, nz));
      if (canStand(nx, nz, world, .48)) queue.push({ x: nx, z: nz });
    }
  }
  for (const target of objectives)
    assert.ok(queue.some(cell => Math.hypot(cell.x - target.x, cell.z - target.z) < 2.1), `Unreachable ${target.id || ''} at ${target.x}, ${target.z}`);
  for (const fire of world.firePits.filter(f => f.x < -180)) for (const npc of Object.values(regionNpcPositions))
    assert.ok(Math.hypot(fire.x - npc.x, fire.z - npc.z) > 3.3, `Fire ${fire.id} conflicts with an NPC prompt`);
  for (const point of [toWorld(-253, 8), toWorld(-256, 18)]) assert.ok(canStand(point.x, point.z, world, .6), 'Raider spawn must remain clear');
});

test('The river bank retargets fishing while preserving the original pond API', () => {
  const river = world.fishingSpots.find(spot => spot.id === 'reedwater'), originalPond = JSON.stringify(world.pond);
  assert.ok(canStand(river.fishingSpot.x, river.fishingSpot.z, world, .6));
  for (const npc of Object.values(world.npcPositions)) assert.ok(Math.hypot(river.fishingSpot.x - npc.x, river.fishingSpot.z - npc.z) > 3.3);
  for (const fire of world.firePits) assert.ok(Math.hypot(river.fishingSpot.x - fire.x, river.fishingSpot.z - fire.z) > 2.1);
  assert.equal(world.setFishingSpot('unknown'), false);
  assert.equal(world.setFishingSpot('reedwater'), true);
  assert.equal(world.activeFishingSpot().id, 'reedwater');
  world.setFishingState('bite'); world.setFishingOrigin(new THREE.Vector3(river.fishingSpot.x, 5, river.fishingSpot.z)); world.update(1, 1 / 60);
  assert.equal(world.setFishingSpot('willowmere'), false, 'Cannot move an active cast between waters');
  assert.equal(JSON.stringify(world.pond), originalPond, 'Pond coordinates never change while a cast is out');
  world.setFishingState('idle'); assert.equal(world.setFishingSpot('willowmere'), true);
  assert.equal(world.activeFishingSpot().castPoint, world.pond.castPoint);
});

test('The Caloss cannot be waded and repairing the bridge opens its western deck', () => {
  const crossing = CALOSS.crossing;
  const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 });
  const upstream = midpoint(CALOSS.points[3], CALOSS.points[2]), downstream = midpoint(CALOSS.points[5], CALOSS.points[6]);
  assert.equal(canStand(upstream.x, upstream.z, world), false, 'the channel upstream of the bridge is water');
  assert.equal(canStand(downstream.x, downstream.z, world), false, 'the channel downstream of the bridge is water');
  assert.ok(canStand(crossing.x, crossing.z, world), 'the bridge lane is walkable');
  const damaged = world.colliders.filter(c => c.kind === 'bridge-damage');
  assert.ok(damaged.length > 8, 'the damaged strip is closed along the whole deck');
  const spot = damaged[Math.floor(damaged.length / 2)];
  assert.equal(canStand(spot.x, spot.z, world), false);
  assert.equal(world.setJourneySiteState('bridge-repair', true), true);
  assert.equal(canStand(spot.x, spot.z, world), true);
  assert.equal(scene.getObjectByName('Caloss repaired western deck').visible, true);
  assert.equal(scene.getObjectByName('Bridge repair cord').visible, false);
  world.setJourneySiteState('bridge-repair', false);
  assert.equal(canStand(spot.x, spot.z, world), false);
});

test('Parcel, supply and waymarker visuals respond independently and remain finite', () => {
  assert.equal(world.setJourneySiteState('unknown', true), false);
  for (const site of Object.values(journeySites)) {
    world.setJourneySiteState(site.id, true);
    if (['parcel', 'sticks', 'fruit'].includes(site.type)) assert.equal(scene.getObjectByName(`Journey site ${site.id}`).visible, false);
    if (site.type === 'beacon') {
      assert.equal(scene.getObjectByName(`${site.id} light`).visible, true);
      assert.equal(scene.getObjectByName(`Journey site ${site.id}`).rotation.z, 0, 'Restored road stone stands upright');
    }
    world.setJourneySiteState(site.id, false);
    if (site.type === 'beacon') assert.equal(Math.abs(scene.getObjectByName(`Journey site ${site.id}`).rotation.z), .24, 'Unrestored road stone leans outward');
  }
  world.update(3.5, 1 / 60); scene.updateMatrixWorld(true);
  scene.traverse(object => {
    assert.ok(object.matrixWorld.elements.every(Number.isFinite), `Invalid transform ${object.name}`);
    for (const attribute of Object.values(object.geometry?.attributes || {})) assert.ok(attribute.array.every(Number.isFinite), `Invalid geometry ${object.name}`);
  });
  assert.equal(world.journeySiteState()['cart-parcel-1'], false);
});

test('The frontier rope, not an invisible wall, marks where the built world stops', () => {
  const frontier = world.colliders.find(c => c.kind === 'frontier');
  assert.ok(frontier && frontier.x === FRONTIER.barrierX);
  assert.equal(canStand(FRONTIER.barrierX, FRONTIER.z, world), false);
  assert.ok(canStand(FRONTIER.x, FRONTIER.z, world), 'the overlook east of the rope is walkable');
});

test('District scenery batches reduce submitted geometry without excessive extra draw calls', t => {
  const oldScene = new THREE.Scene(), oldWorld = createWorld(oldScene, { spatialBatches: false });
  oldWorld.update(0, 0); world.update(0, 0); oldScene.updateMatrixWorld(true); scene.updateMatrixWorld(true);
  const terrainTiles = scene.getObjectByName('The ground of the four regions').children;
  const oldTerrain = oldScene.getObjectByName('The ground of the four regions').children[0];
  assert.ok(terrainTiles.length >= 36, 'the ground is tiled for culling');
  assert.equal(new Set(terrainTiles.map(tile => tile.geometry.attributes.position)).size, 1, 'Terrain tiles share one vertex buffer');
  assert.equal(new Set(terrainTiles.map(tile => tile.geometry.attributes.color)).size, 1, 'Terrain tiles share one color buffer');
  assert.equal(new Set(terrainTiles.map(tile => tile.material)).size, 1, 'Terrain tiles share one material');
  assert.equal(terrainTiles.reduce((sum, tile) => sum + tile.geometry.index.count, 0), oldTerrain.geometry.index.count, 'Tiling does not add or remove terrain faces');
  const submitted = (targetScene, camera, shadow = false) => {
    camera.updateMatrixWorld(true);
    const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    let draws = 0, triangles = 0;
    targetScene.traverseVisible(object => {
      if (!object.isMesh || (shadow && !object.castShadow) || !frustum.intersectsObject(object)) return;
      draws++; triangles += (object.geometry.index?.count || object.geometry.attributes.position.count) / 3 * (object.isInstancedMesh ? object.count : 1);
    });
    return { draws, triangles: Math.round(triangles) };
  };
  const samples = [];
  for (const [name, ax, az] of [['village', -15, 29], ['gate', -176, 29], ['clearing', -236, 30],
    ['caloss', -345, 93], ['lauvel', -386, 183], ['moros', -500, 312]]) {
    const { x, z } = toWorld(ax, az);
    const y = world.heightAt(x, z);
    for (const [facing, yaw] of [['west', Math.PI / 2], ['east', -Math.PI / 2]]) {
      const camera = new THREE.PerspectiveCamera(54, 1.5, .1, 650), focus = new THREE.Vector3(x, y + 1.5, z);
      camera.position.set(x + Math.sin(yaw) * 12, focus.y + 4, z + Math.cos(yaw) * 12); camera.lookAt(focus);
      const shadow = new THREE.OrthographicCamera(-65, 65, 65, -65, 1, 210); shadow.position.set(x - 45, y + 90, z + 38); shadow.lookAt(x, y, z);
      const before = submitted(oldScene, camera), after = submitted(scene, camera);
      const oldShadow = submitted(oldScene, shadow, true), newShadow = submitted(scene, shadow, true);
      samples.push({ view: `${name}-${facing}`, before: { draws: before.draws + oldShadow.draws, triangles: before.triangles + oldShadow.triangles },
        after: { draws: after.draws + newShadow.draws, triangles: after.triangles + newShadow.triangles } });
    }
  }
  const totals = samples.reduce((sum, s) => ({ beforeTriangles: sum.beforeTriangles + s.before.triangles, afterTriangles: sum.afterTriangles + s.after.triangles,
    beforeDraws: sum.beforeDraws + s.before.draws, afterDraws: sum.afterDraws + s.after.draws }), { beforeTriangles: 0, afterTriangles: 0, beforeDraws: 0, afterDraws: 0 });
  t.diagnostic(JSON.stringify({ totals, views: samples.filter(sample => ['caloss-west', 'lauvel-west', 'moros-west'].includes(sample.view)) }));
  assert.ok(totals.afterTriangles < totals.beforeTriangles * .90, `Expected a measurable geometry reduction: ${JSON.stringify(totals)}`);
  assert.ok(totals.afterDraws < totals.beforeDraws * 1.35, `Too many added submissions: ${JSON.stringify(totals)}`);
});
