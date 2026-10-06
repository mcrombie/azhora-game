import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import { NESDOR_NPC_STANDS, NESDOR_PEOPLE_IDS as STAND_IDS, nesdorStrip } from '../src/content/regions/nesdor/nesdor-farm.js';
import { BUYERS, ORDER_BOARDS, buyerForNpc } from '../src/gameplay/inventory/merchants.js';
import {
  NESDOR_PEOPLE, NESDOR_PEOPLE_IDS, NESDOR_AMBIENT, NESDOR_TRADERS, NESDOR_BUYERS, isNesdorNpc, nesdorConversation, STRIP_LESSON,
} from '../src/content/quests/lizeem-farmlands/lizeem-nesdor-people.js';
import { createNesdorArc, NESDOR_ROLES, REBEL_PAPER, FORAGE_CONTRACT_FEE, FORAGER_FIGHT } from '../src/content/quests/lizeem-farmlands/lizeem-nesdor.js';

/**
 * The people of Nesdor (docs/lizeem-farmlands-design.md 6.5; the user's design of 5 October 2026, built
 * 6 October 2026): who they are, where they stand, what they look like, what they say, what they buy and
 * sell, and the Nesdor arc's steps given through their conversations. Where they stand is measured on the
 * built ground by tests/nesdor-farm.test.js; here they must stand exactly there.
 */
const { createCharacter } = await sourceModule('../src/content/characters/characters.js');
const byId = id => NESDOR_PEOPLE.find(npc => npc.id === id);
const BENCH = nesdorStrip('nesdor-bench'), RISE = nesdorStrip('nesdor-rise');

test('The eight people of design 6.5 are declared once, under the contract’s ids, at the stands the farm measured', () => {
  assert.deepEqual([...NESDOR_PEOPLE_IDS], ['baugi', 'bolverk', 'idunn', 'aegir', 'forseti', 'egil', 'beyla', 'byggvir']);
  assert.deepEqual([...NESDOR_PEOPLE_IDS], [...STAND_IDS]);
  assert.deepEqual(NESDOR_PEOPLE.map(npc => npc.name), ['Baugi', 'Bolverk', 'Idunn', 'Aegir', 'Forseti', 'Egil', 'Beyla', 'Byggvir']);
  for (const npc of NESDOR_PEOPLE) {
    const stand = NESDOR_NPC_STANDS[npc.id];
    assert.deepEqual([npc.x, npc.z, npc.yaw], [stand.x, stand.z, stand.yaw], `${npc.id} stands where the farm put them`);
    assert.ok(npc.role.length > 0);
  }
  for (const id of Object.values(NESDOR_ROLES)) assert.equal(byId(id).essential, true, `${id} holds a step and cannot be lost`);
  assert.equal(isNesdorNpc('baugi'), true); assert.equal(isNesdorNpc('lizeem-egeria'), false);
});

test('Nobody wears a hat, Bolverk has one eye and his hood pushed back, and every civilian stays inside the figure budget', () => {
  for (const npc of NESDOR_PEOPLE) {
    assert.equal(npc.hat, false, `${npc.id} is hatless`);
    assert.notEqual(npc.look.hat, true);
    assert.ok([undefined, 'bare', ...(npc.id === 'bolverk' ? ['hood'] : [])].includes(npc.look.headgear), `${npc.id} is bare-headed`);
    if (npc.look.dress) assert.equal(npc.look.slight, true, `${npc.id} is drawn as the kit draws women`);
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
  const bolverk = byId('bolverk');
  assert.deepEqual([bolverk.look.headgear, bolverk.look.marks], ['hood', ['eye-patch']]);
  assert.deepEqual([byId('baugi').look.hairStyle, byId('baugi').look.garment], ['bald', 'sleeveless']);
  assert.equal(byId('egil').look.weapon, 'staff');
});

test('Each person has two or three lines in the game’s voice, the first naming themselves', () => {
  for (const npc of NESDOR_PEOPLE) {
    const lines = NESDOR_AMBIENT[npc.id];
    assert.ok(lines && lines.length >= 2 && lines.length <= 3, `${npc.id} has two or three lines`);
    assert.ok(lines[0].startsWith(npc.name), `${npc.id} introduces themselves`);
    for (const line of lines) assert.ok(!line.includes('!'), line);
  }
  assert.match(STRIP_LESSON.join(' '), /Rushes.*red stem.*green dock.*Yellow dock/s, 'the strips read as they are dressed');
});

test('The buyers and the Way board are registered as the contract declares them', () => {
  for (const spec of NESDOR_BUYERS) assert.equal(BUYERS[spec.id]?.where, 'Nesdor', spec.id);
  const wants = id => BUYERS[id].groups.map(group => [[...group.items], group.appetite]);
  assert.deepEqual(wants('aegir'), [[['dish'], 8], [['barley'], 12]]);
  assert.deepEqual(BUYERS.aegir.sells.find(entry => entry.id === 'ale').price, 3);
  assert.equal(BUYERS.forseti.board, 'nesdor-way');
  assert.deepEqual(wants('egil'), [[['meadow-hay'], 24], [['barley'], 12]]);
  assert.deepEqual(BUYERS.egil.sells.map(entry => entry.id), ['hides']);
  assert.deepEqual(wants('byggvir'), [[['barley'], 24]]);
  assert.deepEqual(BUYERS.beyla.sells.map(entry => [entry.id, entry.price]), [['honeycomb', 2]]);
  assert.deepEqual(BUYERS.idunn.sells.find(entry => entry.id === 'hazelnuts').price, 2);
  assert.deepEqual([ORDER_BOARDS['nesdor-way'].buyer, ORDER_BOARDS['nesdor-way'].where], ['forseti', 'Nesdor']);
  for (const id of [...NESDOR_TRADERS, 'forseti']) assert.equal(buyerForNpc(byId(id))?.id, id, `${id} trades as himself`);
  assert.equal(buyerForNpc(byId('baugi')), null, 'Baugi lends the strips and sells nothing');
});

/** A dialogue box that remembers what it was asked to show. */
function box() {
  const shown = [];
  return {
    shown, last: () => shown.at(-1),
    openDialogue: (npc, lines, event, label, options = {}) => shown.push({ npc: npc.id, lines, label, choices: options.choices ?? [], options }),
    closeDialogue: () => shown.push({ closed: true }),
    choose(id) {
      const choice = [...shown].reverse().find(entry => entry.choices?.length)?.choices.find(entry => entry.id === id);
      assert.ok(choice, `the choice ${id} is offered`);
      choice.action();
    },
    ids: () => ([...shown].reverse().find(entry => entry.choices?.length)?.choices ?? []).map(entry => entry.id),
  };
}
/** A satchel that holds anything. */
function satchel(start = {}) {
  const owned = new Map(Object.entries(start));
  return { count: id => owned.get(id) ?? 0, items: () => [...owned.keys()].filter(id => owned.get(id) > 0),
    add: (id, n = 1) => { owned.set(id, (owned.get(id) ?? 0) + n); return true; },
    remove: (id, n = 1) => { if ((owned.get(id) ?? 0) < n) return false; owned.set(id, owned.get(id) - n); return true; } };
}
/** The farm as the arc sees it: what is in each bed, and the harvest handler. */
function farm() {
  const rows = new Map();
  let handler = null;
  return { onHarvest: fn => { handler = fn; }, rowState: id => (rows.has(id) ? { stage: 'sown', crop: rows.get(id) } : { stage: 'bare', crop: null }),
    sow(strip, cropId) { for (const bed of strip.beds) rows.set(bed, cropId); },
    reap(strip) { for (const bed of strip.beds) { const cropId = rows.get(bed); rows.delete(bed); handler(bed, { crop: cropId, produce: cropId, count: 2, grown: 2, grade: 'good' }); } } };
}
/** The people, an arc on a farm, and a context to talk through. */
function setting({ copper = 10, cooking = null } = {}) {
  const field = farm(), inventory = satchel({ 'copper-piece': copper }), d = box(), learned = [], traded = [], orders = [], fights = [], notes = [], changes = [];
  const arc = createNesdorArc({ farming: field, inventory });
  arc.attach({ accepted: () => true });
  const ctx = { nesdor: arc, ...d, inventory, notify: (...args) => notes.push(args), onChange: () => changes.push(arc.stage()),
    cooking: cooking ?? { learn: id => { learned.push(id); return { ok: true }; } },
    openTrade: npc => traded.push(npc.id), openOrders: npc => orders.push(npc.id), startFight: encounter => { fights.push(encounter.id); return true; } };
  const talk = id => { assert.equal(nesdorConversation(byId(id), ctx), true); return d.ids(); };
  return { field, inventory, d, learned, traded, orders, fights, notes, changes, arc, ctx, talk };
}
/** Sows the three right strips and reaps the bench, through the farm. */
function toForagers(s) {
  s.field.sow(BENCH, 'floodwheat'); s.field.sow(RISE, 'bridge-rye'); s.arc.observe();
  s.field.reap(RISE); s.field.sow(RISE, 'barley'); s.arc.observe();
  assert.equal(s.arc.stage(), 'reap');
  s.field.reap(BENCH);
  assert.equal(s.arc.stage(), 'foragers');
  s.inventory.add('floodwheat', 6);
}

test('The arc’s steps are given through the people who hold them, in order, and the rest talk and trade', () => {
  const s = setting(), { d, talk } = s;
  assert.equal(nesdorConversation({ id: 'lizeem-egeria' }, s.ctx), false, 'somebody else’s person is not ours');
  assert.ok(!talk('idunn').includes('nesdor-idunn-cake'), 'no cake before Baugi has lent the strips');
  assert.ok(!talk('aegir').includes('nesdor-aegir-bread'));
  assert.match(talk('baugi') && d.last().lines[0], /pilgrim or a man from Minora/);
  d.choose('nesdor-baugi-strips');
  assert.equal(s.arc.stage(), 'strips');
  assert.ok(!talk('baugi').includes('nesdor-baugi-strips'), 'the strips are lent once');
  d.choose('nesdor-baugi-read');
  assert.deepEqual(s.arc.state.read, ['plants']);
  assert.match(d.last().lines.join(' '), /wet feet in memory, not in fact/);

  talk('idunn'); d.choose('nesdor-idunn-cake');
  talk('aegir'); d.choose('nesdor-aegir-bread');
  assert.deepEqual(s.learned, ['nut-cake', 'white-bread']);
  assert.deepEqual(s.arc.state.taught, ['nut-cake', 'white-bread']);
  assert.ok(!talk('idunn').includes('nesdor-idunn-cake'), 'taught once');

  s.field.sow(BENCH, 'floodwheat'); s.field.sow(RISE, 'bridge-rye'); s.arc.observe();
  s.field.reap(RISE); s.field.sow(RISE, 'barley'); s.arc.observe();
  assert.equal(s.arc.stage(), 'reap');
  assert.match(talk('bolverk') && d.last().lines[0], /I have not lost yet/);
  d.choose('nesdor-bolverk-match');
  assert.equal(s.arc.state.racing, true);
  assert.ok(!talk('bolverk').includes('nesdor-bolverk-match'), 'one match at a time');
  s.field.reap(BENCH);
  assert.equal(s.arc.stage(), 'foragers');

  assert.match(talk('baugi') && d.last().lines[0], /end of the bench strip/);
  d.choose('nesdor-bargain');
  assert.match(d.last().lines[0], /Forseti writes paper/, 'no bargain without the paper');
  assert.equal(s.arc.stage(), 'foragers');
  assert.match(talk('egil') && d.last().lines[0], /He thanked me/);
  d.choose('nesdor-egil-riders');
  talk('forseti'); d.choose('nesdor-forseti-contract');
  assert.equal(s.inventory.count('copper-piece'), 10 - FORAGE_CONTRACT_FEE, 'the paper costs three copper');
  assert.ok(!talk('forseti').includes('nesdor-forseti-contract'), 'written once');
  s.inventory.add('floodwheat', 6);
  talk('baugi'); d.choose('nesdor-bargain');
  assert.equal(s.arc.stage(), 'fine');
  assert.deepEqual(s.arc.state.foragers, { answer: 'bargain', party: 'both', taken: 1, paper: 1 });
  assert.equal(s.inventory.count(REBEL_PAPER), 1);
  assert.match(talk('forseti') && d.last().lines[0], /best day’s work/, 'Forseti remembers who paid for the paper');
  d.choose('nesdor-forseti-paper');
  assert.deepEqual([s.inventory.count(REBEL_PAPER), s.inventory.count('copper-piece')], [0, 10 - FORAGE_CONTRACT_FEE + 1], 'a note for a copper');
  assert.ok(!talk('forseti').includes('nesdor-forseti-paper'));
  assert.deepEqual(s.changes, ['foragers', 'fine'], 'the host hears each time copper changes hands');
  talk('forseti'); d.choose('nesdor-forseti-board');
  assert.deepEqual(s.orders, ['forseti']);

  for (const id of NESDOR_TRADERS) { talk(id); d.choose(`${id}-trade`); }
  assert.deepEqual(s.traded, [...NESDOR_TRADERS]);
  for (const id of ['baugi', 'bolverk', 'forseti']) assert.ok(!talk(id).includes(`${id}-trade`), `${id} does not keep a stall`);
  for (const id of ['beyla', 'byggvir']) { talk(id); }
  talk('beyla'); d.choose('nesdor-beyla-honey');
  talk('byggvir'); d.choose('nesdor-byggvir-egil');
  assert.match(d.last().lines[0], /arithmetic/);
  talk('egil'); d.choose('nesdor-egil-byggvir');
  assert.match(d.last().lines[0], /walks to market by herself/, 'the argument has two sides');
  for (const entry of d.shown.filter(item => item.lines)) for (const line of entry.lines) assert.ok(!line.includes('!'), line);
});

test('Giving a quarter is answered through Baugi, for either party, and the rebellion’s men pay in paper', () => {
  const cedric = setting();
  cedric.arc.meet(); toForagers(cedric);
  cedric.talk('baugi'); cedric.d.choose('nesdor-give-cedric');
  assert.deepEqual([cedric.arc.stage(), cedric.inventory.count('floodwheat'), cedric.inventory.count(REBEL_PAPER)], ['fine', 4, 0], 'a quarter of six, rounded up');
  assert.match(cedric.talk('baugi') && cedric.d.last().lines[0], /fed the north road/);
  assert.match(cedric.talk('egil') && cedric.d.last().lines[0], /sold them the ox/);
  const rebels = setting();
  rebels.arc.meet(); toForagers(rebels);
  rebels.talk('baugi'); rebels.d.choose('nesdor-give-rebels');
  assert.equal(rebels.inventory.count(REBEL_PAPER), 2, 'a note for each measure they took');
  assert.match(rebels.d.last().lines[0], /Paper, for grain/);
});

test('Driving the foragers off asks the host for the fight, and without one it is done in words', () => {
  const s = setting();
  s.arc.meet(); toForagers(s);
  s.talk('baugi'); s.d.choose('nesdor-drive');
  assert.deepEqual(s.fights, [FORAGER_FIGHT]);
  assert.equal(s.d.last().closed, true, 'the dialogue gives way to the fight');
  assert.match(s.notes.at(-1)[0], /Three foragers/);
  s.arc.combatEvent({ type: 'victory' }, { encounterId: FORAGER_FIGHT });
  assert.equal(s.arc.stage(), 'fine');
  assert.match(s.talk('bolverk') && s.d.last().lines[0], /see the foragers off/);
  const words = setting();
  words.arc.meet(); toForagers(words);
  nesdorConversation(byId('baugi'), { ...words.ctx, startFight: null });
  words.d.choose('nesdor-drive');
  assert.equal(words.arc.stage(), 'fine');
  assert.match(words.d.last().lines[0], /fire in the end of it/);
});

test('Forseti’s contract is refused to an empty purse, and a recipe the kitchen refuses stays on offer', () => {
  const poor = setting({ copper: 1 });
  poor.arc.meet(); toForagers(poor);
  poor.talk('forseti'); poor.d.choose('nesdor-forseti-contract');
  assert.equal(poor.arc.state.contract, false);
  assert.match(poor.d.last().lines[0], /The paper is cheap/);
  assert.equal(poor.inventory.count('copper-piece'), 1, 'nothing was taken');

  let kitchen = { ok: false, reason: 'Learn Fire Making from Lee Anne first.' };
  const cold = setting({ cooking: { learn: () => kitchen } });
  cold.arc.meet();
  cold.talk('idunn'); cold.d.choose('nesdor-idunn-cake');
  assert.deepEqual(cold.arc.state.taught, [], 'heard and not kept');
  assert.match(cold.notes.at(-1)[0], /Fire Making/);
  assert.ok(cold.talk('idunn').includes('nesdor-idunn-cake'), 'and offered again');
  kitchen = { ok: true };
  cold.d.choose('nesdor-idunn-cake');
  assert.deepEqual(cold.arc.state.taught, ['nut-cake']);
});

test('Baugi warns of the wet strip, and offers the long strip once Nesdor is done', () => {
  const s = setting();
  s.arc.meet();
  s.field.sow(nesdorStrip('nesdor-wet'), 'floodwheat'); s.arc.observe();
  assert.match(s.talk('baugi') && s.d.last().lines[0], /sowed the wet strip/);
  const done = createNesdorArc({ flats: { unlockLong: ({ level } = {}) => (level >= 24 ? { ok: true } : { ok: false }), lockLong: () => true }, skills: { level: () => 10 } });
  const saved = { version: 1, stage: 'done', read: [], sown: ['floodwheat', 'barley', 'bridge-rye'], wet: false, cut: {}, racing: false,
    reaped: { strip: 'nesdor-bench', items: { floodwheat: 6 }, match: null, seconds: 6 }, matches: { won: 0, lost: 0 }, contract: false,
    foragers: { answer: 'drive', party: 'both', taken: 0, paper: 0 }, fineWheat: true, taught: ['white-bread', 'nut-cake'], long: 'offered' };
  assert.equal(done.restore(saved), true);
  const d = box();
  nesdorConversation(byId('baugi'), { nesdor: done, ...d });
  d.choose('nesdor-baugi-long');
  assert.match(d.last().lines[0], /Come back at Farming 24/);
  assert.equal(done.state.long, 'offered');
});
