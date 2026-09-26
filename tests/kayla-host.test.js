import test from 'node:test';
import assert from 'node:assert/strict';
import { createKaylaHost, KAYLA_FIGHT } from '../src/kayla-host.js';
import { KAYLA, KAYLA_START, KAYLA_ROUTE, KAYLA_RIVER_CROSSING, KAYLA_RADIUS, KAYLA_SPEED } from '../src/kayla.js';
import { canStand } from '../src/game-state.js';
import { groundWithRiver, calossSurface } from '../src/world-terrain.js';
import { createCombat } from '../src/combat.js';
import { createCrimeHost } from '../src/crime-host.js';
import { createInventoryState } from '../src/inventory.js';

const vector = (x, z) => ({ x, y: 2, z, set(x, y, z) { Object.assign(this, { x, y, z }); } });
function fixture(terrain = {}) {
  const world = { bounds: { minX: -5000, maxX: 5000, minZ: -5000, maxZ: 5000 },
    colliders: [], heightAt: () => 2, waterAt: () => 0, npcPositions: {}, spawn: KAYLA_START, pierHead: KAYLA_START, ...terrain };
  const npc = { ...KAYLA, hidden: false, actor: { group: { position: vector(KAYLA_START.x, KAYLA_START.z), rotation: { y: 0 }, visible: true } } };
  const npcById = new Map([[npc.id, npc]]), position = vector(KAYLA_START.x, KAYLA_START.z + 3);
  const events = [], deaths = [], toasts = []; let host, crime, saves = 0;
  const combat = createCombat({ world, position, onEvent: event => {
    events.push(event); crime?.combatEvent(event); host?.combatEvent(event);
  } });
  crime = createCrimeHost({ world, npcById, inventory: { ...createInventoryState(), refresh() {} }, combat,
    position: () => position, openDialogue() {}, closeDialogue() {}, onDeath: event => deaths.push(event),
    onAssault: event => host?.assault(event) });
  host = createKaylaHost({ npc, world, crime, combat, playerPosition: () => position,
    save: () => saves++, toast: (...args) => toasts.push(args) });
  const strike = (damage = 30, source = 'player') => crime.assault({ npcId: npc.id, damage, source });
  return { host, crime, combat, world, npc, position, events, deaths, toasts, strike, saves: () => saves };
}
const bear = fixture => fixture.combat.state.enemies.find(enemy => enemy.id === KAYLA.id);

test('Kayla stays friendly at close range and only a surviving player assault provokes her', () => {
  const f = fixture();
  for (let frame = 0; frame < 60; frame++) f.host.frame(1 / 60);
  assert.equal(f.combat.state.phase, 'peaceful'); assert.equal(f.host.state().provoked, false);
  assert.equal(f.strike(25, 'enemy').hp, KAYLA.maxHp - 25);
  f.host.frame(.1); assert.equal(f.combat.state.phase, 'peaceful', 'another attacker does not make her blame the traveler');
  assert.equal(f.strike(30).hp, KAYLA.maxHp - 55);
  assert.equal(f.host.state().provoked, true); assert.equal(f.combat.state.phase, 'peaceful', 'crime is processed before the next-frame reaction');
  f.host.frame(.1);
  assert.equal(f.combat.state.encounterId, KAYLA_FIGHT); assert.equal(f.combat.state.phase, 'active');
  assert.equal(bear(f).hp, KAYLA.maxHp - 55); assert.equal(bear(f).maxHp, KAYLA.maxHp);
  assert.equal(bear(f).kind, 'bear'); assert.equal(f.host.state().fighting, true);
});

test('paused or talking Kayla keeps her feet and queued response until play resumes', () => {
  const f = fixture(); f.strike(); const before = f.host.snapshot();
  for (const options of [{ playing: false }, { talking: true }]) {
    for (let frame = 0; frame < 60; frame++) f.host.frame(.1, options);
    assert.equal(f.combat.state.phase, 'peaceful'); assert.deepEqual(f.host.snapshot(), before);
  }
  f.host.frame(.1); assert.equal(f.combat.state.phase, 'active');
});

test('a provoked Kayla joins an existing lethal fight with the same health and leaves its actors intact', () => {
  const f = fixture(), at = KAYLA_START;
  assert.equal(f.combat.startEncounter({ id: 'road-fight', level: 3, center: at,
    checkpoint: { x: at.x, z: at.z + 8 }, retreatZ: at.z + 32,
    enemies: [{ id: 'other-enemy', kind: 'goblin', x: at.x + 6, z: at.z - 4, hp: 100 }] }), true);
  const original = f.combat.state.enemies[0]; original.hp -= 17; original.progress = .31;
  const hp = original.hp, playerHp = f.combat.state.player.hp;
  f.strike(47); f.host.frame(.1);
  assert.equal(f.combat.state.encounterId, 'road-fight'); assert.equal(f.combat.state.enemies[0], original);
  assert.equal(original.hp, hp); assert.equal(original.progress, .31); assert.equal(f.combat.state.player.hp, playerHp);
  assert.equal(bear(f).maxHp, KAYLA.maxHp, 'country difficulty does not resize a named bear');
  assert.equal(bear(f).hp, KAYLA.maxHp - 47);
  for (let frame = 0; frame < 10; frame++) f.host.frame(.1);
  assert.equal(f.combat.state.enemies.filter(enemy => enemy.id === KAYLA.id).length, 1);
});

test('combat injury and retreat preserve Kayla\'s health and actual feet without healing or restarting her rounds', () => {
  const f = fixture(); f.strike(30); f.host.frame(.1);
  assert.equal(f.combat.spellHit(KAYLA.id, 50).handled, true);
  assert.equal(f.crime.health(KAYLA.id).hp, KAYLA.maxHp - 80);
  const actor = bear(f); actor.x += 2; actor.z -= 1;
  const at = { x: actor.x, z: actor.z }, route = f.host.snapshot().next;
  assert.equal(f.combat.disengage('player-left'), true);
  assert.equal(f.host.state().fighting, false); assert.equal(f.host.state().provoked, false);
  assert.deepEqual(f.host.snapshot().position, at); assert.equal(f.host.snapshot().next, route);
  assert.equal(f.crime.health(KAYLA.id).hp, KAYLA.maxHp - 80);
  assert.deepEqual({ x: f.npc.actor.group.position.x, z: f.npc.actor.group.position.z }, at);
  f.strike(5); f.host.frame(.1);
  assert.equal(bear(f).hp, KAYLA.maxHp - 85, 'starting another encounter does not heal her');
});

test('saving queued anger restores the same injured Kayla and resumes her defense only during play', () => {
  const f = fixture(); f.strike(61);
  const saved = f.host.snapshot(), savedCrime = f.crime.snapshot();
  assert.equal(saved.provoked, true);
  const restored = fixture(); assert.equal(restored.crime.restore(savedCrime), true); assert.equal(restored.host.restore(saved), true);
  assert.equal(restored.host.state().provoked, true); assert.equal(restored.crime.health(KAYLA.id).hp, KAYLA.maxHp - 61);
  restored.host.frame(.1, { playing: false }); assert.equal(restored.combat.state.phase, 'peaceful');
  restored.host.frame(.1); assert.equal(bear(restored).hp, KAYLA.maxHp - 61);
  const before = restored.host.snapshot();
  assert.equal(restored.host.restore({ ...before, provoked: 'yes' }), false);
  assert.deepEqual(restored.host.snapshot(), before);
});

test('an assaulted swimming Kayla keeps her anger through reload and reaches either bank without combat teleporting her', () => {
  const center = KAYLA_RIVER_CROSSING[2], terrain = { heightAt: groundWithRiver, waterAt: calossSurface };
  const crossings = KAYLA_ROUTE.flatMap((point, index) => point.x === center.x && point.z === center.z ? [index] : []);
  assert.equal(crossings.length, 2, 'test both directions of her river crossing');
  for (const crossing of crossings) {
    const original = fixture(terrain);
    assert.equal(original.host.restore({ ...original.host.snapshot(), position: { x: center.x, z: center.z },
      next: crossing + 1, wait: 0, honey: 0, stop: null }), true);
    assert.equal(canStand(center.x, center.z, original.world, KAYLA_RADIUS), false);
    original.strike(31); original.host.frame(.25);
    assert.equal(original.combat.state.phase, 'peaceful');
    assert.equal(original.host.state().provoked, true);
    assert.ok(Math.hypot(original.host.model.position.x - center.x, original.host.model.position.z - center.z) > 0,
      'being provoked cannot freeze her in the river');
    const f = fixture(terrain), saved = original.host.snapshot();
    assert.equal(f.crime.restore(original.crime.snapshot()), true); assert.equal(f.host.restore(saved), true);
    f.host.frame(.25, { playing: false }); assert.deepEqual(f.host.snapshot(), saved);
    for (let frame = 0; frame < 160 && f.combat.state.phase !== 'active'; frame++) {
      const before = { ...f.host.model.position }, dry = canStand(before.x, before.z, f.world, KAYLA_RADIUS);
      f.host.frame(.25);
      assert.equal(f.host.state().provoked, true);
      assert.ok(Math.hypot(f.host.model.position.x - before.x, f.host.model.position.z - before.z) <= KAYLA_SPEED * .25 + 1e-8);
      if (!dry) assert.equal(f.combat.state.phase, 'peaceful', 'combat waits for standable bank footing');
      else assert.deepEqual({ x: bear(f).x, z: bear(f).z }, before, 'combat starts at her exact feet on the bank');
    }
    assert.equal(f.combat.state.phase, 'active'); assert.equal(bear(f).hp, KAYLA.maxHp - 31);
    assert.equal(canStand(bear(f).x, bear(f).z, f.world, KAYLA_RADIUS), true);
  }
});

test('Kayla is very strong in real combat but never receives a fresh health pool when the player loses', () => {
  const f = fixture(); f.strike(40); f.host.frame(.1);
  for (let frame = 0; frame < 60 * 20 && f.combat.state.phase === 'active'; frame++) {
    f.combat.update(1 / 60); f.host.frame(1 / 60);
  }
  assert.equal(f.combat.state.phase, 'defeated', 'her real attacks defeat an idle traveler');
  assert.equal(f.crime.health(KAYLA.id).hp, KAYLA.maxHp - 40);
  assert.equal(f.host.state().fighting, false); assert.equal(f.host.state().provoked, false);
});

test('Kayla killed in peaceful life or in her defense remains dead across time and reload', () => {
  for (const fighting of [false, true]) {
    const f = fixture();
    if (fighting) { f.strike(10); f.host.frame(.1); f.combat.spellHit(KAYLA.id, 10000); }
    else f.strike(10000);
    assert.equal(f.crime.health(KAYLA.id).status, 'dead'); assert.equal(f.crime.health(KAYLA.id).hp, 0);
    f.host.frame(.1); assert.equal(f.host.state().provoked, false);
    const at = f.host.snapshot().position;
    for (let frame = 0; frame < 10; frame++) { f.crime.frame(100); f.host.frame(.25); }
    assert.equal(f.crime.health(KAYLA.id).status, 'dead'); assert.equal(f.npc.actor.group.visible, false);
    assert.deepEqual(f.host.snapshot().position, at);
    const restored = fixture(); restored.crime.restore(f.crime.snapshot()); restored.host.restore(f.host.snapshot());
    restored.host.frame(.25);
    assert.equal(restored.crime.health(KAYLA.id).status, 'dead'); assert.equal(restored.npc.actor.group.visible, false);
    assert.equal(restored.host.state().fighting, false); assert.equal(restored.combat.state.phase, 'peaceful');
  }
});
