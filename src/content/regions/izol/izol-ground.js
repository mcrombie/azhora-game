import { REGION_CELLS, TRANSFORM, hexAtlasCorners, seamlessTerrainMix, relief } from '../../../world/terrain/region-world.js';

// The old seven-hex blend changes its sample set at an atlas edge. Use the
// continuous blend only near West Izol's own edges, including internal ones;
// settlement pads and the shore are applied afterwards by world-terrain.
const CORE = 6, REACH = 24, BUCKET = 64;
const buckets = new Map(), seen = new Set();
const bounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
for (const cell of REGION_CELLS['West Izol']) {
  const loop = hexAtlasCorners(cell.q, cell.r).map(p => TRANSFORM.atlasToWorld(p.x, p.y));
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i], b = loop[(i + 1) % loop.length];
    const key = [`${a.x.toFixed(5)},${a.z.toFixed(5)}`, `${b.x.toFixed(5)},${b.z.toFixed(5)}`].sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    const dx = b.x - a.x, dz = b.z - a.z;
    const edge = { x: a.x, z: a.z, dx, dz, length2: dx * dx + dz * dz };
    const minX = Math.min(a.x, b.x) - REACH, maxX = Math.max(a.x, b.x) + REACH;
    const minZ = Math.min(a.z, b.z) - REACH, maxZ = Math.max(a.z, b.z) + REACH;
    bounds.minX = Math.min(bounds.minX, minX); bounds.maxX = Math.max(bounds.maxX, maxX);
    bounds.minZ = Math.min(bounds.minZ, minZ); bounds.maxZ = Math.max(bounds.maxZ, maxZ);
    for (let ix = Math.floor(minX / BUCKET); ix <= Math.floor(maxX / BUCKET); ix++) {
      for (let iz = Math.floor(minZ / BUCKET); iz <= Math.floor(maxZ / BUCKET); iz++) {
        const bucket = `${ix},${iz}`;
        if (!buckets.has(bucket)) buckets.set(bucket, []);
        buckets.get(bucket).push(edge);
      }
    }
  }
}

/** Full correction within six metres of an island hex edge; none beyond 24 m. */
export function izolSeamWeight(x, z) {
  if (x <= bounds.minX || x >= bounds.maxX || z <= bounds.minZ || z >= bounds.maxZ) return 0;
  const nearby = buckets.get(`${Math.floor(x / BUCKET)},${Math.floor(z / BUCKET)}`);
  if (!nearby) return 0;
  let distance2 = REACH * REACH;
  for (const edge of nearby) {
    const t = Math.max(0, Math.min(1, ((x - edge.x) * edge.dx + (z - edge.z) * edge.dz) / edge.length2));
    const dx = x - edge.x - t * edge.dx, dz = z - edge.z - t * edge.dz;
    distance2 = Math.min(distance2, dx * dx + dz * dz);
  }
  if (distance2 <= CORE * CORE) return 1;
  if (distance2 >= REACH * REACH) return 0;
  const t = (Math.sqrt(distance2) - CORE) / (REACH - CORE);
  return 1 - t * t * (3 - 2 * t);
}

export function izolSeamInland(x, z, original) {
  const weight = izolSeamWeight(x, z);
  if (!weight) return original;
  const mix = seamlessTerrainMix(x, z), complete = mix.base + relief(x, z, mix.amp, mix.wave);
  return weight === 1 ? complete : original + (complete - original) * weight;
}
