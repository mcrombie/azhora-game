import * as THREE from 'three';

/**
 * Ground cleared after the fact, for something built on country whose scatter was already laid.
 *
 * Every country puts its trees, stones and grass down from one seeded stream, cell by cell, and a
 * candidate that is refused still moves the stream - so telling Amod's or the East Lotharn's scatter to
 * keep off a new place would move every tree after it, across the whole country, and with them the
 * ground a good many tests and animals were measured on. So the scatter is left to fall exactly where it
 * always fell, and what landed on the new place is lifted afterwards:
 *
 *  - a registered tree (src/world/scenery/tree-registry.js) is removed through the registry, so its drawn pieces, its
 *    collider and its place on the register all go together;
 *  - a collider of one of the `kinds` given (a loose rock, a boulder) is taken out of the list;
 *  - an instance of any instanced batch under the named `groups` (grass, stones, terrace ribs) is
 *    scaled to nothing.
 *
 * `inside(x, z)` says what ground is cleared. Nothing here consumes a random number.
 */
const NOTHING = new THREE.Matrix4().makeScale(0, 0, 0);

export function clearScatter({ scene, colliders, treeRegistry, inside, kinds = [], groups = [] }) {
  const lifted = { trees: 0, colliders: 0, instances: 0 };
  // Listed first and removed after: removing a tree takes it out of the list being read.
  for (const tree of (treeRegistry?.trees ?? []).filter(one => inside(one.x, one.z)))
    if (treeRegistry.remove(tree.id)) lifted.trees++;
  if (kinds.length) {
    const wanted = new Set(kinds);
    for (let i = colliders.length - 1; i >= 0; i--) {
      const c = colliders[i];
      if (wanted.has(c.kind) && inside(c.x, c.z)) { colliders.splice(i, 1); lifted.colliders++; }
    }
  }
  const matrix = new THREE.Matrix4();
  // Every group of each name: a country's scatter is not always under one roof (the world's own regional
  // scenery and a country's own module can each make a group called after the country).
  const named = new Set(groups), roots = [];
  if (named.size) scene?.traverse?.(object => { if (named.has(object.name)) roots.push(object); });
  const seen = new Set();
  for (const group of roots) {
    group.traverse(object => {
      if (seen.has(object)) return;
      seen.add(object);
      if (!object.isInstancedMesh) return;
      let changed = false;
      for (let i = 0; i < object.count; i++) {
        object.getMatrixAt(i, matrix);
        const e = matrix.elements;
        // Already nothing (a felled tree, an earlier clearing): leave it.
        if (e[0] === 0 && e[5] === 0 && e[10] === 0) continue;
        if (!inside(e[12], e[14])) continue;
        object.setMatrixAt(i, NOTHING); changed = true; lifted.instances++;
      }
      // The batch's bounds are left as they were: they still hold everything that is left in it.
      if (changed) object.instanceMatrix.needsUpdate = true;
    });
  }
  return lifted;
}
