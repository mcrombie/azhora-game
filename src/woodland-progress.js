import { regionFirePits } from './regions.js';
import { OUTPOST_FIRE } from './outpost.js';
// Every fire the world lights: the village's, the road's, and the mess fire in the army's outpost.
const KNOWN_FIRES = new Set(['village-fire', 'pond-fire', ...regionFirePits.map(fire => fire.id), OUTPOST_FIRE.id]);
const uniqueIds = (value, pattern, limit) => Array.isArray(value) && value.length <= limit
  && new Set(value).size === value.length && value.every(id => typeof id === 'string' && pattern.test(id));

/** Stable village progress accompanies both first-shore and onward checkpoints. */
export function validateWoodlandProgress(value, stock) {
  if (!value || value.version !== 1 || !['available', 'active', 'complete'].includes(value.acornStatus)
    || !Number.isSafeInteger(value.practiceHits) || value.practiceHits < 0 || value.practiceHits > 2
    || !Number.isSafeInteger(value.practiceDodges) || value.practiceDodges < 0 || value.practiceDodges > 1
    || !uniqueIds(value.acorns, /^acorn-[1-6]-[1-4]$/, 24)
    || !uniqueIds(value.sticks, /^stick-[1-7]-[1-2]$/, 14)
    || !uniqueIds(value.fruits, /^pawpaw-[1-6]-[1-2]$/, 12)
    || !uniqueIds(value.discoveries, /^[a-zA-Z][a-zA-Z0-9-]{0,63}$/, 160)) return false;   // room for every landmark the regions add
  const camp = value.camp;
  if (!camp || camp.version !== 1 || typeof camp.taught !== 'boolean'
    || !Number.isSafeInteger(camp.catches) || camp.catches < 0
    || !camp.fires || typeof camp.fires !== 'object' || Array.isArray(camp.fires)
    || Object.keys(camp.fires).length > 16
    || Object.entries(camp.fires).some(([id, fuel]) => !KNOWN_FIRES.has(id)
      || !Number.isFinite(fuel) || fuel < 0 || fuel > 120)) return false;
  if (camp.taught && !stock.has('fishing-rod')) return false;
  if (value.acornStatus === 'complete' && !stock.has('tinderbox')) return false;
  return true;
}

export function copyWoodlandProgress(value) {
  return { version: 1, acornStatus: value.acornStatus, practiceHits: value.practiceHits,
    practiceDodges: value.practiceDodges, acorns: [...value.acorns], sticks: [...value.sticks],
    fruits: [...value.fruits], discoveries: [...value.discoveries],
    camp: { version: 1, taught: value.camp.taught, catches: value.camp.catches, fires: { ...value.camp.fires } } };
}
