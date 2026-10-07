import { validateChronicleEntry, validateSettlementSnapshot } from './engine.js';
import { validGeneration } from './archive.js';
import { CANON_VERSION, LORE_REVISION } from './canon.js';

/** Published history is immutable. A rewind starts a new edition with bounded ancestry. */
export function forkEdition(saved, worldId, throughDay = saved.day - 1) {
  if (!validateSettlementSnapshot(saved, { allowMissing: false })) throw new Error('Invalid history to branch.');
  const next = structuredClone(saved);
  next.parents = [...(saved.parents ?? []).map(p => ({ ...p, throughDay: Math.min(p.throughDay, throughDay) })), { worldId: saved.worldId, throughDay }];
  next.worldId = worldId;
  next.outbox = next.outbox.map(e => ({ ...e, worldId, id: e.id.replace(saved.worldId + '_', worldId + '_') }));
  if (!validateSettlementSnapshot(next, { allowMissing: false })) throw new Error('Invalid edition identifier.');
  return next;
}
export function inheritedArchive(archive, snapshot) {
  return { ...archive, async list(worldId, settlementId) {
    const state = snapshot(), seen = new Set(), rows = [];
    const editions = [{ worldId, throughDay: Infinity }, ...[...(state?.parents ?? [])].reverse()];
    for (const edition of editions) for (const row of await archive.list(edition.worldId, settlementId)) {
      if (row.day > edition.throughDay && !(row.kind === 'opening' && row.day === edition.throughDay + 1)) continue;
      const key = row.settlementId + ':' + row.kind + ':' + row.day;
      if (!seen.has(key)) { seen.add(key); rows.push(row); }
    }
    return rows.sort((a, b) => a.day - b.day || (a.kind === b.kind ? a.id.localeCompare(b.id) : a.kind === 'opening' ? -1 : 1));
  } };
}
export function validatePack(pack) {
  if (pack?.version !== 1 || pack.canon !== CANON_VERSION || pack.sourceRevision !== LORE_REVISION || pack.region !== 'Feradom'
    || !validateSettlementSnapshot(pack.snapshot, { allowMissing: false }) || pack.snapshot.time !== 0
    || pack.snapshot.outbox.length || pack.snapshot.parents?.length || !Array.isArray(pack.entries) || pack.entries.length > 10953) return false;
  const ids = new Set();
  return pack.entries.every(r => {
    if (!validateChronicleEntry(r.entry) || r.entry.worldId !== pack.snapshot.worldId || r.id !== r.entry.id
      || !validGeneration(r.generation) || ids.has(r.id)) return false;
    ids.add(r.id); return true;
  }) && pack.snapshot.settlements.every(s => pack.entries.some(r => r.entry.settlementId === s.id && r.entry.kind === 'opening'));
}
export async function importPack(pack, archive, worldId) {
  if (!validatePack(pack)) throw new Error('This is not a complete, compatible Feradom settlement pack.');
  // A failure never replaces the currently running simulation.
  for (const row of pack.entries) { await archive.put(row.entry); if (row.generation.status !== 'pending') await archive.update(row.id, row.generation); }
  return forkEdition(pack.snapshot, worldId);
}
