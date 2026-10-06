/**
 * Riding. The army pays the traveler for the Lauvel with a horse, handed over
 * by the ostler in Nothom, and the long roads beyond are meant to be
 * ridden. The rules are small on purpose:
 *
 *   G mounts a horse within reach and dismounts again; H whistles it up.
 *   A horse walks faster than a man runs and canters at nearly twice that, but
 *   it turns like a horse: it has a heading, and it goes where it is pointed.
 *   It will not fight. A fight puts the rider on the ground.
 *   It waits where it is left, and comes to a whistle from as far as it can hear;
 *   from farther, or when it cannot find a way, it turns up behind the traveler.
 *
 * Pure: no DOM, no three. The host owns the actor, the keys and the camera.
 */
export const RIDING_VERSION = 1;
export const RIDING_KEYS = Object.freeze({ mount: 'KeyG', whistle: 'KeyH' });
export const RIDE = Object.freeze({
  walk: 6.5, canter: 13,          // m/s; the traveler walks at 4.2 and runs at 7.2
  turnRate: 2.7,                  // rad/s at a walk; a canter turns wider
  radius: 0.62,                   // the mount's footprint for collisions
  reach: 2.9,                     // how near the horse must be to mount
  near: 5,                        // a whistle is wasted inside this
  earshot: 150,                   // beyond this the horse does not trot over, it turns up
  trot: 8.5,                      // m/s when coming to a whistle
  halt: 2.6,                      // it stops this far from the traveler
  patience: 2.5,                  // seconds blocked before it finds another way
  arriveAt: 14,                   // how far behind the traveler it turns up
  seat: Object.freeze({ up: 0.84, forward: -0.2 }),   // the rider's origin relative to the horse's, checked by eye against the saddle
  camera: Object.freeze({ back: 3.5, up: 0.8 }),
});
export const HORSE_NAME = 'Your bay gelding';
/**
 * What the testing panel's horse multiplies every gait by. One constant so it can be tuned.
 * It is a property of the session, never of the save: `snapshot()` does not carry it and
 * `restore()` clears it, so a real adventure can never be loaded on it.
 */
export const DEVELOPER_HORSE_SPEED = 2;
export const DEVELOPER_HORSE_NAME = 'A horse that should not exist';

const fail = reason => ({ ok: false, reason });
const finitePoint = point => !!point && Number.isFinite(point.x) && Number.isFinite(point.z);
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
const initial = () => ({ version: RIDING_VERSION, owned: false, taught: false, horse: null });

export function validateRidingSnapshot(data, { allowMissing = true, bounds = null } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== RIDING_VERSION
    || Object.keys(data).some(key => !['version', 'owned', 'taught', 'horse'].includes(key))
    || typeof data.owned !== 'boolean' || typeof data.taught !== 'boolean') return false;
  if (!data.owned) return data.horse === null && !data.taught;
  const horse = data.horse;
  if (!horse || typeof horse !== 'object' || Object.keys(horse).some(key => !['x', 'z', 'yaw'].includes(key))
    || !finitePoint(horse) || !Number.isFinite(horse.yaw)) return false;
  return !bounds || (horse.x >= bounds.minX && horse.x <= bounds.maxX && horse.z >= bounds.minZ && horse.z <= bounds.maxZ);
}

/** Turn `heading` toward `desired` no faster than the gait allows. */
export function steer(heading, desired, dt, cantering = false) {
  const rate = RIDE.turnRate * (cantering ? 0.62 : 1), error = wrap(desired - heading), most = rate * Math.max(0, dt);
  return wrap(heading + Math.max(-most, Math.min(most, error)));
}

/** How much of its gait a horse keeps while it is still turning onto the line it was asked for. */
export const drive = (heading, desired) => Math.max(0.3, Math.cos(wrap(desired - heading)));

/** Where a rider can step down: left of the horse first (the near side), then right, then behind. */
export function dismountSpot(position, heading, canStand) {
  // Forward is (sin h, cos h) and the rider's left is (cos h, -sin h); `side` is metres to the left.
  for (const [side, back] of [[1.15, 0], [-1.15, 0], [0, -1.7], [1.15, -1], [-1.15, -1]]) {
    const x = position.x + Math.cos(heading) * side + Math.sin(heading) * back, z = position.z - Math.sin(heading) * side + Math.cos(heading) * back;
    if (canStand(x, z)) return { x, z };
  }
  return null;
}

export function createRiding({ onEvent = () => {} } = {}) {
  let state = initial(), mounted = false, called = false, blocked = 0, pace = 0;

  const emit = (type, detail = {}) => { const event = { type, ...detail }; onEvent(event); return { ok: true, reason: '', ...event }; };
  const distanceTo = point => (state.horse && finitePoint(point) ? Math.hypot(state.horse.x - point.x, state.horse.z - point.z) : Infinity);

  /** The ostler hands the horse over at `point`. Once. */
  function grant(point, yaw = 0) {
    if (state.owned) return fail('You already have a horse.');
    if (!finitePoint(point)) return fail('There is nowhere to stand the horse.');
    state = { ...state, owned: true, horse: { x: point.x, z: point.z, yaw: Number.isFinite(yaw) ? yaw : 0 } };
    return emit('horse-granted');
  }

  function teach() { if (!state.owned || state.taught) return false; state = { ...state, taught: true }; return true; }

  /** Why the traveler cannot mount right now, or '' when they can. */
  function mountBlock(playerPosition, { fighting = false, busy = false } = {}) {
    if (!state.owned) return 'You have no horse.';
    if (mounted) return 'You are already in the saddle.';
    if (fighting) return 'Not in a fight. A horse is no use to you here.';
    if (busy) return 'Finish what you are doing first.';
    if (distanceTo(playerPosition) > RIDE.reach) return 'Your horse is not within reach. Press H to whistle for it.';
    return '';
  }

  function mount(playerPosition, context = {}) {
    const reason = mountBlock(playerPosition, context);
    if (reason) return fail(reason);
    mounted = true; called = false; blocked = 0; pace = 0;
    return emit('mounted', { position: { x: state.horse.x, z: state.horse.z }, yaw: state.horse.yaw });
  }

  /** Step down. `canStand(x, z)` is the host's footing test for a person. */
  function dismount(canStand = () => true) {
    if (!mounted) return fail('You are not riding.');
    const spot = dismountSpot(state.horse, state.horse.yaw, canStand);
    if (!spot) return fail('There is no room to step down here.');
    mounted = false; pace = 0;
    return emit('dismounted', { position: spot, yaw: state.horse.yaw });
  }

  /** A fight, a fall, a cutscene: the rider is on the ground whether there is room or not. */
  function unseat(canStand = () => true) {
    if (!mounted) return fail('You are not riding.');
    const spot = dismountSpot(state.horse, state.horse.yaw, canStand) ?? { x: state.horse.x, z: state.horse.z };
    mounted = false; pace = 0;
    return emit('dismounted', { position: spot, yaw: state.horse.yaw, forced: true });
  }

  /** While mounted the host moves the pair and tells the module where they are. */
  function ride(position, yaw, speed = 0) {
    if (!mounted || !finitePoint(position)) return false;
    state = { ...state, horse: { x: position.x, z: position.z, yaw: Number.isFinite(yaw) ? wrap(yaw) : state.horse.yaw } };
    pace = Math.max(0, Number(speed) || 0);
    return true;
  }

  function whistle(playerPosition) {
    if (!state.owned) return fail('You have no horse to call.');
    if (mounted) return fail('You are on it.');
    if (distanceTo(playerPosition) <= RIDE.near) return fail('Your horse is right here.');
    called = true; blocked = 0;
    return emit('whistled', { far: distanceTo(playerPosition) > RIDE.earshot });
  }

  /** Put the horse somewhere outright: a journey by boat, a testing jump, a rescue. */
  function place(point, yaw = state.horse?.yaw ?? 0) {
    if (!state.owned || !finitePoint(point)) return false;
    state = { ...state, horse: { x: point.x, z: point.z, yaw: wrap(yaw) } };
    called = false; blocked = 0;
    return true;
  }

  /**
   * Move a called horse toward the traveler. `canStand(x, z)` tests the mount's
   * own footprint. Returns the pace for the animator.
   */
  function update(dt, playerPosition, canStand = () => true) {
    if (!state.owned || mounted || !called || !finitePoint(playerPosition) || !(dt > 0)) { if (!mounted) pace = 0; return pace; }
    const horse = state.horse, dx = playerPosition.x - horse.x, dz = playerPosition.z - horse.z, distance = Math.hypot(dx, dz);
    if (distance <= RIDE.halt + 0.05) { called = false; pace = 0; return 0; }
    if (distance > RIDE.earshot || blocked > RIDE.patience) {
      // Too far to have heard, or no way through: it turns up behind the traveler, on the side it was coming from.
      const from = Math.atan2(-dx, -dz);
      for (let turn = 0; turn < 8; turn++) {
        const angle = from + (turn % 2 ? -1 : 1) * Math.ceil(turn / 2) * (Math.PI / 4);
        const x = playerPosition.x + Math.sin(angle) * RIDE.arriveAt, z = playerPosition.z + Math.cos(angle) * RIDE.arriveAt;
        if (canStand(x, z)) { state = { ...state, horse: { x, z, yaw: wrap(angle + Math.PI) } }; blocked = 0; pace = 0; return 0; }
      }
      blocked = 0; pace = 0; return 0;
    }
    const step = Math.min(distance - RIDE.halt, RIDE.trot * dt), heading = Math.atan2(dx, dz);
    let x = horse.x, z = horse.z;
    const nx = x + Math.sin(heading) * step, nz = z + Math.cos(heading) * step;
    if (canStand(nx, z)) x = nx;
    if (canStand(x, nz)) z = nz;
    const moved = Math.hypot(x - horse.x, z - horse.z);
    blocked = moved < step * 0.35 ? blocked + dt : 0;
    state = { ...state, horse: { x, z, yaw: steer(horse.yaw, heading, dt * 2) } };
    pace = moved / dt;
    return pace;
  }

  // The testing panel's mount: the same horse, twice as fast, and out of a saved game's reach.
  let developerMount = false;
  const speed = cantering => (cantering ? RIDE.canter : RIDE.walk) * (developerMount ? DEVELOPER_HORSE_SPEED : 1);

  /** What to save. A rider is saved on the ground with the horse under them. */
  const snapshot = () => ({ version: RIDING_VERSION, owned: state.owned, taught: state.taught, horse: state.horse ? { ...state.horse } : null });

  function restore(data) {
    if (!validateRidingSnapshot(data, { allowMissing: false })) return false;
    state = { version: RIDING_VERSION, owned: data.owned, taught: data.taught, horse: data.horse ? { ...data.horse } : null };
    mounted = false; called = false; blocked = 0; pace = 0; developerMount = false;
    return true;
  }

  return { grant, teach, mount, dismount, unseat, ride, whistle, place, update, speed, mountBlock, distanceTo, snapshot, restore,
    setDeveloperMount(on) { developerMount = !!on; }, get developerMount() { return developerMount; },
    get owned() { return state.owned; }, get taught() { return state.taught; }, get mounted() { return mounted; }, get called() { return called; },
    get horse() { return state.horse ? { ...state.horse } : null; }, get pace() { return pace; } };
}

/** What the ostler says when he hands the horse over: the whole of the riding lesson. */
export const RIDING_LESSON = Object.freeze([
  'He is a bay gelding, nine years old, army-broke and sound. He has no name on the rolls. Most men give them one by the second day.',
  'Stand at his shoulder and press G to mount; G again to step down, on his near side if there is room. He walks faster than you run. Hold Shift and he canters, and then he turns wide, so look where you are going before you ask for it.',
  'Leave him anywhere. He will stand and graze. Press H to whistle and he comes, if he can hear you and find a way; if he cannot, he has a habit of turning up behind you regardless.',
  'He will carry you to a fight but not through one. If steel comes out you are on your feet, and he will be somewhere behind you, thinking less of everyone.',
]);
