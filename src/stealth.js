/** Guard awareness and practice, independent of rendering and input. */
export const STEALTH = Object.freeze({
  key: 'X', speedMultiplier: .42,
  visionRange: 12, dangerRange: 14, coneDegrees: 100, proximity: 1.4,
  noticePerSecond: .85, sneakVisibility: .42, recoverPerSecond: .32,
  clearAt: .25, xpPerMetre: 3.2, maxPracticeSpeed: 4, maxStep: .25,
});

const validPoint = point => Number.isFinite(point?.x) && Number.isFinite(point?.z);
const clamp = value => Math.min(1, Math.max(0, value));

/**
 * `yaw` faces {sin(yaw), cos(yaw)}, like the game's people. A caller may provide
 * lineOfSight(guard, player) to exclude walls. The update result's `xp` is a delta
 * for skills.gain('stealth', xp); `caught` is an edge, not a repeated alarm.
 * Awareness is transient. Save experience through skills, then reset on a load.
 */
export function createStealth({ lineOfSight = () => true } = {}) {
  let previous = null, suspicion = 0, detected = false, remainder = 0;
  let state = { sneaking: false, suspicion: 0, detected: false, caught: false,
    danger: false, visible: false, moving: false, xp: 0 };

  function update({ dt = 0, position, sneaking = false, taught = false,
    guards = [], paused = false, lineOfSight: canSee = lineOfSight } = {}) {
    const active = Boolean(sneaking && taught), valid = validPoint(position);
    const elapsed = Number.isFinite(dt) ? Math.max(0, Math.min(STEALTH.maxStep, dt)) : 0;
    const distance = valid && previous ? Math.hypot(position.x - previous.x, position.z - previous.z) : 0;
    previous = valid ? { x: position.x, z: position.z } : null;
    // Rebase while paused or teleported: neither missed time nor a changed spawn
    // is a walk, and opening a menu must not make a guard detect the player.
    const ordinaryStep = dt <= STEALTH.maxStep && distance <= elapsed * STEALTH.maxPracticeSpeed + .02;
    const moving = distance > .00001 && ordinaryStep;
    let danger = false, visible = false, notice = 0;
    if (valid) for (const guard of guards) {
      if (!validPoint(guard) || guard.active === false || guard.alive === false) continue;
      const dx = position.x - guard.x, dz = position.z - guard.z, range = Math.hypot(dx, dz);
      const vision = Number.isFinite(guard.range) ? Math.max(0, guard.range) : STEALTH.visionRange;
      if (range > Math.max(vision, STEALTH.dangerRange) || !canSee(guard, position)) continue;
      danger = true;
      const angle = Number.isFinite(guard.yaw) ? guard.yaw : 0;
      const forward = range ? (dx * Math.sin(angle) + dz * Math.cos(angle)) / range : 1;
      const inCone = forward >= Math.cos(STEALTH.coneDegrees * Math.PI / 360);
      const close = range <= STEALTH.proximity;
      if (!close && (range > vision || !inCone)) continue;
      visible = true;
      // Sneaking buys time in a sightline; it never makes a person invisible.
      const exposure = close ? 1.6 : (active ? STEALTH.sneakVisibility : 1);
      notice = Math.max(notice, STEALTH.noticePerSecond * exposure);
    }
    let xp = 0, caught = false;
    if (valid && elapsed > 0 && !paused) {
      suspicion = clamp(suspicion + (visible ? notice : -STEALTH.recoverPerSecond) * elapsed);
      if (suspicion >= 1 && !detected) { detected = true; caught = true; }
      else if (suspicion <= STEALTH.clearAt) detected = false;
      if (active && danger && moving && !detected) {
        remainder += distance * STEALTH.xpPerMetre;
        xp = Math.floor(remainder + 1e-9);
        remainder -= xp;
      }
    }
    state = { sneaking: active, suspicion, detected, caught, danger, visible,
      moving: moving && !paused && elapsed > 0, xp };
    return { ...state };
  }

  function reset(position) {
    previous = validPoint(position) ? { x: position.x, z: position.z } : null;
    suspicion = 0; detected = false; remainder = 0;
    state = { sneaking: false, suspicion: 0, detected: false, caught: false,
      danger: false, visible: false, moving: false, xp: 0 };
    return { ...state };
  }

  return { update, reset, view: () => ({ ...state }) };
}
