import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createSkills } from '../src/skills.js';
import { createCombat } from '../src/combat.js';
import { ARMS, ARMS_IDS, createCombatSkills, marginsFor } from '../src/combat-skills.js';
import { createCompanions, RUNGS, RUNG_AT, MERCENARY_ARMS, COMPANION_IDS } from '../src/companions.js';
import { createFallen } from '../src/bystanders.js';
import { mercenaryById } from '../src/mercenaries.js';
import { WEAPON_TYPES, WEAPON_FEEL, feelOf, createWeapons } from '../src/weapons.js';
import { familyOf } from '../src/combat-skills.js';
import {
  TEACHERS, TEACHER_IDS, TEACHING, TEACHABLE, LESSON_RUNGS, LESSON_XP, LESSON_LEVEL,
  SPARRING_CEILINGS, teachesOf, teachersOf, sparringCeiling, lessonXp, handsFor,
  lendOf, lendFits, giftOf, sparsWith, createTeachers, validateTeachersSnapshot,
} from '../src/teachers.js';
import { BOW, JERRYS_BOW } from '../src/archery.js';
import { smithOffers } from '../src/smith.js';

const source = name => readFileSync(fileURLToPath(new URL(`../src/${name}`, import.meta.url)), 'utf8');

/** A traveler, his company and his arms, wired together the way src/main.js wires them. */
function company({ walking = [], regard = {} } = {}) {
  const fallen = createFallen();
  const skills = createSkills();
  const arms = createCombatSkills({ skills });
  const companions = createCompanions({ fallen });
  companions.restore({ ...createCompanions().snapshot(), walking, regard, errands: [] });
  const teachers = createTeachers({ companions, arms });
  return { fallen, skills, arms, companions, teachers };
}
/** Raise a man to a rung without caring how he got there. */
const at = rung => RUNG_AT[rung];

test('the faculty is worked out from what each man is, and Toughness has no teacher', () => {
  assert.deepEqual(TEACHER_IDS.slice().sort(), COMPANION_IDS.slice().sort(), 'all ten of them teach something');
  for (const id of TEACHER_IDS) {
    const arms = MERCENARY_ARMS[id], teacher = TEACHERS[id];
    assert.ok(TEACHABLE.includes(teacher.family), `${id} teaches something on the grid`);
    assert.notEqual(teacher.family, 'toughness', 'nobody teaches Toughness; it is taught by being hit and living');
    // He teaches the thing he is best at, out of the weapon and the shield.
    const best = Math.max(arms.level, arms.shield ?? 0);
    assert.equal(teacher.level, best, `${id} teaches at ${best}`);
    assert.equal(teacher.name, mercenaryById(id).name);
    assert.equal(teacher.lessons.length, LESSON_RUNGS.length, `${id} has one lesson a rung`);
  }
  // Kristen's shield is 35 and her blade is 25, so the shield is her craft - and it needs no exception.
  assert.equal(TEACHERS['merc-christin'].family, 'shield');
  assert.equal(TEACHERS['merc-christin'].level, MERCENARY_ARMS['merc-christin'].shield);
  assert.equal(TEACHERS['merc-mus'].family, 'polearms');
  assert.equal(TEACHERS['merc-jerry'].family, 'bows');
  assert.equal(teachesOf('nobody'), null);
  // Every family but Toughness has somebody, and the best of them is first.
  for (const family of TEACHABLE) {
    const who = teachersOf(family);
    assert.ok(who.length, `${family} has a teacher in the company`);
    for (let i = 1; i < who.length; i++) assert.ok(TEACHERS[who[i - 1]].level >= TEACHERS[who[i]].level);
  }
  assert.deepEqual(teachersOf('toughness'), []);
  assert.equal(teachersOf('polearms').length, 3, 'three of them carry a pole');
  assert.equal(teachersOf('polearms')[0], 'merc-mus', 'and Mus is the best of them');
});

test('every lesson is written in the man’s own voice, and short', () => {
  for (const id of TEACHER_IDS) {
    const said = mercenaryById(id).styleLines.join(' ');
    for (const lesson of TEACHERS[id].lessons) {
      assert.ok(lesson.offer.length > 4 && lesson.offer.length < 60, `${id}: the offer is a line, not a paragraph`);
      assert.equal(lesson.lines.length, 2, `${id}: two lines a lesson`);
      // Short. Mus's are the shortest in the game on purpose - he says almost nothing, ever.
      for (const line of lesson.lines) assert.ok(line.length > 12 && line.length < 340, `${id}: ${line.slice(0, 30)}…`);
    }
    assert.ok(TEACHERS[id].spar.offer && TEACHERS[id].spar.wrong && TEACHERS[id].spar.done, `${id} has a bout`);
    assert.ok(said.length, `${id} already had lines of his own to write from`);
  }
  // The copy says true things about how the weapons now work (src/weapons.js, phase 5).
  const all = Object.values(TEACHING).flatMap(entry => entry.lessons.flatMap(lesson => lesson.lines)).join(' ');
  assert.match(all, /strikes twice as often/, 'the staff says what its tempo is');
  assert.equal(WEAPON_TYPES.quarterstaff.tempo, .5);
  assert.match(all, /cannot be stopped once it is going/, 'the greatsword’s third swing is locked');
  assert.equal(WEAPON_TYPES.greatsword.locked, true);
  assert.match(all, /within two paces of a wall it will not go at all/, 'the pike wants its room');
  assert.equal(WEAPON_TYPES['war-pike'].room, 2);
  assert.match(all, /sixty degrees/, 'the guard is frontal only');
  assert.match(all, /a caught blow does not rock you/i, 'and a caught blow does not rock him');
});

test('a lesson is given once, at a rung, and never by the dead', () => {
  const { companions, teachers, skills, arms } = company({ walking: ['merc-gotwood'] });
  assert.equal(teachers.owed('merc-gotwood'), null, 'a stranger owes nothing');
  companions.travelled('merc-gotwood', at('acquainted') * 60 / 1.4);
  const first = teachers.owed('merc-gotwood');
  assert.equal(first.index, 0);
  assert.equal(first.rung, 'acquainted');
  assert.equal(first.family, 'blades');
  // The first lesson is what shows you the weapon: before it, nothing banks.
  assert.equal(skills.known('blades'), false);
  const given = teachers.teach('merc-gotwood');
  assert.equal(given.ok, true);
  assert.equal(given.first, true, 'the first lesson shows you the weapon');
  assert.equal(skills.known('blades'), true);
  assert.equal(given.xp, lessonXp(0, TEACHERS['merc-gotwood'].level));
  // Once each.
  assert.equal(teachers.owed('merc-gotwood'), null, 'he does not give the same lesson twice');
  assert.equal(teachers.teach('merc-gotwood').ok, false);
  const after = skills.view().find(entry => entry.id === 'blades').xp;
  assert.equal(teachers.teach('merc-gotwood').ok, false);
  assert.equal(skills.view().find(entry => entry.id === 'blades').xp, after, 'and pays nothing for the asking');
  // The next rung is the next lesson, and no further.
  companions.travelled('merc-gotwood', (at('friendly') - at('acquainted')) * 60 / 1.4);
  assert.equal(teachers.owed('merc-gotwood').index, 1);
  teachers.teach('merc-gotwood');
  assert.equal(teachers.owed('merc-gotwood'), null, 'the third waits on the third rung');
  companions.travelled('merc-gotwood', (at('fond') - at('friendly')) * 60 / 1.4);
  assert.equal(teachers.teach('merc-gotwood').index, 2);
  assert.equal(teachers.owed('merc-gotwood'), null, 'there is no fourth lesson');
  assert.equal(teachers.given('merc-gotwood'), LESSON_RUNGS.length);
  assert.ok(arms.view().find(entry => entry.id === 'blades').level > 1);

  // The dead teach nothing, ever.
  const dead = company({ walking: ['merc-eliana'], regard: { 'merc-eliana': RUNG_AT.fond } });
  assert.ok(dead.teachers.owed('merc-eliana'), 'a fond friend owes you three lessons');
  dead.companions.died('merc-eliana', { where: 'the Lauvel', what: 'Wolves' });
  assert.equal(dead.teachers.owed('merc-eliana'), null, 'a dead teacher owes nothing');
  assert.equal(dead.teachers.teach('merc-eliana').ok, false);
  assert.equal(dead.skills.known('heavy-arms'), false, 'and nothing of his was banked');
  // A man sent on ahead teaches nothing until he is back.
  const sent = company({ walking: ['merc-lakota'], regard: { 'merc-lakota': RUNG_AT.friendly } });
  assert.ok(sent.teachers.owed('merc-lakota'));
  sent.companions.sendOn('merc-lakota');
  assert.equal(sent.teachers.owed('merc-lakota'), null, 'he is up the road');
  assert.equal(sent.teachers.bout('merc-lakota', { weapon: 'quarterstaff' }).reason, 'away');
  sent.companions.ask('merc-lakota', { where: 'road', has: { birded: true } });
  assert.ok(sent.teachers.owed('merc-lakota'), 'and teaches again when he is back');
});

test('a lesson’s worth is the lesson’s, weighted by how good the man is', () => {
  for (let index = 0; index < LESSON_XP.length; index++) {
    assert.equal(lessonXp(index, LESSON_LEVEL), LESSON_XP[index], 'a man of thirty is the reference');
    assert.ok(lessonXp(index, 45) > lessonXp(index, 20), 'Mus teaches more in a sitting than Al the Tun');
  }
  for (let index = 1; index < LESSON_XP.length; index++)
    assert.ok(LESSON_XP[index] > LESSON_XP[index - 1], 'each lesson is worth more than the last');
  // Three lessons from anybody in this company are a beginning and not a shortcut.
  const skills = createSkills(), arms = createCombatSkills({ skills });
  arms.learn('polearms');
  for (let index = 0; index < LESSON_XP.length; index++) arms.pay('polearms', lessonXp(index, 45), 'lesson');
  assert.ok(skills.level('polearms') < 20, `three of the best lessons in the game reach ${skills.level('polearms')}`);
});

test('sparring pays to a ceiling, and the ceiling never passes the teacher’s own level', () => {
  // The rung's ceiling, cut down to what the man knows. Al the Tun is 20 and can never do better.
  assert.equal(SPARRING_CEILINGS[0], 0, 'a man who has shown you nothing cannot spar');
  assert.equal(SPARRING_CEILINGS[1], ARMS.ceiling.sparring, 'the first is the one src/combat-skills.js already had');
  for (let i = 1; i < SPARRING_CEILINGS.length; i++)
    assert.ok(SPARRING_CEILINGS[i] > SPARRING_CEILINGS[i - 1], 'each lesson raises it');
  for (const id of TEACHER_IDS) {
    const level = TEACHERS[id].level;
    for (let given = 0; given <= LESSON_RUNGS.length; given++)
      assert.ok(sparringCeiling(given, level) <= level, `${id} cannot teach past ${level}`);
    assert.equal(sparringCeiling(LESSON_RUNGS.length, level), Math.min(SPARRING_CEILINGS.at(-1), level));
  }
  assert.equal(sparringCeiling(3, MERCENARY_ARMS['merc-altun'].level), 20, 'Al the Tun tops out at himself');
  assert.equal(sparringCeiling(3, MERCENARY_ARMS['merc-mus'].level), 45, 'and Mus at himself');

  // And the ceiling is honoured where the experience is actually banked.
  const skills = createSkills(), arms = createCombatSkills({ skills });
  arms.learn('heavy-arms');
  for (let i = 0; i < 4000; i++) arms.dealt({ weapon: 'iron-mace', damage: 30, source: 'sparring', ceiling: 20 });
  assert.equal(skills.level('heavy-arms'), 20, 'Al the Tun’s bout stops at Al the Tun');
  for (let i = 0; i < 4000; i++) arms.dealt({ weapon: 'iron-mace', damage: 30, source: 'sparring', ceiling: 40 });
  assert.equal(skills.level('heavy-arms'), 40, 'Eliana’s goes further');
  for (let i = 0; i < 4000; i++) arms.dealt({ weapon: 'iron-mace', damage: 30 });
  assert.ok(skills.level('heavy-arms') > 40, 'and a real fight has no ceiling at all');
  // A bout with no ceiling handed in is the old flat twenty, so nothing already written moves.
  const plain = createSkills(), bare = createCombatSkills({ skills: plain });
  for (let i = 0; i < 4000; i++) bare.dodged({ source: 'sparring', ceiling: 60 });
  assert.equal(plain.known('toughness'), false, 'and a skill nobody has shown you banks nothing');
  assert.equal(plain.level('toughness'), 0);
});

test('a man will only spar in the craft he teaches, and only once he has shown it to you', () => {
  const { companions, teachers } = company({ walking: ['merc-matt'], regard: { 'merc-matt': RUNG_AT.acquainted } });
  assert.equal(teachers.bout('merc-matt', { weapon: 'war-pike' }).reason, 'untaught', 'he shows you first');
  teachers.teach('merc-matt');
  const ready = teachers.bout('merc-matt', { weapon: 'war-pike' });
  assert.equal(ready.ok, true);
  assert.equal(ready.family, 'polearms');
  assert.equal(ready.ceiling, sparringCeiling(1, TEACHERS['merc-matt'].level));
  assert.equal(ready.loan, null, 'a man carrying his own pole is lent nothing');
  // Wrong hands are not a refusal any more: he lends his spare (see the loan's own test below).
  const borrowed = teachers.bout('merc-matt', { weapon: 'simple-sword' });
  assert.equal(borrowed.ok, true);
  assert.equal(borrowed.loan.weapon, 'war-pike');
  assert.equal(teachers.bout('merc-matt', {}).ok, true, 'and empty hands get the spare too');
  assert.equal(teachers.bout('merc-cromb', { weapon: 'simple-sword' }).reason, 'away', 'and a man who is not here is not here');

  // The shield is worn, not held, so its teacher asks for the arm and not the hand.
  assert.equal(handsFor('shield', { weapon: 'simple-sword' }), false);
  assert.equal(handsFor('shield', { shield: true }), true);
  assert.equal(handsFor('blades', { weapon: 'simple-sword' }), true);
  assert.equal(handsFor('blades', { weapon: 'quarterstaff' }), false);
  assert.equal(handsFor('staves', { weapon: 'forest-stick' }), true, 'what you landed with is already a staff');
  assert.equal(handsFor('toughness', { weapon: 'simple-sword' }), false, 'nobody spars you into being tougher on purpose');
  assert.equal(handsFor('blades', { weapon: 'pawpaw' }), false);
  // Every teacher's craft can be met by something the game has, now that the bow is one of them.
  for (const id of TEACHER_IDS) {
    const family = TEACHERS[id].family;
    const meets = family === 'shield' ? handsFor(family, { shield: true })
      : Object.keys(WEAPON_TYPES).some(weapon => handsFor(family, { weapon }));
    assert.ok(meets, `${id} can be met with something the game has`);
  }
  assert.equal(handsFor('bows', { weapon: 'hunting-bow' }), true, 'the bow exists and is a Bows weapon');
});

/**
 * **Jerry will not spar, and it is not an oversight.** A bout is three paces of melee: the teacher
 * closes to a little over two metres and swings. Two men with bows at that range is not a lesson,
 * it is an accident with a queue - and blunts at a mark would be a different thing altogether, a
 * straw post with a bow, with no opponent, no exchange and nothing to yield. So he teaches by
 * lesson and by the gift, and the rest of Bows is paid for by using it on things that shoot back
 * with something else.
 */
test('one teacher will not stand up with you at all, and says why', () => {
  const { companions, teachers } = company({ walking: ['merc-jerry'], regard: { 'merc-jerry': RUNG_AT.fond } });
  assert.equal(sparsWith('merc-jerry'), false);
  for (const id of TEACHER_IDS) if (id !== 'merc-jerry') assert.equal(sparsWith(id), true, `${id} will`);
  teachers.teach('merc-jerry');
  const asked = teachers.bout('merc-jerry', { weapon: 'hunting-bow' });
  assert.equal(asked.ok, false);
  assert.equal(asked.reason, 'never', 'not "wrong hands" — never');
  assert.equal(asked.line, TEACHERS['merc-jerry'].spar.wrong);
  assert.match(asked.line, /three paces/, 'and the reason is the range');
  assert.equal(teachers.ceilingFor('merc-jerry'), 0, 'so a bout with him is worth nothing, because there is none');
  assert.equal(lendOf('merc-jerry'), null, 'and he lends nothing, because there is nothing to lend it for');
});

test('the first bow is Jerry’s spare, given with his first lesson', () => {
  assert.equal(giftOf('merc-jerry').weapon, BOW.id);
  assert.equal(giftOf('merc-jerry').name, JERRYS_BOW);
  assert.equal(giftOf('merc-jerry').at, 0, 'with the first lesson, not the last');
  assert.match(JERRYS_BOW, /^Jerry’s /, 'named the way the dead men’s weapons are named');
  for (const id of TEACHER_IDS) if (id !== 'merc-jerry') assert.equal(giftOf(id), null, `${id} gives nothing outright`);
  // It is the thing that shows him the bow at all: before it, Bows banks nothing.
  const { companions, teachers, skills, arms } = company({ walking: ['merc-jerry'], regard: { 'merc-jerry': RUNG_AT.acquainted } });
  assert.equal(skills.known('bows'), false);
  assert.equal(arms.dealt({ weapon: BOW.id, damage: 40 }).xp, 0, 'an arrow from nowhere teaches nothing');
  const first = teachers.teach('merc-jerry');
  assert.equal(first.first, true, 'and the lesson is what shows it to him');
  assert.equal(first.gives.weapon, BOW.id);
  assert.equal(skills.known('bows'), true);
  assert.ok(arms.dealt({ weapon: BOW.id, damage: 40 }).xp > 0, 'and now an arrow pays Bows');
  // Once. The second and third lessons give nothing but the lesson.
  companions.restore({ ...companions.snapshot(), regard: { 'merc-jerry': RUNG_AT.friendly } });
  assert.equal(teachers.teach('merc-jerry').gives, null, 'a man has one spare bow');
  // And nobody sells one: the smiths' boards are arrows and armour.
  for (let level = 0; level <= 11; level++)
    for (const item of smithOffers(level)) assert.notEqual(item.id, BOW.id, 'no smith sells a bow');
});

/**
 * The loan. Without it the only way to spar with a spear would be for a spearman to die first -
 * nobody who carries a pole will trade one, so the traveler's hand reaches a polearm only off the
 * ground where its owner fell, and the dead teach nothing. A teacher lends his spare instead.
 */
test('a teacher lends his spare for the bout, and it is his own craft he is lending', () => {
  for (const id of TEACHER_IDS) {
    const lent = lendOf(id), family = TEACHERS[id].family;
    if (family === 'bows') {
      assert.equal(lent, null, 'Jerry has one bow and the game has no other: nobody spars with him yet');
      assert.ok(TEACHERS[id].spar.wrong.length > 20, 'and he says why, in his own words');
      continue;
    }
    assert.ok(lent, `${id} has a spare`);
    assert.ok(lendFits(id), `${id} lends something of his own craft`);
    assert.ok(lent.hand && lent.back, `${id} says what he is handing over and asks for it back`);
    if (family === 'shield') assert.equal(lent.shield, true, 'the shield’s teacher lends a shield');
    else {
      assert.ok(WEAPON_TYPES[lent.weapon], `${lent.weapon} is a weapon the game has`);
      assert.equal(familyOf(lent.weapon), family, `${id} lends a ${family} weapon`);
      assert.equal(lent.shield, undefined);
    }
  }
  // Matt's spare pike and Mus's second spear are the two that were already in the fiction.
  assert.equal(lendOf('merc-matt').weapon, 'war-pike');
  assert.equal(lendOf('merc-mus').weapon, 'ash-spear');
  // And none of them is a named weapon: the only named weapons are the ones the dead leave.
  for (const id of TEACHER_IDS) {
    const lent = lendOf(id);
    if (lent?.weapon) assert.equal(WEAPON_TYPES[lent.weapon].name, WEAPON_TYPES[lent.weapon].name.trim());
    if (lent) assert.doesNotMatch(JSON.stringify(lent), /’s /, `${id} lends nothing with somebody’s name on it`);
  }

  // Three of the ten teach a family the traveler cannot reach on his own today, and every one of
  // them can now be sparred with all the same.
  const { companions, teachers } = company({ walking: ['merc-ciaran'], regard: { 'merc-ciaran': RUNG_AT.friendly } });
  teachers.teach('merc-ciaran');
  const withSword = teachers.bout('merc-ciaran', { weapon: 'simple-sword' });
  assert.equal(withSword.ok, true, 'a swordsman may be taught the spear');
  assert.equal(withSword.loan.weapon, 'ash-spear');
  assert.equal(withSword.loan.hand, lendOf('merc-ciaran').hand);
  assert.equal(familyOf(withSword.loan.weapon), withSword.family, 'and the bout pays the family of what is in his hand');
  // The loan is still gated on everything a bout is gated on.
  const untaught = company({ walking: ['merc-mus'], regard: { 'merc-mus': RUNG_AT.fond } });
  assert.equal(untaught.teachers.bout('merc-mus', {}).reason, 'untaught', 'he explains it before he lends it');
  untaught.teachers.teach('merc-mus');
  assert.equal(untaught.teachers.bout('merc-mus', {}).ok, true);
  untaught.companions.sendOn('merc-mus');
  assert.equal(untaught.teachers.bout('merc-mus', {}).reason, 'away', 'a man up the road lends nothing');
  untaught.companions.ask('merc-mus', { where: 'wild' });
  untaught.companions.died('merc-mus', { where: 'the wood', what: 'Wolves' });
  assert.equal(untaught.teachers.bout('merc-mus', {}).reason, 'away', 'and a dead man lends nothing, ever');

  // The shield's teacher lends a shield, and nothing else will do.
  const guard = company({ walking: ['merc-christin'], regard: { 'merc-christin': RUNG_AT.acquainted } });
  guard.teachers.teach('merc-christin');
  assert.equal(guard.teachers.bout('merc-christin', { weapon: 'simple-sword' }).loan.shield, true);
  assert.equal(guard.teachers.bout('merc-christin', { shield: true }).loan, null, 'a man with his own boards borrows none');
});

test('the loan lives inside the bout and nowhere else', () => {
  const main = source('main.js');
  // It is one closure variable with three readers, and it is in no snapshot anywhere.
  assert.match(main, /let lent=null;/, 'the loan is one variable');
  // And it is in no save: the one line that writes the checkpoint never mentions it, and the
  // teaching snapshot holds lessons and nothing else (asserted from the module's side above).
  const saveAt = main.indexOf('const result=checkpoint.save({');
  assert.ok(saveAt > 0, 'the checkpoint is still written where it was');
  const saveLine = main.slice(saveAt, main.indexOf('\n', saveAt));
  assert.ok(saveLine.includes('teachers:teachers.snapshot()'), 'the lessons given are saved');
  assert.ok(!/\blent\b/.test(saveLine), 'and nothing borrowed is');
  assert.deepEqual(Object.keys(createTeachers().snapshot()).sort(), ['lessons', 'version']);
  assert.match(main, /function lentProfile\(\)\{/, 'combat is handed a real weapon built from the table');
  assert.match(main, /const heldWeapon=\(\)=>lentProfile\(\)\?\?weapons\?\.profile\(\)\?\?null;/,
    'what is in his hand is the loan, or his own');
  assert.match(main, /getWeapon:\(\)=>heldWeapon\(\)/, 'and that is what the fight swings');
  assert.match(main, /swingCost:m\.swingCostFor\(heldWeapon\(\)\?\.id\)/, 'and what a swing costs is the loan’s family');
  assert.match(main, /hasShield:!!lent\?\.shield\|\|!!gear\.wearing\('hand'\)/, 'a lent shield is on his arm');
  assert.match(main, /const carried=!!lent\?\.shield\|\|!!gear\.wearing\('hand'\);/, 'and is drawn there');
  // Nothing about it reaches the satchel, the weapon rack or the gear.
  assert.doesNotMatch(main, /inventory\.add\(lent/, 'it is never put in the satchel');
  assert.doesNotMatch(main, /weapons\.equip\(lent/, 'it is never equipped');
  assert.doesNotMatch(main, /gear\.wear\('hand',lent/, 'and a lent shield is never worn');
  // And it dies with the bout, by every road out of one.
  assert.match(main, /function returnLoan\(\)\{/);
  assert.match(main, /if\(had\.weapon\)player\.setWeapon\(weapons\.equippedId\);/, 'his own weapon comes back');
  assert.doesNotMatch(main, /player\.setWeapon\?\./, 'plainly, never through the facade’s optional call');
  const ends = main.slice(main.indexOf('function endSpar(winner){'));
  assert.ok(ends.indexOf('returnLoan();') < ends.indexOf('if(!bout)return;'),
    'the loan goes back before anything else, and even for a bout the host has forgotten');
  assert.match(main, /if\(lent&&!\(sparring&&combat\.state\.phase==='active'&&combat\.state\.encounterId===SPARRING_ID\)\)returnLoan\(\);/,
    'and a frame in which no bout is running holds nothing borrowed');
  assert.match(main, /sparring=null;returnLoan\(\);/, 'a reload gives it back too');
});

test('a weapon carries how it feels all the way to the fight', () => {
  // Found while building the loan: `profile()` handed combat the damage and the reach and left
  // the tempo, the arc and the pike's room behind, so phase 5 was true of the module and of the
  // tests that build a weapon by hand, and of nothing the player ever held.
  const weapons = createWeapons({ inventory: { has: () => true, count: () => 1 } });
  for (const id of Object.keys(WEAPON_TYPES)) {
    weapons.equip(id);
    const held = weapons.profile(), type = WEAPON_TYPES[id];
    for (const key of WEAPON_FEEL) assert.equal(held[key], type[key], `${id} keeps its ${key}`);
  }
  weapons.equip('war-pike');
  assert.equal(weapons.profile().room, 2, 'the pike still wants its two paces in the traveler’s own hand');
  weapons.equip('quarterstaff');
  assert.equal(weapons.profile().tempo, .5, 'and the staff still strikes twice as often');
  weapons.equip('simple-sword');
  assert.equal(weapons.profile().tempo, 1, 'while the sword is still the reference');
  assert.equal(weapons.profile().room, undefined, 'and a weapon that says nothing still says nothing');
  assert.deepEqual(feelOf('pawpaw'), {}, 'a thing that is not a weapon has no feel');
});

test('the ceiling a bout pays at rises with the lessons taken, and ends with the man', () => {
  const { companions, teachers } = company({ walking: ['merc-word'] });
  assert.equal(teachers.ceilingFor('merc-word'), 0);
  for (const rung of LESSON_RUNGS) {
    companions.restore({ ...companions.snapshot(), regard: { 'merc-word': RUNG_AT[rung] } });
    teachers.teach('merc-word');
  }
  assert.equal(teachers.given('merc-word'), 3);
  assert.equal(teachers.ceilingFor('merc-word'), Math.min(SPARRING_CEILINGS[3], TEACHERS['merc-word'].level));
  companions.died('merc-word', { where: 'the Greenway', what: 'Goblins' });
  assert.equal(teachers.ceilingFor('merc-word'), 0, 'a dead man spars with nobody');
  assert.equal(teachers.bout('merc-word', { weapon: 'long-dagger' }).reason, 'away');
});

test('what a teacher has given survives the road, and nonsense does not', () => {
  const { companions, teachers } = company({ walking: ['merc-lakota'], regard: { 'merc-lakota': RUNG_AT.friendly } });
  teachers.teach('merc-lakota');
  teachers.teach('merc-lakota');
  const saved = teachers.snapshot();
  assert.deepEqual(saved.lessons, { 'merc-lakota': 2 });

  const later = createTeachers({ companions, arms: createCombatSkills({ skills: createSkills() }) });
  assert.equal(later.restore(saved), true);
  assert.equal(later.given('merc-lakota'), 2, 'a reload remembers the lessons given');
  assert.equal(later.owed('merc-lakota'), null, 'and does not offer them again');
  assert.equal(later.ceilingFor('merc-lakota'), sparringCeiling(2, TEACHERS['merc-lakota'].level));
  assert.deepEqual(later.snapshot(), saved);

  assert.equal(validateTeachersSnapshot(undefined), true, 'a save from before this is a save with no lessons');
  assert.equal(validateTeachersSnapshot(undefined, { allowMissing: false }), false);
  for (const bad of [null, [], 'lessons', { ...saved, version: 2 }, { ...saved, lessons: null }, { ...saved, lessons: [] },
    { ...saved, lessons: { 'merc-nobody': 1 } }, { ...saved, lessons: { 'merc-lakota': -1 } },
    { ...saved, lessons: { 'merc-lakota': 4 } }, { ...saved, lessons: { 'merc-lakota': 1.5 } }])
    assert.equal(validateTeachersSnapshot(bad), false, `${JSON.stringify(bad)} is not a teaching record`);
  const clean = createTeachers({ companions });
  assert.equal(clean.restore({ version: 1, lessons: { 'merc-lakota': 9 } }), false);
  assert.deepEqual(clean.snapshot().lessons, {}, 'a refused record leaves nothing behind');
});

test('level 1 with no lessons is today’s game, to the digit', () => {
  const { teachers, skills, arms } = company({ walking: [...COMPANION_IDS] });
  for (const id of TEACHER_IDS) assert.equal(teachers.owed(id), null, `${id} owes a stranger nothing`);
  for (const id of ARMS_IDS) assert.equal(skills.known(id), false, `${id} has not been shown to anybody`);
  const margins = arms.margins();
  assert.equal(margins.maxHp, 100);
  assert.equal(margins.maxStamina, 100);
  assert.equal(margins.dodgeWindow, .37);
  assert.equal(margins.swingCostFor('simple-sword'), 6);
  assert.equal(margins.damageFor('simple-sword'), 1);
  assert.equal(margins.drawTime, marginsFor({}).drawTime);
  assert.equal(margins.guardShare, marginsFor({}).guardShare);
  assert.deepEqual(teachers.snapshot(), { version: 1, lessons: {} });
});

/** A bout laid on open ground, as `sparEncounter` lays one in src/main.js. */
function bout({ hp = 60, weapon = null } = {}) {
  const world = { bounds: { minX: -100, maxX: 100, minZ: -100, maxZ: 100 }, colliders: [], heightAt: () => 1.5 };
  const position = { x: 0, y: 1.5, z: 0 };
  const events = [];
  const combat = createCombat({ world, position, onEvent: event => events.push(event),
    ...(weapon ? { getWeapon: () => weapon } : {}) });
  const stand = { x: 0, z: 3.2 }, centre = { x: 0, z: 1.6 };
  const started = combat.startEncounter({ id: 'sparring-bout', bout: true, level: 0, center: centre,
    checkpoint: { x: 0, z: 0 }, retreatAxis: 'z', retreatLine: centre.z + 24,
    enemies: [{ id: 'spar-merc-word', kind: 'sparring', name: 'Ed the Word', x: stand.x, z: stand.z, hp }] });
  assert.equal(started, true, 'the bout is a fight the module will lay');
  return { combat, position, events, over: () => events.filter(e => e.type === 'spar-over') };
}

test('a bout really does kill nobody, on either side', () => {
  // He is beaten, and he yields, and he is still there. Nothing dies and no victory is declared.
  const beaten = bout({ hp: 40 });
  for (let i = 0; i < 60 * 30 && !beaten.over().length; i++) {
    beaten.combat.attack(0);
    beaten.combat.update(1 / 60);
  }
  assert.equal(beaten.over().length, 1, 'the bout ends');
  assert.equal(beaten.over()[0].winner, 'traveler');
  assert.equal(beaten.events.some(e => e.type === 'enemy-defeated'), false, 'nobody was killed');
  assert.equal(beaten.events.some(e => e.type === 'victory'), false, 'and nothing was won');
  assert.equal(beaten.combat.state.phase, 'peaceful', 'both of them are simply standing there again');
  assert.equal(beaten.combat.state.player.hp, beaten.combat.state.player.maxHp, 'and nobody is hurt');

  // And the other way: he has the better of it, and the traveler is not killed either.
  const lost = bout({ hp: 4000 });
  for (let i = 0; i < 60 * 90 && !lost.over().length; i++) lost.combat.update(1 / 60);
  assert.equal(lost.over().length, 1, 'a bout the traveler loses still ends');
  assert.equal(lost.over()[0].winner, 'teacher');
  assert.equal(lost.events.some(e => e.type === 'defeat'), false, 'there is no defeat panel over a lesson');
  assert.ok(lost.events.filter(e => e.type === 'player-hit').length > 1, 'he was hit, more than once');
  assert.equal(lost.combat.state.phase, 'peaceful');
  assert.equal(lost.combat.state.player.hp, lost.combat.state.player.maxHp, 'and is whole at the end of it');

  // Walking out of one is not a retreat: there is nothing to catch your breath from.
  const left = bout();
  left.position.z = 60;
  left.combat.update(1 / 60);
  assert.equal(left.over()[0]?.winner, 'walked-away');
  assert.equal(left.events.some(e => e.type === 'retreat'), false, 'and nobody held the ground without you');

  // A real fight is untouched by any of it: the same enemy kind outside a bout still dies.
  const real = bout({ hp: 40 });
  const world = { bounds: { minX: -100, maxX: 100, minZ: -100, maxZ: 100 }, colliders: [], heightAt: () => 1.5 };
  const position = { x: 0, y: 1.5, z: 0 }, events = [];
  const fight = createCombat({ world, position, onEvent: event => events.push(event) });
  fight.startEncounter({ id: 'not-a-bout', level: 0, center: { x: 0, z: 1.6 }, checkpoint: { x: 0, z: 0 },
    retreatAxis: 'z', retreatLine: 25.6, enemies: [{ id: 'goblin', kind: 'goblin', x: 0, z: 3.2, hp: 40 }] });
  for (let i = 0; i < 60 * 30 && !events.some(e => e.type === 'victory'); i++) { fight.attack(0); fight.update(1 / 60); }
  assert.equal(events.some(e => e.type === 'enemy-defeated'), true, 'outside a bout, a killing blow still kills');
  assert.equal(real.combat.state.phase, 'active', 'and the bout beside it is still a bout');
});

test('a bout can kill nobody, and no victory is ever reported for one', () => {
  const combat = source('combat.js');
  assert.match(combat, /const floor = lastEncounter\.bout \? 1 : 0;/, 'health stops at one in a bout');
  assert.match(combat, /if \(lastEncounter\.bout && !enemy\.active\) \{ endBout\('traveler'\); return; \}/,
    'the man yields instead of dying, before the victory check');
  assert.match(combat, /function endBout\(winner\)/, 'and a bout has its own ending');
  assert.match(combat, /if \(lastEncounter\.bout\) endBout\('walked-away'\);/, 'walking out of one is not a retreat');
  assert.match(combat, /emit\('spar-over', \{ encounterId, winner \}\)/, 'which says who had the better of it');
  // The sparring partner's timing is a man's timing and is not softened by anything.
  assert.match(combat, /sparring: Object\.freeze\(\{ tell: \.7,/, 'his tell is as long as a soldier’s');
  // A bout is one of the fights the traveler is taught alone in.
  assert.match(source('main.js'), /TEACHING_FIGHTS=new Set\(\[GREENWAY_RAID\.id,AVREL_RAID\.id,SPARRING_ID\]\)/,
    'nobody else joins in while you are being taught');
});

test('the host asks for the bout’s ceiling and pays with it', () => {
  const main = source('main.js');
  assert.match(main, /source:'sparring',ceiling:sparring\.ceiling/, 'everything a bout pays is capped by the bout');
  // A lesson is a conversation, offered only where he is, exactly as Ed's swimming lesson is.
  assert.match(main, /const lesson=teachers\.owed\(npc\.id\);/, 'a lesson is offered in his own conversation');
  assert.match(main, /action:\(\)=>openDialogue\(npc,\[\.\.\.lesson\.lines\]/, 'in his own words');
  assert.match(main, /const given=teachers\.teach\(id\);/, 'and is given once he has said them');
  assert.match(main, /const spar=teachers\.bout\(npc\.id,travelerHands\(\)\);/, 'and a bout is offered for what he has in his hands');
  assert.match(main, /companions\.travelled\(/, 'regard moves for the road walked together');
  assert.match(main, /companions\.fought\(/, 'and for the fights come through together');
  assert.match(main, /teachers:teachers\.snapshot\(\)/, 'and the lessons given are written down');
});
