import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';

/**
 * A fingerpost is only worth building if a traveler can walk up to it and read it.
 * The posts on the new road are not placed where the table says: each is nudged along
 * one fixed diagonal until it is 2.4 m clear of the road (`src/world.js`). Where a road
 * runs that same diagonal the post has a long way to go, and it can walk off the bank —
 * at the Caloss it ended 3.79 m below the bridge, standing in the river with its head
 * under the water.
 */
const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());
const PLAYER = .45;

/** The nearest ground a traveler can stand on, and how far above or below the post's foot it is. */
function footing(sign) {
  for (let reach = .5; reach <= 8; reach += .5) for (let turn = 0; turn < 48; turn++) {
    const angle = turn / 48 * Math.PI * 2, x = sign.x + Math.cos(angle) * reach, z = sign.z + Math.sin(angle) * reach;
    if (canStand(x, z, world, PLAYER)) return { reach, drop: world.heightAt(x, z) - world.heightAt(sign.x, sign.z) };
  }
  return null;
}

// Two posts are placed by hand inside their own region's buildings rather than by the
// road nudge, and are written up in docs/known-issues.md instead of guessed at here.
// 'The Stair' is in Ambron, which is being rebuilt.
const HAND_PLACED = new Set(['The Quay', 'The Stair']);

test('every fingerpost on the road stands where a traveler can walk up and read it', () => {
  const signs = world.roadSigns.filter(sign => sign.kind === 'direction' && Number.isFinite(sign.x));
  assert.ok(signs.length >= 20, `only ${signs.length} fingerposts`);
  for (const sign of signs) {
    const ground = footing(sign);
    if (HAND_PLACED.has(sign.label)) {
      // Still wrong, and written up rather than guessed at. When one is moved this fails,
      // which is the reminder to take it out of HAND_PLACED instead of leaving a stale excuse.
      assert.ok(!ground || ground.reach > 2 || Math.abs(ground.drop) > 1.2,
        `"${sign.label}" has been put right; drop it from the known exceptions in this test and from docs/known-issues.md`);
      continue;
    }
    assert.ok(ground, `"${sign.label}" at ${sign.x.toFixed(0)}, ${sign.z.toFixed(0)} has no ground within 8 m to read it from`);
    assert.ok(ground.reach <= 2, `"${sign.label}" at ${sign.x.toFixed(0)}, ${sign.z.toFixed(0)} is ${ground.reach} m from the nearest ground a traveler can stand on`);
    assert.ok(Math.abs(ground.drop) <= 1.2,
      `"${sign.label}" at ${sign.x.toFixed(0)}, ${sign.z.toFixed(0)} stands ${ground.drop.toFixed(2)} m below the ground it is read from`);
  }
});

test('no signpost anywhere is standing in the water', () => {
  for (const sign of world.roadSigns) {
    if (!Number.isFinite(sign.x)) continue;
    const here = world.heightAt(sign.x, sign.z);
    assert.ok(here >= .45, `"${sign.label}" at ${sign.x.toFixed(0)}, ${sign.z.toFixed(0)} stands at ${here.toFixed(2)}, below the waterline`);
    const river = (world.nearColliders ? world.nearColliders(sign.x, sign.z, PLAYER) : world.colliders)
      .filter(c => c.kind === 'river-water' && c.r !== undefined && Math.hypot(sign.x - c.x, sign.z - c.z) < c.r + PLAYER);
    assert.deepEqual(river.map(c => `${c.x.toFixed(0)},${c.z.toFixed(0)}`), [], `"${sign.label}" is standing in the river`);
  }
});

test('the post for the Caloss bridge stands on the bank it points from, not in the Caloss', () => {
  const sign = world.roadSigns.find(entry => entry.label === 'The Caloss Bridge');
  assert.ok(sign, 'the Caloss bridge still has a fingerpost');
  // Measured: the table puts it at (-601.1, 132.2) on the road, and the nudge used to end
  // at (-609.9, 144.3) — in the river at 1.25 m, with the bank 2.5 m away at 5.04 m.
  assert.ok(world.heightAt(sign.x, sign.z) > 4, `the post's foot is at ${world.heightAt(sign.x, sign.z).toFixed(2)}, not on the bank`);
  const ground = footing(sign);
  assert.ok(ground && ground.reach <= 1.5 && Math.abs(ground.drop) < 1, `the bank is ${JSON.stringify(ground)} from the post`);
});
