/**
 * The lay-of-the-land tutorial: shown once, on first entering a region beyond
 * Drent, it prompts the traveler to read the new region on the same world map.
 * A pure step machine, so the HUD, the checkpoint and the
 * autopilot share one source of truth about where the tutorial stands.
 */
export const MAP_TUTORIAL_DONE = 2;

export const MAP_TUTORIAL_STEPS = Object.freeze([
  null,
  Object.freeze({
    id: 'chart', key: 'M', act: 'open-chart', completes: 'world', kicker: 'THE LAY OF THE LAND', title: 'A new region on your map',
    text: 'You have crossed into another region. Open the world map to find your position and this region’s name, level and ruling faction. Zoom in to follow nearby roads and places, or out to see its neighbours.',
  }),
  Object.freeze({
    id: 'done', key: null, act: null, completes: null, kicker: 'THE LAY OF THE LAND', title: 'Well read',
    text: 'The same world map follows you from Drent into Luscia and beyond. Mind each region’s level and ruling faction. Press M or Esc to close the map and continue along the road.',
  }),
]);

export function validateMapTutorial(value) {
  // Legacy step 2 asked for the removed trail map; both 2 and 3 have already seen the chart.
  return Number.isInteger(value) && value >= 0 && value <= 3;
}

export function createMapTutorial(initial = 0) {
  let step = validateMapTutorial(initial) ? Math.min(initial, MAP_TUTORIAL_DONE) : 0;
  /** True when arriving in a region other than Drent (id 1) should start the tutorial. */
  // Open country carries id 0 and is not a province; walking off the atlas is not arriving somewhere.
  function shouldStart({ regionId, mode = 'playing' } = {}) {
    return step === 0 && mode === 'playing' && Number.isInteger(regionId) && regionId > 0 && regionId !== 1;
  }
  function start() {
    if (step !== 0) return false;
    step = 1; return true;
  }
  /** The journal opened on a tab: advance when it is the tab the current step asked for. */
  function noteJournalTab(tab) {
    const current = MAP_TUTORIAL_STEPS[step];
    if (!current?.completes || current.completes !== tab) return false;
    step += 1; return true;
  }
  function view() {
    const card = MAP_TUTORIAL_STEPS[step];
    return { step, active: step > 0 && step < MAP_TUTORIAL_DONE, done: step === MAP_TUTORIAL_DONE, card: card ? { ...card } : null };
  }
  function snapshot() { return step; }
  function restore(value) {
    if (!validateMapTutorial(value)) return false;
    step = Math.min(value, MAP_TUTORIAL_DONE); return true;
  }
  return { shouldStart, start, noteJournalTab, view, snapshot, restore, get step() { return step; } };
}
