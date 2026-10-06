import { finishBuild } from './build-steps.js';
import * as THREE from 'three';
import { createSceneryBuilder } from './scenery-builder.js';
import { westWaterSurface } from './west-ground.js';
import {
  OVESOS_CANAL, OVESOS_CANAL_LENGTH, OVESOS_FARM_ROWS, OVESOS_FARMSTEADS, OVESOS_TURNOUTS, OVESOS_SEED_BENCHES, OVESOS_BUILDINGS,
  OVESOS_WHEELS, OVESOS_DIVIDER, OVESOS_BRIDGES, OVESOS_SQUARE, OVESOS_ORDER_BOARD, OVESOS_TENTERS, OVESOS_DYE_VATS, OVESOS_MAILBOXES,
  OVESOS_CAMP, OVESOS_ROADS, OVESOS_BED, ovesosCanalAt, ovesosCanalBeside, ovesosCanalFrame, ovesosCanalProfile, ovesosFarmHeight,
} from './ovesos-farm.js';

/**
 * Velsorten and its canal for the Farmlands of the Lizeem (the user's design of 5 October 2026 and his ruling of the
 * same day that Ovesos is fertile along the river; built 6 October 2026), in the project's low-poly way: houses of
 * limewashed mud brick on stone footings under low roofs of reed thatch, as a hot country builds; the canal on banks
 * of its own, a channel of cracked silt with its water drawn over it while a turn runs; the divider, a dressed stone
 * with three timber sluices, on the Lizeem's bank at the head; two undershot wheels in the canal at the mills; and
 * Lahar's camp of dark wool on the upland grass.
 *
 * Nine meshes: one merged builder for each place (the canal's head, the village, the canal itself and its plots'
 * margins, the camp), one for every square, margin and way, the canal's water, the two wheels, and the nameplates on
 * one atlas. The playable beds are left bare: src/farming-view.js draws their soil and their crops. Each house is a
 * solid collider. `canal.set('dry' | 'running')` shows the water or the dry bed, and the wheels turn while it runs
 * (`update(time)`). Coordinates are src/ovesos-farm.js's.
 */
export function createOvesosFarmScenery(...args) { return finishBuild(createOvesosFarmScenerySteps(...args)); }

const freeze = Object.freeze;
export const OVESOS_CANAL_STATES = freeze(['dry', 'running']);
const C = freeze({
  plinth: '#91897a', stone: '#a29a87', brick: '#c9b58c', limewash: '#e3dabf', mud: '#bfa983', timber: '#5d4a32', dark: '#3d342a',
  reed: '#b6a26a', reedRidge: '#8f7d4a', reedOld: '#9d8a59', door: '#3c3126', glass: '#3a3f3c', shutter: '#6b5a3d',
  sack: '#c2b48c', iron: '#4e504b', paper: '#e6ddc2', ink: '#1f2326', cheese: '#e2d29a', wool: '#4a4036', woolLight: '#6b5f50',
  hurdle: '#86704d', hurdleDark: '#6c5a3d', straw: '#cbb36e', strawDark: '#a28a4b', ember: '#b5562b', ash: '#5d5953',
  silt: '#a59c84', crack: '#7d7562', turfHead: '#6e8746', turfMid: '#8a9156', turfTail: '#a6996a', bankEarth: '#8f8565',
  water: '#4f6b66', square: '#b2a47f', way: '#b1a27b', path: '#aa9c77', lane: '#a99b74', ditch: '#7a7259',
  clothBlue: '#4c6489', clothRed: '#9a4b3a', clothPale: '#d9cfb3', dyeBlue: '#2f4466', dyeRed: '#7a2c22', dyeYellow: '#b08a2c',
  millet: '#d2c79b', milletStem: '#9a9a5a', flowerWhite: '#e7e3d2',
});
/** Each reach's margins: the turf greens with the water it is given first. */
const REACH_TURF = freeze({ 'velsorten-head': C.turfHead, 'velsorten-mid': C.turfMid, 'velsorten-tail': C.turfTail });
const DOOR = freeze({ north: freeze({ x: 0, z: -1 }), south: freeze({ x: 0, z: 1 }), east: freeze({ x: 1, z: 0 }), west: freeze({ x: -1, z: 0 }) });
const STYLE = freeze({
  register: freeze({ wall: C.limewash, roof: C.reed, ridge: C.reedRidge, rise: 2.2, porch: true }),
  brewhouse: freeze({ wall: C.brick, roof: C.reed, ridge: C.reedRidge, rise: 2, kiln: true }),
  mill: freeze({ wall: '#b9a785', roof: C.reed, ridge: C.reedRidge, rise: 2.3, plinthHigh: true }),
  'fulling-mill': freeze({ wall: '#c3b38d', roof: C.reed, ridge: C.reedRidge, rise: 2.1, plinthHigh: true }),
  'great-house': freeze({ wall: C.limewash, roof: C.reed, ridge: C.reedRidge, rise: 2.4, chimney: true }),
  cottage: freeze({ wall: C.mud, roof: C.reedOld, ridge: '#7f6f45', rise: 1.8, chimney: true }),
  hut: freeze({ wall: '#c6b48b', roof: C.reedOld, ridge: '#7f6f45', rise: 1.6 }),
});
const hash = (a, b = 0) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };

export function* createOvesosFarmScenerySteps({ parent, heightAt, colliders = [] }) {
  let work = 0;
  const tick = () => ++work % 8 === 0;
  const root = new THREE.Group(); root.name = 'Ovesos farm country'; parent.add(root);
  const head = createSceneryBuilder('The canal head'), village = createSceneryBuilder('Velsorten'),
    canal = createSceneryBuilder('The Velsorten canal'), camp = createSceneryBuilder('Lahar’s camp'),
    ground = createSceneryBuilder('Velsorten square, margins and ways');
  const metrics = { buildings: 0, wheels: 0, benches: 0, turnouts: 0, bridges: 0, mailboxes: 0, tents: 0, roads: 0, roadPatches: 0,
    canalSamples: 0, batches: 0, vertices: 0, colliders: 0 };
  const collide = collider => { colliders.push(collider); metrics.colliders++; return collider; };
  function* patch(...args) { yield; return yield* ground.patchSteps(...args); }
  const y = (x, z) => heightAt(x, z);
  const profile = ovesosCanalProfile(heightAt);
  const underWater = (x, z) => { const surface = westWaterSurface(x, z); return surface !== null && surface > y(x, z) - .05; };
  const kitFor = id => (id === 'ziusudra-house' || id === 'enbilulu-hut' ? head : village);
  /** A quad wound to face up, whichever way its corners were listed: the shared material draws front faces only. */
  const upQuad = (kit, tint, a, b, c, d) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    if (uz * vx - ux * vz < 0) kit.quad(tint, a, d, c, b); else kit.quad(tint, a, b, c, d);
  };

  // -------------------------------------------------------------------------
  // Buildings
  // -------------------------------------------------------------------------
  function* building(b) {
    const kit = kitFor(b.id), s = STYLE[b.kind];
    const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => y(b.x + sx * b.w / 2, b.z + sz * b.d / 2));
    const low = Math.min(...corners, y(b.x, b.z)), floor = Math.max(...corners) + (s.plinthHigh ? .3 : .15), top = floor + b.h;
    kit.block(C.plinth, b.x, low - .4, b.z, b.w + .5, floor - low + .4, b.d + .5);
    kit.block(s.wall, b.x, floor, b.z, b.w, b.h, b.d);
    // A timber band under the eaves and the lintels; mud brick needs no frame.
    kit.block(C.timber, b.x, top - .22, b.z, b.w + .08, .22, b.d + .08);
    if (tick()) yield;
    const along = b.w >= b.d;
    if (along) kit.roof(s.roof, b.x, top, b.z, b.d + 1.2, b.w + 1, s.rise, Math.PI / 2, s.wall);
    else kit.roof(s.roof, b.x, top, b.z, b.w + 1.2, b.d + 1, s.rise, 0, s.wall);
    kit.box(s.ridge, b.x, top + s.rise + .05, b.z, along ? b.w + 1.1 : .34, .2, along ? .34 : b.d + 1.1);
    const n = DOOR[b.door], wide = b.kind === 'mill' || b.kind === 'fulling-mill' ? 1.8 : 1.2, high = 2.15;
    const dx = b.x + n.x * (b.w / 2 + .03), dz = b.z + n.z * (b.d / 2 + .03);
    if (n.x) kit.block(C.door, dx, floor, dz, .1, high, wide); else kit.block(C.door, dx, floor, dz, wide, high, .1);
    if (n.x) kit.block(C.timber, dx + n.x * .03, floor + high, dz, .12, .18, wide + .3); else kit.block(C.timber, dx, floor + high, dz + n.z * .03, wide + .3, .18, .12);
    // A step up to the door where the footing stands proud of the ground.
    const step = { x: b.x + n.x * (b.w / 2 + .5), z: b.z + n.z * (b.d / 2 + .5) }, sy = y(step.x, step.z);
    if (floor - sy > .18) kit.block(C.stone, step.x, sy - .1, step.z, n.x ? .8 : wide + .4, floor - sy + .1 - .02, n.x ? wide + .4 : .8);
    if (tick()) yield;
    // Small high windows with shutters on the long faces: a hot country keeps its rooms dark.
    for (const side of [-1, 1]) for (const u of [-.28, .28]) {
      const wy = floor + 1.45, sx = along ? b.x + u * b.w : b.x + side * (b.w / 2 + .04), sz = along ? b.z + side * (b.d / 2 + .04) : b.z + u * b.d;
      if (Math.hypot(sx - dx, sz - dz) < wide / 2 + .9) continue;
      if (along) { kit.block(C.glass, sx, wy, sz, .6, .5, .06); kit.block(C.shutter, sx - .46, wy - .02, sz, .3, .55, .07); kit.block(C.shutter, sx + .46, wy - .02, sz, .3, .55, .07); }
      else { kit.block(C.glass, sx, wy, sz, .06, .5, .6); kit.block(C.shutter, sx, wy - .02, sz - .46, .07, .55, .3); kit.block(C.shutter, sx, wy - .02, sz + .46, .07, .55, .3); }
    }
    if (tick()) yield;
    if (s.chimney) {
      const cx = along ? b.x - Math.sign(dx - b.x || 1) * (b.w / 2 - .8) : b.x, cz = along ? b.z : b.z - Math.sign(dz - b.z || 1) * (b.d / 2 - .8);
      kit.block(C.brick, cx, top - .4, cz, .8, s.rise + 1, .8);
      kit.block(C.dark, cx, top + s.rise + .6, cz, .9, .12, .9);
    }
    if (s.kiln) {
      // The malting kiln at the far end: a brick stack through the roof under a cowl.
      const kx = b.x - b.w / 2 + 1.3;
      kit.block(C.brick, kx, top - .2, b.z, 1.8, s.rise + .8, 1.8);
      kit.cone(C.reedRidge, kx, top + s.rise + .6, b.z, 1.4, .9, Math.PI / 4, 4);
    }
    if (s.porch) {
      // The register house's porch: four timber posts and a lean-to roof over the door, and a step the width of it.
      const px = dx + n.x * 1.6, pz = dz + n.z * 1.6;
      for (const k of [-1.5, -.5, .5, 1.5]) {
        const qx = n.x ? px : dx + k * 1.4, qz = n.x ? dz + k * 1.4 : pz, qy = y(qx, qz);
        kit.block(C.timber, qx, qy - .1, qz, .2, floor + 2.7 - qy + .1, .2);
        collide({ x: qx, z: qz, r: .14, kind: 'ovesos-post' });
      }
      if (n.x) kit.roof(s.roof, dx + n.x * .95, floor + 2.7, dz, 2.2, 4.8, .45, 0, s.wall);
      else kit.roof(s.roof, dx, floor + 2.7, dz + n.z * .95, 2.2, 4.8, .45, Math.PI / 2, s.wall);
    }
    collide({ x: b.x, z: b.z, hx: b.w / 2, hz: b.d / 2, minY: low - .5, maxY: top + s.rise + 1, kind: 'building', id: b.id });
    metrics.buildings++;
  }
  for (const b of OVESOS_BUILDINGS) { yield; (yield* building(b)); }

  // -------------------------------------------------------------------------
  // The canal: banks, bed and water, sampled a metre at a time down its length
  // -------------------------------------------------------------------------
  const K = OVESOS_CANAL, step = 1, count = Math.ceil(OVESOS_CANAL_LENGTH / step) + 1;
  const sections = [];
  for (let i = 0; i < count; i++) {
    if (i % 16 === 0) yield;
    const s = Math.min(OVESOS_CANAL_LENGTH, i * step);
    // The normal is the canal's heading over two metres, so the banks turn its corners without a seam.
    const a = ovesosCanalAt(Math.max(0, s - 1)), b = ovesosCanalAt(Math.min(OVESOS_CANAL_LENGTH, s + 1)), c = ovesosCanalAt(s);
    const hx = b.x - a.x, hz = b.z - a.z, hl = Math.hypot(hx, hz) || 1;
    const east = { x: hz / hl, z: -hx / hl }, level = profile.at(s);
    const at = u => ({ x: c.x + east.x * u, z: c.z + east.z * u });
    const sides = [-1, 1].map(side => {
      const crestOut = at(side * K.crestOut);
      // Where the bank's outer face meets the ground, found in two tries; a little below it so no seam shows.
      let reach = K.crestOut + Math.max(.4, (level.crest - y(crestOut.x, crestOut.z)) / K.slope);
      const toe0 = at(side * reach);
      reach = K.crestOut + Math.max(.4, (level.crest - y(toe0.x, toe0.z)) / K.slope);
      const toe = at(side * reach);
      return { side, inner: at(side * K.half), crestIn: at(side * K.crestIn), crestOut, toe: { ...toe, y: y(toe.x, toe.z) - .05 } };
    });
    sections.push({ s, c, east, level, sides });
    metrics.canalSamples++;
  }
  // The banks: inner face, crest and outer face on both sides, turf on the crest and earth on the faces.
  const v3 = (point, height) => [point.x, height, point.z];
  for (let i = 1; i < sections.length; i++) {
    if (i % 8 === 0) yield;
    const p0 = sections[i - 1], p1 = sections[i];
    for (let k = 0; k < 2; k++) {
      const a = p0.sides[k], b = p1.sides[k];
      const quad = (tint, q0, q1, q2, q3) => upQuad(canal, tint, q0, q1, q2, q3);
      quad(C.bankEarth, v3(a.inner, p0.level.bed - .05), v3(a.crestIn, p0.level.crest), v3(b.crestIn, p1.level.crest), v3(b.inner, p1.level.bed - .05));
      const turf = hash(i, k) < .5 ? '#8c8a5e' : '#86875a';
      quad(turf, v3(a.crestIn, p0.level.crest), v3(a.crestOut, p0.level.crest), v3(b.crestOut, p1.level.crest), v3(b.crestIn, p1.level.crest));
      quad(C.bankEarth, v3(a.crestOut, p0.level.crest), v3(a.toe, a.toe.y), v3(b.toe, b.toe.y), v3(b.crestOut, p1.level.crest));
    }
    // The bed: cracked silt across the channel, under the water when a turn runs.
    const l0 = p0.sides[0].inner, r0 = p0.sides[1].inner, l1 = p1.sides[0].inner, r1 = p1.sides[1].inner;
    upQuad(canal, i % 3 ? C.silt : '#9d947c', v3(l0, p0.level.bed + .01), v3(l1, p1.level.bed + .01), v3(r1, p1.level.bed + .01), v3(r0, p0.level.bed + .01));
    if (i % 3 === 0) canal.beam(C.crack, [p0.c.x - p0.east.x * .4, p0.level.bed + .03, p0.c.z - p0.east.z * .4], [p1.c.x + p1.east.x * .3, p1.level.bed + .03, p1.c.z + p1.east.z * .3], .03, .01);
  }
  {
    // The tail: the banks closed across the end, a timber board in the closing bank to let the last water off, and a
    // dry ditch from it down into the Dry Gully.
    const end = sections.at(-1), yaw = ovesosCanalAt(OVESOS_CANAL_LENGTH).yaw, ey = y(end.c.x, end.c.z);
    canal.block(C.bankEarth, end.c.x, ey - .1, end.c.z, 3.8, end.level.crest - ey + .1, 1.4, yaw);
    canal.box('#8c8a5e', end.c.x, end.level.crest + .01, end.c.z, 3.6, .04, 1.2, yaw);
    canal.block(C.timber, end.c.x, end.level.bed, end.c.z, .9, end.level.crest - end.level.bed + .15, .1, yaw);
    const tip = ovesosCanalAt(OVESOS_CANAL_LENGTH), out = { x: tip.x + tip.dx * 1.2, z: tip.z + tip.dz * 1.2 };
    (yield* patch(C.ditch, y, (out.x + -1945.5) / 2, (out.z + 752.5) / 2, 1.1, Math.hypot(-1945.5 - out.x, 752.5 - out.z) + .5,
      Math.atan2(-1945.5 - out.x, 752.5 - out.z), .04, 3));
  }

  // The water: one sheet down the channel at the water's level, shown while a turn runs.
  const water = (() => {
    const positions = [];
    for (let i = 1; i < sections.length; i++) {
      const p0 = sections[i - 1], p1 = sections[i];
      const a = p0.sides[0].inner, b = p0.sides[1].inner, c2 = p1.sides[1].inner, d = p1.sides[0].inner;
      const w0 = p0.level.water, w1 = p1.level.water;
      positions.push(a.x, w0, a.z, d.x, w1, d.z, c2.x, w1, c2.z, a.x, w0, a.z, c2.x, w1, c2.z, b.x, w0, b.z);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.computeVertexNormals();
    if (geometry.attributes.normal.getY(0) < 0) {
      for (let i = 0; i < positions.length; i += 9) for (let k = 0; k < 3; k++) [positions[i + 3 + k], positions[i + 6 + k]] = [positions[i + 6 + k], positions[i + 3 + k]];
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.computeVertexNormals();
    }
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: C.water, roughness: .28, metalness: 0, transparent: true, opacity: .9,
      depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    mesh.name = 'The Velsorten canal water'; mesh.renderOrder = 2; mesh.receiveShadow = true; root.add(mesh);
    return mesh;
  })();
  metrics.batches++;
  if (tick()) yield;

  // -------------------------------------------------------------------------
  // The divider and the intake below it to the river
  // -------------------------------------------------------------------------
  {
    const d = OVESOS_DIVIDER, level = profile.at(0), dy = y(d.x, d.z), top = level.crest + .35;
    // The dressed stone: a sill across the canal's head, three bays in it, a pier between each.
    head.block(C.stone, d.x, dy - .4, d.z, d.width, top - dy + .4, d.length);
    const bay = (d.width - .5) / d.gates;
    for (let g = 0; g < d.gates; g++) {
      const gx = d.x - d.width / 2 + .25 + bay * (g + .5);
      // Each bay's opening, a dark slot through the stone, with its timber gate in grooves: shut, half, open.
      head.block(C.dark, gx, level.bed, d.z, bay - .35, top - level.bed - .08, d.length + .04);
      const lift = [0, .35, .7][g];
      head.block(C.timber, gx, level.bed + lift, d.z + .1, bay - .3, .7, .12);
      head.block(C.timber, gx, level.bed + lift + .7, d.z + .1, .1, 1.35, .1);
      head.block(C.timber, gx - .14, top + .02, d.z + .1, .06, .9, .06);
      head.block(C.timber, gx + .14, top + .02, d.z + .1, .06, .9, .06);
    }
    head.box(C.timber, d.x, top + .95, d.z + .1, d.width - .2, .12, .14);
    // The warden's marks: a measuring rod and three notches cut in the downstream face.
    for (let k = 0; k < 3; k++) head.box(C.dark, d.x + d.width / 2 - .25, level.bed + .2 + k * .25, d.z + d.length / 2 + .01, .2, .04, .02);
    head.beam('#8c7652', [d.x + d.width / 2 + .3, dy, d.z - .3], [d.x + d.width / 2 + .1, dy + 2.1, d.z - .5], .05);
    collide({ x: d.x, z: d.z, hx: d.width / 2, hz: d.length / 2, kind: 'ovesos-divider', id: d.id });
    // The intake: two stone walls down the bank from the divider to the Lizeem, and a stone floor between them.
    const { from, to, half } = d.intake, length = to.z - from.z, pieces = Math.ceil(length / 1.2);
    for (let k = 0; k < pieces; k++) {
      if (tick()) yield;
      const z0 = from.z + length * k / pieces, z1 = from.z + length * (k + 1) / pieces, zm = (z0 + z1) / 2;
      for (const side of [-1, 1]) {
        const wx = from.x + side * (half + .2), gy = y(wx, zm);
        head.block(C.stone, wx, gy - .7, zm, .4, .7 + .45, z1 - z0 + .02);
      }
      const fy = Math.min(y(from.x, z0), y(from.x, z1));
      head.box('#8a8273', from.x, fy + .02, zm, half * 2, .06, z1 - z0 + .02);
    }
    collide({ x: from.x, z: (from.z + to.z) / 2, hx: half + .4, hz: length / 2, kind: 'ovesos-intake' });
  }
  if (tick()) yield;

  // -------------------------------------------------------------------------
  // Turnouts, bridges and the mills' wheels
  // -------------------------------------------------------------------------
  for (const t of OVESOS_TURNOUTS) {
    yield;
    // A gate in the west bank: two posts on the crest, a board between them, and a short channel of dark earth off it.
    const c = ovesosCanalAt(t.along), level = profile.at(t.along), gate = ovesosCanalBeside(t.along, -K.crestIn - .4);
    for (const k of [-.45, .45]) canal.block(C.timber, gate.x + c.dx * k, level.bed, gate.z + c.dz * k, .14, level.crest - level.bed + .55, .14);
    canal.block(C.timber, gate.x, level.bed + .1, gate.z, .1, level.crest - level.bed + .1, .9, c.yaw);
    const ditch = ovesosCanalBeside(t.along, -3.1);
    (yield* patch(C.ditch, y, ditch.x, ditch.z, .7, 1.4, c.yaw + Math.PI / 2, .045, 2));
    metrics.turnouts++;
  }
  for (const b of OVESOS_BRIDGES) {
    yield;
    const c = ovesosCanalAt(b.along), level = profile.at(b.along), across = K.crestOut + 1.2;
    const l = ovesosCanalBeside(b.along, -across), r = ovesosCanalBeside(b.along, across);
    const ly = y(l.x, l.z), ry = y(r.x, r.z), deck = level.crest + .12;
    // Two stringers from ground to ground over the crest, and planks across them.
    for (const k of [-b.width / 2 + .12, b.width / 2 - .12]) {
      canal.beam(C.timber, [l.x + c.dx * k, ly + .05, l.z + c.dz * k], [c.x + c.dx * k, deck - .06, c.z + c.dz * k], .14);
      canal.beam(C.timber, [c.x + c.dx * k, deck - .06, c.z + c.dz * k], [r.x + c.dx * k, ry + .05, r.z + c.dz * k], .14);
    }
    const planks = 9;
    for (let k = 0; k < planks; k++) {
      const u = -across + (k + .5) * across * 2 / planks, q = ovesosCanalBeside(b.along, u);
      const qy = Math.abs(u) < K.crestOut ? deck : deck + (Math.abs(u) - K.crestOut) / (across - K.crestOut) * ((u < 0 ? ly : ry) + .1 - deck);
      canal.box(k % 2 ? '#7d6747' : '#866f4c', q.x, qy, q.z, across * 2 / planks - .05, .07, b.width, c.yaw);
    }
    metrics.bridges++;
  }
  const wheels = [];
  for (const w of OVESOS_WHEELS) {
    yield;
    const { along } = ovesosCanalFrame(w.x, w.z), level = profile.at(along);
    // Undershot: the paddles dip a hand into the water, and the axle runs over the bank into the mill's wall.
    const axle = level.water - .2 + w.radius, kit = createSceneryBuilder(`${w.id}`);
    const rim = 14, side = Math.sign(w.wall - w.x);
    for (let k = 0; k < rim; k++) {
      const a0 = k / rim * Math.PI * 2, a1 = (k + 1) / rim * Math.PI * 2;
      for (const sx of [-w.width / 2, w.width / 2]) kit.beam(C.timber, [sx, Math.sin(a0) * w.radius * .86, Math.cos(a0) * w.radius * .86], [sx, Math.sin(a1) * w.radius * .86, Math.cos(a1) * w.radius * .86], .1);
      // The paddles, radial boards across the wheel's width.
      kit.box('#6f5a3d', 0, Math.sin(a0) * (w.radius - .2), Math.cos(a0) * (w.radius - .2), w.width + .04, .48, .06, 0, Math.PI / 2 - a0);
    }
    for (let k = 0; k < 4; k++) {
      const a = k / 4 * Math.PI;
      for (const sx of [-w.width / 2 + .05, w.width / 2 - .05]) kit.beam(C.dark, [sx, Math.sin(a) * w.radius * .86, Math.cos(a) * w.radius * .86], [sx, -Math.sin(a) * w.radius * .86, -Math.cos(a) * w.radius * .86], .08);
    }
    kit.box(C.dark, 0, 0, 0, w.width + .3, .34, .34);
    const pivot = new THREE.Group(); pivot.name = `${w.id} pivot`; pivot.position.set(w.x, axle, w.z); root.add(pivot);
    const mesh = yield* kit.finishSteps(pivot, { castShadow: true });
    wheels.push({ mesh, speed: .9 / w.radius });
    // The axle on its post at the canal's far side and into the wall; the bearings are the mill's.
    village.beam(C.dark, [w.x - side * (w.width / 2 + .5), axle, w.z], [w.wall, axle, w.z], .2);
    const postX = w.x - side * (w.width / 2 + .45), postY = y(postX, w.z);
    village.block(C.timber, postX, Math.min(postY, level.bed) - .2, w.z, .26, axle - Math.min(postY, level.bed) + .2, .26);
    // The race: plank walls either side of the wheel, where the channel is boxed for it.
    for (const sx of [-1, 1]) village.block('#6b5a3f', w.x + sx * (w.width / 2 + .18), level.bed - .1, w.z, .08, level.crest - level.bed + .1, w.radius * 2 + .6);
    collide({ x: w.x, z: w.z, hx: w.width / 2 + .3, hz: w.radius + .3, kind: 'ovesos-wheel', id: w.id });
    metrics.wheels++; metrics.batches++;
  }

  // -------------------------------------------------------------------------
  // The plots' margins, the seed benches
  // -------------------------------------------------------------------------
  const BED_HALF = Math.max(OVESOS_BED.across, OVESOS_BED.along) / 2;
  for (const farmstead of OVESOS_FARMSTEADS) {
    yield;
    const rows = OVESOS_FARM_ROWS.filter(row => row.farmstead === farmstead), turf = REACH_TURF[farmstead];
    // A low bund round the group's four beds, in the turf the water gives each reach, and a channel of dark earth
    // between each bed and the next, which is what the turn's water runs down.
    const first = rows[0], last = rows.at(-1), cx = (first.x + last.x) / 2, cz = (first.z + last.z) / 2;
    const yaw = Math.atan2(last.x - first.x, last.z - first.z), length = Math.hypot(last.x - first.x, last.z - first.z) + OVESOS_BED.along + 1.6;
    for (const side of [-1, 1]) {
      const ox = Math.cos(yaw) * side * (BED_HALF + .45), oz = -Math.sin(yaw) * side * (BED_HALF + .45);
      (yield* patch(turf, y, cx + ox, cz + oz, .8, length, yaw, .06, Math.ceil(length / 3)));
    }
    for (let n = 1; n < rows.length; n++) {
      const gx = (rows[n - 1].x + rows[n].x) / 2, gz = (rows[n - 1].z + rows[n].z) / 2;
      (yield* patch(C.ditch, y, gx, gz, OVESOS_BED.across - .2, .55, yaw, .045, 2));
    }
  }
  for (const bench of OVESOS_SEED_BENCHES) {
    yield;
    const kit = bench.farmId === 'velsorten-head' ? head : canal, by = y(bench.x, bench.z);
    for (const ox of [-.67, .67]) for (const oz of [-.25, .25]) kit.block(C.timber, bench.x + ox, y(bench.x + ox, bench.z + oz), bench.z + oz, .09, by + .86 - y(bench.x + ox, bench.z + oz), .09);
    kit.box('#a6936c', bench.x, by + .88, bench.z, 1.65, .12, .76);
    for (let k = 0; k < 3; k++) { kit.rock(k % 2 ? '#c5b792' : C.sack, bench.x - .47 + k * .47, by + 1.1, bench.z, .19, .23, .2, .2 + k); kit.cylinder(C.timber, bench.x - .47 + k * .47, by + 1.28, bench.z, .067, .07); }
    collide({ x: bench.x, z: bench.z, hx: .84, hz: .4, kind: 'farm-seed-bench', farmId: bench.farmId });
    metrics.benches++;
  }

  // -------------------------------------------------------------------------
  // The village: the square, the board, the mill's sacks, the brewhouse's barrels, the tenters and vats, the millet
  // -------------------------------------------------------------------------
  {
    const q = OVESOS_SQUARE;
    (yield* patch(C.square, y, (q.minX + q.maxX) / 2, (q.minZ + q.maxZ) / 2, q.maxX - q.minX, q.maxZ - q.minZ, 0, .045, 6));
    // Nisaba's board: two posts, the board with the week's orders and the turns, a little roof. Its face is to the square.
    const b = OVESOS_ORDER_BOARD, by = y(b.x, b.z);
    village.frame(b.x, by, b.z, b.yaw, () => {
      for (const k of [-1, 1]) village.block(C.timber, k * .78, -.1, 0, .16, 2.4, .16);
      village.block(C.timber, 0, .85, 0, 1.9, 1.2, .14);
      for (let k = 0; k < 3; k++) village.block(C.paper, -.56 + k * .56, 1.02, .085, .42, .66, .025);
      village.roof(C.reed, 0, 2.18, 0, .7, 2.1, .25, Math.PI / 2, C.timber);
    });
    collide({ x: b.x, z: b.z, hx: .22, hz: 1, kind: 'ovesos-board', id: b.id });
    // The village's sign at the way's corner into the square (its name is on the atlas below).
    const s = { x: -1901.6, z: 686.8 }, sy = y(s.x, s.z);
    village.block(C.timber, s.x, sy - .1, s.z, .16, 2.7, .16);
    village.box('#6b5435', s.x, sy + 2.25, s.z + .1, 1.5, .5, .07);
    collide({ x: s.x, z: s.z, r: .2, kind: 'ovesos-sign' });
  }
  if (tick()) yield;
  {
    // Ezina's sacks against the mill wall by her door, and a spare millstone leaning on it.
    for (let k = 0; k < 3; k++) { const sx = -1907, sz = 687.4 + k * .62; village.rock(k === 1 ? '#cdbf95' : C.sack, sx, y(sx, sz) + .28, sz, .3, .32, .26, k); }
    collide({ x: -1907, z: 688, hx: .4, hz: 1, kind: 'ovesos-prop' });
    const ms = { x: -1907.2, z: 680.2 }, my = y(ms.x, ms.z);
    village.cylinder('#8b857a', ms.x, my + .62, ms.z, .62, .2, 0);
    collide({ x: ms.x, z: ms.z, r: .4, kind: 'ovesos-prop' });
    // Ninkasi's barrels by the brewhouse door, and the mash tub.
    for (let k = 0; k < 3; k++) { const bx = -1889.4 + k * .9, bz = 681.6, bty = y(bx, bz); village.cylinder('#7d6141', bx, bty, bz, .38, .95, k); for (const band of [.15, .78]) village.cylinder(C.iron, bx, bty + band, bz, .4, .05); }
    collide({ x: -1888.5, z: 681.6, hx: 1.4, hz: .45, kind: 'ovesos-prop' });
    // Uttu's tenters: posts and two rails, and the cloth hooked to them to dry, blue, madder red and undyed.
    for (const [index, t] of OVESOS_TENTERS.entries()) {
      const posts = Math.round(t.length / 1.4);
      for (let k = 0; k <= posts; k++) { const pz = t.z - t.length / 2 + k * t.length / posts; village.block(C.timber, t.x, y(t.x, pz) - .1, pz, .1, 1.75, .1); }
      for (const ry of [.45, 1.55]) village.beam(C.timber, [t.x, y(t.x, t.z - t.length / 2) + ry, t.z - t.length / 2], [t.x, y(t.x, t.z + t.length / 2) + ry, t.z + t.length / 2], .06);
      const cloth = [C.clothBlue, C.clothRed, C.clothPale][index % 3], ty0 = y(t.x, t.z - t.length / 2), ty1 = y(t.x, t.z + t.length / 2);
      village.sheet(cloth, [t.x + .03, ty0 + .5, t.z - t.length / 2 + .2], [t.x + .03, ty1 + .5, t.z + t.length / 2 - .2], [t.x + .03, ty1 + 1.5, t.z + t.length / 2 - .2], [t.x + .03, ty0 + 1.5, t.z - t.length / 2 + .2]);
      collide({ x: t.x, z: t.z, hx: .25, hz: t.length / 2 + .1, kind: 'ovesos-tenter', id: t.id });
    }
    // The dye vats: three tubs, woad blue, madder red and weld yellow.
    const v = OVESOS_DYE_VATS;
    [[0, -.9, C.dyeBlue], [1, .2, C.dyeRed], [2, 1.2, C.dyeYellow]].forEach(([k, ox, dye]) => {
      const vx = v.x + ox, vz = v.z + (k === 1 ? .5 : -.2), vy = y(vx, vz);
      village.cylinder('#6e5940', vx, vy, vz, .5, .72, k); village.cylinder(dye, vx, vy + .66, vz, .44, .02); village.cylinder(C.iron, vx, vy + .5, vz, .52, .05);
    });
    collide({ x: v.x + .15, z: v.z, r: 1.5, kind: 'ovesos-prop' });
    // Ashnan's millet patch by her house: the household's own, which no creditor may take.
    const mp = { x: -1909.8, z: 730.2 };
    (yield* patch('#9d8c62', y, mp.x, mp.z, 2.6, 4.2, 0, .05, 2));
    for (let k = 0; k < 14; k++) {
      const sx = mp.x - 1 + (k % 4) * .65 + hash(k, 1) * .2, sz = mp.z - 1.8 + Math.floor(k / 4) * 1.15 + hash(k, 2) * .2, sy = y(sx, sz);
      village.beam(C.milletStem, [sx, sy, sz], [sx + .05, sy + .95, sz + .03], .03);
      village.rock(C.millet, sx + .06, sy + 1.02, sz + .04, .07, .16, .07, k);
    }
  }
  if (tick()) yield;

  // -------------------------------------------------------------------------
  // Lahar's camp
  // -------------------------------------------------------------------------
  {
    const cp = OVESOS_CAMP;
    for (const [index, t] of cp.tents.entries()) {
      const ty = y(t.x, t.z);
      camp.tent(index ? C.woolLight : C.wool, t.x, ty - .05, t.z, 3.2, 4.2, 2, t.yaw, index ? C.wool : C.woolLight);
      camp.block(C.timber, t.x + Math.sin(t.yaw) * 2.2, ty - .1, t.z + Math.cos(t.yaw) * 2.2, .08, 2.2, .08);
      camp.block(C.timber, t.x - Math.sin(t.yaw) * 2.2, ty - .1, t.z - Math.cos(t.yaw) * 2.2, .08, 2.2, .08);
      collide({ x: t.x, z: t.z, r: 2, kind: 'ovesos-tent' });
      metrics.tents++;
    }
    // The hearth: a ring of stones, ash and embers, and the pan the barley is roasted in.
    const h = cp.hearth, hy = y(h.x, h.z);
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; camp.rock('#8c8579', h.x + Math.cos(a) * .62, hy + .08, h.z + Math.sin(a) * .62, .2, .14, .17, a); }
    camp.cylinder(C.ash, h.x, hy, h.z, .5, .05); camp.rock(C.ember, h.x, hy + .08, h.z, .22, .08, .2);
    camp.cylinder(C.iron, h.x + .1, hy + .22, h.z, .3, .05);
    collide({ x: h.x, z: h.z, r: h.r, kind: 'ovesos-hearth' });
    // The cheese rack: a frame with two shelves of ewe cheeses drying under a cloth.
    const r = cp.rack, ry = y(r.x, r.z);
    for (const ox of [-.6, .6]) for (const oz of [-.25, .25]) camp.block(C.timber, r.x + ox, ry - .05, r.z + oz, .07, 1.3, .07);
    for (const shelf of [.45, .95]) { camp.box('#9a8460', r.x, ry + shelf, r.z, 1.35, .05, .6); for (let k = 0; k < 4; k++) camp.cylinder(C.cheese, r.x - .45 + k * .3, ry + shelf + .03, r.z, .12, .1); }
    camp.sheet(C.clothPale, [r.x - .7, ry + 1.3, r.z - .3], [r.x + .7, ry + 1.3, r.z - .3], [r.x + .7, ry + 1.3, r.z + .3], [r.x - .7, ry + 1.3, r.z + .3]);
    collide({ x: r.x, z: r.z, hx: .72, hz: .34, kind: 'ovesos-prop' });
    // The rick: the winter's hay.
    const k = cp.rick, kyy = y(k.x, k.z);
    camp.cylinder(C.straw, k.x, kyy, k.z, k.r, 1.5); camp.cone(C.strawDark, k.x, kyy + 1.5, k.z, k.r + .1, 1.3, .3);
    collide({ x: k.x, z: k.z, r: k.r, kind: 'ovesos-rick' });
    // The fold: wattle hurdles in a ring with a gate, a fleece or two hung over them.
    const f = cp.fold, panels = 14;
    for (let n = 0; n < panels; n++) {
      const a0 = n / panels * Math.PI * 2, a1 = (n + 1) / panels * Math.PI * 2, am = (a0 + a1) / 2;
      if (Math.abs(Math.atan2(Math.sin(am - f.gate), Math.cos(am - f.gate))) < Math.PI / panels) {
        // The gate: two posts and a hurdle swung open.
        const gx = f.x + Math.sin(am) * f.r, gz = f.z + Math.cos(am) * f.r, gy = y(gx, gz);
        camp.sheet(C.hurdleDark, [gx, gy + .05, gz], [gx + Math.sin(am) * 1.6, gy + .05, gz + Math.cos(am) * 1.6], [gx + Math.sin(am) * 1.6, gy + 1.1, gz + Math.cos(am) * 1.6], [gx, gy + 1.1, gz]);
        continue;
      }
      const ax = f.x + Math.sin(a0) * f.r, az = f.z + Math.cos(a0) * f.r, bx = f.x + Math.sin(a1) * f.r, bz = f.z + Math.cos(a1) * f.r;
      const ay = y(ax, az), byy = y(bx, bz);
      camp.sheet(n % 2 ? C.hurdle : C.hurdleDark, [ax, ay, az], [bx, byy, bz], [bx, byy + 1.05, bz], [ax, ay + 1.05, az]);
      camp.block(C.timber, ax, ay - .1, az, .08, 1.25, .08);
      if (n % 5 === 2) camp.box(C.cheese, (ax + bx) / 2, (ay + byy) / 2 + 1.02, (az + bz) / 2, .9, .12, .5, Math.atan2(bx - ax, bz - az));
      for (const t of [.25, .75]) collide({ x: ax + (bx - ax) * t, z: az + (bz - az) * t, r: .45, kind: 'ovesos-fold' });
    }
  }
  if (tick()) yield;

  // -------------------------------------------------------------------------
  // Mailboxes (named on the atlas below)
  // -------------------------------------------------------------------------
  for (const m of OVESOS_MAILBOXES) {
    const kit = m.id.startsWith('ashnan') ? village : head, my = y(m.x, m.z);
    kit.frame(m.x, my, m.z, m.yaw, () => {
      kit.block('#73553d', 0, -.1, 0, .14, 1.3, .14);
      kit.box('#a38361', 0, 1.14, 0, .99, .09, .61);
      kit.block('#8d7b5c', 0, 1.18, 0, .85, .46, .52);
      kit.roof('#6b5d4a', 0, 1.64, 0, 1.03, .69, .2, Math.PI / 2, '#8d7b5c');
      kit.box(C.dark, 0, 1.5, .27, .46, .035, .018);
    });
    collide({ x: m.x, z: m.z, r: .5, kind: 'ovesos-mailbox', homeId: m.home });
    metrics.mailboxes++;
  }

  // -------------------------------------------------------------------------
  // The ways: worn earth, stopping at the water and passing under the canal's bridge
  // -------------------------------------------------------------------------
  const ROAD_TINT = freeze({ 'velsorten-way': C.way, 'velsorten-tail-path': C.path, 'velsorten-lane': C.lane });
  for (const road of OVESOS_ROADS) {
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1], b = road.points[i], len = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(len / 4));
      for (let j = 0; j < n; j++) {
        yield;
        const t = (j + .5) / n, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
        if (underWater(x, z) || ovesosCanalFrame(x, z).distance < K.crestOut + 1.4) continue;
        (yield* patch(ROAD_TINT[road.id] ?? C.way, y, x, z, road.width, len / n + .25, Math.atan2(b.x - a.x, b.z - a.z), .06, 3));
        metrics.roadPatches++;
      }
    }
    metrics.roads++;
  }

  // -------------------------------------------------------------------------
  // The names: three mailbox plates and the village's sign on one atlas
  // -------------------------------------------------------------------------
  const labels = (() => {
    const rows = [...OVESOS_MAILBOXES.map(m => ({ text: [m.name], top: 0, height: 64 })), { text: ['Velsorten'], height: 128 }];
    let at = 0; for (const row of rows) { row.top = at; at += row.height; }
    let material = new THREE.MeshStandardMaterial({ color: '#efe3c0', roughness: .95 });
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#efe3c0'; ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = '#4a3a28'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const [index, row] of rows.entries()) {
        if (index < OVESOS_MAILBOXES.length) { ctx.font = 'bold 42px Georgia'; ctx.fillText(row.text[0], 256, row.top + 34); continue; }
        ctx.fillStyle = '#5a4630'; ctx.fillRect(0, row.top, 512, row.height); ctx.fillStyle = '#efe3c0'; ctx.font = 'bold 64px Georgia';
        ctx.fillText(row.text[0], 256, row.top + 56);
        // Three wavy lines under the name: the water, shared.
        for (let k = 0; k < 3; k++) { ctx.beginPath(); for (let u = 0; u <= 40; u++) { const px = 136 + u * 6, py = row.top + 96 + k * 9 + Math.sin(u * .7 + k) * 3; if (u) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.strokeStyle = '#efe3c0'; ctx.lineWidth = 3; ctx.stroke(); }
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
    OVESOS_MAILBOXES.forEach((m, index) => {
      const f = { x: Math.sin(m.yaw), z: Math.cos(m.yaw) }, [v0, v1] = vRange(rows[index]);
      quad({ x: m.x + f.x * .282, y: y(m.x, m.z) + 1.36, z: m.z + f.z * .282 }, f, .65, .18, .275, .725, v0 + .004, v1 - .004);
    });
    const [v0, v1] = vRange(rows.at(-1)), sign = { x: -1901.6, y: y(-1901.6, 686.8) + 2.25, z: 686.8 + .1 };
    for (const f of [{ x: 0, z: 1 }, { x: 0, z: -1 }]) quad({ ...sign, z: sign.z + f.z * .04 }, f, 1.4, .46, .02, .98, v0, v1);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material); mesh.name = 'Velsorten nameplates and sign'; mesh.receiveShadow = true;
    mesh.userData.labels = rows.map(row => row.text.join(' '));
    return mesh;
  })();
  root.add(labels); metrics.batches++;

  for (const [builder, shadow] of [[head, true], [village, true], [canal, true], [camp, true], [ground, false]]) {
    yield;
    if ((yield* builder.finishSteps(root, { castShadow: shadow }))) { metrics.batches++; metrics.vertices += builder.vertexCount; }
  }

  // -------------------------------------------------------------------------
  // The canal's state, for the arc: the water drawn over the bed while a turn runs, and the wheels turning with it
  // -------------------------------------------------------------------------
  let canalState = 'running', lastTime = null, turned = 0;
  const setCanal = state => {
    if (!OVESOS_CANAL_STATES.includes(state)) throw new Error(`Unknown canal state ${state}`);
    canalState = state; water.visible = state === 'running';
    return canalState;
  };
  setCanal(canalState);
  return {
    root, metrics, labels,
    mapFeatures: OVESOS_BUILDINGS.map(b => ({ id: b.id, name: b.name, x: b.x, z: b.z, w: b.w, d: b.d, kind: 'building' })),
    /** The world's height here: the ground, with the canal's banks and its carried bed on it. */
    heightAt: (x, z) => ovesosFarmHeight(x, z, heightAt) ?? heightAt(x, z),
    canal: { states: OVESOS_CANAL_STATES, set: setCanal, state: () => canalState, water },
    wheels: wheels.map(item => item.mesh),
    update(time) {
      const dt = lastTime === null ? 0 : Math.max(0, Math.min(.25, time - lastTime)); lastTime = time;
      if (canalState !== 'running') return;
      turned += dt;
      for (const wheel of wheels) if (wheel.mesh) wheel.mesh.rotation.x = -turned * wheel.speed;
    },
  };
}
