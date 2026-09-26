/** Kayla and Ed race on the ordinary Ossen road. Collision belongs to the host. */
import { OSSEN_TRACK, CALOSS_ELAGOS_ROAD } from './elagos-world.js';

const freeze = Object.freeze, point = p => freeze({ x: p.x, z: p.z });
export const KAYLA_RACE = freeze({ id: 'kayla-race', title: 'The Honey Race', reward: 3,
  countdown: 3, speed: 8.4, walkSpeed: 6.4, edSpeed: 7.6, radius: .8, edRadius: .46 });
// The Ossen Gate is Ambron's east gate. Both lanes follow the same road bends,
// so neither runner cuts across Lake Ossen or gets a hidden teleport advantage.
export const KAYLA_RACE_ROUTE = freeze([
  ...OSSEN_TRACK.slice(1), ...CALOSS_ELAGOS_ROAD.slice(0, -1).reverse(),
].map(point));
function lane(offset) {
  return freeze(KAYLA_RACE_ROUTE.map((at, i, route) => {
    const a = route[Math.max(0, i - 1)], b = route[Math.min(route.length - 1, i + 1)];
    const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    return point({ x: at.x - dz / length * offset, z: at.z + dx / length * offset });
  }));
}
export const KAYLA_RACE_LANE = lane(-1.1), ED_RACE_LANE = lane(1.1);
export const KAYLA_RACE_START = freeze({ ...KAYLA_RACE_LANE[0],
  yaw: Math.atan2(KAYLA_RACE_LANE[1].x - KAYLA_RACE_LANE[0].x, KAYLA_RACE_LANE[1].z - KAYLA_RACE_LANE[0].z) });
export const KAYLA_RACE_FINISH = KAYLA_RACE_ROUTE.at(-1);
const stages = ['available', 'countdown', 'racing', 'won', 'lost', 'returning', 'complete'];
const mountedStage = stage => ['countdown', 'racing', 'returning'].includes(stage);
const validPoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.z)
  && Math.abs(p.x) < 10000 && Math.abs(p.z) < 10000;
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const newRunner = route => ({ ...route[0], yaw: KAYLA_RACE_START.yaw, next: 1, returnNext: 0, speed: 0 });
const fresh = () => ({ version: 1, stage: 'available', attempts: 0, countdown: 3, elapsed: 0,
  reason: '', kayla: newRunner(KAYLA_RACE_LANE), ed: newRunner(ED_RACE_LANE) });
const copy = s => ({ ...s, kayla: { ...s.kayla }, ed: { ...s.ed } });
export function validateKaylaRaceSnapshot(s, { allowMissing = true } = {}) {
  if (s === undefined) return allowMissing;
  if (!s || s.version !== 1 || !stages.includes(s.stage) || !Number.isInteger(s.attempts)
    || s.attempts < 0 || s.attempts > 100000 || !Number.isFinite(s.countdown) || s.countdown < 0 || s.countdown > 3
    || !Number.isFinite(s.elapsed) || s.elapsed < 0 || s.elapsed > 86400 || typeof s.reason !== 'string' || s.reason.length > 160) return false;
  for (const runner of [s.kayla, s.ed]) if (!validPoint(runner) || !Number.isFinite(runner.yaw)
    || !Number.isFinite(runner.speed) || runner.speed < 0 || runner.speed > KAYLA_RACE.speed
    || !Number.isInteger(runner.next) || runner.next < 1 || runner.next > KAYLA_RACE_ROUTE.length
    || !Number.isInteger(runner.returnNext) || runner.returnNext < -1 || runner.returnNext >= KAYLA_RACE_ROUTE.length) return false;
  if (s.stage === 'available' && s.attempts !== 0) return false;
  if (s.stage !== 'available' && s.attempts < 1) return false;
  if (['won', 'complete'].includes(s.stage) && s.kayla.next !== KAYLA_RACE_ROUTE.length) return false;
  return true;
}
function sweptDistance(from, to, target) {
  const dx = to.x - from.x, dz = to.z - from.z;
  const t = Math.max(0, Math.min(1, ((target.x - from.x) * dx + (target.z - from.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(from.x + dx * t - target.x, from.z + dz * t - target.z);
}

export function createKaylaRace({ onEvent = () => {} } = {}) {
  let s = fresh();
  const emit = (type, extra = {}) => onEvent({ type, questId: KAYLA_RACE.id, ...extra });
  function accept() {
    if (s.stage !== 'available') return false;
    s.stage = 'countdown'; s.attempts++; emit('kayla-race-accepted'); return true;
  }
  function finish(won, reason = '') {
    s.stage = won ? 'won' : 'lost'; s.reason = reason; s.kayla.speed = s.ed.speed = 0;
    emit(won ? 'kayla-race-won' : 'kayla-race-lost', { reason });
  }
  function abandon(reason = 'You left the race.') {
    if (!mountedStage(s.stage)) return false;
    finish(false, reason); return true;
  }
  function retry() {
    if (s.stage !== 'lost') return false;
    // Ride back along every part of the road actually traveled. Retrying never
    // resets coordinates or leaves a second Ed at the finish line.
    s.stage = 'returning'; s.reason = ''; s.kayla.returnNext = Math.max(0, s.kayla.next - 1);
    s.ed.returnNext = Math.max(0, s.ed.next - 1); emit('kayla-race-retry'); return true;
  }
  function takeReward() {
    if (s.stage !== 'won') return 0;
    s.stage = 'complete'; emit('kayla-race-complete', { honey: KAYLA_RACE.reward }); return KAYLA_RACE.reward;
  }
  function rememberKayla(at) {
    if (!['available', 'won', 'lost'].includes(s.stage) || !validPoint(at)) return false;
    s.kayla.x = at.x; s.kayla.z = at.z; s.kayla.speed = 0;
    if (Number.isFinite(at.yaw)) s.kayla.yaw = at.yaw;
    return true;
  }
  function returning(runner, route, dt, move) {
    if (runner.returnNext < 0) { runner.speed = 0; return; }
    const before = { ...runner }, target = route[runner.returnNext];
    move?.(runner, target, Math.min(distance(runner, target), KAYLA_RACE.speed * dt));
    runner.speed = Math.min(KAYLA_RACE.speed, distance(before, runner) / dt);
    if (runner.speed > .001) runner.yaw = Math.atan2(runner.x - before.x, runner.z - before.z);
    if (distance(runner, target) < .3) runner.returnNext--;
  }
  function progress(runner, before, route, radius) {
    // Sequential gates stop a ride straight to the finish from winning while
    // still allowing ordinary steering and overtaking within the road corridor.
    while (runner.next < route.length && sweptDistance(before, runner, route[runner.next]) <= (runner.next === route.length - 1 ? 1.5 : radius)) runner.next++;
  }
  function tick(dt, { playing = true, input = {}, moveKayla, moveEd, returnKayla } = {}) {
    if (!playing || !mountedStage(s.stage) || !(dt > 0)) return state();
    let remaining = Math.min(.25, dt);
    while (remaining > 1e-8 && mountedStage(s.stage)) {
      const step = Math.min(.05, remaining); remaining -= step;
      if (s.stage === 'returning') {
        returning(s.kayla, KAYLA_RACE_LANE, step, returnKayla);
        returning(s.ed, ED_RACE_LANE, step, moveEd);
        if (s.kayla.returnNext < 0 && s.ed.returnNext < 0) {
          s.kayla.next = s.ed.next = 1; s.kayla.speed = s.ed.speed = 0;
          s.countdown = 3; s.elapsed = 0; s.attempts++; s.stage = 'countdown'; emit('kayla-race-countdown');
        }
        continue;
      }
      if (s.stage === 'countdown') {
        s.countdown = Math.max(0, s.countdown - step);
        if (s.countdown <= 1e-8) { s.countdown = 0; s.stage = 'racing'; emit('kayla-race-start'); }
        continue;
      }
      s.elapsed += step;
      const before = { ...s.kayla }, edBefore = { ...s.ed };
      let dx = Number.isFinite(input.dx) ? input.dx : 0, dz = Number.isFinite(input.dz) ? input.dz : 0;
      const magnitude = Math.hypot(dx, dz); if (magnitude > 1) { dx /= magnitude; dz /= magnitude; }
      const speed = input.run ? KAYLA_RACE.speed : KAYLA_RACE.walkSpeed;
      moveKayla?.(s.kayla, dx * speed * step, dz * speed * step);
      s.kayla.speed = Math.min(KAYLA_RACE.speed, distance(before, s.kayla) / step);
      if (s.kayla.speed > .001) s.kayla.yaw = Math.atan2(s.kayla.x - before.x, s.kayla.z - before.z);
      progress(s.kayla, before, KAYLA_RACE_LANE, 4);
      if (s.ed.next < ED_RACE_LANE.length) {
        const target = ED_RACE_LANE[s.ed.next];
        moveEd?.(s.ed, target, Math.min(distance(s.ed, target), KAYLA_RACE.edSpeed * step));
        s.ed.speed = Math.min(KAYLA_RACE.speed, distance(edBefore, s.ed) / step);
        if (s.ed.speed > .001) s.ed.yaw = Math.atan2(s.ed.x - edBefore.x, s.ed.z - edBefore.z);
        progress(s.ed, edBefore, ED_RACE_LANE, .35);
      }
      // A same-frame tie goes to the traveler; no frame-order penalty at 20 Hz.
      if (s.kayla.next === KAYLA_RACE_ROUTE.length) finish(true);
      else if (s.ed.next === ED_RACE_LANE.length) finish(false, 'Ed reached the crossroads first.');
      else if (s.elapsed >= 600) finish(false, 'The race was interrupted. You can try again.');
    }
    return state();
  }
  function restore(saved) {
    if (!validateKaylaRaceSnapshot(saved)) return false;
    s = saved === undefined ? fresh() : copy(saved); return true;
  }
  function state() {
    return { ...copy(s), mounted: mountedStage(s.stage), edVisible: !['available', 'complete'].includes(s.stage),
      target: { ...KAYLA_RACE_LANE[Math.min(s.kayla.next, KAYLA_RACE_LANE.length - 1)] },
      complete: s.stage === 'complete' };
  }
  function trackableView() {
    const target = ['countdown', 'racing'].includes(s.stage)
      ? { ...KAYLA_RACE_FINISH, id: 'kayla-race-finish', name: "The prophet's crossroads" }
      : s.stage === 'returning' ? { ...KAYLA_RACE_START, id: 'kayla-race-start', name: 'Ambron east gate' } : null;
    const detail = s.stage === 'won' ? 'Speak to Kayla for your honey. She will then go to her cub.'
      : s.stage === 'lost' ? 'Speak to Kayla to ride back to the east gate and try again.'
        : s.stage === 'returning' ? 'Ride Kayla back along the road for another race.'
          : s.stage === 'countdown' ? 'Get ready. Ride Kayla east to the prophet at the crossroads.'
            : 'Ride Kayla along the road to the prophet\'s crossroads before Ed reaches it. Hold Shift to run.';
    return { id: KAYLA_RACE.id, title: KAYLA_RACE.title, type: 'tertiary', stage: s.stage,
      active: !['available', 'complete'].includes(s.stage), complete: s.stage === 'complete',
      detail, target, destinationIds: target ? [] : ['kayla'] };
  }
  return { accept, retry, abandon, takeReward, rememberKayla, tick, restore, state, trackableView, snapshot: () => copy(s),
    get position() { return s.kayla; }, get edPosition() { return s.ed; }, get mounted() { return mountedStage(s.stage); } };
}
