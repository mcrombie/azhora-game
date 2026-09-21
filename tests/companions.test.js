import test from 'node:test';
import assert from 'node:assert/strict';
import { MERCENARY_ROSTER, mercenaryById, createMercenaryCompany } from '../src/mercenaries.js';
import { createFallen } from '../src/bystanders.js';
import {
  COMPANION_LIMIT, COMPANION_IDS, ASKS, GROUPS, RUNGS, RUNG_LABELS, RUNG_AT, REGARD,
  rungFor, rungLabel, createCompanions, validateCompanionsSnapshot,
} from '../src/companions.js';

const fresh = ({ mustered = false } = {}) => {
  const fallen = createFallen();
  const heard = [];
  return { fallen, heard, companions: createCompanions({ fallen, mustered: () => mustered, onEvent: e => heard.push(e) }) };
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

test('one walks with you on the road, two once the company has mustered', () => {
  assert.deepEqual([COMPANION_LIMIT.road, COMPANION_LIMIT.mustered], [1, 2]);
  const road = fresh();
  assert.equal(road.companions.limit, 1);
  assert.equal(road.companions.ask('merc-word', { where: 'shore' }).ok, true);
  const second = road.companions.askable('merc-mus', { where: 'wild' });
  assert.deepEqual([second.ok, second.reason], [false, 'full'], 'asking a second is asking the first to go on ahead');
  // And it refuses rather than shuffling: the choice belongs to the player, in words.
  assert.deepEqual(road.companions.walking, ['merc-word']);
  assert.equal(road.companions.sendOn('merc-word').ok, true);
  assert.equal(road.companions.ask('merc-mus', { where: 'wild' }).ok, true);
  assert.deepEqual(road.companions.walking, ['merc-mus']);
  assert.equal(road.companions.sendOn('merc-mus').ok, true);
  assert.equal(road.companions.sendOn('merc-mus').ok, false, 'nobody is sent on twice');
  const camp = fresh({ mustered: true });
  assert.equal(camp.companions.limit, 2);
  assert.equal(camp.companions.ask('merc-word', { where: 'shore' }).ok, true);
  assert.equal(camp.companions.ask('merc-mus', { where: 'wild' }).ok, true);
  assert.equal(camp.companions.askable('merc-matt', { where: 'road' }).reason, 'full');
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
  for (const bad of [null, [], { ...saved, version: 2 }, { ...saved, walking: ['nobody'] },
    { ...saved, walking: ['merc-word', 'merc-word'] },
    { ...saved, walking: ['merc-word', 'merc-mus', 'merc-matt'] },
    { ...saved, regard: { nobody: 10 } }, { ...saved, regard: { 'merc-mus': -1 } },
    { ...saved, regard: { 'merc-mus': 1e9 } }, { ...saved, errands: ['nobody'] }])
    assert.equal(validateCompanionsSnapshot(bad), false, JSON.stringify(bad));
});

test('the companion it hands the company is the one the long road already takes', () => {
  // The whole point of the design: this is not a second system. What `createMercenaryCompany`
  // wants is `{ id, with: true }`, and undefined when nobody walks with you - which is today's
  // clock, exactly, and is pinned by the company's own snapshot test.
  const { companions } = fresh();
  assert.equal(companions.companion, undefined, 'nobody asked is nobody walking');
  companions.ask('merc-word', { where: 'shore' });
  assert.deepEqual(companions.companion, { id: 'merc-word', with: true });
  const road = [{ x: 0, z: 0 }, { x: -100, z: 0 }, { x: -400, z: 0 }];
  const walking = createMercenaryCompany({ road, muster: road[2], landing: { x: 3, z: 3 }, companion: companions.companion });
  assert.equal(walking.companionId, 'merc-word');
  assert.equal(walking.placements(600).find(p => p.id === 'merc-word').phase, 'with-traveler');
  companions.sendOn('merc-word');
  const alone = createMercenaryCompany({ road, muster: road[2], landing: { x: 3, z: 3 }, companion: companions.companion });
  assert.equal(alone.companionId, null);
  const untouched = createMercenaryCompany({ road, muster: road[2], landing: { x: 3, z: 3 } });
  for (const seconds of [0, 600, 1800, 5300])
    assert.deepEqual(alone.placements(seconds), untouched.placements(seconds), `at ${seconds} s`);
});
