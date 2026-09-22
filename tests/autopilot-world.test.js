import { QUEST_DONE } from '../src/game-state.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { planGoal } from '../src/autopilot.js';

/**
 * The autopilot is not given the world. `src/main.js` hands it a small object with
 * the handful of things it reads, listed by hand. A name the autopilot reads and
 * that list forgets is not an error anybody sees: every read in `autopilot.js` is
 * written `world.thing ?? <fallback>`, so the autopilot quietly falls back to a
 * coordinate typed into the source, and goes on walking to wherever the world used
 * to be.
 */
const read = path => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');
const autopilotSource = read('../src/autopilot.js');
const mainSource = read('../src/main.js');

/** The names `autopilot.js` reads off the object it is handed. */
const readsOffWorld = new Set([...autopilotSource.matchAll(/\bworld\s*\??\s*\.\s*([A-Za-z_$][\w$]*)/g)].map(match => match[1]));

/** The keys of the `autopilotWorld` literal in main.js. */
const handedOver = (() => {
  const from = mainSource.indexOf('const autopilotWorld={');
  assert.ok(from > 0, 'main.js still builds an autopilotWorld');
  const literal = mainSource.slice(from, mainSource.indexOf('const autopilotRead=', from)).replace(/\/\/[^\n]*/g, '');
  return new Set([...literal.matchAll(/(?:[{,\n]\s*)(?:get\s+)?([A-Za-z_$][\w$]*)\s*[:(]/g)].map(match => match[1]));
})();

const snapshot = (overrides = {}) => ({
  mode: 'playing', questStage: 0, practiceHits: 0, practiceDodges: 0,
  position: { x: 0, z: 30 }, combat: { phase: 'peaceful', action: 'idle', stamina: 100, hp: 100, enemies: [] },
  weapon: { usable: true, condition: 24 }, inventory: { sticks: 0, cookedFish: 0, pawpaws: 0 },
  dialogue: null, journey: { started: false, stage: 'not-started', complete: false, destinationIds: [], actions: [] }, interaction: {},
  ...overrides,
});

test('everything the autopilot reads off its world is something main.js actually puts there', () => {
  const forgotten = [...readsOffWorld].filter(name => !handedOver.has(name)).sort();
  assert.deepEqual(forgotten, [], 'main.js builds autopilotWorld by hand; these names are read and never set');
});

test('the last subquest is walked to the boundary, and the ambush clearing is walked to by nobody', () => {
  const encounter = { x: -54, z: 29, radius: 8 };
  const world = { npcPositions: {}, paths: [[{ x: 0, z: 0 }]], encounter, training: { x: 3, z: -12 }, northTrail: { x: -5, z: -108 }, border: { x: 0, z: -156 } };
  // Chapter 1's third subquest is the road west, and the goblins at the bell are off the slate
  // (src/quest-slate.js): the planner walks past them to the Caloss Gate and into the journey.
  const goal = planGoal(snapshot({ questStage: QUEST_DONE }), world);
  assert.equal(goal.kind, 'walk');
  assert.deepEqual(goal.target, world.border, 'the boundary, not the bell');
});

test('the ambush clearing on the Greenway is where the game builds it, and the old fallback is not', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const world = createWorld(new THREE.Scene());
  // Measured 2026-09: the world builds it at (-54, 29); the literal left in planGoal says (-58, 29).
  // That is 4.0 m, inside the 8 m trigger, which is why nothing ever failed over it.
  assert.ok(Number.isFinite(world.encounter?.x) && Number.isFinite(world.encounter?.z), 'the world still has an ambush clearing');
  assert.ok(Math.hypot(world.encounter.x + 58, world.encounter.z - 29) > 2.5,
    'the hard-coded fallback in planGoal is further from the ambush than a walk goal will get; it must not be what the autopilot uses');
  assert.ok(world.encounter.radius >= 4, 'the ambush still has room around it');
});
