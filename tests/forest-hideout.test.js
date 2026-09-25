import test from 'node:test';
import assert from 'node:assert/strict';
import { QUEST_DONE } from '../src/game-state.js';
import { CAT, LIZ_STAND } from '../src/cat-quest.js';
import { createInventoryState } from '../src/inventory.js';
import { FOREST_HIDEOUT_QUEST, createForestHideoutQuest, validateForestHideoutSnapshot,
  hideoutConversation, hideoutTamsinChoices, garrisonConversation, HIDEOUT_GARRISON } from '../src/forest-hideout.js';

function fixture() {
  const inventory = createInventoryState(), events = [];
  const quest = createForestHideoutQuest({ inventory, onEvent: event => events.push(event) });
  return { inventory, events, quest };
}
function win(quest) {
  assert.equal(quest.inspect().ok, true);
  assert.equal(quest.begin({ questStage: QUEST_DONE }).ok, true);
  assert.equal(quest.markCleared(FOREST_HIDEOUT_QUEST.id).ok, true);
}

test('voluntarily challenging from the safe approach requires inspection and completed training', () => {
  const { quest, inventory, events } = fixture();
  assert.equal(quest.view().task, null);
  assert.equal(quest.begin({ questStage: QUEST_DONE }).ok, false);
  assert.equal(quest.inspect({ questStage: 1 }).ok, true);
  assert.equal(quest.view().discovered, true);
  assert.equal(quest.view().task, null);
  assert.equal(quest.inspect().changed, false);
  for (const questStage of [undefined, 0, 1, QUEST_DONE - 1, NaN, Infinity, '10'])
    assert.equal(quest.begin({ questStage }).ok, false);
  const choice = quest.availableActions('bramble-scout-camp', { questStage: QUEST_DONE - 1 }).find(choice => choice.id === 'challenge-hideout');
  assert.equal(choice.enabled, false);
  assert.match(choice.reason, /business in Tidehaven/);
  assert.equal(events.length, 1);
  assert.equal(quest.state.accepted, false);
  assert.equal(quest.state.active, false);
  assert.deepEqual(inventory.items(), []);
  assert.equal(quest.begin({ questStage: QUEST_DONE }).startEncounter, true);
  assert.equal(quest.state.active, true);
  assert.equal(quest.view().task.optional, true);
});

test('a matching real encounter victory unlocks the stores and exactly thirty copper once', () => {
  const { quest, inventory, events } = fixture();
  assert.equal(quest.recover().ok, false);
  assert.equal(quest.turnIn().ok, false);
  quest.inspect(); quest.begin({ questStage: QUEST_DONE });
  assert.equal(quest.begin({ questStage: QUEST_DONE }).ok, false);
  assert.equal(quest.markCleared('bramble-goblins').ok, false);
  assert.equal(quest.endEncounter('meadow-raiders').ok, false);
  assert.equal(quest.act('clear-hideout').ok, false, 'dialogue cannot award a combat victory');
  assert.equal(quest.recover().ok, false);
  assert.equal(quest.markCleared('forest-hideout').ok, true);
  assert.equal(quest.state.active, false);
  assert.equal(quest.markCleared('forest-hideout').ok, false);
  assert.equal(quest.begin({ questStage: QUEST_DONE }).ok, false);
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
  assert.equal(inventory.count('copper-piece'), 30);
  assert.deepEqual(events.map(event => event.sequence), [1, 2, 3, 4, 5]);
  assert.deepEqual(events.at(-1).reward, { id: 'copper-piece', quantity: 30 });
  assert.equal(validateForestHideoutSnapshot(quest.snapshot()), true);
});

test('retreat and defeat reset only transient activity; each retry requires a new begin', () => {
  const { quest, events } = fixture();
  quest.inspect(); quest.begin({ questStage: QUEST_DONE });
  const accepted = quest.snapshot();
  for (let attempt = 0; attempt < 3; attempt++) {
    assert.equal(quest.endEncounter('forest-hideout').ok, true);
    assert.equal(quest.state.active, false);
    assert.equal(quest.view().stage, 'ready-to-retry');
    assert.deepEqual(quest.snapshot(), accepted);
    assert.equal(quest.markCleared('forest-hideout').ok, false);
    assert.equal(quest.endEncounter('forest-hideout').ok, false);
    assert.equal(quest.begin({ questStage: QUEST_DONE }).ok, true);
    assert.equal(quest.state.active, true);
  }
  assert.equal(events.length, 2, 'retries do not repeat persistent progress or rewards');
  assert.equal(quest.markCleared('forest-hideout').ok, true);
  assert.equal(quest.view().stage, 'recover-supplies');
});

test('accepted checkpoints never serialize an active battle and resume ready for a new challenge', () => {
  const original = fixture();
  original.quest.inspect(); original.quest.begin({ questStage: QUEST_DONE });
  const snapshot = original.quest.snapshot();
  assert.equal(Object.hasOwn(snapshot, 'active'), false);
  const loaded = fixture();
  assert.equal(loaded.quest.restore({ ...snapshot, active: true }), true);
  assert.equal(loaded.quest.state.active, false);
  assert.equal(loaded.quest.view().stage, 'ready-to-retry');
  assert.equal(loaded.quest.markCleared('forest-hideout').ok, false);
  assert.equal(loaded.quest.begin({ questStage: QUEST_DONE - 1 }).ok, false);
  assert.equal(loaded.quest.begin({ questStage: QUEST_DONE }).ok, true);
  assert.equal(loaded.quest.markCleared('forest-hideout').ok, true);
  assert.equal(loaded.events.length, 1);
  assert.equal(loaded.inventory.count('copper-piece'), 0);
});

test('supplies persist through reload until returned, while completed saves never grant the reward again', () => {
  const first = fixture(); win(first.quest); first.quest.recover();
  const loaded = fixture();
  assert.equal(loaded.quest.restore(first.quest.snapshot()), true);
  assert.equal(loaded.quest.view().suppliesCarried, true);
  assert.equal(loaded.quest.recover().ok, false);
  assert.equal(loaded.inventory.count('copper-piece'), 0);
  assert.equal(loaded.quest.turnIn().ok, true);
  const completed = loaded.quest.snapshot();
  assert.equal(loaded.quest.restore(completed), true);
  assert.equal(loaded.quest.turnIn().ok, false);
  assert.equal(loaded.inventory.count('copper-piece'), 30);
  const fresh = fixture(); fresh.quest.restore(completed);
  assert.equal(fresh.quest.state.complete, true);
  assert.equal(fresh.events.length, 0);
  assert.equal(fresh.inventory.count('copper-piece'), 0, 'restore never manufactures food');
});

test('failed reward insertion never loses recovered supplies or consumes a retry', () => {
  const inventory = createInventoryState();
  let allowReward = false;
  const quest = createForestHideoutQuest({ inventory: { ...inventory, add: (...args) => allowReward && inventory.add(...args) } });
  win(quest); quest.recover(); const before = quest.snapshot();
  assert.equal(quest.turnIn().ok, false);
  assert.deepEqual(quest.snapshot(), before);
  assert.equal(quest.view().suppliesCarried, true);
  assert.equal(inventory.count('copper-piece'), 0);
  allowReward = true;
  assert.equal(quest.turnIn().ok, true);
  assert.equal(quest.turnIn().ok, false);
  assert.equal(inventory.count('copper-piece'), 30);
});

test('overflowing a real item stack rejects the reward without losing quest supplies', () => {
  const { quest, inventory } = fixture();
  inventory.add('copper-piece', Number.MAX_SAFE_INTEGER);
  win(quest); quest.recover(); const before = quest.snapshot();
  assert.equal(quest.turnIn().ok, false);
  assert.deepEqual(quest.snapshot(), before);
  assert.equal(inventory.count('copper-piece'), Number.MAX_SAFE_INTEGER);
  inventory.remove('copper-piece', 30);
  assert.equal(quest.turnIn().ok, true);
  assert.equal(inventory.count('copper-piece'), Number.MAX_SAFE_INTEGER);
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
  assert.deepEqual(quest.view().destinationIds, ['garrison-captain']);
});

function dialogueFixture(quest, questStage = QUEST_DONE) {
  const screens = [], actions = [];
  let closed = 0, back = 0;
  const context = { hideoutQuest: quest, questStage,
    openDialogue: (npc, lines, unused, label, options) => screens.push({ npc, lines, label, options }),
    closeDialogue: () => closed++, returnToNeighbor: () => back++,
    act: id => { actions.push(id); return quest.act(id, { questStage }); } };
  return { screens, actions, context, get closed() { return closed; }, get back() { return back; } };
}

test('approach dialogue offers a real opt-out and clearly gates the optional fight before tutorial victory', () => {
  const { quest } = fixture(), early = dialogueFixture(quest, QUEST_DONE - 1);
  hideoutConversation(early.context);
  assert.match(early.screens[0].lines.join(' '), /Finish your business in Tidehaven/);
  assert.equal(early.screens[0].options.choices.find(choice => choice.id === 'challenge-hideout').enabled, false);
  early.screens[0].options.choices.find(choice => choice.id === 'leave-hideout').action();
  assert.equal(quest.state.accepted, false);
  assert.equal(quest.state.active, false);
  const ready = dialogueFixture(quest, 10); hideoutConversation(ready.context);
  assert.match(ready.screens[0].lines.join(' '), /leave them unchallenged/);
  const begin = ready.screens[0].options.choices.find(choice => choice.id === 'challenge-hideout');
  assert.equal(begin.enabled, true); begin.action();
  assert.equal(ready.closed, 1);
  assert.equal(quest.state.active, true);
});

test('Cassel tells of the camp, the Captain marches on request, and the stores are paid for exactly once', () => {
  const { quest, inventory } = fixture(), ui = dialogueFixture(quest);
  assert.deepEqual(hideoutTamsinChoices({ id: 'forest-woodcutter' }, ui.context), [], 'Drent has no goblin camp for Tamsin to mention');
  assert.deepEqual(HIDEOUT_GARRISON.map(g => [g.id, g.kind]), [['garrison-captain', 'officer'], ['garrison-casso', 'legionary'], ['garrison-brill', 'legionary']]);
  const [captain, casso, brill] = HIDEOUT_GARRISON;
  const choice = id => ui.screens.at(-1).options.choices.find(c => c.id === id);
  assert.equal(quest.march().ok, false, 'nobody marches on a camp they have not heard of');
  garrisonConversation(captain, ui.context);
  assert.match(ui.screens.at(-1).lines.join(' '), /Speak to Cassel/);
  assert.equal(choice('march-on-hideout'), undefined);
  garrisonConversation(casso, ui.context);
  choice('ask-hideout-work').action();
  assert.match(ui.screens.at(-1).lines.join(' '), /blue cloth/);
  assert.match(ui.screens.at(-1).lines.join(' '), /Tessen[\s\S]*Tidehaven/, 'Cassel ties the camp to the raid over the river');
  ui.screens.at(-1).options.onComplete();
  assert.equal(quest.state.inspected, true, 'his account marks the camp on the chart');
  garrisonConversation(captain, ui.context);
  choice('march-on-hideout').action();
  assert.equal(quest.state.escort, true);
  garrisonConversation(brill, ui.context);
  assert.match(ui.screens.at(-1).lines.join(' '), /Captain follows you/);
  garrisonConversation(captain, ui.context);
  choice('stand-down-hideout').action();
  assert.equal(quest.state.escort, false);
  assert.equal(quest.march().ok, true);
  assert.equal(quest.restore(quest.snapshot()), true);
  assert.equal(quest.state.escort, false, 'an escort is a moment, never part of a save');
  quest.march(); win(quest); quest.recover();
  assert.equal(quest.march().ok, false, 'there is nothing left to march on');
  garrisonConversation(captain, ui.context);
  assert.equal(inventory.count('copper-piece'), 0);
  choice('return-hideout-supplies').action();
  assert.equal(inventory.count('copper-piece'), 30);
  assert.equal(quest.state.escort, false, 'the garrison stands down once the stores are home');
  assert.equal(quest.turnIn().ok, false);
  garrisonConversation(captain, ui.context);
  assert.match(ui.screens.at(-1).lines.join(' '), /my report to the Marshal/);
  assert.equal(inventory.count('copper-piece'), 30);
});


test('either scout attacks an unbriefed traveler within reach without a quest prerequisite', () => {
  for (const scout of FOREST_HIDEOUT_QUEST.encounter.enemies) {
    const { quest, inventory, events } = fixture();
    const position = { x: scout.x + FOREST_HIDEOUT_QUEST.alertRadius - .1, z: scout.z };
    assert.equal(quest.state.inspected, false);
    assert.equal(quest.canAlert(position), true);
    const result = quest.alert(position);
    assert.equal(result.startEncounter, true);
    assert.equal(result.spotted, true);
    assert.equal(quest.state.active, true);
    assert.equal(quest.state.inspected && quest.state.accepted, true);
    assert.equal(validateForestHideoutSnapshot(quest.snapshot()), true);
    assert.deepEqual(events.map(event => event.actionId), ['inspect-hideout', 'spotted-by-scouts']);
    assert.deepEqual(inventory.items(), [], 'being attacked grants no supplies or reward');
    assert.equal(quest.canAlert(position), false, 'one intrusion must not create duplicate combatants');
    assert.equal(quest.alert(position).startEncounter, undefined);
  }
});

test('the camp approach and the route to Mop remain safe without inspection', () => {
  const { quest } = fixture(), before = quest.snapshot();
  const safe = [FOREST_HIDEOUT_QUEST.approach, CAT.at, LIZ_STAND, null, {}, { x: NaN, z: 0 }];
  for (let step = 0; step <= 100; step++) {
    const t = step / 100;
    safe.push({ x: LIZ_STAND.x + (CAT.at.x - LIZ_STAND.x) * t,
      z: LIZ_STAND.z + (CAT.at.z - LIZ_STAND.z) * t });
  }
  for (const position of safe) {
    assert.equal(quest.canAlert(position), false);
    assert.equal(quest.alert(position).ok, false);
  }
  assert.deepEqual(quest.snapshot(), before, 'skirting the camp must not accept its optional errand');
});

test('retreat permits later hostility but a cleared camp and its save never respawn scouts', () => {
  const { quest } = fixture(), position = FOREST_HIDEOUT_QUEST.encounter.enemies[0];
  quest.alert(position);
  const accepted = quest.snapshot();
  quest.endEncounter(FOREST_HIDEOUT_QUEST.id);
  assert.equal(quest.alert(position).startEncounter, true);
  assert.deepEqual(quest.snapshot(), accepted, 're-entering does not duplicate progress');
  assert.equal(quest.markCleared(FOREST_HIDEOUT_QUEST.id).ok, true);
  assert.equal(quest.canAlert(position), false);
  assert.equal(quest.alert(position).ok, false);
  const loaded = fixture().quest;
  assert.equal(loaded.restore(quest.snapshot()), true);
  assert.equal(loaded.canAlert(position), false);
  assert.equal(loaded.alert(position).startEncounter, undefined);
});
