import test from 'node:test';
import assert from 'node:assert/strict';
import { createBrandyHome, validateBrandyHome, brandyRoutineAt, createJonHomeVisit, validateJonHomeVisit,
  BRANDY_HOME_PACE, JON_HOME_DELAY, JON_HOME_STAY } from '../src/content/quests/brandy/brandy-home.js';
import { createSaltSultan, JOHN, STAY, johnConversation } from '../src/content/quests/salt/salt-sultan.js';

const home = { door: { x: 0, z: 0 }, porch: { x: 2, z: 0 }, yaw: Math.PI / 2 };
const yard = { x: 10, z: 5, yaw: 0 }, pier = { x: 80, z: 0, yaw: -Math.PI / 2 };
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const move = (id, from, target, amount) => {
  const scale = Math.min(1, amount / (gap(from, target) || 1));
  return { x: from.x + (target.x - from.x) * scale, z: from.z + (target.z - from.z) * scale };
};
const makeBrandy = options => createBrandyHome({ home, yard, move, ...options });
const makeJon = options => createJonHomeVisit({ home, pier, move, ...options });
const until = (person, phase, options) => {
  for (let i = 0; i < 4000 && person.view().phase !== phase; i++) person.tick(.1, options);
  assert.equal(person.view().phase, phase);
};

test('Brandy works mornings and afternoons, goes indoors at midday and evening, and sleeps at night', () => {
  for (const [time, expected] of [[0, 'outdoors'], [359, 'outdoors'], [360, 'inside'], [479, 'inside'],
    [480, 'outdoors'], [720, 'inside'], [960, 'sleeping'], [1439, 'sleeping'], [1440, 'outdoors']])
    assert.equal(brandyRoutineAt(time), expected, `play second ${time}`);
  assert.equal(brandyRoutineAt(NaN), 'outdoors');
});

test('Brandy physically walks to the door before becoming hidden and walks back to the boards in the morning', () => {
  const brandy = makeBrandy();
  const before = brandy.view().position;
  const first = brandy.tick(.1, { playSeconds: 360 });
  assert.equal(first.phase, 'going-in'); assert.equal(first.hidden, false);
  assert.ok(gap(first.position, before) <= BRANDY_HOME_PACE * .1 + 1e-8);
  until(brandy, 'inside', { playSeconds: 360 });
  assert.ok(gap(brandy.view().position, home.door) < .12); assert.equal(brandy.view().hidden, true);
  const leaving = brandy.tick(.1, { playSeconds: 480 });
  assert.equal(leaving.phase, 'going-out'); assert.equal(leaving.hidden, false);
  assert.ok(gap(leaving.position, home.door) <= BRANDY_HOME_PACE * .1 + .12);
  until(brandy, 'outdoors', { playSeconds: 480 });
  assert.ok(gap(brandy.view().position, yard) < .12);
});

test('knocking brings an awake Brandy to the porch and she resumes her day when the visitor leaves', () => {
  const brandy = makeBrandy(); brandy.restore(undefined, { playSeconds: 360 });
  assert.equal(brandy.knock({ playSeconds: 360 }).ok, true);
  assert.equal(brandy.knock({ playSeconds: 360 }).ok, false, 'no repeated restarts');
  until(brandy, 'answering', { playSeconds: 360, player: { x: 4, z: 0 } });
  brandy.tick(20, { playSeconds: 380, player: { x: 4, z: 0 } });
  assert.equal(brandy.view().phase, 'answering');
  brandy.tick(12, { playSeconds: 392, player: { x: 90, z: 0 } });
  until(brandy, 'inside', { playSeconds: 392 });
  assert.equal(brandy.view().hidden, true);
});

test('a sleeping Brandy does not answer and a visitor cannot hold her outside through the night', () => {
  const brandy = makeBrandy(); brandy.restore(undefined, { playSeconds: 959 });
  assert.equal(brandy.knock({ playSeconds: 959 }).ok, true);
  until(brandy, 'answering', { playSeconds: 959, player: home.porch });
  until(brandy, 'sleeping', { playSeconds: 960, player: home.porch });
  assert.equal(brandy.view().hidden, true);
  const before = brandy.snapshot(), refused = brandy.knock({ playSeconds: 1000 });
  assert.equal(refused.ok, false); assert.match(refused.reason, /asleep/);
  assert.deepEqual(brandy.snapshot(), before);
  until(brandy, 'outdoors', { playSeconds: 1440 });
});

test('pauses and conversations stop the routine while a blocked movement adapter never teleports her', () => {
  const brandy = makeBrandy(), initial = brandy.snapshot();
  brandy.tick(1000, { playing: false, playSeconds: 960 });
  assert.deepEqual(brandy.snapshot(), initial);
  brandy.tick(1000, { busy: true, playSeconds: 960 });
  assert.deepEqual(brandy.snapshot(), initial);
  const teleporter = makeBrandy({ move: (id, from, target) => target });
  teleporter.tick(.1, { playSeconds: 360 });
  assert.deepEqual(teleporter.view().position, { x: yard.x, z: yard.z });
  const blocked = makeBrandy({ move: (id, from) => from });
  blocked.tick(1000, { playSeconds: 960 });
  assert.equal(blocked.view().hidden, false); assert.deepEqual(blocked.view().position, { x: yard.x, z: yard.z });
});

test('combat-displaced feet remain authoritative when Brandy and Jon recover', () => {
  const brandy = makeBrandy(), moved = { x: 15, z: 10 };
  brandy.tick(.1, { busy: true, position: moved, playSeconds: 0 });
  assert.deepEqual(brandy.view().position, moved);
  brandy.tick(.1, { playSeconds: 0 });
  assert.ok(gap(brandy.view().position, moved) <= BRANDY_HOME_PACE * .1 + 1e-8);
  const jon = makeJon(), salt = { phase: 'moored', port: 'tidehaven', clock: 0 };
  jon.tick(.1, { salt, busy: true, position: moved });
  assert.equal(jon.view().holdDeparture, true);
  jon.tick(.1, { salt });
  assert.ok(gap(jon.view().position, moved) <= BRANDY_HOME_PACE * .1 + 1e-8);
});

test('routine saves restore exact feet and missing legacy saves initialize at the correct time of day', () => {
  const brandy = makeBrandy(); brandy.tick(1, { playSeconds: 360 });
  const saved = brandy.snapshot(), loaded = makeBrandy();
  assert.equal(loaded.restore(saved), true); assert.deepEqual(loaded.snapshot(), saved);
  const bad = { ...saved, phase: 'sleeping' };
  assert.equal(loaded.restore(bad), false); assert.deepEqual(loaded.snapshot(), saved);
  assert.equal(validateBrandyHome(undefined), true);
  assert.equal(loaded.restore(undefined, { playSeconds: 1000 }), true);
  assert.equal(loaded.view().sleeping, true); assert.deepEqual(loaded.view().position, home.door);
  for (const record of [null, {}, { ...saved, position: { x: NaN, z: 0 } }, { ...saved, clock: -1 }])
    assert.equal(validateBrandyHome(record), false);
});

test('Jon walks home once during a Drent call, spends time there, and walks back before the ship sails', () => {
  const jon = makeJon(), salt = createSaltSultan({ start: { port: 'tidehaven' } });
  const phaseOrder = [], away = { x: 9000, z: 9000 };
  let previous = jon.view().phase;
  for (let t = 0; t < STAY + 2; t++) {
    const before = jon.view().position;
    const at = jon.tick(1, { salt: salt.snapshot() });
    if (at.managed) assert.ok(gap(before, at.position) <= BRANDY_HOME_PACE + 1e-8);
    if (at.phase !== previous) { phaseOrder.push(at.phase); previous = at.phase; }
    salt.update(1, away, { holdDeparture: at.holdDeparture, ashorePosition: at.position });
  }
  assert.deepEqual(phaseOrder, ['outbound', 'visiting', 'returning', 'docked']);
  assert.equal(salt.phase, 'departing');
  assert.ok(JON_HOME_DELAY > 0 && JON_HOME_STAY >= 60);
});

test('an obstructed or busy Jon keeps his ship waiting until he physically returns to the pier', () => {
  let obstructed = true;
  const jon = makeJon({ move: (...args) => obstructed ? args[1] : move(...args) });
  const salt = createSaltSultan({ start: { port: 'tidehaven', clock: STAY - 1 } });
  const far = { x: 9000, z: 9000 };
  for (let i = 0; i < 20; i++) {
    const at = jon.tick(1, { salt: salt.snapshot() });
    salt.update(1, far, { holdDeparture: at.holdDeparture });
  }
  assert.equal(salt.phase, 'moored'); assert.equal(jon.view().phase, 'outbound');
  const before = jon.snapshot(); jon.tick(100, { salt: salt.snapshot(), busy: true });
  assert.deepEqual(jon.snapshot(), before); assert.equal(jon.view().holdDeparture, true);
  obstructed = false;
  for (let i = 0; i < 1000 && salt.phase === 'moored'; i++) {
    const at = jon.tick(1, { salt: salt.snapshot() });
    salt.update(1, far, { holdDeparture: at.holdDeparture });
  }
  assert.equal(salt.phase, 'departing'); assert.ok(gap(jon.view().position, pier) < .12);
});

test('a Jon visit survives reload, pauses, and resets only after leaving the Drent port call', () => {
  const salt = { port: 'tidehaven', phase: 'moored', clock: 45 }, jon = makeJon();
  jon.tick(5, { salt }); const saved = jon.snapshot(), loaded = makeJon();
  assert.equal(loaded.restore(saved), true); loaded.tick(0, { salt });
  assert.equal(loaded.view().holdDeparture, true); assert.deepEqual(loaded.snapshot(), saved);
  loaded.tick(500, { salt, playing: false }); assert.deepEqual(loaded.snapshot(), saved);
  loaded.tick(1, { salt: { port: 'cobble', phase: 'moored', clock: 120 } });
  assert.equal(loaded.view().managed, false); assert.equal(loaded.view().started, false);
  assert.equal(validateJonHomeVisit(undefined), true);
  assert.equal(loaded.restore({ ...saved, phase: 'docked' }), false);
  assert.equal(loaded.restore({ ...saved, started: false }), false);
});

test('Jon quietly enters his own home on a night visit and leaves through the door before returning to sea', () => {
  const jon = makeJon(), options = { salt: { port: 'tidehaven', phase: 'moored', clock: 80 }, homeSleeping: true };
  until(jon, 'visiting', options);
  const porch = jon.view().position, entering = jon.tick(.1, options);
  assert.equal(entering.phase, 'entering'); assert.equal(entering.hidden, false);
  assert.ok(gap(entering.position, porch) <= BRANDY_HOME_PACE * .1 + 1e-8);
  until(jon, 'inside', options);
  assert.equal(jon.view().hidden, true); assert.equal(jon.view().holdDeparture, true);
  assert.ok(gap(jon.view().position, home.door) < .12);
  const loaded = makeJon(), saved = jon.snapshot();
  assert.equal(loaded.restore(saved), true); loaded.tick(0, options);
  assert.equal(loaded.view().hidden, true);
  loaded.tick(500, { ...options, playing: false }); assert.deepEqual(loaded.snapshot(), saved);
  loaded.tick(JON_HOME_STAY - .01, options); assert.equal(loaded.view().phase, 'inside');
  const comingOut = loaded.tick(.02, options);
  assert.equal(comingOut.phase, 'coming-out'); assert.equal(comingOut.hidden, false);
  assert.ok(gap(comingOut.position, home.door) <= BRANDY_HOME_PACE * .02 + .12);
  until(loaded, 'returning', options); until(loaded, 'docked', options);
  assert.equal(loaded.view().holdDeparture, false); assert.ok(gap(loaded.view().position, pier) < .12);
});

test('the salt ship uses the actual captain position for conversations without changing old port timers', () => {
  const salt = createSaltSultan({ start: { port: 'tidehaven', clock: STAY } }), captain = { x: -90, z: -100 };
  salt.update(1, captain, { ashorePosition: captain }); assert.equal(salt.phase, 'moored');
  salt.update(1, { x: 9000, z: 9000 }, { ashorePosition: captain }); assert.equal(salt.phase, 'departing');
  const quietPier = createSaltSultan({ start: { port: 'tidehaven' } });
  assert.equal(quietPier.update(1, quietPier.port.stand, { ashorePosition: captain }).some(e => e.type === 'heard'), false,
    'there is no disembodied shout from the quay while Jon is at home');
});

test('Jon identifies the cottage as his home and does not introduce himself as standing on the pier while visiting', () => {
  let opened;
  const salt = createSaltSultan({ start: { port: 'tidehaven' } });
  const context = { salt, homeVisit: { managed: true, phase: 'visiting' }, act() {}, closeDialogue() {},
    openDialogue(npc, lines, event, close, options) { opened = { lines, close, options }; } };
  assert.equal(JOHN.name, 'Jon');
  johnConversation({ id: JOHN.id }, context);
  assert.match(opened.lines.join(' '), /Brandy and Bosco/); assert.doesNotMatch(opened.lines.join(' '), /edge of the pier/);
  assert.equal(opened.close, 'Back to the yard');
  opened.options.choices.find(choice => choice.id === 'john-home').action();
  assert.match(opened.lines.join(' '), /rarely home/);
});
