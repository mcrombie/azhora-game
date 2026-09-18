import test from 'node:test';
import assert from 'node:assert/strict';
import { BODY, bodyWorld, stepAround } from '../src/bodies.js';
import { canStand, moveCharacter } from '../src/game-state.js';

const open = () => ({ bounds: { minX: -50, maxX: 50, minZ: -50, maxZ: 50 }, colliders: [], heightAt: () => 1 });

test('the traveler bumps into a passer-by instead of walking through them', () => {
  const world = bodyWorld(open()).setBodies([{ id: 'marn', x: 0, z: 2, r: BODY.person }]);
  const traveler = { x: 0, z: 0 };
  world.moving(traveler);
  for (let i = 0; i < 40; i++) moveCharacter(traveler, 0, .1, world);
  assert.ok(traveler.z < 2 - BODY.person - BODY.traveler + .05, `walked into Marn (${traveler.z.toFixed(2)})`);
  assert.ok(!canStand(0, 2, world), 'nobody can stand where Marn stands');
  // Sideways past her is open.
  moveCharacter(traveler, 1, 0, world); moveCharacter(traveler, 0, 3, world);
  assert.ok(traveler.z > 3, 'and round her is fine');
});

test('a mover is never trapped by its own body or one it already overlaps', () => {
  const traveler = { x: 0, z: 0 };
  const world = bodyWorld(open()).setBodies([{ id: 'traveler', x: 0, z: 0, r: BODY.traveler }, { id: 'boy', x: .2, z: .1, r: BODY.person }]);
  world.moving(traveler);
  moveCharacter(traveler, -1, 0, world);
  assert.ok(Math.abs(traveler.x + 1) < 1e-9, `it walks out of a spawn on top of someone (${traveler.x})`);
  // A bystander who did not overlap still blocks.
  const later = bodyWorld(open()).setBodies([{ id: 'boy', x: 2, z: 0, r: BODY.person }]).moving(traveler);
  moveCharacter(traveler, 4, 0, later);
  assert.ok(traveler.x < 2 - BODY.person, 'the boy is solid');
});

test('two villagers meeting on a path lean aside and pass instead of standing nose to nose', () => {
  const world = bodyWorld(open());
  const a = { id: 'a', x: 0, z: -3 }, b = { id: 'b', x: 0, z: 3 };
  for (let i = 0; i < 200; i++) {
    for (const [self, other, dir, side] of [[a, b, 1, 1], [b, a, -1, 1]]) {
      world.setBodies([{ id: other.id, x: other.x, z: other.z, r: BODY.person }]).moving(self, BODY.person);
      stepAround(self, 0, dir * .04, world, BODY.person, side);
    }
  }
  assert.ok(a.z > 2.5 && b.z < -2.5, `they passed each other (a ${a.z.toFixed(1)}, b ${b.z.toFixed(1)})`);
  assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > 0, 'and never merged');
});

test('bodies leave the world’s own colliders alone and add nothing when nobody is about', () => {
  const base = { ...open(), colliders: [{ x: 5, z: 0, r: 1 }] };
  const world = bodyWorld(base);
  assert.equal(world.nearColliders(5, 0, .3).length, 1);
  world.setBodies([{ id: 'x', x: 5.5, z: 0, r: .3 }]).moving(null);
  assert.equal(world.nearColliders(5, 0, .3).length, 2);
  assert.equal(world.nearColliders(20, 20, .3).length, 1, 'a body far away is not near');
  assert.equal(stepAround({ x: 0, z: 0 }, 0, 0, world, .3), 0);
});

test('a traveler set down inside a prop can walk out of it, and a prop is solid to everyone else', () => {
  const crate = { x: 0, z: 0, r: .35, kind: 'prop' };
  const base = { ...open(), colliders: [crate] };
  const traveler = { x: .1, z: 0 };
  const world = bodyWorld(base).moving(traveler);
  moveCharacter(traveler, 1.5, 0, world);
  assert.ok(traveler.x > 1.5, `stuck in the crate at ${traveler.x.toFixed(2)}`);
  const other = { x: -2, z: 0 };
  moveCharacter(other, 3, 0, bodyWorld(base).moving(other));
  assert.ok(other.x < -crate.r - BODY.traveler + .01, 'but a walker from outside bumps into it');
});
