import test from 'node:test';
import assert from 'node:assert/strict';
import { createFarming } from '../src/gameplay/skills/farming/farming.js';
import { createCanalTurns, createMill, TURN_SECONDS as CANAL_TURN_SECONDS } from '../src/content/regions/oves/canal-turns.js';
import {
  createOvesosArc, validateOvesosArc, talethOvesosChoices,
  OVESOS_STAGES, OVESOS_XP, OVESOS_BEDS, TAIL_BEDS, OVESOS_BEDS_BY_REACH, HEAD_STRETCHES, TURN_SECONDS,
  SETTLE_COPPER, ASHNAN_DUES, WATER_RIGHT_PRICE, WATER_RIGHT_LEVEL, SENIORITY, REACH_SENIORITY,
} from '../src/content/quests/lizeem-farmlands/lizeem-ovesos.js';
import { createLizeemFarmlands, validateLizeemFarmlands, MEASURE_LEAVES, TALETH_ID } from '../src/content/quests/lizeem-farmlands/lizeem-farmlands.js';
import { GAME_DAY_SECONDS } from '../src/gameplay/inventory/merchants.js';
import { COPPER_ITEM } from '../src/gameplay/inventory/economy.js';

const [T1, T2, T3, T4] = TAIL_BEDS;

/** A satchel that counts. */
function satchel() {
  const stock = new Map();
  return { stock,
    count: id => stock.get(id) ?? 0,
    add: (id, n = 1) => { stock.set(id, (stock.get(id) ?? 0) + n); return true; },
    remove: (id, n = 1) => { if ((stock.get(id) ?? 0) < n) return false; stock.set(id, stock.get(id) - n); return true; },
    items: () => [...stock].filter(([, n]) => n > 0).map(([id]) => id) };
}

/** The real farm, the real canal and Ezina's real mill on one clock, a satchel, and skills and magic that remember. */
function velsorten({ level = 12 } = {}) {
  let t = 1, farmingLevel = level;
  const clock = () => t, inventory = satchel(), gains = [], spells = [], events = [];
  const skills = { known: () => true, learn: () => ({ ok: true }), level: id => (id === 'farming' ? farmingLevel : 1),
    gain: (id, n) => { gains.push([id, n]); return { ok: true, levelled: false }; } };
  const magic = { learn: id => { spells.push(id); return { ok: true, id }; } };
  const farming = createFarming({ skills, inventory, clock });
  const canal = createCanalTurns({ farming, clock });
  const mill = createMill({ clock });
  const arc = createOvesosArc({ farming, canal, mill, skills, magic, inventory, clock, onEvent: event => events.push(event) });
  for (const seed of ['barley-seed', 'silver-millet-seed', 'hard-wheat-seed']) inventory.add(seed, 8);
  return { arc, farming, canal, mill, inventory, gains, spells, events, setLevel: n => { farmingLevel = n; },
    at: seconds => { t = seconds; }, wait: seconds => { t += seconds; }, now: () => t };
}
const lumps = events => events.filter(event => event.type === 'lizeem-step').map(event => event.xp).filter(Boolean);
/** On to Rollo's next turn at the divider, unless it is running now. */
function toTurn(h) {
  const turn = h.canal.turn(h.now());
  if (!turn.rollo) h.at(turn.nextAt + 1);
  return h.canal.turn(h.now());
}
const box = () => {
  const shown = [];
  return { shown, openDialogue: (npc, lines, event, label, options = {}) => shown.push({ npc: npc.id, lines, options }), closeDialogue: () => shown.push({ closed: true }) };
};
const sealedFine = { sealed: id => ({ count: id.endsWith('-fine') ? 1 : 0, prize: 0 }) };

/** Walks the arc to the named stage the way a player would, on the real canal. */
function walk(h, to, { answer = 'register' } = {}) {
  const { arc, farming, inventory } = h, stop = () => arc.stage() === to;
  if (stop()) return h;
  arc.enter(); if (stop()) return h;
  arc.learnTurns(); if (stop()) return h;
  toTurn(h);
  farming.sow(T1, 'barley', h.now()); farming.sow(T2, 'silver-millet', h.now());
  assert.equal(arc.allot(T1, 2, h.now()).ok, true, 'barley is given its two');
  assert.equal(arc.allot(T2, 1, h.now()).ok, true, 'millet its one');
  arc.learnSalt(); if (stop()) return h;
  for (let i = 0; i < HEAD_STRETCHES; i++) { assert.equal(arc.workHead(h.now()).ok, true); h.wait(TURN_SECONDS); }
  assert.equal(farming.harvest(T1, h.now()).grade, 'good', 'barley given its thirst comes in full');
  if (stop()) return h;
  farming.sow(T3, 'hard-wheat', h.now()); farming.water(T3, h.now()); arc.observe(h.now());
  if (stop()) return h;
  toTurn(h);
  assert.equal(arc.allot(T3, 3, h.now()).ok, true, 'hard wheat its three, from the half turn that came down');
  h.wait(60);
  assert.equal(farming.harvest(T3, h.now()).grade, 'fine');
  if (answer !== 'settle') arc.consult(answer);
  if (answer === 'settle') inventory.add(COPPER_ITEM, SETTLE_COPPER);
  assert.equal(arc.answerHearing(answer).ok, true);
  if (stop()) return h;
  assert.equal(arc.grind('hard-wheat-fine', 2).ok, true); if (stop()) return h;
  inventory.add('flatbread-fine', 1);
  const d = box();
  talethOvesosChoices({ id: TALETH_ID }, { ovesos: arc, inventory, ...d })[0].action();
  return h;
}

test('The arc walks its ten stages in order on the real canal, and pays each lump once as its stage is left', () => {
  assert.deepEqual(OVESOS_STAGES, ['arrive', 'register', 'turns', 'canal', 'wheat', 'hearing', 'fine', 'mill', 'carry', 'done']);
  assert.equal(TURN_SECONDS, CANAL_TURN_SECONDS, 'the head is dug between the canal’s own turns');
  assert.deepEqual(OVESOS_BEDS, [...OVESOS_BEDS_BY_REACH.head, ...OVESOS_BEDS_BY_REACH.mid, ...OVESOS_BEDS_BY_REACH.tail]);
  const h = velsorten(), { arc, farming, canal, inventory } = h;
  assert.equal(arc.stage(), 'arrive');
  assert.equal(arc.learnTurns(), false, 'Nisaba first');
  assert.equal(arc.canSow(T1).ok, false, 'no plot before the register');
  // Nisaba writes him in: the most junior right, the tail.
  assert.equal(arc.enter(), true);
  assert.deepEqual([arc.stage(), canal.seniority()], ['register', SENIORITY.least]);
  assert.equal(arc.enter(), false, 'entered once');
  assert.equal(arc.learnTurns(), true);
  assert.equal(arc.stage(), 'turns');
  // The first turn: barley and millet at the tail, the measure divided, and salt.
  const waiting = canal.turn(h.now());
  assert.equal(waiting.rollo, false, 'the newest right waits for the fifth turn');
  assert.match(arc.allot(T1, 2, h.now()).reason, /not your turn/);
  toTurn(h);
  farming.sow(T1, 'barley', h.now()); farming.sow(T2, 'silver-millet', h.now());
  assert.equal(arc.allot(T1, 2, h.now()).ok, true);
  const greedy = arc.allot(T2, 2, h.now());
  assert.deepEqual([greedy.ok, greedy.salted], [true, true], 'millet given two of its one leaves salt');
  assert.equal(arc.stage(), 'canal', 'the salt is seen in the bed, and the turn is taken');
  assert.ok(h.events.some(event => event.type === 'ovesos-salt-seen'));
  // The head, a stretch between turns, and a full barley harvest; the Council moves him up a turn.
  assert.equal(arc.workHead(h.now()).stretch, 1);
  assert.match(arc.workHead(h.now()).reason, /between turns/);
  h.wait(TURN_SECONDS); arc.workHead(h.now());
  h.wait(TURN_SECONDS);
  assert.equal(farming.harvest(T1, h.now()).grade, 'good');
  assert.equal(arc.stage(), 'canal', 'two stretches of three');
  assert.deepEqual(arc.workHead(h.now()), { ok: true, stretch: 3, cleared: true });
  assert.deepEqual([arc.stage(), canal.seniority()], ['wheat', 2]);
  // Hard wheat sown just before his turn: Ziusudra's house draws out of turn, and the turn comes down half short.
  h.at(canal.turn(h.now()).nextAt - 20);
  farming.sow(T3, 'hard-wheat', h.now()); farming.sow(T4, 'barley', h.now()); arc.observe(h.now());
  assert.equal(arc.stage(), 'hearing');
  assert.ok(h.events.some(event => event.type === 'ovesos-out-of-turn'));
  const turn = toTurn(h);
  assert.equal(arc.view().short, turn.index, 'the short turn is the next of his');
  assert.equal(arc.allot(T3, 3, h.now()).ok, true, 'three of the five came down');
  const short = arc.allot(T4, 1, h.now());
  assert.deepEqual([short.ok, short.short], [false, true]);
  assert.match(short.reason, /Ziusudra/);
  farming.water(T3, h.now()); h.wait(CANAL_TURN_SECONDS * 2);
  assert.equal(farming.harvest(T3, h.now()).grade, 'fine', 'the Fine wheat may come in while the hearing waits');
  // The register wins outright: up a turn, the half turn given back.
  assert.equal(arc.answerHearing('register').ok, false, 'not from a page he has not read');
  assert.equal(arc.consult('register'), true);
  assert.deepEqual(arc.answerHearing('register'), { ok: true, answer: 'register', raised: true, seniority: 3 });
  assert.equal(arc.stage(), 'mill', 'the Fine wheat was in already');
  assert.equal(arc.view().short, null);
  // The mill: Fine wheat ground for the sixteenth.
  assert.equal(arc.grind('barley', 2).ok, false, 'Ezina grinds hard wheat');
  assert.equal(arc.grind('hard-wheat-fine', 2).ok, true);
  assert.deepEqual([arc.stage(), inventory.count('hard-wheat-flour-fine')], ['carry', 1]);
  assert.deepEqual(lumps(h.events), [OVESOS_XP.turns, OVESOS_XP.canal, OVESOS_XP.hearing, OVESOS_XP.fine]);
  for (const xp of lumps(h.events)) assert.ok(h.gains.some(([skill, n]) => skill === 'farming' && n === xp), `the ${xp} lump is paid as Farming experience`);
});

test('Taleth takes the sealed flatbread, and Ovesos pays in standing once: a senior right, the toll waived, the name to be read', () => {
  const h = walk(velsorten(), 'carry'), { arc, inventory, canal, mill } = h, d = box();
  assert.deepEqual(talethOvesosChoices({ id: 'seshat' }, { ovesos: arc, inventory, ...d }), [], 'only Taleth takes it');
  assert.deepEqual(talethOvesosChoices({ id: TALETH_ID }, { ovesos: arc, inventory, ...d }), [], 'nothing baked, no choice');
  inventory.add('flatbread', 1);
  const unsealed = createOvesosArc({ inventory, merchants: { sealed: () => ({ count: 0, prize: 0 }) } });
  unsealed.restore(arc.snapshot());
  const [locked] = talethOvesosChoices({ id: TALETH_ID }, { ovesos: unsealed, inventory, ...d });
  assert.deepEqual([locked.id, locked.disabled], ['ovesos-deliver-unsealed', true]);
  assert.match(locked.reason, /Nepri/);
  // Sealed (no market to ask counts as sealed), the bread goes over and the rewards come.
  const [choice] = talethOvesosChoices({ id: TALETH_ID }, { ovesos: arc, inventory, ...d });
  choice.action();
  assert.equal(arc.stage(), 'done');
  assert.deepEqual([canal.seniority(), mill.view().waived, arc.view().named], [SENIORITY.reward, true, 'due']);
  assert.equal(inventory.count('flatbread'), 0, 'the bread is handed over');
  assert.deepEqual(h.spells, [], 'Ovesos teaches no working');
  const said = d.shown.at(-1).lines.join(' ');
  assert.match(said, /Harvest Close/); assert.match(said, /sixteenth/); assert.doesNotMatch(said, /!/);
  assert.deepEqual(lumps(h.events), [150, 200, 300, 400, 1000]);
  assert.equal(arc.deliver().ok, false, 'once');
  // The toll is gone for him.
  inventory.add('hard-wheat', 32);
  assert.equal(h.arc.grind('hard-wheat', 32).toll, 0);
  // A reload neither re-pays nor re-grants.
  const again = velsorten(), saved = arc.snapshot();
  assert.equal(validateOvesosArc(saved), true);
  assert.equal(again.arc.restore(saved), true);
  assert.deepEqual(again.arc.snapshot(), saved);
  assert.deepEqual([lumps(again.events), again.canal.seniority(), again.mill.view().waived], [[], 1, false], 'the canal and the mill keep their own saves');
  assert.match(arc.journal().detail, /register/);
  assert.match(arc.journal().rewards.join(' '), /to be read/);
  // A right bought above the reward is not taken back by it.
  const rich = walk(velsorten(), 'carry');
  rich.setLevel(WATER_RIGHT_LEVEL);
  rich.inventory.add(COPPER_ITEM, WATER_RIGHT_PRICE * 2);
  rich.arc.buyRight(); rich.arc.buyRight();
  assert.equal(rich.canal.seniority(), SENIORITY.most);
  rich.inventory.add('flatbread', 1);
  talethOvesosChoices({ id: TALETH_ID }, { ovesos: rich.arc, inventory: rich.inventory, ...box() })[0].action();
  assert.equal(rich.canal.seniority(), SENIORITY.most);
});

test('The hearing: the register wins outright, the witness wins at Ashnan’s cost, and settling buys only peace', () => {
  const register = walk(velsorten(), 'mill', { answer: 'register' });
  assert.deepEqual([register.canal.seniority(), register.arc.view().hearing, register.arc.view().short, register.arc.regard('ziusudra')], [3, { answer: 'register' }, null, 1]);
  // The witness: the half turn given back, no step up, and Ashnan's dues called in, which Rollo may pay.
  const witness = velsorten();
  walk(witness, 'hearing');
  assert.equal(witness.arc.answerHearing('witness').ok, false, 'nobody has said what they saw');
  assert.equal(witness.arc.consult('witness'), true);
  assert.equal(witness.arc.consult('witness'), false, 'asked once');
  assert.equal(witness.arc.answerHearing('witness').ok, true);
  assert.deepEqual([witness.canal.seniority(), witness.arc.view().short, witness.arc.view().ashnan, witness.arc.regard('ziusudra'), witness.arc.regard('ashnan')], [2, null, 'owed', -1, 0]);
  assert.match(witness.arc.payAshnan().reason, /30 copper/);
  witness.inventory.add(COPPER_ITEM, ASHNAN_DUES);
  assert.deepEqual(witness.arc.payAshnan(), { ok: true, copper: ASHNAN_DUES });
  assert.deepEqual([witness.inventory.count(COPPER_ITEM), witness.arc.view().ashnan, witness.arc.regard('ashnan')], [0, 'paid', 1]);
  assert.equal(witness.arc.payAshnan().ok, false, 'paid once');
  // Settled quietly: forty copper, the half turn stays drawn, and nothing is written.
  const quiet = velsorten();
  walk(quiet, 'hearing');
  const short = quiet.arc.view().short;
  assert.equal(quiet.arc.hearingOptions().settle, false, 'no copper, no quiet');
  assert.match(quiet.arc.answerHearing('settle').reason, /Forty copper/);
  quiet.inventory.add(COPPER_ITEM, SETTLE_COPPER + 5);
  assert.deepEqual(quiet.arc.hearingOptions(), { register: false, witness: false, settle: true });
  assert.equal(quiet.arc.answerHearing('settle').ok, true);
  assert.deepEqual([quiet.inventory.count(COPPER_ITEM), quiet.canal.seniority(), quiet.arc.view().short, quiet.arc.view().ashnan], [5, 2, short, null]);
  assert.equal(quiet.arc.answerHearing('register').ok, false, 'answered once');
  assert.ok(quiet.events.some(event => event.type === 'ovesos-hearing' && event.answer === 'settle'));
});

test('The Harvest Close takes the canal’s dues from the satchel, counts the warden’s book first, and reads his name once', () => {
  const early = velsorten();
  assert.equal(early.arc.close().ok, false, 'nobody in the register, nothing to reckon');
  const h = walk(velsorten(), 'wheat'), { arc, canal, inventory } = h;
  // A day's work on the cleared head is written against the dues, once a game day.
  assert.deepEqual(arc.workHead(h.now()).ok, false);
  h.wait(GAME_DAY_SECONDS);
  assert.deepEqual(arc.workHead(h.now()), { ok: true, credit: 1 });
  assert.match(arc.workHead(h.now()).reason, /tomorrow/);
  assert.equal(canal.restore({ ...canal.snapshot(), drawn: 42 }), true);
  assert.equal(arc.owed(), 4);
  inventory.remove('barley', inventory.count('barley')); inventory.add('barley', 1); inventory.add('hard-wheat', 1); inventory.add('silver-millet', 9);
  const first = arc.close();
  assert.deepEqual([first.due, first.credited, first.paid, first.taken, first.short, first.reading], [4, 1, 2, { barley: 1, 'hard-wheat': 1 }, 1, false]);
  assert.deepEqual([inventory.count('barley'), inventory.count('hard-wheat'), inventory.count('silver-millet')], [0, 0, 9], 'millet is never taken');
  assert.deepEqual([arc.view().credit, arc.owed()], [0, 1], 'what is short is carried to the next Close');
  inventory.add('barley-fine', 1);
  assert.deepEqual([arc.close().paid, arc.owed(), inventory.count('barley-fine')], [1, 0, 0]);
  assert.equal(arc.close().due, 0);
  // Restored, the first Close reads his name; the second does not.
  const done = walk(velsorten(), 'done');
  assert.equal(done.arc.close().reading, true);
  assert.equal(done.arc.view().named, 'read');
  assert.equal(done.arc.close().reading, false);
  assert.match(done.arc.journal().detail, /read your name/);
});

test('The plots open by seniority, the tail first, and Nisaba sells a right outright to the fifth, at Farming 28', () => {
  const h = velsorten({ level: WATER_RIGHT_LEVEL }), { arc, canal, inventory } = h;
  const [H1] = OVESOS_BEDS_BY_REACH.head, [M1] = OVESOS_BEDS_BY_REACH.mid;
  // Below the level the Council will not sell, whatever the purse (design 4.6).
  const green = velsorten();
  green.arc.enter(); green.inventory.add(COPPER_ITEM, WATER_RIGHT_PRICE);
  assert.match(green.arc.buyRight().reason, /Farming of 28/);
  assert.deepEqual([green.canal.seniority(), green.inventory.count(COPPER_ITEM)], [1, WATER_RIGHT_PRICE]);
  assert.deepEqual(REACH_SENIORITY, { tail: 1, mid: 3, head: 5 });
  assert.equal(arc.canSow('commons-row-1').ok, true, 'not a canal bed');
  assert.equal(arc.buyRight().ok, false, 'not in the register');
  arc.enter();
  assert.deepEqual([arc.canSow(T1).ok, arc.canSow(M1).ok, arc.canSow(H1).ok], [true, false, false]);
  assert.match(arc.canSow(H1).reason, /buy/);
  assert.match(arc.buyRight().reason, /Fifteen hundred/);
  inventory.add(COPPER_ITEM, WATER_RIGHT_PRICE * 4 + 1);
  assert.deepEqual(arc.buyRight(), { ok: true, seniority: 2, copper: WATER_RIGHT_PRICE });
  arc.buyRight();
  assert.deepEqual([canal.seniority(), arc.canSow(M1).ok, arc.canSow(H1).ok], [3, true, false]);
  arc.buyRight(); arc.buyRight();
  assert.deepEqual([canal.seniority(), arc.canSow(H1).ok, inventory.count(COPPER_ITEM)], [5, true, 1]);
  assert.equal(arc.buyRight().ok, false, 'nothing older is for sale');
  assert.equal(arc.view().rights, 4);
  assert.equal(validateOvesosArc(arc.snapshot()), true);
});

test('Before Taleth’s charge the arc waits, and registered with the hub it shows its card, its marks, its leaf and its save', () => {
  const hub = createLizeemFarmlands(), h = velsorten(), { arc } = h;
  assert.equal(hub.registerArc('ovesos', arc), true);
  assert.equal(arc.enter(), false, 'nothing begins before the charge');
  assert.equal(arc.canSow(T1).ok, false);
  assert.deepEqual(hub.markerIds(), []);
  hub.offer(); hub.accept();
  assert.ok(hub.markerIds().includes('nisaba'));
  const card = hub.trackableViews().find(entry => entry.id === 'lizeem-farmlands-ovesos');
  assert.ok(card, 'the arc has a card on the tracker');
  assert.deepEqual([card.kicker, card.active, card.destinationIds], ['Ovesos · the shared water', true, ['nisaba']]);
  assert.match(card.detail, /Velsorten/);
  arc.enter();
  assert.deepEqual(hub.trackableViews().find(entry => entry.arc === 'ovesos').destinationIds, ['enbilulu']);
  // The arc names its leaf's lines; the hub keeps the grades.
  const leaf = MEASURE_LEAVES.find(entry => entry.id === 'ovesos');
  assert.deepEqual(arc.measureLines().map(entry => entry.id), leaf.lines.map(entry => entry.id));
  assert.deepEqual(arc.measureLines().find(entry => entry.id === 'dish').items, ['flatbread']);
  assert.equal(hub.measureView().leaves.find(entry => entry.id === 'ovesos').walked, true);
  // Its save rides in the hub's, and the hub asks its validator.
  const saved = hub.snapshot();
  assert.deepEqual(saved.arcs.ovesos, arc.snapshot());
  assert.equal(validateLizeemFarmlands(saved), true);
  assert.equal(validateLizeemFarmlands({ ...saved, arcs: { ovesos: { ...saved.arcs.ovesos, stage: 'done' } } }), false, 'a done arc with nothing done');
  // A Fine flatbread, sealed, is laid up in the Measure when Taleth takes it.
  const fine = createLizeemFarmlands(), g = velsorten(), merchantsArc = createOvesosArc({ farming: null, canal: g.canal, mill: g.mill, inventory: g.inventory, merchants: sealedFine, clock: () => g.now() });
  fine.registerArc('ovesos', merchantsArc); fine.offer(); fine.accept();
  walk(g, 'carry');
  merchantsArc.restore(g.arc.snapshot());
  g.inventory.add('flatbread-fine', 1);
  talethOvesosChoices({ id: TALETH_ID }, { ovesos: merchantsArc, inventory: g.inventory, ...box() })[0].action();
  assert.equal(fine.measureView().leaves.find(entry => entry.id === 'ovesos').lines[3].grade, 'fine');
  assert.equal(fine.trackableViews().some(entry => entry.arc === 'ovesos'), false, 'done, the card leaves the tracker');
  assert.deepEqual(fine.journal().map(entry => [entry.id, entry.title, entry.status]), [['lizeem-farmlands-ovesos', 'Ovesos: the shared water', 'complete']]);
});

test('A save the arc did not write is refused, and refusing it changes nothing', () => {
  const h = walk(velsorten(), 'hearing'), good = h.arc.snapshot();
  assert.equal(validateOvesosArc(undefined), true, 'a save from before Ovesos');
  assert.equal(validateOvesosArc(good), true);
  const done = walk(velsorten(), 'done').arc.snapshot();
  assert.equal(validateOvesosArc(done), true);
  const bad = [null, [], 'arrive', {}, { ...good, version: 2 }, { ...good, stage: 'nowhere' }, { ...good, extra: 1 },
    { ...good, salt: 'yes' }, { ...good, sown: ['carrot'] }, { ...good, sown: ['barley', 'barley'] }, { ...good, head: 4 }, { ...good, head: 1.5 },
    { ...good, credit: -1 }, { ...good, credit: 99 }, { ...good, consulted: ['gossip'] }, { ...good, taught: ['tart'] },
    { ...good, worked: -5 }, { ...good, short: -1 }, { ...good, short: 'tomorrow' },
    { ...good, stage: 'arrive' }, { ...good, stage: 'canal', head: 0, fullBarley: false, sown: ['barley', 'silver-millet'] },
    { ...good, lesson: false }, { ...good, allotted: false }, { ...good, sown: ['barley', 'silver-millet'] },
    { ...good, stage: 'fine' }, { ...good, stage: 'fine', hearing: { answer: 'register' } },
    { ...good, stage: 'fine', hearing: { answer: 'witness' }, ashnan: null, consulted: ['witness'], short: null },
    { ...good, stage: 'fine', hearing: { answer: 'register', how: 1 }, consulted: ['register'], short: null },
    { ...good, stage: 'mill', hearing: { answer: 'settle' }, fineWheat: false },
    { ...good, stage: 'carry', hearing: { answer: 'settle' }, fineWheat: true, milled: false },
    { ...good, milled: true }, { ...good, named: 'due' }, { ...done, named: null }, { ...done, named: 'sung' },
    { ...done, ashnan: 'owed' }, { ...done, rights: 5 }];
  for (const data of bad) {
    assert.equal(validateOvesosArc(data), false, JSON.stringify(data));
    assert.equal(h.arc.restore(data), false);
    assert.deepEqual(h.arc.snapshot(), good, 'a refused save leaves the arc as it was');
  }
  assert.equal(h.arc.restore(undefined), true);
  assert.deepEqual([h.arc.stage(), h.arc.view().head], ['arrive', 0], 'no save is a fresh arc');
});
