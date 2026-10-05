import * as THREE from 'three';
import { groundTint } from './world-terrain.js';
import { SUVAL_TERRAIN_PATCHES, SUVAL_PEAK_CRAGS, highlandFineDistance } from './suval-highlands.js';
import { imlamdrisTerrainSink } from './south-suval-world.js';

// The existing mesh crosses these four countries, including Luscia's western
// ridge. Ground readiness must not depend on loading the later Suval scenery.
export const SUVAL_GROUND_REGIONS = Object.freeze([2, 4, 5, 18]);
const hash = value => { const n = Math.sin(value * 12.9898 + 78.233) * 43758.5453; return n - Math.floor(n); };
const smooth = (a, b, value) => { const t = Math.max(0, Math.min(1, (value - a) / (b - a))); return t * t * (3 - 2 * t); };
function triangleHeight(x, z, a, b, c) {
  const den = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
  const u = ((b.z - c.z) * (x - c.x) + (c.x - b.x) * (z - c.z)) / den;
  const v = ((c.z - a.z) * (x - c.x) + (a.x - c.x) * (z - c.z)) / den;
  return u >= -1e-8 && v >= -1e-8 && u + v <= 1 + 1e-8 ? a.y * u + b.y * v + c.y * (1 - u - v) : -Infinity;
}

/** Available before initial-region foliage is constructed. Heights and masks are
 * filled lazily, then reused by the ground job. This is the emitted Float32
 * surface, including the unchanged irregular limestone skin, not analytic soil. */
export function createSuvalGroundSurface(groundHeight) {
  const patches = SUVAL_TERRAIN_PATCHES.map(patch => {
    const nx = Math.ceil((patch.maxX - patch.minX) / patch.step), nz = Math.ceil((patch.maxZ - patch.minZ) / patch.step);
    const heights = new Float32Array((nx + 1) * (nz + 1)).fill(NaN), mask = new Int8Array(nx * nz).fill(-1);
    const xAt = i => patch.minX + (patch.maxX - patch.minX) * i / nx;
    const zAt = j => patch.minZ + (patch.maxZ - patch.minZ) * j / nz;
    const kept = (i, j) => {
      if (i < 0 || j < 0 || i >= nx || j >= nz) return false;
      const key = j * nx + i;
      if (mask[key] < 0) mask[key] = highlandFineDistance(xAt(i + .5), zAt(j + .5)) <= 30 && imlamdrisTerrainSink(xAt(i + .5), zAt(j + .5)) <= 1 ? 1 : 0;
      return mask[key] === 1;
    };
    const heightOf = (i, j) => {
      const key = j * (nx + 1) + i;
      if (Number.isNaN(heights[key])) heights[key] = groundHeight(xAt(i), zAt(j));
      return heights[key];
    };
    const point = (i, j) => ({ x: Math.fround(xAt(i)), z: Math.fround(zAt(j)), y: heightOf(i, j) });
    return { ...patch, nx, nz, xAt, zAt, kept, heightOf, point };
  });
  const rocks = SUVAL_PEAK_CRAGS, bucketSize = 16, buckets = new Map(), step = 2;
  for (const rock of rocks) {
    const key = `${Math.floor(rock.x / bucketSize)},${Math.floor(rock.z / bucketSize)}`;
    if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push(rock);
  }
  const coverage = (x, z) => {
    const bx = Math.floor(x / bucketSize), bz = Math.floor(z / bucketSize); let weight = 0;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) for (const rock of buckets.get(`${bx + dx},${bz + dz}`) ?? [])
      weight = Math.max(weight, 1 - smooth(.4, 1.5, Math.hypot(x - rock.x, z - rock.z) / rock.radius));
    return weight;
  };
  const minX = Math.floor(Math.min(...rocks.map(rock => rock.x - rock.radius * 1.6)) / step) * step;
  const maxX = Math.ceil(Math.max(...rocks.map(rock => rock.x + rock.radius * 1.6)) / step) * step;
  const minZ = Math.floor(Math.min(...rocks.map(rock => rock.z - rock.radius * 1.6)) / step) * step;
  const maxZ = Math.ceil(Math.max(...rocks.map(rock => rock.z + rock.radius * 1.6)) / step) * step;
  const nx = (maxX - minX) / step, nz = (maxZ - minZ) / step;
  const heights = new Float32Array((nx + 1) * (nz + 1)).fill(NaN), mask = new Int8Array(nx * nz).fill(-1);
  const point = (i, j) => {
    const x = minX + i * step + (hash(i * 31 + j * 17) - .5) * .65;
    const z = minZ + j * step + (hash(i * 43 + j * 29) - .5) * .65;
    return { key: `${i},${j}`, i, j, x, z, weight: coverage(x, z) };
  };
  const heightOf = p => {
    const key = p.j * (nx + 1) + p.i;
    if (Number.isNaN(heights[key])) heights[key] = groundHeight(p.x, p.z) + .045 + p.weight * (.07 + hash(p.x * .7 + p.z * .3) * .19);
    return heights[key];
  };
  const skin = { minX, minZ, maxX, maxZ, nx, nz, step, point, heightOf, mask };
  const fineGroundHeight = (x, z) => {
    let y = -Infinity;
    for (const patch of patches) {
      if (x < patch.minX || x > patch.maxX || z < patch.minZ || z > patch.maxZ) continue;
      const fx = (x - patch.minX) / patch.step, fz = (z - patch.minZ) / patch.step;
      const ix = Math.floor(fx), iz = Math.floor(fz);
      // On a cell edge the retained neighbour is also a real support surface.
      for (let j = iz - (Math.abs(fz - iz) < 1e-7 ? 1 : 0); j <= iz; j++)
        for (let i = ix - (Math.abs(fx - ix) < 1e-7 ? 1 : 0); i <= ix; i++) if (patch.kept(i, j)) {
          const a = patch.point(i, j), b = patch.point(i + 1, j), c = patch.point(i, j + 1), d = patch.point(i + 1, j + 1);
          y = Math.max(y, triangleHeight(x, z, a, c, b), triangleHeight(x, z, b, c, d));
        }
    }
    if (x >= minX - .325 && x <= maxX + .325 && z >= minZ - .325 && z <= maxZ + .325) {
      const ix = Math.floor((x - minX) / step), iz = Math.floor((z - minZ) / step);
      // The legacy skin's jitter can move a triangle into a neighbouring cell.
      for (let j = Math.max(0, iz - 1); j <= Math.min(nz - 1, iz + 1); j++)
        for (let i = Math.max(0, ix - 1); i <= Math.min(nx - 1, ix + 1); i++) {
          const key = j * nx + i; if (mask[key] === 0) continue;
          const points = [point(i, j), point(i + 1, j), point(i, j + 1), point(i + 1, j + 1)];
          if (mask[key] < 0) mask[key] = points.some(p => p.weight > .005) ? 1 : 0;
          if (!mask[key]) continue;
          const [a, b, c, d] = points.map(p => ({ x: Math.fround(p.x), z: Math.fround(p.z), y: heightOf(p) }));
          y = Math.max(y, triangleHeight(x, z, a, c, b), triangleHeight(x, z, b, c, d));
        }
    }
    return Number.isFinite(y) ? y : null;
  };
  return { patches, skin, fineGroundHeight };
}

/** Extracted without changing the old vertex, colour or triangle order. */
export function* createSuvalHighlandGroundSteps({ root, material, groundHeight, surface = createSuvalGroundSurface(groundHeight), group: suppliedGroup }) {
  let buildWork = 0;
  const group = suppliedGroup ?? new THREE.Group();
  if (!suppliedGroup) { group.name = 'Suval highland ground'; root.add(group); }
  for (const patch of surface.patches) {
    const { nx, nz } = patch, vertices = [], colours = [], triangles = [], tint = new THREE.Color(), vertexMap = new Map();
    const vertex = (i, j) => {
      const key = j * (nx + 1) + i; if (vertexMap.has(key)) return vertexMap.get(key);
      const x = patch.xAt(i), z = patch.zAt(j), index = vertices.length / 3; vertexMap.set(key, index);
      vertices.push(x, patch.heightOf(i, j), z); groundTint(tint, x, z, THREE); colours.push(tint.r, tint.g, tint.b); return index;
    };
    for (let j = 0; j < nz; j++) { if ((++buildWork & 31) === 0) yield; for (let i = 0; i < nx; i++) { if ((++buildWork & 31) === 0) yield;
      if (!patch.kept(i, j)) continue;
      const a = vertex(i, j), b = vertex(i + 1, j), c = vertex(i, j + 1), d = vertex(i + 1, j + 1); triangles.push(a, c, b, b, c, d);
    } }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3)); geometry.setIndex(triangles); geometry.computeVertexNormals();
    const ground = new THREE.Mesh(geometry, material('#ffffff', { vertexColors: true, flatShading: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    ground.name = 'Suval switchback ground'; ground.receiveShadow = true; group.add(ground);
  }
  const { skin } = surface, positions = [], colours = [], indices = [], samples = new Map(), vertices = new Map();
  const tint = new THREE.Color(), stone = new THREE.Color('#838777');
  const sample = (i, j) => { const key = `${i},${j}`; if (!samples.has(key)) samples.set(key, skin.point(i, j)); return samples.get(key); };
  const vertex = point => {
    if (vertices.has(point.key)) return vertices.get(point.key);
    const { x, z, weight } = point, index = positions.length / 3;
    positions.push(x, skin.heightOf(point), z); groundTint(tint, x, z, THREE);
    tint.lerp(stone, weight * (.81 + Math.sin(x * .031 + z * .044) * .035)); colours.push(tint.r, tint.g, tint.b); vertices.set(point.key, index); return index;
  };
  for (let j = 0; j < skin.nz; j++) { if ((++buildWork & 31) === 0) yield; for (let i = 0; i < skin.nx; i++) { if ((++buildWork & 31) === 0) yield;
    const points = [sample(i, j), sample(i + 1, j), sample(i, j + 1), sample(i + 1, j + 1)];
    skin.mask[j * skin.nx + i] = points.some(point => point.weight > .005) ? 1 : 0;
    if (!skin.mask[j * skin.nx + i]) continue;
    const [a, b, c, d] = points.map(vertex); indices.push(a, c, b, b, c, d);
  } }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material('#ffffff', { vertexColors: true, flatShading: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  mesh.name = 'Suval exposed limestone faces'; mesh.receiveShadow = true; mesh.userData.outcropCount = SUVAL_PEAK_CRAGS.length; group.add(mesh);
  return { group, ...surface };
}
