import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_FARM_ROWS, CROPS, FARM_ROWS, REST_SECONDS, createFarming, farmRow, farmsteadRows, registerRows } from '../src/farming.js';
import { SKILLS, createSkills } from '../src/skills.js';
import { ICON_KINDS, INVENTORY_ITEMS } from '../src/inventory.js';
import { FOODS } from '../src/consumables.js';
import { RECIPES } from '../src/cooking.js';
import { MILL_TOLL, OVESOS_BED_IDS, OVESOS_CROPS, OVESOS_FOODS, OVESOS_ITEMS, OVESOS_RECIPES, OVESOS_THIRST, ROUND_SECONDS, TURN_SECONDS,
  createCanalTurns, createMill, fitForUnits, measureFor, rightsOrder, turnAt, validateCanalTurns, validateMill } from '../src/canal-turns.js';
import { sourceModule } from './module-loader.js';

/**
 * Build 4 of the Farmlands of the Lizeem (docs/lizeem-farmlands-design.md §5.4 and §7.3, the design of 5 October 2026;
 * built 6 October 2026 under the contract for Builds 4 and 5): the water turns on the Velsorten canal, the measure a
 * turn gives, the fit a planting earns from the water it had, salt, the water dues and their Close, Ezina's mill, the
 * goods of Ovesos and the look of its three crops.
 */
const bed = (reach, n) => `ovesos-${reach}-${n}`;
const [T1, T2, T3, T4] = [1, 2, 3, 4].map(n => bed('tail', n));
const [H1, H2, H3] = [1, 2, 3].map(n => bed('head', n));
/** At seniority 1 Rollo's turn is the fifth of the round, from 960 to 1200 seconds of play; at 5 it is the first, from 0 to 240. */
const LAST = 4 * TURN_SECONDS, FIRST = 0;

/** A satchel that holds anything, so no item needs registering here; `full` refuses everything. */
function satchel(start = {}, { full = false } = {}) {
  const owned = new Map(Object.entries(start));
  return { count: id => owned.get(id) ?? 0, has: id => (owned.get(id) ?? 0) > 0,
    add: (id, n = 1) => { if (full) return false; owned.set(id, (owned.get(id) ?? 0) + n); return true; },
    remove: (id, n = 1) => { if ((owned.get(id) ?? 0) < n) return false; owned.set(id, owned.get(id) - n); return true; } };
}
function skillsAt(level) {
  const skills = createSkills(), saved = skills.snapshot();
  if (level > 1) saved.skills.farming = { xp: SKILLS.farming.thresholds[level - 1] };
  skills.restore(saved);
  return skills;
}
function fixture({ level = 10, seniority = 1, start = {} } = {}) {
  let t = 0;
  const clock = () => t, events = [];
  const inventory = satchel({ 'hard-wheat-seed': 20, 'silver-millet-seed': 20, 'madder-seed': 20, 'barley-seed': 20, 'carrot-seed': 4, ...start });
  const farming = createFarming({ skills: skillsAt(level), inventory, clock, onEvent: event => events.push(event) });
  const canal = createCanalTurns({ farming, clock, onEvent: event => events.push(event) });
  if (seniority !== 1) canal.setSeniority(seniority);
  events.length = 0;
  const at = seconds => { t = seconds; return seconds; };
  const sow = (id, crop, seconds) => { at(seconds); const result = farming.sow(id, crop, seconds); assert.equal(result.ok, true, result.reason); return result; };
  const allot = (id, units, seconds) => { at(seconds); return canal.allot(id, units, seconds); };
  const reap = (id, seconds) => { at(seconds); const result = farming.harvest(id, seconds); assert.equal(result.ok, true, result.reason); return result; };
  return { farming, canal, inventory, events, at, sow, allot, reap };
}

/**
 * Whether the farm asks a country that judges at harvest (`registerCountry(..., { judge: 'harvest' })`) for the fit each
 * time it reads a planting, rather than keeping the fit it was sown with. That is the change to src/farming.js the canal
 * wants from the integrator; until it is made, the tests that need it are marked to do.
 */
function farmJudgesAtHarvest() {
  registerRows([{ id: 'canal-probe-1', country: 'canal-probe', farmstead: 'canal-probe', x: 7300, z: 7300 }]);
  let fit = 0;
  const farming = createFarming({ inventory: satchel({ 'carrot-seed': 1 }) });
  farming.registerCountry('canal-probe', { fit: () => fit, judge: 'harvest' });
  farming.sow('canal-probe-1', 'carrot', 0);
  fit = 2;
  return farming.rowState('canal-probe-1', 1).fit === 2;
}
const AT_HARVEST = farmJudgesAtHarvest() ? {} : { todo: 'src/farming.js keeps the fit a planting was sown with; the canal needs registerCountry’s `judge: "harvest"` (see the canal’s report)' };

test('the Ovesos beds and crops join the farm when the canal is imported, head to tail, and its crops grow only there', () => {
  assert.equal(OVESOS_BED_IDS.length, 12);
  assert.deepEqual([...OVESOS_BED_IDS].sort(), ['head', 'mid', 'tail'].flatMap(reach => [1, 2, 3, 4].map(n => bed(reach, n))).sort());
  for (const id of OVESOS_BED_IDS) {
    const row = farmRow(id), reach = id.split('-')[1];
    assert.deepEqual([row.country, row.farmstead, row.reach], ['ovesos', `velsorten-${reach}`, reach], id);
  }
  assert.deepEqual(farmsteadRows('velsorten-tail').map(row => row.id).sort(), [T1, T2, T3, T4]);
  const fields = id => { const kind = CROPS[id]; return [kind.seconds, kind.xp, kind.level, kind.yield, kind.item, kind.seed, kind.fine, kind.region]; };
  assert.deepEqual(fields('hard-wheat'), [360, 60, 10, 2, 'hard-wheat', 'hard-wheat-seed', 'hard-wheat-fine', 'ovesos']);
  assert.deepEqual(fields('silver-millet'), [150, 24, 1, 3, 'silver-millet', 'silver-millet-seed', 'silver-millet-fine', 'ovesos']);
  assert.deepEqual(fields('madder'), [480, 70, 18, 2, 'madder', 'madder-seed', 'madder-fine', 'ovesos']);
  assert.deepEqual(OVESOS_THIRST, { 'hard-wheat': 3, barley: 2, 'silver-millet': 1, madder: 2 });
  const fx = fixture({ level: 18 });
  assert.ok(fx.farming.countries().includes('ovesos'));
  assert.deepEqual(fx.farming.sowable(T1).map(entry => entry.id).filter(id => Object.hasOwn(OVESOS_THIRST, id)).sort(), ['barley', 'hard-wheat', 'madder', 'silver-millet']);
  assert.match(fx.farming.sow(FARM_ROWS[0].id, 'hard-wheat', 0).reason, /Ovesos/, 'hard wheat grows only on the Ovesos beds');
  assert.match(fixture({ level: 9 }).farming.sow(T1, 'hard-wheat', 0).reason, /level 10/);
});

test('a turn comes every four minutes, oldest right first, and Rollo’s is the fifth of five until his right climbs', () => {
  assert.equal(ROUND_SECONDS, 1200);
  assert.deepEqual(rightsOrder(1).map(right => right.id), ['ziusudra', 'head-farms', 'middle-farms', 'ashnan', 'rollo']);
  assert.deepEqual(rightsOrder(4).map(right => right.id), ['ziusudra', 'rollo', 'head-farms', 'middle-farms', 'ashnan'], 'the arc’s reward: second only to the oldest house');
  assert.deepEqual(rightsOrder(5).map(right => [right.id, right.seniority, right.turn])[0], ['rollo', 5, 1]);
  const first = turnAt(0, 1);
  assert.deepEqual([first.holder.id, first.place, first.rollo, first.nextIn], ['ziusudra', 1, false, LAST]);
  assert.deepEqual([turnAt(LAST, 1).rollo, turnAt(LAST, 1).place, turnAt(LAST, 1).endsIn], [true, 5, TURN_SECONDS]);
  assert.equal(turnAt(LAST + TURN_SECONDS - 1, 1).rollo, true);
  assert.deepEqual([turnAt(ROUND_SECONDS, 1).holder.id, turnAt(ROUND_SECONDS, 1).nextIn], ['ziusudra', LAST], 'a new round');
  for (const seniority of [1, 2, 3, 4, 5]) {
    const start = (5 - seniority) * TURN_SECONDS;
    assert.equal(turnAt(start, seniority).rollo, true, `seniority ${seniority} takes the ${6 - seniority}th turn`);
    assert.equal(turnAt(start + ROUND_SECONDS, seniority).place, 6 - seniority);
    assert.equal(turnAt(start - 1 + (start ? 0 : ROUND_SECONDS), seniority).rollo, false);
  }
  const fx = fixture();
  const view = fx.canal.view(100);
  assert.deepEqual([view.seniority, view.mine, view.holder.name, view.nextIn, view.rolloPlace, view.left], [1, false, 'Ziusudra’s house', LAST - 100, 5, 0]);
  assert.deepEqual(fx.canal.raise(), { ok: true, seniority: 2, from: 1, measure: 5 });
  assert.deepEqual(fx.events.at(-1), { type: 'canal-seniority', seniority: 2, from: 1, measure: 5 });
  assert.equal(fx.canal.view(100).nextIn, 3 * TURN_SECONDS - 100, 'one place up the round');
  assert.equal(fx.canal.setSeniority(5).ok, true);
  assert.match(fx.canal.raise().reason, /oldest/);
  for (const wrong of [0, 6, 2.5, '3']) assert.equal(fx.canal.setSeniority(wrong).ok, false, String(wrong));
  assert.equal(fx.canal.seniority(), 5);
});

test('a turn’s measure is four units at the newest right and eight at the oldest, spent at the divider in Rollo’s own turn', () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(measureFor), [4, 5, 6, 7, 8]);
  const fx = fixture();
  fx.sow(T1, 'barley', 900); fx.sow(T2, 'silver-millet', 900); fx.sow(T3, 'hard-wheat', 900); fx.sow(T4, 'carrot', 900);
  const early = fx.allot(T1, 1, 900);
  assert.deepEqual([early.ok, early.nextIn], [false, 60]);
  assert.match(early.reason, /not your turn.+Ashnan’s plot/);
  assert.match(fx.allot(T4, 1, LAST).reason, /not a canal crop/);
  assert.match(fx.allot(bed('mid', 1), 1, LAST).reason, /Sow it first/);
  assert.match(fx.allot(FARM_ROWS[0].id, 1, LAST).reason, /not on the canal/);
  for (const wrong of [0, 1.5, -1, '2']) assert.match(fx.allot(T1, wrong, LAST).reason, /whole units/, String(wrong));
  const barley = fx.allot(T1, 2, LAST);
  assert.deepEqual([barley.ok, barley.total, barley.thirst, barley.fit, barley.left, barley.salted, barley.exempt], [true, 2, 2, 2, 2, false, false]);
  assert.equal(fx.allot(T2, 1, LAST + 10).left, 1);
  assert.match(fx.allot(T3, 3, LAST + 20).reason, /Only 1 unit of your measure is left/);
  assert.equal(fx.allot(T3, 1, LAST + 20).left, 0);
  assert.match(fx.allot(T3, 1, LAST + 30).reason, /spent/);
  assert.deepEqual(fx.events.filter(event => event.type === 'canal-allotted').map(event => [event.row, event.units]), [[T1, 2], [T2, 1], [T3, 1]]);
  const next = fx.canal.view(LAST + ROUND_SECONDS);
  assert.deepEqual([next.mine, next.measure, next.used, next.left], [true, 4, 0, 4], 'the measure comes again with the next round');
  assert.match(fx.allot(T1, 1, LAST + ROUND_SECONDS).reason, /ripe/, 'a ripe bed wants reaping, not water');
});

test('the fit comes from the units a planting received: its exact thirst is 2, one short 1, and anything else 0', () => {
  const table = { 'hard-wheat': [0, 0, 1, 2, 0], barley: [0, 1, 2, 0, 0], 'silver-millet': [1, 2, 0, 0, 0], madder: [0, 1, 2, 0, 0], carrot: [0, 0, 0, 0, 0] };
  for (const [crop, fits] of Object.entries(table)) assert.deepEqual(fits.map((_, units) => fitForUnits(crop, units)), fits, crop);
  const fx = fixture({ seniority: 5 });
  fx.sow(H1, 'hard-wheat', FIRST); fx.sow(H2, 'silver-millet', FIRST);
  const beds = () => fx.canal.view(FIRST + 5).beds;
  assert.deepEqual(beds()[H1], { reach: 'head', crop: 'hard-wheat', units: 0, thirst: 3, fit: 0, salt: false });
  assert.equal(beds()[H2].fit, 1, 'millet with no water at all is only one short');
  assert.deepEqual([1, 1, 1, 1].map(() => fx.allot(H1, 1, FIRST + 5).fit), [0, 1, 2, 0], 'the fourth unit is one too many');
  assert.equal(fx.allot(H2, 1, FIRST + 6).fit, 2);
  assert.deepEqual([fx.canal.fit(H1, 'hard-wheat'), fx.canal.fit(H2, 'silver-millet')], [0, 2], 'what the farm is told');
  assert.deepEqual([fx.canal.fit(H3, 'hard-wheat'), fx.canal.fit(H3, 'carrot')], [2, 0], 'a bed still to be sown is promised its thirst’s fit');
});

test('the farm grades a canal harvest by the water its planting had, not by the promise it was sown with', AT_HARVEST, () => {
  const fx = fixture({ seniority: 5 });
  for (const id of [H1, H2, H3]) assert.equal(fx.sow(id, 'hard-wheat', FIRST).fit, 2, 'promised at sowing');
  fx.allot(H1, 3, FIRST); fx.allot(H2, 2, FIRST);
  assert.equal(fx.farming.water(H1, FIRST).ok, true);
  assert.deepEqual([H1, H2, H3].map(id => fx.farming.rowState(id, 10).fit), [2, 1, 0]);
  const reaped = [H1, H2, H3].map(id => fx.reap(id, 360));
  assert.deepEqual(reaped.map(result => [result.grade, result.produce]), [['fine', 'hard-wheat-fine'], ['good', 'hard-wheat'], ['plain', 'hard-wheat']],
    'exact water, the can and Farming 10 come up Fine; one unit short is Good; none is Plain');
  assert.deepEqual(fx.canal.view(400).beds[H1], { reach: 'head', crop: null, units: 0, thirst: null, fit: null, salt: false }, 'the water went with the crop');
});

test('water past the thirst salts the bed, and the next crop in it comes to nothing unless it is barley or the bed rested a game day', () => {
  const fx = fixture({ seniority: 5 });
  const [X, Y, Z] = [H1, H2, H3];
  fx.sow(X, 'barley', FIRST); fx.sow(Y, 'barley', FIRST); fx.sow(Z, 'silver-millet', FIRST);
  assert.deepEqual([fx.allot(X, 3, FIRST).salted, fx.allot(Y, 3, FIRST).salted, fx.allot(Z, 2, FIRST).salted], [true, true, true]);
  assert.deepEqual([X, Y, Z].map(id => fx.canal.view(10).salt[id]), [true, true, true]);
  assert.match(fx.farming.describeBed(X, 10).text, /more than it wants.+salt coming up white/);
  for (const id of [X, Y, Z]) fx.reap(id, 240);
  assert.equal(fx.canal.salted(X, 240), true, 'the salt stays in the bed after the crop');
  assert.deepEqual([fx.canal.fit(X, 'hard-wheat', { playSeconds: 240 }), fx.canal.fit(X, 'barley', { playSeconds: 240 })], [0, 2], 'barley stands salt');
  // Sown into the salt: the wheat is spoiled whatever water it has; the barley is not. Either crop takes the salt.
  fx.sow(X, 'hard-wheat', 1100); fx.sow(Y, 'barley', 1100);
  assert.deepEqual([fx.canal.view(1100).beds[X].spoiled, fx.canal.view(1100).beds[Y].spoiled], [true, undefined]);
  assert.deepEqual([fx.canal.salted(X, 1100), fx.canal.salted(Y, 1100)], [false, false]);
  assert.deepEqual([fx.allot(X, 3, ROUND_SECONDS).fit, fx.allot(Y, 2, ROUND_SECONDS).fit], [0, 2]);
  assert.match(fx.farming.describeBed(X, ROUND_SECONDS).text, /went into salted ground/);
  // Left bare a whole game day, the salt rests out of the bed.
  assert.equal(fx.canal.salted(Z, 240 + REST_SECONDS - 1), true);
  assert.equal(fx.canal.salted(Z, 240 + REST_SECONDS), false);
  fx.sow(Z, 'hard-wheat', 240 + REST_SECONDS);
  assert.equal(fx.canal.view(240 + REST_SECONDS).beds[Z].spoiled, undefined);
});

test('dues are a measure of grain for every ten units drawn, millet’s water draws none, and the Close takes grain plain before fine', () => {
  const fx = fixture({ seniority: 5 });
  fx.sow(H1, 'barley', FIRST); fx.sow(H2, 'silver-millet', FIRST); fx.sow(H3, 'hard-wheat', FIRST);
  fx.allot(H1, 2, FIRST); fx.allot(H2, 1, FIRST); fx.allot(H3, 3, FIRST);
  assert.deepEqual(fx.canal.dues(), { owed: 0, drawn: 5, toNext: 5, exempt: 1, paid: 0 }, 'the millet’s unit is not counted');
  assert.equal(fx.canal.restore({ ...fx.canal.snapshot(), drawn: 25 }), true);
  assert.deepEqual([fx.canal.dues().owed, fx.canal.dues().toNext], [2, 5]);
  assert.match(fx.reap(H1, 240).notes.join(' '), /owing 2 measures of grain in water dues/);
  assert.deepEqual(fx.reap(H2, 240).notes, [], 'millet pays nothing and hears nothing of it');
  const bag = satchel({ 'barley-fine': 3, 'hard-wheat': 1, 'hard-wheat-fine': 3 });
  const close = fx.canal.settle(bag);
  assert.deepEqual(close, { ok: true, owed: 2, paid: 2, short: 0, items: { 'hard-wheat': 1, 'barley-fine': 1 } }, 'plain hard wheat before fine barley');
  assert.deepEqual([bag.count('hard-wheat'), bag.count('barley-fine'), bag.count('hard-wheat-fine')], [0, 2, 3]);
  assert.deepEqual(fx.canal.dues(), { owed: 0, drawn: 5, toNext: 5, exempt: 1, paid: 2 });
  assert.deepEqual(fx.canal.settle(bag), { ok: true, owed: 0, paid: 0, short: 0, items: {} }, 'nothing owed, nothing taken');
  fx.canal.restore({ ...fx.canal.snapshot(), drawn: 30 });
  const short = fx.canal.settle(satchel({ barley: 1 }));
  assert.deepEqual([short.ok, short.paid, short.short, fx.canal.dues().owed], [false, 1, 2, 2]);
  assert.match(short.reason, /2 measures of grain short.+next Harvest Close/);
  assert.equal(fx.canal.settle(null).ok, false);
  assert.deepEqual(fx.canal.payDues(1), { ok: true, owed: 2, paid: 1, short: 1 }, 'the arc’s own Close writes what it took off the register');
  assert.deepEqual(fx.canal.payDues(5), { ok: true, owed: 1, paid: 1, short: 0 });
  assert.equal(fx.canal.payDues(0).ok, false);
  assert.deepEqual(fx.events.filter(event => event.type === 'canal-dues-settled').map(event => event.paid), [2, 1, 1, 1]);
});

test('water taken out of turn cuts Rollo’s next turn short, and the Council can give it back', () => {
  const fx = fixture();
  fx.at(100);
  assert.deepEqual(fx.canal.shortNext(0.5, 100), { ok: true, turn: 4, units: 2, startsIn: LAST - 100 });
  assert.deepEqual([fx.canal.view(LAST).measure, fx.canal.view(LAST).left], [2, 2], 'half a measure short');
  assert.deepEqual(fx.canal.restoreShort(LAST + 40), { ok: true, units: 2, turn: 4, lost: false });
  assert.equal(fx.canal.view(LAST + 40).left, 4, 'given back before it was lost');
  assert.match(fx.canal.restoreShort(LAST + 40).reason, /No turn/);
  fx.canal.shortNext(0.5, 100);
  const later = LAST + ROUND_SECONDS;
  assert.deepEqual(fx.canal.restoreShort(LAST + 300), { ok: true, units: 2, turn: 9, lost: true }, 'a cut already lost comes back on the next turn');
  assert.deepEqual([fx.canal.view(later).measure, fx.canal.view(later + ROUND_SECONDS).measure], [6, 4]);
  // A cut still to come follows Rollo's turn when his right climbs.
  const moved = fixture();
  moved.at(100); moved.canal.shortNext(0.5, 100);
  moved.at(200); moved.canal.setSeniority(2);
  assert.deepEqual([moved.canal.view(3 * TURN_SECONDS).measure, moved.canal.view(3 * TURN_SECONDS).adjust], [3, { turn: 3, units: 2 }]);
  for (const wrong of [0, 1.5, -0.5, 0.1]) assert.equal(moved.canal.shortNext(wrong, 300).ok, false, String(wrong));
});

test('the canal says when Rollo’s turn comes, once a turn', () => {
  const fx = fixture();
  assert.equal(fx.canal.update(100), null);
  assert.deepEqual(fx.canal.update(LAST + 1), { type: 'canal-turn', turn: 4, measure: 4, left: 4, endsIn: TURN_SECONDS - 1 });
  assert.equal(fx.canal.update(LAST + 30), null);
  assert.equal(fx.canal.update(LAST + ROUND_SECONDS).turn, 9);
  assert.deepEqual(fx.events.filter(event => event.type === 'canal-turn').map(event => event.turn), [4, 9]);
});

test('Sound the Soil on a canal bed reads its place on the canal, the water its crop has had, and the turn', () => {
  const fx = fixture();
  assert.match(fx.farming.describeBed(T1, 100).text, /^A plot at the dry tail of the canal.+Hard wheat wants three units.+comes in about 860 seconds\.$/);
  assert.match(fx.farming.describeBed(H1, 100).text, /^A plot at the head of the canal, by the river/);
  fx.sow(T1, 'hard-wheat', 900);
  fx.allot(T1, 2, LAST);
  assert.match(fx.farming.describeBed(T1, LAST).text, /Hard wheat is in it, and has had 2 units of the 3 it wants: 1 more on your turn.+your turn at the divider, and 2 units of your measure are left/);
  fx.sow(T2, 'carrot', LAST);
  assert.match(fx.farming.describeBed(T2, LAST).text, /takes its water from the can/);
});

test('Ezina’s mill grinds two sheaves into a measure of flour and keeps every sixteenth measure, until the toll is waived', () => {
  const events = [], mill = createMill({ clock: () => 50, onEvent: event => events.push(event) });
  const bag = satchel({ 'hard-wheat': 40, 'hard-wheat-fine': 4, barley: 4 });
  assert.deepEqual(mill.grind(bag, 2), { ok: true, item: 'hard-wheat-flour', grain: 2, made: 1, toll: 0, flour: 1, quantity: 1, waived: false, at: 50 });
  assert.equal(mill.grind(bag, 3).grain, 2, 'an odd sheaf stays in the satchel');
  const big = mill.grind(bag, 30);
  assert.deepEqual([big.made, big.toll, big.flour], [15, 1, 14], 'the sixteenth measure is the miller’s');
  assert.deepEqual([bag.count('hard-wheat'), bag.count('hard-wheat-flour')], [6, 16]);
  assert.equal(mill.grind(bag, 2, { item: 'hard-wheat-fine' }).item, 'hard-wheat-flour-fine');
  assert.match(mill.grind(bag, 1).reason, /Two sheaves/);
  assert.match(mill.grind(bag, 20).reason, /You have 6 sheaves/);
  assert.match(mill.grind(bag, 2, { item: 'barley' }).reason, /hard wheat/);
  // The toll is every sixteenth measure however the grinding is split.
  const split = createMill(), once = createMill(), a = satchel({ 'hard-wheat': 32 }), b = satchel({ 'hard-wheat': 32 });
  for (let n = 0; n < 16; n++) split.grind(a, 2);
  once.grind(b);
  assert.deepEqual([a.count('hard-wheat-flour'), b.count('hard-wheat-flour')], [15, 15]);
  // The contract's call, from the mill's own satchel, and the arc's reward.
  const own = satchel({ 'hard-wheat': 32 }), ezina = createMill({ inventory: own });
  assert.equal(ezina.tollWaived(), false);
  assert.deepEqual(ezina.waiveToll(), { ok: true, first: true });
  assert.deepEqual([ezina.tollWaived(), ezina.waiveToll().first], [true, false]);
  assert.deepEqual([ezina.grind('hard-wheat', 32).flour, own.count('hard-wheat-flour')], [16, 16], 'Rollo’s wheat is ground for nothing');
  assert.equal(createMill().tollWaived(true), true);
  const full = satchel({ 'hard-wheat': 4 }, { full: true });
  assert.match(createMill().grind(full, 4).reason, /no room/);
  assert.equal(full.count('hard-wheat'), 4, 'the wheat is handed back');
  // Saved and restored.
  const saved = mill.snapshot();
  assert.deepEqual(saved, { version: 1, milled: 18, tolls: 1, waived: false });
  assert.equal(validateMill(saved), true);
  const back = createMill();
  assert.equal(back.restore(saved), true);
  assert.deepEqual(back.view(), { milled: 18, tolls: 1, waived: false, toNextToll: MILL_TOLL - 2 });
  for (const data of [{ ...saved, tolls: 2 }, { ...saved, milled: -1 }, { ...saved, waived: 1 }, { ...saved, version: 2 }, null]) assert.equal(validateMill(data), false, JSON.stringify(data));
  assert.equal(back.restore(undefined), true);
  assert.deepEqual(back.snapshot(), { version: 1, milled: 0, tolls: 0, waived: false });
  assert.deepEqual(events.map(event => event.type), ['mill-ground', 'mill-ground', 'mill-ground', 'mill-ground']);
});

test('the canal’s save keeps its seniority, its turn, its plantings, its salt and its dues, and refuses one it did not write', () => {
  const fx = fixture({ seniority: 5 });
  fx.sow(H1, 'barley', FIRST); fx.sow(H2, 'silver-millet', FIRST);
  fx.allot(H1, 3, FIRST); fx.allot(H2, 1, FIRST);
  fx.canal.shortNext(0.5, 10);
  const saved = fx.canal.snapshot();
  assert.deepEqual(saved, { version: 1, seniority: 5, turn: { index: 0, used: 4 }, adjust: { turn: 5, units: 4 },
    plantings: { [H1]: { crop: 'barley', units: 3 }, [H2]: { crop: 'silver-millet', units: 1 } }, salt: { [H1]: null }, drawn: 3, exempt: 1, paid: 0 });
  assert.equal(validateCanalTurns(saved, { playSeconds: 10 }), true);
  const back = createCanalTurns();
  assert.equal(back.restore(saved), true);
  assert.deepEqual(back.snapshot(), saved);
  assert.equal(back.view(FIRST + 5).left, 4, 'the turn’s spent units are remembered');
  fx.reap(H1, 240);
  assert.deepEqual(fx.canal.snapshot().salt, { [H1]: 240 }, 'resting from the harvest');
  const wrong = [
    { ...saved, version: 2 }, { ...saved, seniority: 0 }, { ...saved, seniority: 6 }, { ...saved, turn: { index: 0, used: 0 } }, { ...saved, turn: { index: 0, used: 17 } },
    { ...saved, adjust: { turn: 5, units: 0 } }, { ...saved, adjust: { turn: 5, units: 9 } }, { ...saved, plantings: { [FARM_ROWS[0].id]: { crop: 'barley', units: 1 } } },
    { ...saved, plantings: { [H1]: { crop: 'carrot', units: 1 } } }, { ...saved, plantings: { [H1]: { crop: 'barley', units: 1.5 } } },
    { ...saved, plantings: { [H1]: { crop: 'barley', units: 1, spoiled: false } } }, { ...saved, salt: { [H3]: null } }, { ...saved, salt: { [H1]: -1 } },
    { ...saved, drawn: -1 }, { ...saved, exempt: 0.5 }, { ...saved, paid: '0' }, null, [],
  ];
  for (const data of wrong) assert.equal(validateCanalTurns(data), false, JSON.stringify(data));
  assert.equal(validateCanalTurns({ ...saved, turn: { index: 5, used: 1 } }, { playSeconds: 1000 }), false, 'a turn not yet come');
  assert.equal(validateCanalTurns({ ...saved, salt: { [H3]: 500 } }, { playSeconds: 400 }), false, 'salt resting from a harvest still to come');
  assert.equal(validateCanalTurns(undefined), true);
  assert.equal(validateCanalTurns(undefined, { allowMissing: false }), false);
  assert.equal(back.restore({ ...saved, seniority: 9 }), false);
  assert.deepEqual([back.seniority(), back.snapshot().drawn, back.snapshot().plantings], [1, 0, {}], 'a refused save leaves a fresh canal');
  assert.equal(back.restore(undefined), true);
  assert.equal(validateCanalTurns({ ...saved, adjust: undefined }), true, 'a save without a cut is whole');
});

test('the goods of Ovesos are whole satchel items, larder foods and kitchen recipes for the game to spread in', () => {
  const foods = Object.keys(OVESOS_FOODS), edible = Object.keys(OVESOS_ITEMS).filter(id => OVESOS_ITEMS[id].type === 'Food');
  assert.deepEqual(foods.sort(), edible.sort(), 'every food is a satchel item and every Food item is edible');
  const heals = { flatbread: 30, 'flatbread-fine': 40, 'millet-porridge': 30, 'millet-porridge-fine': 40, mutton: 25 };
  assert.deepEqual(Object.keys(heals).sort(), foods.sort());
  for (const [id, healing] of Object.entries(heals)) {
    assert.equal(OVESOS_FOODS[id].healing, healing, id);
    assert.match(OVESOS_ITEMS[id].brief, new RegExp(`Restores up to ${healing} health`), id);
    assert.match(OVESOS_ITEMS[id].description, new RegExp(`Restores up to ${healing} health`), id);
    assert.match(OVESOS_FOODS[id].missing, /^You have no .+\. .+\.$/, id);
    assert.ok(OVESOS_ITEMS[id].stackable && OVESOS_ITEMS[id].eatName && Object.isFrozen(OVESOS_FOODS[id]), id);
  }
  for (const [id, item] of Object.entries(OVESOS_ITEMS)) {
    assert.ok(item.name && item.type && item.brief && item.description && item.stackable && ICON_KINDS.includes(item.icon), id);
    if (Object.hasOwn(INVENTORY_ITEMS, id)) assert.equal(INVENTORY_ITEMS[id], item, `${id} is the same entry once the satchel spreads it in`);
    if (Object.hasOwn(FOODS, id)) assert.equal(FOODS[id], OVESOS_FOODS[id]);
  }
  assert.equal(Object.hasOwn(OVESOS_ITEMS, 'water-right'), false, 'a water right is a line in Nisaba’s register, not a thing in the satchel');
  for (const id of ['cloth', 'hard-wheat-flour', 'hard-wheat-flour-fine']) assert.equal(OVESOS_ITEMS[id].type, 'Material', id);
  for (const crop of OVESOS_CROPS) for (const id of [crop.item, `${crop.item}-fine`, crop.seed]) assert.ok(OVESOS_ITEMS[id], `${id} is an item`);
  assert.deepEqual(OVESOS_RECIPES.flatbread.needs, { 'hard-wheat-flour': 2 });
  assert.deepEqual(OVESOS_RECIPES['millet-porridge'].needs, { 'silver-millet': 2 });
  for (const plainId of ['flatbread', 'millet-porridge']) {
    const plain = OVESOS_RECIPES[plainId], fine = OVESOS_RECIPES[plain.fine];
    assert.equal(fine.fineOf, plainId);
    assert.equal(OVESOS_FOODS[fine.makes].healing, OVESOS_FOODS[plain.makes].healing + 10);
    assert.deepEqual(Object.keys(fine.needs).map(need => need.replace(/-fine$/, '')), Object.keys(plain.needs));
    for (const recipe of [plain, fine]) {
      assert.ok(OVESOS_ITEMS[recipe.makes] && Object.keys(recipe.needs).every(id => OVESOS_ITEMS[id]), recipe.id);
      if (Object.hasOwn(RECIPES, recipe.id)) assert.equal(RECIPES[recipe.id], recipe);
    }
  }
});

test('the beds draw hard wheat short and golden, silver millet with small pale nodding heads, and madder sprawling with red roots when ripe', async () => {
  const THREE = await import('../vendor/three.module.js');
  const { createFarmingView } = await sourceModule('../src/farming-view.js');
  const [wheat, millet, madder, young] = [T1, T2, T3, T4];
  const growing = { [wheat]: ['hard-wheat', 1], [millet]: ['silver-millet', 1], [madder]: ['madder', 1], [young]: ['madder', 0.5] };
  const farming = { rowState: id => { const [crop, progress] = growing[id] ?? [null, 0];
    return { ...farmRow(id), stage: !crop ? 'bare' : progress >= 1 ? 'ripe' : 'sown', crop, progress, watered: false, heart: 2 }; } };
  const scene = new THREE.Scene(), view = createFarmingView({ scene, world: { heightAt: () => 6 }, farming });
  view.update(0, farmRow(wheat));
  // The beds' groups come first in the view's group, in the farm's order (src/farming-view.js).
  const part = (id, name) => view.group.children[ALL_FARM_ROWS.findIndex(row => row.id === id)].children.find(mesh => new RegExp(name).test(mesh.name));
  const pose = (id, name) => { const matrix = new THREE.Matrix4(), turn = new THREE.Euler(), scale = new THREE.Vector3(), q = new THREE.Quaternion();
    part(id, name).getMatrixAt(0, matrix); matrix.decompose(new THREE.Vector3(), q, scale); turn.setFromQuaternion(q); return { turn, scale }; };
  assert.equal(part(wheat, 'crop produce').material.color.getHex(), 0xd9ab3f, 'golden ears');
  assert.ok(Math.abs(pose(wheat, 'crop produce').turn.x) < 1e-9 && Math.abs(pose(wheat, 'crop stalks').turn.x) < 1e-9, 'stiff: ears and straw stand straight');
  assert.ok(pose(wheat, 'crop stalks').scale.y < 1 && pose(wheat, 'crop stalks').scale.y > .8, 'short in the straw');
  assert.ok(pose(wheat, 'crop produce').scale.x > pose(millet, 'crop produce').scale.x, 'dense ears beside the millet’s small heads');
  assert.equal(part(millet, 'crop produce').material.color.getHex(), 0xd3d4c8, 'pale silver heads');
  assert.ok(pose(millet, 'crop produce').turn.x > .2, 'a millet head nods');
  assert.equal(part(madder, 'crop produce').material.color.getHex(), 0xa3352b, 'red roots');
  assert.equal(part(madder, 'crop produce').visible, true);
  assert.equal(part(young, 'crop produce').visible, false, 'the roots show only when ripe');
  assert.ok(Math.abs(pose(madder, 'crop stalks').turn.x) > .5, 'the stems sprawl');
  assert.ok(pose(madder, 'crop leaves').scale.y < pose(madder, 'crop leaves').scale.x / 3, 'whorls lie flat round the stem');
  view.dispose();
});
