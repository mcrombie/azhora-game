import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombat } from '../src/combat.js';
import { createCorpses } from '../src/corpses.js';

const world = { bounds: { minX: -100, maxX: 100, minZ: -100, maxZ: 100 }, colliders: [], heightAt: () => 0 };
const fight = () => ({ id: 'body-retry', center: { x: 0, z: 0 }, checkpoint: { x: 0, z: -4 }, retreatLine: 20,
  enemies: [{ id: 'first', x: 0, z: 1.7, hp: 1 }, { id: 'second', x: 0, z: 10, hp: 80 }],
  allies: [{ id: 'fallen-friend', kind: 'legionary', x: 4, z: -2 }],
});
const isFallen = bodies => (encounter, id, actor) => ['enemy', 'ally'].some(team => bodies.get(`${team}:${encounter}:${id}`)?.status === 'dead')
  || bodies.get(`npc:${actor.npcId ?? id}`)?.status === 'dead';

test('a physical kill remains dead after defeat retry and a saved body never gets a living twin', () => {
  const bodies = createCorpses(), events = [], position = { x: 0, y: 0, z: 0 };
  const combat = createCombat({ world, position, isFallen: isFallen(bodies), onEvent(event) {
    events.push(event);
    if (event.type === 'enemy-defeated') bodies.add({ id: `enemy:${combat.state.encounterId}:${event.id}`, sourceId: event.id, name: 'Raider', kind: 'goblin', x: event.x, z: event.z });
  } });
  assert.equal(combat.startEncounter(fight()), true); assert.equal(combat.attack(0), true); combat.update(.6);
  assert.equal(bodies.list().length, 1, 'The real swing must have killed the first enemy');
  combat.state.phase = 'defeated'; combat.state.player.hp = 0;
  assert.equal(combat.resetEncounter(), true);
  assert.deepEqual(combat.state.enemies.map(enemy => enemy.id), ['second']);
  assert.equal(combat.state.phase, 'active'); assert.equal(bodies.list().length, 1);
  assert.equal(events.filter(event => event.type === 'enemy-defeated').length, 1);
  const restored = createCorpses(); restored.restore(JSON.parse(JSON.stringify(bodies.snapshot())));
  const reloaded = createCombat({ world, position, isFallen: isFallen(restored) });
  assert.equal(reloaded.startEncounter(fight()), true); assert.deepEqual(reloaded.state.enemies.map(enemy => enemy.id), ['second']);
});

test('all-fallen encounter resolves one victory without repeating kills, loot or dead authored allies', () => {
  const events = [], calls = [], combat = createCombat({ world, position: { x: 0, y: 0, z: 0 },
    isFallen(encounter, id, spec) { calls.push({ encounter, id, npcId: spec.npcId }); return true; }, onEvent: event => events.push(event) });
  const config = fight(); config.enemies[0].npcId = 'named-person';
  assert.equal(combat.startEncounter(config), true); assert.equal(combat.state.phase, 'won');
  assert.deepEqual(combat.state.enemies, []); assert.deepEqual(combat.state.allies, []);
  combat.update(2);
  assert.deepEqual(events.map(event => event.type), ['victory']);
  assert.equal(events[0].encounterId, config.id);
  assert.ok(calls.some(call => call.npcId === 'named-person'));
});

test('unconscious records do not become permanent death policy, and sparring bypasses it', () => {
  const bodies = createCorpses(); bodies.add({ id: 'npc:teacher', sourceId: 'teacher', name: 'Teacher', x: 0, z: 0, dead: false });
  const combat = createCombat({ world, position: { x: 0, y: 0, z: 0 }, isFallen: isFallen(bodies) });
  const config = fight(); config.enemies[0].npcId = 'teacher';
  assert.equal(combat.startEncounter(config), true); assert.equal(combat.state.enemies.length, 2);
  let calls = 0;
  const lesson = createCombat({ world, position: { x: 0, y: 0, z: 0 }, isFallen() { calls++; return true; } });
  assert.equal(lesson.startEncounter({ ...fight(), bout: true, enemies: [{ id: 'sparring-partner', kind: 'sparring', x: 0, z: 1.7 }] }), true);
  assert.equal(lesson.state.phase, 'active'); assert.equal(lesson.state.enemies.length, 1); assert.equal(calls, 0);
});
