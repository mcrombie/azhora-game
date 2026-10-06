import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { refineSouthOremindiGround } from '../src/content/regions/south-oremindi/south-oremindi-ground.js';
import { southOremindiInset, southOremindiOwns } from '../src/content/regions/south-oremindi/south-oremindi-world.js';

const plane = (x, z) => 35 + (x + 3500) * .08 + (z + 320) * .04;
const natural = (x, z) => plane(x, z) + 24 + Math.sin((x + 3500) / 14) * 9 + Math.cos((z + 320) / 12) * 7;

function tiledGround({ minX = -3560, minZ = -390, columns = 21, rows = 21, sample = plane } = {}) {
  const root = new THREE.Group(), data = [], colors = [], step = 8;
  for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) {
    const x = minX + i * step, z = minZ + j * step;
    data.push(x, sample(x, z), z); colors.push(.3, .4, .2);
  }
  // Real terrain tiles share an attribute containing far more than their own
  // indexed faces. Distant unused vertices must never be cloned into a patch.
  const farStart = data.length / 3;
  for (let i = 0; i < 20000; i++) { data.push(10000 + i, 20, 10000 + i % 3); colors.push(.2, .3, .4); }
  const position = new THREE.Float32BufferAttribute(data, 3), color = new THREE.Float32BufferAttribute(colors, 3);
  const material = new THREE.MeshBasicMaterial({ vertexColors: true }), tiles = [];
  const split = Math.floor((columns - 1) / 2);
  for (const [first, last] of [[0, split], [split, columns - 1]]) {
    const index = [], geometry = new THREE.BufferGeometry();
    for (let j = 0; j < rows - 1; j++) for (let i = first; i < last; i++) {
      const k = j * columns + i; index.push(k, k + columns, k + 1, k + 1, k + columns, k + columns + 1);
    }
    geometry.setAttribute('position', position); geometry.setAttribute('color', color); geometry.setIndex(index);
    geometry.boundingBox = new THREE.Box3(new THREE.Vector3(minX + first * step, -100, minZ),
      new THREE.Vector3(minX + last * step, 1000, minZ + (rows - 1) * step));
    geometry.boundingSphere = geometry.boundingBox.getBoundingSphere(new THREE.Sphere());
    const mesh = new THREE.Mesh(geometry, material); mesh.name = `shared tile ${tiles.length}`;
    root.add(mesh); tiles.push(mesh);
  }
  const distant = new THREE.BufferGeometry();
  distant.setAttribute('position', position); distant.setAttribute('color', color); distant.setIndex([farStart, farStart + 2, farStart + 1]);
  distant.boundingBox = new THREE.Box3(new THREE.Vector3(10000, 20, 10000), new THREE.Vector3(10002, 20, 10002));
  const remote = new THREE.Mesh(distant, material); root.add(remote);
  const coarse = (x, z) => {
    const i = Math.floor((x - minX) / step), j = Math.floor((z - minZ) / step);
    if (i < 0 || j < 0 || i >= columns - 1 || j >= rows - 1) return sample(x, z);
    const u = (x - minX) / step - i, v = (z - minZ) / step - j, k = j * columns + i;
    const a = position.getY(k), b = position.getY(k + 1), c = position.getY(k + columns), d = position.getY(k + columns + 1);
    return u + v <= 1 ? a + (b - a) * u + (c - a) * v : d + (c - d) * (1 - u) + (b - d) * (1 - v);
  };
  return { root, tiles, remote, position, color, coarse, minX, minZ, maxX: minX + (columns - 1) * step,
    maxZ: minZ + (rows - 1) * step, seam: minX + split * step };
}

function area(mesh) {
  const p = mesh.geometry.attributes.position, ids = mesh.geometry.index;
  let total = 0;
  for (let i = 0; i < ids.count; i += 3) {
    const a = ids.getX(i), b = ids.getX(i + 1), c = ids.getX(i + 2);
    total += Math.abs((p.getX(b) - p.getX(a)) * (p.getZ(c) - p.getZ(a)) - (p.getZ(b) - p.getZ(a)) * (p.getX(c) - p.getX(a))) / 2;
  }
  return total;
}
function sampler(root) {
  root.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0));
  return (x, z) => { ray.ray.origin.set(x, 2000, z); return ray.intersectObjects(root.children, false); };
}

test('mountain refinement compacts indexed faces while preserving shared attributes, custom tile bounds and remote terrain', () => {
  const f = tiledGround(), positions = f.position.array.slice(), colors = f.color.array.slice();
  const bounds = f.tiles.map(tile => tile.geometry.boundingBox), spheres = f.tiles.map(tile => tile.geometry.boundingSphere);
  const remoteIndex = f.remote.geometry.index;
  const r = refineSouthOremindiGround({ THREE, terrainRoot: f.root, heightAt: natural, coarseHeightAt: f.coarse });
  assert.ok(r.metrics.removedTriangles > 0); assert.ok(r.metrics.spacing <= 2); assert.equal(r.patches.length, 2);
  assert.deepEqual(f.position.array, positions); assert.deepEqual(f.color.array, colors);
  f.tiles.forEach((tile, i) => {
    assert.equal(tile.geometry.attributes.position, f.position); assert.equal(tile.geometry.attributes.color, f.color);
    assert.equal(tile.geometry.boundingBox, bounds[i]); assert.equal(tile.geometry.boundingSphere, spheres[i]);
  });
  assert.equal(f.remote.geometry.index, remoteIndex);
  for (const patch of r.patches) {
    assert.ok(patch.geometry.attributes.position.count < f.position.count, 'unused world positions are absent');
    assert.ok(patch.geometry.attributes.position.count < patch.geometry.index.count / 2, 'adjacent faces share compact vertices');
    assert.ok(patch.geometry.boundingBox.max.x < 0);
  }
  assert.equal(r.heightAt(10001, 10001), f.coarse(10001, 10001));
});

test('refined and retained triangles cover precisely the old footprint and the fast sampler matches rendered faces', () => {
  const f = tiledGround(), oldArea = f.root.children.reduce((n, mesh) => n + area(mesh), 0);
  const r = refineSouthOremindiGround({ THREE, terrainRoot: f.root, heightAt: natural, coarseHeightAt: f.coarse });
  assert.ok(Math.abs(f.root.children.reduce((n, mesh) => n + area(mesh), 0) - oldArea) < .01);
  const ray = sampler(f.root);
  for (let z = f.minZ + 1.37; z < f.maxZ; z += 7.7) for (let x = f.minX + .73; x < f.maxX; x += 8.9) {
    const hits = ray(x, z); assert.ok(hits.length, `ground hole at ${x},${z}`);
    assert.equal(new Set(hits.map(hit => hit.object)).size, 1, `overlapping terrain at ${x},${z}`);
    assert.ok(Math.abs(hits[0].point.y - r.heightAt(x, z)) < .0001, 'lookup must sample the drawn triangle, not the analytic height');
    if (!southOremindiOwns(x, z)) assert.ok(Math.abs(hits[0].point.y - f.coarse(x, z)) < .0001, 'Ibenwood geometry is unchanged');
  }
});

test('both sides of tile seams agree and the outer ten metres keep the original triangle planes', () => {
  const f = tiledGround(), r = refineSouthOremindiGround({ THREE, terrainRoot: f.root, heightAt: natural, coarseHeightAt: f.coarse });
  const ray = sampler(f.root); let preserved = 0;
  for (const patch of r.patches) {
    const p = patch.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) if (southOremindiInset(p.getX(i), p.getZ(i)) <= 10) {
      assert.ok(Math.abs(p.getY(i) - f.coarse(p.getX(i), p.getZ(i))) < .0001); preserved++;
    }
  }
  assert.ok(preserved > 20, 'exercise the irregular territorial edge');
  for (let z = f.minZ + .41; z < f.maxZ; z += 3.7) {
    const sides = [f.seam - .001, f.seam, f.seam + .001].map(x => ray(x, z));
    assert.ok(sides.every(hits => hits.length > 0), 'tile seam never opens');
    assert.ok(Math.max(...sides.map(hits => hits[0].point.y)) - Math.min(...sides.map(hits => hits[0].point.y)) < .03);
    const seamHits = sides[1];
    assert.ok(seamHits.every(hit => Math.abs(hit.point.y - seamHits[0].point.y) < .0001), 'shared edge heights agree across separate patches');
  }
});

test('two-metre refinement preserves a five-metre resting ledge that the original eight-metre grid misses', () => {
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const ledge = (x, _z) => 200 + 25 * smooth(-3512, -3507, x) + 30 * smooth(-3502, -3497, x);
  const f = tiledGround({ minX: -3540, minZ: -690, columns: 13, rows: 13, sample: ledge });
  const r = refineSouthOremindiGround({ THREE, terrainRoot: f.root, heightAt: ledge, coarseHeightAt: f.coarse });
  const ray = sampler(f.root);
  for (const x of [-3505.1, -3504.7, -3504, -3503.5]) {
    assert.ok(Math.abs(r.heightAt(x, -645) - 225) < .0001, 'a real flat foothold survives');
    assert.ok(Math.abs(ray(x, -645)[0].point.y - 225) < .0001);
  }
  assert.ok(Math.abs(f.coarse(-3504, -645) - 225) > 1, 'the old coarse plane genuinely missed the ledge');
  for (const mesh of r.patches) {
    const p = mesh.geometry.attributes.position, ids = mesh.geometry.index;
    for (let i = 0; i < ids.count; i += 3) for (let j = 0; j < 3; j++) {
      const a = ids.getX(i + j), b = ids.getX(i + (j + 1) % 3);
      assert.ok(Math.hypot(p.getX(a) - p.getX(b), p.getZ(a) - p.getZ(b)) <= 2.001);
    }
  }
});

test('repeating refinement adds no geometry and still samples the existing patches', () => {
  const f = tiledGround(), options = { THREE, terrainRoot: f.root, heightAt: natural, coarseHeightAt: f.coarse };
  const first = refineSouthOremindiGround(options), children = [...f.root.children];
  const second = refineSouthOremindiGround(options);
  assert.deepEqual(f.root.children, children); assert.deepEqual(second.patches, first.patches);
  assert.equal(second.metrics.removedTriangles, 0);
  assert.equal(second.heightAt(-3500, -360), first.heightAt(-3500, -360));
  assert.throws(() => refineSouthOremindiGround({ THREE, terrainRoot: f.root, heightAt: natural }), /coarseHeightAt/);
});
