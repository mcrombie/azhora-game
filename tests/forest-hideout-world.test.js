import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from '../vendor/three.module.js';
import { canStand, moveCharacter } from '../src/game-state.js';
import { sourceModule } from './module-loader.js';

const source = (await readFile(new URL('../src/forest-hideout-world.js', import.meta.url), 'utf8'))
  .replace("'three'", `'${new URL('../vendor/three.module.js', import.meta.url).href}'`);
const { FOREST_HIDEOUT: site, forestHideoutClear, tintForestHideoutGround, createForestHideout } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
function fixture() {
  const scene = new THREE.Scene(), world = { heightAt: (x, z) => 4 + Math.sin(x * .05) * .4 + Math.cos(z * .02),
    bounds: { minX: -94, maxX: 94, minZ: -162, maxZ: 48 }, colliders: [] };
  return { scene, world, art: createForestHideout(scene, world) };
}

test('Hideout preserves its full fighting circle, optional approach, enemy spawns and supplies access', () => {
  const { world, art } = fixture();
  for (let x = site.x - 9; x <= site.x + 9; x += .5) for (let z = site.z - 9; z <= site.z + 9; z += .5)
    if (Math.hypot(x - site.x, z - site.z) <= 9) assert.ok(canStand(x, z, world, .6), `Arena obstructed at ${x},${z}`);
  for (const p of [site.approach, site.checkpoint, site.supplies, ...site.enemies]) assert.ok(canStand(p.x, p.z, world, .8));
  const p = { ...site.trail[0] };
  for (const target of [...site.trail.slice(1), site.supplies, ...site.trail.slice().reverse()]) {
    moveCharacter(p, target.x - p.x, target.z - p.z, world);
    assert.ok(Math.hypot(p.x - target.x, p.z - target.z) < .04, `Cannot walk to ${target.x},${target.z}`);
  }
  const curve = new THREE.CatmullRomCurve3(site.trail.map(p => new THREE.Vector3(p.x, 0, p.z)));
  for (const p of curve.getPoints(350)) assert.ok(canStand(p.x, p.z, world, .6), `Curved approach blocked at ${p.x},${p.z}`);
  art.dispose();
});

test('Clearance and terrain tint are confined to the new camp and its eastern forest spur', () => {
  for (const p of [site.center, site.approach, site.supplies, ...site.enemies]) assert.ok(forestHideoutClear(p.x, p.z, true));
  for (const p of [{ x: 0, z: 5 }, { x: 27, z: -77 }, { x: -37, z: -87 }, { x: 0, z: -175 }, { x: 0, z: -620 }]) {
    assert.equal(forestHideoutClear(p.x, p.z, true), false);
    const initial = new THREE.Color('#859a59'), tinted = initial.clone(); tintForestHideoutGround(tinted, p.x, p.z);
    assert.ok(tinted.equals(initial));
  }
  assert.ok(forestHideoutClear(site.x + 15, site.z, true, 4), 'Canopy clearance protects the shoulder camera');
  assert.ok(forestHideoutClear(84, -124.8, true, 9), 'The broad-phase bounds must include large canopies above the supply corner');
});

test('Drent keeps every original collectible, and the goblin camp in southern Pueth connects to the road north', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const { createWoodlandLife } = await sourceModule('../src/woodland-life.js');
  const scene = new THREE.Scene(), world = createWorld(scene), life = createWoodlandLife(scene, world), original = life.state();
  assert.deepEqual([original.acorns.length, original.sticks.length, original.fruits.length], [24, 14, 12]);
  assert.ok(original.squirrels.length > 4, 'the four village squirrels are joined by residents throughout Drent');
  const treeIds = new Set([...world.broadleafTrees, ...world.regionalBroadleafTrees].map(tree => tree.id));
  assert.equal(new Set(original.squirrels.map(squirrel => squirrel.tree.id)).size, original.squirrels.length, 'every squirrel has its own tree');
  assert.ok(original.squirrels.every(squirrel => treeIds.has(squirrel.tree.id)), 'squirrel homes belong to actual woodland trees');
  assert.equal(world.forestHideout.id, site.id);
  const camp = world.forestHideout;
  const curve = new THREE.CatmullRomCurve3(camp.trail.map(p => new THREE.Vector3(p.x, 0, p.z)));
  for (const p of curve.getPoints(420)) assert.ok(canStand(p.x, p.z, world, .6), `Integrated trail blocked at ${p.x},${p.z}`);
  for (let x = camp.center.x - 9; x <= camp.center.x + 9; x += .6) for (let z = camp.center.z - 9; z <= camp.center.z + 9; z += .6)
    if (Math.hypot(x - camp.center.x, z - camp.center.z) <= 9) assert.ok(canStand(x, z, world, .6), `Integrated arena blocked at ${x},${z}`);
  // A connected-space flood catches isolated but individually clear pickup or
  // supply points, including the existing woodland and the new eastern spur.
  const minX = -172, minZ = -60, width = 185, height = 155, cells = new Int8Array(width * height), queue = [];
  const start = (29 - minZ) * width + (-15 - minX); cells[start] = 1; queue.push(start);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const index = queue[cursor], ix = index % width, iz = Math.floor(index / width);
    for (const [nx, nz] of [[ix - 1, iz], [ix + 1, iz], [ix, iz - 1], [ix, iz + 1]]) {
      if (nx < 0 || nz < 0 || nx >= width || nz >= height) continue;
      const next = nz * width + nx; if (cells[next]) continue;
      cells[next] = canStand(minX + nx, minZ + nz, world, .48) ? 1 : -1;
      if (cells[next] === 1) queue.push(next);
    }
  }
  assert.equal(world.regionAt(camp.center.x, camp.center.z).name, 'Pueth', 'the camp stands in Pueth, not in level 0 Drent');
  const targets = [...original.acorns, ...original.sticks, ...original.fruits, ...world.forestPlaces,
    ...Object.values(world.npcPositions).filter(p => p.x > -170 && p.x < 12 && p.z > -58 && p.z < 92)];
  for (const target of targets) {
    assert.ok(canStand(target.x, target.z, world, .48), `${target.id || ''} is obstructed`);
    let reached = false;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const ix = Math.round(target.x - minX) + dx, iz = Math.round(target.z - minZ) + dz;
      if (ix >= 0 && ix < width && iz >= 0 && iz < height && cells[iz * width + ix] === 1
        && Math.hypot(minX + ix - target.x, minZ + iz - target.z) < 1.01) reached = true;
    }
    assert.ok(reached, `Disconnected destination ${target.id || ''} at ${target.x},${target.z}`);
  }
  // The camp's own ground: flood from the road north, along the side trail, and reach the camp's trail, the scouts and the sacks.
  // The box follows the camp and its side trail, so it holds wherever they are put.
  const { HIDEOUT_APPROACH_TRAIL } = await sourceModule('../src/pueth-world.js');
  const road = HIDEOUT_APPROACH_TRAIL[0];
  const campPoints = [...camp.trail, camp.approach, camp.supplies, ...camp.enemies, ...HIDEOUT_APPROACH_TRAIL];
  const ox = Math.floor(Math.min(...campPoints.map(p => p.x)) - 20), oz = Math.floor(Math.min(...campPoints.map(p => p.z)) - 20);
  const w = Math.ceil(Math.max(...campPoints.map(p => p.x)) + 20) - ox, h = Math.ceil(Math.max(...campPoints.map(p => p.z)) + 20) - oz;
  const seen = new Int8Array(w * h), frontier = [];
  const first = Math.round(road.z - oz) * w + Math.round(road.x - ox); seen[first] = 1; frontier.push(first);
  for (let cursor = 0; cursor < frontier.length; cursor++) {
    const index = frontier[cursor], ix = index % w, iz = Math.floor(index / w);
    for (const [nx, nz] of [[ix - 1, iz], [ix + 1, iz], [ix, iz - 1], [ix, iz + 1]]) {
      if (nx < 0 || nz < 0 || nx >= w || nz >= h) continue;
      const next = nz * w + nx; if (seen[next]) continue;
      seen[next] = canStand(ox + nx, oz + nz, world, .48) ? 1 : -1;
      if (seen[next] === 1) frontier.push(next);
    }
  }
  for (const target of [...camp.trail, camp.approach, camp.supplies, ...camp.enemies]) {
    assert.ok(canStand(target.x, target.z, world, .48), `camp point ${target.x},${target.z} is obstructed`);
    let reached = false;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const ix = Math.round(target.x - ox) + dx, iz = Math.round(target.z - oz) + dz;
      if (ix >= 0 && ix < w && iz >= 0 && iz < h && seen[iz * w + ix] === 1) reached = true;
    }
    assert.ok(reached, `the camp at ${target.x},${target.z} cannot be reached from the road north`);
  }
});

test('Clearing lowers the camp pennant; recovering supplies removes exactly their visual and collider', () => {
  const { world, art } = fixture(), initial = world.colliders.length;
  assert.equal(art.visuals.supplies.visible, true);
  art.setState({ cleared: true }); assert.ok(art.visuals.pennant.rotation.z < -.8); assert.equal(art.visuals.supplies.visible, true);
  art.setState({ recovered: true }); assert.equal(art.visuals.supplies.visible, false); assert.equal(world.colliders.length, initial - 1);
  art.setState({ recovered: true }); assert.equal(world.colliders.length, initial - 1);
  art.setState({ recovered: false, cleared: false }); assert.equal(world.colliders.length, initial); assert.equal(art.visuals.supplies.visible, true);
  const snapshot = art.state(); snapshot.recovered = true; assert.equal(art.state().recovered, false);
  art.dispose();
});

test('Camp geometry is finite in three shared-material batches and disposal preserves outside resources', () => {
  const { scene, world, art } = fixture(), outside = { x: 1, z: 1, r: 1 }; world.colliders.push(outside);
  assert.equal(art.metrics().meshes, 3); assert.ok(art.metrics().triangles < 4000);
  const meshes = [], materials = new Set(), resources = new Set(), released = new Set();
  art.root.traverse(mesh => {
    if (!mesh.isMesh) return; meshes.push(mesh); materials.add(mesh.material);
    for (const value of mesh.geometry.attributes.position.array) assert.ok(Number.isFinite(value));
    assert.equal(mesh.geometry.attributes.color.count, mesh.geometry.attributes.position.count);
    for (const resource of [mesh.geometry, mesh.material]) if (!resources.has(resource)) {
      resources.add(resource); resource.addEventListener('dispose', () => released.add(resource));
    }
  });
  assert.equal(meshes.length, 3); assert.equal(materials.size, 1);
  art.dispose(); art.dispose(); art.setState({ recovered: false });
  assert.equal(scene.children.length, 0); assert.deepEqual(world.colliders, [outside]); assert.equal(released.size, resources.size);
});
