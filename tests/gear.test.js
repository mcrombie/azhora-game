import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  TIERS, TOP_TIER, NAMED_TIERS, tierScale, tiernamed, tierSoldAt, WEIGHTS, SLOTS, MOST_TURNED,
  armourOf, throughArmour, validPiece, smithStock, priceOf, createGear, validateGearSnapshot,
  gearId, TRAVEL_CLOTHES,
} from '../src/gear.js';
import { WEAPON_TYPES, createWeapons } from '../src/weapons.js';

const source = name => readFileSync(fileURLToPath(new URL(`../src/${name}`, import.meta.url)), 'utf8');

test('tier 0 with nothing on is today, to the digit', () => {
  // The law the phase rests on, from both ends: the material multiplies by one and armour turns
  // nothing, so every fight already built is untouched.
  assert.equal(tierScale(0), 1);
  assert.deepEqual(armourOf({}), { turns: 0, dodge: 1, wind: 1 });
  assert.equal(throughArmour(37, {}), 37);
  // And every weapon the game has today is tier 0: the sword is the brief's own reference.
  for (const [id, type] of Object.entries(WEAPON_TYPES))
    assert.ok(!type.tier, `${id} is tier 0 until a smith sells something better`);
  const weapons = createWeapons({ inventory: { has: () => true, count: () => 1 } });
  assert.deepEqual(weapons.profile().damage, [...WEAPON_TYPES['simple-sword'].damage], 'the sword is the sword');
  assert.match(source('combat.js'), /armourTurns: 0, dodgeScale: 1/, 'and combat still knows what today is');
});

test('the material is one line, and the top two have no names', () => {
  assert.equal(TIERS.length, 7);
  assert.equal(tierScale(TOP_TIER), 1.9);
  for (let tier = 1; tier <= TOP_TIER; tier++) assert.ok(tierScale(tier) > tierScale(tier - 1), `tier ${tier} rises`);
  for (const bad of [-3, NaN, null, undefined, 'steel']) assert.equal(tierScale(bad), 1, String(bad));
  assert.equal(tierScale(99), tierScale(TOP_TIER), 'and past the top is the top');
  // Tiers 5 and 6 are slots: nothing names them, nothing sells them, nothing may hand one over.
  assert.equal(NAMED_TIERS, 4);
  assert.equal(tiernamed(5), null);
  assert.equal(tiernamed(6), null);
  assert.equal(validPiece({ weight: 'light', tier: 5 }), false, 'nothing may be given at an unnamed tier');
  assert.equal(validPiece({ weight: 'light', tier: 5 }, { allowUnnamed: true }), true, 'though a save could hold one');
  // Nowhere sells above the named tiers, at any country level there is.
  for (let level = 0; level <= 11; level++) assert.ok(tierSoldAt(level) <= NAMED_TIERS, `level ${level}`);
  assert.equal(tierSoldAt(0), 0, 'Drent sells what you land with');
  assert.equal(tierSoldAt(1), 1, 'and bog iron a level up');
});

test('armour turns a share of a blow, and never all of one', () => {
  const most = Object.fromEntries(SLOTS.map(slot => [slot, { weight: 'heavy', tier: TOP_TIER }]));
  assert.equal(armourOf(most).turns, MOST_TURNED, 'heavy, top tier, all three pieces: half');
  assert.equal(throughArmour(50, most), 25);
  assert.ok(throughArmour(1, most) > 0, 'and a blow always costs something');
  // Each piece adds, each weight turns more than the last, and the material multiplies.
  const one = armourOf({ body: { weight: 'light', tier: 0 } });
  assert.ok(one.turns > 0 && one.turns < armourOf({ body: { weight: 'medium', tier: 1 } }).turns);
  assert.ok(armourOf({ body: { weight: 'heavy', tier: 3 } }).turns < armourOf({ body: { weight: 'heavy', tier: 4 } }).turns);
  // The dodge is the worst piece's, the water is the worst piece's, and plate is both.
  assert.equal(armourOf({ body: { weight: 'heavy', tier: 3 }, head: { weight: 'light', tier: 0 } }).dodge, WEIGHTS.heavy.dodge);
  assert.equal(armourOf({ head: { weight: 'heavy', tier: 3 } }).wind, 2, 'armour drowns people');
  assert.equal(armourOf({ head: { weight: 'medium', tier: 1 } }).wind, 1, 'mail does not');
  // Plate is not made of leather: no heavy piece below tier 3.
  assert.equal(validPiece({ weight: 'heavy', tier: 2 }), false);
  assert.equal(validPiece({ weight: 'heavy', tier: 3 }), true);
  assert.equal(validPiece({ weight: 'quilted', tier: 1 }), false, 'and there are three weights, not four');
});

test('a smith sells his own country and no better', () => {
  // Drent is level 0, so the best thing in the village is what you landed with.
  const drent = smithStock(0);
  assert.ok(drent.length > 0 && drent.every(item => item.tier === 0));
  assert.ok(drent.every(item => item.weight === 'light'), 'no mail in a level-0 village');
  // Dearest last, and a coat of plate is not a leather cap with a better tier on it.
  const rich = smithStock(5);
  assert.deepEqual([...rich].sort((a, b) => a.price - b.price).map(item => item.price), rich.map(item => item.price));
  assert.ok(priceOf('body', 3, 'heavy') > priceOf('body', 3, 'light'), 'the weight is paid for');
  assert.ok(priceOf('body', 3, 'light') > priceOf('body', 2, 'light') * 3, 'and about fourfold a tier');
  assert.ok(priceOf('head', 1, 'light') < priceOf('body', 1, 'light'), 'a cap is cheaper than a coat');
  // Nothing anywhere sells an unnamed tier, at any level.
  for (let level = 0; level <= 11; level++)
    for (const item of smithStock(level)) {
      assert.ok(item.name && !item.name.includes('null'), `level ${level} sells ${item.name}`);
      assert.ok(item.tier <= NAMED_TIERS);
      assert.ok(validPiece({ weight: item.weight, tier: item.tier }), `${item.name} is a thing the game has`);
    }
});

test('what he has on survives the road, and nonsense does not', () => {
  const gear = createGear();
  assert.equal(gear.wear('body', { weight: 'heavy', tier: 3 }).ok, true);
  assert.equal(gear.wear('head', { weight: 'light', tier: 0 }).ok, true);
  assert.equal(gear.wear('elbow', { weight: 'light', tier: 0 }).ok, false, 'there are three places, not four');
  assert.equal(gear.wear('body', { weight: 'heavy', tier: 2 }).ok, false, 'and plate is not made of leather');
  assert.ok(gear.turns > 0 && gear.windScale === 2 && gear.dodgeScale === WEIGHTS.heavy.dodge);
  const saved = gear.snapshot();
  assert.equal(validateGearSnapshot(saved), true);
  assert.equal(validateGearSnapshot(undefined), true, 'an older save wore nothing');
  const copy = createGear();
  assert.equal(copy.restore(saved), true);
  assert.deepEqual(copy.view().worn, gear.view().worn);
  assert.equal(copy.takeOff('body').ok, true);
  assert.equal(copy.takeOff('body').ok, false);
  assert.equal(copy.windScale, 1, 'and out of the plate the water is ordinary again');
  for (const bad of [null, [], { ...saved, version: 2 }, { version: 1, worn: { elbow: { weight: 'light', tier: 0 } } },
    { version: 1, worn: { body: { weight: 'quilted', tier: 1 } } }, { version: 1, worn: { body: { weight: 'heavy', tier: 1 } } }])
    assert.equal(validateGearSnapshot(bad), false, JSON.stringify(bad));
});

test('the host wears it, and the water knows', () => {
  const main = source('main.js');
  assert.match(main, /const gear=createGear\(/, 'the traveler has gear');
  assert.match(main, /armourTurns:gear\.turns,dodgeScale:gear\.dodgeScale/, 'which combat reads with the rest of the margins');
  assert.match(main, /swimStep\(\{dt:dt\*gear\.windScale/, 'and the water spends it twice as fast in plate');
  assert.match(main, /gear:gear\.snapshot\(\)/, 'it is saved with the road');
  assert.match(source('road-checkpoint.js'), /validateGearSnapshot\(data\.gear\)/, 'and the checkpoint checks it');
  assert.match(source('weapons.js'), /tierScale\(type\.tier \?\? 0\)/, 'a weapon is worth what it is made of');
});

test('replacing and removing armor retains it and the exact loadout survives a save', () => {
  const gear=createGear(),light={weight:'light',tier:0},heavy={weight:'heavy',tier:3};
  gear.wear('body',light);gear.wear('body',heavy);gear.wear('hand',light);
  assert.equal(gear.view().owned.length,3,'buying armor does not destroy the previous piece');
  assert.equal(gear.windScale,2,'heavy armor still affects swimming');
  gear.takeOff('body');
  assert.equal(gear.view().owned.length,3,'removing armor puts it back in the satchel');
  assert.equal(gear.windScale,1);
  const saved=gear.snapshot(),loaded=createGear();assert.equal(loaded.restore(saved),true);
  assert.deepEqual(loaded.snapshot(),saved,'unequipped armor persists without reappearing on the body');
  assert.equal(loaded.wearing('body'),null);
  assert.equal(loaded.equip(gearId('body',light)).ok,true,'the saved spare can be equipped again');
  assert.deepEqual(loaded.wearing('body'),light);
  assert.equal(loaded.equip('body:heavy:4').ok,false,'an inventory action cannot conjure unowned equipment');
  loaded.wear('body',light);assert.equal(loaded.view().owned.length,3,'repeated rewards do not duplicate the same armor design');
  assert.equal(loaded.view().clothing,TRAVEL_CLOTHES);
  const naked=createGear();assert.equal(naked.view().clothing.length,3);assert.equal(naked.turns,0,'the shirt, trousers and cloak are not armor');
});

test('worn-only old saves migrate ownership and malformed gear cannot wipe the live loadout', () => {
  const gear=createGear();assert.equal(gear.restore({version:1,worn:{hand:{weight:'light',tier:0}}}),true);
  const shield=gear.view().owned[0];assert.equal(shield.name,'Wooden shield');assert.equal(shield.equipped,true);
  gear.takeOff('hand');assert.equal(gear.equip(shield.id).ok,true,'an old save shield can be taken off and equipped again');
  const saved=gear.snapshot();
  for(const bad of [{...saved,owned:[]},{...saved,owned:[...saved.owned,...saved.owned]},
    {...saved,owned:[{slot:'body',tier:0,weight:'heavy'}]}, {...saved,owned:[{slot:'body',tier:0,weight:'constructor'}]}, {...saved,owned:{}},null]){
    assert.equal(validateGearSnapshot(bad,{allowMissing:false}),false);
    assert.equal(gear.restore(bad),false);assert.deepEqual(gear.snapshot(),saved);
  }
});
