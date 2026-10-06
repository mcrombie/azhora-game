import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import {
  MINORA_PEOPLE, MINORA_PEOPLE_IDS, MINORA_AMBIENT, MINORA_TOPICS, MINORA_BUYERS, MINORA_TRADERS, HAPI_STAND, HAPI_LOT, HAPI_TERMS,
  RIVER_GOODS, AMALTHEA_LOAF, isMinoraNpc, minoraConversation, hapiNews,
} from '../src/lizeem-minora-people.js';
import { NESDOR_BOARDS } from '../src/lizeem-nesdor-people.js';
import { LIZEEM_PEOPLE_IDS } from '../src/lizeem-people.js';
import { NETHEREUM_PEOPLE_IDS } from '../src/lizeem-nethereum-people.js';
import { LIZEEM_RECIPES } from '../src/lizeem-farmlands.js';
import { BUYERS, MERCHANT_ITEMS, buyerForNpc, createMerchants } from '../src/merchants.js';
import { INVENTORY_ITEMS } from '../src/inventory.js';
import { MENORA, MENORA_BUILDINGS, MENORA_CAMP, MENORA_GARDENS, MENORA_PATHS, LIZEEM_MARKET_STANDS, inMenora, menoraGround,
  menoraRiverClearance, menoraSegmentDistance } from '../src/menora-city.js';
import { ISAREOS_HAMLET_STAND } from '../src/isareos-hamlet.js';

/**
 * The rest of Minora's people for the Farmlands of the Lizeem (src/lizeem-minora-people.js; Build 5, 6 October 2026):
 * the three factors, the barge master and the cheese-maker.
 */
const { createCharacter } = await sourceModule('../src/characters.js');
const byId = id => MINORA_PEOPLE.find(npc => npc.id === id);

test('the five of design 6.2 are declared once, each at the stand the city or the hamlet keeps for them', () => {
  assert.deepEqual([...MINORA_PEOPLE_IDS], ['manawydan', 'njord', 'adapa', 'hapi', 'amalthea']);
  for (const npc of MINORA_PEOPLE) {
    assert.ok(isMinoraNpc(npc.id));
    assert.ok(!LIZEEM_PEOPLE_IDS.includes(npc.id) && !NETHEREUM_PEOPLE_IDS.includes(npc.id) && npc.id !== 'taleth', `${npc.id} is nobody else`);
    assert.ok(npc.role.length > 0);
  }
  for (const factor of ['manawydan', 'njord', 'adapa']) {
    const stand = LIZEEM_MARKET_STANDS.find(s => s.factor === factor), npc = byId(factor);
    assert.deepEqual([npc.x, npc.z, npc.yaw], [stand.x, stand.z, stand.yaw], `${factor} keeps his or her own stall`);
  }
  assert.deepEqual(LIZEEM_MARKET_STANDS.map(s => s.country).sort(), ['Caricas', 'Nesdor', 'Nethereum', 'Ovesos']);
  assert.deepEqual([byId('hapi').x, byId('hapi').z, byId('hapi').yaw], [HAPI_STAND.x, HAPI_STAND.z, HAPI_STAND.yaw]);
  assert.deepEqual([byId('amalthea').x, byId('amalthea').z, byId('amalthea').yaw], [ISAREOS_HAMLET_STAND.x, ISAREOS_HAMLET_STAND.z, ISAREOS_HAMLET_STAND.yaw]);
  assert.equal(isMinoraNpc('lizeem-portunus'), false);
});

test('the city stands keep the rules of the market corner: inside the walls, four metres from water, a metre from every building', async () => {
  const storehouse = MENORA_BUILDINGS.find(b => b.id === 'menora-storehouse');
  const clear = (p, b) => Math.abs(p.x - b.x) > b.width / 2 + 1 || Math.abs(p.z - b.z) > b.depth / 2 + 1;
  for (const npc of MINORA_PEOPLE.filter(person => person.id !== 'amalthea')) {
    assert.ok(inMenora(npc.x, npc.z), `${npc.id} is inside the walls`);
    assert.ok(menoraRiverClearance(npc.x, npc.z) > 4, `${npc.id} is too near water`);
    for (const b of [...MENORA_BUILDINGS, ...MENORA_CAMP.tents]) assert.ok(clear(npc, b), `${npc.id} stands within a metre of ${b.id}`);
    for (const g of MENORA_GARDENS) assert.ok(Math.abs(npc.x - g.x) > g.width / 2 || Math.abs(npc.z - g.z) > g.depth / 2, `${npc.id} is in a garden`);
  }
  // Hapi is on the river side of the River storehouse: south of it, between its wall and the city's, off every lane.
  const hapi = byId('hapi');
  assert.ok(hapi.z > storehouse.z + storehouse.depth / 2 + 1 && Math.abs(hapi.x - storehouse.x) < storehouse.width / 2, 'below the storehouse');
  for (const path of MENORA_PATHS) for (let i = 1; i < path.points.length; i++)
    assert.ok(menoraSegmentDistance(hapi.x, hapi.z, path.points[i - 1], path.points[i]) > path.width / 2, `Hapi is in ${path.id}`);
  // And nothing the city builds stands where any of them does, the city wall included (tests/menora-city.test.js).
  const THREE = await sourceModule('../vendor/three.module.js');
  const { createMenoraScenery } = await sourceModule('../src/menora-scenery.js');
  const colliders = [];
  createMenoraScenery({ parent: new THREE.Group(), colliders, heightAt: (x, z) => menoraGround(x, z, MENORA.elevation) });
  const blocked = (x, z) => colliders.find(c => c.minY <= 22.9 && c.maxY >= 21.3 && (c.r !== undefined
    ? Math.hypot(x - c.x, z - c.z) < c.r + .55 : Math.abs(x - c.x) < c.hx + .55 && Math.abs(z - c.z) < c.hz + .55));
  for (const npc of MINORA_PEOPLE.filter(person => person.id !== 'amalthea')) assert.equal(blocked(npc.x, npc.z), undefined, `${npc.id} is blocked`);
  // He faces east, toward the Isa Gate and the Sacred Way, the way in from the bridge, and he can be walked to from the
  // Sacred Way past the corner tower, and from Market Lane round the storehouse's west end.
  assert.ok(Math.sin(hapi.yaw) > .99);
  const walker = (x, z) => colliders.some(c => c.minY <= 22.9 && c.maxY >= 21.3 && (c.r !== undefined
    ? Math.hypot(x - c.x, z - c.z) < c.r + .34 : Math.abs(x - c.x) < c.hx + .34 && Math.abs(z - c.z) < c.hz + .34));
  const step = .5, key = (x, z) => `${Math.round(x * 2)},${Math.round(z * 2)}`, seen = new Set([key(hapi.x, hapi.z)]), queue = [[hapi.x, hapi.z]];
  const reached = { 'the Sacred Way': [-2308, 200], 'Market Lane': [-2355, 184] }, found = new Set();
  while (queue.length) {
    const [x, z] = queue.shift();
    for (const [name, [gx, gz]] of Object.entries(reached)) if (Math.hypot(x - gx, z - gz) < 1) found.add(name);
    for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const nx = x + dx, nz = z + dz;
      if (nx < -2380 || nx > -2300 || nz < 175 || nz > 215 || seen.has(key(nx, nz)) || walker(nx, nz)) continue;
      seen.add(key(nx, nz)); queue.push([nx, nz]);
    }
  }
  assert.deepEqual([...found].sort(), Object.keys(reached).sort(), 'Hapi can be walked to');
});

test('every one of them is drawn inside a civilian’s budget, and nobody wears a hat, Amalthea’s kerchief included', () => {
  for (const npc of MINORA_PEOPLE) {
    assert.equal(npc.hat, false, `${npc.id} is hatless`);
    assert.ok(npc.look.headgear === undefined || npc.look.headgear === 'bare', `${npc.id} is bare-headed`);
    assert.notEqual(npc.look.hairStyle, 'mane');
    const actor = createCharacter({ role: npc.modelRole, tunic: npc.color, skin: npc.skin, look: npc.look, hat: npc.hat, armed: false });
    let draws = 0, triangles = 0;
    actor.group.traverse(object => { if (object.isMesh) { draws++; triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3; } });
    assert.ok(draws < 18, `${npc.id} draws ${draws}`);
    assert.ok(triangles < 4200, `${npc.id} has ${Math.round(triangles)} triangles`);
  }
  for (const id of ['manawydan', 'amalthea']) assert.deepEqual([byId(id).look.slight, byId(id).look.dress], [true, true], `${id} is drawn as a woman`);
  assert.equal(byId('adapa').look.facialHair, 'forked');
  assert.equal(byId('hapi').look.garment, 'bare-forearms');
});

test('each has two or three lines, the first naming them, and nobody exclaims', () => {
  for (const npc of MINORA_PEOPLE) {
    const lines = MINORA_AMBIENT[npc.id];
    assert.ok(lines.length >= 2 && lines.length <= 3, `${npc.id} has two or three lines`);
    assert.ok(lines[0].startsWith(npc.name), `${npc.id} introduces themselves`);
    assert.ok(MINORA_TOPICS[npc.id].length >= 1);
  }
  const all = [...Object.values(MINORA_AMBIENT).flat(), ...Object.values(MINORA_TOPICS).flat().flatMap(topic => topic.lines), ...AMALTHEA_LOAF,
    ...MINORA_BUYERS.flatMap(b => [b.lines.open, b.lines.full, b.lines.none, b.lines.paid(7)])];
  for (const line of all) assert.ok(!line.includes('!'), line);
  assert.match(MINORA_TOPICS.manawydan[0].lines.join(' '), /Consensus is not unanimity/);
  assert.match(MINORA_AMBIENT.adapa.join(' '), /eleven years into the Middle Reach proceeding/);
});

test('their buyers are the contract’s: appetites, wares, the Way board at Njord’s stall, and the barge’s lots', () => {
  for (const id of MINORA_TRADERS) assert.equal(buyerForNpc(byId(id)), BUYERS[id], `${id} trades as himself or herself`);
  assert.deepEqual(BUYERS.manawydan.groups.map(g => [[...g.items], g.appetite]), [[['east-bank'], 20]]);
  assert.deepEqual(BUYERS.manawydan.sells.map(s => [s.id, s.price]), [['smoked-fish', 4], ['meadow-hay', 2], ['hides', 2]]);
  assert.deepEqual(BUYERS.njord.groups.map(g => [[...g.items], g.appetite]), [[['flour', 'dish'], 12]]);
  assert.equal(BUYERS.njord.board, 'nesdor-way');
  assert.deepEqual(BUYERS.adapa.groups.map(g => [[...g.items], g.appetite]), [[['bridge-rye', 'rye', 'flood-oats', 'weir-fish', 'meadow-hay'], 20]]);
  assert.deepEqual(BUYERS.adapa.sells.map(s => [s.id, s.price]), [['hard-wheat-flour', 3], ['cloth', 8], ['hard-wheat-seed', 2]]);
  assert.deepEqual(BUYERS.amalthea.groups.map(g => [[...g.items], g.appetite]), [[['meadow-hay'], 12]]);
  assert.deepEqual(BUYERS.amalthea.sells.map(s => [s.id, s.price]), [['ewe-cheese', 4]]);
  // The barge: sealed Fine or Prize only, one lot of each of the river's goods, each its own want, at twice the home
  // price and no second lot (src/merchants.js, the integration of 6 October 2026); not the commissary's open rate.
  assert.equal(BUYERS.hapi.sealedOnly, true);
  assert.equal(BUYERS.hapi.rate, HAPI_TERMS.rate);
  assert.equal(BUYERS.hapi.fineOnly, true);
  assert.equal(BUYERS.hapi.secondLot, false);
  assert.deepEqual(BUYERS.hapi.groups.map(g => g.items[0]), [...RIVER_GOODS]);
  assert.ok(BUYERS.hapi.groups.every(g => g.items.length === 1 && g.appetite === HAPI_LOT));
  assert.deepEqual({ ...HAPI_TERMS, grades: [...HAPI_TERMS.grades] }, { rate: 2, grades: ['fine', 'prize'], lot: HAPI_LOT, secondLot: false });
});

/** A satchel with the real one's rules over a wider list of goods, and the market on it. */
function market(start = {}) {
  const goods = ['bridge-rye', 'bridge-rye-fine', 'flood-oats', 'weir-fish', 'weir-fish-fine', 'meadow-hay', 'floodwheat', 'floodwheat-fine', 'barley', 'white-bread', 'nut-cake', 'hazelnuts', 'smoked-fish', 'hides', 'ewe-cheese'];
  const items = { ...INVENTORY_ITEMS, ...MERCHANT_ITEMS, ...Object.fromEntries(goods.map(id => [id, { name: id.replace(/-/g, ' '), stackable: true }])) };
  const owned = new Map(Object.entries(start));
  const inventory = {
    count: id => owned.get(id) ?? 0, items: () => [...owned.keys()],
    add(id, n = 1) { if (!Object.hasOwn(items, id)) return false; owned.set(id, (owned.get(id) ?? 0) + n); return true; },
    remove(id, n = 1) { const before = owned.get(id) ?? 0; if (before < n) return false; if (before === n) owned.delete(id); else owned.set(id, before - n); return true; },
  };
  const clock = { t: 0 };
  return { inventory, clock, merchants: createMerchants({ inventory, items, playSeconds: () => clock.t }) };
}

test('Njord carries the Way board: the same three orders as Forseti’s door, and one filled at his stall is filled at hers', () => {
  assert.ok(NESDOR_BOARDS.some(board => board.id === 'nesdor-way'));
  const { merchants, inventory } = market({ 'bridge-rye': 40, barley: 40, floodwheat: 40, 'meadow-hay': 40, hazelnuts: 40, 'white-bread': 10, 'nut-cake': 10 });
  const shown = [];
  const ctx = { openDialogue: (npc, lines, event, action, options) => shown.push({ npc, lines, options }), closeDialogue: () => {} };
  assert.equal(merchants.ordersConversation(byId('njord'), ctx), true);
  const atNjord = shown.at(-1);
  assert.match(atNjord.lines[0], /The Way board/);
  const forsetiOrders = merchants.orders('nesdor-way');
  assert.deepEqual(atNjord.options.choices.filter(c => c.id.startsWith('fill-')).map(c => c.id), forsetiOrders.map(o => `fill-${o.id}`));
  const ready = atNjord.options.choices.find(c => c.id.startsWith('fill-') && c.enabled);
  assert.ok(ready, 'one of today’s orders can be filled from this satchel');
  const before = inventory.count('copper-piece');
  ready.action();
  assert.ok(inventory.count('copper-piece') > before, 'and filling it pays');
  assert.ok(merchants.orders('nesdor-way').some(o => `fill-${o.id}` === ready.id && o.filled), 'Forseti’s board shows it filled');
  // His trade dialogue offers the same board.
  merchants.tradeConversation(byId('njord'), ctx);
  assert.ok(shown.at(-1).options.choices.some(c => c.id === 'orders-njord'));
});

test('the barge takes sealed Fine goods only, a lot of each good at twice the home price, no second lot, and one good’s lot does not use up another’s', () => {
  const { merchants, inventory } = market({ 'bridge-rye-fine': 12, 'weir-fish': 12, 'weir-fish-fine': 12, 'copper-piece': 10 });
  assert.equal(merchants.quote('hapi', 'bridge-rye-fine').ok, false, 'unsealed, it does not go aboard');
  assert.equal(merchants.seal('bridge-rye-fine', 12, { by: 'nepri' }).ok, true);
  assert.equal(merchants.seal('weir-fish', 12, { by: 'nepri' }).ok, true);
  assert.equal(merchants.seal('weir-fish-fine', 12, { by: 'nepri' }).ok, true);
  assert.equal(merchants.quote('hapi', 'weir-fish').ok, false, 'a Plain lot does not go aboard, sealed or not');
  assert.equal(merchants.appetite('hapi', 'bridge-rye-fine').full, HAPI_LOT);
  const before = inventory.count('copper-piece'), sealedRye = merchants.sealed('bridge-rye-fine').count;
  const rye = merchants.sell('hapi', 'bridge-rye-fine', HAPI_LOT);
  assert.equal(rye.ok, true);
  assert.equal(rye.units, Math.min(HAPI_LOT, sealedRye));
  assert.equal(inventory.count('copper-piece') - before, rye.total);
  assert.equal(rye.total, rye.units * 1 * 2 * HAPI_TERMS.rate, 'bridge rye is 1 at home, Fine doubles it, and the barge pays twice that');
  const left = merchants.appetite('hapi', 'bridge-rye-fine');
  assert.deepEqual([left.full, left.reduced], [0, 0], 'the rye lot is taken, and there is no second lot');
  assert.equal(merchants.quote('hapi', 'bridge-rye-fine').ok, false);
  assert.equal(merchants.appetite('hapi', 'weir-fish-fine').full, HAPI_LOT, 'the fish lot is not');
  assert.equal(merchants.sell('hapi', 'weir-fish-fine', HAPI_LOT).ok, true);
  assert.ok(inventory.count('bridge-rye-fine') < 12);
});

/** A dialogue box that records what it was asked to show and lets a test press its buttons. */
function host(extra = {}) {
  const shown = [], calls = [], toasts = [];
  const context = { openDialogue: (npc, lines, event, action, options = {}) => shown.push({ npc, lines, action, options }), closeDialogue: () => calls.push('close'),
    openTrade: npc => calls.push(`trade:${npc.id}`), openOrders: npc => calls.push(`orders:${npc.id}`), notify: (text, title) => toasts.push([title, text]),
    onChange: () => calls.push('save'), ...extra };
  const last = () => shown.at(-1);
  const press = id => { const choice = last().options.choices.find(entry => entry.id === id); assert.ok(choice, `offered ${id}`); choice.action(); };
  return { context, shown, calls, toasts, last, press };
}

test('each conversation opens with an introduction, its topics come back to it, and Trade opens the market', () => {
  for (const npc of MINORA_PEOPLE) {
    const h = host();
    assert.equal(minoraConversation(npc, h.context), true);
    assert.deepEqual(h.last().lines, [MINORA_AMBIENT[npc.id][0]]);
    for (const topic of MINORA_TOPICS[npc.id]) {
      h.press(topic.id);
      assert.deepEqual(h.last().lines, [...topic.lines]);
      h.last().options.onComplete();
      assert.ok(h.last().options.choices.some(choice => choice.id === `${npc.id}-trade`), `${topic.id} comes back to ${npc.id}`);
    }
    h.press(`${npc.id}-trade`);
    assert.ok(h.calls.includes(`trade:${npc.id}`));
  }
  assert.equal(minoraConversation({ id: 'lizeem-portunus' }, host().context), false, 'they answer for nobody else');
  const njord = host();
  minoraConversation(byId('njord'), njord.context);
  njord.press('njord-orders');
  assert.deepEqual(njord.calls, ['close', 'orders:njord']);
});

test('Hapi’s news follows the farmlands down the river, and the Dividing after them', () => {
  assert.match(hapiNews({}).join(' '), /Nothing moves on the river/);
  const done = new Set(['nethereum', 'ovesos']);
  const farmlands = { caricas: { stage: 'done' }, arc: id => ({ stage: () => (done.has(id) ? 'done' : 'arrive') }) };
  const news = hapiNews({ farmlands }).join(' ');
  assert.match(news, /Caricas/); assert.match(news, /Haethom/); assert.match(news, /Velsorten/); assert.doesNotMatch(news, /The Way is moving/);
  assert.match(hapiNews({ farmlands, dividing: { held: () => true } }).at(-1), /Dividing was held/);
  const h = host({ farmlands });
  minoraConversation(byId('hapi'), h.context);
  h.press('hapi-news');
  assert.deepEqual(h.last().lines, hapiNews({ farmlands }));
});

test('Amalthea teaches the rye loaf once, and not to a man Vertumnus has taught', () => {
  const learned = [], noted = [];
  const cooking = { known: new Set(), knows(id) { return this.known.has(id); }, learn(id) { learned.push(id); this.known.add(id); return { ok: true }; } };
  const farmlands = { caricas: { taught: [] }, noteTaught: id => noted.push(id) };
  const h = host({ cooking, farmlands });
  minoraConversation(byId('amalthea'), h.context);
  h.press('amalthea-loaf');
  assert.deepEqual(learned, [LIZEEM_RECIPES.ryeLoaf]);
  assert.deepEqual(noted, [LIZEEM_RECIPES.ryeLoaf], 'Vertumnus will not teach it again');
  assert.deepEqual(h.last().lines, [...AMALTHEA_LOAF]);
  assert.equal(h.toasts.at(-1)[0], 'AMALTHEA TAUGHT YOU A RECIPE');
  h.last().options.onComplete();
  assert.equal(h.last().options.choices.some(choice => choice.id === 'amalthea-loaf'), false, 'taught once');
  // Taught by Vertumnus already: she has nothing to add.
  const taught = host({ farmlands: { caricas: { taught: [LIZEEM_RECIPES.ryeLoaf] } } });
  minoraConversation(byId('amalthea'), taught.context);
  assert.equal(taught.last().options.choices.some(choice => choice.id === 'amalthea-loaf'), false);
  // A kitchen that refuses (no Fire Making): heard, not kept, and offered again.
  const refused = host({ cooking: { knows: () => false, learn: () => ({ ok: false, reason: 'Learn Fire Making first.' }) }, farmlands: { caricas: { taught: [] }, noteTaught: () => assert.fail('not taught') } });
  minoraConversation(byId('amalthea'), refused.context);
  refused.press('amalthea-loaf');
  assert.equal(refused.toasts.at(-1)[1], 'Learn Fire Making first.');
  refused.last().options.onComplete();
  assert.ok(refused.last().options.choices.some(choice => choice.id === 'amalthea-loaf'));
});
