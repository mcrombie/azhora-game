import test from 'node:test';
import assert from 'node:assert/strict';
import { SOLIS_NPCS, SOLIS_NPC_IDS, SOLIS_TOWNSFOLK_IDS, solisConversation, townsfolkLines, captainLines } from '../src/solis-town.js';
import { createWestSuvalHost } from '../src/west-suval-host.js';
import { createBorderChapter, BORDER_NPCS, BORDER_ENCOUNTER_ID, BORDER_ARENA, BORDER_ARRIVAL_RADIUS, MARCH } from '../src/border-chapter.js';
import { createAftermathChapter, AFTERMATH_VARIANTS } from '../src/aftermath-chapter.js';
import { AFTERMATH_SITES, AFTERMATH_ARENAS } from '../src/aftermath-sites.js';
import { isOut, stakeOf, occupationControl } from '../src/occupation.js';
import { SOLIS_SQUARE, SOLIS_APPROACH, SOLIS_STANDS } from '../src/west-suval.js';
import { SOLIS, solisPoint } from '../src/region-world.js';

const byId = id => SOLIS_NPCS.find(npc => npc.id === id);
const talk = (npc, extra = {}) => {
  const screens = [];
  const handled = solisConversation(npc, { openDialogue: (who, lines, unused, label, options) => screens.push({ lines, label, options }), closeDialogue: () => {}, act: () => {}, ...extra });
  return { handled, screen: screens.at(-1) };
};

test('Solis has both garrisons by occupation stake, and townsfolk who hold nothing', () => {
  const coalition = SOLIS_NPCS.filter(npc => npc.holds === 'coalition'), empire = SOLIS_NPCS.filter(npc => npc.holds === 'empire');
  assert.ok(coalition.length >= 8 && empire.length >= 3, 'a garrison each');
  assert.ok(empire.length < coalition.length, 'the army’s occupation is the smaller');
  for (const npc of [...coalition, ...empire]) assert.equal(npc.region, 'West Suval');
  assert.ok(coalition.every(npc => npc.modelRole === 'suvali-guard'), 'Coalition soldiers wear the Suvali kit');
  assert.ok(empire.filter(npc => npc.id !== 'solis-tribune-clerk').every(npc => npc.modelRole === 'legion-soldier'));
  const townsfolk = SOLIS_NPCS.filter(npc => !npc.holds);
  assert.ok(townsfolk.length >= 5 && townsfolk.length <= 7, 'a merchant and four to six townsfolk');
  // The Coalition holds Solis when the game begins; the army's people come in when the Empire takes it.
  const start = { 'West Suval': 'coalition' }, taken = occupationControl(start, { variant: 'solis-sweep', cleared: true });
  assert.equal(taken['West Suval'], 'empire', 'the square cleared is the city fallen');
  for (const npc of SOLIS_NPCS) {
    assert.equal(isOut(stakeOf(npc), start), npc.holds !== 'empire', `${npc.id} under the Coalition`);
    assert.equal(isOut(stakeOf(npc), taken), npc.holds !== 'coalition', `${npc.id} under the Empire`);
  }
  // No one stands on anyone else: the gate watch of either side shares a stand, but never at the same time.
  const stands = new Map();
  for (const npc of [...SOLIS_NPCS, ...BORDER_NPCS.filter(person => person.shows === 'envoy' || person.shows === 'report-coalition')]) {
    const key = `${npc.x.toFixed(1)},${npc.z.toFixed(1)}`;
    if (stands.has(key)) assert.notEqual(stands.get(key).holds ?? 'none', npc.holds ?? 'none', `${npc.id} and ${stands.get(key).id} share a stand`);
    stands.set(key, npc);
  }
});

test('the captains say who they are and why they came, in two lines each; the Pyrosi are few', () => {
  const captains = SOLIS_NPCS.filter(npc => npc.id.startsWith('camp-captain-'));
  assert.equal(captains.length, 6, 'one captain for each major contingent');
  for (const captain of [...captains, byId('camp-pyrosi')]) {
    const { handled, screen } = talk(captain);
    assert.equal(handled, true);
    assert.equal(screen.lines.length, 2, `${captain.name} speaks two lines`);
    assert.deepEqual(screen.lines, captainLines(captain.id));
  }
  const all = [...captains, byId('camp-pyrosi')].flatMap(npc => captainLines(npc.id)).join(' ');
  for (const people of ['Izol', 'Suvali', 'heartland', 'Selemis', 'Marosh', 'island cities', 'Pyrosi']) assert.match(all, new RegExp(people));
  assert.doesNotMatch(all, /South Pyros/);
  assert.match(captainLines('camp-pyrosi').join(' '), /whole contingent is in that one tent/);
});

test('the townsfolk speak for whoever holds the gate, and the merchant grumbles about paper scrip', () => {
  for (const id of SOLIS_TOWNSFOLK_IDS) {
    const lines = ['coalition', 'empire', 'routed'].map(holder => townsfolkLines(id, holder).join(' '));
    assert.equal(new Set(lines).size, 3, `${id} has a line for each holder`);
    assert.equal(talk(byId(id), { holder: 'empire' }).screen.lines.join(' '), lines[1]);
  }
  const merchant = townsfolkLines('solis-merchant', 'coalition').join(' ');
  assert.match(merchant, /scrip/); assert.match(merchant, /Paper/);
  assert.match(townsfolkLines('solis-elder', 'coalition').join(' '), /king/, 'they remember being a kingdom');
  assert.match(talk(byId('solis-legion-square')).screen.lines[0], /by order of Captain Brulan/, 'the army speaks in orders');
  assert.match(talk(byId('solis-legion-gate-east')).screen.lines[0], /Rebels/, 'and calls the republicans rebels');
  assert.equal(solisConversation({ id: 'someone-else' }, { openDialogue: () => {}, closeDialogue: () => {} }), false);
});

test('Sergeant Kell admits the Marshal’s messenger at the Gate of Sun Horses, and only then', () => {
  const border = createBorderChapter(), gate = byId('solis-gate-captain'), acts = [];
  const context = { border, act: id => { acts.push(id); return border.act(id); } };
  assert.equal(talk(gate, context).screen.options.choices.some(choice => choice.id === 'enter-solis'), false, 'no seal, no business');
  border.start(); border.act('take-legate-terms');
  const { screen } = talk(gate, context);
  assert.match(screen.lines.join(' '), /army seal/);
  const admit = screen.options.choices.find(choice => choice.id === 'enter-solis');
  assert.ok(admit); admit.action();
  assert.deepEqual(acts, ['enter-solis']);
  assert.equal(border.view().stage, 'meet-envoy');
  assert.match(talk(gate, context).screen.lines[0], /Court of Oaths/);
});

test('Envoy Telis Orren is never out twice: the border chapter’s through the march, the aftermath’s only after the battle on the Republic’s side', () => {
  for (const [side, outcome] of [['coalition', 'victory'], ['coalition', 'defeat'], ['empire', 'victory'], ['empire', 'defeat']]) {
    const border = createBorderChapter(), aftermath = createAftermathChapter();
    const envoyOut = () => border.cast().includes('coalition-envoy');
    const aftermathEnvoyOut = () => aftermath.cast().some(entry => entry.id === 'aftermath-envoy');
    const check = () => assert.ok(!(envoyOut() && aftermathEnvoyOut()), 'both envoys are out');
    border.start(); check(); border.act('take-legate-terms'); check(); border.act('enter-solis'); check();
    assert.equal(envoyOut(), true, 'she waits in the Court of Oaths');
    border.act(`side-${side}`); check();
    assert.equal(envoyOut(), true, 'signing a contract does not clear the Court of Oaths');
    border.act('march-out'); border.act('reach-line'); border.resolveBattle(BORDER_ENCOUNTER_ID); check();
    const variant = Object.values(AFTERMATH_VARIANTS).find(spec => spec.side === side && spec.outcome === outcome);
    aftermath.start(variant.id); check();
    aftermath.act('begin-assault'); aftermath.winEncounter(variant.encounterId); check();
    assert.equal(aftermathEnvoyOut(), side === 'coalition', `${variant.id}: the envoy reports only for the Republic`);
    assert.equal(envoyOut(), false);
  }
});

test('the day after the battle finds its ground in Solis: the gate, the Court of Oaths, and the road outside', () => {
  const offset = point => ({ a: +(point.x - SOLIS.centre.x).toFixed(6), b: +(point.z - SOLIS.centre.z).toFixed(6) });
  // The gate is stormed from outside: the fight is on the road before it, between the approach and the walls, and the way out is back up the road.
  const assault = AFTERMATH_ARENAS['solis-gate-assault'];
  assert.ok(offset(assault.center).b < SOLIS_APPROACH.b + 30 && offset(assault.center).b > SOLIS_APPROACH.b, 'the gate assault is fought outside the walls');
  assert.equal(assault.retreatAxis, 'z'); assert.equal(assault.retreatSign, -1);
  assert.ok(offset(assault.center).b - SOLIS_SQUARE.b < -40, 'nowhere near the market square');
  assert.deepEqual(offset(AFTERMATH_ARENAS['solis-approach'].center), { a: SOLIS_APPROACH.a, b: SOLIS_APPROACH.b });
  assert.equal(AFTERMATH_ARENAS['solis-approach'].retreatAxis, SOLIS_APPROACH.axis);
  const gate = AFTERMATH_SITES['solis-gate'], hall = AFTERMATH_SITES['solis-hall'];
  assert.ok(offset(gate).b < -42 && Math.abs(offset(gate).a) < 12, 'outside the Gate of Sun Horses, beside the road');
  assert.ok(Math.abs(offset(hall).a - 17.5) < 1e-6 && Math.abs(offset(hall).b - 2) < 1e-6, 'on the steps of the Court of Oaths');
  // Nobody of Solis's own stands where the chapter's people will.
  for (const site of [gate, hall]) for (const [id, stand] of Object.entries(SOLIS_STANDS)) {
    if (['coalition-envoy', 'envoy-guard-north', 'envoy-guard-south', 'solis-captain'].includes(id)) continue;
    assert.ok(Math.hypot(stand.x - site.x, stand.z - site.z) >= 2.5, `${id} leaves ${site.name} room`);
  }
});

test('the host registers Solis, stands both garrisons down while the square is fought over, and marches the column to the line', () => {
  const positions = {}, npcData = [];
  const holders = [];
  const world = { npcPositions: positions, heightAt: () => 5, setSolisHolder: holder => holders.push(holder) };
  const host = createWestSuvalHost({ world, npcData });
  assert.deepEqual(npcData.map(npc => npc.id), SOLIS_NPCS.map(npc => npc.id));
  for (const npc of npcData) assert.deepEqual(positions[npc.id], { x: npc.x, z: npc.z });
  const actor = (x = 0, z = 0) => ({ group: { position: { x, y: 0, z, set(nx, ny, nz) { this.x = nx; this.y = ny; this.z = nz; } } } });
  const npcs = [...npcData, ...BORDER_NPCS.map(person => ({ ...person })), { id: 'merc-a' }, { id: 'merc-b' }];
  for (const npc of npcs) npc.actor = actor(npc.x ?? 0, npc.z ?? 0);
  const npcById = new Map(npcs.map(npc => [npc.id, npc]));
  const player = { group: { position: { x: SOLIS.centre.x, z: SOLIS.centre.z - 60 }, rotation: { y: Math.PI } } };
  const border = createBorderChapter(); border.start(); border.act('take-legate-terms'); border.act('enter-solis');
  const frame = extra => host.frame({ npcById, player, border, control: { 'West Suval': 'coalition' }, aftermath: null, ...extra });
  assert.equal(frame().holder, 'coalition'); assert.deepEqual(holders, ['coalition']);
  // While the army clears the square, neither garrison stands.
  frame({ aftermath: { variant: 'solis-sweep', cleared: false } });
  assert.equal(holders.at(-1), 'routed');
  assert.ok(npcData.filter(npc => npc.holds).every(npc => npc.hidden), 'the garrisons are gone');
  assert.ok(npcData.filter(npc => !npc.holds).every(npc => !npc.hidden), 'the townsfolk stay');
  frame({ control: { 'West Suval': 'empire' } }); assert.equal(holders.at(-1), 'empire');
  // The Empire's march: the file of soldiers and the mustered hired swords fall in behind the traveler.
  border.act('side-empire'); border.act('march-out');
  player.group.position = { x: BORDER_ARENA.checkpoint.x + 200, z: BORDER_ARENA.checkpoint.z };
  let arrived = 0;
  const marching = frame({ mustered: ['merc-a', 'merc-b'], arrive: () => { arrived++; } });
  assert.deepEqual(marching.column, ['march-legionary-1', 'march-legionary-2', 'merc-a', 'merc-b']);
  for (const id of marching.column) {
    const slot = positions[id];
    assert.ok(Math.hypot(slot.x - player.group.position.x, slot.z - player.group.position.z) < 8, `${id} marches at the traveler’s back`);
    assert.ok(Math.hypot(npcById.get(id).actor.group.position.x - player.group.position.x, npcById.get(id).actor.group.position.z - player.group.position.z) < MARCH.catchUp, `${id} was moved up rather than left behind`);
  }
  assert.equal(arrived, 0, 'not at the line yet');
  player.group.position = { x: BORDER_ARENA.checkpoint.x + BORDER_ARRIVAL_RADIUS / 2, z: BORDER_ARENA.checkpoint.z };
  frame({ mustered: ['merc-a', 'merc-b'], arrive: () => { arrived++; border.act('reach-line'); } });
  frame({ mustered: ['merc-a', 'merc-b'], arrive: () => { arrived++; } });
  assert.equal(arrived, 1, 'the column comes up once');
  assert.equal(border.view().stage, 'fighting');
  // In the fight the combat view draws the allies; their NPCs are not drawn twice.
  npcById.get('merc-a').hidden = false;
  frame({ encounterId: BORDER_ENCOUNTER_ID, fightingAllies: ['merc-a'] });
  assert.equal(npcById.get('merc-a').hidden, true);
  assert.equal(solisPoint(0, 0).x, SOLIS.centre.x);
});
