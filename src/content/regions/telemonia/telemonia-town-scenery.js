import * as THREE from 'three';
import {
  KETHORN_BUILDINGS, KETHORN_STONE, KETHORN_STREET, HAMLETS, HUT, FIELDS, VINES, ALONG, ACROSS, PENS, PEN,
  buildingColliders, hutColliders, penColliders, penWalls, fieldAt, vineCourseLine, kethornBuildingAt, onKethornStreet,
} from './telemonia-town.js';
import { TELEMONIA_BOX, KETHORN, TERRACES, INNER, kethornPoint, kethornFrame, plainDistance, onKethornTop } from './telemonia-world.js';

/**
 * What the Telemon have built and planted (src/content/regions/telemonia/telemonia-town.js has the numbers), stage 2.
 *
 * - **Kethorn**: "built of the stone it stands on" - the halls of the bands, the granaries and the
 *   cisterns, and the hall at the end of the street, all in the rock's own warm grey, on a plinth, with a
 *   flat roof of stone slabs over a low parapet: "almost everything a wetter people would build of wood
 *   the Telemon build of stone", and timber is the one thing the country is short of. One door each, no
 *   windows but slits high under the eaves. The granaries are round and corbelled to a point, the way dry
 *   stone roofs itself; the cisterns are cut down into the rock with a kerb round them and dark water in
 *   them. The street is the rock's own floor, cleared and laid flat with slabs where it was not.
 * - **The fields**: rows of barley (pale gold) and pulses (low and dark green), each block's rows on the
 *   rock's grain; fallow blocks bare. **The vine** along the middle of every terrace tread.
 * - **The field people's huts**: dry-stone walls a man's height, a roof of brush and earth on poles, a
 *   doorway with nothing in it.
 * - **The folds**: two pens of dry stone at the plain's edge, chest-high, a gateway toward the plain.
 *
 * Its own seeded stream, after stage 1's, so nothing already built moves for it. Every solid thing here
 * is in the game's two collider shapes (src/content/regions/telemonia/telemonia-town.js `buildingColliders`, `hutColliders`).
 */
export const TELEMONIA_TOWN_COLOURS = Object.freeze({
  stone: '#968d7c', stoneDark: '#7f776a', stoneLight: '#a99f8c', slab: '#8a8273', plinth: '#746d61', door: '#2d2620', slit: '#221d18',
  water: '#2f3a3a', kerb: '#9b917f', paving: '#8e8676',
  barley: '#c6a95e', barleyDry: '#b59650', pulses: '#5f6e3f', pulsesDark: '#4f5d36',
  vineStock: '#4e3d2c', vineLeaf: '#56663a', vineLeafDark: '#47552f',
  hutStone: '#8c8371', hutStoneDark: '#77705f', thatch: '#7a6a4e', thatchDark: '#66583f',
});

export function createTelemoniaTownScenery(kit) {
  const steps = createTelemoniaTownScenerySteps(kit);
  let step; do { step = steps.next(); } while (!step.done);
  return step.value;
}

/** Yield field and vine sampling in bounded slices without changing their seed order. */
export function* createTelemoniaTownScenerySteps(kit) {
  let buildWork = 0;
  const { root, material, groundHeight, colliders, dummy, color, round } = kit;
  const group = new THREE.Group(); group.name = 'Telemonia town and fields'; root.add(group);
  const C = TELEMONIA_TOWN_COLOURS, gy = (x, z) => groundHeight(x, z);
  let seed = 7713029;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a, b) => a + random() * (b - a);
  const metrics = { batches: 0, buildings: 0, bandHalls: 0, granaries: 0, cisterns: 0, kingHall: 0, huts: 0, pens: 0, colliders: 0,
    barleyRows: 0, pulseRows: 0, rowMetres: 0, fieldBlocks: 0, sownBlocks: 0, vines: 0, vineMetres: 0, paving: 0 };

  // -------------------------------------------------------------------------
  // A small solid-builder: boxes and turned shapes into one vertex-coloured mesh per material
  // -------------------------------------------------------------------------
  const solid = () => ({ p: [], c: [], i: [] });
  const tint = new THREE.Color();
  const shade = (hex, jitter = .05) => tint.set(hex).multiplyScalar(1 - jitter / 2 + random() * jitter);
  /** A box centred at (x, y, z), `sx` along the heading, `sy` up, `sz` across, turned to `yaw` (the game's facing). */
  function box(t, x, y, z, sx, sy, sz, yaw, hex, jitter = .05) {
    const col = shade(hex, jitter), fx = Math.sin(yaw), fz = Math.cos(yaw), rx = fz, rz = -fx;
    const corner = (a, b, c) => [x + fx * a * sx / 2 + rx * c * sz / 2, y + b * sy / 2, z + fz * a * sx / 2 + rz * c * sz / 2];
    const faces = [
      [[1, -1, -1], [1, -1, 1], [1, 1, 1], [1, 1, -1]], [[-1, -1, 1], [-1, -1, -1], [-1, 1, -1], [-1, 1, 1]],
      [[-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1]], [[-1, -1, 1], [1, -1, 1], [1, -1, -1], [-1, -1, -1]],
      [[-1, -1, 1], [-1, 1, 1], [1, 1, 1], [1, -1, 1]], [[1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, -1]],
    ];
    for (const face of faces) {
      const base = t.p.length / 3;
      for (const v of face) { t.p.push(...corner(...v)); t.c.push(col.r, col.g, col.b); }
      t.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  /** A turned shape: rings of [radius, height] about (x, z) from y, `sides` round. */
  function turned(t, x, y, z, rings, sides, hex, jitter = .05) {
    const col = shade(hex, jitter);
    for (let r = 1; r < rings.length; r++) {
      const [ra, ha] = rings[r - 1], [rb, hb] = rings[r];
      for (let s = 0; s < sides; s++) {
        const a0 = s / sides * Math.PI * 2, a1 = (s + 1) / sides * Math.PI * 2, base = t.p.length / 3;
        t.p.push(x + Math.cos(a0) * ra, y + ha, z + Math.sin(a0) * ra, x + Math.cos(a1) * ra, y + ha, z + Math.sin(a1) * ra,
          x + Math.cos(a1) * rb, y + hb, z + Math.sin(a1) * rb, x + Math.cos(a0) * rb, y + hb, z + Math.sin(a0) * rb);
        for (let k = 0; k < 4; k++) t.c.push(col.r, col.g, col.b);
        t.i.push(base, base + 2, base + 1, base, base + 3, base + 2);
      }
    }
  }
  function flush(t, name, { double = false, roughness } = {}) {
    if (!t.i.length) return null;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(t.p, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(t.c, 3));
    geometry.setIndex(t.i); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material('#ffffff', { vertexColors: true, flatShading: true, ...(double ? { side: THREE.DoubleSide } : {}), ...(roughness === undefined ? {} : { roughness }) }));
    mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); metrics.batches++;
    return mesh;
  }
  const push = list => { for (const c of list) { colliders.push(c); metrics.colliders++; } };

  // -------------------------------------------------------------------------
  // Kethorn
  // -------------------------------------------------------------------------
  {
    const town = solid(), cisternWater = solid();
    /** The floor a building stands on: the highest ground under its footprint, so its plinth meets the rock everywhere. */
    const floorOf = b => {
      let high = -Infinity, low = Infinity;
      const half = b.round ? b.radius : Math.max(b.along, b.across) / 2;
      for (let a = -1; a <= 1; a += .25) for (let c = -1; c <= 1; c += .25) {
        const x = b.x + (b.round ? a * half : ALONG.x * a * b.along / 2 + ACROSS.x * c * b.across / 2);
        const z = b.z + (b.round ? c * half : ALONG.z * a * b.along / 2 + ACROSS.z * c * b.across / 2);
        const y = gy(x, z); high = Math.max(high, y); low = Math.min(low, y);
      }
      return { high, low };
    };
    for (const b of KETHORN_BUILDINGS) {
      yield;
      const { high, low } = floorOf(b);
      if (b.kind === 'granary') {
        // Round, of coursed stone, corbelled in to a point; a low door on the street side.
        const r = b.radius, base = low - .3, wall = high + b.height;
        turned(town, b.x, base, b.z, [[r + .12, 0], [r + .12, high - base + .35]], 14, C.plinth);
        for (let k = 0; k < 5; k++) turned(town, b.x, high + .35 + k * (b.height - .35) / 5, b.z, [[r - k * .015, 0], [r - (k + 1) * .015, (b.height - .35) / 5]], 14, k % 2 ? C.stone : C.stoneDark, .08);
        turned(town, b.x, wall, b.z, [[r - .08, 0], [r * .82, r * .32], [r * .55, r * .6], [r * .22, r * .82], [.04, r * .95]], 14, C.slab, .06);
        const d = kethornPoint(b.u, b.v - Math.sign(b.v) * (r - .05)), yaw = Math.atan2(-ACROSS.x * Math.sign(b.v), -ACROSS.z * Math.sign(b.v));
        box(town, d.x, high + .75, d.z, .9, 1.5, .12, yaw + Math.PI / 2, C.door, 0);
        metrics.granaries++;
      } else if (b.kind === 'cistern') {
        // A tank of dressed stone with its kerb standing a little over the rock and dark water in it. (The lore's
        // cisterns are "cut into the rock"; the rock's own ground is stage 1's and is not cut, so the tank is
        // drawn by its kerb and its water, which is what is seen of one from above.)
        const yaw = Math.atan2(ALONG.x, ALONG.z), kerbTop = high + b.height;
        for (const side of [-1, 1]) {
          const along = kethornPoint(b.u, b.v + side * (b.across / 2 - .2)), end = kethornPoint(b.u + side * (b.along / 2 - .2), b.v);
          box(town, along.x, (kerbTop + low - .4) / 2, along.z, b.along, kerbTop - low + .4, .4, yaw, C.kerb);
          box(town, end.x, (kerbTop + low - .4) / 2, end.z, .4, kerbTop - low + .4, b.across, yaw, C.kerb);
        }
        const water = kethornPoint(b.u, b.v);
        box(cisternWater, water.x, high + .22, water.z, b.along - .78, .1, b.across - .78, yaw, C.water, 0);
        const step = kethornPoint(b.u + b.along / 2 + .35, b.v); box(town, step.x, high + .15, step.z, .5, .3, 1.4, yaw, C.stoneDark);
        metrics.cisterns++;
      } else {
        // A hall: a plinth, walls of coursed stone to the eaves, a cornice, a flat roof of slabs behind a low parapet.
        const yaw = Math.atan2(ALONG.x, ALONG.z), base = low - .4, floor = high + KETHORN_STONE.plinth;
        box(town, b.x, (base + floor) / 2, b.z, b.along + .3, floor - base, b.across + .3, yaw, C.plinth);
        const courses = 6, wallH = b.height;
        for (let k = 0; k < courses; k++) {
          const y = floor + (k + .5) * wallH / courses, inset = k % 2 ? 0 : .03;
          box(town, b.x, y, b.z, b.along - inset, wallH / courses, b.across - inset, yaw, k % 2 ? C.stone : C.stoneDark, .07);
        }
        const eaves = floor + wallH;
        box(town, b.x, eaves + .12, b.z, b.along + .5, .24, b.across + .5, yaw, C.stoneLight);
        box(town, b.x, eaves + .3, b.z, b.along - .2, .25, b.across - .2, yaw, C.slab);
        // The parapet round the roof.
        for (const side of [-1, 1]) {
          const s1 = kethornPoint(b.u, b.v + side * (b.across / 2 + .1)), s2 = kethornPoint(b.u + side * (b.along / 2 + .1), b.v);
          box(town, s1.x, eaves + .55, s1.z, b.along + .4, .5, .3, yaw, C.stone);
          box(town, s2.x, eaves + .55, s2.z, .3, .5, b.across + .4, yaw, C.stone);
        }
        // One door, on the street side; slits high under the eaves along both long sides.
        const doorAt = b.turned ? kethornPoint(b.u + b.along / 2 + .02, b.v) : kethornPoint(b.u, b.v + b.door * (b.across / 2 + .02));
        const doorYaw = b.turned ? yaw + Math.PI / 2 : yaw;
        box(town, doorAt.x, floor + 1.1, doorAt.z, 1.4, 2.2, .14, doorYaw, C.door, 0);
        box(town, doorAt.x, floor + 2.32, doorAt.z, 1.9, .26, .22, doorYaw, C.stoneLight);
        const long = b.turned ? b.across : b.along, slits = Math.max(2, Math.floor(long / 3.2));
        for (const side of [-1, 1]) for (let s = 0; s < slits; s++) {
          const t = (s + .5) / slits - .5;
          const at = b.turned ? kethornPoint(b.u + side * (b.along / 2 + .02), b.v + t * b.across) : kethornPoint(b.u + t * b.along, b.v + side * (b.across / 2 + .02));
          box(town, at.x, floor + wallH - .7, at.z, .2, .7, .12, b.turned ? yaw + Math.PI / 2 : yaw, C.slit, 0);
        }
        // The hall at the end has nothing more than its place: no more door, no more height.
        if (b.kind === 'king-hall') metrics.kingHall++; else metrics.bandHalls++;
      }
      push(buildingColliders(b));
      metrics.buildings++;
    }
    // The street: the rock's own floor, laid flat with slabs where it is rough, from the gate to the far end.
    for (let u = KETHORN_STREET.to + 1; u <= KETHORN_STREET.from; u += 2.2) for (let v = -KETHORN_STREET.half + 1; v <= KETHORN_STREET.half - .9; v += 2.1) {
      if ((++buildWork & 127) === 0) yield;
      const p = kethornPoint(u + range(-.15, .15), v + range(-.1, .1));
      if (!onKethornTop(p.x, p.z, .5) || kethornBuildingAt(p.x, p.z, .3)) continue;
      box(town, p.x, gy(p.x, p.z) + .02, p.z, range(1.6, 2.1), .12, range(1.5, 1.95), Math.atan2(ALONG.x, ALONG.z) + range(-.05, .05), C.paving, .1);
      metrics.paving++;
    }
    flush(town, 'Kethorn: the halls, the granaries and the cisterns');
    const water = flush(cisternWater, 'Kethorn: the cisterns’ water', { roughness: .2 });
    if (water) water.castShadow = false;
  }

  // -------------------------------------------------------------------------
  // The field people's huts
  // -------------------------------------------------------------------------
  {
    const huts = solid();
    for (const hamlet of HAMLETS) for (const hut of hamlet.huts) {
      yield;
      const fx = Math.sin(hut.yaw), fz = Math.cos(hut.yaw), sx = fz, sz = -fx;
      let low = Infinity, high = -Infinity;
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) { const y = gy(hut.x + sx * a * HUT.long / 2 + fx * b * HUT.deep / 2, hut.z + sz * a * HUT.long / 2 + fz * b * HUT.deep / 2); low = Math.min(low, y); high = Math.max(high, y); }
      const yaw = hut.yaw + Math.PI / 2, base = low - .3, top = high + HUT.eaves;
      // Four walls of rough dry stone, the front one with a doorway in its middle.
      const wall = (along, across, length, depthY = top - base) => { box(huts, hut.x + sx * along + fx * across, (base + top) / 2, hut.z + sz * along + fz * across, length, depthY, .45, yaw, C.hutStone, .12); };
      wall(0, -HUT.deep / 2 + .22, HUT.long);
      for (const side of [-1, 1]) box(huts, hut.x + sx * side * (HUT.long / 2 - .22), (base + top) / 2, hut.z + sz * side * (HUT.long / 2 - .22), .45, top - base, HUT.deep, yaw, C.hutStoneDark, .12);
      for (const side of [-1, 1]) wall(side * (HUT.long / 4 + .25), HUT.deep / 2 - .22, HUT.long / 2 - .5);
      box(huts, hut.x + fx * (HUT.deep / 2 - .2), (high + .02 + top) / 2 + .55, hut.z + fz * (HUT.deep / 2 - .2), 1.0, top - high - 1.1, .45, yaw, C.hutStone, .1);
      box(huts, hut.x + fx * (HUT.deep / 2 - .18), high + .55, hut.z + fz * (HUT.deep / 2 - .18), .95, 1.1, .2, yaw, C.door, 0);
      // The roof: brush and earth on poles, a little proud of the walls, falling to the back.
      const roof = 4, pitch = .12;
      for (let k = 0; k < roof; k++) {
        const across = -HUT.deep / 2 - .25 + (k + .5) * (HUT.deep + .5) / roof;
        box(huts, hut.x + fx * across, top + HUT.roof / 2 + across * pitch, hut.z + fz * across, HUT.long + .55, HUT.roof * .6, (HUT.deep + .5) / roof + .05, yaw, k % 2 ? C.thatch : C.thatchDark, .14);
      }
      push(hutColliders(hut));
      metrics.huts++;
    }
    flush(huts, 'The field people’s huts');
  }

  // -------------------------------------------------------------------------
  // The folds: dry-stone walls chest-high, laid in short lengths that follow the ground, a gateway to the plain
  // -------------------------------------------------------------------------
  {
    const folds = solid();
    for (const pen of PENS) {
      yield;
      const fx = Math.sin(pen.yaw), fz = Math.cos(pen.yaw), sx = fz, sz = -fx;
      const at = (a, b) => ({ x: pen.x + sx * a + fx * b, z: pen.z + sz * a + fz * b });
      for (const [a0, b0, a1, b1] of penWalls(pen)) {
        const p0 = at(a0, b0), p1 = at(a1, b1), length = Math.hypot(p1.x - p0.x, p1.z - p0.z), yaw = Math.atan2(p1.x - p0.x, p1.z - p0.z);
        const n = Math.max(1, Math.round(length / 1.15));
        for (let i = 0; i < n; i++) {
          const t0 = i / n, t1 = (i + 1) / n, x0 = p0.x + (p1.x - p0.x) * t0, z0 = p0.z + (p1.z - p0.z) * t0, x1 = p0.x + (p1.x - p0.x) * t1, z1 = p0.z + (p1.z - p0.z) * t1;
          const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, low = Math.min(gy(x0, z0), gy(x1, z1)), high = gy(mx, mz) + PEN.wall + range(-.08, .06);
          box(folds, mx, (low - .3 + high) / 2, mz, length / n + .06, high - low + .3, PEN.thick + range(-.04, .06), yaw, i % 2 ? C.hutStone : C.hutStoneDark, .14);
          box(folds, mx, high + .07, mz, length / n + .02, .14, PEN.thick * .8, yaw + range(-.03, .03), C.kerb, .1);
        }
      }
      push(penColliders(pen));
      metrics.pens++;
    }
    flush(folds, 'The folds');
  }

  // -------------------------------------------------------------------------
  // The fields: rows down every sown block, on the grain
  // -------------------------------------------------------------------------
  {
    const rows = { barley: [], pulses: [] }, blocks = new Set(), sown = new Set();
    // Only over the Galmeth: the plain's own box, with room.
    const corners = [[-2262, 1090], [-1890, 1090], [-2262, 1394], [-1890, 1394]].map(([x, z]) => kethornFrame(x, z));
    const uMin = Math.min(...corners.map(c => c.u)), uMax = Math.max(...corners.map(c => c.u)), vMin = Math.min(...corners.map(c => c.v)), vMax = Math.max(...corners.map(c => c.v));
    const SEG = 3, STEP = .5;
    for (let j = Math.floor(vMin / FIELDS.across); j <= Math.ceil(vMax / FIELDS.across); j++) {
      for (let k = 0; ; k++) {
        const v = j * FIELDS.across + FIELDS.baulk / 2 + k * FIELDS.row;
        if (v > (j + 1) * FIELDS.across - FIELDS.baulk / 2) break;
        let run = null;
        const close = () => {
          if (run && run.to - run.from >= STEP) {
            const mid = kethornPoint((run.from + run.to) / 2, v);
            rows[run.crop].push({ x: mid.x, z: mid.z, length: run.to - run.from + STEP * .6, crop: run.crop });
            metrics.rowMetres += run.to - run.from;
          }
          run = null;
        };
        for (let u = Math.floor(uMin / STEP) * STEP; u <= uMax; u += STEP) {
          if ((++buildWork & 127) === 0) yield;
          const p = kethornPoint(u, v);
          if (plainDistance(p.x, p.z) > -FIELDS.edge) { close(); continue; }
          const f = fieldAt(p.x, p.z);
          if (f) blocks.add(f.id);
          if (!f || f.crop === 'fallow') { close(); continue; }
          sown.add(f.id);
          if (run && (run.crop !== f.crop || u - run.from >= SEG)) close();
          if (!run) run = { from: u, to: u, crop: f.crop }; else run.to = u;
        }
        close();
      }
    }
    metrics.fieldBlocks = blocks.size; metrics.sownBlocks = sown.size;
    const prism = (() => {
      // A row: a low ridge of plants, wider at the foot, its ends a little narrower.
      const g = new THREE.BufferGeometry(), p = [-.5, 0, -.5, .5, 0, -.5, .5, 1, -.18, -.5, 1, -.18, -.5, 1, .18, .5, 1, .18, .5, 0, .5, -.5, 0, .5];
      g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
      g.setIndex([0, 2, 1, 0, 3, 2, 3, 5, 2, 3, 4, 5, 4, 6, 5, 4, 7, 6, 0, 7, 4, 0, 4, 3, 1, 2, 5, 1, 5, 6]);
      g.computeVertexNormals(); return g;
    })();
    const yaw = Math.atan2(ALONG.x, ALONG.z);
    for (const [crop, list] of Object.entries(rows)) {
      if (!list.length) continue;
      const batch = new THREE.InstancedMesh(prism, material('#ffffff', { flatShading: true }), list.length);
      for (const [i, row] of list.entries()) {
        if ((i & 127) === 0) yield;
        const h = crop === 'barley' ? range(.5, .66) : range(.26, .36), w = crop === 'barley' ? range(.42, .52) : range(.48, .6);
        dummy.position.set(row.x, gy(row.x, row.z) - .02, row.z);
        dummy.rotation.set(0, yaw + Math.PI / 2, 0); dummy.scale.set(row.length, h, w); dummy.updateMatrix();
        batch.setMatrixAt(i, dummy.matrix);
        batch.setColorAt(i, color.set(crop === 'barley' ? (random() < .5 ? C.barley : C.barleyDry) : (random() < .5 ? C.pulses : C.pulsesDark)).multiplyScalar(.93 + random() * .12));
      }
      yield;
      batch.receiveShadow = true; batch.computeBoundingSphere(); batch.name = crop === 'barley' ? 'Galmeth barley' : 'Galmeth pulses';
      group.add(batch); metrics.batches++;
      if (crop === 'barley') metrics.barleyRows = list.length; else metrics.pulseRows = list.length;
    }
  }

  // -------------------------------------------------------------------------
  // The vine: a row along the middle of every terrace tread, traced like the terrace walls are
  // -------------------------------------------------------------------------
  {
    const STEP = 1.5, B = TELEMONIA_BOX;
    const cols = Math.floor((B.maxX - B.minX) / STEP) + 1, rowsN = Math.floor((B.maxZ - B.minZ) / STEP) + 1;
    const level = new Float32Array(cols * rowsN).fill(NaN);
    for (let j = 0; j < rowsN; j++) for (let i = 0; i < cols; i++) {
      if ((++buildWork & 127) === 0) yield;
      const x = B.minX + i * STEP, z = B.minZ + j * STEP, pd = plainDistance(x, z);
      if (pd < -1 || pd > INNER.terraceWidth + 1) continue;
      const c = vineCourseLine(x, z);
      if (c !== null) level[j * cols + i] = c;
    }
    const stocks = [];
    for (let course = 0; course < Math.round(INNER.terraceTop / TERRACES.period); course++) {
      const L = course + VINES.mid, segments = [];
      for (let j = 0; j < rowsN - 1; j++) for (let i = 0; i < cols - 1; i++) {
        if ((++buildWork & 127) === 0) yield;
        const c = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
        if (c.some(([a, b]) => Number.isNaN(level[b * cols + a]))) continue;
        const hits = [];
        for (let e = 0; e < 4; e++) {
          const [i0, j0] = c[e], [i1, j1] = c[(e + 1) % 4], a = level[j0 * cols + i0], b = level[j1 * cols + i1];
          if ((a < L) !== (b < L)) { const f = (L - a) / (b - a); hits.push({ x: B.minX + (i0 + (i1 - i0) * f) * STEP, z: B.minZ + (j0 + (j1 - j0) * f) * STEP }); }
        }
        if (hits.length === 2) segments.push(hits);
      }
      // Along each little segment a vine every so often: the segments are the contour, a lattice cell at a time.
      let carry = 0;
      for (const [a, b] of segments) {
        if ((++buildWork & 127) === 0) yield;
        const length = Math.hypot(b.x - a.x, b.z - a.z);
        metrics.vineMetres += length;
        carry += length;
        while (carry >= VINES.spacing) {
          carry -= VINES.spacing;
          const t = Math.max(0, Math.min(1, 1 - carry / Math.max(length, 1e-6)));
          stocks.push({ x: a.x + (b.x - a.x) * t + range(-.12, .12), z: a.z + (b.z - a.z) * t + range(-.12, .12), s: range(.8, 1.15), rot: range(0, 6.28) });
        }
      }
    }
    if (stocks.length) {
      const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.04, .07, 1, 5), material(C.vineStock), stocks.length);
      const leaves = new THREE.InstancedMesh(round, material('#ffffff', { flatShading: true }), stocks.length);
      for (const [i, vine] of stocks.entries()) {
        if ((i & 127) === 0) yield;
        const y = gy(vine.x, vine.z);
        dummy.position.set(vine.x, y + .35 * vine.s, vine.z); dummy.rotation.set(range(-.1, .1), vine.rot, range(-.1, .1)); dummy.scale.set(vine.s, .7 * vine.s, vine.s); dummy.updateMatrix();
        trunks.setMatrixAt(i, dummy.matrix);
        dummy.position.set(vine.x, y + .82 * vine.s, vine.z); dummy.rotation.set(0, vine.rot, 0); dummy.scale.set(.62 * vine.s, .36 * vine.s, .55 * vine.s); dummy.updateMatrix();
        leaves.setMatrixAt(i, dummy.matrix);
        leaves.setColorAt(i, color.set(random() < .5 ? C.vineLeaf : C.vineLeafDark).multiplyScalar(.92 + random() * .14));
      }
      yield;
      for (const mesh of [trunks, leaves]) { mesh.castShadow = true; mesh.receiveShadow = true; mesh.computeBoundingSphere(); group.add(mesh); metrics.batches++; }
      trunks.name = 'Terrace vines (stocks)'; leaves.name = 'Terrace vines';
      metrics.vines = stocks.length;
    }
  }
  metrics.rowMetres = Math.round(metrics.rowMetres); metrics.vineMetres = Math.round(metrics.vineMetres);
  void onKethornStreet;
  return { group, metrics };
}
