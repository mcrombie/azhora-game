/** Territorial geometry only: no damage, walls, actors, terrain or save state.
 * The Central-derived inner belt is Elfland's border. The pilot's separate
 * protected-tree circle is a local harvesting rule, not a second country.
 */
import { REGION_CELLS, hexOwnerAt } from '../../../world/terrain/region-world.js';
import { IBENWOOD_NAMES, IBENWOOD_PILOT, IBENWOOD_ARRIVALS, IBENWOOD_PATHS, ibenwoodProtected } from './ibenwood-environment.js';

const freeze = Object.freeze, GRID = 10, SIGN_DEPTH = -10, POST_DEPTH = 12;
const central = REGION_CELLS['Central Ibenwood'], cells = IBENWOOD_NAMES.flatMap(name => REGION_CELLS[name]);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const point = (x, z) => ({ x, z });

// Only the pilot-circle override must be removed. Reconstruct its underlying
// 20m bilinear atlas distance field exactly; everywhere else use the existing
// tree-protection predicate directly, so the defended belt cannot drift from it.
const pilotField = new Map();
function fieldCorner(ix, iz) {
  const key = `${ix},${iz}`;
  if (!pilotField.has(key)) pilotField.set(key, Math.max(0, Math.min(...central.map(c => Math.hypot(ix * 20 - c.x, iz * 20 - c.z))) - 57.735));
  return pilotField.get(key);
}
export function ibenwoodTerritoryAt(x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  if (Math.hypot(x - IBENWOOD_PILOT.x, z - IBENWOOD_PILOT.z) >= 88) return ibenwoodProtected(x, z);
  const owner = hexOwnerAt(x, z);
  if (owner === 'Central Ibenwood') return true;
  if (!IBENWOOD_NAMES.includes(owner)) return false;
  const ix = Math.floor(x / 20), iz = Math.floor(z / 20), tx = x / 20 - ix, tz = z / 20 - iz;
  const d = (fieldCorner(ix, iz) * (1 - tx) + fieldCorner(ix + 1, iz) * tx) * (1 - tz)
    + (fieldCorner(ix, iz + 1) * (1 - tx) + fieldCorner(ix + 1, iz + 1) * tx) * tz;
  return d < 135 + 24 * Math.sin(x / 117) + 19 * Math.cos(z / 93) + 12 * Math.sin((x + z) / 61);
}

const box = freeze({ minX: Math.floor((Math.min(...cells.map(c => c.x)) - 80) / GRID) * GRID,
  maxX: Math.ceil((Math.max(...cells.map(c => c.x)) + 80) / GRID) * GRID,
  minZ: Math.floor((Math.min(...cells.map(c => c.z)) - 80) / GRID) * GRID,
  maxZ: Math.ceil((Math.max(...cells.map(c => c.z)) + 80) / GRID) * GRID });

function traceContours() {
  const nodes = [], columns = Math.round((box.maxX - box.minX) / GRID) + 1, rows = Math.round((box.maxZ - box.minZ) / GRID) + 1;
  for (let iz = 0; iz < rows; iz++) for (let ix = 0; ix < columns; ix++) {
    const x = box.minX + ix * GRID, z = box.minZ + iz * GRID;
    nodes.push({ x, z, inside: ibenwoodTerritoryAt(x, z) });
  }
  const crossings = new Map(), neighbors = new Map();
  function crossing(ia, ib) {
    const key = ia < ib ? `${ia}:${ib}` : `${ib}:${ia}`;
    if (!crossings.has(key)) {
      let a = nodes[ia], b = nodes[ib];
      for (let i = 0; i < 16; i++) {
        const mid = point((a.x + b.x) / 2, (a.z + b.z) / 2);
        if (ibenwoodTerritoryAt(mid.x, mid.z) === a.inside) a = { ...mid, inside: a.inside }; else b = mid;
      }
      crossings.set(key, point((a.x + b.x) / 2, (a.z + b.z) / 2));
    }
    return key;
  }
  function triangle(ids) {
    const ends = [];
    for (let i = 0; i < 3; i++) {
      const a = ids[i], b = ids[(i + 1) % 3];
      if (nodes[a].inside !== nodes[b].inside) ends.push(crossing(a, b));
    }
    if (ends.length !== 2) return;
    for (const [a, b] of [ends, [...ends].reverse()]) {
      if (!neighbors.has(a)) neighbors.set(a, []);
      neighbors.get(a).push(b);
    }
  }
  // Fixed triangle diagonals resolve marching-square saddles consistently.
  for (let iz = 0; iz < rows - 1; iz++) for (let ix = 0; ix < columns - 1; ix++) {
    const a = iz * columns + ix, b = a + 1, c = b + columns, d = a + columns;
    triangle([a, b, c]); triangle([a, c, d]);
  }
  const seen = new Set(), loops = [];
  const starts = [...crossings.keys()].sort((a, b) => crossings.get(a).x - crossings.get(b).x || crossings.get(a).z - crossings.get(b).z);
  for (const start of starts) {
    if (seen.has(start)) continue;
    const loop = []; let at = start, before = null;
    do {
      if (seen.has(at) || neighbors.get(at)?.length !== 2) throw new Error('Ibenwood territorial contour is not closed.');
      seen.add(at); loop.push(crossings.get(at));
      const next = neighbors.get(at).find(key => key !== before); before = at; at = next;
    } while (at !== start);
    if (loop.length >= 3) loops.push(loop);
  }
  const area = loop => Math.abs(loop.reduce((sum, p, i) => {
    const next = loop[(i + 1) % loop.length]; return sum + p.x * next.z - p.z * next.x;
  }, 0));
  return loops.sort((a, b) => area(b) - area(a));
}

const contours = traceContours();
const segments = contours.flatMap((loop, contour) => loop.map((a, index) => {
  const b = loop[(index + 1) % loop.length], dx = b.x - a.x, dz = b.z - a.z;
  return { a, b, dx, dz, length2: dx * dx + dz * dz, contour, index };
}));
function nearestBoundary(x, z) {
  let best = null, d2 = Infinity;
  for (const segment of segments) {
    const t = clamp(((x - segment.a.x) * segment.dx + (z - segment.a.z) * segment.dz) / (segment.length2 || 1), 0, 1);
    const px = segment.a.x + segment.dx * t, pz = segment.a.z + segment.dz * t, next = (px - x) ** 2 + (pz - z) ** 2;
    if (next < d2) { d2 = next; best = { x: px, z: pz, distance: Math.sqrt(next), segment }; }
  }
  return best;
}
/** Signed metres from the sampled territorial contour; inside is positive.
 * This is observation only. Crossing it must not itself inflict damage.
 */
export function boundaryDepth(x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return -Infinity;
  const nearest = nearestBoundary(x, z);
  return nearest ? nearest.distance * (ibenwoodTerritoryAt(x, z) ? 1 : -1) : -Infinity;
}

const measured = contours.map((points, index) => {
  const lengths = points.map((p, i) => distance(p, points[(i + 1) % points.length]));
  return { points, index, lengths, length: lengths.reduce((a, b) => a + b, 0) };
});
function atDistance(loop, along) {
  along = ((along % loop.length) + loop.length) % loop.length;
  for (let i = 0; i < loop.points.length; i++) {
    if (along <= loop.lengths[i] || i === loop.points.length - 1) {
      const a = loop.points[i], b = loop.points[(i + 1) % loop.points.length], t = along / (loop.lengths[i] || 1);
      return point(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t);
    }
    along -= loop.lengths[i];
  }
}
function normalAt(p, tangent) {
  const length = Math.hypot(tangent.x, tangent.z) || 1;
  let nx = -tangent.z / length, nz = tangent.x / length;
  if (!ibenwoodTerritoryAt(p.x + nx, p.z + nz)) { nx = -nx; nz = -nz; }
  if (ibenwoodTerritoryAt(p.x + nx, p.z + nz) && !ibenwoodTerritoryAt(p.x - nx, p.z - nz)) return { nx, nz };
  // Atlas-border corners can be sharper than the 10m sampling interval.
  for (let i = 0; i < 32; i++) {
    const angle = i * Math.PI / 16, x = Math.cos(angle), z = Math.sin(angle);
    if (ibenwoodTerritoryAt(p.x + x * 2, p.z + z * 2) && !ibenwoodTerritoryAt(p.x - x * 2, p.z - z * 2)) return { nx: x, nz: z };
  }
  return { nx, nz };
}
function anchorAt(loop, along) {
  const p = atDistance(loop, along), before = atDistance(loop, along - 2), after = atDistance(loop, along + 2);
  return { ...p, ...normalAt(p, point(after.x - before.x, after.z - before.z)), contour: loop.index, along };
}
function offset(anchor, depth, direction = null) {
  const sign = Math.sign(depth), dx = direction?.x ?? anchor.nx * sign, dz = direction?.z ?? anchor.nz * sign;
  let lo = 0, hi = Math.abs(depth);
  const depthAt = d => boundaryDepth(anchor.x + dx * d, anchor.z + dz * d) * sign;
  while (hi < 100 && depthAt(hi) < Math.abs(depth)) hi += 2;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    if (depthAt(mid) < Math.abs(depth)) lo = mid; else hi = mid;
  }
  return point(anchor.x + dx * hi, anchor.z + dz * hi);
}

const markers = measured.flatMap(loop => {
  const count = Math.ceil(loop.length / 25);
  return Array.from({ length: count }, (_, i) => {
    const anchor = anchorAt(loop, loop.length * i / count);
    return { id: `ibenwood-warning-${loop.index}-${i}`, ...offset(anchor, SIGN_DEPTH), nx: anchor.nx, nz: anchor.nz,
      boundary: point(anchor.x, anchor.z), kind: 'perimeter' };
  });
});
const perimeter = measured.reduce((sum, loop) => sum + loop.length, 0);
const rangerPosts = measured.flatMap(loop => {
  const count = Math.max(1, Math.round(Math.min(90, Math.ceil(perimeter / 36)) * loop.length / perimeter));
  return Array.from({ length: count }, (_, i) => {
    const along = loop.length * (i + .5) / count, anchor = anchorAt(loop, along), p = offset(anchor, POST_DEPTH);
    let span = 10, patrol;
    do {
      patrol = [offset(anchorAt(loop, along - span), POST_DEPTH), p, offset(anchorAt(loop, along + span), POST_DEPTH)];
      span /= 2;
    } while (span > .3 && patrol.some((a, k) => k && Array.from({ length: 9 }, (_, j) => {
      const b = patrol[k - 1], t = j / 8; return !ibenwoodTerritoryAt(a.x * t + b.x * (1 - t), a.z * t + b.z * (1 - t));
    }).some(Boolean)));
    return { id: `ibenwood-ranger-post-${loop.index}-${i}`, ...p, nx: anchor.nx, nz: anchor.nz,
      yaw: Math.atan2(-anchor.nx, -anchor.nz), patrol, sight: 44, boundary: point(anchor.x, anchor.z) };
  });
});

const crossings = [];
for (const path of IBENWOOD_PATHS) for (let i = 1; i < path.points.length; i++) {
  const a = path.points[i - 1], b = path.points[i], dx = b.x - a.x, dz = b.z - a.z;
  for (const segment of segments) {
    const det = dx * segment.dz - dz * segment.dx;
    if (Math.abs(det) < 1e-9) continue;
    const cx = segment.a.x - a.x, cz = segment.a.z - a.z;
    const t = (cx * segment.dz - cz * segment.dx) / det, u = (cx * dz - cz * dx) / det;
    if (t < 0 || t > 1 || u < 0 || u > 1) continue;
    const p = point(a.x + t * dx, a.z + t * dz);
    if (crossings.some(c => c.pathId === path.id && distance(c, p) < 1)) continue;
    const normal = normalAt(p, point(segment.dx, segment.dz)), anchor = { ...p, ...normal };
    const length = Math.hypot(dx, dz), sign = ibenwoodTerritoryAt(p.x + dx / length, p.z + dz / length) ? -1 : 1;
    const warning = offset(anchor, SIGN_DEPTH, point(dx / length * sign, dz / length * sign));
    const id = `ibenwood-crossing-${path.id}-${i}-${crossings.filter(c => c.pathId === path.id).length}`;
    crossings.push({ id, pathId: path.id, ...p, ...normal, warning });
    if (!markers.some(m => distance(m, warning) < 8)) markers.push({ id: `${id}-warning`, ...warning, ...normal, boundary: p, kind: 'path' });
  }
}

const approaches = Object.entries(IBENWOOD_ARRIVALS).filter(([region]) => region !== 'Central Ibenwood').map(([region, arrival]) => {
  const candidates = measured.flatMap(loop => Array.from({ length: Math.ceil(loop.length / GRID) }, (_, i) => anchorAt(loop, i * GRID)))
    .filter(p => hexOwnerAt(p.x, p.z) === region);
  const anchor = candidates.sort((a, b) => distance(a, arrival) - distance(b, arrival))[0];
  if (!anchor) throw new Error(`No defended Ibenwood approach in ${region}.`);
  const inside = offset(anchor, POST_DEPTH);
  const post = [...rangerPosts].sort((a, b) => distance(a, inside) - distance(b, inside))[0];
  return { id: `ibenwood-approach-${region.split(' ')[0].toLowerCase()}`, region, nx: anchor.nx, nz: anchor.nz,
    boundary: point(anchor.x, anchor.z), outside: offset(anchor, -22), warning: offset(anchor, SIGN_DEPTH), inside,
    deep: offset(anchor, 35), postId: post.id };
});
function deeplyFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { for (const item of Object.values(value)) deeplyFreeze(item); freeze(value); }
  return value;
}
export const IBENWOOD_BOUNDARY = deeplyFreeze({ sampleSpacing: GRID, markerSpacing: 25, warningDepth: SIGN_DEPTH,
  postDepth: POST_DEPTH, sightRange: 44, bounds: box, perimeter, contours, markers, rangerPosts, crossings, approaches,
  pilot: { ...IBENWOOD_PILOT, depth: boundaryDepth(IBENWOOD_PILOT.x, IBENWOOD_PILOT.z),
    treeProtected: ibenwoodProtected(IBENWOOD_PILOT.x, IBENWOOD_PILOT.z), territorial: ibenwoodTerritoryAt(IBENWOOD_PILOT.x, IBENWOOD_PILOT.z) } });
