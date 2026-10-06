import { ARI, SUNFLOWER_ROWS } from '../ari/ari-garden.js';
import { CROPS } from '../../../gameplay/skills/farming/farming.js';

export const SUNFLOWER_QUEST_ID = 'ari-sunflowers';
export const SUNFLOWER_LESSON_XP = 24;
const rowIds = SUNFLOWER_ROWS.map(row => row.id);
const empty = () => ({ version: 1, accepted: false, row: null, watered: false, harvested: false, complete: false });

export function validateSunflowerLesson(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== 1) return false;
  if (['accepted', 'watered', 'harvested', 'complete'].some(key => typeof data[key] !== 'boolean')) return false;
  if (data.row !== null && !rowIds.includes(data.row)) return false;
  if (!data.accepted && (data.row !== null || data.watered || data.harvested || data.complete)) return false;
  if (data.watered && data.row === null || data.harvested && !data.watered || data.complete && !data.harvested) return false;
  return true;
}

/** Records real bed work; acquiring flowers elsewhere never completes this lesson. */
export function createSunflowerLesson({ farming, inventory, skills, onChange = () => {}, onTrack = () => {} } = {}) {
  let state = empty();
  const snapshot = () => ({ ...state });
  const changed = () => onChange(snapshot());
  function accept() {
    if (state.accepted) return { ok: false, reason: 'You have already begun this lesson.' };
    if (!inventory?.add?.(CROPS.sunflower.seed, 2)) return { ok: false, reason: 'Make room in your satchel for the seeds.' };
    skills?.learn?.('farming');
    state.accepted = true; changed(); onTrack(SUNFLOWER_QUEST_ID);
    return { ok: true };
  }
  function farmEvent(event) {
    if (!state.accepted || state.complete || state.harvested || event?.crop !== 'sunflower' || !rowIds.includes(event.row)) return false;
    if (event.type === 'row-sown') {
      // An already planted lesson bed stays the objective if the other bed is planted too.
      if (state.row && farming?.rowState(state.row, 0)?.stage !== 'bare') return false;
      state.row = event.row; state.watered = false;
    } else if (event.row !== state.row) return false;
    else if (event.type === 'row-watered') state.watered = true;
    else if (event.type === 'row-reaped') {
      if (state.watered) state.harvested = true;
      else state.row = null; // A dry harvest is valid farming, but this lesson still needs tending.
    } else return false;
    changed(); return true;
  }
  function report() {
    if (!state.harvested || state.complete) return { ok: false, reason: state.complete ? 'Ari has already thanked you.' : 'Plant, water and harvest a sunflower bed first.' };
    state.complete = true;
    const reward = skills?.gain?.('farming', SUNFLOWER_LESSON_XP);
    changed(); return { ok: true, xp: SUNFLOWER_LESSON_XP, levelled: !!reward?.levelled };
  }
  function view(clock = 0) {
    const bed = state.row ? farming?.rowState(state.row, clock) : null;
    const stage = state.complete ? 'complete' : !state.accepted ? 'offered' : state.harvested ? 'report'
      : !state.row ? 'plant' : !state.watered ? 'water' : bed?.stage === 'ripe' ? 'harvest' : 'growing';
    const detail = {
      offered: 'Ari in Applegarth can teach you to grow sunflowers. This is an optional Farming lesson.',
      plant: "Plant sunflower seeds in either of Ari's two garden beds. Press F beside a bare bed; the shared seed bin has replacements.",
      water: bed?.stage === 'ripe' ? 'This bed ripened without watering. Harvest it, then plant again and water the young plants to finish the lesson.'
        : 'Water your sunflower bed once while it grows. Press F beside the planted bed and choose Water this row.',
      growing: `The watered sunflowers are growing. Return in about ${Math.ceil(bed?.left ?? 0)} seconds of active play. You can explore while they grow.`,
      harvest: 'Your sunflowers are ready. Press F at the bed to harvest them, then return to Ari.',
      report: 'Tell Ari about the sunflowers you grew and collect your Farming experience.',
      complete: 'Ari taught you to sow, water and harvest sunflowers. Keep the flowers and saved seeds; the beds are yours to use again.',
    }[stage];
    const target = ['plant', 'water', 'growing', 'harvest'].includes(stage)
      ? { ...(SUNFLOWER_ROWS.find(row => row.id === state.row) ?? SUNFLOWER_ROWS[0]) } : null;
    return { id: SUNFLOWER_QUEST_ID, title: "Ari's sunflowers", type: 'skill', grade: 'skill', region: 'Drent',
      stage, active: state.accepted && !state.complete, complete: state.complete, detail,
      destinationIds: target ? [] : [ARI.id], target, teacherIds: state.complete ? [] : [ARI.id] };
  }
  function restore(data) {
    if (!validateSunflowerLesson(data)) return false;
    state = data === undefined ? empty() : { version: 1, accepted: data.accepted, row: data.row,
      watered: data.watered, harvested: data.harvested, complete: data.complete };
    return true;
  }
  return { accept, farmEvent, report, view, snapshot, restore };
}

export function sunflowerConversation(npc, context) {
  if (npc?.id !== ARI.id) return false;
  const { lesson, openDialogue, closeDialogue, notify = () => {} } = context;
  const clock = () => typeof context.playSeconds === 'function' ? context.playSeconds() : context.playSeconds ?? 0;
  const quest = lesson.view(clock());
  const back = () => sunflowerConversation(npc, context);
  const choices = [];
  if (quest.stage === 'offered') choices.push({ id: 'ari-sunflower-accept', label: 'Teach me to grow sunflowers', action: () => {
    openDialogue(npc, [
      'Start with a seed, give the young plant water, and leave it room and time. I have two beds just here, between the cottages. You can use either of them.',
      'Press F at a bare bed and choose Sunflowers. Then water it once while it is growing. Our watering can stays by the beds. A watered crop takes about a minute and a half of active play; you do not have to stand watching it.',
      'Harvest when the golden flowers are ready, then tell me how you got on. You keep the flowers and the seeds for your next planting. Stanley can teach you food crops at the Avrel commons.',
    ], null, 'Take two sunflower seed packets', { noWayfinding: true, onComplete: () => {
      const result = lesson.accept();
      notify(result.ok ? 'Two sunflower seed packets. Plant, water, harvest, then return to Ari.' : result.reason, "ARI'S SUNFLOWERS");
    } });
  } });
  if (quest.stage === 'report') choices.push({ id: 'ari-sunflower-report', label: 'I grew the sunflowers', action: () => {
    const result = lesson.report();
    if (!result.ok) { notify(result.reason, "ARI'S SUNFLOWERS"); return; }
    openDialogue(npc, [
      'There you are. A whole new patch of gold from a packet of seeds. Keep them; you did the growing.',
      `${result.xp} Farming experience. You have saved seeds for another planting. These beds and the shared can stay here for whenever you come back.`,
    ], null, 'Thank you, Ari');
  } });
  if (quest.active) choices.push({ id: 'ari-sunflower-reminder', label: 'What should I do next?', action: () => {
    openDialogue(npc, [quest.detail], null, 'Back to Ari', { noWayfinding: true, onComplete: back });
  } });
  choices.push({ id: 'ari-sunflower-leave', label: 'Back to Applegarth', action: closeDialogue });
  openDialogue(npc, [quest.complete ? 'Come to see how the garden is doing? The beds and seed bin are still here if you want another planting.'
    : quest.stage === 'offered' ? 'I am Ari. Would you like to grow sunflowers with me? A little patch of yellow does a garden good.' : quest.detail],
  null, 'Back to Applegarth', { noWayfinding: true, choices });
  return true;
}
