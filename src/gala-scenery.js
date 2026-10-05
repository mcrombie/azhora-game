import { forEachBuild } from './build-each.js';
import { finishBuild } from './build-steps.js';
import * as THREE from 'three';
import { registerWorldTree, worldTreeId } from './tree-registry.js';
import { treeGroundingOffset } from './tree-grounding.js';
import { hexOwnerAt, REGION_CELLS, landDistance, relief } from './region-world.js';
import { WORLD_SCALE } from './world-scale.js';
import { LIZEEM, LIZEEM_REACH, WEST_BRAIDS, WEST_RIVERS, GALA_RIVERS, GALA_CHANNEL, GALA_TELEMONIA_STREAM, GALA_TELEMONIA_MOUTH, GALA_DESERT_STREAM, OVETH_REACH, westBareGround, courseDistance,
  TRELOSS_GULLY, TRELOSS_SINK, TRELOSS_PATCH_REACH, trelossGullyDistance } from './west-regions.js';
import { WEST_PROFILES, westWaterSurface, braidThreadOffset, courseSample } from './west-ground.js';
import { galaClimate, galaSouthness, galaClear, onWashFloor, washPlace, GALA_WASH, GALA_SEAM } from './gala-world.js';
import { groundTint } from './world-terrain.js';
import { TELEMONIA_BOX, TELEMONIA_PATCH_REACH, inTelemoniaBox, borderDepth, telemoniaTerrainSink } from './telemonia-world.js';

/**
 * What Gala looks like where the ground alone is not enough: its water, the gravel of its dry wash
 * and its fords, and what grows on three climates laid across one plain.
 *
 * The brief is the six-regions brief's Gala section and docs/gala-brief.md, read against the atlas:
 *
 *  - **North (`BSh`)**: "Ovesos's steppe carried over the border — bunch grass in tussocks, grey
 *    wormwood and saltbush on the stonier ground, bare between." Tussocks with the ground showing
 *    through, low grey sub-shrubs nobody has to walk round, stones where the soil is thin, and the
 *    dry wash's gravel. No tree: under `BSh` a tree is a thing that stands by water, and the only
 *    water here is on the borders.
 *  - **Middle (`Csb`)**: "dry tawny grass, low maquis in patches on the stony rises — knee to chest,
 *    aromatic, never closed — and wild olive and fig standing singly, well apart."
 *  - **South (`Csa`, and the sea)**: "the same, warmer and thinner, with tamarisk and oleander thick
 *    along every watercourse and a short band of sea grass and thrift on the two coastal hexes."
 *
 * And the water's own margins wherever there is water: reed and sedge at every waterline, sand on
 * the braid bars, rock in the Oveth's ford, and the reed bank along the Lizeem's western side, which
 * is the "richest avian assemblage documented on the continent" standing somewhere to stand.
 *
 * Nothing here is anybody's: no field, no olive grove in rows, no channel with a straight side.
 * Everything is placed on Gala's own hexes (`hexOwnerAt`), from one seeded stream of its own, so
 * nothing already built anywhere else moves by a centimetre for it.
 */
export function createGalaScenery(...args) { return finishBuild(createGalaScenerySteps(...args)); }

export function* createGalaScenerySteps(kit) {
  let buildWork = 0;
  const { root, material, groundHeight, colliders, dummy, color, round } = kit;
  const group = new THREE.Group(); group.name = 'Gala scenery'; root.add(group);
  let seed = 2100421;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a, b) => a + random() * (b - a);
  const smooth = (a, b, x) => { const v = Math.max(0, Math.min(1, (x - a) / (b - a))); return v * v * (3 - 2 * v); };
  const metrics = { water: 0, blockers: 0, reeds: 0, gravel: 0, sand: 0, stones: 0, tufts: 0, shrubs: 0, maquis: 0, trees: 0, tamarisk: 0, oleander: 0, thrift: 0 };
  const gy = (x, z) => groundHeight(x, z);
  const pendingTrees = []; let fineGroundHeight = () => null;
  const treeGroundAt = (x, z) => Math.max((kit.renderedGroundHeight ?? gy)(x, z), fineGroundHeight(x, z) ?? -Infinity);
  const own = (x, z) => hexOwnerAt(x, z) === 'Gala';
  /**
   * **The Treloss's mouth** (`GALA_TELEMONIA_MOUTH`) was cut on 2026-10-03, after everything here was laid.
   * Every candidate below draws from the one seeded stream in turn, so a candidate the new water refused
   * re-rolled every one after it: measured, three olives and figs, three maquis bushes, twenty-one tussocks
   * and seven thrift cushions came out somewhere else, as far as 165 m from the mouth. So the scatter is still decided
   * against the water it was laid beside - every western course but the mouth (`laidBare`, `laidWater`) -
   * and what the mouth would drown is moved square off its line onto Gala's own bank when it is drawn
   * (`offTheMouth`). Nothing else moves. Far from the mouth both answer exactly what the shared tests do.
   */
  const MOUTH = GALA_TELEMONIA_MOUTH, LAID = WEST_RIVERS.filter(course => course !== MOUTH);
  const nearMouth = (x, z, reach) => courseDistance(MOUTH, x, z, reach) < reach;
  const laidBare = (x, z, margin) => {
    if (!nearMouth(x, z, 60)) return westBareGround(x, z, margin);
    // `inWestWater` without the mouth: the nearest other course, judged by its own widest water. There is
    // no pool and no sinter within a kilometre of here, which are the other two things `westBareGround` asks.
    let best = null, distance = Infinity;
    for (const course of LAID) { const d = courseDistance(course, x, z, Math.min(60, distance)); if (d < distance) { distance = d; best = course; } }
    return Boolean(best) && distance < best.maxHalf + margin;
  };
  const laidWater = (x, z) => {
    const surface = westWaterSurface(x, z);
    if (surface === null || !nearMouth(x, z, MOUTH.maxHalf)) return surface;
    if (courseDistance(MOUTH, x, z, MOUTH.maxHalf) >= courseSample(MOUTH, x, z).half) return surface;
    // The mouth's water: the stream's own answer where its water covers the point too (it is asked first), else none.
    const above = GALA_TELEMONIA_STREAM;
    return courseDistance(above, x, z, above.maxHalf) < courseSample(above, x, z).half ? surface : null;
  };
  let movedOffMouth = 0, keptOnMouth = 0;
  /**
   * A thing as laid, or moved square off the mouth's line to `clear` metres past its widest water, on its own
   * side. Never dropped: every batch draws its turns and tints item by item from the same stream, so one thing
   * fewer would re-tint every batch after it. One that cannot be moved onto Gala stays where it was and is counted.
   */
  const offTheMouth = (item, clear) => {
    const reach = MOUTH.maxHalf + clear;
    if (!nearMouth(item.x, item.z, reach)) return item;
    const s = courseSample(MOUTH, item.x, item.z), across = (item.x - s.x) * s.nx + (item.z - s.z) * s.nz;
    const to = (across < 0 ? -1 : 1) * reach, x = item.x + s.nx * (to - across), z = item.z + s.nz * (to - across);
    if (!own(x, z) || nearMouth(x, z, reach - .01)) { keptOnMouth++; return item; }
    movedOffMouth++;
    return { ...item, x, z };
  };
  const offMouth = (items, clear) => items.map(item => offTheMouth(item, clear));
  /**
   * Ground in Gala something may grow on: its own hex, not in or on the edge of any water, not on
   * the wash's gravel, and above the tideline. `westBareGround` measures from a centre line and so
   * cannot see the braid threads; `westWaterSurface` can, and both are asked.
   */
  const plantable = (x, z, margin) => own(x, z) && !laidBare(x, z, margin) && laidWater(x, z) === null
    && !galaClear(x, z, margin) && landDistance(x, z) > 1.5;

  // -------------------------------------------------------------------------
  // Water
  // -------------------------------------------------------------------------
  /**
   * Lowland water: warmer and browner-green than the upland becks' grey, because it has come a long
   * way over steppe and plain and is carrying what it picked up. The waves are the western shader's.
   */
  const waterMaterial = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } }, side: THREE.DoubleSide,
    vertexShader: 'varying vec3 p; void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform float time; varying vec3 p; void main(){float w=sin(p.x*.38-time*1.3+p.z*1.05)*sin(p.x*.16+p.z*1.25);vec3 c=vec3(.27,.36,.31)+vec3(.14,.15,.12)*pow(max(w,0.),8.);gl_FragColor=vec4(c,1.);}',
  });
  /** A ribbon over a line of samples, broken wherever the ground rises through it (`westWaterSurface` decides). */
  function* ribbon(samples, name, halfOf = sample => sample.half) {
    const widthAt = typeof halfOf === 'number' ? () => halfOf : halfOf;
    let run = [];
    const flush = () => {
      if (run.length < 2) { run = []; return; }
      const vertices = [], indices = [];
      run.forEach((sample, index) => {
        const half = widthAt(sample);
        vertices.push(sample.x - sample.nx * half, sample.y, sample.z - sample.nz * half, sample.x + sample.nx * half, sample.y, sample.z + sample.nz * half);
        if (index) { const v = index * 2; indices.push(v - 2, v, v - 1, v - 1, v, v + 1); }
      });
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
      const sheet = new THREE.Mesh(geometry, waterMaterial);
      sheet.name = name; group.add(sheet); metrics.water++;
      run = [];
    };
    for (const sample of samples) { if (++buildWork % 32 === 0) yield;
      const y = westWaterSurface(sample.x, sample.z);
      if (y === null) { flush(); continue; }
      run.push({ ...sample, y });
    }
    flush();
  }
  for (const course of GALA_RIVERS) { if (++buildWork % 32 === 0) yield; (yield* ribbon(WEST_PROFILES.get(course.id), course.name)); }
  const MOUTHS = WEST_BRAIDS.find(braid => braid.id === 'gala-mouths');
  const threads = [1, -1].map(side => WEST_PROFILES.get(MOUTHS.course.id).map(sample => {
    const offset = braidThreadOffset(MOUTHS, sample.along);
    return offset === null ? null : { x: sample.x + sample.nx * offset * side, z: sample.z + sample.nz * offset * side, nx: sample.nx, nz: sample.nz };
  }).filter(Boolean));
  yield* forEachBuild(threads, function* (thread, index) { return (yield* ribbon(thread, `${MOUTHS.course.name} thread ${index + 1}`, MOUTHS.half)); });

  /**
   * The Oveth below its ford is a wall, as every deep western river is: laid along the water at its
   * own width, and dense enough that there is no gap a traveler walks out through. Its ford is the
   * rocky head of the reach, where nothing is laid.
   */
  for (const sample of WEST_PROFILES.get(OVETH_REACH.id)) { if (++buildWork % 32 === 0) yield;
    if (sample.ford) continue;
    const step = Math.max(1, Math.round(sample.half / 3.2)), radius = sample.half / (step + .5) + 1.4;
    for (let k = -step; k <= step; k++) { if (++buildWork % 32 === 0) yield;
      const offset = sample.half * (k / (step + .5));
      colliders.push({ x: sample.x + sample.nx * offset, z: sample.z + sample.nz * offset, r: radius, kind: 'west-deep-water' });
      metrics.blockers++;
    }
  }

  // -------------------------------------------------------------------------
  // Stone, gravel and sand
  // -------------------------------------------------------------------------
  const stoneMaterial = material('#ffffff', { flatShading: true });
  function* stoneBatch(spots, name, tint, lift = .12) {
    if (!spots.length) return;
    const batch = new THREE.InstancedMesh(round, stoneMaterial, spots.length);
    yield* forEachBuild(spots, function* (spot, index) {
      dummy.position.set(spot.x, gy(spot.x, spot.z) + spot.s * lift, spot.z);
      dummy.rotation.set(range(-.14, .14), spot.rot, range(-.14, .14));
      dummy.scale.set(spot.s, spot.s * (spot.flat ?? range(.25, .45)), spot.s * range(.7, 1.25)); dummy.updateMatrix();
      batch.setMatrixAt(index, dummy.matrix); batch.setColorAt(index, tint(spot));
    });
    batch.name = name; batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch);
  }
  /**
   * The wash: grey gravel over its whole floor, cobbles where the floods leave them, and a few
   * boulders lodged in the banks. It is the one place on the steppe where the ground shows what it
   * is made of.
   */
  const washGravel = [], washStones = [];
  {
    const W = GALA_WASH;
    for (let i = 1; i < W.points.length; i++) { if (++buildWork % 32 === 0) yield;
      const a = W.points[i - 1], b = W.points[i], length = Math.hypot(b.x - a.x, b.z - a.z), nx = -(b.z - a.z) / length, nz = (b.x - a.x) / length;
      for (let d = 0; d < length; d += 1.1) { if (++buildWork % 32 === 0) yield; for (let k = 0; k < 3; k++) { if (++buildWork % 32 === 0) yield;
        const t = d / length, across = range(-W.floor - .6, W.floor + .6);
        const x = a.x + (b.x - a.x) * t + nx * across, z = a.z + (b.z - a.z) * t + nz * across;
        if (!own(x, z) || !onWashFloor(x, z, .6)) continue;
        washGravel.push({ x, z, s: range(.12, .42), rot: random() * 6.28 });
      } }
      for (let d = 0; d < length; d += 6) { if (++buildWork % 32 === 0) yield;
        const t = d / length, side = random() < .5 ? -1 : 1, across = side * range(W.floor * .6, W.bank * .9);
        const x = a.x + (b.x - a.x) * t + nx * across, z = a.z + (b.z - a.z) * t + nz * across;
        if (!own(x, z) || !washPlace(x, z)) continue;
        washStones.push({ x, z, s: range(.35, .95), rot: random() * 6.28, flat: range(.45, .7) });
      }
    }
  }
  (yield* stoneBatch(washGravel, 'Gala wash gravel', () => color.set('#8d887b').offsetHSL(0, range(-.03, .03), range(-.06, .06)), .08));
  (yield* stoneBatch(washStones, 'Gala wash cobbles', () => color.set('#7e786b').offsetHSL(0, range(-.03, .03), range(-.05, .05)), .2));
  metrics.gravel += washGravel.length; metrics.stones += washStones.length;

  /**
   * The Oveth's ford is rock: "below the Sorten it narrows, drops through a rocky lower section".
   * Stone in the shallows and on both banks over the ford, and gravel along the Caelin,
   * which runs over the same stuff off the same margin.
   */
  const fordRock = [], streamGravel = [];
  for (const sample of WEST_PROFILES.get(OVETH_REACH.id)) { if (++buildWork % 32 === 0) yield;
    if (!sample.ford) continue;
    for (let i = 0; i < 4; i++) { if (++buildWork % 32 === 0) yield;
      const side = random() < .5 ? -1 : 1, offset = range(0, sample.half + 3.5);
      const x = sample.x + sample.nx * offset * side, z = sample.z + sample.nz * offset * side;
      if (!own(x, z)) continue;
      fordRock.push({ x, z, s: range(.25, .8), rot: random() * 6.28, flat: range(.35, .6) });
    }
  }
  for (const sample of WEST_PROFILES.get(GALA_DESERT_STREAM.id)) { if (++buildWork % 32 === 0) yield;
    for (let i = 0; i < 3; i++) { if (++buildWork % 32 === 0) yield;
      const side = random() < .5 ? -1 : 1, offset = range(0, sample.half + 2.5);
      const x = sample.x + sample.nx * offset * side, z = sample.z + sample.nz * offset * side;
      if (!own(x, z)) continue;
      streamGravel.push({ x, z, s: range(.15, .5), rot: random() * 6.28 });
    }
  }
  (yield* stoneBatch(fordRock, 'Oveth ford rock', () => color.set('#77716a').offsetHSL(0, range(-.03, .03), range(-.05, .05)), .16));
  (yield* stoneBatch(streamGravel, 'Desert stream gravel', () => color.set('#948c7a').offsetHSL(0, range(-.03, .03), range(-.05, .05)), .08));
  metrics.stones += fordRock.length; metrics.gravel += streamGravel.length;

  // -------------------------------------------------------------------------
  // Reed and sedge
  // -------------------------------------------------------------------------
  const reedGeometry = (() => {
    const positions = [], normals = [];
    for (let blade = 0; blade < 6; blade++) {
      const a = blade * 1.05, lean = .10 + blade % 3 * .05;
      const bx = Math.cos(a) * .06, bz = Math.sin(a) * .06, w = .02, h = .8 + (blade % 3) * .35;
      const cx = Math.cos(a + Math.PI / 2) * w, cz = Math.sin(a + Math.PI / 2) * w;
      positions.push(bx - cx, 0, bz - cz, bx + cx, 0, bz + cz, bx + Math.cos(a) * lean, h, bz + Math.sin(a) * lean);
      for (let i = 0; i < 3; i++) normals.push(0, 1, 0);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    return geometry;
  })();
  const bladeMaterial = material('#ffffff', { side: THREE.DoubleSide });
  function* reedBatch(spots, name) {
    if (!spots.length) return;
    const batch = new THREE.InstancedMesh(reedGeometry, bladeMaterial, spots.length);
    yield* forEachBuild(spots, function* (spot, index) {
      dummy.position.set(spot.x, gy(spot.x, spot.z) + .02, spot.z);
      dummy.rotation.set(0, spot.rot, 0); dummy.scale.set(spot.s, spot.s * range(.85, 1.35), spot.s); dummy.updateMatrix();
      batch.setMatrixAt(index, dummy.matrix);
      batch.setColorAt(index, color.setHSL(range(.13, .21), range(.22, .38), range(.30, .46)));
    });
    batch.name = name; batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch);
    metrics.reeds += spots.length;
  }
  /** Reed along a course, on Gala's side, dry-footed: the water's edge and a pace or two back from it. */
  function* waterline(samples, every, perSide, reach, out, size) {
    for (const sample of samples) { if (++buildWork % 32 === 0) yield;
      if (sample.index % every) continue;
      for (const side of [-1, 1]) { if (++buildWork % 32 === 0) yield; for (let i = 0; i < perSide; i++) { if (++buildWork % 32 === 0) yield;
        const offset = sample.half + range(.2, reach);
        const x = sample.x + sample.nx * offset * side, z = sample.z + sample.nz * offset * side;
        if (!own(x, z) || laidWater(x, z) !== null || landDistance(x, z) < 1) continue;
        out.push({ x, z, s: range(size[0], size[1]), rot: random() * 6.28 });
      } }
    }
  }
  const reeds = [];
  // The Lizeem's western bank, the whole of Gala's side of it: the reed bank.
  (yield* waterline(WEST_PROFILES.get(LIZEEM.id), 1, 3, 6, reeds, [1.1, 1.9]));
  (yield* waterline(WEST_PROFILES.get(LIZEEM_REACH.id), 1, 4, 7, reeds, [1.1, 2]));
  // The plain's own water: thick on the distributary and its braids, thinner up the Caelin and the Treloss.
  (yield* waterline(WEST_PROFILES.get(GALA_CHANNEL.id), 1, 2, 3.2, reeds, [.9, 1.7]));
  yield* forEachBuild(threads, function* (thread) { return yield* forEachBuild(thread, function* (point, index) {
    if (index % 2) return;
    for (let i = 0; i < 2; i++) { if (++buildWork % 32 === 0) yield;
      const side = random() < .5 ? -1 : 1, offset = MOUTHS.half + range(.2, 2.5);
      const x = point.x + point.nx * offset * side, z = point.z + point.nz * offset * side;
      if (!own(x, z) || laidWater(x, z) !== null || landDistance(x, z) < 1) continue;
      reeds.push({ x, z, s: range(.9, 1.7), rot: random() * 6.28 });
    }
  }); });
  (yield* waterline(WEST_PROFILES.get(GALA_TELEMONIA_STREAM.id), 2, 1, 2, reeds, [.6, 1.2]));
  (yield* waterline(WEST_PROFILES.get(OVETH_REACH.id), 2, 1, 2.4, reeds, [.7, 1.4]));
  (yield* reedBatch(offMouth(reeds, .3), 'Gala reed and sedge'));

  /**
   * Sand on the braid bars and at the mouths, as on the Flats and in Eer: what a slow river drops on
   * a plain is sand, and at a coast it is pale.
   */
  const sand = [];
  for (const sample of WEST_PROFILES.get(GALA_CHANNEL.id)) { if (++buildWork % 32 === 0) yield;
    const offset = braidThreadOffset(MOUTHS, sample.along);
    if (offset === null) continue;
    for (let i = 0; i < 6; i++) { if (++buildWork % 32 === 0) yield;
      const side = random() < .5 ? -1 : 1, out = range(sample.half + .4, offset + MOUTHS.half + 5);
      const x = sample.x + sample.nx * out * side, z = sample.z + sample.nz * out * side;
      if (!own(x, z) || laidWater(x, z) !== null) continue;
      sand.push({ x, z, s: range(.3, .9), rot: random() * 6.28, flat: range(.15, .25) });
    }
  }
  (yield* stoneBatch(offMouth(sand, .4), 'Gala mouth sand', () => color.set('#b9a983').offsetHSL(0, range(-.04, .04), range(-.04, .04)), .03));
  metrics.sand += sand.length;

  // -------------------------------------------------------------------------
  // What grows
  // -------------------------------------------------------------------------
  const trunkGeometry = new THREE.CylinderGeometry(.16, .28, 1, 6);
  const crownGeometry = new THREE.IcosahedronGeometry(1, 0);
  const barkMaterial = material('#6e5c46'), leafMaterial = material('#ffffff', { flatShading: true });
  /** Trunks and three crown lobes each, as the west's trees are drawn; `kind` tags the collider. */
  function* treeBatch(trees, name, tint, kind) {
    if (!trees.length) return;
    const trunks = new THREE.InstancedMesh(trunkGeometry, barkMaterial, trees.length);
    const crowns = new THREE.InstancedMesh(crownGeometry, leafMaterial, trees.length * 3);
    let at = 0;
    yield* forEachBuild(trees, function* (tree, index) {
      const y = gy(tree.x, tree.z), height = tree.h * tree.s;
      dummy.position.set(tree.x, y + height * tree.bole * .5, tree.z); dummy.rotation.set(range(-.05, .05), tree.rot, range(-.05, .05));
      dummy.scale.set(tree.s * tree.girth, height * tree.bole, tree.s * tree.girth); dummy.updateMatrix();
      trunks.setMatrixAt(index, dummy.matrix);
      const parts = [{mesh:trunks,index}], collider = { x: tree.x, z: tree.z, r: .42 * tree.s * tree.girth, kind }; colliders.push(collider);
      for (let lobe = 0; lobe < 3; lobe++) { if (++buildWork % 32 === 0) yield;
        const a = tree.rot + lobe * 2.1, spread = lobe === 2 ? 0 : height * tree.spread;
        dummy.position.set(tree.x + Math.sin(a) * spread, y + height * (lobe === 2 ? tree.top : tree.top - .16), tree.z + Math.cos(a) * spread);
        dummy.rotation.set(range(-.2, .2), a, range(-.18, .18));
        dummy.scale.set(height * tree.wide, height * tree.deep, height * tree.wide); dummy.updateMatrix();
        parts.push({mesh:crowns,index:at});
        crowns.setMatrixAt(at, dummy.matrix); crowns.setColorAt(at++, tint(tree));
      }
      pendingTrees.push({ tree: {id:worldTreeId(kind,tree.x,tree.z),x:tree.x,z:tree.z,y,height,species:name.includes('tamarisk')?'tamarisk':tree.fig?'fig':'olive'}, parts, collider });
    });
    trunks.name = `${name} trunks`; crowns.name = `${name} crowns`;
    for (const batch of [trunks, crowns]) { if (++buildWork % 32 === 0) yield; batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch); }
    metrics.trees += trees.length;
  }
  /** A low bush of three lobes: wormwood, saltbush, maquis, oleander and thrift are all this shape, at different sizes. */
  function* bushBatch(bushes, name, tint, collide = null) {
    if (!bushes.length) return;
    const batch = new THREE.InstancedMesh(round, leafMaterial, bushes.length * 3);
    let at = 0;
    for (const bush of bushes) { if (++buildWork % 32 === 0) yield;
      const y = gy(bush.x, bush.z);
      for (let lobe = 0; lobe < 3; lobe++) { if (++buildWork % 32 === 0) yield;
        const a = bush.rot + lobe * 2.1, spread = lobe === 2 ? 0 : .42 * bush.s;
        dummy.position.set(bush.x + Math.sin(a) * spread, y + bush.s * bush.h * (lobe === 2 ? .62 : .42), bush.z + Math.cos(a) * spread);
        dummy.rotation.set(range(-.16, .16), a, range(-.16, .16));
        dummy.scale.set(bush.s * .7, bush.s * bush.h * .5, bush.s * .66); dummy.updateMatrix();
        batch.setMatrixAt(at, dummy.matrix); batch.setColorAt(at++, tint(bush));
      }
      if (collide) colliders.push({ x: bush.x, z: bush.z, r: collide * bush.s, kind: 'gala-scrub' });
    }
    batch.name = name; batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch);
  }
  /** Flowers, as small bright points on a bush: the oleander's pink and the thrift's. */
  function* bloomBatch(bushes, name, tint, per) {
    if (!bushes.length) return;
    const batch = new THREE.InstancedMesh(round, leafMaterial, bushes.length * per);
    let at = 0;
    for (const bush of bushes) { if (++buildWork % 32 === 0) yield;
      const y = gy(bush.x, bush.z);
      for (let k = 0; k < per; k++) { if (++buildWork % 32 === 0) yield;
        const a = random() * 6.28, r = range(.1, .55) * bush.s;
        dummy.position.set(bush.x + Math.sin(a) * r, y + bush.s * bush.h * range(.55, .95), bush.z + Math.cos(a) * r);
        dummy.rotation.set(0, a, 0); dummy.scale.setScalar(bush.s * range(.07, .12)); dummy.updateMatrix();
        batch.setMatrixAt(at, dummy.matrix); batch.setColorAt(at++, tint(bush));
      }
    }
    batch.name = name; batch.computeBoundingSphere(); group.add(batch);
  }
  const tuftGeometry = (() => {
    const positions = [], normals = [];
    for (let blade = 0; blade < 5; blade++) {
      const a = blade * 1.26, bx = Math.cos(a) * .13, bz = Math.sin(a) * .13, w = .05, h = .26 + (blade % 3) * .1;
      const cx = Math.cos(a + Math.PI / 2) * w, cz = Math.sin(a + Math.PI / 2) * w;
      positions.push(bx - cx, 0, bz - cz, bx + cx, 0, bz + cz, bx + Math.cos(a) * .1, h, bz + Math.sin(a) * .1);
      for (let j = 0; j < 3; j++) normals.push(0, 1, 0);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    return geometry;
  })();
  function* tuftBatch(tufts, name, tint) {
    if (!tufts.length) return;
    const batch = new THREE.InstancedMesh(tuftGeometry, bladeMaterial, tufts.length);
    yield* forEachBuild(tufts, function* (tuft, index) {
      dummy.position.set(tuft.x, gy(tuft.x, tuft.z) + .02, tuft.z);
      dummy.rotation.set(0, tuft.rot, 0); dummy.scale.set(tuft.s * tuft.wide, tuft.s, tuft.s * tuft.wide); dummy.updateMatrix();
      batch.setMatrixAt(index, dummy.matrix); batch.setColorAt(index, tint(tuft));
    });
    batch.name = name; batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch);
    metrics.tufts += tufts.length;
  }

  /**
   * **Along the water, tamarisk and oleander** — "thick along every watercourse" in the south, and
   * the one woody thing the north has, where its streams are. Tamarisk is a small feathery tree the
   * grey-green of dust; oleander a shrub the height of a man, dark and leathery, with pink in it.
   * Planted off the water rather than off the hexes, as Caricas's corridor is, because a gallery is
   * a few paces wide and a hex is a hundred metres.
   */
  const tamarisk = [], oleander = [];
  const galleryOf = (course, every, tries, reach, south) => {
    for (const sample of WEST_PROFILES.get(course.id)) {
      if (sample.index % every) continue;
      const warm = galaSouthness(sample.x, sample.z);
      if (warm < south) continue;
      for (let i = 0; i < tries; i++) {
        const side = random() < .5 ? -1 : 1, offset = sample.half + range(3.2, reach);
        const x = sample.x + sample.nx * offset * side, z = sample.z + sample.nz * offset * side;
        if (!plantable(x, z, 2.2)) continue;
        if (random() > .35 + warm * .65) continue;
        const shrub = random() < .45;
        if (shrub) {
          if (oleander.some(b => Math.hypot(b.x - x, b.z - z) < 3.4) || tamarisk.some(t => Math.hypot(t.x - x, t.z - z) < 3.2)) continue;
          oleander.push({ x, z, s: range(1.1, 1.7), h: range(1.2, 1.6), rot: random() * 6.28 });
        } else {
          if (tamarisk.some(t => Math.hypot(t.x - x, t.z - z) < 4.6) || oleander.some(b => Math.hypot(b.x - x, b.z - z) < 3.2)) continue;
          tamarisk.push({ x, z, s: range(.85, 1.2), h: range(4.2, 6), rot: random() * 6.28, girth: .8, bole: .5, top: .86, spread: .15, wide: .30, deep: .30 });
        }
      }
    }
  };
  galleryOf(GALA_CHANNEL, 2, 3, 11, 0);
  galleryOf(GALA_TELEMONIA_STREAM, 3, 2, 8, .35);
  galleryOf(OVETH_REACH, 3, 2, 8, 0);
  galleryOf(GALA_DESERT_STREAM, 3, 2, 7, 0);
  galleryOf(LIZEEM_REACH, 2, 2, 12, 0);
  galleryOf(LIZEEM, 3, 2, 10, 0);
  // The arrays as laid stay as they are: the olives below keep their distance from the tamarisk as laid.
  const oleanderDrawn = offMouth(oleander, 2.2);
  (yield* treeBatch(offMouth(tamarisk, 2.2), 'Gala tamarisk', () => color.set('#8a9577').offsetHSL(range(-.02, .02), range(-.05, .04), range(-.05, .06)), 'gala-tree'));
  (yield* bushBatch(oleanderDrawn, 'Gala oleander', () => color.set('#4d6440').offsetHSL(range(-.02, .02), range(-.04, .05), range(-.04, .05)), .55));
  (yield* bloomBatch(oleanderDrawn, 'Gala oleander flower', () => color.set(random() < .78 ? '#d98aa6' : '#f1e6e8').offsetHSL(0, range(-.05, .05), range(-.05, .05)), 7));
  metrics.tamarisk = tamarisk.length; metrics.oleander = oleander.length;

  /**
   * The open ground, block by block, read off the climate at each point rather than off the hex:
   * the steppe gives way to the Mediterranean over about a hundred metres and nothing draws a line.
   *
   *  - **Tussocks** everywhere, larger, sparser and buff on the steppe with the ground showing
   *    between them, shorter, closer and tawny-olive in the middle, and thin at the sea.
   *  - **Wormwood and saltbush** on the steppe: knee-high, grey and blue-grey, and thickest where the
   *    soil is thinnest — on the rises, and round the wash. Nobody walks round a sub-shrub, so they
   *    carry no collider.
   *  - **Maquis** in the middle, "in patches on the stony rises — knee to chest, aromatic, never
   *    closed": only where the relief stands up, and spaced so there is always a way through.
   *  - **Wild olive and fig**, "standing singly, well apart": forty metres between any two.
   *  - **Stones** on the steppe's rises, where the soil gives out.
   *  - **Sea grass and thrift** on the band behind the shore.
   */
  const cells = [...REGION_CELLS.Gala].sort((a, b) => a.z - b.z || a.x - b.x);
  const BLOCK = Math.max(1, Math.round(6 / (WORLD_SCALE * WORLD_SCALE)));
  const tuftsPerHex = Math.round(27 * WORLD_SCALE * WORLD_SCALE);
  const rise = (x, z) => relief(x, z, GALA_SEAM.amp, GALA_SEAM.wave) / GALA_SEAM.amp;   // -1 in a hollow, 1 on a rise
  const standing = [], maquis = [], steppeShrubs = [], stones = [], thrift = [];
  for (let start = 0; start < cells.length; start += BLOCK) { if (++buildWork % 32 === 0) yield;
    const block = cells.slice(start, start + BLOCK), tufts = [];
    for (const cell of block) { if (++buildWork % 32 === 0) yield;
      // Three times the west's usual count: a plain with nothing else on it reads as bare sand
      // without, which is what the first review render showed.
      for (let i = 0; i < tuftsPerHex * 3; i++) { if (++buildWork % 32 === 0) yield;
        const x = cell.x + range(-50, 50), z = cell.z + range(-55, 55);
        if (!plantable(x, z, 1.2)) continue;
        const c = galaClimate(x, z);
        // The steppe's gaps are the point of it: bunch grass in big tussocks with the bare ground
        // showing between them, where the Mediterranean grass is shorter and closer.
        if (random() < c.BSh * .38 + c.Csa * .22) continue;
        const coast = 1 - smooth(8, 70, landDistance(x, z));
        tufts.push({ x, z, s: range(.8, 1.6) * (1 + c.BSh * .8 - c.Csa * .15), wide: 1 + c.BSh * .6, rot: random() * 6.28, c, coast });
      }
      for (let i = 0; i < 70; i++) { if (++buildWork % 32 === 0) yield;
        const x = cell.x + range(-50, 50), z = cell.z + range(-55, 55);
        if (!plantable(x, z, 1.5)) continue;
        const c = galaClimate(x, z), lift = rise(x, z);
        if (c.BSh > .15 && random() < c.BSh * (.34 + Math.max(0, lift) * .4)) {
          if (steppeShrubs.some(b => Math.hypot(b.x - x, b.z - z) < 2.6)) continue;
          steppeShrubs.push({ x, z, s: range(.45, .9), h: range(.8, 1.1), rot: random() * 6.28, salt: random() < .42 });
        } else if (c.BSh < .7 && lift > -.05 && random() < (c.Csb + c.Csa * .6) * smooth(-.05, .6, lift) * .95) {
          if (maquis.some(b => Math.hypot(b.x - x, b.z - z) < 3.6)) continue;
          maquis.push({ x, z, s: range(.8, 1.45), h: range(.9, 1.5), rot: random() * 6.28 });
        }
      }
      for (let i = 0; i < 14; i++) { if (++buildWork % 32 === 0) yield;
        const x = cell.x + range(-50, 50), z = cell.z + range(-55, 55);
        if (!plantable(x, z, 5)) continue;
        const c = galaClimate(x, z);
        // Not on the steppe at all: under `BSh` a tree is a thing that stands by water.
        if (c.BSh > .45 || random() > (c.Csb + c.Csa * .7) * .8) continue;
        if (standing.some(t => Math.hypot(t.x - x, t.z - z) < 40)) continue;
        if (tamarisk.some(t => Math.hypot(t.x - x, t.z - z) < 20)) continue;
        const fig = random() < .3;
        standing.push({ x, z, fig, s: range(.9, 1.25), h: fig ? range(4.5, 6) : range(5.5, 7.5), rot: random() * 6.28,
          girth: fig ? 1.05 : 1.2, bole: fig ? .45 : .4, top: fig ? .82 : .8, spread: fig ? .2 : .22, wide: fig ? .34 : .36, deep: fig ? .26 : .24 });
      }
      for (let i = 0; i < 18; i++) { if (++buildWork % 32 === 0) yield;
        const x = cell.x + range(-50, 50), z = cell.z + range(-55, 55);
        if (!plantable(x, z, 1)) continue;
        const c = galaClimate(x, z);
        if (random() > c.BSh * smooth(0, .8, rise(x, z)) * 1.4) continue;
        stones.push({ x, z, s: range(.25, .75), rot: random() * 6.28, flat: range(.35, .6) });
      }
      for (let i = 0; i < 40; i++) { if (++buildWork % 32 === 0) yield;
        const x = cell.x + range(-50, 50), z = cell.z + range(-55, 55);
        const d = landDistance(x, z);
        if (d < 3 || d > 55 || !plantable(x, z, 1)) continue;
        if (random() > 1 - smooth(10, 55, d)) continue;
        thrift.push({ x, z, s: range(.3, .55), h: range(.5, .8), rot: random() * 6.28 });
      }
    }
    (yield* tuftBatch(offMouth(tufts, 1.2), 'Gala grass', tuft => {
      const c = tuft.c;
      const hue = .115 * c.BSh + .15 * c.Csb + .19 * c.Csa + tuft.coast * .03;
      return color.setHSL(hue + range(-.012, .012), .30 * c.BSh + .30 * c.Csb + .32 * c.Csa + range(-.05, .05), .54 * c.BSh + .46 * c.Csb + .42 * c.Csa + range(-.04, .04));
    }));
  }
  // Wild olive is pale, grey and open; fig a broader, brighter, rounder leaf. Hex, not HSL.
  (yield* treeBatch(offMouth(standing, 5), 'Gala olive and fig', tree => tree.fig
    ? color.set('#5f7a45').offsetHSL(range(-.02, .02), range(-.05, .05), range(-.04, .05))
    : color.set('#8e9a72').offsetHSL(range(-.02, .02), range(-.05, .05), range(-.04, .06)), 'gala-tree'));
  (yield* bushBatch(offMouth(steppeShrubs, 1.5), 'Gala wormwood and saltbush', bush => bush.salt
    ? color.set('#8c9690').offsetHSL(range(-.02, .02), range(-.04, .04), range(-.04, .05))
    : color.set('#9a9c86').offsetHSL(range(-.02, .02), range(-.04, .04), range(-.04, .05))));
  (yield* bushBatch(offMouth(maquis, 1.5), 'Gala maquis', () => color.set('#55643f').offsetHSL(range(-.03, .03), range(-.05, .05), range(-.05, .06)), .5));
  (yield* stoneBatch(offMouth(stones, 1), 'Gala steppe stones', () => color.set('#8a8578').offsetHSL(0, range(-.03, .03), range(-.05, .05)), .16));
  const thriftDrawn = offMouth(thrift, 1);
  (yield* bushBatch(thriftDrawn, 'Gala sea grass and thrift', () => color.set('#6f8a5c').offsetHSL(range(-.03, .03), range(-.05, .05), range(-.04, .05))));
  (yield* bloomBatch(thriftDrawn, 'Gala thrift flower', () => color.set('#e3a3bf').offsetHSL(0, range(-.08, .05), range(-.06, .06)), 3));
  metrics.shrubs = steppeShrubs.length; metrics.maquis = maquis.length; metrics.stones += stones.length; metrics.thrift = thrift.length;
  metrics.standing = standing.length;
  metrics.movedOffMouth = movedOffMouth; metrics.keptOnMouth = keptOnMouth;

  // -------------------------------------------------------------------------
  // The Treloss's lower gully, drawn finer
  // -------------------------------------------------------------------------
  /**
   * The ground over the Treloss's mouth and the last of the stream above it, a metre and a half apart, because
   * the world's grid is seven metres apart here and a gully four and a half metres wide is not drawn on it at all
   * (`TRELOSS_GULLY`, src/west-regions.js, has the whole story; `trelossTerrainSink` sinks the grid under this).
   * Drawn from `groundHeight`, which is what is walked, and coloured by `groundTint`, which is what colours the
   * grid, with the same small wobble from vertex to vertex.
   *
   * Every cell within `TRELOSS_PATCH_REACH` of the line is drawn, which is every cell of the world's grid the sink
   * tilts, except the cells Telemonia draws itself: this lattice is Telemonia's own (src/telemonia-scenery.js, the
   * same origin and step), and a cell here is left to Telemonia exactly when Telemonia draws it, by the same test
   * on the same centre, so the two meet along shared vertices, where both stand on `groundHeight`, with no gap and
   * no cell drawn twice.
   *
   * **The outer ring is the world's grid, drawn finer.** Past the sink (`TRELOSS_SINK.none`) the grid is not sunk,
   * and it is drawn under this ground: wherever its seven-metre triangles stood the least bit over the walked ground
   * - a hollow, a fold, a cell only half tilted toward the sink - they came up through this one. Measured on the
   * first build, the grid was the higher surface at a quarter to a half of the points between sixteen metres out and
   * the edge. So out there this ground is never under the grid's own surface (`terrainGrid`, the world's grid lines;
   * `gridGround` is that surface as the grid would draw it without this sink), and over its last seven metres it
   * becomes that surface, height and colour, so at its edge it is the grid it hands over to. What is left is the
   * grid's own folds, a few centimetres, where a cell here straddles one (tests/legemum-world.test.js). Built after everything else here, from no draw of the scatter's
   * stream, so nothing already laid moves.
   */
  {
    const STEP = 1.5, T = TELEMONIA_BOX, G = TRELOSS_GULLY.bounds, R = TRELOSS_PATCH_REACH, { full, none } = TRELOSS_SINK;
    const i0 = Math.floor((G.minX - R - STEP - T.minX) / STEP), i1 = Math.ceil((G.maxX + R + STEP - T.minX) / STEP);
    const j0 = Math.floor((G.minZ - R - STEP - T.minZ) / STEP), j1 = Math.ceil((G.maxZ + R + STEP - T.minZ) / STEP);
    const cols = i1 - i0 + 1, rows = j1 - j0 + 1;
    // The same arithmetic Telemonia's lattice is placed by, so a shared vertex is the same number in both.
    const xOf = i => T.minX + (i0 + i) * STEP, zOf = j => T.minZ + (j0 + j) * STEP;
    const xMid = i => T.minX + (i0 + i + .5) * STEP, zMid = j => T.minZ + (j0 + j + .5) * STEP;
    const telemoniaDraws = (x, z) => inTelemoniaBox(x, z) && borderDepth(x, z) > -TELEMONIA_PATCH_REACH;
    const drawn = [], used = new Int32Array(cols * rows).fill(-1), seam = new Uint8Array(cols * rows);
    for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) { if (++buildWork % 32 === 0) yield;
      const x = xMid(i), z = zMid(j), corners = [j * cols + i, j * cols + i + 1, (j + 1) * cols + i, (j + 1) * cols + i + 1];
      if (trelossGullyDistance(x, z, R) >= R) continue;
      if (telemoniaDraws(x, z)) { for (const k of corners) seam[k] = 1; continue; }
      drawn.push(j * cols + i);
      for (const k of corners) used[k] = 0;
    }
    /**
     * The world's grid as it would be drawn here without this sink, height and colour: its own cells, split as it
     * splits them, with Telemonia's sink, which is the only other one out here (src/world.js sums them).
     */
    const grid = kit.terrainGrid ?? null, corner = new Map(), tint = new THREE.Color();
    const below = (axis, v) => { let low = 0, high = axis.length - 1; while (high - low > 1) { const mid = (low + high) >> 1; if (axis[mid] <= v) low = mid; else high = mid; } return low; };
    const cornerAt = (i, j) => {
      const key = i * 65536 + j;
      let c = corner.get(key);
      if (!c) { const x = grid.xs[i], z = grid.zs[j]; groundTint(tint, x, z, THREE); c = [gy(x, z) - telemoniaTerrainSink(x, z), tint.r, tint.g, tint.b]; corner.set(key, c); }
      return c;
    };
    const gridGround = (x, z, out) => {
      const { xs, zs } = grid, i = below(xs, x), j = below(zs, z), u = (x - xs[i]) / (xs[i + 1] - xs[i]), v = (z - zs[j]) / (zs[j + 1] - zs[j]);
      const [a, b, c, wb, wc] = u + v <= 1 ? [cornerAt(i, j), cornerAt(i + 1, j), cornerAt(i, j + 1), u, v]
        : [cornerAt(i + 1, j + 1), cornerAt(i, j + 1), cornerAt(i + 1, j), 1 - u, 1 - v];
      for (let n = 0; n < 4; n++) out[n] = a[n] + (b[n] - a[n]) * wb + (c[n] - a[n]) * wc;
      return out;
    };
    const positions = [], colours = [], shade = new THREE.Color(), unsunk = [0, 0, 0, 0];
    let jitter = 4731907;
    const wobble = () => { jitter = (Math.imul(jitter, 1664525) + 1013904223) >>> 0; return .955 + jitter / 4294967296 * .09; };
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { if (++buildWork % 32 === 0) yield;
      const k = j * cols + i;
      if (used[k] < 0) continue;
      const x = xOf(i), z = zOf(j);
      let y = gy(x, z);
      groundTint(shade, x, z, THREE); shade.multiplyScalar(wobble());
      // Where a vertex is Telemonia's too, it is that country's: on the walked ground.
      if (grid && !seam[k]) {
        const d = trelossGullyDistance(x, z, R + 2), ring = smooth(full, none, d), edge = smooth(R - 8, R - 1.1, d);
        gridGround(x, z, unsunk);
        y += ring * Math.max(0, unsunk[0] - y);
        // A grid cell tilted down under Telemonia's own ground is no surface to meet; Telemonia draws over it.
        if (unsunk[0] > y - 1) y += edge * (unsunk[0] - y);
        shade.r += (unsunk[1] - shade.r) * edge; shade.g += (unsunk[2] - shade.g) * edge; shade.b += (unsunk[3] - shade.b) * edge;
      }
      used[k] = positions.length / 3;
      positions.push(x, y, z);
      colours.push(shade.r, shade.g, shade.b);
    }
    // Each cell split as Telemonia's and the world's grid split theirs.
    const indices = [];
    for (const k of drawn) indices.push(used[k], used[k + cols], used[k + 1], used[k + 1], used[k + cols], used[k + cols + 1]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
    const ground = new THREE.Mesh(geometry, material('#ffffff', { vertexColors: true, flatShading: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    ground.name = 'Treloss ground'; ground.receiveShadow = true; group.add(ground);
    metrics.trelossGround = positions.length / 3;
    // Retain the emitted Float32 triangles: trees and ground animals must use
    // this surface where the coarse grid was deliberately sunk underneath it.
    const drawnCells = new Set(drawn), p = geometry.attributes.position;
    fineGroundHeight = (x, z) => {
      let i = Math.floor((x - T.minX) / STEP) - i0, j = Math.floor((z - T.minZ) / STEP) - j0;
      if (x < Math.fround(xOf(i))) i--; else if (x >= Math.fround(xOf(i + 1))) i++;
      if (z < Math.fround(zOf(j))) j--; else if (z >= Math.fround(zOf(j + 1))) j++;
      if (i < 0 || j < 0 || i >= cols - 1 || j >= rows - 1 || !drawnCells.has(j * cols + i)) return null;
      const k = j * cols + i, a = used[k], b = used[k + cols], c = used[k + 1], d = used[k + cols + 1];
      const u = (x - p.getX(a)) / (p.getX(c) - p.getX(a)), v = (z - p.getZ(a)) / (p.getZ(b) - p.getZ(a));
      return u + v <= 1 ? p.getY(a) + (p.getY(c) - p.getY(a)) * u + (p.getY(b) - p.getY(a)) * v
        : p.getY(d) + (p.getY(b) - p.getY(d)) * (1 - u) + (p.getY(c) - p.getY(d)) * (1 - v);
    };
  }

  // The fine gully is authored after the scatter. Seat the completed trees
  // now without rerolling any placement, colour, or saved coordinate identity.
  const treeMatrix = new THREE.Matrix4(), changed = new Set();
  yield* forEachBuild(pendingTrees, function* ({ tree, parts, collider }) {
    parts[0].mesh.getMatrixAt(parts[0].index, treeMatrix);
    const offset = treeGroundingOffset(treeMatrix, treeGroundAt, { radius: .28, segments: 6 });
    tree.y = treeMatrix.elements[13] - treeMatrix.elements[5] * .5 + offset;
    for (const { mesh, index } of parts) {
      mesh.getMatrixAt(index, treeMatrix); treeMatrix.elements[13] += offset;
      mesh.setMatrixAt(index, treeMatrix); changed.add(mesh);
    }
    registerWorldTree(colliders, tree, parts, collider);
  });
  for (const mesh of changed) { mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); }

  return {
    group, metrics, fineGroundHeight,
    update(time) { waterMaterial.uniforms.time.value = time; },
  };
}
