import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
const { createWestLife } = await sourceModule('../src/content/regions/western-regions/west-regions-life.js');
const world = { bounds: { minX: -1000, maxX: 1000, minZ: -1000, maxZ: 1000 },
  heightAt: () => 3, waterAt: () => null, colliders: [] };
for (const species of ['road-fox', 'spine-lizard']) {
  test(`${species} has a complete posed model and escapes an approaching traveler`, () => {
    const scene = new THREE.Scene();
    const zone = { id: species, species, region: 'Dryland test', radius: .3, habitat: 'countryside',
      minX: -80, maxX: 80, minZ: -80, maxZ: 80, sites: [[0, 0]] };
    const life = createWestLife(scene, world, { zones: [zone] });
    life.setObserver({ x: 0, z: 0 });
    life.update(.02, { x: 0, z: 4 }, true);
    let meshes = 0;
    const matrix = new THREE.Matrix4();
    scene.traverse(object => {
      if (!object.isInstancedMesh) return;
      meshes++;
      for (let i = 0; i < object.count; i++) {
        object.getMatrixAt(i, matrix);
        assert.ok(matrix.elements.every(Number.isFinite));
        assert.ok(matrix.determinant() > 0);
      }
    });
    assert.equal(meshes, 3, 'body, head and four animated legs');
    for (let i = 0; i < 90; i++) life.update(1 / 30, { x: 0, z: 4 }, true);
    const animal = life.snapshot().creatures[0];
    assert.ok(Math.hypot(animal.x, animal.z - 4) > 10, 'moves away instead of remaining a static prop');
    assert.ok(Math.abs(animal.x) < 80 && Math.abs(animal.z) < 80);
    life.dispose();
  });
}
