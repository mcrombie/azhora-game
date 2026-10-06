/** The peninsula opening. Pure saved lesson state; the host owns real inventory,
 * movement, teachers and combat. Hearing a lesson and doing it are separate. */
import { villageToWorld } from '../../../world/terrain/region-world.js';
import { fishingLessonRoute } from '../../../gameplay/skills/fishing/fishing-lessons.js';

const point = (x, z) => Object.freeze({ x, z });
const copy = value => JSON.parse(JSON.stringify(value));
const validPoint = p => !!p && Number.isFinite(p.x) && Number.isFinite(p.z) && Math.abs(p.x) < 1e6 && Math.abs(p.z) < 1e6;
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const PENINSULA_TUTORIAL_VERSION = 1;
// Fifteen game minutes. Advance the shared calendar before anchoring Ed's event.
export const PENINSULA_SKIP_MINUTES = 15;
export const PENINSULA_TUTORIAL_ANCHORS = Object.freeze({
  arrival: point(158, 53), jojo: point(164, 49), chris: point(168, 53), walkingEnd: point(181, 44),
  bear: point(170, 43), ryan: point(158, 28), fishingCast: point(141, 28), jess: point(156, 10),
  swimTurn: point(143, 10), swimExit: point(156, 10), glun: point(178, -8), dummy: point(182, -14),
  cookfire: point(171, 52), gate: point(100, -67), graduation: point(110, -67),
  tidehavenWait: Object.freeze(villageToWorld(0, -18)),
});
const A = PENINSULA_TUTORIAL_ANCHORS;
export const PENINSULA_FERRY_LANDING = Object.freeze({
  id: 'drent', name: 'Tidehaven training shore', far: 'peblos', title: 'The peninsula pier',
  destinations: Object.freeze(['peblos', 'port-calos']),
  stand: Object.freeze({ ...A.jess, yaw: -Math.PI / 2 }),
  ashore: Object.freeze({ ...A.arrival, yaw: Math.PI / 2 }),
  mooring: Object.freeze({ x: 140, z: 59, yaw: -Math.PI / 2 }),
  out: Object.freeze({ x: -1, z: 0 }),
});

export const PENINSULA_TEACHERS = Object.freeze({
  harbormaster: A.jojo, instructor: A.glun, 'willowmere-barrett': A.bear,
  'willowmere-ryan': A.ryan, boatman: A.jess,
});
export const PENINSULA_JESS_WARNING = "Don't try to swim out of the zone. I got a bad feeling about today, and you should just take it easy and finish the rest of the quests on the peninsula first to finish the tutorial.";
export const PENINSULA_LESSONS = Object.freeze([
  { id: 'inventory', title: "Jojo's sandwich", teacher: 'harbormaster', at: A.jojo, detail: 'Speak to Jojo, then open the satchel and inspect your sandwich.' },
  { id: 'walking', title: 'First steps', teacher: 'merc-gotwood', at: A.walkingEnd, detail: 'Follow Chris’s example. Walk to the two white trail posts.' },
  { id: 'running', title: 'Finding your pace', teacher: 'harbormaster', at: A.jojo, detail: 'Ask Jojo about running. Run for six seconds, then walk or rest to recover.' },
  { id: 'combat', title: "Glun's drill", teacher: 'instructor', at: A.dummy, detail: 'Ask Glun for arms training. Strike twice, hold your guard, then dodge.' },
  { id: 'cartography', title: "Bear's chart", teacher: 'willowmere-barrett', at: A.bear, detail: 'Ask Bear for your chart, open it and find your position.' },
  { id: 'swimming', title: "Jess's sheltered cove", teacher: 'boatman', at: A.jess, detail: 'Speak to Jess. Swim to the blue buoy and return to the beach.' },
  { id: 'fishing', title: "Ryan's first catch", teacher: 'willowmere-ryan', at: A.ryan, detail: 'Ask Ryan about fishing, then land a fish in your satchel.' },
  { id: 'cooking', title: "Supper with Jojo", teacher: 'harbormaster', at: A.cookfire, detail: 'Bring your catch to Jojo and cook it at her already-lit fire.' },
].map(Object.freeze));
const IDS = PENINSULA_LESSONS.map(l => l.id);
const freshLesson = () => ({ introduced: false, practiced: false });
const fresh = () => ({ version: 1, path: 'unchosen', startedAt: null, signedOffAt: null, enlisted: false,
  lessons: Object.fromEntries(IDS.map(id => [id, freshLesson()])), grants: [],
  practice: { walked: 0, ran: 0, recovered: 0, strikes: 0, guarded: 0, dodges: 0, swam: 0, buoy: false, catches: 0 },
  chris: { task: 0, elapsed: 0, waypoint: 0, at: { ...A.chris }, departedAt: null },
  boundary: { warned: false, encounter: null, recoveries: 0 },
});
const GRANTS = ['sandwich', 'walking', 'running', 'combat', 'cartography', 'swimming', 'fishing', 'cooking', 'cooked-fish', 'letter', 'army-letter'];
const GRANT_DATA = {
  sandwich: { item: 'jojo-sandwich' }, walking: { skill: 'walking' }, running: { skill: 'running' },
  combat: { training: 'combat' }, cartography: { skill: 'cartography', chart: true },
  swimming: { skill: 'swimming' }, fishing: { skill: 'fishing', item: 'fishing-rod' },
  cooking: { skill: 'cooking' }, 'cooked-fish': { item: 'cooked-fish' }, letter: { item: 'tutorial-letter' }, 'army-letter': { item: 'harbor-letter' },
};

export const PENINSULA_TUTORIAL_PATHS = Object.freeze([
  [A.arrival, A.jojo, A.bear, A.walkingEnd],
  [A.jojo, point(168, 34), A.ryan, A.jess],
  [A.walkingEnd, point(179, 27), point(171, 10), A.glun, A.dummy],
  [A.jojo, A.cookfire],
  [A.glun, point(166, -24), point(150, -35), point(128, -52), A.graduation, A.gate],
].map((p, index) => Object.freeze(Object.assign(p, { id: `peninsula-trail-${index}`, width: 2.8, kind: 'path' }))));
export const PENINSULA_HOME_ROUTE = Object.freeze([A.gate, point(80, -68), point(60, -68), point(38, -73), point(16, -72), point(-2, -63), point(-16, -40), point(-25, -16), A.tidehavenWait]);
/** The safe land detour from Glun's peninsula post to his existing village pine.
 * The final stand is supplied by the woodcutting lesson so its tree remains authoritative. */
export function peninsulaWoodcuttingRoute(destination) {
  if (!validPoint(destination)) throw new TypeError('A woodcutting stand is required.');
  return [...PENINSULA_TUTORIAL_PATHS[4], ...PENINSULA_HOME_ROUTE.slice(1, -1), destination].map(p => ({ x: p.x, z: p.z }));
}
/** Optional outings keep the relocated teachers on the land route around the inlet. */
export function peninsulaFishingRoute(teacher, spot) {
  if (!['instructor', 'willowmere-ryan'].includes(teacher)) return [];
  const approach = teacher === 'willowmere-ryan' ? [A.ryan, point(168, 34), point(171, 10)] : [];
  const villageRoad = fishingLessonRoute('instructor', spot, A.tidehavenWait);
  if (!villageRoad.length) return [];
  return [...approach, ...PENINSULA_TUTORIAL_PATHS[4], ...PENINSULA_HOME_ROUTE.slice(1), ...villageRoad]
    .map(p => ({ x: p.x, z: p.z }));
}
const task = (name, activity, at, seconds = 0, route = null) => Object.freeze({ name, activity, at, seconds, route });
export const PENINSULA_CHRIS_TASKS = Object.freeze([
  task('welcome', 'talking', point(167, 49), 4),
  task('walking', 'walking', A.walkingEnd, 2, [point(172, 49), A.walkingEnd]),
  task('running', 'running', point(179, 22), 4, [point(179, 34), point(179, 22)]),
  task('combat', 'striking', point(179, -14), 5, [point(171, 10), A.glun, point(179, -14)]),
  task('guard', 'guarding', point(179, -14), 2),
  task('dodge', 'dodging', point(179, -14), 2),
  task('cartography', 'reading', point(173, 43), 5, [A.glun, point(171, 10), point(179, 27), A.walkingEnd, point(173, 43)]),
  task('swimming', 'swimming', A.swimTurn, 1, [point(168, 34), point(158, 18), A.jess, A.swimTurn]),
  task('swimming-return', 'swimming', A.swimExit, 1),
  task('fishing', 'fishing', point(159, 30), 8, [point(158, 18), point(159, 30)]),
  task('cooking', 'cooking', point(171, 49), 5, [point(168, 34), A.jojo, point(171, 49)]),
  task('clearance', 'talking', A.glun, 4, [A.walkingEnd, point(179, 27), point(171, 10), A.glun]),
  task('walk-to-tidehaven', 'walking', A.tidehavenWait, 0, [...PENINSULA_TUTORIAL_PATHS[4].slice(1), ...PENINSULA_HOME_ROUTE.slice(1)]),
]);

// Covers the neck, the two forest hexes and their sheltered swimming water.
// Every land/water route out crosses this boundary; only Chris has his own pass.
export const PENINSULA_TUTORIAL_ZONE = Object.freeze([
  [92, -90], [176, -124], [224, -95], [222, -37], [270, 0], [275, 62],
  [229, 107], [170, 110], [126, 64], [121, 1], [100, -36], [92, -54],
].map(([x, z]) => point(x, z)));
export const PENINSULA_FLIGHT_CEILING = 85;
export function insidePeninsulaTutorial(p, { flight = false } = {}) {
  if (!validPoint(p) || (flight && Number.isFinite(p.y) && p.y > PENINSULA_FLIGHT_CEILING)) return false;
  let inside = false;
  for (let i = 0, j = PENINSULA_TUTORIAL_ZONE.length - 1; i < PENINSULA_TUTORIAL_ZONE.length; j = i++) {
    const a = PENINSULA_TUTORIAL_ZONE[i], b = PENINSULA_TUTORIAL_ZONE[j];
    if ((a.z > p.z) !== (b.z > p.z) && p.x < (b.x - a.x) * (p.z - a.z) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}
function boundaryCrossing(from, to, flight) {
  // Convex parts are not assumed: sample the entire traveled segment, then bisect
  // its first exit so a turbo frame cannot cross out and back through the zone.
  if (!validPoint(from) || !insidePeninsulaTutorial(from, { flight })) from = { ...A.arrival, y: 2 };
  const span = Math.hypot(to.x - from.x, to.z - from.z, (to.y ?? 0) - (from.y ?? 0));
  const n = Math.max(1, Math.ceil(span / 2));
  const at = t => ({ x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t, y: (from.y ?? 0) + ((to.y ?? 0) - (from.y ?? 0)) * t });
  for (let i = 1; i <= n; i++) if (!insidePeninsulaTutorial(at(i / n), { flight })) {
    let low = (i - 1) / n, high = i / n;
    for (let j = 0; j < 15; j++) { const mid = (low + high) / 2; if (insidePeninsulaTutorial(at(mid), { flight })) low = mid; else high = mid; }
    return at(Math.max(0, low - .001));
  }
  return null;
}

export function validatePeninsulaTutorialSnapshot(s, { allowMissing = true } = {}) {
  if (s === undefined) return allowMissing;
  if (!s || s.version !== 1 || !['unchosen', 'tutorial', 'skip', 'legacy'].includes(s.path)) return false;
  if (typeof s.enlisted !== 'boolean' || s.enlisted && s.signedOffAt === null) return false;
  if (![s.startedAt, s.signedOffAt].every(t => t === null || Number.isFinite(t) && t >= 0)) return false;
  if (!IDS.every(id => typeof s.lessons?.[id]?.introduced === 'boolean' && typeof s.lessons[id].practiced === 'boolean' && (!s.lessons[id].practiced || s.lessons[id].introduced))) return false;
  if (!Array.isArray(s.grants) || new Set(s.grants).size !== s.grants.length || s.grants.some(key => !GRANTS.includes(key))) return false;
  if (!['walked', 'ran', 'recovered', 'strikes', 'guarded', 'dodges', 'swam', 'catches'].every(key => Number.isFinite(s.practice?.[key]) && s.practice[key] >= 0 && s.practice[key] < 1e8) || typeof s.practice.buoy !== 'boolean') return false;
  const c = s.chris;
  if (!c || !validPoint(c.at) || !Number.isInteger(c.task) || c.task < 0 || c.task > PENINSULA_CHRIS_TASKS.length || !Number.isInteger(c.waypoint) || c.waypoint < 0 || c.waypoint > 30 || !Number.isFinite(c.elapsed) || c.elapsed < 0 || !(c.departedAt === null || Number.isFinite(c.departedAt) && c.departedAt >= 0)) return false;
  const b = s.boundary;
  if (!b || typeof b.warned !== 'boolean' || !Number.isInteger(b.recoveries) || b.recoveries < 0) return false;
  if (b.encounter !== null && (s.path !== 'tutorial' || s.signedOffAt !== null || !b.encounter
    || !['sea', 'air'].includes(b.encounter.kind) || !validPoint(b.encounter.at)
    || !Number.isFinite(b.encounter.at.y) || Math.abs(b.encounter.at.y) >= 1e6
    || !insidePeninsulaTutorial(b.encounter.at, { flight: b.encounter.kind === 'air' })
    || !Number.isFinite(b.encounter.elapsed) || b.encounter.elapsed < 0 || b.encounter.elapsed > 4.6)) return false;
  if (s.signedOffAt !== null && (!IDS.every(id => s.lessons[id].practiced) || !s.grants.includes('letter'))) return false;
  if (s.path === 'skip' && s.signedOffAt === null) return false;
  return true;
}

export function createPeninsulaTutorial({ onEvent = () => {} } = {}) {
  let state = fresh();
  const active = () => state.path === 'tutorial' && state.signedOffAt === null;
  const emit = (type, payload = {}) => onEvent({ type, ...payload });
  function grant(key) {
    if (state.grants.includes(key)) return;
    state.grants.push(key); emit('tutorial-grant', { key, ...GRANT_DATA[key] });
  }
  function complete(id) {
    const lesson = state.lessons[id];
    if (!lesson?.introduced || lesson.practiced) return false;
    lesson.practiced = true; emit('tutorial-practiced', { lesson: id }); return true;
  }
  function available(id) {
    if (id === 'inventory') return true;
    if (id === 'walking') return state.lessons.inventory.practiced;
    if (id === 'running') return state.lessons.walking.practiced;
    if (id === 'combat') return state.lessons.running.practiced;
    if (id === 'cooking') return state.lessons.fishing.practiced;
    return state.lessons.combat.practiced;
  }
  function introduce(id) {
    if (!active() || !IDS.includes(id) || !available(id)) return { ok: false, reason: 'Finish the earlier lesson first.' };
    if (state.lessons[id].introduced) return { ok: true, already: true };
    state.lessons[id].introduced = true;
    grant(id === 'inventory' ? 'sandwich' : id);
    if (id === 'swimming') { state.boundary.warned = true; emit('tutorial-warning', { text: PENINSULA_JESS_WARNING }); }
    emit('tutorial-introduced', { lesson: id }); return { ok: true };
  }
  function practice(id, action, amount = 1) {
    if (!active() || !state.lessons[id]?.introduced || state.lessons[id].practiced || !Number.isFinite(amount) || amount <= 0) return false;
    const p = state.practice;
    if (id === 'inventory' && action === 'inspect-sandwich') return complete(id);
    if (id === 'walking') {
      if (action === 'walk') p.walked += amount;
      if (action === 'arrive' && p.walked >= 4) return complete(id);
    }
    if (id === 'running') {
      if (action === 'run') p.ran += amount;
      if (action === 'recover' && p.ran >= 6) p.recovered += amount;
      if (p.ran >= 6 && p.recovered >= 2) return complete(id);
    }
    if (id === 'combat') {
      if (action === 'strike') p.strikes += amount;
      if (action === 'guard') p.guarded += amount;
      if (action === 'dodge') p.dodges += amount;
      if (p.strikes >= 2 && p.guarded >= 1.5 && p.dodges >= 1) return complete(id);
    }
    if (id === 'cartography' && action === 'open-map') return complete(id);
    if (id === 'swimming') {
      if (action === 'swim') p.swam += amount;
      if (action === 'buoy') p.buoy = true;
      if (action === 'exit' && p.swam >= 4 && p.buoy) return complete(id);
    }
    if (id === 'fishing' && action === 'catch') { p.catches++; return complete(id); }
    if (id === 'cooking' && action === 'cook' && state.lessons.fishing.practiced) return complete(id);
    return false;
  }
  function signOff(playSeconds = 0, { skip = false } = {}) {
    if (state.signedOffAt !== null || !IDS.every(id => state.lessons[id].practiced)) return { ok: false };
    state.signedOffAt = Math.max(0, Number(playSeconds) || 0); grant('letter');
    state.boundary.encounter = null;
    emit('tutorial-signoff', { at: state.signedOffAt, skip, advanceMinutes: skip ? PENINSULA_SKIP_MINUTES : 0 });
    return { ok: true };
  }
  function choose(path, playSeconds = 0) {
    if (state.path !== 'unchosen' || !['tutorial', 'skip'].includes(path)) return { ok: false };
    state.path = path; state.startedAt = Math.max(0, Number(playSeconds) || 0);
    emit('tutorial-start', { path, at: state.startedAt });
    if (path === 'skip') {
      // Skills are introduced in tutorial order, without duplicate raw fish or
      // fabricated travel mastery. Existing stronger equipment belongs to host.
      for (const id of IDS) { state.lessons[id] = { introduced: true, practiced: true }; grant(id === 'inventory' ? 'sandwich' : id); }
      grant('cooked-fish');
      state.chris = { task: PENINSULA_CHRIS_TASKS.length, elapsed: 0, waypoint: 0, at: { ...A.tidehavenWait }, departedAt: null };
      signOff(playSeconds + PENINSULA_SKIP_MINUTES, { skip: true });
    }
    return { ok: true };
  }
  function enlist() {
    if (state.signedOffAt === null || state.enlisted) return { ok: false };
    state.enlisted = true; grant('army-letter'); emit('tutorial-enlisted'); return { ok: true };
  }
  function recover() {
    if (!active()) return false;
    const kind = state.boundary.encounter?.kind ?? 'training';
    state.boundary.encounter = null; state.boundary.recoveries++;
    emit('tutorial-boundary-recover', { at: { ...A.arrival }, kind }); return true;
  }
  function chrisView() {
    const c = state.chris, step = PENINSULA_CHRIS_TASKS[c.task], route = step?.route ?? (step ? [step.at] : []);
    const target = route[Math.min(c.waypoint, route.length - 1)] ?? A.tidehavenWait;
    const arrived = distance(c.at, target) < .45;
    const swimming = step?.activity === 'swimming' && (c.at.x < 153 || target.x < 153);
    const activity = step ? (arrived && c.waypoint >= route.length - 1 ? step.activity : swimming ? 'swimming' : step.activity === 'running' ? 'running' : 'walking') : c.departedAt === null ? 'waiting' : 'on-road';
    return { ...copy(c), target: { ...target }, name: step?.name ?? (c.departedAt === null ? 'waiting-in-tidehaven' : 'departed'), activity,
      walking: ['walking', 'running', 'swimming'].includes(activity), trained: c.task >= 12,
      pace: swimming ? 2.31 : step?.activity === 'running' ? 5.5 : 3.1,
      yaw: Math.atan2(target.x - c.at.x, target.z - c.at.z), phase: arrived ? 'stopped' : 'walking',
    };
  }
  function updateChris(dt, { moveChris, playSeconds = 0, chrisAlive = true } = {}) {
    if (!chrisAlive) return;
    const c = state.chris, step = PENINSULA_CHRIS_TASKS[c.task];
    if (!step) {
      if (state.signedOffAt !== null && c.departedAt === null) { c.departedAt = Math.max(state.signedOffAt, playSeconds); emit('tutorial-chris-depart', { at: c.departedAt, position: { ...c.at } }); }
      return;
    }
    const v = chrisView(), remaining = distance(c.at, v.target);
    if (remaining > .42) {
      const stride = Math.min(remaining, v.pace * dt), scale = stride / remaining;
      const candidate = { x: c.at.x + (v.target.x - c.at.x) * scale, z: c.at.z + (v.target.z - c.at.z) * scale };
      // The host returns the actual collision-resolved position. A blocked actor
      // never advances the task simply because its nominal travel time passed.
      const actual = moveChris ? moveChris({ ...c.at }, candidate, v) : candidate;
      if (validPoint(actual) && distance(actual, c.at) <= stride + .1) c.at = { x: actual.x, z: actual.z };
      return;
    }
    const route = step.route ?? [step.at];
    if (c.waypoint < route.length - 1) { c.waypoint++; return; }
    c.elapsed += dt;
    if (c.elapsed >= step.seconds) { c.task++; c.elapsed = 0; c.waypoint = 0; emit('tutorial-chris-task', { task: step.name }); }
  }
  function boundary(from, to, { flight = false, swimming = false, water = false } = {}) {
    if (!active() || !validPoint(to)) return { allowed: true };
    if (state.boundary.encounter) return { allowed: false, encounter: copy(state.boundary.encounter) };
    const crossing = boundaryCrossing(from, to, flight);
    if (!crossing) return { allowed: true };
    if (flight || swimming || water) {
      const kind = flight ? 'air' : 'sea';
      if (kind === 'sea' && !state.boundary.warned) { state.boundary.warned = true; emit('tutorial-warning', { text: PENINSULA_JESS_WARNING }); }
      state.boundary.encounter = { kind, elapsed: 0, at: crossing };
      emit('tutorial-boundary-encounter', copy(state.boundary.encounter));
      return { allowed: false, encounter: copy(state.boundary.encounter), at: crossing };
    }
    emit('tutorial-boundary-return', { at: { ...A.graduation }, text: 'The training gate is closed. Finish the peninsula lessons and speak to Glun before leaving.' });
    return { allowed: false, at: { ...A.graduation }, reason: 'Finish the peninsula tutorial first.' };
  }
  function update(dt, context = {}) {
    if (state.path === 'unchosen' || state.path === 'legacy' || context.paused || !Number.isFinite(dt) || dt <= 0) return view();
    const step = Math.min(.25, dt); updateChris(step, context);
    const encounter = state.boundary.encounter;
    if (encounter) {
      const before = encounter.elapsed; encounter.elapsed = Math.min(4.6, before + step);
      if (before < 3.15 && encounter.elapsed >= 3.15) emit('tutorial-boundary-defeat', { kind: encounter.kind });
      if (encounter.elapsed >= 4.6) { state.boundary.encounter = null; state.boundary.recoveries++; emit('tutorial-boundary-recover', { at: { ...A.arrival }, kind: encounter.kind }); }
    }
    return view();
  }
  function view() {
    const required = IDS.filter(id => !state.lessons[id].practiced), next = required[0];
    return { ...copy(state), active: active(), completed: state.signedOffAt !== null,
      canGraduate: active() && !required.length, next: next ? { ...PENINSULA_LESSONS.find(l => l.id === next), ...state.lessons[next], available: available(next) } : null,
      checklist: PENINSULA_LESSONS.map(l => ({ ...l, ...state.lessons[l.id], available: available(l.id) })), chris: chrisView(),
    };
  }
  function restore(value) {
    if (!validatePeninsulaTutorialSnapshot(value)) return false;
    state = value === undefined ? { ...fresh(), path: 'legacy' } : copy(value); return true;
  }
  return { choose, introduce, practice, signOff, enlist, recover, boundary, update, view, snapshot: () => copy(state), restore,
    noteInventoryInspected: () => practice('inventory', 'inspect-sandwich'),
    noteCatch: result => !!result?.ok && practice('fishing', 'catch'),
    noteCook: result => !!result?.ok && practice('cooking', 'cook'),
    canTravel: at => !active() || insidePeninsulaTutorial(at),
  };
}
