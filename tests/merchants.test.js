import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BUILD_ONE_BOARDS, BUILD_ONE_BUYERS, BUYERS, BUYER_IDS, FARM_TOOLS, GAME_DAY_SECONDS, MERCHANT_ITEMS, ORDERS_PER_DAY, ORDER_BOARDS, SEED_ITEMS,
  buyerForNpc, createMerchants, gameDay, openTrade, registerBoards, registerBuyers, validateMerchants } from '../src/gameplay/inventory/merchants.js';
import { TRADE_RATES, isPriced } from '../src/gameplay/inventory/prices.js';
import { INVENTORY_ITEMS, createInventoryState } from '../src/gameplay/inventory/inventory.js';

const COPPER = 'copper-piece';
/** The farming module's crops, dishes and seeds as it registers them, for a satchel that can hold them today. */
const FARM_ITEMS = Object.fromEntries([
  ['bridge-rye', 'Bridge rye'], ['bridge-rye-fine', 'Fine bridge rye'], ['field-beans', 'Field beans'], ['field-beans-fine', 'Fine field beans'],
  ['soft-fruit', 'Soft fruit'], ['soft-fruit-fine', 'Fine soft fruit'], ['bean-pottage', 'Bean pottage'], ['soft-fruit-tart', 'Soft-fruit tart'], ['rye-cheese-loaf', 'Rye loaf with onion and river cheese'],
  [SEED_ITEMS['bridge-rye'], 'Bridge rye seed'], [SEED_ITEMS['field-beans'], 'Field bean seed'], [SEED_ITEMS['soft-fruit'], 'Soft fruit canes'],
  // The Nethereum goods of the contract for Builds 2 and 3 (6 October 2026), for the registered buyers below.
  ['meadow-hay', 'Meadow hay'], ['flood-oats', 'Flood oats'], ['butter', 'Butter'], ['manure', 'Manure'],
].map(([id, name]) => [id, { name, stackable: true }]));
const ITEMS = { ...INVENTORY_ITEMS, ...MERCHANT_ITEMS, ...FARM_ITEMS };

/** A satchel with the real one's rules (src/gameplay/inventory/inventory.js), over the wider item list. */
function satchel(start = {}) {
  const owned = new Map(Object.entries(start).filter(([, n]) => n > 0));
  return {
    count: id => owned.get(id) ?? 0,
    items: () => [...owned.keys()],
    add(id, n = 1) {
      if (!Object.hasOwn(ITEMS, id) || !Number.isSafeInteger(n) || n < 1) return false;
      const before = owned.get(id) ?? 0;
      if (!ITEMS[id].stackable && (before > 0 || n !== 1)) return false;
      owned.set(id, before + n); return true;
    },
    remove(id, n = 1) {
      const before = owned.get(id) ?? 0;
      if (!Number.isSafeInteger(n) || n < 1 || before < n) return false;
      if (before === n) owned.delete(id); else owned.set(id, before - n);
      return true;
    },
  };
}
function market(start = {}, extra = {}) {
  const clock = { t: 0 }, gained = [], events = [];
  const inventory = satchel(start);
  const merchants = createMerchants({ inventory, items: ITEMS, playSeconds: () => clock.t, skills: { gain: (id, xp) => gained.push([id, xp]) },
    onEvent: event => events.push(event), ...extra });
  return { merchants, inventory, clock, gained, events, nextDay: () => { clock.t += GAME_DAY_SECONDS; } };
}

test('a game day is twenty-four minutes of play, and the first ends at midnight, eighteen minutes in', () => {
  assert.equal(gameDay(0), 0);
  assert.equal(gameDay(1079), 0);
  assert.equal(gameDay(1080), 1);
  assert.equal(gameDay(1080 + GAME_DAY_SECONDS), 2);
  assert.equal(gameDay(NaN), 0);
});

test('a buyer pays full price for the first lot of the day, six-tenths for the second, then has enough until tomorrow', () => {
  const { merchants, inventory, nextDay } = market({ 'bridge-rye': 80 });
  assert.equal(BUYERS.consus.appetite, 24);
  const first = merchants.sell('consus', 'bridge-rye', 24);
  assert.equal(first.ok, true);
  assert.equal(first.total, 24, 'twenty-four at the home price of one');
  const second = merchants.sell('consus', 'bridge-rye', 24);
  assert.equal(second.total, 14, 'twenty-four at six-tenths, rounded down once');
  const third = merchants.sell('consus', 'bridge-rye', 1);
  assert.equal(third.ok, false);
  assert.equal(third.reason, BUYERS.consus.lines.full);
  assert.equal(inventory.count(COPPER), 38);
  assert.equal(inventory.count('bridge-rye'), 32, 'nothing left the satchel for the refused lot');
  nextDay();
  assert.equal(merchants.sell('consus', 'bridge-rye', 20).total, 20);
  const straddle = merchants.sell('consus', 'bridge-rye', 10);
  assert.equal(straddle.total, 7, 'four at full and six at six-tenths is 7.6');
  assert.equal(straddle.units, 10);
});

test('one sale moves the goods and the copper together through the real satchel', () => {
  const inventory = createInventoryState();
  inventory.add('barley', 30);
  const merchants = createMerchants({ inventory, items: INVENTORY_ITEMS, playSeconds: () => 0 });
  const quote = merchants.quote('consus', 'barley');
  const sold = merchants.sell('consus', 'barley');
  assert.equal(sold.ok, true);
  assert.equal(sold.total, quote.total);
  assert.equal(sold.units, 30, 'twenty-four at one and six at six-tenths');
  assert.equal(inventory.count(COPPER), 24 + 3);
  assert.equal(inventory.count('barley'), 0);
});

test('Nepri buys only sealed grain, and twelve sealed bridge rye fetch eighteen in Minora', () => {
  const { merchants, inventory, events } = market({ 'bridge-rye': 12, [COPPER]: 1 });
  const refused = merchants.sell('nepri', 'bridge-rye');
  assert.equal(refused.ok, false);
  assert.equal(refused.reason, BUYERS.nepri.lines.none);
  const sealed = merchants.seal('bridge-rye', 12, { by: 'nepri' });
  assert.equal(sealed.ok, true);
  assert.deepEqual(sealed.fee, { kind: 0, copper: 1 }, 'a lot under twenty pays a copper');
  assert.equal(sealed.where, 'Minora');
  assert.equal(inventory.count(COPPER), 0);
  assert.equal(merchants.quote('nepri', 'bridge-rye').total, 18);
  assert.equal(merchants.sell('nepri', 'bridge-rye').total, 18);
  assert.equal(merchants.sealed('bridge-rye').count, 0, 'the seals went with the grain');
  assert.deepEqual(events.map(event => event.type), ['sealed', 'sold']);
});

test('the seal takes a twentieth in kind from a large lot, refuses a small one without a copper, and seals nothing twice', () => {
  const { merchants, inventory } = market({ 'bridge-rye-fine': 45, carrot: 5 });
  const big = merchants.seal('bridge-rye-fine', 45, { by: 'consus' });
  assert.equal(big.ok, true);
  assert.deepEqual(big.fee, { kind: 2, copper: 0 });
  assert.equal(big.sealed, 43);
  assert.equal(big.where, 'Caricas');
  assert.equal(inventory.count('bridge-rye-fine'), 43);
  assert.equal(merchants.seal('bridge-rye-fine', 1, { by: 'consus' }).ok, false, 'all of it is sealed already');
  const poor = merchants.seal('carrot', 5, { by: 'nepri' });
  assert.equal(poor.ok, false);
  assert.match(poor.reason, /One copper/);
  assert.equal(inventory.count('carrot'), 5);
  assert.equal(merchants.seal('carrot', 5, { by: 'rudiger' }).ok, false, 'the commissary is not a measurer');
  assert.equal(merchants.seal('tinderbox', 1, { by: 'nepri' }).ok, false, 'nor is a tinderbox a farm good');
  inventory.add('bridge-rye-fine', 3);
  const unnamed = merchants.seal('bridge-rye-fine', undefined, { grade: 'fine' });
  assert.equal(unnamed.ok, false, 'a copper short');
  inventory.add(COPPER, 1);
  const named = merchants.seal('bridge-rye-fine');
  assert.equal(named.sealed, 3, 'all that was unsealed');
  assert.equal(named.by, null, 'a seal nobody named is a measurer’s, place unknown');
  assert.equal(named.where, null);
});

test('Fine produce counts as Fine at home unsealed, but away from home only when sealed', () => {
  const { merchants } = market({ 'bridge-rye-fine': 20, [COPPER]: 5 });
  assert.equal(merchants.quote('consus', 'bridge-rye-fine', 10).total, 20, 'Fine at home, unsealed: two each');
  assert.equal(merchants.quote('rudiger', 'bridge-rye-fine', 10).total, 6, 'unsealed in Minora it is Plain: six-tenths each');
  merchants.seal('bridge-rye-fine', 10, { by: 'nepri' });
  assert.equal(merchants.quote('rudiger', 'bridge-rye-fine', 10).total, 12, 'sealed, it is Fine to the commissary too');
  assert.equal(merchants.quote('nepri', 'bridge-rye-fine').total, 30, 'ten sealed Fine at three each in the city');
  // At home the unsealed go first, so the seals are kept for where they count.
  merchants.sell('consus', 'bridge-rye-fine', 10);
  assert.equal(merchants.sealed('bridge-rye-fine').count, 10);
});

test('seals never outnumber the goods: what was eaten was the unsealed first', () => {
  const { merchants, inventory } = market({ carrot: 10, [COPPER]: 1 });
  merchants.seal('carrot', 4, { by: 'nepri' });
  inventory.remove('carrot', 5);
  assert.equal(merchants.sealed('carrot').count, 4);
  inventory.remove('carrot', 3);
  assert.equal(merchants.sealed('carrot').count, 2);
  assert.deepEqual(merchants.snapshot().sealed, { carrot: { count: 2, prize: 0 } });
});

test('nothing outside the price table can be sold, not even to the commissary who buys anything', () => {
  const { merchants, inventory } = market({ tinderbox: 1, 'kings-axe': 1, 'carrot-seed': 4, [COPPER]: 10, 'iron-hoe': 1, charcoal: 3 });
  for (const id of ['tinderbox', 'kings-axe', 'carrot-seed', COPPER, 'iron-hoe', 'charcoal']) {
    assert.equal(merchants.wants('rudiger', id), false, id);
    assert.equal(merchants.sell('rudiger', id).ok, false, id);
  }
  assert.equal(merchants.sellAll('rudiger').ok, false);
  assert.equal(inventory.count(COPPER), 10);
});

test('the commissary pays six-tenths of the home price for anything priced, without limit', () => {
  const { merchants, inventory } = market({ carrot: 200, 'soft-fruit-tart': 3 });
  assert.equal(merchants.sell('rudiger', 'carrot').total, 120);
  assert.equal(merchants.sell('rudiger', 'soft-fruit-tart').total, Math.floor(3 * 7 * .6));
  assert.equal(inventory.count('carrot'), 0);
  assert.equal(merchants.appetite('rudiger').full, Infinity);
  assert.deepEqual(merchants.snapshot().appetites, {}, 'and there is nothing of his to save');
});

test('the Carican factor buys what grows only on the west bank, and not Caricas’s own rye', () => {
  assert.equal(createMerchants({ inventory: satchel() }).wants('portunus', 'bridge-rye'), false);
  for (const id of ['flood-oats', 'meadow-hay', 'weir-fish', 'silver-millet', 'hard-wheat', 'madder', 'hard-wheat-flour', 'oatcakes', 'flatbread'])
    assert.equal(createMerchants({ inventory: satchel() }).wants('portunus', id), true, id);
  for (const id of ['barley', 'carrot']) assert.equal(createMerchants({ inventory: satchel() }).wants('portunus', id), false, `${id} grows on both banks`);
});

test('a board posts the same three orders all day, paying half again the market and Farming experience', () => {
  const { merchants } = market();
  const first = merchants.orders('grain-court');
  assert.equal(first.length, ORDERS_PER_DAY);
  assert.deepEqual(merchants.orders('grain-court').map(o => o.id), first.map(o => o.id));
  assert.equal(new Set(first.map(o => o.item)).size, ORDERS_PER_DAY, 'three different goods');
  for (const o of first) {
    const posting = ORDER_BOARDS['grain-court'].postings.find(p => p.item === o.item);
    assert.ok(o.count >= posting.min && o.count <= posting.max);
    assert.equal(o.pay, Math.floor(1.5 * o.count * ({ 'soft-fruit': 2, 'soft-fruit-tart': 7, 'bean-pottage': 4 }[o.item] ?? 1) * (o.item.endsWith('-fine') ? 2 : 1) + 1e-9));
    assert.equal(o.xp, o.pay * TRADE_RATES.orderXp);
    assert.match(o.line, new RegExp(`wants ${o.count} .* by tomorrow’s bell: ${o.pay} copper\\.`));
  }
  assert.deepEqual(market().merchants.orders('no-such-board'), []);
});

test('filling an order pays once, gives Farming experience and raises the buyer’s appetite a step', () => {
  const stock = Object.fromEntries(ORDER_BOARDS['grain-court'].postings.map(p => [p.item, 100]));
  const { merchants, inventory, gained } = market(stock);
  const [o] = merchants.orders('grain-court');
  assert.equal(o.ready, true);
  const before = inventory.count(o.item);
  const filled = merchants.fill('grain-court', o.id);
  assert.equal(filled.ok, true);
  assert.equal(inventory.count(COPPER), o.pay);
  assert.equal(inventory.count(o.item), before - o.count);
  assert.deepEqual(gained, [['farming', o.xp]]);
  assert.equal(merchants.fill('grain-court', o.id).ok, false, 'an order is filled once');
  assert.equal(inventory.count(COPPER), o.pay);
  assert.equal(merchants.orders('grain-court').find(entry => entry.id === o.id).filled, true);
  assert.equal(merchants.appetite('consus').of, 30, 'a quarter more of twenty-four, rounded');
});

test('an order not filled by the bell comes down, and a fresh three go up', () => {
  const stock = Object.fromEntries(ORDER_BOARDS['grain-court'].postings.map(p => [p.item, 100]));
  const { merchants, nextDay, inventory } = market(stock);
  const yesterday = merchants.orders('grain-court');
  nextDay();
  const refused = merchants.fill('grain-court', yesterday[0].id);
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /came down/);
  assert.equal(inventory.count(COPPER), 0);
  const today = merchants.orders('grain-court');
  assert.equal(today.length, ORDERS_PER_DAY);
  assert.ok(today.every(o => !yesterday.some(old => old.id === o.id)));
});

test('a Fine order in Minora takes only sealed goods, and the order says why it waits', () => {
  const { merchants, clock } = market({ 'bridge-rye-fine': 40, 'soft-fruit-fine': 40, [COPPER]: 5 });
  let fine = null;
  for (let day = 0; day < 60 && !fine; day++) {
    clock.t = day * GAME_DAY_SECONDS;
    fine = merchants.orders('measure-house').find(o => o.item.endsWith('-fine')) ?? null;
  }
  assert.ok(fine, 'a Fine order goes up within two months of play');
  assert.equal(fine.ready, false);
  assert.match(fine.reason, /sealed/);
  assert.equal(merchants.fill('measure-house', fine.id).ok, false);
  merchants.seal(fine.item, fine.count, { by: 'nepri' });
  assert.equal(merchants.fill('measure-house', fine.id).ok, true);
});

test('buying takes the price once, refuses a second tool, and refuses what is not on the stall', () => {
  const { merchants, inventory, events } = market({ [COPPER]: 20 });
  const hoe = merchants.buy('ilmarinen', 'bog-iron-hoe');
  assert.equal(hoe.ok, true);
  assert.equal(inventory.count(COPPER), 8);
  assert.equal(inventory.count('bog-iron-hoe'), 1);
  const again = merchants.buy('ilmarinen', 'bog-iron-hoe');
  assert.equal(again.ok, false);
  assert.match(again.reason, /already carry/);
  assert.equal(inventory.count(COPPER), 8);
  assert.equal(merchants.buy('ilmarinen', 'steel-sickle').ok, false, 'a hundred and twenty is more than eight');
  assert.equal(inventory.count(COPPER), 8);
  assert.equal(merchants.buy('ilmarinen', 'tinderbox').ok, false);
  assert.equal(merchants.buy('pomona', SEED_ITEMS['soft-fruit']).ok, true);
  assert.equal(inventory.count(SEED_ITEMS['soft-fruit']), 4, 'a packet is four');
  assert.equal(inventory.count(COPPER), 6);
  assert.deepEqual(events.map(event => event.type), ['bought', 'bought']);
  // A stall whose goods are not registered yet shows nothing rather than selling a ghost.
  const unregistered = Object.fromEntries(Object.entries(ITEMS).filter(([id]) => id !== SEED_ITEMS['soft-fruit']));
  const bare = createMerchants({ inventory: satchel({ [COPPER]: 50 }), items: unregistered });
  assert.equal(bare.buy('pomona', SEED_ITEMS['soft-fruit']).ok, false);
});

test('a Prize sealed by a measurer is owed the Guild’s bounty once, and sells at three times', () => {
  const { merchants, inventory } = market({ 'soft-fruit-fine': 3, [COPPER]: 1 });
  const sealed = merchants.seal('soft-fruit-fine', 3, { by: 'consus', grade: 'prize' });
  assert.equal(sealed.grade, 'prize');
  assert.deepEqual(merchants.bountiesOwed().map(owed => owed.id), ['soft-fruit']);
  const paid = merchants.claimBounty('soft-fruit-fine');
  assert.equal(paid.ok, true);
  assert.equal(inventory.count(COPPER), TRADE_RATES.bounty);
  assert.equal(merchants.claimBounty('soft-fruit').ok, false, 'once');
  assert.equal(merchants.claimBounty('bridge-rye').ok, false, 'and only for a sealed Prize');
  assert.equal(inventory.count(COPPER), TRADE_RATES.bounty);
  assert.equal(merchants.quote('rudiger', 'soft-fruit-fine').total, Math.floor(3 * 2 * 3 * .6));
  assert.equal(merchants.seal('carrot', 1, { by: 'consus', grade: 'prize' }).ok, false, 'no carrots held');
});

test('snapshot and restore carry appetites, seals, orders, standing and bounties by game day', () => {
  const stock = { ...Object.fromEntries(ORDER_BOARDS['grain-court'].postings.map(p => [p.item, 100])), [COPPER]: 3 };
  const a = market(stock);
  a.merchants.sell('consus', 'bridge-rye', 30);
  a.merchants.seal('soft-fruit-fine', 5, { by: 'consus', grade: 'prize' });
  a.merchants.claimBounty('soft-fruit');
  a.merchants.fill('grain-court', a.merchants.orders('grain-court')[1].id);
  const saved = JSON.parse(JSON.stringify(a.merchants.snapshot()));
  assert.equal(validateMerchants(saved), true);
  const b = createMerchants({ inventory: a.inventory, items: ITEMS, playSeconds: () => a.clock.t });
  assert.equal(b.restore(saved), true);
  assert.deepEqual(b.snapshot(), saved);
  assert.deepEqual(b.appetite('consus'), a.merchants.appetite('consus'));
  assert.deepEqual(b.appetite('consus'), { full: 0, reduced: 30, of: 30 }, 'thirty taken of a raised thirty');
  assert.equal(b.fill('grain-court', b.orders('grain-court')[1].id).ok, false, 'a filled order stays filled');
  assert.equal(b.claimBounty('soft-fruit').ok, false, 'a paid bounty stays paid');
  // A day later the appetite and the board are new; the seals, the standing and the ledger are not.
  a.nextDay();
  const later = b.snapshot();
  assert.deepEqual(later.appetites, {});
  assert.deepEqual(later.orders, {});
  assert.deepEqual(later.sealed, saved.sealed);
  assert.deepEqual(later.standing, { consus: 1 });
});

test('a save from before the merchants starts afresh, and invalid data changes nothing', () => {
  const { merchants } = market({ 'bridge-rye': 30 });
  merchants.sell('consus', 'bridge-rye', 10);
  const kept = merchants.snapshot();
  assert.equal(validateMerchants(undefined), true);
  const bad = [
    null, [], 3, { version: 2 }, { version: 1, extra: true },
    { version: 1, appetites: { nobody: { day: 0, taken: 1 } } },
    { version: 1, appetites: { consus: { day: 0, taken: -1 } } },
    { version: 1, appetites: { consus: { day: 0.5, taken: 1 } } },
    { version: 1, standing: { consus: 5 } },
    { version: 1, sealed: { tinderbox: { count: 1, prize: 0 } } },
    { version: 1, sealed: { 'bridge-rye': { count: 0, prize: 0 } } },
    { version: 1, sealed: { 'bridge-rye-fine': { count: 1, prize: 2 } } },
    { version: 1, sealed: { 'bridge-rye': { count: 2, prize: 1 } } },
    { version: 1, prizes: ['bridge-rye-fine'] },
    { version: 1, prizes: ['soft-fruit', 'soft-fruit'] },
    { version: 1, bounties: ['soft-fruit'] },
    { version: 1, orders: { 'grain-court': { day: 0, filled: [ORDERS_PER_DAY] } } },
    { version: 1, orders: { 'grain-court': { day: 0, filled: [1, 1] } } },
    { version: 1, orders: { 'nowhere': { day: 0, filled: [] } } },
  ];
  for (const data of bad) {
    assert.equal(validateMerchants(data), false, JSON.stringify(data));
    assert.equal(merchants.restore(data), false);
    assert.deepEqual(merchants.snapshot(), kept, 'a refused restore leaves the market as it was');
  }
  assert.equal(validateMerchants({ version: 1 }), true, 'every part of the section may be missing');
  assert.equal(merchants.restore(undefined), true);
  assert.deepEqual(merchants.snapshot(), { version: 1, appetites: {}, standing: {}, sealed: {}, prizes: [], bounties: [], orders: {} });
});

test('the trade dialogue offers what the buyer takes and sells, and each choice goes through', () => {
  const { merchants, inventory } = market({ 'bridge-rye': 12, barley: 5, [COPPER]: 3 });
  const opened = [], traded = [];
  let closed = 0;
  const ctx = { merchants, openDialogue: (npc, lines, event, action, options) => opened.push({ npc, lines, options }), closeDialogue: () => closed++, onTrade: result => traded.push(result) };
  const nepri = { id: 'lizeem-nepri', name: 'Nepri', role: 'Grain clerk' };
  assert.equal(openTrade(nepri, ctx), true);
  let { lines, options } = opened.at(-1);
  assert.deepEqual(lines, [BUYERS.nepri.lines.open]);
  assert.equal(options.noWayfinding, true);
  const label = id => options.choices.find(choice => choice.id === id);
  assert.equal(label('sell-nepri-bridge-rye').enabled, false, 'nothing sealed yet');
  assert.equal(label('seal-nepri-bridge-rye').label, 'Have 12 bridge rye sealed (1 copper)');
  label('seal-nepri-bridge-rye').action();
  ({ lines, options } = opened.at(-1));
  assert.match(lines[0], /Nepri weighs the lot and seals 12 bridge rye for a copper\. You carry 2 copper\./);
  assert.equal(label('sell-nepri-bridge-rye').label, 'Sell 12 bridge rye for 18 copper');
  label('sell-nepri-bridge-rye').action();
  assert.equal(inventory.count(COPPER), 20);
  assert.deepEqual(traded.map(result => result.line ? 'ok' : 'no'), ['ok', 'ok']);
  ({ options } = opened.at(-1));
  assert.ok(options.choices.some(choice => choice.id === 'orders-nepri'));
  options.choices.at(-1).action();
  assert.equal(closed, 1, 'leaving closes the trade when there is nowhere to go back to');
  // The commissary's "Sell all" lists every good at once, and the toolsmith's stall sells by the piece.
  openTrade({ id: 'lizeem-rudiger', name: 'Rudiger', role: '' }, ctx);
  ({ options } = opened.at(-1));
  assert.equal(options.choices.find(choice => choice.id === 'sell-all-rudiger'), undefined, 'one good needs no Sell all');
  inventory.add('carrot', 10);
  openTrade({ id: 'lizeem-rudiger', name: 'Rudiger', role: '' }, ctx);
  ({ options } = opened.at(-1));
  assert.equal(options.choices.find(choice => choice.id === 'sell-all-rudiger').label, 'Sell all: 15 for 9 copper');
  openTrade({ id: 'lizeem-ilmarinen', name: 'Ilmarinen', role: '' }, { ...ctx, back: () => closed++ });
  ({ options } = opened.at(-1));
  assert.equal(options.choices.find(choice => choice.id === 'buy-ilmarinen-bog-iron-hoe').label, 'Buy bog-iron hoe · 12 copper');
  assert.equal(options.choices.find(choice => choice.id === 'buy-ilmarinen-steel-hoe').enabled, false);
  options.choices.at(-1).action();
  assert.equal(closed, 2, 'leaving goes back to the person’s own conversation when there is one');
  assert.equal(openTrade({ id: 'lizeem-silvanus' }, ctx), false, 'a person with no trade opens nothing');
  assert.equal(openTrade(nepri, { openDialogue: () => {} }), false, 'and nothing opens without the market');
});

test('the orders board opens from the measurer and fills from the dialogue', () => {
  const stock = Object.fromEntries(ORDER_BOARDS['grain-court'].postings.map(p => [p.item, 100]));
  const { merchants, inventory } = market(stock);
  const opened = [];
  const ctx = { openDialogue: (npc, lines, event, action, options) => opened.push({ lines, options }), closeDialogue: () => {} };
  merchants.ordersConversation({ id: 'lizeem-consus' }, ctx);
  const { options } = opened.at(-1);
  assert.equal(options.choices.length, ORDERS_PER_DAY + 1);
  const [o] = merchants.orders('grain-court');
  options.choices[0].action();
  assert.equal(inventory.count(COPPER), o.pay);
  assert.match(opened.at(-1).lines[0], /copper/);
});

test('people are matched to buyers by id, by the id’s last word, or by the buyer they are given', () => {
  assert.equal(buyerForNpc({ id: 'nepri' }), BUYERS.nepri);
  assert.equal(buyerForNpc({ id: 'lizeem-portunus' }), BUYERS.portunus);
  assert.equal(buyerForNpc({ id: 'someone', buyer: 'satet' }), BUYERS.satet);
  assert.equal(buyerForNpc({ id: 'lizeem-silvanus' }), null);
  assert.equal(buyerForNpc(null), null);
});

test('every buyer is whole: a place, a voice, wants that are priced kinds or goods, and stock at a price', () => {
  const kinds = new Set(['any', 'west-bank', 'east-bank', 'grain', 'root', 'pulse', 'fruit', 'nut', 'fodder', 'fish', 'flour', 'dye', 'dish']);
  for (const b of Object.values(BUYERS)) {
    assert.ok(['Minora', 'Caricas'].includes(b.where), `${b.id} trades in Minora or Caricas`);
    assert.ok(b.lines.open.length > 0 && typeof b.lines.paid === 'function', `${b.id} has something to say`);
    for (const want of b.wants) assert.ok(kinds.has(want) || isPriced(want), `${b.id} wants ${want}`);
    for (const entry of b.sells) assert.ok(Number.isInteger(entry.price) && entry.price > 0 && Number.isInteger(entry.quantity) && entry.quantity > 0, `${b.id} sells ${entry.id}`);
  }
  assert.deepEqual(Object.keys(BUYERS), ['nepri', 'portunus', 'rudiger', 'consus', 'pomona', 'ilmarinen', 'seshat', 'satet']);
  assert.ok(BUYERS.nepri.services.includes('seal') && BUYERS.consus.services.includes('seal'));
  assert.equal(BUYERS.nepri.appetite, 30); assert.equal(BUYERS.portunus.appetite, 20); assert.equal(BUYERS.pomona.appetite, 12); assert.equal(BUYERS.satet.appetite, 8);
});

test('the toolsmith’s tools are whole satchel entries at the design’s three prices', () => {
  const source = readFileSync(fileURLToPath(new URL('../src/gameplay/inventory/inventory.js', import.meta.url)), 'utf8');
  assert.equal(FARM_TOOLS.length, 12);
  assert.deepEqual([...new Set(FARM_TOOLS.map(tool => tool.price))], [12, 35, 120]);
  assert.deepEqual([...new Set(FARM_TOOLS.map(tool => tool.helps))], ['sow', 'reap', 'prune', 'water']);
  for (const tool of FARM_TOOLS) {
    const item = MERCHANT_ITEMS[tool.id];
    assert.ok(item, `${tool.id} is a satchel entry`);
    assert.equal(item.type, 'Tool');
    assert.equal(item.stackable, undefined, 'one of each is enough');
    assert.ok(item.brief && item.description.includes('Ilmarinen'));
    assert.ok(new RegExp(`\\n  '?${item.icon}'?: '<`).test(source), `${item.icon} is an icon the satchel draws`);
    assert.equal(INVENTORY_ITEMS[tool.id] === undefined || INVENTORY_ITEMS[tool.id] === item, true, `${tool.id} is not a different item already`);
  }
  for (const id of Object.keys(MERCHANT_ITEMS)) assert.equal(Object.hasOwn(INVENTORY_ITEMS, id) && INVENTORY_ITEMS[id] !== MERCHANT_ITEMS[id], false, `${id} collides`);
});

/**
 * The groundwork for Builds 2 to 5 (the user, 6 October 2026: "keep building everything"): each
 * country registers its buyers and boards at start-up, in the form Build 1's own now take, and a
 * buyer's wants each carry their own appetite.
 */
test('Build 1’s buyers and boards are registered in the same form every country uses', () => {
  assert.deepEqual(BUILD_ONE_BUYERS.map(spec => spec.id), ['nepri', 'portunus', 'rudiger', 'consus', 'pomona', 'ilmarinen', 'seshat', 'satet']);
  assert.deepEqual(BUYER_IDS.slice(0, 8), BUILD_ONE_BUYERS.map(spec => spec.id));
  assert.deepEqual(BUILD_ONE_BOARDS.map(board => board.id), ['measure-house', 'grain-court']);
  for (const spec of BUILD_ONE_BUYERS) assert.ok(typeof spec.place === 'string' && (spec.wants ?? []).every(want => want.appetite >= 0), `${spec.id} is in the contract’s form`);
  assert.deepEqual(BUYERS.consus.groups.map(group => [group.items.length, group.appetite]), [[5, 24]], 'Consus’s five goods share one appetite of 24');
  assert.deepEqual(BUYERS.nepri.services, ['seal', 'orders']);
  assert.deepEqual(BUYERS.seshat.services, ['bounty']);
  assert.equal(BUYERS.rudiger.rate, TRADE_RATES.commissary);
  assert.equal(registerBuyers([{ ...BUILD_ONE_BUYERS[0] }]).ok, false, 'an id is registered once');
});

test('a country’s buyer is registered at start-up, and each of his wants has an appetite of its own', () => {
  const boann = { id: 'boann', name: 'Boann', role: 'The cattle-woman', place: 'nethereum',
    wants: [{ item: 'meadow-hay', appetite: 24 }, { item: 'barley', appetite: 12 }],
    sells: [{ id: 'butter', price: 3 }, { id: 'manure', price: 1 }], lines: { paid: 'She pays {total} copper.' } };
  assert.deepEqual(registerBuyers([boann]), { ok: true, added: ['boann'], refused: [] });
  assert.equal(BUYERS.boann.where, 'Nethereum', 'the place as the price table names it');
  assert.deepEqual(BUYERS.boann.wants, ['meadow-hay', 'barley']);
  assert.equal(BUYERS.boann.appetite, 24, 'the first want’s, as Build 1 had one a buyer');
  assert.ok(BUYERS.boann.lines.open && BUYERS.boann.lines.full && BUYERS.boann.lines.none, 'plain lines where none were given');
  assert.equal(buyerForNpc({ id: 'boann' }), BUYERS.boann);
  for (const bad of [{ id: 'nobody', place: 'Nesdor' }, { id: 'nameless', name: 'X' }, { id: 'greedy', name: 'Greedy', place: 'Nesdor', wants: [{ item: 'barley', appetite: 1.5 }] },
    { id: 'dear', name: 'Dear', place: 'Nesdor', sells: [{ id: 'ale', price: 0 }] }])
    assert.equal(registerBuyers([bad]).ok, false, JSON.stringify(bad));
  assert.equal(Object.hasOwn(BUYERS, 'greedy'), false, 'nothing refused is half-registered');
  const { merchants, inventory, nextDay } = market({ 'meadow-hay': 60, barley: 40, [COPPER]: 10 });
  const hay = merchants.sell('boann', 'meadow-hay', 24);
  assert.deepEqual([hay.ok, hay.total, hay.line], [true, 48, 'She pays 48 copper.'], 'twenty-four hay at two, at home');
  assert.deepEqual(merchants.appetite('boann', 'barley'), { full: 12, reduced: 12, of: 12 }, 'the hay did not eat the barley’s appetite');
  assert.equal(merchants.sell('boann', 'barley', 12).total, 12, 'barley grows in Ovesos on the same bank, so Nethereum pays the home price');
  assert.deepEqual(merchants.appetite('boann'), { full: 0, reduced: 24, of: 24 });
  const saved = JSON.parse(JSON.stringify(merchants.snapshot()));
  assert.deepEqual(saved.appetites.boann, { day: 0, taken: 36, each: [24, 12] });
  assert.equal(validateMerchants(saved), true);
  assert.equal(validateMerchants({ ...saved, appetites: { boann: { day: 0, taken: 30, each: [24, 12] } } }), false, 'the wants add up to the day');
  assert.equal(validateMerchants({ ...saved, appetites: { boann: { day: 0, taken: 36, each: [24, 6, 6] } } }), false, 'no more wants than he has');
  const again = createMerchants({ inventory, items: ITEMS, playSeconds: () => 0 });
  assert.equal(again.restore(saved), true);
  assert.deepEqual(again.snapshot(), saved);
  assert.deepEqual(again.appetite('boann', 'barley'), merchants.appetite('boann', 'barley'));
  // A save from before the wants were counted apart charges the day to the first.
  assert.equal(again.restore({ version: 1, appetites: { boann: { day: 0, taken: 10 } } }), true);
  assert.deepEqual([again.appetite('boann', 'meadow-hay').full, again.appetite('boann', 'barley').full], [14, 12]);
  assert.equal(merchants.buy('boann', 'butter').ok, true);
  nextDay();
  assert.deepEqual(merchants.appetite('boann', 'meadow-hay'), { full: 24, reduced: 24, of: 24 }, 'a new day');
});

test('a country’s order board is registered for one of its buyers, and posts and fills as the others do', () => {
  registerBuyers([{ id: 'gwyddno', name: 'Gwyddno', role: 'The weir-master', place: 'Nethereum', wants: [{ item: 'flood-oats', appetite: 12 }], seals: true, board: 'weir-board' }]);
  assert.equal(registerBoards([{ id: 'nobody-board', name: 'A board', buyer: 'nobody', place: 'Nethereum', postings: [{ item: 'flood-oats', min: 1, max: 2, requester: 'Someone' }] }]).ok, false,
    'a board belongs to a registered buyer');
  assert.equal(registerBoards([{ id: 'empty-board', name: 'A board', buyer: 'gwyddno', place: 'Nethereum', postings: [] }]).ok, false, 'a board posts something');
  const board = { id: 'weir-board', name: 'The weir board', buyer: 'gwyddno', place: 'nethereum', postings: [
    { item: 'flood-oats', min: 4, max: 8, requester: 'The levee store' }, { item: 'meadow-hay', min: 4, max: 8, requester: 'The Flood Council' },
    { item: 'butter', min: 2, max: 4, requester: 'The smoke-house' }] };
  assert.deepEqual(registerBoards([board]).added, ['weir-board']);
  assert.equal(registerBoards([board]).ok, false, 'once');
  assert.equal(ORDER_BOARDS['weir-board'].where, 'Nethereum');
  assert.ok(BUYERS.gwyddno.services.includes('seal') && BUYERS.gwyddno.services.includes('orders'));
  const { merchants, inventory, gained } = market({ 'flood-oats': 20, 'meadow-hay': 20, butter: 10, [COPPER]: 1 });
  const posted = merchants.orders('weir-board');
  assert.equal(posted.length, 3);
  const [o] = posted;
  assert.equal(merchants.fill('weir-board', o.id).ok, true);
  assert.equal(inventory.count(COPPER), 1 + o.pay);
  assert.deepEqual(gained, [['farming', o.xp]]);
  assert.equal(merchants.appetite('gwyddno').of, 15, 'a quarter more of twelve');
  const saved = merchants.snapshot();
  assert.equal(validateMerchants(saved), true);
  assert.deepEqual(saved.standing, { gwyddno: 1 });
  assert.equal(merchants.seal('flood-oats', 5, { by: 'gwyddno' }).where, 'Nethereum');
});
