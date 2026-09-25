import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { CAGNEY_HOME } from '../src/cagney-quest.js';
import { BODY } from '../src/bodies.js';
import { canStand } from '../src/game-state.js';
import { BEN_HOME, TROY_HOME, CAGNEY_RESIDENCE, QUEST_HOMES } from '../src/quest-homes.js';
import { AMBRON_BUILDINGS, AMBRON_ENCLOSURE } from '../src/ambron.js';

const { createWorld } = await sourceModule('../src/world.js');
const scene = new THREE.Scene(), world = createWorld(scene);


test('Ben lives beside Cagney and Troy has his own Ambron house, using existing buildings', () => {
  assert.equal(CAGNEY_RESIDENCE.porch, CAGNEY_HOME, 'Cagney keeps her established quest destination');
  assert.deepEqual(Object.keys(QUEST_HOMES).sort(), ['bee-keeper', 'ben-sorcerer', 'cagney']);
  assert.equal(new Set(Object.values(QUEST_HOMES).map(home => home.buildingId)).size, 3);
  for (const home of Object.values(QUEST_HOMES)) {
    assert.ok(AMBRON_BUILDINGS.some(building => building.id === home.buildingId), home.name);
    assert.ok(AMBRON_ENCLOSURE.contains(home.porch.x, home.porch.z), `${home.name} lives inside Ambron`);
  }
  assert.ok(Math.hypot(BEN_HOME.porch.x - CAGNEY_HOME.x, BEN_HOME.porch.z - CAGNEY_HOME.z) < 8,
    'Ben and Cagney face the same short stretch of lane');
  assert.ok(Math.hypot(TROY_HOME.porch.x - BEN_HOME.porch.x, TROY_HOME.porch.z - BEN_HOME.porch.z) > 70,
    'Troy has a separate corner of the city');
  assert.equal(AMBRON_BUILDINGS.find(building => building.id === BEN_HOME.buildingId).door, 'south');
});

test('the three home approaches and door thresholds remain walkable after adding their mailboxes', () => {
  for (const home of Object.values(QUEST_HOMES)) {
    assert.equal(home.routeEndpoint, home.door);
    for (const point of [home.entry, home.porch, home.door])
      assert.ok(canStand(point.x, point.z, world, BODY.traveler), `${home.name}: usable entry, porch and door`);
    // City travel uses ordinary collision steering; the narrow doorstep approach
    // itself must remain completely open beside the decorative mailbox.
    const approach = [home.entry, home.porch, home.door];
    for (let i = 1; i < approach.length; i++) {
      const a = approach[i - 1], b = approach[i], steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) * 4);
      for (let n = 0; n <= steps; n++) {
        const t = n / steps, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
        assert.ok(canStand(x, z, world, BODY.traveler), `${home.name}: clear approach ${i} at ${x}, ${z}`);
      }
    }
    assert.ok(Math.hypot(home.mailbox.x - home.door.x, home.mailbox.z - home.door.z) > 2,
      `${home.name}: mailbox does not obstruct the door`);
  }
});

test('Ben and Troy have distinct visible frontages and named physical mailboxes', () => {
  for (const home of [BEN_HOME, TROY_HOME]) {
    for (const name of [`${home.name}'s home frontage`, `${home.name} mailbox`, `${home.name} mailbox nameplate`]) {
      const object = scene.getObjectByName(name); assert.ok(object, name);
      const bounds = new THREE.Box3().setFromObject(object);
      assert.ok([...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite), `${name}: finite visible geometry`);
      assert.ok(!bounds.isEmpty(), name);
    }
    assert.ok(world.colliders.some(collider => collider.kind === `${home.name.toLowerCase()}-mailbox`
      && collider.homeId === home.homeId && collider.x === home.mailbox.x && collider.z === home.mailbox.z));
  }
});
