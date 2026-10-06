import { REGION_CELLS, hexOwnerAt } from '../../../world/terrain/region-world.js';
import { IBENWOOD_NAMES, IBENWOOD_GROVES, IBENWOOD_PILOT, ibenwoodFeatureClear } from './ibenwood-environment.js';

const freeze = Object.freeze;
const radii = freeze({ 'red-deer': .55, boar: .7, 'upland-hare': .3 });
// Hare/deer/boar proportions reflect the available ground, not region difficulty.
const profiles = freeze({
  'North Ibenwood': [6, 10],
  'East Ibenwood': [6, 10],
  'South Ibenwood': [4, 9],
  'West Ibenwood': [4, 9],
  'Central Ibenwood': [5, 10],
});
const hash = (q, r, salt = 0) => {
  let value = (Math.imul(q, 73856093) ^ Math.imul(r, 19349663) ^ salt ^ 0x1be903) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
};

// The controller understands rectangular exclusions. Conservative boxes keep
// newcomers out of homes and leave the pilot's established animals unduplicated.
const exclusions = freeze([IBENWOOD_PILOT, ...IBENWOOD_GROVES].map(place => {
  const half = place.radius + 10;
  return freeze({ minX: place.x - half, maxX: place.x + half, minZ: place.z - half, maxZ: place.z + half });
}));
const excluded = (x, z) => exclusions.some(a => x >= a.minX && x <= a.maxX && z >= a.minZ && z <= a.maxZ);

function homeSites(cell, region, count) {
  const sites = [], phase = hash(cell.q, cell.r, 31) / 0x100000000 * Math.PI * 2;
  for (let i = 0; i < 40 && sites.length < count; i++) {
    const angle = phase + i * 2.399963229728653, reach = 12 + (i % 4) * 7;
    const x = cell.x + Math.sin(angle) * reach, z = cell.z + Math.cos(angle) * reach;
    if (hexOwnerAt(x, z) !== region || excluded(x, z) || !ibenwoodFeatureClear(x, z, 2)) continue;
    if (sites.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 16)) continue;
    sites.push(freeze([x, z]));
  }
  return freeze(sites);
}

function groundZones() {
  return IBENWOOD_NAMES.flatMap(region => [...(REGION_CELLS[region] ?? [])]
    .sort((a, b) => a.q - b.q || a.r - b.r).flatMap(cell => {
      const choice = hash(cell.q, cell.r) % 12, [hare, deer] = profiles[region];
      const species = choice < hare ? 'upland-hare' : choice < deer ? 'red-deer' : 'boar';
      const count = species === 'red-deer' || (species === 'upland-hare' && hash(cell.q, cell.r, 73) % 2 === 0) ? 2 : 1;
      const sites = homeSites(cell, region, count);
      if (!sites.length) return [];
      return [freeze({
        id: `ibenwood-woods-${cell.q}-${cell.r}`, region, species, habitat: 'woodland', keepRegion: true,
        radius: radii[species], scale: 1, ...(species === 'red-deer' ? { hornless: true } : {}),
        // 113 m from centre to corner: inside WestLife's 130 m simulation reach.
        // Ranges overlap neighboring hexes, giving fleeing animals room to return.
        minX: cell.x - 80, maxX: cell.x + 80, minZ: cell.z - 80, maxZ: cell.z + 80,
        sites, exclusions,
        note: 'Resident forest fauna: small bands forage in woodland openings and return to their established home range. Groves and the pilot are excluded.',
      })];
    }));
}

function hawkZones() {
  // A few solitary birds above lighter outer woodland; deep canopy is not a
  // substitute for a hunting opening. Other woodland bird rigs have a separate host.
  return ['North Ibenwood', 'East Ibenwood', 'South Ibenwood'].flatMap(region => {
    const candidates = [...(REGION_CELLS[region] ?? [])].filter(cell => cell.terrain === 'forest'
      && !excluded(cell.x, cell.z)
      && [IBENWOOD_PILOT, ...IBENWOOD_GROVES].every(place => Math.hypot(cell.x - place.x, cell.z - place.z) > place.radius + 55))
      .sort((a, b) => hash(a.q, a.r, 113) - hash(b.q, b.r, 113) || a.q - b.q || a.r - b.r);
    const cell = candidates.find(c => Array.from({ length: 12 }, (_, i) => {
      const angle = i * Math.PI / 6;
      return hexOwnerAt(c.x + Math.sin(angle) * 32, c.z + Math.cos(angle) * 32) === region;
    }).every(Boolean));
    if (!cell) return [];
    return [freeze({
      id: `ibenwood-edge-hawk-${cell.q}-${cell.r}`, region, species: 'plateau-hawk', radius: .3, scale: 1,
      air: 45, circle: 32, bob: 2, keepRegion: true,
      minX: cell.x - 55, maxX: cell.x + 55, minZ: cell.z - 55, maxZ: cell.z + 55,
      sites: freeze([freeze([cell.x, cell.z])]),
      note: 'A solitary existing hawk rig circles above lighter outer woodland; no new bird species or magical creature.',
    })];
  });
}

/** Stable atlas habitats; the existing WestLife controller handles footing,
 * collision, movement, and distance culling. No player-relative spawning. */
export const IBENWOOD_LIFE_ZONES = freeze([...groundZones(), ...hawkZones()]);
