import test from 'node:test';
import assert from 'node:assert/strict';
import {createInventoryState} from '../src/inventory.js';
import {createAcornQuest} from '../src/acorn-quest.js';

test('Lysa only accepts a complete batch after the player accepts her request', () => {
  const quest = createAcornQuest();
  const satchel = createInventoryState();
  satchel.add('acorn', 4);
  assert.equal(quest.target, 5);
  assert.equal(quest.status, 'available');
  assert.equal(quest.turnIn(satchel), false);
  assert.equal(quest.accept(), true);
  assert.equal(quest.accept(), false);
  assert.equal(quest.turnIn(satchel), false);
  assert.equal(quest.status, 'active');
  assert.equal(quest.friendship, 'unfamiliar');
  assert.equal(satchel.count('acorn'), 4, 'An incomplete batch is not consumed');
  assert.equal(satchel.has('tinderbox'), false);
});

test('The favor consumes exactly five, grants a tinderbox, and Lysa remembers without repeat rewards', () => {
  const quest = createAcornQuest();
  const satchel = createInventoryState();
  satchel.add('acorn', 11);
  satchel.grant('harbor-letter');
  quest.accept();
  assert.equal(quest.turnIn(satchel), true);
  assert.equal(satchel.count('acorn'), 6);
  assert.equal(satchel.count('tinderbox'), 1);
  assert.equal(satchel.has('harbor-letter'), true);
  assert.equal(quest.status, 'complete');
  assert.equal(quest.friendship, 'fond');
  assert.equal(quest.friendshipLabel, 'Fond of you');
  satchel.add('acorn', 5);
  assert.equal(quest.turnIn(satchel), false);
  assert.equal(satchel.count('acorn'), 11);
  assert.equal(satchel.count('tinderbox'), 1);
  const restored = createAcornQuest(quest.serialize());
  assert.equal(restored.status, 'complete');
  assert.equal(restored.friendship, 'fond');
  assert.equal(restored.accept(), false);
  assert.equal(restored.turnIn(satchel), false);
});

test('A failed inventory removal does not complete the quest', () => {
  const quest = createAcornQuest({status: 'active'});
  const satchel = createInventoryState();
  satchel.add('acorn', 5);
  assert.equal(quest.turnIn({...satchel, remove: () => false}), false);
  assert.equal(quest.status, 'active');
  assert.equal(quest.friendship, 'unfamiliar');
  assert.equal(satchel.count('acorn'), 5);
  assert.equal(satchel.has('tinderbox'), false);
  assert.equal(quest.turnIn(null), false);
  assert.equal(createAcornQuest({status: 'invalid'}).status, 'available');
});

test('A failed tinderbox grant refunds the whole batch and preserves the selected acorns', () => {
  const quest = createAcornQuest({status: 'active'});
  const satchel = createInventoryState();
  satchel.add('acorn', 5); satchel.select('acorn');
  assert.equal(quest.turnIn({...satchel, grant: () => false}), false);
  assert.equal(satchel.count('acorn'), 5);
  assert.equal(satchel.selectedId(), 'acorn');
  assert.equal(satchel.has('tinderbox'), false);
  assert.equal(quest.status, 'active');
  assert.equal(quest.friendship, 'unfamiliar');
  assert.equal(quest.turnIn(satchel), true, 'the failed exchange can be retried');
  assert.equal(satchel.count('acorn'), 0);
  assert.equal(satchel.count('tinderbox'), 1);
});

test('Already owning a tinderbox still allows the favor without creating a duplicate reward', () => {
  const quest = createAcornQuest({status: 'active'});
  const satchel = createInventoryState();
  satchel.add('acorn', 7); satchel.grant('tinderbox');
  assert.equal(quest.turnIn(satchel), true);
  assert.equal(satchel.count('acorn'), 2);
  assert.equal(satchel.count('tinderbox'), 1);
  assert.equal(quest.friendship, 'fond');
});
