import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { BORDER_NPCS, BORDER_ARENA, borderEncounter } from '../src/border-chapter.js';
import { MOROS_SITES } from '../src/moros-chapter.js';
import { HIDEOUT_GARRISON, FOREST_HIDEOUT_QUEST } from '../src/forest-hideout.js';

test('everyone the later chapters place on the ground stands on walkable ground in the right region', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const world = createWorld(new THREE.Scene());
  for (const person of BORDER_NPCS) {
    assert.ok(canStand(person.x, person.z, world, .45), `${person.name} stands on solid ground`);
    assert.equal(world.regionAt(person.x, person.z)?.name, 'Moros Plain', `${person.name} stands on the Moros Plain`);
  }
  for (const side of ['empire', 'coalition']) {
    const fight = borderEncounter(side, Array.from({ length: 5 }, (_, i) => ({ id: `ally-${i}`, kind: 'legionary' })));
    for (const point of [...fight.enemies, ...fight.allies, fight.checkpoint, fight.center]) assert.ok(canStand(point.x, point.z, world, .45), `the ${side} line has footing at ${point.x},${point.z}`);
  }
  assert.ok(BORDER_ARENA.retreatLine > BORDER_ARENA.checkpoint.z);
  for (const site of Object.values(MOROS_SITES)) assert.ok(canStand(site.x, site.z, world, .45), `${site.name} can be reached`);
  for (const soldier of HIDEOUT_GARRISON) {
    const stand = world.npcPositions[soldier.id];
    assert.ok(stand && canStand(stand.x, stand.z, world, .45), `${soldier.name} has a stand in Lumber Town`);
    assert.equal(world.regionAt(stand.x, stand.z)?.name, 'Luscia');
  }
  const camp = FOREST_HIDEOUT_QUEST.encounter;
  assert.equal(world.regionAt(camp.center.x, camp.center.z)?.name, 'Luscia', 'the goblin camp is in Luscia');
  for (const point of [FOREST_HIDEOUT_QUEST.approach, FOREST_HIDEOUT_QUEST.supplies, ...camp.enemies]) assert.ok(canStand(point.x, point.z, world, .45), `camp point ${point.x},${point.z} has footing`);
});
