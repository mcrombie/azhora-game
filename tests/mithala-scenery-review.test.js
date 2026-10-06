import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as THREE from '../vendor/three.module.js';
import { scopedWorld } from './scoped-world.js';
import { REGION_IDS, hexOwnerAt } from '../src/world/terrain/region-world.js';
import { MITHALA_REGIONS, mithalaWet, inBackswamp } from '../src/content/regions/mithala/mithala-world.js';
import { timberForSpecies } from '../src/gameplay/skills/woodcutting/wood-species.js';
import { MITHALA_WILDLIFE_ZONES } from '../src/content/regions/mithala/mithala-wildlife.js';
import { sourceModule } from './module-loader.js';
import { mithalaCityReserved } from '../src/content/regions/mithala/mithala-city.js';

const scene = new THREE.Scene();
const world = await scopedWorld(scene, MITHALA_REGIONS.map(name => REGION_IDS[name]));
scene.updateMatrixWorld(true);
const group = scene.getObjectByName('Mithala scenery');
const trunks = group.children.filter(mesh => mesh.isInstancedMesh && mesh.name.endsWith(' trunks'));
const trees = world.treeRegistry.trees.filter(tree => tree.id.startsWith('mithala-'));
// The city at the meeting of the arms (docs/mithala-city-brief.md) lifts the plain's scatter off its own ground after
// the plain is laid, and records each lifted instance's original matrix on its mesh (src/world.js,
// `clearMithalaPlainScatter`). Put back, they make the reviewed plain again; left out, nothing else has moved.
const lifted = mesh => mesh.userData.liftedByMithalaCity ?? [];
const isLifted = (mesh, i) => lifted(mesh).some(([index]) => index === i);
const restoredMatrices = mesh => { const e = mesh.instanceMatrix.array.slice(); for (const [i, m] of lifted(mesh)) e.set(m, i * 16); return e; };

// Read the loaded Float32 triangles independently of the placement callback.
const tiles = scene.getObjectByName('The ground of Azhora').children
  .filter(mesh => mesh.name.startsWith('Terrain ')).map(mesh => {
    const p = mesh.geometry.attributes.position;
    let cols = 1; while (cols < p.count && p.getX(cols) !== p.getX(0)) cols++;
    const xs = Array.from({ length: cols }, (_, i) => p.getX(i));
    const zs = Array.from({ length: p.count / cols }, (_, i) => p.getZ(i * cols));
    assert.deepEqual([...mesh.geometry.index.array.slice(0, 6)], [0, cols, 1, 1, cols, cols + 1]);
    return { p, cols, xs, zs };
  });
function interval(axis, value) {
  let lo = 0, hi = axis.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (axis[mid] <= value) lo = mid; else hi = mid; }
  return lo;
}
// Independent spatial index of actual fine triangles, including terrain owned
// by West Lotharn that crosses the Mithala border. The country can load first.
const fineBuckets = new Map(), fineBucketSize = 16;
scene.traverse(mesh => {
  if (!mesh.isMesh || !(mesh.name === 'West Lotharn summits ground' || mesh.name.startsWith('Ground at the mouth of ') || mesh.name.startsWith('West Lotharn beck ground: '))) return;
  const p = mesh.geometry.attributes.position, indices = mesh.geometry.index?.array;
  const points = Array.from({length:p.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld));
  for(let i=0;i<(indices?.length??p.count);i+=3){
    const t=[points[indices?.[i]??i],points[indices?.[i+1]??i+1],points[indices?.[i+2]??i+2]];
    const x0=Math.floor(Math.min(...t.map(v=>v.x))/fineBucketSize),x1=Math.floor(Math.max(...t.map(v=>v.x))/fineBucketSize);
    const z0=Math.floor(Math.min(...t.map(v=>v.z))/fineBucketSize),z1=Math.floor(Math.max(...t.map(v=>v.z))/fineBucketSize);
    for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){const key=`${x},${z}`;if(!fineBuckets.has(key))fineBuckets.set(key,[]);fineBuckets.get(key).push(t);}
  }
});
function shownHeight(x, z) {
  const tile = tiles.find(t => x >= t.xs[0] && x <= t.xs.at(-1) && z >= t.zs[0] && z <= t.zs.at(-1));
  assert.ok(tile, `Visible terrain under tree at ${x},${z}`);
  const { p, cols, xs, zs } = tile, i = interval(xs, x), j = interval(zs, z);
  const u = (x - xs[i]) / (xs[i + 1] - xs[i]), v = (z - zs[j]) / (zs[j + 1] - zs[j]);
  const a = p.getY(j * cols + i), b = p.getY((j + 1) * cols + i);
  const c = p.getY(j * cols + i + 1), d = p.getY((j + 1) * cols + i + 1);
  let height = u + v <= 1 ? a + (c - a) * u + (b - a) * v : d + (b - d) * (1 - u) + (c - d) * (1 - v);
  for(const [a,b,c]of fineBuckets.get(`${Math.floor(x/fineBucketSize)},${Math.floor(z/fineBucketSize)}`)??[]){
    const det=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(det)<1e-10)continue;
    const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/det,v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/det,w=1-u-v;
    if(u>=-1e-8&&v>=-1e-8&&w>=-1e-8)height=Math.max(height,u*a.y+v*b.y+w*c.y);
  }
  return height;
}

test('Mithala keeps its established scenery while seating trees on visible ground', t => {
  const hash = createHash('sha256');
  for (const mesh of group.children.filter(mesh => mesh.isInstancedMesh)) {
    hash.update(JSON.stringify([mesh.name, mesh.count]));
    const e = restoredMatrices(mesh);
    for (let i = 13; i < e.length; i += 16) e[i] = 0;
    hash.update(Buffer.from(e.buffer));
    if (mesh.instanceColor) hash.update(Buffer.from(mesh.instanceColor.array.buffer));
  }
  const identity = hash.digest('hex'), matrix = new THREE.Matrix4(), point = new THREE.Vector3(), gaps = [];
  for (const mesh of trunks) {
    const p = mesh.geometry.attributes.position;
    for (let i = 0; i < mesh.count; i++) {
      if (isLifted(mesh, i)) continue;
      mesh.getMatrixAt(i, matrix); matrix.premultiply(mesh.matrixWorld);
      let gap = -Infinity;
      for (let v = 0; v < p.count; v++) {
        if (Math.abs(p.getY(v) + .5) > 1e-6) continue;
        point.fromBufferAttribute(p, v).applyMatrix4(matrix);
        gap = Math.max(gap, point.y - shownHeight(point.x, point.z));
      }
      gaps.push({ gap, x: matrix.elements[12], z: matrix.elements[14] });
    }
  }
  t.diagnostic(JSON.stringify({ identity, trunks: gaps.length, registered: trees.length,
    exposed: gaps.filter(p => p.gap > .02).length, buried: gaps.filter(p => p.gap < -.04).length,
    worst: [...gaps].sort((a, b) => b.gap - a.gap).slice(0, 3) }));
  assert.equal(identity, '9ef91a92c30d560aa85c4fc0429cb54043afc6ea27629198af21f3e5a14c3652');
  const liftedTrunks = trunks.reduce((sum, mesh) => sum + lifted(mesh).length, 0);
  assert.equal(gaps.length + liftedTrunks, 267);
  for (const mesh of group.children.filter(mesh => mesh.isInstancedMesh)) for (const [, m] of lifted(mesh))
    assert.ok(mithalaCityReserved(m[12], m[14], 3), `${mesh.name} lifted from ${m[12].toFixed(1)},${m[14].toFixed(1)}, off the city's ground`);
  assert.equal(trees.length, gaps.length, 'Every visible trunk is an identifiable tree');
  assert.ok(gaps.every(p => p.gap > -.04 && p.gap < -.02), 'Full leaning root footprints meet visible terrain');
});

test('Mithala wildlife meets visible ground without changing water heights or saved simulation', t => {
  const { createWestLife } = lifeModule;
  const animalScene = new THREE.Scene(), life = createWestLife(animalScene, world, { zones: MITHALA_WILDLIFE_ZONES });
  const gaps = [], matrix = new THREE.Matrix4();
  try {
    const before = life.snapshot().creatures;
    for (const zone of MITHALA_WILDLIFE_ZONES) {
      life.setObserver({ x: (zone.minX + zone.maxX) / 2, z: (zone.minZ + zone.maxZ) / 2 });
      const animals = life.state().creatures.filter(animal => animal.id.startsWith(`${zone.id}-`));
      assert.equal(animals.length, zone.sites.length);
      const body = animalScene.getObjectByName(zone.id)?.getObjectByName(`${zone.species} bodies`);
      assert.ok(body, zone.id);
      for (const [i, animal] of animals.entries()) {
        body.getMatrixAt(i, matrix);
        const expected = zone.air || zone.float || zone.sea ? animal.y : shownHeight(animal.x, animal.z) + animal.lift;
        gaps.push({ id: animal.id, gap: matrix.elements[13] - expected });
      }
    }
    t.diagnostic(JSON.stringify({ animals: gaps.length, wrong: gaps.filter(p => Math.abs(p.gap) > .002).length,
      worst: [...gaps].sort((a,b) => Math.abs(b.gap)-Math.abs(a.gap)).slice(0, 5) }));
    assert.deepEqual(life.snapshot().creatures, before);
    assert.deepEqual(gaps.filter(p => Math.abs(p.gap) > .002), []);
  } finally { life.dispose(); }
});

const lifeModule = await sourceModule('../src/content/regions/western-regions/west-regions-life.js');

test('Mithala low plants and solid apron stones touch the rendered ground', t => {
  const matrix = new THREE.Matrix4(), point = new THREE.Vector3(), failures = [], summary = [];
  for (const [name, parts] of [['Mithala prairie forbs', 3], ['Mithala apron stones', 1]]) {
    const mesh = group.getObjectByName(name); assert.ok(mesh?.isInstancedMesh, name);
    const positions = mesh.geometry.attributes.position;
    let minimum = Infinity, maximum = -Infinity, floating = 0; const worst = [];
    for (let i = 0; i < mesh.count; i += parts) {
      if (isLifted(mesh, i)) continue;
      let bottom = -Infinity;
      for (let part = 0; part < Math.min(parts,2); part++) {
        mesh.getMatrixAt(i + part, matrix); matrix.premultiply(mesh.matrixWorld);
        for (let v = 0; v < positions.count; v++) {
          if (positions.getY(v) >= 0) continue;
          point.fromBufferAttribute(positions, v).applyMatrix4(matrix);
          bottom = Math.max(bottom, point.y - shownHeight(point.x, point.z));
        }
      }
      if (bottom > .03) floating++;
      worst.push({x:matrix.elements[12],z:matrix.elements[14],bottom,physical:world.groundHeight(matrix.elements[12],matrix.elements[14]),drawn:shownHeight(matrix.elements[12],matrix.elements[14])});
      minimum = Math.min(minimum, bottom); maximum = Math.max(maximum, bottom);
      if (Math.abs(bottom + .02) > .004) failures.push({ name, index: i, bottom });
    }
    summary.push({ name, objects: mesh.count / parts, minimum, maximum, floating, worst:worst.sort((a,b)=>b.bottom-a.bottom).slice(0,3) });
  }
  t.diagnostic(JSON.stringify({ summary, examples: failures.slice(0, 8) }));
  assert.equal(failures.length, 0, JSON.stringify(failures.slice(0, 8)));
});

test('Mithala trees expose specific wood and remove all matching parts and collision when felled', () => {
  assert.ok(trees.length > 0);
  assert.equal(new Set(trees.map(tree => tree.id)).size, trees.length);
  assert.deepEqual(new Set(trees.map(tree => tree.species)),
    new Set(['black-poplar', 'black-willow', 'black-alder', 'white-oak']));
  for (const tree of trees) {
    assert.ok(timberForSpecies(tree.species));
    assert.ok(tree.harvestable);
    assert.ok(tree.log);
  }
  const matrix = new THREE.Matrix4();
  for (const species of new Set(trees.map(tree => tree.species))) {
    const tree = trees.find(tree => tree.species === species);
    const collider = world.colliders.find(item => item.id === tree.id);
    assert.ok(collider);
    const handles = [];
    for (const mesh of trunks) for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix);
      if (Math.hypot(matrix.elements[12] - tree.x, matrix.elements[14] - tree.z) > .002) continue;
      handles.push({ mesh, index: i, original: matrix.clone() });
      const crown = group.getObjectByName(mesh.name.replace(/ trunks$/, ' crowns'));
      for (let j = 0; j < 3; j++) { crown.getMatrixAt(i * 3 + j, matrix); handles.push({ mesh: crown, index: i * 3 + j, original: matrix.clone() }); }
    }
    assert.equal(handles.length, 4);
    world.treeRegistry.set(tree.id, false);
    assert.ok(!world.colliders.includes(collider));
    for (const part of handles) { part.mesh.getMatrixAt(part.index, matrix); assert.equal(matrix.elements[0], 0); assert.equal(matrix.elements[5], 0); assert.equal(matrix.elements[10], 0); }
    world.treeRegistry.set(tree.id, true);
    assert.ok(world.colliders.includes(collider));
    for (const part of handles) { part.mesh.getMatrixAt(part.index, matrix); assert.deepEqual(matrix.elements, part.original.elements); }
  }
});


test('Mithala blade tufts keep every root at or below the actual visible ground', t => {
  const names = ['Mithala prairie grass', 'Mithala sedge and rush', 'Mithala reed'];
  const matrix = new THREE.Matrix4(), point = new THREE.Vector3(), failures = [], summary = [];
  const region = () => ({ count: 0, floating: 0, rootBelow10cm: 0, whollyBuried: 0, minimumRoot: Infinity, maximumRoot: -Infinity, visibleTips: 0 });
  for (const name of names) {
    const meshes = group.children.filter(mesh => mesh.name === name), total = region(), wetMargin = region();
    const views = [{ name: 'named fen', x: -1850, z: -1990, ...region() }, { name: 'wet tip', x: -1522, z: -2070, ...region() }];
    for (const mesh of meshes) {
      const p = mesh.geometry.attributes.position;
      for (let i = 0; i < mesh.count; i++) {
        if (isLifted(mesh, i)) continue;
        mesh.getMatrixAt(i, matrix); matrix.premultiply(mesh.matrixWorld);
        const [x, z] = [matrix.elements[12], matrix.elements[14]];
        let minRoot = Infinity, maxRoot = -Infinity, maxTip = -Infinity;
        for (let j = 0; j < p.count; j++) {
          point.fromBufferAttribute(p, j).applyMatrix4(matrix);
          const gap = point.y - shownHeight(point.x, point.z);
          if (Math.abs(p.getY(j)) < 1e-6) { minRoot = Math.min(minRoot, gap); maxRoot = Math.max(maxRoot, gap); }
          else maxTip = Math.max(maxTip, gap);
        }
        const bins = [total];
        if (hexOwnerAt(x, z) === 'North Mithala' && mithalaWet(x, z) > .05) bins.push(wetMargin);
        for (const view of views) if (Math.hypot(x - view.x, z - view.z) <= 25) bins.push(view);
        for (const bin of bins) {
          bin.count++; bin.floating += maxRoot > .03; bin.rootBelow10cm += maxRoot < -.1; bin.whollyBuried += maxTip < 0;
          bin.minimumRoot = Math.min(bin.minimumRoot, minRoot); bin.maximumRoot = Math.max(bin.maximumRoot, maxRoot); bin.visibleTips += maxTip > .1;
        }
        if (Math.abs(maxRoot + .015) > .003 && failures.length < 8) failures.push({ name, i, x, z, minRoot, maxRoot, maxTip, wet: mithalaWet(x, z), basin: inBackswamp(x, z) });
      }
    }
    assert.ok(total.count > 0, name); summary.push({ name, total, wetMargin, views });
  }
  t.diagnostic(JSON.stringify({ summary, examples: failures }));
  assert.equal(failures.length, 0, 'all retained blade-base footprints should touch and slightly enter the drawn soil');
});
