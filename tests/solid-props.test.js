import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { OPENING_FIGHT_GROUND } from '../src/opening-fights.js';

const { createWorld, PROP_SOLID } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());
const { TIDEHAVEN_SMITHY, villageToWorld } = await import('../src/region-world.js');
const { OUTPOST_LAYOUT } = await import('../src/outpost.js');
const toRoad = (x, z) => {
  let best = Infinity;
  for (const path of world.paths) for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], vx = b.x - a.x, vz = b.z - a.z, len = vx * vx + vz * vz || 1;
    const t = Math.max(0, Math.min(1, ((x - a.x) * vx + (z - a.z) * vz) / len));
    best = Math.min(best, Math.hypot(x - a.x - vx * t, z - a.z - vz * t));
  }
  return best;
};

test('the things standing about Tidehaven are solid: posts, crates, barrels, rails', () => {
  const props = world.colliders.filter(c => c.kind === 'prop');
  const tidehaven = props.filter(c => Math.hypot(c.x + 16, c.z - 33) < 60);
  assert.ok(tidehaven.length > 100, `only ${tidehaven.length} solid props in Tidehaven`);
  assert.ok(props.every(c => c.r >= .1 && c.r <= 1 && Number.isFinite(c.x) && Number.isFinite(c.z)));
});

test('a name board on its posts is solid across its face, unless it hangs over the road', () => {
  const boards = world.roadSigns.filter(sign => sign.kind === 'place');
  assert.ok(boards.length >= 5);
  for (const board of boards) {
    if (toRoad(board.x, board.z) < PROP_SOLID.lane + .4) continue;
    assert.ok(!canStand(board.x, board.z, world, .34), `the ${board.label} board can be walked through`);
  }
});

test('no prop stands on a road, a person’s place, a site, a bench, a fishing bank or a raid’s ground', () => {
  for (const c of world.colliders.filter(c => c.kind === 'prop')) {
    assert.ok(toRoad(c.x, c.z) > PROP_SOLID.lane + c.r - 1e-6, `a prop at ${c.x.toFixed(1)}, ${c.z.toFixed(1)} narrows a road`);
  }
  const points = [
    ...Object.entries(world.npcPositions), ...Object.entries(world.storySites), ...Object.entries(world.journeySites ?? {}),
    ...(world.fishingSpots ?? []).map(spot => [spot.name, spot.fishingSpot]), ...world.repairBenches.map(bench => [bench.name, bench]),
    ...OPENING_FIGHT_GROUND.map(point => [point.id ?? 'raid checkpoint', point]), ['the practice post', world.training],
  ];
  const props = world.colliders.filter(c => c.kind === 'prop');
  for (const [name, point] of points) {
    assert.ok(props.every(c => Math.hypot(c.x - point.x, c.z - point.z) >= c.r + .8 - 1e-6), `a prop crowds ${name}`);
  }
});

test('the smithy stands on nobody’s footpath', () => {
  // The village draws forty-four paths. The first is the main road; the rest are the lanes
  // between the cottages, and a sweep that reads only `world.paths[0]` cannot see them - which
  // is how the first smithy came to put a shelter post 0.14 m from a lane, in the middle of
  // somebody's way to their own door.
  const forge = TIDEHAVEN_SMITHY;
  assert.ok(world.paths.length > 1, 'the village draws more than the main road');
  const segTo = (x, z, a, b) => {
    const dx = b.x - a.x, dz = b.z - a.z, len = dx * dx + dz * dz;
    const t = len ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / len)) : 0;
    return Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t));
  };
  const toPath = (x, z) => Math.min(...world.paths.slice(1).map(line => {
    let best = Infinity;
    for (let i = 0; i + 1 < line.length; i++) best = Math.min(best, segTo(x, z, line[i], line[i + 1]));
    return best;
  }));
  // A lane is 2.6 m wide, so 1.3 m of it each side of its line; a post wants to be off that.
  const EDGE = 1.3 + 0.6, TURN = -0.42;
  for (const [sa, sb] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    const spot = villageToWorld(
      forge.a + sa * 2.2 * Math.cos(TURN) + sb * 1.55 * Math.sin(TURN),
      forge.b - sa * 2.2 * Math.sin(TURN) + sb * 1.55 * Math.cos(TURN));
    const off = toPath(spot.x, spot.z);
    assert.ok(off >= EDGE, `the post at (${sa}, ${sb}) is ${off.toFixed(2)} m off the nearest lane`);
  }
  // And the measurement written down with the plot is the one that was taken.
  assert.ok(toPath(forge.x, forge.z) >= EDGE);
  assert.ok(Math.abs(Math.min(...[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sa, sb]) => {
    const spot = villageToWorld(forge.a + sa * 2.2 * Math.cos(TURN) + sb * 1.55 * Math.sin(TURN),
      forge.b - sa * 2.2 * Math.sin(TURN) + sb * 1.55 * Math.cos(TURN));
    return toPath(spot.x, spot.z);
  })) - forge.offPath) < 0.6, 'the constant says what was measured');
});

test('every smith has ground to stand on at his own forge', () => {
  // He is placed by the host rather than by regionNpcPositions, so no other test covers his feet.
  const at = TIDEHAVEN_SMITHY.stand;
  assert.ok(canStand(at.x, at.z, world), 'the smith stands where the game says he does');
  // And there is open ground all round him, so nobody is talking to a man wedged in a corner.
  let open = 0;
  for (let turn = 0; turn < 16; turn++) {
    const angle = turn / 16 * Math.PI * 2;
    if (canStand(at.x + Math.cos(angle) * 1.4, at.z + Math.sin(angle) * 1.4, world)) open++;
  }
  assert.ok(open >= 12, `${open} of 16 ways out of the forge yard`);
  // And the army's armourer, beside the smithy tent that was already standing in the Moros camp.
  const post = OUTPOST_LAYOUT.armourer;
  assert.ok(canStand(post.x, post.z, world), 'the armourer stands where the game says he does');
  let ways = 0;
  for (let turn = 0; turn < 16; turn++) {
    const angle = turn / 16 * Math.PI * 2;
    if (canStand(post.x + Math.cos(angle) * 1.4, post.z + Math.sin(angle) * 1.4, world)) ways++;
  }
  assert.ok(ways >= 10, `${ways} of 16 ways out of the camp forge`);
  // He is outside the tent, not inside its posts: the tent box reaches 3.6 m from its middle.
  const tent = OUTPOST_LAYOUT.smithy;
  assert.ok(Math.abs(post.x - tent.x) > tent.hx || Math.abs(post.z - tent.z) > tent.hz, 'clear of the tent itself');
});
