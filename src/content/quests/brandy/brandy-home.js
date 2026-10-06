/** Brandy's daily home life and Jon's occasional walk home from the salt ship.
 * The host supplies collision-aware walking; this module never teleports a
 * visible resident to make the timetable work. One play second is one minute. */
export const BRANDY_HOME_PACE = 2.2;
export const JON_HOME_DELAY = 45;
export const JON_HOME_STAY = 120;
const BRANDY_ID = 'brandy-frank', JON_ID = 'john-salt';
const point = p => ({ x: p.x, z: p.z });
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const validPoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.z) && Math.abs(p.x) < 100000 && Math.abs(p.z) < 100000;
const clone = value => JSON.parse(JSON.stringify(value));
const phases = ['outdoors', 'going-in', 'entering', 'inside', 'sleeping', 'coming-out', 'answering', 'going-out'];
const jonPhases = ['docked', 'outbound', 'visiting', 'entering', 'inside', 'coming-out', 'returning'];
const finiteClock = n => Number.isFinite(n) && n >= 0 && n <= 1e8;

export function brandyRoutineAt(playSeconds = 0) {
  const minute = ((360 + (Number.isFinite(playSeconds) ? Math.max(0, playSeconds) : 0)) % 1440);
  if (minute < 360 || minute >= 1320) return 'sleeping';
  return minute < 720 || (minute >= 840 && minute < 1080) ? 'outdoors' : 'inside';
}

export function validateBrandyHome(data, { allowMissing = true, home, yard } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || data.version !== 1 || !phases.includes(data.phase) || !validPoint(data.position)
    || !Number.isFinite(data.yaw) || !finiteClock(data.clock)) return false;
  if (home && ['inside', 'sleeping', 'entering'].includes(data.phase) && gap(data.position, home.door) > .2) return false;
  if (yard && data.phase === 'outdoors' && gap(data.position, yard) > .2) return false;
  return true;
}

/** Cached, bounded walking shared by both residents. The movement adapter may
 * refuse an obstructed step; it may not skip an unseen journey. */
function walker({ id, move, route, home }) {
  let cached = null;
  return {
    clear() { cached = null; },
    step(state, target, dt, leg) {
      if (!cached || cached.leg !== leg) {
        const points = route?.(id, point(state.position), home, leg, point(target)) ?? [target];
        cached = { leg, points: [...points.filter(validPoint).map(point), point(target)], index: 0 };
      }
      while (cached.index < cached.points.length - 1 && gap(state.position, cached.points[cached.index]) < .25) cached.index++;
      const goal = cached.points[cached.index], from = point(state.position);
      const amount = Math.min(BRANDY_HOME_PACE * dt, gap(from, goal));
      const moved = move?.(id, from, goal, amount) ?? from;
      if (validPoint(moved) && gap(from, moved) <= amount + .001) {
        state.position = point(moved);
        if (gap(from, moved) > .001) state.yaw = Math.atan2(moved.x - from.x, moved.z - from.z);
      }
      return gap(from, state.position) / dt;
    },
  };
}

export function createBrandyHome({ home, yard, move, route, onEvent = () => {} } = {}) {
  if (!validPoint(home?.door) || !validPoint(home?.porch) || !validPoint(yard)) throw new Error('Brandy needs a door, porch, and board-yard position.');
  const initial = () => ({ phase: 'outdoors', position: point(yard), yaw: yard.yaw ?? home.yaw ?? 0, clock: 0 });
  let state = initial(), pace = 0;
  const walking = walker({ id: BRANDY_ID, move, route, home });
  const hidden = () => ['inside', 'sleeping'].includes(state.phase);
  const change = phase => {
    if (phase === state.phase) return;
    state.phase = phase; state.clock = 0; walking.clear(); onEvent({ type: phase, id: BRANDY_ID });
  };
  function view() { return { ...clone(state), pace, hidden: hidden(), sleeping: state.phase === 'sleeping' }; }
  function restore(data, { playSeconds = 0 } = {}) {
    if (!validateBrandyHome(data, { home, yard })) return false;
    state = data ? clone(data) : initial(); delete state.version;
    if (!data && brandyRoutineAt(playSeconds) !== 'outdoors') {
      state.phase = brandyRoutineAt(playSeconds); state.position = point(home.door); state.yaw = home.yaw ?? 0;
    }
    pace = 0; walking.clear(); return true;
  }
  function knock({ playSeconds = 0, available = true } = {}) {
    if (!available) return { ok: false, reason: 'No answer.' };
    if (state.phase === 'sleeping' || brandyRoutineAt(playSeconds) === 'sleeping') return { ok: false, reason: 'Brandy is asleep. Come back in the morning.' };
    if (state.phase !== 'inside') return { ok: false, reason: 'Brandy is already outside or on her way.' };
    change('coming-out'); return { ok: true };
  }
  function tick(dt, { playSeconds = 0, playing = true, busy = false, available = true, player, position } = {}) {
    pace = 0;
    if (!playing || !Number.isFinite(dt) || dt <= 0) return view();
    if (busy || !available) {
      if (!hidden() && validPoint(position)) {
        state.position = point(position); walking.clear();
        if (state.phase === 'outdoors' && gap(position, yard) > .2) state.phase = 'going-out';
        if (state.phase === 'entering' && gap(position, home.door) > .2) state.phase = 'going-in';
      }
      return view();
    }
    const wanted = brandyRoutineAt(playSeconds);
    if (state.phase === 'outdoors' && wanted !== 'outdoors') change('going-in');
    else if (hidden()) {
      if (wanted === 'outdoors') change('going-out');
      else change(wanted);
    } else if (state.phase === 'going-out' && wanted !== 'outdoors') change('going-in');
    else if (state.phase === 'going-in' && wanted === 'outdoors') change('going-out');
    else if (state.phase === 'answering') {
      state.clock = validPoint(player) && gap(player, state.position) < 8 ? 0 : state.clock + dt;
      if (wanted === 'sleeping' || state.clock >= 12) change(wanted === 'outdoors' ? 'going-out' : 'going-in');
    }
    if (state.phase === 'entering') {
      state.clock += dt;
      if (state.clock >= .65) change(wanted === 'outdoors' ? 'going-out' : wanted);
    } else if (['going-in', 'going-out', 'coming-out'].includes(state.phase)) {
      const target = state.phase === 'going-in' ? home.door : state.phase === 'going-out' ? yard : home.porch;
      pace = walking.step(state, target, dt, state.phase);
      // A visitor standing on the porch should not pin the answering resident in the doorway.
      const answeredAtDoor = state.phase === 'coming-out' && validPoint(player)
        && gap(state.position, target) < 1.6 && gap(state.position, player) < 3;
      if (gap(state.position, target) < .12 || answeredAtDoor) {
        const arrival = state.phase === 'going-in' ? 'entering' : state.phase === 'going-out' ? 'outdoors' : 'answering';
        state.yaw = arrival === 'outdoors' ? yard.yaw ?? home.yaw ?? 0 : (home.yaw ?? 0) + (arrival === 'answering' ? Math.PI : 0);
        change(arrival);
      }
    }
    return view();
  }
  return Object.freeze({ tick, knock, restore, view, state: view, snapshot: () => ({ version: 1, ...clone(state) }) });
}

export function validateJonHomeVisit(data, { allowMissing = true, home, pier } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || data.version !== 1 || !jonPhases.includes(data.phase) || !validPoint(data.position)
    || !Number.isFinite(data.yaw) || !finiteClock(data.clock) || typeof data.started !== 'boolean') return false;
  if (data.phase !== 'docked' && !data.started) return false;
  if (home && data.phase === 'visiting' && gap(data.position, home.porch) > .2) return false;
  if (home && data.phase === 'inside' && gap(data.position, home.door) > .2) return false;
  if (pier && data.phase === 'docked' && gap(data.position, pier) > .2) return false;
  return true;
}

/** Jon visits once per Tidehaven call. A long conversation or a blocked return
 * keeps the Sultana moored instead of making her captain disappear from home. */
export function createJonHomeVisit({ home, pier, move, route, onEvent = () => {} } = {}) {
  if (!validPoint(home?.porch) || !validPoint(home?.door) || !validPoint(pier)) throw new Error('Jon needs his home door, porch, and the Tidehaven pier.');
  const initial = () => ({ phase: 'docked', position: point(pier), yaw: pier.yaw ?? 0, clock: 0, started: false });
  let state = initial(), pace = 0, managed = false;
  const walking = walker({ id: JON_ID, move, home,
    route: (id, from, residence, leg, target) => ['entering', 'coming-out'].includes(leg)
      ? [target] : route?.(id, from, residence, leg, target) ?? [target] });
  const change = phase => { state.phase = phase; state.clock = 0; walking.clear(); onEvent({ type: `jon-${phase}`, id: JON_ID }); };
  function view() { return { ...clone(state), pace, managed, hidden: !managed || state.phase === 'inside', holdDeparture: managed && state.phase !== 'docked' }; }
  function restore(data) {
    if (!validateJonHomeVisit(data, { home, pier })) return false;
    state = data ? clone(data) : initial(); delete state.version; pace = 0; managed = false; walking.clear(); return true;
  }
  function tick(dt, { salt, playing = true, busy = false, available = true, position, homeSleeping = false } = {}) {
    pace = 0;
    managed = salt?.phase === 'moored' && salt.port === 'tidehaven';
    if (!playing || !Number.isFinite(dt) || dt <= 0) return view();
    if (!managed) { state = initial(); walking.clear(); return view(); }
    if (busy || !available) {
      if (state.phase !== 'inside' && validPoint(position)) {
        state.position = point(position); walking.clear();
        if (state.phase === 'docked' && gap(position, pier) > .2) { state.started = true; state.phase = 'returning'; }
        if (state.phase === 'visiting' && gap(position, home.porch) > .2) state.phase = 'outbound';
      }
      return view();
    }
    if (state.phase === 'docked' && !state.started && salt.clock >= JON_HOME_DELAY) {
      state.started = true; change('outbound');
    }
    if (state.phase === 'visiting' && homeSleeping) change('entering');
    if (state.phase === 'visiting' || state.phase === 'inside') {
      state.clock += dt;
      if (state.clock >= JON_HOME_STAY || salt.clock >= 360) change(state.phase === 'inside' ? 'coming-out' : 'returning');
    }
    if (['outbound', 'returning', 'entering', 'coming-out'].includes(state.phase)) {
      const target = state.phase === 'entering' ? home.door : state.phase === 'returning' ? pier : home.porch;
      pace = walking.step(state, target, dt, state.phase);
      if (gap(state.position, target) < .12) {
        state.yaw = state.phase === 'entering' ? home.yaw ?? 0 : state.phase === 'returning' ? pier.yaw ?? 0 : (home.yaw ?? 0) + Math.PI;
        change({ outbound: 'visiting', entering: 'inside', 'coming-out': 'returning', returning: 'docked' }[state.phase]);
      }
    }
    return view();
  }
  return Object.freeze({ tick, restore, view, state: view, snapshot: () => ({ version: 1, ...clone(state) }),
    get holdDeparture() { return view().holdDeparture; } });
}
