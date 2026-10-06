import { IVY_PATCHES, IVY_VARIETIES } from './ivy-sites.js';
import { SYLVIA } from '../../../gameplay/skills/performance/visual-arts.js';
import { COPPER_ITEM } from '../../../gameplay/inventory/economy.js';

export const SYLVIA_IVY_QUEST_ID = 'sylvia-ivy';
export const IVY_CLEAR_XP = 4;
export const IVY_QUEST_REWARD = 24;
export const IVY_REACH = 1.8;
const PATCH_IDS = new Set(IVY_PATCHES.map(patch => patch.id));
const empty = () => ({ version: 1, accepted: false, cleared: [], complete: false });
const finitePosition = position => !!position && Number.isFinite(position.x) && Number.isFinite(position.z);
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/** Cleared roots persist; an unfinished pull is deliberately never saved. */
export function validateSylviaIvy(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== 1) return false;
  if (Object.keys(data).some(key => !['version', 'accepted', 'cleared', 'complete'].includes(key))) return false;
  if (typeof data.accepted !== 'boolean' || typeof data.complete !== 'boolean' || !Array.isArray(data.cleared)) return false;
  if ([...data.cleared].some(id => !PATCH_IDS.has(id)) || new Set(data.cleared).size !== data.cleared.length) return false;
  if (data.complete && (!data.accepted || data.cleared.length !== IVY_PATCHES.length)) return false;
  return true;
}

export function createSylviaIvy({ skills, inventory, onChange = () => {}, onTrack = () => {}, onEvent = () => {} } = {}) {
  let state = empty(), active = null;
  const snapshot = () => ({ ...state, cleared: [...state.cleared] });
  const changed = () => onChange(snapshot());
  const isCleared = id => state.cleared.includes(id);
  const pose = () => active ? { id: active.patch.id, progress: Math.min(1, active.time / active.duration) } : null;

  function accept() {
    if (state.accepted) return { ok: false, reason: 'You have already offered to clear Sylvia\'s ivy.' };
    state.accepted = true;
    changed(); onTrack(SYLVIA_IVY_QUEST_ID);
    return { ok: true };
  }
  function nearest(position) {
    if (!finitePosition(position)) return null;
    let nearestPatch = null, nearestDistance = IVY_REACH;
    for (const patch of IVY_PATCHES) {
      const d = distance(position, patch.stand);
      if (!isCleared(patch.id) && d <= nearestDistance) { nearestPatch = patch; nearestDistance = d; }
    }
    return nearestPatch;
  }
  function begin(id, { position, blocked = false } = {}) {
    const patch = IVY_PATCHES.find(candidate => candidate.id === id);
    if (!patch) return { ok: false, reason: 'Find a patch of ivy beside Sylvia\'s cottage.' };
    if (isCleared(id)) return { ok: false, reason: 'These ivy roots have already been cleared.' };
    if (active || blocked) return { ok: false, reason: 'Stand still and out of combat to pull the ivy.' };
    if (!finitePosition(position) || distance(position, patch.stand) > IVY_REACH)
      return { ok: false, reason: 'Come closer to the ivy roots.' };
    const variety = IVY_VARIETIES[patch.variety];
    // Only the harmless, hand-pulled Drent variety is implemented. Future hostile
    // vines need their own encounter rules before they can use this interaction.
    if (!variety || variety.hostile || variety.id !== 'drent') return { ok: false, reason: 'This ivy needs a different approach.' };
    active = { patch, time: 0, duration: variety.clearSeconds, start: { x: position.x, z: position.z } };
    onEvent({ type: 'ivy-started', id, name: patch.name, duration: active.duration });
    return { ok: true, id, name: patch.name, duration: active.duration };
  }
  function cancel(reason = 'interrupted') {
    if (!active) return false;
    const id = active.patch.id;
    active = null; onEvent({ type: 'ivy-cancelled', id, reason });
    return true;
  }
  function update(dt, { position, paused = false, blocked = false } = {}) {
    if (!active) return null;
    if (blocked || !finitePosition(position) || distance(position, active.start) > .45 || distance(position, active.patch.stand) > IVY_REACH) {
      cancel(blocked ? 'combat' : 'moved'); return null;
    }
    if (paused || !Number.isFinite(dt) || dt <= 0) return null;
    active.time += dt;
    if (active.time < active.duration) return null;
    const patch = active.patch;
    active = null; state.cleared.push(patch.id);
    skills?.learn?.('farming');
    const gain = skills?.gain?.('farming', IVY_CLEAR_XP);
    const event = { type: 'ivy-cleared', id: patch.id, name: patch.name, xp: IVY_CLEAR_XP,
      gained: gain?.gained ?? 0, remaining: IVY_PATCHES.length - state.cleared.length };
    changed(); onEvent(event);
    return event;
  }
  function report() {
    if (state.complete) return { ok: false, reason: 'Sylvia has already thanked you for clearing the ivy.' };
    if (!state.accepted || state.cleared.length !== IVY_PATCHES.length)
      return { ok: false, reason: 'Clear the four ivy patches around Sylvia\'s cottage, then speak to her.' };
    if (!inventory?.add?.(COPPER_ITEM, IVY_QUEST_REWARD)) return { ok: false, reason: 'There is no room in your purse for Sylvia\'s reward.' };
    state.complete = true; changed();
    onEvent({ type: 'ivy-reward', reward: IVY_QUEST_REWARD });
    return { ok: true, reward: IVY_QUEST_REWARD };
  }
  function view() {
    const next = IVY_PATCHES.find(patch => !isCleared(patch.id));
    const stage = state.complete ? 'complete' : !state.accepted ? 'offered' : next ? 'clear' : 'report';
    const detail = {
      offered: next ? 'Sylvia could use help clearing invasive ivy around her cottage on the Sunken Lane.'
        : 'The ivy around Sylvia\'s cottage is clear. Let her know you helped.',
      clear: `Clear the ivy around Sylvia's cottage: ${state.cleared.length} of ${IVY_PATCHES.length} patches. Press F beside the roots and stay still for two seconds. Drent ivy is harmless; no tool is needed.`,
      report: 'All four ivy patches are clear. Return to Sylvia for her thanks and 24 copper.',
      complete: 'You cleared the invasive ivy around Sylvia\'s cottage and gave her garden room to breathe.',
    }[stage];
    return { id: SYLVIA_IVY_QUEST_ID, title: 'Room to paint', type: 'tertiary', grade: 'deed', region: 'Drent',
      stage, active: state.accepted && !state.complete, complete: state.complete, detail,
      cleared: state.cleared.length, total: IVY_PATCHES.length,
      destinationIds: stage === 'clear' ? [] : [SYLVIA.id],
      target: stage === 'clear' ? { id: next.id, name: next.name, ...next.stand } : null };
  }
  function restore(data) {
    if (!validateSylviaIvy(data)) return false;
    state = data === undefined ? empty() : { version: 1, accepted: data.accepted, cleared: [...data.cleared], complete: data.complete };
    active = null;
    return true;
  }
  return { snapshot, restore, accept, begin, cancel, update, pose, isCleared, nearest, view, report };
}

/** One optional favor alongside Sylvia's existing Visual Arts dialogue. */
export function sylviaIvyChoice(npc, { ivy, openDialogue, closeDialogue, onChange = () => {}, notify = () => {} }) {
  if (npc?.id !== SYLVIA.id) return null;
  const quest = ivy.view();
  if (quest.complete) return null;
  if (quest.stage === 'offered') return { id: 'sylvia-ivy-accept', label: 'Can I help with the ivy?', action: () => {
    openDialogue(npc, [
      'Oh, that would be kind of you, dear. The ivy has crept into four patches around my cottage. I would love to see the little plants underneath it again.',
      'This Drent ivy is quite harmless. Press F beside a patch and stay still for two seconds while you pull its roots. No special tools or training, just a gentle, steady tug. Caring for a garden is Farming practice.',
      'There are old forest tales about vines that grab back. Nothing like that lives in these roots, thankfully. Come back when the four patches are clear, and I will have a little thank-you for you.',
    ], null, quest.cleared === quest.total ? 'Tell Sylvia the ivy is already clear' : 'I will clear the ivy', { noWayfinding: true, onComplete: () => {
      const result = ivy.accept();
      onChange(); notify(result.ok ? ivy.view().detail : result.reason, 'ROOM TO PAINT');
    } });
  } };
  if (quest.stage === 'report') return { id: 'sylvia-ivy-report', label: 'Your ivy is all cleared', action: () => {
    const result = ivy.report();
    if (!result.ok) { notify(result.reason, 'ROOM TO PAINT'); return; }
    onChange();
    openDialogue(npc, [
      'Look at that. Room for flowers, and room for me to sit and paint them. Thank you, dear; you have given this little garden some breathing space.',
      `${result.reward} copper, with my thanks. My spare easel is still here whenever you would like a quieter sort of practice.`,
    ], null, 'You are welcome, Sylvia', { noWayfinding: true });
  } };
  return { id: 'sylvia-ivy-reminder', label: 'About the ivy around your cottage', action: () => {
    openDialogue(npc, [quest.detail, 'Pull the whole root, dear. If you need to move away, just come back and start that patch again. The ones you have finished will stay cleared.'],
      null, 'Back to the garden', { noWayfinding: true, onComplete: closeDialogue });
  } };
}
