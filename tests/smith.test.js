import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SMITH_NPC, SLOT_NOUNS, pieceName, smithOffers, buyFromSmith, smithGreeting, smithConversation } from '../src/smith.js';
import { createGear, SLOTS, NAMED_TIERS, armourOf } from '../src/gear.js';
import { COPPER_ITEM, STARTING_PURSE } from '../src/economy.js';
import { SMITH_VOICES, TIER_NOTES, sellsHere, AMOD_SMITH_ID, MOROS_ARMOURER_NPC,
  AMBRON_ARMOURER_NPC, MYTH_SMITHS, SELLER_TIERS, tiersSoldBy } from '../src/smith.js';
import { tiernamed, tierSoldAt, smithStock } from '../src/gear.js';
import { regionLevel } from '../src/region-levels.js';
import { AMOD_NPCS } from '../src/amod-people.js';
import { TIDEHAVEN_SMITHY } from '../src/region-world.js';
import { AMBRON_FORGE, AMBRON_BUILDINGS, AMBRON_STREETS } from '../src/ambron.js';

const source = name => readFileSync(fileURLToPath(new URL(`../src/${name}`, import.meta.url)), 'utf8');

/** A purse and nothing else: what the smith actually touches. */
function purse(copper) {
  let held = copper;
  return {
    count: id => (id === COPPER_ITEM ? held : 0),
    has: id => id === COPPER_ITEM && held > 0,
    remove: (id, n) => (id === COPPER_ITEM && held >= n ? (held -= n, true) : false),
    add: (id, n) => { if (id === COPPER_ITEM) held += n; },
    get copper() { return held; },
  };
}

test('what a level-0 smith puts in front of you is what you landed with', () => {
  const board = smithOffers(0);
  // Arrows first, at every forge in every country: a shaft is a shaft and the tier table is
  // about armour (the user, 2026-09-21 - the smiths sell arrows and there is no fletcher).
  assert.equal(board[0].kind, 'arrows');
  assert.equal(board[0].id, 'arrow');
  assert.equal(board[0].bundle, 12);
  assert.ok(board[0].price > 0 && board[0].price < 24, 'a starting purse can buy a dozen');
  const drent = board.filter(one => one.kind === 'armour');
  assert.equal(drent.length, 3, 'a jack, a cap and a buckler');
  assert.deepEqual(drent.map(one => one.slot).sort(), [...SLOTS].sort());
  for (const item of drent) {
    assert.equal(item.tier, 0, 'Drent is level 0 and sells no better');
    assert.equal(item.weight, 'light', 'no mail in a village of this size');
    // The tier's name is the material; the shape is named where the selling happens, because
    // "light wood and bone" is a true description of a cap and a useless name for one.
    assert.ok(item.label.startsWith(SLOT_NOUNS[item.slot]), `${item.label} says what it is`);
    assert.ok(item.label.includes('wood and bone'), `${item.label} says what it is made of`);
    assert.ok(item.turnsPercent > 0 && item.turnsPercent < 50, 'and what it turns, as a share');
  }
  // Dearest last, and the cap is the one a traveler off the boat can actually afford.
  assert.deepEqual([...drent].map(one => one.price).sort((a, b) => a - b), drent.map(one => one.price));
  assert.ok(drent[0].price <= STARTING_PURSE, 'the first thing on the board is within a starting purse');
  assert.ok(drent[drent.length - 1].price > STARTING_PURSE, 'and the last is something to save for');
  // Nowhere he could ever stand sells an unnamed tier — and arrows are the same everywhere.
  for (let level = 0; level <= 11; level++)
    for (const item of smithOffers(level)) {
      if (item.kind === 'arrows') { assert.deepEqual(item, smithOffers(0)[0], 'a shaft is a shaft in any country'); continue; }
      assert.ok(item.tier <= NAMED_TIERS && tierSoldAt(level) === item.tier);
    }
});

test('buying is atomic: the money and the piece move together or not at all', () => {
  const gear = createGear();
  const cap = smithOffers(0).find(one => one.slot === 'head');
  // Too poor: nothing moves, and he is told the price and what he has.
  const poor = purse(cap.price - 1);
  const refused = buyFromSmith({ inventory: poor, gear, item: cap });
  assert.equal(refused.ok, false);
  assert.match(refused.reason, new RegExp(`${cap.price} copper`));
  assert.equal(poor.copper, cap.price - 1, 'his purse is untouched');
  assert.equal(gear.wearing('head'), null, 'and he is still bare-headed');
  // Enough: the piece goes on and the copper goes.
  const rich = purse(STARTING_PURSE);
  const bought = buyFromSmith({ inventory: rich, gear, item: cap });
  assert.equal(bought.ok, true);
  assert.equal(rich.copper, STARTING_PURSE - cap.price);
  assert.deepEqual(gear.wearing('head'), { weight: 'light', tier: 0 });
  assert.equal(bought.had, null, 'he had nothing on that place before');
  assert.equal(bought.turns, armourOf({ head: { weight: 'light', tier: 0 } }).turns, 'and it turns what it turns');
  // Buying for a place he is already wearing replaces it, and says what it replaced.
  const again = buyFromSmith({ inventory: purse(999), gear, item: cap });
  assert.deepEqual(again.had, { weight: 'light', tier: 0 }, 'he is told what came off');
  // Nothing the game does not have, however the action is spelled.
  for (const bad of [null, undefined, { slot: 'elbow', weight: 'light', tier: 0, price: 1 },
    { slot: 'body', weight: 'quilted', tier: 0, price: 1 }, { slot: 'body', weight: 'heavy', tier: 0, price: 1 },
    { slot: 'body', weight: 'light', tier: 5, price: 1 }]) {
    const wallet = purse(9999);
    assert.equal(buyFromSmith({ inventory: wallet, gear, item: bad }).ok, false, JSON.stringify(bad));
    assert.equal(wallet.copper, 9999, 'and it cost him nothing to be refused');
  }
});

test('every smith is named for a smith of myth, and out of no other register', () => {
  // The user's own naming register (2026-09-21), and the reason it is used: it takes nothing
  // from Azhora's place-name generators, which are places and not people.
  assert.equal(SMITH_NPC.name, 'Vulcan');
  assert.equal(MOROS_ARMOURER_NPC.name, 'Wayland');
  assert.equal(AMBRON_ARMOURER_NPC.name, 'Hephaestus');
  assert.equal(AMOD_NPCS.find(one => one.id === AMOD_SMITH_ID).name, 'Goibniu');
  // Every one of them, and anybody added later, comes out of the one list.
  for (const id of Object.keys(SMITH_VOICES)) {
    const shown = [SMITH_NPC, MOROS_ARMOURER_NPC, AMBRON_ARMOURER_NPC, ...AMOD_NPCS].find(one => one.id === id)?.name;
    assert.ok(shown, `${id} sells and nobody knows what name is shown over him`);
    assert.ok(MYTH_SMITHS.includes(shown), `${shown} is not in the smiths-of-myth register`);
    assert.ok(!/^The /.test(shown), `${id} is still shown as a trade rather than a name`);
  }
  // Goibniu says his own name and keeps every other word he had.
  assert.ok(SMITH_VOICES[AMOD_SMITH_ID][0].startsWith('Goibniu.'), 'he says his own name');
  assert.ok(SMITH_VOICES[AMOD_SMITH_ID][0].includes('Pruning hooks, channel knives, hinge work'), 'and nothing else of his changed');
  assert.equal(AMOD_NPCS.find(one => one.id === AMOD_SMITH_ID).id, 'ostel-smith', 'his id is untouched, so saves are');
});

test('the smith says what he is and is not', () => {
  const said = smithGreeting(0, { worn: {} }).join(' ');
  assert.ok(said.includes('wood and bone'), 'he names the material honestly');
  assert.ok(/not mail|bog iron/.test(said), 'and says what he cannot do');
  // Two lines of his own with the material named between them, and he mentions what is on you
  // only when something is.
  assert.equal(smithGreeting(0, { worn: {} }).length, 3);
  assert.equal(smithGreeting(0, { worn: { head: { weight: 'light', tier: 0 } } }).length, 4);
});

test('the scene puts a price on every line and refuses to be opened by anybody else', () => {
  const opened = [];
  const context = { level: 0, inventory: purse(20), gear: createGear(),
    openDialogue: (npc, lines, _a, _b, options) => opened.push({ npc, lines, options }), closeDialogue: () => {}, act: () => {} };
  assert.equal(smithConversation({ id: 'somebody-else' }, context), false, 'he is not every npc');
  assert.equal(smithConversation(SMITH_NPC, context), true);
  const { lines, options } = opened[0];
  assert.ok(lines.some(line => line.includes('copper')), 'he says what you are carrying');
  const buys = options.choices.filter(choice => choice.id.startsWith('smith-buy-'));
  assert.equal(buys.length, 4, 'three pieces of armour and a dozen arrows');
  assert.equal(buys[0].id, 'smith-buy-arrows', 'and the arrows are the cheapest line on it');
  for (const choice of buys) assert.match(choice.label, /\d+ copper/, 'every line carries its price');
  // With twenty copper the cap and the arrows are affordable and the jack is not, and the board says so.
  assert.equal(buys.filter(choice => choice.label.includes('cannot yet')).length, 2);
  assert.ok(options.choices.some(choice => choice.id === 'leave-smith'));
});

test('the host stands him at his forge and buys only what the table says he has', () => {
  const main = source('main.js');
  assert.match(main, /world\.npcPositions\[SMITH_NPC\.id\]=\{x:TIDEHAVEN_SMITHY\.stand\.x,z:TIDEHAVEN_SMITHY\.stand\.z\}/);
  assert.match(main, /if\(sellsHere\(npc\.id\)\)\{smithConversation\(/, 'and every smith goes through the one scene');
  // The level he sells at is the country he is standing in, not a number written beside him, so
  // the same smith in better country sells better iron without a line of his own.
  assert.match(main, /level:regionLevel\(world\.regionAt\(player\.group\.position\.x,player\.group\.position\.z\)\?\.name\)\?\?0/);
  // The action names the seller and a piece; the host rebuilds *that man's* board from the man
  // and the ground and looks the line up there, so nothing can buy what he does not have.
  assert.match(main, /const board=smithOffers\(level,\{id:seller\}\)/);
  assert.match(main, /const item=board\.find\(one=>one\.kind==='armour'&&one\.slot===slot&&one\.weight===weight&&one\.tier===Number\(tier\)\)/);
  assert.ok(!/smithStock\(/.test(main), 'the host no longer reads a board the street decides');
  // He stands off his own forge, on the side the village comes from.
  const off = Math.hypot(TIDEHAVEN_SMITHY.stand.x - TIDEHAVEN_SMITHY.x, TIDEHAVEN_SMITHY.stand.z - TIDEHAVEN_SMITHY.z);
  assert.ok(off > 2.7 && off < 3.5, `${off.toFixed(2)} m out, clear of the shelter's own posts`);
});

test('four smiths, one scene, and each sells the country he is standing in', () => {
  // Amod already had a smith - hooks and hinges and gate metal - so nobody was added there; the
  // Moros camp's smithy tent had a rack of spears "waiting on the smith" and nobody to wait for,
  // so it got one. Both countries are level 2, which is bog iron. Ambron is the fourth, and the
  // one exception to the rule (below).
  assert.deepEqual(Object.keys(SMITH_VOICES).sort(), ['ambron-armourer', 'moros-armourer', 'ostel-smith', 'tidehaven-smith']);
  assert.equal(sellsHere(AMOD_SMITH_ID), true);
  assert.equal(sellsHere(MOROS_ARMOURER_NPC.id), true);
  assert.equal(sellsHere(AMBRON_ARMOURER_NPC.id), true);
  assert.equal(sellsHere('ostel-vintner'), false, 'and nobody else in Ostel sells armour');
  assert.equal(AMOD_NPCS.some(one => one.id === AMOD_SMITH_ID), true, 'Ostel\u2019s smith was already in the world');
  assert.equal(AMOD_NPCS.some(one => one.id === MOROS_ARMOURER_NPC.id), false, 'the army\u2019s armourer is not one of Ostel\u2019s');
  // Each speaks for himself, and none of them says another's lines.
  const voices = Object.values(SMITH_VOICES).map(lines => lines.join(' '));
  assert.equal(new Set(voices).size, 4);
  assert.ok(/rolls|quartermaster|issue/i.test(SMITH_VOICES[MOROS_ARMOURER_NPC.id].join(' ')), 'the army man talks like the army');
  // But the material is nobody's line: it is generated from the level, so the same man in better
  // country tells the truth about his own iron without anybody rewriting him.
  for (const [id, level] of [['tidehaven-smith', 0], [AMOD_SMITH_ID, 2], [MOROS_ARMOURER_NPC.id, 2]]) {
    const said = smithGreeting(level, { id }).join(' ');
    const mine = TIER_NOTES[tierSoldAt(level)];
    assert.ok(said.includes(mine), `${id} names what he has`);
    for (const note of Object.values(TIER_NOTES))
      if (note !== mine) assert.ok(!said.includes(note), `${id} claims nothing else`);
  }
});

test('the Tidehaven smith\u2019s pointer up the road is true', () => {
  // He says mail wants bog iron and there is a smith with a country behind him past the Caloss.
  // That has to be true of what the player then finds, or the line has to change.
  const said = smithGreeting(0, { id: 'tidehaven-smith' }).join(' ');
  assert.ok(said.includes('past the Caloss'), 'he points up the road');
  assert.ok(said.includes('Mail wants bog iron'), 'and says what is up there');
  // Past the Caloss is Luscia, then the Moros gate and the plain; Amod is further again. Both
  // places that now sell are level 2, and level 2 sells bog iron - which is where mail begins.
  for (const country of ['Moros Plain', 'Amod']) {
    assert.equal(regionLevel(country), 2, country);
    assert.equal(tiernamed(tierSoldAt(2)), 'bog iron', `${country} sells the thing he promised`);
    assert.ok(smithOffers(2).some(one => one.weight === 'medium'), `${country} is where mail starts`);
  }
  // And his own country is not, so the pointer is not pointing at his own forge.
  assert.equal(tiernamed(tierSoldAt(regionLevel('Drent'))), 'wood and bone');
});

test('a capital is the one exception, and it is a property of the seller', () => {
  // The user, 2026-09-21: Ambron City's armourer sells wrought iron and steel both, whatever
  // level Elagos is. Elagos is an easy country and the exception does not move it.
  assert.equal(regionLevel('Elagos'), 0, 'Elagos is still level 0');
  assert.equal(tierSoldAt(0), 0, 'and level 0 still sells wood and bone');
  assert.deepEqual([...tiersSoldBy(AMBRON_ARMOURER_NPC.id, 0)], [2, 3]);
  assert.deepEqual([...tiersSoldBy(AMBRON_ARMOURER_NPC.id, 9)], [2, 3], 'and it is his, not his country’s, at any level');
  assert.equal(tiernamed(2), 'wrought iron');
  assert.equal(tiernamed(3), 'steel');
  // **The whole exception is one table**: nobody else has an entry.
  assert.deepEqual(Object.keys(SELLER_TIERS), [AMBRON_ARMOURER_NPC.id]);

  const board = smithOffers(0, { id: AMBRON_ARMOURER_NPC.id });
  const armour = board.filter(one => one.kind === 'armour');
  assert.deepEqual([...new Set(armour.map(one => one.tier))].sort(), [2, 3]);
  // Wrought iron will not carry plate (WEIGHTS.heavy is tier 3 and up) and steel will: six
  // pieces and nine, which is the gear table speaking and not a list written here.
  assert.equal(armour.filter(one => one.tier === 2).length, 6);
  assert.equal(armour.filter(one => one.tier === 3).length, 9);
  assert.equal(armour.filter(one => one.tier === 4).length, 0, 'fine steel is given, never sold');
  assert.ok(armour.every(one => one.tier <= 3), 'and nothing above it is on any board anywhere');
  // Dearest last across both grades, so the two are one board and not two lists.
  assert.deepEqual([...armour].map(one => one.price).sort((a, b) => a - b), armour.map(one => one.price));
  assert.equal(board[0].kind, 'arrows', 'and he sells arrows like every other forge');

  // **Every other board is unchanged to the digit**, for every seller at every level the game
  // has: what they are handed is exactly what the country's own stock has always been.
  for (const id of ['tidehaven-smith', AMOD_SMITH_ID, MOROS_ARMOURER_NPC.id])
    for (let level = 0; level <= 11; level++) {
      const theirs = smithOffers(level, { id }).filter(one => one.kind === 'armour');
      assert.deepEqual(theirs.map(one => [one.slot, one.weight, one.tier, one.price]),
        smithStock(level).map(one => [one.slot, one.weight, one.tier, one.price]), `${id} at level ${level}`);
    }

  // He names both grades himself, out of the generated sentence and not out of a written line.
  const said = smithGreeting(0, { id: AMBRON_ARMOURER_NPC.id }).join(' ');
  assert.ok(said.includes('wrought iron and steel'), said);
  assert.ok(said.includes('hammered and folded'), 'and says what the wrought iron is');
  assert.ok(said.includes('The Empire issues it'), 'and what the steel is');
  assert.ok(!said.includes('fine steel'), 'and does not offer what he has not got');

  // The scene is the same scene, and every line of his board carries its price.
  const opened = [];
  const context = { level: 0, inventory: purse(4000), gear: createGear(),
    openDialogue: (npc, lines, _a, _b, options) => opened.push({ npc, lines, options }), closeDialogue: () => {}, act: () => {} };
  assert.equal(smithConversation(AMBRON_ARMOURER_NPC, context), true);
  const buys = opened[0].options.choices.filter(choice => choice.id.startsWith('smith-buy-'));
  assert.equal(buys.length, 16, 'a dozen arrows and fifteen pieces');
  assert.equal(new Set(buys.map(choice => choice.id)).size, buys.length, 'and no two lines share an id');
  for (const choice of buys) assert.match(choice.label, /\d+ copper/);
  // The action carries the seller, which is what lets the host rebuild his board rather than
  // the street's - and without it a capital's steel would be refused on Elagosi ground.
  const acted = [];
  smithConversation(AMBRON_ARMOURER_NPC, { ...context, act: id => acted.push(id) });
  opened[1].options.choices.find(choice => choice.id.startsWith('smith-buy-'))?.action();
  assert.ok(acted[0].startsWith(`smith-buy:${AMBRON_ARMOURER_NPC.id}:`), acted[0]);
});

test('the capital’s armourer has a forge to stand at, measured and off everything', () => {
  const forge = AMBRON_BUILDINGS.find(entry => entry.id === 'ambron-forge');
  assert.ok(forge, 'the Strand Forge is one of the city’s buildings, so it gets the city’s collider');
  assert.equal(AMBRON_FORGE.id, forge.id);
  // He stands out in the yard on the door's own side, clear of his own walls.
  assert.equal(AMBRON_FORGE.stand.b, forge.b + forge.d / 2 + 2.4);
  assert.ok(AMBRON_FORGE.stand.b - (forge.b + forge.d / 2) >= 2, 'not inside his own shed');
  // Three metres of daylight from everything else the city draws.
  for (const other of AMBRON_BUILDINGS) {
    if (other.id === forge.id) continue;
    const gapA = Math.abs(other.a - forge.a) - (other.w + forge.w) / 2, gapB = Math.abs(other.b - forge.b) - (other.d + forge.d) / 2;
    assert.ok(Math.max(gapA, gapB) >= 3, `the forge is ${Math.max(gapA, gapB).toFixed(1)} m from ${other.id}`);
  }
  // And he is not standing in the carriageway of any of the city's streets.
  for (const street of AMBRON_STREETS) for (let i = 1; i < street.points.length; i++) {
    const p0 = street.points[i - 1], p1 = street.points[i];
    const da = p1.a - p0.a, db = p1.b - p0.b, len2 = da * da + db * db;
    const t = len2 ? Math.max(0, Math.min(1, ((AMBRON_FORGE.stand.a - p0.a) * da + (AMBRON_FORGE.stand.b - p0.b) * db) / len2)) : 0;
    const off = Math.hypot(AMBRON_FORGE.stand.a - (p0.a + da * t), AMBRON_FORGE.stand.b - (p0.b + db * t));
    assert.ok(off > street.width / 2, `he stands in ${street.id}`);
  }
  // The host places him, and there is a view of him.
  const main = source('main.js');
  assert.match(main, /world\.npcPositions\[AMBRON_ARMOURER_NPC\.id\]=\{x:AMBRON_FORGE\.stand\.x,z:AMBRON_FORGE\.stand\.z\}/);
  assert.match(main, /view==='ambron-armourer'/);
});
