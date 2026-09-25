import { SWING, WOODLOT_TREES, WOODCUTTING_SKILL } from './woodcutting.js';

const freeze = Object.freeze;
export const GLUN_WOODCUTTING_VERSION = 1;
export const GLUN_WOOD_STAGES = freeze(['offered', 'leading', 'demonstrating', 'practice', 'report', 'complete']);
const tree = WOODLOT_TREES.find(entry => entry.id === 'koopwood-pine-1');
export const GLUN_WOOD_LESSON = freeze({
  id: 'glun-woodcutting', treeId: tree.id, tree: freeze({ x: tree.x, z: tree.z }),
  stand: freeze({ x: tree.x - 1.7, z: tree.z + 1.5 }),
  practiceStand: freeze({ x: tree.x + 1.8, z: tree.z + .6 }),
  axe: 'bronze-axe', swings: 3, swingSeconds: SWING, duration: SWING * 3, watchingReach: 10,
});

const empty = () => ({ version: GLUN_WOODCUTTING_VERSION, stage: 'offered', demonstration: 0 });
export function validateGlunWoodcuttingSnapshot(value, { allowMissing = true } = {}) {
  if (value === undefined) return allowMissing;
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== GLUN_WOODCUTTING_VERSION
    || !GLUN_WOOD_STAGES.includes(value.stage) || !Number.isFinite(value.demonstration)
    || value.demonstration < 0 || value.demonstration > GLUN_WOOD_LESSON.duration) return false;
  if (['offered', 'leading'].includes(value.stage)) return value.demonstration === 0;
  if (['practice', 'report', 'complete'].includes(value.stage)) return value.demonstration === GLUN_WOOD_LESSON.duration;
  return value.demonstration < GLUN_WOOD_LESSON.duration;
}

/** Optional training alongside the existing main lesson; no main-quest flags are written. */
export function createGlunWoodcutting({ skills = null, inventory = null, onEvent = () => {} } = {}) {
  let state = empty();
  const emit = (type, extra = {}) => onEvent({ type, ...extra });
  function begin() {
    if (state.stage !== 'offered') return { ok: false, reason: 'This lesson is already under way or finished.' };
    state.stage = 'leading'; emit('glun-wood-leading'); return { ok: true };
  }
  /** Called only after Glun actually reaches his stand with the player in viewing range. */
  function arrive() {
    if (state.stage !== 'leading') return { ok: false };
    state.stage = 'demonstrating'; emit('glun-wood-demonstrating'); return { ok: true };
  }
  function update(dt, { paused = false, nearby = true, treeStanding = true } = {}) {
    if (state.stage !== 'demonstrating' || paused || !nearby || !treeStanding || !(dt > 0) || !Number.isFinite(dt)) return view();
    const before = Math.floor((state.demonstration + 1e-8) / SWING);
    state.demonstration = Math.min(GLUN_WOOD_LESSON.duration, state.demonstration + dt);
    const after = Math.min(GLUN_WOOD_LESSON.swings, Math.floor((state.demonstration + 1e-8) / SWING));
    for (let number = before + 1; number <= after; number++) emit('glun-wood-swing', { treeId: tree.id, number });
    if (state.demonstration >= GLUN_WOOD_LESSON.duration) {
      state.stage = 'practice'; skills?.learn?.(WOODCUTTING_SKILL);
      emit('glun-wood-practice', { treeId: tree.id, axe: GLUN_WOOD_LESSON.axe });
    }
    return view();
  }
  /** Only a successful real chop of the demonstrated tree completes the exercise. */
  function noteSwing(result) {
    if (state.stage !== 'practice' || !result?.ok || !result.log || result.tree?.id !== tree.id) return { ok: false };
    state.stage = 'report'; emit('glun-wood-report'); return { ok: true };
  }
  function finish() {
    if (state.stage !== 'report') return { ok: false, reason: 'Cut a log from the pine first, then talk to Glun.' };
    const hasAxe = inventory?.has?.(GLUN_WOOD_LESSON.axe);
    if (!hasAxe && inventory && !inventory.grant?.(GLUN_WOOD_LESSON.axe)) return { ok: false, reason: 'The hatchet could not be added. Speak to Glun again.' };
    state.stage = 'complete'; emit('glun-wood-complete', { axe: GLUN_WOOD_LESSON.axe, alreadyOwned: !!hasAxe });
    return { ok: true, axe: GLUN_WOOD_LESSON.axe, alreadyOwned: !!hasAxe };
  }
  function view() {
    return { ...state, borrowing: state.stage === 'practice', demonstrated: ['practice', 'report', 'complete'].includes(state.stage),
      away: ['leading', 'demonstrating', 'practice', 'report'].includes(state.stage),
      swingPhase: (state.demonstration % SWING) / SWING, treeId: tree.id };
  }
  function restore(value) {
    if (!validateGlunWoodcuttingSnapshot(value)) return false;
    state = value === undefined ? empty() : { version: GLUN_WOODCUTTING_VERSION, stage: value.stage, demonstration: value.demonstration };
    return true;
  }
  return { begin, arrive, update, noteSwing, finish, view, restore, snapshot: () => ({ ...state }),
    get stage() { return state.stage; }, get borrowing() { return state.stage === 'practice'; } };
}

/** Add this to Glun's ordinary conversation; after starting, it resumes the current step. */
export function glunWoodcuttingChoice(npc, { lesson, openDialogue, closeDialogue, onChange = () => {}, notify = () => {} }) {
  const show = (lines, action, done) => openDialogue(npc, lines, null, action, { noWayfinding: true, onComplete: () => { done?.(); onChange(); } });
  if (lesson.stage === 'complete') return { id: 'glun-wood-reminder', label: 'Remind me about Woodcutting', action: () => show([
    'The bronze hatchet is yours. Use it on pines in the Koopwood; press F at the tree and keep your feet still while you work. Moving away or getting into a fight stops the chopping.',
    'Every log earns Woodcutting experience. Logs fuel a fire in place of two branches. Bowden in that woodlot buys them and sells better axes as your skill improves.',
  ], 'Back to the road') };
  if (lesson.stage === 'report') return { id: 'glun-wood-finish', label: 'I cut the log. How did I do?', action: () => show([
    'Clean enough. Take my spare bronze hatchet. Plain, old, and yours to keep. An axe does more for a camp than a sword ever will.',
    'Keep cutting pines to gain experience; better trees and axes need more skill. You can burn those logs at a fire or sell them to Bowden. That is your choice, and this was not another army errand.',
  ], 'Take the spare hatchet', () => { const result = lesson.finish(); if (!result.ok) notify(result.reason, 'WOODCUTTING'); }) };
  if (lesson.stage === 'practice') return { id: 'glun-wood-practice', label: 'Let me try the pine', action: () => show([
    'Take the borrowed hatchet for this exercise. Stand beside that pine and press F. Keep still while you swing; a good cut will give you a log. Then speak to me.',
  ], 'Try the cut') };
  if (lesson.stage === 'demonstrating') return { id: 'glun-wood-watch', label: 'Show me that cut', action: closeDialogue };
  if (lesson.stage === 'leading') return { id: 'glun-wood-follow', label: 'Lead on to the pine', action: closeDialogue };
  return { id: 'glun-wood-begin', label: 'Can you show me Woodcutting?', action: () => show([
    'I can. A soldier who cannot gather fuel is a soldier who eats cold food. There is a pine at the edge of the Koopwood, just north of us. Walk with me; I will show you a cut, then you can try.',
    'This is optional. You can come back for it, or leave for Nothom whenever you want. Finish the exercise and my spare bronze hatchet is yours.',
  ], 'Follow Glun', () => lesson.begin()) };
}
