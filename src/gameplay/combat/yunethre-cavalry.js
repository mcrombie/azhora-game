import {moveEncounterBody} from './encounter-space.js';
import {cavalryAngle as angle, cavalryClamp as clamp, cavalryTurn as turn, cavalryContact, cavalryArmor} from './yunethre-cavalry-math.js';

// This is one physical encounter, not another campaign simulation. The host
// submits its final result to campaign.js; peace and political consequences stay there.
export const YUNETHRE_CAVALRY = Object.freeze({
  step: 1 / 60, radius: 52, timeLimit: 180, maxProjectiles: 12, bowArc: 1.7,
  centaur: Object.freeze({hp: 195, speed: 6.1, draw: 1.25, recovery: 1.7, arrows: 24, damage: 15}),
  knight: Object.freeze({hp: 335, speed: 5, chargeSpeed: 11.5, windup: 1.5, recovery: 3.2, damage: 32}),
  hero: Object.freeze({hp: 100, footSpeed: 4.6, horseSpeed: 7.4, draw: 1.1, arrows: 48, damage: 25}),
});
const B = YUNETHRE_CAVALRY, finitePoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z), copy = value => structuredClone(value);
const forward = (p, amount) => ({x: p.x + Math.sin(p.heading) * amount, z: p.z + Math.cos(p.heading) * amount});
const otherSide = side => side === 'centaurs' ? 'celder' : 'centaurs';

/** Camera-relative input is converted by the host into world moveX/moveZ.
 * aimX/aimZ are a world target point. shoot is held/released; melee and dodge
 * are edge-triggered. mounted is the desired mode, changed only at low speed.
 * move(actor,dx,dz) clips against terrain; canHit(from,to) checks the whole segment.
 * All clocks, damage, projectiles and actions are owned here and pause with dt. */
export function createYunethreCavalry({side = 'centaurs', origin = {x: 0, z: 0}, heroStart = null,
  mounted = false, centaurStarts = null, knightStarts = null, move = null, canHit = () => true,
  timeLimit = B.timeLimit, radius = B.radius} = {}) {
  if (!['centaurs', 'celder'].includes(side) || !finitePoint(origin) || !(timeLimit > 0) || !Number.isFinite(timeLimit)
    || !Number.isFinite(radius) || radius < 8)
    throw Error('The Yunethre encounter needs a side, finite origin and positive deadline.');
  centaurStarts ??= [-12, -4, 4, 12].map(x => ({x: origin.x + x, z: origin.z - 14}));
  knightStarts ??= [-10, 0, 10].map(x => ({x: origin.x + x, z: origin.z + 18}));
  heroStart ??= {x: origin.x, z: origin.z + (side === 'centaurs' ? -25 : 29)};
  if (!finitePoint(heroStart) || [centaurStarts, knightStarts].some(list => !Array.isArray(list) || list.length > 12 || list.some(p => !finitePoint(p))))
    throw Error('Use up to twelve valid starts for each mounted formation.');
  if (!(side === 'centaurs' ? knightStarts : centaurStarts).length) throw Error('The battle needs an opposing formation.');
  if ([heroStart, ...centaurStarts, ...knightStarts].some(p => distance(p, origin) > radius - .9))
    throw Error('Combatants must start inside the battlefield.');
  let serial = 0, projectileId = 0, accumulator = 0, nextVolley = .8, nextCharge = 1.2;
  let previousShoot = false, previousMelee = false, previousDodge = false;
  const h = {id: 'hero', kind: 'hero', side, x: heroStart.x, z: heroStart.z, heading: heroStart.heading ?? (side === 'centaurs' ? 0 : Math.PI),
    aimHeading: heroStart.heading ?? (side === 'centaurs' ? 0 : Math.PI), hp: B.hero.hp, maxHp: B.hero.hp,
    stamina: 100, mounted: !!mounted, bodyRadius: mounted ? .8 : .45, speed: 0, phase: 'ready', timer: 0,
    draw: 0, arrows: B.hero.arrows, shots: 0, swing: 0, dodge: 0, dodgeCooldown: 0, cooldown: 0,
    hurt: 0, hitGrace: 0, aimError: 0, aimBlocked: false, dodgeObstruction: null, dodgeStartedAt: null, lastStrike: null, lastDefense: null};
  const units = [
    ...centaurStarts.map((p, i) => ({id: 'centaur-' + i, kind: 'centaur-archer', side: 'centaurs', ...p, heading: p.heading ?? 0,
      maxHp: B.centaur.hp, hp: B.centaur.hp, arrows: B.centaur.arrows, bodyRadius: .8, slot: i, flank: i % 2 ? 1 : -1})),
    ...knightStarts.map((p, i) => ({id: 'knight-' + i, kind: 'celder-knight', side: 'celder', ...p, heading: p.heading ?? Math.PI,
      maxHp: B.knight.hp, hp: B.knight.hp, bodyRadius: .85, slot: i, flank: i % 2 ? 1 : -1})),
  ].map(u => ({...u, stamina: 100, speed: 0, phase: 'maneuver', timer: .4 + u.slot * .4,
    targetId: null, aimHeading: u.heading, hurt: 0, open: false, telegraph: null, attacks: 0, shots: 0, contact: false}));
  const state = {time: 0, timeLimit, remaining: timeLimit, radius, side, origin: {...origin}, hero: h, units, projectiles: [], events: [], outcome: null};
  const bodies = () => [h, ...units].filter(u => u.hp > 0);
  const enemies = unit => bodies().filter(u => u.side !== unit.side);
  const targetFor = unit => enemies(unit).sort((a, b) => distance(unit, a) - distance(unit, b) || a.id.localeCompare(b.id))[0];
  function event(type, fields = {}) {
    state.events.push({id: ++serial, at: state.time, type, ...fields});
    if (state.events.length > 96) state.events.shift();
  }
  function finish(result, reason) {
    if (state.outcome) return;
    state.outcome = {result, winner: result === 'victory' ? side : otherSide(side), reason, at: state.time};
    state.projectiles.length = 0; h.draw = 0; h.swing = 0; h.dodge = 0; h.speed = 0; h.phase = 'finished';
    for (const u of units) {u.speed = 0; u.telegraph = null; if (u.hp > 0) u.phase = 'finished';}
    event('result', state.outcome);
  }
  function advance(actor, dx, dz) {
    const next = moveEncounterBody(actor, dx, dz, bodies(), (p, x, z) => {
      // Constrain the request before the terrain callback. Projecting its result
      // afterwards could put a world-slide behind a wall or inside a building.
      let request = {x: p.x + x, z: p.z + z};
      const ox = request.x - origin.x, oz = request.z - origin.z, d = Math.hypot(ox, oz), limit = radius - actor.bodyRadius;
      if (d > limit) request = {x: origin.x + ox / d * limit, z: origin.z + oz / d * limit};
      const candidate = move ? move(p, request.x - p.x, request.z - p.z) : request;
      return finitePoint(candidate) && distance(candidate, origin) <= limit + 1e-8 ? candidate : {x: p.x, z: p.z};
    });
    actor.x = next.x; actor.z = next.z; return next.obstruction;
  }
  function steer(u, desired, speed, dt, turnRate = 1.4) {
    u.heading = turn(u.heading, desired, turnRate, dt);
    speed *= Math.max(.15, Math.cos(angle(desired, u.heading)));
    u.speed += clamp(speed - u.speed, -8 * dt, 4 * dt);
    const before = {x: u.x, z: u.z};
    const obstacle = advance(u, Math.sin(u.heading) * u.speed * dt, Math.cos(u.heading) * u.speed * dt);
    u.speed = distance(u, before) / dt;
    return obstacle;
  }
  function damage(target, amount, source, attack) {
    if (target.hp <= 0) return;
    if (target === h && h.dodge > 0 && !h.mounted && h.dodge <= .23 && h.dodge >= .06) {
      h.lastDefense = {at: state.time, kind: 'dodged', attack, source: source.id}; event('evaded', {source: source.id, target: h.id, attack}); return;
    }
    if (target === h && h.hitGrace > 0) return;
    const armor = cavalryArmor(target, source), loss = Math.min(target.hp, Math.max(1, Math.round(amount * armor.scale)));
    target.hp -= loss; target.hurt = .25;
    event('hit', {source: source.id, target: target.id, damage: loss, attack, opening: armor.opening});
    if (target === h) {
      h.hitGrace = .22;
      h.lastDefense = {at: state.time, kind: 'hit', attack, source: source.id, damage: loss,
        reason: h.mounted && h.dodge > 0 ? 'mounted-surge-is-not-invulnerable' : h.dodge > 0 ? 'outside-dodge-window'
          : h.dodgeStartedAt !== null && state.time - h.dodgeStartedAt < .65 ? 'dodge-ended' : 'contact'};
    }
    if (source.id === h.id) h.lastStrike = {at: state.time, kind: 'hit', target: target.id, damage: loss, opening: armor.opening};
    if (!target.hp) {target.phase = 'down'; target.speed = 0; target.telegraph = null; event('down', {target: target.id, side: target.side});}
  }
  function launch(owner, yaw, amount, range, kind = 'arrow') {
    if (state.projectiles.length >= B.maxProjectiles) return false;
    const from = forward({...owner, heading: yaw}, .5);
    if (!canHit(owner, from)) return false;
    state.projectiles.push({id: 'cavalry-arrow-' + ++projectileId, owner: owner.id, side: owner.side, kind,
      x: from.x, z: from.z, dx: Math.sin(yaw), dz: Math.cos(yaw), heading: yaw, speed: 34, remaining: range, damage: amount});
    event('release', {source: owner.id, heading: yaw, projectile: 'cavalry-arrow-' + projectileId}); return true;
  }
  function fly(dt) {
    state.projectiles = state.projectiles.filter(p => {
      const travel = Math.min(p.remaining, p.speed * dt), to = {x: p.x + p.dx * travel, z: p.z + p.dz * travel};
      if (!canHit(p, to)) {event('arrow-stopped', {source: p.owner, reason: 'cover'}); return false;}
      let first = null, fraction = Infinity;
      for (const b of bodies()) {
        if (b.id === p.owner) continue;
        const t = cavalryContact(p, to, b, b.bodyRadius + .07);
        if (t !== null && t < fraction) {first = b; fraction = t;}
      }
      if (first) {
        // Friends screen shafts; they are never intentionally damaged by this local set piece.
        if (first.side !== p.side) damage(first, p.damage, {id: p.owner, kind: 'arrow', x: p.x - p.dx, z: p.z - p.dz}, 'arrow');
        else event('arrow-stopped', {source: p.owner, target: first.id, reason: 'friendly-screen'});
        return false;
      }
      p.x = to.x; p.z = to.z; p.remaining -= travel; return p.remaining > 0;
    });
  }
  function recover(u, seconds, reason) {
    u.phase = 'recover'; u.timer = seconds; u.open = true; u.telegraph = null; u.speed = 0;
    event('recover', {source: u.id, reason, duration: seconds});
  }
  function mark(u, kind, seconds, length, yaw) {
    u.aimHeading = yaw; u.phase = kind === 'charge' ? 'charge-windup' : kind === 'arrow' ? 'draw' : 'melee-windup';
    u.timer = seconds; u.contact = false; u.open = false; u.attacks++;
    u.telegraph = {kind, from: {x: u.x, z: u.z}, to: forward({...u, heading: yaw}, length), remaining: seconds, width: kind === 'charge' ? 1.6 : .2};
    event('telegraph', {source: u.id, target: u.targetId, attack: kind, duration: seconds});
  }
  function meleeContact(u, yaw, range, amount, attack) {
    const target = enemies(u).filter(t => distance(u, t) <= range && Math.abs(angle(Math.atan2(t.x - u.x, t.z - u.z), yaw)) < Math.PI / 3 && canHit(u, t))
      .sort((a, b) => distance(u, a) - distance(u, b))[0];
    if (target) {
      const screen = bodies().some(b => b !== u && b !== target && cavalryContact(u, target, b, b.bodyRadius) !== null);
      if (!screen) {damage(target, amount, u, attack); return true;}
    }
    return false;
  }
  function centaur(u, target, dt) {
    if (u.phase === 'recover') {
      u.timer -= dt; u.stamina = Math.min(100, u.stamina + 15 * dt);
      if (u.timer <= 0) {u.phase = 'maneuver'; u.open = false; u.timer = .6;} return;
    }
    const d = distance(u, target), radial = Math.atan2(target.x - u.x, target.z - u.z);
    const tangent = radial + u.flank * Math.PI / 2;
    const desired = !u.arrows ? radial : d < 12 ? radial + Math.PI - u.flank * .35 : d > 23 ? radial : tangent + u.flank * (d - 18) * .07;
    const bodyDesired = u.phase === 'draw' ? u.aimHeading - clamp(angle(u.aimHeading, desired), -1.5, 1.5) : desired;
    steer(u, bodyDesired, u.phase === 'draw' ? 2.8 : u.arrows ? B.centaur.speed : 3.7, dt, 1.7);
    u.stamina = Math.max(0, u.stamina - (u.phase === 'draw' ? 1 : 2.1) * dt);
    if (u.phase === 'draw') {
      u.timer -= dt;
      // The final half-second is a visible commitment, not homing aim.
      if (u.timer > .5) u.aimHeading = Math.atan2(target.x - u.x, target.z - u.z);
      u.telegraph = {...u.telegraph, from: {x: u.x, z: u.z}, to: forward({...u, heading: u.aimHeading}, 36), remaining: Math.max(0, u.timer)};
      if (u.timer <= 0) {
        const aligned = Math.abs(angle(u.aimHeading, u.heading)) <= B.bowArc;
        const clear = aligned && canHit(u, u.telegraph.to);
        if (clear && launch(u, u.aimHeading, B.centaur.damage, 42)) {u.arrows--; u.shots++; u.stamina = Math.max(0, u.stamina - 10);}
        recover(u, B.centaur.recovery, clear ? 'volley-released' : aligned ? 'cover' : 'target-outside-bow-arc');
      }
      return;
    }
    u.timer = Math.max(0, u.timer - dt);
    if (u.stamina < 24) {recover(u, 3.2, 'catching-breath'); return;}
    if (d < 3.1 && (!u.arrows || d < 2.5)) {mark(u, 'melee', .8, 2.9, radial); return;}
    if (u.arrows && !u.timer && d >= 8 && d < 34 && state.time >= nextVolley && units.filter(a => a.phase === 'draw').length < 2
      && state.projectiles.length < B.maxProjectiles && Math.abs(angle(radial, u.heading)) <= B.bowArc && canHit(u, target)) {
      mark(u, 'arrow', B.centaur.draw, 36, Math.atan2(target.x - u.x, target.z - u.z)); nextVolley = state.time + .8;
    }
  }
  function knight(u, target, dt) {
    if (u.phase === 'recover') {
      u.timer -= dt; u.stamina = Math.min(100, u.stamina + 13 * dt);
      if (u.timer <= 0) {u.phase = 'maneuver'; u.open = false; u.timer = .6;} return;
    }
    if (u.phase === 'charge-windup') {
      u.timer -= dt; u.speed = Math.max(0, u.speed - dt * 8); u.heading = turn(u.heading, u.aimHeading, 1.2, dt);
      u.telegraph.remaining = Math.max(0, u.timer);
      if (u.timer <= 0) {
        u.phase = 'charge'; u.heading = u.aimHeading; u.timer = 3.2; u.chargeRemaining = distance(u, u.telegraph.to);
        u.stamina = Math.max(0, u.stamina - 32); event('charge', {source: u.id, heading: u.heading});
      }
      return;
    }
    if (u.phase === 'charge') {
      const from = forward(u, 1.4), before = {x: u.x, z: u.z};
      u.speed = Math.min(B.knight.chargeSpeed, u.speed + 15 * dt);
      const obstruction = advance(u, Math.sin(u.heading) * u.speed * dt, Math.cos(u.heading) * u.speed * dt), to = forward(u, 1.4);
      u.chargeRemaining -= distance(before, u); u.timer -= dt;
      let contact = null, fraction = Infinity;
      if (u.speed >= 5) for (const target of enemies(u)) {
        const t = cavalryContact(from, to, target, target.bodyRadius + .3);
        if (t !== null && t < fraction && canHit(u, target)) {contact = target; fraction = t;}
      }
      if (contact && !u.contact) {u.contact = true; damage(contact, B.knight.damage, u, 'charge'); recover(u, B.knight.recovery, 'charge-contact');}
      else if (obstruction || u.timer <= 0 || u.chargeRemaining <= 0) recover(u, B.knight.recovery, obstruction ? 'charge-obstructed' : 'charge-missed');
      return;
    }
    u.timer = Math.max(0, u.timer - dt); u.stamina = Math.min(100, u.stamina + 2 * dt);
    const d = distance(u, target), yaw = Math.atan2(target.x - u.x, target.z - u.z);
    if (d < 3.3 && !u.timer) {mark(u, 'melee', .85, 3, yaw); return;}
    if (d >= 9 && d <= 30 && !u.timer && u.stamina >= 40 && Math.abs(angle(yaw, u.heading)) < .35 && state.time >= nextCharge) {
      mark(u, 'charge', B.knight.windup, Math.min(34, d + 8), yaw); nextCharge = state.time + 2.5; return;
    }
    if (u.stamina < 24) {recover(u, 3.5, 'spent-horse'); return;}
    steer(u, yaw, d < 4 ? 1.3 : B.knight.speed, dt, u.speed > 3 ? 1 : 1.8);
  }
  function updateUnit(u, dt) {
    if (u.hp <= 0) return;
    u.hurt = Math.max(0, u.hurt - dt);
    const target = targetFor(u); if (!target) return; u.targetId = target.id;
    if (u.phase === 'melee-windup') {
      u.speed = 0; u.timer -= dt; u.telegraph.remaining = Math.max(0, u.timer);
      if (u.timer <= 0) {
        u.phase = 'melee-strike'; u.timer = .3; u.contact = false; u.telegraph = null;
      }
      return;
    }
    if (u.phase === 'melee-strike') {
      u.speed = 0; u.timer -= dt;
      if (!u.contact && u.timer <= .22) {u.contact = true; meleeContact(u, u.aimHeading, 3, u.kind === 'celder-knight' ? 20 : 14, 'melee');}
      if (u.timer <= 0) recover(u, 2.1, 'melee-finished');
      return;
    }
    if (u.kind === 'centaur-archer') centaur(u, target, dt); else knight(u, target, dt);
  }
  function heroInput(dt, input, edges) {
    for (const key of ['cooldown', 'dodgeCooldown', 'dodge', 'swing', 'hurt', 'hitGrace']) h[key] = Math.max(0, h[key] - dt);
    if (typeof input.mounted === 'boolean' && input.mounted !== h.mounted && h.speed < 1 && !h.draw && !h.swing && !h.dodge) {
      const radius = input.mounted ? .8 : .45;
      if (bodies().every(b => b === h || distance(h, b) >= radius + b.bodyRadius)) {h.mounted = input.mounted; h.bodyRadius = radius; event('mount', {mounted: h.mounted});}
    }
    const x = Number.isFinite(input.moveX) ? clamp(input.moveX, -1, 1) : 0, z = Number.isFinite(input.moveZ) ? clamp(input.moveZ, -1, 1) : 0;
    const length = Math.hypot(x, z), desired = length ? Math.atan2(x, z) : h.heading;
    if (Number.isFinite(input.aimX) && Number.isFinite(input.aimZ) && Math.hypot(input.aimX - h.x, input.aimZ - h.z) > .01)
      h.aimHeading = Math.atan2(input.aimX - h.x, input.aimZ - h.z);
    else if (length && !h.swing) h.aimHeading = desired;
    if (edges.dodge && !h.dodgeCooldown && h.stamina >= (h.mounted ? 23 : 18) && !h.swing) {
      h.dodge = h.mounted ? .65 : .3; h.dodgeCooldown = h.mounted ? 2.2 : .95; h.stamina -= h.mounted ? 23 : 18; h.draw = 0;
      h.dodgeHeading = length ? desired : h.heading + Math.PI / 2; h.dodgeObstruction = null; h.dodgeStartedAt = state.time;
      event(h.mounted ? 'surge' : 'dodge', {source: h.id});
    } else if (edges.dodge) {
      const reason = h.dodgeCooldown ? 'cooldown' : h.stamina < (h.mounted ? 23 : 18) ? 'tired' : 'swing-committed';
      h.lastDefense = {at: state.time, kind: 'dodge-unavailable', reason, readyIn: h.dodgeCooldown};
      event('action-refused', {source: h.id, attack: h.mounted ? 'surge' : 'dodge', reason});
    }
    if (edges.melee && !h.cooldown && !h.dodge && h.stamina >= 10) {
      h.phase = 'melee'; h.swing = .5; h.cooldown = .9; h.stamina -= 10; h.draw = 0; h.swingHeading = h.aimHeading; h.contact = false;
      event('telegraph', {source: h.id, attack: 'melee', duration: .22});
    }
    const fast = !!input.sprint && h.stamina > 5 && !h.draw && !h.swing;
    let speed = length ? (h.mounted ? (fast ? 10.6 : B.hero.horseSpeed) : (fast ? 6.2 : B.hero.footSpeed)) * Math.min(1, length) : 0;
    if (h.swing) speed *= .5;
    if (h.draw) speed *= h.mounted ? .85 : .6;
    if (h.dodge) {
      if (h.mounted) {speed = 13; h.heading = turn(h.heading, desired, .6, dt);}
      else {speed = 8.8; h.heading = h.dodgeHeading;}
    } else h.heading = h.mounted ? turn(h.heading, desired, h.speed > 7 ? .9 : 1.8, dt)
      : h.swing ? h.swingHeading : h.draw ? h.aimHeading : length ? desired : h.aimHeading;
    h.speed += clamp(speed - h.speed, -(h.mounted ? 10 : 40) * dt, (h.mounted ? 6 : 40) * dt);
    const movementHeading = h.mounted ? h.heading : h.dodge ? h.dodgeHeading : desired;
    const before = {x: h.x, z: h.z}, obstruction = advance(h, Math.sin(movementHeading) * h.speed * dt, Math.cos(movementHeading) * h.speed * dt);
    h.speed = distance(h, before) / dt;
    if (h.dodge && obstruction && !h.dodgeObstruction) {
      h.dodgeObstruction = {...obstruction}; h.lastDefense = {at: state.time, kind: 'dodge-obstructed', reason: obstruction.kind};
    }
    h.aimError = h.mounted ? h.speed / 10.6 * .13 : h.speed / 6.2 * .055;
    h.aimBlocked = h.mounted && Math.abs(angle(h.aimHeading, h.heading)) > B.bowArc;
    h.stamina = clamp(h.stamina + (fast && length ? -8 : h.draw || h.swing || h.dodge ? 0 : 11) * dt, 0, 100);
    if (h.swing && h.swing <= .28 && !h.contact) {
      h.contact = true;
      if (!meleeContact(h, h.swingHeading, h.mounted ? 3.2 : 2.8, B.hero.damage, 'melee')) h.lastStrike = {at: state.time, kind: 'miss', reason: 'no-clear-contact'};
    }
    if (input.shoot && !h.swing && !h.dodge && h.arrows && h.stamina >= 7 && !h.cooldown) {
      h.draw = Math.min(B.hero.draw, h.draw + dt); h.phase = 'draw'; h.stamina = Math.max(0, h.stamina - 2 * dt);
    }
    if (edges.release && h.draw > 0) {
      const pull = h.draw / B.hero.draw;
      if (pull >= .32 && h.stamina >= 6 && !h.aimBlocked) {
        let yaw = h.aimHeading + Math.sin((h.shots + 1) * 2.3999632297) * h.aimError;
        if (h.mounted) yaw = h.heading + clamp(angle(yaw, h.heading), -B.bowArc, B.bowArc);
        if (launch(h, yaw, Math.round(B.hero.damage * (.45 + pull * .55)), 30 + pull * 25)) {
          h.arrows--; h.shots++; h.stamina -= 6; h.cooldown = .3; h.lastStrike = {at: state.time, kind: 'released', heading: yaw, pull};
        }
      } else {
        h.lastStrike = {at: state.time, kind: 'cancelled', reason: h.aimBlocked ? 'turn-to-target' : h.stamina < 6 ? 'tired' : 'short-draw'};
        event('action-refused', {source: h.id, attack: 'bow', reason: h.lastStrike.reason});
      }
      h.draw = 0;
    }
    if (!h.swing && !h.draw) h.phase = h.dodge ? (h.mounted ? 'surge' : 'dodge') : h.speed > .1 ? 'move' : 'ready';
  }
  function step(dt, input, edges) {
    state.time += dt; state.remaining = Math.max(0, timeLimit - state.time);
    heroInput(dt, input, edges);
    for (const u of units) updateUnit(u, dt);
    fly(dt);
    if (!h.hp) finish('defeat', 'hero-defeated');
    else if (!units.some(u => u.side !== side && u.hp > 0)) finish('victory', 'opposing-formation-broken');
    else if (state.time >= timeLimit) {
      const strength = team => units.filter(u => u.side === team).reduce((sum, u) => sum + u.hp / u.maxHp, 0) + (team === side ? h.hp / h.maxHp : 0);
      finish(strength(side) > strength(otherSide(side)) ? 'victory' : 'defeat', 'battle-deadline');
    }
  }
  let pending = {melee: false, dodge: false, release: false};
  function tick(dt, input = {}) {
    if (!Number.isFinite(dt) || dt < 0 || dt > 1) throw Error('Cavalry steps must be between zero and one second.');
    if (!dt || state.outcome) return snapshot();
    pending.melee ||= !!input.melee && !previousMelee; pending.dodge ||= !!input.dodge && !previousDodge;
    pending.release ||= previousShoot && !input.shoot;
    previousMelee = !!input.melee; previousDodge = !!input.dodge; previousShoot = !!input.shoot;
    accumulator += dt;
    while (accumulator + 1e-10 >= B.step && !state.outcome) {
      accumulator = Math.max(0, accumulator - B.step); step(B.step, input, pending); pending = {melee: false, dodge: false, release: false};
    }
    return snapshot();
  }
  const snapshot = () => copy(state);
  return {tick, snapshot, withdraw() {finish('withdrawal', 'hero-withdrew'); return snapshot();}};
}

/** F8 rehearsal driver: the same public inputs and resources as a person.
 * It observes advertised lanes, rides/walks clear, aims and releases normal shots.
 * It never edits health, positions, deadlines, ammunition or campaign commands. */
export function yunethreCavalryAutoplayInput(s) {
  if (!s || s.outcome) return {};
  const h = s.hero, foes = s.units.filter(u => u.hp > 0 && u.side !== h.side)
    .sort((a, b) => distance(h, a) - distance(h, b));
  const target = foes[0]; if (!target) return {};
  const d = distance(h, target), radial = Math.atan2(target.x - h.x, target.z - h.z);
  let heading = !h.arrows ? radial : d < 12 ? radial + Math.PI + .3 : d > 24 ? radial : radial + Math.PI / 2;
  if (distance(h, s.origin) > s.radius - 8) heading = Math.atan2(s.origin.x - h.x, s.origin.z - h.z);
  const threat = foes.find(u => u.telegraph?.kind === 'charge' && ['charge-windup', 'charge'].includes(u.phase)
    && cavalryContact(u.telegraph.from, u.telegraph.to, h, 4) !== null);
  if (threat) heading = threat.aimHeading + (Math.sin(radial - threat.aimHeading) >= 0 ? 1 : -1) * Math.PI / 2;
  const flight = d / 34, lead = target.phase === 'maneuver' ? Math.min(.65, flight) : target.phase === 'charge' ? flight : 0;
  const aimX = target.x + Math.sin(target.heading) * target.speed * lead, aimZ = target.z + Math.cos(target.heading) * target.speed * lead;
  const close = d < (h.mounted ? 3.2 : 2.8);
  return {moveX: Math.sin(heading), moveZ: Math.cos(heading), sprint: !!threat,
    aimX, aimZ, shoot: !close && h.arrows > 0 && s.time % 1.65 < 1.2 && (!h.mounted || Math.abs(angle(radial, h.heading)) <= B.bowArc),
    melee: close && Math.floor(s.time * 5) % 6 === 0, dodge: !!threat && threat.telegraph.remaining < .25};
}
