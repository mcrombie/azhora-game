import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombat } from '../src/combat.js';
import { createConsumables } from '../src/consumables.js';
import { createInventoryState } from '../src/inventory.js';

function fixture({ hp = 50, quantity = 3, food = 'pawpaw' } = {}) {
  const inventory = createInventoryState();
  if (quantity) assert.equal(inventory.add(food, quantity), true);
  const world = {
    bounds: { minX: -100, maxX: 100, minZ: -110, maxZ: 60 },
    colliders: [], heightAt: () => 1.5,
  };
  const combat = createCombat({ world, position: { x: 0, y: 1.5, z: -34 } });
  combat.state.player.hp = hp;
  const events = [];
  const consumables = createConsumables({ inventory, combat, onEvent: event => events.push(event) });
  return { inventory, combat, consumables, events };
}

test('pawpaw restores at most 25 health, clamps the last portion, and consumes one per use', () => {
  const { inventory, combat, consumables, events } = fixture({ hp: 58, quantity: 3 });
  assert.deepEqual(consumables.status('pawpaw'), {
    owned: true, canUse: true, healing: 25, health: 58, maxHealth: 100, reason: '',
  });
  assert.deepEqual(consumables.consume('pawpaw'), { ok: true, healed: 25, reason: '' });
  assert.equal(combat.state.player.hp, 83);
  assert.equal(inventory.count('pawpaw'), 2);
  assert.deepEqual(consumables.consume('pawpaw'), { ok: true, healed: 17, reason: '' });
  assert.equal(combat.state.player.hp, 100);
  assert.equal(inventory.count('pawpaw'), 1);
  assert.equal(consumables.consume('pawpaw').ok, false);
  assert.match(consumables.status('pawpaw').reason, /Health is full/);
  assert.equal(inventory.count('pawpaw'), 1, 'repeated full-health clicks preserve the remaining fruit');
  assert.deepEqual(events, [
    { type: 'consume', id: 'pawpaw', healed: 25 },
    { type: 'consume', id: 'pawpaw', healed: 17 },
  ]);
});

test('eating the last fruit removes its stack and selection; unknown or missing items cannot heal', () => {
  const { inventory, combat, consumables, events } = fixture({ hp: 10, quantity: 1 });
  inventory.select('pawpaw');
  assert.equal(consumables.consume('pawpaw').healed, 25);
  assert.equal(inventory.has('pawpaw'), false);
  assert.equal(inventory.selectedId(), null);
  assert.equal(consumables.status('pawpaw').owned, false);
  assert.match(consumables.status('pawpaw').reason, /no pawpaw/);
  assert.equal(consumables.consume('pawpaw').ok, false);
  assert.equal(consumables.status('acorn'), null);
  assert.equal(consumables.consume('acorn').ok, false);
  assert.equal(consumables.consume('__proto__').ok, false);
  assert.equal(combat.state.player.hp, 35);
  assert.equal(events.length, 1);
});

test('food cannot interrupt a player action, revive a defeated player, or consume on invalid health', () => {
  for (const food of ['pawpaw', 'cooked-fish']) {
  for (const changes of [
    { action: 'attack' }, { action: 'dodge' }, { action: 'hurt' }, { action: 'windup' },
    { action: 'dead' }, { hp: 0 }, { hp: -1 }, { hp: NaN }, { maxHp: Infinity },
    { maxHp: 0 }, { phase: 'defeated' },
  ]) {
    const { inventory, combat, consumables, events } = fixture({food});
    if (changes.phase) combat.state.phase = changes.phase;
    else Object.assign(combat.state.player, changes);
    const before = structuredClone(combat.state);
    assert.equal(consumables.status(food).canUse, false, JSON.stringify(changes));
    assert.equal(consumables.consume(food).ok, false);
    assert.equal(inventory.count(food), 3);
    assert.deepEqual(combat.state, before);
    assert.deepEqual(events, []);
  }
  }
});

test('an idle player can eat during an encounter without cancelling enemy attacks or granting protection', () => {
  const { inventory, combat, consumables } = fixture();
  combat.startEncounter();
  combat.state.player.hp = 40;
  combat.state.player.stamina = 37;
  combat.state.enemies[0].action = 'windup';
  combat.state.enemies[0].progress = .6;
  const before = structuredClone(combat.state);
  assert.equal(consumables.consume('pawpaw').healed, 25);
  const expected = structuredClone(before);
  expected.player.hp = 65;
  assert.deepEqual(combat.state, expected, 'only health changes; no time, action, or invulnerability reset');
  assert.equal(inventory.count('pawpaw'), 2);
});

test('a failed inventory removal cannot give free healing, and a refused heal returns the fruit', () => {
  const { inventory, combat } = fixture();
  let healCalls = 0;
  const blocked = createConsumables({
    inventory: { ...inventory, remove: () => false },
    combat: { state: combat.state, heal() { healCalls++; return 25; } },
  });
  assert.equal(blocked.consume('pawpaw').ok, false);
  assert.equal(healCalls, 0);
  assert.equal(inventory.count('pawpaw'), 3);
  assert.equal(combat.state.player.hp, 50);
  const refused = createConsumables({ inventory, combat: { state: combat.state, heal: () => 0 } });
  assert.equal(refused.consume('pawpaw').ok, false);
  assert.equal(inventory.count('pawpaw'), 3);
  assert.equal(combat.state.player.hp, 50);
});

test('combat healing rejects invalid amounts and states without changing other combat values', () => {
  const { combat } = fixture({ hp: 91 });
  for (const amount of [0, -1, NaN, Infinity, -Infinity, '25', null, undefined]) {
    assert.equal(combat.heal(amount), 0);
    assert.equal(combat.state.player.hp, 91);
  }
  assert.equal(combat.heal(25), 9);
  assert.equal(combat.heal(25), 0);
  for (const changes of [{ action: 'attack', hp: 30 }, { action: 'dead', hp: 30 }, { action: 'idle', hp: 0 }]) {
    Object.assign(combat.state.player, changes);
    const before = structuredClone(combat.state);
    assert.equal(combat.heal(25), 0);
    assert.deepEqual(combat.state, before);
  }
  combat.state.player.action = 'idle';
  combat.state.player.hp = 30;
  combat.state.phase = 'defeated';
  assert.equal(combat.heal(25), 0);
  assert.equal(combat.state.player.hp, 30);
});

test('cooked fish heals forty, caps at maximum health, and preserves food at full health', () => {
  const { inventory, combat, consumables, events } = fixture({hp: 30, quantity: 3, food: 'cooked-fish'});
  inventory.add('pawpaw', 2); inventory.add('raw-fish', 2);
  assert.equal(consumables.status('cooked-fish').healing, 40);
  assert.deepEqual(consumables.consume('cooked-fish'), {ok: true, healed: 40, reason: ''});
  assert.equal(combat.state.player.hp, 70);
  assert.equal(inventory.count('cooked-fish'), 2);
  assert.equal(consumables.consume('cooked-fish').healed, 30);
  assert.equal(combat.state.player.hp, 100);
  assert.equal(inventory.count('cooked-fish'), 1);
  assert.equal(consumables.status('cooked-fish').canUse, false);
  assert.match(consumables.status('cooked-fish').reason, /Health is full/);
  assert.equal(consumables.consume('cooked-fish').ok, false);
  assert.equal(inventory.count('cooked-fish'), 1);
  assert.equal(inventory.count('pawpaw'), 2);
  assert.equal(inventory.count('raw-fish'), 2);
  assert.deepEqual(events, [
    {type: 'consume', id: 'cooked-fish', healed: 40},
    {type: 'consume', id: 'cooked-fish', healed: 30},
  ]);
});

test('the final cooked fish clears selection while raw fish and camping tools cannot be eaten', () => {
  const { inventory, combat, consumables } = fixture({hp: 50, quantity: 1, food: 'cooked-fish'});
  inventory.select('cooked-fish');
  assert.equal(consumables.consume('cooked-fish').healed, 40);
  assert.equal(inventory.has('cooked-fish'), false);
  assert.equal(inventory.selectedId(), null);
  assert.equal(consumables.consume('cooked-fish').ok, false);
  assert.match(consumables.status('cooked-fish').reason, /no cooked fish/);
  for (const id of ['raw-fish', 'tinderbox', 'fishing-rod']) {
    inventory.add(id);
    assert.equal(consumables.status(id), null);
    assert.equal(consumables.consume(id).ok, false);
    assert.equal(inventory.count(id), 1);
  }
  assert.equal(combat.state.player.hp, 90);
});
