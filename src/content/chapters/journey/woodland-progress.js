import { regionFirePits } from '../../../world/terrain/regions.js';
import { OUTPOST_FIRE } from '../../regions/drent/outpost.js';
import { FARM_FIRE } from '../../../gameplay/skills/farming/farming.js';
import { GROVE_WOOD } from '../../regions/ibenwood/ibenwood-pilot.js';
import { IBENWOOD_BRANCH_IDS } from '../../regions/ibenwood/ibenwood-gathering.js';
// Every fire the world lights, including Stanley's shared garden cooking fire.
const KNOWN_FIRES = new Set(['village-fire', 'pond-fire', ...regionFirePits.map(fire => fire.id), OUTPOST_FIRE.id, FARM_FIRE.id]);
// Explicit pickup identities retain every original stick and grove save.
const KNOWN_STICKS = new Set([
  ...Array.from({ length: 7 }, (_, pocket) => [1, 2].map(slot => `stick-${pocket + 1}-${slot}`)).flat(),
  ...GROVE_WOOD.map(site => site.id), ...IBENWOOD_BRANCH_IDS,
]);
const knownStickIds = value => Array.isArray(value) && value.length <= KNOWN_STICKS.size
  && new Set(value).size === value.length && value.every(id => KNOWN_STICKS.has(id));
const uniqueIds = (value, pattern, limit) => Array.isArray(value) && value.length <= limit
  && new Set(value).size === value.length && value.every(id => typeof id === 'string' && pattern.test(id));

/** Stable village progress accompanies both first-shore and onward checkpoints. */
export function validateWoodlandProgress(value, stock) {
  if (!value || value.version !== 1 || !['available', 'active', 'complete'].includes(value.acornStatus)
    || !Number.isSafeInteger(value.practiceHits) || value.practiceHits < 0 || value.practiceHits > 2
    || (Object.hasOwn(value, 'practiceGuards') && (!Number.isSafeInteger(value.practiceGuards) || value.practiceGuards < 0 || value.practiceGuards > 1))
    || !Number.isSafeInteger(value.practiceDodges) || value.practiceDodges < 0 || value.practiceDodges > 1
    || !uniqueIds(value.acorns, /^acorn-[1-6]-[1-4]$/, 24)
    || !knownStickIds(value.sticks)
    || !uniqueIds(value.fruits, /^pawpaw-[1-6]-[1-2]$/, 12)
    || !uniqueIds(value.discoveries, /^[a-zA-Z][a-zA-Z0-9-]{0,63}$/, 400)) return false;   // room for every landmark the regions add: the world drew 162 when the cap was 160, and a save past the cap is refused whole
  const camp = value.camp;
  if (!camp || camp.version !== 1 || typeof camp.taught !== 'boolean'
    || !Number.isSafeInteger(camp.catches) || camp.catches < 0
    || !camp.fires || typeof camp.fires !== 'object' || Array.isArray(camp.fires)
    || Object.keys(camp.fires).length > KNOWN_FIRES.size
    || Object.entries(camp.fires).some(([id, fuel]) => !KNOWN_FIRES.has(id)
      || !Number.isFinite(fuel) || fuel < 0 || fuel > 120)) return false;
  if (camp.taught && !stock.has('fishing-rod')) return false;
  if (value.acornStatus === 'complete' && !stock.has('tinderbox')) return false;
  return true;
}

export function copyWoodlandProgress(value) {
  return { version: 1, acornStatus: value.acornStatus, practiceHits: value.practiceHits,
    practiceDodges: value.practiceDodges, ...(Object.hasOwn(value, 'practiceGuards') ? { practiceGuards: value.practiceGuards } : {}),
    acorns: [...value.acorns], sticks: [...value.sticks],
    fruits: [...value.fruits], discoveries: [...value.discoveries],
    camp: { version: 1, taught: value.camp.taught, catches: value.camp.catches, fires: { ...value.camp.fires } } };
}
