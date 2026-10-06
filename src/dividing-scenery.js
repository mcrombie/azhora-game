import { finishBuild } from './build-steps.js';
import * as THREE from 'three';
import { createSceneryBuilder } from './scenery-builder.js';
import { DIVIDING_PLACES } from './dividing.js';

/**
 * The props for the Dividing on the Guild forecourt (src/dividing.js; Build 5 of the Farmlands of the Lizeem,
 * 6 October 2026): a trestle table, four bowls of river water on it, one for each country, and the jug they were
 * poured from. The bowls are the Guild's own stone ones, not the temple's seven; the lore's rite is that water from
 * above the fork goes into a bowl for each branch, and the Guild's four branches are the four countries.
 *
 * Built as Haethom is (src/nethereum-farm-scenery.js), one merged mesh, and kept hidden until the host shows it:
 * `show()` when the river is whole (src/dividing.js `propsVisible()`), `hide()` otherwise. The trestle's collider
 * is in the world's list only while it is shown; `reindex` is called after each change so the world's collider
 * grid hears of it (src/world.js `reindexColliders`).
 */
const C = Object.freeze({ timber: '#6b5538', board: '#8a6f4a', stone: '#9b978a', rim: '#7d796d', water: '#6f8f96', jug: '#a5714b', cloth: '#d8d2c0' });

export function createDividingScenery(...args) { return finishBuild(createDividingScenerySteps(...args)); }

export function* createDividingScenerySteps({ parent, heightAt, colliders = [], reindex = () => {} }) {
  const root = new THREE.Group(); root.name = 'The Dividing: trestle and four bowls'; root.visible = false; parent.add(root);
  const kit = createSceneryBuilder('The Dividing trestle and bowls');
  const { trestle, bowls, jug } = DIVIDING_PLACES;
  const y = heightAt(trestle.x, trestle.z), top = y + trestle.height, hw = trestle.width / 2, hd = trestle.depth / 2;
  kit.frame(trestle.x, y, trestle.z, trestle.yaw, () => {
    // Two trestles of crossed legs and a board across them, with a cloth down the middle.
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) kit.beam(C.timber, [sx * (hw - .3), 0, sz * (hd - .05)], [sx * (hw - .3), trestle.height - .06, -sz * (hd - .2)], .07);
      kit.box(C.timber, sx * (hw - .3), trestle.height - .1, 0, .08, .08, trestle.depth - .1);
    }
    kit.block(C.board, 0, trestle.height - .06, 0, trestle.width, .06, trestle.depth);
    kit.box(C.cloth, 0, trestle.height + .005, 0, trestle.width - .3, .01, .42);
  });
  yield;
  // The four bowls, stone with a darker rim, each filled from the jug.
  for (const bowl of bowls) {
    kit.cylinder(C.stone, bowl.x, top, bowl.z, .2, .09, 0, 10);
    kit.cylinder(C.rim, bowl.x, top + .08, bowl.z, .23, .04, 0, 10);
    kit.cylinder(C.water, bowl.x, top + .1, bowl.z, .18, .015, 0, 10);
  }
  kit.cylinder(C.jug, jug.x, top, jug.z, .1, .26, 0, 8);
  kit.cone(C.jug, jug.x, top + .24, jug.z, .08, .1, 0, 8);
  yield;
  const mesh = yield* kit.finishSteps(root);
  const collider = { x: trestle.x, z: trestle.z, hx: hw + .05, hz: hd + .05, minY: y - .3, maxY: top + .4, kind: 'dividing-trestle', id: trestle.id };
  let shown = false;
  /** Shows or hides the props, and puts the trestle's collider in or out of the world's list to match. */
  function set(visible) {
    const want = !!visible;
    if (want === shown) return shown;
    shown = want; root.visible = want;
    const at = colliders.indexOf(collider);
    if (want && at < 0) colliders.push(collider);
    if (!want && at >= 0) colliders.splice(at, 1);
    reindex();
    return shown;
  }
  return {
    root, mesh, collider,
    metrics: { batches: mesh ? 1 : 0, vertices: kit.vertexCount, bowls: bowls.length },
    show: () => set(true), hide: () => set(false), set, visible: () => shown,
  };
}
