import test from 'node:test';
import assert from 'node:assert/strict';
import { createPeninsulaTutorial, validatePeninsulaTutorialSnapshot, PENINSULA_TUTORIAL_ANCHORS as A,
  PENINSULA_CHRIS_TASKS, insidePeninsulaTutorial, PENINSULA_FLIGHT_CEILING } from '../src/content/chapters/prologue/peninsula-tutorial.js';

function finishLessons(t) {
  t.introduce('inventory'); t.noteInventoryInspected();
  t.introduce('walking'); t.practice('walking', 'walk', 4); t.practice('walking', 'arrive');
  t.introduce('running'); t.practice('running', 'run', 6); t.practice('running', 'recover', 2);
  t.introduce('combat'); t.practice('combat', 'strike', 2); t.practice('combat', 'guard', 1.5); t.practice('combat', 'dodge');
  t.introduce('cartography'); t.practice('cartography', 'open-map');
  t.introduce('swimming'); t.practice('swimming', 'swim', 4); t.practice('swimming', 'buoy'); t.practice('swimming', 'exit');
  t.introduce('fishing'); t.noteCatch({ ok: true });
  t.introduce('cooking'); t.noteCook({ ok: true });
}
test('The player chooses once and hears lessons before performing their real exercises', () => {
  const events = [], t = createPeninsulaTutorial({ onEvent: e => events.push(e) });
  assert.equal(t.view().active, false); assert.equal(t.choose('tutorial', 8).ok, true);
  assert.equal(t.choose('skip').ok, false); assert.equal(t.signOff(9).ok, false);
  assert.equal(t.introduce('combat').ok, false); assert.equal(t.practice('walking', 'walk', 100), false);
  t.introduce('inventory'); t.introduce('inventory');
  assert.equal(events.filter(e => e.key === 'sandwich').length, 1);
  assert.equal(t.view().lessons.inventory.practiced, false);
  t.noteInventoryInspected(); assert.equal(t.view().next.id, 'walking');
  t.introduce('walking'); t.practice('walking', 'arrive');
  assert.equal(t.view().lessons.walking.practiced, false);
  t.practice('walking', 'walk', 4); t.practice('walking', 'arrive'); assert.equal(t.view().next.id, 'running');
  t.introduce('running'); t.practice('running', 'recover', 5); t.practice('running', 'run', 6);
  assert.equal(t.view().lessons.running.practiced, false);
  t.practice('running', 'recover', 2); assert.equal(t.view().next.id, 'combat');
});
test('Successful catching, cooking, guarded combat and the buoy are required before one letter event', () => {
  const events = [], t = createPeninsulaTutorial({ onEvent: e => events.push(e) }); t.choose('tutorial');
  finishLessons(t); assert.equal(t.view().canGraduate, true); assert.equal(t.view().completed, false);
  assert.equal(t.signOff(180).ok, true); assert.equal(t.signOff(190).ok, false);
  assert.equal(t.view().active, false); assert.equal(t.view().enlisted, false);
  assert.equal(events.filter(e => e.type === 'tutorial-signoff').length, 1);
  assert.equal(events.filter(e => e.item === 'tutorial-letter').length, 1);
  assert.equal(events.filter(e => e.item === 'cooked-fish').length, 0, 'Normal cooking itself grants the cooked fish.');
  assert.equal(t.enlist().ok, true); assert.equal(t.enlist().ok, false);
  assert.equal(events.filter(e => e.item === 'harbor-letter').length, 1);
  assert.equal(validatePeninsulaTutorialSnapshot(t.snapshot()), true);
});
test('Skipping grants only the baseline, starts after signoff and preserves a separate enlistment', () => {
  const events = [], t = createPeninsulaTutorial({ onEvent: e => events.push(e) }); t.choose('skip', 30);
  assert.equal(t.view().completed, true); assert.equal(t.view().enlisted, false);
  assert.equal(t.view().chris.name, 'waiting-in-tidehaven');
  assert.equal(events.filter(e => e.type === 'tutorial-signoff')[0].advanceMinutes, 15);
  assert.equal(t.view().signedOffAt, 45, 'Arrival is anchored after the shared clock advances.');
  assert.equal(events.filter(e => e.item === 'cooked-fish').length, 1);
  assert.equal(events.filter(e => e.item === 'raw-fish').length, 0);
  assert.equal(t.view().practice.walked, 0);
  const restored = createPeninsulaTutorial({ onEvent: () => assert.fail('Restore must not emit rewards') });
  assert.equal(restored.restore(t.snapshot()), true); assert.equal(restored.view().completed, true);
});
test('A failed catch or cooking attempt cannot complete a lesson and middle lessons may be reordered', () => {
  const t = createPeninsulaTutorial(); t.choose('tutorial'); finishLessons(t);
  const snap = t.snapshot();
  for (const id of ['cartography', 'swimming', 'fishing', 'cooking']) snap.lessons[id] = { introduced: false, practiced: false };
  snap.practice.catches = 0; assert.equal(t.restore(snap), true);
  assert.equal(t.introduce('cooking').ok, false); assert.equal(t.introduce('fishing').ok, true);
  assert.equal(t.noteCatch({ ok: false }), false); assert.equal(t.view().lessons.fishing.practiced, false);
  assert.equal(t.noteCatch({ ok: true }), true); assert.equal(t.introduce('cooking').ok, true);
  assert.equal(t.noteCook({ ok: false }), false); assert.equal(t.noteCook({ ok: true }), true);
  assert.equal(t.view().canGraduate, false);
});
test('Chris finishes independently through actual positions, and a blocked step never completes by elapsed time', () => {
  const events = [], t = createPeninsulaTutorial({ onEvent: e => events.push(e) }); t.choose('tutorial');
  for (let i = 0; i < 2000; i++) t.update(.1, { playSeconds: i / 10, moveChris: from => from });
  assert.equal(t.view().chris.task, 0); assert.equal(events.some(e => e.type === 'tutorial-signoff'), false);
  for (let i = 0; i < 4000 && t.view().chris.task < PENINSULA_CHRIS_TASKS.length; i++) t.update(.1, { playSeconds: 200 + i / 10 });
  assert.equal(t.view().chris.name, 'waiting-in-tidehaven');
  assert.equal(events.filter(e => e.type === 'tutorial-chris-task').length, PENINSULA_CHRIS_TASKS.length);
  assert.equal(events.some(e => e.type === 'tutorial-signoff'), false);
  assert.equal(events.some(e => e.type === 'tutorial-chris-depart'), false);
  finishLessons(t); t.signOff(800); t.update(.1, { playSeconds: 801 });
  assert.equal(t.view().chris.name, 'departed'); assert.equal(events.filter(e => e.type === 'tutorial-chris-depart').length, 1);
});
test('A safe swim does not trigger the creature; every water exit stages a visible defeat and preserves lessons', () => {
  const events = [], t = createPeninsulaTutorial({ onEvent: e => events.push(e) }); t.choose('tutorial');
  t.introduce('inventory'); t.noteInventoryInspected();
  assert.equal(t.boundary(A.jess, A.swimTurn, { swimming: true }).allowed, true);
  assert.equal(t.boundary(A.swimTurn, { x: 90, z: 10 }, { swimming: true }).encounter.kind, 'sea');
  for (let i = 0; i < 30; i++) t.update(.1);
  assert.equal(events.some(e => e.type === 'tutorial-boundary-defeat'), false, 'At least three visible seconds precede the lethal hit.');
  t.update(.2); assert.equal(events.filter(e => e.type === 'tutorial-boundary-defeat').length, 1);
  const saved = t.snapshot(); assert.equal(validatePeninsulaTutorialSnapshot(saved), true);
  const restored = createPeninsulaTutorial({ onEvent: e => events.push(e) }); restored.restore(saved);
  for (let i = 0; i < 16; i++) restored.update(.1);
  assert.equal(events.filter(e => e.type === 'tutorial-boundary-recover').length, 1);
  assert.equal(events.filter(e => e.type === 'tutorial-boundary-defeat').length, 1, 'Reload after the hit cannot attack twice.');
  assert.equal(restored.view().active, true); assert.equal(restored.view().lessons.inventory.practiced, true);
  assert.equal(restored.snapshot().boundary.encounter, null);
  assert.equal(events.filter(e => e.key === 'sandwich').length, 1);
});
test('Turbo and vertical flight are intercepted at their first boundary crossing; graduation releases every boundary', () => {
  for (const to of [{ x: 10000, z: 29, y: 30 }, { x: 200, z: 29, y: PENINSULA_FLIGHT_CEILING + 600 }]) {
    const t = createPeninsulaTutorial(); t.choose('tutorial');
    const result = t.boundary({ x: 200, z: 29, y: 30 }, to, { flight: true });
    assert.equal(result.encounter.kind, 'air'); assert.equal(insidePeninsulaTutorial(result.at, { flight: true }), true);
    assert.ok(Math.hypot(result.at.x - 200, result.at.z - 29) < 100);
  }
  const t = createPeninsulaTutorial(); t.choose('skip');
  assert.equal(t.boundary(A.arrival, { x: 5000, z: 5000, y: 500 }, { flight: true }).allowed, true);
});
test('Teleport and gate bypass are rejected during training, while old adventures remain untouched', () => {
  const events = [], t = createPeninsulaTutorial({ onEvent: e => events.push(e) }); t.choose('tutorial');
  assert.equal(t.canTravel(A.bear), true); assert.equal(t.canTravel({ x: -100, z: -100 }), false);
  assert.equal(t.boundary(A.graduation, { x: 70, z: -67 }).allowed, false);
  assert.equal(events.at(-1).type, 'tutorial-boundary-return');
  const old = createPeninsulaTutorial(); assert.equal(old.restore(undefined), true);
  assert.equal(old.view().path, 'legacy'); assert.equal(old.canTravel({ x: -100, z: -100 }), true);
  assert.equal(old.choose('tutorial').ok, false);
});
test('Malformed saves cannot fabricate a signoff, change active state or retain invalid encounter positions', () => {
  const t = createPeninsulaTutorial(); t.choose('tutorial'); const good = t.snapshot();
  for (const mutate of [s => s.signedOffAt = 3, s => s.lessons.walking.practiced = true,
    s => s.chris.at.x = Infinity, s => s.chris.task = 100, s => s.enlisted = true,
    s => s.boundary.encounter = { kind: 'sea', at: { x: 1, z: 1 }, elapsed: 9 }]) {
    const bad = structuredClone(good); mutate(bad); assert.equal(t.restore(bad), false); assert.deepEqual(t.snapshot(), good);
  }
});


test('Saved boundary encounters require a finite visible position and unfinished tutorial ownership', () => {
  const model = createPeninsulaTutorial(); model.choose('tutorial');
  model.boundary({ ...A.arrival, y: 30 }, { x: 500, z: 53, y: 30 }, { flight: true });
  const good = model.snapshot(); assert.equal(validatePeninsulaTutorialSnapshot(good), true);
  for (const mutate of [s => s.boundary.encounter.at.y = NaN, s => delete s.boundary.encounter.at.y,
    s => s.boundary.encounter.at.y = PENINSULA_FLIGHT_CEILING + 1,
    s => s.boundary.encounter.at.x = 500, s => s.path = 'legacy', s => s.path = 'unchosen']) {
    const bad = structuredClone(good); mutate(bad); assert.equal(validatePeninsulaTutorialSnapshot(bad), false);
  }
  const skipped = createPeninsulaTutorial(); skipped.choose('skip'); const bad = skipped.snapshot();
  bad.boundary.encounter = good.boundary.encounter; assert.equal(validatePeninsulaTutorialSnapshot(bad), false);
});
