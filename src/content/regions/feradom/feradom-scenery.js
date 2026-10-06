import { finishBuild } from '../../../world/loading/build-steps.js';
import { regionalFarmlandClear } from '../../../world/scenery/regional-farmland.js';
import * as THREE from 'three';
import { registerWorldTree, worldTreeId } from '../../../world/scenery/tree-registry.js';
import { treeGroundingOffset } from '../../../world/scenery/tree-grounding.js';
import { groundTint } from '../../../world/terrain/world-terrain.js';
import { createSceneryBuilder } from '../../../world/scenery/scenery-builder.js';
import { drawCircuit } from '../../../world/scenery/fortworks.js';
import {
  FERADOM_BOX, PASSES, BELT, TOWERS, YARDS, hillRise, beltAt, beltScale, onFeradomCrag, passAcross, passHalfWidth, passPoint,
  GULLIES, GULLY_HALF, MIDLINE, beltPoint, midlineAt, inFeradomBox, scarpAt,
} from './feradom-world.js';
import { PASS_CASTLES, FERADOM_STANDARD } from './feradom-forts.js';
import { FERADOM_BARRIER } from '../pueth/pueth-world.js';

/**
 * What Feradom's barrier hills look like (their ground is src/content/regions/feradom/feradom-world.js): the hills' own finer
 * ground, coloured by what it is; the forest, "dense in tree cover", oak and fir - "old-growth in their
 * upper reaches and actively managed on their lower slopes", so big trees on the upland and younger
 * stands with felled ground among them on the back slopes; the rock band and the stones fallen from it;
 * the Feradom road through the Road Pass; and the fortresses - a castle in every pass, a tower above every
 * narrows, watchtowers with beacons on the summits between. Cleared ground in front of every pass, as
 * the lore has it: stumps where the trees were.
 */
export const FERADOM_STONE = Object.freeze({
  earth: '#6f705f', earthTop: '#7f7f6c', wall: '#8b8a7a', wallDark: '#77766a', cap: '#9d9b8b', deck: '#6b5236', rail: '#4a3a29',
  tower: '#858474', towerDark: '#6f6e62', roof: '#4b3d2f', ditch: '#4b4a3d', ditchSide: '#646350', spike: '#5a4a38', slit: '#1f1f1c',
});
/** The duchy's banner: its russet, with the green chevron of the hills edged pale. */
const RUSSET = '#9a6f4f', GREEN = '#2f4a33', PALE = '#d8cfb4';
const TIMBER = '#5e4a35', TIMBER_DARK = '#4a3a2a', SHINGLE = '#4d3f30', IRON = '#3d3c38';

export function createFeradomScenery(...args) { return finishBuild(createFeradomScenerySteps(...args)); }
export function* createFeradomScenerySteps(kit) {
  let buildWork = 0;
  const { root, material, groundHeight, colliders, dummy, color, round } = kit;
  const group = new THREE.Group(); group.name = 'Feradom scenery'; root.add(group);
  let seed = 7201963;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a, b) => a + random() * (b - a);
  const gy = (x, z) => groundHeight(x, z);
  let treeGroundAt = kit.renderedGroundHeight ?? gy;
  const push = collider => { colliders.push(collider); return collider; };
  const metrics = { batches: 0, trees: 0, stumps: 0, rocks: 0, outcrops: 0, castles: 0, towers: 0, road: 0 };
  const smooth = (a, b, x) => { const v = Math.max(0, Math.min(1, (x - a) / (b - a))); return v * v * (3 - 2 * v); };

  // Where nothing grows: the passes' floors, the ground in front of each pass, the castles and the towers.
  const nearPass = (x, z, margin) => PASSES.some(pass => {
    const across = passAcross(pass, x, z);
    return Number.isFinite(across) && across < passHalfWidth(pass, x, z) + margin * pass.k;
  });
  const inFront = (x, z) => PASSES.some(pass => {
    const across = passAcross(pass, x, z), at = beltAt(x, z), rel = (at.d - pass.foot) / pass.k;
    return Number.isFinite(across) && rel < 22 && across < 34 * pass.k;
  });
  const castleOutside = (yard, x, z) => {
    const c = yard.corners;
    let best = Infinity, inside = false;
    for (let i = 0, j = c.length - 1; i < c.length; j = i++) {
      const a = c[j], b = c[i], dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
      best = Math.min(best, Math.hypot(x - a.x - dx * t, z - a.z - dz * t));
      if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) inside = !inside;
    }
    return inside ? -best : best;
  };
  const nearWorks = (x, z, margin) => YARDS.some(yard => castleOutside(yard, x, z) < margin)
    || TOWERS.some(tower => Math.hypot(x - tower.x, z - tower.z) < tower.r + margin);
  const ROAD = passByRoad();
  function passByRoad() { return PASSES.find(pass => pass.id === 'road-pass'); }

  // -------------------------------------------------------------------------
  // The hills' ground
  // -------------------------------------------------------------------------
  /**
   * The belt draws its own ground three metres apart (the world's grid is sunk under it,
   * `feradomTerrainSink`), coloured by what it is: the world's own colour at the foot, so the edge
   * does not show; darker forest floor up on the hills; scree where it is steep and rock where it is
   * too steep for anybody, in courses a couple of metres deep; a trodden floor in every pass, the road
   * in the Road Pass, and the packed earth of the castles' yards.
   */
  {
    const step = 3, TILE = 56, { minX, minZ, maxX, maxZ } = FERADOM_BOX;
    const cols = Math.floor((maxX - minX) / step) + 1, rows = Math.floor((maxZ - minZ) / step) + 1;
    const rise = new Float32Array(cols * rows), heights = new Float32Array(cols * rows).fill(NaN);
    for (let j = 0; j < rows; j++) { if ((++buildWork & 31) === 0) yield; for (let i = 0; i < cols; i++) { if ((++buildWork & 31) === 0) yield; rise[j * cols + i] = hillRise(minX + i * step, minZ + j * step); } }
    const drawn = new Uint8Array((cols - 1) * (rows - 1));
    for (let j = 0; j < rows - 1; j++) { if ((++buildWork & 31) === 0) yield; for (let i = 0; i < cols - 1; i++) { if ((++buildWork & 31) === 0) yield;
      let any = false;
      for (let b = -1; b <= 2 && !any; b++) { if ((++buildWork & 31) === 0) yield; for (let a = -1; a <= 2 && !any; a++) { if ((++buildWork & 31) === 0) yield;
        const ii = i + a, jj = j + b;
        if (ii >= 0 && jj >= 0 && ii < cols && jj < rows && rise[jj * cols + ii] > 0) any = true;
      } }
      if (any) drawn[j * (cols - 1) + i] = 1;
    } }
    const heightOf = (i, j) => {
      const k = j * cols + i;
      if (Number.isNaN(heights[k])) heights[k] = gy(minX + i * step, minZ + j * step);
      return heights[k];
    };
    const rock = [new THREE.Color('#6f6c62'), new THREE.Color('#66675d'), new THREE.Color('#77726a'), new THREE.Color('#6b695e')];
    const scree = new THREE.Color('#7f7d66'), floor = new THREE.Color('#4f6339'), upland = new THREE.Color('#566b3d');
    const trodden = new THREE.Color('#7c7c55'), road = new THREE.Color('#8b7a57'), yard = new THREE.Color('#857a5c'), shade = new THREE.Color();
    const groundMaterial = material('#ffffff', { vertexColors: true, flatShading: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    let jitter = 90521;
    const wobble = () => { jitter = (Math.imul(jitter, 1664525) + 1013904223) >>> 0; return .95 + jitter / 4294967296 * .1; };
    const paint = (x, z, y, grade, lift) => {
      groundTint(shade, x, z, THREE);
      shade.lerp(floor, smooth(.4, 5, lift) * .6).lerp(upland, smooth(14, 26, lift) * .35);
      // The passes' floors are trodden, the road is earth, and a castle's yard is packed.
      for (const pass of PASSES) {
        const across = passAcross(pass, x, z);
        if (!Number.isFinite(across)) continue;
        const half = passHalfWidth(pass, x, z);
        if (across < half + 1.5) shade.lerp(trodden, .45 * (1 - smooth(half - 1, half + 1.5, across)));
        if (pass === ROAD && across < 2.6) shade.lerp(road, 1 - smooth(1.6, 2.6, across));
      }
      for (const one of YARDS) if (castleOutside(one, x, z) < 1) shade.lerp(yard, .8);
      shade.lerp(scree, Math.min(1, Math.max(0, (grade - .6) / .4)));
      shade.lerp(rock[((Math.floor(y / 2.4) % 4) + 4) % 4], Math.min(1, Math.max(0, (grade - .92) / .4)));
      shade.multiplyScalar(wobble());
    };
    for (let tj = 0; tj < rows - 1; tj += TILE) { if ((++buildWork & 31) === 0) yield; for (let ti = 0; ti < cols - 1; ti += TILE) { if ((++buildWork & 31) === 0) yield;
      const ci = Math.min(TILE, cols - 1 - ti), cj = Math.min(TILE, rows - 1 - tj), indices = [];
      for (let j = 0; j < cj; j++) { if ((++buildWork & 31) === 0) yield; for (let i = 0; i < ci; i++) { if ((++buildWork & 31) === 0) yield;
        if (!drawn[(tj + j) * (cols - 1) + ti + i]) continue;
        const a = j * (ci + 1) + i;
        indices.push(a, a + ci + 1, a + 1, a + 1, a + ci + 1, a + ci + 2);
      } }
      if (!indices.length) continue;
      const positions = new Float32Array((ci + 1) * (cj + 1) * 3), colours = new Float32Array((ci + 1) * (cj + 1) * 3);
      for (let j = 0; j <= cj; j++) { if ((++buildWork & 31) === 0) yield; for (let i = 0; i <= ci; i++) { if ((++buildWork & 31) === 0) yield;
        const gi = ti + i, gj = tj + j, x = minX + gi * step, z = minZ + gj * step, k = j * (ci + 1) + i;
        const used = [[0, 0], [-1, 0], [0, -1], [-1, -1]].some(([a, b]) => {
          const ii = gi + a, jj = gj + b;
          return ii >= 0 && jj >= 0 && ii < cols - 1 && jj < rows - 1 && drawn[jj * (cols - 1) + ii];
        });
        if (!used) { positions.set([x, 0, z], k * 3); continue; }
        const y = heightOf(gi, gj);
        positions.set([x, y, z], k * 3);
        const east = heightOf(Math.min(cols - 1, gi + 1), gj), west = heightOf(Math.max(0, gi - 1), gj);
        const north = heightOf(gi, Math.max(0, gj - 1)), south = heightOf(gi, Math.min(rows - 1, gj + 1));
        paint(x, z, y, Math.hypot(east - west, south - north) / (2 * step), rise[gj * cols + gi]);
        colours.set([shade.r, shade.g, shade.b], k * 3);
      } }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
      const ground = new THREE.Mesh(geometry, groundMaterial);
      ground.name = 'Feradom barrier hills ground'; ground.receiveShadow = true; group.add(ground);
      metrics.batches++;
    } }
    // The fine mesh is piecewise planar. Its analytic height can stand metres
    // above a drawn triangle at a sharp hill shoulder. Keep the actual sampled
    // vertices for tree feet, including which cells have visible geometry.
    const coarseGroundAt = treeGroundAt;
    treeGroundAt = (x, z) => {
      const gx = (x - minX) / step, gz = (z - minZ) / step, i = Math.floor(gx), j = Math.floor(gz);
      if (i < 0 || j < 0 || i >= cols - 1 || j >= rows - 1 || !drawn[j * (cols - 1) + i]) return coarseGroundAt(x, z);
      const a = heightOf(i, j), b = heightOf(i, j + 1), c = heightOf(i + 1, j), d = heightOf(i + 1, j + 1);
      const u = gx - i, v = gz - j;
      return u + v <= 1 ? a + (c - a) * u + (b - a) * v : d + (b - d) * (1 - u) + (c - d) * (1 - v);
    };
  }

  // -------------------------------------------------------------------------
  // The Feradom road
  // -------------------------------------------------------------------------
  /** From the army's barrier in Pueth, in through the Road Pass and both the castle's gates, and down to the coast. */
  const roadLine = (() => {
    const points = [{ x: FERADOM_BARRIER.x, z: FERADOM_BARRIER.z + 2 }];
    for (let rel = -18; rel <= 190; rel += 4) points.push(passPoint(ROAD, 0, rel));
    return points;
  })();
  {
    const half = 1.7, vertices = [], colours = [], indices = [], shade = new THREE.Color();
    for (let i = 0; i < roadLine.length; i++) { if ((++buildWork & 31) === 0) yield;
      const p = roadLine[i], q = roadLine[Math.min(roadLine.length - 1, i + 1)], o = roadLine[Math.max(0, i - 1)];
      const dx = q.x - o.x, dz = q.z - o.z, length = Math.hypot(dx, dz) || 1, nx = -dz / length, nz = dx / length;
      for (const side of [-1, 1]) { if ((++buildWork & 31) === 0) yield;
        const x = p.x + nx * half * side, z = p.z + nz * half * side;
        vertices.push(x, gy(x, z) + .06, z);
        shade.set('#8b7a57').multiplyScalar(.94 + (i % 3) * .03);
        colours.push(shade.r, shade.g, shade.b);
      }
      if (i) { const v = i * 2; indices.push(v - 2, v, v - 1, v - 1, v, v + 1); }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material('#ffffff', { vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    mesh.name = 'The Feradom road'; mesh.receiveShadow = true; group.add(mesh);
    metrics.road = roadLine.length;
  }
  const onRoad = (x, z, margin) => {
    for (let i = 0; i < roadLine.length - 1; i++) {
      const a = roadLine[i], b = roadLine[i + 1], dx = b.x - a.x, dz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
      if (Math.hypot(x - a.x - dx * t, z - a.z - dz * t) < 1.7 + margin) return true;
    }
    return false;
  };

  // -------------------------------------------------------------------------
  // The forest
  // -------------------------------------------------------------------------
  /**
   * Fir and oak, the lore's two. On the upland the forest is old - tall firs, broad oaks, close - and on
   * the back slopes it is a managed wood of younger trees in stands, with felled ground among them:
   * stumps, a stacked pile of logs here and there. Nothing grows on the rock band, in a pass, in front of
   * one, or near the works. Laid out in blocks, each block its own few batches, so the forest out of
   * sight is culled.
   */
  const trunkGeometry = new THREE.CylinderGeometry(.18, .32, 1, 6);
  const coneGeometry = new THREE.ConeGeometry(1, 1, 7);
  const lobeGeometry = new THREE.IcosahedronGeometry(1, 0);
  const stumpGeometry = new THREE.CylinderGeometry(.28, .34, 1, 7);
  const barkMaterial = material('#5a4735'), leafMaterial = material('#ffffff', { flatShading: true });
  const stumpMaterial = material('#6e5a41'), stoneMaterial = material('#8a887a');
  const felled = (x, z) => Math.sin(x * .021 + Math.sin(z * .017) * 2.2) * Math.sin(z * .025 + 1.1) > .38;

  function* forestBlockSteps(trees, stumps) {
    let buildWork = 0;
    if (trees.length) {
      const firs = trees.filter(tree => tree.fir), oaks = trees.filter(tree => !tree.fir);
      const trunks = new THREE.InstancedMesh(trunkGeometry, barkMaterial, trees.length);
      for (const [index, tree] of trees.entries()) { if ((++buildWork & 31) === 0) yield;
        const y = gy(tree.x, tree.z);
        dummy.position.set(tree.x, y + tree.h * (tree.fir ? .3 : .34), tree.z); dummy.rotation.set(0, tree.rot, 0);
        dummy.scale.set(tree.s, tree.h * (tree.fir ? .62 : .7), tree.s); dummy.updateMatrix();
        const grounding = treeGroundingOffset(dummy.matrix, treeGroundAt, { radius: .32, segments: 6 });
        tree.y = y + grounding;
        dummy.position.y += grounding; dummy.updateMatrix();
        trunks.setMatrixAt(index, dummy.matrix);
        tree.parts = [{mesh:trunks,index}]; tree.collider = push({ x: tree.x, z: tree.z, r: .45 * tree.s, kind: 'feradom-tree' });
      }
      const batches = [trunks];
      if (firs.length) {
        // A fir is three cones, one above another, narrowing to the top.
        const cones = new THREE.InstancedMesh(coneGeometry, leafMaterial, firs.length * 3);
        let n = 0;
        for (const tree of firs) { if ((++buildWork & 31) === 0) yield;
          const y = tree.y;
          for (let tier = 0; tier < 3; tier++) { if ((++buildWork & 31) === 0) yield;
            const r = tree.h * (.25 - tier * .058) * tree.spread, h = tree.h * (.42 - tier * .06);
            dummy.position.set(tree.x, y + tree.h * (.34 + tier * .21) + h / 2, tree.z);
            dummy.rotation.set(0, tree.rot + tier, 0); dummy.scale.set(r, h, r); dummy.updateMatrix();
            cones.setMatrixAt(n, dummy.matrix);
            tree.parts.push({mesh:cones,index:n});
            cones.setColorAt(n++, color.set(tree.tint).offsetHSL(0, range(-.03, .03), range(-.04, .03) + tier * .015));
          }
        }
        batches.push(cones);
      }
      if (oaks.length) {
        const lobes = new THREE.InstancedMesh(lobeGeometry, leafMaterial, oaks.length * 3);
        let n = 0;
        for (const tree of oaks) { if ((++buildWork & 31) === 0) yield;
          const y = tree.y;
          for (let lobe = 0; lobe < 3; lobe++) { if ((++buildWork & 31) === 0) yield;
            const a = tree.rot + lobe * 2.1, spread = lobe === 2 ? 0 : tree.h * .19;
            dummy.position.set(tree.x + Math.sin(a) * spread, y + tree.h * (lobe === 2 ? .88 : .7), tree.z + Math.cos(a) * spread);
            const r = tree.h * .33 * tree.spread;
            dummy.rotation.set(range(-.15, .15), a, range(-.14, .14)); dummy.scale.set(r, tree.h * .24, r); dummy.updateMatrix();
            lobes.setMatrixAt(n, dummy.matrix);
            tree.parts.push({mesh:lobes,index:n});
            lobes.setColorAt(n++, color.set(tree.tint).offsetHSL(range(-.012, .012), range(-.05, .05), range(-.05, .05)));
          }
        }
        batches.push(lobes);
      }
      for (const batch of batches) { if ((++buildWork & 31) === 0) yield;  batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch); metrics.batches++; }
      for(const tree of trees) { if ((++buildWork & 31) === 0) yield; registerWorldTree(colliders,{id:worldTreeId('feradom',tree.x,tree.z),x:tree.x,z:tree.z,y:tree.y-tree.h*.01,height:tree.h,species:tree.fir?'silver-fir':'white-oak'},tree.parts,tree.collider); }
      metrics.trees += trees.length;
    }
    if (stumps.length) {
      const batch = new THREE.InstancedMesh(stumpGeometry, stumpMaterial, stumps.length);
      for (const [index, stump] of stumps.entries()) { if ((++buildWork & 31) === 0) yield;
        dummy.position.set(stump.x, gy(stump.x, stump.z) + stump.h * .4, stump.z); dummy.rotation.set(range(-.06, .06), stump.rot, range(-.06, .06));
        dummy.scale.set(stump.s, stump.h, stump.s); dummy.updateMatrix();
        batch.setMatrixAt(index, dummy.matrix);
        batch.setColorAt(index, color.set('#6e5a41').offsetHSL(0, 0, range(-.05, .06)));
        if (stump.s > .8) push({ x: stump.x, z: stump.z, r: .3 * stump.s, kind: 'feradom-stump' });
      }
      batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch);
      metrics.stumps += stumps.length; metrics.batches++;
    }
  }

  const BLOCK = 150, CELL = 4.4;
  const { minX, minZ, maxX, maxZ } = FERADOM_BOX;
  for (let bx = minX; bx < maxX; bx += BLOCK) { if ((++buildWork & 31) === 0) yield; for (let bz = minZ; bz < maxZ; bz += BLOCK) { if ((++buildWork & 31) === 0) yield;
    const trees = [], stumps = [];
    for (let cx = bx; cx < Math.min(maxX, bx + BLOCK); cx += CELL) { if ((++buildWork & 31) === 0) yield; for (let cz = bz; cz < Math.min(maxZ, bz + BLOCK); cz += CELL) { if ((++buildWork & 31) === 0) yield;
      const x = cx + range(.3, CELL - .3), z = cz + range(.3, CELL - .3);
      const lift = hillRise(x, z);
      if (lift < .6 || !inFeradomBox(x, z)) { random(); random(); random(); continue; }
      const at = beltAt(x, z), k = at.k;
      const back = at.d > BELT.backFrom * k, high = lift > 16;
      const clearing = inFront(x, z) || nearPass(x, z, 4) || nearWorks(x, z, 7) || onRoad(x, z, 3);
      if (onFeradomCrag(x, z) || regionalFarmlandClear(x,z,3)) { random(); random(); random(); continue; }
      if (clearing) {
        // Cleared ground: the stumps of what was felled to open it.
        if (random() < .12 && !nearPass(x, z, .5) && !nearWorks(x, z, 2) && !onRoad(x, z, 1)) stumps.push({ x, z, s: range(.7, 1.2), h: range(.35, .7), rot: range(0, 6.28) });
        random(); random(); continue;
      }
      if (back && felled(x, z)) {
        // A felled stand in the managed wood: stumps, and the young trees coming up among them.
        const r = random();
        if (r < .35) stumps.push({ x, z, s: range(.75, 1.15), h: range(.35, .65), rot: range(0, 6.28) });
        else if (r < .5) trees.push({ x, z, fir: random() < .5, h: range(4, 7), s: range(.5, .7), spread: range(.9, 1.1), rot: range(0, 6.28), tint: '#3f6a3f' });
        else random();
        continue;
      }
      // Steep ground holds fewer trees; the old wood on the upland is closest. The talus under the rock band
      // is thin - scattered trees among the fallen stone - so the rock shows from the border.
      const scarp = scarpAt(at.s), talus = at.d < scarp.talusTop + 1.5;
      const density = talus ? .28 : high ? .86 : back ? .62 : .72;
      if (random() > density) { random(); random(); continue; }
      const fir = random() < (high ? .62 : .45);
      const old = high && !back;
      const h = fir ? range(old ? 16 : 11, old ? 23 : 16) : range(old ? 12 : 9, old ? 17 : 13);
      trees.push({ x, z, fir, h, s: range(old ? 1.05 : .85, old ? 1.45 : 1.15), spread: range(.85, 1.15), rot: range(0, 6.28),
        tint: fir ? (random() < .5 ? '#2d4a37' : '#34523a') : (random() < .5 ? '#46633a' : '#4f6c3c') });
    } }
    yield* forestBlockSteps(trees, stumps);
  } }

  // -------------------------------------------------------------------------
  // Stone: the rock band, and what has fallen from it
  // -------------------------------------------------------------------------
  /**
   * The rock band is drawn in the ground's colour already; along it, every few metres, a block of the
   * bedded stone stands out of it, and below it on the talus lie the ones that came down. The band's
   * blocks cannot be walked into (nothing can climb there anyway), so they carry no collider; the
   * fallen ones on the talus do.
   */
  {
    const outcrops = [], boulders = [];
    // Wherever the ground is too steep to climb - the rock band, a gorge's walls, a basin's sides - its stone
    // stands out of it in blocks, a couple of metres apart.
    const STEP = 2.4, { minX, minZ, maxX, maxZ } = FERADOM_BOX;
    for (let x = minX; x < maxX; x += STEP) { if ((++buildWork & 31) === 0) yield; for (let z = minZ; z < maxZ; z += STEP) { if ((++buildWork & 31) === 0) yield;
      const px = x + range(0, STEP), pz = z + range(0, STEP), keep = random();
      if (hillRise(px, pz) < 2) continue;
      const grade = Math.hypot(gy(px + 1.2, pz) - gy(px - 1.2, pz), gy(px, pz + 1.2) - gy(px, pz - 1.2)) / 2.4;
      if (grade < 1.05 || keep > .22 + (grade - 1.05) * .5) continue;
      if (nearWorks(px, pz, 2.5) || onRoad(px, pz, 2) || regionalFarmlandClear(px,pz,2)) continue;
      outcrops.push({ x: px, z: pz, s: range(1.1, 2.3) * Math.min(1.25, .7 + grade * .3), rot: range(0, 6.28) });
    } }
    for (let s = 0; s < MIDLINE.length; s += 3.2) { if ((++buildWork & 31) === 0) yield;
      const { k, talusTop } = scarpAt(s);
      if (GULLIES.some(gully => Math.abs(s - gully.s) < GULLY_HALF)) continue;
      if (random() < .55) {
        const q = beltPoint(s + range(-1.5, 1.5), talusTop - range(2, 12) * k);
        if (!nearPass(q.x, q.z, 3) && !nearWorks(q.x, q.z, 3) && hillRise(q.x, q.z) > .5) boulders.push({ x: q.x, z: q.z, s: range(.5, 1.5), rot: range(0, 6.28) });
      }
    }
    const batch = (list, name, embed, collide) => {
      if (!list.length) return;
      const mesh = new THREE.InstancedMesh(round, stoneMaterial, list.length);
      list.forEach((rock, index) => {
        dummy.position.set(rock.x, gy(rock.x, rock.z) - rock.s * embed, rock.z);
        dummy.rotation.set(range(-.25, .25), rock.rot, range(-.25, .25));
        dummy.scale.set(rock.s * range(1, 1.5), rock.s * range(.6, .95), rock.s * range(.8, 1.2)); dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix); mesh.setColorAt(index, color.setHSL(range(.1, .16), range(.04, .09), range(.36, .5)));
        if (collide && rock.s > .8) push({ x: rock.x, z: rock.z, r: rock.s * .75, kind: 'feradom-boulder' });
      });
      mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true; mesh.computeBoundingSphere(); group.add(mesh); metrics.batches++;
    };
    batch(outcrops, 'Feradom rock band', .35, false);
    batch(boulders, 'Feradom fallen stone', .2, true);
    metrics.outcrops = outcrops.length; metrics.rocks = boulders.length;
  }

  // -------------------------------------------------------------------------
  // The fortresses
  // -------------------------------------------------------------------------
  const b = createSceneryBuilder('Feradom pass castles');
  /** The duchy's banner on a pole: russet, the green chevron edged pale, hung from a crossbar. */
  function banner(x, y, z, yaw, pole = 3.2) {
    b.frame(x, y, z, yaw, () => {
      b.block(TIMBER_DARK, 0, 0, 0, .12, pole + .3, .12);
      b.box(TIMBER_DARK, .45, pole, 0, .95, .08, .08);
      const top = pole - .05, low = pole - 1.6;
      b.sheet(RUSSET, [.05, top, 0], [.9, top, 0], [.9, low, 0], [.05, low, 0]);
      // The chevron, point up, a little proud of the cloth on both faces.
      for (const face of [-.012, .012]) {
        b.sheet(PALE, [.1, low + .55, face], [.475, low + 1.02, face], [.475, low + .86, face], [.1, low + .39, face]);
        b.sheet(PALE, [.475, low + 1.02, face], [.85, low + .55, face], [.85, low + .39, face], [.475, low + .86, face]);
        b.sheet(GREEN, [.13, low + .52, face * 1.5], [.475, low + .96, face * 1.5], [.475, low + .88, face * 1.5], [.13, low + .44, face * 1.5]);
        b.sheet(GREEN, [.475, low + .96, face * 1.5], [.82, low + .52, face * 1.5], [.82, low + .44, face * 1.5], [.475, low + .88, face * 1.5]);
      }
    });
  }
  /** A square stone tower, battered at the foot, slits on every face, a crenellated top, and a door facing `yaw`. */
  function stoneTower(x, z, yaw, size, height, { hood = false, beacon = false, flag = true } = {}) {
    const y = gy(x, z), half = size / 2;
    b.frame(x, y, z, yaw, () => {
      b.block(FERADOM_STONE.earth, 0, -1.2, 0, size + 1.1, 2.2, size + 1.1);
      b.block(FERADOM_STONE.tower, 0, .8, 0, size, height - .8, size);
      for (const band of [height * .45, height - .5]) b.box(FERADOM_STONE.towerDark, 0, band, 0, size + .08, .22, size + .08);
      for (const [sx, sz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) for (const y0 of [height * .35, height * .7]) {
        b.block(FERADOM_STONE.slit, sx * (half + .01), y0, sz * (half + .01), sz ? .2 : .06, .95, sx ? .2 : .06);
      }
      b.block('#3a3129', 0, 0, half + .02, 1.2, 2.2, .08);
      b.box(FERADOM_STONE.cap, 0, height + .12, 0, size + .3, .25, size + .3);
      for (const [sx, sz, w, d] of [[0, -1, size + .3, .45], [0, 1, size + .3, .45], [-1, 0, .45, size + .3], [1, 0, .45, size + .3]]) {
        const n = Math.max(2, Math.round(size / 1.6));
        for (let i = 0; i < n; i++) {
          const offset = (i - (n - 1) / 2) * (size + .3) / n;
          b.block(FERADOM_STONE.cap, sx * (half + .05) + (sz ? offset : 0), height + .24, sz * (half + .05) + (sx ? offset : 0), sz ? (size + .3) / n * .55 : w, .8, sx ? (size + .3) / n * .55 : d);
        }
      }
      if (hood) {
        // A shingled hood on four posts over the back half of the platform: the watch keeps its fire dry.
        for (const sx of [-1, 1]) for (const sz of [-1, .1]) b.block(TIMBER, sx * (half - .5), height + .24, sz * (half - .5), .22, 2.3, .22);
        b.roof(SHINGLE, 0, height + 2.5, -half * .45, size - .2, size * .7, 1.2, Math.PI / 2, TIMBER);
      }
      if (beacon) {
        // The beacon: an iron basket of split fir on a stone plinth, ready to light.
        b.block(FERADOM_STONE.towerDark, half * .35, height + .24, half * .35, .9, .5, .9);
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; b.beam(IRON, [half * .35 + Math.cos(a) * .32, height + .74, half * .35 + Math.sin(a) * .32], [half * .35 + Math.cos(a) * .5, height + 1.4, half * .35 + Math.sin(a) * .5], .05); }
        for (let i = 0; i < 5; i++) b.beam('#7a5f40', [half * .35 - .35 + i * .17, height + .8, half * .35 - .3], [half * .35 - .3 + i * .15, height + 1.3, half * .35 + .3], .1);
      }
      // The banner at the back corner of the platform, flying across the tower's face.
      if (flag) banner(-(half - .4), height + .24, -(half - .4), Math.PI / 2);
    });
    push({ x, z, r: half * 1.15, kind: 'feradom-tower' });
  }

  for (const castle of PASS_CASTLES) { if ((++buildWork & 31) === 0) yield;
    drawCircuit(castle.circuit, {
      parent: group, heightAt: groundHeight, colliders, style: 'stone', name: castle.name, palette: FERADOM_STONE,
      // The gate toward the border is shut; the one toward the coast stands open.
      gateLeaves: gate => (gate.id.endsWith('front-gate') ? 'shut' : 'open'),
    });
    colliders.push(...castle.circuit.colliders);
    for (const gate of castle.circuit.gates) { if ((++buildWork & 31) === 0) yield; if (gate.id.endsWith('front-gate')) {
      for (let s = -gate.halfWidth; s <= gate.halfWidth + 1e-6; s += .7) { if ((++buildWork & 31) === 0) yield; push({ x: gate.centre.x + gate.along.x * s, z: gate.centre.z + gate.along.z * s, r: .75, kind: 'feradom-gate-shut' }); }
    } }
    // The keep: a stone tower-house to one side of the way through, taller than the walls; the great castle's is
    // broad and hooded, with the duchy's banner over it.
    const middle = castle.way[2];
    stoneTower(castle.keep.x, castle.keep.z, Math.atan2(middle.x - castle.keep.x, middle.z - castle.keep.z), castle.keep.size, castle.keep.height, { hood: castle.great, flag: true });
    // The hall: a timber hall on a stone footing under a steep shingle roof, its door on the yard.
    {
      const h = castle.hall, door = Math.cos(h.yaw) * (middle.x - h.x) - Math.sin(h.yaw) * (middle.z - h.z) > 0 ? 1 : -1;
      const y = Math.min(gy(h.x, h.z), gy(h.x + Math.sin(h.yaw) * h.length / 2, h.z + Math.cos(h.yaw) * h.length / 2), gy(h.x - Math.sin(h.yaw) * h.length / 2, h.z - Math.cos(h.yaw) * h.length / 2));
      b.frame(h.x, y, h.z, h.yaw, () => {
        b.block(FERADOM_STONE.wallDark, 0, -.5, 0, h.width + .3, 1.3, h.length + .3);
        b.block(TIMBER, 0, .8, 0, h.width, 2.6, h.length);
        const posts = Math.round(h.length / 2.2);
        for (let i = 0; i <= posts; i++) for (const sx of [-1, 1]) b.block(TIMBER_DARK, sx * (h.width / 2 + .02), .8, -h.length / 2 + i * h.length / posts, .22, 2.6, .22);
        b.roof(SHINGLE, 0, 3.4, 0, h.width + 1.1, h.length + .8, h.width * .75, 0, TIMBER);
        b.block('#3a3129', door * (h.width / 2 + .03), .8, 0, .08, 2.0, 1.3);
        b.block(FERADOM_STONE.towerDark, h.width * .15, 3.4, h.length * .3, .8, h.width * .75 + .6, .8);
      });
      const steps = Math.max(1, Math.round(h.length / h.width));
      for (let i = 0; i < steps; i++) { if ((++buildWork & 31) === 0) yield;
        const along = -h.length / 2 + (i + .5) * h.length / steps;
        push({ x: h.x + Math.sin(h.yaw) * along, z: h.z + Math.cos(h.yaw) * along, r: Math.max(h.width, h.length / steps) * .6, kind: 'feradom-hall' });
      }
    }
    // Banners over the front gate, one on each gate tower where there are towers.
    const front = castle.circuit.gates.find(gate => gate.id.endsWith('front-gate'));
    for (const tower of castle.circuit.towers.filter(t => t.id.startsWith(front.id))) { if ((++buildWork & 31) === 0) yield;
      const ty = Math.min(...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dz]) => gy(tower.x + dx * 2.4, tower.z + dz * 2.4)));
      banner(tower.x, ty + FERADOM_STANDARD.towerPlatform + .2, tower.z, tower.yaw);
    }
    metrics.castles++;
  }
  for (const tower of TOWERS) { if ((++buildWork & 31) === 0) yield;
    const pass = PASSES.find(one => one.id === tower.pass);
    // The tower above the narrows faces the gorge; a watchtower faces out over the border.
    const inward = midlineAt(beltAt(tower.x, tower.z).s).inward;
    const outward = pass ? Math.atan2(pass.mouth.x - tower.x, pass.mouth.z - tower.z) : Math.atan2(-inward.x, -inward.z);
    stoneTower(tower.x, tower.z, outward + Math.PI, tower.size, tower.height, { hood: tower.kind === 'narrows', beacon: tower.kind === 'watch', flag: true });
    metrics.towers++;
  }
  b.finish(group);
  metrics.batches++;

  return { group, metrics, road: roadLine };
}
