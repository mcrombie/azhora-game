// Liz owns this retaliation. It cannot spend the player's focus, reward player
// sorcery XP, or be mistaken for a spell cast by the player.
export const APIARY_BEES = Object.freeze({ count: 10, tell: 1.25, lifetime: 14, range: 25, speed: 5.1, stingRange: 1.75, stingEvery: .6, stingDamage: 1.5 });
const finite = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const point = p => ({ x: p.x, y: Number.isFinite(p.y) ? p.y : 0, z: p.z });

/** Ten visible swarms, one damage callback per sting interval, normal player HP.
 * `canSee(from,to)` is the world's solid-cover query. Bees can be escaped or
 * broken off behind a cottage; this is not a separate encounter or game mode.
 */
export function createApiaryBees({ onDamage = () => {}, onEvent = () => {}, heightAt = () => 0, canSee = () => true } = {}) {
  let phase = 'idle', source = null, ownerId = 'liz-beekeeper', age = 0, sting = 0, sequence = 0;
  const swarms = [];
  function state() { return { phase, age, ownerId, source: source && { ...source }, count: swarms.length, active: phase !== 'idle' }; }
  function clear(reason = 'cancelled') {
    const wasActive = phase !== 'idle'; phase = 'idle'; swarms.length = 0; age = 0; sting = 0;
    if (wasActive) onEvent({ type: 'apiary-bees-ended', reason, ownerId });
    return wasActive;
  }
  function cast(at) {
    if (phase !== 'idle') return { ok: false, reason: 'already-active' };
    if (!finite(at)) return { ok: false, reason: 'invalid-source' };
    source = point(at); ownerId = at.ownerId ?? 'liz-beekeeper'; age = sting = 0; phase = 'windup'; sequence++;
    onEvent({ type: 'apiary-bees-windup', ownerId, at: { ...source }, duration: APIARY_BEES.tell });
    return { ok: true, count: APIARY_BEES.count, tell: APIARY_BEES.tell };
  }
  function release() {
    phase = 'swarming'; age = 0; sting = APIARY_BEES.stingEvery;
    for (let i = 0; i < APIARY_BEES.count; i++) {
      const angle = i / APIARY_BEES.count * Math.PI * 2, radius = .9 + (i % 2) * .4;
      swarms.push({ id: `liz-bees-${sequence}-${i}`, ownerId, targetId: 'player', x: source.x + Math.sin(angle) * radius,
        y: source.y + 1.2 + (i % 3) * .16, z: source.z + Math.cos(angle) * radius, angle, profile: { swarm: true } });
    }
    onEvent({ type: 'apiary-bees-cast', ownerId, count: swarms.length });
  }
  function step(dt, player) {
    age += dt;
    if (phase === 'windup') { if (age >= APIARY_BEES.tell) release(); return; }
    if (age >= APIARY_BEES.lifetime) { clear('expired'); return; }
    if (distance(source, player) > APIARY_BEES.range) { clear('escaped'); return; }
    let stinging = 0;
    for (const swarm of swarms) {
      const angle = swarm.angle + age * .85, radius = .45 + (Number(swarm.id.split('-').at(-1)) % 3) * .12;
      const target = { x: player.x + Math.sin(angle) * radius, z: player.z + Math.cos(angle) * radius };
      const gap = distance(swarm, target), travel = Math.min(gap, APIARY_BEES.speed * dt);
      const next = { x: swarm.x + (target.x - swarm.x) / (gap || 1) * travel, z: swarm.z + (target.z - swarm.z) / (gap || 1) * travel };
      // Do not draw bees flying through walls even when their target is hidden.
      if (canSee(swarm, next)) { swarm.x = next.x; swarm.z = next.z; }
      const floor = heightAt(swarm.x, swarm.z), targetY = (Number.isFinite(floor) ? floor : source.y) + 1.05 + Math.sin(angle * 1.6) * .25;
      swarm.y += (targetY - swarm.y) * Math.min(1, dt * 5);
      if (distance(swarm, player) <= APIARY_BEES.stingRange && canSee(swarm, player)) stinging++;
    }
    sting -= dt;
    if (sting <= 0) {
      sting += APIARY_BEES.stingEvery;
      if (stinging) onDamage({ source: ownerId, ownerId, targetId: 'player', kind: 'bees', damage: stinging * APIARY_BEES.stingDamage, swarmCount: stinging });
    }
  }
  function update(dt, { player, playing = true, ownerAlive = true } = {}) {
    if (!playing || phase === 'idle' || !Number.isFinite(dt) || dt <= 0) return state();
    if (!ownerAlive) { clear('caster-unavailable'); return state(); }
    if (!finite(player) || player.dead || player.action === 'dead' || (Number.isFinite(player.hp) && player.hp <= 0)) { clear('target-unavailable'); return state(); }
    let remaining = Math.min(dt, 60);
    while (remaining > 1e-8 && phase !== 'idle') { const slice = Math.min(remaining, .05); step(slice, player); remaining -= slice; }
    return state();
  }
  return { cast, update, clear, state, get active() { return phase !== 'idle'; },
    pose() { return phase === 'windup' ? { action: 'windup', casting: true, spell: 'summon-bees', progress: Math.min(1, age / APIARY_BEES.tell) } : null; },
    view() { return { projectiles: [], swarms: swarms.map(s => ({ ...s })), tell: phase === 'windup' ? { ...source, progress: age / APIARY_BEES.tell } : null }; } };
}
