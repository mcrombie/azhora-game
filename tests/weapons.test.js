import test from 'node:test';
import assert from 'node:assert/strict';
import { createWeapons, WEAPON_WEAR } from '../src/weapons.js';

function fixture(items = { 'simple-sword': 1 }) {
  const stock = new Map(Object.entries(items));
  const inventory = {
    has: id => (stock.get(id) ?? 0) > 0,
    count: id => stock.get(id) ?? 0,
    remove(id, quantity) {
      if ((stock.get(id) ?? 0) < quantity) return false;
      stock.set(id, stock.get(id) - quantity);
      return true;
    },
  };
  const events = [];
  const weapons = createWeapons({ wear: true, inventory, onEvent: event => events.push(event) });
  return { weapons, inventory, stock, events };
}

test('a sword warns once, breaks after 24 contacts, remains owned, and can be repaired', () => {
  const { weapons, inventory, events } = fixture();
  assert.equal(weapons.equippedId, 'simple-sword');
  for (let i = 0; i < 24; i++) weapons.contact();
  assert.equal(weapons.profile().durability, 0);
  assert.equal(weapons.profile().usable, false);
  assert.equal(inventory.has('simple-sword'), true);
  assert.deepEqual(events.map(event => event.type), ['weapon-worn', 'weapon-broken']);
  assert.equal(events[0].durability, 6);
  assert.equal(weapons.contact(), null, 'broken weapons cannot wear below zero');
  assert.equal(weapons.equip('simple-sword'), false);
  assert.equal(weapons.repair(), true);
  assert.equal(weapons.profile().durability, 24);
  assert.equal(weapons.profile().usable, true);
  assert.equal(weapons.repair(), false, 'a pristine weapon needs no repair');
  for (let i = 0; i < 18; i++) weapons.contact();
  assert.equal(events.filter(event => event.type === 'weapon-worn').length, 2, 'repair rearms the warning');
});

test('sticks consume one stack unit on breaking and ready the next fresh stick', () => {
  const { weapons, inventory, stock, events } = fixture({ 'simple-sword': 1, 'forest-stick': 2 });
  assert.equal(weapons.equip('forest-stick'), true);
  for (let i = 0; i < 6; i++) weapons.contact();
  assert.equal(inventory.count('forest-stick'), 1);
  assert.equal(weapons.equippedId, 'forest-stick');
  assert.equal(weapons.profile().durability, 6);
  assert.equal(events.at(-1).remaining, 1);
  for (let i = 0; i < 6; i++) weapons.contact();
  assert.equal(inventory.count('forest-stick'), 0);
  assert.equal(weapons.profile().usable, false);
  assert.equal(weapons.profile().durability, 0);
  assert.equal(weapons.equippedId, 'forest-stick', 'no surprise automatic sword switch');
  stock.set('forest-stick', 1);
  assert.equal(weapons.profile().durability, 6, 'a later forest pickup is fresh');
  assert.equal(weapons.profile().usable, true);
});

test('switching weapons preserves both conditions and a partly used active stick', () => {
  const { weapons, inventory } = fixture({ 'simple-sword': 1, 'forest-stick': 3 });
  weapons.contact();
  weapons.equip('forest-stick');
  weapons.contact(); weapons.contact();
  weapons.equip('simple-sword');
  assert.equal(weapons.profile().durability, 23);
  weapons.equip('forest-stick');
  assert.equal(weapons.profile().durability, 4);
  assert.equal(inventory.count('forest-stick'), 3, 'the active stick is part of the carried stack');
  weapons.equip('forest-stick');
  assert.equal(weapons.profile().durability, 4, 'reselecting does not manufacture fresh condition');
});

test('contact charges the snapshotted weapon rather than equipment selected mid-swing', () => {
  const { weapons } = fixture({ 'simple-sword': 1, 'forest-stick': 1 });
  const started = weapons.profile();
  weapons.equip('forest-stick');
  weapons.contact(started.id);
  assert.equal(weapons.status('simple-sword').durability, 23);
  assert.equal(weapons.status('forest-stick').durability, 6);
});

test('repair restores carried equipment but never creates weapons or consumed sticks', () => {
  const { weapons, inventory } = fixture({ 'simple-sword': 1, 'forest-stick': 1 });
  weapons.contact();
  weapons.equip('forest-stick');
  weapons.contact();
  assert.equal(weapons.repair(), true);
  assert.equal(weapons.status('simple-sword').durability, 24);
  assert.equal(weapons.status('forest-stick').durability, 6);
  for (let i = 0; i < 6; i++) weapons.contact();
  assert.equal(weapons.repair(), false);
  assert.equal(inventory.count('forest-stick'), 0);
  assert.equal(weapons.status('forest-stick').usable, false);
});

test('equipment selection rejects unknown and unowned items and profiles do not expose mutable state', () => {
  const { weapons } = fixture();
  assert.equal(weapons.equip('forest-stick'), false);
  assert.equal(weapons.equip('acorn'), false);
  assert.equal(weapons.status('acorn'), null);
  assert.equal(weapons.contact('acorn'), null);
  const profile = weapons.profile();
  profile.damage[0] = 1000; profile.durability = 1000;
  assert.equal(weapons.profile().damage[0], 24);
  assert.equal(weapons.profile().durability, 24);
});

test('spending firewood retains a worn active stick while spare branches remain', () => {
  const { weapons, inventory } = fixture({ 'simple-sword': 1, 'forest-stick': 4 });
  weapons.equip('forest-stick');
  weapons.contact(); weapons.contact();
  assert.equal(weapons.spendSticks(2), true);
  assert.equal(inventory.count('forest-stick'), 2);
  assert.equal(weapons.profile().durability, 4);
  assert.equal(weapons.equippedId, 'forest-stick');
});

test('using the final sticks for firewood empties the weapon and a later pickup is fresh', () => {
  const { weapons, inventory, stock } = fixture({ 'simple-sword': 1, 'forest-stick': 2 });
  weapons.equip('forest-stick');
  weapons.contact();
  assert.equal(weapons.spendSticks(2), true);
  assert.equal(inventory.count('forest-stick'), 0);
  assert.equal(weapons.profile().usable, false);
  stock.set('forest-stick', 1);
  assert.equal(weapons.profile().durability, 6);
  assert.equal(weapons.status('simple-sword').durability, 24);
});

test('firewood spending rejects invalid quantities or refused removal without changing condition', () => {
  const { weapons, inventory } = fixture({ 'simple-sword': 1, 'forest-stick': 2 });
  weapons.equip('forest-stick'); weapons.contact();
  for (const count of [0, -1, .5, NaN, Infinity, '2', null, 3]) assert.equal(weapons.spendSticks(count), false);
  assert.equal(inventory.count('forest-stick'), 2);
  assert.equal(weapons.profile().durability, 5);
  inventory.remove = () => false;
  assert.equal(weapons.spendSticks(2), false);
  assert.equal(inventory.count('forest-stick'), 2);
  assert.equal(weapons.profile().durability, 5);
});

test('traded weapons are carried, worn, repaired and saved as extras; a handed-away weapon reads as gone', () => {
  const { weapons, stock } = fixture({ 'simple-sword': 1, 'iron-mace': 1 });
  assert.equal(weapons.equip('iron-mace'), true);
  assert.deepEqual(weapons.profile().damage, [30, 32, 44]);
  weapons.contact(); weapons.contact();
  assert.equal(weapons.status('iron-mace').durability, 28);
  const snapshot = weapons.snapshot();
  assert.deepEqual(snapshot.extra, { 'iron-mace': 28 });
  const gone = weapons.take('simple-sword');
  assert.equal(gone, 24); stock.set('simple-sword', 0);
  assert.equal(weapons.status('simple-sword').owned, false);
  assert.equal(weapons.setCondition('iron-mace', 31), false, 'condition cannot exceed the weapon');
  assert.equal(weapons.setCondition('iron-mace', 5), true);
  assert.equal(weapons.repair(), true); assert.equal(weapons.status('iron-mace').durability, 30);
  const other = fixture({ 'simple-sword': 1, 'iron-mace': 1 });
  assert.equal(other.weapons.restore({ ...snapshot }), true);
  assert.equal(other.weapons.status('iron-mace').durability, 28);
  assert.equal(other.weapons.restore({ ...snapshot, extra: { 'iron-mace': 99 } }), false, 'an impossible condition is refused');
  assert.equal(other.weapons.restore({ ...snapshot, extra: {} }), false, 'a carried weapon must be listed');
  assert.equal(other.weapons.restore({ ...snapshot, extra: { greatsword: 3, 'iron-mace': 28 } }), false, 'an uncarried weapon must not be listed');
});

test('for now weapons never wear, but a bench still mends and wear can be switched back on', () => {
  assert.equal(WEAPON_WEAR, false);
  const stock = new Map([['simple-sword', 1], ['forest-stick', 1]]);
  const inventory = { has: id => (stock.get(id) ?? 0) > 0, count: id => stock.get(id) ?? 0, remove: () => true };
  const events = [];
  const weapons = createWeapons({ inventory, onEvent: event => events.push(event) });
  assert.equal(weapons.wears, false);
  for (let i = 0; i < 200; i++) weapons.contact();
  weapons.equip('forest-stick');
  for (let i = 0; i < 50; i++) weapons.contact();
  assert.equal(weapons.status('simple-sword').durability, 24);
  assert.equal(weapons.status('forest-stick').durability, 6);
  assert.deepEqual(events, [], 'nothing wears thin or breaks');
  assert.equal(weapons.setCondition('simple-sword', 3), true);
  assert.equal(weapons.repair(), true, 'the bench still mends');
  assert.equal(weapons.status('simple-sword').durability, 24);
  weapons.setWear(true); weapons.equip('simple-sword'); weapons.contact();
  assert.equal(weapons.status('simple-sword').durability, 23);
});
