import test from 'node:test';
import assert from 'node:assert/strict';
import {createInventoryState, INVENTORY_ITEMS} from '../src/inventory.js';
import {createWeapons} from '../src/weapons.js';

test('A new traveler carries nothing and cannot inspect an item they have not received', () => {
  const satchel = createInventoryState();
  assert.deepEqual(satchel.items(), []);
  assert.equal(satchel.selectedId(), null);
  assert.equal(satchel.has('harbor-letter'), false);
  assert.equal(satchel.select('harbor-letter'), false);
  assert.equal(satchel.selectedId(), null);
});

test('Repeated conversations cannot duplicate the letter, sword, or travel token', () => {
  const satchel = createInventoryState();
  for (const id of ['harbor-letter', 'simple-sword', 'road-token']) {
    assert.equal(satchel.grant(id), true);
    assert.equal(satchel.grant(id), false);
    assert.equal(satchel.has(id), true);
  }
  assert.deepEqual(satchel.items(), ['harbor-letter', 'simple-sword', 'road-token']);
  const list = satchel.items();
  list.length = 0;
  assert.equal(satchel.items().length, 3, 'A UI list cannot mutate ownership');
});

test('Only an explicit owned-item selection opens its details, and bad selection preserves them', () => {
  const satchel = createInventoryState();
  satchel.grant('harbor-letter');
  assert.equal(satchel.selectedId(), null, 'Receiving the message does not count as reading it');
  assert.equal(satchel.select('harbor-letter'), true);
  assert.equal(satchel.selectedId(), 'harbor-letter');
  assert.equal(satchel.select('road-token'), false);
  assert.equal(satchel.selectedId(), 'harbor-letter');
  satchel.grant('road-token');
  assert.equal(satchel.selectedId(), 'harbor-letter', 'Receiving another item preserves the current page');
  assert.equal(satchel.select('road-token'), true);
  assert.equal(satchel.selectedId(), 'road-token');
});

test('Unknown inventory IDs, including object property names, never become quest items', () => {
  const satchel = createInventoryState();
  for (const id of ['missing-item', 'constructor', '__proto__', null, undefined]) {
    assert.equal(satchel.grant(id), false);
    assert.equal(satchel.select(id), false);
  }
  assert.deepEqual(satchel.items(), []);
  assert.equal(INVENTORY_ITEMS['harbor-letter'].type, 'Quest item');
});

test('Acorns form one stack while unique quest items remain unique', () => {
  const satchel = createInventoryState();
  assert.equal(satchel.add('acorn', 3), true);
  assert.equal(satchel.add('acorn'), true);
  assert.equal(satchel.count('acorn'), 4);
  assert.deepEqual(satchel.items(), ['acorn']);
  assert.equal(satchel.grant('acorn'), false, 'Granting is still idempotent');
  assert.equal(satchel.add('harbor-letter', 2), false);
  assert.equal(satchel.add('harbor-letter'), true);
  assert.equal(satchel.add('harbor-letter'), false);
  assert.equal(satchel.count('harbor-letter'), 1);
});

test('Removing a stack is atomic and clearing it also clears the selected details', () => {
  const satchel = createInventoryState();
  satchel.add('acorn', 10);
  satchel.select('acorn');
  assert.equal(satchel.remove('acorn', 11), false);
  assert.equal(satchel.count('acorn'), 10);
  assert.equal(satchel.remove('acorn', 8), true);
  assert.equal(satchel.count('acorn'), 2);
  assert.equal(satchel.selectedId(), 'acorn');
  assert.equal(satchel.remove('acorn', 2), true);
  assert.equal(satchel.count('acorn'), 0);
  assert.equal(satchel.has('acorn'), false);
  assert.equal(satchel.selectedId(), null);
  assert.deepEqual(satchel.items(), []);
});

test('Bad quantities and unknown items cannot mutate inventory or overflow a stack', () => {
  const satchel = createInventoryState();
  satchel.add('acorn', 3);
  for (const quantity of [0, -1, 0.5, NaN, Infinity, '2', Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(satchel.add('acorn', quantity), false);
    assert.equal(satchel.remove('acorn', quantity), false);
    assert.equal(satchel.count('acorn'), 3);
  }
  for (const id of ['constructor', '__proto__', 'missing', null, undefined]) {
    assert.equal(satchel.add(id), false);
    assert.equal(satchel.remove(id), false);
    assert.equal(satchel.count(id), 0);
  }
  assert.equal(satchel.add('acorn', Number.MAX_SAFE_INTEGER), false);
  assert.equal(satchel.count('acorn'), 3);
});

test('swords remain unique while forest sticks form a stack and break one at a time', () => {
  const satchel = createInventoryState();
  assert.equal(satchel.grant('simple-sword'), true);
  assert.equal(satchel.add('simple-sword'), false);
  assert.equal(satchel.add('simple-sword', 2), false);
  assert.equal(satchel.add('forest-stick', 2), true);
  assert.equal(satchel.add('forest-stick'), true);
  const weapons = createWeapons({wear: true, inventory: satchel});
  assert.equal(weapons.equip('forest-stick'), true);
  satchel.select('forest-stick');
  for (let i = 0; i < 6; i++) weapons.contact();
  assert.equal(satchel.count('forest-stick'), 2);
  assert.equal(satchel.selectedId(), 'forest-stick');
  assert.equal(weapons.profile().durability, 6);
  for (let i = 0; i < 12; i++) weapons.contact();
  assert.equal(satchel.has('forest-stick'), false);
  assert.equal(satchel.selectedId(), null, 'the final spent stick cannot leave stale details');
  assert.equal(satchel.count('simple-sword'), 1);
  assert.equal(INVENTORY_ITEMS['simple-sword'].type, 'Weapon');
  assert.equal(INVENTORY_ITEMS['forest-stick'].type, 'Weapon');
});

test('ripe pawpaws stack separately from acorns and keep their selected details until the final fruit is used', () => {
  const satchel = createInventoryState();
  satchel.add('acorn', 8);
  assert.equal(satchel.add('pawpaw', 2), true);
  assert.equal(satchel.add('pawpaw'), true);
  assert.equal(satchel.count('pawpaw'), 3);
  assert.equal(INVENTORY_ITEMS.pawpaw.type, 'Food');
  satchel.select('pawpaw');
  assert.equal(satchel.remove('pawpaw'), true);
  assert.equal(satchel.count('pawpaw'), 2);
  assert.equal(satchel.selectedId(), 'pawpaw');
  assert.equal(satchel.remove('pawpaw', 2), true);
  assert.equal(satchel.selectedId(), null);
  assert.equal(satchel.count('acorn'), 8, 'eating fruit does not spend Lysa\'s quest ingredients');
});

test('camping tools are unique while raw and cooked fish remain separate stacks', () => {
  const satchel = createInventoryState();
  for (const id of ['tinderbox', 'fishing-rod']) {
    assert.equal(satchel.grant(id), true);
    assert.equal(satchel.grant(id), false);
    assert.equal(satchel.add(id, 2), false);
    assert.equal(INVENTORY_ITEMS[id].type, 'Tool');
  }
  satchel.add('raw-fish', 3); satchel.add('cooked-fish', 2);
  satchel.select('raw-fish');
  assert.equal(satchel.remove('raw-fish'), true);
  assert.equal(satchel.count('raw-fish'), 2);
  assert.equal(satchel.count('cooked-fish'), 2);
  assert.equal(satchel.selectedId(), 'raw-fish');
  assert.equal(INVENTORY_ITEMS['raw-fish'].type, 'Ingredient');
  assert.equal(INVENTORY_ITEMS['cooked-fish'].type, 'Food');
  assert.equal(INVENTORY_ITEMS['cooked-fish'].eatName, 'cooked fish');
});
