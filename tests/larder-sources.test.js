import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { INVENTORY_ITEMS } from '../src/inventory.js';
import { FOODS as HEALING } from '../src/consumables.js';
import { PEDDLER_STOCK } from '../src/economy.js';
import { RECIPES } from '../src/cooking.js';
import { PLANT_SPECIES } from '../src/botany.js';
import { CROPS, ORCHARD_ITEM } from '../src/farming.js';

/**
 * Six foods healed and could not be got.
 *
 * `docs/known-issues.md` carried the entry for months, and the reason it could carry it is that
 * nothing checked: a food is a row in `src/inventory.js` and a number in `src/consumables.js`,
 * and neither of those knows whether anybody in Azhora will ever hand you one. This is the check
 * that was missing. It reads `src/` as text, the way `tests/tills.test.js` reads the shops, so a
 * food added tomorrow with nowhere to come from fails here rather than in a player's satchel.
 */
const SRC = fileURLToPath(new URL('../src/', import.meta.url));
const SOURCES = readdirSync(SRC).filter(name => name.endsWith('.js'))
  .map(name => ({ name, text: readFileSync(SRC + name, 'utf8') }));

/** The ways a thing can reach the satchel, each of them a real mechanism somewhere in src/. */
const shops = new Set(PEDDLER_STOCK.map(entry => entry.id));
const cooked = new Set(Object.values(RECIPES).map(entry => entry.makes));
const gathered = new Set(Object.values(PLANT_SPECIES).map(entry => entry.item).filter(Boolean));
const farmed = new Set([...Object.values(CROPS).map(entry => entry.item), ORCHARD_ITEM]);
/**
 * Anything a module other than the two that merely *describe* food names by id: a reward table,
 * a shop's stock, a recipe's output, an `inventory.add`. A food that appears nowhere outside
 * `inventory.js` and `consumables.js` is a food nobody in Azhora has ever been written holding.
 */
const DESCRIBERS = new Set(['inventory.js', 'consumables.js', 'foods.js']);
const handedOver = id => SOURCES.some(file => !DESCRIBERS.has(file.name) && file.text.includes(`'${id}'`));

/** Where a food comes from, or null if the answer is nowhere. */
const source = id => shops.has(id) ? 'the pedlar' : cooked.has(id) ? 'a recipe'
  : gathered.has(id) ? 'a plant' : farmed.has(id) ? 'the farm' : handedOver(id) ? 'somebody’s hand' : null;

const FOODS = Object.keys(HEALING).filter(id => Object.hasOwn(INVENTORY_ITEMS, id));

/**
 * Eight wines are written down and poured nowhere: they belong to countries that are recorded
 * on the atlas and not built, the way `src/economy.js` records silver and gold before either
 * exists. They are the only things in the larder with nowhere to come from, they are named here
 * so that the list cannot quietly grow, and the day somebody builds Ostel's white it comes off.
 */
test('every food that heals is a food somebody in Azhora can actually give you', () => {
  assert.ok(FOODS.length >= 20, `only ${FOODS.length} foods to check`);
  const orphans = FOODS.filter(id => !source(id));
  assert.deepEqual(orphans.filter(id => !id.startsWith('wine-')), [],
    `these heal and cannot be got: ${orphans.filter(id => !id.startsWith('wine-')).join(', ')}`);
  assert.equal(orphans.length, 8, `the wines of the countries nobody has built are the only ones left: ${orphans.join(', ')}`);
});

test('the six that could not be got have the sources the long road gave them', () => {
  // docs/known-issues.md listed these by name. Each one now comes from the skill that owns it.
  assert.equal(source('avrel-apple'), 'the farm', 'picked in Applegarth’s kept orchard');
  assert.equal(source('hazelnuts'), 'a plant', 'off the hazel in Nell’s hedge');
  assert.equal(source('bramble-berries'), 'a plant', 'off the bramble, at the lane and at the gate');
  assert.equal(source('acorn-flatbread'), 'a recipe', 'Lysa’s, from the acorn errand’s meal');
  assert.equal(source('honey-cake'), 'a recipe', 'Lysa’s, with a comb of Troy’s honey');
  assert.equal(source('roasted-chestnuts'), 'the pedlar', 'down from Amod by the sackful');
  // And each of the two recipes needs something a traveler can be holding.
  for (const id of ['acorn-flatbread', 'honey-cake']) {
    for (const need of Object.keys(RECIPES[id].needs)) {
      assert.ok(Object.hasOwn(INVENTORY_ITEMS, need), `${id} wants ${need}, which is not a thing`);
      assert.ok(source(need) || need === 'acorn', `${id} wants ${need}, which nobody can get`);
    }
  }
});

test('docs/known-issues.md no longer says the larder is unreachable', () => {
  const known = readFileSync(fileURLToPath(new URL('../docs/known-issues.md', import.meta.url)), 'utf8');
  for (const id of ['hazelnuts', 'bramble-berries', 'acorn-flatbread', 'honey-cake', 'roasted-chestnuts'])
    assert.doesNotMatch(known, new RegExp(`^.*${id}.*(cannot be|no way|nowhere|unobtainable).*$`, 'mi'),
      `${id} is still listed as unreachable, and it is not`);
});
