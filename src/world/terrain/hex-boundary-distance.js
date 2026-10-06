import { METRES_PER_HEX } from './region-layout.js';

/** Exact distance to an authored hex union, with a fixed candidate list per cell.
 * Distance to an edge changes by at most the distance moved. Inside one hex,
 * an edge farther than nearest + 2 * circumradius from its centre cannot win.
 * Keep original edge order and the caller's distance arithmetic unchanged.
 */
export function createHexBoundaryDistance({ cells, edges, cellAt, distanceToEdge }) {
  const candidates = new Map(), diameter = 2 * METRES_PER_HEX / Math.sqrt(3) + 1e-6;
  for (const cell of cells) {
    const distances = edges.map(edge => distanceToEdge(cell.x, cell.z, edge));
    const reach = Math.min(...distances) + diameter;
    candidates.set(cell, edges.filter((edge, i) => distances[i] <= reach));
  }
  // Refinement asks for the inset immediately before asking for the same height.
  // One scalar sample avoids that duplicate scan without retaining visited points.
  let lastX = NaN, lastZ = NaN, lastDistance = 0;
  return (x, z) => {
    if (x === lastX && z === lastZ) return lastDistance;
    const cell = cellAt(x, z);
    let nearest = cell ? Infinity : 0;
    if (cell) for (const edge of candidates.get(cell)) nearest = Math.min(nearest, distanceToEdge(x, z, edge));
    lastX = x; lastZ = z; lastDistance = nearest;
    return nearest;
  };
}
