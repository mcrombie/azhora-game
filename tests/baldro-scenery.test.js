import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/gameplay/movement/game-state.js';
import { BALDRO_KINGDOMS, BALDRO_PATHS, baldroCellAt, baldroSurfaceHeight, baldroWaterAt } from '../src/content/regions/baldro/baldro-world.js';

const { buildBaldroScenery } = await sourceModule('../src/content/regions/baldro/baldro-scenery.js');
const { getTreeRegistry } = await sourceModule('../src/world/scenery/tree-registry.js');
const scene = new THREE.Scene(), colliders = [];
// A deliberately distinct drawn surface proves that grounding uses the supplied
// rendered terrain callback rather than the analytic terrain by coincidence.
const drawnGround = (x, z) => baldroSurfaceHeight(x, z) + Math.sin(x * .73) * Math.cos(z * .41) * .05;
const scenery = buildBaldroScenery(scene, { heightAt: baldroSurfaceHeight, treeGroundAt: drawnGround, colliders });
const world = { heightAt: baldroSurfaceHeight, waterAt: baldroWaterAt, colliders,
  bounds: { minX: -20000, maxX: 20000, minZ: -20000, maxZ: 20000 } };

test('Baldro has two distinct solid mountain portals and six visibly repairable exterior works', () => {
  assert.equal(scenery.entrances.length, 2);
  assert.equal(scenery.stats.cairns, 3); assert.equal(scenery.stats.sluices, 3);
  assert.ok(scenery.stats.outbuildings >= 2, 'working shelters make the inhabited approach visible');
  assert.equal(new Set(scenery.taskSites.map(site => site.id)).size, 6);
  for (const kingdom of BALDRO_KINGDOMS) {
    const { x, z } = kingdom.gate;
    assert.ok(canStand(x, z + 2.8, world, .5), `${kingdom.id}: portal interaction stand`);
    assert.ok(canStand(x - 5, z + 8, world, .5), `${kingdom.id}: guard stand`);
    assert.equal(canStand(x, z + 1, world, .5), false, 'the closed door leaf has matching collision');
    assert.equal(canStand(x, z - 9, world, .5), false, 'mountain backing is solid');
    const entry = scenery.entrances.find(e => e.kingdom === kingdom.id);
    assert.ok(entry.mesh.geometry.attributes.position.count > 3000, 'carved facade has modeled stonework');
    const ray = new THREE.Raycaster(new THREE.Vector3(x, kingdom.gate.y + 4, z + 10), new THREE.Vector3(0, 0, -1));
    scene.updateMatrixWorld(true);
    assert.ok(ray.intersectObject(entry.mesh).length > 0, 'the entrance has a closed visible door');
    for (const site of kingdom.taskSites) assert.ok(canStand(site.x, site.z, world, .5), `${site.id}: clear work stand`);
  }
  for (const site of scenery.taskSites) {
    assert.ok(site.damagedMesh.visible); assert.equal(site.completeMesh.visible, false);
    assert.equal(scenery.setTaskComplete(site.id), true);
    assert.equal(site.damagedMesh.visible, false); assert.ok(site.completeMesh.visible);
    scenery.setTaskComplete(site.id, false);
  }
  assert.equal(scenery.setTaskComplete('missing'), false);
});

test('every connected Baldro approach and the inter-kingdom traverse remain clear after scenery', () => {
  for (const path of BALDRO_PATHS) for (let i = 1; i < path.points.length; i++) {
    const a = path.points[i - 1], b = path.points[i], count = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z));
    for (let j = 0; j <= count; j++) {
      const x = a.x + (b.x - a.x) * j / count, z = a.z + (b.z - a.z) * j / count;
      // The route terminates at the closed portal's centre; walking ends at
      // its interaction threshold, then the host changes to the interior.
      if (BALDRO_KINGDOMS.some(k => Math.hypot(x - k.gate.x, z - k.gate.z) < 2.2)) continue;
      assert.ok(canStand(x, z, world, .5), `${path.id}: scenery blocks ${x},${z}`);
    }
  }
});

test('both full mountain countries carry registered trees and locally culled native ground cover', () => {
  const registry = getTreeRegistry(colliders), { trees, stats } = scenery;
  assert.ok(trees.length > 700, 'forests extend beyond the city approach');
  assert.equal(trees.length, stats.trees); assert.equal(registry.trees.length, trees.length);
  assert.deepEqual(new Set(trees.map(t => t.species)), new Set(['stone-pine', 'silver-fir', 'silver-birch', 'common-juniper']));
  assert.ok(stats.byRegion[53].trees > stats.byRegion[52].trees * 1.5, 'sheltered east has a denser canopy than the exposed west');
  assert.ok(stats.rocks > 3500 && stats.tufts > 2000 && stats.flowers > 150);
  for (const tree of trees) {
    assert.equal(baldroCellAt(tree.x, tree.z)?.region, tree.region);
    assert.ok(tree.log && tree.harvestable); assert.equal(baldroWaterAt(tree.x, tree.z), null);
    assert.ok(colliders.some(c => c.id === tree.id));
  }
  for (const mesh of scenery.batches) {
    const size = mesh.boundingBox.getSize(new THREE.Vector3());
    assert.ok(size.x < 122 && size.z < 122, `${mesh.name}: culling remains local`);
    assert.ok([...mesh.instanceMatrix.array].every(Number.isFinite));
  }
  const tree = trees[0], neighbour = trees[1];
  registry.set(tree.id, false);
  assert.equal(colliders.some(c => c.id === tree.id), false);
  assert.ok(colliders.some(c => c.id === neighbour.id)); registry.set(tree.id, true);
});

test('the whole foot of each Baldro tree is embedded in the actual rendered ground', () => {
  const matrix = new THREE.Matrix4(), vertex = new THREE.Vector3(); let checked = 0;
  for (const mesh of scenery.batches.filter(m => m.geometry.parameters?.radiusTop === .72)) {
    const positions = mesh.geometry.attributes.position;
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix); let highest = -Infinity;
      for (let j = 0; j < positions.count; j++) if (Math.abs(positions.getY(j) + .5) < 1e-6) {
        vertex.fromBufferAttribute(positions, j).applyMatrix4(matrix);
        highest = Math.max(highest, vertex.y - drawnGround(vertex.x, vertex.z));
      }
      // Birch's dark bark rings share trunk geometry but stand higher up it.
      if (matrix.elements[5] < 1) continue;
      assert.ok(highest < -.029 && highest > -.041, `visible root gap ${highest}`); checked++;
    }
  }
  assert.equal(checked, scenery.trees.length);
});
