import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { PLACE_LANDMARKS, PLACE_CLEARINGS, LUMBER_TOWN_WORKS, STABLE_CLEARANCE, AVREL_HAMLET } from '../src/places.js';
import { WAYSIDE_PLACES, DRENT_WAYSIDE, MOROS_WAYSIDE, MOROS_MILESTONES } from '../src/wayside.js';
import { FRONTIER_LANDMARKS } from '../src/frontier.js';
import { OUTPOST_BENCH, OUTPOST_FIRE } from '../src/outpost.js';
import { LUMBER_TOWN_STABLE, regionNameAt, insideRegion } from '../src/region-world.js';

const scene = new THREE.Scene();
const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(scene);
const lineDistance = (points, x, z) => {
  let best = Infinity;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - a.x - dx * t, z - a.z - dz * t));
  }
  return best;
};
// Everything that already stood before this pass keeps its own clearances; these are the colliders the pass adds.
const NEW_KINDS = /^(signpost|notice-board|border-stone|milestone|palisade-|stockade-|frontier-|outpost-|legion-tent|command-tent|legion-standard|smithy|forge|anvil|quench|spear-rack|granary|horse-trough|hay-stack|mess-|wall-stair|truce-pole|moros-gate-|watch-platform|fold-|picket-|brazier|dead-campfire|barn|byre|stack-yard|field-wall|shelter-wall|farm-well|gatehouse|guard-hut|fernway|charcoal|bark-hut|foresters|porch|chopping|pole-rack|wayside-shrine|log-stack|cart|sawhorse|ferry-hut|reed-|punt|shrine-court|signal-|relay-fence|field-hospital|cairn|hamlet-|dead-tree|town-|washing|stable|hitching|paddock|ranger|picket-post|crates|barrels|stockade-shelter)/;

test('no new building, wall or prop stands on a road, and the whole main road can still be ridden', () => {
  const added = world.colliders.filter(c => NEW_KINDS.test(c.kind ?? ''));
  assert.ok(added.length > 400, `the pass adds its colliders (${added.length})`);
  for (const c of added) {
    if (/frontier-gate-shut/.test(c.kind)) continue;   // the shut gate closes the road on purpose, beyond where it may be walked
    const reach = c.r ?? Math.min(c.hx, c.hz);
    for (const [name, road, half] of [['the main road', world.paths[0], 2.1], ['the Suval branch', world.suvalRoute, 1.7]]) {
      const clearance = lineDistance(road, c.x, c.z) - reach;
      assert.ok(clearance >= half - .15, `${c.kind} at ${c.x.toFixed(1)}, ${c.z.toFixed(1)} is ${clearance.toFixed(2)} m from ${name}`);
    }
  }
});

test('the stable yard is dressed without a collider within 6 m of the ostler’s stand or the hitch', () => {
  for (const spot of [LUMBER_TOWN_STABLE.stand, LUMBER_TOWN_STABLE.hitch]) for (const c of world.colliders.filter(k => NEW_KINDS.test(k.kind ?? ''))) {
    const gap = c.r !== undefined ? Math.hypot(c.x - spot.x, c.z - spot.z) - c.r : Math.hypot(Math.max(0, Math.abs(c.x - spot.x) - c.hx), Math.max(0, Math.abs(c.z - spot.z) - c.hz));
    assert.ok(gap >= STABLE_CLEARANCE, `${c.kind} is ${gap.toFixed(2)} m from the stable yard's ${spot === LUMBER_TOWN_STABLE.stand ? 'stand' : 'hitch'}`);
  }
  for (const name of ['stable', 'horse-trough', 'hitching-rail', 'paddock-fence']) assert.ok(world.colliders.some(c => c.kind === name), `the yard has its ${name}`);
  assert.equal(LUMBER_TOWN_WORKS.gates.length, 2, 'a palisade gate at each end of the road');
});

test('the outpost’s smithy bench and mess fire are registered like every other bench and fire, and can be reached', () => {
  assert.ok(world.repairBenches.some(bench => bench.id === OUTPOST_BENCH.id));
  assert.ok(world.firePits.some(fire => fire.id === OUTPOST_FIRE.id));
  for (const spot of [OUTPOST_BENCH, OUTPOST_FIRE]) assert.ok(canStand(spot.x, spot.z, world, .48), `${spot.id} has room to work`);
  assert.equal(regionNameAt(OUTPOST_BENCH.x, OUTPOST_BENCH.z), 'Moros Plain');
});

test('the empty roads have wayside places, each a landmark with discovery text in its own region, and nothing in Drent to fight', () => {
  const ids = world.landmarks.map(landmark => landmark.id);
  assert.equal(new Set(ids).size, ids.length, 'landmark ids are unique');
  for (const place of [...WAYSIDE_PLACES, ...PLACE_LANDMARKS, ...FRONTIER_LANDMARKS]) {
    assert.ok(ids.includes(place.id), `${place.id} can be discovered`);
    assert.ok(place.description.length > 40, `${place.id} has discovery text`);
    assert.doesNotMatch(place.description, /goblin/i);
    assert.ok(canStand(place.x, place.z, world, .3) || world.colliders.some(c => Math.hypot(c.x - place.x, c.z - place.z) < 6), `${place.id} is somewhere`);
  }
  assert.equal(DRENT_WAYSIDE.length, 4); assert.ok(DRENT_WAYSIDE.every(place => regionNameAt(place.x, place.z) === 'Drent'));
  assert.ok(MOROS_WAYSIDE.length >= 4 && MOROS_WAYSIDE.every(place => regionNameAt(place.x, place.z) === 'Moros Plain'));
  assert.equal(MOROS_MILESTONES.length, 3);
  assert.equal(world.landmarks.filter(l => insideRegion('East Suval', l.x, l.z) && FRONTIER_LANDMARKS.includes(l)).length, 0, 'the frontier is discovered from Luscia');
});

test('the scatter keeps clear of every new building, and the farmsteads stand where the clearing is', () => {
  const trees = world.colliders.filter(c => c.kind === 'region-tree');
  const buildings = world.colliders.filter(c => /^(barn|byre|guard-hut|foresters|ferry-hut|field-hospital|stable|smithy|town-hall|frontier-building|legion-tent|command-tent)/.test(c.kind ?? ''));
  for (const b of buildings) for (const tree of trees) {
    const gap = b.r !== undefined ? Math.hypot(b.x - tree.x, b.z - tree.z) - b.r - tree.r : Math.hypot(Math.max(0, Math.abs(tree.x - b.x) - b.hx), Math.max(0, Math.abs(tree.z - b.z) - b.hz)) - tree.r;
    assert.ok(gap > -.05, `a tree grows through ${b.kind} at ${b.x.toFixed(1)}, ${b.z.toFixed(1)}`);
  }
  assert.ok(PLACE_CLEARINGS.length > 10);
  assert.equal(regionNameAt(AVREL_HAMLET.barn.x, AVREL_HAMLET.barn.z), 'Drent');
});
