import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import { NETHEREUM_NPC_STANDS } from '../src/nethereum-farm.js';
import {
  NETHEREUM_PEOPLE, NETHEREUM_PEOPLE_IDS, NETHEREUM_AMBIENT, NETHEREUM_TRADERS, NETHEREUM_BUYERS,
  MERERID_MEADOW, WATER_LESSON, SEITHENYN_SHAME, GWYDDNO_FOUNDLING, FLOOD_RECALL,
  isNethereumNpc, nethereumConversation, firstDish,
} from '../src/lizeem-nethereum-people.js';
import { createNethereumArc, NETHEREUM_WOLVES, CERIDWEN, DEEP_LEVEL } from '../src/lizeem-nethereum.js';
import { createLizeemFarmlands } from '../src/lizeem-farmlands.js';
import { LIZEEM_PEOPLE_IDS } from '../src/lizeem-people.js';
import { BUYERS, buyerForNpc } from '../src/merchants.js';
import { createFarming } from '../src/farming.js';
import { createMeadowWater } from '../src/meadow-water.js';

const { createCharacter } = await sourceModule('../src/characters.js');
const byId = id => NETHEREUM_PEOPLE.find(npc => npc.id === id);

test('The seven of design 6.4 are declared once, by name, each on the stand Haethom keeps for them', () => {
  assert.deepEqual([...NETHEREUM_PEOPLE_IDS].sort(), ['airmid', 'boann', 'fintan', 'gwyddno', 'liban', 'mererid', 'seithenyn']);
  assert.deepEqual(NETHEREUM_PEOPLE.map(npc => npc.name), ['Mererid', 'Seithenyn', 'Gwyddno', 'Boann', 'Fintan', 'Airmid', 'Liban']);
  assert.equal(new Set(NETHEREUM_PEOPLE_IDS).size, 7);
  for (const npc of NETHEREUM_PEOPLE) {
    const stand = NETHEREUM_NPC_STANDS[npc.id];
    assert.deepEqual([npc.x, npc.z, npc.yaw], [stand.x, stand.z, stand.yaw], `${npc.id} stands where src/nethereum-farm.js puts them`);
    assert.ok(npc.role.length > 0);
    assert.ok(isNethereumNpc(npc.id));
    assert.ok(!LIZEEM_PEOPLE_IDS.includes(npc.id) && npc.id !== 'taleth', `${npc.id} is nobody else`);
  }
  assert.equal(isNethereumNpc('lizeem-egeria'), false);
});

test('Every civilian stays inside the figure budget, and nobody wears a hat, Airmid included', () => {
  for (const npc of NETHEREUM_PEOPLE) {
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
  for (const id of ['mererid', 'boann', 'airmid', 'liban']) assert.deepEqual([byId(id).look.slight, byId(id).look.dress], [true, true], `${id} is drawn as a woman`);
});

test('Each person has two or three lines in the game’s voice, the first naming themselves, and the Recall names Ceridwen', () => {
  for (const npc of NETHEREUM_PEOPLE) {
    const lines = NETHEREUM_AMBIENT[npc.id];
    assert.ok(lines && lines.length >= 2 && lines.length <= 3, `${npc.id} has two or three lines`);
    assert.ok(lines[0].startsWith(npc.name), `${npc.id} introduces themselves`);
  }
  for (const line of [...Object.values(NETHEREUM_AMBIENT).flat(), ...MERERID_MEADOW, ...WATER_LESSON, ...SEITHENYN_SHAME, ...GWYDDNO_FOUNDLING, ...FLOOD_RECALL])
    assert.ok(!line.includes('!'), line);
  assert.equal(FLOOD_RECALL.filter(line => line.includes(CERIDWEN)).length, 1);
  for (const phase of ['Blackwater', 'Siltshine', 'Frogcall']) assert.ok(WATER_LESSON.some(line => line.includes(phase)), phase);
});

test('Nethereum’s buyers are registered as the contract gives them, and each trader trades as himself', () => {
  const g = BUYERS.gwyddno, b = BUYERS.boann, a = BUYERS.airmid;
  assert.deepEqual([g.where, g.groups.map(want => [want.items, want.appetite]), g.sells.map(s => [s.id, s.price])],
    ['Nethereum', [[['flood-oats'], 12]], [['smoked-fish', 4], ['salt', 2]]]);
  assert.deepEqual([b.where, b.groups.map(want => [want.items, want.appetite]), b.sells.map(s => [s.id, s.price])],
    ['Nethereum', [[['meadow-hay'], 24], [['barley'], 12]], [['butter', 3], ['ewe-cheese', 4], ['manure', 1]]]);
  assert.deepEqual([a.where, a.wants, a.sells.map(s => [s.id, s.price])], ['Nethereum', [], [['harvest-basket', 20]]]);
  assert.deepEqual(NETHEREUM_BUYERS.map(entry => entry.id), NETHEREUM_TRADERS);
  for (const npc of NETHEREUM_PEOPLE) assert.equal(buyerForNpc(npc)?.id ?? null, NETHEREUM_TRADERS.includes(npc.id) ? npc.id : null, npc.id);
  for (const entry of NETHEREUM_BUYERS) for (const line of Object.values(BUYERS[entry.id].lines).map(l => (typeof l === 'function' ? l(5) : l))) assert.ok(!line.includes('!'), line);
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
      choice.action();
    },
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
  let level = 12;
  const inventory = satchel(), skills = { known: () => true, learn: () => ({ ok: true }), level: () => level, gain: () => ({ ok: true }) };
  const farming = createFarming({ skills, inventory, clock: () => 0 }), meadow = createMeadowWater({ farming, clock: () => 0, skills, inventory });
  const arc = createNethereumArc({ farming, meadow, skills, inventory, clock: () => 0 }), hub = createLizeemFarmlands();
  hub.registerArc('nethereum', arc);
  const d = box(), learned = [], traded = [], fights = [], notes = [];
  let kitchen = { ok: false, reason: 'Learn Fire Making from Lee Anne.' };
  const ctx = { nethereum: arc, ...d, inventory, cooking: { learn: id => { if (kitchen.ok) learned.push(id); return kitchen; } },
    openTrade: npc => traded.push(npc.id), startEncounter: config => fights.push(config), notify: (...line) => notes.push(line) };
  const talk = id => { assert.equal(nethereumConversation(byId(id), ctx), true); return d.ids(); };
  assert.equal(nethereumConversation({ id: 'lizeem-egeria' }, ctx), false, 'somebody else’s person is not ours');

  assert.deepEqual(talk('mererid'), ['mererid-about', 'mererid-leave'], 'nothing to do before Taleth’s charge');
  hub.offer(); hub.accept();
  talk('mererid'); d.choose('nethereum-mererid-meadow');
  assert.deepEqual([arc.stage(), d.last().lines], ['hatch', [...MERERID_MEADOW]]);
  assert.ok(!talk('mererid').includes('nethereum-mererid-meadow'), 'met once');

  // The hatch: words without planks, then the mending.
  talk('seithenyn'); d.choose('nethereum-seithenyn-mend');
  assert.match(d.last().lines[0], /planks/); assert.equal(arc.stage(), 'hatch');
  inventory.add('pine-plank', 2); inventory.add('salvaged-metal', 1);
  talk('seithenyn'); d.choose('nethereum-seithenyn-mend');
  assert.equal(arc.stage(), 'drown'); assert.match(d.last().lines[1], /opens and it shuts/);
  assert.ok(!talk('seithenyn').includes('nethereum-seithenyn-mend'));
  talk('seithenyn'); d.choose('nethereum-seithenyn-flood');
  assert.deepEqual(d.last().lines, [...SEITHENYN_SHAME]);

  // The water, and the levee work that waives the tenth, once a game day.
  talk('mererid'); d.choose('nethereum-mererid-water');
  assert.equal(arc.view().water, true);
  talk('mererid'); d.choose('nethereum-mererid-levee');
  assert.match(d.last().lines.at(-1), /tenth/); assert.equal(arc.leveeWaived(), true);
  talk('mererid'); d.choose('nethereum-mererid-levee');
  assert.match(d.last().lines[0], /tomorrow/);

  // A recipe the kitchen refuses is heard and not kept, and offered again.
  talk('gwyddno'); d.choose('nethereum-gwyddno-smoking');
  assert.deepEqual([arc.view().taught, notes.at(-1)[0]], [[], 'Learn Fire Making from Lee Anne.']);
  kitchen = { ok: true };
  talk('gwyddno'); d.choose('nethereum-gwyddno-smoking');
  assert.deepEqual([learned, arc.view().taught], [['smoked-fish'], ['smoked-fish']]);
  assert.ok(!talk('gwyddno').includes('nethereum-gwyddno-foundling'), 'Gwyddno does not tell the story to a stranger');

  // Boann's wolves, started through the host's combat.
  assert.ok(!talk('boann').includes('nethereum-boann-wolves'), 'no wolves yet');
  const now = arc.snapshot();
  assert.equal(arc.restore({ ...now, stage: 'wolves', shone: true, oats: true, cut: true }), true);
  talk('boann');
  assert.match(d.last().lines[0], /wolves at the cattle/);
  d.choose('nethereum-boann-wolves');
  assert.deepEqual([fights, d.shown.at(-1)], [[NETHEREUM_WOLVES], { closed: true }]);
  arc.wolvesDriven(NETHEREUM_WOLVES.id);
  assert.equal(arc.stage(), 'fine');
  talk('boann'); assert.match(d.last().lines[0], /Thank you/);
  talk('gwyddno'); d.choose('nethereum-gwyddno-foundling');
  assert.deepEqual(d.last().lines, [...GWYDDNO_FOUNDLING]);
  talk('mererid'); d.choose('nethereum-mererid-oatcakes');
  assert.deepEqual(learned, ['smoked-fish', 'oatcakes']);

  // The Recall: only at its stage, only with the dish, and the name carried.
  assert.ok(!talk('fintan').includes('nethereum-fintan-stand'));
  assert.equal(arc.restore({ ...arc.snapshot(), stage: 'recall', fineOats: true, secondCut: true }), true);
  assert.ok(!talk('fintan').includes('nethereum-fintan-stand'), 'not with empty hands');
  assert.match(d.last().lines[0], /empty hands/);
  inventory.add('oatcakes', 1); inventory.add('smoked-fish', 1);
  talk('fintan'); d.choose('nethereum-fintan-stand');
  assert.deepEqual(d.last().lines, [...FLOOD_RECALL]);
  d.choose('nethereum-fintan-carry');
  assert.deepEqual([arc.stage(), arc.view().recall], ['carry', 'carried']);
  assert.match(d.last().lines.join(' '), /old man in the tower/);

  // Liban's ground, and Seithenyn's minding, once Nethereum is restored.
  talk('liban'); d.choose('nethereum-liban-deep');
  assert.match(d.last().lines[1], /meadow back first/);
  arc.deliver();
  talk('liban'); d.choose('nethereum-liban-deep');
  assert.match(d.last().lines[1], new RegExp(`${DEEP_LEVEL}`));
  level = DEEP_LEVEL;
  talk('liban'); d.choose('nethereum-liban-deep');
  assert.match(d.last().lines[1], /They are yours/);
  inventory.remove('oatcakes', 1); inventory.remove('smoked-fish', 1);
  talk('seithenyn'); d.choose('nethereum-seithenyn-mind');
  assert.equal(arc.view().minder, false, 'not for coin');
  inventory.add('smoked-fish', 1);
  assert.equal(firstDish(inventory), 'smoked-fish');
  talk('seithenyn'); d.choose('nethereum-seithenyn-mind');
  assert.deepEqual([arc.view().minder, inventory.count('smoked-fish')], [true, 0]);
  assert.match(talk('seithenyn') && d.last().lines[0], /arrangement/);

  // Trading is for the three who trade.
  for (const id of NETHEREUM_TRADERS) { talk(id); d.choose(`${id}-trade`); }
  assert.deepEqual(traded, [...NETHEREUM_TRADERS]);
  for (const id of ['mererid', 'seithenyn', 'fintan', 'liban']) assert.ok(!talk(id).includes(`${id}-trade`), `${id} does not trade`);
  for (const entry of d.shown.filter(item => item.lines)) for (const line of entry.lines) assert.ok(!line.includes('!'), line);
});
