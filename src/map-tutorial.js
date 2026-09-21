/**
 * The lay-of-the-land tutorial: shown once, on first entering a region beyond
 * Drent, it prompts the traveler to open the continental chart and then the
 * local trail map. A pure step machine, so the HUD, the checkpoint and the
 * autopilot share one source of truth about where the tutorial stands.
 */
export const MAP_TUTORIAL_DONE = 3;

export const MAP_TUTORIAL_STEPS = Object.freeze([
  null,
  Object.freeze({
    id: 'chart', key: 'J', act: 'open-chart', completes: 'world', kicker: 'THE LAY OF THE LAND', title: 'A new region',
    text: 'Azhora is divided into regions like Drent and Luscia, each with its own level and ruling faction. Open your journal’s chart to see where this one lies.',
  }),
  Object.freeze({
    id: 'trails', key: 'M', act: 'open-trails', completes: 'trails', kicker: 'THE LAY OF THE LAND', title: 'The local trails',
    text: 'The chart shows the whole continent. The trail map shows this region’s paths and places. Open it to find the road ahead.',
  }),
  Object.freeze({
    id: 'done', key: null, act: null, completes: null, kicker: 'THE LAY OF THE LAND', title: 'Well read',
    text: 'Compass, minimap and both charts agree on north. Mind the level of each region you enter: higher is deadlier, and the faction in control decides who calls you a friend.',
  }),
]);

export function validateMapTutorial(value) {
  return Number.isInteger(value) && value >= 0 && value <= MAP_TUTORIAL_DONE;
}

export function createMapTutorial(initial = 0) {
  let step = validateMapTutorial(initial) ? initial : 0;
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
    step = value; return true;
  }
  return { shouldStart, start, noteJournalTab, view, snapshot, restore, get step() { return step; } };
}
