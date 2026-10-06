import test from 'node:test';
import assert from 'node:assert/strict';
import { createAddisonAutopilot } from '../src/gameplay/autoplay/addison-autopilot.js';
import { ADDISON, ADDISON_STAND } from '../src/content/quests/lighthouse/lighthouse.js';
import { SMUGGLERS_DOOR, TOWER_STEP, ROUTE_TO_DOOR } from '../src/content/quests/rival-light/rival-light.js';

const world = { bounds: { minX: -2000, maxX: 2000, minZ: -2000, maxZ: 2000 }, colliders: [], heightAt: () => 1 };
function fixture(state) {
  const s = { mode: 'playing', position: { x: ADDISON_STAND.x, z: ADDISON_STAND.z - 3 }, quest: { stage: 'unknown' },
    addison: { x: ADDISON_STAND.x, z: ADDISON_STAND.z, available: true }, combat: { phase: 'peaceful', hp: 100 },
    interaction: {}, sneaking: false, inEast: false, ...state };
  const actions = [];
  const pilot = createAddisonAutopilot({ world, read: () => s, act: Object.fromEntries(['interact', 'continue', 'choose', 'toggleSneak', 'dismount']
    .map(kind => [kind, a => actions.push({ kind, ...a })])) });
  pilot.start();
  return { s, pilot, actions, tick(n = 1) { let out; for (let i = 0; i < n; i++) out = pilot.step(.25); return out; } };
}

test('it asks Addison about the other light, takes the errand, and leaves her to it', () => {
  const f = fixture({ interaction: { npcId: ADDISON.id } });
  f.tick(4);
  assert.equal(f.actions[0].kind, 'interact');
  f.s.mode = 'dialogue'; f.s.dialogue = { npcId: ADDISON.id, choices: [{ id: 'light-climb' }, { id: 'light-sister' }, { id: 'leave-addison' }] };
  f.tick(6); assert.equal(f.actions.at(-1).id, 'light-sister');
  f.s.dialogue.choices = []; f.tick(8); assert.equal(f.actions.at(-1).kind, 'continue');
  f.s.dialogue.choices = [{ id: 'light-sister-ask' }, { id: 'leave-addison' }]; f.tick(6); assert.equal(f.actions.at(-1).id, 'light-sister-ask');
  f.s.dialogue.choices = [{ id: 'light-passage' }, { id: 'leave-addison' }]; f.tick(6); assert.equal(f.actions.at(-1).id, 'leave-addison', 'nothing more to ask');
});

test('with the key it walks east to the door and goes through it', () => {
  const f = fixture({ quest: { stage: 'asked' }, position: { ...ROUTE_TO_DOOR[1] } });
  const out = f.tick();
  assert.ok(Math.abs(out.move.forward) + Math.abs(out.move.side) > 0, 'it walks');
  assert.match(out.intent, /smugglers’ door/);
  f.s.position = { x: SMUGGLERS_DOOR.west.x, z: SMUGGLERS_DOOR.west.z }; f.s.interaction = { id: 'smugglers-door' };
  f.tick(4);
  assert.ok(f.actions.some(a => a.kind === 'interact'));
});

test('near the light it sneaks, and at the stair it climbs and lifts him', () => {
  const f = fixture({ quest: { stage: 'asked' }, inEast: true, position: { x: TOWER_STEP.x + 6, z: TOWER_STEP.z + 8 } });
  f.tick(4);
  assert.ok(f.actions.some(a => a.kind === 'toggleSneak'), 'it goes quietly this close');
  f.s.sneaking = true; f.s.position = { x: TOWER_STEP.x, z: TOWER_STEP.z }; f.s.interaction = { id: 'elod-stair' };
  f.tick(4);
  assert.ok(f.actions.some(a => a.kind === 'interact'));
  f.s.mode = 'dialogue'; f.s.dialogue = { npcId: 'sovik', choices: [{ id: 'lift-sovik' }, { id: 'leave-sovik' }] };
  f.tick(6);
  assert.equal(f.actions.at(-1).id, 'lift-sovik');
});

test('a fight is the quiet way failing, and it says so', () => {
  const f = fixture({ quest: { stage: 'asked' }, inEast: true, combat: { phase: 'active', hp: 100 } });
  f.tick();
  assert.equal(f.pilot.active, false);
  assert.match(f.pilot.stopReason, /quiet way failed/);
});

test('home with him, it keeps him in the Suval Light, and stops when it is decided', () => {
  const f = fixture({ quest: { stage: 'home' }, interaction: { npcId: ADDISON.id } });
  f.s.mode = 'dialogue'; f.s.dialogue = { npcId: ADDISON.id, choices: [{ id: 'fire-conclave' }, { id: 'fire-keep' }, { id: 'fire-free' }, { id: 'fire-wait' }] };
  f.tick(6);
  assert.equal(f.actions.at(-1).id, 'fire-keep');
  f.s.mode = 'playing'; f.s.quest = { stage: 'done' };
  f.tick();
  assert.equal(f.pilot.active, false);
  assert.match(f.pilot.stopReason, /Suval Light/);
});
