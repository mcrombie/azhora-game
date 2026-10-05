/** One retained river-ground pass shared by the forest and its coastal outlets.
 * Ownership covers the 48 m refinement collar, including its North Ibenwood end.
 * The open-country shore is supplied by explicit coarse bounds, not scenery. */
import { refineIbenwoodRiverGroundSteps } from './ibenwood-rivers.js';
// South and North Ibenal (114, 115) joined 5 October 2026: their streams are the forest's other coastal outlets.
export const IBENWOOD_ALEZHOR_GROUND_REGIONS = Object.freeze([33, 34, 35, 36, 64, 114, 115]);

export function combinedRiverIndex(...indices) {
  return {
    courses: indices.flatMap(index => index.courses),
    nearest(x, z, reach = 48) {
      let best = null;
      for (const index of indices) {
        const hit = index.nearest(x, z, reach);
        if (hit && (!best || hit.distance < best.distance)) best = hit;
      }
      return best;
    },
  };
}

export function* createIbenwoodAlezhorGroundSteps({ THREE, terrainRoot, forest, coast, heightAt, streamTerrain }) {
  const rivers = combinedRiverIndex(forest, coast);
  if (streamTerrain) for (const {bounds} of rivers.courses) yield* streamTerrain.buildBounds(bounds, 58);
  const terrain = yield* refineIbenwoodRiverGroundSteps({ THREE, terrainRoot, rivers, heightAt });
  const fineGroundHeight = yield* riverGroundSamplerSteps(terrain.patches);
  return { ...terrain, fineGroundHeight };
}

/** Look up the actual Float32 triangles that replaced coarse faces. A null result
 * means the old coarse plane remains; never max a cut-out plane with its bed. */
export function* riverGroundSamplerSteps(meshes) {
  const buckets = new Map(), size = 12; let work = 0;
  for (const mesh of meshes) {
    const p = mesh.geometry.attributes.position.array, index = mesh.geometry.index.array;
    for (let k = 0; k < index.length; k += 3) {
      if ((++work & 255) === 0) yield;
      const a = index[k] * 3, b = index[k + 1] * 3, c = index[k + 2] * 3, triangle = {p, a, b, c};
      for (let x = Math.floor(Math.min(p[a], p[b], p[c]) / size); x <= Math.floor(Math.max(p[a], p[b], p[c]) / size); x++)
        for (let z = Math.floor(Math.min(p[a + 2], p[b + 2], p[c + 2]) / size); z <= Math.floor(Math.max(p[a + 2], p[b + 2], p[c + 2]) / size); z++) {
          const key = `${x},${z}`; if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push(triangle);
        }
    }
  }
  return (x, z) => {
    let result = -Infinity;
    for (const {p, a, b, c} of buckets.get(`${Math.floor(x / size)},${Math.floor(z / size)}`) ?? []) {
      const dx = x - p[a], dz = z - p[a + 2], bx = p[b] - p[a], bz = p[b + 2] - p[a + 2], cx = p[c] - p[a], cz = p[c + 2] - p[a + 2], det = bx * cz - bz * cx;
      if (Math.abs(det) < 1e-12) continue;
      const u = (dx * cz - dz * cx) / det, v = (bx * dz - bz * dx) / det;
      if (u >= -1e-7 && v >= -1e-7 && u + v <= 1.0000001) result = Math.max(result, p[a + 1] + (p[b + 1] - p[a + 1]) * u + (p[c + 1] - p[a + 1]) * v);
    }
    return result === -Infinity ? null : result;
  };
}
