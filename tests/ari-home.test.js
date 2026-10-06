import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceModule } from './module-loader.js';
import { ARI_HOME } from '../src/content/quests/ari/ari-home.js';
import { ARI_STAND, SUNFLOWER_ROWS } from '../src/content/quests/ari/ari-garden.js';
import { APPLEGARTH_BUILDINGS } from '../src/content/quests/rena/rena.js';
import { canStand } from '../src/gameplay/movement/game-state.js';

test('Ari takes the existing cottage on her left, with a named mailbox beside a clear approach', async () => {
  const original = APPLEGARTH_BUILDINGS.find(h => h.id === ARI_HOME.buildingId);
  assert.equal(original.id, 'house-3');
  assert.equal(ARI_HOME.house.x, original.x); assert.equal(ARI_HOME.house.z, original.z);
  const left = { x: Math.cos(ARI_STAND.yaw), z: -Math.sin(ARI_STAND.yaw) };
  assert.ok((original.x - ARI_STAND.x) * left.x + (original.z - ARI_STAND.z) * left.z > 0);
  assert.equal(ARI_HOME.mailbox.name, 'Ari');
  const THREE = await sourceModule('../vendor/three.module.js');
  const { buildRenaWorks } = await sourceModule('../src/content/quests/rena/rena-works.js');
  const parent = new THREE.Group(), colliders = [];
  buildRenaWorks({ parent, heightAt: () => 2, colliders, signs: { border() {}, place() {}, direction() {} } });
  const world = { colliders, heightAt: () => 2, bounds: { minX: -2000, maxX: 2000, minZ: -2000, maxZ: 2000 } };
  for (const spot of [ARI_STAND, ARI_HOME.approach, ...SUNFLOWER_ROWS])
    assert.ok(canStand(spot.x, spot.z, world, .45), 'Her lesson beds, speaking position and approach remain reachable');
  assert.ok(parent.getObjectByName(ARI_HOME.name));
  const nameplate = parent.getObjectByName('Ari mailbox nameplate');
  assert.equal(nameplate.userData.label, 'Ari'); assert.equal(nameplate.position.y, 3.34);
  assert.equal(colliders.filter(c => c.kind === 'ari-mailbox').length, 1);
  assert.equal(colliders.filter(c => c.kind === 'ari-sunflower-planter').length, 2);
});
