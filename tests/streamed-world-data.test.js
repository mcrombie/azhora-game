import test from 'node:test';
import assert from 'node:assert/strict';
import { createWoodcutting } from '../src/gameplay/skills/woodcutting/woodcutting.js';
import { createWalkSurfaces } from '../src/world/collision/walk-surfaces.js';

const pine = id => ({ id, species: 'loblolly-pine', x: 50, z: 0 });
const skills = { level: () => 99, gain: () => ({ level: 99 }) };

test('newly loaded tree descriptors become harvestable without replacing the woodcutting system', () => {
  const trees = [], wood = createWoodcutting({ skills, trees, random: () => 0 });
  assert.equal(wood.tree('late-pine'), null);
  trees.push(pine('late-pine'));
  assert.equal(wood.tree('late-pine')?.id, 'late-pine');
  assert.equal(wood.canChop('late-pine', () => true).ok, true);
  assert.equal(wood.swing('late-pine', () => true).felled, true);
  assert.equal(wood.standing('late-pine'), false);
});

test('a saved stump in an unloaded region survives an immediate save and applies when its tree arrives', () => {
  const trees = [], wood = createWoodcutting({ skills, trees });
  const saved = { ...wood.snapshot(), trees: [{ id: 'later-pine', logsLeft: 0, stump: 20 }] };
  assert.equal(wood.restore(saved), true); assert.deepEqual(wood.snapshot().trees, saved.trees);
  wood.update(4); assert.equal(wood.snapshot().trees[0].stump, 16);
  trees.push(pine('later-pine'));
  assert.equal(wood.standing('later-pine'), false); assert.equal(wood.snapshot().trees[0].stump, 16);
  wood.update(20); assert.equal(wood.standing('later-pine'), true); assert.deepEqual(wood.snapshot().trees, []);
});

test('an unloaded stump can regrow before scenery arrives without creating duplicate saved records', () => {
  const trees = [], wood = createWoodcutting({ skills, trees });
  wood.restore({ ...wood.snapshot(), trees: [{ id: 'later-pine', logsLeft: 0, stump: 1 }] });
  wood.update(2); trees.push(pine('later-pine')); wood.registerTrees(trees);
  assert.equal(wood.standing('later-pine'), true); assert.deepEqual(wood.snapshot().trees, []);
  assert.equal(wood.catalog.filter(tree => tree.id === 'later-pine').length, 1);
});

test('streamed walkways become available through the existing supportAt reference', () => {
  const surfaces = [], walks = createWalkSurfaces(surfaces, () => 1), supportAt = walks.supportAt;
  assert.equal(supportAt(5, 0, { maxY: 8 }).height, 1);
  surfaces.push({ id: 'late-deck', kind: 'deck', a: { x: 0, y: 8, z: 0 }, b: { x: 10, y: 8, z: 0 }, width: 3 });
  assert.equal(supportAt(5, 0, { maxY: 8 }).height, 8);
  assert.equal(supportAt(5, 0, { maxY: 1 }).height, 1);
  assert.equal(walks.restoreAt(5, 0, 'late-deck').height, 8);
});
