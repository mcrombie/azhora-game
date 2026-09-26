import test from 'node:test';
import assert from 'node:assert/strict';
import { createCubHoneyQuest, CUB_HONEY_SOURCE, CUB_HONEY_XP, validateCubHoneyQuestSnapshot } from '../src/cub-honey-quest.js';
import { createCubHoneyHost, validateCubHoneySnapshot, HONEY_APPROACH, HONEY_STORE, honeyLineOfSight } from '../src/cub-honey-host.js';
import { createSkills } from '../src/skills.js';
import { LIZ, LIZ_STAND } from '../src/cat-quest.js';

function fixture() {
  const world = { bounds: { minX: -500, maxX: 500, minZ: -500, maxZ: 500 }, colliders: [], npcPositions: {}, heightAt: () => 2, waterAt: () => 0 };
  const position = { x: -33, z: -199 }, liz = { id: LIZ.id, actor: { group: { position: { ...LIZ_STAND, y: 2 }, rotation: { y: LIZ_STAND.yaw } } } };
  const counts = new Map(), inventory = { add(id, n) { counts.set(id, (counts.get(id) ?? 0) + n); return true; },
    remove(id, n) { if ((counts.get(id) ?? 0) < n) return false; counts.set(id, counts.get(id) - n); return true; } };
  let sneaking = true, dead = false, busy = false; const events = [], caught = [], skills = createSkills();
  const host = createCubHoneyHost({ npc: { id: 'kayla-cub', name: 'Bear cub' }, liz, world, position: () => position,
    inventory, skills, sneaking: () => sneaking, isLizAlive: () => !dead, busy: () => busy,
    onChange: e => events.push(e), onCaught: e => caught.push(e) });
  const at = p => Object.assign(position, p);
  return { host, liz, position, world, counts, inventory, skills, events, caught, at, sneak: value => sneaking = value,
    setBusy: value => busy = value, die: () => dead = true };
}

test('the cub teaches first, accepts only the identified unseen comb and pays exactly once', () => {
  const quest = createCubHoneyQuest(), calls = [];
  assert.equal(quest.collect({ source: CUB_HONEY_SOURCE, unseen: true, grant: () => true }), false);
  assert.equal(quest.offer(), true); assert.equal(quest.offer(), false);
  assert.equal(quest.accept({ teach: () => false }), false);
  assert.equal(quest.accept({ teach: () => true }), true);
  for (const attempt of [{ source: 'honeycomb', unseen: true }, { source: CUB_HONEY_SOURCE, unseen: false }]) {
    assert.equal(quest.collect({ ...attempt, grant: () => { throw Error('must not grant'); } }), false);
  }
  assert.equal(quest.collect({ source: CUB_HONEY_SOURCE, unseen: true, grant: () => false }), false);
  assert.equal(quest.state().stage, 'learning');
  assert.equal(quest.collect({ source: CUB_HONEY_SOURCE, unseen: true, grant: () => true }), true);
  quest.caught(); assert.equal(quest.state().stage, 'carrying', 'discovery does not erase a real stolen comb');
  assert.equal(quest.deliver({ take: () => false }), false);
  assert.equal(quest.deliver({ take: () => true, reward: n => calls.push(n) }), true);
  assert.equal(quest.deliver({ take: () => { throw Error('must not consume twice'); } }), false);
  assert.deepEqual(calls, [CUB_HONEY_XP]); assert.equal(quest.completed, true);
});

test('every safe quest stage restores and contradictory reward/source states are rejected', () => {
  const q = createCubHoneyQuest(), states = [q.snapshot()];
  q.offer(); states.push(q.snapshot()); q.accept(); states.push(q.snapshot());
  q.collect({ source: CUB_HONEY_SOURCE, unseen: true, grant: () => true }); states.push(q.snapshot());
  q.deliver({ take: () => true }); states.push(q.snapshot());
  for (const saved of states) { const copy = createCubHoneyQuest(); assert.ok(copy.restore(saved)); assert.deepEqual(copy.snapshot(), saved); }
  for (const bad of [{ ...states[0], reward: true }, { ...states[3], undetected: false }, { ...states[4], source: null }, { ...states[0], catches: -1 }]) assert.equal(validateCubHoneyQuestSnapshot(bad), false);
  assert.equal(validateCubHoneyQuestSnapshot(undefined), true);
});

test('Liz welcomes normal visitors and pauses actual patrol and awareness with the game', () => {
  const f = fixture(); f.at(HONEY_APPROACH);
  for (let i = 0; i < 100; i++) f.host.frame(.1);
  assert.equal(f.caught.length, 0); assert.equal(f.host.controlsLiz, false);
  f.host.quest.accept({ teach: () => f.skills.learn('stealth').ok });
  f.at({ x: -50, z: -200 }); f.host.frame(.1);
  const before = f.host.snapshot();
  for (let i = 0; i < 100; i++) { f.host.frame(.25, { playing: false }); f.host.frame(.25, { talking: true }); }
  assert.deepEqual(f.host.snapshot(), before); assert.equal(f.skills.snapshot().skills.stealth.xp, 0);
});

test('open theft triggers one ten-swarm incident and can be retried after escaping', () => {
  const f = fixture(); f.host.quest.accept({ teach: () => f.skills.learn('stealth').ok }); f.at(HONEY_APPROACH); f.sneak(false);
  f.host.frame(.1); assert.ok(f.host.interaction()); assert.equal(f.host.interact(), true);
  assert.equal(f.caught.length, 1); assert.equal(f.caught[0].swarms, 10); assert.equal(f.host.state().alerted, true);
  for (let i = 0; i < 200; i++) f.host.frame(.1);
  assert.equal(f.caught.length, 1); assert.equal(f.host.state().catches, 1); assert.equal(f.host.state().stage, 'learning');
  f.at({ x: -75, z: -212 }); f.host.frame(.1); assert.equal(f.host.state().alerted, false);
  f.at(HONEY_APPROACH); f.host.frame(.1); f.host.interact(); assert.equal(f.caught.length, 2);
});

test('unseen theft takes real time and movement or pause never grants a comb', () => {
  const f = fixture(); f.host.quest.accept({ teach: () => f.skills.learn('stealth').ok });
  const saved = f.host.snapshot(); saved.liz = { x: -37, z: -180, yaw: -Math.PI / 2 }; saved.wait = 14; saved.patrol = 0;
  assert.equal(f.host.restore(saved), true); f.at(HONEY_APPROACH); f.host.frame(.1); assert.equal(f.host.state().visible, false);
  f.host.interact(); assert.equal(f.host.state().taking, true);
  for (let i = 0; i < 50; i++) f.host.frame(.1, { playing: false }); assert.equal(f.host.state().stage, 'learning');
  f.position.x += .2; f.host.frame(.1); assert.equal(f.host.state().taking, false);
  f.host.interact(); for (let i = 0; i < 23; i++) f.host.frame(.1);
  assert.equal(f.host.state().stage, 'carrying'); assert.equal(f.counts.get('liz-stolen-honey'), 1); assert.equal(f.caught.length, 0);
});

test('a hostile save resumes one visible retaliation and death disables the lesson', () => {
  const f = fixture(); f.host.quest.accept({ teach: () => f.skills.learn('stealth').ok }); f.host.catchThief(); const saved = f.host.snapshot();
  assert.equal(validateCubHoneySnapshot(saved), true); const next = fixture(); assert.equal(next.host.restore(saved), true);
  for (let i = 0; i < 5; i++) next.host.frame(.1, { playing: false }); assert.equal(next.caught.length, 0);
  next.host.frame(.1); next.host.frame(.1); assert.equal(next.caught.length, 1); assert.equal(next.caught[0].restored, true);
  next.die(); next.host.frame(.1); assert.equal(next.host.controlsLiz, false); assert.equal(next.host.state().available, false);
  assert.equal(next.host.interact(), false);
});

test('the cottage blocks sight while open air around it does not', () => {
  assert.equal(honeyLineOfSight({ x: -35, z: -181 }, { x: -17, z: -181 }), false);
  assert.equal(honeyLineOfSight({ x: -37, z: -180 }, HONEY_APPROACH), true);
});

test('after the honey lesson Liz walks home, pauses and resumes from her saved feet', () => {
  const f = fixture(); f.host.quest.accept();
  const saved = f.host.snapshot(); saved.liz = { x: -37, z: -185, yaw: -Math.PI / 2 }; saved.wait = 10; saved.patrol = 1;
  assert.equal(f.host.restore(saved), true);
  f.host.quest.collect({ source: CUB_HONEY_SOURCE, unseen: true, grant: () => true });
  f.host.quest.deliver({ take: () => true });
  const start = f.host.snapshot().liz;
  for (let i = 0; i < 30; i++) {
    const before = f.host.snapshot().liz; f.host.frame(.1); const after = f.host.snapshot().liz;
    assert.ok(Math.hypot(after.x - before.x, after.z - before.z) <= .10500001, 'the walk never snaps to her public stand');
  }
  assert.equal(f.host.controlsLiz, true);
  assert.ok(Math.hypot(f.host.snapshot().liz.x - start.x, f.host.snapshot().liz.z - start.z) > 3);
  const midway = f.host.snapshot();
  for (let i = 0; i < 20; i++) { f.host.frame(.25, { playing: false }); f.host.frame(.25, { talking: true }); }
  assert.deepEqual(f.host.snapshot(), midway); assert.equal(f.liz.honeyMotion, 0);
  const resumed = fixture(); assert.equal(resumed.host.restore(midway), true);
  assert.deepEqual(resumed.host.snapshot(), midway); assert.equal(resumed.host.controlsLiz, true);
  for (let i = 0; i < 300 && resumed.host.controlsLiz; i++) resumed.host.frame(.1);
  const home = resumed.host.snapshot();
  assert.equal(resumed.host.controlsLiz, false);
  assert.ok(Math.hypot(home.liz.x - LIZ_STAND.x, home.liz.z - LIZ_STAND.z) <= .015);
  assert.equal(home.liz.yaw, LIZ_STAND.yaw);
  for (let i = 0; i < 300; i++) resumed.host.frame(.1);
  assert.deepEqual(resumed.host.snapshot(), home, 'completed lessons never restart the honey patrol');
  const loaded = fixture(); assert.equal(loaded.host.restore(home), true);
  assert.deepEqual(loaded.host.snapshot(), home); assert.equal(loaded.host.controlsLiz, false);
});

test('missing and inactive honey saves never take over Liz’s ordinary placement', () => {
  for (const offered of [false, true]) {
    const f = fixture(); if (offered) f.host.quest.offer();
    const saved = f.host.snapshot(); saved.liz = { x: -37, z: -185, yaw: 0 };
    assert.equal(f.host.restore(saved), true);
    assert.equal(f.host.controlsLiz, false);
    assert.equal(f.liz.actor.group.position.x, LIZ_STAND.x); assert.equal(f.liz.actor.group.position.z, LIZ_STAND.z);
    f.host.restore(); f.host.frame(.1);
    assert.equal(f.host.controlsLiz, false);
    assert.equal(f.liz.actor.group.position.x, LIZ_STAND.x); assert.equal(f.liz.actor.group.position.z, LIZ_STAND.z);
  }
});

test('Liz’s cat rescue suspends honey theft, walks her home and resumes the interrupted patrol afterwards', () => {
  const f = fixture(); f.host.quest.accept({ teach: () => f.skills.learn('stealth').ok });
  const saved = f.host.snapshot(); saved.liz = { x: -37, z: -180, yaw: -Math.PI / 2 }; saved.wait = 14;
  f.host.restore(saved); f.at(HONEY_APPROACH); f.host.frame(.1); f.host.interact();
  assert.equal(f.host.state().taking, true);
  const patrol = f.host.state().patrol; f.setBusy(true); f.sneak(false);
  // The callback can become busy between an interaction prompt and pressing F.
  assert.equal(f.host.interact(), false);
  const beforeBusy = f.host.snapshot().liz; f.host.frame(.1);
  const afterBusy = f.host.snapshot().liz;
  assert.ok(Math.hypot(afterBusy.x - beforeBusy.x, afterBusy.z - beforeBusy.z) <= .10500001);
  assert.equal(f.host.state().taking, false); assert.equal(f.host.interaction(), null);
  const paused = f.host.snapshot();
  for (let i = 0; i < 20; i++) f.host.frame(.25, { playing: false });
  assert.deepEqual(f.host.snapshot(), paused);
  for (let i = 0; i < 150; i++) f.host.frame(.1);
  assert.ok(Math.hypot(f.host.snapshot().liz.x - LIZ_STAND.x, f.host.snapshot().liz.z - LIZ_STAND.z) <= .015);
  assert.deepEqual(f.host.state().patrol, patrol, 'a separate quest does not consume her hive-tending time');
  assert.equal(f.host.state().stage, 'learning'); assert.equal(f.host.state().suspicion, 0);
  assert.equal(f.host.interaction(), null); assert.equal(f.host.interact(), false);
  assert.equal(f.host.catchThief(), false); assert.equal(f.caught.length, 0); assert.equal(f.counts.size, 0);
  const home = f.host.snapshot().liz; f.setBusy(false); f.at({ x: -60, z: -205 });
  f.host.frame(.1);
  assert.deepEqual(f.host.state().patrol, patrol, 'she walks back before resuming the hive wait');
  assert.ok(Math.hypot(f.host.snapshot().liz.x - home.x, f.host.snapshot().liz.z - home.z) > .09);
  for (let i = 0; i < 95; i++) f.host.frame(.1);
  assert.ok(f.host.state().patrol.wait < patrol.wait);
  assert.equal(f.host.controlsLiz, true); assert.equal(f.caught.length, 0);
});
