/** Swept outdoor cover queries. Coordinates and vertical bounds are world-space.
 * Trees use their registered height; old trees without one reach 24 m. Other
 * unbounded legacy colliders remain solid above their base. Water is not cover.
 * Rotated boxes use Three.js Y rotation (angle/yaw/rotationY), local width/depth
 * when supplied, otherwise local hx/hz. Their broadphase must enclose that shape.
 */
const EPS = 1e-9, QUERY_SPAN = 8, TERRAIN_STEP = .2;
const waterKinds = new Set(['water', 'river-water', 'pond-water', 'lake-water', 'sea-water', 'ocean-water']);
const validPoint = p => p && [p.x, p.y, p.z].every(Number.isFinite);

function clip(range, start, delta, low, high) {
  if (Math.abs(delta) < EPS) return start >= low - EPS && start <= high + EPS;
  let a = (low - start) / delta, b = (high - start) / delta;
  if (a > b) [a, b] = [b, a];
  range[0] = Math.max(range[0], a); range[1] = Math.min(range[1], b);
  return range[0] <= range[1] + EPS;
}

function circle(range, x, z, dx, dz, radius) {
  const a = dx * dx + dz * dz, c = x * x + z * z - radius * radius;
  if (a < EPS * EPS) return c <= EPS;
  const b = x * dx + z * dz, discriminant = b * b - a * c;
  if (discriminant < -EPS) return false;
  const root = Math.sqrt(Math.max(0, discriminant));
  range[0] = Math.max(range[0], (-b - root) / a);
  range[1] = Math.min(range[1], (-b + root) / a);
  return range[0] <= range[1] + EPS;
}

// A rounded rectangle is two strips plus its four circular corners. This avoids
// treating a long narrow wall as its enclosing circle, or inventing square corners
// when a projectile radius merely grazes the wall.
function roundedBoxEntry(range, x, z, dx, dz, hx, hz, radius) {
  let first = Infinity;
  for (const [ex, ez] of [[hx, hz + radius], [hx + radius, hz]]) {
    const span = [...range];
    if (clip(span, x, dx, -ex, ex) && clip(span, z, dz, -ez, ez)) first = Math.min(first, span[0]);
  }
  if (radius) for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const span = [...range];
    if (circle(span, x - sx * hx, z - sz * hz, dx, dz, radius)) first = Math.min(first, span[0]);
  }
  return first;
}

function colliderEntry(world, c, from, delta, radius, ground) {
  if (!c || c.active === false || c.disabled === true || waterKinds.has(c.kind)
    || !Number.isFinite(c.x) || !Number.isFinite(c.z)) return Infinity;
  const range = [0, 1], x = from.x - c.x, z = from.z - c.z;
  let lx = x, lz = z, dx = delta.x, dz = delta.z, hx, hz;
  if (Number.isFinite(c.r) && c.r >= 0) {
    if (!circle(range, x, z, dx, dz, c.r + radius)) return Infinity;
  } else {
    hx = Number.isFinite(c.width) ? c.width / 2 : c.hx;
    hz = Number.isFinite(c.depth) ? c.depth / 2 : c.hz;
    if (![hx, hz].every(n => Number.isFinite(n) && n >= 0)) return Infinity;
    const angle = c.angle ?? c.yaw ?? c.rotationY ?? 0, co = Math.cos(angle), si = Math.sin(angle);
    if (!Number.isFinite(co)) return Infinity;
    // Inverse of THREE's Y-axis rotation: local X = world X cos - world Z sin.
    lx = x * co - z * si; lz = x * si + z * co;
    dx = delta.x * co - delta.z * si; dz = delta.x * si + delta.z * co;
    if (!clip(range, lx, dx, -hx - radius, hx + radius)
      || !clip(range, lz, dz, -hz - radius, hz + radius)) return Infinity;
  }
  const tree = world?.treeRegistry?.get?.(c.id) ?? null;
  const isTree = !!tree || c.kind === 'tree';
  const base = Number.isFinite(c.minY) ? c.minY : [c.base?.y, c.y, tree?.base?.y, tree?.y]
    .find(Number.isFinite) ?? ground(c.x, c.z);
  const height = [c.height, tree?.height].find(n => Number.isFinite(n) && n >= 0);
  const top = Number.isFinite(c.maxY) ? c.maxY : Number.isFinite(height) ? base + height
    : isTree ? base + 24 : Infinity;
  if (top < base || !clip(range, from.y, delta.y, base - radius, top + radius)) return Infinity;
  return c.r !== undefined ? range[0] : roundedBoxEntry(range, lx, lz, dx, dz, hx, hz, radius);
}

function floorEntry(surface, from, delta, radius) {
  const { a, b, width } = surface;
  if (!validPoint(a) || !validPoint(b) || !(width > 0)) return Infinity;
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  if (length < EPS) return Infinity;
  const ux = (b.x - a.x) / length, uz = (b.z - a.z) / length, grade = (b.y - a.y) / length;
  const along = (from.x - a.x) * ux + (from.z - a.z) * uz, across = -(from.x - a.x) * uz + (from.z - a.z) * ux;
  const da = delta.x * ux + delta.z * uz, dc = -delta.x * uz + delta.z * ux;
  const thickness = Number.isFinite(surface.thickness) ? Math.max(0, surface.thickness) : .26, range = [0, 1];
  if (!clip(range, along, da, -radius, length + radius)
    || !clip(range, across, dc, -width / 2 - radius, width / 2 + radius)
    || !clip(range, from.y - a.y - along * grade, delta.y - da * grade, -thickness - radius, radius)) return Infinity;
  return range[0];
}

/** First contact of a finite XYZ segment, including its start and end. A caller
 * must omit the shooter's own body from world colliders. Thin cover is swept
 * analytically; terrain is sampled every 20 cm then contact is bisected. Canopy
 * floors are thin slabs, so an arrow can pass underneath rather than hitting an
 * infinitely tall column. The returned point is the projectile center at contact.
 */
export function forestSegmentHit(world, from, to, { radius = .08 } = {}) {
  if (!validPoint(from) || !validPoint(to) || !Number.isFinite(radius) || radius < 0)
    throw new TypeError('Forest rays require finite XYZ endpoints and a nonnegative radius');
  const delta = { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z };
  const horizontal = Math.hypot(delta.x, delta.z), rawGround = world?.groundHeight ?? world?.heightAt;
  const ground = (x, z) => { const y = rawGround?.call(world, x, z) ?? 0; return Number.isFinite(y) ? y : -Infinity; };
  let best = null, first = Infinity;
  const accept = (t, kind, collider) => {
    if (t >= -EPS && t <= 1 + EPS && t < first) {
      first = Math.max(0, Math.min(1, t)); best = { kind, collider };
    }
  };
  const seen = new Set(), scratch = [];
  const inspect = c => {
    if (seen.has(c)) return;
    seen.add(c); accept(colliderEntry(world, c, from, delta, radius, ground), c?.kind ?? 'solid', c);
  };
  if (world?.nearColliders) {
    // Short local queries avoid collecting the whole forest inside a long ray's
    // enclosing square. Duplicates from adjacent grid cells are tested only once.
    const count = Math.max(1, Math.ceil(horizontal / QUERY_SPAN));
    for (let i = 0; i < count && i / count <= first; i++) {
      const t = (i + .5) / count;
      for (const c of world.nearColliders(from.x + delta.x * t, from.z + delta.z * t, horizontal / count / 2 + radius, scratch) ?? scratch) inspect(c);
    }
  } else for (const c of world?.colliders ?? []) inspect(c);
  for (const surface of world?.walkSurfaces ?? []) accept(floorEntry(surface, from, delta, radius), 'walk-surface', surface);

  const clearance = t => {
    const x = from.x + delta.x * t, z = from.z + delta.z * t;
    // Account for the projectile's width at a bank as well as its lowest point.
    let y = ground(x, z);
    if (radius) y = Math.max(y, ground(x - radius, z), ground(x + radius, z), ground(x, z - radius), ground(x, z + radius));
    return from.y + delta.y * t - radius - y;
  };
  const stop = Math.min(1, first), samples = Math.max(1, Math.ceil(horizontal * stop / TERRAIN_STEP));
  if (clearance(0) <= EPS) accept(0, 'terrain', null);
  else for (let i = 1; i <= samples; i++) {
    let high = stop * i / samples;
    if (clearance(high) > EPS) continue;
    let low = stop * (i - 1) / samples;
    for (let j = 0; j < 18; j++) { const mid = (low + high) / 2; if (clearance(mid) <= EPS) high = mid; else low = mid; }
    accept(high, 'terrain', null); break;
  }
  return best ? { x: from.x + delta.x * first, y: from.y + delta.y * first, z: from.z + delta.z * first, t: first, ...best } : null;
}

export const forestLineClear = (world, from, to, options) => forestSegmentHit(world, from, to, options) === null;
