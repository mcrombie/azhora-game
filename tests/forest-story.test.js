import test from 'node:test';
import assert from 'node:assert/strict';
import { createInventoryState } from '../src/inventory.js';
import { createWeapons } from '../src/weapons.js';
import { createForestStory, validateForestStorySnapshot, FOREST_STORY_NPC, FOREST_STORY_SITES,
  forestConversation, forestSiteConversation } from '../src/forest-story.js';

function fixture({ sticks = 0 } = {}) {
  const inventory = createInventoryState();
  if (sticks) inventory.add('forest-stick', sticks);
  const weapons = createWeapons({ inventory });
  const events = [];
  const story = createForestStory({ inventory, weapons, onEvent: event => events.push(event) });
  return { inventory, weapons, events, story };
}

test('the woodland is optional and every authored place can be explored in any order', () => {
  const { story, inventory, events } = fixture();
  assert.equal(story.view().task, null);
  assert.equal(story.view().discoveredCount, 0);
  assert.equal(story.view().totalSites, 6);
  assert.equal(story.view().optional, true);
  for (const site of [...FOREST_STORY_SITES].reverse()) {
    assert.equal(story.act(`inspect-${site.id}`).ok, true);
    assert.equal(story.siteView(site.id).inspected, true);
    assert.equal(story.act(`inspect-${site.id}`).changed, false);
  }
  assert.equal(events.length, 6);
  assert.deepEqual(events.map(event => event.sequence), [1, 2, 3, 4, 5, 6]);
  assert.equal(story.view().entries.length, 6);
  assert.equal(story.view().task, null);
  assert.deepEqual(inventory.items(), []);
  assert.equal(validateForestStorySnapshot(story.snapshot()), true);
});

test('the woodcutter errand awards a modest existing food reward exactly once', () => {
  const { story, inventory, events } = fixture();
  const before = story.snapshot();
  assert.equal(story.act('return-work-bundle').ok, false);
  assert.deepEqual(story.snapshot(), before);
  assert.equal(story.act('accept-woodcutter-errand').ok, true);
  assert.equal(story.view().task.destinationIds[0], 'charcoal-hearth');
  assert.equal(story.act('accept-woodcutter-errand').ok, false);
  assert.equal(story.act('return-work-bundle').ok, false);
  assert.equal(story.act('recover-work-bundle').ok, true);
  assert.equal(story.act('recover-work-bundle').ok, false);
  assert.equal(story.view().discoveredCount, 1);
  assert.equal(story.view().task.destinationIds[0], FOREST_STORY_NPC.id);
  assert.equal(story.act('return-work-bundle').ok, true);
  assert.equal(story.act('return-work-bundle').ok, false);
  assert.equal(inventory.count('cooked-fish'), 2);
  assert.equal(story.state.complete, true);
  assert.equal(story.view().task.complete, true);
  assert.deepEqual(story.view().task.destinationIds, []);
  assert.equal(events.length, 3);
  assert.deepEqual(events.at(-1).reward, { id: 'cooked-fish', quantity: 2 });
  assert.match(story.siteView('charcoal-hearth').lines.join(' '), /back with Tamsin/);
  assert.equal(validateForestStorySnapshot(story.snapshot()), true);
});

test('finding the work bundle before meeting Tamsin preserves discovery and finds its owner', () => {
  const { story, inventory } = fixture();
  assert.equal(story.act('recover-work-bundle').ok, true);
  assert.equal(story.state.stage, 'find-owner');
  assert.equal(story.view().task.destinationIds[0], FOREST_STORY_NPC.id);
  assert.equal(story.act('return-work-bundle').ok, false);
  assert.equal(story.act('accept-woodcutter-errand').ok, true);
  assert.equal(story.state.stage, 'return-bundle');
  assert.equal(story.act('return-work-bundle').ok, true);
  assert.equal(inventory.count('cooked-fish'), 2);
  assert.equal(validateForestStorySnapshot(story.snapshot()), true);
});

test('failed food delivery leaves the bundle available for one successful retry', () => {
  const inventory = createInventoryState();
  let canAdd = false;
  const events = [];
  const story = createForestStory({ inventory: { ...inventory, add: (...args) => canAdd && inventory.add(...args) },
    onEvent: event => events.push(event) });
  story.act('accept-woodcutter-errand'); story.act('recover-work-bundle');
  const before = story.snapshot();
  assert.equal(story.act('return-work-bundle').ok, false);
  assert.deepEqual(story.snapshot(), before);
  assert.equal(events.length, 2);
  assert.equal(inventory.count('cooked-fish'), 0);
  canAdd = true;
  assert.equal(story.act('return-work-bundle').ok, true);
  assert.equal(story.act('return-work-bundle').ok, false);
  assert.equal(inventory.count('cooked-fish'), 2);
});

test('the shrine can be restored independently, costs one spare stick, and preserves weapon wear', () => {
  const { story, inventory, weapons } = fixture({ sticks: 2 });
  weapons.equip('forest-stick'); weapons.contact('forest-stick');
  const wear = weapons.status('forest-stick').durability;
  assert.equal(story.act('restore-memorial').ok, true);
  assert.equal(story.state.workAccepted, false);
  assert.equal(story.view().task, null);
  assert.equal(story.view().discoveredCount, 1);
  assert.equal(inventory.count('forest-stick'), 1);
  assert.equal(weapons.status('forest-stick').durability, wear);
  assert.equal(story.act('restore-memorial').ok, false);
  assert.equal(inventory.count('forest-stick'), 1);
  assert.match(story.siteView('moss-shrine').lines.join(' '), /stands straight/);
  assert.match(story.view().entries[0].afterword, /upright/);
  assert.equal(validateForestStorySnapshot(story.snapshot()), true);
});

test('missing sticks or a failed weapon spend cannot complete the shrine or emit progress', () => {
  const { story, inventory, events } = fixture();
  const before = story.snapshot();
  const restore = story.availableActions('moss-shrine').find(action => action.id === 'restore-memorial');
  assert.equal(restore.enabled, false);
  assert.match(restore.reason, /one forest stick/);
  assert.equal(story.act('restore-memorial').ok, false);
  assert.deepEqual(story.snapshot(), before);
  assert.equal(events.length, 0);
  inventory.add('forest-stick', 1);
  const rejected = createForestStory({ inventory, weapons: { spendSticks: () => false } });
  assert.equal(rejected.act('restore-memorial').ok, false);
  assert.equal(rejected.state.memorialRestored, false);
  assert.equal(inventory.count('forest-stick'), 1);
});

test('completed and partial snapshots restore without granting items or repeating rewards', () => {
  const initial = fixture({ sticks: 1 });
  initial.story.act('accept-woodcutter-errand'); initial.story.act('recover-work-bundle');
  const partial = initial.story.snapshot();
  const restored = fixture({ sticks: 1 });
  assert.equal(restored.story.restore(partial), true);
  assert.equal(restored.inventory.count('cooked-fish'), 0);
  assert.equal(restored.events.length, 0);
  assert.equal(restored.story.act('return-work-bundle').ok, true);
  assert.equal(restored.story.act('restore-memorial').ok, true);
  assert.equal(restored.inventory.count('forest-stick'), 0);
  const complete = restored.story.snapshot();
  const again = fixture();
  assert.equal(again.story.restore(complete), true);
  assert.equal(again.events.length, 0);
  assert.equal(again.inventory.count('cooked-fish'), 0);
  assert.equal(again.story.act('return-work-bundle').ok, false);
  assert.equal(again.story.act('restore-memorial').ok, false);
  assert.equal(again.story.state.complete, true);
});

test('absent legacy state initializes cleanly; invalid present snapshots reject atomically', () => {
  const { story } = fixture();
  story.act('accept-woodcutter-errand'); story.act('inspect-fern-hollow');
  const before = story.snapshot();
  const invalid = [null, [], {}, { ...before, version: 2 }, { ...before, revision: -1 },
    { ...before, revision: 99 }, { ...before, workAccepted: 'yes' },
    { ...before, inspected: ['not-a-site'], revision: 2 },
    { ...before, inspected: ['fern-hollow', 'fern-hollow'], revision: 3 },
    { ...before, bundleReturned: true, revision: 3 }];
  for (const data of invalid) {
    assert.equal(validateForestStorySnapshot(data), false);
    assert.equal(story.restore(data), false);
    assert.deepEqual(story.snapshot(), before);
  }
  assert.equal(validateForestStorySnapshot(undefined), true);
  assert.equal(validateForestStorySnapshot(undefined, { allowMissing: false }), false);
  assert.equal(story.restore(undefined), true);
  assert.equal(story.state.revision, 0);
  assert.equal(story.view().task, null);
});

test('snapshot, restored data, and journal results do not expose mutable controller state', () => {
  const { story } = fixture();
  story.act('inspect-bee-fold'); story.act('accept-woodcutter-errand');
  const data = story.snapshot();
  assert.equal(story.restore(data), true);
  data.inspected.push('fern-hollow');
  story.state.inspected.push('coast-lookout');
  const view = story.view(); view.task.destinationIds.push('moss-shrine'); view.entries[0].title = 'changed';
  assert.deepEqual(story.state.inspected, ['bee-fold']);
  assert.deepEqual(story.view().task.destinationIds, ['charcoal-hearth']);
  assert.equal(story.view().entries[0].title, 'The Bee Fold');
});

function dialogueFixture(story) {
  const screens = [];
  let closes = 0;
  const context = { forestStory: story, act: id => story.act(id),
    openDialogue: (npc, lines, unused, label, options) => screens.push({ npc, lines, label, options }),
    closeDialogue: () => closes++ };
  return { screens, context, get closes() { return closes; } };
}

test('Tamsin dialogue supports found-first, return, friendship, and local tangents without the main political reveal', () => {
  const { story, inventory } = fixture();
  const ui = dialogueFixture(story);
  assert.equal(forestConversation({ id: 'someone-else' }, ui.context), false);
  assert.equal(ui.screens.length, 0);
  story.act('recover-work-bundle');
  forestConversation(FOREST_STORY_NPC, ui.context);
  let screen = ui.screens.at(-1);
  assert.match(screen.lines.join(' '), /stitched T/);
  assert.doesNotMatch(screen.lines.join(' '), /true government|legitimate|Assembly/);
  screen.options.choices.find(choice => choice.id === 'accept-woodcutter-errand').action();
  assert.equal(ui.closes, 1);
  forestConversation(FOREST_STORY_NPC, ui.context);
  ui.screens.at(-1).options.choices.find(choice => choice.id === 'return-work-bundle').action();
  assert.equal(inventory.count('cooked-fish'), 2);
  forestConversation(FOREST_STORY_NPC, ui.context);
  screen = ui.screens.at(-1);
  assert.match(screen.lines.join(' '), /thanks to you/);
  assert.equal(screen.options.choices.some(choice => choice.id === 'return-work-bundle'), false);
  screen.options.choices.find(choice => choice.id === 'tamsin-levy').action();
  assert.match(ui.screens.at(-1).lines.join(' '), /levy clerk/);
  assert.doesNotMatch(ui.screens.at(-1).lines.join(' '), /true government|legitimate|Assembly/);
  ui.screens.at(-1).options.onComplete();
  assert.equal(ui.screens.at(-1).npc.id, FOREST_STORY_NPC.id);
  assert.equal(inventory.count('cooked-fish'), 2);
});

test('place conversations record notes only once, expose costs, and let players leave without a task', () => {
  const { story, events } = fixture();
  const ui = dialogueFixture(story);
  assert.equal(forestSiteConversation('no-such-place', ui.context), false);
  assert.equal(forestSiteConversation('moss-shrine', ui.context), true);
  const screen = ui.screens.at(-1);
  const restore = screen.options.choices.find(choice => choice.id === 'restore-memorial');
  assert.equal(restore.enabled, false);
  assert.match(restore.label, /1 stick/);
  screen.options.choices.find(choice => choice.id === 'leave-moss-shrine').action();
  assert.equal(ui.closes, 1);
  assert.equal(story.view().task, null);
  forestSiteConversation('moss-shrine', ui.context);
  assert.equal(events.length, 1);
  assert.equal(story.state.memorialRestored, false);
});
