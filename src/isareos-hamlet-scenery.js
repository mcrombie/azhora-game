import { finishBuild } from './build-steps.js';
import * as THREE from 'three';
import { createSceneryBuilder } from './scenery-builder.js';
import { westWaterSurface } from './west-ground.js';
import {
  ISAREOS_HAMLET, ISAREOS_HAMLET_BUILDINGS, ISAREOS_HAMLET_STALL, ISAREOS_HAMLET_SITES, ISAREOS_HAMLET_PATHS, ISAREOS_HAMLET_LANDMARKS,
} from './isareos-hamlet.js';

/**
 * Amalthea's hamlet in the Isareos hills (src/isareos-hamlet.js; Build 5 of the Farmlands of the Lizeem, built
 * 6 October 2026): the house, the byre, the cheese press under its lean-to, her stand, the hay rick, a trough,
 * a stack of turves for the fire, the yard and the track down to the Muster road.
 *
 * The hills grow grass and very little wood (the lore's Isareos has only the stream galleries), so the walls are
 * drystone to the eaves on a stone footing, and the roofs are thatch pinned down with turf; what timber there is
 * goes into the doors, the press and the stand. Nothing is painted.
 *
 * Built as Haethom is (src/nethereum-farm-scenery.js): two merged meshes, one for the steading and one for the
 * trodden ground, so the hamlet costs two draws. Each building stands on a footing that takes up the fall of the
 * top, so the world's ground is not changed.
 */
const C = Object.freeze({
  stone: ['#8f8b7c', '#9a9584', '#86826f'], darkStone: '#6c695d', footing: '#7c7867', thatch: '#9f8c5c', turf: '#6f7f45',
  timber: '#5e4c36', timberLight: '#80694a', door: '#4e3f2d', dark: '#2e2a25', cheese: '#e2cf8f', rind: '#c9a85c',
  cloth: '#e8e2cf', hay: '#c4ad6a', hayDark: '#a99252', water: '#6a8487', turves: '#4a3b2c', path: '#9c8f6c', yard: '#8f8463',
});

export function createIsareosHamletScenery(...args) { return finishBuild(createIsareosHamletScenerySteps(...args)); }

export function* createIsareosHamletScenerySteps({ parent, heightAt, colliders = [] }) {
  let work = 0;
  const root = new THREE.Group(); root.name = 'The cheese-maker’s hamlet, Isareos'; parent.add(root);
  const metrics = { buildings: 0, paths: 0, colliders: 0, batches: 0, vertices: 0 };
  const ground = (x, z) => heightAt(x, z);
  const push = collider => { colliders.push(collider); metrics.colliders++; return collider; };
  const post = (x, z, r, kind, id, y = ground(x, z), h = 2) => push({ x, z, r, kind, id, minY: y - .3, maxY: y + h });
  const box = (x, z, hx, hz, kind, id, y = ground(x, z), h = 1.2) => push({ x, z, hx, hz, kind, id, minY: y - .3, maxY: y + h });

  const steading = createSceneryBuilder('The cheese-maker’s house, byre and press');
  const earth = createSceneryBuilder('The cheese-maker’s yard and track');
  /** A point in a building's own frame (door on +z), in world metres. */
  const local = (b, lx, lz) => ({ x: b.x + lx * Math.cos(b.yaw) + lz * Math.sin(b.yaw), z: b.z - lx * Math.sin(b.yaw) + lz * Math.cos(b.yaw) });
  /** The footing under a footprint: its foot below the lowest corner and its floor a little over the highest. */
  const footing = (b, lift = .2) => {
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => ground(b.x + sx * b.hx, b.z + sz * b.hz));
    return { foot: Math.min(...corners) - .45, floor: Math.max(...corners) + lift };
  };

  // ---------------------------------------------------------------------------------------------
  // The house and the byre: drystone walls, a timber door on the +z face, thatch under turf.
  // ---------------------------------------------------------------------------------------------
  function* walled(b, index) {
    const { foot, floor } = footing(b, b.kind === 'house' ? .3 : .15), w = b.w, d = b.d, h = b.h, byre = b.kind === 'byre';
    const rise = Math.min(2.4, Math.min(w, d) * .5);
    steading.frame(b.x, 0, b.z, b.yaw, () => {
      steading.block(C.footing, 0, foot, 0, w + .6, floor - foot, d + .6);
      steading.block(C.stone[index % 3], 0, floor, 0, w, h, d);
      // Coursing: a darker band every so often, and big quoins at the corners, as a drystone wall is laid.
      for (const at of [.55, 1.3, 2.0]) if (at < h - .2) steading.box(C.darkStone, 0, floor + at, 0, w + .03, .12, d + .03);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) steading.block(C.stone[(index + 1) % 3], sx * (w / 2 - .2), floor, sz * (d / 2 - .2), .46, h, .46);
      // The door, and a flat stone before it.
      const doorW = byre ? 2.3 : 1, doorH = byre ? 1.95 : 1.8;
      steading.box(C.timber, 0, floor + doorH / 2 + .05, d / 2 + .04, doorW + .26, doorH + .16, .1);
      steading.box(byre ? C.timberLight : C.door, 0, floor + doorH / 2, d / 2 + .08, doorW, doorH, .06);
      steading.block(C.darkStone, 0, foot, d / 2 + .65, doorW + .5, floor - foot - .02, .6);
      // Small windows on the house, and a slit for air in the byre's gable.
      if (!byre) for (const sx of [-1, 1]) {
        const at = sx * (w / 2 - 1.4);
        steading.box(C.timber, at, floor + 1.35, d / 2 + .05, .7, .6, .07); steading.box(C.dark, at, floor + 1.35, d / 2 + .08, .5, .42, .04);
      } else for (const sx of [-1, 1]) steading.box(C.dark, sx * (w / 2 + .03), floor + h - .5, 0, .06, .5, .18);
      // Thatch along the long side, a band of turf over the ridge, and a chimney stone on the house.
      steading.roof(C.thatch, 0, floor + h, 0, d + 1, w + .8, rise, Math.PI / 2, C.stone[index % 3]);
      steading.box(C.turf, 0, floor + h + rise - .04, 0, w + .85, .22, .6);
      for (const sz of [-1, 1]) steading.box(C.turf, 0, floor + h + .12, sz * (d / 2 + .38), w + .85, .16, .3);
      if (!byre) steading.block(C.darkStone, -w / 2 + .5, floor + h, 0, .6, rise + .6, .6);
    });
    push({ x: b.x, z: b.z, hx: b.hx + .3, hz: b.hz + .3, minY: foot, maxY: floor + h + rise + .4, kind: 'building', id: b.id });
    const step = local(b, 0, b.d / 2 + .65), across = Math.abs(Math.sin(b.yaw)) > .5, half = (byre ? 2.3 : 1) / 2 + .25;
    push({ x: step.x, z: step.z, hx: across ? .3 : half, hz: across ? half : .3, minY: foot, maxY: floor + .4, kind: 'building-step', id: `${b.id}-step` });
    metrics.buildings++;
    if (++work % 2 === 0) yield;
  }
  const [house, byre, press] = ISAREOS_HAMLET_BUILDINGS;
  (yield* walled(house, 0));
  (yield* walled(byre, 1));

  // ---------------------------------------------------------------------------------------------
  // The cheese press: a lean-to on four posts against a stone back wall, open to the yard, with the
  // press itself, its lever and weight-stone, and a shelf of cheeses ripening.
  // ---------------------------------------------------------------------------------------------
  {
    const b = press, { foot, floor } = footing(b, .12), w = b.w, d = b.d, h = b.h;
    steading.frame(b.x, 0, b.z, b.yaw, () => {
      steading.block(C.footing, 0, foot, 0, w + .3, floor - foot, d + .3);
      // The back wall, waist-high stone with the posts above it, and the two side posts at the open front.
      steading.block(C.stone[2], 0, floor, -d / 2 + .25, w, 1.1, .5);
      for (const sx of [-1, 1]) {
        steading.block(C.timber, sx * (w / 2 - .12), floor, -d / 2 + .25, .18, h + .35, .18);
        steading.block(C.timber, sx * (w / 2 - .12), floor, d / 2 - .12, .18, h - .2, .18);
      }
      // A single slope of thatch, high at the back and low over the open side.
      steading.sheet(C.thatch, [-w / 2 - .25, floor + h + .45, -d / 2 - .25], [w / 2 + .25, floor + h + .45, -d / 2 - .25],
        [w / 2 + .25, floor + h - .35, d / 2 + .35], [-w / 2 - .25, floor + h - .35, d / 2 + .35]);
      steading.beam(C.turf, [-w / 2 - .25, floor + h + .5, -d / 2 - .2], [w / 2 + .25, floor + h + .5, -d / 2 - .2], .3, .16);
      // The press: a stone bed with a run-off lip, two uprights and a crossbar, the screw and the follower.
      steading.block(C.darkStone, -.4, floor, .1, 1.1, .55, .9);
      steading.box(C.stone[0], -.4, floor + .6, .55, .9, .08, .12);
      for (const sx of [-1, 1]) steading.block(C.timberLight, -.4 + sx * .5, floor + .55, .1, .14, 1.3, .14);
      steading.box(C.timberLight, -.4, floor + 1.85, .1, 1.2, .16, .18);
      steading.cylinder(C.timber, -.4, floor + .95, .1, .06, .9);
      steading.cylinder(C.timberLight, -.4, floor + .83, .1, .38, .12, 0, 8);
      steading.cylinder(C.cheese, -.4, floor + .58, .1, .34, .25, 0, 8);
      // The lever, run out to the right with a weight-stone hung on its end.
      steading.beam(C.timber, [-.4, floor + 1.25, .1], [1.05, floor + 1.05, .1], .1);
      steading.rock(C.darkStone, 1.05, floor + .72, .1, .26, .22, .24);
      // The shelf along the back wall, and the week's cheeses on it under a cloth.
      steading.box(C.timberLight, 0, floor + 1.3, -d / 2 + .45, w - .5, .06, .4);
      for (let i = 0; i < 5; i++) steading.cylinder(i % 2 ? C.rind : C.cheese, -w / 2 + .65 + i * .58, floor + 1.33, -d / 2 + .45, .2, .17, 0, 8);
      steading.box(C.cloth, w / 2 - .7, floor + 1.52, -d / 2 + .45, .7, .03, .38);
    });
    // The back wall and the press itself; the open side stays open.
    const back = local(b, 0, -d / 2 + .25), bed = local(b, -.4, .1);
    push({ x: back.x, z: back.z, hx: Math.abs(Math.sin(b.yaw)) > .5 ? .35 : w / 2 + .1, hz: Math.abs(Math.sin(b.yaw)) > .5 ? w / 2 + .1 : .35,
      minY: foot, maxY: floor + h + .5, kind: 'building', id: `${b.id}-wall` });
    push({ x: bed.x, z: bed.z, hx: .65, hz: .65, minY: foot, maxY: floor + 2, kind: 'cheese-press', id: b.id });
    for (const sx of [-1, 1]) { const at = local(b, sx * (w / 2 - .12), d / 2 - .12); post(at.x, at.z, .14, 'post', `${b.id}-post-${sx}`, floor, h); }
    metrics.buildings++;
  }
  if (++work % 2 === 0) yield;

  // ---------------------------------------------------------------------------------------------
  // Amalthea's stand: a counter at the front under a canvas awning on four posts, cheeses on the counter.
  // ---------------------------------------------------------------------------------------------
  {
    const s = ISAREOS_HAMLET_STALL, y = ground(s.x, s.z), hw = s.width / 2, hd = s.depth / 2;
    steading.frame(s.x, y, s.z, s.yaw, () => {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) steading.block(C.timber, sx * (hw - .1), -.2, sz * (hd - .1), .1, sz < 0 ? 2.6 : 2.3, .1);
      steading.sheet(C.cloth, [-hw - .1, 2.4, -hd - .1], [hw + .1, 2.4, -hd - .1], [hw + .1, 2.1, hd + .25], [-hw - .1, 2.1, hd + .25]);
      // The counter: a board on two trestles at the front, and the cheeses laid out on a cloth.
      steading.block(C.timberLight, 0, .78, hd - .35, s.width - .2, .08, .6);
      for (const sx of [-1, 1]) steading.block(C.timber, sx * (hw - .45), -.2, hd - .35, .1, .98, .5);
      steading.box(C.cloth, 0, .87, hd - .35, s.width - .6, .02, .5);
      for (const [x, r] of [[-.85, .22], [-.3, .16], [.25, .2], [.8, .14]]) steading.cylinder(x < 0 ? C.cheese : C.rind, x, .88, hd - .35, r, .14, 0, 8);
    });
    // Only the counter stops a body: Amalthea stands behind it and the customer before it.
    box(s.x, s.z + hd - .35, hw - .05, .32, 'stall-counter', `${s.id}-counter`, y, 1);
    for (const sx of [-1, 1]) post(s.x + sx * (hw - .1), s.z - hd + .1, .08, 'post', `${s.id}-post-${sx}`, y, 2.4);
  }

  // ---------------------------------------------------------------------------------------------
  // The rick, the trough and the turves.
  // ---------------------------------------------------------------------------------------------
  {
    const r = ISAREOS_HAMLET_SITES.rick, y = ground(r.x, r.z);
    steading.cylinder(C.darkStone, r.x, y - .2, r.z, r.r + .1, .4, 0, 9);
    steading.cylinder(C.hay, r.x, y + .2, r.z, r.r, 1.9, 0, 9);
    steading.cone(C.hayDark, r.x, y + 2.1, r.z, r.r + .12, 1.4, 0, 9);
    for (const a of [0, 2.1, 4.2]) steading.beam('#a69470', [r.x + Math.sin(a) * (r.r + .05), y + 2.05, r.z + Math.cos(a) * (r.r + .05)], [r.x, y + 3.45, r.z], .04);
    post(r.x, r.z, r.r + .1, 'hay-rick', r.id, y, 3.4);

    const t = ISAREOS_HAMLET_SITES.trough, ty = ground(t.x, t.z);
    steading.frame(t.x, ty, t.z, t.yaw, () => {
      steading.block(C.stone[1], 0, -.15, 0, 1.9, .7, .6);
      steading.box(C.water, 0, .5, 0, 1.6, .02, .36);
    });
    box(t.x, t.z, 1, .35, 'trough', t.id, ty, .6);

    const s = ISAREOS_HAMLET_SITES.turves, sy = ground(s.x, s.z);
    steading.frame(s.x, sy, s.z, s.yaw, () => {
      for (let layer = 0; layer < 4; layer++) for (let n = 0; n < 5 - layer; n++)
        steading.box(n % 2 ? C.turves : '#57452f', -.9 + n * .45 + layer * .22, .12 + layer * .22, 0, .42, .2, .55);
    });
    box(s.x, s.z, .35, 1.15, 'turf-stack', s.id, sy, 1);
  }
  if (++work % 2 === 0) yield;

  // ---------------------------------------------------------------------------------------------
  // The yard and the track: worn earth that follows the ground, and stops at the beck's water.
  // ---------------------------------------------------------------------------------------------
  {
    const yard = ISAREOS_HAMLET_SITES.yard;
    (yield* earth.patchSteps(C.yard, ground, yard.x, yard.z, yard.width, yard.depth, 0, .05, 6));
  }
  for (const route of ISAREOS_HAMLET_PATHS) {
    for (let i = 1; i < route.points.length; i++) {
      const a = route.points[i - 1], b = route.points[i], len = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(len / 5);
      for (let j = 0; j < n; j++) { if (++work % 4 === 0) yield;
        const t = (j + .5) / n, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
        if (westWaterSurface(x, z) !== null) continue;
        (yield* earth.patchSteps(C.path, ground, x, z, route.width, len / n + .2, Math.atan2(b.x - a.x, b.z - a.z), .06, 3));
      }
    }
    metrics.paths++;
  }

  for (const [builder, shadow] of [[steading, true], [earth, false]]) {
    if (++work % 2 === 0) yield;
    metrics.vertices += builder.vertexCount;
    if ((yield* builder.finishSteps(root, { castShadow: shadow }))) metrics.batches++;
  }
  return {
    root, metrics,
    mapFeatures: ISAREOS_HAMLET_BUILDINGS.map(b => ({ id: b.id, name: b.name, x: b.x, z: b.z, w: b.hx * 2, d: b.hz * 2, kind: 'building' })),
    landmarks: ISAREOS_HAMLET_LANDMARKS, paths: ISAREOS_HAMLET_PATHS, hamlet: ISAREOS_HAMLET,
  };
}
