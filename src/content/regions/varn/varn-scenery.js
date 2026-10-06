import { finishBuild } from '../../../world/loading/build-steps.js';
import * as THREE from 'three';
import { groundTint } from '../../../world/terrain/world-terrain.js';
import { createSceneryBuilder } from '../../../world/scenery/scenery-builder.js';
import { clearScatter } from '../../../world/scenery/scenery-clearing.js';
import { peakLiftAt } from '../east-lotharn/east-lotharn-world.js';
import { imperialMasonry, IMPERIAL_STONE as STONE, IMPERIAL } from '../../../world/scenery/imperial-masonry.js';
import {
  VARN, VARN_STANDARD, VARN_CIRCUIT, VARN_PASS_GATE, VARN_WARD_STANDARD, VARN_WARD_WALL, VARN_JAMBS, JAMB, VARN_PARAPETS, PARAPET, VARN_WATCHES,
  VARN_KEEP, VARN_BUILDINGS, VARN_SQUARE, VARN_WELL, VARN_COURTS, VARN_CROSS_STREET, VARN_STREET, VARN_ROAD_HALF, VARN_PATCH, VARN_WICKET, VARN_SLABS,
  varnGateShut, varnSurface, varnKeepsClear, onSlab,
} from './varn-world.js';

/**
 * What Varn looks like (its numbers are src/content/regions/varn/varn-world.js): the city's own finer ground - the made
 * floor, the ditch, the two jambs of rock - and on it the curtain with its fourteen towers, the two
 * gatehouses, the citadel's keep and ward, the barracks, the town, and the Empire's red and gold over
 * all of it.
 *
 * **Medieval, never Roman.** The walls, towers, gates and keep are the Empire's fortress masonry
 * (src/world/scenery/imperial-masonry.js), the same hand that builds the forts on the other passes. The houses are
 * Amod's, because Amodian masons built them: an undercroft, the household over it and a drying loft
 * under a steep roof (src/content/regions/amod/amod-scenery.js).
 *
 * Everything is gathered into a handful of merged meshes (src/world/scenery/scenery-builder.js), so the whole city is
 * a few draw calls that the renderer culls whole. The garrison on the walls is the host's (src/world/life/town-life.js,
 * from src/content/regions/varn/varn-garrison.js), like every other wall figure in the game.
 */
const { slate: SLATE, wood: WOOD, woodDark: WOOD_DARK, iron: IRON, slit: SLIT, red: RED, gold: GOLD } = IMPERIAL;
const HOUSE_WALLS = ['#b9ae92', '#c0b598', '#b1a68a', '#ada285'], HOUSE_ROOFS = ['#7d5a43', '#6f5744', '#745841'];
const SHUTTER = '#6a6b52', DRY_STONE = '#a9a289';

export function createVarnScenery(...args) { return finishBuild(createVarnScenerySteps(...args)); }

export function* createVarnScenerySteps(kit) {
  let work = 0;
  const { root, material, groundHeight, colliders, scene = root, treeRegistry = null } = kit;
  const group = new THREE.Group(); group.name = 'Varn'; root.add(group);
  const gy = (x, z) => groundHeight(x, z);
  const push = collider => { colliders.push(collider); return collider; };
  const metrics = { batches: 0, towers: 0, gates: 0, buildings: 0, colliders: 0, vertices: 0, lifted: null, shut: [], wicket: null, slabs: VARN_SLABS.length };

  // -------------------------------------------------------------------------
  // The neighbours' scatter, lifted off the ground the city is built on
  // -------------------------------------------------------------------------
  metrics.lifted = clearScatter({ scene, colliders, treeRegistry, inside: (x, z) => varnKeepsClear(x, z),
    kinds: ['ridge-rock', 'lotharn-outcrop'], groups: ['Amod scenery', 'East Lotharn scenery'] });
  // What Varn itself adds is counted from here, after the clearing has taken its own away.
  const before = colliders.length;
  yield;

  // -------------------------------------------------------------------------
  // The ground
  // -------------------------------------------------------------------------
  /**
   * The city's floor, its ditch and the jambs, drawn a metre and a half apart (the world's own grid is
   * seven out here, and is sunk beneath this one: `varnTerrainSink`). Coloured by what it is: paving on
   * the street, the square and the courts, trodden earth between the houses, dark earth in the ditch,
   * rock in courses on the jambs' faces and the hill's own grass on their tops. Where the East Lotharn's
   * peaks already draw their own ground (their lift is more than a metre) this one leaves it to them.
   */
  {
    const { step, minX, minZ, maxX, maxZ } = VARN_PATCH, TILE = 48;
    const cols = Math.floor((maxX - minX) / step) + 1, rows = Math.floor((maxZ - minZ) / step) + 1;
    const heights = new Float32Array(cols * rows), theirs = new Uint8Array(cols * rows);
    for (let j = 0; j < rows; j++) { for (let i = 0; i < cols; i++) {
      if (((j * cols + i) & 127) === 0) yield;
      const x = minX + i * step, z = minZ + j * step;
      heights[j * cols + i] = gy(x, z);
      // The slabs and their aprons are Varn's, wherever they stand, and are drawn here at this grid's pitch.
      theirs[j * cols + i] = peakLiftAt(x, z) > 1 && !onSlab(x, z, 2) ? 1 : 0;
    } }
    const rock = ['#8d8374', '#7c7a72', '#948878', '#827d74'].map(c => new THREE.Color(c));
    const tones = { street: new THREE.Color(STONE.paving), paved: new THREE.Color(STONE.court), ward: new THREE.Color('#a19c86'), yard: new THREE.Color('#8c8163'),
      ditch: new THREE.Color('#5f5644'), berm: new THREE.Color('#857b5e'), top: new THREE.Color('#5d7843'), scree: new THREE.Color('#8f8a6c'),
      slab: new THREE.Color('#9a9484'), apron: new THREE.Color('#7f7a6a') };
    const shade = new THREE.Color();
    let jitter = 60217;
    const wobble = () => { jitter = (Math.imul(jitter, 1664525) + 1013904223) >>> 0; return .95 + jitter / 4294967296 * .1; };
    const paint = (x, z, y, grade) => {
      const kind = varnSurface(x, z);
      if (kind === 'outside') groundTint(shade, x, z, THREE);
      else if (kind === 'jamb-top') shade.copy(tones.top).lerp(tones.scree, Math.min(1, Math.max(0, (grade - .5) / .5)));
      else if (kind === 'jamb-face') shade.copy(rock[((Math.floor(y / 2.6) % 4) + 4) % 4]);
      // The slabs are one clean plane of paler stone, so the way reads as a way from the ground.
      else if (kind === 'slab') shade.copy(tones.slab).lerp(rock[2], ((Math.floor(y / 4) % 2) + 2) % 2 * .25);
      else shade.copy(tones[kind] ?? tones.yard);
      // Anything steep is stone, whatever it was called: the ditch's sides, the ward's ramp.
      if (kind !== 'jamb-face' && kind !== 'slab' && grade > 1.1) shade.lerp(rock[1], .7);
      shade.multiplyScalar(wobble());
    };
    const groundMaterial = material('#ffffff', { vertexColors: true, flatShading: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    for (let tj = 0; tj < rows - 1; tj += TILE) for (let ti = 0; ti < cols - 1; ti += TILE) {
      yield;
      const ci = Math.min(TILE, cols - 1 - ti), cj = Math.min(TILE, rows - 1 - tj), indices = [];
      for (let j = 0; j < cj; j++) for (let i = 0; i < ci; i++) {
        if (((j * ci + i) & 255) === 0) yield;
        const k = (tj + j) * cols + ti + i;
        // A cell is the peaks' own when every corner of it is theirs.
        if (theirs[k] && theirs[k + 1] && theirs[k + cols] && theirs[k + cols + 1]) continue;
        const a = j * (ci + 1) + i;
        indices.push(a, a + ci + 1, a + 1, a + 1, a + ci + 1, a + ci + 2);
      }
      if (!indices.length) continue;
      const positions = new Float32Array((ci + 1) * (cj + 1) * 3), colours = new Float32Array((ci + 1) * (cj + 1) * 3);
      for (let j = 0; j <= cj; j++) for (let i = 0; i <= ci; i++) {
        if (((j * (ci + 1) + i) & 63) === 0) yield;
        const gi = ti + i, gj = tj + j, x = minX + gi * step, z = minZ + gj * step, k = j * (ci + 1) + i, y = heights[gj * cols + gi];
        positions.set([x, y, z], k * 3);
        const east = heights[gj * cols + Math.min(cols - 1, gi + 1)], west = heights[gj * cols + Math.max(0, gi - 1)];
        const north = heights[Math.max(0, gj - 1) * cols + gi], south = heights[Math.min(rows - 1, gj + 1) * cols + gi];
        paint(x, z, y, Math.hypot(east - west, south - north) / (2 * step));
        colours.set([shade.r, shade.g, shade.b], k * 3);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
      const ground = new THREE.Mesh(geometry, groundMaterial);
      ground.name = 'Varn ground'; ground.receiveShadow = true; group.add(ground);
      metrics.batches++;
    }
  }

  // -------------------------------------------------------------------------
  // The curtain
  // -------------------------------------------------------------------------
  const walls = createSceneryBuilder('Varn walls'), M = imperialMasonry(walls, gy), S = VARN_STANDARD;
  yield* M.curtain(VARN_CIRCUIT, S);
  yield;
  // The Pass Gate's two towers stand a storey over the Amod Gate's, and both pairs over the rest.
  M.circuitTowers(VARN_CIRCUIT, S, { gateRise: 2.2, rise: t => (t.id.startsWith(VARN_PASS_GATE) ? 1.2 : 0) });
  colliders.push(...VARN_CIRCUIT.colliders.map(c => ({ ...c })));

  // -------------------------------------------------------------------------
  // The gatehouses
  // -------------------------------------------------------------------------
  /**
   * Each gate between its two towers (src/world/scenery/imperial-masonry.js, `gatehouse`), with a stone causeway over
   * the ditch before it. Both are shut while the one flag says so (src/content/regions/varn/varn-world.js,
   * `LOTHARN_PASSES_SHUT`): leaves barred, and a row of colliders across the passage. The Pass Gate's grate
   * is down. The Amod Gate keeps its grate up and has the wicket (`VARN_WICKET`) in its right-hand leaf: the
   * row of colliders stops short of it, so a body passes there, and the rule that the city is a closed place
   * (src/world/travel/closed-border.js) lets it pass one way only - out.
   */
  for (const gate of VARN_CIRCUIT.gates) {
    yield;
    const shut = varnGateShut(gate.id), w = gate.halfWidth, wicket = shut && gate.id === VARN_WICKET.gate ? VARN_WICKET : null;
    M.gatehouse(VARN_CIRCUIT, gate, S, { shut, wicket, rise: gate.id === VARN_PASS_GATE ? 2.2 : 1.2, kerbs: S.berm + S.ditchWidth + .6 });
    if (shut) {
      // Circles of .75 every .7 m: the last one's edge stops where the wicket begins, and the tower's own collider is its other jamb.
      const lo = wicket && wicket.side < 0 ? -w + wicket.width + .75 : -w, hi = wicket && wicket.side > 0 ? w - wicket.width - .75 : w;
      for (let s = lo; s <= hi + 1e-6; s += .7) push({ x: gate.centre.x + gate.along.x * s, z: gate.centre.z + gate.along.z * s, r: .75, kind: 'varn-gate-shut', gate: gate.id });
      metrics.shut.push(gate.id);
      if (wicket) metrics.wicket = gate.id;
    }
    metrics.gates++;
  }

  // -------------------------------------------------------------------------
  // The rock: battlements on the jambs' lips, and a watch on each
  // -------------------------------------------------------------------------
  /**
   * "Walls built into the mountains": the top of each jamb carries a battlemented breastwork along the
   * edges a walker could step off where he should not (`VARN_PARAPETS`), and a watch turret with a beacon
   * (`VARN_WATCHES`) - the city's wall goes on up the rock. The breastworks are solid. A rail's collider runs
   * its whole length; its stone is drawn only where the top is under it, so the east jamb's city rail,
   * which reaches the jamb's very edges, is not drawn down the faces.
   */
  for (const run of VARN_PARAPETS) {
    yield;
    const length = Math.hypot(run.to.x - run.from.x, run.to.z - run.from.z), pieces = Math.max(1, Math.round(length / 3.6));
    const alongZ = Math.abs(run.to.z - run.from.z) > Math.abs(run.to.x - run.from.x), piece = length / pieces;
    for (let i = 0; i < pieces; i++) {
      const t0 = i / pieces, t1 = (i + 1) / pieces, at = t => [run.from.x + (run.to.x - run.from.x) * t, run.from.z + (run.to.z - run.from.z) * t];
      const [ax, az] = at(t0), [bx, bz] = at(t1), [mx, mz] = at((t0 + t1) / 2), y = Math.min(gy(ax, az), gy(bx, bz), gy(mx, mz)) - .4;
      if (y < JAMB.top - 6) continue;
      walls.block(STONE.dark, mx, y, mz, alongZ ? .9 : piece + .04, PARAPET.height + .4, alongZ ? piece + .04 : .9);
      for (const o of [-.25, .25]) walls.block(STONE.cap, mx + (alongZ ? 0 : o * piece), y + PARAPET.height + .4, mz + (alongZ ? o * piece : 0), alongZ ? .9 : .95, .75, alongZ ? .95 : .9);
    }
    push({ x: run.x, z: run.z, hx: run.hx, hz: run.hz, kind: 'varn-parapet', jamb: run.jamb });
  }
  for (const watch of VARN_WATCHES) {
    yield;
    const wx = watch.x, wz = watch.z, wy = gy(wx, wz) - .4;
    walls.frame(wx, wy, wz, 0, () => {
      walls.block(STONE.foot, 0, -1.5, 0, 5.4, 2.4, 5.4);
      walls.block(STONE.face, 0, .9, 0, 4.6, 6.4, 4.6);
      walls.box(STONE.cap, 0, 7.4, 0, 5.3, .26, 5.3);
      for (const [sx, sz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) for (const o of [-1.6, 0, 1.6])
        walls.block(STONE.cap, sx * 2.45 + (sz ? o : 0), 7.5, sz * 2.45 + (sx ? o : 0), sz ? .9 : .45, .9, sx ? .9 : .45);
      // The beacon: an iron basket of split wood on the platform, ready to light.
      walls.block(STONE.dark, 0, 7.5, 0, 1.0, .5, 1.0);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; walls.beam(IRON, [Math.cos(a) * .34, 8.0, Math.sin(a) * .34], [Math.cos(a) * .55, 8.7, Math.sin(a) * .55], .06); }
      M.flagpole(1.7, 7.5, -1.7, 3.6);
    });
    push({ x: wx, z: wz, r: 3.1, kind: 'varn-watch' });
    metrics.towers++;
  }
  /**
   * **The jambs' faces, in courses.** Fifty-six metres of sheer rock drawn by a ground a metre and a half
   * apart is one smooth slab, and the mountain behind it is not: it stands in beds. So the harder beds are
   * laid on - a broken line of darker stone standing a hand out of each face every nine metres or so, on
   * the city side and on both ends - and the faces read as the cliff they are. Nothing here is solid or
   * stood on: the faces give no hold (src/content/regions/varn/varn-world.js), and a bed is a line of colour with a shadow.
   */
  {
    const BEDS = ['#6f6a60', '#7a7468', '#655f57'];
    /** One face of a jamb: from `p0` along `dir` for `length`, the rock rising toward `into`. */
    const beds = function* (p0, dir, length, into, salt) {
      let course = 0;
      for (let rise = 8; rise < 54; rise += 8 + (course % 3) * 1.4, course++) {
        yield;
        for (let s = 6 + (course % 2) * 3.4; s < length - 9; s += 7.6) {
          yield;
          const run = 4.6 + ((course * 7 + Math.round(s) + salt) % 5) * .55, mid = s + run / 2;
          const px = p0.x + dir.x * mid, pz = p0.z + dir.z * mid, foot = gy(px - into.x * .6, pz - into.z * .6);
          // Only where the jamb itself stands that high over its own foot: at the mountain's end the face runs out.
          if (gy(px + into.x * (JAMB.face + 1.5), pz + into.z * (JAMB.face + 1.5)) - foot < rise + 5) continue;
          const y = foot + rise + (((course * 13 + Math.round(s * 3) + salt) % 7) - 3) * .24;
          let inset = 0;
          while (inset < JAMB.face + 1 && gy(px + into.x * inset, pz + into.z * inset) < y) inset += .15;
          const x = px + into.x * (inset - .3), z = pz + into.z * (inset - .3), thick = .45 + (course % 2) * .22;
          walls.block(BEDS[(course + Math.round(s)) % 3], x, y, z, dir.x ? run : 1.15, thick, dir.z ? run : 1.15);
        }
      }
    };
    for (const jamb of VARN_JAMBS) {
      const lipX = jamb.inward > 0 ? jamb.maxX : jamb.minX, farX = jamb.inward > 0 ? jamb.minX : jamb.maxX, wide = Math.abs(lipX - farX);
      yield* beds({ x: lipX, z: jamb.minZ }, { x: 0, z: 1 }, jamb.maxZ - jamb.minZ, { x: -jamb.inward, z: 0 }, 1);   // the city side
      yield* beds({ x: lipX, z: jamb.minZ }, { x: -jamb.inward, z: 0 }, wide, { x: 0, z: 1 }, 2);                     // the pass end
      yield* beds({ x: lipX, z: jamb.maxZ }, { x: -jamb.inward, z: 0 }, wide, { x: 0, z: -1 }, 3);                    // the Amod end
    }
  }
  metrics.towers += M.towers;
  metrics.vertices += walls.vertexCount;
  yield* walls.finishSteps(group); metrics.batches++;

  // -------------------------------------------------------------------------
  // The citadel: the ward's wall, the keep and the hall
  // -------------------------------------------------------------------------
  /**
   * The ward's own wall shuts its east and south sides, a size lighter than the curtain, with one open
   * gate onto the upper court and a ramp through it; the keep stands in the ward's north-west corner,
   * its door a storey up on the yard side.
   */
  const citadel = createSceneryBuilder('Varn citadel'), C = imperialMasonry(citadel, gy);
  {
    const W = VARN_WARD_STANDARD, circuit = VARN_WARD_WALL;
    yield* C.curtain(circuit, W, { slits: false });
    // The ward's towers stand on the ground outside it, which is the lower: the yard inside is made up.
    for (const tw of circuit.towers) {
      const edge = circuit.edges[tw.edge], out = { x: tw.x + edge.out.x * (W.towerSize / 2 + .8), z: tw.z + edge.out.z * (W.towerSize / 2 + .8) };
      C.tower(tw.x, tw.z, Math.atan2(edge.dir.x, edge.dir.z), gy(out.x, out.z), W.towerSize, W.towerPlatform + 1.6);
    }
    for (const gate of circuit.gates) C.gatehouse(circuit, gate, W, { shut: false, rise: 1.4, hangings: false });
    colliders.push(...circuit.colliders.map(c => ({ ...c })));
    yield;
    const [keepBox, stairBox] = C.keep(VARN_KEEP, { door: [1, 0] });
    push({ ...keepBox, kind: 'varn-keep' }); push({ ...stairBox, kind: 'varn-keep-stair' });
    metrics.towers += C.towers; metrics.buildings++;
  }

  // -------------------------------------------------------------------------
  // The town
  // -------------------------------------------------------------------------
  const town = createSceneryBuilder('Varn town');
  /** Which way a building's door looks: at the street if it stands by it, else at the square or the nearest court. */
  const doorSide = b => {
    if (Math.abs(b.x - VARN.axis) < 26 && b.kind !== 'house') return b.x < VARN.axis ? 'east' : 'west';
    if (b.kind === 'house') return b.z < VARN_SQUARE.z ? 'north' : (Math.abs(b.x - VARN.axis) < 30 ? (b.x < VARN.axis ? 'east' : 'west') : 'north');
    return b.z < -760 ? 'south' : 'north';
  };
  const FACING = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] };
  let n = 0;
  for (const b of VARN_BUILDINGS) {
    if ((++work & 3) === 0) yield;
    const hx = b.width / 2, hz = b.depth / 2, corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => gy(b.x + sx * hx, b.z + sz * hz));
    const base = Math.min(...corners), fall = Math.max(...corners) - base, amod = b.kind === 'house';
    const wall = amod ? HOUSE_WALLS[n % HOUSE_WALLS.length] : STONE.face, roof = amod ? HOUSE_ROOFS[n % HOUSE_ROOFS.length] : SLATE;
    const storey = amod ? 2.5 : 2.9, height = b.storeys * storey, long = b.width >= b.depth, [fx, fz] = FACING[doorSide(b)];
    n++;
    town.frame(b.x, base, b.z, 0, () => {
      // A plinth that takes up the fall of the ground, the walls, and the floor bands so its storeys read.
      town.block(amod ? DRY_STONE : STONE.foot, 0, -1.2, 0, b.width + .4, 2.1 + fall, b.depth + .4);
      const foot = .9 + fall;
      town.block(wall, 0, foot, 0, b.width, height, b.depth);
      for (let s = 1; s < b.storeys; s++) town.box(amod ? '#9d9682' : STONE.mortar, 0, foot + s * storey, 0, b.width + .14, .14, b.depth + .14);
      const eaves = foot + height, rise = amod ? 2.4 : (Math.min(b.width, b.depth) * .42);
      town.roof(roof, 0, eaves, 0, (long ? b.depth : b.width) + .9, (long ? b.width : b.depth) + .8, rise, long ? Math.PI / 2 : 0, wall);
      // The door, on the side it faces, and a lintel over it.
      const dx = fx * (hx + .05), dz = fz * (hz + .05), wide = b.kind === 'stables' || b.kind === 'smithy' || b.kind === 'armoury' ? 2.6 : 1.3;
      town.block(WOOD_DARK, dx, foot, dz, fx ? .12 : wide, 2.2, fz ? .12 : wide);
      town.block(amod ? '#9d9682' : STONE.cap, dx, foot + 2.2, dz, fx ? .16 : wide + .5, .24, fz ? .16 : wide + .5);
      // Windows on the two long faces: slits in the Empire's stores, shuttered lights in a house.
      const along = long ? b.width : b.depth, lights = Math.max(2, Math.round(along / 3.4));
      for (let s = 1; s <= b.storeys; s++) for (const side of [-1, 1]) for (let i = 0; i < lights; i++) {
        const o = (i - (lights - 1) / 2) * along / lights, y = foot + s * storey - 1.5;
        if (s === 1 && Math.abs(o) < wide && ((long && fz === side) || (!long && fx === side))) continue;
        const x = long ? o : side * (hx + .04), z = long ? side * (hz + .04) : o;
        town.block(SLIT, x, y, z, long ? (amod ? .7 : .28) : .06, amod ? .9 : 1.1, long ? .06 : (amod ? .7 : .28));
        if (amod && s < b.storeys) for (const leaf of [-1, 1]) town.block(SHUTTER, x + (long ? leaf * .52 : side * .03), y, z + (long ? side * .03 : leaf * .52), long ? .34 : .05, .9, long ? .05 : .34);
      }
      if (amod || b.kind === 'smithy' || b.kind === 'hall') town.block(amod ? DRY_STONE : STONE.dark, long ? hx * .55 : 0, eaves, long ? 0 : hz * .55, .8, rise + .9, .8);   // the chimney
      if (b.kind === 'granary') for (const sx of [-1, 1]) town.block(WOOD, sx * (hx + .1), foot + height - 1.6, 0, .14, 1.1, 1.2);   // the hoist doors
      if (b.kind === 'stables') {   // a hitching rail before the door
        for (const i of [-1, 1]) town.block(WOOD, fx * (hx + 1.6) + (fz ? i * 2.2 : 0), foot - .2, fz * (hz + 1.6) + (fx ? i * 2.2 : 0), .14, 1.2, .14);
        town.box(WOOD, fx * (hx + 1.6), foot + .9, fz * (hz + 1.6), fz ? 4.6 : .12, .12, fx ? 4.6 : .12);
      }
    });
    // One box for the chart and for whoever walks into it.
    push({ x: b.x, z: b.z, hx: hx + .25, hz: hz + .25, kind: 'house', width: b.width, depth: b.depth, angle: 0, id: `varn-${b.id}` });
    metrics.buildings++;
  }
  // The well in the square: a stone ring under a little roof on four posts.
  {
    const w = VARN_WELL, y = gy(w.x, w.z);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; town.block(STONE.dark, w.x + Math.sin(a) * 1.0, y, w.z + Math.cos(a) * 1.0, .62, .9, .62, a); }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) town.block(WOOD_DARK, w.x + sx * 1.15, y, w.z + sz * 1.15, .16, 2.7, .16);
    town.roof(SLATE, w.x, y + 2.7, w.z, 3.1, 3.1, 1.1, 0, WOOD);
    town.beam(WOOD_DARK, [w.x - 1.15, y + 2.2, w.z], [w.x + 1.15, y + 2.2, w.z], .14);
    push({ x: w.x, z: w.z, r: w.r, kind: 'varn-well' });
  }
  // The market cross on the square's other side: a stepped plinth and the Empire's standard on a tall pole.
  {
    const x = VARN_SQUARE.x + 6.4, z = VARN_SQUARE.z, y = gy(x, z);
    for (let s = 0; s < 3; s++) town.block(STONE.dark, x, y + s * .3, z, 2.6 - s * .7, .3, 2.6 - s * .7);
    town.block(WOOD_DARK, x, y + .9, z, .16, 7.2, .16);
    town.sheet(RED, [x + .08, y + 8.0, z], [x + 2.6, y + 7.9, z], [x + 2.6, y + 6.4, z], [x + .08, y + 6.3, z]);
    for (const face of [-.015, .015]) town.sheet(GOLD, [x + .4, y + 7.4, z + face], [x + 2.3, y + 7.32, z + face], [x + 2.3, y + 7.02, z + face], [x + .4, y + 7.08, z + face]);
    push({ x, z, r: 1.4, kind: 'varn-market-cross' });
  }
  // Paving, laid a hair over the floor in slabs: the street, the cross street, the square and the two courts.
  {
    const slab = function* (tint, x, z, width, depth, lift = .05) {
      yield;
      yield* town.patchSteps(tint, groundHeight, x, z, width, depth, 0, lift, 2);
    };
    const street = VARN_STREET;
    for (let i = 1; i < street.length; i++) {
      const a = street[i - 1], c = street[i], length = Math.hypot(c.x - a.x, c.z - a.z), steps = Math.max(1, Math.round(length / 4));
      for (let s = 0; s < steps; s++) { if ((++work & 7) === 0) yield; yield* slab(s % 2 ? STONE.paving : '#8b8773', a.x + (c.x - a.x) * (s + .5) / steps, a.z + (c.z - a.z) * (s + .5) / steps, VARN_ROAD_HALF * 2 + .8, length / steps + .1, .07); }
    }
    const [cw, ce] = VARN_CROSS_STREET;
    for (let x = cw.x; x < ce.x; x += 4.5) yield* slab(Math.round(x / 4.5) % 2 ? STONE.paving : '#8b8773', Math.min(ce.x - 2.25, x + 2.25), cw.z, 4.6, 4.0, .06);
    for (const court of [VARN_SQUARE, ...VARN_COURTS]) {
      const nx = Math.max(1, Math.round(court.halfX / 2.6)), nz = Math.max(1, Math.round(court.halfZ / 2.6));
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
        if ((++work & 7) === 0) yield;
        yield* slab((i + j) % 2 ? STONE.court : '#a39e88', court.x - court.halfX + (i + .5) * court.halfX * 2 / nx, court.z - court.halfZ + (j + .5) * court.halfZ * 2 / nz, court.halfX * 2 / nx + .05, court.halfZ * 2 / nz + .05, .045);
      }
    }
  }
  metrics.vertices += citadel.vertexCount + town.vertexCount;
  yield* citadel.finishSteps(group); yield* town.finishSteps(group); metrics.batches += 2;
  metrics.colliders = colliders.length - before;
  return { group, metrics };
}
