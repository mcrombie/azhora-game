import test from 'node:test';
import assert from 'node:assert/strict';
import { createBatmanQuest, validateBatmanQuestSnapshot, migrateBatmanQuest, BATMAN_QUEST, BATMAN_HISTORY } from '../src/content/quests/batman/batman-quest.js';

test('Catie opens a search that can finish peacefully even after accepting the bounty', () => {
  const events = [], quest = createBatmanQuest({ onEvent: event => events.push(event) });
  assert.equal(quest.offer(), true); assert.equal(quest.accept(), true);
  assert.equal(quest.acceptBounty(), true); assert.equal(quest.discover(), true);
  assert.equal(quest.speak(), true); assert.equal(quest.beginFlight(), true);
  assert.equal(quest.state().bounty, 'declined'); assert.equal(quest.attack(), false);
  assert.equal(quest.finishFlight(), true); assert.equal(quest.finishFlight(), false);
  assert.equal(quest.finishReturn(), true); assert.equal(quest.finishReturn(), false);
  assert.equal(quest.reportToCatie(), true); assert.equal(quest.reportToCatie(), false);
  assert.equal(quest.acceptBounty(), false); assert.equal(quest.takeHead({ grant: () => true }), false);
  assert.equal(events.filter(event => event.type === 'batman-flight-complete').length, 1);
  assert.equal(validateBatmanQuestSnapshot(quest.snapshot()), true);
});
test('An attacked Batman defends himself and his actual head pays the bounty once', () => {
  const quest = createBatmanQuest(); let heads = 0, copper = 0;
  quest.acceptBounty(); quest.discover(); assert.equal(quest.attack(), true);
  assert.equal(quest.speak(), false); assert.equal(quest.beginFlight(), false);
  assert.equal(quest.takeHead({ grant: () => true }), false);
  quest.killed();
  assert.equal(quest.takeHead({ grant: item => { assert.equal(item, BATMAN_QUEST.headItem); heads++; return true; } }), true);
  assert.equal(quest.takeHead({ grant: () => { heads++; return true; } }), false);
  const pay = () => quest.claimBounty({ take: () => heads > 0 ? (heads--, true) : false, reward: amount => { copper += amount; } });
  assert.equal(pay(), true); assert.equal(pay(), false); assert.equal(copper, 100); assert.equal(heads, 0);
  const restored = createBatmanQuest(); assert.equal(restored.restore(quest.snapshot()), true);
  assert.equal(restored.claimBounty({ take: () => true, reward: () => { copper += 100; } }), false);
  assert.equal(copper, 100); assert.equal(restored.beginFlight(), false);
});
test('The bounty is not paid when its inventory transaction fails', () => {
  const quest = createBatmanQuest(); quest.acceptBounty(); quest.attack(); quest.killed();
  assert.equal(quest.takeHead(), false); assert.equal(quest.state().headTaken, false);
  quest.takeHead({ grant: () => true });
  assert.equal(quest.claimBounty(), false); assert.equal(quest.state().bounty, 'accepted');
});
test('A developer interruption teaches no completion reward and permits restarting the carried tour', () => {
  const events = [], quest = createBatmanQuest({ onEvent: e => events.push(e) });
  quest.discover(); quest.speak(); quest.beginFlight();
  assert.equal(quest.interruptFlight(), true); assert.equal(quest.state().stage, 'friendly');
  assert.equal(quest.interruptFlight(), false); assert.equal(quest.beginFlight(), true);
  assert.equal(events.some(e => e.type === 'batman-flight-complete'), false);
});
test('A completed friendly quest remains historical if the player later attacks its protector', () => {
  const quest = createBatmanQuest(); quest.speak(); quest.beginFlight(); quest.finishFlight();
  assert.equal(quest.attack(), true); assert.equal(quest.killed(), true);
  assert.equal(quest.state().stage, 'complete'); assert.equal(quest.takeHead({ grant: () => true }), false);
});
test('Old search saves migrate into the new search without awarding the new flight', () => {
  assert.equal(migrateBatmanQuest({ katy: { stage: 'looking' } }).stage, 'searching');
  assert.equal(migrateBatmanQuest({ hunt: { stage: 'done' } }).stage, 'searching');
  assert.equal(migrateBatmanQuest().stage, 'available');
  const quest = createBatmanQuest(); quest.accept(); const before = quest.snapshot();
  assert.equal(quest.restore({ ...before, stage: 'flying', bounty: 'accepted' }), false);
  assert.deepEqual(quest.snapshot(), before);
  assert.equal(validateBatmanQuestSnapshot({ ...before, stage: 'friendly', headTaken: true }), false);
});
test('The flight account preserves the user-authored chronology and the people affected', () => {
  const story = BATMAN_HISTORY.map(beat => beat.text).join(' ');
  for (const name of ['976', 'Maro', 'Ambron', 'Inseld', 'ten years', 'Nanvir', 'Imlamdris', 'Pyros', 'Eer', 'Aevis', 'Selemis', 'Marosh', 'Zecron', 'Iscare', '978', 'East Suval']) assert.ok(story.includes(name), name);
  assert.ok(story.includes('Wilhelm acted independently'));
  assert.ok(story.indexOf('976') < story.indexOf('978'));
});
