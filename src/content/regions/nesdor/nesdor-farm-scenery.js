import { finishBuild } from '../../../world/loading/build-steps.js';
import * as THREE from 'three';
import { createSceneryBuilder } from '../../../world/scenery/scenery-builder.js';
import { registerWorldTree } from '../../../world/scenery/tree-registry.js';
import { westWaterSurface } from '../western-regions/west-ground.js';
import {
  NESDOR_BED, NESDOR_STRIPS, NESDOR_HAZEL_TREES, NESDOR_BUILDINGS, NESDOR_SEED_BENCH, NESDOR_HIVES, NESDOR_INN_YARD,
  NESDOR_ORDER_BOARD, NESDOR_WRITING_DESK, NESDOR_MAILBOXES, NESDOR_CARICA_FORD, NESDOR_HAZEL_WORKS, NESDOR_ROADS,
} from './nesdor-farm.js';

/**
 * Nesdor's farm country for the Farmlands of the Lizeem (the user's design of 5 October 2026; built
 * 6 October 2026, "keep building everything"), in the project's low-poly way: timber-framed houses on
 * stone footings, thatch on the farm and the cottage, shingle on the inn and slate on the arbiter's
 * house, the strips dressed with what grows wild on each ground, the Way and the farm roads as worn
 * earth that stops at every water's edge.
 *
 * Five meshes: one merged builder for each of the three places (Ninehands, the hazel wood, the Counted
 * Water), one for every yard, margin and road, and the nameplates and the inn sign on one atlas. The
 * playable beds are left bare, as the regional farms leave theirs: src/gameplay/skills/farming/farming-view.js draws their
 * soil and their crops. Each house is a solid collider; the coppice stools are registered trees that
 * cannot be felled. Coordinates are src/content/regions/nesdor/nesdor-farm.js's.
 */
export function createNesdorFarmScenery(...args) { return finishBuild(createNesdorFarmScenerySteps(...args)); }

const freeze = Object.freeze;
const C = freeze({
  plinth: '#8f8a76', stone: '#9c9682', daub: '#d4c8a3', limewash: '#e0d8bc', grey: '#c5bfa7', timber: '#5f4b33', dark: '#3f362b',
  thatch: '#a8945c', thatchRidge: '#86743f', shingle: '#6b5d4a', slate: '#5c6164', door: '#3d3226', glass: '#3a4140', shutter: '#6d5a3c',
  straw: '#cbb36e', strawDark: '#a28a4b', sack: '#bcae86', iron: '#4f524c', water: '#5f7e82', paper: '#e4dcc0', ink: '#1f2326',
  yard: '#a69a76', track: '#ad9f79', way: '#b2a47d', farmRoad: '#ab9e78', lane: '#a39a74',
  puddle: '#4d5c5f', silt: '#aba48d', crack: '#7e7866', dry: '#a08d64',
  rush: '#3f5c35', rushTip: '#77653f', dockStem: '#7c3a2c', stone2: '#a29d8b',
  hazelLeaf: '#7d9a4f', hazelLeafDark: '#69853f', hazelBark: '#86704f', stool: '#5b4a35', nut: '#a3853f', husk: '#93a35a',
  charcoal: '#3d3a34', turf: '#5f6d43', ashBox: '#c2b493', flowerBlue: '#6d6fa8', flowerWhite: '#e7e3d2', flowerYellow: '#d8b84a',
});
/** How each ground reads from the margin: its turf, what lies between the beds, its dock leaf and its marker rag. */
const GROUND = freeze({
  wet: freeze({ margin: '#62744d', gap: C.puddle, dock: '#3f5b33', rag: '#45606e' }),
  bench: freeze({ margin: '#8e8d6c', gap: C.silt, dock: '#5d8040', rag: '#b08a3e' }),
  rise: freeze({ margin: '#ae9f73', gap: C.dry, dock: '#a5a253', rag: '#d9cfa8' }),
});
const DOOR = freeze({ north: freeze({ x: 0, z: -1 }), south: freeze({ x: 0, z: 1 }), east: freeze({ x: 1, z: 0 }), west: freeze({ x: -1, z: 0 }) });
const STYLE = freeze({
  farmhouse: freeze({ wall: C.daub, roof: C.thatch, ridge: C.thatchRidge, rise: 3.3, chimney: true }),
  barn: freeze({ wall: '#a98f68', roof: C.thatch, ridge: C.thatchRidge, rise: 3.6, wideDoor: true }),
  'malt-house': freeze({ wall: C.daub, roof: C.thatch, ridge: C.thatchRidge, rise: 2.5, kiln: true }),
  cottage: freeze({ wall: '#cdbf98', roof: C.thatch, ridge: C.thatchRidge, rise: 2.8, chimney: true }),
  inn: freeze({ wall: C.limewash, roof: C.shingle, ridge: '#54483a', rise: 3.4, chimney: true, storeys: 2, porch: true }),
  house: freeze({ wall: C.grey, roof: C.slate, ridge: '#474b4d', rise: 2.6, chimney: true, timber: '#3f3a33' }),
});
const hash = (a, b = 0) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };

export function* createNesdorFarmScenerySteps({ parent, heightAt, colliders = [] }) {
  let work = 0;
  const tick = () => ++work % 8 === 0;
  const root = new THREE.Group(); root.name = 'Nesdor farm country'; parent.add(root);
  const farm = createSceneryBuilder('Ninehands'), wood = createSceneryBuilder('The hazel wood'),
    inn = createSceneryBuilder('The Counted Water'), ground = createSceneryBuilder('Nesdor yards, strips and the Way');
  const metrics = { buildings: 0, strips: 0, markers: 0, hazels: 0, mailboxes: 0, roads: 0, roadPatches: 0, batches: 0, vertices: 0, colliders: 0 };
  const collide = collider => { colliders.push(collider); metrics.colliders++; return collider; };
  // Every ground patch starts a fresh slice, so terrain sampling stays bounded between yields.
  function* patch(...args) { yield; return yield* ground.patchSteps(...args); }
  const y = (x, z) => heightAt(x, z);
  const underWater = (x, z) => { const surface = westWaterSurface(x, z); return surface !== null && surface > y(x, z) - .05; };
  const kitFor = id => (id === 'idunn-house' ? wood : id === 'counted-water' || id === 'forseti-house' ? inn : farm);

  // -------------------------------------------------------------------------
  // Buildings
  // -------------------------------------------------------------------------
  function* building(b) {
    const kit = kitFor(b.id), s = STYLE[b.kind], timber = s.timber ?? C.timber;
    const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => y(b.x + sx * b.w / 2, b.z + sz * b.d / 2));
    const low = Math.min(...corners, y(b.x, b.z)), floor = Math.max(...corners) + .12, top = floor + b.h;
    kit.block(C.plinth, b.x, low - .4, b.z, b.w + .5, floor - low + .4, b.d + .5);
    kit.block(s.wall, b.x, floor, b.z, b.w, b.h, b.d);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.block(timber, b.x + sx * (b.w / 2 - .1), floor, b.z + sz * (b.d / 2 - .1), .26, b.h, .26);
    kit.block(timber, b.x, top - .2, b.z, b.w + .1, .22, b.d + .1);
    kit.block(timber, b.x, floor + b.h / 2 - .08, b.z, b.w + .06, .16, b.d + .06);
    if (tick()) yield;
    // Studs along the long walls, a bay every two metres or so.
    const along = b.w >= b.d, length = along ? b.w : b.d, bays = Math.max(2, Math.round(length / 2.2));
    for (let i = 1; i < bays; i++) for (const side of [-1, 1]) {
      const u = -length / 2 + length * i / bays;
      if (along) kit.block(timber, b.x + u, floor, b.z + side * (b.d / 2 + .02), .16, b.h, .06);
      else kit.block(timber, b.x + side * (b.w / 2 + .02), floor, b.z + u, .06, b.h, .16);
    }
    if (tick()) yield;
    // Roof: the ridge runs the long way; the eaves overhang a little, the gables are closed.
    const rise = s.rise;
    if (along) kit.roof(s.roof, b.x, top, b.z, b.d + 1.1, b.w + .9, rise, Math.PI / 2, s.wall);
    else kit.roof(s.roof, b.x, top, b.z, b.w + 1.1, b.d + .9, rise, 0, s.wall);
    kit.box(s.ridge, b.x, top + rise + .05, b.z, along ? b.w + 1 : .32, .2, along ? .32 : b.d + 1);
    // The door, on the face the building names, and windows on the long faces.
    const n = DOOR[b.door], wide = s.wideDoor ? 3.2 : 1.25, high = s.wideDoor ? 3.2 : 2.15;
    const dx = b.x + n.x * (b.w / 2 + .03), dz = b.z + n.z * (b.d / 2 + .03);
    if (n.x) kit.block(C.door, dx, floor, dz, .1, high, wide); else kit.block(C.door, dx, floor, dz, wide, high, .1);
    if (n.x) kit.block(timber, dx + n.x * .03, floor + high, dz, .12, .18, wide + .3); else kit.block(timber, dx, floor + high, dz + n.z * .03, wide + .3, .18, .12);
    if (s.wideDoor) for (const k of [-1, 1]) {
      // Two leaves, each braced corner to corner.
      const off = k * wide * .42, ox = n.x ? 0 : off, oz = n.x ? off : 0, px = dx + n.x * .09, pz = dz + n.z * .09;
      kit.beam(timber, [px + ox, floor + .2, pz + oz], [px - ox * .05, floor + high - .2, pz - oz * .05], .1);
    }
    if (tick()) yield;
    for (let storey = 0; storey < (s.storeys ?? 1); storey++) for (const side of [-1, 1]) for (const u of [-.3, .3]) {
      const wy = floor + 1.15 + storey * 2.6, sx = along ? b.x + u * b.w : b.x + side * (b.w / 2 + .04), sz = along ? b.z + side * (b.d / 2 + .04) : b.z + u * b.d;
      // Never a window over the door.
      if (storey === 0 && Math.hypot(sx - dx, sz - dz) < wide / 2 + .9) continue;
      if (b.kind === 'barn') continue;
      if (along) { kit.block(C.glass, sx, wy, sz, .8, .75, .06); kit.block(C.shutter, sx - .62, wy - .02, sz, .42, .8, .07); kit.block(C.shutter, sx + .62, wy - .02, sz, .42, .8, .07); }
      else { kit.block(C.glass, sx, wy, sz, .06, .75, .8); kit.block(C.shutter, sx, wy - .02, sz - .62, .07, .8, .42); kit.block(C.shutter, sx, wy - .02, sz + .62, .07, .8, .42); }
    }
    if (tick()) yield;
    if (s.chimney) {
      // At the gable away from the door's end, through the roof.
      const cx = along ? b.x - Math.sign(dx - b.x || 1) * (b.w / 2 - .9) : b.x, cz = along ? b.z : b.z - Math.sign(dz - b.z || 1) * (b.d / 2 - .9);
      kit.block(C.stone, cx, top - .4, cz, .85, rise + 1.2, .85);
      kit.block(C.dark, cx, top + rise + .8, cz, .95, .14, .95);
    }
    if (s.kiln) {
      // The kiln end: a stone stack through the roof under a four-sided cowl, open at the eaves to let the reek out.
      const kx = b.x + b.w / 2 - 1.4;
      kit.block(C.stone, kx, top - .2, b.z, 2.2, rise + .9, 2.2);
      for (const [ox, oz] of [[-.95, -.95], [.95, -.95], [-.95, .95], [.95, .95]]) kit.block(C.dark, kx + ox, top + rise + .7, b.z + oz, .14, .55, .14);
      kit.cone(C.thatchRidge, kx, top + rise + 1.2, b.z, 1.75, 1.2, Math.PI / 4, 4);
    }
    if (s.porch) {
      const pz = b.z + n.z * (b.d / 2 + 1.1);
      for (const k of [-1, 1]) { kit.block(timber, dx + k * 1.3, floor, pz, .16, 2.6, .16); collide({ x: dx + k * 1.3, z: pz, r: .12, kind: 'nesdor-post' }); }
      kit.roof(s.roof, dx, floor + 2.6, b.z + n.z * (b.d / 2 + .7), 1.6, 3.2, .45, Math.PI / 2, s.wall);
    }
    collide({ x: b.x, z: b.z, hx: b.w / 2, hz: b.d / 2, minY: low - .5, maxY: top + rise + 1, kind: 'building', id: b.id });
    metrics.buildings++;
  }
  for (const b of NESDOR_BUILDINGS) { yield; (yield* building(b)); }

  // -------------------------------------------------------------------------
  // Ninehands: the yard, the seed bench, the barn's rick, the hives, the strips
  // -------------------------------------------------------------------------
  yield;
  (yield* patch(C.yard, y, -1595, 583, 18, 12, 0, .045, 5));
  (yield* patch(C.yard, y, -1613, 587.2, 3, 3.4, 0, .05, 2));
  {
    const bench = NESDOR_SEED_BENCH, by = y(bench.x, bench.z);
    for (const ox of [-.67, .67]) for (const oz of [-.25, .25]) farm.block(C.timber, bench.x + ox, y(bench.x + ox, bench.z + oz), bench.z + oz, .09, by + .86 - y(bench.x + ox, bench.z + oz), .09);
    farm.box('#a6936c', bench.x, by + .88, bench.z, 1.65, .12, .76);
    for (let k = 0; k < 3; k++) { farm.rock(k % 2 ? '#c5b792' : C.sack, bench.x - .47 + k * .47, by + 1.1, bench.z, .19, .23, .2, .2 + k); farm.cylinder(C.timber, bench.x - .47 + k * .47, by + 1.28, bench.z, .067, .07); }
    collide({ x: bench.x, z: bench.z, hx: .84, hz: .4, kind: 'farm-seed-bench', farmId: bench.farmId });
    const tub = { x: bench.x + 2.1, z: bench.z - .4 }, ty = y(tub.x, tub.z);
    farm.cylinder(C.timber, tub.x, ty, tub.z, .43, .55); farm.cylinder(C.water, tub.x, ty + .47, tub.z, .38, .01); farm.cylinder(C.iron, tub.x, ty + .16, tub.z, .44, .05);
    collide({ ...tub, r: .46, kind: 'farm-water-tub', farmId: bench.farmId });
  }
  {
    // The barn's rick, against its north end.
    const rick = { x: -1578, z: 568.2 }, ry = y(rick.x, rick.z);
    farm.cylinder(C.straw, rick.x, ry, rick.z, 1.5, 1.6); farm.cone(C.strawDark, rick.x, ry + 1.6, rick.z, 1.62, 1.5, .3);
    collide({ ...rick, r: 1.55, kind: 'nesdor-rick' });
    // Byggvir's malt sacks by the malt-house door, against the wall.
    for (let k = 0; k < 3; k++) { const sx = -1599.2 + k * .6, sz = 566.1; farm.rock(k === 1 ? '#c8b98f' : C.sack, sx, y(sx, sz) + .28, sz, .3, .32, .26, k); }
    collide({ x: -1598.6, z: 566.1, hx: 1, hz: .35, kind: 'nesdor-prop' });
  }
  if (tick()) yield;
  {
    // Beyla's skeps: four straw domes on a plank bench under a thatched lean-to, open to the south.
    const h = NESDOR_HIVES, hy = y(h.x, h.z), half = h.length / 2;
    for (const ox of [-half + .2, half - .2]) {
      farm.block(C.timber, h.x + ox, y(h.x + ox, h.z - .55), h.z - .55, .12, hy + 1.95 - y(h.x + ox, h.z - .55), .12);
      farm.block(C.timber, h.x + ox, y(h.x + ox, h.z + .55), h.z + .55, .12, hy + 1.45 - y(h.x + ox, h.z + .55), .12);
    }
    farm.sheet(C.thatch, [h.x - half - .1, hy + 2, h.z - .8], [h.x + half + .1, hy + 2, h.z - .8], [h.x + half + .1, hy + 1.45, h.z + .85], [h.x - half - .1, hy + 1.45, h.z + .85]);
    for (const ox of [-half + .6, 0, half - .6]) farm.block(C.timber, h.x + ox, y(h.x + ox, h.z), h.z, .1, hy + .5 - y(h.x + ox, h.z), .5);
    farm.box('#a6936c', h.x, hy + .55, h.z, h.length - .1, .1, .7);
    for (let k = 0; k < h.skeps; k++) {
      const sx = h.x - half + .9 + k * (h.length - 1.8) / (h.skeps - 1);
      farm.cone(C.straw, sx, hy + .6, h.z, .38, .62, k * .7, 7);
      for (const band of [.14, .3]) farm.cylinder(C.strawDark, sx, hy + .6 + band, h.z, .37 - band * .5, .04);
      farm.box(C.dark, sx, hy + .66, h.z + .33, .14, .07, .05);
    }
    collide({ x: h.x, z: h.z, hx: half + .15, hz: .9, kind: 'nesdor-hives', id: h.id });
    // What the bees are paid for: clover and heather in front of the hives.
    for (let k = 0; k < 18; k++) {
      const fx = h.x - half + hash(k, 3) * h.length, fz = h.z + 1.6 + hash(k, 7) * 2.2, fy = y(fx, fz);
      farm.rock(k % 3 === 0 ? C.flowerBlue : k % 3 === 1 ? C.flowerWhite : C.flowerYellow, fx, fy + .12, fz, .14, .1, .14, k);
      farm.rock(GROUND.bench.margin, fx + .1, fy + .05, fz - .08, .22, .07, .2, k);
    }
  }
  if (tick()) yield;

  /** A dock rosette: Baugi reads the ground by the colour of its leaves. */
  const dock = (kit, x, z, tint, stem, seed) => {
    const gy = y(x, z);
    for (let k = 0; k < 5; k++) {
      const a = seed + k * 1.26, cx = Math.cos(a), sz = Math.sin(a), len = .42 + hash(seed, k) * .2;
      kit.sheet(tint, [x, gy + .04, z], [x + cx * len * .5 - sz * .12, gy + .22, z + sz * len * .5 + cx * .12],
        [x + cx * len, gy + .16, z + sz * len], [x + cx * len * .5 + sz * .12, gy + .22, z + sz * len * .5 - cx * .12]);
    }
    if (stem) kit.beam(stem, [x, gy, z], [x + .03, gy + .62, z + .02], .035);
  };
  const rushes = (kit, x, z, seed) => {
    const gy = y(x, z);
    for (let k = 0; k < 5; k++) {
      const a = seed + k * 1.9, r = .08 + hash(seed, k) * .14, tall = .55 + hash(k, seed) * .35;
      kit.beam(k % 2 ? C.rush : '#4c6a3d', [x + Math.cos(a) * r, gy, z + Math.sin(a) * r], [x + Math.cos(a) * r * 2.2, gy + tall, z + Math.sin(a) * r * 2.2], .035);
    }
    kit.rock(C.rushTip, x, gy + .6, z, .05, .09, .05);
  };
  const marker = (point, ground, double, seed) => {
    const my = y(point.x, point.z), rag = GROUND[ground].rag;
    farm.stake(C.timber, point.x, my - .1, point.z, .14, 1.35, seed, .2);
    farm.box(rag, point.x, my + 1.08, point.z, .2, .2, .2, seed);
    if (double) farm.box(rag, point.x, my + .8, point.z, .2, .14, .2, seed + .4);
    collide({ x: point.x, z: point.z, r: .15, kind: 'nesdor-strip-marker' });
    metrics.markers++;
  };
  for (const [index, strip] of NESDOR_STRIPS.entries()) {
    yield;
    // Clear of a bed whichever way the farming view turns it.
    const g = GROUND[strip.ground], length = strip.end.x - strip.start.x, side = Math.max(NESDOR_BED.across, NESDOR_BED.along) / 2 + .55;
    // The baulks either side of the strip, in the turf the ground grows, and what lies between its beds.
    for (const sz of [-1, 1]) (yield* patch(g.margin, y, strip.x, strip.z + sz * side, length, .9, 0, .055, Math.ceil(length / 3.4)));
    for (let n = 1; n < strip.rows.length; n++) {
      const gx = (strip.rows[n - 1].x + strip.rows[n].x) / 2;
      (yield* patch(g.gap, y, gx, strip.z, NESDOR_BED.pitch - Math.max(NESDOR_BED.across, NESDOR_BED.along) - .2, NESDOR_BED.across - .2, 0, .045, 2));
    }
    // What grows wild on each ground: rushes and red-stemmed dock on the wet, green dock on the silt
    // of the bench with the crust cracking, yellowing dock and stones on the dry rise.
    for (let k = 0; k < Math.round(length / 1.6); k++) {
      if (tick()) yield;
      const u = strip.start.x + .8 + k * 1.6 + hash(k, index) * .5, sz = (k % 2 ? 1 : -1) * (side + .1 + hash(index, k) * .25);
      const px = u, pz = strip.z + sz;
      if (strip.ground === 'wet') { if (k % 3 === 2) dock(farm, px, pz, g.dock, C.dockStem, k); else rushes(farm, px, pz, k + index); }
      else if (strip.ground === 'bench') {
        if (k % 2) dock(farm, px, pz, g.dock, null, k);
        else { const cy = y(px, pz) + .065; farm.beam(C.crack, [px - .4, cy, pz - .1], [px + .1, cy, pz + .15], .03, .01); farm.beam(C.crack, [px + .1, cy, pz + .15], [px + .45, cy, pz - .05], .03, .01); }
      } else { if (k % 3 === 0) dock(farm, px, pz, g.dock, null, k); else farm.rock(C.stone2, px, y(px, pz) + .05, pz, .12 + hash(k, 2) * .1, .07, .1, k); }
    }
    if (strip.ground === 'wet') for (let k = 0; k < 3; k++) {
      // Standing water along the low baulk: a sheet a few centimetres over the ground, not a river.
      const px = strip.start.x + 2 + k * (length - 4) / 2, pz = strip.z + side + .2;
      (yield* patch(C.puddle, y, px, pz, 1.6 + hash(k) * .8, .7, (hash(k, 1) - .5) * .3, .07, 2));
    }
    marker(strip.start, strip.ground, strip.rows.length > 3, index);
    marker(strip.end, strip.ground, strip.rows.length > 3, index + .5);
    metrics.strips++;
  }

  // -------------------------------------------------------------------------
  // The hazel wood: the coppice, Idunn's work about her house
  // -------------------------------------------------------------------------
  for (const [index, tree] of NESDOR_HAZEL_TREES.entries()) {
    yield;
    const ty = y(tree.x, tree.z);
    wood.rock(C.stool, tree.x, ty + .12, tree.z, .62, .3, .58, index);
    // Cut to the ground and grown again: straight poles from one stool, nothing like a trunk.
    const poles = 8 + index % 3;
    for (let k = 0; k < poles; k++) {
      const a = index * .9 + k * 2.4, lean = .35 + hash(index, k) * .5, tall = 3.4 + hash(k, index) * 1.4, r0 = .22;
      const base = [tree.x + Math.cos(a) * r0, ty + .15, tree.z + Math.sin(a) * r0], tip = [tree.x + Math.cos(a) * (r0 + lean), ty + tall, tree.z + Math.sin(a) * (r0 + lean)];
      wood.beam(k % 2 ? C.hazelBark : '#7a6446', base, tip, .07);
      if (k % 2 === 0) wood.rock(k % 4 ? C.hazelLeaf : C.hazelLeafDark, tip[0], tip[1] - .5, tip[2], .62, .55, .62, a);
    }
    for (let k = 0; k < 3; k++) {
      const a = index + k * 2.1;
      wood.rock(k % 2 ? C.hazelLeafDark : C.hazelLeaf, tree.x + Math.cos(a) * .7, ty + 2.4 + k * .35, tree.z + Math.sin(a) * .7, .85, .6, .85, a);
      // Nuts in their husks, in clusters of two and three where a picker can see them.
      for (let m = 0; m < 3; m++) wood.rock(m === 2 ? C.nut : C.husk, tree.x + Math.cos(a) * 1.1 + m * .09, ty + 2.1 + k * .35 - m * .05, tree.z + Math.sin(a) * 1.1, .07, .08, .07);
    }
    const collider = collide({ x: tree.x, z: tree.z, r: .5, kind: 'nesdor-hazel-stool' });
    registerWorldTree(colliders, { id: tree.id, x: tree.x, z: tree.z, y: ty, species: 'common-hazel', radius: .5, harvestable: false,
      reason: 'Idunn’s coppice is cut on its own turn, for poles and for nuts. It is not yours to fell.' }, [], collider);
    metrics.hazels++;
  }
  {
    const { clamp, poles, box } = NESDOR_HAZEL_WORKS;
    // The charcoal clamp: a turfed mound with its vent, and a few burnt billets.
    const cy = y(clamp.x, clamp.z);
    wood.rock(C.charcoal, clamp.x, cy + .3, clamp.z, clamp.r, .85, clamp.r * .95, .4);
    for (let k = 0; k < 6; k++) { const a = k * 1.05; wood.rock(C.turf, clamp.x + Math.cos(a) * clamp.r * .6, cy + .62, clamp.z + Math.sin(a) * clamp.r * .6, .45, .18, .4, a); }
    wood.cylinder(C.dark, clamp.x, cy + 1.05, clamp.z, .16, .14);
    for (let k = 0; k < 4; k++) wood.beam('#2f2c28', [clamp.x + clamp.r + .4, cy + .08, clamp.z - .6 + k * .3], [clamp.x + clamp.r + 1.3, cy + .1, clamp.z - .5 + k * .3], .14);
    collide({ x: clamp.x, z: clamp.z, r: clamp.r, kind: 'nesdor-prop' });
    // Cut poles across two trestles, and two woven hurdles leaning on them.
    const py = y(poles.x, poles.z);
    for (const oz of [-1.4, 1.4]) { wood.beam(C.timber, [poles.x - .5, py, poles.z + oz], [poles.x, py + 1.1, poles.z + oz], .09); wood.beam(C.timber, [poles.x + .5, py, poles.z + oz], [poles.x, py + 1.1, poles.z + oz], .09); }
    for (let k = 0; k < 7; k++) wood.beam(k % 2 ? C.hazelBark : '#93795a', [poles.x - .2 + k * .07, py + 1.12 + (k % 2) * .07, poles.z - 2.2], [poles.x - .2 + k * .07, py + 1.12 + (k % 2) * .07, poles.z + 2.2], .07);
    for (const oz of [-.8, .8]) {
      wood.sheet('#8b7552', [poles.x + .55, py, poles.z + oz - .7], [poles.x + .55, py, poles.z + oz + .7], [poles.x + .25, py + 1.05, poles.z + oz + .7], [poles.x + .25, py + 1.05, poles.z + oz - .7]);
      for (let k = 0; k < 4; k++) wood.beam('#6f5c40', [poles.x + .55 - k * .075, py + k * .26 + .1, poles.z + oz - .7], [poles.x + .55 - k * .075, py + k * .26 + .1, poles.z + oz + .7], .04);
    }
    collide({ x: poles.x, z: poles.z, hx: .65, hz: 2.3, kind: 'nesdor-prop' });
    // The locked ash box the nut harvest is kept in, against the cottage wall by the door.
    const ay = y(box.x, box.z);
    wood.block(C.ashBox, box.x, ay, box.z, .55, .55, .95); wood.block('#ab9d7c', box.x, ay + .55, box.z, .6, .1, 1);
    for (const oz of [-.3, .3]) wood.block(C.iron, box.x, ay, box.z + oz, .58, .58, .05);
    wood.block(C.iron, box.x + .29, ay + .38, box.z, .05, .14, .1);
    collide({ x: box.x, z: box.z, hx: .32, hz: .52, kind: 'nesdor-prop' });
    (yield* patch(C.lane, y, -1541.5, 416, 3, 4, 0, .05, 2));
  }
  {
    // The ford post on the Nesdor bank: a pointing board toward the crossing and a cairn at its foot.
    const f = NESDOR_CARICA_FORD.post, fy = y(f.x, f.z), toward = Math.atan2(NESDOR_CARICA_FORD.crossing.x - f.x, NESDOR_CARICA_FORD.crossing.z - f.z);
    wood.stake(C.timber, f.x, fy - .1, f.z, .17, 2.1, toward, .22);
    wood.frame(f.x, fy, f.z, toward, () => { wood.box('#a6936c', 0, 1.75, .45, .12, .26, 1.1); wood.box(C.flowerWhite, 0, 1.45, .06, .2, .3, .05); });
    for (let k = 0; k < 4; k++) wood.rock(C.stone2, f.x + Math.cos(k * 1.6) * .35, fy + .14 + (k === 3 ? .22 : 0), f.z + Math.sin(k * 1.6) * .35, .3, .2, .26, k);
    collide({ x: f.x, z: f.z, r: .45, kind: 'nesdor-ford-post' });
  }
  if (tick()) yield;

  // -------------------------------------------------------------------------
  // The Counted Water: the yard, the sign, the board, Forseti's desk
  // -------------------------------------------------------------------------
  {
    const yd = NESDOR_INN_YARD;
    (yield* patch(C.yard, y, (yd.minX + yd.maxX) / 2, (yd.minZ + yd.maxZ) / 2, yd.maxX - yd.minX, yd.maxZ - yd.minZ, 0, .045, 5));
    (yield* patch(C.yard, y, -1420, 596.6, 5, 4, 0, .05, 2));
    (yield* patch(C.yard, y, -1419, 607.2, 3.4, 5, 0, .05, 2));
    // Rails on the north and east sides; the yard is open to the road.
    const rail = (a, b) => {
      const count = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.z - a.z) / 2.4));
      for (let k = 0; k <= count; k++) {
        const px = a.x + (b.x - a.x) * k / count, pz = a.z + (b.z - a.z) * k / count;
        inn.stake(C.timber, px, y(px, pz) - .1, pz, .13, 1.15, 0, .12);
        if (k) { const qx = a.x + (b.x - a.x) * (k - 1) / count, qz = a.z + (b.z - a.z) * (k - 1) / count;
          for (const ry of [.5, .95]) inn.beam(C.timber, [qx, y(qx, qz) + ry, qz], [px, y(px, pz) + ry, pz], .07); }
      }
      collide({ x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, hx: Math.abs(b.x - a.x) / 2 + .1, hz: Math.abs(b.z - a.z) / 2 + .1, kind: 'nesdor-fence' });
    };
    rail({ x: -1412.9, z: yd.minZ }, { x: yd.maxX, z: yd.minZ });
    rail({ x: yd.maxX, z: yd.minZ }, { x: yd.maxX, z: yd.maxZ - 1.5 });
    if (tick()) yield;
    const t = yd.table, ty = y(t.x, t.z);
    for (const ox of [-.9, .9]) inn.block(C.timber, t.x + ox, ty, t.z, .12, .78, .7);
    inn.box('#8d7552', t.x, ty + .82, t.z, 2.3, .09, .95);
    inn.block(C.timber, yd.bench.x, y(yd.bench.x, yd.bench.z), yd.bench.z, 2.1, .45, .38);
    for (const [k, ox] of [[0, -.5], [1, .45]]) { inn.cylinder('#8a6c45', t.x + ox, ty + .87, t.z + .1, .07, .14, k); }
    collide({ x: t.x, z: (t.z + yd.bench.z) / 2, hx: 1.2, hz: 1.1, kind: 'nesdor-prop' });
    // Aegir's barrels, against the inn's east wall.
    for (let k = 0; k < 3; k++) {
      const bx = yd.barrels.x, bz = yd.barrels.z + k * .9 - .2, bty = y(bx, bz);
      inn.cylinder('#7d6141', bx, bty, bz, .38, .95, k);
      for (const band of [.15, .78]) inn.cylinder(C.iron, bx, bty + band, bz, .4, .05);
    }
    collide({ x: yd.barrels.x, z: yd.barrels.z + .7, hx: .45, hz: 1.4, kind: 'nesdor-prop' });
    const tr = yd.trough, try_ = y(tr.x, tr.z);
    inn.block(C.timber, tr.x, try_, tr.z, .8, .6, 2.2); inn.box(C.water, tr.x, try_ + .56, tr.z, .62, .02, 2);
    collide({ x: tr.x, z: tr.z, hx: .42, hz: 1.12, kind: 'nesdor-prop' });
    // The sign: a post and an arm out over the road, the board hanging from it (the name is on the atlas).
    const s = yd.sign, sy = y(s.x, s.z);
    inn.block(C.timber, s.x, sy - .1, s.z, .18, 3.4, .18);
    inn.beam(C.timber, [s.x, sy + 3.1, s.z], [s.x - 1.5, sy + 3.1, s.z], .12);
    inn.beam(C.timber, [s.x, sy + 2.5, s.z], [s.x - .6, sy + 3.08, s.z], .08);
    for (const ox of [-.25, -1.25]) inn.beam(C.iron, [s.x + ox, sy + 3.05, s.z], [s.x + ox, sy + 2.75, s.z], .025);
    inn.box('#6b5435', s.x - .75, sy + 2.4, s.z, 1.72, .7, .07);
    collide({ x: s.x, z: s.z, r: .2, kind: 'nesdor-sign' });
  }
  if (tick()) yield;
  {
    // The Way board: two posts, a board with today's orders, a little roof. Its face is to the road.
    const b = NESDOR_ORDER_BOARD, by = y(b.x, b.z);
    inn.frame(b.x, by, b.z, b.yaw, () => {
      for (const k of [-1, 1]) inn.block(C.timber, k * .78, -.1, 0, .16, 2.4, .16);
      inn.block(C.timber, 0, .85, 0, 1.9, 1.2, .14);
      for (let k = 0; k < 3; k++) inn.block(C.paper, -.56 + k * .56, 1.02, .085, .42, .66, .025);
      inn.roof(C.slate, 0, 2.18, 0, .7, 2.1, .25, Math.PI / 2, C.timber);
    });
    collide({ x: b.x, z: b.z, hx: 1, hz: .22, kind: 'nesdor-board', id: b.id });
    // Forseti's desk under an awning on his east wall: a sloped writing top, ink, quill and papers, and a stool.
    const d = NESDOR_WRITING_DESK, dy = y(d.x, d.z), house = NESDOR_BUILDINGS.find(item => item.id === 'forseti-house');
    const wallX = house.x + house.w / 2, awningY = dy + 2.55;
    for (const oz of [-1.8, 1.8]) { inn.block(C.dark, d.x + 1.25, dy, d.z + oz, .12, awningY - .3 - dy, .12); collide({ x: d.x + 1.25, z: d.z + oz, r: .1, kind: 'nesdor-post' }); }
    inn.sheet(C.slate, [wallX, awningY, d.z - 2], [wallX, awningY, d.z + 2], [d.x + 1.45, awningY - .4, d.z + 2], [d.x + 1.45, awningY - .4, d.z - 2]);
    inn.frame(d.x, dy, d.z, d.yaw, () => {
      for (const ox of [-.5, .5]) for (const oz of [-.25, .25]) inn.block(C.dark, ox, 0, oz, .07, .78, .07);
      inn.box('#5a4834', 0, .86, 0, 1.15, .06, .62, 0, -.18);
      inn.box(C.paper, -.15, .9, .02, .42, .015, .3, .1, -.18);
      inn.box(C.paper, .25, .9, -.04, .3, .015, .36, -.15, -.18);
      inn.cylinder(C.ink, .45, .92, .2, .05, .08);
      inn.beam(C.flowerWhite, [.45, 1, .2], [.38, 1.24, .12], .015);
      inn.cylinder(C.dark, 0, 0, -.7, .2, .48);
    });
    collide({ x: d.x - .2, z: d.z, hx: .6, hz: .65, kind: 'nesdor-desk', id: d.id });
  }
  if (tick()) yield;

  // -------------------------------------------------------------------------
  // Mailboxes (named on the atlas below)
  // -------------------------------------------------------------------------
  for (const m of NESDOR_MAILBOXES) {
    const kit = m.id.startsWith('idunn') ? wood : m.id.startsWith('forseti') ? inn : farm, my = y(m.x, m.z);
    kit.frame(m.x, my, m.z, m.yaw, () => {
      kit.block('#73553d', 0, -.1, 0, .14, 1.3, .14);
      kit.box('#a38361', 0, 1.14, 0, .99, .09, .61);
      kit.block('#8d7b5c', 0, 1.18, 0, .85, .46, .52);
      kit.roof('#6b5d4a', 0, 1.64, 0, 1.03, .69, .2, Math.PI / 2, '#8d7b5c');
      kit.box(C.dark, 0, 1.5, .27, .46, .035, .018);
    });
    collide({ x: m.x, z: m.z, r: .5, kind: 'nesdor-mailbox', homeId: m.home });
    metrics.mailboxes++;
  }

  // -------------------------------------------------------------------------
  // The Way and the farm roads: worn earth, stopping at every water's edge
  // -------------------------------------------------------------------------
  const ROAD_TINT = freeze({ 'nesdor-way': C.way, 'nesdor-carica-road': C.farmRoad, 'nesdor-hazel-lane': C.lane, 'ninehands-track': C.track });
  for (const road of NESDOR_ROADS) {
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1], b = road.points[i], len = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(len / 4));
      for (let j = 0; j < n; j++) {
        yield;
        const t = (j + .5) / n, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
        if (underWater(x, z)) continue;
        (yield* patch(ROAD_TINT[road.id] ?? C.way, y, x, z, road.width, len / n + .25, Math.atan2(b.x - a.x, b.z - a.z), .06, 3));
        metrics.roadPatches++;
      }
    }
    metrics.roads++;
  }

  // -------------------------------------------------------------------------
  // The names: three mailbox plates and the inn's board on one atlas
  // -------------------------------------------------------------------------
  const labels = (() => {
    const rows = [...NESDOR_MAILBOXES.map(m => ({ text: [m.name], top: 0, height: 64 })), { text: ['The Counted', 'Water'], height: 192 }];
    let at = 0; for (const row of rows) { row.top = at; at += row.height; }
    let material = new THREE.MeshStandardMaterial({ color: '#efe3c0', roughness: .95 });
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#efe3c0'; ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = '#4a3a28'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const [index, row] of rows.entries()) {
        if (index < NESDOR_MAILBOXES.length) { ctx.font = 'bold 42px Georgia'; ctx.fillText(row.text[0], 256, row.top + 34); continue; }
        ctx.fillStyle = '#5a4630'; ctx.fillRect(0, row.top, 512, row.height); ctx.fillStyle = '#efe3c0'; ctx.font = 'bold 60px Georgia';
        row.text.forEach((line, k) => ctx.fillText(line, 256, row.top + 54 + k * 70));
        // Tally marks under the name: the counted water.
        for (let k = 0; k < 4; k++) ctx.fillRect(212 + k * 26, row.top + 150, 6, 30);
        ctx.save(); ctx.translate(256, row.top + 165); ctx.rotate(-.35); ctx.fillRect(-56, -3, 112, 6); ctx.restore();
      }
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      material.dispose(); material = new THREE.MeshStandardMaterial({ map: texture, roughness: .95 });
    }
    const positions = [], normals = [], uvs = [];
    const quad = (c, f, width, height, u0, u1, v0, v1) => {
      const right = [f.z, 0, -f.x], corner = (su, sv) => [c.x + right[0] * su * width / 2, c.y + sv * height / 2, c.z + right[2] * su * width / 2];
      const bl = corner(-1, -1), br = corner(1, -1), tr = corner(1, 1), tl = corner(-1, 1);
      for (const [v, u, w] of [[bl, u0, v0], [br, u1, v0], [tr, u1, v1], [bl, u0, v0], [tr, u1, v1], [tl, u0, v1]]) { positions.push(...v); normals.push(f.x, 0, f.z); uvs.push(u, w); }
    };
    const vRange = row => [1 - (row.top + row.height) / 512, 1 - row.top / 512];
    NESDOR_MAILBOXES.forEach((m, index) => {
      const f = { x: Math.sin(m.yaw), z: Math.cos(m.yaw) }, [v0, v1] = vRange(rows[index]);
      quad({ x: m.x + f.x * .282, y: y(m.x, m.z) + 1.36, z: m.z + f.z * .282 }, f, .65, .18, .275, .725, v0 + .004, v1 - .004);
    });
    const s = NESDOR_INN_YARD.sign, [v0, v1] = vRange(rows.at(-1)), centre = { x: s.x - .75, y: y(s.x, s.z) + 2.4 };
    for (const f of [{ x: 0, z: 1 }, { x: 0, z: -1 }]) quad({ ...centre, z: s.z + f.z * .04 }, f, 1.6, .6, .02, .98, v0, v1);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material); mesh.name = 'Nesdor nameplates and the inn sign'; mesh.receiveShadow = true;
    mesh.userData.labels = rows.map(row => row.text.join(' '));
    return mesh;
  })();
  root.add(labels); metrics.batches++;

  for (const [builder, shadow] of [[farm, true], [wood, true], [inn, true], [ground, false]]) {
    yield;
    if ((yield* builder.finishSteps(root, { castShadow: shadow }))) { metrics.batches++; metrics.vertices += builder.vertexCount; }
  }
  return { root, metrics, labels,
    mapFeatures: NESDOR_BUILDINGS.map(b => ({ ...b, kind: 'building' })) };
}
