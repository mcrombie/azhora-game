import { forEachBuild } from './build-each.js';
import { finishBuild } from './build-steps.js';
import * as THREE from 'three';
import { registerWorldTree, worldTreeId } from './tree-registry.js';
import { treeGroundingOffset } from './tree-grounding.js';
import { hexAt, hexOwnerAt, landDistance, regions, REGION_CELLS } from './region-world.js';
import { WORLD_SCALE } from './world-scale.js';
import {
  NORTH, SOUTH, isAscarth, ASCARTH_CLIMATE, ASCARTH_BOX, HILL_HEXES, GREEN_STONE, CLIFF,
  hillAt, hillLift, cliffShare, frontierWeight, onCliffFoot, spineAt,
} from './ascarth-world.js';

const smooth = (a, b, x) => { const v = Math.min(1, Math.max(0, (x - a) / (b - a))); return v * v * (3 - 2 * v); };

/**
 * What grows on the Ascarth Peninsula, and the stone that shows through it.
 *
 * The atlas's word for thirty-one of its thirty-four hexes is `grassland`, and its climate for them
 * `Csa`: so open Mediterranean grass, tawny with a thin green over it, low aromatic scrub - the
 * cushions of thyme and rosemary and the knee-high maquis between them - and stone coming through
 * the thin soil everywhere, because the lore's first word for the place is "rugged". Wild olive
 * stands singly on it, well apart, as it does on Eer's coast: a tree and not a crop.
 *
 * Its other three hexes are `hills` and `Csb`, and those are the lore's "rocky and forested ...
 * interior": wood on the two hills and on the shoulder of the third, evergreen oak on the flanks and
 * pine on the tops, open enough between the trunks to walk, and the copper showing as green stain on
 * the south hill's stone. Nothing is dug and nothing is planted in rows: it is nobody's.
 *
 * Batched two hexes at a time and instanced, as South Suval's scatter is.
 */
export function createAscarthScenery(...args) { return finishBuild(createAscarthScenerySteps(...args)); }

export function* createAscarthScenerySteps(kit) {
  let buildWork = 0;
  const { root, material, groundHeight, colliders, dummy, color, round } = kit;
  const group = new THREE.Group(); group.name = 'Ascarth scenery'; root.add(group);
  let seed = 5530291;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a, b) => a + random() * (b - a);
  const metrics = { batches: 0, rocks: 0, scrub: 0, tufts: 0, trees: 0, oaks: 0, pines: 0, olives: 0, greenStone: 0, cliffRocks: 0 };
  const push = collider => { colliders.push(collider); return collider; };
  const gy = (x, z) => groundHeight(x, z);
  const treeGroundAt = kit.renderedGroundHeight ?? gy;
  const per = count => Math.round(count * WORLD_SCALE * WORLD_SCALE);

  /** Where a traveler is set down by the developer's travel button: kept clear of anything solid. */
  const spawns = regions.filter(region => isAscarth(region.name)).map(region => region.spawn);
  const nearSpawn = (x, z, r) => spawns.some(s => Math.hypot(s.x - x, s.z - z) < r);
  const ours = (x, z) => isAscarth(hexOwnerAt(x, z));
  /** On the face of a cliff, or so near its edge that anything put there would hang over it. */
  const onFace = (x, z, d = landDistance(x, z)) => d < CLIFF.face + 1.5 && cliffShare(x, z) * frontierWeight(x, z) > .3;

  const grassGeometry = (() => {
    const positions = [], normals = [];
    for (let blade = 0; blade < 5; blade++) {
      const a = blade * 1.7, bx = Math.cos(a) * .13, bz = Math.sin(a) * .13, w = .05, h = .18 + (blade % 3) * .08;
      const cx = Math.cos(a + Math.PI / 2) * w, cz = Math.sin(a + Math.PI / 2) * w;
      positions.push(bx - cx, 0, bz - cz, bx + cx, 0, bz + cz, bx + Math.cos(a) * .06, h, bz + Math.sin(a) * .06);
      for (let j = 0; j < 3; j++) normals.push(0, 1, 0);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    return geometry;
  })();
  const trunkGeometry = new THREE.CylinderGeometry(.12, .26, 1, 6);
  const grassMaterial = material('#ffffff', { side: THREE.DoubleSide });
  const cushionMaterial = material('#ffffff', { flatShading: true });
  const rockMaterial = material('#ffffff', { flatShading: true });
  const barkMaterial = material('#5f5243');
  const pineBarkMaterial = material('#6e5846');
  const crownMaterial = material('#ffffff', { flatShading: true });

  /**
   * What each kind of ground carries, per hex. The grass is thin soil over rock, so there is more
   * stone in it than in any grassland to the north; the hills carry less scrub because the wood
   * shades it out, and their wood is planted separately below.
   */
  const HABIT = Object.freeze({
    Csa: { rocks: 26, scrub: 62, tufts: 84, olives: 1.6 },
    Csb: { rocks: 34, scrub: 30, tufts: 44, olives: 0 },
  });

  const cells = [...(REGION_CELLS[NORTH] ?? []), ...(REGION_CELLS[SOUTH] ?? [])].sort((p, q) => p.r - q.r || p.q - q.q);
  const hillHex = new Set(HILL_HEXES.map(([q, r]) => `${q},${r}`));
  /** The grass hexes a hill's dome spills onto, which carry the wood of its lower flank and nothing else. */
  const HILLS_NEAR = new Set(cells.filter(cell => [[0, 0], [30, 0], [-30, 0], [0, 30], [0, -30], [26, 26], [-26, -26], [26, -26], [-26, 26]]
    .some(([dx, dz]) => { const on = hillAt(cell.x + dx, cell.z + dz); return on && on.u < .72; })).map(cell => `${cell.q},${cell.r}`));
  const olivesPlanted = [];
  for (let index = 0; index < cells.length; index += 2) { if (++buildWork % 32 === 0) yield;
    const block = cells.slice(index, index + 2);
    const rocks = [], scrub = [], tufts = [], trees = [];
    for (const cell of block) { if (++buildWork % 32 === 0) yield;
      const hex = `${cell.q},${cell.r}`, climate = ASCARTH_CLIMATE[hex] ?? 'Csa', habit = HABIT[climate];
      const sample = () => ({ x: cell.x + range(-52, 52), z: cell.z + range(-58, 58) });
      for (let i = 0; i < per(habit.rocks); i++) { if (++buildWork % 32 === 0) yield;
        const { x, z } = sample(), d = landDistance(x, z);
        if (!ours(x, z) || d < .5 || onFace(x, z, d)) continue;
        // Bigger and more of it up the hills, where the ground stands up and the soil is thinnest.
        const up = smooth(2, 16, hillLift(x, z));
        const s = range(.35, 1.1 + up * 1.6);
        rocks.push({ x, z, s, rot: range(0, 6.28), flat: range(.4, .75) });
      }
      for (let i = 0; i < per(habit.scrub); i++) { if (++buildWork % 32 === 0) yield;
        const { x, z } = sample(), d = landDistance(x, z);
        if (!ours(x, z) || d < 1.2 || onFace(x, z, d)) continue;
        // Maquis where the ground is sheltered and deeper, cushion garrigue where it is thin and windy:
        // taller toward the east's lower ground and the bays, low and grey on the west's cliff tops.
        const tall = random() < .16 + .3 * smooth(-40, 90, spineAt(x, z).across);
        scrub.push({ x, z, s: tall ? range(1.1, 1.9) : range(.45, 1.1), rot: range(0, 6.28), tall, flower: random() < .28 });
      }
      for (let i = 0; i < per(habit.tufts); i++) { if (++buildWork % 32 === 0) yield;
        const { x, z } = sample(), d = landDistance(x, z);
        if (!ours(x, z) || d < 1 || onFace(x, z, d)) continue;
        tufts.push({ x, z, s: range(.6, 1.45), rot: range(0, 6.28), green: random() < .22 });
      }
      // Wild olive, one at a time and never two within twenty-five metres: a tree on open grass.
      const wanted = per(habit.olives);
      for (let i = 0, planted = 0; i < wanted * 8 && planted < wanted; i++) { if (++buildWork % 32 === 0) yield;
        const { x, z } = sample(), d = landDistance(x, z);
        if (!ours(x, z) || d < 12 || hillLift(x, z) > 3 || nearSpawn(x, z, 8)) continue;
        if (olivesPlanted.some(t => Math.hypot(t.x - x, t.z - z) < 25)) continue;
        const tree = { x, z, s: range(.85, 1.2), h: range(3.6, 5.2), rot: range(0, 6.28), kind: 'olive' };
        trees.push(tree); olivesPlanted.push(tree); planted++;
      }
      // The wood: on the two hills' domes wherever they reach, and on the whole of the three hill
      // hexes - the third of which, the shoulder by the neck, has no dome, only the atlas's word.
      // Close on the domes, thinner on the shoulder, and never out onto the open grass beyond them.
      const wooded = hillHex.has(hex) || HILLS_NEAR.has(hex);
      if (wooded) {
        for (let i = 0; i < per(150); i++) { if (++buildWork % 32 === 0) yield;
          const { x, z } = sample(), d = landDistance(x, z);
          if (!ours(x, z) || d < 8 || onFace(x, z, d) || nearSpawn(x, z, 6)) continue;
          const on = hillAt(x, z), inHex = hillHex.has(`${hexAt(x, z).q},${hexAt(x, z).r}`);
          const density = on ? (on.u < .72 ? .97 - on.u * .3 : inHex ? .5 : 0) : inHex ? .38 : 0;
          if (random() > density) continue;
          if (trees.some(t => Math.hypot(t.x - x, t.z - z) < 4.6)) continue;
          // Pine on the tops, where the soil is thinnest and the wind is; evergreen oak below.
          const pine = on ? random() < 1 - smooth(.25, .6, on.u) : random() < .1;
          trees.push(pine ? { x, z, s: range(.85, 1.2), h: range(8.5, 11), rot: range(0, 6.28), kind: 'pine' }
            : { x, z, s: range(.8, 1.2), h: range(5, 7), rot: range(0, 6.28), kind: 'oak' });
        }
      }
    }
    if (rocks.length) {
      const batch = new THREE.InstancedMesh(round, rockMaterial, rocks.length);
      yield* forEachBuild(rocks, function* (rock, i) {
        dummy.position.set(rock.x, gy(rock.x, rock.z) + rock.s * .16, rock.z);
        dummy.rotation.set(range(-.25, .25), rock.rot, range(-.25, .25));
        dummy.scale.set(rock.s, rock.s * rock.flat, rock.s * range(.7, 1.35)); dummy.updateMatrix();
        batch.setMatrixAt(i, dummy.matrix);
        // A warm grey-brown: old hard rock, not the pale limestone of the Suval hills across the sea.
        // Chosen in sRGB and said so: an HSL lightness read in the renderer's working space comes back
        // two stops paler (docs/four-regions-brief.md), and the first picture had white stones.
        batch.setColorAt(i, color.setHSL(range(.07, .11), range(.08, .15), range(.42, .56), THREE.SRGBColorSpace));
        if (rock.s > 1.5 && !nearSpawn(rock.x, rock.z, 4)) push({ x: rock.x, z: rock.z, r: rock.s * .6, kind: 'ridge-rock' });
      });
      batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch);
      metrics.rocks += rocks.length; metrics.batches++;
    }
    if (scrub.length) {
      const batch = new THREE.InstancedMesh(round, cushionMaterial, scrub.length);
      yield* forEachBuild(scrub, function* (bush, i) {
        dummy.position.set(bush.x, gy(bush.x, bush.z) + bush.s * (bush.tall ? .3 : .13), bush.z);
        dummy.rotation.set(range(-.15, .15), bush.rot, range(-.15, .15));
        dummy.scale.set(bush.s * .62, bush.s * (bush.tall ? .55 : .32), bush.s * .58); dummy.updateMatrix();
        batch.setMatrixAt(i, dummy.matrix);
        // Maquis is dark and glossy - lentisk, myrtle, kermes oak; garrigue is grey-green and in flower.
        batch.setColorAt(i, bush.tall ? color.setHSL(range(.22, .3), range(.22, .34), range(.2, .29))
          : bush.flower ? color.setHSL(range(.72, .8), range(.14, .28), range(.46, .6))
            : color.setHSL(range(.16, .24), range(.1, .2), range(.36, .5)));
      });
      batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch);
      metrics.scrub += scrub.length; metrics.batches++;
    }
    if (tufts.length) {
      const batch = new THREE.InstancedMesh(grassGeometry, grassMaterial, tufts.length);
      yield* forEachBuild(tufts, function* (tuft, i) {
        dummy.position.set(tuft.x, gy(tuft.x, tuft.z) + .02, tuft.z);
        dummy.rotation.set(0, tuft.rot, 0); dummy.scale.setScalar(tuft.s); dummy.updateMatrix();
        batch.setMatrixAt(i, dummy.matrix);
        batch.setColorAt(i, tuft.green ? color.setHSL(range(.2, .27), range(.24, .36), range(.36, .46))
          : color.setHSL(range(.11, .15), range(.22, .34), range(.52, .64)));
      });
      batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch);
      metrics.tufts += tufts.length; metrics.batches++;
    }
    if (trees.length) (yield* plantTrees(trees));
  }

  /**
   * Three trees, each drawn as it reads from a distance: an **olive** is a short trunk and a loose
   * grey-silver crown in lumps; an **evergreen oak** a dark, dense, rounded crown low on a short
   * trunk; a **pine** a tall bare trunk and a flat dark top.
   */
  function* plantTrees(trees) {
    const oakBark = trees.filter(t => t.kind !== 'pine'), pines = trees.filter(t => t.kind === 'pine');
    const lumpsOf = t => (t.kind === 'olive' ? 3 : t.kind === 'oak' ? 3 : 2);
    const crowns = new THREE.InstancedMesh(round, crownMaterial, trees.reduce((sum, t) => sum + lumpsOf(t), 0));
    let crown = 0;
    for (const [list, bark] of [[oakBark, barkMaterial], [pines, pineBarkMaterial]]) { if (++buildWork % 32 === 0) yield;
      if (!list.length) continue;
      const trunks = new THREE.InstancedMesh(trunkGeometry, bark, list.length);
      yield* forEachBuild(list, function* (tree, i) {
        let y = gy(tree.x, tree.z); const height = tree.h * tree.s;
        const bole = tree.kind === 'pine' ? .72 : tree.kind === 'oak' ? .34 : .42;
        dummy.position.set(tree.x, y + height * bole / 2, tree.z);
        dummy.rotation.set(tree.kind === 'pine' ? .05 : .08, tree.rot, tree.kind === 'pine' ? .07 : .05);
        const girth = tree.kind === 'pine' ? .9 : tree.kind === 'oak' ? 1.25 : 1;
        dummy.scale.set(tree.s * girth, height * bole, tree.s * girth); dummy.updateMatrix();
        const grounding = treeGroundingOffset(dummy.matrix, treeGroundAt, { radius: .26, segments: 6 });
        y += grounding; dummy.position.y += grounding; dummy.updateMatrix();
        const footY = dummy.matrix.elements[13] - dummy.matrix.elements[5] * .5;
        trunks.setMatrixAt(i, dummy.matrix);
        const parts = [{mesh:trunks,index:i}];
        for (let c = 0; c < lumpsOf(tree); c++) { if (++buildWork % 32 === 0) yield;
          if (tree.kind === 'pine') {
            // The umbrella: a broad flat top, and a smaller lump under one side of it.
            dummy.position.set(tree.x + (c ? .8 : 0) * tree.s, y + height * (c ? .8 : .9), tree.z - (c ? .5 : 0) * tree.s);
            dummy.rotation.set(.05, tree.rot + c, .04);
            dummy.scale.set(height * (c ? .2 : .32), height * (c ? .08 : .11), height * (c ? .18 : .3));
            crowns.setColorAt(crown, color.setHSL(range(.27, .33), range(.3, .42), range(.17, .24)));
          } else if (tree.kind === 'oak') {
            const off = (c - 1) * .9;
            dummy.position.set(tree.x + off * tree.s, y + height * (.6 + (c % 2) * .12), tree.z + (c === 1 ? .6 : -.4) * tree.s);
            dummy.rotation.set(.1, tree.rot + c, .08);
            dummy.scale.set(height * .3, height * .26, height * .3);
            crowns.setColorAt(crown, color.setHSL(range(.2, .27), range(.2, .32), range(.18, .26)));
          } else {
            const off = (c - 1) * .7;
            dummy.position.set(tree.x + off * tree.s, y + height * (.74 + (c % 2) * .1), tree.z - off * .5 * tree.s);
            dummy.rotation.set(.1, tree.rot + c, .08);
            dummy.scale.set(height * .3, height * .2, height * .28);
            crowns.setColorAt(crown, color.setHSL(range(.19, .24), range(.08, .16), range(.44, .54)));
          }
          parts.push({mesh:crowns,index:crown});
          dummy.updateMatrix(); crowns.setMatrixAt(crown++, dummy.matrix);
        }
        const collider = push({ x: tree.x, z: tree.z, r: .42 * tree.s, kind: 'ascarth-tree' });
        registerWorldTree(colliders,{id:worldTreeId('ascarth',tree.x,tree.z),x:tree.x,z:tree.z,y:footY,height,species:tree.kind==='pine'?'stone-pine':tree.kind==='oak'?'holm-oak':'olive'},parts,collider);
        metrics.trees++;
        if (tree.kind === 'pine') metrics.pines++; else if (tree.kind === 'oak') metrics.oaks++; else metrics.olives++;
      });
      trunks.castShadow = true; trunks.receiveShadow = true; trunks.computeBoundingSphere(); group.add(trunks); metrics.batches++;
    }
    crowns.count = crown;
    crowns.castShadow = true; crowns.receiveShadow = true; crowns.computeBoundingSphere(); group.add(crowns); metrics.batches++;
  }

  /**
   * **The green stone.** Outcrops on the south hill's upper flank, the grey-brown rock of the hills
   * streaked green and blue-green where it has weathered: the copper, at the surface, untouched.
   * The largest are solid; nothing is piled, cut or taken.
   */
  {
    const stones = [], stains = [];
    for (let i = 0; i < 400 && stones.length < 16; i++) { if (++buildWork % 32 === 0) yield;
      const a = random() * Math.PI * 2, r = Math.sqrt(random()) * GREEN_STONE.radius;
      const x = GREEN_STONE.x + Math.cos(a) * r, z = GREEN_STONE.z + Math.sin(a) * r;
      if (!ours(x, z) || landDistance(x, z) < 6 || stones.some(s => Math.hypot(s.x - x, s.z - z) < 2.6)) continue;
      const s = range(.9, 2.6);
      stones.push({ x, z, s, rot: range(0, 6.28) });
      for (let k = 0; k < 3; k++) { if (++buildWork % 32 === 0) yield; stains.push({ x: x + range(-.5, .5) * s, z: z + range(-.5, .5) * s, y: s * range(.15, .45), s: s * range(.28, .46), rot: range(0, 6.28) }); }
    }
    const batch = new THREE.InstancedMesh(round, rockMaterial, stones.length);
    yield* forEachBuild(stones, function* (stone, i) {
      dummy.position.set(stone.x, gy(stone.x, stone.z) + stone.s * .2, stone.z);
      dummy.rotation.set(range(-.3, .3), stone.rot, range(-.3, .3));
      dummy.scale.set(stone.s, stone.s * range(.55, .85), stone.s * range(.8, 1.3)); dummy.updateMatrix();
      batch.setMatrixAt(i, dummy.matrix);
      batch.setColorAt(i, color.setHSL(range(.08, .11), range(.08, .14), range(.38, .48), THREE.SRGBColorSpace));
      if (stone.s > 1.5) push({ x: stone.x, z: stone.z, r: stone.s * .6, kind: 'ridge-rock' });
    });
    batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); batch.name = 'The green stone'; group.add(batch);
    // The stain: patches of malachite green and azurite blue-green lying over the faces.
    const stain = new THREE.InstancedMesh(round, rockMaterial, stains.length);
    yield* forEachBuild(stains, function* (patch, i) {
      dummy.position.set(patch.x, gy(patch.x, patch.z) + patch.y, patch.z);
      dummy.rotation.set(range(-.5, .5), patch.rot, range(-.5, .5));
      dummy.scale.set(patch.s, patch.s * .45, patch.s * .9); dummy.updateMatrix();
      stain.setMatrixAt(i, dummy.matrix);
      stain.setColorAt(i, random() < .7 ? color.setHSL(range(.36, .42), range(.35, .5), range(.34, .44)) : color.setHSL(range(.46, .5), range(.3, .44), range(.36, .46)));
    });
    stain.castShadow = true; stain.receiveShadow = true; stain.computeBoundingSphere(); group.add(stain);
    metrics.greenStone = stones.length; metrics.batches += 2;
  }

  /**
   * The cliffs' fallen rock: boulders half in the water along the foot of every face, the rubble a
   * real cliffed coast drops, so the west reads as rock from the water and from the top.
   */
  {
    // Swept rather than thrown: the foot of the cliffs is a band three or four metres wide round a
    // coast two and a half kilometres long, and random points over the whole box find it one time in
    // two hundred. So every point of a close lattice is asked, jittered, and one in three kept.
    const boulders = [];
    for (let z = ASCARTH_BOX.minZ; z < ASCARTH_BOX.maxZ; z += 1.7) { if (++buildWork % 32 === 0) yield; for (let x0 = ASCARTH_BOX.minX; x0 < ASCARTH_BOX.maxX; x0 += 1.7) { if (++buildWork % 32 === 0) yield;
      const d0 = landDistance(x0, z);
      if (d0 < -4 || d0 > 2) continue;
      const x = x0 + range(-.8, .8), zz = z + range(-.8, .8);
      if (boulders.length >= 900 || random() > .34 || !onCliffFoot(x, zz)) continue;
      if (boulders.some(b => Math.abs(b.z - zz) < 2.2 && Math.hypot(b.x - x, b.z - zz) < 2.2)) continue;
      const d = landDistance(x, zz);
      boulders.push({ x, z: zz, s: d > -1 ? range(1.3, 2.8) : range(.8, 2), rot: range(0, 6.28) });
    } }
    if (boulders.length) {
      const batch = new THREE.InstancedMesh(round, rockMaterial, boulders.length);
      yield* forEachBuild(boulders, function* (rock, i) {
        dummy.position.set(rock.x, gy(rock.x, rock.z) - rock.s * .25, rock.z);
        dummy.rotation.set(range(-.4, .4), rock.rot, range(-.4, .4));
        dummy.scale.set(rock.s, rock.s * range(.7, 1.3), rock.s * range(.8, 1.3)); dummy.updateMatrix();
        batch.setMatrixAt(i, dummy.matrix);
        batch.setColorAt(i, color.setHSL(range(.07, .11), range(.06, .12), range(.36, .5), THREE.SRGBColorSpace));
      });
      batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch);
      metrics.rocks += boulders.length; metrics.batches++; metrics.cliffRocks = boulders.length;
    }
  }

  return { group, metrics };
}
