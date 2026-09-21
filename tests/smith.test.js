import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SMITH_NPC, SLOT_NOUNS, pieceName, smithOffers, buyFromSmith, smithGreeting, smithConversation } from '../src/smith.js';
import { createGear, SLOTS, NAMED_TIERS, armourOf } from '../src/gear.js';
import { COPPER_ITEM, STARTING_PURSE } from '../src/economy.js';
import { SMITH_VOICES, TIER_NOTES, sellsHere, AMOD_SMITH_ID, MOROS_ARMOURER_NPC } from '../src/smith.js';
import { tiernamed, tierSoldAt } from '../src/gear.js';
import { regionLevel } from '../src/region-levels.js';
import { AMOD_NPCS } from '../src/amod-people.js';
import { TIDEHAVEN_SMITHY } from '../src/region-world.js';

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
  const drent = smithOffers(0);
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
  // Nowhere he could ever stand sells an unnamed tier.
  for (let level = 0; level <= 11; level++)
    for (const item of smithOffers(level)) assert.ok(item.tier <= NAMED_TIERS && tierSoldAt(level) === item.tier);
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

test('the smith has no name, and says what he is and is not', () => {
  assert.equal(SMITH_NPC.name, 'The smith');
  assert.ok(!/[A-Z][a-z]+ [A-Z]/.test(SMITH_NPC.name), 'no invented person-name from a place-name register');
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
  assert.equal(buys.length, 3);
  for (const choice of buys) assert.match(choice.label, /\d+ copper/, 'every line carries its price');
  // With twenty copper the cap is affordable and the jack is not, and the board says so.
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
  // The action names a piece; the host looks it up in today's stock rather than trusting it.
  assert.match(main, /const item=smithStock\(level\)\.find\(one=>one\.slot===slot&&one\.weight===weight&&one\.tier===Number\(tier\)\)/);
  // He stands off his own forge, on the side the village comes from.
  const off = Math.hypot(TIDEHAVEN_SMITHY.stand.x - TIDEHAVEN_SMITHY.x, TIDEHAVEN_SMITHY.stand.z - TIDEHAVEN_SMITHY.z);
  assert.ok(off > 2.7 && off < 3.5, `${off.toFixed(2)} m out, clear of the shelter's own posts`);
});

test('three smiths, one scene, and each sells the country he is standing in', () => {
  // Amod already had a smith - Mern, hooks and hinges and gate metal - so nobody was added
  // there; the Moros camp's smithy tent had a rack of spears "waiting on the smith" and nobody
  // to wait for, so it got one. Both countries are level 2, which is bog iron.
  assert.deepEqual(Object.keys(SMITH_VOICES).sort(), ['moros-armourer', 'ostel-smith', 'tidehaven-smith']);
  assert.equal(sellsHere(AMOD_SMITH_ID), true);
  assert.equal(sellsHere(MOROS_ARMOURER_NPC.id), true);
  assert.equal(sellsHere('ostel-vintner'), false, 'and nobody else in Ostel sells armour');
  assert.equal(AMOD_NPCS.some(one => one.id === AMOD_SMITH_ID), true, 'Mern was already in the world');
  assert.equal(AMOD_NPCS.some(one => one.id === MOROS_ARMOURER_NPC.id), false, 'the armourer is not one of Ostel\u2019s');
  // The armourer is unnamed, as agreed; Mern keeps the name he already had.
  assert.equal(MOROS_ARMOURER_NPC.name, 'The armourer');
  // Each speaks for himself, and none of them says another's lines.
  const voices = Object.values(SMITH_VOICES).map(lines => lines.join(' '));
  assert.equal(new Set(voices).size, 3);
  assert.ok(SMITH_VOICES[AMOD_SMITH_ID][0].startsWith('Mern.'), 'Mern keeps the words he already had');
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
