import test from 'node:test';
import assert from 'node:assert/strict';
import { createForestArrows, forestBodyHit } from '../src/gameplay/combat/forest-arrows.js';
import { createColliderGrid } from '../src/world/collision/collider-grid.js';

const point = (x, y = 1.3, z = 0) => ({ x, y, z });
const body = (id, x, options = {}) => ({ id, ...point(x, 0), hp: 100, r: .3, minY: 0, maxY: 1.9, ...options });
const shot = { rangerId: 'ranger', origin: point(0), target: point(20), damage: 70 };
function fixture({ colliders = [], bodies = [], ground = () => 0, walkSurfaces = [] } = {}) {
  const grid = createColliderGrid(colliders), hits = [], impacts = [];
  const arrows = createForestArrows({ world: { heightAt: ground, nearColliders: grid.near, walkSurfaces },
    getBodies: () => bodies, onHit: (victim, arrow) => hits.push({ victim, arrow }), onImpact: impact => impacts.push(impact) });
  return { arrows, hits, impacts };
}

test('ranger shafts hit thin physical cover before a body behind it in one fast frame', () => {
  const trunk = { x: 2.137, z: 0, r: .005, kind: 'tree' }, target = body('traveler', 4);
  const f = fixture({ colliders: [trunk], bodies: [target] });
  assert.equal(f.arrows.fire(shot), true); f.arrows.update(.1);
  assert.equal(f.hits.length, 0); assert.equal(f.arrows.state().length, 0);
  assert.equal(f.impacts.length, 1); assert.equal(f.impacts[0].collider, trunk);
  assert.ok(Math.abs(f.impacts[0].x - (trunk.x - .065)) < 1e-7);
});

test('the closest swept body wins before distant cover regardless of roster order', () => {
  const near = body('friend', 2), far = body('traveler', 4);
  const f = fixture({ colliders: [{ x: 5, z: 0, hx: .05, hz: 3, kind: 'wall' }], bodies: [far, near] });
  f.arrows.fire(shot); f.arrows.update(.1); f.arrows.update(.1);
  assert.equal(f.hits.length, 1); assert.equal(f.hits[0].victim, near);
  assert.equal(f.hits[0].arrow.owner, 'ranger'); assert.equal(f.hits[0].arrow.damage, 70);
  assert.equal(f.impacts[0].body, near); assert.equal(f.arrows.state().length, 0);
});

test('swept body hits respect elevation, descending shots, tangency and segment endpoints', () => {
  const platform = body('platform-ranger', 3, { y: 8, minY: 8, maxY: 9.9 });
  assert.equal(forestBodyHit(point(0), point(6), platform), null);
  assert.equal(forestBodyHit(point(3, 12), point(3, 4), platform)?.body, platform);
  const target = body('traveler', 3);
  assert.equal(forestBodyHit(point(0, 1.3, .36), point(6, 1.3, .36), target)?.body, target);
  assert.equal(forestBodyHit(point(0), point(2.64), target)?.t, 1);
  assert.equal(forestBodyHit(point(3), point(3), target)?.t, 0);
  assert.equal(forestBodyHit(point(3, 4), point(3, 4), target), null);
});

test('the firing ranger and unavailable bodies do not swallow their own arrows', () => {
  const target = body('traveler', 4);
  const f = fixture({ bodies: [body('ranger', 0), body('fallen', 1, { hp: 0 }),
    body('hidden', 2, { active: false }), body('dead', 3, { dead: true }), target] });
  f.arrows.fire(shot); f.arrows.update(.1);
  assert.equal(f.hits[0]?.victim, target);
});

test('arrows remain aimed where they were released and pause without moving or harming anyone', () => {
  const target = body('traveler', 4), f = fixture({ bodies: [target] });
  f.arrows.fire(shot); const before = f.arrows.state();
  f.arrows.update(1, { paused: true }); assert.deepEqual(f.arrows.state(), before); assert.equal(f.hits.length, 0);
  target.z = 4; f.arrows.update(.1);
  assert.equal(f.hits.length, 0); assert.equal(f.arrows.state()[0].z, 0);
  const copy = f.arrows.state(); copy[0].x = 999; copy[0].origin.y = -99;
  assert.notEqual(f.arrows.state()[0].x, 999); assert.equal(f.arrows.state()[0].origin.y, 1.3);
  f.arrows.clear(); assert.equal(f.arrows.state().length, 0);
});

test('terrain and canopy floors stop descending ranger arrows without becoming infinite columns', () => {
  const floor = { id: 'deck', kind: 'deck', a: point(2, 4), b: point(8, 4), width: 3 };
  const elevated = fixture({ walkSurfaces: [floor], bodies: [body('traveler', 4)] });
  elevated.arrows.fire({ ...shot, origin: point(4, 7), target: point(4, 0) }); elevated.arrows.update(.1);
  assert.equal(elevated.hits.length, 0); assert.equal(elevated.impacts[0].kind, 'walk-surface');
  const underneath = fixture({ walkSurfaces: [floor], bodies: [body('traveler', 4)] });
  underneath.arrows.fire(shot); underneath.arrows.update(.1); assert.equal(underneath.hits.length, 1);
  const terrain = fixture({ ground: x => x > 2.1 ? 3 : 0, bodies: [body('traveler', 4)] });
  terrain.arrows.fire(shot); terrain.arrows.update(.1);
  assert.equal(terrain.hits.length, 0); assert.equal(terrain.impacts[0].kind, 'terrain');
});

test('spent arrows expire and malformed or zero-length shots cannot enter the simulation', () => {
  const f = fixture();
  assert.equal(f.arrows.fire({ ...shot, target: { x: NaN, y: 1, z: 0 } }), false);
  assert.equal(f.arrows.fire({ ...shot, target: { ...shot.origin } }), false);
  f.arrows.fire(shot);
  for (let i = 0; i < 20; i++) f.arrows.update(.1);
  assert.equal(f.arrows.state().length, 0); assert.equal(f.hits.length, 0);
});
