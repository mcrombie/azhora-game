import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { WALL_DAMAGE, WALL_STATES, wallStateAt, towerState, buildingState, SUN_HORSE_GATE, RUINED_BUILDINGS, BUILDING_DAMAGE, SACK_MEMORIES, sackRefersToPlan } from '../src/solis-sack.js';
import { SOLIS_BUILDINGS, SOLIS_FACES, SOLIS_GATES, FORT, facePoint, fortColliders, wallRuns } from '../src/west-suval.js';
import { SOLIS_TOWNSFOLK_IDS, townsfolkLines } from '../src/solis-town.js';
import { solisPoint } from '../src/region-world.js';

test('the sack names only walls, towers and houses Solis has', () => {
  assert.ok(sackRefersToPlan());
  for (const entry of WALL_DAMAGE) assert.ok(WALL_STATES.includes(entry.state) && entry.from < entry.to, `${entry.face} ${entry.from}..${entry.to}`);
});

test('the walls are only partly repaired: new stone by the gate, old burnt stone, scaffolding, and breaches shut with palisades', () => {
  const states = new Set(WALL_DAMAGE.map(entry => entry.state));
  for (const state of ['repaired', 'scorched', 'scaffold', 'breach']) assert.ok(states.has(state), `somewhere the wall is ${state}`);
  // The Empire mended the Gate of Sun Horses and the wall either side of it first.
  const gate = SOLIS_GATES.find(g => g.id === 'sun-horses');
  for (const side of [-1, 1]) assert.equal(wallStateAt('north', gate.along + side * 10), 'repaired');
  assert.equal(towerState('sun-horses-left'), 'rebuilt'); assert.equal(towerState('sun-horses-right'), 'rebuilt');
  assert.ok(SUN_HORSE_GATE.rebuilt && SUN_HORSE_GATE.standing.length === 1, 'one bronze horse is still up');
  // No face came through whole, and at most half of any face was put right.
  for (const face of Object.keys(SOLIS_FACES)) {
    const runs = wallRuns(face), total = runs.reduce((sum, [from, to]) => sum + to - from, 0);
    const damaged = WALL_DAMAGE.filter(entry => entry.face === face && entry.state !== 'repaired').reduce((sum, entry) => sum + entry.to - entry.from, 0);
    const mended = WALL_DAMAGE.filter(entry => entry.face === face && entry.state === 'repaired').reduce((sum, entry) => sum + entry.to - entry.from, 0);
    assert.ok(damaged > 0, `the ${face} face shows the sack`);
    assert.ok(mended <= total / 2, `no more than half the ${face} face is mended`);
  }
});

test('a breach is shut by its palisade: the wall line is still solid there, and the gates are still the only way in', () => {
  const walls = fortColliders().filter(c => c.kind === 'solis-wall');
  const inside = (p, c) => Math.abs(p.x - c.x) <= c.hx + 1e-6 && Math.abs(p.z - c.z) <= c.hz + 1e-6;
  for (const entry of WALL_DAMAGE.filter(e => e.state === 'breach')) {
    for (const u of [.1, .5, .9]) {
      const along = entry.from + (entry.to - entry.from) * u, spot = facePoint(entry.face, along), p = solisPoint(spot.a, spot.b);
      assert.ok(walls.some(c => inside(p, c)), `the ${entry.face} breach is closed at ${along.toFixed(1)}`);
    }
  }
  assert.equal(FORT.gateWidth > 0, true);
});

test('half the houses are ruins, and nobody the story needs lives in one', () => {
  assert.ok(RUINED_BUILDINGS.length >= SOLIS_BUILDINGS.length / 3, `${RUINED_BUILDINGS.length} of ${SOLIS_BUILDINGS.length} houses are ruins`);
  const touched = Object.keys(BUILDING_DAMAGE).length;
  assert.ok(touched >= SOLIS_BUILDINGS.length * .75, 'most of the city shows the fire, ruined or rebuilt');
  for (const id of ['tax-house', 'legion-barracks', 'inn', 'wine-attic', 'temple', 'guest-house', 'counting-house']) assert.ok(!RUINED_BUILDINGS.includes(id), `${id} is standing`);
  assert.equal(buildingState('temple'), 'sound', 'the temple was spared, and nobody knows why');
});

test('every one of the townsfolk remembers the fire, whoever holds the gate', () => {
  for (const id of SOLIS_TOWNSFOLK_IDS) {
    assert.ok(SACK_MEMORIES[id], `${id} has a memory of the sack`);
    for (const holder of ['coalition', 'empire', 'routed']) {
      const lines = townsfolkLines(id, holder);
      assert.equal(lines.at(-1), SACK_MEMORIES[id], `${id} ends on the fire under ${holder}`);
    }
  }
  assert.doesNotMatch(Object.values(SACK_MEMORIES).join(' '), /thirty years/);
  assert.doesNotMatch(townsfolkLines('solis-innkeeper', 'empire').join(' '), /thirty years/, 'the Empire has held Solis three years, since the sack');
});

test('the scenery builds the ruins it was given', async () => {
  const { createWorld } = await sourceModule('../src/world.js');
  const world = createWorld(new THREE.Scene());
  assert.equal(world.westSuvalMetrics.ruins, RUINED_BUILDINGS.length);
  assert.ok(world.westSuvalMetrics.buildings >= 18, 'every house is still built, ruined or not');
});
