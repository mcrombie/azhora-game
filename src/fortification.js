/**
 * The fortification standard, shared by both sides of the war.
 *
 * The army's outpost on the Moros Plain and Solis are built to the same
 * measures: materials differ (squared timber on an earth rampart, dressed
 * stone), strength does not. This module is the measure and the ground plan of
 * a circuit: where its walls, towers, gates and ditch stand and which ground
 * they close. Pure: no three, no DOM. `src/fortworks.js` draws a circuit.
 *
 * A circuit is a closed polygon of corners in world metres. Its wall line is the
 * polygon; the wall occupies `wallThickness` across that line, towers straddle
 * it and project outward, and the ditch runs outside it except at each gate's
 * causeway.
 */
export const FORT_STANDARD = Object.freeze({
  /** Top of the wall above the ground outside. */
  wallHeight: 4.8,
  /** The wall walk's deck: a fighting platform behind a parapet of the wall's own top. */
  walkHeight: 3.3,
  /** Across the wall line: rampart toe to rampart toe. Nobody stands inside it. */
  wallThickness: 4.0,
  /** Towers: a storey taller than the wall, projecting slightly to cover its face. */
  towerSize: 4.8, towerPlatform: 6.6, towerProjection: 1.2,
  /** One tower per 35 to 45 m of wall. */
  towerSpacing: Object.freeze({ min: 30, max: 45 }),
  /** A gate passage between its towers. */
  gateWidth: 4.6,
  /** The outer obstacle. */
  berm: 1.0, ditchWidth: 3.5,
  /** Where the ditch stops for a gate's causeway, each side of the gate's centre line. */
  causewayHalf: 5.0,
});

const sub = (a, b) => ({ x: a.x - b.x, z: a.z - b.z });
const len = v => Math.hypot(v.x, v.z);
const unit = v => { const l = len(v) || 1; return { x: v.x / l, z: v.z / l }; };
const lerpPoint = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
const signedArea = points => points.reduce((sum, p, i) => { const q = points[(i + 1) % points.length]; return sum + p.x * q.z - q.x * p.z; }, 0) / 2;
const axisAligned = dir => Math.abs(dir.x) < 1e-6 || Math.abs(dir.z) < 1e-6;

/** Where two lines (point + direction) meet. */
function meet(p, d, q, e) {
  const cross = d.x * e.z - d.z * e.x;
  if (Math.abs(cross) < 1e-9) return { ...p };
  const t = ((q.x - p.x) * e.z - (q.z - p.z) * e.x) / cross;
  return { x: p.x + d.x * t, z: p.z + d.z * t };
}

/**
 * A ring (or, with `open`, a line) offset outward by `distance`, mitred at its
 * corners. `hand` is +1 when outward is (dir.z, -dir.x), -1 for the other side;
 * a closed ring works it out from its winding.
 */
export function offsetPolygon(corners, distance, { open = false, hand = null } = {}) {
  const side = hand ?? (signedArea(corners) > 0 ? 1 : -1);
  const count = open ? corners.length - 1 : corners.length;
  const lines = Array.from({ length: count }, (_, i) => {
    const a = corners[i], b = corners[(i + 1) % corners.length], d = unit(sub(b, a));
    const out = { x: d.z * side, z: -d.x * side };
    return { p: { x: a.x + out.x * distance, z: a.z + out.z * distance }, d, b: { x: b.x + out.x * distance, z: b.z + out.z * distance } };
  });
  if (!open) return lines.map((line, i) => { const prev = lines[(i - 1 + lines.length) % lines.length]; return meet(prev.p, prev.d, line.p, line.d); });
  return [lines[0].p, ...lines.slice(1).map((line, i) => meet(lines[i].p, lines[i].d, line.p, line.d)), lines[count - 1].b];
}

/**
 * Lays out a circuit.
 *
 * spec: {
 *   id, corners: [{x, z}] in order round the circuit,
 *   gates: [{ id, edge, at }]: `at` metres from corners[edge] along that edge,
 *   extraTowers: [{ edge, at }] optional, standard = FORT_STANDARD overrides,
 *   cornerTowers: true | [corner indices], gateTowers: true,
 *   open: false, outside: {x, z}   an open line (a frontier) and a point on its outer side
 * }
 */
export function fortCircuit(spec) {
  const S = { ...FORT_STANDARD, ...(spec.standard ?? {}) };
  const corners = spec.corners.map(p => ({ x: p.x, z: p.z }));
  const open = Boolean(spec.open);
  const count = open ? corners.length - 1 : corners.length;
  const hand = open
    ? (() => {
      // Judge the side on the run nearest the given outside point: a winding line can fold back on itself.
      let best = 0, bestDistance = Infinity;
      for (let i = 0; i < count; i++) {
        const m = { x: (corners[i].x + corners[i + 1].x) / 2, z: (corners[i].z + corners[i + 1].z) / 2 }, distance = len(sub(spec.outside, m));
        if (distance < bestDistance) { bestDistance = distance; best = i; }
      }
      const d = unit(sub(corners[best + 1], corners[best])), o = sub(spec.outside, corners[best]);
      return (d.z * o.x - d.x * o.z) >= 0 ? 1 : -1;
    })()
    : (signedArea(corners) > 0 ? 1 : -1);
  const edges = Array.from({ length: count }, (_, i) => {
    const a = corners[i], b = corners[(i + 1) % corners.length], dir = unit(sub(b, a));
    const out = { x: dir.z * hand, z: -dir.x * hand };
    return { index: i, a, b, length: len(sub(b, a)), dir, out };
  });
  const pointOn = (edge, at, outward = 0) => ({ x: edge.a.x + edge.dir.x * at + edge.out.x * outward, z: edge.a.z + edge.dir.z * at + edge.out.z * outward });
  const gates = (spec.gates ?? []).map(gate => {
    const edge = edges[gate.edge];
    return { id: gate.id, kind: gate.kind ?? 'gate', edge: gate.edge, at: gate.at, centre: pointOn(edge, gate.at), along: edge.dir, inward: { x: -edge.out.x, z: -edge.out.z },
      halfWidth: (gate.width ?? S.gateWidth) / 2, towers: gate.towers ?? spec.gateTowers ?? true };
  });

  // Towers: corners, a pair flanking each gate, and enough between to keep the spacing.
  const towers = [];
  const half = S.towerSize / 2;
  const cornerTowers = spec.cornerTowers ?? true;
  corners.forEach((corner, i) => {
    if (cornerTowers !== true && !(Array.isArray(cornerTowers) && cornerTowers.includes(i))) return;
    const edge = edges[Math.min(i, count - 1)], at = i < count ? 0 : edge.length;
    towers.push({ id: `${spec.id}-corner-${i}`, kind: 'corner', x: corner.x, z: corner.z, edge: edge.index, at, yaw: Math.atan2(edge.dir.x, edge.dir.z) });
  });
  for (const gate of gates) if (gate.towers) for (const side of [-1, 1]) {
    const edge = edges[gate.edge], at = gate.at + side * (gate.halfWidth + half);
    const spot = pointOn(edge, at, S.towerProjection / 2);
    towers.push({ id: `${gate.id}-tower-${side < 0 ? 'a' : 'b'}`, kind: 'gate', x: spot.x, z: spot.z, edge: gate.edge, at, yaw: Math.atan2(edge.dir.x, edge.dir.z) });
  }
  for (const extra of spec.extraTowers ?? []) {
    const edge = edges[extra.edge], spot = pointOn(edge, extra.at, S.towerProjection / 2);
    towers.push({ id: `${spec.id}-wall-${extra.edge}-${Math.round(extra.at)}`, kind: 'wall', x: spot.x, z: spot.z, edge: extra.edge, at: extra.at, yaw: Math.atan2(edge.dir.x, edge.dir.z) });
  }

  // Wall runs: each edge minus its gate passages.
  const runs = [];
  edges.forEach(edge => {
    const cuts = gates.filter(g => g.edge === edge.index).map(g => [g.at - g.halfWidth, g.at + g.halfWidth]).sort((p, q) => p[0] - q[0]);
    let from = 0;
    for (const [start, end] of cuts) { if (start > from) runs.push({ edge: edge.index, from, to: start }); from = end; }
    if (from < edge.length) runs.push({ edge: edge.index, from, to: edge.length });
  });

  const colliders = [];
  const kind = `${spec.kind ?? 'fort'}`;
  // Walls: an axis-aligned box where the wall runs square to the world, a close chain of circles where it does not.
  for (const run of runs) {
    const edge = edges[run.edge], thickness = S.wallThickness;
    if (axisAligned(edge.dir)) {
      const a = pointOn(edge, run.from), b = pointOn(edge, run.to);
      // A run that ends at a corner reaches on through the corner, so the two walls close on each other.
      const endA = run.from === 0 ? thickness / 2 : 0, endB = Math.abs(run.to - edge.length) < 1e-6 ? thickness / 2 : 0;
      const lo = pointOn(edge, run.from - endA), hi = pointOn(edge, run.to + endB);
      void a; void b;
      colliders.push({ x: (lo.x + hi.x) / 2, z: (lo.z + hi.z) / 2,
        hx: Math.abs(edge.dir.x) > .5 ? Math.abs(hi.x - lo.x) / 2 : thickness / 2,
        hz: Math.abs(edge.dir.z) > .5 ? Math.abs(hi.z - lo.z) / 2 : thickness / 2, kind: `${kind}-wall` });
    } else {
      const r = thickness / 2, step = r * .8;
      const inset = (at, atEnd) => (atEnd ? 0 : r);   // stop a radius short of a gate passage
      const from = run.from + inset(run.from, run.from === 0), to = run.to - inset(run.to, Math.abs(run.to - edge.length) < 1e-6);
      const count = Math.max(1, Math.ceil((to - from) / step));
      for (let i = 0; i <= count; i++) { const spot = pointOn(edge, from + (to - from) * i / count); colliders.push({ x: spot.x, z: spot.z, r, kind: `${kind}-wall` }); }
    }
  }
  // Towers: boxes on square walls, circles on turned ones.
  for (const tower of towers) {
    const edge = edges[tower.edge];
    if (axisAligned(edge.dir)) colliders.push({ x: tower.x, z: tower.z, hx: half, hz: half, kind: `${kind}-tower` });
    else colliders.push({ x: tower.x, z: tower.z, r: half * 1.08, kind: `${kind}-tower` });
  }
  // The ditch: a band outside the wall, broken at each gate's causeway.
  const inner = S.wallThickness / 2 + S.berm, outer = inner + S.ditchWidth, middle = (inner + outer) / 2;
  const ring = distance => offsetPolygon(corners, distance, { open, hand });
  const innerRing = ring(inner), outerRing = ring(outer), midRing = ring(middle);
  const ditch = [];
  edges.forEach((edge, i) => {
    const next = open ? i + 1 : (i + 1) % corners.length;
    const a = midRing[i], b = midRing[next], d = unit(sub(b, a)), length = len(sub(b, a));
    // Offsets along the mid-ring edge, measured from the edge's own corner projection.
    const shift = (a.x - edge.a.x) * edge.dir.x + (a.z - edge.a.z) * edge.dir.z;
    const cuts = gates.filter(g => g.edge === i).map(g => [g.at - (g.causeway ?? S.causewayHalf) - shift, g.at + (g.causeway ?? S.causewayHalf) - shift]);
    const pieces = [];
    let from = 0;
    for (const [start, end] of cuts.sort((p, q) => p[0] - q[0])) { if (start > from) pieces.push([from, start]); from = Math.max(from, end); }
    if (from < length) pieces.push([from, length]);
    for (const [p0, p1] of pieces) {
      const pa = { x: a.x + d.x * p0, z: a.z + d.z * p0 }, pb = { x: a.x + d.x * p1, z: a.z + d.z * p1 };
      ditch.push({ edge: i, a: pa, b: pb, inner: [lerpPoint(innerRing[i], innerRing[next], p0 / length), lerpPoint(innerRing[i], innerRing[next], p1 / length)],
        outer: [lerpPoint(outerRing[i], outerRing[next], p0 / length), lerpPoint(outerRing[i], outerRing[next], p1 / length)] });
      if (axisAligned(edge.dir)) {
        colliders.push({ x: (pa.x + pb.x) / 2, z: (pa.z + pb.z) / 2,
          hx: Math.abs(d.x) > .5 ? Math.abs(pb.x - pa.x) / 2 : S.ditchWidth / 2, hz: Math.abs(d.z) > .5 ? Math.abs(pb.z - pa.z) / 2 : S.ditchWidth / 2, kind: `${kind}-ditch` });
      } else {
        // Stop a radius short of a causeway, so the causeway keeps its whole width.
        const r = S.ditchWidth / 2, from = p0 > 1e-6 ? p0 + r : p0, to = p1 < length - 1e-6 ? p1 - r : p1;
        if (to < from) continue;
        const count = Math.max(1, Math.ceil((to - from) / (r * 1.15)));
        for (let k = 0; k <= count; k++) { const t = from + (to - from) * k / count; colliders.push({ x: a.x + d.x * t, z: a.z + d.z * t, r, kind: `${kind}-ditch` }); }
      }
    }
  });

  /** The wall's centre line sampled every `step` metres, each sample marked when it falls in a gate passage. */
  function wallLine(step = 2) {
    const samples = [];
    for (const edge of edges) for (let at = 0; at <= edge.length + 1e-6; at += step) {
      const gate = gates.find(g => g.edge === edge.index && Math.abs(at - g.at) <= g.halfWidth);
      samples.push({ ...pointOn(edge, at), edge: edge.index, at, gate: gate?.id ?? null });
    }
    return samples;
  }
  /** A walk through a gate: from beyond the ditch outside to well inside. */
  function passage(gateId, reach = S.wallThickness / 2 + S.berm + S.ditchWidth + 2.5) {
    const gate = gates.find(g => g.id === gateId);
    return { from: { x: gate.centre.x - gate.inward.x * reach, z: gate.centre.z - gate.inward.z * reach },
      to: { x: gate.centre.x + gate.inward.x * (S.wallThickness / 2 + 3), z: gate.centre.z + gate.inward.z * (S.wallThickness / 2 + 3) } };
  }
  /** Whether a point lies within the circuit's wall line. An open line encloses nothing. */
  function inside(x, z) {
    if (open) return false;
    let hit = false;
    for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
      const a = corners[i], b = corners[j];
      if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) hit = !hit;
    }
    return hit;
  }
  /** Distance outward from the wall line (negative inside). */
  function outward(x, z) {
    let best = Infinity;
    for (const edge of edges) {
      const t = Math.max(0, Math.min(edge.length, (x - edge.a.x) * edge.dir.x + (z - edge.a.z) * edge.dir.z));
      best = Math.min(best, Math.hypot(x - edge.a.x - edge.dir.x * t, z - edge.a.z - edge.dir.z * t));
    }
    return inside(x, z) ? -best : best;
  }
  const perimeter = edges.reduce((sum, edge) => sum + edge.length, 0);
  return Object.freeze({ id: spec.id, open, standard: S, corners, edges, gates, towers, runs, ditch, colliders, perimeter, wallLine, passage, inside, outward, pointOn });
}

/** The longest stretch of wall between two neighbouring towers, measured along the circuit. */
export function longestTowerGap(circuit) {
  const positions = circuit.towers.map(tower => {
    let before = 0;
    for (let i = 0; i < tower.edge; i++) before += circuit.edges[i].length;
    return before + tower.at;
  }).sort((a, b) => a - b);
  let gap = 0;
  for (let i = 0; i < positions.length; i++) {
    const next = i + 1 < positions.length ? positions[i + 1] : positions[0] + circuit.perimeter;
    gap = Math.max(gap, next - positions[i]);
  }
  return gap;
}
