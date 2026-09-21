import test from 'node:test';
import assert from 'node:assert/strict';
import { MERCENARY_ROSTER, mercenaryById, createMercenaryCompany } from '../src/mercenaries.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createFallen } from '../src/bystanders.js';
import {
  COMPANION_LIMIT, COMPANION_IDS, ASKS, GROUPS, RUNGS, RUNG_LABELS, RUNG_AT, REGARD,
  rungFor, rungLabel, createCompanions, validateCompanionsSnapshot, MERCENARY_ARMS, armsOf,
} from '../src/companions.js';

const fresh = () => {
  const fallen = createFallen();
  const heard = [];
  return { fallen, heard, companions: createCompanions({ fallen, onEvent: e => heard.push(e) }) };
};

test('everyone on the roster can be asked, each somewhere of his own', () => {
  assert.equal(COMPANION_IDS.length, MERCENARY_ROSTER.length, 'all ten, and nobody invented');
  for (const id of COMPANION_IDS) {
    const ask = ASKS[id];
    assert.ok(ask, `${id} can be asked`);
    assert.ok(['landing', 'shore', 'road', 'wild'].includes(ask.where), `${id} is asked somewhere real`);
    assert.ok(ask.yes && ask.yes.length > 12, `${id} says yes in his own words`);
    if (ask.needs) assert.ok(ask.no, `${id} says why not, when the answer is not yet`);
    assert.ok(mercenaryById(id), `${id} is a man on the roster`);
  }
  // The one the sea put down is asked on his strand; the one who left the road, in the country.
  assert.equal(ASKS['merc-word'].where, 'shore');
  assert.equal(ASKS['merc-mus'].where, 'wild');
  assert.equal(ASKS['merc-gotwood'].automatic, true, 'the companion the long road already gives you');
  // The three who came together are a group, and are the only one.
  assert.deepEqual(Object.keys(GROUPS), ['riders']);
  assert.deepEqual(GROUPS.riders.sort(), ['merc-christin', 'merc-ciaran', 'merc-jerry']);
  for (const id of GROUPS.riders) assert.equal(mercenaryById(id).group, 'riders', `${id} really did ride in with them`);
});

test('the rungs are the four this game already uses, and nothing in between', () => {
  assert.deepEqual(RUNGS, ['unfamiliar', 'acquainted', 'friendly', 'fond']);
  // The same words as src/rena-letters.js, so one standing is one idea.
  assert.deepEqual(RUNG_LABELS, { unfamiliar: 'A stranger', acquainted: 'Acquaintance', friendly: 'Glad to see you', fond: 'Fond of you' });
  assert.equal(rungFor(0), 'unfamiliar');
  assert.equal(rungFor(RUNG_AT.acquainted - 1), 'unfamiliar');
  assert.equal(rungFor(RUNG_AT.acquainted), 'acquainted');
  assert.equal(rungFor(RUNG_AT.friendly), 'friendly');
  assert.equal(rungFor(RUNG_AT.fond), 'fond');
  assert.equal(rungFor(REGARD.top), 'fond');
  assert.equal(rungLabel(RUNG_AT.friendly), 'Glad to see you');
  for (const bad of [NaN, null, undefined, 'fond', -20]) assert.equal(rungFor(bad), 'unfamiliar', String(bad));
  // Three rungs above a stranger: one lesson each, which is what combat's phase 7 needs.
  assert.equal(RUNGS.filter(rung => RUNG_AT[rung] > 0).length, 3);
});

test('as many as will come, and no number anywhere says otherwise', () => {
  // The user's ruling. The traveler may reach the muster with most of the company behind him;
  // the scarcity is that each says yes only for his own reason at his own moment.
  assert.equal(COMPANION_LIMIT, COMPANION_IDS.length, 'the only limit is that there are only ten of them');
  const { companions } = fresh();
  const everybody = [
    ['merc-word', { where: 'shore' }],
    ['merc-mus', { where: 'wild' }],
    ['merc-jerry', { where: 'road' }],
    ['merc-ciaran', { where: 'road' }],
    ['merc-christin', { where: 'road', has: { charted: true } }],
    ['merc-lakota', { where: 'road', has: { birded: true } }],
    ['merc-eliana', { where: 'road', has: { edge: true } }],
    ['merc-matt', { where: 'road' }],
    ['merc-altun', { where: 'road' }],
    ['merc-gotwood', { where: 'landing' }],
  ];
  for (const [id, where] of everybody) assert.equal(companions.ask(id, where).ok, true, `${id} comes`);
  assert.equal(companions.walking.length, COMPANION_IDS.length, 'the whole company walks with you');
  // The three who rode in together can all come, and so can both of the last pair.
  for (const id of GROUPS.riders) assert.ok(companions.walksWith(id), `${id} came`);
  assert.ok(companions.walksWith('merc-matt') && companions.walksWith('merc-altun'));
  // Nobody is ever refused for being a crowd.
  assert.equal(companions.askable('merc-word', { where: 'shore' }).reason, 'already');
  assert.equal(companions.sendOn('merc-word').ok, true);
  assert.equal(companions.sendOn('merc-word').ok, false, 'nobody is sent on twice');
  assert.equal(companions.ask('merc-word', { where: 'shore' }).ok, true, 'and may be asked again');
});

test('each says yes for his own reason, and no for his own reason', () => {
  const { companions } = fresh();
  // Being in the wrong country is not a refusal, it is simply not the moment.
  assert.equal(companions.askable('merc-word', { where: 'road' }).reason, 'elsewhere');
  assert.equal(companions.askable('merc-mus', { where: 'road' }).reason, 'elsewhere');
  // Kristen will not leave the other two for somebody who does not know the road - which is the
  // argument the three of them are already having.
  const cold = companions.askable('merc-christin', { where: 'road', has: {} });
  assert.deepEqual([cold.ok, cold.reason, cold.needs], [false, 'needs', 'charted']);
  assert.match(cold.line, /not leaving those two/);
  assert.equal(companions.askable('merc-christin', { where: 'road', has: { charted: true } }).ok, true);
  // Ciarán goes with whoever is going, which is no condition at all.
  assert.equal(ASKS['merc-ciaran'].needs, null);
  assert.equal(companions.askable('merc-ciaran', { where: 'road' }).ok, true);
  // Lakota wants you to have looked at something; Eliana wants an edge to swap for.
  assert.equal(companions.askable('merc-lakota', { where: 'road' }).needs, 'birded');
  assert.equal(companions.askable('merc-eliana', { where: 'road' }).needs, 'edge');
  assert.equal(companions.askable('merc-eliana', { where: 'road', has: { edge: true } }).ok, true);
  assert.equal(companions.askable('nobody-at-all', { where: 'road' }).reason, 'nobody');
});

test('what moves a rung, and what does not', () => {
  const { companions, heard } = fresh();
  companions.ask('merc-ciaran', { where: 'road' });
  const after = companions.regardFor('merc-ciaran');
  assert.equal(after, REGARD.asked, 'coming with you is the first thing that ever happens');
  // The slow honest one: minutes actually walked.
  companions.travelled('merc-ciaran', 600);
  assert.equal(companions.regardFor('merc-ciaran'), Math.round(REGARD.asked + 10 * REGARD.perMinute));
  // Fights, a little more when he bled and lived; a weapon traded; his own errand, once.
  const plain = companions.regardFor('merc-ciaran');
  companions.fought('merc-ciaran');
  assert.equal(companions.regardFor('merc-ciaran'), plain + REGARD.fought);
  companions.fought('merc-ciaran', { bled: true });
  assert.equal(companions.regardFor('merc-ciaran'), plain + REGARD.fought * 2 + REGARD.bled);
  companions.traded('merc-ciaran');
  assert.equal(companions.errand('merc-ciaran').ok, true);
  assert.equal(companions.errand('merc-ciaran').ok, false, 'an errand is done once');
  // Nothing rises above the top, and a rung is announced when it is crossed.
  for (let i = 0; i < 200; i++) companions.travelled('merc-ciaran', 600);
  assert.equal(companions.regardFor('merc-ciaran'), REGARD.top);
  assert.equal(companions.rung('merc-ciaran'), 'fond');
  assert.deepEqual(heard.filter(e => e.type === 'rung').map(e => e.rung), ['acquainted', 'friendly', 'fond']);
  // A man who is not walking with you can still think better of you, but nobody unknown can.
  assert.equal(companions.travelled('nobody', 600).ok, false);
  assert.equal(companions.fought('merc-mus').ok, true);
});

test('death is permanent, and the muster is not given a dead man to greet', () => {
  const { companions, fallen, heard } = fresh({ mustered: true });
  companions.ask('merc-word', { where: 'shore' });
  companions.ask('merc-mus', { where: 'wild' });
  assert.equal(companions.living().length, COMPANION_IDS.length);
  assert.equal(companions.died('merc-word').ok, true);
  // He stops walking with you the moment it happens, and he is in the save's own list of the gone.
  assert.deepEqual(companions.walking, ['merc-mus']);
  assert.equal(fallen.has('merc-word'), true, 'the dead go where the world already keeps its dead');
  assert.deepEqual(fallen.snapshot().ids, ['merc-word'], 'and the save gains no section of its own');
  // The roster the muster is handed has no room in it for him.
  assert.equal(companions.living().length, COMPANION_IDS.length - 1);
  assert.ok(!companions.living().includes('merc-word'));
  // He cannot be asked, cannot be paid, and cannot die twice.
  assert.equal(companions.askable('merc-word', { where: 'shore' }).reason, 'dead');
  assert.equal(companions.fought('merc-word').ok, false);
  assert.equal(companions.died('merc-word').ok, false);
  assert.deepEqual(heard.filter(e => e.type === 'died').map(e => e.name), ['Ed the Word']);
});

test('who walks with you survives the road, and the dead do not walk out of an old save', () => {
  const { companions, fallen } = fresh({ mustered: true });
  companions.ask('merc-word', { where: 'shore' });
  companions.ask('merc-ciaran', { where: 'road' });
  companions.travelled('merc-ciaran', 900);
  companions.errand('merc-word');
  const saved = companions.snapshot();
  assert.equal(validateCompanionsSnapshot(saved), true);
  assert.equal(validateCompanionsSnapshot(undefined), true, 'an older save never asked anybody');
  const later = createCompanions({ fallen, mustered: () => true });
  assert.equal(later.restore(saved), true);
  assert.deepEqual(later.walking, ['merc-word', 'merc-ciaran']);
  assert.equal(later.rung('merc-ciaran'), companions.rung('merc-ciaran'));
  assert.equal(later.errand('merc-word').ok, false, 'and an errand already done stays done');
  // A save written before he died, loaded after: he does not come back to your shoulder.
  fallen.fall('merc-word');
  const after = createCompanions({ fallen, mustered: () => true });
  assert.equal(after.restore(saved), true);
  assert.deepEqual(after.walking, ['merc-ciaran'], 'the dead do not walk');
  // Three walking with you is now perfectly ordinary; more than the company is still nonsense.
  assert.equal(validateCompanionsSnapshot({ ...saved, walking: ['merc-word', 'merc-mus', 'merc-matt'] }), true,
    'as many as will come');
  for (const bad of [null, [], { ...saved, version: 2 }, { ...saved, walking: ['nobody'] },
    { ...saved, walking: ['merc-word', 'merc-word'] },
    { ...saved, walking: [...COMPANION_IDS, 'merc-word'] },
    { ...saved, regard: { nobody: 10 } }, { ...saved, regard: { 'merc-mus': -1 } },
    { ...saved, regard: { 'merc-mus': 1e9 } }, { ...saved, errands: ['nobody'] }])
    assert.equal(validateCompanionsSnapshot(bad), false, JSON.stringify(bad));
});

test('a country scales its dangers and never your side', async () => {
  // The user's ruling, 2026-09-21. Phase 2 scaled the blows that land on an ally but not the ally
  // - `countryHealth` was applied only in the enemies loop - so an ally was a flat 90 anywhere.
  // A companion's health and damage now come from his *own* levels, through the same `ARMS`
  // curves as the traveler's, because he is as good as he is wherever he is standing.
  const { createCombat } = await import('../src/combat.js');
  const { maxHealth, damageMultiplier, countryHealth } = await import('../src/combat-skills.js');
  const world = { heightAt: () => 0, colliders: [], bounds: { minX: -500, maxX: 500, minZ: -500, maxZ: 500 } };
  const fight = (level, allies) => {
    const position = { x: 0, z: 0, y: 0 };
    const combat = createCombat({ world, position, getWeapon: () => ({ id: 'simple-sword', damage: [24, 26, 34], reachMultiplier: 1, usable: true }) });
    combat.startEncounter({ id: 'trial', level, center: { x: 0, z: 0 }, checkpoint: { x: 0, z: -8 }, retreatLine: 20,
      enemies: [{ id: 'foe', x: 0, z: 6, hp: 75 }], allies });
    return combat.state;
  };
  // A companion at level 1 is exactly today's ally: a legionary's ninety, in any country.
  for (const level of [0, 2, 8]) {
    const state = fight(level, [{ id: 'friend', kind: 'legionary', x: -2, z: 2 }]);
    assert.equal(state.allies[0].maxHp, 90, `a level-1 legionary in level-${level} country`);
  }
  // And the enemy in the same fight does grow with the country, so the sweep is not measuring
  // a scale that is broken everywhere.
  assert.equal(fight(8, []).enemies[0].maxHp ?? fight(8, []).enemies[0].hp, Math.round(75 * countryHealth(8)));
  // A companion carries his own Toughness, and it is the traveler's own curve.
  for (const toughness of [17, 30, 40]) {
    const state = fight(2, [{ id: 'friend', kind: 'legionary', x: -2, z: 2, toughness }]);
    assert.equal(state.allies[0].maxHp, Math.round(maxHealth(toughness)), `toughness ${toughness}`);
  }
  assert.equal(fight(0, [{ id: 'f', kind: 'legionary', x: -2, z: 2, toughness: 40 }]).allies[0].maxHp,
    fight(9, [{ id: 'f', kind: 'legionary', x: -2, z: 2, toughness: 40 }]).allies[0].maxHp,
    'no ally’s health depends on the country he is standing in');
  // Mus at 45, Toughness 40, is about the 225 the ruling describes.
  const mus = armsOf('merc-mus');
  assert.deepEqual([mus.weapon, mus.level], ['polearms', 45]);
  assert.ok(Math.round(maxHealth(mus.toughness)) > 215 && Math.round(maxHealth(mus.toughness)) < 240,
    `${Math.round(maxHealth(mus.toughness))} health, wherever he is standing`);
  assert.ok(damageMultiplier(mus.level) > 1.8, 'and nearly double damage');
  // Everyone on the roster has numbers, each a little tougher than nothing and each with a family.
  for (const id of COMPANION_IDS) {
    const arms = armsOf(id);
    assert.ok(arms, `${id} is worth something in a fight`);
    assert.ok(arms.level >= 20 && arms.level <= 60, `${id} is between 20 and 60, as the brief says`);
    // Toughness a little under the weapon, for everybody but Kristen: she carries the shield and
    // stands in front of people who need it, so she is the one of them built to be hit.
    if (id === 'merc-christin') {
      assert.ok(arms.toughness > arms.level, 'Kristen is tougher than her blade, which is the whole of her');
      assert.ok(arms.shield > arms.level, 'and her shield is better than either');
    } else {
      assert.ok(arms.toughness < arms.level, `${id}'s Toughness is a little under his weapon`);
      assert.ok(arms.toughness > arms.level - 10, `${id}'s Toughness is a little under it, not far under`);
    }
  }
  // The blows that land on them still take the country's level: that half was right already.
  const combatSource = readFileSync(fileURLToPath(new URL('../src/combat.js', import.meta.url)), 'utf8');
  assert.match(combatSource, /function hurtAlly[\s\S]{0,260}countryDamage/, 'a blow on an ally is the country’s');
  assert.doesNotMatch(combatSource, /function makeAlly[\s\S]{0,400}countryHealth/, 'but the ally himself is not');
});

test('each is asked where he is, and the three gates are real ones', () => {
  const main = readFileSync(fileURLToPath(new URL('../src/main.js', import.meta.url)), 'utf8');
  // The ground a man is standing on, in the module's own words. `null` is "not now", not "no".
  assert.match(main, /function whereHeIs\(npc\)\{/, 'the host can say what ground it is on');
  assert.match(main, /if\(route==='wild'\)return phase==='walking'\?'wild':null;/, 'Mus only in the country');
  assert.match(main, /if\(route==='shore'\)return phase==='landing'\?'shore':null;/, 'Ed only on his strand');
  assert.match(main, /if\(phase==='walking'\|\|phase==='stopped'\)return 'road';/, 'the rest on the road');
  assert.match(main, /return null;\}/, 'and a mustered man is not recruited: the finding is the game');
  // The three things a man may want first, each the plainest reading of his own line.
  assert.match(main, /function whatHeHas\(\)\{/, 'and what it can vouch for');
  assert.match(main, /charted:!!here&&cartography\.state\(here\)==='explored'/, 'Kristen wants the road known');
  assert.match(main, /birded:birding\.seenCount\(\)>0/, 'Lakota wants you to have looked at one');
  assert.match(main, /edge:!!edge\?\.usable&&Object\.values\(KIT_WEAPON_ITEM\)\.includes\(edge\.id\)/, 'Eliana wants an edge');
  // And the asking itself: offered where he is, his refusal in his own words, nothing at all
  // where he is somewhere else - rather than a greyed-out line.
  assert.match(main, /function askingChoice\(npc\)\{/, 'one choice, and it is his');
  assert.match(main, /if\(!may\.ok&&may\.reason!=='needs'\)return null;/, 'nothing at all where he is elsewhere');
  assert.match(main, /label:'Walk with me\.'/, 'in the player’s own words');
  assert.match(main, /id:'merc-send-on',label:'Go on ahead of me\.'/, 'and he can be sent on again');
  assert.match(main, /const asking=askingChoice\(npc\);[\s\S]{0,80}choices\.unshift\(asking\)/, 'above the rest, because it is why you came over');
});

test('Kristen’s gate is not one that opens itself', async () => {
  // Drent is charted from the first morning (STARTING_CHART), so "charted" would have been a
  // condition the traveler meets before he has walked anywhere. Explored is the real reading of
  // "you know the road and we do not": he has walked the country's own hexes.
  const { createCartography } = await import('../src/cartography.js');
  const chart = createCartography();
  assert.equal(chart.state('Drent'), 'charted', 'he lands with Drent charted');
  assert.notEqual(chart.state('Drent'), 'explored', 'and not with it explored');
  // The module's side of the same gate.
  const { companions } = fresh();
  assert.equal(companions.askable('merc-christin', { where: 'road', has: { charted: false } }).reason, 'needs');
  assert.equal(companions.askable('merc-christin', { where: 'road', has: { charted: true } }).ok, true);
});

test('the Marshal asks before anything else, through the conversation', async () => {
  const { morosConversation, MOROS_LEGATE_ID, MARSHAL_WRITES, marshalAsks } = await import('../src/moros-chapter.js');
  const { createMorosChapter } = await import('../src/moros-chapter.js');
  const { companions } = fresh();
  const roster = MERCENARY_ROSTER.map(man => man.id);
  companions.ask('merc-mus', { where: 'wild' });
  companions.ask('merc-altun', { where: 'road' });
  companions.died('merc-mus', { where: 'Luscia', what: 'Wolves' });
  const moros = createMorosChapter();
  moros.start();
  moros.act('admit-to-camp');
  assert.equal(moros.view().stage, 'report-to-legate', 'he is in front of the Marshal');
  // The conversation, driven: what was said, and what was offered.
  const said = [];
  let offered = [];
  const context = () => ({ moros, act: () => {}, closeDialogue: () => {},
    openDialogue: (npc, lines, _a, _b, options = {}) => { said.push(...lines); offered = options.choices ?? []; options.onComplete?.(); },
    musterCount: 1, roster, withYou: companions.walking,
    dead: roster.filter(id => !companions.living().includes(id)),
    owed: companions.owed(), answersFor: id => companions.answersFor(id),
    report: (id, kind) => companions.report(id, kind), nameOf: id => mercenaryById(id)?.name ?? id });
  const npc = { id: MOROS_LEGATE_ID };
  assert.equal(morosConversation(npc, context()), true, 'the Marshal speaks');
  // Before anything else: the count he actually has, and the name.
  // He gives the count he actually has - the full muster's "I was promised eleven" is one of its
  // faces, and this camp is two men - and then asks after the man who is not here.
  assert.ok(said.some(line => /stand in this camp/.test(line)), 'he says what the gate counted');
  assert.ok(said.includes(marshalAsks('Mus')), 'and asks after the man who is not here');
  assert.ok(!said.some(line => /sign the muster|draw your first wage/.test(line)),
    'and nothing of the muster proper until the register is straight');
  // Three answers, and the true one built from the record.
  assert.deepEqual(offered.map(choice => choice.id), ['muster-told-true', 'muster-told-silent', 'muster-told-lie']);
  assert.equal(offered[0].label, 'At Luscia. Wolves.');
  // Telling him writes it down, does not argue, and moves on to the muster proper.
  said.length = 0;
  offered.find(choice => choice.id === 'muster-told-lie').action();
  assert.ok(said.includes(MARSHAL_WRITES.lie), 'he writes it without arguing');
  assert.equal(companions.told('merc-mus'), 'lie');
  assert.deepEqual(companions.owed(), [], 'and he is asked about a man once');
  // Asked again, with nothing owed, the muster's own business happens as it always did.
  said.length = 0;
  assert.equal(morosConversation(npc, context()), true);
  assert.ok(said.some(line => /sign the muster/.test(line)), 'the muster proper, undisturbed');
});

test('the man who saw it says so once, and not in front of the Marshal', () => {
  const main = readFileSync(fileURLToPath(new URL('../src/main.js', import.meta.url)), 'utf8');
  // The design says "by their own fire". There is no camp fire at the muster - the game's only
  // fire pits are Drent's village and its pond - so it is said the next time you speak to him,
  // alone, which is the same privacy and an existing hook rather than an invented camp.
  assert.match(main, /const holds=companions\.holdsAgainstYou\(npc\.id\);/, 'he has it in mind when you speak to him');
  assert.match(main, /companions\.letGo\(npc\.id\);/, 'and having said it, he lets it go');
  assert.match(main, /camp fire at the muster/, 'and the reason is written down where it was decided');
  // Never the Marshal: he is not one of the company and holds nothing.
  assert.match(main, /if\(holds\)\{[\s\S]{0,200}openDialogue\(npc,\[holds\.line\]/, 'it is his own line and nothing else');
});

test('a dead man\u2019s weapon lies where he fell, named, until it is taken', () => {
  const { companions } = fresh();
  companions.ask('merc-eliana', { where: 'road', has: { edge: true } });
  assert.deepEqual(companions.weaponsOnTheGround(), [], 'nothing is lying anywhere yet');
  companions.died('merc-eliana', { where: 'Luscia', what: 'Wolves', x: -600, z: 140,
    weapon: 'greatsword', weaponName: 'greatsword' });
  const lying = companions.weaponOnTheGround('merc-eliana');
  // The only named weapons in the game, as the combat brief says a given weapon should be.
  assert.equal(lying.name, 'Eliana\u2019s greatsword');
  assert.deepEqual([lying.weapon, lying.x, lying.z], ['greatsword', -600, 140]);
  assert.deepEqual(companions.weaponsOnTheGround().map(one => one.id), ['merc-eliana']);
  // Picked up once, and then it is not lying there any more.
  assert.equal(companions.takeWeapon('merc-eliana').ok, true);
  assert.equal(companions.weaponOnTheGround('merc-eliana'), null);
  assert.equal(companions.takeWeapon('merc-eliana').ok, false);
  assert.deepEqual(companions.weaponsOnTheGround(), []);
  // A man who fell carrying nothing leaves nothing; a living man leaves nothing either.
  const { companions: other } = fresh();
  other.ask('merc-matt', { where: 'road' });
  other.died('merc-matt', { where: 'Pueth', what: 'Goblins', x: 1, z: 2 });
  assert.equal(other.weaponOnTheGround('merc-matt'), null, 'nothing was written down as his');
  assert.equal(other.weaponOnTheGround('merc-mus'), null, 'and he is alive');
});

test('the muster sees the people standing in front of it', async () => {
  // `summary().mustered` counts the phase `mustered`, and a companion's phase is `with-traveler`
  // wherever he is - so nine men at the traveler's shoulder counted as none. The camp gave him
  // the early face: eleven pegs "and nobody on them", with ten of the eleven standing in front of
  // it. Once men can die the same count waits forever for somebody who is never coming.
  const { musterVoices, MUSTER_ARRIVED_WITH, MUSTER_FULL } = await import('../src/moros-chapter.js');
  const roster = MERCENARY_ROSTER.map(man => man.id);
  // Alone: the early face, which was always right.
  const alone = musterVoices({ musterCount: 1, roster });
  assert.deepEqual([alone.count, alone.early, alone.full], [1, true, false]);
  // The whole company at your shoulder: eleven, and the face for it.
  const all = musterVoices({ musterCount: 1, roster, withYou: roster });
  assert.deepEqual([all.count, all.full, all.early], [MUSTER_FULL, true, false]);
  assert.match(all.marshal, /That is eleven, and eleven is what I was promised/);
  assert.equal(all.company.length, roster.length, 'and every one of them says something');
  assert.ok(all.company.every(man => man.withYou), 'all of them came in with you');
  // Two dead and the rest in: as whole as it is ever going to be, and he says so.
  const dead = ['merc-mus', 'merc-altun'];
  const short = musterVoices({ musterCount: 1, roster, withYou: roster.filter(id => !dead.includes(id)), dead });
  assert.deepEqual([short.count, short.expected, short.full], [9, 9, true]);
  assert.match(short.marshal, /^Nine\. I was promised eleven\./, 'he does not pretend the count is right');
  assert.match(short.marshal, /you will tell me about the ones who are not here/);
  assert.deepEqual(short.missing, dead);
  assert.equal(short.company.length, 8, 'the dead are not greeted');
  for (const id of dead) assert.ok(!short.company.some(man => man.id === id), `${id} says nothing`);
  // A mix: some in camp, some with you, one dead, and nobody counted twice.
  const mixed = musterVoices({ musterCount: 5, roster, withYou: ['merc-mus', 'merc-word'], dead: ['merc-jerry'] });
  assert.deepEqual([mixed.count, mixed.expected, mixed.full], [7, 10, false]);
  // The third table: a companion arrives *with* you, which neither other table can say.
  assert.equal(Object.keys(MUSTER_ARRIVED_WITH).length, roster.length, 'a line for each of them');
  for (const id of roster) assert.ok(MUSTER_ARRIVED_WITH[id]?.length > 10, `${id} has something to say on arriving`);
  assert.equal(all.company.find(man => man.id === 'merc-mus').line, 'You will not mention where you found me.');
  // And a man already in camp still greets you from where he has been standing.
  const someWaiting = musterVoices({ musterCount: MUSTER_FULL, roster, withYou: [] });
  assert.ok(someWaiting.company.every(man => !man.withYou), 'nobody came in with you');
});

test('the Marshal asks what happened, and what you say is remembered', () => {
  const { companions } = fresh();
  companions.ask('merc-mus', { where: 'wild' });
  companions.ask('merc-altun', { where: 'road' });
  companions.ask('merc-matt', { where: 'road' });
  companions.travelled('merc-altun', 4000);
  companions.travelled('merc-matt', 4000);
  const before = companions.rung('merc-altun');
  companions.died('merc-mus', { where: 'Luscia', what: 'Wolves' });
  // He asks after each missing name in turn, and the true answer is built from the record rather
  // than invented now.
  assert.deepEqual(companions.owed(), ['merc-mus']);
  assert.equal(companions.truthAbout('merc-mus'), 'At Luscia. Wolves.');
  const answers = companions.answersFor('merc-mus');
  assert.deepEqual(answers.map(answer => answer.kind), ['true', 'silent', 'lie']);
  assert.equal(answers[1].label, 'Dead.');
  assert.match(answers[2].label, /took his pay and went home/);
  // A lie is known for one by everyone who was walking with you when it happened.
  const told = companions.report('merc-mus', 'lie');
  assert.deepEqual([...told.knows].sort(), ['merc-altun', 'merc-matt']);
  assert.equal(told.register, false, 'somebody living saw it, so the register is not the lie');
  assert.notEqual(companions.rung('merc-altun'), before, 'and each of them thinks less of you');
  assert.match(companions.holdsAgainstYou('merc-altun').line, /I was there/);
  assert.equal(companions.holdsAgainstYou('merc-matt').about, 'merc-mus');
  assert.equal(companions.letGo('merc-altun').ok, true, 'he says it once');
  assert.equal(companions.holdsAgainstYou('merc-altun'), null);
  assert.equal(companions.report('merc-mus', 'lie').ok, false, 'and he is asked about a man once');
  assert.deepEqual(companions.owed(), [], 'the Marshal has his answer');
});

test('a lie nobody living saw is a lie that stands', () => {
  const { companions } = fresh();
  companions.ask('merc-mus', { where: 'wild' });
  companions.ask('merc-altun', { where: 'road' });
  companions.died('merc-mus', { where: 'Luscia', what: 'Wolves' });
  assert.deepEqual(companions.fellAt('merc-mus').witnesses, ['merc-altun'], 'one man saw it');
  // The last witness dies before you are asked.
  companions.died('merc-altun', { where: 'the Moros Plain', what: 'The border battle' });
  const told = companions.report('merc-mus', 'lie');
  assert.deepEqual(told.knows, [], 'nobody living saw it');
  assert.equal(told.register, true, 'so the register says something false');
  assert.equal(companions.registerIsFalse('merc-mus'), true);
  // Truth and silence cost nothing, and neither makes the register false.
  companions.report('merc-altun', 'true');
  assert.equal(companions.registerIsFalse('merc-altun'), false);
  assert.equal(companions.told('merc-altun'), 'true');
  // A man who never died is not asked about, and cannot be lied about.
  assert.equal(companions.report('merc-matt', 'lie').ok, false);
});

test('what you told him comes back off the road', () => {
  const { companions, fallen } = fresh();
  companions.ask('merc-mus', { where: 'wild' });
  companions.ask('merc-matt', { where: 'road' });
  companions.died('merc-mus', { where: 'Luscia', what: 'Wolves' });
  companions.report('merc-mus', 'lie');
  const saved = companions.snapshot();
  assert.equal(validateCompanionsSnapshot(saved), true);
  const later = createCompanions({ fallen });
  assert.equal(later.restore(saved), true);
  assert.equal(later.told('merc-mus'), 'lie');
  assert.equal(later.holdsAgainstYou('merc-matt')?.about, 'merc-mus', 'and he has not forgotten');
  assert.deepEqual(later.owed(), [], 'nor has the Marshal forgotten being told');
  for (const bad of [{ ...saved, told: { 'merc-mus': 'maybe' } }, { ...saved, told: { nobody: 'true' } },
    { ...saved, knows: { 'merc-matt': 'nobody' } }, { ...saved, knows: [] }])
    assert.equal(validateCompanionsSnapshot(bad), false, JSON.stringify(bad));
  const { told, knows, ...older } = saved;
  assert.equal(validateCompanionsSnapshot(older), true, 'a save from before anybody was asked');
});

test('the journal says where each man is, and names the dead as dead', () => {
  const main = readFileSync(fileURLToPath(new URL('../src/main.js', import.meta.url)), 'utf8');
  const html = readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8');
  assert.match(html, /id="journal-company"/, 'the company has a page');
  assert.match(html, /id="company-list"/, 'with a line a man');
  assert.match(main, /function refreshCompanyPage\(\)\{/, 'which is filled from the module');
  // A companion is wherever the traveler is, which no phase can say, so it is asked first.
  assert.match(main, /if\(companions\.walksWith\(id\)\)return 'Walking with you';/, 'walking with you comes before any phase');
  assert.match(main, /if\(fallen\.has\(id\)\)return null;/, 'and the dead are not anywhere');
  assert.match(main, /He will not be at the muster/, 'the dead are named as dead, not quietly missing');
  assert.match(main, /refreshCompanyPage\(\);/, 'and it is refreshed with the rest of the journal');
});

test('a man who falls is remembered where he fell, and it survives the road', () => {
  const { companions, fallen } = fresh();
  companions.ask('merc-eliana', { where: 'road', has: { edge: true } });
  const gone = companions.died('merc-eliana', { where: 'Luscia', what: 'Wolves', x: -600, z: 140 });
  assert.equal(gone.ok, true);
  // `witnesses` is who else was walking with you when it happened, which a lie is measured
  // against later. Nobody else was, here.
  assert.deepEqual(companions.fellAt('merc-eliana'), { where: 'Luscia', what: 'Wolves', witnesses: [], x: -600, z: 140 });
  assert.equal(companions.fellAt('merc-mus'), null, 'a living man fell nowhere');
  // The page and the Marshal both read it, so it has to come back off the road.
  const saved = companions.snapshot();
  assert.equal(validateCompanionsSnapshot(saved), true);
  const later = createCompanions({ fallen });
  assert.equal(later.restore(saved), true);
  assert.deepEqual(later.fellAt('merc-eliana'), { where: 'Luscia', what: 'Wolves', witnesses: [], x: -600, z: 140 });
  assert.equal(later.view().find(man => man.id === 'merc-eliana').fell.where, 'Luscia');
  // An older save has nobody fallen, and that is not nonsense.
  const { fell, ...withoutFell } = saved;
  assert.equal(validateCompanionsSnapshot(withoutFell), true, 'a save from before anybody died');
  for (const bad of [{ ...saved, fell: [] }, { ...saved, fell: { nobody: { where: 'Luscia' } } },
    { ...saved, fell: { 'merc-mus': { where: 7 } } }])
    assert.equal(validateCompanionsSnapshot(bad), false, JSON.stringify(bad));
  // And the host tells it what killed him, in the fight's own plainest word.
  const main = readFileSync(fileURLToPath(new URL('../src/main.js', import.meta.url)), 'utf8');
  assert.match(main, /companions\.died\(e\.id,\{where,what:enemyWordFor\(combat\.state\.encounterId\),x:e\.x,z:e\.z,/, 'who, where and against what');
  assert.match(main, /weapon:held\?\.id\?\?null,weaponName:/, 'and what he was carrying, which is left lying there');
  assert.match(main, /if\(encounterId===LUSCIA_WOLVES\.id\)return 'Wolves';/, 'and the words are the fight’s own');
});

test('the people walking with you are in the fight, at their own numbers', async () => {
  // The gap this closes: step 2 built the arithmetic of a companion in a fight - his health from
  // his own Toughness, his damage from his weapon's family - and nothing ever put one in a fight.
  const { createCombat } = await import('../src/combat.js');
  const { maxHealth } = await import('../src/combat-skills.js');
  const world = { heightAt: () => 0, colliders: [], bounds: { minX: -500, maxX: 500, minZ: -500, maxZ: 500 } };
  const arena = { id: 'somewhere', center: { x: 0, z: 0 }, checkpoint: { x: 0, z: -9 }, retreatLine: 20,
    enemies: [{ id: 'foe', x: 0, z: 6, hp: 75 }] };
  const friends = ['merc-mus', 'merc-altun'].map((id, index) => ({
    id, name: id, kind: 'legionary', level: armsOf(id).level, toughness: armsOf(id).toughness,
    z: -5 - index * 3, x: (index < 5 ? -1 : 1) * 2.5 }));
  const combat = createCombat({ world, position: { x: 0, z: -8, y: 0 },
    getWeapon: () => ({ id: 'simple-sword', damage: [24, 26, 34], reachMultiplier: 1, usable: true }),
    getAllies: config => (config.id === 'a-lesson' ? [] : friends) });
  assert.equal(combat.startEncounter(arena), true);
  assert.deepEqual(combat.state.allies.map(a => a.id), ['merc-mus', 'merc-altun'], 'they are in it');
  // Each at his own numbers, and not at a legionary's ninety.
  for (const ally of combat.state.allies)
    assert.equal(ally.maxHp, Math.round(maxHealth(armsOf(ally.id).toughness)), `${ally.id} is as tough as he is`);
  assert.notEqual(combat.state.allies[0].maxHp, 90, 'a companion is a person, not a kind');
  // A fight the player is taught alone in gets none of them.
  combat.resetEncounter({});
  const alone = createCombat({ world, position: { x: 0, z: -8, y: 0 },
    getWeapon: () => ({ id: 'simple-sword', damage: [24, 26, 34], reachMultiplier: 1, usable: true }),
    getAllies: config => (config.id === 'a-lesson' ? [] : friends) });
  assert.equal(alone.startEncounter({ ...arena, id: 'a-lesson' }), true);
  assert.deepEqual(alone.state.allies, [], 'he is taught alone');
  // And they are added to what the fight already authored, never in place of it.
  const withSide = createCombat({ world, position: { x: 0, z: -8, y: 0 },
    getWeapon: () => ({ id: 'simple-sword', damage: [24, 26, 34], reachMultiplier: 1, usable: true }),
    getAllies: () => friends });
  assert.equal(withSide.startEncounter({ ...arena, allies: [{ id: 'line-soldier', kind: 'legionary', x: 3, z: -5 }] }), true);
  assert.deepEqual(withSide.state.allies.map(a => a.id), ['line-soldier', 'merc-mus', 'merc-altun'],
    'the side’s own soldiers keep their places and the company stands with them');
});

test('the three fights the player is taught alone in are a list, not a place', () => {
  const main = readFileSync(fileURLToPath(new URL('../src/main.js', import.meta.url)), 'utf8');
  assert.match(main, /const TEACHING_FIGHTS=new Set\(\[GREENWAY_RAID\.id,AVREL_RAID\.id\]\);/, 'named fights');
  // The hold used to fire on any fight at all, which came from the long road keeping Chris out of
  // the tutorial raid. A company that stands beside the box and watches is the opposite of what
  // was asked for.
  assert.match(main, /const fight=combat\.state\.phase==='active'&&TEACHING_FIGHTS\.has\(combat\.state\.encounterId\)\?combat\.state\.center:null;/,
    'and only they hold a companion out');
  assert.match(main, /getAllies:config=>companionAllies\(config\)/, 'everywhere else they are in it');
  assert.match(main, /if\(!config\?\.center\|\|TEACHING_FIGHTS\.has\(config\.id\)\)return \[\];/, 'from one place');
  assert.match(main, /if\(!merc\|\|!arms\|\|fallen\.has\(id\)\)return null;/, 'and a dead man is in no fight');
  // Losing one is unmistakable: who, where, and that it is final.
  assert.match(main, /if\(e\.type==='ally-down'&&companions\.walksWith\(e\.id\)\)\{/, 'a companion who goes down');
  assert.match(main, /companions\.died\(e\.id,\{where,/, 'is gone for good, and it is remembered where');
  assert.match(main, /IS DEAD`,name:`\$\{name\} fell in \$\{where\}`/, 'and the game says who and where');
  assert.match(main, /Nobody in this company comes back/, 'and that it is final');
});

test('a hold is each man staying where he is, and the fallback is not one stone', async () => {
  const { escortSpotFor, ESCORT_OFFSETS } = await import('../src/mercenaries.js');
  const main = readFileSync(fileURLToPath(new URL('../src/main.js', import.meta.url)), 'utf8');
  // The hold was one closure variable, and `placeCompanion` runs once per companion per frame:
  // the first man through set it from his own feet and the other nine were handed a copy. Ten
  // solid men shoving at one point, for the whole of any fight and everywhere in Pueth and
  // Peblos. A hold is a man staying where he is, which is one place per man.
  assert.match(main, /const companionHold=new Map\(\);/, 'a place per man');
  assert.match(main, /if\(!companionHold\.has\(npc\.id\)\)companionHold\.set\(npc\.id,\{x:pos\.x,z:pos\.z\}\);/, 'set from his own feet');
  assert.match(main, /companionHold\.delete\(npc\.id\);/, 'and let go when he is walking again');
  assert.doesNotMatch(main, /companionHold=\{x:pos\.x,z:pos\.z\}/, 'and never one shared point');
  // The fallback walked a fixed list and returned the first standable offset, so every man who
  // fell back got the same answer - two of ten onto one stone in Lumber Town square.
  const at = { x: 0, z: 0, yaw: 0 };
  const everywhere = () => true;
  const spots = Array.from({ length: ESCORT_OFFSETS.length }, (_, place) => escortSpotFor(at, everywhere, place));
  const seen = new Set(spots.map(spot => `${spot.x.toFixed(3)},${spot.z.toFixed(3)}`));
  assert.equal(seen.size, ESCORT_OFFSETS.length, 'each place in the file is offered a different spot first');
  // It still answers the old way for the man at the front, and still gives up honestly.
  assert.deepEqual(escortSpotFor(at, everywhere), escortSpotFor(at, everywhere, 0), 'place 0 is what it always was');
  assert.equal(escortSpotFor(at, () => false, 3), null, 'nowhere is still nowhere');
  assert.ok(escortSpotFor(at, everywhere, 99), 'and a place past the end of the list wraps rather than throwing');
  assert.match(main, /escortSpotFor\(\{x:p\.x,z:p\.z,yaw\},stands,Math\.max\(0,place\)\)/,
    'and the host tells it which man is asking');
  // `stands` is the one footing test that man needs — his own feet, or his horse's, and never
  // the other's, so the fallback can no more put a rider on unridable ground than the file can.
  assert.match(main, /stands=\(sx,sz\)=>canStand\(sx,sz,world,seat\?RIDE\.radius:undefined\)/);
});

test('they walk in a file, one of them speaks, and none of them is ever a peg', () => {
  const main = readFileSync(fileURLToPath(new URL('../src/main.js', import.meta.url)), 'utf8');
  // A file: the first where Chris has always been, the rest a stride behind him each, alternating
  // shoulders - and closing to the centreline where the shoulders have nowhere to be.
  assert.match(main, /function fileSpot\(p,yaw,place,mounted=false\)\{/, 'the file has a shape of its own');
  // One shape, measured in whatever the file is made of: a man's stride on foot, a horse's
  // length in the saddle (RIDE_FILE, src/company-horses.js).
  assert.match(main, /const reach=mounted\?RIDE_FILE:COMPANION_REACH,radius=mounted\?RIDE\.radius:undefined;/, 'men or horses');
  assert.match(main, /const back=reach\.shoulder\+place\*reach\.stride;/, 'a stride apart');
  assert.match(main, /const side=reach\.side\*\(place%2\?-1:1\);/, 'and alternating shoulders');
  assert.match(main, /if\(canStand\(shoulder\.x,shoulder\.z,world,radius\)\)return shoulder;[\s\S]{0,180}return middle;/,
    'narrow ground closes the file to single, by asking the ground rather than by a list of places');
  assert.match(main, /placeCompanion\(npc,placement,fileOrder\.indexOf\(npc\.id\)\)/, 'and each man knows his place in it');
  // One voice per event.
  assert.match(main, /function oneVoice\(has\)\{/, 'one of them speaks');
  assert.match(main, /for\(const id of fileOrder\)\{const said=has\(id\);if\(said\)return \{id,said\};\}/,
    'the first in the file who has something to say says it, and the rest hold their peace');
  // The stand-in: everybody walking with you is drawn in full, not only the man at the front.
  assert.match(main, /npc\.walkingWith=true;/, 'walking with you is a flag of its own');
  assert.match(main, /escorting:!!npc\.escorting\|\|!!npc\.walkingWith,/, 'and it counts for the stand-in');
  assert.match(main, /npc\.walkingWith=false;/, 'and is cleared the moment he is not');
  // A dead man is never placed.
  assert.match(main, /npc\.hidden=placement\.phase==='coming'\|\|fallen\.has\(placement\.id\);/, 'nor is a dead one');
  // The host hands the company the whole set, and empty is spelled as nothing.
  assert.match(main, /companions:companionPlan\(\)/, 'the company takes the set');
  assert.match(main, /return all\.length\?all:undefined;/, 'and empty is today’s clock, spelled as nothing');
});

test('the companion it hands the company is the one the long road already takes', () => {
  // The whole point of the design: this is not a second system. What `createMercenaryCompany`
  // wants is `{ id, with: true }`, and undefined when nobody walks with you - which is today's
  // clock, exactly, and is pinned by the company's own snapshot test.
  const { companions } = fresh();
  assert.deepEqual(companions.companions, [], 'nobody asked is nobody walking');
  companions.ask('merc-word', { where: 'shore' });
  companions.ask('merc-mus', { where: 'wild' });
  assert.deepEqual(companions.companions, [{ id: 'merc-word', with: true }, { id: 'merc-mus', with: true }]);
  const road = [{ x: 0, z: 0 }, { x: -100, z: 0 }, { x: -400, z: 0 }];
  const walking = createMercenaryCompany({ road, muster: road[2], landing: { x: 3, z: 3 }, companions: companions.companions });
  assert.deepEqual([...walking.companionIds].sort(), ['merc-mus', 'merc-word'], 'both of them');
  for (const id of ['merc-word', 'merc-mus'])
    assert.equal(walking.placements(600).find(p => p.id === id).phase, 'with-traveler', id);
  assert.equal(walking.summary(600)['with-traveler'], 2, 'and the summary counts them');
  // The long road's own spelling still works, and is a list of one.
  const one = createMercenaryCompany({ road, muster: road[2], landing: { x: 3, z: 3 }, companion: { id: 'merc-gotwood', with: true } });
  assert.equal(one.companionId, 'merc-gotwood');
  assert.deepEqual(one.companionIds, ['merc-gotwood']);
  // And the empty set is today's clock, exactly - the property the whole design rests on.
  companions.sendOn('merc-word'); companions.sendOn('merc-mus');
  const alone = createMercenaryCompany({ road, muster: road[2], landing: { x: 3, z: 3 }, companions: companions.companions });
  assert.deepEqual([alone.companionId, alone.companionIds], [null, []]);
  const untouched = createMercenaryCompany({ road, muster: road[2], landing: { x: 3, z: 3 } });
  for (const seconds of [0, 600, 1800, 5300]) {
    assert.deepEqual(alone.placements(seconds), untouched.placements(seconds), `empty, at ${seconds} s`);
    assert.deepEqual(alone.summary(seconds), untouched.summary(seconds), `empty summary, at ${seconds} s`);
  }
});
