import test from 'node:test';
import assert from 'node:assert/strict';
import { createGhostFlight } from '../src/ghost-camera.js';

const keys = (...codes) => new Set(codes);
const near = (a, b, message = '') => assert.ok(Math.abs(a - b) < 1e-8, `${message}: ${a} versus ${b}`);
const origin = { x: 0, y: 0, z: 0 };
const length = p => Math.hypot(p.x, p.y, p.z);
const advance = (flight, input, hz = 60, seconds = 1) => {
  for (let frame = 0; frame < hz * seconds; frame++) flight.update(1 / hz, input);
  return flight.snapshot();
};

test('free flight travels in metres per second independent of ordinary frame rate', () => {
  for (const hz of [10, 30, 60, 144]) {
    const flight = createGhostFlight({ position: origin, pitch: 0 });
    const state = advance(flight, keys('KeyW'), hz);
    near(state.position.z, -28); near(state.position.x, 0); near(state.position.y, 0);
    near(state.currentSpeed, 28);
  }
});

test('diagonal shortcuts and vertical combinations have the same overall speed', () => {
  for (const input of [keys('KeyQ'), keys('KeyE'), keys('KeyW', 'KeyA'), keys('KeyW', 'KeyD'),
    keys('KeyW', 'KeyD', 'Space'), keys('KeyQ', 'KeyW', 'KeyA'), keys('KeyE', 'KeyW', 'KeyD')]) {
    const state = advance(createGhostFlight({ position: origin, pitch: 0 }), input);
    near(length(state.position), 28, 'diagonal movement must not grant additional speed');
  }
  const q = advance(createGhostFlight({ position: origin, pitch: 0 }), keys('KeyQ')).position;
  const wa = advance(createGhostFlight({ position: origin, pitch: 0 }), keys('KeyW', 'KeyA')).position;
  near(q.x, wa.x); near(q.z, wa.z); assert.ok(q.x < 0 && q.z < 0);
  const qe = advance(createGhostFlight({ position: origin, pitch: 0 }), keys('KeyQ', 'KeyE')).position;
  near(qe.x, 0); near(qe.z, -28);
});

test('Shift and Tab give fast flight; simultaneous boost keys never multiply it', () => {
  for (const modifier of [keys('KeyW', 'ShiftLeft'), keys('KeyW', 'ShiftRight'), keys('KeyW', 'Tab'),
    keys('KeyW', 'ShiftLeft', 'Tab')]) {
    const state = advance(createGhostFlight({ position: origin, pitch: 0 }), modifier);
    near(state.position.z, -100); near(state.currentSpeed, 100); assert.ok(state.boosting);
  }
});

test('Space ascends, either Ctrl descends, and opposite inputs cancel', () => {
  for (const [input, expected] of [[keys('Space'), 28], [keys('ControlLeft'), -28], [keys('ControlRight'), -28],
    [keys('ControlLeft', 'ControlRight'), -28], [keys('Space', 'ControlLeft'), 0]]) {
    const state = advance(createGhostFlight({ position: origin, pitch: .9 }), input);
    near(state.position.y, expected); near(state.position.x, 0); near(state.position.z, 0);
  }
  const flight = createGhostFlight({ position: origin, pitch: 0 });
  advance(flight, keys('KeyW', 'KeyS', 'KeyA', 'KeyD')); assert.deepEqual(flight.snapshot().position, origin);
});

test('forward follows yaw and pitch and agrees with the camera look direction', () => {
  const flight = createGhostFlight({ position: origin, yaw: Math.PI / 2, pitch: -Math.PI / 6 });
  const pose = flight.cameraPose({ distance: 9, targetHeight: 0 });
  const state = advance(flight, keys('KeyW'));
  assert.ok(state.position.x < 0 && state.position.y > 0); near(state.position.z, 0);
  for (const axis of ['x', 'y', 'z']) near(state.position[axis] / 28, (pose.target[axis] - pose.position[axis]) / 9);
  const before = flight.snapshot(); flight.rotate(100, -100);
  assert.ok(flight.snapshot().yaw < before.yaw && flight.snapshot().pitch < before.pitch);
  assert.ok(flight.setView({ yaw: 0, pitch: 0 })); near(flight.snapshot().yaw, 0); near(flight.snapshot().pitch, 0);
});

test('free movement ignores terrain and stays inside optional inspection bounds', () => {
  const bounds = { minX: -3, maxX: 3, minZ: -5, maxZ: 5, minY: -20, maxY: 40 };
  const flight = createGhostFlight({ position: origin, pitch: 0, bounds });
  advance(flight, keys('KeyW', 'Tab')); near(flight.snapshot().position.z, -5);
  assert.ok(!flight.snapshot().moving, 'pressing into the boundary must report stopped movement');
  advance(flight, keys('Space', 'Tab')); near(flight.snapshot().position.y, 40);
  advance(flight, keys('ControlLeft', 'Tab')); near(flight.snapshot().position.y, -20, 'underground inspection is allowed');
  assert.ok(flight.setPosition({ x: 500, y: -500, z: -500 }));
  assert.deepEqual(flight.snapshot().position, { x: 3, y: -20, z: -5 });
  const defaultFlight = createGhostFlight({ position: origin, pitch: 0 });
  advance(defaultFlight, keys('ControlLeft', 'Tab')); near(defaultFlight.snapshot().position.y, -100);
});

test('paused and invalid updates cannot move or alter the flight state', () => {
  const flight = createGhostFlight(); flight.update(.1, keys('KeyW')); const before = flight.snapshot();
  for (let frame = 0; frame < 60; frame++) flight.update(.1, keys('Space', 'Tab'), false);
  for (const dt of [0, -1, NaN, Infinity]) flight.update(dt, keys('Space'));
  assert.deepEqual(flight.snapshot(), before);
  assert.equal(flight.setPosition({ x: NaN, y: 0, z: 0 }), false);
  assert.equal(flight.setView({ yaw: Infinity, pitch: 0 }), false);
  assert.equal(flight.rotate(NaN, 4), false); assert.equal(flight.speedScale(Infinity), false);
  assert.deepEqual(flight.snapshot(), before);
  flight.update(.1, new Set()); assert.ok(!flight.snapshot().moving); near(flight.snapshot().currentSpeed, 0);
});

test('scroll adjusts cruise and boost speeds within configured caps; long frames cannot teleport', () => {
  const flight = createGhostFlight({ position: origin, pitch: 0 });
  flight.speedScale(-100); assert.ok(flight.snapshot().speed > 28 && flight.snapshot().boostSpeed > 100);
  for (let i = 0; i < 30; i++) flight.speedScale(-10000);
  near(flight.snapshot().speed, 120); near(flight.snapshot().boostSpeed, 360);
  flight.update(300, keys('KeyW', 'Tab')); near(flight.snapshot().position.z, -54, 'one stalled frame is limited to 150 ms of travel');
  for (let i = 0; i < 30; i++) flight.speedScale(10000);
  near(flight.snapshot().speed, 6); assert.ok(flight.snapshot().boostSpeed >= 6);
  flight.rotate(Number.MAX_VALUE, Number.MAX_VALUE);
  const pose = flight.cameraPose({ distance: Infinity, targetHeight: Infinity });
  assert.ok(Object.values(pose.position).every(Number.isFinite)); assert.ok(Object.values(pose.target).every(Number.isFinite));
});

test('flight state and camera poses cannot mutate the caller’s live character or saved position', () => {
  const point = { x: 9, y: 5, z: 18 }, bounds = { minX: -100, maxX: 100 };
  const flight = createGhostFlight({ position: point, bounds });
  advance(flight, keys('KeyW')); assert.deepEqual(point, { x: 9, y: 5, z: 18 });
  const before = flight.snapshot(), pose = flight.cameraPose();
  const copy = flight.snapshot(); copy.position.x = 5000; copy.velocity.y = 7000; copy.bounds.maxX = 9000; pose.target.z = 9000;
  bounds.maxX = 3000; assert.deepEqual(flight.snapshot(), before);
  const restorePoint = { x: -10, y: 4, z: 12 }; assert.ok(flight.setPosition(restorePoint)); restorePoint.x = 1000;
  assert.equal(flight.snapshot().position.x, -10);
});

test('invalid controller construction fails before producing unusable positions or speed limits', () => {
  for (const config of [{ position: { x: 0, y: NaN, z: 0 } }, { speed: 0 }, { yaw: Infinity },
    { minSpeed: 50, maxSpeed: 10 }, { maxSpeed: 400, maxBoostSpeed: 200 }, { bounds: { minX: 10, maxX: 0 } },
    { bounds: { minY: -Infinity } }, { bounds: null }]) assert.throws(() => createGhostFlight(config), TypeError);
});
