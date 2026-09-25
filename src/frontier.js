/**
 * Elod's closed frontier with Luscia.
 *
 * Elod has shut its whole country to stay out of the war, and this border, the
 * one the armies of the Lauvel valley can reach, is the one it watches hardest.
 * Where the branch road from the Lauvel reaches East Suval stands a frontier
 * work in grey stone: a gatehouse with its gate shut between two towers, a wall
 * and ditch running out along the whole Luscian border from the hills to the
 * sea, and behind it a watch platform, a signal beacon, a guard house and a
 * stable. Limestone ridges and locked hill passes join it along the rest of
 * the region's land border, watched from the pickets' posts.
 *
 * The walls and ridges are solid; `closed-border.js` also keeps the region
 * closed to entry. Pure: no three, no DOM.
 */
import { SUVAL_ROAD, REGION_OUTLINES, insideRegion, isLandHex } from './region-world.js';
import { fortCircuit } from './fortification.js';
import { SUVAL_HILL_PASSES } from './frontier-ridges.js';

/** The first point of the branch road inside East Suval, found by walking it. */
function roadCrossing() {
  for (let i = 1; i < SUVAL_ROAD.length; i++) {
    const a = SUVAL_ROAD[i - 1], b = SUVAL_ROAD[i], length = Math.hypot(b.x - a.x, b.z - a.z);
    for (let s = 0; s <= length; s += .25) {
      const x = a.x + (b.x - a.x) * s / length, z = a.z + (b.z - a.z) * s / length;
      if (insideRegion('East Suval', x, z)) return Object.freeze({ x, z, segment: i });
    }
  }
  return null;
}
export const BORDER_CROSSING = roadCrossing();

/** The gate stands on the straight leg of the branch road before its last bend. */
const leg = (() => {
  const i = BORDER_CROSSING.segment - 1, a = SUVAL_ROAD[i - 1], b = SUVAL_ROAD[i], length = Math.hypot(b.x - a.x, b.z - a.z);
  return { end: b, dir: { x: (b.x - a.x) / length, z: (b.z - a.z) / length } };
})();
/** The centre of the shut gate, on the road, and the frame it is laid out in: `u` into Elod, `p` along the wall. */
export const FRONTIER_GATE = Object.freeze({
  x: leg.end.x - leg.dir.x * 9, z: leg.end.z - leg.dir.z * 9,
  u: Object.freeze({ ...leg.dir }), p: Object.freeze({ x: leg.dir.z, z: -leg.dir.x }),
});
/** A point `along` the road from the gate (positive into Elod) and `across` it (positive to the north-east). */
export const frontierPoint = (along, across = 0) => Object.freeze({
  x: FRONTIER_GATE.x + FRONTIER_GATE.u.x * along + FRONTIER_GATE.p.x * across,
  z: FRONTIER_GATE.z + FRONTIER_GATE.u.z * along + FRONTIER_GATE.p.z * across,
});

/** The border East Suval shares with Luscia, as a chain of outline vertices from the southern hills to the sea. */
export const LUSCIA_BORDER = (() => {
  const loop = REGION_OUTLINES['East Suval'][0], n = loop.length, shared = [];
  for (let i = 0; i < n; i++) {
    const a = loop[i], b = loop[(i + 1) % n], mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz);
    const probe = sign => ({ x: mx - dz / l * 6 * sign, z: mz + dx / l * 6 * sign });
    if ([1, -1].some(sign => insideRegion('Luscia', probe(sign).x, probe(sign).z))) shared.push(i);
  }
  // The shared edges are consecutive round the loop; start the chain after the gap.
  const start = shared.find(i => !shared.includes((i - 1 + n) % n));
  const chain = [loop[start]];
  for (let k = 0; k < shared.length; k++) chain.push(loop[(start + k + 1) % n]);
  return Object.freeze(chain.map(p => Object.freeze({ x: p.x, z: p.z })));
})();

/** The rest of East Suval's land border, where the pickets' watch posts stand. */
export const PICKET_POSTS = (() => {
  const loop = REGION_OUTLINES['East Suval'][0], n = loop.length, posts = [];
  const sharedStart = loop.findIndex(p => Math.hypot(p.x - LUSCIA_BORDER[0].x, p.z - LUSCIA_BORDER[0].z) < .01);
  // Walk away from the Luscian border round the loop while the outside is dry land.
  let carried = 60;
  for (let k = 0; k < n; k++) {
    const i = (sharedStart - k - 1 + n) % n, a = loop[(i + 1) % n], b = loop[i];
    const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz), mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
    const inward = insideRegion('East Suval', mx - dz / l * 6, mz + dx / l * 6) ? { x: -dz / l, z: dx / l } : { x: dz / l, z: -dx / l };
    if (!isLandHex(mx - inward.x * 30, mz - inward.z * 30)) break;   // the coast: the sea is watched from Elod itself
    for (let s = carried; s < l; s += 118) posts.push(Object.freeze({ x: a.x + dx * s / l + inward.x * 7, z: a.z + dz * s / l + inward.z * 7, yaw: Math.atan2(-inward.x, -inward.z) }));
    carried = (carried - l) % 118; if (carried < 0) carried += 118;
  }
  return Object.freeze(posts);
})();

/**
 * The frontier wall, from the southern end of the Luscian border round in front
 * of the road to the shore. Each run is set back into Luscia from the border
 * and closes on the border at both ends, so the ground behind it is shut in.
 */
const G = FRONTIER_GATE;
const back = (point, distance) => {
  // Toward Luscia: the side of the border away from East Suval.
  for (const sign of [1, -1]) {
    const test = { x: point.x + sign * distance, z: point.z };
    if (!insideRegion('East Suval', test.x, test.z)) return test;
  }
  return point;
};
const [P0, P1, P2, P3, P4] = LUSCIA_BORDER;
const line = (a, d, t) => ({ x: a.x + d.x * t, z: a.z + d.z * t });
const dirOf = (a, b) => { const l = Math.hypot(b.x - a.x, b.z - a.z); return { x: (b.x - a.x) / l, z: (b.z - a.z) / l }; };
const offsetTowardLuscia = (a, b, distance) => {
  const d = dirOf(a, b), n1 = { x: d.z, z: -d.x }, mid = { x: (a.x + b.x) / 2 + n1.x * 6, z: (a.z + b.z) / 2 + n1.z * 6 };
  const n = insideRegion('East Suval', mid.x, mid.z) ? { x: -n1.x, z: -n1.z } : n1;
  return { a: line(a, n, distance), d };
};
const meetLines = (l1, l2) => {
  const cross = l1.d.x * l2.d.z - l1.d.z * l2.d.x, t = ((l2.a.x - l1.a.x) * l2.d.z - (l2.a.z - l1.a.z) * l2.d.x) / cross;
  return line(l1.a, l1.d, t);
};
const southArm = offsetTowardLuscia(P0, P1, 13), slantArm = offsetTowardLuscia(P1, P2, 13), northArm = offsetTowardLuscia(P2, P3, 8), shoreArm = offsetTowardLuscia(P3, P4, 8);
const F1 = { x: southArm.a.x, z: P0.z };
const F2 = meetLines(southArm, slantArm);
const gateHalf = 16;
const F4 = frontierPoint(0, -gateHalf), F5 = frontierPoint(0, gateHalf);
// Where the slant arm is nearest the gate's south-western end, it turns to meet it.
const F3 = line(slantArm.a, slantArm.d, ((F4.x - slantArm.a.x) * slantArm.d.x + (F4.z - slantArm.a.z) * slantArm.d.z) - 9);
const F6 = { x: northArm.a.x, z: meetLines(northArm, shoreArm).z };
const F7 = line(shoreArm.a, shoreArm.d, Math.hypot(P4.x - P3.x, P4.z - P3.z) - 16);
void back;

export const FRONTIER_CIRCUIT = fortCircuit({
  id: 'frontier', kind: 'frontier', open: true, outside: frontierPoint(-30, 0),
  corners: [P0, F1, F2, F3, F4, F5, F6, F7, P4],
  gates: [{ id: 'frontier-gate', kind: 'main', edge: 4, at: gateHalf }],
  cornerTowers: [0, 1, 2, 4, 5, 6, 7],
  extraTowers: [{ edge: 1, at: Math.hypot(F2.x - F1.x, F2.z - F1.z) / 2 }, { edge: 6, at: Math.hypot(F7.x - F6.x, F7.z - F6.z) / 2 }],
  standard: { towerPlatform: 7.2 },
});

/** The buildings behind the wall. Across the border in Elod's own ground unless the strip behind the wall has room. */
export const FRONTIER_LAYOUT = Object.freeze({
  guardHouse: Object.freeze({ ...frontierPoint(18, 14), yaw: Math.atan2(G.u.x, G.u.z), width: 8, depth: 5 }),
  stable: Object.freeze({ ...frontierPoint(44, 22), yaw: Math.atan2(G.u.x, G.u.z), width: 9, depth: 4.5 }),
  watch: Object.freeze(frontierPoint(30, -30)),
  beacon: Object.freeze(frontierPoint(70, -10)),
  notice: Object.freeze(frontierPoint(-8, -6.8)),
});

/** The end of the open road: on the causeway before the shut gate, beyond the ditch. */
export const FRONTIER_APPROACH = Object.freeze(frontierPoint(-12, 0));
/** The branch road as far as anyone may walk it: from the Lauvel junction to the shut gate. */
export const FRONTIER_ROUTE = Object.freeze([...SUVAL_ROAD.slice(0, BORDER_CROSSING.segment - 1), FRONTIER_APPROACH]);
export const FRONTIER_CLEARINGS = Object.freeze([
  ...SUVAL_HILL_PASSES.map(gate => Object.freeze({ x: gate.x, z: gate.z, r: 24 })),
  Object.freeze({ ...frontierPoint(-4, 0), r: 26 }),
  Object.freeze({ x: -498, z: 536, r: 8 }),
  ...FRONTIER_CIRCUIT.corners.map(p => Object.freeze({ x: p.x, z: p.z, r: 10 })),
  ...FRONTIER_CIRCUIT.edges.flatMap(edge => Array.from({ length: Math.floor(edge.length / 8) }, (_, k) => Object.freeze({ ...FRONTIER_CIRCUIT.pointOn(edge, 8 * (k + 1), 0), r: 9 }))),
]);

/**
 * Room for the rangers the Luscia arc speaks of, who watch this border from the
 * Luscian side: a cold camp under cut boughs in the woods south-west of the gate.
 * Scenery only; nobody is there yet.
 */
export const RANGER_HIDE = Object.freeze({ id: 'ranger-hide', name: 'A Cold Camp', x: -498, z: 536, radius: 7,
  description: 'Cut boughs over a hollow, a fire pit turfed over, and boot prints that go nowhere near the road. Somebody watches the frontier from here and does not want to be found.' });
export const FRONTIER_LANDMARKS = Object.freeze([
  Object.freeze({ id: 'elodi-frontier', name: 'The Elodi Frontier', ...frontierPoint(-10, 0), radius: 14,
    description: 'Grey stone walls, a shut gate and black-clad pickets. Elod has closed its country to stay out of the war, and this is the border it watches hardest.' }),
  RANGER_HIDE,
]);
