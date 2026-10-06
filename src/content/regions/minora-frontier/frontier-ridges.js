/** East Suval's exposed land border: limestone ridges and two barred hill passes.
 * The north-western army road already has FRONTIER_CIRCUIT. The remaining
 * land edges used to be open grass with only a region-entry refusal. These
 * same authored edges now have visible, solid obstacles. The sea stays open.
 */
import { REGION_OUTLINES, insideRegion, isLandHex } from '../../../world/terrain/region-world.js';

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

const noise = seed => { const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };

/** Four tempting cuts end outside the sealed boundary. Their bends conceal the obstruction
 * until the traveler is close; the same open trail leads back out. No new border crossing. */
export const SUVAL_FALSE_PASSES = freeze([0, 2, 4, 15].map((edgeIndex, i) => {
  const edge = SUVAL_RIDGE_EDGES[edgeIndex], anchor = {
    x: (edge.a.x + edge.b.x) / 2, z: (edge.a.z + edge.b.z) / 2,
    along: edge.along, inward: edge.inward,
  };
  const at = (a, n) => hillPassPoint(anchor, a, n);
  return freeze({ id: `elodi-false-pass-${i}`, edge: edge.id, ...anchor, kind: i % 2 ? 'barred-cut' : 'rockfall',
    route: freeze([at(-11, -43), at(-8, -31), at(5, -22), at(0, -12)]),
    end: at(0, -8.5), width: 2.7, closed: true,
  });
}));

/** Outer ravine shoulders. Leave a real 3m corridor, including its tight bends. */
export const SUVAL_FALSE_PASS_ROCKS = freeze(SUVAL_FALSE_PASSES.flatMap((pass, p) =>
  pass.route.flatMap((node, k) => [-1, 1].map(side => {
    const next = pass.route[Math.min(k + 1, pass.route.length - 1)], prev = pass.route[Math.max(0, k - 1)];
    const dx = next.x - prev.x, dz = next.z - prev.z, l = Math.hypot(dx, dz);
    return freeze({ x: node.x - dz / l * side * 7, z: node.z + dx / l * side * 7,
      radius: 2.7, height: 4.8 + noise(p * 53 + k * 11 + side) * 8, yaw: Math.atan2(dx, dz),
      edge: pass.edge, pass: pass.id, tint: (p + k) % 4 });
  })).filter(rock => pass.route.every((to, j) => {
    if (!j) return true;
    const from = pass.route[j - 1], dx = to.x - from.x, dz = to.z - from.z;
    const t = Math.max(0, Math.min(1, ((rock.x - from.x) * dx + (rock.z - from.z) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(rock.x - from.x - t * dx, rock.z - from.z - t * dz) > rock.radius + 2.2;
  }))));

/** Rock centres overlap their neighbours, including at the atlas's corners. Coherent height
 * changes form broad shoulders, broken needles and lower saddles instead of identical beads. */
export const SUVAL_RIDGE_ROCKS = freeze(SUVAL_RIDGE_EDGES.flatMap((edge, index) => {
  const count = Math.ceil(edge.length / 4.5), gate = SUVAL_HILL_PASSES.find(pass => pass.edge === edge.id);
  return Array.from({ length: count + 1 }, (_, k) => {
    const along = edge.length * k / count;
    if (gate && Math.abs(along - edge.length / 2) < gate.wing + 3.5) return null;
    // Keep the known smugglers' door face at its established width and footing.
    const door = edge.id === 'elodi-ridge-26' && Math.abs(along - edge.length / 2) < 13;
    const seed = index * 79 + k * 13, bend = door ? 0 : (noise(seed) - .5) * 2.3;
    const radius = door ? 5.4 : 4.9 + noise(seed + 5) * 1.9;
    const shoulder = .5 + .5 * Math.sin(index * 1.72 + along * .083);
    return freeze({ x: edge.a.x + edge.along.x * along + edge.inward.x * bend,
      z: edge.a.z + edge.along.z * along + edge.inward.z * bend,
      radius, height: 7.5 + shoulder * 12 + noise(seed + 17) * 5.5,
      yaw: Math.atan2(edge.along.x, edge.along.z) + (noise(seed + 19) - .5) * .7,
      edge: edge.id, tint: Math.floor(noise(seed + 23) * 4), shape: Math.floor(noise(seed + 31) * 3), door });
  }).filter(Boolean);
}));

/** Geometry and collision share their plan, so jumping or riding cannot bypass a visible lock. */
export const SUVAL_RIDGE_COLLIDERS = freeze([
  ...SUVAL_RIDGE_ROCKS.map(rock => freeze({ x: rock.x, z: rock.z, r: rock.radius, kind: 'elodi-frontier-ridge' })),
  ...SUVAL_FALSE_PASS_ROCKS.map(rock => freeze({ x: rock.x, z: rock.z, r: rock.radius, kind: 'elodi-ravine-shoulder' })),
  ...SUVAL_FALSE_PASSES.flatMap(pass => Array.from({ length: 25 }, (_, i) => freeze({
    ...hillPassPoint(pass, -6 + i * .5, -8.5), r: .9,
    kind: pass.kind === 'rockfall' ? 'elodi-false-pass-rockfall' : 'elodi-false-pass-barred',
  }))),
  ...SUVAL_HILL_PASSES.flatMap(gate => Array.from({ length: 65 }, (_, i) => {
    const along = -gate.wing + i * .5;
    return freeze({ ...hillPassPoint(gate, along), r: 1.0,
      kind: Math.abs(along) <= gate.halfWidth ? 'elodi-hill-gate-locked' : 'elodi-hill-pass-wall' });
  })),
]);

/** Reserve the entire approach from ordinary trees/rocks so it is a usable dead end. */
export function suvalFalsePassClear(x, z, margin = 0) {
  return SUVAL_FALSE_PASSES.some(pass => pass.route.some((to, i) => {
    if (!i) return false;
    const from = pass.route[i - 1], dx = to.x - from.x, dz = to.z - from.z;
    const t = Math.max(0, Math.min(1, ((x - from.x) * dx + (z - from.z) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(x - from.x - dx * t, z - from.z - dz * t) < 3.2 + margin;
  }));
}
