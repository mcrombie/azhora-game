import test from 'node:test';
import assert from 'node:assert/strict';
import { createFarming } from '../src/farming.js';
import { SKILLS, createSkills } from '../src/skills.js';
import { NESDOR_FARM_ROWS, NESDOR_BUILDINGS, nesdorStrip, nesdorFarmReserved } from '../src/nesdor-farm.js';
import { createReaping, registerNesdorFarming, unlockLong, lockLong, longUnlocked } from '../src/flats-ground.js';
import {
  createNesdorArc, validateNesdorArc, talethNesdorChoices, foragerEncounter,
  NESDOR_STAGES, NESDOR_XP, RIGHT_GROUND, STRIP_CROPS, WORK_OF_NINE, REBEL_PAPER, FORAGER_FIGHT, FORAGERS, NESDOR_ARC_ITEMS, NESDOR_ROLES,
} from '../src/lizeem-nesdor.js';
import { createLizeemFarmlands, validateLizeemFarmlands, LIZEEM_FARMLANDS } from '../src/lizeem-farmlands.js';

/**
 * Nesdor: right ground (docs/lizeem-farmlands-design.md 5.3, 7.3 and 7.10; the user's design of 5 October
 * 2026, built 6 October 2026): the arc from the Carica ford to the sealed bread and cake in Taleth's hands,
 * walked on the real Ninehands beds with the country's own fit (src/flats-ground.js).
 */
const WET = nesdorStrip('nesdor-wet'), BENCH = nesdorStrip('nesdor-bench'), RISE = nesdorStrip('nesdor-rise');

/** A satchel that holds anything. */
function satchel(start = {}) {
  const owned = new Map(Object.entries(start));
  return { owned, count: id => owned.get(id) ?? 0, items: () => [...owned.keys()].filter(id => owned.get(id) > 0),
    add: (id, n = 1) => { owned.set(id, (owned.get(id) ?? 0) + n); return true; },
    remove: (id, n = 1) => { if ((owned.get(id) ?? 0) < n) return false; owned.set(id, owned.get(id) - n); return true; } };
}
/** The game's subsystems as the arc sees them: the real farm with Nesdor registered, and the rest counting what they are asked. */
function world({ level = 10, accepted = true, sealed = null } = {}) {
  const skills = createSkills(), inventory = satchel({ 'floodwheat-seed': 40, 'bridge-rye-seed': 40, 'barley-seed': 40 }), events = [], spells = [], entered = [], long = [];
  if (level > 1) { const saved = skills.snapshot(); saved.skills.farming = { xp: SKILLS.farming.thresholds[level - 1] }; skills.restore(saved); }
  const gains = [];
  const counted = { ...skills, level: id => skills.level(id), known: id => skills.known(id), learn: (...args) => skills.learn(...args),
    gain: (id, n) => { gains.push([id, n]); return skills.gain(id, n); } };
  const farming = createFarming({ skills: counted, inventory });
  registerNesdorFarming(farming, { long: false });
  const magic = { learn: id => { spells.push(id); return { ok: true, id }; } };
  const flats = { unlockLong: options => { long.push(options); return unlockLong(options); }, lockLong };
  const merchants = sealed ? { sealed: id => sealed[id] ?? { count: 0, prize: 0 } } : null;
  let arc = null;
  const reaping = createReaping({ farming, onEvent: event => { if (event.type === 'strip-reaped') arc.stripReaped(event); } });
  arc = createNesdorArc({ farming, flats, reaping, skills: counted, magic, inventory, merchants, onEvent: event => events.push(event) });
  const hub = { accepted: () => accepted, enter: (...args) => { entered.push(args); return { ok: true }; } };
  arc.attach(hub);
  return { arc, farming, reaping, inventory, events, spells, entered, long, gains, hub,
    setAccepted: value => { accepted = value; } };
}
const xp = gains => gains.filter(([id]) => id === 'farming').reduce((sum, [, n]) => sum + n, 0);
/** Sows a whole strip with one crop, each bed through the farm, and tells the arc as the farm's event would. */
function sowStrip(w, strip, cropId, at = 0) {
  for (const bed of strip.beds) {
    const sown = w.farming.sow(bed, cropId, at);
    assert.equal(sown.ok, true, sown.reason);
    w.arc.farmEvent({ type: 'row-sown', row: bed, crop: cropId });
  }
}
const water = (w, strip, at = 1) => { for (const bed of strip.beds) w.farming.water(bed, at); };

/** Walks the arc to the named stage the way a player would. */
function walkTo(w, stage, { match = false } = {}) {
  w.arc.meet();
  if (stage === 'strips') return w;
  sowStrip(w, BENCH, 'floodwheat'); sowStrip(w, RISE, 'bridge-rye');
  w.farming.harvestAll(RISE.beds, 1000);
  sowStrip(w, RISE, 'barley', 1000);
  if (stage === 'reap') return w;
  if (match) w.arc.takeMatch();
  const reaped = w.reaping.reapStrip(BENCH.id, 1000);
  assert.equal(reaped.ok, true, reaped.reason);
  return w;
}

test('Right ground is read from the country’s own fit: floodwheat the bench, rye the rise, barley either, and nothing the wet', () => {
  assert.deepEqual(RIGHT_GROUND, { floodwheat: ['bench'], barley: ['bench', 'rise'], 'bridge-rye': ['rise'] });
  assert.deepEqual([...STRIP_CROPS], ['floodwheat', 'barley', 'bridge-rye']);
  assert.deepEqual([...NESDOR_STAGES], ['arrive', 'strips', 'reap', 'foragers', 'fine', 'carry', 'done']);
});

test('Nothing in Nesdor moves before Taleth’s charge, and Baugi lends the strips for nothing once it is taken', () => {
  const w = world({ accepted: false });
  assert.equal(w.arc.meet(), false, 'Baugi lends nothing to a man with no charge');
  assert.equal(w.arc.trackableView().active, false);
  assert.deepEqual(w.arc.markerIds(), []);
  w.setAccepted(true);
  assert.deepEqual(w.arc.markerIds(), [NESDOR_ROLES.baugi]);
  assert.match(w.arc.trackableView().detail, /ford the Carica/);
  assert.equal(w.arc.meet(), true); assert.equal(w.arc.meet(), false);
  assert.equal(w.arc.stage(), 'strips');
  assert.equal(xp(w.gains), 0, 'meeting Baugi pays nothing');
  assert.equal(w.events.find(event => event.type === 'lizeem-step').to, 'strips');
});

test('A strip counts only when it is sown whole with one crop on the ground that suits it, and the wet strip is remembered as the trap', () => {
  const w = walkTo(world(), 'strips');
  sowStrip(w, WET, 'floodwheat');
  assert.equal(w.arc.state.wet, true, 'the beginner’s mistake is remembered');
  assert.deepEqual(w.arc.state.sown, [], 'floodwheat on the wet strip is not floodwheat on its ground');
  // Mixed on the bench: floodwheat in two beds and barley in the third is no strip of either.
  for (const [bed, cropId] of [[BENCH.beds[0], 'floodwheat'], [BENCH.beds[1], 'floodwheat'], [BENCH.beds[2], 'barley']]) {
    w.farming.sow(bed, cropId, 0); w.arc.farmEvent({ type: 'row-sown', row: bed, crop: cropId });
  }
  assert.deepEqual(w.arc.state.sown, []);
  w.farming.harvestAll(BENCH.beds, 1000);
  sowStrip(w, BENCH, 'floodwheat', 1000);
  assert.deepEqual(w.arc.state.sown, ['floodwheat']);
  assert.match(w.arc.trackableView().detail, /Still to sow: barley and bridge rye/);
  sowStrip(w, RISE, 'floodwheat', 1000);
  assert.deepEqual(w.arc.state.sown, ['floodwheat'], 'floodwheat on the rise stands thin, and is not a second right strip');
  w.farming.harvestAll(RISE.beds, 2000);
  sowStrip(w, RISE, 'bridge-rye', 2000);
  assert.deepEqual(w.arc.state.sown, ['floodwheat', 'bridge-rye']);
  assert.equal(w.arc.stage(), 'strips');
  w.farming.harvestAll(RISE.beds, 3000);
  // Sown without the farm's event, the strips are still seen from the arc's own look at them.
  for (const bed of RISE.beds) w.farming.sow(bed, 'barley', 3000);
  assert.equal(w.arc.stage(), 'strips');
  assert.deepEqual(w.arc.tick(3000), ['barley']);
  assert.equal(w.arc.stage(), 'reap');
  assert.deepEqual(w.events.filter(event => event.type === 'lizeem-step').map(event => [event.to, event.xp]), [['strips', 0], ['reap', NESDOR_XP.strips]]);
  assert.deepEqual(w.arc.markerIds(), [NESDOR_ROLES.bolverk]);
});

test('Below Farming 8 the card says what floodwheat wants, and barley and rye can be sown first', () => {
  const w = walkTo(world({ level: 3 }), 'strips');
  assert.match(w.arc.trackableView().detail, /Floodwheat wants Farming 8/);
  assert.equal(w.farming.sow(BENCH.beds[0], 'floodwheat', 0).ok, false);
  sowStrip(w, RISE, 'bridge-rye'); sowStrip(w, BENCH, 'barley');
  assert.deepEqual(w.arc.state.sown, ['bridge-rye', 'barley']);
  assert.equal(w.arc.stage(), 'strips');
});

test('The reap stage passes when a whole strip is reaped by walking it, and Bolverk’s match is recorded won or lost', () => {
  // Bolverk takes five seconds and the walk six (settled at integration, 6 October 2026): only a reap in no time,
  // the Work of Nine's, wins it.
  const won = walkTo(world(), 'reap');
  assert.equal(won.arc.takeMatch(), true);
  assert.equal(won.arc.state.racing, true);
  const walk = won.reaping.reapStrip(BENCH.id, 1000, { seconds: 0 });
  assert.equal(walk.ok, true);
  assert.equal(won.arc.stage(), 'foragers');
  const reaped = won.arc.state.reaped;
  assert.deepEqual([reaped.strip, reaped.match, reaped.seconds], [BENCH.id, 'won', 0]);
  assert.deepEqual(reaped.items, { floodwheat: 6 }, 'what came off the strip is what the foragers will see');
  assert.deepEqual(won.arc.state.matches, { won: 1, lost: 0 });
  assert.equal(won.arc.state.racing, false);

  const lost = walkTo(world(), 'reap');
  lost.arc.takeMatch();
  lost.reaping.reapStrip(BENCH.id, 1000);
  assert.deepEqual([lost.arc.stage(), lost.arc.state.reaped.match, lost.arc.state.reaped.seconds], ['foragers', 'lost', 6], 'a walk loses, and the stage passes all the same');

  // Reaped bed by bed, without the walk, the strip still counts; there was no match to judge.
  const hand = walkTo(world(), 'reap');
  hand.arc.takeMatch();
  for (const bed of BENCH.beds) hand.farming.harvest(bed, 1000);
  assert.deepEqual([hand.arc.stage(), hand.arc.state.reaped.match], ['foragers', null]);
  assert.equal(hand.arc.state.racing, true, 'Bolverk is still waiting for a walk');
  assert.deepEqual(hand.arc.state.cut, {}, 'what was gathered for the reap is cleared once it is reaped');
  assert.equal(xp(hand.gains) >= NESDOR_XP.strips + NESDOR_XP.reap, true);
});

test('The foragers take a quarter for one party or a tenth on Forseti’s paper, plain grain first, and the rebellion pays in paper', () => {
  const toForagers = () => { const w = walkTo(world(), 'foragers'); w.inventory.add('copper-piece', 10); return w; };
  // The bench came in Plain-or-Good floodwheat: six of it, in the satchel.
  let w = toForagers();
  assert.equal(w.arc.stage(), 'foragers');
  assert.equal(w.inventory.count('floodwheat'), 6);
  assert.deepEqual(w.arc.answerForagers('give'), { ok: false, reason: 'To whose men?' });
  const cedric = w.arc.answerForagers('give', { party: 'cedric' });
  assert.deepEqual([cedric.ok, cedric.taken, cedric.paper], [true, 2, 0], 'a quarter of six, rounded the foragers’ way');
  assert.equal(w.inventory.count('floodwheat'), 4);
  assert.equal(w.arc.stage(), 'fine');
  assert.equal(w.arc.regard(NESDOR_ROLES.baugi), -1);

  w = toForagers();
  w.inventory.add('floodwheat-fine', 3);
  const rebels = w.arc.answerForagers('give', { party: 'rebels' });
  assert.deepEqual([rebels.taken, rebels.paper], [2, 2]);
  assert.equal(w.inventory.count(REBEL_PAPER), 2, 'a note a measure');
  assert.equal(w.inventory.count('floodwheat-fine'), 3, 'they took the plain first');
  assert.equal(w.arc.regard('egil'), 1);

  w = toForagers();
  assert.equal(w.arc.answerForagers('bargain').ok, false, 'no paper, no bargain');
  assert.equal(w.arc.writeContract(), true); assert.equal(w.arc.writeContract(), false);
  const tenth = w.arc.answerForagers('bargain');
  assert.deepEqual([tenth.taken, tenth.paper, tenth.party], [1, 1, 'both'], 'a tenth of six is one, and the rebellion’s half of one is one');
  assert.equal(w.arc.regard(NESDOR_ROLES.forseti), 1);

  // A satchel emptied before they came gives them nothing to take.
  w = toForagers();
  w.inventory.remove('floodwheat', 6);
  assert.deepEqual([w.arc.answerForagers('give', { party: 'rebels' }).taken, w.inventory.count(REBEL_PAPER)], [0, 0]);
  const step = w.events.filter(event => event.type === 'lizeem-step').at(-1);
  assert.deepEqual([step.arc, step.from, step.to, step.xp], ['nesdor', 'foragers', 'fine', NESDOR_XP.foragers]);
});

test('Driving the foragers off is a fight when the host can start one, and in words when it cannot', () => {
  const words = walkTo(world(), 'foragers');
  const said = words.arc.answerForagers('drive');
  assert.deepEqual([said.ok, said.fight, said.taken, words.arc.stage()], [true, undefined, 0, 'fine']);

  const w = walkTo(world(), 'foragers'), started = [];
  const startFight = encounter => { started.push(encounter); return true; };
  assert.deepEqual(w.arc.answerForagers('drive', { startFight }), { ok: true, fight: true });
  assert.equal(started[0].id, FORAGER_FIGHT);
  assert.equal(w.arc.fighting, true);
  assert.equal(w.arc.answerForagers('drive', { startFight }).ok, false, 'one fight at a time');
  assert.equal(w.arc.combatEvent({ type: 'victory' }, { encounterId: 'somebody-else' }), false, 'another fight is not this one');
  w.arc.combatEvent({ type: 'retreat' }, { encounterId: FORAGER_FIGHT });
  assert.deepEqual([w.arc.stage(), w.arc.fighting], ['foragers', false], 'a retreat leaves them at the strips');
  w.arc.answerForagers('drive', { startFight });
  w.arc.combatEvent({ type: 'victory' }, { encounterId: FORAGER_FIGHT });
  assert.equal(w.arc.stage(), 'fine');
  assert.deepEqual(w.arc.state.foragers, { answer: 'drive', party: 'both', taken: 0, paper: 0 });
  assert.equal(w.arc.regard(NESDOR_ROLES.bolverk), 1);
  // A host that cannot start the fight (combat already under way) sees it done in words.
  const busy = walkTo(world(), 'foragers');
  assert.equal(busy.arc.answerForagers('drive', { startFight: () => false }).fight, undefined);
  assert.equal(busy.arc.stage(), 'fine');
});

test('The foragers’ fight is a valid arena: three rebels within reach of its centre, clear of the beds and buildings, with the yard to retreat to', () => {
  const fight = foragerEncounter();
  assert.equal(fight.id, FORAGER_FIGHT);
  assert.equal(fight.enemies.length, 3);
  assert.deepEqual(fight.enemies.map(one => one.kind), ['rebel', 'rebel', 'rebel']);
  assert.deepEqual(FORAGERS.map(one => one.party), ['cedric', 'rebels', 'rebels']);
  // src/combat.js `encounterConfig`: across within 12 m, along from -21 to 18 m, nobody beyond the retreat line.
  const sign = fight.retreatSign, along = p => sign * (p.z - fight.center.z), beyond = p => sign * (p.z - fight.retreatZ) >= 0;
  assert.ok(sign * (fight.retreatZ - fight.center.z) > 0, 'the retreat line lies on the arena’s own side');
  assert.equal(beyond(fight.checkpoint), false);
  assert.ok(fight.retreatZ < NESDOR_BUILDINGS.find(b => b.id === 'ninehands-house').z + 10, 'a retreat runs back toward the yard');
  for (const one of fight.enemies) {
    assert.ok(Math.abs(one.x - fight.center.x) <= 12 && along(one) >= -21 && along(one) <= 18 && !beyond(one), one.id);
    assert.equal(nesdorFarmReserved(one.x, one.z, 1), false, `${one.id} stands clear of the beds, buildings and roads`);
    for (const row of NESDOR_FARM_ROWS) assert.ok(Math.hypot(row.x - one.x, row.z - one.z) > 8, `${one.id} is off ${row.id}`);
  }
  assert.deepEqual(foragerEncounter({ x: 'nowhere' }).center, fight.center, 'a centre that is no place falls back to the field');
});

test('Fine floodwheat brought in early is collected as soon as its stage arrives', () => {
  const w = walkTo(world(), 'strips');
  sowStrip(w, BENCH, 'floodwheat'); water(w, BENCH);
  sowStrip(w, RISE, 'bridge-rye');
  w.farming.harvestAll(RISE.beds, 1000);
  sowStrip(w, RISE, 'barley', 1000);
  assert.equal(w.arc.stage(), 'reap');
  w.reaping.reapStrip(BENCH.id, 1000);
  assert.equal(w.arc.state.fineWheat, true, 'watered floodwheat on the bench comes up Fine');
  assert.deepEqual(w.arc.state.reaped.items, { 'floodwheat-fine': 9 });
  w.arc.answerForagers('give', { party: 'cedric' });
  assert.equal(w.arc.stage(), 'carry', 'the Fine floodwheat was already in');
  assert.deepEqual(w.events.filter(event => event.type === 'lizeem-step').map(event => event.to), ['strips', 'reap', 'foragers', 'fine', 'carry']);
});

/** Walks a world to the carry stage with Fine floodwheat in. */
function toCarry(options) {
  const w = walkTo(world(options), 'strips');
  sowStrip(w, BENCH, 'floodwheat'); water(w, BENCH); sowStrip(w, RISE, 'bridge-rye');
  w.farming.harvestAll(RISE.beds, 1000); sowStrip(w, RISE, 'barley', 1000);
  w.reaping.reapStrip(BENCH.id, 1000);
  w.arc.answerForagers('drive');
  assert.equal(w.arc.stage(), 'carry');
  return w;
}
/** A dialogue box that remembers what it was asked to show. */
function box() {
  const shown = [];
  return { shown, last: () => shown.at(-1), openDialogue: (npc, lines, event, label, options = {}) => shown.push({ npc: npc.id, lines, label, options }),
    closeDialogue: () => shown.push({ closed: true }) };
}

test('The sealed bread and cake end the arc at Taleth: the Work of Nine, the long strip offered, the better dish in the Measure, and nothing paid twice', () => {
  const sealed = {}, w = toCarry({ sealed }), taleth = { id: 'taleth', name: 'Taleth' }, d = box(), notes = [];
  const ctx = { nesdor: w.arc, ...d, notify: (...args) => notes.push(args) };
  assert.deepEqual(talethNesdorChoices(taleth, ctx), [], 'nothing to give without the bread and the cake');
  assert.deepEqual(w.arc.markerIds(), [NESDOR_ROLES.aegir, NESDOR_ROLES.idunn], 'the bakes are taught first');
  w.arc.noteTaught('white-bread'); w.arc.noteTaught('nut-cake');
  w.inventory.add('white-bread', 1); w.inventory.add('nut-cake-fine', 1);
  assert.deepEqual(w.arc.markerIds(), ['lizeem-nepri', 'lizeem-consus'], 'unsealed, they go to a measurer');
  const [unsealed] = talethNesdorChoices(taleth, ctx);
  assert.deepEqual([unsealed.id, unsealed.disabled], ['nesdor-deliver-unsealed', true]);
  assert.equal(w.arc.deliver().ok, false);
  sealed['white-bread'] = { count: 1, prize: 0 }; sealed['nut-cake-fine'] = { count: 1, prize: 1 };
  assert.deepEqual(w.arc.markerIds(), ['taleth']);
  const [give] = talethNesdorChoices(taleth, ctx);
  assert.equal(give.id, 'nesdor-deliver');
  give.action();
  assert.equal(w.arc.stage(), 'done');
  assert.deepEqual(w.spells, [WORK_OF_NINE]);
  assert.deepEqual(w.entered, [['nut-cake-fine', 'prize', { country: 'nesdor' }]], 'a Prize cake fills the dish line in gold');
  assert.deepEqual([w.inventory.count('white-bread'), w.inventory.count('nut-cake-fine')], [0, 0]);
  assert.equal(w.long.length, 1);
  assert.ok(w.long[0].level >= 10 && w.long[0].level < 24, 'Baugi is asked at the farmer’s own level');
  assert.equal(w.arc.state.long, 'offered', 'at Farming 10 the long strip is offered, not opened');
  assert.equal(longUnlocked(), false);
  assert.match(d.last().lines.join(' '), /Work of Nine/);
  assert.deepEqual(notes.at(-1), ['The Work of Nine: sow or reap a whole farm in one act.', 'TALETH TAUGHT YOU A FIELD WORKING']);
  const lumps = w.events.filter(event => event.type === 'lizeem-step').map(event => event.xp);
  assert.deepEqual(lumps, [0, NESDOR_XP.strips, NESDOR_XP.reap, NESDOR_XP.foragers, NESDOR_XP.fine, NESDOR_XP.done], 'Build 1’s lumps, each once');
  assert.deepEqual(w.arc.markerIds(), []);
  assert.deepEqual(w.arc.journal().rewards, ['The Work of Nine', 'Baugi’s long strip, at Farming 24']);
  assert.equal(talethNesdorChoices(taleth, ctx).length, 0, 'given once');
  // Reloaded, nothing is learned or paid again.
  const saved = w.arc.snapshot(), again = world();
  assert.equal(again.arc.restore(saved), true);
  assert.deepEqual([again.spells, again.gains.length], [[], 0]);
  assert.equal(again.arc.deliver().ok, false);
});

test('The long strip opens at the end for a farmer of Farming 24, and a save carries its lock both ways', () => {
  const w = toCarry({ level: 24 });
  w.inventory.add('white-bread', 1); w.inventory.add('nut-cake', 1);
  const result = w.arc.deliver();
  assert.deepEqual([result.ok, result.long, result.measured], [true, 'open', null], 'plain dishes fill no line of the Measure');
  assert.equal(longUnlocked(), true);
  assert.deepEqual(w.entered, []);
  const saved = w.arc.snapshot();
  assert.equal(w.arc.restore(undefined), true);
  assert.equal(longUnlocked(), false, 'a new game shuts it again');
  assert.equal(w.arc.restore(saved), true);
  assert.equal(longUnlocked(), true, 'and the save that had it lent opens it');
  lockLong();
  // Offered at a lower level, Baugi lends it once the farmer reaches 24.
  const later = toCarry({ level: 10 });
  later.inventory.add('white-bread', 1); later.inventory.add('nut-cake', 1); later.arc.deliver();
  assert.equal(later.arc.offerLong().ok, false);
  assert.equal(later.arc.state.long, 'offered');
  lockLong();
});

test('The save is checked step by step, and a refused restore leaves the arc as it was', () => {
  assert.equal(validateNesdorArc(undefined), true, 'a save from before Nesdor starts it fresh');
  const w = walkTo(world(), 'foragers'), saved = w.arc.snapshot();
  assert.equal(validateNesdorArc(saved), true);
  const bad = [
    { ...saved, version: 2 }, { ...saved, stage: 'harvest' }, { ...saved, sown: ['floodwheat'] },
    { ...saved, reaped: null }, { ...saved, reaped: { ...saved.reaped, strip: 'atlantis' } }, { ...saved, reaped: { ...saved.reaped, match: 'won' } },
    { ...saved, foragers: { answer: 'give', party: 'cedric', taken: 1, paper: 0 } }, { ...saved, long: 'open' },
    { ...saved, cut: { 'nesdor-bench': { beds: ['nesdor-bench-1'], items: {} } } }, { ...saved, taught: ['fork-stew'] },
    { ...saved, stage: 'arrive', reaped: null, sown: [], contract: true }, [], null,
  ];
  for (const value of bad) assert.equal(validateNesdorArc(value), false, JSON.stringify(value)?.slice(0, 120));
  w.arc.answerForagers('give', { party: 'rebels' });
  const later = w.arc.snapshot();
  assert.equal(validateNesdorArc(later), true);
  assert.equal(validateNesdorArc({ ...later, foragers: { ...later.foragers, answer: 'bargain', party: 'both' } }), false, 'a bargain wants Forseti’s paper');
  assert.equal(validateNesdorArc({ ...later, foragers: { ...later.foragers, paper: 9 } }), false, 'no more paper than grain');
  assert.equal(w.arc.restore({ ...later, stage: 'done' }), false);
  assert.deepEqual(w.arc.snapshot(), later, 'refused, and untouched');
  assert.equal(w.arc.restore(saved), true);
  assert.equal(w.arc.stage(), 'foragers');
  assert.equal(w.arc.restore(undefined), true);
  assert.equal(w.arc.stage(), 'arrive');
  assert.deepEqual(NESDOR_ARC_ITEMS[REBEL_PAPER].type, 'Money');
});

test('The arc rides on the hub: its card, its marks, its leaf of the Measure, its journal and its save', () => {
  const w = world(), q = createLizeemFarmlands();
  const arc = createNesdorArc({ farming: w.farming, reaping: w.reaping, skills: { level: () => 10 }, inventory: w.inventory });
  assert.equal(q.registerArc('nesdor', arc), true);
  assert.equal(arc.meet(), false, 'the hub has not given the charge');
  assert.deepEqual(q.trackableViews().map(card => card.id), [LIZEEM_FARMLANDS.id]);
  q.accept();
  assert.equal(arc.meet(), true);
  const card = q.trackableViews().find(entry => entry.arc === 'nesdor');
  assert.deepEqual([card.id, card.kicker, card.region, card.stage, card.slateId], [`${LIZEEM_FARMLANDS.id}-nesdor`, 'Nesdor · right ground', 'Nesdor', 'strips', LIZEEM_FARMLANDS.id]);
  assert.ok(q.markerIds().includes('baugi'));
  const leaf = q.measureView().leaves.find(entry => entry.id === 'nesdor');
  assert.deepEqual([leaf.walked, leaf.lines.map(entry => entry.name)], [true, ['Floodwheat from the bench', 'Bridge rye from the dry rise', 'Hazelnuts from the valley head', 'White bread and nut cake']]);
  assert.equal(q.enter('nut-cake-fine', 'fine').country, 'nesdor');
  const saved = q.snapshot();
  assert.equal(saved.arcs.nesdor.stage, 'strips');
  assert.equal(validateLizeemFarmlands(saved), true);
  assert.equal(validateLizeemFarmlands({ ...saved, arcs: { nesdor: { ...saved.arcs.nesdor, stage: 'done' } } }), false, 'the arc’s own validator is asked');
  const other = createNesdorArc(), again = createLizeemFarmlands();
  again.registerArc('nesdor', other);
  assert.equal(again.restore(saved), true);
  assert.equal(other.stage(), 'strips');
  assert.deepEqual(q.journal(), [], 'nothing in the journal until Nesdor is done');
});
