/** Territorial ranger patrols. Rendering, projectiles and player damage belong to the host. */
export const IBENWOOD_DEFENSE = Object.freeze({
  version: 1, maxPosts: 90, activeRadius: 150, maxStep: .25,
  visionRange: 44, dangerRange: 50, coneDegrees: 100, proximity: 1.4,
  patrolSpeed: 1.25, maxHp: 180, noticePerSecond: 1.05, recoverPerSecond: .36,
  clearAt: .25, drawSeconds: .7, shotCooldown: 2, shotDamage: 70,
  xpPerMetre: 3.2, maxPracticeSpeed: 4,
});

const C = IBENWOOD_DEFENSE;
const pointOK = p => Number.isFinite(p?.x) && Number.isFinite(p?.z) && Math.abs(p.x) <= 1e6 && Math.abs(p.z) <= 1e6;
const bounded = (n, min, max) => Number.isFinite(n) && n >= min && n <= max;
const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const yawOf = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const rounded = n => Math.round(n * 1e4) / 1e4;
const freshFrame = () => ({ sneaking: false, suspicion: 0, detected: false, caught: false,
  danger: false, visible: false, moving: false, xp: 0, inside: false, permitted: false, disabled: false, paused: false });

function postDefinitions(posts) {
  if (!Array.isArray(posts) || posts.length > C.maxPosts) throw new TypeError('Ibenwood defense needs at most 90 posts.');
  const ids = new Set();
  return posts.map(post => {
    if (!pointOK(post) || typeof post.id !== 'string' || !/^[a-zA-Z][a-zA-Z0-9-]{0,95}$/.test(post.id) || ids.has(post.id)) {
      throw new TypeError('Each ranger post needs a unique stable ID and finite coordinates.');
    }
    ids.add(post.id);
    const route = post.patrol ?? [];
    if (!Array.isArray(route) || route.length > 16 || route.some(p => !pointOK(p) || distance(p, post) > 120)) {
      throw new TypeError('Ranger patrols must stay within 120 m of their post.');
    }
    const patrol = (route.length ? route : [post]).map(p => ({ x: p.x, z: p.z }));
    const yaw = Number.isFinite(post.yaw) ? Math.atan2(Math.sin(post.yaw), Math.cos(post.yaw)) : 0;
    const origin = { x: post.x, z: post.z, yaw }, points = [origin, ...patrol];
    return { id: post.id, origin, patrol, maxHp: C.maxHp, bounds: {
      // The host can shift each authored point up to 8 m onto standable ground.
      minX: Math.min(...points.map(p => p.x)) - 12, maxX: Math.max(...points.map(p => p.x)) + 12,
      minZ: Math.min(...points.map(p => p.z)) - 12, maxZ: Math.max(...points.map(p => p.z)) + 12,
    } };
  });
}

// Compact rows leave room for the rest of the game in the checkpoint's 64 KB
// envelope. Named fields remain available in state()/view() for host code.
function decode(row) {
  if (!Array.isArray(row) || row.length !== 11) return null;
  const [id, hp, x, z, yaw, patrolIndex, suspicion, detected, draw, cooldown, listen] = row;
  return { id, hp, x, z, yaw, patrolIndex, suspicion, detected, draw, cooldown, listen };
}
function validSnapshot(value, byId) {
  if (value === undefined || value === null) return true;
  if (!value || value.version !== C.version || !Array.isArray(value.actors) || value.actors.length > byId.size) return false;
  const seen = new Set();
  for (const row of value.actors) {
    const saved = decode(row), actor = byId.get(saved?.id);
    if (!actor || seen.has(saved.id) || !pointOK(saved) || !bounded(saved.hp, 0, actor.maxHp)
      || !bounded(saved.x, actor.bounds.minX, actor.bounds.maxX) || !bounded(saved.z, actor.bounds.minZ, actor.bounds.maxZ)
      || !bounded(saved.yaw, -Math.PI - .0001, Math.PI + .0001)
      || !Number.isSafeInteger(saved.patrolIndex) || saved.patrolIndex < 0 || saved.patrolIndex >= actor.patrol.length
      || !bounded(saved.suspicion, 0, 1) || ![0, 1].includes(saved.detected)
      || (saved.detected && saved.suspicion < C.clearAt)
      || !bounded(saved.draw, 0, C.drawSeconds) || !bounded(saved.cooldown, 0, C.shotCooldown)
      || !bounded(saved.listen, 0, .9) || (saved.draw > 0 && (!saved.detected || saved.cooldown > 0))
      || (saved.hp === 0 && (saved.suspicion !== 0 || saved.detected || saved.draw !== 0))) return false;
    seen.add(saved.id);
  }
  return true;
}

/** Non-legacy saves require an explicit known post list; no ID prefix is sufficient. */
export function validateIbenwoodDefenseSnapshot(value, posts) {
  if (value === undefined || value === null) return true;
  if (!Array.isArray(posts)) return false;
  try { return validSnapshot(value, new Map(postDefinitions(posts).map(post => [post.id, post]))); }
  catch { return false; }
}

/**
 * Yaw faces {sin(yaw), cos(yaw)}. Patrol points are ground coordinates; groundAt
 * supplies every actor's actual height. lineClear receives eye/chest positions,
 * while canMove receives ground positions. Neither callback is queried for far
 * patrols. The host decides whether the territory is currently present.
 */
export function createIbenwoodDefense({ posts = [], inside = () => false, groundAt = () => 0,
  canMove = () => true, lineClear = () => true, onShot = () => {}, onPractice = () => {} } = {}) {
  const height = (x, z) => { const y = groundAt(x, z); return Number.isFinite(y) ? y : 0; };
  const actors = postDefinitions(posts).map(post => ({ ...post, x: post.origin.x, z: post.origin.z,
    y: height(post.origin.x, post.origin.z), yaw: post.origin.yaw, hp: post.maxHp,
    patrolIndex: 0, suspicion: 0, detected: false, draw: 0, cooldown: 0,
    listen: 0, visible: false, danger: false, moving: false }));
  const byId = new Map(actors.map(actor => [actor.id, actor]));
  let previous = null, nearby = [], frame = freshFrame(), practiceRemainder = 0;

  const clearAim = actor => { actor.draw = 0; actor.visible = false; actor.danger = false; };
  const clearAwareness = actor => {
    clearAim(actor); actor.suspicion = 0; actor.detected = false; actor.listen = 0;
  };
  const actorView = actor => ({ id: actor.id, x: actor.x, y: actor.y, z: actor.z, yaw: actor.yaw,
    hp: actor.hp, maxHp: actor.maxHp, alive: actor.hp > 0, patrolIndex: actor.patrolIndex,
    suspicion: actor.suspicion, detected: actor.detected, visible: actor.visible, danger: actor.danger,
    drawing: actor.draw > 0, draw: actor.draw / C.drawSeconds, cooldown: actor.cooldown, moving: actor.moving });
  function view() {
    const guards = nearby.filter(actor => actor.hp > 0);
    const threats = frame.inside && !frame.permitted && !frame.disabled;
    return { ...frame, suspicion: threats ? Math.max(0, ...guards.map(actor => actor.suspicion)) : 0,
      detected: threats && guards.some(actor => actor.detected),
      visible: threats && guards.some(actor => actor.visible), danger: threats && guards.some(actor => actor.danger),
      actors: nearby.map(actorView) };
  }

  function patrol(actor, elapsed) {
    actor.moving = false;
    if (!elapsed || actor.detected || actor.listen > 0 || actor.draw > 0) return;
    // Consume only this frame's walk. Duplicate waypoints cannot cause an
    // infinite loop, and a blocked segment is skipped without a teleport.
    let travel = elapsed * C.patrolSpeed;
    for (let attempts = 0; attempts <= actor.patrol.length && travel > 0; attempts++) {
      const target = actor.patrol[actor.patrolIndex], d = distance(actor, target);
      if (d < .001) { actor.patrolIndex = (actor.patrolIndex + 1) % actor.patrol.length; continue; }
      const step = Math.min(d, travel), fraction = step / d;
      const next = { x: actor.x + (target.x - actor.x) * fraction, z: actor.z + (target.z - actor.z) * fraction };
      next.y = height(next.x, next.z);
      if (!canMove({ x: actor.x, y: actor.y, z: actor.z }, next)) {
        actor.patrolIndex = (actor.patrolIndex + 1) % actor.patrol.length;
        break;
      }
      actor.yaw = yawOf(actor, next); actor.x = next.x; actor.z = next.z; actor.y = next.y; actor.moving = true;
      travel -= step;
      if (step >= d) actor.patrolIndex = (actor.patrolIndex + 1) % actor.patrol.length;
    }
  }

  function update(dt = 0, { position, sneaking = false, taught = false, stealthLevel = 1,
    paused = false, permitted = false, disabled = false } = {}) {
    const valid = pointOK(position), elapsed = Number.isFinite(dt) ? clamp(dt, 0, C.maxStep) : 0;
    const moved = valid && previous ? distance(previous, position) : 0;
    const ordinary = elapsed > 0 && dt <= C.maxStep && moved <= elapsed * C.maxPracticeSpeed + .02;
    const moving = elapsed > 0 && dt <= C.maxStep && moved > .00001 && moved <= elapsed * 20 + .02;
    previous = valid ? { x: position.x, z: position.z } : null;
    const active = Boolean(sneaking && taught), inTerritory = valid && Boolean(inside(position.x, position.z));
    const level = Number.isFinite(stealthLevel) ? clamp(stealthLevel, 1, 99) : 1;
    const quietFactor = active ? Math.max(.1, .48 / (1 + (level - 1) * .055)) : 1;
    const noiseRange = active ? Math.max(1.5, 4.5 / (1 + (level - 1) * .045)) : 10;
    frame = { ...freshFrame(), sneaking: active, moving: moving && !paused && !disabled,
      inside: inTerritory, permitted: Boolean(permitted), disabled: Boolean(disabled), paused: Boolean(paused) };
    nearby = valid ? actors.filter(actor => distance(actor, position) <= C.activeRadius) : [];
    // Pause rebases the observer, but preserves every timer, patrol and health.
    if (paused) return view();
    if (disabled || !valid) {
      for (const actor of actors) { clearAwareness(actor); actor.moving = false; }
      return view();
    }
    if (!elapsed) return view();
    const nearIds = new Set(nearby.map(actor => actor.id));
    for (const actor of actors) {
      actor.moving = false;
      if (!nearIds.has(actor.id)) { clearAim(actor); continue; }
      if (actor.hp <= 0) { clearAwareness(actor); continue; }
      actor.cooldown = Math.max(0, actor.cooldown - elapsed);
      actor.listen = Math.max(0, actor.listen - elapsed);
      // Permission and leaving the belt cancel an aim immediately. Retreat
      // clears awareness locally; it does not move or revive a ranger.
      if (!inTerritory || permitted) {
        clearAim(actor); actor.suspicion = Math.max(0, actor.suspicion - elapsed * 1.4);
        if (actor.suspicion <= C.clearAt || permitted) { actor.detected = false; actor.listen = 0; }
        if (permitted) actor.suspicion = 0;
        patrol(actor, elapsed);
        continue;
      }
      patrol(actor, elapsed);
      const range = distance(actor, position);
      const origin = { x: actor.x, y: actor.y + 1.5, z: actor.z };
      const target = { x: position.x, y: (Number.isFinite(position.y) ? position.y : height(position.x, position.z)) + 1, z: position.z };
      const clear = range <= C.dangerRange && Boolean(lineClear(origin, target));
      actor.danger = clear;
      const forward = range ? ((position.x - actor.x) * Math.sin(actor.yaw) + (position.z - actor.z) * Math.cos(actor.yaw)) / range : 1;
      const close = range <= C.proximity;
      actor.visible = clear && range <= C.visionRange && (close || forward >= Math.cos(C.coneDegrees * Math.PI / 360));
      // Audible movement is local and still needs an unobstructed path. It can
      // turn this ranger toward a sound, but cannot by itself authorize a shot.
      const audible = clear && moving && range <= noiseRange;
      if (audible && !actor.visible && elapsed > 0) {
        actor.yaw = yawOf(actor, position); actor.listen = .9;
        actor.suspicion = Math.max(actor.suspicion, Math.min(.6, actor.suspicion + elapsed * (active ? .25 : .7)));
      }
      const alreadyDetected = actor.detected;
      if (elapsed > 0) {
        if (actor.visible) actor.suspicion = clamp(actor.suspicion + elapsed * C.noticePerSecond * (close ? 2 : quietFactor));
        else if (!audible) actor.suspicion = Math.max(0, actor.suspicion - elapsed * C.recoverPerSecond);
        if (actor.suspicion >= 1) actor.detected = true;
        else if (actor.suspicion <= C.clearAt) actor.detected = false;
      }
      if (!alreadyDetected && actor.detected) frame.caught = true;
      if (!actor.visible || !actor.detected) { actor.draw = 0; continue; }
      actor.yaw = yawOf(actor, position);
      // A newly detected target gets the entire visible draw tell. Cover or
      // crossing back over the boundary interrupts it; no delayed shot queues.
      if (!alreadyDetected || actor.cooldown > 0 || elapsed <= 0) { actor.draw = 0; continue; }
      actor.draw = Math.min(C.drawSeconds, actor.draw + elapsed);
      if (actor.draw + 1e-9 >= C.drawSeconds) {
        actor.draw = 0; actor.cooldown = C.shotCooldown;
        onShot({ id: actor.id, rangerId: actor.id, origin: { ...origin }, target: { ...target }, damage: C.shotDamage });
      }
    }
    const awareness = view();
    if (elapsed > 0 && active && ordinary && moving && inTerritory && !permitted && awareness.danger && !awareness.detected) {
      practiceRemainder += moved * C.xpPerMetre;
      frame.xp = Math.floor(practiceRemainder + 1e-9); practiceRemainder -= frame.xp;
      if (frame.xp) onPractice(frame.xp);
    }
    return view();
  }

  function damage(id, amount) {
    const actor = byId.get(id);
    if (!actor || actor.hp <= 0 || !Number.isFinite(amount) || amount <= 0) return { ok: false };
    const dealt = Math.min(actor.hp, amount); actor.hp -= dealt;
    if (actor.hp === 0) { clearAwareness(actor); actor.moving = false; }
    return { ok: true, id, damage: dealt, hp: actor.hp, maxHp: actor.maxHp, killed: actor.hp === 0 };
  }

  function snapshot() {
    return { version: C.version, actors: actors.map(actor => [actor.id, actor.hp,
      rounded(actor.x), rounded(actor.z), rounded(actor.yaw), actor.patrolIndex,
      rounded(actor.suspicion), Number(actor.detected), rounded(actor.draw), rounded(actor.cooldown), rounded(actor.listen)]) };
  }
  function reset({ fresh = false } = {}) {
    for (const actor of actors) {
      clearAwareness(actor); actor.cooldown = 0; actor.moving = false;
      if (fresh) {
        actor.hp = actor.maxHp; actor.x = actor.origin.x; actor.z = actor.origin.z;
        actor.y = height(actor.x, actor.z); actor.yaw = actor.origin.yaw; actor.patrolIndex = 0;
      }
    }
    previous = null; nearby = []; frame = freshFrame(); practiceRemainder = 0;
    return view();
  }
  function restore(value) {
    // Older checkpoints have no defense section. They introduce no healing,
    // shooting or rewards when applied to an already running controller.
    if (value === undefined || value === null) { reset(); return true; }
    if (!validSnapshot(value, byId)) return false;
    // Validate the whole section before mutating anything. Missing known posts
    // keep their existing state, allowing older subsets without resurrecting.
    previous = null; nearby = []; frame = freshFrame(); practiceRemainder = 0;
    for (const row of value.actors) {
      const saved = decode(row);
      const actor = byId.get(saved.id);
      for (const key of ['hp', 'x', 'z', 'yaw', 'patrolIndex', 'suspicion', 'draw', 'cooldown', 'listen']) actor[key] = saved[key];
      actor.detected = Boolean(saved.detected);
      actor.y = height(actor.x, actor.z); actor.visible = false; actor.danger = false; actor.moving = false;
    }
    return true;
  }
  return { update, damage, state: view, view, snapshot, restore, reset };
}
