/**
 * Walking and Running: practice measured in active time on foot. The host owns
 * collision, mode and the shared combat stamina bar; this module owns neither.
 * Speeds deliberately use independent curves so walking cannot become running.
 */
export const LOCOMOTION = Object.freeze({
  walkStart: 6, walkCap: 6.6,
  runStart: 9.5, runCap: 10.5,
  runDrainStart: 4, runDrainFloor: 2.5,
  combatRunDrainMultiplier: 2,
  recoveryFraction: .5,
  xpPerSecond: 1,
  // The game passes simulation dt, not elapsed time while paused/backgrounded.
  maxStep: 1,
});

const levelProgress = level => Math.sqrt((Math.max(1, Math.min(99, Number(level) || 1)) - 1) / 98);
const mix = (start, end, progress) => start + (end - start) * progress;

/** A missing skill (including an old save) receives the current novice baseline. */
export function locomotionStats(skills = null, { inCombat = false } = {}) {
  const walking = levelProgress(skills?.level?.('walking'));
  const running = levelProgress(skills?.level?.('running'));
  return {
    walkSpeed: mix(LOCOMOTION.walkStart, LOCOMOTION.walkCap, walking),
    runSpeed: mix(LOCOMOTION.runStart, LOCOMOTION.runCap, running),
    runDrain: mix(LOCOMOTION.runDrainStart, LOCOMOTION.runDrainFloor, running)
      * (inCombat ? LOCOMOTION.combatRunDrainMultiplier : 1),
  };
}

/**
 * Call pace before movement, then update with the distance actually walked.
 * Spend update.staminaCost from the shared bar and suppress ordinary recovery
 * during that running frame. Walking/rest may recover stamina normally.
 * Integer experience uses the existing skills save; only a sub-point remainder
 * and the short exhaustion latch are transient and reset after loading/travel.
 */
export function createLocomotionSkills({ skills = null } = {}) {
  let exhausted = false;
  const remainder = { walking: 0, running: 0 };

  function pace({ run = false, stamina = 100, maxStamina = 100, inCombat = false } = {}) {
    const wind = Number.isFinite(stamina) ? Math.max(0, stamina) : 0;
    const capacity = Number.isFinite(maxStamina) ? Math.max(1, maxStamina) : 100;
    if (wind <= .001) exhausted = true;
    else if (exhausted && wind >= capacity * LOCOMOTION.recoveryFraction) exhausted = false;
    const stats = locomotionStats(skills, { inCombat }), running = !!run && !exhausted;
    return { mode: running ? 'running' : 'walking', speed: running ? stats.runSpeed : stats.walkSpeed,
      drainPerSecond: running ? stats.runDrain : 0, exhausted };
  }

  function update(dt, { distance = 0, mode = 'walking', active = true, grounded = true, onFoot = true,
    swimming = false, climbing = false, sneaking = false, forced = false, teleported = false, movementScale = 1,
    inCombat = false } = {}) {
    const none = { xp: 0, staminaCost: 0, practicedSeconds: 0 };
    if (!active || !grounded || !onFoot || swimming || climbing || sneaking || forced || teleported
      || !['walking', 'running'].includes(mode) || !Number.isFinite(dt) || dt <= 0 || dt > LOCOMOTION.maxStep
      || !Number.isFinite(distance) || distance <= .02 * dt || !Number.isFinite(movementScale) || movementScale <= 0) return none;
    const stats = locomotionStats(skills, { inCombat }), running = mode === 'running';
    // A relocation accidentally passed to this API must never buy mastery.
    const plausibleDistance = (running ? stats.runSpeed : stats.walkSpeed) * movementScale * dt * 1.35 + .002;
    if (distance > plausibleDistance) return none;
    remainder[mode] += dt * LOCOMOTION.xpPerSecond;
    const xp = Math.floor(remainder[mode] + 1e-9);
    if (xp > 0) {
      remainder[mode] = Math.max(0, remainder[mode] - xp);
      skills?.gain?.(mode, xp);
    }
    return { xp, staminaCost: running ? stats.runDrain * dt : 0, practicedSeconds: dt };
  }

  return { pace, update, stats: context => locomotionStats(skills, context),
    reset() { exhausted = false; remainder.walking = 0; remainder.running = 0; } };
}
