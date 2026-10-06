import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { WOODLOT_TREES } from '../src/gameplay/skills/woodcutting/woodcutting.js';
import { forestSegmentHit } from '../src/gameplay/combat/forest-sightline.js';

const { createDeveloperDestruction, DEVELOPER_DESTRUCTION } = await sourceModule('../src/dev/tools/developer-destruction.js');
const { getTreeRegistry, registerWorldTree } = await sourceModule('../src/world/scenery/tree-registry.js');
const { createSceneryBuilder } = await sourceModule('../src/world/scenery/scenery-builder.js');

function fixture({ canReach } = {}) {
  const scene = new THREE.Scene(), root = new THREE.Group(); root.name = 'Drent and the road to the Moros'; scene.add(root);
  const colliders = []; let reindexes = 0, enabled = true;
  const listeners = new Set();
  const world = { colliders, heightAt: () => 0, reindexColliders: () => reindexes++,
    onRegionReady(callback) { listeners.add(callback); return () => listeners.delete(callback); } };
  world.treeRegistry = getTreeRegistry(colliders).configure({ root, reindex: world.reindexColliders });
  const destruction = createDeveloperDestruction({ world, scene, enabled: () => enabled, canReach });
  return { scene, root, world, colliders, destruction, ready: () => { for (const listener of listeners) listener(); },
    enable(value) { enabled = value; }, get reindexes() { return reindexes; } };
}
function addTree(f, id, x, z, { protectedTree = false } = {}) {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(.5, 8, .5), new THREE.MeshStandardMaterial(), 2);
  mesh.setMatrixAt(0, new THREE.Matrix4().makeTranslation(x, 4, z));
  mesh.setMatrixAt(1, new THREE.Matrix4().makeTranslation(x + 40, 4, z)); f.root.add(mesh);
  const collider = { id, x, z, r: .4, kind: 'region-tree' }; f.colliders.push(collider);
  const tree = registerWorldTree(f.colliders, { id, x, z, y: 0, height: 8, radius: .4,
    species: 'white-oak', harvestable: !protectedTree }, [{ mesh, index: 0 }], collider);
  return { mesh, collider, tree };
}
function addHouses(f) {
  const builder = createSceneryBuilder('Two houses and their courtyard');
  for (const x of [0, 18]) {
    builder.block('#87613c', x, 0, 0, 6, 4, 5);
    builder.roof('#5d4430', x, 4, 0, 7, 6, 2);
    f.colliders.push({ x, z: 0, width: 6, depth: 5, r: 3.5, kind: 'house', id: `house-${x}` });
  }
  builder.patch('#8b9671', () => 0, 0, 0, 40, 20);
  return builder.finish(f.root);
}
function drain(destruction) {
  for (let i = 0; i < 300 && destruction.state().pending; i++) destruction.tick(.1);
  assert.equal(destruction.state().pending, 0);
}
const bytes = attribute => [...attribute.array];

test('dragon fire destroys one typed tree, leaves preexisting stumps alone, and resets exact instance slots and colliders', () => {
  const f = fixture(), oak = addTree(f, 'oak', 0, 8), protectedOak = addTree(f, 'protected', 1, 10, { protectedTree: true });
  const stump = addTree(f, 'old-stump', -1, 10); f.world.treeRegistry.set(stump.tree.id, false);
  const matrix = new THREE.Matrix4(), before = bytes(oak.mesh.instanceMatrix), beforeColliders = [...f.colliders];
  const args = { origin: { x: 0, y: 4, z: 0 }, direction: { x: 0, y: 0, z: 1 }, range: 11, radius: 2, dt: .1 };
  for (let i = 0; i < 4; i++) { f.destruction.hit(args); f.destruction.tick(.1); }
  assert.equal(f.destruction.state().trees, 2, 'protected harvesting policy does not make a tree dragon-proof in testing');
  assert.equal(f.world.treeRegistry.standing('oak'), false); assert.equal(f.world.treeRegistry.standing('protected'), false);
  assert.equal(f.colliders.includes(oak.collider), false); assert.equal(f.colliders.includes(protectedOak.collider), false);
  oak.mesh.getMatrixAt(0, matrix); assert.equal(matrix.elements[0], 0);
  assert.deepEqual(bytes(oak.mesh.instanceMatrix).slice(16), before.slice(16), 'neighboring forest instance remains visible');
  assert.ok(f.scene.getObjectByName('White oak: charred wreckage'));
  f.destruction.reset(); assert.deepEqual(bytes(oak.mesh.instanceMatrix), before);
  assert.equal(f.world.treeRegistry.standing('old-stump'), false); assert.deepEqual(f.colliders, beforeColliders);
  assert.equal(f.destruction.state().rubble, 0); assert.ok(f.reindexes > 0);
  f.destruction.dispose();
});

test('surgical destruction removes only the struck house from a merged place and restores the same original geometry', () => {
  const f = fixture(), mesh = addHouses(f), original = mesh.geometry;
  const positions = bytes(original.attributes.position), colliders = [...f.colliders];
  f.destruction.burnAt(0, 3, 0, 2, .5); f.destruction.burnAt(0, 3, 0, 2, .5); drain(f.destruction);
  assert.equal(f.destruction.state().structures, 1); assert.equal(f.colliders.length, 1); assert.equal(f.colliders[0], colliders[1]);
  assert.notEqual(mesh.geometry, original); assert.equal(mesh.visible, true);
  assert.deepEqual(bytes(mesh.geometry.attributes.position), positions, 'shared positions are never changed');
  const index = mesh.geometry.index, pos = mesh.geometry.attributes.position;
  let untouchedNeighbor = 0, vanishedHouse = 0, intactGround = 0;
  for (let i = 0; i < index.count; i += 3) {
    const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
    const y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
    const degenerate = index.getX(i) === index.getX(i + 1);
    if (x > 12 && y > .2) { assert.equal(degenerate, false); untouchedNeighbor++; }
    if (Math.abs(x) < 4 && y > .2) { assert.equal(degenerate, true); vanishedHouse++; }
    if (y < .1) { assert.equal(degenerate, false, 'courtyard remains ground'); intactGround++; }
  }
  assert.ok(untouchedNeighbor > 5 && vanishedHouse > 5 && intactGround > 5);
  const wreck = f.scene.getObjectByName('house-0: charred wreckage'); assert.ok(wreck);
  for (let i = 0; i < 30; i++) f.destruction.tick(.1);
  assert.equal(wreck.children[0].visible, false, 'the burned shell finishes collapsing instead of leaving an intact black house');
  assert.ok(wreck.children.slice(1).some(piece => piece.visible), 'charred rubble remains');
  f.destruction.reset(); assert.equal(mesh.geometry, original); assert.deepEqual(f.colliders, colliders);
  assert.deepEqual(bytes(original.attributes.position), positions); f.destruction.dispose();
});

test('3D breath respects altitude, endpoint obstructions, direction and the testing-only guard', () => {
  const f = fixture(); addTree(f, 'front', 0, 8); addTree(f, 'behind', 0, -8);
  const base = { origin: { x: 0, y: 50, z: 0 }, direction: { x: 0, y: 0, z: 1 }, range: 20, radius: 3, dt: .5 };
  f.destruction.hit(base); assert.equal(f.destruction.state().trees, 0, 'high horizontal breath does not burn trees far below');
  f.enable(false); f.destruction.hit({ ...base, origin: { x: 0, y: 3, z: 0 } }); assert.equal(f.destruction.state().trees, 0);
  f.enable(true);
  f.destruction.hit({ ...base, origin: { x: 0, y: 3, z: 0 }, range: 7.65 });
  assert.equal(f.world.treeRegistry.standing('front'), false, 'a clipped ray ending at bark still reaches the obstructing tree');
  assert.equal(f.world.treeRegistry.standing('behind'), true);
  assert.deepEqual(f.destruction.hit({ ...base, direction: { x: NaN, y: 0, z: 1 } }), { trees: 0, queued: 0 });
  f.enable(false); f.destruction.tick(.1); assert.equal(f.world.treeRegistry.standing('front'), true, 'leaving the session restores scenery automatically');
  assert.equal(f.destruction.state().active, false); f.destruction.dispose();
});

test('each off-axis target checks cover before heating while direct contact with its own collider remains burnable', () => {
  for (const cover of ['wall', 'ridge']) {
    let selfContacts = 0;
    const f = fixture({ canReach(from, target, collider) {
      assert.equal(target.y, 4, 'the target point follows beam altitude, not the base of the tree or building');
      const hit = forestSegmentHit(f.world, from, target, { radius: 0 });
      if (hit?.collider === collider && collider) selfContacts++;
      return !hit || hit.collider === collider || hit.t > .999;
    } });
    const exposed = addTree(f, 'exposed', 0, 12), behind = addTree(f, 'behind-cover', 5, 12);
    const builder = createSceneryBuilder('Sheltered hut'); builder.block('#885533', 6, 0, 17, 2, 6, 2); builder.finish(f.root);
    const hut = { x: 6, z: 17, width: 2, depth: 2, hx: 1, hz: 1, minY: 0, maxY: 6, kind: 'house' }; f.colliders.push(hut);
    if (cover === 'wall') f.colliders.push({ x: 2.5, z: 6, hx: 1, hz: .5, minY: 0, maxY: 9, kind: 'stone-wall' });
    else f.world.groundHeight = (x, z) => x > 1 && z > 5 && z < 8 ? 9 : 0;
    const breath = { origin: { x: 0, y: 4, z: 0 }, direction: { x: 0, y: 0, z: 1 }, range: 20, radius: 8, dt: .5 };
    for (let i = 0; i < 4; i++) { f.destruction.hit(breath); f.destruction.tick(.1); }
    drain(f.destruction);
    assert.equal(f.world.treeRegistry.standing(exposed.tree.id), false, `${cover}: directly exposed tree burns`);
    assert.equal(f.world.treeRegistry.standing(behind.tree.id), true, `${cover}: off-axis tree behind cover does not burn`);
    assert.ok(f.colliders.includes(hut), `${cover}: off-axis hut behind cover is not destroyed`);
    assert.equal(f.destruction.state().structures, 0); assert.ok(selfContacts > 0);
    f.destruction.reset();
    if (cover === 'wall') f.colliders.splice(f.colliders.findIndex(c => c.kind === 'stone-wall'), 1);
    else f.world.groundHeight = () => 0;
    // A house must also be allowed to intercept its own ray before its center.
    f.destruction.burnAt(6, 4, 13, 5); f.destruction.burnAt(6, 4, 13, 5); drain(f.destruction);
    assert.equal(f.colliders.includes(hut), false, 'the hut can burn once the external cover is gone');
    f.destruction.dispose();
  }
});

test('wooden props burn while generic stone props and actors outside the world remain intact', () => {
  const f = fixture(), wood = createSceneryBuilder('Crates'); wood.block('#885533', 0, 0, 0, 1.2, 1, 1.2);
  const crate = wood.finish(f.root), stone = createSceneryBuilder('Stone'); stone.block('#888888', 5, 0, 0, 1.2, 1, 1.2);
  const rock = stone.finish(f.root), stoneGeometry = rock.geometry;
  f.colliders.push({ x: 0, z: 0, r: .7, kind: 'prop' }, { x: 5, z: 0, r: .7, kind: 'prop' });
  const npc = new THREE.Mesh(crate.geometry, crate.material); npc.castShadow = true; f.scene.add(npc); const npcGeometry = npc.geometry;
  f.destruction.burnAt(2, .5, 0, 5); drain(f.destruction);
  assert.equal(f.destruction.state().structures, 1); assert.equal(f.colliders.length, 1); assert.equal(f.colliders[0].x, 5);
  assert.equal(rock.geometry, stoneGeometry); assert.equal(npc.geometry, npcGeometry);
  f.destruction.dispose();
});

test('a resumed Fast build adds burnable scenery and reset retains its new colliders and trees', () => {
  const f = fixture(), first = addTree(f, 'first', 0, 0);
  f.destruction.burnAt(0, 2, 0, 1); assert.equal(f.destruction.state().trees, 1);
  const late = addTree(f, 'late', 20, 0), mesh = addHouses(f), original = mesh.geometry; f.ready();
  f.destruction.burnAt(20, 3, 0, 1); f.destruction.burnAt(18, 3, 0, 1); drain(f.destruction);
  assert.equal(f.destruction.state().trees, 2); assert.equal(f.destruction.state().structures, 1);
  const untouched = { x: 100, z: 0, r: 1, kind: 'rock' }; f.colliders.push(untouched);
  f.destruction.reset();
  for (const collider of [first.collider, late.collider, untouched]) assert.equal(f.colliders.filter(c => c === collider).length, 1);
  assert.equal(mesh.geometry, original); assert.ok(f.world.treeRegistry.standing('first') && f.world.treeRegistry.standing('late'));
  f.destruction.dispose();
});

test('Bowden woodlot destruction preserves an already felled tree and restores the removed physical blocker', () => {
  const f = fixture(), chosen = WOODLOT_TREES[0], old = WOODLOT_TREES[1];
  const states = new Map([[chosen.id, true], [old.id, false]]);
  f.world.woodlot = { standing: id => states.get(id) === true, set: (id, standing) => states.set(id, standing) };
  const blocker = { ...chosen, r: .4, kind: 'woodlot-tree' }; f.colliders.push(blocker);
  f.destruction.burnAt(chosen.x, 2, chosen.z, 8);
  assert.equal(states.get(chosen.id), false); assert.equal(f.colliders.includes(blocker), false);
  f.destruction.reset(); assert.equal(states.get(chosen.id), true); assert.equal(states.get(old.id), false);
  assert.deepEqual(f.colliders, [blocker]); f.destruction.dispose();
});

test('large merged scenery work is spread across frames and pending destruction can be cancelled without mutation', () => {
  const f = fixture(), geometry = new THREE.BoxGeometry(6, 4, 5, 50, 50, 50);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: '#886644' }));
  mesh.position.y = 2; mesh.name = 'Static scenery batch'; f.root.add(mesh);
  f.colliders.push({ x: 0, z: 0, r: 3.5, width: 6, depth: 5, kind: 'house' });
  assert.ok(geometry.index.count / 3 > DEVELOPER_DESTRUCTION.trianglesPerTick);
  f.destruction.burnAt(0, 2, 0, 1); f.destruction.burnAt(0, 2, 0, 1);
  f.destruction.tick(.1); assert.equal(f.destruction.state().pending, 1); assert.equal(mesh.geometry, geometry);
  f.destruction.reset(); assert.equal(mesh.geometry, geometry); assert.equal(f.colliders.length, 1);
  f.destruction.dispose();
});
