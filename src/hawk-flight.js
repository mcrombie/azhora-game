/**
 * Ansel's red-tailed hawk. She rides his gauntlet, and every so often she goes
 * up: a few hard wingbeats off the fist, then wide slow circles over the green,
 * riding the warm air rather than flapping, and at last a long glide back down
 * to his glove. While the traveler is talking with Ansel she comes in early and
 * stays put. A pure behaviour: the game says where the glove is and where Ansel
 * stands; this says where she is, which way she faces, and how her wings are.
 */
export const RED_TAIL = Object.freeze({
  perch: [22, 42],      // seconds on the glove between flights
  soar: [28, 50],       // seconds aloft
  height: [13, 20],     // metres above the ground she circles at
  radius: [9, 15],      // metres out from Ansel she circles
  speed: 6.5,           // metres a second on the circle
  launch: 1.8,          // seconds from fist to circle
  landing: 3.4,         // seconds from circle to fist
});

const smooth = t => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

export function createHawkFlight({ random = Math.random } = {}) {
  const between = ([a, b]) => a + random() * (b - a);
  const state = { mode: 'perched', timer: between(RED_TAIL.perch), clock: 0, angle: 0, radius: 12, height: 16, flights: 0, t: 0 };
  let from = null, at = null;

  function circlePoint(anchor) {
    return { x: anchor.x + Math.cos(state.angle) * state.radius, y: anchor.y + state.height + Math.sin(state.clock * .35) * 1.2,
      z: anchor.z + Math.sin(state.angle) * state.radius };
  }

  /**
   * `glove` is where she stands on Ansel's fist; `anchor` is Ansel's feet;
   * `called` is true while the traveler is talking with him.
   */
  function update(dt, { glove, anchor, called = false }) {
    if (!glove || !anchor) return at;
    if (!Number.isFinite(dt) || dt <= 0) return at ?? pose(glove, 0, 0, 'perched');
    state.clock += dt;
    if (state.mode === 'perched') {
      if (!called) state.timer -= dt;
      if (state.timer <= 0) {
        state.mode = 'launching'; state.t = 0; state.flights++;
        state.radius = between(RED_TAIL.radius); state.height = between(RED_TAIL.height);
        state.angle = random() * Math.PI * 2; from = { ...glove };
      }
      return (at = pose(glove, glove.yaw ?? at?.yaw ?? 0, 0, 'perched'));
    }
    if (state.mode === 'launching') {
      state.t += dt / RED_TAIL.launch;
      state.angle += dt * RED_TAIL.speed / state.radius * state.t;
      const to = circlePoint(anchor), k = smooth(Math.min(1, state.t));
      const p = { x: lerp(from.x, to.x, k), y: lerp(from.y, to.y, Math.sqrt(k)), z: lerp(from.z, to.z, k) };
      if (state.t >= 1) { state.mode = 'soaring'; state.timer = between(RED_TAIL.soar); }
      return (at = pose(p, heading(p), 0, 'flapping'));
    }
    if (state.mode === 'soaring') {
      state.timer -= dt;
      state.angle += dt * RED_TAIL.speed / state.radius;
      const p = circlePoint(anchor);
      if (state.timer <= 0 || called) { state.mode = 'landing'; state.t = 0; from = p; }
      // Now and then a few wingbeats to hold the circle; mostly she rides the air.
      return (at = pose(p, heading(p), .35, Math.sin(state.clock * .5) > .93 ? 'flapping' : 'soaring'));
    }
    // Landing: a long descending glide to the fist, braking with the wings at the last.
    state.t += dt / RED_TAIL.landing;
    const k = smooth(Math.min(1, state.t));
    const p = { x: lerp(from.x, glove.x, k), y: lerp(from.y, glove.y, k * k), z: lerp(from.z, glove.z, k) };
    if (state.t >= 1) { state.mode = 'perched'; state.timer = between(RED_TAIL.perch); return (at = pose(glove, heading(p), 0, 'perched')); }
    return (at = pose(p, heading(p), 0, state.t > .8 ? 'braking' : 'gliding'));
  }

  // Facing the way she is travelling, from the last point to this one.
  function heading(p) {
    if (!at) return 0;
    const dx = p.x - at.x, dz = p.z - at.z;
    return Math.hypot(dx, dz) > 1e-4 ? Math.atan2(dx, dz) : at.yaw;
  }
  function pose(p, yaw, bank, wings) { return { x: p.x, y: p.y, z: p.z, yaw, bank, wings, perched: wings === 'perched' }; }

  return { update, get state() { return { ...state }; }, get perched() { return state.mode === 'perched'; } };
}
