import * as THREE from 'three';
import { WOODLOT_TREES } from './woodcutting.js';

/** Destructive scenery experiments belong to the temporary testing session.
 * Nothing here writes a save, grants timber or changes a quest. Reset BEFORE
 * restoring the real adventure. Shared scenery is edited through private index
 * buffers: burning one cottage cannot hide its whole material/city batch. */
export const DEVELOPER_DESTRUCTION = Object.freeze({ treeHeat: .22, propHeat: .28,
  buildingHeat: .6, trianglesPerTick: 9000, maxPending: 24, maxRubble: 90 });
const BUILDINGS = new Set(['house', 'cottage', 'woodlot-keep', 'barn', 'shed', 'hut', 'cabin']);
const PROPS = new Set(['prop', 'crate', 'barrel', 'market-stall', 'rack', 'fence', 'tutorial-fence',
  'cook-table', 'repair-bench', 'workbench', 'chopping-block', 'log-pile', 'log-stack',
  'relay-desk', 'horse-line', 'marl-cart', 'fishing-stool', 'timber-stack']);
const NEVER = /(?:terrain|ground|water|river|sea surface|path surface|road surface|grass|cloud|sky|snow|reef)/i;
const SHARED_STATIC = 'Static scenery batch';
const finitePoint = p => !!p && [p.x, p.y, p.z].every(Number.isFinite);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const emptyHit = () => ({ trees: 0, queued: 0 });

export function createDeveloperDestruction({ world, scene, root = null, enabled = () => false,
  canReach = () => true } = {}) {
  if (!world || !scene) throw new Error('Developer destruction needs a world and scene');
  root ??= scene.getObjectByName?.('Drent and the road to the Moros') ?? scene;
  const colliders = world.colliders ?? [], registry = world.treeRegistry;
  const treeChanges = new Map(), removed = new Map(), geometryChanges = new Map(), colliderOrder = new Map();
  const burned = new Set(), heat = new Map(), jobs = [], debris = [], trees = new Map(), treeCells = new Map();
  let unburnable = new WeakSet();
  let treeCount = 0, colliderCount = -1, active = false, meshes = [], meshDirty = true, disposed = false;
  let destroyedStructures = 0, nextId = 1;
  const ids = new WeakMap(), CELL = 20;
  const effects = new THREE.Group(); effects.name = 'Temporary dragon destruction';
  effects.userData.developerEffect = true; scene.add(effects);
  const black = new THREE.MeshStandardMaterial({ color: 0x211a16, roughness: 1, flatShading: true });
  const ember = new THREE.MeshStandardMaterial({ color: 0x813515, emissive: 0xff5d10, emissiveIntensity: .6, roughness: 1 });
  const cube = new THREE.BoxGeometry(1, 1, 1), trunk = new THREE.CylinderGeometry(.72, 1, 1, 7);
  const unsub = world.onRegionReady?.(() => { meshDirty = true; treeCount = 0; trees.clear(); treeCells.clear(); unburnable = new WeakSet(); });
  const baseAt = (x, z) => world.renderedGroundHeight?.(x, z) ?? world.groundHeight?.(x, z) ?? world.heightAt?.(x, z) ?? 0;
  const reindex = () => world.reindexColliders?.();
  const allowed = () => !disposed && !!enabled();
  function colliderId(c) { if (!ids.has(c)) ids.set(c, `scenery-${nextId++}`); return ids.get(c); }
  const cellKey = (x, z) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;

  function syncTrees() {
    const catalog = registry?.trees ?? [];
    if (catalog.length < treeCount) { treeCount = 0; trees.clear(); treeCells.clear(); }
    for (; treeCount < catalog.length; treeCount++) {
      const t = catalog[treeCount]; trees.set(t.id, t);
      const key = cellKey(t.x, t.z); if (!treeCells.has(key)) treeCells.set(key, []); treeCells.get(key).push(t);
    }
  }
  function treesNear(x, z, reach) {
    syncTrees(); const out = [];
    for (let cx = Math.floor((x - reach) / CELL); cx <= Math.floor((x + reach) / CELL); cx++)
      for (let cz = Math.floor((z - reach) / CELL); cz <= Math.floor((z + reach) / CELL); cz++)
        for (const t of treeCells.get(`${cx},${cz}`) ?? []) out.push(t);
    if (world.woodlot) for (const t of WOODLOT_TREES)
      if (Math.abs(t.x - x) < reach && Math.abs(t.z - z) < reach && !trees.has(t.id)) out.push(t);
    return out;
  }
  function takeCollider(c) {
    const index = colliders.indexOf(c); if (index < 0 || removed.has(c)) return;
    // Keep original order even when removing several adjacent blockers. New
    // streamed colliders follow the saved prefix and are never discarded.
    for (const entry of colliders) if (!colliderOrder.has(entry)) colliderOrder.set(entry, colliderOrder.size);
    removed.set(c, colliderOrder.get(c)); colliders.splice(index, 1);
  }

  function volume(c) {
    const building = BUILDINGS.has(c.kind), yaw = c.angle ?? c.yaw ?? 0;
    let hx = c.width ? c.width / 2 : c.hx ?? c.r ?? .5;
    let hz = c.depth ? c.depth / 2 : c.hz ?? c.r ?? .5;
    // Bounds describe only one physical object, never a whole district or wall.
    hx += building ? .9 : .24; hz += building ? .9 : .24;
    const floor = Number.isFinite(c.minY) ? c.minY : baseAt(c.x, c.z);
    const top = Number.isFinite(c.maxY) ? c.maxY + .3 : floor + (building ? Math.max(10, Math.min(24, Math.max(hx, hz) * 1.9)) : Math.max(2, Math.min(6, Math.max(hx, hz) * 2)));
    const ex = Math.abs(Math.cos(yaw)) * hx + Math.abs(Math.sin(yaw)) * hz;
    const ez = Math.abs(Math.sin(yaw)) * hx + Math.abs(Math.cos(yaw)) * hz;
    return { x: c.x, z: c.z, hx, hz, yaw, floor, top, building,
      box: new THREE.Box3(new THREE.Vector3(c.x - ex, floor + .12, c.z - ez), new THREE.Vector3(c.x + ex, top, c.z + ez)) };
  }
  function inVolume(p, v, margin = 0) {
    const dx = p.x - v.x, dz = p.z - v.z, co = Math.cos(v.yaw), si = Math.sin(v.yaw);
    return p.y >= v.floor - .3 && p.y <= v.top + margin
      && Math.abs(dx * co - dz * si) <= v.hx + margin && Math.abs(dx * si + dz * co) <= v.hz + margin;
  }
  function eligible(c) {
    if (!BUILDINGS.has(c.kind) && !PROPS.has(c.kind)) return false;
    if (![c.x, c.z].every(Number.isFinite) || c.surface !== undefined) return false;
    const size = Math.max(c.width ?? 0, c.depth ?? 0, (c.hx ?? c.r ?? 0) * 2, (c.hz ?? c.r ?? 0) * 2);
    return size > .05 && size < 48 && !burned.has(c);
  }

  function part(group, geometry, material, x, y, z, sx, sy, sz) {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
  }
  function addRubble(x, y, z, extent, height, isTree = false, name = 'Scenery') {
    const group = new THREE.Group(); group.name = `${name}: charred wreckage`;
    group.position.set(x, y, z); effects.add(group);
    const skeleton = new THREE.Group(); group.add(skeleton);
    if (isTree) {
      part(skeleton, trunk, black, 0, height / 2, 0, extent, height, extent);
      for (let i = 0; i < 3; i++) { const branch = part(skeleton, cube, black, (i - 1) * extent, height * (.52 + i * .12), 0, extent * .38, height * .27, extent * .35); branch.rotation.z = (i - 1.2) * .5; }
    }
    const pieces = isTree ? 5 : 9;
    for (let i = 0; i < pieces; i++) {
      const angle = i * 2.39996, distance = extent * (.18 + (i % 3) * .24);
      const mesh = part(group, cube, i % 4 === 0 ? ember : black, Math.sin(angle) * distance, .09 + (i % 3) * .045,
        Math.cos(angle) * distance, Math.max(.15, extent * .65), .12 + i % 2 * .08, Math.max(.1, extent * .13));
      mesh.rotation.set(i * .13, angle, .08 * (i % 3));
    }
    const record = { group, skeleton, age: 0, tree: isTree, chunks: [], height, direction: (x * .13 + z * .17) % 6.28 };
    debris.push(record);
    while (debris.length > DEVELOPER_DESTRUCTION.maxRubble) releaseDebris(debris.shift());
    return record;
  }
  function releaseDebris(d) {
    d.group.removeFromParent(); for (const mesh of d.chunks) mesh.geometry.dispose();
  }
  function burnTree(t, from) {
    if (treeChanges.has(t.id)) return false;
    const isWoodlot = !registry?.get(t.id) && world.woodlot, visuals = isWoodlot ? world.woodlot : registry;
    if (!visuals?.standing(t.id)) return false;
    const collider = colliders.find(c => c.id === t.id);
    // set() uses the exact registered instance slots, and permits this testing
    // weapon to burn protected trees without changing their harvesting policy.
    treeChanges.set(t.id, { visuals, collider });
    if (collider) takeCollider(collider);
    visuals.set(t.id, false);
    const base = t.base?.y ?? t.y ?? baseAt(t.x, t.z), h = clamp(t.height ?? 7, 2, 42);
    const d = addRubble(t.x, base, t.z, clamp(t.radius ?? .45, .22, 2.6), h, true, t.name ?? t.species ?? 'Tree');
    d.direction = from ? Math.atan2(t.x - from.x, t.z - from.z) : d.direction;
    active = true; reindex(); return true;
  }

  function refreshMeshes() {
    if (!meshDirty && colliderCount >= colliders.length) return;
    meshDirty = false; colliderCount = colliders.length; meshes = [];
    root.updateWorldMatrix(true, true);
    root.traverse(mesh => {
      if (!mesh.isMesh || mesh.isSkinnedMesh || mesh.isInstancedMesh || mesh.userData.liveTree || mesh.userData.developerEffect) return;
      const mat = mesh.material, geometry = mesh.geometry;
      if (!geometry?.attributes.position || Array.isArray(mat) || mat?.isShaderMaterial || mat?.transparent || NEVER.test(mesh.name)) return;
      let visible = true;
      for (let p = mesh; p; p = p.parent) {
        if (!p.visible || p.userData.developerEffect || p.userData.liveTree || p.userData.species || p.userData.actor || p.isBone) { visible = false; break; }
        if (p === root) break;
      }
      if (!visible) return;
      if (mesh.name !== SHARED_STATIC && !mesh.userData.developerDestructible && !(geometry.attributes.color && mesh.castShadow)) return;
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      const bounds = geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
      meshes.push({ mesh, bounds });
    });
  }
  function queueStructure(c) {
    if (burned.has(c) || unburnable.has(c) || jobs.some(job => job.collider === c) || jobs.length >= DEVELOPER_DESTRUCTION.maxPending) return false;
    refreshMeshes(); const v = volume(c), candidates = meshes.filter(m => m.bounds.intersectsBox(v.box));
    if (!candidates.length) return false;
    jobs.push({ collider: c, v, candidates, meshIndex: 0, offset: 0, pieces: [], positions: [], selected: 0 });
    active = true; return true;
  }
  function privateGeometry(mesh) {
    if (geometryChanges.has(mesh)) return geometryChanges.get(mesh).working;
    const original = mesh.geometry, working = new THREE.BufferGeometry();
    // Position/normal/color buffers stay read-only and shared. Only this mesh's
    // index buffer changes, not the shared source geometry or neighboring mesh.
    for (const [key, value] of Object.entries(original.attributes)) working.setAttribute(key, value);
    working.setIndex(original.index ? original.index.clone() : new THREE.BufferAttribute(Uint32Array.from({ length: original.attributes.position.count }, (_, i) => i), 1));
    working.groups = original.groups.map(group => ({ ...group }));
    working.setDrawRange(original.drawRange.start, original.drawRange.count);
    working.boundingBox = original.boundingBox?.clone() ?? null; working.boundingSphere = original.boundingSphere?.clone() ?? null;
    geometryChanges.set(mesh, { original, working }); mesh.geometry = working; return working;
  }
  const a = new THREE.Vector3(), b = new THREE.Vector3(), cPoint = new THREE.Vector3(), middle = new THREE.Vector3();
  function woodColor(mesh, geometry, index) {
    const col = geometry.attributes.color;
    const r = col ? col.getX(index) : mesh.material.color?.r ?? 0;
    const g = col ? col.getY(index) : mesh.material.color?.g ?? 0;
    const b = col ? col.getZ(index) : mesh.material.color?.b ?? 0;
    return r > .035 && r > g * 1.08 && g > b * 1.08 && r > b * 1.25;
  }
  function advanceJobs() {
    let budget = DEVELOPER_DESTRUCTION.trianglesPerTick;
    while (jobs.length && budget > 0) {
      const job = jobs[0], source = job.candidates[job.meshIndex];
      if (!source) { finishStructure(job); jobs.shift(); continue; }
      const { mesh } = source, geometry = mesh.geometry, pos = geometry.attributes.position;
      const indices = geometry.index, count = indices?.count ?? pos.count;
      let piece = job.pieces.at(-1);
      if (!piece || piece.mesh !== mesh) { piece = { mesh, offsets: [] }; job.pieces.push(piece); }
      for (; job.offset + 2 < count && budget > 0; job.offset += 3, budget--) {
        const ia = indices ? indices.getX(job.offset) : job.offset;
        const ib = indices ? indices.getX(job.offset + 1) : job.offset + 1;
        const ic = indices ? indices.getX(job.offset + 2) : job.offset + 2;
        if (ia === ib || ib === ic || ia === ic) continue;
        a.fromBufferAttribute(pos, ia).applyMatrix4(mesh.matrixWorld);
        b.fromBufferAttribute(pos, ib).applyMatrix4(mesh.matrixWorld);
        cPoint.fromBufferAttribute(pos, ic).applyMatrix4(mesh.matrixWorld);
        middle.copy(a).add(b).add(cPoint).multiplyScalar(1 / 3);
        if (middle.y <= job.v.floor + .12 || !inVolume(middle, job.v) || ![a, b, cPoint].every(p => inVolume(p, job.v, .45))) continue;
        // Generic prop colliders also represent stones; only their timber-colored
        // triangles burn. Authored building/wooden prop kinds carry their own intent.
        if (job.collider.kind === 'prop' && !woodColor(mesh, geometry, ia)) continue;
        piece.offsets.push(job.offset); job.selected++;
        if (job.positions.length < 18000) for (const p of [a, b, cPoint]) job.positions.push(p.x - job.v.x, p.y - job.v.floor, p.z - job.v.z);
      }
      if (job.offset + 2 >= count) { job.meshIndex++; job.offset = 0; }
    }
  }
  function finishStructure(job) {
    const { collider, v } = job;
    if (!job.selected) { unburnable.add(collider); return; }
    if (!colliders.includes(collider)) return;
    for (const piece of job.pieces) if (piece.offsets.length) {
      const geometry = privateGeometry(piece.mesh), indices = geometry.index;
      for (const offset of piece.offsets) { const first = indices.getX(offset); indices.setX(offset + 1, first); indices.setX(offset + 2, first); }
      indices.needsUpdate = true;
    }
    const d = addRubble(v.x, v.floor, v.z, Math.max(.45, Math.min(v.hx, v.hz)), v.top - v.floor, false, collider.id ?? collider.kind);
    if (job.positions.length) {
      const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(job.positions, 3)); geometry.computeVertexNormals();
      const fragment = new THREE.Mesh(geometry, black); fragment.castShadow = true; d.skeleton.add(fragment); d.chunks.push(fragment);
    }
    burned.add(collider); takeCollider(collider);
    // Small generated prop blockers inside a destroyed house must not leave
    // invisible stools and trim behind after the owning structure collapses.
    if (v.building) for (const other of [...colliders]) if (other.kind === 'prop'
      && inVolume(new THREE.Vector3(other.x, v.floor + .5, other.z), v)) takeCollider(other);
    destroyedStructures++; reindex();
  }

  function applyHits({ x, z, reach, intersects, from, dt }) {
    if (!allowed()) return emptyHit();
    const result = emptyHit(); dt = clamp(Number.isFinite(dt) ? dt : .1, 0, .5); if (!dt) return result;
    for (const tree of treesNear(x, z, reach + 5)) {
      if (treeChanges.has(tree.id)) continue;
      const floor = tree.base?.y ?? tree.y ?? baseAt(tree.x, tree.z), height = tree.height ?? 7;
      const target = intersects(tree.x, floor, tree.z, tree.radius ?? .45, floor + height);
      if (!target) continue;
      const treeCollider = (world.nearColliders ? world.nearColliders(tree.x, tree.z, 0, []) : colliders)
        .find(c => c.id === tree.id) ?? null;
      if (!canReach(from, target, treeCollider)) continue;
      const key = `tree:${tree.id}`, total = (heat.get(key) ?? 0) + dt; heat.set(key, total);
      if (total >= DEVELOPER_DESTRUCTION.treeHeat && burnTree(tree, from)) { heat.delete(key); result.trees++; }
    }
    const nearby = world.nearColliders ? world.nearColliders(x, z, reach + 24, []) : colliders;
    for (const collider of new Set(nearby)) {
      if (!eligible(collider)) continue;
      const v = volume(collider);
      const target = intersects(v.x, v.floor, v.z, Math.max(v.hx, v.hz), v.top);
      if (!target || !canReach(from, target, collider)) continue;
      const key = colliderId(collider), total = (heat.get(key) ?? 0) + dt; heat.set(key, total);
      if (total >= (v.building ? DEVELOPER_DESTRUCTION.buildingHeat : DEVELOPER_DESTRUCTION.propHeat)
        && queueStructure(collider)) { heat.delete(key); result.queued++; }
    }
    return result;
  }
  function hit({ origin, direction, range = 36, radius = 6, dt = .1 } = {}) {
    if (!allowed() || !finitePoint(origin) || !finitePoint(direction) || !Number.isFinite(range) || !Number.isFinite(radius)) return emptyHit();
    const dir = new THREE.Vector3(direction.x, direction.y, direction.z); if (dir.lengthSq() < 1e-8) return emptyHit(); dir.normalize();
    range = clamp(range, .1, 100); radius = clamp(radius, .1, 16);
    const mid = { x: origin.x + dir.x * range / 2, z: origin.z + dir.z * range / 2 };
    return applyHits({ ...mid, reach: range / 2 + radius, from: origin, dt,
      intersects(x, bottom, z, r, top) {
        let along = (x - origin.x) * dir.x + (z - origin.z) * dir.z;
        const horizontal = dir.x * dir.x + dir.z * dir.z;
        const y = clamp(origin.y + dir.y * clamp(horizontal > 1e-8 ? along / horizontal : 0, 0, range), bottom + .2, top);
        along += (y - origin.y) * dir.y;
        if (along < -r || along > range + r) return false;
        const t = clamp(along, 0, range), width = .5 + radius * t / range;
        // The visibility hook receives the object's center at beam height,
        // clamped to its physical vertical extent. The caller can accept first
        // contact with targetCollider itself; a target must not block its own
        // fire ray. Other cover is checked for EVERY target, not only along the
        // cone's center, so its wide edges cannot reach through a ridge or wall.
        return Math.hypot(x - origin.x - dir.x * t, y - origin.y - dir.y * t, z - origin.z - dir.z * t) <= width + r ? { x, y, z } : null;
      } });
  }
  function burnAt(x, y, z, radius = 3, dt = .5) {
    if (![x, y, z, radius].every(Number.isFinite) || radius <= 0) return emptyHit(); radius = Math.min(16, radius);
    return applyHits({ x, z, reach: radius, from: { x, y, z }, dt,
      intersects(tx, bottom, tz, r, top) { const targetY = clamp(y, bottom + .2, top);
        return Math.hypot(Math.max(0, Math.hypot(tx - x, tz - z) - r), y - targetY) <= radius ? { x: tx, y: targetY, z: tz } : null; } });
  }
  function tick(dt) {
    if (!allowed()) { if (active || jobs.length || heat.size) reset(); return; }
    dt = clamp(Number.isFinite(dt) ? dt : 0, 0, .1);
    advanceJobs();
    for (const [id, amount] of heat) { const remaining = amount - dt * .12; if (remaining <= 0) heat.delete(id); else heat.set(id, remaining); }
    for (const d of debris) {
      d.age += dt;
      if (d.tree) {
        d.skeleton.rotation.set(0, d.direction, Math.min(1.5, d.age ** 2 * 1.4));
        if (d.age > 2.5) d.skeleton.visible = false;
      } else {
        const collapse = Math.min(1, d.age / 1.2);
        d.skeleton.scale.y = Math.max(.035, 1 - collapse * collapse);
        d.skeleton.rotation.x = Math.sin(collapse * Math.PI) * .12;
        if (d.age > 2.2) d.skeleton.visible = false;
      }
    }
  }
  function reset() {
    jobs.length = 0; heat.clear();
    for (const [mesh, change] of geometryChanges) { mesh.geometry = change.original; change.working.dispose(); }
    geometryChanges.clear();
    for (const [id, change] of treeChanges) change.visuals.set(id, true);
    treeChanges.clear();
    // Preserve colliders added by Fast loading while the testing session ran.
    for (const collider of removed.keys()) { const at = colliders.indexOf(collider); if (at >= 0) colliders.splice(at, 1); }
    for (const [collider, index] of [...removed].sort((a, b) => a[1] - b[1])) colliders.splice(Math.min(index, colliders.length), 0, collider);
    removed.clear(); colliderOrder.clear(); burned.clear(); unburnable = new WeakSet();
    for (const d of debris) releaseDebris(d); debris.length = 0;
    destroyedStructures = 0; active = false; meshDirty = true; reindex();
  }
  function state() { return { active, trees: treeChanges.size, structures: destroyedStructures, pending: jobs.length,
    rubble: debris.length, affectedGeometry: geometryChanges.size }; }
  function dispose() { reset(); disposed = true; unsub?.(); effects.removeFromParent(); cube.dispose(); trunk.dispose(); black.dispose(); ember.dispose(); }
  return { hit, burnAt, tick, reset, state, dispose };
}
