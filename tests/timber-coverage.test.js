import test from 'node:test';
import assert from 'node:assert/strict';
import { WOOD_SPECIES } from '../src/wood-species.js';
import { TREE_KINDS, createWoodcutting, woodcuttingInteractionLabel } from '../src/woodcutting.js';
import { createSkills, SKILLS } from '../src/skills.js';
import { INVENTORY_ITEMS } from '../src/inventory.js';

test('every timber-producing species has a harvesting recipe and skill guide entry', () => {
  for (const timber of Object.values(WOOD_SPECIES).filter(t => t.log)) {
    const recipe = TREE_KINDS[timber.woodKind];
    assert.ok(recipe, `${timber.species} needs a woodcutting recipe`);
    assert.equal(recipe.log, timber.log);
    assert.ok(INVENTORY_ITEMS[timber.log], `${timber.log} needs an inventory item`);
    assert.ok(SKILLS.woodcutting.unlocks.some(u => u.level === recipe.level && u.text.includes(recipe.name)));
  }
});

test('streamed Acor trees can be chopped at their required level and yield Acor logs', () => {
  const skills = createSkills(), trees = [];
  const wood = createWoodcutting({ skills, trees, random: () => 0 });
  trees.push({ id: 'streamed-acor', species: 'acor', x: 10, z: 10 });
  skills.learn('woodcutting');
  assert.match(wood.canChop('streamed-acor').reason, /level of 15/);
  skills.gain('woodcutting', 2411);
  assert.match(wood.canChop('streamed-acor').reason, /axe/);
  const result = wood.swing('streamed-acor', id => id === 'bronze-axe');
  assert.equal(result.ok, true);
  assert.equal(result.log, 'acor-logs');
  assert.equal(result.xp, 38);
});

test('tree prompts handle protected recipe-less trees as well as skill and axe requirements', () => {
  const skills = createSkills();
  skills.learn('woodcutting');
  const wood = createWoodcutting({ skills, trees: [
    { id: 'acor', species: 'acor', x: 10, z: 10 },
    { id: 'protected', species: 'grey-vault', x: 20, z: 20, harvestable: false },
  ] });
  assert.equal(woodcuttingInteractionLabel(wood.canChop('acor'), 1), 'Chop Acor · Woodcutting 15');
  assert.equal(woodcuttingInteractionLabel(wood.canChop('protected'), 1), 'Examine Grey Vault · protected');
  assert.equal(woodcuttingInteractionLabel({ tree: { name: 'Unfinished tree' } }, 1), 'Examine Unfinished tree · protected');
  assert.equal(woodcuttingInteractionLabel(wood.canChop('missing'), 1), '');
  skills.gain('woodcutting', 2411);
  assert.equal(woodcuttingInteractionLabel(wood.canChop('acor'), 15), 'Chop Acor · axe required');
  assert.equal(woodcuttingInteractionLabel(wood.canChop('acor', id => id === 'bronze-axe'), 15, true), 'Study or cut Acor');
});
