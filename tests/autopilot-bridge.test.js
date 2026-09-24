import test from 'node:test';
import assert from 'node:assert/strict';
import { planGoal } from '../src/autopilot.js';
import { QUEST_DONE } from '../src/game-state.js';
import { CALOSS, MAIN_ROAD, calossDistance, journeySites, regionNpcPositions } from '../src/region-world.js';
import { CatmullRomCurve3, Vector3 } from '../vendor/three.module.js';

const state = (position, bridge = 'offered') => ({ mode: 'playing', questStage: QUEST_DONE, position,
  combat: { phase: 'peaceful', action: 'idle', hp: 100 }, weapon: { usable: true }, inventory: { sticks: 3 },
  journey: { started: true, stage: 'deliver-report', complete: false, bridge, destinationIds: ['relay-clerk'] } });

test('a traveler who already swam across continues to Iven without being sent back to the optional bridge', () => {
  const world = { bounds: { minX: -50, maxX: 50, minZ: -150, maxZ: 150 }, colliders: [],
    heightAt: (x, z) => Math.abs(z) < 7.4 ? -1 : 1.5,
    paths: [[{ x: 0, z: 100 }, { x: 0, z: 0 }, { x: 0, z: -100 }]],
    journeySites: { 'bridge-repair': { x: 0, z: 0 } },
    npcPositions: { 'crossing-keeper': { x: 5, z: 20 }, 'relay-clerk': { x: 3, z: -90 } } };
  for (const bridge of ['offered', 'accepted', 'repaired']) {
    const before = state({ x: 8, z: -20 }, bridge), saved = structuredClone(before);
    assert.equal(planGoal(before, world).npcId, 'relay-clerk', `${bridge}: the crossing is already behind the traveler`);
    assert.deepEqual(before, saved, 'Skipping an unnecessary detour must not complete or discard the optional quest');
  }
  assert.equal(planGoal(state({ x: 8, z: 20 }), world).npcId, 'crossing-keeper', 'The near bank still needs a dry crossing');
  assert.equal(planGoal(state({ x: 8, z: 20 }, 'accepted'), world).siteId, 'bridge-repair');
  assert.equal(planGoal(state({ x: 8, z: -3 }), world).npcId, 'crossing-keeper', 'Being in the river is not safely across');
});

test('the authored Caloss road distinguishes the Drent bank from the road already leading to Nothom', () => {
  const curve = new CatmullRomCurve3(MAIN_ROAD.map(point => new Vector3(point.x, 0, point.z)), false, 'centripetal');
  const walkingRoad = curve.getPoints(Math.max(2, Math.ceil(curve.getLength() / 6))).map(point => ({ x: point.x, z: point.z }));
  const world = { bounds: { minX: -10000, maxX: 10000, minZ: -10000, maxZ: 10000 }, colliders: [],
    heightAt: (x, z) => calossDistance(x, z) > CALOSS.halfWidth ? 1.5 : -1,
    journeySites, npcPositions: regionNpcPositions };
  for (const road of [MAIN_ROAD, walkingRoad]) {
    world.paths = [road];
    assert.equal(planGoal(state(regionNpcPositions['crossing-keeper']), world).npcId, 'crossing-keeper');
    for (const position of [regionNpcPositions['ridge-keeper'], regionNpcPositions['relay-clerk']]) {
      assert.equal(planGoal(state(position), world).npcId, 'relay-clerk');
    }
  }
});
