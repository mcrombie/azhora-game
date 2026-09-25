/**
 * Cut a road ribbon against the triangles of the displayed terrain grid.
 * Sampling the smooth height field only at a ribbon's edges lets a coarse
 * ground triangle poke through its middle. Each resulting road face lies on
 * one ground face, with a small decal offset, so slopes remain slopes.
 */
const EPS = 1e-8;
const cross = (a, b, p) => (b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x);
function clip(subject, a, b) {
  const out = [];
  for (let i = 0; i < subject.length; i++) {
    const p = subject[i], q = subject[(i + 1) % subject.length];
    const dp = cross(a, b, p), dq = cross(a, b, q), pin = dp >= -EPS, qin = dq >= -EPS;
    if (pin) out.push(p);
    if (pin !== qin) {
      const t = dp / (dp - dq);
      out.push({ x: p.x + (q.x - p.x) * t, z: p.z + (q.z - p.z) * t });
    }
  }
  return out;
}
function cellAt(axis, value) {
  let lo = 0, hi = axis.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (axis[mid] <= value) lo = mid; else hi = mid; }
  return Math.min(axis.length - 2, Math.max(0, lo));
}
export function drapeRoadOnTerrain(positions, indices, xs, zs, terrainPositions, offset = .045, strengthAt = null) {
  const output = [], outputIndices = [], columns = xs.length;
  const terrainVertex = (i, j) => {
    const at = (j * columns + i) * 3;
    return { x: terrainPositions[at], y: terrainPositions[at + 1], z: terrainPositions[at + 2] };
  };
  for (let at = 0; at < indices.length; at += 3) {
    const road = indices.slice(at, at + 3).map(index => ({ x: positions[index * 3], y: positions[index * 3 + 1], z: positions[index * 3 + 2] }));
    if (strengthAt && road.every(p => strengthAt(p.x, p.z) <= 0)) {
      const base = output.length / 3;
      for (const p of road) output.push(p.x, p.y, p.z);
      outputIndices.push(base, base + 1, base + 2); continue;
    }
    const minX = Math.min(...road.map(p => p.x)), maxX = Math.max(...road.map(p => p.x));
    const minZ = Math.min(...road.map(p => p.z)), maxZ = Math.max(...road.map(p => p.z));
    for (let j = cellAt(zs, minZ); j <= cellAt(zs, maxZ); j++) for (let i = cellAt(xs, minX); i <= cellAt(xs, maxX); i++) {
      const a = terrainVertex(i, j), b = terrainVertex(i + 1, j), c = terrainVertex(i, j + 1), d = terrainVertex(i + 1, j + 1);
      // Terrain indices use a-c-b and b-c-d; clipping needs the positive XZ winding.
      for (const ground of [[a, b, c], [b, d, c]]) {
        let polygon = road;
        for (let edge = 0; edge < 3 && polygon.length; edge++) polygon = clip(polygon, ground[edge], ground[(edge + 1) % 3]);
        if (polygon.length < 3) continue;
        const [u, v, w] = ground, denominator = cross(u, v, w), base = output.length / 3;
        for (const p of polygon) {
          const vw = cross(v, w, p) / denominator, wu = cross(w, u, p) / denominator;
          let height = u.y * vw + v.y * wu + w.y * (1 - vw - wu) + offset;
          if (strengthAt) {
            const [ra, rb, rc] = road, rd = cross(ra, rb, rc), rw = cross(rb, rc, p) / rd, rv = cross(rc, ra, p) / rd;
            const oldHeight = ra.y * rw + rb.y * rv + rc.y * (1 - rw - rv);
            height = oldHeight + (height - oldHeight) * strengthAt(p.x, p.z);
          }
          output.push(p.x, height, p.z);
        }
        // Restore the road's upward-facing XZ winding.
        for (let k = 1; k + 1 < polygon.length; k++) {
          if (Math.abs(cross(polygon[0], polygon[k], polygon[k + 1])) < EPS) continue;
          if (cross(polygon[0], polygon[k], polygon[k + 1]) < 0) outputIndices.push(base, base + k, base + k + 1);
          else outputIndices.push(base, base + k + 1, base + k);
        }
      }
    }
  }
  return { positions: output, indices: outputIndices };
}

/** The same barycentric plane used by the cut road faces, for feet and hooves. */
export function terrainRoadHeight(x, z, xs, zs, terrainPositions, offset = .045) {
  const i = cellAt(xs, x), j = cellAt(zs, z), columns = xs.length;
  const vertex = (a, b) => { const at = (b * columns + a) * 3; return { x: terrainPositions[at], y: terrainPositions[at + 1], z: terrainPositions[at + 2] }; };
  const a = vertex(i, j), b = vertex(i + 1, j), c = vertex(i, j + 1), d = vertex(i + 1, j + 1), p = { x, z };
  const [u, v, w] = cross(b, c, p) >= 0 ? [a, b, c] : [b, d, c];
  const denominator = cross(u, v, w), vw = cross(v, w, p) / denominator, wu = cross(w, u, p) / denominator;
  return u.y * vw + v.y * wu + w.y * (1 - vw - wu) + offset;
}
