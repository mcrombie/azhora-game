import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { bodyWorld, stepToward } from '../src/bodies.js';
import { canStand, canSwim } from '../src/game-state.js';
import { createKayla, KAYLA_RADIUS, KAYLA_SPEED, KAYLA_ROUTE, kaylaMaySwim, kaylaNavigationWorld } from '../src/kayla.js';

const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());

test('the large bear completes a real collision-safe circuit with the Caloss bridge still broken', t => {
  world.setJourneySiteState('bridge-repair', false);
  const kayla = createKayla(), regions = new Set(), stops = new Set();
  const nav = bodyWorld(kaylaNavigationWorld(world)).moving(kayla.position, KAYLA_RADIUS, 'kayla');
  let swimming = 0, distance = 0, frames = 0, unchanged = 0;
  const passable = p => canStand(p.x, p.z, world, KAYLA_RADIUS)
    || (kaylaMaySwim(p.x, p.z) && canSwim(p.x, p.z, world, KAYLA_RADIUS));
  for (const [index, point] of KAYLA_ROUTE.entries()) assert.ok(passable(point), `waypoint ${index} is passable at her full radius`);
  for (; frames < 24000; frames++) {
    const before = { ...kayla.position }, beforeNext = kayla.state().next;
    const state = kayla.tick(.25, { move: (position, target, maximum) => stepToward(position, target, maximum, nav, KAYLA_RADIUS) });
    const moved = Math.hypot(kayla.position.x - before.x, kayla.position.z - before.z);
    assert.ok(moved <= KAYLA_SPEED * .25 + 1e-8, 'she never teleports');
    distance += moved; regions.add(state.region); if (state.stop) stops.add(state.stop);
    if (canSwim(kayla.position.x, kayla.position.z, world, KAYLA_RADIUS)) swimming++;
    for (const fraction of [.25, .5, .75, 1]) {
      const sample = { x: before.x + (kayla.position.x - before.x) * fraction, z: before.z + (kayla.position.z - before.z) * fraction };
      assert.ok(passable(sample), `bear intersects a real collider or unintended water at ${sample.x}, ${sample.z}`);
    }
    unchanged = moved < .001 && !state.wait && beforeNext === state.next ? unchanged + 1 : 0;
    assert.ok(unchanged < 120, `stalled toward waypoint ${state.next} from ${JSON.stringify(kayla.position)}`);
    if (state.loops === 1) break;
  }
  assert.equal(kayla.state().loops, 1, 'the complete outward and return journey must finish');
  assert.deepEqual([...stops].sort(), ['drent', 'liz', 'luscia']);
  for (const region of ['Drent', 'Pueth', 'Luscia']) assert.ok(regions.has(region));
  assert.ok(swimming > 0, 'the broken optional bridge cannot strand her in Drent');
  assert.equal(kayla.state().lizGifts, 1);
  t.diagnostic(`${frames} quarter-second frames; ${distance.toFixed(1)} metres walked or swum`);
});
