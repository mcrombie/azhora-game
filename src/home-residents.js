/** Saved, physical journeys home after a quest. Rewards remain the quest's job;
 * this owns the same person's feet and whether they are behind their own door. */
import { QUEST_HOMES } from './quest-homes.js';
import { FERRY_LANDINGS } from './ferry.js';

export const HOME_PACE = 2.8;
export const HOME_FERRY_SECONDS = 60;
const phases = ['walking', 'sailing', 'entering', 'inside', 'coming-out', 'outside'];
const point = p => ({ x: p.x, z: p.z });
const validPoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.z)
  && Math.abs(p.x) < 100000 && Math.abs(p.z) < 100000;
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const clone = value => JSON.parse(JSON.stringify(value));

export function validateHomeResidents(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || data.version !== 1 || !data.people || typeof data.people !== 'object' || Array.isArray(data.people)) return false;
  return Object.entries(data.people).every(([id, p]) => QUEST_HOMES[id] && p
    && phases.includes(p.phase) && ['home', 'quay'].includes(p.leg) && validPoint(p.position)
    && Number.isFinite(p.yaw) && Number.isFinite(p.clock) && p.clock >= 0 && p.clock <= HOME_FERRY_SECONDS
    && (p.phase !== 'sailing' || (id === 'bee-keeper' && p.leg === 'quay'))
    && (p.leg !== 'quay' || id === 'bee-keeper')
    && (['walking', 'sailing'].includes(p.phase) || p.leg === 'home')
    && (!['inside', 'entering'].includes(p.phase) || gap(p.position, QUEST_HOMES[id].door) < .35)
    && (p.phase !== 'outside' || gap(p.position, QUEST_HOMES[id].porch) < 2.1)
    && (p.phase !== 'sailing' || gap(p.position, FERRY_LANDINGS.peblos.ashore) < .35));
}

export function createHomeResidents({ route, move, onEvent = () => {} } = {}) {
  let people = {};
  const routes = new Map();
  const emit = (type, id) => onEvent({ type, id, home: QUEST_HOMES[id] });
  const change = (id, phase) => { people[id].phase = phase; people[id].clock = 0; routes.delete(id); emit(phase, id); };
  function begin(id, position, { ferry = false, announce = true } = {}) {
    if (!QUEST_HOMES[id] || people[id] || !validPoint(position)) return false;
    people[id] = { phase: 'walking', leg: ferry && id === 'bee-keeper' ? 'quay' : 'home',
      position: point(position), yaw: 0, clock: 0 };
    if (announce) emit('departing', id);
    return true;
  }
  function reset(id) { if (id) { delete people[id]; routes.delete(id); } else { people = {}; routes.clear(); } }
  function restore(data) {
    if (!validateHomeResidents(data)) return false;
    people = clone(data?.people ?? {}); routes.clear(); return true;
  }
  function knock(id, { available = true } = {}) {
    if (!available || people[id]?.phase !== 'inside') return false;
    change(id, 'coming-out'); return true;
  }
  function tick(dt, { paused = false, player, readActor = () => null, available = () => true } = {}) {
    if (paused || !Number.isFinite(dt) || dt <= 0) return [];
    const placements = [];
    for (const [id, state] of Object.entries(people)) {
      if (!available(id)) continue;
      const actual = readActor(id);
      if (actual?.busy) {
        if (validPoint(actual) && !['inside', 'sailing'].includes(state.phase)) {
          state.position = point(actual);
          const home = QUEST_HOMES[id];
          if ((state.phase === 'outside' && gap(state.position, home.porch) >= 2.1)
            || (state.phase === 'entering' && gap(state.position, home.door) >= .35)) change(id, 'walking');
        }
        routes.delete(id); continue;
      }
      let pace = 0;
      const home = QUEST_HOMES[id];
      if (state.phase === 'sailing') {
        state.clock = Math.min(HOME_FERRY_SECONDS, state.clock + dt);
        if (state.clock >= HOME_FERRY_SECONDS) {
          state.position = point(FERRY_LANDINGS['port-calos'].ashore); state.leg = 'home'; change(id, 'walking');
        }
      } else if (state.phase === 'entering') {
        state.clock += dt;
        if (state.clock >= .65) change(id, 'inside');
      } else if (state.phase === 'outside') {
        state.clock = validPoint(player) && gap(player, home.porch) > 10 ? state.clock + dt : 0;
        if (state.clock >= 5) change(id, 'walking');
      } else if (state.phase !== 'inside') {
        const leaving = state.phase === 'coming-out';
        const target = leaving ? home.porch : state.leg === 'quay' ? FERRY_LANDINGS.peblos.ashore : home.door;
        let cached = routes.get(id);
        if (!cached) {
          const points = leaving || gap(state.position, target) < 4 ? [target]
            : route?.(id, state.position, home, state.leg) ?? [target];
          cached = { points: [...points.map(point), point(target)], index: 0 }; routes.set(id, cached);
        }
        while (cached.index < cached.points.length - 1 && gap(state.position, cached.points[cached.index]) < .35) cached.index++;
        const goal = cached.points[cached.index], before = point(state.position);
        const amount = Math.min(HOME_PACE * dt, gap(before, goal));
        const moved = move?.(id, before, goal, amount) ?? before;
        // An adapter may refuse a step, but it may never fast-forward an offscreen NPC.
        if (validPoint(moved) && gap(before, moved) <= amount + .001) {
          state.position = point(moved); pace = gap(before, moved) / dt;
          if (pace > .01) state.yaw = Math.atan2(moved.x - before.x, moved.z - before.z);
        }
        const outsideWithVisitor = leaving && gap(state.position, target) < 1.6
          && validPoint(player) && gap(state.position, player) < 3;
        if (gap(state.position, target) < .16 || outsideWithVisitor) {
          if (leaving) { state.yaw = home.yaw + Math.PI; change(id, 'outside'); }
          else if (state.leg === 'quay') change(id, 'sailing');
          else { state.yaw = home.yaw; change(id, 'entering'); }
        }
      }
      placements.push({ id, ...clone(state), pace, hidden: ['inside', 'sailing'].includes(state.phase) });
    }
    return placements;
  }
  return Object.freeze({ begin, reset, restore, knock, tick,
    get: id => people[id] ? clone(people[id]) : null,
    snapshot: () => ({ version: 1, people: clone(people) }) });
}
