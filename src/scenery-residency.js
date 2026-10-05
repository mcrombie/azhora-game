/** Park distant scene roots without rebuilding or resetting their mutable state.
 * CPU objects remain the authority for felled trees, doors and destruction.
 * GPU geometry/instance buffers are released and Three uploads them on return. */
export function createSceneryResidency({ boundsFor, near = 1400, far = 1800 } = {}) {
  const records = new Map(), assets = new Map(), pinned = new WeakSet();
  let position = null, disposed = 0, parked = 0, restored = 0;
  function pin(root) { root.traverse(o => { if (o.geometry) pinned.add(o.geometry); }); }
  function* register(root, regions) {
    if (records.has(root)) return;
    const record = { root, regions: [...regions], parent: root.parent, resident: true, geometries: new Set(), instances: [] };
    const stack = [root]; let work = 0;
    while (stack.length) {
      if (++work % 64 === 0) yield;
      const node = stack.pop(); stack.push(...node.children);
      if (node.geometry) record.geometries.add(node.geometry);
      if (node.isInstancedMesh) record.instances.push(node);
    }
    for (const geometry of record.geometries) {
      if (!assets.has(geometry)) assets.set(geometry, new Set());
      assets.get(geometry).add(record);
    }
    records.set(root, record);
    if (position) updateRecord(record);
  }
  function distance(record) {
    return Math.min(...record.regions.map(id => {
      const b = boundsFor(id); if (!b) return 0;
      return Math.hypot(Math.max(b.minX-position.x, 0, position.x-b.maxX), Math.max(b.minZ-position.z, 0, position.z-b.maxZ));
    }));
  }
  function updateRecord(record) {
    const gap = distance(record);
    if (record.resident && gap > far) {
      record.resident = false; record.root.removeFromParent(); parked++;
      for (const instance of record.instances) instance.dispose();
      for (const geometry of record.geometries) if (!pinned.has(geometry) && ![...assets.get(geometry)].some(r => r.resident)) {
        geometry.dispose(); disposed++;
      }
    } else if (!record.resident && gap < near) {
      record.parent.add(record.root); record.resident = true; restored++;
    }
  }
  function update(at) {
    if (!at || !Number.isFinite(at.x) || !Number.isFinite(at.z)) return;
    position = { x: at.x, z: at.z };
    for (const record of records.values()) updateRecord(record);
  }
  function state() {
    return { tracked: records.size, resident: [...records.values()].filter(r=>r.resident).length,
      parked: [...records.values()].filter(r=>!r.resident).length, geometryDisposals: disposed, parks: parked, restores: restored,
      cpuStateRetained: true };
  }
  return { pin, register, update, state };
}
