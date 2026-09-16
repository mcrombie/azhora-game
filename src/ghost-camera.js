const TAU = Math.PI * 2;
const PITCH_LIMIT = Math.PI / 2 - .08;
const DEFAULT_BOUNDS = Object.freeze({ minX: -10000, maxX: 10000, minY: -250, maxY: 1500, minZ: -10000, maxZ: 10000 });
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const angle = value => ((value + Math.PI) % TAU + TAU) % TAU - Math.PI;
const finitePoint = point => point && ['x', 'y', 'z'].every(key => Number.isFinite(point[key]));

/**
 * Developer-only free flight. This controller has no world, DOM, collider,
 * character, or checkpoint references; the caller explicitly applies its pose.
 * Positive pitch looks down, matching the game's third-person camera.
 */
export function createGhostFlight({
  position: initialPosition = { x: 0, y: 4, z: 0 }, yaw: initialYaw = 0, pitch: initialPitch = .20,
  speed: initialSpeed = 28, boostSpeed = 100, minSpeed = 6, maxSpeed = 120, maxBoostSpeed = 360,
  bounds: suppliedBounds = {}, lookSensitivity = .0045,
} = {}) {
  if (!finitePoint(initialPosition) || !Number.isFinite(initialYaw) || !Number.isFinite(initialPitch))
    throw new TypeError('Ghost flight needs a finite starting position and view.');
  if (![initialSpeed, boostSpeed, minSpeed, maxSpeed, maxBoostSpeed, lookSensitivity].every(n => Number.isFinite(n) && n > 0)
    || minSpeed > maxSpeed || maxSpeed > maxBoostSpeed)
    throw new TypeError('Ghost flight speeds and sensitivity must be positive, with ordered speed limits.');
  if (!suppliedBounds || typeof suppliedBounds !== 'object' || Array.isArray(suppliedBounds))
    throw new TypeError('Ghost flight bounds must be an object.');
  const bounds = { ...DEFAULT_BOUNDS };
  for (const key of Object.keys(bounds)) if (Object.hasOwn(suppliedBounds, key)) {
    if (!Number.isFinite(suppliedBounds[key])) throw new TypeError(`Ghost flight bound ${key} must be finite.`);
    bounds[key] = suppliedBounds[key];
  }
  for (const axis of ['X', 'Y', 'Z']) if (bounds[`min${axis}`] >= bounds[`max${axis}`])
    throw new TypeError(`Ghost flight ${axis} bounds are reversed or empty.`);

  const position = { ...initialPosition }, velocity = { x: 0, y: 0, z: 0 };
  const sensitivity = clamp(lookSensitivity, .00001, .1);
  let yaw = angle(initialYaw), pitch = clamp(initialPitch, -PITCH_LIMIT, PITCH_LIMIT);
  let speed = clamp(initialSpeed, minSpeed, maxSpeed), boosting = false, moving = false;
  const boostRatio = Math.max(1, boostSpeed / initialSpeed);
  const boostedSpeed = () => Math.min(maxBoostSpeed, speed * boostRatio);
  function confine() {
    position.x = clamp(position.x, bounds.minX, bounds.maxX);
    position.y = clamp(position.y, bounds.minY, bounds.maxY);
    position.z = clamp(position.z, bounds.minZ, bounds.maxZ);
  }
  confine();

  function snapshot() {
    return { position: { ...position }, velocity: { ...velocity }, yaw, pitch, speed,
      boostSpeed: boostedSpeed(), currentSpeed: Math.hypot(velocity.x, velocity.y, velocity.z),
      boosting, moving, bounds: { ...bounds } };
  }

  function update(dt, keys, active = true) {
    if (!active || !Number.isFinite(dt) || dt <= 0) return snapshot();
    const step = Math.min(dt, .15);
    const held = code => typeof keys?.has === 'function' && keys.has(code);
    const forward = Number(held('KeyW') || held('ArrowUp') || held('KeyQ') || held('KeyE'))
      - Number(held('KeyS') || held('ArrowDown'));
    const side = Number(held('KeyD') || held('ArrowRight') || held('KeyE'))
      - Number(held('KeyA') || held('ArrowLeft') || held('KeyQ'));
    const up = Number(held('Space')) - Number(held('ControlLeft') || held('ControlRight'));
    boosting = !!(held('ShiftLeft') || held('ShiftRight') || held('Tab'));
    const sinYaw = Math.sin(yaw), cosYaw = Math.cos(yaw), cosPitch = Math.cos(pitch);
    let dx = -sinYaw * cosPitch * forward + cosYaw * side;
    let dy = -Math.sin(pitch) * forward + up;
    let dz = -cosYaw * cosPitch * forward - sinYaw * side;
    const length = Math.hypot(dx, dy, dz);
    const rate = boosting ? boostedSpeed() : speed;
    if (length > 1e-9) { dx = dx / length * rate; dy = dy / length * rate; dz = dz / length * rate; }
    else { dx = 0; dy = 0; dz = 0; }
    const before = { ...position };
    position.x += dx * step; position.y += dy * step; position.z += dz * step; confine();
    velocity.x = (position.x - before.x) / step;
    velocity.y = (position.y - before.y) / step;
    velocity.z = (position.z - before.z) / step;
    moving = Math.hypot(velocity.x, velocity.y, velocity.z) > 1e-6;
    return snapshot();
  }

  function rotate(dx, dy) {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return false;
    // Keep even a malformed device's huge finite delta from overflowing math.
    yaw = angle(yaw - clamp(dx, -100000, 100000) * sensitivity);
    pitch = clamp(pitch + clamp(dy, -100000, 100000) * sensitivity, -PITCH_LIMIT, PITCH_LIMIT);
    return true;
  }

  function setView(view) {
    if (!view || !Number.isFinite(view.yaw) || !Number.isFinite(view.pitch)) return false;
    yaw = angle(view.yaw); pitch = clamp(view.pitch, -PITCH_LIMIT, PITCH_LIMIT); return true;
  }

  function setPosition(point) {
    if (!finitePoint(point)) return false;
    position.x = point.x; position.y = point.y; position.z = point.z; confine();
    velocity.x = velocity.y = velocity.z = 0; moving = false; boosting = false; return true;
  }

  function speedScale(wheelDelta) {
    if (!Number.isFinite(wheelDelta)) return false;
    speed = clamp(speed * Math.exp(clamp(-wheelDelta * .0017, -8, 8)), minSpeed, maxSpeed);
    return true;
  }

  function cameraPose({ distance = 6, targetHeight = 1.2 } = {}) {
    const behind = Number.isFinite(distance) ? clamp(distance, .1, 120) : 6;
    const height = Number.isFinite(targetHeight) ? clamp(targetHeight, -10, 10) : 1.2;
    const target = { x: position.x, y: position.y + height, z: position.z };
    const horizontal = Math.cos(pitch) * behind;
    return { position: { x: target.x + Math.sin(yaw) * horizontal,
      y: target.y + Math.sin(pitch) * behind, z: target.z + Math.cos(yaw) * horizontal },
    target, yaw, pitch };
  }

  return { update, rotate, setView, speedScale, setPosition, snapshot, cameraPose };
}
