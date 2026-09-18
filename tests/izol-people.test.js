import test from 'node:test';
import assert from 'node:assert/strict';
import {
  IZOL_NPCS, IZOL_NPC_IDS, CONDITIONAL_NPC_IDS, IZOL_AMBIENT, IZOL_ALTERNATES, PARTISANS,
  izolLines, izolConversation,
} from '../src/izol-people.js';
import { createIzolHost } from '../src/izol-host.js';
import { IZOL_STANDS, IZOL_GENERALS, generalById, generalsStance, RECRUITING_STANDS } from '../src/izol-world.js';
import { COALITION_MEMBERS, FACTIONS } from '../src/campaign-world.js';

const byId = new Map(IZOL_NPCS.map(npc => [npc.id, npc]));
const allLines = (control = {}) => IZOL_NPC_IDS.flatMap(id => izolLines(id, control));

/** A dialogue box that records what it was given. */
function stubHost() {
  const opened = [];
  return {
    opened,
    openDialogue: (npc, lines, _portrait, back, options) => opened.push({ npc, lines, back, options }),
    closeDialogue: () => {},
  };
}

test('West Izol has twenty-five people, each standing somewhere and each with something to say', () => {
  assert.equal(IZOL_NPCS.length, 25);
  assert.equal(new Set(IZOL_NPC_IDS).size, 25, 'every id is its own');
  for (const npc of IZOL_NPCS) {
    assert.ok(IZOL_STANDS[npc.id], `${npc.id} has a stand`);
    assert.equal(npc.yaw, IZOL_STANDS[npc.id].yaw, `${npc.id} faces the way its stand does`);
    assert.ok(npc.name && npc.role, `${npc.id} is somebody`);
    const lines = IZOL_AMBIENT[npc.id];
    assert.ok(Array.isArray(lines) && lines.length >= 2, `${npc.id} says something`);
    for (const line of lines) assert.ok(line.length > 40, `${npc.id} does not speak in fragments`);
  }
  // Nobody on this island wears Legion armour, and the Legion is not here.
  assert.ok(IZOL_NPCS.every(npc => !String(npc.modelRole).startsWith('legion')), 'no Legion armour on Izol');
  assert.ok(!allLines().some(line => /\bLegion\b/.test(line)), 'and nobody here talks about the Legion');
  // The soldiers are men, and the town is not.
  const soldiers = IZOL_NPCS.filter(npc => npc.modelRole === 'suvali-guard');
  assert.ok(soldiers.length >= 7, 'the town is full of soldiers');
  assert.ok(IZOL_NPCS.filter(npc => npc.modelRole !== 'suvali-guard').length >= 15, 'and of people who are not');
});

test('the first thing the island says is that it has no capital', () => {
  const speaker = izolLines('izol-speaker');
  assert.match(speaker.join(' '), /There is no capital of Izol/);
  assert.match(speaker.join(' '), /Hearthstone/);
  assert.match(speaker.join(' '), /largest harbour is not the same as being the head of anything/);
  // And the theology that holds the politics together is said plainly, without a priesthood.
  const keeper = izolLines('izol-keeper');
  assert.match(keeper.join(' '), /That is not a priesthood. There is no priesthood/);
  assert.match(keeper.join(' '), /the bond that holds/);
  // The oath is the machinery: it is why a confederation with no army has three of them.
  const sworn = allLines().filter(line => /(sworn|swore|swear|oath)/i.test(line));
  assert.ok(sworn.length >= 5, 'the oath is what several people reach for');
  // And the fear of the generals is religious before it is political.
  assert.match(keeper.join(' '), /steps outside her/);
});

test('the three generals are named in one table, and the island is afraid of all three', () => {
  assert.deepEqual(IZOL_GENERALS.map(general => general.name), ['Orsen Kellveth', 'Tavren Doreth', 'Hesk Marech']);
  assert.deepEqual(IZOL_GENERALS.map(general => general.seat), ['Solis', 'Selemis', 'the siege lines before Nylon']);
  // Every partisan names a general the table knows.
  for (const [id, general] of Object.entries(PARTISANS)) {
    assert.ok(byId.has(id), `${id} is somebody`);
    assert.ok(generalById(general), `${id} follows a general who exists`);
  }
  for (const stand of RECRUITING_STANDS) assert.ok(generalById(stand.general));
  // Each general's own man says what that general is stuck with.
  assert.match(izolLines('izol-doreth-agent').join(' '), /cannot put a foot outside it/);
  assert.match(izolLines('izol-marech-serjeant').join(' '), /besieging a town that is on our side/);
  assert.match(izolLines('izol-quartermaster').join(' '), /General Kellveth’s, before you ask/);
  // Nobody is proud of them.
  assert.match(izolLines('izol-highland-representative').join(' '), /I am not proud. I am counting days/);
  assert.match(izolLines('izol-serjeant-suval').join(' '), /Their own men frighten them more than we do/);
});

test('the Selemi war of 978 and 979 is in the harbour, and the Selemi factor has to live with it', () => {
  const factor = izolLines('izol-selemi-factor').join(' ');
  assert.match(factor, /forty-one years/, 'the outpost is on the lore’s own terms');
  assert.match(factor, /My city is occupied by the republic my city is allied to/);
  assert.match(izolLines('izol-master-gannet').join(' '), /I watched the boom go down at Selemis from the deck of my own boat/);
  // The Svaleen merchant remembers being turned down twice, courteously, as the lore says.
  assert.match(izolLines('izol-svaleen-merchant').join(' '), /already in a confederation and did not require another/);
  // Selemis is a Coalition member and an occupied country at once, and the game already lists it as a member.
  assert.ok(COALITION_MEMBERS.some(member => member.id === 'selemis'));
  assert.equal(FACTIONS.izoli.seat, 'Izolveth');
});

test('the army billeted on the town is felt from both sides', () => {
  const town = ['izol-fishwife', 'izol-netmaker', 'izol-sail-mistress', 'izol-boatwright', 'izol-quay-runner']
    .flatMap(id => izolLines(id)).join(' ');
  assert.match(town, /dearer than it was/);
  assert.match(town, /requisition/);
  assert.match(town, /you cannot rig a boat with a promise/);
  const camp = ['izol-captain-izoli', 'izol-serjeant-suval', 'izol-rebel-officer', 'izol-marosh-spearman', 'izol-surgeon']
    .flatMap(id => izolLines(id)).join(' ');
  assert.match(camp, /Nobody shouts at us. Nobody sells to us cheap either/);
  assert.match(camp, /a road home I could not draw you/);
  // The rebels keep the game's rule about the word: republicans say empire with contempt.
  assert.match(izolLines('izol-rebel-officer').join(' '), /Call it an empire in front of me/);
});

test('Chapter 2 decides where General Kellveth is, and four people say so', () => {
  const held = { 'West Suval': 'coalition' }, lost = { 'West Suval': 'empire' };
  assert.equal(generalsStance(held).kellvethHome, false);
  assert.equal(generalsStance(lost).kellvethHome, true);
  assert.deepEqual(CONDITIONAL_NPC_IDS, ['izol-general-kellveth']);
  assert.equal(byId.get('izol-general-kellveth').hidden, true, 'the general is out only when he is home');
  // Exactly the people with an alternate say something different under the two outcomes.
  for (const id of IZOL_NPC_IDS) {
    const same = izolLines(id, held).join('|') === izolLines(id, lost).join('|');
    assert.equal(same, !IZOL_ALTERNATES[id], `${id} changes its line only if it has an alternate`);
  }
  assert.equal(Object.keys(IZOL_ALTERNATES).length, 4);
  assert.match(izolLines('izol-speaker', lost).at(-1), /came home in the spring/);
  assert.match(izolLines('izol-speaker', held).at(-1), /Kellveth holds Solis/);
  assert.match(izolLines('izol-harbourmaster', lost).at(-1), /Nothing has gone east to Solis since the spring/);
  assert.match(izolLines('izol-quartermaster', held).at(-1), /the line to it is open/);
});

test('the host registers the island, answers only its own people, and hides the general until he is home', () => {
  const world = { npcPositions: {} }, npcData = [];
  const host = createIzolHost({ world, npcData });
  assert.equal(npcData.length, 25);
  for (const npc of npcData) {
    assert.ok(world.npcPositions[npc.id], `${npc.id} was placed`);
    assert.equal(world.npcPositions[npc.id].x, IZOL_STANDS[npc.id].x);
  }
  const npcById = new Map(npcData.map(npc => [npc.id, npc]));
  const kellveth = npcById.get('izol-general-kellveth');

  assert.equal(host.frame({ npcById, control: { 'West Suval': 'coalition' } }).kellvethHome, false);
  assert.equal(kellveth.hidden, true, 'Solis held: the general is in Solis');
  assert.equal(host.frame({ npcById, control: { 'West Suval': 'empire' } }).kellvethHome, true);
  assert.equal(kellveth.hidden, false, 'Solis lost: the general is at home with nothing to do');
  // The frame is cheap when nothing has changed.
  const again = host.frame({ npcById, control: { 'West Suval': 'empire' } });
  assert.equal(again.kellvethHome, true);

  const box = stubHost();
  assert.equal(host.converse({ id: 'harbormaster' }, box), false, 'somebody else’s person is somebody else’s');
  assert.equal(host.converse(npcById.get('izol-speaker'), { control: {}, ...box }), true);
  assert.equal(box.opened.length, 1);
  assert.equal(box.opened[0].options.choices[0].id, 'leave-izol-talk');
  assert.equal(box.opened[0].back, 'Back to the town');
  // A soldier in the camp is left by the lines, a master on the quay by the quay.
  const camp = stubHost();
  izolConversation(byId.get('izol-captain-izoli'), { control: {}, ...camp });
  assert.equal(camp.opened[0].back, 'Back to the lines');
  const quay = stubHost();
  izolConversation(byId.get('izol-harbourmaster'), { control: {}, ...quay });
  assert.equal(quay.opened[0].back, 'Back to the quay');
  // Nobody here moves a quest: every conversation has one way out and no other choice.
  for (const npc of IZOL_NPCS) {
    const seen = stubHost();
    assert.equal(izolConversation(npc, { control: {}, ...seen }), true, npc.id);
    assert.equal(seen.opened[0].options.choices.length, 1, `${npc.id} offers no quest`);
  }
});
