import { createSceneryBuilder } from './scenery-builder.js';

/**
 * Draws a fortification circuit (`src/fortification.js`) in one of two
 * materials of equal strength: the Legion's squared timber palisade on an earth
 * rampart, or dressed stone. Colliders come from the circuit itself; this module
 * adds only the ones its own small parts need (stairs, ladders).
 */
export const TIMBER = Object.freeze({
  earth: '#8a7652', earthTop: '#8d9258', stake: '#6f5238', stakeDark: '#634833', rail: '#58422f', deck: '#9a7650',
  tower: '#7a5a3d', towerDark: '#5b4431', roof: '#6d5a43', ditch: '#4f4231', ditchSide: '#6f5d42', spike: '#7d6446', slit: '#2c241c',
});
export const STONE = Object.freeze({
  earth: '#7c7a6e', earthTop: '#8b8a7e', wall: '#8d8e86', wallDark: '#7b7c75', cap: '#a3a49b', deck: '#6f5a44', rail: '#4b3b2c',
  tower: '#888980', towerDark: '#74756e', roof: '#3d3f40', ditch: '#4b4940', ditchSide: '#66655a', spike: '#5a4a38', slit: '#1f1f22',
});

export function drawCircuit(circuit, { parent, heightAt, colliders, style = 'timber', name = circuit.id, gateOpen = true, gateLeaves = null, sides = null }) {
  const S = circuit.standard, C = style === 'stone' ? STONE : TIMBER;
  const b = createSceneryBuilder(`${name} walls`);
  const t = S.wallThickness / 2;
  const at = (edge, along, across) => circuit.pointOn(edge, along, across);
  const yaw = edge => Math.atan2(edge.dir.x, edge.dir.z);

  // --- Walls: rampart (or footing), palisade or masonry, and the wall walk behind it.
  for (const run of circuit.runs) {
    const edge = circuit.edges[run.edge], length = run.to - run.from;
    if (length < .05) continue;
    const pieces = Math.max(1, Math.ceil(length / 5));
    const turn = yaw(edge);
    for (let k = 0; k < pieces; k++) {
      const a0 = run.from + length * k / pieces, a1 = run.from + length * (k + 1) / pieces, mid = (a0 + a1) / 2, span = a1 - a0;
      const m = at(edge, mid, 0), ground = Math.min(heightAt(m.x, m.z), heightAt(at(edge, mid, t).x, at(edge, mid, t).z), heightAt(at(edge, mid, -t).x, at(edge, mid, -t).z));
      b.frame(m.x, ground, m.z, turn, () => {
        // Local frame: z along the wall, x across it with +x outward.
        const out = edge.out, localOut = Math.sign(out.x * Math.cos(turn) - out.z * Math.sin(turn)) || 1;
        const X = v => v * localOut;
        if (style === 'timber') {
          // The rampart: an earth bank across the whole thickness.
          const toe = t, top = 1.7;
          b.quad(C.earth, [X(toe), 0, -span / 2], [X(toe), 0, span / 2], [X(1.05), top, span / 2], [X(1.05), top, -span / 2]);
          b.quad(C.earthTop, [X(1.05), top, -span / 2], [X(1.05), top, span / 2], [X(-.7), top, span / 2], [X(-.7), top, -span / 2]);
          b.quad(C.earth, [X(-.7), top, -span / 2], [X(-.7), top, span / 2], [X(-toe), .05, span / 2], [X(-toe), .05, -span / 2]);
          // Squared stakes, sharpened, on the outer edge of the bank.
          const count = Math.max(1, Math.round(span / .38));
          for (let s = 0; s < count; s++) {
            const z = -span / 2 + (s + .5) * span / count, h = S.wallHeight - 1.2 + ((s * 7 + k * 3) % 5 - 2) * .06;
            b.block(s % 2 ? C.stake : C.stakeDark, X(.95), 1.2, z, .36, h - .35, .34);
            b.cone(s % 2 ? C.stake : C.stakeDark, X(.95), 1.2 + h - .35, z, .25, .42, Math.PI / 4, 4);
          }
          b.box(C.rail, X(.7), 2.35, 0, .14, .2, span);
          b.box(C.rail, X(.7), S.wallHeight - .75, 0, .14, .2, span);
        } else {
          // Dressed stone: a battered footing and a solid wall with a crenellated parapet.
          b.block(C.earth, 0, -.2, 0, S.wallThickness, .9, span + .02);
          b.block(C.wall, X(.55), .7, 0, 2.2, S.wallHeight - .7 - .75, span + .02);
          b.block(C.wallDark, X(-1.2), .7, 0, 1.4, S.walkHeight - .7, span + .02);
          const merlons = Math.max(1, Math.round(span / 1.6));
          for (let s = 0; s < merlons; s++) b.block(C.cap, X(1.3), S.wallHeight - .75, -span / 2 + (s + .5) * span / merlons, .7, .75, span / merlons * .55);
          b.box(C.cap, X(.55), S.wallHeight - .78, 0, 2.3, .1, span + .04);
        }
        // The wall walk: a plank deck on posts, a fighting platform behind the parapet.
        b.box(C.deck, X(-.1), S.walkHeight, 0, 1.75, .14, span + .02);
        if (style === 'timber') {
          const posts = Math.max(1, Math.round(span / 2.4));
          for (let s = 0; s <= posts; s++) {
            const z = -span / 2 + s * span / posts;
            b.beam(C.rail, [X(-.85), 1.7, z], [X(-.85), S.walkHeight, z], .16);
            b.beam(C.rail, [X(-.85), S.walkHeight - .1, z], [X(.75), S.walkHeight - .1, z], .12);
          }
          b.box(C.rail, X(-.95), S.walkHeight + .55, 0, .08, .08, span);
        }
      });
    }
  }

  // --- Towers: a storey above the wall, projecting to cover its face.
  const half = S.towerSize / 2;
  for (const tower of circuit.towers) {
    const edge = circuit.edges[tower.edge];
    const ground = Math.min(...[[-half, -half], [half, -half], [-half, half], [half, half]].map(([dx, dz]) => heightAt(tower.x + dx, tower.z + dz)));
    const top = S.towerPlatform;
    b.frame(tower.x, ground, tower.z, yaw(edge), () => {
      if (style === 'timber') {
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.block(C.towerDark, sx * (half - .22), 0, sz * (half - .22), .44, top + 2.3, .44);
        for (const band of [S.walkHeight, top - .5]) b.box(C.towerDark, 0, band, 0, S.towerSize + .08, .22, S.towerSize + .08);
        // Board walls to the platform, darker slits on every face.
        for (const [sx, sz, w, d] of [[0, -1, S.towerSize - .5, .2], [0, 1, S.towerSize - .5, .2], [-1, 0, .2, S.towerSize - .5], [1, 0, .2, S.towerSize - .5]])
          b.block(C.tower, sx * (half - .2), .2, sz * (half - .2), w, top - .2, d);
        for (const [sx, sz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
          b.block(C.slit, sx * (half - .08), top - 2.2, sz * (half - .08), sz ? .18 : .06, .9, sx ? .18 : .06);
          b.block(C.slit, sx * (half - .08), top - 4.6, sz * (half - .08), sz ? .18 : .06, .7, sx ? .18 : .06);
        }
        b.box(C.deck, 0, top + .06, 0, S.towerSize + .5, .22, S.towerSize + .5);
        // Breastwork round the platform, then a pyramid roof on the corner posts.
        for (const [sx, sz, w, d] of [[0, -1, S.towerSize + .5, .16], [0, 1, S.towerSize + .5, .16], [-1, 0, .16, S.towerSize + .5], [1, 0, .16, S.towerSize + .5]])
          b.block(C.stake, sx * (half + .17), top + .15, sz * (half + .17), w, 1.05, d);
        b.cone(C.roof, 0, top + 2.2, 0, half * 1.55, 2.0, Math.PI / 4, 4);
      } else {
        b.block(C.tower, 0, -.2, 0, S.towerSize, top + .4, S.towerSize);
        b.box(C.cap, 0, top + .2, 0, S.towerSize + .3, .25, S.towerSize + .3);
        for (const [sx, sz, w, d] of [[0, -1, S.towerSize + .3, .45], [0, 1, S.towerSize + .3, .45], [-1, 0, .45, S.towerSize + .3], [1, 0, .45, S.towerSize + .3]]) {
          const n = 3;
          for (let i = 0; i < n; i++) {
            const offset = -(n - 1) / 2 + i;
            b.block(C.cap, sx * (half + .05) + (sz ? offset * 1.55 : 0), top + .3, sz * (half + .05) + (sx ? offset * 1.55 : 0), sz ? .9 : w, .8, sx ? .9 : d);
          }
        }
        for (const [sx, sz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) b.block(C.slit, sx * (half + .01), top - 2.4, sz * (half + .01), sz ? .2 : .05, 1.0, sx ? .2 : .05);
        b.cone(C.roof, 0, top + 1.1, 0, half * 1.2, 2.2, Math.PI / 4, 4);
      }
    });
  }

  // --- Gates: a gallery over the passage between its towers, and the leaves.
  for (const gate of circuit.gates) {
    const edge = circuit.edges[gate.edge], centre = gate.centre, ground = heightAt(centre.x, centre.z);
    b.frame(centre.x, ground, centre.z, yaw(edge), () => {
      const w = gate.halfWidth, localOut = Math.sign(edge.out.x * Math.cos(yaw(edge)) - edge.out.z * Math.sin(yaw(edge))) || 1;
      const X = v => v * localOut;
      // The gallery: a beam frame and a deck at walk height, fronted like the wall.
      b.box(C.deck, X(-.1), S.walkHeight, 0, S.wallThickness * .6, .22, gate.halfWidth * 2 + 1);
      b.box(C.rail, X(.95), S.walkHeight - .35, 0, .5, .5, gate.halfWidth * 2 + 1.2);
      b.box(style === 'timber' ? C.stake : C.wall, X(.95), S.walkHeight + .1, 0, .34, S.wallHeight - S.walkHeight + .3, gate.halfWidth * 2 + 1);
      for (const side of [-1, 1]) b.block(C.towerDark, X(.95), 0, side * (w + .1), .42, S.walkHeight, .3);
      const shut = gateLeaves === 'shut' || !gateOpen;
      const leaf = style === 'timber' ? C.stakeDark : '#3f3a33';
      if (shut) {
        for (const side of [-1, 1]) {
          b.block(leaf, X(.95), 0, side * w / 2, .28, S.walkHeight - .1, w - .04);
          for (const y of [.8, 1.9, 2.8]) b.box(C.slit, X(1.13), y, side * w / 2, .05, .16, w - .2);
        }
      } else {
        // Leaves swung in against the passage sides, clear of the way.
        for (const side of [-1, 1]) b.block(leaf, X(.95 - w * .5), 0, side * (w - .12), w - .1, S.walkHeight - .25, .2);
      }
    });
  }

  // --- The ditch: a dark floor, sloped sides and a line of sharpened stakes.
  for (const piece of circuit.ditch) {
    const length = Math.hypot(piece.b.x - piece.a.x, piece.b.z - piece.a.z);
    if (length < .5) continue;
    const steps = Math.max(1, Math.ceil(length / 4));
    for (let k = 0; k < steps; k++) {
      const f0 = k / steps, f1 = (k + 1) / steps;
      const lerp = (p, q, f) => ({ x: p.x + (q.x - p.x) * f, z: p.z + (q.z - p.z) * f });
      const i0 = lerp(piece.inner[0], piece.inner[1], f0), i1 = lerp(piece.inner[0], piece.inner[1], f1);
      const o0 = lerp(piece.outer[0], piece.outer[1], f0), o1 = lerp(piece.outer[0], piece.outer[1], f1);
      const m0 = lerp(i0, o0, .5), m1 = lerp(i1, o1, .5);
      const y = p => heightAt(p.x, p.z) + .04;
      const ia = lerp(i0, o0, .22), ib = lerp(i1, o1, .22), oa = lerp(i0, o0, .78), ob = lerp(i1, o1, .78);
      const V = (p, lift = 0) => [p.x, y(p) + lift, p.z];
      b.sheet(C.ditchSide, V(i0), V(i1), V(ib, .01), V(ia, .01));
      b.sheet(C.ditch, V(ia, .01), V(ib, .01), V(ob, .01), V(oa, .01));
      b.sheet(C.ditchSide, V(oa, .01), V(ob, .01), V(o1), V(o0));
      // A low spoil lip on the inner edge.
      b.beam(C.earth, V(i0, .15), V(i1, .15), .5, .3);
      const stakes = Math.max(1, Math.round(length / steps / 1.6));
      for (let s = 0; s < stakes; s++) {
        const p = lerp(m0, m1, (s + .5) / stakes), q = { x: p.x + (o0.x - i0.x) * .12, z: p.z + (o0.z - i0.z) * .12 };
        b.beam(C.spike, V(p), [q.x, y(q) + .9, q.z], .09);
      }
    }
  }
  const mesh = b.finish(parent);
  void colliders; void sides;
  return mesh;
}
