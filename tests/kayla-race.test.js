import test from 'node:test';
import assert from 'node:assert/strict';
import { createKaylaRace, validateKaylaRaceSnapshot, KAYLA_RACE, KAYLA_RACE_LANE, ED_RACE_LANE } from '../src/kayla-race.js';
import { createKaylaRaceHost } from '../src/kayla-race-host.js';
import { createKaylaRaceAutopilot } from '../src/kayla-race-autopilot.js';

const world = { bounds: { minX: -2000, maxX: 500, minZ: -1000, maxZ: 1000 }, colliders: [], heightAt: () => 2 };
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function fixture() {
  const events = [], mounts = [], poofs = [], quest = createKaylaRace({ onEvent: e => events.push(e) });
  const host = createKaylaRaceHost({ quest, world, onMount: p => mounts.push(['mount', p]),
    onDismount: p => mounts.push(['dismount', p]), poof: p => poofs.push(p) });
  return { quest, host, events, mounts, poofs };
}
function race(f, { run = true, idle = false, limit = 2000 } = {}) {
  for (let i = 0; i < limit && f.quest.mounted; i++) {
    const q = f.quest.state(), target = q.target, length = gap(q.kayla, target);
    f.host.tick(.1, { input: idle ? {} : { dx: (target.x - q.kayla.x) / length, dz: (target.z - q.kayla.z) / length, run } });
  }
  return f.quest.state();
}
test('Kayla waits outside the east gate until acceptance and Ed appears exactly once for the race', () => {
  const f = fixture(), before = f.quest.snapshot();
  f.host.tick(.25); assert.deepEqual(f.quest.snapshot(), before); assert.equal(f.poofs.length, 0);
  assert.equal(f.quest.accept(), true); assert.equal(f.quest.accept(), false); f.host.sync();
  assert.equal(f.mounts.length, 1); assert.equal(f.poofs.length, 1); assert.equal(f.quest.state().stage, 'countdown');
  f.host.tick(.25, { input: { dx: 1, dz: 0, run: true } });
  assert.deepEqual(f.quest.position.x, before.kayla.x);
  const paused = f.quest.snapshot(); f.host.tick(.25, { playing: false }); assert.deepEqual(f.quest.snapshot(), paused);
});
test('running the road beats Ed fairly, dismounts at the finish, and gives honey exactly once across saves', () => {
  const f = fixture(); f.quest.accept();
  const result = race(f); assert.equal(result.stage, 'won');
  assert.ok(result.elapsed > 50 && result.elapsed < 90); assert.equal(f.mounts.at(-1)[0], 'dismount');
  assert.ok(gap(result.ed, result.kayla) > 10, 'Ed is still physically behind rather than rubber-banding to the finish');
  assert.equal(f.quest.takeReward(), 3); assert.equal(f.quest.takeReward(), 0);
  const restored = createKaylaRace(); assert.equal(restored.restore(f.quest.snapshot()), true);
  assert.equal(restored.takeReward(), 0); assert.equal(restored.state().stage, 'complete');
  f.host.sync(); assert.equal(f.poofs.at(-1).type, 'leave');
});
test('waiting at the start loses and a retry carries both racers back without teleporting', () => {
  const f = fixture(); f.quest.accept(); assert.equal(race(f, { idle: true }).stage, 'lost');
  const edFinish = { ...f.quest.edPosition }, kaylaBefore = { ...f.quest.position };
  assert.equal(f.quest.retry(), true); assert.equal(gap(f.quest.edPosition, edFinish), 0);
  assert.equal(gap(f.quest.position, kaylaBefore), 0);
  for (let i = 0; i < 1600 && f.quest.state().stage === 'returning'; i++) {
    const previous = { ...f.quest.edPosition }; f.host.tick(.1);
    assert.ok(gap(previous, f.quest.edPosition) <= KAYLA_RACE.speed * .1 + 1e-6);
  }
  assert.equal(f.quest.state().stage, 'countdown'); assert.equal(f.quest.state().attempts, 2);
  assert.equal(race(f).stage, 'won');
});
test('crossing only the finish line cannot skip the sequential race checkpoints', () => {
  const f = fixture(); f.quest.accept(); for (let i = 0; i < 31; i++) f.host.tick(.1);
  Object.assign(f.quest.position, KAYLA_RACE_LANE.at(-1)); f.host.tick(.1);
  assert.equal(f.quest.state().stage, 'racing'); assert.equal(f.quest.position.next, 1);
});
test('race restoration is atomic, supports old saves, and resumes the exact live positions and clock', () => {
  const f = fixture(); assert.equal(validateKaylaRaceSnapshot(undefined), true); f.quest.accept();
  for (let i = 0; i < 80; i++) f.host.tick(.1, { input: { dx: 1, dz: -.2, run: true } });
  const snapshot = f.quest.snapshot(), next = createKaylaRace(); assert.equal(next.restore(snapshot), true);
  assert.deepEqual(next.snapshot(), snapshot); snapshot.kayla.x += 1; assert.notEqual(next.position.x, snapshot.kayla.x);
  for (const invalid of [{ ...next.snapshot(), stage: 'complete' }, { ...next.snapshot(), countdown: -1 },
    { ...next.snapshot(), ed: { ...next.edPosition, next: 900 } }, { ...next.snapshot(), kayla: { ...next.position, x: NaN } }]) {
    const before = next.snapshot(); assert.equal(next.restore(invalid), false); assert.deepEqual(next.snapshot(), before);
  }
  assert.equal(next.restore(undefined), true); assert.equal(next.state().stage, 'available');
});
test('manual rider input honors solid objects', () => {
  const quest = createKaylaRace(), at = quest.position;
  const blocked = { ...world, colliders: [{ x: at.x + 3, z: at.z, hx: .5, hz: 8 }] };
  const host = createKaylaRaceHost({ quest, world: blocked }); quest.accept();
  for (let i = 0; i < 100; i++) host.tick(.1, { input: { dx: 1, dz: 0, run: true } });
  assert.ok(quest.position.x <= at.x + 3); assert.ok(quest.position.x <= KAYLA_RACE_LANE[0].x + 1.7);
});
test('the mounted bear cannot walk through a bystander', () => {
  const quest = createKaylaRace(), start = { ...quest.position };
  const body = { id: 'bystander', x: start.x + 3, z: start.z, r: .3 };
  const host = createKaylaRaceHost({ quest, world, bodies: () => [body] }); quest.accept();
  for (let i = 0; i < 100; i++) host.tick(.1, { input: { dx: 1, dz: 0, run: true } });
  assert.ok(quest.position.x <= start.x + 1.9); assert.ok(gap(quest.position, body) >= KAYLA_RACE.radius + body.r);
});
test('the autoplay completes through conversation choices and ordinary mounted inputs', () => {
  const quest = createKaylaRace(); let mode = 'playing', dialogue = null, honey = 0;
  const player = { x: quest.position.x - 2, z: quest.position.z }, npc = { id: 'kayla', name: 'Kayla' };
  const host = createKaylaRaceHost({ quest, world,
    openDialogue(npc, lines, a, b, details) { mode = 'dialogue'; dialogue = { npcId: npc.id, choices: details.choices }; },
    closeDialogue() { mode = 'playing'; dialogue = null; }, reward(id, n) { assert.equal(id, 'honeycomb'); honey += n; },
    onDismount(at) { player.x = at.x - 2; player.z = at.z; },
  });
  const pilot = createKaylaRaceAutopilot({ world, read: () => ({ quest: quest.state(), position: player, mode, dialogue }), act: {
    interact: () => host.conversation(npc), choose: action => dialogue.choices.find(c => c.id === action.id).action(),
  } });
  pilot.start();
  let cameraYaw = 2;
  for (let i = 0; i < 1500 && pilot.active; i++) {
    const command = pilot.step(.1);
    cameraYaw += Math.atan2(Math.sin((command?.yaw ?? cameraYaw) - cameraYaw), Math.cos((command?.yaw ?? cameraYaw) - cameraYaw)) * .12;
    const move = command?.move ?? { forward: 0, side: 0 }, yaw = move.basisYaw ?? cameraYaw;
    host.tick(.1, { playing: mode === 'playing', input: { dx: -Math.sin(yaw) * move.forward + Math.cos(yaw) * move.side,
      dz: -Math.cos(yaw) * move.forward - Math.sin(yaw) * move.side, run: move.run } });
    if (host.mounted) Object.assign(player, { x: quest.position.x, z: quest.position.z });
  }
  assert.equal(quest.state().stage, 'complete'); assert.equal(honey, 3); assert.match(pilot.reason, /won the race/);
  assert.equal(pilot.active, false);
});
test('the autoplay yields at loss instead of silently resetting the race', () => {
  const f = fixture(); f.quest.accept(); race(f, { idle: true });
  const pilot = createKaylaRaceAutopilot({ world, read: () => ({ quest: f.quest.state(), position: f.quest.position, mode: 'playing' }) });
  pilot.start(); pilot.step(.1); assert.equal(pilot.active, false); assert.match(pilot.reason, /Ed won/);
  assert.equal(f.quest.state().attempts, 1);
});
test('the idle race follows Kayla after combat while explicit restore still honors the saved position', () => {
  for (const stage of ['available', 'won', 'lost']) {
    const quest = createKaylaRace(), npc = { x: 0, z: 0, yaw: 0 };
    const saved = quest.snapshot(); saved.stage = stage;
    if (stage !== 'available') saved.attempts = 1;
    if (stage === 'won') saved.kayla.next = KAYLA_RACE_LANE.length;
    const host = createKaylaRaceHost({ quest, world, readKayla: () => npc,
      placeKayla: at => Object.assign(npc, at) });
    assert.equal(host.restore(saved), true); assert.equal(npc.x, saved.kayla.x);
    npc.x += 18; npc.z += 5; npc.yaw = .7;
    const afterFight = { ...npc }; host.tick(.1);
    assert.equal(npc.x, afterFight.x); assert.equal(npc.z, afterFight.z); assert.equal(npc.yaw, .7);
    assert.equal(quest.position.x, afterFight.x);
    assert.equal(host.restore(saved), true); assert.equal(npc.x, saved.kayla.x);
  }
});
test('external NPC movement cannot overwrite the mounted racers or the completed race record', () => {
  const f = fixture(); f.quest.accept(); const position = { ...f.quest.position };
  assert.equal(f.quest.rememberKayla({ x: 42, z: 16 }), false); assert.equal(gap(position, f.quest.position), 0);
  race(f); f.quest.takeReward(); const saved = f.quest.snapshot();
  assert.equal(f.quest.rememberKayla({ x: 42, z: 16 }), false); assert.deepEqual(f.quest.snapshot(), saved);
});
