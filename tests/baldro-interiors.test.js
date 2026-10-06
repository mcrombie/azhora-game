import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';

const THREE = await sourceModule('../vendor/three.module.js');
const { createBaldroInteriorWalk, buildBaldroInterior, BALDRO_INTERIOR_ROOMS, BALDRO_INTERIOR_STOPS } = await sourceModule('../src/content/regions/baldro/baldro-interiors.js');
const kingdoms = ['west', 'east'].map((side, i) => ({ id: `${side}-baldro`, name: `${side} hold`, gate: { x: 1500 + i * 700, y: 100, z: -2300 } }));

function floorRoute(walk, destination) {
  const start = { x: 0, z: 27 }, key = p => `${p.x},${p.z}`, queue = [start], seen = new Map([[key(start), null]]);
  for (let i = 0; i < queue.length; i++) {
    const here = queue[i];
    if (key(here) === key(destination)) {
      const result = []; let cursor = here;
      while (cursor) { result.push(cursor); cursor = seen.get(key(cursor)); }
      return result.reverse();
    }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = { x: here.x + dx, z: here.z + dz }, id = key(next);
      if (seen.has(id) || Math.abs(next.x) > 44 || next.z < -55 || next.z > 34) continue;
      const world = walk.toWorld(next);
      if (!walk.canStand(world.x, world.z)) continue;
      const moved = walk.toWorld(here);
      walk.move(moved, world.x - moved.x, world.z - moved.z);
      if (Math.hypot(moved.x - world.x, moved.z - world.z) > .01) continue;
      seen.set(id, here); queue.push(next);
    }
  }
  return null;
}

test('every Baldro district and resident is reachable on foot through the connected indoor passages', () => {
  for (const kingdom of kingdoms) {
    const walk = createBaldroInteriorWalk(kingdom);
    for (const target of [...BALDRO_INTERIOR_ROOMS, ...BALDRO_INTERIOR_STOPS]) {
      const route = floorRoute(walk, target);
      assert.ok(route?.length, `${kingdom.id} reaches ${target.id}`);
      const position = { ...walk.spawn };
      for (const point of route.slice(1)) {
        const next = walk.toWorld(point), previousY = position.y;
        walk.move(position, next.x - position.x, next.z - position.z);
        assert.ok(Math.hypot(position.x - next.x, position.z - next.z) < .01);
        assert.ok(Math.abs(previousY - position.y) < .3, 'no vertical teleport or step is needed on the ramp');
        assert.equal(position.y, walk.floorAt(position.x, position.z));
      }
    }
  }
});

test('the memorial ramp rises continuously by four metres and its rendered surface matches the walking floor', () => {
  for (const kingdom of kingdoms) {
    const scene = new THREE.Scene(), interior = buildBaldroInterior(scene, kingdom), { walk } = interior;
    scene.updateMatrixWorld(true);
    const mesh = interior.group.children.find(child => child.isMesh), ray = new THREE.Raycaster();
    let last = walk.origin.y;
    for (let z = -16; z >= -36; z -= .25) {
      const at = walk.toWorld({ x: 0, z }), floor = walk.floorAt(at.x, at.z);
      assert.equal(walk.canStand(at.x, at.z), true);
      assert.ok(floor >= last - 1e-7 && floor - last < .07);
      ray.set(new THREE.Vector3(at.x, floor + .5, at.z), new THREE.Vector3(0, -1, 0));
      const hit = ray.intersectObject(mesh)[0];
      assert.ok(hit, `${kingdom.id} has rendered ramp at ${z}`);
      assert.ok(Math.abs(hit.point.y - floor) < .02, `rendered ramp meets feet at ${z}: ${hit.point.y}/${floor}`);
      last = floor;
    }
    assert.equal(last - walk.origin.y, 4);
  }
});

test('interior collision stops wall clipping pillar plinths furniture and long moves through rock', () => {
  for (const kingdom of kingdoms) {
    const walk = createBaldroInteriorWalk(kingdom);
    for (const local of [{ x: 15.6, z: 9 }, { x: 5.6, z: 24 }, { x: 3.65, z: -25 },
      { x: 12.4, z: 10 }, { x: 7, z: 3 }, { x: 26, z: 0 }, { x: -25, z: -9 }]) {
      const at = walk.toWorld(local);
      assert.equal(walk.canStand(at.x, at.z), false, `${kingdom.id} blocks ${JSON.stringify(local)}`);
    }
    const position = walk.toWorld({ x: 0, z: 24 }), target = walk.toWorld({ x: 80, z: 24 });
    walk.move(position, target.x - position.x, 0);
    assert.equal(walk.canStand(position.x, position.z), true);
    assert.ok(Math.abs(position.x - walk.origin.x) < 5.3, 'large moves are subdivided and cannot tunnel through the gate hall wall');
    assert.equal(walk.floorAt(walk.origin.x + 80, walk.origin.z), null);
  }
});

test('interior cameras stop before masonry and ceilings while looking back through doorways and up ramps', () => {
  for (const kingdom of kingdoms) {
    const scene = new THREE.Scene(), interior = buildBaldroInterior(scene, kingdom), { walk } = interior;
    scene.updateMatrixWorld(true);
    const mesh = interior.group.children.find(child => child.isMesh), ray = new THREE.Raycaster();
    for (const local of [{ x: 0, z: 27 }, { x: 14, z: 9 }, { x: 0, z: 18 }, { x: 0, z: -25 }, { x: 0, z: -35 }, { x: -31, z: -34 }]) {
      const position = walk.toWorld(local);
      for (const pitch of [.2, .5, 1]) for (let yaw = 0; yaw < Math.PI * 2; yaw += Math.PI / 4) {
        const { target, lookAt } = walk.camera(position, yaw, pitch);
        assert.ok(Object.values(target).every(Number.isFinite));
        const start = new THREE.Vector3(lookAt.x, lookAt.y, lookAt.z), end = new THREE.Vector3(target.x, target.y, target.z);
        const length = start.distanceTo(end);
        if (length < .001) continue;
        ray.set(start, end.clone().sub(start).normalize());
        const hit = ray.intersectObject(mesh)[0];
        assert.ok(!hit || hit.distance >= length - .02, `${kingdom.id} camera stays in front of stone from ${JSON.stringify(local)} at ${yaw},${pitch}: hit ${hit?.distance}, camera ${length}`);
        assert.ok(target.y >= walk.floorAt(target.x, target.z) + .2);
      }
    }
  }
});

test('East Hold reverses the inhabited and working wings while keeping actor and light coordinates in the same world frame', () => {
  const scene = new THREE.Scene(), west = buildBaldroInterior(scene, kingdoms[0]), east = buildBaldroInterior(scene, kingdoms[1]);
  const hearth = BALDRO_INTERIOR_STOPS.find(stop => stop.id === 'hearth');
  assert.ok(west.walk.toWorld(hearth).x < west.walk.origin.x);
  assert.ok(east.walk.toWorld(hearth).x > east.walk.origin.x);
  assert.deepEqual(east.group.position.toArray(), [0, 0, 0]);
  assert.deepEqual(east.group.scale.toArray(), [1, 1, 1], 'host people retain absolute world coordinates');
  assert.equal(east.group.children.find(child => child.isMesh).scale.x, -1);
  assert.equal(west.group.children.find(child => child.isMesh).scale.x, 1);
  assert.equal(east.walk.spawn.x, kingdoms[1].gate.x);
  assert.equal(east.walk.exit.x, kingdoms[1].gate.x);
  assert.equal(east.group.children.filter(child => child.isPointLight).length, 6);
});
