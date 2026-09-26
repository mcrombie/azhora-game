import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { createCubAutopilot, CUB_HONEY_ROUTE } from '../src/cub-autopilot.js';
import { createCubHoneyHost, HONEY_STORE, HONEY_APPROACH, HONEY_WAIT, LIZ_HONEY_WORK } from '../src/cub-honey-host.js';
import { CUB, CUB_STAND } from '../src/cub-honey-quest.js';
import { createSkills } from '../src/skills.js';
import { canStand, moveCharacter } from '../src/game-state.js';
import { BODY, bodyWorld } from '../src/bodies.js';
import { regionAt } from '../src/region-world.js';
import { LIZ, LIZ_STAND } from '../src/cat-quest.js';
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());

test('the cub, both bridge banks, honey approach and Liz work stands fit the real world', () => {
  assert.equal(regionAt(CUB_STAND.x, CUB_STAND.z).name, 'Drent');
  assert.ok(canStand(CUB_STAND.x, CUB_STAND.z, world, CUB.radius));
  for (const p of [...CUB_HONEY_ROUTE, HONEY_APPROACH, HONEY_WAIT, ...LIZ_HONEY_WORK]) assert.ok(canStand(p.x, p.z, world, BODY.traveler), JSON.stringify(p));
});

test('the computer learns Stealth, crosses the actual bridge, steals unseen and returns without quest shortcuts', t => {
  const position = { x: CUB_STAND.x + 1.9, z: CUB_STAND.z }, skills = createSkills();
  const liz = { id: LIZ.id, actor: { group: { position: new THREE.Vector3(LIZ_STAND.x, world.heightAt(LIZ_STAND.x, LIZ_STAND.z), LIZ_STAND.z), rotation: { y: LIZ_STAND.yaw } } } };
  const cub = { ...CUB, actor: { group: { position: new THREE.Vector3(CUB_STAND.x, world.heightAt(CUB_STAND.x, CUB_STAND.z), CUB_STAND.z) } } };
  const counts = new Map(), caught = [], events = [], intentions = new Set(), chosen = [];
  const inventory = { add(id, n) { counts.set(id, (counts.get(id) ?? 0) + n); return true; }, remove(id, n) { if ((counts.get(id) ?? 0) < n) return false; counts.set(id, counts.get(id) - n); return true; } };
  let mode = 'playing', dialogue = null, sneaking = false, cameraYaw = 0, walked = 0, frames = 0;
  const host = createCubHoneyHost({ npc: cub, liz, world, skills, inventory, position: () => position,
    sneaking: () => sneaking, onCaught: e => caught.push(e) });
  const navigation = bodyWorld(world);
  const closeDialogue = () => { mode = 'playing'; dialogue = null; };
  const speak = () => host.conversation({ closeDialogue, openDialogue(npc, lines, _cb, _label, options = {}) {
    mode = 'dialogue'; dialogue = { npc, lines, index: 0, options }; } });
  const interaction = () => host.interaction() ?? { npcId: gap(position, CUB_STAND) < 3 ? CUB.id : null };
  const read = () => ({ mode, position, quest: host.state(), cub: { ...CUB_STAND, available: true }, liz: { ...liz.actor.group.position },
    sneaking, combat: { phase: 'peaceful', hp: 100 }, interaction: interaction(),
    dialogue: dialogue ? { npcId: dialogue.npc.id, choices: dialogue.index === dialogue.lines.length - 1 ? dialogue.options.choices ?? [] : [] } : null });
  const pilot = createCubAutopilot({ world: navigation, read, options: { dialoguePace: .2, choicePace: .2 }, act: {
    interact() { if (!host.interact()) { assert.ok(gap(position, CUB_STAND) < 3); speak(); } },
    continue() { if (dialogue.index < dialogue.lines.length - 1) dialogue.index++; else closeDialogue(); },
    choose({ id }) { chosen.push(id); dialogue.options.choices.find(c => c.id === id).action(); },
    toggleSneak() { assert.ok(skills.taught('stealth')); sneaking = !sneaking; },
  } });
  pilot.onEvent(e => events.push(e)); pilot.start();
  for (; frames < 27000 && pilot.active; frames++) {
    const dt = 1 / 60, before = { ...position };
    navigation.setBodies([{ id: CUB.id, ...CUB_STAND, r: CUB.radius }, { id: LIZ.id, ...liz.actor.group.position, r: BODY.person }]).moving(position, BODY.traveler, 'player');
    host.frame(dt, { playing: mode === 'playing' }); pilot.step(dt); intentions.add(pilot.intent);
    if (Number.isFinite(pilot.yaw)) cameraYaw += Math.atan2(Math.sin(pilot.yaw - cameraYaw), Math.cos(pilot.yaw - cameraYaw)) * (1 - Math.exp(-3.5 * dt));
    if (mode === 'playing') {
      const movementYaw = Number.isFinite(pilot.move.basisYaw) ? pilot.move.basisYaw : cameraYaw;
      const { forward, side, run } = pilot.move, pace = (run ? 6.8 : 4.2) * (sneaking ? .42 : 1);
      moveCharacter(position, (-Math.sin(movementYaw) * forward + Math.cos(movementYaw) * side) * pace * dt,
        (-Math.cos(movementYaw) * forward - Math.sin(movementYaw) * side) * pace * dt, navigation, BODY.traveler);
    }
    const moved = gap(before, position); walked += moved; assert.ok(moved < .12, 'movement remains ordinary input');
    assert.ok(canStand(position.x, position.z, world, BODY.traveler), `player walk ${position.x},${position.z}`);
    assert.ok(canStand(liz.actor.group.position.x, liz.actor.group.position.z, world, BODY.person), 'Liz stays outside real props');
    if (frames % 6000 === 0) t.diagnostic(`${frames}: ${pilot.intent}; ${JSON.stringify(position)}; ${JSON.stringify(host.state())}`);
  }
  t.diagnostic(`${frames} frames, ${walked.toFixed(1)} metres; ${pilot.stopReason}; ${JSON.stringify(position)}; ${JSON.stringify(host.state())}`);
  assert.equal(host.state().stage, 'complete'); assert.equal(caught.length, 0); assert.equal(counts.get('liz-stolen-honey'), 0);
  assert.ok(skills.taught('stealth')); assert.ok(walked > 210); assert.ok(events.at(-1).completed);
  assert.deepEqual(chosen, ['cub-honey-yes', 'cub-honey-give']); assert.ok(intentions.has('Waiting for Liz to turn toward her hives'));
});
