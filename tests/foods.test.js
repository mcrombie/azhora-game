import test from 'node:test';
import assert from 'node:assert/strict';
import { createCombat } from '../src/combat.js';
import { FOODS, createConsumables } from '../src/consumables.js';
import { ICON_KINDS, INVENTORY_ITEMS, createInventoryState } from '../src/inventory.js';

const foodIds = Object.keys(FOODS);
const foodItems = Object.keys(INVENTORY_ITEMS).filter(id => INVENTORY_ITEMS[id].type === 'Food');

function combatAt(hp) {
  const world = { bounds: { minX: -100, maxX: 100, minZ: -110, maxZ: 60 }, colliders: [], heightAt: () => 1.5 };
  const combat = createCombat({ world, position: { x: 0, y: 1.5, z: -34 } });
  combat.state.player.hp = hp;
  return combat;
}

test('the larder lists a couple dozen foods, and each one is a stackable satchel item with a drawn icon', () => {
  assert.ok(foodIds.length >= 26, `only ${foodIds.length} foods`);
  assert.deepEqual([...foodIds].sort(), [...foodItems].sort(), 'every food is a satchel item and every Food item is edible');
  for (const id of foodIds) {
    const item = INVENTORY_ITEMS[id];
    assert.equal(item.stackable, true, `${id} must stack`);
    assert.ok(item.eatName && item.brief && item.description, `${id} needs an eat name, brief and description`);
    const healing = new RegExp(`Restores up to ${FOODS[id].healing} health`);
    assert.match(item.brief, healing, `${id} brief states its healing`);
    assert.match(item.description, healing, `${id} description states its healing`);
  }
  for (const [id, item] of Object.entries(INVENTORY_ITEMS)) assert.ok(ICON_KINDS.includes(item.icon), `${id} icon "${item.icon}" is not drawn`);
});

test('every food heals a whole, modest amount and its missing message names where it comes from', () => {
  for (const id of foodIds) {
    const { healing, missing } = FOODS[id];
    assert.ok(Number.isInteger(healing) && healing >= 10 && healing <= 50, `${id} heals ${healing}`);
    assert.match(missing, /^You have no .+\. .+\.$/, `${id} missing message`);
    assert.ok(Object.isFrozen(FOODS[id]), `${id} entry is frozen`);
  }
  assert.ok(Object.isFrozen(FOODS));
});

test('every food can be eaten from the satchel once and restores exactly its listed health', () => {
  for (const id of foodIds) {
    const inventory = createInventoryState();
    assert.equal(inventory.add(id, 1), true, id);
    const combat = combatAt(10);
    const events = [];
    const consumables = createConsumables({ inventory, combat, onEvent: event => events.push(event) });
    assert.deepEqual(consumables.consume(id), { ok: true, healed: FOODS[id].healing, reason: '' }, id);
    assert.equal(combat.state.player.hp, 10 + FOODS[id].healing, id);
    assert.equal(inventory.has(id), false, `${id} was used up`);
    assert.equal(consumables.status(id).reason, FOODS[id].missing, id);
    assert.equal(consumables.consume(id).ok, false, id);
    assert.deepEqual(events, [{ type: 'consume', id, healed: FOODS[id].healing }]);
  }
});
