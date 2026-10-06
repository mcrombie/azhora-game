import test from 'node:test';
import assert from 'node:assert/strict';
import { createFarming } from '../src/farming.js';
import { createMeadowWater, BLACKWATER_SECONDS, SECOND_CUT_SECONDS } from '../src/meadow-water.js';
import {
  createNethereumArc, validateNethereumArc, talethNethereumChoices, carriedDishes,
  NETHEREUM_STAGES, NETHEREUM_XP, NETHEREUM_WOLVES, MEADOW_BEDS, DEEP_BEDS, CERIDWEN, QUICKEN, DEEP_LEVEL,
} from '../src/lizeem-nethereum.js';
import { createLizeemFarmlands, validateLizeemFarmlands, MEASURE_LEAVES, TALETH_ID } from '../src/lizeem-farmlands.js';
import { GAME_DAY_SECONDS } from '../src/merchants.js';
import { hexOwnerAt } from '../src/region-world.js';
import { nethereumFarmReserved, NETHEREUM_NPC_STANDS } from '../src/nethereum-farm.js';

const [M1, M2, M3] = MEADOW_BEDS;

/** A satchel that counts. */
function satchel() {
  const stock = new Map();
  return { stock,
    count: id => stock.get(id) ?? 0,
    add: (id, n = 1) => { stock.set(id, (stock.get(id) ?? 0) + n); return true; },
    remove: (id, n = 1) => { if ((stock.get(id) ?? 0) < n) return false; stock.set(id, stock.get(id) - n); return true; },
    items: () => [...stock].filter(([, n]) => n > 0).map(([id]) => id) };
}

/** The real farm and the real meadow on one clock, a satchel, and skills and magic that remember what they are asked. */
function haethom({ level = 12 } = {}) {
  let t = 0, farmingLevel = level;
  const clock = () => t, inventory = satchel(), gains = [], spells = [], events = [];
  const skills = { known: () => true, learn: () => ({ ok: true }), level: id => (id === 'farming' ? farmingLevel : 1),
    gain: (id, n) => { gains.push([id, n]); return { ok: true, levelled: false }; } };
  const magic = { learn: id => { spells.push(id); return { ok: true, id }; } };
  const farming = createFarming({ skills, inventory, clock });
  const meadow = createMeadowWater({ farming, clock, skills, inventory });
  const arc = createNethereumArc({ farming, meadow, skills, magic, inventory, clock, onEvent: event => events.push(event) });
  return { arc, farming, meadow, inventory, gains, spells, events, clock,
    at: seconds => { t = seconds; }, wait: seconds => { t += seconds; meadow.update(t); }, now: () => t, setLevel: n => { farmingLevel = n; } };
}
const lumps = events => events.filter(event => event.type === 'lizeem-step').map(event => event.xp).filter(Boolean);
const box = () => {
  const shown = [];
  return { shown, openDialogue: (npc, lines, event, label, options = {}) => shown.push({ npc: npc.id, lines, options }), closeDialogue: () => shown.push({ closed: true }) };
};

/** Walks the arc to the named stage the way a player would, on the real meadow. */
function walk(h, to) {
  const { arc, inventory } = h;
  const stop = () => arc.stage() === to;
  arc.meet(); if (stop()) return h;
  inventory.add('pine-plank', 2); inventory.add('salvaged-metal', 1);
  assert.equal(arc.mendHatch().ok, true); if (stop()) return h;
  arc.learnWater();
  assert.equal(arc.useHatch(h.now()).ok, true, 'the hatch opens');
  h.wait(BLACKWATER_SECONDS + 30);
  assert.equal(arc.useHatch(h.now()).silt, 'fine', 'drawn off at the shine');
  if (stop()) return h;
  // The meadow grows its hay on every bare bed after the draw-off: cut the first, then sow oats in its place.
  h.wait(181);
  assert.equal(h.farming.harvest(M1, h.now()).crop, 'meadow-hay');
  inventory.add('flood-oats-seed', 2);
  assert.equal(h.farming.sow(M1, 'flood-oats', h.now()).fit, 2, 'oats on fine silt fit best');
  h.farming.water(M1, h.now());
  h.wait(181);
  assert.equal(h.farming.harvest(M1, h.now()).grade, 'fine');
  if (stop()) return h;
  arc.meetWolves(); arc.wolvesDriven(NETHEREUM_WOLVES.id); if (stop()) return h;
  // The second cut: a bed cut once and left bare grows its aftermath for a farmer of level 10.
  h.wait(1); assert.equal(h.farming.harvest(M2, h.now()).crop, 'meadow-hay');
  h.wait(SECOND_CUT_SECONDS + 1); h.wait(181);
  assert.equal(h.farming.harvest(M2, h.now()).crop, 'meadow-hay', 'the aftermath is cut');
  if (stop()) return h;
  inventory.add('oatcakes-fine', 1); inventory.add('smoked-fish', 1);
  assert.equal(arc.recall('carry').ok, true); if (stop()) return h;
  const d = box();
  talethNethereumChoices({ id: TALETH_ID }, { nethereum: arc, inventory, ...d })[0].action();
  return h;
}

test('The arc walks its nine stages in order on the real meadow, and pays each lump once as its stage is left', () => {
  assert.deepEqual(NETHEREUM_STAGES, ['arrive', 'hatch', 'drown', 'sow', 'wolves', 'fine', 'recall', 'carry', 'done']);
  const h = haethom(), { arc, inventory } = h;
  assert.equal(arc.stage(), 'arrive');
  assert.equal(arc.mendHatch().ok, false, 'Mererid first');
  assert.equal(arc.meet(), true); assert.equal(arc.stage(), 'hatch');
  assert.equal(arc.meet(), false, 'met once');
  // The hatch wants two planks and a piece of ironwork, and takes nothing until it has both.
  inventory.add('pine-plank', 2);
  const short = arc.mendHatch();
  assert.equal(short.ok, false); assert.match(short.reason, /ironwork/); assert.equal(inventory.count('pine-plank'), 2);
  inventory.add('salvaged-metal', 1);
  assert.equal(arc.mendHatch().ok, true);
  assert.deepEqual([arc.stage(), inventory.count('pine-plank'), inventory.count('salvaged-metal'), h.meadow.mended], ['drown', 0, 0, true]);
  // Drawn off black: thin, and the stage waits. Drawn at the shine before the lesson: kept until Mererid is heard.
  arc.useHatch(h.now()); h.wait(60);
  assert.equal(arc.useHatch(h.now()).silt, 'thin');
  assert.deepEqual([arc.stage(), arc.view().lastDraw], ['drown', 'thin']);
  arc.useHatch(h.now()); h.wait(BLACKWATER_SECONDS + 20);
  assert.equal(arc.useHatch(h.now()).silt, 'fine');
  assert.equal(arc.stage(), 'drown', 'the shine is seen, and the lesson not yet heard');
  assert.equal(arc.learnWater(), true);
  assert.equal(arc.stage(), 'sow');
  // Oats off the silt and the first cut of hay; the wolves come with them.
  h.wait(181); h.farming.harvest(M1, h.now());
  assert.equal(arc.stage(), 'sow', 'hay alone is half of it');
  inventory.add('flood-oats-seed', 1); h.farming.sow(M1, 'flood-oats', h.now()); h.wait(241);
  assert.equal(h.farming.harvest(M1, h.now()).grade, 'good', 'unwatered oats on fine silt come up Good');
  assert.equal(arc.stage(), 'wolves');
  assert.ok(h.events.some(event => event.type === 'nethereum-wolves'), 'Boann sends for him');
  assert.equal(arc.wolvesDriven('lauvel-wolves').ok, false, 'another fight is not this one');
  const asked = arc.meetWolves();
  assert.deepEqual([asked.ok, asked.startEncounter, asked.encounter], [true, NETHEREUM_WOLVES.id, NETHEREUM_WOLVES]);
  assert.equal(arc.wolvesDriven(NETHEREUM_WOLVES.id).ok, true);
  assert.equal(arc.stage(), 'fine');
  assert.equal(arc.meetWolves().ok, false, 'the wolves are gone');
  // Fine oats, and the second cut of a bed cut once since the draw-off.
  h.wait(1); h.farming.harvest(M2, h.now()); h.wait(SECOND_CUT_SECONDS + 1); h.wait(181);
  assert.equal(h.farming.harvest(M2, h.now()).crop, 'meadow-hay');
  assert.deepEqual([arc.view().secondCut, arc.view().fineOats, arc.stage()], [true, false, 'fine']);
  h.farming.harvest(M3, h.now());
  inventory.add('flood-oats-seed', 1); h.farming.sow(M3, 'flood-oats', h.now()); h.farming.water(M3, h.now()); h.wait(181);
  assert.equal(h.farming.harvest(M3, h.now()).grade, 'fine');
  assert.equal(arc.stage(), 'recall');
  // Nobody stands at the Recall with empty hands.
  assert.equal(arc.recall('carry').ok, false);
  inventory.add('oatcakes', 1); inventory.add('smoked-fish-fine', 1);
  assert.equal(arc.recall('sing').ok, false);
  assert.deepEqual(arc.recall('carry'), { ok: true, name: CERIDWEN });
  assert.equal(arc.stage(), 'carry');
  assert.equal(arc.recall('leave').ok, false, 'answered once');
  assert.deepEqual(lumps(h.events), [NETHEREUM_XP.hatch, NETHEREUM_XP.drown, NETHEREUM_XP.wolves, NETHEREUM_XP.fine]);
  for (const xp of lumps(h.events)) assert.ok(h.gains.some(([skill, n]) => skill === 'farming' && n === xp), `the ${xp} lump is paid as Farming experience`);
});

test('Taleth takes the dish and the name, teaches Quicken once, and the rewards are not paid again', () => {
  const h = walk(haethom(), 'carry'), { arc, inventory } = h, d = box();
  assert.deepEqual(talethNethereumChoices({ id: 'seshat' }, { nethereum: arc, inventory, ...d }), [], 'only Taleth takes it');
  const empty = satchel();
  assert.deepEqual(talethNethereumChoices({ id: TALETH_ID }, { nethereum: arc, inventory: empty, ...d }), [], 'nothing to give, no choice');
  const [choice] = talethNethereumChoices({ id: TALETH_ID }, { nethereum: arc, inventory, ...d });
  assert.match(choice.label, /and the name$/);
  choice.action();
  assert.equal(arc.stage(), 'done');
  assert.deepEqual(h.spells, [QUICKEN]);
  assert.deepEqual([inventory.count('oatcakes-fine'), inventory.count('smoked-fish')], [0, 0], 'the dish is handed over');
  const said = d.shown.at(-1).lines.join(' ');
  assert.match(said, new RegExp(CERIDWEN)); assert.match(said, /Quicken/); assert.doesNotMatch(said, /!/);
  assert.deepEqual(lumps(h.events), [150, 200, 300, 400, 1000]);
  assert.equal(arc.deliver(), false, 'once');
  assert.deepEqual(talethNethereumChoices({ id: TALETH_ID }, { nethereum: arc, inventory, ...d }), []);
  // A reload neither re-teaches nor re-pays.
  const again = haethom(), saved = arc.snapshot();
  assert.equal(validateNethereumArc(saved), true);
  assert.equal(again.arc.restore(saved), true);
  assert.deepEqual(again.arc.snapshot(), saved);
  assert.deepEqual([again.spells, lumps(again.events)], [[], []]);
  assert.match(arc.journal()[0].detail, new RegExp(`${CERIDWEN}`));
  // Left on the levee, the name does not come to Minora.
  const quiet = haethom();
  walk(quiet, 'recall');
  quiet.inventory.add('oatcakes', 1); quiet.inventory.add('smoked-fish', 1);
  quiet.arc.recall('leave');
  const q = box(), [plain] = talethNethereumChoices({ id: TALETH_ID }, { nethereum: quiet.arc, inventory: quiet.inventory, ...q });
  assert.doesNotMatch(plain.label, /name/);
  plain.action();
  assert.doesNotMatch(q.shown.at(-1).lines.join(' '), new RegExp(CERIDWEN));
  assert.deepEqual(quiet.spells, [QUICKEN]);
});

test('The levee tenth is taken on Nethereum beds only, carried in fractions, and waived for a game day after a turn on the levee', () => {
  const h = haethom(), { arc } = h, hay = (n, grade = 'plain') => ({ crop: 'meadow-hay', grown: n, count: n, grade });
  assert.equal(arc.harvest('commons-row-1', hay(20)), null, 'not a Nethereum bed');
  assert.equal(arc.harvest(M1, hay(5)), null, 'half a truss owed is carried');
  const share = arc.harvest(M2, hay(5, 'fine'));
  assert.deepEqual(share, { taken: 1, note: '5 meadow hay, Fine. The levee tenth: 1. Yours: 4.' });
  assert.equal(arc.harvest(DEEP_BEDS[0], { crop: 'flood-oats', grown: 10, count: 10 }).taken, 1, 'the deep plots pay it too');
  assert.equal(arc.leveeWork().ok, false, 'Mererid has not asked him onto her levee');
  arc.meet();
  h.at(100);
  assert.equal(arc.leveeWork().ok, true);
  const waived = arc.harvest(M3, hay(30));
  assert.equal(waived.taken, 0); assert.match(waived.note, /waived today/);
  assert.match(arc.leveeWork().reason, /tomorrow/, 'once a game day');
  h.at(100 + GAME_DAY_SECONDS - 1);
  assert.equal(arc.leveeWaived(), true);
  h.at(100 + GAME_DAY_SECONDS);
  assert.equal(arc.leveeWaived(), false, 'a game day, and no longer');
  assert.equal(arc.harvest(M3, hay(10)).taken, 1);
  assert.equal(arc.leveeWork().ok, true, 'a new day, a new turn');
  assert.equal(arc.view().levee.taken, 3);
  // Through the real farm: the tenth comes out of the harvest before it reaches the satchel.
  const real = haethom();
  real.arc.harvest(M1, hay(9));
  real.arc.meet(); real.inventory.add('pine-plank', 2); real.inventory.add('salvaged-metal', 1); real.arc.mendHatch();
  real.arc.useHatch(real.now()); real.wait(BLACKWATER_SECONDS + 10); real.arc.useHatch(real.now()); real.wait(181);
  const reaped = real.farming.harvest(M1, real.now());
  assert.deepEqual([reaped.grown, reaped.taken, reaped.count, real.inventory.count(reaped.produce)], [2, 1, 1, 1]);
  assert.ok(reaped.notes.some(note => /levee tenth: 1/.test(note)));
});

test('Before Taleth’s charge the arc waits, and registered with the hub it shows its card, its marks, its leaf and its save', () => {
  const hub = createLizeemFarmlands(), h = haethom(), { arc } = h;
  assert.equal(hub.registerArc('nethereum', arc), true);
  assert.equal(arc.meet(), false, 'nothing begins before the charge');
  assert.equal(arc.harvest(M1, { crop: 'meadow-hay', grown: 10, count: 10 }).taken, 1, 'the levee takes its tenth all the same');
  assert.deepEqual(hub.markerIds(), []);
  hub.offer(); hub.accept();
  assert.ok(hub.markerIds().includes('mererid'));
  const card = hub.trackableViews().find(entry => entry.id === 'lizeem-farmlands-nethereum');
  assert.ok(card, 'the arc has a card on the tracker');
  assert.deepEqual([card.kicker, card.active, card.destinationIds], ['Nethereum · the deep water', true, ['mererid']]);
  assert.match(card.detail, /Haethom/);
  arc.meet();
  assert.deepEqual(hub.trackableViews().find(entry => entry.arc === 'nethereum').destinationIds, ['seithenyn']);
  // The arc names its leaf's lines; the hub keeps the grades.
  const leaf = MEASURE_LEAVES.find(entry => entry.id === 'nethereum');
  assert.deepEqual(arc.measureLines().map(entry => entry.id), leaf.lines.map(entry => entry.id));
  assert.deepEqual(arc.measureLines().map(entry => entry.id), ['flood-oats', 'meadow-hay', 'weir-fish', 'dish']);
  assert.deepEqual(arc.measureLines().find(entry => entry.id === 'dish').items, ['oatcakes', 'smoked-fish']);
  const page = hub.measureView().leaves.find(entry => entry.id === 'nethereum');
  assert.deepEqual([page.walked, page.lines[0].name, page.lines[3].name], [true, 'Flood oats off the silt', 'Oatcakes with smoked fish']);
  // Its save rides in the hub's, and the hub asks its validator.
  const saved = hub.snapshot();
  assert.deepEqual(saved.arcs.nethereum, arc.snapshot());
  assert.equal(validateLizeemFarmlands(saved), true);
  assert.equal(validateLizeemFarmlands({ ...saved, arcs: { nethereum: { ...saved.arcs.nethereum, stage: 'done' } } }), false, 'a done arc with nothing done');
  // A Fine dish, sealed, is laid up in the Measure when Taleth takes it.
  const fine = createLizeemFarmlands(), g = haethom();
  fine.registerArc('nethereum', g.arc); fine.offer(); fine.accept();
  walk(g, 'carry');
  g.inventory.remove('oatcakes-fine', 1); g.inventory.remove('smoked-fish', 1);
  g.inventory.add('oatcakes-fine', 1); g.inventory.add('smoked-fish-fine', 1);
  const merchants = { sealed: id => ({ count: 1, prize: id === 'oatcakes-fine' ? 1 : 0 }) };
  talethNethereumChoices({ id: TALETH_ID }, { nethereum: g.arc, inventory: g.inventory, merchants, ...box() })[0].action();
  assert.equal(fine.measureView().leaves.find(entry => entry.id === 'nethereum').lines[3].grade, 'fine', 'as good as its poorer half');
  assert.equal(fine.trackableViews().some(entry => entry.arc === 'nethereum'), false, 'done, the card leaves the tracker');
  assert.deepEqual(fine.journal().map(entry => [entry.id, entry.title, entry.status]), [['lizeem-farmlands-nethereum', 'Nethereum: the deep water', 'complete']]);
});

test('The deep plots open at Farming 16 once Nethereum is restored, and Seithenyn minds the meadow for one dish', () => {
  const h = walk(haethom({ level: 12 }), 'done'), { arc, inventory } = h;
  assert.equal(arc.stage(), 'done');
  assert.equal(arc.canSow(DEEP_BEDS[0]).ok, false);
  assert.match(arc.canSow(DEEP_BEDS[0]).reason, new RegExp(`${DEEP_LEVEL}`));
  assert.equal(arc.canSow(M1).ok, true, 'the meadow is always open');
  h.setLevel(DEEP_LEVEL);
  assert.deepEqual([arc.deepOpen(), arc.canSow(DEEP_BEDS[0]).ok], [true, true]);
  const early = haethom({ level: 30 });
  assert.equal(early.arc.canSow(DEEP_BEDS[1]).ok, false, 'not before the meadow is brought back, whatever the level');
  // A dish, not the makings of one; and once he is paid he draws it off at the shine while Rollo is away.
  inventory.add('flood-oats', 2);
  assert.equal(arc.mind('flood-oats').ok, false);
  assert.equal(arc.mind('oatcakes').ok, false, 'none in the satchel');
  inventory.add('oatcakes', 1);
  assert.equal(arc.mind('oatcakes').ok, true);
  assert.equal(arc.mind('oatcakes').ok, false, 'minding already');
  assert.equal(inventory.count('oatcakes'), 0);
  arc.useHatch(h.now());
  h.wait(60); arc.tick(h.now());
  assert.equal(h.meadow.view().phase, 'blackwater', 'he waits for the shine');
  h.wait(BLACKWATER_SECONDS);
  assert.deepEqual(arc.tick(h.now()), { minded: true, silt: 'fine' });
  assert.equal(arc.view().minder, false, 'one dish, one draw-off');
  assert.deepEqual([h.meadow.view().phase, h.meadow.view().last.silt], ['dry', 'fine']);
  assert.ok(h.events.some(event => event.type === 'nethereum-minded'));
  assert.equal(haethom().arc.mind('oatcakes').ok, false, 'not before the meadow is brought back');
});

test('A save the arc did not write is refused, and refusing it changes nothing', () => {
  const h = walk(haethom(), 'wolves'), good = h.arc.snapshot();
  assert.equal(validateNethereumArc(undefined), true, 'a save from before Nethereum');
  assert.equal(validateNethereumArc(good), true);
  const bad = [null, [], 'arrive', {}, { ...good, version: 2 }, { ...good, stage: 'nowhere' }, { ...good, extra: 1 },
    { ...good, oats: 'yes' }, { ...good, hay: { 'commons-row-1': 0 } }, { ...good, hay: { [M1]: -1 } }, { ...good, taught: ['tart'] },
    { ...good, taught: ['oatcakes', 'oatcakes'] }, { ...good, recall: 'sung' }, { ...good, levee: { ...good.levee, carry: 1 } },
    { ...good, levee: { carry: 0, taken: 0 } }, { ...good, levee: { ...good.levee, worked: -5 } },
    { ...good, stage: 'sow', oats: true, cut: true, fineOats: false, water: false },
    { ...good, stage: 'recall', fineOats: false, secondCut: true }, { ...good, stage: 'recall' }, { ...good, oats: false },
    { ...good, stage: 'carry', fineOats: true, secondCut: true, recall: null },
    { ...good, stage: 'recall', fineOats: true, secondCut: true, recall: 'carried' },
    { ...good, minder: true }, { ...good, stage: 'arrive', water: false, shone: false, oats: false, cut: false },
    { ...good, stage: 'hatch', water: false, shone: true, oats: false, cut: false }];
  for (const data of bad) {
    assert.equal(validateNethereumArc(data), false, JSON.stringify(data));
    assert.equal(h.arc.restore(data), false);
    assert.deepEqual(h.arc.snapshot(), good, 'a refused save leaves the arc as it was');
  }
  assert.equal(h.arc.restore(undefined), true);
  assert.deepEqual([h.arc.stage(), h.arc.view().levee.taken], ['arrive', 0], 'no save is a fresh arc');
});

test('The wolves are an encounter the combat takes, on open rim pasture west of Boann’s byre', () => {
  const W = NETHEREUM_WOLVES, ident = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/;
  assert.match(W.id, ident);
  assert.equal(W.retreatAxis, 'x');
  assert.ok(W.retreatLine > W.center.x, 'the way out lies east, toward the levee');
  assert.ok(W.checkpoint.x < W.retreatLine, 'he restarts inside the fight');
  assert.equal(W.enemies.length, 3);
  assert.equal(new Set(W.enemies.map(wolf => wolf.id)).size, 3);
  for (const wolf of W.enemies) {
    assert.match(wolf.id, ident); assert.equal(wolf.kind, 'wolf'); assert.ok(wolf.hp > 0);
    assert.ok(wolf.x < W.center.x, `${wolf.id} comes in off the hollow from the west`);
  }
  for (const point of [W.center, W.checkpoint, ...W.enemies]) {
    assert.equal(hexOwnerAt(point.x, point.z), 'Nethereum', `(${point.x}, ${point.z}) is in Nethereum`);
    assert.equal(nethereumFarmReserved(point.x, point.z), false, `(${point.x}, ${point.z}) is clear of what Haethom built`);
  }
  const boann = NETHEREUM_NPC_STANDS.boann;
  assert.ok(Math.hypot(W.checkpoint.x - boann.x, W.checkpoint.z - boann.z) < 16, 'he restarts below Boann’s byre');
  assert.equal(carriedDishes(null).both, false);
});
