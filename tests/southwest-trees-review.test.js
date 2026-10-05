import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import * as THREE from '../vendor/three.module.js';
import { scopedWorld } from './scoped-world.js';
import { REGION_IDS, hexOwnerAt, landDistance } from '../src/region-world.js';
import { SOUTHWEST_NORTH_REGIONS, MEROSHE_REGIONS, WEST_EDGE_REGIONS, EAST_EDGE_REGIONS, SOUTHWEST_REGIONS, southwestSeamWeight } from '../src/southwest-world.js';
import { SOUTHWEST_WILDLIFE_ZONES } from '../src/southwest-wildlife.js';
import { sourceModule } from './module-loader.js';
const { GANESH_SHADE_SCRUB } = await sourceModule('../src/ganesh-shade-scrub.js');
import { canStand } from '../src/game-state.js';
import { INVENTORY_ITEMS, createInventoryState } from '../src/inventory.js';
import { createWoodcutting, LOG_ITEMS } from '../src/woodcutting.js';
import { createSkills, MAX_XP } from '../src/skills.js';
import { createCampcraft } from '../src/campcraft.js';

const scene = new THREE.Scene(), world = await scopedWorld(scene, SOUTHWEST_REGIONS.map(name => REGION_IDS[name]));
scene.updateMatrixWorld(true);
const group = scene.getObjectByName('Southwest scenery'), north = new Set(SOUTHWEST_NORTH_REGIONS);
const treeNames = ['Vaellir gallery', 'Southwest tamarisk', 'Navarth north wood'];
const thornName = 'Meroshe hamada thorn trees';
const thornBatch = group.getObjectByName(`${thornName} trunks`);
const trunkBatches = group.children.filter(mesh => treeNames.some(name => mesh.name === `${name} trunks`));
const northTree = (mesh, index) => {
  const e = mesh.instanceMatrix.array, k = index * 16;
  return north.has(hexOwnerAt(e[k + 12], e[k + 14]));
};

// Sample the actual loaded terrain mesh independently of the placement callback.
const tiles = scene.getObjectByName('The ground of Azhora').children.filter(mesh => mesh.name.startsWith('Terrain ')).map(mesh => {
  const p = mesh.geometry.attributes.position;
  let columns = 1; while (columns < p.count && p.getX(columns) !== p.getX(0)) columns++;
  const rows = p.count / columns;
  const xs = Array.from({ length: columns }, (_, i) => p.getX(i));
  const zs = Array.from({ length: rows }, (_, j) => p.getZ(j * columns));
  assert.deepEqual([...mesh.geometry.index.array.slice(0, 6)], [0, columns, 1, 1, columns, columns + 1]);
  return { p, columns, xs, zs };
});
const interval = (axis, value) => {
  let lo = 0, hi = axis.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (axis[mid] <= value) lo = mid; else hi = mid; }
  return lo;
};
function drawnHeight(x, z) {
  const tile = tiles.find(t => x >= t.xs[0] && x <= t.xs.at(-1) && z >= t.zs[0] && z <= t.zs.at(-1));
  assert.ok(tile, `loaded rendered ground at ${x},${z}`);
  const { p, columns, xs, zs } = tile, i = interval(xs, x), j = interval(zs, z);
  const u = (x - xs[i]) / (xs[i + 1] - xs[i]), v = (z - zs[j]) / (zs[j + 1] - zs[j]);
  const a = p.getY(j * columns + i), b = p.getY((j + 1) * columns + i);
  const c = p.getY(j * columns + i + 1), d = p.getY((j + 1) * columns + i + 1);
  return u + v <= 1 ? a + (c - a) * u + (b - a) * v : d + (b - d) * (1 - u) + (c - d) * (1 - v);
}

test('Southwest tree registration and bounded terrain changes preserve every seeded layout, scale, lean and colour', t => {
  const hash = createHash('sha256');
  for (const mesh of group.children.filter(mesh => mesh.isInstancedMesh && mesh.name !== GANESH_SHADE_SCRUB)) {
    hash.update(JSON.stringify([mesh.name, mesh.count]));
    const matrix = mesh.instanceMatrix.array.slice();
    // The seam review deliberately changes terrain Y; R4/R5 rooting also only
    // changes Y. Pin all remaining bytes against the retained pre-seam scene.
    for (let i = 13; i < matrix.length; i += 16) matrix[i] = 0;
    hash.update(Buffer.from(matrix.buffer, matrix.byteOffset, matrix.byteLength));
    if (mesh.instanceColor) hash.update(Buffer.from(mesh.instanceColor.array.buffer));
  }
  assert.equal(group.children.filter(mesh => mesh.isInstancedMesh && mesh.name !== GANESH_SHADE_SCRUB).length, 141);
  const identity = hash.digest('hex');
  t.diagnostic(`Seeded non-Y scenery transform/colour hash: ${identity}`);
  assert.equal(identity, '5d5fe3c73728694bdb58ed6c34624c58637a36c883586dd4d802ea55add05b30');
});

test('the three unchanged ghubr homes have actual dry-scrub shade at body height', t => {
  const mesh = group.getObjectByName(GANESH_SHADE_SCRUB), zone = SOUTHWEST_WILDLIFE_ZONES.find(z => z.id === 'ganesh-ghubr');
  assert.ok(mesh?.isInstancedMesh); assert.equal(mesh.count, 18); assert.equal(mesh.userData.shrubs.length, 6);
  assert.deepEqual(zone.sites, [[-3507, 1338], [-3468, 1389], [-3549, 1278]]);
  const ray = new THREE.Raycaster(), matrix = new THREE.Matrix4(), p = new THREE.Vector3(), contact = [];
  for (let index = 0; index < mesh.count; index++) {
    mesh.getMatrixAt(index, matrix); matrix.premultiply(mesh.matrixWorld); let gap = Infinity;
    for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
      if (mesh.geometry.attributes.position.getY(i) >= 0) continue;
      p.fromBufferAttribute(mesh.geometry.attributes.position, i).applyMatrix4(matrix);
      gap = Math.min(gap, p.y - drawnHeight(p.x, p.z));
    }
    contact.push(gap); assert.ok(Math.abs(gap + .02) < .003, `lobe ${index}: grounded lower hull ${gap}`);
  }
  const directions = [[-45, 90, 38], [-1, 1, .4], [0, 1, .25], [1, 1, -.4]].map(v => new THREE.Vector3(...v).normalize());
  const rows = [];
  for (const [x, z] of zone.sites) {
    const samples = [{ x, z }];
    for (const r of [2.5, 5]) for (let i = 0; i < 12; i++) samples.push({ x: x + Math.cos(i * Math.PI / 6) * r, z: z + Math.sin(i * Math.PI / 6) * r });
    const shaded = (at, direction, height = .436) => {
      ray.set(new THREE.Vector3(at.x, drawnHeight(at.x, at.z) + height, at.z), direction); ray.far = 4;
      return ray.intersectObject(mesh, false).length > 0;
    };
    const native = samples.filter(at => shaded(at, directions[0])).length;
    assert.ok(native > 0, `native 25-point body-height shade samples at ${x},${z}`);
    const coverage = directions.map(direction => {
      let bodyFootprints = 0;
      for (let dx = -4.5; dx <= 4.5; dx += .15) for (let dz = -4.5; dz <= 4.5; dz += .15) {
        if (Math.hypot(dx, dz) > 4.8) continue;
        const at = { x: x + dx, z: z + dz };
        if ([[0, 0], [-.12, 0], [.12, 0], [0, -.12], [0, .12]].every(([ox, oz]) => shaded({ x: at.x + ox, z: at.z + oz }, direction))) bodyFootprints++;
      }
      assert.ok(bodyFootprints > 0, `body-sized shade footprint at ${x},${z} toward ${direction.toArray()}`);
      return bodyFootprints;
    });
    rows.push({ x, z, native, coverage });
  }
  t.diagnostic(JSON.stringify({ contact: [Math.min(...contact), Math.max(...contact)], homes: rows }));
});

// One-time review comparison against the retained R4 pre-seam artifact. The
// committed hash above stays self-contained; ordinary tests need no local file.
if (process.env.AZHORA_COMPARE_SOUTHWEST === '1') test('only reviewed tree grounding and bounded seam heights differ from the retained scene', t => {
  const before = JSON.parse(gunzipSync(readFileSync(new URL('./artifacts/r4-southwest-post-rooting-reference.json.gz', import.meta.url))));
  const counts = { tree: 0, reviewedStone: 0, seam: 0, unchanged: 0 }, unexpected = [];
  const batches = group.children.filter(mesh => mesh.isInstancedMesh && mesh.name !== GANESH_SHADE_SCRUB);
  assert.equal(batches.length, before.meshes.length);
  for (const [batchIndex, mesh] of batches.entries()) {
    const old = before.meshes[batchIndex]; // Several authored batches share a name.
    assert.equal(mesh.name, old.name); assert.equal(mesh.count, old.count, mesh.name);
    const e = mesh.instanceMatrix.array;
    const base = mesh.name.endsWith(' crowns') ? group.getObjectByName(mesh.name.replace(/ crowns$/, ' trunks')) : mesh;
    for (let i = 0; i < mesh.count; i++) {
      if (e[i * 16 + 13] === old.matrices[i * 16 + 13]) { counts.unchanged++; continue; }
      const k = (base === mesh ? i : Math.floor(i / 3)) * 16, a = base.instanceMatrix.array;
      const x = a[k + 12], z = a[k + 14];
      if (mesh.name.endsWith(' trunks') || mesh.name.endsWith(' crowns')) { counts.tree++; continue; }
      if (['Meroshe fan cobbles', 'Meroshe shore shingle', 'Cape Heth bedding slabs', 'Heth Bight shingle', 'Dinelv bedding slabs', 'Dinelv cliff blocks', 'Dinelv channel rubble', 'Hama stony ribs', 'Hama gravel'].includes(mesh.name)) { counts.reviewedStone++; continue; }
      // Bush lobes can be offset from their ground anchor; 4m safely bounds
      // those authored offsets. Tree crowns use their exact trunk anchor above.
      let seam = false;
      for (const dx of [-4, 0, 4]) for (const dz of [-4, 0, 4]) seam ||= southwestSeamWeight(x + dx, z + dz) > 0;
      if (seam) counts.seam++;
      else unexpected.push({ batch: mesh.name, index: i, x, z, dy: e[i * 16 + 13] - old.matrices[i * 16 + 13] });
    }
  }
  t.diagnostic(`Pre-seam Y comparison: ${JSON.stringify({ ...counts, unexpected: unexpected.length, examples: unexpected.slice(0, 8) })}`);
  assert.deepEqual(unexpected, []);
  const current = new Map(world.treeRegistry.trees.map(tree => [tree.id, tree]));
  for (const prior of before.trees) {
    const now = current.get(prior.id); assert.ok(now, prior.id);
    for (const field of ['id', 'x', 'z', 'height', 'species', 'log']) assert.equal(now[field], prior[field], `${prior.id}: ${field}`);
  }
});

test('reviewed Meroshe and western-edge stones meet the actual drawn ground with their tilted hulls', t => {
  const matrix = new THREE.Matrix4(), point = new THREE.Vector3(), failures = [], summary = [];
  for (const [name, lift] of [['Meroshe fan cobbles', .16], ['Meroshe shore shingle', .1], ['Cape Heth bedding slabs', .02], ['Heth Bight shingle', .1], ['Dinelv bedding slabs', .02], ['Dinelv cliff blocks', .22], ['Dinelv channel rubble', .14], ['Hama stony ribs', .12], ['Hama gravel', .05]]) {
    const mesh = group.getObjectByName(name); assert.ok(mesh?.isInstancedMesh, name);
    const embedded = !name.startsWith('Meroshe');
    const positions = mesh.geometry.attributes.position; let formerlyFloating = 0, maximum = -Infinity, minimum = Infinity;
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix); matrix.premultiply(mesh.matrixWorld);
      const e = matrix.elements, scale = Math.hypot(e[0], e[1], e[2]);
      const oldY = world.groundHeight(e[12], e[14]) + scale * lift;
      let bottom = embedded ? -Infinity : Infinity;
      for (let v = 0; v < positions.count; v++) {
        if (embedded && positions.getY(v) >= 0) continue;
        point.fromBufferAttribute(positions, v).applyMatrix4(matrix);
        bottom = (embedded ? Math.max : Math.min)(bottom, point.y - drawnHeight(point.x, point.z));
      }
      if (bottom + oldY - e[13] > .05) formerlyFloating++;
      minimum = Math.min(minimum, bottom); maximum = Math.max(maximum, bottom);
      const expected = -Math.min(.025, scale * .06);
      if (Math.abs(bottom - expected) > .006) failures.push({ name, index: i, x: e[12], z: e[14], bottom, expected });
    }
    summary.push({ name, stones: mesh.count, formerlyFloating, minimum, maximum });
    assert.ok(mesh.count > 0, `${name}: inspect the entire drawn batch`);
  }
  t.diagnostic(JSON.stringify({ summary, failures: failures.slice(0, 8) }));
  assert.equal(failures.length, 0, JSON.stringify(failures.slice(0, 8)));
});

test('R4 tree roots meet real terrain triangles across their entire leaning six-sided feet', t => {
  const matrix = new THREE.Matrix4(), point = new THREE.Vector3(), gaps = [];
  for (const mesh of trunkBatches) {
    const p = mesh.geometry.attributes.position;
    for (let i = 0; i < mesh.count; i++) {
      if (!northTree(mesh, i)) continue;
      mesh.getMatrixAt(i, matrix); matrix.premultiply(mesh.matrixWorld);
      let gap = -Infinity;
      for (let v = 0; v < p.count; v++) {
        if (Math.abs(p.getY(v) + .5) > 1e-6) continue;
        point.fromBufferAttribute(p, v).applyMatrix4(matrix);
        gap = Math.max(gap, point.y - drawnHeight(point.x, point.z));
      }
      gaps.push({ gap, x: matrix.elements[12], z: matrix.elements[14], batch: mesh.name });
    }
  }
  t.diagnostic(JSON.stringify({ trees: gaps.length, exposed: gaps.filter(t => t.gap > .02).length,
    buried: gaps.filter(t => t.gap < -.04).length, worst: [...gaps].sort((a, b) => b.gap - a.gap).slice(0, 3) }));
  assert.equal(gaps.length, 170);
  assert.ok(gaps.every(tree => tree.gap <= -.025 && tree.gap >= -.035), 'all visible root footprints are embedded about 3cm');
});

test('each R4 drawn trunk has a stable species record and restored harvest state controls its own mesh and collider', t => {
  const trees = world.treeRegistry.trees.filter(tree => tree.id.startsWith('southwest-') && north.has(hexOwnerAt(tree.x, tree.z)));
  const drawn = trunkBatches.reduce((n, mesh) => n + Array.from({ length: mesh.count }, (_, i) => northTree(mesh, i)).filter(Boolean).length, 0);
  t.diagnostic(`Registered ${trees.length} of ${drawn} R4 trunks`);
  assert.equal(trees.length, drawn);
  assert.equal(new Set(trees.map(tree => tree.id)).size, trees.length);
  assert.deepEqual(new Set(trees.map(tree => tree.species)), new Set(['white-poplar', 'black-willow', 'tamarisk', 'loblolly-pine', 'white-oak']));
  for (const tree of trees) {
    assert.ok(north.has(hexOwnerAt(tree.x, tree.z)), tree.id);
    assert.equal(tree.id, `southwest-${tree.x.toFixed(3)}-${tree.z.toFixed(3)}`);
    assert.ok(tree.harvestable && tree.log);
    assert.ok(world.colliders.some(c => c.id === tree.id && c.species === tree.species), tree.id);
  }
  const skills = createSkills(); skills.learn('woodcutting'); skills.gain('woodcutting', MAX_XP);
  const wood = createWoodcutting({ skills, trees, random: () => 0 }), axe = id => id === 'bronze-axe';
  const pine = trees.find(tree => tree.species === 'loblolly-pine'), oak = trees.find(tree => tree.species === 'white-oak');
  assert.deepEqual(wood.snapshot().trees, [], 'newly registered untouched trees do not enlarge an old save');
  assert.equal(wood.swing(pine.id, axe).felled, true);
  assert.equal(wood.swing(oak.id, axe).felled, false);
  const saved = wood.snapshot(), copy = createWoodcutting({ skills, trees, random: () => 0 });
  assert.equal(copy.restore(saved), true); assert.deepEqual(copy.snapshot(), saved);
  assert.equal(copy.standing(pine.id), false); assert.equal(copy.standing(oak.id), true);
  assert.equal(copy.swing(oak.id, axe).felled, true, 'a partial tree keeps only its remaining log');
  const collider = world.colliders.find(c => c.id === pine.id);
  const pineBatch = trunkBatches.find(mesh => mesh.name === 'Navarth north wood trunks');
  const pineIndex = Array.from({ length: pineBatch.count }, (_, i) => i).find(i => {
    const e = pineBatch.instanceMatrix.array;
    return Math.hypot(e[i * 16 + 12] - pine.x, e[i * 16 + 14] - pine.z) < .001;
  });
  assert.notEqual(pineIndex, undefined);
  const original = new THREE.Matrix4(), matrix = new THREE.Matrix4(); pineBatch.getMatrixAt(pineIndex, original);
  const crowns = group.children.find(mesh => mesh.name === 'Navarth north wood crowns');
  assert.equal(world.treeRegistry.set(pine.id, false), true);
  assert.equal(world.colliders.includes(collider), false);
  pineBatch.getMatrixAt(pineIndex, matrix); assert.equal(matrix.determinant(), 0);
  for (let i = 0; i < 3; i++) { crowns.getMatrixAt(pineIndex * 3 + i, matrix); assert.equal(matrix.determinant(), 0); }
  assert.ok(world.colliders.some(c => c.id === oak.id));
  assert.equal(world.treeRegistry.set(pine.id, true), true);
  assert.ok(world.colliders.includes(collider));
  pineBatch.getMatrixAt(pineIndex, matrix); assert.deepEqual(matrix.elements, original.elements);
});


test('all 63 existing Meroshe thorn roots meet the rendered terrain and keep their own saved log identity', t => {
  assert.equal(thornBatch.count, 63);
  const trees = world.treeRegistry.trees.filter(tree => tree.species === 'desert-thorn' && hexOwnerAt(tree.x, tree.z) === 'North Meroshe Desert');
  assert.equal(trees.length, thornBatch.count);
  assert.equal(new Set(trees.map(tree => tree.id)).size, 63);
  const matrix = new THREE.Matrix4(), point = new THREE.Vector3(), gaps = [], p = thornBatch.geometry.attributes.position;
  for (let i = 0; i < thornBatch.count; i++) {
    thornBatch.getMatrixAt(i, matrix); matrix.premultiply(thornBatch.matrixWorld);
    const tree = trees.find(tree => Math.hypot(tree.x - matrix.elements[12], tree.z - matrix.elements[14]) < .001);
    assert.ok(tree, `registered thorn ${i}`);
    assert.equal(tree.id, `southwest-${tree.x.toFixed(3)}-${tree.z.toFixed(3)}`);
    assert.equal(hexOwnerAt(tree.x, tree.z), 'North Meroshe Desert');
    assert.equal(tree.log, 'desert-thorn-logs');
    assert.ok(tree.harvestable);
    let gap = -Infinity;
    for (let v = 0; v < p.count; v++) {
      if (Math.abs(p.getY(v) + .5) > 1e-6) continue;
      point.fromBufferAttribute(p, v).applyMatrix4(matrix);
      gap = Math.max(gap, point.y - drawnHeight(point.x, point.z));
    }
    gaps.push(gap);
  }
  t.diagnostic(`Meroshe roots: ${gaps.length}, gap range ${Math.min(...gaps)} to ${Math.max(...gaps)}m`);
  assert.ok(gaps.every(gap => gap >= -.035 && gap <= -.025), 'every thorn foot is embedded about 3cm');
  const tree = trees[0], skills = createSkills(); skills.learn('woodcutting'); skills.gain('woodcutting', MAX_XP);
  const wood = createWoodcutting({ skills, trees, random: () => 0 });
  const cut = wood.swing(tree.id, id => id === 'bronze-axe');
  assert.equal(cut.log, 'desert-thorn-logs'); assert.equal(cut.felled, true);
  assert.ok(LOG_ITEMS.includes(cut.log)); assert.equal(INVENTORY_ITEMS[cut.log].name, 'Desert thorn logs');
  const inventory = createInventoryState(); inventory.add(cut.log, 1); inventory.grant('tinderbox');
  assert.deepEqual(wood.offer(id => inventory.count(id)).lots, [{ item: cut.log, count: 1, price: 1 }]);
  const camp = createCampcraft({ inventory, weapons: { spendSticks: () => { throw new Error('thorn log should be used as fuel'); } } });
  assert.ok(camp.light('village-fire').ok); assert.equal(inventory.count(cut.log), 0);
  const saved = wood.snapshot(), copy = createWoodcutting({ skills, trees, random: () => 0 });
  assert.ok(copy.restore(saved)); assert.deepEqual(copy.snapshot(), saved); assert.equal(copy.standing(tree.id), false);
  const collider = world.colliders.find(c => c.id === tree.id), original = new THREE.Matrix4(); thornBatch.getMatrixAt(0, original);
  assert.ok(collider && collider.species === 'desert-thorn');
  world.treeRegistry.set(tree.id, copy.standing(tree.id));
  thornBatch.getMatrixAt(0, matrix); assert.equal(matrix.determinant(), 0); assert.ok(!world.colliders.includes(collider));
  const crowns = group.getObjectByName(`${thornName} crowns`);
  for (let i = 0; i < 3; i++) { crowns.getMatrixAt(i, matrix); assert.equal(matrix.determinant(), 0); }
  assert.ok(copy.update(25).includes(tree.id)); world.treeRegistry.set(tree.id, copy.standing(tree.id));
  thornBatch.getMatrixAt(0, matrix); assert.deepEqual(matrix.elements, original.elements);
  assert.ok(world.colliders.includes(collider)); assert.deepEqual(copy.snapshot().trees, []);
});

const merosheZones = SOUTHWEST_WILDLIFE_ZONES.filter(zone => MEROSHE_REGIONS.includes(zone.region));
const { createWestLife } = await sourceModule('../src/west-regions-life.js');
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function dryFooting(animal, zone) {
  if (animal.action === 'fly') {
    assert.ok(animal.x >= zone.minX && animal.x <= zone.maxX && animal.z >= zone.minZ && animal.z <= zone.maxZ, `${animal.id}: flight stays in range`);
    return; // Airborne gulls can cross water; their landing must use dry footing.
  }
  assert.equal(world.regionAt(animal.x, animal.z)?.name, zone.region, animal.id);
  assert.ok(canStand(animal.x, animal.z, world, zone.radius), `${animal.id}: clear dry footing`);
  const y = world.heightAt(animal.x, animal.z), water = world.waterAt(animal.x, animal.z);
  assert.ok(water === null || water <= y, `${animal.id}: dry bank`);
  // A fleeing gull may be airborne, while a hare's lift is separate from groundY.
  if (animal.species === 'upland-hare' || animal.action === 'graze' || animal.action === 'walk')
    assert.ok(Math.abs(animal.groundY - y) < .001, `${animal.id}: logical ground height`);
}

test('the four Meroshe countries retain seven sparse wildlife ranges and fourteen stable residents', t => {
  assert.equal(merosheZones.length, 7);
  assert.equal(merosheZones.reduce((n, zone) => n + zone.sites.length, 0), 14);
  assert.deepEqual(MEROSHE_REGIONS.map(region => merosheZones.filter(zone => zone.region === region).length), [2, 2, 1, 2]);
  const life = createWestLife(new THREE.Scene(), world, { zones: merosheZones });
  try {
    const animals = life.state().creatures; assert.equal(animals.length, 14);
    const gaps = [];
    for (const zone of merosheZones) {
      const residents = animals.filter(animal => animal.id.startsWith(`${zone.id}-`));
      assert.equal(residents.length, zone.sites.length);
      for (let i = 0; i < residents.length; i++) {
        const animal = residents[i]; assert.equal(animal.id, `${zone.id}-${i + 1}`);
        if (zone.air) continue;
        dryFooting(animal, zone);
        assert.deepEqual([animal.x, animal.z], zone.sites[i], 'authored dry homes need no relocation');
        if (zone.id === 'thorn-ground-hares') {
          assert.ok(world.treeRegistry.trees.some(tree => tree.species === 'desert-thorn' && distance(tree, animal) < 25), `${animal.id}: actual thorn-tree cover`);
        } else if (zone.id === 'fog-margin-hares') {
          for (const name of ['Meroshe fog thorn', 'Meroshe fog lichen']) {
            const mesh = group.getObjectByName(name), e = mesh.instanceMatrix.array;
            assert.ok(Array.from({ length: mesh.count }, (_, i) => Math.hypot(e[i * 16 + 12] - animal.x, e[i * 16 + 14] - animal.z)).some(d => d < 10), `${animal.id}: actual ${name} within 10m`);
          }
        } else assert.ok(landDistance(animal.x, animal.z) <= 30, `${animal.id}: shore habitat within 30m of sea`);
        gaps.push({ id: animal.id, gap: animal.groundY - drawnHeight(animal.x, animal.z) });
      }
    }
    t.diagnostic(`Initial ground-animal analytic/rendered gaps: ${JSON.stringify(gaps)}`);
  } finally { life.dispose(); }
});

function shownFeet(animalScene, zone, animals) {
  const body = animalScene.getObjectByName(zone.id)?.getObjectByName(`${zone.species} bodies`);
  assert.ok(body, `${zone.id}: visible posed body`);
  const matrix = new THREE.Matrix4();
  for (const [i, animal] of animals.entries()) {
    body.getMatrixAt(i, matrix);
    const expected = zone.air || zone.sea || zone.float ? animal.y : drawnHeight(animal.x, animal.z) + animal.lift;
    assert.ok(Math.abs(matrix.elements[13] - expected) < .002, `${animal.id}: actual body origin follows displayed footing (${matrix.elements[13] - expected}m)`);
  }
}

test('R4/R5 ground animals visibly meet real triangles while floating and soaring animals retain their own heights', t => {
  const zones = SOUTHWEST_WILDLIFE_ZONES.filter(zone => [...SOUTHWEST_NORTH_REGIONS, ...MEROSHE_REGIONS].includes(zone.region));
  const animalScene = new THREE.Scene(), life = createWestLife(animalScene, world, { zones });
  const differences = [];
  try {
    const before = life.snapshot().creatures;
    for (const zone of zones) {
      life.setObserver({ x: (zone.minX + zone.maxX) / 2, z: (zone.minZ + zone.maxZ) / 2 });
      const animals = life.state().creatures.filter(animal => animal.id.startsWith(`${zone.id}-`));
      assert.equal(animals.length, zone.sites.length, zone.id);
      shownFeet(animalScene, zone, animals);
      if (!zone.air && !zone.float && !zone.sea) for (const animal of animals) {
        dryFooting(animal, zone);
        differences.push({ id: animal.id, gap: animal.groundY - drawnHeight(animal.x, animal.z) });
      }
    }
    assert.deepEqual(life.snapshot().creatures, before, 'changing visibility never edits simulation or saved identity');
    t.diagnostic(`Corrected visual footing for ${differences.length} ground residents; old worst gaps: ${JSON.stringify(differences.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap)).slice(0, 5))}`);
  } finally { life.dispose(); }
});

test('Meroshe hares flee and return over dry terrain and shore gulls land on dry banks', t => {
  for (const zone of merosheZones.filter(zone => !zone.air)) {
    const animalScene = new THREE.Scene(), life = createWestLife(animalScene, world, { zones: [zone] });
    try {
      const animals = life.state().creatures, animal = animals[0], original = [...animals], home = { x: animal.x, z: animal.z };
      let fled = false, farthest = 0;
      for (let tick = 0; tick < 120; tick++) {
        life.update(.05, { x: animal.x + 2, z: animal.z + 2 });
        fled ||= animal.action === 'flee' || animal.action === 'fly'; farthest = Math.max(farthest, distance(animal, home));
        if (tick % 4 === 0) { for (const resident of animals) dryFooting(resident, zone); shownFeet(animalScene, zone, animals); }
      }
      assert.ok(fled && farthest > 2, `${zone.id}: actually escapes`);
      const observer = { x: home.x + 65, z: home.z + 65 };
      let nearestReturn = Infinity, settled = false;
      for (let tick = 0; tick < 1400; tick++) {
        life.update(.05, observer); nearestReturn = Math.min(nearestReturn, distance(animal, home));
        if (tick % 4 === 0) { for (const resident of animals) dryFooting(resident, zone); shownFeet(animalScene, zone, animals); }
        settled ||= distance(animal, home) < 6.05 && ['graze', 'walk'].includes(animal.action);
        if (settled) break;
      }
      t.diagnostic(`${zone.id}: fled ${farthest.toFixed(2)}m, returned ${nearestReturn.toFixed(2)}m, ${animal.action}`);
      assert.ok(settled, `${zone.id}: safe settled return`);
      life.update(.1, { x: 10000, z: 10000 }); assert.ok(life.state().groups.every(group => !group.visible));
      life.setObserver(home);
      for (let i = 0; i < animals.length; i++) assert.equal(life.state().creatures[i], original[i]);
    } finally { life.dispose(); }
  }
});


const reviewedGroups = [
  { id: 'R6', regions: WEST_EDGE_REGIONS, count: 49, species: ['desert-thorn', 'olive'] },
  { id: 'R7', regions: EAST_EDGE_REGIONS, count: 4503,
    species: ['white-poplar', 'black-willow', 'tamarisk', 'holm-oak', 'mahogany', 'kapok', 'strangler-fig', 'red-mangrove'] },
];
const everyTrunk = group.children.filter(mesh => mesh.isInstancedMesh && mesh.name.endsWith(' trunks'));
const ownedTrees = regions => world.treeRegistry.trees.filter(tree => tree.id.startsWith('southwest-') && regions.includes(hexOwnerAt(tree.x, tree.z)));
function findTrunk(tree) {
  for (const mesh of everyTrunk) {
    const e = mesh.instanceMatrix.array;
    for (let i = 0; i < mesh.count; i++) if (Math.hypot(e[i * 16 + 12] - tree.x, e[i * 16 + 14] - tree.z) < .001) return { mesh, index: i };
  }
  return null;
}
for (const review of reviewedGroups) {
  test(`${review.id} preserves every existing trunk and seats its complete leaning foot on real triangles`, t => {
    const trees = ownedTrees(review.regions), matrix = new THREE.Matrix4(), point = new THREE.Vector3(), gaps = [];
    assert.equal(trees.length, review.count);
    assert.equal(new Set(trees.map(tree => tree.id)).size, trees.length);
    assert.deepEqual(new Set(trees.map(tree => tree.species)), new Set(review.species));
    for (const mesh of everyTrunk) {
      const e = mesh.instanceMatrix.array, p = mesh.geometry.attributes.position;
      for (let i = 0; i < mesh.count; i++) {
        if (!review.regions.includes(hexOwnerAt(e[i * 16 + 12], e[i * 16 + 14]))) continue;
        mesh.getMatrixAt(i, matrix); matrix.premultiply(mesh.matrixWorld);
        const tree = trees.find(tree => Math.hypot(tree.x - e[i * 16 + 12], tree.z - e[i * 16 + 14]) < .001);
        assert.ok(tree, `${mesh.name} ${i}: stable record`);
        assert.equal(tree.id, `southwest-${tree.x.toFixed(3)}-${tree.z.toFixed(3)}`);
        assert.ok(tree.harvestable && tree.log, tree.id);
        assert.ok(world.colliders.some(c => c.id === tree.id && c.species === tree.species), tree.id);
        let gap = -Infinity;
        for (let v = 0; v < p.count; v++) {
          if (Math.abs(p.getY(v) + .5) > 1e-6) continue;
          point.fromBufferAttribute(p, v).applyMatrix4(matrix);
          gap = Math.max(gap, point.y - drawnHeight(point.x, point.z));
        }
        gaps.push({ id: tree.id, gap });
      }
    }
    assert.equal(gaps.length, review.count);
    t.diagnostic(`${review.id} ${gaps.length} roots: range ${Math.min(...gaps.map(t => t.gap))} to ${Math.max(...gaps.map(t => t.gap))}m`);
    assert.deepEqual(gaps.filter(tree => tree.gap < -.035 || tree.gap > -.025), [], 'all rendered root footprints are embedded about 3cm');
  });

  test(`${review.id} keeps each assigned species through partial saves, its own logs, felling and exact mesh regrowth`, () => {
    const trees = ownedTrees(review.regions), skills = createSkills(); skills.learn('woodcutting'); skills.gain('woodcutting', MAX_XP);
    for (const species of review.species) {
      const tree = trees.find(tree => tree.species === species), wood = createWoodcutting({ skills, trees: [tree], random: () => 0 });
      const cut = wood.swing(tree.id, id => id === 'bronze-axe'); assert.equal(cut.log, tree.log); assert.ok(LOG_ITEMS.includes(cut.log));
      assert.ok(INVENTORY_ITEMS[cut.log], species);
      const saved = wood.snapshot(), copy = createWoodcutting({ skills, trees: [tree], random: () => 0 });
      assert.ok(copy.restore(saved)); assert.deepEqual(copy.snapshot(), saved);
      for (let swings = 0; copy.standing(tree.id) && swings < 8; swings++) assert.equal(copy.swing(tree.id, id => id === 'bronze-axe').log, tree.log);
      assert.equal(copy.standing(tree.id), false, `${species}: saved partial stock can be exhausted`);
      const { mesh, index } = findTrunk(tree), original = new THREE.Matrix4(), matrix = new THREE.Matrix4(); mesh.getMatrixAt(index, original);
      const collider = world.colliders.find(c => c.id === tree.id), crowns = group.getObjectByName(mesh.name.replace(/ trunks$/, ' crowns'));
      assert.ok(collider); world.treeRegistry.set(tree.id, copy.standing(tree.id));
      mesh.getMatrixAt(index, matrix); assert.equal(matrix.determinant(), 0); assert.ok(!world.colliders.includes(collider));
      for (let i = 0; i < 3; i++) { crowns.getMatrixAt(index * 3 + i, matrix); assert.equal(matrix.determinant(), 0); }
      assert.ok(copy.update(200).includes(tree.id)); world.treeRegistry.set(tree.id, copy.standing(tree.id));
      mesh.getMatrixAt(index, matrix); assert.deepEqual(matrix.elements, original.elements); assert.ok(world.colliders.includes(collider));
      assert.deepEqual(copy.snapshot().trees, []);
    }
  });

  test(`${review.id} visible wildlife uses real displayed ground while keeping its habitat, identity and water/air heights`, t => {
    const zones = SOUTHWEST_WILDLIFE_ZONES.filter(zone => review.regions.includes(zone.region));
    const animalScene = new THREE.Scene(), life = createWestLife(animalScene, world, { zones }), differences = [];
    try {
      const before = life.snapshot().creatures, identity = life.state().creatures;
      assert.equal(identity.length, zones.reduce((n, zone) => n + zone.sites.length, 0));
      for (const zone of zones) {
        const observer = { x: (zone.minX + zone.maxX) / 2, z: (zone.minZ + zone.maxZ) / 2 };
        life.setObserver(observer);
        const animals = identity.filter(animal => animal.id.startsWith(`${zone.id}-`));
        assert.equal(animals.length, zone.sites.length, zone.id); shownFeet(animalScene, zone, animals);
        if (!zone.air && !zone.float && !zone.sea) for (const animal of animals) {
          dryFooting(animal, zone);
          differences.push({ id: animal.id, gap: animal.groundY - drawnHeight(animal.x, animal.z) });
        }
      }
      assert.deepEqual(life.snapshot().creatures, before, 'observer allocation cannot change simulation');
      for (const zone of zones) {
        const observer = { x: (zone.minX + zone.maxX) / 2, z: (zone.minZ + zone.maxZ) / 2 };
        const animals = identity.filter(animal => animal.id.startsWith(`${zone.id}-`));
        for (let tick = 0; tick < 20; tick++) life.update(.05, observer);
        shownFeet(animalScene, zone, animals);
      }
      life.update(.1, { x: 10000, z: 10000 }); assert.ok(life.state().groups.every(group => !group.visible));
      life.setObserver({ x: (zones[0].minX + zones[0].maxX) / 2, z: (zones[0].minZ + zones[0].maxZ) / 2 });
      assert.equal(life.state().creatures, identity);
      t.diagnostic(`${review.id}: ${identity.length} residents, ${differences.length} ground animals; old worst displayed offsets ${JSON.stringify(differences.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap)).slice(0, 4))}`);
    } finally { life.dispose(); }
  });
}
