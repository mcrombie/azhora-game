/** Runtime water is the delivered ribbon's actual Float32 triangles. Vegetation
 * and river-ground jobs do not own availability of this small cached query. */
import { ALEZHOR_BOX, alezhorWaterRibbons, alezhorRivers, GOLD_REACH_SPEC } from './alezhor-world.js';

let buckets = null;
const SIZE = 12;
function prepare() {
  buckets = new Map();
  const reaches = new Map(alezhorRivers().map(({reach}) => [reach.id, reach]));
  for (const ribbon of alezhorWaterRibbons()) {
    const positions = new Float32Array(ribbon.positions), reach = reaches.get(ribbon.id);
    for (let i = 0; i < ribbon.indices.length; i += 3) {
      const ids = ribbon.indices.slice(i, i + 3), p = ids.map(id => [...positions.slice(id * 3, id * 3 + 3), reach.samples[Math.floor(id / 2)].along]);
      const [a,b,c] = p, det = (b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);
      if (Math.abs(det) < 1e-12) continue;
      const row = { p, inverse: 1 / det, gold: ribbon.id === GOLD_REACH_SPEC.id };
      for (let x = Math.floor(Math.min(a[0],b[0],c[0])/SIZE); x <= Math.floor(Math.max(a[0],b[0],c[0])/SIZE); x++)
        for (let z = Math.floor(Math.min(a[2],b[2],c[2])/SIZE); z <= Math.floor(Math.max(a[2],b[2],c[2])/SIZE); z++) {
          const key = `${x},${z}`; if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push(row);
        }
    }
  }
}

export function alezhorSwimmingSurface(x, z, groundAt = null) {
  if (x < ALEZHOR_BOX.minX - 100 || x > ALEZHOR_BOX.maxX + 100 || z < ALEZHOR_BOX.minZ - 100 || z > ALEZHOR_BOX.maxZ + 100) return null;
  if (!buckets) prepare();
  let surface = -Infinity;
  for (const {p:[a,b,c],inverse,gold} of buckets.get(`${Math.floor(x/SIZE)},${Math.floor(z/SIZE)}`) ?? []) {
    const u = ((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))*inverse;
    const v = ((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))*inverse, w = 1-u-v;
    if (u < -1e-8 || v < -1e-8 || w < -1e-8) continue;
    if (gold) {
      const along = u*a[3]+v*b[3]+w*c[3], ford = GOLD_REACH_SPEC.ford;
      if ((along >= ford.from && along <= ford.to) || GOLD_REACH_SPEC.falls.some(([from,to]) => along >= from && along <= to)) continue;
    }
    surface = Math.max(surface,u*a[1]+v*b[1]+w*c[1]);
  }
  if (surface === -Infinity || (groundAt && groundAt(x,z) >= surface)) return null;
  return surface;
}
