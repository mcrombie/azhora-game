import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { SOUTH_CELDER_WILDLIFE_ZONES } from '../src/content/regions/south-celder/south-celder-wildlife.js';
import { NORTH_CELDER_WILDLIFE_ZONES } from '../src/content/regions/canerd/north-celder-wildlife.js';

const delivered = JSON.parse(readFileSync(new URL('./fixtures/celder-delivered-identities.json', import.meta.url), 'utf8'));
const zones = [...SOUTH_CELDER_WILDLIFE_ZONES, ...NORTH_CELDER_WILDLIFE_ZONES];
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const visible = mesh => { for (let p = mesh; p; p = p.parent) if (!p.visible) return false; return true; };

// Independent topmost surface index. Read the retained triangle index, including
// coarse cut-outs and cave/beck refinements; never reconstruct an analytic grid
// or call the same production sampler whose placement this review is checking.
function visibleGround(scene, world, bounds) {
  const meshes = new Set(), buckets = new Map(), size = 12;
  for (const group of [scene.getObjectByName('The ground of Azhora'), world.westLotharnGround?.group])
    group?.traverse(mesh => { if (mesh.isMesh && !mesh.isInstancedMesh && visible(mesh)) meshes.add(mesh); });
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

function batchRow(mesh) {
  const a = mesh.instanceMatrix.array.slice();
  for (let i = 13; i < a.length; i += 16) a[i] = 0;
  const hash = createHash('sha256').update(mesh.name).update(Buffer.from(a.buffer));
  if (mesh.instanceColor) hash.update(Buffer.from(mesh.instanceColor.array.buffer));
  return { name: mesh.name, count: mesh.count, hash: hash.digest('hex') };
}

/** Inspect an already constructed scene; no world creation or movement here.
 * Return every category before the caller asserts, so contact defects cannot
 * hide identity, water, animal or route evidence from the same expensive run. */
export async function inspectCelderScene(scene, world) {
  scene.updateMatrixWorld(true);
  const problems = [], identities = [], contact = [], details = [];
  const roots = [world.southCelder?.root, world.northCelder?.root];
  const bounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  const include = (x, z) => {
    bounds.minX = Math.min(bounds.minX, x - 12); bounds.maxX = Math.max(bounds.maxX, x + 12);
    bounds.minZ = Math.min(bounds.minZ, z - 12); bounds.maxZ = Math.max(bounds.maxZ, z + 12);
  };
  const matrix = new THREE.Matrix4(), point = new THREE.Vector3();
  for (const root of roots) root?.traverse(mesh => {
    if (!mesh.isInstancedMesh) return;
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix); matrix.premultiply(mesh.matrixWorld);
      include(matrix.elements[12], matrix.elements[14]);
    }
  });
  for (const zone of zones) for (const [x, z] of zone.sites) include(x, z);
  const ground = visibleGround(scene, world, bounds);
  const registry = world.treeRegistry?.trees ?? [];

  for (const [ri, root] of roots.entries()) {
    const reference = delivered.rows[ri], prefix = ri ? 'north-celder' : 'south-celder';
    if (!root) { problems.push(`${prefix}: scenery root is absent`); continue; }
    const batches = []; root.traverse(mesh => { if (mesh.isInstancedMesh) batches.push(batchRow(mesh)); });
    const trees = registry.filter(tree => tree.id.startsWith(prefix + '-'));
    const logical = trees.map(({ species, x, z }) => ({ species, x, z }));
    const changed = batches.filter((row, i) => JSON.stringify(row) !== JSON.stringify(reference.batches[i]));
    const batchHash = createHash('sha256'); for (const row of batches) batchHash.update(JSON.stringify(row));
    identities.push({ name: root.name, batches: batches.length, trees: trees.length,
      batchHash: batchHash.digest('hex'), deliveredBatchHash: reference.hash, changed: changed.map(row => row.name), treeHash: digest(logical) });
    if (root.name !== reference.name || batches.length !== reference.batches.length || changed.length)
      problems.push(`${prefix}: delivered non-Y batch identity changed (${changed.length} rows)`);
    if (JSON.stringify(logical) !== JSON.stringify(reference.trees)) problems.push(`${prefix}: delivered tree positions/species changed`);
    for (const tree of trees) {
      const id = `${prefix}-${tree.x.toFixed(3)}-${tree.z.toFixed(3)}`;
      if (tree.id !== id || !tree.harvestable || !tree.woodKind)
        problems.push(`${prefix}: invalid typed harvest identity ${tree.id}`);
    }

    root.traverse(mesh => {
      if (!mesh.isInstancedMesh) return;
      const trunk = mesh.name.endsWith(' typed living trunks');
      const shrub = mesh.name.endsWith(' rose and silverberry scrub'), forb = mesh.name.endsWith(' prairie forbs');
      const stone = mesh.name.endsWith(' stone') || mesh.name.endsWith(' stream gravel');
      if (!trunk && !shrub && !forb && !stone) return;
      const p = mesh.geometry.attributes.position, vertices = [], unique = new Set(), parts = shrub || forb ? 3 : 1;
      let localBottom = Infinity; for (let v = 0; v < p.count; v++) localBottom = Math.min(localBottom, p.getY(v));
      for (let v = 0; v < p.count; v++) {
        if (trunk ? Math.abs(p.getY(v) - localBottom) > 1e-6 : p.getY(v) >= 0) continue;
        const key = `${p.getX(v)},${p.getY(v)},${p.getZ(v)}`;
        if (!unique.has(key)) { unique.add(key); vertices.push(v); }
      }
      const rows = [];
      for (let i = 0; i < mesh.count; i += parts) {
        let minimum = Infinity, maximum = -Infinity, missing = 0, x, z;
        // The third lobe is an elevated center/flower, not a basal footprint.
        for (let part = 0; part < Math.min(parts, 2); part++) {
          mesh.getMatrixAt(i + part, matrix); matrix.premultiply(mesh.matrixWorld);
          x = matrix.elements[12]; z = matrix.elements[14];
          for (const v of vertices) {
            point.fromBufferAttribute(p, v).applyMatrix4(matrix);
            const support = ground.height(point.x, point.z);
            if (!Number.isFinite(support)) { missing++; continue; }
            const gap = point.y - support;
            minimum = Math.min(minimum, gap); maximum = Math.max(maximum, gap);
          }
        }
        const row = { index: i, x, z, minimum, maximum, missing }; rows.push(row);
        if (missing || maximum > .03) details.push({ name: mesh.name, ...row });
      }
      const exposed = rows.filter(row => row.maximum > .03).length, absent = rows.filter(row => row.missing).length;
      contact.push({ name: mesh.name, objects: rows.length, verticesPerPart: vertices.length,
        minimum: Math.min(...rows.map(row => row.minimum)), maximum: Math.max(...rows.map(row => row.maximum)), exposed, absent,
        intendedTrunkEmbed: trunk ? 1.1 : undefined,
        worst: [...rows].sort((a, b) => b.maximum - a.maximum).slice(0, 4) });
      if (exposed || absent) problems.push(`${mesh.name}: ${exposed} exposed lower footprints; ${absent} lack retained ground`);
    });
  }
  if (JSON.stringify(zones) !== JSON.stringify(delivered.zones)) problems.push('Delivered wildlife zones/species/sites changed');

  const { createWestLife } = await sourceModule('../src/content/regions/western-regions/west-regions-life.js');
  const animalScene = new THREE.Scene(), life = createWestLife(animalScene, world, { zones });
  const animals = [], animalProblems = [];
  let savedBefore, savedAfter;
  try {
    savedBefore = digest(life.snapshot().creatures);
    for (const zone of zones) {
      life.setObserver({ x: (zone.minX + zone.maxX) / 2, z: (zone.minZ + zone.maxZ) / 2 });
      animalScene.updateMatrixWorld(true);
      const creatures = life.state().creatures.filter(animal => animal.id.startsWith(zone.id + '-'));
      const body = animalScene.getObjectByName(zone.id)?.getObjectByName(`${zone.species} bodies`);
      if (creatures.length !== zone.sites.length) problems.push(`${zone.id}: admitted ${creatures.length}/${zone.sites.length} authored animals`);
      if (!body || !visible(body)) { problems.push(`${zone.id}: posed body mesh is absent/hidden at observer`); continue; }
      for (const [i, animal] of creatures.entries()) {
        body.getMatrixAt(i, matrix); matrix.premultiply(body.matrixWorld);
        const expected = zone.air || zone.float || zone.sea ? animal.y : ground.height(animal.x, animal.z) + animal.lift;
        const gap = matrix.elements[13] - expected;
        const row = { id: animal.id, x: animal.x, z: animal.z, gap, bodyY: matrix.elements[13], expected };
        animals.push(row);
        if (!Number.isFinite(gap) || Math.abs(gap) > .002) animalProblems.push(row);
      }
    }
    savedAfter = digest(life.snapshot().creatures);
    if (savedBefore !== savedAfter) problems.push('Observer culling mutated saved animal simulation');
    if (animalProblems.length) problems.push(`${animalProblems.length}/${animals.length} posed wildlife origins miss actual support`);
  } finally { life.dispose(); }
  return { problems, ground: { meshes: ground.meshes, triangles: ground.triangles }, identities, contact,
    // Keep every offending footprint in the trace; summary fields above remain
    // small enough to locate the cause before inspecting these exact instances.
    contactProblems: details,
    wildlife: { count: animals.length, expected: zones.reduce((n, zone) => n + zone.sites.length, 0),
      wrong: animalProblems.length, problems: animalProblems, savedBefore, savedAfter,
      worst: [...animals].sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap)).slice(0, 6) } };
}
