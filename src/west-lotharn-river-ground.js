import { finishBuild } from './build-steps.js';
import { WEST_LOTHARN_WATERS, courseDistance } from './west-regions.js';
import { westLotharnTerrainSink } from './west-lotharn-world.js';

export const WEST_LOTHARN_RIVER_GROUND = Object.freeze({ spacing: 1.5, bank: 1.5, feather: 3, bucket: 4 });
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const edgeKey = (a, b) => { const u = `${a.x},${a.z}`, v = `${b.x},${b.z}`; return u < v ? `${u}|${v}` : `${v}|${u}`; };
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/** Distance beyond the largest wetted half-width; negative inside the water. */
export function westLotharnRiverBankDistance(x, z, limit = Infinity) {
  let best = Infinity;
  for (const course of WEST_LOTHARN_WATERS) {
    const b = course.bounds, reach = course.maxHalf + limit;
    if (x < b.minX - reach || x > b.maxX + reach || z < b.minZ - reach || z > b.maxZ + reach) continue;
    best = Math.min(best, courseDistance(course, x, z) - course.maxHalf);
  }
  return best;
}

/** Replace ground faces beside the becks, never their physical heightfield or
 * water. Coarse 7.1m triangles bridge these 2–4m channels; a lower overlay alone
 * cannot uncover them. Both the global ground and the 3m mountain layer need
 * replacement. Their separate source boundaries retain the old face planes.
 * The returned sampler reads the actual Float32 replacement triangles.
 */
export function refineWestLotharnRiverGround(...args) { return finishBuild(refineWestLotharnRiverGroundSteps(...args)); }
export function* refineWestLotharnRiverGroundSteps({ THREE, terrainRoot, mountainRoot, heightAt, coarseHeightAt }) {
  const started = performance.now();
  let work = 0;
  const { bank, feather, spacing } = WEST_LOTHARN_RIVER_GROUND, reach = bank + feather;
  const patches = [], boundaries = [], layers = [], heights = new Map();
  const physical = (x, z) => { const k = `${x},${z}`; if (!heights.has(k)) heights.set(k, heightAt(x, z)); return heights.get(k); };
  for (const [root, mountain] of [[terrainRoot, false], [mountainRoot, true]]) {
    if (!root) continue;
    const sources = []; root.traverse(mesh => {
      if (mesh.isMesh && (!mountain || mesh.name === 'West Lotharn summits ground')
        && !mesh.userData.westLotharnRiverGround && !mesh.userData.westLotharnRiverRefined) sources.push(mesh);
    });
    const tiles = [], retained = [], edges = new Map(); let longest = 0;
    for (const mesh of sources) { if ((++work & 31) === 0) yield;
      const geometry = mesh.geometry, position = geometry.attributes.position, index = geometry.index;
      if (!position || !index) continue;
      const box = geometry.boundingBox ?? (geometry.computeBoundingBox(), geometry.boundingBox);
      const overlaps = margin => WEST_LOTHARN_WATERS.some(c => box.max.x >= c.bounds.minX - c.maxHalf - margin
        && box.min.x <= c.bounds.maxX + c.maxHalf + margin && box.max.z >= c.bounds.minZ - c.maxHalf - margin
        && box.min.z <= c.bounds.maxZ + c.maxHalf + margin);
      if (!overlaps(12)) continue;
      retained.push(mesh);
      if (!overlaps(reach)) continue;
      const keep = [], faces = [];
      for (let offset = 0; offset < index.count; offset += 3) { if ((++work & 255) === 0) yield;
        const ids = [index.getX(offset), index.getX(offset + 1), index.getX(offset + 2)];
        const p = ids.map(id => ({ x: position.getX(id), y: position.getY(id), z: position.getZ(id) }));
        const x = (p[0].x + p[1].x + p[2].x) / 3, z = (p[0].z + p[1].z + p[2].z) / 3;
        const radius = Math.max(...p.map(v => Math.hypot(v.x - x, v.z - z)));
        if (westLotharnRiverBankDistance(x, z, reach + radius) > reach + radius) { keep.push(...ids); continue; }
        faces.push({ ids, p });
        for (let i = 0; i < 3; i++) {
          const a = p[i], b = p[(i + 1) % 3], key = edgeKey(a, b), edge = edges.get(key);
          longest = Math.max(longest, distance(a, b));
          if (edge) edge.count++; else edges.set(key, { a, b, count: 1 });
        }
      }
      if (faces.length) tiles.push({ mesh, geometry, keep, faces });
    }
    const exposed = [...edges.values()].filter(edge => edge.count === 1);
    boundaries.push(...exposed.map(edge => ({ ...edge, mountain })));
    layers.push({ tiles, retained, mountain, exposed, divisions: Math.max(1, Math.ceil(longest / spacing)) });
  }
  let removedTriangles = 0;
  for (const { tiles, mountain, exposed, divisions } of layers) {
    const boundaryAt = boundaryDistance(exposed, feather);
    for (const { mesh, geometry, keep, faces } of tiles) { if ((++work & 31) === 0) yield;
      const positions = [], colors = [], indices = [], vertices = new Map(), sourceColor = geometry.attributes.color;
      for (const { ids, p: [a, b, c] } of faces) { if ((++work & 31) === 0) yield;
        const determinant = (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x), rows = [];
        for (let i = 0; i <= divisions; i++) {
          const row = [];
          for (let j = 0; j <= divisions - i; j++) { if ((++work & 127) === 0) yield;
            const u = i / divisions, v = j / divisions, w = 1 - u - v;
            const x = Math.fround(a.x * w + b.x * u + c.x * v), z = Math.fround(a.z * w + b.z * u + c.z * v), key = `${x},${z}`;
            let id = vertices.get(key);
            if (id === undefined) {
              const bu = ((x - a.x) * (c.z - a.z) - (z - a.z) * (c.x - a.x)) / determinant;
              const cv = ((b.x - a.x) * (z - a.z) - (b.z - a.z) * (x - a.x)) / determinant, aw = 1 - bu - cv;
              const plane = a.y * aw + b.y * bu + c.y * cv;
              const strength = (1 - smooth(bank, reach, westLotharnRiverBankDistance(x, z, reach)))
                * smooth(0, feather, boundaryAt(x, z));
              const target = strength ? physical(x, z) - (mountain ? 0 : westLotharnTerrainSink(x, z)) : plane;
              id = positions.length / 3; vertices.set(key, id); positions.push(x, plane + (target - plane) * strength, z);
              if (sourceColor) colors.push(...[0, 1, 2].map(k => sourceColor.array[ids[0] * 3 + k] * aw
                + sourceColor.array[ids[1] * 3 + k] * bu + sourceColor.array[ids[2] * 3 + k] * cv));
            }
            row.push(id);
          }
          rows.push(row);
        }
        for (let i = 0; i < divisions; i++) for (let j = 0; j < divisions - i; j++) {
          indices.push(rows[i][j], rows[i + 1][j], rows[i][j + 1]);
          if (j < divisions - i - 1) indices.push(rows[i + 1][j], rows[i + 1][j + 1], rows[i][j + 1]);
        }
      }
      const fine = new THREE.BufferGeometry();
      fine.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      if (colors.length) fine.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      fine.setIndex(indices); fine.computeVertexNormals(); fine.computeBoundingBox(); fine.computeBoundingSphere();
      const patch = new THREE.Mesh(fine, mesh.material);
      patch.name = `West Lotharn beck ground: ${mesh.name}`; patch.receiveShadow = mesh.receiveShadow; patch.castShadow = mesh.castShadow;
      patch.userData.westLotharnRiverGround = true; patch.userData.mountain = mountain;
      geometry.setIndex(keep); mesh.userData.westLotharnRiverRefined = true; mesh.parent.add(patch);
      patches.push(patch); removedTriangles += faces.length;
    }
  }
  // Include retained faces beside the patch as well. At the Kemrath overlap a
  // coarse face can stand above its mountain neighbour; tree feet need the
  // highest actually drawn surface, not whichever layer was sampled last.
  const surfaces = [...patches.map(mesh => ({ mesh, mountain: mesh.userData.mountain })),
    ...layers.flatMap(layer => layer.retained.map(mesh => ({ mesh, mountain: layer.mountain })))];
  const sample = yield* triangleSamplerSteps(surfaces, coarseHeightAt);
  return { patches, boundaries, heightAt: sample,
    metrics: { patches: patches.length, removedTriangles, vertices: patches.reduce((n, p) => n + p.geometry.attributes.position.count, 0),
      triangles: patches.reduce((n, p) => n + p.geometry.index.count / 3, 0), sampledHeights: heights.size,
      milliseconds: performance.now() - started } };
}

function boundaryDistance(edges, reach) {
  const buckets = new Map(), size = 12;
  for (const edge of edges) for (let x = Math.floor((Math.min(edge.a.x, edge.b.x) - reach) / size); x <= Math.floor((Math.max(edge.a.x, edge.b.x) + reach) / size); x++)
    for (let z = Math.floor((Math.min(edge.a.z, edge.b.z) - reach) / size); z <= Math.floor((Math.max(edge.a.z, edge.b.z) + reach) / size); z++) {
      const k = `${x},${z}`; if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(edge);
    }
  return (x, z) => {
    let best = Infinity;
    for (const { a, b } of buckets.get(`${Math.floor(x / size)},${Math.floor(z / size)}`) ?? []) {
      const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
      best = Math.min(best, Math.hypot(x - a.x - dx * t, z - a.z - dz * t));
    }
    return best;
  };
}

function* triangleSamplerSteps(surfaces, fallback) {
  const size = WEST_LOTHARN_RIVER_GROUND.bucket, buckets = new Map(); let work = 0;
  for (const { mesh } of surfaces) {
    const p = mesh.geometry.attributes.position.array, indices = mesh.geometry.index.array;
    for (let offset = 0; offset < indices.length; offset += 3) { if ((++work & 255) === 0) yield;
      const a = indices[offset] * 3, b = indices[offset + 1] * 3, c = indices[offset + 2] * 3, triangle = { p, a, b, c };
      if (!mesh.userData.westLotharnRiverGround) {
        const x = (p[a] + p[b] + p[c]) / 3, z = (p[a + 2] + p[b + 2] + p[c + 2]) / 3;
        const radius = Math.max(...[a, b, c].map(i => Math.hypot(p[i] - x, p[i + 2] - z)));
        if (westLotharnRiverBankDistance(x, z, 12 + radius) > 12 + radius) continue;
      }
      for (let x = Math.floor(Math.min(p[a], p[b], p[c]) / size); x <= Math.floor(Math.max(p[a], p[b], p[c]) / size); x++)
        for (let z = Math.floor(Math.min(p[a + 2], p[b + 2], p[c + 2]) / size); z <= Math.floor(Math.max(p[a + 2], p[b + 2], p[c + 2]) / size); z++) {
          const key = `${x},${z}`; if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push(triangle);
        }
    }
  }
  return (x, z) => {
    if (westLotharnRiverBankDistance(x, z, 12) > 12) return fallback(x, z);
    let result = -Infinity;
    for (const { p, a, b, c } of buckets.get(`${Math.floor(x / size)},${Math.floor(z / size)}`) ?? []) {
      const dx = x - p[a], dz = z - p[a + 2], bx = p[b] - p[a], bz = p[b + 2] - p[a + 2], cx = p[c] - p[a], cz = p[c + 2] - p[a + 2];
      const determinant = bx * cz - bz * cx;
      if (Math.abs(determinant) < 1e-12) continue;
      const u = (dx * cz - dz * cx) / determinant, v = (bx * dz - bz * dx) / determinant;
      if (u >= -1e-6 && v >= -1e-6 && u + v <= 1.000001) {
        result = Math.max(result, p[a + 1] + (p[b + 1] - p[a + 1]) * u + (p[c + 1] - p[a + 1]) * v);
      }
    }
    return result === -Infinity ? fallback(x, z) : result;
  };
}
