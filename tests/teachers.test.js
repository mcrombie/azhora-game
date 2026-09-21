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
import { WEAPON_TYPES } from '../src/weapons.js';
import {
  TEACHERS, TEACHER_IDS, TEACHING, TEACHABLE, LESSON_RUNGS, LESSON_XP, LESSON_LEVEL,
  SPARRING_CEILINGS, teachesOf, teachersOf, sparringCeiling, lessonXp, handsFor,
  createTeachers, validateTeachersSnapshot,
} from '../src/teachers.js';

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
  const wrong = teachers.bout('merc-matt', { weapon: 'simple-sword' });
  assert.equal(wrong.ok, false);
  assert.equal(wrong.reason, 'hands');
  assert.equal(wrong.line, TEACHERS['merc-matt'].spar.wrong, 'and he says so in his own words');
  assert.equal(teachers.bout('merc-matt', {}).ok, false, 'empty hands are the wrong hands');
  assert.equal(teachers.bout('merc-cromb', { weapon: 'simple-sword' }).reason, 'away', 'and a man who is not here is not here');

  // The shield is worn, not held, so its teacher asks for the arm and not the hand.
  assert.equal(handsFor('shield', { weapon: 'simple-sword' }), false);
  assert.equal(handsFor('shield', { shield: true }), true);
  assert.equal(handsFor('blades', { weapon: 'simple-sword' }), true);
  assert.equal(handsFor('blades', { weapon: 'quarterstaff' }), false);
  assert.equal(handsFor('staves', { weapon: 'forest-stick' }), true, 'what you landed with is already a staff');
  assert.equal(handsFor('toughness', { weapon: 'simple-sword' }), false, 'nobody spars you into being tougher on purpose');
  assert.equal(handsFor('blades', { weapon: 'pawpaw' }), false);
  // Every teacher's craft can be met by something: the ten of them ask for nine real things.
  for (const id of TEACHER_IDS) {
    const family = TEACHERS[id].family;
    const meets = family === 'shield' ? handsFor(family, { shield: true })
      : Object.keys(WEAPON_TYPES).some(weapon => handsFor(family, { weapon }));
    if (family !== 'bows') assert.ok(meets, `${id} can be met with something the game has`);
    else assert.equal(meets, false, 'nobody can spar with Jerry until bows exist (phase 6)');
  }
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
