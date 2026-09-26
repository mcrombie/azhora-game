import test from 'node:test';
import assert from 'node:assert/strict';
import { APIARY_BEES, createApiaryBees } from '../src/apiary-bees.js';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';

const { createApiaryBeesView } = await sourceModule('../src/apiary-bees-view.js');
const player = { x: 0, y: 0, z: 1, hp: 100 };
const fixture = options => { const hits = [], events = [], bees = createApiaryBees({ onDamage: e => hits.push(e), onEvent: e => events.push(e), ...options }); return { bees, hits, events }; };

test('Liz visibly warns before launching exactly ten hostile swarms and owns all damage', () => {
  const { bees, hits, events } = fixture();
  assert.equal(bees.cast({ x: NaN, z: 0 }).ok, false);
  assert.equal(bees.cast({ x: 0, y: 0, z: 0 }).ok, true);
  assert.equal(bees.cast({ x: 0, z: 0 }).ok, false, 'repeat notices cannot stack retaliation');
  bees.update(.8, { player }); assert.equal(bees.view().swarms.length, 0); assert.equal(hits.length, 0); assert.equal(bees.pose().action, 'windup'); assert.equal(bees.pose().casting, true);
  bees.update(.5, { player }); assert.equal(bees.view().swarms.length, 10); assert.equal(hits.length, 0);
  assert.ok(bees.view().swarms.every(s => s.ownerId === 'liz-beekeeper' && s.targetId === 'player'));
  bees.update(1.2, { player });
  assert.ok(hits.length > 0); assert.ok(hits.every(h => h.damage > 0 && h.damage <= 15 && h.source === 'liz-beekeeper' && h.targetId === 'player'));
  assert.equal(events.filter(e => e.type === 'apiary-bees-cast').length, 1);
});

test('pause freezes bees, solid cover prevents stings, and running clear ends the chase', () => {
  const { bees, hits, events } = fixture({ canSee: () => false });
  bees.cast({ x: 0, z: 0 }); const before = bees.state(); bees.update(30, { player, playing: false }); assert.deepEqual(bees.state(), before);
  bees.update(3, { player }); assert.equal(hits.length, 0);
  const positions = bees.view().swarms.map(s => [s.x, s.z]); bees.update(1, { player }); assert.deepEqual(bees.view().swarms.map(s => [s.x, s.z]), positions, 'no flight through solid cover');
  bees.update(.1, { player: { x: APIARY_BEES.range + 1, z: 0 } });
  assert.equal(bees.active, false); assert.equal(bees.view().swarms.length, 0); assert.equal(events.at(-1).reason, 'escaped');
  bees.cast({ x: 0, z: 0 }); bees.update(.1, { player, ownerAlive: false }); assert.equal(bees.active, false);
  bees.cast({ x: 0, z: 0 }); bees.update(.1, { player: { ...player, hp: 0 } }); assert.equal(bees.active, false);
});

test('retaliation always expires and an explicit clear removes every pending bee', () => {
  const { bees, events } = fixture(); bees.cast({ x: 0, z: 0 }); bees.update(30, { player });
  assert.equal(bees.active, false); assert.equal(events.at(-1).reason, 'expired');
  bees.cast({ x: 0, z: 0 }); assert.equal(bees.clear(), true); assert.equal(bees.clear(), false); assert.equal(bees.pose(), null);
});

test('all ten retaliation swarms use striped bodies, heads and moving wings, then release their scene', () => {
  const { bees } = fixture(), scene = new THREE.Scene(), view = createApiaryBeesView({ scene, bees });
  bees.cast({ x: 0, z: 0 }); view.update(0); assert.equal(scene.getObjectByName('Liz gathering ten swarms').visible, true);
  bees.update(1.3, { player }); view.update(.1);
  const swarms = []; scene.traverse(o => { if (o.name === 'summoned-bees') swarms.push(o); }); assert.equal(swarms.length, 10);
  assert.equal(scene.getObjectByName('Liz gathering ten swarms').visible, false);
  for (const swarm of swarms) {
    assert.equal(swarm.children.length, 3); assert.equal(swarm.getObjectByName('Striped bee bodies').count, 12);
    swarm.traverse(o => { if (o.isInstancedMesh) assert.ok(o.instanceMatrix.array.every(Number.isFinite)); });
  }
  bees.clear(); view.update(0); assert.equal(scene.getObjectByName('summoned-bees'), undefined);
  view.dispose(); assert.equal(scene.children.length, 0);
});
