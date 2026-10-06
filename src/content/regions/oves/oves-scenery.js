import { forEachBuild } from '../../../world/loading/build-each.js';
import { finishBuild } from '../../../world/loading/build-steps.js';
import * as THREE from 'three';
import { registerWorldTree, worldTreeId } from '../../../world/scenery/tree-registry.js';
import { treeGroundingOffset } from '../../../world/scenery/tree-grounding.js';
import { hexOwnerAt, REGION_CELLS, relief } from '../../../world/terrain/region-world.js';
import { WORLD_SCALE } from '../../../world/terrain/world-scale.js';
import { OVETH_UPPER, OVES_BORDER_STREAM, OVES_RIVERS, westBareGround } from '../western-regions/west-regions.js';
import { WEST_PROFILES, westWaterSurface } from '../western-regions/west-ground.js';
import {
  OVES_CHANNELS, OVES_DAMP, OVETH_WALL, channelPlace, onChannelFloor,
  onSorten, ovesClear, ovesLie, onRim, dampReach, ovesosShare,
} from './oves-world.js';

/**
 * What Ovesos and the Oves Desert look like where the ground alone is not enough: the Oveth's one
 * green ribbon, the gravel of four dry channels, and two faces of the same hot steppe.
 *
 * **The whole of this file is a statement about terrain and water, not about weather.** Both
 * countries read `BSh` on every hex the atlas gives them, so nothing here reads a climate gradient
 * the way `gala-scenery.js` does — there is none to read. What changes across this ground is what the
 * ground is made of and how near the water is:
 *
 *  - **Ovesos's north** (the atlas's eight `grassland` hexes): bunch grass in big tussocks with the
 *    bare earth showing between them — the cover is about two parts in three and the gaps are the
 *    point — buff for eleven months of the year.
 *  - **Ovesos's south** (the eleven `plains` hexes): the same grass thinner and shorter, with grey
 *    wormwood and blue-grey saltbush wherever it gives out, and stones on the rises.
 *  - **The Sorten**, and only the Sorten: the bench beside the Oveth, where the grass is greener,
 *    closer and taller because the river put the soil there.
 *  - **The Oveth's gallery**, and only along the water: poplar, willow and tamarisk two trees deep,
 *    dense and dark. On a steppe a river is visible from a mile off because it is the only thing with
 *    a tree on it, and that is this country's one long view.
 *  - **The Oves Desert**: perennial scrub half the size of Ovesos's and spaced twice as wide, only
 *    where the soil has gathered; bare gravel pavement wherever the rock is up (`ovesLie`), and on
 *    the rim hills' tops; a stubble of dead annual seed-heads in the pockets, which is the wet-year
 *    flush as a dry year leaves it; coarse gravel and boulders on the channel floors; and the damp
 *    reach, a hundred paces of green in a country with none.
 *
 * **No dune and no sand anywhere.** The lore is explicit — "the terrain is rocky rather than sandy" —
 * and the map codes the country `BSh`, hot steppe, in a vocabulary that has `BWh` for true desert and
 * does not use it here. The one thing the dry year does not have is the annual cover; when the game
 * has seasons, the stubble is where it comes up.
 *
 * Nothing here is anybody's: no field, no channel with a straight side, no well, no watering point,
 * no cairn on a route. Everything is placed on these two countries' own hexes (`hexOwnerAt`), from
 * one seeded stream of its own drawn after Gala's, so nothing already built anywhere else moves by a
 * centimetre for it.
 */
export function createOvesScenery(...args) { return finishBuild(createOvesScenerySteps(...args)); }

export function* createOvesScenerySteps(kit) {
  let buildWork = 0;
  const { root, material, groundHeight, colliders, dummy, color, round } = kit;
  const group = new THREE.Group(); group.name = 'Oves scenery'; root.add(group);
  let seed = 5170933;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a, b) => a + random() * (b - a);
  const smooth = (a, b, x) => { const v = Math.max(0, Math.min(1, (x - a) / (b - a))); return v * v * (3 - 2 * v); };
  const metrics = { water: 0, blockers: 0, reeds: 0, gravel: 0, boulders: 0, pavement: 0, stones: 0, tufts: 0, shrubs: 0, scrub: 0, stubble: 0, trees: 0, tamarisk: 0 };
  const gy = (x, z) => groundHeight(x, z);
  const treeGroundAt = kit.renderedGroundHeight ?? gy;
  const OWN = new Set(['Ovesos', 'Oves Desert']);
  const own = (x, z) => OWN.has(hexOwnerAt(x, z));
  const inDesert = (x, z) => hexOwnerAt(x, z) === 'Oves Desert';
  /** Ground something may grow on: one of these two countries' hexes, out of the water and off a channel floor. */
  const plantable = (x, z, margin) => own(x, z) && !westBareGround(x, z, margin) && westWaterSurface(x, z) === null && !ovesClear(x, z, margin);

  // -------------------------------------------------------------------------
  // The water, and there are only two pieces of it
  // -------------------------------------------------------------------------
  /**
   * The same lowland water as Gala's one border on: warm and brown-green, because it has come a long
   * way over steppe and is carrying what it picked up. The waves are the western shader's.
   */
  const waterMaterial = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } }, side: THREE.DoubleSide,
    vertexShader: 'varying vec3 p; void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform float time; varying vec3 p; void main(){float w=sin(p.x*.40-time*1.35+p.z*1.08)*sin(p.x*.17+p.z*1.22);vec3 c=vec3(.28,.35,.30)+vec3(.15,.15,.12)*pow(max(w,0.),8.);gl_FragColor=vec4(c,1.);}',
  });
  /** A ribbon over a line of samples, broken wherever the ground rises through it. */
  function* ribbon(samples, name) {
    let run = [];
    const flush = () => {
      if (run.length < 2) { run = []; return; }
      const vertices = [], indices = [];
      run.forEach((sample, index) => {
        vertices.push(sample.x - sample.nx * sample.half, sample.y, sample.z - sample.nz * sample.half,
          sample.x + sample.nx * sample.half, sample.y, sample.z + sample.nz * sample.half);
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
  for (const course of OVES_RIVERS) { if (++buildWork % 32 === 0) yield; (yield* ribbon(WEST_PROFILES.get(course.id), course.name)); }

  /**
   * **The Oveth through the Sorten is a wall**, as every deep western river is: laid along the water
   * at its own width, dense enough that there is no gap a traveler walks out through. Its ford is its
   * upper third, above the Sorten, where the atlas draws it `small` and where nothing is laid; below
   * the Sorten, Gala's reach is waded over rock again, which is the lore's "narrows, drops through a
   * rocky lower section". So the wall is the middle of the river and the crossings are its two ends.
   *
   * The Caelin carries none: it is waded anywhere, and the desert's only two edges
   * with Gala are Gala's reach of it. And the wall gives out `OVETH_WALL.to` of the way down rather
   * than at the mouth: the last twenty-five metres narrow over the rock Gala's own ford is on, so the
   * two builders' fords meet at the three-country corner instead of a wall meeting a ford there.
   */
  for (const sample of WEST_PROFILES.get(OVETH_UPPER.id)) { if (++buildWork % 32 === 0) yield;
    if (sample.ford || sample.along > OVETH_WALL.to) continue;
    const step = Math.max(1, Math.round(sample.half / 3.2)), radius = sample.half / (step + .5) + 1.4;
    for (let k = -step; k <= step; k++) { if (++buildWork % 32 === 0) yield;
      const offset = sample.half * (k / (step + .5));
      colliders.push({ x: sample.x + sample.nx * offset, z: sample.z + sample.nz * offset, r: radius, kind: 'west-deep-water' });
      metrics.blockers++;
    }
  }

  // -------------------------------------------------------------------------
  // Stone: the channels' floors, the rock pavement, and the rises
  // -------------------------------------------------------------------------
  const stoneMaterial = material('#ffffff', { flatShading: true });
  function* stoneBatch(spots, name, tint, lift = .12) {
    if (!spots.length) return;
    const batch = new THREE.InstancedMesh(round, stoneMaterial, spots.length);
    yield* forEachBuild(spots, function* (spot, index) {
      dummy.position.set(spot.x, gy(spot.x, spot.z) + spot.s * lift, spot.z);
      dummy.rotation.set(range(-.16, .16), spot.rot, range(-.16, .16));
      dummy.scale.set(spot.s, spot.s * (spot.flat ?? range(.25, .45)), spot.s * range(.7, 1.25)); dummy.updateMatrix();
      batch.setMatrixAt(index, dummy.matrix); batch.setColorAt(index, tint(spot));
    });
    batch.name = name; batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch);
  }

  /**
   * The channels: coarse gravel over the whole floor and boulders lodged in the banks and the bed.
   * "Covered in a thin, poor soil that accumulates in the lower-gradient sections and is absent on
   * the ridge exposures" — a channel floor is where the coarse stuff ends up when the water that
   * moved it has gone, and these have been dry for years.
   */
  const channelGravel = [], channelBoulders = [];
  for (const ch of OVES_CHANNELS) { if (++buildWork % 32 === 0) yield;
    for (let i = 1; i < ch.points.length; i++) { if (++buildWork % 32 === 0) yield;
      const a = ch.points[i - 1], b = ch.points[i], length = Math.hypot(b.x - a.x, b.z - a.z);
      const nx = -(b.z - a.z) / length, nz = (b.x - a.x) / length;
      for (let d = 0; d < length; d += 1.1) { if (++buildWork % 32 === 0) yield; for (let k = 0; k < 3; k++) { if (++buildWork % 32 === 0) yield;
        const t = d / length, across = range(-ch.floor - .8, ch.floor + .8);
        const x = a.x + (b.x - a.x) * t + nx * across, z = a.z + (b.z - a.z) * t + nz * across;
        if (!own(x, z) || !onChannelFloor(x, z, .8)) continue;
        channelGravel.push({ x, z, s: range(.14, .48), rot: random() * 6.28 });
      } }
      // Boulders: bigger than a step and a reason to look where you are going, in the bed and on the cuts.
      for (let d = 0; d < length; d += 5) { if (++buildWork % 32 === 0) yield;
        const t = d / length, side = random() < .5 ? -1 : 1, across = side * range(0, ch.bank * .92);
        const x = a.x + (b.x - a.x) * t + nx * across, z = a.z + (b.z - a.z) * t + nz * across;
        if (!own(x, z) || !channelPlace(ch, x, z)) continue;
        channelBoulders.push({ x, z, s: range(.4, 1.15), rot: random() * 6.28, flat: range(.45, .8) });
      }
    }
  }
  (yield* stoneBatch(channelGravel, 'Oves channel gravel', () => color.set('#8b8474').offsetHSL(0, range(-.03, .03), range(-.06, .06)), .08));
  (yield* stoneBatch(channelBoulders, 'Oves channel boulders', () => color.set('#7b7466').offsetHSL(0, range(-.03, .03), range(-.05, .05)), .22));
  metrics.gravel += channelGravel.length; metrics.boulders += channelBoulders.length;

  /**
   * The Oveth's bed is gravel too: it is waded along the whole of this reach, and what a small quick
   * steppe river runs over is the stuff it has brought down.
   */
  const fordGravel = [];
  for (const sample of WEST_PROFILES.get(OVETH_UPPER.id)) { if (++buildWork % 32 === 0) yield;
    for (let i = 0; i < 3; i++) { if (++buildWork % 32 === 0) yield;
      const side = random() < .5 ? -1 : 1, offset = range(0, sample.half + 3);
      const x = sample.x + sample.nx * offset * side, z = sample.z + sample.nz * offset * side;
      if (!own(x, z)) continue;
      fordGravel.push({ x, z, s: range(.15, .52), rot: random() * 6.28, flat: range(.3, .55) });
    }
  }
  (yield* stoneBatch(fordGravel, 'Oveth bed gravel', () => color.set('#80796e').offsetHSL(0, range(-.03, .03), range(-.05, .05)), .1));
  metrics.gravel += fordGravel.length;

  // -------------------------------------------------------------------------
  // Reed and sedge: the Oveth's waterline and nowhere else in either country
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
  const reeds = [];
  for (const course of OVES_RIVERS) { if (++buildWork % 32 === 0) yield; for (const sample of WEST_PROFILES.get(course.id)) { if (++buildWork % 32 === 0) yield;
    for (const side of [-1, 1]) { if (++buildWork % 32 === 0) yield; for (let i = 0; i < 3; i++) { if (++buildWork % 32 === 0) yield;
      const offset = sample.half + range(.2, 3.4);
      const x = sample.x + sample.nx * offset * side, z = sample.z + sample.nz * offset * side;
      if (!own(x, z) || westWaterSurface(x, z) !== null) continue;
      reeds.push({ x, z, s: range(.7, 1.5), rot: random() * 6.28 });
    } }
  } }
  (yield* reedBatch(reeds, 'Oves reed and sedge'));

  // -------------------------------------------------------------------------
  // What grows
  // -------------------------------------------------------------------------
  const trunkGeometry = new THREE.CylinderGeometry(.16, .28, 1, 6);
  const crownGeometry = new THREE.IcosahedronGeometry(1, 0);
  const barkMaterial = material('#6d5b44'), leafMaterial = material('#ffffff', { flatShading: true });
  /** Trunks and three crown lobes each, as the west's trees are drawn; `kind` tags the collider. */
  function* treeBatch(trees, name, tint, kind) {
    if (!trees.length) return;
    const trunks = new THREE.InstancedMesh(trunkGeometry, barkMaterial, trees.length);
    const crowns = new THREE.InstancedMesh(crownGeometry, leafMaterial, trees.length * 3);
    let at = 0;
    yield* forEachBuild(trees, function* (tree, index) {
      let y = gy(tree.x, tree.z); const height = tree.h * tree.s;
      dummy.position.set(tree.x, y + height * tree.bole * .5, tree.z); dummy.rotation.set(range(-.05, .05), tree.rot, range(-.05, .05));
      dummy.scale.set(tree.s * tree.girth, height * tree.bole, tree.s * tree.girth); dummy.updateMatrix();
      const grounding = treeGroundingOffset(dummy.matrix, treeGroundAt, { radius: .28, segments: 6 });
      y += grounding; dummy.position.y += grounding; dummy.updateMatrix();
      const footY = dummy.matrix.elements[13] - dummy.matrix.elements[5] * .5;
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
      registerWorldTree(colliders,{id:worldTreeId(kind,tree.x,tree.z),x:tree.x,z:tree.z,y:footY,height,species:name.includes('tamarisk')?'tamarisk':tree.poplar?'white-poplar':'black-willow'},parts,collider);
    });
    trunks.name = `${name} trunks`; crowns.name = `${name} crowns`;
    for (const batch of [trunks, crowns]) { if (++buildWork % 32 === 0) yield; batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch); }
    metrics.trees += trees.length;
  }
  /** A low bush of three lobes: wormwood, saltbush and the desert's perennial scrub are all this shape. */
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
      if (collide) colliders.push({ x: bush.x, z: bush.z, r: collide * bush.s, kind: 'oves-scrub' });
    }
    batch.name = name; batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch);
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
  /** Dead annual seed-heads: a bleached stalk with nothing on it, drawn as a thin pale tuft. */
  function* stubbleBatch(spots, name) {
    if (!spots.length) return;
    const batch = new THREE.InstancedMesh(tuftGeometry, bladeMaterial, spots.length);
    yield* forEachBuild(spots, function* (spot, index) {
      dummy.position.set(spot.x, gy(spot.x, spot.z) + .02, spot.z);
      dummy.rotation.set(0, spot.rot, 0); dummy.scale.set(spot.s * .5, spot.s * 1.5, spot.s * .5); dummy.updateMatrix();
      batch.setMatrixAt(index, dummy.matrix);
      batch.setColorAt(index, color.set('#b2a583').offsetHSL(range(-.015, .015), range(-.06, .04), range(-.05, .06)));
    });
    batch.name = name; batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch);
    metrics.stubble += spots.length;
  }

  /**
   * **The Oveth's gallery**, and it is the whole of the wood in either country. "Along the Oveth on
   * the southern border, and only there, a gallery of poplar, willow and tamarisk, dense, narrow and
   * dark green." Planted off the water rather than off the hexes, the way Caricas's corridor and
   * Gala's tamarisk are, because a gallery is a few paces wide and a hex is a hundred metres — and
   * on the Ovesian bank more thickly than on the desert's, because the bench is where the soil is.
   */
  const gallery = [], tamarisk = [];
  for (const course of OVES_RIVERS) { if (++buildWork % 32 === 0) yield; for (const sample of WEST_PROFILES.get(course.id)) { if (++buildWork % 32 === 0) yield;
    const border = course.id === OVES_BORDER_STREAM.id;
    if (sample.index % (border ? 4 : 2)) continue;
    for (let i = 0; i < (border ? 2 : 4); i++) { if (++buildWork % 32 === 0) yield;
      const side = random() < .5 ? -1 : 1, offset = sample.half + range(2.4, border ? 7 : 12);
      const x = sample.x + sample.nx * offset * side, z = sample.z + sample.nz * offset * side;
      if (!plantable(x, z, 2.2)) continue;
      // Thicker on the bottomland than on the stony bank opposite, and thinnest on the Caelin,
      // which runs off a rain shadow and not out of an upland.
      const soil = border ? .3 : .45 + ovesosShare(x, z) * .5 + (onSorten(x, z) ? .2 : 0);
      if (random() > soil) continue;
      const shrub = random() < .42;
      if (shrub) {
        if (tamarisk.some(t => Math.hypot(t.x - x, t.z - z) < 4.2) || gallery.some(t => Math.hypot(t.x - x, t.z - z) < 4)) continue;
        tamarisk.push({ x, z, s: range(.8, 1.15), h: range(3.8, 5.4), rot: random() * 6.28, girth: .78, bole: .5, top: .86, spread: .15, wide: .30, deep: .30 });
      } else {
        if (gallery.some(t => Math.hypot(t.x - x, t.z - z) < 5.4) || tamarisk.some(t => Math.hypot(t.x - x, t.z - z) < 4)) continue;
        const poplar = random() < .55;
        gallery.push({ x, z, poplar, s: range(.95, 1.3), h: poplar ? range(11, 15) : range(7, 9.5), rot: random() * 6.28,
          girth: poplar ? .8 : 1.15, bole: poplar ? .55 : .42, top: poplar ? .72 : .78, spread: poplar ? .07 : .2,
          wide: poplar ? .17 : .34, deep: poplar ? .5 : .26 });
      }
    }
  } }
  // Poplar is tall, narrow and a brighter green; willow broader, greyer and lower over the water.
  (yield* treeBatch(gallery, 'Oveth gallery', tree => tree.poplar
    ? color.set('#5f7a41').offsetHSL(range(-.02, .02), range(-.05, .05), range(-.04, .06))
    : color.set('#74875a').offsetHSL(range(-.02, .02), range(-.05, .05), range(-.04, .05)), 'oves-tree'));
  (yield* treeBatch(tamarisk, 'Oveth tamarisk', () => color.set('#889274').offsetHSL(range(-.02, .02), range(-.05, .04), range(-.05, .06)), 'oves-tree'));
  metrics.tamarisk = tamarisk.length;

  /**
   * **The damp reach**: two or three tamarisk and a band of green scrub standing in a dry bed, where
   * the gravel holds water below the surface. It is the only green in the Oves and it is the lore's
   * own exception to a country with none — "the channel sections that retain subsurface flow".
   */
  const dampScrub = [], dampTrees = [];
  {
    const ch = OVES_CHANNELS.find(c => c.id === OVES_DAMP.channel);
    for (let i = 1; i < ch.points.length; i++) { if (++buildWork % 32 === 0) yield;
      const a = ch.points[i - 1], b = ch.points[i], length = Math.hypot(b.x - a.x, b.z - a.z);
      const nx = -(b.z - a.z) / length, nz = (b.x - a.x) / length;
      for (let d = 0; d < length; d += .9) { if (++buildWork % 32 === 0) yield;
        const t = d / length;
        for (let k = 0; k < 2; k++) { if (++buildWork % 32 === 0) yield;
          const across = range(-OVES_DAMP.reach, OVES_DAMP.reach);
          const x = a.x + (b.x - a.x) * t + nx * across, z = a.z + (b.z - a.z) * t + nz * across;
          const damp = dampReach(x, z);
          if (damp < .25 || !own(x, z)) continue;
          if (random() > damp * .5) continue;
          if (dampScrub.some(s => Math.hypot(s.x - x, s.z - z) < 1.5)) continue;
          dampScrub.push({ x, z, s: range(.5, 1.0), h: range(.9, 1.3), rot: random() * 6.28 });
        }
        const x = a.x + (b.x - a.x) * t + nx * range(-4, 4), z = a.z + (b.z - a.z) * t + nz * range(-4, 4);
        if (dampReach(x, z) < .6 || !own(x, z) || random() > .06) continue;
        if (dampTrees.some(s => Math.hypot(s.x - x, s.z - z) < 22)) continue;
        dampTrees.push({ x, z, s: range(.85, 1.1), h: range(4, 5.4), rot: random() * 6.28, girth: .78, bole: .5, top: .86, spread: .15, wide: .30, deep: .30 });
      }
    }
  }
  (yield* bushBatch(dampScrub, 'Oves damp-reach scrub', () => color.set('#4f6b3f').offsetHSL(range(-.02, .02), range(-.05, .05), range(-.04, .06)), .42));
  (yield* treeBatch(dampTrees, 'Oves damp-reach tamarisk', () => color.set('#7e8d68').offsetHSL(range(-.02, .02), range(-.05, .04), range(-.04, .06)), 'oves-tree'));
  metrics.tamarisk += dampTrees.length;

  /**
   * The open ground of both countries, block by block over their own hexes. The one thing that decides
   * what a point gets is **which country it is in and what the ground is made of there** — there is no
   * climate to ask, because there is one climate. Ovesos asks the grass; the desert asks the rock
   * (`ovesLie`: 1 on an exposure with no soil, 0 in a pocket where the soil has gathered).
   */
  const cells = [...(REGION_CELLS.Ovesos ?? []), ...(REGION_CELLS['Oves Desert'] ?? [])].sort((a, b) => a.z - b.z || a.x - b.x);
  const BLOCK = Math.max(1, Math.round(6 / (WORLD_SCALE * WORLD_SCALE)));
  const perHex = Math.round(27 * WORLD_SCALE * WORLD_SCALE);
  const rise = (x, z) => relief(x, z, .7, 320) / .7;   // -1 in a hollow, 1 on a rise
  const shrubs = [], scrub = [], stubble = [], stones = [], pavement = [];
  for (let start = 0; start < cells.length; start += BLOCK) { if (++buildWork % 32 === 0) yield;
    const block = cells.slice(start, start + BLOCK), tufts = [];
    for (const cell of block) { if (++buildWork % 32 === 0) yield;
      const north = cell.terrain === 'grassland';                       // Ovesos's northern two rows
      const desert = hexOwnerAt(cell.x, cell.z) === 'Oves Desert';
      // Grass. Three times the west's usual count, as Gala's is: open plain with nothing else on it
      // reads as bare sand at this density and the first Gala render proved it.
      for (let i = 0; i < perHex * 3; i++) { if (++buildWork % 32 === 0) yield;
        const x = cell.x + range(-50, 50), z = cell.z + range(-55, 55);
        if (!plantable(x, z, 1.2)) continue;
        const soil = onSorten(x, z) ? 1 : 0;
        // The desert keeps a tenth of the grass Ovesos has and only where the soil has gathered.
        const here = inDesert(x, z) ? (1 - ovesLie(x, z)) * .20 * (1 - onRim(x, z)) : north ? .66 : .5 + soil * .34;
        if (random() > here) continue;
        tufts.push({ x, z, s: range(.75, 1.5) * (north ? 1.5 : soil ? 1.3 : 1.15) * (inDesert(x, z) ? .7 : 1),
          wide: north ? 1.55 : 1.3, rot: random() * 6.28, north, soil, desert: inDesert(x, z), lie: ovesLie(x, z) });
      }
      // Sub-shrubs: Ovesos's wormwood and saltbush where the grass gives out, and the desert's own
      // perennial scrub, which is "the community's drought-tolerant tail" — the same plants half the
      // size and twice as far apart. Nobody walks round a sub-shrub, so neither carries a collider.
      for (let i = 0; i < 140; i++) { if (++buildWork % 32 === 0) yield;
        const x = cell.x + range(-50, 50), z = cell.z + range(-55, 55);
        if (!plantable(x, z, 1.5)) continue;
        if (inDesert(x, z)) {
          const pocket = 1 - ovesLie(x, z);
          if (random() > pocket * .34 * (1 - onRim(x, z) * .7)) continue;
          if (scrub.some(b => Math.hypot(b.x - x, b.z - z) < 4.2)) continue;
          scrub.push({ x, z, s: range(.28, .58), h: range(.7, 1.0), rot: random() * 6.28, grey: random() < .5 });
        } else {
          if (onSorten(x, z) || random() > (north ? .16 : .38) * (.6 + Math.max(0, rise(x, z)) * .7)) continue;
          if (shrubs.some(b => Math.hypot(b.x - x, b.z - z) < 2.8)) continue;
          shrubs.push({ x, z, s: range(.45, .9), h: range(.8, 1.1), rot: random() * 6.28, salt: random() < .44 });
        }
      }
      if (desert) {
        // The seed bank as a dry year leaves it: bleached annual stalks in the low-gradient pockets.
        for (let i = 0; i < 220; i++) { if (++buildWork % 32 === 0) yield;
          const x = cell.x + range(-50, 50), z = cell.z + range(-55, 55);
          if (!plantable(x, z, .8)) continue;
          if (random() > (1 - ovesLie(x, z)) * .5 * (1 - onRim(x, z))) continue;
          stubble.push({ x, z, s: range(.4, .8), rot: random() * 6.28 });
        }
        // Gravel pavement wherever the rock is up — "absent on the ridge exposures" is the soil, not
        // the stone — and on the rim's tops, which are the baldest ground in either country.
        for (let i = 0; i < 300; i++) { if (++buildWork % 32 === 0) yield;
          const x = cell.x + range(-50, 50), z = cell.z + range(-55, 55);
          if (!plantable(x, z, .5)) continue;
          if (random() > ovesLie(x, z) * .55 + onRim(x, z) * .5) continue;
          pavement.push({ x, z, s: range(.16, .6), rot: random() * 6.28, flat: range(.16, .32), bald: onRim(x, z) > .35 });
        }
      } else {
        // Stones on Ovesos's rises, where the soil gives out. Fewer on the grass than on the plain.
        for (let i = 0; i < 44; i++) { if (++buildWork % 32 === 0) yield;
          const x = cell.x + range(-50, 50), z = cell.z + range(-55, 55);
          if (!plantable(x, z, 1) || onSorten(x, z)) continue;
          if (random() > smooth(0, .8, rise(x, z)) * (north ? .5 : .95)) continue;
          stones.push({ x, z, s: range(.22, .7), rot: random() * 6.28, flat: range(.35, .6) });
        }
      }
    }
    (yield* tuftBatch(tufts, 'Oves grass', tuft => {
      // Buff on the steppe, greener and darker on the Sorten's bottomland, greyer and paler on the
      // desert's pockets. Hex would not carry the Sorten's one green note, so this one is HSL and the
      // lightnesses are chosen low for it (the renderer's working space: the old Meneth lesson).
      const hue = .118 + tuft.soil * .035 + (tuft.desert ? -.006 : 0);
      const sat = (tuft.desert ? .20 : .29 + tuft.soil * .06) + range(-.04, .04);
      const light = (tuft.desert ? .50 : tuft.north ? .52 : .53) - tuft.soil * .06 + range(-.035, .035);
      return color.setHSL(hue + range(-.012, .012), sat, light);
    }));
  }
  (yield* bushBatch(shrubs, 'Oves wormwood and saltbush', bush => bush.salt
    ? color.set('#8b9591').offsetHSL(range(-.02, .02), range(-.04, .04), range(-.04, .05))
    : color.set('#999b85').offsetHSL(range(-.02, .02), range(-.04, .04), range(-.04, .05))));
  (yield* bushBatch(scrub, 'Oves desert scrub', bush => bush.grey
    ? color.set('#8e9083').offsetHSL(range(-.02, .02), range(-.04, .04), range(-.05, .05))
    : color.set('#7f8a6c').offsetHSL(range(-.02, .02), range(-.04, .05), range(-.04, .05))));
  (yield* stubbleBatch(stubble, 'Oves seed-bank stubble'));
  (yield* stoneBatch(stones, 'Oves steppe stones', () => color.set('#8a8578').offsetHSL(0, range(-.03, .03), range(-.05, .05)), .16));
  (yield* stoneBatch(pavement, 'Oves gravel pavement', spot => (spot.bald ? color.set('#928c7d') : color.set('#877f70')).offsetHSL(0, range(-.03, .03), range(-.05, .06)), .05));
  metrics.shrubs = shrubs.length; metrics.scrub = scrub.length; metrics.stones += stones.length; metrics.pavement = pavement.length;

  return {
    group, metrics,
    update(time) { waterMaterial.uniforms.time.value = time; },
  };
}
