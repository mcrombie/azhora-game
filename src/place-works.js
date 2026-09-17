import { createSceneryBuilder } from './scenery-builder.js';
import {
  AVREL_HAMLET, CALOSS_GATEHOUSE, FERNWAY_SHELTER, CROSSING_CAMP, REED_LANDING, SHRINE_COURT, SHRINE_CENTRE, RELAY_YARD,
  LAUVEL_AFTERMATH, HAMLET_RUINS, LUMBER_TOWN_WORKS, avrel, hamlet,
} from './places.js';
import { DRENT_WAYSIDE } from './wayside.js';
import { LUMBER_TOWN, CALOSS_GATE } from './region-world.js';
import { SIGN_COLOURS } from './signs.js';

/**
 * Draws the built-up places of Drent and Luscia (`places.js`) and the Drent
 * wayside (`wayside.js`). One merged mesh per place, colliders for everything
 * that stands.
 */
const WOOD = '#71523a', WOOD_LIGHT = '#ab7950', WOOD_DARK = '#59432e', THATCH = '#a08a5c', STONE = '#8f9087', STONE_DARK = '#77786f';
const PLASTER = '#d8c9a4', ROOF = '#6f7a70', CANVAS = '#cdbf96', HAY = '#bba266', CHAR = '#2e2a26', IRON = '#4d4b47';

export function buildPlaceWorks({ parent, heightAt, colliders, signs, roadDistance }) {
  const push = collider => { colliders.push(collider); return collider; };
  const circle = (x, z, r, kind) => push({ x, z, r, kind });
  const y = (x, z) => heightAt(x, z);
  /** Colliders for a turned rectangle: a box when it sits square to the world, a row of circles when it does not. */
  function footprint(x, z, yaw, width, depth, kind) {
    const square = Math.abs(Math.sin(yaw * 2)) < 1e-3;
    if (square) {
      const along = Math.abs(Math.cos(yaw)) > .5;
      return push({ x, z, hx: (along ? width : depth) / 2, hz: (along ? depth : width) / 2, kind });
    }
    const long = Math.max(width, depth), short = Math.min(width, depth), axis = width >= depth ? { x: Math.cos(yaw), z: -Math.sin(yaw) } : { x: Math.sin(yaw), z: Math.cos(yaw) };
    const count = Math.max(1, Math.ceil(long / short)), r = short / 2 * 1.08;
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : -long / 2 + short / 2 + (long - short) * i / (count - 1);
      push({ x: x + axis.x * t, z: z + axis.z * t, r, kind });
    }
  }
  /** A cottage-sized building: footing, walls, a gable roof, a door and windows on its front (local -z). */
  function building(b, { x, z, yaw = 0, width, depth }, { wall = PLASTER, roof = ROOF, height = 2.8, chimney = true, footing = STONE_DARK, door = true, kind = 'house', collide = true } = {}) {
    const ground = Math.min(y(x, z), y(x + width / 2, z), y(x - width / 2, z), y(x, z + depth / 2), y(x, z - depth / 2));
    b.frame(x, ground, z, yaw, () => {
      b.block(footing, 0, -.4, 0, width + .3, .8, depth + .3);
      b.block(wall, 0, .35, 0, width, height, depth);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.block(WOOD_DARK, sx * (width / 2 - .05), .35, sz * (depth / 2 - .05), .2, height + .05, .2);
      b.roof(roof, 0, height + .35, 0, width + .9, depth + .9, 1.9, Math.PI / 2, wall);
      if (door) { b.block(WOOD_DARK, 0, .35, -depth / 2 - .03, 1.1, 2.0, .08); b.block('#997348', 0, .4, -depth / 2 - .08, .9, 1.85, .05); }
      for (const sx of [-1, 1]) b.block(WOOD_DARK, sx * width * .3, 1.4, -depth / 2 - .03, .9, .9, .07);
      if (chimney) b.block('#b38e77', width * .3, height + .6, depth * .2, .6, 2.4, .6);
    });
    if (collide) footprint(x, z, yaw, width + .3, depth + .3, kind);
  }
  /** An open-fronted shed or lean-to on posts, its low side at the back (local +z). */
  function shed(b, { x, z, yaw = 0, width, depth }, { roof = THATCH, high = 2.7, low = 1.9, kind = 'shed', posts = 3, walls = true } = {}) {
    const ground = y(x, z);
    b.frame(x, ground, z, yaw, () => {
      for (let i = 0; i < posts; i++) {
        const px = -width / 2 + width * i / (posts - 1);
        b.block(WOOD, px, 0, -depth / 2, .2, high, .2); b.block(WOOD, px, 0, depth / 2, .2, low, .2);
      }
      b.quad(roof, [-width / 2 - .3, high + .05, -depth / 2 - .4], [width / 2 + .3, high + .05, -depth / 2 - .4], [width / 2 + .3, low + .05, depth / 2 + .3], [-width / 2 - .3, low + .05, depth / 2 + .3]);
      b.box(WOOD_DARK, 0, high - .05, -depth / 2, width + .2, .14, .14);
      if (walls) b.block('#8b6c4a', 0, 0, depth / 2 - .05, width, low - .1, .12);
    });
    const c = Math.cos(yaw), s = Math.sin(yaw);
    for (let i = 0; i < posts; i++) {
      const px = -width / 2 + width * i / (posts - 1);
      for (const pz of [-depth / 2, depth / 2]) circle(x + px * c + pz * s, z - px * s + pz * c, .2, kind);
    }
    if (walls) footprint(x + (depth / 2 - .05) * s, z + (depth / 2 - .05) * c, yaw, width, .5, kind);
  }
  const logs = (b, x, z, yaw, count = 5, length = 4.2, radius = .3, tint = '#6d5439') => {
    const ground = y(x, z);
    b.frame(x, ground, z, yaw, () => {
      let k = 0;
      for (let row = 0; k < count; row++) for (let i = 0; i < 3 - row && k < count; i++, k++) {
        const lx = (i - (2 - row) / 2) * radius * 2.05, ly = radius + row * radius * 1.75;
        b.beam(k % 2 ? tint : '#7b5f42', [lx, ly, -length / 2], [lx, ly, length / 2], radius * 1.8, radius * 1.8);
        b.box('#c4a878', lx, ly, length / 2 + .01, radius * 1.4, radius * 1.4, .02);
      }
    });
    footprint(x, z, yaw, radius * 6.5, length, 'log-stack');
  };
  const cart = (b, x, z, yaw, load = HAY) => {
    const ground = y(x, z);
    b.frame(x, ground, z, yaw, () => {
      b.box(WOOD_LIGHT, 0, .75, 0, 1.6, .14, 2.8);
      for (const sx of [-1, 1]) {
        b.box(WOOD, sx * .8, 1.0, 0, .1, .45, 2.8);
        b.cylinder(WOOD_DARK, sx * 1.0, .1, .2, .62, .12, 0, 7);
      }
      for (const sx of [-1, 1]) b.beam(WOOD, [sx * .35, .7, 1.4], [sx * .25, .45, 3.3], .1);
      if (load) { b.box(load, 0, 1.15, -.1, 1.45, .7, 2.5); b.cone(load, 0, 1.45, -.1, .9, .5, 0, 6); }
    });
    footprint(x, z, yaw, 2.2, 3.2, 'cart');
  };
  const fenceLine = (b, a, c, kind = 'fence', tint = WOOD_LIGHT, height = 1.15) => {
    const length = Math.hypot(c.x - a.x, c.z - a.z), n = Math.max(1, Math.round(length / 2.2));
    for (let i = 0; i <= n; i++) { const px = a.x + (c.x - a.x) * i / n, pz = a.z + (c.z - a.z) * i / n; b.block(WOOD, px, y(px, pz), pz, .14, height + .1, .14); }
    for (const h of [.5, height - .1]) b.beam(tint, [a.x, y(a.x, a.z) + h, a.z], [c.x, y(c.x, c.z) + h, c.z], .09, .11);
    const m = Math.max(1, Math.ceil(length / .75));
    for (let i = 0; i <= m; i++) circle(a.x + (c.x - a.x) * i / m, a.z + (c.z - a.z) * i / m, .28, kind);
  };
  const stoneWall = (b, a, c, kind = 'field-wall', height = .95) => {
    const length = Math.hypot(c.x - a.x, c.z - a.z), n = Math.max(1, Math.round(length / .9));
    for (let i = 0; i <= n; i++) {
      const px = a.x + (c.x - a.x) * i / n, pz = a.z + (c.z - a.z) * i / n, py = y(px, pz);
      b.rock(i % 3 ? STONE : STONE_DARK, px, py + height * .35, pz, .55, height * .42, .5, i * 1.3);
      b.rock('#a3a192', px, py + height * .8, pz, .42, height * .26, .4, i * .7);
    }
    const m = Math.max(1, Math.ceil(length / .8));
    for (let i = 0; i <= m; i++) circle(a.x + (c.x - a.x) * i / m, a.z + (c.z - a.z) * i / m, .45, kind);
  };
  const barrel = (b, x, z) => { const g = y(x, z); b.cylinder('#8c6a47', x, g, z, .38, .95); b.cylinder(IRON, x, g + .2, z, .4, .06); b.cylinder(IRON, x, g + .75, z, .4, .06); };
  const crate = (b, x, z, size = .8, yaw = 0) => b.block('#9c7a52', x, y(x, z), z, size, size, size, yaw);
  const tree = (b, x, z, scale = 1, dead = false) => {
    const g = y(x, z), h = 3.2 * scale;
    b.cylinder(dead ? CHAR : '#795e41', x, g, z, .18 * scale, h);
    if (dead) {
      for (let k = 0; k < 4; k++) { const a = k * 1.7 + x; b.beam(CHAR, [x, g + h * (.55 + k * .1), z], [x + Math.sin(a) * 1.2 * scale, g + h * (.85 + k * .08), z + Math.cos(a) * 1.2 * scale], .07 * scale); }
    } else b.rock('#6f8f4a', x, g + h + .8 * scale, z, 1.5 * scale, 1.2 * scale, 1.5 * scale, x);
    circle(x, z, .3 * scale, dead ? 'dead-tree' : 'orchard-tree');
  };

  // -------------------------------------------------------------------------
  // Drent: the Avrel farmsteads
  // -------------------------------------------------------------------------
  {
    const b = createSceneryBuilder('The Avrel farmsteads');
    const A = AVREL_HAMLET;
    // The barn: stone ends, a timber side with great doors, and a long thatched roof.
    building(b, A.barn, { wall: '#8b6c4a', roof: THATCH, height: 3.6, chimney: false, footing: STONE, kind: 'barn' });
    b.frame(A.barn.x, y(A.barn.x, A.barn.z), A.barn.z, A.barn.yaw, () => {
      b.block(WOOD_DARK, 0, .35, -A.barn.depth / 2 - .06, 3.0, 2.9, .1);
      for (const sx of [-1, 1]) b.block(STONE, sx * (A.barn.width / 2 - .3), .35, 0, .6, 3.6, A.barn.depth);
    });
    // The byre: a low stone house for the cattle, a half-door and a midden beside it.
    building(b, A.byre, { wall: '#9a9888', roof: THATCH, height: 2.2, chimney: false, footing: STONE_DARK, kind: 'byre' });
    b.patch('#6f5d42', heightAt, A.byre.x - 5, A.byre.z, 3, 4, 0, .04, 1);
    // The stack yard: hay stacks on staddle stones inside a hurdle fence.
    {
      const s = A.stackYard;
      for (const [dx, dz] of [[-2.5, -2], [2.6, -1.5], [0, 2.8]]) {
        const hx = s.x + dx, hz = s.z + dz, hy = y(hx, hz);
        for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + .4; b.cylinder('#8a8779', hx + Math.sin(a) * .9, hy, hz + Math.cos(a) * .9, .16, .45); }
        b.cylinder(HAY, hx, hy + .45, hz, 1.3, 1.6); b.cone('#b39a5e', hx, hy + 2.05, hz, 1.45, 1.4);
        circle(hx, hz, 1.45, 'hay-stack');
      }
      const corners = [avrel(38.5, -40), avrel(53.5, -40), avrel(53.5, -26), avrel(40, -26)];
      for (let i = 0; i < 3; i++) fenceLine(b, corners[i], corners[i + 1], 'stack-yard-fence', '#8a7a55', 1.0);
    }
    for (const [a, c] of A.fieldWalls) stoneWall(b, a, c);
    // Corvan's post, now a proper lean-to with the Legion's flag on a crossbar.
    {
      const p = A.corvanPost, py = y(p.x, p.z);
      b.frame(p.x, py, p.z, p.yaw, () => {
        for (const sx of [-1, 1]) { b.block(WOOD, sx * 2.3, 0, -1.7, .18, 2.9, .18); b.block(WOOD, sx * 2.3, 0, 1.7, .18, 2.0, .18); }
        b.quad('#b8a374', [-2.7, 3.0, -2.1], [2.7, 3.0, -2.1], [2.7, 2.05, 2.1], [-2.7, 2.05, 2.1]);
        b.block('#8b6c4a', 0, 0, 1.65, 4.6, 1.9, .12);
        b.block(WOOD, 3.4, 0, 0, .14, 4.4, .14);
        b.box(WOOD_DARK, 3.4, 4.2, .55, .08, .08, 1.3);
        b.sheet('#8c3f38', [3.43, 4.15, 0], [3.43, 4.15, 1.15], [3.43, 2.95, 1.1], [3.43, 2.95, .05]);
        b.sheet(SIGN_COLOURS.paint.empire, [3.45, 3.8, .35], [3.45, 3.8, .8], [3.45, 3.35, .8], [3.45, 3.35, .35]);
      });
      circle(p.x + 3.4, p.z, .25, 'legion-standard');
      for (const sx of [-1, 1]) circle(p.x + sx * 2.3, p.z - 1.7, .2, 'shelter-post');
      footprint(p.x, p.z + 1.65, 0, 4.6, .4, 'shelter-wall');
    }
    // The farm's well by the farmhouse.
    {
      const w = A.well, wy = y(w.x, w.z);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; b.block(STONE, w.x + Math.sin(a) * .85, wy, w.z + Math.cos(a) * .85, .5, .8, .5, a); }
      for (const sx of [-1, 1]) b.beam(WOOD, [w.x + sx, wy, w.z], [w.x + sx, wy + 2.1, w.z], .1);
      b.roof(THATCH, w.x, wy + 2.1, w.z, 2.6, 1.4, .6, Math.PI / 2);
      circle(w.x, w.z, 1.2, 'farm-well');
    }
    cart(b, avrel(33, -12).x, avrel(33, -12).z, .4);
    b.finish(parent);
  }

  // -------------------------------------------------------------------------
  // Drent: the Caloss Gate gatehouse and guard hut, and Fernway Rest's shelter
  // -------------------------------------------------------------------------
  {
    const b = createSceneryBuilder('The Caloss Gate gatehouse');
    const G = CALOSS_GATEHOUSE, gy = y(G.front, G.z);
    for (const side of [-1, 1]) {
      const z = G.z + side * G.half;
      b.block(WOOD, G.back, y(G.back, z), z, .32, 5.3, .32);
      b.block(WOOD, G.front, y(G.front, z) + 2.4, z, .3, 2.9, .3);
      b.beam(WOOD_DARK, [G.back, gy + 3.3, z], [G.front, gy + 3.3, z], .24, .26);
      circle(G.back, z, .3, 'gatehouse-post');
    }
    // The upper room: a boarded box across the road on the four posts, and its own roof.
    b.block('#8b6c4a', (G.front + G.back) / 2, gy + 3.4, G.z, G.front - G.back + .5, 1.9, G.half * 2 + .6);
    for (const side of [-1, 1]) b.block('#2e2620', (G.front + G.back) / 2 + side * (G.front - G.back + .52) / 2, gy + 4.1, G.z, .05, .5, 1.2);
    b.roof(THATCH, (G.front + G.back) / 2, gy + 5.3, G.z, G.front - G.back + 1.4, G.half * 2 + 1.6, 1.6, 0);
    b.box(WOOD_DARK, (G.front + G.back) / 2, gy + 3.35, G.z, G.front - G.back + .7, .16, G.half * 2 + .8);
    // The guard hut: a log hut facing the road.
    const hut = G.hut, hy = y(hut.x, hut.z);
    b.frame(hut.x, hy, hut.z, hut.yaw, () => {
      for (let row = 0; row < 7; row++) {
        b.beam('#6d5439', [-2.1, .2 + row * .3, -1.7], [2.1, .2 + row * .3, -1.7], .28);
        b.beam('#6d5439', [-2.1, .2 + row * .3, 1.7], [2.1, .2 + row * .3, 1.7], .28);
        b.beam('#7b5f42', [-2, .35 + row * .3, -1.8], [-2, .35 + row * .3, 1.8], .28);
        b.beam('#7b5f42', [2, .35 + row * .3, -1.8], [2, .35 + row * .3, 1.8], .28);
      }
      b.roof(THATCH, 0, 2.3, 0, 5.0, 4.4, 1.3, Math.PI / 2);
      b.block('#2e2620', 0, 0, -1.86, .9, 1.8, .05);
    });
    footprint(hut.x, hut.z, hut.yaw, 4.4, 3.8, 'guard-hut');
    // Fernway Rest's shelter: three walls, a roof and a bench inside.
    const f = FERNWAY_SHELTER;
    shed(b, { x: f.x, z: f.z, yaw: f.yaw, width: 4.2, depth: 2.8 }, { roof: THATCH, kind: 'fernway-shelter', posts: 3 });
    b.frame(f.x, y(f.x, f.z), f.z, f.yaw, () => {
      for (const sx of [-1, 1]) b.block('#8b6c4a', sx * 2.1, 0, 0, .1, 1.7, 2.8);
      b.box(WOOD_LIGHT, 0, .5, .7, 3.4, .12, .6);
      for (const sx of [-1.4, 0, 1.4]) b.block(WOOD, sx, 0, .7, .12, .45, .45);
    });
    b.finish(parent);
    signs.place({ x: CALOSS_GATE.barrierX - 8, z: CALOSS_GATE.z - 7.5, label: 'The Caloss Gate', facing: -Math.PI / 2 - .5, parent });
  }

  // -------------------------------------------------------------------------
  // Drent: the wayside on the forest road
  // -------------------------------------------------------------------------
  {
    const b = createSceneryBuilder('The Drent wayside');
    const byId = Object.fromEntries(DRENT_WAYSIDE.map(p => [p.id, p]));
    const at = (frame, along, across) => ({ x: frame.x + frame.dir.x * along + frame.left.x * across, z: frame.z + frame.dir.z * along + frame.left.z * across });
    {
      const c = byId['charcoal-burners'].frame;
      for (const [along, across, r] of [[-4, 0, 2.6], [4.5, 2, 2.2]]) {
        const m = at(c, along, across), my = y(m.x, m.z);
        b.cone('#4c4a3e', m.x, my, m.z, r, r * .95, 0, 7); b.cone('#6b6a4f', m.x, my + r * .5, m.z, r * .6, r * .5, 0, 7);
        b.cylinder('#3a3530', m.x, my + r * .9, m.z, .14, .25);
        circle(m.x, m.z, r * .92, 'charcoal-stack');
      }
      const hut = at(c, 1, -7), hy = y(hut.x, hut.z);
      b.frame(hut.x, hy, hut.z, c.yaw, () => {
        b.tent('#6d5a43', 0, 0, 0, 3.2, 3.6, 2.2, 0, '#5b4a3a');
        b.block('#2e2620', 0, 0, 1.81, .8, 1.2, .05);
      });
      circle(hut.x, hut.z, 1.9, 'bark-hut');
      for (let k = 0; k < 6; k++) { const s = at(c, -9 + k * .6, -2.5); b.block('#3b3530', s.x, y(s.x, s.z), s.z, .5, .55, .5, k); }
      const rake = at(c, 8, -3);
      b.beam(WOOD, [rake.x, y(rake.x, rake.z), rake.z], [rake.x + .6, y(rake.x, rake.z) + 2.1, rake.z + .3], .06);
    }
    {
      const f = byId['foresters-hut'].frame, hut = at(f, 0, 3), hy = y(hut.x, hut.z);
      const yaw = f.yaw + Math.PI / 2;
      b.frame(hut.x, hy, hut.z, yaw, () => {
        for (let row = 0; row < 8; row++) for (const [a0, a1, zz] of [[-2.6, 2.6, -2], [-2.6, 2.6, 2]]) b.beam(row % 2 ? '#6d5439' : '#7b5f42', [a0, .2 + row * .3, zz], [a1, .2 + row * .3, zz], .3);
        for (let row = 0; row < 8; row++) for (const xx of [-2.5, 2.5]) b.beam('#6d5439', [xx, .35 + row * .3, -2.1], [xx, .35 + row * .3, 2.1], .3);
        b.roof('#7a6a4e', 0, 2.55, 0, 6.2, 5.2, 1.6, Math.PI / 2);
        for (const sx of [-1, 1]) b.block(WOOD, sx * 2.4, 0, -3.1, .15, 2.4, .15);
        b.quad('#8a7a55', [-2.8, 2.5, -2.2], [2.8, 2.5, -2.2], [2.8, 2.3, -3.4], [-2.8, 2.3, -3.4]);
        b.block('#2e2620', 0, 0, -2.16, .9, 1.9, .05);
      });
      footprint(hut.x, hut.z, yaw, 5.4, 4.4, 'foresters-hut');
      for (const sx of [-1, 1]) circle(hut.x + Math.cos(yaw) * sx * 2.4 + Math.sin(yaw) * -3.1, hut.z - Math.sin(yaw) * sx * 2.4 + Math.cos(yaw) * -3.1, .18, 'porch-post');
      const block = at(f, 4.5, -2), by = y(block.x, block.z);
      b.cylinder('#7b5f42', block.x, by, block.z, .4, .6); b.beam('#8b8d88', [block.x, by + .6, block.z], [block.x + .3, by + 1.2, block.z + .2], .05);
      circle(block.x, block.z, .5, 'chopping-block');
      const rack = at(f, -4, -1.5), ry = y(rack.x, rack.z);
      for (let k = 0; k < 6; k++) b.beam(k % 2 ? '#c9b07a' : WOOD_LIGHT, [rack.x + k * .25, ry, rack.z], [rack.x + k * .25 + .2, ry + 2.6, rack.z - .4], .07);
      circle(rack.x + .6, rack.z, .6, 'pole-rack');
    }
    {
      const s = byId['wayside-shrine'].frame, sy = y(s.x, s.z);
      b.block(WOOD, s.x, sy, s.z, .22, 1.3, .22);
      b.block('#8f8d80', s.x, sy + 1.3, s.z, .8, .7, .55, s.yaw);
      b.roof('#6d5a43', s.x, sy + 2.0, s.z, 1.1, .8, .5, s.yaw + Math.PI / 2);
      b.box('#d8b24a', s.x, sy + 1.62, s.z + .01, .22, .22, .57, s.yaw);
      b.block('#8f9087', s.x, sy, s.z, 1.2, .25, .9, s.yaw);
      for (const [dx, tint] of [[-.35, '#c46b5b'], [.35, '#e0c47a']]) b.box(tint, s.x + dx * Math.cos(s.yaw), sy + .3, s.z - dx * Math.sin(s.yaw), .12, .12, .12);
      b.beam('#b54a3a', [s.x, sy + 1.9, s.z], [s.x + .3, sy + 1.2, s.z + .25], .02);
      circle(s.x, s.z, .6, 'wayside-shrine');
    }
    {
      const t = byId['timber-landing'].frame;
      logs(b, at(t, -4, 2).x, at(t, -4, 2).z, t.yaw, 6, 6.5, .34);
      logs(b, at(t, 4, 3).x, at(t, 4, 3).z, t.yaw, 5, 5.5, .3, '#6f5238');
      const skid = at(t, 0, -3.5);
      for (const off of [-.8, .8]) b.beam(WOOD_DARK, [skid.x + t.dir.x * 3 + t.left.x * off, y(skid.x, skid.z) + .1, skid.z + t.dir.z * 3 + t.left.z * off], [skid.x - t.dir.x * 3 + t.left.x * off, y(skid.x, skid.z) + .1, skid.z - t.dir.z * 3 + t.left.z * off], .16);
    }
    b.finish(parent);
  }

  // -------------------------------------------------------------------------
  // Luscia: the crossing camp, the reed landing, Sava's court and the relay yard
  // -------------------------------------------------------------------------
  {
    const b = createSceneryBuilder('Luscia’s river places');
    const C = CROSSING_CAMP;
    for (const t of C.timber) logs(b, t.x, t.z, t.yaw, 6, 5.2, .26, '#9a7650');
    {
      const s = C.sawhorses, sy = y(s.x, s.z);
      b.frame(s.x, sy, s.z, s.yaw, () => {
        for (const zz of [-1.2, 1.2]) for (const sx of [-1, 1]) b.beam(WOOD, [sx * .45, 0, zz], [0, 1.0, zz], .08);
        b.box('#b08a5c', 0, 1.1, 0, .32, .28, 3.6);
        b.box('#9c9e98', .3, 1.25, .4, .02, .5, 1.1);
      });
      footprint(s.x, s.z, s.yaw, 1.2, 3.6, 'sawhorse');
    }
    {
      const h = C.ferryHut;
      building(b, { x: h.x, z: h.z, yaw: h.yaw, width: 4.4, depth: 3.6 }, { wall: '#8b6c4a', roof: THATCH, height: 2.2, chimney: true, kind: 'ferry-hut' });
      const j = C.jetty, jy = Math.min(y(j.x, j.z), 1.2);
      b.frame(j.x, jy, j.z, j.yaw, () => {
        for (let k = 0; k < 9; k++) b.box(WOOD_LIGHT, 0, .5, -4 + k * .9, 2.0, .12, .8);
        for (const zz of [-4, 0, 4]) for (const sx of [-1, 1]) b.block(WOOD_DARK, sx * .9, -1.5, zz, .18, 2.2, .18);
        b.box('#6f5a44', 1.9, .35, 1.5, .9, .3, 3.2);
      });
    }
    const R = REED_LANDING;
    for (const r of R.racks) {
      const ry = y(r.x, r.z);
      b.frame(r.x, ry, r.z, r.yaw, () => {
        for (const sx of [-2, 2]) b.block(WOOD, sx, 0, 0, .12, 2.2, .12);
        b.box(WOOD_DARK, 0, 2.1, 0, 4.4, .1, .1);
        for (let k = 0; k < 11; k++) b.beam('#b6a36a', [-1.9 + k * .38, 2.1, 0], [-1.9 + k * .38, .6, .15], .08, .05);
      });
      footprint(r.x, r.z, r.yaw, 4.4, .6, 'reed-rack');
    }
    for (const s of R.stacks) { const sy = y(s.x, s.z); b.cone('#a99b62', s.x, sy, s.z, 1.1, 2.0, s.x, 6); b.cylinder('#8a7a55', s.x, sy + .8, s.z, .75, .12); circle(s.x, s.z, 1.0, 'reed-stack'); }
    {
      const p = R.punt, py = y(p.x, p.z);
      b.frame(p.x, py, p.z, p.yaw, () => {
        for (const zz of [-1.4, 1.4]) b.block(WOOD_DARK, 0, 0, zz, 1.4, .55, .2);
        b.box('#6f8074', 0, .75, 0, 1.2, .12, 3.8); for (const sx of [-1, 1]) b.box('#5f6f64', sx * .6, .95, 0, .08, .35, 3.8);
      });
      footprint(p.x, p.z, p.yaw, 1.6, 3.8, 'punt');
    }
    // Sava's court: low walls on three sides, open toward the road, and offerings along the step.
    {
      const c = SHRINE_COURT.centre, w = SHRINE_COURT.width / 2, d = SHRINE_COURT.depth / 2;
      const corner = (dx, dz) => ({ x: c.x + dx, z: c.z + dz });
      const low = (a, e) => {
        const length = Math.hypot(e.x - a.x, e.z - a.z), n = Math.max(1, Math.round(length / 1.2));
        for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n, px = a.x + (e.x - a.x) * (t0 + t1) / 2, pz = a.z + (e.z - a.z) * (t0 + t1) / 2; b.block(i % 2 ? '#b0afa0' : '#a6a99a', px, y(px, pz) - .1, pz, Math.abs(e.x - a.x) > .1 ? length / n + .02 : .55, 1.15, Math.abs(e.z - a.z) > .1 ? length / n + .02 : .55); }
        b.beam('#c3c2b3', [a.x, y(a.x, a.z) + 1.08, a.z], [e.x, y(e.x, e.z) + 1.08, e.z], .7, .1);
        const m = Math.ceil(length / .7);
        for (let i = 0; i <= m; i++) circle(a.x + (e.x - a.x) * i / m, a.z + (e.z - a.z) * i / m, .35, 'shrine-court');
      };
      // The back wall to the east, and north and south returns that stop short of the road on the west.
      low(corner(w, -d), corner(w, d)); low(corner(w, -d), corner(-w + SHRINE_COURT.returnsStop, -d)); low(corner(w, d), corner(-w + SHRINE_COURT.returnsStop, d));
      b.patch('#b9b6a0', heightAt, c.x - .5, c.z, SHRINE_COURT.width - 1.5, SHRINE_COURT.depth - 1.2, 0, .035, 4);
      const s = SHRINE_CENTRE, sy = y(s.x, s.z);
      for (let k = 0; k < 7; k++) {
        const ox = s.x - 1.8 + k * .6, oz = s.z + 1.1;
        if (k % 2) { b.cylinder('#e8dfc3', ox, sy + .36, oz, .05, .22); b.cylinder('#f0c86a', ox, sy + .58, oz, .03, .06); }
        else b.rock(['#c46b5b', '#e0c47a', '#8fb07a'][k % 3], ox, sy + .42, oz, .1, .08, .1);
      }
      for (let k = 0; k < 4; k++) b.beam(['#b54a3a', '#3f5f86', '#e0c47a', '#8fb07a'][k], [s.x - 1.5 + k, sy + 2.2, s.z + .42], [s.x - 1.45 + k, sy + 1.5, s.z + .5], .03, .08);
    }
    // The relay yard: a fence, a signal mast with a lamp bracket, and a notice nobody has read since the clerk left.
    {
      const R2 = RELAY_YARD, m = R2.mast, my = y(m.x, m.z);
      b.cylinder(WOOD, m.x, my, m.z, .14, 7.5);
      b.beam(WOOD_DARK, [m.x - 1, my + 6.6, m.z], [m.x + 1, my + 6.6, m.z], .1);
      for (const sx of [-1, 1]) b.block(IRON, m.x + sx * .95, my + 6.0, m.z, .25, .45, .25);
      b.block(STONE, m.x, my - .2, m.z, 1.1, .6, 1.1);
      circle(m.x, m.z, .7, 'signal-mast');
      for (let i = 1; i < R2.fence.length; i++) fenceLine(b, R2.fence[i - 1], R2.fence[i], 'relay-fence');
    }
    b.finish(parent);
    signs.notice({ x: RELAY_YARD.notice.x, z: RELAY_YARD.notice.z, label: 'Notices', facing: RELAY_YARD.notice.yaw, parent });
  }

  // -------------------------------------------------------------------------
  // Luscia: the field at the Lauvel and the burned hamlet
  // -------------------------------------------------------------------------
  {
    const b = createSceneryBuilder('The Lauvel aftermath');
    const L = LAUVEL_AFTERMATH;
    {
      const h = L.hospital, hy = y(h.x, h.z);
      b.frame(h.x, hy, h.z, h.yaw, () => {
        b.block('#b3a47c', 0, 0, 0, h.width, 1.5, h.depth);
        b.roof(CANVAS, 0, 1.5, 0, h.width + .4, h.depth + .3, 1.9, Math.PI / 2, '#b3a47c');
        b.block('#3b3126', 0, 0, -h.depth / 2 - .02, 1.6, 1.4, .05);
        b.sheet('#c7bea7', [-.8, 1.45, -h.depth / 2 - .03], [-1.8, 1.45, -h.depth / 2 - .9], [-1.8, 0, -h.depth / 2 - .9], [-.8, 0, -h.depth / 2 - .03]);
        b.box('#e9e3d0', 0, 2.6, -h.depth / 2 - .05, 1.0, .9, .03);
        b.box('#b54a3a', 0, 2.6, -h.depth / 2 - .07, .22, .7, .03); b.box('#b54a3a', 0, 2.6, -h.depth / 2 - .07, .7, .22, .03);
        for (let k = 0; k < 3; k++) { b.box('#8a8266', -2.5 + k * 2.4, .25, h.depth / 2 + 1.3, .8, .12, 1.9); b.box('#c7bea7', -2.5 + k * 2.4, .33, h.depth / 2 + .7, .6, .12, .5); }
      });
      footprint(h.x, h.z, h.yaw, h.width + .3, h.depth + .3, 'field-hospital');
    }
    {
      const c = L.cairn, cy = y(c.x, c.z);
      for (let ring = 0; ring < 4; ring++) {
        const n = 9 - ring * 2, r = 1.6 - ring * .38;
        for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + ring; b.rock(ring % 2 ? STONE : STONE_DARK, c.x + Math.sin(a) * r, cy + .3 + ring * .45, c.z + Math.cos(a) * r, .5 - ring * .06, .38, .45, a); }
      }
      b.beam(WOOD_DARK, [c.x, cy + 1.6, c.z], [c.x, cy + 3.0, c.z], .09);
      b.beam(WOOD_DARK, [c.x - .5, cy + 2.6, c.z], [c.x + .5, cy + 2.6, c.z], .07);
      circle(c.x, c.z, 1.9, 'cairn');
    }
    for (const t of L.trampled) b.patch('#7d7152', heightAt, t.x, t.z, 9, 6, t.x * .3, .03, 3);
    L.debris.forEach((d, i) => {
      const dy = y(d.x, d.z);
      b.beam('#6d5439', [d.x - 1.1, dy + .06, d.z - .3], [d.x + 1.1, dy + .08, d.z + .4], .06);
      if (i % 2) { b.cylinder('#5d6f86', d.x + .8, dy + .02, d.z - .6, .42, .05); b.cylinder('#8b8d88', d.x + .8, dy + .07, d.z - .6, .08, .04); }
      else for (let k = 0; k < 3; k++) b.beam('#6d5439', [d.x - .6 + k * .4, dy, d.z + .9], [d.x - .7 + k * .4, dy + .7, d.z + 1.1], .025);
    });
    b.finish(parent);
  }
  {
    const b = createSceneryBuilder('The burned hamlet ruins');
    const H = HAMLET_RUINS;
    for (const [i, house] of H.houses.entries()) {
      // A roofless stone shell: ragged walls, a gap for the door facing the yard, fallen charred timbers and rubble.
      const { x, z, width: w, depth: d } = house, hy = Math.min(y(x - w / 2, z - d / 2), y(x + w / 2, z + d / 2), y(x, z));
      const toward = Math.sign(hamlet(0, 0).z - z) || 1;   // the door faces the yard
      const wallTint = i % 2 ? '#6f6656' : '#665e50';
      const ragged = (n, k) => 1.2 + ((n * 7 + k * 3) % 5) * .22;
      const run = (x0, z0, x1, z1, gap = null) => {
        const length = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(length / .9));
        for (let k = 0; k < n; k++) {
          const t = (k + .5) / n, px = x0 + (x1 - x0) * t, pz = z0 + (z1 - z0) * t;
          if (gap && Math.abs(t - .5) * length < gap) continue;
          const h = ragged(i, k), horizontal = Math.abs(x1 - x0) > Math.abs(z1 - z0);
          b.block(wallTint, px, hy - .1, pz, horizontal ? length / n + .02 : .45, h, horizontal ? .45 : length / n + .02);
          push({ x: px, z: pz, hx: horizontal ? length / n / 2 + .01 : .23, hz: horizontal ? .23 : length / n / 2 + .01, kind: 'hamlet-wall' });
        }
      };
      run(x - w / 2, z - d / 2 * toward * -1, x + w / 2, z - d / 2 * toward * -1);             // back wall
      run(x - w / 2, z + d / 2 * toward, x + w / 2, z + d / 2 * toward, .7);                   // front wall with its doorway
      run(x - w / 2, z - d / 2, x - w / 2, z + d / 2); run(x + w / 2, z - d / 2, x + w / 2, z + d / 2);
      if (house.chimney) { b.block('#7d7364', x + w / 2 - .5, hy - .1, z - d / 2 * toward * -1, 1.0, 4.6, 1.0); }
      b.beam(CHAR, [x - w / 2 + .3, hy + 1.6, z - d / 3], [x + w / 4, hy + .15, z + d / 3], .18);
      b.beam(CHAR, [x + w / 2 - .3, hy + 1.1, z - d / 4], [x - w / 5, hy + .12, z + d / 5], .16);
      for (let k = 0; k < 5; k++) b.rock('#5f574b', x - 1 + k * .5, hy + .15, z + (d / 2 + .6) * toward + (k % 2) * .3, .3, .2, .28, k);
    }
    {
      const w = H.well, wy = y(w.x, w.z);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; b.block(i === 3 ? '#4f4a42' : '#6f6656', w.x + Math.sin(a) * .85, wy, w.z + Math.cos(a) * .85, .5, i === 3 ? .35 : .75, .5, a); }
      b.beam(CHAR, [w.x - 1, wy, w.z], [w.x - 1, wy + 1.9, w.z], .1);
      b.beam(CHAR, [w.x + 1, wy, w.z], [w.x + .4, wy + .9, w.z + .6], .1);
      b.beam(CHAR, [w.x - 1, wy + 1.9, w.z], [w.x + .6, wy + .2, w.z + .8], .08);
      circle(w.x, w.z, 1.2, 'hamlet-well');
    }
    H.orchard.forEach((t, i) => tree(b, t.x, t.z, .8 + (i % 3) * .12, true));
    b.patch('#4a453c', heightAt, hamlet(22, -5).x, hamlet(22, -5).z, 22, 18, .2, .03, 5);
    b.finish(parent);
  }

  // -------------------------------------------------------------------------
  // Lumber Town: gates, smithy, hall, lived-in detail and the stable yard
  // -------------------------------------------------------------------------
  {
    const b = createSceneryBuilder('Lumber Town’s new works');
    const T = LUMBER_TOWN_WORKS;
    const across = LUMBER_TOWN.across, along = LUMBER_TOWN.along;
    for (const gate of T.gates) {
      const gy = y(gate.x, gate.z), yaw = Math.atan2(along.x, along.z);
      const side = (b0) => ({ x: gate.x + across.x * b0, z: gate.z + across.z * b0 });
      for (const s of [-1, 1]) {
        const post = side(s * 5.2), py = y(post.x, post.z);
        b.block(WOOD_DARK, post.x, py, post.z, .45, 4.6, .45, yaw);
        b.cone(WOOD_DARK, post.x, py + 4.6, post.z, .4, .4, yaw + Math.PI / 4, 4);
        circle(post.x, post.z, .45, 'town-gate-post');
        // Leaves swung back along the palisade, outward of the road.
        const tip = { x: post.x - along.x * Math.sign(gate.a) * 3.9 - across.x * s * .5, z: post.z - along.z * Math.sign(gate.a) * 3.9 - across.z * s * .5 };
        for (const h of [.6, 1.7]) b.beam('#6f5238', [post.x - across.x * s * .4, py + h, post.z - across.z * s * .4], [tip.x, y(tip.x, tip.z) + h, tip.z], .12, .16);
        b.beam('#6f5238', [tip.x, y(tip.x, tip.z), tip.z], [tip.x, y(tip.x, tip.z) + 1.9, tip.z], .14);
        for (let k = 0; k < 28; k++) {
          const w = side(s * (6 + k * .42)), wy = y(w.x, w.z), h = 2.7 + (k % 3) * .12;
          b.block(k % 2 ? '#6f5238' : '#634833', w.x, wy, w.z, .38, h, .34, yaw);
          b.cone('#634833', w.x, wy + h, w.z, .25, .35, yaw + Math.PI / 4, 4);
        }
        for (let k = 0; k <= 16; k++) { const w = side(s * (6 + k * .74)); circle(w.x, w.z, .32, 'town-palisade'); }
      }
      const beamA = side(-5.6), beamB = side(5.6);
      b.beam(WOOD_DARK, [beamA.x, gy + 4.3, beamA.z], [beamB.x, gy + 4.3, beamB.z], .3, .38);
      // A little watch hut roofed over the east end of each gate's palisade.
      const hut = side(-9), hy = y(hut.x, hut.z);
      const out = { x: -along.x * Math.sign(gate.a), z: -along.z * Math.sign(gate.a) };
      const hx = hut.x + out.x * 2.2, hz = hut.z + out.z * 2.2;
      for (const s2 of [-1, 1]) for (const s3 of [-1, 1]) { const px = hx + across.x * s2 * 1.1 + out.x * s3 * 1.0, pz = hz + across.z * s2 * 1.1 + out.z * s3 * 1.0; b.block(WOOD, px, y(px, pz), pz, .15, 2.4, .15); circle(px, pz, .17, 'town-watch-hut'); }
      b.roof(THATCH, hx, hy + 2.4, hz, 2.8, 2.6, .9, yaw);
    }
    // The smithy: a stone forge building open to the road, its anvil under the eaves.
    {
      const s = T.smithy, sy = y(s.x, s.z);
      building(b, { x: s.x, z: s.z, yaw: s.yaw, width: s.width, depth: s.depth }, { wall: '#9a9888', roof: '#5f5f5a', height: 2.6, chimney: true, kind: 'smithy' });
      b.frame(s.x, sy, s.z, s.yaw, () => {
        for (const sx of [-1, 1]) b.block(WOOD, sx * 3, 0, -3.8, .18, 2.6, .18);
        b.quad('#6d5a43', [-3.4, 2.75, -2.6], [3.4, 2.75, -2.6], [3.4, 2.5, -4.2], [-3.4, 2.5, -4.2]);
        b.cylinder('#6d5439', 1.3, 0, -3.2, .3, .5); b.block(IRON, 1.3, .5, -3.2, .5, .22, .2);
        b.block('#3b3530', -1.6, 0, -2.9, .9, .9, .6); b.box('#9c4a26', -1.6, .95, -2.9, .6, .06, .4);
      });
      const c = Math.cos(s.yaw), n = Math.sin(s.yaw);
      for (const sx of [-1, 1]) circle(s.x + sx * 3 * c - 3.8 * n, s.z - sx * 3 * n - 3.8 * c, .2, 'smithy-porch');
      circle(s.x + 1.3 * c - 3.2 * n, s.z - 1.3 * n - 3.2 * c, .45, 'anvil');
    }
    // The hall: long, whitewashed, a bell cote over its door.
    {
      const h = T.hall;
      building(b, { x: h.x, z: h.z, yaw: h.yaw, width: h.width, depth: h.depth }, { wall: '#e0d6bc', roof: '#6a5a48', height: 3.4, chimney: false, kind: 'town-hall' });
      b.frame(h.x, y(h.x, h.z), h.z, h.yaw, () => {
        b.block('#e0d6bc', 0, 3.8, -h.depth / 2 + .6, 1.2, 2.6, 1.0);
        b.roof('#6a5a48', 0, 6.4, -h.depth / 2 + .6, 1.6, 1.4, .8, Math.PI / 2);
        b.cylinder('#8a7440', 0, 5.2, -h.depth / 2 + .6, .3, .45);
        for (const sx of [-2.8, 2.8]) b.block('#3b3126', sx, 1.4, -h.depth / 2 - .04, .7, 1.2, .05);
      });
    }
    // Carts, washing lines and the notice board.
    for (const c of T.carts) cart(b, c.x, c.z, c.yaw, c.a > 0 ? '#9a7650' : HAY);
    for (const [a, e] of T.washing) {
      for (const p of [a, e]) { b.block(WOOD, p.x, y(p.x, p.z), p.z, .12, 2.3, .12); circle(p.x, p.z, .18, 'washing-post'); }
      b.beam('#d8cfb4', [a.x, y(a.x, a.z) + 2.1, a.z], [e.x, y(e.x, e.z) + 2.1, e.z], .02);
      for (let k = 1; k < 6; k++) {
        const t = k / 6, px = a.x + (e.x - a.x) * t, pz = a.z + (e.z - a.z) * t, py = y(a.x, a.z) + (y(e.x, e.z) - y(a.x, a.z)) * t + 2.08;
        const dx = (e.x - a.x) / 12, dz = (e.z - a.z) / 12;
        b.sheet(['#e9e3d0', '#b7c4c8', '#d8c29a', '#e9e3d0', '#c7a79a'][k - 1], [px - dx, py, pz - dz], [px + dx, py, pz + dz], [px + dx, py - 1.0 + (k % 2) * .3, pz + dz], [px - dx, py - 1.0 + (k % 2) * .3, pz - dz]);
      }
    }
    // The stable yard: a stable, a trough, a hitching rail and a paddock, all clear of the ostler's stand and the hitch.
    {
      const s = T.stable, sy = y(s.x, s.z), yaw = Math.atan2(along.x, along.z) + Math.PI / 2;
      b.frame(s.x, sy, s.z, yaw, () => {
        b.block('#8b6c4a', 0, 0, s.depth / 2 - .1, s.width, 2.6, .2);
        for (const sx of [-1, 1]) b.block('#8b6c4a', sx * (s.width / 2 - .1), 0, 0, .2, 2.6, s.depth);
        for (let k = 0; k <= 3; k++) b.block(WOOD, -s.width / 2 + k * s.width / 3, 0, -s.depth / 2 + .1, .22, 2.8, .22);
        for (let k = 1; k < 3; k++) b.block(WOOD, -s.width / 2 + k * s.width / 3, 0, .4, .1, 1.3, s.depth - 1.2);
        for (let k = 0; k < 3; k++) b.block('#6f5238', -s.width / 2 + (k + .5) * s.width / 3, 0, -s.depth / 2 + .15, s.width / 3 - .4, 1.1, .08);
        b.roof(THATCH, 0, 2.7, 0, s.width + .8, s.depth + .9, 1.5, Math.PI / 2, '#8b6c4a');
        b.block(HAY, -s.width / 2 + 1, 0, 1, 1.2, .9, 1.2);
      });
      footprint(s.x, s.z, yaw, s.width + .2, s.depth + .2, 'stable');
      const t = T.trough, ty = y(t.x, t.z), tYaw = Math.atan2(along.x, along.z);
      b.block('#6f5238', t.x, ty, t.z, 1.8, .6, .6, tYaw); b.box('#58727a', t.x, ty + .57, t.z, 1.6, .04, .45, tYaw);
      footprint(t.x, t.z, tYaw, 1.8, .6, 'horse-trough');
      const r = T.rail, ry = y(r.x, r.z), rYaw = Math.atan2(along.x, along.z);
      b.frame(r.x, ry, r.z, rYaw, () => { for (const zz of [-1.5, 0, 1.5]) b.block(WOOD, 0, 0, zz, .14, 1.15, .14); b.box(WOOD_LIGHT, 0, 1.1, 0, .12, .12, 3.2); });
      for (const zz of [-1.5, 0, 1.5]) circle(r.x + along.x * zz, r.z + along.z * zz, .2, 'hitching-rail');
      const P = T.paddock;
      for (let i = 0; i < P.length; i++) fenceLine(b, P[i], P[(i + 1) % P.length], 'paddock-fence');
      b.patch('#9a8a60', heightAt, (P[0].x + P[2].x) / 2, (P[0].z + P[2].z) / 2, 15, 9, rYaw + Math.PI / 2, .03, 3);
    }
    b.finish(parent);
    signs.notice({ x: T.notice.x, z: T.notice.z, label: 'Notices', facing: T.notice.yaw, parent });
    for (const gate of T.gates) {
      const out = Math.sign(gate.a), spot = { x: gate.x + along.x * out * 6 + across.x * -7.5, z: gate.z + along.z * out * 6 + across.z * -7.5 };
      signs.place({ x: spot.x, z: spot.z, label: 'Lumber Town', facing: Math.atan2(along.x * out, along.z * out) - .4 * out, parent });
    }
    const stableBoard = LUMBER_TOWN_WORKS.stable;
    signs.notice({ x: stableBoard.x - along.x * 5.8 - across.x * 2.2, z: stableBoard.z - along.z * 5.8 - across.z * 2.2, label: 'The Stable Yard', facing: Math.atan2(-across.x, -across.z), parent });
  }
}
