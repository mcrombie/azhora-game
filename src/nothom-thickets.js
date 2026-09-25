import { hexAt, hexCentre, LUMBER_TOWN } from './region-world.js';
import { METRES_PER_HEX } from './world-scale.js';
import { BEN_ROUTE } from './ben-guide.js';
import { SPIDER_DEN } from './spider-quest.js';

const home = hexAt(LUMBER_TOWN.square.x, LUMBER_TOWN.square.z);
/** The exact west and northwest neighbors, not an approximate world rectangle. */
export const NOTHOM_THICKET_HEXES = Object.freeze([
  Object.freeze({ q: home.q - 1, r: home.r, name: 'west', ...hexCentre(home.q - 1, home.r) }),
  Object.freeze({ q: home.q, r: home.r - 1, name: 'northwest', ...hexCentre(home.q, home.r - 1) }),
]);

export function thicketHexInset(point, cell) {
  const dx = Math.abs(point.x - cell.x), dz = Math.abs(point.z - cell.z);
  return Math.min(METRES_PER_HEX / 2 - dx, (METRES_PER_HEX - dx - Math.sqrt(3) * dz) / 2);
}

function segmentGap(point, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(point.x - a.x - dx * t, point.z - a.z - dz * t);
}

/** Seeded patches retain broad open walking gaps; all radii include the outward canes. */
export function nothomThicketSites({ roadDistance = () => Infinity } = {}) {
  const sites = [];
  for (const [cellIndex, cell] of NOTHOM_THICKET_HEXES.entries()) {
    let seed = 71551 + cellIndex * 104729;
    const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    let count = 0;
    for (let attempt = 0; attempt < 700 && count < 17; attempt++) {
      const radius = count < 3 ? 5.1 + random() * .9 : 2.1 + random() * 2.0;
      const site = { x: cell.x + (random() - .5) * METRES_PER_HEX,
        z: cell.z + (random() - .5) * METRES_PER_HEX * 1.15, radius,
        height: count < 3 ? 2.5 + random() * .8 : 1.1 + random() * 1.2,
        yaw: random() * Math.PI * 2, density: .7 + random() * .3,
        seed: seed >>> 0, q: cell.q, r: cell.r, cell: cell.name };
      if (thicketHexInset(site, cell) < radius + .6) continue;
      if (roadDistance(site.x, site.z) < radius + 3) continue;
      if (Math.hypot(site.x - LUMBER_TOWN.square.x, site.z - LUMBER_TOWN.square.z) < radius + 52) continue;
      if (Math.hypot(site.x - SPIDER_DEN.center.x, site.z - SPIDER_DEN.center.z) < radius + 16) continue;
      if (BEN_ROUTE.some((b, i) => i && segmentGap(site, BEN_ROUTE[i - 1], b) < radius + 4.5)) continue;
      if (sites.some(other => Math.hypot(site.x - other.x, site.z - other.z) < radius + other.radius + 4)) continue;
      sites.push(Object.freeze(site)); count++;
    }
  }
  return Object.freeze(sites);
}
