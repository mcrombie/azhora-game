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
  assert.match(combat, /const TODAY = Object\.freeze\(\{ maxHp: 100, maxStamina: 100, dodgeWindow: \.37, swingCost: 6, armourTurns: 0, dodgeScale: 1,/,
    'combat still says what today is, and uses it when nobody says otherwise');
  // The shield's own two numbers are today's too, and `hasShield` is false, so a combat wired to
  // nothing has no guard at all and is exactly the game it was.
  assert.match(combat, /guardShare: \.6, guardCost: 18, hasShield: false \}\);/);
  assert.equal(margins.guardShare, ARMS.guard.low);
  assert.equal(margins.guardCost, ARMS.guardCost.low);
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
  // The Arms are the one family still opened by a teacher: banking before one had spoken would
  // level the traveler through the opening and move numbers measured against him at level 1.
  const blind = arms.dealt({ weapon: 'simple-sword', damage: 40 });
  assert.equal(blind.xp, 0, 'nothing is banked before you are shown');
  assert.equal(skills.taught('blades'), false);
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

test('each of the four ways of being paid respects both ceilings', () => {
  // `dealt` took a source from the first day; the other three did not, so the default 'fight'
  // applied and no ceiling ever reached them. Driven, dodging at a post that cannot hit back took
  // Toughness past 30.
  for (const [name, pay, id] of [
    ['dealt', (a, source) => a.dealt({ weapon: 'simple-sword', damage: 30, source }), 'blades'],
    ['dodged', (a, source) => a.dodged({ source }), 'toughness'],
    ['hurt', (a, source) => a.hurt({ damage: 20, source }), 'toughness'],
    ['caught', (a, source) => a.caught({ damage: 20, source }), 'shield'],
  ]) {
    for (const [source, ceiling] of [['post', ARMS.ceiling.post], ['sparring', ARMS.ceiling.sparring]]) {
      const skills = createSkills(), arms = createCombatSkills({ skills });
      arms.learn(id);
      for (let i = 0; i < 4000; i++) pay(arms, source);
      assert.equal(skills.level(id), ceiling, `${name} at the ${source} stops at ${ceiling}, not ${skills.level(id)}`);
      assert.equal(pay(arms, source).capped, true, `${name} says so when it is capped`);
    }
    // And a real fight has no ceiling at all.
    const skills = createSkills(), arms = createCombatSkills({ skills });
    arms.learn(id);
    for (let i = 0; i < 4000; i++) pay(arms, 'fight');
    assert.ok(skills.level(id) > ARMS.ceiling.sparring, `${name} in a fight reached ${skills.level(id)}`);
  }
});

test('the country pushes back, and level 0 is today', async () => {
  const { countryHealth, countryDamage, COUNTRY } = await import('../src/combat-skills.js');
  // The two multipliers, from docs/combat-brief.md.
  assert.equal(countryHealth(0), 1);
  assert.equal(countryDamage(0), 1);
  assert.ok(Math.abs(countryHealth(8) - (1 + .45 * 8)) < 1e-9);
  assert.ok(Math.abs(countryDamage(8) - (1 + .30 * 8)) < 1e-9);
  // An ogre's 52 becomes 177 at level 8, which is the brief's own worked example.
  assert.equal(Math.round(52 * countryDamage(8)), 177);
  // Both rise the whole way, and nonsense is level 0 rather than a bonus.
  for (let level = 1; level <= COUNTRY.top; level++) {
    assert.ok(countryHealth(level) > countryHealth(level - 1));
    assert.ok(countryDamage(level) > countryDamage(level - 1));
  }
  for (const bad of [-4, NaN, null, undefined, 'eight']) {
    assert.equal(countryHealth(bad), 1, String(bad));
    assert.equal(countryDamage(bad), 1, String(bad));
  }
  assert.equal(countryHealth(1e6), countryHealth(COUNTRY.top), 'and a level past the ladder is its top');
});

test('timing never scales, with any level of anything', () => {
  // The law that makes the whole design work: a level-8 ogre is not faster and does not
  // telegraph less, so a traveler who reads the tell can still dodge it - he simply cannot
  // afford to miss. Nothing that is a duration may be multiplied by a country level or a skill.
  const combat = source('combat.js');
  for (const timing of ['tell', 'attack', 'contact', 'recovery', 'ENEMY_TELL', 'ENEMY_ATTACK', 'ENEMY_CONTACT', 'ENEMY_RECOVERY', 'duration']) {
    const pattern = new RegExp(`${timing}\s*[*]\s*(country|damageMultiplier|margins)`, 'i');
    assert.doesNotMatch(combat, pattern, `${timing} is multiplied by something`);
  }
  // The two country multipliers are used in exactly the two places they are meant to be.
  assert.equal((combat.match(/countryHealth\(/g) ?? []).length, 1, 'health is scaled in exactly one place');
  assert.equal((combat.match(/countryDamage\(/g) ?? []).length, 2, 'damage in exactly two: the traveler, and his allies');
  assert.match(combat, /const stout = Math\.round\(hp \* countryHealth\(level\)\);/, 'health is scaled once, where the enemy is made');
});

test('the host gives a fight the level of the country it happens in', () => {
  const main = source('main.js');
  assert.match(main, /getLevel:centre=>regionLevel\(world\.regionAt\(centre\?\.x\?\?0,centre\?\.z\?\?0\)\?\.name\)\?\?0/,
    'the country under the fight, or 0 where there is none');
  assert.match(source('combat.js'), /Number\.isFinite\(asked\.level\)/, 'and an encounter authored with a level of its own keeps it');
  // The four payments, each with a truthful source.
  // The straw post pays as a post - and only when it is the post. Jerry's mark runs in the same
  // practice phase and teaches Bows where the arrow lands, so a sword at his straw banks nothing.
  assert.match(main, /if\(e\.type==='practice-hit'&&!mark\)\{arms\.learn\('blades'\);armsPaid\(arms\.dealt\(\{[^}]*source:'post'\}\)\)/, 'the straw post pays as a post');
  assert.match(main, /if\(e\.type==='hit'&&e\.damage>0&&combat\.state\.phase==='active'\)/, 'a real blow pays as a fight');
  assert.match(main, /arms\.hurt\(\{damage:e\.damage,countryLevel:e\.level\?\?0,\.\.\.sparringPay\(\)\}\)/, 'being hit pays Toughness');
  assert.match(main, /if\(e\.type==='dodged'\)\{arms\.learn\('toughness'\);/, 'and so does a step aside that worked');
  // Phase 7: the same four payments, told whether this fight is a bout. `sparringPay()` is the
  // one place that decides, so a blow struck in a lesson can never be paid as a blow struck in
  // a fight, and a blow struck in a fight can never carry a ceiling.
  assert.match(main, /const sparringPay=\(\)=>\(sparring&&combat\.state\.encounterId===SPARRING_ID\?\{source:'sparring',ceiling:sparring\.ceiling\}:\{\}\)/,
    'a bout pays as sparring, with this teacher’s own ceiling, and nothing else does');
  for (const paid of ['dealt', 'hurt', 'dodged', 'caught'])
    assert.ok(new RegExp(`arms\\.${paid}\\(\\{[^}]*\\.\\.\\.sparringPay\\(\\)\\}\\)`).test(main), `${paid} is told which kind of fight it was`);
});

test('the host reads the margins rather than writing numbers of its own', () => {
  const main = source('main.js');
  assert.match(main, /arms=createCombatSkills\(\{skills/, 'the fighting skills are built beside the rest');
  assert.match(main, /getMargins:\(\)=>\{if\(!arms\)return \{\};/, 'and combat asks them what a level is worth');
  assert.match(main, /damageScale:id=>arms\?\.margins\(\)\.damageFor\(id\)\?\?1/, 'as do the weapons');
  assert.match(source('weapons.js'), /damage: type\.damage\.map\(hit => hit \* scale\)/, 'the multiplier is on the weapon’s own damage');
  // Twenty-one in the registry (farming came with the long road), and the seven are the grouped
  // ones. Normal mode draws twenty of them: the Linguist is hard mode's (tests/game-mode.test.js).
  assert.equal(SKILL_IDS.length, 21);
  assert.equal(SKILL_IDS.filter(id => SKILLS[id].group === ARMS_HEADING).length, 7);
});
