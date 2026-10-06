import test from 'node:test';
import assert from 'node:assert/strict';
import { createPeninsulaLandingQuest, peninsulaCompanyStamp } from '../src/content/chapters/prologue/peninsula-company.js';
import { createPeninsulaTutorial, PENINSULA_TUTORIAL_ANCHORS as A, PENINSULA_CHRIS_TASKS } from '../src/content/chapters/prologue/peninsula-tutorial.js';
import { createMercenaryCompany, distanceAlongRoad, arrivalTime, CROMB } from '../src/gameplay/company/mercenaries.js';

const road = [{ x: A.tidehavenWait.x, z: A.tidehavenWait.z + 10 }, A.tidehavenWait,
  { x: A.tidehavenWait.x - 60, z: A.tidehavenWait.z }, { x: A.tidehavenWait.x - 300, z: A.tidehavenWait.z - 20 }];
const graduate = (tutorial, clock) => {
  for (const [id, actions] of [
    ['inventory', [['inspect-sandwich', 1]]], ['walking', [['walk', 4], ['arrive', 1]]],
    ['running', [['run', 6], ['recover', 2]]], ['combat', [['strike', 2], ['guard', 1.5], ['dodge', 1]]],
    ['cartography', [['open-map', 1]]], ['swimming', [['swim', 4], ['buoy', 1], ['exit', 1]]],
    ['fishing', [['catch', 1]]], ['cooking', [['cook', 1]]],
  ]) { assert.equal(tutorial.introduce(id).ok, true); for (const [action, amount] of actions) tutorial.practice(id, action, amount); }
  assert.equal(tutorial.signOff(clock).ok, true);
};
const companyFor = adapter => createMercenaryCompany({ road, landing: road[0], muster: road.at(-1), wild: false,
  landingQuest: adapter, arrivalStartedAt: adapter.arrivalStartedAt });

test('the company displays every actual tutorial pose and waits in Tidehaven until the player graduates', () => {
  const tutorial = createPeninsulaTutorial(); tutorial.choose('tutorial');
  const adapter = createPeninsulaLandingQuest({ read: () => tutorial.view(), road });
  const company = companyFor(adapter), activities = new Set();
  let clock = 0, sawWalkHome = false;
  const initialSignature = adapter.signature;
  for (; clock < 1000; clock += .25) {
    tutorial.update(.25, { playSeconds: clock });
    const q = tutorial.view(), view = adapter.view(clock), placed = adapter.placement(clock);
    assert.deepEqual({ x: placed.x, z: placed.z }, q.chris.at, 'the clock does not invent a new placement');
    assert.equal(view.trained, false, 'the route driver cannot steal unfinished training or the waiting actor');
    assert.equal(adapter.signature, initialSignature, 'normal walking needs no company reconstruction');
    const current = company.placements(clock).find(p => p.id === adapter.id);
    assert.deepEqual({ x: current.x, z: current.z }, q.chris.at);
    activities.add(view.activity);
    if (q.chris.trained && q.chris.task === PENINSULA_CHRIS_TASKS.length - 1) {
      sawWalkHome = true; assert.equal(view.stage, 'walk-to-tidehaven');
    }
    if (q.chris.name === 'waiting-in-tidehaven') break;
  }
  assert.ok(sawWalkHome && clock < 1000);
  for (const activity of ['walking', 'running', 'striking', 'guarding', 'dodging', 'reading', 'swimming', 'fishing', 'cooking', 'waiting'])
    assert.ok(activities.has(activity), activity);
  const waiting = adapter.placement(clock);
  assert.equal(adapter.departureAt, Infinity); assert.equal(adapter.arrivalStartedAt, null);
  assert.equal(adapter.partnership(clock).reason, 'player-training');
  tutorial.update(.25, { playSeconds: clock + 10000 });
  assert.deepEqual(adapter.placement(clock + 10000), waiting, 'idling never releases the waiting recruit');
  assert.equal(company.placements(clock + 10000).find(p => p.id === 'merc-word').phase, 'coming');
  assert.equal(arrivalTime(clock + 10000, adapter.arrivalStartedAt), -1);
  graduate(tutorial, clock + 10000);
  assert.equal(adapter.arrivalStartedAt, clock + 10000);
  assert.equal(adapter.departureAt, Infinity, 'the saved departure is issued by the next live routine tick');
  const departurePosition = { ...tutorial.view().chris.at };
  tutorial.update(.1, { playSeconds: clock + 10000.1 });
  assert.equal(adapter.departureAt, clock + 10000.1);
  assert.equal(adapter.view(clock).trained, true); assert.equal(adapter.placement(clock), null);
  assert.deepEqual(adapter.view(clock).at, departurePosition, 'handing over does not move the actor to a projected road point');
  assert.equal(adapter.roadDistance, distanceAlongRoad(road, departurePosition));
  assert.equal(adapter.partnership(clock, { playerTrained: true }).ok, true);
});

test('Ed starts at sign-off even when Chris is still doing his own tutorial, and restoration preserves both events', () => {
  const tutorial = createPeninsulaTutorial(); tutorial.choose('tutorial');
  graduate(tutorial, 80);
  const adapter = createPeninsulaLandingQuest({ read: () => tutorial.view(), road });
  assert.equal(adapter.arrivalStartedAt, 80); assert.equal(adapter.departureAt, Infinity);
  assert.equal(arrivalTime(91, adapter.arrivalStartedAt), 11);
  const arriving = companyFor(adapter);
  assert.notEqual(arriving.placements(141).find(p => p.id === 'merc-word').phase, 'coming');
  assert.equal(adapter.view(141).trained, false);
  for (let clock = 80; clock < 1000 && !Number.isFinite(adapter.departureAt); clock += .25)
    tutorial.update(.25, { playSeconds: clock });
  assert.ok(adapter.departureAt > 80);
  assert.equal(adapter.arrivalStartedAt, 80);
  const saved = tutorial.snapshot(), restored = createPeninsulaTutorial(); assert.equal(restored.restore(saved), true);
  const copy = createPeninsulaLandingQuest({ read: () => restored.view(), road });
  assert.equal(copy.signature, adapter.signature); assert.equal(copy.departureAt, adapter.departureAt);
  assert.equal(copy.arrivalStartedAt, 80); assert.deepEqual(copy.view(1000), adapter.view(1000));
  const rebuilt = companyFor(copy);
  assert.equal(rebuilt.placements(copy.departureAt + .5).find(p => p.id === copy.id).phase, 'walking');
});

test('Cromb occupies the companion slot when Chris is the player and the bridge never creates a duplicate', () => {
  const tutorial = createPeninsulaTutorial(); tutorial.choose('skip', 0);
  const adapter = createPeninsulaLandingQuest({ read: () => tutorial.view(), road, id: CROMB.id, name: CROMB.name });
  assert.equal(adapter.id, 'merc-cromb'); assert.equal(adapter.placement(0).id, 'merc-cromb');
  assert.equal(adapter.placement(0).name, 'Cromb the Barbarian');
  const before = adapter.signature;
  tutorial.update(.1, { playSeconds: 15.1 });
  assert.notEqual(adapter.signature, before);
  assert.equal(adapter.view(.1).id, 'merc-cromb'); assert.equal(adapter.arrivalStartedAt, 15);
  assert.equal(adapter.partnership(.1, { withTraveler: true }).reason, 'together');
  assert.notEqual(peninsulaCompanyStamp(tutorial.view(), 'merc-gotwood'), adapter.signature);
});
