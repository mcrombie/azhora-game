import test from 'node:test';
import assert from 'node:assert/strict';
import { LOCOMOTION, locomotionStats, createLocomotionSkills } from '../src/gameplay/movement/locomotion-skills.js';
import { createSkills, MAX_XP, validateSkillsSnapshot } from '../src/gameplay/skills/skills.js';

test('walking and running improve independently with walking always below beginner running', () => {
  assert.deepEqual(locomotionStats(), { walkSpeed: 6, runSpeed: 9.5, runDrain: 4 });
  let previous = { walkSpeed: 0, runSpeed: 0, runDrain: 9 };
  for (let level = 1; level <= 99; level++) {
    const stats = locomotionStats({ level: () => level });
    assert.ok(stats.walkSpeed < LOCOMOTION.runStart);
    assert.ok(stats.walkSpeed >= previous.walkSpeed && stats.runSpeed >= previous.runSpeed);
    assert.ok(stats.runDrain > 0 && stats.runDrain <= previous.runDrain);
    previous = stats;
  }
  assert.deepEqual(previous, { walkSpeed: 6.6, runSpeed: 10.5, runDrain: 2.5 });
  assert.equal(locomotionStats({ level: id => id === 'walking' ? 99 : 1 }).runSpeed, 9.5);
  assert.equal(locomotionStats({ level: id => id === 'running' ? 99 : 1 }).walkSpeed, 6);
});

test('active movement earns the same time-based experience at different frame rates', () => {
  for (const fps of [10, 30, 60, 144]) {
    const skills = createSkills(), locomotion = createLocomotionSkills({ skills });
    let seconds = 0, spent = 0;
    for (let frame = 0; frame < fps * 12; frame++) {
      const mode = frame < fps * 7 ? 'walking' : 'running';
      const speed = mode === 'walking' ? 6 : 9.5;
      const step = locomotion.update(1 / fps, { mode, distance: speed / fps });
      seconds += step.practicedSeconds; spent += step.staminaCost;
    }
    assert.equal(skills.xp('walking'), 7, `${fps} fps walking`);
    assert.equal(skills.xp('running'), 5, `${fps} fps running`);
    assert.ok(Math.abs(seconds - 12) < 1e-8);
    assert.ok(Math.abs(spent - 20) < 1e-8);
  }
});

test('combat doubles running effort without changing travel speed or experience', () => {
  for (const level of [1, 30, 99]) {
    const gained = [[], []];
    const quiet = createLocomotionSkills({ skills: { level: () => level, gain: (id, xp) => gained[0].push([id, xp]) } });
    const fight = createLocomotionSkills({ skills: { level: () => level, gain: (id, xp) => gained[1].push([id, xp]) } });
    const safePace = quiet.pace({ run: true }), combatPace = fight.pace({ run: true, inCombat: true });
    assert.equal(safePace.speed, combatPace.speed);
    assert.equal(combatPace.drainPerSecond, safePace.drainPerSecond * 2);
    let safeSpent = 0, combatSpent = 0;
    for (let frame = 0; frame < 120; frame++) {
      const movement = { mode: 'running', distance: safePace.speed / 60 };
      safeSpent += quiet.update(1 / 60, movement).staminaCost;
      combatSpent += fight.update(1 / 60, { ...movement, inCombat: true }).staminaCost;
    }
    assert.equal(combatSpent, safeSpent * 2);
    assert.deepEqual(gained[0], gained[1], 'combat does not buy extra running mastery');
  }
  assert.equal(locomotionStats(null, { inCombat: true }).runDrain, 8);
  assert.equal(locomotionStats({ level: () => 99 }, { inCombat: true }).runDrain, 5);
});

test('holding run through exhaustion gives a sustained walking recovery, not alternating frames', () => {
  const locomotion = createLocomotionSkills();
  let stamina = 0, runningAt = -1;
  // The host may replenish the shared bar while the traveler keeps walking.
  for (let frame = 0; frame < 301; frame++) {
    const pace = locomotion.pace({ run: true, stamina });
    if (pace.mode === 'running') { runningAt = frame; break; }
    assert.equal(pace.speed, 6);
    assert.equal(pace.exhausted, true);
    stamina += .2;
  }
  assert.ok(runningAt >= 250 && runningAt <= 251, `resumed after ${runningAt} recovery frames`);
  const first = locomotion.update(1 / 60, { mode: 'running', distance: 9.5 / 60 });
  stamina -= first.staminaCost;
  assert.equal(locomotion.pace({ run: true, stamina }).mode, 'running', 'falling below the resume threshold does not relatch exhaustion');
});

test('blocked input, pauses, mounts, water, climbing, falling and relocations buy no foot mastery', () => {
  const skills = createSkills(), locomotion = createLocomotionSkills({ skills });
  const excluded = [
    { distance: 0 }, { distance: 200 }, { active: false }, { grounded: false }, { onFoot: false },
    { swimming: true }, { climbing: true }, { sneaking: true }, { forced: true }, { teleported: true },
    { mode: 'flying' }, { movementScale: 0 }, { distance: NaN }, { distance: Infinity },
  ];
  for (const frame of excluded) {
    assert.deepEqual(locomotion.update(.5, { mode: 'running', distance: 4.75, ...frame }),
      { xp: 0, staminaCost: 0, practicedSeconds: 0 }, JSON.stringify(frame));
  }
  for (const dt of [0, -1, 5, NaN, Infinity])
    assert.equal(locomotion.update(dt, { distance: .5 }).practicedSeconds, 0);
  assert.equal(skills.xp('walking') + skills.xp('running'), 0);
  // Slow terrain still represents the same time practising, not fewer metres.
  assert.equal(locomotion.update(1, { distance: 1, movementScale: .5 }).xp, 1);
});

test('exhaustion forces walking until a meaningful amount of shared stamina has recovered', () => {
  const locomotion = createLocomotionSkills();
  assert.equal(locomotion.pace({ run: true, stamina: 100 }).mode, 'running');
  assert.equal(locomotion.pace({ run: true, stamina: 0 }).mode, 'walking');
  for (const stamina of [1, 5, 12, 25, 49.9]) {
    const pace = locomotion.pace({ run: true, stamina });
    assert.equal(pace.mode, 'walking'); assert.equal(pace.exhausted, true);
    assert.equal(pace.drainPerSecond, 0);
    assert.equal(pace.speed, LOCOMOTION.walkStart, 'exhaustion never stops ordinary walking');
  }
  assert.equal(locomotion.pace({ run: false, stamina: 5 }).exhausted, true, 'releasing the key cannot bypass recovery');
  assert.equal(locomotion.pace({ run: true, stamina: 50 }).mode, 'running');
  locomotion.pace({ run: true, stamina: 0, maxStamina: 180 });
  assert.equal(locomotion.pace({ run: true, stamina: 89.9, maxStamina: 180 }).mode, 'walking');
  assert.equal(locomotion.pace({ run: true, stamina: 90, maxStamina: 180 }).mode, 'running');
});

test('ordinary skills snapshots retain travel mastery and older characters retain all their strengths', () => {
  const skills = createSkills();
  const old = { version: 1, skills: { toughness: { xp: 276 }, blades: { xp: 174 }, swimming: { xp: 83 } }, taught: ['blades', 'swimming'] };
  assert.equal(skills.restore(old), true);
  assert.deepEqual(locomotionStats(skills), locomotionStats());
  assert.deepEqual(skills.snapshot(), old);
  skills.learn('walking'); skills.learn('running');
  skills.gain('walking', MAX_XP); skills.gain('running', 174);
  assert.equal(validateSkillsSnapshot(skills.snapshot()), true);
  const restored = createSkills();
  assert.equal(restored.restore(skills.snapshot()), true);
  assert.deepEqual(restored.snapshot(), skills.snapshot());
  assert.deepEqual(locomotionStats(restored), locomotionStats(skills));
  assert.equal(restored.xp('toughness'), 276);
  assert.equal(restored.xp('blades'), 174);
  assert.equal(restored.xp('swimming'), 83);
});
