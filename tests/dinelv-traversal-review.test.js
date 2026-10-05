import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { scopedWorld } from './scoped-world.js';
import { canStand, moveCharacter } from '../src/game-state.js';
import { createClimbing, canWalkSlope, sampleClimbSurface } from '../src/climbing.js';
import { createTerrainFall, shouldStartTerrainFall } from '../src/terrain-fall.js';
import { DINELV_ASCENT, DINELV_MESAS } from '../src/southwest-world.js';

// Complete the actual shared southwest scenery job and both approach countries.
// These are the production colliders, height sampler, walking, falling and climbing.
const world = await scopedWorld(new THREE.Scene(), [48, 41, 42]);
const DT = 1 / 30, WALK = 4.2 * DT, distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const walkingSlope = (x, z, nx, nz) => canWalkSlope(x, z, nx, nz, world);
const surfaceAt = (x, z) => ({ ...sampleClimbSurface(world, x, z), water: false });
const startAt = p => ({ x: p.x, y: world.heightAt(p.x, p.z), z: p.z });

function walkStep(at, dx, dz, fall) {
  const before = { ...at };
  moveCharacter(at, dx, dz, world, .34, { canTraverse: walkingSlope });
  const surface = surfaceAt(at.x, at.z);
  if (shouldStartTerrainFall({ before, after: at, floor: surface.height, groundSlope: surface.slope }))
    fall.begin(at, { drift: { x: (at.x - before.x) / DT, z: (at.z - before.z) / DT } });
  else if (!fall.active) at.y = surface.height;
  const frame = fall.tick(DT, { position: at, surfaceAt,
    moveHorizontal: (p, x, z) => moveCharacter(p, x, z, world, .34,
      { canTraverse: (_x, _z, nx, nz) => world.heightAt(nx, nz) <= p.y + .35 }) });
  return { moved: distance(at, before), damage: frame.damage };
}

for (const descending of [false, true]) test(`the complete Dinelv ascent is safely walkable ${descending ? 'downhill' : 'uphill'} with real scenery collision`, t => {
  const route = descending ? [...DINELV_ASCENT.line].reverse() : DINELV_ASCENT.line;
  const at = startAt(route[0]), fall = createTerrainFall(), from = at.y;
  let frames = 0, walked = 0, damage = 0;
  assert.ok(canStand(at.x, at.z, world));
  for (const target of route.slice(1)) {
    let segmentFrames = 0;
    while (distance(at, target) > .001 && segmentFrames++ < 2000) {
      const d = distance(at, target), step = Math.min(WALK, d);
      const frame = walkStep(at, (target.x - at.x) * step / d, (target.z - at.z) * step / d, fall);
      walked += frame.moved; damage += frame.damage; frames++;
      assert.ok(frame.moved > step * .95, `route blocked at ${JSON.stringify(at)} toward ${JSON.stringify(target)}`);
      assert.equal(fall.active, false, `the graded route loses support at ${JSON.stringify(at)}`);
      assert.ok(canStand(at.x, at.z, world), 'the full body fits the actual scenery');
      assert.ok(Math.abs(at.y - world.heightAt(at.x, at.z)) < .001, 'feet remain on the actual ground');
    }
    assert.ok(distance(at, target) < .001, 'ordinary movement reaches each authored bend');
  }
  assert.equal(damage, 0);
  assert.ok(walked > 290 && Math.abs(from - at.y) > 55, 'the whole escarpment approach is exercised');
  t.diagnostic(`${from.toFixed(2)}m to ${at.y.toFixed(2)}m; ${walked.toFixed(1)}m walking, ${(frames * DT).toFixed(1)} simulated seconds, zero damage.`);
});

function approachMesa(mesa) {
  // The long table's east approach begins on an already steep adjoining ridge;
  // approach it and the west table from their open western plateau instead.
  const dx = mesa.id === 'north-mesa' ? -1 : 1;
  const at = startAt({ x: mesa.x - dx * (mesa.reach + 10), z: mesa.z }), fall = createTerrainFall();
  const origin = { ...at };
  assert.ok(canStand(at.x, at.z, world), `${mesa.id}: the approach is clear`);
  for (let i = 0; i < 600; i++) {
    const frame = walkStep(at, dx * WALK, 0, fall);
    assert.equal(fall.active, false, `${mesa.id}: the uphill approach should not fall`);
    assert.equal(frame.damage, 0);
    if (frame.moved < .001) {
      assert.ok(distance(at, origin) > 5, 'the traveler walks to the foot before meeting the face');
      assert.ok(canStand(at.x + dx * WALK, at.z, world), `${mesa.id}: terrain grade, not a hidden scenery blocker, stops walking`);
      assert.equal(walkingSlope(at.x, at.z, at.x + dx * WALK, at.z), false);
      assert.ok(at.y < world.heightAt(mesa.x, mesa.z) - 30, 'ordinary walking stops well below the table');
      return at;
    }
  }
  assert.fail(`${mesa.id}: ordinary walking scaled the mesa`);
}

test('all three Dinelv mesa faces stop walking and permit a controlled climb and return with normal stamina', t => {
  for (const mesa of DINELV_MESAS) {
    const at = approachMesa(mesa), origin = { ...at }, events = [];
    const climb = createClimbing({ world, onEvent: e => events.push(e) });
    const facing = sampleClimbSurface(world, at.x, at.z).yaw;
    assert.equal(climb.grab(at, facing, { stamina: 4 }), false, 'the normal minimum stamina guard applies');
    assert.equal(climb.grab(at, facing, { stamina: 100 }), true, `${mesa.id}: the face can be deliberately grabbed from ordinary walking`);
    let stamina = 100, spent = 0, damage = 0;
    for (let i = 0; i < 90; i++) {
      const frame = climb.tick(DT, { up: 1, stamina, level: 1 });
      stamina -= frame.staminaSpent; spent += frame.staminaSpent; damage += frame.damage;
      Object.assign(at, frame.position);
      assert.ok(canStand(at.x, at.z, world));
    }
    assert.ok(at.y > origin.y + 2, `${mesa.id}: held climb input gains real height`);
    assert.ok(spent > 20 && spent < 22, 'beginner climbing pays the normal moving drain without free recovery');
    for (let i = 0; climb.active && i < 600; i++) {
      const frame = climb.tick(DT, { up: -1, stamina, level: 1 });
      stamina -= frame.staminaSpent; spent += frame.staminaSpent; damage += frame.damage;
      Object.assign(at, frame.position);
      assert.ok(canStand(at.x, at.z, world));
    }
    assert.equal(climb.active, false, 'holding down returns to a real resting surface');
    assert.equal(damage, 0, 'the controlled return does not require a fall');
    assert.equal(events.some(e => e.type === 'exhausted'), false);
    assert.ok(stamina > 60 && at.y <= origin.y + .1);
    t.diagnostic(`${mesa.id}: walking stopped at ${origin.y.toFixed(2)}m; climb and safe return spent ${spent.toFixed(2)} stamina.`);
  }
});

test('Dinelv climbing retains exhaustion and solid scenery instead of granting unrestricted ascent', () => {
  const at = approachMesa(DINELV_MESAS[0]), events = [];
  const climb = createClimbing({ world, onEvent: e => events.push(e) });
  assert.ok(climb.grab(at, sampleClimbSurface(world, at.x, at.z).yaw, { stamina: 5 }));
  let stamina = 5;
  for (let i = 0; i < 150 && !events.some(e => e.type === 'exhausted'); i++) {
    const frame = climb.tick(DT, { up: 1, stamina, level: 1 });
    stamina = Math.max(0, stamina - frame.staminaSpent);
  }
  assert.ok(events.some(e => e.type === 'exhausted'));
  assert.equal(climb.view().phase, 'falling');
  assert.ok(stamina < .001);
  const obstacle = world.colliders.find(c => !['river-water', 'pond-water', 'suval-peak-face'].includes(c.kind)
    && world.regionAt(c.x, c.z)?.name === 'Dinelv Highlands');
  assert.ok(obstacle, 'actual Dinelv scenery has been constructed');
  assert.equal(canStand(obstacle.x, obstacle.z, world), false);
  assert.equal(sampleClimbSurface(world, obstacle.x, obstacle.z).allowed, false, 'climbing does not bypass the actual prop collider');
});
