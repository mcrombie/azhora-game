import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { LEGION_POSTS, LEGION_POST_IDS, legionPostLines } from '../src/legion-posts.js';

test('eleven army posts line the road, each with a name, a rank, a model and two lines', () => {
  assert.equal(LEGION_POSTS.length, 11, 'with the picket sergeant at the Lauvel that makes twelve Empire soldiers');
  assert.equal(LEGION_POST_IDS.size, 11);
  assert.equal(new Set(LEGION_POSTS.map(entry => entry.name)).size, 11);
  for (const entry of LEGION_POSTS) {
    assert.ok(['legionary', 'officer'].includes(entry.rank), entry.id);
    assert.equal(entry.modelRole, entry.rank === 'officer' ? 'legion-officer' : 'legion-soldier');
    assert.equal(legionPostLines(entry.id).length, 2, `${entry.name} has two lines`);
    assert.ok(Number.isFinite(entry.x) && Number.isFinite(entry.z) && Number.isFinite(entry.yaw));
  }
  assert.equal(LEGION_POSTS.filter(entry => entry.rank === 'officer').length, 1, 'one Marshal commands the muster');
  assert.deepEqual(legionPostLines('post-nobody'), []);
});

test('every post stands on walkable ground beside the road, clear of the quest characters and of each other', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const world = createWorld(new THREE.Scene());
  const road = world.paths[0];
  const roadDistance = (x, z) => {
    let best = Infinity;
    for (let i = 1; i < road.length; i++) {
      const a = road[i - 1], b = road[i], dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / l2));
      best = Math.min(best, Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t)));
    }
    return best;
  };
  const quest = ['warden', 'meadow-courier', 'crossing-keeper', 'ridge-keeper', 'relay-clerk'];
  for (const entry of LEGION_POSTS) {
    assert.ok(canStand(entry.x, entry.z, world, .45), `${entry.name} stands on solid ground`);
    const gap = roadDistance(entry.x, entry.z);
    assert.ok(gap >= 1.2 && gap <= 20, `${entry.name} keeps beside the road (${gap.toFixed(1)} m)`);
    for (const id of quest) {
      const p = world.npcPositions[id];
      assert.ok(Math.hypot(p.x - entry.x, p.z - entry.z) > 4, `${entry.name} does not crowd ${id}`);
    }
    assert.ok(Math.hypot(world.pierHead.x - entry.x, world.pierHead.z - entry.z) > 4, `${entry.name} does not crowd Lakota at the pier`);
    for (const other of LEGION_POSTS) if (other !== entry) assert.ok(Math.hypot(other.x - entry.x, other.z - entry.z) > 3, `${entry.name} and ${other.name} keep apart`);
    assert.ok(world.regionAt(entry.x, entry.z), `${entry.name} is inside a region`);
  }
  const regions = LEGION_POSTS.map(entry => world.regionAt(entry.x, entry.z).name);
  assert.ok(regions.includes('Drent') && regions.includes('Moros Plain'), 'the posts run from Drent to the Moros');
});
