import test from 'node:test';
import assert from 'node:assert/strict';
import { IVY_PATCHES, IVY_VARIETIES } from '../src/content/quests/sylvia/ivy-sites.js';
import { createSylviaIvy, validateSylviaIvy, sylviaIvyChoice, SYLVIA_IVY_QUEST_ID, IVY_CLEAR_XP, IVY_QUEST_REWARD, IVY_REACH } from '../src/content/quests/sylvia/sylvia-ivy.js';
import { SYLVIA } from '../src/gameplay/skills/performance/visual-arts.js';
import { createSkills } from '../src/gameplay/skills/skills.js';
import { createInventoryState } from '../src/gameplay/inventory/inventory.js';
import { COPPER_ITEM } from '../src/gameplay/inventory/economy.js';

const first = IVY_PATCHES[0], second = IVY_PATCHES[1];
function fixture() {
  const skills = createSkills(), inventory = createInventoryState(), events = [], changes = [], tracked = [];
  const ivy = createSylviaIvy({ skills, inventory, onEvent: event => events.push(event),
    onChange: value => changes.push(value), onTrack: id => tracked.push(id) });
  return { ivy, skills, inventory, events, changes, tracked };
}
function clear(ivy, patch) {
  assert.equal(ivy.begin(patch.id, { position: patch.stand }).ok, true);
  return ivy.update(IVY_VARIETIES[patch.variety].clearSeconds, { position: patch.stand });
}

test('Sylvia rewards four harmless Drent patches once and each full pull earns Farming XP once', () => {
  const { ivy, skills, inventory, tracked, events } = fixture();
  assert.equal(IVY_PATCHES.length, 4);
  assert.equal(IVY_VARIETIES.drent.hostile, false);
  assert.equal(IVY_VARIETIES.drent.level, 1);
  assert.equal(IVY_VARIETIES.drent.clearSeconds, 2);
  assert.equal(ivy.view().stage, 'offered');
  assert.equal(ivy.view().active, false);
  assert.equal(ivy.report().ok, false);
  assert.equal(ivy.accept().ok, true);
  assert.equal(ivy.accept().ok, false);
  assert.deepEqual(tracked, [SYLVIA_IVY_QUEST_ID]);
  assert.equal(ivy.view().stage, 'clear');
  assert.equal(ivy.view().target.id, first.id);
  for (let i = 0; i < IVY_PATCHES.length; i++) {
    const patch = IVY_PATCHES[i], event = clear(ivy, patch);
    assert.equal(event.type, 'ivy-cleared');
    assert.equal(event.id, patch.id);
    assert.equal(event.remaining, IVY_PATCHES.length - i - 1);
    assert.equal(ivy.isCleared(patch.id), true);
    assert.equal(ivy.pose(), null);
    assert.equal(ivy.begin(patch.id, { position: patch.stand }).ok, false);
    assert.equal(skills.xp('farming'), (i + 1) * IVY_CLEAR_XP);
    if (event.remaining) assert.equal(ivy.report().ok, false);
  }
  assert.equal(skills.taught('farming'), true);
  assert.equal(ivy.view().stage, 'report');
  assert.deepEqual(ivy.view().destinationIds, [SYLVIA.id]);
  assert.equal(ivy.view().target, null);
  assert.equal(ivy.report().reward, IVY_QUEST_REWARD);
  assert.equal(inventory.count(COPPER_ITEM), IVY_QUEST_REWARD);
  assert.equal(ivy.view().stage, 'complete');
  assert.equal(ivy.view().active, false);
  assert.equal(ivy.report().ok, false);
  assert.equal(inventory.count(COPPER_ITEM), IVY_QUEST_REWARD);
  assert.equal(events.filter(event => event.type === 'ivy-cleared').length, 4);
  assert.equal(events.filter(event => event.type === 'ivy-reward').length, 1);
});

test('clearing before accepting persists and Sylvia counts the help without replacing plants or XP', () => {
  const { ivy, skills } = fixture();
  clear(ivy, first);
  assert.equal(ivy.view().stage, 'offered');
  assert.equal(ivy.view().cleared, 1);
  assert.equal(ivy.report().ok, false);
  const resumed = createSylviaIvy({ skills, inventory: createInventoryState() });
  assert.equal(resumed.restore(ivy.snapshot()), true);
  assert.equal(skills.xp('farming'), IVY_CLEAR_XP);
  assert.equal(resumed.isCleared(first.id), true);
  for (const patch of IVY_PATCHES.slice(1)) clear(resumed, patch);
  assert.equal(resumed.view().stage, 'offered');
  assert.equal(resumed.report().ok, false);
  assert.equal(resumed.accept().ok, true);
  assert.equal(resumed.view().stage, 'report');
  assert.equal(resumed.report().ok, true);
  assert.equal(skills.xp('farming'), IVY_PATCHES.length * IVY_CLEAR_XP);
});

test('ivy pulling freezes in menus, interrupts on movement or combat and grants nothing for partial work', () => {
  const { ivy, skills, events } = fixture();
  assert.equal(ivy.begin(first.id, { position: first.stand }).ok, true);
  ivy.update(.5, { position: first.stand });
  assert.equal(ivy.pose().progress, .25);
  ivy.update(120, { position: first.stand, paused: true });
  assert.equal(ivy.pose().progress, .25);
  ivy.update(1.5, { position: { x: first.stand.x + .46, z: first.stand.z } });
  assert.equal(ivy.pose(), null);
  assert.equal(ivy.isCleared(first.id), false);
  assert.equal(skills.xp('farming'), 0);
  assert.equal(skills.taught('farming'), false);
  assert.equal(events.at(-1).reason, 'moved');
  assert.equal(ivy.begin(first.id, { position: first.stand, blocked: true }).ok, false);
  ivy.begin(first.id, { position: first.stand });
  ivy.update(1.9, { position: first.stand });
  ivy.update(1, { position: first.stand, blocked: true, paused: true });
  assert.equal(ivy.pose(), null);
  assert.equal(ivy.isCleared(first.id), false);
  assert.equal(events.at(-1).reason, 'combat');
  ivy.begin(first.id, { position: first.stand });
  assert.equal(ivy.cancel('cancelled'), true);
  assert.equal(ivy.cancel(), false);
  assert.equal(skills.xp('farming'), 0);
  clear(ivy, first);
  assert.equal(skills.xp('farming'), IVY_CLEAR_XP);
});

test('patch interaction requires valid reachable roots and cannot clear remotely or duplicate an active pull', () => {
  const { ivy } = fixture();
  assert.equal(ivy.nearest(first.stand).id, first.id);
  assert.equal(ivy.nearest({ x: 0, z: 0 }), null);
  for (const position of [undefined, {}, { x: NaN, z: first.stand.z }, { x: first.stand.x, z: Infinity },
    { x: first.stand.x + IVY_REACH + .1, z: first.stand.z }]) {
    assert.equal(ivy.begin(first.id, { position }).ok, false);
  }
  assert.equal(ivy.begin('invented-patch', { position: first.stand }).ok, false);
  const edge = { x: first.stand.x + IVY_REACH - .01, z: first.stand.z };
  assert.equal(ivy.begin(first.id, { position: edge }).ok, true);
  assert.equal(ivy.begin(second.id, { position: second.stand }).ok, false);
  ivy.update(2, { position: { x: edge.x + .02, z: edge.z } });
  assert.equal(ivy.pose(), null, 'leaving reach interrupts even without moving 0.45 metres');
  assert.equal(ivy.isCleared(first.id), false);
  ivy.begin(first.id, { position: first.stand });
  for (const dt of [NaN, Infinity, -1, 0]) ivy.update(dt, { position: first.stand });
  assert.equal(ivy.pose().progress, 0);
  ivy.update(2, { position: first.stand });
  assert.notEqual(ivy.nearest(first.stand)?.id, first.id, 'cleared roots are no longer interactable');
});

test('saves preserve only cleared roots, reject malformed state atomically and restore without paying rewards', () => {
  const { ivy, skills, inventory, events } = fixture();
  clear(ivy, first); ivy.accept();
  ivy.begin(second.id, { position: second.stand });
  ivy.update(1, { position: second.stand });
  const saved = ivy.snapshot();
  assert.deepEqual(Object.keys(saved).sort(), ['accepted', 'cleared', 'complete', 'version']);
  assert.equal(ivy.restore(saved), true);
  assert.equal(ivy.pose(), null);
  assert.equal(ivy.isCleared(first.id), true);
  assert.equal(ivy.isCleared(second.id), false);
  assert.equal(skills.xp('farming'), IVY_CLEAR_XP);
  saved.cleared.length = 0;
  assert.equal(ivy.isCleared(first.id), true, 'snapshot and restore arrays do not alias live state');
  const before = ivy.snapshot();
  for (const bad of [null, [], {}, { ...before, version: 2 }, { ...before, accepted: 1 },
    { ...before, cleared: null }, { ...before, cleared: ['unknown'] }, { ...before, cleared: new Array(1) },
    { ...before, cleared: [first.id, first.id] }, { ...before, complete: true },
    { ...before, accepted: false, cleared: IVY_PATCHES.map(patch => patch.id), complete: true },
    { ...before, active: { id: second.id, progress: 1 } }]) {
    assert.equal(validateSylviaIvy(bad), false);
    assert.equal(ivy.restore(bad), false);
    assert.deepEqual(ivy.snapshot(), before);
  }
  for (const patch of IVY_PATCHES.slice(1)) clear(ivy, patch);
  ivy.report();
  const paid = ivy.snapshot(), eventCount = events.length;
  assert.equal(ivy.restore(paid), true);
  assert.equal(events.length, eventCount, 'restoring emits no reward or completed-pull event');
  assert.equal(inventory.count(COPPER_ITEM), IVY_QUEST_REWARD);
  assert.equal(skills.xp('farming'), IVY_PATCHES.length * IVY_CLEAR_XP);
  assert.equal(ivy.report().ok, false);
  assert.equal(validateSylviaIvy(undefined), true);
  assert.equal(validateSylviaIvy(undefined, { allowMissing: false }), false);
  assert.equal(ivy.restore(undefined), true);
  assert.deepEqual(ivy.snapshot(), { version: 1, accepted: false, cleared: [], complete: false });
});

test('a failed copper delivery leaves the report claim available', () => {
  let canPay = false, paid = 0;
  const ivy = createSylviaIvy({ inventory: { add: (id, count) => {
    assert.equal(id, COPPER_ITEM);
    if (!canPay) return false;
    paid += count; return true;
  } } });
  ivy.accept(); for (const patch of IVY_PATCHES) clear(ivy, patch);
  assert.equal(ivy.report().ok, false);
  assert.equal(ivy.view().stage, 'report');
  canPay = true;
  assert.equal(ivy.report().ok, true);
  assert.equal(ivy.report().ok, false);
  assert.equal(paid, IVY_QUEST_REWARD);
});

test('Sylvia adds an optional acceptance, reminder and report choice without replacing her art conversation', () => {
  const { ivy, inventory } = fixture();
  let dialogue, notifications = 0, changes = 0;
  const context = { ivy, openDialogue: (...args) => { dialogue = args; }, closeDialogue: () => {},
    onChange: () => { changes++; }, notify: () => { notifications++; } };
  assert.equal(sylviaIvyChoice({ id: 'other-person' }, context), null);
  let choice = sylviaIvyChoice(SYLVIA, context);
  assert.equal(choice.id, 'sylvia-ivy-accept');
  choice.action();
  assert.equal(ivy.view().active, false, 'reading the offer alone does not accept it');
  assert.match(dialogue[1].join(' '), /harmless/);
  dialogue[4].onComplete();
  assert.equal(ivy.view().active, true);
  assert.equal(notifications, 1);
  choice = sylviaIvyChoice(SYLVIA, context);
  assert.equal(choice.id, 'sylvia-ivy-reminder');
  choice.action(); assert.match(dialogue[1][0], /0 of 4/);
  for (const patch of IVY_PATCHES) clear(ivy, patch);
  choice = sylviaIvyChoice(SYLVIA, context);
  assert.equal(choice.id, 'sylvia-ivy-report');
  choice.action();
  assert.equal(inventory.count(COPPER_ITEM), IVY_QUEST_REWARD);
  assert.equal(changes, 2);
  assert.match(dialogue[1].join(' '), /spare easel/);
  assert.equal(sylviaIvyChoice(SYLVIA, context), null);
});
