const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createSettlementStore } = require('../scripts/settlement-store.cjs');
test('Desktop chronicles persist across store instances without accepting paths from the renderer', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'azhora-chronicles-'));
  try {
    const { createSettlementWorld } = await import('../src/settlements/engine.js'), entry = createSettlementWorld().entries()[0];
    const store = createSettlementStore({ directory: dir });
    assert.equal((await store.handle('put', [entry])).ok, true);
    const reopened = createSettlementStore({ directory: dir });
    assert.deepEqual((await reopened.handle('get', [entry.id])).value.entry, entry);
    assert.equal((await reopened.handle('get', ['../road-checkpoint'])).ok, false);
    assert.equal((await reopened.handle('remove', [entry.id])).ok, false);
    assert.equal((await reopened.handle('update', [entry.id, { status: 'ready' }])).ok, false);
    assert.equal((await reopened.handle('list', [entry.worldId])).value.length, 1);
    await reopened.handle('update', [entry.id, {status:'queued',jobId:'persisted-job'}]);
    assert.equal((await reopened.handle('list', [entry.worldId])).value[0].status, 'queued');
    const third = createSettlementStore({directory:dir});
    assert.equal((await third.handle('list', [entry.worldId])).value[0].status, 'queued');
    const another = createSettlementWorld({worldId:'another-edition'}).entries()[0];
    await reopened.handle('put',[another]);
    assert.equal((await reopened.handle('list',[another.worldId])).value.length,1);
    assert.equal((await reopened.handle('list',[entry.worldId])).value.length,1);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
