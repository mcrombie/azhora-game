import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { createLizAutopilot } from '../src/liz-autopilot.js';
import { CAT, LIZ, LIZ_STAND, createCatQuest, createMopWalk, lizConversation } from '../src/cat-quest.js';
import { FOREST_HIDEOUT_QUEST } from '../src/forest-hideout.js';
import { BODY, bodyWorld, stepToward } from '../src/bodies.js';
import { canStand, moveCharacter } from '../src/game-state.js';

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const flatWorld = () => ({ bounds: { minX: -1000, maxX: 1000, minZ: -1000, maxZ: 1000 }, colliders: [], heightAt: () => 2 });
const base = () => ({ mode: 'playing', position: { x: LIZ_STAND.x + 1.8, z: LIZ_STAND.z },
  quest: { stage: 'unmet' }, liz: { ...LIZ_STAND, available: true }, cat: { ...CAT.at, available: true, mode: 'waiting' },
  combat: { phase: 'peaceful', action: 'idle', hp: 100 }, interaction: { npcId: LIZ.id } });

test('Liz autoplay paces ordinary dialogue and preserves both visible reward choices', () => {
  const snapshot = base(), calls = [], events = [];
  const pilot = createLizAutopilot({ world: flatWorld(), read: () => snapshot,
    act: { interact: () => calls.push('talk'), continue: () => calls.push('line'), choose: ({ id }) => calls.push(id) } });
  pilot.onEvent(event => events.push(event)); pilot.start();
  for (let i = 0; i < 6; i++) pilot.step(.25);
  assert.deepEqual(calls, ['talk']);
  snapshot.mode = 'dialogue'; snapshot.dialogue = { npcId: LIZ.id, choices: [] };
  for (let i = 0; i < 8; i++) pilot.step(.25);
  assert.deepEqual(calls, ['talk']); pilot.step(.25); assert.equal(calls.at(-1), 'line');
  snapshot.dialogue.choices = [{ id: 'cat-yes' }, { id: 'leave-liz' }];
  for (let i = 0; i < 6; i++) pilot.step(.25);
  assert.equal(calls.at(-1), 'cat-yes');
  snapshot.quest.stage = 'home'; snapshot.dialogue.choices = [{ id: 'cat-purse' }, { id: 'cat-lesson' }];
  pilot.step(.1);
  assert.equal(pilot.active, false); assert.equal(events.at(-1).completed, true);
  assert.match(pilot.stopReason, /Choose your reward/);
  assert.equal(calls.at(-1), 'cat-yes', 'the computer never selects a reward');
  pilot.start(); pilot.step(.1); assert.equal(pilot.active, false, 'resume also leaves the choice visible');
});

test('pause freezes Liz dialogue clocks, elapsed limit, and movement', () => {
  const snapshot = base(), calls = [];
  snapshot.mode = 'dialogue'; snapshot.dialogue = { npcId: LIZ.id, choices: [] };
  const pilot = createLizAutopilot({ world: flatWorld(), read: () => snapshot,
    act: { continue: () => calls.push('line') }, options: { maxSeconds: 3, dialoguePace: 2 } });
  pilot.start(); for (let i = 0; i < 4; i++) pilot.step(.25);
  snapshot.mode = 'pause'; for (let i = 0; i < 100; i++) pilot.step(.25);
  assert.equal(pilot.active, true); assert.equal(calls.length, 0); assert.deepEqual(pilot.move, { forward: 0, side: 0, run: false });
  snapshot.mode = 'dialogue'; for (let i = 0; i < 4; i++) pilot.step(.25);
  assert.deepEqual(calls, ['line']);
});

test('Olive is approached slowly, given time to hide, and allowed to catch up', () => {
  const snapshot = base(); snapshot.quest.stage = 'looking'; snapshot.position = { x: CAT.at.x - 2, z: CAT.at.z };
  const pilot = createLizAutopilot({ world: flatWorld(), read: () => snapshot }); pilot.start();
  pilot.step(.1); assert.equal(pilot.move.forward, 0); assert.match(pilot.intent, /Standing still/);
  snapshot.cat.mode = 'hiding'; pilot.step(.1); assert.equal(pilot.move.forward, 0); assert.match(pilot.intent, /come out/);
  snapshot.cat.mode = 'bolting'; pilot.step(.1); assert.equal(pilot.move.forward, 0);
  snapshot.quest.stage = 'following'; snapshot.cat.mode = 'following'; snapshot.position.x -= 7;
  pilot.step(.1); assert.equal(pilot.move.forward, 0); assert.match(pilot.intent, /catch up/);
  snapshot.cat.x = snapshot.position.x + 5; pilot.step(.1); assert.ok(pilot.move.forward > 0); assert.equal(pilot.move.run, false);
  snapshot.cat.mode = 'waiting'; pilot.step(.1); assert.match(pilot.intent, /Approaching/);
});

test('Olive returns to the clearing before the pilot seeks Liz at her moving hive station', () => {
  const snapshot = base();
  snapshot.position = { x: 0, z: -10 };
  snapshot.home = { x: 0, z: 0 };
  snapshot.liz = { x: 30, z: -10, available: true };
  snapshot.cat = { x: 0, z: -13, available: true, mode: 'following' };
  snapshot.quest.stage = 'following'; snapshot.interaction = {};
  const pilot = createLizAutopilot({ world: flatWorld(), read: () => snapshot });
  pilot.start(); pilot.step(.1);
  assert.ok(pilot.move.forward > 0);
  assert.ok(Math.abs(Math.sin(pilot.yaw)) < .001 && Math.cos(pilot.yaw) < -.99,
    'the escort heads south to the cat home, not east to Liz in the private honey stores');
  snapshot.quest.stage = 'home'; pilot.step(.1);
  assert.ok(pilot.move.forward > 0);
  assert.ok(Math.sin(pilot.yaw) < -.99 && Math.abs(Math.cos(pilot.yaw)) < .001,
    'after Olive arrives safely, the reward conversation follows Liz herself');
});

test('manual interruption, missing actors, deaths and combat release inputs without mutating the quest', () => {
  for (const outcome of ['manual', 'liz', 'cat', 'lost', 'player', 'fight', 'stranger', 'blocked']) {
    const snapshot = base(), calls = [];
    snapshot.quest.stage = 'looking';
    const world = flatWorld();
    if (outcome === 'blocked') world.colliders.push({ x: snapshot.position.x, z: snapshot.position.z, r: 4 });
    const pilot = createLizAutopilot({ world, read: () => snapshot,
      act: { interact: () => calls.push('talk'), choose: () => calls.push('choose') }, options: { idleLimit: .5 } });
    pilot.start(); pilot.step(.1);
    if (outcome === 'manual') pilot.stop('You took control.');
    if (outcome === 'liz') snapshot.liz.available = false;
    if (outcome === 'cat') snapshot.cat.available = false;
    if (outcome === 'lost') snapshot.quest.stage = 'lost';
    if (outcome === 'player') snapshot.combat.hp = 0;
    if (outcome === 'fight') snapshot.combat.phase = 'active';
    if (outcome === 'stranger') { snapshot.mode = 'dialogue'; snapshot.dialogue = { npcId: 'stranger', choices: [] }; }
    for (let i = 0; i < 20; i++) pilot.step(.1);
    assert.equal(pilot.active, false, outcome); assert.equal(pilot.guard, false); assert.equal(pilot.yaw, null);
    assert.deepEqual(pilot.move, { forward: 0, side: 0, run: false }); assert.deepEqual(calls, []);
    assert.equal(snapshot.quest.stage, outcome === 'lost' ? 'lost' : 'looking');
  }
});

test('the complete Liz pilot walks the built forest, earns trust and returns the real cat without entering the camp', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const world = createWorld(new THREE.Scene()), position = { x: LIZ_STAND.x + 1.8, z: LIZ_STAND.z }, cat = { ...CAT.at };
  const quest = createCatQuest(), mop = createMopWalk({ random: () => .5 }), events = [], choicesTaken = [], intentions = new Set();
  const navigation = bodyWorld(world), catNavigation = bodyWorld(world, { ignore: ['prop'] });
  let mode = 'playing', dialogue = null, cameraYaw = 0, walked = 0, closestCamp = Infinity, frames = 0, maximumGap = 0;
  const closeDialogue = () => { mode = 'playing'; dialogue = null; };
  const speak = () => lizConversation(LIZ, { cat: quest, comb: { price: () => 0 }, closeDialogue,
    openDialogue: (npc, lines, _action, _label, options = {}) => { mode = 'dialogue'; dialogue = { npc, lines, index: 0, options }; },
    act: action => { assert.equal(action, 'cat-accept', 'no reward, combat or unrelated action is automated'); quest.accept(); } });
  const read = () => ({ mode, position: { ...position }, quest: quest.state, liz: { ...LIZ_STAND, available: true },
    cat: { ...cat, mode: mop.mode, available: true }, combat: { phase: 'peaceful', action: 'idle', hp: 100 },
    dialogue: dialogue ? { npcId: dialogue.npc.id, choices: dialogue.index === dialogue.lines.length - 1 ? dialogue.options.choices : [] } : null,
    interaction: { npcId: distance(position, LIZ_STAND) < 3.1 ? LIZ.id : null } });
  const pilot = createLizAutopilot({ world: navigation, read, act: {
    interact: () => { assert.ok(distance(position, LIZ_STAND) < 3.1); speak(); },
    continue: () => { dialogue.index = Math.min(dialogue.lines.length - 1, dialogue.index + 1); },
    choose: ({ id }) => { choicesTaken.push(id); dialogue.options.choices.find(choice => choice.id === id).action(); },
  } });
  pilot.onEvent(event => events.push(event)); pilot.start();
  for (; frames < 27000 && pilot.active; frames++) {
    const dt = 1 / 60, before = { ...position };
    navigation.setBodies([{ id: LIZ.id, ...LIZ_STAND, r: BODY.person }, { id: CAT.id, ...cat, r: BODY.cat }])
      .moving(position, BODY.traveler, 'traveler');
    pilot.step(dt); intentions.add(pilot.intent);
    if (Number.isFinite(pilot.yaw)) cameraYaw += Math.atan2(Math.sin(pilot.yaw - cameraYaw), Math.cos(pilot.yaw - cameraYaw)) * (1 - Math.exp(-3.5 * dt));
    if (mode === 'playing') {
      const { forward, side, run } = pilot.move; assert.equal(run, false);
      moveCharacter(position, (-Math.sin(cameraYaw) * forward + Math.cos(cameraYaw) * side) * 4.2 * dt,
        (-Math.cos(cameraYaw) * forward - Math.sin(cameraYaw) * side) * 4.2 * dt, navigation);
      mop.place(cat.x, cat.z);
      const want = mop.update(dt, { player: position, speed: distance(position, before) / dt, home: quest.state.found ? LIZ_STAND : null });
      if (want.following && quest.state.stage === 'looking') quest.found();
      if (want.home && quest.state.stage === 'following') quest.home();
      catNavigation.setBodies([{ id: LIZ.id, ...LIZ_STAND, r: BODY.person }, { id: 'traveler', ...position, r: BODY.traveler }])
        .moving(cat, BODY.cat, CAT.id);
      stepToward(cat, want, Math.min(distance(cat, want), dt * want.pace), catNavigation, BODY.cat);
      if (quest.state.stage === 'following') maximumGap = Math.max(maximumGap, distance(cat, position));
    }
    const moved = distance(before, position); walked += moved;
    assert.ok(moved < .1, 'the pilot emits movement inputs instead of teleporting');
    assert.ok(canStand(position.x, position.z, world), 'the route stays out of solid scenery');
    closestCamp = Math.min(closestCamp, distance(position, FOREST_HIDEOUT_QUEST.encounter.center));
  }
  const result = JSON.stringify({ frames, stage: quest.state.stage, position, cat, mode: mop.mode, stop: pilot.stopReason });
  assert.equal(quest.state.stage, 'home', result); assert.equal(events.at(-1)?.completed, true, result);
  assert.ok(distance(cat, LIZ_STAND) < CAT.home, result); assert.ok(walked > 170, `walked ${walked}m`);
  assert.ok(maximumGap < 10, `Olive was left ${maximumGap}m behind`); assert.ok(closestCamp > 18, `entered the camp at ${closestCamp}m`);
  assert.ok(intentions.has('Standing still so Olive can decide')); assert.ok(intentions.has('Waiting for Olive to catch up'));
  assert.deepEqual(choicesTaken, ['cat-yes']); assert.equal(mode, 'dialogue');
  assert.deepEqual(dialogue.options.choices.map(choice => choice.id), ['cat-purse', 'cat-lesson']);
});
