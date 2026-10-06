import test from 'node:test';
import assert from 'node:assert/strict';
import { createCatieAutopilot, catieCaveRoute } from '../src/gameplay/autoplay/catie-autopilot.js';
import { BAT_CAVE } from '../src/content/regions/suval-highlands/suval-highlands.js';

const world = { bounds: { minX: -2000, maxX: 2000, minZ: -2000, maxZ: 2000 }, colliders: [], paths: [], heightAt: () => 1 };
function fixture(extra = {}) {
  const s = { mode: 'playing', position: { x: -445, z: 303 }, quest: { stage: 'available' }, flight: { stage: 'idle', mounted: false },
    catie: { x: -445, z: 301, available: true }, batman: { ...BAT_CAVE.perch, available: true }, combat: { phase: 'peaceful', hp: 100 },
    interaction: { npcId: 'katy' }, ...extra };
  const actions = [], events = [], pilot = createCatieAutopilot({ world, read: () => s, act: Object.fromEntries(
    ['interact', 'continue', 'choose', 'dismount', 'toggleSneak'].map(type => [type, a => actions.push(a)])) });
  pilot.onEvent(e => events.push(e)); pilot.start();
  return { s, pilot, actions, events, tick(n = 1) { let out; for (let i = 0; i < n; i++) out = pilot.step(.25); return out; } };
}
test('Catie autoplay chooses only the peaceful authored conversation actions', () => {
  const f = fixture(); f.tick(4); assert.equal(f.actions.at(-1).type, 'interact');
  f.s.mode = 'dialogue'; f.s.dialogue = { npcId: 'katy', choices: [] };
  f.tick(8); assert.equal(f.actions.at(-1).type, 'continue');
  for (const [npcId, id] of [['katy', 'catie-accept'], ['batman', 'batman-speak'], ['batman', 'batman-fly'], ['batman', 'batman-landed']]) {
    f.s.dialogue = { npcId, choices: [{ id: 'attack' }, { id: 'leave' }, { id }] };
    f.tick(5); assert.equal(f.actions.at(-1).id, id);
  }
  f.s.quest.stage = 'complete'; f.s.mode = 'playing'; f.tick();
  assert.equal(f.pilot.active, false); assert.equal(f.events.at(-1).completed, true);
});
test('the Catie pilot leaves the carried flight entirely under its quest controller', () => {
  const f = fixture({ quest: { stage: 'flying' }, flight: { stage: 'flying', mounted: true }, riding: { mounted: true } });
  const before = structuredClone(f.s);
  for (let i = 0; i < 1000; i++) assert.deepEqual(f.tick().move, { forward: 0, side: 0, run: false });
  assert.equal(f.pilot.active, true); assert.equal(f.actions.length, 0); assert.deepEqual(f.s, before);
  f.pilot.stop('You took control.'); assert.equal(f.pilot.step(.25), null);
  f.pilot.start(); assert.deepEqual(f.tick().move, { forward: 0, side: 0, run: false });
});
test('pausing Catie autoplay freezes its clocks and takeover resumes the same quest', () => {
  const f = fixture({ mode: 'pause', quest: { stage: 'searching' } });
  for (let i = 0; i < 10000; i++) f.tick();
  assert.equal(f.pilot.active, true); assert.equal(f.actions.length, 0);
  f.s.mode = 'playing'; assert.ok(f.tick().move.forward);
  const quest = structuredClone(f.s.quest); f.pilot.stop(); f.pilot.start(); f.tick(); assert.deepEqual(f.s.quest, quest);
});
test('Catie autoplay stops safely for death, hostile choices or unrelated conversations and battles', () => {
  for (const extra of [{ mode: 'defeated' }, { quest: { stage: 'hostile' } }, { quest: { stage: 'dead' } },
    { combat: { phase: 'active', hp: 100 } }, { mode: 'dialogue', dialogue: { npcId: 'unrelated', choices: [] } }]) {
    const f = fixture(extra); f.tick(10); assert.equal(f.pilot.active, false); assert.equal(f.actions.length, 0); assert.equal(f.events.at(-1).completed, false);
  }
});
test('resuming on the highland path rejoins its current segment and retains the remaining switchbacks', () => {
  const route = catieCaveRoute(world, { x: -254, z: 1080 });
  assert.ok(route[0].x > -275); assert.deepEqual(route.at(-1), BAT_CAVE.perch);
  assert.ok(route.some(p => p.x === -243 && p.z === 1065));
});

test('a resumed completed tour still acknowledges the landing dialogue before stopping', () => {
  const f = fixture({ mode: 'dialogue', quest: { stage: 'complete' }, flight: { stage: 'landed', mounted: false },
    dialogue: { npcId: 'batman', choices: [{ id: 'batman-landed' }] } });
  f.tick(5);
  assert.equal(f.pilot.active, true, 'completion does not strand the open landing conversation');
  assert.equal(f.actions.at(-1).id, 'batman-landed');
  assert.equal(f.events.some(e => e.type === 'stop'), false);
  f.s.mode = 'playing'; f.s.dialogue = null; f.tick();
  assert.equal(f.pilot.active, false); assert.equal(f.events.at(-1).completed, true);
});
