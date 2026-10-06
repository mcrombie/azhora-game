/** Iscare is the archipelago east/south of Solis, not the inland Isareos country.
 * Retain the atlas's exact region key (`Archipeligo`) while prose uses Archipelago.
 * The original atlas owns every island; no synthetic bridges or connecting land are added.
 */
import { hexCentre, REGION_CELLS, hexOwnerAt, landDistance } from '../../../world/terrain/region-world.js';

const freeze = Object.freeze;
export const ISCARE_REGION = 'Iscare Archipeligo';
export const ISCARE_ISLANDS = freeze((REGION_CELLS[ISCARE_REGION] ?? []).map((cell, i) => freeze({
  id: `iscare-${cell.q}-${cell.r}`, q: cell.q, r: cell.r, x: cell.x, z: cell.z, terrain: cell.terrain,
  name: cell.q === 1 && cell.r === 119 ? 'Zecron' : `Iscare island ${i + 1}`,
})));
export const ZECRON = freeze({ ...hexCentre(1, 119), id: 'zecron-ruins', name: 'The ruins of Zecron', radius: 36, abandoned: true });
export const ISCARE_RUIN_SITES = freeze([
  ZECRON,
  ...[[-1, 121], [2, 122], [-3, 123], [8, 124], [-1, 129]].map(([q, r], i) => freeze({
    ...hexCentre(q, r), id: `iscare-burned-hamlet-${i + 1}`, name: 'Burned island settlement', radius: 18, abandoned: true,
  })),
]);
export const ZECRON_BUILDINGS = freeze([
  ...[[-22, -17], [-9, -20], [8, -19], [21, -13], [-23, 1], [-12, 1], [10, 1], [24, 4], [-18, 18], [-3, 21], [14, 20]].map(([dx, dz], i) => freeze({
    id: `zecron-home-${i + 1}`, x: ZECRON.x + dx, z: ZECRON.z + dz, width: 6 + i % 3, depth: 6, height: 1.2 + i % 3,
  })),
  freeze({ id: 'zecron-council-ruin', x: ZECRON.x, z: ZECRON.z - 2, width: 11, depth: 8, height: 3.5 }),
]);
export function iscareClear(x, z, margin = 0) {
  return ISCARE_RUIN_SITES.some(site => Math.hypot(x - site.x, z - site.z) < site.radius + margin);
}

/** Bedrock spines break up the low island interiors. The waterline stays exactly the atlas coast. */
export function iscareGround(x, z, ground) {
  if (x < -1030 || x > 370 || z < 1085 || z > 2090 || hexOwnerAt(x, z) !== ISCARE_REGION) return ground;
  const coast = landDistance(x, z), coastalFade = Math.max(0, Math.min(1, (coast - 12) / 18));
  if (coastalFade <= 0) return ground;
  const island = ISCARE_ISLANDS.reduce((a, b) => Math.hypot(a.x - x, a.z - z) < Math.hypot(b.x - x, b.z - z) ? a : b);
  const dx = x - island.x, dz = z - island.z;
  const spine = Math.max(0, 1 - Math.abs(dx * .57 + dz * .82 + 18) / 13);
  const occupied = iscareClear(x, z, 3);
  return ground + (occupied ? 0 : spine * (island.terrain === 'hills' ? 8 : 3.8)) * coastalFade;
}

/** Every land island has persistent animals, including mammals rather than seabirds alone. */
export const ISCARE_WILDLIFE_ZONES = freeze(ISCARE_ISLANDS.flatMap((island, i) => ['upland-hare', 'gull'].map((species, n) => freeze({
  id: `${island.id}-${species}`, species, region: ISCARE_REGION, keepRegion: true, radius: .3,
  minX: island.x - 43, maxX: island.x + 43, minZ: island.z - 43, maxZ: island.z + 43,
  sites: freeze((n ? [[-31, -14], [28, 17], [6, 31]] : [[-27, 22], [27, -23]]).map(([dx, dz]) => freeze([island.x + dx, island.z + dz]))),
  note: n ? 'Seabirds nest on the broken harbor stones and island turf.' : 'Hares shelter in abandoned gardens and coastal scrub.',
}))));
