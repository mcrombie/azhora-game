import test from 'node:test';
import assert from 'node:assert/strict';
import { COPPER_ITEM, CURRENCIES, PEDDLER, PEDDLER_STOCK, STARTING_PURSE, describeSum, peddlerOffers, purchase } from '../src/economy.js';
import { INVENTORY_ITEMS } from '../src/inventory.js';

test('the Empire’s coin runs ten to one and only copper is built yet; the rebels’ paper has no copper value', () => {
  assert.equal(CURRENCIES.silver.inCopper, 10 * CURRENCIES.copper.inCopper);
  assert.equal(CURRENCIES.gold.inCopper, 10 * CURRENCIES.silver.inCopper);
  assert.equal(CURRENCIES.gold.inCopper, 100);
  assert.equal(CURRENCIES.scrip.inCopper, null);
  assert.equal(CURRENCIES.scrip.issuer, 'coalition');
  assert.deepEqual(Object.values(CURRENCIES).filter(c => c.built).map(c => c.id), [COPPER_ITEM]);
  assert.equal(INVENTORY_ITEMS[COPPER_ITEM].type, 'Money');
  assert.equal(INVENTORY_ITEMS[COPPER_ITEM].stackable, true);
  assert.ok(STARTING_PURSE > 0 && STARTING_PURSE < 100);
});

test('sums are spelled out in gold, silver and copper', () => {
  assert.equal(describeSum(0), 'no copper');
  assert.equal(describeSum(7), '7 copper');
  assert.equal(describeSum(10), '1 silver');
  assert.equal(describeSum(24), '2 silver, 4 copper');
  assert.equal(describeSum(100), '1 gold');
  assert.equal(describeSum(235), '2 gold, 3 silver, 5 copper');
  assert.equal(describeSum(-1), 'nothing');
  assert.equal(describeSum(1.5), 'nothing');
});

test('purchases need the copper, refuse a second tool, and every stock item is a real item at a real price', () => {
  assert.deepEqual(purchase({ price: 3, purse: 5 }), { ok: true, reason: '', remaining: 2 });
  assert.equal(purchase({ price: 3, purse: 2 }).ok, false);
  assert.match(purchase({ price: 3, purse: 2 }).reason, /2 copper/);
  assert.equal(purchase({ price: 8, purse: 20, owned: true, stackable: false }).ok, false);
  assert.equal(purchase({ price: 2, purse: 20, owned: true, stackable: true }).ok, true);
  assert.equal(purchase({ price: -1, purse: 20 }).ok, false);
  for (const entry of PEDDLER_STOCK) {
    assert.ok(INVENTORY_ITEMS[entry.id], `${entry.id} is a real item`);
    assert.ok(Number.isInteger(entry.price) && entry.price >= 1 && entry.price <= 20, `${entry.id} costs a few copper`);
  }
  const offers = peddlerOffers({ purse: 3, count: id => (id === 'tinderbox' ? 1 : 0), items: INVENTORY_ITEMS });
  assert.equal(offers.length, PEDDLER_STOCK.length);
  assert.ok(offers.find(o => o.id === 'boiled-egg').enabled);
  assert.ok(!offers.find(o => o.id === 'dried-venison').enabled, 'six copper is more than three');
  assert.ok(!offers.find(o => o.id === 'tinderbox').enabled, 'one tinderbox is enough');
  assert.match(offers.find(o => o.id === 'oatcake').label, /Oatcakes · 2 copper/);
});

test('the peddler explains all three coins and the rebels’ paper, and stands off the green', () => {
  const speech = PEDDLER.lines.join(' ');
  for (const word of ['copper', 'silver', 'gold', 'scrip', 'Ten coppers to a silver']) assert.match(speech, new RegExp(word));
  assert.equal(PEDDLER.lines.length, 3);
  assert.ok(Number.isFinite(PEDDLER.stand.x) && Number.isFinite(PEDDLER.stand.z));
});
