import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { BORDER_NPCS, BORDER_ARENA, borderEncounter } from '../src/border-chapter.js';
import { MOROS_SITES } from '../src/moros-chapter.js';
import { AFTERMATH_VARIANTS, AFTERMATH_SITE_IDS, AFTERMATH_ARENA_IDS, aftermathEncounter } from '../src/aftermath-chapter.js';
import { AFTERMATH_SITES, AFTERMATH_ARENAS, aftermathBuilt } from '../src/aftermath-sites.js';
import { LEGION_POSTS } from '../src/legion-posts.js';
import { legionPostStake } from '../src/occupation.js';
import { RIDE } from '../src/riding.js';
import { LUMBER_TOWN_STABLE } from '../src/region-world.js';
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
    assert.ok(stand && canStand(stand.x, stand.z, world, .45), `${soldier.name} has a stand at the Tessen road post`);
    assert.equal(world.regionAt(stand.x, stand.z)?.name, 'Pueth');
  }
  const camp = FOREST_HIDEOUT_QUEST.encounter;
  assert.equal(world.regionAt(camp.center.x, camp.center.z)?.name, 'Pueth', 'the goblin camp is in southern Pueth');
  for (const point of [FOREST_HIDEOUT_QUEST.approach, FOREST_HIDEOUT_QUEST.supplies, ...camp.enemies]) assert.ok(canStand(point.x, point.z, world, .45), `camp point ${point.x},${point.z} has footing`);
});

test('the day after the battle has ground under it wherever its places are built', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const world = createWorld(new THREE.Scene());
  assert.deepEqual(Object.keys(AFTERMATH_SITES).sort(), [...AFTERMATH_SITE_IDS].sort(), 'every site the chapter names is listed, built or not');
  assert.deepEqual(Object.keys(AFTERMATH_ARENAS).sort(), [...AFTERMATH_ARENA_IDS].sort());
  for (const [id, site] of Object.entries(AFTERMATH_SITES)) {
    if (!site) continue;
    assert.ok(canStand(site.x, site.z, world, .45), `${id} can be stood on`);
    // The envoy takes the Legate's own place, but only once the Legion's people have quit the outpost.
    const gone = post => id === 'outpost-command' && legionPostStake(post.id);
    for (const post of LEGION_POSTS) assert.ok(gone(post) || Math.hypot(post.x - site.x, post.z - site.z) >= 4, `${id} leaves ${post.id} room`);
  }
  const allies = Array.from({ length: 4 }, (_, index) => ({ id: `ally-${index}`, kind: 'legionary' }));
  for (const spec of Object.values(AFTERMATH_VARIANTS)) {
    const arena = AFTERMATH_ARENAS[spec.arena];
    if (!arena) { assert.equal(aftermathBuilt(spec), false, `${spec.id} waits for its ground`); continue; }
    const fight = aftermathEncounter(spec.id, arena, allies);
    for (const point of [...fight.enemies, ...fight.allies, fight.checkpoint, fight.center]) assert.ok(canStand(point.x, point.z, world, .45), `${spec.id} has footing at ${point.x},${point.z}`);
    // The way out is walkable past the retreat line.
    const beyond = { ...fight.checkpoint, [fight.retreatAxis]: fight.retreatLine + 1.5 };
    assert.ok(canStand(beyond.x, beyond.z, world, .45), `${spec.id} can be retreated from`);
    assert.equal(world.regionAt(fight.center.x, fight.center.z)?.name, spec.region, `${spec.id} is fought in ${spec.region}`);
  }
  // The Moros variants are playable today.
  assert.ok(aftermathBuilt(AFTERMATH_VARIANTS['moros-fallback']) && aftermathBuilt(AFTERMATH_VARIANTS['moros-outpost']));
});

test('the roads can be ridden end to end, and the stable yard has room for a man and a horse', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const world = createWorld(new THREE.Scene());
  // A mounted traveler is wider than a walker: the whole main road, the Caloss bridge included, must take the mount's footprint.
  const road = world.paths[0];
  for (let i = 1; i < road.length; i++) {
    const a = road[i - 1], b = road[i], steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z)));
    for (let step = 0; step <= steps; step++) {
      const t = step / steps, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      assert.ok(canStand(x, z, world, RIDE.radius), `a rider is stopped on the road at ${x.toFixed(1)}, ${z.toFixed(1)}`);
    }
  }
  const { stand, hitch } = LUMBER_TOWN_STABLE;
  assert.ok(canStand(stand.x, stand.z, world, .45), 'the ostler has footing');
  assert.ok(canStand(hitch.x, hitch.z, world, RIDE.radius), 'the horse has footing at the hitch');
  assert.ok(Math.hypot(stand.x - hitch.x, stand.z - hitch.z) > 2.5, 'the ostler is not standing in the horse');
  for (const spot of [stand, hitch]) {
    assert.equal(world.regionAt(spot.x, spot.z)?.name, 'Luscia');
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) assert.ok(canStand(spot.x + Math.sin(angle) * 3, spot.z + Math.cos(angle) * 3, world, .45), 'the yard is clear for 3 m round');
    for (const [id, place] of Object.entries(world.npcPositions)) assert.ok(Math.hypot(place.x - spot.x, place.z - spot.z) >= 4, `${id} is not crowded by the stable yard`);
  }
  // Mounting from beside the hitch and stepping down again both find room.
  assert.ok(Math.hypot(stand.x - hitch.x, stand.z - hitch.z) < 12, 'the horse is handed over within sight of the ostler');
});
