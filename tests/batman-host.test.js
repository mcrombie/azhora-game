import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { createBatmanQuestHost } from '../src/content/quests/batman/batman-quest-host.js';
import { BATMAN_QUEST } from '../src/content/quests/batman/batman-quest.js';
import { createCombat } from '../src/gameplay/combat/combat.js';
import { createInventoryState } from '../src/gameplay/inventory/inventory.js';
import { createSkills } from '../src/gameplay/skills/skills.js';
import { BAT_CAVE, BAT_LANDING } from '../src/content/regions/suval-highlands/suval-highlands.js';
import { sourceModule } from './module-loader.js';
const { createBatman } = await sourceModule('../src/content/quests/batman/batman-model.js');

function fixture() {
  const player = { group: new THREE.Group() }; player.group.position.set(BAT_CAVE.approach.x, 2, BAT_CAVE.approach.z);
  const world = { bounds: { minX: -6000, maxX: 2000, minZ: -3000, maxZ: 3000 }, colliders: [], npcPositions: {}, heightAt: () => 2 };
  const actor = createBatman(), npc = { id: 'batman', name: 'Batman', actor, maxHp: 420 }, inventory = createInventoryState(); inventory.refresh = () => {};
  const skills = createSkills(), events = [], snapshots = [], chartSnapshots = [], healthChanges = [], combatEvents = [],
    combat = createCombat({ world, position: player.group.position, onEvent: event => combatEvents.push(event) });
  let dialogue = null, hp = 420, host;
  const crime = { health: () => ({ hp, maxHp: 420, status: hp > 0 ? 'alive' : 'dead' }), isDown: () => hp <= 0,
    recordCombatHit(hit) { hp = hit.hp; healthChanges.push({ hp, quest: host.quest.snapshot() }); } };
  host = createBatmanQuestHost({ npc, player, world, crime, combat, skills, inventory,
    openDialogue: (person, lines, event, action, options) => { dialogue = { person, lines, ...options }; },
    closeDialogue: () => { dialogue = null; },
    mount: model => { events.push('mount'); player.group.position.copy(model.passengerAnchor.getWorldPosition(new THREE.Vector3())); },
    dismount: p => { events.push('dismount'); player.group.position.set(p.x, world.heightAt(p.x, p.z), p.z); },
    reveal: e => events.push(e), narrate: e => events.push(e),
    changed: () => { if (host) { snapshots.push(host.snapshot()); chartSnapshots.push(events.filter(e => e?.type === 'cell-revealed').length); } } });
  function choose(text) {
    const choice = dialogue?.choices.find(one => one.label.includes(text)); assert.ok(choice, `Missing choice ${text}`);
    assert.equal(typeof choice.action, 'function', 'the real dialogue renderer invokes action'); choice.action();
  }
  return { host, npc, player, inventory, skills, combat, combatEvents, events, snapshots, chartSnapshots, healthChanges, choose, world,
    dialogue: () => dialogue, hp: () => hp };
}
test('Catie, Batman and the officer expose working actions to the real dialogue renderer', () => {
  const f = fixture();
  f.host.converseCatie({ id: 'katy', name: 'Catie' }); f.choose('I will look');
  assert.equal(f.host.quest.state().stage, 'searching');
  f.host.converseOfficer({ id: 'officer-verradross', name: 'Officer Verradross' }); f.choose('Accept the bounty');
  f.host.converseBatman(); f.choose('Speak to him'); f.choose('Show me Suval');
  assert.equal(f.host.mounted, true); assert.equal(f.host.quest.state().bounty, 'declined');
  for (const saved of f.snapshots) assert.equal(saved.batmanQuest.stage === 'flying', saved.batmanFlight.stage === 'flying', 'callbacks never see half of a flight transition');
  f.host.cancelForTesting(); assert.equal(f.host.mounted, false); assert.equal(f.host.quest.state().stage, 'friendly');
  assert.equal(f.skills.snapshot().skills.flying.xp, 0);
});
test('A carried tour survives reload, pauses for the landing dialogue, and rewards each skill once', () => {
  const f = fixture(); f.host.converseBatman(); f.choose('Speak to him'); f.choose('Show me Suval');
  while (f.host.flight.state().progress < .25) f.host.tick(.25);
  const saved = f.host.snapshot(), savedSkills = f.skills.snapshot(); assert.equal(saved.batmanFlight.visited.length, 0);
  assert.equal(f.events.filter(e => e?.type === 'cell-revealed').length, 0);
  const loaded = fixture(); loaded.skills.restore(savedSkills); assert.equal(loaded.host.restore(saved), true);
  assert.equal(loaded.host.mounted, true); assert.ok(Math.abs(loaded.npc.actor.group.position.y - f.npc.actor.group.position.y) < 1e-7);
  for (let i = 0; i < 10000 && loaded.host.mounted; i++) loaded.host.tick(.25);
  assert.equal(loaded.host.quest.state().stage, 'complete'); assert.equal(loaded.host.flight.state().stage, 'landed');
  assert.equal(loaded.host.flight.state().visited.length, 63);
  assert.equal(loaded.events.filter(e => e?.type === 'cell-revealed').length, 63);
  assert.equal(loaded.chartSnapshots.at(-1), 63, 'The final landing save includes every revealed Suval hex');
  assert.equal(loaded.player.group.position.x, BAT_LANDING.x + 2.8); assert.equal(loaded.player.group.position.z, BAT_LANDING.z);
  assert.equal(loaded.skills.snapshot().skills.flying.xp, BATMAN_QUEST.flyingXp);
  assert.equal(loaded.skills.snapshot().skills.cartography.xp, BATMAN_QUEST.cartographyXp);
  const landed = loaded.host.snapshot(); for (let i = 0; i < 60; i++) loaded.host.tick(.25, { playing: false });
  assert.deepEqual(loaded.host.snapshot(), landed);
  loaded.choose('Thank you');
  for (let i = 0; i < 10000 && loaded.host.flight.active; i++) loaded.host.tick(.25);
  assert.equal(loaded.host.quest.state().returned, true);
  assert.equal(loaded.npc.actor.group.position.x, BAT_CAVE.perch.x); assert.equal(loaded.npc.actor.group.position.z, BAT_CAVE.perch.z);
  const xp = loaded.skills.snapshot(); assert.equal(loaded.host.restore(loaded.host.snapshot()), true);
  loaded.host.tick(1); assert.deepEqual(loaded.skills.snapshot(), xp); assert.equal(loaded.host.beginFlight(), false);
  assert.equal(loaded.events.filter(e => e?.type === 'cell-revealed').length, 63, 'Home and reload do not repeat chart discovery');
});
test('Batman is one persistent injured actor across combat and reload', () => {
  const f = fixture(); f.host.converseBatman(); f.choose('Attack him');
  assert.equal(f.host.fighting, true); const enemy = f.combat.state.enemies[0]; assert.equal(enemy.kind, 'batman');
  enemy.x += 4; enemy.z += 2; f.combat.spellHit('batman', 100); f.host.tick(.1);
  assert.ok(f.hp() < 420); const saved = f.host.snapshot();
  assert.equal(saved.batmanGround.x, enemy.x); assert.equal(saved.batmanGround.z, enemy.z);
  const loaded = fixture(); assert.equal(loaded.host.restore(saved), true);
  assert.equal(loaded.npc.actor.group.position.x, enemy.x); assert.equal(loaded.npc.actor.group.position.z, enemy.z);
  const before = loaded.host.snapshot(); assert.equal(loaded.host.restore({ ...saved, batmanFlight: { ...saved.batmanFlight, stage: 'flying' } }), false);
  assert.deepEqual(loaded.host.snapshot(), before);
});
test('The death proof is a real inventory item consumed for the bounty exactly once', () => {
  const f = fixture(); f.host.converseOfficer({ id: 'officer-verradross' }); f.choose('Accept the bounty');
  f.host.attack(); f.combat.spellHit('batman', 10000); f.host.tick(.1);
  assert.ok(f.healthChanges.some(change => change.hp === 0));
  for (const change of f.healthChanges) if (change.hp === 0)
    assert.equal(change.quest.stage, 'dead', 'crime change callbacks must never save a dead actor with a living quest');
  assert.equal(f.host.quest.state().stage, 'dead'); f.player.group.position.copy(f.npc.actor.group.position);
  assert.ok(f.host.nearby()); f.host.takeHead(); f.choose('Take the head'); assert.equal(f.inventory.count(BATMAN_QUEST.headItem), 1);
  f.host.converseOfficer({ id: 'officer-verradross' }); f.choose('Hand over the head');
  assert.equal(f.inventory.count(BATMAN_QUEST.headItem), 0); assert.equal(f.inventory.count('copper-piece'), 100);
  f.host.converseOfficer({ id: 'officer-verradross' }); assert.ok(f.dialogue().lines[0].includes('paid'));
  assert.equal(f.host.nearby(), null);
});
test('A retreat remembers final health and position even after combat releases its actors', () => {
  const f = fixture(); f.host.attack(); const enemy = f.combat.state.enemies[0];
  enemy.x += 9; enemy.z += 3; enemy.hp = 210;
  const last = { x: enemy.x, z: enemy.z };
  assert.equal(f.combat.disengage(), true); assert.equal(f.combat.state.enemies.length, 0);
  const retreat = f.combatEvents.find(event => event.type === 'retreat'); assert.ok(retreat);
  assert.equal(f.host.combatEvent(retreat), true); assert.equal(f.host.fighting, false);
  assert.equal(f.hp(), 210); assert.equal(f.host.snapshot().batmanGround.x, last.x); assert.equal(f.host.snapshot().batmanGround.z, last.z);
});
