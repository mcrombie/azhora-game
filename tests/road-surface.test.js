import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { createAutopilot, nearestOnPath, nextWaypoint, roadRoute } from '../src/autopilot.js';
import { canStand, canSwim, moveCharacter, QUEST_DONE } from '../src/game-state.js';

let fixture;
async function built() {
  if (!fixture) {
    const { createWorld } = await sourceModule('../src/world.js');
    const scene = new THREE.Scene(), world = createWorld(scene);
    fixture = { scene, world, ...(await sourceModule('../src/regions.js')), ...(await sourceModule('../src/places.js')) };
  }
  return fixture;
}

test('Avrel and Nothom dirt surfaces follow the ground between their edges', async () => {
  const { world, scene, AVREL_CLEARING, LUMBER_TOWN } = await built();
  for (const [location, tint] of [[AVREL_CLEARING, '9f8d57'], [LUMBER_TOWN.square, 'a89b78']]) {
    const meshes = [];
    scene.traverse(item => { if (item.isMesh && item.material.color?.getHexString() === tint) meshes.push(item); });
    assert.ok(meshes.length, 'the actual built clearing has a dirt surface');
    let largest = 0, count = 0;
    for (const mesh of meshes) {
      const p = mesh.geometry.attributes.position, indices = mesh.geometry.index;
      for (let i = 0; i < indices.count; i += 3) {
      const a = indices.getX(i), b = indices.getX(i + 1), c = indices.getX(i + 2);
      const x = (p.getX(a) + p.getX(b) + p.getX(c)) / 3, z = (p.getZ(a) + p.getZ(b) + p.getZ(c)) / 3;
      if (Math.hypot(x - location.x, z - location.z) > (location.radius ?? 15) * .8) continue;
      const y = (p.getY(a) + p.getY(b) + p.getY(c)) / 3;
      largest = Math.max(largest, Math.abs(y - world.heightAt(x, z))); count++;
      }
    }
    assert.ok(count > 100, 'the surface has small ground-conforming faces');
    assert.ok(largest < .16, `the dirt should not bury people or hide the road: ${largest.toFixed(3)}m discrepancy`);
  }
});

test('autoplay physically follows Avrel bends and leaves Reedcutters Camp for Iven', async () => {
  const { world, AVREL_CLEARING, LANDING_CENTRE } = await built();
  world.setJourneySiteState('bridge-repair', true);
  const target = world.npcPositions['relay-clerk'];
  const closest = nearestOnPath(world.paths[0], AVREL_CLEARING);
  const starts = [{ label: 'Avrel', x: closest.x + 20, z: closest.z },
    { label: 'Reedcutters Camp', x: LANDING_CENTRE.x + 5, z: LANDING_CENTRE.z - 2 }];
  for (const start of starts) {
    const position = { x: start.x, z: start.z };
    assert.ok(canStand(position.x, position.z, world), `${start.label} start is clear ground`);
    let arrived = false, largestRoadGap = 0;
    const pilot = createAutopilot({ world, read: () => ({ mode: 'playing', questStage: QUEST_DONE, chartLesson: 'complete', mapTutorial: 2,
      position, combat: { phase: 'peaceful', action: 'idle', stamina: 100, hp: 100, enemies: [] }, weapon: { usable: true }, inventory: {},
      journey: { started: true, bridge: 'done', complete: false, destinationIds: ['relay-clerk'] },
      interaction: { npcId: Math.hypot(position.x - target.x, position.z - target.z) < 2.3 ? 'relay-clerk' : null } }),
      act: { interact: () => { arrived = true; } } });
    pilot.start();
    for (let frame = 0; frame < 1800 && !arrived; frame++) {
      const command = pilot.step(1 / 15);
      assert.ok(command, `${start.label}: autoplay stopped: ${pilot.stopReason}`);
      if (command.move && command.yaw !== null) {
        const { forward, side } = command.move, speed = command.move.run ? 7.2 : 4.2, yaw = command.yaw;
        moveCharacter(position, (-Math.sin(yaw) * forward + Math.cos(yaw) * side) * speed / 15,
          (-Math.cos(yaw) * forward - Math.sin(yaw) * side) * speed / 15, world);
      }
      const gap = nearestOnPath(world.paths[0], position).distance;
      if (start.label === 'Avrel' && frame > 80 && position.x > -645) largestRoadGap = Math.max(largestRoadGap, gap);
    }
    if (!arrived) console.log('ROUTE FAILURE', start.label, position, nextWaypoint(position, target, world), roadRoute(world.paths, position, target)?.slice(0, 8), world.nearColliders(position.x, position.z, 4));
    assert.ok(arrived, `${start.label}: stalled at (${position.x.toFixed(1)}, ${position.z.toFixed(1)})`);
    if (start.label === 'Avrel') assert.ok(largestRoadGap < 2.3, `autoplay left the curved road by ${largestRoadGap.toFixed(2)}m`);
  }
});

test('the actual Caloss banks join swimmable water without invisible collision strips', async () => {
  const { world, CALOSS } = await built();
  const a = CALOSS.points[6], b = CALOSS.points[7], length = Math.hypot(b.x - a.x, b.z - a.z);
  const normal = { x: -(b.z - a.z) / length, z: (b.x - a.x) / length }, center = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
  const traveler = { x: center.x - normal.x * 15, z: center.z - normal.z * 15 };
  let entered = false;
  assert.ok(canStand(traveler.x, traveler.z, world));
  for (let step = 0; step < 200; step++) {
    moveCharacter(traveler, normal.x * .15, normal.z * .15, world, .34, { swimming: true });
    entered ||= canSwim(traveler.x, traveler.z, world);
  }
  assert.ok(entered, 'walked into the river from its dry bank');
  assert.ok(canStand(traveler.x, traveler.z, world), 'walked out onto the opposite bank');
  assert.ok(Math.hypot(traveler.x - center.x - normal.x * 15, traveler.z - center.z - normal.z * 15) < .1, 'crossed the whole river by ordinary movement');
});

test('water markers leave dry banks open but solid objects and submerged ground retain their rules', () => {
  const world = { bounds: { minX: -20, maxX: 20, minZ: -20, maxZ: 20 }, heightAt: x => x < 0 ? 4 : 1,
    waterAt: () => 3, colliders: [{ x: 0, z: 0, r: 5, kind: 'river-water' }, { x: -2, z: 3, r: .6, kind: 'rock' }] };
  assert.ok(canStand(-1, 0, world)); assert.equal(canSwim(-1, 0, world), false);
  assert.equal(canStand(1, 0, world), false); assert.ok(canSwim(1, 0, world));
  assert.equal(canStand(-2, 3, world), false); assert.equal(canSwim(-2, 3, world), false);
});


test('the main road navigation samples stay within a walking stride of one another through bends and gate approaches', async () => {
  const { world } = await built();
  const road = world.paths[0];
  for (let i = 1; i < road.length; i++) {
    const gap = Math.hypot(road[i].x - road[i - 1].x, road[i].z - road[i - 1].z);
    assert.ok(gap <= 3.08, `navigation skips ${gap.toFixed(2)}m of the actual road near ${road[i].x.toFixed(1)},${road[i].z.toFixed(1)}`);
  }
});
