import { finishBuild } from '../../../world/loading/build-steps.js';
import * as THREE from 'three';
import { createSceneryBuilder } from '../../../world/scenery/scenery-builder.js';
import { clearScatter } from '../../../world/scenery/scenery-clearing.js';
import { imperialMasonry, IMPERIAL_STONE as STONE, IMPERIAL } from '../../../world/scenery/imperial-masonry.js';
import { LOTHARN_FORTS, PASS_FORT_STANDARD, fortGateShut, fortKeepsClear } from './lotharn-forts.js';
import { westWaterSurface } from '../western-regions/west-ground.js';

/**
 * What the Empire's forts on the Lotharn passes look like (their numbers are src/content/regions/west-lotharn/lotharn-forts.js): at
 * each, one curtain from cliff to cliff, its towers, one gate toward the mountains, and behind it a keep
 * and a barrack on a trodden yard. The same masonry as Varn (src/world/scenery/imperial-masonry.js), a size smaller.
 *
 * A wall stands on the ground it finds, piece by piece: across a valley floor it is level, and where it
 * meets the foot of a cliff it climbs the talus in steps until the rock closes over it. Where a beck runs
 * under one there is a grated arch. Nobody stands in any of them.
 *
 * Each fort is one merged mesh, so the three are three draw calls, each culled whole.
 */
const { slate: SLATE, woodDark: WOOD_DARK, slit: SLIT } = IMPERIAL;

export function createLotharnFortsScenery(...args) { return finishBuild(createLotharnFortsScenerySteps(...args)); }

export function* createLotharnFortsScenerySteps(kit) {
  const { root, groundHeight, colliders, scene = root, treeRegistry = null } = kit;
  const group = new THREE.Group(); group.name = 'The forts of the Lotharn passes'; root.add(group);
  const gy = (x, z) => groundHeight(x, z), S = PASS_FORT_STANDARD;
  const push = collider => { colliders.push(collider); return collider; };
  const metrics = { forts: 0, towers: 0, batches: 0, vertices: 0, lifted: null, shut: [], arches: 0 };

  // The countries' own scatter, lifted off the strip each wall stands on and the yard behind it: the two
  // ranges', and the lowland's where a yard stands on it (the Vastos Gate's is on the tip of Vastos).
  metrics.lifted = clearScatter({ scene, colliders, treeRegistry, inside: (x, z) => fortKeepsClear(x, z),
    kinds: ['lotharn-outcrop', 'vastos-thorn', 'vastos-erratic'],
    groups: ['East Lotharn scenery', 'West Lotharn scenery', 'Vastos scenery', 'Meneth scenery', 'Isareos scenery'] });
  yield;

  for (const fort of LOTHARN_FORTS) {
    const b = createSceneryBuilder(fort.name), M = imperialMasonry(b, gy), circuit = fort.circuit, gate = circuit.gates[0], shut = fortGateShut(fort.id);
    yield* M.curtain(circuit, S);
    yield;
    M.circuitTowers(circuit, S, { gateRise: 1.8 });
    M.gatehouse(circuit, gate, S, { shut, rise: 1.2 });
    colliders.push(...circuit.colliders.map(c => ({ ...c })));
    if (shut) {
      for (let s = -gate.halfWidth; s <= gate.halfWidth + 1e-6; s += .7) push({ x: gate.centre.x + gate.along.x * s, z: gate.centre.z + gate.along.z * s, r: .75, kind: 'pass-fort-gate-shut', gate: gate.id });
      metrics.shut.push(gate.id);
    }
    // Where a beck runs under the wall: a grated arch at the water's own level.
    if (fort.waterAt) {
      const water = westWaterSurface(fort.waterAt.x, fort.waterAt.z) ?? gy(fort.waterAt.x, fort.waterAt.z) + .2;
      M.waterArch(circuit, circuit.edges[0], fort.water, S, water); metrics.arches++;
    }
    yield;

    // The keep, its door toward the way through.
    const yard = fort.way[2], toYard = { x: yard.x - fort.keep.x, z: yard.z - fort.keep.z };
    const door = Math.abs(toYard.x) > Math.abs(toYard.z) ? [Math.sign(toYard.x), 0] : [0, Math.sign(toYard.z)];
    const [keepBox, stairBox] = M.keep({ ...fort.keep, turret: 2.3 }, { door, banner: 4.4 });
    push({ ...keepBox, kind: 'pass-fort-keep' }); push({ ...stairBox, kind: 'pass-fort-keep' });

    // The barrack: two storeys of the same stone under slate, its door on the yard.
    {
      const k = fort.barrack, hx = k.width / 2, hz = k.depth / 2, long = k.width >= k.depth;
      const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => gy(k.x + sx * hx, k.z + sz * hz)), base = Math.min(...corners), fall = Math.max(...corners) - base;
      const to = { x: yard.x - k.x, z: yard.z - k.z }, [fx, fz] = long ? [0, Math.sign(to.z) || 1] : [Math.sign(to.x) || 1, 0];
      b.frame(k.x, base, k.z, 0, () => {
        const foot = .9 + fall, height = k.storeys * 2.9;
        b.block(STONE.foot, 0, -1.4, 0, k.width + .4, 2.3 + fall, k.depth + .4);
        b.block(STONE.face, 0, foot, 0, k.width, height, k.depth);
        b.box(STONE.mortar, 0, foot + 2.9, 0, k.width + .14, .14, k.depth + .14);
        b.roof(SLATE, 0, foot + height, 0, (long ? k.depth : k.width) + .9, (long ? k.width : k.depth) + .8, Math.min(k.width, k.depth) * .44, long ? Math.PI / 2 : 0, STONE.face);
        b.block(WOOD_DARK, fx * (hx + .05), foot, fz * (hz + .05), fx ? .12 : 1.4, 2.2, fz ? .12 : 1.4);
        b.block(STONE.cap, fx * (hx + .05), foot + 2.2, fz * (hz + .05), fx ? .16 : 1.9, .24, fz ? .16 : 1.9);
        const along = long ? k.width : k.depth, lights = Math.round(along / 3.4);
        for (let s = 1; s <= k.storeys; s++) for (const side of [-1, 1]) for (let i = 0; i < lights; i++) {
          const o = (i - (lights - 1) / 2) * along / lights;
          if (s === 1 && Math.abs(o) < 1.4 && ((long && fz === side) || (!long && fx === side))) continue;
          b.block(SLIT, long ? o : side * (hx + .04), foot + s * 2.9 - 1.6, long ? side * (hz + .04) : o, long ? .28 : .06, 1.1, long ? .06 : .28);
        }
        b.block(STONE.dark, long ? hx * .6 : 0, foot + height, long ? 0 : hz * .6, .8, Math.min(k.width, k.depth) * .44 + .9, .8);
      });
      // One box, for the chart and for whoever walks into it.
      push({ x: k.x, z: k.z, hx: hx + .25, hz: hz + .25, kind: 'house', width: k.width, depth: k.depth, angle: 0, id: k.id });
    }
    // The yard: trodden earth from the gate back between the keep and the barrack.
    {
      const edge = circuit.edges[0], yaw = Math.atan2(edge.dir.x, edge.dir.z), inward = fort.inward;
      for (let step = 0; step < 4; step++) {
        const at = { x: gate.centre.x + inward.x * (step * 5.5 - 2), z: gate.centre.z + inward.z * (step * 5.5 - 2) };
        yield* b.patchSteps(step % 2 ? '#8c8163' : '#877c5f', groundHeight, at.x, at.z, step < 1 ? 4.4 : 8 + step * 3, 5.7, yaw + Math.PI / 2, .05, 3);
      }
    }
    metrics.towers += M.towers; metrics.vertices += b.vertexCount; metrics.forts++;
    yield* b.finishSteps(group); metrics.batches++;
  }
  return { group, metrics };
}
