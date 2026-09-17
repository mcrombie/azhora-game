import { createSceneryBuilder } from './scenery-builder.js';
import { drawCircuit, TIMBER } from './fortworks.js';
import {
  OUTPOST_CIRCUIT, OUTPOST_LAYOUT, OUTPOST_ROAD, OUTPOST_BENCH, OUTPOST_FIRE, campPoint, gateRoadPoint,
  STOCKADE_CIRCUIT, STOCKADE_LAYOUT,
} from './outpost.js';
import { MOROS_WAYSIDE, MOROS_MILESTONES } from './wayside.js';
import { STORY_SITES } from './region-world.js';
import { SIGN_COLOURS } from './signs.js';

/**
 * The Moros Plain's built places: the Ambroni outpost (the Legion's timber fort),
 * the forward stockade on the border, the Moros gate and the wayside between the
 * gate and the outpost. Layout lives in `outpost.js` and `wayside.js`; this
 * module draws it and adds the colliders the circuits do not already carry.
 */
const CANVAS = '#cdbf96', CANVAS_DARK = '#b3a47c', CANVAS_SHADE = '#9d8f6b', ROPE = '#b8a77c', IRON = '#4d4b47', EMBER = '#9c4a26';
const LEGION_RED = '#8c3f38', REPUBLIC_BLUE = '#3f5f86', GOLD = '#c9a24e', WHITE = '#ece6d4';

export function buildMorosWorks({ parent, heightAt, colliders, signs, movingGroups, stakedProps, roadDistance }) {
  const push = collider => { colliders.push(collider); return collider; };
  const box = (x, z, hx, hz, kind) => push({ x, z, hx, hz, kind });
  const circle = (x, z, r, kind) => push({ x, z, r, kind });

  // -------------------------------------------------------------------------
  // The outpost
  // -------------------------------------------------------------------------
  drawCircuit(OUTPOST_CIRCUIT, { parent, heightAt, colliders, style: 'timber', name: 'The Ambroni outpost' });
  colliders.push(...OUTPOST_CIRCUIT.colliders);
  const b = createSceneryBuilder('The Ambroni outpost interior');
  const y = (x, z) => heightAt(x, z);
  const L = OUTPOST_LAYOUT;

  // The parade ground: trodden earth from the main gate to the centre, and the tribunal beside it.
  b.patch('#a89a6c', heightAt, L.parade.x, L.parade.z, 30, 22, Math.atan2(OUTPOST_ROAD.east.x, OUTPOST_ROAD.east.z) + Math.PI / 2, .03, 6);
  {
    const t = L.tribunal, ty = y(t.x, t.z);
    b.block('#8a6a47', t.x, ty, t.z, t.hx * 2, .85, t.hz * 2);
    b.box('#9a7650', t.x, ty + .88, t.z, t.hx * 2 + .2, .08, t.hz * 2 + .2);
    for (let s = 0; s < 3; s++) b.block('#7b5d3f', t.x, ty, t.z + t.hz + .3 + s * .35, 1.4, .6 - s * .2, .35);
    for (const sx of [-1, 1]) { b.beam('#58422f', [t.x + sx * t.hx, ty + .85, t.z - t.hz], [t.x + sx * t.hx, ty + 1.9, t.z - t.hz], .1); }
    b.beam('#58422f', [t.x - t.hx, ty + 1.85, t.z - t.hz], [t.x + t.hx, ty + 1.85, t.z - t.hz], .09);
    box(t.x, t.z + .35, t.hx + .05, t.hz + .5, 'outpost-tribunal');
  }

  // The Legate's tent: canvas walls under a high roof, its door open to the north.
  {
    const c = L.command, cy = y(c.x, c.z);
    b.block(CANVAS_DARK, c.x, cy, c.z, c.hx * 2, 2.3, c.hz * 2);
    b.roof(CANVAS, c.x, cy + 2.3, c.z, c.hx * 2 + .6, c.hz * 2 + .5, 2.2, Math.PI / 2, CANVAS_DARK);
    b.block('#3b3126', c.x, cy, c.z - c.hz - .01, 1.7, 2.0, .06);
    for (const side of [-1, 1]) b.sheet(CANVAS_SHADE, [c.x + side * .85, cy, c.z - c.hz - .02], [c.x + side * 1.6, cy, c.z - c.hz - .7], [c.x + side * 1.6, cy + 2.0, c.z - c.hz - .7], [c.x + side * .85, cy + 2.0, c.z - c.hz - .02]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.beam(ROPE, [c.x + sx * c.hx, cy + 2.3, c.z + sz * c.hz], [c.x + sx * (c.hx + 1.4), cy, c.z + sz * (c.hz + .6)], .03);
    b.box(LEGION_RED, c.x, cy + 1.6, c.z - c.hz - .03, 3.2, .45, .04);
    box(c.x, c.z, c.hx, c.hz, 'command-tent');
  }

  // Tent lines: eight men to a tent, ridges running north and south, pegged in rows.
  for (const tent of L.tents) {
    const ty = y(tent.x, tent.z);
    b.tent(CANVAS, tent.x, ty, tent.z, tent.hx * 2, tent.hz * 2, 2.05, 0, CANVAS_DARK);
    b.beam('#6d5439', [tent.x, ty, tent.z - tent.hz - .12], [tent.x, ty + 2.15, tent.z - tent.hz - .12], .07);
    b.beam('#6d5439', [tent.x, ty, tent.z + tent.hz + .12], [tent.x, ty + 2.15, tent.z + tent.hz + .12], .07);
    b.block('#3b3126', tent.x, ty, tent.z - tent.hz - .02, .9, 1.3, .03);
    for (const sx of [-1, 1]) b.beam(ROPE, [tent.x + sx * tent.hx * .55, ty + 1.2, tent.z - tent.hz], [tent.x + sx * (tent.hx + .7), ty, tent.z - tent.hz - .6], .025);
    box(tent.x, tent.z, tent.hx, tent.hz, 'legion-tent');
  }

  // The quartermaster's stores: a closed tent with crates and barrels at its mouth.
  {
    const s = L.stores, sy = y(s.x, s.z);
    b.block(CANVAS_DARK, s.x, sy, s.z, s.hx * 2, 1.4, s.hz * 2);
    b.roof(CANVAS, s.x, sy + 1.4, s.z, s.hx * 2 + .4, s.hz * 2 + .3, 1.5, 0, CANVAS_DARK);
    for (const [dx, dz, size] of [[-2.2, 3.1, .8], [-1.3, 3.2, .7], [-1.7, 3.1, .6]]) b.block('#9c7a52', s.x + dx, sy + (size === .6 ? .8 : 0), s.z + dz, size, size, size);
    b.cylinder('#8c6a47', s.x + 1.8, sy, s.z + 3.0, .38, .95);
    b.cylinder('#8c6a47', s.x + 2.6, sy, s.z + 3.2, .38, .95);
    box(s.x, s.z, s.hx, s.hz, 'outpost-stores');
    circle(s.x - 1.8, s.z + 3.15, .75, 'crates'); circle(s.x + 2.2, s.z + 3.1, .75, 'barrels');
  }

  // The smithy tent: an open roof on posts over the forge, the anvil and the quench barrel.
  {
    const s = L.smithy, sy = y(s.x, s.z);
    for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) {
      const px = s.x + sx * s.hx, pz = s.z + sz * s.hz;
      b.beam('#6d5439', [px, y(px, pz), pz], [px, sy + 2.6, pz], .14);
      circle(px, pz, .16, 'smithy-post');
    }
    b.roof('#a39570', s.x, sy + 2.6, s.z, s.hx * 2 + .6, s.hz * 2 + .6, 1.1, Math.PI / 2, '#8d8062');
    const f = L.forge, fy = y(f.x, f.z);
    b.block('#7d7a70', f.x, fy, f.z, 1.7, .95, 1.2);
    b.box('#5e5a52', f.x, fy + 1.0, f.z, 1.3, .1, .9);
    b.box(EMBER, f.x, fy + 1.08, f.z, .9, .08, .6);
    b.block('#6b5a4a', f.x - 1.25, fy + .35, f.z, .7, .4, .9);
    b.beam('#5e5a52', [f.x + .4, fy + 1.0, f.z - .3], [f.x + .4, fy + 3.0, f.z - .3], .3);
    circle(f.x, f.z, 1.05, 'forge');
    const anvil = { x: s.x + .9, z: s.z + .2 };
    b.cylinder('#6d5439', anvil.x, y(anvil.x, anvil.z), anvil.z, .32, .55);
    b.block(IRON, anvil.x, y(anvil.x, anvil.z) + .55, anvil.z, .55, .25, .22);
    b.box(IRON, anvil.x + .35, y(anvil.x, anvil.z) + .72, anvil.z, .25, .08, .14);
    circle(anvil.x, anvil.z, .45, 'anvil');
    b.cylinder('#8c6a47', s.x + 2.4, sy, s.z - 1.6, .38, .8);
    b.cylinder('#44525a', s.x + 2.4, sy + .78, s.z - 1.6, .3, .04);
    circle(s.x + 2.4, s.z - 1.6, .45, 'quench-barrel');
    // A rack of spears waiting on the smith.
    for (let i = 0; i < 5; i++) b.beam('#6d5439', [s.x - 2.8 + i * .3, sy, s.z + 2.2], [s.x - 2.7 + i * .3, sy + 2.3, s.z + 2.45], .04);
    b.beam('#58422f', [s.x - 3, sy + 1.4, s.z + 2.35], [s.x - 1.4, sy + 1.4, s.z + 2.35], .07);
    circle(s.x - 2.2, s.z + 2.3, .5, 'spear-rack');
    // The bench itself is drawn with the world's other repair benches; its sign hangs here.
    void OUTPOST_BENCH;
  }

  // The granary: a raised store on staddle posts, south of the gate road.
  {
    const g = L.granary, gy = y(g.x, g.z);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { b.cylinder('#8a8779', g.x + sx * (g.hx - .3), gy, g.z + sz * (g.hz - .3), .18, .7); b.cone('#8a8779', g.x + sx * (g.hx - .3), gy + .7, g.z + sz * (g.hz - .3), .38, .18); }
    b.block('#8b6c4a', g.x, gy + .9, g.z, g.hx * 2, 2.0, g.hz * 2);
    b.roof('#6d5a43', g.x, gy + 2.9, g.z, g.hx * 2 + .6, g.hz * 2 + .6, 1.4, 0);
    box(g.x, g.z, g.hx, g.hz, 'granary');
  }

  // The well, the horse trough and the hay by the horse line.
  {
    const w = L.well, wy = y(w.x, w.z);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; b.block('#8f9087', w.x + Math.sin(a) * .95, wy, w.z + Math.cos(a) * .95, .55, .85, .55, a); }
    for (const side of [-1, 1]) b.beam('#6d5439', [w.x + side * 1.1, wy, w.z], [w.x + side * 1.1, wy + 2.2, w.z], .12);
    b.beam('#58422f', [w.x - 1.25, wy + 2.15, w.z], [w.x + 1.25, wy + 2.15, w.z], .12);
    circle(w.x, w.z, 1.35, 'outpost-well');
    const t = L.trough, ty = y(t.x, t.z);
    b.block('#6f5238', t.x, ty, t.z, t.hx * 2, .6, t.hz * 2);
    b.box('#58727a', t.x, ty + .56, t.z, t.hx * 2 - .15, .04, t.hz * 2 - .12);
    box(t.x, t.z, t.hx, t.hz, 'horse-trough');
    const h = L.hay, hy = y(h.x, h.z);
    b.cylinder('#bba266', h.x, hy, h.z, 1.5, 1.4); b.cone('#b39a5e', h.x, hy + 1.4, h.z, 1.6, 1.3);
    b.cylinder('#bba266', h.x + 3.1, hy, h.z + .4, 1.2, 1.2); b.cone('#b39a5e', h.x + 3.1, hy + 1.2, h.z + .4, 1.3, 1.0);
    circle(h.x, h.z, 1.55, 'hay-stack'); circle(h.x + 3.1, h.z + .4, 1.25, 'hay-stack');
  }

  // The mess: an awning over a long table, and log benches round the fire (the fire itself is a campfire).
  {
    const m = L.mess, a = m.awning, ay = y(a.x, a.z);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const px = a.x + sx * 3, pz = a.z + sz * 1.8; b.beam('#6d5439', [px, y(px, pz), pz], [px, ay + 2.5, pz], .12); circle(px, pz, .15, 'mess-post'); }
    b.roof('#b8a374', a.x, ay + 2.5, a.z, 6.8, 4.2, .8, Math.PI / 2);
    b.block('#8e6c49', a.x, ay + .72, a.z, 4.6, .1, 1.0);
    for (const sx of [-1.8, 1.8]) b.block('#6d5439', a.x + sx, ay, a.z, .12, .72, .8);
    for (const sz of [-1, 1]) b.block('#7b5d3f', a.x, ay, a.z + sz * .9, 4.4, .45, .3);
    box(a.x, a.z, 2.4, 1.2, 'mess-table');
    for (const bench of m.benches) { const by = y(bench.x, bench.z); b.beam('#6b5037', [bench.x - .9, by + .28, bench.z], [bench.x + .9, by + .28, bench.z], .42, .36); circle(bench.x, bench.z, .5, 'mess-bench'); }
    const f = { x: OUTPOST_FIRE.fireX, z: OUTPOST_FIRE.fireZ }, fy = y(f.x, f.z);
    for (const sx of [-1, 1]) b.beam('#3f352b', [f.x + sx * .95, fy, f.z], [f.x + sx * .7, fy + 1.55, f.z], .06);
    b.beam('#3f352b', [f.x - .75, fy + 1.5, f.z], [f.x + .75, fy + 1.5, f.z], .05);
    b.cylinder(IRON, f.x, fy + .72, f.z, .32, .42);
  }

  // Stairs to the wall walk, inside the walls: beside the rear gate, on the north wall and on the south wall.
  const walk = OUTPOST_CIRCUIT.standard.walkHeight;
  for (const [x0, z0, x1, z1] of [[-57.3, -9.5, -57.3, -5.2], [-57.3, 19.5, -57.3, 15.2], [-30.5, -35.3, -26.2, -35.3], [4, 31.3, 8.3, 31.3]]) {
    const a = campPoint(x0, z0), c = campPoint(x1, z1), steps = 9;
    const along = { x: (c.x - a.x) / steps, z: (c.z - a.z) / steps }, ground = y(a.x, a.z);
    const yaw = Math.atan2(c.x - a.x, c.z - a.z);
    for (let s = 0; s < steps; s++) {
      const px = a.x + along.x * (s + .5), pz = a.z + along.z * (s + .5), rise = walk * (s + 1) / steps;
      b.box('#9a7650', px, ground + rise - .06, pz, 1.25, .12, Math.hypot(along.x, along.z) + .02, yaw);
    }
    for (const side of [-1, 1]) {
      const nx = Math.cos(yaw) * .62 * side, nz = -Math.sin(yaw) * .62 * side;
      b.beam('#58422f', [a.x + nx, ground, a.z + nz], [c.x + nx, ground + walk, c.z + nz], .12, .22);
    }
    box((a.x + c.x) / 2, (a.z + c.z) / 2, Math.abs(c.x - a.x) / 2 + .7, Math.abs(c.z - a.z) / 2 + .7, 'wall-stair');
  }

  // Notices: orders on the parade ground.
  const orders = gateRoadPoint(5, -12);
  signs.notice({ x: orders.x, z: orders.z, label: 'Orders', facing: Math.atan2(-(-OUTPOST_ROAD.east.z), -OUTPOST_ROAD.east.x) + Math.PI, parent });
  b.finish(parent);

  // The Legate's standard: the Legion's eagle-red while the Empire holds the plain, the Republic's blue if it falls.
  {
    const s = L.standard, sy = y(s.x, s.z), pole = createSceneryBuilder('Outpost standard pole');
    pole.cylinder('#6d5439', s.x, sy, s.z, .12, 8.2);
    pole.cylinder('#7d7a70', s.x, sy, s.z, .55, .4, 0, 7);
    pole.beam('#58422f', [s.x, sy + 7.3, s.z - 1.3], [s.x, sy + 7.3, s.z + .15], .08);
    pole.finish(parent);
    circle(s.x, s.z, .6, 'legion-standard');
    const flag = (holds, colour, trim, name) => {
      const f = createSceneryBuilder(name);
      f.sheet(colour, [s.x, sy + 7.25, s.z - .05], [s.x, sy + 7.25, s.z - 1.3], [s.x + .06, sy + 5.45, s.z - 1.25], [s.x + .06, sy + 5.55, s.z - .05]);
      f.sheet(trim, [s.x + .01, sy + 6.7, s.z - .25], [s.x + .01, sy + 6.7, s.z - 1.05], [s.x + .02, sy + 6.0, s.z - 1.05], [s.x + .02, sy + 6.0, s.z - .25]);
      const mesh = f.finish(parent);
      movingGroups.add(mesh);
      stakedProps.push({ object: mesh, holds, region: 'Moros Plain', id: name });
    };
    flag('empire', LEGION_RED, GOLD, 'The Legate’s standard');
    flag('coalition', REPUBLIC_BLUE, WHITE, 'The Republic’s flag over the outpost');
  }

  // -------------------------------------------------------------------------
  // The forward stockade on the border
  // -------------------------------------------------------------------------
  drawCircuit(STOCKADE_CIRCUIT, { parent, heightAt, colliders, style: 'timber', name: 'The border stockade' });
  colliders.push(...STOCKADE_CIRCUIT.colliders);
  {
    const s = createSceneryBuilder('The border stockade interior');
    const t = STOCKADE_LAYOUT.truce, ty = y(t.x, t.z);
    s.cylinder('#6d5439', t.x, ty, t.z, .11, 9.0);
    s.cylinder('#7d7a70', t.x, ty, t.z, .5, .35);
    s.sheet(WHITE, [t.x, ty + 8.9, t.z], [t.x + 1.7, ty + 8.8, t.z + .1], [t.x + 1.6, ty + 7.6, t.z + .12], [t.x, ty + 7.7, t.z]);
    circle(t.x, t.z, .55, 'truce-pole');
    const h = STOCKADE_LAYOUT.shelter, hy = y(h.x, h.z);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.beam('#6d5439', [h.x + sx * 1.6, hy, h.z + sz * 1.1], [h.x + sx * 1.6, hy + (sz < 0 ? 2.4 : 1.9), h.z + sz * 1.1], .1);
    s.sheet('#a39570', [h.x - 1.9, hy + 2.45, h.z - 1.35], [h.x + 1.9, hy + 2.45, h.z - 1.35], [h.x + 1.9, hy + 1.85, h.z + 1.35], [h.x - 1.9, hy + 1.85, h.z + 1.35]);
    s.block('#9c7a52', h.x - .8, hy, h.z - .4, .8, .8, .8); s.cylinder('#8c6a47', h.x + .7, hy, h.z - .3, .36, .9);
    circle(h.x, h.z, 1.9, 'stockade-shelter');
    s.finish(parent);
    signs.notice({ x: STOCKADE_LAYOUT.notice.x, z: STOCKADE_LAYOUT.notice.z, label: 'Truce', facing: -Math.PI / 2, parent });
  }

  // -------------------------------------------------------------------------
  // The Moros gate: two great posts under a beam, leaves swung back, wings and a watch platform
  // -------------------------------------------------------------------------
  {
    const gate = STORY_SITES.morosGate, g = createSceneryBuilder('The Moros gate');
    const u = roadAxis(gate, roadDistance), n = { x: -u.z, z: u.x }, gy = y(gate.x, gate.z);
    const at = (along, across) => ({ x: gate.x + u.x * along + n.x * across, z: gate.z + u.z * along + n.z * across });
    const yaw = Math.atan2(u.x, u.z);
    for (const side of [-1, 1]) {
      const p = at(0, side * 5.4), py = y(p.x, p.z);
      g.block('#8f9087', p.x, py - .1, p.z, 1.1, .7, 1.1, yaw);
      g.block('#6f5238', p.x, py, p.z, .5, 5.1, .5, yaw);
      g.cone('#58422f', p.x, py + 5.1, p.z, .42, .45, yaw + Math.PI / 4, 4);
      circle(p.x, p.z, .55, 'moros-gate-post');
      // The leaf, swung back along the wing toward the plain.
      const hinge = at(.3, side * 5.0), tip = at(4.6, side * 5.0);
      g.beam('#6f5238', [hinge.x, py + .55, hinge.z], [tip.x, py + .55, tip.z], .14, .16);
      g.beam('#6f5238', [hinge.x, py + 1.55, hinge.z], [tip.x, py + 1.55, tip.z], .14, .16);
      g.beam('#6f5238', [hinge.x, py + .55, hinge.z], [tip.x, py + 1.55, tip.z], .1, .12);
      g.beam('#6f5238', [tip.x, py, tip.z], [tip.x, py + 1.7, tip.z], .14);
      // Wings of palisade either side, running out from the posts across the old copse line.
      for (let k = 0; k < 20; k++) {
        const w = at(0, side * (6.3 + k * .42)), wy = y(w.x, w.z), h = 2.6 + (k % 3) * .12;
        g.block(k % 2 ? '#6f5238' : '#634833', w.x, wy, w.z, .38, h, .34, yaw);
        g.cone('#634833', w.x, wy + h, w.z, .25, .35, yaw + Math.PI / 4, 4);
      }
      const w0 = at(0, side * 6.1), w1 = at(0, side * 14.5);
      g.beam('#58422f', [w0.x, y(w0.x, w0.z) + 1.6, w0.z], [w1.x, y(w1.x, w1.z) + 1.6, w1.z], .12, .18);
      const mid = at(0, side * 10.3);
      push({ x: mid.x, z: mid.z, r: .35, kind: 'moros-gate-wing' });
      for (let k = 0; k <= 12; k++) { const w = at(0, side * (6.2 + k * .7)); push({ x: w.x, z: w.z, r: .3, kind: 'moros-gate-wing' }); }
    }
    const beamA = at(0, -5.9), beamB = at(0, 5.9);
    g.beam('#58422f', [beamA.x, gy + 4.7, beamA.z], [beamB.x, gy + 4.7, beamB.z], .34, .42);
    // The watch platform, on the north side of the gate.
    const w = at(-3.5, 10.5), wy = y(w.x, w.z), deck = 3.4;
    for (const sa of [-1, 1]) for (const sc of [-1, 1]) {
      const p = at(-3.5 + sa * 1.4, 10.5 + sc * 1.4);
      g.beam('#634833', [p.x, y(p.x, p.z), p.z], [p.x, wy + deck + 2.6, p.z], .2);
      circle(p.x, p.z, .22, 'watch-platform');
    }
    g.box('#9a7650', w.x, wy + deck, w.z, 3.3, .16, 3.3, yaw);
    for (const [sa, sc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const p = at(-3.5 + sa * 1.62, 10.5 + sc * 1.62);
      g.box('#6f5238', p.x, wy + deck + .55, p.z, sa ? .12 : 3.3, .9, sa ? 3.3 : .12, yaw);
    }
    g.roof('#6d5a43', w.x, wy + deck + 2.6, w.z, 3.8, 3.8, 1.0, yaw);
    const ladderA = at(-5.2, 9.8), ladderB = at(-5.2, 11.2);
    for (const p of [ladderA, ladderB]) g.beam('#58422f', [p.x - u.x * .9, y(p.x, p.z), p.z - u.z * .9], [p.x, wy + deck + .9, p.z], .08);
    for (let r = 0; r < 8; r++) {
      const f = (r + .5) / 8, a = { x: ladderA.x - u.x * .9 * (1 - f), z: ladderA.z - u.z * .9 * (1 - f) }, c = { x: ladderB.x - u.x * .9 * (1 - f), z: ladderB.z - u.z * .9 * (1 - f) };
      g.beam('#6f5238', [a.x, wy + deck * f, a.z], [c.x, wy + deck * f, c.z], .05);
    }
    g.finish(parent);
    // The border stone at the gate, and the gate's name for travelers coming up from Luscia.
    const stone = at(-1.5, -8.2);
    signs.border({ x: stone.x, z: stone.z, facing: yaw, parent,
      faces: [{ label: 'Luscia', paint: SIGN_COLOURS.paint.luscia }, { label: 'Moros Plain', paint: SIGN_COLOURS.paint.moros }] });
    const board = at(-9, -7.6);
    signs.place({ x: board.x, z: board.z, label: 'The Moros Gate', facing: yaw + Math.PI + .5, parent });
  }

  // -------------------------------------------------------------------------
  // The wayside between the gate and the outpost
  // -------------------------------------------------------------------------
  buildMorosWayside({ parent, heightAt, push, circle, box, signs });
}

/** The road's heading at a point, from its nearest segment. */
function roadAxis(point, roadDistance) {
  const probe = [];
  for (let a = 0; a < Math.PI; a += Math.PI / 36) {
    const d = { x: Math.sin(a), z: Math.cos(a) };
    probe.push({ d, score: roadDistance(point.x + d.x * 6, point.z + d.z * 6) + roadDistance(point.x - d.x * 6, point.z - d.z * 6) });
  }
  const best = probe.sort((p, q) => p.score - q.score)[0].d;
  // Point along the road toward the Moros (west).
  return best.x > 0 ? { x: -best.x, z: -best.z } : best;
}

function buildMorosWayside({ parent, heightAt, push, circle, box, signs }) {
  const b = createSceneryBuilder('The Moros wayside');
  const y = (x, z) => heightAt(x, z);
  const byId = Object.fromEntries(MOROS_WAYSIDE.map(p => [p.id, p]));
  const local = (frame, along, across) => ({ x: frame.x + frame.dir.x * along + frame.left.x * across, z: frame.z + frame.dir.z * along + frame.left.z * across });

  // Cart ruts: two long dark grooves on the verge, and a broken wheel left in them.
  {
    const r = byId['moros-ruts'].frame;
    for (const across of [-.8, .8]) for (let k = 0; k < 7; k++) {
      const p = local(r, -12 + k * 4, across + Math.sin(k * 1.3) * .15);
      b.patch('#8b7d55', heightAt, p.x, p.z, .35, 4.2, r.yaw, .025, 1);
    }
    const wheel = local(r, 3, 2.6), wy = y(wheel.x, wheel.z);
    for (let s = 0; s < 8; s++) { const a = s / 8 * Math.PI * 2; b.beam('#5b4431', [wheel.x + Math.cos(a) * .7, wy + .08, wheel.z + Math.sin(a) * .7], [wheel.x + Math.cos(a + .8) * .7, wy + .08, wheel.z + Math.sin(a + .8) * .7], .1); }
    for (let s = 0; s < 4; s++) { const a = s / 4 * Math.PI; b.beam('#6f5238', [wheel.x + Math.cos(a) * .65, wy + .1, wheel.z + Math.sin(a) * .65], [wheel.x - Math.cos(a) * .65, wy + .1, wheel.z - Math.sin(a) * .65], .06); }
  }

  // The shepherd's fold: a ring of dry stone with a hurdle gate facing the road, and a turf lean-to.
  {
    const f = byId['shepherds-fold'].frame, fy = y(f.x, f.z), radius = 6.2;
    const gapAngle = Math.atan2(-f.left.x, -f.left.z);   // toward the road
    for (let k = 0; k < 34; k++) {
      const a = k / 34 * Math.PI * 2, gap = Math.abs(Math.atan2(Math.sin(a - gapAngle), Math.cos(a - gapAngle))) < .17;
      const p = { x: f.x + Math.sin(a) * radius, z: f.z + Math.cos(a) * radius };
      if (gap) continue;
      b.rock(k % 3 ? '#9a9888' : '#8b8a7c', p.x, y(p.x, p.z) + .45, p.z, .75, .55, .6, a);
      b.rock('#a3a192', p.x, y(p.x, p.z) + .95, p.z, .5, .3, .45, a + 1);
      circle(p.x, p.z, .62, 'fold-wall');
    }
    const g = { x: f.x + Math.sin(gapAngle) * radius, z: f.z + Math.cos(gapAngle) * radius }, gy = y(g.x, g.z);
    const tang = { x: Math.cos(gapAngle), z: -Math.sin(gapAngle) };
    for (let h = 0; h < 3; h++) b.beam('#8a7a55', [g.x - tang.x * 1.1 + Math.sin(gapAngle) * .3, gy + .3 + h * .35, g.z - tang.z * 1.1 + Math.cos(gapAngle) * .3], [g.x + tang.x * .2 + Math.sin(gapAngle) * 1.2, gy + .3 + h * .35, g.z + tang.z * .2 + Math.cos(gapAngle) * 1.2], .06);
    const lean = { x: f.x - Math.sin(gapAngle) * 3.2, z: f.z - Math.cos(gapAngle) * 3.2 }, ly = y(lean.x, lean.z);
    b.frame(lean.x, ly, lean.z, gapAngle, () => {
      for (const sx of [-1, 1]) b.beam('#6d5439', [sx * 1.3, 0, .6], [sx * 1.3, 1.6, .6], .1);
      b.quad('#7d7a55', [-1.5, 1.7, .7], [1.5, 1.7, .7], [1.5, .1, -1.1], [-1.5, .1, -1.1]);
      b.block('#7b6f55', 0, 0, -.6, 2.6, .3, .8);
    });
    circle(lean.x, lean.z, 1.5, 'fold-shelter');
  }

  // The Legion picket: a wattle windbreak, a tent, a cold brazier and a spear rack.
  {
    const p = byId['legion-picket'].frame;
    const wind0 = local(p, -4.5, 3.2), wind1 = local(p, 3.5, 4.4);
    const count = 14;
    for (let k = 0; k <= count; k++) {
      const q = { x: wind0.x + (wind1.x - wind0.x) * k / count, z: wind0.z + (wind1.z - wind0.z) * k / count }, qy = y(q.x, q.z);
      b.beam('#6d5439', [q.x, qy, q.z], [q.x, qy + 1.9, q.z], .07);
      if (k % 2 === 0) circle(q.x, q.z, .45, 'picket-windbreak');
    }
    for (let h = 0; h < 6; h++) b.beam('#8a7a55', [wind0.x, y(wind0.x, wind0.z) + .3 + h * .28, wind0.z], [wind1.x, y(wind1.x, wind1.z) + .3 + h * .28, wind1.z], .09, .12);
    const tent = local(p, -1, 7), ty = y(tent.x, tent.z);
    b.tent(CANVAS, tent.x, ty, tent.z, 3.0, 3.6, 1.7, p.yaw, CANVAS_DARK);
    box(tent.x, tent.z, 2.0, 2.0, 'picket-tent');
    const brazier = local(p, 1.2, 1.2), by = y(brazier.x, brazier.z);
    for (let s = 0; s < 3; s++) { const a = s / 3 * Math.PI * 2; b.beam(IRON, [brazier.x + Math.sin(a) * .35, by, brazier.z + Math.cos(a) * .35], [brazier.x, by + .7, brazier.z], .05); }
    b.cylinder(IRON, brazier.x, by + .65, brazier.z, .35, .25);
    b.box('#2f2a25', brazier.x, by + .92, brazier.z, .45, .06, .45);
    circle(brazier.x, brazier.z, .45, 'brazier');
    const rack = local(p, -3.5, 1.4), ry = y(rack.x, rack.z);
    for (let s = 0; s < 3; s++) b.beam('#6d5439', [rack.x + p.dir.x * s * .3, ry, rack.z + p.dir.z * s * .3], [rack.x + p.dir.x * s * .3 + p.left.x * .3, ry + 2.1, rack.z + p.dir.z * s * .3 + p.left.z * .3], .04);
    circle(rack.x, rack.z, .4, 'spear-rack');
  }

  // A dead campfire: a blackened ring, charred ends and a cracked pot.
  {
    const c = byId['dead-campfire'].frame, cy = y(c.x, c.z);
    for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; b.rock('#4f4b45', c.x + Math.sin(a) * .7, cy + .12, c.z + Math.cos(a) * .7, .22, .16, .2, a); }
    b.patch('#3b352f', heightAt, c.x, c.z, 1.1, 1.1, 0, .03, 1);
    for (const a of [.4, 1.9]) b.beam('#2c2723', [c.x - Math.cos(a) * .5, cy + .1, c.z - Math.sin(a) * .5], [c.x + Math.cos(a) * .5, cy + .1, c.z + Math.sin(a) * .5], .13);
    b.cylinder('#5a4e44', c.x + 1.5, cy, c.z + .6, .26, .32);
    circle(c.x, c.z, .8, 'dead-campfire');
  }
  b.finish(parent);

  // Milestones counting down to the outpost gate.
  for (const stone of MOROS_MILESTONES) signs.milestone({ x: stone.frame.x, z: stone.frame.z, label: stone.label, facing: stone.frame.yaw + Math.PI / 2, parent });
}
