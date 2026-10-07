import test from 'node:test';
import assert from 'node:assert/strict';
import { createSettlementWorld, validateSettlementSnapshot, validateChronicleEntry, DAY_SECONDS, dayAt } from '../src/settlements/engine.js';
import { createInventoryState, INVENTORY_ITEMS } from '../src/inventory.js';
import { RESOURCE_ITEMS, canonFor } from '../src/settlements/canon.js';
import { createMemoryArchive, flushChronicles } from '../src/settlements/archive.js';
import { generatePack } from '../scripts/generate-settlements.mjs';

test('Azhora midnight, including the first partial day, controls settlement turns', () => {
  const w = createSettlementWorld(); w.acknowledge(w.entries().map(e => e.id));
  w.advanceTo(1079); assert.equal(w.entries().length, 0);
  w.advanceTo(1080); assert.equal(w.entries().length, 3); assert.equal(w.entries()[0].date, '0980-04-01');
  const before = w.snapshot(); w.advanceTo(1080); assert.deepEqual(w.snapshot(), before);
  assert.equal(w.advanceTo(1000).ok, false); assert.deepEqual(w.snapshot(), before);
});
test('Stepped play, catch-up, and restored play produce identical facts and voices', () => {
  const a = createSettlementWorld({ seed: 712 }), b = createSettlementWorld({ seed: 712 });
  a.advanceTo(20 * DAY_SECONDS);
  for (let day = 1; day <= 20; day++) b.advanceTo(day * DAY_SECONDS);
  assert.deepEqual(a.snapshot(), b.snapshot());
  const c = createSettlementWorld({ saved: a.snapshot() }); c.advanceTo(21 * DAY_SECONDS); a.advanceTo(21 * DAY_SECONDS);
  assert.deepEqual(a.snapshot(), c.snapshot()); assert.ok(a.entries().every(validateChronicleEntry));
});
test('Only admitted lore regions and actual inventory items enter the simulation', () => {
  for (const id of RESOURCE_ITEMS) assert.ok(INVENTORY_ITEMS[id], id);
  assert.throws(() => canonFor('Yunethre'), /reconciliation/);
  assert.throws(() => createSettlementWorld({ sites: [{ id: 'unreviewed', region: 'Yunethre' }] }));
});
test('Invalid snapshots never replace a running world', () => {
  const w = createSettlementWorld(), before = w.snapshot();
  for (const corrupt of [v => v.settlements[0].stocks.barley = -1, v => v.settlements[0].residents[0].id = 'made-up', v => v.day++, v => v.settlements[0].customs.push({ id: 'invented', causes: [] })]) {
    const bad = structuredClone(before); corrupt(bad); assert.equal(w.restore(bad), false); assert.deepEqual(w.snapshot(), before);
  }
  assert.equal(validateSettlementSnapshot(undefined), true);
});
test('A supply reward and its debit commit together and cannot be claimed twice', () => {
  const w = createSettlementWorld(), state = w.snapshot(), s = state.settlements[0];
  s.stocks.barley = 3; s.stocks['cooked-fish'] = 0; w.restore(state); w.advanceTo(1080);
  const current = w.view()[0], r = current.requests.find(r => r.type === 'supply'); assert.ok(r);
  const inventory = createInventoryState(); inventory.add('barley', 6);
  const action = { settlementId: current.id, requestId: r.id, contactId: r.residentId };
  const stock = current.stocks.barley, coins = current.stocks['copper-piece'];
  assert.equal(w.applyAction(action, inventory).ok, true);
  assert.equal(inventory.count('barley'), 0); assert.equal(inventory.count('copper-piece'), 2);
  assert.equal(w.view()[0].stocks.barley, stock + 6); assert.equal(w.view()[0].stocks['copper-piece'], coins - 2);
  assert.equal(w.applyAction(action, inventory).ok, false); assert.equal(inventory.count('copper-piece'), 2);
});
test('An unsuccessful transfer changes neither inventory, people, nor resources', () => {
  const w = createSettlementWorld(), state = w.snapshot(); state.settlements[0].infrastructure = 30; w.restore(state); w.advanceTo(1080);
  const s = w.view()[0], r = s.requests.find(r => r.type === 'repair'), before = w.snapshot();
  const inv = createInventoryState(); inv.add('oak-plank', 1);
  assert.equal(w.applyAction({ settlementId: s.id, requestId: r.id, contactId: r.residentId }, inv).ok, false);
  assert.deepEqual(w.snapshot(), before); assert.equal(inv.count('oak-plank'), 1);
  assert.equal(inv.transact([{ id: 'oak-plank', delta: -1 }, { id: 'unknown', delta: 2 }]), false); assert.equal(inv.count('oak-plank'), 1);
});
test('A message requires accepting it and reaching its actual destination', () => {
  const w = createSettlementWorld(), [s, other] = w.view(), r = s.requests.find(r => r.type === 'message'), inv = createInventoryState();
  const base = { settlementId: s.id, requestId: r.id, contactId: r.residentId };
  assert.equal(w.applyAction(base, inv).ok, false);
  assert.equal(w.applyAction({ ...base, action: 'accept' }, inv).ok, true);
  assert.equal(w.applyAction(base, inv).ok, false);
  assert.equal(w.applyAction({ ...base, contactId: other.residents[0].id }, inv).ok, true);
  assert.equal(inv.count('copper-piece'), 1);
});
test('A failed archive write leaves every unfiled page in the save outbox', async () => {
  const w = createSettlementWorld(), before = w.entries();
  await assert.rejects(flushChronicles(w, { put: async () => { throw new Error('disk full'); } }), /disk full/);
  assert.deepEqual(w.entries(), before);
  const archive = createMemoryArchive(); await flushChronicles(w, archive); assert.equal(w.entries().length, 0);
  const restored = createSettlementWorld(); await flushChronicles(restored, archive);
  assert.equal((await archive.list(w.worldId)).length, 3);
});
test('Chronicles cannot replace old facts with a divergent timeline', async () => {
  const archive = createMemoryArchive(), a = createSettlementWorld({ seed: 1 }), b = createSettlementWorld({ seed: 2 });
  a.advanceTo(1080); b.advanceTo(1080); const entryA = a.entries().at(-1), entryB = b.entries().at(-1);
  await archive.put(entryA); await assert.rejects(archive.put(entryB), /diverged/);
});
test('Authoring makes thirty past days ending at the runtime epoch with no paid calls', async () => {
  const pack = await generatePack(); assert.equal(pack.entries.length, 93); assert.equal(pack.snapshot.time, 0); assert.equal(pack.snapshot.day, dayAt(0));
  assert.equal(pack.snapshot.outbox.length, 0); assert.ok(pack.entries.every(r => r.generation.status === 'pending'));
  const runtime = createSettlementWorld({ saved: pack.snapshot }); runtime.advanceTo(1080);
  assert.equal(runtime.entries().length, 3); assert.equal(runtime.entries()[0].date, '0980-04-01');
});
test('Cultural developments cite actual recorded causes and cannot change inherited language', async () => {
  const w = createSettlementWorld(), state = w.snapshot();
  for (const s of state.settlements) { s.water = 0; s.infrastructure = 0; s.stocks.barley = 0; s.stocks['cooked-fish'] = 0; s.stocks['oak-plank'] = 0; }
  assert.ok(w.restore(state)); w.advanceTo(12 * DAY_SECONDS);
  const events = new Set(w.entries().flatMap(e => e.events.map(x => x.id))), customs = w.view().flatMap(s => s.customs);
  assert.ok(customs.length > 0);
  assert.ok(customs.every(c => c.causes.every(id => events.has(id))));
  assert.ok(w.view().every(s => s.residents.every(r => r.language === 'feradom')));
});
