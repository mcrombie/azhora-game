import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombat } from '../src/gameplay/combat/combat.js';

function fixture(canMovePlayer) {
  const world = { bounds: { minX: -30, maxX: 30, minZ: -30, maxZ: 30 }, colliders: [], heightAt: () => 1.5 };
  const position = { x: 0, y: 1.5, z: 0 }, events = [];
  const combat = createCombat({ world, position, canMovePlayer, onEvent: event => events.push(event) });
  return { combat, position, events };
}

test('climbing falls use normal health and defeat while being identified as falls rather than drowning', () => {
  const { combat, events } = fixture();
  const first = combat.exhaust(17, 23, { cause: 'fall' });
  assert.equal(first.stamina, 83); assert.equal(first.hp, 77); assert.equal(first.defeated, false);
  assert.equal(events.filter(event => event.type === 'defeat').length, 0);
  const fatal = combat.exhaust(0, 80, { cause: 'fall' });
  assert.equal(fatal.hp, 0); assert.equal(fatal.defeated, true);
  assert.equal(combat.state.phase, 'defeated'); assert.equal(combat.state.player.action, 'dead');
  const defeats = events.filter(event => event.type === 'defeat');
  assert.equal(defeats.length, 1); assert.equal(defeats[0].fell, true); assert.equal(defeats[0].drowned, false);
  combat.exhaust(0, 100, { cause: 'fall' });
  assert.equal(events.filter(event => event.type === 'defeat').length, 1, 'the fall has one defeat transition');
});

test('the existing environmental exhaustion call still attributes drowning by default', () => {
  const { combat, events } = fixture();
  combat.exhaust(100, 100);
  const defeat = events.find(event => event.type === 'defeat');
  assert.equal(defeat.drowned, true); assert.equal(defeat.fell, false);
});

test('a dodge and sword lunge cannot bypass the player slope restriction', () => {
  for (const action of ['dodge', 'attack']) {
    const guarded = fixture((_x, _z, _nextX, nextZ) => nextZ <= .08);
    const normal = fixture();
    for (const f of [guarded, normal]) {
      f.combat.startPractice({ x: 0, z: 4 });
      assert.equal(action === 'dodge' ? f.combat.dodge({ x: 0, z: 1 }) : f.combat.attack(0), true);
      f.combat.update(.8);
    }
    assert.ok(guarded.position.z <= .08, `${action} crossed the steep face`);
    assert.ok(normal.position.z > .15, `${action} must retain its normal travel without a slope restriction`);
  }
});

test('restricting player combat movement does not freeze an enemy approaching over ordinary terrain', () => {
  const { combat, position } = fixture(() => false);
  combat.startEncounter({ id: 'climbing-player-only', center: { x: 0, z: 0 }, checkpoint: { x: 0, z: 0 }, retreatZ: 20,
    enemies: [{ id: 'approaching-raider', x: 0, z: 6, hp: 90 }] });
  combat.update(1);
  assert.ok(combat.state.enemies[0].z < 5, 'enemy movement retains its own collision rules');
  assert.deepEqual(position, { x: 0, y: 1.5, z: 0 });
});
