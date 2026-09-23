import test from 'node:test';
import assert from 'node:assert/strict';
import { createLandingMateQuest, landingMatePartnership } from '../src/landing-mate-quest.js';
import { createMercenaryCompany } from '../src/mercenaries.js';

const geometry = {
  road: [{ x: 0, z: 0 }, { x: 0, z: -30 }, { x: -30, z: -30 }, { x: -30, z: -150 }],
  landing: { x: 0, z: 5 }, harbormaster: { x: 2, z: -5 }, instructor: { x: -26, z: -28 }, training: { x: -28, z: -33 },
};

test('the landing mate reports to Jojo, trains with Glun, and leaves on his own clock', () => {
  const quest = createLandingMateQuest(geometry);
  const activities = quest.timeline.map(leg => `${leg.stage}:${leg.activity}`);
  assert.deepEqual(activities, ['report-harbor:walking', 'report-harbor:talking', 'combat-training:walking', 'combat-training:talking',
    'combat-training:walking', 'combat-training:striking', 'combat-training:guarding', 'combat-training:dodging', 'combat-training:talking']);
  for (const leg of quest.timeline) {
    const seconds = (leg.begin + leg.end) / 2, view = quest.view(seconds), placed = quest.placement(seconds);
    assert.equal(view.stage, leg.stage); assert.equal(view.activity, leg.activity); assert.equal(view.trained, false);
    assert.ok(Number.isFinite(placed.x) && Number.isFinite(placed.z) && Number.isFinite(placed.yaw));
    assert.equal(placed.walking, leg.activity === 'walking');
    if (leg.activity === 'talking') assert.ok(view.speech.text);
  }
  assert.equal(quest.view(quest.departureAt - .001).trained, false);
  assert.equal(quest.view(quest.departureAt).trained, true);
  assert.equal(quest.view(quest.departureAt).stage, 'report-muster');
  assert.equal(quest.placement(quest.departureAt), null, 'the ordinary company road clock takes over');
  assert.equal(quest.view(quest.departureAt + 200, { placement: { phase: 'mustered', x: -30, z: -150 } }).stage, 'complete');
});

test('both men must finish their own training before partnering', () => {
  const quest = createLandingMateQuest(geometry);
  assert.equal(quest.partnership(0, { playerTrained: true }).reason, 'mate-training');
  assert.match(quest.partnership(0).line, /training first/);
  assert.equal(quest.partnership(quest.departureAt, { playerTrained: false }).reason, 'player-training');
  assert.match(quest.partnership(quest.departureAt).line, /Glun.*straw post/);
  assert.equal(quest.partnership(quest.departureAt, { playerTrained: true }).ok, true);
  assert.equal(landingMatePartnership({ withTraveler: true }).reason, 'together', 'an existing companion stays yours on restoring an older save');
});

test('lesson progress survives reconstruction without depending on the player quest', () => {
  const first = createLandingMateQuest(geometry), restored = createLandingMateQuest(geometry);
  for (const seconds of [0, 20, first.departureAt - 1, first.departureAt, first.departureAt + 100])
    assert.deepEqual(restored.view(seconds), first.view(seconds));
  assert.ok(Object.isFrozen(first.timeline));
  assert.ok(first.roadDistance > 30);
});

test('the practice provides actual swing, guard and dodge poses, without granting player progress', () => {
  const quest = createLandingMateQuest(geometry);
  for (const [activity, action] of [['striking', 'attack'], ['guarding', 'idle'], ['dodging', 'dodge']]) {
    const leg = quest.timeline.find(part => part.activity === activity), pose = quest.view((leg.begin + leg.end) / 2);
    assert.equal(pose.animation.action, action);
    if (activity === 'guarding') assert.equal(pose.animation.guarding, true);
    assert.ok(Math.hypot(pose.at.x - geometry.training.x, pose.at.z - geometry.training.z) >= 2, 'stand beside the straw, not inside it');
  }
});

test('the landing slot works when the player chose Chris and Cromb came off the boat', () => {
  const quest = createLandingMateQuest({ ...geometry, id: 'merc-cromb', name: 'Cromb the Barbarian' });
  assert.equal(quest.placement(1).id, 'merc-cromb');
  const talk = quest.timeline.find(leg => leg.activity === 'talking');
  assert.equal(quest.view(talk.begin + .1).speech.speakerId, 'merc-cromb');
});

test('company placement follows the lesson then resumes the road, unless the player asks him to join', () => {
  const quest = createLandingMateQuest(geometry), plan = { road: geometry.road, landing: geometry.landing, muster: geometry.road.at(-1), landingQuest: quest };
  const company = createMercenaryCompany({ ...plan, companion: { id: quest.id, releasedAt: 0, releasedDistance: 0 } });
  const lesson = quest.timeline.find(leg => leg.activity === 'guarding'), during = (lesson.begin + lesson.end) / 2;
  assert.equal(company.placements(during).find(man => man.id === quest.id).activity, 'guarding');
  const onRoad = company.placements(quest.departureAt + 2).find(man => man.id === quest.id);
  assert.equal(onRoad.phase, 'walking'); assert.ok(onRoad.distance >= quest.roadDistance);
  const together = createMercenaryCompany({ ...plan, companion: { id: quest.id, with: true } });
  assert.equal(together.placements(quest.departureAt + 2).find(man => man.id === quest.id).phase, 'with-traveler');
  const released = createMercenaryCompany({ ...plan, companion: { id: quest.id, releasedAt: quest.departureAt + 50, releasedDistance: 100 } });
  const backOnRoad = released.placements(quest.departureAt + 51).find(man => man.id === quest.id);
  assert.ok(backOnRoad.distance >= 100, 'sending him ahead resumes from the player, not from Glun');
});
