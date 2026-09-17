import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand, moveCharacter } from '../src/game-state.js';
import { CLOSED_REGIONS, CLOSED_BORDER_LINES, CLOSED_BORDER_COOLDOWN, closedRegionEntered, createBorderWatch } from '../src/closed-border.js';
import { REGION_OUTLINES, SUVAL_ROAD, insideRegion, isLandHex } from '../src/region-world.js';
import { FRONTIER_ROUTE, FRONTIER_GATE, BORDER_CROSSING } from '../src/frontier.js';

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
