import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { OPENING_FIGHT_GROUND } from '../src/opening-fights.js';

const { createWorld, PROP_SOLID } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());
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
