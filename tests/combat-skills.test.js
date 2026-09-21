import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SKILLS, SKILL_IDS, RUNESCAPE_TABLE, createSkills } from '../src/skills.js';
import { SKILL_ICONS } from '../src/skill-icons.js';
import { WEAPON_TYPES, createWeapons } from '../src/weapons.js';
import {
  ARMS, ARMS_IDS, ARMS_SKILLS, ARMS_HEADING, WEAPON_FAMILY, familyOf, TOP_LEVEL,
  damageMultiplier, swingCost, maxHealth, maxWind, dodgeWindow, guardShare, guardCost, drawTime,
  marginsFor, createCombatSkills, validateCombatSkillsSnapshot,
} from '../src/combat-skills.js';

const source = name => readFileSync(fileURLToPath(new URL(`../src/${name}`, import.meta.url)), 'utf8');

test('seven families, each with a home for its weapons and somebody who teaches it', () => {
  assert.deepEqual(ARMS_IDS, ['blades', 'heavy-arms', 'polearms', 'staves', 'bows', 'shield', 'toughness']);
  for (const id of ARMS_IDS) {
    assert.ok(SKILLS[id], `${id} is a skill like any other`);
    assert.equal(SKILLS[id].group, ARMS_HEADING, `${id} sits under ${ARMS_HEADING}`);
    assert.equal(SKILLS[id].thresholds, RUNESCAPE_TABLE, `${id} climbs the world's table`);
    assert.ok(SKILLS[id].teacher && SKILLS[id].blurb, `${id} says who teaches it`);
    assert.ok(SKILL_ICONS[id], `${id} has a mark of its own`);
    assert.equal(ARMS_SKILLS[id].id, id);
  }
  // Every weapon the game has is in exactly one family, and the families invent none.
  const claimed = ARMS_IDS.flatMap(id => ARMS_SKILLS[id].weapons);
  assert.equal(new Set(claimed).size, claimed.length, 'no weapon is in two families');
  for (const weapon of Object.keys(WEAPON_TYPES)) assert.ok(familyOf(weapon), `${weapon} has a family`);
  for (const weapon of claimed) assert.ok(WEAPON_TYPES[weapon], `${weapon} is a weapon the game has`);
  assert.deepEqual(Object.keys(WEAPON_FAMILY).sort(), claimed.sort());
  // A thing nobody has claimed is nobody's, and works forever at level 1.
  assert.equal(familyOf('pawpaw'), null);
  assert.equal(marginsFor({}).damageFor('pawpaw'), 1);
});

test('every curve rises, and ends where the brief says', () => {
  const ends = [
    ['damage', damageMultiplier, ARMS.damage], ['swing', swingCost, ARMS.swing],
    ['health', maxHealth, ARMS.health], ['wind', maxWind, ARMS.wind], ['dodge', dodgeWindow, ARMS.dodge],
    ['guard', guardShare, ARMS.guard], ['guardCost', guardCost, ARMS.guardCost], ['draw', drawTime, ARMS.draw],
  ];
  for (const [name, curve, pair] of ends) {
    assert.ok(Math.abs(curve(1) - pair.low) < 1e-9, `${name} at level 1 is ${curve(1)}, not ${pair.low}`);
    assert.ok(Math.abs(curve(TOP_LEVEL) - pair.high) < 1e-9, `${name} at 99 is ${curve(TOP_LEVEL)}, not ${pair.high}`);
    // Straight, and moving the whole way: no plateau, no overshoot.
    const rising = pair.high > pair.low;
    let previous = curve(1);
    for (let level = 2; level <= TOP_LEVEL; level++) {
      const here = curve(level);
      assert.ok(rising ? here >= previous : here <= previous, `${name} turns back at level ${level}`);
      previous = here;
    }
    assert.ok(Math.abs(curve(50) - (pair.low + pair.high) / 2) < .51, `${name} is not a straight line`);
    // Nonsense is level 1, never a crash and never a bonus; a level past the top is the top.
    for (const bad of [0, -3, NaN, null, undefined, 'seven']) assert.equal(curve(bad), curve(1), `${name} of ${bad}`);
    assert.equal(curve(1e9), curve(TOP_LEVEL), `${name} past the end of the table`);
  }
  // The dodge window is forgiving, never automatic: a dodge lasts .56 s and this never reaches it.
  assert.ok(dodgeWindow(TOP_LEVEL) < .56, 'the whole dodge is never invulnerable');
});

test('level 1 is today, to the digit', () => {
  // The law the whole phase rests on. Every margin at level 1 equals the number the game used
  // before any of this existed, and those numbers are still written in src/combat.js as TODAY.
  const margins = marginsFor({});
  assert.deepEqual([margins.maxHp, margins.maxStamina, margins.dodgeWindow], [100, 100, .37]);
  assert.equal(margins.swingCostFor('simple-sword'), 6);
  assert.equal(margins.damageFor('simple-sword'), 1);
  const combat = source('combat.js');
  assert.match(combat, /const TODAY = Object\.freeze\(\{ maxHp: 100, maxStamina: 100, dodgeWindow: \.37, swingCost: 6 \}\);/,
    'combat still says what today is, and uses it when nobody says otherwise');
  assert.match(combat, /actionTime < margins\(\)\.dodgeWindow/, 'the dodge window is read, not written twice');
  assert.match(combat, /player\.stamina -= cost;/, 'and so is what a swing costs');
  // A weapon with nobody's hand on it does exactly what its own table says.
  const weapons = createWeapons({ inventory: { has: () => true, count: () => 1 } });
  assert.deepEqual(weapons.profile().damage, [...WEAPON_TYPES['simple-sword'].damage], 'the sword is the sword');
});

test('the levels buy what the table says they buy, and nothing else', () => {
  // Toughness at 99: four times the health, and a dodge a tenth of a second more forgiving.
  const top = marginsFor(Object.fromEntries(ARMS_IDS.map(id => [id, 99])));
  assert.deepEqual([top.maxHp, top.maxStamina], [400, 180]);
  assert.ok(Math.abs(top.dodgeWindow - .48) < 1e-9);
  assert.equal(top.damageFor('simple-sword'), 3);
  assert.equal(top.swingCostFor('simple-sword'), 4);
  assert.ok(Math.abs(top.guardShare - .9) < 1e-9 && Math.abs(top.guardCost - 8) < 1e-9);
  assert.ok(Math.abs(top.drawTime - .6) < 1e-9);
  // Each family climbs on its own: a swordsman is no better with a greatsword for it.
  const swordsman = marginsFor({ blades: 99 });
  assert.equal(swordsman.damageFor('simple-sword'), 3);
  assert.equal(swordsman.damageFor('greatsword'), 1, 'heavy arms is a different skill');
  assert.equal(swordsman.damageFor('long-dagger'), 3, 'and the dagger is the same one');
  assert.deepEqual([swordsman.maxHp, swordsman.dodgeWindow], [100, .37], 'blades buys no toughness');
});

test('a skill nobody has shown you banks nothing, and the weapon still works', () => {
  const heard = [];
  const skills = createSkills();
  const arms = createCombatSkills({ skills, onEvent: event => heard.push(event.type) });
  const blind = arms.dealt({ weapon: 'simple-sword', damage: 40 });
  assert.equal(blind.xp, 0, 'nothing is banked before you are shown');
  assert.equal(skills.known('blades'), false);
  // And the weapon is a weapon all the same.
  assert.equal(arms.margins().damageFor('simple-sword'), 1);
  assert.equal(arms.learn('blades').first, true);
  assert.equal(arms.learn('blades').first, false);
  assert.equal(skills.known('blades'), true);
  assert.deepEqual(heard, ['arms-learned']);
  const paid = arms.dealt({ weapon: 'simple-sword', damage: 40 });
  assert.equal(paid.id, 'blades');
  assert.equal(paid.xp, Math.round(40 * ARMS.xp.perDamage), 'damage dealt pays the weapon’s own family');
  // A killing blow pays a little extra; hard country teaches faster than goblins do.
  const killing = arms.dealt({ weapon: 'simple-sword', damage: 40, killed: true });
  assert.ok(killing.xp > paid.xp, `${killing.xp} for a killing blow against ${paid.xp}`);
  const abroad = arms.dealt({ weapon: 'simple-sword', damage: 40, countryLevel: 8 });
  assert.ok(abroad.xp > paid.xp * 2, `level-8 country pays ${abroad.xp} where Drent pays ${paid.xp}`);
  // Toughness is paid by dodging and by surviving; the shield by blows caught on it.
  arms.learn('toughness'); arms.learn('shield');
  assert.equal(arms.dodged().xp, ARMS.xp.dodged);
  assert.equal(arms.hurt({ damage: 10 }).xp, Math.round(10 * ARMS.xp.perHurt));
  assert.equal(arms.caught({ damage: 10 }).xp, Math.round(10 * ARMS.xp.perCaught));
  assert.equal(arms.hurt({ damage: 0 }).xp, 0);
  // A family with no weapon of its own yet is still a skill, and pays nothing by accident.
  assert.equal(arms.dealt({ weapon: 'pawpaw', damage: 50 }).xp, 0);
});

test('nobody reaches sixty by hitting straw', () => {
  const skills = createSkills();
  const arms = createCombatSkills({ skills });
  arms.learn('blades');
  // The post pays to level 5 and then stops, however long you stand at it.
  for (let i = 0; i < 400; i++) arms.dealt({ weapon: 'simple-sword', damage: 30, source: 'post' });
  assert.ok(skills.level('blades') >= ARMS.ceiling.post, `the post got him to ${skills.level('blades')}`);
  assert.equal(skills.level('blades'), ARMS.ceiling.post, 'and no further');
  const capped = arms.dealt({ weapon: 'simple-sword', damage: 30, source: 'post' });
  assert.deepEqual([capped.xp, capped.capped], [0, true]);
  // Sparring has a higher ceiling; a fight has none.
  for (let i = 0; i < 2000; i++) arms.dealt({ weapon: 'simple-sword', damage: 30, source: 'sparring' });
  assert.equal(skills.level('blades'), ARMS.ceiling.sparring, 'sparring stops where sparring stops');
  for (let i = 0; i < 400; i++) arms.dealt({ weapon: 'simple-sword', damage: 40 });
  assert.ok(skills.level('blades') > ARMS.ceiling.sparring, 'a real fight has no ceiling at all');
});

test('what the practice was worth survives the road, and nonsense does not', () => {
  const skills = createSkills();
  const arms = createCombatSkills({ skills });
  arms.learn('blades');
  arms.dealt({ weapon: 'simple-sword', damage: 30, source: 'post' });
  const saved = arms.snapshot();
  assert.ok(saved.practice.blades > 0, 'the straw is remembered');
  assert.equal(validateCombatSkillsSnapshot(saved), true);
  assert.equal(validateCombatSkillsSnapshot(undefined), true, 'an older save never swung at anything');
  const copy = createCombatSkills({ skills: createSkills() });
  assert.equal(copy.restore(saved), true);
  assert.deepEqual(copy.practice, saved.practice);
  for (const bad of [null, [], { ...saved, version: 2 }, { ...saved, practice: null },
    { ...saved, practice: { juggling: 5 } }, { ...saved, practice: { blades: -1 } },
    { ...saved, practice: { blades: Infinity } }])
    assert.equal(validateCombatSkillsSnapshot(bad), false, JSON.stringify(bad));
});

test('the host reads the margins rather than writing numbers of its own', () => {
  const main = source('main.js');
  assert.match(main, /arms=createCombatSkills\(\{skills/, 'the fighting skills are built beside the rest');
  assert.match(main, /getMargins:\(\)=>\{if\(!arms\)return \{\};/, 'and combat asks them what a level is worth');
  assert.match(main, /damageScale:id=>arms\?\.margins\(\)\.damageFor\(id\)\?\?1/, 'as do the weapons');
  assert.match(source('weapons.js'), /damage: type\.damage\.map\(hit => hit \* scale\)/, 'the multiplier is on the weapon’s own damage');
  // Twenty-one tiles now (farming came with the long road), and the seven are the grouped ones.
  assert.equal(SKILL_IDS.length, 21);
  assert.equal(SKILL_IDS.filter(id => SKILLS[id].group === ARMS_HEADING).length, 7);
});
