import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombat } from '../src/gameplay/combat/combat.js';

function fixture(margins = {}) {
  const position = { x: 0, y: 1.5, z: 0 }, events = [];
  const world = { bounds: { minX: -100, maxX: 100, minZ: -100, maxZ: 100 }, heightAt: () => 1.5, colliders: [] };
  const combat = createCombat({ world, position, getMargins: () => margins, onEvent: e => events.push(e) });
  combat.setWeaponReady(true);
  const hit = (damage = 70, options = {}) => combat.npcProjectileHit(damage,
    { sourceId: 'ibenwood-ranger-1', x: 0, z: 12, encounterId: 'elfland-rangers', impactId: 'arrow-1', ...options });
  return { combat, position, events, hit };
}

test('NPC arrows apply real armor reduction and ordinary contact feedback during exploration', () => {
  const f = fixture({ armourTurns: .4 });
  assert.equal(f.hit().damage, 42); assert.equal(f.combat.state.player.hp, 58);
  assert.equal(f.combat.state.phase, 'peaceful'); assert.equal(f.combat.state.enemies.length, 0);
  assert.equal(f.combat.state.encounterId, 'elfland-rangers');
  const event = f.events.find(e => e.type === 'player-hit');
  assert.equal(event.arrow, true); assert.equal(event.spell, undefined); assert.equal(event.source, 'enemy');
  assert.equal(event.sourceId, 'ibenwood-ranger-1'); assert.equal(event.by, 'ibenwood-ranger-1'); assert.equal(event.impactId, 'arrow-1');
  assert.ok(Math.hypot(f.position.x, f.position.z) <= .56, 'contact recoil does not relocate the traveler into an arena');
});

test('a correctly facing shield absorbs an NPC arrow and spends guard stamina, while a rear shot gets through', () => {
  const margins = { armourTurns: .2, hasShield: true, guardShare: .6, guardCost: 18 };
  const front = fixture(margins); assert.equal(front.combat.guard(true, 0), true);
  assert.equal(front.hit(50).damage, 16); assert.equal(front.combat.state.player.stamina, 82);
  assert.equal(front.combat.state.player.action, 'idle'); assert.ok(front.events.some(e => e.type === 'caught'));
  const rear = fixture(margins); rear.combat.guard(true, Math.PI);
  assert.equal(rear.hit(50).damage, 40); assert.equal(rear.combat.state.player.stamina, 100);
  assert.equal(rear.events.some(e => e.type === 'caught'), false);
});

test('a dodge and post-hit protection prevent NPC projectile stacking, then expire normally', () => {
  const f = fixture(); assert.equal(f.combat.dodge({ x: 1, z: 0 }), true); f.combat.update(.1);
  assert.equal(f.hit(20).damage, 0); assert.equal(f.combat.state.player.hp, 100);
  f.combat.update(.7); assert.equal(f.hit(20).damage, 20);
  assert.equal(f.hit(20, { impactId: 'arrow-2' }).damage, 0); assert.equal(f.combat.state.player.hp, 80);
  f.combat.update(1.3); assert.equal(f.hit(20, { impactId: 'arrow-3' }).damage, 20);
});

test('lethal ranger contact produces the normal defeat event exactly once', () => {
  const f = fixture(); const result = f.hit(1000);
  assert.equal(result.damage, 100); assert.equal(result.defeated, true);
  assert.equal(f.combat.state.player.action, 'dead'); assert.equal(f.combat.state.phase, 'defeated');
  assert.deepEqual(f.events.filter(e => e.type === 'defeat').map(e => e.encounterId), ['elfland-rangers']);
  const count = f.events.length; assert.equal(f.hit(20).damage, 0); assert.equal(f.events.length, count);
});

test('external ranger contact does not replace or heal an existing lethal encounter roster', () => {
  const f = fixture();
  assert.equal(f.combat.startEncounter({ id: 'existing-fight', center: { x: 0, z: 0 }, checkpoint: { x: 0, z: 0 }, retreatZ: 30,
    enemies: [{ id: 'raider', x: 8, z: 0, hp: 90 }], allies: [{ id: 'friend', kind: 'villager', x: -8, z: 0 }] }), true);
  const roster = JSON.stringify({ enemies: f.combat.state.enemies, allies: f.combat.state.allies });
  assert.equal(f.hit(20).damage, 20); assert.equal(f.combat.state.encounterId, 'existing-fight');
  assert.equal(JSON.stringify({ enemies: f.combat.state.enemies, allies: f.combat.state.allies }), roster);
});

test('ending practice for a hostile projectile preserves injuries and spent stamina', () => {
  const f = fixture(); f.combat.startPractice({ x: 4, z: 0 });
  f.combat.state.player.hp = 35; f.combat.state.player.stamina = 43;
  assert.equal(f.hit(20).damage, 20);
  assert.equal(f.combat.state.player.hp, 15, 'hostile contact must not refill health');
  assert.equal(f.combat.state.player.stamina, 43, 'hostile contact must not refill stamina');
  assert.equal(f.combat.state.phase, 'peaceful'); assert.equal(f.combat.state.enemies.length, 0);
});

test('a hostile arrow does not cancel an active dodge when it interrupts practice', () => {
  const f = fixture(); f.combat.startPractice({ x: 4, z: 0 });
  assert.equal(f.combat.dodge({ x: 1, z: 0 }), true); f.combat.update(.1);
  const hp = f.combat.state.player.hp, stamina = f.combat.state.player.stamina;
  assert.equal(f.hit(20).damage, 0, 'the actual dodge window still protects against an outside arrow');
  assert.equal(f.combat.state.player.hp, hp); assert.equal(f.combat.state.player.stamina, stamina);
});

test('an outside lethal arrow ends a training bout without inheriting its nonlethal health floor', () => {
  const f = fixture();
  assert.equal(f.combat.startEncounter({ id: 'training-bout', bout: true, center: { x: 0, z: 0 }, checkpoint: { x: 0, z: 0 }, retreatZ: 30,
    enemies: [{ id: 'teacher', kind: 'sparring', x: 3, z: 0, hp: 100 }] }), true);
  f.combat.state.player.hp = 35;
  assert.deepEqual(f.hit(1000), { damage: 35, defeated: true });
  assert.equal(f.combat.state.player.hp, 0); assert.equal(f.combat.state.enemies.length, 0);
  assert.ok(f.events.some(e => e.type === 'spar-over' && e.encounterId === 'training-bout' && e.winner === 'walked-away'));
  assert.ok(f.events.some(e => e.type === 'defeat' && e.encounterId === 'elfland-rangers'));
});

test('invalid NPC projectile damage cannot mutate combat state', () => {
  const f = fixture(), before = JSON.stringify(f.combat.state);
  for (const amount of [NaN, Infinity, -1, 0]) assert.equal(f.hit(amount).damage, 0);
  assert.equal(f.combat.npcProjectileHit(20).damage, 0);
  assert.equal(JSON.stringify(f.combat.state), before); assert.equal(f.events.length, 0);
});
