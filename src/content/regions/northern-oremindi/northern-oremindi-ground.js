import { finishBuild } from '../../../world/loading/build-steps.js';
import { northernInset } from './northern-oremindi-world.js';

const SPACING = 4, BORDER = 10, FEATHER = 10, BUCKET = 8;
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const key = p => `${p.x},${p.z}`;
const edgeKey = (a, b) => { const first = key(a), second = key(b); return first < second ? `${first}|${second}` : `${second}|${first}`; };
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const overlaps = (box, b) => !box || box.max.x >= b.minX && box.min.x <= b.maxX && box.max.z >= b.minZ && box.min.z <= b.maxZ;

/** Refine only Northern mountain's indexed ground faces. Terrain geometry uses
 * world-space X/Z, as the global terrain builder does. Existing shared vertex
 * attributes and deliberately local tile bounds are never copied or recomputed.
 * Every replacement face stays inside its original triangle; the outer 10 m
 * and exposed patch edges retain that triangle's exact plane.
 *
 * heightAt is the final analytic ground; coarseHeightAt samples the original
 * displayed triangles. The returned heightAt samples the new FLOAT32 triangles
 * through local buckets, then falls back to coarseHeightAt. tintAt is optional;
 * without it, vertex colours interpolate the existing terrain palette.
 */
export function refineNorthernGround(...args) { return finishBuild(refineNorthernGroundSteps(...args)); }
export function* refineNorthernGroundSteps({ THREE, terrainRoot, heightAt, coarseHeightAt, tintAt = null, profile }) {
  const regionBounds=profile.bounds, owns=profile.owns;
  let buildWork = 0;
  if (!THREE || !terrainRoot?.traverse || typeof heightAt !== 'function' || typeof coarseHeightAt !== 'function')
    throw new TypeError('Northern mountain refinement requires THREE, terrainRoot, analytic heightAt and coarseHeightAt.');
  const tiles = [], patches = [], edges = new Map(), vertexCaches = new WeakMap();
  let longest = 0, visited = 0;
  const sourceMeshes = []; terrainRoot.traverse(mesh => sourceMeshes.push(mesh));
  for (const mesh of sourceMeshes) { if ((++buildWork & 31) === 0) yield;
    if (!mesh.isMesh) continue;
    if (mesh.userData.northernGround) continue;
    if (mesh.userData.northernRefined?.[profile.id]) continue;
    const geometry = mesh.geometry, position = geometry?.attributes.position, index = geometry?.index;
    if (!position || !index || !overlaps(geometry.boundingBox, regionBounds)) continue;
    let cache = vertexCaches.get(position);
    if (!cache) { cache = new Map(); vertexCaches.set(position, cache); }
    const vertex = id => {
      if (!cache.has(id)) {
        const p = { x: position.getX(id), y: position.getY(id), z: position.getZ(id) };
        p.owned = owns(p.x, p.z); p.inset = p.owned ? northernInset(p.x, p.z) : 0;
        cache.set(id, p);
      }
      return cache.get(id);
    };
    const keep = [], faces = [];
    for (let i = 0; i < index.count; i += 3) { if ((++buildWork & 31) === 0) yield;
      visited++;
      const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)], p = ids.map(vertex);
      // Border-crossing source faces stay completely unchanged. Their neighbours
      // are stitched below, even if a coarse mesh has unusually long edges.
      if (!p.every(v => v.owned) || Math.max(...p.map(v => v.inset)) <= BORDER) { keep.push(...ids); continue; }
      faces.push({ ids, p });
      for (let j = 0; j < 3; j++) { if ((++buildWork & 31) === 0) yield;
        const a = p[j], b = p[(j + 1) % 3], k = edgeKey(a, b);
        longest = Math.max(longest, gap(a, b));
        const edge = edges.get(k);
        if (edge) edge.count++; else edges.set(k, { a, b, count: 1 });
      }
    }
    if (faces.length) tiles.push({ mesh, geometry, keep, faces });
  }
  const exposed = [...edges.values()].filter(edge => edge.count === 1);
  const edgeDistance = yield* boundaryDistanceSteps(exposed);
  const divisions = Math.max(1, Math.ceil(longest / SPACING));
  let removedTriangles = 0, newVertices = 0, newTriangles = 0;
  for (const { mesh, geometry, keep, faces } of tiles) { if ((++buildWork & 31) === 0) yield;
    const positions = [], colors = [], indices = [], vertices = new Map();
    const sourceColor = geometry.attributes.color, tint = new THREE.Color();
    for (const { ids, p: [a, b, c] } of faces) { if ((++buildWork & 31) === 0) yield;
      const determinant = (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
      const rows = [];
      for (let i = 0; i <= divisions; i++) { if ((++buildWork & 31) === 0) yield;
        const row = [];
        for (let j = 0; j <= divisions - i; j++) { if ((++buildWork & 31) === 0) yield;
          const u = i / divisions, v = j / divisions, w = 1 - u - v;
          const x = Math.fround(a.x * w + b.x * u + c.x * v), z = Math.fround(a.z * w + b.z * u + c.z * v);
          const k = `${x},${z}`;
          let id = vertices.get(k);
          if (id === undefined) {
            // Evaluate the OLD face at the representable new X/Z, rather than
            // interpolating Y at an unrounded point that the GPU cannot draw.
            const bu = ((x - a.x) * (c.z - a.z) - (z - a.z) * (c.x - a.x)) / determinant;
            const cv = ((b.x - a.x) * (z - a.z) - (b.z - a.z) * (x - a.x)) / determinant, aw = 1 - bu - cv;
            const plane = a.y * aw + b.y * bu + c.y * cv;
            const inset = northernInset(x, z), edge = edgeDistance(x, z);
            const strength = smooth(BORDER, BORDER + FEATHER, inset) * smooth(0, FEATHER, edge);
            const y = strength ? plane + (heightAt(x, z) - plane) * strength : plane;
            id = positions.length / 3; vertices.set(k, id); positions.push(x, y, z);
            if (sourceColor || tintAt) {
              const shade = tintAt && strength > 0 ? tintAt(x, z, y) : null;
              if (sourceColor) tint.setRGB(sourceColor.getX(ids[0]) * aw + sourceColor.getX(ids[1]) * bu + sourceColor.getX(ids[2]) * cv,
                sourceColor.getY(ids[0]) * aw + sourceColor.getY(ids[1]) * bu + sourceColor.getY(ids[2]) * cv,
                sourceColor.getZ(ids[0]) * aw + sourceColor.getZ(ids[1]) * bu + sourceColor.getZ(ids[2]) * cv);
              else tint.set('#ffffff');
              if (shade !== null) tint.lerp(new THREE.Color(shade), strength);
              colors.push(tint.r, tint.g, tint.b);
            }
          }
          row.push(id);
        }
        rows.push(row);
      }
      for (let i = 0; i < divisions; i++) { if ((++buildWork & 31) === 0) yield; for (let j = 0; j < divisions - i; j++) { if ((++buildWork & 31) === 0) yield;
        indices.push(rows[i][j], rows[i + 1][j], rows[i][j + 1]);
        if (j < divisions - i - 1) indices.push(rows[i + 1][j], rows[i + 1][j + 1], rows[i][j + 1]);
      } }
    }
    const fine = new THREE.BufferGeometry();
    fine.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    if (colors.length) fine.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    fine.setIndex(indices); fine.computeVertexNormals(); fine.computeBoundingBox(); fine.computeBoundingSphere();
    const patch = new THREE.Mesh(fine, mesh.material);
    patch.name = `Northern mountain refined ground: ${mesh.name}`; patch.receiveShadow = mesh.receiveShadow;
    patch.castShadow = mesh.castShadow; patch.userData.northernGround = profile.id;
    patch.position.copy(mesh.position); patch.quaternion.copy(mesh.quaternion); patch.scale.copy(mesh.scale);
    geometry.setIndex(keep); (mesh.userData.northernRefined ??= {})[profile.id] = true;
    mesh.parent.add(patch); patches.push(patch);
    removedTriangles += faces.length; newVertices += positions.length / 3; newTriangles += indices.length / 3;
  }
  const sampler = yield* triangleSamplerSteps(patches, coarseHeightAt, regionBounds);
  return { patches, heightAt: sampler.heightAt,
    metrics: { patches: patches.length, refinedTiles: tiles.length, sourceTrianglesVisited: visited, removedTriangles,
      vertices: newVertices, triangles: newTriangles, divisions, spacing: longest / divisions,
      preservedBorder: BORDER, boundaryEdges: exposed.length, lookupBuckets: sampler.bucketCount } };
}

function* boundaryDistanceSteps(edges) {
  let buildWork = 0;
  const buckets = new Map(), size = 20;
  for (const edge of edges) { if ((++buildWork & 31) === 0) yield;
    const { a, b } = edge;
    for (let ix = Math.floor((Math.min(a.x, b.x) - FEATHER) / size); ix <= Math.floor((Math.max(a.x, b.x) + FEATHER) / size); ix++)
      { if ((++buildWork & 31) === 0) yield; for (let iz = Math.floor((Math.min(a.z, b.z) - FEATHER) / size); iz <= Math.floor((Math.max(a.z, b.z) + FEATHER) / size); iz++) { if ((++buildWork & 31) === 0) yield;
        const k = `${ix},${iz}`; if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(edge);
      } }
  }
  return (x, z) => {
    let nearest = Infinity;
    for (const { a, b } of buckets.get(`${Math.floor(x / size)},${Math.floor(z / size)}`) ?? []) {
      const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
      nearest = Math.min(nearest, Math.hypot(x - a.x - dx * t, z - a.z - dz * t));
    }
    return nearest;
  };
}

function* triangleSamplerSteps(patches, fallback, regionBounds) {
  let buildWork = 0;
  const buckets = new Map(), minX = Math.floor(regionBounds.minX / BUCKET) - 1;
  const minZ = Math.floor(regionBounds.minZ / BUCKET) - 1;
  const columns = Math.ceil(regionBounds.maxX / BUCKET) - minX + 2;
  const bucketKey = (ix, iz) => (iz - minZ) * columns + ix - minX;
  const geometries = patches.map(mesh => ({ positions: mesh.geometry.attributes.position.array, indices: mesh.geometry.index.array }));
  for (let g = 0; g < geometries.length; g++) { if ((++buildWork & 31) === 0) yield;
    const { positions: p, indices } = geometries[g];
    for (let i = 0; i < indices.length; i += 3) { if ((++buildWork & 31) === 0) yield;
      const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
      for (let ix = Math.floor(Math.min(p[a], p[b], p[c]) / BUCKET); ix <= Math.floor(Math.max(p[a], p[b], p[c]) / BUCKET); ix++)
        { if ((++buildWork & 31) === 0) yield; for (let iz = Math.floor(Math.min(p[a + 2], p[b + 2], p[c + 2]) / BUCKET); iz <= Math.floor(Math.max(p[a + 2], p[b + 2], p[c + 2]) / BUCKET); iz++) { if ((++buildWork & 31) === 0) yield;
          const k = bucketKey(ix, iz); if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(g, i);
        } }
    }
  }
  return { bucketCount: buckets.size, heightAt(x, z) {
    const bounds = regionBounds;
    if (x < bounds.minX || x > bounds.maxX || z < bounds.minZ || z > bounds.maxZ) return fallback(x, z);
    const bucket = buckets.get(bucketKey(Math.floor(x / BUCKET), Math.floor(z / BUCKET)));
    if (bucket) for (let i = 0; i < bucket.length; i += 2) {
      const { positions: p, indices } = geometries[bucket[i]], offset = bucket[i + 1];
      const a = indices[offset] * 3, b = indices[offset + 1] * 3, c = indices[offset + 2] * 3;
      const dx = x - p[a], dz = z - p[a + 2], bx = p[b] - p[a], bz = p[b + 2] - p[a + 2], cx = p[c] - p[a], cz = p[c + 2] - p[a + 2];
      const determinant = bx * cz - bz * cx;
      if (Math.abs(determinant) < 1e-12) continue;
      const u = (dx * cz - dz * cx) / determinant, v = (bx * dz - bz * dx) / determinant;
      if (u >= -1e-6 && v >= -1e-6 && u + v <= 1.000001) return p[a + 1] + (p[b + 1] - p[a + 1]) * u + (p[c + 1] - p[a + 1]) * v;
    }
    return fallback(x, z);
  } };
}
