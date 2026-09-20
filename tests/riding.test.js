import test from 'node:test';
import assert from 'node:assert/strict';
import { createRiding, validateRidingSnapshot, steer, drive, dismountSpot, RIDE, RIDING_KEYS, RIDING_LESSON, DEVELOPER_HORSE_SPEED } from '../src/riding.js';

const open = () => true;
const yard = { x: -400, z: 230 };

test('a horse is granted once, mounted within reach, and never in a fight', () => {
  const events = [], riding = createRiding({ onEvent: event => events.push(event.type) });
  assert.equal(riding.owned, false);
  assert.match(riding.mount(yard).reason, /no horse/);
  assert.match(riding.whistle(yard).reason, /no horse/);
  assert.equal(riding.grant({ x: NaN, z: 0 }).ok, false);
  assert.equal(riding.grant(yard, 1.2).ok, true);
  assert.equal(riding.grant(yard).ok, false, 'one horse');
  assert.deepEqual(riding.horse, { x: -400, z: 230, yaw: 1.2 });

  assert.match(riding.mount({ x: -400 + RIDE.reach + .5, z: 230 }).reason, /whistle/);
  assert.match(riding.mount(yard, { fighting: true }).reason, /fight/);
  assert.match(riding.mount(yard, { busy: true }).reason, /Finish/);
  assert.equal(riding.mount({ x: -398, z: 231 }).ok, true);
  assert.equal(riding.mounted, true);
  assert.match(riding.mount(yard).reason, /already/);
  assert.match(riding.whistle(yard).reason, /on it/);
  assert.deepEqual(events, ['horse-granted', 'mounted']);
});

test('a horse walks faster than a man runs, canters at twice that, and turns like a horse', () => {
  assert.ok(RIDE.walk > 4.2 && RIDE.walk < 7.2 + 1 && RIDE.canter > 7.2 * 1.6 && RIDE.canter <= 15);
  assert.equal(createRiding().speed(false), RIDE.walk);
  assert.equal(createRiding().speed(true), RIDE.canter);
  // A quarter turn takes real time, longer at a canter, and never overshoots.
  let walk = 0, canter = 0, walkTime = 0, canterTime = 0;
  while (Math.abs(walk - Math.PI / 2) > 1e-6 && walkTime < 5) { walk = steer(walk, Math.PI / 2, 1 / 60); walkTime += 1 / 60; }
  while (Math.abs(canter - Math.PI / 2) > 1e-6 && canterTime < 5) { canter = steer(canter, Math.PI / 2, 1 / 60, true); canterTime += 1 / 60; }
  assert.ok(walkTime > .4 && walkTime < 1 && canterTime > walkTime * 1.4, `${walkTime.toFixed(2)} s and ${canterTime.toFixed(2)} s`);
  // The short way round, across the seam at pi.
  assert.ok(steer(3.1, -3.1, .1) > 3.1 || steer(3.1, -3.1, .1) < -3);
  // Pointed the wrong way it still moves, slowly; on the line it has all its gait.
  assert.equal(drive(0, 0), 1);
  assert.equal(drive(0, Math.PI), .3);
  assert.ok(drive(0, Math.PI / 3) > .49 && drive(0, Math.PI / 3) < .51);
});

test('the rider steps down on the near side, takes what room there is, and a fight unseats them regardless', () => {
  // Facing +z (yaw 0) the horse's left is +x.
  assert.deepEqual(dismountSpot({ x: 0, z: 0 }, 0, open), { x: 1.15, z: 0 });
  const onlyRight = (x) => x < 0;
  assert.ok(dismountSpot({ x: 0, z: 0 }, 0, onlyRight).x < 0);
  const behind = dismountSpot({ x: 0, z: 0 }, 0, (x, z) => Math.abs(x) < .1 && z < 0);
  assert.ok(behind.z < -1.5 && Math.abs(behind.x) < 1e-9);
  // Facing +x (yaw pi/2) the left is -z.
  const east = dismountSpot({ x: 0, z: 0 }, Math.PI / 2, open);
  assert.ok(Math.abs(east.x) < 1e-9 && Math.abs(east.z + 1.15) < 1e-9);
  assert.equal(dismountSpot({ x: 0, z: 0 }, 0, () => false), null);

  const riding = createRiding();
  riding.grant(yard); riding.mount(yard);
  assert.equal(riding.ride({ x: -380, z: 240 }, .5, 9), true);
  assert.equal(riding.pace, 9);
  assert.match(riding.dismount(() => false).reason, /no room/);
  assert.equal(riding.mounted, true);
  const forced = riding.unseat(() => false);
  assert.deepEqual([forced.ok, forced.forced, forced.position], [true, true, { x: -380, z: 240 }]);
  assert.equal(riding.mounted, false);
  assert.deepEqual(riding.horse, { x: -380, z: 240, yaw: .5 });
  riding.mount({ x: -380, z: 240 });
  const down = riding.dismount(open);
  assert.ok(down.ok && Math.hypot(down.position.x + 380, down.position.z - 240) > 1 && Math.hypot(down.position.x + 380, down.position.z - 240) < 1.3);
  assert.equal(riding.ride({ x: 0, z: 0 }, 0), false, 'a horse left standing is not carried about by the host');
});

test('it waits where it is left and comes to a whistle; out of earshot or blocked, it turns up behind the traveler', () => {
  const riding = createRiding();
  riding.grant(yard);
  assert.match(riding.whistle({ x: -399, z: 230 }).reason, /right here/);
  assert.equal(riding.update(1, { x: -300, z: 230 }, open), 0, 'uncalled, it stands');
  assert.deepEqual(riding.horse, { x: -400, z: 230, yaw: 0 });

  const traveler = { x: -340, z: 230 };
  assert.equal(riding.whistle(traveler).far, false);
  let seconds = 0, fastest = 0;
  while (riding.called && seconds < 30) { fastest = Math.max(fastest, riding.update(1 / 30, traveler, open)); seconds += 1 / 30; }
  assert.ok(seconds > 5 && seconds < 9, `${seconds.toFixed(1)} s to cover 60 m at a trot`);
  assert.ok(Math.abs(fastest - RIDE.trot) < .01);
  assert.ok(Math.abs(riding.distanceTo(traveler) - RIDE.halt) < .3);
  assert.ok(Math.abs(riding.horse.yaw - Math.PI / 2) < .05, 'it arrives facing the way it came');

  // Out of earshot: no long trot across the map.
  const far = { x: -340 + RIDE.earshot + 100, z: 230 };
  assert.equal(riding.whistle(far).far, true);
  riding.update(1 / 30, far, open);
  assert.ok(Math.abs(riding.distanceTo(far) - RIDE.arriveAt) < 1e-6);
  assert.ok(riding.horse.x < far.x, 'on the side it would have come from');

  // Walled in: after its patience runs out it finds the traveler anyway.
  riding.place(yard);
  const walled = (x, z) => Math.hypot(x - yard.x, z - yard.z) < .05 || Math.hypot(x - traveler.x, z - traveler.z) < 40;
  riding.whistle(traveler);
  for (let i = 0; i < 30 * (RIDE.patience + 1); i++) riding.update(1 / 30, traveler, walled);
  assert.ok(riding.distanceTo(traveler) <= RIDE.arriveAt + 1e-6, `it is ${riding.distanceTo(traveler).toFixed(1)} m away`);
  // Mounting cancels a call.
  riding.place(yard); riding.whistle(traveler); riding.mount(yard);
  assert.equal(riding.called, false);
});

test('saves keep the horse and its place; a rider is saved on the ground', () => {
  const riding = createRiding();
  assert.deepEqual(riding.snapshot(), { version: 1, owned: false, taught: false, horse: null });
  assert.equal(validateRidingSnapshot(riding.snapshot()), true);
  assert.equal(riding.teach(), false, 'nothing to teach without a horse');
  riding.grant(yard, .3);
  assert.equal(riding.teach(), true);
  assert.equal(riding.teach(), false);
  riding.mount(yard); riding.ride({ x: -350, z: 250 }, 1, 6);
  const saved = JSON.parse(JSON.stringify(riding.snapshot()));
  assert.deepEqual(saved, { version: 1, owned: true, taught: true, horse: { x: -350, z: 250, yaw: 1 } });
  const resumed = createRiding();
  assert.equal(resumed.restore(saved), true);
  assert.deepEqual([resumed.owned, resumed.taught, resumed.mounted, resumed.horse], [true, true, false, { x: -350, z: 250, yaw: 1 }]);

  assert.equal(validateRidingSnapshot(undefined), true);
  assert.equal(validateRidingSnapshot(undefined, { allowMissing: false }), false);
  const bounds = { minX: -1000, maxX: 100, minZ: -100, maxZ: 900 };
  assert.equal(validateRidingSnapshot(saved, { bounds }), true);
  for (const bad of [null, [], { ...saved, version: 2 }, { ...saved, horse: null }, { ...saved, owned: false }, { ...saved, horse: { x: 1, z: 2 } },
    { ...saved, horse: { x: 1, z: NaN, yaw: 0 } }, { ...saved, mounted: true }, { ...saved, taught: 'yes' }, { version: 1, owned: false, taught: true, horse: null }])
    assert.equal(validateRidingSnapshot(bad), false, JSON.stringify(bad));
  assert.equal(validateRidingSnapshot({ ...saved, horse: { x: 5000, z: 0, yaw: 0 } }, { bounds }), false);
  assert.equal(createRiding().restore({ ...saved, version: 9 }), false);
});

test('the keys are free ones and the lesson teaches every rule the player needs', () => {
  assert.deepEqual(RIDING_KEYS, { mount: 'KeyG', whistle: 'KeyH' });
  const lesson = RIDING_LESSON.join(' ');
  for (const needed of [/press G/i, /Shift/, /press H/i, /fight|steel/i, /graze|stand/i]) assert.match(lesson, needed);
});

test('the testing panel’s horse is faster, is flagged as a testing mount, and is never saved', () => {
  const riding = createRiding();
  assert.equal(riding.developerMount, false, 'an ordinary game has an ordinary horse');
  assert.equal(riding.speed(false), RIDE.walk);
  assert.equal(riding.speed(true), RIDE.canter);
  riding.setDeveloperMount(true);
  assert.equal(riding.developerMount, true);
  assert.equal(riding.speed(false), RIDE.walk * DEVELOPER_HORSE_SPEED);
  assert.equal(riding.speed(true), RIDE.canter * DEVELOPER_HORSE_SPEED);
  assert.ok(DEVELOPER_HORSE_SPEED > 1, 'and the constant is the only place the number lives');
  // It belongs to the session, not to the adventure: it is not in a snapshot, and a restore clears it.
  riding.grant(yard, 0);
  assert.ok(!('developerMount' in riding.snapshot()), 'the fast horse is not written down');
  const saved = riding.snapshot(), loaded = createRiding();
  loaded.setDeveloperMount(true);
  assert.equal(loaded.restore(saved), true);
  assert.equal(loaded.developerMount, false, 'a loaded adventure is never on the fast horse');
  assert.equal(loaded.speed(true), RIDE.canter);
  riding.setDeveloperMount(false);
  assert.equal(riding.speed(false), RIDE.walk, 'and the ordinary horse is unchanged by any of it');
});
