import { villageToWorld } from './region-world.js';

export const FISHING_LESSONS_VERSION = 1;
export const FISHING_DEMO_SECONDS = 4;
export const FISHING_TEACHERS = Object.freeze({
  instructor: Object.freeze({ name: 'Glun', spot: 'willowmere', introduction: 'A quiet pool teaches patience better than a parade ground. Walk with me to Willowmere; I will show you how to cast, then you can land a fish yourself.' }),
  doomsayer: Object.freeze({ name: 'Mark', spot: 'willowmere', introduction: 'The float going under is one omen I trust completely. Come to Willowmere with me. I will show you the cast, and you can read the next omen yourself.' }),
  'garden-keeper': Object.freeze({ name: 'Jean', spot: 'willowmere', introduction: 'The kingfisher says Willowmere is excellent today. An interested party, of course. Come along: I will show you the rod, then we will see whether it was telling the truth.' }),
  'avrel-farmer': Object.freeze({ name: 'Stanley', spot: 'avrel-pool', introduction: 'There is a small pond just beyond my rows. Come over with me. I will show you a cast, then you try. A fish makes a good supper after a day in the field.' }),
});
export const FISHING_TEACHER_IDS = Object.freeze(Object.keys(FISHING_TEACHERS));
const stages = ['idle', 'leading', 'demonstrating', 'practice', 'returning'];
const validPoint = p => !!p && Number.isFinite(p.x) && Number.isFinite(p.z) && Math.abs(p.x) < 1e6 && Math.abs(p.z) < 1e6;
const point = p => ({ x: p.x, z: p.z });
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const empty = () => ({ version: 1, teacher: null, stage: 'idle', demonstration: 0, position: null, waypoint: 0, waiting: false, completed: [] });
export function validateFishingLessonsSnapshot(s, { allowMissing = true } = {}) {
  if (s === undefined) return allowMissing;
  if (!s || typeof s !== 'object' || Array.isArray(s) || s.version !== 1 || !stages.includes(s.stage)
    || !Number.isFinite(s.demonstration) || s.demonstration < 0 || s.demonstration > FISHING_DEMO_SECONDS
    || !Number.isInteger(s.waypoint) || s.waypoint < 0 || s.waypoint > 100 || typeof s.waiting !== 'boolean'
    || !Array.isArray(s.completed) || new Set(s.completed).size !== s.completed.length || s.completed.some(id => !FISHING_TEACHERS[id])) return false;
  if (s.stage === 'idle') return s.teacher === null && s.position === null && s.demonstration === 0 && s.waypoint === 0 && !s.waiting;
  return !!FISHING_TEACHERS[s.teacher] && validPoint(s.position)
    && (s.stage !== 'leading' || s.demonstration === 0)
    && (!['practice'].includes(s.stage) || s.demonstration === FISHING_DEMO_SECONDS);
}

/** Follow the village's main road, then the existing dry Willowmere approach.
 * The teacher stands to the side of the player's bank so F can still cast. */
export function fishingLessonRoute(teacher, spot, from) {
  if (!FISHING_TEACHERS[teacher] || !spot?.fishingSpot) return [];
  const bank = spot.fishingSpot;
  const stand = spot.lessonStand ?? { x: bank.x + 3.8, z: bank.z };
  if (teacher === 'avrel-farmer') return [...(spot.lessonApproach ?? []), stand].map(point);
  const road = [[0, -16], [0, -24], [0, -36], [0, -54], [0, -74], [8, -74.7], [15, -76.7]].map(([x, z]) => villageToWorld(x, z));
  let start = 0, best = Infinity;
  for (let i = 0; i < road.length; i++) { const d = distance(from, road[i]); if (d < best) { best = d; start = i; } }
  return [...road.slice(start), stand].map(point);
}

/** Only the guide's task is saved. Fishing knowledge, catch XP and rods remain
 * owned by their existing shared models, never reset by a different teacher. */
export function createFishingLessons({ fishing = null, inventory = null, onEvent = () => {} } = {}) {
  let state = empty();
  const emit = (type, extra = {}) => onEvent({ type, teacher: state.teacher, ...extra });
  function begin(teacher, position) {
    if (!FISHING_TEACHERS[teacher] || !validPoint(position)) return { ok: false, reason: 'This teacher cannot lead a fishing outing.' };
    if (state.stage !== 'idle') return { ok: false, reason: 'Finish or leave your current fishing outing first.' };
    state = { ...empty(), completed: state.completed, teacher, stage: 'leading', position: point(position) };
    emit('fishing-lesson-leading'); return { ok: true };
  }
  function guide(position, player, route, { paused = false, alive = true } = {}) {
    if (state.stage === 'idle') return null;
    if (!alive) { const teacher = state.teacher; state = { ...empty(), completed: state.completed }; onEvent({ type: 'fishing-lesson-ended', teacher }); return null; }
    if (!validPoint(position) || !validPoint(player) || !route?.length) return null;
    state.position = point(position);
    if (paused) return { target: point(position), waiting: true, fishing: false };
    if (state.stage === 'returning') {
      state.waypoint = Math.min(state.waypoint, route.length - 1);
      while (state.waypoint > 0 && distance(position, route[state.waypoint]) < .7) state.waypoint--;
      return { target: route[state.waypoint], waiting: false, fishing: false };
    }
    state.waiting = state.waiting ? distance(position, player) > 7 : distance(position, player) > 11;
    if (state.stage === 'leading') {
      state.waypoint = Math.min(state.waypoint, route.length - 1);
      while (state.waypoint < route.length - 1 && distance(position, route[state.waypoint]) < .7) state.waypoint++;
      if (state.waypoint === route.length - 1 && distance(position, route.at(-1)) < .7 && !state.waiting) {
        state.stage = 'demonstrating'; emit('fishing-lesson-demonstrating');
      }
    }
    return { target: state.waiting ? point(position) : route[state.waypoint], waiting: state.waiting,
      fishing: state.stage === 'demonstrating' && !state.waiting };
  }
  function update(dt, { paused = false, nearby = true } = {}) {
    if (state.stage !== 'demonstrating' || paused || state.waiting || !nearby || !Number.isFinite(dt) || dt <= 0) return view();
    state.demonstration = Math.min(FISHING_DEMO_SECONDS, state.demonstration + dt);
    if (state.demonstration === FISHING_DEMO_SECONDS) {
      // Failed inventory grants can be retried, without declaring a lesson learned.
      if (inventory && !inventory.has('fishing-rod') && !inventory.grant('fishing-rod')) return view();
      fishing?.learn(); state.stage = 'practice'; emit('fishing-lesson-practice');
    }
    return view();
  }
  function noteCatch(spotId, result, { nearby = true } = {}) {
    if (state.stage !== 'practice' || !nearby || !result?.ok || spotId !== FISHING_TEACHERS[state.teacher].spot) return { ok: false };
    if (!state.completed.includes(state.teacher)) state.completed.push(state.teacher);
    state.stage = 'returning'; state.waypoint++; state.waiting = false; emit('fishing-lesson-complete'); return { ok: true };
  }
  function leave() {
    if (state.stage === 'idle') return { ok: false };
    if (state.stage !== 'leading' && state.stage !== 'returning') state.waypoint++;
    state.stage = 'returning'; state.waiting = false; emit('fishing-lesson-leaving'); return { ok: true };
  }
  function home() {
    if (state.stage !== 'returning') return false;
    state = { ...empty(), completed: state.completed }; return true;
  }
  const snapshot = () => ({ ...state, position: state.position && point(state.position), completed: [...state.completed] });
  const view = () => ({ ...snapshot(), active: state.stage !== 'idle', spot: FISHING_TEACHERS[state.teacher]?.spot ?? null, pace: 2.4 });
  function restore(value) {
    if (!validateFishingLessonsSnapshot(value)) return false;
    state = value === undefined ? empty() : { ...value, position: value.position && point(value.position), completed: [...value.completed] };
    return true;
  }
  return { begin, guide, update, noteCatch, leave, home, view, snapshot, restore };
}

export function fishingLessonChoices(npc, { lessons, fishing, openDialogue, closeDialogue, onChange = () => {}, position, busy = false, notify = () => {} }) {
  const teacher = FISHING_TEACHERS[npc?.id]; if (!teacher) return [];
  const lesson = lessons.view();
  const show = (lines, action, done) => openDialogue(npc, lines, null, action, { noWayfinding: true, onComplete: () => { done?.(); onChange(); } });
  if (lesson.active && lesson.teacher === npc.id && lesson.stage !== 'returning') return [
    { id: 'fishing-lesson-resume', label: lesson.stage === 'practice' ? 'Remind me how to make my catch' : 'Continue our fishing outing', action: () => lesson.stage === 'practice'
      ? show(['Use the clear bank beside me. Press F to cast, wait for the float to dip, then press F again to reel. A missed bite is no trouble; try another cast. Land one fish here and you have done the exercise.'], 'Try a cast') : closeDialogue() },
    { id: 'fishing-lesson-leave', label: 'Let us leave the fishing outing for now', action: () => { lessons.leave(); closeDialogue(); onChange(); } },
  ];
  return [{ id: 'fishing-lesson-begin', label: fishing?.taught ? 'Take me fishing again' : 'Show me how to fish', disabled: lesson.active || busy,
    reason: busy ? 'Finish our current outing first.' : lesson.active ? 'Another fishing outing is still under way.' : '', action: () => show([teacher.introduction,
      'I will wait if you fall behind. After watching my cast, you can use my spare rod if you need one. You keep what you already know; a new teacher does not mean starting over.'
    ], 'Walk to the pond', () => { const result = lessons.begin(npc.id, position()); if (!result.ok) notify(result.reason, 'FISHING'); }) }];
}
