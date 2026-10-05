/** A testing-only mount. It has no ownership, rewards, or normal-save representation. */
// Clearance above the East Lotharn summit (about 421 m) needs room to climb first.
// The former 420 m cap made its final face an invisible flight wall.
export const DEVELOPER_BAT = Object.freeze({ speed: 24, boost: 72, turbo: 240, climb: 18, clearance: 6, ceiling: 900 });
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const point = p => p && ['x', 'y', 'z'].every(k => Number.isFinite(p[k]));

export function createDeveloperBat({ heightAt, canLand = () => true, bounds = null } = {}) {
  let active = false, landing = false, speed = 0;
  const position = { x: 0, y: 0, z: 0 }, origin = { x: 0, y: 0, z: 0 };
  let yaw = 0;
  const view = () => ({ active, landing, speed, yaw, position: { ...position }, origin: { ...origin } });
  function start(at, facing = 0) {
    if (!point(at)) return false;
    Object.assign(origin, at);
    Object.assign(position, at, { y: Math.max(at.y, heightAt(at.x, at.z) + DEVELOPER_BAT.clearance) });
    yaw = Number.isFinite(facing) ? facing : 0; active = true; landing = false; speed = 0; return true;
  }
  function requestLanding() {
    if (!active) return { ok: false, reason: 'The developer bat is not flying.' };
    if (!canLand(position.x, position.z)) return { ok: false, reason: 'Find open, accessible dry ground before landing.' };
    landing = true; return { ok: true };
  }
  function cancel({ returnToOrigin = false } = {}) {
    active = false; landing = false; speed = 0;
    return { ...(returnToOrigin ? origin : position) };
  }
  function tick(dt, { playing = true, dx = 0, dz = 0, lift = 0, boost = false, turbo = false, aimYaw } = {}) {
    if (!active || !playing) return view();
    const pace = turbo ? DEVELOPER_BAT.turbo : boost ? DEVELOPER_BAT.boost : DEVELOPER_BAT.speed;
    let remaining = clamp(Number(dt) || 0, 0, .2);
    while (remaining > 1e-8) {
      // Limit travel per terrain sample so turbo cannot jump across a thin ridge.
      const step = Math.min(.025, .5 / pace, remaining); remaining -= step;
      if (landing) {
        if (!canLand(position.x, position.z)) { landing = false; continue; }
        const ground = heightAt(position.x, position.z);
        position.y = Math.max(ground, position.y - DEVELOPER_BAT.climb * step);
        speed = 0;
        if (position.y <= ground + .001) { position.y = ground; active = false; landing = false; break; }
        continue;
      }
      const floor = heightAt(position.x, position.z) + DEVELOPER_BAT.clearance;
      position.y = clamp(position.y + clamp(lift, -1, 1) * DEVELOPER_BAT.climb * step, floor, Math.max(floor, DEVELOPER_BAT.ceiling));
      const length = Math.hypot(dx, dz), scale = length > 1 ? 1 / length : 1;
      let x = position.x + dx * scale * pace * step, z = position.z + dz * scale * pace * step;
      if (bounds) { x = clamp(x, bounds.minX, bounds.maxX); z = clamp(z, bounds.minZ, bounds.maxZ); }
      // Tall terrain blocks horizontal movement. Climb over it; never snap upward through a cliff.
      if (heightAt(x, z) + DEVELOPER_BAT.clearance <= position.y + .01) {
        speed = Math.hypot(x - position.x, z - position.z) / step;
        position.x = x; position.z = z;
      } else speed = 0;
      if (length > .02 || Number.isFinite(aimYaw)) {
        const want = Number.isFinite(aimYaw) ? aimYaw : Math.atan2(dx, dz), delta = Math.atan2(Math.sin(want - yaw), Math.cos(want - yaw));
        yaw += delta * (1 - Math.exp(-7 * step));
      }
    }
    return view();
  }
  return { start, tick, requestLanding, cancel, view, get active() { return active; } };
}
