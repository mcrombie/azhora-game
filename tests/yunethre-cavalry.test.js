import test from 'node:test';
import assert from 'node:assert/strict';
import {createYunethreCavalry, yunethreCavalryAutoplayInput, YUNETHRE_CAVALRY as B} from '../src/gameplay/combat/yunethre-cavalry.js';
import {cavalryContact, cavalryArmor, cavalryAngle} from '../src/gameplay/combat/yunethre-cavalry-math.js';

const near = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
function run(model, seconds, input = {}) {
  let s = model.snapshot();
  for (let n = 0; n < Math.round(seconds * 60) && !s.outcome; n++) s = model.tick(1 / 60, typeof input === 'function' ? input(s) : input);
  return s;
}
function until(model, predicate, seconds = 20, input = {}) {
  let s = model.snapshot();
  for (let n = 0; n < seconds * 60 && !s.outcome && !predicate(s); n++) s = model.tick(1 / 60, input);
  assert.ok(predicate(s), 'Expected state before timeout: ' + JSON.stringify({time: s.time, outcome: s.outcome, phases: s.units.map(u => u.phase)}));
  return s;
}
const open = (a, dx, dz) => ({x: a.x + dx, z: a.z + dz});
const stillTroops = (a, dx, dz) => a.id === 'hero' ? open(a, dx, dz) : {x: a.x, z: a.z};
const singleKnight = extra => createYunethreCavalry({side: 'centaurs', centaurStarts: [], knightStarts: [{x: 0, z: 0, heading: 0}], heroStart: {x: 0, z: 20}, ...extra});
const singleArcher = extra => createYunethreCavalry({side: 'celder', knightStarts: [], centaurStarts: [{x: 0, z: 0}], heroStart: {x: 0, z: 20}, move: stillTroops, ...extra});

test('fixed combat steps are deterministic, pause does nothing, snapshots cannot mutate the encounter', () => {
  const a = createYunethreCavalry(), b = createYunethreCavalry();
  for (let i = 0; i < 40; i++) a.tick(.1, {moveX: .2, shoot: true});
  for (let i = 0; i < 80; i++) b.tick(.05, {moveX: .2, shoot: true});
  assert.deepEqual(a.snapshot(), b.snapshot());
  const s = a.snapshot(); a.tick(0, {melee: true, shoot: false}); assert.deepEqual(a.snapshot(), s);
  s.hero.hp = 0; s.units[0].x = 10000; assert.notEqual(a.snapshot().hero.hp, 0); assert.notEqual(a.snapshot().units[0].x, 10000);
  assert.throws(() => a.tick(NaN)); assert.throws(() => a.tick(-1));
});

test('Celder advertises a committed lane before charging; walking sideways makes it miss', () => {
  const m = singleKnight();
  const warning = until(m, s => s.units[0].phase === 'charge-windup');
  const yaw = warning.units[0].aimHeading, start = warning.time;
  assert.equal(warning.hero.hp, B.hero.hp); assert.equal(warning.units[0].telegraph.kind, 'charge');
  const before = run(m, 1.2, {moveX: 1, sprint: true});
  assert.equal(before.units[0].phase, 'charge-windup'); assert.equal(before.hero.hp, B.hero.hp);
  const charge = until(m, s => s.units[0].phase === 'charge', 5, {moveX: 1, sprint: true});
  near(charge.units[0].heading, yaw); assert.ok(charge.time - start >= B.knight.windup - .02);
  const spent = until(m, s => s.units[0].phase === 'recover', 6, {moveX: 1});
  assert.equal(spent.hero.hp, B.hero.hp); assert.equal(spent.units[0].open, true); assert.ok(spent.units[0].timer >= B.knight.recovery - .02);
  near(spent.units[0].heading, yaw); assert.ok(spent.units[0].stamina < 100);
});

test('a charge causes one physical contact after warning, never damage just for entering the lane', () => {
  const m = singleKnight();
  const warning = until(m, s => s.units[0].phase === 'charge-windup');
  const struck = until(m, s => s.events.some(e => e.type === 'hit'), 10);
  const hit = struck.events.find(e => e.type === 'hit');
  assert.equal(hit.attack, 'charge'); assert.equal(hit.target, 'hero'); assert.equal(hit.damage, B.knight.damage);
  assert.ok(hit.at >= warning.time + B.knight.windup); assert.equal(struck.hero.hp, B.hero.hp - B.knight.damage);
  assert.equal(struck.units[0].phase, 'recover');
  const rest = run(m, 2); assert.equal(rest.events.filter(e => e.type === 'hit').length, 1);
});

test('terrain blocks a committed charge, and a lance cannot reach through cover', () => {
  const m = singleKnight({move: stillTroops});
  const stopped = until(m, s => s.events.some(e => e.type === 'recover' && e.reason === 'charge-obstructed'));
  assert.equal(stopped.hero.hp, B.hero.hp); assert.equal(stopped.units[0].z, 0);
  const protectedHero = singleKnight({heroStart: {x: 0, z: 2.1}, canHit: () => false});
  const s = run(protectedHero, 8); assert.equal(s.hero.hp, B.hero.hp); assert.ok(!s.events.some(e => e.type === 'hit'));
});

test('centaur arrows follow a visible draw then travel and can be sidestepped after release', () => {
  const m = singleArcher();
  const draw = until(m, s => s.units[0].phase === 'draw');
  assert.equal(draw.hero.hp, B.hero.hp); assert.equal(draw.projectiles.length, 0); assert.equal(draw.units[0].telegraph.kind, 'arrow');
  const release = until(m, s => s.projectiles.length > 0);
  assert.ok(release.time - draw.time >= B.centaur.draw - .02); assert.equal(release.hero.hp, B.hero.hp);
  const arrow = release.projectiles[0], yaw = arrow.heading;
  const after = run(m, .2, {moveX: 1, sprint: true});
  assert.equal(after.projectiles[0].heading, yaw); assert.ok(after.projectiles[0].z > arrow.z);
  const clear = run(m, .6, {moveX: 1, sprint: true});
  assert.equal(clear.hero.hp, B.hero.hp); assert.ok(clear.units[0].arrows < B.centaur.arrows);
});

test('an arrow damages the first intersected opponent, and cover or friendly bodies stop it', () => {
  const m = singleArcher();
  const struck = until(m, s => s.hero.hp < B.hero.hp);
  assert.equal(struck.hero.hp, B.hero.hp - B.centaur.damage);
  assert.equal(struck.events.filter(e => e.type === 'hit').length, 1);
  const cover = singleArcher({canHit: () => false}); assert.equal(run(cover, 8).hero.hp, B.hero.hp);
  // A second centaur directly in front screens its own formation's arrows.
  const screened = singleArcher({centaurStarts: [{x: 0, z: 0}, {x: 0, z: 5}], canHit: (a) => a.id !== 'centaur-1'});
  const held = run(screened, 8); assert.equal(held.hero.hp, B.hero.hp);
  assert.ok(held.events.some(e => e.type === 'arrow-stopped' && e.reason === 'friendly-screen'));
});

test('shield, flank and recovery apply to real contacts without cancelling a committed charge', () => {
  const knight = {kind: 'celder-knight', x: 0, z: 0, heading: 0, phase: 'charge'};
  assert.equal(cavalryArmor(knight, {x: 0, z: 1}).opening, 'shield');
  assert.equal(cavalryArmor(knight, {x: 1, z: 0}).opening, 'flank');
  assert.ok(cavalryArmor({...knight, phase: 'recover'}, {x: 0, z: 1}).scale > cavalryArmor(knight, {x: 1, z: 0}).scale);
  const front = singleKnight({heroStart: {x: 0, z: 2.2}, move: stillTroops});
  const back = singleKnight({heroStart: {x: 0, z: -2.2}, move: stillTroops});
  const f = run(front, .3, {aimX: 0, aimZ: 0, melee: true}), b = run(back, .3, {aimX: 0, aimZ: 0, melee: true});
  assert.equal(f.hero.lastStrike.opening, 'shield'); assert.equal(b.hero.lastStrike.opening, 'flank');
  assert.ok(b.hero.lastStrike.damage > f.hero.lastStrike.damage);
  const held = run(back, 2, {aimX: 0, aimZ: 0, melee: true});
  assert.equal(held.events.filter(e => e.type === 'telegraph' && e.source === 'hero').length, 1, 'Holding melee does not machine-gun attacks');
});

test('hero bow requires a draw and physical release, consumes supplies, and does not home', () => {
  const m = singleArcher({canHit: a => a.id !== 'centaur-0'});
  run(m, .15, {shoot: true, aimX: 0, aimZ: 0}); let s = m.tick(1 / 60, {shoot: false});
  assert.equal(s.hero.arrows, B.hero.arrows); assert.equal(s.hero.lastStrike.reason, 'short-draw');
  s = run(m, 1.2, {shoot: true, aimX: 0, aimZ: 0}); assert.equal(s.projectiles.length, 0);
  s = m.tick(1 / 60, {shoot: false, aimX: 0, aimZ: 0});
  assert.equal(s.hero.arrows, B.hero.arrows - 1); assert.equal(s.hero.shots, 1); assert.ok(s.hero.stamina < 100);
  const yaw = s.projectiles[0].heading;
  s = run(m, .1, {aimX: 30, aimZ: 30}); near(s.projectiles[0].heading, yaw);
  s = until(m, s => s.units[0].hp < B.centaur.hp); assert.equal(s.hero.lastStrike.kind, 'hit');
});

test('a rider must turn into the visible bow arc before releasing; a rejected rear shot costs no arrow', () => {
  const m = singleArcher({mounted: true, heroStart: {x: 0, z: 20, heading: 0}, canHit: a => a.id !== 'centaur-0'});
  run(m, 1.2, {shoot: true, aimX: 0, aimZ: 0}); let s = m.tick(1 / 60, {aimX: 0, aimZ: 0});
  assert.equal(s.hero.aimBlocked, true); assert.equal(s.hero.lastStrike.reason, 'turn-to-target'); assert.equal(s.hero.arrows, B.hero.arrows);
  run(m, 1.2, {shoot: true, moveZ: -1, aimX: 0, aimZ: 0}); s = m.tick(1 / 60, {aimX: 0, aimZ: 0});
  assert.equal(s.hero.aimBlocked, false); assert.equal(s.hero.arrows, B.hero.arrows - 1);
  assert.ok(Math.abs(cavalryAngle(s.projectiles.find(p => p.owner === 'hero').heading, s.hero.heading)) <= B.bowArc);
});

test('mounted motion has acceleration and a turning radius; a surge spends stamina without invulnerability', () => {
  const m = singleKnight({mounted: true, heroStart: {x: -15, z: -10}, move: (a, x, z) => a.id === 'hero' ? open(a, x, z) : {x: a.x, z: a.z}});
  let s = run(m, 2, {moveX: 0, moveZ: 1, sprint: true}); const heading = s.hero.heading, stamina = s.hero.stamina;
  s = m.tick(1 / 60, {moveX: 0, moveZ: -1, dodge: true});
  assert.ok(Math.abs(cavalryAngle(s.hero.heading, heading)) <= .6 / 60 + 1e-8);
  assert.equal(s.hero.phase, 'surge'); assert.ok(s.hero.stamina < stamina - 20); assert.ok(s.hero.aimError > 0);
  const foot = singleKnight({heroStart: {x: -15, z: -10}});
  const f = foot.tick(1 / 60, {moveX: 1, dodge: true}); assert.equal(f.hero.phase, 'dodge'); assert.ok(f.hero.x > -15);
  assert.ok(f.hero.dodge <= .3 && f.hero.dodgeCooldown > .9);
});

test('foot evasion needs the contact window; a late dodge and a mounted surge still receive a connecting arrow', () => {
  for (const [mounted, distanceAtDodge, expected] of [[false, 5, 'dodged'], [false, 1, 'hit'], [true, 5, 'hit']]) {
    const m = singleArcher({mounted, move: a => ({x: a.x, z: a.z})});
    until(m, s => s.projectiles.some(p => Math.hypot(p.x - s.hero.x, p.z - s.hero.z) < distanceAtDodge));
    m.tick(1 / 60, {dodge: true}); const s = run(m, .3);
    assert.equal(s.hero.lastDefense.kind, expected);
    assert.equal(s.hero.hp, expected === 'dodged' ? B.hero.hp : B.hero.hp - B.centaur.damage);
    if (mounted) assert.equal(s.hero.lastDefense.reason, 'mounted-surge-is-not-invulnerable');
    else if (expected === 'hit') assert.equal(s.hero.lastDefense.reason, 'outside-dodge-window');
  }
});

test('battlefield bounds are applied before terrain movement and never project a world slide through cover', () => {
  const requests = [];
  const m = singleKnight({radius: 25, heroStart: {x: 23, z: 0}, move(a, dx, dz) {
    requests.push({x: a.x + dx, z: a.z + dz, body: a.bodyRadius});
    return a.id === 'hero' ? {x: 100, z: 100} : open(a, dx, dz);
  }});
  const s = run(m, 2, {moveX: 1, sprint: true}); near(s.hero.x, 23); near(s.hero.z, 0);
  assert.ok(requests.every(p => Math.hypot(p.x, p.z) <= 25 - p.body + 1e-8));
  assert.throws(() => singleKnight({radius: 12})); assert.throws(() => createYunethreCavalry({knightStarts: []}));
});

test('swept contacts catch fast crossings but not parallel misses', () => {
  near(cavalryContact({x: 0, z: 0}, {x: 20, z: 0}, {x: 10, z: 0}, 1), .45);
  assert.equal(cavalryContact({x: 0, z: 2}, {x: 20, z: 2}, {x: 10, z: 0}, 1), null);
  assert.equal(cavalryContact({x: 0, z: 0}, {x: 0, z: 0}, {x: 0, z: 0}, 1), 0);
});

test('rehearsal uses ordinary controls on either side, stays bounded, and resolves without campaign mutation', () => {
  for (const side of ['centaurs', 'celder']) {
    const m = createYunethreCavalry({side, mounted: true, radius: 38}); let s = m.snapshot(), released = 0, lastId = 0;
    while (!s.outcome && s.time < 181) {
      s = m.tick(.1, yunethreCavalryAutoplayInput(s));
      for (const e of s.events) if (e.id > lastId && e.type === 'release') released++;
      lastId = s.events.at(-1)?.id ?? 0;
      assert.ok(s.projectiles.length <= B.maxProjectiles);
      assert.ok([s.hero, ...s.units].every(u => u.stamina >= 0 && u.stamina <= 100 && u.hp >= 0 && Math.hypot(u.x, u.z) <= 38 - u.bodyRadius + 1e-7));
    }
    assert.ok(s.outcome); assert.ok(released > 3); assert.ok(s.time > 40 && s.time <= 181, 'The set piece has time for several readable passes');
    assert.ok(['victory', 'defeat'].includes(s.outcome.result)); assert.ok(s.hero.shots > 0);
    const frozen = m.snapshot(); m.tick(1, {shoot: true, melee: true}); assert.deepEqual(m.snapshot(), frozen);
  }
});

test('withdrawal is explicit and idempotent; a visible deadline bounds a blocked battle', () => {
  const m = singleKnight(), first = m.withdraw(); assert.equal(first.outcome.result, 'withdrawal'); assert.equal(first.outcome.winner, 'celder');
  assert.deepEqual(m.withdraw(), first);
  const waiting = singleKnight({move: a => ({x: a.x, z: a.z}), canHit: () => false, timeLimit: 4});
  const s = run(waiting, 5); assert.equal(s.outcome.reason, 'battle-deadline'); assert.equal(s.remaining, 0);
  assert.equal(s.hero.hp, B.hero.hp); assert.equal(s.units[0].hp, B.knight.hp);
});
