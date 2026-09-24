import test from 'node:test';
import assert from 'node:assert/strict';
import { createLivingStory } from '../src/living-story.js';
import { createLivingStoryHost } from '../src/living-story-host.js';
import { createInventoryState } from '../src/inventory.js';
import { MERCENARY_ROSTER } from '../src/mercenaries.js';
import { createJourney } from '../src/journey.js';
import { createWeapons } from '../src/weapons.js';
import { createSkills } from '../src/skills.js';
import { createMorosChapter, MOROS_PAY } from '../src/moros-chapter.js';
import { createQuestTracker } from '../src/quest-tracker.js';
import { createCombat } from '../src/combat.js';

function setup({ realCombat = false } = {}) {
  let story = createLivingStory({ roster: MERCENARY_ROSTER.filter(a => a.id === 'merc-word') }), mode = 'playing';
  const inventory = createInventoryState(), screens = [], notices = [], routes = [], combats = [], musters = [], trust = [];
  const npc = { id: 'merc-word', name: 'Ed the Word', modelRole: 'mercenary', actor: { group: { position: { x: 1, z: 0 } } } };
  const npcById = new Map([[npc.id, npc]]), pos = { x: 0, z: 0 }, saves = [];
  const combat = realCombat ? createCombat({position:pos,
    world:{heightAt:()=>1.5,colliders:[],bounds:{minX:-80,maxX:80,minZ:-80,maxZ:80}}})
    : { state: { phase: 'idle' }, startEncounter(value) { combats.push(value); this.state.phase = 'active'; return true; } };
  const riding = { owned: false, mounted: false, dismount() { this.mounted = false; } };
  const host = createLivingStoryHost({ story: () => story, inventory, npcById, combat, position: () => pos, riding,
    openDialogue(npc, lines, event, label, options) { mode = 'dialogue'; screens.push({ npc, lines, options }); },
    closeDialogue() { mode = 'playing'; }, getMode: () => mode,
    toast: (...args) => notices.push(args), save: () => saves.push(story.snapshot()),
    route: { setCourier: value => routes.push(value) }, onMuster: side => musters.push(side), onTrust: n => trust.push(n) });
  const choose = id => screens.at(-1).options.choices.find(c => c.id === id).action();
  const recall = () => { story.arriveMuster('merc-word'); story.tick(60); host.frame(); };
  const overdue = () => {
    host.reportPlayer(); story.acceptSatchel('player'); story.takeSatchel('player'); inventory.add('courier-satchel', 1);
    story.reportNothom('merc-word'); story.tick(600); host.frame();
  };
  return { host, get story() { return story; }, replace: value => { story = value; }, inventory, screens, notices,
    routes, combats, musters, trust, saves, npc, pos, combat, riding, choose, recall, overdue,
    escape: () => { mode = 'playing'; }, setMode: value => { mode = value; } };
}

test('first report saves the reservation, issues one token, and does not secretly accept the assignment', () => {
  const f = setup(); f.host.reportPlayer(); f.host.reportPlayer();
  assert.equal(f.inventory.count('horse-token'), 1); assert.equal(f.story.satchel().assignee, null);
  assert.equal(f.saves.length, 2); assert.equal(f.story.snapshot().horses.length, 1);
  assert.match(f.host.horseNote(), /three|3/); assert.match(f.host.horseNote(), /reserved/);
});

test('satchel journal note contains the actual calendar due time and active countdown', () => {
  const f = setup(); f.host.reportPlayer(); f.story.acceptSatchel('player'); f.story.tick(61);
  assert.match(f.host.satchelNote(), /1 April 980/); assert.match(f.host.satchelNote(), /16:00/);
  assert.match(f.host.satchelNote(), /8m 59s remaining/); assert.match(f.host.satchelNote(), /Menus pause/);
});

test('warning is emitted once only for the player and cannot leak unrelated NPC deadlines', () => {
  const f = setup(); f.host.reportPlayer(); f.story.acceptSatchel('player'); f.host.frame();
  f.story.tick(480); f.host.frame(); f.host.frame();
  assert.equal(f.notices.filter(n => n[1] === 'COURIER DEADLINE').length, 1);
  const g = setup(); g.story.reportNothom('merc-word'); g.story.tick(480); g.host.frame();
  assert.equal(g.notices.length, 0);
});

test('Esc cannot strand a recall offer and frames do not stack it over an existing dialogue', () => {
  const f = setup(); f.recall(); assert.equal(f.screens.length, 1);
  f.host.frame(); assert.equal(f.screens.length, 1);
  f.escape(); f.host.frame(); assert.equal(f.screens.length, 2);
  assert.equal(f.story.recall().status, 'offered');
  f.choose('recall-yes'); assert.equal(f.story.recall().status, 'passenger');
  assert.deepEqual(f.routes.at(-1), { id: 'merc-word', mode: 'passenger' });
});

test('courier cannot interrupt combat or another interaction, nor accept from across the map', () => {
  const f = setup(); f.combat.state.phase = 'active'; f.recall();
  assert.equal(f.screens.length, 0); assert.equal(f.story.recall().status, 'seeking');
  f.combat.state.phase = 'idle'; f.setMode('inventory'); f.host.frame(); assert.equal(f.screens.length, 0);
  f.escape(); f.host.frame(); f.pos.x = 200; f.choose('recall-yes');
  assert.equal(f.story.recall().status, 'offered'); assert.equal(f.musters.length, 0);
});

test('refusal needs confirmation and keeps Republican recruitment available', () => {
  const f = setup(); f.recall(); f.choose('recall-no');
  assert.equal(f.story.player().imperialRefused, false);
  f.choose('recall-reconsider'); assert.equal(f.screens.at(-1).options.choices[0].id, 'recall-yes');
  f.choose('recall-no'); f.choose('recall-confirm-no');
  assert.equal(f.story.player().imperialRefused, true); assert.deepEqual(f.trust, [-15]);
  assert.equal(f.story.setPlayerSide('coalition'), true);
});

test('a stale recall choice cannot take a Republican recruit or an unrelated loaded save', () => {
  const f = setup(); f.recall(); const stale = f.screens.at(-1).options.choices.find(c => c.id === 'recall-yes');
  f.story.setPlayerSide('coalition'); stale.action(); assert.equal(f.story.recall().status, 'cancelled');
  assert.equal(f.routes.some(r => r.mode === 'passenger'), false);
  const g = setup(); g.recall(); const previous = g.screens.at(-1).options.choices[0];
  g.replace(createLivingStory({ roster: MERCENARY_ROSTER.filter(a => a.id === 'merc-word') })); previous.action();
  assert.equal(g.story.recall().status, 'none'); assert.equal(g.routes.some(r => r.mode === 'passenger'), false);
});

test('courier return belongs to the actual dispatched actor and clears the saved return obligation', () => {
  const f = setup(); f.recall(); f.choose('recall-yes');
  f.host.routeEvent({ type: 'courier-returned', id: 'merc-jerry' }); assert.equal(f.musters.length, 0);
  f.host.routeEvent({ type: 'courier-returned', id: 'merc-word' });
  assert.deepEqual(f.musters, ['empire']); assert.equal(f.story.recall().courier, null);
  f.host.routeEvent({ type: 'courier-returned', id: 'merc-word' }); assert.equal(f.musters.length, 1);
});

test('refused courier returns once instead of endlessly receiving new return commands after arrival', () => {
  const f = setup(); f.recall(); f.choose('recall-no'); f.choose('recall-confirm-no'); f.host.frame();
  assert.equal(f.routes.at(-1).mode, 'return');
  f.host.routeEvent({ type: 'courier-returned', id: 'merc-word' }); f.host.frame();
  assert.equal(f.story.recall().courier, null); assert.equal(f.routes.at(-1).mode, null);
  assert.equal(f.story.player().imperialRefused, true);
});

test('Esc cannot strand handover, and agreeing transfers model and inventory exactly once', () => {
  const f = setup(); f.overdue(); assert.equal(f.screens.length, 1); f.host.frame(); assert.equal(f.screens.length, 1);
  f.escape(); f.host.frame(); assert.equal(f.screens.length, 2);
  f.choose('satchel-handover-yes'); assert.equal(f.inventory.has('courier-satchel'), false);
  assert.equal(f.story.satchel().carrier, 'merc-word'); f.host.frame(); assert.equal(f.screens.length, 2);
});

test('late delivery invalidates an already displayed handover demand', () => {
  const f = setup(); f.overdue();
  f.story.deliverSatchel('player'); f.inventory.remove('courier-satchel', 1); f.choose('satchel-handover-no');
  assert.equal(f.combats.length, 0); assert.equal(f.story.satchel().completedBy, 'player');
});

test('refusing handover starts one ordinary physical encounter with that mercenary', () => {
  const f = setup(); f.overdue(); f.choose('satchel-handover-no');
  assert.equal(f.combats.length, 1); assert.equal(f.combats[0].enemies[0].npcId, 'merc-word');
  assert.equal(f.inventory.has('courier-satchel'), true); assert.equal(f.story.satchel().handover.status, 'hostile');
  f.escape(); f.combat.state.phase = 'idle'; f.host.frame(); assert.equal(f.screens.length, 1);
});

test('hostile handover passes real combat validation and creates exactly the persistent mercenary', () => {
  const f = setup({realCombat:true}); f.overdue(); f.choose('satchel-handover-no');
  assert.equal(f.combat.state.phase, 'active');
  assert.equal(f.combat.state.encounterId, 'satchel-handover-merc-word');
  assert.equal(f.combat.state.enemies.length, 1);
  const enemy = f.combat.state.enemies[0];
  assert.equal(enemy.npcId, 'merc-word'); assert.equal(enemy.kind, 'soldier');
  assert.equal(enemy.model.role, 'mercenary');
  assert.equal(f.inventory.count('courier-satchel'), 1);
  assert.equal(f.story.satchel().carrier, 'player');
  assert.equal(f.story.satchel().handover.status, 'hostile');
  f.combat.update(1 / 60);
  assert.equal(f.combat.state.phase, 'active', 'valid local retreat line must not immediately retreat');
});

test('a refused encounter start leaves handover reopenable rather than permanently hostile without a fight', () => {
  const f = setup(); f.overdue(); f.combat.startEncounter=()=>false;
  f.choose('satchel-handover-no');
  assert.equal(f.story.satchel().handover.status, 'seeking');
  assert.equal(f.story.satchel().carrier, 'player');
  assert.equal(f.inventory.count('courier-satchel'), 1);
  assert.match(f.notices.at(-1)[0], /cannot begin/);
  f.host.frame(); assert.equal(f.screens.length, 2);
});

test('another mercenary completing Chip work closes the available or accepted side job without rewarding the player', () => {
  for (const accepted of [false, true]) {
    const f = setup(); f.inventory.add('harbor-letter', 1); f.inventory.add('road-token', 1); f.inventory.add('forest-stick', 3);
    const skills = createSkills(), weapons = createWeapons({ inventory: f.inventory });
    const journey = createJourney({ inventory: f.inventory, weapons, skills,
      sharedBridge: () => ({ completed: f.story.bridge().status === 'complete' }) });
    journey.start(); if (accepted) journey.act('meet-crossing-keeper'); const prior = skills.snapshot();
    f.story.claimBridge('merc-word'); f.story.addBridgeMaterials('merc-word', 3); f.story.workBridge('merc-word', 20); f.story.completeBridge('merc-word');
    assert.equal(journey.state.bridge, 'missed'); assert.equal(journey.act('repair-bridge').ok, false);
    assert.equal(journey.act('return-crossing-keeper').ok, false); assert.equal(f.inventory.count('forest-stick'), 3);
    assert.deepEqual(skills.snapshot(), prior); assert.equal(journey.act('deliver-report').ok, true);
  }
});

test('horse stock exhaustion does not block Moros progression or mint a fifth horse', () => {
  const inventory = createInventoryState(), moros = createMorosChapter({ inventory, onFoot: () => true });
  moros.start(); moros.act('admit-to-camp'); moros.act('join-muster');
  assert.equal(moros.availableActions()[0].enabled, true); assert.match(moros.view().title, /foot/);
  const result = moros.act('claim-legion-horse'); assert.equal(result.ok, true); assert.equal(result.reward, null);
  assert.equal(moros.view().complete, true); assert.equal(inventory.count('copper-piece'), MOROS_PAY);
  assert.equal(inventory.has('horse-token'), false); assert.match(moros.view().detail, /marching supplies/);
});

test('rejecting the Imperial main quest removes it from tracking without stealing side quest focus', () => {
  const tracker = createQuestTracker();
  const optional = [{ id: 'luscia-republic', active: true, type: 'secondary', title: 'Civil War in Luscia', destinationIds: ['timber-stall'] }];
  tracker.update({ main: { active: false }, optional });
  assert.equal(tracker.selectedId, 'luscia-republic'); assert.equal(tracker.view().choices.some(q => q.id === 'main'), false);
  assert.deepEqual(tracker.target({ x: 90, z: 90 }, id => ({ x: 1, z: 2 })), { id: 'timber-stall', x: 1, z: 2 });
  tracker.update({ main: { active: false }, optional: [] });
  assert.equal(tracker.selectedId, 'free-roam'); assert.equal(tracker.target({ x: 90, z: 90 }), null);
});
