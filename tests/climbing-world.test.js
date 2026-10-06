import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { scopedWorld } from './scoped-world.js';
import { createClimbing, sampleClimbSurface, climbSurfaceClear, canWalkSlope } from '../src/gameplay/movement/climbing.js';
import { canStand } from '../src/gameplay/movement/game-state.js';
import { closedRegionEntered } from '../src/world/travel/closed-border.js';
import { hexOwnerAt } from '../src/world/terrain/region-world.js';
import { SUVAL_HIGHLAND_TRAILS, SUVAL_PEAK_CRAGS } from '../src/content/regions/suval-highlands/suval-highlands.js';
import { SUVAL_RIDGE_COLLIDERS, SUVAL_HILL_PASSES, hillPassPoint } from '../src/content/regions/minora-frontier/frontier-ridges.js';
import { catieCaveRoute } from '../src/gameplay/autoplay/catie-autopilot.js';
import { KATY_STAND } from '../src/content/quests/roadside/katy.js';

const world = await scopedWorld(new THREE.Scene(), [2, 4, 5, 18]);
world.canClimbMove = (from, to) => !closedRegionEntered(from, to);
const point = (x, z) => ({ x, z, y: world.heightAt(x, z) });
const WEST_LEDGE = point(-501.981207, 610.925240);
const SOUTH_LEDGE = point(-321.711436, 1010.879388);
const WEST_FACE = point(-517.273331, 677.280100);
const heading = p => sampleClimbSurface(world, p.x, p.z).yaw;

function exercise(start, { stamina = 100, until = 40, releaseAt = Infinity } = {}) {
  const events = [], climb = createClimbing({ world, onEvent: event => events.push(event) });
  assert.ok(canStand(start.x, start.z, world), 'the approach has ordinary standing room');
  assert.ok(climb.grab(start, heading(start), { stamina }));
  const frames = []; let spent = 0, damage = 0, xp = 0, highest = start.y;
  for (let time = 0; time < until && climb.active; time += 1 / 30) {
    if (time >= releaseAt && climb.view().phase === 'climbing') climb.release();
    const state = climb.tick(1 / 30, { playing: true, up: 1, stamina, level: 1 });
    stamina = Math.max(0, stamina - state.staminaSpent); spent += state.staminaSpent;
    damage += state.damage; xp += state.xp; highest = Math.max(highest, state.position.y);
    assert.notEqual(hexOwnerAt(state.position.x, state.position.z), 'East Suval');
    assert.ok(climbSurfaceClear(world, state.position.x, state.position.z), 'movement respects real scenery');
    frames.push(state);
  }
  return { climb, events, frames, spent, damage, xp, highest };
}

test('a beginner can grip and crest actual short ledges beside both West and South Suval trails', () => {
  for (const start of [WEST_LEDGE, SOUTH_LEDGE]) {
    const result = exercise(start);
    assert.equal(result.climb.view().phase, 'idle');
    assert.ok(result.events.some(event => event.type === 'crested'));
    assert.ok(result.highest > start.y + .6, 'the traveler climbs the actual raised terrain');
    assert.ok(result.spent > 0 && result.spent < 20, 'a short introduction leaves stamina for exploration');
    assert.ok(result.xp > 0); assert.equal(result.damage, 0);
    const end = result.climb.view().position;
    assert.ok(canStand(end.x, end.z, world), 'the crest has clear footing');
    assert.ok(Math.abs(end.y - world.heightAt(end.x, end.z)) < .001);
  }
});

test('the tall western face exhausts a beginner and slides back to real clear footing with fall damage', () => {
  const result = exercise(WEST_FACE, { until: 55 });
  assert.ok(result.events.some(event => event.type === 'exhausted'));
  assert.ok(result.frames.some(frame => frame.phase === 'falling'));
  assert.ok(result.highest > WEST_FACE.y + 12, 'the stamina loss follows a substantial real climb');
  assert.equal(result.climb.view().phase, 'idle');
  assert.ok(result.damage > 0, 'falling far down the face has a consequence');
  assert.ok(result.spent <= 100.001);
  const end = result.climb.view().position;
  assert.ok(canStand(end.x, end.z, world));
  assert.ok(end.y < result.highest - 3.5);
});

test('letting go on the real western slope descends without teleporting through the hillside', () => {
  const result = exercise(WEST_FACE, { until: 35, releaseAt: 5 });
  assert.ok(result.events.some(event => event.type === 'released'));
  assert.equal(result.climb.view().phase, 'idle');
  for (let i = 1; i < result.frames.length; i++) {
    const a = result.frames[i - 1].position, b = result.frames[i].position;
    assert.ok(Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) < 1,
      'each rendered frame is a continuous slide, rather than a reset to the approach');
    assert.ok(b.y >= world.heightAt(b.x, b.z) - .001);
  }
});

test('slope checks preserve every authored Suval switchback while refusing an uphill walk through a climbing face', () => {
  for (const trail of SUVAL_HIGHLAND_TRAILS) for (let i = 1; i < trail.points.length; i++) {
    const a = trail.points[i - 1], b = trail.points[i], n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / .18);
    let previous = a;
    for (let j = 1; j <= n; j++) {
      const p = { x: a.x + (b.x - a.x) * j / n, z: a.z + (b.z - a.z) * j / n };
      assert.ok(canWalkSlope(previous.x, previous.z, p.x, p.z, world), `${trail.id} must stay walkable`);
      previous = p;
    }
  }
  const yaw = heading(WEST_FACE);
  assert.equal(canWalkSlope(WEST_FACE.x, WEST_FACE.z,
    WEST_FACE.x + Math.sin(yaw) * .18, WEST_FACE.z + Math.cos(yaw) * .18, world), false);
});

test('Catie can still reach the cave on foot along the complete autoplay route without learning climbing first', () => {
  const route = catieCaveRoute(world, { x: KATY_STAND.x, z: KATY_STAND.z + 2 });
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1], b = route[i], n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / .18);
    let previous = a;
    for (let j = 1; j <= n; j++) {
      const p = { x: a.x + (b.x - a.x) * j / n, z: a.z + (b.z - a.z) * j / n };
      assert.ok(canWalkSlope(previous.x, previous.z, p.x, p.z, world),
        `the existing quest road requires an unintended climb at ${p.x},${p.z}`);
      previous = p;
    }
  }
});

test('only terrain bedrock becomes climbable; frontier ridges, false passages, buildings and the cave remain solid', () => {
  const faces = SUVAL_PEAK_CRAGS.filter(rock => climbSurfaceClear(world, rock.x, rock.z));
  assert.ok(faces.length > 40, 'many exposed rock faces genuinely become accessible');
  for (const face of faces) assert.equal(canStand(face.x, face.z, world), false);
  for (const collider of SUVAL_RIDGE_COLLIDERS) {
    assert.equal(climbSurfaceClear(world, collider.x, collider.z), false, collider.kind);
  }
  for (const kind of ['suval-pass-rock', 'bat-cave-wall', 'imlamdris-rebuild', 'solis-building', 'solis-wall']) {
    const colliders = world.colliders.filter(collider => collider.kind === kind);
    assert.ok(colliders.length, `${kind} exists in the actual world`);
    for (const collider of colliders) assert.equal(climbSurfaceClear(world, collider.x, collider.z), false, kind);
  }
  for (const gate of SUVAL_HILL_PASSES) {
    const outside = hillPassPoint(gate, 0, -2), inside = hillPassPoint(gate, 0, 2);
    assert.equal(closedRegionEntered(outside, inside), 'East Suval');
    const climb = createClimbing({ world });
    assert.equal(climb.probe(point(outside.x, outside.z), Math.atan2(gate.inward.x, gate.inward.z)).available, false);
  }
});
