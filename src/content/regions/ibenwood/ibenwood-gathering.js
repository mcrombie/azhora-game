import { REGION_CELLS, hexOwnerAt } from '../../../world/terrain/region-world.js';
import { IBENWOOD_NAMES, IBENWOOD_PATHS, IBENWOOD_PILOT, IBENWOOD_GROVES, ibenwoodWaterClear } from './ibenwood-environment.js';
import { canStand } from '../../../gameplay/movement/game-state.js';

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const settlements = [IBENWOOD_PILOT, ...IBENWOOD_GROVES];
const clearSite = (point, region) => hexOwnerAt(point.x, point.z) === region
  && settlements.every(place => distance(point, place) > place.radius + 5)
  && ibenwoodWaterClear(point.x, point.z, 3);

// A branch's identity comes from its path segment and slot, never the order in
// which the player visits or collects it. Samples stay inside the clear trail.
const candidates = [];
for (const path of [...IBENWOOD_PATHS].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) {
  for (let segment = 1; segment < path.points.length; segment++) {
    const a = path.points[segment - 1], b = path.points[segment];
    const length = distance(a, b), slots = Math.max(1, Math.floor(length / 9));
    if (!length) continue;
    const dx = (b.x - a.x) / length, dz = (b.z - a.z) / length;
    for (let slot = 0; slot < slots; slot++) {
      const along = (slot + .5) * length / slots, side = (slot % 2 ? -1 : 1) * .35;
      const pointAt = offset => ({ x: a.x + dx * (along + offset) - dz * side, z: a.z + dz * (along + offset) + dx * side });
      const point = pointAt(0), region = hexOwnerAt(point.x, point.z);
      if (!IBENWOOD_NAMES.includes(region) || !clearSite(point, region)) continue;
      const positions = [0, 2, -2, 4, -4].filter(offset => along + offset > 0 && along + offset < length)
        .map(pointAt).filter(p => clearSite(p, region)).map(Object.freeze);
      candidates.push({ id: `ibenwood-branch-${path.id.slice('ibenwood-'.length)}-${segment}-${slot}`,
        region, ...point, positions: Object.freeze(positions) });
    }
  }
}

// Spread a modest regional allowance along all available tracks. Farthest-first
// selection avoids piling the allowance into whichever path was listed first.
const sites = [];
for (const region of IBENWOOD_NAMES) {
  const pool = candidates.filter(site => site.region === region).map(site => ({ site, gap: Infinity }));
  const budget = Math.ceil((REGION_CELLS[region]?.length ?? 0) / 2);
  for (let count = 0; count < budget && pool.length; count++) {
    let best = 0;
    for (let i = 1; i < pool.length; i++) if (pool[i].gap > pool[best].gap) best = i;
    if (pool[best].gap < 20) break;
    const { site } = pool.splice(best, 1)[0];
    sites.push(Object.freeze(site));
    for (const candidate of pool) candidate.gap = Math.min(candidate.gap, distance(candidate.site, site));
  }
}
export const IBENWOOD_BRANCH_SITES = Object.freeze(sites);
export const IBENWOOD_BRANCH_IDS = Object.freeze(sites.map(site => site.id));

// Final terrain and colliders decide which point on the short trail segment is
// usable. Moving a branch a few metres never changes its saved pickup identity.
export function createIbenwoodGatheringSites(world) {
  return IBENWOOD_BRANCH_SITES.flatMap(site => {
    const point = site.positions.find(p => canStand(p.x, p.z, world, .65));
    return point ? [{ id: site.id, ...point, name: 'Fallen Ibenwood branch', collected: false }] : [];
  });
}
