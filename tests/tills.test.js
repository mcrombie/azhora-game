import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { purchase, peddlerOffers, PEDDLER_STOCK } from '../src/economy.js';
import { INVENTORY_ITEMS, createInventoryState } from '../src/inventory.js';
import { ATTIC_WINES } from '../src/attic-wines.js';

/**
 * A till takes the money and hands over the goods, and either step can refuse: the
 * purse can be short, and `add` refuses a second one of anything that does not stack.
 * The refund has to put back what was taken and nothing else. Written the obvious way
 *
 *     if (!remove(price) || !add(item)) { add(price); ... }
 *
 * it pays the customer when the purse was too small to take from, because the `||`
 * short-circuits and the branch refunds a payment that never happened.
 */
const COPPER = 'copper-piece';

/** The shape both shop tills in main.js use, as a function of what the two steps return. */
function till({ purse, price, itemId, already = 0 }) {
  const inventory = createInventoryState();
  if (purse > 0) inventory.add(COPPER, purse);
  if (already > 0) inventory.add(itemId, already);
  const paid = inventory.remove(COPPER, price);
  if (!paid || !inventory.add(itemId, 1)) { if (paid) inventory.add(COPPER, price); return { purse: inventory.count(COPPER), got: inventory.count(itemId) - already }; }
  return { purse: inventory.count(COPPER), got: inventory.count(itemId) - already };
}

test('a purchase that goes through takes the price exactly once and hands over one of the thing', () => {
  assert.deepEqual(till({ purse: 10, price: 3, itemId: 'boiled-egg' }), { purse: 7, got: 1 });
  assert.deepEqual(till({ purse: 3, price: 3, itemId: 'boiled-egg' }), { purse: 0, got: 1 }, 'exactly the price is enough');
});

test('a purchase the purse cannot cover leaves the purse alone, and never adds to it', () => {
  for (const [purse, price] of [[2, 3], [0, 1], [9, 10]]) {
    const after = till({ purse, price, itemId: 'boiled-egg' });
    assert.equal(after.purse, purse, `a purse of ${purse} asked for ${price} came back as ${after.purse}`);
    assert.equal(after.got, 0, 'and nothing was handed over');
  }
});

test('a purchase refused at the satchel gives the money back, all of it and only it', () => {
  // A tinderbox does not stack, so a second one is refused after the money is taken.
  assert.equal(INVENTORY_ITEMS.tinderbox.stackable, undefined, 'the tinderbox is the non-stacking case');
  const after = till({ purse: 10, price: 8, itemId: 'tinderbox', already: 1 });
  assert.deepEqual(after, { purse: 10, got: 0 });
});

test('neither shop in main.js refunds a payment it did not take', () => {
  const main = readFileSync(fileURLToPath(new URL('../src/main.js', import.meta.url)), 'utf8');
  // The broken shape: one condition that both takes the money and gives it back.
  const broken = [...main.matchAll(/if\s*\(\s*!\s*inventory\.remove\([^)]*\)\s*\|\|[^)]*\)\s*\{\s*inventory\.add\(\s*COPPER_ITEM/g)];
  assert.deepEqual(broken.map(match => main.slice(match.index, match.index + 90)), [],
    'a till that refunds inside the same condition that tried to take the money pays out when the purse is short');
  // Every till that takes copper must decide on the refund from whether the take succeeded.
  const tills = [...main.matchAll(/inventory\.remove\(COPPER_ITEM,\s*(?:entry|offer)\.price\)/g)];
  assert.equal(tills.length, 2, 'the two shops are still the two shops');
  for (const match of tills) {
    const after = main.slice(match.index, match.index + 200);
    assert.match(after, /if\s*\(\s*paid\s*\)\s*inventory\.add\(COPPER_ITEM/, 'the refund is conditional on having been paid');
  }
});

test('the peddler offers an item at exactly its price and refuses it one copper short', () => {
  for (const entry of PEDDLER_STOCK) {
    const item = INVENTORY_ITEMS[entry.id];
    assert.ok(item, `${entry.id} is a real satchel item`);
    const exactly = peddlerOffers({ purse: entry.price, count: () => 0, items: INVENTORY_ITEMS }).find(offer => offer.id === entry.id);
    const short = peddlerOffers({ purse: entry.price - 1, count: () => 0, items: INVENTORY_ITEMS }).find(offer => offer.id === entry.id);
    assert.equal(exactly.enabled, true, `${entry.id} is refused at exactly its price of ${entry.price}`);
    assert.equal(short.enabled, false, `${entry.id} is offered ${entry.price - 1} copper short`);
    assert.match(short.reason, /copper/, `${entry.id} says why it is refused`);
  }
});

test('a price that is not a whole non-negative number is not a price', () => {
  for (const bad of [-1, 1.5, NaN, Infinity, '3']) {
    assert.equal(purchase({ price: bad, purse: 1000 }).ok, false, `price ${bad}`);
    assert.equal(purchase({ price: 3, purse: bad }).ok, false, `purse ${bad}`);
  }
});

test('every bottle on the attic shelves is a satchel item with a price', () => {
  for (const wine of Object.values(ATTIC_WINES)) {
    assert.ok(INVENTORY_ITEMS[wine.item], `${wine.item} is in the satchel`);
    assert.ok(Number.isInteger(wine.price) && wine.price > 0, `${wine.item} costs ${wine.price}`);
  }
});
