import { finishBuild } from './build-steps.js';
import * as THREE from 'three';
import { createSceneryBuilder } from './scenery-builder.js';
import {
  HAETHOM, NETHEREUM_BUILDINGS, NETHEREUM_LEVEE, NETHEREUM_HUMMOCK, NETHEREUM_SITES, NETHEREUM_WEIR, NETHEREUM_PATHS,
  NETHEREUM_SEED_STATIONS, NETHEREUM_MEADOW, NETHEREUM_FARM_ROWS, NETHEREUM_FARM_LANDMARKS, NETHEREUM_STEPPING_STONES,
  nethereumFarmHeight, nethereumLeveeLift, nethereumHummockLift,
} from './nethereum-farm.js';

/**
 * Haethom, the levee and its hatch, Liban's house, Boann's byre and Gwyddno's weir (src/nethereum-farm.js;
 * the Farmlands of the Lizeem, Build 2: the design of 5 October 2026, built 6 October 2026).
 *
 * The Nethrani manner, from the lore: houses on the ridges and hummocks, above the water's reach, so each
 * stands on a plinth of turf and stone a hand or two over its own ground; timber frames filled with daub,
 * and steep reed thatch from the wet threads. Nothing is painted. The weir is stakes and wattle, the traps
 * are wicker, and the smoke-house is blackened to the eaves.
 *
 * Built as the Caricas town and Minora are (`createSceneryBuilder`): four merged meshes for the whole
 * place, one per kind of thing, so the hamlet costs four draws and not four hundred. The hatch's gate is
 * three small meshes of which one is shown (broken, shut, open), and the meadow's flood water is one more,
 * hidden until the hatch is opened: `hatch.set(state)` and `meadowWater.set(state)` for the arc to call.
 */
const C = Object.freeze({
  daub: ['#cfc29c', '#c7b993', '#d3c8a6', '#c2b38c'], thatch: ['#a28f5d', '#978453', '#a99666', '#8f7d4f'],
  timber: '#5c4b36', timberLight: '#7d6a4c', newWood: '#b39a6c', plinth: '#8b8a74', stone: '#9a9682', darkStone: '#6f6d61',
  turf: '#5b8743', crest: '#8f8a62', path: '#9e9070', common: '#7d9a59', channel: '#594a36', soot: '#3b3732',
  wattle: '#7a6646', wicker: '#a38a5a', rush: '#7f8f4f', reed: '#b5a46c', hay: '#c3ad6d', iron: '#55584f',
  sack: '#b9ad84', water: '#6a8a86', fish: '#a8b0a8', rope: '#a69470', dark: '#2f2a24',
});
/** The flood meadow's water by phase (the lore's names): black as it goes in, pale with silt, green with frogspawn. */
const FLOOD = Object.freeze({
  blackwater: { color: '#2e2b24', opacity: .9 }, siltshine: { color: '#a9a98a', opacity: .78 },
  frogcall: { color: '#4d6a3c', opacity: .84 }, sour: { color: '#5a5a35', opacity: .88 },
});
export const NETHEREUM_HATCH_STATES = Object.freeze(['broken', 'shut', 'open']);
export const NETHEREUM_FLOOD_STATES = Object.freeze(['dry', ...Object.keys(FLOOD)]);

export function createNethereumFarmScenery(...args) { return finishBuild(createNethereumFarmScenerySteps(...args)); }

export function* createNethereumFarmScenerySteps({ parent, heightAt, colliders = [] }) {
  let work = 0;
  const root = new THREE.Group(); root.name = 'Haethom and the Nethereum flood meadow'; parent.add(root);
  const metrics = { buildings: 0, houses: 0, paths: 0, beds: NETHEREUM_FARM_ROWS.length, weirStakes: 0, fishTraps: 0,
    colliders: 0, batches: 0, vertices: 0 };
  const ground = (x, z) => nethereumFarmHeight(x, z, heightAt) ?? heightAt(x, z);
  const push = collider => { colliders.push(collider); metrics.colliders++; return collider; };
  const post = (x, z, r, kind, id, y = ground(x, z), h = 2) => push({ x, z, r, kind, id, minY: y - .3, maxY: y + h });
  const box = (x, z, hx, hz, kind, id, y = ground(x, z), h = 1.2) => push({ x, z, hx, hz, kind, id, minY: y - .3, maxY: y + h });

  const hamlet = createSceneryBuilder('Haethom houses and common');
  const works = createSceneryBuilder('Haethom levee works, byre and Liban’s house');
  const weir = createSceneryBuilder('Gwyddno’s weir and smoke-house');
  const earth = createSceneryBuilder('Haethom paths, levee and hummock');

  /** A point in a building's own frame (door on +z), in world metres. */
  const local = (b, lx, lz) => ({ x: b.x + lx * Math.cos(b.yaw) + lz * Math.sin(b.yaw), z: b.z - lx * Math.sin(b.yaw) + lz * Math.cos(b.yaw) });

  // ---------------------------------------------------------------------------------------------
  // Buildings: a plinth, a daubed timber frame and a steep reed roof, the door on the +z face.
  // ---------------------------------------------------------------------------------------------
  function* building(kit, b, index) {
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => ground(b.x + sx * b.hx, b.z + sz * b.hz));
    const foot = Math.min(...corners) - .45, floor = Math.max(...corners) + (b.kind === 'house' ? .3 : .15);
    const w = b.w, d = b.d, h = b.h, daub = b.kind === 'smokehouse' ? '#8e8574' : C.daub[index % 4];
    const thatch = b.kind === 'smokehouse' ? '#6d6450' : b.kind === 'byre' ? '#8a7a50' : C.thatch[index % 4];
    const rise = Math.min(3.2, Math.min(w, d) * .62);
    kit.frame(b.x, 0, b.z, b.yaw, () => {
      kit.block(C.plinth, 0, foot, 0, w + .7, floor - foot, d + .7);
      kit.block(C.stone, 0, floor - .12, 0, w + .8, .14, d + .8);
      if (b.kind === 'smokehouse') {
        // Stone to the knee, then smoke-black daub: the fire is inside and the walls show it.
        kit.block(C.darkStone, 0, floor, 0, w + .1, 1, d + .1);
        kit.block(daub, 0, floor + 1, 0, w, h - 1, d);
        kit.block(C.soot, 0, floor + h - .7, 0, w + .02, .7, d + .02);
      } else kit.block(daub, 0, floor, 0, w, h, d);
      // The frame: corner posts, sill, wall plate and a mid-rail with studs on the long faces.
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.block(C.timber, sx * (w / 2 - .08), floor, sz * (d / 2 - .08), .22, h, .22);
      for (const sz of [-1, 1]) {
        kit.box(C.timber, 0, floor + .08, sz * (d / 2 + .02), w + .1, .16, .1);
        kit.box(C.timber, 0, floor + h - .1, sz * (d / 2 + .02), w + .1, .18, .1);
        if (b.kind !== 'smokehouse') kit.box(C.timber, 0, floor + h * .55, sz * (d / 2 + .02), w, .12, .08);
        for (let x = -w / 2 + 1.4; x < w / 2 - 1; x += 1.4) if (sz < 0 || Math.abs(x) > 1.1) kit.box(C.timber, x, floor + h / 2, sz * (d / 2 + .03), .12, h, .08);
      }
      for (const sx of [-1, 1]) {
        kit.box(C.timber, sx * (w / 2 + .02), floor + .08, 0, .1, .16, d + .1);
        kit.box(C.timber, sx * (w / 2 + .02), floor + h - .1, 0, .1, .18, d + .1);
      }
      // The door, on the face the house turns to, and a step up to it off the plinth.
      const doorW = b.kind === 'byre' ? 2.3 : 1.05, doorH = b.kind === 'byre' ? 2 : 1.85;
      kit.box(C.timber, 0, floor + doorH / 2 + .05, d / 2 + .05, doorW + .3, doorH + .2, .12);
      kit.box(b.kind === 'byre' ? C.timberLight : '#4c3e2d', 0, floor + doorH / 2, d / 2 + .1, doorW, doorH, .06);
      kit.block(C.stone, 0, foot, d / 2 + .7, doorW + .4, floor - foot - .02, .6);
      // Small shuttered windows on the long sides.
      if (b.kind === 'house' || b.kind === 'hut') for (const sx of [-1, 1]) {
        const at = sx * (w / 2 - Math.min(1.5, w * .22));
        kit.box(C.timber, at, floor + 1.45, d / 2 + .06, .8, .7, .07); kit.box(C.dark, at, floor + 1.45, d / 2 + .09, .56, .48, .04);
        kit.box(C.timberLight, at - .42, floor + 1.45, d / 2 + .1, .26, .62, .04);
      }
      // A steep reed roof over the long sides, deep eaves, a ridge cap and a smoke louvre.
      kit.roof(thatch, 0, floor + h, 0, d + 1.3, w + 1.1, rise, Math.PI / 2, daub);
      kit.box(C.thatch[(index + 2) % 4], 0, floor + h + rise - .02, 0, w + 1.15, .2, .34);
      if (b.kind === 'smokehouse') {
        kit.roof('#5f574a', 0, floor + h + rise - .05, 0, 1.3, 1.8, .55, Math.PI / 2, C.soot);
        for (const sz of [-1, 1]) kit.box(C.soot, 0, floor + h + rise + .12, sz * .55, 1.5, .26, .06);
      } else if (b.kind !== 'byre') kit.cone(C.thatch[(index + 1) % 4], 0, floor + h + rise - .15, 0, .34, .5, 0, 4);
    });
    // The collider takes in the plinth, and a second one the door step, so nobody walks into either.
    push({ x: b.x, z: b.z, hx: b.hx + .45, hz: b.hz + .45, minY: foot, maxY: floor + h + rise + .4, kind: 'building', id: b.id });
    const step = local(b, 0, b.d / 2 + .7), across = Math.abs(Math.sin(b.yaw)) > .5, half = (b.kind === 'byre' ? 2.3 : 1.05) / 2 + .2;
    push({ x: step.x, z: step.z, hx: across ? .3 : half, hz: across ? half : .3, minY: foot, maxY: floor + .4, kind: 'building-step', id: `${b.id}-step` });
    metrics.buildings++; if (b.kind === 'house') metrics.houses++;
    if (++work % 2 === 0) yield;
    return { foot, floor };
  }
  function barrel(kit, x, z, id) {
    const y = ground(x, z); kit.cylinder(C.timberLight, x, y, z, .38, .85); kit.cylinder(C.iron, x, y + .12, z, .4, .06);
    kit.cylinder(C.iron, x, y + .7, z, .4, .06); kit.cylinder(C.water, x, y + .83, z, .32, .02);
    post(x, z, .42, 'water-barrel', id, y, 1);
  }
  function woodpile(kit, x, z, yaw, id) {
    const y = ground(x, z);
    for (let layer = 0; layer < 3; layer++) for (let n = 0; n < 4 - layer; n++)
      kit.frame(x, y, z, yaw, () => kit.box(n % 2 ? C.timberLight : '#8a7656', 0, .16 + layer * .27, -.42 * (3 - layer) / 2 + n * .42 + layer * .21, 1.6, .26, .26, 0, 0, 0));
    box(x, z, Math.abs(Math.cos(yaw)) * .85 + Math.abs(Math.sin(yaw)) * .7, Math.abs(Math.sin(yaw)) * .85 + Math.abs(Math.cos(yaw)) * .7, 'woodpile', id, y, 1);
  }
  function basket(kit, x, z, id, scale = 1, trap = true) {
    const y = ground(x, z);
    kit.cylinder(C.wicker, x, y, z, .34 * scale, .62 * scale, .3);
    kit.cone(C.wicker, x, y + .62 * scale, z, .34 * scale, .3 * scale, .3);
    kit.cylinder(C.timber, x, y + .3 * scale, z, .36 * scale, .05);
    if (trap) metrics.fishTraps++;
    post(x, z, .4 * scale, trap ? 'fish-trap' : 'basket', id, y, .9 * scale);
  }

  // ---------------------------------------------------------------------------------------------
  // Haethom: four houses round the common
  // ---------------------------------------------------------------------------------------------
  const houses = NETHEREUM_BUILDINGS.filter(b => b.id.startsWith('haethom-') && b.kind === 'house');
  for (const [i, b] of houses.entries()) (yield* building(hamlet, b, i));
  {
    const by = id => houses.find(b => b.owner === id);
    const mererid = by('mererid'), seithenyn = by('seithenyn'), fintan = by('fintan'), airmid = by('airmid');
    for (const b of houses) { const at = local(b, b.w / 2 - .45, b.d / 2 + .75); barrel(hamlet, at.x, at.z, `${b.id}-barrel`); }
    // Mererid keeps the levee: a stack of stakes for the bank by her door.
    { const at = local(mererid, -(mererid.w / 2 - 1.6), mererid.d / 2 + 1.5), y = ground(at.x, at.z);
      for (let n = 0; n < 7; n++) hamlet.beam(C.timberLight, [at.x - .6 + n * .2, y + .08, at.z - .5], [at.x - .6 + n * .2, y + .2, at.z + 1.4], .1);
      box(at.x, at.z + .45, .8, 1.05, 'stake-stack', 'haethom-levee-stakes', y, .5); }
    // Seithenyn: an empty cask by his door, which is the whole of his story told by a prop.
    { const at = local(seithenyn, -1.9, seithenyn.d / 2 + .8), y = ground(at.x, at.z);
      hamlet.cylinder(C.timberLight, at.x, y, at.z, .36, .82); for (const hy of [.14, .66]) hamlet.cylinder(C.iron, at.x, y + hy, at.z, .38, .05);
      post(at.x, at.z, .45, 'cask', 'haethom-seithenyn-cask', y, .9); }
    // Airmid's rush: bundles drying by her wall and a basket made from them.
    { const at = local(airmid, -airmid.w / 2 + .9, airmid.d / 2 + 1.1), y = ground(at.x, at.z);
      for (let n = 0; n < 3; n++) hamlet.cone(C.rush, at.x + (n - 1) * .45, y, at.z, .2, 1.3 + n * .1, n, 4);
      box(at.x, at.z, .75, .3, 'rush-bundles', 'haethom-airmid-rush', y, 1.4);
      const bk = local(airmid, airmid.w / 2 - 1.55, airmid.d / 2 + .8); basket(hamlet, bk.x, bk.z, 'haethom-airmid-basket', .8, false); }
    { const at = local(fintan, -fintan.w / 2 + .8, fintan.d / 2 + 1.2); woodpile(hamlet, at.x, at.z, fintan.yaw, 'haethom-fintan-woodpile'); }
    // A bench on the common, the hamlet's one public seat.
    { const x = HAETHOM.common.x + 3.5, z = HAETHOM.common.z - 2.5, y = ground(x, z);
      hamlet.box(C.timberLight, x, y + .46, z, 2.4, .12, .5); for (const s of [-1, 1]) hamlet.block(C.timber, x + s * .95, y, z, .14, .42, .42);
      box(x, z, 1.25, .3, 'bench', 'haethom-common-bench', y, .6); }
  }
  (yield* earth.patchSteps(C.common, ground, HAETHOM.common.x, HAETHOM.common.z, HAETHOM.common.width, HAETHOM.common.depth, 0, .04, 8));

  // ---------------------------------------------------------------------------------------------
  // The levee, its head and its hatch; the hummock
  // ---------------------------------------------------------------------------------------------
  // The bank is a height field over the cells where it stands: the same height the world gives
  // (`nethereumFarmHeight`). Each cell is clipped to where the bank is (marching squares), so the
  // toe is a clean line on the grass rather than a staircase of whole cells.
  function* liftedField(minX, maxX, minZ, maxZ, step, lift, tint) {
    const eps = .004;
    for (let x = minX; x < maxX; x += step) { if (++work % 4 === 0) yield;
      for (let z = minZ; z < maxZ; z += step) {
        const q = [[x, z], [x, z + step], [x + step, z + step], [x + step, z]], lifts = q.map(([a, c]) => lift(a, c) - eps);
        if (Math.max(...lifts) <= 0) continue;
        const poly = [];
        for (let i = 0; i < 4; i++) {
          const a = q[i], b = q[(i + 1) % 4], la = lifts[i], lb = lifts[(i + 1) % 4];
          if (la > 0) poly.push(a);
          if ((la > 0) !== (lb > 0)) { const t = la / (la - lb); poly.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
        }
        const v = poly.map(([a, c]) => [a, heightAt(a, c) + Math.max(0, lift(a, c)) + .035, c]);
        for (let k = 1; k < v.length - 1; k++) earth.triangle(tint, v[0], v[k], v[k + 1]);
      }
    }
  }
  {
    const L = NETHEREUM_LEVEE, P = L.points, pad = L.crestHalf + L.side + .5;
    (yield* liftedField(Math.min(...P.map(q => q.x)) - pad - 1.5, Math.max(...P.map(q => q.x)) + pad + 1.5,
      Math.min(...P.map(q => q.z)) - pad - 1.5, Math.max(...P.map(q => q.z)) + pad + 1.5, .7, nethereumLeveeLift, C.turf));
    // The worn line along the crest, broken at the hatch, and the trodden round of the head.
    const samples = [];
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i], len = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(len / .7);
      for (let k = i === 1 ? 0 : 1; k <= n; k++) samples.push({ x: a.x + (b.x - a.x) * k / n, z: a.z + (b.z - a.z) * k / n, nx: -(b.z - a.z) / len, nz: (b.x - a.x) / len });
    }
    const top = p => nethereumLeveeLift(p.x, p.z) > L.crest - .02, lane = .9;
    for (let i = 1; i < samples.length; i++) { if (++work % 16 === 0) yield;
      const a = samples[i - 1], b = samples[i];
      if (!top(a) || !top(b)) continue;
      const c = [[a, -1], [a, 1], [b, 1], [b, -1]].map(([p, s]) => { const x = p.x + p.nx * lane * s, z = p.z + p.nz * lane * s; return [x, ground(x, z) + .05, z]; });
      earth.quad(C.crest, c[0], c[1], c[2], c[3]);
    }
    const head = P[0], r = L.headRadius - .4, ring = Array.from({ length: 17 }, (_, i) => {
      const t = i / 16 * Math.PI * 2, x = head.x + Math.cos(t) * r, z = head.z + Math.sin(t) * r; return [x, ground(x, z) + .05, z]; });
    const centre = [head.x, ground(head.x, head.z) + .05, head.z];
    for (let i = 0; i < 16; i++) earth.triangle(C.crest, centre, ring[i + 1], ring[i]);
    const H = NETHEREUM_HUMMOCK;
    (yield* liftedField(H.x - H.foot - .7, H.x + H.foot + .7, H.z - H.foot - .7, H.z + H.foot + .7, .8, nethereumHummockLift, '#678a48'));
  }
  // The flood post on the levee's head: the Council's gauge, ringed at the heights of the great waters.
  {
    const head = NETHEREUM_SITES.levee, x = head.x + .8, z = head.z + 1.7, y = ground(x, z);
    works.block(C.timber, x, y - .3, z, .22, 2.9, .22);
    for (const [h, tint] of [[.6, '#d7d0b4'], [1.25, '#d7d0b4'], [1.9, '#9a3937']]) works.box(tint, x, y + h, z, .26, .1, .26);
    post(x, z, .2, 'flood-post', 'haethom-flood-post', y, 2.7);
  }
  // The hatch: a timber sluice in a notch of the bank. In its own frame the levee runs along z and the
  // channel along x, from the stream (-x) to the meadow (+x).
  const hatch = NETHEREUM_SITES.hatch, hatchFloor = heightAt(hatch.x, hatch.z), gate = new THREE.Group(), hatchStates = {};
  gate.name = 'The meadow hatch gate'; root.add(gate);
  {
    const L = NETHEREUM_LEVEE, top = hatchFloor + L.crest;
    const at = (lx, lz) => ({ x: hatch.x + lx * Math.cos(hatch.yaw) + lz * Math.sin(hatch.yaw), z: hatch.z - lx * Math.sin(hatch.yaw) + lz * Math.cos(hatch.yaw) });
    const fulcrum = at(.55, 1.55), fulcrumFoot = ground(fulcrum.x, fulcrum.z);
    works.frame(hatch.x, 0, hatch.z, hatch.yaw, () => {
      for (const s of [-1, 1]) {
        works.block(C.timber, 0, hatchFloor - .4, s * .92, .3, top - hatchFloor + 1.25, .3);
        // Cheek boards hold the cut faces of the notch: full height through the crest, falling with the
        // bank's two faces to its toes, seen from the channel and from the bank alike.
        works.box(C.timberLight, 0, hatchFloor + L.crest / 2 - .07, s * .86, 2.2, L.crest + .14, .1);
        for (const q of [-1, 1]) works.sheet(C.timberLight, [q * 1.1, hatchFloor - .15, s * .86], [q * 1.1, top + .05, s * .86],
          [q * (L.crestHalf + L.side), hatchFloor + .05, s * .86], [q * (L.crestHalf + L.side), hatchFloor - .15, s * .86]);
        for (const x of [-2.4, -1.1, 1.1, 2.4]) works.block(C.timber, x, hatchFloor - .3, s * .93, .14, (Math.abs(x) < 1.5 ? L.crest : L.crest * .45) + .4, .14);
      }
      works.box(C.timber, 0, top + .78, 0, .36, .26, 2.3);
      works.box(C.newWood, 0, hatchFloor + .03, 0, 7.4, .06, 1.6);
      // The fulcrum the lever turns on, on the bank beside the notch.
      works.block(C.timber, .55, fulcrumFoot - .2, 1.55, .2, top + 1.2 - fulcrumFoot, .2);
    });
    post(fulcrum.x, fulcrum.z, .16, 'sluice-post', 'haethom-hatch-fulcrum', fulcrumFoot, 1.5);
    for (const s of [-1, 1]) { const q = at(0, s * .92); post(q.x, q.z, .24, 'sluice-post', `haethom-hatch-post-${s < 0 ? 'west' : 'east'}`, hatchFloor, 3); }
    for (const lz of [-.45, .45]) { const q = at(0, lz); post(q.x, q.z, .4, 'sluice-gate', 'haethom-hatch-gate', hatchFloor, 2.2); }
    // The three states of the gate, each its own small mesh, one shown.
    for (const state of NETHEREUM_HATCH_STATES) {
      const kit = createSceneryBuilder(`The meadow hatch, ${state}`);
      kit.frame(hatch.x, 0, hatch.z, hatch.yaw, () => {
        const lift = state === 'open' ? 1 : 0, board = state === 'broken' ? C.wattle : C.newWood;
        if (state === 'broken') {
          // Split down the middle: one half hangs crooked in the guides, the other lies in the channel.
          kit.box(board, 0, hatchFloor + .62, -.42, .12, 1.1, .78, 0, 0, .18);
          kit.box(board, 1.6, hatchFloor + .1, .35, .12, .82, .7, .4, 0, Math.PI / 2 - .1);
        } else {
          kit.box(board, 0, hatchFloor + .62 + lift, 0, .12, 1.15, 1.62);
          kit.box(C.timber, 0, hatchFloor + .62 + lift, 0, .16, .12, 1.66);
        }
        const tip = state === 'open' ? -.55 : .65, y0 = hatchFloor + NETHEREUM_LEVEE.crest + 1.2;
        kit.beam(C.timberLight, [0, hatchFloor + 1.25 + lift, 0], [.55, y0, 1.55], .1);
        kit.beam(C.timberLight, [.55, y0, 1.55], [1.1, y0 + tip, 3.3], .1);
      });
      const mesh = kit.finish(gate, { castShadow: true });
      if (mesh) { mesh.userData.hatchState = state; hatchStates[state] = mesh; metrics.vertices += kit.vertexCount; }
      if (++work % 2 === 0) yield;
    }
  }
  let hatchState = 'broken';
  const setHatch = state => {
    if (!NETHEREUM_HATCH_STATES.includes(state)) throw new Error(`Unknown hatch state ${state}`);
    hatchState = state; for (const [name, mesh] of Object.entries(hatchStates)) mesh.visible = name === state;
    return hatchState;
  };
  setHatch('broken');
  // The dry carrier from the stream through the hatch onto the meadow's head.
  {
    const dx = Math.cos(hatch.yaw), dz = -Math.sin(hatch.yaw);
    (yield* earth.patchSteps(C.channel, ground, hatch.x + dx * .4, hatch.z + dz * .4, 8.6, 1.3, hatch.yaw, .05, 6));
  }

  // The seed benches and tubs, at the meadow's head and by the deep plots, as the Caricas farms have them.
  for (const bench of NETHEREUM_SEED_STATIONS) {
    const by = ground(bench.x, bench.z);
    for (const dx of [-.67, .67]) for (const dz of [-.25, .25]) { const py = ground(bench.x + dx, bench.z + dz); works.block(C.timber, bench.x + dx, py, bench.z + dz, .09, by + .86 - py, .09); }
    works.box(C.timberLight, bench.x, by + .88, bench.z, 1.65, .12, .76);
    for (let n = 0; n < 3; n++) { const sx = bench.x - .47 + n * .47; works.rock(n % 2 ? '#c5b792' : C.sack, sx, by + 1.1, bench.z, .19, .23, .2, .2 + n); works.cylinder(C.timber, sx, by + 1.28, bench.z, .067, .07); }
    push({ x: bench.x, z: bench.z, hx: .84, hz: .4, kind: 'farm-seed-bench', farmId: bench.farmId, minY: by - .3, maxY: by + 1.4 });
    const tub = bench.tub, ty = ground(tub.x, tub.z);
    works.cylinder(C.timber, tub.x, ty, tub.z, .43, .55); works.cylinder(C.water, tub.x, ty + .47, tub.z, .38, .01); works.cylinder(C.iron, tub.x, ty + .16, tub.z, .44, .05);
    push({ ...tub, r: .46, kind: 'farm-water-tub', farmId: bench.farmId, minY: ty - .3, maxY: ty + .7 });
    (yield* earth.patchSteps(C.path, ground, bench.x, bench.z + .8, 2.9, 1.5, 0, .06, 3));
  }
  // Stepping stones where the byre path crosses the north-east thread.
  for (const [i, s] of NETHEREUM_STEPPING_STONES.entries()) works.rock(C.stone, s.x, heightAt(s.x, s.z) + .12, s.z, .55, .32, .45, i);

  // Boann's byre, its rick and its trough; Liban's house on her hummock.
  const byre = NETHEREUM_BUILDINGS.find(b => b.id === 'haethom-byre');
  (yield* building(works, byre, 1));
  { const x = byre.x - byre.hx - 2.2, z = byre.z - .5, y = ground(x, z);
    works.cylinder(C.hay, x, y, z, 1.25, 1.5, 0); works.cone(C.hay, x, y + 1.5, z, 1.3, 1.4); works.cone('#a8935a', x, y + 2.7, z, .3, .4);
    post(x, z, 1.3, 'hay-rick', 'haethom-hay-rick', y, 3);
    const tx = byre.x + byre.hx + 1.2, tz = byre.z - .6, ty = ground(tx, tz);
    works.block(C.timberLight, tx, ty, tz, .8, .55, 2.2); works.box(C.water, tx, ty + .5, tz, .62, .02, 2);
    box(tx, tz, .45, 1.15, 'trough', 'haethom-byre-trough', ty, .7); }
  const liban = NETHEREUM_BUILDINGS.find(b => b.id === 'liban-house');
  (yield* building(works, liban, 3));
  { const at = local(liban, liban.w / 2 - .45, liban.d / 2 + .7); barrel(works, at.x, at.z, 'liban-barrel'); }

  // ---------------------------------------------------------------------------------------------
  // Gwyddno's weir: the V of stakes and wattle in the deep water, the trap at its point, the haul
  // frame on the bank top; the smoke-house and the hut on the terrace, and a drying rack between.
  // ---------------------------------------------------------------------------------------------
  {
    const W = NETHEREUM_WEIR, surface = W.surface;
    for (const arm of W.arms) {
      const len = Math.hypot(W.trap.x - arm.x, W.trap.z - arm.z), n = Math.ceil(len / .7);
      let previous = null;
      for (let i = 0; i <= n; i++) { if (++work % 8 === 0) yield;
        const x = arm.x + (W.trap.x - arm.x) * i / n, z = arm.z + (W.trap.z - arm.z) * i / n, bed = Math.min(heightAt(x, z), surface - .4);
        weir.stake(C.timber, x, bed - .2, z, .15, surface + .8 - bed, i * .7, .22);
        if (previous) weir.beam(C.wattle, [previous.x, surface + .22, previous.z], [x, surface + .22, z], .1, .8);
        previous = { x, z }; metrics.weirStakes++;
      }
    }
    // The trap at the point: a wicker cone lying in the gap, its mouth upstream.
    weir.cylinder(C.wicker, W.trap.x, surface - .4, W.trap.z, .62, 1.05, .3); weir.cone(C.wicker, W.trap.x, surface + .65, W.trap.z, .62, .6, .3);
    weir.cylinder(C.timber, W.trap.x, surface + .3, W.trap.z, .64, .08);
    metrics.fishTraps++;
    const head = W.head, hy = ground(head.x, head.z);
    for (const s of [-1, 1]) { weir.block(C.timber, head.x, hy - .2, head.z + s * .75, .2, 1.9, .2); post(head.x, head.z + s * .75, .2, 'weir-frame', `gwyddno-weir-post-${s < 0 ? 'north' : 'south'}`, hy, 1.8); }
    weir.box(C.timber, head.x, hy + 1.6, head.z, .18, .16, 1.8);
    weir.beam(C.rope, [head.x + .1, hy + 1.55, head.z], [W.trap.x, surface + .4, W.trap.z], .04);
    for (const [i, [x, z]] of [[-2268, 543], [-2267.2, 544.2], [-2268.8, 544.4]].entries()) basket(weir, x, z, `gwyddno-trap-${i + 1}`);
  }
  const hut = NETHEREUM_BUILDINGS.find(b => b.id === 'gwyddno-hut'), smoke = NETHEREUM_BUILDINGS.find(b => b.id === 'gwyddno-smokehouse');
  (yield* building(weir, smoke, 0));
  (yield* building(weir, hut, 2));
  { const at = local(hut, hut.w / 2 - .45, hut.d / 2 + .75); barrel(weir, at.x, at.z, 'gwyddno-barrel'); }
  {
    // The drying rack: two A-frames and a pole, with the day's fish hung along it.
    const x = -2279, z0 = 546, z1 = 551;
    for (const z of [z0, z1]) { const y = ground(x, z);
      for (const s of [-1, 1]) weir.beam(C.timber, [x + s * .55, y, z], [x, y + 1.75, z], .09);
      post(x, z, .62, 'drying-rack', `gwyddno-rack-${z}`, y, 1.8); }
    const ya = ground(x, z0) + 1.7, yb = ground(x, z1) + 1.7;
    weir.beam(C.timberLight, [x, ya, z0], [x, yb, z1], .08);
    for (let n = 1; n < 9; n++) { const t = n / 9, z = z0 + (z1 - z0) * t, y = ya + (yb - ya) * t;
      weir.rock(C.fish, x, y - .32, z, .07, .26, .11, n * .3); }
    const bx = smoke.x - smoke.hx - 1.5, bz = smoke.z + 1.2; woodpile(weir, bx, bz, Math.PI / 2, 'gwyddno-smokehouse-wood');
  }
  (yield* earth.patchSteps(C.path, ground, -2275, 548.5, 7, 9, 0, .045, 5));

  // ---------------------------------------------------------------------------------------------
  // Paths: worn earth, following the bank where they meet it.
  // ---------------------------------------------------------------------------------------------
  for (const route of NETHEREUM_PATHS) {
    for (let i = 1; i < route.points.length; i++) {
      const a = route.points[i - 1], b = route.points[i], len = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(len / 5);
      for (let j = 0; j < n; j++) { if (++work % 4 === 0) yield;
        const t = (j + .5) / n;
        (yield* earth.patchSteps(C.path, ground, a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, route.width, len / n + .2, Math.atan2(b.x - a.x, b.z - a.z), .06, 3));
      }
    }
    metrics.paths++;
  }

  // ---------------------------------------------------------------------------------------------
  // The flood meadow's water: a sheet over the beds when the hatch has let the stream out, hidden dry.
  // ---------------------------------------------------------------------------------------------
  const flood = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: '#2e2b24', transparent: true, opacity: .9,
    roughness: .3, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  {
    const [a, b, , d] = NETHEREUM_MEADOW, positions = [], steps = 16, rows = 9;
    const at = (u, v) => { const x = a.x + (b.x - a.x) * u + (d.x - a.x) * v, z = a.z + (b.z - a.z) * u + (d.z - a.z) * v; return [x, heightAt(x, z) + .16, z]; };
    for (let i = 0; i < steps; i++) for (let j = 0; j < rows; j++) {
      const p00 = at(i / steps, j / rows), p10 = at((i + 1) / steps, j / rows), p11 = at((i + 1) / steps, (j + 1) / rows), p01 = at(i / steps, (j + 1) / rows);
      positions.push(...p00, ...p01, ...p11, ...p00, ...p11, ...p10);
    }
    flood.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); flood.geometry.computeVertexNormals();
    // Wound to face up whichever way the meadow's corners run.
    if (flood.geometry.attributes.normal.getY(0) < 0) { for (let i = 0; i < positions.length; i += 9) for (let k = 0; k < 3; k++) [positions[i + 3 + k], positions[i + 6 + k]] = [positions[i + 6 + k], positions[i + 3 + k]];
      flood.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); flood.geometry.computeVertexNormals(); }
    flood.geometry.computeBoundingSphere();
    flood.name = 'Haethom flood meadow water'; flood.renderOrder = 2; flood.visible = false; root.add(flood);
  }
  let floodState = 'dry';
  const setFlood = state => {
    if (!NETHEREUM_FLOOD_STATES.includes(state)) throw new Error(`Unknown meadow state ${state}`);
    floodState = state; flood.visible = state !== 'dry';
    if (flood.visible) { flood.material.color.set(FLOOD[state].color); flood.material.opacity = FLOOD[state].opacity; }
    return floodState;
  };

  for (const [builder, shadow] of [[hamlet, true], [works, true], [weir, true], [earth, false]]) {
    if (++work % 2 === 0) yield;
    metrics.vertices += builder.vertexCount;
    if ((yield* builder.finishSteps(root, { castShadow: shadow }))) metrics.batches++;
  }
  metrics.batches += gate.children.length + 1;
  return {
    root, metrics,
    mapFeatures: NETHEREUM_BUILDINGS.map(b => ({ id: b.id, name: b.name, x: b.x, z: b.z, w: b.hx * 2, d: b.hz * 2, kind: 'building' })),
    landmarks: NETHEREUM_FARM_LANDMARKS, paths: NETHEREUM_PATHS,
    /** The world's height here: the ground, with the levee and the hummock on it. */
    heightAt: ground,
    hatch: { states: NETHEREUM_HATCH_STATES, set: setHatch, state: () => hatchState },
    meadowWater: { states: NETHEREUM_FLOOD_STATES, set: setFlood, state: () => floodState, mesh: flood },
  };
}
