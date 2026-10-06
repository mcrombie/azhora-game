import test from 'node:test';
import assert from 'node:assert/strict';
import { TERRAIN_FALL, shouldStartTerrainFall, terrainFallDamage, createTerrainFall } from '../src/gameplay/movement/terrain-fall.js';

const before = { x: 0, y: 20, z: 0 };
test('a running jump clears a waist-high obstacle without losing sprint momentum',()=>{
  for(const dt of [1/30,1/60,1/144]){
    const fall=createTerrainFall(),p={x:0,y:0,z:0};let peak=0,blocked=false;
    fall.begin(p,{velocity:TERRAIN_FALL.jumpVelocity,drift:{x:9.5,z:0}});
    for(let i=0;i<2/dt&&fall.active;i++){
      fall.tick(dt,{position:p,surfaceAt:()=>({height:0,slope:0,water:false}),moveHorizontal:(at,dx)=>{
        if(at.x+dx>=3&&at.x+dx<=3.5&&at.y<1.2){blocked=true;return;}at.x+=dx;
      }});peak=Math.max(peak,p.y);
    }
    assert.equal(blocked,false);assert.ok(peak>1.5&&peak<1.8);assert.ok(p.x>7);assert.equal(p.y,0);
  }
});
test('walking over a ledge starts a fall while small steps and ordinary slopes retain support', () => {
  assert.equal(shouldStartTerrainFall({ before, after: { x: .12, z: 0 }, floor: 5 }), true);
  assert.equal(shouldStartTerrainFall({ before, after: { x: .4, z: 0 }, floor: 19.7 }), false);
  assert.equal(shouldStartTerrainFall({ before, after: { x: .12, z: 0 }, floor: 19.97 }), false);
  assert.equal(shouldStartTerrainFall({ before, after: { x: .12, z: 0 }, floor: 20.05 }), false);
});

test('small frame steps still fall down a steep hill instead of walking down it', () => {
  for (const dt of [1 / 30, 1 / 60, 1 / 144, 1 / 240]) {
    const step = dt * 4;
    assert.equal(shouldStartTerrainFall({ before, after: { x: step, z: 0 }, floor: before.y - step * 1.2 }), true);
  }
  assert.equal(shouldStartTerrainFall({ before, after: { x: .1, z: 0 }, floor: 19.98, groundSlope: 1.4 }), true,
    'diagonally descending a cliff does not evade losing support');
  assert.equal(shouldStartTerrainFall({ before, after: before, floor: 20 }), false);
});

test('fall damage uses the whole drop, leaves short drops safe, and is capped at player health', () => {
  assert.equal(terrainFallDamage(0), 0);
  assert.equal(terrainFallDamage(TERRAIN_FALL.safeDrop), 0);
  assert.equal(terrainFallDamage(7.5), 20);
  assert.equal(terrainFallDamage(100), 100);
  assert.equal(terrainFallDamage(100, { water: true }), 0);
  assert.equal(terrainFallDamage(Number.NaN), 0);
});

test('ordinary fall checks reject malformed positions', () => {
  assert.equal(shouldStartTerrainFall({ before: null, after: {}, floor: 0 }), false);
  assert.equal(shouldStartTerrainFall({ before, after: { x: NaN, z: 0 }, floor: 0 }), false);
});

const flat = (height = 0, water = false) => () => ({ height, slope: 0, gradient: { x: 0, z: 0 }, water });
function finish(fall, position, surfaceAt, options = {}) {
  let result, totalDamage = 0;
  for (let i = 0; i < 1200 && fall.active; i++) {
    result = fall.tick(1 / 60, { position, surfaceAt, ...options });
    totalDamage += result.damage;
  }
  assert.equal(fall.active, false, 'the fall reaches a foothold');
  return { ...result, totalDamage };
}

test('an ordinary ledge fall preserves height at first and awards damage exactly once on landing', () => {
  const fall = createTerrainFall(), position = { x: 0, y: 20, z: 0 };
  fall.begin(position, { drift: { x: 3, z: 0 } });
  const first = fall.tick(1 / 60, { position, surfaceAt: flat() });
  assert.equal(first.active, true); assert.equal(first.damage, 0);
  assert.ok(position.y > 19.9 && position.y < 20, 'gravity, not ground snapping');
  assert.ok(position.x > 0 && position.x < .1, 'carried walking momentum');
  const result = finish(fall, position, flat());
  assert.equal(position.y, 0); assert.equal(result.landed, true);
  assert.equal(result.totalDamage, terrainFallDamage(20));
  assert.equal(fall.tick(1 / 60).damage, 0);
});

test('ordinary jumping keeps its launch velocity and lands harmlessly on the same ground', () => {
  const fall = createTerrainFall(), position = { x: 0, y: 10, z: 0 };
  fall.begin(position, { velocity: 6.3 });
  fall.tick(.1, { position, surfaceAt: flat(10) });
  assert.ok(position.y > 10.45); assert.ok(fall.view().velocity > 4);
  assert.equal(finish(fall, position, flat(10)).totalDamage, 0);
  assert.equal(position.y, 10);
});

test('steep contacts keep slipping until a stable foothold and retain the full fall height', () => {
  const slope = (_x, z) => ({ height: Math.max(0, 20 - z * 2), slope: z < 10 ? 2 : 0,
    gradient: { x: 0, z: z < 10 ? -1 : 0 } });
  const fall = createTerrainFall(), position = { x: 0, y: 18, z: 1 };
  fall.begin(position, { drift: { x: 0, z: .3 } });
  const result = finish(fall, position, slope);
  assert.ok(position.z >= 10); assert.equal(position.y, 0);
  assert.equal(result.totalDamage, terrainFallDamage(18));
  assert.ok(result.elapsed > .5, 'the character travels down the face physically');
});

test('water cushions the landing and collision callbacks keep drifting feet out of walls', () => {
  const fall = createTerrainFall(), position = { x: 0, y: 30, z: 0 };
  fall.begin(position, { drift: { x: 100, z: 0 } });
  assert.equal(fall.view().drift.x, TERRAIN_FALL.maxDriftSpeed);
  const result = finish(fall, position, flat(1, true), {
    moveHorizontal(p, dx, dz) { p.x = Math.min(1, p.x + dx); p.z += dz; },
  });
  assert.equal(position.x, 1); assert.equal(position.y, 1); assert.equal(result.totalDamage, 0);
});

test('pause freezes a fall, steering is limited, and cancel clears all momentum', () => {
  const fall = createTerrainFall(), position = { x: 0, y: 100, z: 0 };
  fall.begin(position, { drift: { x: 0, z: 2 } });
  const before = fall.view();
  assert.deepEqual(fall.tick(.2, { position, playing: false }), before);
  assert.deepEqual(position, { x: 0, y: 100, z: 0 });
  fall.tick(.1, { position, surfaceAt: flat(), steer: { x: 1, z: 0 } });
  assert.ok(fall.view().drift.x > .75 && fall.view().drift.x < .85);
  assert.equal(fall.view().drift.z, 2);
  fall.cancel(); assert.equal(fall.active, false); assert.deepEqual(fall.view().drift, { x: 0, z: 0 });
});
