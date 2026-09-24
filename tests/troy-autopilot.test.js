import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { createTroyAutopilot } from '../src/troy-autopilot.js';
import { CLUES, MURDERER, TROY, WITNESS_IDS, createMurderQuest,
  troyConversation, cobbleConversation } from '../src/murder-quest.js';
import { canStand, moveCharacter } from '../src/game-state.js';
import { BODY, bodyWorld } from '../src/bodies.js';

const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const world = () => ({ bounds: { minX: -200, maxX: 200, minZ: -200, maxZ: 200 },
  colliders: [], heightAt: () => 1.5 });
const base = () => ({ mode: 'playing', position: { x: 0, z: 0 }, quest: { stage: 'unmet', heard: [], restUntil: 0 }, now: 0,
  troy: { x: 0, z: 2, available: true }, witnesses: Object.fromEntries(WITNESS_IDS.map((id, index) => [id, { x: 10 + index * 10, z: 10, available: true }])),
  combat: { phase: 'peaceful', action: 'idle', hp: 100 }, interaction: { npcId: TROY.id } });
const ticks = (pilot, count, dt = .25) => { for (let index = 0; index < count; index++) pilot.step(dt); };

for (const layout of ['flat', 'built Cobble']) test(`Troy pilot completes the real conversations on foot in ${layout}, and leaves the reward to the player`, async () => {
  const terrain = layout === 'flat' ? world() : (await sourceModule('../src/world.js')).createWorld(new THREE.Scene());
  const navigation = bodyWorld(terrain), murder = createMurderQuest();
  const people = [{ id: TROY.id, name: 'Troy', x: 0, z: 0 },
    { id: WITNESS_IDS[0], name: 'Jessi', x: 15, z: 10 },
    { id: WITNESS_IDS[1], name: 'Ari', x: -8, z: 24 },
    { id: WITNESS_IDS[2], name: 'Imani', x: -20, z: 3 }];
  if (layout !== 'flat') for (const person of people) Object.assign(person, terrain.npcPositions[person.id]);
  const bodies = layout === 'flat' ? people : Object.entries(terrain.npcPositions)
    .map(([id, stand]) => ({ id, ...stand })).filter(person => gap(person, people[0]) < 70);
  const position = { x: people[0].x + 1.8, z: people[0].z, y: terrain.heightAt(people[0].x + 1.8, people[0].z) };
  let mode = 'playing', dialogue = null, now = 0, distance = 0, cameraYaw = 0;
  const chosen = [], visited = [], stops = [];
  const closeDialogue = () => { mode = 'playing'; dialogue = null; };
  const openDialogue = (npc, lines, unused, label, options = {}) => {
    mode = 'dialogue'; dialogue = { npc, lines, index: 0, ...options };
  };
  const questAction = (action, id) => {
    if (action === 'murder-begin') assert.equal(murder.begin(), true);
    else if (action === 'murder-hear') assert.ok(murder.hear(id));
    else if (action === 'murder-accuse') {
      assert.deepEqual(murder.state.heard, [...CLUES], 'all actual testimony must be recorded before the accusation');
      assert.equal(murder.accuse(id, now).ok, true);
    } else assert.fail(`The pilot must not take a reward: ${action}`);
  };
  const nearby = () => people.filter(npc => gap(position, npc) < 2.6).sort((a, b) => gap(position, a) - gap(position, b))[0];
  const shownChoices = () => dialogue?.index === dialogue?.lines.length - 1 ? dialogue.choices ?? [] : [];
  const read = () => ({ mode, position: { ...position }, cameraYaw, quest: murder.state, now,
    troy: { ...people[0], available: true }, witnesses: Object.fromEntries(people.slice(1).map(npc => [npc.id, { ...npc, available: true }])),
    combat: { phase: 'peaceful', action: 'idle', hp: 100 }, interaction: { npcId: nearby()?.id },
    dialogue: dialogue && { npcId: dialogue.npc.id, choices: shownChoices().map(({ id }) => ({ id })) } });
  const pilot = createTroyAutopilot({ world: navigation, read, options: { dialoguePace: .15, choicePace: .15, interactEvery: .15 }, act: {
    interact: () => {
      const npc = nearby(); assert.ok(npc, 'talk requires actually reaching the person'); visited.push(npc.id);
      const context = { murder, openDialogue, closeDialogue, act: questAction, now, reads: false, ambient: ['What do you need?'] };
      assert.ok(npc.id === TROY.id ? troyConversation(npc, context) : cobbleConversation(npc, context));
    },
    continue: () => {
      assert.ok(dialogue && shownChoices().length === 0);
      if (dialogue.index < dialogue.lines.length - 1) dialogue.index++;
      else if (dialogue.onComplete) dialogue.onComplete();
      else closeDialogue();
    },
    choose: ({ id }) => {
      const choice = shownChoices().find(choice => choice.id === id); assert.ok(choice, `visible ordinary reply: ${id}`);
      chosen.push(id); choice.action();
    },
  } });
  pilot.onEvent(event => { if (event.type === 'stop') stops.push(event); });
  pilot.start();
  for (let frame = 0; frame < 18000 && pilot.active; frame++) {
    const dt = 1 / 60, before = { ...position };
    navigation.setBodies(bodies.map(person => ({ ...person, r: BODY.person }))).moving(position, BODY.traveler, 'traveler');
    pilot.step(dt);
    if (Number.isFinite(pilot.yaw)) cameraYaw += Math.atan2(Math.sin(pilot.yaw - cameraYaw), Math.cos(pilot.yaw - cameraYaw)) * (1 - Math.exp(-3.5 * dt));
    if (mode === 'playing') {
      now += dt;
      const { forward, side } = pilot.move;
      moveCharacter(position, (-Math.sin(cameraYaw) * forward + Math.cos(cameraYaw) * side) * 4.2 * dt,
        (-Math.cos(cameraYaw) * forward - Math.sin(cameraYaw) * side) * 4.2 * dt, navigation);
    }
    const walked = gap(before, position); distance += walked;
    assert.ok(walked <= .071, 'investigation only moves through ordinary walk inputs');
    assert.ok(canStand(position.x, position.z, terrain), 'the route remains on walkable ground');
  }
  assert.equal(murder.state.stage, 'solved', JSON.stringify({ reason: pilot.stopReason, position, visited, heard: murder.state.heard, intent: pilot.intent }));
  assert.deepEqual(visited, [TROY.id, ...WITNESS_IDS, TROY.id, TROY.id]);
  assert.deepEqual(chosen, ['murder-take', 'ask-bregga', 'leave-cobble-talk', 'ask-bregga', 'leave-cobble-talk',
    'ask-bregga', 'leave-cobble-talk', 'murder-name', `accuse-${MURDERER}`]);
  assert.deepEqual(murder.state.accused, [MURDERER], 'never guess an innocent name');
  assert.ok(distance > (layout === 'flat' ? 70 : 25), 'all witnesses and the return trip were physically walked');
  assert.equal(stops.at(-1)?.completed, true); assert.equal(stops.at(-1)?.questId, 'cobble-murder');
  assert.equal(mode, 'dialogue'); assert.deepEqual(shownChoices().map(choice => choice.id), ['murder-purse', 'murder-lesson']);
  assert.ok(!chosen.includes('read-them'), 'Mind Read is not required to earn Mind Read');
  pilot.start(); pilot.step(.1);
  assert.equal(pilot.active, false, 'resuming the pilot still preserves the visible reward choice');
  assert.equal(murder.state.stage, 'solved');
});

test('a resumed partial case visits the next missing witness and refuses premature accusations', () => {
  const snapshot = base(), chosen = [];
  snapshot.quest = { stage: 'asking', heard: [CLUES[0]], ready: true, restUntil: 0 };
  snapshot.interaction = null;
  const pilot = createTroyAutopilot({ world: world(), read: () => snapshot, act: { choose: ({ id }) => chosen.push(id) } });
  pilot.start(); assert.equal(pilot.step(.1).targetId, WITNESS_IDS[1]);
  snapshot.mode = 'dialogue'; snapshot.dialogue = { npcId: TROY.id, choices: [{ id: 'murder-name' }, { id: 'leave-troy' }] };
  ticks(pilot, 6); assert.deepEqual(chosen, ['leave-troy']);
  assert.equal(pilot.active, true);
});

test('the pilot leaves dialogue while an earlier accusation rests, then waits on the active world clock', () => {
  const snapshot = base(), chosen = [], calls = [];
  snapshot.quest = { stage: 'asking', heard: [...CLUES], restUntil: 180 };
  snapshot.mode = 'dialogue'; snapshot.dialogue = { npcId: TROY.id, choices: [{ id: 'ask-troy' }, { id: 'leave-troy' }] };
  const pilot = createTroyAutopilot({ world: world(), read: () => snapshot, options: { idleLimit: 1 },
    act: { choose: ({ id }) => { chosen.push(id); snapshot.mode = 'playing'; snapshot.dialogue = null; }, interact: () => calls.push('talk') } });
  pilot.start(); ticks(pilot, 6); assert.deepEqual(chosen, ['leave-troy']);
  for (let index = 0; index < 700; index++) { snapshot.now += .25; pilot.step(.25); }
  assert.equal(pilot.active, true, 'the known cooldown is not a stuck-navigation timeout');
  assert.deepEqual(calls, []);
  snapshot.now = 180; pilot.step(.25); assert.deepEqual(calls, ['talk']);
});

test('pause, journal and testing menus freeze pace and timeout timers and release movement', () => {
  const snapshot = base(), calls = [];
  const pilot = createTroyAutopilot({ world: world(), read: () => snapshot,
    options: { maxSeconds: 2, idleLimit: 2 }, act: { interact: () => calls.push('talk') } });
  pilot.start(); pilot.step(.25);
  for (const mode of ['pause', 'journal', 'testing']) {
    snapshot.mode = mode; ticks(pilot, 100);
    assert.equal(pilot.active, true); assert.deepEqual(pilot.move, { forward: 0, side: 0, run: false });
    assert.equal(pilot.yaw, null); assert.equal(pilot.guard, false);
  }
  assert.deepEqual(calls, []); snapshot.mode = 'playing'; ticks(pilot, 2); assert.deepEqual(calls, []);
  pilot.step(.25); assert.deepEqual(calls, ['talk']);
  snapshot.mode = 'dialogue'; snapshot.dialogue = { npcId: TROY.id, choices: [{ id: 'murder-take' }] };
  pilot.step(.25); snapshot.mode = 'pause'; ticks(pilot, 200);
  assert.equal(pilot.active, true);
});

test('missing or disabled expected replies stop rather than choosing unrelated or reward options', () => {
  for (const choices of [[{ id: 'ask-troy' }], [{ id: 'murder-take', enabled: false }], [{ id: 'murder-take', enabled: false }, { id: 'leave-troy' }]]) {
    const snapshot = base(), calls = [], stops = [];
    snapshot.mode = 'dialogue'; snapshot.dialogue = { npcId: TROY.id, choices };
    const pilot = createTroyAutopilot({ world: world(), read: () => snapshot, act: { choose: action => calls.push(action) } });
    pilot.onEvent(event => { if (event.type === 'stop') stops.push(event); });
    pilot.start(); ticks(pilot, 8);
    assert.equal(pilot.active, false); assert.match(pilot.stopReason, /expected reply/);
    assert.deepEqual(calls, []); assert.equal(stops.at(-1)?.completed, false);
  }
});

test('death, missing witnesses, missing Troy and unrelated encounters leave control with the player', () => {
  for (const failure of ['traveler', 'Troy', 'witness', 'combat', 'conversation', 'position', 'stage']) {
    const snapshot = base(), calls = [];
    if (failure === 'traveler') snapshot.combat.hp = 0;
    if (failure === 'Troy') snapshot.troy.available = false;
    if (failure === 'witness') { snapshot.quest.stage = 'asking'; snapshot.witnesses[WITNESS_IDS[0]].available = false; }
    if (failure === 'combat') snapshot.combat.phase = 'active';
    if (failure === 'conversation') { snapshot.mode = 'dialogue'; snapshot.dialogue = { npcId: 'stranger' }; }
    if (failure === 'position') snapshot.position.x = NaN;
    if (failure === 'stage') snapshot.quest.stage = 'unknown';
    const pilot = createTroyAutopilot({ world: world(), read: () => snapshot, act: { interact: () => calls.push('talk') } });
    pilot.start(); ticks(pilot, 30);
    assert.equal(pilot.active, false, failure); assert.deepEqual(calls, []);
    assert.deepEqual(pilot.move, { forward: 0, side: 0, run: false }); assert.equal(pilot.yaw, null); assert.equal(pilot.guard, false);
  }
});

test('unresponsive interaction and stalled walking time out; manual interruption never resumes itself', () => {
  for (const walking of [false, true]) {
    const snapshot = base(); if (walking) { snapshot.interaction = null; snapshot.troy.z = 80; }
    const pilot = createTroyAutopilot({ world: world(), read: () => snapshot, options: { idleLimit: 1 } });
    pilot.start(); ticks(pilot, 12); assert.equal(pilot.active, false); assert.match(pilot.stopReason, /could not make progress/);
    pilot.start(); pilot.step(.1); pilot.stop('You took control.'); ticks(pilot, 100);
    assert.equal(pilot.active, false); assert.equal(pilot.stopReason, 'You took control.');
  }
});

test('dismount is an ordinary action before investigating; paid or taught cases report completion immediately', () => {
  const snapshot = base(), calls = [];
  snapshot.riding = { mounted: true };
  const pilot = createTroyAutopilot({ world: world(), read: () => snapshot,
    act: { dismount: () => calls.push('dismount'), interact: () => calls.push('talk') } });
  pilot.start(); ticks(pilot, 4); assert.deepEqual(calls, ['dismount']); assert.equal(pilot.move.forward, 0);
  const stops = []; pilot.onEvent(event => { if (event.type === 'stop') stops.push(event); });
  for (const stage of ['paid', 'taught']) {
    snapshot.quest.stage = stage; pilot.start(); pilot.step(.1);
    assert.equal(pilot.active, false); assert.equal(stops.at(-1)?.completed, true);
  }
});
