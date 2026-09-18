import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { TALKING_TREE, TREE_NOTICE, TREE_WATCH, TREE_REST, createTalkingTree, validateTalkingTreeSnapshot, treeLines } from '../src/talking-tree.js';

const at = (distance, angle = 0) => ({ x: TALKING_TREE.x + Math.sin(angle) * distance, z: TALKING_TREE.z + Math.cos(angle) * distance });
const run = (tree, player, seconds, step = .1) => { let view; for (let t = 0; t < seconds; t += step) view = tree.update(step, player); return view; };

test('it is only a tree until the traveler comes near', () => {
  const tree = createTalkingTree();
  const far = run(tree, at(TREE_NOTICE * 3), 5);
  assert.deepEqual([far.phase, far.open, far.stage], ['asleep', 0, 'unknown']);
});

test('it wakes, watches the traveler for a while, then hides its face', () => {
  const events = [];
  const tree = createTalkingTree({ onEvent: event => events.push(event.type) });
  const here = at(TREE_NOTICE * .6, 1.2);
  let view = run(tree, here, 3);
  assert.equal(view.phase, 'watching', 'the face is open after a few seconds');
  assert.equal(view.open, 1);
  assert.equal(view.stage, 'seen');
  // The face has slid round the bark to look at the traveler.
  const want = Math.atan2(here.x - TALKING_TREE.x, here.z - TALKING_TREE.z);
  assert.ok(Math.abs(view.faceYaw - want) < .15, `it is looking at you (${view.faceYaw.toFixed(2)} vs ${want.toFixed(2)})`);

  view = run(tree, here, TREE_WATCH + 3);
  assert.ok(['hiding', 'resting'].includes(view.phase), 'it loses interest');
  view = run(tree, here, 3);
  assert.equal(view.phase, 'resting');
  assert.equal(view.open, 0, 'and the face goes back into the grain');
  assert.deepEqual(events.filter(type => type !== 'tree-woke'), ['tree-seen', 'tree-hid']);

  // Standing there does not wake it again; walking away and coming back later does.
  view = run(tree, here, TREE_REST + 10);
  assert.equal(view.phase, 'resting', 'it will not be stared back awake');
  run(tree, at(TREE_NOTICE * 3), 2);
  view = run(tree, here, 3);
  assert.equal(view.phase, 'watching');
  assert.equal(view.sightings, 2);
});

test('walking off before it has finished looking makes it hide', () => {
  const tree = createTalkingTree();
  run(tree, at(10), 3);
  const view = run(tree, at(TREE_NOTICE * 2), 3);
  assert.ok(['hiding', 'resting'].includes(view.phase));
});

test('the botanist’s word changes what the traveler notices, and it all survives a save', () => {
  const tree = createTalkingTree();
  assert.ok(treeLines(tree.view())[0].length > 40);
  run(tree, at(10), 3);
  assert.ok(treeLines(tree.view()).join(' ').includes('looking at you'));
  assert.equal(tree.tell(), true);
  assert.equal(tree.tell(), false);
  assert.ok(treeLines(tree.view()).join(' ').includes('Ambron'));
  const saved = tree.snapshot();
  assert.equal(validateTalkingTreeSnapshot(saved), true);
  assert.equal(validateTalkingTreeSnapshot({ version: 1, stage: 'friends', sightings: 0 }), false);
  const other = createTalkingTree();
  assert.equal(other.restore(saved), true);
  assert.equal(other.stage, 'told');
  assert.equal(other.phase, 'asleep', 'it does not come back from a save already awake');
});

test('it stands in its own clearing in Drent, off every path', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const world = createWorld(new THREE.Scene());
  assert.equal(world.regionAt(TALKING_TREE.x, TALKING_TREE.z)?.name, 'Drent');
  for (let a = 0; a < 12; a++) for (const r of [4, 6]) {
    const x = TALKING_TREE.x + Math.cos(a * .52) * r, z = TALKING_TREE.z + Math.sin(a * .52) * r;
    assert.ok(canStand(x, z, world, .5), `the clearing is blocked at ${x.toFixed(0)},${z.toFixed(0)}`);
  }
  const road = Math.min(...world.paths.flat().map(p => Math.hypot(p.x - TALKING_TREE.x, p.z - TALKING_TREE.z)));
  assert.ok(road > 25, `it should be found, not passed (${road.toFixed(0)} m from a road)`);
  for (const stand of Object.values(world.npcPositions)) {
    assert.ok(Math.hypot(stand.x - TALKING_TREE.x, stand.z - TALKING_TREE.z) > 30, 'nobody lives next to it');
  }
});
