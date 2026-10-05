import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeveloperBat, DEVELOPER_BAT } from '../src/developer-bat.js';

test('The developer bat moves in three dimensions and freezes when paused', () => {
  const bat = createDeveloperBat({ heightAt: () => 2 });
  bat.start({ x: 0, y: 2, z: 0 });
  bat.tick(.1, { dx: 1, lift: 1 });
  const before = bat.view();
  assert.ok(before.position.x > 2 && before.position.y > 8);
  bat.tick(.1, { dx: 1, lift: 1, playing: false });
  assert.deepEqual(bat.view(), before);
  assert.equal('snapshot' in bat, false, 'A developer mount is not ordinary adventure ownership');
});

test('Cliffs block low flight without teleporting the bat up their face', () => {
  const bat = createDeveloperBat({ heightAt: x => x < 2 ? 0 : 60 });
  bat.start({ x: 0, y: 0, z: 0 });
  for (let i = 0; i < 60; i++) bat.tick(.05, { dx: 1 });
  assert.ok(bat.view().position.x < 2);
  assert.equal(bat.view().position.y, 6);
  for (let i = 0; i < 80; i++) bat.tick(.05, { lift: 1 });
  bat.tick(.1, { dx: 1 });
  assert.ok(bat.view().position.x > 2);
});

test('Landing is physical and cannot bypass closed borders or land on water', () => {
  const bat = createDeveloperBat({ heightAt: () => 0, canLand: x => x >= 0 });
  bat.start({ x: -1, y: 20, z: 0 });
  assert.equal(bat.requestLanding().ok, false);
  bat.tick(.1, { dx: 1 });
  assert.equal(bat.requestLanding().ok, true);
  const y = bat.view().position.y;
  bat.tick(.05);
  assert.ok(bat.active && bat.view().position.y < y && bat.view().position.y > 0);
  for (let i = 0; i < 30; i++) bat.tick(.05);
  assert.equal(bat.active, false);
  assert.equal(bat.view().position.y, 0);
});

test('Testing travel can cancel a flight and ordinary exit can recover its takeoff point', () => {
  const bat = createDeveloperBat({ heightAt: () => 0, bounds: { minX: -5, maxX: 5, minZ: -5, maxZ: 5 } });
  bat.start({ x: 1, y: 0, z: 2 });
  for (let i = 0; i < 20; i++) bat.tick(.1, { dx: 1, boost: true });
  assert.equal(bat.view().position.x, 5);
  assert.deepEqual(bat.cancel({ returnToOrigin: true }), { x: 1, y: 0, z: 2 });
  assert.equal(bat.active, false);
});


test('Holding turbo is faster than Shift and releasing it immediately restores ordinary flight', () => {
  const bat = createDeveloperBat({ heightAt: () => 0 }); bat.start({ x: 0, y: 30, z: 0 });
  const travel = input => { const x = bat.view().position.x; bat.tick(.1, { dx: 1, ...input }); return bat.view().position.x - x; };
  assert.ok(Math.abs(travel({}) - DEVELOPER_BAT.speed * .1) < 1e-8);
  assert.ok(Math.abs(travel({ boost: true }) - DEVELOPER_BAT.boost * .1) < 1e-8);
  assert.ok(Math.abs(travel({ turbo: true }) - DEVELOPER_BAT.turbo * .1) < 1e-8);
  assert.ok(DEVELOPER_BAT.turbo > DEVELOPER_BAT.boost * 3);
  assert.ok(Math.abs(travel({ turbo: true, boost: true }) - DEVELOPER_BAT.turbo * .1) < 1e-8);
  assert.ok(Math.abs(travel({ boost: true }) - DEVELOPER_BAT.boost * .1) < 1e-8, 'Releasing Tab while Shift remains held restores Shift pace');
  assert.ok(Math.abs(travel({}) - DEVELOPER_BAT.speed * .1) < 1e-8, 'Turbo is not a toggle');
});

test('Turbo respects pause, diagonal normalization, bounds and thin terrain barriers', () => {
  const bat = createDeveloperBat({ heightAt: () => 0, bounds: { minX: -50, maxX: 50, minZ: -50, maxZ: 50 } });
  bat.start({ x: 0, y: 30, z: 0 });
  const before = bat.view(); bat.tick(.1, { dx: 1, dz: 1, turbo: true, playing: false });
  assert.deepEqual(bat.view(), before);
  bat.tick(.1, { dx: 1, dz: 1, turbo: true });
  assert.ok(Math.abs(Math.hypot(bat.view().position.x, bat.view().position.z) - DEVELOPER_BAT.turbo * .1) < 1e-8);
  for (let i = 0; i < 10; i++) bat.tick(.2, { dx: 1, dz: 1, turbo: true });
  assert.equal(bat.view().position.x, 50); assert.equal(bat.view().position.z, 50);
  const ridge = createDeveloperBat({ heightAt: x => x > 2.2 && x < 2.8 ? 60 : 0 });
  ridge.start({ x: 0, y: 0, z: 0 });
  for (let i = 0; i < 5; i++) ridge.tick(.2, { dx: 1, turbo: true });
  assert.ok(ridge.view().position.x < 2.2, 'High speed must not tunnel through a narrow cliff');
  assert.equal(ridge.view().position.y, DEVELOPER_BAT.clearance);
});

test('The developer bat climbs above high mountain summits before crossing and lands on them', () => {
  // Higher than East Lotharn's current 421 m top, leaving headroom for terrain edits.
  const summit = 460, bat = createDeveloperBat({ heightAt: x => x < 2 ? 0 : summit });
  bat.start({ x: 0, y: 400, z: 0 });
  for (let i = 0; i < 10; i++) bat.tick(.1, { dx: 1, turbo: true });
  assert.ok(bat.view().position.x < 2, 'a tall face blocks flight below its summit');
  assert.equal(bat.view().position.y, 400, 'horizontal movement never snaps upward through rock');
  for (let i = 0; i < 50; i++) bat.tick(.1, { lift: 1 });
  assert.ok(bat.view().position.y > summit + DEVELOPER_BAT.clearance, 'manual ascent can clear the high country');
  bat.tick(.1, { dx: 1 });
  assert.ok(bat.view().position.x > 2, 'the high summit can now be crossed');
  assert.equal(bat.requestLanding().ok, true);
  bat.tick(.05);
  assert.ok(bat.active && bat.view().position.y > summit, 'landing descends physically');
  for (let i = 0; i < 100 && bat.active; i++) bat.tick(.05);
  assert.equal(bat.active, false);
  assert.equal(bat.view().position.y, summit);
});


test('breath aiming rotates a hovering dragon without moving it or changing ordinary travel steering', () => {
  const bat = createDeveloperBat({ heightAt: () => 0 });
  bat.start({ x: 0, y: 15, z: 0 }, 0);
  for (let i = 0; i < 30; i++) bat.tick(.05, { aimYaw: Math.PI / 2 });
  assert.ok(Math.abs(bat.view().yaw - Math.PI / 2) < .001);
  assert.deepEqual(bat.view().position, { x: 0, y: 15, z: 0 });
  const before=bat.view();bat.tick(.1, { aimYaw: -Math.PI / 2, playing: false });
  assert.deepEqual(bat.view(),before);
  for (let i = 0; i < 30; i++) bat.tick(.05, { dz: 1 });
  assert.ok(Math.abs(bat.view().yaw) < .001);
  assert.ok(bat.view().position.z > 30);
});
