const WATER = new Set(['river-water', 'pond-water']);
const CONTACT_EPSILON = .001;

function overlapsFootprint(c, x, z, radius) {
  if (!Number.isFinite(c.x) || !Number.isFinite(c.z)) return false;
  if (Number.isFinite(c.r)) return Math.hypot(x - c.x, z - c.z) < radius + c.r;
  if (!Number.isFinite(c.hx) || !Number.isFinite(c.hz)) return false;
  const dx = Math.max(0, Math.abs(x - c.x) - c.hx);
  const dz = Math.max(0, Math.abs(z - c.z) - c.hz);
  return dx * dx + dz * dz < radius * radius;
}

/** Sweep a body's feet/head against bounded solids at its accepted X/Z position.
 * Horizontal motion remains with locomotion; unbounded legacy walls are handled
 * there. `floor` is the caller's terrain, walk-surface or swimming support height.
 * No scene objects or collision records are mutated.
 */
export function resolveVerticalMotion(world, {
  x, z, radius = .34, bodyHeight = 1.75, fromY, toY, velocity, floor,
}) {
  const near = world.nearColliders?.(x, z, radius) ?? world.colliders ?? [];
  const descending = toY <= fromY;
  let support = Number.isFinite(floor) ? floor : -Infinity;
  let ceiling = Infinity;
  for (const c of near) {
    if (WATER.has(c.kind) || !overlapsFootprint(c, x, z, radius)) continue;
    if (descending && Number.isFinite(c.maxY) && c.maxY <= fromY + CONTACT_EPSILON
      && c.maxY >= toY - CONTACT_EPSILON) support = Math.max(support, c.maxY);
    if (!descending && Number.isFinite(c.minY) && fromY + bodyHeight <= c.minY + CONTACT_EPSILON
      && toY + bodyHeight >= c.minY - CONTACT_EPSILON) ceiling = Math.min(ceiling, c.minY - bodyHeight);
  }
  if (descending && toY <= support + CONTACT_EPSILON) return { y: support, velocity: 0, grounded: true };
  if (Number.isFinite(ceiling)) return { y: Math.max(support, ceiling), velocity: 0, grounded: ceiling <= support + CONTACT_EPSILON };
  // Recover contact with rising terrain without throwing away an upward jump.
  return { y: Math.max(support, toY), velocity, grounded: velocity <= 0 && toY <= support + CONTACT_EPSILON };
}
