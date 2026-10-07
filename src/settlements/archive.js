import { validateChronicleEntry } from './engine.js';

export function validGeneration(g) {
  return g && ['pending', 'queued', 'working', 'ready', 'budget', 'failed', 'unknown'].includes(g.status)
    && (g.prose === undefined || typeof g.prose === 'string' && g.prose.length <= 6000)
    && (g.imageUrl === undefined || typeof g.imageUrl === 'string' && /^https:\/\//.test(g.imageUrl) && g.imageUrl.length < 5000)
    && (g.status !== 'ready' || typeof g.prose === 'string' && g.prose.length > 20 && typeof g.imageUrl === 'string');
}
export function createMemoryArchive() {
  const rows = new Map();
  return {
    async put(entry) {
      if (!validateChronicleEntry(entry)) throw new Error('Invalid chronicle entry.');
      const previous = rows.get(entry.id);
      if (previous && previous.entry.factsHash !== entry.factsHash) throw new Error('This history has diverged. Start a new world edition.');
      if (!previous) rows.set(entry.id, { id: entry.id, entry: structuredClone(entry), generation: { status: 'pending' } });
    },
    async get(id) { return structuredClone(rows.get(id) ?? null); },
    async list(worldId, settlementId) { return [...rows.values()].filter(r => r.entry.worldId === worldId && (!settlementId || r.entry.settlementId === settlementId)).map(r => ({ id: r.id, day: r.entry.day, kind: r.entry.kind, settlementId: r.entry.settlementId, status: r.generation.status })).sort(order); },
    async update(id, generation) { if (!rows.has(id) || !validGeneration(generation)) throw new Error('Invalid generation update.'); rows.get(id).generation = structuredClone(generation); },
  };
}
const order = (a, b) => a.day - b.day || (a.kind === b.kind ? a.id.localeCompare(b.id) : a.kind === 'opening' ? -1 : 1);
const metadata = row => ({ id: row.id, worldId: row.entry.worldId, day: row.entry.day, kind: row.entry.kind, settlementId: row.entry.settlementId, status: row.generation.status });
export function createChronicleArchive({ bridge = globalThis.azhoraChronicles, indexedDB = globalThis.indexedDB } = {}) {
  if (bridge) return Object.fromEntries(['put', 'get', 'list', 'update'].map(operation => [operation, async (...args) => {
    const result = await bridge.request(operation, args); if (!result?.ok) throw new Error(result?.reason ?? 'Chronicle storage unavailable.'); return result.value;
  }]));
  let database;
  const open = () => database ??= new Promise((resolve, reject) => {
    if (!indexedDB) return reject(new Error('Persistent chronicle storage is unavailable.'));
    const request = indexedDB.open('azhora-settlement-chronicles-v1', 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      const pages = db.objectStoreNames.contains('pages') ? request.transaction.objectStore('pages') : db.createObjectStore('pages', { keyPath: 'id' });
      const catalog = db.createObjectStore('catalog', { keyPath: 'id' }); catalog.createIndex('worldId', 'worldId');
      // Upgrade existing archives in the same transaction; a failed migration leaves v1 intact.
      const cursor = pages.openCursor(); cursor.onsuccess = () => { const c = cursor.result; if (c) { catalog.put(metadata(c.value)); c.continue(); } };
    };
    request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); }; request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close the older Azhora tab to open its chronicle archive.'));
  });
  async function transaction(mode, action, stores = ['pages', 'catalog']) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(stores, mode), store = tx.objectStore(stores[0]); let result, error;
      const fail = cause => { error = cause; tx.abort(); };
      tx.oncomplete = () => resolve(result); tx.onerror = tx.onabort = () => reject(error ?? tx.error ?? new Error('Chronicle transaction failed.'));
      action(store, value => { result = value; }, fail, tx);
    });
  }
  return {
    async put(entry) {
      if (!validateChronicleEntry(entry)) throw new Error('Invalid chronicle entry.');
      return transaction('readwrite', (store, done, fail, tx) => {
        const request = store.get(entry.id); request.onsuccess = () => {
          if (request.result && request.result.entry.factsHash !== entry.factsHash) return fail(new Error('History diverged; use a new world edition.'));
          if (!request.result) { const row = { id: entry.id, entry, generation: { status: 'pending' } }; store.add(row); tx.objectStore('catalog').add(metadata(row)); } done(true);
        };
      });
    },
    get(id) { return transaction('readonly', (store, done) => { const r = store.get(id); r.onsuccess = () => done(r.result ?? null); }, ['pages']); },
    list(worldId, settlementId) { return transaction('readonly', (store, done) => {
      const result = [], r = store.index('worldId').openCursor(worldId); r.onsuccess = () => {
        const c = r.result; if (!c) return done(result.sort(order)); const row = c.value;
        if (!settlementId || row.settlementId === settlementId) { const { worldId: _, ...item } = row; result.push(item); }
        c.continue();
      };
    }, ['catalog']); },
    update(id, generation) {
      if (!validGeneration(generation)) return Promise.reject(new Error('Invalid generation update.'));
      return transaction('readwrite', (store, done, fail, tx) => { const r = store.get(id); r.onsuccess = () => {
        if (!r.result) return fail(new Error('Persist facts before generated content.')); const row = { ...r.result, generation }; store.put(row); tx.objectStore('catalog').put(metadata(row)); done(true);
      }; });
    },
  };
}
/** Acknowledgement follows durable storage. Failed writes leave the checkpoint outbox intact. */
export async function flushChronicles(engine, archive) {
  let written = 0;
  for (const entry of engine.entries()) { await archive.put(entry); engine.acknowledge([entry.id]); written++; }
  return written;
}
