import { REGION_CELLS } from './region-world.js';

/**
 * Resident animals across Drent, including the woods away from the main road.
 * Hex coordinates give each home a stable identity; adding another region or
 * changing a quest cannot move/recreate the population around the traveler.
 * Small animals are common, deer less frequent, and boar occasional.
 */
export const DRENT_WILDLIFE_ZONES = Object.freeze(REGION_CELLS.Drent.map(cell => {
  const choice = (cell.q * 17 + cell.r * 31) % 12;
  const species = choice === 0 ? 'boar' : choice < 4 ? 'red-deer' : 'upland-hare';
  const flip = (cell.q + cell.r) % 2 ? 1 : -1;
  return Object.freeze({
    id: `drent-woods-${cell.q}-${cell.r}`, species, region: 'Drent', keepRegion: true,
    habitat: 'woodland', radius: species === 'boar' ? .7 : species === 'red-deer' ? .55 : .3,
    scale: species === 'red-deer' ? .88 : 1, hornless: true,
    minX: cell.x - 47, maxX: cell.x + 47, minZ: cell.z - 44, maxZ: cell.z + 44,
    sites: Object.freeze([[-17, -13 * flip], [18, 14 * flip]].map(([dx, dz]) => Object.freeze([cell.x + dx, cell.z + dz]))),
    note: 'Resident Drent woodland animals browse, flee, and return to the same home range.',
  });
}));
