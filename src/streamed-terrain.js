// Fast loading samples the same grid and colour stream as Full mode, but only
// allocates visible meshes around the regions currently being constructed.
export function createStreamedTerrain({ THREE, xs, zs, positions, colors, sample, sampled, root, material, cells, ids, tileSize = 24, originColumn = 0 }) {
  const columns = xs.length, tiles = new Set(), building = new Map();
  function indexAt(axis, value) {
    let low = 0, high = axis.length - 1;
    while (high - low > 1) { const mid = (low + high) >> 1; if (axis[mid] <= value) low = mid; else high = mid; }
    return Math.max(0, Math.min(axis.length - 2, low));
  }
  function vertex(i, j) { const index = j * columns + i; if (!sampled[index]) { sample(i, j); sampled[index] = 1; } }
  function ensureAt(x, z) {
    const i = indexAt(xs, x), j = indexAt(zs, z);
    vertex(i, j); vertex(i + 1, j); vertex(i, j + 1); vertex(i + 1, j + 1);
  }
  function ensureRibbon(vertices) {
    // Drape triangles can cross interior grid cells as well as their endpoints.
    for (let k = 0; k < vertices.length; k += 6) {
      // Include both edges of both rows. At a bend either next-row vertex can
      // be the furthest corner; omitting its left edge leaves holes in one of
      // the two triangles, even if the next segment later samples that point.
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (let v = k; v + 2 < Math.min(k + 12, vertices.length); v += 3) {
        minX = Math.min(minX, vertices[v]); maxX = Math.max(maxX, vertices[v]);
        minZ = Math.min(minZ, vertices[v + 2]); maxZ = Math.max(maxZ, vertices[v + 2]);
      }
      for (let j = indexAt(zs, minZ); j <= indexAt(zs, maxZ) + 1; j++)
        for (let i = indexAt(xs, minX); i <= indexAt(xs, maxX) + 1; i++) vertex(i, j);
    }
  }
  function* buildTile(tx, tz) {
    const key = `${tx}:${tz}`;
    if (tiles.has(key)) return;
    // Adjacent region jobs may preempt one another. Share unfinished tiles too,
    // so two paused iterators cannot publish duplicate meshes along the seam.
    if (!building.has(key)) building.set(key, constructTile(tx, tz));
    const iterator = building.get(key);
    while (true) { const step = iterator.next(); if (step.done) { building.delete(key); return; } yield; }
  }
  function* constructTile(tx, tz) {
    const key = `${tx}:${tz}`;
    if (tiles.has(key)) return;
    const x0 = Math.max(0,originColumn+tx*tileSize), z0 = tz * tileSize;
    const x1 = Math.min(columns - 1, originColumn+(tx+1)*tileSize), z1 = Math.min(zs.length - 1, z0 + tileSize);
    if (x0 >= x1 || z0 >= z1) return;
    const width = x1 - x0 + 1, height = z1 - z0 + 1;
    const p = new Float32Array(width * height * 3), c = new Float32Array(p.length), indices = [];
    for (let j = z0; j <= z1; j++) {
      for (let i = x0; i <= x1; i++) {
        vertex(i, j);
        const source = (j * columns + i) * 3, target = ((j - z0) * width + i - x0) * 3;
        p.set(positions.subarray(source, source + 3), target); c.set(colors.subarray(source, source + 3), target);
        if (i < x1 && j < z1) { const a = target / 3; indices.push(a, a + width, a + 1, a + 1, a + width, a + width + 1); }
      }
      yield;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(p, 3)); geometry.setAttribute('color', new THREE.BufferAttribute(c, 3));
    geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material); mesh.receiveShadow = true; mesh.name = `Terrain ${key}`;
    root.add(mesh); tiles.add(key); yield;
  }
  function* buildRegion(id) {
    const name = Object.keys(ids).find(name => ids[name] === id), wanted = new Set();
    for (const cell of cells[name] ?? []) {
      // One hex plus a shore/seam apron. Adjacent regions share these tiles.
      const minX = Math.floor((indexAt(xs, cell.x - 110)-originColumn) / tileSize), maxX = Math.floor((indexAt(xs, cell.x + 110)-originColumn) / tileSize);
      const minZ = Math.floor(indexAt(zs, cell.z - 110) / tileSize), maxZ = Math.floor(indexAt(zs, cell.z + 110) / tileSize);
      for (let z = minZ; z <= maxZ; z++) for (let x = minX; x <= maxX; x++) wanted.add(`${x}:${z}`);
    }
    for (const key of wanted) { const [x, z] = key.split(':').map(Number); yield* buildTile(x, z); }
  }
  function* buildBounds(bounds, padding = 0) {
    const minX = Math.floor((indexAt(xs, bounds.minX - padding) - originColumn) / tileSize);
    const maxX = Math.floor((indexAt(xs, bounds.maxX + padding) - originColumn) / tileSize);
    const minZ = Math.floor(indexAt(zs, bounds.minZ - padding) / tileSize);
    const maxZ = Math.floor(indexAt(zs, bounds.maxZ + padding) / tileSize);
    for (let z = minZ; z <= maxZ; z++) for (let x = minX; x <= maxX; x++) yield* buildTile(x, z);
  }
  return { ensureAt, ensureRibbon, buildRegion, buildBounds, tileCount: () => tiles.size };
}
