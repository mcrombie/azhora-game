import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { westLotharnRiverFixture } from './west-lotharn-river-fixture.js';
import { WEST_LOTHARN_WATERS } from '../src/content/regions/western-regions/west-regions.js';
import { WEST_PROFILES, westWaterSurface } from '../src/content/regions/western-regions/west-ground.js';
import { groundWithRiver } from '../src/world/terrain/world-terrain.js';
import { REGION_CELLS, REGION_IDS, WORLD_BOUNDS, hexOwnerAt } from '../src/world/terrain/region-world.js';
import { WEST_LOTHARN } from '../src/content/regions/west-lotharn/west-lotharn-world.js';
import { westLotharnRiverBankDistance } from '../src/content/regions/west-lotharn/west-lotharn-river-ground.js';
import { telemoniaGeometryHash } from './telemonia-geometry-hash.js';
import { WESTERN_DRY_SEAMS, WESTERN_DRY_SEAM_REACH } from '../src/content/regions/western-regions/western-dry-seams.js';

const { createWestLotharnScenery } = await sourceModule('../src/content/regions/west-lotharn/west-lotharn-scenery.js');
const { WEST_LOTHARN_GROUND_REGIONS } = await sourceModule('../src/content/regions/west-lotharn/west-lotharn-ground.js');
const { getTreeRegistry } = await sourceModule('../src/world/scenery/tree-registry.js');
const physicalBefore = WEST_LOTHARN_WATERS.flatMap(course => WEST_PROFILES.get(course.id)
  .flatMap(p => [-1, 0, 1].map(offset => [p.x + p.nx * offset, p.z + p.nz * offset]))
  .map(([x, z]) => [x, z, groundWithRiver(x, z), westWaterSurface(x, z)]));
const profilesBefore = JSON.stringify(WEST_LOTHARN_WATERS.map(course => WEST_PROFILES.get(course.id)));
const { scene, terrainRoot, scenery, colliders } = westLotharnRiverFixture(createWestLotharnScenery);
const ground = [], water = [];
scene.traverse(mesh => {
  if (!mesh.isMesh || mesh.isInstancedMesh) return;
  if (mesh.parent === terrainRoot || mesh.name === 'West Lotharn summits ground'
    || mesh.name.startsWith('Ground at the mouth of ') || mesh.userData.westLotharnRiverGround) ground.push(mesh);
  if (WEST_LOTHARN_WATERS.some(course => mesh.name === course.name)) water.push(mesh);
});
for (const mesh of [...ground, ...water]) if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
const ray = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, 4000);
function hit(meshes, x, z) {
  ray.ray.origin.set(x, 2000, z);
  const candidates = meshes.filter(mesh => { const b = mesh.geometry.boundingBox; return x >= b.min.x - .001 && x <= b.max.x + .001 && z >= b.min.z - .001 && z <= b.max.z + .001; });
  return ray.intersectObjects(candidates, false)[0]?.point.y ?? null;
}

test('the four becks remain visible continuously over their actual drawn beds', t => {
  const hidden = [], missing = [], errors = []; let checked = 0, shallow = 0, minimumDepth = Infinity;
  for (const course of WEST_LOTHARN_WATERS) {
    const profile = WEST_PROFILES.get(course.id);
    for (let i = 1; i < profile.length; i++) {
      const a = profile[i - 1], b = profile[i];
      if (westWaterSurface(a.x, a.z) === null || westWaterSurface(b.x, b.z) === null) continue;
      const count = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 2));
      for (let j = 0; j < count; j++) for (const across of [-.45, 0, .45]) {
        const along = (j + .5) / count, half = a.half + (b.half - a.half) * along;
        const x = a.x + (b.x - a.x) * along + (a.nx + (b.nx - a.nx) * along) * half * across;
        const z = a.z + (b.z - a.z) * along + (a.nz + (b.nz - a.nz) * along) * half * across;
        const drawnWater = hit(water, x, z), drawnGround = hit(ground, x, z);
        if (drawnWater === null || drawnGround === null) { missing.push({ course: course.id, x, z, drawnWater, drawnGround }); continue; }
        const physical = groundWithRiver(x, z), depth = drawnWater - physical;
        // At the authored taper the channel deliberately returns to dry ground.
        if (depth < .08) { shallow++; continue; }
        checked++; minimumDepth = Math.min(minimumDepth, drawnWater - drawnGround);
        if (drawnGround >= drawnWater - .015) hidden.push({ course: course.id, x, z, depth, cover: drawnGround - drawnWater });
        const sampled = scenery.riverGround.heightAt(x, z);
        if (Math.abs(sampled - drawnGround) > .015) errors.push({ x, z, sampled, drawnGround });
      }
    }
  }
  // The exact former native-view outlier must have open water too.
  const x = -1786.6058468065, z = -667.709355398;
  assert.ok(hit(water, x, z) - hit(ground, x, z) > .15);
  t.diagnostic(JSON.stringify({ checked, shallow, minimumDepth, hidden: hidden.slice(0, 8), missing: missing.slice(0, 4), samplerErrors: errors.slice(0, 4), geometry: scenery.riverGround.metrics }));
  assert.ok(checked > 2300);
  assert.deepEqual(missing, [], 'no missing water or ground triangles');
  assert.deepEqual(hidden, [], 'the drawn grass cannot cover a physically wet channel');
  assert.deepEqual(errors, [], 'tree-footing sampler must match the actual visible triangles');
});

test('refined river ground joins retained source edges without a vertical seam', t => {
  const failures = []; let checked = 0, maximum = 0;
  for (const { a, b, mountain } of scenery.riverGround.boundaries) {
    const patches = scenery.riverGround.patches.filter(mesh => mesh.userData.mountain === mountain);
    for (const u of [.2, .5, .8]) {
      const x = a.x + (b.x - a.x) * u, z = a.z + (b.z - a.z) * u;
      const y = hit(patches, x, z), expected = a.y + (b.y - a.y) * u;
      if (y === null) continue; // A Float32 edge can round a few microns outward.
      checked++; const gap = Math.abs(y - expected); maximum = Math.max(maximum, gap);
      if (gap > .005) failures.push({ x, z, expected, y, mountain });
    }
  }
  t.diagnostic(JSON.stringify({ checked, maximum, failures: failures.slice(0, 4) }));
  assert.ok(checked > scenery.riverGround.boundaries.length * 1.5);
  assert.deepEqual(failures, []);
});

test('all nearby existing trunks meet actual refined bank triangles without moving their saved identities', t => {
  const registry = getTreeRegistry(colliders), matrix = new THREE.Matrix4(), p = new THREE.Vector3();
  let checked = 0, vertices = 0; const gaps = [];
  for (const mesh of scenery.group.children.filter(mesh => mesh.isInstancedMesh && mesh.geometry.parameters?.radiusBottom === .36)) {
    const positions = mesh.geometry.attributes.position;
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix); matrix.premultiply(mesh.matrixWorld);
      if (westLotharnRiverBankDistance(matrix.elements[12], matrix.elements[14], 10) > 10) continue;
      checked++; let highest = -Infinity;
      for (let v = 0; v < positions.count; v++) {
        if (Math.abs(positions.getY(v) + .5) > 1e-6) continue;
        p.fromBufferAttribute(positions, v).applyMatrix4(matrix);
        const y = hit(ground, p.x, p.z); assert.notEqual(y, null, `tree ${i}: root has ground`);
        highest = Math.max(highest, p.y - y); vertices++;
      }
      if (highest > -.01 || highest < -.05) gaps.push({ x: matrix.elements[12], z: matrix.elements[14], highest });
    }
  }
  const facts = registry.trees.map(({ id, x, z, height, species }) => [id, x, z, height, species]);
  assert.equal(facts.length, 3178);
  assert.equal(createHash('sha256').update(JSON.stringify(facts)).digest('hex'), '6f75d6f6c4def7f2953820fd74070ac475691f775ada480e187b9c2b879e57ce');
  const instances = createHash('sha256'); let batches = 0, transforms = 0;
  for (const mesh of scenery.group.children.filter(mesh => mesh.isInstancedMesh)) {
    batches++; transforms += mesh.count; instances.update(JSON.stringify([mesh.name, mesh.count]));
    for (let i = 0; i < mesh.instanceMatrix.array.length; i++) if (i % 16 !== 13) instances.update(JSON.stringify(mesh.instanceMatrix.array[i]));
    if (mesh.instanceColor) instances.update(Buffer.from(mesh.instanceColor.array.buffer));
  }
  assert.equal(batches, 236); assert.equal(transforms, 14180);
  assert.equal(instances.digest('hex'), '186d6f0a6e35581a8e41f54c9a92f31935338f286c1f41543ae8ebb5fa96c685');
  t.diagnostic(JSON.stringify({ checked, vertices, gaps: gaps.slice(0, 5) }));
  assert.ok(checked > 8); assert.deepEqual(gaps, []);
});

test('rendered-bank refinement leaves physical terrain and water profiles exactly unchanged', () => {
  assert.equal(JSON.stringify(WEST_LOTHARN_WATERS.map(course => WEST_PROFILES.get(course.id))), profilesBefore);
  for (const [x, z, ground, water] of physicalBefore) {
    assert.equal(groundWithRiver(x, z), ground); assert.equal(westWaterSurface(x, z), water);
  }
});

test('Fast mode builds every beck corridor tile before the West Lotharn refinement runs', () => {
  const step = 7.1, x0 = -3090.001927939127, z0 = -2247.195996001615;
  const xOffset = Math.ceil((x0 - WORLD_BOUNDS.minX + 80) / step);
  const zOffset = Math.max(0, Math.ceil((z0 - WORLD_BOUNDS.minZ + 80) / step));
  const tileX = x => Math.floor((Math.floor((x - x0) / step) + xOffset) / 24);
  const tileZ = z => Math.floor((Math.floor((z - z0) / step) + zOffset) / 24);
  const built = new Set();
  for (const cell of REGION_CELLS[WEST_LOTHARN]) for (let z = tileZ(cell.z - 110); z <= tileZ(cell.z + 110); z++)
    for (let x = tileX(cell.x - 110); x <= tileX(cell.x + 110); x++) built.add(`${x},${z}`);
  for (const course of WEST_LOTHARN_WATERS) for (const p of WEST_PROFILES.get(course.id))
    for (const dx of [-15, 0, 15]) for (const dz of [-15, 0, 15])
      assert.ok(built.has(`${tileX(p.x + dx)},${tileZ(p.z + dz)}`), `${course.id} needs a terrain tile before refinement`);
});

test('shared summit extraction retains the original geometry and only the bounded dry repairs move current ground', t => {
  const original=westLotharnRiverFixture(createWestLotharnScenery,true,{legacyTerrain:true});
  assert.equal(telemoniaGeometryHash(original.scene), 'bf4ef9e1470e64a80f4d109aa3f38784ff869cdc8e173f43855bce6b14df52c3');
  assert.equal(telemoniaGeometryHash(original.scene, mesh => mesh.name === 'West Lotharn summits ground'
    || mesh.name.startsWith('Ground at the mouth of ') || mesh.userData.westLotharnRiverGround),
  '62b66eba2ceb71b2f5e564f61008a62b7d181edfec98a92426adab3e720b06aa');
  const current=[],before=[];scene.traverse(mesh=>{if(mesh.isMesh)current.push(mesh);});
  original.scene.traverse(mesh=>{if(mesh.isMesh)before.push(mesh);});assert.equal(current.length,before.length);
  // A retained 7.1 m triangle can move adjacent roots beyond the analytic band;
  // its normals also share neighboring vertices. This 16 m apron bounds both.
  const affected=(x,z)=>WESTERN_DRY_SEAMS.some(e=>{const u=Math.max(0,Math.min(1,((x-e.a.x)*e.dx+(z-e.a.z)*e.dz)/e.length2));
    return Math.hypot(x-e.a.x-e.dx*u,z-e.a.z-e.dz*u)<=WESTERN_DRY_SEAM_REACH+16;});
  const failures=[],changes={groundY:0,groundShading:0,instanceY:0,meshY:0},point=new THREE.Vector3();
  const failure=value=>{if(failures.length<8)failures.push(value);};let failureCount=0;
  const reject=value=>{failureCount++;failure(value);};
  const bytes=attribute=>Buffer.from(attribute.array.buffer,attribute.array.byteOffset,attribute.array.byteLength);
  for(let m=0;m<current.length;m++){
    const now=current[m],old=before[m];assert.equal(now.name,old.name);assert.equal(now.count,old.count);
    const isGround=now.parent===terrainRoot||now.name==='West Lotharn summits ground'
      ||now.name.startsWith('Ground at the mouth of ')||now.userData.westLotharnRiverGround;
    assert.deepEqual(Object.keys(now.geometry.attributes),Object.keys(old.geometry.attributes));
    for(const[name,a]of Object.entries(now.geometry.attributes)){
      const b=old.geometry.attributes[name];assert.equal(a.array.length,b.array.length);assert.equal(a.itemSize,b.itemSize);
      for(let i=0;i<a.array.length;i++)if(a.array[i]!==b.array[i]){
        const vertex=Math.floor(i/a.itemSize);point.fromBufferAttribute(now.geometry.attributes.position,vertex).applyMatrix4(now.matrixWorld);
        if(!isGround||!affected(point.x,point.z)||name==='position'&&i%3!==1||!['position','normal','color'].includes(name))
          reject({mesh:now.name,attribute:name,i,x:point.x,z:point.z});
        else changes[name==='position'?'groundY':'groundShading']++;
      }
    }
    assert.equal(Boolean(now.geometry.index),Boolean(old.geometry.index));
    if(now.geometry.index)assert.ok(bytes(now.geometry.index).equals(bytes(old.geometry.index)),`${now.name}: retained faces`);
    for(let i=0;i<16;i++)if(now.matrixWorld.elements[i]!==old.matrixWorld.elements[i]){
      if(i!==13||!affected(now.matrixWorld.elements[12],now.matrixWorld.elements[14]))reject({mesh:now.name,matrix:i});else changes.meshY++;
    }
    if(now.instanceMatrix)for(let i=0;i<now.instanceMatrix.array.length;i++)if(now.instanceMatrix.array[i]!==old.instanceMatrix.array[i]){
      const offset=i-i%16;point.set(now.instanceMatrix.array[offset+12],now.instanceMatrix.array[offset+13],now.instanceMatrix.array[offset+14]).applyMatrix4(now.matrixWorld);
      if(i%16!==13||!affected(point.x,point.z))reject({mesh:now.name,instance:i,x:point.x,z:point.z});else changes.instanceY++;
    }
    if(now.instanceColor)assert.ok(bytes(now.instanceColor).equals(bytes(old.instanceColor)),`${now.name}: instance colors`);
  }
  t.diagnostic(JSON.stringify({meshes:current.length,changes,failureCount,failures}));
  assert.equal(failureCount,0);assert.ok(changes.groundY+changes.instanceY>0);
});

test('the shared summit sampler reads retained fine triangles across the South Mithala border', () => {
  for (const [x,z] of [[-2032.36328125,-973.0420532226562],[-2036.640,-980.477]]) {
    const drawn = hit(ground,x,z);
    assert.ok(Number.isFinite(drawn));
    assert.ok(Math.abs(scenery.fineGround.fineGroundHeight(x,z)-drawn)<.002);
    assert.ok(Math.abs(scenery.fineGround.renderedGroundHeight(x,z)-drawn)<.002);
  }
  assert.equal(scenery.fineGround.fineGroundHeight(-200,-200),null);
});

test('shared ground ownership covers the retained summit, mouth and beck triangle footprints', t => {
  const owners=new Map(),seen=new Set(),allowed=new Set(WEST_LOTHARN_GROUND_REGIONS);
  for(const mesh of ground.filter(mesh=>mesh.parent!==terrainRoot||mesh.userData.westLotharnRiverGround)){
    const p=mesh.geometry.attributes.position,index=mesh.geometry.index;
    for(let k=0;k<index.count;k+=3){
      const ids=[index.getX(k),index.getX(k+1),index.getX(k+2)];
      const points=ids.map(i=>[p.getX(i),p.getZ(i)]);
      points.push([points.reduce((n,p)=>n+p[0],0)/3,points.reduce((n,p)=>n+p[1],0)/3]);
      for(const[x,z]of points){const key=`${x},${z}`;if(seen.has(key))continue;seen.add(key);
        const name=hexOwnerAt(x,z),id=REGION_IDS[name];owners.set(name,(owners.get(name)??0)+1);
        if(id)assert.ok(allowed.has(id),`${name} must request the shared ground at ${x},${z}`);
      }
    }
  }
  t.diagnostic(JSON.stringify({samples:seen.size,owners:Object.fromEntries(owners)}));
  assert.ok(seen.size>80000);
});
