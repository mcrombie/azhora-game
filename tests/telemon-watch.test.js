import test from 'node:test';
import assert from 'node:assert/strict';
import { createTelemonWatch, passMouths, validTelemonWatchState, TELEMON_LINES, WATCH } from '../src/content/regions/telemonia/telemon-watch.js';

// A country that is the band -100 < z < 100, with a pass mouth on each of its two edges.
const inside = (x, z) => Math.abs(z) < 100;
const MOUTHS = [
  { id: 'north', name: 'The north pass', x: 0, z: 99.5, stand: { x: 0, z: 97.3 } },
  { id: 'south', name: 'The south pass', x: 0, z: -99.5, stand: { x: 0, z: -97.3 } },
];
const watch = () => createTelemonWatch({ mouths: MOUTHS, insideTelemonia: inside });
const man = (id, x, z, yaw = 0) => ({ id, x, z, yaw, kind: 'man' });
const woman = (id, x, z, yaw = 0) => ({ id, x, z, yaw, kind: 'woman' });
const clean = { version: 1, walkedOut: 0, fights: 0 };

function stepTo(p, goal, speed, dt = .1) {
  const d = Math.hypot(goal.x - p.x, goal.z - p.z), step = Math.min(d, speed * dt);
  if (d > 1e-9) { p.x += (goal.x - p.x) / d * step; p.z += (goal.z - p.z) / d * step; }
}
/** The host's half: walk the escort where the watch says, facing the traveler. */
function follow(watchers, r, traveler) {
  const escort = watchers.find(w => w.id === r.escortId);
  if (!escort || !r.escortTo) return;
  stepTo(escort, r.escortTo, WATCH.pace);
  escort.yaw = Math.atan2(traveler.x - escort.x, traveler.z - escort.z);
}
/** Tick a tenth of a second at a time; `input` may be a function of the tick. */
function run(w, seconds, input) {
  const out = { lines: [], joined: [], phases: new Set(), last: null };
  for (let i = 0; i < Math.round(seconds * 10); i++) {
    const r = w.update(.1, typeof input === 'function' ? input(i) : input);
    if (r.line) out.lines.push(r.line);
    out.joined.push(...r.joined); out.phases.add(r.phase); out.last = r;
  }
  return out;
}
/** A traveler seen in the open at (0, 8), walked up to and turned round by the one watcher there. */
function turnedRound() {
  const w = watch(), traveler = { x: 0, z: 8 }, watchers = [man('a', 0, 0)];
  let r;
  for (let i = 0; i < 100 && r?.phase !== 'escorting'; i++) { r = w.update(.1, { traveler, watchers }); follow(watchers, r, traveler); }
  assert.equal(r.phase, 'escorting');
  return { w, traveler, watchers, r };
}

test('unseen while out of sight, or sneaking where a watcher is not looking', () => {
  const w = watch(), a = man('a', 0, 0);
  let r = run(w, 10, { traveler: { x: 0, z: 8 }, watchers: [a], lineOfSight: () => false }).last;
  assert.equal(r.phase, 'unseen'); assert.equal(r.suspicion, 0); assert.equal(r.escortId, null);
  r = run(w, 10, { traveler: { x: 0, z: -6, sneaking: true }, watchers: [a] }).last;
  assert.equal(r.phase, 'unseen', 'behind him is out of his sight');
  r = run(w, 1, { traveler: { x: 0, z: 8, sneaking: true }, watchers: [a] }).last;
  assert.equal(r.phase, 'unseen', 'a moment in his sightline, sneaking, is not yet enough');
  assert.ok(r.suspicion > 0 && r.suspicion < 1);
});

test('noticed in the open: the nearest who has noticed him comes, calls out, and he is bound for the nearest mouth', () => {
  const w = watch(), traveler = { x: 0, z: 8 };
  // `behind` is nearest of all but faces away; `near` has noticed and is nearer than `far`.
  const watchers = [man('far', 0, 0), man('near', 3, 4), man('behind', 0, 10)];
  const { last: r, lines } = run(w, 1.5, { traveler, watchers });
  assert.equal(r.phase, 'noticed'); assert.equal(r.escortId, 'near'); assert.equal(r.mouth.id, 'north');
  assert.deepEqual(lines.map(l => [l.speaker, l.event]), [['near', 'notice']]);
  assert.ok(TELEMON_LINES.notice.includes(lines[0].text));
  assert.ok(Math.abs(Math.hypot(r.escortTo.x - traveler.x, r.escortTo.z - traveler.z) - WATCH.escortGap) < 1e-9, 'he comes to speaking distance');
  assert.equal(run(watch(), 1.5, { traveler: { x: 0, z: -8 }, watchers: [man('a', 0, 0, Math.PI)] }).last.mouth.id, 'south');
  // Before the escort has reached him, losing every watcher's eye is getting away.
  const lost = run(w, 3, { traveler, watchers, lineOfSight: () => false }).last;
  assert.equal(lost.phase, 'unseen'); assert.equal(lost.escortId, null);
});

test('walked to the nearest pass mouth and released there; nobody follows past the border', () => {
  const { w, traveler, watchers, r: turned } = turnedRound();
  assert.equal(turned.escortId, 'a'); assert.equal(turned.line.event, 'turn');
  assert.ok(TELEMON_LINES.turn.includes(turned.line.text));
  let r, released = null;
  const lines = [];
  for (let i = 0; i < 2000 && traveler.z < 101; i++) {
    stepTo(traveler, { x: 0, z: 101 }, 1.5);
    r = w.update(.1, { traveler, watchers });
    if (r.line) lines.push(r.line.event);
    if (r.phase === 'escorting') {
      assert.equal(r.escortId, 'a'); assert.equal(r.mouth.id, 'north');
      assert.ok(inside(r.escortTo.x, r.escortTo.z), 'the escort never steps outside');
      if (!r.released) assert.ok(r.escortTo.z < traveler.z, 'the escort walks behind him, on the inward side');
      else { assert.deepEqual(r.escortTo, MOUTHS[0].stand, 'released, the escort holds at the mouth'); released ??= { ...traveler }; }
    }
    follow(watchers, r, traveler);
  }
  assert.ok(released && Math.hypot(released.x - MOUTHS[0].x, released.z - MOUTHS[0].z) <= WATCH.releaseRadius);
  assert.deepEqual(lines, ['release'], 'walking steadily out earns no warning');
  assert.equal(r.phase, 'outside'); assert.equal(r.escortId, null); assert.equal(r.escortTo, null);
  assert.equal(r.walkedOut, 1); assert.equal(r.fights, 0);
  const waiting = run(w, 5, { traveler: { x: 0, z: 101 }, watchers });
  assert.deepEqual([...waiting.phases], ['outside']); assert.deepEqual(waiting.lines, []);
  // Coming back in, in sight of the escort who walked him out, is a fight at once.
  r = w.update(.1, { traveler: { x: 0, z: 99 }, watchers });
  assert.equal(r.phase, 'hostile'); assert.equal(r.cause, 'returned'); assert.equal(r.line.event, 'returned');
  assert.deepEqual(r.fighters, ['a']);
});

test('spoken to on the walk out, only the escort answers - who they are, then why - and asking is not resisting and moves no clock', () => {
  // Nobody answers while he is unseen, or while the one who saw him is still coming.
  const w = watch(), traveler = { x: 0, z: 8 }, watchers = [man('a', 0, 0)];
  assert.equal(w.ask('a'), null);
  run(w, 1.5, { traveler, watchers });
  assert.equal(w.view().phase, 'noticed'); assert.equal(w.ask('a'), null, 'not until he is turned round');
  // Turned round: the escort answers twice, in order, and then says nothing; nobody else answers at all.
  const walk = turnedRound();
  const asked = [walk.w.ask('b'), walk.w.ask('a'), walk.w.ask(undefined), walk.w.ask('a'), walk.w.ask('a')];
  assert.deepEqual(asked.map(a => a?.text ?? null), [null, TELEMON_LINES.answer[0], null, TELEMON_LINES.answer[1], null]);
  assert.deepEqual([asked[1].speaker, asked[1].event], ['a', 'answer']);
  assert.ok(TELEMON_LINES.answer.length <= 2 && TELEMON_LINES.answer.every(line => line.split(' ').length <= 8), 'one or two curt answers');
  assert.equal(walk.w.view().phase, 'escorting');
  // Standing still to ask, the dawdle clock runs as it would anyway: warned and fought at the same moment, asked or not.
  const moment = (pair, ask) => { const out = []; for (let i = 0; i < (WATCH.dawdleSeconds + 1) * 10; i++) { if (ask && i % 5 === 0) pair.w.ask('a');
    const r = pair.w.update(.1, { traveler: pair.traveler, watchers: pair.watchers }); if (r.line) out.push([i, r.line.event]); } return out; };
  const quiet = moment(turnedRound(), false), talking = moment(turnedRound(), true);
  assert.deepEqual(talking, quiet); assert.deepEqual(quiet.map(([, e]) => e), ['dawdle', 'fight']);
  // Walking steadily out and asking on the way: no warning, released at the mouth, walked out once, never a fight.
  const out = turnedRound(), events = [];
  let r;
  for (let i = 0; i < 2000 && out.traveler.z < 101; i++) {
    stepTo(out.traveler, { x: 0, z: 101 }, 1.5);
    if (i % 20 === 0) out.w.ask('a');
    r = out.w.update(.1, { traveler: out.traveler, watchers: out.watchers });
    if (r.line) events.push(r.line.event);
    follow(out.watchers, r, out.traveler);
  }
  assert.deepEqual(events, ['release']); assert.equal(r.phase, 'outside'); assert.deepEqual([r.walkedOut, r.fights], [1, 0]);
  // A new walk out is a new escort's few words.
  assert.equal(out.w.ask('a'), null, 'outside, nobody answers');
});

test('standing still too long is resisting, after one warning', () => {
  const { w, traveler, watchers } = turnedRound();
  const { lines, last } = run(w, WATCH.dawdleSeconds + 1, { traveler, watchers });
  assert.deepEqual(lines.map(l => l.event), ['dawdle', 'fight']);
  assert.equal(last.phase, 'hostile'); assert.equal(last.cause, 'dawdle'); assert.deepEqual(last.fighters, ['a']);
});

test('walking further in is resisting, after one warning', () => {
  const { w, traveler, watchers } = turnedRound();
  const { lines, last } = run(w, 6, () => { stepTo(traveler, { x: 0, z: -90 }, 3); return { traveler, watchers }; });
  assert.deepEqual(lines.map(l => l.event), ['stray', 'fight']);
  assert.equal(last.phase, 'hostile'); assert.equal(last.cause, 'stray');
});

test('a weapon in hand counts once he is turned round; striking a Telemon is a fight at once, seen or not', () => {
  const w = watch(), traveler = { x: 0, z: 8, armed: true }, watchers = [man('a', 0, 0)];
  let r = run(w, 1.5, { traveler, watchers }).last;
  assert.equal(r.phase, 'noticed', 'he may still put it away while the escort comes');
  for (let i = 0; i < 50 && r.phase === 'noticed'; i++) { r = w.update(.1, { traveler, watchers }); follow(watchers, r, traveler); }
  assert.equal(r.phase, 'hostile'); assert.equal(r.cause, 'armed'); assert.equal(r.line.event, 'fight');
  r = watch().update(.1, { traveler: { x: 0, z: -6, attacking: true }, watchers: [man('a', 0, 0)] });
  assert.equal(r.phase, 'hostile'); assert.equal(r.cause, 'attack'); assert.deepEqual(r.fighters, ['a']);
});

test('in a fight everyone in earshot joins, nobody beyond it, and field people never', () => {
  const w = watch(), traveler = { x: 0, z: 0 };
  const watchers = [man('a', 0, 10), woman('w', 30, 0), man('edge', 0, -64), man('far', 66, 0), man('distant', -120, 0),
    { id: 'field', x: 5, z: 0, yaw: -Math.PI / 2, kind: 'field' }];
  let r = w.update(.1, { traveler: { ...traveler, attacking: true }, watchers });
  assert.deepEqual([...r.fighters].sort(), ['a', 'edge', 'w']); assert.deepEqual([...r.joined].sort(), ['a', 'edge', 'w']);
  assert.equal(r.line.speaker, 'a');
  watchers[3].x = 60;
  r = w.update(.1, { traveler, watchers });
  assert.deepEqual(r.joined, ['far'], 'whoever comes within earshot while it lasts joins');
  r = w.update(.1, { traveler, watchers });
  assert.deepEqual(r.joined, []); assert.equal(r.fighters.length, 4);
  // With nobody left in earshot the fight is over, but the next sighting is another.
  const calm = run(w, WATCH.calmSeconds + .5, { traveler, watchers: [] }).last;
  assert.equal(calm.phase, 'unseen'); assert.deepEqual(calm.fighters, []); assert.equal(calm.fights, 1);
  assert.equal(run(w, 1.5, { traveler, watchers: [man('b', 0, -8)] }).last.cause, 'returned');
});

test('field people never notice; women notice, escort and join like men', () => {
  const field = run(watch(), 20, { traveler: { x: 0, z: 1 }, watchers: [{ id: 'f', x: 0, z: 0, yaw: 0, kind: 'field' }] }).last;
  assert.equal(field.phase, 'unseen'); assert.equal(field.suspicion, 0);
  const w = watch(), traveler = { x: 0, z: 8 }, watchers = [woman('w', 0, 0)];
  const r = run(w, 1.5, { traveler, watchers }).last;
  assert.equal(r.phase, 'noticed'); assert.equal(r.escortId, 'w');
  const fight = w.update(.1, { traveler: { ...traveler, attacking: true }, watchers: [...watchers, man('m', 20, 0)] });
  assert.deepEqual([...fight.fighters].sort(), ['m', 'w']);
});

test('leaving the country ends the pursuit, and the standing is remembered', () => {
  const w = watch(), watchers = [man('a', 0, 90)];
  let r = w.update(.1, { traveler: { x: 0, z: 95, attacking: true }, watchers });
  assert.equal(r.phase, 'hostile');
  r = w.update(.1, { traveler: { x: 0, z: 101 }, watchers });
  assert.equal(r.phase, 'outside'); assert.deepEqual(r.fighters, []); assert.deepEqual(r.joined, []); assert.equal(r.line, null);
  const away = run(w, 5, { traveler: { x: 0, z: 101, attacking: true }, watchers });
  assert.deepEqual([...away.phases], ['outside']); assert.deepEqual(away.joined, []);
  assert.deepEqual(w.snapshot(), { ...clean, fights: 1 });
});

test('seen inside again after being walked out is a fight at once; sneaking in unseen is still possible', () => {
  const w = watch();
  assert.equal(w.restore({ ...clean, walkedOut: 1 }), true);
  const sneak = run(w, 10, { traveler: { x: 0, z: -6, sneaking: true }, watchers: [man('a', 0, 0)] });
  assert.deepEqual([...sneak.phases], ['unseen']);
  const seen = run(w, 1.5, { traveler: { x: 0, z: 8 }, watchers: [man('a', 0, 0)] });
  assert.ok(!seen.phases.has('noticed'), 'nobody walks him out twice');
  assert.equal(seen.last.phase, 'hostile'); assert.equal(seen.last.cause, 'returned');
  assert.deepEqual(seen.lines.map(l => l.event), ['returned']);
});

test('snapshot and restore round-trip the standing; live phases are not saved', () => {
  const w = watch();
  assert.deepEqual(w.snapshot(), clean);
  w.update(.1, { traveler: { x: 0, z: 0, attacking: true }, watchers: [man('a', 0, 5)] });
  w.update(.1, { traveler: { x: 0, z: 120 }, watchers: [man('a', 0, 5)] });
  const saved = w.snapshot();
  assert.deepEqual(saved, { ...clean, fights: 1 }); assert.equal(validTelemonWatchState(saved), true);
  saved.fights = 99;
  assert.equal(w.snapshot().fights, 1, 'a snapshot is a copy');
  const copy = watch();
  assert.equal(copy.restore(JSON.parse(JSON.stringify(w.snapshot()))), true);
  assert.deepEqual(copy.snapshot(), w.snapshot());
  const { w: escorting } = turnedRound();
  assert.equal(escorting.restore(escorting.snapshot()), true);
  assert.equal(escorting.view().phase, 'unseen'); assert.equal(escorting.view().escortId, null);
  assert.deepEqual(escorting.reset(), escorting.view()); assert.deepEqual(escorting.snapshot(), clean);
});

test('a bad or missing saved state restores as clean', () => {
  const marked = { version: 1, walkedOut: 3, fights: 2 };
  for (const bad of [{}, [], 'saved', 7, { version: 2, walkedOut: 0, fights: 0 }, { version: 1, walkedOut: -1, fights: 0 },
    { version: 1, walkedOut: 1.5, fights: 0 }, { version: 1, walkedOut: 1 }, { version: 1, walkedOut: 0, fights: Infinity }]) {
    const w = watch();
    w.restore(marked);
    assert.equal(validTelemonWatchState(bad), false);
    assert.equal(w.restore(bad), false);
    assert.deepEqual(w.snapshot(), clean);
  }
  for (const missing of [undefined, null]) {
    const w = watch();
    w.restore(marked);
    assert.equal(w.restore(missing), true);
    assert.deepEqual(w.snapshot(), clean);
    assert.equal(run(w, 1.5, { traveler: { x: 0, z: 8 }, watchers: [man('a', 0, 0)] }).last.phase, 'noticed', 'clean means turned round, not fought');
  }
});

test('pausing stops the clock; the pass mouths come from the pass lines; no mouths is a wiring error', () => {
  const { w, traveler, watchers } = turnedRound();
  assert.equal(run(w, 30, { traveler, watchers, paused: true }).last.phase, 'escorting');
  const after = w.update(.1, { traveler, watchers });
  assert.equal(after.phase, 'escorting'); assert.equal(after.line, null);

  const pass = { id: 'p', name: 'The pass', points: [{ x: 0, z: 130 }, { x: 0, z: 110 }, { x: 0, z: 40 }] };
  const nowhere = { id: 'n', points: [{ x: 500, z: 500 }, { x: 510, z: 500 }] };
  const mouths = passMouths([pass, nowhere, { id: 'broken' }], (x, z) => 100 - z);
  assert.equal(mouths.length, 1);
  const [mouth] = mouths;
  assert.equal(mouth.id, 'p'); assert.equal(mouth.name, 'The pass');
  assert.ok(mouth.z < 100 && mouth.z >= 100 - WATCH.mouthStep, 'the first point inside the border');
  assert.ok(Math.abs(mouth.stand.z - (mouth.z - WATCH.escortGap)) < 1e-9, 'the escort stops a little further in');
  assert.ok(Object.isFrozen(mouths) && Object.isFrozen(mouth));
  assert.throws(() => createTelemonWatch({ insideTelemonia: inside }), TypeError);
});
