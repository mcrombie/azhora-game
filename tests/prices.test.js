import test from 'node:test';
import assert from 'node:assert/strict';
import { BANKS, DISH_PRICES, FARM_GOODS, GRADES, PRICE_TABLE, TRADE_RATES, atHome, gradeVariant, isPriced, lotPrice, priceOf } from '../src/prices.js';

test('every good and dish in the design’s first-pass table has its base price', () => {
  const bases = {
    carrot: 1, beet: 1, barley: 1, rye: 1, 'bridge-rye': 1, oats: 1, millet: 1, 'field-beans': 1,
    'soft-fruit': 2, hazelnuts: 2, floodwheat: 2, 'hard-wheat': 2, hay: 2, 'weir-fish': 2, flour: 3, 'dye-crop': 4,
  };
  const dishes = { 'rye-cheese-loaf': 3, 'bean-pottage': 4, 'soft-fruit-tart': 7, oatcake: 3, 'smoked-fish': 4, 'white-bread': 5, 'nut-cake': 8, flatbread: 4, 'millet-porridge': 2, 'fork-stew': 12 };
  assert.deepEqual(Object.fromEntries(Object.entries(FARM_GOODS).map(([id, good]) => [id, good.base])), bases);
  assert.deepEqual(Object.fromEntries(Object.entries(DISH_PRICES).map(([id, good]) => [id, good.base])), dishes);
  for (const [id, good] of Object.entries(PRICE_TABLE)) {
    assert.ok(good.home.length > 0, `${id} grows somewhere`);
    for (const home of good.home) assert.ok(BANKS[home] || home === 'Minora', `${id} is at home in ${home}, which is on the Lizeem`);
  }
  assert.deepEqual(GRADES, { plain: 1, good: 1.5, fine: 2, prize: 3 });
});

test('grade multiplies first, then place: home, the city, a neighbour on the same bank, the far bank', () => {
  assert.equal(priceOf('bridge-rye', { place: 'Caricas' }), 1, 'at home');
  assert.equal(priceOf('bridge-rye', { place: 'Minora' }), 1.5, 'in the city');
  assert.equal(priceOf('bridge-rye', { place: 'Isareos' }), 1.5, 'Isareos is the city’s country');
  assert.equal(priceOf('bridge-rye', { place: 'Nesdor' }), 1, 'a neighbour on the east bank pays the home price');
  assert.equal(priceOf('bridge-rye', { place: 'Nethereum' }), 2, 'the far bank pays double');
  assert.equal(priceOf('bridge-rye', { grade: 'good', place: 'Caricas' }), 1.5);
  assert.equal(priceOf('soft-fruit', { grade: 'fine', place: 'Minora' }), 2 * 2 * 1.5);
  assert.equal(priceOf('soft-fruit', { grade: 'prize', place: 'Ovesos' }), 2 * 3 * 2);
  assert.equal(priceOf('bridge-rye'), 1, 'no place is the home price');
});

test('the fine kind of a crop is priced as its Fine grade, and a named grade overrides it', () => {
  assert.deepEqual(gradeVariant('bridge-rye-fine'), { base: 'bridge-rye', fine: true });
  assert.deepEqual(gradeVariant('soft-fruit-tart'), { base: 'soft-fruit-tart', fine: false });
  assert.equal(priceOf('bridge-rye-fine'), 2);
  assert.equal(priceOf('bridge-rye-fine', { place: 'Minora' }), 3);
  assert.equal(priceOf('bridge-rye-fine', { grade: 'plain', place: 'Minora' }), 1.5, 'unsealed away from home it sells as Plain');
  assert.equal(priceOf('soft-fruit-fine', { grade: 'prize' }), 6);
  assert.equal(priceOf('soft-fruit-tart-fine'), 14, 'a fine dish is a grade up too');
});

test('anything not in the table has no price, so nothing becomes sellable by accident', () => {
  for (const id of ['copper-piece', 'tinderbox', 'kings-axe', 'carrot-seed', 'bridge-rye-seed', 'iron-hoe', 'charcoal', 'pipe-weed', 'pipe-weed-fine', 'rye-loaf',
    'tinderbox-fine', 'bridge-rye-fine-fine', 'fine-bridge-rye', '', undefined, null, 7]) {
    assert.equal(priceOf(id), undefined, `${String(id)} has no price`);
    assert.equal(isPriced(id), false, `${String(id)} is not priced`);
    assert.equal(lotPrice(id, 3), undefined);
  }
  assert.equal(priceOf('bridge-rye', { grade: 'legendary' }), undefined, 'nor has a grade nobody grades by');
});

test('a lot is rounded down once, so twelve bridge rye fetch eighteen in Minora and one fetches one', () => {
  assert.equal(lotPrice('bridge-rye', 12, { place: 'Minora' }), 18);
  assert.equal(lotPrice('bridge-rye', 1, { place: 'Minora' }), 1);
  assert.equal(lotPrice('bridge-rye', 3, { place: 'Minora' }), 4);
  assert.equal(lotPrice('bridge-rye', 0, { place: 'Minora' }), 0);
  for (const bad of [-1, 1.5, NaN, '3']) assert.equal(lotPrice('bridge-rye', bad), undefined, `a count of ${bad}`);
});

test('the city pays its own price for what it cooks, and the old commons crops are at home in all four countries', () => {
  assert.equal(priceOf('fork-stew', { place: 'Minora' }), 12);
  assert.equal(priceOf('fork-stew', { place: 'Caricas' }), 12, 'the city’s own dish is a neighbour’s to both banks');
  assert.equal(priceOf('fork-stew', { place: 'Ovesos' }), 12);
  for (const place of ['Caricas', 'Nethereum', 'Nesdor', 'Ovesos']) assert.equal(priceOf('carrot', { place }), 1, `carrots at home in ${place}`);
  assert.equal(priceOf('carrot', { place: 'Minora' }), 1.5);
  assert.equal(priceOf('barley', { place: 'Nethereum' }), 1, 'barley grows in Ovesos, on the west bank too');
  assert.ok(atHome('soft-fruit-fine', 'Caricas') && !atHome('soft-fruit-fine', 'Minora'));
});

test('off the Lizeem a good fetches its home price, and `home` can say where it grows', () => {
  assert.equal(priceOf('soft-fruit', { place: 'Drent' }), 2);
  assert.equal(priceOf('soft-fruit', { place: 'Nethereum', home: true }), 2, 'true means sold at home');
  assert.equal(priceOf('soft-fruit', { place: 'Nethereum', home: 'Ovesos' }), 2, 'grown on the same bank');
  assert.equal(priceOf('soft-fruit', { place: 'Nethereum', home: ['Caricas'] }), 4);
});

test('the trade’s rates are the design’s: six-tenths, half again, a twentieth', () => {
  assert.equal(TRADE_RATES.secondLot, .6);
  assert.equal(TRADE_RATES.commissary, .6);
  assert.equal(TRADE_RATES.order, 1.5);
  assert.equal(TRADE_RATES.sealTithe, 20);
  assert.equal(TRADE_RATES.sealCopper, 1);
  assert.equal(TRADE_RATES.seedPacket, 2);
  assert.ok(TRADE_RATES.standingStep * TRADE_RATES.standingMax <= 1, 'orders can at most double an appetite');
});
