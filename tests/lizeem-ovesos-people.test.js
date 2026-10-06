import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import { OVESOS_NPC_STANDS } from '../src/content/regions/oves/ovesos-farm.js';
import {
  OVESOS_PEOPLE, OVESOS_PEOPLE_IDS, OVESOS_AMBIENT, OVESOS_TRADERS, OVESOS_BUYERS, OVESOS_BOARDS,
  NISABA_ENTRY, REGISTER_LINES, CLOSE_LINES, CANAL_LINES, TURNS_LESSON, SALT_LESSON, ASHNAN_SALT, HEAD_REQUEST, HEAD_WORK, HEAD_DAY,
  REGISTER_EXTRACT, ASHNAN_WITNESS, HEARING_OPENING, HEARING_OUTCOMES, ZIUSUDRA_GRANT, LAHAR_BARLEY, LAHAR_REFUSED, LAHAR_TAKEN,
  isOvesosNpc, ovesosConversation, harvestCloseReading, turnPlace,
} from '../src/content/quests/lizeem-farmlands/lizeem-ovesos-people.js';
import { createOvesosArc, TAIL_BEDS, TURN_SECONDS, SETTLE_COPPER, ASHNAN_DUES, WATER_RIGHT_PRICE } from '../src/content/quests/lizeem-farmlands/lizeem-ovesos.js';
import { createLizeemFarmlands } from '../src/content/quests/lizeem-farmlands/lizeem-farmlands.js';
import { LIZEEM_PEOPLE_IDS } from '../src/content/quests/lizeem-farmlands/lizeem-people.js';
import { NETHEREUM_PEOPLE_IDS } from '../src/content/quests/lizeem-farmlands/lizeem-nethereum-people.js';
import { NESDOR_PEOPLE_IDS } from '../src/content/quests/lizeem-farmlands/lizeem-nesdor-people.js';
import { BUYERS, ORDER_BOARDS, buyerForNpc } from '../src/gameplay/inventory/merchants.js';
import { createFarming } from '../src/gameplay/skills/farming/farming.js';
import { createCanalTurns, createMill } from '../src/content/regions/oves/canal-turns.js';
import { COPPER_ITEM } from '../src/gameplay/inventory/economy.js';

const { createCharacter } = await sourceModule('../src/content/characters/characters.js');
const byId = id => OVESOS_PEOPLE.find(npc => npc.id === id);
const WOMEN = ['nisaba', 'ashnan', 'ezina', 'ninkasi', 'uttu'];

test('The eight of design 6.6 are declared once, by name, each on the stand Velsorten keeps for them, and the king is not among them', () => {
  assert.deepEqual([...OVESOS_PEOPLE_IDS].sort(), ['ashnan', 'enbilulu', 'ezina', 'lahar', 'ninkasi', 'nisaba', 'uttu', 'ziusudra']);
  assert.deepEqual(OVESOS_PEOPLE.map(npc => npc.name), ['Enbilulu', 'Nisaba', 'Ziusudra', 'Ashnan', 'Lahar', 'Ezina', 'Ninkasi', 'Uttu']);
  for (const npc of OVESOS_PEOPLE) {
    const stand = OVESOS_NPC_STANDS[npc.id];
    assert.deepEqual([npc.x, npc.z, npc.yaw], [stand.x, stand.z, stand.yaw ?? 0], `${npc.id} stands where src/content/regions/oves/ovesos-farm.js puts them`);
    assert.ok(npc.role.length > 0);
    assert.ok(isOvesosNpc(npc.id));
    assert.ok(![...LIZEEM_PEOPLE_IDS, ...NETHEREUM_PEOPLE_IDS, ...NESDOR_PEOPLE_IDS, 'taleth'].includes(npc.id), `${npc.id} is nobody else`);
  }
  // King Melos is spoken of, and never placed.
  assert.equal(OVESOS_PEOPLE.some(npc => /melos/i.test(`${npc.id} ${npc.name}`)), false);
  assert.equal(isOvesosNpc('melos'), false);
  assert.ok([...REGISTER_LINES, ...OVESOS_AMBIENT.ziusudra, ...harvestCloseReading()].some(line => line.includes('King Melos')), 'the king is spoken of');
});

test('Every civilian stays inside the figure budget, and nobody wears a hat, the scarf and the hair-cloth included', () => {
  for (const npc of OVESOS_PEOPLE) {
    assert.equal(npc.hat, false, `${npc.id} is hatless`);
    assert.notEqual(npc.look.hat, true);
    assert.ok(npc.look.headgear === undefined || npc.look.headgear === 'bare', `${npc.id} is bare-headed`);
    assert.notEqual(npc.look.hairStyle, 'mane');
    const actor = createCharacter({ role: npc.modelRole, tunic: npc.color, skin: npc.skin, look: npc.look, hat: npc.hat, armed: false });
    let draws = 0, triangles = 0;
    actor.group.traverse(object => {
      if (!object.isMesh) return;
      draws++; triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
    });
    assert.ok(draws < 18, `${npc.id} draws ${draws}`);
    assert.ok(triangles < 4200, `${npc.id} has ${triangles} triangles`);
  }
  for (const id of WOMEN) assert.deepEqual([byId(id).look.slight, byId(id).look.dress], [true, true], `${id} is drawn as a woman`);
});

test('Each person has two or three lines in the game’s voice, the first naming themselves, and nobody exclaims', () => {
  for (const npc of OVESOS_PEOPLE) {
    const lines = OVESOS_AMBIENT[npc.id];
    assert.ok(lines && lines.length >= 2 && lines.length <= 3, `${npc.id} has two or three lines`);
    assert.ok(lines[0].startsWith(npc.name), `${npc.id} introduces themselves`);
  }
  const all = [...Object.values(OVESOS_AMBIENT).flat(), ...NISABA_ENTRY, ...REGISTER_LINES, ...CLOSE_LINES, ...CANAL_LINES, ...TURNS_LESSON, ...SALT_LESSON,
    ...ASHNAN_SALT, ...HEAD_REQUEST, ...HEAD_WORK, HEAD_DAY, ...REGISTER_EXTRACT, ...ASHNAN_WITNESS, ...HEARING_OPENING, ...Object.values(HEARING_OUTCOMES).flat(),
    ...ZIUSUDRA_GRANT, LAHAR_BARLEY, LAHAR_REFUSED, LAHAR_TAKEN, ...harvestCloseReading('Rollo', 4)];
  for (const line of all) assert.ok(!line.includes('!'), line);
  // The thirst Enbilulu teaches is the canal's own.
  for (const [crop, units] of [['Hard wheat', 'three'], ['Barley', 'two'], ['Silver millet', 'one']]) assert.ok(TURNS_LESSON.some(line => line.includes(`${crop} drinks ${units}`) || line.includes(`${crop} ${units}`)), crop);
  assert.equal(HEAD_WORK.length, 3, 'a line for each stretch of the head');
  assert.deepEqual([turnPlace(1), turnPlace(4), turnPlace(5)], ['fifth', 'second', 'first']);
  assert.match(harvestCloseReading('Rollo', 4)[2], /second at the stone/);
});

test('Ovesos’s buyers and the register board are registered as the contract gives them, and each trader trades as himself', () => {
  const sells = id => BUYERS[id].sells.map(s => [s.id, s.price]), wants = id => BUYERS[id].groups.map(want => [want.items, want.appetite]);
  assert.deepEqual([BUYERS.ezina.where, wants('ezina'), BUYERS.ezina.services], ['Ovesos', [[['hard-wheat'], 24]], ['grind']]);
  assert.deepEqual([wants('ninkasi'), sells('ninkasi')], [[[['barley'], 24]], [['ale', 3]]]);
  assert.deepEqual([wants('uttu'), sells('uttu')], [[[['madder'], 12]], [['cloth', 8]]]);
  assert.deepEqual([wants('lahar'), sells('lahar')], [[[['barley'], 12], [['meadow-hay'], 12]], [['mutton', 3], ['ewe-cheese', 4]]]);
  assert.deepEqual([BUYERS.nisaba.board, BUYERS.nisaba.wants, BUYERS.nisaba.sells], ['ovesos-register', [], []]);
  assert.deepEqual([ORDER_BOARDS['ovesos-register'].buyer, ORDER_BOARDS['ovesos-register'].where], ['nisaba', 'Ovesos']);
  assert.deepEqual(OVESOS_BOARDS.map(board => board.id), ['ovesos-register']);
  assert.deepEqual(OVESOS_BUYERS.map(entry => entry.id), [...OVESOS_TRADERS, 'nisaba']);
  for (const npc of OVESOS_PEOPLE) assert.equal(buyerForNpc(npc)?.id ?? null, [...OVESOS_TRADERS, 'nisaba'].includes(npc.id) ? npc.id : null, npc.id);
  for (const entry of OVESOS_BUYERS) for (const line of Object.values(BUYERS[entry.id].lines).map(l => (typeof l === 'function' ? l(5) : l))) assert.ok(!line.includes('!'), line);
});

/** A dialogue box that remembers what it was asked to show. */
function box() {
  const shown = [];
  return {
    shown, last: () => shown.filter(entry => entry.lines).at(-1),
    openDialogue: (npc, lines, event, label, options = {}) => shown.push({ npc: npc.id, lines, label, choices: options.choices ?? [], options }),
    closeDialogue: () => shown.push({ closed: true }),
    choose(id) {
      const choice = [...shown].reverse().find(entry => entry.choices?.length)?.choices.find(entry => entry.id === id);
      assert.ok(choice, `the choice ${id} is offered`);
      assert.notEqual(choice.disabled, true, `the choice ${id} is open`);
      choice.action();
    },
    choice: id => [...shown].reverse().find(entry => entry.choices?.length)?.choices.find(entry => entry.id === id) ?? null,
    ids: () => ([...shown].reverse().find(entry => entry.choices?.length)?.choices ?? []).map(entry => entry.id),
  };
}
function satchel() {
  const stock = new Map();
  return { stock, count: id => stock.get(id) ?? 0, add: (id, n = 1) => { stock.set(id, (stock.get(id) ?? 0) + n); return true; },
    remove: (id, n = 1) => { if ((stock.get(id) ?? 0) < n) return false; stock.set(id, stock.get(id) - n); return true; },
    items: () => [...stock].filter(([, n]) => n > 0).map(([id]) => id) };
}

test('The people who hold a step give it through their conversation, in order, and the rest only talk and trade', () => {
  let t = 1;
  let farmingLevel = 12;
  const clock = () => t, inventory = satchel(), skills = { known: () => true, learn: () => ({ ok: true }), level: () => farmingLevel, gain: () => ({ ok: true }) };
  const farming = createFarming({ skills, inventory, clock }), canal = createCanalTurns({ farming, clock }), mill = createMill({ clock });
  const arc = createOvesosArc({ farming, canal, mill, skills, inventory, clock }), hub = createLizeemFarmlands();
  hub.registerArc('ovesos', arc);
  const d = box(), learned = [], traded = [], orders = [], notes = [];
  let kitchen = { ok: false, reason: 'Learn Fire Making from Lee Anne.' };
  const ctx = { ovesos: arc, ...d, inventory, cooking: { learn: id => { if (kitchen.ok) learned.push(id); return kitchen; } }, playerName: 'Rollo',
    openTrade: npc => traded.push(npc.id), openOrders: npc => orders.push(npc.id), notify: (...line) => notes.push(line) };
  const talk = id => { assert.equal(ovesosConversation(byId(id), ctx), true); return d.ids(); };
  assert.equal(ovesosConversation({ id: 'baugi' }, ctx), false, 'somebody else’s person is not ours');

  assert.ok(!talk('nisaba').includes('ovesos-nisaba-enter'), 'nothing to do before Taleth’s charge');
  hub.offer(); hub.accept();
  talk('nisaba'); d.choose('ovesos-nisaba-enter');
  assert.deepEqual([arc.stage(), canal.seniority(), d.last().lines], ['register', 1, [...NISABA_ENTRY]]);
  assert.ok(!talk('nisaba').includes('ovesos-nisaba-enter'), 'entered once');
  talk('nisaba'); d.choose('ovesos-nisaba-board');
  assert.deepEqual(orders, ['nisaba']);

  // Enbilulu's lesson, and salt from Ashnan.
  talk('enbilulu'); d.choose('ovesos-enbilulu-turns');
  assert.deepEqual([arc.stage(), d.last().lines], ['turns', [...TURNS_LESSON]]);
  talk('ashnan'); d.choose('ovesos-ashnan-salt');
  assert.deepEqual([arc.view().salt, d.last().lines], [true, [...ASHNAN_SALT]]);
  // A recipe the kitchen refuses is heard and not kept, and offered again.
  talk('ashnan'); d.choose('ovesos-ashnan-porridge');
  assert.deepEqual([arc.view().taught, notes.at(-1)[0]], [[], 'Learn Fire Making from Lee Anne.']);
  kitchen = { ok: true };
  talk('ashnan'); d.choose('ovesos-ashnan-porridge');
  assert.deepEqual([learned, arc.view().taught], [['millet-porridge'], ['millet-porridge']]);

  // The first turn, then the head with Enbilulu, a stretch between turns.
  inventory.add('barley-seed', 4); inventory.add('silver-millet-seed', 4); inventory.add('hard-wheat-seed', 4);
  t = canal.turn(t).nextAt + 1;
  farming.sow(TAIL_BEDS[0], 'barley', t); farming.sow(TAIL_BEDS[1], 'silver-millet', t);
  arc.allot(TAIL_BEDS[0], 2, t); arc.allot(TAIL_BEDS[1], 1, t);
  assert.equal(arc.stage(), 'canal');
  talk('enbilulu');
  assert.equal(d.last().lines[0], HEAD_REQUEST[0]);
  d.choose('ovesos-enbilulu-head');
  assert.deepEqual(d.last().lines, [...HEAD_REQUEST]);
  talk('enbilulu'); d.choose('ovesos-enbilulu-work');
  assert.deepEqual(d.last().lines, [HEAD_WORK[0]]);
  talk('enbilulu'); d.choose('ovesos-enbilulu-work');
  assert.match(d.last().lines[0], /between turns/);
  for (const n of [1, 2]) { t += TURN_SECONDS; talk('enbilulu'); d.choose('ovesos-enbilulu-work'); assert.deepEqual(d.last().lines, [HEAD_WORK[n]]); }
  farming.harvest(TAIL_BEDS[0], t);
  assert.deepEqual([arc.stage(), canal.seniority()], ['wheat', 2]);
  talk('nisaba'); assert.match(d.last().lines[0], /moved you up a turn/);

  // The hearing: the register's page, Ashnan's witness, the Council.
  t = canal.turn(t).nextAt - 20;
  farming.sow(TAIL_BEDS[2], 'hard-wheat', t); farming.water(TAIL_BEDS[2], t); arc.observe(t);
  assert.equal(arc.stage(), 'hearing');
  talk('enbilulu'); assert.match(d.last().lines[0], /Ziusudra’s/);
  talk('ziusudra'); assert.match(d.last().lines[0], /my house drew the water/);
  talk('nisaba'); d.choose('ovesos-nisaba-hearing');
  assert.deepEqual(d.last().lines, [...HEARING_OPENING]);
  assert.deepEqual([d.choice('ovesos-hearing-register').disabled, d.choice('ovesos-hearing-witness').disabled, d.choice('ovesos-hearing-settle').disabled], [true, true, true]);
  assert.match(d.choice('ovesos-hearing-settle').reason, new RegExp(`${SETTLE_COPPER}|Forty`));
  talk('ashnan'); assert.match(d.last().lines[0], /Nobody at the tail says/);
  d.choose('ovesos-ashnan-witness');
  assert.deepEqual(d.last().lines, [...ASHNAN_WITNESS]);
  talk('nisaba'); d.choose('ovesos-nisaba-hearing');
  assert.equal(d.choice('ovesos-hearing-register').disabled, true, 'the register is not yet read');
  d.choose('ovesos-hearing-witness');
  assert.deepEqual([arc.stage(), arc.view().ashnan, d.last().lines], ['fine', 'owed', [...HEARING_OUTCOMES.witness]]);
  talk('ziusudra'); assert.match(d.last().lines[0], /tenant on her feet/);
  talk('ashnan'); assert.match(d.last().lines[0], /called my dues in/);
  d.choose('ovesos-ashnan-dues');
  assert.equal(arc.view().ashnan, 'owed', 'not without the copper');
  inventory.add(COPPER_ITEM, ASHNAN_DUES);
  talk('ashnan'); d.choose('ovesos-ashnan-dues');
  assert.deepEqual([arc.view().ashnan, inventory.count(COPPER_ITEM)], ['paid', 0]);
  assert.ok(!talk('ashnan').includes('ovesos-ashnan-dues'));

  // Fine wheat, the mill and the flatbread.
  t = canal.turn(t).nextAt + 1;
  arc.allot(TAIL_BEDS[2], 3, t);
  t += TURN_SECONDS * 2; farming.harvest(TAIL_BEDS[2], t);
  assert.equal(arc.stage(), 'mill');
  talk('ezina'); assert.match(d.last().lines[0], /stones/);
  assert.ok(d.ids().includes('ovesos-ezina-grind-hard-wheat-fine'));
  d.choose('ovesos-ezina-grind-hard-wheat-fine');
  assert.match(d.last().lines[0], /^1 measure of fine flour/);
  assert.equal(arc.stage(), 'carry');
  talk('ezina'); d.choose('ovesos-ezina-flatbread');
  assert.deepEqual(learned, ['millet-porridge', 'flatbread']);
  inventory.add('flatbread', 1);
  arc.deliver();
  assert.equal(arc.stage(), 'done');
  talk('ezina'); assert.match(d.last().lines[0], /grind free/);

  // The Harvest Close reads his name once, in his place at the stone; a right is for sale above it.
  talk('nisaba'); d.choose('ovesos-nisaba-close');
  const reading = d.last().lines.join(' ');
  assert.match(reading, /Rollo, of the Guild at Minora/); assert.match(reading, /second at the stone/);
  talk('nisaba'); d.choose('ovesos-nisaba-close');
  assert.doesNotMatch(d.last().lines.join(' '), /Rollo, of the Guild/);
  talk('nisaba'); d.choose('ovesos-nisaba-right');
  assert.match(d.last().lines[0], /Farming of 28/, 'the Council sells a right only at Farming 28');
  farmingLevel = 28;
  talk('nisaba'); d.choose('ovesos-nisaba-right');
  assert.match(d.last().lines[0], /Fifteen hundred/);
  inventory.add(COPPER_ITEM, WATER_RIGHT_PRICE);
  talk('nisaba'); d.choose('ovesos-nisaba-right');
  assert.deepEqual([canal.seniority(), inventory.count(COPPER_ITEM)], [5, 0]);
  assert.match(d.last().lines[0], /first at the stone/);

  // Lahar serves roasted barley before he trades, and a refusal ends the visit on one line.
  talk('lahar'); d.choose('lahar-trade');
  assert.deepEqual(d.last().lines, [LAHAR_BARLEY]);
  d.choose('lahar-barley-refuse');
  assert.deepEqual([d.last().lines, d.last().choices, traded], [[LAHAR_REFUSED], [], []]);
  talk('lahar'); d.choose('lahar-trade'); d.choose('lahar-barley-take');
  assert.deepEqual([traded, notes.at(-1)[0]], [['lahar'], LAHAR_TAKEN]);
  // Trading is for the four who trade.
  for (const id of ['ezina', 'ninkasi', 'uttu']) { talk(id); d.choose(`${id}-trade`); }
  assert.deepEqual(traded, ['lahar', 'ezina', 'ninkasi', 'uttu']);
  for (const id of ['enbilulu', 'nisaba', 'ziusudra', 'ashnan']) assert.ok(!talk(id).includes(`${id}-trade`), `${id} does not trade`);
  for (const id of ['ninkasi', 'uttu']) { talk(id); assert.ok(d.ids().length >= 3, `${id} has something to say`); }
  for (const entry of d.shown.filter(item => item.lines)) for (const line of entry.lines) assert.ok(!line.includes('!'), line);
});

test('The register and the quiet answer at the hearing, and the head’s day of work after it is clear', () => {
  let t = 1;
  const clock = () => t, inventory = satchel(), skills = { known: () => true, learn: () => ({ ok: true }), level: () => 12, gain: () => ({ ok: true }) };
  const farming = createFarming({ skills, inventory, clock }), canal = createCanalTurns({ farming, clock });
  const arc = createOvesosArc({ farming, canal, skills, inventory, clock });
  const d = box(), ctx = { ovesos: arc, ...d, inventory };
  const talk = id => { ovesosConversation(byId(id), ctx); return d.ids(); };
  const at = stage => ({ version: 1, stage, lesson: true, salt: true, allotted: true, sown: ['barley', 'silver-millet', 'hard-wheat'], head: 3, worked: 1,
    credit: 0, fullBarley: true, consulted: [], hearing: null, short: 9, ashnan: null, fineWheat: false, milled: false, taught: [], named: null, closes: 0, duesPaid: 0, rights: 0 });
  assert.equal(arc.restore(at('hearing')), true);
  canal.setSeniority(2);
  talk('nisaba'); d.choose('ovesos-nisaba-extract');
  assert.deepEqual([arc.view().consulted, d.last().lines], [['register'], [...REGISTER_EXTRACT]]);
  assert.ok(!talk('nisaba').includes('ovesos-nisaba-extract'), 'read once');
  d.choose('ovesos-nisaba-hearing'); d.choose('ovesos-hearing-register');
  assert.deepEqual([arc.stage(), canal.seniority(), arc.view().short, d.last().lines], ['fine', 3, null, [...HEARING_OUTCOMES.register]]);
  talk('ziusudra'); assert.match(d.last().lines[0], /read the document/);
  talk('nisaba'); assert.match(d.last().lines[0], /argued from the page/);
  // Quietly, for forty copper.
  assert.equal(arc.restore(at('hearing')), true);
  canal.setSeniority(2);
  inventory.add(COPPER_ITEM, SETTLE_COPPER);
  talk('nisaba'); d.choose('ovesos-nisaba-hearing'); d.choose('ovesos-hearing-settle');
  assert.deepEqual([arc.stage(), canal.seniority(), arc.view().short, inventory.count(COPPER_ITEM), d.last().lines], ['fine', 2, 9, 0, [...HEARING_OUTCOMES.settle]]);
  talk('ziusudra'); assert.match(d.last().lines[0], /Forty copper/);
  // Not yet: back to Nisaba, nothing answered.
  assert.equal(arc.restore(at('hearing')), true);
  talk('nisaba'); d.choose('ovesos-nisaba-hearing'); d.choose('ovesos-hearing-later');
  assert.equal(arc.stage(), 'hearing');
  // The head, cleared: a day's work in the warden's book.
  t = 2000;
  talk('enbilulu'); d.choose('ovesos-enbilulu-work');
  assert.deepEqual([d.last().lines, arc.view().credit], [[HEAD_DAY], 1]);
});
