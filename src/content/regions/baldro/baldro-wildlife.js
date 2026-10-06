/** Persistent homes throughout both mountain countries. These extend the
 * game's established cold-country animals; no new regional fauna is invented.
 * West Baldro has seasonal sheep grazing, while the eastern woods shelter deer
 * and boar. The existing river fox needs wet river margins, so is not reused on
 * exposed rock slopes merely to fill the country with another species. */
import { BALDRO_CELLS, BALDRO_KINGDOMS, baldroCellAt, baldroSurfaceHeight,
  baldroPathDistance, baldroWaterAt } from './baldro-world.js';

const freeze = Object.freeze;
export const BALDRO_HABITATS = freeze({
  'hill-sheep': freeze({ radius: .55, minHeight: 16, maxHeight: 240, maxSlope: .8 }),
  'red-deer': freeze({ radius: .55, minHeight: 12, maxHeight: 235, maxSlope: .76 }),
  boar: freeze({ radius: .7, minHeight: 12, maxHeight: 175, maxSlope: .67 }),
  'upland-hare': freeze({ radius: .3, minHeight: 12, maxHeight: 330, maxSlope: 1.05 }),
});
export const BALDRO_WILDLIFE_EXCLUSIONS = freeze(BALDRO_KINGDOMS.flatMap(k => [
  { minX: k.gate.x - 42, maxX: k.gate.x + 42, minZ: k.gate.z - 35, maxZ: k.gate.z + 35 },
  { minX: k.arrival.x - 12, maxX: k.arrival.x + 12, minZ: k.arrival.z - 12, maxZ: k.arrival.z + 12 },
  ...k.taskSites.map(p => ({ minX: p.x - 28, maxX: p.x + 28, minZ: p.z - 20, maxZ: p.z + 20 })),
]).map(freeze));
const excluded = (x, z) => BALDRO_WILDLIFE_EXCLUSIONS.some(b => x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ);
function sample(x, z) {
  const height = baldroSurfaceHeight(x, z), d = .7;
  const east = baldroSurfaceHeight(x + d, z), west = baldroSurfaceHeight(x - d, z);
  const north = baldroSurfaceHeight(x, z - d), south = baldroSurfaceHeight(x, z + d);
  return { x, z, height, grade: Math.max(Math.hypot((east - west) / (2 * d), (south - north) / (2 * d)),
    Math.max(Math.abs(east - height), Math.abs(west - height), Math.abs(north - height), Math.abs(south - height)) / d) };
}
function candidates(cell) {
  const points = [], count = 144;
  for (let i = 0; i < count; i++) {
    const angle = i * 2.3999632297 + cell.q * .37 + cell.r * .17;
    const radius = 68 * Math.sqrt(i / count), x = cell.x + Math.cos(angle) * radius, z = cell.z + Math.sin(angle) * radius;
    const owner = baldroCellAt(x, z);
    if (owner?.q !== cell.q || owner?.r !== cell.r || excluded(x, z) || baldroPathDistance(x, z) < 10 || baldroWaterAt(x, z) !== null) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => baldroCellAt(x + dx, z + dz)?.region !== cell.region
      || baldroWaterAt(x + dx, z + dz) !== null)) continue;
    points.push(sample(x, z));
  }
  return points;
}
const result = [];
const cells = [...BALDRO_CELLS].sort((a, b) => a.r - b.r || a.q - b.q);
for (const [index, cell] of cells.entries()) {
  const points = candidates(cell), west = cell.region === 52;
  const preferences = west
    ? index % 3 === 0 ? ['hill-sheep', 'upland-hare', 'red-deer'] : index % 3 === 1 ? ['upland-hare', 'hill-sheep', 'red-deer'] : ['red-deer', 'upland-hare', 'hill-sheep']
    : index % 3 === 0 ? ['boar', 'red-deer', 'upland-hare'] : index % 3 === 1 ? ['red-deer', 'upland-hare', 'boar'] : ['upland-hare', 'red-deer', 'boar'];
  for (const species of preferences) {
    const habitat = BALDRO_HABITATS[species];
    const suitable = points.filter(p => p.height >= habitat.minHeight && p.height <= habitat.maxHeight && p.grade < habitat.maxSlope * .9);
    suitable.sort((a, b) => a.grade - b.grade || Math.hypot(a.x - cell.x, a.z - cell.z) - Math.hypot(b.x - cell.x, b.z - cell.z));
    if (!suitable.length) continue;
    const sites = [suitable[0]];
    const partner = suitable.find(p => Math.hypot(p.x - sites[0].x, p.z - sites[0].z) > 10
      && Math.hypot(p.x - sites[0].x, p.z - sites[0].z) < 25);
    if (partner && (species === 'hill-sheep' || species === 'red-deer' && index % 2 === 0)) sites.push(partner);
    result.push(freeze({ id: `baldro-${cell.q}-${cell.r}-${species}`, species, region: cell.regionName,
      sourceCell: freeze([cell.q, cell.r]), scale: 1, keepRegion: true, habitat: 'mountain', ...habitat,
      minX: cell.x - 74, maxX: cell.x + 74, minZ: cell.z - 74, maxZ: cell.z + 74,
      sites: freeze(sites.map(p => freeze([p.x, p.z]))), exclusions: BALDRO_WILDLIFE_EXCLUSIONS,
      hornless: species === 'red-deer' && index % 2 === 0,
      note: species === 'hill-sheep'
        ? 'Seasonal upland grazing on West Baldro, using the established hill-sheep.'
        : species === 'upland-hare' ? 'Existing cold-upland hares on dry turf among the Baldro outcrops.'
          : species === 'boar' ? 'Existing woodland boar in sheltered lower East Baldro woods.'
            : 'Existing red deer browsing the sheltered fringes of the Baldro woods.',
    }));
    break;
  }
}
export const BALDRO_WILDLIFE_ZONES = freeze(result);
export const baldroAnimalSpecies = freeze([...new Set(result.map(zone => zone.species))]);
export const baldroWildlifeZones = () => BALDRO_WILDLIFE_ZONES;
