import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveVerticalMotion } from '../src/gameplay/movement/vertical-motion.js';

const move = (colliders, change = {}) => resolveVerticalMotion({ colliders }, {
  x: 0, z: 0, radius: .5, bodyHeight: 2, fromY: 2, toY: -.2, velocity: -8, floor: 0, ...change,
});
const fence = { x: 0, z: 0, hx: 3, hz: .1, minY: 0, maxY: 1 };

test('a fast fall lands on a low fence instead of passing through it', () => {
  assert.deepEqual(move([fence]), { y: 1, velocity: 0, grounded: true });
  assert.deepEqual(move([fence], { fromY: 1, toY: .99, velocity: -.2 }), { y: 1, velocity: 0, grounded: true });
  assert.deepEqual(move([fence], { z: 1, fromY: 1, toY: .99, velocity: -.2 }), { y: .99, velocity: -.2, grounded: false });
});

test('the first surface crossed wins regardless of collider iteration order', () => {
  const upper = { x: 0, z: 0, r: 1, minY: 1.2, maxY: 1.6 };
  assert.equal(move([fence, upper]).y, 1.6);
  assert.equal(move([upper, fence]).y, 1.6);
  assert.equal(move([upper], { fromY: 1, toY: -.5 }).y, 0, 'An overhead surface does not catch feet already below it');
});

test('ascending head motion stops at the first overhead solid without grounding', () => {
  const ceiling = { x: 0, z: 0, hx: 2, hz: 2, minY: 3, maxY: 3.2 };
  const higher = { ...ceiling, minY: 4, maxY: 4.2 };
  assert.deepEqual(move([higher, ceiling], { fromY: .5, toY: 3, velocity: 8 }), { y: 1, velocity: 0, grounded: false });
  assert.deepEqual(move([ceiling], { fromY: 3.5, toY: 4, velocity: 3 }), { y: 4, velocity: 3, grounded: false });
});

test('water markers and old unbounded walls do not become artificial floors', () => {
  assert.deepEqual(move([{ ...fence, kind: 'river-water' }, { ...fence, kind: 'pond-water' }, { x: 0, z: 0, r: 1 }]),
    { y: 0, velocity: 0, grounded: true });
  assert.deepEqual(move([], { floor: .4 }), { y: .4, velocity: 0, grounded: true });
});

test('bounded boxes use the circular footprint at corners and circles include the mover radius', () => {
  const box = { x: 0, z: 0, hx: 1, hz: 1, minY: 0, maxY: 1 };
  assert.equal(move([box], { x: 1.4, z: 1.4 }).y, 0, 'A distant corner does not support the body');
  assert.equal(move([box], { x: 1.3, z: 1.3 }).y, 1);
  assert.equal(move([{ x: 0, z: 0, r: 1, maxY: 1 }], { x: 1.4 }).y, 1);
  assert.equal(move([{ x: 0, z: 0, r: 1, maxY: 1 }], { x: 1.6 }).y, 0);
});

test('the collider grid is queried locally and neither world nor input is mutated', () => {
  const input = Object.freeze({ x: 0, z: 0, radius: .5, bodyHeight: 2, fromY: 2, toY: .5, velocity: -4, floor: 0 });
  const collider = Object.freeze({ ...fence });let queries = 0;
  const world = { nearColliders(x, z, radius) { assert.deepEqual([x, z, radius], [0, 0, .5]);queries++;return [collider]; } };
  assert.deepEqual(resolveVerticalMotion(world, input), { y: 1, velocity: 0, grounded: true });
  assert.equal(queries, 1);
});
