import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombat, ENEMY_KINDS } from '../src/gameplay/combat/combat.js';
import { SPELLS, SCHOOLS, castWith, learnableSpell } from '../src/gameplay/magic/sorcery.js';
import { SKILLS } from '../src/gameplay/skills/skills.js';
import { createMagic } from '../src/gameplay/magic/magic.js';

/**
 * Time Sorcery (the user, 26 September 2026): Subtractidaughter wields a handheld grandfather clock
 * she casts time spells through; one spell to start, which slows the movement of whoever it hits for
 * a while; and the skill begun but not learnable by the traveler yet.
 */
const world = { bounds: { minX: -500, maxX: 500, minZ: -500, maxZ: 500 }, colliders: [], heightAt: () => 1, regionAt: () => ({ name: 'East Suval' }), npcPositions: {} };
const her = (x, z, extra = {}) => ({ id: 'meg', npcId: 'rival-keeper', kind: 'timekeeper', hp: 320, x, z, yields: true, ...extra });
function fight(enemies, { allies, at = { x: 0, z: 0 } } = {}) {
  const events = [], position = { ...at, y: 1 };
  const combat = createCombat({ world, position, onEvent: e => events.push(e) });
  const spec = { id: 'elod-light-fight', level: 1, center: { x: 0, z: 0 }, checkpoint: { x: 0, z: 14 }, retreatAxis: 'z', retreatLine: 17, enemies, ...(allies ? { allies } : {}) };
  assert.ok(combat.startEncounter(spec));
  const run = (seconds, until = () => false) => { for (let i = 0; i < seconds * 120 && !until(); i++) combat.update(1 / 120); };
  return { combat, events, position, run };
}

test('Time is a school with one spell, Slow, and nobody can be taught it', () => {
  assert.equal(SKILLS.time.name, 'Time Sorcery');
  assert.equal(SKILLS.time.reserved, true, 'kept out of the journal and out of any lesson');
  assert.deepEqual(SCHOOLS.time.spells, ['slow']);
  assert.equal(SPELLS.slow.school, 'time');
  assert.equal(learnableSpell('slow'), false);
  assert.equal(learnableSpell('fireball'), true);
  const learned = [], magic = createMagic({ skills: { learn: id => learned.push(id), level: () => 1 }, inventory: {}, weapons: {}, combat: {}, position: { x: 0, z: 0 } });
  assert.equal(magic.learn('slow').ok, false);
  assert.deepEqual(learned, [], 'and asking does not register the school either');
  // It slows, and does no harm; a better caster holds it on you longer.
  const low = castWith('slow', { level: 1, weapon: 'wand' }), high = castWith('slow', { level: 99, weapon: 'wand' });
  assert.equal(low.damage, 0);
  assert.ok(low.slow.factor < .5, 'under half pace');
  assert.ok(high.slow.seconds > low.slow.seconds);
});

test('out of reach, Subtractidaughter throws Slow, and it takes the pace out of the traveler for a while', () => {
  const { combat, events, run } = fight([her(0, -9)]);
  assert.equal(combat.movementScale(), 1);
  run(6, () => events.some(e => e.type === 'slowed'));
  assert.ok(events.some(e => e.type === 'windup' && e.cast === 'slow'), 'she gathers it through the clock');
  assert.ok(events.some(e => e.type === 'enemy-spell' && e.spellId === 'slow'), 'it flies');
  const slowed = events.find(e => e.type === 'slowed');
  assert.ok(slowed && slowed.id === 'traveler', 'and it catches the traveler');
  assert.equal(combat.state.player.action, 'idle');
  assert.equal(combat.movementScale(), slowed.factor, 'moving at a fraction of his pace');
  assert.ok(combat.slowed > 0);
  assert.equal(combat.state.player.hp, combat.state.player.maxHp, 'it does no harm on its own');
  run(slowed.seconds + .2, () => combat.movementScale() === 1);
  assert.equal(combat.movementScale(), 1, 'and it wears off');
});

test('she swings the clock hard, at her own strength wherever she is', () => {
  const near = fight([her(0, -1.6)]);
  near.run(3, () => near.combat.state.player.hp < near.combat.state.player.maxHp);
  assert.equal(near.combat.state.player.maxHp - near.combat.state.player.hp, ENEMY_KINDS.timekeeper.damage, 'one blow of the clock');
  assert.equal(near.combat.state.enemies[0].maxHp, 320, 'the country does not change how hard she is to put down');
});

test('Slow catches an ally too, and he walks at a fraction of his pace', () => {
  // Far enough apart that her spell has come round before they meet.
  const ally = { id: 'soldier', kind: 'legionary', x: 0, z: -2 };
  const { combat, events, run } = fight([her(0, -20)], { allies: [ally], at: { x: 30, z: 10 } });
  run(8, () => events.some(e => e.type === 'slowed' && e.id === 'soldier'));
  assert.ok(events.some(e => e.type === 'slowed' && e.id === 'soldier'), 'the bolt meets the man nearest her');
  const a = combat.state.allies[0], before = { x: a.x, z: a.z };
  combat.update(.25);
  const moved = Math.hypot(a.x - before.x, a.z - before.z);
  assert.ok(moved < 2.1 * .25 * .6, `slowed he walks under his pace (${moved.toFixed(3)} m in a quarter second)`);
});

test('she yields at one instead of dying, and nobody counts a body for her', () => {
  const { combat, events, run } = fight([her(0, -2), { id: 'guard', kind: 'rebel', hp: 60, x: 3, z: -3 }]);
  const meg = combat.state.enemies[0];
  meg.hp = 5; combat.state.enemies[1].hp = 1;
  combat.state.player.yaw = Math.atan2(meg.x, meg.z);
  // Strike until she is down on her knees.
  for (let i = 0; i < 600 && !meg.yielded; i++) { combat.attack(Math.atan2(meg.x - 0, meg.z - 0)); combat.update(1 / 60); }
  assert.equal(meg.yielded, true);
  assert.equal(meg.hp, 1, 'at one');
  assert.equal(meg.active, false);
  assert.ok(events.some(e => e.type === 'enemy-yielded' && e.npcId === 'rival-keeper'));
  assert.ok(!events.some(e => e.type === 'enemy-defeated' && e.id === 'meg'), 'no body');
  const after = events.length;
  for (let i = 0; i < 240; i++) { combat.attack(Math.atan2(meg.x, meg.z)); combat.update(1 / 60); }
  assert.equal(meg.hp, 1, 'and nobody can hurt her further');
  assert.equal(meg.action, 'idle', 'she stays down');
  assert.ok(!events.slice(after).some(e => e.type === 'windup' && e.id === 'meg'), 'and swings at nobody');
});
