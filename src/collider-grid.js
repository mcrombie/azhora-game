/**
 * A grid over the world's colliders, so a step asks a handful of shapes whether
 * it is blocked instead of all nine thousand. Each collider is filed in every
 * cell its extent covers; a query gathers the cells its own reach touches. The
 * answer is a superset of the shapes that can overlap — never fewer — so callers
 * test what comes back exactly as they tested the whole list before. A shape that
 * straddles the cells a query touches comes back once per cell; repeats cost one
 * more comparison each and are not worth the bookkeeping to remove.
 *
 * Pure: no DOM, no three. The world rebuilds its index when the collider list
 * grows or shrinks (`src/world.js`), which is the only way it ever changes.
 */
export const COLLIDER_CELL = 16;

const extentX = c => c.r !== undefined ? c.r : c.hx;
const extentZ = c => c.r !== undefined ? c.r : c.hz;

export function createColliderGrid(colliders, cell = COLLIDER_CELL) {
  const buckets = new Map();
  const key = (cx, cz) => cx * 8388608 + cz;
  let widest = 0, filed = 0;
  for (const collider of colliders) {
    const ex = extentX(collider), ez = extentZ(collider);
    if (!Number.isFinite(collider.x) || !Number.isFinite(collider.z) || !Number.isFinite(ex) || !Number.isFinite(ez)) continue;
    widest = Math.max(widest, ex, ez);
    const x0 = Math.floor((collider.x - ex) / cell), x1 = Math.floor((collider.x + ex) / cell);
    const z0 = Math.floor((collider.z - ez) / cell), z1 = Math.floor((collider.z + ez) / cell);
    for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) {
      const at = key(cx, cz), bucket = buckets.get(at);
      if (bucket) bucket.push(collider); else buckets.set(at, [collider]);
      filed++;
    }
  }

  const scratch = [];
  /**
   * Every collider that could reach within `reach` metres of the point. `out` is
   * reused between calls unless the caller passes its own array, so read the
   * result before querying again.
   */
  function near(x, z, reach = 0, out = scratch) {
    out.length = 0;
    if (!Number.isFinite(x) || !Number.isFinite(z)) return out;
    const x0 = Math.floor((x - reach) / cell), x1 = Math.floor((x + reach) / cell);
    const z0 = Math.floor((z - reach) / cell), z1 = Math.floor((z + reach) / cell);
    for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) {
      const bucket = buckets.get(key(cx, cz));
      if (!bucket) continue;
      for (let i = 0; i < bucket.length; i++) out.push(bucket[i]);
    }
    return out;
  }

  return { near, cell, count: colliders.length, cells: buckets.size, filed, widest };
}
