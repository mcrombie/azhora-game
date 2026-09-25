import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand, moveCharacter } from '../src/game-state.js';
import { CLOSED_REGIONS, CLOSED_BORDER_LINES, CLOSED_BORDER_COOLDOWN, closedRegionEntered, createBorderWatch } from '../src/closed-border.js';
import { REGION_OUTLINES, SUVAL_ROAD, insideRegion, isLandHex } from '../src/region-world.js';
import { FRONTIER_ROUTE, FRONTIER_GATE, BORDER_CROSSING } from '../src/frontier.js';
import { SUVAL_RIDGE_EDGES, SUVAL_RIDGE_ROCKS, SUVAL_RIDGE_COLLIDERS, SUVAL_HILL_PASSES, SUVAL_HILL_GUARDS, hillPassPoint } from '../src/frontier-ridges.js';
import { TOWN_LIFE_NPCS } from '../src/town-life.js';

const flat = (inside) => (name, x) => name === 'Closed' && inside(x);

test('a move from outside a closed region to inside it is refused; moves within, out of and around it are not', () => {
  assert.deepEqual(CLOSED_REGIONS, ['East Suval']);
  const inside = flat(x => x > 0), closed = ['Closed'];
  assert.equal(closedRegionEntered({ x: -1, z: 0 }, { x: 1, z: 0 }, closed, inside), 'Closed');
  assert.equal(closedRegionEntered({ x: 1, z: 0 }, { x: 2, z: 0 }, closed, inside), null, 'a tester already inside moves about freely');
  assert.equal(closedRegionEntered({ x: 1, z: 0 }, { x: -1, z: 0 }, closed, inside), null, 'leaving is allowed');
  assert.equal(closedRegionEntered({ x: -2, z: 0 }, { x: -1, z: 0 }, closed, inside), null);
  for (const bad of [null, { x: Number.NaN, z: 0 }, { x: 0 }]) assert.equal(closedRegionEntered(bad, { x: 1, z: 0 }, closed, inside), null);
});

test('the traveler is told why, at most once a cooldown, while every refused step is still refused', () => {
  const watch = createBorderWatch({ closed: ['Closed'], inside: flat(x => x > 0) });
  const first = watch.step({ x: -1, z: 0 }, { x: 1, z: 0 }, 10);
  assert.equal(first.refused, true); assert.equal(first.toast, CLOSED_BORDER_LINES[0]); assert.match(first.toast, /Elodi|Elod/);
  const again = watch.step({ x: -1, z: 0 }, { x: 1, z: 0 }, 10.5);
  assert.equal(again.refused, true); assert.equal(again.toast, null, 'no second toast within the cooldown');
  const later = watch.step({ x: -1, z: 0 }, { x: 1, z: 0 }, 10 + CLOSED_BORDER_COOLDOWN);
  assert.equal(later.toast, CLOSED_BORDER_LINES[1], 'the lines vary');
  assert.equal(watch.step({ x: 1, z: 0 }, { x: 2, z: 0 }, 99).refused, false);
  assert.equal(watch.turnedBack, 3);
  for (const line of CLOSED_BORDER_LINES) assert.doesNotMatch(line, /goblin|South Pyros/i);
});

test('entry to East Suval is refused along its whole land border, not only at the road', () => {
  const loop = REGION_OUTLINES['East Suval'][0];
  let checked = 0;
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i], b = loop[(i + 1) % loop.length], length = Math.hypot(b.x - a.x, b.z - a.z);
    const nx = -(b.z - a.z) / length, nz = (b.x - a.x) / length;
    for (let s = 4; s < length - 4; s += 8) {
      const px = a.x + (b.x - a.x) * s / length, pz = a.z + (b.z - a.z) * s / length;
      const sign = insideRegion('East Suval', px + nx * 3, pz + nz * 3) ? -1 : 1;
      const outside = { x: px + nx * sign * 2, z: pz + nz * sign * 2 }, inside = { x: px - nx * sign * 2, z: pz - nz * sign * 2 };
      if (!isLandHex(outside.x, outside.z)) continue;   // the sea needs no rule
      assert.equal(closedRegionEntered(outside, inside), 'East Suval', `entry allowed at ${px.toFixed(0)}, ${pz.toFixed(0)}`);
      assert.equal(closedRegionEntered(inside, outside), null);
      checked++;
    }
  }
  assert.ok(checked > 60, `the whole land border is checked (${checked} crossings)`);
});

test('the branch road now ends before Elod’s shut gate, and walking on into East Suval gets nowhere', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const world = createWorld(new THREE.Scene());
  assert.deepEqual(world.suvalRoute, FRONTIER_ROUTE.map(p => ({ x: p.x, z: p.z })));
  for (const point of world.suvalRoute) assert.equal(insideRegion('East Suval', point.x, point.z), false, 'the walkable branch stays in Luscia');
  assert.ok(insideRegion('East Suval', BORDER_CROSSING.x, BORDER_CROSSING.z) && SUVAL_ROAD.some(p => insideRegion('East Suval', p.x, p.z)), 'the road itself still runs on');
  // Holding forward from the approach into the gate: the shut gate stops the traveler on the Luscian side.
  const end = world.suvalRoute.at(-1), walker = { ...end };
  assert.ok(canStand(end.x, end.z, world));
  for (let step = 0; step < 60; step++) moveCharacter(walker, FRONTIER_GATE.u.x * .5, FRONTIER_GATE.u.z * .5, world);
  assert.equal(insideRegion('East Suval', walker.x, walker.z), false);
  assert.ok((walker.x - FRONTIER_GATE.x) * FRONTIER_GATE.u.x + (walker.z - FRONTIER_GATE.z) * FRONTIER_GATE.u.z < 0, 'stopped in front of the gate');
});

test('the exposed land boundary has continuous solid limestone and every hill pass is visibly locked', async () => {
  const { buildFrontierRidges } = await sourceModule('../src/frontier-ridge-works.js');
  const scene = new THREE.Scene(), colliders = [];
  buildFrontierRidges({ parent: scene, heightAt: () => 10, colliders });
  const world = { bounds: { minX: -1000, maxX: 1000, minZ: 0, maxZ: 1400 }, heightAt: () => 10, colliders };
  assert.equal(colliders.length, SUVAL_RIDGE_COLLIDERS.length);
  assert.ok(SUVAL_RIDGE_EDGES.length > 10 && SUVAL_RIDGE_ROCKS.length > 100);
  for (const edge of SUVAL_RIDGE_EDGES) {
    const mid = { x: (edge.a.x + edge.b.x) / 2, z: (edge.a.z + edge.b.z) / 2 };
    assert.ok(isLandHex(mid.x - edge.inward.x * 3, mid.z - edge.inward.z * 3), 'no wall across the sea');
    assert.ok(scene.getObjectByName(`Elodi limestone ridge ${edge.id}`));
    for (let along = 0; along <= edge.length; along += .5) {
      const x = edge.a.x + edge.along.x * along, z = edge.a.z + edge.along.z * along;
      assert.equal(canStand(x, z, world), false, `unprotected border at ${x}, ${z}`);
    }
  }
  for (const gate of SUVAL_HILL_PASSES) {
    assert.equal(gate.locked, true);
    assert.ok(scene.getObjectByName(`${gate.name} - locked`));
    const guards = SUVAL_HILL_GUARDS.filter(guard => guard.gate === gate.id);
    assert.equal(guards.length, 2);
    for (const guard of guards) {
      assert.ok(canStand(guard.x, guard.z, world));
      const npc = TOWN_LIFE_NPCS.find(npc => npc.id === guard.id);
      assert.equal(npc?.modelRole, 'elodi-guard');
      assert.ok(npc.lines.some(line => /locked/.test(line)));
    }
    for (const radius of [.34, .8]) {
      const outside = hillPassPoint(gate, 0, -12), walker = { ...outside };
      assert.ok(canStand(outside.x, outside.z, world, radius));
      moveCharacter(walker, gate.inward.x * 24, gate.inward.z * 24, world, radius);
      assert.ok((walker.x - gate.x) * gate.inward.x + (walker.z - gate.z) * gate.inward.z < -1,
        'walkers and riders stop at the locked leaves without needing the region-entry rule');
    }
  }
});

test('developer travel inside East Suval still allows movement without unlocking its physical border', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const world = createWorld(new THREE.Scene()), watch = createBorderWatch();
  for (const gate of SUVAL_HILL_PASSES) {
    assert.equal(canStand(gate.x, gate.z, world), false);
    for (const guard of SUVAL_HILL_GUARDS.filter(guard => guard.gate === gate.id)) {
      assert.ok(canStand(guard.x, guard.z, world, .45), `${guard.id} has real-world footing`);
    }
  }
  const from = { x: -50, z: 641 }, to = { x: -50, z: 642 };
  assert.ok(insideRegion('East Suval', from.x, from.z));
  assert.equal(watch.step(from, to).refused, false, 'developer exploration inside the closed region remains permitted');
  // Leaving is still allowed by the region rule; the visible ridges and barred gates
  // now deliberately block ordinary land exits in both directions. F8 travel remains available.
  const gate = SUVAL_HILL_PASSES[0];
  assert.equal(watch.step(hillPassPoint(gate, 0, 2), hillPassPoint(gate, 0, -2)).refused, false);
});
