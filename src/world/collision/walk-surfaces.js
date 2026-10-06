/** Elevated outdoor floors are separate from the terrain: the same X/Z can be walked above
 * or below. Rendered stairs use these continuous ramps beneath their small visual treads. */
export const WALK_STEP = .35;
export const validWalkSurfaceId = id => typeof id === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,127}$/.test(id);

/** Old colliders have no vertical bounds and retain their existing behavior. */
export function colliderOverlapsHeight(collider, feetY, bodyHeight = 1.75) {
  if (!Number.isFinite(feetY)) return true;
  const low = Number.isFinite(collider.minY) ? collider.minY : -Infinity;
  const high = Number.isFinite(collider.maxY) ? collider.maxY : Infinity;
  return feetY + bodyHeight > low + .01 && feetY < high - .01;
}

export function createWalkSurfaces(surfaces = [], groundHeightAt) {
  let frames = [], indexedCount = -1;
  function refresh() {
  if (indexedCount === surfaces.length) return;
  const next = surfaces.map(surface => {
    const { a, b, width } = surface;
    if (!validWalkSurfaceId(surface.id) || !['deck', 'ramp'].includes(surface.kind)
      || !a || !b || ![a.x, a.y, a.z, b.x, b.y, b.z, width].every(Number.isFinite) || width <= 0)
      throw new Error('Invalid walking surface');
    const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    if (length < .001) throw new Error(`Walking surface ${surface.id} has no length`);
    return { ...surface, dx: dx / length, dz: dz / length, length };
  });
  if (new Set(next.map(s => s.id)).size !== next.length) throw new Error('Walking surface IDs must be unique');
  frames = next; indexedCount = surfaces.length;
  }
  refresh();
  function sample(surface, x, z) {
    const dx = x - surface.a.x, dz = z - surface.a.z;
    const along = dx * surface.dx + dz * surface.dz, across = dx * -surface.dz + dz * surface.dx;
    if (along < -1e-6 || along > surface.length + 1e-6 || Math.abs(across) > surface.width / 2 + 1e-6) return null;
    const grade = (surface.b.y - surface.a.y) / surface.length, sign = Math.sign(grade);
    return { id: surface.id, height: surface.a.y + Math.max(0, Math.min(surface.length, along)) * grade,
      slope: Math.abs(grade), gradient: { x: surface.dx * sign, z: surface.dz * sign } };
  }
  function supportAt(x, z, { maxY = -Infinity, stepUp = 0, surfaceId, groundSlope = true } = {}) {
    refresh();
    if (surfaceId !== undefined) {
      const surface = frames.find(s => s.id === surfaceId);
      return surface ? sample(surface, x, z) : null;
    }
    let found = null;
    for (const surface of frames) {
      const candidate = sample(surface, x, z);
      if (candidate && candidate.height <= maxY + stepUp + 1e-6 && (!found || candidate.height > found.height)) found = candidate;
    }
    const height = groundHeightAt(x, z);
    if (found && found.height >= height - .01) return found;
    if (!groundSlope) return { id: null, height };
    const d = .4, gx = (groundHeightAt(x + d, z) - groundHeightAt(x - d, z)) / (d * 2);
    const gz = (groundHeightAt(x, z + d) - groundHeightAt(x, z - d)) / (d * 2), slope = Math.hypot(gx, gz);
    return { id: null, height, slope, gradient: { x: slope > 1e-7 ? gx / slope : 0, z: slope > 1e-7 ? gz / slope : 0 } };
  }
  return { supportAt, restoreAt: (x, z, surfaceId) => supportAt(x, z, { surfaceId }) };
}

/** The id chooses a known floor, never a saved arbitrary Y. Removed floors safely resume below. */
export function restoreWalkPosition(position, world) {
  const support = validWalkSurfaceId(position.surfaceId)
    ? world.supportAt?.(position.x, position.z, { surfaceId: position.surfaceId }) : null;
  return { x: position.x, z: position.z, y: support?.height ?? world.heightAt(position.x, position.z),
    ...(support?.id ? { surfaceId: support.id } : {}) };
}
