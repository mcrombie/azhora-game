import * as THREE from '../vendor/three.module.js';
import { groundWithRiver, legacyWesternGroundHeight } from '../src/world-terrain.js';
import { WEST_LOTHARN_WATERS } from '../src/west-regions.js';
import { westLotharnTerrainSink } from '../src/west-lotharn-world.js';
import { westLotharnRiverBankDistance } from '../src/west-lotharn-river-ground.js';
import { createWestLotharnCaves } from '../src/west-lotharn-caves.js';

// The production terrain axis has reached its maximum 7.1m spacing here.
// Keep its phase and Float32 vertices; compact tiles cover only the water
// corridors, while the unchanged sampler supplies the rest of the scenery.
export function westLotharnRiverFixture(createScenery, refine = true, { legacyTerrain = false } = {}) {
  const physicalHeight = legacyTerrain ? legacyWesternGroundHeight : groundWithRiver;
  const scene = new THREE.Group(), terrainRoot = new THREE.Group(); scene.add(terrainRoot);
  const step = 7.1, minX = -3090.001927939127, minZ = -2247.195996001615, cache = new Map();
  const legacyCache = new Map();
  const vertex = (i, j, old = false) => {
    const heights = old ? legacyCache : cache;
    const key = `${i},${j}`;
    if (!heights.has(key)) {
      const x = minX + i * step, z = minZ + j * step;
      heights.set(key, [Math.fround(x), Math.fround((old ? legacyWesternGroundHeight : physicalHeight)(x, z) - westLotharnTerrainSink(x, z)), Math.fround(z)]);
    }
    return heights.get(key);
  };
  const coarseHeight = (x, z, old = false) => {
    const i = Math.floor((x - minX) / step), j = Math.floor((z - minZ) / step);
    const a = vertex(i, j, old), b = vertex(i, j + 1, old), c = vertex(i + 1, j, old), d = vertex(i + 1, j + 1, old);
    const u = (x - a[0]) / (c[0] - a[0]), v = (z - a[2]) / (b[2] - a[2]);
    return u + v <= 1 ? a[1] + (c[1] - a[1]) * u + (b[1] - a[1]) * v
      : d[1] + (b[1] - d[1]) * (1 - u) + (c[1] - d[1]) * (1 - v);
  };
  const coarseHeightAt = (x,z) => coarseHeight(x,z);
  const legacyCoarseHeightAt = (x,z) => coarseHeight(x,z,true);
  const material = (color, options = {}) => new THREE.MeshStandardMaterial({ color, ...options });
  if (refine) {
    const cells = new Set(), tiles = new Map();
    for (const course of WEST_LOTHARN_WATERS) {
      const b = course.bounds, margin = 24;
      for (let j = Math.floor((b.minZ - margin - minZ) / step); j <= Math.ceil((b.maxZ + margin - minZ) / step); j++)
        for (let i = Math.floor((b.minX - margin - minX) / step); i <= Math.ceil((b.maxX + margin - minX) / step); i++) {
          const key = `${i},${j}`;
          if (cells.has(key) || westLotharnRiverBankDistance(minX + (i + .5) * step, minZ + (j + .5) * step, margin) > margin) continue;
          cells.add(key);
          const tile = `${Math.floor(i / 24)},${Math.floor(j / 24)}`;
          if (!tiles.has(tile)) tiles.set(tile, []); tiles.get(tile).push([i, j]);
        }
    }
    for (const [tile, cells] of tiles) {
      const positions = [], indices = [], ids = new Map();
      const id = (i, j) => { const key = `${i},${j}`; if (!ids.has(key)) { ids.set(key, positions.length / 3); positions.push(...vertex(i, j)); } return ids.get(key); };
      for (const [i, j] of cells) { const a = id(i, j), b = id(i, j + 1), c = id(i + 1, j), d = id(i + 1, j + 1); indices.push(a, b, c, c, b, d); }
      const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, material('#607a44')); mesh.name = `Terrain ${tile}`; terrainRoot.add(mesh);
    }
  }
  const colliders = [], scenery = createScenery({ root: scene, terrainRoot: refine ? terrainRoot : null,
    material, groundHeight: physicalHeight, renderedGroundHeight: coarseHeightAt,
    legacyGroundHeight: legacyWesternGroundHeight, legacyRenderedGroundHeight: legacyCoarseHeightAt, colliders,
    dummy: new THREE.Object3D(), color: new THREE.Color(), round: new THREE.IcosahedronGeometry(1, 0),
    caves: createWestLotharnCaves(physicalHeight) });
  scene.updateMatrixWorld(true);
  return { scene, terrainRoot, scenery, colliders, coarseHeightAt };
}
