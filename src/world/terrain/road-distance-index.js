/** Exact nearest road-edge distance, including negative values inside a road.
 *
 * Segment records use {ax,az,bx,bz,width}. The source array may grow while the
 * world is built; length changes rebuild the index on the next query. Call
 * rebuild() after changing an existing record or replacing one at equal length.
 * Nothing here consumes randomness or changes the records/order of the source.
 */
export function createRoadDistanceIndex(segments) {
  let root = null, indexedLength = -1, fallback = false, builds = 0, nodes = 0;
  const exact = (s, x, z) => {
    const dx = s.bx - s.ax, dz = s.bz - s.az;
    const t = Math.max(0, Math.min(1, ((x - s.ax) * dx + (z - s.az) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(x - s.ax - t * dx, z - s.az - t * dz) - s.width / 2;
  };
  function linear(x, z) {
    let nearest = Infinity;
    for (const segment of segments) nearest = Math.min(nearest, exact(segment, x, z));
    return nearest;
  }
  function build(items) {
    nodes++;
    const node = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity, halfWidth: -Infinity };
    for (const s of items) {
      node.minX = Math.min(node.minX, s.ax, s.bx); node.maxX = Math.max(node.maxX, s.ax, s.bx);
      node.minZ = Math.min(node.minZ, s.az, s.bz); node.maxZ = Math.max(node.maxZ, s.az, s.bz);
      node.halfWidth = Math.max(node.halfWidth, s.width / 2);
    }
    node.magnitude = Math.max(Math.abs(node.minX), Math.abs(node.maxX), Math.abs(node.minZ), Math.abs(node.maxZ), Math.abs(node.halfWidth));
    if (items.length <= 8) node.items = items;
    else {
      const xAxis = node.maxX - node.minX >= node.maxZ - node.minZ;
      const center = s => xAxis ? s.ax + (s.bx - s.ax) / 2 : s.az + (s.bz - s.az) / 2;
      items.sort((a, b) => center(a) - center(b));
      const middle = Math.floor(items.length / 2);
      node.left = build(items.slice(0, middle)); node.right = build(items.slice(middle));
    }
    return node;
  }
  function rebuild() {
    indexedLength = segments.length; builds++; nodes = 0;
    // Preserve the old loop's NaN/Infinity behavior for malformed or degenerate
    // paths instead of allowing the index to accidentally prune one away.
    fallback = segments.some(s => ![s.ax, s.az, s.bx, s.bz, s.width].every(Number.isFinite)
      || Math.max(Math.abs(s.ax), Math.abs(s.az), Math.abs(s.bx), Math.abs(s.bz)) > 1e150
      || !Number.isFinite((s.bx - s.ax) ** 2 + (s.bz - s.az) ** 2)
      || (s.bx - s.ax) ** 2 + (s.bz - s.az) ** 2 === 0);
    root = !fallback && segments.length ? build(segments.slice()) : null;
    return api;
  }
  function lowerBound(node, x, z) {
    const dx = Math.max(node.minX - x, 0, x - node.maxX), dz = Math.max(node.minZ - z, 0, z - node.maxZ);
    const bound = Math.hypot(dx, dz) - node.halfWidth;
    // Each leaf does several subtractions before Math.hypot. Allow their final
    // few rounding bits at large world coordinates, so a bound never prunes an
    // exactly equal/slightly smaller computed distance at a branch boundary.
    return bound - Math.max(1, Math.abs(x), Math.abs(z), node.magnitude) * Number.EPSILON * 32;
  }
  function distance(x, z) {
    if (segments.length !== indexedLength) rebuild();
    if (fallback || !Number.isFinite(x) || !Number.isFinite(z) || Math.max(Math.abs(x), Math.abs(z)) > 1e150) return linear(x, z);
    if (!root) return Infinity;
    let nearest = Infinity;
    function visit(node) {
      if (node.items) {
        for (const segment of node.items) nearest = Math.min(nearest, exact(segment, x, z));
        return;
      }
      const a = lowerBound(node.left, x, z), b = lowerBound(node.right, x, z);
      if (a <= b) {
        if (a <= nearest) visit(node.left);
        if (b <= nearest) visit(node.right);
      } else {
        if (b <= nearest) visit(node.right);
        if (a <= nearest) visit(node.left);
      }
    }
    visit(root);
    return nearest;
  }
  const api = { distance, rebuild, stats: () => ({ segments: indexedLength, nodes, builds, fallback }) };
  return api;
}
