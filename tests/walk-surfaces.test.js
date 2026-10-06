import test from 'node:test';
import assert from 'node:assert/strict';
import { createWalkSurfaces, restoreWalkPosition } from '../src/world/collision/walk-surfaces.js';
import { bodyWorld } from '../src/gameplay/combat/bodies.js';
import { canStand, canSwim, moveCharacter } from '../src/gameplay/movement/game-state.js';
import { createTerrainFall, shouldStartTerrainFall } from '../src/gameplay/movement/terrain-fall.js';

const surfaces = [
  { id: 'canopy-stair', kind: 'ramp', a: { x: -10, y: 1, z: 0 }, b: { x: 0, y: 8, z: 0 }, width: 3 },
  { id: 'canopy-home', kind: 'deck', a: { x: 0, y: 8, z: 0 }, b: { x: 10, y: 8, z: 0 }, width: 6 },
  { id: 'canopy-bridge', kind: 'deck', a: { x: 10, y: 8, z: 0 }, b: { x: 16, y: 8, z: 0 }, width: 2 },
];
function fixture() {
  const heightAt = () => 1, walks = createWalkSurfaces(surfaces, heightAt);
  return { bounds: { minX: -50, maxX: 50, minZ: -50, maxZ: 50 }, colliders: [], heightAt,
    supportAt: walks.supportAt, walkSurfaces: surfaces };
}

test('stairs reach a stable canopy deck and bridge while the same ground remains walkable underneath', () => {
  const world = fixture(), at = { x: -10.1, y: 1, z: 0 }, walking = bodyWorld(world).moving(at);
  for (let i = 0; i < 240; i++) { moveCharacter(at, .1, 0, walking); at.y = walking.heightAt(at.x, at.z); }
  assert.ok(at.x > 13.8 && at.y === 8, 'ordinary small steps climbed the stairs and crossed onto the bridge');
  assert.equal(walking.heightAt(at.x, at.z), 8, 'standing still retains the deck');
  assert.equal(world.heightAt(at.x, at.z), 1, 'default placement still uses the original ground');
  at.x = 5; at.z = -4; at.y = 1;
  for (let i = 0; i < 80; i++) { moveCharacter(at, 0, .1, walking); at.y = walking.heightAt(at.x, at.z); }
  assert.equal(at.y, 1); assert.ok(at.z > 3.9, 'the player crossed under the home');
  assert.equal(world.supportAt(5, 0, { maxY: 8 }).slope, 0, 'deck edges do not inherit cliff gradients');
});

test('canopy walls and people only obstruct the level they occupy, while unbounded trunks stay solid', () => {
  const world = fixture(), at = { x: 4, y: 1, z: 0 };
  world.colliders.push({ x: 5, z: 0, hx: .2, hz: 1, minY: 8, maxY: 12, kind: 'canopy-wall' });
  const walking = bodyWorld(world).moving(at);
  assert.equal(canStand(5, 0, walking), true);
  at.y = 8; assert.equal(canStand(5, 0, walking), false);
  world.colliders.length = 0;
  walking.setBodies([{ id: 'below', x: 5, z: 0, r: .3, minY: 1, maxY: 2.7 }]);
  assert.equal(canStand(5, 0, walking), true);
  at.y = 1; assert.equal(canStand(5, 0, walking), false);
  walking.setBodies([]); world.colliders.push({ x: 5, z: 0, r: 1, kind: 'tree' });
  at.y = 8; assert.equal(canStand(5, 0, walking), false);
});

test('stepping off a canopy deck falls to the ground and a fast fall lands on the highest crossed deck', () => {
  const world = fixture(), at = { x: 5, y: 8, z: 2.95 }, walking = bodyWorld(world).moving(at), before = { ...at };
  moveCharacter(at, 0, .3, walking);
  const floor = world.supportAt(at.x, at.z, { maxY: at.y });
  assert.ok(shouldStartTerrainFall({ before, after: at, floor: floor.height, groundSlope: floor.slope }));
  const fall = createTerrainFall(); fall.begin(at);
  for (let i = 0; fall.active && i < 100; i++) fall.tick(.025, { position: at, surfaceAt: world.supportAt });
  assert.equal(at.y, 1); assert.equal(fall.view().damage, 18);
  at.x = 5; at.z = 0; at.y = 15; fall.begin(at, { velocity: -100 });
  for (let i = 0; fall.active && i < 10; i++) fall.tick(.1, { position: at, surfaceAt: world.supportAt });
  assert.equal(at.y, 8, 'the swept query did not tunnel through the upper floor');
});

test('jumping below a canopy floor does not pull the traveler upward, and an elevated bridge can cross water', () => {
  const world = fixture(), at = { x: 5, y: 1, z: 0 }, fall = createTerrainFall();
  fall.begin(at, { velocity: 6.3 });
  let peak = at.y;
  for (let i = 0; fall.active && i < 100; i++) { fall.tick(.025, { position: at, surfaceAt: world.supportAt }); peak = Math.max(peak, at.y); }
  assert.ok(peak < 3); assert.equal(at.y, 1);
  const wet = { ...world, heightAt: () => -2, supportAt: createWalkSurfaces(surfaces, () => -2).supportAt };
  const walking = bodyWorld(wet).moving(at);
  at.y = 8; assert.equal(canStand(5, 0, walking), true); assert.equal(canSwim(5, 0, walking), false);
  at.y = -1; assert.equal(canStand(5, 0, walking), false); assert.equal(canSwim(5, 0, walking), true);
});

test('restoring a floor identity selects the right level and stale or misplaced identities resume on ground', () => {
  const world = fixture();
  assert.deepEqual(restoreWalkPosition({ x: 5, z: 0, surfaceId: 'canopy-home' }, world), { x: 5, y: 8, z: 0, surfaceId: 'canopy-home' });
  for (const saved of [{ x: 5, z: 0 }, { x: 5, z: 0, surfaceId: 'removed-home' }, { x: 20, z: 0, surfaceId: 'canopy-home' }])
    assert.equal(restoreWalkPosition(saved, world).y, 1);
  assert.equal(restoreWalkPosition({ x: 5, z: 0, y: 999 }, world).y, 1, 'an arbitrary saved height is ignored');
});
