import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import { buildSource, readMap } from '../scripts/build-region-rivers.mjs';
import { RIVER_SOURCE } from '../src/world/terrain/region-rivers.js';
import { IBENWOOD_RIVER_EDGES, IBENWOOD_RIVERS, createIbenwoodRiverSystem, createIbenwoodRiverScenery,
  refineIbenwoodRiverGround } from '../src/content/regions/ibenwood/ibenwood-rivers.js';

const natural = (x, z) => 36 - z * .006 + Math.sin(x / 45) * 2 + Math.cos(z / 38) * 1.5;
const rivers = createIbenwoodRiverSystem({ groundHeight: natural });
const edgeKey = edge => [edge.a.join(','), edge.b.join(',')].sort().join('|');

test('Ibenwood includes exactly the 18-edge Central/South course and three-edge western border stream', () => {
  assert.equal(IBENWOOD_RIVER_EDGES.length, 21);
  assert.deepEqual(IBENWOOD_RIVERS.map(r => r.edges.length).sort((a, b) => a - b), [3, 18]);
  assert.equal(new Set(IBENWOOD_RIVERS.flatMap(r => r.edges.map(edgeKey))).size, 21);
  for (const edge of IBENWOOD_RIVER_EDGES) {
    assert.ok(!edge.regions.includes('North Ibenwood') && !edge.regions.includes('East Ibenwood'));
  }
  assert.equal(IBENWOOD_RIVER_EDGES.filter(e => e.size === 'medium').length, 8);
  assert.ok(IBENWOOD_RIVER_EDGES.some(e => e.regions.includes('Alezhor')), 'retain the complete downstream border edge');
  assert.ok(IBENWOOD_RIVER_EDGES.some(e => e.regions.includes('South Ibenal')), 'retain the opposite bank of the western stream');
  for (const name of ['North', 'East', 'South', 'West', 'Central']) assert.ok(RIVER_SOURCE.regions.includes(`${name} Ibenwood`));
});

const source = readMap();
test('the generated river source still exactly matches the read-only atlas export', { skip: !source }, () => {
  assert.equal(readFileSync(new URL('../src/world/terrain/region-rivers.js', import.meta.url), 'utf8'), buildSource(source));
  const mapEdges = Object.entries(source.map.rivers).filter(([key]) => key.split('|')
    .some(cell => source.map.hexes[cell]?.region?.endsWith(' Ibenwood'))).map(([key]) => key.split('|').sort().join('|')).sort();
  assert.deepEqual(IBENWOOD_RIVER_EDGES.map(edgeKey).sort(), mapEdges);
});

test('both courses keep falling, retain a submerged bed and widen only where the atlas does', () => {
  for (const profile of rivers.profiles) {
    for (let i = 0; i < profile.samples.length; i++) {
      const sample = profile.samples[i], wet = rivers.waterAt(sample.x, sample.z);
      assert.ok(wet !== null, `no water at ${profile.course.id} sample ${i}`);
      assert.ok(rivers.ground(sample.x, sample.z) < wet - .75, 'bed must allow actual swimming');
      if (i) assert.ok(sample.surface < profile.samples[i - 1].surface, 'water must fall downstream');
    }
  }
  const main = rivers.profiles.find(p => p.course.edges.length === 18);
  assert.ok(main.samples.at(-1).half > main.samples[0].half * 1.9);
  for (const p of rivers.profiles.find(p => p.course.edges.length === 3).samples) assert.ok(Math.abs(p.half - 1.7) < 1e-12);
});

test('rendered water triangles and waterAt agree, while the complete rendered ribbon lies above its bed', () => {
  const parent = new THREE.Group(), scenery = createIbenwoodRiverScenery({ THREE, parent, rivers });
  assert.equal(scenery.meshes.length, 2);
  parent.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0));
  for (let ri = 0; ri < rivers.ribbons.length; ri++) {
    const ribbon = rivers.ribbons[ri];
    for (let i = 0; i < ribbon.indices.length; i += 3) {
      const vertices = ribbon.indices.slice(i, i + 3).map(k => ribbon.vertices[k]);
      const x = vertices.reduce((v, p) => v + p.x, 0) / 3, z = vertices.reduce((v, p) => v + p.z, 0) / 3;
      const surface = rivers.waterAt(x, z);
      assert.ok(surface !== null);
      assert.ok(rivers.ground(x, z) < surface - .65);
      if (i % 39 === 0) {
        ray.ray.origin.set(x, 100, z);
        const hit = ray.intersectObject(scenery.meshes[ri])[0];
        assert.ok(hit, 'water triangles must face upward');
        assert.ok(Math.abs(hit.point.y - surface) < 1e-5);
      }
    }
  }
  for (const mesh of scenery.meshes) mesh.geometry.dispose();
  scenery.meshes[0].material.dispose();
});

test('river hooks leave existing countries, North/East Ibenwood and dry banks unchanged', () => {
  for (const [x, z] of [[0, 0], [-1900, 300], [-2700, -50], [-3000, 350], [-3700, -500], [-4100, 160]]) {
    assert.equal(rivers.waterAt(x, z), null);
    assert.equal(rivers.ground(x, z, 123.456), 123.456);
  }
  for (const profile of rivers.profiles) for (const p of profile.samples.filter((_, i) => i % 19 === 0)) {
    assert.equal(rivers.waterAt(p.x + p.nx * (p.half + 1), p.z + p.nz * (p.half + 1)), null);
  }
});

function tiledGround() {
  const root = new THREE.Group(), positions = [], colors = [], rows = 17, columns = 21;
  const minX = -3760, minZ = 350, step = 8;
  for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) {
    const x = minX + i * step, z = minZ + j * step;
    positions.push(x, rivers.ground(x, z), z); colors.push(.3, .4, .2);
  }
  // Like real tiles, these attributes contain substantial unused distant ground.
  for (let i = 0; i < 20000; i++) { positions.push(10000 + i, 20, 10000); colors.push(.3, .4, .2); }
  const position = new THREE.Float32BufferAttribute(positions, 3), color = new THREE.Float32BufferAttribute(colors, 3);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true });
  for (let tile = 0; tile < 2; tile++) {
    const index = [], geometry = new THREE.BufferGeometry();
    for (let j = 0; j < rows - 1; j++) for (let i = tile * 10; i < tile * 10 + 10; i++) {
      const k = j * columns + i; index.push(k, k + columns, k + 1, k + 1, k + columns, k + columns + 1);
    }
    geometry.setAttribute('position', position); geometry.setAttribute('color', color); geometry.setIndex(index);
    geometry.boundingBox = new THREE.Box3(new THREE.Vector3(minX + tile * 80, 0, minZ), new THREE.Vector3(minX + (tile + 1) * 80, 100, minZ + 128));
    geometry.boundingSphere = geometry.boundingBox.getBoundingSphere(new THREE.Sphere());
    const mesh = new THREE.Mesh(geometry, material); mesh.name = `shared tile ${tile}`; root.add(mesh);
  }
  return { root, position, corners: { minX, minZ, maxX: minX + 160, maxZ: minZ + 128 } };
}
function area(mesh) {
  const p = mesh.geometry.attributes.position, index = mesh.geometry.index;
  let result = 0;
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2);
    result += Math.abs((p.getX(b) - p.getX(a)) * (p.getZ(c) - p.getZ(a)) - (p.getZ(b) - p.getZ(a)) * (p.getX(c) - p.getX(a))) / 2;
  }
  return result;
}

test('local terrain refinement opens visible river beds without copying shared world buffers or opening seams', () => {
  const { root, position, corners } = tiledGround(), tiles = [...root.children];
  const originalPositions = position.array.slice(), originalBounds = tiles.map(t => t.geometry.boundingBox.clone());
  const originalArea = tiles.reduce((n, t) => n + area(t), 0);
  const refined = refineIbenwoodRiverGround({ THREE, terrainRoot: root, rivers, heightAt: rivers.ground });
  assert.ok(refined.removedTriangles > 0); assert.ok(refined.spacing <= 2);
  assert.equal(refined.patches.length, 2);
  assert.deepEqual(position.array, originalPositions);
  for (let i = 0; i < tiles.length; i++) {
    assert.equal(tiles[i].geometry.attributes.position, position);
    assert.ok(tiles[i].geometry.boundingBox.equals(originalBounds[i]), 'keep custom tile bounds');
  }
  for (const mesh of refined.patches) {
    assert.ok(mesh.geometry.attributes.position.count < position.count, 'copy only local vertices');
    assert.ok(mesh.geometry.boundingBox.max.x < 0, 'unused remote ground must not affect patch bounds');
  }
  assert.ok(Math.abs(root.children.reduce((n, t) => n + area(t), 0) - originalArea) < .01, 'refinement must replace exact coverage');
  root.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0));
  for (const p of rivers.profiles[0].samples) {
    if (p.x < corners.minX + 4 || p.x > corners.maxX - 4 || p.z < corners.minZ + 4 || p.z > corners.maxZ - 4) continue;
    ray.ray.origin.set(p.x, 100, p.z);
    const hit = ray.intersectObjects(root.children)[0];
    assert.ok(hit, 'no ground hole under the river');
    assert.ok(hit.point.y < rivers.waterAt(p.x, p.z) - .6, 'coarse terrain must not cover the water');
  }
  // Sample right across the tile seam and the patch's outer edge for open gaps.
  for (let z = corners.minZ + .3; z < corners.maxZ; z += 3.7) for (const x of [-3680.001, -3680, -3679.999, -3759.999]) {
    ray.ray.origin.set(x, 100, z); assert.ok(ray.intersectObjects(root.children)[0], `hole at ${x},${z}`);
  }
  assert.equal(refineIbenwoodRiverGround({ THREE, terrainRoot: root, rivers, heightAt: rivers.ground }).patches.length, 0);
  for (const mesh of root.children) mesh.geometry.dispose();
  tiles[0].material.dispose();
});
