/**
 * The death lifecycle, end to end: the file, the muster's two counts, the Marshal's register, the
 * lie a living man pays for, and the save.
 *
 * Four things this pins were wrong when it was written, and each assertion below that names one of
 * them fails against the code as it was:
 *
 * 1. The Marshal asked after the *same* missing name for ever. The conversation re-enters itself
 *    once he has written the answer down, and `owed` was a list evaluated when the context was
 *    built - so the second name was never reached inside one conversation.
 * 2. A dead man went on mustering. The company's clock knows nothing about the dead, so
 *    `summary().mustered` counted him and the Marshal said one more stood in this camp than did.
 * 3. A reload of a save from *before* the fight brought him back alive and no longer in the file,
 *    because `companions.restore` asked a `fallen` that was still the dying session's.
 * 4. A witness whose regard was 95 to 99 paid nothing for a lie: a flat 35 off left him on the
 *    same rung, and the design says a rung.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createCompanions, RUNG_AT, REGARD } from '../src/companions.js';
import { createFallen } from '../src/bystanders.js';
import { createLivingStory } from '../src/living-story.js';
import { hostFunction } from './host-function.js';
import { createMercenaryCompany, MERCENARY_ROSTER, mercenaryById } from '../src/mercenaries.js';
import { createMorosChapter, morosConversation, musterVoices, MOROS_LEGATE_ID, MARSHAL_WRITES, marshalAsks } from '../src/moros-chapter.js';

const main = () => readFileSync(fileURLToPath(new URL('../src/main.js', import.meta.url)), 'utf8');
const ROSTER = MERCENARY_ROSTER.map(man => man.id);
const fresh = () => { const fallen = createFallen(); return { fallen, companions: createCompanions({ fallen }) }; };

// The same road fixture the company's own tests use. Nothing here is a claim about the world's
// geometry - it is a claim about phases and counts, which are a function of the clock alone.
const ROAD = [{ x: 0, z: 0 }, { x: -100, z: 0 }, { x: -100, z: 100 }, { x: -400, z: 100 }, { x: -400, z: 300 }];
const STOPS = [{ id: 'induction', point: { x: -100, z: 30 }, dwell: 90 }, { id: 'crossing', point: { x: -250, z: 104 }, dwell: 60 }];
const buildCompany = (companions, dead) => createMercenaryCompany({ road: ROAD, stops: STOPS,
  muster: { x: -400, z: 250 }, landing: { x: 3, z: 3 }, shore: { x: 40, z: -30 },
  companions: companions.length ? companions : undefined, dead });

test('the Marshal asks after each missing name in turn, in one conversation', () => {
  const { fallen, companions } = fresh();
  for (const id of ['merc-mus', 'merc-altun', 'merc-matt']) companions.ask(id, { where: id === 'merc-mus' ? 'wild' : 'road' });
  companions.died('merc-mus', { where: 'Luscia', what: 'Wolves' });
  companions.died('merc-altun', { where: 'Pueth', what: 'Goblins' });
  assert.deepEqual(companions.owed(), ['merc-altun', 'merc-mus'], 'two names are owed');

  const moros = createMorosChapter();
  moros.start(); moros.act('admit-to-camp');
  const said = [];
  let offered = [];
  // **One context object, built once**, which is how src/main.js calls it: every value in it that
  // the conversation can change has to be asked for rather than handed over.
  const context = { moros, act: () => {}, closeDialogue: () => {},
    openDialogue: (_npc, lines, _a, _b, options = {}) => { said.push(...lines); offered = options.choices ?? []; options.onComplete?.(); },
    musterCount: 1, roster: ROSTER, withYou: companions.walking,
    dead: fallen.ids.filter(id => ROSTER.includes(id)),
    owed: () => companions.owed(), answersFor: id => companions.answersFor(id),
    report: (id, kind) => companions.report(id, kind), nameOf: id => mercenaryById(id)?.name ?? id };
  const npc = { id: MOROS_LEGATE_ID };

  assert.equal(morosConversation(npc, context), true);
  assert.ok(said.includes(marshalAsks('Al the Tun')), 'he asks after the first name');
  said.length = 0;
  offered.find(choice => choice.id === 'muster-told-true').action();
  // **The second name, not the first again.** Answering changes who is owed, and the conversation
  // re-enters itself; reading a list captured before the answer asked about Al the Tun for ever.
  assert.ok(said.includes(MARSHAL_WRITES.true), 'he writes the first answer down');
  assert.ok(!said.includes(marshalAsks('Al the Tun')), 'and does not ask about a man he has just been told about');
  assert.ok(said.includes(marshalAsks('Mus')), 'he goes on to the next name');
  said.length = 0;
  offered.find(choice => choice.id === 'muster-told-silent').action();
  assert.deepEqual(companions.owed(), [], 'both are answered for');
  assert.ok(said.some(line => /sign the muster/.test(line)), 'and the muster proper follows, in the same conversation');
  assert.deepEqual([companions.told('merc-altun'), companions.told('merc-mus')], ['true', 'silent']);
});

test('the host asks the Marshal what is owed rather than handing him a list', () => {
  assert.match(main(), /owed:\(\)=>companions\.owed\(\)/, 'a question, not an answer');
});

test('a dead man has no placement, and is in neither count at the muster', () => {
  const { fallen, companions } = fresh();
  companions.ask('merc-jerry', { where: 'road' });
  companions.died('merc-jerry', { where: 'Luscia', what: 'Wolves', x: -300, z: 120 });
  const company = buildCompany(companions.companions, fallen.ids);
  const at = 4000;

  // **He is nowhere.** Struck off the walking list he would otherwise go straight back onto the
  // road schedule and muster on it, hidden, and be counted among the living in the camp.
  const places = company.placements(at);
  assert.equal(places.some(one => one.id === 'merc-jerry'), false, 'the clock has stopped for him');
  assert.equal(places.length, MERCENARY_ROSTER.length - 1, 'and the list is thinned, not renumbered');

  // Neither count: not in the camp, and not among those still to come.
  const s = company.summary(at);
  assert.equal(s.mustered, places.filter(one => one.phase === 'mustered').length);
  assert.equal(s.dead, 1);
  assert.equal(s.arrived, MERCENARY_ROSTER.length - 1 - s.coming, 'the dead did not land, as far as this is concerned');
  // Never ahead of the traveler on the road, whatever his distance was when he fell.
  const alive = buildCompany(companions.companions, []);
  assert.equal(company.travelerRank(at, 0), alive.travelerRank(at, 0) - 1, 'exactly one man fewer stands ahead of you');

  // What the Marshal says, with the count the company now gives on its own.
  const heard = musterVoices({ musterCount: s.mustered + 1, roster: ROSTER, withYou: companions.walking, dead: fallen.ids });
  assert.equal(heard.count, s.mustered + 1, 'the traveler and the living who are in');
  assert.equal(heard.expected, 10);
  assert.deepEqual(heard.missing, ['merc-jerry']);
  // The old error, kept as the measurement: the phase count had one man too many in the camp.
  assert.equal(alive.summary(at).mustered, s.mustered + 1);
});

test('nobody dead is today\u2019s clock, to the digit', () => {
  // The rule every addition to src/mercenaries.js has kept. An undefined list, an empty one and
  // rubbish in the list are all the company this game has always had.
  const today = buildCompany([], undefined);
  for (const dead of [undefined, [], null, ['', 7, {}]]) {
    const same = buildCompany([], dead);
    for (const seconds of [0, 600, 1200, 2400, 4000, 8000, 20000]) {
      assert.deepEqual(same.placements(seconds), today.placements(seconds), `${JSON.stringify(dead)} at ${seconds} s`);
      assert.deepEqual(same.summary(seconds), today.summary(seconds), `${JSON.stringify(dead)} at ${seconds} s`);
      assert.equal(same.travelerRank(seconds, 400), today.travelerRank(seconds, 400));
    }
    assert.deepEqual(same.companionIds, today.companionIds);
  }
  // And a man who is dead is out of the file as well, whatever list still names him.
  const walking = buildCompany([{ id: 'merc-gotwood', with: true }, { id: 'merc-jerry', with: true }], ['merc-jerry']);
  assert.deepEqual(walking.companionIds, ['merc-gotwood'], 'the dead do not walk with you');
  assert.equal(walking.companionId, 'merc-gotwood');
});

test('the host counts actual living loyal muster arrivals, including after reload', () => {
  const story = createLivingStory();
  const count = living => hostFunction('musteredInCamp', {
    living, company: { summary: () => ({ mustered: 99 }) }, playSeconds: 100000,
  })();
  story.tick(100000);
  assert.equal(count(story), 0, 'elapsed time cannot put anybody in camp');
  story.arriveMuster('merc-gotwood'); story.arriveMuster('merc-word'); story.arriveMuster('merc-jerry');
  assert.equal(count(story), 3);
  story.setAlive('merc-gotwood', false);
  story.chooseAllegiance('merc-word', 'coalition');
  assert.equal(count(story), 1, 'a fallen or defecting arrival is no longer an Imperial soldier');
  story.arriveMuster('merc-word', 'coalition');
  assert.equal(count(story), 1, 'Republican muster has its own register');
  assert.equal(count(createLivingStory({ saved: story.snapshot() })), 1);
  // Old review fixtures can still ask the legacy company, but live gameplay never uses it.
  assert.equal(count(null), 99);
  const source = main();
  for (const each of [/musterCount:musteredInCamp\(\)\+1/g]) assert.equal((source.match(each) ?? []).length, 2, 'both conversations use this count');
  assert.match(source, /musteredInCamp\(\)\+1<=MUSTER_EARLY/, 'and so does the first-man-in toast');
});

test('a save from before the fight brings him back to your shoulder', () => {
  const { fallen, companions } = fresh();
  companions.ask('merc-jerry', { where: 'road' });
  companions.travelled('merc-jerry', 1800);
  const before = { companions: companions.snapshot(), fallen: fallen.snapshot() };
  companions.died('merc-jerry', { where: 'Luscia', what: 'Wolves', x: -300, z: 120 });
  const after = { companions: companions.snapshot(), fallen: fallen.snapshot() };
  assert.deepEqual([before.companions.walking, before.fallen.ids], [['merc-jerry'], []]);
  assert.deepEqual([after.companions.walking, after.fallen.ids], [[], ['merc-jerry']]);

  // The order a load has to use: `companions.restore` asks `fallen` who is dead, so `fallen` must
  // already be the save's own. In the dying session's order the man came back alive and out of
  // the file - the one thing a reload of a save from before the fight must not do.
  fallen.restore(before.fallen);
  companions.restore(before.companions);
  const back = companions.view().find(man => man.id === 'merc-jerry');
  assert.deepEqual([back.dead, back.walking], [false, true], 'alive, and walking with you again');
  assert.equal(back.fell, null, 'and nothing is written down about a fall that has not happened');

  // The other way round is the dying session's order, and it is what the bug was.
  const stale = createFallen(); stale.fall('merc-jerry');
  const other = createCompanions({ fallen: stale });
  other.restore(before.companions);
  assert.equal(other.walksWith('merc-jerry'), false, 'which is why the order matters');

  // A save written after the fight keeps him dead, wherever it is loaded.
  const { fallen: f2, companions: c2 } = fresh();
  c2.ask('merc-jerry', { where: 'road' });
  f2.restore(after.fallen); c2.restore(after.companions);
  const gone = c2.view().find(man => man.id === 'merc-jerry');
  assert.deepEqual([gone.dead, gone.walking], [true, false]);
  assert.deepEqual([gone.fell.where, gone.fell.what], ['Luscia', 'Wolves']);
  assert.deepEqual(c2.weaponsOnTheGround(), [], 'he was carrying nothing anybody wrote down');
});

test('the load restores the dead before it restores the company', () => {
  const source = main();
  const deadAt = source.indexOf('fallen.restore(saved.fallen');
  const companyAt = source.indexOf('companions.restore(saved.companions');
  assert.ok(deadAt > 0 && companyAt > 0, 'both are restored');
  assert.ok(deadAt < companyAt, 'and who is dead is known before who walks with you is decided');
});

test('a lie costs every living witness a rung, wherever on it he stood', () => {
  // The band that paid nothing: 95 to 99 is `friendly`, and a flat 35 off is 60 to 64, which is
  // `friendly` still. Every one of these is a witness who was there and thought no less of you.
  for (const at of [26, 40, 59, 60, 75, 94, 95, 97, 99, 100]) {
    const { companions } = fresh();
    companions.ask('merc-mus', { where: 'wild' });
    companions.ask('merc-matt', { where: 'road' });
    // Regard is set by travelling, which is the only thing that moves it by a fraction.
    companions.travelled('merc-matt', (at - REGARD.asked) / REGARD.perMinute * 60);
    const stood = companions.rung('merc-matt');
    assert.equal(companions.regardFor('merc-matt'), at, 'the witness is where this row says');
    companions.died('merc-mus', { where: 'Luscia', what: 'Wolves' });
    assert.deepEqual(companions.fellAt('merc-mus').witnesses, ['merc-matt'], 'he was walking with you when it happened');
    companions.report('merc-mus', 'lie');
    const now = companions.rung('merc-matt');
    if (stood === 'unfamiliar') assert.equal(now, 'unfamiliar', 'there is nowhere lower to go');
    else assert.notEqual(now, stood, `a witness at ${at} (${stood}) drops a rung`);
    assert.ok(companions.regardFor('merc-matt') <= Math.max(0, at - (RUNG_AT.friendly - RUNG_AT.acquainted)),
      'and never by less than it always took');
    assert.match(companions.holdsAgainstYou('merc-matt').line, /I was there/, 'and he has one line for it');
  }
});

test('the witnesses are the men who were there, not the men at the gate', () => {
  const { companions } = fresh();
  companions.ask('merc-mus', { where: 'wild' });
  companions.ask('merc-matt', { where: 'road' });
  companions.died('merc-mus', { where: 'Luscia', what: 'Wolves' });
  // Somebody asked afterwards saw nothing, and somebody sent on before it saw it all the same.
  companions.ask('merc-altun', { where: 'road' });
  companions.sendOn('merc-matt');
  assert.deepEqual(companions.fellAt('merc-mus').witnesses, ['merc-matt']);
  const told = companions.report('merc-mus', 'lie');
  assert.deepEqual(told.knows, ['merc-matt'], 'the man who was there, and only him');
  assert.equal(companions.holdsAgainstYou('merc-altun'), null, 'a man who joined later holds nothing');
  assert.equal(companions.registerIsFalse('merc-mus'), false, 'somebody living saw it');
});

test('a weapon nobody wrote a place for is not lying at the world’s origin', () => {
  const { companions } = fresh();
  companions.ask('merc-eliana', { where: 'road', has: { edge: true } });
  companions.died('merc-eliana', { where: null, what: null, weapon: 'greatsword', weaponName: 'greatsword' });
  assert.equal(companions.weaponOnTheGround('merc-eliana'), null, 'nothing is lying at (0, 0)');
  assert.deepEqual(companions.weaponsOnTheGround(), []);
  assert.equal(companions.truthAbout('merc-eliana'), 'Dead.', 'and the plainest answer there is');
});

test('nobody can die in a fight the player is being taught alone in', () => {
  const source = main();
  // Two authored fights by name, the straw post, which is a phase of its own and has no allies
  // to lose, and a bout with a teacher, which is a fight nobody can die in at all
  // (`bout`, src/combat.js, docs/combat-brief.md phase 7).
  assert.match(source, /const TEACHING_FIGHTS=new Set\(\[GREENWAY_RAID\.id,AVREL_RAID\.id,SPARRING_ID\]\);/);
  assert.match(source, /const SPARRING_ID='sparring-bout';/, 'and the bout is one of them');
  const teaching = new Set(['greenway-test', 'avrel-test', 'sparring-bout']);
  const allies = hostFunction('companionAllies', { TEACHING_FIGHTS: teaching });
  for (const id of teaching) assert.deepEqual(allies({ id, center: { x: 0, z: 0 } }), [], `${id} admits no companions`);
  assert.deepEqual(allies({ id: 'ambush', center: { x: 0, z: 0 }, physicalCompany: true }), [], 'physical company is already in the encounter and must not be cloned');
  assert.match(source, /combat\.state\.phase==='active'&&TEACHING_FIGHTS\.has\(combat\.state\.encounterId\)/, 'and the file is held out of the box');
  // A man who is never an ally is never `ally-down`, which is the only thing that kills him.
  assert.match(source, /if\(e\.type==='ally-down'&&\(companions\.walksWith\(e\.id\)\|\|fileOrder\.includes\(e\.id\)\)\)/);
});
