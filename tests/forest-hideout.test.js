import test from 'node:test';
import assert from 'node:assert/strict';
import { createInventoryState } from '../src/inventory.js';
import { FOREST_HIDEOUT_QUEST, createForestHideoutQuest, validateForestHideoutSnapshot,
  hideoutConversation, hideoutTamsinChoices } from '../src/forest-hideout.js';

function fixture() {
  const inventory = createInventoryState(), events = [];
  const quest = createForestHideoutQuest({ inventory, onEvent: event => events.push(event) });
  return { inventory, events, quest };
}
function win(quest) {
  assert.equal(quest.inspect().ok, true);
  assert.equal(quest.begin({ questStage: 5 }).ok, true);
  assert.equal(quest.markCleared(FOREST_HIDEOUT_QUEST.id).ok, true);
}

test('the hideout can be observed early but requires inspection, original victory, and explicit opt-in to fight', () => {
  const { quest, inventory, events } = fixture();
  assert.equal(quest.view().task, null);
  assert.equal(quest.begin({ questStage: 5 }).ok, false);
  assert.equal(quest.inspect({ questStage: 1 }).ok, true);
  assert.equal(quest.view().discovered, true);
  assert.equal(quest.view().task, null);
  assert.equal(quest.inspect().changed, false);
  for (const questStage of [undefined, 0, 1, 2, 3, 4, NaN, Infinity, '5'])
    assert.equal(quest.begin({ questStage }).ok, false);
  const choice = quest.availableActions('bramble-scout-camp', { questStage: 4 }).find(choice => choice.id === 'challenge-hideout');
  assert.equal(choice.enabled, false);
  assert.match(choice.reason, /first three-goblin/);
  assert.equal(events.length, 1);
  assert.equal(quest.state.accepted, false);
  assert.equal(quest.state.active, false);
  assert.deepEqual(inventory.items(), []);
  assert.equal(quest.begin({ questStage: 5 }).startEncounter, true);
  assert.equal(quest.state.active, true);
  assert.equal(quest.view().task.optional, true);
});

test('a matching real encounter victory unlocks supplies and exactly three existing pawpaws once', () => {
  const { quest, inventory, events } = fixture();
  assert.equal(quest.recover().ok, false);
  assert.equal(quest.turnIn().ok, false);
  quest.inspect(); quest.begin({ questStage: 5 });
  assert.equal(quest.begin({ questStage: 5 }).ok, false);
  assert.equal(quest.markCleared('bramble-goblins').ok, false);
  assert.equal(quest.endEncounter('meadow-raiders').ok, false);
  assert.equal(quest.act('clear-hideout').ok, false, 'dialogue cannot award a combat victory');
  assert.equal(quest.recover().ok, false);
  assert.equal(quest.markCleared('forest-hideout').ok, true);
  assert.equal(quest.state.active, false);
  assert.equal(quest.markCleared('forest-hideout').ok, false);
  assert.equal(quest.begin({ questStage: 10 }).ok, false);
  assert.deepEqual(quest.view().destinationIds, ['forest-hideout-supplies']);
  assert.equal(quest.turnIn().ok, false);
  assert.equal(quest.recover().ok, true);
  assert.equal(quest.recover().ok, false);
  assert.equal(quest.view().suppliesCarried, true);
  assert.deepEqual(inventory.items(), [], 'supplies remain quest state, not a made-up inventory item');
  assert.equal(quest.turnIn().ok, true);
  assert.equal(quest.turnIn().ok, false);
  assert.equal(quest.view().suppliesCarried, false);
  assert.equal(quest.state.complete, true);
  assert.equal(inventory.count('pawpaw'), 3);
  assert.deepEqual(events.map(event => event.sequence), [1, 2, 3, 4, 5]);
  assert.deepEqual(events.at(-1).reward, { id: 'pawpaw', quantity: 3 });
  assert.equal(validateForestHideoutSnapshot(quest.snapshot()), true);
});

test('retreat and defeat reset only transient activity; each retry requires a new begin', () => {
  const { quest, events } = fixture();
  quest.inspect(); quest.begin({ questStage: 5 });
  const accepted = quest.snapshot();
  for (let attempt = 0; attempt < 3; attempt++) {
    assert.equal(quest.endEncounter('forest-hideout').ok, true);
    assert.equal(quest.state.active, false);
    assert.equal(quest.view().stage, 'ready-to-retry');
    assert.deepEqual(quest.snapshot(), accepted);
    assert.equal(quest.markCleared('forest-hideout').ok, false);
    assert.equal(quest.endEncounter('forest-hideout').ok, false);
    assert.equal(quest.begin({ questStage: 5 }).ok, true);
    assert.equal(quest.state.active, true);
  }
  assert.equal(events.length, 2, 'retries do not repeat persistent progress or rewards');
  assert.equal(quest.markCleared('forest-hideout').ok, true);
  assert.equal(quest.view().stage, 'recover-supplies');
});

test('accepted checkpoints never serialize an active battle and resume ready for a new challenge', () => {
  const original = fixture();
  original.quest.inspect(); original.quest.begin({ questStage: 5 });
  const snapshot = original.quest.snapshot();
  assert.equal(Object.hasOwn(snapshot, 'active'), false);
  const loaded = fixture();
  assert.equal(loaded.quest.restore({ ...snapshot, active: true }), true);
  assert.equal(loaded.quest.state.active, false);
  assert.equal(loaded.quest.view().stage, 'ready-to-retry');
  assert.equal(loaded.quest.markCleared('forest-hideout').ok, false);
  assert.equal(loaded.quest.begin({ questStage: 4 }).ok, false);
  assert.equal(loaded.quest.begin({ questStage: 5 }).ok, true);
  assert.equal(loaded.quest.markCleared('forest-hideout').ok, true);
  assert.equal(loaded.events.length, 1);
  assert.equal(loaded.inventory.count('pawpaw'), 0);
});

test('supplies persist through reload until returned, while completed saves never grant the reward again', () => {
  const first = fixture(); win(first.quest); first.quest.recover();
  const loaded = fixture();
  assert.equal(loaded.quest.restore(first.quest.snapshot()), true);
  assert.equal(loaded.quest.view().suppliesCarried, true);
  assert.equal(loaded.quest.recover().ok, false);
  assert.equal(loaded.inventory.count('pawpaw'), 0);
  assert.equal(loaded.quest.turnIn().ok, true);
  const completed = loaded.quest.snapshot();
  assert.equal(loaded.quest.restore(completed), true);
  assert.equal(loaded.quest.turnIn().ok, false);
  assert.equal(loaded.inventory.count('pawpaw'), 3);
  const fresh = fixture(); fresh.quest.restore(completed);
  assert.equal(fresh.quest.state.complete, true);
  assert.equal(fresh.events.length, 0);
  assert.equal(fresh.inventory.count('pawpaw'), 0, 'restore never manufactures food');
});

test('failed reward insertion never loses recovered supplies or consumes a retry', () => {
  const inventory = createInventoryState();
  let allowReward = false;
  const quest = createForestHideoutQuest({ inventory: { ...inventory, add: (...args) => allowReward && inventory.add(...args) } });
  win(quest); quest.recover(); const before = quest.snapshot();
  assert.equal(quest.turnIn().ok, false);
  assert.deepEqual(quest.snapshot(), before);
  assert.equal(quest.view().suppliesCarried, true);
  assert.equal(inventory.count('pawpaw'), 0);
  allowReward = true;
  assert.equal(quest.turnIn().ok, true);
  assert.equal(quest.turnIn().ok, false);
  assert.equal(inventory.count('pawpaw'), 3);
});

test('overflowing a real item stack rejects the reward without losing quest supplies', () => {
  const { quest, inventory } = fixture();
  inventory.add('pawpaw', Number.MAX_SAFE_INTEGER);
  win(quest); quest.recover(); const before = quest.snapshot();
  assert.equal(quest.turnIn().ok, false);
  assert.deepEqual(quest.snapshot(), before);
  assert.equal(inventory.count('pawpaw'), Number.MAX_SAFE_INTEGER);
  inventory.remove('pawpaw', 3);
  assert.equal(quest.turnIn().ok, true);
  assert.equal(inventory.count('pawpaw'), Number.MAX_SAFE_INTEGER);
});

test('invalid and reordered progress is rejected atomically; absent legacy data resets cleanly', () => {
  const { quest } = fixture(); quest.inspect();
  const before = quest.snapshot();
  for (const data of [null, [], {}, { ...before, version: 2 }, { ...before, revision: 12 },
    { ...before, inspected: 1 }, { ...before, accepted: true },
    { ...before, cleared: true, revision: 2 }, { ...before, recovered: true, revision: 2 },
    { ...before, returned: true, revision: 2 }, { ...before, inspected: false, accepted: true }]) {
    assert.equal(validateForestHideoutSnapshot(data), false);
    assert.equal(quest.restore(data), false);
    assert.deepEqual(quest.snapshot(), before);
  }
  assert.equal(validateForestHideoutSnapshot(undefined), true);
  assert.equal(validateForestHideoutSnapshot(undefined, { allowMissing: false }), false);
  assert.equal(quest.restore(undefined), true);
  assert.equal(quest.state.revision, 0);
  assert.equal(quest.view().stage, 'undiscovered');
  assert.equal(quest.view().task, null);
});

test('returned views and snapshots cannot alter controller history or destinations', () => {
  const { quest } = fixture(); win(quest); quest.recover();
  const saved = quest.snapshot(); saved.returned = true;
  quest.state.recovered = false;
  const view = quest.view(); view.destinationIds.push('fake'); view.task.destinationIds.push('fake');
  assert.equal(quest.state.returned, false);
  assert.equal(quest.state.recovered, true);
  assert.deepEqual(quest.view().destinationIds, ['forest-woodcutter']);
});

function dialogueFixture(quest, questStage = 5) {
  const screens = [], actions = [];
  let closed = 0, back = 0;
  const context = { hideoutQuest: quest, questStage,
    openDialogue: (npc, lines, unused, label, options) => screens.push({ npc, lines, label, options }),
    closeDialogue: () => closed++, returnToNeighbor: () => back++,
    act: id => { actions.push(id); return quest.act(id, { questStage }); } };
  return { screens, actions, context, get closed() { return closed; }, get back() { return back; } };
}

test('approach dialogue offers a real opt-out and clearly gates the optional fight before tutorial victory', () => {
  const { quest } = fixture(), early = dialogueFixture(quest, 3);
  hideoutConversation(early.context);
  assert.match(early.screens[0].lines.join(' '), /Finish the first goblin fight/);
  assert.equal(early.screens[0].options.choices.find(choice => choice.id === 'challenge-hideout').enabled, false);
  early.screens[0].options.choices.find(choice => choice.id === 'leave-hideout').action();
  assert.equal(quest.state.accepted, false);
  assert.equal(quest.state.active, false);
  const ready = dialogueFixture(quest, 5); hideoutConversation(ready.context);
  assert.match(ready.screens[0].lines.join(' '), /leave them unchallenged/);
  const begin = ready.screens[0].options.choices.find(choice => choice.id === 'challenge-hideout');
  assert.equal(begin.enabled, true); begin.action();
  assert.equal(ready.closed, 1);
  assert.equal(quest.state.active, true);
});

test('Tamsin returns supplies through an explicit choice and remembers the outcome without repeat rewards', () => {
  const { quest, inventory } = fixture(), ui = dialogueFixture(quest);
  const npc = { id: 'forest-woodcutter', name: 'Tamsin' };
  assert.deepEqual(hideoutTamsinChoices({ id: 'other' }, ui.context), []);
  assert.deepEqual(hideoutTamsinChoices(npc, { ...ui.context, questStage: 1 }), []);
  const rumor = hideoutTamsinChoices(npc, ui.context)[0]; rumor.action();
  assert.match(ui.screens.at(-1).lines.join(' '), /three ripe pawpaws/);
  assert.equal(quest.state.accepted, false);
  win(quest); quest.recover();
  hideoutTamsinChoices(npc, ui.context)[0].action();
  const screen = ui.screens.at(-1);
  assert.equal(inventory.count('pawpaw'), 0);
  screen.options.choices.find(choice => choice.id === 'keep-hideout-supplies').action();
  assert.equal(ui.back, 1);
  assert.equal(quest.view().suppliesCarried, true);
  screen.options.choices.find(choice => choice.id === 'return-hideout-supplies').action();
  assert.equal(inventory.count('pawpaw'), 3);
  const thanks = hideoutTamsinChoices(npc, ui.context);
  assert.equal(thanks.length, 1); assert.equal(thanks[0].id, 'hideout-village-thanks');
  thanks[0].action(); ui.screens.at(-1).options.onComplete();
  assert.equal(ui.back, 2);
  assert.equal(inventory.count('pawpaw'), 3);
  assert.match(ui.screens.at(-1).lines.join(' '), /People remember/);
});
