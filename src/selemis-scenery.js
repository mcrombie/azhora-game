import * as THREE from 'three';
import { registerWorldTree, worldTreeId } from './tree-registry.js';
import { treeGroundingOffset } from './tree-grounding.js';
import { hexOwnerAt, landDistance, regions, REGION_CELLS } from './region-world.js';
import { WORLD_SCALE } from './world-scale.js';
import {
  SELEMI, SELEMIS_BOX, HARBOUR, HEADS, HILLS, WINTER_BEDS, CLIFF, cliffShare, strandWeight, bedWeight, onCliffFoot, selemisCover,
} from './selemis-world.js';

/**
 * What grows on Selemis, and the stone that shows through it.
 *
 * The atlas's word for all eight hexes is `grassland` and its climate for them `Csa`, the same pair
 * as the tip of the Ascarth Peninsula a channel's width to the north: so open Mediterranean grass,
 * low aromatic scrub and stone through thin soil, kin to the peninsula's and drawn the same way. What
 * makes it the island's own is which way a point faces, because an island four hundred metres long
 * has a windward side and a lee and nothing else (`selemisCover`, src/selemis-world.js):
 *
 *  - **the hollow** behind the harbour is in the lee of the island's own hills and holds its soil:
 *    the grass is greener there, the maquis stands taller and closer, a wild olive stands alone here
 *    and there as on the peninsula, and below each hill a few pines lean away from the sea wind;
 *  - **the ocean face** takes the salt: the scrub is wind-pruned into low grey cushions, spurge gone
 *    yellow among them, and nothing stands higher than a knee;
 *  - **the tops** of the three hills and the two heads are thin soil over pale stone, and the stone
 *    comes through - paler than the peninsula's grey-brown, which is the Iberos coast's own account
 *    of its southern end ("the hills become pale");
 *  - **the strand** is bare sand with tamarisk along the back of it and a line of sea-wrack at the
 *    top of the swash;
 *  - **the winter beds** are washed stones;
 *  - and **the cliffs** have their fallen rock at the foot, as the peninsula's do.
 *
 * The lore catalogues no flora for the island - what it has of Selemis is the city - so every plant
 * here is derived from the climate code, from the Iberos coast's own lore and from the peninsula, and
 * is a builder's choice. Nothing is planted in rows, cut, walled or tended: it is nobody's.
 *
 * Its own seeded stream. Batched two hexes at a time and instanced, as the peninsula's scatter is.
 */
export function createSelemisScenery(kit) {
  const { root, material, groundHeight, colliders, dummy, color, round } = kit;
  const group = new THREE.Group(); group.name = 'Selemis scenery'; root.add(group);
  let seed = 7741903;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a, b) => a + random() * (b - a);
  const metrics = { batches: 0, rocks: 0, outcrops: 0, scrub: 0, maquis: 0, tufts: 0, trees: 0, pines: 0, olives: 0, tamarisks: 0, bedStones: 0, wrack: 0, cliffRocks: 0 };
  const push = collider => { colliders.push(collider); return collider; };
  const gy = (x, z) => groundHeight(x, z);
  const treeGroundAt = kit.renderedGroundHeight ?? gy;
  const per = count => Math.round(count * WORLD_SCALE * WORLD_SCALE);

  /** Where a traveler is set down by the developer's travel button: kept clear of anything solid. */
  // Keep the original scatter exclusion fixed when the city arrival moves:
  // otherwise the seeded candidate stream would move plants outside its streets.
  const spawns = [{x:-790,z:2436}];
  const nearSpawn = (x, z, r) => spawns.some(s => Math.hypot(s.x - x, s.z - z) < r);
  const ours = (x, z) => hexOwnerAt(x, z) === SELEMI;
  /** On the face of a cliff, or so near its edge that anything put there would hang over it. */
  const onFace = (x, z, d = landDistance(x, z)) => d < CLIFF.face + 1.5 && cliffShare(x, z) > .3;
  /** On the strand's own sand, where nothing grows but what is planted along the back of it. */
  const onSand = (x, z, d = landDistance(x, z)) => d < 13 && strandWeight(x, z) > .5;
  /** The way the sea wind bends a tree: off the open sea and toward the harbour's mouth. */
  const LEE = Object.freeze({ x: -HARBOUR.axis.x, z: -HARBOUR.axis.z });

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
   * The island's stone: pale, a warm cream-grey. Chosen in sRGB and said so - an HSL lightness read in
   * the renderer's working space comes back two stops paler (docs/four-regions-brief.md), and a stone
   * this pale would come back white.
   */
  const stone = (low = .5, high = .63) => color.setHSL(range(.1, .135), range(.1, .18), range(low, high), THREE.SRGBColorSpace);

  /**
   * What an open hex carries. Three times the peninsula's grass, because eight hexes is all there is
   * and a thin scatter reads from a hill as a lawn (docs/southwest-4-report.md met the same thing on
   * Marosh's terrace, and the first picture of this island met it again); about the peninsula's stone
   * and scrub.
   */
  const HABIT = Object.freeze({ rocks: 24, scrub: 78, tufts: 250 });

  const cells = [...(REGION_CELLS[SELEMI] ?? [])].sort((p, q) => p.r - q.r || p.q - q.q);
  for (let index = 0; index < cells.length; index += 2) {
    const block = cells.slice(index, index + 2);
    const rocks = [], scrub = [], tufts = [];
    for (const cell of block) {
      const sample = () => ({ x: cell.x + range(-52, 52), z: cell.z + range(-58, 58) });
      for (let i = 0; i < per(HABIT.rocks); i++) {
        const { x, z } = sample(), d = landDistance(x, z);
        if (!ours(x, z) || d < .5 || onFace(x, z, d) || onSand(x, z, d) || bedWeight(x, z) > .1) continue;
        // More of it and bigger on the tops, where the soil is thinnest; little in the hollow, which holds the soil.
        const cover = selemisCover(x, z);
        if (random() > .5 + cover.crown * .5 - cover.hollow * .28) continue;
        const s = range(.35, 1 + cover.crown * 1.3);
        rocks.push({ x, z, s, rot: range(0, 6.28), flat: range(.4, .75) });
      }
      for (let i = 0; i < per(HABIT.scrub); i++) {
        const { x, z } = sample(), d = landDistance(x, z);
        if (!ours(x, z) || d < 1.2 || onFace(x, z, d) || onSand(x, z, d) || bedWeight(x, z) > .3) continue;
        const cover = selemisCover(x, z);
        // Thin on the stony tops; thick in the hollow.
        if (random() > .72 - cover.crown * .34 + cover.hollow * .28) continue;
        // Maquis in the lee, where the ground is sheltered and deeper; cushion garrigue everywhere else,
        // and on the ocean face pruned flat by the wind.
        const tall = random() < .06 + .58 * cover.hollow - .3 * cover.salt;
        scrub.push({ x, z, tall, pruned: !tall && random() < cover.salt * 1.3, s: tall ? range(1.1, 2) : range(.45, 1.1), rot: range(0, 6.28), flower: random() < .26 });
      }
      for (let i = 0; i < per(HABIT.tufts); i++) {
        const { x, z } = sample(), d = landDistance(x, z);
        if (!ours(x, z) || d < 1 || onFace(x, z, d) || onSand(x, z, d) || bedWeight(x, z) > .45) continue;
        const cover = selemisCover(x, z);
        tufts.push({ x, z, s: range(.6, 1.45) * (1 - cover.salt * .25), rot: range(0, 6.28), green: random() < .1 + .42 * cover.hollow });
      }
    }
    if (rocks.length) {
      const batch = new THREE.InstancedMesh(round, rockMaterial, rocks.length);
      rocks.forEach((rock, i) => {
        dummy.position.set(rock.x, gy(rock.x, rock.z) + rock.s * .16, rock.z);
        dummy.rotation.set(range(-.25, .25), rock.rot, range(-.25, .25));
        dummy.scale.set(rock.s, rock.s * rock.flat, rock.s * range(.7, 1.35)); dummy.updateMatrix();
        batch.setMatrixAt(i, dummy.matrix);
        batch.setColorAt(i, stone());
        if (rock.s > 1.5 && !nearSpawn(rock.x, rock.z, 4)) push({ x: rock.x, z: rock.z, r: rock.s * .6, kind: 'ridge-rock' });
      });
      batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch);
      metrics.rocks += rocks.length; metrics.batches++;
    }
    if (scrub.length) {
      const batch = new THREE.InstancedMesh(round, cushionMaterial, scrub.length);
      scrub.forEach((bush, i) => {
        const height = bush.tall ? .55 : bush.pruned ? .2 : .32;
        dummy.position.set(bush.x, gy(bush.x, bush.z) + bush.s * (bush.tall ? .3 : .12), bush.z);
        dummy.rotation.set(range(-.15, .15), bush.rot, range(-.15, .15));
        dummy.scale.set(bush.s * (bush.pruned ? .74 : .62), bush.s * height, bush.s * .58); dummy.updateMatrix();
        batch.setMatrixAt(i, dummy.matrix);
        // Maquis is dark and glossy - lentisk, myrtle, juniper; the garrigue is grey-green and in flower,
        // as on the peninsula; and on the ocean face the cushions are spurge, gone yellow by midsummer.
        batch.setColorAt(i, bush.tall ? color.setHSL(range(.22, .3), range(.22, .34), range(.2, .29))
          : bush.pruned ? (bush.flower ? color.setHSL(range(.15, .19), range(.34, .5), range(.42, .52)) : color.setHSL(range(.17, .23), range(.08, .15), range(.36, .46)))
            : bush.flower ? color.setHSL(range(.72, .8), range(.14, .28), range(.46, .6))
              : color.setHSL(range(.16, .24), range(.1, .2), range(.36, .5)));
        if (bush.tall) metrics.maquis++;
      });
      batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch);
      metrics.scrub += scrub.length; metrics.batches++;
    }
    if (tufts.length) {
      const batch = new THREE.InstancedMesh(grassGeometry, grassMaterial, tufts.length);
      tufts.forEach((tuft, i) => {
        dummy.position.set(tuft.x, gy(tuft.x, tuft.z) + .02, tuft.z);
        dummy.rotation.set(0, tuft.rot, 0); dummy.scale.setScalar(tuft.s); dummy.updateMatrix();
        batch.setMatrixAt(i, dummy.matrix);
        // Straw: a shade paler and less green than the peninsula's tawny, with real green only in the
        // hollow. The straw is chosen in sRGB and said so, as the stone is: read in the renderer's
        // working space the same lightness came back white, and the first picture had white grass.
        batch.setColorAt(i, tuft.green ? color.setHSL(range(.2, .27), range(.24, .36), range(.36, .46))
          : color.setHSL(range(.115, .15), range(.3, .42), range(.5, .6), THREE.SRGBColorSpace));
      });
      batch.receiveShadow = true; batch.computeBoundingSphere(); group.add(batch);
      metrics.tufts += tufts.length; metrics.batches++;
    }
  }

  /**
   * **The outcrops**: the pale stone standing out of the three hilltops and the two heads' crowns,
   * which is where the soil is thinnest. A handful on each, the largest of them solid. Nothing is
   * cut, stacked or set: it is the hill's own rock.
   */
  {
    const stones = [];
    for (const top of [...HILLS, ...HEADS]) {
      const wanted = top.radius > 60 ? 8 : 6;
      for (let i = 0, placed = 0; i < wanted * 12 && placed < wanted; i++) {
        const a = random() * Math.PI * 2, r = Math.sqrt(random()) * top.radius * .34;
        const x = top.x + Math.cos(a) * r, z = top.z + Math.sin(a) * r, d = landDistance(x, z);
        if (!ours(x, z) || d < 7 || onFace(x, z, d) || nearSpawn(x, z, 6)) continue;
        if (stones.some(s => Math.hypot(s.x - x, s.z - z) < 3.4)) continue;
        stones.push({ x, z, s: range(1, 2.5), rot: range(0, 6.28) }); placed++;
      }
    }
    const batch = new THREE.InstancedMesh(round, rockMaterial, stones.length);
    stones.forEach((rock, i) => {
      dummy.position.set(rock.x, gy(rock.x, rock.z) + rock.s * .18, rock.z);
      dummy.rotation.set(range(-.3, .3), rock.rot, range(-.3, .3));
      dummy.scale.set(rock.s, rock.s * range(.5, .8), rock.s * range(.8, 1.3)); dummy.updateMatrix();
      batch.setMatrixAt(i, dummy.matrix);
      batch.setColorAt(i, stone(.52, .64));
      if (rock.s > 1.5) push({ x: rock.x, z: rock.z, r: rock.s * .6, kind: 'ridge-rock' });
    });
    batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); batch.name = 'Selemis outcrops'; group.add(batch);
    metrics.outcrops = stones.length; metrics.rocks += stones.length; metrics.batches++;
  }

  /**
   * **The trees**, and there are few: an island with a sea wind on it grows wood only where
   * something stands between the wood and the wind.
   *  - **pines** in three small stands, one under each hill on its harbour side, every one of them
   *    leaning the way the wind has pushed it - off the open sea and down toward the bay;
   *  - **wild olive** standing singly on the slope of the hollow, never two within twenty-five metres,
   *    as it stands on the peninsula's grass: a tree and not a crop;
   *  - **tamarisk** along the back of the strand, where the sand ends.
   */
  {
    const trees = [];
    const clearOf = (x, z, r) => !trees.some(t => Math.hypot(t.x - x, t.z - z) < r);
    HILLS.forEach((h, index) => {
      const n = Math.hypot(HARBOUR.x - h.x, HARBOUR.z - h.z), dx = (HARBOUR.x - h.x) / n, dz = (HARBOUR.z - h.z) / n;
      const cx = h.x + dx * h.radius * .6, cz = h.z + dz * h.radius * .6, wanted = [5, 7, 6][index];
      for (let i = 0, placed = 0; i < wanted * 14 && placed < wanted; i++) {
        const a = random() * Math.PI * 2, r = Math.sqrt(random()) * 21;
        const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r, d = landDistance(x, z);
        if (!ours(x, z) || d < 14 || bedWeight(x, z) > .05 || nearSpawn(x, z, 8) || !clearOf(x, z, 6.5)) continue;
        trees.push({ x, z, kind: 'pine', s: range(.8, 1.1), h: range(7.4, 9.8), rot: range(0, 6.28), lean: range(.12, .22) });
        placed++;
      }
    });
    for (let i = 0, placed = 0; i < 400 && placed < 7; i++) {
      const x = HARBOUR.x + range(-125, 125), z = HARBOUR.z + range(-60, 135), d = landDistance(x, z);
      if (!ours(x, z) || d < 16 || bedWeight(x, z) > 0 || nearSpawn(x, z, 8)) continue;
      const cover = selemisCover(x, z);
      if (cover.hollow < .3 || cover.crown > .2) continue;
      if (trees.some(t => Math.hypot(t.x - x, t.z - z) < (t.kind === 'olive' ? 25 : 12))) continue;
      trees.push({ x, z, kind: 'olive', s: range(.85, 1.2), h: range(3.6, 5.2), rot: range(0, 6.28), lean: range(.03, .09) });
      placed++;
    }
    for (let i = 0, placed = 0; i < 900 && placed < 9; i++) {
      const x = HARBOUR.x + range(-70, 70), z = HARBOUR.z + range(-60, 70), d = landDistance(x, z);
      if (!ours(x, z) || d < 9 || d > 16 || strandWeight(x, z) < .85 || bedWeight(x, z) > .2 || nearSpawn(x, z, 6)) continue;
      if (!clearOf(x, z, 9)) continue;
      trees.push({ x, z, kind: 'tamarisk', s: range(.8, 1.15), h: range(2.5, 3.6), rot: range(0, 6.28), lean: range(.05, .12) });
      placed++;
    }
    if (trees.length) plantTrees(trees);
  }

  /**
   * Three trees, each drawn as it reads from a distance: a **pine** is a bare trunk and a flat dark
   * top carried off to one side of its own foot; a **wild olive** a short trunk and a loose
   * grey-silver crown in lumps, as on the peninsula; a **tamarisk** hardly a tree at all - a short
   * leaning stem under a soft grey-green plume.
   */
  function plantTrees(trees) {
    const lumpsOf = t => (t.kind === 'pine' ? 2 : 3);
    const crowns = new THREE.InstancedMesh(round, crownMaterial, trees.reduce((sum, t) => sum + lumpsOf(t), 0));
    const axis = new THREE.Vector3(LEE.z, 0, -LEE.x), up = new THREE.Vector3(0, 1, 0), turn = new THREE.Quaternion(), spin = new THREE.Quaternion();
    let crown = 0;
    for (const [list, bark] of [[trees.filter(t => t.kind !== 'pine'), barkMaterial], [trees.filter(t => t.kind === 'pine'), pineBarkMaterial]]) {
      if (!list.length) continue;
      const trunks = new THREE.InstancedMesh(trunkGeometry, bark, list.length);
      list.forEach((tree, i) => {
        let y = gy(tree.x, tree.z); const height = tree.h * tree.s;
        const bole = tree.kind === 'pine' ? .74 : tree.kind === 'olive' ? .42 : .5, length = height * bole;
        // Leant toward the lee: the trunk turns about the level axis square to the wind, and its top
        // stands that far downwind of its own foot.
        const sin = Math.sin(tree.lean), cos = Math.cos(tree.lean);
        const topX = tree.x + LEE.x * sin * length, topZ = tree.z + LEE.z * sin * length; let topY = y + cos * length;
        dummy.position.set((tree.x + topX) / 2, (y + topY) / 2, (tree.z + topZ) / 2);
        // A rotation about (LEE.z, 0, -LEE.x) by the lean carries +Y toward the lee.
        turn.setFromAxisAngle(axis, tree.lean); spin.setFromAxisAngle(up, tree.rot);
        dummy.quaternion.copy(turn).multiply(spin);
        const girth = tree.kind === 'pine' ? .9 : tree.kind === 'olive' ? 1 : .6;
        dummy.scale.set(tree.s * girth, length, tree.s * girth); dummy.updateMatrix();
        const grounding = treeGroundingOffset(dummy.matrix, treeGroundAt, { radius: .26, segments: 6 });
        y += grounding; topY += grounding; dummy.position.y += grounding; dummy.updateMatrix();
        const footY = dummy.matrix.elements[13] - dummy.matrix.elements[5] * .5;
        trunks.setMatrixAt(i, dummy.matrix);
        const parts = [{ mesh: trunks, index: i }];
        for (let c = 0; c < lumpsOf(tree); c++) {
          dummy.rotation.set(.06, tree.rot + c, .05);
          if (tree.kind === 'pine') {
            // The umbrella: a broad flat top and a smaller lump under its downwind side.
            const out = c ? .9 : .25;
            dummy.position.set(topX + LEE.x * out * tree.s, topY + height * (c ? .02 : .1), topZ + LEE.z * out * tree.s);
            dummy.scale.set(height * (c ? .2 : .31), height * (c ? .08 : .1), height * (c ? .18 : .29));
            crowns.setColorAt(crown, color.setHSL(range(.27, .33), range(.3, .42), range(.17, .24)));
          } else if (tree.kind === 'olive') {
            const off = (c - 1) * .7;
            dummy.position.set(topX + off * tree.s, topY + height * (.3 + (c % 2) * .1), topZ - off * .5 * tree.s);
            dummy.scale.set(height * .3, height * .2, height * .28);
            crowns.setColorAt(crown, color.setHSL(range(.19, .24), range(.08, .16), range(.44, .54)));
          } else {
            const off = (c - 1) * .5;
            dummy.position.set(topX + off * tree.s + LEE.x * .3, topY + height * (.12 + (c % 2) * .12), topZ - off * .6 * tree.s + LEE.z * .3);
            dummy.scale.set(height * .3, height * .22, height * .27);
            crowns.setColorAt(crown, color.setHSL(range(.25, .31), range(.1, .18), range(.36, .46)));
          }
          parts.push({ mesh: crowns, index: crown });
          dummy.updateMatrix(); crowns.setMatrixAt(crown++, dummy.matrix);
        }
        dummy.rotation.set(0, 0, 0);
        const collider = push({ x: tree.x, z: tree.z, r: (tree.kind === 'tamarisk' ? .3 : .42) * tree.s, kind: 'selemis-tree' });
        registerWorldTree(colliders, { id: worldTreeId('selemis', tree.x, tree.z), x: tree.x, z: tree.z, y: footY, height,
          species: tree.kind === 'pine' ? 'stone-pine' : tree.kind === 'olive' ? 'olive' : 'tamarisk' }, parts, collider);
        metrics.trees++;
        if (tree.kind === 'pine') metrics.pines++; else if (tree.kind === 'olive') metrics.olives++; else metrics.tamarisks++;
      });
      trunks.castShadow = true; trunks.receiveShadow = true; trunks.computeBoundingSphere(); group.add(trunks); metrics.batches++;
    }
    crowns.count = crown;
    crowns.castShadow = true; crowns.receiveShadow = true; crowns.computeBoundingSphere(); group.add(crowns); metrics.batches++;
  }

  /**
   * **The winter beds' stones**: washed cobbles lying down the middle of each bed, small and paler
   * than the ground beside them, which is what says a bed is a bed when there is no water in it.
   */
  {
    const cobbles = [];
    for (const course of WINTER_BEDS) for (let i = 0; i < 150; i++) {
      const t = range(.1, .97) * course.length;
      let k = 1; while (k < course.run.length - 1 && course.run[k] < t) k++;
      const a = course.line[k - 1], b = course.line[k], u = (t - course.run[k - 1]) / (course.run[k] - course.run[k - 1]);
      const dx = b.x - a.x, dz = b.z - a.z, n = Math.hypot(dx, dz), off = range(-1, 1) * course.half * .8;
      const x = a.x + dx * u - dz / n * off, z = a.z + dz * u + dx / n * off;
      if (!ours(x, z) || landDistance(x, z) < 6 || bedWeight(x, z) < .14 || nearSpawn(x, z, 3)) continue;
      cobbles.push({ x, z, s: range(.16, .52), rot: range(0, 6.28) });
    }
    if (cobbles.length) {
      const batch = new THREE.InstancedMesh(round, rockMaterial, cobbles.length);
      cobbles.forEach((rock, i) => {
        dummy.position.set(rock.x, gy(rock.x, rock.z) + rock.s * .1, rock.z);
        dummy.rotation.set(range(-.2, .2), rock.rot, range(-.2, .2));
        dummy.scale.set(rock.s, rock.s * range(.4, .6), rock.s * range(.8, 1.25)); dummy.updateMatrix();
        batch.setMatrixAt(i, dummy.matrix);
        batch.setColorAt(i, stone(.58, .7));
      });
      batch.receiveShadow = true; batch.computeBoundingSphere(); batch.name = 'Winter bed stones'; group.add(batch);
      metrics.bedStones = cobbles.length; metrics.batches++;
    }
  }

  /**
   * **The wrack line**: what the sea leaves at the top of the swash on a sheltered strand - a broken
   * patches of washed weed along the bay, with bare sand between them. Each has its own width,
   * density and curled fragments; the surrounding scenery keeps its original random stream.
   */
  {
    const weed = [];
    for (let z = HARBOUR.water.z - 80; z < HARBOUR.water.z + 90; z += 1.3) for (let x0 = HARBOUR.water.x - 90; x0 < HARBOUR.water.x + 90; x0 += 1.3) {
      const d0 = landDistance(x0, z);
      if (d0 < 1 || d0 > 4) continue;
      const x = x0 + range(-.6, .6), zz = z + range(-.6, .6), d = landDistance(x, zz);
      if (weed.length >= 190 || random() > .78 || d < 1.7 || d > 3.3 || strandWeight(x, zz) < .7) continue;
      if (weed.some(w => Math.abs(w.z - zz) < 1.15 && Math.hypot(w.x - x, w.z - zz) < 1.15)) continue;
      weed.push({ x, z: zz, s: range(.45, 1.1), rot: range(0, 6.28) });
    }
    if (weed.length) {
      // Consume every original colour draw before making patch decisions. The
      // cliff rocks below keep their exact seeded transforms and colours.
      const tints = weed.map(() => color.setHSL(range(.08, .13), range(.25, .4), range(.15, .23), THREE.SRGBColorSpace).clone());
      let wrackSeed = 319771;
      const variation = () => { wrackSeed = (Math.imul(wrackSeed, 1664525) + 1013904223) >>> 0; return wrackSeed / 4294967296; };
      const candidates = weed.map((clump, i) => ({ ...clump, tint: tints[i], order: variation() })).sort((a, b) => a.order - b.order);
      const patches = [], pieces = [];
      for (const candidate of candidates) {
        const half = 2.2 + variation() * 4.3, width = .3 + variation() * 1.1, gap = 3 + variation() * 6;
        if (patches.some(p => Math.hypot(p.x - candidate.x, p.z - candidate.z) < p.half + half + gap)) continue;
        const nx = landDistance(candidate.x + .7, candidate.z) - landDistance(candidate.x - .7, candidate.z);
        const nz = landDistance(candidate.x, candidate.z + .7) - landDistance(candidate.x, candidate.z - .7);
        const length = Math.hypot(nx, nz); if (length < .01) continue;
        const normal = { x: nx / length, z: nz / length }, tangent = { x: normal.z, z: -normal.x };
        patches.push({ x: candidate.x, z: candidate.z, half });
        const count = 7 + Math.floor(variation() * 20), phase = variation() * 6.28;
        for (let i = 0; i < count; i++) {
          const along = (variation() * 2 - 1) * half;
          const across = (variation() * 2 - 1) * width + Math.sin(along / half * 2 + phase) * .38;
          const x = candidate.x + tangent.x * along + normal.x * across;
          const z = candidate.z + tangent.z * along + normal.z * across, d = landDistance(x, z);
          if (!ours(x, z) || d < .7 || d > 6 || strandWeight(x, z) < .65) continue;
          pieces.push({ x, z, yaw: Math.atan2(-tangent.z, tangent.x) + (variation() - .5) * 1.5,
            length: .5 + variation(), width: .55 + variation() * .65, tint: candidate.tint.clone().multiplyScalar(.8 + variation() * .65) });
        }
      }
      // Three curled, tapered ribbons read as washed weed, rather than stones.
      const positions = [], indices = [];
      for (const [angle, length, offset] of [[-.45, 1.05, 0], [.9, .82, .09], [2.4, .68, -.08]]) {
        const base = positions.length / 3, c = Math.cos(angle), s = Math.sin(angle);
        for (let i = 0; i <= 4; i++) {
          const t = i / 4, along = (t - .5) * length, curve = Math.sin(t * Math.PI * 2) * .065 + offset;
          const halfWidth = .007 + Math.sin(t * Math.PI) * .047;
          for (const side of [-1, 1]) positions.push(c * along - s * (curve + side * halfWidth),
            .004 + Math.sin(t * Math.PI) * .018, s * along + c * (curve + side * halfWidth));
          if (i < 4) { const a = base + i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
      const batch = new THREE.InstancedMesh(geometry, material('#ffffff', { side: THREE.DoubleSide, flatShading: true }), pieces.length);
      const up = new THREE.Vector3(0, 1, 0), normal = new THREE.Vector3(), tilt = new THREE.Quaternion(), spin = new THREE.Quaternion();
      pieces.forEach((piece, i) => {
        const gx = (treeGroundAt(piece.x + .35, piece.z) - treeGroundAt(piece.x - .35, piece.z)) / .7;
        const gz = (treeGroundAt(piece.x, piece.z + .35) - treeGroundAt(piece.x, piece.z - .35)) / .7;
        normal.set(-gx, 1, -gz).normalize(); tilt.setFromUnitVectors(up, normal); spin.setFromAxisAngle(up, piece.yaw);
        dummy.position.set(piece.x, treeGroundAt(piece.x, piece.z) + .012, piece.z);
        dummy.quaternion.copy(tilt).multiply(spin); dummy.scale.set(piece.length, 1, piece.width); dummy.updateMatrix();
        batch.setMatrixAt(i, dummy.matrix); batch.setColorAt(i, piece.tint);
      });
      batch.receiveShadow = true; batch.computeBoundingSphere(); batch.name = 'Strand wrack'; group.add(batch);
      metrics.wrack = pieces.length; metrics.batches++;
    }
  }

  /**
   * The cliffs' fallen rock: boulders half in the water along the foot of every face, as the
   * peninsula's have. Every point of a close lattice is asked, jittered, and one in three kept.
   */
  {
    const boulders = [];
    for (let z = SELEMIS_BOX.minZ; z < SELEMIS_BOX.maxZ; z += 1.7) for (let x0 = SELEMIS_BOX.minX; x0 < SELEMIS_BOX.maxX; x0 += 1.7) {
      const d0 = landDistance(x0, z);
      if (d0 < -4 || d0 > 2) continue;
      const x = x0 + range(-.8, .8), zz = z + range(-.8, .8);
      if (boulders.length >= 800 || random() > .34 || !onCliffFoot(x, zz)) continue;
      if (boulders.some(b => Math.abs(b.z - zz) < 2.2 && Math.hypot(b.x - x, b.z - zz) < 2.2)) continue;
      const d = landDistance(x, zz);
      boulders.push({ x, z: zz, s: d > -1 ? range(1.3, 2.8) : range(.8, 2), rot: range(0, 6.28) });
    }
    if (boulders.length) {
      const batch = new THREE.InstancedMesh(round, rockMaterial, boulders.length);
      boulders.forEach((rock, i) => {
        dummy.position.set(rock.x, gy(rock.x, rock.z) - rock.s * .25, rock.z);
        dummy.rotation.set(range(-.4, .4), rock.rot, range(-.4, .4));
        dummy.scale.set(rock.s, rock.s * range(.7, 1.3), rock.s * range(.8, 1.3)); dummy.updateMatrix();
        batch.setMatrixAt(i, dummy.matrix);
        batch.setColorAt(i, stone(.44, .58));
      });
      batch.castShadow = true; batch.receiveShadow = true; batch.computeBoundingSphere(); batch.name = 'Selemis cliff rock'; group.add(batch);
      metrics.rocks += boulders.length; metrics.batches++; metrics.cliffRocks = boulders.length;
    }
  }

  return { group, metrics };
}
