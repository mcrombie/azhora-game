const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createCheckpointStore } = require('../scripts/checkpoint-store.cjs');

const KEY = 'azhora-road-checkpoint-v1';
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'azhora-checkpoint-test-'));
  t.after(() => {
    // A single, verified test directory; never accept a caller-provided cleanup path.
    const resolved = path.resolve(root), base = path.resolve(os.tmpdir());
    assert.equal(path.dirname(resolved), base);
    assert.ok(path.basename(resolved).startsWith('azhora-checkpoint-test-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const directory = path.join(root, 'saves');
  return { root, directory, filename: path.join(directory, 'road-checkpoint.json'), store: createCheckpointStore({ directory }) };
}

test('a checkpoint persists between store instances and replacement leaves only the fixed slot', t => {
  const { store, directory, filename } = fixture(t);
  assert.deepEqual(store.handle('get', KEY), { ok: true, value: null });
  const first = JSON.stringify({ region: 2, name: 'Nessa', warning: 'Mara’s message 🌿' });
  assert.deepEqual(store.handle('set', KEY, first), { ok: true });
  assert.equal(fs.readFileSync(filename, 'utf8'), first);
  const reopened = createCheckpointStore({ directory });
  assert.deepEqual(reopened.handle('get', KEY), { ok: true, value: first });
  const second = JSON.stringify({ region: 4, complete: true });
  assert.deepEqual(reopened.handle('set', KEY, second), { ok: true });
  assert.equal(store.handle('get', KEY).value, second, 'reads see the current disk slot rather than stale memory');
  assert.deepEqual(fs.readdirSync(directory), ['road-checkpoint.json']);
  assert.deepEqual(reopened.handle('remove', KEY), { ok: true });
  assert.deepEqual(store.handle('get', KEY), { ok: true, value: null });
  assert.deepEqual(store.handle('remove', KEY), { ok: true }, 'removal is idempotent');
});

test('invalid keys, operations, JSON, text and oversized UTF-8 are rejected before any disk writes', t => {
  const { root, directory, store } = fixture(t);
  const invalid = [
    ['set', '../escape.json', '{}'], ['set', path.join(root, 'escape.json'), '{}'],
    ['get', '__proto__'], ['write', KEY, '{}'], ['set', KEY, {}], ['set', KEY, ''],
    ['set', KEY, '{broken'], ['set', KEY, '"\ud800"'], ['set', KEY, JSON.stringify('a'.repeat(65535))],
    ['set', KEY, JSON.stringify('é'.repeat(32768))],
  ];
  for (const args of invalid) {
    const result = store.handle(...args);
    assert.equal(result.ok, false); assert.equal(typeof result.reason, 'string');
  }
  assert.equal(fs.existsSync(directory), false);
  assert.deepEqual(fs.readdirSync(root), []);
});

test('exactly 65536 UTF-8 bytes are accepted and an invalid replacement keeps the previous checkpoint', t => {
  const { store, filename } = fixture(t);
  const maximum = JSON.stringify('a'.repeat(65534));
  assert.equal(Buffer.byteLength(maximum), 65536);
  assert.equal(store.handle('set', KEY, maximum).ok, true);
  assert.equal(store.handle('set', KEY, JSON.stringify('a'.repeat(65535))).ok, false);
  assert.equal(fs.readFileSync(filename, 'utf8'), maximum);
});

test('memory-only smoke storage never reads, creates, overwrites or removes real saves', t => {
  const { directory, filename, store } = fixture(t);
  store.handle('set', KEY, '{"real":true}');
  const memory = createCheckpointStore({ directory, memoryOnly: true });
  assert.equal(memory.handle('get', KEY).value, null);
  assert.equal(memory.handle('set', KEY, '{"test":true}').ok, true);
  assert.equal(memory.handle('get', KEY).value, '{"test":true}');
  assert.equal(memory.handle('remove', KEY).ok, true);
  assert.equal(memory.handle('get', KEY).value, null);
  assert.equal(fs.readFileSync(filename, 'utf8'), '{"real":true}');
  const absent = path.join(directory, 'never-created');
  const isolated = createCheckpointStore({ directory: absent, memoryOnly: true });
  isolated.handle('set', KEY, '{}'); isolated.handle('remove', KEY);
  assert.equal(fs.existsSync(absent), false);
  assert.equal(createCheckpointStore({memoryOnly:true}).handle('set', KEY, '{}').ok, true);
});

test('unavailable folders and corrupted disk checkpoints return failures without throwing', t => {
  const { root, directory, filename, store } = fixture(t);
  const blocked = path.join(root, 'not-a-directory'); fs.writeFileSync(blocked, 'occupied');
  const unavailable = createCheckpointStore({ directory: path.join(blocked, 'saves') });
  const failure = unavailable.handle('set', KEY, '{}');
  assert.equal(failure.ok, false); assert.match(failure.reason, /checkpoint/i);
  // Windows can classify an inaccessible child of a regular file as ENOENT.
  // Reading/removing a missing slot is intentionally safe and idempotent.
  for (const operation of ['get', 'remove'])
    assert.doesNotThrow(() => unavailable.handle(operation, KEY));
  fs.mkdirSync(directory);
  for (const content of [Buffer.from([0xc3, 0x28]), Buffer.from('{incomplete'), Buffer.alloc(65537, 32)]) {
    fs.writeFileSync(filename, content);
    const result = store.handle('get', KEY);
    assert.equal(result.ok, false); assert.equal(typeof result.reason, 'string');
  }
  assert.equal(createCheckpointStore({}).handle('set', KEY, '{}').ok, false);
});

test('a failed atomic replacement cleans its temporary file and leaves existing data untouched', t => {
  const { directory, filename, store } = fixture(t);
  fs.mkdirSync(filename, { recursive: true });
  fs.writeFileSync(path.join(filename, 'sentinel'), 'keep');
  assert.equal(store.handle('set', KEY, '{"new":true}').ok, false);
  assert.deepEqual(fs.readdirSync(directory), ['road-checkpoint.json']);
  assert.equal(fs.readFileSync(path.join(filename, 'sentinel'), 'utf8'), 'keep');
});
