import * as THREE from 'three';
import { createSceneryBuilder } from './scenery-builder.js';
import {
  ELAGOS_BASINS, ELAGOS_REACHES, ELAGOS_PLACES, ELAGOS_SIGNS, NEMMEL, ICE_ROAD_STONE, LAKE_SHRINE,
  DROWNED_CAUSEWAY, THE_STAIR, LINK_BRIDGE, onLinkBridge, elagosWaterDistance, elagosWaterSurface,
} from './elagos-world.js';
import {
  AMBRON, ambronPoint, AMBRON_CIRCUIT, AMBRON_STANDARD, AMBRON_GATES, AMBRON_BUILDINGS, AMBRON_OUTSIDE,
  AMBRON_STREETS, AMBRON_QUAYS, AMBRON_STALLS, AMBRON_WELL, AMBRON_GAUGE, AMBRON_SLEDGES, AMBRON_CHAIN,
  AMBRON_MARKET, CAUSEWAY, CHANNEL, PHYSIC_GARDEN, ambronColliders, onCauseway, cityGround,
} from './ambron.js';

/**
 * The scenery of Elagos: the lakes, Ambron on the narrows, and the lake country.
 *
 * One call from `world.js`. Everything static is built with
 * `createSceneryBuilder`, so each district of the city is a single merged,
 * vertex-coloured, flat-shaded mesh and therefore one draw call that the
 * renderer culls whole — which is how the largest city on the continent costs
 * less to draw than Solis does. The water is its own shader material, one mesh
 * per lake or reach.
 *
 * **The layers.** The lore's first fact about Ambron is that it has no single
 * architectural period, so the masonry is chosen by where it stands rather than
 * by what it is: the oldest lake-stone at the water, where the first settlement
 * was and where the chain still is; high imperial ashlar on the east and north,
 * where the city was rebuilt at its greatest; patched contraction-period rubble
 * on the west bank and the west wall; and new coursed work on the south-east,
 * which was taken down and put back up within living memory. The street paving
 * changes with it, and so do the roofs.
 */

// The four Ambrons, in stone.
const MASONRY = Object.freeze({
  lake: Object.freeze({ face: '#87897c', dark: '#6b6d62', cap: '#989a8b', mortar: '#5e6057', paving: '#757769' }),
  imperial: Object.freeze({ face: '#aaa590', dark: '#8a8674', cap: '#c0baa2', mortar: '#7c7967', paving: '#918d79' }),
  patched: Object.freeze({ face: '#8f867a', dark: '#736b62', cap: '#9d9487', mortar: '#635d55', paving: '#726b62' }),
  new: Object.freeze({ face: '#b6b099', dark: '#9a9480', cap: '#cac4ab', mortar: '#8f8a76', paving: '#9e9884' }),
});
const WOOD = '#71523a', WOOD_LIGHT = '#a98b5f', WOOD_DARK = '#54402d', TAR = '#3a342c';
const TILE = '#7b6a58', TILE_DARK = '#655749', SHINGLE = '#5f5a4e', THATCH = '#9d8a5c';
const IRON = '#4a4843', BRONZE = '#8a6c3c', LIME = '#d5cdb4', CLOTH = '#c9bd9c', CANVAS = '#cfc4a3';
const REED = '#798a5e', LEAF = '#4d6a46', LEAF_DARK = '#3d5a3c', BARK = '#6a5c48';
const EARTH = '#7b6a4c', EARTH_DARK = '#5d4f3a', SPOIL = '#857452', FOAM = '#dde8e6', SHINGLE_ROCK = '#8d8f86';
const BANNER = '#7c3a2f', BANNER_GOLD = '#c9a24a', PAPER = '#e7dcbc';

/** Which Ambron laid the stone at a point of the city, in its own frame. */
export function masonryAt(a, b) {
  if (Math.abs(a) < 42) return MASONRY.lake;          // the water ends: the first settlement, never rebuilt
  if (a > 0 && b < 0) return MASONRY.imperial;        // the high city, north-east
  if (a > 0) return MASONRY.new;                      // the south-east, taken down and put back in living memory
  return MASONRY.patched;                             // the west bank and the west wall, mended in the thin years
}

const PAVING = Object.freeze({ 'lake-stone': MASONRY.lake.paving, imperial: MASONRY.imperial.paving, patched: MASONRY.patched.paving, new: MASONRY.new.paving });

export function createElagosScenery({ parent, heightAt, colliders, signs, roadDistance }) {
  // Named apart from world-regions.js's own 'Elagos scenery' group, which holds the region's scatter.
  const district = new THREE.Group(); district.name = 'Ambron and the lakes of Elagos'; parent.add(district);
  const metrics = { buildings: 0, towers: AMBRON_CIRCUIT.towers.length, waterMeshes: 0, colliders: 0, props: 0, vertices: 0 };
  let seed = 0x1e1a9051;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a, b) => a + random() * (b - a);
  const push = collider => { colliders.push(collider); metrics.colliders++; return collider; };
  const y = (x, z) => heightAt(x, z);
  const P = ambronPoint;
  const yAt = (a, b) => { const p = P(a, b); return y(p.x, p.z); };

  // -------------------------------------------------------------------------
  // Water: one mesh per lake and reach, on one cold northern shader
  // -------------------------------------------------------------------------
  const waterMaterial = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } }, side: THREE.DoubleSide,
    vertexShader: 'varying vec3 p; void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform float time; varying vec3 p;
      void main(){
        float swell = sin(p.x * .06 + time * .55) * sin(p.z * .045 - time * .38);
        float glint = sin(p.x * .31 - time * 1.05 + p.z * .22) * sin(p.x * .11 + p.z * .47 + time * .3);
        vec3 deep = vec3(.09, .22, .27), shallow = vec3(.19, .36, .38);
        vec3 c = mix(deep, shallow, clamp(swell * .5 + .5, 0., 1.));
        c += vec3(.28, .33, .30) * pow(max(glint, 0.), 14.);
        gl_FragColor = vec4(c, 1.);
      }`,
  });
  const waterGroup = new THREE.Group(); waterGroup.name = 'The lakes of Elagos'; district.add(waterGroup);
  function waterMesh(name, positions, indices) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, waterMaterial);
    mesh.name = name; mesh.receiveShadow = false; mesh.castShadow = false;
    waterGroup.add(mesh); metrics.waterMeshes++;
    return mesh;
  }
  // Basins that share a name and a shore are drawn as one mesh: the Thelas chain is
  // three basins but one draw call, and a lake a traveler cannot see is not submitted.
  const basinGroups = new Map();
  for (const water of ELAGOS_BASINS) {
    const key = water.id.startsWith('thelas') ? 'The Thelas chain' : water.name;
    if (!basinGroups.has(key)) basinGroups.set(key, []);
    basinGroups.get(key).push(water);
  }
  for (const [name, group] of basinGroups) {
    // A fan from the middle: every basin is a turned ellipse, so a fan closes it.
    const positions = [], indices = [];
    for (const water of group) {
      const base = positions.length / 3;
      positions.push(water.centre.x, water.surface, water.centre.z);
      water.shore.forEach(p => positions.push(p.x, water.surface, p.z));
      for (let i = 0; i < water.shore.length; i++) indices.push(base, base + 1 + i, base + 1 + (i + 1) % water.shore.length);
    }
    waterMesh(name, positions, indices);
  }
  const reachSamples = {};
  for (const course of ELAGOS_REACHES) {
    const positions = [], indices = [], samples = [];
    const points = course.points;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], length = Math.hypot(b.x - a.x, b.z - a.z), steps = Math.max(1, Math.round(length / 6));
      const nx = -(b.z - a.z) / length, nz = (b.x - a.x) / length;
      for (let s = i === 1 ? 0 : 1; s <= steps; s++) {
        const t = s / steps;
        samples.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, nx, nz,
          half: a.half + (b.half - a.half) * t, surface: a.surface + (b.surface - a.surface) * t });
      }
    }
    samples.forEach((s, index) => {
      positions.push(s.x - s.nx * s.half, s.surface, s.z - s.nz * s.half, s.x + s.nx * s.half, s.surface, s.z + s.nz * s.half);
      if (index) { const v = index * 2; indices.push(v - 2, v, v - 1, v - 1, v, v + 1); }
    });
    waterMesh(course.name, positions, indices);
    reachSamples[course.id] = samples;
  }

  // Water colliders: a close band just inside every shore, so nobody walks a lake.
  // The causeway's lane and the Link crossing are left open; the bed below them is
  // cut away, so the deck is the only standing ground over the water.
  const WATER_R = 2.7, WATER_STEP = 3.6;
  // Only the deck's own lane is left open; its parapets close the strip beside it,
  // as the Caloss bridge's rails do, so no pocket of standable river is left over.
  const openWater = (x, z) => onCauseway(x, z, .2) || onLinkBridge(x, z, .2);
  function blockWater(x, z) {
    if (openWater(x, z)) return;
    push({ x, z, r: WATER_R, kind: 'lake-water' });
  }
  for (const water of ELAGOS_BASINS) {
    const shore = water.shore;
    for (let i = 0; i < shore.length; i++) {
      const a = shore[i], b = shore[(i + 1) % shore.length], length = Math.hypot(b.x - a.x, b.z - a.z);
      const steps = Math.max(1, Math.round(length / WATER_STEP));
      for (let s = 0; s < steps; s++) {
        const t = s / steps, px = a.x + (b.x - a.x) * t, pz = a.z + (b.z - a.z) * t;
        const dx = water.centre.x - px, dz = water.centre.z - pz, l = Math.hypot(dx, dz) || 1;
        blockWater(px + dx / l * (WATER_R - .2), pz + dz / l * (WATER_R - .2));
      }
    }
  }
  for (const [id, samples] of Object.entries(reachSamples)) {
    void id;
    for (let i = 0; i < samples.length; i += 1) {
      const s = samples[i];
      if (i && Math.hypot(s.x - samples[i - 1].x, s.z - samples[i - 1].z) < WATER_STEP * .6) continue;
      const inset = Math.max(0, s.half - WATER_R + .2);
      for (const side of [-1, 1]) blockWater(s.x + s.nx * inset * side, s.z + s.nz * inset * side);
    }
  }

  // -------------------------------------------------------------------------
  // Helpers shared by every district
  // -------------------------------------------------------------------------
  /**
   * Paving is laid a few square metres at a time, and no two patches of it weathered
   * the same: every slab is its street's own stone, shaded a little up or down, so a
   * quay reads as a worked surface rather than a painted plane.
   */
  const shades = new Map(), shadeColour = new THREE.Color();
  function shade(tint, step) {
    const key = `${tint}|${step}`;
    if (!shades.has(key)) {
      shadeColour.set(tint).multiplyScalar(1 + (step % 5 - 2) * .045);
      shades.set(key, `#${shadeColour.getHexString()}`);
    }
    return shades.get(key);
  }
  /** A ground-hugging paved ribbon along a world polyline. */
  function ribbon(b, tint, points, width, lift = .065) {
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], c = points[i], length = Math.hypot(c.x - a.x, c.z - a.z);
      if (length < .01) continue;
      const steps = Math.max(1, Math.round(length / 6)), yaw = Math.atan2(c.x - a.x, c.z - a.z);
      for (let s = 0; s < steps; s++) {
        const t = (s + .5) / steps;
        b.patch(shade(tint, i * 3 + s * 2), heightAt, a.x + (c.x - a.x) * t, a.z + (c.z - a.z) * t, width, length / steps + .3, yaw, lift, 2);
      }
    }
  }
  /** A paved field, in slabs of about six metres, in the city's frame. */
  function pavedField(b, tint, minA, maxA, minB, maxB, lift = .045) {
    const columns = Math.max(1, Math.round((maxA - minA) / 6)), rows = Math.max(1, Math.round((maxB - minB) / 6));
    for (let i = 0; i < columns; i++) for (let j = 0; j < rows; j++) {
      const a = minA + (maxA - minA) * (i + .5) / columns, bb = minB + (maxB - minB) * (j + .5) / rows;
      const spot = P(a, bb);
      b.patch(shade(tint, i * 2 + j * 3 + (i % 2)), heightAt, spot.x, spot.z,
        (maxA - minA) / columns + .25, (maxB - minB) / rows + .25, 0, lift, 2);
    }
  }
  /** Colliders for an axis-aligned box in the city frame. */
  const boxCollider = (a, b2, w, d, kind, id = undefined) => push({ ...P(a, b2), hx: w / 2, hz: d / 2, kind, ...(id ? { id } : {}) });

  // =========================================================================
  // Ambron: the walls
  // =========================================================================
  const walls = createSceneryBuilder('Ambron walls');
  const S = AMBRON_STANDARD, T = S.wallThickness / 2, HALF_TOWER = S.towerSize / 2;
  const cityFrame = (x, z) => ({ a: x - AMBRON.centre.x, b: z - AMBRON.centre.z });

  for (const run of AMBRON_CIRCUIT.runs) {
    const edge = AMBRON_CIRCUIT.edges[run.edge], length = run.to - run.from;
    if (length < .1) continue;
    const pieces = Math.max(1, Math.ceil(length / 5)), turn = Math.atan2(edge.dir.x, edge.dir.z);
    for (let k = 0; k < pieces; k++) {
      const a0 = run.from + length * k / pieces, a1 = run.from + length * (k + 1) / pieces, mid = (a0 + a1) / 2, span = a1 - a0;
      const m = AMBRON_CIRCUIT.pointOn(edge, mid, 0), local = cityFrame(m.x, m.z), M = masonryAt(local.a, local.b);
      const ground = cityGround(local.a);
      const outward = Math.sign(edge.out.x * Math.cos(turn) - edge.out.z * Math.sin(turn)) || 1;
      walls.frame(m.x, ground, m.z, turn, () => {
        const X = v => v * outward;
        // A battered footing of the first settlement's lake-stone, then the wall of its own age.
        walls.block(MASONRY.lake.dark, 0, -.6, 0, S.wallThickness + .6, 1.5, span + .02);
        walls.block(M.face, X(1.0), .9, 0, 2.6, S.wallHeight - 1.6, span + .02);
        walls.block(M.dark, X(-1.3), .9, 0, 2.0, S.walkHeight - .9, span + .02);
        walls.box(M.mortar, X(1.0), 3.4, 0, 2.66, .12, span + .04);
        // The parapet: a crenellated coping on the field face, a low one on the town face.
        const merlons = Math.max(1, Math.round(span / 1.7));
        for (let s = 0; s < merlons; s++)
          walls.block(M.cap, X(1.55), S.wallHeight - 1.1, -span / 2 + (s + .5) * span / merlons, .78, 1.1, span / merlons * .56);
        walls.box(M.cap, X(1.0), S.wallHeight - 1.12, 0, 2.7, .12, span + .04);
        walls.box(M.dark, X(-1.3), S.walkHeight + .3, 0, 2.06, .6, span + .02);
        // The wall walk itself.
        walls.box(M.dark, X(-.2), S.walkHeight, 0, 2.3, .16, span + .02);
        if (k % 2 === 0) walls.block('#221f1b', X(2.32), 3.0, 0, .06, 1.1, .2);
      });
    }
  }

  // Towers: square, a storey above the wall, with a steep lake-country roof.
  for (const tower of AMBRON_CIRCUIT.towers) {
    const edge = AMBRON_CIRCUIT.edges[tower.edge], local = cityFrame(tower.x, tower.z), M = masonryAt(local.a, local.b);
    const ground = cityGround(local.a), top = S.towerPlatform;
    const chainTower = Math.abs(local.a) > 20 && Math.abs(local.a) < 32 && local.b > 60;
    walls.frame(tower.x, ground, tower.z, Math.atan2(edge.dir.x, edge.dir.z), () => {
      walls.block(MASONRY.lake.dark, 0, -.7, 0, S.towerSize + .8, 1.7, S.towerSize + .8);
      walls.block(M.face, 0, .9, 0, S.towerSize, top - .9, S.towerSize);
      walls.box(M.mortar, 0, 3.4, 0, S.towerSize + .06, .12, S.towerSize + .06);
      walls.box(M.cap, 0, top, 0, S.towerSize + .7, .3, S.towerSize + .7);
      for (const [sx, sz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        for (let i = 0; i < 3; i++) {
          const offset = (i - 1) * 1.8;
          walls.block(M.cap, sx * (HALF_TOWER + .2) + (sz ? offset : 0), top + .3, sz * (HALF_TOWER + .2) + (sx ? offset : 0), sz ? .95 : 1.0, .9, sx ? .95 : 1.0);
        }
        walls.block('#221f1b', sx * (HALF_TOWER + .02), top - 3.4, sz * (HALF_TOWER + .02), sz ? .22 : .06, 1.2, sx ? .22 : .06);
      }
      walls.cone(chainTower ? TILE_DARK : SHINGLE, 0, top + 1.2, 0, HALF_TOWER * 1.34, 3.4, Math.PI / 4, 4);
      if (chainTower) walls.cylinder(IRON, 0, top - 4.4, 0, .5, .4, 0, 7);
    });
  }

  // The land gates: an arch, a gallery over the passage, leaves drawn back, a board.
  for (const gate of AMBRON_CIRCUIT.gates) {
    const spec = AMBRON_GATES.find(entry => entry.id === gate.id);
    if (spec.kind !== 'gate') continue;
    const edge = AMBRON_CIRCUIT.edges[gate.edge], turn = Math.atan2(edge.dir.x, edge.dir.z);
    const local = cityFrame(gate.centre.x, gate.centre.z), M = masonryAt(local.a, local.b), ground = cityGround(local.a);
    const outward = Math.sign(edge.out.x * Math.cos(turn) - edge.out.z * Math.sin(turn)) || 1;
    walls.frame(gate.centre.x, ground, gate.centre.z, turn, () => {
      const X = v => v * outward, w = gate.halfWidth;
      walls.block(M.face, X(1.0), S.walkHeight - .4, 0, 2.6, S.wallHeight - S.walkHeight + .4, w * 2 + 1.2);
      walls.box(M.dark, X(-.2), S.walkHeight - .5, 0, S.wallThickness, .18, w * 2 + 1.2);
      walls.box(M.cap, X(1.55), S.wallHeight - 1.12, 0, .8, .14, w * 2 + 1.4);
      // A relieving arch of voussoirs over the passage, on both faces.
      for (const face of [1, -1]) for (let s = -3; s <= 3; s++)
        walls.block(M.cap, X(face * (T - .18)), S.walkHeight - 1.1 + (3 - Math.abs(s)) * .12, s * .82, .34, .62, .74, s * .12);
      for (const side of [-1, 1]) {
        walls.block(WOOD_DARK, X(-T + .9), 0, side * (w - .16), 1.9, S.walkHeight - .9, .24);
        for (const level of [1.1, 2.4, 3.5]) walls.block(IRON, X(-T + .9), level, side * (w - .3), 1.7, .14, .1);
      }
      if (spec.id === 'plain-gate' || spec.id === 'lake-gate') {
        // The toll board over the arch: what is owed on grain, fish, timber, salt and hides.
        walls.block(WOOD_DARK, X(T + .1), S.walkHeight - 1.5, 0, .16, 1.9, w * 1.9);
        for (let line = 0; line < 5; line++) walls.block(PAPER, X(T + .22), S.walkHeight - 1.2 + line * .3, 0, .03, .14, w * 1.5);
      }
    });
  }

  // The water gates: no wall over the channel, two great towers each side, and the chain in the south one.
  for (const gate of AMBRON_CIRCUIT.gates) {
    const spec = AMBRON_GATES.find(entry => entry.id === gate.id);
    if (spec.kind !== 'water') continue;
    const b = spec.face === 'south' ? AMBRON.halfB : -AMBRON.halfB;
    // A stone sill across the channel floor, and the mooring rings the waiting boats take.
    for (const side of [-1, 1]) {
      const spot = P(side * (CHANNEL.half + 1.2), b);
      walls.block(MASONRY.lake.dark, spot.x, CHANNEL.surface - 1.2, spot.z, 3.0, 3.6, S.wallThickness + 2, 0);
      walls.cylinder(IRON, spot.x, CHANNEL.surface + .3, spot.z, .22, .5, 0, 7);
    }
    if (spec.face !== 'south') continue;
    // The chain: a catenary of links between the two towers, just clear of the water.
    const links = 24, span = AMBRON_CHAIN.halfSpan;
    const at = t => {
      const a = -span + span * 2 * t, spot = P(a, b);
      return [spot.x, AMBRON_CHAIN.ringY - (AMBRON_CHAIN.ringY - AMBRON_CHAIN.sagY) * Math.sin(t * Math.PI), spot.z];
    };
    for (let i = 0; i < links; i++) walls.beam(i % 2 ? IRON : '#3b3934', at(i / links), at((i + 1) / links), .32, .22);
    // The eyes it is made fast to, in the face of each chain tower.
    for (const side of [-1, 1]) {
      const eye = P(side * (span + 1.4), b);
      walls.cylinder(IRON, eye.x, AMBRON_CHAIN.ringY - .4, eye.z, .45, .8, 0, 7);
    }
  }

  // The ditch, wherever it is not standing in the lake.
  for (const piece of AMBRON_CIRCUIT.ditch) {
    const length = Math.hypot(piece.b.x - piece.a.x, piece.b.z - piece.a.z);
    if (length < .6) continue;
    const steps = Math.max(1, Math.ceil(length / 4));
    const mix = (p, q, f) => ({ x: p.x + (q.x - p.x) * f, z: p.z + (q.z - p.z) * f });
    for (let k = 0; k < steps; k++) {
      const f0 = k / steps, f1 = (k + 1) / steps;
      const i0 = mix(piece.inner[0], piece.inner[1], f0), i1 = mix(piece.inner[0], piece.inner[1], f1);
      const o0 = mix(piece.outer[0], piece.outer[1], f0), o1 = mix(piece.outer[0], piece.outer[1], f1);
      const middle = mix(i0, o0, .5);
      if (elagosWaterDistance(middle.x, middle.z) < 4) continue;
      const V = (p, lift = 0) => [p.x, y(p.x, p.z) + .05 + lift, p.z];
      const ia = mix(i0, o0, .24), ib = mix(i1, o1, .24), oa = mix(i0, o0, .76), ob = mix(i1, o1, .76);
      walls.sheet(SPOIL, V(i0), V(i1), V(ib, .01), V(ia, .01));
      walls.sheet(EARTH_DARK, V(ia, .01), V(ib, .01), V(ob, .01), V(oa, .01));
      walls.sheet(SPOIL, V(oa, .01), V(ob, .01), V(o1), V(o0));
      walls.beam(EARTH, V(i0, .18), V(i1, .18), .55, .34);
    }
  }
  // Causeway slabs before each land gate.
  for (const gate of AMBRON_CIRCUIT.gates) {
    const spec = AMBRON_GATES.find(entry => entry.id === gate.id);
    if (spec.kind !== 'gate') continue;
    const out = gate.inward, spot = { x: gate.centre.x - out.x * (T + S.berm + S.ditchWidth / 2), z: gate.centre.z - out.z * (T + S.berm + S.ditchWidth / 2) };
    walls.patch(MASONRY.imperial.paving, heightAt, spot.x, spot.z, S.causewayHalf * 2, S.ditchWidth + 3.4, Math.atan2(out.x, out.z), .1, 3);
  }
  metrics.vertices += walls.vertexCount;
  walls.finish(district);
  for (const collider of ambronColliders()) push({ ...collider });

  // =========================================================================
  // Ambron: the streets, the quays and the two banks
  // =========================================================================
  const town = createSceneryBuilder('Ambron, the banks');

  for (const street of AMBRON_STREETS)
    ribbon(town, PAVING[street.layer], street.points.map(p => P(p.a, p.b)), street.width);
  // The market of the narrows: the widened street, in the oldest paving the city has.
  pavedField(town, MASONRY.lake.paving, AMBRON_MARKET.minA, AMBRON_MARKET.maxA, AMBRON_MARKET.minB, AMBRON_MARKET.maxB);

  // The quays: a paved apron on each bank, a kerb at the water, steps down, bollards and cranes.
  for (const quay of AMBRON_QUAYS) {
    const inner = quay.side > 0 ? quay.to : quay.from, edge = quay.side > 0 ? quay.from : quay.to;
    pavedField(town, MASONRY.lake.paving, Math.min(quay.from, quay.to), Math.max(quay.from, quay.to), quay.minB, quay.maxB, .035);
    void inner;
    // The quay face: a wall of lake-stone from the paving down past the waterline.
    for (let b = quay.minB; b < quay.maxB; b += 6) {
      const spot = P(edge + quay.side * .6, b + 3), top = cityGround(edge);
      town.block(MASONRY.lake.dark, spot.x, CHANNEL.surface - 2.4, spot.z, 1.2, top - CHANNEL.surface + 2.5, 6.1);
      town.box(MASONRY.lake.cap, spot.x, top + .12, spot.z, 1.3, .24, 6.1);
    }
    for (const b of quay.steps) {
      // Water steps: five courses down from the quay into the lake.
      for (let s = 0; s < 5; s++) {
        const spot = P(edge - quay.side * (.4 + s * .7), b);
        town.block(MASONRY.lake.face, spot.x, cityGround(edge) - .35 - s * .62, spot.z, .75, .62, 3.4);
      }
    }
    for (const b of quay.cranes) {
      // A timber jib crane on a stone pad: how the barges are emptied.
      const base = P(quay.side > 0 ? quay.from + 3.6 : quay.to - 3.6, b), ground = y(base.x, base.z);
      town.block(MASONRY.lake.dark, base.x, ground, base.z, 2.6, .35, 2.6);
      town.cylinder(WOOD_DARK, base.x, ground + .35, base.z, .32, 5.4, 0, 7);
      town.beam(WOOD, [base.x, ground + 5.5, base.z], [base.x - quay.side * 4.2, ground + 4.4, base.z], .26);
      town.beam(WOOD, [base.x, ground + 3.4, base.z], [base.x - quay.side * 3.0, ground + 4.6, base.z], .16);
      town.cylinder(IRON, base.x - quay.side * 4.0, ground + 2.9, base.z, .06, 1.4, 0, 4);
      town.block(WOOD_LIGHT, base.x - quay.side * 4.0, ground + 2.3, base.z, .7, .6, .7);
      push({ x: base.x, z: base.z, r: 1.5, kind: 'quay-crane' });
      metrics.props++;
    }
    for (let b = quay.minB + 5; b < quay.maxB; b += 9) {
      const spot = P(edge + quay.side * 1.6, b);
      town.cylinder(MASONRY.lake.cap, spot.x, cityGround(edge) + .1, spot.z, .28, .8, 0, 7);
      push({ x: spot.x, z: spot.z, r: .4, kind: 'bollard' });
    }
  }

  /**
   * Roofs by age, as the walls are: turf-grey slate on the oldest houses by the
   * water, the empire's dark tile, the shingle and thatch of the thin years, and
   * pale new slate where the south-east was rebuilt.
   */
  const ROOFS = Object.freeze({ 'lake-stone': ['#5a5d53', '#4f5249'], imperial: ['#7b5f4c', '#6c5343', '#835f47'],
    patched: ['#5f5a4e', '#8a7a58', '#6a6150'], new: ['#6d7277', '#626870'] });
  /** A house of Ambron: lake-stone footing, walls of its own age, a steep roof against the snow. */
  function houseOf(entry, index) {
    const M = masonryAt(entry.a, entry.b), base = cityGround(entry.a) - .3;
    const wall = shade(M.face, index * 3 + 1), roofs = ROOFS[entry.layer] ?? ROOFS.imperial, roofTint = roofs[index % roofs.length];
    const spot = P(entry.a, entry.b);
    const steep = entry.kind === 'row' || entry.kind === 'house' || entry.kind === 'hall';
    town.frame(spot.x, base, spot.z, 0, () => {
      town.block(MASONRY.lake.dark, 0, 0, 0, entry.w + .5, 1.1, entry.d + .5);
      town.block(wall, 0, 1.1, 0, entry.w, entry.h, entry.d);
      town.box(M.mortar, 0, 1.1 + entry.h * .45, 0, entry.w + .05, .1, entry.d + .05);
      const roofTop = 1.1 + entry.h;
      if (entry.kind === 'granary') {
        // The Ossen granary: a stone drum on a corbelled base with a conical roof, the Empire's own form.
        town.box(M.cap, 0, roofTop, 0, entry.w + .6, .4, entry.d + .6);
        town.cylinder(M.dark, 0, roofTop + .4, 0, Math.min(entry.w, entry.d) * .46, 2.4, 0, 7);
        town.cone(TILE_DARK, 0, roofTop + 2.8, 0, Math.min(entry.w, entry.d) * .58, 3.6, 0, 6);
      } else if (entry.kind === 'shed') {
        town.sheet(SHINGLE, [-entry.w / 2 - .4, roofTop + 2.2, -entry.d / 2 - .4], [entry.w / 2 + .4, roofTop + 2.2, -entry.d / 2 - .4],
          [entry.w / 2 + .4, roofTop + .3, entry.d / 2 + .4], [-entry.w / 2 - .4, roofTop + .3, entry.d / 2 + .4]);
      } else {
        town.roof(roofTint, 0, roofTop, 0, entry.w + 1.1, entry.d + 1.1,
          steep ? Math.min(entry.w, entry.d) * .42 : Math.min(entry.w, entry.d) * .3, entry.w >= entry.d ? Math.PI / 2 : 0, M.dark);
      }
      // Shuttered windows, and a door on the named face.
      const face = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] }[entry.door] ?? [0, -1];
      town.block(WOOD_DARK, face[0] * (entry.w / 2 + .05), 1.1, face[1] * (entry.d / 2 + .05),
        face[0] ? .12 : entry.kind === 'warehouse' ? 3.4 : 1.6, entry.kind === 'warehouse' ? 3.6 : 2.4, face[0] ? (entry.kind === 'warehouse' ? 3.4 : 1.6) : .12);
      for (const [sx, sz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const count = Math.max(1, Math.floor((sz ? entry.w : entry.d) / 4.4));
        for (let k = 0; k < count; k++) {
          const u = (k + .5) / count - .5;
          const wx = sz ? u * entry.w : sx * (entry.w / 2 + .04), wz = sz ? sz * (entry.d / 2 + .04) : u * entry.d;
          if (Math.abs(wx - face[0] * entry.w / 2) < 1.6 && Math.abs(wz - face[1] * entry.d / 2) < 1.6) continue;
          // Two storeys of windows on anything tall enough for them.
          for (const level of entry.h > 7 ? [.3, .66] : [.48]) {
            town.block('#241f1b', wx, 1.1 + entry.h * level, wz, sz ? .9 : .06, 1.15, sz ? .06 : .9);
            town.block(['#5c6d6a', '#6a6350', '#57604f', '#7a5a44'][(entry.id.length + k + index) % 4], wx + (sz ? .62 : 0), 1.1 + entry.h * level - .02, wz + (sz ? 0 : .62),
              sz ? .42 : .1, 1.2, sz ? .1 : .42);
          }
        }
      }
      if (entry.kind === 'house' || entry.kind === 'row') town.block('#9c8574', entry.w * .28, roofTop, entry.d * .2, .8, 2.8, .8);
      if (entry.kind === 'row') for (let k = 1; k < 4; k++) town.block(M.dark, -entry.w / 2 + k * entry.w / 4, 1.1, 0, .25, entry.h + .1, entry.d + .1);
    });
    metrics.buildings++;
  }
  AMBRON_BUILDINGS.forEach(houseOf);

  // The Legate-General's Seat: a colonnade and a standard over the plaza.
  {
    const seat = AMBRON_BUILDINGS.find(entry => entry.id === 'legate-seat');
    const base = cityGround(seat.a) - .3, front = seat.a - seat.w / 2;
    for (let s = 0; s < 3; s++) {
      const spot = P(front - .7 - s * .8, seat.b);
      town.block(MASONRY.imperial.cap, spot.x, base + .1 - s * .1, spot.z, .8, .34, seat.d + 1.6);
    }
    for (let k = 0; k < 7; k++) {
      const spot = P(front - 1.6, seat.b - seat.d / 2 + 2.2 + k * (seat.d - 4.4) / 6);
      town.cylinder(MASONRY.imperial.cap, spot.x, base + .6, spot.z, .58, 7.6, 0, 7);
      push({ x: spot.x, z: spot.z, r: .6, kind: 'seat-column' });
    }
    const arch = P(front - 1.6, seat.b);
    town.block(MASONRY.imperial.cap, arch.x, base + 8.2, arch.z, 2.0, 1.1, seat.d + 1.2);
    town.roof(TILE, arch.x, base + 9.3, arch.z, 3.4, seat.d + 2.4, 1.5, Math.PI / 2, MASONRY.imperial.face);
    // The standard on the roof, and the empty bracket beside it where the last one was taken down.
    const pole = P(seat.a, seat.b - seat.d / 2 + 2);
    town.cylinder(WOOD, pole.x, base + seat.h + 1.6, pole.z, .12, 4.6, 0, 7);
    town.sheet(BANNER, [pole.x, base + seat.h + 5.2, pole.z], [pole.x + 2.4, base + seat.h + 5.0, pole.z], [pole.x + 2.4, base + seat.h + 3.4, pole.z], [pole.x, base + seat.h + 3.6, pole.z]);
    town.box(BANNER_GOLD, pole.x + 1.2, base + seat.h + 4.5, pole.z + .02, 1.1, .16, .04);
    const bracket = P(seat.a - 6, seat.b - seat.d / 2 + 2);
    town.beam(IRON, [bracket.x, base + seat.h + 1.2, bracket.z], [bracket.x, base + seat.h + 2.6, bracket.z], .1);
  }

  // The Toll House: steps to the street, a great board of the rates, and the ledger window.
  {
    const toll = AMBRON_BUILDINGS.find(entry => entry.id === 'toll-house');
    const base = cityGround(toll.a) - .3, front = toll.b - toll.d / 2;
    for (let s = 0; s < 3; s++) {
      const spot = P(toll.a, front - .6 - s * .7);
      town.block(MASONRY.lake.cap, spot.x, base + .2 - s * .12, spot.z, toll.w - 2, .3, .7);
    }
    for (const side of [-1, 1]) {
      const spot = P(toll.a + side * 4.4, front - .3);
      town.cylinder(MASONRY.lake.cap, spot.x, base + 1.1, spot.z, .52, 5.2, 0, 7);
      push({ x: spot.x, z: spot.z, r: .55, kind: 'toll-column' });
    }
    const board = P(toll.a, front - .1);
    town.block(WOOD_DARK, board.x, base + 3.1, board.z, toll.w - 3, 2.6, .2);
    for (let line = 0; line < 7; line++) town.block(PAPER, board.x, base + 3.4 + line * .32, board.z - .14, toll.w - 4.4, .16, .04);
    // The new proclamation, nailed over the old notices and not yet weathered.
    town.block(LIME, board.x + 2.2, base + 4.6, board.z - .2, 1.1, 1.5, .04);
  }

  // The capstan that winds the chain, and its tally board.
  {
    const spot = P(AMBRON_CHAIN.capstan.a, AMBRON_CHAIN.capstan.b), ground = y(spot.x, spot.z);
    town.cylinder(WOOD_DARK, spot.x, ground, spot.z, 1.35, 1.5, 0, 7);
    for (let k = 0; k < 6; k++) {
      const angle = k / 6 * Math.PI * 2;
      town.beam(WOOD, [spot.x, ground + 1.1, spot.z], [spot.x + Math.sin(angle) * 3.1, ground + 1.05, spot.z + Math.cos(angle) * 3.1], .16);
    }
    town.cylinder(IRON, spot.x, ground + 1.5, spot.z, .5, .4, 0, 7);
    const tally = P(AMBRON_CHAIN.tally.a, AMBRON_CHAIN.tally.b), ty = y(tally.x, tally.z);
    for (const side of [-1, 1]) town.cylinder(WOOD, tally.x, ty, tally.z + side * 1.2, .1, 2.3, 0, 4);
    town.block(WOOD_LIGHT, tally.x, ty + 1.3, tally.z, .14, 1.2, 2.6);
    for (let line = 0; line < 5; line++) town.block('#2c2721', tally.x - .1, ty + 1.5 + line * .2, tally.z, .03, .07, 2.0);
    push({ x: tally.x, z: tally.z, r: .5, kind: 'tally-board' });
  }


  // The queue above the chain: barges moored two abreast along the east quay and a
  // pair against the timber strand, laden and waiting their turn at the tally.
  // Nothing moves south until it has paid, and on any day there are more of these
  // than there are below the chain.
  {
    const loads = ['grain', 'fish', 'timber', 'grain', 'barrels', 'fish', 'grain'];
    const barge = (a, b, load, yaw = 0) => {
      const spot = P(a, b), water = CHANNEL.surface;
      town.frame(spot.x, water, spot.z, yaw, () => {
        town.block(WOOD_DARK, 0, -.5, 0, 3.4, 1.1, 13);
        town.block(WOOD, 0, .45, 0, 3.6, .22, 13.4);
        town.block(TAR, 0, -.2, -6.6, 2.6, .9, .6);
        town.cylinder(WOOD, 0, .6, -3.8, .12, 3.4, 0, 7);
        if (load === 'grain') for (let k = 0; k < 10; k++) town.rock(k % 2 ? '#c9b27a' : '#b99f67', (k % 2 - .5) * 1.4, 1.0, -4 + Math.floor(k / 2) * 1.9, .7, .45, .8, k);
        else if (load === 'fish') for (let k = 0; k < 8; k++) town.block(k % 3 ? '#8a7c5a' : '#6f644a', (k % 2 - .5) * 1.3, .56, -3.6 + Math.floor(k / 2) * 2.2, 1.1, .9, 1.4);
        else if (load === 'barrels') for (let k = 0; k < 8; k++) town.cylinder('#6a5438', (k % 2 - .5) * 1.3, .56, -3.4 + Math.floor(k / 2) * 2.1, .5, 1.1, 0, 7);
        else for (let k = 0; k < 4; k++) town.beam(k % 2 ? BARK : WOOD_LIGHT, [(k % 2 - .5) * 1.2, .9 + Math.floor(k / 2) * .6, -5.5], [(k % 2 - .5) * 1.2, .9 + Math.floor(k / 2) * .6, 5.5], .6);
      });
      metrics.props++;
    };
    [-46, -28, 20, 36, 52].forEach((b, index) => barge(CHANNEL.half - 2.3 - (index % 2) * 3.9, b, loads[index], (index % 2 - .5) * .04));
    [-34, 28].forEach((b, index) => barge(-CHANNEL.half + 2.4, b, loads[5 + index], .03));
    // Below the chain, the water is empty but for one that has paid, waiting for the Stair.
    barge(-6, 88, 'grain', .08);
  }

  // The market: stalls, the well, and a cart with the barley still on it.
  for (const [index, stall] of AMBRON_STALLS.entries()) {
    const spot = P(stall.a, stall.b), ground = y(spot.x, spot.z);
    for (const sa of [-1, 1]) for (const sb of [-1, 1]) town.cylinder(WOOD, spot.x + sa * 1.35, ground, spot.z + sb * .95, .07, 2.3, 0, 4);
    town.roof(['#8d5a44', '#b3a279', '#5d6f7a', '#9a7a48'][index % 4], spot.x, ground + 2.25, spot.z, 2.4, 3.3, .5, Math.PI / 2);
    town.block(WOOD_LIGHT, spot.x, ground + .82, spot.z + (stall.b < -8 ? .7 : -.7), 2.8, .14, .7);
    for (let k = 0; k < 4; k++)
      town.rock(['#c08a3c', '#8ba14e', '#a8523c', '#cbb976'][(k + index) % 4], spot.x - 1.0 + k * .68, ground + 1.05, spot.z + (stall.b < -8 ? .7 : -.7), .19, .14, .19, k);
    metrics.props++;
  }
  {
    const well = P(AMBRON_WELL.a, AMBRON_WELL.b), ground = y(well.x, well.z);
    for (let k = 0; k < 8; k++) {
      const angle = k / 8 * Math.PI * 2;
      town.block(MASONRY.lake.face, well.x + Math.sin(angle) * AMBRON_WELL.r, ground, well.z + Math.cos(angle) * AMBRON_WELL.r, 1.5, .85, .4, angle);
    }
    for (const side of [-1, 1]) town.cylinder(WOOD, well.x + side * 1.9, ground + .8, well.z, .1, 2.4, 0, 4);
    town.box(WOOD_LIGHT, well.x, ground + 3.1, well.z, 4.0, .16, .22);
    town.roof(SHINGLE, well.x, ground + 3.2, well.z, 4.4, 2.2, .8, 0);
  }
  // A lake gauge cut into the quay: the flood years, limewashed and read every spring.
  {
    const spot = P(AMBRON_GAUGE.a, AMBRON_GAUGE.b), ground = y(spot.x, spot.z);
    town.block(LIME, spot.x, ground, spot.z, .34, 3.4, .34);
    for (let k = 0; k < 9; k++) town.block('#33302a', spot.x, ground + .4 + k * .32, spot.z - .18, .36, .06, .04);
    push({ x: spot.x, z: spot.z, r: .35, kind: 'lake-gauge' });
  }
  // Sledge runners and ice-road stakes stacked against the granary all summer.
  {
    const spot = P(AMBRON_SLEDGES.a, AMBRON_SLEDGES.b), ground = y(spot.x, spot.z);
    for (let k = 0; k < 7; k++) {
      town.beam(WOOD_DARK, [spot.x - .8 + k * .26, ground + .1, spot.z - 1.6], [spot.x - .4 + k * .26, ground + 2.4, spot.z - .6], .12, .3);
      town.beam(WOOD_LIGHT, [spot.x + 1.4, ground + .1, spot.z - 1.4 + k * .22], [spot.x + 1.9, ground + 2.6, spot.z - .6 + k * .22], .07);
    }
    push({ x: spot.x, z: spot.z, r: 1.6, kind: 'sledge-stack' });
    metrics.props++;
  }


  // The Physic Garden of the Record House: the city's beds, its specimen wall of
  // every stone Ambron has built with, and the loft the tower birds use. Four of
  // Ambron's specialists work in these twenty paces.
  {
    const G = PHYSIC_GARDEN, M = masonryAt(G.minA, G.minB);
    pavedField(town, M.paving, G.minA, G.maxA, G.minB, G.maxB, .045);
    for (const [a0, a1, b0, b1] of [[G.minA, G.maxA, G.minB - .3, G.minB + .3], [G.minA, G.maxA, G.maxB - .3, G.maxB + .3], [G.maxA - .3, G.maxA + .3, G.minB, G.maxB]]) {
      const spot = P((a0 + a1) / 2, (b0 + b1) / 2);
      town.block(M.face, spot.x, cityGround((a0 + a1) / 2) - .1, spot.z, a1 - a0, 1.3, b1 - b0);
      town.box(M.cap, spot.x, cityGround((a0 + a1) / 2) + 1.26, spot.z, a1 - a0 + .2, .16, b1 - b0 + .2);
    }
    for (const [index, bed] of G.beds.entries()) {
      const spot = P(bed.a, bed.b), ground = cityGround(bed.a);
      town.block(MASONRY.lake.dark, spot.x, ground, spot.z, 4.4, .5, 3.0);
      town.block('#5f5138', spot.x, ground + .5, spot.z, 4.0, .18, 2.6);
      for (let k = 0; k < 9; k++) {
        const px = spot.x - 1.7 + (k % 3) * 1.7, pz = spot.z - .9 + Math.floor(k / 3) * .9;
        town.rock(['#5d7a45', '#6f8a4e', '#4f6b46', '#7d8f56'][(k + index) % 4], px, ground + .78, pz, .42, .38, .42, k);
      }
      // A written label at the head of every bed: the argument this garden settles.
      town.block(WOOD_DARK, spot.x - 2.0, ground + .68, spot.z - 1.3, .1, .5, .1);
      town.block(PAPER, spot.x - 2.0, ground + 1.1, spot.z - 1.3, .42, .3, .03);
    }
    for (const tree of G.trees) {
      const spot = P(tree.a, tree.b), ground = cityGround(tree.a);
      town.cylinder(BARK, spot.x, ground, spot.z, .26, 3.0, 0, 7);
      town.rock(LEAF_DARK, spot.x, ground + 4.0, spot.z, 2.0, 1.5, 2.0, 1);
      town.rock(LEAF, spot.x + .6, ground + 3.4, spot.z - .5, 1.4, 1.0, 1.4, 2);
    }
    // The specimen wall: every stone the city has built with, squared and in order.
    {
      const w = G.specimenWall, spot = P(w.a, w.b), ground = cityGround(w.a);
      const courses = [MASONRY.lake, MASONRY.imperial, MASONRY.patched, MASONRY.new];
      for (let k = 0; k < 16; k++) {
        const course = courses[Math.floor(k / 4)];
        town.block(k % 2 ? course.face : course.dark, spot.x - 3.4 + (k % 4) * 1.9, ground + 1.35 + Math.floor(k / 4) * .62, spot.z, 1.7, .58, .9);
      }
      town.box(MASONRY.new.cap, spot.x, ground + 3.9, spot.z, 8.0, .16, 1.1);
    }
    // The loft the tower birds use, over the garden's east wall.
    {
      const d = G.dovecote, spot = P(d.a, d.b), ground = cityGround(d.a);
      town.block(M.face, spot.x, ground, spot.z, 2.6, 5.6, 2.6);
      for (let k = 0; k < 9; k++) town.block('#241f1b', spot.x - .9 + (k % 3) * .9, ground + 3.6 + Math.floor(k / 3) * .6, spot.z - 1.32, .38, .34, .1);
      town.cone(SHINGLE, spot.x, ground + 5.6, spot.z, 2.1, 1.9, Math.PI / 4, 4);
      push({ x: spot.x, z: spot.z, r: 1.5, kind: 'dovecote' });
    }
  }

  // The timber strand on the west bank: stacked lake-timber, rafts drawn up, sawpits, a slip.
  {
    for (const [ai, bi, count] of [[-40, -38, 6], [-40, -8, 5], [-40, 30, 6], [-56, 56, 4]]) {
      for (let k = 0; k < count; k++) {
        const spot = P(ai + (k % 2) * 2.4, bi + Math.floor(k / 2) * 2.6), ground = y(spot.x, spot.z);
        // Cut lake timber lies along the strand, two courses of it on skids.
        for (let log = 0; log < 4; log++) {
          const level = ground + .35 + Math.floor(log / 2) * .62, shift = (log % 2) * .66 - .33;
          town.beam(log % 2 ? BARK : WOOD_LIGHT, [spot.x + shift, level, spot.z - 3.2], [spot.x + shift, level, spot.z + 3.2], .6);
        }
        push({ x: spot.x, z: spot.z, hx: .8, hz: 3.4, kind: 'timber-stack' });
      }
      metrics.props++;
    }
    // Two rafts drawn half out of the water on the strand, and the sawpits behind them.
    for (const b of [-16, 24]) {
      const spot = P(-27.5, b), ground = CHANNEL.surface;
      // A raft drawn half out of the water: nine logs lashed across two binders.
      for (let k = 0; k < 9; k++)
        town.beam(k % 2 ? BARK : WOOD_LIGHT, [spot.x - 4.6, ground + .2, spot.z - 5.6 + k * 1.4], [spot.x + 4.6, ground + .2, spot.z - 5.6 + k * 1.4], .66);
      for (const across of [-3.4, 3.4]) town.beam(WOOD_DARK, [spot.x + across, ground + .55, spot.z - 6], [spot.x + across, ground + .55, spot.z + 6], .2);
      metrics.props++;
    }
    for (const b of [-34, -20]) {
      const spot = P(-36, b), ground = y(spot.x, spot.z);
      town.patch(EARTH_DARK, heightAt, spot.x, spot.z, 3.4, 8.0, 0, .04, 3);
      for (const side of [-1, 1]) town.beam(WOOD, [spot.x + side * 1.6, ground + .4, spot.z - 4], [spot.x + side * 1.6, ground + .4, spot.z + 4], .22);
      town.beam(WOOD_LIGHT, [spot.x - 2.4, ground + .5, spot.z + 1.2], [spot.x + 2.4, ground + .5, spot.z + 1.2], .26, .18);
      push({ x: spot.x, z: spot.z, hx: 1.9, hz: 4.2, kind: 'sawpit' });
    }
  }
  metrics.vertices += town.vertexCount;
  town.finish(district);

  // =========================================================================
  // The causeway
  // =========================================================================
  {
    const cause = createSceneryBuilder('The Ambron causeway');
    const deck = CAUSEWAY.deckY;
    for (const pier of CAUSEWAY.piers) {
      const spot = P(pier, CAUSEWAY.b);
      cause.block(MASONRY.lake.dark, spot.x, CHANNEL.surface - 3.2, spot.z, 3.6, deck - CHANNEL.surface + 2.4, 7.2);
      // A cutwater on the upstream face: the old piers nobody alive knows how to make.
      cause.block(MASONRY.lake.dark, spot.x, CHANNEL.surface - 1.2, spot.z - 4.4, 2.4, 3.6, 2.6, Math.PI / 4);
    }
    for (let a = -CAUSEWAY.foot; a < CAUSEWAY.foot; a += 3) {
      const a0 = a, a1 = Math.min(CAUSEWAY.foot, a + 3);
      const mid = (a0 + a1) / 2, spot = P(mid, CAUSEWAY.b);
      const level = Math.abs(mid) <= CAUSEWAY.level ? deck
        : deck + (cityGround(mid) - deck) * (Math.abs(mid) - CAUSEWAY.level) / (CAUSEWAY.foot - CAUSEWAY.level);
      cause.block(MASONRY.imperial.paving, spot.x, level - .35, spot.z, a1 - a0 + .05, .35, CAUSEWAY.halfWidth * 2);
      cause.block(MASONRY.lake.face, spot.x, level - 1.15, spot.z, a1 - a0 + .05, .8, CAUSEWAY.halfWidth * 2 + .5);
      // Seven arches: the spandrel falls away between the piers, so the causeway reads
      // as arches from the water and as a street from the deck.
      const pier = CAUSEWAY.piers.reduce((best, p) => Math.abs(p - mid) < Math.abs(best - mid) ? p : best, CAUSEWAY.piers[0]);
      const halfSpan = (CAUSEWAY.piers[1] - CAUSEWAY.piers[0]) / 2, gap = Math.min(halfSpan, Math.abs(mid - pier));
      if (gap > .6 && Math.abs(mid) < CHANNEL.half) {
        // The intrados: highest at mid-span, springing from near the water at each pier.
        const drop = (1 - Math.sqrt(Math.max(0, 1 - ((gap - halfSpan) / halfSpan) ** 2))) * 1.6;
        for (const side of [-1, 1])
          cause.block(MASONRY.lake.dark, spot.x, level - 1.35 - drop, spot.z + side * (CAUSEWAY.halfWidth - .1), a1 - a0 + .05, .3 + drop, .7);
      }
      for (const side of [-1, 1]) {
        cause.block(MASONRY.imperial.face, spot.x, level, spot.z + side * (CAUSEWAY.halfWidth + .05), a1 - a0 + .05, .95, .5);
        cause.box(MASONRY.imperial.cap, spot.x, level + 1.0, spot.z + side * (CAUSEWAY.halfWidth + .05), a1 - a0 + .05, .14, .62);
      }
    }
    // Lamp irons on the parapet, and the middle arch's keystone bosses.
    for (const a of [-24, -12, 0, 12, 24]) for (const side of [-1, 1]) {
      const spot = P(a, CAUSEWAY.b + side * (CAUSEWAY.halfWidth + .1));
      cause.cylinder(IRON, spot.x, deck + 1.05, spot.z, .06, 1.5, 0, 4);
      cause.block(BRONZE, spot.x, deck + 2.4, spot.z, .34, .42, .34);
    }
    metrics.vertices += cause.vertexCount;
    cause.finish(district);
  }

  // =========================================================================
  // The lake country
  // =========================================================================
  const country = createSceneryBuilder('The Lake Lands');

  /** A lake-country house: low stone walls and a very steep roof, because of the snow. */
  function lakeHouse(x, z, width, depth, height, yaw, { roof = SHINGLE, wall = '#9a9686', roofless = false } = {}) {
    const ground = Math.min(y(x, z), y(x + width / 2, z), y(x - width / 2, z));
    country.frame(x, ground, z, yaw, () => {
      country.block(MASONRY.lake.dark, 0, -.35, 0, width + .4, .8, depth + .4);
      country.block(roofless ? MASONRY.lake.dark : wall, 0, .2, 0, width, roofless ? height * .62 : height, depth);
      if (!roofless) country.roof(roof, 0, height + .2, 0, width + .9, depth + .9, Math.min(width, depth) * .52, Math.PI / 2, wall);
      else for (const sx of [-1, 1]) country.block(MASONRY.lake.dark, sx * width * .3, height * .62 + .2, 0, width * .3, .5, depth + .1);
      country.block(WOOD_DARK, 0, .2, -depth / 2 - .04, 1.1, 2.1, .1);
    });
    push({ x, z, hx: (Math.abs(Math.cos(yaw)) > .5 ? width : depth) / 2 + .2, hz: (Math.abs(Math.cos(yaw)) > .5 ? depth : width) / 2 + .2, kind: 'lake-house' });
    metrics.buildings++;
  }

  // Nemmel: six roofs on the shore, drying frames, boats hauled up, and the smoke shed.
  {
    const n = NEMMEL;
    for (const [dx, dz, w, d, h, yaw] of [
      [10, -12, 8, 6.5, 3.2, 0], [14, 2, 7.5, 6, 3.0, 0], [17, 16, 8.5, 6.5, 3.2, 0],
      [-2, -18, 7, 6, 3.0, Math.PI / 2], [-4, 20, 7.5, 6, 3.1, Math.PI / 2], [22, -4, 6.5, 5.5, 2.9, 0],
    ]) lakeHouse(n.x + dx, n.z + dz, w, d, h, yaw);
    // The smoke shed works all year: dark timber, a low door and a lid of turf.
    lakeHouse(n.x + 11, n.z - 4, 6, 5, 2.6, 0, { roof: '#5a5346', wall: '#6d6152' });
    // Drying frames stand on the beach between the road and the water, wherever
    // there is room for one: the shore is not straight and the road is not either.
    for (let k = 0; k < 7; k++) {
      const z = n.z - 13 + k * 5;
      let x = n.x + 2;
      while (x > n.x - 34 && elagosWaterDistance(x, z) > 6) x -= 1;
      x += 2;
      if (elagosWaterDistance(x, z) < 2 || roadDistance(x, z) < 4) continue;
      const ground = y(x, z);
      for (const side of [-1, 1]) country.cylinder(WOOD, x, ground, z + side * 1.9, .09, 2.1, 0, 4);
      country.box(WOOD_LIGHT, x, ground + 2.0, z, .1, .1, 4.0);
      for (let f = 0; f < 6; f++) country.block('#a9a189', x, ground + 1.45, z - 1.6 + f * .64, .2, .5, .1);
      push({ x, z, r: .4, kind: 'drying-frame' });
    }
    // Boats on the shingle, and the nets over them.
    for (let k = 0; k < 4; k++) {
      let x = n.x - 4, z = n.z - 10 + k * 7;
      while (elagosWaterDistance(x, z) > 1.5 && x > n.x - 34) x -= 1;
      const ground = y(x + 4, z), yaw = Math.PI / 2 + range(-.3, .3);
      country.frame(x + 3, ground + .3, z, yaw, () => {
        country.block(WOOD_LIGHT, 0, 0, 0, 1.5, .6, 5.2);
        country.block(WOOD_DARK, 0, .55, 0, 1.7, .16, 5.4);
        country.beam(WOOD, [0, .5, -2.4], [.15, 2.1, 1.4], .09);
      });
      push({ x: x + 3, z, hx: 2.7, hz: .9, kind: 'lake-boat' });
      metrics.props++;
    }
    country.patch('#a09a7e', heightAt, n.x + 4, n.z, 30, 44, 0, .04, 6);
  }

  // The ice-road stone, the warden's hut, and the stakes cut and waiting for autumn.
  {
    const s = ICE_ROAD_STONE, ground = y(s.x, s.z);
    country.block(LIME, s.x, ground, s.z, .8, 2.6, .5);
    for (let k = 0; k < 7; k++) country.block('#2f2c27', s.x, ground + .45 + k * .28, s.z - .27, .84, .07, .03);
    country.block(MASONRY.lake.dark, s.x, ground - .2, s.z, 1.4, .45, 1.1);
    push({ x: s.x, z: s.z, r: .6, kind: 'ice-road-stone' });
    lakeHouse(s.x + 13, s.z + 5, 6, 5, 2.6, Math.PI / 2, { roof: THATCH, wall: '#8e8878' });
    // The stakes are cut in the autumn and stacked behind the hut, off the road.
    for (let k = 0; k < 22; k++) {
      const x = s.x + 15 + (k % 11) * .35, z = s.z - 3 + Math.floor(k / 11) * 1.2, ground2 = y(x, z);
      country.beam(WOOD_LIGHT, [x, ground2, z], [x + .5, ground2 + 2.5, z + range(-.2, .2)], .07);
    }
    push({ x: s.x + 16, z: s.z - 2.4, r: 1.3, kind: 'ice-stakes' });
  }

  // The lake shrine: a niche of lake-stone at the waterline, a bowl, and what is in it.
  {
    const s = LAKE_SHRINE, ground = y(s.x, s.z);
    country.block(MASONRY.lake.dark, s.x, ground - .2, s.z, 3.2, .5, 2.6);
    country.block(MASONRY.lake.face, s.x, ground + .3, s.z, 2.2, 2.2, 1.0);
    country.block('#1f2420', s.x, ground + .8, s.z - .5, 1.0, 1.2, .2);
    country.cone(MASONRY.lake.cap, s.x, ground + 2.5, s.z, 1.5, 1.1, Math.PI / 4, 4);
    country.cylinder(MASONRY.lake.cap, s.x, ground + .3, s.z - 1.7, .6, .5, 0, 7);
    for (let k = 0; k < 5; k++) country.rock([BRONZE, IRON, '#b7ad8c'][k % 3], s.x + range(-.4, .4), ground + .85, s.z - 1.7 + range(-.3, .3), .09, .05, .09, k);
    push({ x: s.x, z: s.z, r: 1.5, kind: 'lake-shrine' });
    for (let k = 0; k < 9; k++) {
      const x = s.x + range(-9, 9), z = s.z + range(-7, 7);
      if (elagosWaterDistance(x, z) < .5) continue;
      country.rock(SHINGLE_ROCK, x, y(x, z) + .1, z, range(.3, .8), range(.2, .45), range(.3, .8), k);
    }
  }

  // The drowned causeway: eleven stumps of an older Ambron, in a line for the far bank.
  {
    const piers = DROWNED_CAUSEWAY.piers;
    for (let k = 0; k < 11; k++) {
      const a = -21 + k * 4.2, x = piers.x + a, z = piers.z + Math.sin(k * .7) * .6;
      const surface = elagosWaterSurface(x, z) ?? CHANNEL.surface;
      // Stumps of lake-stone standing out of the water, each worn to its own height.
      const stands = .55 + (k % 4) * .42;
      country.block(MASONRY.lake.dark, x, surface - 2.6, z, 2.6, 2.6 + stands, 2.2, k * .12);
      country.rock(MASONRY.lake.face, x, surface + stands - .12, z, 1.35, .32, 1.15, k);
    }
    const marker = DROWNED_CAUSEWAY, ground = y(marker.x, marker.z);
    country.block(MASONRY.lake.dark, marker.x, ground - .1, marker.z, 3.4, .4, 2.4);
    for (let k = 0; k < 4; k++) country.rock(MASONRY.lake.face, marker.x + range(-1.6, 1.6), ground + .3, marker.z + range(-1.2, 1.2), range(.5, .9), range(.3, .6), range(.5, .9), k);
    push({ x: marker.x, z: marker.z, r: 1.8, kind: 'drowned-causeway' });
  }

  // The Stair: four steps of shelved rock, white water, and the ox capstan that brings a barge up.
  {
    const head = THE_STAIR.head;
    for (let k = 0; k < 4; k++) {
      const z = head.z + 4 + k * 6, x = head.x - k * 2.4;
      const surface = elagosWaterSurface(x, z) ?? 12;
      for (let s = -1; s <= 1; s++) {
        country.block(SHINGLE_ROCK, x + s * 10, surface - 1.4, z, 11, 1.5, 3.4, .05 * s);
        country.rock(FOAM, x + s * 10 + range(-2, 2), surface + .08, z + 2.2, range(2.4, 4.0), .12, range(1.2, 2.2), k + s);
      }
    }
    const capstan = THE_STAIR.capstan, ground = y(capstan.x, capstan.z);
    country.block(MASONRY.lake.dark, capstan.x, ground - .15, capstan.z, 5.2, .4, 5.2);
    country.cylinder(WOOD_DARK, capstan.x, ground + .25, capstan.z, 1.2, 1.4, 0, 7);
    for (let k = 0; k < 6; k++) {
      const angle = k / 6 * Math.PI * 2;
      country.beam(WOOD, [capstan.x, ground + 1.2, capstan.z], [capstan.x + Math.sin(angle) * 2.9, ground + 1.15, capstan.z + Math.cos(angle) * 2.9], .15);
    }
    push({ x: capstan.x, z: capstan.z, r: 3.1, kind: 'stair-capstan' });
    // The haul path down beside the water, worn to the rock.
    country.patch('#8e8367', heightAt, capstan.x - 4, capstan.z + 16, 7, 40, .2, .04, 6);
    for (let k = 0; k < 6; k++) {
      const x = capstan.x - 2 - k, z = capstan.z + 6 + k * 7, g = y(x, z);
      country.cylinder(WOOD_DARK, x, g, z, .26, 1.1, 0, 7);
      push({ x, z, r: .35, kind: 'haul-bollard' });
    }
    metrics.props++;
  }

  // The Link crossing: three slabs of lake-stone on two piers.
  {
    const b = LINK_BRIDGE, along = Math.atan2(b.axis.x, b.axis.z);
    for (const t of [-6, 6]) {
      const x = b.crossing.x + b.axis.x * t, z = b.crossing.z + b.axis.z * t;
      const surface = elagosWaterSurface(x, z) ?? 15.6;
      country.block(MASONRY.lake.dark, x, surface - 2.2, z, 2.2, b.deckY - surface + 2.0, 3.0, along);
    }
    for (let t = -b.halfSpan; t < b.halfSpan; t += 4) {
      const t1 = Math.min(b.halfSpan, t + 4), mid = (t + t1) / 2;
      const x = b.crossing.x + b.axis.x * mid, z = b.crossing.z + b.axis.z * mid;
      country.block(MASONRY.lake.cap, x, b.deckY - .3, z, b.laneHalf * 2 + .6, .32, t1 - t + .05, along);
    }
    for (const side of [-1, 1]) for (let t = -b.halfSpan; t <= b.halfSpan; t += 1.6) {
      const x = b.crossing.x + b.axis.x * t + b.side.x * side * (b.laneHalf + .35);
      const z = b.crossing.z + b.axis.z * t + b.side.z * side * (b.laneHalf + .35);
      if (Math.abs(t) < b.halfSpan - .1) country.cylinder(MASONRY.lake.face, x, b.deckY, z, .17, .8, 0, 4);
      push({ x, z, r: .55, kind: 'link-parapet' });
    }
  }

  // The Outside: the city's overflow along the haul road, kept, roofless and re-roofed.
  for (const entry of AMBRON_OUTSIDE) {
    const spot = P(entry.a, entry.b);
    lakeHouse(spot.x, spot.z, entry.w, entry.d, entry.h, entry.a > 50 ? 0 : Math.PI,
      { roofless: entry.state === 'roofless', roof: entry.state === 'reroofed' ? THATCH : SHINGLE,
        wall: entry.state === 'reroofed' ? '#8e8878' : '#9a9686' });
    if (entry.state === 'roofless') for (let k = 0; k < 5; k++) {
      const x = spot.x + range(-entry.w, entry.w), z = spot.z + range(-entry.d, entry.d);
      country.rock(MASONRY.lake.dark, x, y(x, z) + .18, z, range(.4, .8), range(.25, .5), range(.4, .8), k);
    }
    if (entry.state !== 'roofless') {
      const stack = { x: spot.x + (entry.a > 50 ? 6.5 : -6.5), z: spot.z + 2 }, ground = y(stack.x, stack.z);
      for (let k = 0; k < 5; k++)
        country.beam(k % 2 ? BARK : WOOD_LIGHT, [stack.x - 1.1, ground + .25 + k * .38, stack.z], [stack.x + 1.1, ground + .25 + k * .38, stack.z], .38);
    }
  }

  // Reeds, boulders and lake-edge willows: the shore, wherever the scatter does not reach.
  for (let k = 0; k < 520; k++) {
    const water = ELAGOS_BASINS[k % ELAGOS_BASINS.length];
    const shore = water.shore[Math.floor(random() * water.shore.length)];
    const dx = shore.x - water.centre.x, dz = shore.z - water.centre.z, l = Math.hypot(dx, dz) || 1;
    const out = range(-2.5, 7), x = shore.x + dx / l * out, z = shore.z + dz / l * out;
    if (Math.abs(x - AMBRON.centre.x) < 130 && Math.abs(z - AMBRON.centre.z) < 110) continue;
    if (roadDistance(x, z) < 4) continue;
    const ground = y(x, z);
    if (ground < 1) continue;
    if (k % 7 === 0) {
      country.rock(SHINGLE_ROCK, x, ground + .16, z, range(.4, 1.1), range(.25, .6), range(.4, 1.1), k);
    } else if (k % 7 === 1) {
      country.cylinder(BARK, x, ground, z, .22, range(2.6, 4.2), 0, 4);
      country.rock(k % 3 ? LEAF : LEAF_DARK, x, ground + range(3.4, 4.6), z, range(1.6, 2.6), range(1.2, 1.8), range(1.6, 2.6), k);
      push({ x, z, r: .3, kind: 'shore-willow' });
    } else {
      for (let r2 = 0; r2 < 4; r2++)
        country.beam(REED, [x + range(-.5, .5), ground, z + range(-.5, .5)], [x + range(-.7, .7), ground + range(.9, 1.7), z + range(-.7, .7)], .04);
    }
    metrics.props++;
  }
  metrics.vertices += country.vertexCount;
  country.finish(district);

  // Signposts in the road's own language.
  for (const sign of ELAGOS_SIGNS) {
    const target = { x: sign.x - Math.sin(sign.yaw) * 22, z: sign.z - Math.cos(sign.yaw) * 22 };
    const back = { x: sign.x + Math.sin(sign.yaw) * 22, z: sign.z + Math.cos(sign.yaw) * 22 };
    signs.direction({ x: sign.x, z: sign.z, label: sign.label, toward: target, back, backLabel: sign.returnLabel, parent });
  }
  signs.place({ ...P(66, 78), label: 'Ambron', facing: 0, parent });
  signs.notice({ ...P(50, 46), label: 'Notices', facing: Math.PI, parent });

  return {
    metrics, district, waterMaterial,
    /** The Link crossing, for `world.js`'s bridge-deck list. */
    bridge: { crossing: LINK_BRIDGE.crossing, axis: LINK_BRIDGE.axis, side: LINK_BRIDGE.side, halfSpan: LINK_BRIDGE.halfSpan, deckY: LINK_BRIDGE.deckY },
    reachSamples,
    places: ELAGOS_PLACES,
  };
}
