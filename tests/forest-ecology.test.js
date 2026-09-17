import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import * as THREE from '../vendor/three.module.js';
import { canStand } from '../src/game-state.js';

const { createForestEcology } = await sourceModule('../src/forest-ecology.js');
function fixture(colliders = []) {
  const scene = new THREE.Scene(), world = {
    bounds: { minX: -700, maxX: 28, minZ: -65, maxZ: 123 }, heightAt: () => 2, colliders,
    paths: [[{ x: -182, z: 29 }, { x: 20, z: 29 }]],
    npcPositions: { warden: { x: -84, z: 21 } },
    encounter: { x: -54, z: 29, radius: 8 },
    pond: { x: -97, z: 2, radius: 5.4, surfaceY: 1.5 },
    broadleafTrees: Array.from({ length: 50 }, (_, i) => ({ x: -49 - Math.floor(i / 10) * 27, z: 29 - (i % 10 - 4.5) * 12 })),
  };
  return { scene, world, life: createForestEcology(scene, world, { exclusionSites: [{ x: -68, z: 57, radius: 5.4 }] }) };
}

test('woodland has distinct low vegetation, deadwood, deer and insects within an explicit render budget', () => {
  const { scene, life } = fixture(), s = life.state();
  assert.deepEqual([...new Set(s.plants.map(p => p.kind))], ['fern', 'wood-sorrel', 'wood-anemone', 'wood-violet', 'moss-log']);
  assert.equal(s.plants.length, 410);
  assert.equal(s.animals.length, 4); assert.equal(s.animals.filter(a => a.species === 'fawn').length, 1);
  assert.equal(s.insects.filter(i => i.species === 'butterfly').length, 8);
  assert.equal(s.insects.filter(i => i.species === 'dragonfly').length, 4);
  assert.equal(s.insects.filter(i => i.species === 'bee').length, 6);
  assert.equal(s.birds.length, 5); assert.ok(s.birds.every(bird => bird.species === 'woodland-thrush'));
  assert.ok(s.budget.draws <= 36); assert.ok(s.budget.triangles < 60000);
  scene.traverse(object => { if (object.isMesh) assert.ok(object.isInstancedMesh, 'ecology uses shared instances rather than per-leaf objects'); });
  life.dispose();
});

test('ecology preserves main paths, NPC/quest spaces, and supplied inspection clearings', () => {
  const { life, world } = fixture([{ x: -120, z: 64, r: 6 }, { x: -144, z: -1, hx: 3, hz: 5 }]);
  for (const p of life.state().plants) {
    assert.ok(p.x >= -174 && p.x <= -43 && p.z >= -43 && p.z <= 101);
    assert.ok(canStand(p.x, p.z, world, p.radius), p.id);
    assert.ok(Math.abs(p.z - 29) >= 2.5 + p.radius, 'trail must stay visibly clear');
    assert.ok(Math.hypot(p.x + 84, p.z - 21) >= 3.2 + p.radius, 'speaking space stays open');
    assert.ok(Math.hypot(p.x + 68, p.z - 57) >= 5.4 + p.radius, 'new forest-place clearing stays open');
    assert.ok(Math.hypot(p.x + 54, p.z - 29) >= 9.5 + p.radius, 'initial battle arena stays open');
  }
  life.dispose();
});

test('paused and invalid frames freeze every pose; distant wildlife performs no simulation', () => {
  const { life } = fixture(); life.update(.1, 42, { x: -75, z: 50 }); const before = life.state();
  for (let i = 0; i < 80; i++) life.update(.1, 1000 + i, { x: -75, z: 50 }, false);
  for (const dt of [0, -1, NaN, Infinity]) life.update(dt, 10, { x: -75, z: 50 });
  life.update(.1, 10, { x: NaN, z: 50 }); assert.deepEqual(life.state(), before);
  life.update(.1, 2000, { x: -670, z: 29 }); const far = life.state();
  assert.deepEqual(far.animals, before.animals); assert.deepEqual(far.insects, before.insects); assert.deepEqual(far.birds, before.birds);
  assert.ok(far.groups.every(g => !g.visible));
  life.dispose();
});

test('a ghost observer refreshes distant visibility without advancing paused wildlife or flight', () => {
  const { life } = fixture(), { life: control } = fixture();
  const bird = life.state().birds[0], player = { x: bird.x, z: bird.z + 3 };
  life.update(.1, 0, player); control.update(.1, 0, player);
  assert.equal(life.state().birds[0].action, 'flight');
  const before = life.state();
  const simulation = state => ({ ...state,
    groups: state.groups.map(({ visible, ...group }) => group),
    birds: state.birds.map(({ visible, ...birdState }) => birdState),
    insects: state.insects.map(({ visible, ...insect }) => insect),
  });
  assert.equal(life.setObserver({ x: -670, y: 150, z: 29 }), true);
  const far = life.state();
  assert.ok(far.groups.every(group => !group.visible));
  assert.ok(far.birds.every(b => !b.visible) && far.insects.every(i => !i.visible));
  assert.deepEqual(simulation(far), simulation(before), 'changing observer must preserve every position, action, clock and update counter');
  assert.equal(life.setObserver(player), true);
  const near = life.state();
  assert.ok(near.groups.find(group => group.id === 'woodland-thrushes').visible);
  assert.ok(near.birds[0].visible && !near.birds.at(-1).visible, 'instance visibility follows the observer rather than the original player');
  assert.deepEqual(simulation(near), simulation(before));
  life.update(.15, 200, player, false); assert.deepEqual(life.state(), near, 'ordinary pause retains its complete freeze behavior');
  for (const invalid of [null, { x: NaN, z: 0 }, { x: 0, z: Infinity }]) assert.equal(life.setObserver(invalid), false);
  assert.deepEqual(life.state(), near);
  life.update(.1, .1, player); control.update(.1, .1, player);
  assert.deepEqual(simulation(life.state()), simulation(control.state()), 'resuming a flight must continue at the original saved animation time');
  life.dispose(); control.dispose(); assert.equal(life.setObserver(player), false);
});

test('thrushes peck and hop, then fly away from an approaching player and land safely', () => {
  const { life, world } = fixture();
  const first = life.state().birds[0], observer = { x: first.x + 18, z: first.z + 2 };
  let hopped = false, pecked = false;
  for (let i = 0; i < 70; i++) {
    life.update(.1, i / 10, observer); const bird = life.state().birds[0];
    hopped ||= bird.action === 'hop' && bird.y > bird.groundY;
    pecked ||= bird.action === 'peck';
  }
  assert.ok(hopped && pecked, 'quiet birds should visibly forage instead of standing still');
  let resting = life.state().birds[0];
  for (let i = 0; i < 8 && resting.action === 'hop'; i++) { life.update(.1, i, observer); resting = life.state().birds[0]; }
  const player = { x: resting.x, z: resting.z + 3 };
  life.update(.1, 8, player); assert.equal(life.state().birds[0].action, 'flight');
  life.update(.1, 8.1, player); const rising = life.state().birds[0];
  assert.ok(rising.y > rising.groundY + .35, 'the fleeing bird must lift off the woodland floor');
  const beforePause = life.state(); life.update(.15, 100, player, false); assert.deepEqual(life.state(), beforePause);
  for (let i = 0; i < 25; i++) life.update(.1, 8.2 + i / 10, player);
  const landed = life.state().birds[0];
  assert.notEqual(landed.action, 'flight'); assert.ok(Math.hypot(landed.x - player.x, landed.z - player.z) > 6);
  assert.ok(canStand(landed.x, landed.z, world, .22));
  life.dispose();
});

test('bird ground and flight routes keep exclusion sites clear and stay finite through repeated scares', () => {
  const { scene, world, life: originalLife } = fixture(); originalLife.dispose();
  const site = { x: -138, z: -31, radius: 12 }, approach = { x: -129, z: -16, radius: 3.5 };
  const life = createForestEcology(scene, world, { exclusionSites: [site, approach] });
  for (let step = 0; step < 160; step++) {
    const bird = life.state().birds[step % 5];
    life.update(step % 13 === 0 ? 4 : .1, step, { x: bird.x, z: bird.z + 2 });
    for (const current of life.state().birds) {
      assert.ok(['x', 'y', 'groundY', 'z', 'clock', 'yaw', 'speed'].every(key => Number.isFinite(current[key])));
      assert.ok(canStand(current.x, current.z, world, .22));
      assert.ok(Math.hypot(current.x - site.x, current.z - site.z) >= site.radius + .22);
      assert.ok(Math.hypot(current.x - approach.x, current.z - approach.z) >= approach.radius + .22);
      assert.ok(current.x >= -174 && current.x <= -43 && current.z >= -43 && current.z <= 101);
    }
  }
  life.dispose();
});

test('deer watch a distant visitor, flee an approaching visitor, and eventually resume browsing', () => {
  const { life, world } = fixture(); const first = life.state().animals[0];
  life.update(.1, 0, { x: first.x + 10, z: first.z });
  assert.equal(life.state().animals[0].action, 'alert');
  const player = { x: first.x, z: first.z + 4 };
  for (let i = 0; i < 25; i++) life.update(.1, i / 10, player);
  const fled = life.state().animals[0];
  assert.equal(fled.action, 'flee'); assert.ok(Math.hypot(fled.x - player.x, fled.z - player.z) > 10);
  assert.ok(canStand(fled.x, fled.z, world, .57 * fled.scale));
  let browsed = false;
  for (let i = 0; i < 100; i++) { life.update(.1, 3 + i / 10, { x: -135, z: 1 }); browsed ||= life.state().animals[0].action === 'browse'; }
  assert.ok(browsed, 'fear expires after the player leaves'); life.dispose();
});

test('running deer cannot tunnel through fences or leave region one, including slow frames', () => {
  const { life, world } = fixture([{ x: -87, z: 59, hx: .10, hz: 42 }]);
  for (let i = 0; i < 240; i++) {
    const first = life.state().animals[0]; life.update(i % 9 === 0 ? 6 : .1, i / 10, { x: first.x + 3, z: first.z });
    const after = life.state().animals[0];
    assert.ok(canStand(after.x, after.z, world, .57 * after.scale));
    assert.ok(after.x > -86.4, 'continuous fence cannot be crossed');
    assert.ok(after.x >= -174 && after.x <= -43 && after.z >= -43 && after.z <= 101);
  }
  life.dispose();
});

test('moving models keep finite, positive transforms; disposal removes all owned resources safely', () => {
  const { scene, life } = fixture(), matrix = new THREE.Matrix4();
  for (let i = 0; i < 80; i++) life.update(.1, i, { x: -98, z: 11 });
  let disposedGeometries = 0, disposedMaterials = 0; const geometries = new Set(), materials = new Set();
  scene.traverse(object => { if (object.isInstancedMesh) {
    geometries.add(object.geometry); materials.add(object.material);
    for (let i = 0; i < object.count; i++) { object.getMatrixAt(i, matrix); assert.ok(matrix.elements.every(Number.isFinite)); assert.ok(matrix.determinant() > 0); }
  } });
  for (const geometry of geometries) geometry.addEventListener('dispose', () => disposedGeometries++);
  for (const material of materials) material.addEventListener('dispose', () => disposedMaterials++);
  life.dispose(); life.dispose();
  assert.equal(scene.children.length, 0); assert.equal(disposedGeometries, geometries.size); assert.equal(disposedMaterials, materials.size);
  const after = life.state(); life.update(.1, 1000, { x: -80, z: 29 }); assert.deepEqual(life.state(), after);
});

test('the real Drent woodland supports the full ecology and keeps original deterministic trees unchanged', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const { createWoodlandLife } = await sourceModule('../src/woodland-life.js');
  const scene = new THREE.Scene(), world = createWorld(scene), trees = JSON.stringify(world.broadleafTrees);
  const pickups = createWoodlandLife(scene, world).state();
  const colliders = JSON.stringify(world.colliders);
  const exclusions = [...pickups.acorns, ...pickups.sticks, ...pickups.fruits, ...pickups.fruitPatches,
    { x: -138, z: -31, radius: 12 }, { x: -129, z: -16, radius: 3.5 }];
  const life = createForestEcology(scene, world, { exclusionSites: exclusions }), state = life.state();
  assert.equal(state.plants.length, 410); assert.equal(state.animals.length, 4); assert.equal(state.birds.length, 5);
  for (const plant of state.plants) assert.ok(canStand(plant.x, plant.z, world, plant.radius), plant.id);
  for (const plant of state.plants) assert.ok(exclusions.every(p => Math.hypot(p.x - plant.x, p.z - plant.z) >= 3.2 + plant.radius),
    `${plant.id}: acorns, branches and fruit stay easy to see and gather`);
  for (const a of state.animals) assert.ok(canStand(a.x, a.z, world, .57 * a.scale), a.id);
  for (const visitor of [{ x: -81, z: 54 }, { x: -126, z: -14 }, { x: -151, z: 66 }])
    for (let i = 0; i < 60; i++) life.update(1 / 30, i / 30, visitor);
  for (const a of life.state().animals) assert.ok(canStand(a.x, a.z, world, .57 * a.scale), a.id);
  for (const bird of life.state().birds) assert.ok(canStand(bird.x, bird.z, world, .22), bird.id);
  for (const initial of life.state().birds) {
    const point = life.state().birds.find(bird => bird.id === initial.id), player = { x: point.x, z: point.z + 3 };
    for (let attempt = 0; attempt < 8 && life.state().birds.find(bird => bird.id === initial.id).action !== 'flight'; attempt++)
      life.update(.1, attempt / 10, player);
    assert.equal(life.state().birds.find(bird => bird.id === initial.id).action, 'flight', `${initial.id}: no clear escape route in the real forest`);
  }
  assert.equal(JSON.stringify(world.broadleafTrees), trees); assert.equal(JSON.stringify(world.colliders), colliders);
  life.dispose();
});
