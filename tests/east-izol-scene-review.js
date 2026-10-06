import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { IZOL_NPC_POSITIONS } from '../src/content/regions/izol/izol-world.js';
import { EAST_IZOL_WILDLIFE_ZONES as zones } from '../src/content/regions/east-izol/east-izol-wildlife.js';

const reference = JSON.parse(readFileSync(new URL('./fixtures/east-izol-integrated-identities.json', import.meta.url), 'utf8'));
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
// Independent topmost surface index. Read the retained triangle index, including
// coarse cut-outs and cave/beck refinements; never reconstruct an analytic grid
// or call the same production sampler whose placement this review is checking.
function retainedGround(scene, world, bounds) {
  const meshes = new Set(), buckets = new Map(), size = 12;
  for (const group of [scene.getObjectByName('The ground of Azhora'), world.westLotharnGround?.group])
    group?.traverse(mesh => { if (mesh.isMesh && !mesh.isInstancedMesh) meshes.add(mesh); });
  let triangles = 0;
  for (const mesh of meshes) {
    const p = mesh.geometry.attributes.position, indices = mesh.geometry.index?.array;
    if (!p) continue;
    const points = new Float64Array(p.count * 3), v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld);
      points.set([v.x, v.y, v.z], i * 3);
    }
    const start = mesh.geometry.drawRange.start;
    const end = Math.min(indices?.length ?? p.count, start + mesh.geometry.drawRange.count);
    for (let i = start; i + 2 < end; i += 3) {
      const a = (indices?.[i] ?? i) * 3, b = (indices?.[i + 1] ?? i + 1) * 3, c = (indices?.[i + 2] ?? i + 2) * 3;
      const t = [points[a], points[a + 1], points[a + 2], points[b], points[b + 1], points[b + 2], points[c], points[c + 1], points[c + 2]];
      const x0 = Math.min(t[0], t[3], t[6]), x1 = Math.max(t[0], t[3], t[6]);
      const z0 = Math.min(t[2], t[5], t[8]), z1 = Math.max(t[2], t[5], t[8]);
      if (x1 < bounds.minX || x0 > bounds.maxX || z1 < bounds.minZ || z0 > bounds.maxZ) continue;
      const determinant = (t[5] - t[8]) * (t[0] - t[6]) + (t[6] - t[3]) * (t[2] - t[8]);
      if (Math.abs(determinant) < 1e-10) continue;
      t.push(1 / determinant); triangles++;
      for (let x = Math.floor(x0 / size); x <= Math.floor(x1 / size); x++)
        for (let z = Math.floor(z0 / size); z <= Math.floor(z1 / size); z++) {
          const key = `${x},${z}`;
          if (!buckets.has(key)) buckets.set(key, []);
          buckets.get(key).push(t);
        }
    }
  }
  return {
    meshes: meshes.size, triangles,
    height(x, z) {
      let y = -Infinity;
      for (const t of buckets.get(`${Math.floor(x / size)},${Math.floor(z / size)}`) ?? []) {
        const u = ((t[5] - t[8]) * (x - t[6]) + (t[6] - t[3]) * (z - t[8])) * t[9];
        const v = ((t[8] - t[2]) * (x - t[6]) + (t[0] - t[6]) * (z - t[8])) * t[9], w = 1 - u - v;
        if (u >= -1e-8 && v >= -1e-8 && w >= -1e-8) y = Math.max(y, u * t[1] + v * t[4] + w * t[7]);
      }
      return y;
    },
  };
}


function instanceIdentity(root, include = () => true) {
  const hash = createHash('sha256'), rows = [];
  root?.traverse(mesh => {
    if (!mesh.isInstancedMesh || !include(mesh)) return;
    const a = new Float32Array(mesh.instanceMatrix.array);
    for (let i = 13; i < a.length; i += 16) a[i] = 0;
    const row = createHash('sha256');
    for (const h of [hash, row]) {
      h.update(JSON.stringify([mesh.name, mesh.count])).update(Buffer.from(a.buffer));
      if (mesh.instanceColor) h.update(Buffer.from(new Float32Array(mesh.instanceColor.array).buffer));
    }
    rows.push({ name: mesh.name, count: mesh.count, hash: row.digest('hex') });
  });
  return { hash: hash.digest('hex'), count: rows.reduce((n, r) => n + r.count, 0), rows };
}

/** Measurements share the caller's one actual scene. All failures are collected
 * before movement, so a visual defect cannot conceal a controller failure. */
export async function inspectEastIzolScene(scene, world) {
  scene.updateMatrixWorld(true);
  const problems = [], root = world.eastIzol?.root;
  if (!root) return { problems: ['East Izol scenery is absent'] };
  const ground = retainedGround(scene, world, { minX: -200, maxX: 850, minZ: 1350, maxZ: 2250 });
  const westTrees = world.timberTrees.filter(t => t.id.startsWith('izol-'))
    .map(({ id, x, z, height, species }) => ({ id, x, z, height, species }));
  const west = { trees: westTrees.length, treeHash: digest(westTrees),
    instances: instanceIdentity(scene, mesh => !mesh.name.startsWith('East Izol') && Array.from({ length: mesh.count }, (_, i) => i * 16).some(i => mesh.instanceMatrix.array[i+12] > -180 && mesh.instanceMatrix.array[i+12] < 650 && mesh.instanceMatrix.array[i+14] > 1570 && mesh.instanceMatrix.array[i+14] < 2220)) };
  if (west.trees !== 118 || west.treeHash !== 'd2125bf1971885c9a5fe3cbf7b074813124a9dff271b7194a7fcbacae9112cf3')
    problems.push('West Izol saved tree identities/species changed');
  if (west.instances.rows.length !== 35 || west.instances.count !== 5934 ||
    west.instances.hash !== '137e22c15b058bbdc2e252c987b7bf9e7d20afcebedd826f9e89d68534bf69e8')
    problems.push('West Izol seeded scatter non-Y transforms/colors changed');
  const people = Object.entries(IZOL_NPC_POSITIONS).map(([id, p]) => ({ id, expected: p, actual: world.npcPositions[id] }));
  if (people.some(row => JSON.stringify(row.expected) !== JSON.stringify(row.actual)))
    problems.push('West Izol authored people moved or disappeared');
  const trees = world.timberTrees.filter(t => t.id.startsWith('east-izol-'));
  const logicalTrees = trees.map(({ id, x, z, height, species }) => ({ id, x, z, height, species }));
  if (digest(logicalTrees) !== reference.treeHash) problems.push(`East Izol pre-review tree identities changed (${trees.length}/${reference.trees.length})`);
  for (const t of trees) if (t.id !== `east-izol-${t.x.toFixed(3)}-${t.z.toFixed(3)}` || !t.harvestable || !t.woodKind)
    problems.push(`Invalid new harvest identity: ${t.id}`);
  const east = { trees: trees.length, treeHash: digest(logicalTrees), logicalTrees, instances: instanceIdentity(root) };
  if (east.instances.hash !== reference.instances.hash) problems.push('East Izol pre-review non-Y transforms/colors changed');
  const matrix = new THREE.Matrix4(), point = new THREE.Vector3(), contact = [], contactProblems = [];
  root.traverse(mesh => {
    if (!mesh.isInstancedMesh) return;
    const trunk = mesh.name.endsWith(' typed living trunks');
    const maquis = mesh.name.includes(' maquis:'), garrigue = mesh.name.includes(' garrigue:');
    const forb = mesh.name.includes(' asphodel,'), gorse = mesh.name.endsWith(' gorse');
    const stone = [' stone', ' cove shingle', ' gully cobbles'].some(s => mesh.name.endsWith(s));
    if (!trunk && !maquis && !garrigue && !forb && !gorse && !stone) return;
    const p = mesh.geometry.attributes.position, vertices = [], seen = new Set();
    let localBottom = Infinity;
    for (let i = 0; i < p.count; i++) localBottom = Math.min(localBottom, p.getY(i));
    for (let i = 0; i < p.count; i++) {
      if (trunk ? Math.abs(p.getY(i) - localBottom) > 1e-6 : p.getY(i) >= 0) continue;
      const key = `${p.getX(i)},${p.getY(i)},${p.getZ(i)}`;
      if (!seen.has(key)) { seen.add(key); vertices.push(i); }
    }
    const parts = maquis ? 4 : forb || garrigue ? 3 : gorse ? 2 : 1;
    const basalParts = maquis ? 3 : forb || garrigue ? 2 : 1, rows = [];
    for (let i = 0; i < mesh.count; i += parts) {
      let minimum = Infinity, maximum = -Infinity, contactGap = -Infinity, visibleTop = -Infinity, missing = 0, x, z;
      for (let part = 0; part < basalParts; part++) {
        mesh.getMatrixAt(i + part, matrix); matrix.premultiply(mesh.matrixWorld);
        x = matrix.elements[12]; z = matrix.elements[14];
        let partMinimum = Infinity;
        for (const v of vertices) {
          point.fromBufferAttribute(p, v).applyMatrix4(matrix);
          const support = ground.height(point.x, point.z);
          if (!Number.isFinite(support)) { missing++; continue; }
          minimum = Math.min(minimum, point.y - support); maximum = Math.max(maximum, point.y - support);
          partMinimum = Math.min(partMinimum, point.y - support);
        }
        contactGap = Math.max(contactGap, partMinimum);
        for (let v = 0; v < p.count; v++) {
          point.fromBufferAttribute(p, v).applyMatrix4(matrix);
          visibleTop = Math.max(visibleTop, point.y - ground.height(point.x, point.z));
        }
      }
      const gap = trunk ? maximum : contactGap;
      const row = { index: i, x, z, minimum, maximum, contactGap: gap, visibleTop, missing }; rows.push(row);
      if (missing || gap > .03 || visibleTop < .02) contactProblems.push({ name: mesh.name, ...row });
    }
    const exposed = rows.filter(r => r.contactGap > .03).length, buried = rows.filter(r => r.visibleTop < .02).length, absent = rows.filter(r => r.missing).length;
    contact.push({ name: mesh.name, objects: rows.length, exposed, buried, absent,
      minimum: Math.min(...rows.map(r => r.minimum)), maximum: Math.max(...rows.map(r => r.maximum)), contactGap: Math.max(...rows.map(r => r.contactGap)),
      worst: [...rows].sort((a,b) => b.maximum-a.maximum).slice(0,3) });
    if (exposed || buried || absent) problems.push(`${mesh.name}: ${exposed} unsupported basal hulls; ${buried} entirely buried; ${absent} missing support`);
  });
  const { createWestLife } = await sourceModule('../src/content/regions/western-regions/west-regions-life.js');
  const animalScene = new THREE.Scene(), life = createWestLife(animalScene, world, { zones });
  const animals = [], animalProblems = [];
  let savedBefore, savedAfter;
  try {
    savedBefore = digest(life.snapshot().creatures);
    for (const zone of zones) {
      life.setObserver({ x: (zone.minX + zone.maxX) / 2, z: (zone.minZ + zone.maxZ) / 2 });
      animalScene.updateMatrixWorld(true);
      const creatures = life.state().creatures.filter(a => a.id.startsWith(zone.id + '-'));
      const body = animalScene.getObjectByName(zone.id)?.getObjectByName(`${zone.species} bodies`);
      if (creatures.length !== zone.sites.length) problems.push(`${zone.id}: ${creatures.length}/${zone.sites.length} animals admitted`);
      if (!body) { problems.push(`${zone.id}: body mesh absent`); continue; }
      for (const [i, animal] of creatures.entries()) {
        body.getMatrixAt(i, matrix); matrix.premultiply(body.matrixWorld);
        const expected = zone.air || zone.float || zone.sea ? animal.y : ground.height(animal.x, animal.z) + animal.lift;
        const row = { id: animal.id, x: animal.x, z: animal.z, gap: matrix.elements[13] - expected };
        animals.push(row);
        if (!Number.isFinite(row.gap) || Math.abs(row.gap) > .002) animalProblems.push(row);
      }
    }
    savedAfter = digest(life.snapshot().creatures);
    if (savedBefore !== savedAfter) problems.push('Observation mutated saved wildlife state');
    if (animalProblems.length) problems.push(`${animalProblems.length}/${animals.length} wildlife origins miss actual support`);
  } finally { life.dispose(); }
  return { problems, ground: { meshes: ground.meshes, triangles: ground.triangles }, west, people, east,
    contact, contactProblems, wildlife: { count: animals.length, wrong: animalProblems.length, problems: animalProblems, savedBefore, savedAfter } };
}
