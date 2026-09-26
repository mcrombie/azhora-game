import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { canStand } from '../src/game-state.js';
import { createKaylaRace, KAYLA_RACE, KAYLA_RACE_LANE, ED_RACE_LANE } from '../src/kayla-race.js';
import { createKaylaRaceHost } from '../src/kayla-race-host.js';
import { createKaylaRaceAutopilot } from '../src/kayla-race-autopilot.js';
import { CAGNEY_START } from '../src/cagney-quest.js';

const { createWorld } = await sourceModule('../src/world.js');
const world = createWorld(new THREE.Scene());
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
test('the race lanes run on the real dry road from the east gate to Cagney and the prophet', () => {
  for (const [route, radius] of [[KAYLA_RACE_LANE, KAYLA_RACE.radius], [ED_RACE_LANE, KAYLA_RACE.edRadius]]) {
    for (let i = 0; i < route.length; i++) {
      const a = route[Math.max(0, i - 1)], b = route[i], count = Math.max(1, Math.ceil(gap(a, b) / .5));
      for (let j = 0; j <= count; j++) {
        const x = a.x + (b.x - a.x) * j / count, z = a.z + (b.z - a.z) * j / count;
        assert.ok(canStand(x, z, world, radius), `blocked race lane at ${x}, ${z}, radius ${radius}`);
      }
    }
  }
  assert.ok(gap(KAYLA_RACE_LANE.at(-1), CAGNEY_START) < 20);
});
test('real-world race autoplay wins without clipping props, skipping gates, or moving Ed by teleport', t => {
  const quest = createKaylaRace(), host = createKaylaRaceHost({ quest, world }); quest.accept();
  const pilot = createKaylaRaceAutopilot({ world, read: () => ({ quest: quest.state(), position: quest.position, mode: 'playing' }) });
  pilot.start();
  let ticks = 0, cameraYaw = 2;
  for (; ticks < 1800 && quest.mounted; ticks++) {
    const before = { ...quest.position }, edBefore = { ...quest.edPosition }, command = pilot.step(.1);
    cameraYaw += Math.atan2(Math.sin((command?.yaw ?? cameraYaw) - cameraYaw), Math.cos((command?.yaw ?? cameraYaw) - cameraYaw)) * .12;
    const move = command?.move ?? { forward: 0, side: 0 }, yaw = move.basisYaw ?? cameraYaw;
    if (quest.state().stage === 'racing') assert.equal(move.basisYaw, command.yaw, 'movement uses its intended basis while the camera catches up');
    host.tick(.1, { input: { dx: -Math.sin(yaw) * move.forward + Math.cos(yaw) * move.side,
      dz: -Math.cos(yaw) * move.forward - Math.sin(yaw) * move.side, run: move.run } });
    assert.ok(gap(before, quest.position) <= KAYLA_RACE.speed * .1 + 1e-6);
    assert.ok(gap(edBefore, quest.edPosition) <= KAYLA_RACE.edSpeed * .1 + 1e-6);
    assert.ok(canStand(quest.position.x, quest.position.z, world, KAYLA_RACE.radius));
    assert.ok(canStand(quest.edPosition.x, quest.edPosition.z, world, KAYLA_RACE.edRadius));
    assert.ok(gap(quest.position, quest.edPosition) >= KAYLA_RACE.radius + KAYLA_RACE.edRadius,
      'Ed and the bear keep separate physical bodies throughout overtaking');
  }
  assert.equal(quest.state().stage, 'won', JSON.stringify(quest.state()));
  assert.equal(quest.position.next, KAYLA_RACE_LANE.length);
  t.diagnostic(`The input-only rider won in ${quest.state().elapsed.toFixed(1)} seconds after ${ticks} updates.`);
});
test('both racers physically return along the real road for a retry after Ed wins', () => {
  const quest = createKaylaRace(), host = createKaylaRaceHost({ quest, world }); quest.accept();
  for (let i = 0; i < 2000 && quest.mounted; i++) host.tick(.1);
  assert.equal(quest.state().stage, 'lost'); const finish = { ...quest.edPosition }; quest.retry();
  assert.equal(gap(finish, quest.edPosition), 0);
  for (let i = 0; i < 1800 && quest.state().stage === 'returning'; i++) {
    host.tick(.1);
    assert.ok(canStand(quest.position.x, quest.position.z, world, KAYLA_RACE.radius));
    assert.ok(canStand(quest.edPosition.x, quest.edPosition.z, world, KAYLA_RACE.edRadius));
  }
  assert.equal(quest.state().stage, 'countdown');
  assert.ok(gap(quest.position, KAYLA_RACE_LANE[0]) < .3);
  assert.ok(gap(quest.edPosition, ED_RACE_LANE[0]) < .3);
});
