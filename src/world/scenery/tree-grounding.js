/** Seat a trunk on the surface that is actually drawn, including its lean and
 * sloping footprint. Moving the entire tree by this offset preserves its shape.
 * `matrix` maps the unit cylinder to its parent; `toWorld` converts that parent's
 * horizontal frame (Tidehaven is rotated) without changing its vertical axis.
 */
export function treeGroundingOffset(matrix, groundAt, { radius = .38, segments = 7,
  toWorld = (x, z) => ({ x, z }), embed = .03 } = {}) {
  const e = matrix.elements ?? matrix;
  let offset = Infinity;
  for (let i = 0; i <= segments; i++) {
    const angle = i * Math.PI * 2 / segments;
    const x = i === segments ? 0 : Math.sin(angle) * radius;
    const z = i === segments ? 0 : Math.cos(angle) * radius;
    const px = e[0] * x - e[4] * .5 + e[8] * z + e[12];
    const py = e[1] * x - e[5] * .5 + e[9] * z + e[13];
    const pz = e[2] * x - e[6] * .5 + e[10] * z + e[14];
    const world = toWorld(px, pz);
    offset = Math.min(offset, groundAt(world.x, world.z) - py);
  }
  return offset - embed;
}
