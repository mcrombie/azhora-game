import { canStand, moveCharacter } from './game-state.js';

const TAU = Math.PI * 2;
const SWINGS = [
  { duration: .50, contact: .19, damage: 24, reach: 2.35 },
  { duration: .57, contact: .22, damage: 26, reach: 2.45 },
  { duration: .68, contact: .29, damage: 34, reach: 2.65 },
];
const DODGE_DURATION = .56;
const DODGE_TRAVEL_TIME = .40;
const DODGE_DISTANCE = 3.05;
const ENEMY_TELL = .94;
const ENEMY_ATTACK = .62;
const ENEMY_CONTACT = .27;
const ENEMY_RECOVERY = 1.35;
// Each enemy kind has its own pace. Goblins keep the original timings; wolves
// close faster, bite sooner and hit a little lighter.
const ENEMY_KINDS = Object.freeze({
  goblin: Object.freeze({ tell: ENEMY_TELL, attack: ENEMY_ATTACK, contact: ENEMY_CONTACT, recovery: ENEMY_RECOVERY, damage: 17, speed: 1.8, engage: 2.12, reach: 2.15, lunge: 1.3 }),
  wolf: Object.freeze({ tell: .7, attack: .5, contact: .2, recovery: 1.05, damage: 14, speed: 2.9, engage: 2.35, reach: 2.4, lunge: 3.2 }),
  // A trained man with a blade: a shorter tell than a goblin's and a steadier pace.
  soldier: Object.freeze({ tell: .82, attack: .56, contact: .24, recovery: 1.25, damage: 16, speed: 2.0, engage: 2.1, reach: 2.15, lunge: 1.4 }),
  // Mallec, the ogre on the Amod road (src/amod-ogre.js): a different order of
  // creature, not a large goblin. Three optional fields carry the difference and
  // every other kind goes on ignoring them:
  //   `arc`      how wide the strike lands, so backing straight up is not a defence
  //              and a dodge has to go sideways and be timed;
  //   `standoff` how far out he stops, so his bulk stays out of the traveler's lap;
  //   `stagger`  false, so a hit does not interrupt him. That is the single biggest
  //              change from every fight in the game so far: there is no free second
  //              bought with a swing, and the fight is lost to greed rather than to
  //              surprise. The long tell keeps him readable while it does it.
  ogre: Object.freeze({ tell: 1.18, attack: .44, contact: .2, recovery: 1.3, damage: 52, speed: 1.25, engage: 4.3, reach: 4.7, lunge: 6.4,
    arc: Math.PI * .4, aimLock: .55, standoff: 2.6, stagger: false, knockback: .2 }),
});
const SOLDIER_LOOKS = Object.freeze(['coalition', 'legion']);
// Allied soldiers who fight beside the traveler. Officers hit harder and last longer.
const ALLY_KINDS = Object.freeze({
  legionary: Object.freeze({ tell: .55, attack: .5, contact: .22, recovery: 1.9, damage: 18, speed: 2.1, engage: 1.95, reach: 2.2, hp: 90 }),
  officer: Object.freeze({ tell: .5, attack: .48, contact: .2, recovery: 1.7, damage: 22, speed: 2.2, engage: 1.95, reach: 2.2, hp: 110 }),
});
const DEFAULT_ENCOUNTER = Object.freeze({
  id: 'tidehaven-raiders', center: Object.freeze({ x: 0, z: -36 }),
  checkpoint: Object.freeze({ x: 0, z: -25 }), retreatZ: -16,
  enemies: Object.freeze([
    Object.freeze({ id: 'goblin-scout', x: -1.3, z: -36, hp: 75, entry: .2 }),
    Object.freeze({ id: 'goblin-scrapper', x: 1.3, z: -40, hp: 75, entry: 1.5 }),
    Object.freeze({ id: 'goblin-lookout', x: 0, z: -44, hp: 75, entry: 2.8 }),
  ]),
});

// Copy and validate the entire request before changing health, timers or enemies.
// Encounter bounds deliberately follow the same small arena as the first fight.
function encounterConfig(config) {
  if (!config || typeof config !== 'object') return null;
  const point = value => value && Number.isFinite(value.x) && Number.isFinite(value.z);
  const identifier = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(value);
  // The arena runs along one axis: -Z in Tidehaven's wood, -X once the road
  // turns west out of Drent. `retreatLine` is the far edge along that axis.
  const axis = config.retreatAxis === 'x' ? 'x' : 'z', across = axis === 'x' ? 'z' : 'x';
  const line = Number.isFinite(config.retreatLine) ? config.retreatLine : config.retreatZ;
  if (!identifier(config.id) || !point(config.center) || !point(config.checkpoint)
    || !Number.isFinite(line) || line <= config.center[axis]
    || config.checkpoint[axis] >= line || !Array.isArray(config.enemies)
    || !config.enemies.length || config.enemies.length > 12) return null;
  const seen = new Set(), enemies = [];
  for (const enemy of config.enemies) {
    if (!enemy || !identifier(enemy.id) || seen.has(enemy.id) || !point(enemy)) return null;
    const kind = enemy.kind ?? 'goblin';
    if (!Object.hasOwn(ENEMY_KINDS, kind)) return null;
    if (enemy.look !== undefined && !SOLDIER_LOOKS.includes(enemy.look)) return null;
    const hp = enemy.hp ?? 75, entry = enemy.entry ?? 0;
    if (!Number.isFinite(hp) || hp <= 0 || hp > 10000 || !Number.isFinite(entry) || entry < 0 || entry > 60
      || Math.abs(enemy[across] - config.center[across]) > 12 || enemy[axis] < config.center[axis] - 21
      || enemy[axis] > config.center[axis] + 18 || enemy[axis] >= line) return null;
    seen.add(enemy.id); enemies.push({ id: enemy.id, x: enemy.x, z: enemy.z, hp, entry, kind, ...(enemy.look ? { look: enemy.look } : {}) });
  }
  const allies = [];
  if (config.allies !== undefined) {
    if (!Array.isArray(config.allies) || config.allies.length > 6) return null;
    for (const ally of config.allies) {
      if (!ally || !identifier(ally.id) || seen.has(ally.id) || !point(ally) || !Object.hasOwn(ALLY_KINDS, ally.kind)
        || (ally.name !== undefined && typeof ally.name !== 'string')
        || (ally.model !== undefined && (!ally.model || typeof ally.model !== 'object' || Array.isArray(ally.model)))
        || (ally.hp !== undefined && (!Number.isFinite(ally.hp) || ally.hp <= 0 || ally.hp > 10000))
        || Math.abs(ally[across] - config.center[across]) > 12 || ally[axis] < config.center[axis] - 21
        || ally[axis] > config.center[axis] + 18 || ally[axis] >= line) return null;
      seen.add(ally.id); allies.push({ id: ally.id, name: ally.name ?? 'Legionary', kind: ally.kind, x: ally.x, z: ally.z, ...(ally.hp !== undefined ? { hp: ally.hp } : {}), ...(ally.model ? { model: { ...ally.model } } : {}) });
    }
  }
  return { id: config.id, center: { x: config.center.x, z: config.center.z },
    checkpoint: { x: config.checkpoint.x, z: config.checkpoint.z },
    retreatZ: line, retreatLine: line, retreatAxis: axis, enemies, allies };
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const angleDifference = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const facing = (a, b, yaw, arc) => Math.abs(angleDifference(Math.atan2(b.x - a.x, b.z - a.z), yaw)) <= arc;

/** Small, deterministic combat simulation. Rendering and tutorial text live outside it. */
export function createCombat({ world, position, onEvent = () => {}, getWeapon, onWeaponContact = () => {} }) {
  const state = {
    phase: 'peaceful',
    encounterId: null,
    player: {
      hp: 100, maxHp: 100, stamina: 100, maxStamina: 100,
      action: 'idle', progress: 0, combo: 0, yaw: 0, invulnerable: false,
    },
    enemies: [],
    allies: [],
  };
  const player = state.player;
  const enemyTimers = new Map();
  const allyTimers = new Map();
  let time = 0;
  let actionTime = 0;
  let hitApplied = false;
  let bufferedAttack = false;
  let comboUntil = -1;
  let comboNext = 0;
  let staminaDelay = 0;
  let hurtProtection = 0;
  let dodgeDirection = { x: 0, z: 1 };
  let nextAttackerAt = 0;
  let weaponReady = false;
  let attackWeapon = null;
  let lastEncounter = DEFAULT_ENCOUNTER;

  function currentWeapon() {
    return getWeapon ? getWeapon() : {
      id: 'walking-club', damage: SWINGS.map(swing => swing.damage), reachMultiplier: 1, usable: true,
    };
  }

  function usableWeapon() {
    const weapon = currentWeapon();
    if (weapon?.usable) return weapon;
    emit('weapon-blocked', { id: weapon?.id });
    return null;
  }

  function emit(type, detail = {}) { onEvent({ type, ...detail }); }

  function safePoint(x, z) {
    if (canStand(x, z, world, .45)) return { x, z };
    // A changed tree layout must not strand a combatant inside a trunk.
    for (let radius = .5; radius <= 7; radius += .5) {
      for (let i = 0; i < 16; i++) {
        const angle = i / 16 * TAU;
        const point = { x: x + Math.sin(angle) * radius, z: z + Math.cos(angle) * radius };
        if (canStand(point.x, point.z, world, .45)) return point;
      }
    }
    return canStand(0, z, world) ? { x: 0, z } : { x: position.x, z: position.z };
  }

  function restorePlayer() {
    player.hp = player.maxHp;
    player.stamina = player.maxStamina;
    player.action = 'idle';
    player.progress = 0;
    player.combo = 0;
    player.invulnerable = false;
    actionTime = 0;
    comboNext = 0;
    comboUntil = -1;
    hurtProtection = 0;
    staminaDelay = 0;
    bufferedAttack = false;
    hitApplied = false;
    attackWeapon = null;
  }

  function makeEnemy(id, kind, point, entry = 0, hp = kind === 'dummy' ? 100 : 75) {
    const enemy = {
      id, kind, ...(kind === 'dummy' ? {x:point.x,z:point.z} : safePoint(point.x, point.z)), yaw: 0,
      hp, maxHp: hp,
      action: 'idle', progress: 0, speed: 0, active: true,
    };
    enemyTimers.set(id, { actionTime: 0, cooldown: entry, hitApplied: false, entry, index: entry / 1.3 });
    return enemy;
  }

  function startPractice(point) {
    weaponReady = true;
    restorePlayer();
    enemyTimers.clear();
    clearAllies();
    state.enemies = [makeEnemy('practice-dummy', 'dummy', point)];
    state.phase = 'practice';
    state.encounterId = null;
  }

  function finishPractice() {
    if (state.phase !== 'practice') return;
    state.enemies = [];
    enemyTimers.clear();
    clearAllies();
    state.phase = 'peaceful';
    restorePlayer();
  }

  /**
   * `atCheckpoint` starts the traveler where the fight forms up, as a retry does.
   * A fight begun wherever the traveler happens to stand counts as a retreat on its
   * first step when that is past its retreat line, or 45 m from its centre.
   */
  function startEncounter(config, { atCheckpoint = false } = {}) {
    if (state.phase === 'active' || (state.phase === 'won' && config === undefined)) return false;
    const next = encounterConfig(config === undefined ? DEFAULT_ENCOUNTER : config);
    if (!next) return false;
    if (atCheckpoint) {
      const checkpoint = safePoint(next.checkpoint.x, next.checkpoint.z);
      position.x = checkpoint.x; position.z = checkpoint.z; position.y = world.heightAt(position.x, position.z);
    }
    weaponReady = true;
    restorePlayer();
    enemyTimers.clear();
    lastEncounter = next;
    state.enemies = next.enemies.map(enemy => ({ ...makeEnemy(enemy.id, enemy.kind ?? 'goblin', enemy, enemy.entry, enemy.hp), ...(enemy.look ? { look: enemy.look } : {}) }));
    allyTimers.clear();
    state.allies = next.allies.map((ally, index) => makeAlly(ally, index));
    state.phase = 'active';
    state.encounterId = next.id;
    nextAttackerAt = time + .6;
    return true;
  }

  function resetEncounter() {
    state.phase = 'peaceful';
    const checkpoint = safePoint(lastEncounter.checkpoint.x, lastEncounter.checkpoint.z);
    position.x = checkpoint.x;
    position.z = checkpoint.z;
    position.y = world.heightAt(position.x, position.z);
    return startEncounter(lastEncounter);
  }

  function beginAttack(yaw) {
    if (player.stamina < 6) return false;
    const weapon = usableWeapon();
    if (!weapon) { bufferedAttack = false; return false; }
    const candidates = state.enemies.filter(enemy => enemy.active && enemy.action !== 'dead'
      && distance(position, enemy) <= 3.2 && facing(position, enemy, yaw, Math.PI * .43));
    candidates.sort((a, b) => distance(position, a) - distance(position, b));
    if (candidates.length) yaw = Math.atan2(candidates[0].x - position.x, candidates[0].z - position.z);
    player.yaw = yaw;
    player.combo = time <= comboUntil ? comboNext : 0;
    player.action = 'attack';
    player.progress = 0;
    player.stamina -= 6;
    staminaDelay = .65;
    actionTime = 0;
    hitApplied = false;
    bufferedAttack = false;
    attackWeapon = { ...weapon, damage: [...weapon.damage] };
    emit('swing', { combo: player.combo, x: position.x, z: position.z, weaponId: weapon.id });
    return true;
  }

  function attack(yaw) {
    if (!Number.isFinite(yaw) || state.phase === 'defeated' || player.action === 'dead') return false;
    if (!weaponReady) return false;
    if (player.action === 'attack') {
      // A single late press is remembered; holding the mouse cannot queue a whole combo.
      if (actionTime >= SWINGS[player.combo].duration * .55) {
        if (!usableWeapon()) return false;
        bufferedAttack = true;
        return true;
      }
      return false;
    }
    if (player.action !== 'idle') return false;
    return beginAttack(yaw);
  }

  function dodge(direction = {}) {
    if (!weaponReady || state.phase === 'defeated' || player.stamina < 25) return false;
    if (player.action === 'dead' || player.action === 'hurt' || player.action === 'dodge') return false;
    // Attacks can be cancelled after contact, so a committed swing still has a readable cost.
    if (player.action === 'attack' && actionTime < SWINGS[player.combo].contact) return false;
    let x = Number.isFinite(direction.x) ? direction.x : 0;
    let z = Number.isFinite(direction.z) ? direction.z : 0;
    const length = Math.hypot(x, z);
    if (length < .001) { x = -Math.sin(player.yaw); z = -Math.cos(player.yaw); }
    else { x /= length; z /= length; }
    dodgeDirection = { x, z };
    player.yaw = Math.atan2(x, z);
    player.stamina -= 25;
    staminaDelay = .8;
    player.action = 'dodge';
    player.progress = 0;
    player.invulnerable = true;
    actionTime = 0;
    bufferedAttack = false;
    emit('dodge', { x: position.x, z: position.z });
    return true;
  }

  function hurtEnemy(enemy, damage, yaw) {
    const timers = enemyTimers.get(enemy.id);
    if (enemy.kind === 'dummy') {
      enemy.action = 'hurt';
      enemy.progress = 0;
      timers.actionTime = 0;
      emit('practice-hit', { targetId: enemy.id, x: enemy.x, z: enemy.z });
      emit('hit', { targetId: enemy.id, x: enemy.x, z: enemy.z, damage: 0 });
      return;
    }
    const profile = ENEMY_KINDS[enemy.kind] ?? ENEMY_KINDS.goblin;
    enemy.hp = Math.max(0, enemy.hp - damage);
    enemy.active = enemy.hp > 0;
    // A kind marked `stagger: false` takes the hit and keeps swinging: its tell is
    // not interrupted, its recovery is not restarted and nothing here buys the
    // traveler a free second. Death still lands the same way for everyone.
    if (profile.stagger !== false || !enemy.hp) {
      enemy.action = enemy.hp ? 'hurt' : 'dead';
      enemy.progress = 0;
      enemy.speed = 0;
      timers.actionTime = 0;
      timers.cooldown = ENEMY_RECOVERY;
      nextAttackerAt = Math.max(nextAttackerAt, time + .35);
      moveCharacter(enemy, Math.sin(yaw) * (profile.knockback ?? .43), Math.cos(yaw) * (profile.knockback ?? .43), world);
    }
    emit('hit', { targetId: enemy.id, x: enemy.x, z: enemy.z, damage });
    if (!enemy.hp) emit('enemy-defeated', { id: enemy.id, x: enemy.x, z: enemy.z });
    if (state.phase === 'active' && state.enemies.every(target => !target.active)) {
      state.phase = 'won';
      emit('victory', { encounterId: state.encounterId });
    }
  }

  function applyPlayerStrike() {
    const swing = SWINGS[player.combo];
    const weapon = attackWeapon;
    if (!weapon) return;
    const candidates = state.enemies.filter(enemy => enemy.active && enemy.action !== 'dead'
      && distance(position, enemy) <= swing.reach * weapon.reachMultiplier
      && facing(position, enemy, player.yaw, Math.PI * .34));
    candidates.sort((a, b) => distance(position, a) - distance(position, b));
    // A clean single target per swing keeps timing legible in the small first encounter.
    if (candidates[0]) {
      hurtEnemy(candidates[0], weapon.damage[player.combo], player.yaw);
      onWeaponContact(weapon.id);
    }
  }

  function hurtPlayer(enemy) {
    if (player.invulnerable || state.phase !== 'active' || player.hp <= 0) return;
    const damage = (ENEMY_KINDS[enemy.kind] ?? ENEMY_KINDS.goblin).damage;
    player.hp = Math.max(0, player.hp - damage);
    player.action = player.hp ? 'hurt' : 'dead';
    player.progress = 0;
    actionTime = 0;
    bufferedAttack = false;
    hurtProtection = 1.15;
    player.invulnerable = true;
    moveCharacter(position, Math.sin(enemy.yaw) * .55, Math.cos(enemy.yaw) * .55, world);
    emit('player-hit', { damage, x: position.x, z: position.z });
    if (!player.hp) {
      state.phase = 'defeated';
      state.enemies.forEach(target => {
        if (target.active) { target.action = 'idle'; target.progress = 0; target.speed = 0; }
      });
      emit('defeat', { encounterId: state.encounterId });
    }
  }

  function updatePlayer(dt) {
    staminaDelay = Math.max(0, staminaDelay - dt);
    hurtProtection = Math.max(0, hurtProtection - dt);
    player.invulnerable = hurtProtection > 0 || (player.action === 'dodge' && actionTime < .37);
    if (!staminaDelay && player.action !== 'dead') player.stamina = Math.min(player.maxStamina, player.stamina + 24 * dt);
    if (player.action === 'idle') { player.progress = 0; return; }
    const previousTime = actionTime;
    actionTime += dt;
    if (player.action === 'attack') {
      const swing = SWINGS[player.combo];
      player.progress = clamp(actionTime / swing.duration, 0, 1);
      const advanceTime = Math.max(0, Math.min(actionTime, swing.contact) - Math.min(previousTime, swing.contact));
      const lungeSpeed = player.combo === 2 ? 1.8 : 1.4;
      moveCharacter(position, Math.sin(player.yaw) * advanceTime * lungeSpeed, Math.cos(player.yaw) * advanceTime * lungeSpeed, world);
      if (!hitApplied && actionTime >= swing.contact) {
        hitApplied = true;
        applyPlayerStrike();
      }
      if (actionTime >= swing.duration) {
        comboNext = (player.combo + 1) % SWINGS.length;
        comboUntil = time + .85;
        player.action = 'idle';
        player.progress = 0;
        if (bufferedAttack) beginAttack(player.yaw);
      }
    } else if (player.action === 'dodge') {
      player.progress = clamp(actionTime / DODGE_DURATION, 0, 1);
      // Ease out the travel but retain a short recovery pose. Sweep through world collisions.
      const travel = t => 1 - (1 - clamp(t / DODGE_TRAVEL_TIME, 0, 1)) ** 2;
      const amount = (travel(actionTime) - travel(previousTime)) * DODGE_DISTANCE;
      moveCharacter(position, dodgeDirection.x * amount, dodgeDirection.z * amount, world);
      if (actionTime >= DODGE_DURATION) { player.action = 'idle'; player.progress = 0; }
    } else if (player.action === 'hurt') {
      player.progress = clamp(actionTime / .46, 0, 1);
      if (actionTime >= .46) { player.action = 'idle'; player.progress = 0; }
    } else if (player.action === 'dead') player.progress = clamp(actionTime / .8, 0, 1);
    player.invulnerable = hurtProtection > 0 || (player.action === 'dodge' && actionTime < .37);
  }

  function steerEnemy(enemy, target, step, separation = true) {
    const yaw = Math.atan2(target.x - enemy.x, target.z - enemy.z);
    const offsets = [0, .45, -.45, .9, -.9, 1.4, -1.4];
    for (const offset of offsets) {
      const x = enemy.x + Math.sin(yaw + offset) * step;
      const z = enemy.z + Math.cos(yaw + offset) * step;
      const center = lastEncounter.center;
      if (x < center.x - 12 || x > center.x + 12 || z < center.z - 21 || z > center.z + 18 || !canStand(x, z, world, .43)) continue;
      if (separation && state.enemies.some(other => {
        if (other === enemy || !other.active) return false;
        // A lunge can briefly overlap a neighbor: allow movement that opens that gap,
        // otherwise the whole group can become permanently stuck after a reaction.
        const minimum = Math.min(.93, distance(enemy, other) - .001);
        return Math.hypot(other.x - x, other.z - z) < minimum;
      })) continue;
      if (distance({ x, z }, position) < 1.1) continue;
      if (state.allies.some(ally => ally.active && Math.hypot(ally.x - x, ally.z - z) < .9)) continue;
      const before = { x: enemy.x, z: enemy.z };
      moveCharacter(enemy, x - enemy.x, z - enemy.z, world);
      return distance(before, enemy);
    }
    return 0;
  }

  function updateEnemy(enemy, dt) {
    const timers = enemyTimers.get(enemy.id);
    timers.actionTime += dt;
    timers.cooldown = Math.max(0, timers.cooldown - dt);
    enemy.speed = 0;
    if (enemy.action === 'dead') { enemy.progress = clamp(timers.actionTime / .85, 0, 1); return; }
    if (enemy.action === 'hurt') {
      const duration = enemy.kind === 'dummy' ? .32 : .44;
      enemy.progress = clamp(timers.actionTime / duration, 0, 1);
      if (timers.actionTime >= duration) { enemy.action = 'idle'; enemy.progress = 0; }
      return;
    }
    if (enemy.kind === 'dummy' || state.phase !== 'active') return;
    const profile = ENEMY_KINDS[enemy.kind] ?? ENEMY_KINDS.goblin;
    if (enemy.action === 'windup') {
      enemy.progress = clamp(timers.actionTime / profile.tell, 0, 1);
      // Aim is locked for the whole tell; a sidestep or dodge can beat the actual strike.
      // A kind with an `aimLock` instead keeps turning until that much of the tell has
      // gone by, and only then commits: a dodge thrown the moment the arc appears is
      // followed round, and the strike is beaten by waiting for the commitment and
      // moving late. A long tell is what makes that readable rather than unfair.
      if (profile.aimLock && enemy.progress < profile.aimLock) {
        const tracked = timers.targetId ? state.allies.find(ally => ally.id === timers.targetId && ally.active) : null;
        const aim = tracked ?? position;
        enemy.yaw += angleDifference(Math.atan2(aim.x - enemy.x, aim.z - enemy.z), enemy.yaw) * Math.min(1, dt * 5);
      }
      if (timers.actionTime >= profile.tell) {
        enemy.action = 'attack';
        enemy.progress = 0;
        timers.actionTime -= profile.tell;
        timers.hitApplied = false;
      }
      return;
    }
    if (enemy.action === 'attack') {
      enemy.progress = clamp(timers.actionTime / profile.attack, 0, 1);
      // A committed lunge carries the strike forward, but stops short of standing
      // inside whoever it is aimed at: a creature with reach does not need to.
      if (timers.actionTime <= profile.contact && distance(enemy, position) > (profile.standoff ?? 0) * .85)
        moveCharacter(enemy, Math.sin(enemy.yaw) * dt * profile.lunge, Math.cos(enemy.yaw) * dt * profile.lunge, world);
      if (!timers.hitApplied && timers.actionTime >= profile.contact) {
        timers.hitApplied = true;
        // The strike lands on whoever the tell was aimed at: the traveler, or an ally still standing.
        const aimedAlly = timers.targetId ? state.allies.find(ally => ally.id === timers.targetId && ally.active) : null;
        const struckPoint = aimedAlly ?? position;
        if (distance(enemy, struckPoint) <= profile.reach && facing(enemy, struckPoint, enemy.yaw, profile.arc ?? Math.PI * .25)) { if (aimedAlly) hurtAlly(aimedAlly, enemy); else hurtPlayer(enemy); }
      }
      if (timers.actionTime >= profile.attack && state.phase === 'active') {
        enemy.action = 'idle';
        enemy.progress = 0;
        timers.cooldown = profile.recovery;
        nextAttackerAt = time + .55;
      }
      return;
    }
    if (timers.entry > 0) { timers.entry = Math.max(0, timers.entry - dt); return; }
    const focus = enemyTarget(enemy), aim = focus.point;
    const dist = distance(enemy, aim);
    const targetYaw = Math.atan2(aim.x - enemy.x, aim.z - enemy.z);
    enemy.yaw += angleDifference(targetYaw, enemy.yaw) * Math.min(1, dt * 7);
    const someoneAttacking = state.enemies.some(other => other.active && ['windup', 'attack'].includes(other.action));
    if (dist <= profile.engage && timers.cooldown <= 0 && !someoneAttacking && time >= nextAttackerAt) {
      enemy.action = 'windup';
      enemy.yaw = targetYaw;
      enemy.progress = 0;
      timers.actionTime = 0;
      timers.targetId = focus.ally?.id ?? null;
      emit('windup', { id: enemy.id, targetId: timers.targetId });
      return;
    }
    const desiredDistance = Math.max(someoneAttacking ? 2.7 : 1.8, profile.standoff ?? 0);
    if (dist > desiredDistance) {
      const target = {
        x: clamp(aim.x, lastEncounter.center.x - 8, lastEncounter.center.x + 8),
        z: clamp(aim.z, lastEncounter.center.z - 16, lastEncounter.center.z + 16),
      };
      const speed = profile.speed + (enemy.id === 'goblin-scout' ? .15 : 0);
      const amount = steerEnemy(enemy, target, Math.min(speed * dt, Math.max(0, dist - desiredDistance)));
      enemy.speed = amount / dt;
    }
  }

  // Allies: Legion soldiers who join an encounter, close on the nearest enemy and
  // strike with the same tell-then-swing rhythm. Enemies treat them as targets.
  function makeAlly(spec, index) {
    const profile = ALLY_KINDS[spec.kind];
    const ally = { id: spec.id, name: spec.name, kind: spec.kind, ...(spec.model ? { model: spec.model } : {}), ...safePoint(spec.x, spec.z), yaw: 0,
      hp: spec.hp ?? profile.hp, maxHp: spec.hp ?? profile.hp, action: 'idle', progress: 0, speed: 0, active: true };
    allyTimers.set(ally.id, { actionTime: 0, cooldown: .4 + index * .3, hitApplied: false, targetId: null });
    return ally;
  }

  function clearAllies() { state.allies = []; allyTimers.clear(); }

  /** The nearest standing target for an enemy: the traveler or a living ally. */
  function enemyTarget(enemy) {
    let best = { point: position, ally: null }, bestDistance = distance(enemy, position);
    for (const ally of state.allies) {
      if (!ally.active) continue;
      const d = distance(enemy, ally);
      if (d < bestDistance) { best = { point: ally, ally }; bestDistance = d; }
    }
    return best;
  }

  function hurtAlly(ally, enemy) {
    if (!ally.active) return;
    const damage = (ENEMY_KINDS[enemy.kind] ?? ENEMY_KINDS.goblin).damage;
    const timers = allyTimers.get(ally.id);
    ally.hp = Math.max(0, ally.hp - damage);
    ally.action = ally.hp ? 'hurt' : 'dead';
    ally.active = ally.hp > 0;
    ally.progress = 0;
    ally.speed = 0;
    timers.actionTime = 0;
    timers.hitApplied = false;
    moveCharacter(ally, Math.sin(enemy.yaw) * .4, Math.cos(enemy.yaw) * .4, world);
    emit('ally-hit', { id: ally.id, damage, x: ally.x, z: ally.z });
    if (!ally.hp) emit('ally-down', { id: ally.id, x: ally.x, z: ally.z });
  }

  function steerAlly(ally, target, step) {
    const yaw = Math.atan2(target.x - ally.x, target.z - ally.z);
    for (const offset of [0, .45, -.45, .9, -.9, 1.4, -1.4]) {
      const x = ally.x + Math.sin(yaw + offset) * step;
      const z = ally.z + Math.cos(yaw + offset) * step;
      const center = lastEncounter.center;
      if (x < center.x - 12 || x > center.x + 12 || z < center.z - 21 || z > center.z + 18 || !canStand(x, z, world, .43)) continue;
      if (distance({ x, z }, position) < .9) continue;
      if (state.allies.some(other => other !== ally && other.active && Math.hypot(other.x - x, other.z - z) < .9)) continue;
      if (state.enemies.some(other => other.active && Math.hypot(other.x - x, other.z - z) < 1.0)) continue;
      const before = { x: ally.x, z: ally.z };
      moveCharacter(ally, x - ally.x, z - ally.z, world);
      return distance(before, ally);
    }
    return 0;
  }

  function updateAlly(ally, dt) {
    const timers = allyTimers.get(ally.id), profile = ALLY_KINDS[ally.kind];
    timers.actionTime += dt;
    timers.cooldown = Math.max(0, timers.cooldown - dt);
    ally.speed = 0;
    if (ally.action === 'dead') { ally.progress = clamp(timers.actionTime / .85, 0, 1); return; }
    if (ally.action === 'hurt') {
      ally.progress = clamp(timers.actionTime / .44, 0, 1);
      if (timers.actionTime >= .44) { ally.action = 'idle'; ally.progress = 0; }
      return;
    }
    if (state.phase !== 'active') { ally.action = 'idle'; ally.progress = 0; return; }
    const foes = state.enemies.filter(enemy => enemy.active && enemy.action !== 'dead');
    if (!foes.length) { ally.action = 'idle'; ally.progress = 0; return; }
    if (ally.action === 'windup') {
      ally.progress = clamp(timers.actionTime / profile.tell, 0, 1);
      if (timers.actionTime >= profile.tell) { ally.action = 'attack'; ally.progress = 0; timers.actionTime -= profile.tell; timers.hitApplied = false; }
      return;
    }
    if (ally.action === 'attack') {
      ally.progress = clamp(timers.actionTime / profile.attack, 0, 1);
      if (timers.actionTime <= profile.contact) moveCharacter(ally, Math.sin(ally.yaw) * dt * 1.2, Math.cos(ally.yaw) * dt * 1.2, world);
      if (!timers.hitApplied && timers.actionTime >= profile.contact) {
        timers.hitApplied = true;
        const struck = foes.filter(enemy => distance(ally, enemy) <= profile.reach && facing(ally, enemy, ally.yaw, Math.PI * .3))
          .sort((a, b) => distance(ally, a) - distance(ally, b))[0];
        if (struck) hurtEnemy(struck, profile.damage, ally.yaw);
        emit('ally-strike', { id: ally.id, targetId: struck?.id ?? null, x: ally.x, z: ally.z });
      }
      if (timers.actionTime >= profile.attack) { ally.action = 'idle'; ally.progress = 0; timers.cooldown = profile.recovery; }
      return;
    }
    foes.sort((a, b) => distance(ally, a) - distance(ally, b));
    const target = foes[0], dist = distance(ally, target);
    const targetYaw = Math.atan2(target.x - ally.x, target.z - ally.z);
    ally.yaw += angleDifference(targetYaw, ally.yaw) * Math.min(1, dt * 8);
    if (dist <= profile.engage && timers.cooldown <= 0) {
      ally.action = 'windup'; ally.yaw = targetYaw; ally.progress = 0; timers.actionTime = 0;
      emit('ally-windup', { id: ally.id, targetId: target.id });
      return;
    }
    if (dist > 1.7) ally.speed = steerAlly(ally, target, Math.min(profile.speed * dt, Math.max(0, dist - 1.7))) / dt;
  }

  function update(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    // Substeps preserve contact windows and swept movement through occasional slow frames.
    let remaining = Math.min(dt, 10);
    while (remaining > 1e-9) {
      const step = Math.min(remaining, 1 / 120);
      remaining -= step;
      time += step;
      if (state.phase === 'active' && (position[lastEncounter.retreatAxis] > lastEncounter.retreatLine
        || (lastEncounter.id !== DEFAULT_ENCOUNTER.id && distance(position, lastEncounter.center) > 45))) {
        state.phase = 'peaceful';
        state.enemies = [];
        enemyTimers.clear();
        clearAllies();
        restorePlayer();
        emit('retreat', { encounterId: state.encounterId });
      }
      updatePlayer(step);
      state.enemies.forEach(enemy => updateEnemy(enemy, step));
      state.allies.forEach(ally => updateAlly(ally, step));
    }
  }

  function pose() {
    const weapon = player.action === 'attack' && attackWeapon ? attackWeapon : currentWeapon();
    return {
      action: player.action, progress: player.progress, combo: player.combo,
      armed: weaponReady, alert: state.phase === 'active',
      weaponId: weapon?.id, weaponUsable: weapon?.usable ?? false,
    };
  }

  function movementScale() {
    if (['dodge', 'hurt', 'dead'].includes(player.action)) return 0;
    return player.action === 'attack' ? .45 : 1;
  }

  function heal(amount) {
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(player.hp)
      || !Number.isFinite(player.maxHp) || player.hp <= 0 || player.maxHp <= 0
      || state.phase === 'defeated' || player.action !== 'idle') return 0;
    const healed = Math.min(amount, Math.max(0, player.maxHp - player.hp));
    player.hp += healed;
    return healed;
  }

  return {
    state, startPractice, finishPractice, startEncounter, attack, dodge, update, resetEncounter, pose, movementScale, heal,
    setWeaponReady(value) { weaponReady = Boolean(value); },
  };
}
