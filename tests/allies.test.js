import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombat } from '../src/combat.js';

function fixture(options = {}) {
  const world = { bounds: { minX: -100, maxX: 100, minZ: -110, maxZ: 60 }, colliders: [], heightAt: () => 1.5, ...options.world };
  const position = { x: 0, y: 1.5, z: -30, ...options.position };
  const events = [];
  const combat = createCombat({ world, position, onEvent: event => events.push(event) });
  return { combat, world, position, events };
}

function advanceUntil(combat, condition, seconds = 20) {
  for (let i = 0; i < seconds * 60 && !condition(); i++) combat.update(1 / 60);
  assert.ok(condition(), `Condition was not reached within ${seconds} seconds`);
}

const assault = {
  id: 'north-camp-assault', center: { x: 0, z: -36 }, checkpoint: { x: 0, z: -25 }, retreatZ: -16,
  enemies: [
    { id: 'camp-goblin-1', x: -2, z: -44, hp: 60 },
    { id: 'camp-goblin-2', x: 2, z: -46, hp: 60, entry: .5 },
  ],
  allies: [
    { id: 'captain', name: 'Captain Fennor', kind: 'officer', x: -1.5, z: -32 },
    { id: 'legionary-1', kind: 'legionary', x: 1.5, z: -31 },
  ],
};

test('an encounter can bring army allies, and rejects allies it cannot vouch for', () => {
  const { combat } = fixture();
  assert.equal(combat.startEncounter({ ...assault, allies: [{ ...assault.allies[0], kind: 'dragoon' }] }), false, 'unknown ally kinds are refused');
  assert.equal(combat.startEncounter({ ...assault, allies: [{ ...assault.allies[0], id: 'camp-goblin-1' }] }), false, 'an ally cannot share an enemy id');
  assert.equal(combat.startEncounter({ ...assault, allies: [{ ...assault.allies[0], z: -10 }] }), false, 'allies start inside the arena');
  assert.equal(combat.startEncounter({ ...assault, allies: [{ ...assault.allies[0], hp: -5 }] }), false);
  assert.equal(combat.startEncounter(assault), true);
  assert.deepEqual(combat.state.allies.map(ally => [ally.id, ally.kind, ally.name, ally.hp, ally.active]),
    [['captain', 'officer', 'Captain Fennor', 110, true], ['legionary-1', 'legionary', 'Soldier', 90, true]]);
  assert.equal(combat.state.enemies.length, 2, 'allies do not replace the enemies');
});

test('allies close on the nearest goblin and win the fight without the traveler lifting a hand', () => {
  const { combat, events } = fixture();
  assert.ok(combat.startEncounter(assault));
  advanceUntil(combat, () => combat.state.phase === 'won', 60);
  combat.update(1 / 60); combat.update(1 / 60);
  assert.ok(events.some(event => event.type === 'ally-windup'), 'allies telegraph their strikes');
  assert.ok(events.some(event => event.type === 'ally-strike' && event.targetId), 'allies land strikes on goblins');
  assert.ok(events.filter(event => event.type === 'enemy-defeated').length === 2);
  assert.ok(combat.state.allies.every(ally => ally.action === 'idle'), 'the fight over, the soldiers stand down');
  assert.ok(events.every(event => event.type !== 'player-hit'), 'the goblins were busy with the soldiers');
});

test('enemies strike the nearest standing target, an ally can fall, and the fight goes on', () => {
  const { combat, events } = fixture({ position: { z: -20 } });
  // One frail soldier stands between the traveler and a goblin; the traveler hangs back.
  assert.ok(combat.startEncounter({ ...assault, enemies: [{ id: 'g', x: 0, z: -40, hp: 400 }],
    allies: [{ id: 'weak', kind: 'legionary', x: 0, z: -34, hp: 20 }] }));
  advanceUntil(combat, () => events.some(event => event.type === 'ally-hit'), 30);
  assert.ok(events.every(event => event.type !== 'player-hit'), 'the goblin went for the closer soldier first');
  const windup = events.find(event => event.type === 'windup');
  assert.equal(windup.targetId, 'weak', 'the tell names its target');
  advanceUntil(combat, () => events.some(event => event.type === 'ally-down'), 20);
  const fallen = combat.state.allies[0];
  assert.equal(fallen.active, false); assert.equal(fallen.action, 'dead'); assert.equal(fallen.hp, 0);
  assert.equal(combat.state.phase, 'active', 'losing an ally does not end the encounter');
  for (let i = 0; i < 120; i++) combat.update(1 / 60);
  assert.ok(Number.isFinite(fallen.x) && Number.isFinite(fallen.z) && fallen.progress === 1, 'the fallen soldier stays down');
});

test('retreating clears the allies and a reset brings them back; encounters without allies are unchanged', () => {
  const { combat, position } = fixture();
  assert.ok(combat.startEncounter(assault));
  position.z = -10; combat.update(1 / 60);
  assert.equal(combat.state.phase, 'peaceful'); assert.deepEqual(combat.state.allies, []);
  position.z = -30;
  assert.ok(combat.resetEncounter());
  assert.equal(combat.state.allies.length, 2, 'the same soldiers rejoin on a reset');
  const plain = fixture();
  assert.ok(plain.combat.startEncounter({ ...assault, allies: undefined }));
  assert.deepEqual(plain.combat.state.allies, []);
  advanceUntil(plain.combat, () => plain.events.some(event => event.type === 'player-hit'), 15);
  assert.ok(plain.events.every(event => !['ally-hit', 'ally-strike', 'ally-windup'].includes(event.type)));
  plain.combat.startPractice({ x: 3, z: -20 });
  assert.deepEqual(plain.combat.state.allies, []);
});
