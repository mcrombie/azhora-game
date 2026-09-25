/** East Suval's exposed land border: limestone ridges and two barred hill passes.
 * The north-western army road already has FRONTIER_CIRCUIT. The remaining
 * land edges used to be open grass with only a region-entry refusal. These
 * same authored edges now have visible, solid obstacles. The sea stays open.
 */
import { REGION_OUTLINES, insideRegion, isLandHex } from './region-world.js';

const freeze = Object.freeze;
const point = (x, z) => freeze({ x, z });
export const SUVAL_RIDGE_EDGES = freeze(REGION_OUTLINES['East Suval'][0].flatMap((a, i, loop) => {
  const b = loop[(i + 1) % loop.length], length = Math.hypot(b.x - a.x, b.z - a.z);
  const along = point((b.x - a.x) / length, (b.z - a.z) / length);
  let nx = -along.z, nz = along.x;
  const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
  if (!insideRegion('East Suval', mx + nx * 3, mz + nz * 3)) { nx = -nx; nz = -nz; }
  const ox = mx - nx * 3, oz = mz - nz * 3;
  if (!isLandHex(ox, oz) || insideRegion('Luscia', ox, oz)) return [];
  return [freeze({ id: `elodi-ridge-${i}`, a, b, length, along, inward: point(nx, nz) })];
}));

const nearestEdge = (x, z) => [...SUVAL_RIDGE_EDGES].sort((a, b) =>
  Math.hypot((a.a.x + a.b.x) / 2 - x, (a.a.z + a.b.z) / 2 - z)
  - Math.hypot((b.a.x + b.b.x) / 2 - x, (b.a.z + b.b.z) / 2 - z))[0];
const pass = (id, name, x, z) => {
  const edge = nearestEdge(x, z);
  return freeze({ id, name, edge: edge.id, x: (edge.a.x + edge.b.x) / 2, z: (edge.a.z + edge.b.z) / 2,
    along: edge.along, inward: edge.inward, halfWidth: 3, wing: 16, locked: true });
};
export const SUVAL_HILL_PASSES = freeze([
  pass('elodi-west-pass', 'Elod western hill gate', -350, 722),
  pass('elodi-south-pass', 'Elod southern hill gate', -125, 1025),
]);
export const hillPassPoint = (gate, along = 0, inward = 0) => point(
  gate.x + gate.along.x * along + gate.inward.x * inward,
  gate.z + gate.along.z * along + gate.inward.z * inward);

/** Only the requested military exception: ordinary soldiers, no new civilians. */
export const SUVAL_HILL_GUARDS = freeze(SUVAL_HILL_PASSES.flatMap(gate => [-1, 1].map(side => freeze({
  id: `${gate.id}-guard-${side < 0 ? 'a' : 'b'}`, ...hillPassPoint(gate, side * 3.7, -6),
  yaw: Math.atan2(-gate.inward.x, -gate.inward.z), gate: gate.id,
}))));

/** Rock centres overlap their neighbours, including at the atlas's corners. */
export const SUVAL_RIDGE_ROCKS = freeze(SUVAL_RIDGE_EDGES.flatMap((edge, index) => {
  const count = Math.ceil(edge.length / 4.5), gate = SUVAL_HILL_PASSES.find(pass => pass.edge === edge.id);
  return Array.from({ length: count + 1 }, (_, k) => {
    const along = edge.length * k / count;
    if (gate && Math.abs(along - edge.length / 2) < gate.wing + 3.5) return null;
    return freeze({ x: edge.a.x + edge.along.x * along, z: edge.a.z + edge.along.z * along,
      radius: 5.4, height: 10.5 + ((index * 7 + k * 3) % 7), yaw: Math.atan2(edge.along.x, edge.along.z),
      edge: edge.id, tint: (index + k) % 3 });
  }).filter(Boolean);
}));

/** Geometry and collision share their plan, so jumping or riding cannot bypass a visible lock. */
export const SUVAL_RIDGE_COLLIDERS = freeze([
  ...SUVAL_RIDGE_ROCKS.map(rock => freeze({ x: rock.x, z: rock.z, r: rock.radius, kind: 'elodi-frontier-ridge' })),
  ...SUVAL_HILL_PASSES.flatMap(gate => Array.from({ length: 65 }, (_, i) => {
    const along = -gate.wing + i * .5;
    return freeze({ ...hillPassPoint(gate, along), r: 1.0,
      kind: Math.abs(along) <= gate.halfWidth ? 'elodi-hill-gate-locked' : 'elodi-hill-pass-wall' });
  })),
]);
