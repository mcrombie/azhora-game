import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { createCatieAutopilot, catieCaveRoute } from '../src/gameplay/autoplay/catie-autopilot.js';
import { canStand, moveCharacter } from '../src/gameplay/movement/game-state.js';
import { hexOwnerAt } from '../src/world/terrain/region-world.js';
import { BAT_CAVE, SUVAL_HIGHLAND_TRAILS } from '../src/content/regions/suval-highlands/suval-highlands.js';
import { KATY_STAND } from '../src/content/quests/roadside/katy.js';
const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());
const start = { x: KATY_STAND.x, z: KATY_STAND.z + 2 };
const route = catieCaveRoute(world, start);
test('Catie follows connected roads outside the locked East frontier and every hollow ridge switchback', () => {
  assert.ok(route.length > 30);
  for (const p of SUVAL_HIGHLAND_TRAILS.find(t => t.id === 'hollow-ridge-path').points) {
    assert.ok(route.some(r => r.x === p.x && r.z === p.z));
  }
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1], b = route[i], n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / .5);
    for (let j = 0; j <= n; j++) {
      const x = a.x + (b.x - a.x) * j / n, z = a.z + (b.z - a.z) * j / n;
      assert.notEqual(hexOwnerAt(x, z), 'East Suval', `locked frontier at ${x},${z}`);
      assert.ok(canStand(x, z, world, .34), `route blocked at ${x},${z}`);
    }
  }
});
test('ordinary Catie autoplay movement reaches the cave in the actual built world without warping', () => {
  const s = { mode: 'playing', position: { ...start }, quest: { stage: 'searching' }, combat: { phase: 'peaceful', hp: 100 },
    batman: { ...BAT_CAVE.perch, available: true }, interaction: {} };
  let reached = false, travelled = 0;
  const pilot = createCatieAutopilot({ world, read: () => s, act: { interact() { reached = true; } } }); pilot.start();
  const dt = 1 / 30;
  for (let i = 0; i < 24000 && !reached; i++) {
    if (Math.hypot(s.position.x - BAT_CAVE.perch.x, s.position.z - BAT_CAVE.perch.z) < 2.8) s.interaction = { npcId: 'batman' };
    const out = pilot.step(dt); assert.ok(pilot.active, `${pilot.stopReason} at ${JSON.stringify(s.position)}`);
    const { forward, side, run, basisYaw = out.yaw ?? 0 } = out.move, speed = run ? 7.2 : 4.2;
    const dx = (-Math.sin(basisYaw) * forward + Math.cos(basisYaw) * side) * speed * dt;
    const dz = (-Math.cos(basisYaw) * forward - Math.sin(basisYaw) * side) * speed * dt;
    const before = { ...s.position }; moveCharacter(s.position, dx, dz, world, .34);
    travelled += Math.hypot(s.position.x - before.x, s.position.z - before.z);
    assert.notEqual(hexOwnerAt(s.position.x, s.position.z), 'East Suval');
  }
  assert.ok(reached, `did not reach the cave: ${JSON.stringify(s.position)}`);
  assert.ok(travelled > 1000, `route was shortened to ${travelled}`);
});
