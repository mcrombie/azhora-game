import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';

const { createWestLife } = await sourceModule('../src/west-regions-life.js');
const { createRoadLife, ROAD_LIFE_ZONES } = await sourceModule('../src/road-life.js');
const { createWoodlandLife } = await sourceModule('../src/woodland-life.js');
const world = { bounds: { minX: -20000, maxX: 20000, minZ: -20000, maxZ: 20000 },
  heightAt: () => 3, waterAt: () => null, colliders: [] };
const zone = (id, x = 0, species = 'red-deer', extra = {}) => ({ id, species, region: 'Test woodland', radius: .5,
  minX: x - 30, maxX: x + 30, minZ: -30, maxZ: 30, sites: [[x, 0], [x + 5, 5]], ...extra });
const determinant = (mesh, index) => { const matrix = new THREE.Matrix4(); mesh.getMatrixAt(index, matrix); return matrix.determinant(); };
function verifyInstanceDeath(group, count) {
  for (const mesh of group.children.filter(o => o.isInstancedMesh)) {
    const pieces = mesh.count / count;
    for (let i = 0; i < pieces; i++) assert.equal(determinant(mesh, i), 0, `${mesh.name}: every victim part disappears`);
    assert.ok(determinant(mesh, pieces) > 0, `${mesh.name}: neighboring animal remains visible`);
  }
}

test('wildlife damage requires explicit testing context, rejects invalid amounts and respects partial health', () => {
  const scene = new THREE.Scene(), life = createWestLife(scene, world, { zones: [zone('damage')] });
  try {
    assert.deepEqual(life.bodies(), [], 'unloaded wildlife cannot be targeted');
    life.setObserver({ x: 0, z: 0 }); const original = life.state().creatures[0], id = original.id;
    for (const amount of [NaN, Infinity, -1, 0, 10001]) assert.equal(life.damage(id, amount, { testing: true }).handled, false);
    assert.equal(life.damage(id, 20).handled, false);
    assert.equal(life.damage('missing', 20, { testing: true }).handled, false);
    assert.equal(life.damage(id, 7, { testing: true }).damage, 7);
    assert.equal(original.hp, original.maxHp - 7, 'read-only state updates its health immediately');
    assert.equal(life.bodies()[0].height, 0, 'small animals are centered on their actual drawn bodies, not a human capsule');
    assert.equal(life.resetDamage(), 1); assert.equal(original.hp, original.maxHp);
  } finally { life.dispose(); }
});

test('regional fire death hides every instanced part, survives distance unload and revives only on reset', () => {
  const scene = new THREE.Scene(), life = createWestLife(scene, world, { zones: [zone('deer')] });
  try {
    life.setObserver({ x: 0, z: 0 }); const victim = life.state().creatures[0], id = victim.id;
    const result = life.damage(id, 500, { testing: true });
    assert.equal(result.killed, true); assert.equal(victim.dead, true); assert.equal(victim.hidden, true);
    assert.equal(life.damage(id, 500, { testing: true }).damage, 0, 'a dead body cannot be killed twice');
    assert.equal(life.calm(id), false); assert.ok(!life.bodies().some(a => a.id === id));
    verifyInstanceDeath(scene.getObjectByName('deer'), 2);
    const before = { x: victim.x, z: victim.z, clock: victim.clock };
    for (let i = 0; i < 10; i++) life.update(.1, { x: 0, z: 0 });
    life.setObserver({ x: 1000, z: 0 }); life.update(.1, { x: 1000, z: 0 });
    life.setObserver({ x: 0, z: 0 }); life.update(.1, { x: 0, z: 0 });
    assert.deepEqual({ x: victim.x, z: victim.z, clock: victim.clock }, before);
    verifyInstanceDeath(scene.getObjectByName('deer'), 2);
    assert.equal(life.resetDamage(), 1); assert.equal(life.resetDamage(), 0);
    assert.equal(victim.dead, false); assert.ok(life.bodies().some(a => a.id === id));
    assert.ok(determinant(scene.getObjectByName('deer').children[0], 0) > 0);
  } finally { life.dispose(); }
});

test('road sheep, bank birds and hares share reversible fire damage without changing other flock slots', () => {
  const scene = new THREE.Scene(), life = createRoadLife(scene, world);
  for (const range of ROAD_LIFE_ZONES.slice(0, 3)) {
    const victim = life.snapshot().creatures.find(a => a.species === range.species);
    life.setObserver(victim); const id = victim.id;
    assert.ok(life.bodies().some(a => a.id === id));
    assert.equal(life.damage(id, 200, { testing: true }).killed, true);
    const count = life.snapshot().groups.find(g => g.id === range.id).count;
    verifyInstanceDeath(scene.getObjectByName(range.id), count);
    const dead = life.snapshot().creatures.find(a => a.id === id);
    life.update(.1, victim); assert.equal(life.snapshot().creatures.find(a => a.id === id).clock, dead.clock);
    assert.equal(life.calm(id), false);
    life.resetDamage(); assert.ok(life.bodies().some(a => a.id === id));
  }
});

test('woodland squirrel death preserves its branch and pickups and cannot be reversed by an observer update', () => {
  const scene = new THREE.Scene();
  const trees = [[-25,17],[-11,-30],[10,-36],[10,-45],[-30,-40],[-40,30]].map(([x,z],i) => ({
    id:`test-oak-${i}`,x,z,height:12,radius:.4,trunkTopRadius:.15,trunkHeight:7,base:{x,y:3,z},axis:[0,1,0] }));
  const forest = { ...world, colliders: [], npcPositions: {}, broadleafTrees: trees, regionalBroadleafTrees: [], regionAt: () => ({ name:'Drent' }),
    training: {x:1000,z:1000}, repairBench: {x:1001,z:1001},
    paths: [[{x:0,z:-50},{x:0,z:70}]], encounter: {x:1000,z:1000,radius:1} };
  const life = createWoodlandLife(scene, forest), victim = life.state().squirrels[0];
  assert.ok(victim); life.setObserver(victim);
  const pickups = JSON.stringify(life.state().acorns), branch = scene.getObjectByName(`Squirrel branch ${victim.tree.id}`);
  assert.equal(life.damage(victim.id, 100, { testing: true }).killed, true);
  life.setObserver(victim); life.update(.1, victim);
  assert.equal(life.state().squirrels[0].dead, true); assert.equal(scene.getObjectByName('Red squirrel 1').visible, false);
  assert.equal(branch.visible, true, 'a dead squirrel does not burn away its tree branch');
  assert.equal(JSON.stringify(life.state().acorns), pickups, 'quest pickups are independent from animal damage');
  assert.equal(life.resetDamage(), 1); assert.equal(scene.getObjectByName('Red squirrel 1').visible, true);
  assert.ok(life.bodies().some(a => a.id === victim.id));
});
