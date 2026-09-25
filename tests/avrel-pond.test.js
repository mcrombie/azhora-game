import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import { AVREL_POND, avrelPondGround } from '../src/avrel-pond.js';
import { canStand } from '../src/game-state.js';
import { waterOf } from '../src/fishing-skill.js';

test('Avrel pool is a basin with dry lesson banks, pond fish and chart geometry', async () => {
  const THREE = await import('../vendor/three.module.js');
  const { createWorld } = await sourceModule('../src/world.js');
  const scene = new THREE.Scene(), world = createWorld(scene);
  const spot = world.fishingSpots.find(s => s.id === AVREL_POND.id);
  assert.ok(spot);
  assert.equal(waterOf(spot.id), 'pond');
  assert.ok(world.heightAt(spot.x, spot.z) < spot.surfaceY - .8);
  assert.equal(world.waterAt(spot.x, spot.z), spot.surfaceY);
  assert.ok(scene.getObjectByName('Avrel farm pond'));
  for (const stand of [spot.fishingSpot, spot.lessonStand]) {
    assert.ok(canStand(stand.x, stand.z, world), 'the player and teacher stand on dry unobstructed banks');
    assert.ok(world.heightAt(stand.x, stand.z) > spot.surfaceY);
  }
  assert.equal(avrelPondGround(spot.x + 20, spot.z, 7, spot.surfaceY), 7, 'the farm itself keeps its height');
});
