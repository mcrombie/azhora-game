import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createLizeemFarmlands, validateLizeemFarmlands, talethFarmlandsChoices, measureLineFor, measureEntriesFor, freeRoamGuidance,
  NORTH_BEDS, CARICAS_BEDS, NORTH_SEED_BENCH, LIZEEM_XP, LIZEEM_ROLES, CALL_THE_DEW, TART_ITEM, TALETH_ID,
  CARICAS_STAGES, MEASURE_LEAVES, LIZEEM_FARMLANDS, LIZEEM_RECIPES, HAND_WAGE, CHARGE_GUIDANCE,
} from '../src/lizeem-farmlands.js';
import { lizeemConversation, LIZEEM_PEOPLE } from '../src/lizeem-people.js';
import { FREE_ROAM_GUIDANCE } from '../src/minora-opening.js';
import { GAME_DAY_SECONDS } from '../src/merchants.js';
import { REGIONAL_FARM_ROWS } from '../src/regional-farmland.js';
import { normalizeTrackableQuests } from '../src/quest-tracker.js';
import { buildJournalEntries } from '../src/journal-entries.js';
import { markerFor } from '../src/quest-markers.js';
import { createFarming } from '../src/farming.js';

const [B1, B2, B3] = NORTH_BEDS;
const ORCHARD_BED = REGIONAL_FARM_ROWS.find(row => row.farmId === 'caricas-east-orchard').id;
const AMBRON_BED = REGIONAL_FARM_ROWS.find(row => row.region === 'Elagos').id;
const rye = (grade = 'plain', quantity = 2) => ({ crop: 'bridge-rye', item: 'bridge-rye', quantity, grade });
const beans = (grade = 'plain', quantity = 2) => ({ crop: 'field-beans', item: 'field-beans', quantity, grade });

/** The game's subsystems as the quest sees them, counting what they are asked for. */
function harness() {
  const gains = [], spells = [], events = [];
  let handler = null;
  const skills = { known: () => true, learn: () => ({ ok: true }), gain: (id, n) => { gains.push([id, n]); return { ok: true, levelled: false }; } };
  const magic = { learn: id => { spells.push(id); return { ok: true, id }; } };
  const farming = { onHarvest: fn => { handler = fn; return () => {}; } };
  const make = () => createLizeemFarmlands({ skills, magic, farming, onEvent: event => events.push(event) });
  return { gains, spells, events, make, reap: (bed, result) => handler(bed, result) };
}
const xp = gains => gains.filter(([id]) => id === 'farming').reduce((sum, [, n]) => sum + n, 0);

/** Walks the arc to the named stage the way a player would. */
function walkTo(q, stage, { claim = 'hand' } = {}) {
  q.offer(); q.accept();
  if (stage === 'bridge') return q;
  q.lease();
  if (stage === 'sowing') return q;
  q.harvest(B1, rye()); q.harvest(B2, rye()); q.harvest(B3, beans()); q.harvest(B1, beans());
  if (stage === 'swap') return q;
  q.harvest(B3, rye('good'));
  if (stage === 'claim') return q;
  q.settleClaim(claim);
  if (stage === 'fine') return q;
  q.harvest(B2, rye('fine'));
  if (stage === 'tart') return q;
  q.sealTart();
  if (stage === 'carry') return q;
  q.deliver({ grade: 'fine' });
  return q;
}

test('The charge waits on Taleth: nothing in Caricas moves until it is offered and accepted', () => {
  const h = harness(), q = h.make();
  assert.equal(q.stage, 'unmet');
  assert.equal(q.lease(), false, 'Egeria lends nothing to a man with no charge');
  assert.equal(h.reap(B1, rye()), null, 'a harvest before the charge owes no share');
  assert.equal(q.enter('bridge-rye', 'fine').ok, false, 'the Measure is not open before the charge');
  assert.equal(q.trackableView().active, false);
  assert.equal(q.offer(), true); assert.equal(q.offer(), false);
  assert.equal(q.stage, 'offered'); assert.equal(q.trackableView().active, false, 'an offer is not a quest yet');
  assert.equal(q.accept(), true); assert.equal(q.accept(), false);
  assert.equal(q.accepted(), true); assert.equal(q.caricas.stage, 'bridge');
  assert.deepEqual(q.trackableView().destinationIds, [LIZEEM_ROLES.egeria]);
  assert.equal(xp(h.gains), 0, 'taking the charge pays nothing');
});

test('Accepting straight from unmet is allowed, since Taleth may make the offer and the yes in one conversation', () => {
  const q = harness().make();
  assert.equal(q.accept(), true);
  assert.equal(q.stage, 'accepted');
});

test('Egeria’s lease opens the North fields and the holder’s quarter is taken on every Caricas bed from then on', () => {
  const h = harness(), q = walkTo(h.make(), 'bridge');
  assert.equal(h.reap(B1, rye()), null, 'before the lease nothing is owed');
  assert.equal(q.lease(), true); assert.equal(q.lease(), false);
  assert.equal(q.caricas.stage, 'sowing'); assert.equal(q.caricas.leased, true);
  assert.equal(h.reap(B1, rye('plain', 2)), null, 'half a share is carried, not taken');
  const second = h.reap(B2, rye('good', 2));
  assert.deepEqual(second, { taken: 1, note: '2 bridge rye, Good. The holder’s share: 1. Yours: 1.' });
  const orchard = h.reap(ORCHARD_BED, { crop: 'barley', item: 'barley', quantity: 4 });
  assert.equal(orchard.taken, 1, 'the quarter is owed on every Caricas farm, not only the lent one');
  assert.equal(h.reap(AMBRON_BED, rye('plain', 8)), null, 'nothing is owed on a bed outside Caricas');
  assert.equal(q.shares.holderTaken, 2);
  assert.equal(q.caricas.stage, 'sowing', 'one crop and no beans is not the sowing done');
});

test('Two beds of each are wanted, so the three North beds take two rounds, and rye where beans grew is the swap', () => {
  const h = harness(), q = walkTo(h.make(), 'sowing');
  h.reap(B1, rye()); h.reap(B2, rye()); h.reap(B3, beans());
  assert.equal(q.caricas.stage, 'sowing', 'two rye and one bean bed are not two of each');
  h.reap(B3, beans());
  assert.equal(q.caricas.stage, 'sowing', 'the same bed twice is still one bed of beans');
  h.reap(B1, beans());
  assert.equal(q.caricas.stage, 'swap');
  assert.equal(xp(h.gains), LIZEEM_XP.sowing);
  h.reap(B2, rye());
  assert.equal(q.caricas.stage, 'swap', 'rye after rye is not the swap');
  h.reap(B3, { crop: 'barley', item: 'barley', quantity: 2 });
  h.reap(B3, rye());
  assert.equal(q.caricas.stage, 'swap', 'rye after barley is not rye on bean ground');
  h.reap(B1, rye('good'));
  assert.equal(q.caricas.stage, 'claim');
  assert.equal(q.caricas.swapGrade, 'good');
  assert.equal(xp(h.gains), LIZEEM_XP.sowing + LIZEEM_XP.swap);
  assert.deepEqual(q.trackableView().destinationIds, [LIZEEM_ROLES.hagen, LIZEEM_ROLES.vertumnus]);
});

test('Rye brought in on bean ground during the sowing is the swap as soon as the sowing is done', () => {
  const h = harness(), q = walkTo(h.make(), 'sowing');
  h.reap(B1, beans()); h.reap(B2, beans()); h.reap(B3, rye()); h.reap(B1, rye('good'));
  assert.equal(q.caricas.stage, 'claim', 'the second rye bed was on bean ground, so both steps close together');
  assert.equal(xp(h.gains), LIZEEM_XP.sowing + LIZEEM_XP.swap, 'and both lumps are paid, once each');
});

test('Handing over the tenth lets the garrison take it until the Fine rye is in, and warms Hagen', () => {
  const h = harness(), q = walkTo(h.make(), 'claim');
  assert.equal(q.settleClaim('maybe'), false);
  const before = q.shares.garrisonTaken;
  assert.equal(q.settleClaim('hand'), true); assert.equal(q.settleClaim('hide'), false, 'the claim is answered once');
  assert.equal(q.caricas.claim, 'handed'); assert.equal(q.caricas.stage, 'fine');
  assert.equal(q.regard(LIZEEM_ROLES.hagen), 1); assert.equal(q.regard(LIZEEM_ROLES.vertumnus), 0);
  const taken = h.reap(B1, { crop: 'field-beans', quantity: 10 });
  assert.match(taken.note, /The garrison’s tenth: 1\./);
  assert.equal(q.shares.garrisonTaken, before + 1);
  h.reap(B2, rye('fine', 10));
  assert.equal(q.caricas.stage, 'tart');
  assert.equal(h.reap(B3, { crop: 'field-beans', quantity: 10 }).note.includes('garrison'), false, 'the claim ends with the rye');
});

test('Hiding the tenth for the upland takes nothing for the garrison and warms Vertumnus instead', () => {
  const h = harness(), q = walkTo(h.make(), 'claim');
  q.settleClaim('hide');
  assert.equal(q.caricas.claim, 'hidden');
  assert.equal(q.regard(LIZEEM_ROLES.vertumnus), 1); assert.equal(q.regard(LIZEEM_ROLES.hagen), 0);
  const before = q.shares.garrisonTaken;
  const taken = h.reap(B1, { crop: 'field-beans', quantity: 10 });
  assert.equal(taken.note.includes('garrison'), false);
  assert.equal(q.shares.garrisonTaken, before);
  assert.match(taken.note, /The holder’s share: \d\. Yours:/, 'the holder’s quarter is still owed');
});

test('Fine rye brought in before the claim is answered closes the Fine step as soon as the claim is', () => {
  const h = harness(), q = walkTo(h.make(), 'claim');
  h.reap(ORCHARD_BED, rye('prize'));
  assert.equal(q.caricas.stage, 'claim');
  q.settleClaim('hide');
  assert.equal(q.caricas.stage, 'tart');
  assert.equal(xp(h.gains), LIZEEM_XP.sowing + LIZEEM_XP.swap + LIZEEM_XP.claim + LIZEEM_XP.fine);
});

test('Plain or Good rye is not the Fine rye', () => {
  const h = harness(), q = walkTo(h.make(), 'fine');
  h.reap(B1, rye('good')); h.reap(B2, rye('plain'));
  assert.equal(q.caricas.stage, 'fine');
  assert.deepEqual(q.trackableView().target, { x: NORTH_SEED_BENCH.x, z: NORTH_SEED_BENCH.z, id: NORTH_SEED_BENCH.id, name: 'The North fields, Caricas' });
});

test('The tart is sealed at the grain court and carried to Taleth, and the arc pays its lumps and its reward exactly once', () => {
  const h = harness(), q = walkTo(h.make(), 'tart');
  assert.deepEqual(q.trackableView().destinationIds, [LIZEEM_ROLES.pomona, LIZEEM_ROLES.consus]);
  assert.equal(q.noteTaught(TART_ITEM), true); assert.equal(q.noteTaught(TART_ITEM), false);
  assert.deepEqual(q.trackableView().destinationIds, [LIZEEM_ROLES.consus], 'once the tart is taught, only the seal is left');
  assert.equal(q.deliver(), false, 'an unsealed tart is not carried');
  assert.equal(q.sealTart(), true); assert.equal(q.sealTart(), false);
  assert.deepEqual(q.trackableView().destinationIds, [TALETH_ID]);
  assert.equal(h.spells.length, 0);
  const result = q.deliver({ grade: 'fine' });
  assert.equal(result.ok, true); assert.equal(result.spell, CALL_THE_DEW);
  assert.equal(q.deliver({ grade: 'fine' }), false, 'the tart is delivered once');
  assert.deepEqual(h.spells, [CALL_THE_DEW]);
  assert.deepEqual(h.gains.map(([, n]) => n), [LIZEEM_XP.sowing, LIZEEM_XP.swap, LIZEEM_XP.claim, LIZEEM_XP.fine, LIZEEM_XP.done]);
  const arc = q.caricas;
  assert.equal(arc.stage, 'done'); assert.equal(arc.secondFarm, true); assert.deepEqual(arc.hands, ['messor']);
  assert.deepEqual(q.handsReturned(), ['messor']);
  assert.equal(q.measureView().leaves[0].lines.find(line => line.id === 'tart').grade, 'fine', 'a Fine tart is laid up in the Measure');
  assert.equal(q.hire('messor'), true); assert.equal(q.hire('messor'), false); assert.equal(q.hire('occator'), false);
  const view = q.trackableView();
  assert.equal(view.active, true, 'the charge outlives the first country');
  assert.equal(view.stage, 'measure', 'the tracker never sees a stage it would read as finished');
  assert.ok(view.steps.every(step => step.done));
});

test('A reload never pays a lump, the spell or the farm again', () => {
  const h = harness(), q = walkTo(h.make(), 'carry');
  const saved = q.snapshot();
  const paid = xp(h.gains);
  const again = h.make();
  assert.equal(again.restore(saved), true);
  assert.equal(xp(h.gains), paid, 'restoring the carry stage pays nothing');
  again.deliver();
  assert.equal(xp(h.gains), paid + LIZEEM_XP.done);
  const done = again.snapshot();
  const third = h.make();
  assert.equal(third.restore(done), true);
  assert.equal(third.deliver(), false);
  assert.equal(third.sealTart(), false);
  assert.equal(third.settleClaim('hand'), false);
  assert.equal(xp(h.gains), paid + LIZEEM_XP.done);
  assert.deepEqual(h.spells, [CALL_THE_DEW]);
  assert.deepEqual(third.snapshot(), done);
});

test('The Measure takes Fine or Prize Caricas food, writes Prize in gold, and lists the other three countries as not yet walked', () => {
  const h = harness(), q = walkTo(h.make(), 'sowing');
  assert.equal(q.enter('bridge-rye', 'good').ok, false, 'Good is not Fine');
  assert.equal(q.enter('flood-oats', 'fine').ok, false, 'Nethereum is not walked yet');
  assert.equal(q.enter('carrot', 'prize').ok, false);
  const first = q.enter('fine-bridge-rye', 'fine');
  assert.deepEqual(first, { ok: true, country: 'caricas', line: 'bridge-rye', grade: 'fine', upgraded: false, firstPrize: false, full: false });
  assert.equal(q.enter('bridge-rye', 'fine').ok, false, 'the same line at the same grade is written once');
  const better = q.enter('bridge-rye-prize', 'Prize');
  assert.equal(better.upgraded, true); assert.equal(better.firstPrize, true);
  assert.equal(q.enter('bridge-rye', 'fine').ok, false, 'nothing replaces Prize');
  q.enter('field-beans', 'fine'); q.enter('soft-fruit', 'fine');
  assert.equal(q.enter(TART_ITEM, 'prize').full, true);
  const view = q.measureView();
  assert.equal(view.leaves.length, 4);
  assert.deepEqual(view.leaves.map(leaf => leaf.id), MEASURE_LEAVES.map(leaf => leaf.id));
  const caricas = view.leaves[0];
  assert.equal(caricas.full, true);
  assert.deepEqual(caricas.lines.filter(line => line.prize).map(line => line.id), ['bridge-rye', 'tart']);
  for (const leaf of view.leaves.slice(1)) {
    assert.equal(leaf.walked, false); assert.equal(leaf.note, 'Not yet walked.'); assert.equal(leaf.lines.length, 4);
    assert.ok(leaf.lines.every(line => !line.filled));
  }
  assert.equal(view.full, false);
  assert.match(q.trackableView().notes, /Nethereum: not yet walked\./);
  assert.match(q.trackableView().notes, /bridge rye \(Prize, in gold\)/);
});

test('Item ids are read for their food whatever grade or seal they carry', () => {
  assert.equal(measureLineFor('bridge-rye'), 'bridge-rye');
  assert.equal(measureLineFor('fine-field-beans'), 'field-beans');
  assert.equal(measureLineFor('soft-fruit-prize'), 'soft-fruit');
  assert.equal(measureLineFor('sealed-soft-fruit-tart'), 'tart');
  assert.equal(measureLineFor('barley'), null);
  assert.equal(measureLineFor(undefined), null);
});

test('Old saves without the farmlands load, and bad data is refused without touching the running quest', () => {
  assert.equal(validateLizeemFarmlands(undefined), true);
  const h = harness(), q = walkTo(h.make(), 'fine');
  const good = q.snapshot();
  assert.equal(validateLizeemFarmlands(good), true);
  for (const stage of CARICAS_STAGES) {
    const walked = walkTo(harness().make(), stage === 'waiting' ? 'bridge' : stage);
    assert.equal(validateLizeemFarmlands(walked.snapshot()), true, `a save at ${stage} is valid`);
  }
  const bad = [
    ['null', null], ['an array', []], ['a newer version', { ...good, version: 2 }], ['an unknown hub stage', { ...good, stage: 'done' }],
    ['an unknown arc stage', { ...good, caricas: { ...good.caricas, stage: 'reaping' } }],
    ['an arc begun before the charge', { ...good, stage: 'offered' }],
    ['a sowing without the lease', { ...good, caricas: { ...good.caricas, leased: false } }],
    ['a bed that does not exist', { ...good, caricas: { ...good.caricas, rye: ['caricas-north-fields-row-9', B1] } }],
    ['a bed counted twice', { ...good, caricas: { ...good.caricas, beans: [B1, B1] } }],
    ['a swap with one bed of beans', { ...good, caricas: { ...good.caricas, beans: [B1] } }],
    ['an unanswered claim past the claim', { ...good, caricas: { ...good.caricas, claim: null } }],
    ['a claim answered some other way', { ...good, caricas: { ...good.caricas, claim: 'sold' } }],
    ['an unknown crop in the bed record', { ...good, caricas: { ...good.caricas, last: { [B1]: 'turnips' } } }],
    ['the reward before the end', { ...good, caricas: { ...good.caricas, secondFarm: true } }],
    ['a hand before the end', { ...good, caricas: { ...good.caricas, hands: ['messor'] } }],
    ['an unknown recipe', { ...good, caricas: { ...good.caricas, taught: ['fork-stew'] } }],
    ['a whole share carried', { ...good, shares: { ...good.shares, holder: 1 } }],
    ['a negative share', { ...good, shares: { ...good.shares, holderTaken: -1 } }],
    ['a Good line in the Measure', { ...good, measure: { caricas: { 'bridge-rye': 'good' } } }],
    ['a line the Measure does not have', { ...good, measure: { caricas: { barley: 'fine' } } }],
    ['a leaf not yet walked', { ...good, measure: { caricas: {}, nethereum: { 'flood-oats': 'fine' } } }],
  ];
  for (const [label, data] of bad) {
    assert.equal(validateLizeemFarmlands(data), false, label);
    assert.equal(q.restore(data), false, label);
    assert.deepEqual(q.snapshot(), good, `${label} left the quest as it was`);
  }
  const done = walkTo(harness().make(), 'done').snapshot();
  assert.equal(validateLizeemFarmlands({ ...done, caricas: { ...done.caricas, hired: ['occator'] } }), false, 'only a returned hand can be hired');
  assert.equal(validateLizeemFarmlands({ ...done, caricas: { ...done.caricas, hands: [] } }), false, 'the end brings the first hand');
  const unmet = harness().make().snapshot();
  assert.equal(validateLizeemFarmlands({ ...unmet, measure: { caricas: { 'bridge-rye': 'fine' } } }), false, 'nothing is measured before the charge');
  assert.equal(q.restore(undefined), true);
  assert.equal(q.stage, 'unmet', 'an old save starts the charge fresh');
});

test('The tracker card points at the right people, the North fields and Taleth, and the markers follow it', () => {
  const q = harness().make();
  assert.deepEqual(q.markerIds(), [], 'no marks before the charge');
  walkTo(q, 'sowing');
  const view = q.trackableView();
  assert.equal(view.id, LIZEEM_FARMLANDS.id); assert.equal(view.type, 'skill'); assert.equal(view.active, true);
  assert.equal(view.target.id, NORTH_SEED_BENCH.id);
  assert.match(view.detail, /rye 0 \/ 2, beans 0 \/ 2/);
  assert.deepEqual(q.markerIds(), [LIZEEM_ROLES.vertumnus]);
  assert.equal(view.steps.length, 7); assert.equal(view.steps[0].done, true); assert.equal(view.steps[1].done, false);
  assert.equal(view.measure.leaves.length, 4);
  const done = walkTo(harness().make(), 'done');
  assert.deepEqual(done.markerIds(), [LIZEEM_ROLES.seshat, LIZEEM_ROLES.messor], 'Seshat for the rest of the leaf, Messor for the hire');
  done.hire('messor');
  for (const id of ['bridge-rye', 'field-beans', 'soft-fruit']) done.enter(id, 'fine');
  assert.deepEqual(done.markerIds(), []);
  assert.match(done.trackableView().detail, /leaf of the Measure is full/);
});

test('Every Caricas bed is a real bed and the North fields are the lent farm', () => {
  assert.equal(CARICAS_BEDS.length, 17, 'the design’s seventeen beds on five farmsteads');
  assert.ok(NORTH_BEDS.length >= 3 && NORTH_BEDS.every(id => id.startsWith('caricas-north-fields-row-')));
  assert.ok(NORTH_SEED_BENCH && NORTH_SEED_BENCH.farmId === 'caricas-north-fields');
});

test('Taleth takes the sealed tart through his own conversation, once, and only when it is carried', () => {
  const h = harness(), q = walkTo(h.make(), 'tart');
  let stock = 1; const opened = [];
  const context = { farmlands: q, inventory: { count: id => (id === TART_ITEM ? stock : 0), remove: (id, n) => { assert.equal(id, TART_ITEM); stock -= n; return true; } },
    openDialogue: (npc, lines, event, label, options) => opened.push({ lines, options }), closeDialogue: () => {} };
  assert.deepEqual(talethFarmlandsChoices({ id: TALETH_ID }, context), [], 'nothing to give before the seal');
  q.sealTart();
  stock = 0;
  assert.deepEqual(talethFarmlandsChoices({ id: TALETH_ID }, context), [], 'nothing to give with no tart in the satchel');
  stock = 1;
  const [give] = talethFarmlandsChoices({ id: TALETH_ID }, context);
  assert.equal(give.id, 'lizeem-deliver-tart');
  give.action();
  assert.equal(stock, 0); assert.equal(q.caricas.stage, 'done'); assert.deepEqual(h.spells, [CALL_THE_DEW]);
  assert.equal(opened.length, 1);
  assert.ok(opened[0].lines.every(text => !text.includes('!')), 'the game’s voice has no exclamation marks');
  assert.deepEqual(talethFarmlandsChoices({ id: TALETH_ID }, context), []);
  assert.equal(q.measureView().leaves[0].lines.find(line => line.id === 'tart').filled, false, 'an ordinary tart is not Fine');
});

test('A Fine tart sealed as Prize is laid up in the Measure as Prize when Taleth takes it', () => {
  const q = walkTo(harness().make(), 'carry');
  const fine = `${TART_ITEM}-fine`, removed = [];
  const context = { farmlands: q, merchants: { sealed: id => (id === fine ? { count: 1, prize: 1 } : { count: 0, prize: 0 }) },
    inventory: { count: id => (id === fine ? 1 : 0), remove: id => { removed.push(id); return true; } },
    openDialogue: () => {}, closeDialogue: () => {} };
  talethFarmlandsChoices({ id: TALETH_ID }, context)[0].action();
  assert.deepEqual(removed, [fine]);
  const tart = q.measureView().leaves[0].lines.find(line => line.id === 'tart');
  assert.equal(tart.grade, 'prize'); assert.equal(tart.prize, true);
});

test('The tracker, the journal and the markers take the farmlands as they take any other quest', () => {
  const live = id => ['main', 'lizeem-farmlands'].includes(id);
  const q = walkTo(harness().make(), 'claim');
  const choices = normalizeTrackableQuests({ main: { title: 'The main quest' }, optional: [q.trackableView()], live });
  const card = choices.find(entry => entry.id === LIZEEM_FARMLANDS.id);
  assert.equal(card.type, 'skill'); assert.equal(card.label, 'Skill training');
  assert.deepEqual(card.destinationIds, [LIZEEM_ROLES.hagen, LIZEEM_ROLES.vertumnus]);
  assert.equal(card.measure.leaves.length, 4, 'the Measure travels with the card');
  assert.equal(normalizeTrackableQuests({ optional: [q.trackableView()], live: id => id === 'main' })
    .some(entry => entry.id === LIZEEM_FARMLANDS.id), false, 'off the slate, the card is not offered');
  let entries = buildJournalEntries({ tracker: { choices }, farmlands: q.snapshot(), live });
  const open = entries.find(entry => entry.id === LIZEEM_FARMLANDS.id);
  assert.equal(open.status, 'active'); assert.equal(open.measure.title, 'The Measure of the River');
  assert.equal(entries.some(entry => entry.id === 'lizeem-farmlands-caricas'), false);
  const done = walkTo(harness().make(), 'done', { claim: 'hide' });
  entries = buildJournalEntries({ tracker: { choices: normalizeTrackableQuests({ optional: [done.trackableView()], live }) }, farmlands: done.snapshot(), live });
  const caricas = entries.find(entry => entry.id === 'lizeem-farmlands-caricas');
  assert.equal(caricas.status, 'complete'); assert.equal(caricas.type, 'skill');
  assert.match(caricas.detail, /hid the garrison’s tenth/);
  assert.ok(caricas.rewards.includes('Call the Dew'));
  assert.equal(entries.find(entry => entry.id === LIZEEM_FARMLANDS.id).status, 'active', 'the charge stays open after Caricas');
  assert.equal(buildJournalEntries({ farmlands: done.snapshot(), live: id => id === 'main' }).length, 0, 'off the slate, nothing is written');
  const view = { questStage: 0, farmlandsDestinations: q.markerIds(), live };
  assert.deepEqual(markerFor(LIZEEM_ROLES.hagen, view), { kind: 'skill', open: false }, 'a green book from the first morning in Minora');
  assert.equal(markerFor(LIZEEM_ROLES.egeria, view), null);
  assert.equal(markerFor(LIZEEM_ROLES.hagen, { ...view, busy: true }), null, 'no marks in a fight');
  assert.equal(markerFor(LIZEEM_ROLES.hagen, { ...view, live: id => id === 'main' }), null, 'no marks off the slate');
});

test('The real farm hands every Caricas harvest to the quest, and what the holder takes never reaches the satchel', t => {
  const stock = new Map(), add = (id, n) => { stock.set(id, (stock.get(id) ?? 0) + n); return true; };
  const inventory = { add, count: id => stock.get(id) ?? 0,
    remove: (id, n) => { if ((stock.get(id) ?? 0) < n) return false; stock.set(id, stock.get(id) - n); return true; } };
  const skills = { known: () => true, learn: () => ({ ok: true }), level: () => 1, gain: () => ({ ok: true }) };
  const farming = createFarming({ skills, inventory });
  if (typeof farming.onHarvest !== 'function' || !farming.sow) { t.skip('the farm has no onHarvest yet'); return; }
  const q = createLizeemFarmlands({ skills, farming });
  q.accept(); q.lease();
  add('bridge-rye-seed', 6); add('field-beans-seed', 4);
  let clock = 0;
  const round = plan => {
    for (const [bed, crop] of plan) assert.equal(farming.sow(bed, crop, clock).ok, true, `${crop} in ${bed}`);
    clock += 400;
    return plan.map(([bed]) => (farming.harvest ?? farming.reap)(bed, clock));
  };
  const first = round([[B1, 'bridge-rye'], [B2, 'bridge-rye'], [B3, 'field-beans']]);
  assert.ok(first.every(reaped => reaped.ok));
  const grown = first.reduce((sum, reaped) => sum + reaped.grown, 0), kept = first.reduce((sum, reaped) => sum + reaped.count, 0);
  assert.equal(grown - kept, q.shares.holderTaken, 'the farm withholds exactly what the holder took');
  assert.equal(q.shares.holderTaken, Math.floor(grown / 4));
  assert.equal(stock.get('bridge-rye') ?? 0, first.slice(0, 2).filter(r => r.produce === 'bridge-rye').reduce((sum, r) => sum + r.count, 0));
  round([[B1, 'field-beans']]);
  assert.equal(q.caricas.stage, 'swap');
  round([[B1, 'bridge-rye']]);
  assert.equal(q.caricas.stage, 'claim');
});

// ---------------------------------------------------------------------------------------------
// The groundwork for Builds 2 to 5 (the user, 6 October 2026: "keep building everything").
// These register arcs, which the save's validator remembers for the rest of the file, so they come last.
// ---------------------------------------------------------------------------------------------

test('A Prize harvest is written in the Measure the moment it is reaped, on its own country’s leaf', () => {
  const h = harness(), q = h.make();
  assert.equal(h.reap(B1, rye('prize')), null, 'before the charge nothing is written');
  q.accept();
  h.reap(B1, rye('prize'));
  assert.equal(q.measureView().leaves[0].lines.find(line => line.id === 'bridge-rye').grade, 'prize', 'Prize at harvest, before the lease even');
  const fine = h.make(); fine.accept();
  h.reap(B1, rye('fine'));
  assert.equal(fine.measureView().leaves[0].lines.find(line => line.id === 'bridge-rye').filled, false, 'Fine waits for the seal and Seshat');
  assert.deepEqual(measureEntriesFor('bridge-rye-fine'), [{ leaf: 'caricas', line: 'bridge-rye' }, { leaf: 'nesdor', line: 'rye' }], 'the Nesdor rye is bridge rye');
  assert.deepEqual(measureEntriesFor('smoked-fish'), [{ leaf: 'nethereum', line: 'dish' }]);
});

test('Messor is paid six copper a game day, stops when a day goes unpaid, and reaps the North fields while he is paid', () => {
  let purse = 20, now = 0;
  const reaped = [], events = [];
  const farming = { onHarvest: () => () => {}, rowState: (bed, at) => ({ stage: bed === B2 && at >= 100 ? 'ripe' : 'sown' }),
    harvest: (bed, at, options) => { reaped.push([bed, at, options]); return { ok: true }; } };
  const q = createLizeemFarmlands({ farming, clock: () => now, pay: copper => (purse >= copper ? ((purse -= copper), true) : false), onEvent: event => events.push(event) });
  walkTo(q, 'done');
  assert.equal(HAND_WAGE, 6);
  assert.equal(q.hire('messor'), true);
  assert.equal(purse, 14, 'the first day is paid at the hire');
  assert.deepEqual(q.snapshot().caricas.paid, { messor: 0 });
  assert.equal(validateLizeemFarmlands(q.snapshot()), true);
  q.tick(100);
  assert.deepEqual(reaped, [[B2, 100, { hand: 'messor' }]], 'he reaps what is ripe, as a hand');
  q.tick(100.5);
  assert.equal(reaped.length, 1, 'once a whole second');
  now = 1080;
  q.tick(1080);
  assert.equal(purse, 8, 'the next morning, six more');
  now = 1080 + 2 * GAME_DAY_SECONDS;
  q.tick(now);
  assert.equal(purse, 2, 'one more day paid, and the next could not be');
  assert.deepEqual(q.caricas.hired, [], 'so he stops');
  assert.equal(events.at(-1).type, 'lizeem-hand-unpaid');
  const count = reaped.length;
  q.tick(now + 5);
  assert.equal(reaped.length, count, 'and reaps nothing for nothing');
  assert.equal(q.hire('messor'), false, 'six copper to have him back');
  purse = 6;
  assert.equal(q.hire('messor'), true);
  // A save from before the wage loads, and his first morning after it is charged.
  const old = q.snapshot(); delete old.caricas.paid;
  assert.equal(validateLizeemFarmlands(old), true);
  assert.equal(validateLizeemFarmlands({ ...old, caricas: { ...old.caricas, paid: { occator: 1 } } }), false, 'only a hired hand is paid');
  const again = createLizeemFarmlands({ farming, clock: () => now, pay: copper => (purse >= copper ? ((purse -= copper), true) : false) });
  purse = 6;
  assert.equal(again.restore(old), true);
  again.tick(now + 10);
  assert.equal(purse, 0);
  assert.deepEqual(again.caricas.hired, ['messor']);
});

test('Once the charge is taken the free-roam objective stops sending Rollo back to Taleth', () => {
  const q = harness().make();
  assert.equal(freeRoamGuidance(q, FREE_ROAM_GUIDANCE), FREE_ROAM_GUIDANCE);
  q.offer();
  assert.equal(freeRoamGuidance(q, FREE_ROAM_GUIDANCE), FREE_ROAM_GUIDANCE, 'an offer is not a charge taken');
  q.accept();
  assert.equal(freeRoamGuidance(q, FREE_ROAM_GUIDANCE), CHARGE_GUIDANCE);
  assert.notEqual(CHARGE_GUIDANCE.title, FREE_ROAM_GUIDANCE.title);
  assert.deepEqual(CHARGE_GUIDANCE.destinationIds, []);
  assert.match(CHARGE_GUIDANCE.detail, /main quest/, 'the main quest is still offered');
});

test('A recipe counts as taught only when the kitchen takes it', () => {
  const q = createLizeemFarmlands(), shown = [], notes = [];
  let kitchen = { ok: false, reason: 'Learn Fire Making from Lee Anne, or take a lesson at a teacher’s already-lit fire.' };
  const ctx = { farmlands: q, cooking: { learn: () => kitchen }, notify: (text, kicker) => notes.push([text, kicker]),
    openDialogue: (npc, lines, event, label, options = {}) => shown.push(options.choices ?? []), closeDialogue: () => {} };
  const vertumnus = LIZEEM_PEOPLE.find(person => person.id === LIZEEM_ROLES.vertumnus);
  const choose = id => { const choice = [...shown].reverse().find(list => list.length).find(entry => entry.id === id); assert.ok(choice, id); choice.action(); };
  q.accept(); q.lease();
  lizeemConversation(vertumnus, ctx); choose('lizeem-vertumnus-recipes');
  assert.deepEqual(q.caricas.taught, [], 'the kitchen refused, so nothing is taught');
  assert.match(notes.at(-1)[0], /Fire Making/);
  lizeemConversation(vertumnus, ctx);
  assert.ok(shown.at(-1).some(choice => choice.id === 'lizeem-vertumnus-recipes'), 'and the lesson is offered again');
  kitchen = { ok: true };
  choose('lizeem-vertumnus-recipes');
  assert.deepEqual(q.caricas.taught, [LIZEEM_RECIPES.pottage, LIZEEM_RECIPES.ryeLoaf]);
});

/** An arc as a country's module would make it: a stage, a card, marks, a journal, its lines, a save. */
function fakeArc(id, { stage = 'arrive', validate = data => data === undefined || (!!data && typeof data.stage === 'string') } = {}) {
  let state = { stage };
  return { restored: [],
    stage: () => state.stage,
    set: next => { state.stage = next; },
    trackableView: () => ({ title: `${id} card`, detail: `The ${id} step.`, destinationIds: [`${id}-person`], stage: state.stage }),
    markerIds: () => [`${id}-person`],
    journal: () => (state.stage === 'done' ? { title: `${id}: done`, detail: 'It is done.', rewards: ['Quicken'] } : null),
    measureLines: () => [{ id: 'flood-oats', name: 'Flood oats from the silt' }],
    snapshot: () => ({ ...state }),
    restore(data) { this.restored.push(data); state = data === undefined ? { stage } : { ...data }; return true; },
    validate };
}

test('A country’s arc is registered with the hub: its card, its marks, its leaf of the Measure and its journal', () => {
  const q = harness().make(), arc = fakeArc('nethereum');
  assert.equal(q.registerArc('caricas', arc), false, 'Caricas is built in');
  assert.equal(q.registerArc('atlantis', arc), false, 'an arc is one of the river’s');
  assert.equal(q.registerArc('nethereum', { stage: () => 'x' }), false, 'an arc saves and restores');
  assert.equal(q.registerArc('Nethereum', arc), true);
  assert.equal(q.arc('nethereum'), arc);
  assert.deepEqual(q.trackableViews().map(card => card.id), [LIZEEM_FARMLANDS.id], 'nothing shows before the charge');
  assert.deepEqual(q.markerIds(), []);
  walkTo(q, 'bridge');
  const cards = q.trackableViews();
  assert.deepEqual(cards.map(card => card.id), [LIZEEM_FARMLANDS.id, `${LIZEEM_FARMLANDS.id}-nethereum`]);
  assert.deepEqual([cards[1].slateId, cards[1].type, cards[1].active, cards[1].detail], [LIZEEM_FARMLANDS.id, 'skill', true, 'The nethereum step.']);
  assert.deepEqual(q.trackableView().arcs.map(card => card.id), [cards[1].id], 'the hub’s card lists the arcs under way');
  const tracked = normalizeTrackableQuests({ optional: q.trackableViews(), live: id => ['main', 'lizeem-farmlands'].includes(id) });
  assert.ok(tracked.some(card => card.id === `${LIZEEM_FARMLANDS.id}-nethereum`), 'the tracker takes the arc’s card on the hub’s slate');
  assert.deepEqual(q.markerIds(), [LIZEEM_ROLES.egeria, 'nethereum-person']);
  // Its leaf of the Measure is open, with the arc's names over the hub's.
  const leaf = () => q.measureView().leaves.find(entry => entry.id === 'nethereum');
  assert.deepEqual([leaf().walked, leaf().note, leaf().lines[0].name], [true, undefined, 'Flood oats from the silt']);
  assert.equal(q.enter('flood-oats-fine', 'fine').country, 'nethereum');
  assert.equal(q.enter('oatcakes', 'prize').line, 'dish', 'either dish fills the dish line');
  assert.deepEqual(leaf().lines.map(entry => entry.grade), ['fine', null, null, 'prize']);
  assert.match(q.trackableView().notes, /Nethereum: flood oats from the silt \(Fine\)/);
  assert.equal(q.enter('white-bread', 'fine').ok, false, 'Nesdor is not walked yet');
  // Done, it leaves the tracker for the journal.
  arc.set('done');
  assert.deepEqual(q.trackableViews().length, 1);
  assert.deepEqual(q.markerIds(), [LIZEEM_ROLES.egeria]);
  assert.deepEqual(q.journal().map(entry => [entry.id, entry.status, entry.type, entry.title]), [[`${LIZEEM_FARMLANDS.id}-nethereum`, 'complete', 'skill', 'nethereum: done']]);
  const finished = walkTo(createLizeemFarmlands(), 'done');
  finished.registerArc('nethereum', fakeArc('nethereum', { stage: 'done' }));
  assert.doesNotMatch(finished.trackableView().detail, /Nethereum/, 'a country walked is not listed as still to walk');
  assert.match(finished.trackableView().detail, /Nesdor and Ovesos are not yet walked/);
});

test('The hub’s save nests each arc’s under `arcs`, hands it back on restore, and keeps the save of an arc it has not registered', () => {
  const q = harness().make(), arc = fakeArc('nethereum');
  q.registerArc('nethereum', arc);
  walkTo(q, 'sowing');
  q.enter('flood-oats', 'fine');
  arc.set('hatch');
  const saved = q.snapshot();
  assert.deepEqual(saved.arcs, { nethereum: { stage: 'hatch' } });
  assert.deepEqual(saved.measure.nethereum, { 'flood-oats': 'fine' });
  assert.equal(validateLizeemFarmlands(saved), true);
  assert.equal(validateLizeemFarmlands({ ...saved, arcs: { nethereum: { stage: 7 } } }), false, 'the arc’s own validator is asked');
  assert.equal(validateLizeemFarmlands({ ...saved, arcs: { atlantis: {} } }), false, 'an arc nobody registered');
  assert.equal(validateLizeemFarmlands({ ...saved, arcs: [] }), false);
  const { arcs, ...withoutArcs } = saved;
  assert.equal(validateLizeemFarmlands(withoutArcs), true, 'a save from before the arcs loads');
  // A second game's hub with its own arc gets the arc's save back.
  const other = fakeArc('nethereum'), again = harness().make();
  again.registerArc('nethereum', other);
  assert.equal(again.restore(saved), true);
  assert.deepEqual(other.restored.at(-1), { stage: 'hatch' });
  assert.deepEqual(again.snapshot(), saved);
  assert.equal(again.restore(withoutArcs), true);
  assert.equal(other.restored.at(-1), undefined, 'no save for it is a fresh arc');
  // The save's checker copies the section through a hub with no arcs registered: the arc's save rides along.
  const bare = createLizeemFarmlands();
  assert.equal(bare.restore(saved), true);
  assert.deepEqual(bare.snapshot(), saved);
  const late = fakeArc('nethereum');
  bare.registerArc('nethereum', late);
  assert.deepEqual(late.restored, [{ stage: 'hatch' }], 'an arc registered after the save was read is handed it then');
  assert.equal(again.restore({ ...saved, arcs: { nethereum: { stage: 7 } } }), false);
  assert.deepEqual(again.snapshot(), { ...withoutArcs, arcs: { nethereum: { stage: 'arrive' } } }, 'a refused restore leaves the hub and its arc as they were');
});
