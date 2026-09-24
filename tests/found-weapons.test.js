import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createFoundWeapons, fallenCompanions, REACH } from '../src/found-weapons.js';
import { createCompanions } from '../src/companions.js';
import { createFallen } from '../src/bystanders.js';

const source = name => readFileSync(fileURLToPath(new URL(`../src/${name}`, import.meta.url)), 'utf8');

/** A companion who fell somewhere, carrying something. */
function fallenWith(id, weapon, weaponName, at) {
  const companions = createCompanions({ fallen: createFallen() });
  companions.ask(id, { where: id === 'merc-mus' ? 'wild' : 'road', has: { edge: true, charted: true, birded: true } });
  companions.died(id, { where: 'Luscia', what: 'Wolves', ...at, weapon, weaponName });
  return companions;
}

test('it owns nothing: what is lying there is the source’s own record', () => {
  const companions = fallenWith('merc-eliana', 'greatsword', 'greatsword', { x: -600, z: 140 });
  const found = createFoundWeapons({ sources: [fallenCompanions(companions)] });
  assert.equal(found.count, 1);
  assert.deepEqual(found.lying().map(one => one.name), ['Eliana’s greatsword']);
  // Taking it through here is taking it there: one record, one fact, no second copy to disagree.
  assert.equal(found.take('merc-eliana').ok, true);
  assert.equal(companions.weaponOnTheGround('merc-eliana'), null, 'the source stopped offering it');
  assert.equal(found.count, 0);
  assert.equal(found.take('merc-eliana').ok, false, 'and it cannot be taken twice');
  // A weapon nobody is keeping is not lying anywhere.
  assert.equal(found.take('nobody-at-all').ok, false);
  assert.equal(createFoundWeapons().count, 0, 'and with no sources there is nothing to find');
});

test('the nearest within reach, and nothing out of it', () => {
  const near = fallenWith('merc-eliana', 'greatsword', 'greatsword', { x: 10, z: 0 });
  const far = fallenWith('merc-mus', 'simple-sword', 'sword', { x: 60, z: 0 });
  const found = createFoundWeapons({ sources: [fallenCompanions(near), fallenCompanions(far)] });
  assert.equal(found.count, 2, 'both are lying somewhere');
  assert.equal(found.nearest(10, 0)?.id, 'merc-eliana', 'the one you are standing over');
  assert.ok(found.nearest(10, 0).away < 1e-9);
  assert.equal(found.nearest(0, 0), null, 'ten metres away is not in reach');
  assert.equal(found.nearest(10 + REACH + .01, 0), null, 'nor is a step past the reach');
  assert.ok(found.nearest(10 + REACH - .01, 0), 'but a step inside it is');
  assert.equal(found.nearest(59, 0)?.id, 'merc-mus', 'and each is found from its own ground');
  for (const bad of [[NaN, 0], [0, NaN], [undefined, undefined]]) assert.equal(found.nearest(...bad), null, String(bad));
  // Two on one spot are offered in a fixed order, so the second is never unreachable.
  const both = createFoundWeapons({ sources: [
    fallenCompanions(fallenWith('merc-matt', 'iron-mace', 'mace', { x: 0, z: 0 })),
    fallenCompanions(fallenWith('merc-altun', 'iron-mace', 'mace', { x: 0, z: 0 })),
  ] });
  assert.equal(both.nearest(0, 0).id, both.nearest(0, 0).id, 'the same one every time');
  assert.equal(both.take(both.nearest(0, 0).id).ok, true);
  assert.ok(both.nearest(0, 0), 'and the other is there underneath it');
});

test('a weapon with nowhere to be is not lying anywhere', () => {
  // A man who fell before anybody wrote down where, or carrying nothing.
  const nowhere = fallenWith('merc-matt', 'iron-mace', 'mace', {});
  assert.equal(createFoundWeapons({ sources: [fallenCompanions(nowhere)] }).count, 0);
  const empty = fallenWith('merc-matt', null, null, { x: 1, z: 2 });
  assert.equal(createFoundWeapons({ sources: [fallenCompanions(empty)] }).count, 0);
  // And a source that answers nonsense is ignored rather than believed.
  const rubbish = createFoundWeapons({ sources: [{ lying: () => 'not a list' }, { lying: () => [null, { id: 'x' }] }] });
  assert.equal(rubbish.count, 0);
  assert.equal(rubbish.nearest(0, 0), null);
});

test('the host draws it, marks it, and lets you take it up', () => {
  const main = source('main.js'), html = readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8');
  assert.match(main, /const foundWeapons=createFoundWeapons\(\{sources:\[fallenCompanions\(companions\)\]\}\);/,
    'the first source is the one that already exists');
  assert.match(main, /function refreshFoundWeapons\(\)\{/, 'one mesh a lying weapon');
  // Marked: a named weapon nobody can find is a weapon nobody is given.
  assert.match(main, /A weapon on the ground is \*\*marked\*\*/, 'and it is marked');
  assert.match(html, /id="found-weapon-prompt"/, 'with a prompt of its own');
  assert.match(main, /\$\('found-weapon-label'\)\.textContent=`Take up \$\{currentFoundWeapon\.name\}`/, 'that names it');
  // Taken up with F, where everything else in this game is gathered, and never mid-fight.
  assert.match(main, /if\(combat\.state\.phase!=='active'&&currentFoundWeapon&&!inventory\.has\(currentFoundWeapon\.weapon\)\)\{/, 'not in a fight and never an owned duplicate');
  assert.match(main, /inventory\.add\(offered\.weapon\)/, 'it goes into the satchel');
  assert.ok(main.indexOf('inventory.add(offered.weapon)') < main.indexOf('foundWeapons.take(offered.id)'), 'inventory accepts the item before the source is consumed');
  assert.ok(main.indexOf('foundWeapons.take(offered.id)') < main.indexOf('corpseHost.interact();return;'), 'a companion’s ground weapon remains reachable beside the body');
  assert.match(main, /else inventory\.remove\(offered\.weapon\)/, 'a changed source rolls inventory back');
  // It appears when somebody drops it and after a reload, and goes when it is taken.
  const refreshes = (main.match(/refreshFoundWeapons\(\)/g) ?? []).length;
  assert.ok(refreshes >= 4, `only ${refreshes} places keep the ground up to date`);
  assert.match(main, /rebuildCompany\(\);refreshFoundWeapons\(\);/, 'including after a reload');
});
