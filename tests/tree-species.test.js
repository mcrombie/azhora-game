import test from 'node:test';
import assert from 'node:assert/strict';
import {TREE_SPECIES,TREE_SPECIES_BY_ID,TREE_LOCAL_NAMES,treeSpecies} from '../src/world/life/tree-species.js';
import {WOOD_SPECIES,timberForSpecies} from '../src/gameplay/skills/woodcutting/wood-species.js';

test('Every existing world/timber identity resolves to a real named journal species',()=>{
  for(const id of Object.keys(WOOD_SPECIES)){
    const tree=treeSpecies(id);
    assert.ok(tree,`Missing botanical identity: ${id}`);
    assert.ok(tree.scientificName.match(/^[A-Z][a-z]+ /),id);
    assert.ok(tree.identification.length>40&&tree.habitat.length>10,id);
    assert.equal(TREE_SPECIES_BY_ID[tree.id],tree);
  }
  assert.equal(new Set(TREE_SPECIES.map(t=>t.id)).size,TREE_SPECIES.length);
  assert.equal(new Set(TREE_SPECIES.map(t=>t.scientificName)).size,TREE_SPECIES.length);
});

test('Local fantasy names are aliases, while saved timber products retain their old IDs',()=>{
  assert.equal(Object.keys(TREE_LOCAL_NAMES).length,7);
  for(const [legacy,local] of Object.entries(TREE_LOCAL_NAMES)){
    const tree=treeSpecies(legacy),timber=timberForSpecies(legacy);
    assert.equal(tree,treeSpecies(local.id));
    assert.ok(tree.localNames.includes(local.name));
    assert.equal(timber.species,legacy);
    assert.equal(timber.woodName,tree.name);
    assert.equal(timber.localName,local.name);
    assert.equal(timber.realSpeciesId,tree.id);
  }
  assert.equal(timberForSpecies('acor').log,'acor-logs');
  assert.equal(treeSpecies('made-up-tree'),null);
});
