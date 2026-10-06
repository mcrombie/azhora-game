import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { scopedWorld } from './scoped-world.js';
import { canStand } from '../src/game-state.js';
import { REGION_IDS, hexOwnerAt } from '../src/region-world.js';
import { MENORA_BUILDINGS, MENORA_CAMP, MENORA_NPC_ANCHORS, LIZEEM_MARKET_STANDS, inMenora, menoraRiverClearance } from '../src/menora-city.js';
import { CARICAS_BUILDINGS, CARICAS_GUARD_POSTS } from '../src/caricas-settlement.js';
import { REGIONAL_FARM_ROWS, REGIONAL_SEED_STATIONS, FARMSTEADS } from '../src/regional-farmland.js';
import {
  LIZEEM_PEOPLE, LIZEEM_PEOPLE_IDS, LIZEEM_MINORA_PEOPLE, LIZEEM_CARICAS_PEOPLE, LIZEEM_AMBIENT, LIZEEM_TRADERS,
  isLizeemNpc, lizeemConversation, lizeemHiddenIds, measureGoodsFrom,
} from '../src/lizeem-people.js';
import { createLizeemFarmlands, LIZEEM_ROLES, LIZEEM_RECIPES, TART_ITEM, NORTH_BEDS } from '../src/lizeem-farmlands.js';

const { createCharacter } = await sourceModule('../src/characters.js');
const byId = id => LIZEEM_PEOPLE.find(npc => npc.id === id);
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const STALLS = [{ x: -2100, z: 271 }, { x: -2084, z: 271 }];

test('Every person the build needs is declared once, with the design’s name, and placed', () => {
  const names = ['Seshat', 'Nepri', 'Portunus', 'Rudiger', 'Imhotep', 'Satet', 'Vertumnus', 'Egeria', 'Consus', 'Hagen',
    'Ilmarinen', 'Pomona', 'Silvanus', 'Messor'];
  assert.deepEqual(LIZEEM_PEOPLE.map(npc => npc.name).sort(), [...names].sort());
  assert.equal(new Set(LIZEEM_PEOPLE_IDS).size, LIZEEM_PEOPLE.length);
  for (const id of Object.values(LIZEEM_ROLES)) assert.ok(isLizeemNpc(id), `${id} holds a step and is stood up`);
  for (const npc of LIZEEM_PEOPLE) {
    assert.ok(npc.id.startsWith('lizeem-'), npc.id);
    assert.ok([npc.x, npc.z, npc.yaw].every(Number.isFinite), `${npc.id} has a stand and a facing`);
    assert.equal(typeof npc.role, 'string'); assert.ok(npc.role.length > 0);
  }
  assert.equal(isLizeemNpc('prince-cedric'), false);
});

test('Minora’s people stand inside the walls, more than four metres from water and a metre from every building', () => {
  for (const npc of LIZEEM_MINORA_PEOPLE) {
    assert.ok(inMenora(npc.x, npc.z), `${npc.id} is in Minora`);
    assert.ok(menoraRiverClearance(npc.x, npc.z) > 4, `${npc.id} is clear of the water`);
    for (const b of [...MENORA_BUILDINGS, ...MENORA_CAMP.tents])
      assert.ok(Math.abs(npc.x - b.x) > b.width / 2 + 1 || Math.abs(npc.z - b.z) > b.depth / 2 + 1, `${npc.id} is clear of ${b.id}`);
    for (const anchor of [MENORA_NPC_ANCHORS.cedric, ...MENORA_NPC_ANCHORS.guards])
      assert.ok(gap(npc, anchor) > 3, `${npc.id} does not stand on a prince or a gate guard`);
  }
  const stall = LIZEEM_MARKET_STANDS.find(stand => stand.factor === 'portunus');
  assert.deepEqual([byId('lizeem-portunus').x, byId('lizeem-portunus').z], [stall.x, stall.z], 'Portunus keeps the Carican factor’s stall');
});

test('Caricas’s people stand in Caricas, clear of its buildings, beds, stalls, seed benches and guard posts', () => {
  for (const npc of LIZEEM_CARICAS_PEOPLE) {
    assert.equal(hexOwnerAt(npc.x, npc.z), 'Caricas', `${npc.id} stands in Caricas`);
    for (const b of CARICAS_BUILDINGS)
      assert.ok(Math.abs(npc.x - b.x) > b.w / 2 + 1 || Math.abs(npc.z - b.z) > b.d / 2 + 1, `${npc.id} is clear of ${b.id}`);
    for (const row of REGIONAL_FARM_ROWS) assert.ok(gap(npc, row) > 2.2, `${npc.id} is off ${row.id}`);
    for (const bench of REGIONAL_SEED_STATIONS) assert.ok(gap(npc, bench) > 1.5, `${npc.id} leaves ${bench.id} free`);
    for (const farm of FARMSTEADS) assert.ok(Math.abs(npc.x - farm.shed.x) > farm.shed.w / 2 + 1 || Math.abs(npc.z - farm.shed.z) > farm.shed.d / 2 + 1, `${npc.id} is out of ${farm.id}'s shed`);
    for (const post of CARICAS_GUARD_POSTS) assert.ok(gap(npc, post) > 3, `${npc.id} is off a guard post`);
    for (const stall of STALLS) assert.ok(Math.abs(npc.x - stall.x) > 2.4 || Math.abs(npc.z - stall.z) > 1.2, `${npc.id} is not inside a stall`);
  }
  for (const id of [LIZEEM_ROLES.egeria, LIZEEM_ROLES.consus]) {
    const npc = byId(id), stall = STALLS.find(entry => Math.abs(entry.x - npc.x) < 1);
    assert.ok(stall && npc.z > stall.z && npc.z - stall.z < 2.5, `${id} keeps a grain-court stall from behind its counter`);
  }
  const north = FARMSTEADS.find(farm => farm.id === 'caricas-north-fields');
  for (const id of [LIZEEM_ROLES.vertumnus, LIZEEM_ROLES.messor]) assert.ok(gap(byId(id), north) < 20, `${id} is on the North fields`);
  assert.ok(gap(byId(LIZEEM_ROLES.hagen), CARICAS_BUILDINGS.find(b => b.id === 'caricas-watch-house')) < 14, 'Hagen keeps the watch-house');
});

test('Nobody stands on top of anybody else', () => {
  for (const a of LIZEEM_PEOPLE) for (const b of LIZEEM_PEOPLE)
    if (a !== b) assert.ok(gap(a, b) > 1.5, `${a.id} and ${b.id}`);
});

test('Every civilian stays inside the figure budget, and nobody wears a hat', () => {
  for (const npc of LIZEEM_PEOPLE) {
    assert.equal(npc.hat, false, `${npc.id} is hatless`);
    assert.notEqual(npc.look.hat, true, `${npc.id}'s look adds no hat`);
    assert.ok(npc.look.headgear === undefined || npc.look.headgear === 'bare', `${npc.id} is bare-headed`);
    if (npc.soldier) continue;
    const actor = createCharacter({ role: npc.modelRole, tunic: npc.color, skin: npc.skin, look: npc.look, hat: npc.hat, armed: false });
    let draws = 0, triangles = 0;
    actor.group.traverse(object => {
      if (!object.isMesh) return;
      draws++; triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
    });
    assert.ok(draws < 18, `${npc.id} draws ${draws}`);
    assert.ok(triangles < 4200, `${npc.id} has ${triangles} triangles`);
  }
  const hagen = byId(LIZEEM_ROLES.hagen);
  assert.equal(hagen.soldier, true); assert.equal(hagen.armed, true); assert.equal(hagen.modelRole, 'legion-officer');
});

test('Each person has two or three lines in the game’s voice, the first naming themselves', () => {
  for (const npc of LIZEEM_PEOPLE) {
    const lines = LIZEEM_AMBIENT[npc.id];
    assert.ok(lines && lines.length >= 2 && lines.length <= 3, `${npc.id} has two or three lines`);
    assert.ok(lines[0].includes(npc.name), `${npc.id} introduces themselves`);
    for (const line of lines) assert.ok(!line.includes('!'), `${npc.id}: no exclamation marks`);
  }
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

test('The people who hold a step give it through their conversation, in order, and the rest only talk and trade', () => {
  const q = createLizeemFarmlands(), d = box(), learned = [], traded = [], stock = new Map();
  const inventory = { count: id => stock.get(id) ?? 0, remove: (id, n) => { stock.set(id, (stock.get(id) ?? 0) - n); return true; } };
  const sealed = [];
  const merchants = { seal: (id, n, options) => { sealed.push([id, n, options]); return { ok: true }; }, sealed: () => ({ count: 0, prize: 0 }) };
  const ctx = { farmlands: q, ...d, inventory, merchants, cooking: { learn: id => { learned.push(id); return { ok: true }; } },
    openTrade: npc => traded.push(npc.id) };
  const talk = id => { assert.equal(lizeemConversation(byId(id), ctx), true); return d.ids(); };
  assert.equal(lizeemConversation({ id: 'prince-cedric' }, ctx), false, 'somebody else’s person is not ours');

  assert.ok(!talk(LIZEEM_ROLES.egeria).includes('lizeem-egeria-lease'), 'no lease before Taleth’s charge');
  q.offer(); q.accept();
  talk(LIZEEM_ROLES.egeria); d.choose('lizeem-egeria-lease');
  assert.equal(q.caricas.stage, 'sowing');
  assert.ok(!talk(LIZEEM_ROLES.egeria).includes('lizeem-egeria-lease'), 'the farm is lent once');

  talk(LIZEEM_ROLES.vertumnus); d.choose('lizeem-vertumnus-rotation');
  assert.match(d.last().lines.join(' '), /beans, then fruit or barley, then rye/);
  talk(LIZEEM_ROLES.vertumnus); d.choose('lizeem-vertumnus-recipes');
  assert.deepEqual(learned, [LIZEEM_RECIPES.pottage, LIZEEM_RECIPES.ryeLoaf]);
  assert.ok(!talk(LIZEEM_ROLES.vertumnus).includes('lizeem-vertumnus-recipes'), 'the recipes are taught once');

  talk(LIZEEM_ROLES.pomona); d.choose('lizeem-pomona-tart');
  assert.ok(!learned.includes(TART_ITEM), 'Pomona keeps her gate shut until the ground is rested');
  const rye = { crop: 'bridge-rye', grown: 2, count: 2, grade: 'plain' }, beans = { crop: 'field-beans', grown: 2, count: 2, grade: 'plain' };
  const [b1, b2, b3] = NORTH_BEDS;
  q.harvest(b1, rye); q.harvest(b2, rye); q.harvest(b3, beans); q.harvest(b1, beans); q.harvest(b3, { ...rye, grade: 'good' });
  assert.equal(q.caricas.stage, 'claim');

  assert.ok(talk(LIZEEM_ROLES.hagen).includes('lizeem-hagen-hand'));
  assert.ok(talk(LIZEEM_ROLES.vertumnus).includes('lizeem-vertumnus-hide'));
  talk(LIZEEM_ROLES.hagen); d.choose('lizeem-hagen-hand');
  assert.equal(q.caricas.claim, 'handed');
  assert.ok(!talk(LIZEEM_ROLES.vertumnus).includes('lizeem-vertumnus-hide'), 'the claim is answered once');
  talk(LIZEEM_ROLES.hagen);
  assert.match(d.last().lines[0], /without being asked twice/, 'Hagen remembers who filled his column');

  talk(LIZEEM_ROLES.pomona); d.choose('lizeem-pomona-tart');
  assert.ok(learned.includes(TART_ITEM), 'with the ground rested, Pomona teaches the tart');
  q.harvest(b2, { ...rye, grade: 'fine' });
  assert.equal(q.caricas.stage, 'tart');
  assert.ok(!talk(LIZEEM_ROLES.consus).includes('lizeem-consus-seal'), 'no seal without a tart in the satchel');
  stock.set(TART_ITEM, 1);
  talk(LIZEEM_ROLES.consus); d.choose('lizeem-consus-seal');
  assert.deepEqual(sealed, [[TART_ITEM, 1, { by: 'consus' }]]);
  assert.equal(q.caricas.stage, 'carry');

  assert.deepEqual(lizeemHiddenIds(q), [LIZEEM_ROLES.messor], 'Messor is not back yet');
  q.deliver();
  assert.deepEqual(lizeemHiddenIds(q), []);
  talk(LIZEEM_ROLES.messor); d.choose('lizeem-messor-hire');
  assert.deepEqual(q.caricas.hired, ['messor']);
  assert.ok(!talk(LIZEEM_ROLES.messor).includes('lizeem-messor-hire'));

  for (const id of LIZEEM_TRADERS) { talk(id); d.choose(`${id}-trade`); }
  assert.deepEqual(traded, [...LIZEEM_TRADERS]);
  assert.ok(!talk('lizeem-imhotep').includes('lizeem-imhotep-trade'), 'the Warden does not trade');
  for (const entry of d.shown.filter(item => item.lines)) for (const line of entry.lines) assert.ok(!line.includes('!'), line);
});

test('A seal the market refuses leaves the tart unsealed, and a tart sealed through the trade already counts', () => {
  const walk = () => { const q = createLizeemFarmlands(); q.accept(); q.lease();
    const [b1, b2, b3] = NORTH_BEDS, r = g => ({ crop: 'bridge-rye', grown: 2, count: 2, grade: g }), b = { crop: 'field-beans', grown: 2, count: 2, grade: 'plain' };
    q.harvest(b1, r('plain')); q.harvest(b2, r('plain')); q.harvest(b3, b); q.harvest(b1, b); q.harvest(b3, r('good')); q.settleClaim('hide'); q.harvest(b2, r('fine'));
    return q; };
  const inventory = { count: id => (id === TART_ITEM ? 1 : 0) };
  let q = walk(), d = box();
  lizeemConversation(byId(LIZEEM_ROLES.consus), { farmlands: q, ...d, inventory,
    merchants: { seal: () => ({ ok: false, reason: 'One copper for the seal.' }), sealed: () => ({ count: 0, prize: 0 }) } });
  d.choose('lizeem-consus-seal');
  assert.equal(q.caricas.stage, 'tart'); assert.deepEqual(d.last().lines, ['One copper for the seal.']);
  q = walk(); d = box();
  lizeemConversation(byId(LIZEEM_ROLES.consus), { farmlands: q, ...d, inventory,
    merchants: { seal: () => assert.fail('an already sealed tart is not sealed twice'), sealed: () => ({ count: 1, prize: 0 }) } });
  d.choose('lizeem-consus-seal');
  assert.equal(q.caricas.stage, 'carry');
});

test('Seshat lays sealed Fine food before the Measure and reads it back', () => {
  const q = createLizeemFarmlands(), d = box(), stock = new Map([['bridge-rye-fine', 2], ['field-beans-fine', 1], ['soft-fruit', 3]]);
  const inventory = { count: id => stock.get(id) ?? 0, remove: (id, n) => { stock.set(id, stock.get(id) - n); return true; } };
  const merchants = { sealed: id => (id === 'bridge-rye-fine' ? { count: 2, prize: 1 } : { count: 0, prize: 0 }) };
  assert.deepEqual(measureGoodsFrom({ inventory, merchants }), [{ itemId: 'bridge-rye-fine', grade: 'prize', name: 'Fine bridge rye' }],
    'only sealed fine food counts away from home');
  assert.equal(measureGoodsFrom({ inventory }).length, 2, 'with no market to ask, the fine kinds are offered as Fine');
  const ctx = { farmlands: q, ...d, inventory, merchants };
  lizeemConversation(byId(LIZEEM_ROLES.seshat), ctx);
  assert.ok(!d.ids().some(id => id.startsWith('lizeem-measure-')), 'the Measure is not open before the charge');
  q.accept();
  lizeemConversation(byId(LIZEEM_ROLES.seshat), ctx);
  d.choose('lizeem-measure-bridge-rye-fine');
  assert.equal(q.measureView().leaves[0].lines[0].grade, 'prize');
  assert.equal(stock.get('bridge-rye-fine'), 1, 'what is measured is laid up in the tower');
  assert.match(d.last().lines[0], /^Prize/);
  lizeemConversation(byId(LIZEEM_ROLES.seshat), ctx); d.choose('lizeem-seshat-measure');
  assert.ok(d.last().lines.some(line => line === 'Nethereum: not yet walked.'));
  lizeemConversation(byId(LIZEEM_ROLES.seshat), ctx); d.choose('lizeem-measure-bridge-rye-fine');
  assert.equal(stock.get('bridge-rye-fine'), 1, 'a line already in gold takes nothing more');
});

test('Every stand is ground a body stands on in the built Minora and Caricas', async () => {
  const world = await scopedWorld(new THREE.Scene(), [REGION_IDS.Isareos, REGION_IDS.Caricas]);
  for (const npc of LIZEEM_PEOPLE) assert.ok(canStand(npc.x, npc.z, world, .45), `${npc.id} has footing at ${npc.x}, ${npc.z}`);
});
