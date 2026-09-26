import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { sourceModule } from './module-loader.js';
import { createBearFamily, validateBearFamilySnapshot, BEAR_HOME_ROUTE } from '../src/bear-family.js';
import { createKaylaHost } from '../src/kayla-host.js';
import { KAYLA, KAYLA_ROUTE, kaylaMaySwim } from '../src/kayla.js';
import { KAYLA_RACE_LANE } from '../src/kayla-race.js';
import { CUB, CUB_STAND } from '../src/cub-honey-quest.js';
import { canStand, canSwim } from '../src/game-state.js';

const { createWorld } = await sourceModule('../src/world.js');
const actualWorld = createWorld(new THREE.Scene());
actualWorld.setJourneySiteState('bridge-repair', false);
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const actor = () => ({ group: { position: new THREE.Vector3(), rotation: { y: 0 } } });
function fixture(world = actualWorld) {
  let race = false, lesson = false, family, changes = 0;
  const dead = new Set(), guards = { provoked: false, fighting: false }, extras = [];
  const npc = { ...KAYLA, actor: actor() }, cub = { ...CUB, actor: actor() };
  const bodies = () => [{ id: 'kayla', x: npc.actor.group.position.x, z: npc.actor.group.position.z, r: .8 },
    { id: cub.id, x: cub.actor.group.position.x, z: cub.actor.group.position.z, r: .45 }, ...extras];
  const kayla = createKaylaHost({ npc, world, bodies, roaming: () => family?.motherMayRoam ?? false,
    crime: { health: () => ({ hp: 450, maxHp: 450, status: 'alive' }), isDown: id => dead.has(id) },
    combat: { state: { phase: 'peaceful', enemies: [], player: { hp: 100 } } }, playerPosition: () => ({ x: 0, z: 0 }) });
  const readHealth = kayla.state; kayla.state = () => ({ ...readHealth(), ...guards });
  kayla.placeExternal(KAYLA_RACE_LANE.at(-1));
  family = createBearFamily({ world, kayla, cub, bodies, raceComplete: () => race, cubComplete: () => lesson,
    alive: id => !dead.has(id), onChange: () => changes++ });
  return { world, npc, cub, kayla, family, dead, guards, extras, changes: () => changes,
    completeRace() { race = true; }, completeLesson() { lesson = true; },
    step(dt = .1, playing = true) { kayla.frame(dt, { playing }); family.frame(dt, { playing }); },
    reunion() { race = true; for (let i = 0; i < 20000 && ['waiting-race', 'returning'].includes(family.phase); i++) this.step(); },
  };
}
const passable = (p, world, radius) => canStand(p.x, p.z, world, radius)
  || (kaylaMaySwim(p.x, p.z) && canSwim(p.x, p.z, world, radius));
test('Kayla physically travels from the race finish to her cub with the Caloss bridge broken', t => {
  const f = fixture(); f.completeRace(); let distance = 0, swimming = 0, ticks = 0;
  for (; ticks < 20000 && f.family.phase !== 'waiting-cub'; ticks++) {
    const before = { ...f.kayla.model.position }; f.step();
    const moved = gap(before, f.kayla.model.position); distance += moved;
    assert.ok(moved <= .25 + 1e-6, 'the journey never skips forward');
    assert.ok(passable(f.kayla.model.position, f.world, .8), JSON.stringify(f.kayla.model.position));
    if (canSwim(f.kayla.model.position.x, f.kayla.model.position.z, f.world, .8)) swimming++;
    assert.equal(gap(f.cub.actor.group.position, CUB_STAND), 0, 'the cub waits at the river');
  }
  assert.equal(f.family.phase, 'waiting-cub'); assert.ok(swimming > 0);
  assert.ok(gap(f.kayla.model.position, CUB_STAND) < 4); assert.ok(distance > 650);
  assert.equal(f.family.motherMayRoam, false);
  t.diagnostic(`Reunion took ${ticks / 10} seconds over ${distance.toFixed(1)} physical metres.`);
});
test('finishing either quest first keeps the cub in Drent and requires both quests plus the reunion to roam', () => {
  for (const lessonFirst of [true, false]) {
    const f = fixture();
    if (lessonFirst) {
      f.completeLesson(); for (let i = 0; i < 50; i++) f.step();
      assert.equal(f.family.phase, 'waiting-race'); assert.equal(f.family.motherMayRoam, false);
    }
    f.reunion();
    if (!lessonFirst) {
      assert.equal(f.family.phase, 'waiting-cub'); const mother = { ...f.kayla.model.position };
      for (let i = 0; i < 50; i++) f.step(); assert.equal(gap(f.kayla.model.position, mother), 0);
      f.completeLesson(); f.step();
    }
    assert.equal(f.family.phase, 'roaming'); assert.equal(f.family.motherMayRoam, true);
  }
});
test('mother and cub complete the original three-region circuit together using solid bodies and real water', t => {
  const f = fixture(); f.completeLesson(); f.reunion();
  assert.equal(f.family.phase, 'roaming');
  let frames = 0, widest = 0; const regions = new Set();
  for (; frames < 40000 && f.kayla.model.state().loops < 1; frames++) {
    const previousMother = { ...f.kayla.model.position }, previousCub = { ...f.cub.actor.group.position };
    f.step(); const mother = f.kayla.model.position, cub = f.cub.actor.group.position, separation = gap(mother, cub);
    widest = Math.max(widest, separation); regions.add(f.world.regionAt(mother.x, mother.z)?.name);
    assert.ok(gap(previousMother, mother) <= .22 + 1e-6);
    assert.ok(gap(previousCub, cub) <= .31 + 1e-6);
    assert.ok(separation >= 1.25, 'neither animal passes through the other');
    assert.ok(separation < 7.3, 'Kayla waits before leaving her cub behind');
    assert.ok(passable(mother, f.world, .8), `mother collision ${JSON.stringify(mother)}`);
    assert.ok(passable(cub, f.world, .45), `cub collision ${JSON.stringify(cub)}`);
  }
  assert.equal(f.kayla.model.state().loops, 1);
  for (const name of ['Drent', 'Pueth', 'Luscia']) assert.ok(regions.has(name));
  assert.ok(f.kayla.model.state().lizVisits > 0);
  t.diagnostic(`${frames} family updates; greatest separation ${widest.toFixed(2)} metres.`);
});
test('pause and save restoration preserve the reunion route and both exact positions', () => {
  const f = fixture(); f.completeRace(); for (let i = 0; i < 140; i++) f.step();
  const family = f.family.snapshot(), kayla = f.kayla.snapshot();
  for (let i = 0; i < 60; i++) f.step(.1, false);
  assert.deepEqual(f.family.snapshot(), family); assert.deepEqual(f.kayla.snapshot(), kayla);
  const loaded = fixture(); loaded.completeRace(); assert.equal(loaded.kayla.restore(kayla), true);
  assert.equal(loaded.family.restore(family), true); assert.deepEqual(loaded.family.snapshot(), family);
  assert.deepEqual(loaded.kayla.snapshot(), kayla);
  const invalid = { ...family, next: 999 }; assert.equal(loaded.family.restore(invalid), false);
  assert.deepEqual(loaded.family.snapshot(), family); assert.equal(validateBearFamilySnapshot(undefined), true);
  assert.equal(validateBearFamilySnapshot({ ...family, phase: 'roaming', next: 0 }), false);
});
test('a dead, provoked, or fighting mother is never repositioned by the family controller', () => {
  for (const condition of ['dead', 'provoked', 'fighting']) {
    const f = fixture(); f.completeRace(); f.family.frame(.1);
    if (condition === 'dead') f.dead.add('kayla'); else f.guards[condition] = true;
    const position = { ...f.kayla.model.position }, save = f.family.snapshot();
    for (let i = 0; i < 40; i++) f.family.frame(.1);
    assert.equal(gap(f.kayla.model.position, position), 0); assert.deepEqual(f.family.snapshot(), save);
    assert.equal(f.family.motherMayRoam, false);
  }
});
test('returning Kayla respects the traveler body even when already close', () => {
  const world = { bounds: { minX: -5000, maxX: 5000, minZ: -5000, maxZ: 5000 }, colliders: [],
    heightAt: () => 2, waterAt: () => 0, npcPositions: {} };
  const f = fixture(world); f.completeRace();
  // Stand directly across the line to the first route point, barely separated.
  f.kayla.placeExternal({ x: BEAR_HOME_ROUTE[0].x - 3, z: BEAR_HOME_ROUTE[0].z });
  const traveler = { id: 'traveler', x: f.kayla.model.position.x + 1.15, z: f.kayla.model.position.z, r: .34 };
  f.extras.push(traveler);
  for (let i = 0; i < 30; i++) {
    f.family.frame(.1);
    assert.ok(gap(f.kayla.model.position, traveler) >= 1.14 - 1e-8, 'a close traveler remains solid');
  }
  assert.ok(f.kayla.model.position.z !== traveler.z, 'she physically walks around instead of through the traveler');
});
