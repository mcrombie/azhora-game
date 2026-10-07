import { createSettlementWorld, DAY_SECONDS } from '../src/settlements/engine.js';
import { createMemoryArchive, flushChronicles } from '../src/settlements/archive.js';
import { createInventoryState } from '../src/inventory.js';
import { CANON_VERSION, LORE_REVISION } from '../src/settlements/canon.js';
import { writePack } from './generate-settlements.mjs';

// A reproducible demonstration: the traveler brings a finite satchel and helps
// through the same request/transaction path as the game. No facts are rewritten.
const days = 30, seed = 980, worldId = 'feradom-demo-20261006-v2';
const core = createSettlementWorld({ seed, worldId, startTime: -days * DAY_SECONDS });
const archive = createMemoryArchive(), inventory = createInventoryState();
inventory.add('barley', 48); inventory.add('oak-plank', 12);
const actions = [];
await flushChronicles(core, archive);
for (let turn = 0; turn < days; turn++) {
  if ([4, 5, 6, 14, 22].includes(turn)) {
    for (const s of core.view()) for (const request of s.requests.filter(r => r.status === 'open')) {
      const input = { settlementId: s.id, requestId: request.id, contactId: request.residentId, action: request.type === 'message' ? 'accept' : 'complete' };
      const result = core.applyAction(input, inventory);
      if (!result.ok) continue;
      actions.push({ day: core.snapshot().day, ...input });
      if (request.type === 'message') {
        const destination = core.view().find(p => p.id === request.destination);
        const delivered = { ...input, contactId: destination.residents[0].id, action: 'complete' };
        if (!core.applyAction(delivered, inventory).ok) throw Error('Demo message delivery failed.');
        actions.push({ day: core.snapshot().day, ...delivered });
      }
    }
  }
  core.advanceTo((-days + turn + 1) * DAY_SECONDS); await flushChronicles(core, archive);
}
const entries = await Promise.all((await archive.list(worldId)).map(r => archive.get(r.id)));
const pack = { version: 1, canon: CANON_VERSION, sourceRevision: LORE_REVISION, region: 'Feradom', seed, days, snapshot: core.snapshot(), entries,
  demo: { title: 'Thirty days in Feradom', startingSatchel: { barley: 48, 'oak-plank': 12 }, actions, note: 'A scripted traveler demonstration using real inventory transactions. Community decisions and daily outcomes use the shared deterministic simulation.' } };
await writePack(pack, process.argv[2] ?? 'tests/artifacts/demo-pack');
console.log(JSON.stringify({ pages: entries.length, interventions: actions.length, customs: pack.snapshot.settlements.map(s => ({ id: s.id, customs: s.customs.map(c => c.name) })) }));
