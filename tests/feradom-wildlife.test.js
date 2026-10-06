import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { scopedWorld } from './scoped-world.js';
import { createHash } from 'node:crypto';
import { REGION_CELLS } from '../src/world/terrain/region-world.js';
import { canStand } from '../src/gameplay/movement/game-state.js';
import { FERADOM_WILDLIFE_ZONES, FERADOM_COUNTRYSIDE_WILDLIFE_ZONES } from '../src/content/regions/feradom/feradom-wildlife.js';
import { FARMSTEADS } from '../src/world/scenery/regional-farmland.js';
import { createWoodcutting } from '../src/gameplay/skills/woodcutting/woodcutting.js';
import { createSkills, MAX_XP } from '../src/gameplay/skills/skills.js';

const { createWestLife, LIFE_REACH } = await sourceModule('../src/content/regions/western-regions/west-regions-life.js');
const world = await scopedWorld(new THREE.Scene(), [21]);
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const center = zone => ({ x: (zone.minX + zone.maxX) / 2, z: (zone.minZ + zone.maxZ) / 2 });

function withLife(run) {
  const scene = new THREE.Scene(), life = createWestLife(scene, world, { zones: FERADOM_WILDLIFE_ZONES });
  try { return run(life, scene); } finally { life.dispose(); }
}

test('production Feradom keeps existing tree save identities and all seven working farm approaches', () => {
  // Coordinate IDs identify the hill forest; named farm orchard IDs share the
  // region prefix and are supplied by the separate regional-farmland job.
  const trees = world.treeRegistry.trees.filter(tree => /^feradom--?\d/.test(tree.id));
  const facts = trees.map(({ id, x, z, height, species }) => [id, x, z, height, species]);
  assert.equal(trees.length, 3730);
  assert.equal(createHash('sha256').update(JSON.stringify(facts)).digest('hex'),
    '03cbb57000457a36be3a7f368e262bd4996a2a3f4d24150bcbf6a4a5e19b552e');
  const skills = createSkills(); skills.learn('woodcutting'); skills.gain('woodcutting', MAX_XP);
  const wood = createWoodcutting({ skills, trees, random: () => 0 }), axe = id => id === 'bronze-axe';
  const fir = trees.find(tree => tree.species === 'silver-fir'), oak = trees.find(tree => tree.species === 'white-oak');
  assert.equal(wood.swing(fir.id, axe).felled, true);
  assert.equal(wood.swing(oak.id, axe).felled, false);
  const saved = wood.snapshot(), restored = createWoodcutting({ skills, trees, random: () => 0 });
  assert.equal(restored.restore(saved), true);
  assert.deepEqual(restored.snapshot(), saved);
  assert.equal(restored.standing(fir.id), false);
  assert.equal(restored.standing(oak.id), true);
  assert.equal(restored.swing(oak.id, axe).felled, true, 'saved partial oak keeps only its remaining log');
  world.treeRegistry.set(fir.id, restored.standing(fir.id));
  assert.equal(world.colliders.some(collider => collider.id === fir.id), false);
  assert.ok(world.colliders.some(collider => collider.id === oak.id));
  world.treeRegistry.set(fir.id, true);
  const farms = FARMSTEADS.filter(farm => farm.region === 'Feradom');
  assert.equal(farms.length, 7);
  for (const farm of farms) {
    for (const row of farm.rows) assert.ok(canStand(row.x, row.z, world), `${row.id}: usable field`);
    for (const point of farm.approach) assert.ok(canStand(point.x, point.z, world), `${farm.id}: clear approach`);
    assert.ok(canStand(farm.seedStation.x, farm.seedStation.z + 1.2, world), `${farm.id}: seed bench`);
    assert.ok(canStand(farm.shed.x, farm.shed.z + 1, world), `${farm.id}: tool shelter`);
  }
});

test('Feradom has resident land animals across every plain and hill hex', () => withLife(life => {
  const animals = life.state().creatures.filter(animal => animal.species !== 'plateau-hawk');
  assert.ok(animals.length >= 75, `resident land population: ${animals.length}`);
  assert.equal(new Set(animals.map(animal => animal.id)).size, animals.length);
  for (const cell of REGION_CELLS.Feradom) {
    const nearest = Math.min(...animals.map(animal => distance(cell, animal)));
    assert.ok(nearest <= 65, `${cell.q},${cell.r}: nearest land animal is ${nearest.toFixed(1)} m away`);
    if (cell.terrain !== 'plains') continue;
    for (const [dx, dz] of [[-34, 0], [34, 0], [0, -34], [0, 34]]) {
      const p = { x: cell.x + dx, z: cell.z + dz };
      if (world.regionAt(p.x, p.z)?.name !== 'Feradom' || !canStand(p.x, p.z, world)) continue;
      const gap = Math.min(...animals.map(animal => distance(p, animal)));
      assert.ok(gap <= 80, `${cell.q},${cell.r}: ${gap.toFixed(1)} m of empty plain`);
    }
  }
}));

test('Feradom resident wildlife is placed on dry, unobstructed ground inside the region', () => withLife(life => {
  const animals = life.state().creatures;
  for (const zone of FERADOM_COUNTRYSIDE_WILDLIFE_ZONES) {
    const band = animals.filter(animal => animal.id.startsWith(`${zone.id}-`));
    assert.equal(band.length, 2, `${zone.id}: both residents find a home around scenery`);
    assert.ok(Math.hypot(zone.maxX - zone.minX, zone.maxZ - zone.minZ) / 2 < LIFE_REACH);
    for (const animal of band) {
      assert.equal(world.regionAt(animal.x, animal.z)?.name, 'Feradom', animal.id);
      assert.ok(canStand(animal.x, animal.z, world, zone.radius), `${animal.id}: clear ground`);
      assert.ok(!zone.exclusions.some(area => animal.x >= area.minX && animal.x <= area.maxX
        && animal.z >= area.minZ && animal.z <= area.maxZ), `${animal.id}: outside planted beds and farm shelter`);
      assert.equal(animal.groundY, world.heightAt(animal.x, animal.z), `${animal.id}: grounded`);
    }
  }
}));

test('plain wildlife renders on approach, flees, and keeps the same residents through culling', () => withLife((life, scene) => {
  const matrix = new THREE.Matrix4(), original = new Map(life.state().creatures.map(animal => [animal.id, animal]));
  for (const zone of FERADOM_COUNTRYSIDE_WILDLIFE_ZONES) {
    life.update(.05, center(zone));
    const group = scene.children.find(object => object.name === zone.id);
    assert.ok(group?.visible, `${zone.id}: renders when approached`);
    group.traverse(mesh => {
      if (!mesh.isInstancedMesh) return;
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, matrix);
        assert.ok(matrix.elements.every(Number.isFinite));
        assert.ok(matrix.determinant() > 0);
      }
    });
  }
  const hare = life.state().creatures.find(animal => animal.id.startsWith('feradom-country-') && animal.species === 'upland-hare');
  const start = { x: hare.x, z: hare.z };
  let fled = false;
  for (let tick = 0; tick < 100; tick++) {
    life.update(.05, { x: hare.x + 2, z: hare.z + 2 });
    fled ||= hare.action === 'flee';
  }
  assert.ok(fled && distance(hare, start) > 1, 'a traveler causes a visible flight response');
  life.update(.1, { x: 10000, z: 10000 });
  assert.ok(life.state().groups.every(group => !group.visible), 'distant groups are culled');
  for (const animal of life.state().creatures) assert.equal(animal, original.get(animal.id));
  const paused = life.snapshot();
  life.update(.5, start, false);
  assert.deepEqual(life.snapshot(), paused, 'menus pause the animals');
}));
