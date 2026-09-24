// Render-only planar clipping. Navigation paths retain their complete centre lines.
const EPSILON = 1e-8;
const signed = (a, b, p) => (b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x);
const area = polygon => polygon.reduce((sum, p, i) => {
  const q = polygon[(i + 1) % polygon.length]; return sum + p.x * q.z - p.z * q.x;
}, 0) / 2;
const bounds = points => ({ minX: Math.min(...points.map(p => p.x)), maxX: Math.max(...points.map(p => p.x)),
  minZ: Math.min(...points.map(p => p.z)), maxZ: Math.max(...points.map(p => p.z)) });
const overlap = (a, b) => a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;

/** Clip a convex polygon to one side of a directed line, preserving interpolated ground height. */
function halfPlane(polygon, a, b, inside) {
  const result = [];
  for (let i = 0; i < polygon.length; i++) {
    const p = polygon[i], q = polygon[(i + 1) % polygon.length];
    const dp = signed(a, b, p), dq = signed(a, b, q);
    const keepP = inside ? dp >= -EPSILON : dp <= EPSILON;
    const keepQ = inside ? dq >= -EPSILON : dq <= EPSILON;
    if (keepP) result.push(p);
    if (keepP !== keepQ) {
      const t = dp / (dp - dq);
      result.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t, z: p.z + (q.z - p.z) * t });
    }
  }
  return result;
}

/** Subtract a convex road face; successive outside fragments never overlap one another. */
function subtract(polygon, road) {
  // If one supporting edge separates the entire subject, preserve its vertices and identity.
  for (let i = 0; i < road.length; i++) if (polygon.every(p => signed(road[i], road[(i + 1) % road.length], p) <= EPSILON)) return [polygon];
  let remaining = polygon;
  const outside = [];
  for (let i = 0; i < road.length && remaining.length >= 3; i++) {
    const a = road[i], b = road[(i + 1) % road.length];
    const fragment = halfPlane(remaining, a, b, false);
    if (fragment.length >= 3 && Math.abs(area(fragment)) > EPSILON) outside.push(fragment);
    remaining = halfPlane(remaining, a, b, true);
  }
  return outside;
}

/** Spatially bounded subtraction against the exact rendered road triangles, including bends. */
export function createRoadSurfaceMask(triangles, cellSize = 8) {
  const buckets = new Map();
  const eachCell = (box, visit) => {
    for (let x = Math.floor(box.minX / cellSize); x <= Math.floor(box.maxX / cellSize); x++)
      for (let z = Math.floor(box.minZ / cellSize); z <= Math.floor(box.maxZ / cellSize); z++) visit(`${x},${z}`);
  };
  for (const triangle of triangles) {
    if (triangle.length !== 3 || Math.abs(area(triangle)) <= EPSILON) continue;
    const polygon = area(triangle) > 0 ? triangle : [...triangle].reverse(), entry = { polygon, bounds: bounds(polygon) };
    eachCell(entry.bounds, key => {
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(entry);
    });
  }
  return {
    clip(triangle) {
      const box = bounds(triangle), candidates = new Set();
      eachCell(box, key => { for (const entry of buckets.get(key) ?? []) if (overlap(box, entry.bounds)) candidates.add(entry); });
      let pieces = [triangle];
      for (const road of candidates) {
        const next = [];
        for (const piece of pieces) {
          if (overlap(bounds(piece), road.bounds)) next.push(...subtract(piece, road.polygon));
          else next.push(piece);
        }
        pieces = next;
        if (!pieces.length) break;
      }
      return pieces;
    },
  };
}
