const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');

const CHECKPOINT_KEY = 'azhora-road-checkpoint-v1';
// Persistent NPC injuries and remains grow with explored country. Keep a bounded save slot.
const MAX_BYTES = 8 * 1024 * 1024;

function validateValue(value) {
  if (typeof value !== 'string') return 'The checkpoint must be a JSON string.';
  if (value.length > MAX_BYTES || Buffer.byteLength(value, 'utf8') > MAX_BYTES)
    return 'The checkpoint is too large to save.';
  // A lone UTF-16 surrogate would otherwise be silently replaced on disk.
  if (Buffer.from(value, 'utf8').toString('utf8') !== value)
    return 'The checkpoint contains invalid text.';
  try { JSON.parse(value); } catch { return 'The checkpoint is not valid JSON.'; }
  return '';
}

/** A fixed, local save slot. Renderer keys and values never become file paths. */
function createCheckpointStore({ directory, memoryOnly = false } = {}) {
  let memory = null, filename = null;
  try {
    if (typeof directory === 'string' && directory.trim())
      filename = path.join(path.resolve(directory), 'road-checkpoint.json');
  } catch { /* Report an unusable directory through handle, not at app startup. */ }

  function handle(operation, key, value) {
    if (key !== CHECKPOINT_KEY) return { ok: false, reason: 'Unknown checkpoint key.' };
    if (!['get', 'set', 'remove'].includes(operation))
      return { ok: false, reason: 'Unknown checkpoint operation.' };
    if (operation === 'set') {
      const reason = validateValue(value);
      if (reason) return { ok: false, reason };
    }
    if (memoryOnly) {
      if (operation === 'get') return { ok: true, value: memory };
      memory = operation === 'set' ? value : null;
      return { ok: true };
    }
    if (!filename) return { ok: false, reason: 'The checkpoint folder is unavailable.' };

    let temporary = null;
    try {
      if (operation === 'get') {
        let bytes;
        try {
          if (fs.statSync(filename).size > MAX_BYTES)
            return { ok: false, reason: 'The saved checkpoint is too large to read.' };
          bytes = fs.readFileSync(filename);
        } catch (error) {
          if (error.code === 'ENOENT') return { ok: true, value: null };
          throw error;
        }
        const saved = bytes.toString('utf8');
        if (!Buffer.from(saved, 'utf8').equals(bytes))
          return { ok: false, reason: 'The saved checkpoint contains invalid text.' };
        const reason = validateValue(saved);
        return reason ? { ok: false, reason } : { ok: true, value: saved };
      }
      if (operation === 'remove') {
        try { fs.unlinkSync(filename); } catch (error) { if (error.code !== 'ENOENT') throw error; }
        return { ok: true };
      }

      fs.mkdirSync(path.dirname(filename), { recursive: true });
      temporary = path.join(path.dirname(filename), `.road-checkpoint-${process.pid}-${randomBytes(8).toString('hex')}.tmp`);
      // Flush the complete temporary file before replacing the previous slot.
      const descriptor = fs.openSync(temporary, 'wx', 0o600);
      try {
        fs.writeFileSync(descriptor, value, 'utf8');
        fs.fsyncSync(descriptor);
      } finally { fs.closeSync(descriptor); }
      fs.renameSync(temporary, filename);
      temporary = null;
      return { ok: true };
    } catch {
      return { ok: false, reason: `The checkpoint could not be ${operation === 'get' ? 'read' : operation === 'set' ? 'saved' : 'removed'}. Your current game is still running.` };
    } finally {
      if (temporary) {
        try { fs.unlinkSync(temporary); } catch { /* A failed write must not hide its original error. */ }
      }
    }
  }
  return { handle };
}

module.exports = { createCheckpointStore, MAX_BYTES };
