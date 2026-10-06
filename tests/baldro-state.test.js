import test from 'node:test';
import assert from 'node:assert/strict';
import { BALDRO_SERVICES, createBaldroState, normalizeBaldroCityId, validateBaldroSnapshot } from '../src/content/regions/baldro/baldro-state.js';

function finish(state, city) {
  state.accept(city);
  for (const site of BALDRO_SERVICES[city].siteIds) assert.equal(state.repair(city, site).ok, true);
  return state.report(city);
}

test('each Baldro kingdom requires its own completed service and guard report', () => {
  const state = createBaldroState();
  assert.equal(state.canEnter('west'), false);
  assert.equal(state.canEnter('east'), false);
  assert.equal(state.report('west').ok, false);
  assert.equal(state.repair('west', 'west-cairn-1').ok, false);
  state.accept('west');
  assert.equal(state.repair('west', 'east-sluice-1').ok, false);
  state.repair('west', 'west-cairn-1');
  state.repair('west', 'west-cairn-2');
  assert.equal(state.report('west').ok, false);
  assert.equal(state.canEnter('west'), false);
  state.repair('west', 'west-cairn-3');
  assert.equal(state.view('west').stage, 'report');
  assert.equal(state.canEnter('west'), false, 'completed work alone does not open a gate');
  assert.equal(state.report('west').changed, true);
  assert.equal(state.canEnter('west'), true);
  assert.equal(state.canEnter('east'), false, 'confederation membership does not share entry permission');
  assert.equal(state.view('east').stage, 'unoffered');
  assert.equal(finish(state, 'east').changed, true);
  assert.equal(state.canEnter('east'), true);
});

test('civic repairs need no inventory and duplicate interactions never duplicate rewards', () => {
  const events = [], state = createBaldroState({ onEvent: event => events.push(event) });
  const west = finish(state, 'west');
  assert.deepEqual(west.reward, { skill: 'construction', xp: 30 });
  for (let i = 0; i < 3; i++) {
    assert.equal(state.accept('west').changed, false);
    assert.equal(state.repair('west', 'west-cairn-2').changed, false);
    assert.equal(state.report('west').changed, false);
    assert.equal(state.report('west').reward, null);
  }
  assert.equal(events.filter(event => event.reward).length, 1);
  assert.equal(events.filter(event => event.action === 'repair').length, 3);
  assert.deepEqual(finish(state, 'east').reward, { skill: 'construction', xp: 30 });
  assert.equal(events.filter(event => event.reward).length, 2);
});

test('Baldro permissions and unfinished work survive a JSON checkpoint without replaying rewards', () => {
  const state = createBaldroState(); finish(state, 'west');
  state.accept('east'); state.repair('east', 'east-sluice-2');
  const saved = JSON.parse(JSON.stringify(state.snapshot())), events = [];
  assert.equal(validateBaldroSnapshot(saved), true);
  const restored = createBaldroState({ onEvent: event => events.push(event) });
  assert.equal(restored.restore(saved), true);
  assert.deepEqual(restored.snapshot(), saved);
  assert.equal(restored.canEnter('west'), true);
  assert.equal(restored.canEnter('east'), false);
  assert.equal(restored.report('west').reward, null);
  assert.deepEqual(restored.view('east').remaining, ['east-sluice-1', 'east-sluice-3']);
  assert.deepEqual(events, [], 'restore and repeated reports emit no new progress or reward');
  restored.repair('east', 'east-sluice-1'); restored.repair('east', 'east-sluice-3');
  assert.equal(restored.report('east').reward.xp, 30);
});

test('city and work-site ids normalize while unknown destinations cannot grant entry', () => {
  const state = createBaldroState();
  assert.equal(normalizeBaldroCityId(' West Baldro Mountains '), 'west');
  assert.equal(normalizeBaldroCityId('EAST_BALDRO'), 'east');
  assert.equal(state.accept('west-baldro').ok, true);
  assert.equal(state.repair('baldro-west', ' WEST_CAIRN_2 ').ok, true);
  assert.deepEqual(state.view('West Baldro Mountains').repaired, ['west-cairn-2']);
  for (const value of ['', 'Dwarfland', 'WestOremindi', null, {}, 2]) {
    assert.equal(state.canEnter(value), false);
    assert.equal(state.accept(value).ok, false);
    assert.equal(state.report(value).ok, false);
    assert.equal(state.view(value), null);
  }
});

test('malformed version-one progress is sanitized without creating unearned admission', () => {
  const state = createBaldroState();
  assert.equal(state.restore({ version: 1, cities: {
    'west-baldro': { accepted: true, repaired: ['WEST_CAIRN_1', 'west-cairn-1', 'east-sluice-2', {}, 'bad'], admitted: true },
    'east-baldro': { accepted: 'true', repaired: BALDRO_SERVICES.east.siteIds, admitted: true },
    invented: { accepted: true, admitted: true },
  } }), true);
  assert.deepEqual(state.snapshot().cities.west, { accepted: true, repaired: ['west-cairn-1'], admitted: false });
  assert.deepEqual(state.snapshot().cities.east, { accepted: false, repaired: [], admitted: false });
  assert.equal(state.canEnter('west'), false);
  assert.equal(state.canEnter('east'), false);
  assert.equal(validateBaldroSnapshot(state.snapshot()), true);
});

test('invalid snapshot envelopes leave live permissions untouched and older missing saves start locked', () => {
  const state = createBaldroState(); finish(state, 'east'); const before = state.snapshot();
  for (const data of [null, [], true, {}, { version: 2, cities: {} }, { version: 1, cities: [] }]) {
    assert.equal(state.restore(data), false);
    assert.deepEqual(state.snapshot(), before);
    assert.equal(validateBaldroSnapshot(data), false);
  }
  assert.equal(state.restore(undefined), true);
  assert.equal(state.canEnter('east'), false);
  assert.equal(validateBaldroSnapshot(undefined), true);
  assert.equal(validateBaldroSnapshot(undefined, { allowMissing: false }), false);
});

test('returned state and view objects cannot mutate Baldro permissions or repair progress', () => {
  const state = createBaldroState(); state.accept('west');
  const saved = state.snapshot(), view = state.view('west');
  saved.cities.west.repaired.push(...BALDRO_SERVICES.west.siteIds); saved.cities.west.admitted = true;
  view.repaired.push(...BALDRO_SERVICES.west.siteIds); view.remaining.length = 0;
  assert.equal(state.canEnter('west'), false);
  assert.deepEqual(state.view('west').repaired, []);
  assert.equal(state.report('west').ok, false);
  finish(state, 'west'); state.reset();
  assert.equal(state.canEnter('west'), false);
  assert.equal(state.view('west').stage, 'unoffered');
});

test('strict checkpoint validation rejects duplicate work and admission without complete accepted service', () => {
  const state = createBaldroState();
  const invalid = [
    { accepted: false, repaired: [], admitted: true },
    { accepted: true, repaired: ['west-cairn-1', 'west-cairn-1'], admitted: false },
    { accepted: true, repaired: ['east-sluice-1'], admitted: false },
    { accepted: false, repaired: [...BALDRO_SERVICES.west.siteIds], admitted: false },
    { accepted: true, repaired: ['west-cairn-1'], admitted: true },
  ];
  for (const city of invalid) { const snapshot = state.snapshot(); snapshot.cities.west = city; assert.equal(validateBaldroSnapshot(snapshot), false); }
});

test('the West Hold introduction earns admission before three forge operations and awards one guarded lesson exactly once', () => {
  const state = createBaldroState();
  assert.equal(state.introduction().stage, 'unoffered');
  assert.equal(state.introduction().active, false);
  for (const action of ['enterIntroduction', 'beginLesson', 'workForge', 'finishLesson']) assert.equal(state[action]().ok, false);
  state.acceptIntroduction();
  assert.equal(state.introduction().stage, 'service');
  assert.equal(state.view('west').accepted, true);
  assert.equal(state.view('east').accepted, false);
  assert.equal(state.beginLesson().ok, false);
  for (const site of BALDRO_SERVICES.west.siteIds) state.repair('west', site);
  assert.equal(state.introduction().stage, 'report');
  assert.equal(state.enterIntroduction().ok, false);
  assert.deepEqual(state.report('west').reward, { skill: 'construction', xp: 30 });
  assert.equal(state.introduction().stage, 'enter');
  state.enterIntroduction(); assert.equal(state.introduction().stage, 'smith');
  state.beginLesson(); assert.equal(state.introduction().stage, 'forge');
  for (const [index, action] of ['heat', 'fit-peen', 'quench'].entries()) {
    assert.equal(state.introduction().forgeAction, action);
    assert.equal(state.finishLesson().ok, false);
    const result = state.workForge();
    assert.equal(result.forgeAction, action);
    assert.equal(result.forgeStep, index + 1);
    assert.equal(result.reward, null);
    assert.equal(state.introduction().forgeStep, index + 1);
  }
  assert.equal(state.introduction().stage, 'reward');
  assert.equal(state.workForge().changed, false);
  const result = state.finishLesson();
  assert.deepEqual(result.rewards, [{ skill: 'smithing', xp: 45 }, { skill: 'dwarvenSmithing', xp: 30 }]);
  assert.deepEqual(result.lesson, { id: 'fitted-repair-rivet', name: 'Fitted repair rivet' });
  assert.equal(state.introduction().stage, 'complete');
  assert.equal(state.introduction().type, 'secondary');
  assert.equal(state.introduction().active, false);
  assert.equal(state.canEnter('east'), false);
  for (const action of ['acceptIntroduction', 'enterIntroduction', 'beginLesson', 'workForge', 'finishLesson']) {
    assert.equal(state[action]().changed, false); assert.deepEqual(state[action]().rewards, []);
  }
});

test('old admitted saves can take the first lesson without repeating civic work and a forge checkpoint resumes the remaining operation', () => {
  const old = createBaldroState(); finish(old, 'west');
  const legacy = old.snapshot(); delete legacy.introduction;
  assert.equal(validateBaldroSnapshot(legacy), true);
  const state = createBaldroState(); state.restore(legacy);
  assert.equal(state.introduction().stage, 'unoffered');
  state.acceptIntroduction(); assert.equal(state.introduction().stage, 'enter');
  assert.equal(state.beginLesson().changed, true, 'an admitted visitor may begin directly with the artisan');
  assert.equal(state.report('west').reward, null);
  state.workForge(); state.workForge();
  const saved = JSON.parse(JSON.stringify(state.snapshot())), events = [];
  assert.equal(validateBaldroSnapshot(saved), true);
  const resumed = createBaldroState({ onEvent: event => events.push(event) }); resumed.restore(saved);
  assert.deepEqual(events, []);
  assert.equal(resumed.introduction().forgeAction, 'quench');
  resumed.workForge(); assert.equal(resumed.finishLesson().rewards.length, 2);
  const complete = resumed.snapshot(); state.restore(complete);
  assert.equal(state.introduction().complete, true);
  assert.deepEqual(state.finishLesson().rewards, []);
});

test('introduction snapshots cannot invent work or a lesson before admission and the testing reset preserves the eastern record', () => {
  const state = createBaldroState(); finish(state, 'east');
  const east = state.snapshot().cities.east;
  const invented = state.snapshot();
  invented.introduction = { accepted: true, entered: true, lessonStarted: true, forgeStep: 3, completed: true };
  assert.equal(validateBaldroSnapshot(invented), false);
  state.restore(invented);
  assert.equal(state.introduction().stage, 'unoffered');
  assert.equal(state.finishLesson().ok, false);
  state.acceptIntroduction(); finish(state, 'west'); state.beginLesson();
  for (const forgeStep of [-1, 4, 1.5, '2', null]) {
    const bad = state.snapshot(); bad.introduction.forgeStep = forgeStep; bad.introduction.completed = true;
    assert.equal(validateBaldroSnapshot(bad), false);
    state.restore(bad); assert.equal(state.introduction().forgeStep, 0); assert.equal(state.introduction().complete, false);
  }
  const copy = state.snapshot(); copy.introduction.forgeStep = 3; copy.introduction.completed = true;
  assert.equal(state.introduction().forgeStep, 0, 'snapshots do not expose live quest state');
  state.resetIntroductionForTesting();
  assert.equal(state.canEnter('west'), false);
  assert.equal(state.introduction().stage, 'unoffered');
  assert.deepEqual(state.snapshot().cities.east, east);
});
