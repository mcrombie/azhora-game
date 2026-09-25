import { createSceneryBuilder } from './scenery-builder.js';
import { buildFrontierRidges } from './frontier-ridge-works.js';
import { drawCircuit } from './fortworks.js';
import { FRONTIER_CIRCUIT, FRONTIER_LAYOUT, FRONTIER_GATE, PICKET_POSTS, RANGER_HIDE, frontierPoint } from './frontier.js';
import { SIGN_COLOURS } from './signs.js';

/**
 * Draws Elod's closed frontier: the grey stone wall with its shut gatehouse, the
 * guard house, stable, watch platform and signal beacon behind it, the pickets'
 * watch posts along the rest of the border, and the rangers' cold camp.
 */
const STONE = '#8d8e86', STONE_DARK = '#76776f', SLATE = '#4a4d50', TIMBER = '#5b4a3a', BLACK = '#1f1f22', IRON = '#3f3e3b';

export function buildFrontierWorks({ parent, heightAt, colliders, signs }) {
  buildFrontierRidges({ parent, heightAt, colliders, signs });
  const push = collider => { colliders.push(collider); return collider; };
  const circle = (x, z, r, kind) => push({ x, z, r, kind });
  const y = (x, z) => heightAt(x, z);

  drawCircuit(FRONTIER_CIRCUIT, { parent, heightAt, colliders, style: 'stone', name: 'The Elodi frontier', gateLeaves: 'shut' });
  colliders.push(...FRONTIER_CIRCUIT.colliders);
  // The gate is shut: its leaves close the passage between the towers.
  for (const gate of FRONTIER_CIRCUIT.gates) for (let s = -gate.halfWidth; s <= gate.halfWidth + 1e-6; s += .7) {
    push({ x: gate.centre.x + gate.along.x * s, z: gate.centre.z + gate.along.z * s, r: .75, kind: 'frontier-gate-shut' });
  }

  const b = createSceneryBuilder('The Elodi frontier buildings');
  const house = ({ x, z, yaw, width, depth }, { roof = SLATE, wall = STONE, door = true, chimney = true } = {}) => {
    const gy = Math.min(y(x, z), y(x + Math.sin(yaw) * depth, z + Math.cos(yaw) * depth), y(x - Math.sin(yaw) * depth, z - Math.cos(yaw) * depth));
    b.frame(x, gy, z, yaw, () => {
      b.block(STONE_DARK, 0, -.4, 0, width + .3, .8, depth + .3);
      b.block(wall, 0, .4, 0, width, 2.8, depth);
      b.roof(roof, 0, 3.2, 0, width + .8, depth + .7, 1.8, Math.PI / 2, wall);
      if (door) b.block('#3a3129', 0, .4, -depth / 2 - .02, 1.1, 2.0, .06);
      for (const sx of [-1, 1]) b.block(BLACK, sx * width * .3, 1.5, -depth / 2 - .02, .7, .6, .05);
      if (chimney) b.block(STONE_DARK, width * .32, 3.2, depth * .2, .7, 2.4, .7);
    });
    circle(x, z, Math.max(width, depth) * .55, 'frontier-building');
  };
  house(FRONTIER_LAYOUT.guardHouse);

  // The stable: stone ends and a timber front of open stalls under one long roof.
  {
    const s = FRONTIER_LAYOUT.stable, sy = y(s.x, s.z);
    b.frame(s.x, sy, s.z, s.yaw, () => {
      b.block(STONE, 0, -.3, s.depth / 2 - .2, s.width, 3.0, .4);
      for (const sx of [-1, 1]) b.block(STONE, sx * (s.width / 2 - .2), -.3, 0, .4, 3.0, s.depth);
      for (let k = 0; k <= 4; k++) b.block(TIMBER, -s.width / 2 + k * s.width / 4, 0, -s.depth / 2 + .1, .22, 2.6, .22);
      for (let k = 1; k < 4; k++) b.block(TIMBER, -s.width / 2 + k * s.width / 4, 0, 0, .12, 1.4, s.depth - .4);
      b.roof(SLATE, 0, 2.7, 0, s.width + .8, s.depth + .8, 1.4, Math.PI / 2, STONE);
      b.block('#b39a5e', -s.width / 2 + 1.1, 0, .6, 1.4, .8, 1.4);
    });
    circle(s.x, s.z, Math.max(s.width, s.depth) * .55, 'frontier-building');
  }

  // The watch platform: a stone base, a timber stage and a hood, on the rise behind the wall.
  {
    const w = FRONTIER_LAYOUT.watch, wy = y(w.x, w.z);
    b.block(STONE, w.x, wy - .5, w.z, 4.2, 4.5, 4.2);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.block(TIMBER, w.x + sx * 1.8, wy + 4, w.z + sz * 1.8, .3, 4.6, .3);
    b.box('#6f5a44', w.x, wy + 6.2, w.z, 4.4, .2, 4.4);
    for (const [sx, sz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) b.block(TIMBER, w.x + sx * 2.1, wy + 6.3, w.z + sz * 2.1, sx ? .12 : 4.3, 1.0, sx ? 4.3 : .12);
    b.cone(SLATE, w.x, wy + 8.6, w.z, 3.3, 1.6, Math.PI / 4, 4);
    b.sheet(BLACK, [w.x, wy + 11.4, w.z], [w.x + 1.6, wy + 11.1, w.z], [w.x, wy + 10.6, w.z], [w.x, wy + 10.6, w.z]);
    b.beam(TIMBER, [w.x, wy + 8.6, w.z], [w.x, wy + 11.5, w.z], .08);
    circle(w.x, w.z, 3.0, 'frontier-watch');
  }

  // The signal beacon: an iron basket of split wood on a tall post over a stone plinth, ready to be lit for Elod.
  {
    const s = FRONTIER_LAYOUT.beacon, sy = y(s.x, s.z);
    b.block(STONE, s.x, sy - .3, s.z, 2.6, 1.6, 2.6);
    b.beam(TIMBER, [s.x, sy + 1.3, s.z], [s.x, sy + 7.0, s.z], .3);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; b.beam(IRON, [s.x + Math.sin(a) * .5, sy + 7.0, s.z + Math.cos(a) * .5], [s.x + Math.sin(a) * .95, sy + 8.2, s.z + Math.cos(a) * .95], .06); }
    for (let k = 0; k < 7; k++) { const a = k * 2.2; b.beam('#6d5439', [s.x + Math.sin(a) * .6, sy + 7.1, s.z + Math.cos(a) * .6], [s.x - Math.sin(a) * .5, sy + 8.0, s.z - Math.cos(a) * .5], .14); }
    circle(s.x, s.z, 1.6, 'signal-beacon');
  }

  // Pickets' watch posts along the rest of the border: a timber tower on a cairn, a black pennant above it.
  for (const post of PICKET_POSTS) {
    const py = y(post.x, post.z);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; b.rock(STONE_DARK, post.x + Math.sin(a) * 1.3, py + .35, post.z + Math.cos(a) * 1.3, .7, .55, .65, a); }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.beam(TIMBER, [post.x + sx * 1.1, py, post.z + sz * 1.1], [post.x + sx * .8, py + 6.2, post.z + sz * .8], .18);
    b.box('#6f5a44', post.x, py + 6.2, post.z, 2.2, .18, 2.2);
    for (const [sx, sz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) b.block(TIMBER, post.x + sx * 1.05, py + 6.3, post.z + sz * 1.05, sx ? .1 : 2.1, .8, sx ? 2.1 : .1);
    b.beam(TIMBER, [post.x, py + 6.2, post.z], [post.x, py + 10, post.z], .08);
    b.sheet(BLACK, [post.x, py + 9.9, post.z], [post.x + Math.cos(post.yaw) * 1.8, py + 9.5, post.z - Math.sin(post.yaw) * 1.8], [post.x, py + 9.0, post.z], [post.x, py + 9.0, post.z]);
    circle(post.x, post.z, 1.9, 'picket-post');
  }

  // The rangers' cold camp in the Luscian woods: cut boughs over a hollow and a turfed-over fire.
  {
    const r = RANGER_HIDE, ry = y(r.x, r.z);
    for (let k = 0; k < 7; k++) b.beam('#4f6b45', [r.x - 1.6 + k * .5, ry, r.z + 1.2], [r.x - 1.2 + k * .4, ry + 1.4, r.z - .2], .18, .05);
    b.beam('#5b4a3a', [r.x - 1.8, ry + 1.35, r.z - .2], [r.x + 1.6, ry + 1.35, r.z - .2], .1);
    b.patch('#6f7a50', heightAt, r.x + .5, r.z - 2.4, 1.2, 1.2, 0, .05, 1);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; b.rock('#6f6a60', r.x + .5 + Math.sin(a) * .6, ry + .08, r.z - 2.4 + Math.cos(a) * .6, .16, .1, .14); }
    circle(r.x, r.z + .5, 1.5, 'ranger-hide');
  }
  b.finish(parent);

  // Before the gate: Elod's notice and the border stone, on the Luscian side of the causeway.
  const n = FRONTIER_LAYOUT.notice, facing = Math.atan2(-FRONTIER_GATE.u.x, -FRONTIER_GATE.u.z);
  signs.notice({ x: n.x, z: n.z, label: 'Closed by Elod', facing, parent });
  const stone = frontierPoint(-9, 7);
  signs.border({ x: stone.x, z: stone.z, facing, parent,
    faces: [{ label: 'East Suval', paint: SIGN_COLOURS.paint.elod }, { label: 'Luscia', paint: SIGN_COLOURS.paint.luscia }] });
}
