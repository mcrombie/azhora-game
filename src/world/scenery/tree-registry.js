import * as THREE from 'three';
import { timberForSpecies } from '../../gameplay/skills/woodcutting/wood-species.js';

/** One interactive tree per visible trunk, including trees drawn in shared
 * instance batches. Register the existing mesh slots; never redraw the forest
 * or consume another random number just to make it harvestable. */
const registries = new WeakMap(), CELL = 12;
const bucket = (x, z) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
export const worldTreeId = (prefix, x, z) => `${prefix}-${x.toFixed(3)}-${z.toFixed(3)}`;
const zero = new THREE.Matrix4().makeScale(0, 0, 0);

export function getTreeRegistry(colliders) {
  if (!registries.has(colliders)) registries.set(colliders, createTreeRegistry(colliders));
  return registries.get(colliders);
}

export function registerWorldTree(colliders, tree, handles = [], collider = null) {
  return getTreeRegistry(colliders).register(tree, handles, collider);
}

function createTreeRegistry(colliders) {
  const trees = [], entries = new Map(), cells = new Map(), moving = new Set(), chips = [];
  let maxRadius = 0, root = null, reindex = () => {}, nextChip = 0, chipGeometry, chipMaterial;
  const matrix = new THREE.Matrix4(), rotate = new THREE.Matrix4(), translate = new THREE.Matrix4();
  const pivot = new THREE.Vector3(), axis = new THREE.Vector3();

  function register(tree, handles, collider) {
    const timber = timberForSpecies(tree.species);
    if (!timber) throw new Error(`Unknown tree species ${tree.species} (${tree.id})`);
    if (!tree.id || entries.has(tree.id)) throw new Error(`Duplicate or missing tree id: ${tree.id}`);
    if (![tree.x, tree.z, tree.y ?? 0].every(Number.isFinite)) throw new Error(`Invalid tree position: ${tree.id}`);
    const { parts: _parts, collider: _collider, ...facts } = tree;
    const descriptor = { ...facts, ...timber, name: tree.name ?? timber.woodName, kind: timber.woodKind,
      harvestable: tree.harvestable !== false, radius: tree.radius ?? collider?.r ?? .4 };
    const pieces = handles.map(({ mesh, index }) => {
      mesh.userData.liveTree = true;
      const original = new THREE.Matrix4();
      if (mesh.isInstancedMesh) mesh.getMatrixAt(index, original);
      else { mesh.updateMatrix(); original.copy(mesh.matrix); }
      return { mesh, index, original, world: null, inverse: null };
    });
    if (collider) Object.assign(collider, { id: descriptor.id, species: descriptor.species, woodKind: descriptor.woodKind });
    const entry = { tree: descriptor, pieces, collider, standing: true, age: -1, stump: null, away: 0 };
    maxRadius = Math.max(maxRadius, descriptor.radius);
    trees.push(descriptor); entries.set(descriptor.id, entry);
    const key = bucket(tree.x, tree.z); if (!cells.has(key)) cells.set(key, []); cells.get(key).push(entry);
    return descriptor;
  }

  function blocker(entry, standing) {
    const collider = entry.collider; if (!collider) return;
    const index = colliders.indexOf(collider);
    if (standing && index < 0) { colliders.push(collider); reindex(); }
    else if (!standing && index >= 0) { colliders.splice(index, 1); reindex(); }
  }

  function setPiece(piece, transform = null, hidden = false) {
    const { mesh, original, index } = piece;
    if (hidden) {
      if (mesh.isInstancedMesh) { mesh.setMatrixAt(index, zero); mesh.instanceMatrix.needsUpdate = true; }
      else mesh.visible = false;
      return;
    }
    if (transform) {
      if (!piece.world) {
        mesh.updateWorldMatrix(true, false);
        const parent = (mesh.isInstancedMesh ? mesh.matrixWorld : mesh.parent?.matrixWorld) ?? new THREE.Matrix4();
        piece.world = new THREE.Matrix4().multiplyMatrices(parent, original);
        piece.inverse = parent.clone().invert();
      }
      matrix.copy(piece.inverse).multiply(transform).multiply(piece.world);
    } else matrix.copy(original);
    if (mesh.isInstancedMesh) { mesh.setMatrixAt(index, matrix); mesh.instanceMatrix.needsUpdate = true; }
    else { mesh.visible = true; mesh.matrixAutoUpdate = false; mesh.matrix.copy(matrix); mesh.matrixWorldNeedsUpdate = true; }
  }

  function showStump(entry, visible) {
    if (!entry.stump && visible && root) {
      const radius = Math.max(.12, entry.tree.radius), stump = new THREE.Group();
      stump.name = `${entry.tree.name} stump`; stump.userData.treeId = entry.tree.id;
      stump.position.set(entry.tree.x, entry.tree.base?.y ?? entry.tree.y ?? 0, entry.tree.z);
      const bark = new THREE.Mesh(new THREE.CylinderGeometry(radius * .9, radius, .42, 7),
        new THREE.MeshStandardMaterial({ color: '#715338', roughness: .95, flatShading: true }));
      bark.position.y = .21; bark.castShadow = true; bark.receiveShadow = true; stump.add(bark);
      const cut = new THREE.Mesh(new THREE.CylinderGeometry(radius * .87, radius * .87, .025, 7),
        new THREE.MeshStandardMaterial({ color: '#d1ae76', roughness: .95 }));
      cut.position.y = .43; stump.add(cut); root.add(stump); entry.stump = stump;
    }
    if (entry.stump) entry.stump.visible = visible;
  }

  function set(id, standing) {
    const entry = entries.get(id); if (!entry) return false;
    entry.standing = !!standing; entry.age = -1; moving.delete(entry); blocker(entry, standing);
    for (const piece of entry.pieces) setPiece(piece, null, !standing);
    showStump(entry, !standing); return true;
  }

  /**
   * Take a tree out of the world for good: its drawn pieces hidden, its collider gone, no stump left, and
   * the tree itself struck off the register - it is not a felled tree, it was never there. For ground
   * something is built on after the forest was laid (src/world/scenery/scenery-clearing.js): the forest's own seeded
   * stream is left exactly as it was, and the trees in the way are lifted afterwards.
   */
  function remove(id) {
    const entry = entries.get(id); if (!entry) return false;
    moving.delete(entry); blocker(entry, false);
    for (const piece of entry.pieces) setPiece(piece, null, true);
    if (entry.stump) entry.stump.visible = false;
    entries.delete(id);
    const at = trees.indexOf(entry.tree); if (at >= 0) trees.splice(at, 1);
    const cell = cells.get(bucket(entry.tree.x, entry.tree.z)), slot = cell ? cell.indexOf(entry) : -1; if (slot >= 0) cell.splice(slot, 1);
    return true;
  }

  function fell(id, from = null) {
    const entry = entries.get(id); if (!entry || !entry.standing || entry.tree.harvestable === false) return false;
    entry.standing = false; entry.age = 0; entry.away = from ? Math.atan2(entry.tree.x - from.x, entry.tree.z - from.z) : 0;
    blocker(entry, false); showStump(entry, true); moving.add(entry); return true;
  }

  function chip(id) {
    const entry = entries.get(id); if (!entry || !root || !entry.standing) return;
    if (!chipGeometry) {
      chipGeometry = new THREE.BoxGeometry(.09, .035, .055);
      chipMaterial = new THREE.MeshStandardMaterial({ color: '#cfab73', roughness: .9 });
      for (let i = 0; i < 24; i++) { const mesh = new THREE.Mesh(chipGeometry, chipMaterial); mesh.visible = false; root.add(mesh); chips.push({ mesh, velocity: new THREE.Vector3(), age: 1 }); }
    }
    for (let i = 0; i < 5; i++) {
      const flake = chips[nextChip++ % chips.length], angle = nextChip * 2.39996;
      flake.mesh.position.set(entry.tree.x + Math.sin(angle) * entry.tree.radius, (entry.tree.y ?? 0) + .9, entry.tree.z + Math.cos(angle) * entry.tree.radius);
      flake.mesh.visible = true; flake.age = 0;
      flake.velocity.set(Math.sin(angle) * 1.8, 2 + i * .16, Math.cos(angle) * 1.8);
    }
  }

  function update(dt) {
    dt = Number.isFinite(dt) ? Math.max(0, Math.min(.1, dt)) : 0;
    for (const entry of moving) {
      entry.age += dt;
      if (entry.age >= 2.4) { for (const piece of entry.pieces) setPiece(piece, null, true); moving.delete(entry); continue; }
      pivot.set(entry.tree.x, entry.tree.base?.y ?? entry.tree.y ?? 0, entry.tree.z);
      axis.set(Math.cos(entry.away), 0, -Math.sin(entry.away));
      rotate.makeRotationAxis(axis, Math.min(Math.PI * .48, .04 * entry.age + 1.6 * entry.age ** 2));
      translate.makeTranslation(pivot.x, pivot.y, pivot.z).multiply(rotate).multiply(new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z));
      for (const piece of entry.pieces) setPiece(piece, translate);
    }
    for (const flake of chips) if (flake.age < .7) {
      flake.age += dt; flake.velocity.y -= 9 * dt; flake.mesh.position.addScaledVector(flake.velocity, dt);
      flake.mesh.rotation.x += dt * 9; flake.mesh.rotation.z += dt * 7; if (flake.age >= .7) flake.mesh.visible = false;
    }
  }

  function nearest(position, reach = 3.4, predicate = () => true) {
    let best = null, distance = reach;
    const search = reach + maxRadius;
    for (let x = Math.floor((position.x - search) / CELL); x <= Math.floor((position.x + search) / CELL); x++)
      for (let z = Math.floor((position.z - search) / CELL); z <= Math.floor((position.z + search) / CELL); z++)
        for (const entry of cells.get(`${x},${z}`) ?? []) {
          const gap = Math.hypot(entry.tree.x - position.x, entry.tree.z - position.z) - entry.tree.radius;
          if (gap <= distance && predicate(entry.tree, entry.standing)) { best = entry.tree; distance = gap; }
        }
    return best;
  }

  return { trees, register, get: id => entries.get(id)?.tree ?? null, nearest, fell, set, remove, regrow: id => set(id, true), chip, update,
    standing: id => entries.get(id)?.standing ?? false,
    configure(options) { root = options.root ?? root; reindex = options.reindex ?? reindex; return this; },
  };
}
